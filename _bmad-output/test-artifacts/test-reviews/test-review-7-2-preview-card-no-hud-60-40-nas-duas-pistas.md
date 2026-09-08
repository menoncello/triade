---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-07'
workflowType: 'testarch-test-review'
inputDocuments:
  - '_bmad-output/project-context.md'
  - '_bmad-output/test-artifacts/atdd-checklist-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md'
  - '_bmad-output/test-artifacts/fixtures/7-2-preview-card-no-hud-60-40-nas-duas-pistas-fixtures.ts'
---

# Test Quality Review: 7-2-preview-card-no-hud-60-40-nas-duas-pistas

**Quality Score**: 84/100 (B - Good)
**Review Date**: 2026-09-07
**Review Scope**: directory (5 test files covering story 7.2 + D-008 working-tree delta)
**Reviewer**: TEA Agent (Eduardo)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Block

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Deterministic, pure-function unit pins: fixed 60/40 boundary fixtures, no RNG, no hard waits, no wall-clock values anywhere in the set
✅ Every test carries a priority marker ([P0]/[P1]/[P2] and [E2E-xx Pn]/[Pn-API-xx] forms) and a behavior-shaped name; Given-When-Then comments present on all red scaffolds and journey/spec tests
✅ Level split is clean and documented: triade suites pin behavior/render, gateway pins source-contract, umbrella pins cross-seam journeys — no duplicate coverage
✅ D-008 null-guard pins (null/undefined pending, null ladder) degrade instead of throwing, matching the unguarded `App.tsx` call path
✅ Live execution evidence: triade scoped suites 67/67 pass, gateway+umbrella 18/18 pass, full triade suite 1027 pass / 0 fail; red file holds 10/10 skipped (CI-safe red form)

### Key Weaknesses

❌ Two tautological assertions (C3, CRITICAL): one compares a display value to itself; one asserts on hardcoded literals in the same test body — both can never fail
❌ Three flat test files (26, 7, and 10 tests) have no describe/context grouping (M4, MEDIUM)
❌ Gateway source-regex pins couple tests to implementation text (identifiers, literal expressions) — renames break tests with no behavior change (unscored observation, no registry row)

### Summary

The 7.2 test set is well-constructed: deterministic, isolated, behavior-named, and fully green against the committed 7.2 surface including the D-008 null guards. The score (84/B) reflects a small number of precise defects rather than systemic weakness. However, two CRITICAL tautological assertions mean two tests report green while proving nothing, so the computed recommendation is Block. Both fixes are one-line each (compare per-lane displays; drop the self-evident sanity check), plus cheap describe grouping for the three flat files — after which a re-review should clear to Approve.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS | 0    | Convention: `bddNaming` (11 of 20 sampled, established) | Behavior-shaped names throughout; Given-When-Then comments on red/journey/spec files |
| Test IDs                             | ✅ PASS | 0    | Convention: `testIds` (3 of 20 sampled, emerging) | No DOM lookups except previewCard, which queries via `accessibilityLabel` (label-based lookup satisfies) |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: `priorityMarkers` (9 of 20 sampled, emerging) | All 61 tests carry markers |
| Disabled or Focused Tests            | ✅ PASS | 0    | Absolute | 10 `test.skip` in red file carry a documented, still-true reason (red-phase scaffolds); no `.only` anywhere |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | None in any reviewed file |
| Determinism (no conditionals)        | ✅ PASS | 0    | Absolute + Applicability | `if (p.kind === 'range')` guards follow a pinning `strictEqual` (type narrowing, cannot skip); loops iterate fixed non-empty arrays |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | Module consts (`LADDER`, `E2E_JOURNEYS`, `FULL_POT_LADDER`) are read-only, never written; no hooks needed |
| Fixture Patterns                     | ✅ PASS | 0    | Applicability: files construct domain payloads | `pending()` helper + `PREVIEW_FIXTURES`; no triple-inline payload duplication |
| Data Factories                       | ✅ PASS | 0    | Applicability: files construct domain payloads | Same helpers; fixed boundary values are the pinned contract, not random data |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: no file navigates or reads data-dependent content | RN `node:test` project; convention absent (0 of 20 sampled) and gate closed |
| Explicit Assertions                  | ❌ FAIL | 2    | Absolute | 2× C3 tautological assertions (see Critical Issues) |
| Test Length (≤300 lines)             | ✅ PASS | 0    | Absolute | Largest file 265 lines |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | Full triade suite 5.3s; scoped 7.2 suites <0.5s |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute + Applicability | No timers, no wall clock, no retries, no env assumptions |

