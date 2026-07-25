import {
  normalizeTradeItem,
  normalizeTradeList,
  tradeDisplayName,
} from '../../src/utils/tradeItems.js';

// Shapes copied from what each client actually writes to `trades.have_list`.
const webLine = {
  name: 'Command and Conquer',
  quantity: 2,
  price: 45.5,
  lowPrice: 40,
  subTypeName: 'Rainbow Foil',
  uniqueId: 'edition-1',
  imageUrl: 'https://img/cc.png',
  imageUrlFallback: 'https://img/cc-fallback.png',
};

const mobileLine = {
  quantity: 3,
  price_each: 12.25,
  card: {
    id: 'card-9',
    name: 'Sink Below',
    tcg_low: 10,
    sub_type_name: 'Normal',
    image_url: 'https://img/sb.png',
  },
};

describe('normalizeTradeItem', () => {
  test('passes a web line through', () => {
    expect(normalizeTradeItem(webLine)).toEqual({
      name: 'Command and Conquer',
      quantity: 2,
      price: 45.5,
      lowPrice: 40,
      subTypeName: 'Rainbow Foil',
      uniqueId: 'edition-1',
      imageUrl: 'https://img/cc.png',
      imageUrlFallback: 'https://img/cc-fallback.png',
    });
  });

  test('reads a mobile line into the same shape', () => {
    expect(normalizeTradeItem(mobileLine)).toEqual({
      name: 'Sink Below',
      quantity: 3,
      price: 12.25,
      lowPrice: 10,
      subTypeName: 'Normal',
      uniqueId: 'card-9',
      imageUrl: 'https://img/sb.png',
      imageUrlFallback: '',
    });
  });

  test('defaults a missing or nonsensical quantity to one', () => {
    expect(normalizeTradeItem({ name: 'A' }).quantity).toBe(1);
    expect(normalizeTradeItem({ name: 'A', quantity: 0 }).quantity).toBe(1);
    expect(normalizeTradeItem({ name: 'A', quantity: -4 }).quantity).toBe(1);
  });

  test('defaults a missing price to zero rather than NaN', () => {
    expect(normalizeTradeItem({ name: 'A' }).price).toBe(0);
    expect(normalizeTradeItem({ card: { name: 'A' } }).price).toBe(0);
  });

  test('rejects a line with no card name', () => {
    expect(normalizeTradeItem({ quantity: 1 })).toBeNull();
    expect(normalizeTradeItem({ card: { id: 'x' } })).toBeNull();
    expect(normalizeTradeItem(null)).toBeNull();
    expect(normalizeTradeItem('nope')).toBeNull();
  });
});

describe('normalizeTradeList', () => {
  test('reads a list that mixes both clients', () => {
    const names = normalizeTradeList([webLine, mobileLine]).map(line => line.name);
    expect(names).toEqual(['Command and Conquer', 'Sink Below']);
  });

  test('drops unreadable lines instead of failing the whole trade', () => {
    expect(normalizeTradeList([webLine, { quantity: 1 }, null])).toHaveLength(1);
  });

  test('treats a missing list as empty', () => {
    expect(normalizeTradeList(undefined)).toEqual([]);
    expect(normalizeTradeList('not a list')).toEqual([]);
  });
});

describe('tradeDisplayName', () => {
  test('uses the name web asked the user for', () => {
    expect(tradeDisplayName({ name: 'Nationals swap' })).toBe('Nationals swap');
  });

  test('falls back to the date for trades mobile saved unnamed', () => {
    const created = new Date('2026-03-04T12:00:00Z');
    expect(tradeDisplayName({ name: null, created_at: created.toISOString() })).toBe(
      `Trade on ${created.toLocaleDateString()}`
    );
    expect(tradeDisplayName({ name: '   ', created_at: created.toISOString() })).toBe(
      `Trade on ${created.toLocaleDateString()}`
    );
  });

  test('stays readable when there is nothing to go on', () => {
    expect(tradeDisplayName({})).toBe('Untitled trade');
    expect(tradeDisplayName({ created_at: 'garbage' })).toBe('Untitled trade');
  });
});
