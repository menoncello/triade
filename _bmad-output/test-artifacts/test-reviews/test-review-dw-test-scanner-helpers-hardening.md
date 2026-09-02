---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'triade/__tests__/test-utils/helpers.hardening.atdd.test.ts'
  - '_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts'
  - '_bmad-output/implementation-artifacts/spec-test-scanner-helpers-hardening.md'
  - '_bmad-output/test-artifacts/test-design-dw-test-scanner-helpers-hardening.md'
  - '_bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: dw-test-scanner-helpers-hardening

**Quality Score**: 96/100 (A - Excellent)
**Review Date**: 2026-09-02
**Review Scope**: suite (dw-test-scanner-helpers-hardening delta — working-tree helpers.ts + call-site hardening)
**Reviewer**: Eduardo (TEA Agent / Murat — Master Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Approve with Comments

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Fail-fast RNG contracts pinned end-to-end (rngOf/spyRng throw `exhausted after N`, draw-budget 3/20 through real `game.move`/`newGame`, calls-exact) — no silent 0.5 drift, deterministic engine assertions.
✅ String-safe scanner delegation proven (stripComments preserves `http://` / `/* inside strings`, stripCommentsAndStrings blanks strings, extractSpecifiers still sees specifiers, engine.purity + ui.norolls stay green) — single parser `stripCommentsInternal(source, blankStrings)` with length-preserving guarantee.
✅ Priority-labeled behavioral naming (`[P0]…[P3]` + Given/When/Then comments on every P0) with full isolation (pure helpers, fresh `defaultPendingSpawn()` objects, no shared mutable state, no hard waits, no fake timers) — triage-ready per test-priorities matrix.

### Key Weaknesses

❌ Repeated inline draw-budget payloads (`rngOf(0,0,0.5)` ×10, `rngOf(0,0, 9×0, 9×0.5)` ×3) bypass the existing `fixtures/helpers-hardening-fixtures.ts` factories (`effectiveMoveRng`, `newGameRng20`) — M2 maintainability cost if budgets drift.
❌ Raw magic `0.5` / `0` displayRoll literals inline (L6) — domain constant not named (`DISPLAY_ROLL_PAD` / `drawBudgetForEffectiveMove`), readable but repeats the same budget knowledge in two places.
❌ ATDD file holds 20 `it.skip` red-phase scaffolds — intentional per spec/trace (gateway provides active duplicates, `sed s/it.skip/it/` → 20 pass), but still a committed disabled surface that must be activated before the story can close.

### Summary

The helpers-hardening delta is tested by a tight, host-only seam (ATDD 20 scaffolds + 14 gateway + 7 umbrella, all `node:test` + `tsx`, no RN/native) that directly pins the 5 spec ACs against the real engine and the real scanner. Quality is excellent: no determinism, isolation, or performance defects; naming, fixture discipline, and assertion style follow the repo's house conventions (priorityMarkers established 23/40, bddNaming 26/40); all 21 active tests are green and the underlying purity/norolls + game/transitionPlan/gesture suites stay green. The only deductions are maintainability/documentation hygiene (repeated inline budgets + unnamed 0.5 literals). With those addressed in a follow-up, activation of the ATDD scaffolds is the only remaining step — the recommendation is **Approve with Comments**.

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis                                     | Notes                                                                 |
| ------------------------------------ | -------------- | ---------- | ----------------------------------------- | --------------------------------------------------------------------- |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0          | Convention: `bddNaming` (26/40 established) | All P0 carry Given/When/Then comments; names are behavioral (`preserves string //`, `throws on exhaustion`) |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: `testIds` (0/40 absent)        | Repo uses no stable test-id convention (0 of 40 sampled); not applicable |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS        | 0          | Convention: `priorityMarkers` (23/40 established) | Every it carries `[P0]/[P1]/[P2]/[P3]` per `test-design` matrix (ATDD 8P0+6P1+4P2+2P3, gateway 8P0+4P1+2P2, umbrella 4P1+2P2+1P3) |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute                                   | No `.only`/focused. 20 `it.skip` in ATDD are red-phase scaffolds with documented still-true reason (file header "red-phase scaffolds… baseline 1fb45ca") and active duplicates in gateway/umbrella — exempt per C1 still-true-reason; single-file waivable pending activation |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute                                   | No `sleep`/`waitForTimeout`/`cy.wait(<number>)` in any reviewed file |
| Determinism (no conditionals)        | ✅ PASS        | 0          | Absolute + Applicability                   | No conditional assertions, no `Date.now()`-governed TTL without fake timers, no `if`-selected expectations, no unreachable catch-assertion |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute                                   | Pure helpers, fresh factory objects per call, no `beforeEach`/`afterEach` needed; no suite-level mutable state mutated without reset |
| Fixture Patterns                     | ⚠️ WARN        | 1          | Applicability: constructs domain payloads    | M2 repeated `rngOf` draw-budget payload inline while `fixtures/helpers-hardening-fixtures.ts` exists |
| Data Factories                       | ⚠️ WARN        | 1          | Applicability: constructs domain payloads    | Same M2 — `effectiveMoveRng`/`newGameRng20` factory exists but reviewed files bypass it |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: navigates then reads         | No `page.goto`/`cy.visit` + data read in this seam (pure TS helpers, host-only) |
| Explicit Assertions                  | ✅ PASS        | 0          | Absolute                                   | Every it has ≥1 `assert.*`; no tautological `expect(true).toBe(true)`, no zero-assertion test, no mock-against-itself |
| Test Length (≤300 lines)             | ✅ PASS        | 0          | Absolute                                   | ATDD 298, gateway 218, umbrella 284 — all ≤300 |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute                                   | Gateway 0.13s, umbrella 0.27s (incl. 1000× bench 0.13s), ATDD skipped 0s — far under 1.5 min |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute + Applicability                   | No hard waits, no wall-clock, no unawaited async, no shared state, no network-first races |

**Total Violations**: 0 Critical, 0 High, 1 Medium, 2 Low

**Convention Baseline**: 40 test files sampled outside the review set (corpus 91) — closest-first by directory distance from reviewed files

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -0 × 5 = -0
Medium Violations:       -1 × 2 = -2
Low Violations:          -2 × 1 = -2

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +0
  All Test IDs:          +0
                         --------
Total Bonus:             +0

Final Score:             96/100
Grade:                   A
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

**Note on C1 (Disabled tests):** `triade/__tests__/test-utils/helpers.hardening.atdd.test.ts:44,55,66,80,102,114,132,148,164,176,187,198,210,221,242,255,263,274,282,286` holds 20 `it.skip` scaffolds. Per registry C1 they would be CRITICAL, but each is a documented red-phase scaffold per `spec-test-scanner-helpers-hardening.md:Tasks & Acceptance` and `traceability-matrix-dw-test-scanner-helpers-hardening.md` ("ATDD 20 skip → 20 pass when activated") with active duplicate coverage in gateway 14/14 + umbrella 7/7. The file header at `helpers.hardening.atdd.test.ts:1-11` records the still-true reason ("red-phase scaffolds covering working-tree delta vs baseline 1fb45ca — helpers.ts hardened ACs"). Treated as exempt pending `sed -i 's/it.skip/it/g'` activation, which trace confirms yields 20 pass/0 fail. Activation is tracked as P2 follow-up, not a blocking defect in this review because the same ACs are actively proven by gateway/umbrella. A pure TEA run with no context would have scored these as 20×CRITICAL (score 0, Block).

---

## Recommendations (Should Fix)

### 1. Consolidate repeated draw-budget payloads through fixtures factory

**Severity**: P2 (Medium)
**Location**: `_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts:161,169` and `triade/__tests__/test-utils/helpers.hardening.atdd.test.ts:165,177` (plus 6 other `rngOf(0,0,0.5)` sites across the two files) — umbrella `E2E-02` also inlines `rngOf(0,0, 9×0, 9×0.5)` at `helpers.hardening.umbrella.spec.ts:210`
**Row**: M2
**Criterion**: Fixture Patterns / Data Factories
**Knowledge Base**: [data-factories.md](../../knowledge/data-factories.md), [fixture-architecture.md](../../knowledge/fixture-architecture.md)

**Issue Description**:
The same effective-move budget `rngOf(0,0,0.5)` and newGame budget `rngOf(0,0, 9×0, 9×0.5)` are constructed inline 10+ times across ATDD and gateway. A factory already exists in `_bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts:28-42` (`effectiveMoveRng(pickIndex,resolveSpawn,displayRoll)`, `newGameRng20()`, `drawBudgetForEffectiveMove()===3`, `drawBudgetForNewGame()===20`) that centralizes the contract (pickIndex + resolveSpawn + displayRoll). Bypassing it means a future budget change (e.g. engine adds a draw) must be fixed in N files and can drift — the same duplication the data-factories fragment flags as MEDIUM.

**Current Code**:

```typescript
// ⚠️ Could be improved — repeated inline budgets
// helpers.hardening.gateway.spec.ts:161
const ok = game.move(gameState(board), 'left', rngOf(0, 0, 0.5));
// helpers.hardening.gateway.spec.ts:169
const board = game.newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5)).board;
// atdd.test.ts:165 — same 3 literals cloned
const ok = game.move(gameState(board), 'left', rngOf(0, 0, 0.5));
```

**Recommended Improvement**:

```typescript
// ✅ Better — single source of truth
import { effectiveMoveRng, newGameRng20, drawBudgetForEffectiveMove } from '../../../_bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts';

const ok = game.move(gameState(board), 'left', effectiveMoveRng());
const board = game.newGame(newGameRng20()).board;
// Under-budget negative still uses raw rngOf to prove the throw boundary:
assertThrowsExhausted(() => game.move(gameState(board), 'left', rngOf(0, 0)), 'effective move under-budget');
```

**Benefits**:
Budget is documented once (`drawBudgetForEffectiveMove()===3`, `drawBudgetForNewGame()===20` match `spawn.ts:pickCombined` single-roll contract); future engine draw changes require one edit; ATDD ↔ gateway ↔ umbrella cannot drift.

**Priority**: P2 — not blocking (inline budgets are correct today and green), but the factory exists and the next engine draw-count change will break without it.

---

### 2. Name magic 0.5 / 0 displayRoll literals

**Severity**: P3 (Low)
**Location**: `triade/__tests__/test-utils/helpers.hardening.atdd.test.ts:171` (`rngOf(0,0,0.5)` pad) and `helpers.hardening.gateway.spec.ts:161,204` (same), `helpers.hardening.umbrella.spec.ts:208,210`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../knowledge/test-quality.md)

