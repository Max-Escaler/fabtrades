/// Offline accuracy harness for the card scanner's visual (perceptual-hash)
/// pipeline.
///
/// It takes the clean catalog scans the app already hashes, renders each one
/// into a synthetic "camera frame" under a suite of augmentations (offset,
/// scale, in-plane rotation, perspective tilt, glare, blur, noise, lighting),
/// runs the exact on-device hashing code over that frame, and measures how
/// often the correct card comes back top-1 / top-3 against the real bundled
/// hash index. Every augmentation is scored twice — once with the plain fixed
/// guide crop (the "baseline") and once through the new card rectifier — so the
/// value of rectification is a number, not a guess.
///
/// This is the measurement tool the research calls for ("build an evaluation
/// harness first"): it gives a regression baseline and shows exactly which
/// conditions the pHash pipeline fails under, which is what tells you whether
/// the embedding (Phase 2) upgrade is worth it.
///
/// Run from the `mobile/app/` directory (images are cached under
/// `tool/.cache/images/`, so only the first run downloads):
///
///     dart run tool/evaluate_scan.dart --samples=200 --seed=1
///     dart run tool/evaluate_scan.dart --offline        # cached images only
///     dart run tool/evaluate_scan.dart --augs=offset,rotate10,tilt
library;

import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:image/image.dart' as img;

import 'package:fabtrades/core/scan/card_hash_index.dart';
import 'package:fabtrades/core/scan/phash.dart';
import 'package:fabtrades/core/scan/rectify.dart';

const _supabaseUrl = 'https://tenrvaghaspwdvnwvgrh.supabase.co';
const _supabaseKey = 'sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr';
const _hashAssetPath = 'assets/scan/card_hashes.json';
const _cacheDir = 'tool/.cache/images';

// Synthetic frame: upright, exactly the viewport aspect so the visible region
// equals the frame (BoxFit.cover is a no-op) and the guide geometry matches
// frame_hasher.dart with rotationDegrees == 0.
const _frameHeight = 900;
final int _frameWidth = (_frameHeight * kViewportAspect).round();

Future<void> main(List<String> args) async {
  final opts = _Options.parse(args);

  stdout.writeln('Loading hash index from $_hashAssetPath…');
  final index = CardHashIndex.fromJson(File(_hashAssetPath).readAsStringSync());
  final idToEntry = <String, CardHashEntry>{};
  for (final e in index.entries) {
    for (final id in e.cardIds) {
      idToEntry[id] = e;
    }
  }
  stdout.writeln('  ${index.entries.length} hashed images, '
      '${idToEntry.length} printing ids.');

  final client = HttpClient();
  final samples = <_Sample>[];
  try {
    final idToUrl = await _fetchCatalogUrls(client, opts.offline);
    stdout.writeln('  ${idToUrl.length} catalog ids with image URLs.');

    // One test subject per hashed image: pick a printing id that has a URL.
    final subjects = <MapEntry<CardHashEntry, String>>[];
    for (final entry in index.entries) {
      for (final id in entry.cardIds) {
        final url = idToUrl[id];
        if (url != null && url.isNotEmpty) {
          subjects.add(MapEntry(entry, url));
          break;
        }
      }
    }
    subjects.shuffle(math.Random(opts.seed));

    stdout.writeln('Preparing ${opts.samples} test subjects…');
    for (final s in subjects) {
      if (samples.length >= opts.samples) break;
      final bytes = await _loadImage(client, s.value, opts.offline);
      if (bytes == null) continue;
      final decoded = img.decodeImage(bytes);
      if (decoded == null) continue;
      samples.add(_Sample(entry: s.key, card: _CardLuma.from(decoded)));
      if (samples.length % 50 == 0) {
        stdout.writeln('  loaded ${samples.length}/${opts.samples}');
      }
    }
  } finally {
    client.close();
  }

  if (samples.isEmpty) {
    stderr.writeln('No test images available '
        '(try without --offline, or check network access).');
    exitCode = 1;
    return;
  }
  stdout.writeln('Evaluating on ${samples.length} cards across '
      '${opts.augmentations.length} augmentations…\n');

  final results = <String, _Stat>{
    for (final a in opts.augmentations) '${a.name}/baseline': _Stat(),
    for (final a in opts.augmentations) '${a.name}/rectified': _Stat(),
  };

  for (final sample in samples) {
    for (final aug in opts.augmentations) {
      final frame = aug.render(sample.card, math.Random(sample.hashCode));
      _score(results['${aug.name}/baseline']!, index, idToEntry, sample,
          _baselineHash(frame));
      _score(results['${aug.name}/rectified']!, index, idToEntry, sample,
          _rectifiedHash(frame));
    }
  }

  _report(opts.augmentations, results, samples.length);
}

