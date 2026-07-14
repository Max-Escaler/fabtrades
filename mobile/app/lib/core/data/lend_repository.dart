import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/lend_group.dart';

class LendRepository {
  LendRepository(this._prefs);
  final SharedPreferences _prefs;
  static const _key = 'lend_groups';

  List<LendGroup> load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => LendGroup.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> save(List<LendGroup> groups) => _prefs.setString(
      _key, jsonEncode(groups.map((g) => g.toJson()).toList()));
}
