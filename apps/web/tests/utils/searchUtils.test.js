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

  test('treats a term with no word characters like an empty search', () => {
    // "!!!" is not whitespace, so it passes the trim() guard, but it
    // normalizes to an empty string, leaving no search words to match.
    const result = filterCardOptions(options, '!!!');
    expect(result).toHaveLength(options.length);
  });

  test('excludes a candidate when a later word of a multi-word search is missing', () => {
    // First word ("lightning") matches, but "zzz" does not -> rejected.
    const result = filterCardOptions(options, 'lightning zzz');
    expect(result).toHaveLength(0);
  });

  test('ranks an exact full-name match at the top', () => {
    const result = filterCardOptions(options, 'Lightning Press');
    expect(result[0].label).toBe('Lightning Press');
  });

  test('still matches multi-word searches whose words appear out of order', () => {
    // All words present but reversed: no in-order bonus, yet still a match.
    const result = filterCardOptions(options, 'conquer command');
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Command and Conquer');
  });

  test('skips candidates far shorter than the term and tolerates a missing label', () => {
    const mixed = [
      { card: {} }, // no label at all -> treated as an empty string
      opt('Ex'), // far shorter than the search term -> length short-circuit
      opt('Lightning Strike'),
    ];
    const result = filterCardOptions(mixed, 'lightning strike');
    expect(result.map((o) => o.label)).toEqual(['Lightning Strike']);
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

  test('returns the whole string unhighlighted for a whitespace-only term', () => {
    // A whitespace term is truthy, but yields no words after splitting.
    expect(highlightMatch('Lightning Press', '   ')).toEqual([
      { text: 'Lightning Press', highlight: false },
    ]);
  });

  test('keeps two non-overlapping matches as separate highlighted segments', () => {
    const segments = highlightMatch('Lightning Press', 'lightning press');
    const highlighted = segments.filter((s) => s.highlight).map((s) => s.text);
    expect(highlighted).toEqual(['Lightning', 'Press']);
    expect(segments.map((s) => s.text).join('')).toBe('Lightning Press');
  });

  test('appends trailing text after the final match as an unhighlighted segment', () => {
    const segments = highlightMatch('Lightning Bolt', 'lightning');
    expect(segments).toEqual([
      { text: 'Lightning', highlight: true },
      { text: ' Bolt', highlight: false },
    ]);
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

  test('handles missing subtype without throwing', () => {
    expect(() => getCardGradient()).not.toThrow();
  });

  test('returns distinct dark-mode gradients for each foil family', () => {
    const rainbow = getCardGradient('Rainbow Foil', true);
    const cold = getCardGradient('Cold Foil', true);
    const generic = getCardGradient('Foil', true);
    const holo = getCardGradient('Holo Something', true);

    for (const style of [rainbow, cold, generic, holo]) {
      expect(style.background).toContain('linear-gradient');
      expect(style.backgroundHover).toContain('linear-gradient');
    }

    // Dark variants differ from their light counterparts.
    expect(cold.background).not.toBe(getCardGradient('Cold Foil', false).background);
    expect(generic.background).not.toBe(getCardGradient('Foil', false).background);

    // The three foil families produce different dark gradients.
    expect(new Set([rainbow.background, cold.background, generic.background]).size).toBe(3);

    // "holo" routes through the generic foil branch.
    expect(holo.background).toBe(generic.background);
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
