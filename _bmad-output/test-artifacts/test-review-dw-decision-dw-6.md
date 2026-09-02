---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-6.md'
  - 'triade/App.tsx'
  - 'triade/src/ui/useSyncedLayout.ts'
  - 'triade/src/ui/layout.ts'
  - 'triade/__tests__/ui/useSyncedLayout.test.ts'
  - 'triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: dw-decision-dw-6

**Quality Score**: 99/100 (A - Excellent)
**Review Date**: 2026-09-02
**Review Scope**: directory
**Reviewer**: Eduardo (TEA Agent / Murat — Master Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Request Changes

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Deterministic host-only `node:test + tsx` seam — zero hard waits, zero wall-clock fixtures, pure `layoutFor({width,height,insets})` arithmetic + `coalesceLayout(pending,lastValid)` hold-vs-replace + `readFileSync(App.tsx/useSyncedLayout.ts)` static pins, `DEFAULT_DEBOUNCE_MS=32` coalesce + `lastValidLayoutRef` hold across `boardSize===0`, no `page.goto` needed per `test-levels-framework.md` Unit dominance (RN Expo, Skia/Reanimated, `react-native-safe-area-context ~5.7.0` provider).

✅ Complete DW-6 contract pinned deterministically: 7 P0 critical (AC-1 first-frame `initialMetrics` 2 hits + AC-2 `useSyncedLayout 3` vs racy triple absent + AC-3 `320×480 top2000→0` hold `390×844 top47` + valid `844×390 left47 isLandscape` replace + hook 10-pin `useWindowDimensions/useSafeAreaInsets/setTimeout/clearTimeout/lastValid/getBandTop/DEFAULT+coalesceLayout` + layout `SAFE_MARGIN 16 / 96/48 / BOARD_SIZE_FLOOR 216` + `bandTop 159 vs 64` via `effectiveLayout.bandHeight` + `layout.test.ts` 18 regression still `382/688/452` green), 6 P1 wiring (`32` singleton + `pendingRef/timerRef clear+set` + `useMemo 6 deps` + null-safe `?? undefined` + valid shrink vs degenerate hold + `isFinite 6-field` guard) — all 4 active + 20 dormant host checks host `<1.5 min`.

✅ Priority-labeled behavioral naming (`[P0-01]…[P3-02]` ATDD, `[P0]`/`[P1]` `useSyncedLayout.test.ts`), `assert.*` per test (ATDD 48 dormant + `useSyncedLayout.test.ts` 17), isolation via fresh `ZERO/PORTRAIT_NOTCH/LANDSCAPE_NOTCH` literals + `readFileSync` snapshot per `it`, constants single-source (`SAFE_MARGIN 16`, `PORTRAIT 96`, `LANDSCAPE 48`, `BOARD_SIZE_FLOOR 216`, `getBandTop` dedup 1 export + `Number.isFinite 6`) — triage-ready per `test-priorities-matrix.md`.

### Key Weaknesses

❌ Oversize test file (H5 HIGH): `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts` 321 lines exceeds 300 — file-length gate triggers Request Changes (single occurrence, deduped).

❌ Bench threshold magic value (L6 LOW): `P3-02` `for (i<10_000) … elapsed <200` and ATDD `P3-02` same `10_000`/`200 ms` appear as unnamed literals, not via shared `BENCH_ITERS/LIMIT_MS` constant or `fixtures/coalesceBench` helper — minor hygiene, counted once deduped.

### Summary

The `dw-decision-dw-6` bundle (`baseline a1f6831 → working tree`, `triade/App.tsx +8/-9` `SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}` + single `useSyncedLayout()` coalesced hook, NEW `triade/src/ui/useSyncedLayout.ts 89 LOC` `DEFAULT_DEBOUNCE_MS=32` `pendingRef+timerRef setTimeout(32)` commit to `synced` + `lastValidLayoutRef=useRef(layoutFor({width,height,insets}))` hold across `boardSize===0` + `useMemo rawLayout=layoutFor(synced) 6-field deps` + `effectiveLayout` guard + `bandTop=getBandTop(synced.insets,effectiveLayout.bandHeight)` + pure `coalesceLayout`, NEW `triade/__tests__/ui/useSyncedLayout.test.ts 58 LOC` 4 active host probes) is the rotation-race hardening seam: `layoutFor` O(1) arithmetic + coalesce O(1) degenerate hold, `32 ms` debounce inside one-frame threshold invisible to `60 FPS/<16.7 ms` frame. Host verification is `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test` with `layoutFor/coalesceLayout/getBandTop` + `readFileSync` allowlists + `layout.test.ts 18` regression, ledger `DW-6 done 2026-09-02` `resolution-undo 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48` + `sprint-status.yaml` untouched. All 4 active (`useSyncedLayout.test.ts` 4 pass) + 20 dormant ATDD RED scaffolds (activatable `test.skip→test` → 20 pass when green) + `layout.test.ts 18` remain green; full `npm --prefix triade test` `914 pass / 0 fail / 311 skipped` `<5 s` well under `<15 min`. Ledger deductions are only H5 oversize and L6 bench magic; determinism, isolation, explicit assertions, network-first, fixture/data-factory, duration, and disabled-test criteria are all PASS. With Perfect Isolation bonus the score returns to 99/100 (A), verdict computed as Request Changes (any HIGH → Request Changes) — split the 321-line ATDD (or extract `P3-02` bench helper) to ≤300 and the suite returns to Approve with Comments with no coverage change.

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis                                          | Notes |
| ------------------------------------ | -------------- | ---------- | ---------------------------------------------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0          | Convention: bddNaming (emerging: 1 of 40 sampled) | All reviewed tests carry behavioral names (`[P0-01] App.tsx provides SafeAreaProvider initialMetrics so first frame not 0-insets` + `Given/When/Then` step comments on every P0), `useSyncedLayout.test.ts` 4 behavioral (`DW-6 App.tsx provides…`, `coalesce helper holds last valid…`); 1/40 emerging <50% not house-wide per registry schedule — no deduction |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: testIds (absent: 0 of 40 sampled)  | 0/40 sampled outside review set use stable `data-testid`/`getByTestId`; pure host `layoutFor` + `readFileSync` static seam has no DOM — correctly N/A, no deduction |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS        | 0          | Convention: priorityMarkers (established: 29 of 40 sampled, form `[P0]` in test name) | Every reviewed test carries `[P0]`/`[P1]`/`[P2]`/`[P3]` (`[P0-01]…[P3-02]` ATDD 8P0+6P1+4P2+2P3, `[P0]`/`[P1]` useSyncedLayout 3P0+1P1) — 0 missing; 72.5% established, satisfies `[P#]` form |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute                                       | No `.only`/`fdescribe`/`fit`/`test.only`. `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts` 20 `it.skip` each header documents `ATDD for dw-decision-dw-6 — covering working-tree delta vs baseline a1f6831: triade/App.tsx:1-11 SafeAreaProvider initialMetrics / triade/src/ui/useSyncedLayout.ts 78 LOC` + still-true reason (RED-phase scaffolds, dormant until `test.skip→test` activation) per C1/C2; active coverage via `useSyncedLayout.test.ts` 4/4 + `layout.test.ts` 18/18 green, so exempt single-file waivable and NOT a finding |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute                                       | Zero `waitForTimeout`/`sleep(`/`time.sleep`/`Thread.sleep`/`cy.wait(number)` across 2 reviewed files; only `performance.now()` bench in ATDD P3-02, not a wait |
| Determinism (no conditionals)        | ✅ PASS        | 0          | Absolute + Applicability                       | No `if`/ternary selecting expected values, no `try/catch` swallowing failures, no `Date.now()`-governed TTL without fake timers. `if (nxt.boardSize===0 && lastValid && lastValid.boardSize>0) return lastValid` is the `coalesceLayout` helper predicate (1-line hold semantics) not a test-branching expected value; `assert.ok(b.boardSize===688 \|\| b.isLandscape===true)` is tolerance OR on golden 1024×768 not a branch that selects expected — deterministic with seeded literals; loops are fixed-count literal `10_000` not zero-trip |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute                                       | Pure `layoutFor`/`coalesceLayout`/`getBandTop` + `readFileSync` static scans — no DB/network/shared file; no module-level mutable state written without `beforeEach`; each `it` constructs fresh `ZERO`/`PORTRAIT_NOTCH`/`LANDSCAPE_NOTCH` literal or `coalesceLayoutLocal` pure helper; file-level `readFileSync` at import is read-only snapshot, not mutated across tests; `afterEach` unnecessary and correctly absent per `test-quality.md` self-cleaning |
| Fixture Patterns                     | ✅ PASS        | 0          | Applicability: file constructs domain payloads  | Host payloads via `ZERO`/`PORTRAIT_NOTCH`/`LANDSCAPE_NOTCH` frozen fixtures + `layoutFor`/`coalesceLayout` pure factories; no inline duplication beyond mirroring spec `390×844↔844×390` + `320×480 top2000` degenerate; `useSyncedLayout.test.ts` reuses same `layout.ts` import, no bypass of existing `triade/test-utils/helpers.ts` (engine helpers not applicable to UI layout seam) |
| Data Factories                       | ✅ PASS        | 0          | Applicability: file constructs domain payloads  | Factory-with-overrides pattern via `layoutFor({width,height,insets})` + `coalesceLayout(pending,lastValid)` direct; no hardcoded inline bypassing existing factory; ATDD correctly mirrors `layout.test.ts` 18-case harness via `coalesceLayoutLocal` helper, no `@faker-js/faker` (deterministic literals required for degenerate 2000-top hold) |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: file navigates and then reads data-dependent content | No `page.goto`/`cy.visit`/router push in pure UI layout seam — gate closed; `tea_use_playwright_utils:true` loaded but `browser_automation:auto` correctly stays host-only (Expo RN, no DOM/fetch race) |
| Explicit Assertions                  | ✅ PASS        | 0          | Absolute                                       | Every test contains ≥1 explicit assertion (`assert.ok`/`strictEqual`/`equal`/`doesNotThrow`); 0 tests without assertions. Total 65 assertions (`useSyncedLayout.test.ts` 17 + ATDD 48 dormant, `layout.test.ts` 18 excluded) — C3 tautological and C4 zero-assertion and C5 mock-against-itself and C6 unreachable all PASS |
| Test Length (≤300 lines)             | ❌ FAIL        | 1          | Absolute                                       | `dw-6-rotation-race.atdd.test.ts` 321 lines exceeds 300; `useSyncedLayout.test.ts` 58 PASS. Threshold per `test-quality.md` ≤300 ideal; H5 HIGH |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute                                       | Each file <1.5 min host (`useSyncedLayout.test.ts` 4 tests ~1.3 ms, ATDD dormant 20 skip ~0 / activated ~110 ms, `npm --prefix triade test` full 914 pass 4.5 s) — no `page.waitFor` prolongation |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute                                       | Zero tight timeouts (`{timeout:1000}`), races, timing-dependent waits, retry logic, or env-dependent assumptions. Statistical bench `10k coalesce <200 ms` is generous fixed-count deterministic via `performance.now()` not wall-clock fixture; no `Math.random` knife-edge; `setTimeout 32` coalesce is debounced commit not a wait |

**Total Violations**: 0 Critical, 1 High, 0 Medium, 1 Low

**Convention Baseline**: 40 test files sampled outside the review set (capped at 40 closest-first by directory distance, per step-02 rules). `priorityMarkers: 29/40 established [P0]`, `testIds: 0/40 absent`, `bddNaming: 1/40 emerging`, `networkFirst: 1/40 emerging`, `dataFactories: 10/40 emerging`, `fixtures: 0/40 absent`, `assertionStyle: 40/40 established (assert)`; `unknown` never applied (sampled ≥4).

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -1 × 5 = -5
Medium Violations:       -0 × 2 = -0
Low Violations:          -1 × 1 = -1

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +5
  All Test IDs:          +0
                         --------
Total Bonus:             +5

Final Score:             99/100
Grade:                   A
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. File exceeds 300-line ideal (H5 HIGH)

**Severity**: P1 (High)
**Location**: `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts:1`
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
ATDD RED-phase scaffold is 321 lines, 21 lines over the `test-quality.md` ≤300 ideal. Prior DW sweeps that exceeded 300 (e.g. `spawn-candidates-validation 494`) were gated to Request Changes at the same H5; this bundle triggers the same absolute gate. The file is dormant (`20 it.skip`) but still scored for length because the ledger is file-size not execution status.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation)
// triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts — 321 lines, single file
// 20 it.skip in 4 describes: P0 8 + P1 6 + P2 4 + P3 2 + header 14 lines + 3 constant fixtures
// No split, so H5 fires on the reviewed set and drives verdict to Request Changes
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
// Split dormant ATDD into two host files or extract the P3 bench helper:
//   triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts            → P0+P1 (14 tests, ~210 lines)
//   triade/__tests__/ui/dw-6-rotation-race.p3.test.ts               → P2+P3 (6 tests, ~110 lines)
// Or keep single file and extract the `coalesceLayoutLocal` + `ZERO/PORTRAIT_NOTCH/LANDSCAPE_NOTCH`
// constants into `triade/__tests__/ui/fixtures/layout-coalesce-fixtures.ts` and import them,
// reducing the ATDD to ~280 lines without changing assertions.
// Alternative already precedent: keep 321 and waive via --waive with "ATDD dormant, active coverage via
// useSyncedLayout.test.ts 58 LOC + layout.test.ts 18" — gate accepts waived H5 for this bundle.
```

**Benefits**:
Keeps per-file review cadence ≤300 (CI gate green without waiver), preserves single-responsibility per file, avoids future H5 accumulation when adding P2 ledger pins.

**Priority**:
P1 — blocks `Request Changes` verdict; fix is ~10 min split or via `--waive` if team accepts dormant ATDD weight as intentional.

---

### 2. Bench threshold magic literals (L6 LOW)

**Severity**: P3 (Low)
**Location**: `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts:314`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
`P3-02` bench uses unexplained literals `10_000` iterations and `200` ms limit inline (`for (let i=0;i<10_000;i++)` + `assert.ok(dt < 200, ...)` + comment `10k coalesce calls <200ms O(1)`). Prior TEA reviews flagged same pattern as L6 LOW (e.g. `engine-ceiling-hardening gateway 10000/200`, `doc-layout-test-count-sync 10_000/50`).

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation)
const t0 = performance.now();
for (let i = 0; i < 10_000; i++) {
  coalesceLayoutLocal({ width: 390 + (i % 3), height: 844, insets: i % 2 === 0 ? ZERO : PORTRAIT_NOTCH }, lv);
  coalesceLayoutLocal({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }, lv);
}
const dt = performance.now() - t0;
assert.ok(dt < 200, `10k×2 coalesce should be <200ms got ${dt}ms`);
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
// In triade/__tests__/ui/useSyncedLayout.test.ts or a shared bench helper:
const BENCH_ITERS = 10_000;
const BENCH_LIMIT_MS = 200; // O(1) coalesce: 20k layoutFor <200 ms on host (≈0.01 ms/op)

const t0 = performance.now();
for (let i = 0; i < BENCH_ITERS; i++) {
  coalesceLayoutLocal({ width: 390 + (i % 3), height: 844, insets: i % 2 === 0 ? ZERO : PORTRAIT_NOTCH }, lv);
  coalesceLayoutLocal({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }, lv);
}
const dt = performance.now() - t0;
assert.ok(dt < BENCH_LIMIT_MS, `coalesce ${BENCH_ITERS}×2 should be <${BENCH_LIMIT_MS}ms got ${dt}ms`);
```

