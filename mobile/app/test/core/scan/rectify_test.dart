import 'dart:math' as math;
import 'dart:typed_data';

import 'package:fabtrades/core/scan/phash.dart';
import 'package:fabtrades/core/scan/rectify.dart';
import 'package:flutter_test/flutter_test.dart';

/// A textured synthetic "card": low-frequency sinusoids clamped to a bright
/// band so the card/background boundary is always a strong edge for the
/// detector, while still carrying enough detail for a meaningful pHash.
double Function(double u, double v) _synthCard(int seed) {
  final rng = math.Random(seed);
  final comps = List.generate(6, (_) {
    return (
      fu: rng.nextDouble() * 5,
      fv: rng.nextDouble() * 5,
      phase: rng.nextDouble() * 2 * math.pi,
      amp: rng.nextDouble(),
    );
  });
  return (u, v) {
    var s = 0.0;
    for (final c in comps) {
      s += c.amp * math.sin(2 * math.pi * (c.fu * u + c.fv * v) + c.phase);
    }
    return (150 + 22 * s).clamp(80.0, 255.0);
  };
}

// Frame geometry mirroring frame_hasher.dart for rotation 0.
const _frameW = 675;
const _frameH = 900;

({double left, double top, double w, double h}) _guide() {
  var guideW = kGuideWidthFraction * _frameW;
  var guideH = guideW / kCardAspect;
  final maxH = kGuideMaxHeightFraction * _frameH;
  if (guideH > maxH) {
    guideH = maxH;
    guideW = guideH * kCardAspect;
  }
  return (left: (_frameW - guideW) / 2, top: (_frameH - guideH) / 2, w: guideW, h: guideH);
}

/// Frame luma for an axis-aligned card rectangle on a flat background.
double Function(int, int) _rectFrame(
    double Function(double, double) card, double rx, double ry, double rw, double rh,
    {double bg = 12}) {
  return (x, y) {
    final u = (x + 0.5 - rx) / rw;
    final v = (y + 0.5 - ry) / rh;
    if (u < 0 || u > 1 || v < 0 || v > 1) return bg;
    return card(u, v);
  };
}

/// Frame luma for a card rotated [deg] about the centre of rect (rx,ry,rw,rh).
double Function(int, int) _rotFrame(double Function(double, double) card,
    double rx, double ry, double rw, double rh, double deg,
    {double bg = 12}) {
  final cx = rx + rw / 2, cy = ry + rh / 2;
  final rad = deg * math.pi / 180;
  final cos = math.cos(-rad), sin = math.sin(-rad);
  return (x, y) {
    final dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    final lx = cx + dx * cos - dy * sin;
    final ly = cy + dx * sin + dy * cos;
    final u = (lx - rx) / rw;
    final v = (ly - ry) / rh;
    if (u < 0 || u > 1 || v < 0 || v > 1) return bg;
    return card(u, v);
  };
}

CardQuad? _detect(double Function(int, int) frame) {
  final g = _guide();
  return detectCardQuad(
    rawWidth: _frameW,
    rawHeight: _frameH,
    lumaAt: frame,
    rotationDegrees: 0,
    rotatedWidth: _frameW.toDouble(),
    rotatedHeight: _frameH.toDouble(),
    guideLeft: g.left,
    guideTop: g.top,
    guideWidth: g.w,
    guideHeight: g.h,
  );
}

int _baselineDistance(double Function(int, int) frame, Uint8List reference) {
  final g = _guide();
  final grid = sampleLumaGrid(
    rawWidth: _frameW,
    rawHeight: _frameH,
    lumaAt: frame,
    rotationDegrees: 0,
    left: g.left + g.w * kCardInsetFraction,
    top: g.top + g.h * kCardInsetFraction,
    width: g.w * (1 - 2 * kCardInsetFraction),
    height: g.h * (1 - 2 * kCardInsetFraction),
  );
  return hammingDistance(phashFromLuma(grid), reference);
}

