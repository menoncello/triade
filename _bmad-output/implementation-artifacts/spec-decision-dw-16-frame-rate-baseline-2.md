---
title: 'Decision DW-16 on-device frame-rate baseline via seeded session (re-measurement)'
type: 'chore'
created: '2026-09-07'
status: 'blocked'
baseline_revision: 64f61c6144722b38c5c313beeef5747a961ac488
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** DW-16 is open: the only frame-rate evidence is the 2026-08-10 simulator informative reading (60 fps · p99 16.67ms · 120 frames, Mac GPU) plus a 2026-09-06 blocked attempt that reached laneSelect but never the board (host cannot synthesize taps), and the human chose "Measure baseline now" — drive a seeded session through useFrameRateBaseline and record fps and p99 (shared with DW-32).

**Approach:** Boot the app on the iOS Simulator (paired iPhone 14 Pro as fallback) with the shipped restartable 120-frame useFrameRateBaseline window covering board frames via the __DEV__-only auto-drive, and write the fps · p99Ms · frames readout plus run context into the durable evidence file.

## Boundaries & Constraints

**Always:** Keep product code untouched unless a boot-blocking fix is unavoidable (then document it); record numbers verbatim with build configuration (Debug/Release), device/simulator model plus OS version, and seed; use the deterministic seeded session path; respect the hard rule that worklets and frame math never log in release.

**Block If:** No simulator runtime is available and the paired iPhone is unreachable or locked; code signing or provisioning demands human intervention; the app fails to reach the board screen even with the auto-harness.

**Never:** Submit to TestFlight or the App Store; tune engine or render code for the frame budget; change the useFrameRateBaseline window size or fps/p99 math; edit the deferred-work ledger (the orchestrator records resolution); close DW-32 (only share the evidence).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Simulator (or paired iPhone) boots the dev build with auto-drive and the seeded session plays through the restarted 120-frame board window | Evidence file holds at least one board-frame fps · p99Ms · frames readout with config, model/OS, and seed | No error expected |
| NO_RUNTIME | No simulator runtime and `devicectl list devices` shows no available physical device | HALT blocked with `no simulator or device runtime` plus the observed listings | Do not attempt the build; record the listings in the evidence file |
| DEVICE_LOCKED | Physical-device install fails with the device-locked CommandError | HALT blocked with `physical iOS device locked` plus the verbatim error | Record the verbatim error in the evidence file |
| DEBUG_ONLY_BASELINE | Release-configuration build fails or times out | Record the Debug-mode baseline as informative with the limitation noted | Budget verdict marked provisional, not a failure |
| HARNESS_STUCK | runSeededSession exceeds its move cap | Host check fails fast with the stuck-seed message | Record the seed and move counts; do not invent frame numbers |

</intent-contract>

## Code Map

- `triade/src/render/useFrameRateBaseline.ts` -- Restartable 120-frame probe via `useFrameCallback` with `generation` reset (DW-32 AC-5); computes `fps = 1000/avgMs`, `frames = samples.length`, `p99Ms = sorted[floor(n*0.99)]`, publishes through `runOnJS(setStats)`. WINDOW and math untouched.
- `triade/App.tsx:116-117,1007-1048,1225-1229` -- Calls `useFrameRateBaseline(baselineGeneration)`, restarts generation on playing-screen mount, `__DEV__`-only auto-drive (`EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` boots straight to board and cycles left/up/right/down via `doMoveRef` every 500ms), renders `baseline: <fps> fps · p99 <p99>ms · <n> frames` on the playing screen; boots `newGame(mulberry32(20260808))`.
- `triade/test-utils/helpers.ts` -- `runSeededSession(seed, targetSpawns)` deterministic harness (mulberry32, cycling left/up/right/down, restart on stale>=8 or game-over, fails fast past `targetSpawns*500+5000` moves).
- `triade/src/render/GameBoard.tsx` -- Skia 4x4 board under measurement; observe only.
- `_bmad-output/implementation-artifacts/1-1-device-gates-runbook.md` -- T5.2 runbook: Release preferred, 3 runs median p99, budget p99 < 16.7ms, fps target >= 59 on 60Hz.
- `_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md` -- Durable evidence file to extend with this run's readout (shared with DW-32).

