import 'package:fabtrades/core/data/set_logo_cache.dart';
import 'package:fabtrades/core/data/set_logos.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SetLogoMap', () {
    test('parses nested logos shape and exposes urls', () {
      const json = '''
      {
        "logos": {
          "2724": { "name": "Crucible of War", "logoUrl": "https://example.com/cru.png" },
          "2725": { "name": "Arcane Rising", "logoUrl": "https://example.com/arc.png" }
        }
      }
      ''';
      final map = SetLogoMap.fromJson(json);
      expect(map.length, 2);
      expect(map.urlForGroupId(2724), 'https://example.com/cru.png');
      expect(map.urls.toSet(), {
        'https://example.com/cru.png',
        'https://example.com/arc.png',
      });
    });

    test('parses flat map shape', () {
      const json = '''
      {
        "2724": "https://example.com/cru.png"
      }
      ''';
      final map = SetLogoMap.fromJson(json);
      expect(map.urlForGroupId(2724), 'https://example.com/cru.png');
      expect(map.urls, ['https://example.com/cru.png']);
    });

    test('returns null for missing group ids', () {
      expect(SetLogoMap.empty.urlForGroupId(1), isNull);
      expect(SetLogoMap.empty.urlForGroupId(null), isNull);
    });
  });

  group('SetLogoCache', () {
    test('uses a dedicated long-lived cache key', () {
      expect(SetLogoCache.key, 'setLogoCache');
    });
  });
}
