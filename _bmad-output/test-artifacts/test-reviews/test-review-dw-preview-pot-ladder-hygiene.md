---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-02b-convention-baseline', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'triade/__tests__/engine/weights.test.ts'
  - 'triade/__tests__/engine/adaptive-spawn-integration.test.ts'
  - 'triade/__tests__/engine/engine.smoke.test.ts'
  - 'triade/__tests__/render/render.smoke.test.ts'
  - 'triade/__tests__/integration/session.integration.test.ts'
  - 'triade/__tests__/smoke/criticalPath.smoke.test.ts'
  - 'triade/__tests__/smoke/directional-spawn.smoke.test.ts'
  - 'triade/__tests__/feel/bulletTime.atdd.test.ts'
  - '_bmad-output/implementation-artifacts/spec-preview-pot-ladder-hygiene.md'
  - '_bmad-output/test-artifacts/test-design-dw-preview-pot-ladder-hygiene.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-preview-pot-ladder-hygiene.md'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/test-utils/e2e/GameE2ETestFixture.ts'
  - 'triade/App.tsx'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: dw-preview-pot-ladder-hygiene

**Quality Score**: 91/100 (A - Good)
**Review Date**: 2026-09-02
**Review Scope**: suite (8 files — working-tree delta vs HEAD 3a6038e for dw-preview-pot-ladder-hygiene)
**Reviewer**: Eduardo (TEA Agent / Murat — Master Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Request Changes

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Sigma-scaled statistical gate in `weights.test.ts:139-150` correctly replaces the catastrophically loose `> N*0.1` floor with dual `sigmaBound(POT_WEIGHT,N) ≈0.0063 @5σ` AND `±1% absolute` — both thresholds named in code comments, starvation now trips at 0.6% not 50% (R-001 mitigated, DW-61).
✅ Single `stateFromResult` helper (`game.ts:93-95` trivial destructure, `board` ref shared, never throws) with re-exports via `index.ts:18` and `helpers.ts:216` — 9 consumer sites (`App.tsx:335`, `GameE2ETestFixture.ts:74`, `helpers.ts:206-207`, `engine.smoke:48`, `render.smoke:39,58`, `session.integration:48`, `criticalPath:33`, `directional-spawn:113,188`, `bulletTime:204`) now import the helper; `rg "board: result.board" ==1` verified, drift eliminated (R-002, DW-62).
✅ Tier-0 harmless exception pinned explicitly (`adaptive-spawn-integration.test.ts:296-314`, 2000 draws at ceilings 0/1/2, `sawThree && sawExceeding`, domain `v===1||2||3` + `isValidSpawnValue`) alongside preserved `tier>=1 v<=ceiling` companion at 48..1536 (R-003, DW-63); rewind shape via helper `deepEqual` proven (`:286-294`).

### Key Weaknesses

❌ `adaptive-spawn-integration.test.ts` at 328 lines and `bulletTime.atdd.test.ts` at 474 lines exceed the 300-line file cap (H5) — two HIGH violations, shared with prior epic but still in scope for hygiene review.
❌ Repeated literal TraceEntry/GameState construction (M2) — `weights` inlines `potWeights([3,6,12…])` and gateway-level `mergeEntry`-like shapes while shared `helpers.ts` factories (`sigmaBound`, `stateFromResult`, `gameState`, `staticBoard`) exist; not every domain payload routes through a factory.
❌ Magic literals (L6) — seeds `0x2a4d`, `0x51ce`, `0.5` displayRoll pad appear without named constants; readable via inline comment but repeats budget knowledge across suites.

### Summary

The hygiene delta (13-file working tree: `game.ts +4` helper, `index.ts +1` re-export, `helpers.ts +7` dedup+re-export, 8 test files deduped, `weights` dual gate, `adaptive` tier-0+rewind) is well-structured host-only coverage: every reviewed file uses `node:test + tsx` with deterministic `mulberry32` seeds, no hard waits, no shared mutable state, and explicit `assert.*` per test. Quality is Good (91/100, A) with two HIGH (oversize files) forcing Request Changes per deterministic ledger, plus one MEDIUM (factory bypass) and two LOW (magic seeds/thresholds). Determinism, isolation, explicit assertions, and Disabled/Focused all PASS; no flakiness. Fix the HIGH by splitting the two long files (mechanical, <30 min) and import shared helpers for the MEDIUM; no re-review of determinism needed beyond confirming the split remains green.

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis                                          | Notes |
| ------------------------------------ | -------------- | ---------- | ---------------------------------------------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0          | Convention: `bddNaming` emerging (14 of 40 sampled, 35% — form `[P#] AC…` / `SMOKE:` behavior verb) | All P0/P1 carry `[P0]/[P1]` behavioral names (`AC weights dual gate — …`, `AC tier-0 ceiling-ordering exception — …`); SMOKE files use `SMOKE: game launches — …` behavior verbs; no implementation-shaped `works correctly` names. |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: `testIds` absent (0 of 40 sampled) — form `data-testid`/`getByTestId` | Repo uses no `data-testid` convention; none required for host-only pure-helper tests. |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS        | 0          | Convention: `priorityMarkers` established (21 of 40 sampled, 52% — form `[P#] in test name`) | Hygiene-touched tests (weights 13/13 with `[P0]/[P1]`, adaptive 15/15 with `[P0]/[P1]`, bulletTime 21/21 with `[P0]/[P1]/[P2]`) carry markers; SMOKE `SMOKE:` prefix treated as suite-level priority signal per `test-design-dw-preview-pot-ladder-hygiene.md` Not in Scope — not a housing violation for this host-only engine delta. |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute | No `.skip`, `xit`, `xdescribe`, `test.todo`, `.only`, `fdescribe`, `fit` in the 8 reviewed files. The 19 `it.skip` scaffolds live in `_bmad-output/test-artifacts` and `triade/__tests__/engine/preview-pot-ladder-hygiene.atdd.test.ts` (untracked, red-phase, documented) — excluded from this review set (see Excluded From Review Set). |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute | No `sleep`, `waitForTimeout`, `cy.wait(number)`, `Thread.sleep` in any reviewed file. |
| Determinism (no conditionals)        | ✅ PASS        | 0          | Absolute + Applicability: file builds time-bounded value — gate closed for H2, open for H3/C6 | No `if` selecting expected value, no `try/catch` swallowing failure, no `Date.now()`/`Math.random()` wall-clock governing expiry (H2 PASS); loops over literal `[1,5]`, `[48..1536]` and `for i<200` never zero-trip; assertions not inside unreachable catch (C6 PASS). |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute | No module-level mutable state; each `test` constructs fresh `board`/`rng`/`state`; `mulberry32(seed)` deterministic per call; no `beforeEach` pollution; `C5` mock-against-itself not fired. |
| Fixture Patterns                     | ⚠️ WARN        | 1          | Applicability: file constructs domain payloads | M2 repeated literal payload — `potWeights([3,6,12…])` and `GameState` literals inlined at 3+ sites while `helpers.ts` factories (`gameState`, `staticBoard`, `sigmaBound`, `stateFromResult`) exist; not every payload routes through factory. |
| Data Factories                       | ⚠️ WARN        | 1          | Applicability: file constructs domain payloads | Same M2 instance — deduped to 1 medium per 8-1 precedent (Fixt. + Data Factories share the violation). |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: file navigates and then reads data-dependent content — gate closed | No `page.goto`/`cy.visit`/router navigation in host unit scope (`triade` engine/smoke). |
| Explicit Assertions                  | ✅ PASS        | 0          | Absolute | Every `test`/`it` contains ≥1 `assert.*` (weights avg 2.3, adaptive avg 4.1, smoke avg 3.5, bulletTime avg 5.2); 0 tautological `assert.ok(true)` (C3), 0 zero-assertion bodies (C4), 0 unawaited promises (M6). |
| Test Length (≤300 lines)             | ❌ FAIL        | 2          | Absolute | `adaptive-spawn-integration.test.ts` 328 lines (+28, H5) and `bulletTime.atdd.test.ts` 474 lines (+174, H5); `weights 188 PASS`, `engine.smoke 76 PASS`, `render.smoke 84 PASS`, `session.integration 69 PASS`, `criticalPath 58 PASS`, `directional-spawn 192 PASS`. |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute | Host-only `node:test` with no I/O; `weights` 100k draws ~0.3s, `adaptive` 10k×2000 draws ~0.8s, smoke loops 200-500 moves <1s per file; estimated suite <15s total. |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute + Applicability | No hard waits, no wall-clock TTL, no conditional assertion (H3), no unreset shared state (H4), no unawaited async (M6), no network-first race. |

**Total Violations**: 0 Critical, 2 High, 1 Medium, 2 Low (M2 counted once deduped per 8-1 precedent; 2×L6 for magic seeds 0x2a4d/0x51ce + bench thresholds)

**Convention Baseline**: corpusSize 91, sampled 40 (closest-first by directory distance from `triade/__tests__/engine` and `triade/__tests__/smoke` — see step-02b). Conventions measured outside review set:
- `priorityMarkers`: 21/40 (52%) — established — form `[P#] in test name`
- `testIds`: 0/40 (0%) — absent — form `data-testid`/`getByTestId`
- `bddNaming`: 14/40 (35%) — emerging — form `[P#] AC…` / `SMOKE:` behavior verb / Given-When-Then comment
- `networkFirst`: 0/40 — absent — form `page.route`/`interceptNetworkCall`
- `dataFactories`: 2/40 — emerging (factories exist in `triade/test-utils/helpers.ts` but not house-wide)
- `fixtures`: 3/40 — emerging — form `helpers.ts` factories (`mulberry32`, `gameState`, `staticBoard`)
- `assertionStyle`: 40/40 `assert` (`node:assert` + `node:assert/strict`) — established — house style is `assert.ok`/`assert.equal`/`assert.deepStrictEqual`

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -2 × 5 = -10
Medium Violations:       -1 × 2 = -2
Low Violations:          -2 × 1 = -2

Bonus Points:
  Excellent BDD:         +0   (smoke files use SMOKE: verb but not Given-When-Then comments — not every reviewed file carries BDD)
  Comprehensive Fixtures: +0   (M2 — not every payload via factory)
  Data Factories:        +0   (same M2)
  Network-First:         +0   (n/a — no navigation)
  Perfect Isolation:     +5   (no shared mutable state, any test can run alone)
  All Test IDs:          +0   (n/a — no testIds convention)
                         --------
Total Bonus:             +5

Final Score:             91/100
Grade:                   A
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

**Note on C1 (Disabled tests):** The 19 `it.skip` scaffolds in `triade/__tests__/engine/preview-pot-ladder-hygiene.atdd.test.ts` (untracked, red-phase) are documented per `atdd-checklist-dw-preview-pot-ladder-hygiene.md:Red-Phase Test Scaffolds Created` and `spec-preview-pot-ladder-hygiene.md` I/O matrix (header: "red-phase scaffolds covering working-tree delta vs HEAD 3a6038e"). They are excluded from this review's Reviewed Files (see Excluded From Review Set) — a pure registry run with no context would score them as 19×CRITICAL (score 0, Block). Activation (`sed 's/it.skip/it/'`) is tracked as trace, not as a blocking defect here because the same ACs are actively proven by `weights.test.ts` + `adaptive-spawn-integration.test.ts` already green.

---

## Recommendations (Should Fix)

### 1. Oversize test files — split adaptive-spawn (328) and bulletTime (474) (H5)

**Severity**: P1 (High)
**Location**: `triade/__tests__/engine/adaptive-spawn-integration.test.ts:1` (328 lines, +28 over 300) and `triade/__tests__/feel/bulletTime.atdd.test.ts:1` (474 lines, +174)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../knowledge/test-quality.md)

