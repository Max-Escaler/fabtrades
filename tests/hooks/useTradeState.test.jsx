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

  test('re-adding a card bumps its quantity, capped at 6', () => {
    const { result } = setup();
    for (let i = 0; i < 8; i += 1) {
      act(() => result.current.addHaveCard('Card A'));
    }
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].quantity).toBe(6);
  });

  test('bumps quantity when the same printing is re-added via an option object', () => {
    const { result } = setup();
    const option = {
      label: 'Card A',
      card: { _uniqueId: 'a-rf', subTypeName: 'Rainbow Foil' },
    };
    act(() => result.current.addHaveCard(option));
    act(() => result.current.addHaveCard(option));

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Rainbow Foil',
      quantity: 2,
    });
  });

  test('ignores non-string, non-object input', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard(123));
    expect(result.current.haveList).toHaveLength(0);
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

  test('removes and updates cards on the want side independently', () => {
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

describe('useTradeState — price refresh on catalog change', () => {
  test('re-prices existing cards when cardGroups reload with new prices', () => {
    const initialGroups = [
      { name: 'Card A', editions: [{ subTypeName: 'Normal', cardPrice: 10, lowPrice: 8, uniqueId: 'a-normal' }] },
    ];
    const { result, rerender } = renderHook(
      ({ groups }) => useTradeState(groups, {}),
      { initialProps: { groups: initialGroups } }
    );

    act(() => result.current.addHaveCard('Card A'));
    expect(result.current.haveList[0].price).toBe(10);

    const updatedGroups = [
      { name: 'Card A', editions: [{ subTypeName: 'Normal', cardPrice: 15, lowPrice: 12, uniqueId: 'a-normal' }] },
    ];
    act(() => rerender({ groups: updatedGroups }));

    expect(result.current.haveList[0].price).toBe(15);
    expect(result.current.haveList[0].lowPrice).toBe(12);
    expect(result.current.haveTotal).toBe(15);
  });
});

describe('useTradeState — loadTradeFromHistory', () => {
  test('does nothing when given a falsy trade', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A'));
    act(() => result.current.loadTradeFromHistory(null));
    expect(result.current.haveList).toHaveLength(1);
  });

  test('reconstructs cards, matching editions by subTypeName and uniqueId', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card A', subTypeName: 'Rainbow Foil', quantity: 2 }],
        want_list: [{ name: 'Card A', uniqueId: 'a-rf' }],
      })
    );

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({
      name: 'Card A',
      subTypeName: 'Rainbow Foil',
      price: 25,
      quantity: 2,
    });
    // Matched by uniqueId, quantity defaults to 1.
    expect(result.current.wantList[0]).toMatchObject({
      subTypeName: 'Rainbow Foil',
      price: 25,
      quantity: 1,
    });
  });

  test('falls back to the first edition when no subTypeName/uniqueId is given', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({ have_list: [{ name: 'Card A' }], want_list: [] })
    );
    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Normal',
      price: 10,
      quantity: 1,
    });
  });

  test('drops saved cards that are no longer in the catalog', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card A' }, { name: 'Deleted Card' }],
        want_list: [],
      })
    );
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].name).toBe('Card A');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('treats a non-array saved list as empty', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({ have_list: 'not-an-array', want_list: [{ name: 'Card B' }] })
    );
    expect(result.current.haveList).toHaveLength(0);
    expect(result.current.wantList).toHaveLength(1);
  });
});

describe('useTradeState — loading a trade from the URL', () => {
  const buildTradeParam = (payload) => encodeURIComponent(btoa(JSON.stringify(payload)));

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  test('reconstructs the trade encoded in the ?trade= param on mount', () => {
    const param = buildTradeParam({
      v: 1,
      h: [['Card A', 25, 2]],
      w: [['Card B', 5, 1]],
    });
    window.history.replaceState({}, '', `/?trade=${param}`);

    const { result } = setup();

    expect(result.current.hasLoadedFromURL).toBe(true);
    expect(result.current.urlTradeData).not.toBeNull();
    expect(result.current.haveList[0]).toMatchObject({ name: 'Card A', price: 25, quantity: 2 });
    expect(result.current.wantList[0]).toMatchObject({ name: 'Card B', price: 5 });
  });

  test('clearURLTradeData resets loaded state and strips the param', () => {
    const param = buildTradeParam({ v: 1, h: [['Card A', 10, 1]], w: [] });
    window.history.replaceState({}, '', `/?trade=${param}`);

    const { result } = setup();
    expect(result.current.hasLoadedFromURL).toBe(true);

    act(() => result.current.clearURLTradeData());

    expect(result.current.urlTradeData).toBeNull();
    expect(result.current.hasLoadedFromURL).toBe(false);
    expect(window.location.search).not.toContain('trade=');
  });
});

