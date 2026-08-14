---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-08-13'
tempCoverageMatrixPath: '_bmad-output/test-artifacts/traceability/coverage-matrix-1-3.json'
workflowType: 'testarch-trace'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-3-board-skia-declarativo-dirigido-pelo-trace.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/automation-summary-1-3.md'
  - '_bmad-output/implementation-artifacts/1-2-port-completo-do-engine-de-regras-para-typescript.md'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/implementation-artifacts/1-3-board-skia-declarativo-dirigido-pelo-trace.md'
  - '_bmad-output/planning-artifacts/epics.md#Story 1.3'
  - '_bmad-output/automation-summary-1-3.md'
  - 'triade/src/render/transitionPlan.ts'
externalPointerStatus: 'not_used'
---

# Traceability Matrix & Gate Decision - Story 1.3: Board Skia declarativo dirigido pelo trace

**Target:** Story 1.3 — Board Skia declarativo dirigido pelo trace
**Date:** 2026-08-13
**Evaluator:** Eduardo (TEA Agent)
**Coverage Oracle:** acceptance_criteria
**Oracle Confidence:** high
**Oracle Sources:** `_bmad-output/implementation-artifacts/1-3-board-skia-declarativo-dirigido-pelo-trace.md`, `_bmad-output/planning-artifacts/epics.md#Story 1.3`, `_bmad-output/automation-summary-1-3.md`, `triade/src/render/transitionPlan.ts`

---

## Step 1 Output: Coverage Oracle Resolution

### Resolved Oracle

- **Type:** Formal requirements (story acceptance criteria)
- **Source:** Story 1.3 has 6 acceptance criteria (AC-1..AC-6) defined in the story file and `epics.md` (lines 281-296).
- **Rationale:** Highest-confidence oracle available — explicit, testable ACs plus a post-dev test-automate pass (see `_bmad-output/automation-summary-1-3.md`). No external pointers, no contract/spec artifacts, no synthetic inference needed.
- **Confidence:** HIGH — ACs are explicit and machine-testable; verified through the render-layer suite (79/79 triade green incl. the 1.3 additions) and the frozen web suite (26/26 green).

### Artifacts Loaded

- Story file: `_bmad-output/implementation-artifacts/1-3-board-skia-declarativo-dirigido-pelo-trace.md`
- Epics (Story 1.3 ACs): `_bmad-output/planning-artifacts/epics.md` (lines 281-296); FR-3 (line 28), NFR-1 (line 74), NFR-4 (line 77)
- Test-automate summary: `_bmad-output/automation-summary-1-3.md`
- Prior story (engine parity baseline): `_bmad-output/implementation-artifacts/1-2-port-completo-do-engine-de-regras-para-typescript.md`
- Planner source (trace contract): `triade/src/render/transitionPlan.ts`; trace types in `triade/src/engine/core/types.ts`
- Web reference (frozen): `js/game.js`, `test/game.test.js` (26 tests, unchanged)

### Trace Target Metadata

- **Gate type:** story
- **Story ID:** 1.3
- **Story label:** Board Skia declarativo dirigido pelo trace
- **Status in story file:** review (all tasks T1-T4 checked)

---

## Step 2 Output: Test Discovery & Catalog

### Test Inventory (79 triade tests, 26 web frozen — all at Unit level; no E2E/API/Component)

**Runtime evidence:** `node --test` (from `triade/`) → **79/79 pass, 0 fail, 0 skipped** (~1.5s). Frozen web suite `node --test test/game.test.js` → **26/26 pass, 0 fail**. All deterministic (injected RNG / seeded `mulberry32` — no `Math.random`).

**1.3-relevant tests (20 unique, 4 files):**

