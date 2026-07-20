// Unit tests for the chunked upsert helper in the FAB price-ingest pipeline.
//
// upsertInChunks writes every card/price row into Supabase in bounded batches.
// Getting the chunk boundaries or error propagation wrong would either exceed
// request-size limits or silently drop a failed batch mid-ingest, so the
// batching math and the throw-on-error path are worth pinning.
//
// config.js does `import 'dotenv/config'` and pulls @supabase (neither is a
// web-app dependency); we mock it to control UPSERT_CHUNK_SIZE and keep the
// import chain hermetic.
jest.mock('../../mobile/pipeline/src/config.js', () => ({
  UPSERT_CHUNK_SIZE: 2,
}));

import { upsertInChunks } from '../../mobile/pipeline/src/supabase.js';

// Minimal fake Supabase client recording each upsert call.
function makeClient(errorOnCall = null) {
  const calls = [];
  const client = {
    from(table) {
      return {
        upsert(chunk, opts) {
          calls.push({ table, chunk, opts });
          const error = typeof errorOnCall === 'function' ? errorOnCall(calls.length) : null;
          return Promise.resolve({ error });
        },
      };
    },
  };
  return { client, calls };
}

describe('upsertInChunks', () => {
  it('splits rows into UPSERT_CHUNK_SIZE batches and returns the total written', async () => {
    const { client, calls } = makeClient();
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

    const count = await upsertInChunks(client, 'cards', rows, 'id');

    expect(count).toBe(5);
    // 5 rows / chunk size 2 => chunks of [2, 2, 1].
    expect(calls.map((c) => c.chunk.length)).toEqual([2, 2, 1]);
    expect(calls.map((c) => c.chunk)).toEqual([
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }, { id: 4 }],
      [{ id: 5 }],
    ]);
  });

  it('passes the table name and onConflict option to every upsert', async () => {
    const { client, calls } = makeClient();

    await upsertInChunks(client, 'prices', [{ id: 1 }, { id: 2 }, { id: 3 }], 'unique_id');

    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.table).toBe('prices');
      expect(call.opts).toEqual({ onConflict: 'unique_id' });
    }
  });

  it('returns 0 and performs no upserts for an empty row set', async () => {
    const { client, calls } = makeClient();

    const count = await upsertInChunks(client, 'cards', [], 'id');

    expect(count).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('throws a descriptive error and stops when a chunk upsert fails', async () => {
    // Fail on the second chunk.
    const { client, calls } = makeClient((n) => (n === 2 ? { message: 'boom' } : null));
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

    await expect(upsertInChunks(client, 'cards', rows, 'id')).rejects.toThrow(
      'Upsert into "cards" failed: boom'
    );
    // Should have stopped after the failing (second) chunk — no third call.
    expect(calls).toHaveLength(2);
  });
});
