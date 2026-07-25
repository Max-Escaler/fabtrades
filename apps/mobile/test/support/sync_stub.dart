import 'package:fabtrades/core/providers.dart';

/// A [SyncNotifier] that reports a fixed status and never talks to Supabase.
///
/// The real notifier starts a sync the moment an account appears, which under
/// `flutter test` means reaching for a Supabase client that was never initialized.
/// It catches that and reports a sync failure — correct in production, but it would
/// leave every signed-in widget test asserting around an error message it never
/// meant to exercise.
class StubSyncNotifier extends SyncNotifier {
  StubSyncNotifier([this.initial = const SyncStatus()]);

  final SyncStatus initial;

  /// Accounts that [sync] was asked to reconcile, in order.
  final requested = <String>[];

  @override
  SyncStatus build() => initial;

  @override
  Future<void> sync(String userId) async {
    requested.add(userId);
  }
}
