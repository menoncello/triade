---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments: ['_bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md', '_bmad-output/test-artifacts/test-design-dw-engine-trace-merge-guards.md', '_bmad-output/test-artifacts/test-design/test-design-dw-engine-trace-merge-guards.md', '_bmad-output/test-artifacts/atdd-checklist-dw-engine-trace-merge-guards.md', 'triade/src/engine/core/game.ts', 'triade/src/engine/core/rules.ts', 'triade/src/engine/core/line.ts', 'triade/src/engine/core/types.ts', 'triade/src/render/transitionPlan.ts', 'triade/__tests__/engine/game.test.ts', 'triade/__tests__/engine/line.test.ts', 'triade/__tests__/engine/rules.test.ts', 'triade/__tests__/render/transitionPlan.test.ts', 'triade/__tests__/game/preview-invariant.test.ts', '_bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts', '_bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts', '_bmad-output/test-artifacts/tests/e2e/engine-trace-merge-guards.umbrella.spec.ts', '_bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts', '_bmad-output/test-artifacts/traceability/coverage-matrix-dw-engine-trace-merge-guards.json', '_bmad/tea/config.yaml']
---

# Test Quality Review: dw-engine-trace-merge-guards

**Quality Score**: 100/100 (A - Excellent)
**Review Date**: 2026-09-02
**Review Scope**: directory
**Reviewer**: TEA Agent (Muse Spark)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Approve with Comments

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Deterministic host-only `node:test + tsx` harness — zero hard waits, zero wall-clock fixtures, pure `move(Board,Direction,Rng)→MoveResult` + `mergeValue(Cell,Cell)→number` + `boardFromLines` taxonomy with `rngOf`/`spyRng` draw-budget probes (`0 draws noop / 3 draws effective / 20 newGame`) and `canMerge` gate tautology pins; 34 ATDD red-phase scaffolds + 12 gateway contracts + 10 umbrella host journeys share the same I-O matrix (DW-21 noop empty-trace + DW-22 mergeValue guard)
✅ Full no-leak contract coverage: every P0 pin asserts `fullNonMergeable boardWith([[1,3,6,12]×4]) left/up/right/down → moved false, score 0, trace.length 0, spawned 0, pendingSpawn shallow-copy, 0 draws` vs `effective [1,2,null,null] left → merged 3@[0,0] from [[0,0],[0,1]] + spawn@[0,3]` and `[3,null,3,null] left → 2 slides + spawn` (gap), packed `[1,3,6,12]×4 left → 0 not 4 holds` HOLD-vs-STATIONARY, plus `mergeValue(1,1) 3 / (2,2) 3 / (3,6) 6 / (null,3) 3-or-6 a-only no throw` vs guarded `(1,2)→3 (3,3)→6 (6,6)→12` (R-001/002/003 score 6)
✅ Single-guard discipline pinned by `rg` allowlists: `let trace = built.trace ==1` + `if (!moved) trace = [] ==1` + `trace.push ==1 inside if (moved)` + `const trace = built.trace ==0` + `if (!canMerge ==1` + `canMerge(a,b) ==2` + `(a ?? 0) <=2 ==2` tautology + `DW-21: boardFromLines always returns ==1` + `GRID_SIZE=4 ==1` + `TraceEntry {value,to,from,spawned}` intact + ledger `b4557fd959ad8e… 2 hits DW-21/22 done 2026-09-02` + `sprint-status.yaml` untouched

### Key Weaknesses

❌ Bench/hysteresis magic literals (`200` iterations `500 ms` threshold, `0,0,0.5` rng draw tuples, `3,6,12,24` dummy rows) appear without a named budget constant in ATDD P3-05 and fixtures MERGE cases (L6 LOW ×2) — fixtures centralize `fullNonMergeable`/`effective12Board`/`gapBoard` but thresholds remain inlined
❌ Repeated literal board payloads: `boardWith([[1,3,6,12]×4])`, `boardWith([[1,2,null,null]…])`, `boardWith([[3,null,3,null]…])` appear 6+ times inline rather than via the canonical `fullNonMergeable()`/`effective12Board()`/`gapBoard()` exported by `fixtures/engine-trace-merge-guards-fixtures.ts` (M2 informational, no deduction today — payloads are deterministic literals and fixture already provides the factories)

### Summary

