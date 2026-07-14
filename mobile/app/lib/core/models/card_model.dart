/// A single Flesh and Blood card printing, mirroring a row of the
/// `fab_cards_with_prices` Supabase view. Different pitch colors, editions and
/// foilings are distinct rows (distinct [id]).
class CardModel {
  final String id; // stable printing key, e.g. "684123-foil"
  final int? productId;
  final int? setId;
  final String? uniqueId;
  final String name;
  final String? cleanName;
  final String? setName;
  final String? subTypeName;
  final bool isFoil;
  final String? rarity;
  final String? collectorNumber;
  final String? imageUrl;
  final String? tcgplayerUrl;
  final int? cardmarketId;

  // Flesh and Blood card attributes (from TCGCSV extended fields, all nullable).
  final String? cardType;
  final String? cardSubType;
  final String? cardClass;
  final String? talent;
  final String? pitch;
  final String? cost;
  final String? power;
  final String? defense;
  final String? life;
  final String? intellect;

  /// When the pricing pipeline last refreshed this printing's prices. Sourced
  /// from the `price_updated_at` column of `cards_with_prices`.
  final DateTime? priceUpdatedAt;

  // TCGplayer prices (USD, nullable).
  final double? tcgLow;
  final double? tcgMid;
  final double? tcgHigh;
  final double? tcgMarket;
  final double? tcgDirectLow;

  // CardMarket prices (EUR, nullable).
  final double? cmAvg;
  final double? cmLow;
  final double? cmTrend;
  final double? cmAvgFoil;
  final double? cmLowFoil;
  final double? cmTrendFoil;

  const CardModel({
    required this.id,
    required this.name,
    this.productId,
    this.setId,
    this.uniqueId,
    this.cleanName,
    this.setName,
    this.subTypeName,
    this.isFoil = false,
    this.rarity,
    this.collectorNumber,
    this.imageUrl,
    this.tcgplayerUrl,
    this.cardmarketId,
    this.cardType,
    this.cardSubType,
    this.cardClass,
    this.talent,
    this.pitch,
    this.cost,
    this.power,
    this.defense,
    this.life,
    this.intellect,
    this.priceUpdatedAt,
    this.tcgLow,
    this.tcgMid,
    this.tcgHigh,
    this.tcgMarket,
    this.tcgDirectLow,
    this.cmAvg,
    this.cmLow,
    this.cmTrend,
    this.cmAvgFoil,
    this.cmLowFoil,
    this.cmTrendFoil,
  });

  factory CardModel.fromMap(Map<String, dynamic> map) {
    return CardModel(
      id: map['id'] as String,
      productId: _toInt(map['product_id']),
      setId: _toInt(map['set_id']),
      uniqueId: map['unique_id'] as String?,
      name: (map['name'] as String?) ?? '',
      cleanName: map['clean_name'] as String?,
      setName: map['set_name'] as String?,
      subTypeName: map['sub_type_name'] as String?,
      isFoil: (map['is_foil'] as bool?) ?? false,
      rarity: map['rarity'] as String?,
      collectorNumber: map['collector_number'] as String?,
      imageUrl: map['image_url'] as String?,
      tcgplayerUrl: map['tcgplayer_url'] as String?,
      cardmarketId: _toInt(map['cardmarket_id']),
      cardType: map['card_type'] as String?,
      cardSubType: map['card_sub_type'] as String?,
      cardClass: map['card_class'] as String?,
      talent: map['talent'] as String?,
      pitch: map['pitch'] as String?,
      cost: map['cost'] as String?,
      power: map['power'] as String?,
      defense: map['defense'] as String?,
      life: map['life'] as String?,
      intellect: map['intellect'] as String?,
      priceUpdatedAt: _toDate(map['price_updated_at']),
      tcgLow: _toDouble(map['tcg_low']),
      tcgMid: _toDouble(map['tcg_mid']),
      tcgHigh: _toDouble(map['tcg_high']),
      tcgMarket: _toDouble(map['tcg_market']),
      tcgDirectLow: _toDouble(map['tcg_direct_low']),
      cmAvg: _toDouble(map['cm_avg']),
      cmLow: _toDouble(map['cm_low']),
      cmTrend: _toDouble(map['cm_trend']),
      cmAvgFoil: _toDouble(map['cm_avg_foil']),
      cmLowFoil: _toDouble(map['cm_low_foil']),
      cmTrendFoil: _toDouble(map['cm_trend_foil']),
    );
  }

