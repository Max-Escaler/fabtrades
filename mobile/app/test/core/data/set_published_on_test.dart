import 'package:fabtrades/core/data/set_published_on.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SetPublishedOnMap', () {
    test('parses wrapped publishedOn map', () {
      const json = '''
      {
        "publishedOn": {
          "24762": "2026-09-25T00:00:00",
          "2724": "2019-10-11T00:00:00"
        }
      }
      ''';
      final map = SetPublishedOnMap.fromJson(json);
      expect(map.length, 2);
      expect(map.forGroupId(24762), DateTime.parse('2026-09-25T00:00:00'));
      expect(map.forGroupId(2724), DateTime.parse('2019-10-11T00:00:00'));
      expect(map.forGroupId(9999), isNull);
    });

    test('returns empty on invalid json shape', () {
      expect(SetPublishedOnMap.fromJson('[]'), SetPublishedOnMap.empty);
      expect(SetPublishedOnMap.fromJson('{"publishedOn":null}').isEmpty, isTrue);
    });
  });
}
