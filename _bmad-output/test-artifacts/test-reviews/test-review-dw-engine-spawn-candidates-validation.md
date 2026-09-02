---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments: ['_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md', '_bmad-output/test-artifacts/test-design/test-design-dw-engine-spawn-candidates-validation.md', '_bmad-output/test-artifacts/atdd-checklist-dw-engine-spawn-candidates-validation.md', 'triade/src/engine/core/spawn.ts', 'triade/src/engine/core/game.ts', 'triade/test-utils/helpers.ts', 'triade/src/engine/core/types.ts', 'triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts', 'triade/__tests__/engine/spawn-candidates.unit.test.ts', 'triade/__tests__/engine/spawn-placement.test.ts', '_bmad-output/test-artifacts/tests/unit/engine-spawn-candidates-validation.atdd.test.ts', '_bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts', '_bmad-output/test-artifacts/tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts', '_bmad-output/test-artifacts/fixtures/engine-spawn-candidates-validation-fixtures.ts']
---

# Test Quality Review: dw-engine-spawn-candidates-validation

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

✅ Deterministic host-only `node:test + tsx` harness — zero hard waits, zero wall-clock fixtures, pure `spawnTile(Board,number,Rng,candidates?)→SpawnResult` through `boardWith`/`emptyBoard`/`gameState` frozen + `spyRng`/`rngOf` draw-budget + `mulberry32` seeded dedup uniformity — no `page.goto` needed per `test-levels-framework.md` Unit dominance
✅ Complete DW-72/DW-73 contract coverage: 8-row I/O matrix (OOB `[4,0]`/null/`[1]`/non-number/float/occupied/duplicate-dedup/mix/omitted/non-array) + 0/1 draw-budget + engine-never-throws `doesNotThrow` + `game.move` 4-dir opposite-edge + trace congruence — all 10 P0 critical + 4 P1 wiring pinned (R-001/002/003 score 6)
✅ Single-source discipline with exact `rg` allowlists: `candidates.filter(` 0 + `Set<string>` 1 + `seen.has` 1 + `seen.add` 1 + `!Array.isArray(entry)` 1 + `Number.isInteger` 2 + `!Array.isArray(candidates)` 1 + `board[r]?.[c]!==null` 1 + `GRID_SIZE` 5 + `Math.random` 2+2 defaults only — any throw-site reintroduction fails before any behavioral pin

### Key Weaknesses

❌ Two reviewed files exceed 300 lines (H5 HIGH): `spawn-candidates-validation.atdd.test.ts` 494, `engine-spawn-candidates-validation.gateway.spec.ts` 344 — file-length gate triggers Request Changes
❌ Bench/statistical magic literals (`4000`/`200`/`10000` draws, `500`/`800` ms thresholds, `5* sqrt`) appear without named budget constants in 2 files (L6 LOW) — fixture exports `sigmaBound`/`occupiedCells`/`resultingTiles` but not a bench helper yet
❌ ATDD dormant `it.skip` 20 + mirror `test.skip` 22 are intentional RED-phase scaffolds (header documents still-true reason), but add 494-line weight that pushes H5; `tsc` twin-gate `TS2322 [number,number][] not assignable` on `some(([r,c])=>)` in 8 sites (NFR CONCERNS informational, not a registry row)

### Summary

