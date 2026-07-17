import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';

/// Long-lived on-device cache for official FAB set logos.
///
/// Logos change rarely, so they stay on disk for a year. The browse screen
/// warms this cache as soon as the URL map loads, then pins decoded images
/// in memory so ListView remounts and route pops (Settings, set drill-in)
/// paint synchronously instead of flashing placeholders.
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

  /// Whether [url] currently has a live pinned completer.
  @visibleForTesting
  static bool debugIsPinned(String url) => _pins.containsKey(url);

  /// Drop pins (tests only).
  @visibleForTesting
  static void debugResetPins() {
    for (final handle in _pins.values) {
      handle.dispose();
    }
    _pins.clear();
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

  /// Resolve [provider] and keep its completer alive for the rest of the
  /// process so later [Image] widgets hit memory synchronously.
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