int _rectifiedDistance(double Function(int, int) frame, Uint8List reference) {
  final quad = _detect(frame);
  expect(quad, isNotNull, reason: 'expected a card to be detected');
  final grid = sampleLumaQuad(
    rawWidth: _frameW,
    rawHeight: _frameH,
    lumaAt: frame,
    rotationDegrees: 0,
    quad: quad!,
  );
  return hammingDistance(phashFromLuma(grid), reference);
}

Uint8List _referenceHash(double Function(double, double) card) => phashOfImage(
      width: 630,
      height: 880,
      lumaAt: (x, y) => card((x + 0.5) / 630, (y + 0.5) / 880),
    );

void main() {
  group('detectCardQuad', () {
    test('locates an offset, smaller-than-guide card', () {
      final card = _synthCard(1);
      final g = _guide();
      final rx = g.left + 30, ry = g.top + 24;
      final rw = g.w * 0.85, rh = g.h * 0.85;
      final quad = _detect(_rectFrame(card, rx, ry, rw, rh));
      expect(quad, isNotNull);
      expect(quad!.tl.x, closeTo(rx, 16));
      expect(quad.tl.y, closeTo(ry, 16));
      expect(quad.br.x, closeTo(rx + rw, 16));
      expect(quad.br.y, closeTo(ry + rh, 16));
    });

    test('returns null on a flat, card-less frame', () {
      expect(_detect((x, y) => 128), isNull);
    });

    test('returns null on low-contrast noise', () {
      final rng = math.Random(3);
      // Uniform-ish field with tiny fluctuations: no coherent card outline.
      final noise = List.generate(
          _frameW * _frameH, (_) => 120 + rng.nextDouble() * 4);
      expect(_detect((x, y) => noise[y * _frameW + x]), isNull);
    });
  });

  group('rectified hashing beats the fixed guide crop', () {
    test('for an offset, smaller card', () {
      final card = _synthCard(7);
      final ref = _referenceHash(card);
      final g = _guide();
      final frame = _rectFrame(
          card, g.left + 34, g.top + 28, g.w * 0.8, g.h * 0.8);
      final baseline = _baselineDistance(frame, ref);
      final rectified = _rectifiedDistance(frame, ref);
      expect(rectified, lessThan(baseline));
      expect(rectified, lessThan(28));
    });

    test('for an in-plane rotated card', () {
      final card = _synthCard(9);
      final ref = _referenceHash(card);
      final g = _guide();
      final frame = _rotFrame(card, g.left, g.top, g.w, g.h, 8);
      final baseline = _baselineDistance(frame, ref);
      final rectified = _rectifiedDistance(frame, ref);
      expect(rectified, lessThan(baseline));
    });
  });

  test('sampleLumaQuad over the guide rect matches the fixed inset crop', () {
    final card = _synthCard(5);
    final g = _guide();
    final frame = _rectFrame(card, g.left, g.top, g.w, g.h);
    final quad = CardQuad(
      Point2(g.left, g.top),
      Point2(g.left + g.w, g.top),
      Point2(g.left + g.w, g.top + g.h),
      Point2(g.left, g.top + g.h),
    );
    final quadGrid = sampleLumaQuad(
      rawWidth: _frameW,
      rawHeight: _frameH,
      lumaAt: frame,
      rotationDegrees: 0,
      quad: quad,
    );
    final rectGrid = sampleLumaGrid(
      rawWidth: _frameW,
      rawHeight: _frameH,
      lumaAt: frame,
      rotationDegrees: 0,
      left: g.left + g.w * kCardInsetFraction,
      top: g.top + g.h * kCardInsetFraction,
      width: g.w * (1 - 2 * kCardInsetFraction),
      height: g.h * (1 - 2 * kCardInsetFraction),
    );
    expect(hammingDistance(phashFromLuma(quadGrid), phashFromLuma(rectGrid)),
        lessThan(4));
  });
}
