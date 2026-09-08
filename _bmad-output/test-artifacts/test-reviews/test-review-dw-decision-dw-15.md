---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-07'
workflowType: 'testarch-test-review'
inputDocuments:
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/network-first.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/timing-debugging.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/selector-resilience.md'
  - '.claude/skills/bmad-testarch-test-review/steps-c/criteria-registry.md'
---

# Test Quality Review: dw-decision-dw-15

**Quality Score**: 0/100 (F - Critical Issues)
**Review Date**: 2026-09-07
**Review Scope**: directory
**Reviewer**: TEA Agent

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Critical Issues

**Recommendation**: Block

**Context Basis**: none

**Context Waivers Applied**: 0

### Key Strengths

✅ Active automate suite (22 tests, 3 files) is fully green — 22 pass, 0 fail, ~200ms host-only
✅ Every executed test carries a priority marker and a Given-When-Then name plus comment
✅ Shared triage logic and identity pins are centralized in a fixture module imported by all active specs
✅ No hard waits, no live-clock fixtures, no shared mutable state, no unawaited async anywhere

### Key Weaknesses

❌ 15 of 15 tests in the device ATDD scaffold are `it.skip` with no per-line skip reason (C1 × 15, CRITICAL)
❌ Scaffold duplicates the soak-triage helper and hardcodes device identity instead of importing the fixture (M2, MEDIUM)
❌ Bonus categories fail suite-wide because the scaffold bypasses the fixture/factory pattern the active specs follow

### Summary

The three active automate specs for dw-decision-dw-15 are excellent host-only evidence tests: deterministic, isolated, well-named, and green. The score is driven entirely by the fourth reviewed file, `triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts`, whose 15 tests are all skipped. The dormancy rationale exists only at file-header level; registry row C1 requires the reason on the line or the line above each skip, so all 15 fire at CRITICAL. The fix is cheap and mechanical: add a one-line skip reason above each `it.skip` (citing green-activation in the automate specs), or delete the dormant host-runnable duplicates now that the automate suite pins them green. Until then the computed verdict is Block — a skipped suite reporting green while proving nothing is exactly what C1 exists to catch.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS | 0    | Convention: bddNaming (2 of 40, emerging — satisfied) | All test names state Given/When/Then behavior |
| Test IDs                             | ✅ PASS (n/a) | 0    | Convention: testIds (0 of 40, absent) | The repo uses no such convention (0 of 40 sampled) |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: priorityMarkers (13 of 40, emerging — satisfied) | All 37 tests carry [P0]/[P1]/[P2] markers |
| Disabled or Focused Tests            | ❌ FAIL | 15   | Absolute | 15 × it.skip in the device ATDD scaffold (C1) |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | No timers used for ordering in any file |
| Determinism (no conditionals)        | ✅ PASS | 0    | Absolute + Applicability | H2 gate closed (no live-clock time-bounded values); `?.`/literal-array loops cannot select or skip assertions |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | Module-level reads are immutable; no inter-test writes |
| Fixture Patterns                     | ⚠️ WARN | 1    | Applicability: the file constructs domain payloads | Scaffold bypasses the existing fixture (M2, same finding as Data Factories) |
| Data Factories                       | ⚠️ WARN | 1    | Applicability: the file constructs domain payloads | Scaffold duplicates helper + hardcodes pins (M2) |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: no navigation in any reviewed file | Host-only seam; nothing navigates |
| Explicit Assertions                  | ✅ PASS | 0    | Absolute | 61 assertions across 22 executed tests; skips excluded from C4 |
| Test Length (≤300 lines)             | ✅ PASS | 0    | Absolute | Largest file 205 lines |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | 22 tests in ~200ms, no device/browser |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute + Applicability | No timers, no conditional assertions, no unawaited async |

**Total Violations**: 15 Critical, 0 High, 1 Medium, 0 Low

**Convention Baseline**: 40 test files sampled outside the review set (corpus 246)

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -15 × 10 = -150
High Violations:         -0 × 5 = -0
Medium Violations:       -1 × 2 = -2
Low Violations:          -0 × 1 = -0

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +5
  All Test IDs:          +0
                         --------
Total Bonus:             +5

