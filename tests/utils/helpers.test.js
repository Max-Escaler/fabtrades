import { formatCurrency, formatTimestamp } from '../../src/utils/helpers.js';

describe('formatCurrency', () => {
  test('formats a whole number with no trailing decimals', () => {
    expect(formatCurrency(10)).toBe('$10');
  });

  test('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  test('keeps up to two fraction digits', () => {
    expect(formatCurrency(12.34)).toBe('$12.34');
  });

  test('adds a thousands separator', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.5');
  });

  test('formats negative amounts', () => {
    expect(formatCurrency(-42)).toBe('-$42');
  });
});

describe('formatTimestamp', () => {
  test('returns "Unknown" for a falsy value', () => {
    expect(formatTimestamp(null)).toBe('Unknown');
    expect(formatTimestamp('')).toBe('Unknown');
    expect(formatTimestamp(undefined)).toBe('Unknown');
  });

  test('formats a valid ISO timestamp into a readable string containing the year', () => {
    const result = formatTimestamp('2025-09-02T20:10:03+0000');
    expect(typeof result).toBe('string');
    expect(result).toContain('2025');
  });

  test('returns a string (never throws) for an unparseable value', () => {
    const result = formatTimestamp('not-a-real-date');
    expect(typeof result).toBe('string');
  });
});
