import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../../core/logic/free_limits.dart';
import '../../core/logic/pro_packages.dart';
import '../../core/models/subscription_status.dart';
import '../../core/providers.dart';
import '../paywall/pro_gate.dart';
import '../paywall/pro_paywall.dart';
import 'settings_screen.dart' show SettingsSectionLabel;

/// Subscription block in Settings: current status, and the entry points to the
/// paywall, the Customer Center and restore.
///
/// Hides itself entirely on builds without a RevenueCat API key, so nothing
/// offers a purchase that can't complete.
class SubscriptionSection extends ConsumerWidget {
  const SubscriptionSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.watch(purchasesAvailableProvider)) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SettingsSectionLabel('Subscription'),
        const SizedBox(height: 8),
        ref.watch(subscriptionProvider).when(
              data: (status) => status.isPro
                  ? _ProStatusCard(status: status)
                  : const _UpgradeCard(),
              loading: () => const _StatusPlaceholder(),
              error: (_, _) => const _StatusUnavailable(),
            ),
        const SizedBox(height: 28),
      ],
    );
  }
}

/// Active subscriber: what they're on, when it renews, and one button into the
/// Customer Center for everything else.
class _ProStatusCard extends ConsumerWidget {
  const _ProStatusCard({required this.status});

  final SubscriptionStatus status;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.workspace_premium,
                        color: theme.colorScheme.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text('FABTrades Pro',
                          style: theme.textTheme.titleMedium),
                    ),
                    const ProBadge(),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _renewalLabel(status),
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
                if (status.hasBillingIssue) ...[
                  const SizedBox(height: 10),
                  _Notice(
                    icon: Icons.error_outline,
                    color: theme.colorScheme.error,
                    text: 'There was a problem with your last payment. Update '
                        'your payment method to keep Pro.',
                  ),
                ],
                if (status.isSandbox) ...[
                  const SizedBox(height: 10),
                  _Notice(
                    icon: Icons.science_outlined,
                    color: theme.colorScheme.onSurfaceVariant,
                    text: 'Test purchase — this subscription is not real.',
                  ),
                ],
              ],
            ),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.manage_accounts_outlined),
            title: const Text('Manage subscription'),
            subtitle: const Text('Change plan, cancel, or get help'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => presentProCustomerCenter(context, ref),
          ),
        ],
      ),
    );
  }

  static String _renewalLabel(SubscriptionStatus status) {
    if (status.isLifetime) return 'Lifetime access.';
    final date = DateFormat.yMMMd().format(status.expiresAt!);
    if (status.isInTrial) {
      return status.willRenew
          ? 'Free trial — first payment on $date.'
          : 'Free trial — ends $date.';
    }
    return status.willRenew ? 'Renews $date.' : 'Access ends $date.';
  }
}

/// Non-subscriber: the pitch, live prices from the offering, and restore.
class _UpgradeCard extends ConsumerStatefulWidget {
  const _UpgradeCard();

  @override
  ConsumerState<_UpgradeCard> createState() => _UpgradeCardState();
}

class _UpgradeCardState extends ConsumerState<_UpgradeCard> {
  bool _restoring = false;

  Future<void> _restore() async {
    setState(() => _restoring = true);
    try {
      await restoreProPurchases(context, ref);
    } finally {
      if (mounted) setState(() => _restoring = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final priceLabel = ref.watch(proOfferingProvider).maybeWhen(
          data: _priceLabel,
          orElse: () => null,
        );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.workspace_premium,
                    color: theme.colorScheme.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('FABTrades Pro',
                      style: theme.textTheme.titleMedium),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Support development and unlock the Pro features. '
              'Monthly or yearly, cancel any time.',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            if (priceLabel != null) ...[
              const SizedBox(height: 10),
              Text(priceLabel, style: theme.textTheme.labelLarge),
            ],
            // Only shown once a cap is actually in sight — a usage readout at
            // 3 of 50 cards is noise, and reads as nagging.
            ?_usageLine(context, ref.watch(freeUsageProvider)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                // onlyIfNeeded: false — this is an explicit "see plans" tap, so
                // show the paywall even in the rare case the entitlement is
                // mid-sync.
                onPressed: () =>
                    presentProPaywall(context, ref, onlyIfNeeded: false),
                child: const Text('See plans'),
              ),
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: _restoring ? null : _restore,
                child: Text(
                  _restoring ? 'Restoring…' : 'Restore purchases',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget? _usageLine(BuildContext context, FreeUsage? usage) {
    if (usage == null || !usage.isNearAnyLimit) return null;
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Text(
        'Free plan · binder ${usage.binderCards}/${FreeLimits.binderCards} · '
        'want list ${usage.wantListCards}/${FreeLimits.wantListCards} · '
        'trades ${usage.savedTrades}/${FreeLimits.savedTrades}',
        style: theme.textTheme.bodySmall
            ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
      ),
    );
  }

  /// Prices straight from the store, so currency and formatting are always
  /// right for the customer's region.
  static String? _priceLabel(Offering? offering) {
    if (offering == null) return null;
    final monthly = offering.monthlyPackage?.storeProduct.priceString;
    final yearly = offering.yearlyPackage?.storeProduct.priceString;
    final parts = [
      if (monthly != null) '$monthly / month',
      if (yearly != null) '$yearly / year',
    ];
    if (parts.isEmpty) return null;

    final saving = yearlySavingPercent(offering);
    final label = parts.join('  ·  ');
    return saving == null ? label : '$label  ·  save $saving% yearly';
  }
}

class _StatusPlaceholder extends StatelessWidget {
  const _StatusPlaceholder();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: ListTile(
        leading: SizedBox(
          width: 24,
          height: 24,
          child: Center(
            child: SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ),
        title: Text('FABTrades Pro'),
        subtitle: Text('Checking your subscription…'),
      ),
    );
  }
}

/// Entitlements couldn't be read — offer a retry rather than silently claiming
/// the customer is on the free tier.
class _StatusUnavailable extends ConsumerWidget {
  const _StatusUnavailable();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.cloud_off_outlined),
        title: const Text('FABTrades Pro'),
        subtitle: const Text("Couldn't check your subscription."),
        trailing: TextButton(
          onPressed: () => ref.invalidate(subscriptionProvider),
          child: const Text('Retry'),
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.color, required this.text});

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: color),
          ),
        ),
      ],
    );
  }
}
