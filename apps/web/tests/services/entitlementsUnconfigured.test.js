// With no Supabase client (a preview deploy, a fork, a misconfigured
// environment), the entitlement read cannot happen. It must resolve to the free
// tier and surface the reason rather than throw on a null client — a gate that
// crashes here would take the whole page down instead of just showing free.
jest.mock('../../src/lib/supabase.js', () => ({ supabase: null }));

import { FREE_ENTITLEMENT, fetchEntitlement } from '../../src/services/entitlements.js';

describe('fetchEntitlement with Supabase unconfigured', () => {
  test('falls back to free and names the missing configuration', async () => {
    const { entitlement, error } = await fetchEntitlement('user-1');

    // The frozen free constant, never undefined, so a gate reads a real answer.
    expect(entitlement).toBe(FREE_ENTITLEMENT);
    expect(entitlement.isPro).toBe(false);
    expect(error).toEqual({ message: 'Supabase is not configured' });
  });
});