  /// Full serialization back to the `cards_with_prices` column names, so a
  /// printing round-trips losslessly through [fromMap]. Used by the offline
  /// catalog cache (unlike [toStub], which drops price detail columns).
  Map<String, dynamic> toMap() => {
        'id': id,
        'product_id': productId,
        'set_id': setId,
        'unique_id': uniqueId,
        'name': name,
        'clean_name': cleanName,
        'set_name': setName,
        'sub_type_name': subTypeName,
        'is_foil': isFoil,
        'rarity': rarity,
        'collector_number': collectorNumber,
        'image_url': imageUrl,
        'tcgplayer_url': tcgplayerUrl,
        'cardmarket_id': cardmarketId,
        'card_type': cardType,
        'card_sub_type': cardSubType,
        'card_class': cardClass,
        'talent': talent,
        'pitch': pitch,
        'cost': cost,
        'power': power,
        'defense': defense,
        'life': life,
        'intellect': intellect,
        'price_updated_at': priceUpdatedAt?.toIso8601String(),
        'tcg_low': tcgLow,
        'tcg_mid': tcgMid,
        'tcg_high': tcgHigh,
        'tcg_market': tcgMarket,
        'tcg_direct_low': tcgDirectLow,
        'cm_avg': cmAvg,
        'cm_low': cmLow,
        'cm_trend': cmTrend,
        'cm_avg_foil': cmAvgFoil,
        'cm_low_foil': cmLowFoil,
        'cm_trend_foil': cmTrendFoil,
      };

  /// Compact map used to cache a printing alongside user data (collection/trades),
  /// so those screens can render without a network round-trip.
  Map<String, dynamic> toStub() => {
        'id': id,
        'product_id': productId,
        'name': name,
        'set_name': setName,
        'sub_type_name': subTypeName,
        'is_foil': isFoil,
        'rarity': rarity,
        'collector_number': collectorNumber,
        'image_url': imageUrl,
        'card_type': cardType,
        'card_class': cardClass,
        'pitch': pitch,
        'tcg_market': tcgMarket,
        'tcg_low': tcgLow,
        'cm_trend': cmTrend,
        'cm_low': cmLow,
      };

  factory CardModel.fromStub(Map<String, dynamic> map) => CardModel.fromMap(map);

  /// Label for the finish/edition, e.g. "Normal", "Rainbow Foil", "Cold Foil",
  /// "1st Edition Normal". Prefers the specific [subTypeName] from TCGplayer and
  /// only falls back to a generic "Foil"/"Normal" when it is absent.
  String get finishLabel {
    final sub = subTypeName?.trim();
    if (sub != null && sub.isNotEmpty) return sub;
    return isFoil ? 'Foil' : 'Normal';
  }

  // PostgREST can return numeric columns as num or String; handle both.
  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }

  static int? _toInt(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString());
  }

  static DateTime? _toDate(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse(v.toString());
  }
}

/// One day's price snapshot for a printing (from `price_history`).
class PricePoint {
  final DateTime capturedOn;
  final double? tcgMarket;
  final double? tcgLow;
  final double? cmTrend;
  final double? cmLow;

  const PricePoint({
    required this.capturedOn,
    this.tcgMarket,
    this.tcgLow,
    this.cmTrend,
    this.cmLow,
  });

  factory PricePoint.fromMap(Map<String, dynamic> map) {
    return PricePoint(
      capturedOn: DateTime.parse(map['captured_on'] as String),
      tcgMarket: CardModel._toDouble(map['tcg_market']),
      tcgLow: CardModel._toDouble(map['tcg_low']),
      cmTrend: CardModel._toDouble(map['cm_trend']),
      cmLow: CardModel._toDouble(map['cm_low']),
    );
  }
}