| ID | File:Line | Title | Level | Status |
|----|-----------|-------|-------|--------|
| 1.3-PLAN-001 | transitionPlan.test.ts:38 | planTileTransitions: slide left maps the moving tile from source to dest | Unit | active |
| 1.3-PLAN-002 | transitionPlan.test.ts:49 | slide right maps the moving tile from source to dest | Unit | active |
| 1.3-PLAN-003 | transitionPlan.test.ts:60 | slide up maps the moving tile from source to dest | Unit | active |
| 1.3-PLAN-004 | transitionPlan.test.ts:71 | slide down maps the moving tile from source to dest | Unit | active |
| 1.3-PLAN-005 | transitionPlan.test.ts:82 | merge 1+2 converges two sources to dest with merged value | Unit | active |
| 1.3-PLAN-006 | transitionPlan.test.ts:93 | merge 2+1 (reversed order) converges the same two sources | Unit | active |
| 1.3-PLAN-007 | transitionPlan.test.ts:104 | merge equal >=3 doubles the value at dest | Unit | active |
| 1.3-PLAN-008 | transitionPlan.test.ts:115 | stationary tiles become hold transitions in a partial move | Unit | active |
| 1.3-PLAN-009 | transitionPlan.test.ts:127 | noop move (moved:false) yields an empty plan even though trace has entries | Unit | active |
| 1.3-PLAN-010 | transitionPlan.test.ts:135 | no 1+1 merge is a noop with an empty plan | Unit | active |
| 1.3-PLAN-011 | transitionPlan.test.ts:142 | plan derives from result.trace only, never from prevBoard values (AC-1/AC-6) | Unit | active |
| 1.3-PLAN-012 | transitionPlan.test.ts:165 | full-board merge-once produces merges, slides, and one spawn | Unit | active |
| 1.3-PLAN-013 | transitionPlan.test.ts:179 | 9-start-tile board plan covers every occupied cell (no-leak oracle) | Unit | active |
| 1.3-PLAN-014 | transitionPlan.test.ts:188 | resultingTiles is the no-leak oracle across random deterministic moves | Unit | active |
| 1.3-SMOKE-001 | render.smoke.test.ts:27 | fresh game board plans every starting tile as hold (no leak on first render) | Unit | active |
| 1.3-SMOKE-002 | render.smoke.test.ts:36 | 500 deterministic moves never leak and never produce an empty plan on a move | Unit | active |
| 1.3-SMOKE-003 | render.smoke.test.ts:66 | full-game session exercises every transition type at least once | Unit | active |
| 1.3-SMOKE-004 | render.smoke.test.ts:83 | full immovable board plans empty (no animation on a dead board) | Unit | active |
| 1.3-SMOKE-005 | render.smoke.test.ts:95 | empty board plans empty and never animates | Unit | active |
| 1.3-BENCH-001 | render.bench.test.ts:52 | transition-plan cost per move < 0.05ms median / 0.1ms p99 (frame budget headroom) | Unit | active |
| 1.3-PURITY-001 | engine.purity.test.ts:81 | ADR-01: src/render/transitionPlan.ts is pure TS (no RN/React/Skia/Expo imports) | Unit | active |
| 1.3-PURITY-002 | engine.purity.test.ts:94 | ADR-01: src/render/transitionPlan.ts uses relative imports only (self-contained frame math) | Unit | active |
| 1.1-PURITY-001 | engine.purity.test.ts:64 | ADR-01: src/engine + src/game import nothing from RN/React/Skia/Expo | Unit | active |

**Note:** `transitionPlan.test.ts` holds 14 tests (not the 13 cited in the story's completion note — T2.2's "9-start-tile" and the 200-move property are distinct tests). Local runtime shows **79** triade tests. `engine.purity.test.ts` was extended in the test-automate pass (2 baseline ADR-01 + 2 transitionPlan scope).

### Coverage Heuristics Inventory

- **API endpoints:** None (pure-render layer; no HTTP API). Not applicable.
- **Auth/authz:** None (no auth in scope). Not applicable.
- **Error-path coverage:** Present at planner level — noop empty plan, dead-board/empty-board no-animate, full-board merge-once, game-over path exercised in smoke (fresh game restarts).
- **UI journey E2E:** None — Skia animation is manual validation on simulator/device per project standards (documented, not automated). 1.3-BENCH-001 + smoke suite are the automated proxies.
- **UI states:** Loading/empty/error/permission states not applicable (no async, no auth); empty-board and dead-board states ARE covered by smoke (1.3-SMOKE-004/005).

---

## Step 3 Output: Traceability Matrix

### Criteria Mapped (Story 1.3 — 6 ACs)

#### AC-1: Board renders 100% from the trace with no heuristic matching in the UI (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `1.3-PLAN-011` - transitionPlan.test.ts:142 — plan derives from `result.trace` only, never from prevBoard values (asserted identical plan across unrelated prevBoards)
  - `1.3-PLAN-001..004` - transitionPlan.test.ts:38-71 — slides derived from trace entries
  - `1.3-PLAN-005..007` - transitionPlan.test.ts:82-104 — merges derived from trace entries
  - `1.3-PURITY-001` - engine.purity.test.ts:81 — transitionPlan.ts is pure TS (ADR-05)
  - `1.3-PURITY-002` - engine.purity.test.ts:94 — relative imports only
- **Gaps:** none.
- **Recommendation:** none.

---

#### AC-2: Slide tiles animate from `from` to `to`; merged tiles vanish after merge; spawned tiles appear at `spawned` cells (P1)

