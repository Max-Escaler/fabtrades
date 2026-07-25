# Scan diagnostics mode — handoff notes

Context for debugging the card scanner (`lib/features/scan/scan_screen.dart`),
especially the iOS-not-scanning investigation. Everything here works on a
physical phone with **no tethered console** — including TestFlight builds.

## How the scanner works (30-second version)

Live camera frames stream through two independent, offline recognizers, then
the results are fused:

1. **Visual**: a 256-bit perceptual hash (pHash) of the card inside the
   on-screen guide rectangle, matched by Hamming distance against precomputed
   hashes of every catalog scan (`assets/scan/card_hashes.json`).
2. **OCR**: ML Kit Latin text recognition of the printed name + collector
   number.

`fuseScanCandidates` merges both lists; the same card identity on 2
consecutive frames locks the result. Frames are throttled to one processed
per 350 ms (`_throttle`).

Key files:

| File | Role |
|---|---|
| `lib/features/scan/scan_screen.dart` | UI, camera lifecycle, per-frame pipeline, diagnostics |
| `lib/core/scan/frame_hasher.dart` | camera frame → luma sampler → guide-rect crop → pHash |
| `lib/core/scan/phash.dart` | pure-Dart pHash + shared guide/viewport geometry constants |
| `lib/core/scan/rectify.dart` | card-outline (quad) detection inside the guide |
| `lib/core/scan/card_hash_index.dart` | hash asset loading + matching (z-score gate) |
| `lib/core/data/card_repository.dart` | `identifyCards`, `parseScanNumbers`, `fuseScanCandidates` |
| `test/core/scan/frame_hasher_test.dart` | synthetic-CameraImage regression tests (see below) |

## Enabling the debug overlay

Tap the **bug-report icon** in the scan screen's app bar. It toggles
`_showDiag` and starts a 1 Hz repaint ticker so the overlay stays live even
when no frames arrive. All overlay content is also mirrored to the console
as `[DEBUG-scan]` lines via `_recordDiag` (grep that tag when a console *is*
attached).

## Overlay anatomy

The overlay sits at the bottom of the camera viewport and has three parts:

### 1. Crop thumbnail (left)

A tiny grayscale image of the **exact 64×64 luma grid the visual matcher
hashed** for the last processed frame (stretched back to card aspect). It is
produced by the `onGrid` callback of `hashCameraFrame` and rendered via
`_updateDiagGrid`. This is ground truth for the sampling geometry:

- Recognizable upright card → geometry, rotation handling, and pixel
  interpretation are all correct; any match failure lies further downstream.
- Sideways / mirrored / offset card → rotation or guide-mapping bug.
- Noise / flat gray / stripes → wrong pixel format or stride interpretation.

### 2. Per-frame stats line

```
f=42 rot=90 hashRot=0 hash=ok best=18 z=9.1 vis=3 ocr=1 ("Snatch 121/225") 720x1280 bpr=2880 hashMs=11 ocrMs=80 totalMs=95
```

| Field | Meaning | Healthy value |
|---|---|---|
| `f=` | Processed-frame counter | climbing while scanning |
| `rot=` | Rotation given to ML Kit metadata (sensor orientation on iOS, computed on Android) | 90 typical |
| `hashRot=` | Rotation given to the pHash sampler. **iOS must be 0** (buffers arrive pre-rotated upright); Android uses `rot` | 0 on iOS |
| `hash=` | `ok` = frame format usable by the luma sampler; `null` = unsupported format/planes | `ok` |
| `best=` | Hamming distance of the best catalog hash (0–256) | ~10–35 when a card fills the guide; ~90+ is effectively random |
| `z=` | How many std-devs `best` is below the mean distance (match confidence gate) | high (≥ ~8) on a real match |
| `vis=` | Candidate cards from the visual signal | > 0 with a card in the guide |
| `ocr=` | Candidate cards from OCR; the parenthetical is the OCR note | > 0 when name/number legible |
| OCR note | `"text…"` = what ML Kit read; `empty` = ran but read nothing; `input=null …` = frame rejected before ML Kit (format/planes); `err=…` = ML Kit threw (incl. `TimeoutException` — see below); `skip` = not attempted | text snippet |
| `WxH` | Streamed buffer dimensions. iOS portrait upright ⇒ e.g. `720x1280`; Android sensor-oriented ⇒ e.g. `1280x720` | |
| `bpr=` | `bytesPerRow` of plane 0 (detects row padding; iOS BGRA tight = width×4) | `2880` at 720 wide |
| `hashMs/ocrMs/totalMs` | Stage timings | total well under 350 ms |

### 3. Liveness counters

```
rx=1234 proc=41 last=0s ago
```

- `rx` — every frame the camera stream delivered (incremented before any
  gating in `_processImage`).
- `proc` — frames that passed the throttle and were actually processed.
- `last` — seconds since the last completed pipeline pass.

**Decision tree:**

