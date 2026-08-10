---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-08-09'
tempCoverageMatrixPath: '_bmad-output/test-artifacts/traceability/coverage-matrix-phase1.json'
workflowType: 'testarch-trace'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/test-artifacts/atdd-checklist-1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/implementation-artifacts/1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md'
  - '_bmad-output/planning-artifacts/epics.md#Story 1.1'
  - '_bmad-output/test-artifacts/atdd-checklist-1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md'
externalPointerStatus: 'not_used'
---

# Traceability Matrix & Gate Decision - Story 1.1: Technical spike (engine TS + board Skia + benchmark CI)

**Target:** Story 1.1 — Technical spike: engine TS + board Skia + benchmark CI
**Date:** 2026-08-09
**Evaluator:** Eduardo (TEA Agent)
**Coverage Oracle:** acceptance_criteria
**Oracle Confidence:** high
**Oracle Sources:** `_bmad-output/implementation-artifacts/1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md`, `_bmad-output/planning-artifacts/epics.md#Story 1.1`, `_bmad-output/test-artifacts/atdd-checklist-1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md`

---

## Step 1 Output: Coverage Oracle Resolution

### Resolved Oracle

- **Type:** Formal requirements (story acceptance criteria)
- **Source:** Story 1.1 has 5 acceptance criteria (AC-1..AC-5) defined in the story file and `epics.md`.
- **Rationale:** This is a formal requirements oracle — the ACs are testable, approved, and the ATDD checklist already exists. Highest-confidence oracle available. No external pointers, no contract/spec artifacts, no synthetic inference needed.
- **Confidence:** HIGH — ACs are explicit, machine-testable (AC-1/AC-2/AC-3), and verified through a ported test suite (37/37 green).

### Artifacts Loaded

