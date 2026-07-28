import {
  encodeTradeToURL,
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

// Load the current URL's `trade` param into the jsdom location so that the
// decode helpers (which read `window.location`) see what the encoder produced.
const loadEncodedURL = (absoluteUrl) => {
  const parsed = new URL(absoluteUrl);
  window.history.replaceState({}, '', parsed.pathname + parsed.search);
};

describe('encodeTradeToURL', () => {
  beforeEach(resetURL);
  afterEach(resetURL);

  test('returns null when both sides are empty', () => {
    expect(encodeTradeToURL([], [])).toBeNull();
    expect(encodeTradeToURL()).toBeNull();
  });

  test('encodes a trade that round-trips through decodeTradeFromURL', () => {
    const url = encodeTradeToURL(
      [{ uniqueId: 'z-normal', price: 10, quantity: 2 }],
      [{ name: 'Delta Vane', price: 20 }]
    );
    expect(url).toContain('trade=');

    loadEncodedURL(url);
    const decoded = decodeTradeFromURL();
    expect(decoded.version).toBe(1);
    expect(decoded.have).toEqual([['z-normal', 10, 2]]);
    // quantity defaults to 1 when omitted on the source card.
    expect(decoded.want).toEqual([['Delta Vane', 20, 1]]);
    expect(decoded.timestamp).toBeGreaterThan(0);
  });

  test('falls back to the card name when no uniqueId is present', () => {
    const url = encodeTradeToURL([{ name: 'Zeta Node', price: 5 }], []);
    loadEncodedURL(url);
    expect(decodeTradeFromURL().have[0][0]).toBe('Zeta Node');
  });

  test('coerces invalid prices to 0 and tolerates non-array inputs', () => {
    const url = encodeTradeToURL(
      [{ name: 'Zeta Node', price: 'not-a-number' }],
      'not-an-array'
    );
    loadEncodedURL(url);
    const decoded = decodeTradeFromURL();
    expect(decoded.have[0][1]).toBe(0);
    expect(decoded.want).toEqual([]);
  });
});

describe('decodeTradeFromURL', () => {
  beforeEach(resetURL);
  afterEach(resetURL);

  test('returns null when there is no trade parameter', () => {
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('returns null when the payload is valid base64 but not JSON', () => {
    // btoa of a non-JSON string decodes cleanly then fails JSON.parse.
    const param = encodeURIComponent(btoa('this is not json {'));
    window.history.replaceState({}, '', `/?trade=${param}`);
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('returns null for an unsupported (too new) version', () => {
    const param = makeTradeParam({ v: 2, t: 1, h: [], w: [] });
    window.history.replaceState({}, '', `/?trade=${param}`);
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('returns null when the version is missing or falsy', () => {
    const param = makeTradeParam({ t: 1, h: [['A', 1]], w: [] });
    window.history.replaceState({}, '', `/?trade=${param}`);
    expect(decodeTradeFromURL()).toBeNull();
  });

  test('leaves timestamp and ageInDays null when no timestamp is present', () => {
    const param = makeTradeParam({ v: 1, h: [['A', 1]], w: [] });
    window.history.replaceState({}, '', `/?trade=${param}`);
    const decoded = decodeTradeFromURL();
    expect(decoded.timestamp).toBeNull();
    expect(decoded.ageInDays).toBeNull();
    // Missing h/w default to empty arrays.
    expect(decoded.want).toEqual([]);
  });

  test('tolerates a raw (already-decoded) base64 param', () => {
    // No percent-encoding layer: decodeURIComponent is a no-op on raw base64.
    const raw = btoa(unescape(encodeURIComponent(JSON.stringify({
      v: 1,
      t: Math.floor(Date.now() / 60000),
      h: [['Solo', 1]],
      w: [],
    }))));
    window.history.replaceState({}, '', `/?trade=${raw}`);
    expect(decodeTradeFromURL().have[0][0]).toBe('Solo');
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

  test('skips a matched group that has no editions', () => {
    const groupsWithEmpty = [{ name: 'Empty Card', editions: [] }];
    expect(reconstructCardsFromURLData([['Empty Card', 1, 1]], groupsWithEmpty)).toEqual([]);
  });

  test('matches via substring when there is no exact name match', () => {
    const [card] = reconstructCardsFromURLData([['Zeta', 999, 1]], cardGroups);
    // "Zeta" is a substring of "Zeta Node"; price has no matching edition so
    // the first edition is used as the default.
    expect(card.name).toBe('Zeta Node');
    expect(card.subTypeName).toBe('Normal');
  });

  test('matches via word overlap when exact/base/substring all miss', () => {
    const groups = [
      { name: 'Alpha Beta', editions: [{ subTypeName: 'Normal', cardPrice: 3, uniqueId: 'ab' }] },
    ];
    const [card] = reconstructCardsFromURLData([['Alpha Gamma Beta', 3, 1]], groups);
    expect(card.name).toBe('Alpha Beta');
  });

  test('skips entries that throw while being reconstructed', () => {
    // A null entry is neither an array nor a valid object; property access
    // throws and the card is skipped rather than crashing the whole decode.
    expect(reconstructCardsFromURLData([null, ['Gamma Coil', 4.5]], cardGroups)).toHaveLength(1);
  });

  test('clamps invalid quantities up to at least 1', () => {
    const [card] = reconstructCardsFromURLData([['Gamma Coil', 4.5, 0]], cardGroups);
    expect(card.quantity).toBe(1);
  });
});