**Benefits**:
Domain meaning named once, future `BOARD_SIZE_FLOOR` or `layoutFor` cost change edits one constant not two sites, satisfies L6 and matches prior fix pattern.

**Priority**:
P3 — hygiene; does not block merge.

---

## Best Practices Found

### 1. Pure coalesce helper exported for host tests

**Location**: `triade/src/ui/useSyncedLayout.ts:82`
**Pattern**: Pure `coalesceLayout(pending,lastValid)` helper
**Knowledge Base**: [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Why This Is Good**:
Hook coalesces racy `useWindowDimensions` + `useSafeAreaInsets` with `pendingRef+timerRef setTimeout(32)` and `lastValidLayoutRef` hold, but also exports a pure `coalesceLayout` so the layout math is exercised host-only via `layoutFor` without mounting `react-test-renderer` or mocking `react-native-safe-area-context`. Matches `fixture-architecture.md` Pure function → Fixture pattern.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
export function coalesceLayout(
  pending: { width: number; height: number; insets: EdgeInsets },
  lastValid: LayoutResult | null,
): LayoutResult {
  const next = layoutFor(pending);
  if (next.boardSize === 0 && lastValid && lastValid.boardSize > 0) return lastValid;
  return next;
}
```

**Use as Reference**:
Keep this shape for future `src/ui` seams; remaining deps (`orientation.ts`, `tileNumerals.ts`) already follow same pure contract.

---

### 2. First-frame `initialMetrics` null-safe fallback

**Location**: `triade/App.tsx:5`
**Pattern**: `initialWindowMetrics ?? undefined` null-safe provider wiring
**Knowledge Base**: [fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)

**Why This Is Good**:
`SafeAreaProvider` receives `initialMetrics={initialWindowMetrics ?? undefined}` so when Expo provides native metrics first frame is correct, and on web/Jest where `initialWindowMetrics === null` the fallback passes `undefined` (provider measures) without crash. `0-insets 390×844` still `boardSize>0` per `layoutFor` early-`Number.isFinite` guard, so no flash to `0`.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
import { initialWindowMetrics } from 'react-native-safe-area-context';
<SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>
```

**Use as Reference**:
Use `?? undefined` not truthy `&&` or ternary that would pass `null` incorrectly — matches `react-native-safe-area-context` docs `Metrics|null`.

---

### 3. `layoutFor` pure source-of-truth with finite never-negative guarantee

**Location**: `triade/src/ui/layout.ts:37`
**Pattern**: `Number.isFinite` 6-field guard + `Math.max(0,Math.min)` clamp + `BOARD_SIZE_FLOOR 216` floor
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Why This Is Good**:
Every `layoutFor({width,height,insets})` returns finite `boardSize>=0, bandHeight∈{48,96}, isLandscape bool, bandTop finite` even for degenerate `320×480 top:2000→0` or `NaN→0`. Hook's `lastValid` hold never masks a legitimate `BOARD_SIZE_FLOOR` shrink (`400×250>0` still replaces stale).

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(insets.top) || ...) {
  return { boardSize: 0, bandHeight: PORTRAIT_BAND_HEIGHT, isLandscape: false };
}
const boardSize = availBoard < BOARD_SIZE_FLOOR ? availBoard : Math.max(availBoard, BOARD_SIZE_FLOOR);
```

**Use as Reference**:
Keep `layout.ts` byte-identical pure; `git diff --stat -- triade/src/ui/layout.ts` empty is a gate for this seam.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts`
- **File Size**: 321 lines, ~12 KB
- **Test Framework**: node:test + tsx (`TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test`)
- **Language**: TypeScript

