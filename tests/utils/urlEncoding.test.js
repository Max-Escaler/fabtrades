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

  test('converts the timestamp from minutes to milliseconds and derives age', () => {
    // 2 days ago, in whole minutes (the on-wire unit).
    const twoDaysAgoMs = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const tMinutes = Math.floor(twoDaysAgoMs / 60000);
    window.history.replaceState({}, '', `/?trade=${makeTradeParam({ v: 1, t: tMinutes, h: [], w: [] })}`);

    const decoded = decodeTradeFromURL();
    expect(decoded.timestamp).toBe(tMinutes * 60000);
    expect(decoded.ageInDays).toBeGreaterThan(1.9);
    expect(decoded.ageInDays).toBeLessThan(2.1);
  });

  test('leaves timestamp and age null when no timestamp is present', () => {
    window.history.replaceState({}, '', `/?trade=${makeTradeParam({ v: 1, h: [['A', 1]], w: [] })}`);

    const decoded = decodeTradeFromURL();
    expect(decoded).not.toBeNull();
    expect(decoded.timestamp).toBeNull();
    expect(decoded.ageInDays).toBeNull();
  });

  test('defaults have and want to empty arrays when omitted', () => {
    window.history.replaceState({}, '', `/?trade=${makeTradeParam({ v: 1 })}`);

    const decoded = decodeTradeFromURL();
    expect(decoded).not.toBeNull();
    expect(decoded.have).toEqual([]);
    expect(decoded.want).toEqual([]);
  });

  test('rejects payloads with a newer, unsupported version', () => {
    window.history.replaceState({}, '', `/?trade=${makeTradeParam({ v: 2, h: [['A', 1]], w: [] })}`);
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('rejects payloads with a missing or falsy version', () => {
    window.history.replaceState({}, '', `/?trade=${makeTradeParam({ h: [['A', 1]], w: [] })}`);
    expect(decodeTradeFromURL()).toBeNull();

    window.history.replaceState({}, '', `/?trade=${makeTradeParam({ v: 0, h: [], w: [] })}`);
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('returns null when the base64 decodes to something that is not JSON', () => {
    // Valid base64, but the decoded bytes are not JSON -> parse failure branch.
    const param = encodeURIComponent(btoa('this is definitely not json'));
    window.history.replaceState({}, '', `/?trade=${param}`);
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('round-trips card names verbatim, including letters the old lossy scheme corrupted', () => {
    // The removed decompressor substituted single letters (B->Blue, R->Red,
    // Y->Yellow) and digraphs (Lt->Lightning, Th->Thunder, St->Strike), which
    // corrupted ordinary names. The new decoder must preserve them exactly.
    const trickyNames = ['Blue Rider', 'Red Thunder Strike', 'Yellow Lightning', 'Café Ärẞt 龍'];
    const param = makeTradeParam({
      v: 1,
      t: Math.floor(Date.now() / 60000),
      h: trickyNames.map((name) => [name, 5]),
      w: [],
    });
    window.history.replaceState({}, '', `/?trade=${param}`);

    const decoded = decodeTradeFromURL();
    expect(decoded).not.toBeNull();
    expect(decoded.have.map((c) => c[0])).toEqual(trickyNames);
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
});