| Observation | Diagnosis |
|---|---|
| `rx` frozen | Camera stream itself died (plugin level, not our pipeline) |
| `rx` climbing, `proc`/`f=` frozen | Something inside `_processImage` is hung, latching the `_processing` flag — historically ML Kit's `processImage` on iOS |
| Both climbing, stats line updating | Pipeline is healthy; judge the *content* (thumbnail, `best`, OCR note) |
| No overlay updates and "Camera unavailable" box | Init failed — the box now shows the captured exception (`_cameraError`), as does the overlay |

## Built-in safeguards added during this investigation

- `_recognizer.processImage` is wrapped in a **3-second timeout** so a hung
  native call surfaces as `err=TimeoutException…` in the OCR note instead of
  silently killing the pipeline after one frame. The visual signal keeps
  running regardless.
- `_initCamera` / `_startStream` no longer swallow exceptions: failures land
  in `_cameraError` (shown in the overlay and in the "Camera unavailable"
  placeholder) and in the `[DEBUG-scan]` log.

## State of the iOS investigation (as of 2026-07-24)

**Fixed:** iOS visual matching was permanently dead because
`camera_avfoundation` sets `videoOrientation` on the image-stream connection
to the device orientation, i.e. **iOS streamed buffers arrive already rotated
upright**, while the scan screen passed `sensorOrientation` (90°) to the
hasher as if they were raw sensor frames (correct only on Android/Camera2).
The hasher therefore sampled a sideways wrong region every frame. Fix:
`hashRotation = Platform.isIOS ? 0 : rotation` in `_processImage`. ML Kit
metadata still gets the sensor rotation — its iOS converter
(`MLKVisionImage+FlutterPlugin.m` in `google_mlkit_commons`) ignores the
rotation field entirely and uses only width/height/format/bytesPerRow.

**Resolved (2026-07-24):** fresh overlay screenshots showed `rx=5 proc=1
last=13–19s ago` — `rx` frozen while the preview stayed live, i.e. hypothesis
2: the camera stream itself stopped delivering at the plugin level. The ML
Kit-hang hypothesis is ruled out (the single OCR pass completed fine,
`ocrMs=149 (empty)`, no `TimeoutException`s).

Root cause: `camera_avfoundation` 0.10.x — the 0.10.0+3 "type-safe Pigeon
code for image streaming" rewrite. Native iOS sends a streamed frame only
while fewer than 4 are unacknowledged (`maxStreamingPendingFramesCount` in
`DefaultCamera.swift`); each delivered frame must be acked from Dart via
`receivedImageStreamData`, and that ack is an unawaited fire-and-forget
future whose failures are silently swallowed
(`avfoundation_camera.dart`, `_startStreamListener`). When the handshake
breaks the pending counter pins at 4 and delivery stops forever. The preview
survives because it is fed by the same native `captureOutput` callback via a
Flutter texture, not via the event channel. `rx=5` is the signature: 1 acked
frame + 4 that consumed the pending budget.

Fix applied in RiftTrades (same plugin versions as here — port both):

1. `dependency_overrides: camera_avfoundation: 0.9.23+2` (last release
   before the streaming rewrite; the app-facing `camera` 0.12 requires
   `^0.10.0`, hence an override rather than a constraint).
2. A 2 s stall watchdog in `scan_screen.dart`: if `rx` hasn't moved while
   streaming and unlocked, stop + restart the image stream. Restarting runs
   native `startImageStream`, which resets `streamingPendingFramesCount = 0`,
   so this recovers even on a broken 0.10.x. Restarts appear as `rst=N` in
   the overlay liveness line.

## Reproducing without a device

`test/core/scan/frame_hasher_test.dart` builds synthetic iOS-style BGRA
`CameraImage`s (via `CameraImage.fromPlatformInterface` +
`camera_platform_interface`, a dev dependency) and locks down:

- upright frame + rotation 0 ≈ catalog reference hash (Hamming < 40);
- rotation 90 on an upright frame destroys the match (regression for the bug
  above);
- padded `bytesPerRow` doesn't change the hash.

Run: `flutter test test/core/scan` (from `apps/mobile`). The guide-rect
geometry used by the tests is the same shared contract
(`kViewportAspect`, `kGuideWidthFraction`, `kGuideMaxHeightFraction`,
`kCardAspect`, `kGraySide`) exported by `frame_hasher.dart` from `phash.dart`.

## Gotchas / platform contract cheat sheet

- **iOS**: BGRA8888, single plane, buffers pre-rotated upright → hash
  rotation 0; ML Kit ignores rotation metadata; `bytesPerRow` may exceed
  width×4 (handled by the stride-aware luma sampler).
- **Android**: NV21 via the direct `camera_android` (Camera2) dependency —
  CameraX mis-labels buffers and breaks ML Kit. Frames are sensor-oriented →
  hash and ML Kit both need the computed rotation. Undersized NV21 buffers
  are rejected before ML Kit (native NPE otherwise).
- The lock gate keys on card *name* stripped of parentheticals
  (`_scanConfirmKey`), not printing id — OCR flips between foil/pitch
  variants frame-to-frame and printing-id keying never reaches 2 hits.
- One OCR miss must not reset the pending lock (`_pendingMisses < 3`
  tolerance) — real devices flicker empty OCR between good frames.