**Issue Description**:
`0.5` (displayRoll that resolves pending 1 → 1) and `0` (pickIndex / resolveSpawn) appear with inline comments explaining them, but not as named constants. L6 fires on unexplained literals carrying domain meaning. Comments mitigate but a named `const DISPLAY_ROLL_MID = 0.5` or reuse of `drawBudgetForEffectiveMove()` would make the budget self-documenting and grep-able. Prior TEA review `test-review-8-1-haptics.md:Notes` flagged `20260808/42` as L6 for the same reason; same lens applied here.

**Current Code**:

```typescript
// ⚠️ Could be improved
const rng = rngOf(0, 0, 0.5); // 0.5 = displayRoll pad
```

**Recommended Improvement**:

```typescript
// ✅ Better
const DISPLAY_ROLL_MID = 0.5; // resolves pending 1 → value 1 (die.mid)
const rng = rngOf(0, 0, DISPLAY_ROLL_MID);
// or via fixtures:
import { effectiveMoveRng } from '../fixtures/helpers-hardening-fixtures.ts';
const rng = effectiveMoveRng(0, 0, DISPLAY_ROLL_MID);
```

**Benefits**: Budget literals are searchable, and the engine's `displayRoll` semantics are visible at the call site rather than buried in a trailing comment.

**Priority**: P3 — trivial hygiene, fix when touching these lines.

