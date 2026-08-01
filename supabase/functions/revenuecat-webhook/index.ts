/**
 * RevenueCat webhook: the only writer of `public.entitlements`.
 *
 * This file is wiring only — the decisions live in `handler.ts`, and the order they
 * happen in is the design. Each step is there because of a specific way this goes
 * wrong otherwise:
 *
 *   1. Check the shared secret. Otherwise the URL is the only thing protecting an
 *      endpoint that grants paid access, and URLs leak.
 *   2. Record the event, keyed by RevenueCat's event id. Already recorded means a
 *      replay, and replays are routine — RevenueCat retries until it gets a 200.
 *   3. Ask RevenueCat for the customer's *current* state. Do not fold the event into
 *      a boolean: events arrive out of order, and a refund arrives as a CANCELLATION.
 *   4. Overwrite the entitlement row, which is what makes the handler idempotent.
 *
 * Failures return 5xx so RevenueCat retries. Anything unprocessable — no secret
 * configured, an unparseable body, an app_user_id that is not one of ours — returns
 * 2xx or 4xx to stop the retries, because repeating it cannot help.
 *
 * Deploy:
 *   supabase secrets set REVENUECAT_WEBHOOK_SECRET=... REVENUECAT_API_KEY=sk_... \
 *     POSTHOG_API_KEY=phc_...
 *   supabase functions deploy revenuecat-webhook
 *
 * POSTHOG_API_KEY is optional; without it subscription lifecycle events are
 * simply not sent to PostHog. Set it on the production project.
 *
 * `verify_jwt = false` in config.toml is required: RevenueCat sends the shared secret
 * above, not a Supabase JWT, so with gateway verification on every delivery would 401.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { json } from '../_shared/http.ts';
import { fetchSubscriber } from '../_shared/revenuecat.ts';
import { handleWebhook } from './handler.ts';
import type { EntitlementStore } from './handler.ts';

/** Must match the entitlement identifier in the RevenueCat dashboard. */
const ENTITLEMENT_ID = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') ??
  'FABTrades Pro';

Deno.serve((request) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const apiKey = Deno.env.get('REVENUECAT_API_KEY');
  if (!secret || !apiKey) {
    // Misconfiguration, not a transient fault, so 503 rather than 500: a 500 would
    // have RevenueCat retrying for days against a function that cannot succeed.
    console.error('Missing REVENUECAT_WEBHOOK_SECRET or REVENUECAT_API_KEY');
    return json({ error: 'not configured' }, 503);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const store: EntitlementStore = {
    async recordEvent({ id, appUserId, payload }) {
      // `select` after the insert is how a new event is told apart from a replay;
      // `ignoreDuplicates` makes the conflict silent instead of an error.
      const { data, error } = await supabase
        .from('billing_events')
        .upsert(
          { id, provider: 'revenuecat', app_user_id: appUserId, payload },
          { onConflict: 'id', ignoreDuplicates: true },
        )
        .select('id');
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },

    async forgetEvent(id) {
      const { error } = await supabase
        .from('billing_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
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
  };

  return handleWebhook(request, {
    secret,
    apiKey,
    entitlementId: ENTITLEMENT_ID,
    posthogApiKey: Deno.env.get('POSTHOG_API_KEY') ?? undefined,
    store,
    fetchSubscriber,
  });
});
