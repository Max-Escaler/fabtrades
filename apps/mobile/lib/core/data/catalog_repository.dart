import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/card_model.dart';

/// Persists the full card catalog locally so browsing is instant and works
/// offline. Card art is *not* stored here — it stays lazy-loaded over the
/// network via `cached_network_image`.
class CatalogRepository {
  CatalogRepository(this._prefs);
  final SharedPreferences _prefs;

  static const _key = 'card_catalog';
  static const _updatedKey = 'card_catalog_updated_at';

  List<CardModel>? load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return null;
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => CardModel.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> save(List<CardModel> cards) async {
    await _prefs.setString(
        _key, jsonEncode(cards.map((c) => c.toMap()).toList()));
    await _prefs.setString(_updatedKey, DateTime.now().toIso8601String());
  }

  DateTime? lastUpdated() {
    final raw = _prefs.getString(_updatedKey);
    if (raw == null) return null;
    return DateTime.tryParse(raw);
  }
}