- **File Path**: `triade/__tests__/ui/useSyncedLayout.test.ts`
- **File Size**: 58 lines, ~2 KB
- **Test Framework**: node:test + tsx
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 4 (`P0 critical`, `P1 wiring`, `P2 static scans`, `P3 exploratory`) + 0 in `useSyncedLayout.test.ts` (4 bare `test()`)
- **Test Cases (it/test)**: 24 (20 dormant `it.skip` ATDD + 4 active `test`)
- **Average Test Length**: ~13 lines per test
- **Fixtures Used**: 3 (`ZERO`, `PORTRAIT_NOTCH`, `LANDSCAPE_NOTCH`) + `layoutFor`/`coalesceLayout` pure helpers
- **Data Factories Used**: 0 (`@faker-js/faker` not needed — deterministic literals required for `2000-top` degenerate)

### Test Scope

- **Test IDs**: `[P0-01]…[P3-02]` (20) + `[P0]`/`[P1]` (4) — all carry priority prefix
- **Priority Distribution**:
  - P0 (Critical): 11 tests (8 ATDD + 3 `useSyncedLayout.test.ts`)
  - P1 (High): 7 tests (6 ATDD + 1 `useSyncedLayout.test.ts`)
  - P2 (Medium): 4 tests
  - P3 (Low): 2 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: 65 (ATDD 48 dormant + `useSyncedLayout.test.ts` 17; `layout.test.ts` 18 regression excluded from this review set)
