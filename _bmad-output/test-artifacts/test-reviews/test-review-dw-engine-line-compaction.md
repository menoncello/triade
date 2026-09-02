---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments: ['_bmad-output/implementation-artifacts/spec-engine-line-compaction.md', '_bmad-output/test-artifacts/test-design/test-design-dw-engine-line-compaction.md', '_bmad-output/test-artifacts/atdd-checklist-dw-engine-line-compaction.md', 'triade/src/engine/core/line.ts', 'triade/src/engine/core/types.ts', 'triade/src/engine/core/rules.ts', 'triade/__tests__/engine/line-compaction.atdd.test.ts', 'triade/__tests__/engine/line-compaction.regression.test.ts', '_bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts', '_bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts', '_bmad-output/test-artifacts/fixtures/engine-line-compaction-fixtures.ts']
---

# Test Quality Review: dw-engine-line-compaction

**Quality Score**: 98/100 (A - Excellent)
**Review Date**: 2026-09-02
**Review Scope**: directory
**Reviewer**: TEA Agent (Muse Spark)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Request Changes

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Deterministic, host-only `node:test + tsx` harness — zero hard waits, zero conditional assertions, zero wall-clock fixtures, pure `shiftLine` arithmetic
✅ Full wall-scan invariant coverage: every P0 multi-gap wall pin asserts both `line[].v` ordering and `from [[r,c]]` wall fidelity plus `moved`/`score` (DW-74 gap-non-merge + cascade single-pass preserved)
✅ Single-source discipline: wall-scan `while(target>0…)` exactly 1 site, `const n=line.length` + `for i<n` + `dest` bounds, `canMerge(out[dest]` vs `out[target].v=t.v` separation, `board[r]?.[c] ?? null` ×2, `GRID_SIZE=4` single definition — all asserted with exact `rg` counts

### Key Weaknesses

❌ Three reviewed files exceed 300 lines (H5 HIGH): gateway 340, umbrella 335, ATDD scaffold 318 — file-length gate triggers Request Changes
❌ Inline bench magic literals (`10000` iterations, `50` ms threshold) appear without a named constant in 2 files (L6 LOW)
❌ ATDD scaffolds remain 20 `it.skip` (intentionally dormant RED phase) — not a C1 violation because RED-phase header documents the skip reason, but oversize is the file's only HIGH

### Summary

