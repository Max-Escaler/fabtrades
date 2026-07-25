// Contract tests for set-code resolution.
//
// These assert the shared fixtures in packages/contracts, which the JavaScript
// implementation in apps/web is held to as well. See
// packages/contracts/README.md.
import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/logic/set_abbreviation.dart';

import 'contract_fixtures.dart';

void main() {
  final contract = loadContract('set_abbreviation');

  group('getPrimaryCollectorNumber', () {
    for (final c in contractCases(contract, 'primaryCollectorNumber')) {
      final input = c['input'] as String?;
      final expected = c['expected'] as String;
      test('maps ${_show(input)} to ${_show(expected)}', () {
        expect(getPrimaryCollectorNumber(input), expected);
      });
    }
  });

  group('collectorNumberPrefix', () {
    for (final c in contractCases(contract, 'collectorNumberPrefix')) {
      final input = c['input'] as String?;
      final expected = c['expected'] as String;
      test('maps ${_show(input)} to ${_show(expected)}', () {
        expect(collectorNumberPrefix(input), expected);
      });
    }
  });

  group('deriveSetAbbreviation', () {
    for (final c in contractCases(contract, 'deriveSetAbbreviation')) {
      final numbers = _stringList(c['collectorNumbers']);
      final expected = c['expected'] as String;
      test('derives ${_show(expected)} from ${numbers.length} numbers', () {
        expect(deriveSetAbbreviation(numbers), expected);
      });
    }
  });

  group('resolveSetAbbreviation', () {
    for (final c in contractCases(contract, 'resolveSetAbbreviation')) {
      final provided = c['provided'] as String?;
      final numbers = _stringList(c['collectorNumbers']);
      final expected = c['expected'] as String;
      test('resolves ${_show(provided)} to ${_show(expected)}', () {
        expect(resolveSetAbbreviation(provided, numbers), expected);
      });
    }
  });
}

List<String?> _stringList(Object? value) =>
    (value as List).map((e) => e as String?).toList();

String _show(String? value) => value == null ? 'null' : '"$value"';
