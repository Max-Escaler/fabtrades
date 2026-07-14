import { getSupabaseClient, ENABLE_CARDMARKET } from './config.js';
import { fetchGroups, fetchGroupProducts } from './tcgcsv.js';
import { fetchCardMarketByName } from './cardmarket.js';
import { buildRows } from './transform.js';
import { upsertInChunks } from './supabase.js';

const DRY_RUN = process.argv.includes('--dry-run');

// Collapse duplicate keys in place, keeping the last occurrence.
function dedupeByKey(arr, keyFn) {
  const seen = new Map();
  for (const item of arr) seen.set(keyFn(item), item);
  if (seen.size !== arr.length) {
    const removed = arr.length - seen.size;
    console.log(`   (deduped ${removed} duplicate key${removed === 1 ? '' : 's'})`);
    arr.length = 0;
    arr.push(...seen.values());
  }
}

async function main() {
  const startedAt = new Date();
  console.log(`🌀 FABTrades ingest${DRY_RUN ? ' (dry run)' : ''} @ ${startedAt.toISOString()}`);

  console.log('📡 Fetching TCGplayer groups (sets)...');
  const groups = await fetchGroups();
  console.log(`   ✓ ${groups.length} sets`);

  let cmByName = new Map();
  if (ENABLE_CARDMARKET) {
    console.log('🌍 Fetching CardMarket prices...');
    try {
      cmByName = await fetchCardMarketByName();
      console.log(`   ✓ ${cmByName.size} CardMarket entries`);
    } catch (err) {
      console.warn(`   ⚠ CardMarket fetch failed; continuing without EU prices: ${err.message}`);
    }
  } else {
    console.log('⌁ CardMarket disabled for FAB — skipping EU prices.');
  }

  const setRows = groups.map((g, i) => ({
    group_id: parseInt(g.groupId, 10),
    name: g.name,
    set_number: i + 1,
    updated_at: new Date().toISOString()
  }));

  const allCards = [];
  const allPrices = [];
  const allHistory = [];

  for (const [i, g] of groups.entries()) {
    process.stdout.write(`📄 ${g.name} (group ${g.groupId})... `);
    const products = await fetchGroupProducts(g.groupId);
    const { cards, prices, history } = buildRows(products, g.groupId, i + 1, cmByName);
    allCards.push(...cards);
    allPrices.push(...prices);
    allHistory.push(...history);
    console.log(`${cards.length} products`);
  }

  // Safety net: collapse any exact-duplicate keys so a single upsert can't touch a row twice.
  dedupeByKey(allCards, (c) => c.id);
  dedupeByKey(allPrices, (p) => p.card_id);
  dedupeByKey(allHistory, (h) => `${h.card_id}|${h.captured_on}`);

  const cmMatched = allCards.filter((c) => c.cardmarket_id !== null).length;
  console.log(
    `\n📊 Totals: ${setRows.length} sets, ${allCards.length} products, ${cmMatched} with CardMarket prices`
  );

  if (DRY_RUN) {
    console.log('🧪 Dry run — no database writes. Sample non-sealed card:');
    const sample = allCards.find((c) => !c.is_sealed) || allCards[0];
    console.log(JSON.stringify(sample, null, 2));
    return;
  }

  const supabase = getSupabaseClient();

  const { data: runRow, error: runErr } = await supabase
    .from('fab_pipeline_runs')
    .insert({ status: 'running', total_sets: setRows.length })
    .select('id')
    .single();
  if (runErr) throw new Error(`Failed to create pipeline_run: ${runErr.message}`);
  const runId = runRow.id;

  try {
    // Order matters: sets -> cards (FK to sets) -> prices/history (FK to cards).
    console.log('⬆️  Upserting sets...');
    await upsertInChunks(supabase, 'fab_sets', setRows, 'group_id');
    console.log('⬆️  Upserting cards...');
    await upsertInChunks(supabase, 'fab_cards', allCards, 'id');
    console.log('⬆️  Upserting card_prices...');
    await upsertInChunks(supabase, 'fab_card_prices', allPrices, 'card_id');
    console.log('⬆️  Upserting price_history (daily snapshot)...');
    await upsertInChunks(supabase, 'fab_price_history', allHistory, 'card_id,captured_on');

    await supabase
      .from('fab_pipeline_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        total_cards: allCards.length,
        cardmarket_matched: cmMatched
      })
      .eq('id', runId);

    console.log('✅ Ingest complete.');
  } catch (err) {
    await supabase
      .from('fab_pipeline_runs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        total_cards: allCards.length,
        cardmarket_matched: cmMatched,
        notes: String(err.message).slice(0, 1000)
      })
      .eq('id', runId);
    throw err;
  }
}

main().catch((err) => {
  console.error('❌ Pipeline failed:', err);
  process.exit(1);
});
