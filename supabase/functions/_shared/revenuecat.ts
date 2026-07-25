/**
 * The one RevenueCat call this project makes: read a customer's current state.
 *
 * Deliberately not derived from webhook payloads. Events arrive out of order and
 * describe transitions, so the only way to hold a correct current state is to ask
 * for it. See the note in `entitlement.ts`.
 */

import type { RevenueCatSubscriber } from './entitlement.ts';

const API_BASE = 'https://api.revenuecat.com/v1';

export class RevenueCatError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'RevenueCatError';
  }
}

/**
 * Fetches `GET /subscribers/{app_user_id}`.
 *
 * @param appUserId The id the client called `Purchases.logIn` with.
 * @param apiKey A RevenueCat **secret** key (`sk_…`). The publishable key
 *   returns nothing useful here.
 * @param includeSandbox Whether to include sandbox and StoreKit-test transactions.
 *   RevenueCat omits them unless asked, which makes a sandbox purchase look like no
 *   purchase at all — a genuinely confusing way to lose an afternoon.
 * @returns The `subscriber` object, or null if there is none.
 *
 * This endpoint is get-*or-create*: RevenueCat returns a subscriber with empty
 * entitlements rather than a 404 for an id it has not seen, so in practice the null
 * case does not arise. Both read as `FREE`, which is the same answer either way.
 */
export async function fetchSubscriber(
  appUserId: string,
  apiKey: string,
  includeSandbox = false,
): Promise<RevenueCatSubscriber | null> {
  const response = await fetch(
    `${API_BASE}/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(includeSandbox ? { 'X-Is-Sandbox': 'true' } : {}),
      },
    },
  );

  // A customer RevenueCat does not know is not an error: it is somebody who has
  // never purchased, which is the common case.
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new RevenueCatError(
      response.status,
      `RevenueCat GET /subscribers failed: ${response.status} ${await response
        .text()
        .catch(() => '')}`,
    );
  }

  const body = await response.json();
  return (body?.subscriber ?? null) as RevenueCatSubscriber | null;
}
