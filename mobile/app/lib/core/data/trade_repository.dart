import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/trade.dart';

class TradeRepository {
  TradeRepository(this._prefs);
  final SharedPreferences _prefs;
  static const _key = 'saved_trades';

  List<Trade> load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => Trade.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> save(List<Trade> trades) => _prefs.setString(
      _key, jsonEncode(trades.map((e) => e.toJson()).toList()));
}