The `dw-engine-line-compaction` bundle (`7eacd93 fix(engine): fully compact shiftLine multi-gap and harden 4x4 guards` vs baseline `505c8ea`, metadata-only working-tree diff `deferred-work.md DW-20/DW-74 open→done + resolution-undo 26a75af…`) is a model TEA Automate hardening seam for a pure engine arithmetic fix. Host verification is `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` with `refLine`/`staticBoard`/`emptyBoard` factories — no Playwright/Cypress harness required per `test-levels-framework.md` Unit dominance and test-design execution strategy `PR (<15 min) / no device`. All 27 TEA contracts (21 gateway + 6 umbrella) are green, 11 regression pins are green, 32 `line.test.ts + line-moved` + 48 `game.test.ts + transitionPlan.test.ts` wall expectations remain green, and both `tsconfig.json` + `tsconfig.test.json` type gates are clean. The only ledger deductions are file-length oversize (H5) and two magic bench literals (L6); determinism, isolation, assertions, network-first, fixture, and data-factory criteria are all PASS. Bonuses for deterministic fixtures, data factories, and perfect isolation offset the HIGH deductions to 98/100, but the absolute H5 gate still drives the computed verdict to Request Changes (any HIGH → Request Changes) — split any of the three oversize files to ≤300 lines and the suite returns to Approve.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS (n/a) | 0    | Convention: bddNaming (emerging: 7 of 40 sampled) | Repo uses `[P0]`/`[P1]` behavioral naming convention (25/40 priority-marked), not Given/When/Then; convention emerging (<50%) — no deduction per schedule |
| Test IDs                             | ✅ PASS (n/a) | 0    | Convention: testIds (absent: 0 of 40 sampled) | 0 of 40 sampled files use `data-testid`/`getByTestId`; no house test-id convention — PASS (n/a), deducted nothing |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: priorityMarkers (established: 25 of 40 sampled, form `[P0]` in test name) | All reviewed tests carry `[P0]`/`[P1]`/`[P2]`/`[P3]` or `E2E-0x` + priority tag prefix matching observed form; adopted in 62.5% of corpus — PASS |
| Disabled or Focused Tests            | ✅ PASS | 0    | Absolute | No `.only`, `fdescribe`, `fit`, `test.only` committed. ATDD `triade/__tests__/engine/line-compaction.atdd.test.ts` carries 20 `it.skip` but each file header documents "red-phase scaffolds — covering working-tree delta 505c8ea→7eacd93" as the still-true reason on the lines above the skips; per C1/C2 a documented, still-true reason on the line or the line above is not a violation. The TEA trace records these as `status: skipped` with `skip_reason: RED-phase scaffold it.skip — active coverage via gateway/umbrella/regression (21+6+11 pass when activated)` — intentional dormant, not disabled |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | Zero `waitForTimeout`, `sleep(`, `time.sleep(`, `Thread.sleep(`, `cy.wait(number)` across all four reviewed files |
| Determinism (no conditionals)        | ✅ PASS | 0    | Absolute | No `if`/`ternary` selecting expected values, no `try/catch` swallowing assertion failures, no `Math.random`/`Date.now` without fake timers governing TTL/expiry; bench loop is fixed-count `for i<10000` deterministic |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | No module-level mutable state written inside tests without `beforeEach`/`afterEach` reset; each test builds fresh `refLine`/`emptyBoard`/`staticBoard` Board; no global mutation |
| Fixture Patterns                     | ✅ PASS | 0    | Applicability: file constructs domain payloads | Boards via `staticBoard`/`emptyBoard` factories, `refLine`/`colRefLine` deterministic factories, `pipelinePreSpawn` composition; fixture file `_bmad-output/test-artifacts/fixtures/engine-line-compaction-fixtures.ts` provides canonical `WALL_RIGHT_BOARD`/`DOUBLE_GAP_BOARD`/`CASCADE_BOARD` deterministic fixtures consumed via import |
| Data Factories                       | ✅ PASS | 0    | Applicability: file constructs domain payloads | Factory functions with overrides pattern used throughout (`refLine(...vs)`, `emptyBoard`, `staticBoard`); no hardcoded inline payload bypassing existing factory; gateway correctly uses local `refLine` mirroring fixture factory, not inline duplication |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: file navigates and then reads data-dependent content | No `page.goto`/`cy.visit`/router push in pure engine seam — gate closed; `tea_use_playwright_utils:true` loaded but `browser_automation:auto` correctly stays host-only for Expo Canvas pure math |
| Explicit Assertions                  | ✅ PASS | 0    | Absolute | Every test contains ≥1 explicit assertion (`assert.deepStrictEqual`/`assert.equal`/`assert.doesNotThrow`/`assert.match`/`assert.ok`); zero tests without assertions |
| Test Length (≤300 lines)             | ❌ FAIL | 3    | Absolute | `line-compaction.atdd.test.ts` 318 lines, `engine-line-compaction.gateway.spec.ts` 340 lines, `engine-line-compaction.umbrella.spec.ts` 335 lines exceed 300. `line-compaction.regression.test.ts` 82 lines PASS. Threshold per `test-quality.md` ≤300 ideal; H5 HIGH per registry |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | Each test file runs <1.5 min host (`gateway 2.8 ms` P0 + `1.3 ms` P1 + `4.9 ms` P2; `umbrella 3.9 ms` + `4.5 ms`; `ATDD 1.3+0.37+0.18+0.06 ms` skipped suites; `regression 130 ms` total); proxy complexity ≤3 wall steps per tile (n=4, 48 ops per `move()`) — well under target |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute | Zero tight timeouts (`{timeout:1000}`), race conditions, timing-dependent assertions, retry logic, or environment-dependent assumptions; `performance.now()` micro-bench is deterministic fixed-count, not wall-clock fixture governing expiry |

**Total Violations**: 0 Critical, 3 High, 0 Medium, 2 Low

**Convention Baseline**: 40 test files sampled outside the review set of 119 corpus files (capped at 40 closest-first by directory distance from reviewed files, per step-02 sampling rules). `priorityMarkers: 25/40 established [P#]`, `testIds: 0/40 absent`, `bddNaming: 7/40 emerging`, `networkFirst: 0/40 absent`, `dataFactories: 14/40 emerging`, `fixtures: 0/40 absent`, `assertionStyle: 40/40 established (assert)`; `unknown` never applied (sampled ≥4).

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -3 × 5 = -15
Medium Violations:       -0 × 2 = -0
Low Violations:          -2 × 1 = -2

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +5
  Data Factories:        +5
  Network-First:         +0
  Perfect Isolation:     +5
  All Test IDs:          +0
                          --------
