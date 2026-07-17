// Shared browse-order helpers for Flesh and Blood product groups.
// Used by the React set browser (useSets) and the SEO page generator so both
// surfaces stay in sync. Dependency-free — safe for Node scripts.

/**
 * Product-line prefixes that are not "main" expansions. Matched case-
 * insensitively against the start of the set name (or as a whole-name
 * pattern for promo cards).
 */
const OTHER_PRODUCT_LINE_PATTERNS = [
    /^blitz deck\b/i,
    /^hero deck\b/i,
    /^welcome deck\b/i,
    /^gem pack\b/i,
    /^mastery pack\b/i,
    /^historic pack\b/i,
    /^classic battles\b/i,
    /^1st strike\b/i,
    /^compendium\b/i,
    /^round the table\b/i,
    /\bpromo cards\b/i
];

/**
 * Browse-list tier for a set name. Lower sorts first:
 *   0 — main expansions
 *   1 — Armory Decks
 *   2 — Silver Age
 *   3 — other product lines (Blitz / Hero / packs / promos / etc.)
 *
 * Categories are inferred from the set name; TCGCSV does not expose a
 * product-line enum for these buckets.
 *
 * @param {string} name
 * @returns {number}
 */
export const setBrowseTier = (name = '') => {
    const n = String(name).trim();
    if (!n) return 3;

    const lower = n.toLowerCase();
    if (lower.startsWith('armory deck')) return 1;
    if (lower.startsWith('silver age')) return 2;
    if (OTHER_PRODUCT_LINE_PATTERNS.some((re) => re.test(n))) return 3;
    return 0;
};

/**
 * Compare two sets for the browse list: tier first, then newest
 * `publishedOn` within a tier, then name A–Z as a stable fallback.
 *
 * @param {{name?: string, publishedOn?: string|null}} a
 * @param {{name?: string, publishedOn?: string|null}} b
 * @returns {number}
 */
export const compareSetsByBrowseOrder = (a, b) => {
    const tierDiff = setBrowseTier(a?.name) - setBrowseTier(b?.name);
    if (tierDiff !== 0) return tierDiff;

    const da = a?.publishedOn ? new Date(a.publishedOn).getTime() : 0;
    const db = b?.publishedOn ? new Date(b.publishedOn).getTime() : 0;
    if (db !== da) return db - da;

    return String(a?.name || '')
        .toLowerCase()
        .localeCompare(String(b?.name || '').toLowerCase());
};

/**
 * Compare set names only (mobile has no publishedOn on the client). Same
 * tier order as {@link compareSetsByBrowseOrder}, alphabetical within a tier.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export const compareSetNamesByBrowseOrder = (a, b) => {
    const tierDiff = setBrowseTier(a) - setBrowseTier(b);
    if (tierDiff !== 0) return tierDiff;
    return String(a || '')
        .toLowerCase()
        .localeCompare(String(b || '').toLowerCase());
};