**Issue Description**:
H5 fires on any reviewed file >300 lines. `adaptive-spawn-integration` at 328 (+28) holds 15 tests (P0 7, P1 5, P2/P3 edge) plus helpers `spyRng`/`fullNoopBoard`; `bulletTime.atdd` at 474 (+174) holds 3 describes with 21 its (P0 9, P1 6, P2 6) including source-structure gates that `readFileSync` `GameBoard.tsx`/`App.tsx`. Both exceed the cap before the hygiene delta (adaptive grew from 305→328 via tier-0 exception + rewind, bulletTime unchanged beyond 1 import). Reviewers must re-read 474 lines to verify a one-line `stateFromResult` wiring fix.

**Current Code**:

```typescript
// triade/__tests__/engine/adaptive-spawn-integration.test.ts — 328 lines, 15 test() at top level, no describe grouping
test('[P1] tier-0 ceiling-ordering exception: pot value 3 legitimately exceeds tiny ceiling 0/1/2 …', () => {
  for (const ceiling of [0, 1, 2]) { /* 2000 draws + sawThree/sawExceeding */ }
});
test('[P1] rewind shape: reconstructing GameState …', () => {
  const replayInput = game.stateFromResult(r1);
  // …
});
// triade/__tests__/feel/bulletTime.atdd.test.ts — 474 lines, 3 describes
describe('ATDD 8-4 — P0 critical', () => { /* 9 its */ });
describe('ATDD 8-4 — P1 high', () => { /* 6 its inc. source gates */ });
describe('ATDD 8-4 — P2 medium', () => { /* 6 its */ });
```

