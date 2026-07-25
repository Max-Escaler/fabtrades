# FAB Trades

A cross-platform (Android + iOS) mobile companion app for trading **Flesh and Blood**,
Legend Story Studios' TCG. Look up prices, balance trades, manage your
collection and want lists, and scan cards. Inspired by *MTG Trades*.

This repo contains two things:
1. **`pipeline/`** — a daily data pipeline that publishes the Flesh and Blood card + price
   database to a shared **Supabase** project (so multiple apps can use it).
2. **The Flutter app** (planned) — reads that shared database.

**Status:** Data backend built & verified. Flutter app not started yet.

📄 Docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (stack + build plan) ·
[`docs/DATABASE.md`](docs/DATABASE.md) (shared DB contract + queries) ·
[`pipeline/README.md`](pipeline/README.md) (run the pipeline).

## Planned app stack
- **Flutter** (Dart) — one codebase, Android + iOS in sync
- **supabase_flutter** for data, **Riverpod** state, **drift** offline cache
- **ML Kit** on-device OCR for card scanning (reads the collector number)

## Data: shared Supabase database
A Node pipeline ingests **TCGCSV** (Flesh and Blood card data + art + USD prices)
and **CardMarket** (EU prices), then upserts into Supabase daily via GitHub Actions.
Every app reads one source of truth.
- Project `FAB Trades` · `https://tenrvaghaspwdvnwvgrh.supabase.co`
- Tables: `sets`, `cards`, `card_prices`, `price_history` (+ `fab_cards_with_prices` view)
- Public read-only via RLS; only the pipeline (service role) writes
- Card art: TCGplayer CDN · Prices: USD + EUR · Scan key: `collector_number` (e.g. `147/219`)

## Roadmap (short)
0. **Done** — shared Supabase DB + daily pipeline (run first ingest to populate)
1. Card search + price lookup (source/type toggle)
2. Offline cache + background refresh
3. Trade balancer + history
4. Collection & want lists
5. Card scanning (OCR the collector number)
6. Optional cloud sync (Supabase Auth + RLS)
```
