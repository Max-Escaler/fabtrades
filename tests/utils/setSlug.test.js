import { slugifySetName, buildSetSlugMap, getSlugForSet } from '../../src/utils/setSlug.js';

describe('slugifySetName', () => {
  test('lowercases and hyphenates a normal name', () => {
    expect(slugifySetName('Omens of the Third Age')).toBe('omens-of-the-third-age');
  });

  test('collapses runs of non-alphanumeric characters into a single hyphen', () => {
    expect(slugifySetName('Arcane   Rising!!! (Unlimited)')).toBe('arcane-rising-unlimited');
  });

  test('trims leading and trailing hyphens', () => {
    expect(slugifySetName('  --Welcome to Rathe--  ')).toBe('welcome-to-rathe');
  });

  test('returns an empty string for empty or missing input', () => {
    expect(slugifySetName('')).toBe('');
    expect(slugifySetName()).toBe('');
  });
});

describe('buildSetSlugMap', () => {
  test('maps each groupId (as string) to its slug', () => {
    const sets = [
      { groupId: 1, name: 'Arcane Rising' },
      { groupId: 2, name: 'Crucible of War' },
    ];
    const map = buildSetSlugMap(sets);
    expect(map.get('1')).toBe('arcane-rising');
    expect(map.get('2')).toBe('crucible-of-war');
  });

  test('appends groupId to disambiguate colliding slugs', () => {
    const sets = [
      { groupId: 10, name: 'Gem Pack' },
      { groupId: 20, name: 'Gem Pack' },
    ];
    const map = buildSetSlugMap(sets);
    expect(map.get('10')).toBe('gem-pack-10');
    expect(map.get('20')).toBe('gem-pack-20');
  });

  test('is order-independent for collisions', () => {
    const a = buildSetSlugMap([
      { groupId: 10, name: 'Gem Pack' },
      { groupId: 20, name: 'Gem Pack' },
    ]);
    const b = buildSetSlugMap([
      { groupId: 20, name: 'Gem Pack' },
      { groupId: 10, name: 'Gem Pack' },
    ]);
    expect(a.get('10')).toBe(b.get('10'));
    expect(a.get('20')).toBe(b.get('20'));
  });

  test('returns an empty map for no sets', () => {
    expect(buildSetSlugMap().size).toBe(0);
    expect(buildSetSlugMap([]).size).toBe(0);
  });
});

describe('getSlugForSet', () => {
  const sets = [
    { groupId: 1, name: 'Arcane Rising' },
    { groupId: 2, name: 'Crucible of War' },
  ];

  test('returns the slug for a matching groupId', () => {
    expect(getSlugForSet(sets, 2)).toBe('crucible-of-war');
  });

  test('accepts a string groupId', () => {
    expect(getSlugForSet(sets, '1')).toBe('arcane-rising');
  });

  test('returns an empty string when the groupId is unknown', () => {
    expect(getSlugForSet(sets, 999)).toBe('');
  });
});
