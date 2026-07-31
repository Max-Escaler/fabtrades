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
import { FreeLimits } from '../../src/utils/freeLimits.js';

// Builds a chainable query object where every method returns the chain and
// awaiting the chain resolves to `result` (mirrors the supabase-js builder).
const makeChain = (result) => {
  const chain = {
    then: (resolve) => resolve(result),
  };
  const methods = ['insert', 'select', 'single', 'maybeSingle', 'eq', 'in', 'is', 'order', 'update', 'delete'];
  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  return chain;
};

/**
 * Routes `supabase.from(table)` to one chain per query, taking results from that
 * table's queue in order. Saving a trade queries `trades` more than once — the
 * insert, then the free-window sweep — so a single shared chain could not give
 * each query its own answer.
 *
 * The last queued result repeats, so a test that does not care about the sweep
 * can queue one value and ignore it. Returns the chains created per table, in
 * order, for assertions.
 */
const mockTables = (queues) => {
  const created = {};
  const remaining = Object.fromEntries(
    Object.entries(queues).map(([table, results]) => [table, [...results]]),
  );

  supabase.from.mockImplementation((table) => {
    const queue = remaining[table];
    if (!queue) throw new Error(`Unexpected query against "${table}"`);
    const result = queue.length > 1 ? queue.shift() : queue[0];
    const chain = makeChain(result);
    (created[table] ??= []).push(chain);
    return chain;
  });

  return created;
};

/** A `trades` table holding `count` rows, none of them tombstoned. */
const existingTrades = (count) => ({
  data: Array.from({ length: count }, (_, i) => ({ id: `old-${i}` })),
  error: null,
});

const asUser = (id = 'user-1') =>
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id } } });
const asAnonymous = () =>
  supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