The `dw-engine-spawn-candidates-validation` bundle (DW-72 malformed/OOB/null/destructuring throw + DW-73 duplicate bias) is the single-source validation hardening of `triade/src/engine/core/spawn.ts:102-122` (`baseline 51e4677` → `ed54b4e` loop+`Set<string>` dedup, `game.ts:53-78` byte-identical) covering every malformed shape (`null`/`[1]`/`["a","b"]`/`[0.5,0]`/`[4,0]`/occupied/duplicate/outer non-array) + draw-budget 0 vs 1 + uniform AC3 `1/2 not 2/3` via `mulberry32` 4000-draw `5σ` + `game.move` opposite-edge 4-dir + `runSeededSession` cursor-drift + `rg` allowlists. Host verification is `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test` with `boardWith`/`spyRng`/`rngOf`/`mulberry32`/`oppositeEdgeCandidates` — no Playwright/Cypress harness per test-design `test_stack_type: frontend but pure TS engine → host Unit`. All 14 gateway contracts (P0 9 + P1 4 + ledger) + 9 umbrella journeys (P2 4 scans + 1 bench + P3 4 residual) + 20 ATDD/22 mirror RED scaffolds (activatable `it.skip→it` → 20 pass ~110 ms, `tsc` filtered `EXIT:0` for prod) + `spawn-candidates.unit 13` + `spawn-placement 11` + `game.test 32` + `engine.purity 4` remain green; NFR Performance/Reliability/Security/Offline PASS, Maintainability CONCERNS informational (ATDD `TS2322` strictness, fix `as const` ~2 min). The only ledger deductions are H5 oversize ×2 and L6 magic ×2; determinism, isolation, fixture, data-factory, assertions, network-first, and duration criteria are all PASS. Bonuses for comprehensive fixtures, data factories, and perfect isolation offset most HIGH deductions to 98/100, but the absolute H5 gate still drives the computed verdict to Request Changes (any HIGH → Request Changes) — split the 494-line ATDD (or extract the 344-line gateway P0 vs P1) to ≤300 and the suite returns to Approve with no coverage change.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS (n/a) | 0    | Convention: bddNaming (emerging: 7 of 40 sampled) | Repo uses `[P0]`/`[P1]` behavioral prefix (`Given a board/candidates when spawnTile then pool/filter/draw`) with comments, not Given/When/Then keywords; 17% adoption <50% emerging — no deduction |
| Test IDs                             | ✅ PASS (n/a) | 0    | Convention: testIds (absent: 0 of 40 sampled) | 0/40 sampled use `data-testid`/`getByTestId`; engine seam has no DOM — PASS (n/a) |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: priorityMarkers (established: 25 of 40 sampled, form `[P0]` in test name) | Every reviewed test carries `[P0]`/`[P1]`/`[P2]`/`[P3]` or `[P0-GW]`/`[P2-E2E]` matching `[P#]` form; 62.5% established — PASS |
| Disabled or Focused Tests            | ✅ PASS | 0    | Absolute | No `.only`/`fdescribe`/`fit`/`test.only`. `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts` 20 `it.skip` + `_bmad-output/test-artifacts/tests/unit/...atdd.test.ts` 22 `test.skip` each header documents `RED-phase scaffolds covering working-tree delta 51e4677→ed54b4e (loop+Set, game.ts 0, spec 8-row matrix, design R-001..R-003)` — still-true reason on lines above the skips per C1/C2 |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | Zero `waitForTimeout`/`sleep(`/`time.sleep`/`Thread.sleep`/`cy.wait(number)` across 4 reviewed files; only `performance.now()` bench in fixtures, not a wait |
| Determinism (no conditionals)        | ✅ PASS | 0    | Absolute | No `if`/ternary selecting expected values, no `try/catch` swallowing failures. `try/catch` absent; statistical loops are fixed-count `for i<N` deterministic with `mulberry32(seed)` seeded — not wall-clock fixture (H2 n/a). `if (!res.moved) continue` in P3 alias sweep is the 20-move driver for ineffective dirs filtered before assertion, not expected-value branching |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | No suite-level mutable write without `beforeEach`/`afterEach`. Every test builds fresh `boardWith([...])`/`emptyBoard()`/`gameState(b)` or clones `before=b.map(r=>r.slice())` and asserts `deepEqual(b,before)` + `res.board!==b`; no global mutation, no `afterEach` needed |
| Fixture Patterns                     | ✅ PASS | 0    | Applicability: file constructs domain payloads | Boards via `boardWith`/`emptyBoard`/`empty4x4`/`boardWithTwoEmpties`/`boardWithDedupCandidates` deterministic factories, `gameState` frozen-snapshot, `spyRng`/`rngOf`/`mulberry32`/`sigmaBound`/`oppositeEdgeCandidates`/`occupiedCells`/`resultingTiles` oracle helpers; fixture `engine-spawn-candidates-validation-fixtures.ts` 231 lines canonicalizes `SPARSE_BOARD`/`FULL_BOARD` + factories, no inline duplication beyond mirroring spec |
| Data Factories                       | ✅ PASS | 0    | Applicability: file constructs domain payloads | Factory-with-overrides pattern used throughout (`boardWith([...])` row literals, `emptyBoard`, `gameState(board,{value,displayRoll})`, `rngOf` variadic, `spyRng` recording, `mulberry32(seed)` seeded 4000-draw); no hardcoded inline bypassing existing factory; gateway correctly mirrors ATDD literals via shared helper, no `@faker-js/faker` (deterministic literals required for dedup uniformity) |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: file navigates and then reads data-dependent content | No `page.goto`/`cy.visit`/router push in pure engine seam — gate closed; `tea_use_playwright_utils:true` loaded but `browser_automation:auto` correctly stays host-only (Expo Skia/RN, no DOM/fetch race) |
| Explicit Assertions                  | ✅ PASS | 0    | Absolute | Every test contains ≥1 explicit assertion (`assert.deepStrictEqual`/`strictEqual`/`notStrictEqual`/`equal`/`ok`/`doesNotThrow`); 0 tests without assertions. Total 244 assertions (gateway 91 + umbrella 38 + ATDD 115 dormant, fixtures excluded) |
| Test Length (≤300 lines)             | ❌ FAIL | 2    | Absolute | `spawn-candidates-validation.atdd.test.ts` 494 lines, `engine-spawn-candidates-validation.gateway.spec.ts` 344 lines exceed 300; `engine-spawn-candidates-validation.umbrella.spec.ts` 105 and `engine-spawn-candidates-validation.atdd.test.ts` (unit mirror) 276 PASS. Threshold per `test-quality.md` ≤300 ideal; H5 HIGH |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | Each file <1.5 min host (`gateway 14 tests ~120 ms`, `umbrella 9 tests ~110 ms`, `ATDD 20 skip dormant ~0` / activated ~110 ms, fixtures not run; `npm --prefix triade test` full host 910 pass <5 s) |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute | Zero tight timeouts (`{timeout:1000}`), races, timing-dependent waits, retry logic, or env-dependent assumptions. Statistical gates are `sigmaBound 5σ` `tol=5*sqrt(p(1-p)/N)` generous (N=4000 `~0.04` window, N=200 `~0.18`) with deterministic `mulberry32` — not `Math.random` knife-edge; `performance.now()` bench `<800 ms` for 10k is generous fixed-count, not wall-clock fixture |

**Total Violations**: 0 Critical, 2 High, 0 Medium, 2 Low

**Convention Baseline**: 40 test files sampled outside the review set (capped at 40 closest-first by directory distance, per step-02 rules). `priorityMarkers: 25/40 established [P#]`, `testIds: 0/40 absent`, `bddNaming: 7/40 emerging`, `networkFirst: 0/40 absent`, `dataFactories: 14/40 emerging`, `fixtures: 0/40 absent`, `assertionStyle: 40/40 established (assert)`; `unknown` never applied (sampled ≥4).

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -2 × 5 = -10
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
**Location**: `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts:494`, `_bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts:344`
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
Two reviewed files exceed the `test-quality.md` ideal file-length gate of ≤300 lines by 44–194 lines. The ATDD (494) carries 20 RED-phase contracts (10 P0 critical 8-row matrix + 4 P1 wiring + 4 P2 scans + 2 P3 residual) plus a 27-line header and `readFileSync` preamble; the gateway (344) carries 14 contracts (9 P0 statistical dedup/mix/occupied/valid/outer-guard + 4 P1 4-dir/draw-budget/trace/ledger + 1 bench literal) plus header + `boardWith` literals. Oversize erodes reviewability and localize-failure cost — the threshold is Absolute and not waivable by context. The umbrella (105) and unit mirror (276) already demonstrate ≤300 is achievable; fixtures (231) likewise PASS.

**Current Code**:

```typescript
// atdd 494 lines, gateway 344 lines — both >300
// each contains file header + 3 describe blocks + literal-heavy statistical loops
```

**Recommended Improvement**:

