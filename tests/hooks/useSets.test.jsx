// `useSets` keeps a module-level cache of the product-groups fetch, so each
// test must start from a clean module registry (jest.resetModules) to stay
// independent. Resetting the registry would normally also hand the freshly
// required hook a *different* copy of React than the top-level renderer, which
// makes the hooks dispatcher null. To avoid that we pin `react` to the single
// instance the renderer uses via `jest.doMock` in beforeEach.
//
// `useSets` also pulls the card list from `useCardData`, which depends on
// `import.meta`/context wiring the unit suite deliberately mocks out. Replacing
// it with a plain object lets us drive the grouping/slug logic deterministically.
import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

let mockCardData;
jest.mock('../../src/hooks/useCardData.jsx', () => ({
  useCardData: () => mockCardData,
}));

// A row that looks like a real playable card (has an extCardType).
const card = (overrides = {}) => ({
  name: 'Card',
  groupId: '1',
  extCardType: 'Action',
  extNumber: 'WTR001',
  extRarity: 'C',
  extClass: 'Generic',
  marketPrice: '1',
  ...overrides,
});

const group = (overrides = {}) => ({
  groupId: '1',
  name: 'Welcome to Rathe',
  abbreviation: 'WTR',
  publishedOn: '2019-10-11',
  modifiedOn: '2020-01-01',
  isSupplemental: false,
  ...overrides,
});

const okFetch = (results) =>
  jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results }),
  });

// Fresh module registry per test so the module-level groups cache never leaks
// between cases. `useSets` is re-required against the pinned React instance.
const loadHook = () => {
  // eslint-disable-next-line no-undef
  const { useSets } = require('../../src/hooks/useSets.js');
  return { useSets };
};

beforeEach(() => {
  jest.resetModules();
  // Keep the freshly required hook on the same React copy as the renderer.
  jest.doMock('react', () => React);
  mockCardData = { cards: [], dataReady: true };
  globalThis.fetch = okFetch([]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useSets - loading product groups', () => {
  test('fetches product groups on mount and clears loading on success', async () => {
    mockCardData = { cards: [card()], dataReady: true };
    globalThis.fetch = okFetch([group()]);
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());
    // Initial render kicks off the async load.
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(globalThis.fetch).toHaveBeenCalledWith('/productgroups.json');
    expect(result.current.error).toBeNull();
    expect(result.current.sets).toHaveLength(1);
  });

  test('sets an error and empties sets when the fetch responds non-ok', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load product groups: 503');
    expect(result.current.sets).toEqual([]);
  });

  test('treats a non-array results payload as an empty group list', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: 'not-an-array' }),
    });
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.sets).toEqual([]);
  });

  test('reuses the module-level cache without a second fetch on remount', async () => {
    globalThis.fetch = okFetch([group()]);
    mockCardData = { cards: [card()], dataReady: true };
    const { useSets } = loadHook();

    const first = renderHook(() => useSets());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // A brand new consumer mounts: the cache should feed it synchronously and
    // no additional network request should be made.
    const second = renderHook(() => useSets());
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.sets).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test('stays in loading state until useCardData reports dataReady', async () => {
    mockCardData = { cards: [], dataReady: false };
    globalThis.fetch = okFetch([group()]);
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());
    // Even after groups resolve, loading remains true because card data isn't
    // ready yet (loading = internalLoading || !dataReady).
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(result.current.loading).toBe(true);
  });
});

