import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';

/// Long-lived on-device cache for official FAB set logos.
///
/// Logos change rarely, so they stay on disk for a year. The browse screen
/// warms this cache as soon as the URL map loads, then precaches into
/// Flutter's in-memory [ImageCache] so ListView recycling and route pops
/// (e.g. Settings → back) do not re-hit the CDN or flash placeholders.
class SetLogoCache {
  SetLogoCache._();

  static const key = 'setLogoCache';

  /// Default painted height of [SetLogoTitle]; used so disk→memory precache
  /// hits the same [ResizeImage] cache key as the browse rows.
  static const defaultHeight = 40.0;

  /// Vertical padding around the logo plate (matches [SetLogoTitle]).
  static const platePadding = 6.0;

  static CacheManager? _instance;

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

  /// Decode logos into Flutter's in-memory [ImageCache] so recycled browse
  /// rows and returning from pushed routes paint from memory instead of
  /// re-decoding from disk.
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
    final unique = urls.where((u) => u.isNotEmpty).toSet();
    for (final url in unique) {
      if (!context.mounted) return;
      try {
        await precacheImage(
          providerFor(url, memCacheHeight: memCacheHeight),
          context,
        );
        onCached?.call(url);
      } catch (_) {
        // Skip failed URLs; SetLogoTitle will fall back to the set name.
      }
    }
  }
}
