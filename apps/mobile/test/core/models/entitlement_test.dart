import 'package:fabtrades/core/models/entitlement.dart';
import 'package:fabtrades/core/models/subscription_status.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

final _expiry = DateTime.utc(2026, 8, 20);

SubscriptionStatus _device({
  bool isPro = true,
  bool willRenew = true,
  bool isInTrial = false,
  bool hasBillingIssue = false,
  bool isSandbox = false,
  bool lifetime = false,
  String? productIdentifier = 'com.fabtrades.app.pro.yearly',
  String? managementUrl = 'https://apps.apple.com/account/subscriptions',
}) =>
    SubscriptionStatus(
      isPro: isPro,
      willRenew: willRenew,
      isInTrial: isInTrial,
      hasBillingIssue: hasBillingIssue,
      isSandbox: isSandbox,
      expiresAt: lifetime ? null : _expiry,
      productIdentifier: productIdentifier,
      store: Store.appStore,
      managementUrl: managementUrl,
    );

ServerEntitlement _server({
  bool isActive = true,
  bool isTrialing = false,
  bool inGracePeriod = false,
  String? source = 'play_store',
  String? productId = 'pro_yearly',
  DateTime? expiresAt,
  bool isSandbox = false,
}) =>
    ServerEntitlement(
      isActive: isActive,
      isTrialing: isTrialing,
      inGracePeriod: inGracePeriod,
      source: source,
      productId: productId,
      expiresAt: expiresAt ?? _expiry,
      isSandbox: isSandbox,
    );

