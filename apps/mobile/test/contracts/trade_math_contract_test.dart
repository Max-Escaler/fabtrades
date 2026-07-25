// Contract tests for trade totals.
//
// These assert the shared fixtures in packages/contracts, which the JavaScript
// implementation in apps/web is held to as well. Cash is out of scope: this
// package takes it as an input, web derives it from the difference. See
// packages/contracts/README.md.
import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/models/trade.dart';

import '../support/fixtures.dart';
import 'contract_fixtures.dart';

void main() {
  final contract = loadContract('trade_math');
  final tolerance = (contract['tolerance'] as num).toDouble();

  for (final c in contractCases(contract, 'cases')) {
    test(c['name'] as String, () {
      final trade = Trade(
        id: 'contract',
        createdAt: DateTime.utc(2026, 1, 1),
        haveItems: _items(c['have'], 'h'),
        wantItems: _items(c['want'], 'w'),
      );

      expect(
        trade.haveTotal,
        closeTo((c['haveTotal'] as num).toDouble(), tolerance),
      );
      expect(
        trade.wantTotal,
        closeTo((c['wantTotal'] as num).toDouble(), tolerance),
      );
      expect(trade.delta, closeTo((c['diff'] as num).toDouble(), tolerance));
    });
  }
}

List<TradeItem> _items(Object? raw, String idPrefix) {
  final list = (raw as List)
      .map((e) => Map<String, dynamic>.from(e as Map))
      .toList();
  return [
    for (var i = 0; i < list.length; i++)
      TradeItem(
        card: buildCard(id: '$idPrefix$i'),
        quantity: (list[i]['quantity'] as num).toInt(),
        priceEach: (list[i]['price'] as num).toDouble(),
      ),
  ];
}
