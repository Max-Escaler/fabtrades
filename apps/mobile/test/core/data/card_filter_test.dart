import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/data/card_repository.dart';

import '../../support/fixtures.dart';

void main() {
  group('filterCards — query matching', () {
    final catalog = [
      buildCard(id: '1', name: 'Vex - Apathetic', collectorNumber: '001'),
      buildCard(id: '2', name: 'Vi - Piltover Enforcer', collectorNumber: '002'),
      buildCard(id: '3', name: 'Ashe - Frost Archer', collectorNumber: '003'),
    ];

    List<String> namesFor(String query) =>
        filterCards(catalog, CardFilters(query: query))
            .map((c) => c.name)
            .toList();

    test('matches across separators', () {
      expect(namesFor('Vex a'), ['Vex - Apathetic']);
    });

    test('is case-insensitive and order-independent', () {
      expect(namesFor('apathetic VEX'), ['Vex - Apathetic']);
    });

    test('requires every token (AND semantics)', () {
      expect(namesFor('Vex frost'), isEmpty);
    });

    test('empty query returns everything (name-sorted)', () {
      expect(namesFor('   '),
          ['Ashe - Frost Archer', 'Vex - Apathetic', 'Vi - Piltover Enforcer']);
    });

    test('collector number is searchable', () {
      expect(namesFor('001'), ['Vex - Apathetic']);
    });

    test('cleanName is searchable', () {
      final withClean = [
        buildCard(id: '9', name: "Kai'Sa", cleanName: 'KaiSa'),
      ];
      final res = filterCards(withClean, const CardFilters(query: 'kaisa'));
      expect(res.single.id, '9');
    });
  });

  group('filterCards — filters', () {
    test('setName filter restricts to that set', () {
      final catalog = [
        buildCard(id: '1', name: 'A', setName: 'Origins'),
        buildCard(id: '2', name: 'B', setName: 'Unleashed'),
      ];
      final res = filterCards(catalog, const CardFilters(setName: 'Unleashed'));
      expect(res.map((c) => c.id), ['2']);
    });

    test('foilOnly hides non-foil printings', () {
      final catalog = [
        buildCard(id: '1', name: 'A', isFoil: false),
        buildCard(id: '2', name: 'B', isFoil: true),
      ];
      final res = filterCards(catalog, const CardFilters(foilOnly: true));
      expect(res.map((c) => c.id), ['2']);
    });

    test('non-card products are excluded', () {
      final catalog = [
        buildCard(id: '1', name: 'Real Card'),
        buildCard(
          id: '2',
          name: 'Champion Deck',
          rarity: null,
          collectorNumber: null,
        ),
      ];
      final res = filterCards(catalog, const CardFilters());
      expect(res.map((c) => c.id), ['1']);
    });
  });

  group('filterCards — sorting', () {
    final catalog = [
      buildCard(id: '1', name: 'Bravo', collectorNumber: '030', tcgMarket: 5),
      buildCard(id: '2', name: 'Alpha', collectorNumber: '010', tcgMarket: 1),
      buildCard(id: '3', name: 'Charlie', collectorNumber: '020'), // no price
    ];

    test('nameAsc sorts alphabetically', () {
      final res = filterCards(catalog, const CardFilters());
      expect(res.map((c) => c.name), ['Alpha', 'Bravo', 'Charlie']);
    });

    test('priceDesc sorts high to low with nulls last', () {
      final res =
          filterCards(catalog, const CardFilters(sort: CardSort.priceDesc));
      expect(res.map((c) => c.id), ['1', '2', '3']);
    });

    test('priceAsc sorts low to high with nulls last', () {
      final res =
          filterCards(catalog, const CardFilters(sort: CardSort.priceAsc));
      expect(res.map((c) => c.id), ['2', '1', '3']);
    });

    test('numberAsc sorts by collector number', () {
      final res =
          filterCards(catalog, const CardFilters(sort: CardSort.numberAsc));
      expect(res.map((c) => c.collectorNumber), ['010', '020', '030']);
    });
  });

  group('CardFilters', () {
    test('hasActiveFilters detects foil or non-default sort', () {
      expect(const CardFilters().hasActiveFilters, isFalse);
      expect(const CardFilters(foilOnly: true).hasActiveFilters, isTrue);
      expect(const CardFilters(sort: CardSort.priceAsc).hasActiveFilters,
          isTrue);
    });

    test('copyWith can clear setName via explicit null', () {
      const filters = CardFilters(setName: 'Origins');
      expect(filters.copyWith(setName: null).setName, isNull);
    });

    test('copyWith without setName preserves it', () {
      const filters = CardFilters(setName: 'Origins');
      expect(filters.copyWith(query: 'x').setName, 'Origins');
    });
  });
}