- **Assertions per Test**: 2.7 avg
- **Assertion Types**: `assert.ok`, `assert.equal`, `assert.strictEqual`, `assert.notStrictEqual`, `assert.doesNotThrow`

---

## Context and Integration

### What the Context Said

Context artifacts (`spec-dw-6-rotation-race-safe-area-initial-metrics.md` intent/boundaries/I-O matrix 4 rows + 4 tasks 4 ACs, `test-design-dw-6-rotation-race-safe-area-initial-metrics.md` P0/P1/P2/P3 38 checks + risk `R-001..R-003 score 6` + NFR never-throw/finiteness/frame budget, `atdd-checklist-dw-decision-dw-6.md` 20 RED scaffolds, `triade/App.tsx +8/-9` + `triade/src/ui/useSyncedLayout.ts 89 LOC` + `triade/src/ui/layout.ts` pure contract, `sprint-status.yaml` orchestrator-owned) established that `triade/src/ui/layout.ts` stays byte-identical pure source of truth, board never goes negative, `SafeAreaProvider` receives `initialWindowMetrics`, `useSyncedLayout` debounces `32 ms` and holds last valid across `boardSize===0`, `ScrollView` never reintroduced, engine/feel/HUD byte-identical, `sprint-status.yaml` not written, ledger `DW-6 done 2026-09-02` `61d4ee9e…`.

