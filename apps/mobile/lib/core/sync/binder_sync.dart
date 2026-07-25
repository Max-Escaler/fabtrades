import 'dart:convert';

import '../models/binder_entry.dart';
import '../models/card_model.dart';
import 'sync_adapter.dart';
import 'sync_journal.dart';
import 'sync_record.dart';

/// Maps binder and want-list entries onto `public.binder_entries`.
///
/// Identity is the printing plus which list it sits on, mirroring how the binder
/// merges locally: adding a card you already own tops up the quantity rather than
/// creating a second entry. That makes two devices adding the same card converge on
/// one row, which a client-minted id could not do.
class BinderSyncAdapter implements SyncAdapter<BinderEntry> {
  const BinderSyncAdapter();

  @override
  SyncDomain get domain => SyncDomain.binder;

  @override
  String get table => 'binder_entries';

  @override
  String get conflictTarget => 'user_id,card_id,is_wanted';

  /// The list flag leads so the split is unambiguous no matter what a card id
  /// contains.
  @override
  String idOf(BinderEntry value) => _id(value.card.id, value.isWanted);

  static String _id(String cardId, bool isWanted) =>
      '${isWanted ? 'want' : 'binder'}|$cardId';

  @override
  Map<String, Object?> identityFilter(String id) {
    final separator = id.indexOf('|');
    return {
      'is_wanted': id.substring(0, separator) == 'want',
      'card_id': id.substring(separator + 1),
    };
  }

  @override
  String fingerprint(BinderEntry value) => jsonEncode(value.toJson());

  @override
  DateTime fallbackTimestamp(BinderEntry value) => value.addedAt;

  /// Most recently added first, matching what the binder screen shows after a
  /// local add.
  @override
  int compare(BinderEntry a, BinderEntry b) => b.addedAt.compareTo(a.addedAt);

  @override
  Map<String, Object?> toRow(
    BinderEntry value, {
    required String userId,
    required DateTime updatedAt,
  }) {
    return {
      'user_id': userId,
      'card_id': value.card.id,
      'is_wanted': value.isWanted,
      'quantity': value.quantity,
      'condition': value.condition,
      'card': value.card.toStub(),
      'added_at': value.addedAt.toUtc().toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      // An entry being pushed is live by definition. Clearing this is what
      // resurrects a card the customer re-added after deleting it.
      'deleted_at': null,
    };
  }

  @override
  SyncRecord<BinderEntry>? fromRow(Map<String, dynamic> row) {
    final fields = readRowSyncFields(row);
    final cardId = row['card_id'] as String?;
    if (fields == null || cardId == null) return null;

    final id = _id(cardId, row['is_wanted'] as bool? ?? false);
    if (fields.deleted) {
      return SyncRecord<BinderEntry>.deleted(id: id, updatedAt: fields.updatedAt);
    }

    final stub = row['card'];
    if (stub is! Map) return null;

    return SyncRecord(
      id: id,
      value: BinderEntry(
        card: CardModel.fromStub(Map<String, dynamic>.from(stub)),
        quantity: (row['quantity'] as num?)?.toInt() ?? 1,
        condition: row['condition'] as String? ?? 'NM',
        isWanted: row['is_wanted'] as bool? ?? false,
        addedAt: DateTime.tryParse(row['added_at'] as String? ?? '') ??
            fields.updatedAt,
      ),
      updatedAt: fields.updatedAt,
    );
  }
}
