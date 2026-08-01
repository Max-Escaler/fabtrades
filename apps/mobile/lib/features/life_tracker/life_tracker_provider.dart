import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'life_tracker_models.dart';
import 'life_tracker_repository.dart';

final lifeTrackerRepositoryProvider = Provider<LifeTrackerRepository>(
  (ref) => LifeTrackerRepository(ref.watch(sharedPreferencesProvider)),
);

class LifeTrackerNotifier extends Notifier<LifeTrackerState> {
  static const settleDelay = Duration(milliseconds: 2500);
  static const tickInterval = Duration(seconds: 1);

  Timer? _youSettle;
  Timer? _opponentSettle;
  Timer? _countdown;

  LifeTrackerRepository get _repo => ref.read(lifeTrackerRepositoryProvider);

  @override
  LifeTrackerState build() {
    ref.onDispose(() {
      _youSettle?.cancel();
      _opponentSettle?.cancel();
      _countdown?.cancel();
    });

    final loaded = ref.watch(lifeTrackerRepositoryProvider).load();
    final restored = _restoreTimer(loaded ?? LifeTrackerState.fresh());
    if (restored.timerRunning) {
      // Schedule after build so state is assigned first.
      Future.microtask(_ensureCountdown);
    }
    return restored;
  }

  /// Apply wall-clock elapsed time when restoring a running timer.
  static LifeTrackerState _restoreTimer(LifeTrackerState s) {
    if (!s.timerRunning || s.timerRunningSince == null) {
      return s.copyWith(timerRunning: false, timerRunningSince: null);
    }
    final elapsed =
        DateTime.now().difference(s.timerRunningSince!).inSeconds;
    final remaining = (s.timerRemainingSeconds - elapsed).clamp(0, 1 << 30);
    if (remaining == 0) {
      return s.copyWith(
        timerRemainingSeconds: 0,
        timerRunning: false,
        timerRunningSince: null,
      );
    }
    return s.copyWith(
      timerRemainingSeconds: remaining,
      timerRunning: true,
      timerRunningSince: DateTime.now(),
    );
  }

  Future<void> _persist() => _repo.save(state);

  void adjustLife({required bool opponent, required int delta}) {
    final player = opponent ? state.opponent : state.you;
    final newLife = (player.life + delta).clamp(0, 1 << 30);
    final applied = newLife - player.life;
    if (applied == 0 && delta < 0 && player.life == 0) {
      // Still restart settle so a pending positive can settle, but no change.
      if (player.pendingDelta == 0) return;
    }

    final nextPending = player.pendingDelta + applied;
    final next = player.copyWith(
      life: newLife,
      pendingDelta: nextPending,
      // lifeBeforePending stays until settle when this is the first change.
      lifeBeforePending: player.pendingDelta == 0
          ? player.life
          : player.lifeBeforePending,
    );

    state = opponent
        ? state.copyWith(opponent: next)
        : state.copyWith(you: next);

    _restartSettle(opponent);
  }

  void _restartSettle(bool opponent) {
    final timer = Timer(settleDelay, () => commitPending(opponent));
    if (opponent) {
      _opponentSettle?.cancel();
      _opponentSettle = timer;
    } else {
      _youSettle?.cancel();
      _youSettle = timer;
    }
  }

  void commitPending(bool opponent) {
    final player = opponent ? state.opponent : state.you;
    if (player.pendingDelta == 0) {
      final cleared = player.copyWith(
        pendingDelta: 0,
        lifeBeforePending: player.life,
      );
      state = opponent
          ? state.copyWith(opponent: cleared)
          : state.copyWith(you: cleared);
      return;
    }

    final delta = player.pendingDelta;
    final from = player.lifeBeforePending;
    final to = player.life;
    final settled = player.copyWith(
      pendingDelta: 0,
      lifeBeforePending: to,
    );

    var history = state.history;
    if (delta != 0) {
      history = [
        ...history,
        LifeChangeEntry(
          isOpponent: opponent,
          from: from,
          to: to,
          delta: delta,
          at: DateTime.now(),
        ),
      ];
    }

    state = opponent
        ? state.copyWith(opponent: settled, history: history)
        : state.copyWith(you: settled, history: history);
    _persist();
  }

