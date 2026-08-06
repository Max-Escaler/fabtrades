import 'package:purchases_flutter/purchases_flutter.dart' show Store;

import 'subscription_status.dart';

/// What the server says about this account's access to FABTrades Pro.
///
/// A row of `public.entitlements`, written only by the RevenueCat webhook. Read
/// through [Entitlement] rather than directly — on its own this is only half the
/// picture, and the half that lags.
class ServerEntitlement {
  const ServerEntitlement({
    required this.isActive,
    this.isTrialing = false,
    this.inGracePeriod = false,
    this.source,
    this.productId,
    this.expiresAt,
    this.isSandbox = false,
  });

  factory ServerEntitlement.fromJson(Map<String, dynamic> json) =>
      ServerEntitlement(
        isActive: json['is_active'] == true,
        isTrialing: json['is_trialing'] == true,
        inGracePeriod: json['in_grace_period'] == true,
        source: json['source'] as String?,
        productId: json['product_id'] as String?,
        expiresAt: DateTime.tryParse(json['expires_at'] as String? ?? '')
            ?.toLocal(),
        isSandbox: json['is_sandbox'] == true,
      );

  final bool isActive;
  final bool isTrialing;
  final bool inGracePeriod;

  /// `app_store`, `play_store`, `stripe`, or `promo`.
  final String? source;
  final String? productId;
  final DateTime? expiresAt;
  final bool isSandbox;

  /// Where the customer bought this, phrased for a human. Null when the row
  /// predates a known source, which reads better as nothing than as a guess.
  String? get sourceLabel => switch (source) {
        'app_store' => 'the App Store',
        'play_store' => 'Google Play',
        'stripe' => 'the web',
        'promo' => 'a complimentary grant',
        _ => null,
      };
}

/// The single answer to "does this customer have Pro right now".
///
/// Two sources, because each is wrong on its own:
///
/// * **The device** — RevenueCat's `CustomerInfo`. Correct the instant a purchase
///   completes, and readable offline from the SDK's cache. But it only knows what
///   *this* store account bought, so a subscription purchased on the other
///   platform is invisible to it.
/// * **The server** — the `entitlements` row. Platform-independent and the actual
///   source of truth, but it lags a purchase by a webhook round trip and needs a
///   network to read.
///
/// So access is granted when *either* says so. The failure that matters is
/// withholding Pro from somebody who paid: it produces a support ticket and a
/// refund. Briefly granting it to somebody whose refund has not propagated costs
/// nothing, and both sources converge within seconds anyway.
///
/// Nothing in the app should read either source directly. `isProProvider` reads
/// this, and every gate reads that, so what "Pro" means is decided once.
class Entitlement {
  const Entitlement({
    required this.isPro,
    this.isInTrial = false,
    this.willRenew = false,
    this.hasBillingIssue = false,
    this.isSandbox = false,
    this.expiresAt,
    this.productIdentifier,
    this.purchasedFrom,
    this.managementUrl,
    this.store,
    this.isConfirmedByServer = false,
    this.knowsRenewalIntent = false,
  });

  /// No access. Also what a build without a RevenueCat key resolves to, and what
  /// tests get by default.
  static const free = Entitlement(isPro: false);

  /// Merges what the device knows with what the server knows.
  ///
  /// [server] is null while signed out, or when the row has not been read yet —
  /// in which case the device's answer stands alone, which is exactly the
  /// signed-out and offline behaviour the app has always had.
  factory Entitlement.resolve({
    required SubscriptionStatus device,
    ServerEntitlement? server,
  }) {
    final serverActive = server?.isActive ?? false;

    // Renewal detail comes from the device when it has any, because
    // `CustomerInfo` carries fields the row does not: whether the subscription
    // will renew, and the store's management deep link.
    if (device.isPro) {
      return Entitlement(
        isPro: true,
        isInTrial: device.isInTrial || (server?.isTrialing ?? false),
        willRenew: device.willRenew,
        hasBillingIssue:
            device.hasBillingIssue || (server?.inGracePeriod ?? false),
        isSandbox: device.isSandbox,
        expiresAt: device.expiresAt,
        productIdentifier: device.productIdentifier,
        purchasedFrom: server?.sourceLabel,
        managementUrl: device.managementUrl,
        store: device.store,
        isConfirmedByServer: serverActive,
        knowsRenewalIntent: true,
      );
    }

    if (serverActive) {
      // Bought on the other platform, or on a device whose SDK cache is empty.
      // There is no `willRenew` here, so the UI must not claim it either way.
      return Entitlement(
        isPro: true,
        isInTrial: server!.isTrialing,
        hasBillingIssue: server.inGracePeriod,
        isSandbox: server.isSandbox,
        expiresAt: server.expiresAt,
        productIdentifier: server.productId,
        purchasedFrom: server.sourceLabel,
        managementUrl: device.managementUrl,
        isConfirmedByServer: true,
      );
    }

    // No access anywhere. The management URL survives so somebody who has
    // lapsed can still reach their store subscriptions to resubscribe.
    return Entitlement(isPro: false, managementUrl: device.managementUrl);
  }

