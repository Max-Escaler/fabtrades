import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';

/// Long-lived on-device cache for official FAB set logos.
///
/// Logos change rarely, so they stay on disk for a year. The browse screen
/// warms this cache as soon as the URL map loads, then precaches into
/// Flutter's in-memory [ImageCache] so ListView recycling does not re-hit
/// the CDN or flash placeholders.
class SetLogoCache {
  SetLogoCache._();

  static const key = 'setLogoCache';

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
  /// rows paint immediately from memory instead of re-decoding from disk.
  static Future<void> precacheIntoMemory(
    BuildContext context,
    Iterable<String> urls,
  ) async {
    final unique = urls.where((u) => u.isNotEmpty).toSet();
    for (final url in unique) {
      if (!context.mounted) return;
      try {
        await precacheImage(
          CachedNetworkImageProvider(url, cacheManager: instance),
          context,
        );
      } catch (_) {
        // Skip failed URLs; SetLogoTitle will fall back to the set name.
      }
    }
  }
}
