// Covers src/services/fabDb.js — the dependency-free reader for the shared
// Supabase card/price database, plus the build-time snapshot fast path.
//
// env.js reads `import.meta.env`, which Jest cannot parse, so it is mocked
// (mirroring the tradeHistory/entitlements suites' handling of supabase.js).
// `fetch` and the `__CATALOG_URL__` global (substituted by vite.config.js) are
// the only other seams, so both are controlled here.
jest.mock('../../src/config/env.js', () => ({
  requireSupabaseConfig: jest.fn(() => ({ url: 'https://db.test', key: 'anon-key' })),
}));

import { requireSupabaseConfig } from '../../src/config/env.js';
import {
  CATALOG_SNAPSHOT_VERSION,
  fetchCatalogRows,
  fetchSetGroups,
  fetchPricesUpdatedAt,
  fetchCatalogFromDatabase,
  fetchCatalog,
} from '../../src/services/fabDb.js';

// Minimal Response-like object. `content-range` is the only header fabDb reads.
const jsonResponse = (body, { ok = true, status = 200, contentRange = null } = {}) => ({
  ok,
  status,
  json: async () => body,
  headers: {
    get: (name) => (String(name).toLowerCase() === 'content-range' ? contentRange : null),
  },
});

const offsetOf = (url) => {
  const match = /offset=(\d+)/.exec(url);
  return match ? Number(match[1]) : null;
};

const cardRows = (count, startId = 0) =>
  Array.from({ length: count }, (_, i) => ({
    id: `card-${startId + i}`,
    product_id: startId + i,
    set_id: 1,
    name: `Card ${startId + i}`,
  }));

beforeEach(() => {
  requireSupabaseConfig.mockClear();
  requireSupabaseConfig.mockReturnValue({ url: 'https://db.test', key: 'anon-key' });
  globalThis.fetch = jest.fn();
  delete globalThis.__CATALOG_URL__;
});

afterEach(() => {
  delete globalThis.__CATALOG_URL__;
});

describe('restFetch (via public callers)', () => {
  test('sends the publishable key and points at the configured project', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse([]));

    await fetchSetGroups();

    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/db\.test\/rest\/v1\/fab_sets\?/);
    expect(options.headers.apikey).toBe('anon-key');
    expect(options.headers.Authorization).toBe('Bearer anon-key');
  });

  test('throws with the HTTP status when the database rejects the request', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(null, { ok: false, status: 503 }));

    await expect(fetchSetGroups()).rejects.toThrow(/failed \(503\)/);
  });
});

