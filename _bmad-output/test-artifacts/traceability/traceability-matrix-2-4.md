---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-08-21'
tempCoverageMatrixPath: '_bmad-output/test-artifacts/traceability/coverage-matrix-2-4.json'
workflowType: 'testarch-trace'
inputDocuments:
  - '_bmad-output/implementation-artifacts/2-4-curva-halving-decay-normalizada.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/implementation-artifacts/2-4-curva-halving-decay-normalizada.md'
  - '_bmad-output/planning-artifacts/epics.md#Story 2.4'
externalPointerStatus: 'not_used'
---

# Traceability Matrix & Gate Decision - Story 2.4: Curva halving-decay normalizada

**Target:** Story 2.4 — Curva halving-decay normalizada
**Date:** 2026-08-21
**Evaluator:** Eduardo (TEA Agent)
**Coverage Oracle:** acceptance_criteria
**Oracle Confidence:** high
**Oracle Sources:** `_bmad-output/implementation-artifacts/2-4-curva-halving-decay-normalizada.md`, `_bmad-output/planning-artifacts/epics.md#Story 2.4`

---

## Step 1 Output: Coverage Oracle Resolution

### Resolved Oracle

- **Type:** Formal requirements (story acceptance criteria)
- **Source:** Story 2.4 has 5 acceptance criteria (AC-1..AC-5) defined in the story file (lines 17-21) and `epics.md` (Story 2.4).
- **Rationale:** Formal requirements oracle — the ACs are explicit, machine-testable, and approved (FR-8 halving-decay I/O matrix + N1 float rule). The implementation proves them with a dedicated pure-module unit suite (`weights.test.ts`, 11 tests) plus a weighted-aware pipeline rewrite (`pot-tier-pipeline.test.ts`) and existing compatibility pins in `pot.test.ts`/`spawn.test.ts`/`game.test.ts`. Highest-confidence oracle available. No external pointers, no contract/spec artifacts, no synthetic inference needed.
- **Confidence:** HIGH — ACs are directly testable; verified through `weights.test.ts` (11 activated tests, all green) and full-engine regression (247/247 green per runtime run + Story Dev Agent Record).

### Artifacts Loaded

