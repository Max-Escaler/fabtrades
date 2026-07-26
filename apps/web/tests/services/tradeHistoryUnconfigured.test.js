// A build that never got Supabase credentials (a preview deploy, a fork, a
// misconfigured environment) leaves `supabase` null. Every entry point has to
// degrade to a plain "not configured" error instead of throwing on a null
// client — otherwise the page white-screens rather than telling the customer
// their session cannot be reached.
jest.mock('../../src/lib/supabase.js', () => ({ supabase: null }));

import {
  saveTradeToHistory,
  getUserTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
} from '../../src/services/tradeHistory.js';

const totals = { haveTotal: 0, wantTotal: 0, diff: 0 };

describe('tradeHistory with Supabase unconfigured', () => {
  test('saveTradeToHistory reports the missing configuration', async () => {
    const { data, error, trimmed } = await saveTradeToHistory('My Trade', [], [], totals);

    expect(data).toBeNull();
    expect(trimmed).toBe(0);
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('getUserTrades reports the missing configuration', async () => {
    const { data, error } = await getUserTrades();

    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('getTradeById reports the missing configuration', async () => {
    const { data, error } = await getTradeById('xyz');

    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('updateTrade reports the missing configuration', async () => {
    const { data, error } = await updateTrade('xyz', { name: 'New' });

    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('deleteTrade reports the missing configuration', async () => {
    const { data, error } = await deleteTrade('xyz');

    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });
});
