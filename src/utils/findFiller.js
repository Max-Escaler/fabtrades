/**
 * Find Trade Filler helpers.
 *
 * Ranks catalog cards by how closely their price matches the value gap between
 * the two sides of a trade (same algorithm as the mobile app).
 */

const BALANCED_THRESHOLD = 0.01;
const DEFAULT_MAX_RESULTS = 60;

/**
 * Derive filler target/side from website trade totals.
 * Website `diff` is haveTotal - wantTotal (sign opposite of mobile's gap).
 *
 * @param {number} diff
 * @returns {{ target: number, balanced: boolean, fillSide: 'have'|'want', sideIsMine: boolean }}
 */
export function getFillerContext(diff) {
    const target = Math.abs(diff);
    const balanced = target < BALANCED_THRESHOLD;
    // When their side (want) is ahead, my side needs value — and vice versa.
    const fillSide = diff < 0 ? 'have' : 'want';
    return {
        target,
        balanced,
        fillSide,
        sideIsMine: fillSide === 'have',
    };
}

/**
 * Rank catalog cards by absolute distance from the target fill amount.
 *
 * @param {Array} cards - flat catalog from useCardData
 * @param {number} target - absolute value gap to fill
 * @param {'market'|'low'} priceType
 * @param {number} [maxResults]
 * @returns {Array<{ card: object, price: number, gapDistance: number }>}
 */
export function findFillerMatches(
    cards,
    target,
    priceType = 'market',
    maxResults = DEFAULT_MAX_RESULTS
) {
    if (!Array.isArray(cards) || cards.length === 0 || !(target > 0)) {
        return [];
    }

    const matches = [];
    for (const card of cards) {
        const price = priceType === 'market' ? card.marketPrice : card.lowPrice;
        if (price == null || price <= 0 || Number.isNaN(price)) continue;
        matches.push({
            card,
            price,
            gapDistance: Math.abs(price - target),
        });
    }

    matches.sort((a, b) => a.gapDistance - b.gapDistance);
    return matches.slice(0, maxResults);
}

/**
 * Human-readable closeness label for a match row.
 *
 * @param {{ price: number, gapDistance: number }} match
 * @param {number} target
 * @param {(n: number) => string} formatMoney
 */
export function closenessLabel(match, target, formatMoney) {
    if (match.gapDistance < BALANCED_THRESHOLD) return 'Exact match';
    const over = match.price > target;
    return `${formatMoney(match.gapDistance)} ${over ? 'over' : 'under'}`;
}

/**
 * Build the autocomplete-style option object expected by useTradeState.addCard.
 *
 * @param {object} card
 */
export function cardToTradeOption(card) {
    return {
        label: card.displayName || card.name,
        value: card._uniqueDisplayId || card._uniqueId,
        subTypeName: card.subTypeName,
        setName: card._setName || '',
        card,
    };
}
