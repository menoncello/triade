---
workflowType: 'testarch-test-review'
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-06'
inputDocuments: ['_bmad-output/project-context.md', 'triade/test-utils/helpers.ts', 'triade/src/ui/gesture.ts', '_bmad-output/test-artifacts/fixtures/1-6-input-por-swipe-rngh-edge-cases-contract-fixtures.ts']
---

# Test Quality Review: 1-6-input-por-swipe-rngh-edge-cases-contract

**Quality Score**: 100/100 (A - Excellent)
**Review Date**: 2026-09-06
**Review Scope**: directory (2 files, working-tree review set for story 1-6)
**Reviewer**: TEA Agent (Eduardo)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Approve with Comments

**Context Basis**: none

**Context Waivers Applied**: 0

<!-- Context Basis is `none`: no story, test design, or changed production source was supplied with this run (the working tree carries no production diff — D-008 zero-drift pass). The verdict speaks to how the tests are built, not to whether they match a requirement. SUT sources (`triade/src/ui/gesture.ts`, `triade/test-utils/helpers.ts`) were inspected read-only to ground violation judgments and are listed under Review Context, never scored. -->

### Key Strengths

✅ Seam honesty: every dispatch decision goes through the REAL `handleSwipe` / `handleGestureEnd` / `move()` / `planTileTransitions` — only the 3-line App gate protocol is modeled, and the seam is disclosed with a migration path
✅ Deterministic by construction: scripted `spyRng` budgets, zero timers, zero wall-clock reads, exact RNG draw accounting (`rng.calls.length === 0`)
✅ House conventions honored: 100% `[P#]` priority markers in the established `[P#] in the test name` form; single `node:assert` dialect throughout
✅ Red-phase scaffold hygiene: `test.skip` + variable-specifier dynamic `import(SPEC)` keeps CI green; skip reason verified still-true (`src/ui/swipeGate.ts` absent)

### Key Weaknesses

❌ No `describe`/`context` grouping in either file (M4 ×2) — failures print without a subject; comment banners do not substitute
❌ Decisive-magnitude literal `30` repeated unnamed at 9 call sites (L6 ×1) — the "why 30" knowledge lives in the fixtures file, not the test
❌ Static App.tsx tripwire couples to exact identifiers (`busyRef`, `onMoveSettled`) — correct today, will break on the planned 1.6-PROP-001 extraction (prose note, no deduction)

### Summary

Two new test files (10 green + 4 intentional red-phase skips, 14/14 accounted for, suite runs in ~152ms) covering the one known automation gap of story 1-6: the `busyRef` in-flight gate state machine. The tests are deterministic, isolated, well-asserted (42 assertion call sites, every test asserts), and follow the repo's established conventions. Three rubric findings (2 MEDIUM, 1 LOW) are all cheap to fix and none threaten reliability: add `describe` grouping and name the decisive-magnitude literal. The computed recommendation is **Approve with Comments**.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS | 0    | Convention: `bddNaming` (emerging, 9 of 24) | Names state behavior; tripwire name carries subject identifiers but states a contract |
| Test IDs                             | ✅ PASS (n/a) | 0    | Convention: `testIds` (absent, 0 of 24 sampled) | No DOM lookups in either file; repo uses no test-id convention |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: `priorityMarkers` (established, 14 of 24) | 14/14 reviewed tests carry `[P#]` in the house form |
| Disabled or Focused Tests            | ✅ PASS | 0    | Absolute | 4 skips carry a documented, still-true reason (module absent, verified); zero `.only` |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | No timers; `~84ms` / `~30%` appear only in comments |
| Determinism (no conditionals)        | ✅ PASS | 0    | Absolute + Applicability | Scripted RNG; loops over non-empty literals; no conditional assertions |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | Fresh gate/RNG per test; assertions target real modules, never self-configured mocks |
| Fixture Patterns                     | ✅ PASS | 0    | Applicability: no DOM interaction API is a project dependency; payloads via helpers | Boards/RNG via `staticBoard`/`gameState`/`spyRng`; no 3× inline domain payload |
| Data Factories                       | ✅ PASS | 0    | Applicability: the files construct domain payloads via helpers | Board rows explained in comments; no bypassed factory |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: neither file navigates | No `page.goto`/`cy.visit`/router push in either file |
| Explicit Assertions                  | ✅ PASS | 0    | Absolute | 42 assertion call sites; zero assertion-free tests; all async awaited; no tautologies |
| Test Length (≤300 lines)             | ✅ PASS | 0    | Absolute | 237 / 71 lines |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | Both files execute in ~152ms total; no sleeps, no network |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute + Applicability | No tight timeouts, races, retries, or environment assumptions |

