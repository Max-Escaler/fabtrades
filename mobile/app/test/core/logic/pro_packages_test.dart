import 'package:fabtrades/core/config/revenuecat_config.dart';
import 'package:fabtrades/core/logic/pro_packages.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

const _context = PresentedOfferingContext('default', null, null);

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
        _package(r'$rc_annual', PackageType.annual,
            RevenueCatConfig.yearlyProductId, 39.99),
        _package(r'$rc_monthly', PackageType.monthly,
            RevenueCatConfig.monthlyProductId, 4.99),
      ]);

      expect(offering.yearlyPackage?.storeProduct.identifier, 'yearly');
      expect(offering.monthlyPackage?.storeProduct.identifier, 'monthly');
      expect(offering.proPackages, hasLength(2));
    });

    test('falls back to the product id for custom packages', () {
      final offering = _offering([
        _package('pro_yearly', PackageType.custom,
            RevenueCatConfig.yearlyProductId, 39.99),
        _package('pro_monthly', PackageType.custom,
            RevenueCatConfig.monthlyProductId, 4.99),
      ]);

      expect(offering.yearlyPackage?.identifier, 'pro_yearly');
      expect(offering.monthlyPackage?.identifier, 'pro_monthly');
    });

    test('matches Play Store products that carry a base plan suffix', () {
      final offering = _offering([
        _package('pro_yearly', PackageType.custom, 'yearly:annual-plan', 39.99),
      ]);

      expect(offering.yearlyPackage?.identifier, 'pro_yearly');
      expect(offering.monthlyPackage, isNull);
    });

    test('omits plans that are not attached to the offering', () {
      final offering = _offering([
        _package(r'$rc_monthly', PackageType.monthly,
            RevenueCatConfig.monthlyProductId, 4.99),
      ]);

      expect(offering.yearlyPackage, isNull);
      expect(offering.proPackages, hasLength(1));
    });
  });

  group('yearlySavingPercent', () {
    test('reports the discount of yearly over twelve monthly payments', () {
      final offering = _offering([
        _package(r'$rc_annual', PackageType.annual,
            RevenueCatConfig.yearlyProductId, 39.99),
        _package(r'$rc_monthly', PackageType.monthly,
            RevenueCatConfig.monthlyProductId, 4.99),
      ]);

      // 39.99 vs 59.88 a year.
      expect(yearlySavingPercent(offering), 33);
    });

    test('returns null when yearly is not actually cheaper', () {
      final offering = _offering([
        _package(r'$rc_annual', PackageType.annual,
            RevenueCatConfig.yearlyProductId, 59.88),
        _package(r'$rc_monthly', PackageType.monthly,
            RevenueCatConfig.monthlyProductId, 4.99),
      ]);

      expect(yearlySavingPercent(offering), isNull);
    });

    test('returns null when a plan is missing', () {
      final offering = _offering([
        _package(r'$rc_annual', PackageType.annual,
            RevenueCatConfig.yearlyProductId, 39.99),
      ]);

      expect(yearlySavingPercent(offering), isNull);
    });
  });
}
