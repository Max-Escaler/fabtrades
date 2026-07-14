import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/models/lend_group.dart';

import '../../support/fixtures.dart';

void main() {
  group('LendItem', () {
    test('copyWith updates quantity, keeps card', () {
      final item = LendItem(card: buildCard(id: 'l1'), quantity: 1);
      expect(item.copyWith(quantity: 4).quantity, 4);
      expect(item.copyWith(quantity: 4).card.id, 'l1');
    });

    test('toJson -> fromJson round-trips', () {
      final item = LendItem(card: buildCard(id: 'l2'), quantity: 2);
      final restored = LendItem.fromJson(item.toJson());
      expect(restored.card.id, 'l2');
      expect(restored.quantity, 2);
    });
  });

  group('LendGroup', () {
    test('cardCount sums item quantities', () {
      final group = LendGroup(
        id: 'g1',
        createdAt: DateTime(2026, 1, 1),
        items: [
          LendItem(card: buildCard(id: 'a'), quantity: 2),
          LendItem(card: buildCard(id: 'b'), quantity: 3),
        ],
      );
      expect(group.cardCount, 5);
    });

    test('copyWith can clear the person name', () {
      final group = LendGroup(
        id: 'g2',
        personName: 'Alex',
        createdAt: DateTime(2026, 1, 1),
      );
      expect(group.copyWith(clearPersonName: true).personName, isNull);
      expect(group.copyWith(personName: 'Sam').personName, 'Sam');
    });

    test('toJson -> fromJson round-trips', () {
      final group = LendGroup(
        id: 'g3',
        personName: 'Riley',
        isBorrowing: true,
        createdAt: DateTime.utc(2026, 7, 8, 9),
        items: [LendItem(card: buildCard(id: 'x'), quantity: 1)],
      );
      final restored = LendGroup.fromJson(group.toJson());
      expect(restored.id, 'g3');
      expect(restored.personName, 'Riley');
      expect(restored.isBorrowing, isTrue);
      expect(restored.createdAt, DateTime.utc(2026, 7, 8, 9));
      expect(restored.items.single.card.id, 'x');
    });

    test('fromJson normalizes blank person name to null', () {
      final restored = LendGroup.fromJson({
        'id': 'g4',
        'person_name': '   ',
        'created_at': DateTime(2026, 1, 1).toIso8601String(),
      });
      expect(restored.personName, isNull);
    });

    test('fromJson generates an id when missing', () {
      final restored = LendGroup.fromJson({
        'created_at': DateTime(2026, 1, 1).toIso8601String(),
      });
      expect(restored.id, isNotEmpty);
    });
  });
}
