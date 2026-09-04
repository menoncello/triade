---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-04'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'triade/__tests__/game/matchOrchestrator.test.ts'
  - '_bmad-output/test-artifacts/tests/unit/undo-iap-stub-cleanup.atdd.test.ts'
  - '_bmad-output/test-artifacts/tests/api/undo-iap-stub-cleanup.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/undo-iap-stub-cleanup.umbrella.spec.ts'
  - 'triade/src/game/matchOrchestrator.ts'
  - '_bmad-output/test-artifacts/fixtures/dw-undo-iap-stub-cleanup-fixtures.ts'
  - '_bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-undo-iap-stub-cleanup.md'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: dw-undo-iap-stub-cleanup

**Quality Score**: 85/100 (B - Good)
**Review Date**: 2026-09-04
**Review Scope**: directory
**Reviewer**: Eduardo (TEA Agent / Murat — Master Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Approve with Comments

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Deterministic host-only `node:test + tsx` seam — zero hard waits, zero wall-clock fixtures, zero conditionals selecting expected values, zero shared mutable state; all 41 reviewed tests pass green (pin file 20/20, bundle unit 10/10 + api 6/6 + e2e 5/5).
✅ Changed behavior pinned exactly: `confirmUndoIap` deny on `{freeUsed:true, iapRemaining:0, unlimited:false}` asserts `ok:false`, budget deep-unchanged, history retained (length 1), prompt closed, no snapshot — plus no-phantom-persistence (`structuredClone` input-immutability), purchase→consume chain (3→2→1→0, 4th denies), gate parity (`canUndoForState` ⇔ `confirmUndoIap`), Ad/Iap symmetry, unlimited/clean/empty-history/cap-999/reset/applyNoAds edges.
✅ Source-scan contract pins complement behavioral pins without duplicate coverage: `budgetForCheck` absent (0 matches), `iapRemaining: 1` absent (0 matches), strict `consumeUndo(state.undoBudget, …)` delegation ×2 (Ad+Iap symmetric), `App.handleUndoIap` fail-closed branch verified.

### Key Weaknesses

❌ L2 Missing priority marker (LOW ×20): all 20 tests in `triade/__tests__/game/matchOrchestrator.test.ts` carry no `[P#]` marker, against an emerging repo convention (15–16 of 40 sampled files use `[P#] in the test name` — not house-wide, so LOW not HIGH per the Convention schedule). The 21 bundle tests all carry markers (10 P0/P1/P2 unit + 6 api + 5 umbrella).
❌ (Prose only, no deduction) The pin file follows its pre-existing file-family style (siblings `matchOrchestrator.continue/hints/rewards/undoPack.test.ts` are likewise marker-less and method-named); the changed test follows that local style. Markers are cheap to add and would make triage consistent with the bundle.

### Summary

The `dw-undo-iap-stub-cleanup` working-tree delta (HEAD `8ac9a21`, branch `feat/epic-10-telemetria`) removes the 4-line `budgetForCheck` stub in `confirmUndoIap` (`triade/src/game/matchOrchestrator.ts:99-103`) so the IAP path strictly delegates to `consumeUndo`, and flips the pin test (`matchOrchestrator.test.ts:120-128`) from grant to deny with strengthened assertions (history retained, prompt closed). The dedicated GREEN bundle (unit/api/e2e, 21 tests) plus the updated pin (20 tests) cover the deny, the legitimate purchase→consume chain, entitlement writers (`purchaseUndoPack` +3, `applyNoAds` idempotent, `resetForNewMatch` wipe), reader symmetry, and end-to-end journeys (second-undo-blocked, purchase-then-reset, no-ads unlimited). With 0 Critical, 0 High, 0 Medium and 20 Low (all one Convention row, emerging → LOW), deductions total 20 against a +5 Perfect Isolation bonus: 85/100 (B). Verdict computed as Approve with Comments (no CRITICAL/HIGH, score ≥70, LOW findings present).

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis                                              | Notes |
| ------------------------------------ | -------------- | ---------- | -------------------------------------------------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0          | Convention: bddNaming (emerging: 16 of 40 sampled) | Every reviewed test name states a behavioral predicate (`denies when…`, `never fabricates…`, `allows exactly 3 undos…`, `respects budget — fails when…`); bundle files use `[P#] + verb phrase`. No bare method-only or "works correctly" names; L5 does not fire |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: testIds (absent: 0 of 40 sampled)      | 0/40 sampled files use `data-testid`/`getByTestId`; pure `matchOrchestrator.ts` seam has no DOM — correctly N/A, no deduction |
| Priority Markers (P0/P1/P2/P3)       | ⚠️ WARN        | 20         | Convention: priorityMarkers (emerging: 15 of 40 sampled, form `[P#] in test name`) | Pin file 0/20 marked (L2 LOW ×20, one step lower than LOW floored at LOW — convention not house-wide). Bundle files 21/21 marked (unit 4 P0 + 3 P1 + 3 P2; api 1 P0 + 4 P1 + 1 P2; e2e 2 P0 + 2 P1 + 2 P2 incl. `[P2-UMB-02]`) |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute                                           | No `.skip`/`.only`/`fdescribe`/`fit`/`test.only` in any reviewed file (verified `rg`, 0 matches). The RED scaffold (`atdd-tests/…red.spec.ts`, 13× `test.skip`) is context, not review set — intentionally dormant with documented still-true RED-PHASE reason |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute                                           | Zero `waitForTimeout`/`sleep(`/`time.sleep`/`Thread.sleep`/`cy.wait(number)` across all 4 files (verified `rg`, 0 matches) |
| Determinism (no conditionals)        | ✅ PASS        | 0          | Absolute + Applicability                           | No `if`/ternary selecting expected values, no `try/catch` flow control. `for (const expected of [2,1,0])` iterates a fixed literal (never zero-trip); `structuredClone` comparison is deterministic. No `Date.now()`/`Math.random()` (verified `rg`, 0 matches) |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute                                           | Fresh `stateWith`/`deniedState`/`snap()` objects per test; `BUDGETS` frozen and spread before use; `let s` reassigned test-locally, never module-shared. Source/ledger scans are read-only (`readFileSync`, `git diff --stat`) |
| Fixture Patterns                     | ✅ PASS        | 0          | Applicability: file constructs domain payloads     | Bundle builds budgets/history exclusively through `stateWith`/`deniedState`/`snap()` from `fixtures/dw-undo-iap-stub-cleanup-fixtures.ts`; pin file reuses its local `snap()` helper — no inline payload triplication bypassing an existing factory |
| Data Factories                       | ✅ PASS        | 0          | Applicability: file constructs domain payloads     | Factory-with-overrides pattern where applicable (`stateWith({...BUDGETS.denied}, 1)`); no faker needed (pure budgets/snapshots, no identity collisions); no `Math.random` |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: file navigates and then reads data-dependent content | No `page.goto`/`cy.visit`/router push in this pure-logic seam — gate closed |
| Explicit Assertions                  | ✅ PASS        | 0          | Absolute                                           | Every test has ≥1 explicit assertion (pin 91 + unit 28 + api 19 + e2e 19 = 157 total; 0 assertion-less tests). No tautologies, no mock-against-itself (no mocks), no unreachable assertions |
| Test Length (≤300 lines)             | ✅ PASS        | 0          | Absolute                                           | Pin 267, unit 168, api 93, e2e 86 — all ≤300; H5 fires on none |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute                                           | Pin 20 tests ~132ms; bundle 21 tests ~151ms; no sleeps, loops bounded (≤4 iterations), file reads synchronous |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute + Applicability                           | Zero tight timeouts, races, timing-dependent waits, retries, or env-dependent assumptions. One read-only `execSync('git diff … sprint-status.yaml')` asserts orchestrator-owned file untouched — hermetic w.r.t. test outcome |

**Total Violations**: 0 Critical, 0 High, 0 Medium, 20 Low

**Convention Baseline**: 40 test files sampled outside the review set (closest-first: 17 game-dir + 23 rest; corpus 128). `priorityMarkers: 15/40 emerging ([P#] in test name)` · `testIds: 0/40 absent` · `bddNaming: 16/40 emerging ([P#] + verb phrase majority)` · `networkFirst: 0/40 absent` · `dataFactories: 23/40 established (emptyBoard/moveResult/rngOf/boardWith/snap builders)` · `fixtures: 0/40 absent` · `assertionStyle: established (node:assert/strict, unanimous in review set)`. `unknown` never applied (sampled ≥4).

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -0 × 5 = -0
Medium Violations:       -0 × 2 = -0
Low Violations:          -20 × 1 = -20

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +5
  All Test IDs:          +0
                         --------
Total Bonus:             +5

Final Score:             85/100
Grade:                   B
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Add `[P#]` priority markers to the pin file's tests

**Severity**: P3 (Low)
**Location**: `triade/__tests__/game/matchOrchestrator.test.ts:33-266` (20 tests, e.g. `:120`)
**Row**: L2
**Criterion**: Priority Markers (P0/P1/P2/P3)
**Knowledge Base**: [test-priorities-matrix.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-priorities-matrix.md)

**Issue Description**:
None of the 20 tests in the pin file carries a priority marker in the measured house form (`[P#] in the test name`, adopted in 15 of 40 sampled files — emerging, hence LOW). The 21 bundle tests for this same change all carry markers, so the two layers triage inconsistently: the deny-pin that guards the monetization gate reads as unprioritized next to `[P0] confirmUndoIap denies when freeUsed…` covering the same behavior.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation)
it('confirmUndoIap respects budget — fails when freeUsed and no remaining without purchase', () => {
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
it('[P0] confirmUndoIap respects budget — fails when freeUsed and no remaining without purchase', () => {
```

**Benefits**:
Single-triage view across pin + bundle; P0 flags the monetization-gate test in CI failure output. Suggested mapping: `[P0]` deny-pin, symmetry/parity, purchase→consume chain; `[P1]` unlimited/clean/no-ads paths; `[P2]` purity/storage-key scans.

**Priority**:
P3 — cheap, mechanical, no behavior change; do it with the next touch of this file, not as a blocker. Note the file-family style (sibling `matchOrchestrator.*.test.ts` files are likewise marker-less) — adopting markers here sets the precedent for the family.

---

## Best Practices Found

### 1. Deny-pin asserts the full post-state, not just `ok:false`

**Location**: `triade/__tests__/game/matchOrchestrator.test.ts:120-128`
**Pattern**: exhaustive deny assertion (budget deep-equal + history length + prompt flag)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
The flipped pin does not stop at `r.ok === false` — it proves the stub's phantom grant is gone (`iapRemaining` stays 0), the history is retained (length 1), and the prompt closes. A regression that denies but corrupts state would still fail.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
const r = confirmUndoIap(state, acc);
assert.equal(r.ok, false);
assert.equal(r.state.undoBudget.freeUsed, true);
assert.equal(r.state.undoBudget.iapRemaining, 0);
assert.equal(r.state.undoHistory.length, 1);
assert.equal(r.state.showUndoPrompt, false);
```

**Use as Reference**:
Template for every fail-closed gate pin (continue-IAP, hint gating).

### 2. Input-immutability proof via `structuredClone`

**Location**: `_bmad-output/test-artifacts/tests/unit/undo-iap-stub-cleanup.atdd.test.ts:48-54`
**Pattern**: purity regression pin
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
`confirmUndoIap` must never mutate its input (the old stub's `budgetForCheck` reassignment lived dangerously close to that). Snapshotting with `structuredClone` before the call and `deepEqual` after proves purity directly instead of inferring it.

### 3. Source-scan pins guard the exact deleted lines

**Location**: `_bmad-output/test-artifacts/tests/api/undo-iap-stub-cleanup.gateway.spec.ts:66-79`
**Pattern**: static stub-absence + symmetry scan
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
`countMatches(src, /budgetForCheck/g) === 0`, `iapRemaining: 1 === 0`, and the strict-delegation call-site counted exactly ×2 (Ad + Iap) pin the deletion itself and the symmetry invariant — a reintroduced one-sided stub fails fast with a precise message, at unit-test speed.

### 4. Journey tests assert outcomes across the seam, not re-pins

**Location**: `_bmad-output/test-artifacts/tests/e2e/undo-iap-stub-cleanup.umbrella.spec.ts:28-66`
**Pattern**: multi-step journey (free→deny, purchase→consume→reset→deny, no-ads unlimited)
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
Each umbrella test composes writers and readers (`purchaseUndoPack` → `confirmUndoIap` → `resetForNewMatch` → `confirmUndoIap`) and asserts end states, covering the R-005 re-apply exposure the single-call pins cannot. No duplicate assertions with unit/api layers.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/game/matchOrchestrator.test.ts` (+ 3 bundle files below)
- **File Size**: 267 lines (pin); 168 unit; 93 api; 86 e2e — 614 total, each ≤300
- **Test Framework**: `node:test` + `tsx` (host, no browser harness — RN Expo 57, pure-logic seam)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 1 (pin file); bundle files use top-level `test()` with self-describing `[P#-…]` names (failure output localizes without grouping — consistent with prior TEA reviews of this bundle shape)
- **Test Cases (it/test)**: 20 pin + 10 unit + 6 api + 5 e2e = 41
- **Average Test Length**: ~8 lines/test (pin ~11, bundle ~5-9)
- **Fixtures Used**: 1 (`fixtures/dw-undo-iap-stub-cleanup-fixtures.ts`: `stateWith`, `deniedState`, `snap`, `BUDGETS`, source-scan readers)
- **Data Factories Used**: 1 (same fixture module: `snap()` deterministic snapshot + `stateWith(budget, historyLen)` builder with overrides)

### Test Scope

- **Test IDs**: N/A (no DOM in this seam)
- **Priority Distribution**:
  - P0: 7 tests (unit 4 + api 1 + e2e 2)
  - P1: 9 tests (unit 3 + api 4 + e2e 2)
  - P2: 5 tests (unit 3 + api 1 + e2e 1 — e2e `[P2-UMB-02]` counted once despite dual purpose)
  - P3: 0 tests
  - Unknown (unmarked pin tests): 20 tests

### Assertions Analysis

- **Total Assertions**: 157 (`assert.*` call sites: pin 91 + unit 28 + api 19 + e2e 19)
- **Assertions per Test**: ~3.8 avg
- **Assertion Types**: `assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.doesNotMatch`

---

## Context and Integration

### What the Context Said

`pr_diff` basis: the working-tree delta vs HEAD `8ac9a21` removes the `budgetForCheck` fabrication in `confirmUndoIap` (now strictly `consumeUndo(state.undoBudget, state.undoHistory.length, profile)`, symmetric with `confirmUndoAd`) and flips the pin test to deny with strengthened post-state assertions. The test-design doc (`test-design/test-design-dw-undo-iap-stub-cleanup.md`) and the RED scaffold header confirm the intended post-fix contract (deny preserves budget/history, legitimate purchase/unlimited paths survive, `App.handleUndoIap` stays fail-closed) — the reviewed tests assert exactly that contract, and all 41 pass against the cleaned source. Context raised no contradictions and waived nothing (waivers 0): the one L2 finding stands on the registry alone.

### Related Artifacts

- **Source**: `triade/src/game/matchOrchestrator.ts:99-118` (cleaned `confirmUndoIap`, symmetric with `confirmUndoAd:78-97`)
- **Test Design**: `_bmad-output/test-artifacts/test-design/test-design-dw-undo-iap-stub-cleanup.md`
- **RED scaffold (context, not reviewed)**: `_bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts` (13× `test.skip`, intentionally dormant)
- **Checklist**: `_bmad-output/test-artifacts/atdd-checklist-dw-undo-iap-stub-cleanup.md`

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness (journey vs writer-contract vs behavioral-pin layering)
- **[test-priorities-matrix.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-priorities-matrix.md)** - P0/P1/P2 classification framework (`[P#]` form)
- **[data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with overrides (`stateWith`/`snap`/`BUDGETS`)
- **[selective-testing.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)** - Duplicate coverage detection (unit vs api vs e2e layering has none)
- **[test-healing-patterns.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-healing.md)** - Stable pins for refactored seams

For coverage mapping, consult `trace` workflow outputs.

---

## Next Steps

### Immediate Actions (Before Merge)

None blocking — verdict is Approve with Comments.

1. **Consider adding `[P#]` markers to the pin file** - 20 tests in `matchOrchestrator.test.ts`
   - Priority: P3
   - Owner: game team
   - Estimated Effort: 15 min (mechanical rename, zero behavior change)

### Follow-up Actions (Future PRs)

1. **Propagate `[P#]` markers to sibling pin files** (`matchOrchestrator.continue/hints/rewards/undoPack.test.ts`) - same marker-less family style
   - Priority: P3
   - Target: backlog

### Re-Review Needed?

✅ No re-review needed - approve with comments as-is

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:
Test quality is good at 85/100 (B). The 20 Low violations are a single emerging Convention row (L2, `[P#]` markers absent in the pre-existing pin file — 15/40 adoption, not house-wide, hence LOW). Zero Critical/High/Medium: no disabled or focused tests, no hard waits, no conditional assertions, no shared state, explicit assertions in every test (157 total), all files ≤300 lines and sub-second. The changed behavior is pinned behaviorally and statically, all 41 tests pass, and the one recommendation is mechanical and non-blocking.

**For Approve with Comments**:

> Test quality is acceptable with 85/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

---

## Appendix

### Violation Summary by Location

| Line | Severity | Criterion | Issue | Fix |
| ---- | -------- | --------- | ----- | --- |
| 33-266 (×20 tests, e.g. 120) | P3 (Low) | Priority Markers (L2) | No `[P#]` marker in test name | Prefix with `[P0]`/`[P1]`/`[P2]` per triage value |

Representative affected tests in `triade/__tests__/game/matchOrchestrator.test.ts`: `:33`, `:44`, `:52`, `:65`, `:74`, `:81`, `:97`, `:112`, `:120` (changed test), `:130`, `:137`, `:152`, `:160`, `:172`, `:178`, `:199`, `:208`, `:222`, `:236`, `:254`. Bundle files (`tests/unit`, `tests/api`, `tests/e2e`) carry markers on all 21 tests — 0 violations there.

### Quality Trends

| Review Date | Score | Grade | Critical Issues | Trend |
| ----------- | ----- | ----- | --------------- | ----- |
| 2026-09-04 | 85/100 | B | 0 | ➡️ Stable (first review of this bundle) |

### Related Reviews

| File | Score | Grade | Critical | Status |
| ---- | ----- | ----- | -------- | ------ |
| triade/__tests__/game/matchOrchestrator.test.ts | 80/100* | B | 0 | Approve with Comments |
| tests/unit/undo-iap-stub-cleanup.atdd.test.ts | 100/100 | A | 0 | Approve |
| tests/api/undo-iap-stub-cleanup.gateway.spec.ts | 100/100 | A | 0 | Approve |
| tests/e2e/undo-iap-stub-cleanup.umbrella.spec.ts | 100/100 | A | 0 | Approve |

\*Pin-file standalone arithmetic (20 LOW, +5 isolation shared): shown for transparency; the published 85/100 is the aggregate over the 4-file review set.

**Suite Average**: 85/100 (B)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v5.0
**Review ID**: test-review-dw-undo-iap-stub-cleanup-20260904
**Timestamp**: 2026-09-04
**Version**: 1.0

---

## Feedback on This Review

If you have questions or feedback on this review:

1. Review patterns in knowledge base: `.claude/skills/bmad-testarch-test-review/resources/knowledge/`
2. See criteria registry: `.claude/skills/bmad-testarch-test-review/steps-c/criteria-registry.md`
3. Request clarification on specific violations
4. Pair with QA engineer to apply patterns

This review applies the rubric consistently. Context can reveal additional findings and clarify impact; it cannot waive a violation, change severity, or alter the score. Formal risk acceptance belongs in trace or the release gate.

---

## Reviewed Files

- triade/__tests__/game/matchOrchestrator.test.ts
- _bmad-output/test-artifacts/tests/unit/undo-iap-stub-cleanup.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/undo-iap-stub-cleanup.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/undo-iap-stub-cleanup.umbrella.spec.ts

## Review Context

- triade/src/game/matchOrchestrator.ts
- _bmad-output/test-artifacts/fixtures/dw-undo-iap-stub-cleanup-fixtures.ts
- _bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts
- _bmad-output/test-artifacts/test-design/test-design-dw-undo-iap-stub-cleanup.md
