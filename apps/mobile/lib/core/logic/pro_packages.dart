import 'package:purchases_flutter/purchases_flutter.dart';

import '../config/revenuecat_config.dart';

/// Resolves the two FABTrades Pro plans out of a RevenueCat [Offering].
///
/// Each getter prefers the predefined package type ([PackageType.annual] /
/// [PackageType.monthly]), which is what you get by attaching products to the
/// `$rc_annual` and `$rc_monthly` slots of an offering. It then falls back to
/// matching on the store product identifier so a custom-identifier package
/// still resolves.
///
/// Prices always come from the store via [StoreProduct.priceString] — already
/// localized and correct for the customer's region, which hardcoded strings
/// never are.
extension ProPackages on Offering {
  /// The `yearly` plan.
  Package? get yearlyPackage =>
      annual ?? _byProductId(RevenueCatConfig.yearlyProductId);

  /// The `monthly` plan.
  Package? get monthlyPackage =>
      monthly ?? _byProductId(RevenueCatConfig.monthlyProductId);

  /// Both plans, cheapest commitment last, skipping any that aren't attached
  /// to this offering yet.
  List<Package> get proPackages =>
      [yearlyPackage, monthlyPackage].whereType<Package>().toList();

  Package? _byProductId(String productId) {
    for (final package in availablePackages) {
      final identifier = package.storeProduct.identifier;
      // Play Store subscription products report as `product:base_plan`.
      if (identifier == productId || identifier.startsWith('$productId:')) {
        return package;
      }
    }
    return null;
  }
}

/// Percentage saved by paying yearly instead of monthly, or null when either
/// plan is missing or the numbers don't imply a saving.
///
/// Useful as a "Save 40%" badge on a hand-rolled paywall. RevenueCat Paywalls
/// compute this themselves via the `{{ total_price_and_per_month }}` and
/// discount variables, so this is only for custom UI.
int? yearlySavingPercent(Offering offering) {
  final yearly = offering.yearlyPackage?.storeProduct.price;
  final monthly = offering.monthlyPackage?.storeProduct.price;
  if (yearly == null || monthly == null || monthly <= 0) return null;
  final saving = 1 - (yearly / (monthly * 12));
  if (saving <= 0) return null;
  return (saving * 100).round();
}
