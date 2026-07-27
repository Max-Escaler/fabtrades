import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'onboarding_repository.dart';

final onboardingRepositoryProvider = Provider<OnboardingRepository>(
  (ref) => OnboardingRepository(ref.watch(sharedPreferencesProvider)),
);

/// Set of [OnboardingTourId] values the user has already completed or skipped.
class OnboardingNotifier extends Notifier<Set<String>> {
  @override
  Set<String> build() => ref.watch(onboardingRepositoryProvider).load();

  bool hasSeen(String id) => state.contains(id);

  Future<void> markSeen(String id) async {
    if (state.contains(id)) return;
    final next = {...state, id};
    state = next;
    await ref.read(onboardingRepositoryProvider).save(next);
  }

  Future<void> markAllSeen() async {
    if (state.containsAll(OnboardingTourId.all)) return;
    state = {...OnboardingTourId.all};
    await ref.read(onboardingRepositoryProvider).save(state);
  }

  /// Clears every tour flag so Settings → Replay tutorial can re-run them.
  Future<void> resetAll() async {
    state = {};
    await ref.read(onboardingRepositoryProvider).save(state);
  }
}

final onboardingProvider =
    NotifierProvider<OnboardingNotifier, Set<String>>(OnboardingNotifier.new);