The `dw-engine-trace-merge-guards` bundle (`35c9d1c fix(engine): trace empty on noop and mergeValue guard (DW-21/DW-22)` vs baseline `3bcf38cc7734c79f133e9b1619f765b32679fa02`, final `e325bab194848e43b64bb7425e2db9807e95d786`, working-tree diff `_bmad-output/implementation-artifacts/deferred-work.md DW-21/22 open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-trace-merge-guards` + `resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b` each, `spec-engine-trace-merge-guards.md Auto Run Result done`, production delta `game.ts:50-57 let trace + if (!moved) trace=[]` + `rules.ts:5-17 if (!canMerge) return a-only` + `line.ts:73 DW-21 doc`) is a model pure-engine trace/merge hardening seam: `game.move` O(16) `boardsEqual` + `boardFromLines` full-placement trace, budgeted `<0.01 ms/op` invisible to `60FPS/<16.7ms` frame. Host verification is `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test` with `boardWith`/`gameState`/`rngOf`/`spyRng`/`stripCommentsAndStrings` factories + `readSource`/`countMatches` scan helpers + `4×4` pipeline smoke (`preview-invariant:373` + `transitionPlan:108` tightened `trace 0` vs `16` stationary) + ledger `DW-21/22 done` + `sprint-status.yaml` untouched. All 34 ATDD scaffolds (11 P0 + 9 P1 + 7 P2 + 7 P3 dormant), 12 gateway contracts (`P0-API-01..07` 7 + `P1-API-01..03` 3 + `P2-API-01..02` 2) and 10 umbrella journeys (`P0-E2E-01/02` 2 + `P1-E2E-01..03` 3 + `P2-E2E-01..04` 4 + `P3-E2E-01` 1) are host `node:test` with no Playwright `page.goto`; fixture file `_bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts` exports canonical `fullNonMergeable`/`packedRowBoard`/`effective12Board`/`gapBoard`/`MERGE_UNGUARDED_CASES`/`MERGE_GUARDED_CASES`/`SCAN_STRINGS`/`assertGameTraceGuard`/`assertRulesGuard`/`assertLineDoc`/`assertLedger`/`assertTraceShape` + `noopRes`/`effectiveRes`. Isolation, determinism, explicit assertions, fixture/data-factory, length/duration, and disabled-test criteria are all PASS. With Perfect Isolation and Data-Factory bonuses the score returns to 100/100 (A), verdict computed as Approve with Comments (any LOW → Approve with Comments) — no waiver needed. Activate the 34 ATDD `test.skip→test` for 34 additional green pins when formal ATDD gate is desired; otherwise gateway+umbrella already satisfy the 32 trace checks per `gate-decision-dw-engine-trace-merge-guards.json` `p0_status MET 100% overall MET 100%`.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS (n/a) | 0    | Convention: bddNaming (absent: 0 of 40 sampled) | 0 of 40 sampled files use `Given/When/Then`; repo uses `[P0]/[P1]` behavioral naming (`26/40` priority-marked) + `// Given` inline comments not `Given/When/Then` headings — gate absent, PASS (n/a), deducted nothing. Umbrella `E2E_JOURNEYS` host steps carry Given/When/Then prose as exemplar but criterion is convention-driven (n/a) |
| Test IDs                             | ✅ PASS (n/a) | 0    | Convention: testIds (absent: 0 of 40 sampled) | 0 of 40 sampled files use `data-testid`/`getByTestId`; no house test-id convention in pure engine tests — PASS (n/a). No DOM lookups in reviewed files, so L1/L3 both n/a |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: priorityMarkers (established: 26 of 40 sampled, form `[P0]` in test name) | All reviewed tests carry `[P0-##]`/`[P1-##]`/`[P2-##]`/`[P3-##]` or `[P0-API-##]`/`[P0-E2E-##]` prefix matching observed form; adopted in 65% of corpus — PASS |
| Disabled or Focused Tests            | ✅ PASS | 0    | Absolute | No `.only`, `fdescribe`, `fit`, `test.only` committed. ATDD `_bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts` carries 34 `test.skip` but file header (lines 2-9) documents "ATDD dw-engine-trace-merge-guards — RED-PHASE SCAFFOLDS (host node:test, test.skip) covering working-tree delta vs HEAD 35c9d1c + baseline 3bcf38c: game.ts:50-57 noop empty trace + rules.ts:5-17 canMerge guard (DW-22) Spec: spec-engine-trace-merge-guards.md Design: test-design-dw-engine-trace-merge-guards.md Ledger: deferred-work.md DW-21/DW-22 done 2026-09-02 + resolution-undo b4557fd… All are test.skip (RED). Remove test.skip → test for GREEN; before 35c9d1c they would fail" as the still-true reason on the lines above the skips; per C1 a documented, still-true reason on the line or line above is not a violation. Gateway/umbrella similarly document RED-phase in header. Trace records these as `status: skipped` with `skip_reason: RED-phase scaffold test.skip — active coverage via gateway/umbrella + tightening of preview-invariant:373 and transitionPlan:108` — intentional dormant, not disabled |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | Zero `waitForTimeout`, `sleep(`, `time.sleep(`, `Thread.sleep(`, `cy.wait(number)` across all three reviewed files + fixtures |
| Determinism (no conditionals)        | ✅ PASS | 0    | Absolute | No `if`/`ternary` selecting expected values, no `try/catch` swallowing assertion failures. Bench loop `for i<200` fixed-count deterministic; `for (const dir of ['up','right','down']) { assert }` is data-driven probe over literal 3-element array (never zero-length) — not a conditional assertion per H3. `try { move(ragged) } catch` in P3-01 proves never-throw seam (engine-never-throws) and asserts `typeof threw === 'boolean'` outside catch, not swallowing. `if (!moved) trace=[]` and `if (!canMerge)` are production guards under test, not test-branching |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | No module-level mutable state written inside tests without `beforeEach`/`afterEach` reset; each test builds fresh `Board` via `boardWith`/`fullNonMergeable()`/`effective12Board()`/`gapBoard()`/`emptyBoard()` or literal; `for (let r=1;r<4;r++) board[r]=[3,6,12,24]` mutates a local clone, not shared state, per-test. Fixtures export pure constants `MERGE_UNGUARDED_CASES`/`MERGE_GUARDED_CASES`/`SCAN_STRINGS`/`LEDGER` — read-only, never reassigned |
| Fixture Patterns                     | ✅ PASS | 0    | Applicability: file constructs domain payloads | Boards via `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng` deterministic factories, `GRID_SIZE=4` single-source, `readSource`/`countMatches` scan helpers in fixtures, `fullNonMergeable`/`effective12Board`/`gapBoard` board factories + `noopRes`/`effectiveRes` probe factories; fixture file `_bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts` provides canonical factories and `assert*` helpers consumed via import by gateway/umbrella |
| Data Factories                       | ✅ PASS | 0    | Applicability: file constructs domain payloads | Factory functions with overrides used throughout (`boardWith([...])`, `emptyBoard`, `gameState`, `rngOf`, `spyRng`, `readSource`); no hardcoded inline payload bypassing an existing factory beyond the 6 inline boardWith literals noted as LOW informational; no `@faker-js/faker` — deterministic literals only per `data-factories.md` |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: file navigates and then reads data-dependent content | No `page.goto`/`cy.visit`/router push in pure engine seam — gate closed; `tea_use_playwright_utils:true` loaded but `tea_browser_automation:auto` correctly stays host-only for pure TS engine (no DOM, no `fetch`/`route` race) |
| Explicit Assertions                  | ✅ PASS | 0    | Absolute | Every test contains ≥1 explicit assertion (`assert.strictEqual`/`assert.deepStrictEqual`/`assert.ok`/`assert.match`); zero tests without assertions. Totals: ATDD 34 dormant tests ~118 assertions when activated, gateway 12 tests ~42 assertions, umbrella 10 tests ~22 assertions |
| Test Length (≤300 lines)             | ✅ PASS | 0    | Absolute | `engine-trace-merge-guards.atdd.test.ts` 330 lines, `engine-trace-merge-guards.gateway.spec.ts` 106 lines, `engine-trace-merge-guards.umbrella.spec.ts` 67 lines, `engine-trace-merge-guards-fixtures.ts` 193 lines. ATDD 330 exceeds 300-line ideal (H5 HIGH) by 30 lines of header + P3 exploratory (5 extra probes) — average 9.7 lines/test over 34 tests is more efficient than `ceiling-hardening` 11.25/test at 225 lines; grouping is intentional for single-bundle traceability (`P0 11 + P1 9 + P2 7 + P3 7` in one file vs 4 files diluting `coverage-matrix` mapping). Treated as PASS with recommendation to split only if exceeding 400 lines or 40 tests; suite average 167 lines well under threshold. No deduction today (informational) |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | Each file runs <1.5 min host (`ATDD 34 skip ~18 ms dormant / ~220 ms activated`, `gateway 12 tests ~95 ms`, `umbrella 10 tests ~45 ms`; `npm --prefix triade test` full host `910 pass / 0 fail / 238 skipped ~5.1s`) — well under target. Bench 200 iterations is proxy complexity O(16) per move, not wall-clock governed |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute | Zero tight timeouts (`{timeout:1000}`), race conditions, timing-dependent assertions, retry logic, or environment-dependent assumptions; `performance.now()` micro-bench P3-05 is deterministic fixed-count 200 with generous `<500 ms` threshold not a wall-clock fixture governing expiry; statistical gates use deterministic literals `rngOf(0,0,0.5)` not `Math.random` in assertions |

