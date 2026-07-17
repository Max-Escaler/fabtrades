import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

/// Official FAB set logo URLs scraped from fabtcg.com marketing assets.
///
/// Bundled as `assets/setLogos.json` (same shape as the web app's
/// `public/setLogos.json`), keyed by TCGplayer group id — which matches
/// [CardModel.setId].
class SetLogoMap {
  const SetLogoMap(this._byGroupId);

  final Map<String, String> _byGroupId;

  static const empty = SetLogoMap({});

  /// Parse the scraped JSON blob. Tolerates either
  /// `{ "logos": { "2724": { "logoUrl": "…" } } }` or a flat
  /// `{ "2724": "https://…" }` map.
  factory SetLogoMap.fromJson(String jsonText) {
    final decoded = jsonDecode(jsonText);
    if (decoded is! Map) return empty;

    final raw = decoded['logos'] is Map
        ? decoded['logos'] as Map
        : decoded;
    final map = <String, String>{};
    for (final entry in raw.entries) {
      final key = entry.key.toString();
      final value = entry.value;
      String? url;
      if (value is String) {
        url = value;
      } else if (value is Map) {
        final logoUrl = value['logoUrl'];
        if (logoUrl is String) url = logoUrl;
      }
      if (url != null && url.isNotEmpty) map[key] = url;
    }
    return SetLogoMap(map);
  }

  String? urlForGroupId(int? groupId) {
    if (groupId == null) return null;
    return _byGroupId[groupId.toString()];
  }

  bool get isEmpty => _byGroupId.isEmpty;
  int get length => _byGroupId.length;
}

/// Load the bundled set-logo map. Returns [SetLogoMap.empty] on any failure
/// so the browse UI can fall back to set names without crashing.
Future<SetLogoMap> loadSetLogoMap() async {
  try {
    final jsonText = await rootBundle.loadString('assets/setLogos.json');
    return SetLogoMap.fromJson(jsonText);
  } catch (_) {
    return SetLogoMap.empty;
  }
}