**Total Violations**: 2 Critical, 0 High, 3 Medium, 0 Low

**Convention Baseline**: 39 test files in corpus (`triade/__tests__/game` + `triade/__tests__/ui/components`), 20 sampled closest-first outside the review set

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -2 × 10 = -20
High Violations:         -0 × 5 = -0
Medium Violations:       -3 × 2 = -6
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

Final Score:             84/100
Grade:                   B
```

---

## Critical Issues (Must Fix)

### 1. Self-comparison assertion can never fail

**Severity**: P0 (Critical)
**Location**: `_bmad-output/test-artifacts/tests/e2e/7-2-preview-card-no-hud-60-40-nas-duas-pistas.umbrella.spec.ts:91`
**Row**: C3
**Criterion**: Explicit Assertions
**Knowledge Base**: [test-quality.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
`assert.strictEqual(displayOf(p), displayOf(p))` compares a pure function's output to itself. It cannot fail regardless of behavior, so E2E-04's "both lanes share the same display" claim carries zero signal while the suite reports green.

**Current Code**:

```typescript
// ❌ Bad (current implementation)
assert.strictEqual(displayOf(p), displayOf(p), 'both lanes share the same lane-agnostic display');
```

**Recommended Fix**:

```typescript
// ✅ Good (recommended approach)
const cleanDisplay = displayOf(p);
// Re-derive per lane from the same pending: the lane-agnostic display must be
// identical across lanes even when announcements differ.
assert.strictEqual(cleanDisplay, displayOf(previewFor(pending(6, 0.9))));
assert.notStrictEqual(clean, accelerated, 'per-lane notes must differ by label');
```

**Why This Matters**:
A test that cannot fail buys false confidence in the AC3 fan-out journey — the exact journey most likely to regress when Epic 3 adds the second lane.

### 2. Sanity assertion targets hardcoded literals in the same test

**Severity**: P0 (Critical)
**Location**: `_bmad-output/test-artifacts/tests/api/7-2-preview-card-no-hud-60-40-nas-duas-pistas.gateway.spec.ts:171`
**Row**: C3
**Criterion**: Explicit Assertions
**Knowledge Base**: [test-quality.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The P1-API-05 freeze test asserts `rel.includes('preview')` over string literals declared two lines above in the same body. The assertion exercises no system under test and cannot fail unless the test itself is edited.

**Current Code**:

```typescript
// ❌ Bad (current implementation)
for (const rel of ['triade/src/game/preview.ts', 'triade/src/ui/PreviewCard.tsx']) {
  assert.ok(rel.includes('preview') || rel.includes('Preview'), 'sanity');
}
```

**Recommended Fix**:

```typescript
// ✅ Good (recommended approach)
// Assert the freeze directly: no file under triade/src/engine may reference the preview seam.
import { readdirSync } from 'node:fs';
const engineFiles = readdirSync('triade/src/engine', { recursive: true }) as string[];
assert.ok(engineFiles.length > 0, 'engine dir must be non-empty for the freeze check to mean anything');
for (const f of engineFiles.filter((f) => f.endsWith('.ts'))) {
  const src = readSrc(`triade/src/engine/${f}`);
  assert.ok(!/previewFor|PreviewCard/.test(src), `${f} must not reference the preview seam`);
}
```

**Why This Matters**:
As written, the "freeze" pin is theater: the engine could import `previewFor` tomorrow and this test would still pass. Either assert the real invariant (engine sources contain no preview references) or delete the block — the neighboring `preview.ts must not import from ui` assertion already carries the signal.

---

## Recommendations (Should Fix)

### 1. Add describe grouping to the three flat test files

**Severity**: P2 (Medium)
**Location**: `triade/__tests__/game/preview.test.ts:1`, `triade/__tests__/ui/components/previewCard.test.ts:1`, `_bmad-output/test-artifacts/atdd-7-2-preview-card-no-hud.red.test.ts:1`
**Row**: M4
**Criterion**: Fixture Patterns (Ungrouped suite)
**Knowledge Base**: [test-quality.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Three files hold 26, 7, and 10 tests respectively with no `describe`/`context` grouping, so failures print without a subject line beyond the individual test name.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation)
import { test } from 'node:test';
test('[P0] AC2 — displayRoll below 0.6 yields the exact value', () => { /* … */ });
test('[P0] AC2 — displayRoll at 0.6 (boundary) yields a range', () => { /* … */ });
// …24 more top-level tests
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
import { describe, test } from 'node:test';
describe('[7.2] previewFor 60/40 display decision', () => {
  test('[P0] AC2 — displayRoll below 0.6 yields the exact value', () => { /* … */ });
});
describe('[7.2] D-008 null guards', () => {
  test('[P0] AC2 — previewFor(null) does not throw', () => { /* … */ });
});
```