- **Coverage:** FULL ✅ (plan semantics fully tested; on-device rendering is manual per project rules)
- **Tests:**
  - `1.3-PLAN-001..004` - transitionPlan.test.ts:38-71 — slide from→to in all 4 directions
  - `1.3-PLAN-005..007` - transitionPlan.test.ts:82-104 — merge converges two sources to dest, merged value materializes
  - `1.3-PLAN-012` - transitionPlan.test.ts:165 — full-board merge-once: merges + slides + one spawn
  - `1.3-SMOKE-003` - render.smoke.test.ts:66 — full-game session exercises every transition type (slide/merge/spawn/hold)
- **Gaps:** none at plan level. On-device Skia animation (vanish/appear/spring timing) is manual validation (informative smoke), not covered by `node --test`.
- **Recommendation:** record the simulator/device smoke reading per runbook 1-1 during code review.

---

#### AC-3: Overshoot-and-snap follows the trace, declarative in `src/render`; flash/particles/shake/slow-mo are imperative worklets in `src/feel` (hybrid boundary, ADR-05) (P1)

- **Coverage:** FULL ✅
- **Tests:**
  - `1.3-PURITY-001` - engine.purity.test.ts:81 — transitionPlan.ts (the declarative frame math) imports nothing from RN/React/Skia/Reanimated
  - `1.3-PURITY-002` - engine.purity.test.ts:94 — relative imports only (self-contained boundary)
  - `1.3-PLAN-011` - transitionPlan.test.ts:142 — frame math derives from trace, never heuristic matching
- **Gaps:** none. `src/feel` does not exist yet by design (Epic 8 boundary, S8.2-S8.4); 1.3 only establishes the boundary, which the purity tests enforce on the declarative side.
- **Recommendation:** none.

---

#### AC-4: No DOM/DOM-equivalent leak — every tile rendered from the trace maps to an Skia object; orphaned elements removed (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `1.3-PLAN-013` - transitionPlan.test.ts:179 — 9-start-tile board: `resultingTiles(plan)` covers every occupied cell
  - `1.3-PLAN-014` - transitionPlan.test.ts:188 — 200 deterministic moves: no-leak oracle deep-equals occupied cells
  - `1.3-SMOKE-001` - render.smoke.test.ts:27 — fresh game hold transitions, no leak on first render
  - `1.3-SMOKE-002` - render.smoke.test.ts:36 — 500 moves never leak, never empty-plan-on-move
  - `1.3-SMOKE-004` - render.smoke.test.ts:83 — dead board plans empty (no orphan animation)
  - `1.3-SMOKE-005` - render.smoke.test.ts:95 — empty board plans empty
- **Gaps:** none. The Skia-instance-map reconciliation itself (GameBoard.tsx) is manual validation; its pure oracle (`resultingTiles`) is fully tested.
- **Recommendation:** none.

---

#### AC-5: Rendering stays at 60 FPS sustained during a 10-minute play session on target iOS devices (NFR-1) (P1)

- **Coverage:** PARTIAL ⚠️
- **Tests:**
  - `1.3-BENCH-001` - render.bench.test.ts:52 — planner per-move cost < 0.05ms median / 0.1ms p99 (measured ~0.0002ms med / 0.0004ms p99 — ~100x headroom)
- **Manual simulator smoke (recorded 2026-08-13):** `useFrameRateBaseline` on iPhone 17 Pro simulator (iOS 26.5), animated board driven through 10 effective moves (slide/merge/spawn) inside the 120-frame recording window → **60.0 fps · p99 16.67ms · 118 frames, identical across 3 runs** (median = 60.0 fps / 16.67ms, spread 0). Matches the Story 1.1 simulator baseline.
- **Gaps:**
  - Missing: sustained device FPS reading (10-min session on **target iOS hardware**) — physical device + Apple Developer account required; **DEFERRED** per runbook 1-1 §0 (simulator is macOS GPU, not representative of device; informative only).
- **Recommendation:** AC-5 moves to FULL only when the physical-device baseline is recorded (runbook 1-1 §3-4). The simulator reading is recorded informative evidence; the frame-budget benchmark (1.3-BENCH-001) is the CI-enforced automated proxy.

---

#### AC-6: UI never duplicates rules — no merge/spawn/game-over logic outside `src/engine` (FR-3, NFR-4) (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `1.1-PURITY-001` - engine.purity.test.ts:64 — ADR-01: src/engine + src/game import nothing from RN/React/Skia/Expo (engine untouched by render)
  - `1.3-PURITY-001` - engine.purity.test.ts:81 — transitionPlan.ts is pure TS, imports no RN/React/Skia (no UI-framework rules)
  - `1.3-PLAN-011` - transitionPlan.test.ts:142 — the only render rule is trace-derived; no merge/spawn/game-over reimplementation
