import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:purchases_flutter/purchases_flutter.dart';

import '../config/revenuecat_config.dart';
import '../models/purchase_outcome.dart';

/// The app's only entry point to the RevenueCat SDK.
///
/// Every method is a no-op (or returns an empty/failed result) while
/// [isConfigured] is false, which keeps two awkward cases harmless:
///
/// * a release build shipped without its platform API key, and
/// * widget tests, where the plugin's method channels don't exist.
///
/// Nothing else in the app imports `purchases_flutter` for behaviour, so the
/// SDK can be swapped or mocked from one place.
class PurchasesRepository {
  bool _configured = false;

  /// True once [configure] has succeeded. Callers should treat false as
  /// "purchases are unavailable on this build" and hide subscription UI.
  bool get isConfigured => _configured;

  /// Configures the SDK. Safe to call more than once, and never throws — a
  /// failure here must not stop the app from launching, since browsing cards
  /// works fine without subscriptions.
  ///
  /// FABTrades has no accounts, so no `appUserID` is supplied and RevenueCat
  /// generates an anonymous one per install. Purchases are tied to the store
  /// account, which is why "Restore purchases" is the recovery path after a
  /// reinstall or a new device. If accounts are added later, call
  /// `Purchases.logIn(userId)` after sign-in and `Purchases.logOut()` on
  /// sign-out instead of changing this method.
  Future<bool> configure() async {
    if (_configured) return true;

    final apiKey = RevenueCatConfig.apiKey();
    if (apiKey == null) {
      debugPrint(
        'RevenueCat: no API key for this build — subscriptions disabled. '
        'Pass --dart-define=REVENUECAT_APPLE_API_KEY / '
        'REVENUECAT_GOOGLE_API_KEY for release builds.',
      );
      return false;
    }

    try {
      // Log level must be set before configure() to capture setup problems.
      await Purchases.setLogLevel(
        kDebugMode ? LogLevel.debug : LogLevel.warn,
      );
      await Purchases.configure(
        PurchasesConfiguration(apiKey)
          // Surfaces store-side billing problems ("fix your payment method")
          // without FABTrades having to build those prompts itself.
          ..shouldShowInAppMessagesAutomatically = true,
      );
      _configured = true;
      if (RevenueCatConfig.useTestStore) {
        debugPrint('RevenueCat: configured against the Test Store.');
      }
      return true;
    } catch (e) {
      debugPrint('RevenueCat: configure failed — $e');
      return false;
    }
  }

  /// The cached customer info, refreshed by the SDK as needed. Null when
  /// unconfigured. The SDK serves its local cache while offline, so this keeps
  /// working on a plane — which matters for a gated feature.
  Future<CustomerInfo?> customerInfo() async {
    if (!_configured) return null;
    final info = await Purchases.getCustomerInfo();
    _warnOnEntitlementMismatch(info);
    return info;
  }

  /// Catches the one misconfiguration that fails silently in production: an
  /// entitlement identifier that doesn't match the dashboard. Pro would simply
  /// never unlock, with no error anywhere. Debug builds only.
  void _warnOnEntitlementMismatch(CustomerInfo info) {
    if (!kDebugMode || _warnedAboutEntitlement) return;
    final known = info.entitlements.all.keys;
    if (known.isEmpty ||
        known.contains(RevenueCatConfig.proEntitlement)) {
      return;
    }
    _warnedAboutEntitlement = true;
    debugPrint(
      'RevenueCat: no entitlement named "${RevenueCatConfig.proEntitlement}". '
      'This customer has: ${known.join(', ')}. Update '
      'RevenueCatConfig.proEntitlement to match the dashboard, or Pro will '
      'never unlock.',
    );
  }

  bool _warnedAboutEntitlement = false;

  /// Registers [listener] for entitlement changes. RevenueCat fires this on
  /// renewals, expirations, cancellations and deferred purchases completing —
  /// it's what keeps Pro access correct without any polling.
  void addCustomerInfoListener(CustomerInfoUpdateListener listener) {
    if (!_configured) return;
    Purchases.addCustomerInfoUpdateListener(listener);
  }

