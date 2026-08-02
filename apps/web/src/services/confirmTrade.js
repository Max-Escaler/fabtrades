import { getBinderEntries, removeEntry, upsertEntry } from './binder.js';
import { saveTradeToHistory } from './tradeHistory.js';
import {
    reconcileBinderAfterTrade,
    tradeLinesFromList,
} from '../utils/confirmTrade.js';

/**
 * Confirm a live trade: record it to history and reconcile the Binder.
 *
 * Matches mobile Confirm Trade:
 * - history is always written (unnamed, like mobile)
 * - given cards optionally leave the Binder
 * - received cards optionally enter the Binder (exempt from free-tier cap)
 * - received cards always leave the Want List
 *
 * @param {Object} params
 * @param {Array} params.haveList
 * @param {Array} params.wantList
 * @param {{ haveTotal: number, wantTotal: number, diff: number }} params.totals
 * @param {boolean} [params.removeGivenFromBinder=true]
 * @param {boolean} [params.addReceivedToBinder=true]
 * @returns {Promise<{ data: Object|null, error: Object|null, trimmed: number, binderReconciled: boolean }>}
 */
export async function confirmTrade({
    haveList,
    wantList,
    totals,
    removeGivenFromBinder = true,
    addReceivedToBinder = true,
}) {
    const haveItems = tradeLinesFromList(haveList);
    const wantItems = tradeLinesFromList(wantList);

    if (haveItems.length === 0 && wantItems.length === 0) {
        return {
            data: null,
            error: { message: 'Add cards to the trade before confirming' },
            trimmed: 0,
            binderReconciled: false,
        };
    }

    const givenCount = haveItems.reduce((sum, i) => sum + i.quantity, 0);
    const receivedCount = wantItems.reduce((sum, i) => sum + i.quantity, 0);

    const removeGiven = Boolean(removeGivenFromBinder) && givenCount > 0;
    const addReceived = Boolean(addReceivedToBinder) && receivedCount > 0;
    const binderReconciled = removeGiven || addReceived;

    // History first — same order as mobile. A binder failure must not undo the
    // record of a trade that already happened at the table.
    const { data: saved, error: historyError, trimmed } = await saveTradeToHistory(
        null,
        haveList,
        wantList,
        totals,
        { unnamed: true },
    );

    if (historyError) {
        return {
            data: null,
            error: historyError,
            trimmed: 0,
            binderReconciled: false,
        };
    }

    const { data: binderData, error: loadError } = await getBinderEntries();
    if (loadError) {
        return {
            data: saved,
            error: {
                message:
                    loadError.message
                    || 'Trade saved, but binder could not be updated',
            },
            trimmed: trimmed || 0,
            binderReconciled: false,
        };
    }

    const before = binderData?.all || [];
    const after = reconcileBinderAfterTrade({
        entries: before,
        haveItems,
        wantItems,
        removeGivenFromBinder: removeGiven,
        addReceivedToBinder: addReceived,
    });

    const applyError = await applyBinderDiff(before, after);
    if (applyError) {
        return {
            data: saved,
            error: {
                message:
                    applyError.message
                    || 'Trade saved, but binder could not be fully updated',
            },
            trimmed: trimmed || 0,
            binderReconciled,
        };
    }

    return {
        data: saved,
        error: null,
        trimmed: trimmed || 0,
        binderReconciled,
    };
}

/**
 * Persist reconcile diffs. New/changed rows upsert; removed rows tombstone.
 * Confirm Trade intentionally skips free-tier distinct-card checks.
 *
 * @param {Array} before
 * @param {Array} after
 * @returns {Promise<Object|null>} error or null
 */
async function applyBinderDiff(before, after) {
    const keyOf = (e) => `${e.cardId}|${e.isWanted ? 1 : 0}`;
    const beforeMap = new Map((before || []).map((e) => [keyOf(e), e]));
    const afterMap = new Map((after || []).map((e) => [keyOf(e), e]));

    const ops = [];

    for (const [key, entry] of afterMap) {
        const prev = beforeMap.get(key);
        if (
            !prev
            || prev.quantity !== entry.quantity
            || prev.condition !== entry.condition
        ) {
            ops.push(
                upsertEntry({
                    cardId: entry.cardId,
                    isWanted: entry.isWanted,
                    quantity: entry.quantity,
                    condition: entry.condition || 'NM',
                    card: entry.stub || entry.card,
                    addedAt: entry.addedAt || prev?.addedAt,
                }),
            );
        }
    }

    for (const [key, entry] of beforeMap) {
        if (!afterMap.has(key)) {
            ops.push(removeEntry(entry.cardId, entry.isWanted));
        }
    }

    if (ops.length === 0) return null;

    const results = await Promise.all(ops);
    const failed = results.find((r) => r.error);
    return failed?.error || null;
}
