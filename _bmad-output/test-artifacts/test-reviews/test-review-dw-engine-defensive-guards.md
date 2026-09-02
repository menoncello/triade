---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments: ['_bmad-output/implementation-artifacts/spec-engine-defensive-guards.md', '_bmad-output/test-artifacts/test-design/test-design-dw-engine-defensive-guards.md', '_bmad-output/test-artifacts/atdd-checklist-dw-engine-defensive-guards.md', 'triade/src/game/matchScore.ts', 'triade/src/render/transitionPlan.ts', 'triade/src/engine/core/game.ts', 'triade/src/engine/core/types.ts', 'triade/__tests__/game/matchScore.test.ts', 'triade/__tests__/render/transitionPlan.test.ts', 'triade/__tests__/engine/game.test.ts', 'triade/test-utils/helpers.ts', 'triade/__tests__/engine/defensive-guards.atdd.test.ts', '_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts', '_bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts', '_bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts', '_bmad-output/test-artifacts/traceability/coverage-matrix-dw-engine-defensive-guards.json', '_bmad/tea/config.yaml']
---

# Test Quality Review: dw-engine-defensive-guards

**Quality Score**: 78/100 (C - Needs Improvement)
**Review Date**: 2026-09-02
**Review Scope**: directory
**Reviewer**: TEA Agent (Muse Spark)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Needs Improvement

**Recommendation**: Block

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Deterministic host-only `node:test + tsx` harness — zero hard waits, zero wall-clock fixtures, pure `applyMove`/`classify`/`sanitizePending` arithmetic with `Number.isFinite(raw)` + `raw >= 0` + `moved ? sanitized : 0` and `Array.isArray(from)` fence plus `sanitizePending` fallback `{value:1,displayRoll:0}`; 26 gateway contracts + 7 umbrella host journeys (6 journeys + metadata) + 24 ATDD red-phase scaffolds share the same 10-row I-O matrix and ledger `DW-24/30/65 done 2026-09-02` `resolution-undo f115c8c`

✅ Full defensive-guard invariant coverage: every P0 pin asserts `NaN/Infinity/-5/-0.1/"3" → 0` no `best NaN` lock, `moved:false 5 → 0` no inflation, empty `[]`/undefined/null/non-array `from → slide` no `TypeError`, valid `merge 2 / hold single==to / slide single!=to / spawn / noop []` taxonomy, `undefined pendingSpawn effective → {1,0}` fallback spawn `1` at `[0,3]`, `NaN value →1` not `NaN` tile, `NaN displayRoll →0`, draw `3/0/20` and `ADR-06` snapshot isolation pinned (DW-24/30/65 R-001/002/003 score 6)

✅ Single-predicate discipline: `Number.isFinite(raw)==1` + `raw>=0==1` + `result.moved ? sanitized==1` + `current.score+result.score==0` vs `current.score+effective==1`, `Array.isArray(from)==1` + `from.length===2==1` + `from.length===1==1` + `Array.isArray(first)==1` + `Array.isArray(to)==1` + `sameCell(first==1` vs `sameCell(entry.from[0]==0` + `entry.from.length==0`, `function sanitizePending==1` + `sanitizePending( call==2` + `safePending.value==1` + `...safePending==1` + `state.pendingSpawn.value==0` + `dr>=0&&<1==1` — all asserted via exact `rg` counts; `GRID_SIZE=4` single definition; twin `tsc` gates clean

### Key Weaknesses

❌ Two tautological assertions `assert.equal(x, 1===1 ? x : 1)` in `gateway P0-08` and `ATDD P0-08` are self-comparisons that always pass (C3 CRITICAL ×2) — the only `Critical` row in the suite, confined to one line per file but making those two probes prove the mock-like identity rather than the fallback value 1

❌ Two files exceed the 300-line ideal: `defensive-guards.atdd.test.ts` 400 lines and `engine-defensive-guards.gateway.spec.ts` 378 lines (H5 HIGH ×2) — both bundle 24/26 verifiers with extensive header docs and scan suites; threshold is absolute and fires regardless of lines-per-test average (~16.6 and ~14.5)

❌ Bench/hygiene magic literals `5000` iterations and `500` ms threshold appear without a named budget constant in gateway `[P3-03]` and fixtures `guardsBench` helper (L6 LOW ×2) — same `O(1)` `<500ms` budget duplicated at two sites without a single `ENGINE_DEFENSIVE_GUARD_PERF` export

### Summary

