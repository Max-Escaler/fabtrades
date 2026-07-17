import {
  setBrowseTier,
  compareSetsByBrowseOrder,
  compareSetNamesByBrowseOrder
} from '../../src/utils/setSort.js';

describe('setBrowseTier', () => {
  test('classifies main expansions as tier 0', () => {
    expect(setBrowseTier('Omens of the Third Age')).toBe(0);
    expect(setBrowseTier('Welcome to Rathe')).toBe(0);
    expect(setBrowseTier('Usurp the Shadow Throne')).toBe(0);
    expect(setBrowseTier('History Pack Vol.1')).toBe(0);
  });

  test('classifies Armory Decks as tier 1', () => {
    expect(setBrowseTier('Armory Deck: Malice')).toBe(1);
    expect(setBrowseTier('Armory Deck Origins: Hala')).toBe(1);
  });

  test('classifies Silver Age as tier 2 (not the matching main set)', () => {
    expect(setBrowseTier('Silver Age Chapter 1')).toBe(2);
    expect(setBrowseTier('Silver Age: Usurp the Shadow Throne')).toBe(2);
    expect(setBrowseTier('Usurp the Shadow Throne')).toBe(0);
  });

  test('classifies other product lines as tier 3', () => {
    expect(setBrowseTier('Blitz Deck: Rosetta - Aurora')).toBe(3);
    expect(setBrowseTier('Hero Deck: Bravo')).toBe(3);
    expect(setBrowseTier('Welcome Deck: Ira')).toBe(3);
    expect(setBrowseTier('GEM Pack 1')).toBe(3);
    expect(setBrowseTier('Gem Pack 5')).toBe(3);
    expect(setBrowseTier('Mastery Pack Guardian')).toBe(3);
    expect(setBrowseTier('Historic Pack 1 Blitz Deck: Bravo')).toBe(3);
    expect(setBrowseTier('Classic Battles: Rhinar vs Dorinthea')).toBe(3);
    expect(setBrowseTier('1st Strike')).toBe(3);
    expect(setBrowseTier('Flesh and Blood: Promo Cards')).toBe(3);
    expect(setBrowseTier('Compendium of Rathe')).toBe(3);
    expect(setBrowseTier('Round the Table: TCCxLSS')).toBe(3);
  });
});

describe('compareSetsByBrowseOrder', () => {
  test('orders main, then armory, then silver age, then other', () => {
    const names = [
      'Blitz Deck: Monarch - Prism',
      'Silver Age Chapter 1',
      'Armory Deck: Ira',
      'Monarch',
      'GEM Pack 2'
    ];
    const sorted = [...names]
      .map((name) => ({ name, publishedOn: null }))
      .sort(compareSetsByBrowseOrder)
      .map((s) => s.name);
    expect(sorted).toEqual([
      'Monarch',
      'Armory Deck: Ira',
      'Silver Age Chapter 1',
      'Blitz Deck: Monarch - Prism',
      'GEM Pack 2'
    ]);
  });

  test('within a tier, sorts newest publishedOn first', () => {
    const sorted = [
      { name: 'Rosetta', publishedOn: '2024-01-01T00:00:00' },
      { name: 'Omens of the Third Age', publishedOn: '2026-01-01T00:00:00' },
      { name: 'The Hunted', publishedOn: '2025-01-01T00:00:00' }
    ].sort(compareSetsByBrowseOrder);
    expect(sorted.map((s) => s.name)).toEqual([
      'Omens of the Third Age',
      'The Hunted',
      'Rosetta'
    ]);
  });
});

describe('compareSetNamesByBrowseOrder', () => {
  test('sorts names by tier then alphabetically', () => {
    const sorted = [
      'Silver Age Chapter 2',
      'Armory Deck: Zyggy',
      'Armory Deck: Aurora',
      'Bright Lights',
      'Arcane Rising',
      'Blitz Deck: Uprising - Fai'
    ].sort(compareSetNamesByBrowseOrder);
    expect(sorted).toEqual([
      'Arcane Rising',
      'Bright Lights',
      'Armory Deck: Aurora',
      'Armory Deck: Zyggy',
      'Silver Age Chapter 2',
      'Blitz Deck: Uprising - Fai'
    ]);
  });
});
