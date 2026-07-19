import {
  collectorNumberPrefix,
  deriveSetAbbreviation,
  resolveSetAbbreviation
} from '../../src/utils/setAbbreviation.js';

describe('collectorNumberPrefix', () => {
  test('extracts letter prefix from collector numbers', () => {
    expect(collectorNumberPrefix('SEA004')).toBe('SEA');
    expect(collectorNumberPrefix('sea027')).toBe('SEA');
    expect(collectorNumberPrefix('HNT001 // ALT')).toBe('HNT');
  });

  test('returns empty for non-standard numbers', () => {
    expect(collectorNumberPrefix('')).toBe('');
    expect(collectorNumberPrefix('FAB344')).toBe('FAB');
    expect(collectorNumberPrefix('123')).toBe('');
  });
});

describe('deriveSetAbbreviation', () => {
  test('picks a clear majority prefix (High Seas)', () => {
    const numbers = Array.from({ length: 20 }, (_, i) =>
      `SEA${String(i + 1).padStart(3, '0')}`
    );
    expect(deriveSetAbbreviation(numbers)).toBe('SEA');
  });

  test('ignores FAB promo codes when choosing a majority', () => {
    const numbers = [
      ...Array.from({ length: 10 }, (_, i) => `HNT${i + 1}`),
      'FAB344'
    ];
    expect(deriveSetAbbreviation(numbers)).toBe('HNT');
  });

  test('returns empty when prefixes are mixed (Silver Age chapters)', () => {
    const numbers = [
      'SBR001',
      'SDA001',
      'SVI001',
      'SKA001',
      'SIY001',
      'SBR002',
      'SDA002',
      'SVI002',
      'SKA002',
      'SIY002'
    ];
    expect(deriveSetAbbreviation(numbers)).toBe('');
  });

  test('returns empty without enough samples', () => {
    expect(deriveSetAbbreviation(['SEA001', 'SEA002'])).toBe('');
  });
});

describe('resolveSetAbbreviation', () => {
  test('prefers the provided TCGCSV abbreviation', () => {
    expect(resolveSetAbbreviation('OMN', ['SEA001', 'SEA002', 'SEA003', 'SEA004', 'SEA005'])).toBe(
      'OMN'
    );
  });

  test('falls back to derivation when provided is blank', () => {
    const numbers = Array.from({ length: 8 }, (_, i) => `SEA${i + 1}`);
    expect(resolveSetAbbreviation('', numbers)).toBe('SEA');
    expect(resolveSetAbbreviation(null, numbers)).toBe('SEA');
  });
});
