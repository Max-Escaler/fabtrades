import 'package:fabtrades/core/logic/set_sort.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('setBrowseTier', () {
    test('classifies main expansions as tier 0', () {
      expect(setBrowseTier('Omens of the Third Age'), 0);
      expect(setBrowseTier('Welcome to Rathe'), 0);
      expect(setBrowseTier('Usurp the Shadow Throne'), 0);
      expect(setBrowseTier('History Pack Vol.1'), 0);
    });

    test('classifies Armory Decks as tier 1', () {
      expect(setBrowseTier('Armory Deck: Malice'), 1);
      expect(setBrowseTier('Armory Deck Origins: Hala'), 1);
    });

    test('classifies Silver Age as tier 2', () {
      expect(setBrowseTier('Silver Age Chapter 1'), 2);
      expect(setBrowseTier('Silver Age: Usurp the Shadow Throne'), 2);
      expect(setBrowseTier('Usurp the Shadow Throne'), 0);
    });

    test('classifies other product lines as tier 3', () {
      expect(setBrowseTier('Blitz Deck: Rosetta - Aurora'), 3);
      expect(setBrowseTier('Hero Deck: Bravo'), 3);
      expect(setBrowseTier('Welcome Deck: Ira'), 3);
      expect(setBrowseTier('GEM Pack 1'), 3);
      expect(setBrowseTier('Flesh and Blood: Promo Cards'), 3);
    });
  });

  group('compareSetNamesByBrowseOrder', () {
    test('orders main, then armory, then silver age, then other', () {
      final sorted = [
        'Blitz Deck: Monarch - Prism',
        'Silver Age Chapter 1',
        'Armory Deck: Ira',
        'Monarch',
        'GEM Pack 2',
      ]..sort(compareSetNamesByBrowseOrder);
      expect(sorted, [
        'Monarch',
        'Armory Deck: Ira',
        'Silver Age Chapter 1',
        'Blitz Deck: Monarch - Prism',
        'GEM Pack 2',
      ]);
    });
  });
}