The `dw-engine-defensive-guards` bundle (`000b640 sweep dw-engine-defensive-guards: DW-24, DW-30, DW-65 via bmad-loop` vs baseline `266aa03`/`c7e1c51`, working-tree diff `triade/src/game/matchScore.ts:12-15` sanitized `applyMove`, `triade/src/render/transitionPlan.ts:21-43` `classify` fence, `triade/src/engine/core/game.ts:27-50,83,100` `sanitizePending` + `safePending` sites, `spawn.ts/ceiling.ts/types.ts GRID_SIZE=4` byte-identical) is a correct pure-engine hardening seam: `applyMove` O(1) `isFinite`, `classify` O(1) per `TraceEntry ≤16`, `sanitizePending` 4 checks O(1) per `move()`, budgeted `<0.01ms/op` invisible to `60FPS/<16.7ms` frame. Host verification is `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test` with `moveResult`/`effectiveBoard`/`noopBoard`/`rngOf`/`spyRng` factories + `readSrc` source-scan allowlists + 4-dir pipeline smoke + ledger `DW-24/30/65 done 2026-09-02` `resolution-undo f115c8c` + `sprint-status.yaml` untouched. All 26 gateway + 7 umbrella host verifiers pass (`170ms` and `161ms`), plus `matchScore.test.ts` 8 + `transitionPlan.test.ts` 13 + `game.test.ts` 32 stay green; full `npm --prefix triade test` `882 pass / 11 expected RED / 142 skipped ~5.6s` unchanged. Ledger deductions are 2 CRITICAL tautological + 2 HIGH oversize + 2 LOW bench magic; determinism, isolation, explicit assertions (except the two self-comparisons), network-first, fixture/data-factory, duration, and flakiness criteria are otherwise PASS. With Perfect-Isolation and Data-Factory bonuses the computed score is 78/100 (C), verdict `Block` per the derivation rule `CRITICAL>0 ⇒ Block`. Fixing the single tautological line (replace with `assert.equal(res.pendingSpawn.value, 1)`) and splitting or accepting the oversize files restores 100/100 and `Approve with Comments`. The 24 `it.skip` ATDD scaffolds are intentionally dormant RED-phase with documented header reason, so they do not add a third C1 beyond the two C3 already counted.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS (n/a) | 0    | Convention: bddNaming (absent: 0 of 40 sampled) | 0 of 40 sampled files use `Given/When/Then`; repo uses `[P0]/[P1]/E2E-0x` behavioral naming not Given/When/Then — gate absent, PASS (n/a). Gateway P0 blocks carry `// Given/When/Then` comments as exemplar but criterion is convention-driven |
| Test IDs                             | ✅ PASS (n/a) | 0    | Convention: testIds (absent: 0 of 40 sampled) | 0 of 40 sampled files use `data-testid`/`getByTestId`; no house test-id convention in pure engine tests — PASS (n/a). No DOM lookups, so L1/L3 both n/a |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: priorityMarkers (established: 26 of 40 sampled, form `[P0]` in test name) | All reviewed tests carry `[P0]`/`[P1]`/`[P2]`/`[P3]` or `E2E-0x P1` prefix matching observed form; adopted in 65% of corpus — PASS |
| Disabled or Focused Tests            | ✅ PASS | 0    | Absolute | No `.only`/`fdescribe`/`fit`/`test.only` committed. ATDD `defensive-guards.atdd.test.ts` carries 24 `it.skip` but file header (lines 11-25) documents "ATDD for dw-engine-defensive-guards — red-phase scaffolds covering working-tree delta vs baseline 266aa03 → HEAD 000b640: applyMove sanitizes NaN… classify guards… sanitizePending… Spec… Ledger DW-24/30/65" as the still-true reason on the lines above the skips; per C1 a documented, still-true reason is not a violation. Active coverage is via gateway/umbrella (26+7 pass) |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | Zero `waitForTimeout`, `sleep(`, `time.sleep(`, `Thread.sleep(`, `cy.wait(number)` across all three reviewed files + fixtures |
| Determinism (no conditionals)        | ❌ FAIL | 2    | Absolute + Applicability: file builds or asserts a time-bounded value | C3 ×2 (see Critical). No `if`/`ternary` selecting expected values, no `try/catch` swallowing failures. Loop-bounded `for (const bad of [literal]) { assert.equal }` is data-driven over fixed literals (never zero-length) — not H3. H2 wall-clock not applicable: `performance.now` bench is fixed-count with generous thresholds, not a time-bounded fixture governing expiry |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | No module-level mutable state written inside tests without `beforeEach`/`afterEach` reset; each test builds fresh `Board` via `effectiveBoard`/`noopBoard`/`emptyBoard`/`boardWith`; `pendingSpawn` probes use `{value,displayRoll}` literals via `gameState`. Fixtures export pure read-only constants `EMPTY_FROM_ENTRY` etc. — never reassigned |
| Fixture Patterns                     | ✅ PASS | 0    | Applicability: file constructs domain payloads | Boards via `effectiveBoard`/`noopBoard`/`emptyBoard` deterministic factories, `GRID_SIZE=4` single-source, `readSrc` source-scan helper in gateway/umbrella, `guardsBench`/`rngOf`/`spyRng` perf factories in fixtures; fixture file `_bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts` provides canonical `EMPTY_FROM_ENTRY`/`UNDEFINED_FROM_ENTRY`/…`HOLD_ENTRY`/`MERGE_ENTRY` + scan counters `countIsFiniteRaw`/`countArrayIsArrayFrom`/`countSanitizePendingDef` consumed via import |
| Data Factories                       | ✅ PASS | 0    | Applicability: file constructs domain payloads | Factory functions with overrides used throughout (`effectiveBoard`, `noopBoard`, `moveResult`, `gameState`, `rngOf`/`spyRng`); no hardcoded inline payload bypassing an existing factory; gateway correctly mirrors ATDD via same helpers, not inline duplication; no `@faker-js/faker` — deterministic literals only |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: file navigates and then reads data-dependent content | No `page.goto`/`cy.visit`/router push in pure engine seam — gate closed; `tea_use_playwright_utils:true` loaded but `tea_browser_automation:auto` correctly stays host-only for pure TS engine (no `fetch`/`route` race) |
| Explicit Assertions                  | ❌ FAIL | 2    | Absolute | Every test contains ≥1 explicit assertion, but 2 assertions are tautological self-comparisons (C3) — see Critical. Totals: gateway 26 tests ~84 assertions, umbrella 7 tests ~38 assertions, ATDD 24 dormant tests ~92 assertions when activated |
| Test Length (≤300 lines)             | ❌ FAIL | 2    | Absolute | `defensive-guards.atdd.test.ts` 400 lines, `engine-defensive-guards.gateway.spec.ts` 378 lines exceed 300; `engine-defensive-guards.umbrella.spec.ts` 209 lines and `fixtures` 238 lines are within limit. H5 HIGH fires per file >300 |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | Each file runs <1.5 min host (`gateway 26 tests ~170ms`, `umbrella 7 tests ~161ms`, `ATDD 24 skip ~25ms dormant / ~190ms activated`; `npm --prefix triade test` full host `882 pass / 11 RED waivers ~5.6s`) — well under target. Bench 5k loops are proxy complexity O(1) per guard, not wall-clock governed |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute | Zero tight timeouts (`{timeout:1000}`), race conditions, timing-dependent assertions, retry logic, or environment-dependent assumptions; `performance.now()` micro-bench is deterministic fixed-count with generous `500ms` for 5k×3 guards, not a wall-clock fixture; statistical gates use deterministic literals, not `Math.random` in assertions |

