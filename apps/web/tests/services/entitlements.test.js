jest.mock('../../src/lib/supabase.js', () => ({
  supabase: { from: jest.fn() },
}));

// Keep free/paid paths testable on the no-paywalls build.
jest.mock('../../src/config/paywall.js', () => ({
  PAYWALLS_REMOVED: false,
}));

import { supabase } from '../../src/lib/supabase.js';
import {
  FREE_ENTITLEMENT,
  entitlementFromRow,
  fetchEntitlement,
} from '../../src/services/entitlements.js';

const mockRow = (result) => {
  const chain = { then: (resolve) => resolve(result) };
  for (const method of ['select', 'eq', 'maybeSingle']) {
    chain[method] = jest.fn(() => chain);
  }
  supabase.from.mockReturnValue(chain);
  return chain;
};

describe('entitlementFromRow', () => {
  test('reads an active subscription', () => {
    const entitlement = entitlementFromRow({
      is_active: true,
      is_trialing: false,
      in_grace_period: false,
      source: 'play_store',
      product_id: 'yearly',
      expires_at: '2027-03-14T00:00:00Z',
      is_sandbox: false,
    });

    expect(entitlement.isPro).toBe(true);
    expect(entitlement.productId).toBe('yearly');
    expect(entitlement.purchasedFrom).toBe('Google Play');
    expect(entitlement.expiresAt).toEqual(new Date('2027-03-14T00:00:00Z'));
  });

  test('treats a missing row as free', () => {
    expect(entitlementFromRow(null)).toBe(FREE_ENTITLEMENT);
    expect(entitlementFromRow(undefined).isPro).toBe(false);
  });

  test('keeps a grace period as Pro, flagged', () => {
    // The webhook leaves `is_active` true through a grace period: somebody whose
    // card failed this morning has not stopped being a subscriber.
    const entitlement = entitlementFromRow({ is_active: true, in_grace_period: true });

    expect(entitlement.isPro).toBe(true);
    expect(entitlement.hasBillingIssue).toBe(true);
  });

  test('withholds Pro from a lapsed row', () => {
    const entitlement = entitlementFromRow({ is_active: false, source: 'app_store' });

    expect(entitlement.isPro).toBe(false);
    // The source survives, so a win-back can say where to resubscribe.
    expect(entitlement.purchasedFrom).toBe('the App Store');
  });

  test('says nothing rather than guessing at an unknown source', () => {
    expect(entitlementFromRow({ is_active: true, source: 'carrier_billing' }).purchasedFrom)
      .toBeNull();
    expect(entitlementFromRow({ is_active: true }).purchasedFrom).toBeNull();
  });

  test('reads a lifetime grant, which has no expiry', () => {
    const entitlement = entitlementFromRow({ is_active: true, source: 'promo' });

    expect(entitlement.isPro).toBe(true);
    expect(entitlement.expiresAt).toBeNull();
    expect(entitlement.purchasedFrom).toBe('a complimentary grant');
  });
});

describe('fetchEntitlement', () => {
  test('queries only this user’s row', async () => {
    const chain = mockRow({ data: { is_active: true }, error: null });

    const { entitlement, error } = await fetchEntitlement('user-1');

    expect(error).toBeNull();
    expect(entitlement.isPro).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('entitlements');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    // `maybeSingle`: no row is the normal state for a free account, not an error.
    expect(chain.maybeSingle).toHaveBeenCalled();
  });

  test('falls back to free when the read fails', async () => {
    mockRow({ data: null, error: { message: 'offline' } });

    const { entitlement, error } = await fetchEntitlement('user-1');

    // Reported, so a caller can retry, but never left undefined for a gate to
    // interpret.
    expect(entitlement).toBe(FREE_ENTITLEMENT);
    expect(error).toEqual({ message: 'offline' });
  });
});
