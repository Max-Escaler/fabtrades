# Context: Browse grouping, search & price-trust features

Handoff notes for an agent picking up work on the FAB Trades Flutter app (`app/`).
Covers the changes made on branch **`feat/browse-grouping-search-trust`** and the
surrounding architecture you need to be productive.

---

## 1. TL;DR of what was built

Four product features plus two refinements, all on branch
`feat/browse-grouping-search-trust` (base branch: **`main`**, remote: **`rifttrades`**):

1. **Grouped browse** — the Browse list shows one row per card *name*; the row
   uses the **base-rarity printing's** price/art. Tapping opens the card detail
   screen, whose printings selector lets you switch between versions.
2. **Global search bar** on the Browse landing screen — searches the whole
   catalog (all sets) and shows grouped results; clearing it restores the set list.
3. **Pull-to-refresh toast** — after refreshing prices, a floating toast reports
   when the pricing pipeline last updated (e.g. "Prices updated 6h ago · TCGplayer
   pricing"), read from `price_updated_at`.
4. **Price provenance / trust** — TCGplayer / CardMarket attribution beside prices
   in browse rows and on the card detail price card.
5. **Art-variant grouping** — variants like `(Alternate Art)`, `(Overnumbered)`,
   `(Signature)`, `(Metal)`, `R0x` and promo arts are grouped as versions of the
   same card (grouping keys on the *base name*, stripping trailing parentheticals).
   The detail version selector pulls **all** variants across sets from the in-memory
   catalog.
6. **Non-card products hidden** — Champion Decks, box sets, promo packs, pre-rift
   kits, bulk runes etc. are filtered out of browse/search/picker/version lists.

`flutter analyze lib` is clean. Verify with:
```
cd app && flutter analyze lib
```

---

## 2. Git / branch state (important!)

- Branch `feat/browse-grouping-search-trust` off `main`, tracking
  `rifttrades/feat/browse-grouping-search-trust`.
- Two commits contain the feature work:
  - `feat(browse): group cards by name, add global search & price provenance`
  - `feat(browse): group card art variants and hide non-card products`
- **There is unrelated, uncommitted work in the working tree**: an in-progress
  "scan a card" feature. Do **not** commit it as part of browse work. It lives in:
  - `app/ios/Runner/Info.plist` (camera permission)
  - `app/lib/features/scan/scan_screen.dart`
  - `app/lib/features/trade/trade_screen.dart`
  - the **scan/OCR half** of `app/lib/core/data/card_repository.dart`
    (`ScanNumber`, `parseScanNumber`, `identifyCards`, `_rankByName`, `_nameOverlap`,
    `nameTokens`, `_wordSet`, `collectorNumberRegex`, `_nameStopwords`)
- When committing browse changes to `card_repository.dart`, stage **only** the
  grouping/variant/product code and leave the scan/OCR block unstaged. (This was
  done by resetting the file to HEAD, re-applying only the browse edits, staging,
  then restoring the full working copy.)

---

## 3. App architecture (essentials)

- **Flutter + Riverpod** (`flutter_riverpod`). No Bloc/Provider-pkg/GetX.
- **Cache-first catalog**: `CatalogNotifier` (`app/lib/core/providers.dart`) loads
  the full catalog from Supabase once, caches it in `SharedPreferences`
  (`CatalogRepository`), and serves it instantly on later launches while refreshing
  in the background. Browse/search/grouping all run **in-memory** against this list
  — no per-set network calls.
- **One `CardModel` == one printing.** Normal and Foil are separate rows with
  distinct `id` (e.g. `"684123-foil"`). Model: `app/lib/core/models/card_model.dart`.
- **Pricing** resolution/formatting: `app/lib/core/logic/pricing.dart` (`Pricing`),
  driven by user settings (`PriceSource` TCGplayer/CardMarket, `PriceType`
  market/low) in `app/lib/core/models/app_settings.dart`.
- **Bottom nav** (`app/lib/app/app.dart`): Browse, Trade, Want List, Lend. The Scan
  tab is hidden; Browse is tab 0 = `BrowseScreen`.

### Key providers (`app/lib/core/providers.dart`)
- `catalogProvider` — `AsyncNotifier<List<CardModel>>`, the cached catalog.
- `searchFiltersProvider` — `CardFilters` (query, setName, foilOnly, sort).
- `browseResultsProvider` — filtered flat list (`filterCards`).
- `browseGroupsProvider` — **grouped** results (`groupCardsByName`) for the grouped UI.
- `priceUpdatedAtProvider` — max `priceUpdatedAt` across the catalog (for the toast).
- `pricingProvider` — `Pricing` from current settings.

---

## 4. Domain rules you must preserve

### Base card name / variants
Cards share a name with a trailing parenthetical qualifier for variants, e.g.
`Ahri - Inquisitive`, `Ahri - Inquisitive (Alternate Art)`, `(Overnumbered)`,
`(Signature)` are all the **same card**. Grouping keys on the **base name**.

Helpers in `app/lib/core/data/card_repository.dart`:
- `String baseCardName(String name)` — strips trailing `(...)` qualifiers.
- `String? nameQualifier(String name)` — returns the trailing qualifier or null.
- `List<CardGroup> groupCardsByName(List<CardModel> cards, CardSort sort)` — groups
  by base name; the `representative` is the "base-rarity" printing chosen by
  `_baseFirst` (non-foil → lowest `rarityRank` → has a price → lowest collector #).
- `List<CardModel> printingsForCard(List<CardModel> catalog, CardModel card)` —
  all variants sharing a base name across sets (used by the detail selector).

Known DB qualifier values (frequency): `Alternate Art` (85), `Overnumbered` (60),
`Prize Wall` (39), `Signature` (36), `Metal` (29), `Oversized` (4), `Starter` (4),
`Champion` (3), `Top 8` (3), `R0x` rune codes, plus one-off promo names. Example
big groups: `Fury Rune`/`Order Rune` (11 printings, 4 sets), `Teemo - Swift Scout`
(6 printings, 3 sets), `Ahri - Inquisitive` (4).

> Note: `Oversized` printings have a rarity + collector number, so they are treated
> as real cards and group as a version of their base card (intentionally kept).

### Non-card products
`bool isNonCardProduct(CardModel c)` — true only when **both** `rarity` and
`collector_number` are null/empty. This matches exactly 19 product rows (Champion
Decks, box sets, Nexus Night promo packs, pre-rift kits, bulk runes, Showdown Decks)
and is applied in `filterCards`, `printingsForCard`, and the Browse set counts.

⚠️ Do **not** filter on "missing collector number" alone: real cards `Buff`
(Common) and `Buff // Buff (Fist Bump Promo)` have a rarity but no collector number
and must remain visible.

---

## 5. Files changed (browse feature work)

| File | What |
| --- | --- |
| `app/lib/core/models/card_model.dart` | Added `priceUpdatedAt` (parses `price_updated_at`; in `toMap` for cache round-trip). |
| `app/lib/core/data/card_repository.dart` | `CardGroup`, `rarityRank`, `_leadingNumber`, `_baseFirst`, `groupCardsByName`, `baseCardName`, `nameQualifier`, `isNonCardProduct`, `printingsForCard`; product filter in `filterCards`. (File also contains the *unrelated* scan/OCR block — see §2.) |
| `app/lib/core/providers.dart` | `browseGroupsProvider`, `priceUpdatedAtProvider`. |
| `app/lib/core/logic/pricing.dart` | `sourceLabel` getter. |
| `app/lib/app/widgets.dart` | `PriceSourceTag`, `PriceSourceBadge`; optional `priceSource` param on `CardRow`. |
| `app/lib/features/search/search_screen.dart` | Rewritten: `BrowseScreen` (global search + `_SetList`), `_GlobalSearchResults`, `SetCardsScreen` (grouped), `_GroupList`, `_GroupTile`, `_VersionCountChip`, `refreshPricesWithToast`, `_priceUpdatedLabel`. |
| `app/lib/features/card_detail/card_detail_screen.dart` | Version selector now uses in-memory `printingsForCard` (was network `printingsForName`); variant-aware chip labels; price-source badge + `_PriceAttribution` footer. |

`CardRepository.printingsForName` (network, exact-name) still exists but is now
unused — the detail screen uses the in-memory `printingsForCard` instead.

---

## 6. Supabase database (read-only for the app)

- Project `FAB Trades` = `tenrvaghaspwdvnwvgrh`,
  URL `https://tenrvaghaspwdvnwvgrh.supabase.co`, publishable key in
  `app/lib/core/config/supabase_config.dart`. Public read-only via RLS; the daily
  pipeline (GitHub Action, 06:00 UTC) writes with the service role.
- App reads the view **`cards_with_prices`** (filter `is_sealed = false`).
- Relevant view columns: `id, product_id, set_id, unique_id, name, clean_name,
  image_url, tcgplayer_url, sub_type_name, is_foil, rarity, collector_number,
  is_sealed, cardmarket_id, set_name`, TCGplayer USD prices (`tcg_low/mid/high/
  market/direct_low`), CardMarket EUR prices (`cm_*`, `cm_*_foil`), and
  **`price_updated_at`** (timestamptz — powers the refresh toast).
- `price_history(card_id, captured_on, tcg_market, tcg_low, cm_trend, cm_low)`
  backs the detail-screen sparkline.
- More detail: `docs/DATABASE.md`, `docs/ARCHITECTURE.md`.

---

## 7. Open questions / possible follow-ups

- **Champion-deck-style products**: fully removed via `isNonCardProduct`. If a new
  product type appears that *has* a rarity or number, extend the predicate.
- **Oversized** variants are currently grouped as versions (kept). Revisit if they
  should be excluded.
- Set-scoped browse (`SetCardsScreen`) only groups variants **within that set**;
  cross-set variants appear together in global search and in the detail version
  selector. This is intentional but worth knowing.
- `CardRow.priceSource` is opt-in; only Browse passes it today. Trade/picker/
  collection rows don't show source attribution yet.
