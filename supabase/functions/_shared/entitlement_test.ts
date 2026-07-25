import { assertEquals } from 'jsr:@std/assert@1';

import {
  asSupabaseUserId,
  readEntitlement,
  type RevenueCatSubscriber,
} from './entitlement.ts';

const ENTITLEMENT = 'FABTrades Pro';
const NOW = new Date('2026-06-15T12:00:00Z');
const USER = '9f1c0b62-0000-4000-8000-000000000001';

/** A customer with one subscription backing the Pro entitlement. */
function subscriber({
  expiresDate = '2026-07-15T12:00:00Z',
  gracePeriodExpiresDate = null as string | null,
  productId = 'monthly',
  periodType = 'normal' as string | null,
  store = 'app_store' as string | null,
  refundedAt = null as string | null,
  billingIssuesDetectedAt = null as string | null,
  isSandbox = false,
}: Partial<{
  expiresDate: string | null;
  gracePeriodExpiresDate: string | null;
  productId: string;
  periodType: string | null;
  store: string | null;
  refundedAt: string | null;
  billingIssuesDetectedAt: string | null;
  isSandbox: boolean;
}> = {}): RevenueCatSubscriber {
  return {
    original_app_user_id: USER,
    entitlements: {
      [ENTITLEMENT]: {
        expires_date: expiresDate,
        grace_period_expires_date: gracePeriodExpiresDate,
        product_identifier: productId,
        purchase_date: '2026-06-15T12:00:00Z',
      },
    },
    subscriptions: {
      [productId]: {
        expires_date: expiresDate,
        grace_period_expires_date: gracePeriodExpiresDate,
        period_type: periodType,
        store,
        refunded_at: refundedAt,
        billing_issues_detected_at: billingIssuesDetectedAt,
        is_sandbox: isSandbox,
      },
    },
  };
}

Deno.test('a paid subscription grants Pro', () => {
  const state = readEntitlement(subscriber(), ENTITLEMENT, NOW);

  assertEquals(state.tier, 'pro');
  assertEquals(state.is_active, true);
  assertEquals(state.is_trialing, false);
  assertEquals(state.in_grace_period, false);
  assertEquals(state.source, 'app_store');
  assertEquals(state.product_id, 'monthly');
  assertEquals(state.expires_at, '2026-07-15T12:00:00Z');
  assertEquals(state.rc_customer_id, USER);
});

Deno.test('a customer RevenueCat has never seen is free', () => {
  assertEquals(readEntitlement(null, ENTITLEMENT, NOW).tier, 'free');
  assertEquals(readEntitlement({}, ENTITLEMENT, NOW).tier, 'free');
});

Deno.test('an entitlement we do not gate on is ignored', () => {
  const other: RevenueCatSubscriber = {
    entitlements: {
      'Some Other Product': {
        expires_date: '2027-01-01T00:00:00Z',
        product_identifier: 'other',
      },
    },
  };

  assertEquals(readEntitlement(other, ENTITLEMENT, NOW).is_active, false);
});

