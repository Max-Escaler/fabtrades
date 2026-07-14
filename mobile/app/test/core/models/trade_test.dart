import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/models/trade.dart';

import '../../support/fixtures.dart';

void main() {
  group('TradeItem', () {
    test('lineTotal multiplies priceEach by quantity', () {
      final item = TradeItem(card: buildCard(), quantity: 3, priceEach: 2.5);
      expect(item.lineTotal, 7.5);
    });

    test('copyWith overrides only provided fields', () {
      final item = TradeItem(card: buildCard(), quantity: 1, priceEach: 1);
      final updated = item.copyWith(quantity: 4);
      expect(updated.quantity, 4);
      expect(updated.priceEach, 1);
      expect(updated.card.id, item.card.id);
    });

    test('toJson -> fromJson round-trips', () {
      final item = TradeItem(
        card: buildCard(id: 'z', name: 'Zed'),
        quantity: 2,
        priceEach: 3.25,
      );
      final restored = TradeItem.fromJson(item.toJson());
      expect(restored.card.id, 'z');
      expect(restored.card.name, 'Zed');
      expect(restored.quantity, 2);
      expect(restored.priceEach, 3.25);
    });

    test('fromJson applies defaults for missing quantity/price', () {
      final restored = TradeItem.fromJson({
        'card': buildCard().toStub(),
      });
      expect(restored.quantity, 1);
      expect(restored.priceEach, 0);
    });
  });

  group('Trade totals', () {
    final have = [
      TradeItem(card: buildCard(id: 'h1'), quantity: 2, priceEach: 5), // 10
      TradeItem(card: buildCard(id: 'h2'), quantity: 1, priceEach: 3), // 3
    ];
    final want = [
      TradeItem(card: buildCard(id: 'w1'), quantity: 3, priceEach: 4), // 12
    ];

    Trade tradeWith({double haveCash = 0, double wantCash = 0}) => Trade(
          id: 't',
          createdAt: DateTime(2026, 1, 1),
          haveItems: have,
          wantItems: want,
          haveCash: haveCash,
          wantCash: wantCash,
        );

    test('haveTotal includes items plus cash', () {
      expect(tradeWith(haveCash: 2).haveTotal, 15);
    });

    test('wantTotal includes items plus cash', () {
      expect(tradeWith(wantCash: 8).wantTotal, 20);
    });

    test('delta is haveTotal minus wantTotal', () {
      final t = tradeWith(haveCash: 2, wantCash: 8);
      expect(t.delta, closeTo(15 - 20, 1e-9));
    });

    test('counts sum item quantities (not lines)', () {
      final t = tradeWith();
      expect(t.haveCount, 3);
      expect(t.wantCount, 3);
    });

    test('empty trade has zero totals and counts', () {
      final t = Trade(id: 't', createdAt: DateTime(2026, 1, 1));
      expect(t.haveTotal, 0);
      expect(t.wantTotal, 0);
      expect(t.delta, 0);
      expect(t.haveCount, 0);
      expect(t.wantCount, 0);
    });
  });

  group('Trade serialization', () {
    test('toJson -> fromJson round-trips including nested items', () {
      final trade = Trade(
        id: 'trade-1',
        createdAt: DateTime.utc(2026, 6, 7, 8, 9, 10),
        notes: 'good deal',
        haveItems: [
          TradeItem(card: buildCard(id: 'h'), quantity: 2, priceEach: 1.5),
        ],
        wantItems: [
          TradeItem(card: buildCard(id: 'w'), quantity: 1, priceEach: 9.0),
        ],
        haveCash: 5,
        wantCash: 1,
        currencySymbol: '€',
      );

      final restored = Trade.fromJson(trade.toJson());

      expect(restored.id, 'trade-1');
      expect(restored.createdAt, DateTime.utc(2026, 6, 7, 8, 9, 10));
      expect(restored.notes, 'good deal');
      expect(restored.haveItems.single.card.id, 'h');
      expect(restored.haveItems.single.quantity, 2);
      expect(restored.wantItems.single.priceEach, 9.0);
      expect(restored.haveCash, 5);
      expect(restored.wantCash, 1);
      expect(restored.currencySymbol, '€');
    });

    test('fromJson applies defaults for a minimal payload', () {
      final restored = Trade.fromJson({
        'id': 'min',
        'created_at': DateTime(2026, 1, 1).toIso8601String(),
      });
      expect(restored.notes, '');
      expect(restored.haveItems, isEmpty);
      expect(restored.wantItems, isEmpty);
      expect(restored.haveCash, 0);
      expect(restored.wantCash, 0);
      expect(restored.currencySymbol, '\$');
    });
  });
}
