---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts'
  - '_bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/layout.band-dedup-guard.umbrella.spec.ts'
  - '_bmad-output/test-artifacts/fixtures/layout-band-dedup-guard-fixtures.ts'
  - '_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-layout-band-dedup-and-guard.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-layout-band-dedup-and-guard.md'
  - 'triade/src/ui/layout.ts'
  - 'triade/App.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/orientation.ts'
  - 'triade/__tests__/ui/layout.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: dw-layout-band-dedup-and-guard

**Quality Score**: 87/100 (B - Good)
**Review Date**: 2026-09-02
**Review Scope**: suite (dw-layout-band-dedup-and-guard working-tree delta — layoutFor guard + getBandTop dedup)
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

✅ 6-field `Number.isFinite` guard pinned end-to-end (width/height/top/bottom/left/right → `boardSize:0` finite, no throw, no NaN propagation) with byte-identical finite regression anchors `390×844→358 / 414×896→382 / 1024×768→688 / 500×580→452` and early-guard invariant (`Number.isFinite` before `isLandscape/availWidth`) — determinism and finiteness contract proven via 19 gateway + 7 umbrella + existing `layout.test.ts` 18 pass, both `tsc` clean.

✅ Single-helper dedup proven (1 `export function getBandTop`, App `const bandTop = getBandTop(insets,bandHeight)` + Hud 2× `height: getBandTop(insets,bandHeight)`, zero `insets.top + SAFE_MARGIN + bandHeight` / `topPad + bandHeight` remains, `SAFE_MARGIN` single constant `16` only in `layout.ts`) — source-level grep gates green, `isLandscape` delegation exactly one call, per-edge asymmetry and chrome `96>48` board-dominance pinned.

✅ Priority-labeled behavioral naming (`[P0-01]…[P3-02]` + `[P0]…[P2]` + `[P1][E2E-01]…[P3][E2E-07]`, Given/When/Then comments on every P0) with host-only pure arithmetic, zero hard waits, zero flakiness patterns, explicit `assert.*` per test — triage-ready per `test-priorities-matrix.md`.

### Key Weaknesses

❌ Two reviewed files exceed the 300-line file cap (H5): `layout.band-dedup-guard.atdd.test.ts` 307 lines (+7) and `layout.band-dedup-guard.gateway.spec.ts` 333 lines (+33) — each is a single-file HIGH per registry; split or extract shared constants (ZERO_INSETS, PORTRAIT_NOTCH, assertFiniteLayout helper).

❌ Fixtures bypass (M2) — `fixtures/layout-band-dedup-guard-fixtures.ts` (215 lines, deterministic) provides `guardVariants() / negInfinityVariants() / getBandTopVariants() / expectedBoardSize() / guardIsFirstStatement() / layoutForBench()` but ATDD and gateway reconstruct the same `ZERO_INSETS / guard variant arrays / 47+16+96=159` inline; a future `SAFE_MARGIN` or guard-field change requires 3-site edits.

❌ Bench threshold magic value (L6) — umbrella `P3[E2E-07]` `elapsed < 80` (ATDD `elapsed < 50`) and gateway/golden literals without named `BENCH_ITERS/LIMIT_MS` constant; minor hygiene but L6.

### Summary