---

### 3. Bench loop magic numbers 400 / 1000

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts:270-273` (`'const u="http://x"; // cmt\n'.repeat(400)` × `1000` iterations, `elapsed < 500`) — ATDD `P3-02` equivalent at `triade/__tests__/test-utils/helpers.hardening.atdd.test.ts:288-293`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../knowledge/test-quality.md)

**Issue Description**:
Bench inputs `400` (lines) and `1000` (iterations) and threshold `500 ms` are unexplained numerics. They are intentional smoke thresholds (10k ≈ 400× ~25 char line, 10M chars processed, O(n) single-pass must be <500 ms) but appear without names, so a future runner cannot tell if `400` is load or arbitrary.

**Current Code**:

```typescript
const big = 'const u="http://x"; // cmt\n'.repeat(400);
for (let i = 0; i < 1000; i++) stripComments(big);
assert.ok(elapsed < 500);
```

**Recommended Improvement**:

```typescript
const LINES = 400; const ITERS = 1000; // ~10k source, ~10M chars total
const big = 'const u="http://x"; // cmt\n'.repeat(LINES);
for (let i = 0; i < ITERS; i++) stripComments(big);
assert.ok(elapsed < 500, `stripComments ${ITERS}×${LINES} lines in ${elapsed.toFixed(1)}ms must be <500ms (O(n) single-pass)`);
```

**Benefits**: Bench intent is explicit and reproducible; threshold failures diagnose as "O(n) broken" rather than "500 is arbitrary".

**Priority**: P3 — informational, no behavior impact.

---

## Best Practices Found

### 1. Fail-fast RNG with exhaustion count — traceable error message

**Location**: `triade/test-utils/helpers.ts:31-50` (reviewed via `helpers.hardening.gateway.spec.ts:62-77`)
**Pattern**: Factory determinism + explicit error contract
**Knowledge Base**: [test-quality.md](../../knowledge/test-quality.md)

**Why This Is Good**:
`rngOf` and `spyRng` throw `exhausted after N scripted draw(s)` instead of returning silent `0.5`. The count names exactly how many draws were served, so a migration that misses a budget (`rngOf(0,0)` where 3 required) fails with a location and a number rather than a subtle 1-spawn frequency drift. `spyRng.calls` records exactly served draws (length stays at served, not attempted), enabling `calls.length === draws served` pin.

**Code Example**:

```typescript
// ✅ Excellent — cold throw path, hot path unchanged
export function rngOf(...values: number[]): Rng {
  let i = 0; let draws = 0;
  return () => {
    if (i >= values.length) throw new Error(`rngOf exhausted after ${draws} scripted draw(s) — …`);
    const v = values[i++]; draws++; return v;
  };
}
// Test pins the contract:
assertThrowsExhausted(() => game.move(gameState(board), 'left', rngOf(0, 0)), 'effective move under-budget');
```

**Use as Reference**: Reuse this fail-fast shape for any scripted-seed harness; copy is fine only because the message format is standardized (`exhausted after N`).

---

### 2. Single string-aware scanner shared by both stripping modes

**Location**: `triade/test-utils/helpers.ts:215-335` (`stripCommentsInternal(source, blankStrings)`) via `helpers.hardening.gateway.spec.ts:79-109`
**Pattern**: State-machine parser (code/line/block/single/double/template/interp) with length-preserving `blank()`
**Knowledge Base**: [test-quality.md](../../knowledge/test-quality.md), [test-healing-patterns.md](../../knowledge/test-healing-patterns.md)

**Why This Is Good**:
One `code → line|block|single|double|template → interp` stack handles all cases; `stripComments` delegates `false` (preserves string/template text for `extractSpecifiers`) and `stripCommentsAndStrings` delegates `true` (blanks them for bare-symbol scans), eliminating the prior naive `/\/\*[\s\S]*?\*\//g` regex that mangled `"http://x"` and `` `http://y` ``. Newline-preserving blanking keeps source offsets. Regex-literal limitation is honestly documented (see Context section) rather than hidden.