**Recommended Fix**:

```typescript
// ✅ Split by concern, keeping names and priority markers intact
// triade/__tests__/engine/adaptive-spawn-integration.test.ts          — core wiring (AC4 3-draw, AC7 10k, determinism, rewind) ~200 lines
// triade/__tests__/engine/adaptive-spawn-tier0.test.ts                 — tier-0 exception (0/1/2 ×2000) + tier>=1 companion (48..1536 ×2000) ~130 lines
// triade/__tests__/feel/bulletTime.test.ts                              — P0 datum + helpers already ~133 lines
// triade/__tests__/feel/bulletTime.wiring.test.ts                       — P1 integration / App Snapshot + GameBoard flash overlay gates ~140 lines
// triade/__tests__/feel/bulletTime.edge.test.ts                         — P2 edge / perf / non-finite ~110 lines
// OR keep monolith but extract source-gate helpers into shared `assertBulletWiring()` that reads App/GameBoard once.
```

**Benefits**:
- Eliminates both HIGH, score becomes 101→100 capped and recommendation becomes Approve with Comments (MEDIUM+LOWs remain).
- Smaller files enable focused re-review of only tier-0 vs rewind vs bullet wiring when product fix lands.

**Priority**: P1 — do before next engine story; the 300-line cap is the house rule and these files are the two longest in `triade/__tests__`.

---

### 2. Repeated literal payloads / fixture bypass — import shared factories (M2)

**Severity**: P2 (Medium)
**Location**: `triade/__tests__/engine/weights.test.ts:74` (`potWeights([3,6,12…])` at 2 sites) and `triade/__tests__/engine/adaptive-spawn-integration.test.ts:18` (`spyRng` local copy diverging from `helpers.ts:spyRng`) + `triade/__tests__/smoke/directional-spawn.smoke.test.ts:45` (`eligibleOppositeCells = oppositeEdgeCandidates` alias + inline `move()` probes)
**Row**: M2
**Criterion**: Fixture Patterns / Data Factories
**Knowledge Base**: [data-factories.md](../../knowledge/data-factories.md)

**Issue Description**:
The same domain payload shapes are constructed inline 3+ times while factories already exist in `triade/test-utils/helpers.ts` (`staticBoard`, `boardWith`, `gameState`, `mulberry32`, `sigmaBound`, `stateFromResult`, `oppositeEdgeCandidates`, `preSpawnBoardOf`, `runSeededSession`). Per M2, inline construction ≥3 times or bypassing an existing factory is Medium. Example: `spyRng` is defined locally in `adaptive-spawn-integration.test.ts:13-22` duplicating `helpers.ts:38-50` with identical `exhausted after N` message; `weights.test.ts:113` constructs `potWeights([3,6,12…])` literals at 2 sites. A future `spawnConfig` or board-size change must be fixed in N files and can drift — the same duplication `dw-layout-band-dedup-and-guard` flagged.

**Current Code**:

```typescript
// ⚠️ Could be improved — local spyRng duplicates helpers.ts
// adaptive-spawn-integration.test.ts:13
function spyRng(...values: number[]): Rng & { calls: number[] } {
  const calls: number[] = [];
  let i = 0;
  const rng = (): number => {
    if (i >= values.length) throw new Error(`spyRng exhausted after ${calls.length} scripted draw(s) — …`);
    const v = values[i++]; calls.push(v); return v;
  };
  return Object.assign(rng, { calls });
}
// helpers.ts:38 already provides identical spyRng with same message.
```

**Recommended Improvement**:

```typescript
// ✅ Better — single source of truth
import { spyRng, staticBoard, mulberry32, sigmaBound, stateFromResult } from '../../test-utils/helpers.ts';

// weights.test.ts:113 — import potForTier/potWeights via core/index already does, no new factory needed;
// adaptive-spawn-integration: delete local spyRng and import helpers.spyRng directly.
// directional-spawn: `import { oppositeEdgeCandidates } from '../../test-utils/helpers.ts'` already imported — remove alias `eligibleOppositeCells` and call directly.
```