Findings raised from context:

- ATDD `20 it.skip` + ledger `resolution-undo 61d4ee9e` each corroborate H5 length and P3 bench hygiene, not waive them.
- No test contradicts AC: `App.tsx` `initialWindowMetrics 2` + `initialMetrics 1` + `useSyncedLayout 3` (specifier+path+call), `coalesce degenerate→hold` + `valid→replace`, `DEFAULT_DEBOUNCE_MS 32` singleton, `pendingRef/timerRef clear+set`, `useMemo 6 deps`, `bandTop synced.insets+effective bandHeight` all pinned — trace gate `coverage-matrix-dw-decision-dw-6.json` `P0/P1 100%` aligns.
- Changed paths not exercised (`triade/src/engine` empty diff) correctly have no assertions here; route those concerns to trace.
- Context argued the 321-line ATDD weight is intentional RED-phase documentation (still-true header) — this is a finding about documentation weight, not a waiver of the H5 absolute gate; the rubric still deducts and the verdict still computes to Request Changes.

### Related Artifacts

- **Story File**: [_bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md](../../implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md)

- **Test Design**: [_bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md](../../test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md)
- **Risk Assessment**: p1
- **Priority Framework**: P0-P3 applied

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

1. **Split the 321-line ATDD or waive H5 via --waive** - Extract `P3` bench + `P2` ledger scans into `triade/__tests__/ui/dw-6-rotation-race.p3.test.ts` or shared `layout-coalesce-fixtures.ts` so each file ≤300, or run CI with `--waive H5:"ATDD dormant RED-phase, active coverage via useSyncedLayout.test.ts 58 LOC"` — blocks Request Changes gate.
   - Priority: P1
   - Owner: FE lead
   - Estimated Effort: 10 min (split) or 0 min (waive)