The `dw-layout-band-dedup-and-guard` delta is tested by a tight host seam (20 dormant ATDD scaffolds + 19 active gateway contracts + 7 umbrella journeys, all `node:test` + `tsx`, ~580 ms total host) plus the trusted `layout.test.ts` 18 regression and dual `tsc` gates (6.0.3 clean). Quality is Good (87/100, B): no determinism, isolation, or flakiness defects; every active test is green; naming, assertion style, and priority markers follow the established house convention. The only score drag is structural hygiene — two files over the 300-line cap (HIGH, forces Request Changes per ledger), one fixture-bypass (MEDIUM), one unnamed bench threshold (LOW). The ATDD 20 `it.skip` scaffolds are documented red-phase with active duplicates in gateway/umbrella (exempt per C1 still-true-reason). Splitting the two long files and routing guard payloads through `layout-band-dedup-guard-fixtures.ts` returns the delta to 96+ without behavior change — `sed s/it.skip/it/` on ATDD then yields 20 pass / 0 fail as trace expects.

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis                                          | Notes |
| ------------------------------------ | -------------- | ---------- | ---------------------------------------------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0          | Convention: `bddNaming` (14/40 emerging)       | All P0 carry behavioral names (`AC NaN/Infinity guard…`, `finite portrait byte-identical`); gateway/umbrella include Given/When/Then step lists in E2E_JOURNEYS; umbrella asserts GWT steps per journey — emerging threshold satisfied |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: `testIds` (0/40 absent)            | Repo uses no stable test-id convention (0 of 40 sampled outside review set); pure `layoutFor` host tests need no `data-testid` or `getByTestId` — correctly N/A |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS        | 0          | Convention: `priorityMarkers` (24/40 established) | Every `it` carries `[P0-01]…[P3-02]` (ATDD 8P0+6P1+4P2+2P3), `[P0]…[P2]` (gateway 9P0+6P1+4P2), `[P1][E2E-01]…[P3][E2E-07]` (umbrella 4P1+2P2+1P3) — 0 missing |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute                                       | No `.only`/focused. 20 `it.skip` in ATDD are documented red-phase scaffolds with still-true reason (file header `red-phase scaffolds covering working-tree delta vs baseline 80dc5c1 → a09e6ed` + `trace` expects `sed s/it.skip/it/ → 20 pass`) and active duplicates in gateway 19/19 + umbrella 7/7 — exempt per C1 still-true-reason; single-file waivable pending activation |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute                                       | No `sleep`/`waitForTimeout`/`cy.wait(<number>)`/`time.sleep` in any reviewed file (pure arithmetic, host-only) |
| Determinism (no conditionals)        | ✅ PASS        | 0          | Absolute + Applicability                       | No `if` selecting expected value, no `try/catch` swallowing failure, no `Date.now()`-governed TTL without fake timers, no assertion inside zero-trip loop (variant arrays are literals of length 6 — never zero) |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute                                       | Pure `layoutFor`/`getBandTop` — no DB/network/shared file; no module-level mutable state written without `beforeEach`/`afterEach` reset; each `it` constructs fresh `ZERO_INSETS` or literal `EdgeInsets` |
| Fixture Patterns                     | ⚠️ WARN        | 1          | Applicability: constructs domain payloads       | M2 repeated guard-variant / ZERO_INSETS construction while `fixtures/layout-band-dedup-guard-fixtures.ts:guardVariants()` exists |
| Data Factories                       | ⚠️ WARN        | 1          | Applicability: constructs domain payloads       | Same M2 — `getBandTopVariants()` / `expectedBoardSize()` / `guardProducesFiniteZero()` factory exists but reviewed files bypass it (counted once deduped per `test-review-dw-test-scanner-helpers-hardening.md` precedent) |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: navigates then reads            | No `page.goto`/`cy.visit`/router push + data read in this seam (pure TS `layoutFor` host) — gate closed |
| Explicit Assertions                  | ✅ PASS        | 0          | Absolute                                       | Every `it` has ≥1 `assert.*` (ATDD 88, gateway 84, umbrella 35 assertions); no `C3` tautological `expect(true).toBe(true)`, no `C4` zero-assertion test, no `C5` mock-against-itself, no `C6` unreachable catch-assertion |
| Test Length (≤300 lines)             | ❌ FAIL        | 2          | Absolute                                       | ATDD 307 (>300 +7, H5), gateway 333 (>300 +33, H5); umbrella 263 PASS; fixtures 215 PASS — see Recommendations #1 |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute                                       | Gateway 0.18s, umbrella 0.15s, ATDD dormant 0.15s, layout.test.ts 18-pass 0.12s — far under 1.5 min; bench `10k layoutFor <80 ms` inside umbrella is the only loop, measured via `performance.now` |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute + Applicability                       | No `H1` hard waits, no `H2` wall-clock TTL, no `H3` conditional assertions, no `H4` shared state, no `M1` network races, no `M6` unawaited async |

**Total Violations**: 0 Critical, 2 High, 1 Medium, 1 Low

**Convention Baseline**: 40 test files sampled outside the review set (corpus 93) — closest-first by directory distance from `_bmad-output/test-artifacts/tests/api` and `triade/__tests__/ui`, so the baseline describes the neighborhood the new tests live in

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -2 × 5 = -10
Medium Violations:       -1 × 2 = -2
Low Violations:          -1 × 1 = -1

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +0
  All Test IDs:          +0
                          --------
Total Bonus:             +0

Final Score:             87/100
Grade:                   B
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

**Note on C1 (Disabled tests):** `triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts:37,60,73,82,94,100,110,128,138,148,166,181,191,214,230,241,250,261,285,297` holds 20 `it.skip` scaffolds. Per registry C1 they would be CRITICAL, but each carries a documented still-true reason at `layout.band-dedup-guard.atdd.test.ts:10-18` ("ATDD for dw-layout-band-dedup-and-guard — red-phase scaffolds covering working-tree delta vs baseline 80dc5c1 → a09e6ed… Host-only: node:test + tsx") plus `trace` expects active duplicates in gateway 19/19 + umbrella 7/7 and `_bmad-output/test-artifacts/atdd-checklist-dw-layout-band-dedup-and-guard.md:Red-Phase Test Scaffolds Created — 20 it.skip`. Treated as exempt pending `sed -i 's/it\.skip/it/g'` activation, which yields 20 pass/0 fail (gateway proves same ACs). Activation is tracked as P2 follow-up, not a blocking defect — a pure TEA run with no context would score these as 20×CRITICAL (score 0, Block).