// ---------------------------------------------------------------------------
// Hashing entry points — mirror frame_hasher.dart for rotationDegrees == 0.
// ---------------------------------------------------------------------------

({double left, double top, double w, double h}) _guideRect() {
  final visW = _frameWidth.toDouble(), visH = _frameHeight.toDouble();
  var guideW = kGuideWidthFraction * visW;
  var guideH = guideW / kCardAspect;
  final maxH = kGuideMaxHeightFraction * visH;
  if (guideH > maxH) {
    guideH = maxH;
    guideW = guideH * kCardAspect;
  }
  return (
    left: (visW - guideW) / 2,
    top: (visH - guideH) / 2,
    w: guideW,
    h: guideH,
  );
}

Uint8List _baselineHash(_Frame frame) {
  final g = _guideRect();
  final grid = sampleLumaGrid(
    rawWidth: _frameWidth,
    rawHeight: _frameHeight,
    lumaAt: frame.lumaAt,
    rotationDegrees: 0,
    left: g.left + g.w * kCardInsetFraction,
    top: g.top + g.h * kCardInsetFraction,
    width: g.w * (1 - 2 * kCardInsetFraction),
    height: g.h * (1 - 2 * kCardInsetFraction),
  );
  return phashFromLuma(grid);
}

Uint8List _rectifiedHash(_Frame frame) {
  final g = _guideRect();
  final quad = detectCardQuad(
    rawWidth: _frameWidth,
    rawHeight: _frameHeight,
    lumaAt: frame.lumaAt,
    rotationDegrees: 0,
    rotatedWidth: _frameWidth.toDouble(),
    rotatedHeight: _frameHeight.toDouble(),
    guideLeft: g.left,
    guideTop: g.top,
    guideWidth: g.w,
    guideHeight: g.h,
  );
  if (quad == null ||
      quadMatchesGuide(quad, g.left, g.top, g.w, g.h)) {
    return _baselineHash(frame);
  }
  return phashFromLuma(sampleLumaQuad(
    rawWidth: _frameWidth,
    rawHeight: _frameHeight,
    lumaAt: frame.lumaAt,
    rotationDegrees: 0,
    quad: quad,
  ));
}

void _score(_Stat stat, CardHashIndex index, Map<String, CardHashEntry> byId,
    _Sample sample, Uint8List probe) {
  final matches = index.match(probe);
  stat.total++;
  if (matches.isEmpty) {
    stat.rejected++;
    return;
  }
  // Credit any match that is the subject image or a byte-identical duplicate
  // (same art reprinted in another set), which is a genuine visual match rather
  // than an error of the pipeline.
  bool isCorrect(CardHashMatch m) =>
      identical(m.entry, sample.entry) ||
      hammingDistance(m.entry.hash, sample.entry.hash) == 0;
  if (matches.take(1).any(isCorrect)) stat.top1++;
  if (matches.take(3).any(isCorrect)) stat.top3++;
}

void _report(
    List<_Augmentation> augs, Map<String, _Stat> results, int n) {
  stdout.writeln('Accuracy over $n cards (top-1 / top-3, and reject rate):\n');
  stdout.writeln('  ${'augmentation'.padRight(16)}'
      '${'baseline'.padRight(24)}rectified');
  stdout.writeln('  ${'-' * 56}');
  for (final a in augs) {
    final b = results['${a.name}/baseline']!;
    final r = results['${a.name}/rectified']!;
    stdout.writeln('  ${a.name.padRight(16)}${b.fmt().padRight(24)}${r.fmt()}');
  }
  // Overall (unweighted mean across augmentations).
  final b = _Stat.sum(augs.map((a) => results['${a.name}/baseline']!));
  final r = _Stat.sum(augs.map((a) => results['${a.name}/rectified']!));
  stdout.writeln('  ${'-' * 56}');
  stdout.writeln('  ${'OVERALL'.padRight(16)}'
      '${b.fmt().padRight(24)}${r.fmt()}');
}

// ---------------------------------------------------------------------------
// Options & augmentation suite
// ---------------------------------------------------------------------------

