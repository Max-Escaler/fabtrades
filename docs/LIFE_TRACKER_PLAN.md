# Life Tracker Feature — Context & Implementation Plan

Handoff document for implementing a Flesh and Blood life tracking feature in the FabTrades mobile app. Read the **Context** section fully before writing any code. Follow the **Implementation Plan** steps in order.

---

## Part 1: Context (read this first)

### What we are building

A life counter screen for two players playing a Flesh and Blood match at a table, phone lying flat between them. It is opened from the app's hamburger menu. Requirements:

1. Vertical split-screen layout: top half shows the opponent's life total **rotated 180° so it faces them**; bottom half shows your life total facing you. A horizontal control bar sits between the halves ("center bar").
2. Tap the **left side** of your life panel to subtract 1; tap the **right side** to add 1.
3. **Press-and-hold** the left side to subtract 5, repeating every ~450 ms while held. Press-and-hold the right side to add 5, repeating the same way.
4. While tapping, a **floating delta number** (e.g. `-3` or `+2`) appears near the life total, accumulating across rapid taps, then fades out ~2.5 s after the last input.
5. **Audit history**: a log of life changes. An entry is recorded only after the life total "settles" (the same 2.5 s of no input that dismisses the floating number) — NOT one entry per tap. Each entry: which player, old total → new total, delta, timestamp. Opened from a button in the center bar.
6. **Round timer** in the center bar: counts down from the format's round time — 55:00 for Classic Constructed, 35:00 for Silver Age. Tap to start/pause. Shows red when it reaches 0:00.
7. **Settings button** in the center bar opens a settings sheet where the user can pick format (Classic Constructed or Silver Age), pick each player's hero via a **searchable hero picker** (hero determines starting life), manually adjust starting life, and **Reset game**.
8. Screen stays awake while the tracker is open (wakelock).
9. Game state **persists** — leaving the screen or killing the app and coming back restores the in-progress game (life totals, history, timer, settings).

### App architecture facts you must follow

- Flutter app located at `apps/mobile`. Run commands from that directory (`flutter pub get`, `flutter analyze`).
- **State management is Riverpod** (`flutter_riverpod`). Screens are `ConsumerWidget`/`ConsumerStatefulWidget`. Shared providers live in `apps/mobile/lib/core/providers.dart`; feature-local providers may live inside the feature folder.
- **Navigation is imperative** — no go_router. Push screens with:

```dart
Navigator.of(context).push(
  MaterialPageRoute(
    settings: const RouteSettings(name: 'Life Tracker'),
    builder: (_) => const LifeTrackerScreen(),
  ),
);
```

- **Feature folder convention**: one folder per feature under `apps/mobile/lib/features/<snake_case>/`, main screen named `<feature>_screen.dart`.
- **Hamburger menu** is NOT a `Drawer`. It is a right-side slide-in panel built in `apps/mobile/lib/app/app.dart` — see the `_AppMenuDrawer` widget (currently has two `ListTile`s: "My Account"/"Sign up" and "Settings"). To add a menu item, add another `ListTile` there following the exact same pattern: `Navigator.of(context).pop();` then `Navigator.of(parentContext).push(...)`.
- **Persistence is SharedPreferences only** (no Hive/sqflite). Follow the repository pattern in `apps/mobile/lib/core/data/settings_repository.dart`: a class that takes `SharedPreferences` in its constructor, `load()` does `jsonDecode` of a string key, `save()` does `jsonEncode`. A `sharedPreferencesProvider` already exists in `core/providers.dart`.
- **Theme**: `apps/mobile/lib/app/theme.dart` (`AppTheme.light()` / `AppTheme.dark()`), Material 3, Google Fonts "Outfit", brown/tan brand colors. Use `Theme.of(context).colorScheme` — do not hardcode colors except the timer-expired red (`colorScheme.error` is fine).
- **Card catalog**: the entire card database is preloaded in memory via `catalogProvider` (`AsyncNotifierProvider<CatalogNotifier, List<CardModel>>` in `core/providers.dart`). `CardModel` is in `apps/mobile/lib/core/models/card_model.dart` and has nullable string fields `cardType` (semicolon-delimited, e.g. `"Hero"` or `"Hero;Token"`) and `life`.

### Hero data (for the hero picker)

There is no hero model in the app. Derive heroes from the in-memory catalog:

- A card is a hero when `cardType` split on `;` contains a part equal to `Hero` (trimmed, case-insensitive) **and** it is not a token. Use the existing helper `isTokenCard(card)` from `apps/mobile/lib/core/data/card_repository.dart` to exclude tokens (`"Hero;Token"` rows).
- Only include heroes whose `life` field parses to a positive int (`int.tryParse(card.life ?? '')`), since life is the whole point of picking one.
- The same hero appears as many printings. **Dedupe by name**: strip any trailing promo set-code suffix using the existing helper `baseCardName(name)` from `card_repository.dart`, then dedupe on the lowercased result. Keep one representative per name (prefer a printing with a non-null `imageUrl`).
- For the search field, reuse the existing token matching approach: split the query on whitespace, lowercase, and a hero matches when every token appears in its lowercased name (see `queryTokens` in `card_repository.dart`, which is exported and reusable).

### Format facts

Only two formats, hardcoded as an enum:

| Format | Round timer | Default starting life (when no hero picked) |
|---|---|---|
| Classic Constructed (`cc`) | 55 minutes | 40 |
| Silver Age (`silverAge`) | 35 minutes | 40 |

Picking a hero overrides starting life with that hero's `life` value. The starting life field remains manually editable after that (hero pick just fills it in).

### Behavioral spec (exact rules)

**Tap zones.** Each player's half is split vertically down the middle into two invisible tap targets: left = −1, right = +1. The whole half is tappable, not just the number.

**Hold-to-repeat.** On long-press start of a zone: immediately apply ±5, then start a periodic timer (450 ms) applying ±5 each tick until the press ends (`onLongPressEnd` / `onLongPressCancel`). Cancel the periodic timer in `dispose` too.

**Life floor.** Life is clamped at 0; it never goes negative. Increments have no upper cap.

**Pending delta / settle logic.** Per player, keep `pendingDelta` (int) and `lifeBeforePending` (int). Every tap/hold-tick:
1. Applies the change to the displayed life immediately (life display is always live).
2. Adds to `pendingDelta`.
3. Restarts a per-player 2.5 s settle `Timer`.

When the settle timer fires: if `pendingDelta != 0`, append one audit entry (`player, lifeBeforePending → currentLife, delta = pendingDelta, timestamp = now`), reset `pendingDelta` to 0, set `lifeBeforePending = currentLife`, persist state, and fade out the floating number. Entries with a net delta of 0 (e.g. +1 then −1) are NOT recorded.

**Floating delta display.** While `pendingDelta != 0`, show a text like `+3` / `-3` near (e.g. above/beside) the life total in the accent color (green-ish for positive, `colorScheme.error` for negative — the theme has semantic positive/negative colors used for trade deltas in `theme.dart`; reuse them). It fades/animates out when settle fires. On the opponent half this floats inside the rotated area so it is also upside down (correctly facing the opponent).

**Timer.** Countdown, format MM:SS. Tap the timer text/chip to toggle running/paused. Persist as `remainingSeconds` plus, while running, a wall-clock `runningSince` timestamp — on restore, subtract elapsed wall time so the timer keeps counting across app restarts. At 0 it stops and renders in `colorScheme.error`. Changing format in settings resets the timer to the new format's full time, paused. Reset game also resets it, paused.

**Audit history sheet.** `showModalBottomSheet`, newest entry first. Each row: player label ("You" / "Opponent", or hero name when one is picked), `40 → 37`, delta chip (`-3`), and time (use `intl` `DateFormat.jm()`). Empty state text when no entries.

**Settings sheet.** `showModalBottomSheet` (scrollable) containing:
- Format: `SegmentedButton` with the two formats. Changing it resets the timer (paused, new duration) and updates default starting life only for players without a hero/manual override.
- Per player (You / Opponent): hero row showing chosen hero name or "Choose hero…", opening the hero picker; a starting-life stepper/text field (auto-filled from hero, editable).
- Note under the pickers: "Starting life applies on Reset."  Changing starting life/hero does NOT retroactively change current life mid-game; it takes effect on Reset. (Exception: if the game is pristine — no history and both players at their starting life — apply immediately.)
- "Reset game" button (destructive style) with a confirm dialog: sets both lives to their starting values, clears history and pending deltas, resets and pauses the timer.

**Hero picker.** Full-screen dialog or bottom sheet with a search `TextField` (autofocus) and a scrolling list of deduped heroes: name + life shown (thumbnail via `imageUrl` optional). Tapping one selects it, sets that player's hero name and starting life, and closes the picker. Include a "No hero (manual)" clear option at the top. Handle `catalogProvider` loading/error states (`AsyncValue.when`) — show a spinner while the catalog loads.

