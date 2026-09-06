---
title: 'DW-15 physical iOS device boot validation'
type: 'chore'
created: '2026-09-06'
status: 'blocked'
baseline_revision: 4612e870271ad3cdb897e93cc98b4afb059207dd

## Auto Run Result

Status: blocked
Blocking condition: physical iOS device locked at install time — human must unlock the iPhone and re-run install+launch.
Detail: prebuild exit 0; Debug device build SUCCEEDED with 0 errors and automatic signing worked; install/launch failed twice with verbatim `CommandError: Cannot launch triade on Eduardo's iPhone (2) because the device is locked.` No boot, no board render, no frame baseline observed. Signed Debug build is cached — re-run `npx expo run:ios --device 00008120-00023C440263C01E` from `triade/` with the phone unlocked. Full evidence: `dw-15-physical-boot-evidence.md`. Side note: spec premise "ios/ checked in with DEVELOPMENT_TEAM" was inaccurate — `triade/ios/` is gitignored and prebuild regenerates it team-less; signing still succeeded.
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** DW-15 is open: dev-build boot plus Skia board render was validated only on the iOS Simulator (2026-08-10); physical-device evidence (boot, board render, frame-rate baseline) is missing and the human chose "Run physical boot now".

**Approach:** Run incremental Expo prebuild (no --clean, preserving the checked-in `ios/` project with signing team `J9ZC6MPSYV`), then `npx expo run:ios --device` onto the paired iPhone 14 Pro and record boot plus Skia board render evidence with frame-baseline numbers.

## Boundaries & Constraints

**Always:** Preserve the existing `ios/` signing configuration; record device model, iOS version, and run numbers verbatim; keep product code untouched unless a boot-blocking fix is unavoidable (then document it).

**Block If:** The paired iPhone becomes unreachable mid-run; code signing or provisioning demands human intervention (Apple ID, certificates, paid-account actions); the build fails for credential reasons; any step requires interactive device unlock/trust that cannot be completed unattended.

**Never:** Submit to TestFlight or the App Store; tune engine/render code for the frame budget; run `prebuild --clean` without a backup of `ios/`; edit the deferred-work ledger (the orchestrator records resolution).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | iPhone paired and reachable via devicectl | App launches, Skia 4x4 board renders, baseline numbers recorded | No error expected |
| DEVICE_UNREACHABLE | `devicectl list devices` shows no available physical device | HALT blocked with `no physical iOS device connected` plus the observed device listing | Do not attempt the build; record evidence of unavailability |
| SIGNING_FAILURE | Xcode archive fails on signing/provisioning | HALT blocked with `ios signing requires human action` plus the verbatim Xcode error | No code changes to work around signing |
| DEBUG_ONLY_BASELINE | Release-configuration device build fails or times out | Record Debug-modeo baseline as informative (not budget verdict), note the limitation | Budget verdict marked provisional, not a failure |

</intent-contract>

## Code Map

- `triade/index.ts` -- Expo entry: `registerRootComponent(App)`.
- `triade/App.tsx` -- Root boot: `newGame(mulberry32(20260808))` snapshot, `preloadAssets()` + hydration, then ToneScreen/LaneSelectScreen; GameBoard mounts on `screen==='playing'`.
- `triade/app.json` -- Expo config: slug `triade`, bundle id `com.menontech.triade`, plugins `expo-secure-store`, `expo-asset`, `react-native-google-mobile-ads` (test IDs).
- `triade/src/render/GameBoard.tsx` -- 4x4 Skia board (Canvas/Group/RoundedRect/Text), AnimatedTile via Reanimated shared values.
- `triade/src/render/transitionPlan.ts` -- Pure trace-to-transition mapper driving the board.
- `triade/src/render/useFrameRateBaseline.ts` -- One-shot 120-frame probe via `useFrameCallback`, returns `{fps, frames, p99Ms}` through `runOnJS(setStats)`.
- `triade/ios/triade.xcodeproj/project.pbxproj` -- Checked-in native project with `DEVELOPMENT_TEAM = J9ZC6MPSYV`; must survive prebuild (hence incremental, no --clean).
- `triade/package.json` -- Pins: expo ~57.0.11, RN 0.86.2, Skia 2.6.2, Reanimated 4.5.1, worklets 0.10.1; engines node>=26.

## Tasks & Acceptance

**Execution:**
- [ ] `triade/` -- run `npx expo prebuild` (incremental, no --clean) and confirm `ios/` signing project intact -- preserves checked-in native config while picking up app.json drift.
- [ ] `triade/` -- run `npx expo run:ios --device` targeting the paired iPhone 14 Pro and confirm the dev build launches without redbox or native crash -- DW-15 T1.4 physical evidence.
- [ ] `triade/src/render/useFrameRateBaseline.ts` (observe only) -- capture the on-screen `fps · p99 · frames` readout for at least 1 run (3 runs in Release if time permits) -- DW-15 T5.2 physical evidence.
- [ ] `_bmad-output/implementation-artifacts/dw-15-physical-boot-evidence.md` -- write device model, iOS version, boot result, board-render confirmation, and baseline numbers -- durable evidence for the orchestrator.

**Acceptance Criteria:**
- Given the iPhone is paired and reachable, when `npx expo run:ios --device` completes, then the app launches on the physical device without a Metro redbox or native crash.
- Given the app boots on the device, when the session reaches the board, then the Skia 4x4 board renders visibly (photo or observed readout).
- Given the board renders, when the 120-frame window completes, then at least one `fps · p99Ms · frames` readout is recorded with the build configuration (Debug/Release) noted.
- Given the run finishes (pass or blocked), when the agent exits, then `dw-15-physical-boot-evidence.md` exists with device identity, run outcome, and baseline numbers or the verbatim blocking error.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `xcrun devicectl list devices` -- expected: iPhone 14 Pro `DD0414C7-175F-54F0-B474-42F213FD3ABD` state `available (paired)`
- `cd triade && node --test` -- expected: suite green (pre-existing gate, unchanged by this chore)
- `cd triade && npx tsc --noEmit` -- expected: clean
