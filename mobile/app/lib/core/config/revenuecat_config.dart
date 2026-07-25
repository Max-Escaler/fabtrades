import 'package:flutter/foundation.dart';

/// RevenueCat wiring for FABTrades Pro.
///
/// The identifiers below must match the RevenueCat dashboard exactly:
///
/// * Entitlement — `FABTrades Pro` (Product catalog → Entitlements)
/// * Products    — `yearly` and `monthly` (Product catalog → Products)
/// * Offering    — both products attached as the `$rc_annual` / `$rc_monthly`
///   packages of the offering marked **Current** (Product catalog → Offerings)
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

  /// Store product identifiers, used to resolve packages when an offering
  /// doesn't use RevenueCat's predefined package types.
  static const yearlyProductId = 'yearly';
  static const monthlyProductId = 'monthly';

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
