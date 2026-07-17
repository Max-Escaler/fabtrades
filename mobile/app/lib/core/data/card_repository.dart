import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/card_model.dart';

enum CardSort {
  nameAsc('Name (A–Z)'),
  priceDesc('Price (high → low)'),
  priceAsc('Price (low → high)'),
  numberAsc('Collector #');

  const CardSort(this.label);
  final String label;
}

class CardFilters {
  final String query;
  final String? setName;
  final bool foilOnly;
  final CardSort sort;

  const CardFilters({
    this.query = '',
    this.setName,
    this.foilOnly = false,
    this.sort = CardSort.nameAsc,
  });

  /// Filters the user can toggle while browsing a set (set itself excluded).
  bool get hasActiveFilters => foilOnly || sort != CardSort.nameAsc;

  CardFilters copyWith({
    String? query,
    Object? setName = _sentinel,
    bool? foilOnly,
    CardSort? sort,
  }) =>
      CardFilters(
        query: query ?? this.query,
        setName: setName == _sentinel ? this.setName : setName as String?,
        foilOnly: foilOnly ?? this.foilOnly,
        sort: sort ?? this.sort,
      );

  static const _sentinel = Object();
}

/// Builds the lowercased text a card is searched against: its name, plus
/// cleanName and collectorNumber when present (so number lookups still work).
String _searchableText(CardModel c) {
  final buffer = StringBuffer(c.name);
  if (c.cleanName != null) buffer..write(' ')..write(c.cleanName);
  if (c.collectorNumber != null) buffer..write(' ')..write(c.collectorNumber);
  return buffer.toString().toLowerCase();
}

/// Natural, token-based query matching: the query is split on whitespace into
/// tokens and a card matches when EVERY token appears somewhere in its
/// searchable text. This lets "Vex a" match "Vex - Apathetic" even though the
/// separator means "vex a" isn't a contiguous substring of the name.
bool _matchesQuery(CardModel c, List<String> tokens) {
  if (tokens.isEmpty) return true;
  final text = _searchableText(c);
  for (final t in tokens) {
    if (!text.contains(t)) return false;
  }
  return true;
}

