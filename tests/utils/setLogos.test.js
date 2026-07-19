// Unit tests for the set-logo loader used by the React set browser (useSets).
//
// This is a shared utility with a module-level cache and a single network
// fetch of /setLogos.json. A regression here silently drops every set logo on
// the browse pages, so the caching, normalization, and error branches are all
// worth pinning. The module keeps a module-level cache, so each test resets the
// registry and re-imports it to stay independent. It has no React dependency,
// so a plain require after resetModules is enough to get a fresh cache.

describe('setLogos', () => {
  let loadSetLogoMap;
  let getSetLogoUrl;

  beforeEach(() => {
    jest.resetModules();
    // eslint-disable-next-line no-undef
    const mod = require('../../src/utils/setLogos.js');
    loadSetLogoMap = mod.loadSetLogoMap;
    getSetLogoUrl = mod.getSetLogoUrl;
  });

  afterEach(() => {
    delete globalThis.fetch;
    jest.restoreAllMocks();
  });

  const okResponse = (data) => ({
    ok: true,
    json: async () => data,
  });

  describe('getSetLogoUrl', () => {
    test('returns null when the map is missing', () => {
      expect(getSetLogoUrl(null, '2724')).toBeNull();
      expect(getSetLogoUrl(undefined, '2724')).toBeNull();
    });

    test('returns null when groupId is null or undefined', () => {
      expect(getSetLogoUrl({ 2724: 'x.png' }, null)).toBeNull();
      expect(getSetLogoUrl({ 2724: 'x.png' }, undefined)).toBeNull();
    });

    test('looks up by stringified groupId (numeric input coerced)', () => {
      const map = { 2724: 'https://cdn/cru.png' };
      expect(getSetLogoUrl(map, 2724)).toBe('https://cdn/cru.png');
      expect(getSetLogoUrl(map, '2724')).toBe('https://cdn/cru.png');
    });

    test('returns null for an unknown groupId', () => {
      expect(getSetLogoUrl({ 2724: 'x.png' }, '9999')).toBeNull();
    });

    test('treats groupId 0 as a valid lookup key', () => {
      expect(getSetLogoUrl({ 0: 'zero.png' }, 0)).toBe('zero.png');
    });
  });

  describe('loadSetLogoMap', () => {
    test('normalizes object entries and bare-string entries to groupId -> url', async () => {
      globalThis.fetch = jest.fn(async () =>
        okResponse({
          logos: {
            2724: { name: 'Crucible of War', logoUrl: 'https://cdn/cru.png' },
            2775: 'https://cdn/bare.png',
          },
        })
      );

      const map = await loadSetLogoMap();

      expect(map).toEqual({
        2724: 'https://cdn/cru.png',
        2775: 'https://cdn/bare.png',
      });
      expect(globalThis.fetch).toHaveBeenCalledWith('/setLogos.json');
    });

    test('drops entries that resolve to no url', async () => {
      globalThis.fetch = jest.fn(async () =>
        okResponse({
          logos: {
            1: { name: 'No logo here' },
            2: { logoUrl: '' },
            3: '',
            4: { logoUrl: 'https://cdn/keep.png' },
          },
        })
      );

      const map = await loadSetLogoMap();

      expect(map).toEqual({ 4: 'https://cdn/keep.png' });
    });

    test('returns an empty map when logos is missing or not an object', async () => {
      globalThis.fetch = jest.fn(async () => okResponse({ logos: 'nope' }));

      const map = await loadSetLogoMap();

      expect(map).toEqual({});
    });

    test('caches the result so a second call does not re-fetch', async () => {
      globalThis.fetch = jest.fn(async () =>
        okResponse({ logos: { 2724: 'https://cdn/cru.png' } })
      );

      const first = await loadSetLogoMap();
      const second = await loadSetLogoMap();

      expect(second).toBe(first);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    test('shares one in-flight promise across concurrent callers', async () => {
      globalThis.fetch = jest.fn(async () =>
        okResponse({ logos: { 2724: 'https://cdn/cru.png' } })
      );

      const [a, b] = await Promise.all([loadSetLogoMap(), loadSetLogoMap()]);

      expect(a).toBe(b);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    test('returns an empty map when the response is not ok', async () => {
      globalThis.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) }));

      const map = await loadSetLogoMap();

      expect(map).toEqual({});
    });

    test('swallows fetch errors and returns an empty map', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      globalThis.fetch = jest.fn(async () => {
        throw new Error('network down');
      });

      const map = await loadSetLogoMap();

      expect(map).toEqual({});
      expect(warn).toHaveBeenCalled();
    });

    test('caches the empty result after a failure (does not re-fetch)', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      globalThis.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(okResponse({ logos: { 2724: 'https://cdn/cru.png' } }));

      const failed = await loadSetLogoMap();
      expect(failed).toEqual({});

      // The failed load caches an empty map, so a later call is served from
      // cache and never issues a second network request.
      const second = await loadSetLogoMap();
      expect(second).toBe(failed);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
