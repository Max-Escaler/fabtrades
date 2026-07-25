import 'dart:math' as math;
import 'dart:typed_data';

import 'phash.dart';

/// Lightweight card rectification for the scanner.
///
/// pHash compares *aligned* images, so a probe crop that is slightly offset,
/// smaller than the guide, or tilted shifts the hash and costs matches
/// (see the research note: "the critical dependency is accurate rectification
/// first"). Rather than trust the fixed guide rectangle, this finds the card's
/// four edges inside an expanded search region and returns the quadrilateral so
/// the frame hasher can sample the card itself — recovering offset, scale, and
/// modest perspective/tilt — then falls back to the guide rect when it isn't
/// confident, so it can never make matching worse than the old fixed crop.
///
/// Pure Dart (no Flutter imports) so the same code runs in the app and in the
/// offline `tool/evaluate_scan.dart` accuracy harness.

/// A point in rotated display-space coordinates.
class Point2 {
  const Point2(this.x, this.y);
  final double x;
  final double y;
}

/// A detected card quadrilateral, corners in clockwise order starting top-left.
class CardQuad {
  const CardQuad(this.tl, this.tr, this.br, this.bl);
  final Point2 tl;
  final Point2 tr;
  final Point2 br;
  final Point2 bl;

  /// Signed area (shoelace); positive when tl→tr→br→bl winds clockwise in the
  /// y-down image coordinate system.
  double get signedArea {
    final pts = [tl, tr, br, bl];
    var s = 0.0;
    for (var i = 0; i < 4; i++) {
      final a = pts[i];
      final b = pts[(i + 1) % 4];
      s += a.x * b.y - b.x * a.y;
    }
    return s / 2;
  }
}

/// Tuning knobs for [detectCardQuad], grouped so tests and the harness can
/// sweep them without a long parameter list.
class RectifyConfig {
  const RectifyConfig({
    this.searchMargin = 0.14,
    this.downsampleMax = 128,
    this.minInlierFraction = 0.45,
    this.strongEdgeFraction = 0.4,
    this.minContrastFraction = 0.12,
    this.maxResidualFraction = 0.05,
    this.aspectTolerance = 0.28,
    this.minAreaFraction = 0.30,
  });

  /// How far beyond the guide rectangle (as a fraction of guide size) to look
  /// for the real card edges, so a card larger than the guide is still found.
  final double searchMargin;

  /// Longest side, in pixels, of the low-res buffer the search region is
  /// sampled into for edge finding (bounds per-frame cost).
  final int downsampleMax;

  /// A side is only trusted if at least this fraction of its scan lines carry a
  /// strong edge.
  final double minInlierFraction;

  /// An edge on a scan line counts as "strong" when its gradient magnitude is
  /// at least this fraction of the strongest edge found along that side.
  final double strongEdgeFraction;

  /// Reject flat / card-less frames: the strongest edge on a side must exceed
  /// this fraction of the search region's luma dynamic range.
  final double minContrastFraction;

  /// Max RMS line-fit residual (as a fraction of the guide's smaller side) for
  /// a side to be accepted.
  final double maxResidualFraction;

  /// Allowed deviation of the detected quad's aspect from the card aspect.
  final double aspectTolerance;

  /// Minimum detected-quad area as a fraction of the guide area.
  final double minAreaFraction;
}

