/**
 * The `trades.have_list` / `want_list` columns are written by both clients, and
 * they do not agree on a shape.
 *
 * Web stores its own in-memory card objects: camelCase, card fields inlined, and
 * carrying `cardGroup` plus `availableEditions` so the edition dropdown keeps
 * working after a reload. Mobile stores snake_case lines with the card nested under
 * `card`, because that is the shape its local storage has always used.
 *
 * Migrating either one would break trades already saved in that format, so both are
 * read instead. Everything downstream sees web's shape.
 */

/**
 * Reads one saved line, whichever client wrote it.
 *
 * @param {Object} item - A line from `have_list` or `want_list`.
 * @returns {{ name: string, quantity: number, price: number, lowPrice: number|null,
 *   subTypeName: string|null, uniqueId: string|null, imageUrl: string,
 *   imageUrlFallback: string }|null} Normalized line, or null if unreadable.
 */
export function normalizeTradeItem(item) {
    if (!item || typeof item !== 'object') return null;

    // The nested card object is what identifies a mobile line.
    const card = item.card;
    if (card && typeof card === 'object') {
        if (!card.name) return null;
        return {
            name: card.name,
            quantity: toCount(item.quantity),
            price: toAmount(item.price_each),
            lowPrice: card.tcg_low ?? null,
            subTypeName: card.sub_type_name ?? null,
            uniqueId: card.id ?? null,
            imageUrl: card.image_url ?? '',
            imageUrlFallback: ''
        };
    }

    if (!item.name) return null;
    return {
        name: item.name,
        quantity: toCount(item.quantity),
        price: toAmount(item.price),
        lowPrice: item.lowPrice ?? null,
        subTypeName: item.subTypeName ?? null,
        uniqueId: item.uniqueId ?? null,
        imageUrl: item.imageUrl ?? '',
        imageUrlFallback: item.imageUrlFallback ?? ''
    };
}

/**
 * Reads a whole saved side, skipping lines that cannot be read.
 *
 * A trade missing one card is still a useful record of the trade; refusing to open
 * it because of one bad line is not.
 *
 * @param {Array} list - `have_list` or `want_list` as stored.
 * @returns {Array} Normalized lines.
 */
export function normalizeTradeList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeTradeItem).filter(Boolean);
}

/**
 * A trade's display name, which mobile does not set.
 *
 * Web requires a name in its save dialog. Mobile saves a trade as a side effect of
 * confirming one, so those rows arrive unnamed and are identified by their date.
 *
 * @param {Object} trade - A row from `trades`.
 * @returns {string}
 */
export function tradeDisplayName(trade) {
    const name = trade?.name?.trim();
    if (name) return name;
    const created = trade?.created_at ? new Date(trade.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) return 'Untitled trade';
    return `Trade on ${created.toLocaleDateString()}`;
}

function toCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? Math.round(count) : 1;
}

function toAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
}