**Wakelock.** Add dependency `wakelock_plus` (latest, via `flutter pub add wakelock_plus` in `apps/mobile`). In the screen's `initState`: `WakelockPlus.enable()`; in `dispose`: `WakelockPlus.disable()`.

**Persistence.** Single SharedPreferences JSON key `life_tracker_state`. Persist on: settle commit, timer start/pause, settings change, reset. Do NOT write on every tap. Restore in the provider's constructor/build. Cap stored history at the most recent 200 entries.

### Layout sketch

```
+--------------------------------------+
|      OPPONENT (RotatedBox x2)        |
|   [-1 zone]     37      [+1 zone]    |   <- big life number, floating "+2" nearby
|   hold: -5             hold: +5      |
+--------------------------------------+
| [history]   [ 54:32 ]     [settings] |   <- center bar (NOT rotated)
+--------------------------------------+
|              YOU                     |
|   [-1 zone]     40      [+1 zone]    |
|   hold: -5             hold: +5      |
+--------------------------------------+
```

- Fullscreen `Scaffold`, no `AppBar`. Provide a small close/back affordance (e.g. a subtle `X` icon button in a corner of the center bar or via the system back gesture — system back is sufficient plus a small close icon in the center bar).
- Wrap in `SafeArea`. Both halves are `Expanded` so they split remaining space evenly around the fixed-height center bar.
- Opponent half: wrap the entire panel (life number, floating delta, tap zones) in `RotatedBox(quarterTurns: 2)`. Because the whole thing is rotated, its "left/-1, right/+1" zones are defined in its own rotated coordinates — implement one reusable `PlayerLifePanel` widget and rotate the opponent instance; the tap logic is then identical for both.
- Life number: very large (e.g. `fontSize` ~96–120, bold, Outfit via the theme's `displayLarge` with overrides). Show hero name in small text under the number when a hero is picked.
- Subtle `-`/`+` hint glyphs near the left/right edges of each half so the zones are discoverable.

---

## Part 2: Implementation Plan

Work from repo root `/Users/joseescaler/Documents/fabtrades`. All Flutter code lives under `apps/mobile`.

### Step 1 — Dependency

In `apps/mobile`, run `flutter pub add wakelock_plus`.

### Step 2 — Models: `apps/mobile/lib/features/life_tracker/life_tracker_models.dart`

Create (all with `toJson`/`fromJson`):

- `enum LifeFormat { cc, silverAge }` with getters: `label` ("Classic Constructed" / "Silver Age"), `roundDuration` (`Duration(minutes: 55)` / `35`), `defaultStartingLife` (40 / 40).
- `class PlayerConfig` — `String? heroName; int startingLife;`
- `class PlayerState` — `PlayerConfig config; int life; int pendingDelta; int lifeBeforePending;` (only `config` and `life`/`lifeBeforePending` need serializing; `pendingDelta` is transient, serialize as 0).
- `class LifeChangeEntry` — `bool isOpponent; int from; int to; int delta; DateTime at;`
- `class LifeTrackerState` — `LifeFormat format; PlayerState you; PlayerState opponent; List<LifeChangeEntry> history; int timerRemainingSeconds; bool timerRunning; DateTime? timerRunningSince;` plus `copyWith`.

### Step 3 — Repository: `apps/mobile/lib/features/life_tracker/life_tracker_repository.dart`

Mirror `apps/mobile/lib/core/data/settings_repository.dart`: constructor takes `SharedPreferences`, key `life_tracker_state`, `LifeTrackerState? load()` (null on absent/parse error — wrap in try/catch), `Future<void> save(LifeTrackerState)`. Trim history to last 200 entries in `save`.

### Step 4 — Provider: `apps/mobile/lib/features/life_tracker/life_tracker_provider.dart`

A `Notifier<LifeTrackerState>` (`NotifierProvider`) that:

- In `build()`: reads `ref.watch(sharedPreferencesProvider)` (from `core/providers.dart`), loads persisted state via the repository; falls back to a fresh CC game (both players at 40, timer 55:00 paused). On restore with `timerRunning == true`, subtract wall-clock elapsed since `timerRunningSince` from `timerRemainingSeconds` (clamp ≥ 0; if 0, set not running).
- Exposes methods: `adjustLife({required bool opponent, required int delta})` (clamps life ≥ 0, updates pendingDelta, restarts that player's settle timer), `commitPending(bool opponent)` (the settle logic from the spec; persists), `toggleTimer()`, `tickTimer()` or manage a periodic 1 s `Timer` internally while running, `setFormat(LifeFormat)`, `setHero({required bool opponent, String? heroName, int? life})`, `setStartingLife({required bool opponent, required int life})`, `resetGame()`.
- Owns the two settle `Timer`s and the countdown `Timer`; cancels them in `ref.onDispose`.
- Persist via the repository only at the points listed in the spec (settle, timer toggle, settings change, reset) — also persist remaining time when the countdown reaches 0.

Keep the provider in the feature folder (it is feature-local), following the pattern of other feature-local providers.

### Step 5 — Hero picker: `apps/mobile/lib/features/life_tracker/hero_picker.dart`

- A `heroOptionsProvider = Provider<List<HeroOption>>` deriving from `ref.watch(catalogProvider)` per the "Hero data" rules above (`HeroOption` = small class: `name`, `life`, `imageUrl?`). Sort alphabetically.
- `showHeroPicker(BuildContext context) → Future<HeroOption?>` presenting a searchable list (bottom sheet with `DraggableScrollableSheet` or full-screen dialog — either is fine). Search filters with the token-matching rule. Include the "No hero (manual)" option returning a sentinel/null-hero result distinguishable from "dismissed".

### Step 6 — Main screen: `apps/mobile/lib/features/life_tracker/life_tracker_screen.dart`

`ConsumerStatefulWidget LifeTrackerScreen`:

- `initState`: `WakelockPlus.enable()`; `dispose`: `WakelockPlus.disable()`.
- Body per the layout sketch. Build one reusable private `_PlayerLifePanel` widget (life number, hero name, floating delta overlay via `AnimatedOpacity`/`AnimatedSlide`, left/right `GestureDetector`s with `onTap`, `onLongPressStart`, `onLongPressEnd`, `onLongPressCancel`; the hold-repeat `Timer.periodic(450ms)` lives in this widget's state and is cancelled on end/cancel/dispose). Opponent instance wrapped in `RotatedBox(quarterTurns: 2)`.
- Center bar row: history `IconButton` (`Icons.history`) → history bottom sheet; timer chip (MM:SS, tap toggles, red at 0, dim/secondary style when paused); settings `IconButton` (`Icons.tune` is taken by app settings in the menu, use `Icons.settings_outlined`); small close `IconButton` (`Icons.close`) popping the route.
- History sheet and settings sheet per the behavioral spec (can be private widgets in this file or small sibling files `audit_history_sheet.dart` / `tracker_settings_sheet.dart` if this file exceeds ~400 lines).
- Add light haptics on tap/hold ticks: `HapticFeedback.selectionClick()`.

### Step 7 — Menu entry: `apps/mobile/lib/app/app.dart`

In `_AppMenuDrawer`, add a `ListTile` between "My Account" and "Settings":

```dart
ListTile(
  leading: const Icon(Icons.favorite_outline),
  title: const Text('Life Tracker'),
  onTap: () {
    Navigator.of(context).pop();
    Navigator.of(parentContext).push(
      MaterialPageRoute(
        builder: (_) => const LifeTrackerScreen(),
        settings: const RouteSettings(name: 'Life Tracker'),
      ),
    );
  },
),
```

Import the screen at the top of `app.dart` following the existing feature imports.

### Step 8 — Verify

1. `cd apps/mobile && flutter analyze` — zero new issues.
2. If the repo has tests running (`flutter test`), make sure nothing breaks. Add a small unit test for the provider's settle/commit logic and timer restore math in `apps/mobile/test/life_tracker_test.dart` if a `test/` directory with similar tests exists; model it on existing tests.
3. Manual checklist (run on simulator):
   - Menu → Life Tracker opens; both halves render, opponent upside down.
   - Tap left/right adjusts by ∓1; floating delta accumulates and fades ~2.5 s after last tap; exactly one history entry per settled burst; +1 then −1 within the window produces no entry.
   - Hold left/right repeats ∓5 while held.
   - Life never goes below 0.
   - Timer: CC starts at 55:00, Silver Age at 35:00; tap toggles; red at 0:00.
   - Settings: format switch resets timer; hero search finds e.g. "Bravo" and fills life; starting life editable; Reset (with confirm) restores starting lives, clears history, resets timer.
   - Kill and relaunch the app mid-game: lives, history, settings, and (running) timer restore correctly.
   - Screen does not auto-sleep while the tracker is open.

### Out of scope

Do not add: more than 2 players, Blitz or other formats, poison/counters, dice/coin flip, analytics events, cloud sync of game state, landscape layout.
