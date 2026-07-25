/**
 * Turning a RevenueCat customer into a row in `public.entitlements`.
 *
 * Kept separate from the webhook and free of I/O because this is where the
 * judgement calls live — whether a grace period counts as access, what a refund
 * looks like after the fact, which of several stores to credit — and those are worth
 * testing directly rather than through an HTTP handler.
 */

/** The subset of RevenueCat's `subscriber` object this maps from. */
export interface RevenueCatSubscriber {
  original_app_user_id?: string;
  /** Every entitlement the customer has ever had, including expired ones. */
  entitlements?: Record<string, RevenueCatEntitlement>;
  subscriptions?: Record<string, RevenueCatSubscription>;
  non_subscriptions?: Record<string, unknown[]>;
}

export interface RevenueCatEntitlement {
  /** null means it never expires — a lifetime unlock. */
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string;
  purchase_date?: string | null;
}

export interface RevenueCatSubscription {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  /** `normal`, `trial`, or `intro`. */
  period_type?: string | null;
  /** `app_store`, `play_store`, `stripe`, `promotional`, `amazon`, `rc_billing`. */
  store?: string | null;
  billing_issues_detected_at?: string | null;
  refunded_at?: string | null;
  unsubscribe_detected_at?: string | null;
  is_sandbox?: boolean;
}

/** A row of `public.entitlements`, minus `user_id`. */
export interface EntitlementState {
  tier: 'free' | 'pro';
  is_active: boolean;
  is_trialing: boolean;
  in_grace_period: boolean;
  source: 'app_store' | 'play_store' | 'stripe' | 'promo' | null;
  product_id: string | null;
  expires_at: string | null;
  is_sandbox: boolean;
  rc_customer_id: string | null;
}

/** No entitlement at all: never bought, refunded, or long expired. */
export const FREE: EntitlementState = {
  tier: 'free',
  is_active: false,
  is_trialing: false,
  in_grace_period: false,
  source: null,
  product_id: null,
  expires_at: null,
  is_sandbox: false,
  rc_customer_id: null,
};

/**
 * Reads a customer's current access to `entitlementId`.
 *
 * @param subscriber RevenueCat's `subscriber` object.
 * @param entitlementId The entitlement identifier, e.g. `FABTrades Pro`.
 * @param now Evaluation time; injected so expiry boundaries are testable.
 */
export function readEntitlement(
  subscriber: RevenueCatSubscriber | null | undefined,
  entitlementId: string,
  now: Date = new Date(),
): EntitlementState {
  const rcCustomerId = subscriber?.original_app_user_id ?? null;
  const entitlement = subscriber?.entitlements?.[entitlementId];
  if (!entitlement) return { ...FREE, rc_customer_id: rcCustomerId };

  const productId = entitlement.product_identifier ?? null;
  const subscription = productId ? subscriber?.subscriptions?.[productId] : undefined;

  const expiresAt = parseDate(entitlement.expires_date);
  const graceUntil = parseDate(
    entitlement.grace_period_expires_date ??
      subscription?.grace_period_expires_date,
  );

  // A refund is not an expiry and does not always shorten `expires_date`; it
  // arrives as its own timestamp, and reaching for the dates alone would leave a
  // refunded customer with access until their original period ran out.
  const refundedAt = parseDate(subscription?.refunded_at);
  const refunded = refundedAt !== null && refundedAt <= now;

  // No expiry date means a lifetime unlock, which is how promotional and
  // non-consumable grants arrive. Absence is permanence, not the opposite.
  const withinTerm = expiresAt === null || expiresAt > now;
  const withinGrace = graceUntil !== null && graceUntil > now;
  const isActive = !refunded && (withinTerm || withinGrace);

  if (!isActive) {
    return {
      ...FREE,
      // Kept even when inactive: "expired last week" is a different support
      // conversation from "never subscribed", and the paywall can say so.
      product_id: productId,
      expires_at: entitlement.expires_date ?? null,
      is_sandbox: subscription?.is_sandbox === true,
      rc_customer_id: rcCustomerId,
    };
  }

  return {
    tier: 'pro',
    is_active: true,
    is_trialing: subscription?.period_type === 'trial',
    // Only a grace period keeps access alive past the paid term. A billing problem
    // detected mid-term is a warning, not yet a grace period.
    in_grace_period: !withinTerm && withinGrace,
    source: mapStore(subscription?.store),
    product_id: productId,
    expires_at: entitlement.expires_date ?? null,
    is_sandbox: subscription?.is_sandbox === true,
    rc_customer_id: rcCustomerId,
  };
}

/**
 * RevenueCat's store name as the `source` check constraint spells it.
 *
 * Unknown stores map to null rather than being passed through, because the column
 * constrains its values and a rejected upsert would lose a real entitlement over a
 * label. Amazon and RevenueCat Web Billing land here today.
 */
function mapStore(store: string | null | undefined): EntitlementState['source'] {
  switch (store) {
    case 'app_store':
    case 'mac_app_store':
      return 'app_store';
    case 'play_store':
      return 'play_store';
    case 'stripe':
    case 'rc_billing':
      return 'stripe';
    case 'promotional':
      return 'promo';
    default:
      return null;
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at;
}

/**
 * The Supabase user an event belongs to, or null when it does not name one.
 *
 * RevenueCat's `app_user_id` is whatever the client called `logIn` with. Ours is
 * always a Supabase UUID, but anything can arrive: an anonymous `$RCAnonymousID:…`
 * from before sign-in, or an id from a deleted account. Those events are recorded
 * and then ignored, since there is no row to write.
 */
export function asSupabaseUserId(appUserId: unknown): string | null {
  if (typeof appUserId !== 'string') return null;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuid.test(appUserId) ? appUserId.toLowerCase() : null;
}