class _Options {
  _Options(this.samples, this.seed, this.offline, this.augmentations);
  final int samples;
  final int seed;
  final bool offline;
  final List<_Augmentation> augmentations;

  static _Options parse(List<String> args) {
    final map = <String, String>{};
    var offline = false;
    for (final a in args) {
      if (a == '--offline') {
        offline = true;
      } else if (a.startsWith('--') && a.contains('=')) {
        final i = a.indexOf('=');
        map[a.substring(2, i)] = a.substring(i + 1);
      }
    }
    final all = _allAugmentations();
    var augs = all;
    if (map.containsKey('augs')) {
      final wanted = map['augs']!.split(',').map((s) => s.trim()).toSet();
      augs = all.where((a) => wanted.contains(a.name)).toList();
      if (augs.isEmpty) {
        stderr.writeln('No augmentations matched --augs; using all.');
        augs = all;
      }
    }
    return _Options(
      int.tryParse(map['samples'] ?? '') ?? 200,
      int.tryParse(map['seed'] ?? '') ?? 1,
      offline,
      augs,
    );
  }
}

class _Stat {
  int total = 0, top1 = 0, top3 = 0, rejected = 0;

  String fmt() {
    if (total == 0) return '—';
    String pct(int v) => '${(100 * v / total).toStringAsFixed(1)}%';
    return '${pct(top1)} / ${pct(top3)}  (rej ${pct(rejected)})';
  }

  static _Stat sum(Iterable<_Stat> stats) {
    final s = _Stat();
    for (final x in stats) {
      s.total += x.total;
      s.top1 += x.top1;
      s.top3 += x.top3;
      s.rejected += x.rejected;
    }
    return s;
  }
}

class _Sample {
  _Sample({required this.entry, required this.card});
  final CardHashEntry entry;
  final _CardLuma card;
}

/// A precomputed luma buffer for one clean catalog scan, sampled bilinearly in
/// normalized (u, v) ∈ [0, 1] space.
class _CardLuma {
  _CardLuma(this.buf, this.w, this.h);
  final Float32List buf;
  final int w;
  final int h;

  factory _CardLuma.from(img.Image image) {
    final w = image.width, h = image.height;
    final buf = Float32List(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        final p = image.getPixel(x, y);
        buf[y * w + x] = (0.299 * p.r + 0.587 * p.g + 0.114 * p.b).toDouble();
      }
    }
    return _CardLuma(buf, w, h);
  }

  double at(double u, double v) {
    final fx = (u * (w - 1)).clamp(0.0, w - 1.0);
    final fy = (v * (h - 1)).clamp(0.0, h - 1.0);
    final x0 = fx.floor(), y0 = fy.floor();
    final x1 = math.min(x0 + 1, w - 1), y1 = math.min(y0 + 1, h - 1);
    final tx = fx - x0, ty = fy - y0;
    final a = buf[y0 * w + x0], b = buf[y0 * w + x1];
    final c = buf[y1 * w + x0], d = buf[y1 * w + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) +
        (c * (1 - tx) + d * tx) * ty;
  }
}

/// A rendered synthetic frame: a luma(x, y) closure over the frame pixels.
class _Frame {
  _Frame(this.lumaAt);
  final double Function(int x, int y) lumaAt;
}

/// An augmentation places the card into the frame under some quad and photometry.
class _Augmentation {
  _Augmentation(this.name, this.render);
  final String name;
  final _Frame Function(_CardLuma card, math.Random rng) render;
}

