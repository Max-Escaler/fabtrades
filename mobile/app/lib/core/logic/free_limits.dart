/// Free-tier ceilings. FABTrades Pro removes all of them.
///
/// Deliberately generous enough that the app is genuinely usable for free —
/// the caps are meant to be reached by committed collectors, not to make a
/// first session feel crippled.
class FreeLimits {
  const FreeLimits._();

  /// Distinct cards a free binder holds. Raising the quantity of a card that's
  /// already there is never capped, so no existing entry can be stranded.
  static const binderCards = 50;

  /// Distinct cards a free want list holds.
  static const wantListCards = 25;

  /// Trades a free account keeps.
  ///
  /// Confirming a trade is never blocked — the binder reconciliation it
  /// performs is core to the app, and refusing it would lose real information.
  /// History is a rolling window instead: the oldest entry drops off.
  static const savedTrades = 10;

  static int cardsFor({required bool isWanted}) =>
      isWanted ? wantListCards : binderCards;
}

/// How much of the free tier is currently in use, for upsell copy.
class FreeUsage {
  const FreeUsage({
    required this.binderCards,
    required this.wantListCards,
    required this.savedTrades,
  });

  final int binderCards;
  final int wantListCards;
  final int savedTrades;

  /// The cap closest to being reached, as a 0–1 fraction. Drives whether the
  /// upgrade prompt mentions limits at all.
  double get pressure => [
        binderCards / FreeLimits.binderCards,
        wantListCards / FreeLimits.wantListCards,
        savedTrades / FreeLimits.savedTrades,
      ].reduce((a, b) => a > b ? a : b);

  /// True once any cap is within a few entries, which is when nudging is
  /// useful rather than noise.
  bool get isNearAnyLimit => pressure >= 0.7;
}
