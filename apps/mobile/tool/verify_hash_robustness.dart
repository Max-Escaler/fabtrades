/// Sanity-checks the generated hash asset against simulated camera conditions.
///
/// Takes a random sample of the real card images cached by
/// `generate_card_hashes.dart`, perturbs each one the way a phone camera
/// would (downscale, brightness/contrast shift, gaussian blur, and a slightly
/// misaligned crop), and reports how often `CardHashIndex.match` still
/// returns the right card confidently.
///
///     dart run tool/verify_hash_robustness.dart
library;

import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:fabtrades/core/scan/card_hash_index.dart';
import 'package:fabtrades/core/scan/phash.dart';
import 'package:image/image.dart' as img;

const _assetPath = 'assets/scan/card_hashes.json';
const _cacheDir = 'tool/.cache/images';
const _sampleSize = 150;

void main() {
  final index = CardHashIndex.fromJson(File(_assetPath).readAsStringSync());
  final hashByHex = {
    for (final e in index.entries)
      e.hash.map((b) => b.toRadixString(16).padLeft(2, '0')).join(): e,
  };

  final files = Directory(_cacheDir)
      .listSync()
      .whereType<File>()
      .toList()
    ..shuffle(math.Random(1234));
  final sample = files.take(_sampleSize).toList();

  var attempted = 0;
  var topHit = 0, candidateHit = 0, rejected = 0, wrong = 0;
  final rng = math.Random(99);

  for (final file in sample) {
    final decoded = img.decodeImage(file.readAsBytesSync());
    if (decoded == null) continue;

    // Which entry does this file's clean hash belong to?
    final cleanHash = _hash(decoded);
    final cleanHex =
        cleanHash.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    final expected = hashByHex[cleanHex];
    if (expected == null) continue; // not part of the asset (e.g. 403 leftovers)
    attempted++;

    // Simulate a camera capture of the card inside the guide rectangle:
    // downscale, lighting shift, blur, and a small random crop misalignment.
    var shot = img.copyResize(decoded, width: 280);
    shot = img.adjustColor(shot,
        brightness: 0.9 + rng.nextDouble() * 0.25,
        contrast: 0.85 + rng.nextDouble() * 0.2);
    shot = img.gaussianBlur(shot, radius: 1);
    final dx = (rng.nextDouble() * 0.06 - 0.03) * shot.width;
    final dy = (rng.nextDouble() * 0.06 - 0.03) * shot.height;
    final crop = img.copyCrop(
      shot,
      x: math.max(0, dx.round()),
      y: math.max(0, dy.round()),
      width: shot.width - dx.round().abs(),
      height: shot.height - dy.round().abs(),
    );

    final probe = _hash(crop);
    final matches = index.match(probe);
    if (matches.isEmpty) {
      rejected++;
    } else if (identical(matches.first.entry, expected)) {
      topHit++;
    } else if (matches.any((m) => identical(m.entry, expected))) {
      candidateHit++;
    } else {
      wrong++;
      final dExpected = hammingDistance(probe, expected.hash);
      stdout.writeln('  MISS ${file.uri.pathSegments.last}: '
          'best=${matches.first.distance} (${matches.first.entry.cardIds.first}), '
          'expected at d=$dExpected (${expected.cardIds.first}), '
          '${matches.length} candidates returned');
    }
  }

  stdout
    ..writeln('Verified $attempted perturbed card images:')
    ..writeln('  top-1 correct:        $topHit')
    ..writeln('  in candidate list:    $candidateHit')
    ..writeln('  rejected (no match):  $rejected')
    ..writeln('  WRONG top match:      $wrong');
}

Uint8List _hash(img.Image image) => phashOfImage(
      width: image.width,
      height: image.height,
      lumaAt: (x, y) {
        final p = image.getPixel(x, y);
        return 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
      },
    );