```typescript
// Option A — split ATDD into P0 vs P1/P2/P3 (zero new coverage, only moved)
// triade/__tests__/engine/spawn-candidates-validation.p0.atdd.test.ts  (P0 10: OOB/null/[1]/non-number/duplicate/valid/mix/outer/occupied+float/omitted, ~260 lines)
// triade/__tests__/engine/spawn-candidates-validation.p1-p3.atdd.test.ts (P1 4 wiring + P2 4 scans + P3 2 sweep/bench, ~234 lines)
// Shared literals (boardWith matrices per spec row) stay as-is; header shortens

// Option B — split gateway into P0 vs P1 (already has describe split)
// _bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.p0-gateway.spec.ts  (P0 9 statistical/dedup/mix/outer/occupied+float/omitted, ~215 lines)
// _bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.p1-gateway.spec.ts   (P1 4 dir/draw-budget/trace/ledger + P3-02 bench 10k, ~129 lines)
// Helpers (boardWithTwoEmpties/boardWithDedupCandidates/occupiedAt00Board) already in engine-spawn-candidates-validation-fixtures.ts — import instead of re-declaring
```

**Benefits**:
Maintainability and failure localization; splits are zero-net new coverage (same 20 ATDD + 14 gateway + 9 umbrella contracts), only moved to respect the 300-line ideal; re-run host gates `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test` + `npx tsc --noEmit` after split.

**Priority**:
P1 High — any H5 is HIGH; the computed verdict is Request Changes while this persists. Cheap fix (≈15 min split + re-run `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts _bmad-output/test-artifacts/tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts` + `npm --prefix triade test`).

---

### 2. Magic bench/statistical literals — extract named budget constants (L6 LOW)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts:128`, `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts:155`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
Both the gateway and ATDD carry repeated `N=4000` (dedup uniform `5σ`), `N=200` (valid pool 200-draw), `loops=10_000` with `elapsed<800` ms (O(4) guard + O(16) clone `10k×` bench) and inline `5*Math.sqrt(0.25/N)` without a named budget constant or comment wiring the budget to the spec's `Performance — loop O(4) + Set O(4) per spawn` NFR. The fixture already re-exports `sigmaBound(expected,n,z=5)` + `occupiedCells`/`resultingTiles`, and the NFR audit pins `10k mixed-pool 3.87 ms <<500/800 ms` — the specs just duplicate the literal instead of naming it.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation)
const N = 4000; const rng = mulberry32(0xbeef);
const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
for (let i = 0; i < N; i++) { const b = boardWith([[null,2,3,4],[5,null,7,8],...]); const spy = spyRng(rng()); ... }
assert.ok(Math.abs(observed - expected) < tol);
// ...
for(let i=0;i<10_000;i++){ spawnTile(board,42,rngOf(0.5), [[4,0], null,[0,0],[0,0]]); }
assert.ok(elapsed < 800, `10k ${elapsed.toFixed(1)}ms <800ms`);
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended) — name the budget once, import sigmaBound from helpers/fixtures
import { sigmaBound } from '../../../triade/test-utils/helpers.ts';
const DEDUP_N = 4000; const VALID_N = 200; const BENCH_ITERS = 10_000; const BENCH_BUDGET_MS = 800; // O(4) guard + O(16) clone, per test-design NFR Performance
const tol = sigmaBound(expected, DEDUP_N); // 5σ generous window ~0.04 at N=4000
for (let i = 0; i < DEDUP_N; i++) { ... }
// bench
const start = performance.now(); for(let i=0;i<BENCH_ITERS;i++) spawnTile(board,42,rngOf(0.5), mixed as unknown);
assert.ok((performance.now()-start) < BENCH_BUDGET_MS, `bench ${BENCH_ITERS}× <${BENCH_BUDGET_MS} ms`);
```

**Benefits**:
Single source of bench/statistical budget; statistical gate self-documents as `sigmaBound` 5σ rather than inline `5*sqrt` that a future `p=1/4` (omitted 4 empties) could silently mismatch.

**Priority**:
P3 Low — no risk to verdict on its own; cleanup when splitting oversize files. Fixture already correct; specs just need to import/name it.

---

### 3. ATDD `TS2322` strictness — add `as const`/`as [number,number]` casts (L6 informational, not a ledger deduction)

**Severity**: P3 (Low)
**Location**: `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts:116,120,133,136,141,148,280,294`
**Row**: none — registry has no row for strict-only type mismatch on test-only `some(([r,c])=>)` destructuring; reported as Best-Practice prose per criteria-registry rule 1
**Criterion**: Magic value / Best Practices (no deduction)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
Full `npx tsc --noEmit` shows 8 errors only in the dormant ATDD file `TS2322 Type '[number,number][]' is not assignable to type '[number,number]'` on `some(([r,c])=>)` / `candidates.some` strict destructure — prod `spawn.ts` itself is `filtered tsc clean` (`grep -v spawn-candidates-validation` `EXIT:0`). Runtime `node --import tsx` is green (`doesNotThrow` + `spy.calls` + `5σ` all pass), so this is a strict-mode-only test-file cast debt, not a prod gate, and per NFR it is `Maintainability CONCERNS informational`. Fix is `as const`/`as [number,number]` on the literal arrays, ~2 min.

**Current Code**:

```typescript
// test file line flagged by tsc strict destructure
assert.ok(candidates.some(([r, c]) => r === res.cell![0] && c === res.cell![1]));
```

**Recommended Improvement**:

```typescript
// ✅ Better approach
assert.ok((candidates as Array<[number, number]>).some(([r, c]) => r === res.cell![0] && c === res.cell![1]));
// or declare candidates as const: const candidates = [[0,3],[1,3]] as const
```

**Benefits**:
Twin `tsc` gates (`tsconfig.json` + `tsconfig.test.json`) clean without `grep -v` filter; carries the `quick wins #3` already in NFR assessment.

---

## Best Practices Found

### 1. `doesNotThrow` + draw-budget `spy.calls` + `deepEqual(before)` + `notStrictEqual(board)` quadruple pins every malformed branch

**Location**: `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts:56-58`, `_bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts:22-31`
**Pattern**: Determinism + isolation + explicit assertions
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md), [test-healing-patterns.md](../../../agents/bmad-tea/resources/knowledge/test-healing-patterns.md)

