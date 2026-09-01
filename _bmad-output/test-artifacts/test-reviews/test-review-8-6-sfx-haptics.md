---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-01'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'triade/__tests__/feel/sfx.atdd.test.ts'
  - '_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts'
  - '_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts'
  - 'triade/src/feel/sfx.ts'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/haptics.ts'
  - 'triade/src/services/assets/assetManifest.ts'
  - 'triade/App.tsx'
  - 'triade/package.json'
  - 'triade/__tests__/feel/sfx.test.ts'
  - '_bmad-output/implementation-artifacts/spec-8-6-sfx-haptics.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-6-sfx-haptics.md'
  - '_bmad-output/test-artifacts/test-design-epic-8-6-sfx-haptics.md'
  - '_bmad-output/test-artifacts/atdd-checklist-8-6-sfx-haptics.md'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: 8-6 SFX haptics (expo-audio thock coupled with haptics, swappable gateway, Reduced Motion keeps sound)

**Quality Score**: 91/100 (A - Good)
**Review Date**: 2026-09-01
**Review Scope**: directory (triade/__tests__/feel + _bmad-output/test-artifacts/tests/api + _bmad-output/test-artifacts/tests/e2e — working-tree delta for 8-6-sfx-haptics)
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

✅ Behavior-shaped naming with priority markers `[P0-01]`..`[P2-06]` and deterministic host-only coverage for the full SFX slice (volume scale `3→0.45 light / 6→0.65 medium / 12+→1.0 heavy` via `VOLUME_BY_HAPTIC` + `presetFor`, coupled `hapticsStyleForValue` 1:1, per-merge scaled `triggerSfxForTrace` order, NOOP/slide/spawn-only silence, 3-kind cap no-music, swappable `SfxGateway` + `void playViaExpoAudio` dynamic `import('expo-audio')` degrade, never-throw/never-await contract with ≥7 try/catch, FR-30 Reduced Motion keep-sound code-only gate, App coupling same call site `triggerHapticsForTrace` → `triggerSfxForTrace/ForSpawn/ForGameOver` with ≥4 try blocks, 6-site `require(assets/sfx)` allowlist, 5-site merge predicate `from.length===2 && !spawned && Array.isArray`) — easy triage per test-priorities matrix.
✅ Real engine trace integration via `newGame` + `move` + `mulberry32(42)` (provider is engine, consumer is `sfx` gateway; spawned / from.length≠2 filtered, `sfxVolumeForValue` host-cheap median <0.05 p99 <0.1 micro-bench, rapid multi-merge `seekTo(0)` last-wins without blocking next swipe) — no RN/native mock, `node:test` + `tsx`, no `Math.random`.
✅ Pure capped never-throw contract pinned (`VOLUME_BY_HAPTIC {0.45/0.65/1.0}` single-source, `spawn 0.35` `gameOver 0.9`, `Math.max(0, min(1, vol))` clamp, every helper `doesNotThrow` on `NaN`/`Infinity`/`null`/`undefined`/negative, `SfxKind = 'merge'|'spawn'|'gameOver'` 3-way, `assetManifest` 3 placeholder `sfx-merge/spawn/gameover` each `try/catch→null`, `preloadAssets` filters finite + `Asset.loadAsync` degrade, expo-audio dual API `createAudioPlayer` vs `AudioPlayer` + `setVolume/volume`) — data not code.
✅ App FR-30 wiring regression guard (code-only grep `reducedMotion` empty in `sfx.ts` except `// FR-30: Reduced Motion keeps sound` comment, `reducedPresetFor(12).haptic===heavy` preserves while volume identical, `App.tsx` sfx lines zero `reducedMotion` token while `GameBoard`/`GameOverOverlay` still thread `reducedMotion={settings.reducedMotion}` ≥2 sites, punch.atdd 8-5 residual fix not hardcoded `false`) — FR-30/UX-DR-16 correctly enforced at code not flag level.

### Key Weaknesses

❌ `sfx.atdd.test.ts` at 461 lines exceeds the 300-line file cap (H5) — ATDD scaffolds for 21 cases (P0 10, P1 5, P2 6) should be split, otherwise every future feel change re-triggers same HIGH.
❌ `sfx.gateway.spec.ts` at 349 lines exceeds the 300-line file cap (H5) — gateway contract suite for 14 cases (P0 9, P1 3, P2 2) should be split; keeping both files monolithic means two HIGHs deduct twice for the same oversize class.
❌ Fixture bypass (M2) — `feel-sfx-fixtures.ts` defines canonical factories (`mergeEntry`/`slideEntry`/`spawnEntry`/`spawnedMergeEntry`/`nonFiniteEntry` plus `realEngineSfxTrace`/`sfxGatewayContract`/`appSfxCouplingOk`/`sfxRequireAllowlistOk`/`mergePredicateAllowlistOk`) but neither `sfx.atdd.test.ts` (local `entry()` + 9 raw `{ value, to, from, spawned }` literals) nor `sfx.gateway.spec.ts` (local `mergeEntry()` diverging shape `[[0,0],[0,1]]` vs `[[0,1],[0,2]]` + 5 raw literals in mixed arrays) imports it; a future `TraceEntry` typing change requires 3-site edits and a missed update silently desyncs the contract from `src/engine/core/types.ts`.
❌ Magic literals (L6) — `mulberry32(42)` seed and bench thresholds `0.05`/`0.1`/`1000` iterations appear without named constants; seed is explained as deterministic per `triade/AGENTS.md` but still costs readability.

