import 'card_model.dart';

/// A card the user owns (or wants). Keyed by printing [CardModel.id].
class CollectionEntry {
  final CardModel card;
  final int quantity;
  final String condition; // e.g. NM, LP, MP, HP, DMG
  final bool isWanted; // true => want list, false => owned
  final DateTime addedAt;

  const CollectionEntry({
    required this.card,
    this.quantity = 1,
    this.condition = 'NM',
    this.isWanted = false,
    required this.addedAt,
  });

  CollectionEntry copyWith({
    int? quantity,
    String? condition,
    bool? isWanted,
  }) =>
      CollectionEntry(
        card: card,
        quantity: quantity ?? this.quantity,
        condition: condition ?? this.condition,
        isWanted: isWanted ?? this.isWanted,
        addedAt: addedAt,
      );

  Map<String, dynamic> toJson() => {
        'card': card.toStub(),
        'quantity': quantity,
        'condition': condition,
        'is_wanted': isWanted,
        'added_at': addedAt.toIso8601String(),
      };

  factory CollectionEntry.fromJson(Map<String, dynamic> json) =>
      CollectionEntry(
        card: CardModel.fromStub(
            Map<String, dynamic>.from(json['card'] as Map)),
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        condition: (json['condition'] as String?) ?? 'NM',
        isWanted: (json['is_wanted'] as bool?) ?? false,
        addedAt: DateTime.tryParse(json['added_at'] as String? ?? '') ??
            DateTime.now(),
      );

  static const conditions = ['NM', 'LP', 'MP', 'HP', 'DMG'];
}
