import 'package:flutter/widgets.dart';

/// Shared [GlobalKey]s for showcaseview coach marks.
///
/// Kept in one place so [HomeShell] can start sequences and each screen can
/// wrap the matching widgets without inventing keys twice.
abstract final class OnboardingKeys {
  // Trade
  static final tradeTheirCards = GlobalKey();
  static final tradeMyCards = GlobalKey();
  static final tradeDragBar = GlobalKey();
  static final tradeConfirm = GlobalKey();

  // Binder
  static final binderTabs = GlobalKey();
  static final binderTotal = GlobalKey();
  static final binderFab = GlobalKey();

  // Want List (Binder sub-tab)
  static final wantListPane = GlobalKey();
  static final wantListEdit = GlobalKey();

  // Lend
  static final lendTabs = GlobalKey();
  static final lendNewBatch = GlobalKey();

  // Scan (own ShowcaseView scope)
  static final scanOverlay = GlobalKey();
  static final scanAutoHint = GlobalKey();

  static const homeScope = 'home';
  static const scanScope = 'scan';
}
