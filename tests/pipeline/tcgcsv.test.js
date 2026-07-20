// Unit tests for the TCGCSV fetch helpers in the FAB price-ingest pipeline.
//
// fetchGroups / fetchGroupProducts are the entry points that pull every set and
// its ProductsAndPrices.csv from tcgcsv.com. A regression in the error handling
// (silently accepting a bad/HTTP-error response) or in the CSV parse options
// would corrupt the daily ingest for every card, so both are worth pinning.
//
// config.js does `import 'dotenv/config'` and pulls @supabase (neither is a
// web-app dependency), so we mock it to keep the import chain hermetic and to
// control the base URL / headers the helpers use.
jest.mock('../../mobile/pipeline/src/config.js', () => ({
  TCGCSV_BASE: 'http://example.test/tcg/62',
  HTTP_HEADERS: { 'User-Agent': 'test-agent', Accept: '*/*' },
}));

import {
  fetchGroups,
  fetchGroupProducts,
} from '../../mobile/pipeline/src/tcgcsv.js';

describe('fetchGroups', () => {
  afterEach(() => {
    delete globalThis.fetch;
    jest.restoreAllMocks();
  });

  it('requests the groups endpoint with the configured headers and returns results', async () => {
    const results = [
      { groupId: 1, name: 'Welcome to Rathe' },
      { groupId: 2, name: 'Arcane Rising' },
    ];
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, results }) })
    );

    const out = await fetchGroups();

    expect(out).toBe(results);
    expect(globalThis.fetch).toHaveBeenCalledWith('http://example.test/tcg/62/groups', {
      headers: { 'User-Agent': 'test-agent', Accept: '*/*' },
    });
  });

  it('throws a descriptive error on a non-ok response', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' })
    );

    await expect(fetchGroups()).rejects.toThrow(
      'Failed to fetch groups: 503 Service Unavailable'
    );
  });

  it('throws when the payload is not a successful/array response', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false, results: [] }) })
    );
    await expect(fetchGroups()).rejects.toThrow('Invalid groups response from TCGCSV');

    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, results: null }) })
    );
    await expect(fetchGroups()).rejects.toThrow('Invalid groups response from TCGCSV');
  });
});

describe('fetchGroupProducts', () => {
  afterEach(() => {
    delete globalThis.fetch;
    jest.restoreAllMocks();
  });

  it('fetches the ProductsAndPrices.csv for a group and parses trimmed rows', async () => {
    const csvText =
      'productId , name ,marketPrice\n' +
      '  100 ,  Lightning  , 1.50 \n' +
      '101,Ember,9.00\n';
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve(csvText) })
    );

    const rows = await fetchGroupProducts(42);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://example.test/tcg/62/42/ProductsAndPrices.csv',
      { headers: { 'User-Agent': 'test-agent', Accept: '*/*' } }
    );
    // Headers and values are trimmed by the transform options.
    expect(rows).toEqual([
      { productId: '100', name: 'Lightning', marketPrice: '1.50' },
      { productId: '101', name: 'Ember', marketPrice: '9.00' },
    ]);
  });

  it('throws a descriptive error including the group id on a non-ok response', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' })
    );

    await expect(fetchGroupProducts(999)).rejects.toThrow(
      'Failed to fetch products for group 999: 404 Not Found'
    );
  });

  it('warns but still returns data when the CSV has parse errors', async () => {
    // A quoted field left unterminated makes Papa emit an error while still
    // yielding rows; the helper should surface a warning, not throw.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const csvText = 'name,price\n"Unterminated,1.0\nEmber,2.0\n';
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve(csvText) })
    );

    const rows = await fetchGroupProducts(7);

    expect(warn).toHaveBeenCalled();
    expect(Array.isArray(rows)).toBe(true);
  });

  it('skips empty lines in the CSV', async () => {
    const csvText = 'name,price\nEmber,2.0\n\n\nZen,3.0\n';
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve(csvText) })
    );

    const rows = await fetchGroupProducts(3);

    expect(rows).toEqual([
      { name: 'Ember', price: '2.0' },
      { name: 'Zen', price: '3.0' },
    ]);
  });
});