**Total Violations**: 2 Critical, 2 High, 0 Medium, 2 Low

**Convention Baseline**: 40 test files sampled outside the review set of 105 triade corpus files (capped at 40 closest-first by directory distance from reviewed files, per step-02 sampling rules). `priorityMarkers: 26/40 established [P#]`, `testIds: 0/40 absent`, `bddNaming: 0/40 absent`, `networkFirst: 0/40 absent` (pure engine, no `interceptNetworkCall` in sampled host tests), `dataFactories: 22/40 emerging boardWith/emptyBoard`, `fixtures: 20/40 emerging fixture helpers`, `assertionStyle: 38/40 established (assert)`; `unknown` never applied (sampled ≥4).

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -2 × 10 = -20
High Violations:         -2 × 5 = -10
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

Final Score:             78/100
Grade:                   C
```

---

## Critical Issues (Must Fix)

### 1. Tautological assertion — self-comparison via `1 === 1 ? x : 1` (C3 CRITICAL)

**Severity**: P0 (Critical)
**Location**: `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:152`, `triade/__tests__/engine/defensive-guards.atdd.test.ts:152`
**Row**: C3
**Criterion**: Explicit Assertions (Tautological assertion) / Determinism
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
`assert.equal(res.pendingSpawn.value, 1 === 1 ? res.pendingSpawn.value : 1)` compares `res.pendingSpawn.value` to itself. `1 === 1` is a literal `true`, so the ternary always selects the first branch, yielding `assert.equal(x, x)` — an assertion that cannot fail regardless of `x`. The test therefore proves the ternary operator works, not that `sanitizePending(undefined)` returned the fallback `1`. The probe `P0-08 undefined effective → fallback 1` still passes via neighboring `assert.equal(res.board[0][3], 1)` and `Number.isFinite` checks, but this one line is vacuous and inflates the assertion count without evidence.

**Current Code**:

```typescript
// ❌ Bad (current — self-comparison, always passes)
assert.equal(res.pendingSpawn.value, 1 === 1 ? res.pendingSpawn.value : 1); // finite>0
```

**Recommended Fix**:

```typescript
// ✅ Good (assert the fallback value 1, or the invariant that value is finite >0)
assert.equal(res.pendingSpawn.value, 1);
// or, if the intent is finiteness not literal 1:
// assert.ok(Number.isFinite(res.pendingSpawn.value) && res.pendingSpawn.value > 0);
// ATDD sibling: same fix at triade/__tests__/engine/defensive-guards.atdd.test.ts:152
```

**Why This Matters**:
A tautological assertion is worse than a missing assertion: the suite reports green while the line never exercises the system under test. In a hardening seam that guards `NaN` placement, a vacuous `pendingSpawn` check could hide a regression where `sanitizePending` returned `NaN` or `0` and the `board[0][3]` pin was later weakened.

**Related Violations**:
`triade/__tests__/engine/defensive-guards.atdd.test.ts:152` — identical line in the dormant ATDD scaffold (same fix when activating `it.skip → it`).

---

### 2. Duplicate occurrence of the same tautology in the dormant ATDD scaffold (C3 CRITICAL)

**Severity**: P0 (Critical)
**Location**: `triade/__tests__/engine/defensive-guards.atdd.test.ts:152`
**Row**: C3
**Criterion**: Explicit Assertions
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Identical `1 === 1` self-comparison as above. Because the ATDD file is currently `it.skip` (RED-phase dormant), the tautology does not execute today, but it will become a live defect when the 24 scaffolds are activated (`it.skip → it`) for the formal ATDD gate. Fixing it now keeps the dormant and active suites consistent.

**Current Code**: same as above

**Recommended Fix**: same as above — replace with `assert.equal(res.pendingSpawn.value, 1);`

**Why This Matters**: Dormant defects become live defects on activation; aligning both files avoids a future trace `COLLECTED → FAIL` on an otherwise pure fix.

---

## Recommendations (Should Fix)

### 1. Oversize test file — split or accept with rationale (H5 HIGH)

**Severity**: P1 (High)
**Location**: `triade/__tests__/engine/defensive-guards.atdd.test.ts:1` (400 lines), `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:1` (378 lines)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Both files exceed the `≤300 lines ideal` threshold (`test-quality.md`). The overage is not due to long individual tests (avg `16.6` and `14.5` lines/test are healthy) but to bundling 24 and 26 verifiers plus extensive header docs (`Spec:` + `Design:` + `Fixtures:` + `Execute:`) and P2 static-scan suites inside one file. Length itself does not cause flakiness here, but it raises review cost and encourages future unrelated probes to land in the same file.

**Current Code**:

```typescript
// ⚠️ 400-line ATDD + 378-line gateway in one file each
// triade/__tests__/engine/defensive-guards.atdd.test.ts — 4 describes, 24 it.skip
// _bmad-output/.../engine-defensive-guards.gateway.spec.ts — 4 describes, 26 it
```

**Recommended Improvement**:

```typescript
// ✅ Option A — accept with rationale (lowest churn, mirrors ceiling bundle precedent)
// Keep the two files as the authored artifacts for this sweep; rely on lines-per-test
// (≈15) and `describe` grouping as the maintainability signal. Record acceptance:
// "H5 is acknowledged; file groups all DW-24/30/65 seams together per the 10-row I-O
//  matrix — splitting would duplicate header docs and fixture imports."