**Total Violations**: 0 Critical, 0 High, 2 Medium, 1 Low

**Convention Baseline**: 24 test files sampled outside the review set (corpus 24, all under `triade/__tests__/ui/`)

> Reconciliation note: rows M4 (Ungrouped suite) and L6 (Magic value) have no dedicated line in the registry's report-criterion mapping, so every table row above is PASS while the ledger still counts 3 violations. The findings are carried in full below with their registry Row IDs and are included in the totals and the score breakdown. No violation was dropped.

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -0 × 5 = -0
Medium Violations:       -2 × 2 = -4
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

Final Score:             100/100
Grade:                   A
```

<!-- Ledger: 100 - 5 + 5 = 100. Grade scale is exactly A/B/C/D/F with no modifiers. Recommendation below is computed from the deduped counts (0 CRITICAL, 0 HIGH, score ≥ 70, findings present => Approve with Comments), never chosen. -->

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Add `describe` grouping to both files

**Severity**: P2 (Medium)
**Location**: `triade/__tests__/ui/swipe-gate-automate.test.ts:1` (file scope; 10 tests, 0 `describe` blocks)
**Row**: M4
**Criterion**: Isolation (suite organization — failures print without a subject)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
A file with three or more tests and no `describe`/`context` grouping fires M4. The file uses `// --- P0: ... ---` comment banners to section the 10 tests, but banners do not group failure output: when one test fails in CI, the report line carries no subject. (The repo itself is mixed — 9 of 26 files use `describe` — but M4 is an Absolute row, so repo habit is irrelevant.)

**Current Code**:

```typescript
// ❌ Ungrouped (current): 10 top-level test() calls, sections only in comments
// --- P0: gate deadlock guards (R-003/Df1) ---

test('[P0] noop move result never arms the gate (moved:false leaves busy untouched)', () => {
```

**Recommended Improvement**:

```typescript
// ✅ Grouped (recommended): banners become subjects CI can report
import { describe } from 'node:test';

describe('swipe in-flight gate (1-6/Df1)', () => {
  describe('P0 deadlock guards', () => {
    test('[P0] noop move result never arms the gate (moved:false leaves busy untouched)', () => {
```

**Benefits**:
Failure output carries the subject (`swipe in-flight gate > P0 deadlock guards > ...`); P0/P1/P2 sections become runnable/selectable units (`node --test --test-name-pattern`).

**Priority**:
P2 — organization, not reliability. No flakiness risk; do it in the next touch of these files.

**Related Violations**:
Same row fires on the sibling file (finding 2).

---

### 2. Add `describe` grouping to the ATDD scaffold file

**Severity**: P2 (Medium)
**Location**: `triade/__tests__/ui/swipe-gate.atdd.test.ts:1` (file scope; 4 tests, 0 `describe` blocks)
**Row**: M4
**Criterion**: Isolation (suite organization)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
Same M4 predicate as finding 1: 4 tests, no grouping. When the scaffolds are activated (remove `test.skip`), the four gate-contract tests should already sit under a subject so the red→green transition reports cleanly.

**Current Code**:

```typescript
// ❌ Ungrouped (current)
test.skip('[P2] noop move result never arms the gate (moved:false leaves busy untouched)', async () => {
```

**Recommended Improvement**:

```typescript
// ✅ Grouped (recommended — activate together with un-skipping)
describe('swipeGate contract (1.6-PROP-001 red-phase)', () => {
  test.skip('[P2] noop move result never arms the gate (moved:false leaves busy untouched)', async () => {
```

**Benefits**:
Same as finding 1; also makes the future un-skip a single-block change.

**Priority**:
P2 — apply when the scaffolds are activated at the latest.

---

### 3. Name the decisive-magnitude literal

**Severity**: P3 (Low)
**Location**: `triade/__tests__/ui/swipe-gate-automate.test.ts:68`
**Row**: L6
**Criterion**: Maintainability (magic value)
**Knowledge Base**: [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Issue Description**:
`30` carries domain meaning — a supra-threshold displacement (`SWIPE_THRESHOLD` is pinned to 10 in `swipe.test.ts`, so 30 means "decisive, must dispatch") — but appears as a bare literal at 9 call sites with no name or comment in the test file. The "why 30" knowledge exists, but it lives in the fixtures file (`SWIPE_VECTORS`, "all above SWIPE_THRESHOLD = 10"), not at the use sites. A reader editing the threshold has no local signal for which `30`s are threshold-relative.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation)
assert.strictEqual(gate.current, false, 'noop must never arm the gate (deadlock guard)');
let dispatched = false;
const accepted = handleSwipe(30, 0, gate, () => {
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended — repo convention keeps an inline copy, so name it locally)
const DECISIVE_DX = 30; // 3× SWIPE_THRESHOLD (10): must dispatch on an open gate
const accepted = handleSwipe(DECISIVE_DX, 0, gate, () => {
```

(Alternative honoring the same convention: import `SWIPE_VECTORS` from the catalogued fixtures surface. Either way, the use sites stop carrying the unexplained literal.)

**Benefits**:
Threshold-relative intent is local; a future threshold change greps to one definition.

**Priority**:
P3 — readability only. The values are correct (all 9 sites pass), and hostile vectors (`NaN`/`Infinity`), RNG scripts (`spyRng(0, 0.5, 0.5)` — arbitrary valid draws, no domain meaning), and board rows (`[3,6,12,24]`, `[null,null,2,1]` — both explained in comments) were checked and are not findings.

**Related Violations**:
Same literal at lines 86, 103 (`-30`), 166, 209, 222, 223, 224, 230 — one defect, counted once.

---

## Best Practices Found

### 1. Seam honesty with a disclosed, minimal modeled protocol

**Location**: `triade/__tests__/ui/swipe-gate-automate.test.ts:17-41`
**Pattern**: real-system-under-test with a documented seam
**Knowledge Base**: [test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
Every dispatch decision flows through the real `handleSwipe` / `handleGestureEnd` / `move()` / `planTileTransitions`. The only modeled piece is the 3-line App gate protocol, its mirroring is stated explicitly ("busyRef set ONLY when result.moved === true"), and the migration path (delete the harness when `src/ui/swipeGate.ts` ships) is recorded. This is the DW-50 lesson applied correctly.

**Code Example**:

```typescript
// ✅ Excellent: real wiring, modeled seam labeled as such
import { handleSwipe, handleGestureEnd } from '../../src/ui/gesture.ts';
import { move } from '../../src/engine/core/index.ts';
// The ONLY modeled piece is the three-line App gate protocol ...
function reportMoveResult(gate: Gate, result: { moved: boolean }): void {
  if (result.moved) gate.current = true;
}
```

**Use as Reference**:
Use this header-disclosure pattern for any future test that must mirror unwired UI state.

### 2. Exact RNG draw-budget accounting

**Location**: `triade/__tests__/ui/swipe-gate-automate.test.ts:63`
**Pattern**: deterministic seeded execution with budget assertion
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Why This Is Good**:
`assert.strictEqual(rng.calls.length, 0, 'noop must consume 0 RNG rolls (seeded stream preserved)')` pins the seeded-stream invariant, not just the outcome — a regression that draws RNG on a noop fails here, not three suites later.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
const result = move(gameState(lockedBoard()), 'right', rng);
assert.strictEqual(result.moved, false, 'locked board must produce moved:false');
assert.strictEqual(rng.calls.length, 0, 'noop must consume 0 RNG rolls (seeded stream preserved)');
```

**Use as Reference**:
Keep asserting draw budgets wherever `spyRng` is used.

### 3. Red-phase scaffolds that cannot rot silently

**Location**: `triade/__tests__/ui/swipe-gate.atdd.test.ts:21-36`
**Pattern**: skips with a verifiable still-true reason
**Knowledge Base**: [component-tdd.md](../../../agents/bmad-tea/resources/knowledge/component-tdd.md)

**Why This Is Good**:
The skip reason (target module `src/ui/swipeGate.ts` does not exist — verified this run) is documented at file scope with the activation mechanics (`test.skip(` → real failing import → GREEN). If the module ever ships without activating the scaffolds, the file header contradicts the tree visibly. C1 does not fire: the reason is documented and still true.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
const SPEC = '../../src/ui/swipeGate.ts';
test.skip('[P2] noop move result never arms the gate (moved:false leaves busy untouched)', async () => {
  const mod = await import(SPEC);
```

**Use as Reference**:
Copy this header + `SPEC` + dynamic-import shape for future red-phase scaffolds.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/ui/swipe-gate-automate.test.ts`
- **File Size**: 237 lines, 11.0 KB
- **Test Framework**: node:test + node:assert
- **Language**: TypeScript

- **File Path**: `triade/__tests__/ui/swipe-gate.atdd.test.ts`
- **File Size**: 71 lines, 3.5 KB
- **Test Framework**: node:test + node:assert
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0 (finding M4 — see recommendations 1–2)
- **Test Cases (it/test)**: 14 total (10 active + 4 `test.skip` red-phase scaffolds)
- **Average Test Length**: ~20 lines per test (automate file, incl. helpers); ~11 lines per scaffold
- **Fixtures Used**: 0 (`test.extend`/`mergeTests` — repo has no fixture convention; per-test factory functions instead)
- **Data Factories Used**: 3 (`staticBoard`, `gameState`, `spyRng` from `triade/test-utils/helpers.ts`, plus local `lockedBoard`/`mergeableBoard`/`createGate` builders)

### Test Scope

- **Test IDs**: n/a (no DOM surface; priority markers used instead)
- **Priority Distribution**:
  - P0 (Critical): 4 tests
  - P1 (High): 4 tests
  - P2 (Medium): 6 tests (2 active + 4 skipped scaffolds)
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: 42 assertion call sites (37 automate + 5 atdd)
- **Assertions per Test**: ~3.7 avg (automate), ~1.3 avg (atdd scaffolds)
- **Assertion Types**: `strictEqual`, `deepStrictEqual`, `ok` (single `node:assert` dialect, consistent with the house style used in 24/24 sampled corpus files)

---

## Context and Integration

### What the Context Said

No requirement context was supplied for this run (`Context Basis: none`), so nothing here checks the tests against acceptance criteria — the verdict speaks to how the tests are built. To avoid false positives, the exercised sources were inspected read-only:

- `triade/src/ui/gesture.ts` — confirmed the defensive-branch tests (non-finite, malformed, null dispatch, throwing dispatch) assert real SUT behavior, not self-configured mocks (C5 does not fire); confirmed `30` is supra-threshold input against the pinned `SWIPE_THRESHOLD = 10` (grounds L6).
- `triade/test-utils/helpers.ts` — confirmed `spyRng`/`staticBoard`/`gameState` semantics (draw values are arbitrary valid scripts, not domain constants; no L6).
- File header + tree state — confirmed the working tree carries no production diff and `src/ui/swipeGate.ts` is absent, so the four `test.skip` reasons are still true (C1 does not fire).

Prose notes (no severity, no deduction — the registry has no row for these):

- The static `App.tsx` tripwire (`swipe-gate-automate.test.ts:175-192`) couples to exact identifiers (`if (result.moved)`, `busyRef.current = true`, `onMoveSettled`, fallback-clear-before-release ordering). Correct and valuable today; it will break when the planned 1.6-PROP-001 pure `swipeGate.ts` extraction lands — the file header already plans that migration. No action now.
- C1's letter asks for the skip reason "on the line or the line above"; here it lives in the file header. Consider one-line reasons on each `test.skip` (e.g. `// red-phase: src/ui/swipeGate.ts not yet extracted`) when the scaffolds are next touched. Cosmetic; not a violation.

### Related Artifacts

- No story file supplied for this run.
- No test-design document supplied for this run (the files reference `test-design-epic-1-6-input-por-swipe.md` R-003/Df1 and `1.6-PROP-001`; those references were taken as labels, not verified).

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

None blocking. The two M4 items and one L6 item below are safe to land as follow-ups.

1. **Wrap both files in `describe` blocks** - findings 1–2 (M4 ×2)
    - Priority: P2
    - Owner: story 1-6 developer
    - Estimated Effort: 15 minutes

2. **Name the decisive-magnitude literal** - finding 3 (L6 ×1)
    - Priority: P3
    - Owner: story 1-6 developer
    - Estimated Effort: 10 minutes

### Follow-up Actions (Future PRs)

1. **Activate the 4 red-phase scaffolds when `src/ui/swipeGate.ts` ships** - migrate protocol tests off the inline harness, delete the harness
    - Priority: P2
    - Target: 1.6-PROP-001

### Re-Review Needed?

✅ No re-review needed - approve with comments; findings are mechanical and verifiable on the next touch.

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:
Quality score is 100/100 (A) with zero CRITICAL and zero HIGH violations across 14 tests, verified green (10 pass + 4 intentional red-phase skips) in ~152ms. The three findings — two ungrouped suites (M4) and one unnamed repeated literal (L6) — are maintainability items with no reliability impact: no hard waits, no conditional assertions, no shared state, no assertion-free tests, full priority marking in the house form. The suite is production-ready; the comments above should be addressed but do not block merge.

**For Approve with Comments**:

> Test quality is acceptable with 100/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| automate:1 (file) | P2 (Medium) | Ungrouped suite (M4) | 10 tests, no `describe` | Wrap in `describe` blocks per P0/P1/P2 section |
| atdd:1 (file) | P2 (Medium) | Ungrouped suite (M4) | 4 tests, no `describe` | Wrap in contract `describe`; activate with un-skip |
| automate:68 (+86, 103, 166, 209, 222–224, 230) | P3 (Low) | Magic value (L6) | Bare `30` decisive magnitude, 9 sites | Named `DECISIVE_DX` constant or `SWIPE_VECTORS` |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-06 | 100/100 | A | 0  | ➡️ First review of this set |

### Related Reviews

First review of this review set; no sibling files in scope.

**Suite Average**: 100/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-1-6-input-por-swipe-rngh-edge-cases-contract-20260906
**Timestamp**: 2026-09-06
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

- triade/__tests__/ui/swipe-gate-automate.test.ts
- triade/__tests__/ui/swipe-gate.atdd.test.ts

## Review Context

- _bmad-output/project-context.md
- triade/test-utils/helpers.ts
- triade/src/ui/gesture.ts
- _bmad-output/test-artifacts/fixtures/1-6-input-por-swipe-rngh-edge-cases-contract-fixtures.ts

## Excluded From Review Set

- _bmad-output/test-artifacts/fixtures/1-6-input-por-swipe-rngh-edge-cases-contract-fixtures.ts — format not scorable by the ledger
