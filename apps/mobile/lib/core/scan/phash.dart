import 'dart:typed_data';
import 'dart:math' as math;

/// DCT-based perceptual hashing ("pHash") of card images, used by the scanner
/// to match a camera crop against precomputed hashes of the clean catalog
/// scans (see `tool/generate_card_hashes.dart`).
///
/// IMPORTANT: this file must stay pure Dart (no Flutter / dart:ui imports) so
/// the same code runs both inside the app and in the standalone generator via
/// `dart run` — guaranteeing the on-device hash matches the asset hashes
/// bit-for-bit.
///
/// Algorithm (the classic pHash recipe, sized up to 256 bits):
///  1. Sample the card region into a 64×64 grayscale grid.
///  2. 2D DCT-II of the grid.
///  3. Keep the 16×16 lowest-frequency coefficients (top-left block).
///  4. Threshold each coefficient against the median (DC term excluded),
///     yielding a 256-bit fingerprint compared by Hamming distance.

/// Side of the sampled grayscale grid.
const int kGraySide = 64;

/// Side of the low-frequency DCT block kept for the hash.
const int kHashSide = 16;

/// Total bits of the hash (the DC bit is always 0).
const int kHashBits = kHashSide * kHashSide;

/// Bytes per hash.
const int kHashBytes = kHashBits ~/ 8;

/// Fraction of the card region trimmed from every edge before sampling, so the
/// hash ignores the card border / rounded corners / background sliver both in
/// the catalog scans and in the camera crop.
const double kCardInsetFraction = 0.05;

// Scanner viewport / guide geometry. Kept in this pure module (rather than the
// camera-dependent frame_hasher.dart) so the rectifier, the offline evaluation
// harness, and tests can share it without importing Flutter plugins.

/// Width / height of the camera viewport box in the UI.
const double kViewportAspect = 3 / 4;

/// Guide width as a fraction of the visible preview width.
const double kGuideWidthFraction = 0.72;

/// Cap on guide height as a fraction of the visible preview height.
const double kGuideMaxHeightFraction = 0.92;

/// Physical trading-card aspect ratio (63 mm × 88 mm).
const double kCardAspect = 63 / 88;

/// Cosine tables for the 64-point DCT, indexed `[u * kGraySide + x]`.
/// Only the first [kHashSide] frequencies are ever needed.
final Float64List _dctTable = _buildDctTable();

Float64List _buildDctTable() {
  final table = Float64List(kHashSide * kGraySide);
  for (var u = 0; u < kHashSide; u++) {
    for (var x = 0; x < kGraySide; x++) {
      table[u * kGraySide + x] =
          math.cos((2 * x + 1) * u * math.pi / (2 * kGraySide));
    }
  }
  return table;
}

/// Computes the 256-bit perceptual hash of a [kGraySide]×[kGraySide] luma grid
/// (row-major, any consistent scale — the hash only depends on relative
/// magnitudes, so 0–1 and 0–255 inputs produce identical bits).
Uint8List phashFromLuma(Float64List luma) {
  assert(luma.length == kGraySide * kGraySide);

  // Separable DCT: rows first (64 rows → 16 coefficients each)…
  final rowDct = Float64List(kGraySide * kHashSide);
  for (var y = 0; y < kGraySide; y++) {
    final rowBase = y * kGraySide;
    for (var u = 0; u < kHashSide; u++) {
      var sum = 0.0;
      final tableBase = u * kGraySide;
      for (var x = 0; x < kGraySide; x++) {
        sum += luma[rowBase + x] * _dctTable[tableBase + x];
      }
      rowDct[y * kHashSide + u] = sum;
    }
  }
  // …then columns (only the 16×16 low-frequency block).
  final coeffs = Float64List(kHashSide * kHashSide);
  for (var v = 0; v < kHashSide; v++) {
    final tableBase = v * kGraySide;
    for (var u = 0; u < kHashSide; u++) {
      var sum = 0.0;
      for (var y = 0; y < kGraySide; y++) {
        sum += rowDct[y * kHashSide + u] * _dctTable[tableBase + y];
      }
      coeffs[v * kHashSide + u] = sum;
    }
  }

  // Median of all coefficients except the DC term.
  final sorted = coeffs.sublist(1)..sort();
  final mid = sorted.length ~/ 2;
  final median = sorted.length.isOdd
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;

  final hash = Uint8List(kHashBytes);
  // Bit 0 is the DC term and is deliberately left 0 on every hash.
  for (var i = 1; i < kHashBits; i++) {
    if (coeffs[i] > median) {
      hash[i >> 3] |= 1 << (i & 7);
    }
  }
  return hash;
}