describe('fetchCatalogRows', () => {
  test('reads a single page and requests an exact count on the first request', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(cardRows(3)));

    const rows = await fetchCatalogRows();

    expect(rows).toHaveLength(3);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('fab_cards_with_prices');
    expect(url).toContain('is_sealed=eq.false');
    expect(url).toContain('offset=0');
    expect(options.headers.Prefer).toBe('count=exact');
  });

  test('maps a database row into the legacy TCGCSV column shape', async () => {
    const fullRow = {
      id: 'WTR-001-normal', product_id: 42, set_id: 7, name: 'Wounded Bull',
      image_url: 'https://img/x.png', sub_type_name: 'Normal', rarity: 'C',
      collector_number: 'WTR001', card_type: 'Action', card_sub_type: 'Attack',
      card_class: 'Warrior', talent: 'Light', pitch: 1, cost: 2,
      power: 4, defense: 3, life: null, intellect: null, set_name: 'Welcome to Rathe',
      tcg_low: 0.1, tcg_mid: 0.5, tcg_high: 2.0, tcg_market: 0.7, tcg_direct_low: 0.2,
    };
    globalThis.fetch.mockResolvedValue(jsonResponse([fullRow]));

    const [row] = await fetchCatalogRows();

    expect(row).toEqual({
      productId: 42,
      name: 'Wounded Bull',
      groupId: 7,
      imageUrl: 'https://img/x.png',
      lowPrice: 0.1,
      midPrice: 0.5,
      highPrice: 2.0,
      marketPrice: 0.7,
      directLowPrice: 0.2,
      subTypeName: 'Normal',
      extRarity: 'C',
      extNumber: 'WTR001',
      extCardType: 'Action',
      extCardSubType: 'Attack',
      extClass: 'Warrior',
      extIntellect: null,
      extLife: null,
      extCost: 2,
      extPitchValue: 1,
      extPower: 4,
      extDefenseValue: 3,
      extTalent: 'Light',
      _uniqueId: 'WTR-001-normal',
      _setName: 'Welcome to Rathe',
    });
  });

  test('defaults absent text fields to empty strings while preserving the id', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse([{ id: 'sparse' }]));

    const [row] = await fetchCatalogRows();

    expect(row).toMatchObject({
      _uniqueId: 'sparse',
      name: '',
      imageUrl: '',
      subTypeName: '',
      extRarity: '',
      extNumber: '',
      extCardType: '',
      extCardSubType: '',
      extClass: '',
      extTalent: '',
      _setName: '',
    });
    expect(row.lowPrice).toBeUndefined();
  });

  test('fetches the remaining pages in parallel using the Content-Range total', async () => {
    globalThis.fetch.mockImplementation(async (url) => {
      const offset = offsetOf(url);
      if (offset === 0) return jsonResponse(cardRows(1000, 0), { contentRange: '0-999/2500' });
      if (offset === 1000) return jsonResponse(cardRows(1000, 1000));
      if (offset === 2000) return jsonResponse(cardRows(500, 2000));
      throw new Error(`unexpected offset ${offset}`);
    });

    const rows = await fetchCatalogRows();

    expect(rows).toHaveLength(2500);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(rows[0]._uniqueId).toBe('card-0');
    expect(rows[2499]._uniqueId).toBe('card-2499');
  });

  test('walks pages one at a time when the count header is missing', async () => {
    globalThis.fetch.mockImplementation(async (url) => {
      const offset = offsetOf(url);
      if (offset === 0) return jsonResponse(cardRows(1000, 0), { contentRange: null });
      if (offset === 1000) return jsonResponse(cardRows(1000, 1000));
      if (offset === 2000) return jsonResponse(cardRows(300, 2000));
      throw new Error(`unexpected offset ${offset}`);
    });

    const rows = await fetchCatalogRows();

    expect(rows).toHaveLength(2300);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  test('keeps walking past a stale count when more rows were inserted', async () => {
    // Content-Range said 2000, but the last parallel page is still full because
    // rows landed after the count was taken; the slow walk must pick them up.
    globalThis.fetch.mockImplementation(async (url) => {
      const offset = offsetOf(url);
      if (offset === 0) return jsonResponse(cardRows(1000, 0), { contentRange: '0-999/2000' });
      if (offset === 1000) return jsonResponse(cardRows(1000, 1000));
      if (offset === 2000) return jsonResponse(cardRows(200, 2000));
      throw new Error(`unexpected offset ${offset}`);
    });

    const rows = await fetchCatalogRows();

    expect(rows).toHaveLength(2200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });
});

describe('fetchSetGroups', () => {
  test('maps browse metadata and coerces optional fields', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse([
      {
        group_id: 1, name: 'Alpha', set_number: 5, abbreviation: 'ALP',
        published_on: '2021-01-01', is_supplemental: 1, modified_on: '2021-02-02',
      },
      { group_id: 2 },
    ]));

    const sets = await fetchSetGroups();

    expect(sets[0]).toEqual({
      groupId: 1,
      name: 'Alpha',
      setNumber: 5,
      abbreviation: 'ALP',
      publishedOn: '2021-01-01',
      isSupplemental: true,
      modifiedOn: '2021-02-02',
    });
    expect(sets[1]).toEqual({
      groupId: 2,
      name: '',
      setNumber: undefined,
      abbreviation: '',
      publishedOn: null,
      isSupplemental: false,
      modifiedOn: null,
    });
  });
});

describe('fetchPricesUpdatedAt', () => {
  test('returns the newest ingest timestamp', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse([{ updated_at: '2026-07-01T00:00:00Z' }]));

    await expect(fetchPricesUpdatedAt()).resolves.toBe('2026-07-01T00:00:00Z');
  });

  test('returns null when no price rows exist', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse([]));

    await expect(fetchPricesUpdatedAt()).resolves.toBeNull();
  });

  test('returns null when the timestamp column is absent', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse([{}]));

    await expect(fetchPricesUpdatedAt()).resolves.toBeNull();
  });
});

