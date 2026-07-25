/**
 * The webhook's decisions, with the database and RevenueCat held at arm's length.
 *
 * Separated from `index.ts` so the parts worth being sure about — the secret check,
 * replay detection, what happens when RevenueCat is down — can be tested without a
 * Postgres or a network.
 */

import { asSupabaseUserId, readEntitlement } from '../_shared/entitlement.ts';
import type { EntitlementState, RevenueCatSubscriber } from '../_shared/entitlement.ts';
import { isAuthorized, json } from '../_shared/http.ts';

/** Everything the handler touches that is not the request. */
export interface WebhookDeps {
  /** Shared secret RevenueCat is configured to send. */
  secret: string;
  /** RevenueCat secret API key (`sk_…`). */
  apiKey: string;
  /** Entitlement identifier to gate on. */
  entitlementId: string;
  store: EntitlementStore;
  fetchSubscriber(
    appUserId: string,
    apiKey: string,
    includeSandbox: boolean,
  ): Promise<RevenueCatSubscriber | null>;
}

export interface EntitlementStore {
  /**
   * Records an event, returning false when it was already recorded.
   *
   * The return value is the idempotency check: RevenueCat retries until it gets a
   * 200, so redeliveries are routine rather than exceptional.
   */
  recordEvent(event: {
    id: string;
    appUserId: string | null;
    payload: unknown;
  }): Promise<boolean>;

  /**
   * Un-records an event whose entitlement write failed.
   *
   * Without this the retry sees the event id, calls it a replay, and returns 200 —
   * so a transient database error would strand a paying customer on `free` with
   * nothing left to notice: a purchase that never landed has no row for the nightly
   * reconciliation to find.
   */
  forgetEvent(id: string): Promise<void>;

  saveEntitlement(userId: string, state: EntitlementState): Promise<void>;
}

export async function handleWebhook(
  request: Request,
  deps: WebhookDeps,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  if (!isAuthorized(request.headers.get('Authorization'), deps.secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: RevenueCatWebhookBody;
  try {
    body = await request.json();
  } catch {
    // 400, not 500: a body that will not parse this time will not parse next time
    // either, and RevenueCat should stop rather than retry for days.
    return json({ error: 'invalid json' }, 400);
  }

  const event = body?.event;
  if (!event?.id) return json({ error: 'missing event id' }, 400);

  const appUserId = asSupabaseUserId(event.app_user_id) ??
    asSupabaseUserId(event.original_app_user_id);

  let isNew: boolean;
  try {
    isNew = await deps.store.recordEvent({
      id: event.id,
      appUserId,
      payload: body,
    });
  } catch (error) {
    // Recording first is what makes the rest idempotent, so there is nothing safe
    // to do here but ask for the delivery again.
    console.error('Failed to record billing event', error);
    return json({ error: 'could not record event' }, 500);
  }

  if (!isNew) {
    // Already applied. Skipping the RevenueCat call matters: a redelivery burst
    // would otherwise become a burst of API requests for no new information.
    return json({ ok: true, replay: true });
  }

  if (!appUserId) {
    // An anonymous RevenueCat id from before sign-in, or a deleted account. Recorded
    // above so it can be investigated; there is no row to write.
    console.warn(`Event ${event.id} has no Supabase user: ${event.app_user_id}`);
    return json({ ok: true, ignored: 'unknown app_user_id' });
  }

  try {
    const subscriber = await deps.fetchSubscriber(
      appUserId,
      deps.apiKey,
      // Sandbox transactions are omitted unless asked for, so without this a
      // sandbox delivery resolves to "no purchase" and quietly does nothing.
      event.environment === 'SANDBOX',
    );
    const state = readEntitlement(subscriber, deps.entitlementId);

    await deps.store.saveEntitlement(appUserId, state);

    console.log(
      `${event.type ?? 'event'} ${event.id}: ${appUserId} -> ${state.tier}` +
        `${state.is_sandbox ? ' (sandbox)' : ''}`,
    );
    return json({ ok: true, tier: state.tier });
  } catch (error) {
    console.error(`Failed to apply event ${event.id}`, error);

    // Release the idempotency claim so RevenueCat's retry is treated as new work
    // rather than a replay. If even this fails there is nothing further to try, and
    // the log line above is the record of it.
    try {
      await deps.store.forgetEvent(event.id);
    } catch (cleanupError) {
      console.error(`Could not un-record event ${event.id}`, cleanupError);
    }

    // 500 is what triggers the retry, which re-reads current state and converges.
    return json({ error: 'could not apply event' }, 500);
  }
}

interface RevenueCatWebhookBody {
  event?: {
    id?: string;
    type?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    environment?: string;
  };
}