- Story file: `_bmad-output/implementation-artifacts/1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md`
- Epics (Story 1.1 ACs): `_bmad-output/planning-artifacts/epics.md` (lines 247-261)
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md`
- Engine source (purity check): `triade/src/engine/**`
- CI workflow: `.github/workflows/ci.yml`
- Architecture spike results: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (§S1.1 Spike Results)

### Trace Target Metadata

- **Gate type:** story
- **Story ID:** 1.1
- **Story label:** Technical spike (engine TS + board Skia + benchmark CI)

---
## Step 2 Output: Test Discovery & Catalog

### Test Inventory (37 tests, 3 files — all at Unit level; no E2E/API/Component)

**Runtime evidence:** `node --test` (from `triade/`) → **37/37 pass, 0 fail, 0 skipped** (duration ~226ms). Engine cost/turn median far under the 0.1ms budget; frame-logic worst case under 0.2ms.

**Source:** `triade/__tests__/engine/game.test.ts` (31 tests), `triade/__tests__/engine/engine.smoke.test.ts` (4 tests), `triade/benchmarks/engine.bench.test.ts` (2 tests). Shared fixtures in `triade/test-utils/helpers.ts` (`rngOf`, `staticBoard`, `boardWith`, `emptyBoard`, `mulberry32`). All deterministic (injected RNG / seeded PRNG — no `Math.random`).

| ID | File:Line | Title | Level | Status |
|----|-----------|-------|-------|--------|
| 1.1-UNIT-001 | game.test.ts:7 | newGame returns exactly 9 starting tiles | Unit | active |
| 1.1-UNIT-002 | game.test.ts:22 | weightedValue 40/40/20 distribution | Unit | active |
| 1.1-UNIT-003 | game.test.ts:30 | HAPPY_PATH [1,2,_,_]→[3,_,_,_]+spawn, +3 | Unit | active |
| 1.1-UNIT-004 | game.test.ts:42 | MERGE_1_2 [2,1,_,_]→[3,...] both orders | Unit | active |
| 1.1-UNIT-005 | game.test.ts:50 | NO_1_1_MERGE | Unit | active |
| 1.1-UNIT-006 | game.test.ts:58 | NO_2_2_MERGE | Unit | active |
| 1.1-UNIT-007 | game.test.ts:66 | EQUAL_GE3 [3,3,3,3]→[6,3,3,_] one merge | Unit | active |
| 1.1-UNIT-008 | game.test.ts:74 | NEW_TILE_NOT_REMERGED | Unit | active |
| 1.1-UNIT-009 | game.test.ts:82 | EQUAL_GE3 cascades blocked | Unit | active |
| 1.1-UNIT-010 | game.test.ts:89 | ONE_CELL [3,_,3,_]→[3,3,_,_] | Unit | active |
| 1.1-UNIT-011 | game.test.ts:97 | ONE_CELL [_,3,_,3]→[3,_,3,_] | Unit | active |
| 1.1-UNIT-012 | game.test.ts:105 | ONE_CELL right wall space | Unit | active |
| 1.1-UNIT-013 | game.test.ts:113 | ONE_CELL right [2,1,2,1]→[_,2,1,3] | Unit | active |
| 1.1-UNIT-014 | game.test.ts:121 | NOOP_SWIPE full grid no spawn/score | Unit | active |
| 1.1-UNIT-015 | game.test.ts:134 | move right mirrors left | Unit | active |
| 1.1-UNIT-016 | game.test.ts:142 | move up mirrors left on columns | Unit | active |
| 1.1-UNIT-017 | game.test.ts:157 | move down mirrors up | Unit | active |
| 1.1-UNIT-018 | game.test.ts:173 | move down one-cell semantics | Unit | active |
| 1.1-UNIT-019 | game.test.ts:184 | trace: down merge records both sources | Unit | active |
| 1.1-UNIT-020 | game.test.ts:198 | spawnTile full board spawns nothing | Unit | active |
| 1.1-UNIT-021 | game.test.ts:211 | pickIndex clamps out-of-range rng | Unit | active |
| 1.1-UNIT-022 | game.test.ts:218 | spawn exactly once, uniform empty cell | Unit | active |
| 1.1-UNIT-023 | game.test.ts:232 | GAME_OVER full immovable board | Unit | active |
| 1.1-UNIT-024 | game.test.ts:245 | GAME_OVER false: empty cell exists | Unit | active |
| 1.1-UNIT-025 | game.test.ts:255 | GAME_OVER false: 1-adjacent-2 row | Unit | active |
| 1.1-UNIT-026 | game.test.ts:265 | GAME_OVER false: 1-adjacent-2 column | Unit | active |
| 1.1-UNIT-027 | game.test.ts:275 | GAME_OVER false: equal ≥3 adjacent | Unit | active |
| 1.1-UNIT-028 | game.test.ts:285 | higher merges equal ≥3 score by value | Unit | active |
| 1.1-UNIT-029 | game.test.ts:293 | trace: merged sources + spawn flag | Unit | active |
| 1.1-UNIT-030 | game.test.ts:309 | trace: wall merge + trailing advance | Unit | active |
| 1.1-UNIT-031 | game.test.ts:319 | trace: noop produces no spawned entry | Unit | active |
| 1.1-SMOKE-001 | engine.smoke.test.ts:18 | game launches — playable 4x4 board | Unit | active |
| 1.1-SMOKE-002 | engine.smoke.test.ts:32 | 500 deterministic moves never crash, score never decreases | Unit | active |
| 1.1-SMOKE-003 | engine.smoke.test.ts:56 | game over detected on full immovable board | Unit | active |
| 1.1-SMOKE-004 | engine.smoke.test.ts:66 | empty board never game over | Unit | active |
| 1.1-BENCH-001 | engine.bench.test.ts:52 | engine cost per turn < 0.1ms (spawn+merge-once+game-over) | Unit | active |
| 1.1-BENCH-002 | engine.bench.test.ts:76 | frame-logic worst case < 0.2ms (4 locked pairs) | Unit | active |

**Note:** The story AC-1 references "26 existing unit tests"; the ported `game.test.ts` contains 31 tests (the original 26 + 5 added during porting/ATDD). The original web suite `test/game.test.js` still has 26 tests and remains frozen.

### Coverage Heuristics Inventory

- **API endpoints:** None (pure-logic engine; no HTTP API). Not applicable.
- **Auth/authz:** None (no auth in scope). Not applicable.
- **Error-path coverage:** Present at engine level — noop handling, spawn-on-full-board, game-over detection, rng out-of-range clamping.
- **UI journey E2E:** None — Skia board is validated **manually on physical device** per project testing standards (documented, not automated).
- **UI states:** Not applicable (no UI automation in this story).

---
## Step 3 Output: Traceability Matrix

### Criteria Mapped (Story 1.1 — 5 ACs)

#### AC-1: Port `js/game.js` → TS in `src/engine/core`; 26 existing unit tests pass unchanged (`node --test`) (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `1.1-UNIT-001` - triade/__tests__/engine/game.test.ts:7 — newGame returns exactly 9 starting tiles
  - `1.1-UNIT-002` - game.test.ts:22 — weightedValue 40/40/20 distribution
  - `1.1-UNIT-003` - game.test.ts:30 — HAPPY_PATH [1,2,_,_]→[3,_,_,_]+spawn, +3
  - `1.1-UNIT-004` - game.test.ts:42 — MERGE_1_2 both orders
  - `1.1-UNIT-005` - game.test.ts:50 — NO_1_1_MERGE
  - `1.1-UNIT-006` - game.test.ts:58 — NO_2_2_MERGE
  - `1.1-UNIT-007` - game.test.ts:66 — EQUAL_GE3 [3,3,3,3]→[6,3,3,_]
  - `1.1-UNIT-008` - game.test.ts:74 — NEW_TILE_NOT_REMERGED
  - `1.1-UNIT-009` - game.test.ts:82 — cascade blocked
  - `1.1-UNIT-010` - game.test.ts:89 — ONE_CELL [3,_,3,_]
  - `1.1-UNIT-011` - game.test.ts:97 — ONE_CELL [_,3,_,3]
  - `1.1-UNIT-012` - game.test.ts:105 — ONE_CELL right
  - `1.1-UNIT-013` - game.test.ts:113 — ONE_CELL right wall merge
  - `1.1-UNIT-014` - game.test.ts:121 — NOOP_SWIPE
  - `1.1-UNIT-015` - game.test.ts:134 — move right mirrors left
  - `1.1-UNIT-016` - game.test.ts:142 — move up mirrors left
  - `1.1-UNIT-017` - game.test.ts:157 — move down mirrors up
  - `1.1-UNIT-018` - game.test.ts:173 — move down one-cell
  - `1.1-UNIT-019` - game.test.ts:184 — trace down merge
  - `1.1-UNIT-020` - game.test.ts:198 — spawnTile full board
  - `1.1-UNIT-021` - game.test.ts:211 — pickIndex clamps
  - `1.1-UNIT-022` - game.test.ts:218 — spawn once uniform empty cell
  - `1.1-UNIT-023` - game.test.ts:232 — GAME_OVER full board
  - `1.1-UNIT-024` - game.test.ts:245 — GAME_OVER false: empty cell
  - `1.1-UNIT-025` - game.test.ts:255 — GAME_OVER false: 1-2 row
  - `1.1-UNIT-026` - game.test.ts:265 — GAME_OVER false: 1-2 column
  - `1.1-UNIT-027` - game.test.ts:275 — GAME_OVER false: equal ≥3
  - `1.1-UNIT-028` - game.test.ts:285 — higher merges ≥3
  - `1.1-UNIT-029` - game.test.ts:293 — trace merged sources + spawn
  - `1.1-UNIT-030` - game.test.ts:309 — trace wall merge
  - `1.1-UNIT-031` - game.test.ts:319 — trace noop no spawned entry
  - `1.1-SMOKE-001` - engine.smoke.test.ts:18 — game launches
  - `1.1-SMOKE-002` - engine.smoke.test.ts:32 — 500 deterministic moves
  - `1.1-SMOKE-003` - engine.smoke.test.ts:56 — game over full board
  - `1.1-SMOKE-004` - engine.smoke.test.ts:66 — empty board playable

- **Gaps:** none.
- **Recommendation:** none — suite is green (31/31 unit + 4/4 smoke) and the original 26 tests pass unchanged against the TS port.

---

#### AC-2: Ported engine is pure TS — no RN/React/Skia imports (ADR-01 boundary) (P1)

- **Coverage:** FULL ✅ (updated 2026-08-09 — ADR-01 boundary test added)
- **Tests:**
  - `1.1-PURITY-001` - triade/__tests__/engine/engine.purity.test.ts:31 — ADR-01: no RN/React/Skia/Expo imports in `src/engine`
  - `1.1-PURITY-002` - engine.purity.test.ts:47 — ADR-01: `src/engine` imports are self-contained (relative paths only)
- **Evidence:** grep of `triade/src/engine/**` for `react-native|@shopify|expo|@react-native` → 0 matches. ADR-01 recorded in `game-architecture.md` §S1.1 and ATDD checklist. Now enforced automatically: the purity test scans every `.ts/.tsx` file under `src/engine`, asserts no forbidden specifiers, and asserts all imports are relative (self-contained) — fails the PR if violated. CI runs it via `node --test`.
- **Gaps:** none.
- **Recommendation:** none.

---

#### AC-3: CI benchmark ships in same PR — engine < 2ms, frame worst < 8ms, deterministic on Node (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `1.1-BENCH-001` - triade/benchmarks/engine.bench.test.ts:52 — engine cost per turn (median < 0.1ms budget, tighter than the AC's 2ms)
  - `1.1-BENCH-002` - engine.bench.test.ts:76 — frame-logic worst case 4 locked pairs (median < 0.2ms budget, tighter than AC's 8ms)
- **CI wiring:** `.github/workflows/ci.yml` runs `npx tsc --noEmit` + `node --test` (which includes the benchmark asserts) on every PR — the gate fails the PR over budget.
- **Gaps:** none. Note: the shipped test budgets (0.1ms / 0.2ms) are deliberately ~100x tighter than the story AC (2ms / 8ms) — recalibrated from measured baseline; stricter is acceptable.
- **Recommendation:** none.

---

#### AC-4: One Skia board renders on physical iOS device with real frame rate recorded (baseline for device p99 < 16.7ms job) (P1)

- **Coverage:** PARTIAL ⚠️
- **Tests:**
  - `1.1-SMOKE-001` - engine.smoke.test.ts:18 — engine-side backing board state is playable (indirect)
- **Evidence:** `triade/src/render/GameBoard.tsx` renders one static 4×4 board from the engine snapshot; `useFrameRateBaseline.ts` (Reanimated `useFrameCallback`) ships the fps/p99 recording hook. **Device gate T5.2 is pending** — the real frame-rate baseline on a physical iOS device has NOT been recorded (requires device + CocoaPods).
- **Gaps:**
  - Missing: recorded frame-rate baseline (fps, p99) from a physical iOS device run (T5.2 DEVICE GATE)
  - Missing: dev-build boot on physical device (T1.4 DEVICE GATE)
- **Recommendation:** run the two pending device gates on the developer bench (physical iOS + CocoaPods); record the baseline number in `game-architecture.md`. This is manual validation per project standards — not an automated-test gap.

---

#### AC-5: Spike result recorded in the architecture document (FR-5) (P1)

- **Coverage:** FULL ✅
- **Tests:** n/a (documentation deliverable — verified by inspection).
- **Evidence:** `game-architecture.md` §S1.1 Spike Results (2026-08-08) records: engine port + ADR-01 verification, measured benchmark numbers, dev-build viability, storage decision deferred, Pinned Version Matrix correction. Present and complete.
- **Gaps:** none.
- **Recommendation:** none.

---

### Coverage Summary (by priority)

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 2              | 2             | 100%       | ✅ PASS |
| P1        | 3              | 2             | 67%        | ⚠️ WARN |
| P2        | 0              | 0             | —          | —      |
| P3        | 0              | 0             | —          | —      |
| **Total** | **5**          | **4**         | **80%**    | **✅ PASS** |

> Updated 2026-08-09 after AC-2 gap closure (ADR-01 boundary test). Prior run: 60% overall / 33% P1.

### Test Inventory Summary

| Test Level | Tests | Criteria Covered | Coverage % |
| ---------- | ----- | ---------------- | ---------- |
| E2E        | 0     | 0                | 0%         |
| API        | 0     | 0                | 0%         |
| Component  | 0     | 0                | 0%         |
| Unit       | 39    | 5                | 100%       |
| **Total**  | **39**| **5**            | **100%**   |

---
## Step 4 Output: Phase 1 Coverage Matrix & Gap Analysis

**Phase 1 coverage matrix:** `_bmad-output/test-artifacts/traceability/coverage-matrix-phase1.json` (PHASE_1_COMPLETE)

### Coverage Statistics

- Total Requirements: 5
- Fully Covered: 4 (80%)
- Partially Covered: 1
- Uncovered: 0

### Priority Coverage

- P0: 2/2 (100%)
- P1: 2/3 (67%)
- P2: 0/0
- P3: 0/0

### Gap Analysis

- Critical (P0 uncovered): 0
- High (P1 uncovered): 0
- Medium (P2 uncovered): 0 — **Partial coverage item:** AC-4 (device frame-rate baseline T5.2 pending)
- Low (P3 uncovered): 0

### Coverage Heuristics

- Endpoints without tests: 0 (no API)
- Auth negative-path gaps: 0 (no auth)
- Happy-path-only criteria: 0
- UI journeys without E2E: 0 (Skia manual validation, documented)

### Recommendations

1. **MEDIUM** — Run pending device gates T1.4 (dev-build boot) and T5.2 (frame-rate baseline) on physical iOS and record the baseline — closes AC-4 partial. *(AC-2 gap closed 2026-08-09 via `engine.purity.test.ts`.)*
2. **LOW** — Run `/bmad:tea:test-review` to assess test quality.

---
## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

### Evidence Summary

#### Test Execution Results

- **Total Tests**: 39
- **Passed**: 39 (100%)
- **Failed**: 0 (0%)
- **Skipped**: 0 (0%)
- **Duration**: ~318ms

**Test Results Source**: local run (`node --test` from `triade/`, Node v26.0.0, commit d3a2158 + purity tests added 2026-08-09)

#### Coverage Summary (from Phase 1)

- **P0 Acceptance Criteria**: 2/2 covered (100%) ✅
- **P1 Acceptance Criteria**: 2/3 covered (67%) ⚠️
- **Overall Coverage**: 80%

**Code Coverage**: not measured (zero-dep project; node:test has no built-in coverage gate).

#### Non-Functional Requirements (NFRs)

- **Performance**: PASS ✅ — deterministic CI benchmark gates ship (engine < 0.1ms median, frame worst < 0.2ms median; AC budgets were 2ms/8ms). ADR-04 two-level benchmark: Level 1 wired in CI; Level 2 (device p99 < 16.7ms) pending device gate (AC-4).
- **Reliability**: PASS ✅ — 37/37 deterministic (injected RNG / seeded PRNG, no `Math.random` in tests).
- **Maintainability**: PASS ✅ — AC-2 ADR-01 boundary is now enforced by an automated purity test (`engine.purity.test.ts`, 2 tests).

**NFR Source**: `_bmad-output/project-context.md` + ATDD checklist + architecture §S1.1

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
| Overall Coverage       | ≥80%      | 80%    | ✅ PASS |

**P1 Evaluation**: ❌ FAILED

### GATE DECISION: FAIL (re-run)

### Rationale

Re-run after closing the AC-2 gap. **P0 coverage is 100%** (AC-1, AC-3 FULL) and **overall coverage is 80%** (minimum met). The AC-2 ADR-01 boundary is now enforced automatically by `engine.purity.test.ts` (39/39 tests green, tsc clean). **The remaining blocker is P1 coverage at 67%** (< 80% minimum): the single partial requirement is **AC-4 (device frame-rate baseline)** — the Skia board code and `useFrameRateBaseline` hook ship, but the physical-device gates **T1.4/T5.2 have not been run** (requires an iOS device + CocoaPods). This is a manual hardware-validation gap, not a code or test defect.

### Critical Issues (For FAIL)

| Priority | Issue | Description | Owner | Due Date | Status |
| -------- | ----- | ----------- | ----- | -------- | ------ |
| P1       | Device gates T1.4/T5.2 pending | Dev-build boot + frame-rate baseline need physical iOS + CocoaPods | Dev bench | before greenlighting full UI rewrite | OPEN |

> AC-2 (ADR-01 boundary test) — **RESOLVED 2026-08-09** (removed from open issues).

### Gate Recommendations

#### For FAIL Decision ❌

1. **Run the pending device gates** (T1.4 dev-build boot, T5.2 frame-rate baseline) on the physical iOS bench and record the baseline in `game-architecture.md` — the sole remaining P1 gap.
2. **Re-run the gate** (`bmad tea *trace`) after the device baseline lands; decision is expected to move to PASS.

### Next Steps

**Immediate Actions:**

1. Run device gates T1.4/T5.2 and record baseline (closes AC-4).
2. Re-run `bmad tea *trace` for Story 1.1.

**Stakeholder Communication:**

- Notify DEV lead: gate = FAIL on the single remaining device-baseline gap; code/test suite is 39/39 green, tsc clean.

---

## Sign-Off

**Phase 1 - Traceability Assessment:**

- Overall Coverage: 80%
- P0 Coverage: 100% ✅
- P1 Coverage: 67% ⚠️
- Critical Gaps: 0 (no uncovered P0/P1; 1 partial — AC-4 device baseline)

**Phase 2 - Gate Decision:**

- **Decision**: FAIL ❌ (re-run 2026-08-09)
- **P0 Evaluation**: ✅ ALL PASS
- **P1 Evaluation**: ❌ FAILED (AC-4 device baseline pending)

**Overall Status:** FAIL — the sole remaining gap is AC-4 (physical-device frame-rate baseline T1.4/T5.2). All code/test deliverables complete: 39/39 green, tsc clean, AC-1/AC-2/AC-3/AC-5 FULL.

**Next Steps:**

- Run the two device gates on the physical iOS bench and record the baseline, then re-run the workflow (expected decision: PASS).

**Generated:** 2026-08-09
**Workflow:** testarch-trace v4.0 (Enhanced with Gate Decision)

---

<!-- Powered by BMAD-CORE™ -->
