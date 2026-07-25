# Binder — Feature Plan (Phase 7)

The Binder is the user's **tradeable stock**: the cards they are willing to
trade away right now. It is *not* a full collection tracker — there is no
owned-but-not-tradeable concept in the app (see root `CONTEXT.md` for the
glossary this plan follows).

Design principle: **binder maintenance is never a separate chore.** Cards
enter via the same scan/type flows used everywhere else; cards leave as a
side effect of confirming a trade. Every surface that shows binder data is
also a one-tap correction point.

## Decisions already made (do not relitigate)

- Binder = tradeable stock only. Deck cards and bulk do not exist in the app.
- One **Binder** nav tab containing two views: Binder + Want List.
  Nav becomes Browse · Trade · Binder · Lend. The orphaned Collection
  screen is reworked into this; the word "Collection" leaves the UI.
- Two add paths only: **scan** (same continuous loop as scan-to-trade) and
  **type** (the existing card picker). No CSV import, no set-checklist fill.
- **Confirm Trade** is the single end-of-life action for a trade draft:
  records to history + prompts to remove given cards / add received cards
  (both checkboxes default ON) + clears the draft. There is currently no
  save button at all — `TradeHistoryNotifier.addTrade` exists but has no
  caller, so Confirm Trade fills a real hole.
- Have-side decrements clamp at zero silently (partial capture is expected;
  counts self-correct at the next scan/edit).
- Non-goals: full collection, multiple binders, set-completion views,
  condition-based pricing, cloud sync (still Phase 6, separate).

## Phase B1 — Binder tab (rework Collection)

Goal: the Binder exists in nav, showing current owned entries; Want List
moves inside it. No new data model — the existing store already splits on
`isWanted`.

- Rename code symbols to match the glossary: `CollectionEntry` →
  `BinderEntry`, `CollectionRepository`/`collectionProvider` →
  `BinderRepository`/`binderProvider`, `features/collection/` →
  `features/binder/`. **Keep the SharedPreferences key
  `collection_entries`** so existing device data carries over untouched.
- New `BinderScreen` with a two-tab layout:
  - **Binder tab**: reworked "Owned" tab from the old Collection screen —
    qty steppers, condition chips, swipe-delete, total value header
    (existing `pricing.value` per entry × qty).
  - **Want List tab**: move the existing show-mode grid from
    `features/want_list/` in unchanged.
- `app/app.dart` HomeShell: replace the Want List destination with Binder.
  Delete the dead Collection wiring.
- Empty state: two prominent actions — "Scan cards" and "Add by search" —
  not a bare list + FAB.

## Phase B2 — Add paths (scan + type)

Goal: filling the binder initially takes one evening of scanning, zero
per-card dialogs.

- Generalize `ScanScreen`'s add hook: today `tradeSide` wires locked
  matches to the trade draft. Replace with a destination (small enum or
  `onCardPicked` callback) and add `ScanScreen.forBinder()`. Behavior on
  tap of a locked printing: `binderProvider.add(card)` (qty+1 merge, NM
  default), snackbar, resume scanning — identical rhythm to
  `_addToTrade`.
- Point `CardPickerScreen` at the binder via the same destination
  parameter it needs anyway.
- `card_actions.dart` sheet: rename "Add to Collection" → "Add to Binder".
- Wire both paths to the Binder tab's FAB and empty state.
- Known risk to validate on-device: the scanner is tuned for a single
  loose card in the guide; sleeved cards in binder pages (glare, page
  plastic) are unproven — see `card-scanning-learnings.md`. If page-scan
  quality is bad, the fallback workflow is scanning cards as they're
  pulled from the shoebox/stack, not a new feature.

## Phase B3 — Confirm Trade

Goal: cards leave (and optionally enter) the binder as a byproduct of the
trade itself.

- Trade screen bottom bar: **Confirm Trade** button, enabled when the
  draft has items.
- Confirmation sheet: trade summary + two checkboxes, both default ON:
  - "Remove my N given cards from Binder"
  - "Add their M cards to my Binder" (uncheck for deck-bound pulls)
- On confirm, in order:
  1. Snapshot the draft into a real `Trade` (fresh id + `createdAt`) and
     finally call `tradeHistoryProvider.addTrade` (first-ever caller).
  2. If checked: decrement binder qty for each Have-side item (clamp at
     zero, no warnings); add each Want-side item (qty merge, NM).
  3. Also clear received cards from the Want List half if present
     (`isWanted` entries) — the want list stays honest for free.
  4. Clear the draft. Snackbar confirmation.
- "Clear trade" remains the abandon path and touches nothing.

## Phase B4 — Synergies (make the binder load-bearing)

Goal: binder data improves flows people already use, and every display of
it doubles as a correction surface.

- **Trade Filler awareness** (`trade_filler_sheet.dart`): partition
  results into a top section + catalog below. Boost, never filter — a 40%-
  entered binder must not make the filler worse than today.
  - Gap on *my* side (`fillSide == have`): top section = cards from my
    Binder near the target price.
  - Gap on *their* side (`fillSide == want`): top section = cards from my
    Want List near the target price. (Data exists today; this half could
    even ship before B1.)
- **Ownership badges**: "Own 2" / "Wanted" pills on search rows, card
  detail, picker rows, and the scan lock result list (`quantityOf` /
  want-list lookup). On card detail, tapping the badge opens a quick qty
  editor — fix a stale count exactly where it surfaced.
- **Binder value header**: total value on the Binder tab (B1 ships the
  static total; weekly delta deferred until `fab_price_history` has
  depth — tracked in B5).

## Phase B5 — Deferred / later

- Value-over-time chart for the binder (needs price-history baselines per
  entry or daily snapshots — decide then).
- Lend integration: lent cards stay in binder value but are excluded from
  filler suggestions.
- Cloud sync of binder (folds into the existing Phase 6 plan).

## Testing

- Extend `test/core/data/repositories_test.dart` for the renamed
  repository (round-trip, corrupt-JSON fallback, key compatibility with
  legacy `collection_entries` payloads).
- Unit-test the Confirm Trade reconcile: decrement/clamp, want-side add,
  want-list clearing, draft reset.
- Filler partition: owned/wanted boost ordering with a sparse binder.
- Real-device scan session against an actual sleeved binder page before
  calling B2 done.