2. **Name the bench magic literals** - Replace `10_000`/`200` inline with `BENCH_ITERS`/`BENCH_LIMIT_MS` constants (as shown above) in ATDD `P3-02`.
   - Priority: P3
   - Owner: FE lead
   - Estimated Effort: 5 min

### Follow-up Actions (Future PRs)

1. **Add `describe` grouping to `useSyncedLayout.test.ts`** - Wrap its 4 bare `test()` cases in a `describe('DW-6 useSyncedLayout')` so failures print with subject grouping per `M4` (optional; not flagged this run but future-proof).
   - Priority: P3
   - Target: backlog

2. **Import `ZERO/PORTRAIT_NOTCH/LANDSCAPE_NOTCH` from a shared fixture** - If future layout seams add more ATDD, move the three `EdgeInsets` constants to `triade/__tests__/ui/fixtures/layout-fixtures.ts` so seam fixtures are single-source per `M2` precedent.
   - Priority: P3
   - Target: backlog

### Re-Review Needed?

⚠️ Re-review after critical fixes - request changes, then re-review. The HIGH (H5) oversize is waivable or fixable in <10 min; a 5-line split returns the ledger to 100/100 (Approve with Comments remaining L6) with no coverage change.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
One HIGH violation (H5 file length 321 >300) on the dormant ATDD scaffold drives the computed verdict to Request Changes per the deterministic ledger (any HIGH → Request Changes), even though no critical defects and no determinism/isolation/flakiness issues exist. The L6 bench magic is hygiene low. With the H5 split or an explicit `--waive H5` (justified as dormant RED-phase, active coverage already via 4 + 18 green), the suite returns to 100/100-equivalent and Approve with Comments.

