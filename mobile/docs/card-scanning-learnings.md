# Card scanning learnings (July 2026)

What we learned shipping and debugging the FAB Trades live scanner on a real
Pixel 6a, after the pHash + OCR pipeline was already in place. Use this when
changing `app/lib/features/scan/` or `app/lib/core/scan/`.

---

## 1. Where the scanner stands

**Working path today:** OCR (ML Kit) + two-frame confirmation, with visual pHash
as a secondary signal that rarely wins on a phone camera.

**Shipped improvements in this pass:**

| Change | Why |
|---|---|
| Offline accuracy harness (`tool/evaluate_scan.dart`) | Measure baseline vs rectified pHash under synthetic camera conditions |
| Guide-region card rectification (`lib/core/scan/rectify.dart`) | Recover offset / scale / modest tilt before hashing; defer to fixed crop when the card already fills the guide |
| Collector-number bonus in RRF fusion | Boost candidates whose printed number agrees with OCR |
| OCR errors isolated from visual path | An ML Kit `PlatformException` must not discard a whole frame |
| Confirmation key = stripped card name (not printing id) | Pitch / foil / set variants were flipping the lock forever |
| Tolerate 1–2 empty OCR frames | Real-device OCR flickers empty between good reads |
| Prefer longer name-token matches | `"Harmonized Kodachi"` outranks bare `"Kodachi"` |

App version that packaged these fixes: **1.0.1+4**.

---

## 2. Desktop webcam ≠ Pixel camera

The scanner once “worked” on a Windows webcam and then appeared completely
broken on a Pixel back camera. That was not one bug — it was several stacking
differently by platform.

| Factor | Webcam (Windows) | Pixel 6a |
|---|---|---|
| Stream format | BGRA8888 | NV21 via **camera_android** (Camera2). CameraX
  (`camera_android_camerax`) often mis-labels buffers → ML Kit
  `InputImageConverterError` NPE on every frame — do not use it with OCR. |
| Sensor orientation | Often 0° | Typically 90°; stream stays 1280×720 landscape |
| OCR reliability | Relatively steady | Flickers empty between good frames; can throw `PlatformException` |
| Printing variants in OCR hits | Felt fine | 6–12 Red/Yellow/Blue + foil + set rows for one physical card |
| Visual pHash vs catalog | Closer framing → sometimes usable | `best ≈ 90–100` Hamming bits, z ≈ 3.5–4.0 vs 5σ gate → almost always rejected |

**Lesson:** Never trust “it worked on desktop camera” as proof the Android path
is healthy. Validate on a physical phone with logcat/`debugPrint` diagnostics.

---

## 3. Root causes that made Pixel scanning feel dead

### 3.1 Two-frame gate keyed on printing `id` (primary lock bug)

OCR correctly read names (`Templar Spellbane`, `Hot Streak`, `Throttle`, …) and
returned many catalog printings. Confirmation used `matches.first.id`.

FAB reality:

- Same card name → many printings (pitch colors, foil, sets).
- `baseCardName` still keeps pitch qualifiers (`(Red)` / `(Yellow)` / …).
- Top-of-list printing flipped every frame → pending hits reset → **never locked**.

**Fix:** Confirm on a stripped name key (all parentheticals removed, lowercased),
then lock the fused candidates that share that key. User picks the right
pitch/set from the list.

### 3.2 Empty OCR frames wiping progress

Even after the key fix, good frames alternated with `ocr=0 (empty)`. Clearing
pending on every empty frame meant the gate rarely reached 2.

**Fix:** Allow up to two consecutive misses while a pending key is in flight
before resetting.

### 3.3 OCR exceptions aborted the whole frame

`_processImage` wrapped visual + OCR in one `try/catch`. On release builds we
saw `PlatformException` from ML Kit on every frame; that discarded visual work
too (even though visual was already weak).

**Fix:** Run OCR in its own try/catch; fuse whatever visual + OCR produced.
Also enforce the ML Kit contract: Android = single-plane NV21 only (match
`google_mlkit_commons` docs).

### 3.4 Visual pHash is not phone-ready yet

Live Pixel stats with a card in the guide:

```
hash=ok best≈90–100 mean≈120–130 z≈3.5–4.0  →  CardHashIndex rejects (needs z ≥ 5)
```

So the hash runs, but the probe is still far from clean catalog scans. The
outlier gate is correctly saying “this isn’t a confident catalog hit.” Lowering
the threshold alone would accept desk noise (we also saw z ≈ 3.4 on non-card
frames).

Harness result (synthetic, 120 catalog images) after rectification:

| | Baseline top-1 / top-3 (reject) | Rectified |
|---|---|---|
| Overall | ~31% / ~47% (48%) | ~47% / ~73% (14%) |
| Aligned (`clean` / `bright` / …) | ~62% / ~92% | ~parity (defer-to-guide) |
| Misaligned (`offset` / `rotate10`) | ~0% | ~40% / ~60% |

Rectification helps synthetic misalignment a lot; **real phone photos are a
harder domain** (lighting, foil, imperfect fill, residual geometry mismatch).

---

## 4. How we diagnosed it (feedback loop)

Instrument `_processImage` with tagged logs:

```
[DEBUG-scan] rot=… hash=ok|null best=… z=… vis=N ocr=N ("snippet"|empty|err=…)
[DEBUG-scan] pending=… hits=…
[DEBUG-scan] LOCK key="…" n=…
```

