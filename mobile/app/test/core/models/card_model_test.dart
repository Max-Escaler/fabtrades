import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/models/card_model.dart';

void main() {
  group('CardModel.fromMap', () {
    test('parses a full cards_with_prices row', () {
      final card = CardModel.fromMap({
        'id': '684123-foil',
        'product_id': 684123,
        'set_id': 12,
        'unique_id': 'u-1',
        'name': 'Crowd Favorite',
        'clean_name': 'CrowdFavorite',
        'set_name': 'Unleashed',
        'sub_type_name': 'Foil',
        'is_foil': true,
        'rarity': 'Common',
        'collector_number': '015/219',
        'image_url': 'https://example.com/684123.jpg',
        'tcgplayer_url': 'https://tcg.example/684123',
        'cardmarket_id': 9001,
        'price_updated_at': '2026-01-02T03:04:05.000Z',
        'tcg_market': '0.17',
        'tcg_low': 0.12,
        'tcg_mid': 0.15,
        'tcg_high': 0.30,
        'cm_trend': null,
        'cm_low': null,
      });

      expect(card.id, '684123-foil');
      expect(card.productId, 684123);
      expect(card.setId, 12);
      expect(card.uniqueId, 'u-1');
      expect(card.name, 'Crowd Favorite');
      expect(card.cleanName, 'CrowdFavorite');
      expect(card.isFoil, isTrue);
      expect(card.cardmarketId, 9001);
      expect(card.priceUpdatedAt, DateTime.utc(2026, 1, 2, 3, 4, 5));
      expect(card.tcgMarket, 0.17);
      expect(card.tcgLow, 0.12);
      expect(card.tcgMid, 0.15);
      expect(card.tcgHigh, 0.30);
      expect(card.cmTrend, isNull);
      expect(card.cmLow, isNull);
    });

    test('coerces numeric strings and missing values safely', () {
      final card = CardModel.fromMap({
        'id': 'x',
        'name': null, // defaults to ''
        'product_id': '55', // string int
        'is_foil': null, // defaults to false
        'tcg_market': 'not-a-number', // -> null
        'cardmarket_id': 3.0, // num -> int
      });

      expect(card.name, '');
      expect(card.productId, 55);
      expect(card.isFoil, isFalse);
      expect(card.tcgMarket, isNull);
      expect(card.cardmarketId, 3);
    });

    test('parses invalid date to null', () {
      final card = CardModel.fromMap({
        'id': 'x',
        'name': 'A',
        'price_updated_at': 'garbage',
      });
      expect(card.priceUpdatedAt, isNull);
    });
  });

  group('serialization round-trips', () {
    test('toMap -> fromMap is lossless for all columns', () {
      final original = CardModel(
        id: 'id-1',
        productId: 123,
        setId: 4,
        uniqueId: 'uid',
        name: 'Ahri',
        cleanName: 'Ahri',
        setName: 'Origins',
        subTypeName: 'Normal',
        isFoil: false,
        rarity: 'Rare',
        collectorNumber: '100/219',
        imageUrl: 'https://img',
        tcgplayerUrl: 'https://tcg',
        cardmarketId: 77,
        priceUpdatedAt: DateTime.utc(2026, 5, 6, 7, 8, 9),
        tcgLow: 1.1,
        tcgMid: 1.2,
        tcgHigh: 1.3,
        tcgMarket: 1.15,
        tcgDirectLow: 1.05,
        cmAvg: 2.1,
        cmLow: 2.0,
        cmTrend: 2.2,
        cmAvgFoil: 3.1,
        cmLowFoil: 3.0,
        cmTrendFoil: 3.2,
      );

      final restored = CardModel.fromMap(original.toMap());

      expect(restored.id, original.id);
      expect(restored.productId, original.productId);
      expect(restored.setId, original.setId);
      expect(restored.uniqueId, original.uniqueId);
      expect(restored.name, original.name);
      expect(restored.cleanName, original.cleanName);
      expect(restored.setName, original.setName);
      expect(restored.subTypeName, original.subTypeName);
      expect(restored.isFoil, original.isFoil);
      expect(restored.rarity, original.rarity);
      expect(restored.collectorNumber, original.collectorNumber);
      expect(restored.imageUrl, original.imageUrl);
      expect(restored.tcgplayerUrl, original.tcgplayerUrl);
      expect(restored.cardmarketId, original.cardmarketId);
      expect(restored.priceUpdatedAt, original.priceUpdatedAt);
      expect(restored.tcgLow, original.tcgLow);
      expect(restored.tcgMid, original.tcgMid);
      expect(restored.tcgHigh, original.tcgHigh);
      expect(restored.tcgMarket, original.tcgMarket);
      expect(restored.tcgDirectLow, original.tcgDirectLow);
      expect(restored.cmAvg, original.cmAvg);
      expect(restored.cmLow, original.cmLow);
      expect(restored.cmTrend, original.cmTrend);
      expect(restored.cmAvgFoil, original.cmAvgFoil);
      expect(restored.cmLowFoil, original.cmLowFoil);
      expect(restored.cmTrendFoil, original.cmTrendFoil);
    });

    test('toStub -> fromStub preserves the compact fields', () {
      final original = CardModel(
        id: 'id-2',
        productId: 9,
        name: 'Vi',
        setName: 'Origins',
        subTypeName: 'Foil',
        isFoil: true,
        rarity: 'Epic',
        collectorNumber: '050/219',
        imageUrl: 'https://img2',
        tcgMarket: 5.5,
        tcgLow: 5.0,
        cmTrend: 4.4,
        cmLow: 4.0,
      );

      final restored = CardModel.fromStub(original.toStub());

      expect(restored.id, original.id);
      expect(restored.productId, original.productId);
      expect(restored.name, original.name);
      expect(restored.setName, original.setName);
      expect(restored.subTypeName, original.subTypeName);
      expect(restored.isFoil, original.isFoil);
      expect(restored.rarity, original.rarity);
      expect(restored.collectorNumber, original.collectorNumber);
      expect(restored.imageUrl, original.imageUrl);
      expect(restored.tcgMarket, original.tcgMarket);
      expect(restored.tcgLow, original.tcgLow);
      expect(restored.cmTrend, original.cmTrend);
      expect(restored.cmLow, original.cmLow);
    });
  });

  group('finishLabel', () {
    test('is Foil for a foil printing regardless of subType', () {
      expect(
        const CardModel(id: 'a', name: 'A', isFoil: true).finishLabel,
        'Foil',
      );
    });

    test('uses subTypeName when not foil', () {
      expect(
        const CardModel(id: 'a', name: 'A', subTypeName: 'Normal').finishLabel,
        'Normal',
      );
    });

    test('falls back to Normal when no subType and not foil', () {
      expect(const CardModel(id: 'a', name: 'A').finishLabel, 'Normal');
    });
  });

  group('PricePoint.fromMap', () {
    test('parses a price_history row', () {
      final p = PricePoint.fromMap({
        'captured_on': '2026-03-04',
        'tcg_market': '1.25',
        'tcg_low': 1.0,
        'cm_trend': null,
        'cm_low': 0.9,
      });
      expect(p.capturedOn, DateTime(2026, 3, 4));
      expect(p.tcgMarket, 1.25);
      expect(p.tcgLow, 1.0);
      expect(p.cmTrend, isNull);
      expect(p.cmLow, 0.9);
    });
  });
}