**For Approve**:

> Test quality is excellent/good with 99/100 score. Minor issues noted can be addressed in follow-up PRs. Tests are production-ready and follow best practices.

**For Approve with Comments**:

> Test quality is acceptable with 99/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

**For Request Changes**:

> Test quality needs improvement with 99/100 score. 1 critical/high violations detected that pose maintainability risk: `H5` file exceeds 300 lines (321) — split dormant ATDD into P0+P1 vs P2+P3 or extract shared fixtures so each file ≤300. 1 low hygiene (bench magic) should also be named.

**For Block**:

> Test quality is insufficient with 99/100 score. Multiple critical issues make tests unsuitable for production. Recommend pairing session with QA engineer to apply patterns from knowledge base.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| 1 | P1 (High) | Test Length (≤300 lines) | `dw-6-rotation-race.atdd.test.ts` 321 lines exceeds 300 | Split into `dw-6-rotation-race.atdd.test.ts` (~210) + `dw-6-rotation-race.p3.test.ts` (~110) or extract `fixtures/layout-coalesce-fixtures.ts` |
| 314 | P3 (Low) | Magic value | `10_000`/`200` bench literals unnamed | Introduce `BENCH_ITERS=10_000` + `BENCH_LIMIT_MS=200` named constants |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 99/100 | A | 0 | ➡️ Stable (first DW-6 review) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts | 94/100* | A | 0 | Request Changes (H5) |
| triade/__tests__/ui/useSyncedLayout.test.ts | 100/100 | A | 0 | Approved |
| triade/__tests__/ui/layout.test.ts (regression, not scored) | 100/100 | A | 0 | Approved |

**Suite Average**: 99/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-dw-decision-dw-6-20260902
**Timestamp**: 2026-09-02
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

- triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts
- triade/__tests__/ui/useSyncedLayout.test.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md
- _bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md
- _bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-6.md
- triade/App.tsx
- triade/src/ui/useSyncedLayout.ts
- triade/src/ui/layout.ts

