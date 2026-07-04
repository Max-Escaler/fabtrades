import {
  filterCardOptions,
  highlightMatch,
  getCardGradient,
  formatPrice,
  getShortFoilLabel,
  formatCardType,
  debounce,
} from '../../src/utils/searchUtils.js';

const opt = (label) => ({ label, card: { name: label } });

describe('filterCardOptions', () => {
  const options = [
    opt('Lightning Press'),
    opt('Lightning Strike'),
    opt('Snapdragon Scalers'),
    opt('Command and Conquer'),
  ];

  test('returns a capped slice when the search term is empty', () => {
    expect(filterCardOptions(options, '')).toHaveLength(options.length);
    expect(filterCardOptions(options, '   ')).toHaveLength(options.length);
  });

  test('returns only options matching the search term', () => {
    const result = filterCardOptions(options, 'lightning');
    const labels = result.map((o) => o.label);
    expect(labels).toContain('Lightning Press');
    expect(labels).toContain('Lightning Strike');
    expect(labels).not.toContain('Snapdragon Scalers');
  });

  test('ranks shorter / more specific labels first', () => {
    const result = filterCardOptions(options, 'lightning');
    expect(result[0].label).toBe('Lightning Press');
  });

  test('requires every word to match for multi-word searches', () => {
    const result = filterCardOptions(options, 'command conquer');
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Command and Conquer');
  });

  test('respects the result limit', () => {
    const many = Array.from({ length: 50 }, (_, i) => opt(`Card Number ${i}`));
    expect(filterCardOptions(many, 'card', 5)).toHaveLength(5);
  });
});

describe('highlightMatch', () => {
  test('returns a single non-highlighted segment when nothing matches', () => {
    expect(highlightMatch('Lightning Press', 'zzz')).toEqual([
      { text: 'Lightning Press', highlight: false },
    ]);
  });

  test('returns the whole string unhighlighted when there is no search term', () => {
    expect(highlightMatch('Lightning Press', '')).toEqual([
      { text: 'Lightning Press', highlight: false },
    ]);
  });

  test('splits out the matched portion (preserving original case)', () => {
    const segments = highlightMatch('Lightning Press', 'press');
    const highlighted = segments.filter((s) => s.highlight);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].text).toBe('Press');
    expect(segments.map((s) => s.text).join('')).toBe('Lightning Press');
  });

  test('merges overlapping matches from multiple words', () => {
    const segments = highlightMatch('aaa', 'aa a');
    // The whole string ends up highlighted after merging overlaps.
    expect(segments.map((s) => s.text).join('')).toBe('aaa');
    expect(segments.some((s) => s.highlight)).toBe(true);
  });
});

describe('getCardGradient', () => {
  test('returns rainbow foil gradients', () => {
    const { background, backgroundHover } = getCardGradient('Rainbow Foil');
    expect(background).toContain('linear-gradient');
    expect(backgroundHover).toContain('linear-gradient');
  });

  test('returns cold foil gradients', () => {
    expect(getCardGradient('Cold Foil').background).toContain('linear-gradient');
  });

  test('returns a distinct style for dark mode normal cards', () => {
    const light = getCardGradient('Normal', '', false);
    const dark = getCardGradient('Normal', '', true);
    expect(light.background).not.toBe(dark.background);
  });

  test('handles missing subtype without throwing', () => {
    expect(() => getCardGradient()).not.toThrow();
  });
});

describe('formatPrice', () => {
  test('returns an em dash for empty/zero prices', () => {
    expect(formatPrice(0)).toBe('—');
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
  });

  test('formats a numeric price with two decimals', () => {
    expect(formatPrice(12.5)).toBe('$12.50');
    expect(formatPrice(3)).toBe('$3.00');
  });
});

describe('getShortFoilLabel', () => {
  test('maps known foil types', () => {
    expect(getShortFoilLabel('Rainbow Foil')).toBe('RF');
    expect(getShortFoilLabel('Cold Foil')).toBe('CF');
  });

  test('returns null for normal / empty cards', () => {
    expect(getShortFoilLabel('Normal')).toBeNull();
    expect(getShortFoilLabel('')).toBeNull();
    expect(getShortFoilLabel()).toBeNull();
  });

  test('uses the first two letters (uppercased) for other types', () => {
    expect(getShortFoilLabel('Promo')).toBe('PR');
  });
});

describe('formatCardType', () => {
  test('normalizes known foil types', () => {
    expect(formatCardType('Rainbow Foil')).toBe('Rainbow Foil');
    expect(formatCardType('cold foil')).toBe('Cold Foil');
    expect(formatCardType('some foil variant')).toBe('Foil');
    expect(formatCardType('Promo Card')).toBe('Promo');
  });

  test('returns null for normal or missing types', () => {
    expect(formatCardType('Normal')).toBeNull();
    expect(formatCardType(null)).toBeNull();
  });

  test('passes through unrecognized types unchanged', () => {
    expect(formatCardType('Alpha')).toBe('Alpha');
  });
});

describe('debounce', () => {
  // Real timers are used here: the test environment's setup stubs
  // `window.performance`, which breaks Jest's modern fake timers.
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  test('invokes the function only once after the wait window', async () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 20);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    await wait(60);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('passes the latest arguments through', async () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 20);
    debounced('a');
    debounced('b');
    await wait(60);
    expect(fn).toHaveBeenCalledWith('b');
  });
});
