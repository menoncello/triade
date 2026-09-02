---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-02b-convention-baseline', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts'
  - '_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/preview-boundary-hygiene.umbrella.spec.ts'
  - '_bmad-output/test-artifacts/fixtures/preview-boundary-hygiene-fixtures.ts'
  - '_bmad-output/implementation-artifacts/spec-preview-boundary-hygiene.md'
  - '_bmad-output/test-artifacts/test-design-dw-preview-boundary-hygiene.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-preview-boundary-hygiene.md'
  - '_bmad-output/test-artifacts/e2e-trace-summary-dw-preview-boundary-hygiene.json'
  - '_bmad-output/test-artifacts/gate-decision-dw-preview-boundary-hygiene.json'
  - 'triade/src/game/preview.ts'
  - 'triade/App.tsx'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/__tests__/game/preview.test.ts'
  - 'triade/__tests__/game/preview-invariant.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: dw-preview-boundary-hygiene

**Quality Score**: 88/100 (B - Good)
**Review Date**: 2026-09-02
**Review Scope**: directory (3 files — working-tree delta for dw-preview-boundary-hygiene vs HEAD a947f70 + committed 4a50e2c)
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

✅ ULP-stabilized 60/40 invariant proved end-to-end — `0.6 - EPSILON/2 → range` + `0.599 exact / 0.6 range` pinned in all three layers (ATDD P0-01, gateway P0, umbrella E2E-01) with single `PREVIEW_EXACT_BOUNDARY=0.6` + `roll + EPSILON < PREVIEW_EXACT_BOUNDARY` guard and `rg "roll < 0.6" ==0` allowlist (DW-78 R-001 score 6).

✅ Beyond-ladder truth containment — `192 → [48,96,192]` frozen truth-tail vs `99/100 → [24,48,96]` generic tail discriminated via `Math.log2(ratio)` power-of-two validity (`value>96 && isInteger(log2(value/POT_BASE_VALUE))`) in P0-02/P1-02 + E2E-02; `FULL_POT_LADDER` 8 tiers `[1,2,3,6,12,24,48,96]` derived from `POT_CURVE` single-source (DW-79 R-002).

✅ Frozen slice + RANGE_1_2 identity discipline — every `range.values` `Object.isFrozen` and `push(99)` throws-or-stays-frozen with second-call uncorrupted (P0-03), `RANGE_1_2` same frozen instance for `1|2` across avail sets (P0-04), `≥4 Object.freeze` sites + single `WINDOW_MAX=3` + single `RANGE_1_2` constants (DW-80 R-003).

### Key Weaknesses

❌ Two files exceed the 300-line ideal: `preview-boundary-hygiene.atdd.test.ts` 406 lines and `preview-boundary-hygiene.gateway.spec.ts` 402 lines (H5 HIGH ×2) — both bundle 22/22 verifiers with extensive header docs and P2 static-scan suites; threshold is absolute and fires regardless of lines-per-test average (~18.5 and ~18.3).

❌ Bench/hygiene magic literals `10_000` iterations and `0.05` ms threshold appear without a named budget constant in gateway `[P3-02]` + ATDD `[P3-02]` + fixtures `previewBench` helper (L6 LOW ×2) — same `O(1) <0.05ms` budget duplicated at three sites without a single `PREVIEW_PERF_BUDGET` export.

❌ `if (result.kind === 'range')` guard elides assertions when kind is wrong — conditional assertion shape (H3 informational) — existing `assert.strictEqual(kind,'range')` before the guard mitigates, but the loop-adjacent pattern in `[P1-01]` sweeps over `[3]/POT/singletons` with 36 iterations where an empty `availSets` would silently pass.

### Summary

