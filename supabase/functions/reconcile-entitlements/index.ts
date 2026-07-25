/**
 * The repair layer for entitlements.
 *
 * Webhooks are the fast path, and they are not reliable enough to be the only path.
 * A delivery can exhaust its retries during an outage, and an expiry is a non-event
 * — nothing fires when a subscription simply lapses. Either way a customer ends up
 * with the wrong access and nothing notices.
 *
 * So once a night, re-read state from RevenueCat for everyone whose row is about to
 * matter: active subscribers at or near their expiry. Keeping the set that small is
 * what makes a full sweep of every user unnecessary.
 *
 * Wiring only — the sweep itself lives in `reconcile.ts`.
 *
 * Called by .github/workflows/reconcile-entitlements.yml, which holds only this
 * function's shared secret; the RevenueCat and service-role keys stay in Supabase.
 *
 * Deploy:
 *   supabase secrets set RECONCILE_SECRET=...
 *   supabase functions deploy reconcile-entitlements
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { isAuthorized, json } from '../_shared/http.ts';
import { fetchSubscriber } from '../_shared/revenuecat.ts';
import { reconcile, TRACKED_COLUMNS } from './reconcile.ts';
import type { EntitlementRow } from './reconcile.ts';

const ENTITLEMENT_ID = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') ??
  'FABTrades Pro';

Deno.serve(async (request) => {
  const secret = Deno.env.get('RECONCILE_SECRET');
  const apiKey = Deno.env.get('REVENUECAT_API_KEY');
  if (!secret || !apiKey) {
    console.error('Missing RECONCILE_SECRET or REVENUECAT_API_KEY');
    return json({ error: 'not configured' }, 503);
  }

  if (!isAuthorized(request.headers.get('Authorization'), secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    const result = await reconcile({
      entitlementId: ENTITLEMENT_ID,

      async listDue(from, to) {
        // Rows with no expiry — lifetime unlocks, promo grants — never match either
        // bound, which is right: nothing about them changes on a clock.
        const { data, error } = await supabase
          .from('entitlements')
          .select(TRACKED_COLUMNS)
          .eq('is_active', true)
          .gte('expires_at', from)
          .lte('expires_at', to);
        if (error) throw error;
        return (data ?? []) as unknown as EntitlementRow[];
      },

      async saveEntitlement(userId, state) {
        const { error } = await supabase
          .from('entitlements')
          .upsert(
            { user_id: userId, ...state, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
          );
        if (error) throw error;
      },

      fetchSubscriber: (appUserId) => fetchSubscriber(appUserId, apiKey),
    });

    console.log(
      `Checked ${result.checked} entitlement(s): ${result.changed} changed, ` +
        `${result.failed.length} failed`,
    );

    // A partial failure is reported as a failure so the scheduled run goes red, with
    // the successful work already committed.
    return json(result, result.failed.length ? 500 : 200);
  } catch (error) {
    // Only the initial query can land here; a per-customer failure is collected in
    // `result.failed` so one bad row cannot end the sweep.
    console.error('Could not reconcile entitlements', error);
    return json({ error: 'could not reconcile entitlements' }, 500);
  }
});
