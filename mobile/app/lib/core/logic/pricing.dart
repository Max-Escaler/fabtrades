import 'package:intl/intl.dart';

import '../models/app_settings.dart';
import '../models/card_model.dart';

/// Resolves the canonical price of a printing for the user's chosen source/type,
/// with sensible fallbacks so a printing rarely shows "—" when *some* price exists.
class Pricing {
  const Pricing(this.settings);
  final AppSettings settings;

  static final NumberFormat _usd =
      NumberFormat.currency(locale: 'en_US', symbol: '\$');
  static final NumberFormat _eur =
      NumberFormat.currency(locale: 'en_US', symbol: '€');

  NumberFormat get _fmt =>
      settings.source == PriceSource.tcgplayer ? _usd : _eur;

  /// The single value used for trade math / list display.
  double? value(CardModel card) {
    switch (settings.source) {
      case PriceSource.tcgplayer:
        final primary =
            settings.type == PriceType.market ? card.tcgMarket : card.tcgLow;
        return primary ??
            card.tcgMarket ??
            card.tcgLow ??
            card.tcgMid ??
            card.tcgHigh;
      case PriceSource.cardmarket:
        final foil = card.isFoil;
        if (settings.type == PriceType.market) {
          final v = foil ? card.cmTrendFoil : card.cmTrend;
          return v ?? card.cmTrend ?? card.cmAvg ?? card.cmLow;
        } else {
          final v = foil ? card.cmLowFoil : card.cmLow;
          return v ?? card.cmLow ?? card.cmTrend ?? card.cmAvg;
        }
    }
  }

  String format(double? v) => v == null ? '—' : _fmt.format(v);

  /// Convenience: formatted canonical price for a card.
  String priceLabel(CardModel card) => format(value(card));

  String formatValue(double v) => _fmt.format(v);

  String get symbol => settings.source.symbol;

  /// Human label of the marketplace the current prices come from, e.g.
  /// "TCGplayer" or "CardMarket" — used for on-screen price attribution.
  String get sourceLabel => settings.source.label;
}
