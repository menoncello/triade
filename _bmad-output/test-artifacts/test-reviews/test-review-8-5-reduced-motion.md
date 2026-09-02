---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-01'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'triade/__tests__/feel/reducedMotion.atdd.test.ts'
  - '_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts'
  - '_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/punch.ts'
  - 'triade/src/feel/shake.ts'
  - 'triade/src/feel/bulletTime.ts'
  - 'triade/src/feel/haptics.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/App.tsx'
  - 'triade/benchmarks/feel.bench.test.ts'
  - '_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-5-reduced-motion.md'
  - '_bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: 8-5 Reduced Motion (preset-gated umbrella, 60 FPS fallback, game-over fade)

**Quality Score**: 96/100 (A - Good)
**Review Date**: 2026-09-01
**Review Scope**: directory (triade/__tests__/feel + _bmad-output/test-artifacts/tests/api + _bmad-output/test-artifacts/tests/e2e — working-tree delta for 8-5-reduced-motion)
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

✅ Behavior-shaped naming with priority markers `[P0-01]`..`[P2-06]` and deterministic host-only coverage for the full FEEL umbrella (preset-not-flag contract `REDUCED_PRESET` frozen, `reducedPresetFor` haptic-preserving copy, shake 0 / bullet suppressed / flash false / particles 0 / overshoot 1/0 / glow 1536+ false / game-over fade instant vs 280ms) — easy triage per test-priorities matrix.
✅ Real engine trace integration via `newGame` + `move` + `mulberry32(42)` (provider is engine, consumer is `feel/*` helpers; spawned / from.length≠2 / non-finite filtered), `App.tsx` wiring gate `reducedMotion={settings.reducedMotion}` ≥2 sites, board-only gating `Animated.View style={shakeStyle}` wraps `Canvas` only, and mid-flight snap `useEffect([reducedMotion]) withTiming(0,20)` — no RN/native mock, `node:test` + `tsx`.
✅ Pure, capped, never-throw contract pinned (`SHAKE_CAP=8`, `BULLET_TIME_MS=200`, `FADE_MS=280` single-source, every helper `doesNotThrow` on `NaN`/`Infinity`/`null`, `Object.isFrozen` preset, host sweep `median <0.05 / p99 <0.1` for both profiles — data not code.
✅ Haptics+sound stay never gated (code-only grep `reducedMotion` empty in `haptics.ts` except `// FR-30: haptics stay` comment, `reducedPresetFor(12).haptic === heavy`, `hapticsStyleForValue` identical regardless of flag) — FR-30/UX-DR-16 correctly enforced at code not flag level.

### Key Weaknesses

❌ `reducedMotion.atdd.test.ts` at 358 lines exceeds the 300-line file cap (H5) — ATDD scaffolds for 21 cases (P0 9, P1 6, P2 6) should be split, otherwise every future feel change re-triggers same HIGH.
❌ Fixture bypass (M2) — `feel-reduced-motion-fixtures.ts` defines 5 domain factories (`mergeEntry`/`slideEntry`/`spawnEntry`/`spawnedMergeEntry`/`nonFiniteEntry`) plus umbrella helpers, but neither `reducedMotion.atdd.test.ts` (local `entry()`) nor `reducedMotion.gateway.spec.ts` (local `mergeEntry` diverging shape + 3 raw literals in mixed array) imports it; a future `TraceEntry` typing change requires 4-site edits and a missed update silently desyncs the contract.
❌ Magic literals (L6) — `mulberry32(42)` seed and bench thresholds `0.05`/`0.1`/`500` iterations appear without named constants; seed is explained as deterministic per `triade/AGENTS.md` but still costs readability.

### Summary

The 8-5 working-tree delta (21 ATDD cases in `reducedMotion.atdd.test.ts` + 12 gateway contract tests in `reducedMotion.gateway.spec.ts` + 10 manual E2E journeys in `reducedMotion.umbrella.spec.ts` plus 223-line fixture helpers) is well-structured host-only coverage for the preset-gated FEEL umbrella (shake 0, bullet suppressed while `nextSessionBest` still advances, punch flat every tier 3..6144, glow 1536+ false, `REDUCED_PRESET` frozen copy, game-over fade instant vs 280ms `Animated.parallel`, board-only chrome guard, mid-flight snap). Quality is Good (96/100, A) with one HIGH (oversize file) forcing Request Changes per deterministic ledger, plus one MEDIUM (fixture bypass) and two LOW (magic seed/thresholds). Determinism, isolation, explicit assertions, and Disabled/Focused all PASS; no hard waits, no flaky patterns. Two intentionally RED ATDD cases (`[P2-04]` R-006 missing `cancelAnimation` before `withSequence`, `[P2-05]` burst `setTimeout` orphan) are product-gap signals, not test-quality defects — they will fail CI until `GameBoard.tsx` adds `cancelAnimation(shakeX/Y/bulletFlash)` and tracks burst timers with refs + `clearTimeout` on unmount. Fix the HIGH by splitting the 358-line file and import the shared fixtures; no re-review of quality needed beyond confirming the split.

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis                                          | Notes |
| ------------------------------------ | -------------- | ---------- | ---------------------------------------------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0          | Convention: `bddNaming` emerging (14 of 40 sampled, 35% — form `[P#] AC…` / Given-When-Then comment) | All P0/P1 carry behavior names `[P0-01] AC…` / `[P1-03] GameBoard…`; gateway has Given-When-Then block comments; umbrella journeys document Given-When-Then steps. Emerging threshold avoids penalty for missing comments. |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: `testIds` absent (0 of 40 sampled) — form `data-testid`/`getByTestId` | Repo uses no `data-testid` convention; none required for host-only unit tests. |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS        | 0          | Convention: `priorityMarkers` established (20 of 40 sampled, 50% — form `[P#] in test name`) | Every test carries `[P0-01]`, `[P1-xx]` or `[P2-xx]`; 0 missing (33/33 across atdd+gateway). Umbrella journeys carry `priority: P0/P1/P2` field. |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute | No `.skip`, `xit`, `xdescribe`, `test.todo`, `.only`, `fdescribe`, `fit` committed. 2 EXPECTED RED are active (not skipped) and correctly fail until product fix. |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute | No `sleep`, `waitForTimeout`, `cy.wait(number)`, `Thread.sleep` timers. `withTiming(0,20)` is product code asserted via source read, not a test sleep. |
| Determinism (no conditionals)        | ✅ PASS        | 0          | Absolute + Applicability: file builds time-bounded value | No `if` selecting expected value, no `try/catch` swallowing failure, no `Date.now`/`Math.random`; `mulberry32(42)` and bench `performance.now` are deterministic/measured, loops over literal tiers `[3,6,12..6144]` never zero-trip, `readSrc` fallback try/catch is outside assertions. |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute | No module-level mutable state; each `it` constructs own trace/array; `fs.readFileSync` reads are side-effect-free; `realTrace` creates fresh `newGame(rng)` per call. |
| Fixture Patterns                     | ⚠️ WARN        | 1          | Applicability: file constructs domain payloads | M2 repeated literal / bypass (see Recommendations #1). |
| Data Factories                       | ⚠️ WARN        | 1          | Applicability: file constructs domain payloads | Same M2 — TraceEntry built via local helpers diverging from shared fixtures. |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: file navigates and then reads data-dependent content — gate closed | No `page.goto`/`cy.visit`/router navigation in host unit scope. |
| Explicit Assertions                  | ✅ PASS        | 0          | Absolute | Every `it` contains ≥1 `assert.*`; 0 tautological `assert.ok(true)`; 0 unreachable assertions; `assert.doesNotThrow` used for never-throw contract. |
| Test Length (≤300 lines)             | ❌ FAIL        | 1          | Absolute | `reducedMotion.atdd.test.ts` 358 lines exceeds 300 (H5); `reducedMotion.gateway.spec.ts` 268 PASS; `reducedMotion.umbrella.spec.ts` 218 PASS; `feel-reduced-motion-fixtures.ts` 223 PASS (fixture not scored for length but noted). |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute | Host-only `node:test` with no I/O, no timers; estimated <2s per file (`performance.now` bench asserts median <0.05 p99 <0.1). |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute + Applicability | No tight timeouts, no race on shared JSON, no unawaited promises. |

**Total Violations**: 0 Critical, 1 High, 1 Medium, 2 Low (M2 counted once deduped per 8-1 precedent; 2×L6 for magic seed + bench thresholds)

**Convention Baseline**: corpusSize 89, sampled 40 (closest-first by directory distance from `triade/__tests__/feel` and `_bmad-output/test-artifacts/tests`; see step-02-discover-tests). Conventions measured outside review set:
- `priorityMarkers`: 20/40 (50%) — established — form `[P#] in test name`
- `testIds`: 0/40 (0%) — absent — form `data-testid`/`getByTestId`
- `bddNaming`: 14/40 (35%) — emerging — form `[P#] AC…` / Given-When-Then comments
- `networkFirst`: 0/40 — absent — form `page.route`/`interceptNetworkCall`
- `dataFactories`: 0/40 — absent (no shared factory in sampled committed corpus; fixtures exist only as uncommitted test-artifacts)
- `fixtures`: 0/40 — absent — form `mergeTests`/`test.extend`
- `assertionStyle`: 40/40 `assert` (`node:assert/strict`) — established — house style is `assert.equal`/`assert.ok`/`assert.doesNotThrow`

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -1 × 5 = -5
Medium Violations:       -1 × 2 = -2
Low Violations:          -2 × 1 = -2

Bonus Points:
  Excellent BDD:         +0   (e2e umbrella is data-object journeys, not Given-When-Then test bodies — not every reviewed file carries BDD)
  Comprehensive Fixtures: +0   (local entry/mergeEntry bypass shared fixtures — M2)
  Data Factories:        +0   (same M2 — not every domain payload via factory)
  Network-First:         +0   (n/a — no navigation)
  Perfect Isolation:     +5   (no shared mutable state, any test can run alone)
  All Test IDs:          +0   (n/a — no testIds convention in repo)
                         --------
Total Bonus:             +5

Final Score:             96/100
Grade:                   A
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

The two intentionally RED ATDD cases (`[P2-04]` R-006 missing `cancelAnimation`, `[P2-05]` R-007 burst orphan) are product-gap signals, not test-quality Critical violations. They are tracked in Recommendations and Context and should be fixed in product code, not by weakening the tests.

---

## Recommendations (Should Fix)

### 1. Oversize ATDD file — split 358-line scaffold (H5)

**Severity**: P1 (High)
**Location**: `triade/__tests__/feel/reducedMotion.atdd.test.ts:1` (file length 358)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
The reviewed file exceeds the 300-line cap by 58 lines. Absolute row H5 fires on any reviewed file >300 lines; the only fix is to reduce the file. The file currently holds 3 describes (P0 9, P1 6, P2 6) with 21 cases including 6 source-structure gates that `readFileSync` `GameBoard.tsx`/`App.tsx`/`GameOverOverlay.tsx`. Keeping it monolithic means every future feel change re-triggers the same HIGH and reviewers must re-read 358 lines to verify a one-line `cancelAnimation` fix.

**Current Code**:

```typescript
// triade/__tests__/feel/reducedMotion.atdd.test.ts — 358 lines, 3 describes, 21 it()
describe('ATDD 8-5 — P0 critical (spec I/O matrix)', () => { /* 9 cases incl. FR-30 umbrella */ });
describe('ATDD 8-5 — P1 high (integration / wiring)', () => { /* 6 cases incl. source gates */ });
describe('ATDD 8-5 — P2 medium (edge / regression / perf)', () => { /* 6 cases incl. EXPECTED RED */ });
```

**Recommended Fix**:

```typescript
// ✅ Split by level, keeping priority markers and names intact
// triade/__tests__/feel/reducedMotion.test.ts          — 9 P0 umbrella cases (already ~170 lines)
// triade/__tests__/feel/reducedMotion.wiring.test.ts   — P1 integration / source-structure gates (P1-01..P1-06, ~120 lines)
// triade/__tests__/feel/reducedMotion.edge.test.ts     — P2 bench + gate + EXPECTED RED (P2-01..P2-06, ~110 lines)
// OR keep atdd monolith but extract source-gate helpers into shared assertion that reads GameBoard/App once.
```

**Benefits**:
- Eliminates HIGH, score becomes 100 (capped) and recommendation becomes Approve with Comments (MEDIUM+LOWs remain).
- Smaller files enable focused re-review of only wiring vs edge when product fix lands.

**Priority**: P1 — do before next feel story (Epic 8 is done, but pattern will be copied for future feel tasks).

---

### 2. Repeated TraceEntry literals / fixture bypass — import shared fixtures (M2)

**Severity**: P2 (Medium)
**Location**: `triade/__tests__/feel/reducedMotion.atdd.test.ts:12` (`function entry(...)`) and `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts:46` (`function mergeEntry(...)`) + `:193` (3 raw `{ value, to, from, spawned }` literals in mixed array)
**Row**: M2
**Criterion**: Fixture Patterns / Data Factories
**Knowledge Base**: [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Issue Description**:
The same domain payload shape `{ value, to, from, spawned }` is constructed at 2 sites with diverging helpers (local `entry(value, spawned, fromLen)` vs local `mergeEntry(value, spawned, fromLen)` with different `from` shape `[[0,1],[0,2]]` vs `[[0,0],[0,1]]`) plus 3 raw literals in the gateway's `mixed` array, while the repo's shared factory `_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts` already provides canonical `mergeEntry`/`slideEntry`/`spawnEntry`/`spawnedMergeEntry`/`nonFiniteEntry` enforcing `from.length===2 && !spawned && Number.isFinite(value)`. Per M2, inline construction ≥3 times or bypassing an existing factory is Medium; a future change to `TraceEntry` typing will require 4-site edits and a missed update silently desyncs the contract from `src/engine/core/types.ts`.

**Current Code**:

```typescript
// ⚠️ Local helpers repeated at 2 sites + 3 raw literals in gateway:193
// reducedMotion.atdd.test.ts:12
function entry(value: number, spawned = false, fromLen = 2): any {
  const from = fromLen === 2 ? ([[0, 0], [0, 1]] as any) : fromLen === 1 ? ([[0, 0]] as any) : ([] as any);
  return { value, to: [0, 0], from, spawned };
}
// reducedMotion.gateway.spec.ts:46 + 193
function mergeEntry(value: number, spawned = false, fromLen = 2): TraceEntry {
  const from = fromLen === 2 ? ([[0, 0], [0, 1]] as any) : fromLen === 1 ? ([[0, 0]] as any) : ([] as any);
  return { value, to: [0, 0], from, spawned } as unknown as TraceEntry;
}
// gateway:193 — 3 raw literals bypass helper entirely
{ value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
{ value: 2, to: [3, 3], from: [], spawned: true } as unknown as TraceEntry,
{ value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: true } as unknown as TraceEntry,
```

**Recommended Improvement**:

```typescript
// ✅ Import shared fixtures (commit fixtures file and use it in both places)
import { mergeEntry, slideEntry, spawnEntry, spawnedMergeEntry, realEngineReducedTrace } from '../../../_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts';

// mergeEntry(value, to) enforces from.length===2 && !spawned, non-finite guard
mergeEntry(12)
slideEntry(3)
spawnEntry(2, [3,3])
spawnedMergeEntry(12)
realEngineReducedTrace(42, ['left','right'])
```

**Benefits**:
- Single place to update `TraceEntry` shape; prevents silent desync.
- Tests read as intent (`spawnedMergeEntry(12)` must be ignored) not structure.

**Priority**: P2 — do before next feel story will otherwise copy the same local pattern.

---

### 3. Magic literals — name seeds and bench thresholds (L6)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts:58` (`seed = 42`), `triade/__tests__/feel/reducedMotion.atdd.test.ts:278` (`for i<1000`), `:300` (`median <0.05`, `p99 <0.1`)
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
Explained but unnamed literals: `42` (deterministic RNG seed per `triade/AGENTS.md` no `Math.random`), `0.05`/`0.1` (bench budget median/p99 per NFR-14), `1000`/`500` (perf sweep iterations). Low cost, but naming makes the budget searchable and prevents a future editor from tuning `500→5000` without updating the comment.

**Current Code**:

```typescript
// ⚠️ Unnamed but explained
function realTrace(seed = 42) { const rng = mulberry32(seed); ... }
for (let i = 0; i < 1000; i++) { ... median <0.05, p99 <0.1 }
```

**Recommended Improvement**:

```typescript
// ✅ Named datum
const DETERMINISTIC_SEED = 42; // per triade/AGENTS.md — no Math.random
const PERF_BENCH_ITERATIONS = 1000;
const BUDGET_MEDIAN_MS = 0.05, BUDGET_TAIL_P99_MS = 0.1; // NFR-14
```

**Benefits**: Searchable, single source for budget changes.

**Priority**: P3 — cheap, do with next touch.

---

### 4. (Existing deferred product gaps — not test-quality violations)

- `[P2-04]` expects `cancelAnimation` before `withSequence` for `shakeX`/`shakeY`/`bulletFlash` when `EARLY_INPUT_MS 84` re-opens gate before 130ms shake / 200ms bullet completes (R-006/R-007). Keep failing until `GameBoard.tsx` imports `cancelAnimation` from `react-native-reanimated`.
- `[P2-05]` expects burst `setTimeout 500ms` to be tracked via ref and cleared on unmount (R-010). Keep failing until `GameBoard.tsx` tracks `burstTimerRef`.

These are product gaps, not test-quality defects. Do not weaken the tests.

---

## Best Practices Found

### 1. Preset-not-flag contract via frozen datum + haptic-preserving copy

**Location**: `triade/__tests__/feel/reducedMotion.atdd.test.ts:31` / `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts:67`
**Pattern**: Preset-not-flag
**Knowledge Base**: [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Why This Is Good**:
`REDUCED_PRESET` is frozen single-source datum (`shakeMs 0, particleBurst 0, overshoot 1/0, flash false`) and `reducedPresetFor(value)` returns fresh copy `{...REDUCED_PRESET, haptic: presetFor(value).haptic}` never mutating frozen datum, never throwing on `NaN`/`Infinity`, identity-stable `presetFor===FEEL_PRESETS[value]` vs copy path for reduced. All 6 feel helpers delegate through it (`punch.ts`/`shake.ts`/`bulletTime.ts` via `reducedPresetFor` when `reducedMotion===true`).

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated
assert.equal(presetFor(3), FEEL_PRESETS[3], 'presetFor identity');
assert.ok(Object.isFrozen(FEEL_PRESETS[3]));
const r12 = reducedPresetFor(12);
assert.equal(r12.haptic, 'heavy'); // preserved
assert.equal(r12.shakeMs, 0); // zeroed
assert.notEqual(r12 as any, presetFor(12), 'copy not canonical');
assert.doesNotThrow(() => reducedPresetFor(NaN));
```

**Use as Reference**: Reuse for future feel presets (sound, color blind, etc.).

---

### 2. Real engine trace gateway — provider scrutinized, not stubbed

**Location**: `triade/__tests__/feel/reducedMotion.atdd.test.ts:176` / `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts:174`
**Pattern**: Provider contract via real trace
**Knowledge Base**: [test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
`P1-01` uses `newGame(mulberry32)` + `move(game,'left',rng)` real engine trace to prove `feel/*` observes exactly `from.length===2 && !spawned && Number.isFinite(value)` and that reduced flat holds even on real traces. Eliminates stub drift where a hand-crafted trace could violate engine invariants.

**Code Example**:

```typescript
// ✅ Provider-agnostic, no stub drift
const { trace } = realTrace(42);
assert.notEqual(maxMergeValue(trace as any), null); // iff real engine had a merge
assert.equal(maxShakeForTrace(trace as any, true), 0);
assert.equal(shouldTriggerBulletTime(trace as any, 0, true), false);
```

**Use as Reference**: Keep for all future feel stories that observe `TraceEntry`.

---

### 3. Haptics-stay never-gated — code-only grep gate

**Location**: `triade/__tests__/feel/reducedMotion.atdd.test.ts:113` / `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts:149`
**Pattern**: Allowlist gate
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Why This Is Good**:
Asserts `haptics.ts` code-only (comments stripped) contains zero `reducedMotion` references except the required `// FR-30: haptics stay` comment, while `reducedPresetFor(12).haptic===heavy` proves preservation. Enforces architectural allowlist (only `feel/*` + `GameBoard`/`GameOverOverlay`/`App` may read flag, never `haptics`).

**Code Example**:

```typescript
// ✅ Allowlist gate
const hapticsSrc = readSrc('src/feel/haptics.ts');
assert.ok(hapticsSrc.includes('FR-30: haptics stay'));
const codeOnly = hapticsSrc.split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');
assert.equal(/reducedMotion/.test(codeOnly), false);
```

---

### 4. Game-over fade branches + initial frame anti-flash seeding

**Location**: `triade/__tests__/feel/reducedMotion.atdd.test.ts:227` / `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts:217`
**Pattern**: Branch coverage for instant vs timed
**Knowledge Base**: [component-tdd.md](../../../agents/bmad-tea/resources/knowledge/component-tdd.md)

**Why This Is Good**:
Pins both branches: `reducedMotion true → setValue(1)/setValue(0)` instant, `false → Animated.parallel 280ms` with `stopAnimation` cleanup, plus `useRef(new Animated.Value(reducedMotion?1:0))` prevents first-frame flash. The `App.tsx` wiring gate asserts `≥2 sites` and zero `reducedMotion={false}` literals, catching the `0ec7482` bug class (GameOverOverlay was hardcoded false).

**Use as Reference**: Keep for all future `reducedMotion` consumers.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/feel/reducedMotion.atdd.test.ts`
- **File Size**: 358 lines, ~19 KB
- **Test Framework**: node:test + node:assert/strict + tsx (host-only, no Playwright)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts`
- **File Size**: 268 lines, ~15 KB
- **Test Framework**: node:test + node:assert/strict + tsx (host-only, no Playwright request fixture)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts`
- **File Size**: 218 lines, ~13 KB
- **Test Framework**: Manual device smoke (E2E journeys as data, not `it()` bodies)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts`
- **File Size**: 223 lines, ~12 KB
- **Test Framework**: N/A (fixture helpers, not tests)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 6 (3 in atdd: P0/P1/P2, 3 in gateway: R-002/R-001/haptics etc. counted as 1 describe with 12 it, E2E journeys object)
- **Test Cases (it/test)**: 33 (21 atdd + 12 gateway; E2E journeys are 10 data objects, not `it()` bodies)
- **Average Test Length**: ~16 lines per test
- **Fixtures Used**: 1 (`feel-reduced-motion-fixtures.ts` exists as fixture but not imported — local `entry`/`mergeEntry` helpers used instead; 0 `mergeTests`/`test.extend`)
- **Data Factories Used**: 1 shared factory exists (`mergeEntry`/`slideEntry`/`spawnEntry` in fixtures) but atdd/gateway bypass it with local helpers

### Test Scope

- **Test IDs**: `[P0-01]`..`[P0-09]`, `[P1-01]`..`[P1-06]`, `[P2-01]`..`[P2-06]` (21 ATDD) + `[P0]`..`[P2]` gateway suites (12) + E2E-01..E2E-10 journeys (10)
- **Priority Distribution**:
  - P0 (Critical): 19 tests (9 ATDD + 8 gateway + 2 journeys umbrella)
  - P1 (High): 14 tests (6 ATDD + 3 gateway + 5 journeys)
  - P2 (Medium): 10 tests (6 ATDD incl. 2 EXPECTED RED + 2 gateway + 2 journeys deferred)
  - P3 (Low): 0
  - Unknown: 0

### Assertions Analysis

- **Total Assertions**: ~142 (atdd ~84, gateway ~58)
- **Assertions per Test**: ~4.3 avg (P0 umbrella tests loop 12 tiers with 5 asserts each)
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.notEqual`, `assert.doesNotThrow`, `assert.deepEqual` (none), string `includes`/`test` gates

---

## Context and Integration

### What the Context Said

The context set (`spec-8-5-reduced-motion.md`, `epic-8-context.md`, `test-design-epic-8-5-reduced-motion.md`, `atdd-checklist-8-5-reduced-motion.md`, plus source `feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts`/`haptics.ts`/`GameBoard.tsx`/`GameOverOverlay.tsx`/`App.tsx`/`benchmarks/feel.bench.test.ts`) establishes: FR-30 Reduced Motion is preset-gated umbrella (shake 0, bullet suppressed while `nextSessionBest` advances, punch flat, glow 1536+ false, game-over fade instant 0ms vs 280ms, 60 FPS fallback via `REDUCED_PRESET` frozen datum, `SHAKE_CAP 8`/`BULLET_TIME_MS 200` never exceeded without data change), 5 sanctioned predicate sites (`feel`/`punch`/`shake`/`bulletTime` `reducedMotion` + `GameBoard`/`GameOverOverlay`/`App` wiring), haptics+sound never gated, board-only chrome guard, mid-flight snap `withTiming(0,20)`.

This context raised one contextual finding: the two EXPECTED RED ATDD cases `[P2-04]/[P2-05]` are correctly active (not skipped) product-gap signals — the suite should stay RED until `GameBoard.tsx` adds `cancelAnimation` and burst timer refs, which the traceability `coverage-matrix.json` already tracks as deferred. Context did not waive H5/M2/L6 — a story note that a long ATDD file is "dense by design" would be a finding about the story, not a waiver.

### Related Artifacts

- **Story File**: [spec-8-5-reduced-motion.md](../../implementation-artifacts/spec-8-5-reduced-motion.md)
- **Test Design**: [test-design-epic-8-5-reduced-motion.md](../test-design/test-design-epic-8-5-reduced-motion.md)
  - **Risk Assessment**: 10 risks (R-001 BUS6, R-002 TECH6, R-003 BUS6, R-004 TECH4, R-005 TECH4, R-006 TECH4, R-007 PERF3, R-009 TECH2, R-010 TECH2)
  - **Priority Framework**: P0-P3 applied
- **ATDD Checklist**: [atdd-checklist-8-5-reduced-motion.md](../atdd-checklist-8-5-reduced-motion.md)
- **Fixtures**: [feel-reduced-motion-fixtures.ts](../fixtures/feel-reduced-motion-fixtures.ts)
- **Benchmark**: [feel.bench.test.ts](../../triade/benchmarks/feel.bench.test.ts)

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern
- **[network-first.md](../../../agents/bmad-tea/resources/knowledge/network-first.md)** - Route intercept before navigate (race condition prevention)
- **[data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness
- **[component-tdd.md](../../../agents/bmad-tea/resources/knowledge/component-tdd.md)** - Red-Green-Refactor patterns
- **[selective-testing.md](../../../agents/bmad-tea/resources/knowledge/selective-testing.md)** - Duplicate coverage detection
- **[ci-burn-in.md](../../../agents/bmad-tea/resources/knowledge/ci-burn-in.md)** - Flakiness detection patterns (10-iteration loop)
- **[test-priorities-matrix.md](../../../agents/bmad-tea/resources/knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 classification framework

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../../agents/bmad-tea/resources/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split `reducedMotion.atdd.test.ts` into ≤300-line files (H5)** - extract P1 wiring and P2 edge into `reducedMotion.wiring.test.ts` / `edge.test.ts`
   - Priority: P1
   - Owner: Feel team
   - Estimated Effort: 20 min (file move + import path fix, no logic change)

2. **Import shared fixtures in atdd + gateway (M2)** - replace local `entry`/`mergeEntry` and 3 raw literals with `feel-reduced-motion-fixtures.ts` imports
   - Priority: P2
   - Owner: Feel team
   - Estimated Effort: 15 min

### Follow-up Actions (Future PRs)

1. **Name bench thresholds and seed (L6)** - `DETERMINISTIC_SEED=42`, `BUDGET_MEDIAN_MS=0.05`, `BUDGET_TAIL_P99_MS=0.1`, `PERF_BENCH_ITERATIONS`
   - Priority: P3
   - Target: backlog (next touch)

2. **Fix product gaps so EXPECTED RED turn GREEN** - add `cancelAnimation` before `withSequence` and burst timer refs with cleanup (R-006/R-010, same class as 8-3 R-001 / 8-4 R-007)
   - Priority: P2
   - Target: next milestone (not 8-5 gate but Epic 8 polish)

### Re-Review Needed?

⚠️ Re-review after critical fixes — split the oversize file, then re-review (quick confirm H5 gone → score 100, Approve with Comments). No deep re-review needed for L6.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Deterministic ledger has 1 HIGH (H5 oversize 358 >300) → Request Changes per `deriveRecommendation`. Even though the test logic is Good (isolation, determinism, explicit assertions all PASS; real engine trace, preset-not-flag contract, haptics-stay allowlist, and bench both profiles are best-practice), a HIGH violation blocks merge under the rubric. With H5 split, score becomes 100/100 and recommendation becomes Approve with Comments (remaining MEDIUM+LOWs are worth fixing, not blocking). The two EXPECTED RED ATDD cases remain as product-gap signals — do not weaken the tests to make them green.

**For Request Changes**:

> Test quality needs improvement with 96/100 score. 1 HIGH (oversize file) must be fixed before merge. MEDIUM fixture bypass and LOW magic literals should be addressed alongside, but do not individually block merge. Two intentionally RED cases are product gaps, not test defects.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| triade/__tests__/feel/reducedMotion.atdd.test.ts:1 | P1 (High) | Test Length (≤300 lines) | 358 lines exceeds 300 (H5) | Split into ≤300-line files by P0/P1/P2 |
| triade/__tests__/feel/reducedMotion.atdd.test.ts:12 + _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts:46,193 | P2 (Medium) | Fixture Patterns / Data Factories | Local entry/mergeEntry bypass shared fixtures + 3 raw literals (M2) | Import feel-reduced-motion-fixtures.ts |
| _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts:58 | P3 (Low) | Magic value | `seed=42` without named constant (L6) | `DETERMINISTIC_SEED=42` |
| triade/__tests__/feel/reducedMotion.atdd.test.ts:278, _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts:242 | P3 (Low) | Magic value | Bench thresholds 0.05/0.1/500 unnamed (L6) | `BUDGET_MEDIAN_MS` etc. |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-01 | 96/100 | A | 0 | ➡️ Stable (same H5+M2+L6 class as 8-3 91/100 and 8-4 96/100) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| triade/__tests__/feel/reducedMotion.atdd.test.ts | 96/100 | A | 0 | Request Changes (H5) |
| _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts | 98/100 | A | 0 | Approve with Comments (M2 3-literal) |
| _bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts | 100/100 | A | 0 | Approve (data-object, no ledger rows; manual device gate) |
| _bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts | — | — | — | Fixture helpers, not scored |

**Suite Average**: 98/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-8-5-reduced-motion-20260901
**Timestamp**: 2026-09-01 20:30:00
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

<!-- Machine-readable evidence manifest. Every file actually reviewed, one repo-relative path per line, nothing else in this section: headless runners parse it verbatim as the reviewed-file list. -->

## Reviewed Files

- triade/__tests__/feel/reducedMotion.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts
- _bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts

<!-- Machine-readable context manifest. Every context artifact actually read, one repo-relative path per line, or the single word `none`. Required whenever Context Basis is not `none`. These files were read, never scored: no path may appear in both this section and Reviewed Files. -->

## Review Context

- _bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md
- _bmad-output/implementation-artifacts/epic-8-context.md
- _bmad-output/test-artifacts/test-design/test-design-epic-8-5-reduced-motion.md
- _bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md
- _bmad-output/test-artifacts/test-design-epic-8-5-reduced-motion.md
- triade/src/feel/feel.ts
- triade/src/feel/punch.ts
- triade/src/feel/shake.ts
- triade/src/feel/bulletTime.ts
- triade/src/feel/haptics.ts
- triade/src/render/GameBoard.tsx
- triade/src/ui/GameOverOverlay.tsx
- triade/App.tsx
- triade/benchmarks/feel.bench.test.ts
- triade/__tests__/feel/feel.test.ts
- triade/__tests__/feel/punch.test.ts
- triade/__tests__/feel/shake.test.ts
- triade/__tests__/feel/bulletTime.test.ts
- _bmad/tea/config.yaml

<!-- Disclosure manifest. Present whenever anything a reader would expect in the reviewed set is not there; omit the whole section when nothing was excluded. One repo-relative path per line, each with one of the three reasons from step-02-discover-tests: `path does not exist`, `file could not be parsed`, or `format not scorable by the ledger`. When the run supplied an ---BEGIN UNSCORABLE--- block, reproduce every path in it here verbatim with the third reason, dropping none — the CLI rejects a report that dropped one. Nothing here was reviewed or scored, and no path here may appear in Reviewed Files. A manifest that silently omits a changed test artifact reads as though the diff held nothing else to review. -->

## Excluded From Review Set

- _bmad-output/test-artifacts/tests/api/bulletTime.gateway.spec.ts — format not scorable by the ledger (prior epic 8-4 artifact, unchanged in 8-5 delta)
- _bmad-output/test-artifacts/tests/e2e/bulletTime.flash.spec.ts — format not scorable by the ledger (prior epic 8-4 artifact, unchanged in 8-5 delta)