  void toggleTimer() {
    if (state.timerRemainingSeconds <= 0 && !state.timerRunning) {
      return;
    }
    if (state.timerRunning) {
      _countdown?.cancel();
      _countdown = null;
      // Snapshot remaining based on wall clock.
      final remaining = _liveRemaining();
      state = state.copyWith(
        timerRemainingSeconds: remaining,
        timerRunning: false,
        timerRunningSince: null,
      );
    } else {
      state = state.copyWith(
        timerRunning: true,
        timerRunningSince: DateTime.now(),
      );
      _ensureCountdown();
    }
    _persist();
  }

  int _liveRemaining() {
    if (!state.timerRunning || state.timerRunningSince == null) {
      return state.timerRemainingSeconds;
    }
    final elapsed =
        DateTime.now().difference(state.timerRunningSince!).inSeconds;
    return (state.timerRemainingSeconds - elapsed).clamp(0, 1 << 30);
  }

  void _ensureCountdown() {
    _countdown?.cancel();
    if (!state.timerRunning) return;
    _countdown = Timer.periodic(tickInterval, (_) => _onTick());
  }

  void _onTick() {
    if (!state.timerRunning) return;
    final remaining = _liveRemaining();
    if (remaining <= 0) {
      _countdown?.cancel();
      _countdown = null;
      state = state.copyWith(
        timerRemainingSeconds: 0,
        timerRunning: false,
        timerRunningSince: null,
      );
      _persist();
      return;
    }
    // Refresh display by rewriting remaining + runningSince so widgets rebuild.
    state = state.copyWith(
      timerRemainingSeconds: remaining,
      timerRunningSince: DateTime.now(),
    );
  }

  void setFormat(LifeFormat format) {
    if (format == state.format) return;
    var you = state.you;
    var opponent = state.opponent;

    // Update default starting life only for players without a hero.
    if (you.config.heroName == null) {
      final cfg =
          you.config.copyWith(startingLife: format.defaultStartingLife);
      you = you.copyWith(config: cfg);
      if (state.isPristine) {
        you = PlayerState.fresh(cfg);
      }
    }
    if (opponent.config.heroName == null) {
      final cfg =
          opponent.config.copyWith(startingLife: format.defaultStartingLife);
      opponent = opponent.copyWith(config: cfg);
      if (state.isPristine) {
        opponent = PlayerState.fresh(cfg);
      }
    }

    _countdown?.cancel();
    _countdown = null;
    state = state.copyWith(
      format: format,
      you: you,
      opponent: opponent,
      timerRemainingSeconds: format.roundSeconds,
      timerRunning: false,
      timerRunningSince: null,
    );
    _persist();
  }

  void setHero({
    required bool opponent,
    String? heroName,
    int? life,
  }) {
    final player = opponent ? state.opponent : state.you;
    final starting = life ?? player.config.startingLife;
    final cfg = player.config.copyWith(
      heroName: heroName,
      startingLife: starting,
    );

    PlayerState next;
    if (state.isPristine) {
      next = PlayerState.fresh(cfg);
    } else {
      next = player.copyWith(config: cfg);
    }

    state = opponent
        ? state.copyWith(opponent: next)
        : state.copyWith(you: next);
    _persist();
  }

  void setStartingLife({required bool opponent, required int life}) {
    final clamped = life.clamp(0, 1 << 30);
    final player = opponent ? state.opponent : state.you;
    final cfg = player.config.copyWith(startingLife: clamped);

    PlayerState next;
    if (state.isPristine) {
      next = PlayerState.fresh(cfg);
    } else {
      next = player.copyWith(config: cfg);
    }

    state = opponent
        ? state.copyWith(opponent: next)
        : state.copyWith(you: next);
    _persist();
  }

  void resetGame() {
    _youSettle?.cancel();
    _opponentSettle?.cancel();
    _countdown?.cancel();
    _countdown = null;

    state = LifeTrackerState(
      format: state.format,
      you: PlayerState.fresh(state.you.config),
      opponent: PlayerState.fresh(state.opponent.config),
      history: const [],
      timerRemainingSeconds: state.format.roundSeconds,
      timerRunning: false,
      timerRunningSince: null,
    );
    _persist();
  }
}

final lifeTrackerProvider =
    NotifierProvider<LifeTrackerNotifier, LifeTrackerState>(
  LifeTrackerNotifier.new,
);
