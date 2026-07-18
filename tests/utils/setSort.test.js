import {
  BROWSE_TIER,
  setBrowseTier,
  browseTierLabel,
  compareSetsByBrowseOrder,
  compareSetNamesByBrowseOrder
} from '../../src/utils/setSort.js';

describe('setBrowseTier', () => {
  test('classifies main expansions as Main Sets', () => {
    expect(setBrowseTier('Omens of the Third Age')).toBe(BROWSE_TIER.MAIN);
    expect(setBrowseTier('Welcome to Rathe')).toBe(BROWSE_TIER.MAIN);
    expect(setBrowseTier('Usurp the Shadow Throne')).toBe(BROWSE_TIER.MAIN);
    expect(setBrowseTier('History Pack Vol.1')).toBe(BROWSE_TIER.MAIN);
  });

  test('classifies Blitz Decks', () => {
    expect(setBrowseTier('Blitz Deck: Rosetta - Aurora')).toBe(BROWSE_TIER.BLITZ);
    expect(setBrowseTier('Blitz Deck: Monarch - Prism')).toBe(BROWSE_TIER.BLITZ);
  });

  test('classifies Armory Decks', () => {
    expect(setBrowseTier('Armory Deck: Malice')).toBe(BROWSE_TIER.ARMORY);
    expect(setBrowseTier('Armory Deck Origins: Hala')).toBe(BROWSE_TIER.ARMORY);
  });

  test('classifies Silver Age (not the matching main set)', () => {
    expect(setBrowseTier('Silver Age Chapter 1')).toBe(BROWSE_TIER.SILVER_AGE);
    expect(setBrowseTier('Silver Age: Usurp the Shadow Throne')).toBe(
      BROWSE_TIER.SILVER_AGE
    );
    expect(setBrowseTier('Usurp the Shadow Throne')).toBe(BROWSE_TIER.MAIN);
  });

  test('classifies Hero Decks', () => {
    expect(setBrowseTier('Hero Deck: Bravo')).toBe(BROWSE_TIER.HERO);
  });

  test('classifies other product lines as Other', () => {
    expect(setBrowseTier('Welcome Deck: Ira')).toBe(BROWSE_TIER.OTHER);
    expect(setBrowseTier('GEM Pack 1')).toBe(BROWSE_TIER.OTHER);
    expect(setBrowseTier('Gem Pack 5')).toBe(BROWSE_TIER.OTHER);
    expect(setBrowseTier('Mastery Pack Guardian')).toBe(BROWSE_TIER.OTHER);
    expect(setBrowseTier('Historic Pack 1 Blitz Deck: Bravo')).toBe(
      BROWSE_TIER.OTHER
    );
    expect(setBrowseTier('Classic Battles: Rhinar vs Dorinthea')).toBe(
      BROWSE_TIER.OTHER
    );
    expect(setBrowseTier('1st Strike')).toBe(BROWSE_TIER.OTHER);
    expect(setBrowseTier('Flesh and Blood: Promo Cards')).toBe(BROWSE_TIER.OTHER);
    expect(setBrowseTier('Compendium of Rathe')).toBe(BROWSE_TIER.OTHER);
    expect(setBrowseTier('Round the Table: TCCxLSS')).toBe(BROWSE_TIER.OTHER);
  });
});

describe('browseTierLabel', () => {
  test('returns section titles for each tier', () => {
    expect(browseTierLabel(BROWSE_TIER.MAIN)).toBe('Main Sets');
    expect(browseTierLabel(BROWSE_TIER.BLITZ)).toBe('Blitz Decks');
    expect(browseTierLabel(BROWSE_TIER.ARMORY)).toBe('Armory Decks');
    expect(browseTierLabel(BROWSE_TIER.SILVER_AGE)).toBe('Silver Age');
    expect(browseTierLabel(BROWSE_TIER.HERO)).toBe('Hero Decks');
    expect(browseTierLabel(BROWSE_TIER.OTHER)).toBe('Other');
  });
});

describe('compareSetsByBrowseOrder', () => {
  test('orders main, blitz, armory, silver age, hero, then other', () => {
    const names = [
      'GEM Pack 2',
      'Silver Age Chapter 1',
      'Armory Deck: Ira',
      'Hero Deck: Bravo',
      'Blitz Deck: Monarch - Prism',
      'Monarch'
    ];
    const sorted = [...names]
      .map((name) => ({ name, publishedOn: null }))
      .sort(compareSetsByBrowseOrder)
      .map((s) => s.name);
    expect(sorted).toEqual([
      'Monarch',
      'Blitz Deck: Monarch - Prism',
      'Armory Deck: Ira',
      'Silver Age Chapter 1',
      'Hero Deck: Bravo',
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
      'Blitz Deck: Uprising - Fai',
      'Hero Deck: Bravo'
    ].sort(compareSetNamesByBrowseOrder);
    expect(sorted).toEqual([
      'Arcane Rising',
      'Bright Lights',
      'Blitz Deck: Uprising - Fai',
      'Armory Deck: Aurora',
      'Armory Deck: Zyggy',
      'Silver Age Chapter 2',
      'Hero Deck: Bravo'
    ]);
  });
});
