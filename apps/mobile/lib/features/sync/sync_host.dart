import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';

/// Keeps cloud sync running for as long as the app is on screen.
///
/// [syncProvider] starts a sync when an account appears, but a provider nobody
/// watches is never built. This host is that watcher, mounted above the tabs so
/// sync does not depend on the customer visiting a particular screen.
///
/// It also surfaces failures, once each, as a snack bar. A sync failure is not an
/// error state: every screen still renders from the local cache, so this is a note
/// beside the data rather than in place of it.
class SyncHost extends ConsumerStatefulWidget {
  const SyncHost({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<SyncHost> createState() => _SyncHostState();
}

class _SyncHostState extends ConsumerState<SyncHost> {
  String? _reported;

  @override
  Widget build(BuildContext context) {
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

    return widget.child;
  }
}