- **Gaps:** none.
- **Recommendation:** none.

---

### Coverage Summary (by priority)

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 3              | 3             | 100%       | ✅ PASS |
| P1        | 3              | 2             | 67%        | ⚠️ CONCERNS |
| P2        | 0              | 0             | —          | —      |
| P3        | 0              | 0             | —          | —      |
| **Total** | **6**          | **5**         | **83%**    | ⚠️ FAIL (P1 gap) |

### Test Inventory Summary

| Test Level | Tests | Criteria Covered | Coverage % |
| ---------- | ----- | ---------------- | ---------- |
| E2E        | 0     | 0                | 0%         |
| API        | 0     | 0                | 0%         |
| Component  | 0     | 0                | 0%         |
| Unit       | 79    | 6                | 100%       |
| **Total**  | **79**| **6**            | **100%**   |

---

## Step 4 Output: Phase 1 Coverage Matrix & Gap Analysis

**Phase 1 coverage matrix:** `_bmad-output/test-artifacts/traceability/coverage-matrix-1-3.json` (PHASE_1_COMPLETE)

### Coverage Statistics

- Total Requirements: 6
- Fully Covered: 5 (83%)
- Partially Covered: 1 (AC-5)
- Uncovered: 0

### Priority Coverage

- P0: 3/3 (100%)
- P1: 2/3 (67%)
- P2: 0/0
- P3: 0/0

### Gap Analysis

- Critical (P0 uncovered): 0
- High (P1 uncovered): 0
- Medium (P1 partial): 1 — AC-5 (NFR-1 device FPS validation pending manual device-gate smoke)
- Low (P2/P3 uncovered): 0

### Coverage Heuristics

- Endpoints without tests: 0 (no API)
- Auth negative-path gaps: 0 (no auth)
- Happy-path-only criteria: 0
- UI journeys without E2E: 1 (AC-2/AC-5 — Skia animation is manual per project standards; automated proxies exist)

### Recommendations

1. **MEDIUM** — Physical-device NFR-1 gate is **DEFERRED** (runbook 1-1: needs iPhone + Apple Developer account). Simulator smoke recorded 2026-08-13: **60.0 fps · p99 16.67ms · 118 frames** (3 runs, median, animated board). When hardware is available, record the device baseline per runbook 1-1 §3-4 → AC-5 moves from PARTIAL to FULL and the gate flips.
2. **LOW** — Run `/bmad:tea:test-review` to assess test quality.

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

### Evidence Summary

#### Test Execution Results

- **Total Tests**: 79 (triade) + 26 (web, frozen)
- **Passed**: 79/79 (100%) triade; 26/26 (100%) web
- **Failed**: 0 (0%)
- **Skipped**: 0 (0%)
- **Duration**: ~1.5s (triade)

**Test Results Source**: local run (`node --test` from `triade/`, Node v26.x, commit `cf242d5` on `feature/1-3-board-skia-declarativo-dirigido-pelo-trace`)

#### Coverage Summary (from Phase 1)

- **P0 Acceptance Criteria**: 3/3 covered (100%) ✅
- **P1 Acceptance Criteria**: 2/3 covered (67%) ⚠️
- **Overall Coverage**: 83%

**Code Coverage**: not measured (zero-dep project; node:test has no built-in coverage gate).

#### Non-Functional Requirements (NFRs)

- **Performance**: PARTIAL ⚠️ — planner frame-budget benchmark ships in CI (1.3-BENCH-001, ~100x headroom); simulator smoke recorded 2026-08-13 (60.0 fps · p99 16.67ms · 118 frames, 3 runs median, animated board). NFR-1 sustained 60 FPS on **target iOS hardware** is DEFERRED (runbook 1-1 — requires physical iPhone + Apple Developer account).
- **Reliability**: PASS ✅ — 79/79 deterministic (seeded `mulberry32`, no `Math.random`); 500-move + 200-move no-leak property tests.
- **Maintainability**: PASS ✅ — ADR-01/ADR-05 boundary enforced on `src/engine`, `src/game`, and now `src/render/transitionPlan.ts` (`engine.purity.test.ts`); parity + suite-parity guards prevent drift between TS and web engine.

