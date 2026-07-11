import { renderHook, act } from '@testing-library/react';
import { useTradeState } from '../../src/hooks/useTradeState.js';

const cardGroups = [
  {
    name: 'Card A',
    editions: [
      { subTypeName: 'Normal', cardPrice: 10, uniqueId: 'a-normal' },
      { subTypeName: 'Rainbow Foil', cardPrice: 25, uniqueId: 'a-rf' },
    ],
  },
  {
    name: 'Card B',
    editions: [{ subTypeName: 'Normal', cardPrice: 5, uniqueId: 'b-normal' }],
  },
];

const setup = () => renderHook(() => useTradeState(cardGroups, {}));

// Mirrors the encoding side of urlEncoding.js so we can build a real `?trade=`
// param that decodeTradeFromURL() can round-trip. Card names must avoid the
// lossy single-letter substitutions (B/R/Y) — 'Card A' survives cleanly.
const makeTradeParam = (payload) =>
  encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));

beforeEach(() => {
  // Ensure no stray ?trade= param leaks between tests via the URL-load effect.
  window.history.replaceState({}, '', '/');
});

describe('useTradeState — adding cards', () => {
  test('adds a card to the have list with default quantity 1', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A'));

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({
      name: 'Card A',
      price: 10,
      quantity: 1,
      subTypeName: 'Normal',
    });
  });

  test('adds a card to the want list independently', () => {
    const { result } = setup();
    act(() => result.current.addWantCard('Card B'));

    expect(result.current.wantList).toHaveLength(1);
    expect(result.current.haveList).toHaveLength(0);
  });

  test('does not add duplicates to the same list', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A'));
    act(() => result.current.addHaveCard('Card A'));
    expect(result.current.haveList).toHaveLength(1);
  });

  test('ignores unknown card names', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Nonexistent Card'));
    expect(result.current.haveList).toHaveLength(0);
  });

  test('ignores non-string / non-object input', () => {
    const { result } = setup();
    // `true` is truthy so it passes the `name || input` fallback, but it is
    // neither a string nor an object, exercising the invalid-input early return.
    act(() => result.current.addHaveCard(true));
    expect(result.current.haveList).toHaveLength(0);
  });

  test('deduplicates by uniqueId when adding the same autocomplete option twice', () => {
    const { result } = setup();
    const option = {
      label: 'Card A',
      card: { _uniqueId: 'a-rf', subTypeName: 'Rainbow Foil' },
    };
    act(() => result.current.addHaveCard(option));
    act(() => result.current.addHaveCard(option));
    expect(result.current.haveList).toHaveLength(1);
  });

  test('accepts an autocomplete option object and uses its edition', () => {
    const { result } = setup();
    act(() =>
      result.current.addHaveCard({
        label: 'Card A',
        card: { _uniqueId: 'a-rf', subTypeName: 'Rainbow Foil' },
      })
    );
    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Rainbow Foil',
      price: 25,
    });
  });
});

describe('useTradeState — removing & quantities', () => {
  test('removes a card by index', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A'));
    act(() => result.current.addHaveCard('Card B'));
    act(() => result.current.removeHaveCard(0));

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].name).toBe('Card B');
  });

  test('updates a card quantity', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A'));
    act(() => result.current.updateHaveCardQuantity(0, 4));
    expect(result.current.haveList[0].quantity).toBe(4);
  });

  test('removes and updates quantities on the want list', () => {
    const { result } = setup();
    act(() => result.current.addWantCard('Card A'));
    act(() => result.current.addWantCard('Card B'));

    act(() => result.current.updateWantCardQuantity(1, 3));
    expect(result.current.wantList[1].quantity).toBe(3);

    act(() => result.current.removeWantCard(0));
    expect(result.current.wantList).toHaveLength(1);
    expect(result.current.wantList[0].name).toBe('Card B');
  });
});

describe('useTradeState — price refresh on cardGroups change', () => {
  const renderWithGroups = (initialGroups) =>
    renderHook(({ groups }) => useTradeState(groups, {}), {
      initialProps: { groups: initialGroups },
    });

  test('re-prices existing cards when cardGroups update', () => {
    const { result, rerender } = renderWithGroups(cardGroups);
    act(() => result.current.addHaveCard('Card A'));
    act(() => result.current.addWantCard('Card B'));
    expect(result.current.haveList[0].price).toBe(10);

    const updatedGroups = [
      {
        name: 'Card A',
        editions: [
          { subTypeName: 'Normal', cardPrice: 99, uniqueId: 'a-normal' },
          { subTypeName: 'Rainbow Foil', cardPrice: 250, uniqueId: 'a-rf' },
        ],
      },
      {
        name: 'Card B',
        editions: [{ subTypeName: 'Normal', cardPrice: 50, uniqueId: 'b-normal' }],
      },
    ];
    rerender({ groups: updatedGroups });

    expect(result.current.haveList[0].price).toBe(99);
    expect(result.current.wantList[0].price).toBe(50);
  });

  test('keeps a card unchanged when its group disappears from the new data', () => {
    const { result, rerender } = renderWithGroups(cardGroups);
    act(() => result.current.addHaveCard('Card A'));

    // New data no longer contains 'Card A' — the card should be retained as-is.
    rerender({ groups: [cardGroups[1]] });

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].price).toBe(10);
  });

  test('no-ops when cardGroups becomes empty', () => {
    const { result, rerender } = renderWithGroups(cardGroups);
    act(() => result.current.addHaveCard('Card A'));

    rerender({ groups: [] });

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].price).toBe(10);
  });
});