## Tasks & Acceptance

**Execution:**
- [ ] `triade/` -- boot the dev build on the iOS Simulator (fallback: paired iPhone 14 Pro) with `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` so the seeded auto-drive reaches the board without manual taps while the restarted 120-frame window records; capture the on-screen `fps · p99Ms · frames` readout via screenshot -- DW-16 T5.2 board-frame evidence. (2026-09-07: PARTIAL — board reached via auto-drive with no redbox/crash, screenshots show scores 36 → 450 → 9 → 156; completed `baseline:` readout NEVER appeared, `stats` stayed null across ~4 min. Left unchecked.)
- [x] `triade/test-utils/helpers.ts` (consume only) -- run the deterministic `runSeededSession(20260808, 200)` host check twice via the project tsx loader to prove the seeded session completes deterministically without the stuck failure -- session determinism proof. (2026-09-07: 200 spawns, first5 [2,1,1,3,2], ms 4/1, deterministic:true, exit 0.)
- [x] `_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md` -- extend with this run's runtime identity, commands with exit codes, seed, at least one board-frame readout (or the verbatim blocking error), budget verdict vs p99 < 16.7ms, and the shared-with-DW-32 flag -- durable evidence for the orchestrator. (2026-09-07: extended with 2026-09-07 section, verbatim `recording frame rate baseline…` observation, no-verdict note, shared-with-DW-32 flag.)

**Acceptance Criteria:**
- Given the simulator or iPhone is reachable, when the dev build launches with the auto-harness, then the app reaches the board without a Metro redbox or native crash.
- Given the board renders, when the restarted 120-frame window completes during the seeded session, then at least one board-frame `fps · p99Ms · frames` readout is recorded with build configuration and seed noted.
- Given the host check runs, when `runSeededSession(20260808, 200)` executes twice, then both runs complete with identical spawn output and no stuck failure.
- Given the run finishes (pass or blocked), when the agent exits, then `dw-16-frame-rate-baseline-evidence.md` exists with runtime identity, run outcome, and numbers or the verbatim blocking error.

## Spec Change Log

## Auto Run Result

Status: blocked
Blocking condition: implementation verification failed — the app reached the board via the __DEV__ auto-drive with no redbox/crash, but the restarted 120-frame window never published, so no fps · p99Ms · frames readout exists.
Detail: simulator iPhone 17 Pro (iOS 26.5, already Booted) Debug dev build with `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` succeeded with 0 errors and booted straight to the playing screen; 4 screenshots over ~4 min show the Skia 4x4 board playing (scores 36 → 450 → 9 → 156) with the verbatim on-screen text `recording frame rate baseline…` (`stats` null throughout) — the completed `baseline: <fps> fps · p99 <p99>ms · <n> frames` readout never appeared. Diagnosing/fixing the probe would mean touching `useFrameRateBaseline` window wiring, which this spec's Never constraint forbids (probe owns to DW-32) — so the missing work cannot be completed here. Host determinism proof passed (`runSeededSession(20260808, 200)` twice → identical spawns, 4ms/1ms, deterministic:true); `npx tsc --noEmit` clean; `npm test` 1024 pass / 0 fail / 445 skipped. No `triade/` code touched. Full evidence: `dw-16-frame-rate-baseline-evidence.md` 2026-09-07 section (shared with DW-32). Two findings for the orchestrator: (1) the DW-16 tap block is gone (auto-drive works — board reached with zero manual input); (2) the new blocker is probe-side (`useFrameCallback` window never accumulates/publishes in this build, or the generation restart never settles) — needs DW-32 follow-up, not another DW-16 measurement run as-is.

## Review Triage Log

## Verification

**Commands:**
- `xcrun simctl list devices available` -- expected: at least one iOS simulator runtime listed
- `xcrun devicectl list devices` -- expected: fallback device state noted (available or unavailable)
- `cd triade && npx tsc --noEmit` -- expected: clean
- `cd triade && npm test` -- expected: suite green via the project tsx runner (1012 pass / 0 fail baseline, skips pre-existing)