List<_Augmentation> _allAugmentations() {
  final g = _guideRect();
  // Guide corners (TL, TR, BR, BL) in frame space.
  Point2 tl() => Point2(g.left, g.top);
  Point2 tr() => Point2(g.left + g.w, g.top);
  Point2 br() => Point2(g.left + g.w, g.top + g.h);
  Point2 bl() => Point2(g.left, g.top + g.h);

  // Places the card under [corners], on a light background, then applies an
  // optional per-uv (card space) and per-xy (frame space) photometric tweak.
  _Frame place(
    _CardLuma card,
    List<Point2> corners, {
    double background = 205,
    double Function(double u, double v, double base)? photometry,
    double Function(int x, int y, double base)? framePhotometry,
  }) {
    final inv = _Homography.squareToQuad(corners).inverse();
    double luma(int x, int y) {
      final uv = inv.apply(x + 0.5, y + 0.5);
      double value;
      if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) {
        value = background;
      } else {
        var c = card.at(uv.x, uv.y);
        if (photometry != null) c = photometry(uv.x, uv.y, c);
        value = c;
      }
      if (framePhotometry != null) value = framePhotometry(x, y, value);
      return value.clamp(0.0, 255.0);
    }

    return _Frame(luma);
  }

  List<Point2> guide() => [tl(), tr(), br(), bl()];

  List<Point2> scaledOffset(double scale, double dxFrac, double dyFrac) {
    final cx = g.left + g.w / 2, cy = g.top + g.h / 2;
    final hw = g.w * scale / 2, hh = g.h * scale / 2;
    final dx = g.w * dxFrac, dy = g.h * dyFrac;
    return [
      Point2(cx - hw + dx, cy - hh + dy),
      Point2(cx + hw + dx, cy - hh + dy),
      Point2(cx + hw + dx, cy + hh + dy),
      Point2(cx - hw + dx, cy + hh + dy),
    ];
  }

  List<Point2> rotated(double degrees) {
    final cx = g.left + g.w / 2, cy = g.top + g.h / 2;
    final rad = degrees * math.pi / 180;
    final cos = math.cos(rad), sin = math.sin(rad);
    Point2 rot(Point2 p) {
      final dx = p.x - cx, dy = p.y - cy;
      return Point2(cx + dx * cos - dy * sin, cy + dx * sin + dy * cos);
    }

    return [rot(tl()), rot(tr()), rot(br()), rot(bl())];
  }

  // Keystone: narrow the top edge so the card looks tilted back, like a card
  // photographed from slightly above.
  List<Point2> tilted(double amount) {
    final cx = g.left + g.w / 2;
    final topHalf = (g.w / 2) * (1 - amount);
    final topY = g.top + g.h * amount * 0.4;
    return [
      Point2(cx - topHalf, topY),
      Point2(cx + topHalf, topY),
      Point2(g.left + g.w, g.top + g.h),
      Point2(g.left, g.top + g.h),
    ];
  }

  double glare(double u, double v, double base, double cu, double cv) {
    final d2 = (u - cu) * (u - cu) + (v - cv) * (v - cv);
    return base + 170 * math.exp(-d2 / (2 * 0.04));
  }

  return [
    _Augmentation('clean', (c, r) => place(c, guide())),
    _Augmentation('bright',
        (c, r) => place(c, guide(), photometry: (u, v, b) => 0.7 * b + 45)),
    _Augmentation('inset90', (c, r) => place(c, scaledOffset(0.90, 0, 0))),
    _Augmentation('offset', (c, r) => place(c, scaledOffset(1.0, 0.07, 0.05))),
    _Augmentation(
        'small_offset', (c, r) => place(c, scaledOffset(0.82, -0.06, 0.05))),
    _Augmentation('rotate5', (c, r) => place(c, rotated(5))),
    _Augmentation('rotate10', (c, r) => place(c, rotated(10))),
    _Augmentation('tilt', (c, r) => place(c, tilted(0.16))),
    _Augmentation(
        'glare',
        (c, r) => place(c, guide(),
            photometry: (u, v, b) => glare(u, v, b, 0.4, 0.35))),
    _Augmentation(
        'blur',
        (c, r) => place(c, guide(), photometry: (u, v, b) {
              const e = 0.01;
              return (c.at(u - e, v) +
                      c.at(u + e, v) +
                      c.at(u, v - e) +
                      c.at(u, v + e) +
                      b) /
                  5;
            })),
    _Augmentation(
        'noise',
        (c, r) => place(c, guide(), framePhotometry: (x, y, b) {
              final h = (x * 73856093) ^ (y * 19349663);
              final n = ((h & 0xffff) / 0xffff - 0.5) * 2 * 22;
              return b + n;
            })),
  ];
}

// ---------------------------------------------------------------------------
// Minimal projective transform (unit square -> quad) and its inverse.
// ---------------------------------------------------------------------------

class _Homography {
  _Homography(this.m); // row-major 3x3
  final List<double> m;

