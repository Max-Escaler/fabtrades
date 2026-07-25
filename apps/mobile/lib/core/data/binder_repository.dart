import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/binder_entry.dart';

class BinderRepository {
  BinderRepository(this._prefs);
  final SharedPreferences _prefs;

  /// Legacy key kept so existing device data carries over untouched.
  static const _key = 'collection_entries';

  List<BinderEntry> load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) =>
              BinderEntry.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> save(List<BinderEntry> entries) => _prefs.setString(
      _key, jsonEncode(entries.map((e) => e.toJson()).toList()));
}
