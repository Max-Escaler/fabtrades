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

  group('collectorNumberKey', () {
    test('lowercases and strips non-alphanumeric characters', () {
      expect(collectorNumberKey('FAB428'), 'fab428');
      expect(collectorNumberKey('147/219'), '147219');
      expect(collectorNumberKey('WTR-001'), 'wtr001');
    });

    test('returns null for null or empty-after-strip input', () {
      expect(collectorNumberKey(null), isNull);
      expect(collectorNumberKey(''), isNull);
      expect(collectorNumberKey('///'), isNull);
    });
  });

  group('expandScanMatchesToPrintings', () {
    final leavenNormal = buildCard(
      id: 'leaven-normal',
      name: 'Leaven Sheath',
      setName: 'Heavy Hitters',
      collectorNumber: '147/219',
    );
    final leavenFoil = buildCard(
      id: 'leaven-foil',
      name: 'Leaven Sheath',
      setName: 'Heavy Hitters',
      isFoil: true,
      collectorNumber: '147/219',
    );
    final leavenPromo = buildCard(
      id: 'promo',
      name: 'Leaven Sheath (Extended Art)',
      setName: 'Promos',
      rarity: 'Promo',
      collectorNumber: 'FAB428',
    );
    final vex = buildCard(
      id: 'vex',
      name: 'Vex - Apathetic',
      collectorNumber: '020/219',
    );
    final vexFoil = buildCard(
      id: 'vex-foil',
      name: 'Vex - Apathetic',
      isFoil: true,
      collectorNumber: '020/219',
    );
    final sinkRed = buildCard(
      id: 'sink-red',
      name: 'Sink Below (Red)',
      collectorNumber: '010/219',
    );
    final sinkBlue = buildCard(
      id: 'sink-blue',
      name: 'Sink Below (Blue)',
      collectorNumber: '011/219',
    );
    final sealedProduct = buildCard(
      id: 'sealed',
      name: 'Origins - Champion Deck',
      rarity: null,
      collectorNumber: null,
    );

    final catalog = [
      leavenNormal,
      leavenFoil,
      leavenPromo,
      vex,
      vexFoil,
      sinkRed,
      sinkBlue,
      sealedProduct,
    ];

    test('includes promo/extended-art printings omitted from matches', () {
      final result = expandScanMatchesToPrintings(
        catalog,
        [leavenNormal, leavenFoil],
      );
      expect(result.cards.map((c) => c.id), contains('promo'));
    });

    test('preserves match order and rankedCount when ocrText is empty', () {
      final matches = [leavenFoil, leavenNormal];
      final result = expandScanMatchesToPrintings(catalog, matches);
      expect(result.cards.take(matches.length).map((c) => c.id).toList(),
          ['leaven-foil', 'leaven-normal']);
      expect(result.rankedCount, matches.length);
    });

    test('does not pull in other cards or unmatched pitch variants', () {
      final result = expandScanMatchesToPrintings(catalog, [sinkRed]);
      final ids = result.cards.map((c) => c.id).toSet();
      expect(ids, isNot(contains('vex')));
      expect(ids, isNot(contains('vex-foil')));
      expect(ids, isNot(contains('sink-blue')));
      expect(ids, contains('sink-red'));
    });

    test('excludes non-card product rows', () {
      final result = expandScanMatchesToPrintings(
        catalog,
        [leavenNormal],
      );
      expect(result.cards.map((c) => c.id), isNot(contains('sealed')));
    });

    test('promotes a set-code printing read in ocrText into ranked prefix', () {
      final result = expandScanMatchesToPrintings(
        catalog,
        [leavenNormal, leavenFoil],
        ocrText: 'Leaven Sheath ... FAB428 ...',
      );
      expect(result.cards.first.id, 'promo');
      expect(result.rankedCount, greaterThan(2));
      expect(
        result.cards.take(result.rankedCount).map((c) => c.id),
        contains('promo'),
      );
    });

    test('fractional collector numbers in ocrText do not promote', () {
      final result = expandScanMatchesToPrintings(
        catalog,
        [leavenPromo],
        ocrText: 'Leaven Sheath 147/219',
      );
      // Promo was the only match; normal/foil extras must stay in "other"
      // versions — the fractional number is not a set-code key.
      expect(result.cards.first.id, 'promo');
      expect(result.rankedCount, 1);
      expect(
        result.cards.skip(result.rankedCount).map((c) => c.id),
        containsAll(['leaven-normal', 'leaven-foil']),
      );
    });

    test('empty matches / empty catalog edge cases', () {
      expect(
        expandScanMatchesToPrintings(catalog, const []),
        same(ScanMatches.empty),
      );

      final matches = [leavenNormal, leavenFoil];
      final noCatalog = expandScanMatchesToPrintings(const [], matches);
      expect(noCatalog.cards.map((c) => c.id).toList(),
          ['leaven-normal', 'leaven-foil']);
      expect(noCatalog.rankedCount, matches.length);
    });

    test('cards contain no duplicate ids', () {
      // Promo already in matches AND catalog — must appear once.
      final result = expandScanMatchesToPrintings(
        catalog,
        [leavenNormal, leavenPromo],
        ocrText: 'FAB428',
      );
      final ids = result.cards.map((c) => c.id).toList();
      expect(ids.toSet().length, ids.length);
    });
  });
}
