import 'dart:convert';

import '../models/lend_group.dart';
import 'sync_adapter.dart';
import 'sync_journal.dart';
import 'sync_record.dart';

/// Maps lend and borrow groups onto `public.lend_groups`.
///
/// A group's items travel as one JSONB value. There is no screen that edits a
/// single item independently of its group, so a finer merge granularity would cost
/// a join and a second set of tombstones without changing any outcome.
class LendSyncAdapter implements SyncAdapter<LendGroup> {
  const LendSyncAdapter();

  @override
  SyncDomain get domain => SyncDomain.lend;

  @override
  String get table => 'lend_groups';

  @override
  String get conflictTarget => 'user_id,client_id';

  @override
  String idOf(LendGroup value) => value.id;

  @override
  Map<String, Object?> identityFilter(String id) => {'client_id': id};

  @override
  String fingerprint(LendGroup value) => jsonEncode(value.toJson());

  @override
  DateTime fallbackTimestamp(LendGroup value) => value.createdAt;

  @override
  int compare(LendGroup a, LendGroup b) => b.createdAt.compareTo(a.createdAt);

  @override
  Map<String, Object?> toRow(
    LendGroup value, {
    required String userId,
    required DateTime updatedAt,
  }) {
    return {
      'user_id': userId,
      'client_id': value.id,
      'person_name': value.personName,
      'is_borrowing': value.isBorrowing,
      'items': value.items.map((i) => i.toJson()).toList(),
      'created_at': value.createdAt.toUtc().toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': null,
    };
  }

  @override
  SyncRecord<LendGroup>? fromRow(Map<String, dynamic> row) {
    final fields = readRowSyncFields(row);
    final id = row['client_id'] as String?;
    if (fields == null || id == null) return null;

    if (fields.deleted) {
      return SyncRecord<LendGroup>.deleted(id: id, updatedAt: fields.updatedAt);
    }

    return SyncRecord(
      id: id,
      value: LendGroup.fromJson({
        'id': id,
        'person_name': row['person_name'],
        'is_borrowing': row['is_borrowing'],
        'created_at': row['created_at'],
        'items': row['items'] ?? const [],
      }),
      updatedAt: fields.updatedAt,
    );
  }
}