void main() {
  group('Entitlement.resolve', () {
    test('grants Pro when both sources agree', () {
      final entitlement = Entitlement.resolve(
        device: _device(),
        server: _server(),
      );

      expect(entitlement.isPro, isTrue);
      expect(entitlement.isConfirmedByServer, isTrue);
      expect(entitlement.knowsRenewalIntent, isTrue);
    });

    test('withholds Pro when neither source grants it', () {
      final entitlement = Entitlement.resolve(
        device: SubscriptionStatus.free,
        server: _server(isActive: false),
      );

      expect(entitlement.isPro, isFalse);
      expect(entitlement.isConfirmedByServer, isFalse);
    });

    test('grants Pro on the strength of the device alone', () {
      // The webhook lands a second or two after the purchase. Waiting for it
      // would mean staring at a paywall you just paid to dismiss.
      final entitlement = Entitlement.resolve(device: _device(), server: null);

      expect(entitlement.isPro, isTrue);
      expect(entitlement.isConfirmedByServer, isFalse);
      expect(entitlement.willRenew, isTrue);
    });

    test('grants Pro on the strength of the server alone', () {
      // Bought on the other platform: this device's store account never saw the
      // transaction, so only the row knows about it.
      final entitlement = Entitlement.resolve(
        device: SubscriptionStatus.free,
        server: _server(),
      );

      expect(entitlement.isPro, isTrue);
      expect(entitlement.isConfirmedByServer, isTrue);
      expect(entitlement.productIdentifier, 'pro_yearly');
      expect(entitlement.purchasedFrom, 'Google Play');
    });

    test('does not claim to know whether a remote purchase renews', () {
      final entitlement = Entitlement.resolve(
        device: SubscriptionStatus.free,
        server: _server(),
      );

      // The row records an expiry but not renewal intent. Reporting `willRenew`
      // false would tell a paying subscriber their access is ending.
      expect(entitlement.knowsRenewalIntent, isFalse);
      expect(entitlement.isExpiring, isFalse);
    });

    test('reports an expiring subscription only from the device', () {
      final entitlement = Entitlement.resolve(
        device: _device(willRenew: false),
        server: _server(),
      );

      expect(entitlement.isExpiring, isTrue);
      expect(entitlement.expiresAt, _expiry);
    });

    test('keeps the device renewal detail the server row does not carry', () {
      final entitlement = Entitlement.resolve(
        device: _device(),
        server: _server(productId: 'pro_monthly'),
      );

      // Product id comes from the device when it has one: it names what *this*
      // store account is being billed for, which is what the customer manages.
      expect(entitlement.productIdentifier, 'com.fabtrades.app.pro.yearly');
      expect(entitlement.managementUrl, isNotNull);
    });

    test('takes a trial flag from whichever source noticed it', () {
      expect(
        Entitlement.resolve(device: _device(isInTrial: true), server: _server())
            .isInTrial,
        isTrue,
      );
      expect(
        Entitlement.resolve(device: _device(), server: _server(isTrialing: true))
            .isInTrial,
        isTrue,
      );
    });

    test('takes a billing problem from whichever source noticed it', () {
      // The device sees a failed payment immediately; the server learns about the
      // grace period from the webhook. Either is reason enough to warn.
      expect(
        Entitlement.resolve(
          device: _device(hasBillingIssue: true),
          server: _server(),
        ).hasBillingIssue,
        isTrue,
      );
      expect(
        Entitlement.resolve(
          device: _device(),
          server: _server(inGracePeriod: true),
        ).hasBillingIssue,
        isTrue,
      );
    });

    test('flags a sandbox purchase from either source', () {
      expect(
        Entitlement.resolve(device: _device(isSandbox: true), server: null)
            .isSandbox,
        isTrue,
      );
      expect(
        Entitlement.resolve(
          device: SubscriptionStatus.free,
          server: _server(isSandbox: true),
        ).isSandbox,
        isTrue,
      );
    });

    test('treats a missing expiry as lifetime access', () {
      final entitlement = Entitlement.resolve(
        device: _device(lifetime: true),
        server: null,
      );

      expect(entitlement.isLifetime, isTrue);
      expect(entitlement.isExpiring, isFalse);
    });

    test('keeps the management link after access lapses', () {
      // Somebody who let their subscription run out still needs a way back to
      // their store subscriptions to resubscribe.
      final entitlement = Entitlement.resolve(
        device: _device(isPro: false),
        server: null,
      );

      expect(entitlement.isPro, isFalse);
      expect(entitlement.managementUrl, isNotNull);
    });

    test('signed out resolves to whatever the device knows', () {
      // `server` is null while signed out, which must not revoke a purchase made
      // on this device before signing in.
      expect(
        Entitlement.resolve(device: _device(), server: null).isPro,
        isTrue,
      );
      expect(
        Entitlement.resolve(device: SubscriptionStatus.free, server: null).isPro,
        isFalse,
      );
    });
  });

  group('ServerEntitlement.fromJson', () {
    test('reads a full row', () {
      final server = ServerEntitlement.fromJson({
        'user_id': '9f1c0b62-0000-4000-8000-000000000001',
        'tier': 'pro',
        'is_active': true,
        'is_trialing': false,
        'in_grace_period': true,
        'source': 'app_store',
        'product_id': 'com.fabtrades.app.pro.monthly',
        'expires_at': '2026-08-20T00:00:00+00:00',
        'is_sandbox': true,
      });

      expect(server.isActive, isTrue);
      expect(server.inGracePeriod, isTrue);
      expect(server.source, 'app_store');
      expect(server.expiresAt, _expiry.toLocal());
      expect(server.isSandbox, isTrue);
    });

    test('tolerates nulls and missing keys', () {
      // A free-tier row has almost nothing in it, and a column added later would
      // be absent from an older client's expectations either way.
      final server = ServerEntitlement.fromJson({'is_active': false});

      expect(server.isActive, isFalse);
      expect(server.isTrialing, isFalse);
      expect(server.source, isNull);
      expect(server.expiresAt, isNull);
      expect(server.sourceLabel, isNull);
    });

    test('names each store in a way worth showing a customer', () {
      String? labelFor(String? source) =>
          ServerEntitlement(isActive: true, source: source).sourceLabel;

      expect(labelFor('app_store'), 'the App Store');
      expect(labelFor('play_store'), 'Google Play');
      expect(labelFor('stripe'), 'the web');
      expect(labelFor('promo'), 'a complimentary grant');
      // Better to say nothing than to show a customer a column value.
      expect(labelFor('amazon'), isNull);
      expect(labelFor(null), isNull);
    });
  });
}