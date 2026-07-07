// Mock the Supabase boundary so we never touch `import.meta.env` / the network.
jest.mock('../../src/lib/supabase.js', () => {
  const auth = { getUser: jest.fn() };
  const supabase = { auth, from: jest.fn() };
  return { supabase };
});

import { supabase } from '../../src/lib/supabase.js';
import {
  saveTradeToHistory,
  getUserTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
} from '../../src/services/tradeHistory.js';

// Builds a chainable query object where every method returns the chain and
// awaiting the chain resolves to `result` (mirrors the supabase-js builder).
const makeChain = (result) => {
  const chain = {
    then: (resolve) => resolve(result),
  };
  for (const method of ['insert', 'select', 'single', 'eq', 'order', 'update', 'delete']) {
    chain[method] = jest.fn(() => chain);
  }
  return chain;
};

const asUser = (id = 'user-1') =>
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id } } });
const asAnonymous = () =>
  supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

const totals = { haveTotal: 30, wantTotal: 20, diff: 10 };

describe('saveTradeToHistory', () => {
  test('errors when the user is not logged in', async () => {
    asAnonymous();
    const { data, error } = await saveTradeToHistory('My Trade', [], [], totals);
    expect(data).toBeNull();
    expect(error.message).toMatch(/logged in/i);
  });

  test('errors when the trade name is blank', async () => {
    asUser();
    const { data, error } = await saveTradeToHistory('   ', [], [], totals);
    expect(data).toBeNull();
    expect(error.message).toMatch(/name is required/i);
  });

  test('inserts the trade and returns saved data on success', async () => {
    asUser('user-42');
    const saved = { id: 't1', name: 'My Trade' };
    const chain = makeChain({ data: saved, error: null });
    supabase.from.mockReturnValue(chain);

    const { data, error } = await saveTradeToHistory('My Trade', [{ x: 1 }], [], totals);

    expect(error).toBeNull();
    expect(data).toEqual(saved);
    expect(supabase.from).toHaveBeenCalledWith('trades');
    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-42',
        name: 'My Trade',
        have_total: 30,
        want_total: 20,
        diff: 10,
      }),
    ]);
  });

  test('propagates a database error', async () => {
    asUser();
    supabase.from.mockReturnValue(makeChain({ data: null, error: { message: 'boom' } }));
    const { data, error } = await saveTradeToHistory('My Trade', [], [], totals);
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'boom' });
  });
});

describe('getUserTrades', () => {
  test('errors when not authenticated', async () => {
    asAnonymous();
    const { data, error } = await getUserTrades();
    expect(data).toBeNull();
    expect(error.message).toMatch(/logged in/i);
  });

  test('returns the list of trades scoped to the user', async () => {
    asUser('user-9');
    const trades = [{ id: 'a' }, { id: 'b' }];
    const chain = makeChain({ data: trades, error: null });
    supabase.from.mockReturnValue(chain);

    const { data, error } = await getUserTrades();

    expect(error).toBeNull();
    expect(data).toEqual(trades);
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-9');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  test('propagates a database error', async () => {
    asUser();
    supabase.from.mockReturnValue(makeChain({ data: null, error: { message: 'db down' } }));
    const { data, error } = await getUserTrades();
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'db down' });
  });
});

describe('getTradeById', () => {
  test('errors when not authenticated', async () => {
    asAnonymous();
    const { data, error } = await getTradeById('xyz');
    expect(data).toBeNull();
    expect(error.message).toMatch(/logged in/i);
  });

  test('fetches a single trade by id and user', async () => {
    asUser('user-3');
    const chain = makeChain({ data: { id: 'xyz' }, error: null });
    supabase.from.mockReturnValue(chain);

    const { data } = await getTradeById('xyz');

    expect(data).toEqual({ id: 'xyz' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'xyz');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-3');
  });

  test('propagates a database error', async () => {
    asUser();
    supabase.from.mockReturnValue(makeChain({ data: null, error: { message: 'not found' } }));
    const { data, error } = await getTradeById('missing');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'not found' });
  });
});

describe('updateTrade', () => {
  test('errors when not authenticated', async () => {
    asAnonymous();
    const { data, error } = await updateTrade('u1', { name: 'New' });
    expect(data).toBeNull();
    expect(error.message).toMatch(/logged in/i);
  });

  test('applies updates and stamps updated_at', async () => {
    asUser();
    const chain = makeChain({ data: { id: 'u1', name: 'New' }, error: null });
    supabase.from.mockReturnValue(chain);

    const { data, error } = await updateTrade('u1', { name: 'New' });

    expect(error).toBeNull();
    expect(data).toEqual({ id: 'u1', name: 'New' });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New', updated_at: expect.any(String) })
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'u1');
  });

  test('propagates a database error', async () => {
    asUser();
    supabase.from.mockReturnValue(makeChain({ data: null, error: { message: 'conflict' } }));
    const { data, error } = await updateTrade('u1', { name: 'New' });
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'conflict' });
  });
});

describe('deleteTrade', () => {
  test('errors when not authenticated', async () => {
    asAnonymous();
    const { data, error } = await deleteTrade('d1');
    expect(data).toBeNull();
    expect(error.message).toMatch(/logged in/i);
  });

  test('deletes the trade and reports success', async () => {
    asUser('user-7');
    const chain = makeChain({ error: null });
    supabase.from.mockReturnValue(chain);

    const { data, error } = await deleteTrade('d1');

    expect(error).toBeNull();
    expect(data).toEqual({ success: true });
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'd1');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-7');
  });

  test('returns the error when deletion fails', async () => {
    asUser();
    supabase.from.mockReturnValue(makeChain({ error: { message: 'nope' } }));
    const { data, error } = await deleteTrade('d1');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'nope' });
  });
});