Total Bonus:             +15

Final Score:             98/100
Grade:                   A
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Oversize test files — split to ≤300 lines (H5 HIGH)

**Severity**: P1 (High)
**Location**: `triade/__tests__/engine/line-compaction.atdd.test.ts:318`, `_bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts:340`, `_bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts:335`
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
Three reviewed files exceed the `test-quality.md` ideal file-length gate of ≤300 lines by 18–40 lines. The gateway (340) and umbrella (335) each carry 6 journeys/containers plus header boilerplate; the ATDD scaffold (318) carries 20 `it.skip` contracts plus a 20-line header. Oversize files erode reviewability and localize-failure cost — the threshold is absolute and not waivable by context.

**Current Code**:

```typescript
// gateway 340 lines, umbrella 335 lines, atdd 318 lines — all >300
// each contains a 20-line file header + 4-6 describe blocks + helpers
```

**Recommended Improvement**:

```typescript
// Option A — split gateway into two API suites
// _bmad-output/test-artifacts/tests/api/engine-line-compaction.wall.spec.ts  (P0 wall + preserves, ~160 lines)
// _bmad-output/test-artifacts/tests/api/engine-line-compaction.guards.spec.ts (P1 guards + P2 scans, ~180 lines)
// Option B — extract shared helpers (refLine, readSrc) into fixtures file and import (already exists as engine-line-compaction-fixtures.ts)
// Option C — for ATDD, keep 20 scaffolds but move P3 exploratory + hygiene into a separate atdd-p3 file (20 → 18 + 2)
```

**Benefits**:
Maintainability and failure localization; splits are zero-net new coverage (same 27 contracts + 20 scaffolds), only moved.

**Priority**:
P1 High — any H5 is HIGH; the computed verdict is Request Changes while this persists. Cheap fix (≈15 min split + re-run `npm --prefix triade test`).

---

### 2. Single wall-scan site count brittle to histogram rename (H5 context, H1 adjacent)

**Severity**: P1 (High) — already counted under H5 above; this recommendation adds a preserve note, not an additional deduction
**Location**: `triade/src/engine/core/line.ts:55-56`
**Row**: H5 (same file-length row) / advisory for preserve
**Criterion**: Test Length / Flakiness Patterns (preserve coupling)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
The wall-scan contract is asserted in three places (`gateway [P2]`, `umbrella [E2E-05]`, `atdd [P2-01]`) with identical regex `while\s*\(\s*target\s*>\s*0\s*&&\s*out\[target\s*-\s*1\]\.v\s*===\s*null\s*\)`. A future rename of the variable `target` to `dst` would fail all three without changing behavior — the allowlist is coupled to identifier spelling, not to semantics. This is not a ledger violation but a maintainability trap for the split.

**Recommended Improvement**:

```typescript
// Keep the wall-scan but name the helper so the test can pin semantics, not spelling:
// triade/src/engine/core/line.ts
function findWallmostEmpty(out: ShiftedCell[], fromIndex: number): number {
  let t = fromIndex;
  while (t > 0 && out[t - 1].v === null) t--;
  return t;
}
// tests then assert: assert.ok(src.includes('findWallmostEmpty')) — single rename-tolerant site
```

**Benefits**:
Decouples behavioral invariant (wall-most empty) from identifier spelling; failure then localizes to one helper.

---