Deno.test('an expired subscription is free but remembers what lapsed', () => {
  const state = readEntitlement(
    subscriber({ expiresDate: '2026-06-01T12:00:00Z' }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.tier, 'free');
  assertEquals(state.is_active, false);
  // "Expired last week" and "never subscribed" are different conversations.
  assertEquals(state.product_id, 'monthly');
  assertEquals(state.expires_at, '2026-06-01T12:00:00Z');
});

Deno.test('no expiry date means a lifetime unlock', () => {
  // Promotional grants and non-consumables arrive this way. Absence of an expiry is
  // permanence, and reading it as "expired" would revoke access from paying users.
  const state = readEntitlement(
    subscriber({ expiresDate: null, store: 'promotional' }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.is_active, true);
  assertEquals(state.source, 'promo');
  assertEquals(state.expires_at, null);
});

Deno.test('a trial grants Pro and is marked as one', () => {
  const state = readEntitlement(
    subscriber({ periodType: 'trial' }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.tier, 'pro');
  assertEquals(state.is_trialing, true);
});

Deno.test('an intro price is a paid period, not a trial', () => {
  const state = readEntitlement(
    subscriber({ periodType: 'intro' }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.is_active, true);
  assertEquals(state.is_trialing, false);
});

Deno.test('a grace period keeps access after the paid term ends', () => {
  // Somebody whose card failed this morning has not stopped being a subscriber.
  const state = readEntitlement(
    subscriber({
      expiresDate: '2026-06-14T12:00:00Z',
      gracePeriodExpiresDate: '2026-06-30T12:00:00Z',
      billingIssuesDetectedAt: '2026-06-14T12:00:00Z',
    }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.tier, 'pro');
  assertEquals(state.is_active, true);
  assertEquals(state.in_grace_period, true);
});

Deno.test('a billing problem mid-term is not yet a grace period', () => {
  const state = readEntitlement(
    subscriber({
      gracePeriodExpiresDate: '2026-07-30T12:00:00Z',
      billingIssuesDetectedAt: '2026-06-14T12:00:00Z',
    }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.is_active, true);
  assertEquals(state.in_grace_period, false);
});

Deno.test('an elapsed grace period ends access', () => {
  const state = readEntitlement(
    subscriber({
      expiresDate: '2026-06-01T12:00:00Z',
      gracePeriodExpiresDate: '2026-06-08T12:00:00Z',
    }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.tier, 'free');
  assertEquals(state.in_grace_period, false);
});

Deno.test('a refund revokes access before the term is up', () => {
  // The refund is the whole point: `expires_date` still says next month, and reading
  // dates alone would leave a refunded customer with a month of free Pro.
  const state = readEntitlement(
    subscriber({ refundedAt: '2026-06-14T12:00:00Z' }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.tier, 'free');
  assertEquals(state.is_active, false);
});

Deno.test('a refund scheduled in the future does not revoke access yet', () => {
  const state = readEntitlement(
    subscriber({ refundedAt: '2026-06-20T12:00:00Z' }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.is_active, true);
});

Deno.test('expiry is evaluated at the boundary, not around it', () => {
  const exactly = readEntitlement(
    subscriber({ expiresDate: NOW.toISOString() }),
    ENTITLEMENT,
    NOW,
  );
  const aSecondLater = readEntitlement(
    subscriber({ expiresDate: '2026-06-15T12:00:01Z' }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(exactly.is_active, false);
  assertEquals(aSecondLater.is_active, true);
});

Deno.test('each store maps to a source the column accepts', () => {
  const sourceFor = (store: string | null) =>
    readEntitlement(subscriber({ store }), ENTITLEMENT, NOW).source;

  assertEquals(sourceFor('app_store'), 'app_store');
  assertEquals(sourceFor('mac_app_store'), 'app_store');
  assertEquals(sourceFor('play_store'), 'play_store');
  assertEquals(sourceFor('stripe'), 'stripe');
  assertEquals(sourceFor('rc_billing'), 'stripe');
  assertEquals(sourceFor('promotional'), 'promo');
  // An unrecognised store must not be passed through: the check constraint would
  // reject the row and a real entitlement would be lost over a label.
  assertEquals(sourceFor('amazon'), null);
  assertEquals(sourceFor(null), null);
});

Deno.test('a sandbox purchase is flagged as one', () => {
  const state = readEntitlement(
    subscriber({ isSandbox: true }),
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.is_active, true);
  assertEquals(state.is_sandbox, true);
});

Deno.test('an entitlement with no matching subscription still grants access', () => {
  // Promotional grants and non-consumables have no `subscriptions` entry at all.
  const state = readEntitlement(
    {
      original_app_user_id: USER,
      entitlements: {
        [ENTITLEMENT]: {
          expires_date: '2026-07-15T12:00:00Z',
          product_identifier: 'comped',
        },
      },
    },
    ENTITLEMENT,
    NOW,
  );

  assertEquals(state.tier, 'pro');
  assertEquals(state.source, null);
  assertEquals(state.is_trialing, false);
});

Deno.test('a malformed date is treated as no date rather than throwing', () => {
  const state = readEntitlement(
    subscriber({ expiresDate: 'whenever' }),
    ENTITLEMENT,
    NOW,
  );

  // Unparseable reads as no expiry, which grants access. The alternative — a 500
  // from the webhook — would have RevenueCat retrying a payload that cannot succeed.
  assertEquals(state.is_active, true);
});

Deno.test('asSupabaseUserId accepts our ids and nothing else', () => {
  assertEquals(asSupabaseUserId(USER), USER);
  assertEquals(
    asSupabaseUserId('9F1C0B62-0000-4000-8000-000000000001'),
    USER,
    'case is normalised so it matches the stored uuid',
  );

  // RevenueCat's anonymous ids arrive before sign-in and belong to nobody.
  assertEquals(asSupabaseUserId('$RCAnonymousID:8e9f2c1a'), null);
  assertEquals(asSupabaseUserId(''), null);
  assertEquals(asSupabaseUserId(undefined), null);
  assertEquals(asSupabaseUserId(12345), null);
});
