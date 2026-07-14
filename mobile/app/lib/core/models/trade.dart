import 'card_model.dart';

enum TradeSide { have, want }

/// A card line on one side of a trade. [priceEach] is the price captured at the
/// moment it was added/saved (so a saved trade preserves at-the-time value).
class TradeItem {
  final CardModel card;
  final int quantity;
  final double priceEach;

  const TradeItem({
    required this.card,
    this.quantity = 1,
    this.priceEach = 0,
  });

  double get lineTotal => priceEach * quantity;

  TradeItem copyWith({int? quantity, double? priceEach}) => TradeItem(
        card: card,
        quantity: quantity ?? this.quantity,
        priceEach: priceEach ?? this.priceEach,
      );

  Map<String, dynamic> toJson() => {
        'card': card.toStub(),
        'quantity': quantity,
        'price_each': priceEach,
      };

  factory TradeItem.fromJson(Map<String, dynamic> json) => TradeItem(
        card: CardModel.fromStub(
            Map<String, dynamic>.from(json['card'] as Map)),
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        priceEach: (json['price_each'] as num?)?.toDouble() ?? 0,
      );
}

/// A trade draft (live, being edited) or a saved historical trade.
class Trade {
  final String id;
  final DateTime createdAt;
  final String notes;
  final List<TradeItem> haveItems;
  final List<TradeItem> wantItems;
  final double haveCash;
  final double wantCash;
  final String currencySymbol;

  const Trade({
    required this.id,
    required this.createdAt,
    this.notes = '',
    this.haveItems = const [],
    this.wantItems = const [],
    this.haveCash = 0,
    this.wantCash = 0,
    this.currencySymbol = '\$',
  });

  double get haveTotal =>
      haveItems.fold<double>(0, (s, i) => s + i.lineTotal) + haveCash;
  double get wantTotal =>
      wantItems.fold<double>(0, (s, i) => s + i.lineTotal) + wantCash;

  /// Positive => you're giving more value than you receive (in their favor).
  double get delta => haveTotal - wantTotal;

  int get haveCount => haveItems.fold<int>(0, (s, i) => s + i.quantity);
  int get wantCount => wantItems.fold<int>(0, (s, i) => s + i.quantity);

  Trade copyWith({
    String? notes,
    List<TradeItem>? haveItems,
    List<TradeItem>? wantItems,
    double? haveCash,
    double? wantCash,
    String? currencySymbol,
  }) =>
      Trade(
        id: id,
        createdAt: createdAt,
        notes: notes ?? this.notes,
        haveItems: haveItems ?? this.haveItems,
        wantItems: wantItems ?? this.wantItems,
        haveCash: haveCash ?? this.haveCash,
        wantCash: wantCash ?? this.wantCash,
        currencySymbol: currencySymbol ?? this.currencySymbol,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'created_at': createdAt.toIso8601String(),
        'notes': notes,
        'have_items': haveItems.map((e) => e.toJson()).toList(),
        'want_items': wantItems.map((e) => e.toJson()).toList(),
        'have_cash': haveCash,
        'want_cash': wantCash,
        'currency_symbol': currencySymbol,
      };

  factory Trade.fromJson(Map<String, dynamic> json) => Trade(
        id: json['id'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
        notes: (json['notes'] as String?) ?? '',
        haveItems: ((json['have_items'] as List?) ?? [])
            .map((e) => TradeItem.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        wantItems: ((json['want_items'] as List?) ?? [])
            .map((e) => TradeItem.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        haveCash: (json['have_cash'] as num?)?.toDouble() ?? 0,
        wantCash: (json['want_cash'] as num?)?.toDouble() ?? 0,
        currencySymbol: (json['currency_symbol'] as String?) ?? '\$',
      );
}