Final Score:             0/100
Grade:                   F
```

---

## Critical Issues (Must Fix)

### 1–15. Skipped tests without a per-line documented reason (×15, one finding per skipped test)

**Severity**: P0 (Critical)
**Location**: `triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:53,69,80,95,107,118,124,133,143,156,168,176,186,194,200`
**Row**: C1
**Criterion**: Disabled or Focused Tests
**Knowledge Base**: [test-quality.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
All 15 tests in the device ATDD scaffold are `it.skip`. A dormancy rationale exists in the file header (dormant RED scaffolds, green-activated in the automate specs), but row C1 requires the reason on the line or the line above each skip. A file header does not satisfy the predicate: future edits reorder, copy, or un-skip individual tests without ever reading the header, and the suite reports green while proving nothing.

**Current Code**:

```typescript
// ❌ Bad (current implementation)
it.skip('[P0-01] ledger DW-15 done 2026-09-06 with sweep-bundle resolution and undo hash', () => {
```

**Recommended Fix**:

```typescript
// ✅ Good (recommended approach)
// Dormant RED scaffold — green-activated in tests/unit/dw-decision-dw-15.atdd.test.ts; stays skip (no device in CI).
it.skip('[P0-01] ledger DW-15 done 2026-09-06 with sweep-bundle resolution and undo hash', () => {
```

For the three `[P2-xx MANUAL]` holder-eyes tests the reason is still true (holder not present); record it the same way:

```typescript
// ✅ Good (recommended approach)
// MANUAL holder-eyes gate — requires the unlocked phone + Eduardo present; assert.ok(false) body guards against silent pass.
it.skip('[P2-01 MANUAL] holder visual — Skia 4x4 visibly rendering while auto-drive plays', () => {
```

**Why This Matters**:
A committed `.skip` on the most important test in a module is found by attention rather than by the rubric. Per-line reasons make each skip re-evaluable in isolation and turn re-review into a mechanical check.

**Related Violations**:
Lines 53, 69, 80, 95, 107, 118, 124, 133, 143, 156, 168, 176 (host-runnable pins, green-activated elsewhere) and 186, 194, 200 (MANUAL holder gates). Alternative remediation: delete the 12 host-runnable dormant duplicates now that the automate suite pins them green, keeping only the 3 MANUAL gates with per-line reasons.

---

## Recommendations (Should Fix)

### 1. Scaffold bypasses the existing fixture (helper duplication + hardcoded identity)

**Severity**: P2 (Medium)
**Location**: `triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:43`
**Row**: M2
**Criterion**: Data Factories
**Knowledge Base**: [data-factories.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Issue Description**:
The scaffold defines its own local `soakSignalLines` (lines 43–50), duplicating the fixture's version, and hardcodes `UDID` / `IDENTIFIER` / `BUNDLE_ID` (lines 38–40) instead of importing `DW15_UDID`, `DW15_IDENTIFIER`, `DW15_BUNDLE_ID` from `fixtures/dw-decision-dw-15-fixtures.ts`. A factory for that shape already exists in the repo and the file bypasses it — drift risk: if the triage exclusions or identity pins change, the scaffold and the active specs disagree silently.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation)
const UDID = '00008120-00023C440263C01E';
const IDENTIFIER = 'DD0414C7-175F-54F0-B474-42F213FD3ABD';
const BUNDLE_ID = 'com.menontech.triade';

function soakSignalLines(log: string): string[] {
  return log
    .split('\n')
    .filter((l) => /redbox|fatal|crash|error/i.test(l))
    .filter((l) => !/Tried to modify key/.test(l))
    // ...
}
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
import {
  soakSignalLines,
  DW15_UDID as UDID,
  DW15_IDENTIFIER as IDENTIFIER,
  DW15_BUNDLE_ID as BUNDLE_ID,
} from '../../../_bmad-output/test-artifacts/fixtures/dw-decision-dw-15-fixtures.ts';
```

**Benefits**:
Single source of truth for triage exclusions and identity pins; exclusion-soundness fixes propagate to the scaffold automatically.

**Priority**:
P2 — the scaffold is dormant so nothing flakes today, but the duplication rots the moment the fixture evolves.

---

## Best Practices Found

### 1. Green-activated DoD pins with explicit traceability to dormant scaffolds

**Location**: `_bmad-output/test-artifacts/tests/api/dw-decision-dw-15.gateway.spec.ts:93,105`
**Pattern**: Dormant-to-active activation link
**Knowledge Base**: [selective-testing.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)

**Why This Is Good**:
Each activated pin names the dormant ATDD test it replaces (`[GREEN-ACTIVATED from ATDD P0-09]`), so a reader can verify no duplicate coverage and no dropped coverage in one glance.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
it('[P0] Given sha256.txt, when every line is parsed and re-hashed, then 3 logs verify [GREEN-ACTIVATED from ATDD P0-09]', () => {
```

**Use as Reference**:
Use this `[GREEN-ACTIVATED from ...]` tagging for any future dormant-to-active migrations.

### 2. Exclusion soundness proved, not just asserted

**Location**: `_bmad-output/test-artifacts/tests/api/dw-decision-dw-15.gateway.spec.ts:114`
**Pattern**: Benign-exclusion verification
**Knowledge Base**: [test-quality.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
The soak test asserts zero signals AND asserts the excluded warnings demonstrably exist (`worklets == 8`), so the gate cannot pass vacuously on empty logs.

### 3. Manual gates that cannot silently pass

**Location**: `triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:186`
**Pattern**: Fail-closed manual test
**Knowledge Base**: [test-quality.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
The P2 MANUAL bodies end in `assert.ok(false, ...)` — un-skipping one without doing the holder work fails loudly instead of passing silently. Keep this shape when adding the per-line skip reasons.

---

## Test File Analysis

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/unit/dw-decision-dw-15.atdd.test.ts`
- **File Size**: 107 lines
- **Test Framework**: node:test + tsx
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 2
- **Test Cases (it/test)**: 10
- **Average Test Length**: ~5 lines per test
- **Fixtures Used**: 1 (dw-decision-dw-15-fixtures.ts)
- **Data Factories Used**: 1 (same fixture module: soakSignalLines, validators, constants)

### Test Scope

- **Test IDs**: n/a (host-only seam, no element lookups)
- **Priority Distribution**:
  - P0 (Critical): 4 tests
  - P1 (High): 5 tests
  - P2 (Medium): 1 test
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: 21
- **Assertions per Test**: 2.1 (avg)
- **Assertion Types**: node:assert/strict (equal, deepEqual, ok, match)

### File Metadata (gateway)

- **File Path**: `_bmad-output/test-artifacts/tests/api/dw-decision-dw-15.gateway.spec.ts`
- **File Size**: 127 lines | **Describe Blocks**: 3 | **Test Cases**: 7 | **Assertions**: 25 | **Priorities**: P0 ×4, P1 ×3

### File Metadata (umbrella)

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/dw-decision-dw-15.umbrella.spec.ts`
- **File Size**: 77 lines | **Describe Blocks**: 4 | **Test Cases**: 4 | **Assertions**: 15 | **Priorities**: P0 ×3, P1 ×1 (MANUAL tracking)

### File Metadata (device scaffold, dormant)

- **File Path**: `triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts`
- **File Size**: 205 lines | **Describe Blocks**: 3 | **Test Cases**: 15 (15 skipped, 0 executed) | **Priorities**: P0 ×9, P1 ×3, P2 ×3

---

## Context and Integration

### What the Context Said

No context was supplied, so nothing here checked the tests against a requirement. The verdict speaks to how the tests are built, not to whether they match a requirement. (Run with `context_files` set to the spec/evidence/test-design to add requirement alignment; route coverage questions to `trace`.)

### Related Artifacts

None supplied for this run.

**Execution evidence collected during review**: the 3 active specs were executed (`tsx --test`): 22 pass, 0 fail, 0 skipped, ~200ms. The scaffold was not executed (all skips by design).

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern
- **[network-first.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/network-first.md)** - Route intercept before navigate (race condition prevention)
- **[data-factories.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness
- **[selective-testing.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)** - Duplicate coverage detection
- **[timing-debugging.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/timing-debugging.md)** - Flakiness detection patterns
- **[selector-resilience.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/selector-resilience.md)** - Stable locator patterns
- **[criteria-registry.md](.claude/skills/bmad-testarch-test-review/steps-c/criteria-registry.md)** - Single rule registry (severity read, never chosen)

For coverage mapping, consult `trace` workflow outputs.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Add per-line skip reasons (or delete dormant duplicates)** - 15 × one-line comment above each `it.skip`, or delete the 12 host-runnable dormant pins now green-activated in the automate suite
   - Priority: P0
   - Owner: test author
   - Estimated Effort: 15 minutes

2. **Import fixture instead of duplicating helper + pins in the scaffold** - replace local `soakSignalLines` and identity literals with fixture imports
   - Priority: P2
   - Owner: test author
   - Estimated Effort: 10 minutes

### Follow-up Actions (Future PRs)

1. **Precision note (no severity, registry has no row)**: the `triade/ untouched` invariant test shells out to `git diff`, which ignores untracked files — a new untracked file under `triade/` (as this scaffold itself is today) passes the invariant while violating its spirit. Consider `git status --porcelain -- triade/` instead.
   - Priority: P3
   - Target: backlog

### Re-Review Needed?

⚠️ Re-review after critical fixes - Block, then re-review (expected outcome after remediation: 0 Critical, score ≈ 100/A, Approve)

---

## Decision

**Recommendation**: Block

**Rationale**:
Fifteen committed skips with no per-line reason (C1 × 15) plus one fixture-bypass (M2) compute to score 0/100 (F). The active automate suite alone is excellent — 22/22 green, deterministic, isolated, well-factored — and the remediation is mechanical (per-line skip comments or deletion of superseded dormant pins). The Block verdict reflects the rubric's deterministic derivation (any CRITICAL ⇒ Block), not a judgment on the active tests' quality.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:43 | P2 | Data Factories | Local soakSignalLines + hardcoded pins bypass fixture | Import from dw-decision-dw-15-fixtures.ts |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:53 | P0 | Disabled tests | it.skip without per-line reason (P0-01) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:69 | P0 | Disabled tests | it.skip without per-line reason (P0-02) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:80 | P0 | Disabled tests | it.skip without per-line reason (P0-03) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:95 | P0 | Disabled tests | it.skip without per-line reason (P0-04) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:107 | P0 | Disabled tests | it.skip without per-line reason (P0-05) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:118 | P0 | Disabled tests | it.skip without per-line reason (P0-06) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:124 | P0 | Disabled tests | it.skip without per-line reason (P0-07) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:133 | P0 | Disabled tests | it.skip without per-line reason (P0-08) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:143 | P0 | Disabled tests | it.skip without per-line reason (P0-09) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:156 | P0 | Disabled tests | it.skip without per-line reason (P1-01) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:168 | P0 | Disabled tests | it.skip without per-line reason (P1-02) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:176 | P0 | Disabled tests | it.skip without per-line reason (P1-03) | Add reason comment or delete (green-activated) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:186 | P0 | Disabled tests | it.skip without per-line reason (P2-01 MANUAL) | Add reason comment (holder not present) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:194 | P0 | Disabled tests | it.skip without per-line reason (P2-02 MANUAL) | Add reason comment (holder not present) |
| triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts:200 | P0 | Disabled tests | it.skip without per-line reason (P2-03 MANUAL) | Add reason comment (holder not present) |

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v5.0
**Review ID**: test-review-dw-decision-dw-15-20260907
**Timestamp**: 2026-09-07
**Version**: 1.0

---

## Feedback on This Review

If you have questions or feedback on this review:

1. Review patterns in knowledge base: `.claude/skills/bmad-testarch-test-review/resources/knowledge/`
2. Consult the criteria registry: `.claude/skills/bmad-testarch-test-review/steps-c/criteria-registry.md`
3. Request clarification on specific violations
4. Pair with QA engineer to apply patterns

This review applies the rubric consistently. Context can reveal additional findings and clarify impact; it cannot waive a violation, change severity, or alter the score. Formal risk acceptance belongs in trace or the release gate.

---

## Reviewed Files

- _bmad-output/test-artifacts/tests/unit/dw-decision-dw-15.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/dw-decision-dw-15.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/dw-decision-dw-15.umbrella.spec.ts
- triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts

## Review Context

- none
