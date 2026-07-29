import { renderHook, act, waitFor } from '@testing-library/react';
import { useTradeState } from '../../src/hooks/useTradeState.js';
import { encodeTradeToURL } from '../../src/utils/urlEncoding.js';

const cardGroups = [
  {
    name: 'Card A',
    editions: [
      { subTypeName: 'Normal', cardPrice: 10, lowPrice: 8, uniqueId: 'a-normal' },
      { subTypeName: 'Rainbow Foil', cardPrice: 25, lowPrice: 20, uniqueId: 'a-rf' },
    ],
  },
  {
    name: 'Card B',
    editions: [{ subTypeName: 'Normal', cardPrice: 5, lowPrice: 4, uniqueId: 'b-normal' }],
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

  test('bumps the quantity when the same printing is added again by uniqueId', () => {
    const { result } = setup();
    const option = {
      label: 'Card A',
      card: { _uniqueId: 'a-rf', subTypeName: 'Rainbow Foil' },
    };
    act(() => result.current.addHaveCard(option));
    act(() => result.current.addHaveCard(option));

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].quantity).toBe(2);
  });

  test('caps the bumped quantity at 6', () => {
    const { result } = setup();
    for (let i = 0; i < 8; i += 1) {
      act(() => result.current.addHaveCard('Card A'));
    }
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].quantity).toBe(6);
  });

  test('ignores non-string, non-object input', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard(42));
    expect(result.current.haveList).toHaveLength(0);
  });

  test('falls back to the first edition when no specific card is selected', () => {
    const { result } = setup();
    act(() => result.current.addHaveCard('Card A'));
    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Normal',
      price: 10,
      uniqueId: 'a-normal',
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

  test('removes and re-quantifies cards on the want list independently', () => {
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

describe('useTradeState — price refresh when the catalog changes', () => {
  test('re-prices existing cards from the updated card groups', () => {
    const { result, rerender } = renderHook(
      ({ groups }) => useTradeState(groups, {}),
      { initialProps: { groups: cardGroups } }
    );

    act(() => result.current.addHaveCard('Card A'));
    expect(result.current.haveList[0].price).toBe(10);

    const updatedGroups = [
      {
        name: 'Card A',
        editions: [
          { subTypeName: 'Normal', cardPrice: 99, lowPrice: 88, uniqueId: 'a-normal' },
        ],
      },
    ];
    act(() => rerender({ groups: updatedGroups }));

    expect(result.current.haveList[0].price).toBe(99);
    expect(result.current.haveList[0].lowPrice).toBe(88);
  });

  test('falls back to the first edition when the stored subtype is gone', () => {
    const { result, rerender } = renderHook(
      ({ groups }) => useTradeState(groups, {}),
      { initialProps: { groups: cardGroups } }
    );

    act(() =>
      result.current.addHaveCard({
        label: 'Card A',
        card: { _uniqueId: 'a-rf', subTypeName: 'Rainbow Foil' },
      })
    );
    expect(result.current.haveList[0].subTypeName).toBe('Rainbow Foil');

    const updatedGroups = [
      {
        name: 'Card A',
        editions: [
          { subTypeName: 'Normal', cardPrice: 12, lowPrice: 11, uniqueId: 'a-normal' },
        ],
      },
    ];
    act(() => rerender({ groups: updatedGroups }));

    expect(result.current.haveList[0].price).toBe(12);
  });

  test('leaves a card untouched when its group is absent from the new catalog', () => {
    const { result, rerender } = renderHook(
      ({ groups }) => useTradeState(groups, {}),
      { initialProps: { groups: cardGroups } }
    );

    act(() => result.current.addHaveCard('Card B'));
    expect(result.current.haveList[0].price).toBe(5);

    act(() =>
      rerender({
        groups: [
          {
            name: 'Card A',
            editions: [
              { subTypeName: 'Normal', cardPrice: 10, lowPrice: 8, uniqueId: 'a-normal' },
            ],
          },
        ],
      })
    );

    expect(result.current.haveList[0].name).toBe('Card B');
    expect(result.current.haveList[0].price).toBe(5);
  });
});

describe('useTradeState — loading a shared trade from the URL', () => {
  test('reconstructs both sides and exposes the decoded metadata', async () => {
    const url = encodeTradeToURL(
      [{ name: 'Card A', price: 10, quantity: 2 }],
      [{ name: 'Card B', price: 5, quantity: 1 }]
    );
    const parsed = new URL(url);
    window.history.replaceState({}, '', parsed.pathname + parsed.search);

    const { result } = setup();

    await waitFor(() => expect(result.current.hasLoadedFromURL).toBe(true));
    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({ name: 'Card A', quantity: 2 });
    expect(result.current.wantList).toHaveLength(1);
    expect(result.current.urlTradeData).toMatchObject({ version: 1 });
  });

  test('clearURLTradeData resets the URL-loaded state', async () => {
    const url = encodeTradeToURL(
      [{ name: 'Card A', price: 10, quantity: 1 }],
      []
    );
    const parsed = new URL(url);
    window.history.replaceState({}, '', parsed.pathname + parsed.search);

    const { result } = setup();
    await waitFor(() => expect(result.current.hasLoadedFromURL).toBe(true));

    act(() => result.current.clearURLTradeData());

    expect(result.current.urlTradeData).toBeNull();
    expect(result.current.hasLoadedFromURL).toBe(false);
    expect(window.location.search).not.toContain('trade=');
  });
});

describe('useTradeState — loading a saved trade from history', () => {
  test('ignores a null trade', () => {
    const { result } = setup();
    act(() => result.current.loadTradeFromHistory(null));
    expect(result.current.haveList).toHaveLength(0);
  });

  test('reconstructs web-shape lines, matching by subtype and uniqueId', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [
          {
            name: 'Card A',
            quantity: 2,
            price: 25,
            subTypeName: 'Rainbow Foil',
            uniqueId: 'a-rf',
          },
        ],
        want_list: [],
      })
    );

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0]).toMatchObject({
      name: 'Card A',
      subTypeName: 'Rainbow Foil',
      uniqueId: 'a-rf',
      price: 25,
      quantity: 2,
    });
  });

  test('reconstructs mobile-shape lines with a nested card object', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [],
        want_list: [
          {
            quantity: 3,
            price_each: 5,
            card: {
              name: 'Card B',
              sub_type_name: 'Normal',
              id: 'b-normal',
              tcg_low: 4,
              image_url: 'https://img/b.png',
            },
          },
        ],
      })
    );

    expect(result.current.wantList).toHaveLength(1);
    expect(result.current.wantList[0]).toMatchObject({
      name: 'Card B',
      quantity: 3,
      uniqueId: 'b-normal',
      imageUrl: 'https://img/b.png',
    });
  });

  test('skips lines whose card is no longer in the catalog', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = setup();

    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [
          { name: 'Card A', quantity: 1 },
          { name: 'Ghost Card', quantity: 1 },
        ],
        want_list: [],
      })
    );

    expect(result.current.haveList).toHaveLength(1);
    expect(result.current.haveList[0].name).toBe('Card A');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('defaults to the first edition when subtype and uniqueId do not match', () => {
    const { result } = setup();
    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [
          { name: 'Card A', subTypeName: 'Cold Foil', uniqueId: 'does-not-exist' },
        ],
        want_list: [],
      })
    );

    expect(result.current.haveList[0]).toMatchObject({
      subTypeName: 'Normal',
      uniqueId: 'a-normal',
      quantity: 1,
    });
  });

  test('clears any URL-loaded trade when loading from history', async () => {
    const url = encodeTradeToURL(
      [{ name: 'Card A', price: 10, quantity: 1 }],
      []
    );
    const parsed = new URL(url);
    window.history.replaceState({}, '', parsed.pathname + parsed.search);

    const { result } = setup();
    await waitFor(() => expect(result.current.hasLoadedFromURL).toBe(true));

    act(() =>
      result.current.loadTradeFromHistory({
        have_list: [{ name: 'Card B', quantity: 1 }],
        want_list: [],
      })
    );

    expect(result.current.urlTradeData).toBeNull();
    expect(result.current.hasLoadedFromURL).toBe(false);
    expect(result.current.haveList[0].name).toBe('Card B');
  });
});