/// Applies [filters] to an in-memory catalog (used for instant, offline
/// browsing). Mirrors the ordering the database previously produced.
List<CardModel> filterCards(List<CardModel> all, CardFilters filters) {
  final tokens = filters.query
      .toLowerCase()
      .split(RegExp(r'\s+'))
      .where((t) => t.isNotEmpty)
      .toList();
  final list = all.where((c) {
    if (isNonCardProduct(c)) return false;
    if (!_matchesQuery(c, tokens)) return false;
    if (filters.setName != null && c.setName != filters.setName) return false;
    if (filters.foilOnly && !c.isFoil) return false;
    return true;
  }).toList();

  int byPrice(double? a, double? b, {required bool asc}) {
    if (a == null && b == null) return 0;
    if (a == null) return 1; // nulls last
    if (b == null) return -1;
    return asc ? a.compareTo(b) : b.compareTo(a);
  }

  switch (filters.sort) {
    case CardSort.nameAsc:
      list.sort((a, b) =>
          a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    case CardSort.priceDesc:
      list.sort((a, b) => byPrice(a.tcgMarket, b.tcgMarket, asc: false));
    case CardSort.priceAsc:
      list.sort((a, b) => byPrice(a.tcgMarket, b.tcgMarket, asc: true));
    case CardSort.numberAsc:
      list.sort((a, b) {
        final an = a.collectorNumber;
        final bn = b.collectorNumber;
        if (an == null && bn == null) return 0;
        if (an == null) return 1;
        if (bn == null) return -1;
        return an.compareTo(bn);
      });
  }
  return list;
}

// ---------------------------------------------------------------------------
// Grouping printings by card name (for the grouped Browse view)
// ---------------------------------------------------------------------------

/// All printings/versions that share a single card name, plus the
/// "representative" printing whose price/art is shown on the collapsed row.
class CardGroup {
  const CardGroup({
    required this.name,
    required this.representative,
    required this.versions,
  });

  final String name;

  /// The base-rarity printing used for the collapsed row (see [_baseFirst]).
  final CardModel representative;

  /// Every printing in this group (base first), e.g. Normal / Foil / alt-art.
  final List<CardModel> versions;

  bool get hasMultiple => versions.length > 1;
}

/// Whether a catalog row is a sealed-style *product* rather than a real card —
/// e.g. "Origins - Champion Deck (Jinx)", box sets, Nexus Night promo packs,
/// pre-rift kits or bulk runes. These slip past the `is_sealed` filter but
/// uniquely lack BOTH a rarity and a collector number (real cards, including
/// numberless promos like "Buff", always have at least a rarity), so they are
/// hidden from browse/search and version lists.
bool isNonCardProduct(CardModel c) {
  final noRarity =
      c.rarity == null || c.rarity!.trim().isEmpty || c.rarity == 'None';
  final noNumber =
      c.collectorNumber == null || c.collectorNumber!.trim().isEmpty;
  return noRarity && noNumber;
}

/// The trailing parenthetical qualifier of a variant name, e.g.
/// "Ahri - Inquisitive (Overnumbered)" -> "Overnumbered", or null when the name
/// carries no qualifier.
String? nameQualifier(String name) {
  final match = RegExp(r'\(([^)]*)\)\s*$').firstMatch(name.trim());
  return match?.group(1);
}

/// Pitch colors are part of a Flesh and Blood card's identity: "Sink Below
/// (Red)", "Sink Below (Yellow)" and "Sink Below (Blue)" are three DIFFERENT
/// cards, so their parenthetical must be preserved when grouping.
const Set<String> _pitchQualifiers = {'red', 'yellow', 'blue'};

/// The base card name shared by every art/finish variant of a card, produced by
/// stripping trailing parenthetical qualifiers like "(Alternate Art)",
/// "(Extended Art)" or "(1st Edition)" — catalog conventions that are not part
/// of the real card name. Pitch-color qualifiers ("(Red)", "(Yellow)",
/// "(Blue)") are deliberately KEPT so the three pitch versions of a card stay
/// distinct groups.
String baseCardName(String name) {
  var s = name.trim();
  final re = RegExp(r'\s*\(([^)]*)\)\s*$');
  while (true) {
    final m = re.firstMatch(s);
    if (m == null) break;
    final inner = m.group(1)!.trim().toLowerCase();
    if (_pitchQualifiers.contains(inner)) break; // keep pitch color in the key
    final stripped = s.replaceFirst(re, '').trim();
    if (stripped.isEmpty) break; // don't strip a name that is only "(...)"
    s = stripped;
  }
  return s;
}

/// Ordering of Flesh and Blood rarities from most "base"/standard (0) to most
/// premium, used to choose which printing represents a group. Unknown rarities
/// sort last.
int rarityRank(String? rarity) {
  switch (rarity?.toLowerCase()) {
    case 'token':
    case 'basic':
      return 0;
    case 'common':
      return 1;
    case 'rare':
      return 2;
    case 'super rare':
      return 3;
    case 'majestic':
      return 4;
    case 'legendary':
      return 5;
    case 'fabled':
      return 6;
    case 'marvel':
      return 7;
    case 'promo':
      return 8;
    default:
      return 9;
  }
}

/// First run of digits in a collector number like "147/219" -> 147, used to
/// order printings within a group. Returns null when there is no number.
int? _leadingNumber(String? raw) {
  if (raw == null) return null;
  final match = RegExp(r'\d+').firstMatch(raw);
  return match == null ? null : int.tryParse(match.group(0)!);
}

/// Comparator that puts the most "base" printing first: non-foil before foil,
/// then lowest rarity, then a printing that actually has a price, then lowest
/// collector number. Used both to pick the representative and to order the
/// version list.
int _baseFirst(CardModel a, CardModel b) {
  if (a.isFoil != b.isFoil) return a.isFoil ? 1 : -1;
  final ra = rarityRank(a.rarity);
  final rb = rarityRank(b.rarity);
  if (ra != rb) return ra.compareTo(rb);
  final ap = a.tcgMarket ?? a.tcgLow;
  final bp = b.tcgMarket ?? b.tcgLow;
  if ((ap == null) != (bp == null)) return ap == null ? 1 : -1;
  final an = _leadingNumber(a.collectorNumber);
  final bn = _leadingNumber(b.collectorNumber);
  if (an != null && bn != null && an != bn) return an.compareTo(bn);
  return a.id.compareTo(b.id);
}

/// Groups [cards] by their [baseCardName] into [CardGroup]s, so every art/finish
/// variant of a card (e.g. Normal, Foil, Alternate Art, Overnumbered, Signature)
/// collapses into one entry. Groups are ordered by the requested [sort] (applied
/// to each group's representative printing). Assumes [cards] has already been
/// filtered by [filterCards].
List<CardGroup> groupCardsByName(List<CardModel> cards, CardSort sort) {
  final byName = <String, List<CardModel>>{};
  final order = <String>[];
  for (final c in cards) {
    final key = baseCardName(c.name);
    final list = byName[key];
    if (list == null) {
      byName[key] = [c];
      order.add(key);
    } else {
      list.add(c);
    }
  }

  final groups = <CardGroup>[];
  for (final key in order) {
    final versions = byName[key]!..sort(_baseFirst);
    groups.add(CardGroup(
      name: key,
      representative: versions.first,
      versions: versions,
    ));
  }

  int byPrice(double? a, double? b, {required bool asc}) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return asc ? a.compareTo(b) : b.compareTo(a);
  }

  switch (sort) {
    case CardSort.nameAsc:
      groups.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    case CardSort.priceDesc:
      groups.sort((a, b) => byPrice(
          a.representative.tcgMarket, b.representative.tcgMarket, asc: false));
    case CardSort.priceAsc:
      groups.sort((a, b) => byPrice(
          a.representative.tcgMarket, b.representative.tcgMarket, asc: true));
    case CardSort.numberAsc:
      groups.sort((a, b) {
        final an = a.representative.collectorNumber;
        final bn = b.representative.collectorNumber;
        if (an == null && bn == null) return 0;
        if (an == null) return 1;
        if (bn == null) return -1;
        return an.compareTo(bn);
      });
  }
  return groups;
}

