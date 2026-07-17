import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'phash.dart';

/// One hashed catalog image and the printings that share it (Normal + Foil
/// finishes of a card use the same scan, so one hash maps to several ids).
class CardHashEntry {
  const CardHashEntry({required this.hash, required this.cardIds});

  final Uint8List hash;
  final List<String> cardIds;
}

/// A confident visual match: one catalog image plus its Hamming distance.
class CardHashMatch {
  const CardHashMatch(this.entry, this.distance);

  final CardHashEntry entry;
  final int distance;
}

/// Precomputed perceptual hashes for every catalog image, with brute-force
/// Hamming-distance matching. Even at ~10k entries a full scan is a fraction
/// of a millisecond (32 XOR+popcount ops per entry), so no index structure is
/// needed.
class CardHashIndex {
  CardHashIndex(this.entries);

  final List<CardHashEntry> entries;

  /// Parses the JSON produced by `tool/generate_card_hashes.dart`:
  /// `{"version":1,"hashBits":256,"entries":[{"h":"<hex>","ids":[...]}]}`.
  factory CardHashIndex.fromJson(String jsonText) {
    final map = json.decode(jsonText) as Map<String, dynamic>;
    final bits = map['hashBits'] as int;
    if (bits != kHashBits) {
      throw FormatException(
          'Hash asset has $bits-bit hashes but the app expects $kHashBits. '
          'Regenerate with tool/generate_card_hashes.dart.');
    }
    final entries = <CardHashEntry>[];
    for (final raw in map['entries'] as List) {
      final e = raw as Map<String, dynamic>;
      entries.add(CardHashEntry(
        hash: _hexToBytes(e['h'] as String),
        cardIds: (e['ids'] as List).cast<String>(),
      ));
    }
    return CardHashIndex(entries);
  }

  /// Matches a probe hash against the catalog. Returns the confident
  /// candidates best-first, or an empty list when the probe doesn't look like
  /// any known card (e.g. the frame shows a desk, a hand, or a blurry mess).
  ///
  /// Confidence uses the outlier test from tmikonen's magic_card_detector: a
  /// non-card probe has near-random distances to every entry (a tight bell
  /// curve around ~half the hash bits), so a genuine match shows up as a big
  /// negative outlier from that distribution. Entries within [tieMargin] bits
  /// of the best are all returned so near-identical printings (alt arts,
  /// reprints) surface together for OCR/user disambiguation.
  List<CardHashMatch> match(
    Uint8List probe, {
    double sigmaThreshold = 5.0,
    int tieMargin = 6,
    int maxCandidates = 8,
    /// When set, receives `(bestDistance, meanDistance, zScore)` for every
    /// probe — including rejected ones — so the scanner diagnostic can show
    /// why a frame failed the outlier gate.
    void Function(int best, double mean, double z)? onStats,
  }) {
    if (entries.isEmpty) return const [];

    final distances = Int32List(entries.length);
    var sum = 0.0, sumSq = 0.0;
    var best = kHashBits + 1;
    for (var i = 0; i < entries.length; i++) {
      final d = hammingDistance(probe, entries[i].hash);
      distances[i] = d;
      sum += d;
      sumSq += d * d;
      if (d < best) best = d;
    }
    final n = entries.length;
    final mean = sum / n;
    final variance = math.max(0, sumSq / n - mean * mean);
    final sigma = math.sqrt(variance);
    final z = sigma == 0 ? 0.0 : (mean - best) / sigma;
    onStats?.call(best, mean, z);

    // Reject when the best hit isn't clearly separated from the noise floor.
    if (sigma == 0 || z < sigmaThreshold) return const [];

    final matches = <CardHashMatch>[];
    for (var i = 0; i < n; i++) {
      if (distances[i] <= best + tieMargin) {
        matches.add(CardHashMatch(entries[i], distances[i]));
      }
    }
    matches.sort((a, b) => a.distance.compareTo(b.distance));
    if (matches.length > maxCandidates) {
      matches.removeRange(maxCandidates, matches.length);
    }
    return matches;
  }

  static Uint8List _hexToBytes(String hex) {
    final bytes = Uint8List(hex.length ~/ 2);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = int.parse(hex.substring(i * 2, i * 2 + 2), radix: 16);
    }
    return bytes;
  }
}
