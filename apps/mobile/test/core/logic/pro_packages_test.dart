import 'package:fabtrades/core/config/revenuecat_config.dart';
import 'package:fabtrades/core/logic/pro_packages.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

const _context = PresentedOfferingContext('default', null, null);

/// Test Store identifiers, which is what a debug build actually sees.
const _yearly = 'yearly';
const _monthly = 'monthly';

Package _package(
  String identifier,
  PackageType type,
  String productId,
  double price,
) =>
    Package(
      identifier,
      type,
      StoreProduct(
        productId,
        'FABTrades Pro',
        'FABTrades Pro',
        price,
        '\$${price.toStringAsFixed(2)}',
        'USD',
      ),
      _context,
    );

Offering _offering(List<Package> packages) {
  Package? ofType(PackageType type) {
    for (final p in packages) {
      if (p.packageType == type) return p;
    }
    return null;
  }

  return Offering(
    'default',
    'FABTrades Pro plans',
    const {},
    packages,
    annual: ofType(PackageType.annual),
    monthly: ofType(PackageType.monthly),
  );
}

void main() {
  group('ProPackages', () {
    test('resolves both plans from the predefined package types', () {
      final offering = _offering([
        _package(r'$rc_annual', PackageType.annual, _yearly, 39.99),
        _package(r'$rc_monthly', PackageType.monthly, _monthly, 4.99),
      ]);

      expect(offering.yearlyPackage?.storeProduct.identifier, _yearly);
      expect(offering.monthlyPackage?.storeProduct.identifier, _monthly);
      expect(offering.proPackages, hasLength(2));
    });

    test('falls back to the product id for custom packages', () {
      final offering = _offering([
        _package('pro_yearly', PackageType.custom, _yearly, 39.99),
        _package('pro_monthly', PackageType.custom, _monthly, 4.99),
      ]);

      expect(offering.yearlyPackage?.identifier, 'pro_yearly');
      expect(offering.monthlyPackage?.identifier, 'pro_monthly');
    });

    test('matches Play Store products that carry a base plan suffix', () {
      final offering = _offering([
        _package('a', PackageType.custom, 'pro_yearly:annual-autorenewing', 39.99),
        _package('b', PackageType.custom, 'pro_monthly:monthly-autorenewing', 4.99),
      ]);

      expect(offering.yearlyPackage?.identifier, 'a');
      expect(offering.monthlyPackage?.identifier, 'b');
    });

    test('matches App Store products, whose ids differ from Play', () {
      // Apple requires product ids to be unique across the whole developer
      // account, so they cannot match Play's. A single expected id would resolve
      // on one store and silently fail on the other.
      final offering = _offering([
        _package('a', PackageType.custom, 'com.fabtrades.app.pro.yearly', 39.99),
        _package('b', PackageType.custom, 'com.fabtrades.app.pro.monthly', 4.99),
      ]);

      expect(offering.yearlyPackage?.identifier, 'a');
      expect(offering.monthlyPackage?.identifier, 'b');
    });

    test('ignores a product belonging to neither plan', () {
      final offering = _offering([
        _package('a', PackageType.custom, 'com.fabtrades.app.pro.lifetime', 99.99),
      ]);

      expect(offering.yearlyPackage, isNull);
      expect(offering.monthlyPackage, isNull);
      expect(offering.proPackages, isEmpty);
    });

    test('omits plans that are not attached to the offering', () {
      final offering = _offering([
        _package(r'$rc_monthly', PackageType.monthly, _monthly, 4.99),
      ]);

      expect(offering.yearlyPackage, isNull);
      expect(offering.proPackages, hasLength(1));
    });
  });

  group('product identifiers', () {
    test('cover the App Store, the Play Store, and the Test Store', () {
      // The store ids are the one thing here that cannot be verified by any test
      // — they live in two dashboards. What can be checked is that the sets do
      // not silently lose a platform, which would resolve as "no plans" and show
      // an empty paywall.
      expect(RevenueCatConfig.yearlyProductIds, contains(_yearly));
      expect(RevenueCatConfig.monthlyProductIds, contains(_monthly));
      expect(RevenueCatConfig.yearlyProductIds, hasLength(3));
      expect(RevenueCatConfig.monthlyProductIds, hasLength(3));
    });

    test('never overlap, so a plan cannot resolve to the wrong one', () {
      expect(
        RevenueCatConfig.yearlyProductIds
            .intersection(RevenueCatConfig.monthlyProductIds),
        isEmpty,
      );
    });
  });

  group('yearlySavingPercent', () {
    test('reports the discount of yearly over twelve monthly payments', () {
      final offering = _offering([
        _package(r'$rc_annual', PackageType.annual, _yearly, 39.99),
        _package(r'$rc_monthly', PackageType.monthly, _monthly, 4.99),
      ]);

      // 39.99 vs 59.88 a year.
      expect(yearlySavingPercent(offering), 33);
    });

    test('returns null when yearly is not actually cheaper', () {
      final offering = _offering([
        _package(r'$rc_annual', PackageType.annual, _yearly, 59.88),
        _package(r'$rc_monthly', PackageType.monthly, _monthly, 4.99),
      ]);

      expect(yearlySavingPercent(offering), isNull);
    });

    test('returns null when a plan is missing', () {
      final offering = _offering([
        _package(r'$rc_annual', PackageType.annual, _yearly, 39.99),
      ]);

      expect(yearlySavingPercent(offering), isNull);
    });
  });
}
