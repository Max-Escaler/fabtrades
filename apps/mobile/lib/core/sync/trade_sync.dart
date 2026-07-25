import 'dart:convert';

import '../models/trade.dart';
import 'sync_adapter.dart';
import 'sync_journal.dart';
import 'sync_record.dart';

/// Maps saved trades onto `public.trades`, the one table that already had a client.
///
/// Web created it and still owns the columns it cares about — `name`, and the
/// pre-computed `have_total` / `want_total` / `diff` its history list renders. This
/// adapter fills those in even though mobile derives them, so a trade saved on a
/// phone reads correctly on the site without web having to recompute anything.
class TradeSyncAdapter implements SyncAdapter<Trade> {
  const TradeSyncAdapter();

  @override
  SyncDomain get domain => SyncDomain.trades;

  @override
  String get table => 'trades';

  @override
  String get conflictTarget => 'user_id,client_id';

  @override
  String idOf(Trade value) => value.id;

  @override
  Map<String, Object?> identityFilter(String id) => {'client_id': id};

  @override
  String fingerprint(Trade value) => jsonEncode(value.toJson());

  @override
  DateTime fallbackTimestamp(Trade value) => value.createdAt;

  @override
  int compare(Trade a, Trade b) => b.createdAt.compareTo(a.createdAt);

  @override
  Map<String, Object?> toRow(
    Trade value, {
    required String userId,
    required DateTime updatedAt,
  }) {
    return {
      'user_id': userId,
      'client_id': value.id,
      // Mobile trades are unnamed — they are identified by date and contents, the
      // way the history screen lists them. Web's save dialog requires a name.
      'name': null,
      'have_list': value.haveItems.map((e) => e.toJson()).toList(),
      'want_list': value.wantItems.map((e) => e.toJson()).toList(),
      'have_total': value.haveTotal,
      'want_total': value.wantTotal,
      'diff': value.delta,
      'notes': value.notes,
      'have_cash': value.haveCash,
      'want_cash': value.wantCash,
      'currency_symbol': value.currencySymbol,
      'created_at': value.createdAt.toUtc().toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': null,
    };
  }

  @override
  SyncRecord<Trade>? fromRow(Map<String, dynamic> row) {
    final fields = readRowSyncFields(row);
    final id = row['client_id'] as String?;
    if (fields == null || id == null) return null;

    if (fields.deleted) {
      return SyncRecord<Trade>.deleted(id: id, updatedAt: fields.updatedAt);
    }

    return SyncRecord(
      id: id,
      value: Trade(
        id: id,
        createdAt: DateTime.tryParse(row['created_at'] as String? ?? '') ??
            fields.updatedAt,
        notes: row['notes'] as String? ?? '',
        haveItems: _items(row['have_list']),
        wantItems: _items(row['want_list']),
        haveCash: (row['have_cash'] as num?)?.toDouble() ?? 0,
        wantCash: (row['want_cash'] as num?)?.toDouble() ?? 0,
        currencySymbol: row['currency_symbol'] as String? ?? '\$',
      ),
      updatedAt: fields.updatedAt,
    );
  }

  /// Skips lines that cannot be read rather than discarding the trade. A trade
  /// missing one card is still a useful record; a missing trade is not.
  static List<TradeItem> _items(Object? raw) {
    if (raw is! List) return const [];
    final items = <TradeItem>[];
    for (final entry in raw) {
      if (entry is! Map) continue;
      try {
        items.add(TradeItem.fromSharedJson(Map<String, dynamic>.from(entry)));
      } catch (_) {
        continue;
      }
    }
    return items;
  }
}