// ✅ Option B — split by seam (if the team prefers strict ≤300)
// triade/__tests__/engine/defensive-guards.atdd.test.ts →
//   defensive-guards.matchScore.atdd.test.ts (DW-24, 11 tests, ~150 lines)
//   defensive-guards.transitionPlan.atdd.test.ts (DW-30, 6 tests, ~110 lines)
//   defensive-guards.game.atdd.test.ts (DW-65, 7 tests, ~140 lines)
// _bmad-output/.../gateway.spec.ts → gateway.matchScore.spec.ts + gateway.transitionPlan.spec.ts + gateway.game.spec.ts
```

**Benefits**: Option B returns both files to ≤200 lines and makes `git log --follow` per seam useful; Option A preserves the single-bundle trace contiguity the spec and test-design rely on.

**Priority**: P1 — high per registry (file-level), but accept-or-split is a style decision, not a correctness blocker once the C3 above is fixed. Re-score after either choice yields 88/100 (if accepted, H5 waived via `trace` or release gate) or 100/100 (if split).

---

### 2. Bench/hygiene magic literals — extract named budget constants (L6 LOW)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:364-368`, `_bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts:219-229`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The hygiene bench pins use inline numeric literals `5000` (iterations) and `500` ms (budget) with only a trailing comment `// 5000×3 guards <500ms`. A reader changing the perf budget must hunt two sites (gateway `[P3-03]` + fixtures `guardsBench` helper). The numbers carry domain meaning (frame budget `<0.01ms/op`) but are unnamed — a future drift to `300` or `700` would not be caught as a contract change.

**Current Code**:

```typescript
// ⚠️ Could be improved (current — inline magic)
const t0 = performance.now();
for (let i = 0; i < 5000; i++) {
  applyMove({ score: 10, best: 20 }, moveResult(NaN, true));
  planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [EMPTY_FROM_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
  move({ board: b, pendingSpawn: undefined as any }, 'left', rngOf(0, 0.5, 0.2));
}
assert.ok(performance.now() - t0 < 500, '5000×3 guards <500ms');
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
import { ENGINE_DEFENSIVE_GUARD_PERF, guardsBench } from '../fixtures/engine-defensive-guards-fixtures.ts';
// fixtures.ts: export const ENGINE_DEFENSIVE_GUARD_PERF = { iterations: 5_000, budgetMs: 500 } as const;
const { iterations, budgetMs } = ENGINE_DEFENSIVE_GUARD_PERF;
const bench = guardsBench(iterations);
assert.ok(bench.elapsed < budgetMs, `5000×3 guards <${budgetMs}ms got ${bench.elapsed}ms`);

// or in fixtures.ts:
export const ENGINE_DEFENSIVE_GUARD_PERF = { iterations: 5_000, budgetMs: 500 } as const;
export function guardsBench(iterations = ENGINE_DEFENSIVE_GUARD_PERF.iterations) { /* ... */ assert.ok(elapsed < ENGINE_DEFENSIVE_GUARD_PERF.budgetMs) }
```

**Benefits**: Single budget truth mirrors the single-source `GRID_SIZE=4` and `sanitizePending` discipline already pinned; NFR `Performance Assessment` can cite the exported budget rather than re-deriving `0.0035ms/op`.

**Priority**: P3 — low, not blocking. Fix when touching bench or extracting shared `ENGINE_DEFENSIVE_GUARD_PERF`.

---

### 3. Data-driven loop without explicit length guard — document zero-length invariant (informational, no deduction)

**Severity**: P3 (Low, informational)
**Location**: `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:79,109,342,346,364`, `_bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts:69,135,178`, `triade/__tests__/engine/defensive-guards.atdd.test.ts:82,116,358`
**Row**: H3 (informational)
**Criterion**: Determinism (no conditionals)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Probes assert inside `for (const bad of [Infinity, -Infinity, -5, -0.1]) { assert.equal(...) }` and `for (const entry of [UNDEFINED_FROM_ENTRY,…]) { assert.equal(plan[0].type,'slide') }`. The loop is the idiomatic data-driven form, but H3 fires when the iterated array could be zero-length and the assertion silently never executes (green suite proving nothing). Here each `cases` array is a literal 4- or 7-element array so the probe cannot be zero-length today; the risk is a future edit that empties the array.

**Current Code**:

```typescript
// ⚠️ Idiomatic but zero-length sensitive (current)
for (const bad of [Infinity, -Infinity, -5, -0.1]) {
  const r = applyMove({ score: 10, best: 20 }, moveResult(bad as number, true));
  assert.equal(r.score, 10, `bad score ${String(bad)} should be 0`);
}
```

**Recommended Improvement**:

```typescript
// ✅ Explicit guard preserves data-driven form (recommended)
const badScores = [Infinity, -Infinity, -5, -0.1] as const;
assert.ok(badScores.length === 4, `badScores probe must cover 4 rows`);
for (const bad of badScores) {
  const r = applyMove({ score: 10, best: 20 }, moveResult(bad as number, true));
  assert.equal(r.score, 10, `bad score ${String(bad)} should be 0`);
}
```

**Benefits**: Keeps the compact probe while pinning the "loop did execute" invariant; a zero-case regression fails fast rather than silently green.

**Priority**: P3 — no deduction today (probe is non-empty literal), hardening for future edits.

---

## Best Practices Found

### 1. Defensive-guard + scan-allowlist + ledger triple — exemplar pure-engine hardening