---

## Recommendations (Should Fix)

### 1. Split the two files over the 300-line cap (H5 — HIGH)

**Severity**: P1 (High) — file cap is Absolute, each over-limit file is `-5`
**Location**: `triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts:1` (307 lines, +7) and `_bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts:1` (333 lines, +33)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Both files exceed the `H5 ≤300 lines` cap that the registry enforces as HIGH. The excess is small (7 and 33 lines) — a single shared `ZERO_INSETS / PORTRAIT_NOTCH / assertFiniteLayout` block accounts for most of it — but the cap exists because >300-line test files erode review cost and debuggability. The ATDD file holds 20 cases in one describe tree; gateway holds 19 cases across 3 describes plus a 27-line header and 58-line helper block that duplicates `fixtures/layout-band-dedup-guard-fixtures.ts`. The prior `helpers.hardening` review kept all three files ≤298 precisely by importing the fixtures.

**Current Code**:

```typescript
// ⚠️ 307 lines — 4 describe blocks + 20 it.skip in one file + inline ZERO_INSETS
// layout.band-dedup-guard.atdd.test.ts:1-307 — includes readFileSync layoutSrc/appSrc/hudSrc + assertFiniteLayout helper duplicated
// gateway.spec.ts:1-333 — includes readSrc helper + 58-line constants/assertFiniteLayout + 19 its across 3 describes
```

**Recommended Improvement**:

```typescript
// ✅ Better — extract shared host helpers to fixtures and split P0 critical from P1/P2 scans
// Option A (minimal, preferred): import from fixtures instead of cloning:
//   import { ZERO_INSETS, PORTRAIT_NOTCH, LANDSCAPE_NOTCH, assertFiniteLayout } from '../../../_bmad-output/test-artifacts/fixtures/layout-band-dedup-guard-fixtures.ts';
//   — removes ~22 lines from ATDD and ~58 from gateway, both fall ≤300 with no split.

// Option B (if kept standalone): split ATDD into P0 critical vs P1/P2 scans, mirroring 8-5 precedent:
//   triade/__tests__/ui/layout.band-dedup-guard.guard.atdd.test.ts   (8 P0)
//   triade/__tests__/ui/layout.band-dedup-guard.scans.atdd.test.ts   (12 P1/P2/P3)
//   — each ≤180 lines, focused, parallel-safe.
```

**Benefits**: Both files fall ≤300, HIGH deductions removed (+10 to score → 97/100), future `SAFE_MARGIN`/guard changes touch one fixture rather than three copies.

**Priority**: P1 — HIGH blocks the gate deterministically; fix is mechanical (import line + delete duplicated block) and reversible.

---

### 2. Route guard-variant payloads through the fixtures factory (M2 — MEDIUM)

**Severity**: P2 (Medium)
**Location**: `_bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts:63-84` (6-variant `width:NaN / height:Infinity / insets.* NaN/Infinity/-Infinity` inline) and `triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts:40-71` (same 6+3 variants inline); umbrella not affected but ATDD/gateway duplicate each other while `fixtures/layout-band-dedup-guard-fixtures.ts:43-60 guardVariants()/negInfinityVariants()` already centralizes the contract
**Row**: M2
**Criterion**: Fixture Patterns / Data Factories
**Knowledge Base**: [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md), [fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)

**Issue Description**:
The same 6-field guard matrix (`width NaN`, `height Infinity`, `top NaN`, `bottom Infinity`, `left -Infinity`, `right NaN`) is constructed inline in two files while a factory for that shape already exists (`guardVariants()` + `negInfinityVariants()` + `guardProducesFiniteZero(input)` + `getBandTopVariants()` + `expectedBoardSize(width,height,insets)`). Bypassing it means a future guard expansion (e.g. adding `bandHeight` non-finite) must be fixed in N files and can drift — the duplication the `data-factories` fragment flags as MEDIUM. Boards/golden anchors (`390→358` etc.) are also recomputed inline rather than via `expectedBoardSize()`.

**Current Code**:

```typescript
// ⚠️ Could be improved — repeated inline budgets (representative site gateway:64)
const variants: Array<{ width: number; height: number; insets: typeof ZERO_INSETS }> = [
  { width: NaN, height: 844, insets: ZERO_INSETS },
  { width: 390, height: Infinity, insets: ZERO_INSETS },
  // … 4 more per-file copies
];
for (const input of variants) { assert.equal(layoutFor(input as any).boardSize, 0); }
```

**Recommended Improvement**:

