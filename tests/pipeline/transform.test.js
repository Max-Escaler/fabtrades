// Unit tests for the FAB price-ingest pipeline row builder (mobile/pipeline).
//
// transform.js turns raw TCGCSV product rows into the rows that get upserted
// into the shared Supabase price database. Its correctness has a large blast
// radius: bad parsing/keying here would corrupt prices for every card in the
// app. These are pure functions, so we exercise the edge cases directly.
//
// cardmarket.js (imported transitively) pulls in config.js, which does
// `import 'dotenv/config'` (not a dependency of the web app). We mock config.js
// so the import chain resolves without dotenv and without loading Supabase.
jest.mock('../../mobile/pipeline/src/config.js', () => ({
  CARDMARKET_PRODUCTS_URL: 'http://example.test/products',
  CARDMARKET_PRICES_URL: 'http://example.test/prices',
}));

import {
  isSealedProduct,
  toNumber,
  toBigInt,
  subtypeSlug,
  printingId,
  buildRows,
} from '../../mobile/pipeline/src/transform.js';

describe('toNumber', () => {
  it('returns null for empty-ish values', () => {
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber('')).toBeNull();
  });

  it('parses numeric strings, including zero and negatives', () => {
    expect(toNumber('12.5')).toBe(12.5);
    expect(toNumber('0')).toBe(0);
    expect(toNumber('-3.25')).toBe(-3.25);
  });

  it('returns null for unparseable strings', () => {
    expect(toNumber('abc')).toBeNull();
    expect(toNumber('  ')).toBeNull();
  });

  it('accepts a numeric argument', () => {
    expect(toNumber(0)).toBe(0);
    expect(toNumber(7.5)).toBe(7.5);
  });
});

describe('toBigInt', () => {
  it('returns null for empty-ish values', () => {
    expect(toBigInt(undefined)).toBeNull();
    expect(toBigInt(null)).toBeNull();
    expect(toBigInt('')).toBeNull();
  });

  it('parses integers and truncates decimals', () => {
    expect(toBigInt('123')).toBe(123);
    expect(toBigInt('12.9')).toBe(12);
  });

  it('returns null for non-numeric input', () => {
    expect(toBigInt('nope')).toBeNull();
  });
});

describe('subtypeSlug', () => {
  it('falls back to "base" for empty/blank input', () => {
    expect(subtypeSlug('')).toBe('base');
    expect(subtypeSlug(null)).toBe('base');
    expect(subtypeSlug(undefined)).toBe('base');
    expect(subtypeSlug('!!!')).toBe('base');
  });

  it('lowercases and hyphenates', () => {
    expect(subtypeSlug('Normal')).toBe('normal');
    expect(subtypeSlug('Rainbow Foil')).toBe('rainbow-foil');
  });

  it('collapses runs of non-alphanumerics and trims edge hyphens', () => {
    expect(subtypeSlug('  Cold   Foil!! ')).toBe('cold-foil');
  });
});

describe('printingId', () => {
  it('combines productId with the subtype slug', () => {
    expect(printingId(101, 'Normal')).toBe('101-normal');
    expect(printingId(101, 'Rainbow Foil')).toBe('101-rainbow-foil');
  });

  it('uses the "base" slug when subtype is missing', () => {
    expect(printingId(101, '')).toBe('101-base');
    expect(printingId(101, null)).toBe('101-base');
  });
});

describe('isSealedProduct', () => {
  it('flags sealed/non-single products by name', () => {
    expect(isSealedProduct({ name: 'Alpha Booster Box' })).toBe(true);
    expect(isSealedProduct({ name: 'Welcome Bundle' })).toBe(true);
    expect(isSealedProduct({ name: 'Blitz Deck - Rhinar' })).toBe(true);
  });

  it('flags sealed products detected via subTypeName', () => {
    expect(isSealedProduct({ name: 'Something', subTypeName: 'Prerelease' })).toBe(true);
  });

  it('does not flag individual cards', () => {
    expect(isSealedProduct({ name: 'Lightning, Legend of Storms', subTypeName: 'Normal' })).toBe(false);
    expect(isSealedProduct({ name: 'Ember, Fate Aflame', subTypeName: 'Rainbow Foil' })).toBe(false);
  });

  it('is safe on rows missing name/subTypeName', () => {
    expect(isSealedProduct({})).toBe(false);
  });
});

