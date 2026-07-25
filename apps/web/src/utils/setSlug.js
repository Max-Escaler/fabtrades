// Shared, dependency-free helpers for turning set metadata into stable,
// SEO-friendly URL slugs. This module is imported by both the React app
// (src/hooks/useSets.js) and the build-time SEO generator
// (scripts/generateSeoPages.js), so it must not import React or anything
// browser-specific.

/**
 * Turn a set name into a URL slug, e.g. "Omens of the Third Age" ->
 * "omens-of-the-third-age".
 */
export const slugifySetName = (name = '') =>
    String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

/**
 * Build a deterministic, collision-free groupId -> slug map for a list of
 * sets. When two sets share a base slug (rare), every colliding set gets its
 * groupId appended so the result is unique and order-independent.
 *
 * @param {Array<{groupId: string|number, name: string}>} sets
 * @returns {Map<string, string>} map keyed by String(groupId)
 */
export const buildSetSlugMap = (sets = []) => {
    const baseCounts = new Map();
    for (const set of sets) {
        const base = slugifySetName(set.name);
        baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
    }

    const map = new Map();
    for (const set of sets) {
        const base = slugifySetName(set.name);
        const slug = baseCounts.get(base) > 1 ? `${base}-${set.groupId}` : base;
        map.set(String(set.groupId), slug);
    }
    return map;
};

/**
 * Convenience wrapper returning the slug for a single set given the full list
 * (needed for collision resolution).
 */
export const getSlugForSet = (sets, groupId) =>
    buildSetSlugMap(sets).get(String(groupId)) || '';
