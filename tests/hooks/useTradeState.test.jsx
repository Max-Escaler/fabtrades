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

describe('useTradeState — loadTradeFromHistory', () => {
  test('is a no-op when given a falsy trade', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A'));
    act(() => result.current.loadTradeFromHistory(null));
    // Existing lists are left untouched.
    expect(result.current.haveList).toHaveLength(1);
  });

  test('reconstructs have/want lists from saved history data', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        name: 'Saved',
        have_list: [{ name: 'Card A', subTypeName: 'Normal', quantity: 3 }],
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
    // Missing quantity defaults to 1.
    expect(result.current.wantList[0]).toMatchObject({ name: 'Card B', quantity: 1 });
  });

  test('selects the saved edition by subTypeName (latest price)', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card A', subTypeName: 'Rainbow Foil' }],
        want_list: [],
      })
    );
    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Rainbow Foil',
      price: 25,
      uniqueId: 'a-rf',
    });
  });

  test('selects the saved edition by uniqueId when present', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card A', uniqueId: 'a-rf' }],
        want_list: [],
      })
    );
    expect(result.current.haveList[0]).toMatchObject({ uniqueId: 'a-rf', price: 25 });
  });

  test('drops saved cards that no longer exist in current data', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Vanished Card' }, { name: 'Card B' }],
        want_list: [],
      })
    );
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].name).toBe('Card B');
  });

  test('handles missing have_list / want_list gracefully', () => {
    const { result } = setup();
    act(() => result.current.loadTradeFromHistory({ name: 'Empty' }));
    expect(result.current.haveList).toEqual([]);
    expect(result.current.wantList).toEqual([]);
  });
});

describe('useTradeState — price refresh on cardGroups change', () => {
  test('re-prices existing cards when cardGroups update', () => {
    const initialGroups = [
      { name: 'Card A', editions: [{ subTypeName: 'Normal', cardPrice: 10, uniqueId: 'a-normal' }] },
    ];
    const { result, rerender } = renderHook(
      ({ groups }) => useTradeState(groups, {}),
      { initialProps: { groups: initialGroups } }
    );

    act(() => result.current.addHaveCard('Card A'));
    expect(result.current.haveList[0].price).toBe(10);

    // Simulate a price-type switch that changes the underlying edition price.
    const updatedGroups = [
      { name: 'Card A', editions: [{ subTypeName: 'Normal', cardPrice: 42, uniqueId: 'a-normal' }] },
    ];
    rerender({ groups: updatedGroups });

    expect(result.current.haveList[0].price).toBe(42);
    expect(result.current.haveTotal).toBe(42);
  });
});

