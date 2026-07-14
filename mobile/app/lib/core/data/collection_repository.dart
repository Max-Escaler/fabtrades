import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/collection_entry.dart';

class CollectionRepository {
  CollectionRepository(this._prefs);
  final SharedPreferences _prefs;
  static const _key = 'collection_entries';

  List<CollectionEntry> load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) =>
              CollectionEntry.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> save(List<CollectionEntry> entries) => _prefs.setString(
      _key, jsonEncode(entries.map((e) => e.toJson()).toList()));
}