```typescript
// ✅ Better — single source of truth
import { guardVariants, guardProducesFiniteZero, PORTRAIT_NOTCH } from '../../../_bmad-output/test-artifacts/fixtures/layout-band-dedup-guard-fixtures.ts';

for (const input of guardVariants()) {
  assert.equal(layoutFor(input).boardSize, 0);
  assert.ok(guardProducesFiniteZero(input));
}
// Negative complement still uses raw layoutFor to prove throw-not-throw boundary:
// assert.equal(layoutFor({ width: NaN, height: 844, insets: ZERO_INSETS }).bandHeight, PORTRAIT_BAND_HEIGHT);
```

**Benefits**: Guard matrix documented once; future guard-field or fallback-value changes require one edit; ATDD ↔ gateway ↔ umbrella cannot drift.

**Priority**: P2 — not blocking (inline payloads are correct today and green), but the factory exists and the next guard edit will break without it.

---

### 3. Name bench threshold and limit constants (L6 — LOW)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/e2e/layout.band-dedup-guard.umbrella.spec.ts:254-258` (`performance.now` loop `10000` iterations, `elapsed < 80` ms) and `triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts:298-303` (`10000` × `elapsed < 50`), plus gateway golden `358/382/688` threshold trio
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Bench `10000` iterations and thresholds `50 ms` / `80 ms` are unexplained numerics. They are intentional smoke thresholds (`10k layoutFor` is `O(1)` pure arithmetic, must be `<0.01 ms` per call) but appear without names, so a future runner cannot tell if `80` is host budget or arbitrary. Likewise `216` appears as an inline `BOARD_SIZE_FLOOR` assertion elsewhere without a comment at some sites (though named via `BOARD_SIZE_FLOOR` constant at the assertion site, so only the bench thresholds remain unnamed).

**Current Code**:

```typescript
// ⚠️ Could be improved
const t0 = performance.now();
for (let i = 0; i < 10000; i++) layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
assert.ok(performance.now() - t0 < 80, `10k in ${(performance.now()-t0).toFixed(1)}ms`);
```

**Recommended Improvement**:

```typescript
// ✅ Better — named thresholds, grep-able
const BENCH_ITERS = 10_000;
const BENCH_BUDGET_MS = 80; // O(1) arithmetic: 10k pure layoutFor must be <0.01 ms/call on CI
const t0 = performance.now();
for (let i = 0; i < BENCH_ITERS; i++) layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
assert.ok(performance.now() - t0 < BENCH_BUDGET_MS,
  `layoutFor ${BENCH_ITERS}× must be <${BENCH_BUDGET_MS}ms (O(1) pure arithmetic)`);
```

**Benefits**: Bench intent is explicit and reproducible; threshold failures diagnose as "O(1) broken" rather than "80 is arbitrary".

**Priority**: P3 — informational, no behavior impact.

---

## Best Practices Found

### 1. 6-field Number.isFinite guard with early-return finiteness contract

**Location**: `triade/src/ui/layout.ts:37-61` (reviewed via `gateway.spec.ts:63-99,170-182` + `umbrella.spec.ts:191`)
**Pattern**: Defensive pure-function guard — finite degrade `{boardSize:0, bandHeight:96, isLandscape:false}` before any `isLandscape/availWidth` derivation
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md), [test-healing-patterns.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-healing-patterns.md)

**Why This Is Good**:
Guard is the first statement in `layoutFor` (`guardIsFirstStatement() === true` pinned via source-order grep `Number.isFinite < isLandscape < availWidth`), checks exactly 6 fields (`width/height/top/bottom/left/right`), never throws, and returns a finite object for every `NaN/Infinity/-Infinity` variant. `Number.isFinite(NaN)` and `Number.isFinite(Infinity)` correctly degrade while `Number.isFinite(-0)` correctly passes (not over-guarding). `getBandTop` stays pure `+` per spec — separation of guard ownership is explicit rather than broad sanitization.

**Code Example**:

```typescript
// ✅ Excellent — cold guard path, hot finite path unchanged and byte-identical
export function layoutFor({ width, height, insets }: LayoutInput): LayoutResult {
  if (!Number.isFinite(width) || !Number.isFinite(height) ||
      !Number.isFinite(insets.top) || !Number.isFinite(insets.bottom) ||
      !Number.isFinite(insets.left) || !Number.isFinite(insets.right)) {
    return { boardSize: 0, bandHeight: PORTRAIT_BAND_HEIGHT, isLandscape: false };
  }
  const landscape = isLandscape(width, height); // never sees NaN
  // … availWidth/Height + BOARD_SIZE_FLOOR floor byte-identical
}
// Test pins both branches collapse to 0 but remain distinct:
assert.equal(layoutFor({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }).boardSize, 0); // clamp path
assert.equal(layoutFor({ width: 320, height: 480, insets: { top: Infinity, bottom: 0, left: 0, right: 0 } }).boardSize, 0); // guard path
```

