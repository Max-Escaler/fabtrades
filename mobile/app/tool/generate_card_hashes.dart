/// Generates the perceptual-hash asset used by the card scanner.
///
/// Downloads every (non-sealed, non-product) card image referenced by the
/// Supabase catalog, computes a 256-bit pHash per unique image with the exact
/// same code the app runs on camera frames (`lib/core/scan/phash.dart`), and
/// writes `assets/scan/card_hashes.json`.
///
/// Run from the `mobile/app/` directory whenever a new set is released:
///
///     dart run tool/generate_card_hashes.dart
///
/// Images are cached under `tool/.cache/images/` so re-runs only download new
/// cards. The tool ends by printing distance statistics between distinct
/// images so hash discriminability can be sanity-checked.
library;

import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:fabtrades/core/scan/phash.dart';

const _supabaseUrl = 'https://tenrvaghaspwdvnwvgrh.supabase.co';
const _supabaseKey = 'sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr';
const _outputPath = 'assets/scan/card_hashes.json';
const _cacheDir = 'tool/.cache/images';
const _downloadConcurrency = 8;

Future<void> main() async {
  final client = HttpClient();
  try {
    stdout.writeln('Fetching catalog from Supabase…');
    final rows = await _fetchCatalog(client);
    stdout.writeln('  ${rows.length} card printings (products excluded).');

    // Finishes share scans: group card ids by image URL and hash each image once.
    final idsByUrl = <String, List<String>>{};
    for (final row in rows) {
      final url = row.imageUrl;
      if (url == null || url.isEmpty) continue;
      idsByUrl.putIfAbsent(url, () => []).add(row.id);
    }
    stdout.writeln('  ${idsByUrl.length} unique images to hash.');

    Directory(_cacheDir).createSync(recursive: true);
    final urls = idsByUrl.keys.toList();
    final hashes = <String, String>{}; // url -> hex hash
    final failures = <String>[];

    var done = 0;
    for (var i = 0; i < urls.length; i += _downloadConcurrency) {
      final batch = urls.skip(i).take(_downloadConcurrency);
      await Future.wait(batch.map((url) async {
        try {
          final bytes = await _fetchImage(client, url);
          final decoded = img.decodeImage(bytes);
          if (decoded == null) throw const FormatException('undecodable image');
          hashes[url] = _hex(_hashDecodedImage(decoded));
        } catch (e) {
          failures.add('$url  ($e)');
        } finally {
          done++;
          if (done % 250 == 0 || done == urls.length) {
            stdout.writeln('  hashed $done/${urls.length}');
          }
        }
      }));
    }

    if (failures.isNotEmpty) {
      stdout.writeln('WARNING: ${failures.length} images failed:');
      failures.take(20).forEach((f) => stdout.writeln('  $f'));
    }

    final entries = [
      for (final url in urls)
        if (hashes.containsKey(url))
          {'h': hashes[url], 'ids': idsByUrl[url]},
    ];
    final out = File(_outputPath)..parent.createSync(recursive: true);
    out.writeAsStringSync(json.encode({
      'version': 1,
      'hashBits': kHashBits,
      'generatedAt': DateTime.now().toUtc().toIso8601String(),
      'entries': entries,
    }));
    stdout.writeln('Wrote ${entries.length} hashes to $_outputPath '
        '(${(out.lengthSync() / 1024).toStringAsFixed(0)} KB).');

    _printDistanceStats(entries);
  } finally {
    client.close();
  }
}

class _CatalogRow {
  _CatalogRow(this.id, this.imageUrl);
  final String id;
  final String? imageUrl;
}

Future<List<_CatalogRow>> _fetchCatalog(HttpClient client) async {
  const pageSize = 1000;
  final rows = <_CatalogRow>[];
  var from = 0;
  while (true) {
    final uri = Uri.parse('$_supabaseUrl/rest/v1/fab_cards_with_prices'
        '?select=id,image_url,rarity,collector_number&is_sealed=eq.false&order=id');
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
    final body = await response.transform(utf8.decoder).join();
    final page = json.decode(body) as List;
    for (final raw in page) {
      final r = raw as Map<String, dynamic>;
      // Same rule as the app's isNonCardProduct: rows with neither a rarity
      // nor a collector number are sealed-style products (decks, kits, bulk),
      // not scannable cards.
      final rarity = r['rarity'] as String?;
      final number = r['collector_number'] as String?;
      final noRarity =
          rarity == null || rarity.trim().isEmpty || rarity == 'None';
      final noNumber = number == null || number.trim().isEmpty;
      if (noRarity && noNumber) continue;
      rows.add(_CatalogRow(r['id'] as String, r['image_url'] as String?));
    }
    if (page.length < pageSize) return rows;
    from += pageSize;
  }
}

Future<Uint8List> _fetchImage(HttpClient client, String url) async {
  final cacheFile = File(
      '$_cacheDir/${url.hashCode.toUnsigned(32).toRadixString(16)}_${Uri.parse(url).pathSegments.last}');
  if (cacheFile.existsSync()) return cacheFile.readAsBytes();

  final request = await client.getUrl(Uri.parse(url));
  final response = await request.close();
  if (response.statusCode != 200) {
    throw HttpException('HTTP ${response.statusCode}');
  }
  final builder = BytesBuilder(copy: false);
  await for (final chunk in response) {
    builder.add(chunk);
  }
  final bytes = builder.takeBytes();
  cacheFile.writeAsBytesSync(bytes);
  return bytes;
}

Uint8List _hashDecodedImage(img.Image image) {
  return phashOfImage(
    width: image.width,
    height: image.height,
    lumaAt: (x, y) {
      final p = image.getPixel(x, y);
      return 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
    },
  );
}

String _hex(Uint8List bytes) =>
    bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

/// Reports how separated distinct card images are in hash space. With ~10k
/// images there are ~50M pairs, so the exact min / close-pair count is
/// computed streaming and the percentiles from a random sample of pairs.
void _printDistanceStats(List<Map<String, Object?>> entries) {
  final hashes =
      entries.map((e) => _unhex(e['h'] as String)).toList(growable: false);
  final n = hashes.length;
  if (n < 2) return;

  var minDist = kHashBits;
  var under20 = 0;
  var identical = 0;
  for (var i = 0; i < n; i++) {
    for (var j = i + 1; j < n; j++) {
      final d = hammingDistance(hashes[i], hashes[j]);
      if (d < minDist) minDist = d;
      if (d < 20) under20++;
      if (d == 0) identical++;
    }
  }

  final rng = math.Random(42);
  final sample = <int>[];
  for (var k = 0; k < 200000; k++) {
    final i = rng.nextInt(n);
    var j = rng.nextInt(n);
    if (i == j) j = (j + 1) % n;
    sample.add(hammingDistance(hashes[i], hashes[j]));
  }
  sample.sort();
  int pct(double p) => sample[(p * (sample.length - 1)).round()];

  stdout
    ..writeln('Inter-image distance stats ($n images):')
    ..writeln('  min=$minDist  identical pairs=$identical')
    ..writeln('  sampled p0.1%=${pct(0.001)}  p1%=${pct(0.01)}  '
        'median=${pct(0.5)}')
    ..writeln('  pairs closer than 20 bits: $under20 '
        '(these will surface as scan ties)');
}

Uint8List _unhex(String hex) {
  final bytes = Uint8List(hex.length ~/ 2);
  for (var i = 0; i < bytes.length; i++) {
    bytes[i] = int.parse(hex.substring(i * 2, i * 2 + 2), radix: 16);
  }
  return bytes;
}