final Uint8List _popcount = _buildPopcount();

Uint8List _buildPopcount() {
  final table = Uint8List(256);
  for (var i = 0; i < 256; i++) {
    var v = i, c = 0;
    while (v != 0) {
      c += v & 1;
      v >>= 1;
    }
    table[i] = c;
  }
  return table;
}

/// Number of differing bits between two hashes (0–[kHashBits]).
int hammingDistance(Uint8List a, Uint8List b) {
  assert(a.length == b.length);
  var d = 0;
  for (var i = 0; i < a.length; i++) {
    d += _popcount[a[i] ^ b[i]];
  }
  return d;
}

/// Samples an axis-aligned region of a source image into the [kGraySide]²
/// luma grid that [phashFromLuma] consumes, with bilinear interpolation.
///
/// The region ([left], [top], [width], [height]) is expressed in the
/// coordinates of the image *after* rotating the raw source clockwise by
/// [rotationDegrees] (0/90/180/270). Camera frames arrive in sensor
/// orientation, so the caller passes the same rotation it uses for display;
/// for regular upright images pass 0.
///
/// [lumaAt] returns the luminance of a raw pixel (any consistent scale).
Float64List sampleLumaGrid({
  required int rawWidth,
  required int rawHeight,
  required double Function(int x, int y) lumaAt,
  required int rotationDegrees,
  required double left,
  required double top,
  required double width,
  required double height,
}) {
  final grid = Float64List(kGraySide * kGraySide);
  for (var gy = 0; gy < kGraySide; gy++) {
    final yr = top + (gy + 0.5) / kGraySide * height;
    for (var gx = 0; gx < kGraySide; gx++) {
      final xr = left + (gx + 0.5) / kGraySide * width;
      final p = rotatedToRaw(xr, yr, rotationDegrees, rawWidth, rawHeight);
      grid[gy * kGraySide + gx] =
          bilinearLuma(p.x, p.y, rawWidth, rawHeight, lumaAt);
    }
  }
  return grid;
}

/// Maps a point ([xr], [yr]) in rotated display space back to raw sensor
/// coordinates, inverting a clockwise rotation of [rotationDegrees]
/// (0/90/180/270). Shared by [sampleLumaGrid] and the card rectifier so both
/// sample the exact same pixels for a given display-space location.
({double x, double y}) rotatedToRaw(
    double xr, double yr, int rotationDegrees, int rawWidth, int rawHeight) {
  switch (rotationDegrees) {
    case 90:
      return (x: yr, y: rawHeight - 1 - xr);
    case 180:
      return (x: rawWidth - 1 - xr, y: rawHeight - 1 - yr);
    case 270:
      return (x: rawWidth - 1 - yr, y: xr);
    default:
      return (x: xr, y: yr);
  }
}

/// Bilinearly interpolated luminance at fractional raw coordinates ([x], [y]),
/// clamped to the image bounds. [lumaAt] returns the luminance of an integer
/// raw pixel on any consistent scale.
double bilinearLuma(double x, double y, int rawWidth, int rawHeight,
    double Function(int x, int y) lumaAt) {
  final x0 = x.floor().clamp(0, rawWidth - 1);
  final y0 = y.floor().clamp(0, rawHeight - 1);
  final x1 = (x0 + 1).clamp(0, rawWidth - 1);
  final y1 = (y0 + 1).clamp(0, rawHeight - 1);
  final fx = (x - x0).clamp(0.0, 1.0);
  final fy = (y - y0).clamp(0.0, 1.0);
  final top = lumaAt(x0, y0) * (1 - fx) + lumaAt(x1, y0) * fx;
  final bottom = lumaAt(x0, y1) * (1 - fx) + lumaAt(x1, y1) * fx;
  return top * (1 - fy) + bottom * fy;
}

/// Convenience: hash a whole upright image (e.g. a decoded catalog scan),
/// applying the standard [kCardInsetFraction] edge trim.
Uint8List phashOfImage({
  required int width,
  required int height,
  required double Function(int x, int y) lumaAt,
}) {
  final insetX = width * kCardInsetFraction;
  final insetY = height * kCardInsetFraction;
  final grid = sampleLumaGrid(
    rawWidth: width,
    rawHeight: height,
    lumaAt: lumaAt,
    rotationDegrees: 0,
    left: insetX,
    top: insetY,
    width: width - 2 * insetX,
    height: height - 2 * insetY,
  );
  return phashFromLuma(grid);
}
