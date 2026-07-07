import {
  filterCardOptions,
  highlightMatch,
  getCardGradient,
  formatPrice,
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

  test('returns a capped slice when the term normalizes to nothing', () => {
    // "'''" is non-empty/non-whitespace but reduces to '' after normalization,
    // so there are no search words to match on.
    expect(filterCardOptions(options, "'''")).toHaveLength(options.length);
  });

  test('excludes labels missing one of several search words', () => {
    // "command" matches "Command and Conquer" but "zzz" matches nothing,
    // so the multi-word requirement rejects it.
    expect(filterCardOptions(options, 'command zzz')).toHaveLength(0);
  });

  test('scores an exact normalized match highest', () => {
    const withExact = [opt('Zephyr'), opt('Zephyr Blade'), opt('Zephyr Wing')];
    const result = filterCardOptions(withExact, 'zephyr');
    expect(result[0].label).toBe('Zephyr');
  });

  test('still matches when words appear out of order in the label', () => {
    const outOfOrder = [opt('Conquer and Command')];
    const result = filterCardOptions(outOfOrder, 'command conquer');
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Conquer and Command');
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

  test('returns a single segment when the term is only whitespace', () => {
    expect(highlightMatch('Lightning Press', '   ')).toEqual([
      { text: 'Lightning Press', highlight: false },
    ]);
  });

  test('keeps disjoint word matches as separate highlighted segments', () => {
    const segments = highlightMatch('Lightning Press', 'lightning press');
    const highlighted = segments.filter((s) => s.highlight).map((s) => s.text);
    expect(highlighted).toEqual(['Lightning', 'Press']);
    // The unmatched separator between the words is preserved verbatim.
    expect(segments.map((s) => s.text).join('')).toBe('Lightning Press');
  });

  test('preserves a trailing unmatched segment', () => {
    const segments = highlightMatch('Lightning Press', 'lightning');
    expect(segments[segments.length - 1]).toEqual({ text: ' Press', highlight: false });
    expect(segments[0]).toEqual({ text: 'Lightning', highlight: true });
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
    const light = getCardGradient('Normal', false);
    const dark = getCardGradient('Normal', true);
    expect(light.background).not.toBe(dark.background);
  });

  test('returns distinct dark-mode gradients for each foil family', () => {
    const rainbow = getCardGradient('Rainbow Foil', true);
    const cold = getCardGradient('Cold Foil', true);
    const generic = getCardGradient('Extended Art Foil', true);
    const holo = getCardGradient('Holo Card', true);

    for (const style of [rainbow, cold, generic, holo]) {
      expect(style.background).toContain('linear-gradient');
      expect(style.backgroundHover).toContain('linear-gradient');
    }
    // Dark variants must differ from their light counterparts.
    expect(rainbow.background).not.toBe(getCardGradient('Rainbow Foil', false).background);
    expect(cold.background).not.toBe(getCardGradient('Cold Foil', false).background);
    expect(generic.background).not.toBe(getCardGradient('Extended Art Foil', false).background);
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