  /// Whether Pro features are unlocked. Stays true through a grace period: a
  /// customer whose card failed this morning has not stopped being a subscriber.
  final bool isPro;

  final bool isInTrial;

  /// False once cancelled — access continues until [expiresAt]. Also false when
  /// only the server granted access, since the row does not record renewal
  /// intent; check [isConfirmedByServer] before showing renewal copy.
  final bool willRenew;

  /// A payment failed and the store is retrying. Worth surfacing: fixing it is
  /// the difference between a renewal and involuntary churn.
  final bool hasBillingIssue;

  final bool isSandbox;

  /// When access lapses, or null for a lifetime grant.
  final DateTime? expiresAt;
  final String? productIdentifier;

  /// Where it was bought, for display — "the App Store", "Google Play". Only
  /// known from the server, so null until the row has been read.
  final String? purchasedFrom;

  /// Deep link to the store's own subscription management screen.
  final String? managementUrl;

  /// Which store granted the device-side entitlement, when known.
  final Store? store;

  /// Whether the server has an active row for this. False with [isPro] true
  /// means a purchase the webhook has not landed yet, which is normal for a few
  /// seconds and worth investigating if it persists.
  final bool isConfirmedByServer;

  /// Whether [willRenew] means anything.
  ///
  /// False when only the server granted access — a subscription bought on the
  /// other platform. The row records an expiry but not whether it renews, and
  /// "access ends on the 14th" is a much worse thing to say wrongly than
  /// "active until the 14th".
  final bool knowsRenewalIntent;

  /// Whether this device can change plan or cancel through the store.
  ///
  /// Promotional grants and cross-platform access have no App Store / Play
  /// subscription to manage here — offering those actions would dead-end.
  bool get canManageInStore {
    if (!knowsRenewalIntent) return false;
    return switch (store) {
      Store.appStore ||
      Store.macAppStore ||
      Store.playStore ||
      Store.amazon ||
      Store.testStore ||
      Store.galaxy =>
        true,
      _ => false,
    };
  }

  bool get isLifetime => isPro && expiresAt == null;

  /// Cancelled but not yet expired — the window where a win-back offer lands
  /// best.
  bool get isExpiring =>
      isPro && knowsRenewalIntent && !willRenew && expiresAt != null;

  @override
  bool operator ==(Object other) =>
      other is Entitlement &&
      other.isPro == isPro &&
      other.isInTrial == isInTrial &&
      other.willRenew == willRenew &&
      other.hasBillingIssue == hasBillingIssue &&
      other.isSandbox == isSandbox &&
      other.expiresAt == expiresAt &&
      other.productIdentifier == productIdentifier &&
      other.purchasedFrom == purchasedFrom &&
      other.managementUrl == managementUrl &&
      other.store == store &&
      other.isConfirmedByServer == isConfirmedByServer &&
      other.knowsRenewalIntent == knowsRenewalIntent;

  @override
  int get hashCode => Object.hash(
        isPro,
        isInTrial,
        willRenew,
        hasBillingIssue,
        isSandbox,
        expiresAt,
        productIdentifier,
        purchasedFrom,
        managementUrl,
        store,
        isConfirmedByServer,
        knowsRenewalIntent,
      );
}
