/**
 * Persist the in-progress trade calculator lists across page navigations.
 * Privacy policy already documents this as local browser storage.
 */

export const TRADE_DRAFT_KEY = 'fabtrades-trade-draft';

/**
 * @returns {{ have: Array, want: Array }|null}
 */
export function loadTradeDraft() {
    try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(TRADE_DRAFT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            have: Array.isArray(parsed.have) ? parsed.have : [],
            want: Array.isArray(parsed.want) ? parsed.want : [],
        };
    } catch {
        return null;
    }
}

/**
 * Serialize calculator lists down to a stable, reconstructable shape.
 * @param {Array} haveList
 * @param {Array} wantList
 */
export function saveTradeDraft(haveList = [], wantList = []) {
    try {
        if (typeof localStorage === 'undefined') return;
        const toMinimal = (list) =>
            (Array.isArray(list) ? list : []).map((card) => ({
                uniqueId: card.uniqueId || null,
                name: card.name || '',
                subTypeName: card.subTypeName || 'Normal',
                quantity: Math.max(1, Math.min(6, Number(card.quantity) || 1)),
                price: Number(card.price) || 0,
            }));

        localStorage.setItem(
            TRADE_DRAFT_KEY,
            JSON.stringify({
                v: 1,
                have: toMinimal(haveList),
                want: toMinimal(wantList),
            }),
        );
    } catch (error) {
        console.error('Failed to save trade draft:', error);
    }
}

/**
 * Add (or bump) a card on one side of the draft without needing React state.
 *
 * Used from the shared binder page so cards survive navigating to `/`.
 *
 * @param {'have'|'want'} side
 * @param {{ uniqueId?: string|null, name: string, subTypeName?: string, quantity?: number, price?: number }} card
 * @returns {{ have: Array, want: Array }}
 */
export function addCardToTradeDraft(side, card) {
    if (side !== 'have' && side !== 'want') {
        throw new Error(`Invalid trade draft side: ${side}`);
    }
    if (!card?.name && !card?.uniqueId) {
        return loadTradeDraft() || { have: [], want: [] };
    }

    const draft = loadTradeDraft() || { have: [], want: [] };
    const list = [...(draft[side] || [])];
    const addQty = Math.max(1, Math.min(6, Number(card.quantity) || 1));

    const idx = card.uniqueId
        ? list.findIndex((c) => c.uniqueId === card.uniqueId)
        : list.findIndex(
            (c) => c.name === card.name && c.subTypeName === (card.subTypeName || 'Normal'),
        );

    if (idx >= 0) {
        list[idx] = {
            ...list[idx],
            quantity: Math.min(6, (list[idx].quantity || 1) + addQty),
            price: Number(card.price) || list[idx].price || 0,
        };
    } else {
        list.push({
            uniqueId: card.uniqueId || null,
            name: card.name || '',
            subTypeName: card.subTypeName || 'Normal',
            quantity: addQty,
            price: Number(card.price) || 0,
        });
    }

    const next = {
        have: side === 'have' ? list : draft.have,
        want: side === 'want' ? list : draft.want,
    };
    saveTradeDraft(next.have, next.want);
    return next;
}