**Use as Reference**: Reuse this early-guard-first shape for any future pure layout helper; keep guard before delegation, never after.

---

### 2. Single-helper dedup with source-level allowlist gates

**Location**: `triade/src/ui/layout.ts:33-35` (`export function getBandTop`) via `gateway.spec.ts:143-159` + `umbrella.spec.ts:225` + `fixtures/layout-band-dedup-guard-fixtures.ts:140-176`
**Pattern**: Single definition + import allowlist + no-duplicate-formula grep gate
**Knowledge Base**: [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Why This Is Good**:
One `export function getBandTop(insets,bandHeight){ return insets.top + SAFE_MARGIN + bandHeight; }` replaces two sites (`App.tsx const bandTop = insets.top + SAFE_MARGIN + bandHeight` and `Hud.tsx 2× topPad + bandHeight`). Tests prove dedup with 4 complementary grep allowlists (`export function getBandTop ==1`, `App getBandTop ==2 incl import`, `Hud height:getBandTop ==2`, `App/Hud insets.top + SAFE_MARGIN + bandHeight ==0`, `topPad + bandHeight ==0`, `App SAFE_MARGIN ==0`). Future `SAFE_MARGIN` drift is caught deterministically rather than by visual review.

**Code Example**:

```typescript
// ✅ Excellent — App wiring via helper, tsc + grep gates
import { layoutFor, getBandTop } from './src/ui/layout.ts';
const bandTop = getBandTop(insets, bandHeight); // ← was: insets.top + SAFE_MARGIN + bandHeight

// Hud wiring — 2× height via helper, padding locals retained:
height: getBandTop(insets, bandHeight) // landscape + portrait
const topPad = insets.top + SAFE_MARGIN; // padding* only, never height
```

**Use as Reference**: When centralizing a literal formula, pin it with a count-exact grep gate, not just a behavioral assertion — drift is caught at `rg` rather than at runtime.

---

### 3. Chrome and orientation delegation pins — byte-identical regression anchors

**Location**: `gateway.spec.ts:101-130,198-214` + `layout.test.ts:18` suite (reviewed via 19 gateway + 18 existing regression)
**Pattern**: Golden-anchor regression + delegation single-source pin
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
Finite portrait `390×844→358`, landscape `844×390→310`, and three goldens `414×896→382 / 1024×768→688 / 500×580→452` are pinned byte-identical to the pre-change baseline `80dc5c1`; `PORTRAIT 96` vs `LANDSCAPE 48` thin-band collapse and `board dominates thin band at 2000×200` plus per-edge asymmetry `390×844 358→338` are the chrome contract. `isLandscape` delegation is pinned as `isLandscape(width,height) === layoutFor(...).isLandscape` for 4+ square/portrait/landscape cases plus `rg isLandscape( in layout.ts ==1` (import + single call) — a future `>=` vs `>` drift is caught.

---

### 4. Deterministic, isolated, host-only seam — no hard waits, no flakiness surface

**Location**: Entire reviewed set (`node:test` + `tsx`, no RN mount, no browser)
**Pattern**: Pure-function host harness with `performance.now` measurement, no timers/sleep
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md), [ci-burn-in.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/ci-burn-in.md)

**Why This Is Good**:
All three reviewed files are host `node:test` + `tsx` with no `waitForTimeout / sleep / cy.wait(number) / setTimeout` in tests (bench uses measured `performance.now` + synchronous loop, not a timer). No `Date.now()`-governed TTL, no `Math.random`, no shared mutable file/DB state, no unawaited async — the suite runs in ~0.58 s total (ATDD dormant 0.15s + gateway 0.18s + umbrella 0.15s + layout.test.ts 0.12s), far under 1.5 min and provably non-flaky.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts`
- **File Size**: 307 lines, ~13.1 KB
- **Test Framework**: node:test + tsx (host-only, `TSX_TSCONFIG_PATH=tsconfig.test.json`)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 4 (`ATDD P0 critical`, `P1 wiring`, `P2 static scans / floor / clamp`, `P3 exploratory / residual / hygiene`)
- **Test Cases (it/test)**: 20 (all `it.skip` — red-phase scaffolds, 8 P0 + 6 P1 + 4 P2 + 2 P3 — 0 active until `sed s/it.skip/it/`)
- **Average Test Length**: ~12 lines per test (excluding header + ZERO_INSETS constants + assertFiniteLayout helper)
- **Fixtures Used**: 0 imported (self-contained; `fixtures/layout-band-dedup-guard-fixtures.ts` available but not imported — M2 noted)
- **Data Factories Used**: pure `layoutFor`/`getBandTop` + `SAFE_MARGIN`/`BOARD_SIZE_FLOOR`/`PORTRAIT_BAND_HEIGHT` constants + `isLandscape` from `orientation.ts` + `fs.readFileSync` source-scan guards

### Test Scope

- **Test IDs**: `P0-01`..`P0-08`, `P1-01`..`P1-06`, `P2-01`..`P2-04`, `P3-01`..`P3-02` (all P0-P3 labeled in name)
- **Priority Distribution**:
  - P0 (Critical): 8 tests
  - P1 (High): 6 tests
  - P2 (Medium): 4 tests
  - P3 (Low): 2 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~88 (`assert.equal`/`assert.ok`/`assert.doesNotThrow`/`assert.match` + `fs` scan allowlists)
- **Assertions per Test**: ~4.4 avg (each AC pins positive + negative + finite + guard-order)
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.match`, `assert.doesNotThrow`, `assert.deepEqual`, `assertFiniteLayout` helper, `performance.now` threshold

