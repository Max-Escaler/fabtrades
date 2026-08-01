import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'life_tracker_models.dart';

class LifeTrackerRepository {
  LifeTrackerRepository(this._prefs);

  final SharedPreferences _prefs;
  static const _key = 'life_tracker_state';
  static const maxHistory = 200;

  LifeTrackerState? load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return null;
    try {
      return LifeTrackerState.fromJson(
        jsonDecode(raw) as Map<String, dynamic>,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> save(LifeTrackerState state) async {
    var history = state.history;
    if (history.length > maxHistory) {
      history = history.sublist(history.length - maxHistory);
      state = state.copyWith(history: history);
    }
    await _prefs.setString(_key, jsonEncode(state.toJson()));
  }
}
