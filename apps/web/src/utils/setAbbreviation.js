// Resolve display set codes for Browse Sets / SEO.
// TCGCSV often leaves `abbreviation` blank even when cards use a stable
// collector-number prefix (e.g. High Seas cards are SEA### but group.abbreviation is "").
// Keep in sync with `mobile/app/lib/core/logic/set_abbreviation.dart`.

const COLLECTOR_PREFIX_RE = /^([A-Z]{1,5})\d/;

/**
 * First collector code from a TCGCSV extNumber (handles "SEA004 // …" style).
 *
 * @param {string|null|undefined} extNumber
 * @returns {string}
 */
export const getPrimaryCollectorNumber = (extNumber) => {
    if (!extNumber) return '';
    const cleaned = String(extNumber).split(/\s*\/\/\s*|\s*\/\s*/)[0];
    return cleaned ? cleaned.trim() : '';
};

/**
 * Letter prefix of a collector number (SEA004 → SEA). Empty when none.
 *
 * @param {string|null|undefined} collectorNumber
 * @returns {string}
 */
export const collectorNumberPrefix = (collectorNumber) => {
    const primary = getPrimaryCollectorNumber(collectorNumber).toUpperCase();
    const match = primary.match(COLLECTOR_PREFIX_RE);
    return match ? match[1] : '';
};

/**
 * Infer a set code from card collector numbers when TCGCSV omits abbreviation.
 * Requires a clear majority prefix so mixed product lines (e.g. Silver Age
 * chapters with per-hero codes) stay blank rather than guessing.
 *
 * @param {Iterable<string|null|undefined>} collectorNumbers
 * @returns {string}
 */
export const deriveSetAbbreviation = (collectorNumbers) => {
    const counts = new Map();
    let total = 0;
    for (const value of collectorNumbers || []) {
        const prefix = collectorNumberPrefix(value);
        if (!prefix || prefix === 'FAB') continue;
        counts.set(prefix, (counts.get(prefix) || 0) + 1);
        total += 1;
    }
    if (total < 5) return '';

    let best = '';
    let bestCount = 0;
    for (const [prefix, count] of counts) {
        if (count > bestCount) {
            best = prefix;
            bestCount = count;
        }
    }
    if (!best || bestCount / total < 0.5) return '';
    return best;
};

/**
 * Prefer the TCGCSV abbreviation when present; otherwise derive from cards.
 *
 * @param {string|null|undefined} provided
 * @param {Iterable<string|null|undefined>} [collectorNumbers]
 * @returns {string}
 */
export const resolveSetAbbreviation = (provided, collectorNumbers) => {
    const trimmed = String(provided || '').trim();
    if (trimmed) return trimmed;
    return deriveSetAbbreviation(collectorNumbers);
};