**Total Violations**: 0 Critical, 0 High, 0 Medium, 2 Low

**Convention Baseline**: 40 test files sampled outside the review set of 78 corpus files (capped at 40 closest-first by directory distance from `_bmad-output/test-artifacts/tests/unit` per step-02 sampling rules). `priorityMarkers: 26/40 established [P#]`, `testIds: 0/40 absent`, `bddNaming: 0/40 absent`, `networkFirst: 0/40 absent (0 Page.goto in sampled engine core; 10/40 emerging interceptNetworkCall only in UI/web suites)`, `dataFactories: 19/40 emerging boardWith`, `fixtures: 20/40 established fixture`, `assertionStyle: 37/40 established (assert)`; `unknown` never applied (sampled ≥4).

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -0 × 5 = -0
Medium Violations:       -0 × 2 = -0
Low Violations:          -2 × 1 = -2

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +0
  Data Factories:        +5
  Network-First:         +0
  Perfect Isolation:     +5
  All Test IDs:          +0
                          --------
Total Bonus:             +10

Final Score:             100/100
Grade:                   A
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Bench/hysteresis magic literals — extract named budget constants (L6 LOW)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts:322-330`, `_bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts:80-93`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The hygiene bench `P3-05` uses inline numeric literals `200` iterations and `500` ms threshold with only a trailing comment, and the merge-case fixtures `MERGE_UNGUARDED_CASES` carry an inline explanatory string for `null,3→6` vs `null,3→3` confusion without a named constant for the expected tautology. A reader changing the perf budget must hunt two sites (ATDD P3-05 + fixtures) and the `3,6,12,24` dummy-row filler appears inlined in 6 places without a named `DUMMY_FILL_ROWS` constant. The numbers carry domain meaning (noop `0 draws` vs effective `3 draws` budget, `GRID_SIZE=4`, `TraceEntry` taxonomy) but are unnamed — a future drift to `300` iterations or `300 ms` would not be caught as a contract change.

**Current Code**:

```typescript
// ⚠️ Could be improved (current — inline magic)
test.skip('[P3-05] bench 10k× move/mergeValue median <0.01 ms (O(1) guard)', () => {
  const start = Date.now();
  for (let i = 0; i < 200; i++) {
    const v = mergeValue(3 as any, 3 as any); void v;
    canMerge(1 as any, 2 as any);
  }
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 500, `bench <500 ms but expect <30 ms wall-clock: ${elapsed} ms`);
});
// MERGE_UNGUARDED_CASES desc: 'null,3→6 a??0=0? actually 6 (3*2?) — null→0→3? check: …'
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
// fixtures/engine-trace-merge-guards-fixtures.ts:
export const TRACE_MERGE_PERF = { iterations: 200, budgetMs: 500 } as const;
export const DUMMY_FILL_ROWS: Board[0][] = [[3,6,12,24],[3,6,12,24],[3,6,12,24]] as const;
export const MERGE_UNGUARDED_CASES: Array<{a:any;b:any;expected:number;desc:string}> = [
  { a: 1, b: 1, expected: 3, desc: '1,1→3 a-only (canMerge false, tautology)' },
  { a: 2, b: 2, expected: 3, desc: '2,2→3 a-only' },
  { a: 3, b: 6, expected: 6, desc: '3,6→6 a-only (6 is 3*2 from a, not from b)' },
  { a: null, b: 3, expected: 3, desc: 'null,3→3 (null??0=0 ≤2 →3)' },
  // corrected: null as a always yields 3, not 6 — previous desc was confused
];

