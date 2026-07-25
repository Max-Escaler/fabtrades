import 'package:fabtrades/core/models/subscription_status.dart';
import 'package:fabtrades/core/providers.dart';
import 'package:fabtrades/features/paywall/pro_gate.dart';
import 'package:fabtrades/features/settings/settings_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/harness.dart';

/// Serves a fixed entitlement state, standing in for the RevenueCat SDK (whose
/// method channels don't exist under `flutter test`).
class _FakeSubscription extends SubscriptionNotifier {
  _FakeSubscription(this.status);

  final SubscriptionStatus status;

  @override
  Future<SubscriptionStatus> build() async => status;
}

Future<ProviderContainer> _pumpSettings(
  WidgetTester tester, {
  required SubscriptionStatus status,
  bool purchasesAvailable = true,
}) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final cards = MockCardRepository();
  when(() => cards.fetchAll()).thenAnswer((_) async => []);

  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      cardRepositoryProvider.overrideWithValue(cards),
      purchasesAvailableProvider.overrideWithValue(purchasesAvailable),
      subscriptionProvider.overrideWith(() => _FakeSubscription(status)),
      // Prices would otherwise come from the store.
      proOfferingProvider.overrideWith((ref) async => null),
    ],
  );
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: const MaterialApp(home: SettingsScreen()),
    ),
  );
  await tester.pumpAndSettle();
  return container;
}

void main() {
  testWidgets('offers an upgrade when the customer has no entitlement',
      (tester) async {
    final container =
        await _pumpSettings(tester, status: SubscriptionStatus.free);

    expect(container.read(isProProvider), isFalse);
    expect(find.text('SUBSCRIPTION'), findsOneWidget);
    expect(find.text('See plans'), findsOneWidget);
    expect(find.text('Restore purchases'), findsOneWidget);
    expect(find.text('Manage subscription'), findsNothing);
  });

  testWidgets('shows renewal date and Customer Center for a subscriber',
      (tester) async {
    final container = await _pumpSettings(
      tester,
      status: SubscriptionStatus(
        isPro: true,
        willRenew: true,
        expiresAt: DateTime(2027, 3, 14),
        productIdentifier: 'yearly',
      ),
    );

    expect(container.read(isProProvider), isTrue);
    expect(find.text('Renews Mar 14, 2027.'), findsOneWidget);
    expect(find.text('Manage subscription'), findsOneWidget);
    expect(find.byType(ProBadge), findsOneWidget);
    expect(find.text('See plans'), findsNothing);
  });

  testWidgets('warns a subscriber whose payment failed', (tester) async {
    await _pumpSettings(
      tester,
      status: SubscriptionStatus(
        isPro: true,
        willRenew: true,
        hasBillingIssue: true,
        expiresAt: DateTime(2027, 3, 14),
      ),
    );

    expect(
      find.textContaining('problem with your last payment'),
      findsOneWidget,
    );
  });

  testWidgets('says access ends, not renews, after a cancellation',
      (tester) async {
    await _pumpSettings(
      tester,
      status: SubscriptionStatus(
        isPro: true,
        willRenew: false,
        expiresAt: DateTime(2027, 3, 14),
      ),
    );

    expect(find.text('Access ends Mar 14, 2027.'), findsOneWidget);
  });

  testWidgets('hides subscription UI entirely when RevenueCat is unconfigured',
      (tester) async {
    await _pumpSettings(
      tester,
      status: SubscriptionStatus.free,
      purchasesAvailable: false,
    );

    expect(find.text('SUBSCRIPTION'), findsNothing);
    expect(find.text('See plans'), findsNothing);
    // The rest of Settings is unaffected.
    expect(find.text('PRICE SOURCE'), findsOneWidget);
  });
}
