import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/models/app_settings.dart';

void main() {
  group('AppSettings', () {
    test('defaults to TCGplayer market', () {
      const s = AppSettings();
      expect(s.source, PriceSource.tcgplayer);
      expect(s.type, PriceType.market);
    });

    test('copyWith overrides selectively', () {
      const s = AppSettings();
      final updated = s.copyWith(source: PriceSource.cardmarket);
      expect(updated.source, PriceSource.cardmarket);
      expect(updated.type, PriceType.market);
    });

    test('toJson -> fromJson round-trips', () {
      const s = AppSettings(
        source: PriceSource.cardmarket,
        type: PriceType.low,
      );
      final restored = AppSettings.fromJson(s.toJson());
      expect(restored.source, PriceSource.cardmarket);
      expect(restored.type, PriceType.low);
    });

    test('fromJson falls back to defaults for unknown enum values', () {
      final restored = AppSettings.fromJson({
        'source': 'nope',
        'type': 'unknown',
      });
      expect(restored.source, PriceSource.tcgplayer);
      expect(restored.type, PriceType.market);
    });

    test('enum metadata is correct', () {
      expect(PriceSource.tcgplayer.symbol, '\$');
      expect(PriceSource.tcgplayer.currencyCode, 'USD');
      expect(PriceSource.cardmarket.symbol, '€');
      expect(PriceSource.cardmarket.currencyCode, 'EUR');
      expect(PriceSource.tcgplayer.label, 'TCGplayer');
      expect(PriceSource.cardmarket.label, 'CardMarket');
    });
  });
}
