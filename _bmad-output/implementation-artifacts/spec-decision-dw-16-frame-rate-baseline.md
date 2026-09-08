---
title: 'Decision DW-16 on-device frame-rate baseline via seeded session'
type: 'chore'
created: '2026-09-06'
status: 'blocked'
baseline_revision: e4c11abc8edb9e82b8eb77a182237870f5dc894f
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

## Auto Run Result

Status: blocked
Blocking condition: implementation verification failed — the app never reached the board screen, so no fps · p99Ms · frames readout exists.
Detail: simulator iPhone 17 Pro (iOS 26.5) booted, Debug dev build succeeded with 0 errors, app reached laneSelect with no redbox/crash (screenshot-verified); `Play` could not be activated because the run host cannot synthesize taps into the simulator (`osascript is not allowed assistive access (-1719)`, Quartz CGEventPost verified no-op, no idb/maestro/detox on host) and the fallback iPhone 14 Pro reports `unavailable` in devicectl. Host determinism proof passed (`runSeededSession(20260808, 200)` → 200 spawns in 4ms, byte-identical across runs); `npx tsc --noEmit` clean; `npm test` 1012 pass / 0 fail / 426 skipped (bare `node --test` needs the project's tsx loader — pre-existing runner shape, not a regression). No `triade/` code touched. Full evidence: `dw-16-frame-rate-baseline-evidence.md` (shared with DW-32). Two findings for the orchestrator: (1) reaching the board needs a human (grant assistive access or tap `Play` on simulator/device, or unlock/reconnect the iPhone and re-run); (2) the probe is one-shot from `AppContent` mount, so even a later manual `Play` tap would report launch-screen frames, not board frames — a re-measurement protocol (tap within ~2s of launch, or relaunch-then-tap) is needed before the numbers can mean anything.

<intent-contract>

## Intent

**Problem:** DW-16 is open: the only frame-rate evidence is the 2026-08-10 simulator informative reading (60 fps · p99 16.67ms · 120 frames, Mac GPU), and the human chose "Measure baseline now" — drive a seeded session through useFrameRateBaseline and record fps and p99 (shared with DW-32).

**Approach:** Boot the app on the iOS Simulator (physical iPhone 14 Pro as fallback), drive a deterministic seeded session while the shipped 120-frame useFrameRateBaseline window records, and write the fps · p99Ms · frames readout plus run context into a durable evidence file.

## Boundaries & Constraints

**Always:** Keep product code untouched unless a boot-blocking fix is unavoidable (then document it); record numbers verbatim with build configuration (Debug/Release), device/simulator model plus OS version, and seed; use the deterministic seeded session path; respect the hard rule that worklets and frame math never log in release.

**Block If:** No simulator runtime is available and the paired iPhone is unreachable or locked; code signing or provisioning demands human intervention; the app fails to reach the board screen.

**Never:** Submit to TestFlight or the App Store; tune engine or render code for the frame budget; change the useFrameRateBaseline window size or fps/p99 math; edit the deferred-work ledger (the orchestrator records resolution); close DW-32 (only share the evidence).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Simulator (or paired iPhone) boots the dev build and the seeded session plays through the 120-frame window | Evidence file holds at least one fps · p99Ms · frames readout with config, model/OS, and seed | No error expected |
| NO_RUNTIME | No simulator runtime and `devicectl list devices` shows no available physical device | HALT blocked with `no simulator or device runtime` plus the observed listings | Do not attempt the build; record the listings in the evidence file |
| DEVICE_LOCKED | Physical-device install fails with the device-locked CommandError | HALT blocked with `physical iOS device locked` plus the verbatim error | Record the verbatim error in the evidence file |
| DEBUG_ONLY_BASELINE | Release-configuration build fails or times out | Record the Debug-mode baseline as informative with the limitation noted | Budget verdict marked provisional, not a failure |
| HARNESS_STUCK | runSeededSession exceeds its move cap | Host check fails fast with the stuck-seed message | Record the seed and move counts; do not invent frame numbers |

</intent-contract>

## Code Map

- `triade/src/render/useFrameRateBaseline.ts` -- Shipped 120-frame one-shot probe via `useFrameCallback`; computes `fps = 1000/avgMs`, `frames = samples.length`, `p99Ms = sorted[floor(n*0.99)]`, publishes through `runOnJS(setStats)`.
- `triade/App.tsx` -- Calls `useFrameRateBaseline()` and renders `baseline: <fps> fps · p99 <p99>ms · <n> frames`; boots `newGame(mulberry32(20260808))` with reseed per new game.
- `triade/test-utils/helpers.ts` -- `runSeededSession(seed, targetSpawns)` deterministic harness (mulberry32, cycling left/up/right/down, restart on stale>=8 or game-over, fails fast past `targetSpawns*500+5000` moves).
- `triade/src/render/GameBoard.tsx` -- Skia 4x4 board under measurement; observe only.
- `_bmad-output/implementation-artifacts/1-1-device-gates-runbook.md` -- T5.2 runbook: Release preferred, 3 runs median p99, budget p99 < 16.7ms, fps target >= 59 on 60Hz.
- `_bmad-output/implementation-artifacts/dw-15-physical-boot-evidence.md` -- Evidence-file pattern to mirror (device identity, commands, verbatim outcome).

## Tasks & Acceptance

**Execution:**
- [ ] `triade/` -- boot the dev build on the iOS Simulator (fallback: paired iPhone 14 Pro via `--device`), drive a seeded session through the board while the 120-frame window records, capture the on-screen `fps · p99Ms · frames` readout -- DW-16 T5.2 evidence. (2026-09-06: PARTIAL — sim booted, Debug build+launch OK, laneSelect reached with no redbox; board NOT reached — host cannot synthesize taps, see evidence file. Left unchecked.)
- [x] `triade/test-utils/helpers.ts` (consume only) -- run the deterministic `runSeededSession(20260808, N)` host check to prove the seeded session completes without the stuck failure -- session determinism proof. (2026-09-06: N=200, 200 spawns in 4ms, deterministic:true, exit 0.)
- [x] `_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md` -- write runtime identity, commands, seed, at least one readout (or the verbatim blocking error), and the budget verdict -- durable evidence for the orchestrator. (2026-09-06: written with verbatim tap-block error, no-verdict budget note, shared-with-DW-32 flag.)

**Acceptance Criteria:**
- Given the simulator or iPhone is reachable, when the dev build launches, then the app reaches the board without a Metro redbox or native crash.
- Given the board renders, when the 120-frame window completes during the seeded session, then at least one `fps · p99Ms · frames` readout is recorded with build configuration and seed noted.
- Given the host check runs, when `runSeededSession(20260808, N)` executes, then it completes deterministically without the stuck failure.
- Given the run finishes (pass or blocked), when the agent exits, then `dw-16-frame-rate-baseline-evidence.md` exists with runtime identity, run outcome, and numbers or the verbatim blocking error.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `xcrun simctl list devices available` -- expected: at least one iOS simulator runtime listed
- `xcrun devicectl list devices` -- expected: iPhone 14 Pro `DD0414C7-175F-54F0-B474-42F213FD3ABD` state `available (paired)` (fallback path)
- `cd triade && node --test` -- expected: suite green (pre-existing gate, unchanged by this chore)
- `cd triade && npx tsc --noEmit` -- expected: clean
