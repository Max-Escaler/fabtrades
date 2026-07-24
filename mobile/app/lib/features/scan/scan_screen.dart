import 'dart:io' show Platform;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

import '../../app/app.dart';
import '../../app/card_actions.dart';
import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/models/card_model.dart';
import '../../core/models/trade.dart';
import '../../core/providers.dart';
import '../../core/scan/frame_hasher.dart';
import '../card_detail/card_detail_screen.dart';

/// Where a locked scan match goes when the user taps it.
enum ScanDestination {
  /// Open card detail (default browse mode).
  detail,

  /// Add to a side of the live trade draft and keep scanning.
  trade,

  /// Add to the Binder (qty+1, NM) and keep scanning.
  binder,
}

/// Live card scanner. Streams camera frames through two offline recognizers —
/// a perceptual-hash match of the card image inside the guide rectangle
/// against precomputed hashes of every catalog scan, and ML Kit OCR of the
/// printed name + collector number — then fuses both candidate lists. Locks
/// onto a card once the same top match is seen on two consecutive frames, so
/// a steady aim identifies it hands-free.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({
    super.key,
    this.destination = ScanDestination.detail,
    this.tradeSide,
  }) : assert(
          destination != ScanDestination.trade || tradeSide != null,
          'tradeSide is required when destination is trade',
        );

  final ScanDestination destination;

  /// Required when [destination] is [ScanDestination.trade].
  final TradeSide? tradeSide;

  /// Opens the scanner wired to add scanned cards to [side] of the trade draft.
  static Future<void> forTrade(BuildContext context, TradeSide side) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => ScanScreen(
          destination: ScanDestination.trade,
          tradeSide: side,
        ),
      ),
    );
  }

  /// Opens the scanner wired to add scanned cards to the Binder.
  static Future<void> forBinder(BuildContext context) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) =>
            const ScanScreen(destination: ScanDestination.binder),
      ),
    );
  }

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen>
    with WidgetsBindingObserver {
  /// Device-orientation → degrees, used to compute ML Kit's rotation on Android.
  static const _orientationDegrees = {
    DeviceOrientation.portraitUp: 0,
    DeviceOrientation.landscapeLeft: 90,
    DeviceOrientation.portraitDown: 180,
    DeviceOrientation.landscapeRight: 270,
  };

  /// Cap OCR to a sustainable rate; running it on every frame floods the
  /// pipeline and drops UI frames.
  static const _throttle = Duration(milliseconds: 350);

  CameraController? _controller;
  final _recognizer = TextRecognizer(script: TextRecognitionScript.latin);

  bool _initializing = true;
  bool _cameraAvailable = false;
  bool _streaming = false;
  bool _processing = false;
  bool _torchOn = false;
  DateTime? _lastProcessedAt;

  /// True once we've locked onto a result and paused the live scan.
  bool _locked = false;

  // Two-frame confirmation to reject transient false positives.
  String? _pendingKey;
  int _pendingHits = 0;
  /// Consecutive empty frames while a pending read is in flight. OCR on a
  /// real Pixel flickers empty between good frames; one miss must not wipe
  /// progress or the gate never reaches 2.
  int _pendingMisses = 0;

  String? _statusMessage;
  List<CardModel> _matches = const [];
  String? _lastNumber;

  /// On-device diagnostics (bug icon in the app bar) so scan failures can be
  /// inspected on a phone without a tethered console — the per-frame pipeline
  /// stats and any camera error are drawn over the viewport when enabled.
  bool _showDiag = false;
  String? _lastDiag;
  String? _cameraError;

  /// Mirrors every `[DEBUG-scan]` console line into the on-screen overlay.
  void _recordDiag(String line) {
    debugPrint('[DEBUG-scan] $line');
    _lastDiag = line;
    if (_showDiag && mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _disposeCamera();
    _recognizer.close();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      _disposeCamera();
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  Future<void> _disposeCamera() async {
    final controller = _controller;
    _controller = null;
    _streaming = false;
    if (controller == null) return;
    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
    } catch (_) {}
    await controller.dispose();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        if (!mounted) return;
        setState(() {
          _cameraError = 'No cameras reported by the OS.';
          _initializing = false;
          _cameraAvailable = false;
        });
        return;
      }
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        back,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup:
            Platform.isAndroid ? ImageFormatGroup.nv21 : ImageFormatGroup.bgra8888,
      );
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _cameraAvailable = true;
        _cameraError = null;
        _initializing = false;
        _torchOn = false;
      });
      if (!_locked) await _startStream();
    } catch (e) {
      _recordDiag('camera init failed: $e');
      if (!mounted) return;
      setState(() {
        _cameraError = 'Camera init failed: $e';
        _initializing = false;
        _cameraAvailable = false;
      });
    }
  }

  Future<void> _startStream() async {
    final controller = _controller;
    if (controller == null || _streaming) return;
    try {
      await controller.startImageStream(_processImage);
      _streaming = true;
      if (mounted && _statusMessage == null) {
        setState(() => _statusMessage = 'Point at a card to identify it.');
      }
    } catch (e) {
      _recordDiag('stream start failed: $e');
      if (mounted) {
        setState(() => _cameraError = 'Stream start failed: $e');
      }
    }
  }

  Future<void> _stopStream() async {
    final controller = _controller;
    if (controller == null || !_streaming) return;
    _streaming = false;
    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
    } catch (_) {}
  }

  Future<void> _processImage(CameraImage image) async {
    if (_processing || _locked) return;
    final now = DateTime.now();
    if (_lastProcessedAt != null &&
        now.difference(_lastProcessedAt!) < _throttle) {
      return;
    }
    _processing = true;
    _lastProcessedAt = now;
    try {
      final rotation = _rotationDegrees();
      if (rotation == null) {
        _recordDiag(
            'rot=null orient=${_controller?.value.deviceOrientation} '
            'sensor=${_controller?.description.sensorOrientation}');
        return;
      }

      final catalog = ref.read(catalogProvider).asData?.value ?? const [];
      if (catalog.isEmpty) {
        if (mounted) setState(() => _statusMessage = 'Loading card catalog…');
        return;
      }

      final frameSw = Stopwatch()..start();

      // Signal 1: perceptual hash of the card inside the guide rectangle,
      // matched against the precomputed catalog hashes.
      var visual = const <CardModel>[];
      var bestDist = -1;
      var zScore = -1.0;
      var hashOk = false;
      final hashSw = Stopwatch()..start();
      // iOS: camera_avfoundation sets videoOrientation on the stream
      // connection to the device orientation, so streamed buffers arrive
      // already rotated upright — rotating again by sensorOrientation samples
      // a sideways region and the hash can never match. Android (Camera2)
      // streams raw sensor-orientation frames and needs the full rotation.
      // ML Kit's InputImage still gets [rotation]: its iOS converter ignores
      // the field, and Android needs it.
      final hashRotation = Platform.isIOS ? 0 : rotation;
      final hashIndex = ref.read(cardHashIndexProvider).asData?.value;
      if (hashIndex != null) {
        final hash = hashCameraFrame(image, hashRotation);
        hashOk = hash != null;
        if (hash != null) {
          final byId = ref.read(catalogByIdProvider);
          final matches = hashIndex.match(
            hash,
            onStats: (best, mean, z) {
              bestDist = best;
              zScore = z;
            },
          );
          visual = [
            for (final m in matches)
              for (final id in m.entry.cardIds)
                if (byId[id] != null) byId[id]!,
          ];
        }
      }
      final hashMs = hashSw.elapsedMilliseconds;

      // Signal 2: OCR of the printed name + collector number.
      // Isolated from visual so an ML Kit / format failure on Android cannot
      // discard a successful hash match (that used to silently kill scanning).
      var ocr = const <CardModel>[];
      var ocrNumbers = const <ScanNumber>[];
      var ocrNote = 'skip';
      final ocrSw = Stopwatch()..start();
      final input = _toInputImage(image, rotation);
      if (input == null) {
        final bytes0 =
            image.planes.isEmpty ? 0 : image.planes.first.bytes.length;
        final expectedNv21 = image.width * image.height * 3 ~/ 2;
        ocrNote = 'input=null fmt=${image.format.group}/'
            '${image.format.raw} planes=${image.planes.length} '
            '${image.width}x${image.height} bytes0=$bytes0 '
            'nv21Expect=$expectedNv21';
      } else {
        try {
          final result = await _recognizer.processImage(input);
          if (!mounted || _locked) return;
          ocr = identifyCards(catalog, result.text);
          ocrNumbers = parseScanNumbers(result.text);
          final snippet = result.text.replaceAll('\n', ' ').trim();
          ocrNote = snippet.isEmpty
              ? 'empty'
              : '"${snippet.length > 40 ? '${snippet.substring(0, 40)}…' : snippet}"';
        } catch (e) {
          // Full exception — PlatformException.message is the useful part.
          ocrNote = 'err=$e fmt=${image.format.group}/${image.format.raw} '
              'planes=${image.planes.length} '
              '${image.width}x${image.height}';
        }
      }
      final ocrMs = ocrSw.elapsedMilliseconds;

      final matches =
          fuseScanCandidates(visual: visual, ocr: ocr, ocrNumbers: ocrNumbers);
      _recordDiag(
        'rot=$rotation hashRot=$hashRotation '
        'hash=${hashOk ? 'ok' : 'null'} '
        'best=$bestDist z=${zScore.toStringAsFixed(1)} '
        'vis=${visual.length} ocr=${ocr.length} ($ocrNote) '
        '${image.width}x${image.height} '
        'hashMs=$hashMs ocrMs=$ocrMs totalMs=${frameSw.elapsedMilliseconds}',
      );
      if (matches.isEmpty) {
        if (_pendingKey != null) {
          _pendingMisses++;
          debugPrint(
            '[DEBUG-scan] pending="$_pendingKey" hits=$_pendingHits '
            'misses=$_pendingMisses (empty fuse)',
          );
          if (_pendingMisses < 3) return; // tolerate brief OCR flicker
        }
        _pendingKey = null;
        _pendingHits = 0;
        _pendingMisses = 0;
        return;
      }
      _pendingMisses = 0;

      // Confirm by card identity, not printing id. OCR often returns every
      // foil/set/pitch variant of the same name; keying on printing id made
      // the two-frame gate flip forever and never lock on a Pixel.
      final key = _scanConfirmKey(matches.first);
      if (key == _pendingKey) {
        _pendingHits++;
      } else {
        _pendingKey = key;
        _pendingHits = 1;
      }
      debugPrint('[DEBUG-scan] pending="$key" hits=$_pendingHits');
      if (_pendingHits >= 2) {
        final locked = [
          for (final c in matches)
            if (_scanConfirmKey(c) == key) c
        ];
        debugPrint(
          '[DEBUG-scan] LOCK key="$key" n=${locked.length} '
          'totalMs=${frameSw.elapsedMilliseconds}',
        );
        await _lockOn(locked.isNotEmpty ? locked : matches);
      } else if (mounted) {
        setState(() => _statusMessage =
            'Reading ${matches.first.name}… hold steady.');
      }
    } catch (e) {
      _recordDiag('frame err=$e');
    } finally {
      _processing = false;
    }
  }

  /// Stable identity for the two-frame confirmation gate. Strips every
  /// parenthetical (including FAB pitch colors) so OCR returning Red/Yellow/
  /// Blue or foil variants of the same card still counts as consecutive hits.
  /// Printing id is too unstable: the fused list's top entry flips between
  /// variants every frame and the gate never reaches 2.
  String _scanConfirmKey(CardModel card) {
    final stripped =
        card.name.replaceAll(RegExp(r'\s*\([^)]*\)'), ' ').trim();
    return stripped.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), ' ').trim();
  }

  /// Clockwise rotation (0/90/180/270) that turns a raw sensor frame into the
  /// upright displayed image, per platform (see the ML Kit Flutter example).
  /// Shared by OCR, the frame hasher, and the preview layout.
  int? _rotationDegrees() {
    final controller = _controller;
    if (controller == null) return null;
    final camera = controller.description;
    final sensorOrientation = camera.sensorOrientation;
    if (Platform.isIOS) return sensorOrientation;
    final deviceRotation =
        _orientationDegrees[controller.value.deviceOrientation];
    if (deviceRotation == null) return null;
    return camera.lensDirection == CameraLensDirection.front
        ? (sensorOrientation + deviceRotation) % 360
        : (sensorOrientation - deviceRotation + 360) % 360;
  }

  /// Builds an ML Kit [InputImage] from a streamed camera frame.
  ///
  /// Matches the google_mlkit_commons contract: Android must be a single-plane
  /// NV21 buffer, iOS a single-plane BGRA8888 buffer. Anything else returns
  /// null so OCR is skipped rather than throwing and poisoning the frame.
  ///
  /// On Android we depend on `camera_android` (Camera2) rather than CameraX so
  /// the stream is real NV21 — CameraX often mis-labels / mis-sizes buffers and
  /// ML Kit then throws InputImageConverterError on every frame.
  InputImage? _toInputImage(CameraImage image, int rotationDegrees) {
    final rotation = InputImageRotationValue.fromRawValue(rotationDegrees);
    if (rotation == null) return null;

    final format = InputImageFormatValue.fromRawValue(image.format.raw);
    if (format == null) return null;
    if (Platform.isAndroid && format != InputImageFormat.nv21) return null;
    if (Platform.isIOS && format != InputImageFormat.bgra8888) return null;
    if (image.planes.length != 1) return null;
    final plane = image.planes.first;

    // NV21 = Y (w*h) + interleaved VU (w*h/2). Reject undersized buffers that
    // make ML Kit's native converter NPE instead of a clear format error.
    if (Platform.isAndroid) {
      final expected = image.width * image.height * 3 ~/ 2;
      if (plane.bytes.length < expected) return null;
    }

    return InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  Future<void> _lockOn(List<CardModel> matches) async {
    _locked = true;
    await _stopStream();
    if (!mounted) return;
    final number = matches.first.collectorNumber;
    setState(() {
      _matches = matches;
      _lastNumber = number;
      _statusMessage = matches.length == 1
          ? 'Found ${matches.first.name}.'
          : 'Found ${matches.length} possible matches — tap the right one.';
    });
  }

  /// Adds a scanned card to the trade draft or Binder, confirms with a
  /// snackbar, and immediately resumes scanning so more cards can be added.
  Future<void> _addLockedCard(CardModel card) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.clearSnackBars();
    switch (widget.destination) {
      case ScanDestination.trade:
        final side = widget.tradeSide;
        if (side == null) return;
        ref.read(tradeDraftProvider.notifier).addCard(side, card);
        messenger.showSnackBar(
          SnackBar(
            content: Text('Added ${card.name} to trade'),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      case ScanDestination.binder:
        ref.read(binderProvider.notifier).add(card);
        messenger.showSnackBar(
          SnackBar(
            content: Text('Added ${card.name} to Binder'),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      case ScanDestination.detail:
        return;
    }
    await _scanAgain();
  }

  Future<void> _scanAgain() async {
    setState(() {
      _locked = false;
      _matches = const [];
      _pendingKey = null;
      _pendingHits = 0;
      _pendingMisses = 0;
      _statusMessage = 'Point at a card to identify it.';
    });
    if (_controller == null) {
      await _initCamera();
    } else {
      await _startStream();
    }
  }

  Future<void> _toggleTorch() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      final next = !_torchOn;
      await controller.setFlashMode(next ? FlashMode.torch : FlashMode.off);
      if (mounted) setState(() => _torchOn = next);
    } catch (_) {}
  }

  Future<void> _manualEntry() async {
    final controller = TextEditingController(text: _lastNumber ?? '');
    final result = await showAdaptiveDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog.adaptive(
        title: const Text('Find a card'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Name or number, e.g. 147/219',
          ),
          onSubmitted: (v) => Navigator.pop(ctx, v.trim()),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Look up'),
          ),
        ],
      ),
    );
    if (result != null && result.isNotEmpty) {
      await _lookup(result);
    }
  }

  /// Resolves free text (a name or a collector number) against the catalog,
  /// falling back to a network lookup by number if the catalog isn't loaded.
  Future<void> _lookup(String text) async {
    _locked = true;
    await _stopStream();
    final parsed = parseScanNumber(text);
    setState(() {
      _lastNumber = parsed?.total != null
          ? '${parsed!.number.toString().padLeft(3, '0')}/${parsed.total}'
          : _lastNumber;
      _statusMessage = 'Looking up “$text”…';
      _matches = const [];
    });
    try {
      final catalog = ref.read(catalogProvider).asData?.value ?? const [];
      var matches = identifyCards(catalog, text, limit: 30);
      if (matches.isEmpty && catalog.isEmpty && _lastNumber != null) {
        matches = await ref
            .read(cardRepositoryProvider)
            .findByCollectorNumber(_lastNumber!);
      }
      if (!mounted) return;
      setState(() {
        _matches = matches;
        _statusMessage = matches.isEmpty
            ? 'No card found for “$text”.'
            : 'Found ${matches.length} match(es).';
      });
    } catch (e) {
      if (mounted) setState(() => _statusMessage = 'Lookup failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Keep the widget rebuilding as the catalog finishes loading, and warm the
    // hash index so it's ready by the first frame.
    ref.watch(catalogProvider);
    ref.watch(cardHashIndexProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(switch (widget.destination) {
          ScanDestination.trade => 'Scan a card to add',
          ScanDestination.binder => 'Scan into Binder',
          ScanDestination.detail => 'Scan',
        }),
        actions: [
          if (_cameraAvailable && !_locked)
            IconButton(
              icon: Icon(_torchOn ? Icons.flash_on : Icons.flash_off),
              tooltip: 'Toggle flash',
              onPressed: _toggleTorch,
            ),
          IconButton(
            icon: const Icon(Icons.keyboard),
            tooltip: 'Enter name or number',
            onPressed: _manualEntry,
          ),
          IconButton(
            icon: Icon(
                _showDiag ? Icons.bug_report : Icons.bug_report_outlined),
            tooltip: 'Scan diagnostics',
            onPressed: () => setState(() => _showDiag = !_showDiag),
          ),
          const SettingsAction(),
        ],
      ),
      body: Column(
        children: [
          _buildViewport(),
          if (_statusMessage != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Text(
                _statusMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ),
          Expanded(child: _buildMatches()),
        ],
      ),
      floatingActionButton: (_cameraAvailable && _locked)
          ? FloatingActionButton.extended(
              heroTag: 'scanAgainFab',
              onPressed: _scanAgain,
              icon: const Icon(Icons.camera_alt),
              label: const Text('Scan again'),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildViewport() {
    if (_initializing) {
      return const AspectRatio(
        aspectRatio: 3 / 4,
        child: Center(child: CircularProgressIndicator.adaptive()),
      );
    }
    if (!_cameraAvailable || _controller == null) {
      return Container(
        height: 220,
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.no_photography_outlined,
                size: 40, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 12),
            const Text('Camera unavailable'),
            if (_cameraError != null) ...[
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  _cameraError!,
                  textAlign: TextAlign.center,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 4),
            Text(
              'Enter a name or collector number instead.',
              style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 12),
            FilledButton.tonalIcon(
              icon: const Icon(Icons.keyboard),
              label: const Text('Find a card'),
              onPressed: _manualEntry,
            ),
          ],
        ),
      );
    }
    // Render the preview with BoxFit.cover so the visible region (and thus the
    // guide rectangle) maps deterministically onto the camera frame — the
    // frame hasher in frame_hasher.dart mirrors this exact geometry.
    final controller = _controller!;
    Widget camera = CameraPreview(controller);
    final previewSize = controller.value.previewSize;
    if (previewSize != null) {
      final rotation = _rotationDegrees() ?? 0;
      final swap = rotation == 90 || rotation == 270;
      camera = FittedBox(
        fit: BoxFit.cover,
        clipBehavior: Clip.hardEdge,
        child: SizedBox(
          width: swap ? previewSize.height : previewSize.width,
          height: swap ? previewSize.width : previewSize.height,
          child: camera,
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.all(12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: AspectRatio(
          aspectRatio: kViewportAspect,
          child: Stack(
            fit: StackFit.expand,
            children: [
              camera,
              _ScanOverlay(scanning: _streaming && !_locked),
              if (_showDiag)
                Positioned(
                  left: 8,
                  right: 8,
                  bottom: 8,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      [
                        if (_cameraError != null) _cameraError!,
                        _lastDiag ?? 'waiting for first frame…',
                      ].join('\n'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMatches() {
    if (_matches.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _cameraAvailable
                ? 'Hold a card steady inside the frame. It identifies automatically — no button needed.'
                : 'Use the keyboard icon to find a card by name or collector number.',
            textAlign: TextAlign.center,
            style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
        ),
      );
    }
    final pricing = ref.watch(pricingProvider);
    return ListView.separated(
      padding: const EdgeInsets.only(bottom: 88),
      itemCount: _matches.length,
      separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
      itemBuilder: (context, i) {
        final card = _matches[i];
        final quickAdd = widget.destination == ScanDestination.trade ||
            widget.destination == ScanDestination.binder;
        if (quickAdd) {
          return CardRow(
            card: card,
            priceLabel: pricing.priceLabel(card),
            secondaryLabel: pricing.lowPriceLabel(card),
            trailing: const Icon(Icons.add_circle),
            onTap: () => _addLockedCard(card),
          );
        }
        return CardRow(
          card: card,
          priceLabel: pricing.priceLabel(card),
          secondaryLabel: pricing.lowPriceLabel(card),
          onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => CardDetailScreen(card: card))),
          onAdd: () => showCardActions(context, ref, card),
        );
      },
    );
  }
}

/// Card-shaped guide rectangle. Its geometry (centered, [kGuideWidthFraction]
/// of the viewport width, physical card aspect) is shared with the frame
/// hasher, so a card that fills the guide is exactly the region being matched.
class _ScanOverlay extends StatelessWidget {
  const _ScanOverlay({required this.scanning});

  final bool scanning;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Center(
        child: FractionallySizedBox(
          widthFactor: kGuideWidthFraction,
          child: AspectRatio(
            aspectRatio: kCardAspect,
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(
                  color: scanning ? Colors.lightGreenAccent : Colors.white70,
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: Text(
                    scanning ? 'Fit the card exactly in the frame' : 'Paused',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
