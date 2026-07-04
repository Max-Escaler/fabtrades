import {
  encodeTradeToURL,
  decodeTradeFromURL,
  reconstructCardsFromURLData,
  hasTradeDataInURL,
  clearTradeFromURL,
} from '../../src/utils/urlEncoding.js';

// Names are single tokens on purpose: the compressor strips ALL whitespace and
// applies lossy card-name substitutions (uppercase "R"/"B"/"Y", "St", "Th"...),
// so space-free identifiers are what actually survives an exact round-trip.
const haveCards = [
  { name: 'ZetaNode', price: 10, quantity: 1 },
  { name: 'GammaCoil', price: 4.5, quantity: 3 },
];
const wantCards = [{ name: 'DeltaVane', price: 20, quantity: 1 }];

const resetURL = () => window.history.replaceState({}, '', '/');

describe('encodeTradeToURL', () => {
  beforeEach(resetURL);

  test('produces a URL carrying a `trade` query parameter', () => {
    const url = encodeTradeToURL(haveCards, wantCards);
    expect(typeof url).toBe('string');
    expect(url).toContain('?trade=');
  });

  test('honors a custom baseUrl', () => {
    const url = encodeTradeToURL(haveCards, wantCards, {
      baseUrl: 'https://example.com/share',
    });
    expect(url.startsWith('https://example.com/share?trade=')).toBe(true);
  });
});

describe('encode/decode round-trip', () => {
  beforeEach(resetURL);
  afterEach(resetURL);

  test('decodes the same cards that were encoded', () => {
    const url = encodeTradeToURL(haveCards, wantCards);
    window.history.replaceState({}, '', url);

    const decoded = decodeTradeFromURL();
    expect(decoded).not.toBeNull();
    expect(decoded.version).toBe(1);
    expect(decoded.have).toHaveLength(2);
    expect(decoded.want).toHaveLength(1);

    // Array form: [name, price, quantity?] — quantity omitted when it is 1.
    expect(decoded.have[0][0]).toBe('ZetaNode');
    expect(decoded.have[0][1]).toBe(10);
    expect(decoded.have[1][0]).toBe('GammaCoil');
    expect(decoded.have[1][2]).toBe(3);
    expect(decoded.want[0][0]).toBe('DeltaVane');
  });
});

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
