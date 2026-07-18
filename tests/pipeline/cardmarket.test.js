// Unit tests for the CardMarket helpers in the FAB price-ingest pipeline.
//
// normalizeCardName is the join key between the two price sources
// (TCGplayer <-> CardMarket); a subtle change here silently breaks price
// matching for every card. fetchCardMarketByName performs the products/prices
// join and drops products that have no price guide. Both are worth pinning.
//
// config.js does `import 'dotenv/config'` (not a web-app dependency), so we
// mock it to keep the import chain resolvable and hermetic.
jest.mock('../../mobile/pipeline/src/config.js', () => ({
  CARDMARKET_PRODUCTS_URL: 'http://example.test/products',
  CARDMARKET_PRICES_URL: 'http://example.test/prices',
}));

import {
  normalizeCardName,
  fetchCardMarketByName,
} from '../../mobile/pipeline/src/cardmarket.js';

describe('normalizeCardName', () => {
  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normalizeCardName('Lightning, Legend of Storms')).toBe('lightning legend of storms');
    expect(normalizeCardName("Enlightened Strike!!!")).toBe('enlightened strike');
    expect(normalizeCardName('  Ember,   Fate  Aflame  ')).toBe('ember fate aflame');
  });

  it('keeps digits and normalizes hyphenated names to a common key', () => {
    expect(normalizeCardName('Ser Boastalot')).toBe('ser boastalot');
    expect(normalizeCardName('Command-and-Conquer 3')).toBe('commandandconquer 3');
  });

  it('is null/undefined safe', () => {
    expect(normalizeCardName(null)).toBe('');
    expect(normalizeCardName(undefined)).toBe('');
    expect(normalizeCardName('')).toBe('');
  });
});

describe('fetchCardMarketByName', () => {
  afterEach(() => {
    delete globalThis.fetch;
  });

  function mockFetch(byUrl) {
    globalThis.fetch = jest.fn((url) => {
      const entry = byUrl[url];
      if (!entry) {
        return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(entry) });
    });
  }

  it('joins products with their price guides, keyed by normalized name', async () => {
    mockFetch({
      'http://example.test/products': {
        products: [
          { idProduct: 1, name: 'Lightning, Legend of Storms' },
          { idProduct: 2, name: 'Ember, Fate Aflame' },
        ],
      },
      'http://example.test/prices': {
        priceGuides: [
          {
            idProduct: 1,
            avg: 1.5,
            low: 1.0,
            trend: 1.2,
            'avg-foil': 3.0,
            'low-foil': 2.5,
            'trend-foil': 2.8,
          },
          { idProduct: 2, avg: 9.0, low: 8.0, trend: 8.5 },
        ],
      },
    });

    const byName = await fetchCardMarketByName();

    expect(byName.size).toBe(2);
    expect(byName.get('lightning legend of storms')).toEqual({
      idProduct: 1,
      name: 'Lightning, Legend of Storms',
      avg: 1.5,
      low: 1.0,
      trend: 1.2,
      avgFoil: 3.0,
      lowFoil: 2.5,
      trendFoil: 2.8,
    });
    // Missing foil fields become null rather than undefined.
    expect(byName.get('ember fate aflame')).toMatchObject({
      idProduct: 2,
      avgFoil: null,
      lowFoil: null,
      trendFoil: null,
    });
  });

  it('drops products that have no matching price guide', async () => {
    mockFetch({
      'http://example.test/products': {
        products: [
          { idProduct: 1, name: 'Has Price' },
          { idProduct: 2, name: 'No Price' },
        ],
      },
      'http://example.test/prices': {
        priceGuides: [{ idProduct: 1, avg: 1, low: 1, trend: 1 }],
      },
    });

    const byName = await fetchCardMarketByName();

    expect(byName.size).toBe(1);
    expect(byName.has('has price')).toBe(true);
    expect(byName.has('no price')).toBe(false);
  });

  it('tolerates missing products/priceGuides arrays', async () => {
    mockFetch({
      'http://example.test/products': {},
      'http://example.test/prices': {},
    });

    const byName = await fetchCardMarketByName();
    expect(byName.size).toBe(0);
  });

  it('throws a descriptive error when a fetch is not ok', async () => {
    mockFetch({
      // products resolves ok, prices 404s
      'http://example.test/products': { products: [] },
    });

    await expect(fetchCardMarketByName()).rejects.toThrow(
      /Failed to fetch http:\/\/example\.test\/prices: 404 Not Found/
    );
  });
});