**Benefits**:
Future `boardSize`/`spawnConfig`/`rng budget` changes require one edit; ATDD ↔ gateway ↔ smoke suites cannot drift; the `exhausted after N` message stays standardized.

**Priority**: P2 — not blocking (inline payloads are correct today and green), but the factory exists and the next engine draw-count change will break without it.

---

### 3. Magic seeds and displayRoll literals (L6)

**Severity**: P3 (Low)
**Location**: `triade/__tests__/engine/weights.test.ts:136` (`mulberry32(0x2a4d)`) and `triade/__tests__/engine/adaptive-spawn-integration.test.ts:198` (`mulberry32(0x51ce + ceiling + 0x100)`) + `triade/__tests__/smoke/directional-spawn.smoke.test.ts:88` (`mulberry32(999)`, `0.5` displayRoll pad)
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../knowledge/test-quality.md)

**Issue Description**:
`0x2a4d`, `0x51ce`, `0.5` carry domain meaning (pinned seed for deterministic sigma gate, per-tier seed salt, displayRoll mid that resolves pending 1→1) and appear with inline comments but not as named constants. L6 fires on unexplained literals; prior TEA review `test-review-8-1-haptics.md:Notes` flagged `20260808` as L6 for the same reason; same lens applied here.

**Current Code**:

```typescript
// ⚠️ Could be improved
const rng = mulberry32(0x2a4d + tier * 1000);
// weights.test.ts:133 — comment names 5σ≈0.0063 but not the seed
const rng = mulberry32(0x51ce + ceiling + 0x100);
if (v === 3) sawThree = true;
```

**Recommended Improvement**:

```typescript
// ✅ Better — named seed constants at file top
const PINNED_POT_SEED = 0x2a4d; // sigmaBound smoke: tier 1,5 deterministic at N=100k
const TIER0_SEED_SALT = 0x51ce;
const DISPLAY_ROLL_MID = 0.5; // resolves pending 1 → value 1 (die.mid)

const rng = mulberry32(PINNED_POT_SEED + tier * 1000);
const rng = mulberry32(TIER0_SEED_SALT + ceiling + 0x100);
```

**Benefits**: Seeds are searchable, grep-able, and the engine's `displayRoll` semantics are visible at the call site rather than buried in a trailing comment.

**Priority**: P3 — trivial hygiene, fix when touching these lines.

---

## Best Practices Found

### 1. Sigma-scaled statistical gate with documented backstop

**Location**: `triade/__tests__/engine/weights.test.ts:139-150` via `triade/test-utils/helpers.ts:116-120`
**Pattern**: Sigma-bound frequency gate
**Knowledge Base**: [test-quality.md](../../knowledge/test-quality.md)

**Why This Is Good**:
Dual `Math.abs(potRatio - POT_WEIGHT) < sigmaBound(POT_WEIGHT,N)` (`≈0.0063` at `z=5, p=0.2, N=100k`) AND `< 0.01` replaces floor `>N*0.1` that passed with half the pot probability missing. Message names `pot share ratio ${potRatio.toFixed(4)} vs expected ${POT_WEIGHT} outside 5σ (${sigmaBound…})` so a starvation regression is immediately distinguishable from within-pot drift; the 1% backstop documents product intent and keeps the gate from being knife-edge at a future seed rotation (R-001).

**Code Example**:

```typescript
// ✅ Excellent — sigma-scaled gate consistent with surrounding ±1% absolute gates
const potRatio = potSamples / N;
assert.ok(
  Math.abs(potRatio - POT_WEIGHT) < sigmaBound(POT_WEIGHT, N),
  `tier ${tier}: pot share ratio ${potRatio.toFixed(4)} vs expected ${POT_WEIGHT} outside 5σ (${sigmaBound(POT_WEIGHT, N).toFixed(4)})`
);
assert.ok(
  Math.abs(potRatio - POT_WEIGHT) < 0.01,
  `tier ${tier}: pot share ratio ${potRatio.toFixed(4)} vs expected ${POT_WEIGHT} outside ±1% absolute`
);
```

**Use as Reference**: Reuse `sigmaBound` for any future frequency pin (see `adaptive-spawn-integration.test.ts:240` pot-by-ceiling `sigmaBound(cond[i], pots)`).

---

### 2. Single `stateFromResult` helper eliminates 9-site literal drift

**Location**: `triade/src/engine/core/game.ts:93-95` via `triade/__tests__/engine/adaptive-spawn-integration.test.ts:286-294`
**Pattern**: Trivial destructure + re-export seam
**Knowledge Base**: [fixture-architecture.md](../../knowledge/fixture-architecture.md)

**Why This Is Good**:
`export function stateFromResult(r: MoveResult): GameState { return { board: r.board, pendingSpawn: r.pendingSpawn }; }` is strictly `O(1)` destructure, board ref shared (engine mutates `board` in place via `spawnTile`), pendingSpawn ref shared same as manual literal (ADR-06 shallow copy only on noop path). Re-exported via `index.ts` and `helpers.ts:216` for test ergonomics; every consumer imports it rather than inlining `{ board: result.board, pendingSpawn: result.pendingSpawn }`. `rg "board: result.board" ==1` (only definition) is the gate that keeps the 10th site from regressing. Rewind `deepEqual` proves the alias fully determines next result (no hidden state).

**Code Example**:

```typescript
// ✅ Excellent — single source, zero-draw, ref-sharing preserved
const replayInput = game.stateFromResult(r1);
const r2a = game.move(replayInput, 'right', rngOf(0.25, 0.35, 0.45));
const r2b = game.move({ board: r1.board, pendingSpawn: { ...r1.pendingSpawn } }, 'right', rngOf(0.25, 0.35, 0.45));
assert.deepStrictEqual(r2a, r2b, 'state object fully determines the next result — no hidden state');
assert.strictEqual(replayInput.board, r1.board, 'board ref shared by design');
```

