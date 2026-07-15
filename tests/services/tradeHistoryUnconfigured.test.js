// Verifies the graceful-degradation path added in
// "Fix: Handle missing Supabase credentials gracefully": when Supabase is not
// configured (`supabase` export is null), every trade-history call must return
// a friendly "not configured" error instead of throwing on a null reference.
jest.mock('../../src/lib/supabase.js', () => ({ supabase: null }));

import {
  saveTradeToHistory,
  getUserTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
} from '../../src/services/tradeHistory.js';

const totals = { haveTotal: 0, wantTotal: 0, diff: 0 };

describe('tradeHistory with Supabase not configured', () => {
  test('saveTradeToHistory reports the auth-not-configured error', async () => {
    const { data, error } = await saveTradeToHistory('Trade', [], [], totals);
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('getUserTrades reports the auth-not-configured error', async () => {
    const { data, error } = await getUserTrades();
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('getTradeById reports the auth-not-configured error', async () => {
    const { data, error } = await getTradeById('id-1');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('updateTrade reports the auth-not-configured error', async () => {
    const { data, error } = await updateTrade('id-1', { name: 'x' });
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('deleteTrade reports the auth-not-configured error', async () => {
    const { data, error } = await deleteTrade('id-1');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });
});