/// All printings/variants of [card] found in the in-memory [catalog], i.e.
/// every row whose [baseCardName] matches (Normal, Foil, Alternate Art,
/// Overnumbered, Signature, … across every set), ordered base-first. Used by
/// the card detail screen's printing/version selector.
List<CardModel> printingsForCard(List<CardModel> catalog, CardModel card) {
  final base = baseCardName(card.name);
  final list = catalog
      .where((c) => !isNonCardProduct(c) && baseCardName(c.name) == base)
      .toList()
    ..sort(_baseFirst);
  return list.isEmpty ? [card] : list;
}

// ---------------------------------------------------------------------------
// Card scanning / OCR identification (runs fully offline against the catalog)
// ---------------------------------------------------------------------------

/// A collector number split into its printing index and (optional) set size,
/// e.g. "124/221" -> number 124, total 221. The `*` used by signature variants
/// ("225*/221") is ignored so it still parses to 225.
class ScanNumber {
  const ScanNumber(this.number, this.total);
  final int number;
  final int? total;
}

/// Matches a fractional "NNN/TTT" collector number (kept for robustness). Note
/// that most Flesh and Blood cards instead print a set-code identifier such as
/// "WTR001" or "1HB007" that carries no denominator, so scanning falls back to
/// name-based matching for those (see [identifyCards]).
final RegExp collectorNumberRegex = RegExp(r'(\d{1,3})\s*\*?\s*/\s*(\d{1,3})');

/// Every fractional "NNN/TTT" collector number found in a block of (OCR) text,
/// in reading order. Used both to gather candidates in [identifyCards] and to
/// boost the fused ranking in [fuseScanCandidates].
List<ScanNumber> parseScanNumbers(String text) => [
      for (final m in collectorNumberRegex.allMatches(text))
        ScanNumber(int.parse(m.group(1)!), int.parse(m.group(2)!)),
    ];

/// Parses a stored/scanned collector number. Falls back to a bare number when
/// no denominator is present.
ScanNumber? parseScanNumber(String? raw) {
  if (raw == null) return null;
  final pair = collectorNumberRegex.firstMatch(raw);
  if (pair != null) {
    return ScanNumber(int.parse(pair.group(1)!), int.parse(pair.group(2)!));
  }
  final single = RegExp(r'\d{1,4}').firstMatch(raw);
  if (single != null) return ScanNumber(int.parse(single.group(0)!), null);
  return null;
}

/// Common words dropped from name matching so they don't inflate overlap.
const Set<String> _nameStopwords = {
  'the', 'of', 'a', 'an', 'and', 'to', 'in', 'for', 'with',
};

/// The distinctive lowercase tokens of a card name, with any parenthetical
/// qualifier (e.g. "(Overnumbered)", "(Metal)") removed — those tags are a
/// catalog convention and are NOT printed on the physical card.
List<String> nameTokens(String name) {
  final withoutParens = name.replaceAll(RegExp(r'\([^)]*\)'), ' ');
  final normalized =
      withoutParens.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), ' ');
  return normalized
      .split(' ')
      .where((t) => t.length >= 2 && !_nameStopwords.contains(t))
      .toList();
}