**Why This Is Good**:
Every P0 malformed test (`[4,0]` OOB / `null` / `[1]` / `["a","b"]` / `[0.5,0]` / occupied / outer `null`) does the full four: `assert.doesNotThrow(()=>spawnTile(empty,42,spy,malformed))` (engine-never-throws) + `spy.calls 0 vs 1` (draw-budget contract) + `deepEqual(b,before)` input not mutated + `notStrictEqual(res.board,b)` clone hygiene — plus `res.board[cell]===value` placed-value pin. The `map(r=>r.slice())` mirror is exactly the depth prod `cloneBoard(board){ board.map(r=>[...r]) }` guarantees for `Cell=number|null` primitives — any future widening of `Cell` to object would be caught by `deepEqual` remaining while shallow `res.board[0]` identity still passes. The outer non-array guard `!Array.isArray(candidates)` early-return is the only place `candidates.filter is not a function` throw is eliminated.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
const empty = boardWith([[null,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]);
const before = empty.map((r) => r.slice());
assert.doesNotThrow(() => spawnTile(empty, 42, spyRng(0.5), [[4, 0]] as unknown as Array<[number, number]>));
const spy = spyRng(0.5); const res = spawnTile(empty, 42, spy, [[4, 0]] as unknown as Array<[number, number]>);
assert.equal(spy.calls.length, 0); // OOB only → 0 draws
assert.equal(res.cell, null); assert.equal(res.value, null);
assert.deepEqual(empty, before); assert.notEqual(res.board, empty);
```

**Use as Reference**:
Keep the `doesNotThrow` + `spy.calls` + `deepEqual(before)` + `notStrictEqual(board)` quadruple for every future `spawnTile` branch edit; a missing outer `!Array.isArray(candidates)` guard or a `pickIndex` on empty pool would fail exactly one of the four.

---

### 2. Dedup uniform `1/2 not 2/3` via deterministic `mulberry32` 4000-draw `5σ` + `rngOf(0)→[0,0] rngOf(0.6)→[1,1]` double pin

**Location**: `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts:155-188`, `_bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts:66-108`
**Pattern**: Determinism + statistical tolerance (`sigmaBound`)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md), [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Why This Is Good**:
Duplicate bias is statistical: without `Set<string>` dedup `[[0,0],[0,0],[1,1]]` would make `pool.length 3` with two refs to `[0,0]` → `P=2/3 not 1/2`, breaking AC3 `1/pool.length`. The tests pin it doubly: deterministically `rngOf(0)→[0,0] && rngOf(0.6)→[1,1]` curves the `pickIndex(2)` ordering, and statistically `N=4000 mulberry32(0xbeef)` 4000-draw `counts 50%±5σ` each (`tol=5*sqrt(0.25/4000)≈0.039`, helper `sigmaBound(0.5,4000)`) showing `0.49/0.51 within window not 0.66`, plus `spy 1 draw` each and `deepEqual(before)` + `res.board!==b` isolation. `sigmaBound` auto-adjusts to sample size so the gate is neither dead nor knife-edge on future `N` rotation — shared canonical in `test-utils/helpers.ts`.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
const candidates = [[0, 0], [0, 0], [1, 1]] as unknown as Array<[number, number]>;
assert.deepStrictEqual(spawnTile(bA, 42, rngOf(0), candidates).cell, [0, 0]);
assert.deepStrictEqual(spawnTile(bB, 42, rngOf(0.6), candidates).cell, [1, 1]);
const N = 4000; const rng = mulberry32(0xbeef); const counts = new Map<string, number>();
for (let i = 0; i < N; i++) { const b = boardWith([[null,null,3,4],[5,null,7,8],...]); const spy = spyRng(rng()); const res = spawnTile(b, 42, spy, candidates); assert.equal(spy.calls.length, 1); /* + isolation + cell in pool */ }
const tol = 5 * Math.sqrt(0.25 / N); // sigmaBound(0.5,N)
for (const cell of [[0,0],[1,1]] as const) { const observed = (counts.get(`${cell[0]},${cell[1]}`)??0)/N; assert.ok(Math.abs(observed-0.5)<tol); }
```

**Use as Reference**:
Keep both the deterministic 0/0.6 curve (fast, localizes ordering) and the 4000-draw `5σ` statistical loop (guards bias) together; the curve alone could pass with `2/3` bias by chance on one seed, the loop alone is slow to diagnose which cell was over-picked.

---

### 3. Single-site validation allowlist makes the only-correct wiring an immediate PR gate failure

**Location**: `_bmad-output/test-artifacts/tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts:19-44`, `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts:437-473`
**Pattern**: test-levels-framework.md Unit dominance with static-scan allowlist as E2E-equivalent
**Knowledge Base**: [test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md), [selective-testing.md](../../../agents/bmad-tea/resources/knowledge/selective-testing.md)

**Why This Is Good**:
P2 scans pin the validation's only-correct sites with exact counts: `candidates.filter(` 0 (old destructuring throw site gone) + `Set<string>` 1 + `seen.has(key)` 1 + `seen.add(key)` 1 + `if (!Array.isArray(entry)` 1 + `Number.isInteger` 2 (r and c) + `if (!Array.isArray(candidates)` 1 + `board[r]?.[c] !== null` 1 (candidate loop optional chaining) vs `board[r][c] === null` 1 (all-empty safe direct) + `GRID_SIZE` 5 + `Math.random` 2+2 defaults only + `resolution-undo 365ffe33` ledger + `sprint-status.yaml` untouched + `runSeededSession` cursor-drift alias sweep. Any revert (`spawnTile` reintroducing `filter(([r,c])=>)` or dropping `Set<string>` or reordering bounds after `board[r][c]`) is a one-line diff away from failing the allowlist before any 4000-draw pin runs. The bench `10k mixed-pool <800 ms O(4)` is the perf hygiene gate for the same loop.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
assert.equal((spawnSrc.match(/candidates\.filter\(/g) ?? []).length, 0, 'no candidates.filter survivor (old throw site)');
assert.equal((spawnSrc.match(/Set<string>/g) ?? []).length, 1);
assert.equal((spawnSrc.match(/seen\.has\(key\)/g) ?? []).length, 1);
assert.equal((spawnSrc.match(/seen\.add\(key\)/g) ?? []).length, 1);
assert.equal((spawnSrc.match(/if \(!Array\.isArray\(entry\)/g) ?? []).length, 1);
assert.equal((spawnSrc.match(/Number\.isInteger/g) ?? []).length, 2);
assert.equal((spawnSrc.match(/if \(!Array\.isArray\(candidates\)/g) ?? []).length, 1);
assert.equal((spawnSrc.match(/board\[r\]\?\.\[c\] !== null/g) ?? []).length, 1);
```

**Use as Reference**:
Any future candidate-guard sweep (e.g., `line.ts` wall-scan `while(target>0…)` ×1) should copy this `rg -n "exact literal" == N` pattern; failure then localizes to one helper string, not to a flaky board comparison.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts`
- **File Size**: 494 lines, 27.4 KB
- **Test Framework**: node:test + tsx (TSX_TSCONFIG_PATH=triade/tsconfig.test.json)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/unit/engine-spawn-candidates-validation.atdd.test.ts`
- **File Size**: 276 lines, 18.1 KB
- **Test Framework**: node:test + tsx (mirror of triade ATDD, RED-phase `test.skip` 22 — not scored separately; same corpus)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts`
- **File Size**: 344 lines, 17.8 KB
- **Test Framework**: node:test + tsx (TEA API gateway — pure engine pool validation + dedup + draw-budget + 4-dir pipeline)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts`
- **File Size**: 105 lines, 6.8 KB
- **Test Framework**: node:test + tsx (TEA E2E umbrella — host static scans + `runSeededSession` drift sweep + bench)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/fixtures/engine-spawn-candidates-validation-fixtures.ts`
- **File Size**: 231 lines, 9.2 KB
- **Test Framework**: fixture helpers (not a test suite; not scored by the ledger)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 9 (ATDD 3: P0 10 + P1 4 + P2 4/P3 2; mirror 2; gateway 4: P0 9 + P1 4 + ledger; umbrella 1 wrapping P2 5 + P3 4)
- **Test Cases (it/test)**: 49 (ATDD 20 skipped + mirror 22 skipped dormant + gateway 14 active + umbrella 9 active; active + dormant 49)
- **Average Test Length**: 11.4 lines per active test body (median, excluding header/boilerplate/helpers; statistical loops ~12 lines, scan asserts ~6)
- **Fixtures Used**: `boardWith`/`emptyBoard`/`empty4x4`/`boardWithSingleEmptyAt00`/`boardWithTwoEmpties`/`boardWithDedupCandidates`/`occupiedAt00Board`/`fullBoard`/`boardWithFourEmpties` Board factories, `gameState` frozen-snapshot, `rngOf`/`spyRng`/`mulberry32`/`sigmaBound` draw-budget + statistical helpers, `oppositeEdgeCandidates`/`occupiedCells`/`resultingTiles`/`stripCommentsAndStrings` oracle helpers, `readFileSync` source-scan `spawnSrc`/`gameSrc`/`typesSrc`/`deferredSrc` (10 helpers in fixtures)
- **Data Factories Used**: `boardWith([...])` Cell literal factory (4×4 row-major, `null` = empty), `emptyBoard` 4×4 null factory, `gameState(board,{value,displayRoll})` snapshot factory, `rngOf(...values)` variadic fixed RNG, `spyRng(...values)` recording RNG, `mulberry32(seed)` seeded 4000-draw uniformity; no `@faker-js/faker`, no `Math.random`/`Date.now` in tests governing expiry

### Test Scope

- **Test IDs**: No `data-testid`/`getByTestId` — house convention absent (0/40 sampled) — intentionally not applied (pure engine seam, no DOM); PASS (n/a)
- **Priority Distribution**:
  - P0 (Critical): 28 tests (ATDD 10 + mirror 10 mirrored + gateway 9, umbrella 0; umbrella P2 scans are P1/P2)
  - P1 (High): 10 tests (ATDD 4 + gateway 5 + umbrella 1 ledger)
  - P2 (Medium): 7 tests (ATDD 4 + umbrella 4 static scans, gateway P1 overlap)
  - P3 (Low): 4 tests (ATDD 2 sweep/bench + umbrella 4 residual/bench/hydration, overlap 2)
  - Unknown: 0 (every reviewed test carries explicit `[P#]`/`[P0-GW]`/`[P2-E2E]` priority prefix)
- **Traceability**: 20 acceptance-criteria contracts (P0 10 AC1-10 + P1 4 AC11-12 wiring + P2 4 scans + P3 2 exploratory/bench) via `coverage-matrix-dw-engine-spawn-candidates-validation.json` COLLECTED 20/20 allow_gate true + `atdd-checklist 11 ACs` (row-mapped) FULL; umbrella `rg` full ledger sweep maps one-to-one onto those contracts + bench

### Assertions Analysis

- **Total Assertions**: 244 (gateway 91 + umbrella 38 + ATDD 115 dormant — when ATDD activated, `assert.deepStrictEqual` dominates `board deepEqual before` + `cell` identity, `assert.notStrictEqual` dominates `board !== input`, `assert.strictEqual` dominates draw-budget `spy.calls 0/1/3` + `res.value` place-not-roll + `Object.isFrozen` not needed here, `assert.equal` dominates `moved` boolean, `assert.ok` dominates dedup uniform `5σ` + candidate membership + `doesNotThrow`)
- **Assertions per Test**: 5.6 avg overall (median 5: one `doesNotThrow`/`deepEqual(before)`, one `notStrictEqual(board)`, one `board[cell]===value`, one `spy.calls 0/1`, one `ok(cell in pool)`; statistical tests add `5σ` tol gate; scan tests add 6 `rg` counts)
- **Assertion Types**: `assert.deepStrictEqual` (board equality / `pendingSpawn` equality / `resultingTiles` congruence), `assert.notStrictEqual` (board identity / input isolation), `assert.strictEqual` (cell/value/draw budget/GRID_SIZE/len), `assert.equal` (moved/boolean/ledger), `assert.ok` (cell non-null / candidate membership / `5σ` window / bench threshold / `draws`), `assert.doesNotThrow` (engine-never-throws on malformed)

---

## Context and Integration

### What the Context Said

The supplied context set (`spec-engine-spawn-candidates-validation.md` 8-row I/O matrix, 8+4 ACs, baseline `51e4677` → final `ed54b4e` + `test-design-dw-engine-spawn-candidates-validation.md` 10 risks R-001..R-010 with 3 high score 6 (R-001 destructuring throw on `null`/non-array, R-002 duplicate bias 2/3 vs 1/2 AC3, R-003 0 vs 1 draw-budget cursor drift) + `spawn.ts:83-127` production delta loop+`Set<string>` (preserves `cloneBoard` at top `triade/src/engine/core/spawn.ts:89`, `pool.length===0→0 draws` `triade/src/engine/core/spawn.ts:123`, `pickIndex(pool.length,rng) 1 draw` `triade/src/engine/core/spawn.ts:124`, `candidates===undefined` all-empty unchanged) + `game.ts:53-78` byte-identical opposite-edge `oppCol/oppRow + shifted[i].moved` distinct push + `types.ts:GRID_SIZE=4` single definition + `spawn-candidates.unit.test.ts` 12 pins + `spawn-placement.test.ts:282` 11 ACs + `helpers.ts:mulberry32/spyRng/rngOf/boardWith/emptyBoard/oppositeEdgeCandidates` + `coverage-matrix-dw-engine-spawn-candidates-validation.json` FULL 20/20 COLLECTED allow_gate true + `nfr-assessment-dw-engine-spawn-candidates-validation.md` 4 PASS 1 CONCERNS) established:

- The **destructuring-throw invariant** is guard-before-destructure: before fix `candidates.filter(([r,c])=> r>=0&&r<GRID_SIZE&&c>=0&&c<GRID_SIZE&&board[r][c]===null)` binds `[r,c]` at param entry before predicate body, so `candidates=[null]` throws `TypeError: null is not iterable` at the parameter binding. After fix `for (entry as unknown) → !Array.isArray(entry)||entry.length<2 continue` eliminates the destructuring, then `typeof r/c !== number` / `!isInteger` / bounds / `board[r]?.[c]!==null` (optional chaining `?.` is second guard, `r=4` never `TypeError` on `board[4] undefined`) silently filter, and `board[r]?.[c]!==null` 1 vs `board[r][c]===null` 1 (all-empty branch safe direct) keeps `r=4` defensive. `rg candidates.filter 0` + `!Array.isArray(entry) 1` pin this.
- The **dedup uniform AC3 invariant** is `Set<string>` after validation: `candidates [[0,0],[0,0],[1,1]]` without dedup → `pool.length 3` with two refs to `[0,0]` → `P=2/3 not 1/2`, breaking spec `Never: change pickIndex distribution`. After fix `seen=new Set<string>` + `key=${r},${c}` + `seen.has(key) continue` + `seen.add(key)` + `pool.push([r,c])` after all 6 `continue`s makes `pool.length 2` uniform `1/2` (`rngOf(0)→[0,0] && 0.6→[1,1]` curve + `N=4000 50%±5σ` statistical gate showing `0.49/0.51 not 0.66`). `rg Set<string> 1` + `seen.has 1` + `seen.add 1` single site.
- The **draw-budget invariant** is `spy.calls` 0 vs 1: filtered pool empty (`[[4,0]]` OOB-only / occupied-only / float-only) → `pool.length===0→{cell:null,value:null} 0 draws` (`rg pool.length===0 1` + `pickIndex(pool.length` 1 single `rng()` site, loop never calls `rng()`), non-empty pool → `pickIndex(pool.length,rng) 1 draw`, `move()` effective `3 draws` (`pickIndex 1 + resolveSpawn 1 + displayRoll 1`) vs `noop 0 draws` (true gameOver `3/6` alternating). Drift would skew seeded `mulberry32` cursor (50-move `runSeededSession` `promised===materialized` alias sweep proves no drift).
- The **omitted unchanged branch** is `candidates===undefined` → all-empty `for r<GRID_SIZE for c<GRID_SIZE if board[r][c]===null empty.push` then `empty.length===0 0 draws else pickIndex 1 draw` — validation branch must not add fallback to all-empty when provided-but-empty (`spec Never: add fallback to all-empty when candidates provided-but-empty`); provided `[]`/all-occupied OOB → `nulls 0 draws` not `1`.
- The **ledger invariant** is 64-hex reversibility: `_bmad-output/implementation-artifacts/deferred-work.md` DW-72/73 flip `status: open→done 2026-09-02` with `resolution: resolved by sweep bundle dw-engine-spawn-candidates-validation` + `resolution-undo: 365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2 2026-09-02 7374617475733a206f70656e` (hex of `status: open` tail + date salt); `sprint-status.yaml` is orchestrator-owned and must not be written (verified `!includes('dw-engine-spawn-candidates-validation')` + `git diff --stat HEAD` no `sprint-status.yaml`).
- The **NFR posture** is already green: Performance `10k mixed-pool 3.87 ms avg 0.000387 ms <<2 ms/turn`, `910/0` host `<5 s <<15 min`, `rg GRID_SIZE=4 1 definition` + `rg Math.random 2+2` defaults only; Reliability never-throw pinned by `doesNotThrow` on all 9 P0 malformed shapes + `move` 4-dir opposite-edge; Maintainability CONCERNS informational only (ATDD `TS2322` 8 sites, fix `as const` ~2 min; ledger hash drift `final_revision: ed54b4e vs HEAD 50126fa` doc-only).

Context raised no contradictions with the reviewed tests; the tests exercise exactly the 8 I-O rows + 10 ACs + 4 P1 wirings + 4 P2 allowlists + 2 P3 residual/bench the spec/design names, plus the 10 risks via P0/P1/P2 and the P3 `20-move runSeededSession` drift sweep + `O(4) <800 ms` perf gate. No story claim was contradicted by a tested assertion. Context did not waive any rubric violation, lower any severity, or amend the ledger — per the workflow contract, context may add findings and clarify impact but cannot exempt a row.

### Related Artifacts

- **Story File**: Not supplied as a story artifact — this is a deferred-work sweep bundle `dw-engine-spawn-candidates-validation` (DW-72 `candidates` malformed/OOB/null destructuring throw + DW-73 duplicate bias) with spec as source of record
- **Spec**: [_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md](../../../implementation-artifacts/spec-engine-spawn-candidates-validation.md)
- **Test Design**: [_bmad-output/test-artifacts/test-design/test-design-dw-engine-spawn-candidates-validation.md](../test-design/test-design-dw-engine-spawn-candidates-validation.md)
- **ATDD Checklist**: [_bmad-output/test-artifacts/atdd-checklist-dw-engine-spawn-candidates-validation.md](../atdd-checklist-dw-engine-spawn-candidates-validation.md)
- **Automation Summary**: [_bmad-output/test-artifacts/automation-summary-dw-engine-spawn-candidates-validation.md](../automation-summary-dw-engine-spawn-candidates-validation.md)
- **Traceability / Coverage Matrix**: [_bmad-output/test-artifacts/traceability/coverage-matrix-dw-engine-spawn-candidates-validation.json](../traceability/coverage-matrix-dw-engine-spawn-candidates-validation.json) + [_bmad-output/test-artifacts/traceability/e2e-trace-summary-dw-engine-spawn-candidates-validation.json](../traceability/e2e-trace-summary-dw-engine-spawn-candidates-validation.json) + [_bmad-output/test-artifacts/traceability/gate-decision-dw-engine-spawn-candidates-validation.json](../traceability/gate-decision-dw-engine-spawn-candidates-validation.json) + [_bmad-output/test-artifacts/traceability/traceability-matrix-dw-engine-spawn-candidates-validation.md](../traceability/traceability-matrix-dw-engine-spawn-candidates-validation.md)
- **NFR Assessment**: [_bmad-output/test-artifacts/nfr-assessment-dw-engine-spawn-candidates-validation.md](../nfr-assessment-dw-engine-spawn-candidates-validation.md)
- **Risk Assessment**: 10 risks R-001..R-010 (R-001 destructuring throw 6 P0, R-002 dedup bias 6 P0, R-003 draw-budget cursor drift 6 P0, R-004 OOB optional chaining 4 P1, R-005 float slip 4 P1, R-006 occupied read-order 3 P1, R-007 over-filter 3 P1, R-008 no-fallback 3 P1, R-009 non-array outer 1 P2, R-010 ledger 1 P2)
- **Priority Framework**: P0-P3 per `test-priorities-matrix.md` applied via ATDD priority distribution + gateway/umbrella P0/P1/P2/P3 mapping + fixtures probes
- **Existing Hardened Suites (context)**: `triade/__tests__/engine/spawn-candidates.unit.test.ts` 304 lines 13 tests + `triade/__tests__/engine/spawn-placement.test.ts` 283 lines 11 tests — counted as context, not as authored review set (existing hardened, stay green)

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern (boardWith/emptyBoard factories, helpers single oracle)
- **[network-first.md](../../../agents/bmad-tea/resources/knowledge/network-first.md)** - Route intercept before navigate (race prevention) — gate closed for pure engine seam, not applied
- **[data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness (Unit dominant, host static-scan as E2E-equivalent for pure seam)
- **[component-tdd.md](../../../agents/bmad-tea/resources/knowledge/component-tdd.md)** - Red-Green-Refactor patterns (ATDD RED-phase `it.skip` intentionally dormant, header documents reason)
- **[selective-testing.md](../../../agents/bmad-tea/resources/knowledge/selective-testing.md)** - Duplicate coverage detection (gateway mirror is intentional secondary seam covering same contract, not waste)
- **[ci-burn-in.md](../../../agents/bmad-tea/resources/knowledge/ci-burn-in.md)** - Flakiness detection patterns (5σ sigmaBound, not retry logic; bench `<800 ms` fixed-count deterministic)
- **[test-priorities-matrix.md](../../../agents/bmad-tea/resources/knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 classification framework (ATDD 10 P0 + 4 P1 + 4 P2 + 2 P3; gateway P0 9 + P1 5)
- **[probability-impact.md](../../../agents/bmad-tea/resources/knowledge/probability-impact.md)** - P×I scoring for R-001..R-010 (3 high ≥6)
- **[risk-governance.md](../../../agents/bmad-tea/resources/knowledge/risk-governance.md)** - Risk-driven test selection (R-001 destructuring throw → P0 doesNotThrow, R-002 dedup bias → 4000-draw 5σ, R-003 draw-budget → spy.calls 0/1)
- **[nfr-criteria.md](../../../agents/bmad-tea/resources/knowledge/nfr-criteria.md)** - Reliability never-throw + Performance O(4) + ledger 64-hex + `GRID_SIZE=4` quality gates
- **[test-healing-patterns.md](../../../agents/bmad-tea/resources/knowledge/test-healing-patterns.md)** - Conditional assertion / unreset shared state anti-patterns (none fired)

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../../agents/bmad-tea/resources/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split the two oversize files to ≤300 lines** - gap described in Recommendation 1 (ATDD 494→~260+234, gateway 344→~215+129) — or extract shared `boardWith` matrices into fixtures and import
   - Priority: P1
   - Owner: engine owner + TEA reviewer
   - Estimated Effort: 15 min (move blocks, re-run `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts _bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts` + `npx tsc --noEmit -p triade/tsconfig.json && npx tsc --noEmit -p triade/tsconfig.test.json` + `npm --prefix triade test -- __tests__/engine/spawn-candidates.unit.test.ts __tests__/engine/spawn-placement.test.ts`)

2. **Name the bench/statistical budget constants and import `sigmaBound`** - Recommendation 2 (2 sites)
   - Priority: P3
   - Owner: engine owner
   - Estimated Effort: 5 min (replace inline `N=4000` literal + `5*Math.sqrt` with `DEDUP_N` + `sigmaBound(expected,DEDUP_N)` import from `triade/test-utils/helpers.ts`, and `BENCH_ITERS` + `BENCH_BUDGET_MS`)

### Follow-up Actions (Future PRs)

1. **Polish ATDD `TS2322` casts on close** - `some(([r,c])=>)` strict destructure via `as const`/`as [number,number]` (Recommendation 3; NFR quick-win #3)
   - Priority: P3
   - Target: bundle close (keep original `spawn-candidates.unit.test.ts` 13 pins as the committed counterpart while ATDD 20 activate `s/it.skip/it/` → 20/20 pass)

2. **Consider extracting `DEDUP_N`/`VALID_N`/`BENCH_ITERS` into fixture helpers** - if dedup uniform gates recur in another engine sweep
   - Priority: P3
   - Target: backlog (only if another validation sweep reuses 4000-draw `5σ`)

### Re-Review Needed?

⚠️ Re-review after critical fixes - request changes, then re-review (oversize files are HIGH, deterministic verdict is Request Changes; after split to ≤300 + naming the two magic literals the computed verdict becomes Approve; the 98 score already reflects the deduction, not a fail on behavior)

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Quality score 98/100 is Excellent and all 14 gateway contracts + 9 umbrella journeys + 20 dormant ATDD (activatable 20/20) + `spawn-candidates.unit` 13 + `spawn-placement` 11 + `game.test` 32 + `engine.purity` 4 + NFR Performance/Reliability/Security/Offline/Scalability PASS + `tsc` filtered clean + `910/0` host + `runSeededSession` cursor-drift sweep are green with perfect determinism, isolation, and fixture discipline. The score reflects only file-length oversize (H5 HIGH ×2) and two magic bench/statistical literals (L6 LOW ×2), both cheap. Per `steps-c/step-03f-aggregate-scores.md §3b` the verdict is computed, not chosen: any HIGH → Request Changes, any remaining finding → Approve with Comments, otherwise Approve. With 2 HIGH present the computed verdict is Request Changes, regardless of the 98 score. Splitting the two oversize files to ≤300 and naming the `4000`/`800 ms` budget constants restores Approve without changing coverage — a 15-minute refactor with no new tests, no new deps, and no gameplay change.

**For Approve**:

> Test quality is excellent with 98/100 score. Minor issues noted can be addressed in follow-up PRs. Tests are production-ready and follow best practices.

**For Approve with Comments**:

> Test quality is acceptable with 98/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

**For Request Changes**:

> Test quality needs improvement with 98/100 score. 2 high violations detected that pose maintainability risks (H5 oversize: `spawn-candidates-validation.atdd.test.ts` 494 >300 and `engine-spawn-candidates-validation.gateway.spec.ts` 344 >300). The 98 score already reflects the 10-point HIGH deduction offset by 15 bonus points for fixtures + factories + isolation; file-length is an absolute gate (`test-quality.md` ≤300 ideal) and is not waivable by context. Split the two files as described, name the two magic budget literals via `sigmaBound`/`BENCH_BUDGET_MS`, polish the 8 `TS2322` casts (informational), re-run the host + `tsc` gates, and re-review.

**For Block**:

> Test quality is insufficient with 98/100 score. Multiple critical issues make tests unsuitable for production. Recommend pairing session with QA engineer to apply patterns from knowledge base.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts:1` | P1 (High) | H5 Test Length | 494 lines >300 | Split into ATDD p0 (P0 10) + p1-p3 (P1 4 + P2 4 + P3 2) files, ≤300 each |
| `_bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts:1` | P1 (High) | H5 Test Length | 344 lines >300 | Split into gateway.p0 (P0 9) + gateway.p1 (P1 5 + ledger) spec pair |
| `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts:116` | P3 (Low) | L6 Magic value | `some(([r,c])=>)` + inline `4000`/`200`/`5*Math.sqrt`/`105` without named constant | Extract `DEDUP_N=4000`/`VALID_N=200`/`BENCH_BUDGET_MS` and use `sigmaBound(expected,N)` helper |
| `_bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts:128` | P3 (Low) | L6 Magic value | `N=4000` + `5*Math.sqrt(0.25/N)` + `10_000` bench literal duplicated (ATDD also) | Replace with `DEDUP_N` + `sigmaBound(0.5,DEDUP_N)` and `BENCH_ITERS` + `BENCH_BUDGET_MS` import from fixture |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 98/100 | A | 0       | ➡️ Stable (first review for this bundle; predecessor `dw-engine-spawn-mutation-hygiene` 98/100 A) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| `spawn-candidates-validation.atdd.test.ts` | 98/100 | A | 0  | Request Changes (oversize) |
| `engine-spawn-candidates-validation.gateway.spec.ts` | 98/100 | A | 0  | Request Changes (oversize) |
| `engine-spawn-candidates-validation.umbrella.spec.ts` | 100/100 | A | 0  | Approve (105 lines) |
| `engine-spawn-candidates-validation-fixtures.ts` | 100/100 | A | 0  | Approve (231 lines, not scored) |
| `spawn-candidates-validation.atdd.test.ts` (unit mirror) | 100/100 | A | 0  | Approve (276 lines) |

**Suite Average**: 98/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-dw-engine-spawn-candidates-validation-20260902
**Timestamp**: 2026-09-02 14:30:00
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

- triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts
- _bmad-output/test-artifacts/tests/unit/engine-spawn-candidates-validation.atdd.test.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md
- _bmad-output/test-artifacts/test-design/test-design-dw-engine-spawn-candidates-validation.md
- _bmad-output/test-artifacts/atdd-checklist-dw-engine-spawn-candidates-validation.md
- triade/src/engine/core/spawn.ts
- triade/src/engine/core/game.ts
- triade/test-utils/helpers.ts
- triade/src/engine/core/types.ts
- triade/__tests__/engine/spawn-candidates.unit.test.ts
- triade/__tests__/engine/spawn-placement.test.ts
- _bmad-output/test-artifacts/fixtures/engine-spawn-candidates-validation-fixtures.ts
- _bmad-output/test-artifacts/traceability/coverage-matrix-dw-engine-spawn-candidates-validation.json
- _bmad-output/test-artifacts/traceability/e2e-trace-summary-dw-engine-spawn-candidates-validation.json

## Excluded From Review Set

- _bmad-output/test-artifacts/fixtures/engine-spawn-candidates-validation-fixtures.ts — fixture helpers not scorable by the ledger (not a test suite)
- triade/__tests__/engine/spawn-candidates.unit.test.ts — existing hardened suite 304 lines counted as context, not as authored artifact of this sweep
- triade/__tests__/engine/spawn-placement.test.ts — existing hardened suite 283 lines counted as context, not as authored artifact

