import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/data/card_repository.dart';

import '../../support/fixtures.dart';

void main() {
  group('pitch ranking from OCR (current behavior)', () {
    final catalog = [
      buildCard(id: 'y', name: 'Sink Below (Yellow)', collectorNumber: '102/220'),
      buildCard(id: 'r', name: 'Sink Below (Red)', collectorNumber: '101/220'),
      buildCard(id: 'b', name: 'Sink Below (Blue)', collectorNumber: '103/220'),
    ];

    test('name-only OCR does not prefer the Red printing', () {
      final hits = identifyCards(catalog, 'Sink Below Once per Turn Action');
      // All three pitches fully match (parentheticals stripped from tokens).
      expect(hits.map((c) => c.id).toSet(), {'y', 'r', 'b'});
      // Document today's bug: first hit is catalog-order / sort-order, not pitch.
      // Yellow is first in the catalog fixture → often surfaces as "detected".
      expect(hits.first.id, 'y');
      expect(hits.first.name, contains('Yellow'));
    });

    test('OCR saying Yellow still cannot demote Red — words in body text ignored for pitch', () {
      // "Yellow" is not part of nameTokens matching; all three still tie.
      final hits = identifyCards(catalog, 'Sink Below Yellow');
      expect(hits.map((c) => c.id).toSet(), {'y', 'r', 'b'});
    });
  });
}
