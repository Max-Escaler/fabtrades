import { assertEquals } from 'jsr:@std/assert@1';

import { FREE } from '../_shared/entitlement.ts';
import type { EntitlementState, RevenueCatSubscriber } from '../_shared/entitlement.ts';
import { differs, reconcile, TRACKED_COLUMNS } from './reconcile.ts';
import type { EntitlementRow } from './reconcile.ts';

const ENTITLEMENT = 'FABTrades Pro';
const NOW = new Date('2026-06-15T12:00:00Z');
const USER = '9f1c0b62-0000-4000-8000-000000000001';
const OTHER = '9f1c0b62-0000-4000-8000-000000000002';

/** A row that agrees with `proSubscriber()`, so nothing should be written. */
function proRow(overrides: Partial<EntitlementRow> = {}): EntitlementRow {
  return {
    user_id: USER,
    tier: 'pro',
    is_active: true,
    is_trialing: false,
    in_grace_period: false,
    source: 'app_store',
    product_id: 'monthly',
    expires_at: '2026-06-20T12:00:00Z',
    is_sandbox: false,
    rc_customer_id: USER,
    ...overrides,
  };
}

function proSubscriber(
  { expiresDate = '2026-06-20T12:00:00Z', user = USER } = {},
): RevenueCatSubscriber {
  return {
    original_app_user_id: user,
    entitlements: {
      [ENTITLEMENT]: {
        expires_date: expiresDate,
        product_identifier: 'monthly',
      },
    },
    subscriptions: {
      monthly: { expires_date: expiresDate, store: 'app_store' },
    },
  };
}

function harness({
  due = [proRow()],
  subscribers = {} as Record<string, RevenueCatSubscriber | null>,
  fail = new Set<string>(),
}: {
  due?: EntitlementRow[];
  subscribers?: Record<string, RevenueCatSubscriber | null>;
  fail?: Set<string>;
} = {}) {
  const saved: { userId: string; state: EntitlementState }[] = [];
  const fetched: string[] = [];
  const windows: { from: string; to: string }[] = [];

  return {
    saved,
    fetched,
    windows,
    run: () =>
      reconcile({
        entitlementId: ENTITLEMENT,
        now: NOW,
        listDue: (from, to) => {
          windows.push({ from, to });
          return Promise.resolve(due);
        },
        fetchSubscriber: (appUserId) => {
          fetched.push(appUserId);
          if (fail.has(appUserId)) {
            return Promise.reject(new Error('RevenueCat is down'));
          }
          // `in` rather than `??`, so an explicit null means "RevenueCat has no
          // such customer" instead of falling through to the default.
          return Promise.resolve(
            appUserId in subscribers
              ? subscribers[appUserId]
              : proSubscriber({ user: appUserId }),
          );
        },
        saveEntitlement: (userId, state) => {
          if (fail.has(`save:${userId}`)) {
            return Promise.reject(new Error('db down'));
          }
          saved.push({ userId, state });
          return Promise.resolve();
        },
      }),
  };
}

Deno.test('an unchanged row is checked but not rewritten', async () => {
  const h = harness();

  const result = await h.run();

  // Leaving `updated_at` alone is the point: it should mean "when this last
  // changed", not "when the job last ran".
  assertEquals(result, { checked: 1, changed: 0, failed: [] });
  assertEquals(h.saved.length, 0);
});

Deno.test('a lapsed subscription is downgraded to free', async () => {
  const h = harness({
    due: [proRow({ expires_at: '2026-06-14T12:00:00Z' })],
    subscribers: { [USER]: proSubscriber({ expiresDate: '2026-06-14T12:00:00Z' }) },
  });

  const result = await h.run();

  // Nothing fires when a subscription simply lapses, so this sweep is the only
  // thing that ever notices.
  assertEquals(result.changed, 1);
  assertEquals(h.saved[0].state.tier, 'free');
  assertEquals(h.saved[0].state.is_active, false);
});

Deno.test('a renewal that moves only the expiry is still written', async () => {
  const h = harness({
    subscribers: { [USER]: proSubscriber({ expiresDate: '2026-07-20T12:00:00Z' }) },
  });

  const result = await h.run();

  // Comparing tiers alone would skip this forever: the row would stay in tonight's
  // window and be skipped again every night after.
  assertEquals(result.changed, 1);
  assertEquals(h.saved[0].state.expires_at, '2026-07-20T12:00:00Z');
});

