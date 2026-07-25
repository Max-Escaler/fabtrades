import { assert, assertEquals } from 'jsr:@std/assert@1';

import type { EntitlementState } from '../_shared/entitlement.ts';
import type { RevenueCatSubscriber } from '../_shared/entitlement.ts';
import { isAuthorized } from '../_shared/http.ts';
import { handleWebhook } from './handler.ts';
import type { EntitlementStore, WebhookDeps } from './handler.ts';

const SECRET = 'shared-secret';
const USER = '9f1c0b62-0000-4000-8000-000000000001';

/** Records what the handler asked for, so the assertions can be about behaviour. */
class FakeStore implements EntitlementStore {
  readonly events: {
    id: string;
    appUserId: string | null;
    payload: unknown;
  }[] = [];
  readonly saved: { userId: string; state: EntitlementState }[] = [];

  /** Event ids already recorded, standing in for the primary key. */
  readonly seen = new Set<string>();

  failRecording = false;
  failSaving = false;
  failForgetting = false;

  recordEvent(event: { id: string; appUserId: string | null; payload: unknown }) {
    if (this.failRecording) return Promise.reject(new Error('db down'));
    this.events.push(event);
    if (this.seen.has(event.id)) return Promise.resolve(false);
    this.seen.add(event.id);
    return Promise.resolve(true);
  }

  forgetEvent(id: string) {
    if (this.failForgetting) return Promise.reject(new Error('db down'));
    this.seen.delete(id);
    return Promise.resolve();
  }

  saveEntitlement(userId: string, state: EntitlementState) {
    if (this.failSaving) return Promise.reject(new Error('db down'));
    this.saved.push({ userId, state });
    return Promise.resolve();
  }
}

function proSubscriber(): RevenueCatSubscriber {
  return {
    original_app_user_id: USER,
    entitlements: {
      'FABTrades Pro': {
        expires_date: '2099-01-01T00:00:00Z',
        product_identifier: 'monthly',
      },
    },
    subscriptions: {
      monthly: { expires_date: '2099-01-01T00:00:00Z', store: 'app_store' },
    },
  };
}

function deps(overrides: Partial<WebhookDeps> = {}): WebhookDeps & {
  store: FakeStore;
  calls: { appUserId: string; includeSandbox: boolean }[];
} {
  const store = (overrides.store as FakeStore) ?? new FakeStore();
  const calls: { appUserId: string; includeSandbox: boolean }[] = [];
  return {
    secret: SECRET,
    apiKey: 'sk_test',
    entitlementId: 'FABTrades Pro',
    store,
    fetchSubscriber: (appUserId, _apiKey, includeSandbox) => {
      calls.push({ appUserId, includeSandbox });
      return Promise.resolve(proSubscriber());
    },
    ...overrides,
    calls,
  } as WebhookDeps & {
    store: FakeStore;
    calls: { appUserId: string; includeSandbox: boolean }[];
  };
}

function post(
  body: unknown,
  { secret = SECRET, method = 'POST' }: { secret?: string; method?: string } = {},
): Request {
  return new Request('https://example.test/revenuecat-webhook', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      id: 'evt_1',
      type: 'INITIAL_PURCHASE',
      app_user_id: USER,
      environment: 'PRODUCTION',
      ...overrides,
    },
  };
}

Deno.test('a purchase becomes an entitlement row', async () => {
  const d = deps();

  const response = await handleWebhook(post(event()), d);

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { ok: true, tier: 'pro' });
  assertEquals(d.store.saved.length, 1);
  assertEquals(d.store.saved[0].userId, USER);
  assertEquals(d.store.saved[0].state.tier, 'pro');
});

Deno.test('the raw event is recorded before anything is derived from it', async () => {
  const d = deps();

  await handleWebhook(post(event()), d);

  // Recording first is what makes a retry safe, so the ordering is the guarantee.
  assertEquals(d.store.events, [{
    id: 'evt_1',
    appUserId: USER,
    payload: event(),
  }]);
});

Deno.test('a wrong secret is rejected without touching anything', async () => {
  const d = deps();

  const response = await handleWebhook(post(event(), { secret: 'nope' }), d);

  assertEquals(response.status, 401);
  assertEquals(d.store.events.length, 0);
  assertEquals(d.calls.length, 0);
});

Deno.test('a missing Authorization header is rejected', async () => {
  const d = deps();

  const response = await handleWebhook(post(event(), { secret: '' }), d);

  assertEquals(response.status, 401);
  assertEquals(d.store.events.length, 0);
});

Deno.test('a GET is rejected before the secret is even compared', async () => {
  const d = deps();

  const response = await handleWebhook(post(null, { method: 'GET' }), d);

  assertEquals(response.status, 405);
});

Deno.test('a replayed event is acknowledged without re-applying it', async () => {
  const d = deps();

  const first = await handleWebhook(post(event()), d);
  const second = await handleWebhook(post(event()), d);

  assertEquals(first.status, 200);
  assertEquals(second.status, 200);
  assertEquals(await second.json(), { ok: true, replay: true });
  // The important part is the absent second call: a redelivery burst must not turn
  // into a burst of RevenueCat requests.
  assertEquals(d.calls.length, 1);
  assertEquals(d.store.saved.length, 1);
});

Deno.test('two different events are both applied', async () => {
  const d = deps();

  await handleWebhook(post(event({ id: 'evt_1' })), d);
  await handleWebhook(post(event({ id: 'evt_2', type: 'RENEWAL' })), d);

  assertEquals(d.store.saved.length, 2);
});

