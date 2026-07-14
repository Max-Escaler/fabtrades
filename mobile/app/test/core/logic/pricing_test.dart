import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/logic/pricing.dart';
import 'package:fabtrades/core/models/app_settings.dart';

import '../../support/fixtures.dart';

void main() {
  group('Pricing.value — TCGplayer', () {
    const pricingMarket = Pricing(AppSettings());
    const pricingLow = Pricing(
      AppSettings(source: PriceSource.tcgplayer, type: PriceType.low),
    );

    test('market prefers tcgMarket', () {
      expect(pricingMarket.value(buildCard(tcgMarket: 2.0, tcgLow: 1.0)), 2.0);
    });

    test('low prefers tcgLow', () {
      expect(pricingLow.value(buildCard(tcgMarket: 2.0, tcgLow: 1.0)), 1.0);
    });

    test('market falls back through low -> mid -> high', () {
      expect(pricingMarket.value(buildCard(tcgLow: 1.5)), 1.5);
      expect(pricingMarket.value(buildCard(tcgMid: 3.0)), 3.0);
      expect(pricingMarket.value(buildCard(tcgHigh: 9.0)), 9.0);
    });

    test('returns null when no tcg prices are present', () {
      expect(pricingMarket.value(buildCard()), isNull);
    });
  });

  group('Pricing.value — CardMarket', () {
    const cmMarket = Pricing(
      AppSettings(source: PriceSource.cardmarket, type: PriceType.market),
    );
    const cmLow = Pricing(
      AppSettings(source: PriceSource.cardmarket, type: PriceType.low),
    );

    test('non-foil market uses cmTrend', () {
      expect(cmMarket.value(buildCard(cmTrend: 4.0)), 4.0);
    });

    test('foil market prefers cmTrendFoil', () {
      final card = buildCard(isFoil: true, cmTrend: 4.0, cmTrendFoil: 6.0);
      expect(cmMarket.value(card), 6.0);
    });

    test('foil market falls back to non-foil trend when no foil price', () {
      final card = buildCard(isFoil: true, cmTrend: 4.0);
      expect(cmMarket.value(card), 4.0);
    });

    test('non-foil low uses cmLow', () {
      expect(cmLow.value(buildCard(cmLow: 3.0)), 3.0);
    });

    test('foil low prefers cmLowFoil', () {
      final card = buildCard(isFoil: true, cmLow: 3.0, cmLowFoil: 5.0);
      expect(cmLow.value(card), 5.0);
    });

    test('market falls back through avg then low', () {
      expect(cmMarket.value(buildCard(cmAvg: 7.0)), 7.0);
      expect(cmMarket.value(buildCard(cmLow: 8.0)), 8.0);
    });
  });

  group('Pricing formatting', () {
    const usd = Pricing(AppSettings());
    const eur = Pricing(AppSettings(source: PriceSource.cardmarket));

    test('format renders em dash for null', () {
      expect(usd.format(null), '—');
    });

    test('format uses the USD symbol for TCGplayer', () {
      expect(usd.format(1.5), '\$1.50');
    });

    test('format uses the EUR symbol for CardMarket', () {
      expect(eur.format(1.5), '€1.50');
    });

    test('priceLabel resolves and formats a card price', () {
      expect(usd.priceLabel(buildCard(tcgMarket: 12.34)), '\$12.34');
      expect(usd.priceLabel(buildCard()), '—');
    });

    test('symbol and sourceLabel reflect the source', () {
      expect(usd.symbol, '\$');
      expect(usd.sourceLabel, 'TCGplayer');
      expect(eur.symbol, '€');
      expect(eur.sourceLabel, 'CardMarket');
    });
  });
}
