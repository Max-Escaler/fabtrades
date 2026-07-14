# FABTrades data pipeline

Daily ingest that publishes the Flesh and Blood (FAB) card + price database to **Supabase**, so
any number of apps (the mobile app, the web app, etc.) can read from one shared source.

```
TCGCSV (TCGplayer, game 62)  ──►  transform  ──►  Supabase (upsert)
                                                    fab_sets, fab_cards, fab_card_prices, fab_price_history
```

## What it does
1. Fetches sets (TCGplayer "groups") from TCGCSV.
2. Fetches each set's `ProductsAndPrices.csv` (cards, art URLs, USD prices).
3. Upserts everything into Supabase and appends a daily row to `fab_price_history`.
4. Logs the run in `fab_pipeline_runs`.

CardMarket EU prices are disabled for FAB (`ENABLE_CARDMARKET = false`), so all `cm_*`
price fields stay null and the CardMarket fetch is skipped.

Re-running is idempotent: `fab_cards`/`fab_card_prices` upsert by key, and `fab_price_history`
upserts on `(card_id, captured_on)` so a same-day re-run overwrites that day's snapshot.

## Setup
```bash
cd pipeline
npm install
cp .env.example .env   # then paste your service_role key into .env
```

Get the **service_role** key from: Supabase Dashboard → Project Settings → API →
`service_role` (secret). It bypasses RLS, so keep it server-side only — never in a
client app.

## Run
```bash
npm run dry-run   # fetch + transform + print totals, NO database writes
npm run ingest    # full run: writes to Supabase
```

## Schema (shared Supabase project)
The FAB pipeline writes to the `fab_*` prefixed tables so it can share the same Supabase
project as the Riftbound dataset without clobbering it.

| Table | Purpose |
| --- | --- |
| `fab_sets` | TCGplayer groups / expansions |
| `fab_cards` | one row per printing (normal/foil, alt-art). `collector_number` = scan key |
| `fab_card_prices` | current TCGplayer (USD) prices, 1:1 with cards (CardMarket disabled) |
| `fab_price_history` | one snapshot per card per day (for charts) |
| `fab_pipeline_runs` | ingest run log (service-role only) |
| `fab_cards_with_prices` | convenience view joining cards + set name + current prices |

All read tables are public read-only via RLS; only the pipeline (service role) writes.

## Daily automation
See `.github/workflows/update-prices.yml`. Add repo secrets `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` (Settings → Secrets and variables → Actions).
