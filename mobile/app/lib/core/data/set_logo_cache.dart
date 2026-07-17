import 'dart:async';
import 'dart:ui' as ui;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';

/// Long-lived on-device cache for official FAB set logos.
///
/// Logos change rarely, so they stay on disk for a year. Decoded frames are
/// retained for the process lifetime so Browse rows that remount after a set
/// drill-in / Settings pop can paint with [RawImage] on the first frame
/// instead of unloading and reloading.
class SetLogoCache {
  SetLogoCache._();

  static const key = 'setLogoCache';

  /// Default painted height of [SetLogoTitle]; used so disk→memory precache
  /// hits the same [ResizeImage] cache key as the browse rows.
  static const defaultHeight = 40.0;

  /// Vertical padding around the logo plate (matches [SetLogoTitle]).
  static const platePadding = 6.0;

  static CacheManager? _instance;

  /// Keeps [ImageStreamCompleter]s alive for the process so Flutter's
  /// [ImageCache] cannot drop decoded logos while Browse is covered by
  /// another route (set detail, Settings, etc.).
  static final Map<String, ImageStreamCompleterHandle> _pins = {};

  /// Process-lifetime decoded frames. Survives ListView row dispose/remount
  /// when pushing into a set and popping back.
  static final Map<String, ui.Image> _images = {};

  /// Lazily created so unit tests can import this library without initializing
  /// platform bindings (CacheManager touches path_provider on construct).
  static CacheManager get instance => _instance ??= CacheManager(
        Config(
          key,
          stalePeriod: const Duration(days: 365),
          maxNrOfCacheObjects: 250,
        ),
      );

  /// Image provider used by browse rows and memory precache — same key both
  /// places so precached logos are cache hits when [SetLogoTitle] paints.
  static ImageProvider providerFor(
    String url, {
    int? memCacheHeight,
  }) {
    return ResizeImage.resizeIfNeeded(
      null,
      memCacheHeight,
      CachedNetworkImageProvider(
        url,
        cacheManager: instance,
      ),
    );
  }

  /// Decode size matching [SetLogoTitle]'s plate [memCacheHeight].
  static int memCacheHeightFor(double height, double devicePixelRatio) =>
      ((height + platePadding) * devicePixelRatio).round();

  /// Retained decoded frame for [url], if any.
  static ui.Image? imageFor(String url) => _images[url];

  /// Whether [url] currently has a live pinned completer.
  @visibleForTesting
  static bool debugIsPinned(String url) => _pins.containsKey(url);

  @visibleForTesting
  static bool debugHasImage(String url) => _images.containsKey(url);

  /// Drop pins and retained images (tests only).
  @visibleForTesting
  static void debugResetPins() {
    for (final handle in _pins.values) {
      handle.dispose();
    }
    _pins.clear();
    for (final image in _images.values) {
      image.dispose();
    }
    _images.clear();
  }

  /// Keep a clone of [image] for the rest of the process so remounted browse
  /// rows can paint immediately via [RawImage].
  static void retain(String url, ui.Image image) {
    if (url.isEmpty) return;
    final existing = _images[url];
    if (identical(existing, image)) return;
    final clone = image.clone();
    existing?.dispose();
    _images[url] = clone;
  }

  /// Download every logo into the on-device cache. Already-cached URLs are
  /// cheap no-ops via [CacheManager].
  static Future<void> warm(Iterable<String> urls) async {
    final unique = urls.where((u) => u.isNotEmpty).toSet();
    await Future.wait(
      unique.map((url) async {
        try {
          await instance.getSingleFile(url);
        } catch (_) {
          // Individual CDN failures shouldn't block the rest.
        }
      }),
    );
  }

  /// Resolve [provider] and keep its completer + decoded frame alive for the
  /// rest of the process so later [Image] / [RawImage] widgets hit memory
  /// synchronously.
  static Future<void> pin(
    String url,
    ImageProvider provider,
    ImageConfiguration configuration,
  ) async {
    if (url.isEmpty || _pins.containsKey(url)) return;

    final stream = provider.resolve(configuration);
    final done = Completer<void>();
    late ImageStreamListener listener;
    listener = ImageStreamListener(
      (ImageInfo info, bool synchronousCall) {
        retain(url, info.image);
        final completer = stream.completer;
        if (completer != null) {
          _pins.putIfAbsent(url, completer.keepAlive);
        }
        stream.removeListener(listener);
        if (!done.isCompleted) done.complete();
      },
      onError: (Object error, StackTrace? stackTrace) {
        stream.removeListener(listener);
        if (!done.isCompleted) done.completeError(error, stackTrace);
      },
    );
    stream.addListener(listener);
    await done.future;
  }

  /// Fire-and-forget pin used after a logo has already painted on screen.
  static void ensurePinned(
    String url,
    ImageProvider provider,
    BuildContext context,
  ) {
    if (url.isEmpty || _pins.containsKey(url) || !context.mounted) return;
    unawaited(() async {
      try {
        await pin(url, provider, createLocalImageConfiguration(context));
      } catch (_) {
        // Paint already succeeded; pinning is best-effort.
      }
    }());
  }

  /// Decode logos into memory and pin their streams so recycled browse rows
  /// and returning from pushed routes (set drill-in, Settings) paint from
  /// memory instead of re-decoding from disk.
  ///
  /// Successful URLs are reported to [onCached] so the UI can skip the
  /// set-name placeholder on the next resolve.
  static Future<void> precacheIntoMemory(
    BuildContext context,
    Iterable<String> urls, {
    double height = defaultHeight,
    void Function(String url)? onCached,
  }) async {
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final memCacheHeight = memCacheHeightFor(height, dpr);
    final configuration = createLocalImageConfiguration(context);
    final unique = urls.where((u) => u.isNotEmpty).toSet();
    for (final url in unique) {
      if (!context.mounted) return;
      try {
        await pin(
          url,
          providerFor(url, memCacheHeight: memCacheHeight),
          configuration,
        );
        onCached?.call(url);
      } catch (_) {
        // Skip failed URLs; SetLogoTitle will fall back to the set name.
      }
    }
  }
}
