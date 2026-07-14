# Shared Card & Price Database (Riftbound + Flesh and Blood)

A single Supabase Postgres database that any of your apps (mobile, web, tools) can read
from. It hosts **two game datasets** in one project, split by table prefix:

- **Riftbound** — the original tables (`sets`, `cards`, ...), TCGplayer game id 89,
  populated from TCGCSV (TCGplayer) + CardMarket.
- **Flesh and Blood (FAB)** — the `fab_*` prefixed tables (`fab_sets`, `fab_cards`, ...),
  TCGplayer game id 62, populated from TCGCSV only (CardMarket disabled for FAB).

The FAB app and pipeline use the `fab_*` prefixed tables and the `fab_cards_with_prices`
view. Both datasets are populated by [`../pipeline`](../pipeline).

## Connection (for client apps)
The project is **shared** — both datasets use the same URL and publishable key.

| | |
| --- | --- |
| Project | `tenrvaghaspwdvnwvgrh` |
| URL | `https://tenrvaghaspwdvnwvgrh.supabase.co` |
| Publishable key | `sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr` |

The publishable key is safe to ship in client apps. All card/price tables are **public
read-only** via RLS; only the pipeline's `service_role` key can write. Never put the
`service_role` key in a client app.

## Riftbound tables (game id 89)
| Table | Rows | Notes |
| --- | --- | --- |
| `sets` | ~9 | TCGplayer groups / expansions (`group_id`, `name`) |
| `cards` | ~1,660 | one row per **printing**; PK `id` = `"<product_id>-<subtype>"` (e.g. `684123-foil`), `set_id` → `sets.group_id` |
| `card_prices` | 1:1 with cards | current TCGplayer (USD) + CardMarket (EUR) prices; `card_id` → `cards.id` |
| `price_history` | daily | one snapshot per card per day for charts |
| `pipeline_runs` | — | ingest log (not client-readable) |
| `cards_with_prices` | view | cards + `set_name` + current prices (easiest to query) |

## Flesh and Blood tables (game id 62)
The FAB pipeline writes to these `fab_*` prefixed tables. `fab_cards` carries the same
columns as `cards` plus FAB-specific fields (`card_type`, `card_sub_type`, `card_class`,
`talent`, `pitch`, `cost`, `power`, `defense`, `life`, `intellect`). CardMarket is disabled
for FAB, so all `cm_*` price fields stay null.

| Table | Notes |
| --- | --- |
| `fab_sets` | TCGplayer groups / expansions (`group_id`, `name`) |
| `fab_cards` | one row per **printing**; PK `id` = `"<product_id>-<subtype>"`, `set_id` → `fab_sets.group_id`; includes FAB extended columns |
| `fab_card_prices` | current TCGplayer (USD) prices; `card_id` → `fab_cards.id` (CardMarket disabled) |
| `fab_price_history` | one snapshot per card per day for charts |
| `fab_pipeline_runs` | ingest log (not client-readable) |
| `fab_cards_with_prices` | view: cards + `set_name` + current prices (easiest to query) |

### Key `cards` columns
- `id` — stable per-printing PK, `"<product_id>-<subtype>"` (Normal and Foil are
  separate rows since they share `product_id`); use this to key collections/trades
- `product_id` — TCGplayer id (NOT unique across finishes); `unique_id` — `SSSNNNN` convenience id
- `name`, `clean_name`, `rarity`, `sub_type_name`, `is_foil`, `is_sealed`
- `collector_number` — e.g. `"147/219"` (the OCR **scan key**)
- `image_url` — TCGplayer CDN card art
- `cardmarket_id` — `null` when no EU price match

### `card_prices` columns
- TCGplayer (USD): `tcg_low`, `tcg_mid`, `tcg_high`, `tcg_market`, `tcg_direct_low`
- CardMarket (EUR): `cm_avg`, `cm_low`, `cm_trend` (+ `cm_*_foil` variants)

## Example queries

### supabase-js (JS/TS, e.g. the web app)
```js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://tenrvaghaspwdvnwvgrh.supabase.co',
  'sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr'
);

// Search real cards by name, cheapest printing first
const { data } = await supabase
  .from('cards_with_prices')
  .select('name, set_name, rarity, is_foil, image_url, tcg_market, cm_trend')
  .eq('is_sealed', false)
  .ilike('name', '%jinx%')
  .order('tcg_market', { ascending: true })
  .limit(20);
```

### Dart / Flutter (the mobile app)
```dart
final supabase = SupabaseClient(
  'https://tenrvaghaspwdvnwvgrh.supabase.co',
  'sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr',
);

final rows = await supabase
    .from('cards_with_prices')
    .select('product_id, name, set_name, image_url, tcg_market, tcg_low')
    .eq('is_sealed', false)
    .ilike('name', '%jinx%')
    .limit(20);
```

### Scan lookup (by collector number)
```js
const { data } = await supabase
  .from('cards_with_prices')
  .select('*')
  .eq('collector_number', '147/219');
```

### REST (any language)
```
GET https://tenrvaghaspwdvnwvgrh.supabase.co/rest/v1/cards_with_prices?name=ilike.*jinx*&is_sealed=eq.false&select=name,tcg_market
  apikey: sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr
```

## Refresh cadence
The GitHub Action ([`../.github/workflows/update-prices.yml`](../.github/workflows/update-prices.yml))
runs the pipeline daily at 06:00 UTC, upserting current prices and appending a
`price_history` row per card. See [`../pipeline/README.md`](../pipeline/README.md) to run it manually.

## Migrating the existing web app
Point the web app at `cards_with_prices` instead of `public/price-guide/consolidated-data.json`.
Field mapping: `marketPrice`→`tcg_market`, `lowPrice`→`tcg_low`, `cardmarketTrend`→`cm_trend`,
`cardmarketLow`→`cm_low`, `imageUrl`→`image_url`, `extRarity`→`rarity`, `extNumber`→`collector_number`,
`subTypeName`→`sub_type_name`, `_setName`→`set_name`.
