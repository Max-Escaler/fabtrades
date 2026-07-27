import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../onboarding/onboarding_provider.dart';

/// Keeps the account's background work running for as long as the app is on
/// screen: cloud sync, and binding RevenueCat's identity to the Supabase user.
///
/// Both start themselves when an account appears, but a provider nobody watches
/// is never built. This host is that watcher, mounted above the tabs so neither
/// depends on the customer visiting a particular screen.
///
/// It also surfaces sync failures, once each, as a snack bar. A sync failure is
/// not an error state: every screen still renders from the local cache, so this is
/// a note beside the data rather than in place of it.
class SyncHost extends ConsumerStatefulWidget {
  const SyncHost({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<SyncHost> createState() => _SyncHostState();
}

class _SyncHostState extends ConsumerState<SyncHost> {
  String? _reported;
  DateTime? _lastSuppressedAt;

  @override
  Widget build(BuildContext context) {
    // Watched for its side effect only. Purchases made before this binding lands
    // are attributed to an anonymous id the server cannot key a row on.
    ref.watch(purchasesIdentityProvider);

    final status = ref.watch(syncProvider);
    final error = status.error;

    if (error != null && error != _reported) {
      _reported = error;
      // Deferred because build must not push UI, and the messenger belongs to a
      // Scaffold that is mounted below this host.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(content: Text(error), duration: const Duration(seconds: 6)),
        );
      });
    } else if (error == null) {
      // Cleared so a later failure is reported again rather than swallowed as a
      // repeat of this one.
      _reported = null;
    }

    // An account that just pulled down a stocked binder is not a new user —
    // suppress every tour so we don't coach them through empty-state tips.
    final syncedAt = status.lastSyncedAt;
    if (syncedAt != null &&
        syncedAt != _lastSuppressedAt &&
        !status.isSyncing &&
        error == null) {
      _lastSuppressedAt = syncedAt;
      // Deferred: binderProvider needs SharedPreferences, and reading providers
      // that rebuild during build is a Riverpod footgun.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final hasBinderCards =
            ref.read(binderProvider).any((e) => !e.isWanted && e.quantity > 0);
        if (hasBinderCards) {
          ref.read(onboardingProvider.notifier).markAllSeen();
        }
      });
    }

    return widget.child;
  }
}