  void removeCustomerInfoListener(CustomerInfoUpdateListener listener) {
    if (!_configured) return;
    Purchases.removeCustomerInfoUpdateListener(listener);
  }

  /// Fetches offerings so prices come from the dashboard rather than being
  /// hardcoded. Returns null when unconfigured.
  Future<Offerings?> offerings() async {
    if (!_configured) return null;
    return Purchases.getOfferings();
  }

  /// Buys [package] and returns a typed outcome instead of throwing.
  ///
  /// Only needed for a hand-rolled paywall; the RevenueCat Paywall runs its own
  /// purchase flow. Both end up granting the same entitlement.
  Future<PurchaseOutcome> purchasePackage(Package package) async {
    if (!_configured) {
      return const PurchaseFailure(
        PurchasesErrorCode.configurationError,
        'Subscriptions are unavailable in this build.',
      );
    }
    try {
      final result = await Purchases.purchase(PurchaseParams.package(package));
      return PurchaseSuccess(result.customerInfo, result.storeTransaction);
    } on PlatformException catch (e) {
      final code = PurchasesErrorHelper.getErrorCode(e);
      return switch (code) {
        PurchasesErrorCode.purchaseCancelledError => const PurchaseCancelled(),
        PurchasesErrorCode.paymentPendingError => const PurchasePending(),
        _ => PurchaseFailure(code, describePurchasesError(code)),
      };
    } catch (e) {
      debugPrint('RevenueCat: unexpected purchase error — $e');
      return PurchaseFailure(
        PurchasesErrorCode.unknownError,
        describePurchasesError(PurchasesErrorCode.unknownError),
      );
    }
  }

  /// Re-links store purchases to this install. The recovery path for
  /// reinstalls and new devices, and required by App Review for any app that
  /// sells non-consumable content.
  Future<RestoreOutcome> restorePurchases() async {
    if (!_configured) {
      return const RestoreFailure(
        PurchasesErrorCode.configurationError,
        'Subscriptions are unavailable in this build.',
      );
    }
    try {
      return RestoreSuccess(await Purchases.restorePurchases());
    } on PlatformException catch (e) {
      final code = PurchasesErrorHelper.getErrorCode(e);
      return RestoreFailure(code, describePurchasesError(code));
    } catch (e) {
      debugPrint('RevenueCat: unexpected restore error — $e');
      return RestoreFailure(
        PurchasesErrorCode.unknownError,
        describePurchasesError(PurchasesErrorCode.unknownError),
      );
    }
  }
}

/// Customer-facing wording for the error codes a subscription flow can
/// realistically hit. Anything unmapped falls back to a generic retry message,
/// since raw SDK messages are written for developers.
String describePurchasesError(PurchasesErrorCode code) => switch (code) {
      PurchasesErrorCode.networkError ||
      PurchasesErrorCode.offlineConnectionError =>
        "Couldn't reach the store. Check your connection and try again.",
      PurchasesErrorCode.storeProblemError =>
        'The store had a problem completing that. Please try again shortly.',
      PurchasesErrorCode.purchaseNotAllowedError ||
      PurchasesErrorCode.insufficientPermissionsError =>
        'This device or account is not allowed to make purchases. Check your '
            'device restrictions and try again.',
      PurchasesErrorCode.productAlreadyPurchasedError =>
        'You already own this subscription. Try restoring your purchases.',
      PurchasesErrorCode.receiptAlreadyInUseError ||
      PurchasesErrorCode.receiptInUseByOtherSubscriberError =>
        'That subscription is already linked to another account.',
      PurchasesErrorCode.productNotAvailableForPurchaseError =>
        "FABTrades Pro isn't available on this store yet. Please try again "
            'later.',
      PurchasesErrorCode.paymentPendingError =>
        'Your payment is still processing. Pro unlocks as soon as the store '
            'confirms it.',
      PurchasesErrorCode.ineligibleError =>
        "This offer isn't available on your account.",
      PurchasesErrorCode.configurationError ||
      PurchasesErrorCode.invalidCredentialsError =>
        'Subscriptions are misconfigured for this build.',
      PurchasesErrorCode.testStoreSimulatedPurchaseError =>
        'Simulated Test Store failure.',
      _ => 'Something went wrong with that purchase. Please try again.',
    };