**Location**: `triade/__tests__/engine/defensive-guards.atdd.test.ts:306-338`, `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:285-331`
**Pattern**: Defensive guards + closed scan ownership
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md), [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**: Each P0 pin pairs the production guard (`typeof raw==='number' && isFinite && >=0`, `Array.isArray(from)` fence with `from.length===2 merge` + `from.length===1 hold` + `Array.isArray(first/to)` + `typeof number` + `sameCell`, `sanitizePending` `!raw||typeof!=='object' → {1,0}` + `safeValue >0` + `safeDisplay [0,1)` + `safePending.value` + `...safePending`) with its pre-fix failure mode in a comment ("Before fix: `current.score + NaN → NaN` then `Math.max(20,NaN)→NaN`") and proves finiteness on the result. The `rg` allowlists pin ownership with exact counts (`Number.isFinite(raw)==1`, `Array.isArray(from)==1`, `function sanitizePending==1`, `state.pendingSpawn.value==0`) so a duplicate guard or reintroduced bare `entry.from[0]` fails the PR gate without running the engine.

**Code Example**:

```typescript
// ✅ Excellent pattern — guard + finiteness + pre-fix note
it.skip('[P0-01] DW-24 applyMove NaN moved:true stays 10,20 no NaN poison', () => {
  // Before fix: current.score + NaN → NaN then Math.max(20,NaN)→NaN (both poisoned forever).
  const result = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: NaN, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
  assert.equal(result.score, 10);
  assert.equal(result.best, 20);
  assert.ok(Number.isFinite(result.score));
  assert.ok(Number.isFinite(result.best));
});
```

**Use as Reference**: Reuse this guard+scan+ledger triple when hardening sibling engine seams (`spawn` cloneBoard, `line` compaction, `ceiling` tile filter).

### 2. Host-only gateway + umbrella as E2E — correct test-level assignment per framework

**Location**: `_bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts:1-21`, `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:1-24`
**Pattern**: Test levels framework
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md), [selective-testing.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)

**Why This Is Good**: Pure arithmetic (`applyMove` O(1) `isFinite`, `classify` O(1) per entry ≤16, `sanitizePending` 4 checks O(1) per `move()`) is exercised host-only via `node:test + tsx` with no Playwright `page.goto`/`page.locator` — correctly classified as `Unit`/`API gateway` dominance per framework, not as device E2E. The umbrella documents the six `E2E_JOURNEYS` (score-journey, tile-plan, spawn-journey, ledger-closed, static-allowlist, ragged+bench) as traceable journeys whose host verifiers (`gateway [P0][P1][P2]`) are the actual gate; `device: 'N/A — host never-throw sweep is the E2E gate'` is explicit and matches NFR `device p99 <16.7ms` `PASS` without a simulator.

**Code Example**:

```typescript
// ✅ Correct level — host E2E documents journey but executes via engine seam
const E2E_JOURNEYS = [
  { id: 'E2E-01', priority: 'P1', title: 'Score journey never poisons: NaN/Infinity/-5 floored + noop 5→0 + float kept', risk: 'R-001' },
  { id: 'E2E-02', priority: 'P1', title: 'Tile plan never throws: empty/malformed from → slide + valid merge/hold/spawn + moved:false []', risk: 'R-002' },
  // hostGate: gateway [P0][P1] smoke + manual probe 5-log single command
];
```

**Use as Reference**: Pattern for any future `triade/src/engine/core/*` or `src/game/*` hardening: `triade/__tests__/**.atdd.test.ts` (red scaffolds) + `_bmad-output/test-artifacts/tests/api/*.gateway.spec.ts` (contracts) + `tests/e2e/*.umbrella.spec.ts` (host journeys) without a browser/device lane.

### 3. Source-scan allowlists as regression pins — single-predicate ownership