/// Attempts to locate the card quadrilateral inside a camera frame.
///
/// The guide rectangle ([guideLeft], [guideTop], [guideWidth], [guideHeight])
/// and the returned quad are both expressed in rotated display space — the same
/// coordinates the frame hasher already computes. [rotatedWidth]/[rotatedHeight]
/// bound the search so it never samples outside the frame. Returns null when no
/// confident card outline is found, signalling the caller to keep the fixed
/// guide crop.
CardQuad? detectCardQuad({
  required int rawWidth,
  required int rawHeight,
  required double Function(int x, int y) lumaAt,
  required int rotationDegrees,
  required double rotatedWidth,
  required double rotatedHeight,
  required double guideLeft,
  required double guideTop,
  required double guideWidth,
  required double guideHeight,
  double cardAspect = kCardAspect,
  RectifyConfig config = const RectifyConfig(),
}) {
  double lumaR(double xr, double yr) {
    final p = rotatedToRaw(xr, yr, rotationDegrees, rawWidth, rawHeight);
    return bilinearLuma(p.x, p.y, rawWidth, rawHeight, lumaAt);
  }

  // Search region: the guide grown by [searchMargin], clamped to the frame.
  final mx = guideWidth * config.searchMargin;
  final my = guideHeight * config.searchMargin;
  final sl = math.max(0.0, guideLeft - mx);
  final st = math.max(0.0, guideTop - my);
  final sr = math.min(rotatedWidth, guideLeft + guideWidth + mx);
  final sb = math.min(rotatedHeight, guideTop + guideHeight + my);
  final sw = sr - sl;
  final sh = sb - st;
  if (sw <= 8 || sh <= 8) return null;

  // Sample the search region into a low-res buffer for edge finding.
  final dh = config.downsampleMax;
  final dw = math.max(8, (config.downsampleMax * sw / sh).round());
  final buf = Float64List(dw * dh);
  for (var r = 0; r < dh; r++) {
    final yr = st + (r + 0.5) / dh * sh;
    for (var c = 0; c < dw; c++) {
      final xr = sl + (c + 0.5) / dw * sw;
      buf[r * dw + c] = lumaR(xr, yr);
    }
  }
  // Robust contrast from the 5th–95th percentiles, so a bright glare blob or a
  // dark shadow doesn't inflate the range and cause the real card/background
  // step to be dismissed as noise.
  final dynamicRange = _robustRange(buf);
  if (dynamicRange <= 0) return null;
  final minEdge = config.minContrastFraction * dynamicRange;

  // Buffer-column x → rotated x, buffer-row y → rotated y.
  double colToX(double c) => sl + (c + 0.5) / dw * sw;
  double rowToY(double r) => st + (r + 0.5) / dh * sh;

  // Vertical sides (left/right): for each row, the x of the strongest
  // horizontal gradient within the outer band on that side. The bands stop
  // short of centre so the card's own artwork doesn't masquerade as an edge.
  final leftPts = <_EdgePt>[];
  final rightPts = <_EdgePt>[];
  final rowStart = (dh * 0.08).round();
  final rowEnd = dh - rowStart;
  final leftBand = math.max(2, (dw * 0.42).round());
  final rightBand = math.min(dw - 1, (dw * 0.58).round());
  for (var r = rowStart; r < rowEnd; r++) {
    final base = r * dw;
    final y = rowToY(r.toDouble());
    _scanForEdge(
      read: (c) => buf[base + c],
      from: 1,
      to: leftBand,
      minEdge: minEdge,
      onFound: (c, mag) => leftPts.add(_EdgePt(colToX(c), y, mag)),
    );
    _scanForEdge(
      read: (c) => buf[base + c],
      from: rightBand,
      to: dw - 1,
      minEdge: minEdge,
      onFound: (c, mag) => rightPts.add(_EdgePt(colToX(c), y, mag)),
    );
  }

  // Horizontal sides (top/bottom): for each column, the y of the strongest
  // vertical gradient within the outer band.
  final topPts = <_EdgePt>[];
  final botPts = <_EdgePt>[];
  final colStart = (dw * 0.08).round();
  final colEnd = dw - colStart;
  final topBand = math.max(2, (dh * 0.42).round());
  final botBand = math.min(dh - 1, (dh * 0.58).round());
  for (var c = colStart; c < colEnd; c++) {
    final x = colToX(c.toDouble());
    _scanForEdge(
      read: (r) => buf[r * dw + c],
      from: 1,
      to: topBand,
      minEdge: minEdge,
      onFound: (r, mag) => topPts.add(_EdgePt(x, rowToY(r), mag)),
    );
    _scanForEdge(
      read: (r) => buf[r * dw + c],
      from: botBand,
      to: dh - 1,
      minEdge: minEdge,
      onFound: (r, mag) => botPts.add(_EdgePt(x, rowToY(r), mag)),
    );
  }

  final guideMin = math.min(guideWidth, guideHeight);
  final maxResidual = config.maxResidualFraction * guideMin;

  // Vertical sides fit x = a*y + b; horizontal sides fit y = c*x + d.
  final left = _fitLine(leftPts, rowEnd - rowStart, config, maxResidual,
      dependentIsX: true);
  final right = _fitLine(rightPts, rowEnd - rowStart, config, maxResidual,
      dependentIsX: true);
  final top = _fitLine(topPts, colEnd - colStart, config, maxResidual,
      dependentIsX: false);
  final bottom = _fitLine(botPts, colEnd - colStart, config, maxResidual,
      dependentIsX: false);
  if (left == null || right == null || top == null || bottom == null) {
    return null;
  }

  final tl = _intersect(left, top);
  final tr = _intersect(right, top);
  final br = _intersect(right, bottom);
  final bl = _intersect(left, bottom);
  if (tl == null || tr == null || br == null || bl == null) return null;

  final quad = CardQuad(tl, tr, br, bl);

  // Plausibility: convex, sane area, card-like aspect, inside the search band.
  if (!_isConvex(quad)) return null;
  final area = quad.signedArea.abs();
  if (area < config.minAreaFraction * guideWidth * guideHeight) return null;
  if (area > 1.25 * sw * sh) return null;

  final wTop = _dist(tl, tr), wBot = _dist(bl, br);
  final hLeft = _dist(tl, bl), hRight = _dist(tr, br);
  final avgW = (wTop + wBot) / 2, avgH = (hLeft + hRight) / 2;
  if (avgW <= 0 || avgH <= 0) return null;
  final aspect = avgW / avgH;
  if ((aspect - cardAspect).abs() > config.aspectTolerance) return null;

  final slack = 0.03 * guideMin;
  for (final p in [tl, tr, br, bl]) {
    if (p.x < sl - slack ||
        p.x > sr + slack ||
        p.y < st - slack ||
        p.y > sb + slack) {
      return null;
    }
  }
  return quad;
}

