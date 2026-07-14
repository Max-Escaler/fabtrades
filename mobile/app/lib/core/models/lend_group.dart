import 'card_model.dart';

/// A single card line within a lend/borrow group.
class LendItem {
  final CardModel card;
  final int quantity;

  const LendItem({required this.card, this.quantity = 1});

  LendItem copyWith({int? quantity}) =>
      LendItem(card: card, quantity: quantity ?? this.quantity);

  Map<String, dynamic> toJson() => {
        'card': card.toStub(),
        'quantity': quantity,
      };

  factory LendItem.fromJson(Map<String, dynamic> json) => LendItem(
        card: CardModel.fromStub(Map<String, dynamic>.from(json['card'] as Map)),
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      );
}

/// A batch of cards lent out to (or borrowed from) one person. The
/// [personName] is optional. Each group is one loan and holds many cards.
class LendGroup {
  final String id;
  final String? personName;
  final bool isBorrowing; // true => borrowing from someone, false => lent out
  final DateTime createdAt;
  final List<LendItem> items;

  const LendGroup({
    required this.id,
    this.personName,
    this.isBorrowing = false,
    required this.createdAt,
    this.items = const [],
  });

  int get cardCount => items.fold<int>(0, (s, i) => s + i.quantity);

  LendGroup copyWith({
    String? personName,
    bool clearPersonName = false,
    bool? isBorrowing,
    List<LendItem>? items,
  }) =>
      LendGroup(
        id: id,
        personName: clearPersonName ? null : (personName ?? this.personName),
        isBorrowing: isBorrowing ?? this.isBorrowing,
        createdAt: createdAt,
        items: items ?? this.items,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'person_name': personName,
        'is_borrowing': isBorrowing,
        'created_at': createdAt.toIso8601String(),
        'items': items.map((i) => i.toJson()).toList(),
      };

  factory LendGroup.fromJson(Map<String, dynamic> json) {
    final name = (json['person_name'] as String?)?.trim();
    return LendGroup(
      id: (json['id'] as String?) ??
          DateTime.now().microsecondsSinceEpoch.toString(),
      personName: (name == null || name.isEmpty) ? null : name,
      isBorrowing: (json['is_borrowing'] as bool?) ?? false,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
      items: ((json['items'] as List?) ?? [])
          .map((e) => LendItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
  }
}
