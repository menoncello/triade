---
title: 'Frame-rate baseline measure via seeded session (probe-wiring diagnosis + hardening)'
type: 'chore'
created: '2026-09-07'
status: 'done'
baseline_revision: 6b165931e98a22270740efbdeb326bfbb5cba82b
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
final_revision: ba186ce35ddee30577c6b785ed42341c0b4a90da
---

<intent-contract>

## Intent

**Problem:** DW-16 and DW-32 share one missing readout: the on-screen `fps · p99Ms · frames` baseline never completed across two blocked runs (2026-09-06 stuck on laneSelect with a host tap block; 2026-09-07 reached the board via the `__DEV__` auto-drive yet `stats` stayed null across ~4 minutes of play, verbatim `recording frame rate baseline…`).

**Approach:** Diagnose the probe-side window/generation wiring statically instead of re-running measurement as-is, apply the minimal hardening that keeps the 120-frame window and fps/p99 math identical, verify with automated checks, and extend the shared evidence file with the diagnosis, the fix, and a one-screenshot re-measurement protocol.

## Boundaries & Constraints

**Always:** Keep `WINDOW = 120` and the fps/p99/frames formulas byte-identical; keep any harness strictly `__DEV__`-only with release untouched; record seed, build config, and verbatim observations; never edit the deferred-work ledger (the orchestrator records resolution); keep the evidence file flagged as shared with DW-32.

**Block If:** Automated verification (tsc or the project test runner) fails because of this change and cannot be repaired without expanding scope; the hook file is missing or unrecognizably restructured versus the investigated revision.

**Never:** Submit to TestFlight or the App Store; tune engine or render code for the frame budget; invent frame numbers; change the window size or fps/p99 math; close DW-32 (only share the evidence); ship harness code in release; log in worklets or frame math.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Simulator/dev build with auto-drive reaches the board | Hardened probe publishes `baseline: <fps> fps · p99 <p99>ms · <n> frames` within ~2s of the board window start | No error expected |
| EMPTY_WINDOW | 120 callbacks yield zero samples (degenerate time base) | Window resets and retries instead of latching `done` with null stats forever | No invented numbers; next window re-attempts |
| RERENDER_CHURN | Auto-drive re-renders every ~500ms during the window | Frame-callback identity stays stable so the time base never resets mid-window | Deltas stay non-negative in steady state |
| PURE_MATH | 119 deltas of 16.667ms | fps ≈ 60, p99Ms ≈ 16.67, frames = 119 | Empty input returns null, never NaN |

</intent-contract>

## Code Map

