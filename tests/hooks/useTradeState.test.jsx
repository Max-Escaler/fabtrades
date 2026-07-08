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

// Builds the same ?trade= param string the share-link feature produces:
// encodeURIComponent(btoa(utf8(JSON.stringify(payload)))). Card names must
// avoid the lossy single-letter/digraph substitutions decompress() performs
// (uppercase B/R/Y and digraphs like Lt/Th/St/At/Ac/Eq/Wp/Rb), so we use
// 'Card A' which round-trips cleanly.
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

  test('removes and updates quantity on the want list independently', () => {
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
  test('ignores non-string / non-object input (e.g. a number)', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard(5));
    expect(result.current.haveList).toHaveLength(0);
  });

  test('does not add a duplicate identified by uniqueId', () => {
    const { result } = setup();
    const option = {
      label: 'Card A',
      card: { _uniqueId: 'a-rf', subTypeName: 'Rainbow Foil' },
    };
    act(() => result.current.addHaveCard(option));
    act(() => result.current.addHaveCard(option));
    expect(result.current.haveList).toHaveLength(1);
  });

  test('does not add a card whose group has no editions', () => {
    const groups = [{ name: 'Empty Card', editions: [] }];
    const { result } = renderHook(() => useTradeState(groups, {}));
    act(() => result.current.addHaveCard('Empty Card'));
    expect(result.current.haveList).toHaveLength(0);
  });

  test('falls back to the first edition when the selected subType is unknown', () => {
    const { result } = setup();
    act(() =>
      result.current.addHaveCard({
        label: 'Card A',
        card: { _uniqueId: 'a-mystery', subTypeName: 'Cold Foil' },
      })
    );
    // No 'Cold Foil' edition exists, so pricing falls back to the first
    // edition (Normal, 10) while retaining the selected card's subType/id.
    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Cold Foil',
      price: 10,
      uniqueId: 'a-mystery',
    });
  });
});

describe('useTradeState — price refresh when cardGroups change', () => {
  test('re-prices existing cards when a new cardGroups snapshot arrives', () => {
    const initialGroups = [
      { name: 'Card A', editions: [{ subTypeName: 'Normal', cardPrice: 10, uniqueId: 'a-normal' }] },
    ];
    const { result, rerender } = renderHook(
      ({ groups }) => useTradeState(groups, {}),
      { initialProps: { groups: initialGroups } }
    );

    act(() => result.current.addHaveCard('Card A'));
    expect(result.current.haveList[0].price).toBe(10);

    const updatedGroups = [
      { name: 'Card A', editions: [{ subTypeName: 'Normal', cardPrice: 42, uniqueId: 'a-normal' }] },
    ];
    act(() => rerender({ groups: updatedGroups }));

    expect(result.current.haveList[0].price).toBe(42);
    expect(result.current.haveTotal).toBe(42);
  });

  test('keeps cards untouched when they are no longer present in cardGroups', () => {
    const initialGroups = [
      { name: 'Card A', editions: [{ subTypeName: 'Normal', cardPrice: 10, uniqueId: 'a-normal' }] },
    ];
    const { result, rerender } = renderHook(
      ({ groups }) => useTradeState(groups, {}),
      { initialProps: { groups: initialGroups } }
    );

    act(() => result.current.addHaveCard('Card A'));

    // A different, non-empty snapshot that no longer contains 'Card A'.
    const otherGroups = [
      { name: 'Card Z', editions: [{ subTypeName: 'Normal', cardPrice: 3, uniqueId: 'z-normal' }] },
    ];
    act(() => rerender({ groups: otherGroups }));

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].price).toBe(10);
  });
});

