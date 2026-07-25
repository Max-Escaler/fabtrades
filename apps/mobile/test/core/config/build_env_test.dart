import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The `env/*.json` files decide which Supabase project a build talks to, and the
/// app refuses to start without one. A malformed or half-filled file is therefore
/// a release that crashes on launch — cheap to catch here, expensive to catch in a
/// tester's crash report.
void main() {
  final files = Directory('env')
      .listSync()
      .whereType<File>()
      .where((f) => f.path.endsWith('.json'))
      .toList()
    ..sort((a, b) => a.path.compareTo(b.path));

  test('there is at least one build environment', () {
    expect(files, isNotEmpty);
  });

  for (final file in files) {
    final name = file.uri.pathSegments.last;
    final environment = name.replaceAll('.json', '');

    group(name, () {
      late Map<String, dynamic> values;

      setUp(() {
        values = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
      });

      test('declares every key the app reads', () {
        expect(
          values.keys,
          containsAll(['APP_ENV', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']),
        );
      });

      test('names the environment after its file', () {
        // Otherwise a staging build says "production" in Settings, which is worse
        // than saying nothing.
        expect(values['APP_ENV'], environment);
      });

      test('points at a real project, or none at all', () {
        // Blank is allowed: staging ships empty until the branch exists, and the
        // release workflows refuse to build from it. Half-filled is not.
        final url = values['SUPABASE_URL'] as String;
        final key = values['SUPABASE_PUBLISHABLE_KEY'] as String;
        if (url.isEmpty && key.isEmpty) return;

        expect(url, startsWith('https://'));
        expect(key, isNotEmpty);
      });
    });
  }

  test('production is filled in', () {
    final values = jsonDecode(File('env/production.json').readAsStringSync())
        as Map<String, dynamic>;

    expect(values['SUPABASE_URL'], startsWith('https://'));
    expect(values['SUPABASE_PUBLISHABLE_KEY'], isNotEmpty);
  });
}
