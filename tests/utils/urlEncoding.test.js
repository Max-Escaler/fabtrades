import {
  decodeTradeFromURL,
  reconstructCardsFromURLData,
  hasTradeDataInURL,
  clearTradeFromURL,
} from '../../src/utils/urlEncoding.js';

const resetURL = () => window.history.replaceState({}, '', '/');

// Build a `trade` query param the same way a shared link would carry it:
// base64 of the minimal JSON payload, then URL-encoded. Single-token card
// names avoid the decompressor's lossy name substitutions.
const makeTradeParam = (payload) =>
  encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));

describe('decodeTradeFromURL', () => {
  beforeEach(resetURL);
  afterEach(resetURL);

  test('returns null when there is no trade parameter', () => {
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('returns null for a malformed trade parameter', () => {
    window.history.replaceState({}, '', '/?trade=%%%not-valid%%%');
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('decodes a valid trade payload from the URL', () => {
    const param = makeTradeParam({
      v: 1,
      t: Math.floor(Date.now() / 60000),
      h: [['ZetaNode', 10], ['GammaCoil', 4.5, 3]],
      w: [['DeltaVane', 20]],
    });
    window.history.replaceState({}, '', `/?trade=${param}`);

    const decoded = decodeTradeFromURL();
    expect(decoded).not.toBeNull();
    expect(decoded.version).toBe(1);
    expect(decoded.have).toHaveLength(2);
    expect(decoded.want).toHaveLength(1);
    expect(decoded.have[0][0]).toBe('ZetaNode');
    expect(decoded.have[1][2]).toBe(3);
    expect(decoded.want[0][0]).toBe('DeltaVane');
  });

  test('rejects an unsupported (future) version', () => {
    const param = makeTradeParam({ v: 2, h: [['ZetaNode', 10]], w: [] });
    window.history.replaceState({}, '', `/?trade=${param}`);
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('rejects a payload missing a version', () => {
    const param = makeTradeParam({ h: [['ZetaNode', 10]], w: [] });
    window.history.replaceState({}, '', `/?trade=${param}`);
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('defaults have/want to empty arrays and timestamp to null when absent', () => {
    const param = makeTradeParam({ v: 1 });
    window.history.replaceState({}, '', `/?trade=${param}`);

    const decoded = decodeTradeFromURL();
    expect(decoded).not.toBeNull();
    expect(decoded.have).toEqual([]);
    expect(decoded.want).toEqual([]);
    expect(decoded.timestamp).toBeNull();
    expect(decoded.ageInDays).toBeNull();
  });

  test('converts the minute-based timestamp back to milliseconds', () => {
    const minutes = Math.floor(Date.now() / 60000);
    const param = makeTradeParam({ v: 1, t: minutes, h: [], w: [] });
    window.history.replaceState({}, '', `/?trade=${param}`);

    const decoded = decodeTradeFromURL();
    expect(decoded.timestamp).toBe(minutes * 60000);
    expect(decoded.ageInDays).toBeGreaterThanOrEqual(0);
  });
});

describe('hasTradeDataInURL / clearTradeFromURL', () => {
  beforeEach(resetURL);
  afterEach(resetURL);

  test('detects the presence of trade data', () => {
    expect(hasTradeDataInURL()).toBe(false);
    window.history.replaceState({}, '', '/?trade=abc');
    expect(hasTradeDataInURL()).toBe(true);
  });

  test('removes trade data from the URL', () => {
    window.history.replaceState({}, '', '/?trade=abc&foo=bar');
    clearTradeFromURL();
    expect(hasTradeDataInURL()).toBe(false);
    expect(window.location.search).toContain('foo=bar');
  });
});

describe('reconstructCardsFromURLData', () => {
  const cardGroups = [
    {
      name: 'Zeta Node',
      editions: [
        { subTypeName: 'Normal', cardPrice: 10, uniqueId: 'z-normal' },
        { subTypeName: 'Rainbow Foil', cardPrice: 50, uniqueId: 'z-rf' },
      ],
    },
    {
      name: 'Gamma Coil',
      editions: [{ subTypeName: 'Normal', cardPrice: 4.5, uniqueId: 'g-normal' }],
    },
  ];

  test('returns an empty array for invalid input', () => {
    expect(reconstructCardsFromURLData(null, cardGroups)).toEqual([]);
    expect(reconstructCardsFromURLData('nope', cardGroups)).toEqual([]);
  });

  test('reconstructs cards from the array (name-based) format', () => {
    const result = reconstructCardsFromURLData(
      [
        ['Zeta Node', 10, 2],
        ['Gamma Coil', 4.5],
      ],
      cardGroups
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: 'Zeta Node', price: 10, quantity: 2 });
    expect(result[1]).toMatchObject({ name: 'Gamma Coil', quantity: 1 });
  });

  test('selects the edition whose price matches the encoded price', () => {
    const [card] = reconstructCardsFromURLData([['Zeta Node', 50, 1]], cardGroups);
    expect(card.subTypeName).toBe('Rainbow Foil');
    expect(card.uniqueId).toBe('z-rf');
  });

  test('resolves cards via the unique-id lookup when available', () => {
    const lookup = { UID1: { displayName: 'Zeta Node' } };
    const [card] = reconstructCardsFromURLData([['UID1', 10, 1]], cardGroups, lookup);
    expect(card.name).toBe('Zeta Node');
  });

  test('skips cards that cannot be matched to any group', () => {
    const result = reconstructCardsFromURLData([['Totally Unknown Card', 1, 1]], cardGroups);
    expect(result).toEqual([]);
  });

  test('supports the legacy {n,p,q} object format', () => {
    const [card] = reconstructCardsFromURLData(
      [{ n: 'Gamma Coil', p: 4.5, q: 4 }],
      cardGroups
    );
    expect(card).toMatchObject({ name: 'Gamma Coil', quantity: 4 });
  });

  test('clamps invalid quantities up to at least 1', () => {
    const [zero] = reconstructCardsFromURLData([['Zeta Node', 10, 0]], cardGroups);
    expect(zero.quantity).toBe(1);
    const [negative] = reconstructCardsFromURLData([['Zeta Node', 10, -5]], cardGroups);
    expect(negative.quantity).toBe(1);
  });

  test('skips a matched group that has no editions', () => {
    const groups = [{ name: 'Empty Group', editions: [] }];
    const result = reconstructCardsFromURLData([['Empty Group', 10, 1]], groups);
    expect(result).toEqual([]);
  });

  test('falls back to the first edition when no price matches', () => {
    const [card] = reconstructCardsFromURLData([['Zeta Node', 999, 1]], cardGroups);
    expect(card.uniqueId).toBe('z-normal');
    expect(card.price).toBe(999);
  });
});
