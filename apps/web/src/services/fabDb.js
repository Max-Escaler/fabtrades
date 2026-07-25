/**
 * Read-only access to the shared Supabase card/price database (see
 * docs/mobile/DATABASE.md). This replaces the old committed CSV/JSON price
 * files under public/price-guide — the daily "Update FAB Prices" GitHub
 * Action ingests TCGCSV data straight into the database, and every surface
 * (web, mobile, build scripts) reads from there.
 *
 * Dependency-free on purpose: it runs both in the browser (Vite bundle) and
 * in Node 18+ (scripts/generateSeoPages.js at build time).
 */

// The publishable key is safe to ship in clients: all card/price tables are
// public read-only via RLS. Only the pipeline's service_role key can write. Which
// project it points at is what matters, so it comes from the environment.
import { requireSupabaseConfig } from '../config/env.js';

const PAGE_SIZE = 1000; // PostgREST caps a single response at 1000 rows.

const restGet = async (pathAndQuery) => {
    // Resolved per request rather than at import, so a misconfigured deploy reports
    // the missing variable instead of failing to load the module.
    const { url, key } = requireSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`
        }
    });
    if (!response.ok) {
        throw new Error(`FAB database request failed (${response.status}): ${pathAndQuery}`);
    }
    return response.json();
};

// Only the columns the web app actually consumes.
const CARD_COLUMNS = [
    'id', 'product_id', 'set_id', 'name', 'clean_name', 'image_url',
    'tcgplayer_url', 'sub_type_name', 'rarity', 'collector_number',
    'card_type', 'card_sub_type', 'card_class', 'talent', 'pitch', 'cost',
    'power', 'defense', 'life', 'intellect', 'modified_on', 'set_name',
    'tcg_low', 'tcg_mid', 'tcg_high', 'tcg_market', 'tcg_direct_low'
].join(',');

/**
 * Map a fab_cards_with_prices row to the row shape the app has always used
 * (the old consolidated-data.json / TCGCSV column names), so downstream code
 * (card objects, set grouping, SEO pages) is source-agnostic.
 */
const mapRowToLegacyShape = (row) => ({
    productId: row.product_id,
    name: row.name || '',
    cleanName: row.clean_name || '',
    categoryId: '62',
    groupId: row.set_id,
    imageUrl: row.image_url || '',
    url: row.tcgplayer_url || '',
    modifiedOn: row.modified_on || '',
    lowPrice: row.tcg_low,
    midPrice: row.tcg_mid,
    highPrice: row.tcg_high,
    marketPrice: row.tcg_market,
    directLowPrice: row.tcg_direct_low,
    subTypeName: row.sub_type_name || '',
    extRarity: row.rarity || '',
    extNumber: row.collector_number || '',
    extCardType: row.card_type || '',
    extCardSubType: row.card_sub_type || '',
    extClass: row.card_class || '',
    extIntellect: row.intellect,
    extLife: row.life,
    extCost: row.cost,
    extPitchValue: row.pitch,
    extPower: row.power,
    extDefenseValue: row.defense,
    extTalent: row.talent || '',
    // The per-printing DB primary key ("<productId>-<subtype>") — stable
    // across ingests, used for card lookups and share-URL encoding.
    _uniqueId: row.id,
    _setName: row.set_name || ''
});

/** All (non-sealed) card printings with current prices, in legacy row shape. */
export const fetchCatalogRows = async () => {
    const rows = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
        const page = await restGet(
            `fab_cards_with_prices?select=${CARD_COLUMNS}` +
            `&is_sealed=eq.false&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}`
        );
        rows.push(...page.map(mapRowToLegacyShape));
        if (page.length < PAGE_SIZE) break;
    }
    return rows;
};

/** All sets (TCGplayer groups) with browse metadata. */
export const fetchSetGroups = async () => {
    const rows = await restGet(
        'fab_sets?select=group_id,name,set_number,abbreviation,published_on,is_supplemental,modified_on' +
        '&order=group_id.asc'
    );
    return rows.map((row) => ({
        groupId: row.group_id,
        name: row.name || '',
        setNumber: row.set_number,
        abbreviation: row.abbreviation || '',
        publishedOn: row.published_on || null,
        isSupplemental: !!row.is_supplemental,
        modifiedOn: row.modified_on || null
    }));
};

/** ISO timestamp of the most recent price ingest, or null when unavailable. */
export const fetchPricesUpdatedAt = async () => {
    const rows = await restGet(
        'fab_card_prices?select=updated_at&order=updated_at.desc&limit=1'
    );
    return rows[0]?.updated_at || null;
};

/** Everything the app needs at startup, with `_setNumber` joined onto cards. */
export const fetchCatalog = async () => {
    const [rows, sets, pricesUpdatedAt] = await Promise.all([
        fetchCatalogRows(),
        fetchSetGroups(),
        fetchPricesUpdatedAt()
    ]);
    const setNumberByGroupId = new Map(
        sets.map((s) => [String(s.groupId), s.setNumber])
    );
    for (const row of rows) {
        row._setNumber = setNumberByGroupId.get(String(row.groupId)) || 0;
    }
    return { rows, sets, pricesUpdatedAt };
};
