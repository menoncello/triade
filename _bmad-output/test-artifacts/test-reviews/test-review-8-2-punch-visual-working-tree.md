---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-07'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'triade/__tests__/feel/punch.atdd.working-tree.test.ts'
  - 'triade/__tests__/feel/punch.automate.working-tree.test.ts'
---

# Test Quality Review: 8-2-punch-visual working-tree tests

**Quality Score**: 100/100 (A - Excellent)
**Review Date**: 2026-09-07
**Review Scope**: directory (working-tree delta for `8-2-punch-visual`: 2 files)
**Reviewer**: TEA Agent (Murat)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Block

<!-- COMPUTED, never chosen. steps-c/step-03f-aggregate-scores.md §3b derives this from the
     deduped violation counts: any CRITICAL => Block; any HIGH => Request Changes; score < 70 =>
     Request Changes; any remaining finding => Approve with Comments; otherwise Approve. -->

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

<!-- Context was read (test design refresh + fixture + project-context). It raised no new
     rubric finding and waived nothing: the one CRITICAL below stands as scored. -->

### Key Strengths

✅ Single-source fixture (`punch.automate.fixtures.ts`): all 13 tiers, glow boundary sets, and expected-profile builders shared between API and contract tests — no duplicated tier tables
✅ EXPECTED RED skip discipline: all 3 `it.skip` carry the reason on the line (test name) plus root-cause comments (R-002/R-007), matching the house pattern in `punch.atdd.test.ts` / `reducedMotion.atdd.test.ts`
✅ No hard waits, no conditionals governing assertions, no shared mutable state; every executed test carries explicit assertions (33 + 40 assert calls)
✅ Executed green on the working tree: 20 tests, 17 pass, 0 fail, 3 skipped (run from `triade/` with `npx tsx --test`)

### Key Weaknesses

❌ One tautological assertion (`|| true`) in `8-2-AUTO-E2E-004` — always passes, proves nothing (C3, CRITICAL)
❌ Test files only execute with CWD=`triade/` (`path.resolve('src/...')` → ENOENT from repo root); runner CWD is an undocumented precondition (prose note, no registry row)
❌ Fixture exports `mergeEntry`/`spawnEntry` builders that no reviewed test uses — dead surface that can drift (prose note, no registry row)

### Summary

Two working-tree test files pinning the 8-2 refresh delta (P0-09 chrome-guard contract, duration-path gap coverage, render-contract gates) are structurally excellent: small files (126/193 lines), behavior-named tests with priority markers, fixture-driven tier sweeps, and honest EXPECTED RED markers for the two known-gapped risks. The single blocking issue is a one-line tautology in the engine-purity test that must be replaced with a real assertion (one-line fix, verified replacement below). Score arithmetic gives 100/100 (A) because the ledger deducts only 10 for the single CRITICAL and the suite earns both applicable bonuses — but the computed recommendation is independent of the score: any CRITICAL means Block until fixed.

---

## Quality Criteria Assessment

| Criterion                            | Status      | Violations | Basis                        | Notes                                                      |
| ------------------------------------ | ----------- | ---------- | ---------------------------- | ---------------------------------------------------------- |
| BDD Format (Given-When-Then)         | ✅ PASS     | 0          | Convention: `bddNaming` (established, 11 of 11) | All names state behavior; automate file adds Given/When/Then comments |
| Test IDs                             | ✅ PASS (n/a) | 0        | Convention: `testIds` (absent, 0 of 11) | Repo uses no `data-testid` convention (0 of 11 sampled); nothing to drift from |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS     | 0          | Convention: `priorityMarkers` (established, 11 of 11) | Every test carries `[P#]` / `[WT-P#]`; form matches house `[P#]` / `[P#-##]` |
| Disabled or Focused Tests            | ✅ PASS     | 0          | Absolute                     | 3× `it.skip`, each with documented still-true reason on the line + above; no `.only` |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS     | 0          | Absolute                     | No waits in test code (`setTimeout` appears only inside asserted source strings/comments) |
| Determinism (no conditionals)        | ✅ PASS     | 0          | Absolute + Applicability      | No branching over assertions; loops iterate non-empty consts; `Date.now` measures elapsed only, governs no lifetime (H2 predicate not met) |
| Isolation (cleanup, no shared state) | ✅ PASS     | 0          | Absolute                     | No mocks, no module-state writes; `GB()`/`APP()` are pure readers |
| Fixture Patterns                     | ✅ PASS (n/a) | 0        | Applicability: file constructs domain payloads | No domain payloads constructed; no user-event API dependency |
| Data Factories                       | ✅ PASS (n/a) | 0        | Applicability: file constructs domain payloads | Tier data comes from fixture consts / inline spec pins, not constructed payloads |
| Network-First Pattern                | ✅ PASS (n/a) | 0        | Applicability: file navigates then reads data | No navigation in either file (host `node:test`, no browser) |
| Explicit Assertions                  | ❌ FAIL     | 1          | Absolute                     | 1× C3 tautology (automate:146); all other tests assert explicitly |
| Test Length (≤300 lines)             | ✅ PASS     | 0          | Absolute                     | 126 + 193 lines, well under the 300-line cap |
| Test Duration (≤1.5 min)             | ✅ PASS     | 0          | Absolute                     | Full run 139 ms; perf smoke self-budgets 1300 resolutions < 1000 ms |
| Flakiness Patterns                   | ✅ PASS     | 0          | Absolute + Applicability      | No tight timeouts, races, retries, or clock-derived expectations |