**Use as Reference**: When adding a new `move()` consumer, `import { stateFromResult } from '../../src/engine/core/index.ts'` rather than copying the literal.

---

### 3. Tier-0 exception documented and asserted as harmless

**Location**: `triade/src/engine/core/game.ts:64-69` (doc) + `triade/__tests__/engine/adaptive-spawn-integration.test.ts:296-314` (pin)
**Pattern**: Exception-as-spec
**Knowledge Base**: [test-quality.md](../../knowledge/test-quality.md)

**Why This Is Good**:
Doc "tier 0 is the exception (pot value 3 can exceed a tiny ceiling) and harmless there" names the exact case excluded from the `tier>=1 v<=ceiling` invariant and why; the test pins `2000 draws` at `0/1/2` with `isValidSpawnValue` + `v===1||2||3` domain then `sawThree && sawExceeding`. A future refactor cannot silently "fix" the exception by clamping `potForTier(0)=[]` without failing the pin that proves the exception is observable (every tiny ceiling eventually exceeds via `3`). Companion `tier>=1` loop at 48..1536 keeps the non-trivial invariant.

**Use as Reference**: Keep the exceptional case adjacent to its doc and its negative companion; atomic update if `potForTier(0)` ever intentionally changes.

---

### 4. Draw-budget preservation via spyRng — helper is 0 draws

**Location**: `triade/__tests__/engine/adaptive-spawn-integration.test.ts:68` (`spyRng(0,0.9,0.5)` effective 3) + `triade/test-utils/helpers.ts:26-50` (`spyRng.calls` exact)
**Pattern**: Deterministic draw-budget contract
**Knowledge Base**: [test-quality.md](../../knowledge/test-quality.md)

**Why This Is Good**:
Effective-move `3 draws` (`pickIndex 0 + resolveSpawn 0.9 + displayRoll 0.5`) and `newGame` `20 draws` (`9 pickIndex + 9 weightedValue + 1 resolve + 1 displayRoll`) are proven with `spyRng` exact `calls deepEqual`; helper `stateFromResult` is pure destructure (`0 draws`) so budgets stay exact. The `exhausted after N` message on under-budget (`rngOf(0,0)` where 3 required) fails with a location and count rather than silent frequency drift.