Deno.test('a customer RevenueCat no longer knows is downgraded', async () => {
  const h = harness({ subscribers: { [USER]: null } });

  const result = await h.run();

  assertEquals(result.changed, 1);
  assertEquals(h.saved[0].state.tier, 'free');
});

Deno.test('one failing customer does not abandon the rest', async () => {
  const h = harness({
    due: [proRow(), proRow({ user_id: OTHER, expires_at: '2026-06-14T12:00:00Z' })],
    subscribers: {
      [OTHER]: proSubscriber({ expiresDate: '2026-06-14T12:00:00Z', user: OTHER }),
    },
    fail: new Set([USER]),
  });

  const result = await h.run();

  assertEquals(result.checked, 2);
  assertEquals(result.changed, 1);
  assertEquals(result.failed, [USER]);
  assertEquals(h.saved[0].userId, OTHER);
});

Deno.test('a failed write is reported without stopping the sweep', async () => {
  const h = harness({
    due: [proRow({ expires_at: '2026-06-14T12:00:00Z' }), proRow({ user_id: OTHER })],
    subscribers: { [USER]: proSubscriber({ expiresDate: '2026-06-14T12:00:00Z' }) },
    fail: new Set([`save:${USER}`]),
  });

  const result = await h.run();

  assertEquals(result.failed, [USER]);
  assertEquals(result.checked, 2);
});

Deno.test('nothing due is a successful no-op', async () => {
  const h = harness({ due: [] });

  assertEquals(await h.run(), { checked: 0, changed: 0, failed: [] });
  assertEquals(h.fetched.length, 0);
});

Deno.test('the window reaches back a week and ahead a day and a half', async () => {
  const h = harness();

  await h.run();

  // Back far enough to cover a late renewal or a retried card, forward far enough
  // that tomorrow's renewal is seen as a renewal rather than a lapse.
  assertEquals(h.windows[0].from, '2026-06-08T12:00:00.000Z');
  assertEquals(h.windows[0].to, '2026-06-17T00:00:00.000Z');
});

Deno.test('differs ignores how each side spells a timestamp', () => {
  const state: EntitlementState = {
    ...FREE,
    tier: 'pro',
    is_active: true,
    source: 'app_store',
    product_id: 'monthly',
    expires_at: '2026-06-20T12:00:00Z',
    rc_customer_id: USER,
  };

  // Postgres returns an offset where RevenueCat sent a Z. Treating those as
  // different would rewrite every row on every run.
  assertEquals(
    differs(proRow({ expires_at: '2026-06-20T12:00:00+00:00' }), state),
    false,
  );
  assertEquals(differs(proRow({ expires_at: null }), state), true);
});

Deno.test('differs notices a change in any derived column', () => {
  const state: EntitlementState = {
    ...FREE,
    tier: 'pro',
    is_active: true,
    source: 'app_store',
    product_id: 'monthly',
    expires_at: '2026-06-20T12:00:00Z',
    rc_customer_id: USER,
  };

  assertEquals(differs(proRow(), state), false);
  assertEquals(differs(proRow({ is_trialing: true }), state), true);
  assertEquals(differs(proRow({ in_grace_period: true }), state), true);
  assertEquals(differs(proRow({ source: 'play_store' }), state), true);
  assertEquals(differs(proRow({ product_id: 'annual' }), state), true);
  assertEquals(differs(proRow({ is_sandbox: true }), state), true);
  assertEquals(differs(proRow({ rc_customer_id: null }), state), true);
});

Deno.test('a column missing from the row counts as a change', () => {
  const state: EntitlementState = { ...FREE, rc_customer_id: USER };
  const partial = { user_id: USER } as EntitlementRow;

  // A row selected without every tracked column must not read as up to date, or
  // that column would quietly stop being reconciled.
  assertEquals(differs(partial, state), true);
});

Deno.test('the select list covers every column the mapping derives', () => {
  for (const column of Object.keys(FREE)) {
    assertEquals(
      TRACKED_COLUMNS.split(', ').includes(column),
      true,
      `${column} is missing from the select list`,
    );
  }
  assertEquals(TRACKED_COLUMNS.startsWith('user_id, '), true);
});
