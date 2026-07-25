import 'package:purchases_flutter/purchases_flutter.dart';

import '../config/revenuecat_config.dart';

/// The app's view of the `FABTrades Pro` entitlement, derived from RevenueCat's
/// [CustomerInfo].
///
/// Keeping this between the SDK and the UI means widgets never reach into
/// `entitlements.all[...]` themselves, and the whole app agrees on what "Pro"
/// means: [isPro] is the single source of truth for gating.
class SubscriptionStatus {
  const SubscriptionStatus({
    required this.isPro,
    this.willRenew = false,
    this.isInTrial = false,
    this.hasBillingIssue = false,
    this.isSandbox = false,
    this.expiresAt,
    this.productIdentifier,
    this.store,
    this.managementUrl,
  });

  /// No Pro access. Also what the app falls back to when RevenueCat isn't
  /// configured (missing release key, or unit tests).
  static const free = SubscriptionStatus(isPro: false);

  factory SubscriptionStatus.fromCustomerInfo(CustomerInfo info) {
    final entitlement = info.entitlements.all[RevenueCatConfig.proEntitlement];
    if (entitlement == null) {
      return SubscriptionStatus(isPro: false, managementUrl: info.managementURL);
    }
    return SubscriptionStatus(
      isPro: entitlement.isActive,
      willRenew: entitlement.willRenew,
      isInTrial: entitlement.periodType == PeriodType.trial,
      // Only meaningful while access is still granted — during the grace
      // period the customer keeps Pro but needs to fix their payment method.
      hasBillingIssue:
          entitlement.isActive && entitlement.billingIssueDetectedAt != null,
      isSandbox: entitlement.isSandbox,
      expiresAt: DateTime.tryParse(entitlement.expirationDate ?? '')?.toLocal(),
      productIdentifier: entitlement.productIdentifier,
      store: entitlement.store,
      managementUrl: info.managementURL,
    );
  }

  /// Whether Pro features should be unlocked right now. Stays true through the
  /// grace period after a cancellation or billing failure, because RevenueCat
  /// only clears the entitlement once access has actually lapsed.
  final bool isPro;

  /// False once the customer cancels — they keep access until [expiresAt].
  final bool willRenew;

  final bool isInTrial;

  /// A payment failed and the store is retrying. Worth surfacing: fixing it is
  /// the difference between a renewal and involuntary churn.
  final bool hasBillingIssue;

  /// Granted by a sandbox / Test Store purchase rather than a real one.
  final bool isSandbox;

  /// When access lapses, or null for lifetime (and non-expiring) entitlements.
  final DateTime? expiresAt;

  /// The store product currently backing Pro, e.g. `yearly` or `monthly`.
  final String? productIdentifier;

  final Store? store;

  /// Deep link to the store's own subscription management screen. Prefer the
  /// Customer Center, which wraps this along with restore and refund flows.
  final String? managementUrl;

  bool get isLifetime => isPro && expiresAt == null;

  /// Cancelled but not yet expired — the window where a win-back offer lands
  /// best.
  bool get isExpiring => isPro && !willRenew && expiresAt != null;

  @override
  bool operator ==(Object other) =>
      other is SubscriptionStatus &&
      other.isPro == isPro &&
      other.willRenew == willRenew &&
      other.isInTrial == isInTrial &&
      other.hasBillingIssue == hasBillingIssue &&
      other.isSandbox == isSandbox &&
      other.expiresAt == expiresAt &&
      other.productIdentifier == productIdentifier &&
      other.store == store &&
      other.managementUrl == managementUrl;

  @override
  int get hashCode => Object.hash(
        isPro,
        willRenew,
        isInTrial,
        hasBillingIssue,
        isSandbox,
        expiresAt,
        productIdentifier,
        store,
        managementUrl,
      );
}
