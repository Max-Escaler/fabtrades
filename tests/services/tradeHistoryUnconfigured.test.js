// When Supabase env vars are absent, `src/lib/supabase.js` exports `null`.
// Every tradeHistory function must fail closed with a clear "not configured"
// error instead of dereferencing a null client and throwing.
jest.mock('../../src/lib/supabase.js', () => ({ supabase: null }));

import {
  saveTradeToHistory,
  getUserTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
} from '../../src/services/tradeHistory.js';

const totals = { haveTotal: 0, wantTotal: 0, diff: 0 };

describe('tradeHistory when Supabase is not configured', () => {
  test('saveTradeToHistory returns a not-configured error', async () => {
    const { data, error } = await saveTradeToHistory('Trade', [], [], totals);
    expect(data).toBeNull();
    expect(error.message).toMatch(/not configured/i);
  });

  test('getUserTrades returns a not-configured error', async () => {
    const { data, error } = await getUserTrades();
    expect(data).toBeNull();
    expect(error.message).toMatch(/not configured/i);
  });

  test('getTradeById returns a not-configured error', async () => {
    const { data, error } = await getTradeById('id');
    expect(data).toBeNull();
    expect(error.message).toMatch(/not configured/i);
  });

  test('updateTrade returns a not-configured error', async () => {
    const { data, error } = await updateTrade('id', { name: 'x' });
    expect(data).toBeNull();
    expect(error.message).toMatch(/not configured/i);
  });

  test('deleteTrade returns a not-configured error', async () => {
    const { data, error } = await deleteTrade('id');
    expect(data).toBeNull();
    expect(error.message).toMatch(/not configured/i);
  });
});
