/**
 * Free-tier ceilings. FABTrades Pro removes all of them.
 *
 * These numbers are duplicated in `apps/mobile/lib/core/logic/free_limits.dart`
 * and pinned by `packages/contracts/free_limits.json`, which both test suites
 * read. Drift here is not cosmetic: mobile enforces the trade window by deleting
 * the oldest rows, so a higher cap on web would look to the customer like mobile
 * eating trades they had saved.
 *
 * `binderCards` and `wantListCards` are listed for completeness — web has no
 * binder yet, so nothing reads them beyond the contract test that keeps them
 * honest.
 */
export const FreeLimits = {
    binderCards: 50,
    wantListCards: 25,
    savedTrades: 10,
};

/**
 * How many of the oldest trades have to roll off to fit inside the free window.
 *
 * Saving a trade is never refused, on either client. Refusing would lose the
 * trade outright, and a history that quietly keeps the ten most recent is a much
 * gentler limit to run into than a save button that stops working.
 *
 * @param {number} total - Trades the account would hold after the save
 * @returns {number} Trades to tombstone, oldest first; 0 when inside the window
 */
export function tradesOverFreeLimit(total) {
    return Math.max(0, total - FreeLimits.savedTrades);
}
