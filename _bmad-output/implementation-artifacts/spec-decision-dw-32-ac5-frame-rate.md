---
title: 'Decision DW-32 AC-5 frame-rate re-target via useFrameRateBaseline plus seeded session'
type: 'chore'
created: '2026-09-06'
status: 'in-progress'
baseline_revision: 777eee1686949174359b265e3997e013e5f2b74c
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** AC-5 (60 FPS / 10-min session) has no rendering-side evidence; the shipped 120-frame probe elapses on launch screens and the board needs manual taps the run host cannot synthesize (DW-16 blocked proof).

**Approach:** Re-target the AC-5 reading to `useFrameRateBaseline` plus the seeded session harness with a restartable board-frame window and a `__DEV__`-only auto-drive, attempt a simulator run, and record fps and p99 (or the verbatim block) in a durable evidence file.

## Boundaries & Constraints

**Always:** Preserve `WINDOW = 120` and the fps/p99 math exactly; keep the auto-drive strictly `__DEV__`-only so release is untouched; never log in worklets or frame math; record numbers verbatim with build config, model/OS, and seed; use `runSeededSession` as the deterministic session path; never edit the deferred-work ledger (orchestrator records resolution).

**Block If:** No simulator runtime is available and the paired iPhone is unreachable or locked; code signing demands human intervention; the app fails to reach the board even with the auto-harness; a full 10-minute session cannot complete in-run (record the partial window plus a no-verdict note instead of inventing numbers).

**Never:** Change the probe window size or fps/p99 math; ship any harness in release; tune engine or render code for the frame budget; invent frame numbers; submit to TestFlight or the App Store; close DW-16 (only share evidence).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Simulator boots the dev build, auto-harness reaches the board and the restarted 120-frame window completes during the seeded session | Evidence file holds at least one board-frame `fps · p99Ms · frames` readout with config, model/OS, and seed | No error expected |
| NO_RUNTIME | No simulator runtime and `devicectl` shows no available device | HALT blocked with `no simulator or device runtime` plus listings | Record listings in the evidence file, no build attempted |
| DEVICE_LOCKED | Physical-device install fails device-locked | HALT blocked with `physical iOS device locked` plus verbatim error | Record verbatim error in the evidence file |
| HARNESS_STUCK | `runSeededSession` exceeds its move cap | Host check fails fast with the stuck-seed message | Record seed and move counts, no frame numbers invented |
| DEBUG_ONLY_BASELINE | Release build fails or times out | Debug baseline recorded as informative with the limitation noted | Budget verdict marked provisional |
| PROBE_STILL_LAUNCH | Restarted window still elapses before board render | Evidence records launch-frame limitation, no board verdict | HALT blocked with `probe window does not cover board frames` |

</intent-contract>

## Code Map

- `triade/src/render/useFrameRateBaseline.ts` -- Shipped 120-frame one-shot probe via `useFrameCallback`; computes `fps = 1000/avgMs`, `frames = samples.length`, `p99Ms = sorted[floor(n*0.99)]`; needs a restart hook so the window can cover board frames without touching WINDOW or math.
- `triade/App.tsx` -- Calls `useFrameRateBaseline()` at `AppContent` top and renders `baseline: <fps> fps · p99 <p99>ms · <n> frames` only on the playing screen; screen flow `laneSelect -> playing` needs manual `Jogar` tap today, needs a `__DEV__`-only auto path.
- `triade/test-utils/helpers.ts` -- `runSeededSession(seed, targetSpawns)` deterministic harness (mulberry32, cycling left/up/right/down, restart on stale>=8 or game-over); consume only for the host determinism proof.
- `triade/src/render/GameBoard.tsx` -- Skia 4x4 board under measurement; observe only.
- `_bmad-output/implementation-artifacts/1-1-device-gates-runbook.md` -- T5.2 runbook: Release preferred, budget p99 < 16.7ms, fps target >= 59 on 60Hz.
- `_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md` -- Evidence-file pattern to mirror (runtime identity, commands, verbatim outcome, shared-with note).

## Tasks & Acceptance

**Execution:**
- [ ] `triade/src/render/useFrameRateBaseline.ts` -- add a restart capability (generation counter or reset key prop) that clears samples/count/done so a fresh 120-frame window can start on board mount, keeping WINDOW and fps/p99 math byte-identical -- re-targets the window from launch screens to board frames.
- [ ] `triade/App.tsx` -- restart the baseline when the playing screen mounts and add a strictly `__DEV__`-gated seeded auto-drive (boot straight to board when the flag is set and cycle deterministic moves via the existing `doMove` path) so the simulator run needs no manual taps -- removes the DW-16 tap block without touching release.
- [ ] `triade/test-utils/helpers.ts` (consume only) -- run `runSeededSession(20260808, 200)` twice via the project tsx loader to prove the seeded session completes deterministically -- session determinism proof.
- [ ] `_bmad-output/implementation-artifacts/dw-32-ac5-frame-rate-evidence.md` -- write runtime identity, commands with exit codes, seed, at least one board-frame readout (or the verbatim blocking error), budget verdict vs p99 < 16.7ms, and the shared-with-DW-16 flag -- durable evidence for the orchestrator.

**Acceptance Criteria:**
- Given the simulator or iPhone is reachable, when the dev build launches with the auto-harness, then the app reaches the board without a Metro redbox or native crash.
- Given the board renders, when the restarted 120-frame window completes during the seeded session, then at least one board-frame `fps · p99Ms · frames` readout is recorded with build configuration and seed noted.
- Given the host check runs, when `runSeededSession(20260808, 200)` executes twice, then both runs complete with identical spawn output and no stuck failure.
- Given the run finishes (pass or blocked), when the agent exits, then `dw-32-ac5-frame-rate-evidence.md` exists with runtime identity, run outcome, and numbers or the verbatim blocking error.
- Given a release build, when the bundle is inspected, then no auto-harness code path is reachable (strict `__DEV__` gate) and no worklet or frame-math logging exists.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `xcrun simctl list devices available` -- expected: at least one iOS simulator runtime listed
- `cd triade && npx tsc --noEmit` -- expected: clean
- `cd triade && npm test` -- expected: suite green via the project tsx runner (1012 pass / 0 fail baseline, skips pre-existing)
