// Contract tests for browse-list ordering.
//
// These assert the shared fixtures in packages/contracts, which the JavaScript
// implementation in apps/web is held to as well. A failure here means either this
// package's logic drifted from web, or the agreed behaviour changed and both sides
// plus the fixture need updating. See packages/contracts/README.md.
import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/logic/set_sort.dart';

import 'contract_fixtures.dart';

void main() {
  final contract = loadContract('set_sort');

  test('tier constants agree with the fixture', () {
    final tiers = Map<String, dynamic>.from(contract['tiers'] as Map);
    expect(tiers['MAIN'], BrowseTier.main);
    expect(tiers['BLITZ'], BrowseTier.blitz);
    expect(tiers['ARMORY'], BrowseTier.armory);
    expect(tiers['SILVER_AGE'], BrowseTier.silverAge);
    expect(tiers['HERO'], BrowseTier.hero);
    expect(tiers['OTHER'], BrowseTier.other);
  });

  group('setBrowseTier', () {
    for (final c in contractCases(contract, 'browseTier')) {
      final name = c['name'] as String;
      final tier = c['tier'] as int;
      test('buckets "$name" as tier $tier', () {
        expect(setBrowseTier(name), tier);
      });
    }
  });

  group('browseTierLabel', () {
    for (final c in contractCases(contract, 'tierLabel')) {
      final tier = c['tier'] as int;
      final label = c['label'] as String;
      test('labels tier $tier as "$label"', () {
        expect(browseTierLabel(tier), label);
      });
    }
  });

  group('compareSetNamesByBrowseOrder', () {
    for (final c in contractCases(contract, 'compareNames')) {
      final a = c['a'] as String;
      final b = c['b'] as String;
      final sign = c['sign'] as int;
      test('orders "$a" vs "$b" as $sign', () {
        expect(compareSetNamesByBrowseOrder(a, b).sign, sign);
      });
    }
  });

  group('compareSetsByBrowseOrder', () {
    for (final c in contractCases(contract, 'compareSets')) {
      final a = Map<String, dynamic>.from(c['a'] as Map);
      final b = Map<String, dynamic>.from(c['b'] as Map);
      final sign = c['sign'] as int;
      test('orders ${a['name']} vs ${b['name']} as $sign', () {
        final result = compareSetsByBrowseOrder(
          a['name'] as String,
          b['name'] as String,
          publishedOnA: _parseDate(a['publishedOn']),
          publishedOnB: _parseDate(b['publishedOn']),
        );
        expect(result.sign, sign);
      });
    }
  });
}

DateTime? _parseDate(Object? value) =>
    value == null ? null : DateTime.parse(value as String);
