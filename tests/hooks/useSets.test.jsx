import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

// useSets pulls its card data from useCardData (a context hook that reaches the
// Vite/import.meta boundary in the real app) so we replace it with a mutable
// stub. The variable MUST be prefixed with `mock` to satisfy jest's hoisting.
let mockCardData = { cards: [], dataReady: true };
jest.mock('../../src/hooks/useCardData.jsx', () => ({
  useCardData: () => mockCardData,
}));

// setLogos owns its own module-level cache and network fetch; swap it for a
// deterministic promise so useSets' Promise.all resolves predictably.
let mockLogoMap = {};
jest.mock('../../src/utils/setLogos.js', () => ({
  loadSetLogoMap: () => Promise.resolve(mockLogoMap),
}));

const okResponse = (results) => ({
  ok: true,
  status: 200,
  json: async () => ({ results }),
});

const makeCard = (over = {}) => ({
  groupId: '1',
  extNumber: 'ABC001',
  extCardType: 'Action',
  extRarity: 'Common',
  extClass: 'Warrior',
  marketPrice: 1,
  ...over,
});

describe('useSets', () => {
  let useSets;

  beforeEach(() => {
    jest.resetModules();
    // useSets keeps a module-level groups cache, so we reset modules between
    // tests and re-require it fresh. Pin the SAME React instance that
    // renderHook (imported above) already captured, otherwise the freshly
    // required hook would get a different React copy and its hooks would break.
    jest.doMock('react', () => React);
    // eslint-disable-next-line no-undef
    useSets = require('../../src/hooks/useSets.js').useSets;

    mockCardData = { cards: [], dataReady: true };
    mockLogoMap = {};
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete globalThis.fetch;
  });

  test('loads product groups and enriches sets with card-derived stats', async () => {
    mockCardData = {
      dataReady: true,
      cards: [
        makeCard({ groupId: '1', marketPrice: 5 }),
        makeCard({ groupId: '1', marketPrice: 12 }),
        makeCard({ groupId: '2', marketPrice: 3 }),
      ],
    };
    mockLogoMap = { 1: 'https://cdn/logo1.png' };
    globalThis.fetch.mockResolvedValue(
      okResponse([
        { groupId: 1, name: 'Alpha', abbreviation: 'ALP', publishedOn: '2024-01-01', isSupplemental: true },
        { groupId: 2, name: 'Beta', abbreviation: 'BET' },
      ])
    );

    const { result } = renderHook(() => useSets());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(globalThis.fetch).toHaveBeenCalledWith('/productgroups.json');
    expect(result.current.error).toBeNull();
    expect(result.current.sets).toHaveLength(2);

    const alpha = result.current.sets.find((s) => String(s.groupId) === '1');
    expect(alpha).toMatchObject({
      name: 'Alpha',
      abbreviation: 'ALP',
      cardCount: 2,
      topMarketPrice: 12,
      isSupplemental: true,
      logoUrl: 'https://cdn/logo1.png',
      slug: 'alpha',
    });

    const beta = result.current.sets.find((s) => String(s.groupId) === '2');
    expect(beta.logoUrl).toBeNull();
    expect(beta.slug).toBe('beta');
  });

  test('excludes groups that have no playable cards', async () => {
    mockCardData = {
      dataReady: true,
      cards: [
        makeCard({ groupId: '1' }),
        // Sealed product row for group 3: no card type / number => not a card.
        makeCard({ groupId: '3', extCardType: '', extNumber: '', extRarity: '', extClass: '' }),
      ],
    };
    globalThis.fetch.mockResolvedValue(
      okResponse([
        { groupId: 1, name: 'Alpha', abbreviation: 'ALP' },
        { groupId: 3, name: 'Sealed Boxes', abbreviation: 'BOX' },
      ])
    );

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sets).toHaveLength(1);
    expect(result.current.sets[0].name).toBe('Alpha');
  });

  test('derives the set abbreviation from card numbers when the group omits it', async () => {
    mockCardData = {
      dataReady: true,
      cards: Array.from({ length: 6 }, (_, i) =>
        makeCard({ groupId: '5', extNumber: `SEA00${i + 1}` })
      ),
    };
    globalThis.fetch.mockResolvedValue(
      okResponse([{ groupId: 5, name: 'High Seas', abbreviation: '' }])
    );

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sets[0].abbreviation).toBe('SEA');
  });

  test('getSetById resolves by numeric groupId and by slug, and returns the cards', async () => {
    mockCardData = {
      dataReady: true,
      cards: [makeCard({ groupId: '1' }), makeCard({ groupId: '1' })],
    };
    globalThis.fetch.mockResolvedValue(
      okResponse([{ groupId: 1, name: 'Alpha', abbreviation: 'ALP' }])
    );

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const byId = result.current.getSetById('1');
    expect(byId).toMatchObject({ name: 'Alpha', abbreviation: 'ALP', slug: 'alpha' });
    expect(byId.cards).toHaveLength(2);

    const bySlug = result.current.getSetById('alpha');
    expect(bySlug.groupId).toBe(1);
    expect(bySlug.cards).toHaveLength(2);

    expect(result.current.getSetById('does-not-exist')).toBeNull();
    expect(result.current.getSetById(null)).toBeNull();
  });

  test('reports an error when the product groups request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const { result } = renderHook(() => useSets());

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.loading).toBe(false);
    expect(result.current.sets).toEqual([]);
    expect(result.current.error).toContain('500');
  });

  test('stays in loading state until the card data is ready', async () => {
    mockCardData = { cards: [], dataReady: false };
    globalThis.fetch.mockResolvedValue(okResponse([{ groupId: 1, name: 'Alpha' }]));

    const { result } = renderHook(() => useSets());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    // Groups have loaded but card data is not ready, so the hook must keep
    // reporting loading=true to avoid rendering an empty browse view.
    expect(result.current.loading).toBe(true);
  });

  test('reuses the cached product groups across mounts (single fetch)', async () => {
    mockCardData = { dataReady: true, cards: [makeCard({ groupId: '1' })] };
    globalThis.fetch.mockResolvedValue(
      okResponse([{ groupId: 1, name: 'Alpha', abbreviation: 'ALP' }])
    );

    const first = renderHook(() => useSets());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const second = renderHook(() => useSets());
    await waitFor(() => expect(second.result.current.loading).toBe(false));

    // The module-level cache means the second mount must not refetch.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(second.result.current.sets).toHaveLength(1);
  });
});