describe('useSets - deriving sets from cards', () => {
  test('only includes groups that contain playable cards', async () => {
    mockCardData = {
      cards: [card({ groupId: '1' })],
      dataReady: true,
    };
    globalThis.fetch = okFetch([
      group({ groupId: '1', name: 'Has Cards' }),
      group({ groupId: '2', name: 'Empty Set' }),
    ]);
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sets).toHaveLength(1);
    expect(result.current.sets[0].name).toBe('Has Cards');
    expect(result.current.sets[0].cardCount).toBe(1);
  });

  test('excludes rows that are not actual cards (sealed product, etc.)', async () => {
    mockCardData = {
      cards: [
        // No card type, no number -> filtered out by isActualCard.
        card({ groupId: '1', extCardType: '', extNumber: '' }),
        // Number present but neither rarity nor class -> still filtered out.
        card({
          groupId: '1',
          extCardType: '',
          extNumber: 'B01',
          extRarity: '',
          extClass: '',
        }),
      ],
      dataReady: true,
    };
    globalThis.fetch = okFetch([group({ groupId: '1' })]);
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Group had rows but none qualify as cards, so no eligible set remains.
    expect(result.current.sets).toEqual([]);
  });

  test('includes a card qualifying via number + class even without a type', async () => {
    mockCardData = {
      cards: [
        card({
          groupId: '1',
          extCardType: '',
          extNumber: 'B01',
          extRarity: '',
          extClass: 'Guardian',
        }),
      ],
      dataReady: true,
    };
    globalThis.fetch = okFetch([group({ groupId: '1' })]);
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sets).toHaveLength(1);
  });

  test('ignores cards with no groupId when grouping', async () => {
    mockCardData = {
      cards: [card({ groupId: '' }), card({ groupId: undefined })],
      dataReady: true,
    };
    globalThis.fetch = okFetch([group({ groupId: '1' })]);
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sets).toEqual([]);
  });

  test('computes the top market price across a set', async () => {
    mockCardData = {
      cards: [
        card({ groupId: '1', marketPrice: '4.50' }),
        card({ groupId: '1', marketPrice: '12.99' }),
        card({ groupId: '1', marketPrice: 'not-a-number' }),
      ],
      dataReady: true,
    };
    globalThis.fetch = okFetch([group({ groupId: '1' })]);
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sets[0].topMarketPrice).toBe(12.99);
  });

  test('sorts sets by publishedOn descending, nulls last', async () => {
    mockCardData = {
      cards: [
        card({ groupId: '1' }),
        card({ groupId: '2' }),
        card({ groupId: '3' }),
      ],
      dataReady: true,
    };
    globalThis.fetch = okFetch([
      group({ groupId: '1', name: 'Old', publishedOn: '2019-01-01' }),
      group({ groupId: '2', name: 'New', publishedOn: '2023-01-01' }),
      group({ groupId: '3', name: 'Undated', publishedOn: null }),
    ]);
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sets.map((s) => s.name)).toEqual([
      'New',
      'Old',
      'Undated',
    ]);
  });

  test('falls back to a generated name and default fields when metadata is sparse', async () => {
    mockCardData = { cards: [card({ groupId: '7' })], dataReady: true };
    globalThis.fetch = okFetch([{ groupId: '7' }]);
    const { useSets } = loadHook();

    const { result } = renderHook(() => useSets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const set = result.current.sets[0];
    expect(set.name).toBe('Set 7');
    expect(set.abbreviation).toBe('');
    expect(set.isSupplemental).toBe(false);
    expect(set.slug).toBeTruthy();
  });
});

describe('useSets - getSetById', () => {
  const setup = async () => {
    mockCardData = {
      cards: [
        card({ groupId: '1', name: 'Alpha' }),
        card({ groupId: '2', name: 'Bravo' }),
      ],
      dataReady: true,
    };
    globalThis.fetch = okFetch([
      group({ groupId: '1', name: 'Welcome to Rathe' }),
      group({ groupId: '2', name: 'Arcane Rising' }),
    ]);
    const { useSets } = loadHook();
    const hook = renderHook(() => useSets());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook;
  };

  test('returns null for empty input', async () => {
    const { result } = await setup();
    expect(result.current.getSetById('')).toBeNull();
    expect(result.current.getSetById(null)).toBeNull();
    expect(result.current.getSetById(undefined)).toBeNull();
  });

  test('resolves a set by its SEO slug', async () => {
    const { result } = await setup();
    const set = result.current.getSetById('welcome-to-rathe');
    expect(set).not.toBeNull();
    expect(set.groupId).toBe('1');
    expect(set.name).toBe('Welcome to Rathe');
    expect(set.cards).toHaveLength(1);
    expect(set.slug).toBe('welcome-to-rathe');
  });

  test('resolves a set by its raw numeric groupId', async () => {
    const { result } = await setup();
    const set = result.current.getSetById('2');
    expect(set).not.toBeNull();
    expect(set.name).toBe('Arcane Rising');
    expect(set.cards).toHaveLength(1);
  });

  test('returns null when neither a slug nor a group with cards matches', async () => {
    const { result } = await setup();
    expect(result.current.getSetById('does-not-exist')).toBeNull();
  });
});
