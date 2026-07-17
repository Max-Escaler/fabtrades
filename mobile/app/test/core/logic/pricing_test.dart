import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/logic/pricing.dart';
import 'package:fabtrades/core/models/app_settings.dart';

import '../../support/fixtures.dart';

void main() {
  group('Pricing.value — TCGplayer', () {
    const pricing = Pricing(AppSettings());

    test('prefers tcgMarket', () {
      expect(pricing.value(buildCard(tcgMarket: 2.0, tcgLow: 1.0)), 2.0);
    });

    test('falls back through low -> mid -> high', () {
      expect(pricing.value(buildCard(tcgLow: 1.5)), 1.5);
      expect(pricing.value(buildCard(tcgMid: 3.0)), 3.0);
      expect(pricing.value(buildCard(tcgHigh: 9.0)), 9.0);
    });

    test('returns null when no tcg prices are present', () {
      expect(pricing.value(buildCard()), isNull);
    });
  });

  group('Pricing.lowValue — TCGplayer', () {
    const pricing = Pricing(AppSettings());

    test('returns tcgLow without falling back to market', () {
      expect(pricing.lowValue(buildCard(tcgMarket: 2.0, tcgLow: 1.0)), 1.0);
      expect(pricing.lowValue(buildCard(tcgMarket: 2.0)), isNull);
    });
  });

  group('Pricing.value — CardMarket', () {
    const cm = Pricing(AppSettings(source: PriceSource.cardmarket));

    test('non-foil market uses cmTrend', () {
      expect(cm.value(buildCard(cmTrend: 4.0)), 4.0);
    });

    test('foil market prefers cmTrendFoil', () {
      final card = buildCard(isFoil: true, cmTrend: 4.0, cmTrendFoil: 6.0);
      expect(cm.value(card), 6.0);
    });

    test('foil market falls back to non-foil trend when no foil price', () {
      final card = buildCard(isFoil: true, cmTrend: 4.0);
      expect(cm.value(card), 4.0);
    });

    test('market falls back through avg then low', () {
      expect(cm.value(buildCard(cmAvg: 7.0)), 7.0);
      expect(cm.value(buildCard(cmLow: 8.0)), 8.0);
    });
  });

  group('Pricing.lowValue — CardMarket', () {
    const cm = Pricing(AppSettings(source: PriceSource.cardmarket));

    test('non-foil low uses cmLow', () {
      expect(cm.lowValue(buildCard(cmLow: 3.0)), 3.0);
    });

    test('foil low prefers cmLowFoil', () {
      final card = buildCard(isFoil: true, cmLow: 3.0, cmLowFoil: 5.0);
      expect(cm.lowValue(card), 5.0);
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

    test('lowPriceLabel formats Low prefix or is null', () {
      expect(usd.lowPriceLabel(buildCard(tcgLow: 1.25)), 'Low \$1.25');
      expect(usd.lowPriceLabel(buildCard(tcgMarket: 2.0)), isNull);
    });

    test('symbol and sourceLabel reflect the source', () {
      expect(usd.symbol, '\$');
      expect(usd.sourceLabel, 'TCGplayer');
      expect(eur.symbol, '€');
      expect(eur.sourceLabel, 'CardMarket');
    });
  });
}
