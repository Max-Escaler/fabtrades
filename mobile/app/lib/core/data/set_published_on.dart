import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

/// Release dates for Flesh and Blood product groups (TCGplayer group id →
/// `publishedOn`), bundled from `productgroups.json` so the browse list can
/// sort newest-first within each section without a network round-trip.
///
/// Regenerated when `scripts/downloadCSVs.js` refreshes product groups.
class SetPublishedOnMap {
  const SetPublishedOnMap(this._byGroupId);

  final Map<String, DateTime> _byGroupId;

  static const empty = SetPublishedOnMap({});

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

  DateTime? forGroupId(int? groupId) {
    if (groupId == null) return null;
    return _byGroupId[groupId.toString()];
  }

  bool get isEmpty => _byGroupId.isEmpty;
  int get length => _byGroupId.length;
}

/// Load the bundled publishedOn map. Returns [SetPublishedOnMap.empty] on any
/// failure so browse can fall back to alphabetical order within a tier.
Future<SetPublishedOnMap> loadSetPublishedOnMap() async {
  try {
    final jsonText =
        await rootBundle.loadString('assets/setPublishedOn.json');
    return SetPublishedOnMap.fromJson(jsonText);
  } catch (_) {
    return SetPublishedOnMap.empty;
  }
}
