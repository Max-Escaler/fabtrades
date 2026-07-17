# Changelog

All notable changes to **FAB Trades** are documented here. Mobile app versions
are tracked in `mobile/app/pubspec.yaml` (`version: name+build`).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — Mobile scanner reliability (working tree)

Builds on **1.0.1+4** / commit `better scan`. These fixes were validated on a
Pixel 6a after the pHash + OCR pipeline was already in place.

### Fixed

- **Two-frame lock never firing on a real phone.** Confirmation was keyed on
  printing `id`; FAB returns many pitch / foil / set rows for one physical card,
  so the top hit flipped every frame and the gate never reached 2. Now confirms
  on a **stripped card name** (all parentheticals removed); user picks pitch /
  finish from the locked list.
- **Empty OCR frames wiping progress.** Real Pixel OCR flickers empty between
  good reads. Pending hits now tolerate **up to two consecutive misses** before
  reset.
- **ML Kit exceptions aborting the whole frame.** OCR runs in its own try/catch
  so a `PlatformException` cannot discard a successful visual hash match.
- Name ranking prefers **longer distinctive token matches** (e.g.
  `"Harmonized Kodachi"` outranks bare `"Kodachi"`).

### Changed

- Richer `[DEBUG-scan]` logcat diagnostics (rotation, hash distance / z-score,
  OCR snippet or error, pending hits, LOCK events).

### Docs

- `mobile/docs/card-scanning-learnings.md` — full Pixel debug write-up, harness
  usage, and “what not to do” for future scanner work.

---

## [1.0.1+4] — 2026-07-16 — Mobile “better scan”

### Added

- Guide-region **card rectification** (`lib/core/scan/rectify.dart`) before
  pHash — recovers offset / scale / modest tilt; defers to the fixed guide crop
  when the card already fills the guide.
- Offline **accuracy harness** (`tool/evaluate_scan.dart`) comparing baseline vs
  rectified hashing under synthetic camera augmentations.
- Collector-number bonus in RRF fusion when OCR sees an `NNN/TTT`-style number
  (many FAB cards use set-code numbers instead — name OCR remains primary).
- Unit coverage for rectify + scan matching updates.

### Changed

- Frame hasher / pHash pipeline updated to feed rectified samples when useful.
- App version **1.0.1+4**.

### Notes

- Synthetic harness: rectification lifted overall top-1 ≈31%→47% and top-3
  ≈47%→73%, with large gains on misaligned (`offset` / `rotate10`) cases.
- Live Pixel pHash still rarely passes the 5σ outlier gate; OCR + confirm is the
  production path until phone visual matching improves.

---

## [1.0.0] — Mobile app introduced

### Added

- Flutter mobile app (`mobile/`) alongside the existing web trade balancer.
- Live streaming scanner: camera + ML Kit OCR + bundled pHash visual index,
  fused per frame, with two-frame auto-lock.
- Core trade / catalog flows ported for on-device use (see mobile app + web
  README for product surface).
