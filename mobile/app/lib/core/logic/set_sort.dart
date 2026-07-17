/// Browse-list ordering for Flesh and Blood product groups.
///
/// Tiers (lower first):
///   0 — main expansions
///   1 — Armory Decks
///   2 — Silver Age
///   3 — other product lines (Blitz / Hero / packs / promos / etc.)
///
/// Categories are inferred from the set name; the catalog does not expose a
/// product-line enum for these buckets. Keep in sync with `src/utils/setSort.js`.

final _otherProductLinePatterns = <RegExp>[
  RegExp(r'^blitz deck\b', caseSensitive: false),
  RegExp(r'^hero deck\b', caseSensitive: false),
  RegExp(r'^welcome deck\b', caseSensitive: false),
  RegExp(r'^gem pack\b', caseSensitive: false),
  RegExp(r'^mastery pack\b', caseSensitive: false),
  RegExp(r'^historic pack\b', caseSensitive: false),
  RegExp(r'^classic battles\b', caseSensitive: false),
  RegExp(r'^1st strike\b', caseSensitive: false),
  RegExp(r'^compendium\b', caseSensitive: false),
  RegExp(r'^round the table\b', caseSensitive: false),
  RegExp(r'\bpromo cards\b', caseSensitive: false),
];

/// Browse-list tier for [name]. Lower sorts first.
int setBrowseTier(String? name) {
  final n = (name ?? '').trim();
  if (n.isEmpty) return 3;

  final lower = n.toLowerCase();
  if (lower.startsWith('armory deck')) return 1;
  if (lower.startsWith('silver age')) return 2;
  for (final re in _otherProductLinePatterns) {
    if (re.hasMatch(n)) return 3;
  }
  return 0;
}

/// Compare set names: tier first, then alphabetical within a tier.
int compareSetNamesByBrowseOrder(String a, String b) {
  final tierDiff = setBrowseTier(a) - setBrowseTier(b);
  if (tierDiff != 0) return tierDiff;
  return a.toLowerCase().compareTo(b.toLowerCase());
}