describe('useTradeState — loading a trade from the URL', () => {
  test('reconstructs have/want lists from a ?trade= param', () => {
    const payload = {
      v: 1,
      t: Math.floor(Date.now() / 60000),
      h: [['Card A', 10, 2]],
      w: [['Card B', 5, 1]],
    };
    window.history.replaceState({}, '', `/?trade=${makeTradeParam(payload)}`);

    const { result } = setup();

    expect(result.current.hasLoadedFromURL).toBe(true);
    expect(result.current.urlTradeData).not.toBeNull();
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({ name: 'Card A', quantity: 2 });
    expect(result.current.wantList[0]).toMatchObject({ name: 'Card B', quantity: 1 });
  });

  test('loads trade data even when the shared prices are stale (>7 days old)', () => {
    const tenDaysAgoMinutes = Math.floor((Date.now() - 10 * 86400000) / 60000);
    const payload = { v: 1, t: tenDaysAgoMinutes, h: [['Card A', 10, 1]], w: [] };
    window.history.replaceState({}, '', `/?trade=${makeTradeParam(payload)}`);

    const { result } = setup();

    expect(result.current.hasLoadedFromURL).toBe(true);
    expect(result.current.urlTradeData.ageInDays).toBeGreaterThan(7);
    expect(result.current.haveList).toHaveLength(1);
  });

  test('clearURLTradeData resets the loaded-from-URL state and strips the param', () => {
    const payload = { v: 1, t: Math.floor(Date.now() / 60000), h: [['Card A', 10, 1]], w: [] };
    window.history.replaceState({}, '', `/?trade=${makeTradeParam(payload)}`);

    const { result } = setup();
    expect(result.current.hasLoadedFromURL).toBe(true);

    act(() => result.current.clearURLTradeData());

    expect(result.current.urlTradeData).toBeNull();
    expect(result.current.hasLoadedFromURL).toBe(false);
    expect(window.location.search).not.toContain('trade=');
  });
});

describe('useTradeState — loading a trade from history', () => {
  test('ignores a null trade', () => {
    const { result } = setup();
    act(() => result.current.loadTradeFromHistory(null));
    expect(result.current.haveList).toHaveLength(0);
    expect(result.current.wantList).toHaveLength(0);
  });

  test('reconstructs cards, matching edition by subTypeName and uniqueId', () => {
    const { result } = setup();
    const trade = {
      name: 'My Trade',
      have_list: [
        { name: 'Card A', subTypeName: 'Rainbow Foil', quantity: 2 },
        { name: 'Card A', uniqueId: 'a-normal', quantity: 1 },
      ],
      want_list: [{ name: 'Card B', quantity: 4 }],
    };

    act(() => result.current.loadTradeFromHistory(trade));

    expect(result.current.haveList).toHaveLength(2);
    // matched by subTypeName -> Rainbow Foil edition (price 25)
    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Rainbow Foil',
      price: 25,
      quantity: 2,
    });
    // matched by uniqueId -> Normal edition (price 10)
    expect(result.current.haveList[1]).toMatchObject({
      uniqueId: 'a-normal',
      price: 10,
    });
    expect(result.current.wantList[0]).toMatchObject({ name: 'Card B', quantity: 4 });
  });

  test('drops saved cards that no longer exist and non-array lists', () => {
    const { result } = setup();
    const trade = {
      name: 'Partial Trade',
      have_list: [
        { name: 'Card A', quantity: 1 },
        { name: 'Deleted Card', quantity: 1 },
      ],
      want_list: null,
    };

    act(() => result.current.loadTradeFromHistory(trade));

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].name).toBe('Card A');
    expect(result.current.wantList).toHaveLength(0);
  });

  test('loading from history clears any URL trade state', () => {
    const payload = { v: 1, t: Math.floor(Date.now() / 60000), h: [['Card A', 10, 1]], w: [] };
    window.history.replaceState({}, '', `/?trade=${makeTradeParam(payload)}`);

    const { result } = setup();
    expect(result.current.hasLoadedFromURL).toBe(true);

    act(() =>
      result.current.loadTradeFromHistory({
        name: 'History Trade',
        have_list: [{ name: 'Card B', quantity: 1 }],
        want_list: [],
      })
    );

    expect(result.current.hasLoadedFromURL).toBe(false);
    expect(result.current.urlTradeData).toBeNull();
    expect(result.current.haveList[0].name).toBe('Card B');
  });
});

describe('useTradeState — totals & diff', () => {
  test('computes have/want totals and the difference', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A')); // 10
    act(() => result.current.updateHaveCardQuantity(0, 2)); // 20
    act(() => result.current.addWantCard('Card B')); // 5

    expect(result.current.haveTotal).toBe(20);
    expect(result.current.wantTotal).toBe(5);
    expect(result.current.diff).toBe(15);
  });

  test('totals are zero with no cards', () => {
    const { result } = setup();
    expect(result.current.haveTotal).toBe(0);
    expect(result.current.wantTotal).toBe(0);
    expect(result.current.diff).toBe(0);
  });
});

