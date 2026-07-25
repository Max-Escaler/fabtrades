import 'package:fabtrades/core/logic/set_abbreviation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('collectorNumberPrefix', () {
    test('extracts letter prefix from collector numbers', () {
      expect(collectorNumberPrefix('SEA004'), 'SEA');
      expect(collectorNumberPrefix('sea027'), 'SEA');
      expect(collectorNumberPrefix('HNT001 // ALT'), 'HNT');
    });

    test('returns empty for non-standard numbers', () {
      expect(collectorNumberPrefix(''), '');
      expect(collectorNumberPrefix('FAB344'), 'FAB');
      expect(collectorNumberPrefix('123'), '');
    });
  });

  group('deriveSetAbbreviation', () {
    test('picks a clear majority prefix (High Seas)', () {
      final numbers = List.generate(
        20,
        (i) => 'SEA${(i + 1).toString().padLeft(3, '0')}',
      );
      expect(deriveSetAbbreviation(numbers), 'SEA');
    });

    test('ignores FAB promo codes when choosing a majority', () {
      final numbers = [
        ...List.generate(10, (i) => 'HNT${i + 1}'),
        'FAB344',
      ];
      expect(deriveSetAbbreviation(numbers), 'HNT');
    });

    test('returns empty when prefixes are mixed (Silver Age chapters)', () {
      const numbers = [
        'SBR001',
        'SDA001',
        'SVI001',
        'SKA001',
        'SIY001',
        'SBR002',
        'SDA002',
        'SVI002',
        'SKA002',
        'SIY002',
      ];
      expect(deriveSetAbbreviation(numbers), '');
    });

    test('returns empty without enough samples', () {
      expect(deriveSetAbbreviation(['SEA001', 'SEA002']), '');
    });
  });

  group('resolveSetAbbreviation', () {
    test('prefers the provided abbreviation', () {
      expect(
        resolveSetAbbreviation('OMN', ['SEA001', 'SEA002', 'SEA003', 'SEA004', 'SEA005']),
        'OMN',
      );
    });

    test('falls back to derivation when provided is blank', () {
      final numbers = List.generate(8, (i) => 'SEA${i + 1}');
      expect(resolveSetAbbreviation('', numbers), 'SEA');
      expect(resolveSetAbbreviation(null, numbers), 'SEA');
    });
  });
}