/// Lowercased set of alphanumeric words in [text] (apostrophes/punctuation are
/// stripped so "Kai'Sa" -> "kaisa" matches the catalog's cleaned "KaiSa").
Set<String> _wordSet(String text) =>
    text.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), ' ').split(' ').where((t) => t.isNotEmpty).toSet();

/// Fraction of a card's distinctive name tokens present in [ocrWords] (0–1).
double _nameOverlap(CardModel card, Set<String> ocrWords) {
  final tokens = nameTokens(card.name);
  if (tokens.isEmpty) return 0;
  var matched = 0;
  for (final t in tokens) {
    if (ocrWords.contains(t)) matched++;
  }
  return matched / tokens.length;
}

/// Identifies the most likely card printings for a block of OCR
/// [recognizedText] against the in-memory [catalog]. Runs fully offline.
///
/// Strategy: when a printed "NNN/TTT" collector number is present it is the
/// most reliable identifier, so it is used first to gather candidates
/// (preferring matches where the set-size denominator also agrees). Most Flesh
/// and Blood cards lack that format, so scanning relies mainly on name. The card
/// name is then used to pick the right set/variant and to disambiguate numbers
/// that repeat across sets. When no number can be read, it falls back to a
/// strict name-only match. Returns [] when nothing is confident, best first.
List<CardModel> identifyCards(
  List<CardModel> catalog,
  String recognizedText, {
  int limit = 12,
}) {
  if (catalog.isEmpty || recognizedText.trim().isEmpty) return const [];
  final ocrWords = _wordSet(recognizedText);
  final ocrNumbers = parseScanNumbers(recognizedText);

  if (ocrNumbers.isNotEmpty) {
    final numeratorMatches = <CardModel>[];
    final fullMatches = <CardModel>[];
    for (final card in catalog) {
      final parsed = parseScanNumber(card.collectorNumber);
      if (parsed == null) continue;
      for (final n in ocrNumbers) {
        if (parsed.number != n.number) continue;
        numeratorMatches.add(card);
        if (parsed.total != null && parsed.total == n.total) {
          fullMatches.add(card);
        }
        break;
      }
    }
    // Prefer candidates whose set size (denominator) also matched.
    final candidates = fullMatches.isNotEmpty ? fullMatches : numeratorMatches;
    if (candidates.isNotEmpty) {
      return _rankByName(candidates, ocrWords, limit);
    }
  }

  // Fallback: no usable number was read — require every distinctive name token
  // to be present (avoids false hits from ability/flavour text), and prefer
  // cards whose names have MORE distinctive tokens so "Harmonized Kodachi"
  // outranks a shorter name that also fully matched a subset of the OCR words.
  final scored = <MapEntry<CardModel, int>>[];
  for (final card in catalog) {
    final tokens = nameTokens(card.name);
    if (tokens.isEmpty) continue;
    if (_nameOverlap(card, ocrWords) < 1.0) continue;
    scored.add(MapEntry(card, tokens.length));
  }
  if (scored.isEmpty) return const [];
  scored.sort((a, b) => b.value.compareTo(a.value));
  return [for (final e in scored.take(limit)) e.key];
}

/// Fuses the scanner's two candidate lists — visual (perceptual-hash) matches
/// and OCR (name/collector-number) matches — into one ranking using Reciprocal
/// Rank Fusion: score(card) = Σ 1/(k + rank in each list). A card found by
/// BOTH signals therefore outranks one found by either alone, which is how
/// production scanners disambiguate near-identical printings.
///
/// When [ocrNumbers] holds collector numbers read off the card, any candidate
/// whose own collector number agrees gets a [numberBonus] — the collector
/// number is the strongest disambiguator between near-identical printings, so a
/// visual match confirmed by the printed number should outrank one that isn't
/// (the "bonus weight for collector-number matches" pattern from qtran1018/TCG).
List<CardModel> fuseScanCandidates({
  required List<CardModel> visual,
  required List<CardModel> ocr,
  List<ScanNumber> ocrNumbers = const [],
  double numberBonus = 0.5,
  int limit = 12,
}) {
  if (visual.isEmpty && ocr.isEmpty) return const [];

  const k = 3.0;
  final scores = <String, double>{};
  final byId = <String, CardModel>{};
  void addList(List<CardModel> list) {
    for (var i = 0; i < list.length; i++) {
      final card = list[i];
      byId[card.id] = card;
      scores[card.id] = (scores[card.id] ?? 0) + 1 / (k + i);
    }
  }

  addList(visual);
  addList(ocr);

  if (ocrNumbers.isNotEmpty) {
    for (final entry in byId.entries) {
      final parsed = parseScanNumber(entry.value.collectorNumber);
      if (parsed == null) continue;
      final agrees = ocrNumbers.any((n) =>
          n.number == parsed.number &&
          (n.total == null || parsed.total == null || n.total == parsed.total));
      if (agrees) scores[entry.key] = (scores[entry.key] ?? 0) + numberBonus;
    }
  }

  final ranked = scores.entries.toList()
    ..sort((a, b) => b.value.compareTo(a.value));
  return [for (final e in ranked.take(limit)) byId[e.key]!];
}

