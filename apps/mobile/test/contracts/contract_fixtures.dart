import 'dart:convert';
import 'dart:io';

/// Loads a shared contract fixture from `packages/contracts`.
///
/// These fixtures are also read by the web app's Jest suite, so both
/// implementations of the same rule are held to one set of expected values.
/// See `packages/contracts/README.md`.
///
/// `flutter test` runs with the package root (`apps/mobile`) as the working
/// directory, so the fixtures sit two levels up.
Map<String, dynamic> loadContract(String name) {
  final file = File('../../packages/contracts/$name.json');
  if (!file.existsSync()) {
    throw StateError(
      'Contract fixture not found at ${file.absolute.path}. '
      'Run `flutter test` from apps/mobile so relative paths resolve.',
    );
  }
  return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
}

/// Fixture rows are `List<dynamic>` off the wire; this narrows them once so the
/// tests read cleanly.
List<Map<String, dynamic>> contractCases(
  Map<String, dynamic> contract,
  String key,
) =>
    (contract[key] as List)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