describe('buildRows', () => {
  // A CardMarket lookup keyed by normalized name. 'Lightning' is matched via
  // cleanName; 'Blaze Storm' is matched only via the name fallback.
  function makeCmByName() {
    return new Map([
      [
        'lightning',
        {
          idProduct: 999,
          name: 'Lightning',
          avg: '1.50',
          low: '1.00',
          trend: '1.20',
          avgFoil: '3.00',
          lowFoil: '2.50',
          trendFoil: '2.80',
        },
      ],
      [
        'blaze storm',
        {
          idProduct: 888,
          name: 'Blaze Storm',
          avg: '5.00',
          low: '4.00',
          trend: '4.50',
          avgFoil: null,
          lowFoil: null,
          trendFoil: null,
        },
      ],
    ]);
  }

  function makeProducts() {
    return [
      // index 0: normal card, matched by cleanName
      {
        productId: '101',
        name: 'Lightning (Red)',
        cleanName: 'Lightning',
        subTypeName: 'Normal',
        imageUrl: 'http://img/101',
        url: 'http://tcg/101',
        marketPrice: '2.00',
        lowPrice: '1.50',
        midPrice: '1.75',
        highPrice: '3.00',
        directLowPrice: '1.40',
        extRarity: 'R',
        extNumber: '001',
        extCardType: 'Action',
      },
      // index 1: foil card, no CardMarket match
      {
        productId: '102',
        name: 'Ember, Fate Aflame',
        cleanName: 'Ember Fate Aflame',
        subTypeName: 'Rainbow Foil',
        marketPrice: '10.00',
        lowPrice: '8.00',
      },
      // index 2: no productId -> skipped
      { name: 'Ghost Card', subTypeName: 'Normal' },
      // index 3: productId but no name -> skipped
      { productId: '104', subTypeName: 'Normal' },
      // index 4: sealed product
      { productId: '105', name: 'Alpha Booster Box', subTypeName: 'Normal' },
      // index 5: matched via name fallback (cleanName does not match)
      {
        productId: '106',
        name: 'Blaze Storm',
        cleanName: 'Blaze Storm (Alternate Art)',
        subTypeName: 'Normal',
        marketPrice: '6.00',
        lowPrice: '5.50',
      },
    ];
  }

  it('skips rows lacking a productId or name', () => {
    const { cards, prices, history } = buildRows(makeProducts(), '42', 1, makeCmByName());
    expect(cards).toHaveLength(4);
    expect(prices).toHaveLength(4);
    expect(history).toHaveLength(4);
    expect(cards.map((c) => c.name)).toEqual([
      'Lightning (Red)',
      'Ember, Fate Aflame',
      'Alpha Booster Box',
      'Blaze Storm',
    ]);
  });

  it('derives the printing id and set id', () => {
    const { cards } = buildRows(makeProducts(), '42', 1, makeCmByName());
    expect(cards[0].id).toBe('101-normal');
    expect(cards[1].id).toBe('102-rainbow-foil');
    expect(cards[0].set_id).toBe(42);
  });

  it('builds unique_id from the padded set number and the ORIGINAL row index', () => {
    const { cards } = buildRows(makeProducts(), '42', 7, makeCmByName());
    // set number 7 -> "007"; original forEach indices are preserved even
    // though rows 2 and 3 were skipped, so the surviving rows keep 0,1,4,5.
    expect(cards[0].unique_id).toBe('0070000');
    expect(cards[1].unique_id).toBe('0070001');
    expect(cards[2].unique_id).toBe('0070004');
    expect(cards[3].unique_id).toBe('0070005');
  });

  it('treats a missing set number as 0 for the unique_id prefix', () => {
    const { cards } = buildRows([makeProducts()[0]], '42', undefined, makeCmByName());
    expect(cards[0].unique_id).toBe('0000000');
  });

  it('detects foils from the subTypeName', () => {
    const { cards } = buildRows(makeProducts(), '42', 1, makeCmByName());
    expect(cards[0].is_foil).toBe(false);
    expect(cards[1].is_foil).toBe(true);
  });

  it('marks sealed products', () => {
    const { cards } = buildRows(makeProducts(), '42', 1, makeCmByName());
    expect(cards[0].is_sealed).toBe(false);
    expect(cards[2].is_sealed).toBe(true); // Alpha Booster Box
  });

  it('matches CardMarket by cleanName, then falls back to name', () => {
    const { cards } = buildRows(makeProducts(), '42', 1, makeCmByName());
    // matched via cleanName 'Lightning'
    expect(cards[0].cardmarket_id).toBe(999);
    expect(cards[0].cardmarket_name).toBe('Lightning');
    // no match at all
    expect(cards[1].cardmarket_id).toBeNull();
    expect(cards[1].cardmarket_name).toBeNull();
    // matched via the name fallback ('Blaze Storm')
    expect(cards[3].cardmarket_id).toBe(888);
    expect(cards[3].cardmarket_name).toBe('Blaze Storm');
  });

  it('parses TCGplayer prices and CardMarket prices into the prices row', () => {
    const { prices } = buildRows(makeProducts(), '42', 1, makeCmByName());
    expect(prices[0]).toMatchObject({
      card_id: '101-normal',
      tcg_low: 1.5,
      tcg_mid: 1.75,
      tcg_high: 3.0,
      tcg_market: 2.0,
      tcg_direct_low: 1.4,
      cm_avg: 1.5,
      cm_low: 1.0,
      cm_trend: 1.2,
      cm_avg_foil: 3.0,
      cm_low_foil: 2.5,
      cm_trend_foil: 2.8,
    });
  });

  it('leaves CardMarket price fields null when there is no match', () => {
    const { prices } = buildRows(makeProducts(), '42', 1, makeCmByName());
    expect(prices[1]).toMatchObject({
      card_id: '102-rainbow-foil',
      tcg_market: 10.0,
      tcg_low: 8.0,
      cm_avg: null,
      cm_low: null,
      cm_trend: null,
    });
  });

  it('captures a daily history snapshot with the market/low/trend fields', () => {
    const { cards, history } = buildRows(makeProducts(), '42', 1, makeCmByName());
    expect(history[0]).toMatchObject({
      card_id: '101-normal',
      tcg_market: 2.0,
      tcg_low: 1.5,
      cm_trend: 1.2,
      cm_low: 1.0,
    });
    // captured_on is the date portion of the shared `now` timestamp used for
    // updated_at; asserting the relationship keeps the test deterministic.
    expect(history[0].captured_on).toBe(cards[0].updated_at.slice(0, 10));
    expect(history[0].captured_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses a single consistent timestamp across cards and prices', () => {
    const { cards, prices } = buildRows(makeProducts(), '42', 1, makeCmByName());
    const stamps = new Set([
      ...cards.map((c) => c.updated_at),
      ...prices.map((p) => p.updated_at),
    ]);
    expect(stamps.size).toBe(1);
    expect([...stamps][0]).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it('prefers ext* metadata but falls back to plain fields', () => {
    const products = [
      { productId: '201', name: 'A', subTypeName: 'Normal', extRarity: 'Majestic', extNumber: '042' },
      { productId: '202', name: 'B', subTypeName: 'Normal', rarity: 'Common', number: '099' },
    ];
    const { cards } = buildRows(products, '1', 1, new Map());
    expect(cards[0].rarity).toBe('Majestic');
    expect(cards[0].collector_number).toBe('042');
    expect(cards[1].rarity).toBe('Common');
    expect(cards[1].collector_number).toBe('099');
  });

  it('returns empty collections for empty input', () => {
    expect(buildRows([], '1', 1, new Map())).toEqual({ cards: [], prices: [], history: [] });
  });
});
