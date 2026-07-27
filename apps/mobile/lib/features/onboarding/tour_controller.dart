import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:showcaseview/showcaseview.dart';

import '../../core/models/card_model.dart';
import '../../core/models/trade.dart';
import '../../core/providers.dart';
import 'onboarding_keys.dart';
import 'onboarding_provider.dart';

/// Starts and finishes just-in-time onboarding sequences for each screen.
///
/// Home-shell tours share [OnboardingKeys.homeScope]. Scan uses its own scope
/// because it is a pushed route outside [HomeShell].
class TourController {
  TourController(this.ref);

  final WidgetRef ref;

  /// True while the Trade tour seeded demo cards that still need clearing.
  bool tradeSeeded = false;

  bool hasSeen(String id) => ref.read(onboardingProvider).contains(id);

  Future<void> markSeen(String id) =>
      ref.read(onboardingProvider.notifier).markSeen(id);

  Future<void> markAllSeen() =>
      ref.read(onboardingProvider.notifier).markAllSeen();

  /// Seeds one demo card per side when the draft is empty and the catalog is
  /// loaded. Returns the keys to showcase (drops Confirm when seeding failed
  /// and the draft is still empty, so we never highlight a disabled button).
  List<GlobalKey> prepareTradeTour() {
    final draft = ref.read(tradeDraftProvider);
    final catalog = ref.read(catalogProvider).asData?.value;
    final alreadyHasContent =
        draft.haveItems.isNotEmpty || draft.wantItems.isNotEmpty;

    tradeSeeded = false;
    if (!alreadyHasContent && catalog != null && catalog.length >= 2) {
      final theirs = _pickDemoCard(catalog, preferIndex: 0);
      final mine = _pickDemoCard(catalog, preferIndex: 1, avoidId: theirs.id);
      ref.read(tradeDraftProvider.notifier).addCard(TradeSide.want, theirs);
      ref.read(tradeDraftProvider.notifier).addCard(TradeSide.have, mine);
      tradeSeeded = true;
    }

    final keys = <GlobalKey>[
      OnboardingKeys.tradeTheirCards,
      OnboardingKeys.tradeMyCards,
      OnboardingKeys.tradeDragBar,
    ];
    final after = ref.read(tradeDraftProvider);
    if (after.haveItems.isNotEmpty || after.wantItems.isNotEmpty) {
      keys.add(OnboardingKeys.tradeConfirm);
    }
    return keys;
  }

  void cleanupTradeSeed() {
    if (!tradeSeeded) return;
    tradeSeeded = false;
    ref.read(tradeDraftProvider.notifier).clear();
  }

  List<GlobalKey> binderKeys() {
    final hasCards =
        ref.read(binderProvider).any((e) => !e.isWanted && e.quantity > 0);
    return [
      OnboardingKeys.binderTabs,
      // Total header only exists once the binder has cards.
      if (hasCards) OnboardingKeys.binderTotal,
      OnboardingKeys.binderFab,
    ];
  }

  List<GlobalKey> wantListKeys({required bool hasCards}) {
    final keys = <GlobalKey>[OnboardingKeys.wantListPane];
    // Edit toggle only renders when the want list has cards.
    if (hasCards) keys.add(OnboardingKeys.wantListEdit);
    return keys;
  }

  List<GlobalKey> lendKeys() => [
        OnboardingKeys.lendTabs,
        OnboardingKeys.lendNewBatch,
      ];

  List<GlobalKey> scanKeys() => [
        OnboardingKeys.scanOverlay,
        OnboardingKeys.scanAutoHint,
      ];

  void startHomeTour(List<GlobalKey> keys) {
    if (keys.isEmpty) return;
    final view = ShowcaseView.getNamed(OnboardingKeys.homeScope);
    if (view.isShowcaseRunning) view.dismiss();
    view.startShowCase(keys, delay: const Duration(milliseconds: 350));
  }

  void dismissHomeTour() {
    final view = ShowcaseView.getNamed(OnboardingKeys.homeScope);
    if (view.isShowcaseRunning) view.dismiss();
  }

  void startScanTour() {
    final view = ShowcaseView.getNamed(OnboardingKeys.scanScope);
    if (view.isShowcaseRunning) return;
    view.startShowCase(
      scanKeys(),
      delay: const Duration(milliseconds: 400),
    );
  }

  static CardModel _pickDemoCard(
    List<CardModel> catalog, {
    required int preferIndex,
    String? avoidId,
  }) {
    for (final c in catalog) {
      if (c.id == avoidId) continue;
      if (c.imageUrl != null && c.imageUrl!.isNotEmpty) return c;
    }
    final fallback = catalog[preferIndex.clamp(0, catalog.length - 1)];
    if (fallback.id != avoidId) return fallback;
    return catalog.firstWhere((c) => c.id != avoidId, orElse: () => catalog.first);
  }
}
