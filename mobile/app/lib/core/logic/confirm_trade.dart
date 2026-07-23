import '../models/binder_entry.dart';
import '../models/card_model.dart';
import '../models/trade.dart';

/// Pure binder reconcile for Confirm Trade — unit-testable without Riverpod.
///
/// Order of operations matches the UI confirm path:
/// 1. Optionally decrement Have-side (given) cards from the Binder (clamp ≥ 0).
/// 2. Optionally add Want-side (received) cards to the Binder (qty merge, NM).
/// 3. Always clear/decrement Want List entries for received cards.
List<BinderEntry> reconcileBinderAfterTrade({
  required List<BinderEntry> entries,
  required Trade trade,
  required bool removeGivenFromBinder,
  required bool addReceivedToBinder,
  DateTime? now,
}) {
  var next = List<BinderEntry>.from(entries);
  final stamp = now ?? DateTime.now();

  if (removeGivenFromBinder) {
    for (final item in trade.haveItems) {
      next = _decrement(next, item.card.id, item.quantity, isWanted: false);
    }
  }

  if (addReceivedToBinder) {
    for (final item in trade.wantItems) {
      next = _add(next, item.card, item.quantity,
          isWanted: false, condition: 'NM', now: stamp);
    }
  }

  // Want list stays honest: received cards leave the want half.
  for (final item in trade.wantItems) {
    next = _decrement(next, item.card.id, item.quantity, isWanted: true);
  }

  return next;
}

List<BinderEntry> _decrement(
  List<BinderEntry> entries,
  String cardId,
  int quantity, {
  required bool isWanted,
}) {
  final idx =
      entries.indexWhere((e) => e.card.id == cardId && e.isWanted == isWanted);
  if (idx < 0) return entries;
  final existing = entries[idx];
  final remaining = existing.quantity - quantity;
  if (remaining <= 0) {
    return [
      for (var i = 0; i < entries.length; i++)
        if (i != idx) entries[i]
    ];
  }
  final updated = [...entries];
  updated[idx] = existing.copyWith(quantity: remaining);
  return updated;
}

List<BinderEntry> _add(
  List<BinderEntry> entries,
  CardModel card,
  int quantity, {
  required bool isWanted,
  required String condition,
  required DateTime now,
}) {
  final idx =
      entries.indexWhere((e) => e.card.id == card.id && e.isWanted == isWanted);
  if (idx >= 0) {
    final existing = entries[idx];
    final updated = [...entries];
    updated[idx] = existing.copyWith(quantity: existing.quantity + quantity);
    return updated;
  }
  return [
    BinderEntry(
      card: card,
      quantity: quantity,
      condition: condition,
      isWanted: isWanted,
      addedAt: now,
    ),
    ...entries,
  ];
}