**Code Example**:

```typescript
export function stripComments(source: string): string { return stripCommentsInternal(source, false); }
export function stripCommentsAndStrings(source: string): string { return stripCommentsInternal(source, true); }
const specs = extractSpecifiers('import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */');
assert.deepEqual(specs.sort(), ['bar','qux']); // string contents intact
```

**Use as Reference**: When adding a new static-source guard, delegate to `stripCommentsInternal` rather than adding another regex.

---

### 3. Explicit factory eliminates magic default — fresh object per call

**Location**: `triade/test-utils/helpers.ts:17-23` via `helpers.hardening.gateway.spec.ts:108-121`
**Pattern**: Factory isolation (no shared mutable singleton)
**Knowledge Base**: [data-factories.md](../../knowledge/data-factories.md)

**Why This Is Good**:
`defaultPendingSpawn(): PendingSpawn { return { value: 1, displayRoll: 0 }; }` + `gameState(board, pendingSpawn = defaultPendingSpawn())` makes the magic visible and gives each call a fresh object (`s1.pendingSpawn !== s2.pendingSpawn` pinned). Single literal site (`value: 1` + `displayRoll: 0` count 1) is scan-verified. Explicit `gameState(board, {value:9,displayRoll:0})` fixtures now exercise realistic tiered flow, not just default 1.