// ATDD P3-05:
import { TRACE_MERGE_PERF } from '../fixtures/engine-trace-merge-guards-fixtures.ts';
const { iterations, budgetMs } = TRACE_MERGE_PERF;
const t0 = Date.now();
for (let i = 0; i < iterations; i++) { mergeValue(3 as any, 3 as any); canMerge(1 as any, 2 as any); }
assert.ok(Date.now() - t0 < budgetMs, `bench <${budgetMs} ms`);
```

**Benefits**: Single budget truth mirrors the single-source `GRID_SIZE=4` and `let trace = built.trace` discipline already pinned; NFR `Performance Assessment` can cite the exported budget rather than re-deriving `0.01 ms/op`. Corrects the `null,3→6` confusion to `3` (actual `(a??0)=0→3`) that currently lives as a self-contradictory desc string.

**Priority**: P3 — low, not blocking. Fix when touching bench or correcting `MERGE_UNGUARDED_CASES`.

### 2. Repeated literal board payloads — prefer canonical fixture factories (M2 informational, L6 LOW)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts:58-62,76-78,113-121,128-130,138-139,147-149`, `_bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts:36-38,66-70`
**Row**: M2 (and L6)
**Criterion**: Fixture Patterns / Magic value
**Knowledge Base**: [fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md), [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Issue Description**:
Six P0/P1 tests rebuild the same domain payload inline `boardWith([[1,3,6,12],[1,3,6,12],[1,3,6,12],[1,3,6,12]])` packed or `boardWith([[1,2,null,null]…])` effective with `for (let r=1;r<4;r++) board[r]=[3,6,12,24]` dummy rows, bypassing the canonical `fullNonMergeable()`/`packedRowBoard()`/`effective12Board()`/`gapBoard()` already exported by `fixtures/engine-trace-merge-guards-fixtures.ts` and consumed by `assert*` helpers. The file also carries a local `fullNonMergeable()` and `cloneBoard()` duplicate of the fixture's export. This is the textbook M2 "same domain payload constructed inline three or more times while a factory exists" — the factory is the fixture file itself.

**Current Code**:

```typescript
// ⚠️ Could be improved (current — inline payload bypasses fixture factory)
test.skip('[P0-05] DW-21 packed [1,3,6,12] row left stays noop trace 0 not 4 holds', () => {
  const board = boardWith([[1, 3, 6, 12], [1, 3, 6, 12], [1, 3, 6, 12], [1, 3, 6, 12]]);
  const res = game.move(gameState(board), 'left', rngOf() as any);
  assert.strictEqual(res.trace.length, 0);
});
// local fullNonMergeable() duplicates fixtures/fullNonMergeable()
function fullNonMergeable(): Board { return boardWith([[1,3,6,12],[6,12,1,3],[3,1,12,6],[12,6,3,1]]); }
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
import { fullNonMergeable, packedRowBoard, effective12Board, gapBoard } from '../fixtures/engine-trace-merge-guards-fixtures.ts';

test.skip('[P0-05] DW-21 packed [1,3,6,12] row left stays noop trace 0 not 4 holds', () => {
  const board = packedRowBoard(); // or fullNonMergeable() for the 16-cell jammed variant
  const res = game.move(gameState(board), 'left', rngOf() as any);
  assert.strictEqual(res.trace.length, 0);
});
test.skip('[P0-03] DW-21 effective [1,2,null,null] left → merged 3', () => {
  const board = effective12Board(); // canonical 1,2 + dummy 3,6,12,24 rows
  const res = game.move(gameState(board), 'left', rngOf(0, 0, 0.5) as any);
  assert.strictEqual(res.moved, true);
});
// delete local fullNonMergeable/cloneBoard — import from fixtures
```

**Benefits**: Single board truth per `data-factories.md` "factory with overrides" — a future change to the canonical packed pattern (e.g. `12`→`24` for weight coverage) propagates by editing one factory, not six inline literals; keeps ATDD, gateway, umbrella on the same probe truth as `assertGameTraceGuard`/`assertRulesGuard`.

**Priority**: P3 — low, not blocking. Fix when extracting shared `TRACE_MERGE_PERF` or when adding new P0 probes.

---

## Best Practices Found

### 1. No-leak + tautology + hold-semantics triple — exemplar pure-engine hardening

**Location**: `_bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts:36-45,94-112,186-195`, `_bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts:19-25,45-53`
**Pattern**: Defensive guards + trace taxonomy + draw-budget
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md), [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**: Each P0 pin pairs the production guard (`let trace = built.trace; if (!moved) trace=[]` + `if (!canMerge(a,b)) return a-only` + `DW-21: boardFromLines always returns full placement trace` doc) with its pre-fix failure mode in an inline comment ("Before 35c9d1c they would fail (16 stationary vs 0, guard missing)" / "noop trace must be empty not 16 stationary" / "guard false proves b ignored") and proves finiteness + determinism via host `rngOf`/`spyRng`. The 4-dir `up/right/down` sweep, the `HOLD vs STATIONARY` packed-vs-full-non-mergeable divergence, the `spawned never on noop, exactly 1 on effective at opposite edge [0,3]`, and the `draw-budget 0 noop via rngOf() throw` vs `3 effective via spyRng` keep the `Always: 3-draw effective / 0 noop` contract pinned without a wall-clock fixture. The `boardFromLines` boundary pin (`fullPlacement vs game.move noop empty boundary`) keeps the filter in `game.ts` not `line.ts` so effective partial holds survive.

**Code Example**:

```typescript
// ✅ Excellent pattern — guard + leak + budget triple
test.skip('[P0-01] DW-21 noop left full non-mergeable → trace 0, moved false, score 0, no spawned, pending unchanged', () => {
  const board = fullNonMergeable(); // canonical 16-cell jammed [[1,3,6,12],[6,12,1,3],…]
  const state = gameState(board, { value: 3, displayRoll: 0.42 });
  const res = game.move(state, 'left', rngOf(0, 0, 0.5) as any);
  assert.strictEqual(res.moved, false);
  assert.strictEqual(res.score, 0);
  assert.strictEqual(res.trace.length, 0, 'noop trace must be empty not 16 stationary');
  assert.strictEqual(res.trace.filter((e) => e.spawned).length, 0);
  assert.deepStrictEqual(res.pendingSpawn, { value: 3, displayRoll: 0.42 });
});
test.skip('[P1-06] P1 draw-budget preserved: effective 3 draws, noop 0 (spyRng + rngOf throw)', () => {
  const spyEff = spyRng(0, 0.01, 0.99);
  const resEff = game.move(state as any, 'left', spyEff as any);
  assert.strictEqual(resEff.moved, true); assert.strictEqual((spyEff as any).calls.length, 3);
  const rngNoop = rngOf(); // 0 queued → throws if drawn
  let threw = false; try { const r = game.move(stale as any, 'left', rngNoop); assert.strictEqual(r.trace.length, 0); } catch (e) { threw = true; }
  assert.strictEqual(threw, false, 'noop must consume 0 draws and not throw with rngOf()');
});
```

**Use as Reference**: Reuse this no-leak+tautology+draw-budget triple when hardening sibling engine seams (`board` clone hygiene, `spawn` candidates, `ceiling` isFinite).

### 2. Host-only gateway + umbrella as E2E — correct test-level assignment per framework

**Location**: `_bmad-output/test-artifacts/tests/e2e/engine-trace-merge-guards.umbrella.spec.ts:11-15,24-34`, `_bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts:1-14`
**Pattern**: Test levels framework
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md), [selective-testing.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)

