/**
 * Fire-and-forget PostHog capture for subscription lifecycle events.
 *
 * Failures here must never fail the RevenueCat webhook — the entitlement write
 * is the source of truth for access; analytics is best-effort.
 */

const POSTHOG_HOST = 'https://us.i.posthog.com';

/** RevenueCat webhook `event.type` → PostHog event name. Unmapped types are ignored. */
const EVENT_MAP: Record<string, string> = {
  INITIAL_PURCHASE: 'subscription_started',
  RENEWAL: 'subscription_renewed',
  CANCELLATION: 'subscription_cancelled',
  UNCANCELLATION: 'subscription_uncancelled',
  EXPIRATION: 'subscription_expired',
  BILLING_ISSUE: 'subscription_billing_issue',
  PRODUCT_CHANGE: 'subscription_product_changed',
};

export function mapRevenueCatEventType(type: string | undefined): string | null {
  if (!type) return null;
  return EVENT_MAP[type] ?? null;
}

export async function captureSubscriptionEvent(args: {
  apiKey: string | undefined;
  distinctId: string;
  eventType: string | undefined;
  productId?: string;
  store?: string;
  environment?: string;
}): Promise<void> {
  const eventName = mapRevenueCatEventType(args.eventType);
  if (!eventName || !args.apiKey) return;

  try {
    await fetch(`${POSTHOG_HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: args.apiKey,
        event: eventName,
        distinct_id: args.distinctId,
        properties: {
          product_id: args.productId,
          store: args.store,
          environment: args.environment,
          $lib: 'revenuecat-webhook',
        },
      }),
    });
  } catch (error) {
    console.error('PostHog capture failed (non-fatal)', error);
  }
}