describe('useTradeState — loadTradeFromHistory', () => {
  const historyGroups = [
    {
      name: 'Card A',
      editions: [
        { subTypeName: 'Normal', cardPrice: 10, uniqueId: 'a-normal' },
        { subTypeName: 'Rainbow Foil', cardPrice: 25, uniqueId: 'a-rf' },
      ],
    },
    { name: 'Card B', editions: [{ subTypeName: 'Normal', cardPrice: 5, uniqueId: 'b-normal' }] },
    { name: 'Empty Card', editions: [] },
  ];
  const historySetup = () => renderHook(() => useTradeState(historyGroups, {}));

  test('reconstructs have/want lists with refreshed prices and quantities', () => {
    const { result } = historySetup();
    act(() =>
      result.current.loadTradeFromHistory({
        name: 'My Trade',
        have_list: [{ name: 'Card A', quantity: 3 }],
        want_list: [{ name: 'Card B' }],
      })
    );

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({
      name: 'Card A',
      price: 10,
      quantity: 3,
      subTypeName: 'Normal',
    });
    expect(result.current.wantList).toHaveLength(1);
    // Missing quantity defaults to 1.
    expect(result.current.wantList[0].quantity).toBe(1);
  });

  test('selects the edition matching the saved subTypeName', () => {
    const { result } = historySetup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card A', subTypeName: 'Rainbow Foil' }],
      })
    );
    expect(result.current.haveList[0]).toMatchObject({
      price: 25,
      subTypeName: 'Rainbow Foil',
      uniqueId: 'a-rf',
    });
  });

  test('prefers an exact uniqueId match over subTypeName', () => {
    const { result } = historySetup();
    act(() =>
      result.current.loadTradeFromHistory({
        // subTypeName says Normal, but the uniqueId points at the foil edition.
        have_list: [{ name: 'Card A', subTypeName: 'Normal', uniqueId: 'a-rf' }],
      })
    );
    expect(result.current.haveList[0]).toMatchObject({
      price: 25,
      uniqueId: 'a-rf',
    });
  });

  test('drops cards that are missing or have no editions', () => {
    const { result } = historySetup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [
          { name: 'Card A' },
          { name: 'Ghost Card' }, // not in groups
          { name: 'Empty Card' }, // group exists but no editions
        ],
      })
    );
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].name).toBe('Card A');
  });

  test('treats null / missing card lists as empty', () => {
    const { result } = historySetup();
    act(() => result.current.addHaveCard('Card A'));
    act(() =>
      result.current.loadTradeFromHistory({ have_list: null })
    );
    expect(result.current.haveList).toHaveLength(0);
    expect(result.current.wantList).toHaveLength(0);
  });

  test('does nothing when given a falsy trade', () => {
    const { result } = historySetup();
    act(() => result.current.addHaveCard('Card A'));
    act(() => result.current.loadTradeFromHistory(null));
    expect(result.current.haveList).toHaveLength(1);
  });

  test('clears URL trade state after loading from history', () => {
    const { result } = historySetup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card A' }],
      })
    );
    expect(result.current.urlTradeData).toBeNull();
    expect(result.current.hasLoadedFromURL).toBe(false);
  });
});

describe('useTradeState — loading a trade from the URL', () => {
  test('reconstructs cards from a ?trade= share link on mount', () => {
    const payload = {
      v: 1,
      t: Math.floor(Date.now() / 60000),
      h: [['Card A', 10, 2]],
      w: [],
    };
    window.history.replaceState({}, '', `/?trade=${makeTradeParam(payload)}`);

    const { result } = setup();

    expect(result.current.hasLoadedFromURL).toBe(true);
    expect(result.current.urlTradeData).not.toBeNull();
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({
      name: 'Card A',
      quantity: 2,
    });
  });

  test('still loads a trade whose data is older than 7 days', () => {
    const eightDaysAgoMinutes = Math.floor((Date.now() - 8 * 86400000) / 60000);
    const payload = {
      v: 1,
      t: eightDaysAgoMinutes,
      h: [['Card A', 10, 1]],
      w: [],
    };
    window.history.replaceState({}, '', `/?trade=${makeTradeParam(payload)}`);

    const { result } = setup();

    expect(result.current.hasLoadedFromURL).toBe(true);
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.urlTradeData.ageInDays).toBeGreaterThan(7);
  });

  test('clearURLTradeData resets flags and strips the trade param', () => {
    const payload = {
      v: 1,
      t: Math.floor(Date.now() / 60000),
      h: [['Card A', 10, 1]],
      w: [],
    };
    window.history.replaceState({}, '', `/?trade=${makeTradeParam(payload)}`);

    const { result } = setup();
    expect(result.current.hasLoadedFromURL).toBe(true);

    act(() => result.current.clearURLTradeData());

    expect(result.current.hasLoadedFromURL).toBe(false);
    expect(result.current.urlTradeData).toBeNull();
    expect(window.location.search).not.toContain('trade=');
  });
});

