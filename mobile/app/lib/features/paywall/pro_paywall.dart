import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

import '../../core/config/revenuecat_config.dart';
import '../../core/models/purchase_outcome.dart';
import '../../core/providers.dart';

/// Presentation helpers for RevenueCat's remotely-configured UI.
///
/// The paywall and Customer Center are both native views driven entirely by the
/// RevenueCat dashboard, so pricing, copy, layout, A/B tests and retention
/// offers all change without an app release. Everything here funnels through
/// these two functions so behaviour stays consistent wherever Pro is offered.

/// Shows the paywall for the current offering and returns true if the customer
/// has Pro when it closes.
///
/// [onlyIfNeeded] uses `presentPaywallIfNeeded`, which skips presentation
/// entirely for customers who already have the entitlement — the right default
/// for an "unlock this feature" tap. Pass false for an explicit "see plans"
/// action, where showing the paywall regardless is expected.
///
/// [offering] overrides which offering is shown; leave it null to use the one
/// marked **Current** in the dashboard so offerings can be swapped remotely.
Future<bool> presentProPaywall(
  BuildContext context,
  WidgetRef ref, {
  Offering? offering,
  bool onlyIfNeeded = true,
}) async {
  if (!ref.read(purchasesAvailableProvider)) {
    _showMessage(context, 'Subscriptions are unavailable in this build.');
    return ref.read(isProProvider);
  }

  final PaywallResult result;
  try {
    result = onlyIfNeeded
        ? await RevenueCatUI.presentPaywallIfNeeded(
            RevenueCatConfig.proEntitlement,
            offering: offering,
          )
        : await RevenueCatUI.presentPaywall(offering: offering);
  } catch (e) {
    debugPrint('RevenueCat: failed to present paywall — $e');
    if (context.mounted) {
      _showMessage(context, "Couldn't open FABTrades Pro. Please try again.");
    }
    return ref.read(isProProvider);
  }

  // The paywall purchases through the native SDK, so pull the entitlement back
  // into Riverpod. The customer info listener usually beats us to it; this
  // makes the state correct before we return either way.
  await ref.read(subscriptionProvider.notifier).refresh();
  final isPro = ref.read(isProProvider);

  if (!context.mounted) return isPro;
  switch (result) {
    case PaywallResult.purchased:
      _showMessage(context, "You're on FABTrades Pro — thanks for the support!");
    case PaywallResult.restored:
      _showMessage(context, 'Purchases restored.');
    case PaywallResult.error:
      _showMessage(context, "Couldn't complete that purchase. Please try again.");
    case PaywallResult.cancelled:
    case PaywallResult.notPresented:
      // Nothing to say: the customer either backed out, or already had Pro.
      break;
  }
  return isPro;
}

/// Opens the RevenueCat [Customer Center][cc] — the self-service screen for
/// cancelling, changing plans, requesting refunds (iOS) and recovering missing
/// purchases.
///
/// Worth routing support requests through: its cancellation and refund paths
/// can present retention offers configured in the dashboard, so churn attempts
/// get one chance to convert before reaching the store.
///
/// [cc]: https://www.revenuecat.com/docs/tools/customer-center
Future<void> presentProCustomerCenter(
  BuildContext context,
  WidgetRef ref,
) async {
  if (!ref.read(purchasesAvailableProvider)) {
    _showMessage(context, 'Subscriptions are unavailable in this build.');
    return;
  }

  final subscription = ref.read(subscriptionProvider.notifier);
  try {
    await RevenueCatUI.presentCustomerCenter(
      // Restores and promotional-offer redemptions both change entitlements
      // while the native view is still on screen.
      onRestoreCompleted: (_) => subscription.refresh(),
      onPromotionalOfferSucceeded: (_, _, _) => subscription.refresh(),
      onManagementOptionSelected: (option, _) {
        debugPrint('Customer Center: selected "$option"');
      },
    );
  } catch (e) {
    debugPrint('RevenueCat: failed to present customer center — $e');
    if (context.mounted) {
      _showMessage(context, "Couldn't open subscription settings.");
    }
    return;
  }

  // Cancellations and plan changes are only reflected once the sheet closes.
  await subscription.refresh();
}

/// Restores purchases and reports the outcome.
///
/// Required by App Review for anything non-consumable, and the fix for the most
/// common support ticket a no-account app gets: "I paid on my old phone."
Future<bool> restoreProPurchases(BuildContext context, WidgetRef ref) async {
  if (!ref.read(purchasesAvailableProvider)) {
    _showMessage(context, 'Subscriptions are unavailable in this build.');
    return false;
  }

  final outcome = await ref.read(subscriptionProvider.notifier).restore();
  final isPro = ref.read(isProProvider);
  if (!context.mounted) return isPro;

  switch (outcome) {
    case RestoreSuccess():
      _showMessage(
        context,
        isPro
            ? 'FABTrades Pro restored.'
            : 'No previous purchases found on this store account.',
      );
    case RestoreFailure(:final message):
      _showMessage(context, message);
  }
  return isPro;
}

void _showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 3)),
    );
}
