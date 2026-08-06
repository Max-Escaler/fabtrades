import 'package:flutter/foundation.dart';

/// RevenueCat wiring for FABTrades Pro.
///
/// The identifiers below must match the RevenueCat dashboard exactly:
///
/// * Entitlement — `FABTrades Pro` (Product catalog → Entitlements)
/// * Offering    — one offering marked **Current**, with every platform's yearly
///   product attached to `$rc_annual` and every monthly product to `$rc_monthly`
///   (Product catalog → Offerings)
///
/// Store setup, and the exact product identifiers, are in
/// [docs/STORE_SETUP.md](../../../../../docs/STORE_SETUP.md).
///
/// ## API keys
///
/// Debug and profile builds use the [RevenueCat Test Store][test-store], which
/// simulates purchases without any App Store / Play Console setup. Release
/// builds require the real platform keys, passed at build time so the secrets
/// never live in source control:
///
/// ```sh
/// flutter build appbundle \
///   --dart-define=REVENUECAT_GOOGLE_API_KEY=goog_xxx
/// flutter build ipa \
///   --dart-define=REVENUECAT_APPLE_API_KEY=appl_xxx
/// ```
///
/// If a release build is missing its key, [apiKey] returns null and the app
/// runs with subscriptions disabled rather than crashing — never with the
/// test key, which would make every purchase a no-op in production.
///
/// [test-store]: https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store
class RevenueCatConfig {
  const RevenueCatConfig._();

  /// Entitlement identifier that unlocks Pro features.
  static const proEntitlement = 'FABTrades Pro';

  /// Every store identifier that means "the yearly plan".
  ///
  /// A set rather than one string, because the identifier genuinely cannot be the
  /// same everywhere: Apple requires product ids to be unique across the entire
  /// developer account (which this app shares with another product), Play scopes
  /// them to the app and reports them as `subscription:base_plan`, and the Test
  /// Store has its own. Matching against all of them keeps one list to maintain
  /// instead of a per-platform branch.
  ///
  /// Only a fallback: packages normally resolve by [PackageType], which is what
  /// attaching them to the `$rc_annual` / `$rc_monthly` slots gives you.
  static const yearlyProductIds = {
    'com.fabtrades.app.pro.yearly', // App Store
    'pro_yearly', // Play Store, base plan appended
    'yearly', // Test Store
  };

  /// Every store identifier that means "the monthly plan". See
  /// [yearlyProductIds] for why there is more than one.
  static const monthlyProductIds = {
    'com.fabtrades.app.pro.monthly', // App Store
    'pro_monthly', // Play Store, base plan appended
    'monthly', // Test Store
  };

  /// Whether [productId] is one of the monthly plans (including Play's
  /// `subscription:base_plan` form).
  static bool isMonthlyProduct(String? productId) =>
      _matchesProduct(productId, monthlyProductIds);

  /// Whether [productId] is one of the yearly plans.
  static bool isYearlyProduct(String? productId) =>
      _matchesProduct(productId, yearlyProductIds);

  static bool _matchesProduct(String? productId, Set<String> ids) {
    if (productId == null || productId.isEmpty) return false;
    for (final id in ids) {
      if (productId == id || productId.startsWith('$id:')) return true;
    }
    return false;
  }

  /// Test Store key. Safe to commit: it only ever transacts against
  /// RevenueCat's simulated store, and is rejected for release builds below.
  static const _testStoreApiKey = 'test_lyucRxsDUQbbqxATXoXZuPJvEBr';

  static const _appleApiKey =
      String.fromEnvironment('REVENUECAT_APPLE_API_KEY');
  static const _googleApiKey =
      String.fromEnvironment('REVENUECAT_GOOGLE_API_KEY');

  /// True when purchases should go through the Test Store instead of a real
  /// store. Set `--dart-define=REVENUECAT_USE_TEST_STORE=true` to opt a
  /// release build in as well (for a QA/TestFlight build, for example).
  static const useTestStore =
      !kReleaseMode || bool.fromEnvironment('REVENUECAT_USE_TEST_STORE');

  /// The key to configure the SDK with, or null when this build has no usable
  /// key and subscriptions should stay switched off.
  static String? apiKey({TargetPlatform? platform}) {
    // Web purchases need a separate Web Billing key and are not set up yet.
    if (kIsWeb) return null;
    if (useTestStore) return _testStoreApiKey;
    final key = switch (platform ?? defaultTargetPlatform) {
      TargetPlatform.iOS || TargetPlatform.macOS => _appleApiKey,
      TargetPlatform.android => _googleApiKey,
      _ => '',
    };
    return key.isEmpty ? null : key;
  }
}