Deno.test('an unparseable body is refused rather than retried', async () => {
  const d = deps();
  const request = new Request('https://example.test/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}` },
    body: 'not json',
  });

  const response = await handleWebhook(request, d);

  // 4xx, not 5xx: this payload will never parse, so retrying it for days is worse
  // than dropping it.
  assertEquals(response.status, 400);
  assertEquals(d.store.events.length, 0);
});

Deno.test('an event with no id is refused', async () => {
  const d = deps();

  const response = await handleWebhook(post({ event: { type: 'TEST' } }), d);

  assertEquals(response.status, 400);
  assertEquals(d.store.events.length, 0);
});

Deno.test('an anonymous app_user_id is recorded but grants nothing', async () => {
  const d = deps();

  const response = await handleWebhook(
    post(event({ app_user_id: '$RCAnonymousID:8e9f2c1a' })),
    d,
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    ok: true,
    ignored: 'unknown app_user_id',
  });
  // Kept for investigation, with no user attached.
  assertEquals(d.store.events[0].appUserId, null);
  assertEquals(d.store.saved.length, 0);
  assertEquals(d.calls.length, 0);
});

Deno.test('an aliased purchase falls back to the original app_user_id', async () => {
  const d = deps();

  await handleWebhook(
    post(event({
      app_user_id: '$RCAnonymousID:8e9f2c1a',
      original_app_user_id: USER,
    })),
    d,
  );

  // Somebody who bought before signing in and was later aliased still gets access.
  assertEquals(d.store.saved.length, 1);
  assertEquals(d.store.saved[0].userId, USER);
});

Deno.test('a sandbox event asks RevenueCat to include sandbox data', async () => {
  const d = deps();

  await handleWebhook(post(event({ environment: 'SANDBOX' })), d);

  // Without this the lookup resolves to "no purchase", and the resulting no-op is
  // near impossible to read as a sandbox-only problem.
  assertEquals(d.calls[0].includeSandbox, true);
});

Deno.test('a production event does not ask for sandbox data', async () => {
  const d = deps();

  await handleWebhook(post(event()), d);

  assertEquals(d.calls[0].includeSandbox, false);
});

Deno.test('a failure to record the event asks for a retry', async () => {
  const store = new FakeStore();
  store.failRecording = true;
  const d = deps({ store });

  const response = await handleWebhook(post(event()), d);

  assertEquals(response.status, 500);
  assertEquals(d.calls.length, 0);
});

Deno.test('a RevenueCat outage asks for a retry', async () => {
  const d = deps({
    fetchSubscriber: () => Promise.reject(new Error('502 from RevenueCat')),
  });

  const response = await handleWebhook(post(event()), d);

  assertEquals(response.status, 500);
});

Deno.test('a failed write asks for a retry, which then converges', async () => {
  const store = new FakeStore();
  store.failSaving = true;
  const d = deps({ store });

  const failed = await handleWebhook(post(event()), d);
  assertEquals(failed.status, 500);

  // The retry must do the work rather than short-circuit as a replay: a purchase
  // that never landed leaves no row for the nightly reconciliation to repair, so
  // this retry is the only thing standing between a paying customer and `free`.
  store.failSaving = false;
  const retried = await handleWebhook(post(event()), d);

  assertEquals(await retried.json(), { ok: true, tier: 'pro' });
  assertEquals(store.saved.length, 1);
});

Deno.test('a RevenueCat outage releases the event so the retry applies it', async () => {
  const store = new FakeStore();
  let attempts = 0;
  const d = deps({
    store,
    fetchSubscriber: () => {
      attempts++;
      if (attempts === 1) return Promise.reject(new Error('502'));
      return Promise.resolve(proSubscriber());
    },
  });

  assertEquals((await handleWebhook(post(event()), d)).status, 500);
  assertEquals((await handleWebhook(post(event()), d)).status, 200);

  assertEquals(store.saved.length, 1);
});

Deno.test('an un-record that also fails still reports the original failure', async () => {
  const store = new FakeStore();
  store.failSaving = true;
  store.failForgetting = true;
  const d = deps({ store });

  const response = await handleWebhook(post(event()), d);

  // Nothing left to try, but the response must still be the one that triggers a
  // retry rather than an exception escaping the handler.
  assertEquals(response.status, 500);
  assertEquals(await response.json(), { error: 'could not apply event' });
});

Deno.test('isAuthorized accepts the secret with or without a Bearer prefix', () => {
  assertEquals(isAuthorized(`Bearer ${SECRET}`, SECRET), true);
  assertEquals(isAuthorized(SECRET, SECRET), true);
  assertEquals(isAuthorized(`bearer ${SECRET}`, SECRET), true);
});

Deno.test('isAuthorized rejects near misses and empty configuration', () => {
  assertEquals(isAuthorized(`Bearer ${SECRET}x`, SECRET), false);
  assertEquals(isAuthorized('Bearer shared-secreT', SECRET), false);
  assertEquals(isAuthorized(null, SECRET), false);
  assertEquals(isAuthorized('', SECRET), false);
  // An unset secret must never authorize, or a misconfigured deploy is wide open.
  assertEquals(isAuthorized('Bearer ', ''), false);
  assertEquals(isAuthorized('', ''), false);
});

Deno.test('an expired subscriber downgrades the row to free', async () => {
  const d = deps({
    fetchSubscriber: () =>
      Promise.resolve({
        original_app_user_id: USER,
        entitlements: {},
        subscriptions: {
          monthly: {
            expires_date: '2020-01-01T00:00:00Z',
            store: 'play_store',
          },
        },
      }),
  });

  const response = await handleWebhook(post(event({ type: 'EXPIRATION' })), d);

  assertEquals(response.status, 200);
  assert(d.store.saved.length === 1);
  assertEquals(d.store.saved[0].state.tier, 'free');
  assertEquals(d.store.saved[0].state.is_active, false);
});