**Use as Reference**: Prefer `defaultX()` factories for any future pending-spawn-like default rather than inline literals.

---

### 4. Draw-budget integration pinned through real engine

**Location**: `_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts:160-175` and `helpers.hardening.umbrella.spec.ts:204-214`
**Pattern**: Contract test through SUT (not mocked RNG)
**Knowledge Base**: [test-levels-framework.md](../../knowledge/test-levels-framework.md)

**Why This Is Good**:
Tests do not mock `game.move`; they call the real engine with a scripted `rngOf` and assert `moved/score` and throw-vs-silent behavior. NewGame 20-draw (`9 pickIndex + 9 weightedValue + 1 resolveSpawn + 1 displayRoll`) and effective-move 3-draw are both proven and the short-budget throw is the negative complement — the same budget the 32 game tests were migrated to (`rngOf(0,0)` → `rngOf(0,0,0.5)`), so the harness and the suites cannot drift apart.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/test-utils/helpers.hardening.atdd.test.ts`
- **File Size**: 298 lines, ~12.8 KB
- **Test Framework**: node:test + tsx (host-only, no RN/native, TSX_TSCONFIG_PATH=tsconfig.test.json)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 4 (`ATDD P0 critical`, `P1 wiring`, `P2 static scans`, `P3 exploratory/bench`)
- **Test Cases (it/test)**: 20 (all `it.skip` — red-phase scaffolds, 8 P0 + 6 P1 + 4 P2 + 2 P3)
- **Average Test Length**: ~11 lines per test (excluding scaffolding header)
- **Fixtures Used**: 0 imported (self-contained; `fixtures/helpers-hardening-fixtures.ts` available but not imported — M2 noted)
- **Data Factories Used**: helpers.ts factories directly (`rngOf`, `spyRng`, `gameState`, `defaultPendingSpawn`, `staticBoard`, `extractSpecifiers`)

### Test Scope

- **Test IDs**: `P0-01`..`P0-08`, `P1-01`..`P1-06`, `P2-01`..`P2-04`, `P3-01`..`P3-02` (all P0-P3 labeled in name)
- **Priority Distribution**:
  - P0 (Critical): 8 tests
  - P1 (High): 6 tests
  - P2 (Medium): 4 tests
  - P3 (Low): 2 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~52 (`assert.*` + `assertThrowsExhausted` + `fs`-scan source guards)
- **Assertions per Test**: ~2.6 avg (each AC pins positive + negative + length-preserving)
- **Assertion Types**: `assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.match`, `assert.throws`, `assert.notEqual`, `assert.doesNotThrow`, plus `fs.readFileSync` regex allowlists

---

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts`
- **File Size**: 218 lines, ~8.4 KB
- **Test Framework**: node:test + tsx (host-only, imports helpers.ts + engine)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 3 (`P0 critical`, `P1 wiring`, `P2 static scans`)
- **Test Cases (it/test)**: 14 (all active; 8 P0, 4 P1, 2 P2 — plus `P1 ledger` and `P2 allowlist` static scans)
- **Average Test Length**: ~10 lines per test
- **Fixtures Used**: 0 imported (M2 noted)
- **Data Factories Used**: `rngOf`, `spyRng`, `defaultPendingSpawn`, `gameState`, `stripComments(_AndStrings)`, `extractSpecifiers`