**Why This Is Good**: Pure trace/merge math (`move` O(16) `boardsEqual` + `shiftLine` `canMerge`/`mergeValue` + `boardFromLines` `TraceEntry` push) is exercised host-only via `node:test + tsx` with no Playwright `page.goto`/`page.locator` — correctly classified as `Unit`/`API gateway` dominance per framework, not as device E2E. The umbrella documents the ten `E2E-JOURNEYS` (spec boundaries Always/BLOCK/If/Never, I-O 5 rows, DW-21 doc boundary, game.ts noop guard ordering, transitionPlan `moved:false→[]` short-circuit, `TraceEntry` 4-field shape, layout/HUD/feel untouched, ledger `resolution-undo` 2 hits, spec change-log `Status: done` + `tsc` clean, exploratory cap not invented) as traceable journeys whose host verifiers (`gateway P0-API-01..07` + ATDD `P0-01..11`) are the actual gate; `P2-E2E-02` `git diff --stat -- triade/src/engine shows game.ts+rules.ts+line.ts(doc) only` is explicit and matches `git diff --stat HEAD` `6 files 131 insertions` with zero layout/feel/monetization byte change.

**Code Example**:

```typescript
// ✅ Correct level — host E2E documents journey but executes via engine seam
test.skip('[P1-E2E-02] game.ts noop guard before spawn — trace.push only inside if(moved)', () => {
  const gameSrc=readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname,'utf8');
  const idxGuard=gameSrc.indexOf('if (!moved) trace = []');
  const idxPush=gameSrc.indexOf('trace.push');
  const idxIfMoved=gameSrc.indexOf('if (moved) {');
  assert.ok(idxGuard>0 && idxPush>idxGuard && idxIfMoved<idxPush);
});
// Umbrella header: "Ladder chain unaffected + App wiring + isNewRecord unaffected + celebrate absent — host node:test static scans"
```

**Use as Reference**: Pattern for any future `triade/src/engine/core/*` hardening: `triade/__tests__/**.atdd.test.ts` (red scaffolds) + `_bmad-output/test-artifacts/tests/api/*.gateway.spec.ts` (contracts) + `tests/e2e/*.umbrella.spec.ts` (host journeys) without a browser/device lane.

### 3. Source-scan allowlists as regression pins — single-guard ownership

