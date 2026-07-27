import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Tour ids persisted under [storageKey]. Local-only — not part of cloud sync.
abstract final class OnboardingTourId {
  static const welcome = 'welcome';
  static const trade = 'trade';
  static const binder = 'binder';
  static const wantList = 'want_list';
  static const lend = 'lend';
  static const scan = 'scan';

  static const all = {
    welcome,
    trade,
    binder,
    wantList,
    lend,
    scan,
  };
}

/// Reads/writes the set of onboarding tour ids the user has already seen.
///
/// Stored under its own SharedPreferences key (not [AppSettings]) so a stale
/// remote settings row cannot replay the tour via last-write-wins sync.
class OnboardingRepository {
  OnboardingRepository(this._prefs);

  final SharedPreferences _prefs;

  static const storageKey = 'onboarding_v1';

  Set<String> load() {
    final raw = _prefs.getString(storageKey);
    if (raw == null) return {};
    try {
      final list = jsonDecode(raw) as List;
      return list.map((e) => e.toString()).toSet();
    } catch (_) {
      return {};
    }
  }

  Future<void> save(Set<String> seen) =>
      _prefs.setString(storageKey, jsonEncode(seen.toList()..sort()));
}