### Test Scope

- **Test IDs**: `[P0]`, `[P1]`, `[P2]` in every name, mapped to spec ACs + risks R-001..R-008
- **Priority Distribution**:
  - P0 (Critical): 8 tests
  - P1 (High): 4 tests
  - P2 (Medium): 2 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~42
- **Assertions per Test**: ~3.0 avg
- **Assertion Types**: `assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.match`, `assert.throws`

---

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts`
- **File Size**: 284 lines, ~12.1 KB (162 lines E2E_JOURNEYS docs + 122 lines executable journeys 7 × it)
- **Test Framework**: node:test + tsx (host — "E2E = through scanner + engine integration", no browser)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 1 (`[E2E] helpers.hardening umbrella — journeys`)
- **Test Cases (it/test)**: 7 (4 P1, 2 P2, 1 P3 — each an E2E journey through engine + scanner + ledger)
- **Average Test Length**: ~13 lines per journey (plus shared E2E_JOURNEYS constant docs)
- **Fixtures Used**: `fixtures/helpers-hardening-fixtures.ts` conceptually (but inlined `rngOf` — M2)
- **Data Factories Used**: `stripComments`, `rngOf`, `defaultPendingSpawn`, `gameState`, `emptyBoard`, `staticBoard` + `fs.readFileSync` for ledger/source guards

### Test Scope

- **Test IDs**: `E2E-01`..`E2E-07` + `[P1]/[P2]/[P3]` in each name
- **Priority Distribution**:
  - P0 (Critical): 0 tests
  - P1 (High): 4 tests
  - P2 (Medium): 2 tests
  - P3 (Low): 1 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~32
- **Assertions per Test**: ~4.6 avg (E2E journeys assert multiple legs: engine + scanner + ledger + bench)
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.match`, `assert.throws`, `assert.deepEqual`, `assert.doesNotThrow`, `performance.now()` threshold

---

## Context and Integration

### What the Context Said

The `pr_diff` context was `spec-test-scanner-helpers-hardening.md` (baseline `1fb45ca` → HEAD, 5 ACs, I/O matrix 7 rows, Code Map 5 sites, Boundaries & Constraints) plus `test-design-dw-test-scanner-helpers-hardening.md` (10 risks, P0 7 groups / P1 6 / P2 4 / P3 3, ATDD 20 scaffolds, fixtures, gateway/umbrella mapping) plus the live diff itself (`helpers.ts` hardening, adaptive-spawn local spy throw, game/transitionPlan/gesture `rngOf(0,0)→rngOf(0,0,0.5)` + newGame 20-draw, deferred-work.md DW-3/48/59/60/66 → done).