**Total Violations**: 1 Critical, 0 High, 0 Medium, 0 Low

**Convention Baseline**: 11 test files sampled outside the review set (all of `triade/__tests__/feel/`, corpus = 11)

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -1 × 10 = -10
High Violations:         -0 × 5 = -0
Medium Violations:       -0 × 2 = -0
Low Violations:          -0 × 1 = -0

Bonus Points:
  Excellent BDD:         +5
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +5
  All Test IDs:          +0
                         --------
Total Bonus:             +10

Final Score:             100/100
Grade:                   A
```

<!-- Ledger check: 100 - 10 + 10 = 100. Grade A (>= 90), no modifier. -->

Bonus rationale (each is 0 or 5, awarded only when it holds across every reviewed file):
- Excellent BDD +5: every test name in both files states behavior, none names an implementation.
- Comprehensive Fixtures +0: ATDD file re-reads `GameBoard.tsx`/`App.tsx` inline per test instead of via the shared `GB()`/`APP()` readers (3 inline `readFileSync` repeats).
- Data Factories +0: automate file is factory-driven, but the ATDD file pins spec literals inline (appropriate for spec pins, yet not factory use) — not uniform across both files, so no bonus.
- Network-First +0: n/a, no navigation exists to intercept; no bonus for an inapplicable pattern.
- Perfect Isolation +5: no shared mutable state in either file; any test can run alone or in parallel.
- All Test IDs +0: n/a, no DOM lookups exist; `testIds` convention is absent repo-wide.

---

## Critical Issues (Must Fix)

### 1. Tautological sanity assertion never fails

**Severity**: P0 (Critical)
**Location**: `triade/__tests__/feel/punch.automate.working-tree.test.ts:146`
**Row**: C3
**Criterion**: Explicit Assertions
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
The engine-purity test `8-2-AUTO-E2E-004` contains a line that cannot fail regardless of the source under test:

```typescript
assert.ok(gb.includes('feel') || true, 'sanity: GameBoard may reference feel (outside engine)');
```

`X || true` is unconditionally `true`, so this assertion passes even if `GameBoard.tsx` contained no `feel` reference at all. The suite reports green while this line proves nothing — the exact false-confidence case C3 exists to catch. The surrounding assertions in the same test (engine core, lane direction) are real, so only this line is affected.

**Current Code**:

```typescript
// ❌ Bad (current implementation)
const gb = GB();
assert.ok(gb.includes('feel') || true, 'sanity: GameBoard may reference feel (outside engine)');
```

**Recommended Fix**:

```typescript
// ✅ Good (recommended approach)
const gb = GB();
assert.ok(gb.includes("from '../feel/"), 'GameBoard resolves punch data via the feel layer (outside engine)');
```

**Why This Matters**:
Verified against the tree: `GameBoard.tsx:9` carries `import { presetFor } from '../feel/feel.ts'`, so the replacement passes today and pins the intended lane direction (board → feel, never engine → feel). A tautology in a purity-guard test is load-bearing camouflage: the day someone moves preset resolution into the engine, this line stays green.

**Related Violations**:
None — sole C3 in the review set; no other `|| true` / self-comparison found in either file.

---

## Recommendations (Should Fix)

No scored recommendations. MEDIUM/LOW counts are zero, so this section carries only unscored prose notes (no severity, no deduction — the registry has no row for any of them):

1. **Document the CWD precondition (or anchor it).** Both files resolve sources via `path.resolve('src/...')`, which requires CWD=`triade/` — verified: running the same command from the repo root fails every source-contract test with ENOENT. Options: (a) one line in each file header (`Run from triade/: npx tsx --test ...`), or (b) anchor with `new URL` from `import.meta` so the tests run from anywhere. Second occurrence of this class in the feel suite (same pattern in `punch.atdd.test.ts`).
2. **Use or remove `mergeEntry`/`spawnEntry`.** The fixture exports two trace-entry builders that no reviewed test imports (only `ALL_TIERS`/`GLOW_TIERS`/`NO_GLOW_TIERS`/`EXPECTED_DURATION`/profiles are used). Dead builders drift from the engine trace shape silently; either exercise them in a re-plan test or delete them.
3. **Accept the source-text pin brittleness consciously.** `WT-P0-03`, `WT-P1-01/02`, `AUTO-E2E-001/002` assert via regex/slice over `GameBoard.tsx`/`App.tsx` text. That is the house host-runnable contract-pin pattern (device gesture/pixel stays on the device lane per project rules), and the pins are narrowly scoped — keep them narrow on future edits; formatting churn in `GameBoard.tsx` is the known false-positive source.

---

## Best Practices Found

### 1. Fixture as single source of truth

**Location**: `triade/__tests__/feel/fixtures/punch.automate.fixtures.ts:7-22`
**Pattern**: shared tier consts + expected-profile builders
**Knowledge Base**: [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Why This Is Good**:
`ALL_TIERS` / `GLOW_TIERS` / `NO_GLOW_TIERS` / `EXPECTED_DURATION` plus `expectedProfile` / `expectedReducedProfile` mean the 13-tier sweep exists in exactly one place. Adding tier 24576 touches the fixture, not N tests.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
export const ALL_TIERS = [3, 6, ...HEAVY_TIERS] as const;
export const GLOW_TIERS = [1536, 3072, 6144, 12288] as const;
```

