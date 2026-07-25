import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Release dates for Flesh and Blood product groups (TCGplayer group id →
/// `published_on` from `fab_sets`), so the browse list can sort newest-first
/// within each section. Loaded from Supabase and cached in SharedPreferences
/// for offline use.
class SetPublishedOnMap {
  const SetPublishedOnMap(this._byGroupId);

  final Map<String, DateTime> _byGroupId;

  static const empty = SetPublishedOnMap({});

  factory SetPublishedOnMap.fromEntries(Map<String, DateTime> byGroupId) =>
      SetPublishedOnMap(Map.unmodifiable(byGroupId));

  /// Parses the SharedPreferences / legacy JSON shape
  /// `{ "publishedOn": { "<groupId>": "<iso>" } }` (or a bare id→iso map).
  factory SetPublishedOnMap.fromJson(String jsonText) {
    final decoded = jsonDecode(jsonText);
    if (decoded is! Map) return empty;

    final raw = decoded['publishedOn'] is Map
        ? decoded['publishedOn'] as Map
        : decoded;
    final map = <String, DateTime>{};
    for (final entry in raw.entries) {
      final value = entry.value;
      if (value is! String || value.isEmpty) continue;
      final parsed = DateTime.tryParse(value);
      if (parsed != null) map[entry.key.toString()] = parsed;
    }
    return SetPublishedOnMap(map);
  }

  /// Build from `fab_sets` rows (`group_id`, `published_on`).
  factory SetPublishedOnMap.fromRows(Iterable<Map<String, dynamic>> rows) {
    final map = <String, DateTime>{};
    for (final row in rows) {
      final id = row['group_id'];
      final raw = row['published_on'];
      if (id == null || raw == null) continue;
      final parsed = DateTime.tryParse(raw.toString());
      if (parsed != null) map[id.toString()] = parsed;
    }
    return SetPublishedOnMap(map);
  }

  DateTime? forGroupId(int? groupId) {
    if (groupId == null) return null;
    return _byGroupId[groupId.toString()];
  }

  bool get isEmpty => _byGroupId.isEmpty;
  int get length => _byGroupId.length;

  String toJson() => jsonEncode({
        'publishedOn': {
          for (final e in _byGroupId.entries) e.key: e.value.toIso8601String(),
        },
      });
}

/// Local cache for set release dates so browse sorting works offline.
class SetPublishedOnRepository {
  SetPublishedOnRepository(this._prefs);
  final SharedPreferences _prefs;

  static const _key = 'set_published_on';

  SetPublishedOnMap? load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return null;
    try {
      final map = SetPublishedOnMap.fromJson(raw);
      return map.isEmpty ? null : map;
    } catch (_) {
      return null;
    }
  }

  Future<void> save(SetPublishedOnMap map) async {
    await _prefs.setString(_key, map.toJson());
  }
}