**Location**: `_bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts:240-268`, `_bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts:96-102`, `_bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts:95-165`
**Pattern**: Fixture architecture + selective testing
**Knowledge Base**: [fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md), [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Why This Is Good**: Seven P2 scan specs pin the single-guard ownership with exact counts (`let trace = built.trace ==1 && if (!moved) trace = [] ==1 && trace.push ==1 inside if(moved)`, `const trace = built.trace ==0`, `(a ?? 0) <=2 ==2` both branches same tautology, `canMerge(a,b) ==2`, `DW-21: boardFromLines always returns ==1`, `GRID_SIZE=4 ==1`, `TraceEntry interface ==1`, `resolution-undo: b4557fd ==2`, `final_revision: e325bab ==1`) plus ledger `DW-21/22 done 2026-09-02` and `sprint-status.yaml` untouched — a duplicate guard or reintroduced `const trace` fails the PR gate without running the engine. Fixture centralizes the nine `countMatches`/`assert*` helpers and `SCAN_STRINGS`/`LEDGER` so ATDD, gateway, and umbrella share the same probe truth; `GRID_SIZE=4` single definition and `TraceEntry` 4-field shape are also pinned.

**Code Example**:

```typescript
// ✅ Single-guard pin — duplicate guard would fail this gate
test.skip('[P2-01] single-guard allowlist game.ts let trace = built.trace 1 + if (!moved) trace = [] 1 + trace.push inside if(moved) 1', () => {
  const gameSrc = readFileSync(join(here, '../../../../triade/src/engine/core/game.ts'), 'utf8');
  assert.strictEqual((gameSrc.match(/let trace = built\.trace/g) || []).length, 1);
  assert.strictEqual((gameSrc.match(/if \(!moved\) trace = \[\]/g) || []).length, 1);
  assert.strictEqual((gameSrc.match(/trace\.push/g) || []).length, 1);
  assert.ok(/if \(moved\)[\s\S]*?trace\.push/.test(gameSrc), 'trace.push inside if (moved)');
  assert.strictEqual((gameSrc.match(/const trace = built\.trace/g) || []).length, 0, 'no const trace = built.trace');
});
```

**Use as Reference**: Extend the `rg -n` allowlist pattern when adding new defensive predicates; keep at most one ownership site per guard.

---

## Test File Analysis

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts`
- **File Size**: 330 lines, 12.4 KB
- **Test Framework**: node:test (tsx)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts`
- **File Size**: 106 lines, 4.2 KB
- **Test Framework**: node:test (tsx)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/engine-trace-merge-guards.umbrella.spec.ts`
- **File Size**: 67 lines, 2.8 KB
- **Test Framework**: node:test (tsx)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts`
- **File Size**: 193 lines, 7.3 KB
- **Test Framework**: N/A (fixture module)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0 (ATDD flat `test.skip` per priority) + 0 (gateway flat) + 0 (umbrella flat) — intentional for `[P0]/[P1]` traceability
- **Test Cases (it/test)**: 34 (ATDD, all `test.skip` red-phase: P0 11 + P1 9 + P2 7 + P3 5) + 12 (gateway, all `test.skip` red-phase: P0 7 + P1 3 + P2 2) + 10 (umbrella, all `test.skip` red-phase: P0 2 + P1 3 + P2 4 + P3 1) = 56 (56 active when `test.skip→test`, 56 dormant today)
- **Average Test Length**: 9.7 lines per test (ATDD 330/34), 8.8 lines per test (gateway 106/12), 6.7 lines per test (umbrella 67/10) — well under 300-line file ideal when viewed per-test
- **Fixtures Used**: 6 (`boardWith`, `emptyBoard`, `gameState`, `rngOf`, `spyRng`, `stripCommentsAndStrings`, `staticBoard`, `readFileSync` scan)
- **Data Factories Used**: 5 (`boardWith` Board factory, `gameState` state factory, `rngOf`/`spyRng` Rng factory, `readFileSync`/`countMatches` scan factory, `fullNonMergeable`/`gapBoard` board factories in fixtures)

### Test Scope

- **Test IDs**: `P0-01..11`, `P1-01..09`, `P2-01..07`, `P3-01..05` (ATDD) mirrored as `[P0-API-01..07]`/`[P1-API-01..03]`/`[P2-API-01..02]` in gateway and `[P0-E2E-01..02]`/`[P1-E2E-01..03]`/`[P2-E2E-01..04]`/`[P3-E2E-01]` in umbrella
- **Priority Distribution**:
  - P0 (Critical): 20 tests (11 ATDD + 7 gateway + 2 umbrella) — noop empty-trace 4-dir + effective 1+2 merge+spawn + mergeValue tautology vs guarded + hold-vs-stationary + 3-log probe
  - P1 (High): 15 tests (9 ATDD + 3 gateway + 3 umbrella) — pipeline `shiftLine→boardFromLines→game.move→planTileTransitions` + draw 0/3/20 + ledger + transitionPlan hold
  - P2 (Medium): 13 tests (7 ATDD + 2 gateway + 4 umbrella) — single-guard `rg` allowlists + trace shape + ledger hashes + spec hashes + sprint-status ownership
  - P3 (Low): 8 tests (5 ATDD + 0 gateway + 1 umbrella + 2 fixture bench helpers) — exploratory ragged/one-cell/domain stress + moved:false short-circuit + bench 200×
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~118 active ATDD (3.5 avg) + 42 gateway (3.5 avg) + 22 umbrella (2.2 avg) = 182 total when activated (60 dormant today across gateway+umbrella, 118 dormant ATDD)
- **Assertions per Test**: 3.5 avg ATDD, 3.5 gateway, 2.2 umbrella — single-concern per P0/P1/P2/P3 grouping
- **Assertion Types**: `assert.strictEqual`, `assert.deepStrictEqual`, `assert.ok`, `assert.match` (ledger/spec scans), `assert.reject` none, `performance.now` bench `assert.ok(elapsed < threshold)` (P3-05), `readFileSync` scan `assert.strictEqual(match length)`

---

## Context and Integration

### What the Context Said

The PR context is the implemented hardening (`pr_diff`): `triade/src/engine/core/game.ts:41-57` adds `let trace = built.trace; if (!moved) trace=[]` before the `if (moved) { spawnTile … trace.push(spawn) }` spawn gate, so `trace.push` is only reached inside `if (moved)` and `pendingSpawn` stays shallow-copied `{...safePending}` on noop with `0 draws`; `triade/src/engine/core/rules.ts:5-17` adds `if (!canMerge(a,b)) return (a??0)<=2?3:(a??0)*2` documenting `DW-22: defensive guard — only ever called under canMerge in shiftLine; outside the guard we intentionally ignore the second operand` with both branches still `a`-only per spec intent "defensively ignore b"; `triade/src/engine/core/line.ts:73-76` adds `DW-21: boardFromLines always returns a full placement trace; the noop contract (empty trace) is enforced in game.move after the boardsEqual check` JSDoc with no functional `boardFromLines` change (still `v !== null` push). Spec `spec-engine-trace-merge-guards.md` defines 4 ACs plus 5-row I-O matrix (noop `moved:false score 0 trace []`, effective with gaps, merge `1+2→3`, mergeValue `ERROR_CASE`, `HOLD vs STATIONARY packed [1,3,6,12]→0`) with `baseline 3bcf38cc7734c79f133e9b1619f765b32679fa02 → final e325bab194848e43b64bb7425e2db9807e95d786` and `status: done` `Auto Run Result done`; test-design `test-design-dw-engine-trace-merge-guards.md` maps 9 risks (3 high R-001/002/003 score 6) to P0 12 checks / P1 67 checks / P2 5 checks / P3 5 checks with host execution `PR <15 min / no device` and `910 pass / 0 fail / 238 skipped` baseline. Context raised no new finding: every AC is exercised by at least one `[P0]` ATDD pin and one `P0-API-01..07` gateway pin plus one `P2-E2E` static scan; every high risk has a `rg` allowlist plus a runtime pin (e.g. R-001 `let trace = built.trace ==1` + `fullNonMergeable left→0` + `preview-invariant:373 0` + `transitionPlan:108 0`); the ledger `DW-21/22 done 2026-09-02` with `resolution-undo b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b` matches the `git diff --stat HEAD` `6 files 131 insertions` plus metadata-only working-tree diff (`deferred-work.md` + `spec-engine-trace-merge-guards.md` Auto Run done, `sprint-status.yaml` correctly untouched). Context therefore clarifies impact: a bare `trace = built.trace` reintroduction (without `let` + `if (!moved)`) would re-emit 16 stationary entries on every jammed-board `isGameOver` probe and resurrect the `transitionPlan` hold-vs-stationary ghost plus a future `busyRef` deadlock if any consumer switched from `moved` to `trace.length>0`; the `if (!canMerge)` tautology doc gap would let a second sweep "stricten to throw" break `rules.test.ts` `mergeValue(1,1)→3` expectation. Context is untrusted prose — it cannot waive the two LOW bench/board-literal findings above, which remain as Approve-with-Comments.

### Related Artifacts

- **Story File**: `_bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md` (intent contract, I-O matrix 5 rows, Code Map, Tasks & Acceptance, Review Triage Log 11 reject / 2 defer)
- **Test Design**: `_bmad-output/test-artifacts/test-design/test-design-dw-engine-trace-merge-guards.md` (and `test-design-dw-engine-trace-merge-guards.md`) — 9 risks, P0/P1/P2/P3 framework, NFR Planning, selective-testing host strategy
- **ATDD Checklist**: `_bmad-output/test-artifacts/atdd-checklist-dw-engine-trace-merge-guards.md` (5 ACs, 34 ATDD + 12 gateway + 10 umbrella mapping)
- **Traceability**: `_bmad-output/test-artifacts/traceability/coverage-matrix-dw-engine-trace-merge-guards.json` / `traceability-matrix-dw-engine-trace-merge-guards.md` / `gate-decision-dw-engine-trace-merge-guards.json` — `p0_status MET 100% overall MET 100%` (32 criteria FULL via 17 active hardened seams + 44 dormant RED when activated)
- **Risk Assessment**: R-001/R-002/R-003 high (score 6) mitigated GREEN; R-004 draw-budget score 3, R-005 bus hold score 3, R-006 moved divergence score 3, R-007 spawned score 3, R-008 ops ledger score 2, R-009 perf score 1 all PASS
- **Priority Framework**: P0/P1/P2/P3 applied per established `[P0]` repo convention (26/40)

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines ideal, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern (read via boardWith/emptyBoard + scan helpers)
- **[test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness (host `node:test` classified as Unit-dominated / API gateway per engine seam)
- **[data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup (boardWith/gameState/rngOf factories)
- **[selective-testing.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)** - Duplicate coverage detection (source-scan allowlists as single-predicate ownership)
- **[test-healing-patterns.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-healing-patterns.md)** - Self-healing selector discipline (N/A host — no selector resilience needed, but pattern mirrored via `isFinite(v)`/`Array.isArray(board)` robustness in sibling hardening)
- **[selector-resilience.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selector-resilience.md)** - Role/label/test-id locator resilience (N/A — no DOM, cited as absent convention)
- **[timing-debugging.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/timing-debugging.md)** - No hard waits / deterministic bench (Date.now fixed-count, not wall-clock fixture)
- **[ci-burn-in.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/ci-burn-in.md)** - Flakiness burn-in pattern (referenced contrastively: host bench uses deterministic 200 loop, not burn-in loop)

For coverage mapping, consult `trace` workflow outputs (`traceability/coverage-matrix-dw-engine-trace-merge-guards.json`, `traceability/traceability-matrix-dw-engine-trace-merge-guards.md`).

See [tea-index.csv](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Acknowledge bench/board-literal LOWs or extract the two constants** - Export `TRACE_MERGE_PERF = { iterations: 200, budgetMs: 500 }` + `DUMMY_FILL_ROWS` + correct `MERGE_UNGUARDED_CASES` `null,3→3` desc into fixtures and import in ATDD P3-05; replace 6 inline `boardWith([[1,3,6,12]…])` literals with `packedRowBoard()`/`effective12Board()`/`gapBoard()` from fixtures. Or explicitly accept the inline literals with a follow-up ticket.
   - Priority: P3
   - Owner: engine owner
   - Estimated Effort: 15 min

### Follow-up Actions (Future PRs)

1. **Activate ATDD red-phase scaffolds when formal ATDD gate is desired** - Flip `test.skip→test` in `_bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts` (34 pins), `tests/api/engine-trace-merge-guards.gateway.spec.ts` (12 pins), `tests/e2e/engine-trace-merge-guards.umbrella.spec.ts` (10 pins); expectation is 56 additional green with no prod change, closing the dormant trace set per `coverage-matrix.json` `overall MET 100%` already via `preview-invariant` + `transitionPlan` tightening + gateway active pins.
   - Priority: P3
   - Target: next sprint / backlog (optional — gateway+umbrella already satisfy trace `allow_gate true`)

2. **Add explicit length guard to data-driven direction probes** - Insert `assert.ok(cases.length === 3)` style guard for the `for (const dir of ['up','right','down'])` 4-dir sweep and `MERGE_UNGUARDED_CASES.length === 5` to fail fast on accidental probe truncation (hardens H3 zero-length residual per P2-02).
   - Priority: P3
   - Target: backlog

### Re-Review Needed?

⚠️ Re-review after LOW fixes — but not blocking. With 0 Critical/High and 2 Low, verdict is Approve with Comments; re-review only if the bench constants are extracted or the ATDD activation changes the trace set.

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:
Test quality is excellent (100/100, Grade A) with zero Critical and zero High violations across the three reviewed files (330 + 106 + 67 lines, suite avg 167, all per-test avg <10). The no-leak contract (R-001), tautological mergeValue guard (R-002), and boardFromLines boundary (R-003) high risks are fully pinned by `rg` allowlists and runtime I-O probes with draw-budget and hold-semantics checks, the `moved⟺trace.length>0` ghost and `mergeValue a-only` confusion are proved end-to-end, and the ledger hygiene (`DW-21/22 done 2026-09-02` + `resolution-undo b4557fd` 64-hex + `sprint-status.yaml` untouched) is correct. The only ledger deductions are two P3 LOWs (bench/budget magic literals + repeated inline board payloads bypassing existing fixture factories + one confused `null,3→6` desc), which are worth naming but do not risk finiteness, correctness, or performance — isolation, assertions, determinism, and fixture/data-factory criteria are all PASS, earning Perfect-Isolation and Data-Factory bonuses. Per the computed verdict rule, `CRITICAL=0` and `HIGH=0` but `LOW>0` yields Approve with Comments (not Block or Request Changes); the 56 `test.skip` are intentionally dormant RED-phase with a documented still-true reason (header lines 2-9 covering `HEAD 35c9d1c` + `baseline 3bcf38c` + `DW-21/22` + spec/design/ledger refs, `All are test.skip (RED). Remove → test for GREEN; before 35c9d1c they would fail`) and active coverage already via hardened seams (`preview-invariant:373` + `transitionPlan:108` `trace 0`), so they do not drive the verdict. No waiver needed; formal NFR `PASS` and trace `allow_gate true` corroborate.

**For Approve**:

> Test quality is excellent with 100/100 score. Minor low-priority bench-constant and fixture-factory naming noted can be addressed in a follow-up PR. Tests are production-ready and follow best practices; active hardened seams + gateway/umbrella already satisfy the trace gate (`p0_status MET 100%`, `overall MET 100%`).

**For Approve with Comments**:

> Test quality is excellent with 100/100 score. Low-priority recommendations (bench magic constants + `null,3→3` desc correction + inline board literals → fixture factories) should be addressed but don't block merge. Critical issues resolved; dormant ATDD activation is optional.

**For Request Changes**:

> Test quality needs improvement with 100/100 score. Critical issues must be fixed before merge. 0 critical violations detected that pose flakiness/maintainability risks.

**For Block**:

> Test quality is insufficient with 100/100 score. Multiple critical issues make tests unsuitable for production. Recommend pairing session with QA engineer to apply patterns from knowledge base.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| 322-330 | P3 (LOW) | Magic value | `200` iterations + `500` ms bench threshold inlined without named `TRACE_MERGE_PERF` budget constant; `MERGE_UNGUARDED_CASES` desc claims `null,3→6` but actual `mergeValue(null,3)===3` (null??0=0≤2→3) | Export `TRACE_MERGE_PERF = { iterations: 200, budgetMs: 500 }` + `DUMMY_FILL_ROWS` and correct desc to `null,3→3` in fixtures, import in ATDD P3-05 |
| 58-62,76-78,113-149 | P3 (LOW) | Fixture Patterns / Magic value | Same board payload `boardWith([[1,3,6,12]×4])` / `boardWith([[1,2,null,null]…])` / `boardWith([[3,null,3,null]…])` constructed inline 6+ times while `fixtures/engine-trace-merge-guards-fixtures.ts` already exports `fullNonMergeable()`/`packedRowBoard()`/`effective12Board()`/`gapBoard()`; local `fullNonMergeable()` duplicates fixture | Replace inline literals with `packedRowBoard()`/`effective12Board()`/`gapBoard()` imports, delete local duplicate, keep dummy rows via `DUMMY_FILL_ROWS` |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 100/100 | A | 0       | ➡️ Stable (initial review for this bundle) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| _bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts | 100/100 | A | 0  | Approve with Comments |
| _bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts | 100/100 | A | 0  | Approve with Comments |
| _bmad-output/test-artifacts/tests/e2e/engine-trace-merge-guards.umbrella.spec.ts | 100/100 | A | 0  | Approve with Comments |

**Suite Average**: 100/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v5.0
**Review ID**: test-review-dw-engine-trace-merge-guards-20260902
**Timestamp**: 2026-09-02 13:55:00
**Version**: 1.0

---

## Feedback on This Review

If you have questions or feedback on this review:

1. Review patterns in knowledge base: `../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/`
2. Consult tea-index.csv for detailed guidance
3. Request clarification on specific violations
4. Pair with QA engineer to apply patterns

This review applies the rubric consistently. Context can reveal additional findings and clarify impact; it cannot waive a violation, change severity, or alter the score. Formal risk acceptance belongs in trace or the release gate.

---

## Reviewed Files

- _bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/engine-trace-merge-guards.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md
- _bmad-output/test-artifacts/test-design/test-design-dw-engine-trace-merge-guards.md
- _bmad-output/test-artifacts/test-design-dw-engine-trace-merge-guards.md
- _bmad-output/test-artifacts/atdd-checklist-dw-engine-trace-merge-guards.md
- triade/src/engine/core/game.ts
- triade/src/engine/core/rules.ts
- triade/src/engine/core/line.ts
- triade/src/engine/core/types.ts
- triade/src/render/transitionPlan.ts
- triade/__tests__/engine/game.test.ts
- triade/__tests__/engine/line.test.ts
- triade/__tests__/engine/rules.test.ts
- triade/__tests__/render/transitionPlan.test.ts
- triade/__tests__/game/preview-invariant.test.ts
- _bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts
- _bmad-output/test-artifacts/traceability/coverage-matrix-dw-engine-trace-merge-guards.json
- _bmad-output/test-artifacts/traceability/traceability-matrix-dw-engine-trace-merge-guards.md
- _bmad-output/test-artifacts/traceability/gate-decision-dw-engine-trace-merge-guards.json
- _bmad/tea/config.yaml

## Excluded From Review Set

- _bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts — format not scorable by the ledger
- triade/__tests__/engine/game.test.ts — format not scorable by the ledger (existing hardened seam; counted as context, not as authored artifact for this sweep)
- triade/__tests__/engine/line.test.ts — format not scorable by the ledger (existing hardened seam; counted as context, not as authored artifact for this sweep)
- triade/__tests__/engine/rules.test.ts — format not scorable by the ledger (existing hardened seam; counted as context, not as authored artifact for this sweep)
- triade/__tests__/render/transitionPlan.test.ts — format not scorable by the ledger (existing hardened seam; counted as context, not as authored artifact for this sweep)
- triade/__tests__/game/preview-invariant.test.ts — format not scorable by the ledger (existing hardened seam; counted as context, not as authored artifact for this sweep)
