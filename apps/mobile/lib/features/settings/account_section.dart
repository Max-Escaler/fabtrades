import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/account.dart';
import '../../core/providers.dart';
import '../auth/sign_in_sheet.dart';
import 'settings_screen.dart' show SettingsSectionLabel;

/// Account block in Settings: who is signed in, or an invitation to sign in.
///
/// Sign-in is optional in FAB Trades, so this never nags. It states what an
/// account buys you once, and otherwise stays out of the way.
class AccountSection extends ConsumerWidget {
  const AccountSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SettingsSectionLabel('Account'),
        const SizedBox(height: 8),
        ref.watch(accountProvider).when(
              data: (account) => account == null
                  ? const _SignedOutCard()
                  : _SignedInCard(account: account),
              loading: () => const _AccountPlaceholder(),
              error: (_, _) => const _SignedOutCard(),
            ),
        const SizedBox(height: 28),
      ],
    );
  }
}

class _SignedInCard extends ConsumerWidget {
  const _SignedInCard({required this.account});

  final Account account;

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text(
          'Your collection stays on this device. Sign back in any time to keep '
          'it in sync.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(authRepositoryProvider).signOut();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      child: Column(
        children: [
          ListTile(
            leading: _Avatar(account: account),
            title: Text(account.label),
            subtitle: Text(
              _subtitle(account),
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sign out'),
            onTap: () => _signOut(context, ref),
          ),
        ],
      ),
    );
  }

  static String _subtitle(Account account) {
    final provider = account.provider?.label;
    final email = account.email;
    // Apple's Hide My Email accounts can have neither a useful name nor an
    // address worth showing, so fall back to just the provider.
    if (email != null && email.isNotEmpty) {
      return provider == null ? email : '$email · $provider';
    }
    return provider == null ? 'Signed in' : 'Signed in with $provider';
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.account});

  final Account account;

  @override
  Widget build(BuildContext context) {
    final url = account.avatarUrl;
    return CircleAvatar(
      foregroundImage: url == null ? null : NetworkImage(url),
      child: Text(account.initials),
    );
  }
}

class _SignedOutCard extends ConsumerWidget {
  const _SignedOutCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.cloud_sync_outlined,
                    color: theme.colorScheme.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('Sync across devices',
                      style: theme.textTheme.titleMedium),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Sign in to back up your binder, want list, and trade history. '
              'FAB Trades works fine without an account.',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => presentSignIn(context),
                child: const Text('Sign in'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountPlaceholder extends StatelessWidget {
  const _AccountPlaceholder();

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
        title: Text('Account'),
        subtitle: Text('Checking your session…'),
      ),
    );
  }
}