/// Keeps the best name-matching group of number [candidates]. When the name
/// could not be read (all overlaps 0), returns the candidates as-is so the user
/// can disambiguate manually.
List<CardModel> _rankByName(
    List<CardModel> candidates, Set<String> ocrWords, int limit) {
  final scored = candidates
      .map((c) => MapEntry(c, _nameOverlap(c, ocrWords)))
      .toList()
    ..sort((a, b) => b.value.compareTo(a.value));
  final best = scored.first.value;
  final threshold = best > 0 ? best - 0.001 : -1.0;
  final result = <CardModel>[];
  final seen = <String>{};
  for (final e in scored) {
    if (e.value < threshold) break;
    if (seen.add(e.key.id)) result.add(e.key);
    if (result.length >= limit) break;
  }
  return result;
}

/// Finds the opposite-finish printing (Normal <-> Foil) of [card] within
/// [catalog], or null if this card has no alternate finish. Finishes of the
/// same physical card share a `product_id` and differ only by `is_foil`.
CardModel? oppositeFinish(List<CardModel> catalog, CardModel card) {
  for (final c in catalog) {
    if (c.isFoil == card.isFoil) continue;
    if (card.productId != null && c.productId == card.productId) return c;
    if (card.productId == null &&
        c.name == card.name &&
        c.collectorNumber == card.collectorNumber) {
      return c;
    }
  }
  return null;
}

/// Reads card + price data from the shared Supabase database.
class CardRepository {
  CardRepository(this._client);

  final SupabaseClient _client;

  static const String _view = 'fab_cards_with_prices';

  /// Fetches the entire (non-sealed) catalog for local caching. PostgREST caps
  /// a single response at 1000 rows, so page through with `range` until drained.
  Future<List<CardModel>> fetchAll() async {
    const pageSize = 1000;
    final all = <CardModel>[];
    var from = 0;
    while (true) {
      final rows = await _client
          .from(_view)
          .select()
          .eq('is_sealed', false)
          .order('name')
          .range(from, from + pageSize - 1);
      final list = rows as List;
      all.addAll(
          list.map((r) => CardModel.fromMap(r as Map<String, dynamic>)));
      if (list.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  /// All printings (normal/foil/alt) that share a card name.
  Future<List<CardModel>> printingsForName(String name) async {
    final rows = await _client
        .from(_view)
        .select()
        .eq('name', name)
        .eq('is_sealed', false)
        .order('is_foil');
    return (rows as List)
        .map((r) => CardModel.fromMap(r as Map<String, dynamic>))
        .toList();
  }

  /// Daily price snapshots for a printing (oldest → newest) for charts.
  Future<List<PricePoint>> priceHistory(String cardId) async {
    final rows = await _client
        .from('fab_price_history')
        .select()
        .eq('card_id', cardId)
        .order('captured_on');
    return (rows as List)
        .map((r) => PricePoint.fromMap(r as Map<String, dynamic>))
        .toList();
  }

  /// Look up printings by collector number (used by card scanning).
  Future<List<CardModel>> findByCollectorNumber(String collectorNumber) async {
    final rows = await _client
        .from(_view)
        .select()
        .eq('is_sealed', false)
        .eq('collector_number', collectorNumber);
    return (rows as List)
        .map((r) => CardModel.fromMap(r as Map<String, dynamic>))
        .toList();
  }

  /// The distinct set names present in [cards], alphabetically sorted. Flesh
  /// and Blood has ~100 expansions that grow over time, so — unlike a fixed
  /// list — the browsable set list is derived from whatever the pipeline has
  /// loaded. Non-card products (sealed boxes, etc.) are excluded.
  static List<String> setNamesFrom(Iterable<CardModel> cards) {
    final names = <String>{};
    for (final c in cards) {
      if (isNonCardProduct(c)) continue;
      final s = c.setName;
      if (s != null && s.trim().isNotEmpty) names.add(s);
    }
    final list = names.toList()
      ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return list;
  }
}
