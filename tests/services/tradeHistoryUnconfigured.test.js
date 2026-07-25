// When Supabase env vars are absent, `src/lib/supabase.js` exports a null
// client. Every trade-history call must fail closed with a clear "not
// configured" error instead of throwing on `supabase.auth` / `supabase.from`.
jest.mock('../../src/lib/supabase.js', () => ({ supabase: null }));

import {
  saveTradeToHistory,
  getUserTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
} from '../../src/services/tradeHistory.js';

const totals = { haveTotal: 30, wantTotal: 20, diff: 10 };

describe('tradeHistory with Supabase unconfigured', () => {
  test('saveTradeToHistory reports not configured', async () => {
    const { data, error } = await saveTradeToHistory('My Trade', [], [], totals);
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('getUserTrades reports not configured', async () => {
    const { data, error } = await getUserTrades();
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('getTradeById reports not configured', async () => {
    const { data, error } = await getTradeById('id-1');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('updateTrade reports not configured', async () => {
    const { data, error } = await updateTrade('id-1', { name: 'New' });
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('deleteTrade reports not configured', async () => {
    const { data, error } = await deleteTrade('id-1');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });
});
