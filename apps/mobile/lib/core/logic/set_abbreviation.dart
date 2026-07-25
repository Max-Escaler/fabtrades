// Resolve display set codes for Browse Sets.
// TCGCSV often leaves abbreviation blank even when cards use a stable
// collector-number prefix (e.g. High Seas cards are SEA###).
// Reimplemented in JavaScript at `apps/web/src/utils/setAbbreviation.js`. Both are
// pinned to `packages/contracts/set_abbreviation.json`, so changing behaviour here
// without changing it there fails the web suite.

final _collectorPrefixRe = RegExp(r'^([A-Z]{1,5})\d');

/// First collector code from a TCGCSV-style number (handles "SEA004 // …").
String getPrimaryCollectorNumber(String? extNumber) {
  if (extNumber == null || extNumber.isEmpty) return '';
  final cleaned = extNumber.split(RegExp(r'\s*//\s*|\s*/\s*')).first;
  return cleaned.trim();
}

/// Letter prefix of a collector number (SEA004 → SEA). Empty when none.
String collectorNumberPrefix(String? collectorNumber) {
  final primary = getPrimaryCollectorNumber(collectorNumber).toUpperCase();
  final match = _collectorPrefixRe.firstMatch(primary);
  return match?.group(1) ?? '';
}

/// Infer a set code from card collector numbers when the catalog omits one.
///
/// Requires a clear majority prefix so mixed product lines (e.g. Silver Age
/// chapters with per-hero codes) stay blank rather than guessing.
String deriveSetAbbreviation(Iterable<String?> collectorNumbers) {
  final counts = <String, int>{};
  var total = 0;
  for (final value in collectorNumbers) {
    final prefix = collectorNumberPrefix(value);
    if (prefix.isEmpty || prefix == 'FAB') continue;
    counts[prefix] = (counts[prefix] ?? 0) + 1;
    total += 1;
  }
  if (total < 5) return '';

  var best = '';
  var bestCount = 0;
  for (final entry in counts.entries) {
    if (entry.value > bestCount) {
      best = entry.key;
      bestCount = entry.value;
    }
  }
  if (best.isEmpty || bestCount / total < 0.5) return '';
  return best;
}

/// Prefer [provided] when present; otherwise derive from [collectorNumbers].
String resolveSetAbbreviation(
  String? provided, [
  Iterable<String?> collectorNumbers = const [],
]) {
  final trimmed = (provided ?? '').trim();
  if (trimmed.isNotEmpty) return trimmed;
  return deriveSetAbbreviation(collectorNumbers);
}