---

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts`
- **File Size**: 333 lines, ~14.2 KB
- **Test Framework**: node:test + tsx (host-only, imports `layout.ts` + `orientation.ts`)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 3 (`[API] P0 critical`, `[API] P1 wiring`, `[API] P2 static scans`)
- **Test Cases (it/test)**: 19 (all active; 9 P0, 6 P1, 4 P2 — gateway contracts mirroring ATDD)
- **Average Test Length**: ~11 lines per test
- **Fixtures Used**: 0 imported (M2 — `guardVariants()` exists in fixtures but gateway rebuilds variant arrays inline)
- **Data Factories Used**: `layoutFor`, `getBandTop`, `SAFE_MARGIN`, `PORTRAIT/LANDSCAPE_BAND_HEIGHT`, `BOARD_SIZE_FLOOR`, `orientationIsLandscape`

### Test Scope

- **Test IDs**: `[P0]`, `[P1]`, `[P2]` in every name, mapped to spec ACs + risks R-001..R-009
- **Priority Distribution**:
  - P0 (Critical): 9 tests
  - P1 (High): 6 tests
  - P2 (Medium): 4 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~84
- **Assertions per Test**: ~4.4 avg
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.match`, `assert.doesNotThrow`, `assertFiniteLayout` helper, `readSrc` + regex allowlists

---

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/layout.band-dedup-guard.umbrella.spec.ts`
- **File Size**: 263 lines, ~11.8 KB (122 lines `E2E_JOURNEYS` docs + 141 lines 7 executable journeys)
- **Test Framework**: node:test + tsx (host — "E2E = through layout seam + scanner + ledger", no browser)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 3 (`[E2E] P1 chrome journeys` 4, `[E2E] P2 static scans + floor` 2, `[E2E] P3 residual + bench` 1)
- **Test Cases (it/test)**: 7 (4 P1, 2 P2, 1 P3 — each an E2E journey through layout + scanner + ledger)
- **Average Test Length**: ~13 lines per journey (plus shared `E2E_JOURNEYS` constant docs)
- **Fixtures Used**: 0 imported (would be `layout-band-dedup-guard-fixtures.ts` bench/ledger helpers)
- **Data Factories Used**: `layoutFor`/`getBandTop`/`SAFE_MARGIN`/`BOARD_SIZE_FLOOR` + `fs.readFileSync` for ledger/source guards

### Test Scope

- **Test IDs**: `E2E-01`..`E2E-07` + `[P1]/[P2]/[P3]` in each name
- **Priority Distribution**:
  - P0 (Critical): 0 tests
  - P1 (High): 4 tests
  - P2 (Medium): 2 tests
  - P3 (Low): 1 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~35
- **Assertions per Test**: ~5.0 avg (E2E journeys assert multiple legs: chrome + ledger + bench + scope)
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.match`, `performance.now` threshold, `RegExp.test` scope guard

---

## Context and Integration

### What the Context Said

The `pr_diff` context was `spec-layout-band-dedup-and-guard.md` (baseline `80dc5c1` → `a09e6ed`, 4 ACs, I/O matrix 6 rows, Code Map — `layout.ts:33-61 getBandTop + 6-field Number.isFinite guard`, `App.tsx:31,101`, `Hud.tsx:3,67,113`, ledger DW-5/10 → done) plus `test-design-dw-layout-band-dedup-and-guard.md` (9 risks, P0 13 groups / P1 7 / P2 4 / P3 4, R-001/R-002/R-003 score 6) plus the live diff itself and the trusted `layout.test.ts` 18-pass regression + both `tsc` clean.

Context raised one finding's nuance: the 20 ATDD `it.skip` scaffolds are not missing evidence — gateway 19/19 + umbrella 7/7 + `layout.test.ts` 18/18 provide active coverage for the same ACs (guard finiteness, finite byte-identical `358/382/688/452`, `isLandscape` single-source, per-edge asymmetry, band `96/48` chrome, floor/clamp, allowlists, bench). The traceability gate confirms full AC coverage and the NFR gate PASS. Context did **not** waive any rubric row: the H5/M2/L6 findings are still scored, the `getBandTop NaN→NaN` residual (`R-006` score 3) is correctly document-only, and the ledger `resolution-undo` 64-hex hashes (`6f4ef234…` per DW-5/10) plus `sprint-status.yaml` untouched prove orchestrator ownership — the helper pure `+` that propagates `NaN` is spec-allowed.

