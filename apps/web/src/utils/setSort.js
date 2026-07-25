// Shared browse-order helpers for Flesh and Blood product groups.
// Used by the React set browser (useSets) and the SEO page generator so both
// surfaces stay in sync. Dependency-free — safe for Node scripts.
// Keep in sync with `mobile/app/lib/core/logic/set_sort.dart`.

/**
 * Browse-list tiers (lower sorts first). Categories are inferred from the set
 * name; TCGCSV does not expose a product-line enum for these buckets.
 */
export const BROWSE_TIER = {
    MAIN: 0,
    BLITZ: 1,
    ARMORY: 2,
    SILVER_AGE: 3,
    HERO: 4,
    OTHER: 5
};

const BROWSE_TIER_LABELS = {
    [BROWSE_TIER.MAIN]: 'Main Sets',
    [BROWSE_TIER.BLITZ]: 'Blitz Decks',
    [BROWSE_TIER.ARMORY]: 'Armory Decks',
    [BROWSE_TIER.SILVER_AGE]: 'Silver Age',
    [BROWSE_TIER.HERO]: 'Hero Decks',
    [BROWSE_TIER.OTHER]: 'Other'
};

/**
 * Product-line prefixes that fall into the catch-all "Other" section.
 * Matched case-insensitively against the set name.
 */
const OTHER_PRODUCT_LINE_PATTERNS = [
    /^welcome deck\b/i,
    /^gem pack\b/i,
    /^historic pack\b/i,
    /^classic battles\b/i,
    /^1st strike\b/i,
    /^round the table\b/i,
    /\bpromo cards\b/i
];

/**
 * Browse-list tier for a set name. Lower sorts first:
 *   0 — Main Sets
 *   1 — Blitz Decks
 *   2 — Armory Decks
 *   3 — Silver Age
 *   4 — Hero Decks
 *   5 — Other
 *
 * @param {string} name
 * @returns {number}
 */
export const setBrowseTier = (name = '') => {
    const n = String(name).trim();
    if (!n) return BROWSE_TIER.OTHER;

    const lower = n.toLowerCase();
    if (lower.startsWith('blitz deck')) return BROWSE_TIER.BLITZ;
    if (lower.startsWith('armory deck')) return BROWSE_TIER.ARMORY;
    if (lower.startsWith('silver age')) return BROWSE_TIER.SILVER_AGE;
    if (lower.startsWith('hero deck')) return BROWSE_TIER.HERO;
    if (OTHER_PRODUCT_LINE_PATTERNS.some((re) => re.test(n))) {
        return BROWSE_TIER.OTHER;
    }
    return BROWSE_TIER.MAIN;
};

/**
 * Human-readable section title for a browse tier.
 *
 * @param {number} tier
 * @returns {string}
 */
export const browseTierLabel = (tier) =>
    BROWSE_TIER_LABELS[tier] || BROWSE_TIER_LABELS[BROWSE_TIER.OTHER];

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
 * Compare set names only. Same tier order as {@link compareSetsByBrowseOrder},
 * alphabetical within a tier when no dates are available.
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
