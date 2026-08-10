# Bench Runbook — Device Gates T1.4 & T5.2 (Story 1.1)

**Story:** 1.1 — Technical spike (engine TS + board Skia + benchmark CI)
**Goal:** Close the AC-4 evidence gap (Skia board renders on a physical iOS device with a real frame rate recorded) and the T1.4 gap (dev build boots on device).
**Budget (architecture §S1.1 Level 2):** **p99 < 16.7 ms/frame** with feel preset "full" (spike records the baseline; full scheduled device job is a later story).
**Status:** **DEFERRED (2026-08-10)** — physical device + Apple Developer account postponed; resume when hardware is available. **Simulator validation completed 2026-08-10 (see §6).**

## ⚡ Simulator results (2026-08-10) — validation done, gate NOT closed

- **T1.4 partial:** dev build boots + Skia board renders in **iOS Simulator** (iPhone 17 Pro, Xcode 26.6). No Apple Developer account needed for simulator.
- **T5.2 informative:** `useFrameRateBaseline` recorded **60 fps · p99 16.67ms · 120 frames** (simulator; Mac GPU — not representative of device).
- **Bug found & fixed:** Worklets "Tried to synchronously call a Remote Function" in `useFrameRateBaseline.ts` — `setStats` called from the UI-thread worklet. Fixed with `runOnJS(setStats)(...)`.
- **Still OPEN:** physical-device p99 < 16.7ms baseline (AC-4 strict evidence) — needs iPhone + Apple Developer account for code signing.

---

## 1. Prerequisites

- [ ] Mac with **Xcode** (latest stable) + command line tools
- [ ] **CocoaPods** installed (`pod --version`)
- [ ] **Node 26** (`node --version` → `>=26`)
- [ ] **Physical iOS device** (iPhone; Expo Go is NOT a target — development build only)
- [ ] Device **connected via USB**, unlocked, trusted, and Developer Mode enabled (iOS 16+)
- [ ] `triade/` deps installed (`cd triade && npm ci`)
- [ ] Repo on branch `feature/1-1-technical-spike-engine-ts-board-skia-benchmark-ci`

---

## 2. T1.4 — Dev build boots on a physical device

**AC evidence:** a dev build from the Expo SDK 57 `blank-typescript` scaffold boots and renders on the physical iPhone.

### Steps

```bash
cd triade
# Generate native projects (already scaffolded — re-run to pick up any config changes)
npx expo prebuild --clean

# Local dev build onto the connected device (Metro stays running)
npx expo run:ios --device
```

> Alternative: `npx eas build --profile development --platform ios` then install via `npx eas build:run` or the EAS QR/URL on the device. Local `run:ios` is the fastest loop for the bench.

### Pass criteria

- [ ] App launches on the physical device without a Metro redbox or native crash
- [ ] The **Skia 4×4 board** renders (static snapshot from `newGame(seedRng(20260808))`)
- [ ] The on-screen stats line shows **`recording frame rate baseline…`** then transitions to a populated baseline
- [ ] No forbidden stack: engine remains pure TS (render-only board, no rules in UI)

---

## 3. T5.2 — Record the real frame rate baseline

**AC evidence:** real fps + p99 recorded on the physical device (baseline for the device-level p99 < 16.7 ms job).

The instrumentation is already shipped: `triade/src/render/useFrameRateBaseline.ts` samples 120 frames via Reanimated `useFrameCallback` and `App.tsx` renders `baseline: <fps> fps · p99 <p99>ms · <n> frames`.

### Steps

1. Launch the dev build (per T1.4) with the device **in Release mode** if possible (`npx expo run:ios --device --configuration Release`) — Debug/JS-thread overhead inflates frame times and misleads the baseline.
2. Let the board render for the full recording window (120 frames). Watch the stats line settle.
3. **Record the numbers**: `fps`, `p99Ms`, `frames`.
4. **Worst-case probe** (optional for the spike baseline, required later): keep the board at max density and tap through a couple of effective moves (spawn + merge path) while the window records — this exercises the merge/spawn render path, not just a static board.
5. Repeat **3 runs**; record the median p99 as the baseline (per ADR-04 determinism practice).

### Pass criteria

- [ ] `p99Ms < 16.7` (budget) across the 3 runs
- [ ] Median p99 recorded with run-to-run spread noted (variance < ~2 ms is healthy)
- [ ] fps recorded (target: sustained ≥ 59 on a 60 Hz display; anything ≥ 55 with a 16.7ms p99 is an acceptable baseline for the scheduled job)

---

## 4. Record the evidence in `game-architecture.md`

Append/refresh the **S1.1 Spike Results** section (currently at `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md`), e.g.:

```markdown
**Device baseline (2026-08-XX):** dev build booted on <device model>, iOS <version>.
Frame-rate baseline (120-frame window, Release): <fps> fps · p99 <p99>ms · <n> frames
(median of 3 runs). Budget p99 < 16.7ms → <MET | EXCEEDED>. T1.4 + T5.2 closed.
```

- [ ] Device model + iOS version recorded
- [ ] Run numbers (3 runs) recorded
- [ ] Budget verdict recorded

---

## 5. Verify & re-run the gate

```bash
cd triade && node --test        # expect 39/39 pass
npx tsc --noEmit                 # expect clean
```

Then re-run the traceability gate for Story 1.1 (`bmad tea *trace`) — AC-4 moves to FULL and the expected gate decision is **PASS**.

- [ ] Suite green (39/39)
- [ ] Gate re-run → PASS

---

## Failure triage

| Symptom | Likely cause | Action |
| ------- | ------------ | ------ |
| `pod install` errors | CocoaPods version / Ruby | `sudo gem install cocoapods` or switch to Homebrew pods; check `triade/ios/Podfile` |
| Metro redbox on launch | Version mismatch vs Pinned Matrix | Verify `expo`, `react-native`, Skia, reanimated, worklets against `package.json` + architecture matrix |
| Board renders blank / black | Skia native module missing in build | Re-run `expo prebuild --clean` + full `run:ios` (Skia needs native linkage) |
| Stats line stuck on "recording…" | Reanimated/worklets not wired | `npx expo install --fix`; verify `babel-preset-expo` auto-adds `react-native-worklets/plugin` (SDK 57 — no `app.json` config plugin exists for worklets) |
| p99 > 16.7 ms | Debug-mode JS overhead | Re-run in `--configuration Release` before judging the baseline |
| Board never reaches 120 frames | WINDOW larger than session | The hook auto-completes at 120 frames (~2s at 60fps); keep the board on screen for the full window |

---

## Definition of done

- [ ] T1.4 PASS (dev build boots, board renders) — simulator done 2026-08-10; physical device **DEFERRED**
- [ ] T5.2 PASS (baseline recorded: fps + p99, 3 runs, budget verdict) — simulator informative reading done; physical device **DEFERRED**
- [ ] Evidence written into `game-architecture.md` §S1.1 Spike Results — simulator evidence recorded 2026-08-10
- [ ] Trace gate re-run → **PASS** — pending physical-device baseline