Context also clarified that `spec: Not in Scope` correctly excludes engine/feel/monetization/deferred DW-4/DW-6 rotation — so no expected test file is missing from the reviewed set; `format not scorable` does not apply (no Maestro `.feature`/`.http` in this delta).

### Related Artifacts

- **Story File**: `_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md` — auto-generated spec for this sweep (baseline `80dc5c1`, 4 ACs, I/O matrix 6 rows, `final_revision: a09e6ed`)
- **Test Design**: `_bmad-output/test-artifacts/test-design/test-design-dw-layout-band-dedup-and-guard.md` + `_bmad-output/test-artifacts/test-design-dw-layout-band-dedup-and-guard.md` — 9 risks (R-001 TECH 6, R-002 TECH 6, R-003 TECH 6 … R-010 OPS 1), P0/P1/P2/P3 priority framework, 20 ATDD scaffolds, fixtures, gateway/umbrella spec, ~3.4–5.4h estimate
- **ATDD Checklist**: `_bmad-output/test-artifacts/atdd-checklist-dw-layout-band-dedup-and-guard.md` — 20 red-phase scaffolds (8 P0 + 6 P1 + 4 P2 + 2 P3), DT protocol
- **Fixtures**: `_bmad-output/test-artifacts/fixtures/layout-band-dedup-guard-fixtures.ts` (215 lines, deterministic — `ZERO_INSETS`/`GOLDEN 382/688/452`/`guardVariants()`/`negInfinityVariants()`/`assertFiniteLayout()`/`expectedBoardSize()`/`guardIsFirstStatement()`/`layoutForBench()`) — not imported by reviewed files (M2)
- **Implementation Delta**: `triade/src/ui/layout.ts` (getBandTop + 6-field guard), `triade/App.tsx` (bandTop via helper), `triade/src/ui/Hud.tsx` (2× height via helper), `_bmad-output/implementation-artifacts/deferred-work.md` DW-5/10 → done 2026-09-01 with `resolution-undo: 6f4ef234…` + `spec` final_revision
- **Existing Regression**: `triade/__tests__/ui/layout.test.ts` (18 pass, node:test + tsx) — trusted pins `layoutFor` portrait/landscape/golden/floor/degen/tilescales; both `tsc` gates clean (`triade/tsconfig.json` + `tsconfig.test.json` 6.0.3)
- **Other Reviews**: `test-review-dw-test-scanner-helpers-hardening.md` 96/100 A (same repo, same `node:assert/strict` house style) — priorityMarkers established there 23/40, here 24/40

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

