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

    test('prefers the more specific name when several fully match', () {
      final withShort = [
        ...catalog,
        buildCard(id: 'just-ahri', name: 'Ahri', collectorNumber: '001/100'),
      ];
      final result =
          identifyCards(withShort, 'Ahri Inquisitive appears in the text');
      expect(result.first.id, 'ahri'); // "Ahri - Inquisitive", not bare "Ahri"
    });
  });

  group('parseScanNumbers', () {
    test('extracts every fractional number in reading order', () {
      final ns = parseScanNumbers('foo 012/219 bar 147/219 baz');
      expect(ns.map((n) => n.number), [12, 147]);
      expect(ns.every((n) => n.total == 219), isTrue);
    });

    test('is empty when no fractional number is present', () {
      expect(parseScanNumbers('WTR001 no fraction here'), isEmpty);
    });
  });

  group('fuseScanCandidates', () {
    final ahri = buildCard(id: 'ahri', name: 'Ahri', collectorNumber: '147/219');
    final vex = buildCard(id: 'vex', name: 'Vex', collectorNumber: '020/219');
    final zed = buildCard(id: 'zed', name: 'Zed', collectorNumber: '055/219');

    test('returns a single list unchanged when the other is empty', () {
      expect(fuseScanCandidates(visual: [ahri, vex], ocr: const []).map((c) => c.id),
          ['ahri', 'vex']);
      expect(fuseScanCandidates(visual: const [], ocr: [vex, ahri]).map((c) => c.id),
          ['vex', 'ahri']);
    });

    test('a card found by both signals outranks one found by either alone', () {
      final fused = fuseScanCandidates(visual: [vex, ahri], ocr: [ahri, zed]);
      expect(fused.first.id, 'ahri');
    });

    test('collector-number agreement promotes the matching printing', () {
      // Visual ranks vex first, but the printed number matches ahri.
      final fused = fuseScanCandidates(
        visual: [vex, ahri],
        ocr: const [],
        ocrNumbers: [const ScanNumber(147, 219)],
      );
      expect(fused.first.id, 'ahri');
    });

    test('number bonus needs numerator agreement, not just any digits', () {
      final fused = fuseScanCandidates(
        visual: [vex, ahri],
        ocr: const [],
        ocrNumbers: [const ScanNumber(999, 219)],
      );
      // No candidate matches 999, so the visual order is preserved.
      expect(fused.map((c) => c.id), ['vex', 'ahri']);
    });

    test('returns empty when both inputs are empty', () {
      expect(fuseScanCandidates(visual: const [], ocr: const []), isEmpty);
    });
  });
}