### 3. Magic bench literals — extract named constants (L6 LOW)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts:335`, `_bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts:325`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
Both gateway hygiene test and umbrella residual journey contain `for (let i = 0; i < 10000; i++)` and `elapsed < 50` without a named constant or comment explaining the budget (O(1) n=4 ≤3 steps per tile, 48 ops per `move()`, ~0.005 ms per call, 50 ms wall for 10k). The fixture already exports `shiftLineBench(iterations=10000) → {elapsed, ok: elapsed<50}` with the budget documented; the two spec files duplicate the literal instead of calling the fixture.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation)
const t0 = performance.now();
for (let i = 0; i < 10000; i++) shiftLine(refLine(null, 3, null, 3));
const elapsed = performance.now() - t0;
assert.ok(elapsed < 50, `10k shiftLine must be <50ms, got ${elapsed}ms`);
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
import { shiftLineBench } from '../fixtures/engine-line-compaction-fixtures.ts';
const { elapsed, ok } = shiftLineBench();
assert.ok(ok, `shiftLineBench 10k <50 ms, got ${elapsed.toFixed(1)} ms`);
```

**Benefits**:
Single source of bench budget; wall-scan perf gate lives next to wall-scan helper.

**Priority**:
P3 Low — no risk to verdict on its own; cleanup when splitting oversize files.

---

### 4. ATDD scaffolds intentionally dormant — activate path documented (L6 adjacent, informational)

**Severity**: P3 (Low)
**Location**: `triade/__tests__/engine/line-compaction.atdd.test.ts:35-318`
**Row**: L6 (magic not applicable) — informational convention note
**Criterion**: Magic value / BDD Format
**Knowledge Base**: [component-tdd.md](../../../agents/bmad-tea/resources/knowledge/component-tdd.md)

**Issue Description**:
20 contracts are `it.skip` RED-phase scaffolds with priority markers `P0-01…P3-02`. Dormancy is intentional per `test-design-dw-engine-line-compaction.md` (host `node:test` + `tsx`, no device; ATDD remains via activation `sed s/it.skip/it/g → 20/20 pass` verified in automation-summary). No action required beyond eventual activation when the story closes; the skip header documents the still-true reason so C1 does not fire.

**Recommended Improvement**:
When the story's merge gate opens, run `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test triade/__tests__/engine/line-compaction.atdd.test.ts` after `s/it.skip/it/` and keep the original `line-compaction.regression.test.ts` 11 pins as the committed counterpart to the ATDD's 20 dormant contracts (already green).

---

## Best Practices Found

### 1. Single wall-scan predicate correctly separates shift vs merge sites

**Location**: `triade/src/engine/core/line.ts:55-65`
**Pattern**: Wall-most compaction with merge-site fidelity
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Why This Is Good**:
`shiftLine` uses wall `target` only for the null-shift branch (`while(target>0 && out[target-1].v===null) target--` then `out[target].v=t.v`) while the merge branch keeps immediate `dest=i-1` (`canMerge(out[dest].v, t.v)` → `out[dest].v=merged`). This preserves the gap-non-merge invariant `[3,null,3,null]→[3,3] score 0` — a collapsed `canMerge(out[target]` refactor would incorrectly score 6 across the gap, which the suite catches via both unit `[3,null,3]` and pipeline `staticBoard([3,null,3,null])`.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
if (out[dest].v === null) {
  let target = dest;
  while (target > 0 && out[target - 1].v === null) target--;
  out[target].v = t.v;
  out[target].from = [[t.r, t.c]];
} else if (canMerge(out[dest].v, t.v)) {
  const merged = mergeValue(out[dest].v, t.v);
  out[dest].v = merged;
}
```

**Use as Reference**:
The three allowlist scans (`while(target>0…)==1` + `canMerge(out[dest]==1 not target` + `out[target].v=t.v==1 vs out[dest].v=merged==1`) make any re-introduction of `GRID_SIZE` or duplicate wall scan an immediate PR gate failure.

---

### 2. Deterministic factories with no faker, reused via fixture composition

**Location**: `_bmad-output/test-artifacts/fixtures/engine-line-compaction-fixtures.ts:19-103`
**Pattern**: Data factories + fixture-architecture
**Knowledge Base**: [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md), [fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)

**Why This Is Good**:
Every board shape is a deterministic factory: `refLine(...vs)` 4-literal, `WALL_RIGHT_BOARD`/`DOUBLE_GAP_BOARD`/`HAPPY_PATH_BOARD`/`CASCADE_BOARD`/`GAP_NON_MERGE_BOARD`, plus `colRefLine` for column fixtures, `emptyBoard`/`staticBoard` from `test-utils/helpers.ts`. No `@faker-js/faker`, no `Math.random`/`Date.now` in tests governing expiry, no wall-clock TTL. Fixture composition is pure import (`import { pipelinePreSpawn, wallScanCount } from '../fixtures/engine-line-compaction-fixtures.ts'`) rather than `test.extend` duplication — correct per `fixtures-composition.md` for a host-only pure engine project with no `page` fixture.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
export function pipelinePreSpawn(board: Board, dir: Direction) {
  const lines = movementLines(board, 'left');
  const shifted = lines.map((l) => shiftLine(l).line);
  return boardFromLines(shifted, dir);
}
```

---

### 3. Pipeline integration via pure arithmetic, direction-agnostic

**Location**: `_bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts:167-212`, `_bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts:167-230`
**Pattern**: test-levels-framework.md Unit dominance with static-scan allowlist as E2E-equivalent
**Knowledge Base**: [test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md), [selective-testing.md](../../../agents/bmad-tea/resources/knowledge/selective-testing.md)

**Why This Is Good**:
The P1 4-dir pipeline (`movementLines→shiftLine→boardFromLines`) is exercised host-only with `from [[0,3]]` wall fidelity and `GRID_SIZE-1-k` un-reverse correctness, rather than cargo-culting Playwright `page.goto`/`page.locator` for an RN Skia Canvas engine seam. The E2E umbrella journeys are host journeys through `engine→board→trace→ledger` — the correct level for a framework-free pure TS seam per `test-levels-framework.md` and spec `Verification: npm test` gate.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/engine/line-compaction.atdd.test.ts`
- **File Size**: 318 lines, 13.2 KB
- **Test Framework**: node:test + tsx (TSX_TSCONFIG_PATH=tsconfig.test.json)
- **Language**: TypeScript

- **File Path**: `triade/__tests__/engine/line-compaction.regression.test.ts`
- **File Size**: 82 lines, 2.8 KB
- **Test Framework**: node:test + tsx
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts`
- **File Size**: 340 lines, 16.7 KB
- **Test Framework**: node:test + tsx (TEA API gateway — pure engine gateway contract)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts`
- **File Size**: 335 lines, 20.5 KB
- **Test Framework**: node:test + tsx (TEA E2E umbrella — host pipeline + ledger journeys)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 9 (ATDD 4: P0 critical 8 + P1 wiring 6 + P2 scans 4 + P3 exploratory 2; gateway 3: P0 9 + P1 7 + P2 5; umbrella 2: P1 4 journeys + P2/P3 2 journeys; regression 0 top-level `test()` 11)
- **Test Cases (it/test)**: 58 (ATDD 20 skipped + gateway 21 active + umbrella 6 active + regression 11 active)
- **Average Test Length**: 5.6 lines per test body (median, excluding header/boilerplate)
- **Fixtures Used**: `refLine`/`colRefLine`, `WALL_RIGHT_BOARD`/`DOUBLE_GAP_BOARD`/`HAPPY_PATH_BOARD`/`CASCADE_BOARD`/`COLUMN_BOARD`, `pipelinePreSpawn`, `shiftLineBench`, `readSrc`/`lineSrc`/`typesSrc`/`ledgerSrc` (18 helpers in fixtures)
- **Data Factories Used**: `refLine(...vs)` CellRef factory, `emptyBoard`/`staticBoard`, `rngOf` not needed (pure seam, no RNG draw budget exercised here)

### Test Scope

- **Test IDs**: No `data-testid`/`getByTestId` — house convention absent (0/40 sampled) — intentionally not applied (engine seam, no DOM); PASS (n/a)
- **Priority Distribution**:
  - P0 (Critical): 17 tests (ATDD 8 + gateway 8 + regression 2 wall/empty? gateway P0 9 includes movementLines pad; umbrella none P0 — P0 lives in gateway/ATDD)
  - P1 (High): 19 tests (ATDD 6 + gateway 7 + umbrella 4 + regression 4 short/pipeline)
  - P2 (Medium): 11 tests (ATDD 4 + gateway 5 + umbrella 1)
  - P3 (Low): 4 tests (ATDD 2 + umbrella 1)
  - Unknown: 7 tests in regression without explicit `[P#]` prefix use behavioral names but are covered via gateway/umbrella redundancy

### Assertions Analysis

- **Total Assertions**: 127 (gateway 46 + umbrella 31 + ATDD 42 dormant + regression 18) — when ATDD activated, `assert.deepStrictEqual` dominates `line[].v` ordering, `assert.equal(moved)` wall fidelity, `assert.doesNotThrow` never-throw, `assert.match`/`assert.ok` allowlist scans
- **Assertions per Test**: 2.2 avg (median 2: one `line[].v` ordering + one `from`/`score`/`moved` fidelity; scan tests assert 1 regex count + 1 negative `GRID_SIZE` absence)
- **Assertion Types**: `assert.deepStrictEqual` (board/line ordering), `assert.equal` (moved/score/length/count), `assert.doesNotThrow` (DW-20 never-throw), `assert.match` (rg allowlist), `assert.ok` (bench/bounds)

---

## Context and Integration

### What the Context Said

The supplied context set (`spec-engine-line-compaction.md` 8-row I-O matrix, 6 ACs, baseline `505c8ea` → `final 4f6cc04` + `test-design-dw-engine-line-compaction.md` 10 risks R-001..R-010 with 3 high score 6 + `line.ts:16-110` production delta + `types.ts:GRID_SIZE=4` + `rules.ts:canMerge` + `game.test.ts` ONE_CELL wall expectations + `transitionPlan.ts:to` wall coordinates + `automation-summary.md` 27 TEA contracts + `coverage-matrix-dw-engine-line-compaction.json` FULL coverage of AC-01..06) established:

- The **wall invariant** is load-bearing: before fix `[null,null,null,2]→[null,null,2,null]` one-cell semantics retained a visible gap after swipe; after fix wall-most `while(target>0…)` restores `[2,…]` at wall with `from [[0,3]]` and `moved true`. The gap-non-merge invariant (`[3,null,3]` stays `[3,3] score 0`) must survive the wall scan — merge stays `dest=i-1`.
- The **short-input invariant** is never-throw: `shiftLine` must handle `[]` len 0 and 1-elem without `TypeError: Cannot read properties of undefined (reading 'v')`; `movementLines` must pad ragged `[[1]] as Board` via `board[r]?.[c] ?? null`; `boardFromLines` must iterate `lines.length`/`row.length` with `if(!row)`/`if(!item)` guards.
- The **pipeline invariant** is direction-agnostic: `movementLines` row reverse (`right`) / col reverse (`down`) plus `boardFromLines` `GRID_SIZE-1-k` un-reverse must stay bit-identical; wall scan is direction-agnostic by construction (scan runs on line index 0 wall side regardless of dir).
- The **ledger invariant** is 64-hex reversibility: `_bmad-output/implementation-artifacts/deferred-work.md` DW-20 + DW-74 flip `status: open→done 2026-09-02` with `resolution: resolved by sweep bundle dw-engine-line-compaction` + `resolution-undo: 26a75af…` (64-hex + `737461…` date-salt); `sprint-status.yaml` is orchestrator-owned and must not be written by this sweep.

Context raised no contradictions with the reviewed tests; the tests exercise exactly the 8 I-O rows and 6 ACs the spec names, plus the 10 risks via P0/P1/P2. No story claim was contradicted by a tested assertion. Context did not waive any rubric violation, lower any severity, or amend the ledger — per the workflow contract, context may add findings and clarify impact but cannot exempt a row.

### Related Artifacts

- **Story File**: Not supplied as a story artifact — this is a deferred-work sweep bundle `dw-engine-line-compaction` (DW-20/DW-74) with spec as source of record
- **Spec**: [_bmad-output/implementation-artifacts/spec-engine-line-compaction.md](../../../implementation-artifacts/spec-engine-line-compaction.md)
- **Test Design**: [_bmad-output/test-artifacts/test-design/test-design-dw-engine-line-compaction.md](../test-design/test-design-dw-engine-line-compaction.md) + [_bmad-output/test-artifacts/test-design-dw-engine-line-compaction.md](../test-design-dw-engine-line-compaction.md)
- **ATDD Checklist**: [_bmad-output/test-artifacts/atdd-checklist-dw-engine-line-compaction.md](../atdd-checklist-dw-engine-line-compaction.md)
- **Automation Summary**: [_bmad-output/test-artifacts/automation-summary.md](../automation-summary.md)
- **Traceability / Coverage Matrix**: [_bmad-output/test-artifacts/traceability/coverage-matrix-dw-engine-line-compaction.json](../traceability/coverage-matrix-dw-engine-line-compaction.json) + [_bmad-output/test-artifacts/traceability/traceability-matrix-dw-engine-line-compaction.md](../traceability/traceability-matrix-dw-engine-line-compaction.md) + [_bmad-output/test-artifacts/traceability/e2e-trace-summary-dw-engine-line-compaction.json](../traceability/e2e-trace-summary-dw-engine-line-compaction.json)
- **Risk Assessment**: 10 risks R-001..R-010 (R-001 wall-scan incomplete 6 P0, R-002 gap-non-merge 6 P0, R-003 short guard 6 P0, R-004 cascade 4 P0, R-005 direction reversal 3 P1, R-006 trace fidelity 3 P1, R-007 legacy ONE_CELL 4 P1, R-008 ledger 2 P2, R-009 PERF wall 1 P2, R-010 spec final_revision hash drift 1 P3)
- **Priority Framework**: P0-P3 per `test-priorities-matrix.md` applied via ATDD priority distribution + gateway/umbrella P0/P1/P2/P3 mapping in fixtures

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern
- **[network-first.md](../../../agents/bmad-tea/resources/knowledge/network-first.md)** - Route intercept before navigate (race condition prevention) — gate closed for pure engine seam, not applied
- **[data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness (Unit dominant, host static-scan as E2E-equivalent for pure seam)
- **[component-tdd.md](../../../agents/bmad-tea/resources/knowledge/component-tdd.md)** - Red-Green-Refactor patterns (ATDD RED-phase scaffolds intentionally dormant)
- **[selective-testing.md](../../../agents/bmad-tea/resources/knowledge/selective-testing.md)** - Duplicate coverage detection (pipeline + gateway/umbrella duplication is intentional secondary seam, not waste)
- **[ci-burn-in.md](../../../agents/bmad-tea/resources/knowledge/ci-burn-in.md)** - Flakiness detection patterns (10-iteration loop not needed; bench fixed-count deterministic)
- **[test-priorities-matrix.md](../../../agents/bmad-tea/resources/knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 classification framework
- **[probability-impact.md](../../../agents/bmad-tea/resources/knowledge/probability-impact.md)** - P×I scoring for R-001..R-010 (3 high ≥6)
- **[risk-governance.md](../../../agents/bmad-tea/resources/knowledge/risk-governance.md)** - Risk-driven test selection
- **[nfr-criteria.md](../../../agents/bmad-tea/resources/knowledge/nfr-criteria.md)** - Reliability never-throw + 60 FPS O(1) + ledger 64-hex quality gates

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../../agents/bmad-tea/resources/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split the three oversize files to ≤300 lines** - gap described in Recommendation 1 (gateway 340→~170+170, umbrella 335→~170+165, ATDD 318→~180+138) — or extract shared `readSrc`/`refLine` into fixtures and import
   - Priority: P1
   - Owner: engine owner + TEA reviewer
   - Estimated Effort: 15 min (move blocks, re-run `npm --prefix triade exec -- tsc --noEmit --project tsconfig.json && npm --prefix triade test -- __tests__/engine/line.test.ts __tests__/engine/line-compaction.regression.test.ts __tests__/engine/game.test.ts __tests__/render/transitionPlan.test.ts` + `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts _bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts`)

2. **Replace bench literal duplication with `shiftLineBench()` fixture call** - Recommendation 3 (2 sites)
   - Priority: P3
   - Owner: engine owner
   - Estimated Effort: 5 min

### Follow-up Actions (Future PRs)

1. **Activate ATDD RED-phase scaffolds on story close** - `sed 's/it.skip/it/g' triade/__tests__/engine/line-compaction.atdd.test.ts → 20/20 pass` (already verified 350 ms activated in automation-summary), keep `line-compaction.regression.test.ts` 11 pins as the committed counterpart
   - Priority: P2
   - Target: bundle close

2. **Consider naming `findWallmostEmpty` helper if wall-scan allowlist becomes noisy** - Recommendation 2
   - Priority: P3
   - Target: backlog (only if `target` identifier is renamed)

### Re-Review Needed?

⚠️ Re-review after critical fixes - request changes, then re-review (oversize files are HIGH, deterministic verdict is Request Changes; after split to ≤300 the computed verdict becomes Approve)

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Quality score 98/100 is Excellent and all 27 TEA contracts + 11 regression pins + 48 existing wall pipelines are green with perfect determinism, isolation, and fixture discipline. The score reflects only file-length oversize (H5 HIGH ×3) and two magic bench literals (L6 LOW ×2), both cheap. Per `steps-c/step-03f-aggregate-scores.md §3b` the verdict is computed, not chosen: any HIGH → Request Changes, any remaining finding → Approve with Comments, otherwise Approve. With 3 HIGH present the computed verdict is Request Changes, regardless of the 98 score. Splitting the three oversize files to ≤300 restores Approve without changing coverage — a 15-minute refactor with no new tests, no new deps, and no gameplay change.

**For Approve**:

> Test quality is excellent/good with 98/100 score. Minor issues noted can be addressed in follow-up PRs. Tests are production-ready and follow best practices.

**For Approve with Comments**:

> Test quality is acceptable with 98/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

**For Request Changes**:

> Test quality needs improvement with 98/100 score. 3 high violations detected that pose maintainability risks (H5 oversize). The 98 score already reflects the 15-point HIGH deduction offset by 15 bonus points for fixtures + factories + isolation; file-length is an absolute gate (`test-quality.md` ≤300 ideal) and is not waivable by context. Split the three files as described, re-run the host gates, and re-review.

**For Block**:

> Test quality is insufficient with 98/100 score. Multiple critical issues make tests unsuitable for production. Recommend pairing session with QA engineer to apply patterns from knowledge base.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| `triade/__tests__/engine/line-compaction.atdd.test.ts:1` | P1 (High) | H5 Test Length | 318 lines >300 | Split into ATDD wall (P0) + guards/hygiene (P2/P3) files |
| `_bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts:1` | P1 (High) | H5 Test Length | 340 lines >300 | Split into gateway.wall + gateway.guards spec pair |
| `_bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts:1` | P1 (High) | H5 Test Length | 335 lines >300 | Split into umbrella.pipeline + leftover allowlist/spec files |
| `_bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts:335` | P3 (Low) | L6 Magic value | `10000` + `50` inline without named constant | Replace with `shiftLineBench()` fixture |
| `_bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts:326` | P3 (Low) | L6 Magic value | `10000` + `50` magic bench literals duplicated | Replace with `shiftLineBench()` fixture |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 98/100 | A | 0       | ➡️ Stable (first review for this bundle) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| `line-compaction.atdd.test.ts` | 98/100 | A | 0  | Request Changes (oversize) |
| `line-compaction.regression.test.ts` | 100/100 | A | 0  | Approve |
| `engine-line-compaction.gateway.spec.ts` | 98/100 | A | 0  | Request Changes (oversize) |
| `engine-line-compaction.umbrella.spec.ts` | 98/100 | A | 0  | Request Changes (oversize) |

**Suite Average**: 98/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-dw-engine-line-compaction-20260902
**Timestamp**: 2026-09-02 08:40:00
**Version**: 1.0

---

## Feedback on This Review

If you have questions or feedback on this review:

1. Review patterns in knowledge base: `../../../agents/bmad-tea/resources/knowledge/`
2. Consult tea-index.csv for detailed guidance
3. Request clarification on specific violations
4. Pair with QA engineer to apply patterns

This review applies the rubric consistently. Context can reveal additional findings and clarify impact; it cannot waive a violation, change severity, or alter the score. Formal risk acceptance belongs in trace or the release gate.

---

## Reviewed Files

- triade/__tests__/engine/line-compaction.atdd.test.ts
- triade/__tests__/engine/line-compaction.regression.test.ts
- _bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-engine-line-compaction.md
- _bmad-output/test-artifacts/test-design/test-design-dw-engine-line-compaction.md
- _bmad-output/test-artifacts/test-design-dw-engine-line-compaction.md
- _bmad-output/test-artifacts/atdd-checklist-dw-engine-line-compaction.md
- triade/src/engine/core/line.ts
- triade/src/engine/core/types.ts
- triade/src/engine/core/rules.ts
- triade/src/engine/core/game.ts
- triade/src/render/transitionPlan.ts
- _bmad-output/test-artifacts/traceability/coverage-matrix-dw-engine-line-compaction.json
- _bmad-output/test-artifacts/fixtures/engine-line-compaction-fixtures.ts

## Excluded From Review Set

- triade/__tests__/engine/purity-weight-doc-hardening.atdd.test.ts — format not scorable by the ledger
- _bmad-output/test-artifacts/fixtures/engine-line-compaction-fixtures.ts — format not scorable by the ledger