### Summary

The 8-6 working-tree delta (21 ATDD cases in `sfx.atdd.test.ts` + 14 gateway contract tests in `sfx.gateway.spec.ts` + 10 manual E2E journeys in `sfx.umbrella.spec.ts` plus 302-line fixture helpers) is strong host-only coverage for the expo-audio thock observer (volume scale mirroring haptic, 3-kind cap, swappable gateway degrade, never-throw/never-block, FR-30 keep-sound, App coupling same-site, assetManifest preload degrade, SDK 57 pin, 6-site require + 5-site predicate allowlists, micro-bench, rapid re-trigger). Quality is Good (91/100, A) with two HIGH (oversize files) forcing Request Changes per deterministic ledger, plus one MEDIUM (fixture bypass) and two LOW (magic seed/thresholds). Determinism, isolation, explicit assertions, and Disabled/Focused all PASS; no hard waits, no flaky patterns. One intentionally RED ATDD case (`[P2-06]` placeholder mastering `triade/assets/sfx/*.wav` absent) is a product-gap signal, not a test-quality defect — it will fail until wav mastering lands and then flips GREEN without code change (degrade to silent no-op is current ship path per spec Residual risks + test-design R-003). Fix the HIGHs by splitting the two oversize files and import the shared fixtures; no re-review of quality needed beyond confirming the splits.

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis                                          | Notes |
| ------------------------------------ | -------------- | ---------- | ---------------------------------------------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0          | Convention: `bddNaming` emerging (1 of 40 sampled, 3% — form Given/When/Then) | All P0/P1 carry behavior names `[P0-01] AC2 …` / `[P1-02] App.tsx coupling`; gateway has Given-When-Then block comments; umbrella journeys document Given-When-Then steps. Emerging threshold avoids penalty for missing comments; 0 implementation-shaped names. |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: `testIds` absent (0 of 40 sampled) — form `data-testid`/`getByTestId` | Repo uses no `data-testid` convention; none required for host-only unit tests. |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS        | 0          | Convention: `priorityMarkers` established (24 of 40 sampled, 60% — form `[P#] in test name`) | Every test carries `[P0-01]`, `[P1-xx]` or `[P2-xx]`; gateway carries `[P0]`/`[P1]`/`[P2]`; 0 missing (35/35 across atdd+gateway). Umbrella journeys carry `priority: P0/P1/P2` field. |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute | No `.skip`, `xit`, `xdescribe`, `test.todo`, `.only`, `fdescribe`, `fit` committed. 1 EXPECTED RED `[P2-06]` is active (not skipped) and correctly fails until wav mastering (product gap, not test defect). |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute | No `sleep`, `waitForTimeout`, `cy.wait(number)`, `Thread.sleep` timers. `performance.now` bench is measured, not a sleep. `seekTo(0)` is product code asserted via source read. |
| Determinism (no conditionals)        | ✅ PASS        | 0          | Absolute + Applicability: file builds time-bounded value | No `if` selecting expected value (loops over literal tiers `[3,6,12..6144]` never zero-trip, `if(haptic==='light')` derives expected from SUT tier — not arbitrary selection), no `try/catch` swallowing failure, no `Date.now`/`Math.random`; `mulberry32(42)` and bench `performance.now` are deterministic/measured, `readSrc` fallback try/catch is outside assertions. |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute | No module-level mutable state; each `it` constructs own `trace`/`gw`/`calls`; `fs.readFileSync`/`existsSync` reads are side-effect-free; `realTrace` creates fresh `newGame(rng)` per call. |
| Fixture Patterns                     | ⚠️ WARN        | 1          | Applicability: file constructs domain payloads | M2 repeated literal / bypass (see Recommendations #1). |
| Data Factories                       | ⚠️ WARN        | 1          | Applicability: file constructs domain payloads | Same M2 — TraceEntry built via local helpers diverging from shared fixtures. |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: file navigates and then reads data-dependent content — gate closed | No `page.goto`/`cy.visit`/router navigation in host unit scope. |
| Explicit Assertions                  | ✅ PASS        | 0          | Absolute | Every `it` contains ≥1 `assert.*`; 0 tautological `assert.ok(true)`; 0 unreachable assertions; `assert.doesNotThrow` used for never-throw contract. |
| Test Length (≤300 lines)             | ❌ FAIL        | 2          | Absolute | `sfx.atdd.test.ts` 461 lines exceeds 300 (H5); `sfx.gateway.spec.ts` 349 lines exceeds 300 (H5); `sfx.umbrella.spec.ts` 223 PASS; `feel-sfx-fixtures.ts` 302 is fixture helpers not scored for length but noted (prior precedent: fixtures excluded). |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute | Host-only `node:test` with no I/O, no timers; measured wall-clock `sfx.atdd` 141ms for 21 tests, `sfx.test` 126ms for 11, `sfx.gateway` 144ms for 14 (bench asserts `median <0.05 p99 <0.1`). |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute + Applicability | No tight timeouts, no race on shared JSON, no unawaited promises. |

**Total Violations**: 0 Critical, 2 High, 1 Medium, 2 Low (M2 counted once deduped per 8-1 precedent; 2×L6 for magic seed + bench thresholds; 2×H5 for two oversize files)

**Convention Baseline**: corpusSize 91, sampled 40 (closest-first by directory distance from `triade/__tests__/feel` and `_bmad-output/test-artifacts/tests`; see step-02-discover-tests). Conventions measured outside review set:
- `priorityMarkers`: 24/40 (60%) — established — form `[P#] in test name`
- `testIds`: 0/40 (0%) — absent — form `data-testid`/`getByTestId`
- `bddNaming`: 1/40 (3%) — emerging — form Given/When/Then
- `networkFirst`: 0/40 — absent — form `page.route`/`interceptNetworkCall`
- `dataFactories`: 0/40 — absent (no shared factory in sampled committed corpus; fixtures exist only as uncommitted test-artifacts)
- `fixtures`: 0/40 — absent — form `mergeTests`/`test.extend`
- `assertionStyle`: 40/40 `assert` (`node:assert/strict`) — established — house style is `assert.equal`/`assert.ok`/`assert.doesNotThrow`

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -2 × 5 = -10
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

Final Score:             91/100
Grade:                   A
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

The one intentionally RED ATDD case (`[P2-06]` placeholder mastering `triade/assets/sfx/merge.wav|spawn.wav|gameover.wav` absent) is a product-gap signal, not a test-quality Critical violation. It is tracked in Recommendations and Context and should be fixed by adding wav mastering, not by weakening the test. Until then `gateway degrades to no-op via try/catch→null` is the ship path (spec Residual risks + test-design R-003, gate CONCERNS waived).

---

## Recommendations (Should Fix)

### 1. Oversize ATDD file — split 461-line scaffold (H5)

**Severity**: P1 (High)
**Location**: `triade/__tests__/feel/sfx.atdd.test.ts:1` (file length 461)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The reviewed file exceeds the 300-line cap by 161 lines. Absolute row H5 fires on any reviewed file >300 lines; the only fix is to reduce the file. The file currently holds 3 describes (P0 10, P1 5, P2 6) with 21 cases including 6 source-structure gates that `readFileSync` `sfx.ts`/`App.tsx`/`assetManifest.ts`/`package.json`. Keeping it monolithic means every future feel change re-triggers the same HIGH and reviewers must re-read 461 lines to verify a one-line `VOLUME_BY_HAPTIC` fix.

**Current Code**:

```typescript
// triade/__tests__/feel/sfx.atdd.test.ts — 461 lines, 3 describes, 21 it()
describe('ATDD 8-6 — P0 critical (spec I/O matrix)', () => { /* 10 cases incl. volume scale + no-music + never-throw */ });
describe('ATDD 8-6 — P1 high (App coupling / asset manifest / trace)', () => { /* 5 cases incl. source gates */ });
describe('ATDD 8-6 — P2 medium (scans / perf / deferred)', () => { /* 6 cases incl. EXPECTED RED */ });
```

**Recommended Fix**:

```typescript
// ✅ Split by level, keeping priority markers and names intact
// triade/__tests__/feel/sfx.test.ts          — already 11 P0 gateway pins (existing, keep)
// triade/__tests__/feel/sfx.atdd.test.ts     — P0 critical 10 cases only (~240 lines after extracting P1/P2)
// triade/__tests__/feel/sfx.wiring.test.ts   — P1 integration / source-structure gates (P1-01..P1-05, ~130 lines)
// triade/__tests__/feel/sfx.perf.test.ts     — P2 bench + allowlist + EXPECTED RED (P2-01..P2-06, ~110 lines)
// OR keep atdd monolith but extract source-gate helpers into shared assertions that read sfx.ts/App.tsx once.
```

**Benefits**:
- Eliminates one HIGH, score becomes 96/100 (with gateway H5 still pending) or 100/100 when both splits land and recommendation becomes Approve with Comments.
- Smaller files enable focused re-review of only wiring vs perf when product fix lands.

**Priority**: P1 — do before next feel story (Epic 8 closes with 8-6, but pattern will be copied for future feel tasks).

---

### 2. Oversize gateway spec — split 349-line suite (H5)

**Severity**: P1 (High)
**Location**: `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:1` (file length 349)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The gateway contract file exceeds the cap by 49 lines. It holds 14 `it()` cases (P0 9, P1 3, P2 2) plus 60-line header comment and 30-line helper block (`mergeEntry`/`readSrc`/`realTrace`). While the header is useful TEA mapping prose, it counts toward the 300-line ledger (the ledger measures file size, not test-body size). Keeping it at 349 means this file alone sustains a second HIGH after the ATDD split, so both HIGHs must be fixed to reach Approve.

**Current Code**:

```typescript
// _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts — 349 lines
import { presetFor ... } from '../../../../triade/src/feel/feel.ts'; // 60-line header + 3 helpers
describe('[API] SFX haptics gateway — volume scale + coupled haptics+audio + swappable gateway', () => {
  it('[P0] sfxVolumeForValue mirrors ...', async () => { /* 9 P0 */ });
  it('[P1] trace→SFX contract via REAL engine trace ...', async () => { /* 3 P1 */ });
  it('[P2] datum literal + allowlist scans ...', async () => { /* 2 P2 */ });
});
```

**Recommended Fix**:

```typescript
// ✅ Trim header to 20 lines + extract helpers to fixtures, or split by priority
// _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts         — P0 volume+gateway 9 cases (~220 lines after trimming header)
// _bmad-output/test-artifacts/tests/api/sfx.wiring.spec.ts          — P1 App coupling + assetManifest 3 cases (~90 lines)
// _bmad-output/test-artifacts/tests/api/sfx.allowlist.spec.ts       — P2 datum + bench 2 cases (~60 lines)
// OR move mergeEntry/readSrc/realTrace into feel-sfx-fixtures.ts and import them:
//   import { mergeEntry, realEngineSfxTrace, sfxRequireAllowlistOk } from '../fixtures/feel-sfx-fixtures.ts';
```

**Benefits**:
- Eliminates second HIGH; combined with ATDD split, score becomes 100/100.
- Gateway helpers become reusable (already duplicated as local `mergeEntry` — see M2).

**Priority**: P1 — fix alongside ATDD split (same PR, same effort ~20 min).

---

### 3. Repeated TraceEntry literals / fixture bypass — import shared fixtures (M2)

**Severity**: P2 (Medium)
**Location**: `triade/__tests__/feel/sfx.atdd.test.ts:18` (`function entry(...)`) and `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:44` (`function mergeEntry(...)`) + `:146` (3 raw `{ value, to, from, spawned }` literals in mixed array) and `triade/__tests__/feel/sfx.atdd.test.ts:115` (3 raw literals in NOOP test)
**Row**: M2
**Criterion**: Fixture Patterns / Data Factories
**Knowledge Base**: [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Issue Description**:
The same domain payload shape `{ value, to, from, spawned }` is constructed at 3 sites with diverging helpers (local `entry(value, spawned, fromLen)` with `from [[0,0],[0,1]]` vs local `mergeEntry(value, spawned, fromLen)` with same shape but different JSDoc + 5 raw literals bypassing either helper) while the repo's shared factory `_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts` already provides canonical `mergeEntry`/`slideEntry`/`spawnEntry`/`spawnedMergeEntry`/`nonFiniteEntry` enforcing `from.length===2 && !spawned && Number.isFinite(value)` plus `realEngineSfxTrace`/`sfxGatewayContract`. Per M2, inline construction ≥3 times or bypassing an existing factory is Medium; a future change to `TraceEntry` typing will require 4-site edits and a missed update silently desyncs the contract from `src/engine/core/types.ts`.

**Current Code**:

```typescript
// ⚠️ Local helpers repeated at 2 sites + raw literals bypass both
// sfx.atdd.test.ts:18
function entry(value: number, spawned = false, fromLen = 2): any {
  const from = fromLen === 2 ? ([[0, 0], [0, 1]] as any) : fromLen === 1 ? ([[0, 0]] as any) : ([] as any);
  return { value, to: [0, 0], from, spawned };
}
// sfx.gateway.spec.ts:44
function mergeEntry(value: number, spawned = false, fromLen = 2): TraceEntry {
  const from = fromLen === 2 ? ([[0, 0], [0, 1]] as any) : fromLen === 1 ? ([[0, 0]] as any) : ([] as any);
  return { value, to: [0, 0], from, spawned } as unknown as TraceEntry;
}
// gateway:146 — 3 raw literals bypass helper entirely
{ value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
{ value: 2, to: [3, 3], from: [], spawned: true } as unknown as TraceEntry,
{ value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: true } as unknown as TraceEntry,
// atdd:115 — same 3 raw literals in P0-05 NOOP test
```

**Recommended Improvement**:

```typescript
// ✅ Import shared fixtures (commit fixtures file and use it in both places)
import { mergeEntry, slideEntry, spawnEntry, spawnedMergeEntry, realEngineSfxTrace } from '../../_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts';
import { sfxGatewayContract, appSfxCouplingOk, sfxRequireAllowlistOk } from '../../_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts';

// mergeEntry(value, to) enforces from.length===2 && !spawned, non-finite guard
mergeEntry(12)
slideEntry(3)
spawnEntry(2, [3,3])
spawnedMergeEntry(12)
realEngineSfxTrace(42, ['left','right'])
sfxGatewayContract(12) // tier/volume/haptic/style/coupled/kind
```

**Benefits**:
- Single place to update `TraceEntry` shape; prevents silent desync.
- Tests read as intent (`spawnedMergeEntry(12)` must be ignored) not structure.
- Eliminates the 6-site `require(assets/sfx)` duplication risk illustration — fixtures already provide `sfxRequireAllowlistOk`.

**Priority**: P2 — do before next feel story will otherwise copy the same local pattern.

---

### 4. Magic literals — name seeds and bench thresholds (L6)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:55` (`seed = 42`), `triade/__tests__/feel/sfx.atdd.test.ts:417` (`for i<1000`), `:430` (`median <0.05`, `p99 <0.1`), `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:56` (`realTrace(42)`), `:323` (`iterations=1000`, `median <0.05`, `p99 <0.1`)
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Explained but unnamed literals: `42` (deterministic RNG seed per `triade/AGENTS.md` no `Math.random`), `0.05`/`0.1` (bench budget median/p99 per NFR-14), `1000` (perf sweep iterations). Low cost, but naming makes the budget searchable and prevents a future editor from tuning `1000→5000` without updating the comment. Volumes `0.45/0.65/1.0/0.35/0.9` are **not** flagged — they are `VOLUME_BY_HAPTIC` datum asserted as single-source via `sfx.ts` scan.

**Current Code**:

```typescript
// ⚠️ Unnamed but explained
function realTrace(seed = 42) { const rng = mulberry32(seed); ... }
for (let i = 0; i < 1000; i++) { ... median <0.05, p99 <0.1 }
```

**Recommended Improvement**:

```typescript
// ✅ Named datum
const DETERMINISTIC_SEED = 42; // per triade/AGENTS.md — no Math.random, mulberry32
const PERF_BENCH_ITERATIONS = 1000;
const BUDGET_MEDIAN_MS = 0.05, BUDGET_TAIL_P99_MS = 0.1; // NFR host bench vs device 16.7ms p99
```

**Benefits**: Searchable, single source for budget changes; seed intent is explicit.

**Priority**: P3 — cheap, do with next touch.

---

### 5. (Existing deferred product gaps — not test-quality violations)

- `[P2-06]` expects `triade/assets/sfx/merge.wav|spawn.wav|gameover.wav` to exist. Keep failing until wav mastering lands (spec Residual risks + test-design R-003). Gateway degrades to silent no-op via `try/catch→null` + `if(!source) return` so no crash, but also no thock on device. When mastering lands with same literals (`merge.wav`/`spawn.wav`/`gameover.wav`) already wired in both `assetManifest.ts` and `sfx.ts` (6-site allowlist), this test flips GREEN and device smoke confirms rank `0.45/0.65/1.0` vs `0.35/0.9` without code change. Do not weaken the test to make it green.

These are product gaps, not test-quality defects. Do not weaken the tests.

---

## Best Practices Found

### 1. Coupled audio+tactile peak via data not code (VOLUME_BY_HAPTIC + presetFor)

**Location**: `triade/__tests__/feel/sfx.atdd.test.ts:35` / `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:65`
**Pattern**: Data-not-code volume scale
**Knowledge Base**: [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Why This Is Good**:
`VOLUME_BY_HAPTIC { light:0.45, medium:0.65, heavy:1.0 }` is single-source datum and `sfxVolumeForValue(value)` derives via `presetFor(value).haptic`, never branching on value. Tests loop every tier `3/6/12/24/48..6144` asserting 1:1 vs `presetFor` and vs `hapticsStyleForValue` `Light/Medium/Heavy`, plus non-finite fallback to light 0.45 and `[0,1]` clamp. All 3 feel helpers that need tier share the same `presetFor` source.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated
const VOLUMES = { light: 0.45, medium: 0.65, heavy: 1.0 } as const;
assert.equal(sfxVolumeForValue(3), 0.45);  // 3 light
assert.equal(sfxVolumeForValue(6), 0.65);  // 6 medium
for (const v of [12,24,48,96,192,384,768,1536,3072,6144]) assert.equal(sfxVolumeForValue(v), 1.0);
for (const v of [3,6,12,24,48]) {
  const h = presetFor(v).haptic;
  assert.equal(sfxVolumeForValue(v), VOLUMES[h]);
}
assert.ok(sfxSrc.includes('VOLUME_BY_HAPTIC') && sfxSrc.includes('presetFor(value)'));
```

**Use as Reference**: Reuse for future feel presets (color blind, audio pitch, etc.).

---

### 2. Swappable gateway + never-throw/never-block contract (thin observer)

**Location**: `triade/__tests__/feel/sfx.atdd.test.ts:179` / `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:175`
**Pattern**: Swappable gateway + degrade
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
Every public export (`sfxVolumeForValue`, `triggerSfxForMerge/ForTrace/ForSpawn/ForGameOver`, `dispatchPlay`, `playViaExpoAudio`, `getAudioModule`) is `try/catch` guarded (≥7 guards), `gateway?.play` preferred else `void playViaExpoAudio` `import('expo-audio').catch(()=>null)` fire-and-forget, `Math.max(0,min(1,vol))` clamp, `seekTo(0)` re-seek before replay, zero `await triggerSfx` in `sfx.ts` or `App.tsx`, gateway throw swallowed. Tests pin `null`/`undefined` gateway without throw, empty/null trace 0 calls, and bad gateway still not throwing — haptics and audio are independently try/caught in `App.tsx` (≥4 try blocks) so one failure never suppresses the other.

**Code Example**:

```typescript
// ✅ Thin observer never blocks
assert.doesNotThrow(() => triggerSfxForMerge(6, null as any));
assert.doesNotThrow(() => triggerSfxForTrace([], gw) === 0);
const bad: SfxGateway = { play: () => { throw new Error('boom'); } };
assert.doesNotThrow(() => triggerSfxForTrace([mergeEntry(12)] as any, bad));
assert.ok(sfxSrc.includes('gateway?.play') && sfxSrc.includes('void playViaExpoAudio'));
assert.equal((sfxSrc.match(/await\s+triggerSfx/g)||[]).length, 0);
```

**Use as Reference**: Keep for all future feel observers (haptics, shake, bullet — same predicate).

---

### 3. FR-30 Reduced Motion keep-sound — code-only grep gate

**Location**: `triade/__tests__/feel/sfx.atdd.test.ts:70` / `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:99`
**Pattern**: Allowlist gate
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
Asserts `sfx.ts` code-only (comments stripped) contains zero `reducedMotion` references except the required `// FR-30: Reduced Motion keeps sound` comment, while `reducedPresetFor(12).haptic===heavy` preserves tier so volume stays same. Enforces architectural allowlist (only `feel/*` + `GameBoard`/`GameOverOverlay`/`App` may read flag for visuals, never `sfx`). Complements `App.tsx` wiring gate `reducedMotion={settings.reducedMotion}` ≥2 sites and zero `reducedMotion` token on sfx lines.

**Code Example**:

```typescript
// ✅ Allowlist gate
const sfxSrc = readSrc('src/feel/sfx.ts');
assert.ok(sfxSrc.includes('FR-30: Reduced Motion keeps sound'));
const codeOnly = sfxSrc.split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');
assert.equal(/reducedMotion/.test(codeOnly), false);
assert.equal(/reducedPresetFor/.test(codeOnly), false);
assert.ok(sfxSrc.includes('presetFor(value)'));
for (const line of appSfxLines) assert.equal(line.includes('reducedMotion'), false);
```

---

### 4. App coupling same call site + assetManifest preload degrade + merge-predicate allowlists

**Location**: `triade/__tests__/feel/sfx.atdd.test.ts:265` / `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:253`
**Pattern**: Source-structure gate
**Knowledge Base**: [component-tdd.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/component-tdd.md)

**Why This Is Good**:
Pins the exact coupling contract that makes the peak land: `App.tsx:doMove` after `triggerHapticsForTrace(result.trace)` also calls `triggerSfxForTrace(result.trace)` + `triggerSfxForSpawn` via `trace.find(e=>e.spawned)` + `triggerSfxForGameOver` via `isGameOver(nextBoard)`, each fire-and-forget `try/catch` never gated on `settings.reducedMotion`. Asset gate pins `sfx-merge/spawn/gameover` each `require(../../../assets/sfx/*.wav)` in `try/catch→null` and `preloadAssets` finite-filter + `Asset.loadAsync` degrade; `exactly 6 require(assets/sfx)` allowlist (3 manifest + 3 sfx) identically spelled; 5-site merge predicate `from.length===2 && !spawned && Array.isArray` only in `haptics/shake/bulletTime/sfx` + `transitionPlan` (engine `line.ts` canonical) — no 6th duplicate.

**Use as Reference**: Keep for all future feel stories that observe `TraceEntry` + asset seams.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/feel/sfx.atdd.test.ts`
- **File Size**: 461 lines, ~19 KB
- **Test Framework**: node:test + node:assert/strict + tsx (host-only, no Playwright)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts`
- **File Size**: 349 lines, ~16 KB
- **Test Framework**: node:test + node:assert/strict + tsx (host-only, no Playwright request fixture)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts`
- **File Size**: 223 lines, ~13 KB
- **Test Framework**: Manual device smoke (E2E journeys as data, not `it()` bodies)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts`
- **File Size**: 302 lines, ~16 KB
- **Test Framework**: N/A (fixture helpers, not tests)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 6 (3 in atdd: P0/P1/P2, 1 in gateway: P0/P1/P2 consolidated, E2E journeys object)
- **Test Cases (it/test)**: 35 (21 atdd + 14 gateway; E2E journeys are 10 data objects, not `it()` bodies)
- **Average Test Length**: ~17 lines per test
- **Fixtures Used**: 1 (`feel-sfx-fixtures.ts` exists as fixture but not imported — local `entry`/`mergeEntry` helpers used instead; 0 `mergeTests`/`test.extend`)
- **Data Factories Used**: 1 shared factory exists (`mergeEntry`/`slideEntry`/`spawnEntry` in fixtures) but atdd/gateway bypass it with local helpers

### Test Scope

- **Test IDs**: `[P0-01]`..`[P0-10]`, `[P1-01]`..`[P1-05]`, `[P2-01]`..`[P2-06]` (21 ATDD) + `[P0]`..`[P2]` gateway suites (14) + E2E-01..E2E-10 journeys (10)
- **Priority Distribution**:
  - P0 (Critical): 21 tests (10 ATDD + 9 gateway + 2 journeys umbrella)
  - P1 (High): 12 tests (5 ATDD + 3 gateway + 4 journeys)
  - P2 (Medium): 12 tests (6 ATDD incl. 1 EXPECTED RED + 2 gateway + 4 journeys deferred)
  - P3 (Low): 0
  - Unknown: 0

### Assertions Analysis

- **Total Assertions**: ~156 (atdd ~94, gateway ~62)
- **Assertions per Test**: ~4.5 avg (P0 volume loops assert 10 tiers + 5 coupling asserts each)
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.notEqual`, `assert.doesNotThrow`, `assert.deepEqual`, string `includes`/`test` gates

---

## Context and Integration

### What the Context Said

The context set (`spec-8-6-sfx-haptics.md`, `epic-8-context.md`, `test-design-epic-8-6-sfx-haptics.md`, `atdd-checklist-8-6-sfx-haptics.md`, plus source `sfx.ts`/`feel.ts`/`haptics.ts`/`assetManifest.ts`/`App.tsx`/`package.json`/`sfx.test.ts`) establishes: S8.6 closes Epic 8 with a thin swappable `expo-audio` observer (minimal cálido thock for merge/spawn/gameOver, no music, 3-kind cap, volume mirroring haptic `3 light 0.45 → 6 medium 0.65 → 12+ heavy 1.0` via `VOLUME_BY_HAPTIC` data, coupled per entry same order, predicate `from.length===2 && !spawned` shared 5-site, swappable `SfxGateway { play }` with `void playViaExpoAudio` dynamic `import('expo-audio').catch(()=>null)` dual API 57.0.3 `createAudioPlayer` vs `AudioPlayer`, never throw/never await/never block, FR-30 keep-sound never gate on `reducedMotion`, App coupling same site after `triggerHapticsForTrace`, assetManifest 3 placeholder `require` each `try/catch→null` degrade, SDK 57 pinned `expo-audio ~57.0.3`).

This context raised one contextual finding: the one EXPECTED RED ATDD case `[P2-06]` is correctly active (not skipped) product-gap signal — the suite should stay 20/21 until `triade/assets/sfx/*.wav` mastering lands, which the traceability `coverage-matrix-8-6-sfx-haptics.json` and `gate-decision-8-6-sfx-haptics.json` already track as deferred CONCERNS (waived per spec Residual risks + test-design R-003). Context did not waive H5/M2/L6 — a story note that a long ATDD file is "dense by design" would be a finding about the story, not a waiver.

### Related Artifacts

- **Story File**: [spec-8-6-sfx-haptics.md](../../implementation-artifacts/spec-8-6-sfx-haptics.md)
- **Test Design**: [test-design-epic-8-6-sfx-haptics.md](../test-design/test-design-epic-8-6-sfx-haptics.md) + [test-design-epic-8-6-sfx-haptics.md](../test-design-epic-8-6-sfx-haptics.md) (duplicate path)
  - **Risk Assessment**: 10 risks (R-001 BUS6, R-002 TECH6, R-003 TECH6, R-004 BUS6, R-005 TECH4, R-006 TECH4, R-007 OPS3, R-008 OPS3, R-009 PERF2, R-010 OPS1)
  - **Priority Framework**: P0-P3 applied
- **ATDD Checklist**: [atdd-checklist-8-6-sfx-haptics.md](../atdd-checklist-8-6-sfx-haptics.md)
- **Fixtures**: [feel-sfx-fixtures.ts](../fixtures/feel-sfx-fixtures.ts)
- **Benchmark**: [feel.bench.test.ts](../../triade/benchmarks/feel.bench.test.ts) (host sweep median <0.05 p99 <0.1)

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern
- **[network-first.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/network-first.md)** - Route intercept before navigate (race condition prevention)
- **[data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness
- **[component-tdd.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/component-tdd.md)** - Red-Green-Refactor patterns
- **[selective-testing.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)** - Duplicate coverage detection
- **[ci-burn-in.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/ci-burn-in.md)** - Flakiness detection patterns (10-iteration loop)
- **[test-priorities-matrix.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 classification framework

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../../.claude/skills/bmad-testarch-test-review/resources/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split `sfx.atdd.test.ts` into ≤300-line files (H5)** - extract P1 wiring and P2 scans/perf into `sfx.wiring.test.ts` / `sfx.perf.test.ts`
   - Priority: P1
   - Owner: Feel team
   - Estimated Effort: 20 min (file move + import path fix, no logic change)

2. **Split `sfx.gateway.spec.ts` into ≤300-line files (H5)** - trim header to ≤20 lines and extract helpers to fixtures, or split by P1/P2
   - Priority: P1
   - Owner: Feel team
   - Estimated Effort: 20 min (header trim + import fix)

3. **Import shared fixtures in atdd + gateway (M2)** - replace local `entry`/`mergeEntry` and 5 raw literals with `feel-sfx-fixtures.ts` imports
   - Priority: P2
   - Owner: Feel team
   - Estimated Effort: 15 min

### Follow-up Actions (Future PRs)

1. **Name bench thresholds and seed (L6)** - `DETERMINISTIC_SEED=42`, `BUDGET_MEDIAN_MS=0.05`, `BUDGET_TAIL_P99_MS=0.1`, `PERF_BENCH_ITERATIONS=1000`
   - Priority: P3
   - Target: backlog (next touch)

2. **Add wav mastering when ready** - `triade/assets/sfx/merge.wav|spawn.wav|gameover.wav` with same literals already wired (6-site allowlist), then re-run `npm --prefix triade test -- __tests__/feel/sfx.atdd.test.ts --test-name-pattern "P2-06"` → GREEN + device ear re-check rank `0.45/0.65/1.0 vs 0.35/0.9` + Reduce ON same, no code change required (NFR-3 degrade path exercised host + device, spec Residual)
   - Priority: P2
   - Target: next milestone (deferred work, not 8-6 gate — waived per spec)

### Re-Review Needed?

⚠️ Re-review after critical fixes — split the two oversize files, then re-review (quick confirm H5 gone → score 100, Approve with Comments; with only H5 fixed score 96 and remaining M2+L6 → still Approve with Comments). No deep re-review needed for L6.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Deterministic ledger has 2 HIGH (H5 oversize 461 >300 and 349 >300) → Request Changes per `deriveRecommendation`. Even though the test logic is Good (isolation, determinism, explicit assertions all PASS; swappable gateway + FR-30 + App coupling + 6-site/5-site allowlists + bench are best-practice), a HIGH violation blocks merge under the rubric. With both H5 splits, score becomes 100/100 and recommendation becomes Approve with Comments (remaining MEDIUM+LOWs are worth fixing, not blocking). The one EXPECTED RED ATDD case remains as product-gap signal — do not weaken the test to make it green.

**For Request Changes**:

> Test quality needs improvement with 91/100 score. 2 HIGH (oversize files 461 and 349 >300) must be fixed before merge. MEDIUM fixture bypass and LOW magic literals should be addressed alongside, but do not individually block merge. One intentionally RED case is a product gap, not a test defect.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| triade/__tests__/feel/sfx.atdd.test.ts:1 | P1 (High) | Test Length (≤300 lines) | 461 lines exceeds 300 (H5) | Split into ≤300-line files by P0/P1/P2 |
| _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:1 | P1 (High) | Test Length (≤300 lines) | 349 lines exceeds 300 (H5) | Split into ≤300-line files or trim header + extract helpers |
| triade/__tests__/feel/sfx.atdd.test.ts:18 + _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:44,146 | P2 (Medium) | Fixture Patterns / Data Factories | Local entry/mergeEntry bypass shared fixtures + 5 raw literals (M2) | Import feel-sfx-fixtures.ts |
| _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:55 + triade/__tests__/feel/sfx.atdd.test.ts:417,430 | P3 (Low) | Magic value | `seed=42` without named constant (L6) | `DETERMINISTIC_SEED=42` |
| triade/__tests__/feel/sfx.atdd.test.ts:417, _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts:323 | P3 (Low) | Magic value | Bench thresholds 0.05/0.1/1000 unnamed (L6) | `BUDGET_MEDIAN_MS` etc. |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-01 | 91/100 | A | 0 | ➡️ Stable (same H5+M2+L6 class as 8-1 95/100, 8-2 92/100, 8-3 91/100, 8-4 96/100, 8-5 96/100) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| triade/__tests__/feel/sfx.atdd.test.ts | 91/100 | A | 0 | Request Changes (H5 461 + M2) |
| _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts | 91/100 | A | 0 | Request Changes (H5 349 + M2) |
| _bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts | 100/100 | A | 0 | Approve (data-object, no ledger rows; manual device gate) |
| _bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts | — | — | — | Fixture helpers, not scored (302 lines noted but excluded per precedent) |

**Suite Average**: 94/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-8-6-sfx-haptics-20260901
**Timestamp**: 2026-09-01 21:00:00
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

<!-- Machine-readable evidence manifest. Every file actually reviewed, one repo-relative path per line, nothing else in this section: headless runners parse it verbatim as the reviewed-file list. -->

## Reviewed Files

- triade/__tests__/feel/sfx.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts
- _bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts

<!-- Machine-readable context manifest. Every context artifact actually read, one repo-relative path per line, or the single word `none`. Required whenever Context Basis is not `none`. These files were read, never scored: no path may appear in both this section and Reviewed Files. -->

## Review Context

- _bmad-output/implementation-artifacts/spec-8-6-sfx-haptics.md
- _bmad-output/implementation-artifacts/epic-8-context.md
- _bmad-output/test-artifacts/test-design/test-design-epic-8-6-sfx-haptics.md
- _bmad-output/test-artifacts/test-design-epic-8-6-sfx-haptics.md
- _bmad-output/test-artifacts/atdd-checklist-8-6-sfx-haptics.md
- triade/src/feel/sfx.ts
- triade/src/feel/feel.ts
- triade/src/feel/haptics.ts
- triade/src/services/assets/assetManifest.ts
- triade/App.tsx
- triade/package.json
- triade/__tests__/feel/sfx.test.ts
- _bmad/tea/config.yaml

<!-- Disclosure manifest. Present whenever anything a reader would expect in the reviewed set is not there; omit the whole section when nothing was excluded. One repo-relative path per line, each with one of the three reasons from step-02-discover-tests: `path does not exist`, `file could not be parsed`, or `format not scorable by the ledger`. When the run supplied an ---BEGIN UNSCORABLE--- block, reproduce every path in it here verbatim with the third reason, dropping none — the CLI rejects a report that dropped one. Nothing here was reviewed or scored, and no path here may appear in Reviewed Files. A manifest that silently omits a changed test artifact reads as though the diff held nothing else to review. -->

## Excluded From Review Set

- _bmad-output/test-artifacts/tests/feel/sfx.atdd.test.ts — format not scorable by the ledger (duplicate mirror of triade/__tests__/feel/sfx.atdd.test.ts — same 461-line content published at second path for test_artifacts; scored once at canonical triade path, not twice)
- triade/__tests__/feel/sfx.test.ts — format not scorable by the ledger (prior existing pin file from b16a06e delta, not part of ATDD working-tree delta under review; 11 cases already green, 837-pass umbrella gate keeps it as context not reviewed)