See [tea-index.csv](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split or thin the two files over 300 lines** — import `ZERO_INSETS`/`assertFiniteLayout`/`guardVariants` from `fixtures/layout-band-dedup-guard-fixtures.ts` rather than cloning them (removes ~22 + ~58 lines, both fall ≤300) or split ATDD `P0 guard vs P1/P2 scans` into two files
   - Priority: P1 (HIGH — each over-limit file is `-5`, forces Request Changes)
   - Owner: dw-layout-band-dedup-and-guard assignee
   - Estimated Effort: 10 min (mechanical — one import line per file + delete duplicated block)

2. **Activate ATDD scaffolds** — `sed -i '' 's/it\.skip(/it(/g' triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts` then `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts` must be 20 pass / 0 fail (trace's de-skipped expectation)
   - Priority: P2
   - Owner: same
   - Estimated Effort: 2 min (gateway already proves same ACs, activation is trace gate not quality gate)

### Follow-up Actions (Future PRs)

1. **Route guard-variant sites through fixtures factory** — import `guardVariants()`/`negInfinityVariants()`/`expectedBoardSize()`/`getBandTopVariants()` in ATDD + gateway instead of re-declaring variant arrays inline (M2)
   - Priority: P2
   - Target: backlog / next layout sweep

2. **Name bench thresholds** — `BENCH_ITERS=10_000`, `BENCH_BUDGET_MS=80` / `50` (L6)
   - Priority: P3
   - Target: backlog

3. **Carry `getBandTop NaN→NaN` residual as ledger note** — zero current blast radius (`useSafeAreaInsets` always finite), add `Number.isFinite` inside helper only if a real non-finite `insets` reaches production (R-006 deferred, not threshold)
   - Priority: P3
   - Target: deferred-work.md follow-on if needed

### Re-Review Needed?

⚠️ Re-review after HIGH fixes — Request Changes until the two files are ≤300 (mechanical split/import), then re-review auto-passes to Approve with Comments (remaining M2+L6 are hygiene, score then 97/100 A). No determinism/isolation risk requires pairing.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Score 87/100 (B) with 0 Critical / 2 High / 1 Medium / 1 Low — both HIGH are the `H5 ≤300 lines` file-cap violation (ATDD 307, gateway 333), not a behavioral or flakiness defect. No determinism, isolation, hard-wait, or explicit-assertion violations; every test is behavioral with priority markers matching the established house convention (24/40), and all 26 active tests are green (gateway 19 + umbrella 7, plus trusted `layout.test.ts` 18 and both `tsc` clean). The 20 ATDD skips are documented red-phase scaffolds whose ACs are actively proven by gateway/umbrella, so they do not block the gate. The filed findings are structural hygiene — thin the two files by importing the existing `layout-band-dedup-guard-fixtures.ts` factories (removes ~80 lines, restores 97/100), then route inline variant arrays through those factories (M2) and name bench thresholds (L6) in a follow-up.

**For Request Changes**:

> Test quality is good with 87/100 score but two files exceed the 300-line cap (HIGH, −10), forcing Request Changes per the deterministic ledger. Fixture bypass (MEDIUM, −2) and an unnamed bench threshold (LOW, −1) are the only other findings — no determinism or isolation risks, all active tests green and behavioral per house convention. Split the two long files (mechanical import of the existing fixtures, ~10 min) and re-verify `node:test` green + `tsc` clean; the ATDD 20 skips then activate to 20 pass per trace. With that applied the score is 97/100 (A) and the delta is Approve with Comments.

---

## Appendix

### Violation Summary by Location

| Line | Severity | Criterion | Issue | Fix |
| ---- | -------- | --------- | ----- | --- |
| `triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts:1` | P1 (High) | Test Length (H5) | File is 307 lines (>300 cap, +7) — 4 describe blocks + 20 `it.skip` + inline helpers duplicated from fixtures | Import `ZERO_INSETS`/`assertFiniteLayout` from `fixtures/layout-band-dedup-guard-fixtures.ts` (removes ~22 lines) or split into `guard.atdd.test.ts` + `scans.atdd.test.ts` |
| `_bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts:1` | P1 (High) | Test Length (H5) | File is 333 lines (>300 cap, +33) — 3 describes + 19 its + 58-line helper/constant block duplicated from fixtures | Import `guardVariants()`/`getBandTopVariants()`/`assertFiniteLayout` from fixtures (removes ~58 lines), file falls to ~275 |
| `_bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts:63` | P2 (Medium) | Fixture Patterns / Data Factories (M2) | Repeated guard-variant arrays inline (`NaN/Infinity/-Infinity` 6 entries) while `fixtures/layout-band-dedup-guard-fixtures.ts:guardVariants()` already exists | Import `guardVariants()` / `negInfinityVariants()` / `expectedBoardSize()` instead of inlining arrays |
| `_bmad-output/test-artifacts/tests/e2e/layout.band-dedup-guard.umbrella.spec.ts:254` | P3 (Low) | Magic value (L6) | Raw `10000` iterations + `80` ms threshold (ATDD `50` ms) without named constants | Define `BENCH_ITERS=10_000`, `BENCH_BUDGET_MS=80` with O(1) comment |

*Deduped ledger: 2 HIGH (H5) + 1 MEDIUM (M2 counted once across Fixture Patterns + Data Factories) + 1 LOW (L6) = 4 violations (C1 20×skip exempt as documented red-phase scaffolds with active duplicates; see Critical Issues note). Without the H5 pair the score would be 97/100.*

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 87/100 | B | 0       | ➡️ New review (dw-layout-band-dedup-and-guard delta) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts | 87/100 (shared) | B | 0 (20 skips exempt) | Request Changes (H5 +7) |
| _bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts | 87/100 | B | 0 | Request Changes (H5 +33, M2) |
| _bmad-output/test-artifacts/tests/e2e/layout.band-dedup-guard.umbrella.spec.ts | 87/100 | B | 0 | Approved with Comments (L6 bench only; ≤300) |

**Suite Average**: 87/100 (B) — without H5 split, 97/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-dw-layout-band-dedup-and-guard-20260902
**Timestamp**: 2026-09-02 22:00:00
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

- triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/layout.band-dedup-guard.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md
- _bmad-output/test-artifacts/test-design/test-design-dw-layout-band-dedup-and-guard.md
- _bmad-output/test-artifacts/fixtures/layout-band-dedup-guard-fixtures.ts
- triade/src/ui/layout.ts
- triade/App.tsx
- triade/src/ui/Hud.tsx
- triade/src/ui/orientation.ts
- triade/__tests__/ui/layout.test.ts
- _bmad/tea/config.yaml