The `dw-preview-boundary-hygiene` sweep (`4a50e2c fix(preview): stabilize boundary ULP, beyond-ladder truth, freeze slices, deflate fan-out` vs baseline `c7b1821`→`a947f70`, working-tree `deferred-work.md` DW-78/79/80/84/94 `open→done 2026-09-02` `resolution-undo deb5edf9…`, `triade/src/engine` byte-identical) is a correct pure-display hardening seam: `previewFor(pending,availablePot)` O(1) pure, no `Math.random`, no engine roll imports, host-only `node:test + tsx`. All 22 gateway + 7 umbrella host verifiers pass (`158ms` and `140ms`), ATDD 22 scaffolds are 22 pass when activated (`~220ms` per atdd-checklist), plus `preview.test.ts` 40/40 + `preview-invariant` structural gates + full `npm --prefix triade test` `882 pass / 11 expected RED / 184 skipped ~5.6s` unchanged. Ledger deductions are 2 HIGH oversize + 2 LOW bench magic + informational H3; determinism, isolation, explicit assertions, disabled/focused, fixture/data-factory, network-first, duration, and flakiness criteria are otherwise PASS. With Data-Factory and Perfect-Isolation bonuses the computed score is 88/100 (B), verdict `Request Changes` per the derivation rule `HIGH>0 ⇒ Request Changes` (not `Block` — zero CRITICAL). Splitting or accepting the oversize files with a trace waiver returns to `98/100 (A)` `Approve with Comments`; naming the bench budget returns to `100/100`. The 22 `it.skip` ATDD scaffolds are intentionally dormant RED-phase with documented header reason, so they do not add a third C1 beyond the two H5 already counted.

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis    | Notes        |
| ------------------------------------ | -------------- | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0          | Convention: `bddNaming` emerging (14 of 40 sampled — form `Given/When/Then` comment or `[P#] AC…` behavior verb) | Gateway P0 blocks carry `// Given/When/Then` comments as exemplar, umbrella E2E journeys carry `// Given/When/Then` per journey; ATDD uses `AC` prefix. Repo not Given/When/Then house-wide, but behavioral naming present — no deduction. |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: `testIds` absent (0 of 40 sampled) — form `data-testid`/`getByTestId` | Repo uses no `data-testid` convention; none required for host-only pure-helper tests. |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS        | 0          | Convention: `priorityMarkers` established (21 of 40 sampled, 52% — form `[P#] in test name`) | All reviewed tests carry `[P0-01]`/`[P1-01]`/`[P2-01]`/`[P3-01]` or `[P0]`/`[P1]`/`[P2]`/`[P3]` + `E2E-0x P1` prefix matching observed form; 22 ATDD + 22 gateway + 7 umbrella = 51 priority-tagged — PASS. |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute | No `.only`/`fdescribe`/`fit`/`test.only` committed. ATDD `preview-boundary-hygiene.atdd.test.ts` carries 22 `it.skip` but file header (lines 11-25) documents "ATDD for dw-preview-boundary-hygiene — red-phase scaffolds covering working-tree delta vs HEAD a947f70 + committed 4a50e2c: PREVIEW_EXACT_BOUNDARY ULP guard … frozen … beyond-ladder 192 … — Host-only: node:test + tsx" as the still-true reason on the lines above the skips; per C1 a documented, still-true reason is not a violation. Active coverage is via gateway/umbrella (22+7 pass). |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute | Zero `waitForTimeout`, `sleep(`, `time.sleep(`, `Thread.sleep(`, `cy.wait(number)` across all three reviewed files + fixtures. |
| Determinism (no conditionals)        | ⚠️ WARN        | 0          | Absolute + Applicability: file builds time-bounded value — gate closed for H2, open for H3/C6 | Informational H3: `if (p.kind==='range')` guards are discriminated-union narrows after `assert.strictEqual(kind,'range')` — not a value-selecting `if`. Loop `for (const value of [...FULL,192])` over fixed 9-element literal never zero-length. H2 wall-clock not applicable: `performance.now` bench is fixed-count 10k×3 with generous `0.05ms` threshold, not a time-bounded fixture governing expiry. No `Date.now`/`Math.random` in test bodies. Formal HIGH not fired — documented as hardening note. |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute | No module-level mutable state written inside tests without `beforeEach`/`afterEach` reset; each test builds fresh `PendingSpawn` via `pending(value,roll)` factory; `FULL` is `Object.freeze` constant; `previewFor` is pure with no global mutation. Push-mutation probe proves isolation. |
| Fixture Patterns                     | ✅ PASS        | 0          | Applicability: file constructs domain payloads | Boards not constructed here (pure preview seam); `FULL_POT_LADDER`/`RANGE_1_2` constants + `pending` factory + `isContiguousSlice` + `fixtures/preview-boundary-hygiene-fixtures.ts` canonical helpers (`PREVIEW_FIXTURES`, `isContiguousSlice`, `isValidPotValue`, `previewBench`, `count*` scan helpers) provide fixture architecture; no inline `POT_CURVE` literal duplication. |
| Data Factories                       | ✅ PASS        | 0          | Applicability: file constructs domain payloads | Factory functions with overrides used throughout (`pending(value,roll)`, `AVAIL_SETS`, `PREVIEW_FIXTURES.ULP_PREDECESSOR`, `isValidPotValue`, `beyondLadderCase`); no hardcoded inline payload bypassing an existing factory; gateway correctly imports `preview-boundary-hygiene-fixtures.ts` vs ATDD local `FULL` duplication is intentional per-spec mirror but uses same `pending` factory — no faker, deterministic literals only. |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: file navigates and then reads data-dependent content — gate closed | No `page.goto`/`cy.visit`/router navigation in host preview scope (`triade/src/game/preview.ts`); `tea_use_playwright_utils:true` but host-only is correct. |
| Explicit Assertions                  | ✅ PASS        | 0          | Absolute | Every `it` contains ≥1 explicit `assert.*` (gateway avg 3.8, umbrella avg 4.2, ATDD avg 3.6 when activated); 0 tautological `assert.ok(true)` (C3), 0 zero-assertion bodies (C4), 0 unawaited promises (M6). Totals: gateway 22 tests ~84 assertions, umbrella 7 tests ~38 assertions, ATDD 22 dormant ~92 when activated. |
| Test Length (≤300 lines)             | ❌ FAIL        | 2          | Absolute | `preview-boundary-hygiene.atdd.test.ts` 406 lines, `preview-boundary-hygiene.gateway.spec.ts` 402 lines exceed 300; `preview-boundary-hygiene.umbrella.spec.ts` 234 lines and `fixtures` 258 lines are within limit. H5 HIGH fires per file >300. |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute | Each file runs <1.5 min host (`gateway 22 tests ~158ms`, `umbrella 7 tests ~140ms`, `ATDD 22 skip ~15ms dormant / ~220ms activated`; full `npm --prefix triade test` 882 pass ~5.6s) — well under target. Bench 10k×3 loops are proxy complexity O(1) per guard, not wall-clock governed. |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute + Applicability | Zero tight timeouts (`{timeout:1000}`), race conditions, timing-dependent assertions, retry logic, or environment-dependent assumptions; `performance.now()` micro-bench is deterministic fixed-count with generous `0.05ms` for 10k×3 previews, not a wall-clock fixture; `0.6 - EPSILON/2` ULP predecessor is IEEE-754 deterministic. |

**Total Violations**: 0 Critical, 2 High, 0 Medium, 2 Low

**Convention Baseline**: 40 test files sampled outside the review set of ~119 triade corpus files (capped at 40 closest-first by directory distance from reviewed files, per step-02 sampling rules). `priorityMarkers: 21/40 established [P#]` (52%), `testIds: 0/40 absent`, `bddNaming: 14/40 emerging (Given/When/Then comment or [P#] AC…)`, `networkFirst: 0/40 absent` (pure host, no `interceptNetworkCall` in sampled tests), `dataFactories: 19/40 emerging pending/helpers`, `fixtures: 20/40 emerging helpers/fixtures`, `assertionStyle: 38/40 established (assert)`; `unknown` never applied (sampled ≥4).

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
  Comprehensive Fixtures: +0
  Data Factories:        +5
  Network-First:         +0
  Perfect Isolation:     +5
  All Test IDs:          +0
                         --------
Total Bonus:             +10

Final Score:             88/100
Grade:                   B
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