**Benefits**:
Grouped output localizes failures to AC/decisions (boundary vs window vs D-008 guards) instead of a flat 26-line list.

**Priority**:
P2 — readability/diagnosis only; the [P0]/AC tags in test names already mitigate the impact.

### 2. (Unscored observation, no registry row) Gateway pins couple to implementation text

**Severity**: none (prose only — the criteria registry has no row for source-text coupling; no deduction applied)
**Location**: `_bmad-output/test-artifacts/tests/api/7-2-preview-card-no-hud-60-40-nas-duas-pistas.gateway.spec.ts:53-54,64-67,77-79`

**Issue Description**:
Regex pins on identifiers and literal expressions (`PREVIEW_EXACT_BOUNDARY`, `roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY`, `WINDOW_MAX\s*=\s*3`, `1,\s*\n?\s*2,`) break on renames or refactors that preserve behavior. The file's own header acknowledges this trade ("source-contract pins … so the behavior pins keep meaning"), which is a legitimate white-box choice for a display seam — but expect maintenance churn if `preview.ts` is refactored.

**Recommended Improvement**:
Prefer asserting through `previewFor` behavior (already covered in `triade/__tests__/game/preview.test.ts`) and keep at most the purity regexes (`Math.random(`, roll-symbol imports) as trip-wires. No action required for this review's verdict.

---

## Best Practices Found

### 1. Boundary pins use ULP-adjacent fixtures, not magic re-derivation

