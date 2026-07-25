import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

/// Official FAB set logo URLs scraped from fabtcg.com marketing assets.
///
/// Bundled as `assets/setLogos.json` (same shape as the web app's
/// `public/setLogos.json`), keyed by TCGplayer group id — which matches
/// [CardModel.setId].
class SetLogoMap {
  const SetLogoMap(this._urlsByGroupId, [this._abbreviationsByGroupId = const {}]);

  final Map<String, String> _urlsByGroupId;
  final Map<String, String> _abbreviationsByGroupId;

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
    final urls = <String, String>{};
    final abbreviations = <String, String>{};
    for (final entry in raw.entries) {
      final key = entry.key.toString();
      final value = entry.value;
      String? url;
      if (value is String) {
        url = value;
      } else if (value is Map) {
        final logoUrl = value['logoUrl'];
        if (logoUrl is String) url = logoUrl;
        final abbr = value['abbreviation'];
        if (abbr is String && abbr.trim().isNotEmpty) {
          abbreviations[key] = abbr.trim();
        }
      }
      if (url != null && url.isNotEmpty) urls[key] = url;
    }
    return SetLogoMap(urls, abbreviations);
  }

  String? urlForGroupId(int? groupId) {
    if (groupId == null) return null;
    return _urlsByGroupId[groupId.toString()];
  }

  /// TCGCSV abbreviation when the bundled map has one; otherwise null.
  String? abbreviationForGroupId(int? groupId) {
    if (groupId == null) return null;
    return _abbreviationsByGroupId[groupId.toString()];
  }

  /// All distinct logo CDN URLs (for disk/memory cache warming).
  Iterable<String> get urls => _urlsByGroupId.values;

  bool get isEmpty => _urlsByGroupId.isEmpty;
  int get length => _urlsByGroupId.length;
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