/** No entitlement row: the normal state for everybody who has not subscribed. */
const asFree = () => [{ data: null, error: null }];
const asPro = () => [{ data: { is_active: true, source: 'app_store' }, error: null }];

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
    const chains = mockTables({
      trades: [{ data: saved, error: null }, existingTrades(1)],
      entitlements: asFree(),
    });

    const { data, error, trimmed } = await saveTradeToHistory('My Trade', [{ x: 1 }], [], totals);

    expect(error).toBeNull();
    expect(data).toEqual(saved);
    expect(trimmed).toBe(0);
    expect(supabase.from).toHaveBeenCalledWith('trades');
    expect(chains.trades[0].insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-42',
        name: 'My Trade',
        have_total: 30,
        want_total: 20,
        diff: 10,
      }),
    ]);
  });

  test('mints a client_id so mobile can address the row', async () => {
    asUser();
    const chains = mockTables({
      trades: [{ data: { id: 't1' }, error: null }, existingTrades(1)],
      entitlements: asFree(),
    });

    await saveTradeToHistory('My Trade', [], [], totals);

    const [[[inserted]]] = chains.trades[0].insert.mock.calls;
    expect(inserted.client_id).toEqual(expect.any(String));
    expect(inserted.client_id).not.toHaveLength(0);
  });

  test('propagates a database error', async () => {
    asUser();
    mockTables({ trades: [{ data: null, error: { message: 'boom' } }], entitlements: asFree() });
    const { data, error } = await saveTradeToHistory('My Trade', [], [], totals);
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'boom' });
  });

  describe('free-tier trade window', () => {
    test('rolls the oldest trades off once the window is full', async () => {
      asUser('user-5');
      // One over the cap after the insert, so exactly one has to go.
      const chains = mockTables({
        trades: [
          { data: { id: 'newest' }, error: null },
          existingTrades(FreeLimits.savedTrades + 1),
          { error: null },
        ],
        entitlements: asFree(),
      });

      const { error, trimmed } = await saveTradeToHistory('My Trade', [], [], totals);

      expect(error).toBeNull();
      expect(trimmed).toBe(1);
      // Tombstoned, not deleted — a hard delete would be invisible to a mobile
      // device that was offline, which would then re-upload the trade.
      const sweep = chains.trades[2];
      expect(sweep.delete).not.toHaveBeenCalled();
      expect(sweep.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String), updated_at: expect.any(String) }),
      );
      // The oldest row, which is last when ordered newest-first.
      expect(sweep.in).toHaveBeenCalledWith('id', [`old-${FreeLimits.savedTrades}`]);
    });

    test('trims a history that arrived overfull back to the window', async () => {
      asUser();
      const chains = mockTables({
        trades: [
          { data: { id: 'newest' }, error: null },
          existingTrades(FreeLimits.savedTrades + 5),
          { error: null },
        ],
        entitlements: asFree(),
      });

      // How a lapsed subscriber's history looks: more rows than the free window,
      // none of which this save created.
      const { trimmed } = await saveTradeToHistory('My Trade', [], [], totals);

      expect(trimmed).toBe(5);
      expect(chains.trades[2].in.mock.calls[0][1]).toHaveLength(5);
    });

    test('leaves a Pro account alone', async () => {
      asUser();
      const chains = mockTables({
        trades: [{ data: { id: 'newest' }, error: null }],
        entitlements: asPro(),
      });

      const { trimmed } = await saveTradeToHistory('My Trade', [], [], totals);

      // Not even a read: an unlimited history has nothing to count.
      expect(trimmed).toBe(0);
      expect(chains.trades).toHaveLength(1);
    });

    test('keeps the trade when the sweep itself fails', async () => {
      asUser();
      mockTables({
        trades: [
          { data: { id: 'newest' }, error: null },
          { data: null, error: { message: 'sweep failed' } },
        ],
        entitlements: asFree(),
      });

      const { data, error, trimmed } = await saveTradeToHistory('My Trade', [], [], totals);

      // The trade is already saved. Reporting a failure now would tell the
      // customer their save did not work, which is the opposite of true.
      expect(data).toEqual({ id: 'newest' });
      expect(error).toBeNull();
      expect(trimmed).toBe(0);
    });

    test('keeps the trade when the sweep write itself fails', async () => {
      asUser();
      mockTables({
        trades: [
          { data: { id: 'newest' }, error: null },
          // The read succeeds and finds the history overfull...
          existingTrades(FreeLimits.savedTrades + 2),
          // ...but the tombstoning update fails.
          { error: { message: 'update blew up' } },
        ],
        entitlements: asFree(),
      });

      const { data, error, trimmed } = await saveTradeToHistory('My Trade', [], [], totals);

      // The insert already committed, so a failed trim is logged, not surfaced.
      expect(data).toEqual({ id: 'newest' });
      expect(error).toBeNull();
      expect(trimmed).toBe(0);
    });

    test('treats a null history read as an empty window', async () => {
      asUser();
      const chains = mockTables({
        trades: [
          { data: { id: 'newest' }, error: null },
          // A read that returns neither rows nor an error must not be treated as
          // an over-limit history — there is nothing to tombstone.
          { data: null, error: null },
        ],
        entitlements: asFree(),
      });

      const { trimmed } = await saveTradeToHistory('My Trade', [], [], totals);

      expect(trimmed).toBe(0);
      expect(chains.trades[1].update).not.toHaveBeenCalled();
    });

    test('does not trim on an entitlement read the app could not complete', async () => {
      asUser();
      const chains = mockTables({
        trades: [{ data: { id: 'newest' }, error: null }],
        entitlements: [{ data: null, error: { message: 'offline' } }],
      });

      const { trimmed } = await saveTradeToHistory('My Trade', [], [], totals);

      // A failed read resolves to free, and free means sweep — but the sweep's own
      // read fails too here, so nothing is deleted. What matters is that an
      // unreadable entitlement never deletes a subscriber's trades.
      expect(trimmed).toBe(0);
      expect(chains.trades.at(-1).update).not.toHaveBeenCalled();
    });
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
    const chains = mockTables({ trades: [{ data: trades, error: null }] });

    const { data, error } = await getUserTrades();

    expect(error).toBeNull();
    expect(data).toEqual(trades);
    expect(chains.trades[0].eq).toHaveBeenCalledWith('user_id', 'user-9');
    expect(chains.trades[0].order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  test('hides trades tombstoned by another device', async () => {
    asUser();
    const chains = mockTables({ trades: [{ data: [], error: null }] });

    await getUserTrades();

    expect(chains.trades[0].is).toHaveBeenCalledWith('deleted_at', null);
  });

  test('surfaces a database error instead of a partial list', async () => {
    asUser();
    mockTables({ trades: [{ data: null, error: { message: 'read failed' } }] });

    const { data, error } = await getUserTrades();

    expect(data).toBeNull();
    expect(error).toEqual({ message: 'read failed' });
  });
});

