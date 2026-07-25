import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/data/card_repository.dart';
import 'package:fabtrades/core/models/binder_entry.dart';

import '../../support/fixtures.dart';

BinderEntry entry(
  String id,
  String name, {
  int quantity = 1,
  bool isFoil = false,
  String? collectorNumber,
  double? tcgMarket,
}) =>
    BinderEntry(
      card: buildCard(
        id: id,
        name: name,
        isFoil: isFoil,
        collectorNumber: collectorNumber,
        tcgMarket: tcgMarket,
      ),
      quantity: quantity,
      addedAt: DateTime(2026, 1, 1),
    );

void main() {
  group('filterByCardFilters — binder entries', () {
    final binder = [
      entry('1', 'Vex - Apathetic',
          quantity: 2, collectorNumber: '001', tcgMarket: 5),
      entry('2', 'Vi - Piltover Enforcer',
          quantity: 1, collectorNumber: '002', tcgMarket: 1, isFoil: true),
      entry('3', 'Ashe - Frost Archer',
          quantity: 3, collectorNumber: '003'),
    ];

    test('query matching preserves quantity', () {
      final res = filterByCardFilters(
        binder,
        (e) => e.card,
        const CardFilters(query: 'Vex a'),
        excludeNonCards: false,
      );
      expect(res.single.card.name, 'Vex - Apathetic');
      expect(res.single.quantity, 2);
    });

    test('foilOnly keeps foil printings', () {
      final res = filterByCardFilters(
        binder,
        (e) => e.card,
        const CardFilters(foilOnly: true),
        excludeNonCards: false,
      );
      expect(res.map((e) => e.card.id), ['2']);
    });

    test('nameAsc is the default order', () {
      final res = filterByCardFilters(
        binder,
        (e) => e.card,
        const CardFilters(),
        excludeNonCards: false,
      );
      expect(res.map((e) => e.card.name), [
        'Ashe - Frost Archer',
        'Vex - Apathetic',
        'Vi - Piltover Enforcer',
      ]);
    });

    test('priceDesc sorts high to low with nulls last', () {
      final res = filterByCardFilters(
        binder,
        (e) => e.card,
        const CardFilters(sort: CardSort.priceDesc),
        excludeNonCards: false,
      );
      expect(res.map((e) => e.card.id), ['1', '2', '3']);
    });

    test('numberAsc sorts by collector number', () {
      final res = filterByCardFilters(
        binder,
        (e) => e.card,
        const CardFilters(sort: CardSort.numberAsc),
        excludeNonCards: false,
      );
      expect(res.map((e) => e.card.collectorNumber), ['001', '002', '003']);
    });

    test('does not drop non-card products when excludeNonCards is false', () {
      final withProduct = [
        entry('1', 'Real Card'),
        BinderEntry(
          card: buildCard(
            id: '2',
            name: 'Champion Deck',
            rarity: null,
            collectorNumber: null,
          ),
          addedAt: DateTime(2026, 1, 1),
        ),
      ];
      final res = filterByCardFilters(
        withProduct,
        (e) => e.card,
        const CardFilters(),
        excludeNonCards: false,
      );
      expect(res.map((e) => e.card.id), ['2', '1']);
    });
  });
}
