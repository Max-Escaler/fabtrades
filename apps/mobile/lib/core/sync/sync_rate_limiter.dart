/// Cooldowns for opportunistic binder syncs.
///
/// Full reconciles are relatively expensive (pull every collection, merge, push).
/// Mutation and pull-to-refresh triggers share this gate so rapid adds or
/// repeated swipes cannot stampede Supabase. Explicit Settings "Sync now" and
/// sign-in syncs bypass these cooldowns (they call [markAll] after running so
/// opportunistic syncs still back off afterward).
class SyncRateLimiter {
  SyncRateLimiter({DateTime Function()? clock}) : _clock = clock ?? DateTime.now;

  final DateTime Function() _clock;

  /// Minimum gap between syncs kicked off by a binder/want-list write.
  static const Duration mutationCooldown = Duration(seconds: 3);

  /// Minimum gap between Binder pull-to-refresh syncs.
  static const Duration pullCooldown = Duration(seconds: 8);

  DateTime? _lastMutation;
  DateTime? _lastPull;

  /// Time left before another mutation-triggered sync may start.
  Duration mutationWait() => _wait(_lastMutation, mutationCooldown);

  /// Time left before another pull-to-refresh sync may start.
  Duration pullWait() => _wait(_lastPull, pullCooldown);

  void markMutation() => _lastMutation = _clock();

  void markPull() => _lastPull = _clock();

  /// After a user-initiated or sign-in sync — quiet both opportunistic paths.
  void markAll() {
    final now = _clock();
    _lastMutation = now;
    _lastPull = now;
  }

  Duration _wait(DateTime? last, Duration cooldown) {
    if (last == null) return Duration.zero;
    final elapsed = _clock().difference(last);
    if (elapsed >= cooldown) return Duration.zero;
    return cooldown - elapsed;
  }
}

/// Outcome of a Binder pull-to-refresh attempt.
enum PullSyncResult {
  /// A sync ran (succeeded or failed — check [SyncStatus.error]).
  completed,

  /// Another sync is already in flight.
  alreadySyncing,

  /// Too soon since the last pull-to-refresh (or a full sync that marked pull).
  rateLimited,
}
