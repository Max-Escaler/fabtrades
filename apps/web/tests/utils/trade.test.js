import {
  calculateTotal,
  calculateLowTotal,
  calculateDiff,
} from '../../src/utils/trade.js';

describe('calculateTotal', () => {
  test('returns 0 for an empty list', () => {
    expect(calculateTotal([])).toBe(0);
  });

  test('multiplies price by quantity for a single item', () => {
    expect(calculateTotal([{ price: 10, quantity: 3 }])).toBe(30);
  });

  test('sums price * quantity across multiple items', () => {
    const list = [
      { price: 10, quantity: 2 }, // 20
      { price: 5.5, quantity: 4 }, // 22
      { price: 0.99, quantity: 1 }, // 0.99
    ];
    expect(calculateTotal(list)).toBeCloseTo(42.99, 2);
  });

  test('handles items with zero price or quantity', () => {
    const list = [
      { price: 0, quantity: 5 },
      { price: 12, quantity: 0 },
    ];
    expect(calculateTotal(list)).toBe(0);
  });
});

describe('calculateLowTotal', () => {
  test('returns 0 for an empty list', () => {
    expect(calculateLowTotal([])).toBe(0);
  });

  test('sums lowPrice * quantity and treats missing lows as 0', () => {
    const list = [
      { lowPrice: 2, quantity: 3 }, // 6
      { lowPrice: null, quantity: 2 }, // 0
      { price: 10, quantity: 1 }, // 0 (no lowPrice)
    ];
    expect(calculateLowTotal(list)).toBe(6);
  });
});

describe('calculateDiff', () => {
  test('returns the difference between have and want totals', () => {
    expect(calculateDiff(100, 60)).toBe(40);
  });

  test('returns a negative value when want exceeds have', () => {
    expect(calculateDiff(20, 50)).toBe(-30);
  });

  test('returns 0 when totals are equal', () => {
    expect(calculateDiff(75.25, 75.25)).toBe(0);
  });
});
