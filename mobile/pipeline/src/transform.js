import { normalizeCardName } from './cardmarket.js';

// Products that are not individual cards (booster packs, boxes, accessories, ...).
const SEALED_PATTERNS = [
  'booster box', 'booster pack', 'booster display', 'starter deck', 'starter kit',
  'bundle', 'collector box', 'case', 'display', 'prerelease', 'deck box',
  'playmat', 'sleeves',
  'blitz deck', 'classic battles', 'ultimate pit fight', 'armory deck', 'hero deck',
  'booster', 'blitz', 'first strike', 'mixed booster'
];

export function isSealedProduct(row) {
  const name = (row.name || '').toLowerCase();
  const subTypeName = (row.subTypeName || '').toLowerCase();
  return SEALED_PATTERNS.some((p) => name.includes(p) || subTypeName.includes(p));
}

// TCGCSV price fields arrive as strings, sometimes empty. Parse safely to number|null.
export function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

export function toBigInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

// A card's Normal and Foil share the same productId, so productId alone is not unique.
// Build a stable per-printing key from (productId, subTypeName).
export function subtypeSlug(subTypeName) {
  const slug = (subTypeName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'base';
}

export function printingId(productId, subTypeName) {
  return `${productId}-${subtypeSlug(subTypeName)}`;
}

// Turn one set's raw product rows into DB rows for cards / card_prices / price_history.
// setNumber feeds the SSSNNNN-style `unique_id` (mirrors the fabtrades/web-app convention).
export function buildRows(groupProducts, groupId, setNumber, cmByName) {
  const cards = [];
  const prices = [];
  const history = [];

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const setId = toBigInt(groupId);

  groupProducts.forEach((row, index) => {
    const productId = toBigInt(row.productId);
    if (!productId || !row.name) return;

    const isFoil = (row.subTypeName || '').toLowerCase().includes('foil');
    const id = printingId(productId, row.subTypeName);
    const uniqueId = `${String(setNumber ?? 0).padStart(3, '0')}${String(index).padStart(4, '0')}`;

    // Match CardMarket by cleanName first, then name.
    const cm =
      cmByName.get(normalizeCardName(row.cleanName)) ||
      cmByName.get(normalizeCardName(row.name)) ||
      null;

    cards.push({
      id,
      product_id: productId,
      set_id: setId,
      unique_id: uniqueId,
      name: row.name,
      clean_name: row.cleanName || null,
      image_url: row.imageUrl || null,
      tcgplayer_url: row.url || null,
      sub_type_name: row.subTypeName || null,
      is_foil: isFoil,
      rarity: row.extRarity || row.rarity || null,
      collector_number: row.extNumber || row.number || null,
      is_sealed: isSealedProduct(row),
      cardmarket_id: cm ? cm.idProduct : null,
      cardmarket_name: cm ? cm.name : null,
      card_type: row.extCardType || null,
      card_sub_type: row.extCardSubType || null,
      card_class: row.extClass || null,
      talent: row.extTalent || null,
      pitch: row.extPitchValue || null,
      cost: row.extCost || null,
      power: row.extPower || null,
      defense: row.extDefenseValue || null,
      life: row.extLife || null,
      intellect: row.extIntellect || null,
      modified_on: row.modifiedOn || null,
      updated_at: now
    });

    const tcgMarket = toNumber(row.marketPrice);
    const tcgLow = toNumber(row.lowPrice);
    const cmTrend = cm ? toNumber(cm.trend) : null;
    const cmLow = cm ? toNumber(cm.low) : null;

    prices.push({
      card_id: id,
      tcg_low: tcgLow,
      tcg_mid: toNumber(row.midPrice),
      tcg_high: toNumber(row.highPrice),
      tcg_market: tcgMarket,
      tcg_direct_low: toNumber(row.directLowPrice),
      cm_avg: cm ? toNumber(cm.avg) : null,
      cm_low: cmLow,
      cm_trend: cmTrend,
      cm_avg_foil: cm ? toNumber(cm.avgFoil) : null,
      cm_low_foil: cm ? toNumber(cm.lowFoil) : null,
      cm_trend_foil: cm ? toNumber(cm.trendFoil) : null,
      updated_at: now
    });

    history.push({
      card_id: id,
      captured_on: today,
      tcg_market: tcgMarket,
      tcg_low: tcgLow,
      cm_trend: cmTrend,
      cm_low: cmLow
    });
  });

  return { cards, prices, history };
}