**Use as Reference**:
Point future 8-3/8-4 working-tree tests at this shape; consider folding `mergeEntry`/`spawnEntry` in only when a test actually needs them (see note 2 above).

### 2. Given/When/Then comments on every automate test

**Location**: `triade/__tests__/feel/punch.automate.working-tree.test.ts:49-51` (and each sibling test)
**Pattern**: BDD comment preamble
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Why This Is Good**:
Each test states Given (preset table / invariant), When (helper call / gate evaluation), Then (exact expectation) before the code — the BDD contract is reviewable without executing anything.

### 3. Honest EXPECTED RED markers

**Location**: `triade/__tests__/feel/punch.atdd.working-tree.test.ts:108-125`, `triade/__tests__/feel/punch.automate.working-tree.test.ts:153-163`
**Pattern**: `it.skip` with reason on the line + root-cause + manual-step comments
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Why This Is Good**:
R-002/R-007 (burst `setTimeout(500)` unmount guard) and the open composite p99 re-measurement stay visible as skipped tests with WHAT FAILED / healing-attempted / manual-steps structure instead of being silently dropped or, worse, asserted vacuously. This is precisely the documented-reason exception C1 requires.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/feel/punch.atdd.working-tree.test.ts` — 126 lines; `triade/__tests__/feel/punch.automate.working-tree.test.ts` — 193 lines
- **Test Framework**: `node:test` + `tsx` (project's host-test framework; no Playwright/Cypress scaffold — correct per project rule "CI covers pure, device covers gesture/pixel")
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 2 (atdd) + 3 (automate)
- **Test Cases (it/test)**: 9 executed + 2 skipped (atdd); 8 executed + 1 skipped (automate) — 20 total, 17 pass, 0 fail, 3 skipped
- **Average Test Length**: ~14 lines (atdd) / ~16 lines (automate) per test
- **Fixtures Used**: `punch.automate.fixtures.ts` (automate file); atdd file is self-contained with inline spec pins
- **Data Factories Used**: fixture consts + `expectedProfile`/`expectedReducedProfile` builders (automate); inline tier arrays (atdd)

### Test Scope

- **Test IDs**: `[WT-P0-01..04]`, `[WT-P1-01..04]`, `[WT-P2-01]` (atdd); `[P0]/[P1]/[P2] 8-2-AUTO-*` (automate)
- **Priority Distribution**:
  - P0 (Critical): 8 tests
  - P1 (High): 7 tests
  - P2 (Medium): 5 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: 33 (atdd) + 40 (automate) `assert.*` calls
- **Assertions per Test**: ~3.7 (atdd) / ~5.0 (automate) avg
- **Assertion Types**: `equal`, `deepEqual`, `ok`, `doesNotThrow` — all `node:assert/strict`, matching the house dialect (13 of 13 corpus files)

---

## Context and Integration

### What the Context Said

Read-only context: the 8-2 test-design refresh (`test-design-epic-8-2-punch-visual.md`), the shared fixture (support file, not scored), and project-context rules. The design confirms the delta under review is metadata-only (test-design refresh: P0-09 chrome-guard helper contract + 8-3/8-4 forward-compat notes; production punch slice byte-stable since `e4629cd`), which is exactly what the two files pin: `WT-P0-03`/`AUTO-API-003` cover P0-09, and the EXPECTED RED skips carry R-002/R-007 plus the open composite p99 re-measurement the design leaves to the Epic nightly lane. No contradiction between context and tests was found; no assertion in either file conflicts with an acceptance criterion. Context raised no additional rubric finding.

### Related Artifacts

- **Test Design**: `test-design-epic-8-2-punch-visual.md` (`_bmad-output/test-artifacts/test-design/`) — P0-09, R-002/R-007, P1-05/P2-01 deferred items; composite punch+shake+bullet p99 open
- **Risk Assessment**: R-002 (score 6, immediate) / R-007 carried as EXPECTED RED; production fix out of TEA scope
- **Priority Framework**: P0-P3 per test-priorities-matrix, consistent with the design's P0-09/P1-05/P2-01 numbering

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

1. **Replace the tautological assertion** - one-line fix in `punch.automate.working-tree.test.ts:146` (see Critical Issues §1)
   - Priority: P0
   - Owner: story 8-2 dev
   - Estimated Effort: 5 minutes (replacement verified against the tree; re-run `npx tsx --test` from `triade/`)

### Follow-up Actions (Future PRs)

1. **Document or remove the CWD precondition** - header note or `import.meta`-anchored resolution
   - Priority: P3
   - Target: backlog

2. **Adopt or delete `mergeEntry`/`spawnEntry`** - fixture exports with no consumers
   - Priority: P3
   - Target: backlog

### Re-Review Needed?

⚠️ Re-review after critical fixes - request changes, then re-review (single-issue re-check of line 146; full re-review unnecessary)

---

## Decision

**Recommendation**: Block

**Rationale**:

One CRITICAL violation (C3 tautological assertion) exists in the review set. Per the deterministic derivation rule, any CRITICAL count above zero yields Block regardless of the numeric score: a test line that cannot fail buys false confidence, and the engine-purity gate it sits in is precisely where silent breakage propagates (8-3/8-4 share the same file). The fix is a verified one-liner. Everything else in the set is excellent — which is why the score is 100 (A) — but the verdict follows the findings, not the score.

**For Block**:

> Test quality is insufficient with 1 critical issue making one assertion unsuitable for production as written. Recommend applying the one-line fix in Critical Issues §1 and re-running; no pairing session needed.

---

## Appendix

### Violation Summary by Location

| Line | Severity | Criterion | Issue | Fix |
| ---- | -------- | --------- | ----- | --- |
| automate:146 | P0 | Explicit Assertions (C3) | `assert.ok(gb.includes('feel') \|\| true)` always passes | Assert `gb.includes("from '../feel/")` (verified present at GameBoard.tsx:9) |

### Quality Trends

| Review Date | Score | Grade | Critical Issues | Trend |
| ----------- | ----- | ----- | --------------- | ----- |
| 2026-09-07 | 100/100 | A | 1 | ➡️ First working-tree review of this delta |

### Related Reviews

| File | Score | Grade | Critical | Status |
| ---- | ----- | ----- | -------- | ------ |
| punch.atdd.working-tree.test.ts | 100/100 | A | 0 | Blocked only by sibling file's C3 |
| punch.automate.working-tree.test.ts | — | — | 1 | Block (one-line fix) |

**Suite Average**: 100/100 (A) — single scored unit (deltas share one ledger)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-8-2-punch-visual-working-tree-20260907
**Timestamp**: 2026-09-07
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

- triade/__tests__/feel/punch.atdd.working-tree.test.ts
- triade/__tests__/feel/punch.automate.working-tree.test.ts

## Review Context

- triade/__tests__/feel/fixtures/punch.automate.fixtures.ts
- _bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md
- _bmad-output/project-context.md

## Excluded From Review Set

- _bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual-tea.atdd-1.md — format not scorable by the ledger
- _bmad-output/test-artifacts/automation-8-2-punch-visual-working-tree.md — format not scorable by the ledger
- _bmad-output/test-artifacts/nfr-assessment-8-2-punch-visual-working-tree.md — format not scorable by the ledger
- _bmad-output/test-artifacts/nfr-gate-decision-8-2-punch-visual-working-tree.json — format not scorable by the ledger
- _bmad-output/test-artifacts/traceability/coverage-matrix-8-2-punch-visual-working-tree.json — format not scorable by the ledger
- _bmad-output/test-artifacts/traceability/e2e-trace-summary-8-2-punch-visual-working-tree.json — format not scorable by the ledger
- _bmad-output/test-artifacts/traceability/gate-decision-8-2-punch-visual-working-tree.json — format not scorable by the ledger
- _bmad-output/test-artifacts/traceability/traceability-matrix-8-2-punch-visual-working-tree.md — format not scorable by the ledger

`--test-glob` brings any of these into the review set when it should be scored.
