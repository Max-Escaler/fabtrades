import 'package:fabtrades/core/config/revenuecat_config.dart';
import 'package:fabtrades/core/models/subscription_status.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

/// Builds a [CustomerInfo] carrying a single `FABTrades Pro` entitlement.
/// Pass null for [entitlement] to model a customer who never subscribed.
CustomerInfo _customerInfo({
  EntitlementInfo? entitlement,
  String? managementUrl,
}) {
  final all = {RevenueCatConfig.proEntitlement: ?entitlement};
  return CustomerInfo(
    EntitlementInfos(
      all,
      {
        for (final e in all.entries)
          if (e.value.isActive) e.key: e.value,
      },
    ),
    const {},
    const [],
    const [],
    const [],
    '2026-01-01T00:00:00Z',
    'anonymous-id',
    const {},
    '2026-07-25T00:00:00Z',
    managementURL: managementUrl,
  );
}

EntitlementInfo _entitlement({
  bool isActive = true,
  bool willRenew = true,
  String? expirationDate = '2027-07-25T00:00:00Z',
  PeriodType periodType = PeriodType.normal,
  String? billingIssueDetectedAt,
  bool isSandbox = false,
  String productIdentifier = 'com.fabtrades.app.pro.yearly',
}) =>
    EntitlementInfo(
      RevenueCatConfig.proEntitlement,
      isActive,
      willRenew,
      '2026-07-25T00:00:00Z',
      '2026-07-25T00:00:00Z',
      productIdentifier,
      isSandbox,
      periodType: periodType,
      expirationDate: expirationDate,
      billingIssueDetectedAt: billingIssueDetectedAt,
      store: Store.appStore,
    );

void main() {
  group('SubscriptionStatus.fromCustomerInfo', () {
    test('grants Pro for an active entitlement', () {
      final status = SubscriptionStatus.fromCustomerInfo(
        _customerInfo(entitlement: _entitlement()),
      );

      expect(status.isPro, isTrue);
      expect(status.willRenew, isTrue);
      expect(status.productIdentifier, 'com.fabtrades.app.pro.yearly');
      expect(status.expiresAt, DateTime.utc(2027, 7, 25).toLocal());
    });

    test('withholds Pro when the entitlement is missing', () {
      final status = SubscriptionStatus.fromCustomerInfo(_customerInfo());

      expect(status.isPro, isFalse);
      expect(status.expiresAt, isNull);
    });

    test('withholds Pro once the entitlement lapses', () {
      final status = SubscriptionStatus.fromCustomerInfo(
        _customerInfo(
          entitlement: _entitlement(isActive: false, willRenew: false),
        ),
      );

      expect(status.isPro, isFalse);
    });

    test('reports a cancelled-but-current subscription as expiring', () {
      final status = SubscriptionStatus.fromCustomerInfo(
        _customerInfo(entitlement: _entitlement(willRenew: false)),
      );

      expect(status.isPro, isTrue);
      expect(status.isExpiring, isTrue);
      expect(status.isLifetime, isFalse);
    });

    test('treats a null expiration as lifetime access', () {
      final status = SubscriptionStatus.fromCustomerInfo(
        _customerInfo(entitlement: _entitlement(expirationDate: null)),
      );

      expect(status.isLifetime, isTrue);
      expect(status.isExpiring, isFalse);
    });

    test('flags trials', () {
      final status = SubscriptionStatus.fromCustomerInfo(
        _customerInfo(
          entitlement: _entitlement(periodType: PeriodType.trial),
        ),
      );

      expect(status.isPro, isTrue);
      expect(status.isInTrial, isTrue);
    });

    test('flags a billing issue while access is still granted', () {
      final status = SubscriptionStatus.fromCustomerInfo(
        _customerInfo(
          entitlement: _entitlement(
            billingIssueDetectedAt: '2026-07-20T00:00:00Z',
          ),
        ),
      );

      expect(status.isPro, isTrue);
      expect(status.hasBillingIssue, isTrue);
    });

    test('drops the billing-issue flag once access has lapsed', () {
      final status = SubscriptionStatus.fromCustomerInfo(
        _customerInfo(
          entitlement: _entitlement(
            isActive: false,
            billingIssueDetectedAt: '2026-07-20T00:00:00Z',
          ),
        ),
      );

      expect(status.hasBillingIssue, isFalse);
    });

    test('marks Test Store / sandbox purchases', () {
      final status = SubscriptionStatus.fromCustomerInfo(
        _customerInfo(entitlement: _entitlement(isSandbox: true)),
      );

      expect(status.isSandbox, isTrue);
    });

    test('carries the store management URL through', () {
      final status = SubscriptionStatus.fromCustomerInfo(
        _customerInfo(
          entitlement: _entitlement(),
          managementUrl: 'https://apps.apple.com/account/subscriptions',
        ),
      );

      expect(
        status.managementUrl,
        'https://apps.apple.com/account/subscriptions',
      );
    });
  });

  test('SubscriptionStatus.free has no access', () {
    expect(SubscriptionStatus.free.isPro, isFalse);
    expect(SubscriptionStatus.free.isLifetime, isFalse);
  });
}