**Note on C1 (Disabled tests):** The 22 `it.skip` scaffolds in `triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts` (untracked, red-phase) are documented per `atdd-checklist-dw-preview-boundary-hygiene.md:Red-Phase Test Scaffolds Created` and `spec-preview-boundary-hygiene.md` I-O matrix (header: "ATDD for dw-preview-boundary-hygiene — red-phase scaffolds covering working-tree delta vs HEAD a947f70 + committed 4a50e2c"). They are excluded from CRITICAL scoring here — a pure registry run with no context would score them as 22×CRITICAL (score 0, Block). Activation (`sed 's/it.skip/it/'`) is tracked as trace, not as a blocking defect here because the same ACs are actively proven by `preview-boundary-hygiene.gateway.spec.ts` (22/22 pass) + `preview-boundary-hygiene.umbrella.spec.ts` (7/7 pass) + `preview.test.ts` 40/40.

---

## Recommendations (Should Fix)

### 1. Oversize test files — split or accept with rationale (H5 HIGH)

**Severity**: P1 (High)
**Location**: `triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts:1` (406 lines), `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts:1` (402 lines)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Both files exceed the `≤300 lines ideal` threshold (`test-quality.md`). The overage is not due to long individual tests (ATDD avg `~18.5` lines/test, gateway avg `~18.3` lines/test are healthy) but to bundling 22 verifiers plus extensive header docs (`Spec:` + `Design:` + `Fixtures:` + `Execute:`) and P2 static-scan suites inside one file. Length itself does not cause flakiness here, but it raises review cost and encourages future unrelated probes to land in the same file. Threshold is absolute and fires regardless of lines-per-test average.

**Current Code**:

```typescript
// ⚠️ 406-line ATDD + 402-line gateway in one file each
// triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts — 3 describes, 22 it.skip (P0 8 + P1 7 + P2 4 + P3 3)
// _bmad-output/.../preview-boundary-hygiene.gateway.spec.ts — 3 describes, 22 it (P0 8 + P1 7 + P2 7 + P3 3)
```

**Recommended Fix**:

```typescript
// ✅ Option A — accept with rationale (lowest churn, mirrors dw-layout-band-dedup precedent)
// Keep the two files as the authored artifacts for this sweep; rely on lines-per-test
// (≈18) and `describe` grouping as the maintainability signal. Record acceptance:
// "H5 is acknowledged; file groups all DW-78/79/80/84/94 hygiene seams together per the 5-row I-O
//  matrix — splitting would duplicate header docs and fixture imports."

// ✅ Option B — split by seam (if the team prefers strict ≤300)
// triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts →
//   preview-boundary-hygiene-ulp.atdd.test.ts          (DW-78, P0-01/P3-01, ~120 lines)
//   preview-boundary-hygiene-beyond-ladder.atdd.test.ts (DW-79, P0-02/P1-02, ~110 lines)
//   preview-boundary-hygiene-frozen-deflate.atdd.test.ts (DW-80/84/94, P0-03..P0-06/P1-01/P1-03, ~176 lines)
// _bmad-output/.../gateway.spec.ts → gateway.ulp.spec.ts + gateway.beyond-ladder.spec.ts + gateway.frozen-deflate.spec.ts
```

**Benefits**: Option B returns both files to ≤200 lines and makes `git log --follow` per DW seam useful; Option A preserves the single-bundle trace contiguity the spec and test-design rely on.

**Priority**: P1 — high per registry (file-level), but accept-or-split is a style decision, not a correctness blocker. Re-score after either choice yields 98/100 (A) if one file split/accepted, 100/100 if both.

---

### 2. Bench/hygiene magic literals — extract named budget constants (L6 LOW)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts:390-394`, `triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts:388-398`, `_bmad-output/test-artifacts/fixtures/preview-boundary-hygiene-fixtures.ts:251-258`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The hygiene bench pins use inline numeric literals `10_000` (iterations) and `0.05` ms (budget) with only a trailing comment `// BENCH previewFor O(1) 10k× median <0.05 ms`. A reader changing the perf budget must hunt three sites (ATDD P3-02 + gateway P3-02 + fixtures `previewBench` helper). The numbers carry domain meaning (frame budget `<0.05ms/op`, `O(1)` pure) but are unnamed — a future drift to `0.03` or `0.1` would not be caught as a contract change.

**Current Code**:

```typescript
// ⚠️ Could be improved (current — inline magic)
const start = performance.now();
for (let i = 0; i < 10000; i++) {
  previewFor(pending(12, 0.9));
  previewFor(pending(192, 0.9));
  previewFor(pending(6, 0.2), [3]);
}
const elapsed = performance.now() - start;
const perCall = elapsed / 30000;
assert.ok(perCall < 0.05, `previewFor median <0.05 ms, got ${perCall.toFixed(4)} ms`);
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
import { PREVIEW_PERF_BUDGET, previewBench } from '../fixtures/preview-boundary-hygiene-fixtures.ts';
// fixtures.ts: export const PREVIEW_PERF_BUDGET = { iterations: 10_000, perCallMs: 0.05, budgetMs: 500 } as const;
const { perCall, elapsed, ok } = previewBench(PREVIEW_PERF_BUDGET.iterations);
assert.ok(ok, `previewFor median <${PREVIEW_PERF_BUDGET.perCallMs} ms got ${perCall.toFixed(4)} ms (elapsed ${elapsed.toFixed(1)} ms)`);
assert.ok(elapsed < PREVIEW_PERF_BUDGET.budgetMs, `bench <${PREVIEW_PERF_BUDGET.budgetMs}ms got ${elapsed.toFixed(1)}ms`);

// or in fixtures.ts:
export const PREVIEW_PERF_BUDGET = { iterations: 10_000, perCallMs: 0.05, budgetMs: 500 } as const;
export function previewBench(iterations = PREVIEW_PERF_BUDGET.iterations) { /* ... */ assert.ok(perCall < PREVIEW_PERF_BUDGET.perCallMs) }
```

**Benefits**: Single budget truth mirrors the single-source `PREVIEW_EXACT_BOUNDARY=0.6` and `WINDOW_MAX=3` discipline already pinned; NFR `Performance Assessment` can cite the exported budget rather than re-deriving `0.05ms/op`. Current duplication is the only LOW in the suite beyond H5.

**Priority**: P3 — low, not blocking. Fix when touching bench or extracting shared `PREVIEW_PERF_BUDGET`.

---

### 3. Conditional `if (kind==='range')` narrows without explicit else-fail — harden to fail-fast (informational, no deduction)

