// Exercises the "Supabase not configured" branch of every trade-history
// operation. The `code review` refactor routed all five functions through a
// shared `requireAuthenticatedUser` helper whose first guard returns an
// "Authentication not configured" error when the client is null. That guard
// has no coverage in the happy-path suite (which mocks a truthy client), yet
// it protects every call from throwing on a mis-configured deployment. This
// lives in its own file so `supabase` can be mocked as null module-wide.
jest.mock('../../src/lib/supabase.js', () => ({ supabase: null }));

import {
  saveTradeToHistory,
  getUserTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
} from '../../src/services/tradeHistory.js';

const totals = { haveTotal: 0, wantTotal: 0, diff: 0 };

describe('trade history with Supabase unconfigured', () => {
  const expectNotConfigured = ({ data, error }) => {
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  };

  test('saveTradeToHistory reports the client is not configured', async () => {
    expectNotConfigured(await saveTradeToHistory('My Trade', [], [], totals));
  });

  test('getUserTrades reports the client is not configured', async () => {
    expectNotConfigured(await getUserTrades());
  });

  test('getTradeById reports the client is not configured', async () => {
    expectNotConfigured(await getTradeById('some-id'));
  });

  test('updateTrade reports the client is not configured', async () => {
    expectNotConfigured(await updateTrade('some-id', { name: 'New' }));
  });

  test('deleteTrade reports the client is not configured', async () => {
    expectNotConfigured(await deleteTrade('some-id'));
  });
});
