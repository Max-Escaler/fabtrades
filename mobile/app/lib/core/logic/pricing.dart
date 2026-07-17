import 'package:intl/intl.dart';

import '../models/app_settings.dart';
import '../models/card_model.dart';

/// Resolves market (primary) and low (secondary) prices for the user's chosen
/// marketplace, with sensible fallbacks so a printing rarely shows "—" when
/// *some* price exists. Trade math always uses [value] (market).
class Pricing {
  const Pricing(this.settings);
  final AppSettings settings;

  static final NumberFormat _usd =
      NumberFormat.currency(locale: 'en_US', symbol: '\$');
  static final NumberFormat _eur =
      NumberFormat.currency(locale: 'en_US', symbol: '€');

  NumberFormat get _fmt =>
      settings.source == PriceSource.tcgplayer ? _usd : _eur;

  /// Market/trend value used for trade math and the primary list price.
  double? value(CardModel card) {
    switch (settings.source) {
      case PriceSource.tcgplayer:
        return card.tcgMarket ??
            card.tcgLow ??
            card.tcgMid ??
            card.tcgHigh;
      case PriceSource.cardmarket:
        final foil = card.isFoil;
        final v = foil ? card.cmTrendFoil : card.cmTrend;
        return v ?? card.cmTrend ?? card.cmAvg ?? card.cmLow;
    }
  }

  /// Lowest listed price for the secondary/sub-price display. Returns null when
  /// no distinct low price is available (so callers can omit the sub-line).
  double? lowValue(CardModel card) {
    switch (settings.source) {
      case PriceSource.tcgplayer:
        return card.tcgLow;
      case PriceSource.cardmarket:
        final foil = card.isFoil;
        return (foil ? card.cmLowFoil : card.cmLow) ?? card.cmLow;
    }
  }

  String format(double? v) => v == null ? '—' : _fmt.format(v);

  /// Convenience: formatted market price for a card.
  String priceLabel(CardModel card) => format(value(card));

  /// Smaller secondary label, e.g. "Low $1.25". Null when no low price exists.
  String? lowPriceLabel(CardModel card) {
    final low = lowValue(card);
    if (low == null) return null;
    return 'Low ${format(low)}';
  }

  String formatValue(double v) => _fmt.format(v);

  String get symbol => settings.source.symbol;

  /// Human label of the marketplace the current prices come from, e.g.
  /// "TCGplayer" or "CardMarket" — used for on-screen price attribution.
  String get sourceLabel => settings.source.label;
}
