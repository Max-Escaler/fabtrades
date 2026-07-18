// Browse-list ordering for Flesh and Blood product groups.
//
// Tiers (lower first):
//   0 — Main Sets
//   1 — Blitz Decks
//   2 — Armory Decks
//   3 — Silver Age
//   4 — Hero Decks
//   5 — Other
//
// Categories are inferred from the set name; the catalog does not expose a
// product-line enum for these buckets. Keep in sync with `src/utils/setSort.js`.

class BrowseTier {
  static const main = 0;
  static const blitz = 1;
  static const armory = 2;
  static const silverAge = 3;
  static const hero = 4;
  static const other = 5;
}

const _browseTierLabels = <int, String>{
  BrowseTier.main: 'Main Sets',
  BrowseTier.blitz: 'Blitz Decks',
  BrowseTier.armory: 'Armory Decks',
  BrowseTier.silverAge: 'Silver Age',
  BrowseTier.hero: 'Hero Decks',
  BrowseTier.other: 'Other',
};

final _otherProductLinePatterns = <RegExp>[
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
  if (n.isEmpty) return BrowseTier.other;

  final lower = n.toLowerCase();
  if (lower.startsWith('blitz deck')) return BrowseTier.blitz;
  if (lower.startsWith('armory deck')) return BrowseTier.armory;
  if (lower.startsWith('silver age')) return BrowseTier.silverAge;
  if (lower.startsWith('hero deck')) return BrowseTier.hero;
  for (final re in _otherProductLinePatterns) {
    if (re.hasMatch(n)) return BrowseTier.other;
  }
  return BrowseTier.main;
}

/// Human-readable section title for a browse [tier].
String browseTierLabel(int tier) =>
    _browseTierLabels[tier] ?? _browseTierLabels[BrowseTier.other]!;

/// Compare two sets: tier first, then newest [publishedOnA]/[publishedOnB]
/// within a tier, then name A–Z as a stable fallback.
int compareSetsByBrowseOrder(
  String nameA,
  String nameB, {
  DateTime? publishedOnA,
  DateTime? publishedOnB,
}) {
  final tierDiff = setBrowseTier(nameA) - setBrowseTier(nameB);
  if (tierDiff != 0) return tierDiff;

  final da = publishedOnA?.millisecondsSinceEpoch ?? 0;
  final db = publishedOnB?.millisecondsSinceEpoch ?? 0;
  if (db != da) return db - da;

  return nameA.toLowerCase().compareTo(nameB.toLowerCase());
}

/// Compare set names: tier first, then alphabetical within a tier.
int compareSetNamesByBrowseOrder(String a, String b) =>
    compareSetsByBrowseOrder(a, b);