**Location**: `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:285-331`, `_bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts:22-136`
**Pattern**: Fixture architecture + selective testing
**Knowledge Base**: [fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md), [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Why This Is Good**: Five allowlist specs pin the defensive-guard ownership with exact counts (`Number.isFinite(raw)==1` + `raw>=0==1` + `result.moved ? sanitized==1` + `current.score+result.score==0` vs `current.score+effective==1`, `Array.isArray(from)==1` + `from.length===2==1` + `sameCell(first==1` vs `sameCell(entry.from[0]==0`, `function sanitizePending==1` + `safePending.value==1` + `...safePending==1` + `state.pendingSpawn.value==0`) plus ledger `DW-24/30/65 done 2026-09-02` and `sprint-status.yaml` untouched — a duplicate guard or reintroduced bare deref fails the PR gate without running the engine. Fixture centralizes the fourteen `count*` helpers and `EMPTY_FROM_ENTRY`/`MERGE_ENTRY`/… constants plus `BAD_SCORES`/`BAD_PENDING_VALUES` factories so ATDD, gateway, and umbrella share the same probe truth; `GRID_SIZE=4` single definition is also pinned.

**Code Example**:

```typescript
// ✅ Single-predicate pin — duplicate guard would fail this gate
it('[P2-03] SCAN game single sanitizePending + safePending sites + no bare (R-003)', () => {
  const codeOnly = s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal((codeOnly.match(/function sanitizePending/g) ?? []).length, 1);
  assert.equal((codeOnly.match(/safePending\.value/g) ?? []).length, 1);
  assert.equal((codeOnly.match(/state\.pendingSpawn\.value/g) ?? []).length, 0);
});
```

**Use as Reference**: Extend the `rg -n` allowlist pattern when adding new defensive predicates; keep at most one ownership site per guard.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/engine/defensive-guards.atdd.test.ts`
- **File Size**: 400 lines, 13.5 KB
- **Test Framework**: node:test (tsx)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts`
- **File Size**: 378 lines, 14.8 KB
- **Test Framework**: node:test (tsx)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts`
- **File Size**: 209 lines, 9.2 KB
- **Test Framework**: node:test (tsx)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts`
- **File Size**: 238 lines, 9.5 KB
- **Test Framework**: N/A (fixture module)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 4 (ATDD: P0/P1/P2/P3) + 4 (gateway: P0/P1/P2/P3) + 2 (umbrella: journeys + trace metadata)
- **Test Cases (it/test)**: 24 (ATDD, all `it.skip` red-phase) + 26 (gateway) + 7 (umbrella) = 57 (33 active host verifiers + 24 dormant)
- **Average Test Length**: 13.2 lines per ATDD scaffold, 11.8 lines per gateway test, 18.5 lines per umbrella journey verifier
- **Fixtures Used**: 7 (`emptyBoard`, `boardWith`, `gameState`, `rngOf`, `spyRng`, `effectiveBoard`/`noopBoard` board factories, `EMPTY_FROM_ENTRY`/`MERGE_ENTRY`/… trace entry fixtures)
- **Data Factories Used**: 5 (`moveResult`/`gameState` board factories, `rngOf`/`spyRng` rng factories, `readSrc` source-scan factory, `guardsBench` perf factory, `BAD_SCORES`/`BAD_PENDING_VALUES` boundary factories)

### Test Scope

- **Test IDs**: `P0-01..11`, `P1-01..06`, `P2-01..04`, `P3-01..03` (ATDD) mirrored as `[P0-01]`..`[P3-03]` in gateway and `E2E-01..06` in umbrella
- **Priority Distribution**:
  - P0 (Critical): 11 tests (ATDD) + 12 gateway P0 pins + 0 umbrella P0 (umbrella journeys are P1) — note gateway `P0-12` manual probe covers the 5-log Verification command
  - P1 (High): 6 tests (ATDD) + 6 gateway P1 + 3 umbrella E2E-01/02/03
  - P2 (Medium): 4 tests (ATDD) + 5 gateway P2 + 1 umbrella E2E-05
  - P3 (Low): 3 tests (ATDD) + 3 gateway P3 + 2 umbrella E2E-06 + metadata
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~122 active (gateway ~84 with `assert.equal`/`deepStrictEqual`/`ok`/`doesNotThrow`/`match`, umbrella ~38 with same) + 92 dormant ATDD (214 total when activated)
- **Assertions per Test**: 3.2 avg active (gateway 3.2, umbrella 5.4, ATDD 3.8 dormant)
- **Assertion Types**: `assert.equal`, `assert.deepStrictEqual`, `assert.ok` (including `Number.isFinite`/`isFinite` finiteness), `assert.doesNotThrow`, `assert.match` (ledger 64-hex), `performance.now` bench `assert.ok(elapsed < 500)`, `assert.throws` none (never-throw seam)

---

## Context and Integration

### What the Context Said

The PR context is the implemented hardening (`pr_diff`): `triade/src/game/matchScore.ts:12-15` adds `const raw = result.score; const sanitized = typeof raw==='number' && Number.isFinite(raw) && raw>=0 ? raw:0; const effective = result.moved ? sanitized : 0; const score = current.score + effective; best = Math.max(current.best, score)` replacing `current.score + result.score`; `triade/src/render/transitionPlan.ts:21-43` adds `const from = (entry as unknown...).from; if (!Array.isArray(from)) return 'slide'; if (from.length===2) return 'merge'; if (from.length===1) { first/to Array.isArray + typeof number + sameCell } return 'slide'` replacing bare `entry.from.length===2`/`sameCell(entry.from[0],entry.to)` derefs; `triade/src/engine/core/game.ts:27-50,83,100` adds `function sanitizePending(raw:unknown):PendingSpawn` fallback `{value:1,displayRoll:0}` + `safeValue typeof v==='number'&&isFinite&&v>0 ? v:1` + `safeDisplay >=0&&<1 ? dr:0` + `const safePending = sanitizePending(...)` + `spawnTile(...,safePending.value)` + `pendingSpawn = {...safePending}` replacing bare `state.pendingSpawn.value` / `{...state.pendingSpawn}`. Spec `spec-engine-defensive-guards.md` defines 10-row I-O matrix plus 5 ACs with `baseline 266aa03 → final c7e1c51` → HEAD `000b640` and `status: done` `Auto Run Result done`; test-design `test-design-dw-engine-defensive-guards.md` maps 10 risks (3 high R-001 score poison/NaN lock score 6, R-002 classify deref score 6, R-003 pendingSpawn undefined/NaN score 6) to P0 17 checks / P1 63 / P2 5 / P3 5 with host `node:test + tsx` execution `<15 min` no device. Context raised no new finding beyond the ledger: every AC is exercised by at least one `[P0]` gateway pin and one `E2E-0x` journey step; every high risk has a `rg` allowlist plus a runtime pin (e.g. R-001 `Number.isFinite(raw)==1` + `applyMove(NaN)→10,20` finiteness; R-002 `Array.isArray(from)==1` + `planTileTransitions(emptyBoard,{from:[],spawned:false})→slide`; R-003 `function sanitizePending==1` + `move(undefined)→{1,0}` no throw). The ledger `DW-24/30/65 done 2026-09-02` with `resolution-undo f115c8c 64-hex` matches the `git diff HEAD --stat` prod touch (3-file `matchScore.ts` + `transitionPlan.ts` + `game.ts`) plus `_bmad-output` ledger/spec/test-design/gateway/umbrella/fixtures/coverage/gate/trace; orchestrator file `sprint-status.yaml` is correctly untouched. Context therefore clarifies impact: a bare `current.score + result.score` reintroduction would re-poison `best` to `NaN` and lock it, a bare `entry.from[0]` deref would crash `planTileTransitions` on `from:[]`, and a bare `state.pendingSpawn.value` would throw on `undefined` or place `NaN` tile silently ignored by `ceilingDetector` — all high-value `rg` pins. Context is untrusted prose — it cannot waive the two CRITICAL C3 or two HIGH H5 or two LOW L6 findings above; they remain and the score stays 78/100 `Block`; formal risk acceptance for length would belong in `trace` or the release gate, not as a context waiver.

### Related Artifacts

- **Story File**: `_bmad-output/implementation-artifacts/spec-engine-defensive-guards.md` (intent contract, 10-row I-O matrix, 5 ACs, Code Map, Tasks & Acceptance)
- **Test Design**: `_bmad-output/test-artifacts/test-design/test-design-dw-engine-defensive-guards.md` — 10 risks, P0-P3 framework, NFR Planning `R-011 bench` `O(1) <0.01ms`, selective-testing host strategy
- **Risk Assessment**: R-001/R-002/R-003 high (score 6) mitigated GREEN via allowlists + runtime pins; R-004 negative-score floor score 3, R-005 hold-vs-slide gate score 4, R-006 zero-value fallback score 3, R-007 draw-budget score 3, R-008 ADR-06 isolation score 3, R-009/R-010 residual informational score 2, R-011 guard cost score 1, R-012 ledger score 2 all PASS
- **Priority Framework**: P0/P1/P2/P3 applied per established `[P#]` repo convention (26/40)

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern (read via emptyBoard/effectiveBoard/mergeTests analog `readSrc` + `guardsBench`)
- **[test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness (host `node:test` classified as Unit-dominated/API gateway per engine seam)
- **[data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup (moveResult/gameState/rngOf/spyRng/boardWith factories)
- **[selective-testing.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)** - Duplicate coverage detection (source-scan `rg` allowlists as single-predicate ownership)
- **[test-healing-patterns.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-healing-patterns.md)** - Self-healing selector discipline (N/A host — no selector resilience needed, but pattern mirrored via `Number.isFinite` robustness)
- **[selector-resilience.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selector-resilience.md)** - Role/label/test-id locator resilience (N/A — no DOM, cited as absent convention)
- **[timing-debugging.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/timing-debugging.md)** - No hard waits / deterministic bench (`performance.now` fixed-count, not wall-clock fixture)
- **[ci-burn-in.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/ci-burn-in.md)** - Flakiness burn-in pattern (referenced contrastively: host bench uses deterministic 5k loop, not burn-in loop)

For coverage mapping, consult `trace` workflow outputs (`traceability/coverage-matrix-dw-engine-defensive-guards.json`, `traceability/traceability-matrix-dw-engine-defensive-guards.md`).

See [tea-index.csv](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Fix tautological `1===1 ? x : 1` self-comparison (C3 CRITICAL)** - Replace `assert.equal(res.pendingSpawn.value, 1 === 1 ? res.pendingSpawn.value : 1)` with `assert.equal(res.pendingSpawn.value, 1)` in gateway `P0-08` (line 152) and ATDD `P0-08` (line 152); re-run `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test gateway.spec.ts` to confirm 26 pass still.
   - Priority: P0
   - Owner: engine owner
   - Estimated Effort: 5 min

2. **Split or accept H5 oversize files** - Either extract a third scan/spec file to return `gateway 378→<300` and `ATDD 400→<300` (Option B split by DW-24/30/65 seam) or record `H5 accepted: bundle groups 3 seams per I-O matrix` at the trace gate (Option A). If split, move `[P2] SCAN` suites into `engine-defensive-guards.scan.spec.ts`.
   - Priority: P1
   - Owner: QA / engine owner
   - Estimated Effort: 30 min (split) or 5 min (accept with trace waiver)

3. **Name the bench budget constant (L6 LOW)** - Export `ENGINE_DEFENSIVE_GUARD_PERF = { iterations: 5_000, budgetMs: 500 }` from fixtures and import in gateway `P3-03` / umbrella `E2E-06`; or explicitly accept inline `5000/500`.
   - Priority: P3
   - Owner: engine owner
   - Estimated Effort: 10 min

### Follow-up Actions (Future PRs)

1. **Activate ATDD red-phase scaffolds when formal ATDD gate is desired** - Flip `it.skip→it` in `defensive-guards.atdd.test.ts` (24 pins); expectation is 24 additional green with no prod change after the C3 fix, closing the dormant trace set per `coverage-matrix-dw-engine-defensive-guards.json` `overall MET 100%`.
   - Priority: P3
   - Target: next sprint / backlog (optional — gateway+umbrella 33 active already satisfy `gate-decision-dw-engine-defensive-guards.json` `p0_status MET`)

2. **Add explicit length guard to data-driven loops** - Insert `assert.ok(badScores.length===4)` and `assert.ok(entries.length===4)` in gateway `[P0-02]/[P0-06]` and umbrella `E2E-01/02` to fail fast on accidental probe truncation (hardens H3 zero-length residual).
   - Priority: P3
   - Target: backlog

### Re-Review Needed?

❌ Major fixes required before merge — the `Block` verdict is driven by 2 CRITICAL tautological assertions. After replacing `1===1 ? x : 1` with `x===1`, the computed verdict would fall to `Request Changes` (2 HIGH remain for length) or `Approve with Comments` (if length is accepted at trace). A 5-minute fix plus a re-run of the 33 active host verifiers is the fastest path to `Approve`.

---

## Decision

**Recommendation**: Block

**Rationale**:
Test quality is `78/100 (C)` with 2 CRITICAL tautological self-comparisons, 2 HIGH oversize files, and 2 LOW bench-magic constants. The defensive-guard suite (R-001/002/003 high risks) is otherwise fully pinned by `rg` allowlists and runtime I-O probes with finiteness guards, the `NaN/Infinity/-5` + `moved:false` + `from:[]/undefined` + `pendingSpawn undefined/NaN→{1,0}` invariants are proved end-to-end, and ledger hygiene (`DW-24/30/65 done` + `resolution-undo 64-hex f115c8c` + `sprint-status.yaml` untouched) is correct. The deductions are narrowly scoped: one tautological line duplicated across gateway and ATDD (fix is one literal) plus file-length overage (≈78 lines over ideal) averaging 14-16 lines/test, not a systemic flakiness or isolation failure — isolation, determinism (except the single self-compare), fixture/data-factory, network-first, duration, and flakiness criteria are all PASS, earning Data-Factory and Perfect-Isolation bonuses. Per the computed verdict rule, `CRITICAL>0 ⇒ Block` regardless of the otherwise high coverage; removing the self-comparison alone lifts the score to `88/100 (B)` and the verdict to `Request Changes`, and accepting or splitting the length returns to `100/100 (A)` `Approve with Comments`. No waiver past the computed verdict is valid here; formal risk acceptance for length would be recorded in `trace` or the release gate.

**For Approve**:

> Test quality is excellent with 100/100 score. Minor low-priority bench-constant naming noted can be addressed in a follow-up PR. Tests are production-ready and follow best practices; active gateway/umbrella coverage already satisfies the trace gate (`p0_status MET 100%`, `overall MET 100%`).

**For Approve with Comments**:

> Test quality is acceptable with 88/100 score. Low-priority recommendations (bench magic constants, optional loop length guard) should be addressed but don't block merge once the tautological line is fixed. Critical issues resolved; dormant ATDD activation is optional.

**For Request Changes**:

> Test quality needs improvement with 88/100 score. Two HIGH oversize files should be split or explicitly accepted at the trace gate before merge. The 2 CRITICAL tautological assertions must be fixed first; after that fix the computed verdict falls from Block to Request Changes.

**For Block**:

> Test quality is insufficient with 78/100 score. One tautological assertion duplicated across gateway and ATDD makes a P0 probe prove nothing — a committed self-comparison is not a suggestion. Fix `assert.equal(x, 1===1 ? x : 1)` → `assert.equal(x, 1)` (5 min) and decide on the H5 split/accept, then re-review. Recommend pairing with QA engineer to apply `test-quality.md` C3 and H5 patterns.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:152` | P0 (CRITICAL) | Tautological assertion (C3) | `assert.equal(x, 1===1 ? x : 1)` self-compare always true branch | Replace with `assert.equal(res.pendingSpawn.value, 1)` |
| `triade/__tests__/engine/defensive-guards.atdd.test.ts:152` | P0 (CRITICAL) | Tautological assertion (C3) | Same `1===1 ? x : 1` tautology in dormant ATDD scaffold (will be live on `it.skip→it`) | Same fix as above |
| `triade/__tests__/engine/defensive-guards.atdd.test.ts:1` | P1 (HIGH) | Oversize file (H5) | 400 lines >300 ideal (24 tests + header docs) | Split by DW seam (matchScore/transitionPlan/game) or accept at trace gate |
| `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:1` | P1 (HIGH) | Oversize file (H5) | 378 lines >300 ideal (26 tests + scan suites) | Split into `gateway.matchScore/transitionPlan/game` or accept at trace gate |
| `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts:364` | P3 (LOW) | Magic value (L6) | `5000` iterations + `500` ms bench thresholds inlined without named budget | Extract `ENGINE_DEFENSIVE_GUARD_PERF = {iterations:5_000,budgetMs:500}` into fixtures |
| `_bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts:219` | P3 (LOW) | Magic value (L6) | Same bench magic `5000`/`500` in `guardsBench` helper without single exported budget | Export `ENGINE_DEFENSIVE_GUARD_PERF` alongside `guardsBench` |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 78/100 | C | 2       | ➡️ Stable (initial review for this bundle) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| triade/__tests__/engine/defensive-guards.atdd.test.ts | 78/100 | C | 1  | Block (shares C3 + H5) |
| _bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts | 78/100 | C | 1  | Block (C3 + H5 + L6) |
| _bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts | 98/100 | A | 0  | Approve with Comments (only L6-adjacent bench 17ms; length 209 PASS) |

**Suite Average**: 84/100 (B) — active gateway+umbrella 88 avg, dormant ATDD lowers to 78; after C3 fix suite recomputes to 92/100 (A–B).

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v5.0
**Review ID**: test-review-dw-engine-defensive-guards-20260902
**Timestamp**: 2026-09-02
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

- triade/__tests__/engine/defensive-guards.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-engine-defensive-guards.md
- _bmad-output/test-artifacts/test-design/test-design-dw-engine-defensive-guards.md
- _bmad-output/test-artifacts/atdd-checklist-dw-engine-defensive-guards.md
- triade/src/game/matchScore.ts
- triade/src/render/transitionPlan.ts
- triade/src/engine/core/game.ts
- triade/src/engine/core/types.ts
- triade/__tests__/game/matchScore.test.ts
- triade/__tests__/render/transitionPlan.test.ts
- triade/__tests__/engine/game.test.ts
- triade/test-utils/helpers.ts
- _bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts
- _bmad-output/test-artifacts/traceability/coverage-matrix-dw-engine-defensive-guards.json
- _bmad-output/test-artifacts/traceability/traceability-matrix-dw-engine-defensive-guards.md
- _bmad-output/test-artifacts/traceability/gate-decision-dw-engine-defensive-guards.json
- _bmad/tea/config.yaml

## Excluded From Review Set

- _bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts — format not scorable by the ledger (fixture module; counted only for L6 magic-value observation, not as a test file)
- triade/__tests__/game/matchScore.test.ts — format not scorable by the ledger (existing hardened seam; counted as context, not as authored artifact for this sweep)
- triade/__tests__/render/transitionPlan.test.ts — format not scorable by the ledger (existing hardened seam; counted as context)
- triade/__tests__/engine/game.test.ts — format not scorable by the ledger (existing hardened seam; counted as context)
- _bmad-output/test-artifacts/tests/api/engine-ceiling-hardening.gateway.spec.ts — path does not exist in this review set (belongs to parallel sweep dw-engine-ceiling-hardening)
- _bmad-output/test-artifacts/tests/e2e/engine-ceiling-hardening.umbrella.spec.ts — path does not exist in this review set (belongs to parallel sweep)
- _bmad-output/test-artifacts/tests/api/engine-spawn-mutation-hygiene.gateway.spec.ts — path does not exist in this review set (belongs to parallel sweep)
- _bmad-output/test-artifacts/tests/e2e/engine-spawn-mutation-hygiene.umbrella.spec.ts — path does not exist in this review set (belongs to parallel sweep)
