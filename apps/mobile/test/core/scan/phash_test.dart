import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:fabtrades/core/scan/card_hash_index.dart';
import 'package:fabtrades/core/scan/phash.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';

/// A deterministic smooth synthetic "card": a sum of low-frequency sinusoids,
/// evaluated at normalized coordinates so it can be rendered at any size.
double Function(double u, double v) _synthCard(int seed) {
  final rng = math.Random(seed);
  final components = List.generate(8, (_) {
    return (
      fu: rng.nextDouble() * 6,
      fv: rng.nextDouble() * 6,
      phase: rng.nextDouble() * 2 * math.pi,
      amp: rng.nextDouble(),
    );
  });
  return (u, v) {
    var s = 0.0;
    for (final c in components) {
      s += c.amp * math.sin(2 * math.pi * (c.fu * u + c.fv * v) + c.phase);
    }
    return 128 + 25 * s;
  };
}

Uint8List _hashAt(double Function(double, double) card, int w, int h,
    {double gain = 1, double bias = 0}) {
  return phashOfImage(
    width: w,
    height: h,
    lumaAt: (x, y) => gain * card((x + 0.5) / w, (y + 0.5) / h) + bias,
  );
}

void main() {
  group('phash', () {
    test('is stable across rendering resolutions', () {
      final card = _synthCard(1);
      final a = _hashAt(card, 200, 280);
      final b = _hashAt(card, 400, 560);
      expect(hammingDistance(a, b), lessThan(12));
    });

    test('is invariant to brightness/contrast changes', () {
      final card = _synthCard(2);
      final a = _hashAt(card, 200, 280);
      final b = _hashAt(card, 200, 280, gain: 0.7, bias: 30);
      expect(hammingDistance(a, b), lessThanOrEqualTo(2));
    });

    test('separates different images', () {
      final a = _hashAt(_synthCard(3), 200, 280);
      final b = _hashAt(_synthCard(4), 200, 280);
      expect(hammingDistance(a, b), greaterThan(80));
    });

    test('90°-rotated frame sampling matches the upright hash', () {
      final card = _synthCard(5);

      // Reference: hash the card image directly (upright, standard inset).
      final reference = _hashAt(card, 630, 880);

      // Simulate a portrait camera frame: raw sensor buffer is 1280×720
      // landscape, display rotation 90°. In rotated (720×1280) space the card
      // occupies a centered 400×559 guide region; everything else is
      // background.
      const rawW = 1280, rawH = 720;
      const rotW = 720.0, rotH = 1280.0;
      const guideW = 400.0, guideH = 559.0;
      const left = (rotW - guideW) / 2, top = (rotH - guideH) / 2;

      double lumaAt(int x, int y) {
        // Raw (x,y) → rotated coordinates (rotation 90: xr = rawH-1-y, yr = x).
        final xr = (rawH - 1 - y).toDouble();
        final yr = x.toDouble();
        final u = (xr - left) / guideW;
        final v = (yr - top) / guideH;
        if (u < 0 || u > 1 || v < 0 || v > 1) return 40; // background
        return card(u, v);
      }

      final grid = sampleLumaGrid(
        rawWidth: rawW,
        rawHeight: rawH,
        lumaAt: lumaAt,
        rotationDegrees: 90,
        left: left + guideW * kCardInsetFraction,
        top: top + guideH * kCardInsetFraction,
        width: guideW * (1 - 2 * kCardInsetFraction),
        height: guideH * (1 - 2 * kCardInsetFraction),
      );
      final probe = phashFromLuma(grid);
      expect(hammingDistance(reference, probe), lessThan(16));
    });
  });

  group('CardHashIndex', () {
    CardHashIndex buildIndex(int n, math.Random rng) {
      return CardHashIndex([
        for (var i = 0; i < n; i++)
          CardHashEntry(
            hash: Uint8List.fromList(
                List.generate(kHashBytes, (_) => rng.nextInt(256))),
            cardIds: ['card-$i'],
          ),
      ]);
    }

    test('matches a slightly corrupted known hash', () {
      final rng = math.Random(7);
      final index = buildIndex(400, rng);
      final probe = Uint8List.fromList(index.entries[42].hash);
      for (var i = 0; i < 10; i++) {
        final bit = rng.nextInt(kHashBits);
        probe[bit >> 3] ^= 1 << (bit & 7);
      }
      final matches = index.match(probe);
      expect(matches, isNotEmpty);
      expect(matches.first.entry.cardIds, ['card-42']);
      expect(matches.first.distance, 10);
    });

    test('rejects an unknown probe', () {
      final rng = math.Random(8);
      final index = buildIndex(400, rng);
      final probe = Uint8List.fromList(
          List.generate(kHashBytes, (_) => rng.nextInt(256)));
      expect(index.match(probe), isEmpty);
    });

    test('parses the real bundled asset', () async {
      TestWidgetsFlutterBinding.ensureInitialized();
      final jsonText =
          await rootBundle.loadString('assets/scan/card_hashes.json');
      final index = CardHashIndex.fromJson(jsonText);
      expect(index.entries.length, greaterThan(5000));
      expect(index.entries.first.hash.length, kHashBytes);
      expect(index.entries.first.cardIds, isNotEmpty);
    });

    test('round-trips through the asset JSON format', () {
      final rng = math.Random(9);
      final index = buildIndex(3, rng);
      final jsonText = json.encode({
        'version': 1,
        'hashBits': kHashBits,
        'entries': [
          for (final e in index.entries)
            {
              'h': e.hash
                  .map((b) => b.toRadixString(16).padLeft(2, '0'))
                  .join(),
              'ids': e.cardIds,
            },
        ],
      });
      final parsed = CardHashIndex.fromJson(jsonText);
      expect(parsed.entries.length, 3);
      for (var i = 0; i < 3; i++) {
        expect(hammingDistance(parsed.entries[i].hash, index.entries[i].hash),
            0);
        expect(parsed.entries[i].cardIds, index.entries[i].cardIds);
      }
    });
  });
}
