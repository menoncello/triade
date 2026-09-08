---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-07'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md'
  - '_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/render/useFrameRateBaseline.ts'
  - 'triade/__tests__/render/useFrameRateBaseline.math.test.ts'
  - 'triade/App.tsx'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-frame-rate-baseline-measure — probe-wiring diagnosis + 120-frame window hardening (DW-16 / DW-32)

**Date:** 2026-09-07
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-frame-rate-baseline-measure`
**Scope:** Targeted test design for the working-tree delta of `dw-frame-rate-baseline-measure`

> **Delta under assessment:** Commit `12e432d chore(frame-rate-baseline-measure): diagnose probe wiring, harden 120-frame window retry` (spec `baseline_revision 6b16593`, `final_revision ba186ce`) vs baseline `6b16593`. Working-tree diff vs `HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` DW-16/DW-32 `open→done 2026-09-06` + `resolution: resolved by sweep bundle dw-frame-rate-baseline-measure` + `resolution-undo` two entries); production-side delta is one hook fix plus one new unit suite plus spec/evidence docs:
> - `triade/src/render/useFrameRateBaseline.ts` (+41/−14): extracted pure exported `computeFrameRateStats(samples)` with byte-identical formulas (sorted / `floor(n*0.99)` / p99 / avgMs, null on empty); memoized the frame callback with `useCallback(..., [])`; empty-window completion resets durations/last/count and retries instead of latching `done` with null stats. `WINDOW = 120`, hook signature, and the DW-32 generation-reset effect unchanged.
> - `triade/__tests__/render/useFrameRateBaseline.math.test.ts` (NEW, 7 checks): source-shape guards (WINDOW 120, memoized callback, null-check + reset) plus math checks via a local re-implementation of the documented formula (steady 119×16.667ms, 100-sample spike, 119-shape lone-spike skip, empty→null). No RN imports (repo ATDD style).
> - `triade/App.tsx` — untouched (verified: `git diff 6b16593 HEAD -- triade/App.tsx` empty; 2 `useFrameRateBaseline` references intact).
> - `_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md` (NEW) + `dw-16-frame-rate-baseline-evidence.md` (+73, diagnosis section, shared-with-DW-32 flag kept, no invented numbers).
> - `sprint-status.yaml` is orchestrator-owned and **not** in scope for this design (no write, no revert).

---

## Executive Summary

**Scope:** DW-16 (on-device frame-rate baseline) and DW-32 (AC-5 60 FPS / 10-min rendering evidence) share one missing readout: the on-screen `fps · p99Ms · frames` baseline never completed across two blocked runs (2026-09-06 stuck on laneSelect via host tap block; 2026-09-07 board reached via `__DEV__` auto-drive yet `stats` stayed null across ~4 min of play). This bundle diagnoses the probe-side wiring statically instead of a blind third measurement run, applies the minimal hardening the spec allows, locks it with unit checks, and extends the shared evidence file with a one-screenshot re-measurement protocol.

**Risk Summary:**

- Total risks identified: 7
- High-priority risks (≥6): 3
- Critical categories: TECH (fix-unproven-on-device, off-by-one p99 leniency, source-shape guard brittleness), PERF (budget still without verdict), DATA (ledger closed on diagnosis, not measurement)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit: steady-119 math, empty→null, 100-spike, 119-shape skip, WINDOW guard, memoization guard, null-check+reset guard)
- P1 scenarios: 5 groups (one-screenshot re-measurement protocol, `recording…` >30s escalation to device-log investigation, App.tsx-untouched grep, release no-log rule grep, seeded-session determinism)
- P2/P3 scenarios: 6 groups (ledger resolution-undo presence, shared-with-DW-32 flag, budget-verdict-open documentation, deferred off-by-one + negative-delta ownership, simulator-vs-device gap, exploratory)
- **Total effort**: ~5–11 hours (~0.5–1.5 days; host-only except one ~10s simulator screenshot run)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine/feel/render tuning for the frame budget, `WINDOW` size, fps/p99 formulas** | Spec `Never` constraint freezes WINDOW and math; review deferred the off-by-one and negative-delta families as pre-existing probe-math owned by DW-32. | Defer notes recorded in spec Review Triage Log; R-002/R-003 track them here. |
| **A third full simulator/device measurement run (4-min watch), TestFlight/App Store submission** | Bundle intent is the diagnosis branch: no new build attempted by design; submission explicitly forbidden. | One-screenshot re-measurement protocol in evidence file; R-001 tracks the unproven-on-device residual. |
| **Closing DW-32, editing `deferred-work.md`, writing `sprint-status.yaml`** | Spec shares evidence with DW-32 but closes nothing there; ledger is orchestrator-owned; status board is never written nor reverted. | Working-tree ledger diff left untouched by this workflow; R-005 tracks the diagnosis-vs-measurement closure gap. |
| **Harness changes (`App.tsx` auto-drive, `runSeededSession`), Skia/Reanimated upgrades, a11y/ads/IAP** | `App.tsx` untouched by the bundle; no harness, gesture, or monetization code in the diff. | Existing suites + P1 untouched-grep keep the boundary pinned. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | Fix unproven on device: memoized callback + empty-window retry are statically reasoned (F1/F2) but no post-fix simulator/device run has published `baseline:` yet; `recording…` may persist via callback-never-firing at the Reanimated/runtime level. | 2 | 3 | 6 | Execute the one-screenshot protocol (boot dev build with auto-drive, ~10s board play, one screenshot); if `recording…` persists past 30s, escalate to device-log investigation, not another blind run. | Eduardo | 2026-09-08 |
| R-002 | TECH | Off-by-one p99 leniency (pre-existing, deferred): first callback never pushes so a full window holds 119 (sometimes 118) samples and `floor(n*0.99)` excludes the top-2 slowest frames from the p99 the T5.2 budget judges — verdicts skew lenient. | 3 | 2 | 6 | Keep math frozen per bundle boundary; transfer ownership to DW-32/probe-math; lock the truthful 119-shape in the new test so any future math change is detected. | Eduardo | with DW-32 |
| R-005 | DATA | Ledger DW-16/DW-32 marked `done` on diagnosis without a completed fps/p99 readout — future readers may mistake the probe fix for perf evidence and treat the budget as decided. | 2 | 3 | 6 | Evidence file keeps `STILL NO VERDICT` + `shared with DW-32` flags; this plan requires budget-verdict-open documentation as exit criteria; no invented numbers anywhere. | Eduardo | 2026-09-07 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH | Negative-delta family (pre-existing, deferred): time-base resets (re-subscription, backgrounding, promotion) push uncorrected negative/huge deltas published verbatim. | 2 | 2 | 4 | Ownership to DW-32/probe-math; P3 exploratory documents the trigger set; no filtering here (would change math). |
| R-004 | TECH | Guard brittleness: wiring guards assert on source text (`includes('useCallback(')`) and math via a local re-implementation, not the exported `computeFrameRateStats` — a hook edit that keeps the strings but changes behavior (or vice versa) false-passes or false-fails. | 2 | 2 | 4 | Accept for this bundle (RN runtime unimportable under tsx runner); future hardening: extract math to a pure RN-free module so tests import the real function. |
| R-006 | PERF | Simulator-only numbers (Mac GPU; 2026-08-10 60 fps · p99 16.67ms) are not 60Hz-device evidence; budget judged on the wrong substrate. | 2 | 2 | 4 | Re-measurement protocol prefers simulator for the probe Fix check but records the device gap; device verdict stays open under DW-32. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-007 | OPS | Stale-generation race (speculative, pre-existing DW-32 wiring): generation restart vs in-flight window interleaving; does not explain the observed never-publishes symptom. | 1 | 2 | 2 | Monitor; no action in this bundle. |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|------------------------|-----------|--------------------|-----------------|
| Performance | p99 < 16.7ms, fps ≥ 59 on 60Hz (T5.2 runbook `1-1-device-gates-runbook.md`) | R-001, R-006 | One-screenshot simulator re-measurement; device verdict under DW-32 | Screenshot showing `baseline: <fps> fps · p99 <p99>ms · <n> frames` + seed/build-config record |
| Reliability | Probe publishes within ~2s of board-window start; never latches `recording…` forever on a transient empty window | R-001 | Unit: empty→null + reset path; manual: 30s `recording…` escalation rule | New math test 7/7 + protocol outcome note in evidence file |
| Maintainability | Frame math in pure testable function; WINDOW/math pinned by guards; zero logging in worklets/frame math | R-004 | `tsc --noEmit` + full suite green; no-log grep | CI-equivalent host run (verified 2026-09-07: 1479 tests · 0 fail) |
| Security / Compliance | None in scope (no auth, PII, or export-control surface touched) | — | N/A | N/A |

**Unknown thresholds:** None invented. Budget verdict is explicitly UNKNOWN pending re-measurement — the only on-record numbers remain the 2026-08-10 simulator informative reading. AC-5's 10-minute session shape has no rendering-side evidence yet (planner micro-benchmark only).

---

## Entry Criteria

- [ ] Spec `spec-frame-rate-baseline-measure.md` with intent contract + acceptance criteria agreed
- [ ] Hook `triade/src/render/useFrameRateBaseline.ts` + test `useFrameRateBaseline.math.test.ts` present at `HEAD`
- [ ] Host toolchain ready (`node --import tsx` runner, `tsc`) — verified working 2026-09-07
- [ ] Simulator re-measurement prerequisites (dev build, auto-drive flag, seed 20260808) documented in evidence protocol

## Exit Criteria

- [ ] All P0 tests passing (7/7 in the new file; full suite 0 fail — verified)
- [ ] `tsc --noEmit` clean (verified by bundle; re-run on any follow-up)
- [ ] Budget verdict documented as open (no invented numbers) — evidence file holds `STILL NO VERDICT`
- [ ] R-001/R-002/R-005 mitigations scheduled or complete; R-003/R-004 ownership recorded
- [ ] No production-code change by this workflow (read-only verification only)

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority, **not** execution timing.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Steady-119 math: 119×16.667ms → fps≈60, p99≈16.67, frames=119 | Unit | R-002 | 1 | TEA | Locks shipped window shape truthfully |
| Empty→null (hook resets, never NaN) | Unit | R-001 | 1 | TEA | Locks F2 retry contract |
| 100-sample spike → p99 selects max (formula path exercised truthfully) | Unit | R-002 | 1 | TEA | Sized so `floor(100*0.99)=99` hits the spike |
| 119-shape lone-spike skip (`floor(119*0.99)=117` → p99=16.667) | Unit | R-002 | 1 | TEA | Documents the leniency, doesn't fix it |
| WINDOW stays 120 (source guard) | Unit | R-002 | 1 | TEA | Boundary freeze pin |
| Callback memoized via `useCallback` (source guard) | Unit | R-001 | 1 | TEA | Locks F1 wiring fix |
| Null-check + `count.current = 0` reset + export present (source guards) | Unit | R-001 | 1 | TEA | Locks retry-doesn't-latch |

**Total P0**: 7 tests — already implemented and passing (`useFrameRateBaseline.math.test.ts` 7/7; full suite 1479 tests · 0 fail at verification time).

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| One-screenshot re-measurement: dev build + auto-drive, ~10s board play → `baseline:` line | Manual (device lane) | R-001 | 1 | Eduardo | ~10s, not a 4-min watch; seed/build recorded |
| `recording…` past 30s → device-log investigation (Reanimated/runtime suspect), no blind re-run | Manual / process | R-001 | 1 | Eduardo | Escalation rule from evidence protocol |
| `App.tsx` untouched (diff empty; 2 hook references intact) | Unit (grep) | — | 1 | TEA | Boundary pin, host-runnable |
| No logging in worklets/frame math (project hard rule) | Unit (grep) | — | 1 | TEA | `console` scan over `src/render` + `src/feel` |
| Seeded session determinism `runSeededSession(20260808,200)` twice-identical | Unit (host) | R-006 | 1 | TEA | Already evidenced in prior runs; re-run cheap |

**Total P1**: 5 checks, ~2–4 hours (dominated by the simulator boot + screenshot run).

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Ledger `resolution-undo` 64-hex present for DW-16 + DW-32 | Unit (grep) | R-005 | 1 | TEA | Reversible-close hygiene |
| `shared with DW-32` flag present in evidence head + diagnosis tail | Unit (grep) | R-005 | 1 | TEA | Prevents orphaned-closure reading |
| Budget-verdict-open wording present (`NO VERDICT` / `STILL NO VERDICT`) | Unit (grep) | R-005 | 1 | TEA | Anti-false-evidence pin |
| Deferred families routed to DW-32/probe-math (off-by-one, negative-delta) | Doc review | R-002, R-003 | 1 | TEA | Spec triage log already records; keep linked |

**Total P2**: 4 checks, ~1–2 hours.

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory: degenerate-clock triggers (backgrounding, promotion 60↔120Hz) vs retry path | Exploratory | 1 | TEA | Informs DW-32 probe-math, not this bundle |
| Follow-up design: extract math to RN-free pure module so tests import the real function (kills R-004) | Doc / proposal | 1 | TEA | No code change now |

**Total P3**: 2 items, ~0.5–1 hour.

---

## Execution Strategy

Philosophy: run everything in PRs if <15 min; defer only what is expensive, long-running, or needs a device/simulator.

- **Every PR**: full host suite (`npm test` via tsx runner, ~5s) + `tsc --noEmit` + P0/P1-grep pins (WINDOW, memoization, untouched-`App.tsx`, no-log, ledger flags). Playwright parallelization is N/A — this bundle has no UI test surface.
- **On-demand (manual)**: the one-screenshot simulator re-measurement for R-001 (~10–20 min wall time incl. build). Not nightly — it needs a booted simulator + dev build and answers a single binary question (publishes vs `recording…`).
- **Deferred to DW-32**: device 60Hz verdict, 10-min session shape, off-by-one and negative-delta math changes.

## Resource Estimates

| Priority | Count | Total |
|----------|-------|-------|
| P0 | 7 tests (already written, green) | ~0 hours remaining (verification re-runs only) |
| P1 | 5 checks | ~2–4 hours |
| P2 | 4 checks | ~1–2 hours |
| P3 | 2 items | ~0.5–1 hour |
| **Total** | **18 items** | **~3.5–7 hours (~0.5–1 day)** |

Setup (simulator boot + dev build) dominates P1; all host checks are seconds each. No new test-authoring effort remains for P0.

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (7/7 — verified 2026-09-07)
- **P1 pass rate**: ≥95% (manual screenshot step may waive only into the R-001 escalation path, never into a pass)
- **High-risk mitigations**: R-001 scheduled (protocol run), R-002/R-005 documented-complete
- **Coverage**: probe math + wiring 100% of the bundle's changed lines; no duplicate coverage across levels (math at unit, publish-behavior at manual — deliberately split by the RN-runtime boundary)

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No invented frame numbers; budget verdict stays open until the screenshot run
- [ ] `WINDOW = 120` and fps/p99 math unchanged (guards green)
- [ ] No production-code modification by test design (this workflow is read-only vs `triade/`)
- [ ] `sprint-status.yaml` untouched; ledger untouched

---

## Mitigation Plans

### R-001: Fix unproven on device (Score: 6)

**Mitigation Strategy:**
1. Boot the iPhone Simulator dev build with `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` (seed 20260808, Debug), wait ~10s after the board appears.
2. Take one screenshot: expect `baseline: <fps> fps · p99 <p99>ms · <n> frames`; record seed/build/verbatim text in the evidence file.
3. If `recording…` persists past 30s of board play, stop measuring and open a device-log investigation (Reanimated/runtime callback delivery) — do not schedule another blind measurement run.
**Owner:** Eduardo
**Timeline:** 2026-09-08
**Status:** Planned
**Verification:** Evidence-file entry with screenshot + verdict (publish observed vs escalation opened).

### R-002: Off-by-one p99 leniency (Score: 6)

**Mitigation Strategy:**
1. Keep math frozen in this bundle (boundary respected).
2. The 119-shape test case documents the exact leniency so DW-32 math work starts from a pinned baseline.
3. Route the fix decision (window-fill vs index formula) to DW-32/probe-math with budget-impact note.
**Owner:** Eduardo
**Timeline:** with DW-32
**Status:** Planned (deferred, tracked)
**Verification:** DW-32 spec references this test as its regression pin.

### R-005: Ledger closed on diagnosis (Score: 6)

**Mitigation Strategy:**
1. Keep `STILL NO VERDICT` + `shared with DW-32` flags in the evidence file (already present — verified by P2 greps).
2. Any consumer of DW-16/DW-32 `done` status must cite the diagnosis section, never a frame number.
3. DW-32 stays open until a real readout exists.
**Owner:** Eduardo
**Timeline:** 2026-09-07 (complete — flags verified present)
**Status:** Complete
**Verification:** P2 grep checks green.

---

## Assumptions and Dependencies

### Assumptions

1. Reanimated `useFrameCallback` re-registers on callback identity change (per official docs) — the F1 root cause is statically reasoned, not runtime-proven.
2. The tsx host runner + `tsc` remain the project's verification gate (device runs are informative-only per project rule: Skia animation is manual validation).
3. Simulator 60Hz behavior approximates the probe's publish path even though absolute numbers don't transfer to device (Mac GPU caveat recorded since 2026-09-06).

### Dependencies

1. Simulator host with Xcode + bootable iPhone 17 Pro runtime — required by R-001 protocol run.
2. DW-32/probe-math follow-up — required before the T5.2 budget gets a verdict.

### Risks to Plan

- **Risk**: R-001 protocol still shows `recording…` (callback never fires at runtime).
  - **Impact**: Probe observability is broken below the hook layer; hook-level fixes are exhausted.
  - **Contingency**: Device-log investigation of Reanimated frame delivery; consider an alternate timing source.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`App.tsx` playing screen** (sole consumer: `useFrameRateBaseline(baselineGeneration)` + baseline line render) | None — untouched; hook signature identical | Full host suite green (1034 pass · 0 fail); `App.tsx` diff empty |
| **Engine (`src/engine`)** | None — no engine file in the diff | 26 engine gate tests + parity/ATDD suites still green inside the full run |
| **`__DEV__` auto-drive harness** | None — observed only, not modified | Prior auto-drive screenshots/behavior unchanged |
| **Release builds** | None — no harness shipped, no worklet logging added | No-log grep; release path identical by construction |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — TECH/SEC/PERF/DATA/BUS/OPS classification
- `probability-impact.md` — 1–3 P×I scoring, ≥6 high-priority threshold
- `test-levels-framework.md` — unit-vs-manual split at the RN-runtime boundary
- `test-priorities-matrix.md` — P0/P1/P2/P3 assignment

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md`
- Evidence: `_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md`
- Runbook: `_bmad-output/implementation-artifacts/1-1-device-gates-runbook.md` (T5.2 budget)
- Source: `triade/src/render/useFrameRateBaseline.ts`
- Tests: `triade/__tests__/render/useFrameRateBaseline.math.test.ts`

### Verification performed by this workflow (read-only, no production change)

- `npm test -- __tests__/render/useFrameRateBaseline.math.test.ts` (full suite): 1479 tests · 131 suites · 1034 pass · 0 fail · 445 skipped — green.
- `git diff 6b16593 HEAD -- triade/App.tsx`: empty (untouched confirmed).
- `git diff HEAD --stat`: ledger-only (`deferred-work.md` DW-16/DW-32 `open→done`).

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