/// Samples the card described by [quad] (rotated-space corners) into the
/// [kGraySide]×[kGraySide] luma grid consumed by [phashFromLuma], trimming
/// [inset] of each edge exactly like the catalog hashes do.
Float64List sampleLumaQuad({
  required int rawWidth,
  required int rawHeight,
  required double Function(int x, int y) lumaAt,
  required int rotationDegrees,
  required CardQuad quad,
  double inset = kCardInsetFraction,
}) {
  final grid = Float64List(kGraySide * kGraySide);
  final span = 1 - 2 * inset;
  for (var gy = 0; gy < kGraySide; gy++) {
    final v = inset + (gy + 0.5) / kGraySide * span;
    for (var gx = 0; gx < kGraySide; gx++) {
      final u = inset + (gx + 0.5) / kGraySide * span;
      final topX = quad.tl.x * (1 - u) + quad.tr.x * u;
      final topY = quad.tl.y * (1 - u) + quad.tr.y * u;
      final botX = quad.bl.x * (1 - u) + quad.br.x * u;
      final botY = quad.bl.y * (1 - u) + quad.br.y * u;
      final xr = topX * (1 - v) + botX * v;
      final yr = topY * (1 - v) + botY * v;
      final p = rotatedToRaw(xr, yr, rotationDegrees, rawWidth, rawHeight);
      grid[gy * kGraySide + gx] =
          bilinearLuma(p.x, p.y, rawWidth, rawHeight, lumaAt);
    }
  }
  return grid;
}

