import '../data/settings_repository.dart';
import '../models/app_settings.dart';
import 'remote_store.dart';
import 'sync_journal.dart';

/// Reconciles `AppSettings` against the single `public.user_settings` row.
///
/// Not routed through `CollectionSync` because there is no collection: one row, no
/// identity to reconcile, no tombstone (deleting settings and resetting them are the
/// same thing). All that is left of the merge is comparing two timestamps, and
/// expressing that as a one-element collection would obscure rather than share.
class SettingsSync {
  SettingsSync({
    required this.repository,
    required this.remote,
    required this.journal,
  });

  final SettingsRepository repository;
  final RemoteSettings remote;
  final SyncJournal journal;

  /// The journal keys settings under a fixed id because there is only ever one.
  static const _recordId = 'settings';

  Future<bool> run({required String userId}) async {
    final startedAt = journal.syncStart(SyncDomain.settings);
    final local = repository.load();
    final localUpdatedAt = journal.localTimestamps(SyncDomain.settings)[_recordId];

    final row = await remote.fetch(userId);

    final remoteUpdatedAt = row == null
        ? null
        : DateTime.tryParse(row['updated_at'] as String? ?? '')?.toUtc();

    // Settings have defaults, so an untouched local copy is not evidence of intent.
    // Without a journal entry there is nothing to weigh against the server, and
    // pushing would overwrite a real choice made on another device with a default.
    final remoteWins = remoteUpdatedAt != null &&
        (localUpdatedAt == null || remoteUpdatedAt.isAfter(localUpdatedAt));

    if (remoteWins) {
      final merged = AppSettings(
        source: _parse(row!['price_source'], PriceSource.values,
            PriceSource.tcgplayer),
        themeMode:
            _parse(row['theme_mode'], AppThemeMode.values, AppThemeMode.dark),
      );
      final changed = merged != local;
      if (changed) await repository.saveSynced(merged);
      await _stamp(remoteUpdatedAt, preserveAfter: startedAt);
      return changed;
    }

    if (localUpdatedAt == null) return false;
    if (remoteUpdatedAt == localUpdatedAt) return false;

    await remote.upsert(
      userId: userId,
      priceSource: local.source.name,
      themeMode: local.themeMode.name,
      updatedAt: localUpdatedAt,
    );

    return false;
  }

  Future<void> _stamp(
    DateTime? at, {
    required DateTime preserveAfter,
  }) {
    return journal.replaceRecords(
      SyncDomain.settings,
      live: at == null ? const {} : {_recordId: at},
      preserveAfter: preserveAfter,
      observed: at,
    );
  }

  static T _parse<T extends Enum>(Object? raw, List<T> values, T fallback) {
    for (final value in values) {
      if (value.name == raw) return value;
    }
    return fallback;
  }
}