describe('fetchCatalogFromDatabase', () => {
  test('joins each card to its set number and tags the snapshot version', async () => {
    globalThis.fetch.mockImplementation(async (url) => {
      if (url.includes('fab_cards_with_prices')) {
        return jsonResponse([
          { id: 'a', product_id: 1, set_id: 10, name: 'A' },
          { id: 'b', product_id: 2, set_id: 99, name: 'B' },
        ]);
      }
      if (url.includes('fab_sets')) {
        return jsonResponse([{ group_id: 10, name: 'Ten', set_number: 7 }]);
      }
      if (url.includes('fab_card_prices')) {
        return jsonResponse([{ updated_at: '2026-07-02T00:00:00Z' }]);
      }
      throw new Error(`unexpected url ${url}`);
    });

    const snapshot = await fetchCatalogFromDatabase();

    expect(snapshot.version).toBe(CATALOG_SNAPSHOT_VERSION);
    expect(snapshot.pricesUpdatedAt).toBe('2026-07-02T00:00:00Z');
    expect(snapshot.rows[0]._setNumber).toBe(7);
    // 99 has no matching set, so it falls back to 0 rather than undefined.
    expect(snapshot.rows[1]._setNumber).toBe(0);
    expect(snapshot.sets).toHaveLength(1);
  });
});

describe('fetchCatalog', () => {
  const validSnapshot = {
    version: CATALOG_SNAPSHOT_VERSION,
    rows: [{ productId: 1, _uniqueId: 'x' }],
    sets: [],
    pricesUpdatedAt: '2026-07-03T00:00:00Z',
  };

  test('uses the build-time snapshot and never touches the database', async () => {
    globalThis.__CATALOG_URL__ = 'https://cdn.test/catalog.json';
    globalThis.fetch.mockResolvedValue(jsonResponse(validSnapshot));

    const result = await fetchCatalog();

    expect(result).toEqual(validSnapshot);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('https://cdn.test/catalog.json');
    expect(requireSupabaseConfig).not.toHaveBeenCalled();
  });

  test('falls back to the database when the snapshot request fails', async () => {
    globalThis.__CATALOG_URL__ = 'https://cdn.test/catalog.json';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch.mockImplementation(async (url) => {
      if (url === 'https://cdn.test/catalog.json') {
        return jsonResponse(null, { ok: false, status: 404 });
      }
      if (url.includes('fab_cards_with_prices')) return jsonResponse([]);
      if (url.includes('fab_sets')) return jsonResponse([]);
      if (url.includes('fab_card_prices')) return jsonResponse([]);
      throw new Error(`unexpected url ${url}`);
    });

    const result = await fetchCatalog();

    expect(result.version).toBe(CATALOG_SNAPSHOT_VERSION);
    expect(requireSupabaseConfig).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('falls back to the database when the snapshot is from an incompatible build', async () => {
    globalThis.__CATALOG_URL__ = 'https://cdn.test/catalog.json';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch.mockImplementation(async (url) => {
      if (url === 'https://cdn.test/catalog.json') {
        return jsonResponse({ version: CATALOG_SNAPSHOT_VERSION + 1, rows: [] });
      }
      if (url.includes('fab_cards_with_prices')) return jsonResponse([]);
      if (url.includes('fab_sets')) return jsonResponse([]);
      if (url.includes('fab_card_prices')) return jsonResponse([]);
      throw new Error(`unexpected url ${url}`);
    });

    const result = await fetchCatalog();

    expect(result.version).toBe(CATALOG_SNAPSHOT_VERSION);
    expect(requireSupabaseConfig).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('reads the database directly when the build baked in no snapshot', async () => {
    globalThis.fetch.mockImplementation(async (url) => {
      if (url.includes('fab_cards_with_prices')) return jsonResponse([]);
      if (url.includes('fab_sets')) return jsonResponse([]);
      if (url.includes('fab_card_prices')) return jsonResponse([]);
      throw new Error(`unexpected url ${url}`);
    });

    const result = await fetchCatalog();

    expect(result.version).toBe(CATALOG_SNAPSHOT_VERSION);
    expect(requireSupabaseConfig).toHaveBeenCalled();
    // No snapshot URL means no attempt at the CDN file at all.
    expect(globalThis.fetch.mock.calls.every(([url]) => url.startsWith('https://db.test'))).toBe(true);
  });
});