/// The 5th–95th percentile spread of [buf], estimated from a bounded subsample
/// so the cost is independent of the buffer size.
double _robustRange(Float64List buf) {
  final n = buf.length;
  final stride = math.max(1, n ~/ 4000);
  final sample = <double>[for (var i = 0; i < n; i += stride) buf[i]]..sort();
  if (sample.length < 2) return 0;
  double at(double p) => sample[(p * (sample.length - 1)).round()];
  return at(0.95) - at(0.05);
}

/// True when [quad]'s corners all sit within [tolFraction] of the guide's
/// smaller side of the corresponding guide corner — i.e. the card already fills
/// the guide, so the proven fixed crop is as good as (and steadier than) the
/// detected quad.
bool quadMatchesGuide(
  CardQuad quad,
  double guideLeft,
  double guideTop,
  double guideWidth,
  double guideHeight, {
  double tolFraction = 0.05,
}) {
  final tol = tolFraction * math.min(guideWidth, guideHeight);
  final gl = guideLeft, gt = guideTop;
  final gr = guideLeft + guideWidth, gb = guideTop + guideHeight;
  bool near(Point2 p, double x, double y) =>
      (p.x - x).abs() <= tol && (p.y - y).abs() <= tol;
  return near(quad.tl, gl, gt) &&
      near(quad.tr, gr, gt) &&
      near(quad.br, gr, gb) &&
      near(quad.bl, gl, gb);
}

class _EdgePt {
  _EdgePt(this.x, this.y, this.mag);
  final double x;
  final double y;
  final double mag;
}

/// A fitted side line. Vertical sides are stored as x = [a]·y + [b]
/// ([dependentIsX] true); horizontal sides as y = [a]·x + [b].
class _Line {
  _Line(this.a, this.b, {required this.dependentIsX});
  final double a;
  final double b;
  final bool dependentIsX;
}

/// Finds the strongest central-difference gradient in [from, to) and reports
/// its index and magnitude when it clears [minEdge], refined to sub-pixel
/// precision by fitting a parabola to the peak and its two neighbours (this
/// removes the ~1-cell jitter that otherwise degrades already-aligned frames).
void _scanForEdge({
  required double Function(int i) read,
  required int from,
  required int to,
  required double minEdge,
  required void Function(double index, double mag) onFound,
}) {
  double gradAt(int i) => (read(i + 1) - read(i - 1)).abs();
  var bestMag = 0.0;
  var bestIdx = -1;
  for (var i = from; i < to; i++) {
    final g = gradAt(i);
    if (g > bestMag) {
      bestMag = g;
      bestIdx = i;
    }
  }
  if (bestIdx < 0 || bestMag < minEdge) return;

  var refined = bestIdx.toDouble();
  if (bestIdx - 1 >= from && bestIdx + 1 < to) {
    final gm = gradAt(bestIdx - 1);
    final g0 = gradAt(bestIdx);
    final gp = gradAt(bestIdx + 1);
    final denom = gm - 2 * g0 + gp;
    if (denom.abs() > 1e-9) {
      final offset = 0.5 * (gm - gp) / denom;
      if (offset.abs() <= 1) refined = bestIdx + offset;
    }
  }
  onFound(refined, bestMag);
}