**NFR Source**: `_bmad-output/project-context.md` + story file + architecture §ADR-05

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion             | Threshold | Actual     | Status    |
| --------------------- | --------- | ---------- | --------- |
| P0 Coverage           | 100%      | 100%       | ✅ PASS   |
| P0 Test Pass Rate     | 100%      | 100%       | ✅ PASS   |
| Critical NFR Failures | 0         | 0          | ✅ PASS   |
| Flaky Tests           | 0         | 0          | ✅ PASS   |

**P0 Evaluation**: ✅ ALL PASS

#### P1 Criteria (Required for PASS, May Accept for CONCERNS)

| Criterion              | Threshold | Actual | Status |
| ---------------------- | --------- | ------ | ------ |
| P1 Coverage            | ≥80%      | 67%    | ❌ FAIL |
| P1 Test Pass Rate      | ≥90%      | 100%   | ✅ PASS |
| Overall Test Pass Rate | ≥90%      | 100%   | ✅ PASS |
| Overall Coverage       | ≥80%      | 83%    | ✅ PASS |

**P1 Evaluation**: ❌ FAILED (P1 coverage 67% < 80% minimum)

### GATE DECISION: FAIL

### Rationale

P0 coverage is 100% (3/3 ACs FULL) and overall coverage is 83% (5/6 ACs FULL) — both above the 80% minimum — but **P1 coverage is 67% (2/3), below the 80% minimum**, so the deterministic gate is FAIL. The single shortfall is **AC-5 (NFR-1, 60 FPS sustained on target iOS devices)**, marked PARTIAL: the automated planner frame-budget benchmark (1.3-BENCH-001, ~100x headroom) and the recorded simulator smoke (2026-08-13: **60.0 fps · p99 16.67ms · 118 frames**, 3 runs median, animated board) are strong informative evidence, but the sustained device FPS reading requires a **physical iPhone + Apple Developer account** — **DEFERRED** per runbook 1-1 §0 (macOS simulator GPU is not representative of iOS hardware).

This is a **validation-pending FAIL (device gate deferred), not a coverage-absent FAIL**: every automatable acceptance criterion is FULL, 79/79 triade tests green, 26/26 web tests green, no-leak oracle proven across 200 deterministic moves, ADR-01/05 purity enforced, and the frozen web engine untouched. Recording the physical-device baseline per runbook 1-1 §3-4 moves AC-5 to FULL → P1 to 100% → gate flips to PASS.

### Critical Issues (For FAIL)

None open at P0. The only gate-blocking item is the pending P1 device-FPS validation (AC-5).

### Gate Recommendations

#### For FAIL Decision ❌

1. **Do NOT advance Story 1.3 as NFR-1-complete until the physical-device baseline is recorded.** The device gate is **DEFERRED** (runbook 1-1: needs iPhone + Apple Developer account); simulator smoke (60.0 fps · p99 16.67ms · 118 frames, 3 runs median) is recorded as informative evidence and does not substitute for target-hardware FPS.
2. **When hardware is available:** complete the device-gate baseline per runbook 1-1 §3-4 (Release build, 3 runs, median p99 < 16.7ms) and record it in `game-architecture.md` §S1.1 Spike Results.
3. **Re-run `/bmad:tea:test-review` and then `bmad tea *trace`** after the device baseline to flip the gate to PASS.

---

## Sign-Off

**Phase 1 - Traceability Assessment:**

- Overall Coverage: 83%
- P0 Coverage: 100% ✅
- P1 Coverage: 67% ❌
- Critical Gaps: 0 (no uncovered P0/P1; 1 partial — AC-5 pending manual device validation)

**Phase 2 - Gate Decision:**

- **Decision**: FAIL ❌
- **P0 Evaluation**: ✅ ALL PASS
- **P1 Evaluation**: ❌ FAILED (P1 coverage 67% < 80%)

**Overall Status:** FAIL (device-gate deferred) — Story 1.3's declarative trace-driven Skia board is fully automated-tested (79/79 triade + 26/26 web green; planner, no-leak oracle, smoke, benchmark, ADR purity all green) and the simulator smoke is recorded (60.0 fps · p99 16.67ms · 118 frames, 3 runs median). The NFR-1 sustained-60-FPS gate on **target iOS hardware** is DEFERRED (needs physical iPhone + Apple Developer account per runbook 1-1). Recording the device baseline flips the gate to PASS.

**Next Steps:**

- When hardware is available, record the physical-device NFR-1 baseline (runbook 1-1 §3-4), then re-run the trace to reach PASS.

**Generated:** 2026-08-13
**Workflow:** testarch-trace v4.0 (Enhanced with Gate Decision)

---

<!-- Powered by BMAD-CORE™ -->
