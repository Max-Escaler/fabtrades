import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/models/collection_entry.dart';

import '../../support/fixtures.dart';

void main() {
  group('CollectionEntry', () {
    test('copyWith overrides only provided fields and keeps card/addedAt', () {
      final added = DateTime(2026, 2, 3);
      final entry = CollectionEntry(
        card: buildCard(id: 'c1'),
        quantity: 1,
        condition: 'NM',
        addedAt: added,
      );
      final updated = entry.copyWith(quantity: 5, condition: 'LP');
      expect(updated.quantity, 5);
      expect(updated.condition, 'LP');
      expect(updated.card.id, 'c1');
      expect(updated.addedAt, added);
      expect(updated.isWanted, isFalse);
    });

    test('toJson -> fromJson round-trips', () {
      final entry = CollectionEntry(
        card: buildCard(id: 'c2', name: 'Jinx'),
        quantity: 3,
        condition: 'MP',
        isWanted: true,
        addedAt: DateTime.utc(2026, 4, 5, 6, 7, 8),
      );
      final restored = CollectionEntry.fromJson(entry.toJson());
      expect(restored.card.id, 'c2');
      expect(restored.card.name, 'Jinx');
      expect(restored.quantity, 3);
      expect(restored.condition, 'MP');
      expect(restored.isWanted, isTrue);
      expect(restored.addedAt, DateTime.utc(2026, 4, 5, 6, 7, 8));
    });

    test('fromJson applies defaults for a minimal payload', () {
      final restored = CollectionEntry.fromJson({
        'card': buildCard().toStub(),
      });
      expect(restored.quantity, 1);
      expect(restored.condition, 'NM');
      expect(restored.isWanted, isFalse);
      expect(restored.addedAt, isA<DateTime>());
    });

    test('conditions constant lists all grades', () {
      expect(CollectionEntry.conditions, ['NM', 'LP', 'MP', 'HP', 'DMG']);
    });
  });
}