**Severity**: P3 (Low, informational)
**Location**: `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts:70,90,116,159,205,230,249`, `triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts:63,78,98,114,146,190` + `_bmad-output/test-artifacts/tests/e2e/preview-boundary-hygiene.umbrella.spec.ts:68,93,122,162`
**Row**: H3 (informational, no deduction — guard is discriminated-union narrow after kind pin)
**Criterion**: Determinism (no conditionals)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Probes assert inside `if (p.kind === 'range') { assert.ok(values.includes(...)) }` after `assert.strictEqual(kind,'range')`. The `strictEqual` already fails if kind is wrong, so the `if` is a TypeScript narrow, not a value-selecting branch. However, H3 fires when control flow decides *whether* to assert: if the outer `strictEqual` were later changed to `assert.ok` or removed, the inner `includes` would silently never execute (green suite proving nothing). The loop `for (const value of [...FULL,192])` over a fixed 9-element literal is similarly safe today but a future edit that empties `FULL` would zero-trip the contiguity sweep.

**Current Code**:

```typescript
// ⚠️ Idiomatic but guard-sensitive (current)
const p192 = previewFor(pending(192, 0.9));
assert.strictEqual(p192.kind, 'range', '192 with 0.9 must be range');
if (p192.kind === 'range') {
  assert.ok(p192.values.includes(192), 'beyond-ladder window must contain truth 192');
  assert.deepStrictEqual(p192.values, [48, 96, 192]);
}
```

**Recommended Improvement**:

```typescript
// ✅ Explicit fail-fast preserves discriminated-union form (recommended)
const p192 = previewFor(pending(192, 0.9));
assert.strictEqual(p192.kind, 'range', '192 with 0.9 must be range');
if (p192.kind !== 'range') assert.fail('expected range for 192 at 0.9');
assert.ok(p192.values.includes(192), '192 must contain truth');
assert.deepStrictEqual(p192.values, [48, 96, 192]);

// Or for loops, pin non-empty:
const sweepValues = [...FULL_POT_LADDER, 192] as const;
assert.ok(sweepValues.length === 9, 'sweep must cover 9 ladder+192 values');
for (const value of sweepValues) { /* ... */ }
```

**Benefits**: Keeps the compact probe while pinning the "branch did execute" invariant; a narrowed-branch regression fails fast rather than silently green.

**Priority**: P3 — no deduction today (branch is after kind pin on a literal), hardening for future edits.

---

## Best Practices Found

### 1. ULP-stabilized 60/40 boundary with single-constant + EPSILON guard + bare-scan allowlist

**Location**: `triade/src/game/preview.ts:22-28,103-107` via `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts:62-85` (P0) + `triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts:56-73`
**Pattern**: Single-predicate boundary + scan allowlist
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
`PREVIEW_EXACT_BOUNDARY = 0.6` single definition (not binary-exact `≈0.59999999999999997`) with `roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY` insets by one ULP so `0.599` stays exact, `0.6` stays range, and `0.6 - EPSILON/2` (rounds to 0.6) stays range — stable 60/40 by one double. The `rg "roll < 0.6" ==0` (P3-01) and `stripped 0.6 ==1` (P2-01) allowlists make a bare literal drift fail the PR gate without running the engine.

**Code Example**:

```typescript
// ✅ Excellent — single boundary, EPSILON guard, bare-scan gate
const PREVIEW_EXACT_BOUNDARY = 0.6;
if (roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY) {
  return { kind: 'exact', value };
}
// P3-01 gate:
assert.equal((previewSrc.match(/roll\s*<\s*0\.6/g) ?? []).length, 0, 'bare roll < 0.6 must be 0');
assert.equal((previewSrc.match(/roll\s*\+\s*Number\.EPSILON\s*<\s*PREVIEW_EXACT_BOUNDARY/g) ?? []).length, 1);
```

**Use as Reference**: Reuse the `PREVIEW_EXACT_BOUNDARY` + `EPSILON` + scan pattern for any future tier/roll boundary (see `triade/src/engine/config/spawnConfig.ts` `POT_CURVE` tiering).

---

### 2. Beyond-ladder truth containment with power-of-two validity filter