  /// Maps the unit square corners (0,0),(1,0),(1,1),(0,1) to [q] (TL,TR,BR,BL).
  factory _Homography.squareToQuad(List<Point2> q) {
    final x0 = q[0].x, y0 = q[0].y;
    final x1 = q[1].x, y1 = q[1].y;
    final x2 = q[2].x, y2 = q[2].y;
    final x3 = q[3].x, y3 = q[3].y;
    final dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    final dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    double a, b, c, d, e, f, g, h;
    if (dx3.abs() < 1e-9 && dy3.abs() < 1e-9) {
      a = x1 - x0;
      b = x3 - x0;
      d = y1 - y0;
      e = y3 - y0;
      g = 0;
      h = 0;
    } else {
      final denom = dx1 * dy2 - dx2 * dy1;
      g = (dx3 * dy2 - dx2 * dy3) / denom;
      h = (dx1 * dy3 - dx3 * dy1) / denom;
      a = x1 - x0 + g * x1;
      b = x3 - x0 + h * x3;
      d = y1 - y0 + g * y1;
      e = y3 - y0 + h * y3;
    }
    c = x0;
    f = y0;
    return _Homography([a, b, c, d, e, f, g, h, 1]);
  }

  _Homography inverse() {
    final a = m[0], b = m[1], c = m[2];
    final d = m[3], e = m[4], f = m[5];
    final g = m[6], h = m[7], i = m[8];
    final det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    final id = det.abs() < 1e-12 ? 0.0 : 1 / det;
    return _Homography([
      (e * i - f * h) * id,
      (c * h - b * i) * id,
      (b * f - c * e) * id,
      (f * g - d * i) * id,
      (a * i - c * g) * id,
      (c * d - a * f) * id,
      (d * h - e * g) * id,
      (b * g - a * h) * id,
      (a * e - b * d) * id,
    ]);
  }

  Point2 apply(double x, double y) {
    final u = m[0] * x + m[1] * y + m[2];
    final v = m[3] * x + m[4] * y + m[5];
    final w = m[6] * x + m[7] * y + m[8];
    if (w.abs() < 1e-12) return const Point2(-1, -1);
    return Point2(u / w, v / w);
  }
}

// ---------------------------------------------------------------------------
// Catalog + image IO (mirrors tool/generate_card_hashes.dart)
// ---------------------------------------------------------------------------

Future<Map<String, String>> _fetchCatalogUrls(
    HttpClient client, bool offline) async {
  final cacheFile = File('$_cacheDir/catalog_urls.json');
  if (offline) {
    if (!cacheFile.existsSync()) {
      stderr.writeln('No cached catalog URLs at ${cacheFile.path}; '
          'run once without --offline first.');
      return {};
    }
    return (json.decode(cacheFile.readAsStringSync()) as Map)
        .map((k, v) => MapEntry(k as String, v as String));
  }
  final map = <String, String>{};
  const pageSize = 1000;
  var from = 0;
  while (true) {
    final uri = Uri.parse('$_supabaseUrl/rest/v1/fab_cards_with_prices'
        '?select=id,image_url&is_sealed=eq.false&order=id');
    final request = await client.getUrl(uri);
    request.headers
      ..set('apikey', _supabaseKey)
      ..set('Authorization', 'Bearer $_supabaseKey')
      ..set('Range-Unit', 'items')
      ..set('Range', '$from-${from + pageSize - 1}');
    final response = await request.close();
    if (response.statusCode >= 300) {
      throw HttpException('Supabase returned ${response.statusCode}');
    }
    final page = json.decode(await response.transform(utf8.decoder).join())
        as List;
    for (final raw in page) {
      final r = raw as Map<String, dynamic>;
      final url = r['image_url'] as String?;
      if (url != null && url.isNotEmpty) map[r['id'] as String] = url;
    }
    if (page.length < pageSize) {
      Directory(_cacheDir).createSync(recursive: true);
      cacheFile.writeAsStringSync(json.encode(map));
      return map;
    }
    from += pageSize;
  }
}

Future<Uint8List?> _loadImage(
    HttpClient client, String url, bool offline) async {
  final cacheFile = File('$_cacheDir/'
      '${url.hashCode.toUnsigned(32).toRadixString(16)}_'
      '${Uri.parse(url).pathSegments.last}');
  if (cacheFile.existsSync()) return cacheFile.readAsBytes();
  if (offline) return null;
  try {
    final request = await client.getUrl(Uri.parse(url));
    final response = await request.close();
    if (response.statusCode != 200) return null;
    final builder = BytesBuilder(copy: false);
    await for (final chunk in response) {
      builder.add(chunk);
    }
    final bytes = builder.takeBytes();
    Directory(_cacheDir).createSync(recursive: true);
    cacheFile.writeAsBytesSync(bytes);
    return bytes;
  } catch (_) {
    return null;
  }
}