**Location**: `triade/__tests__/game/preview.test.ts:29-37`
**Pattern**: Exact-boundary testing with named fixtures
**Knowledge Base**: [test-quality.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
`0.599 → exact` / `0.6 → range` pins the half-open boundary with one-ULP-adjacent values instead of reimplementing the comparison, and the F-2 test pins window *contents* at the boundary (containment + cap + contiguity), not just the `kind` discriminant.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
test('[P0] AC2 — displayRoll below 0.6 yields the exact value', () => {
  const p = previewFor(pending(12, 0.599));
  assert.deepStrictEqual(p, { kind: 'exact', value: 12 });
});
```

**Use as Reference**:
Use this shape for every numeric display boundary in the project (pot ladder, bloom caps, band geometry).

### 2. Ladder derived from engine config data in both tests and fixtures

**Location**: `triade/__tests__/game/preview.test.ts:10`, `_bmad-output/test-artifacts/fixtures/7-2-preview-card-no-hud-60-40-nas-duas-pistas-fixtures.ts:15-21`
**Pattern**: Single-source-of-truth test data
**Knowledge Base**: [data-factories.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Why This Is Good**:
`LADDER`/`FULL_POT_LADDER` derive from `POT_CURVE` keys plus the fixed `[1,2]` prefix, so an engine curve retune flows through the tests instead of rotting hardcoded expectations — exactly the boundary-rule-4 constraint the story imposes on production code, mirrored in test code.

### 3. Red-phase scaffolds are CI-safe by construction with activation docs

**Location**: `_bmad-output/test-artifacts/atdd-7-2-preview-card-no-hud.red.test.ts:1-19`
**Pattern**: Skipped-scaffold red phase with documented reason
**Knowledge Base**: [component-tdd.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/component-tdd.md)

**Why This Is Good**:
All 10 scaffolds are `test.skip` with a header documenting why (red-phase pins for the shipped 7.2 contract) and exact activation steps. Verified: 10 skipped / 0 fail under plain `node --test`, so they hold the regression net without ever breaking CI. This is also why C1 does not fire: the skips carry a documented, still-true reason.

---

## Test File Analysis

### File Metadata

- **Files reviewed**: 5 (826 lines total)
- **Test Framework**: `node:test` + `tsx` (triade runner: `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`); red file runs under plain `node --test`
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 2 (umbrella, gateway); 0 in the three flat files (see M4)
- **Test Cases (it/test)**: 26 + 7 + 10 (skipped) + 6 + 12 = 61
- **Fixtures Used**: 1 shared (`7-2-preview-card-no-hud-60-40-nas-duas-pistas-fixtures.ts`: `pending`, `isContiguousSlice`, `displayOf`, `announcementOf`, `readSrc`, `PREVIEW_FIXTURES`) + local `pending()`/`LADDER` helpers in `preview.test.ts`
- **Data Factories Used**: `pending()` builders with fixed boundary values (no faker — correct for exact boundary pins)

### Test Scope

- **Test IDs**: `[P0]` ×53, `[P1-API]`/`[E2E-04 P1]`/`[E2E-05 P1]` ×5, `[P2]`/`[P2-API-01]`/`[E2E-06 P2]` ×3 — full marker coverage, no unknowns
- **Priority Distribution**:
  - P0 (Critical): 53 tests
  - P1 (High): 5 tests
  - P2 (Medium): 3 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~85 (all explicit `node:assert` / `node:assert-strict`)
- **Assertions per Test**: ~1.7 avg — one-concern tests, no assertion-free bodies
- **Assertion Types**: `deepStrictEqual`, `strictEqual`, `ok`, `match`, `doesNotThrow`, `notDeepStrictEqual`, `notStrictEqual`

### Execution Evidence (this run)

- `triade` scoped 7.2 suites (`preview`, `previewCard`, `hud`, `hud.previewWiring`, `preview-invariant`): 67 pass / 0 fail
- Gateway + umbrella (host runner): 18 pass / 0 fail
- Red file: 10 skipped / 0 fail (red form, CI-safe)
- Full triade suite: 1027 pass / 0 fail / 445 skipped (skips are pre-existing red-phase scaffolds for future stories)
- `npx tsc --noEmit` (triade): clean per ATDD checklist evidence; `git diff --stat -- triade/src/engine`: empty (engine freeze intact)

---

## Context and Integration

### What the Context Said

The working tree carries no uncommitted production diff for 7.2 (`git diff HEAD --stat -- triade/` empty); the change under review is the committed 7.2 surface plus the D-008 delta (null guards in `previewFor` + 3 pins, commit `ee3ce91`). `sprint-status.yaml` shows 7.2 `done` — orchestrator bookkeeping, treated as read-only and never modified here.

The ATDD checklist maps AC1–AC7 to unit/component levels and documents the red→green arc (pre-7.2 the scaffolds fail by construction since `preview.ts` did not exist; post-7.2 they encode the shipped contract). Context raised no additional findings beyond the rubric: the AC3 fan-out claim ("single preview shown per active lane") is exercised by the E2E-04 journey whose self-comparison assertion (C3 finding #1) weakens exactly that pin — impact noted, severity unchanged per rubric rules.

### Related Artifacts

- **ATDD Checklist**: `_bmad-output/test-artifacts/atdd-checklist-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md` (AC→level strategy, red/green evidence, implementation checklist)
- **Test Design**: `_bmad-output/test-artifacts/test-design/test-design-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md` (referenced via checklist; not re-read — findings stand on the rubric alone)
- **Project Context**: `_bmad-output/project-context.md` (N3 preview law: reads `pendingSpawn`, never re-rolls, never animates with feel — honored by all reviewed tests)

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture pattern (applicability check)
- **[data-factories.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with fixed boundary values
- **[test-levels-framework.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)** - Unit vs component vs journey split validation
- **[component-tdd.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/component-tdd.md)** - Red-phase scaffold convention
- **[selective-testing.md](.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)** - Duplicate-coverage check across the 5 files

For coverage mapping, consult `trace` workflow outputs.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Fix the two C3 tautological assertions** - replace self-comparison with per-lane re-derivation; replace literal sanity block with a real engine-dir freeze scan (or delete it)
   - Priority: P0
   - Owner: story 7.2 author
   - Estimated Effort: 15 minutes

2. **Add describe grouping to the three flat files** - boundary / window / D-008 groups in `preview.test.ts`, render groups in `previewCard.test.ts`, AC groups in the red file
   - Priority: P2
   - Owner: story 7.2 author
   - Estimated Effort: 20 minutes

### Follow-up Actions (Future PRs)

1. **Re-review after fixes** - fast re-run of this review on the 2 touched files; expect 100/100 (A) and Approve
   - Priority: P2
   - Target: next 7.2-touching change

### Re-Review Needed?

⚠️ Re-review after critical fixes - Block, then re-review (expected to be quick: 2 one-line fixes + grouping)

---

## Decision

**Recommendation**: Block

**Rationale**:
Two CRITICAL tautological assertions (C3) mean two tests cannot fail regardless of behavior — the suite reports green while proving nothing on the AC3 fan-out journey and the engine-freeze pin. Per the computed rule (any CRITICAL ⇒ Block), the verdict is Block despite the otherwise strong 84/B quality. All fixes are small and mechanical; no design or coverage concern blocks the story itself.

**For Block**:

> Test quality is insufficient with 84/100 score for merge-as-is. 2 critical violations (zero-signal assertions) must be fixed before the set can be trusted as a regression net. Recommend fixing the two assertions plus describe grouping, then a quick re-review.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| umbrella:91 | CRITICAL | Explicit Assertions (C3) | Self-comparison `displayOf(p)` vs `displayOf(p)` | Compare per-lane re-derivations |
| gateway:171 | CRITICAL | Explicit Assertions (C3) | Sanity assert on same-body literals | Scan engine dir for preview refs or delete |
| preview.test.ts:1 | MEDIUM | Ungrouped suite (M4) | 26 tests, no describe | Add AC-grouped describes |
| previewCard.test.ts:1 | MEDIUM | Ungrouped suite (M4) | 7 tests, no describe | Add render-grouped describes |
| red.test.ts:1 | MEDIUM | Ungrouped suite (M4) | 10 tests, no describe | Add AC-grouped describes |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| preview.test.ts | 96/100 (file-level: 1 MEDIUM) | B | 0 | Approve with Comments |
| previewCard.test.ts | 98/100 (file-level: 1 MEDIUM) | B | 0 | Approve with Comments |
| atdd red.test.ts | 98/100 (file-level: 1 MEDIUM) | B | 0 | Approve with Comments |
| umbrella.spec.ts | 88/100 (file-level: 1 CRITICAL) | B | 1 | Block |
| gateway.spec.ts | 88/100 (file-level: 1 CRITICAL) | B | 1 | Block |

**Suite Average**: 84/100 (B)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v5.0
**Review ID**: test-review-7-2-preview-card-no-hud-60-40-nas-duas-pistas-20260907
**Timestamp**: 2026-09-07
**Version**: 1.0
**Execution Mode**: sequential (capability probe: subagent/agent-team dispatch unsupported in this runtime; evaluation performed inline against criteria-registry.md with step-02b convention baseline)

---

## Feedback on This Review

If you have questions or feedback on this review:

1. Review patterns in knowledge base: `.claude/skills/bmad-testarch-test-review/resources/knowledge/`
2. Request clarification on specific violations
3. Pair with QA engineer to apply patterns

This review applies the rubric consistently. Context can reveal additional findings and clarify impact; it cannot waive a violation, change severity, or alter the score. Formal risk acceptance belongs in trace or the release gate.

---

## Reviewed Files

- triade/__tests__/game/preview.test.ts
- triade/__tests__/ui/components/previewCard.test.ts
- _bmad-output/test-artifacts/atdd-7-2-preview-card-no-hud.red.test.ts
- _bmad-output/test-artifacts/tests/e2e/7-2-preview-card-no-hud-60-40-nas-duas-pistas.umbrella.spec.ts
- _bmad-output/test-artifacts/tests/api/7-2-preview-card-no-hud-60-40-nas-duas-pistas.gateway.spec.ts

## Review Context

- _bmad-output/test-artifacts/atdd-checklist-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md
- _bmad-output/project-context.md
- _bmad-output/test-artifacts/fixtures/7-2-preview-card-no-hud-60-40-nas-duas-pistas-fixtures.ts

## Excluded From Review Set

- _bmad-output/test-artifacts/atdd-checklist-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md — format not scorable by the ledger
- _bmad-output/test-artifacts/test-design-progress.md — format not scorable by the ledger
- _bmad-output/test-artifacts/traceability/traceability-matrix-7-2.md — format not scorable by the ledger
- _bmad-output/test-artifacts/traceability/e2e-trace-summary-7-2.json — format not scorable by the ledger
- _bmad-output/test-artifacts/traceability/gate-decision-7-2.json — format not scorable by the ledger