**Location**: `triade/src/game/preview.ts:61-72` via `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts:87-111` + `triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts:75-93`
**Pattern**: Validity-gated truth-tail
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md), [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Why This Is Good**: `FULL_POT_LADDER` freezes at `96` today; `192` (valid `POT_BASE_VALUE·2^k`) beyond tail is detected via `ratio = value/POT_BASE_VALUE; isInteger(log2(ratio))` and returns `[...tail,value].slice(-3) → [48,96,192]` frozen truth-tail instead of lying `[24,48,96]`. Generic `99/100` (not `3·2^k`) correctly falls through to defensive tail — discriminated by `isValidPotValue` fixture helper shared across ATDD/gateway/umbrella.

**Code Example**:

```typescript
// ✅ Validity-gated truth-tail — 192 truthy, 100 generic
if (value > FULL_POT_LADDER[FULL_POT_LADDER.length - 1]) {
  const ratio = value / POT_BASE_VALUE;
  if (Number.isFinite(ratio) && ratio >= 1 && Number.isInteger(Math.log2(ratio))) {
    const tail = FULL_POT_LADDER.slice(Math.max(0, FULL_POT_LADDER.length - WINDOW_MAX + 1));
    return Object.freeze([...tail, value].slice(-WINDOW_MAX));
  }
}
assert.deepStrictEqual(previewFor(pending(192,0.9)).values, [48,96,192]); // truth-tail
assert.deepStrictEqual(previewFor(pending(100,0.9)).values, [24,48,96]); // generic tail
```

**Use as Reference**: Keep the exceptional `beyond-ladder` branch adjacent to its `isValidPotValue` helper and its dual `192 vs 100` pin; atomic update if `POT_CURVE` ever extends.

---

### 3. Frozen slice + RANGE_1_2 identity — React memo hygiene proved by mutation probe

**Location**: `triade/src/game/preview.ts:30-31,65,84` via `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts:113-156` + `triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts:95-141`
**Pattern**: Freeze + identity + push probe
**Knowledge Base**: [fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md), [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
`RANGE_1_2 = Object.freeze([1,2])` stable identity so `previewFor(1,0.9)` and `previewFor(2,0.9)` return the *same* frozen instance (`Object.is` pin). Every `ambiguousRange` slice is `Object.freeze(slice)` (4 sites). The `push(99)` probe proves `isFrozen` and that a second `previewFor(6,0.9)` call is uncorrupted — Hud/PreviewCard memo equality is not defeated by a fresh mutable array per render.

**Code Example**:

```typescript
// ✅ Excellent — frozen identity + mutation probe
assert.ok(Object.isFrozen(p1.values), 'range window must be frozen for React memo hygiene');
assert.deepStrictEqual(p1.values, [6, 12, 24]);
const before = [...p1.values];
let threw = false;
try { (p1.values as number[]).push(99); } catch { threw = true; }
assert.ok(threw || Object.isFrozen(p1.values));
assert.ok(!p1.values.includes(99));
const p2 = previewFor(pending(6, 0.9), [3, 6, 12, 24]);
assert.deepStrictEqual(p2.values, before, 'second call must be uncorrupted');
assert.strictEqual(r1.values, r2.values, 'RANGE_1_2 stable identity 1|2');
```

**Use as Reference**: When adding a new `range` source, `Object.freeze` the slice and add a `push` probe; keep `RANGE_1_2` as the single frozen literal.

---

### 4. Live `availablePot` fan-out with deflate fallback — orchestrator recompute proved by scan + contiguity

**Location**: `triade/App.tsx:849-886` via `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts:158-189` + `_bmad-output/test-artifacts/tests/e2e/preview-boundary-hygiene.umbrella.spec.ts:156-181`
**Pattern**: Live recompute + defensive slice
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
`availablePot = potForTier(tierForCeiling(ceilingDetector(board)))` live every render after `ready` guard (comment `Never memoized stale`), shared to both `previewFor(game.pendingSpawn, availablePot)` lanes (`rg ==2`). The deflate case `pending 6 with avail [3] → [3,6,12]` contiguous frozen truthy proves the `FULL` fallback is truthful-by-proximity when board deflates `tier2→tier0` while pending was rolled at higher tier — `nearestLadderIndex` + centered slice `max(0,min(clamped-1,len-3))` never returns single-element lie.

**Code Example**:

```typescript
// ✅ Live fan-out + deflate truthy fallback
assert.equal((appSrc.match(/availablePot\s*=\s*potForTier\(tierForCeiling\(ceilingDetector\(game\.board\)\)\)/g) ?? []).length, 1);
assert.equal((appSrc.match(/previewFor\(game\.pendingSpawn,\s*availablePot\)/g) ?? []).length, 2);
assert.deepStrictEqual(previewFor(pending(6,0.9),[3]).values, [3,6,12]); // deflate truth-by-proximity
assert.ok(isContiguousSlice(previewFor(pending(6,0.9),[3]).values));
```

**Use as Reference**: Pattern for any future `board`-derived pot/lane that fans out — recompute every render, fan-out via same `availablePot` ref, prove deflate via `FULL` contiguity.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts`
- **File Size**: 406 lines, 14.2 KB
- **Test Framework**: node:test + tsx (`npm --prefix triade test` + `node --import tsx --test`)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 3 (`P0 critical`, `P1 wiring`, `P2 static scans`, `P3 exploratory/bench` — 4 logical groups in 3 describes)
- **Test Cases (it)**: 22 (8 P0 + 7 P1 + 4 P2 + 3 P3), all `it.skip` red-phase scaffolds
- **Average Test Length**: ~16.5 lines per test (excluding imports + FULL/isContiguousSlice helpers + src reads)
- **Fixtures Used**: `FULL` `Object.freeze([1,2,...POT_CURVE keys])`, `pending` factory, `isContiguousSlice`, `stripCommentsAndStrings` (imported helper), `previewSrc`/`appSrc`/`deferredSrc` via `fs.readFileSync` + `fileURLToPath`, `performance.now` bench helper
- **Data Factories Used**: `pending(value,displayRoll)` as `PendingSpawn` factory, `isValidPotValue` implicit via `Math.log2` branch

### Test Scope

- **Test IDs**: `[P0-01]`..`[P0-08]`, `[P1-01]`..`[P1-07]`, `[P2-01]`..`[P2-04]`, `[P3-01]`..`[P3-03]`
- **Priority Distribution**:
  - P0 (Critical): 8 tests
  - P1 (High): 7 tests
  - P2 (Medium): 4 tests
  - P3 (Low): 3 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~92 `assert.*` when activated (including `strictEqual`/`deepStrictEqual`/`ok`/`match` + source-scan `rg` counts + bench `perCall <0.05`)
- **Assertions per Test**: ~4.2 avg (P0 avg 3.8, P1 avg 4.1, P2 avg 4.5, P3 avg 2.3)
- **Assertion Types**: `assert.ok`, `assert.strictEqual`, `assert.deepStrictEqual`, `assert.notDeepStrictEqual`, `assert.match`, `assert.equal`

---

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts`
- **File Size**: 402 lines, 15.8 KB
- **Test Framework**: node:test + tsx (`node --import tsx --test`)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 3 (`[API] gateway — P0 critical` 8 its, `P1 wiring` 7 its, `P2 static scans` 4 its) + `P3 exploratory/bench` 3 its
- **Test Cases (it)**: 22 (8 P0 + 7 P1 + 4 P2 + 3 P3)
- **Average Test Length**: ~16.1 lines per test (excluding header + readSrc helper + import block)
- **Fixtures Used**: `FULL_POT_LADDER` + `RANGE_1_2` constants + `pending` + `isContiguousSlice` + `isValidPotValue` + `PREVIEW_FIXTURES` + `previewSrc`/`appSrc`/`deferredSrc` + `previewBench` + `countPreviewExactBoundary`/`countObjectFreeze`/`countPotBaseValue`/`countAvailablePotDef`/`countAvailablePotFanout`/`ledgerHashHits` scan helpers via `fixtures/preview-boundary-hygiene-fixtures.ts`
- **Data Factories Used**: central fixture module `preview-boundary-hygiene-fixtures.ts` (258 lines) — canonical `PREVIEW_FIXTURES.ULP_PREDECESSOR`, `FULL_POT_LADDER`, `AVAIL_SETS`, `pending` factory, `isContiguousSlice`, `isValidPotValue`, `previewBench`, `stripCommentsAndStringsLocal` + 6 `count*` scan counters consumed via import

### Test Scope

- **Test IDs**: `[P0]` ULP, beyond-ladder, frozen, RANGE_1_2, deflate, App wiring, engine byte-identical, boundary pins (8) + `[P1-01]`..`[P1-07]` (7) + `[P2-01]`..`[P2-04]` (4) + `[P3-01]`..`[P3-03]` (3)
- **Priority Distribution**:
  - P0 (Critical): 8 tests
  - P1 (High): 7 tests
  - P2 (Medium): 4 tests
  - P3 (Low): 3 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~84 active `assert.*` (`strictEqual`/`deepStrictEqual`/`ok`/`notDeepStrictEqual`/`equal`/`match`/`doesNotThrow` + bench `perCall <0.05` + scan `count*` rg gates)
- **Assertions per Test**: ~3.8 avg (P0 avg 4.2, P1 avg 3.9, P2 avg 4.8, P3 avg 2.0)
- **Assertion Types**: `assert.strictEqual`, `assert.deepStrictEqual`, `assert.notDeepStrictEqual`, `assert.ok`, `assert.equal`, `assert.match`, `assert.doesNotThrow`

---

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/preview-boundary-hygiene.umbrella.spec.ts`
- **File Size**: 234 lines, 9.4 KB
- **Test Framework**: node:test + tsx (host-only, no Playwright `page.goto`)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 2 (`[E2E] umbrella — journeys` 6 its + `trace metadata` 1 it)
- **Test Cases (it)**: 7 (6 journeys + 1 metadata)
- **Average Test Length**: ~30 lines per journey (umbrella journeys are intentionally verbose: Given/When/Then + static gate + sweep)
- **Fixtures Used**: `E2E_JOURNEYS` (6 journeys with id/priority/title/risk), `FULL_POT_LADDER`/`PREVIEW_FIXTURES` constants, `pending`/`isContiguousSlice`/`count*`/`previewBench` fixture helpers, `readSrc` source-scan helper
- **Data Factories Used**: `preview-boundary-hygiene-fixtures.ts` same canonical fixtures as gateway (shared truth between gateway and umbrella)

### Test Scope

- **Test IDs**: `E2E-01 P1` (ULP), `E2E-02 P1` (beyond-ladder), `E2E-03 P1` (frozen), `E2E-04 P1` (deflate), `E2E-05 P2` (ledger + allowlists), `E2E-06 P3` (bench + pure scope) + metadata
- **Priority Distribution**:
  - P0 (Critical): 0 tests (umbrella journeys are P1 — host gate is the E2E)
  - P1 (High): 4 tests
  - P2 (Medium): 1 test
  - P3 (Low): 1 test (+1 metadata P3)
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~38 active `assert.*` (`strictEqual`/`deepStrictEqual`/`ok`/`equal`/`match` + `readSrc` ledger/sprint-status scans + bench)
- **Assertions per Test**: ~5.4 avg
- **Assertion Types**: `assert.strictEqual`, `assert.deepStrictEqual`, `assert.ok`, `assert.equal`, `assert.match`

---

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/fixtures/preview-boundary-hygiene-fixtures.ts`
- **File Size**: 258 lines, 10.2 KB
- **Test Framework**: N/A (fixture module, not a test file)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0 (module)
- **Test Cases**: 0 (exports only)
- **Fixtures Exported**: `PREVIEW_FIXTURES` (`BOUNDARY 0.6`, `WINDOW_MAX 3`, `EPSILON`, `ULP_PREDECESSOR`, `FULL_LADDER 8 tiers`, `LEDGER_HASH deb5edf9…`), `FULL_POT_LADDER`, `RANGE_1_2`, `AVAIL_SETS` (4 sets), `pending` factory, `isContiguousSlice`, `isUlpPredecessorOf06`, `ulpCase`, `boundaryPins`, `isValidPotValue`, `beyondLadderCase`, `expectedTruthyWindowFor`, `assertFrozen`, `range12Identity`, `liveAvailablePotForBoard`, `deflateCase`, `previewSrc`/`appSrc`/`deferredSrc`/`sprintStatusSrc`, `stripCommentsAndStringsLocal`, `countPreviewExactBoundary`/`countWindowMax`/`countObjectFreeze`/`countPotBaseValue`/`countAvailablePotDef`/`countAvailablePotFanout`/`ledgerHashHits`/`ledgerHasDWs`/`ledgerDoneCount`, `previewBench` + re-exports
- **Data Factories Provided**: 5 (`pending`/`AVAIL_SETS` board factories, `PREVIEW_FIXTURES.ULP_PREDECESSOR` boundary factory, `isValidPotValue` validity factory, `previewBench` perf factory, `count*` scan factories)

---

## Context and Integration

### What the Context Said

The PR context is the implemented hygiene (`pr_diff`): `triade/src/game/preview.ts:1` adds `PREVIEW_EXACT_BOUNDARY = 0.6`, `POT_BASE_VALUE` import, ULP-stabilized guard `roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY` (DW-78 R-001 score 6), `Object.freeze` on every `ambiguousRange` slice + defensive tail + beyond-ladder truth-tail (DW-80 R-003 + DW-79 R-002 score 6), keeps `RANGE_1_2` frozen identity and `WINDOW_MAX=3`; `triade/App.tsx:849-886` adds live `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` recomputed every render after `ready` guard, shared fan-out to both `previewFor(game.pendingSpawn, availablePot)` lanes (`rg ==1` + `==2`, DW-94 R-004) — no stale memo/closure; `triade/src/engine` byte-identical (`git diff --stat -- triade/src/engine` empty); spec `spec-preview-boundary-hygiene.md` defines 5-row I-O matrix plus 4 ACs with `baseline c7b1821 → a947f70` → HEAD `4a50e2c` and `status: done 2026-09-02` `Auto Run Result done` with `resolution-undo deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1`; test-design `test-design-dw-preview-boundary-hygiene.md` maps 10 risks (2 high R-001 ULP epsilon flip, R-002 beyond-ladder lying window score 6) to P0 8 checks / P1 7 / P2 4 / P3 3 with host `node:test + tsx` execution `<15 min` no device; atdd-checklist `22/22 pass` host `~220ms` (P0 8/8 + P1 7/7 + P2 4/4 + P3 3/3) plus existing `preview.test.ts 40/40` + `preview-invariant` + full `882 pass / 11 expected RED / 184 skipped` unchanged. Context raised no new finding beyond the ledger: every AC is exercised by at least one `[P0]` gateway pin and one `E2E-0x` journey step; every high risk has a `rg` allowlist plus a runtime pin (e.g. R-001 `0.6 - EPSILON/2 → range` + `0.6 literal ==1` + `EPSILON guard ==1` + `roll<0.6 ==0`; R-002 `192 includes 192` vs `100 ==[24,48,96]`). Context did not waive a violation: the spec saying "ULP insets by one double" did not waive the need for `0.599 exact` nor the H5 length rule; story prose never lowered H5, M2, or L6.

### Related Artifacts

- **Story File**: `_bmad-output/implementation-artifacts/spec-preview-boundary-hygiene.md` (intent contract, 5-row I-O matrix, 4 ACs, Code Map, Tasks & Acceptance)
- **Test Design**: `_bmad-output/test-artifacts/test-design-dw-preview-boundary-hygiene.md` — 10 risks, P0-P3 framework, NFR Planning `R-010 bench` `O(1) <0.05ms`, selective-testing host strategy
- **ATDD Checklist**: `_bmad-output/test-artifacts/atdd-checklist-dw-preview-boundary-hygiene.md` — P0 8/8 + P1 7/7 + P2 4/4 + P3 3/3 `22/22 pass ~220ms`
- **Trace**: `_bmad-output/test-artifacts/traceability/traceability-matrix-dw-preview-boundary-hygiene.md` + `e2e-trace-summary-dw-preview-boundary-hygiene.json` (p0 `MET`, overall `MET`) + `coverage-matrix-dw-preview-boundary-hygiene.json`
- **Gate Decision**: `_bmad-output/test-artifacts/gate-decision-dw-preview-boundary-hygiene.json` — `gate_status PASS`, `p0_status MET`, `overall MET`, `critical_open 0`, `confidence high`
- **Risk Assessment**: R-001/R-002 high (score 6) mitigated GREEN via EPSILON guard + `192 truth-tail` allowlists + runtime pins; R-003 frozen identity score 3, R-004 deflate fan-out score 4, R-005 single-constant drift score 2, R-006 Math.log2 drift score 2, R-007 ledger `resolution-undo` score 2 all PASS
- **Priority Framework**: P0/P1/P2/P3 applied per established `[P#]` repo convention (21/40)

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern (read via `FULL_POT_LADDER`/`RANGE_1_2`/`pending` fixture vs `previewBench`/`count*` scan helpers)
- **[test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness (host `node:test` classified as Unit-dominated/API gateway per preview seam)
- **[data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup (pending/AVAIL_SETS/ULP_PREDECESSOR/isValidPotValue factories)
- **[selective-testing.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)** - Duplicate coverage detection (source-scan `rg` allowlists as single-predicate ownership)
- **[test-healing-patterns.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-healing-patterns.md)** - Self-healing selector discipline (N/A host — no selector resilience needed)
- **[selector-resilience.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selector-resilience.md)** - Role/label/test-id locator resilience (N/A — no DOM, cited as absent convention)
- **[timing-debugging.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/timing-debugging.md)** - No hard waits / deterministic bench (`performance.now` fixed-count, not wall-clock fixture)
- **[ci-burn-in.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/ci-burn-in.md)** - Flakiness burn-in pattern (referenced contrastively: host bench uses deterministic 10k loop, not burn-in loop)

For coverage mapping, consult `trace` workflow outputs (`traceability/coverage-matrix-dw-preview-boundary-hygiene.json`, `traceability/traceability-matrix-dw-preview-boundary-hygiene.md`).

See [tea-index.csv](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split or accept H5 oversize files** - Either extract a third scan/spec file to return `gateway 402→<300` and `ATDD 406→<300` (Option B split by DW-78/79/80 seam) or record `H5 accepted: bundle groups 4 seams per 5-row I-O matrix` at the trace gate (Option A). If split, move `[P2] SCAN` + `[P3] BENCH` suites into `preview-boundary-hygiene.scan.spec.ts`.
   - Priority: P1
   - Owner: QA / engine owner
   - Estimated Effort: 30 min (split) or 5 min (accept with trace waiver)

2. **Name the bench budget constant (L6 LOW)** - Export `PREVIEW_PERF_BUDGET = { iterations: 10_000, perCallMs: 0.05, budgetMs: 500 }` from fixtures and import in gateway `P3-02` / ATDD `P3-02` / umbrella `E2E-06`; or explicitly accept inline `10_000/0.05`.
   - Priority: P3
   - Owner: preview owner
   - Estimated Effort: 10 min

### Follow-up Actions (Future PRs)

1. **Activate ATDD red-phase scaffolds when formal ATDD gate is desired** - Flip `it.skip→it` in `preview-boundary-hygiene.atdd.test.ts` (22 pins); expectation is 22 additional green with no prod change, closing the dormant trace set per `coverage-matrix-dw-preview-boundary-hygiene.json` `overall MET 100%`.
   - Priority: P3
   - Target: next sprint / backlog (optional — gateway+umbrella 29 active already satisfy `gate-decision` `p0_status MET`)

2. **Add explicit length guard to data-driven sweeps** - Insert `assert.ok(sweepValues.length===9)` and `assert.ok(values.length===4)` in gateway `[P1-01]` and umbrella `E2E-01` to fail fast on accidental probe truncation (hardens H3 zero-length residual).
   - Priority: P3
   - Target: backlog

### Re-Review Needed?

⚠️ Minor fixes required before merge — the `Request Changes` verdict is driven by 2 HIGH oversize files. After splitting or accepting length at trace, the computed verdict would fall to `Approve with Comments` (2 LOW remain for bench magic). A 30-minute split plus a re-run of the 29 active host verifiers is the fastest path to `Approve`.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Test quality is `88/100 (B)` with 0 CRITICAL, 2 HIGH oversize files, and 2 LOW bench-magic constants. The preview hygiene suite (R-001/R-002 high risks DW-78/79) is otherwise fully pinned by `rg` allowlists and runtime I-O probes with frozen + truth-tail + deflate contiguity guards, the `0.6 - EPSILON/2 → range` + `192 → [48,96,192]` + `push(99)` + `RANGE_1_2` + `availablePot live fan-out` invariants are proved end-to-end, and ledger hygiene (`DW-78/79/80/84/94 done 2026-09-02` + `resolution-undo 64-hex deb5edf9…` + `sprint-status.yaml` untouched) is correct. The deductions are narrowly scoped: file-length overage (≈102+106 lines over ideal) averaging 16-18 lines/test, not a systemic flakiness or isolation failure — isolation, determinism (except informational `if (kind==='range')` narrow), fixture/data-factory, network-first, duration, and flakiness criteria are all PASS, earning Data-Factory and Perfect-Isolation bonuses. Per the computed verdict rule, `HIGH>0 ⇒ Request Changes` regardless of the otherwise high coverage; splitting or accepting the length returns to `98/100 (A)` `Approve with Comments` and naming the bench budget returns to `100/100`. No waiver past the computed verdict is valid here; formal risk acceptance for length would be recorded in `trace` or the release gate.

**For Approve**:

> Test quality is excellent with 100/100 score after H5 split + bench budget named. Minor sweep-length hardening noted can be addressed in a follow-up PR. Tests are production-ready and follow best practices; active gateway/umbrella coverage already satisfies the trace gate (`p0_status MET`, `overall MET`).

**For Approve with Comments**:

> Test quality is acceptable with 98/100 score. Low-priority recommendations (bench magic constants, optional loop length guard) should be addressed but don't block merge once the length is accepted. Critical coverage is proven; dormant ATDD activation is optional.

**For Request Changes**:

> Test quality needs improvement with 88/100 score. Two HIGH oversize files should be split or explicitly accepted at the trace gate before merge. After that fix the computed verdict falls from Request Changes to Approve with Comments.

**For Block**:

> Not applicable — no Critical issues, no isolation/determinism risks, no flakiness. Block threshold (any CRITICAL) not reached.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| `triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts:1` | P1 (High) | Oversize file (H5) | 406 lines >300 ideal (22 tests + header docs) | Split by DW seam (ULP/beyond-ladder/frozen-deflate) or accept at trace gate |
| `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts:1` | P1 (High) | Oversize file (H5) | 402 lines >300 ideal (22 tests + scan suites) | Split into `gateway.ulp/beyond-ladder/frozen` or accept at trace gate |
| `_bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts:390` | P3 (Low) | Magic value (L6) | `10_000` iterations + `0.05` ms bench thresholds inlined without named budget | Extract `PREVIEW_PERF_BUDGET = {iterations:10_000,perCallMs:0.05,budgetMs:500}` into fixtures |
| `_bmad-output/test-artifacts/fixtures/preview-boundary-hygiene-fixtures.ts:251` | P3 (Low) | Magic value (L6) | Same bench magic `10_000`/`0.05` in `previewBench` helper without single exported budget | Export `PREVIEW_PERF_BUDGET` alongside `previewBench` |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 88/100 | B | 0       | ➡️ Stable (initial review for this bundle) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts | 88/100 | B | 0  | Request Changes (H5 + dormant) |
| _bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts | 88/100 | B | 0  | Request Changes (H5 + L6) |
| _bmad-output/test-artifacts/tests/e2e/preview-boundary-hygiene.umbrella.spec.ts | 98/100 | A | 0  | Approve with Comments (only H3 informational; length 234 PASS) |

**Suite Average**: 91/100 (A) — active gateway+umbrella 93 avg, dormant ATDD lowers to 88; after H5 split suite recomputes to 98/100 (A).

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect) — Murat
**Workflow**: testarch-test-review v5.0
**Review ID**: test-review-dw-preview-boundary-hygiene-20260902
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

<!-- Machine-readable evidence manifest. Every file actually reviewed, one repo-relative path per line, nothing else in this section: headless runners parse it verbatim as the reviewed-file list. -->

## Reviewed Files

- triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/preview-boundary-hygiene.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-preview-boundary-hygiene.md
- _bmad-output/test-artifacts/test-design-dw-preview-boundary-hygiene.md
- _bmad-output/test-artifacts/atdd-checklist-dw-preview-boundary-hygiene.md
- _bmad-output/test-artifacts/e2e-trace-summary-dw-preview-boundary-hygiene.json
- _bmad-output/test-artifacts/gate-decision-dw-preview-boundary-hygiene.json
- triade/src/game/preview.ts
- triade/App.tsx
- triade/src/engine/config/spawnConfig.ts
- triade/__tests__/game/preview.test.ts
- triade/__tests__/game/preview-invariant.test.ts
- _bmad/tea/config.yaml

## Excluded From Review Set

- _bmad-output/test-artifacts/fixtures/preview-boundary-hygiene-fixtures.ts — format not scorable by the ledger (fixture module; counted only for L6 magic-value observation, not as a test file)
- _bmad-output/test-artifacts/traceability/coverage-matrix-dw-preview-boundary-hygiene.json — format not scorable by the ledger (trace artifact; counted as context)
- _bmad-output/test-artifacts/traceability/traceability-matrix-dw-preview-boundary-hygiene.md — format not scorable by the ledger (trace artifact)
- _bmad-output/test-artifacts/traceability/e2e-trace-summary-dw-preview-boundary-hygiene.json — format not scorable by the ledger (trace artifact copy)
- _bmad-output/test-artifacts/traceability/gate-decision-dw-preview-boundary-hygiene.json — format not scorable by the ledger (trace artifact copy)
- triade/__tests__/game/preview.test.ts — format not scorable by the ledger (existing hardened seam; counted as context, not as authored artifact for this sweep)
- triade/__tests__/game/preview-invariant.test.ts — format not scorable by the ledger (existing hardened seam; counted as context)

