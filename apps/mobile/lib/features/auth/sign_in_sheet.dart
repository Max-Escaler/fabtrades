import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/account.dart';
import '../../core/providers.dart';
import 'auth_provider_icons.dart';

/// Shows the sign-in sheet and resolves to true once an account is signed in.
///
/// Redirect-based providers finish in a browser, so this does not wait for the
/// session: it closes when the browser opens and the customer comes back to an
/// app that has already updated via [accountProvider].
Future<bool> presentSignIn(BuildContext context) async {
  final signedIn = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => const SignInSheet(),
  );
  return signedIn ?? false;
}

/// Why an account is worth having, then one button per provider.
///
/// Signing in is never required to use FAB Trades — it exists to sync a binder
/// across devices — so this is always a sheet the customer can dismiss, never a
/// wall in front of the app.
class SignInSheet extends ConsumerStatefulWidget {
  const SignInSheet({super.key});

  @override
  ConsumerState<SignInSheet> createState() => _SignInSheetState();
}

class _SignInSheetState extends ConsumerState<SignInSheet> {
  AuthProviderKind? _busy;
  String? _error;

  Future<void> _signIn(AuthProviderKind provider) async {
    setState(() {
      _busy = provider;
      _error = null;
    });

    final outcome = await ref.read(authRepositoryProvider).signIn(provider);
    if (!mounted) return;

    switch (outcome) {
      // Both count as done here. Pending means a browser is open, and leaving
      // the sheet up behind it would greet the customer with a stale spinner.
      case SignInSucceeded():
      case SignInPending():
        Navigator.of(context).pop(true);
      case SignInCancelled():
        setState(() => _busy = null);
      case SignInFailed(:final message):
        setState(() {
          _busy = null;
          _error = message;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final providers = ref.watch(authProvidersProvider);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 4, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Sync your collection', style: theme.textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              'Sign in to keep your binder, want list, and trade history on '
              'every device you use. Everything already on this device is kept.',
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            ...switch (providers) {
              AsyncData(:final value) => [
                  for (final provider in value) ...[
                    _ProviderButton(
                      provider: provider,
                      busy: _busy == provider,
                      // One sign-in at a time: two open browser handoffs would
                      // race to write the session.
                      onPressed: _busy == null
                          ? () => _signIn(provider)
                          : null,
                    ),
                    const SizedBox(height: 10),
                  ],
                ],
              AsyncError() => [
                  Text(
                    "Couldn't load sign-in options.",
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(color: theme.colorScheme.error),
                  ),
                ],
              _ => [
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: CircularProgressIndicator(),
                    ),
                  ),
                ],
            },
            ?_errorText(theme),
            const SizedBox(height: 8),
            Text(
              'We only ever read your name, email, and avatar.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }

  Widget? _errorText(ThemeData theme) {
    final error = _error;
    if (error == null) return null;
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, size: 16, color: theme.colorScheme.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              error,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.error),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProviderButton extends StatelessWidget {
  const _ProviderButton({
    required this.provider,
    required this.busy,
    required this.onPressed,
  });

  final AuthProviderKind provider;
  final bool busy;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: busy
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : authProviderIcon(provider, size: 20),
        label: Text('Continue with ${provider.label}'),
      ),
    );
  }
}
