import {
  foilAbbrev,
  parseDiscordCardName,
  formatTradePostCardLine,
  formatCashAmount,
  generateTradePost,
} from '../../src/utils/tradePost.js';

describe('foilAbbrev', () => {
  test('maps common foil types to Discord shorthand', () => {
    expect(foilAbbrev('Cold Foil')).toBe('CF');
    expect(foilAbbrev('Rainbow Foil')).toBe('RF');
    expect(foilAbbrev('Gold Foil')).toBe('GF');
    expect(foilAbbrev('Normal')).toBe('NF');
    expect(foilAbbrev('')).toBe('NF');
    expect(foilAbbrev(null)).toBe('NF');
  });
});

describe('parseDiscordCardName', () => {
  test('strips set codes', () => {
    expect(parseDiscordCardName('Fleeing Starbreeze (MST040)')).toEqual({
      baseName: 'Fleeing Starbreeze',
      artAbbrev: null,
    });
  });

  test('extracts Extended Art and strips set codes', () => {
    expect(parseDiscordCardName('Fleeing Starbreeze (Extended Art) (MST040)')).toEqual({
      baseName: 'Fleeing Starbreeze',
      artAbbrev: 'EA',
    });
  });

  test('keeps pitch colors attached', () => {
    expect(parseDiscordCardName('Spellbound Creepers (Red)')).toEqual({
      baseName: 'Spellbound Creepers (Red)',
      artAbbrev: null,
    });
  });

  test('recognizes Marvel and Promo variants', () => {
    expect(parseDiscordCardName('Oldhim (Marvel)')).toEqual({
      baseName: 'Oldhim',
      artAbbrev: 'Marvel',
    });
    expect(parseDiscordCardName('Crown of Providence (Promo)')).toEqual({
      baseName: 'Crown of Providence',
      artAbbrev: 'Promo',
    });
  });
});

describe('formatTradePostCardLine', () => {
  test('formats a typical CF EA line with price', () => {
    expect(
      formatTradePostCardLine({
        name: 'Fleeing Starbreeze (Extended Art) (MST040)',
        subTypeName: 'Cold Foil',
        price: 40.2,
        quantity: 1,
      })
    ).toBe('CF EA Fleeing Starbreeze 40');
  });

  test('prefixes quantity when greater than 1', () => {
    expect(
      formatTradePostCardLine({
        name: 'Nourishing Glow (MST012)',
        subTypeName: 'Cold Foil',
        price: 12,
        quantity: 3,
      })
    ).toBe('3x CF Nourishing Glow 12');
  });

  test('formats NF cards', () => {
    expect(
      formatTradePostCardLine({
        name: 'Voltaris (DYN001)',
        subTypeName: 'Normal',
        price: 300,
        quantity: 1,
      })
    ).toBe('NF Voltaris 300');
  });
});

describe('formatCashAmount', () => {
  test('formats absolute whole dollars', () => {
    expect(formatCashAmount(147.4)).toBe('$147');
    expect(formatCashAmount(-50)).toBe('$50');
  });
});

describe('generateTradePost', () => {
  const haveList = [
    {
      name: 'Voltaris (DYN001)',
      subTypeName: 'Cold Foil',
      price: 300,
      quantity: 1,
    },
    {
      name: 'Fleeing Starbreeze (Extended Art) (MST040)',
      subTypeName: 'Cold Foil',
      price: 40,
      quantity: 1,
    },
  ];
  const wantList = [
    {
      name: 'Dead Threads (Extended Art) (OUT100)',
      subTypeName: 'Rainbow Foil',
      price: 450,
      quantity: 1,
    },
  ];

  test('returns empty string when both lists are empty', () => {
    expect(generateTradePost({ haveList: [], wantList: [] })).toBe('');
  });

  test('builds a WTT My / For your post with prices and branding', () => {
    const post = generateTradePost({
      haveList,
      wantList,
      haveTotal: 340,
      wantTotal: 450,
      diff: -110,
      pricedAsOf: new Date('2026-07-18T12:00:00Z'),
    });

    expect(post).toContain('**WTT My**');
    expect(post).toContain('CF Voltaris 300');
    expect(post).toContain('CF EA Fleeing Starbreeze 40');
    expect(post).toContain('+ $110 cash');
    expect(post).toContain('**For your**');
    expect(post).toContain('RF EA Dead Threads 450');
    expect(post).toContain('Priced via TCGPlayer');
    expect(post).toContain('Built with fabtrades.net');
    expect(post.endsWith('\n')).toBe(true);
  });

  test('asks for cash on the want side when have is worth more', () => {
    const post = generateTradePost({
      haveList: [{ name: 'A', subTypeName: 'Cold Foil', price: 200, quantity: 1 }],
      wantList: [{ name: 'B', subTypeName: 'Normal', price: 50, quantity: 1 }],
      diff: 150,
      pricedAsOf: new Date('2026-07-18T12:00:00Z'),
    });

    const forYourIdx = post.indexOf('**For your**');
    const cashIdx = post.indexOf('+ $150 cash');
    expect(cashIdx).toBeGreaterThan(forYourIdx);
  });

  test('have-only posts ask for offers', () => {
    const post = generateTradePost({
      haveList: [{ name: 'Voltaris', subTypeName: 'Cold Foil', price: 300, quantity: 1 }],
      wantList: [],
      pricedAsOf: new Date('2026-07-18T12:00:00Z'),
    });

    expect(post).toContain('**For your**');
    expect(post).toContain('offers / $$$');
  });
});