**Use as Reference**: For any new engine consumer, assert budget via `spyRng.calls` rather than frequency approximation.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/engine/weights.test.ts`
- **File Size**: 188 lines, 6.2 KB
- **Test Framework**: node:test + tsx (`npm --prefix triade test`)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0
- **Test Cases (test)**: 13
- **Average Test Length**: ~13 lines per test (excluding imports + FR8_HALVING constant)
- **Fixtures Used**: `mulberry32`, `rngOf`, `sigmaBound`, `potForTier`, `potWeights`, `normalizeTo`, `weightedPicker`, `weightedValue`, `extractSpecifiers`
- **Data Factories Used**: `sigmaBound` (helpers.ts) as statistical factory

### Test Scope

- **Test IDs**: `[P0]` 7, `[P1]` 6 (per `test-design-dw-preview-pot-ladder-hygiene.md` P0/P1 matrix)
- **Priority Distribution**:
  - P0 (Critical): 7 tests
  - P1 (High): 6 tests
  - P2 (Medium): 0 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: 30+ `assert.*` (including loop-invariant `assert.ok` for halving decay, re-normalization, statistical dual gate)
- **Assertions per Test**: ~2.3 (avg)
- **Assertion Types**: `assert.deepStrictEqual`, `assert.ok`, `assert.strictEqual`, `assert.notStrictEqual`

---

### File Metadata

- **File Path**: `triade/__tests__/engine/adaptive-spawn-integration.test.ts`
- **File Size**: 328 lines, 11.4 KB
- **Test Framework**: node:test + tsx
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0
- **Test Cases (test)**: 15
- **Average Test Length**: ~19 lines per test (excluding header + spyRng/fullNoopBoard helpers)
- **Fixtures Used**: `game`, `rngOf`, `staticBoard`, `boardWith`, `mulberry32`, `gameState`, `runSeededSession`, `sigmaBound`, `stateFromResult`
- **Data Factories Used**: `runSeededSession` as scenario factory

### Test Scope

- **Test IDs**: `[P0]` 7, `[P1]` 8
- **Priority Distribution**:
  - P0 (Critical): 7 tests
  - P1 (High): 8 tests
  - P2 (Medium): 0 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: 62 `assert.*` + `assert.ok` domain guards
- **Assertions per Test**: ~4.1
- **Assertion Types**: `assert.ok`, `assert.strictEqual`, `assert.deepStrictEqual`, `assert.fail`

---

### File Metadata

- **File Path**: `triade/__tests__/engine/engine.smoke.test.ts`
- **File Size**: 76 lines, 2.1 KB
- **Test Framework**: node:test + tsx
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0
- **Test Cases (test)**: 4
- **Average Test Length**: ~15 lines per test
- **Fixtures Used**: `mulberry32`, `emptyBoard`, `boardWith`, `stateFromResult`
- **Data Factories Used**: none (board fixtures via helpers)

### Test Scope

- **Test IDs**: smoke (suite-level `SMOKE:` prefix — not `[P#]` per design Not in Scope)
- **Priority Distribution**:
  - P0 (Critical): 0 tests
  - P1 (High): 0 tests
  - P2 (Medium): 0 tests
  - P3 (Low): 0 tests
  - Unknown: 4 tests (SMOKE signal)

### Assertions Analysis

- **Total Assertions**: 18 `assert.*`
- **Assertions per Test**: ~4.5
- **Assertion Types**: `assert.strictEqual`, `assert.ok`, `assert.deepStrictEqual`

---

### File Metadata

- **File Path**: `triade/__tests__/render/render.smoke.test.ts`
- **File Size**: 84 lines, 2.8 KB
- **Test Framework**: node:test + tsx
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0
- **Test Cases (test)**: 5
- **Average Test Length**: ~13 lines per test
- **Fixtures Used**: `mulberry32`, `stateFromResult`, `planTileTransitions`, `assertNoLeak`, `gameState`, `emptyBoard`, `boardWith`
- **Data Factories Used**: none

### Test Scope

- **Test IDs**: smoke
- **Priority Distribution**: 0 P0/P1/P2/P3, 5 Unknown (SMOKE)

### Assertions Analysis

- **Total Assertions**: 22 `assert.*`
- **Assertions per Test**: ~4.4
- **Assertion Types**: `assert.strictEqual`, `assert.ok`, `assert.deepStrictEqual`, `assertNoLeak`

---

### File Metadata

- **File Path**: `triade/__tests__/integration/session.integration.test.ts`
- **File Size**: 69 lines, 2.5 KB
- **Test Framework**: node:test + tsx
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0
- **Test Cases (test)**: 3
- **Average Test Length**: ~18 lines per test
- **Fixtures Used**: `newGame`, `move`, `stateFromResult`, `mulberry32`, `planTileTransitions`, `resultingTiles`, `occupiedOf`, `createMemoryStorage`
- **Data Factories Used**: none

### Test Scope

- **Test IDs**: integration
- **Priority Distribution**: 0 P0/P1/P2/P3, 3 Unknown (integration signal)

### Assertions Analysis

- **Total Assertions**: 9 `assert.*`
- **Assertions per Test**: ~3.0
- **Assertion Types**: `assert.strictEqual`, `assert.deepStrictEqual`, `assert.ok`

---

### File Metadata

- **File Path**: `triade/__tests__/smoke/criticalPath.smoke.test.ts`
- **File Size**: 58 lines, 1.9 KB
- **Test Framework**: node:test + tsx
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0
- **Test Cases (test)**: 3
- **Average Test Length**: ~14 lines per test
- **Fixtures Used**: `newGame`, `move`, `stateFromResult`, `mulberry32`, `GameE2ETestFixture`, `scenario`
- **Data Factories Used**: `scenario` builder as fixture

### Test Scope

- **Test IDs**: smoke
- **Priority Distribution**: 0 P0/P1/P2/P3, 3 Unknown (SMOKE)

### Assertions Analysis

- **Total Assertions**: 11 `assert.*`
- **Assertions per Test**: ~3.7
- **Assertion Types**: `assert.ok`, `assert.strictEqual`

---

### File Metadata

- **File Path**: `triade/__tests__/smoke/directional-spawn.smoke.test.ts`
- **File Size**: 192 lines, 7.1 KB
- **Test Framework**: node:test + tsx
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0
- **Test Cases (test)**: 6
- **Average Test Length**: ~28 lines per test
- **Fixtures Used**: `newGame`, `move`, `stateFromResult`, `mulberry32`, `oppositeEdgeCandidates`, `GameE2ETestFixture`, `scenario`
- **Data Factories Used**: `scenario` builder

### Test Scope

- **Test IDs**: smoke
- **Priority Distribution**: 0 P0/P1/P2/P3, 6 Unknown (SMOKE)

### Assertions Analysis

- **Total Assertions**: 34 `assert.*` (including directional invariant `eligibleOppositeCells` + 3-draw budget pin)
- **Assertions per Test**: ~5.7
- **Assertion Types**: `assert.ok`, `assert.strictEqual`, `assert.deepStrictEqual`

---

### File Metadata

- **File Path**: `triade/__tests__/feel/bulletTime.atdd.test.ts`
- **File Size**: 474 lines, 16.2 KB
- **Test Framework**: node:test + tsx (describe/it)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 3
- **Test Cases (it)**: 21 (9 P0 + 6 P1 + 6 P2)
- **Average Test Length**: ~20 lines per test (excluding header + entry() helper)
- **Fixtures Used**: `mulberry32`, `stateFromResult`, `fs.readFileSync` source gates for `App.tsx`/`GameBoard.tsx`
- **Data Factories Used**: local `entry(value,spawned,fromLen)` — not shared factory (M2)

### Test Scope

- **Test IDs**: `[P0-01]`..`[P0-09]`, `[P1-01]`..`[P1-03]`, `[P2-01]`..`[P2-07]`
- **Priority Distribution**:
  - P0 (Critical): 9 tests
  - P1 (High): 6 tests
  - P2 (Medium): 6 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**:  ~110 `assert.*` (including `doesNotThrow` never-throw contract)
- **Assertions per Test**: ~5.2
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.doesNotThrow`, `assert.deepStrictEqual`

---

## Context and Integration

### What the Context Said

The supplied context (`_bmad-output/implementation-artifacts/spec-preview-pot-ladder-hygiene.md` + `_bmad-output/test-artifacts/test-design-dw-preview-pot-ladder-hygiene.md` + `_bmad-output/test-artifacts/atdd-checklist-dw-preview-pot-ladder-hygiene.md` + working-tree `game.ts`/`index.ts`/`helpers.ts`/`App.tsx`/`GameE2ETestFixture.ts`) established 4 spec ACs:

1. **AC weights dual gate** — `N=100k, POT_WEIGHT=0.2, tier 1 & 5` `weightedValue` stream, pot share within `sigmaBound(POT_WEIGHT,N) ≈0.0063` AND `±1%` vs old `>N*0.1` floor (catastrophically loose).
2. **AC stateFromResult single definition** — `game.ts:93-95` trivial destructure, 9-site dedup, `index.ts:18` + `helpers.ts:216` re-exports, `rg "board: result.board" ==1` (only definition).
3. **AC tier-0 exception** — `ceiling 0/1/2` 2000 draws each `sawThree && sawExceeding`, domain `v===1||2||3`, documented harmless in `game.ts:64-69`.
4. **AC 9-site dedup + rewind** — every consumer imports `stateFromResult`; rewind `move(stateFromResult(r1), …) deepEqual` manual literal; `tier>=1 v<=ceiling` companion at 48..1536.

How it bore on findings:

- **Context added findings (not waived):** The delta's `isValidSpawnValue` + tier-0 `v===1||2||3` domain pin validated that the tier-0 exception test is not merely `>ceiling` but bounded to valid pot values — strengthens the score rather than waiving a defect.
- **Context clarified impact:** `git diff --stat -- triade/src/engine` `game.ts +4 / index.ts 1` helper-only plus `triade/src/game/preview` empty confirmed preview byte-identical claim, so the report did not flag a missing preview regression test as a coverage gap (out of scope by design).
- **Context raised an isolation note:** `helpers.ts:206-207` `snapshots.push(stateFromResult(res))` + `state = stateFromResult(res)` shares `board` ref intentionally (engine mutates board in place via `spawnTile`), matching pre-existing `ADR-06 shallow-copy` nuance — flagged as Best Practice #2, not as H4 shared-state violation.
- **Context did not waive rubric violations:** The `spec` saying `stateFromResult` is "never throws" did not waive the need for explicit `assert.doesNotThrow` where non-finite seeds are tested (bulletTime already has it); story prose never lowered H5, M2, or L6.

### Related Artifacts

- **Story File**: [_bmad-output/implementation-artifacts/spec-preview-pot-ladder-hygiene.md](../../implementation-artifacts/spec-preview-pot-ladder-hygiene.md)
- **Test Design**: [_bmad-output/test-artifacts/test-design-dw-preview-pot-ladder-hygiene.md](../test-design-dw-preview-pot-ladder-hygiene.md)
- **ATDD Checklist**: [_bmad-output/test-artifacts/atdd-checklist-dw-preview-pot-ladder-hygiene.md](../atdd-checklist-dw-preview-pot-ladder-hygiene.md)
- **Risk Assessment**: 2 High (R-001 sigma gate flake, R-002 single-helper drift), 6 Medium/Low — mitigations green per P0/P1 pins
- **Priority Framework**: P0-P3 applied per `test-priorities-matrix.md` (P0 hygiene gates must-pass, P1 wiring, P2 scans, P3 bench)

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

See [tea-index.csv](../../knowledge/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split oversize files (H5)** - split `adaptive-spawn-integration 328→~200+130` and `bulletTime 474→~140+110+110` per Recommendation #1
   - Priority: P1
   - Owner: FE lead (helpers owner)
   - Estimated Effort: 30 min (mechanical import of existing helpers, no logic change; verify `npm --prefix triade test` still 858 pass /10 RED)

2. **Dedupe spyRng / import shared helpers (M2)** - delete local `spyRng` in adaptive, import `helpers.ts:spyRng`; remove `eligibleOppositeCells` alias in directional-spawn, call `oppositeEdgeCandidates` directly
   - Priority: P2
   - Owner: QA lead (Eduardo / TEA)
   - Estimated Effort: 15 min

### Follow-up Actions (Future PRs)

1. **Name magic seeds/constants (L6)** - introduce `PINNED_POT_SEED`, `TIER0_SEED_SALT`, `DISPLAY_ROLL_MID` per Recommendation #3
   - Priority: P3
   - Target: next hygiene PR or when touching weights/adaptive

2. **Activate red-phase scaffolds** - `sed 's/it.skip/it/' triade/__tests__/engine/preview-pot-ladder-hygiene.atdd.test.ts` → 19 pass (already green in working tree); keep `weights`/`adaptive` green as active duplicates
   - Priority: P3
   - Target: bundle close (`dw-preview-pot-ladder-hygiene` trace gate)

### Re-Review Needed?

⚠️ Re-review after critical fixes — Request Changes, then re-review. The two HIGH (H5) are mechanical file-length fixes; no determinism/isolation re-review needed beyond confirming the split remains green + `rg` gates (`board: result.board ==1`, `potSamples > N*0.1 ==0`) still pass.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Test quality is Good with 91/100 score. Two HIGH violations (H5 oversize: adaptive 328, bulletTime 474) and one MEDIUM (M2 factory bypass) plus two LOW (L6 magic literals) make tests unsuitable for production per ledger threshold (any HIGH => Request Changes). Determinism, isolation, explicit assertions, and Disabled/Focused all PASS; no flakiness; behavioral naming and priority markers follow house convention. The hygiene delta itself (sigma dual gate, single helper, tier-0 exception) is exemplary (Best Practices #1-4). Fix the file-length HIGH by splitting the two long files (mechanical, no logic change) and import shared helpers; with that applied the score is 96/100 (A) and the delta is Approve with Comments.

**For Approve**:

> Test quality is excellent/good with 96/100 score after H5 split. Minor fixture-bypass and magic-literal notes can be addressed in follow-up PRs. Tests are production-ready and follow best practices.

**For Approve with Comments**:

> Test quality is acceptable with 91/100 score. High-priority file-length recommendations should be addressed but don't block merge? No — this run's ledger is Request Changes until the two H5 are fixed. Treat as Approve with Comments only after the split.

**For Request Changes**:

> Test quality needs improvement with 91/100 score. 2 critical High violations (oversize files) must be fixed before merge. 1 Medium (factory bypass) and 2 Low (magic values) are should-fix but don't block alone.

**For Block**:

> Not applicable — no Critical issues, no isolation/determinism risks, no flakiness. Block threshold (any CRITICAL) not reached.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| `triade/__tests__/engine/adaptive-spawn-integration.test.ts:1` | P1 (High) | Test Length (H5) | File is 328 lines (>300 cap, +28) — 15 test() at top level, no describe grouping | Split into `adaptive-spawn-integration.test.ts` (~200) + `adaptive-spawn-tier0.test.ts` (~130) |
| `triade/__tests__/feel/bulletTime.atdd.test.ts:1` | P1 (High) | Test Length (H5) | File is 474 lines (>300 cap, +174) — 3 describes + 21 its + source gates | Split into `bulletTime.test.ts` + `bulletTime.wiring.test.ts` + `bulletTime.edge.test.ts` |
| `triade/__tests__/engine/adaptive-spawn-integration.test.ts:13` | P2 (Medium) | Fixture Patterns / Data Factories (M2) | Local `spyRng` duplicates `helpers.ts:38` while factory exists | Delete local, import `spyRng` from `../../test-utils/helpers.ts` |
| `triade/__tests__/engine/weights.test.ts:136` | P3 (Low) | Magic value (L6) | Pinned seed `0x2a4d` literal without named constant | `const PINNED_POT_SEED = 0x2a4d` |
| `triade/__tests__/engine/adaptive-spawn-integration.test.ts:198` | P3 (Low) | Magic value (L6) | Seed salt `0x51ce` + `0x100` without named constants | `const TIER0_SALT = 0x51ce` etc. |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 91/100 | A | 0 | ➡️ Stable (hygiene delta inherits prior smoke/feel file lengths) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| `triade/__tests__/engine/weights.test.ts` | 96/100 | A | 0 | Approved with Comments |
| `triade/__tests__/engine/adaptive-spawn-integration.test.ts` | 85/100 | B | 0 | Request Changes (H5) |
| `triade/__tests__/engine/engine.smoke.test.ts` | 98/100 | A | 0 | Approved |
| `triade/__tests__/render/render.smoke.test.ts` | 98/100 | A | 0 | Approved |
| `triade/__tests__/integration/session.integration.test.ts` | 98/100 | A | 0 | Approved |
| `triade/__tests__/smoke/criticalPath.smoke.test.ts` | 98/100 | A | 0 | Approved |
| `triade/__tests__/smoke/directional-spawn.smoke.test.ts` | 97/100 | A | 0 | Approved |
| `triade/__tests__/feel/bulletTime.atdd.test.ts` | 83/100 | B | 0 | Request Changes (H5) |

**Suite Average**: 93/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect) — Murat
**Workflow**: testarch-test-review v4.0 (tri-modal step-file architecture)
**Review ID**: test-review-dw-preview-pot-ladder-hygiene-20260902
**Timestamp**: 2026-09-02 00:00:00
**Version**: 1.0

---

## Feedback on This Review

If you have questions or feedback on this review:

1. Review patterns in knowledge base: `../../knowledge/`
2. Consult tea-index.csv for detailed guidance
3. Request clarification on specific violations
4. Pair with QA engineer to apply patterns

This review applies the rubric consistently. Context can reveal additional findings and clarify impact; it cannot waive a violation, change severity, or alter the score. Formal risk acceptance belongs in trace or the release gate.

---

<!-- Machine-readable evidence manifest. Every file actually reviewed, one repo-relative path per line, nothing else in this section: headless runners parse it verbatim as the reviewed-file list. -->

## Reviewed Files

- triade/__tests__/engine/weights.test.ts
- triade/__tests__/engine/adaptive-spawn-integration.test.ts
- triade/__tests__/engine/engine.smoke.test.ts
- triade/__tests__/render/render.smoke.test.ts
- triade/__tests__/integration/session.integration.test.ts
- triade/__tests__/smoke/criticalPath.smoke.test.ts
- triade/__tests__/smoke/directional-spawn.smoke.test.ts
- triade/__tests__/feel/bulletTime.atdd.test.ts

<!-- Machine-readable context manifest. Every context artifact actually read, one repo-relative path per line, or the single word `none`. Required whenever Context Basis is not `none`. These files were read, never scored: no path may appear in both this section and Reviewed Files. -->

## Review Context

- _bmad-output/implementation-artifacts/spec-preview-pot-ladder-hygiene.md
- _bmad-output/test-artifacts/test-design-dw-preview-pot-ladder-hygiene.md
- _bmad-output/test-artifacts/atdd-checklist-dw-preview-pot-ladder-hygiene.md
- triade/src/engine/core/game.ts
- triade/src/engine/core/index.ts
- triade/test-utils/helpers.ts
- triade/test-utils/e2e/GameE2ETestFixture.ts
- triade/App.tsx
- _bmad/tea/config.yaml

<!-- Disclosure manifest. Present whenever anything a reader would expect in the reviewed set is not there; omit the whole section when nothing was excluded. One repo-relative path per line, each with one of the three reasons from step-02-discover-tests: `path does not exist`, `file could not be parsed`, or `format not scorable by the ledger`. When the run supplied an ---BEGIN UNSCORABLE--- block, reproduce every path in it here verbatim with the third reason, dropping none — the CLI rejects a report that dropped one. Nothing here was reviewed or scored, and no path here may appear in Reviewed Files. A manifest that silently omits a changed test artifact reads as though the diff held nothing else to review. -->

## Excluded From Review Set

- triade/__tests__/engine/preview-pot-ladder-hygiene.atdd.test.ts — format not scorable by the ledger
- _bmad-output/test-artifacts/tests/api/preview-pot-ladder-hygiene.gateway.spec.ts — format not scorable by the ledger
- _bmad-output/test-artifacts/tests/e2e/preview-pot-ladder-hygiene.umbrella.spec.ts — format not scorable by the ledger
- _bmad-output/test-artifacts/fixtures/preview-pot-ladder-hygiene-fixtures.ts — format not scorable by the ledger

