import 'package:fabtrades/core/logic/set_sort.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('setBrowseTier', () {
    test('classifies main expansions as Main Sets', () {
      expect(setBrowseTier('Omens of the Third Age'), BrowseTier.main);
      expect(setBrowseTier('Welcome to Rathe'), BrowseTier.main);
      expect(setBrowseTier('Usurp the Shadow Throne'), BrowseTier.main);
      expect(setBrowseTier('History Pack Vol.1'), BrowseTier.main);
    });

    test('classifies Blitz Decks', () {
      expect(setBrowseTier('Blitz Deck: Rosetta - Aurora'), BrowseTier.blitz);
      expect(setBrowseTier('Blitz Deck: Monarch - Prism'), BrowseTier.blitz);
    });

    test('classifies Armory Decks', () {
      expect(setBrowseTier('Armory Deck: Malice'), BrowseTier.armory);
      expect(setBrowseTier('Armory Deck Origins: Hala'), BrowseTier.armory);
    });

    test('classifies Silver Age', () {
      expect(setBrowseTier('Silver Age Chapter 1'), BrowseTier.silverAge);
      expect(
        setBrowseTier('Silver Age: Usurp the Shadow Throne'),
        BrowseTier.silverAge,
      );
      expect(setBrowseTier('Usurp the Shadow Throne'), BrowseTier.main);
    });

    test('classifies Hero Decks', () {
      expect(setBrowseTier('Hero Deck: Bravo'), BrowseTier.hero);
    });

    test('classifies other product lines as Other', () {
      expect(setBrowseTier('Welcome Deck: Ira'), BrowseTier.other);
      expect(setBrowseTier('GEM Pack 1'), BrowseTier.other);
      expect(setBrowseTier('Flesh and Blood: Promo Cards'), BrowseTier.other);
    });
  });

  group('browseTierLabel', () {
    test('returns section titles', () {
      expect(browseTierLabel(BrowseTier.main), 'Main Sets');
      expect(browseTierLabel(BrowseTier.blitz), 'Blitz Decks');
      expect(browseTierLabel(BrowseTier.armory), 'Armory Decks');
      expect(browseTierLabel(BrowseTier.silverAge), 'Silver Age');
      expect(browseTierLabel(BrowseTier.hero), 'Hero Decks');
      expect(browseTierLabel(BrowseTier.other), 'Other');
    });
  });

  group('compareSetsByBrowseOrder', () {
    test('orders main, blitz, armory, silver age, hero, then other', () {
      final sorted = [
        'GEM Pack 2',
        'Silver Age Chapter 1',
        'Armory Deck: Ira',
        'Hero Deck: Bravo',
        'Blitz Deck: Monarch - Prism',
        'Monarch',
      ]..sort(compareSetNamesByBrowseOrder);
      expect(sorted, [
        'Monarch',
        'Blitz Deck: Monarch - Prism',
        'Armory Deck: Ira',
        'Silver Age Chapter 1',
        'Hero Deck: Bravo',
        'GEM Pack 2',
      ]);
    });

    test('within a tier, sorts newest publishedOn first', () {
      final names = ['Rosetta', 'Omens of the Third Age', 'The Hunted'];
      final dates = <String, DateTime>{
        'Rosetta': DateTime.utc(2024, 1, 1),
        'Omens of the Third Age': DateTime.utc(2026, 1, 1),
        'The Hunted': DateTime.utc(2025, 1, 1),
      };
      names.sort(
        (a, b) => compareSetsByBrowseOrder(
          a,
          b,
          publishedOnA: dates[a],
          publishedOnB: dates[b],
        ),
      );
      expect(names, [
        'Omens of the Third Age',
        'The Hunted',
        'Rosetta',
      ]);
    });
  });
}
