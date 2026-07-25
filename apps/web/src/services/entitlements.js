import { supabase } from '../lib/supabase';

/**
 * No access. What a signed-out visitor gets, and what an unreadable row falls
 * back to.
 */
export const FREE_ENTITLEMENT = Object.freeze({
    isPro: false,
    isInTrial: false,
    hasBillingIssue: false,
    isSandbox: false,
    expiresAt: null,
    productId: null,
    purchasedFrom: null,
});

const SOURCE_LABELS = {
    app_store: 'the App Store',
    play_store: 'Google Play',
    stripe: 'the web',
    promo: 'a complimentary grant',
};

/**
 * Maps a `public.entitlements` row onto the shape the app reads.
 *
 * Kept identical in spirit to `ServerEntitlement` in
 * `apps/mobile/lib/core/models/entitlement.dart`: same columns, same meaning,
 * so "Pro" is one idea across the two clients rather than two similar ones.
 *
 * @param {Object|null} row - Row from `entitlements`, or null when absent
 * @returns {Object} The entitlement, never null
 */
export function entitlementFromRow(row) {
    if (!row) return FREE_ENTITLEMENT;

    return {
        // Grace period is already folded into `is_active` by the webhook: a
        // customer whose card failed this morning has not stopped subscribing.
        isPro: row.is_active === true,
        isInTrial: row.is_trialing === true,
        hasBillingIssue: row.in_grace_period === true,
        isSandbox: row.is_sandbox === true,
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        productId: row.product_id ?? null,
        purchasedFrom: SOURCE_LABELS[row.source] ?? null,
    };
}

/**
 * Reads this account's entitlement.
 *
 * Web is a pure reader: only the RevenueCat webhook writes this table, and RLS
 * allows nothing else. There is no device-side source to merge in the way mobile
 * does, because a browser cannot hold a store receipt.
 *
 * @param {string} userId - Supabase user id
 * @returns {Promise<{ entitlement: Object, error: Object|null }>}
 */
export async function fetchEntitlement(userId) {
    if (!supabase) {
        return { entitlement: FREE_ENTITLEMENT, error: { message: 'Supabase is not configured' } };
    }

    try {
        // `maybeSingle`, not `single`: no row is the normal state for everybody who
        // has never subscribed, and it is not an error.
        const { data, error } = await supabase
            .from('entitlements')
            .select('is_active, is_trialing, in_grace_period, source, product_id, expires_at, is_sandbox')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        return { entitlement: entitlementFromRow(data), error: null };
    } catch (error) {
        console.error('Error reading entitlement:', error);
        return { entitlement: FREE_ENTITLEMENT, error };
    }
}
