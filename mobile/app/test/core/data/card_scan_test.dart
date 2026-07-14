import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/data/card_repository.dart';

import '../../support/fixtures.dart';

void main() {
  group('parseScanNumber', () {
    test('parses NNN/TTT into number and total', () {
      final n = parseScanNumber('147/219')!;
      expect(n.number, 147);
      expect(n.total, 219);
    });

    test('tolerates spaces around the slash', () {
      final n = parseScanNumber('086 / 219')!;
      expect(n.number, 86);
      expect(n.total, 219);
    });

    test('ignores the signature asterisk', () {
      final n = parseScanNumber('225*/221')!;
      expect(n.number, 225);
      expect(n.total, 221);
    });

    test('falls back to a bare number with null total', () {
      final n = parseScanNumber('42')!;
      expect(n.number, 42);
      expect(n.total, isNull);
    });

    test('returns null for null or number-free input', () {
      expect(parseScanNumber(null), isNull);
      expect(parseScanNumber('no digits'), isNull);
    });
  });

  group('nameTokens', () {
    test('drops parentheticals and stopwords, keeps distinctive tokens', () {
      final tokens = nameTokens('Ahri - The Inquisitive (Overnumbered)');
      expect(tokens, containsAll(['ahri', 'inquisitive']));
      expect(tokens, isNot(contains('the')));
      expect(tokens, isNot(contains('overnumbered')));
    });

    test('drops single-character tokens', () {
      expect(nameTokens('X Marker'), ['marker']);
    });
  });

  group('identifyCards', () {
    final catalog = [
      buildCard(
          id: 'ahri', name: 'Ahri - Inquisitive', collectorNumber: '147/219'),
      buildCard(
          id: 'vex', name: 'Vex - Apathetic', collectorNumber: '020/219'),
      buildCard(
          id: 'ahri-other-set',
          name: 'Ahri - Inquisitive',
          collectorNumber: '147/300'),
    ];

    test('returns nothing for empty catalog or blank text', () {
      expect(identifyCards(const [], 'anything'), isEmpty);
      expect(identifyCards(catalog, '   '), isEmpty);
    });

    test('matches by collector number, disambiguating set by name', () {
      final result = identifyCards(catalog, 'Ahri Inquisitive 147/219');
      expect(result.first.id, 'ahri');
    });

    test('prefers a full number+denominator match', () {
      // number 147 exists in both sets; the 219 denominator picks the right one
      final result = identifyCards(catalog, '147/219');
      expect(result.map((c) => c.id), contains('ahri'));
      expect(result.map((c) => c.id), isNot(contains('ahri-other-set')));
    });

    test('falls back to strict name match when no number is read', () {
      final result = identifyCards(catalog, 'Vex Apathetic');
      expect(result.single.id, 'vex');
    });

    test('returns empty when name match is incomplete and no number', () {
      // Only part of a distinctive name -> below the 1.0 overlap threshold.
      final result = identifyCards(catalog, 'Apathetic');
      expect(result, isEmpty);
    });
  });
}