describe('getTradeById', () => {
  test('fetches a single trade by id and user', async () => {
    asUser('user-3');
    const chains = mockTables({ trades: [{ data: { id: 'xyz' }, error: null }] });

    const { data } = await getTradeById('xyz');

    expect(data).toEqual({ id: 'xyz' });
    expect(chains.trades[0].eq).toHaveBeenCalledWith('id', 'xyz');
    expect(chains.trades[0].eq).toHaveBeenCalledWith('user_id', 'user-3');
  });

  test('errors when not authenticated', async () => {
    asAnonymous();
    const { data, error } = await getTradeById('xyz');
    expect(data).toBeNull();
    expect(error.message).toMatch(/logged in/i);
    // A request that never got past the auth guard must not touch the table.
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('propagates a database error', async () => {
    asUser();
    mockTables({ trades: [{ data: null, error: { message: 'not found' } }] });
    const { data, error } = await getTradeById('missing');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'not found' });
  });
});

describe('updateTrade', () => {
  test('applies updates and stamps updated_at', async () => {
    asUser();
    const chains = mockTables({ trades: [{ data: { id: 'u1', name: 'New' }, error: null }] });

    const { data, error } = await updateTrade('u1', { name: 'New' });

    expect(error).toBeNull();
    expect(data).toEqual({ id: 'u1', name: 'New' });
    expect(chains.trades[0].update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New', updated_at: expect.any(String) })
    );
  });

  test('errors when not authenticated', async () => {
    asAnonymous();
    const { data, error } = await updateTrade('u1', { name: 'New' });
    expect(data).toBeNull();
    expect(error.message).toMatch(/logged in/i);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('propagates a database error', async () => {
    asUser();
    mockTables({ trades: [{ data: null, error: { message: 'conflict' } }] });
    const { data, error } = await updateTrade('u1', { name: 'New' });
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'conflict' });
  });
});

describe('deleteTrade', () => {
  test('tombstones the trade rather than removing it', async () => {
    asUser('user-7');
    const chains = mockTables({ trades: [{ error: null }] });

    const { data, error } = await deleteTrade('d1');

    expect(error).toBeNull();
    expect(data).toEqual({ success: true });
    expect(chains.trades[0].delete).not.toHaveBeenCalled();
    expect(chains.trades[0].update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String), updated_at: expect.any(String) })
    );
    expect(chains.trades[0].eq).toHaveBeenCalledWith('id', 'd1');
    expect(chains.trades[0].eq).toHaveBeenCalledWith('user_id', 'user-7');
  });

  test('returns the error when deletion fails', async () => {
    asUser();
    mockTables({ trades: [{ error: { message: 'nope' } }] });
    const { data, error } = await deleteTrade('d1');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'nope' });
  });

  test('errors when not authenticated', async () => {
    asAnonymous();
    const { data, error } = await deleteTrade('d1');
    expect(data).toBeNull();
    expect(error.message).toMatch(/logged in/i);
    // Nothing is tombstoned for a caller we could not authenticate.
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// The auth guard short-circuits before any query when Supabase itself was never
// configured (no env vars), so every call reports that rather than a login error.
describe('when Supabase is not configured', () => {
  afterEach(() => {
    jest.dontMock('../../src/lib/supabase.js');
    jest.resetModules();
  });

  const loadUnconfigured = async () => {
    jest.resetModules();
    jest.doMock('../../src/lib/supabase.js', () => ({ supabase: null }));
    return import('../../src/services/tradeHistory.js');
  };

  test('getUserTrades reports the missing configuration', async () => {
    const { getUserTrades: getUserTradesFn } = await loadUnconfigured();
    const { data, error } = await getUserTradesFn();
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
  });

  test('saveTradeToHistory reports the missing configuration', async () => {
    const { saveTradeToHistory: saveFn } = await loadUnconfigured();
    const { data, error, trimmed } = await saveFn('My Trade', [], [], totals);
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'Authentication not configured' });
    expect(trimmed).toBe(0);
  });
});