- Story file: `_bmad-output/implementation-artifacts/2-4-curva-halving-decay-normalizada.md`
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-2-4-curva-halving-decay-normalizada.md`
- Test review report: `_bmad-output/test-review-report-story-2-4.md`
- Epics (Story 2.4): `_bmad-output/planning-artifacts/epics.md`
- GDD (Adaptive Spawn halving-decay / FR-8): `_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md`
- Engine source: `triade/src/engine/core/weights.ts`, `triade/src/engine/core/spawn.ts`, `triade/src/engine/config/spawnConfig.ts`, `triade/src/engine/core/index.ts`
- Test source: `triade/__tests__/engine/weights.test.ts`, `triade/__tests__/engine/pot-tier-pipeline.test.ts`

### Knowledge Base Loaded

- `test-priorities-matrix.md` (P0-P3 criteria & coverage targets)
- `risk-governance.md` (gate decision rules: score=9 → FAIL, ≥6 → CONCERNS)
- `probability-impact.md` (3×3 scoring scale)
- `test-quality.md` (execution limits, isolation, green criteria)
- `selective-testing.md` (risk-based selection)

### Trace Target Metadata

- **Gate type:** story
- **Story ID:** 2.4
- **Story label:** Curva halving-decay normalizada
- **Status in story file:** review (all tasks checked)

---

## Step 2 Output: Test Discovery & Catalog

### Test Inventory (12 in-scope tests — all Unit level; full engine suite 247 green)

**Runtime evidence:** `npm test` (from `triade/`) → **247 passed, 0 failed, 0 skipped** (~2.2s). The 12 Story 2.4 tests are a subset of the engine unit suite and execute deterministically (pure functions + injected `rng`; no wall-clock or OS dependence). All tests are seeded/deterministic (`mulberry32`, `rngOf`, counting rngs) — no `Math.random` in test paths.

**Primary source:** `triade/__tests__/engine/weights.test.ts` (11 tests). Helpers from `triade/test-utils/helpers.ts` (`rngOf`, `mulberry32`, `extractSpecifiers`). Modules under test: `triade/src/engine/core/weights.ts` (`potWeights`, `normalizeTo`, `weightedPicker`), `triade/src/engine/core/spawn.ts` (`weightedValue` pot branch), `triade/src/engine/config/spawnConfig.ts` (`POT_BASE_VALUE`, `POT_WEIGHT`).

| ID | File:Line | Title | Level | Priority | Status |
|----|-----------|-------|-------|----------|--------|
| 2.4-W-001 | weights.test.ts:23 | potWeights literal halving matrix equals FR-8 exactly (AC 1) | Unit | P0 | active |
| 2.4-W-002 | weights.test.ts:29 | normalizeTo sums to POT_WEIGHT within 1e-9 for pot lengths 1..6 (AC 2) | Unit | P0 | active |
| 2.4-W-003 | weights.test.ts:41 | normalizeTo returns a fresh array, never mutates input (AC 2) | Unit | P0 | active |
| 2.4-W-004 | weights.test.ts:49 | Defensive guard: normalizeTo all-zero for non-positive totals (N1) | Unit | P1 | active |
| 2.4-W-005 | weights.test.ts:55 | Normalized weights strictly decreasing, halve per step, tiers 1..8 (AC 3) | Unit | P1 | active |
| 2.4-W-006 | weights.test.ts:71 | weightedPicker re-normalizes: [1,0.5] ≡ [2/3,1/3] select index 0 equally (AC 4, N1) | Unit | P0 | active |
| 2.4-W-007 | weights.test.ts:87 | weightedPicker boundary rolls: 2/3±1e-6, 0.99 → last index (AC 4) | Unit | P0 | active |
| 2.4-W-008 | weights.test.ts:95 | weightedPicker consumes exactly one rng draw, incl. pot length 1 (RNG contract) | Unit | P0 | active |
| 2.4-W-009 | weights.test.ts:106 | Defensive guard: weightedPicker → last index (never undefined) on non-finite (N1) | Unit | P1 | active |
| 2.4-W-010 | weights.test.ts:112 | Statistical sampling: within-pot frequencies match halving-decay ratios ±1% abs AND ±10% rel (AC 5) | Unit | P1 | active |
| 2.4-W-011 | weights.test.ts:149 | weights.ts purity: spawnConfig keying, re-export, no UI imports (AC 1, 3) | Unit | P1 | active |
| 2.4-PIPE-001 | pot-tier-pipeline.test.ts:74 | Every intra-pot slot reachable at its tier (weighted-aware reachability, halving decay) | Unit | P1 | active |

**Supporting compatibility pins (regression guard — verified green unchanged under halving decay):**

| ID | File:Line | Title | Level | Status |
|----|-----------|-------|-------|--------|
| 2.4-POT-PIN-WIRING | pot.test.ts:48 | weightedValue wiring resolves pot values by tier (`weightedValue(rngOf(0.9, 0.99), 5) → 96`, `weightedValue(rngOf(0.9, 0.0), 5) → 3` — verified to hold under halving decay) | Unit | active |
| 2.4-POT-PIN-DC1 | pot.test.ts:57 | Draw-count pin: tier 0 → one roll, tier ≥1 → two rolls (two-stage structure preserved) | Unit | active |
| 2.4-POT-PIN-DC2 | pot.test.ts:74 | Draw-count pin: roll in fixed band consumes one roll even at tier ≥1 | Unit | active |
| 2.4-SPAWN-PIN-SUM | spawn.test.ts:11 | Distribution sum invariant `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2]+POT_WEIGHT === 1.0` (1e-9) | Unit | active |
| 2.4-SPAWN-PIN-DRIFT | spawn.test.ts:25 | Statistical drift tripwire: ~20% pot frequency within ±2% | Unit | active |
| 2.4-GAME-PIN | game.test.ts:22 | 40/40/20 boundary assertions unchanged (`rngOf(0.39)→1` … `rngOf(0.999)→3`) | Unit | active |

### Coverage Heuristics Inventory

- **API endpoints:** None (pure-logic engine module; no HTTP API). Not applicable.
- **Auth/authz:** None (no auth in scope). Not applicable.
- **Error-path coverage:** Present — defensive guards on non-positive totals (`2.4-W-004`) and non-finite rolls (`2.4-W-009`); RNG-stream drift detection via draw-count pins (`2.4-W-008`, `2.4-POT-PIN-DC1`, `2.4-POT-PIN-DC2`); mutation-resistance of `normalizeTo` input (`2.4-W-003`).
- **UI journey E2E:** None — pure engine resolver; no UI in scope. Tier is not yet plumbed into `move()` (Story 2.6).
- **UI states:** Not applicable.

---

## Step 3 Output: Traceability Matrix

### Criteria Mapped (Story 2.4 — 5 ACs)

#### AC-1: Each pot value weighs half the next-lower one (FR-8 literal matrix: `3=1`, `6=1/2`, `12=1/4`, `24=1/8`, `48=1/16`, `96=1/32`) (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `2.4-W-001` - weights.test.ts:23 — `potWeights([3,6,12,24,48,96])` → `[1, 0.5, 0.25, 0.125, 0.0625, 0.03125]` via `deepStrictEqual` (exact — every value is `3/v = 2^-i`, no tolerance needed); plus `[3]→[1]`, `[3,6]→[1,0.5]` edge pots
  - `2.4-W-005` - weights.test.ts:55 — monotonicity + halving ratio (`w[i+1] ≈ w[i]/2`, 1e-9) across tiers 1..8
  - `2.4-W-011` - weights.test.ts:149 — purity guard: `weights.ts` imports from `spawnConfig.ts` (curve keyed off `POT_BASE_VALUE`, no scattered literals); no RN/React/Skia/Expo imports; re-exported from `core/index.ts`
- **Gaps:** none.
- **Recommendation:** none.

---

#### AC-2: Pot weights normalized per tier so the pot always sums to 20% of total spawn weight (`POT_WEIGHT = 0.2`), verified with epsilon tolerance (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `2.4-W-002` - weights.test.ts:29 — `normalizeTo(POT_WEIGHT, potWeights(potForTier(t)))` sums to `POT_WEIGHT` within `1e-9` for pot lengths 1..6
  - `2.4-W-003` - weights.test.ts:41 — returns a fresh array; input untouched
  - `2.4-W-004` - weights.test.ts:49 — defensive guard: all-zero output on non-positive totals (`[0,0]`, `[]`, `[-1,1]`)
  - `2.4-SPAWN-PIN-SUM` - spawn.test.ts:11 — coupling invariant `FIXED + POT_WEIGHT === 1.0` (1e-9) kept green
  - `2.4-SPAWN-PIN-DRIFT` - spawn.test.ts:25 — statistical tripwire: pot frequency ≈20% within ±2%
- **Gaps:** none.
- **Recommendation:** none.

---

#### AC-3: Weights are monotonic — a higher value never weighs more than a lower one (strictly decreasing within a tier) (P1)

- **Coverage:** FULL ✅
- **Tests:**
  - `2.4-W-005` - weights.test.ts:55 — tiers 1..8: each `w[i+1] < w[i]` strictly, and `w[i+1] ≈ w[i]/2`
  - `2.4-W-011` - weights.test.ts:149 — purity/source-keying guard (curve derived from `POT_BASE_VALUE`, monotonic by construction)
- **Gaps:** none.
- **Recommendation:** none.

---

#### AC-4: Combined distribution (fixed 40/40 + normalized pot) picked by a `weightedPicker` that always re-normalizes and never trusts its input to sum exactly (N1 float rule) (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `2.4-W-006` - weights.test.ts:71 — re-normalization equivalence: `[1,0.5]` and `[2/3,1/3]` select index 0 with the same probability (N=100k, ±1%) — proves the picker never trusts input to sum to 1.0
  - `2.4-W-007` - weights.test.ts:87 — boundary semantics pinned: `2/3+1e-6 → 1`, `2/3-1e-6 → 0`, `0.99 → last index` on both weight sets (`<` vs `<=` contract)
  - `2.4-W-008` - weights.test.ts:95 — exactly one rng draw per call, including pot length 1 edge
  - `2.4-W-009` - weights.test.ts:106 — defensive guard: `length-1` fallback (never undefined) for zero totals / `NaN` / `undefined` rolls
  - `2.4-POT-PIN-DC1`/`2.4-POT-PIN-DC2` - pot.test.ts:57/74 — two-stage draw-count contract preserved (band roll + one `weightedPicker` roll; tier 0 → 1 roll)
  - `2.4-POT-PIN-WIRING` - pot.test.ts:48 — wiring assertions (`weightedValue(rngOf(0.9, 0.99), 5) → 96`, `weightedValue(rngOf(0.9, 0.0), 5) → 3`) verified to hold under halving decay
  - `2.4-GAME-PIN` - game.test.ts:22 — 40/40/20 boundary assertions unchanged
- **Gaps:** none. (The single-roll combined pick over `{1:0.4, 2:0.4, ...norm}` is deliberately deferred to Story 2.6 `resolveSpawn` per scope guard — the two-stage form still satisfies "picked by a weightedPicker" as documented in the story.)
- **Recommendation:** none.

---

#### AC-5: Halving-decay curve validated by unit tests against the full I/O matrix (FR-8) — literal weight matrix + statistical frequency sampling per tier (P1)

- **Coverage:** FULL ✅
- **Tests:**
  - `2.4-W-010` - weights.test.ts:112 — statistical sampling: tier 1 & 5, N=100k, strict band/pick alternation so every sample lands in the pot branch; only open pot values hit; within-pot frequencies match normalized ratios within ±1% **absolute** AND ±10% **relative** (the relative band constrains the low-ratio `96` tail slot)
  - `2.4-PIPE-001` - pot-tier-pipeline.test.ts:74 — weighted-aware reachability: cumulative-band midpoints (robust to float drift and `<` vs `<=`), every pot slot drawable at tiers 2 & 5
  - `2.4-SPAWN-PIN-DRIFT` - spawn.test.ts:25 — distribution drift tripwire (~20% pot) kept green
- **Gaps:** none. (Expected ratios are derived from `normalizeTo` output, not hardcoded, so they cannot go stale when the curve becomes configurable in 2.5.)
- **Recommendation:** none.

---

### Coverage Summary (by priority)

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 3              | 3             | 100%       | ✅ PASS |
| P1        | 2              | 2             | 100%       | ✅ PASS |
| P2        | 0              | 0             | —          | —      |
| P3        | 0              | 0             | —          | —      |
| **Total** | **5**          | **5**         | **100%**   | **✅ PASS** |

### Test Inventory Summary

| Test Level | Tests | Criteria Covered | Coverage % |
| ---------- | ----- | ---------------- | ---------- |
| E2E        | 0     | 0                | 0%         |
| API        | 0     | 0                | 0%         |
| Component  | 0     | 0                | 0%         |
| Unit       | 12 (in scope) + 6 compat pins / 247 (full suite) | 5 | 100% |
| **Total**  | **18** | **5**            | **100%**   |

---

## Step 4 Output: Phase 1 Coverage Matrix & Gap Analysis

**Phase 1 coverage matrix:** `_bmad-output/test-artifacts/traceability/coverage-matrix-2-4.json` (PHASE_1_COMPLETE)

### Coverage Statistics

- Total Requirements: 5
- Fully Covered: 5 (100%)
- Partially Covered: 0
- Uncovered: 0

### Priority Coverage

- P0: 3/3 (100%)
- P1: 2/2 (100%)
- P2: 0/0
- P3: 0/0

### Gap Analysis

- Critical (P0 uncovered): 0
- High (P1 uncovered): 0
- Medium (P2 uncovered): 0
- Low (P3 uncovered): 0

### Coverage Heuristics

- Endpoints without tests: 0 (no API)
- Auth negative-path gaps: 0 (no auth)
- Happy-path-only criteria: 0
- UI journeys without E2E: 0 (pure engine resolver; no UI in scope; tier not yet plumbed into `move()` — Story 2.6)

### Recommendations

1. **LOW** — Run `/bmad:tea:test-review` to assess test quality of the new `weights.test.ts` suite.
2. **INFO** — Re-trace after Stories 2.5 (configurable curve) and 2.6 (`resolveSpawn` combined single-roll pick) land, since the two-stage draw structure and the statistical band/pick alternation (`weights.test.ts:120-127`) will change; the draw-count pins stay authoritative.

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

### Evidence Summary

#### Test Execution Results

- **Total Tests (full suite)**: 247
- **Passed**: 247/247 (100%)
- **Failed**: 0 (0%)
- **Skipped**: 0 (0%)
- **Duration**: ~2.2s

**Test Results Source**: local run (`npm test` from `triade/`, commit `096d13cd`). The 12 Story 2.4 tests + 6 compatibility pins are a deterministic subset (pure functions + injected `rng`).

#### Coverage Summary (from Phase 1)

- **P0 Acceptance Criteria**: 3/3 covered (100%) ✅
- **P1 Acceptance Criteria**: 2/2 covered (100%) ✅
- **Overall Coverage**: 100%

**Code Coverage**: not measured (zero-dep project; node:test has no built-in coverage gate).

#### Non-Functional Requirements (NFRs)

- **Performance**: PASS ✅ — engine benchmark gates green in the suite (`engine cost per turn < 0.1ms`, `frame-logic tail p99 < 0.2ms`, `transition-plan p99 < 0.1ms`); `potWeights`/`normalizeTo`/`weightedPicker` are pure array ops with no hot-path regression.
- **Reliability**: PASS ✅ — all Story 2.4 tests deterministic (pure, injected `rng`). RNG-consumption contract pinned at both layers (`weightedPicker` = 1 draw; `weightedValue` two-stage = 1 or 2 draws) — exactly what replay determinism in Story 2.6 depends on.
- **Maintainability**: PASS ✅ — ADR-01 purity enforced by test (`weights.ts` imports only `spawnConfig.ts`; no RN/React/Skia/Expo). Scope guard respected: no config parameterization (2.5), no `move()` plumbing / combined roll (2.6). Expected ratios derived from `normalizeTo` output (not hardcoded) so they cannot go stale.

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion             | Threshold | Actual | Status    |
| --------------------- | --------- | ------ | --------- |
| P0 Coverage           | 100%      | 100%   | ✅ PASS   |
| P0 Test Pass Rate     | 100%      | 100%   | ✅ PASS   |
| Critical NFR Failures | 0         | 0      | ✅ PASS   |
| Flaky Tests           | 0         | 0      | ✅ PASS   |

**P0 Evaluation**: ✅ ALL PASS

#### P1 Criteria (Required for PASS, May Accept for CONCERNS)

| Criterion              | Threshold | Actual | Status |
| ---------------------- | --------- | ------ | ------ |
| P1 Coverage            | ≥80%      | 100%   | ✅ PASS |
| P1 Test Pass Rate      | ≥90%      | 100%   | ✅ PASS |
| Overall Test Pass Rate | ≥90%      | 100%   | ✅ PASS |
| Overall Coverage       | ≥80%      | 100%   | ✅ PASS |

**P1 Evaluation**: ✅ ALL PASS

### GATE DECISION: PASS

### Rationale

P0 coverage is 100% and overall coverage is 100% (minimum: 80%). P1 coverage is 100% (target: 90%). All 5 acceptance criteria are FULL covered: the FR-8 halving matrix is pinned literally via `deepStrictEqual` plus monotonicity/halving-ratio sweeps and a `spawnConfig`-keying purity guard (AC-1, AC-3); per-tier normalization to `POT_WEIGHT` is proven within `1e-9` with fresh-array and all-zero guard branches (AC-2); the `weightedPicker` N1 re-normalization is proven by distributional equivalence + boundary rolls + draw-count + never-undefined guard, with the two-stage RNG contract and 40/40/20 pins kept green unchanged (AC-4); and the full I/O matrix is validated by ±1% absolute / ±10% relative statistical sampling plus weighted-aware slot reachability (AC-5). Full engine suite 247/247 green, zero regressions on compatibility pins.

### Critical Issues (For FAIL)

None — 0 open.

### Gate Recommendations

#### For PASS Decision ✅

1. **Proceed** — Story 2.4 meets all coverage and pass-rate thresholds.
2. **Confirm PR ready** — changes carry `weights.ts` + `spawn.ts` wiring + `core/index.ts` re-export + `weights.test.ts` + weighted-aware `pot-tier-pipeline.test.ts` rewrite; CI runs `tsc --noEmit` + `npm test`.
3. **Follow-up** — run `/bmad:tea:test-review` on `weights.test.ts` when convenient; re-trace after Stories 2.5/2.6 land.

### Next Steps

**Immediate Actions:**

1. Advance Story 2.4 out of review; Story 2.5 (configurable curve) can start — the halving-decay curve, normalization, and weighted picker are proven pure and keyed to `spawnConfig`.
2. Re-run `bmad tea *trace` after Stories 2.5–2.6 to trace the end-to-end Adaptive Spawn assembly (configurable curve → combined single-roll `resolveSpawn` pick → `pendingSpawn`/`move()` integration).

**Stakeholder Communication:**

- Notify DEV lead: gate = PASS, 12/12 Story 2.4 unit tests + full 247-test engine suite green; no device/E2E gates required (pure engine resolver, no UI).

---

## Sign-Off

**Phase 1 - Traceability Assessment:**

- Overall Coverage: 100%
- P0 Coverage: 100% ✅
- P1 Coverage: 100% ✅
- Critical Gaps: 0 (no uncovered P0/P1; no partials)

**Phase 2 - Gate Decision:**

- **Decision**: PASS ✅
- **P0 Evaluation**: ✅ ALL PASS
- **P1 Evaluation**: ✅ ALL PASS

**Overall Status:** PASS — Story 2.4 delivers the FR-8 halving-decay curve (`potWeights` keyed off `POT_BASE_VALUE`), per-tier normalization to the 20% pot (`normalizeTo`), and a re-normalizing weighted picker (`weightedPicker`, N1 float rule) wired into `weightedValue`'s pot branch, replacing the 2.3 uniform placeholder. The RNG-stream contract is pinned at both draw layers and the 20%-pot band invariant is preserved by existing drift tripwires. ADR-01/ADR-06 invariants intact. Full suite 247/247 green.

**Next Steps:**

- Advance to Story 2.5 (configurable curve), then 2.6 (combined `resolveSpawn`).

**Generated:** 2026-08-21
**Workflow:** testarch-trace v5.0 (Enhanced with Gate Decision)

---

<!-- Powered by BMAD-CORE™ -->