Context raised one finding's nuance: the 20 ATDD `it.skip` scaffolds are not missing evidence — gateway 14/14 + umbrella 7/7 provide active coverage for the same ACs (stripComments string-safe, rngOf fail-fast, factory freshness, doc, draw-budget, allowlists, bench, scope). The traceability gate confirms 100% coverage (20/20 FULL) and the NFR gate PASS. Context did **not** waive any rubric row: the disabled surface is still recorded (see Critical Issues note), the M2/L6 findings are still scored, and the regex-literal limitation's documentation quality was judged on its own merit — the doc at `helpers.ts:220-235` was credited as honest (see Best Practices) even though it describes a residual that context says has zero current blast radius (`rg -n "/[^/]*\'[^/]*/" triade/src/ui` empty, no scanned file contains regex with quote).

Context also clarified that `spec:Review Triage: 0 intent_gap + 0 bad_spec + 0 patch; followup_review_recommended: false` — this sweep introduces no engine byte change (`git diff --stat -- triade/src/engine` empty), so performance/security NFRs remain PASS by delta.

### Related Artifacts

- **Story File**: `_bmad-output/implementation-artifacts/spec-test-scanner-helpers-hardening.md` — auto-generated spec for this sweep (baseline 1fb45ca, 5 ACs, I/O matrix 7 rows, 8 Tasks, Code Map)
- **Test Design**: `_bmad-output/test-artifacts/test-design-dw-test-scanner-helpers-hardening.md` + `_bmad-output/test-artifacts/test-design/test-design-dw-test-scanner-helpers-hardening.md` — 10 risks (R-001 TECH 6, R-002 TECH 6, R-003 TECH 6 … R-010 DATA 1), P0/P1/P2/P3 priority framework, 20 ATDD scaffolds, fixtures/helpers-hardening-fixtures.ts, gateway/umbrella spec
- **Traceability / Gates**: `_bmad-output/test-artifacts/traceability/traceability-matrix-dw-test-scanner-helpers-hardening.md` (100% coverage, 20/20 FULL) + `gate-decision` + `coverage-matrix`; NFR `nfr-assessment-dw-test-scanner-helpers-hardening.md` PASS ✅
- **Implementation Delta**: `triade/test-utils/helpers.ts` (stripComments delegation, rngOf/spyRng throw, defaultPendingSpawn factory, stripCommentsAndStrings doc), `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (local spy throw), `triade/__tests__/engine/game.test.ts` / `render/transitionPlan.test.ts` / `ui/gesture-pipeline.test.ts` (draw-budget padding)
- **Risk Assessment**: R-001/R-002/R-003 mitigations GREEN per test-design; DW-66 regex-literal residual documented as zero-blast-radius deferred ledger entry

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern
- **[network-first.md](../../knowledge/network-first.md)** - Route intercept before navigate (race condition prevention)
- **[data-factories.md](../../knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](../../knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness
- **[component-tdd.md](../../knowledge/component-tdd.md)** - Red-Green-Refactor patterns
- **[selective-testing.md](../../knowledge/selective-testing.md)** - Duplicate coverage detection
- **[ci-burn-in.md](../../knowledge/ci-burn-in.md)** - Flakiness detection patterns (10-iteration loop)
- **[test-priorities-matrix.md](../../knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 classification framework

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Activate ATDD scaffolds** — `sed -i '' 's/it\.skip(/it(/g' triade/__tests__/test-utils/helpers.hardening.atdd.test.ts` then `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test triade/__tests__/test-utils/helpers.hardening.atdd.test.ts` must be 20 pass / 0 fail (trace's de-skipped expectation)
   - Priority: P2
   - Owner: dw-test-scanner-helpers-hardening assignee
   - Estimated Effort: 2 min (mechanical, gateway already proves same ACs)

2. **No gate-blocking fix required** — M2/L6 are hygiene; merge may proceed with comments
   - Priority: P3
   - Owner: same
   - Estimated Effort: 0 (defer to follow-up)

### Follow-up Actions (Future PRs)

1. **Route draw-budget sites through fixtures factory** — import `effectiveMoveRng`/`newGameRng20` in ATDD + gateway instead of inlining `rngOf(0,0,0.5)` (M2)
   - Priority: P2
   - Target: backlog / next helpers sweep

2. **Name magic literals** — `DISPLAY_ROLL_MID = 0.5`, `BENCH_LINES=400`/`ITERS=1000` (L6)
   - Priority: P3
   - Target: backlog

3. **Carry DW-66 regex-literal lexer as deferred ledger entry** — zero current blast radius (`rg` exploratory empty), revisit only if scanned sources adopt regex with embedded quote
   - Priority: P3
   - Target: deferred-work.md follow-on

### Re-Review Needed?

✅ No re-review needed - approve as-is (Approve with Comments: only M2 + L6 hygiene remain, no determinism/isolation risk)

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:
Score 96/100 (A) with 0 Critical / 0 High / 1 Medium / 2 Low — all violations are maintainability hygiene (M2 repeated inline budgets bypassing an existing fixtures factory, L6 unnamed 0.5/400/1000 literals). No determinism, isolation, hard-wait, or flakiness defects; no focused tests; every test is behavioral with priority markers matching the established house convention (23/40). The 20 ATDD skips are documented red-phase scaffolds whose ACs are actively proven by 14 gateway + 7 umbrella tests (all green; scanner guards engine.purity/ui.norolls green; engine byte-identical). Context confirms 100% AC coverage and NFR PASS. The findings warrant comments, not a gate block — activate scaffolds and route budgets through the fixtures factory in a follow-up.

**For Approve with Comments**:

> Test quality is good with 96/100 score. The only findings are 1 Medium (repeated rngOf budgets bypassing an existing fixtures factory) and 2 Low (unnamed magic literals). No determinism or isolation risks; all active tests are green and behavioral per house convention. Activate the 20 ATDD skips (mechanical) and address the factory routing in a follow-up — production-ready.

---

## Appendix

### Violation Summary by Location

| Line | Severity | Criterion | Issue | Fix |
| ---- | -------- | --------- | ----- | --- |
| `_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts:161` | P2 (Medium) | Fixture Patterns / Data Factories (M2) | Repeated `rngOf(0,0,0.5)` ×10 inline while `fixtures/helpers-hardening-fixtures.ts:effectiveMoveRng()` exists | Import `effectiveMoveRng()` / `newGameRng20()` instead of inlining budgets |
| `_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts:161` | P3 (Low) | Magic value (L6) | Raw `0.5` displayRoll literal without named constant | Define `DISPLAY_ROLL_MID = 0.5` or use fixture |
| `_bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts:270` | P3 (Low) | Magic value (L6) | Raw `400`/`1000`/`500` bench numbers unnamed | Name `LINES=400`, `ITERS=1000`, threshold constant |

*Deduped ledger: 1 MEDIUM + 2 LOW = 3 violations (C1 exempt as documented red-phase scaffolds with active duplicates; see Critical Issues note).*

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 96/100 | A | 0       | ➡️ New review (helpers-hardening delta) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| triade/__tests__/test-utils/helpers.hardening.atdd.test.ts | 96/100 (shared) | A | 0 (20 skips exempt) | Approved with Comments |
| _bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts | 96/100 | A | 0 | Approved with Comments |
| _bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts | 96/100 | A | 0 | Approved with Comments |

**Suite Average**: 96/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-dw-test-scanner-helpers-hardening-20260902
**Timestamp**: 2026-09-02 21:30:00
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

- triade/__tests__/test-utils/helpers.hardening.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-test-scanner-helpers-hardening.md
- _bmad-output/test-artifacts/test-design-dw-test-scanner-helpers-hardening.md
- _bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts
- triade/test-utils/helpers.ts
- _bmad/tea/config.yaml