Capture with:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb -s <deviceId> logcat -c
# hold a card in the guide for ~10s
& $adb -s <deviceId> logcat -d | Select-String "DEBUG-scan"
```

What the loop proved on device:

1. Format/rotation/catalog/hash index were fine (`nv21/17`, `rot=90`, idx≈9723).
2. OCR *was* reading card text → not a “camera broken” problem.
3. `vis=0` always → visual path not contributing.
4. No `LOCK` until confirmation key ignored pitch/printing id.

**Lesson:** For camera ML, a red-capable on-device diagnostic beats theorizing
from desktop-only tests.

---

## 5. Accuracy harness (keep using it)

From `mobile/app/`:

```bash
dart run tool/evaluate_scan.dart --samples=200 --seed=1
dart run tool/evaluate_scan.dart --offline
dart run tool/evaluate_scan.dart --augs=offset,rotate10,tilt
```

Compares **fixed guide crop** vs **rectified** hashing against the bundled
`assets/scan/card_hashes.json`. Use it before changing pHash thresholds,
rectify config, or regenerating the hash asset.

Regenerate catalog hashes after set releases:

```bash
dart run tool/generate_card_hashes.dart
```

---

## 6. Architecture notes that matter

### Pipeline (per frame)

1. Throttle (~350 ms).
2. pHash of guide region (optional rectify) → `CardHashIndex.match` (5σ outlier).
3. ML Kit OCR → `identifyCards` → `parseScanNumbers`.
4. `fuseScanCandidates` (RRF + optional number bonus).
5. Two-frame confirm on `_scanConfirmKey` → lock → show list.

### Geometry contract

`frame_hasher.dart` / `phash.dart` share viewport + guide constants with the
scan overlay. Preview uses `BoxFit.cover`; the hasher samples the same region
in rotated sensor space. If you change the overlay, change the hasher.

### Rectification policy

Detect a card quad only when it **meaningfully differs** from the guide
(`quadMatchesGuide`); otherwise keep the fixed inset crop so well-framed scans
don’t regress.

### Fusion

Visual alone or OCR alone is allowed. Collector-number bonus only applies when
OCR saw an `NNN/TTT`-style number (many FAB cards use set-code numbers instead,
so name OCR remains primary).

---

## 7. What not to do

- **Don’t** key two-frame confirmation on printing `id` for FAB.
- **Don’t** let OCR failures abort visual matching.
- **Don’t** clear pending hits on the first empty OCR frame.
- **Don’t** lower the pHash σ threshold without an absolute distance cap and
  harness + device numbers — false accepts look like “random card locked.”
- **Don’t** send non-NV21 / multi-plane buffers to ML Kit on Android.
- **Don’t** treat cloud LLM-per-frame as a live-scanner strategy (latency, cost,
  offline).

---

## 8. Open follow-ups (in priority order)

1. **Phone visual match** — close the gap between live crops and catalog hashes
   (guide/preview geometry audit, optional tighter crop alignment in
   `generate_card_hashes.dart`, absolute `best < N` gate alongside z-score).
2. **Phase 2 embeddings** (MobileCLIP / metric learning) once the harness shows
   pHash saturating on glare/foil/tilt — already researched in
   `card-scanning-research.md` (RiftTrades docs).
3. **Remove or gate `[DEBUG-scan]` logs** for production if volume is noisy
   (keep them behind a debug flag).

### Resolved: release-only ML Kit failure was R8, not model download

Release builds threw `PlatformException(InputImageConverterError,
NullPointerException ... getClass()' on a null object reference)` on **every**
OCR frame while debug worked. Root cause: AGP 9 turned on strict R8 full-mode
keep-rule enforcement, which is incompatible with ML Kit's shipped consumer
ProGuard rules — R8 stripped the recognizer's internal protobuf-reflection
classes (googlesamples/mlkit#1001, #1018). Fixed by
`android.r8.strictFullModeForKeepRules=false` in `android/gradle.properties`;
remove once ML Kit ships AGP 9-compatible rules. Symptom fingerprint: obfuscated
`r8-map-id-…` stack frames ending in an internal `<init>`, deterministic in
release, absent in debug.

---

## 9. Key files

| Path | Role |
|---|---|
| `app/lib/features/scan/scan_screen.dart` | Camera stream, fusion, confirm/lock |
| `app/lib/core/scan/phash.dart` | DCT pHash + shared guide constants |
| `app/lib/core/scan/frame_hasher.dart` | Camera frame → hash (rectify + fallback) |
| `app/lib/core/scan/rectify.dart` | Edge/quad detection + quad sampling |
| `app/lib/core/scan/card_hash_index.dart` | Brute-force Hamming + outlier gate |
| `app/lib/core/data/card_repository.dart` | `identifyCards`, `fuseScanCandidates`, `parseScanNumbers` |
| `app/tool/evaluate_scan.dart` | Offline accuracy harness |
| `app/tool/generate_card_hashes.dart` | Rebuild `assets/scan/card_hashes.json` |
| `app/assets/scan/card_hashes.json` | Bundled visual index |

---

## 10. One-line summary

On a real Android phone, **OCR was working but the lock logic wasn’t**; visual
pHash still needs a phone-quality upgrade. Fix confirmation identity and OCR
resilience first; measure visual changes with the harness before trusting them
in production.