- `triade/src/render/useFrameRateBaseline.ts` -- Restartable 120-frame probe via `useFrameCallback` with `generation` reset; computes `fps = 1000/avgMs`, `frames = samples.length`, `p99Ms = sorted[floor(n*0.99)]`, publishes through `runOnJS(setStats)`. WINDOW and math untouched by this change.
- `triade/App.tsx:116-117,1007-1048,1225-1229` -- Calls `useFrameRateBaseline(baselineGeneration)`, restarts generation on playing-screen mount, `__DEV__`-only auto-drive, renders the baseline line. Observe only; no change.
- `triade/test-utils/helpers.ts` -- `runSeededSession(seed, targetSpawns)` deterministic harness. Consume only for context; no change.
- `_bmad-output/implementation-artifacts/1-1-device-gates-runbook.md` -- T5.2 runbook: budget p99 < 16.7ms, fps target >= 59 on 60Hz, median of 3 runs.
- `_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md` -- Durable evidence file to extend with this run's diagnosis section (shared with DW-32).

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/render/useFrameRateBaseline.ts` -- extract the fps/p99/frames computation into a pure exported `computeFrameRateStats(samples)` with byte-identical formulas, memoize the frame callback so re-renders never re-register it and reset the time base, and retry (instead of latching `done`) when a window ends with zero samples -- removes the permanent `recording…` deadlock without touching WINDOW or math. (2026-09-07: done — `computeFrameRateStats` exported with identical sorted/idx/p99/avgMs math + null-on-empty; `onFrame` wrapped in `useCallback(..., [])`; null result resets durations/last/count and retries; WINDOW=120, signature, and generation-reset effect unchanged; `App.tsx` untouched.)
- [x] `triade/__tests__/render/useFrameRateBaseline.math.test.ts` -- unit-test the pure computation (steady 16.667ms deltas, single-spike p99 selection, empty input returns null) plus source-shape guards (WINDOW stays 120, callback memoized) -- locks the math and the wiring fix. (2026-09-07: done — 6/6 passing; spike case sized to 100 samples so `floor(100*0.99)=99` truthfully exercises spike selection under the normative formula; RN runtime imports avoided via source-shape guards per repo ATDD style.)
- [x] `_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md` -- append a diagnosis section (prior observations, root-cause hypotheses with the re-registration and empty-window-latch findings, fix applied, automated verification, one-screenshot re-measurement protocol, shared-with-DW-32 flag) -- durable evidence for the orchestrator. (2026-09-07: done — diagnosis section appended, shared flag kept.)

**Acceptance Criteria:**
- Given 119 deltas of 16.667ms, when `computeFrameRateStats` runs, then fps ≈ 60, p99Ms ≈ 16.67, and frames = 119.
- Given an empty sample array, when `computeFrameRateStats` runs, then it returns null and the hook resets the window instead of publishing.
- Given auto-drive re-renders during the window, when the frame callback identity is compared across renders, then it stays stable (memoized) so the time base never resets mid-window.
- Given the run finishes, when the agent exits, then `dw-16-frame-rate-baseline-evidence.md` holds the new diagnosis section with the shared-with-DW-32 flag and no invented numbers.

## Spec Change Log

## Review Triage Log

### 2026-09-07 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1: (low 1)
- defer: 2: (medium 2)
- reject: 11
- addressed_findings:
  - `[low]` `[patch]` New math test did not cover the shipped 119-sample window shape (lone spike skipped by `floor(119*0.99)=117`) — added a truthful 119-sample case locking frames=119 and p99=16.667. Test-only, no product change.

Defer notes (NOT written to any deferred-work file per orchestrator instruction — Do NOT edit the ledger; surfaced here for the orchestrator instead):
- `[medium]` `[defer]` Off-by-one family (B4/E3/E11): first callback never pushes, so a full window holds 119 (sometimes 118) samples, not 120, and `floor(n*0.99)` excludes the top-2 slowest frames from the p99 the budget judges. Pre-existing; fixing means changing math, which this bundle forbids — owned by DW-32/probe-math.
- `[medium]` `[defer]` Negative-delta family (B8/E1/E2): time-base resets (re-subscription, backgrounding, promotion) push uncorrected negative/huge deltas that are published verbatim. Pre-existing; filtering means changing math, which this bundle forbids — owned by DW-32/probe-math.

Reject rationale (dropped silently, recorded here only): B1/B2 (UI-thread snapshot and worklet-directive claims contradict the proven 2026-08-10 runOnJS precedent and are unproven without device evidence); B3/E13 (memoization is doc-recommended and benign even if the reset premise is unproven); B6/E9 (retry is strictly better than the old permanent latch; release already measured before this change); B7/E12 (math frozen by Never constraint, so drift is near-impossible; guards are repo-idiomatic); E4/E5/E6/E7/E10 (degenerate-clock and NaN-generation triggers are speculative with no evidence); E8 (stale-generation race is timing-speculative, pre-existing DW-32 wiring, and does not explain the observed never-publishes symptom).

## Verification

**Commands:**
- `cd triade && npx tsc --noEmit` -- expected: clean
- `cd triade && npm test` -- expected: suite green via the project tsx runner (new math test passes, zero regressions)

## Auto Run Result

Status: done
Summary: Diagnosed the never-publishing probe instead of a blind device re-run: memoized the frame callback (stable time base across auto-drive re-renders), extracted pure `computeFrameRateStats` with byte-identical math, and replaced the empty-window permanent latch with a retry. Locked with 7 unit checks and extended the shared evidence file with diagnosis + one-screenshot re-measurement protocol. No frame numbers invented; p99 budget still without verdict by design.
Files changed:
- `triade/src/render/useFrameRateBaseline.ts` -- pure math extraction + memoized callback + empty-window retry (WINDOW/math/signature/generation-reset unchanged)
- `triade/__tests__/render/useFrameRateBaseline.math.test.ts` (new) -- 7 checks: wiring guards + math (steady/spike/119-shape/empty)
- `_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md` -- diagnosis section appended, shared-with-DW-32 flag kept
- `_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md` -- this spec
Review findings breakdown: 1 patch applied (119-shape test case); 2 deferred (off-by-one + negative-delta families, pre-existing probe-math owned by DW-32, ledger write skipped per orchestrator instruction); 11 rejected (speculative or pre-existing-unchanged).
Follow-up review recommended: false (final pass changed test-only code; suite green).
Verification: `npx tsc --noEmit` clean; `npm test` 1478 tests · 131 suites · 1033 pass · 0 fail · 445 skipped; new file 7/7 passing. No device run in this bundle (diagnosis branch of the intent).
Residual risks: fix unproven on device (needs the one-screenshot re-measurement); if `recording…` persists past 30s of board play, suspect is callback-never-firing at the Reanimated/runtime level → device-log investigation, not another blind run.