/// Robust line fit over per-scan-line edge points. Keeps points whose gradient
/// magnitude is a large fraction of the strongest, then iteratively trims
/// residual outliers (e.g. points where a slanted corner was picked up instead
/// of the side) before a final least-squares fit. Rejects the side unless
/// enough lines carried a strong edge and the trimmed fit is tight.
_Line? _fitLine(List<_EdgePt> pts, int lineCount, RectifyConfig config,
    double maxResidual,
    {required bool dependentIsX}) {
  if (pts.isEmpty || lineCount <= 0) return null;
  var maxMag = 0.0;
  for (final p in pts) {
    if (p.mag > maxMag) maxMag = p.mag;
  }
  final threshold = config.strongEdgeFraction * maxMag;
  var inliers = [for (final p in pts) if (p.mag >= threshold) p];
  final needed = config.minInlierFraction * lineCount;
  if (inliers.length < needed) return null;

  // Fit dependent = a*independent + b. For vertical sides dependent=x,
  // independent=y; for horizontal sides dependent=y, independent=x.
  double indepOf(_EdgePt p) => dependentIsX ? p.y : p.x;
  double depOf(_EdgePt p) => dependentIsX ? p.x : p.y;

  var a = 0.0, b = 0.0;
  for (var pass = 0; pass < 3; pass++) {
    final fit = _leastSquares(inliers, indepOf, depOf);
    if (fit == null) return null;
    a = fit.$1;
    b = fit.$2;

    final residuals = [for (final p in inliers) (depOf(p) - (a * indepOf(p) + b)).abs()];
    final sorted = [...residuals]..sort();
    final mad = sorted[sorted.length ~/ 2];
    final trim = math.max(maxResidual, 3 * mad);
    final kept = [
      for (var i = 0; i < inliers.length; i++)
        if (residuals[i] <= trim) inliers[i]
    ];
    if (kept.length < needed) return null;
    if (kept.length == inliers.length) break; // converged
    inliers = kept;
  }

  var sse = 0.0;
  for (final p in inliers) {
    final resid = depOf(p) - (a * indepOf(p) + b);
    sse += resid * resid;
  }
  if (math.sqrt(sse / inliers.length) > maxResidual) return null;
  return _Line(a, b, dependentIsX: dependentIsX);
}

/// Ordinary least-squares fit of dependent = a·independent + b, or null when
/// the independent values are degenerate (all equal).
(double, double)? _leastSquares(List<_EdgePt> pts,
    double Function(_EdgePt) indepOf, double Function(_EdgePt) depOf) {
  final n = pts.length;
  var sumI = 0.0, sumD = 0.0, sumII = 0.0, sumID = 0.0;
  for (final p in pts) {
    final i = indepOf(p), d = depOf(p);
    sumI += i;
    sumD += d;
    sumII += i * i;
    sumID += i * d;
  }
  final denom = n * sumII - sumI * sumI;
  if (denom.abs() < 1e-9) return null;
  final a = (n * sumID - sumI * sumD) / denom;
  final b = (sumD - a * sumI) / n;
  return (a, b);
}

/// Intersection of a vertical side (x = a·y + b) with a horizontal side
/// (y = a·x + b).
Point2? _intersect(_Line vertical, _Line horizontal) {
  assert(vertical.dependentIsX && !horizontal.dependentIsX);
  final aL = vertical.a, bL = vertical.b; // x = aL*y + bL
  final cT = horizontal.a, dT = horizontal.b; // y = cT*x + dT
  final denom = 1 - cT * aL;
  if (denom.abs() < 1e-9) return null;
  final y = (cT * bL + dT) / denom;
  final x = aL * y + bL;
  return Point2(x, y);
}

double _dist(Point2 a, Point2 b) {
  final dx = a.x - b.x, dy = a.y - b.y;
  return math.sqrt(dx * dx + dy * dy);
}

/// True when the quad's corners all turn the same way (a simple, non
/// self-intersecting convex outline).
bool _isConvex(CardQuad q) {
  final pts = [q.tl, q.tr, q.br, q.bl];
  double? sign;
  for (var i = 0; i < 4; i++) {
    final a = pts[i];
    final b = pts[(i + 1) % 4];
    final c = pts[(i + 2) % 4];
    final cross =
        (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross.abs() < 1e-9) continue;
    final s = cross > 0 ? 1.0 : -1.0;
    if (sign == null) {
      sign = s;
    } else if (s != sign) {
      return false;
    }
  }
  return sign != null;
}
