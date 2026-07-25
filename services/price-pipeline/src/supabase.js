import { UPSERT_CHUNK_SIZE } from './config.js';

// Upsert rows in chunks to stay within request size limits.
export async function upsertInChunks(supabase, table, rows, onConflict) {
  let count = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      throw new Error(`Upsert into "${table}" failed: ${error.message}`);
    }
    count += chunk.length;
  }
  return count;
}
