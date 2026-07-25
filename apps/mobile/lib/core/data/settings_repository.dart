import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_settings.dart';
import '../sync/sync_journal.dart';

class SettingsRepository {
  SettingsRepository(this._prefs, this._journal);
  final SharedPreferences _prefs;
  final SyncJournal _journal;
  static const _key = 'app_settings';

  /// Settings under a fixed journal id, because there is only ever one row.
  static const _recordId = 'settings';

  AppSettings load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return const AppSettings();
    try {
      return AppSettings.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return const AppSettings();
    }
  }

  /// Persists [settings] and records that a choice was made here.
  ///
  /// The journal entry is what distinguishes "the customer picked CardMarket" from
  /// "this device has never been touched and is showing defaults". Without it, a
  /// fresh install would push its defaults over a real preference set elsewhere.
  Future<void> save(AppSettings settings) async {
    final before = load();
    await saveSynced(settings);
    if (before == settings) return;
    await _journal.noteLocalWrite(
      SyncDomain.settings,
      before: const {},
      after: {_recordId: jsonEncode(settings.toJson())},
    );
  }

  /// Applies a value pulled from the server without claiming it was chosen here.
  Future<void> saveSynced(AppSettings settings) =>
      _prefs.setString(_key, jsonEncode(settings.toJson()));
}
