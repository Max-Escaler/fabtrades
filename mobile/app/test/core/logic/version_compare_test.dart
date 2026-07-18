import 'package:fabtrades/core/logic/version_compare.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('compareVersions', () {
    test('orders semver numerically', () {
      expect(compareVersions('1.0.1', '1.0.2'), lessThan(0));
      expect(compareVersions('1.0.10', '1.0.2'), greaterThan(0));
      expect(compareVersions('1.0.1', '1.0.1'), 0);
      expect(compareVersions('2.0.0', '1.9.9'), greaterThan(0));
    });

    test('ignores build metadata after +', () {
      expect(compareVersions('1.0.1+4', '1.0.1'), 0);
      expect(compareVersions('1.0.1+4', '1.0.2'), lessThan(0));
    });
  });

  group('isVersionBehind', () {
    test('true only when installed is older', () {
      expect(isVersionBehind('1.0.1', '1.0.2'), isTrue);
      expect(isVersionBehind('1.0.2', '1.0.2'), isFalse);
      expect(isVersionBehind('1.0.3', '1.0.2'), isFalse);
    });
  });
}
