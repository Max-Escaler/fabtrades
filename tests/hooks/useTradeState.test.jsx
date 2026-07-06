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

describe('useTradeState — addCard edge cases', () => {
  test('ignores non-string, non-object input', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard(123));
    expect(result.current.haveList).toHaveLength(0);
  });

  test('deduplicates by uniqueId when adding autocomplete objects', () => {
    const { result } = setup();
    const option = {
      label: 'Card A',
      card: { _uniqueId: 'a-rf', subTypeName: 'Rainbow Foil' },
    };
    act(() => result.current.addHaveCard(option));
    act(() => result.current.addHaveCard(option));
    expect(result.current.haveList).toHaveLength(1);
  });
});

describe('useTradeState — want-list mutators', () => {
  test('removes and updates cards in the want list', () => {
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

describe('useTradeState — price refresh when cardGroups change', () => {
  test('re-prices existing cards when a new cardGroups reference arrives', () => {
    const initialGroups = [
      {
        name: 'Card A',
        editions: [{ subTypeName: 'Normal', cardPrice: 10, uniqueId: 'a-normal' }],
      },
    ];
    const { result, rerender } = renderHook(
      ({ groups }) => useTradeState(groups, {}),
      { initialProps: { groups: initialGroups } }
    );

    act(() => result.current.addHaveCard('Card A'));
    expect(result.current.haveList[0].price).toBe(10);

    const updatedGroups = [
      {
        name: 'Card A',
        editions: [{ subTypeName: 'Normal', cardPrice: 42, uniqueId: 'a-normal' }],
      },
    ];
    act(() => rerender({ groups: updatedGroups }));

    expect(result.current.haveList[0].price).toBe(42);
  });

  test('leaves a card untouched when its group disappears from the data', () => {
    const initialGroups = [
      {
        name: 'Card A',
        editions: [{ subTypeName: 'Normal', cardPrice: 10, uniqueId: 'a-normal' }],
      },
      {
        name: 'Card B',
        editions: [{ subTypeName: 'Normal', cardPrice: 5, uniqueId: 'b-normal' }],
      },
    ];
    const { result, rerender } = renderHook(
      ({ groups }) => useTradeState(groups, {}),
      { initialProps: { groups: initialGroups } }
    );

    act(() => result.current.addHaveCard('Card B'));
    expect(result.current.haveList[0].price).toBe(5);

    // Card B is gone; its list entry should be preserved as-is.
    act(() => rerender({ groups: [initialGroups[0]] }));
    expect(result.current.haveList[0]).toMatchObject({ name: 'Card B', price: 5 });
  });
});

describe('useTradeState — loadTradeFromHistory', () => {
  let logSpy;
  let warnSpy;
  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('reconstructs have and want lists with current prices', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        name: 'Saved Trade',
        have_list: [{ name: 'Card A', subTypeName: 'Rainbow Foil', quantity: 2 }],
        want_list: [{ name: 'Card B', quantity: 3 }],
      })
    );

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({
      name: 'Card A',
      subTypeName: 'Rainbow Foil',
      price: 25,
      quantity: 2,
    });
    expect(result.current.wantList[0]).toMatchObject({
      name: 'Card B',
      quantity: 3,
    });
  });

  test('prefers an exact uniqueId match for the edition', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card A', uniqueId: 'a-rf' }],
      })
    );
    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Rainbow Foil',
      price: 25,
      quantity: 1,
    });
  });

  test('defaults quantity to 1 and uses the first edition when unspecified', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card A' }],
      })
    );
    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Normal',
      price: 10,
      quantity: 1,
    });
  });

  test('skips saved cards that no longer exist in the data', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card A' }, { name: 'Deleted Card' }],
      })
    );
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].name).toBe('Card A');
  });

  test('treats missing/invalid card lists as empty', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A'));
    act(() => result.current.loadTradeFromHistory({ name: 'Empty' }));
    expect(result.current.haveList).toEqual([]);
    expect(result.current.wantList).toEqual([]);
  });

  test('is a no-op when given no trade', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A'));
    act(() => result.current.loadTradeFromHistory(null));
    expect(result.current.haveList).toHaveLength(1);
  });
});

describe('useTradeState — loading a trade from a shared URL', () => {
  let logSpy;
  let warnSpy;
  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    window.history.replaceState({}, '', '/');
  });

  // Mirror how a real shared link carries the payload: base64 of the JSON, then
  // URL-encoded. Single-token names avoid the decoder's lossy substitutions.
  const makeTradeParam = (payload) =>
    encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));

  const urlGroups = [
    {
      name: 'Zeta',
      editions: [{ subTypeName: 'Normal', cardPrice: 10, uniqueId: 'z-normal' }],
    },
    {
      name: 'Gamma',
      editions: [{ subTypeName: 'Normal', cardPrice: 5, uniqueId: 'g-normal' }],
    },
  ];

  test('hydrates lists from the trade param on mount and exposes it', () => {
    const param = makeTradeParam({
      v: 1,
      t: Math.floor(Date.now() / 60000),
      h: [['Zeta', 10, 2]],
      w: [['Gamma', 5]],
    });
    window.history.replaceState({}, '', `/?trade=${param}`);

    const { result } = renderHook(() => useTradeState(urlGroups, {}));

    expect(result.current.hasLoadedFromURL).toBe(true);
    expect(result.current.urlTradeData).not.toBeNull();
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({ name: 'Zeta', quantity: 2 });
    expect(result.current.wantList[0]).toMatchObject({ name: 'Gamma' });
  });

  test('clearURLTradeData resets the loaded state and strips the URL param', () => {
    const param = makeTradeParam({
      v: 1,
      t: Math.floor(Date.now() / 60000),
      h: [['Zeta', 10]],
      w: [],
    });
    window.history.replaceState({}, '', `/?trade=${param}`);

    const { result } = renderHook(() => useTradeState(urlGroups, {}));
    expect(result.current.hasLoadedFromURL).toBe(true);

    act(() => result.current.clearURLTradeData());

    expect(result.current.hasLoadedFromURL).toBe(false);
    expect(result.current.urlTradeData).toBeNull();
    expect(window.location.search).not.toContain('trade=');
  });
});

