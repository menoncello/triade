---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-08'
workflowType: 'testarch-test-review'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md'
  - '_bmad-output/test-artifacts/test-design/test-design-9-2-screen-reader-contract-td-20260907.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-9-2-screen-reader-contract.md'
  - '_bmad-output/test-artifacts/atdd-checklist-9-2-screen-reader-contract.preview-banner.md'
  - '_bmad-output/test-artifacts/fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts'
  - '_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts'
  - 'triade/__tests__/a11y/screenReader.contract.test.tsx'
  - 'triade/App.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/a11y/announcements.ts'
  - 'triade/src/i18n/locales/en.json'
  - 'triade/src/i18n/locales/pt.json'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: 9-2 Screen Reader Contract — Preview/Banner Working-Tree Delta

**Quality Score**: 100/100 (A - Excellent)
**Review Date**: 2026-09-08
**Review Scope**: directory (working-tree delta for 9-2-screen-reader-contract: 2 active spec files under `_bmad-output/test-artifacts/tests/`)
**Reviewer**: Eduardo (TEA Agent / Murat — Master Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Approve with Comments

<!-- COMPUTED, never chosen. steps-c/step-03f-aggregate-scores.md §3b derives this from the
     deduped violation counts: any CRITICAL => Block; any HIGH => Request Changes; score < 70 =>
     Request Changes; any remaining finding => Approve with Comments; otherwise Approve. Copy the
     computed value into this line and into `## Decision` unchanged — the CLI rejects a report
     whose two copies disagree, and a verdict picked by judgment beside a deterministic score is
     how two reviewers reached 82 and 85 on the same files and still returned opposite outcomes.
     A waiver changes the exit code, never this value. -->

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

<!-- What this review was judged against, resolved in step 1. `none` means no story, test design, or source accompanied the tests: the verdict speaks to how the tests are built, not to whether they match a requirement. -->

<!-- Context can add findings and clarify impact. It cannot waive a rubric violation, change severity, or alter the score. This machine-readable value must remain 0. -->

### Key Strengths

✅ Both active suites GREEN on execution at review time: API gateway 11/11 pass (~255 ms), E2E umbrella 8/8 pass (~287 ms), `node:test + tsx`, zero waits, zero skips, zero `.only` — deterministic host-only coverage of the `d26bbdd..HEAD` delta (`App.tsx` preview/banner effects + `PreviewCard.tsx` i18n label).

✅ Exemplary isolation harness duplicated faithfully in both files: `beforeEach` stubs `AccessibilityInfo.announceForAccessibility`/`announceForAccessibilityWithOptions` into `captured[]`, calls `resetScoreThrottleForTests()` + `i18n.changeLanguage('en')`; `afterEach` restores originals and resets locale — every test can run alone, in any order, with no shared-state leakage (H4 does not fire).

✅ Every test carries a priority marker in the house form (`[P0-API-PB-NN]` / `[P0-UMB-PB-NN]` / `[P1-…]` / `[P2-…]`) and a `Given/When/Then` behavioral name with `// Given/When/Then` step comments — exceeding the repo's measured conventions and making failures self-localising by name even without `describe` grouping.

### Key Weaknesses

❌ Ungrouped suites (M4, ×2 files): the API file has 11 top-level `test()` and the E2E file 8 top-level `test()`, with zero `describe`/`context` grouping in either. Failures print as bare `[P1-API-PB-08] …` without a subject heading, and the two files will each grow if the P1 contract follow-up (P1-D1..D4) lands here.

❌ Announce-capture harness copy-pasted across both spec files instead of living in the shared fixture module: the ~10-line `captured`/`origAnnounce` `beforeEach`/`afterEach` block is identical in the API and E2E files while `_bmad-output/test-artifacts/fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts` already exists as the delta's single source — a third consumer would triple the drift surface (prose advisory, no registry row, no deduction).

### Summary

The working-tree delta for 9-2 is the TEA automate pass over the preview/banner wiring (`9c33e33` + review patches): one shared fixture module plus two ACTIVE host suites (API gateway, E2E umbrella) pinning `announcePreview`/`announceBanner` behaviour, EN+PT `a11y.preview` keys, mount-silence, false→true banner gating, and the `PreviewCard` i18n label. Both suites execute green in under a second combined with no flakiness signals. The ledger carries only two MEDIUMs (ungrouped suite, one per file) → 96 + Excellent BDD (+5) + Perfect Isolation (+5) = 106, clamped to 100/100 (A). Verdict is `Approve with Comments` (no CRITICAL/HIGH, score ≥ 70, MEDIUM present) — merge-safe; grouping the suites into `describe` blocks is recommended follow-up grooming.

---

## Quality Criteria Assessment

| Criterion                            | Status          | Violations | Basis                                                            | Notes        |
| ------------------------------------ | --------------- | ---------- | ---------------------------------------------------------------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS         | 0          | Convention: `bddNaming` absent (0 of 40 sampled)                  | 0 of 40 sampled files use literal `Given/When/Then` in test names; reviewed files exceed the (absent) convention with full `Given X, when Y, then Z` names + step comments — gate absent so no L5 violation possible, and quality exceeds it. No deduction. |
| Test IDs                             | ✅ PASS (n/a)   | 0          | Convention: `testIds` absent (0 of 40 sampled)                   | 0 of 40 sampled files use `data-testid`/`getByTestId`; RN a11y locates via `accessibilityLabel`/`accessibilityRole` (E2E `a11yLabelOf` helper reads the `accessibilityLabel` prop), which satisfies the locator need — PASS (n/a). L3 needs a test-id convention to fire; none exists. |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS         | 0          | Convention: `priorityMarkers` established (30 of 40 sampled, form `[P#]` in test name) | All 19 reviewed tests carry `[P0/P1/P2]-…-PB-NN` markers in the observed house form — 19/19. PASS against an established convention. |
| Disabled or Focused Tests            | ✅ PASS         | 0          | Absolute                                                         | Zero `.skip`, `xit`, `xdescribe`, `test.todo`, `.only`, `fdescribe`, `fit`, `test.only` in either reviewed file (the single `test.skip` grep hit is the word inside a header comment, not a call). C1/C2 do not fire. |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS         | 0          | Absolute                                                         | Zero `waitForTimeout`, `sleep(`, `setTimeout`, `setInterval` in either file — pure synchronous host assertions + `await i18n.changeLanguage`. H1 does not fire. |
| Determinism (no conditionals)        | ✅ PASS         | 0          | Absolute + Applicability                                         | No `if`/ternary selecting an expected value, no `try/catch` swallowing failures in test bodies. The `for (const fix of BANNER_TRANSITION_FIXTURES)` loop iterates a 7-element const — fixed length, never zero-trip (same ruling as the 2026-09-03 review) — not a conditional assertion. No wall-clock fixtures governing TTL/expiry, so H2's gate is closed. H3/C6 do not fire. |
| Isolation (cleanup, no shared state) | ✅ PASS         | 0          | Absolute                                                         | Module-scoped `captured`/`origAnnounce` are reset in `beforeEach` and restored in `afterEach` in both files, plus `resetScoreThrottleForTests()` and locale reset. No test mutates shared state without reset. H4 does not fire; C5 does not fire (every mock assertion is preceded by a call into the SUT, e.g. `announcePreview`/`announceBanner`/render). |
| Fixture Patterns                     | ✅ PASS         | 0          | Applicability: file constructs domain payloads                   | Both specs consume the shared fixture module (`BANNER_TRANSITION_FIXTURES`, `bannerTransitions`, `previewDisplayOf`, `PREVIEW_DISPLAY_*`, `readSource`) instead of inline duplication. No `mergeTests`/`test.extend` convention exists in repo (0/40) — plain `node:test` + fixture-module import is the house pattern and is followed. M2/M5 do not fire. |
| Data Factories                       | ✅ PASS         | 0          | Applicability: file constructs domain payloads                   | Preview shapes come from `PREVIEW_DISPLAY_FIXTURES` constants; banner matrix from `BANNER_TRANSITION_FIXTURES` — deterministic, no faker churn needed for this surface. No ≥3 identical inline payload shapes in either file. M2 does not fire. |
| Network-First Pattern                | ✅ PASS (n/a)   | 0          | Applicability: file navigates and then reads data-dependent content | No `page.goto`/`cy.visit`/router push — RN `AccessibilityInfo` host bridge, no browser DOM, no network. Gate closed; M1 cannot fire. |
| Explicit Assertions                  | ✅ PASS         | 0          | Absolute                                                         | Every test holds ≥1 explicit assertion (`assert.equal`/`assert.ok`/`assert.match`/`assert.deepEqual`): API 11 tests / ~30 assertions, E2E 8 tests / ~30 assertions. Zero assertion-free tests (C4), zero tautologies (C3 — `deepEqual(captured, ['Ceiling open'])` verifies verbatim pass-through of the SUT, not a self-comparison). M6 does not fire (all async calls awaited). |
| Test Length (≤300 lines)             | ✅ PASS         | 0          | Absolute                                                         | API 188 lines, E2E 182 lines — both well under 300. H5 does not fire. |
| Test Duration (≤1.5 min)             | ✅ PASS         | 0          | Absolute                                                         | Measured at review time: API ~255 ms, E2E ~287 ms total. Three orders of magnitude under target. |
| Flakiness Patterns                   | ✅ PASS         | 0          | Absolute + Applicability                                         | Zero tight timeouts, zero race conditions, zero retry logic, zero timing-dependent assertions. One environment coupling noted as prose advisory only (P2-UMB-PB-07 shells `git diff d26bbdd..HEAD` — breaks on shallow clones missing that commit; the registry has no row for environment-dependent helpers, so no severity and no deduction). |

**Total Violations**: 0 Critical, 0 High, 2 Medium, 0 Low

**Convention Baseline**: corpusSize 269 (test files under `triade/__tests__`, `_bmad-output/test-artifacts/tests`, `_bmad-output/test-artifacts/atdd-tests`, excluding the review set), sampled 40 (first 40 of `triade/__tests__`, per step-02 closest-first approximation on a single-neighbourhood corpus). Conventions measured:
- `priorityMarkers`: 30/40 established `[P#]` in test name
- `testIds`: 0/40 absent `data-testid`/`getByTestId`
- `bddNaming`: 0/40 absent `Given/When/Then` in test name
- `networkFirst`: 0/40 absent `page.route`/`interceptNetworkCall`
- `dataFactories`: 0/40 absent `build*`/`factory`
- `fixtures`: 0/40 absent `mergeTests`/`test.extend`
- `assertionStyle`: 40/40 established `node:assert` (`node:assert/strict`)

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -0 × 5 = -0
Medium Violations:       -2 × 2 = -4
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

<!-- This ledger is the workflow's only scoring model (see steps-c/step-03f-aggregate-scores.md).
     Every bonus line is 0 or 5, never a partial value, and the six categories above are the
     complete set. {grade} is exactly one of A, B, C, D, F, with no modifier such as A+ or B-.
     The lines above must sum to {final_score}, which must equal the **Quality Score** line;
     headless runners compute the authoritative result and normalize score and grade fields. -->

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Ungrouped Suite — Group API Gateway Tests into Describes

**Severity**: P2 (Medium)
**Location**: `_bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts:1`
**Row**: M4
**Criterion**: Fixture Patterns / Maintainability (Ungrouped suite)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The file has 11 top-level `test()` blocks with no `describe`/`context` grouping. When one fails (e.g. the banner-effect pin `[P1-API-PB-08]`), the reporter prints the bare name without a subject heading, so triage must parse the `[P1-API-PB-NN]` prefix rather than reading a group.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation) — 11 top-level tests, no grouping
import { test } from 'node:test';
test('[P0-API-PB-01] Given announcePreview, when EN locale, then …', async () => { … });
test('[P1-API-PB-07] Given App.tsx, when reading the preview effect, then …', () => { … });
// ... 9 more at top level
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended) — group by contract area, no extra nesting
import { describe, test } from 'node:test';
describe('announcement contract (P0)', () => {
  test('[P0-API-PB-01] Given announcePreview, when EN locale, then …', async () => { … });
  // … PB-02..PB-06
});
describe('wiring pins (P1)', () => {
  test('[P1-API-PB-07] Given App.tsx, when reading the preview effect, then …', () => { … });
  // … PB-08..PB-09
});
describe('contract durability (P2)', () => { … });
```

**Benefits**:
Failures localise to `announcement contract` / `wiring pins` / `contract durability` headings in `node --test` output. No new depth (M7 stays clean at 1 level), no logic change.

**Priority**:
P2 (Medium) — grooming, not blocking. Cheap now (15 min); prevents the file from becoming the next 285-line ungrouped suite when the P1-D1..D4 contract follow-up lands.

---

### 2. Ungrouped Suite — Group E2E Umbrella Tests into Describes

**Severity**: P2 (Medium)
**Location**: `_bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts:1`
**Row**: M4
**Criterion**: Fixture Patterns / Maintainability (Ungrouped suite)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The file has 8 top-level `test()` blocks with no `describe`/`context` grouping — same M4 shape as finding #1, one file over. The P0 journey tests (PB-01..PB-03), display/banner journeys (PB-04..PB-06), and boundary tests (PB-07..PB-08) read as three natural groups that the flat layout hides.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation) — 8 top-level tests, no grouping
test('[P0-UMB-PB-01] Given a fresh mount, when the preview display first renders, then …', async () => { … });
test('[P1-UMB-PB-04] Given preview shapes, when deriving display strings, then …', () => { … });
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
import { describe, test } from 'node:test';
describe('preview/banner journey (P0)', () => { … });
describe('display derivation + banner journey (P1)', () => { … });
describe('engine boundary + no-spam (P2)', () => { … });
```

**Benefits**:
Same triage localisation as #1; keeps the umbrella readable when the device ear-check (P3, manual) eventually gains automated pins.

**Priority**:
P2 (Medium) — grooming, not blocking. Do together with #1 in one pass.

---

### 3. Advisory (no deduction) — Factor the Announce-Capture Harness into the Fixture Module

**Severity**: n/a (no registry row — the registry has no row for cross-file helper duplication; this is prose, carries no severity and no deduction)
**Location**: `_bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts:33-50` and `_bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts:33-47`
**Row**: n/a
**Criterion**: Fixture Patterns (advisory)
**Knowledge Base**: [fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)

**Issue Description**:
The ~10-line `captured`/`origAnnounce` stub + `resetScoreThrottleForTests()` + locale-swap `beforeEach`/`afterEach` is byte-identical in both spec files, while the delta already owns a shared fixture module. A third consumer (e.g. the P1-D1..D4 contract-extension tests) would triple the drift surface for stub-restore bugs.

**Recommended Improvement**:

```typescript
// ✅ Better approach — fixture module owns the harness
// fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts
export function installAnnouncementCapture() {
  let captured: string[] = [];
  let origAnnounce: unknown;
  let origAnnounceWithOpts: unknown;
  beforeEach(async () => { /* stub + reset + en */ });
  afterEach(async () => { /* restore + en */ });
  return { captured: () => captured };
}
```

**Benefits**: Single-site stub lifecycle; restores stay paired with installs by construction.

---

### 4. Advisory (no deduction) — P2-UMB-PB-07 Shells to Git (Shallow-Clone Coupling)

**Severity**: n/a (no registry row — environment-dependent helpers are not in the criteria registry; prose only, no deduction)
**Location**: `_bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts:161-168`
**Row**: n/a
**Criterion**: Flakiness Patterns (advisory)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The engine-purity boundary test runs `git diff d26bbdd..HEAD --stat -- triade/src/engine` via `execSync`. It passes on full clones but fails on shallow clones (or any checkout missing `d26bbdd`), making it environment-dependent rather than self-contained. It is deterministic in CI as configured today, so this is hardening, not a defect.

**Recommended Improvement**:
Pin the boundary structurally instead of historically — e.g. assert at the ADR-01 level (`App.tsx` memo derives display strings only; no `previewFor`/`potForTier` rule logic inside the memo) — or skip-with-reason when `d26bbdd` is unresolvable, with the skip reason documented on the line per C1.

---

## Best Practices Found

### 1. Pure Replica of Production Logic in Fixtures (Change-Check + Display Derivation)

**Location**: `_bmad-output/test-artifacts/fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts:66-124`
**Pattern**: `previewDisplayOf` + `bannerTransitions` pure replicas of the `App.tsx` memo/effect decisions
**Knowledge Base**: [fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)

**Why This Is Good**:
The memo contract (exact → `String(value)`; range → finite-filtered `join('/')`; `''` on empty/exception) and the banner decision (`null` → silent; else false→true only) are pinned as pure functions with a 6-row expectation table and a 7-row transition matrix — the E2E journey tests exercise decisions without mounting `App`, keeping the suite at ~287 ms with zero timing risk.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
export function bannerTransitions(prev: BannerState | null, next: BannerState): { ceiling: boolean; stuck: boolean } {
  if (prev === null) return { ceiling: false, stuck: false };
  return {
    ceiling: next.ceiling && !prev.ceiling,
    stuck: next.stuck && !prev.stuck,
  };
}
```

**Use as Reference**:
Reuse for any future `App.tsx` effect-decision pin (e.g. DW-112 `setAccessibilityFocus` conditions).

### 2. Static Source-Contract Triangulation for Wiring That Is Expensive to Mount

**Location**: `_bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts:125-161`
**Pattern**: `readSource` + regex pins on `App.tsx`/`PreviewCard.tsx`/`announcements.ts` (`prevPreviewRef.current === null`, change-check, `msg && msg !== key` guards, `i18n.t('a11y.preview'`)
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
Same triangulation pattern as the 2026-09-03 review's praised practice #3: validates wiring that would otherwise need a deep `App` mount (navigation + engine + Skia) at <2 ms per assertion, catching regressions like dropping the banner null-init symmetry or the raw-key guard.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
assert.match(src, /prevPreviewRef\.current\s*===\s*null/);
assert.match(src, /prevPreviewRef\.current\s*!==\s*a11yPreviewDisplay/);
assert.match(src, /announcePreview\(a11yPreviewDisplay\)/);
```

**Use as Reference**:
Apply to future `App.tsx` effect wiring (e.g. tone-pause, DW-112 focus pin).

### 3. Real-Component E2E Through PreviewCard + Real i18n (No Mocks of the SUT)

**Location**: `_bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts:49-59,94-110`
**Pattern**: `react-test-renderer` mount of the real `PreviewCard` with real `i18n` in EN and PT, asserting the real `accessibilityLabel` end to end
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
The PT journey test renders the actual card, reads the actual label (`/Próxima/`), fires the actual `announcePreview`, and asserts the queued message — the full user path with nothing mocked except the OS bridge (`AccessibilityInfo`). C5 (mock asserted against itself) cannot fire anywhere in this suite by construction.

---

## Test File Analysis

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts`
- **File Size**: 188 lines, ~7.4 KB
- **Test Framework**: node:test (`node --test` with `tsx` import)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0
- **Test Cases (it/test)**: 11
- **Average Test Length**: ~13 lines per test
- **Fixtures Used**: 1 module (`9-2-screen-reader-contract.preview-banner.fixtures.ts`: `readSource`, `BANNER_TRANSITION_FIXTURES`, `bannerTransitions`)
- **Data Factories Used**: 0 dedicated factory files (deterministic const fixtures consumed from the shared module; no faker needed)

### Test Scope

- **Test IDs**: `[P0-API-PB-01]`..`[P0-API-PB-06]`, `[P1-API-PB-07]`..`[P1-API-PB-09]`, `[P2-API-PB-10]`..`[P2-API-PB-11]`
- **Priority Distribution**:
  - P0 (Critical): 6 tests
  - P1 (High): 3 tests
  - P2 (Medium): 2 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~30 (`assert.equal` 8, `assert.ok` 6, `assert.match` 16)
- **Assertions per Test**: 2.7 (avg)
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.match`, `assert.deepEqual`

---

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts`
- **File Size**: 182 lines, ~7.8 KB
- **Test Framework**: node:test (`node --test` with `tsx` import) + `react-test-renderer`
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 0
- **Test Cases (it/test)**: 8
- **Average Test Length**: ~17 lines per test
- **Fixtures Used**: 1 module (same fixture module: `readSource`, `previewDisplayOf`, `PREVIEW_DISPLAY_FIXTURES`, `PREVIEW_DISPLAY_EXPECTATIONS`)
- **Data Factories Used**: 0 dedicated factory files (same deterministic-const rationale)

### Test Scope

- **Test IDs**: `[P0-UMB-PB-01]`..`[P0-UMB-PB-03]`, `[P1-UMB-PB-04]`..`[P1-UMB-PB-06]`, `[P2-UMB-PB-07]`..`[P2-UMB-PB-08]`
- **Priority Distribution**:
  - P0 (Critical): 3 tests
  - P1 (High): 3 tests
  - P2 (Medium): 2 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~30 (`assert.equal` 18, `assert.ok` 8, `assert.match` 4)
- **Assertions per Test**: 3.8 (avg)
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.match`

---

## Context and Integration

### What the Context Said

The context set (spec `9-2-screen-reader-contract.md` with `baseline_revision d26bbdd` → `final_revision 9c33e33` and the 2026-09-07 triage log recording the 2 low review patches — banner null-init symmetry + `msg && msg !== key` guards; targeted test design `test-design-9-2-screen-reader-contract-td-20260907.md` with R-D1..R-D6/P1-D1..D4; the ATDD preview-banner red scaffolds + checklist; the standing P0 contract `screenReader.contract.test.tsx` 15/15 green; and source `App.tsx`/`PreviewCard.tsx`/`announcements.ts`/`en.json`/`pt.json`) established the delta contract: `a11yPreviewDisplay` memo + skip-first-mount preview announce, ceiling/stuck false→true banner announces with empty/raw-key guards, `a11y.preview` i18n label with EN fallback.

Context raised two findings-worthy observations and zero waivers: (1) the P1 contract-extension gap (P1-D1..D4 RED scaffolds — `a11y.preview` key pin, PT phrasing pin, App-gate `announcePreview|announceBanner` + ref pins, change-check invariant) is durably tracked by the red scaffold file and cross-referenced by `[P2-API-PB-10]` — recorded here as context confirmation, not as a ledger violation (the scaffold file itself is context, never scored); (2) the engine-purity boundary (`git diff d26bbdd..HEAD -- triade/src/engine` empty) is asserted by `[P2-UMB-PB-07]` — matches the TD's ADR-01 boundary. The ledger's two MEDIUMs remain cataloged at registry severity; context changed neither severity nor score. `sprint-status.yaml` row `9-2-screen-reader-contract` is orchestrator bookkeeping and was neither read as evidence nor modified.

### Related Artifacts

- **Story File**: [spec-9-2-screen-reader-contract.md](../../../_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md)
- **Test Design**: [test-design-9-2-screen-reader-contract-td-20260907.md](../../../_bmad-output/test-artifacts/test-design/test-design-9-2-screen-reader-contract-td-20260907.md)
- **Risk Assessment**: 6 delta risks, 0 high (score ≥6); P0 3 groups + P1 4 groups + P2/P3 4 groups per targeted TD — standing P0 gate green, P1 follow-up tracked in RED scaffolds
- **Priority Framework**: P0-P3 applied — reviewed files are 9 P0 / 6 P1 / 4 P2, 0 unknown

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern
- **[network-first.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/network-first.md)** - Route intercept before navigate (race condition prevention)
- **[data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness
- **[component-tdd.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/component-tdd.md)** - Red-Green-Refactor patterns (RED-scaffold treatment precedent)
- **[selective-testing.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)** - Duplicate coverage detection
- **[ci-burn-in.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/ci-burn-in.md)** - Flakiness detection patterns
- **[timing-debugging.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/timing-debugging.md)** - Throttle-boundary timing (preview/banner unthrottled by design, verified in P2-UMB-PB-08)

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../../.claude/skills/bmad-testarch-test-review/resources/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Group both suites into describes** - 3 `describe` blocks per file as shown in Recommendations #1–#2
   - Priority: P2
   - Owner: FE
   - Estimated Effort: 30 min

### Follow-up Actions (Future PRs)

1. **Extract announce-capture harness into the fixture module** - single-site stub lifecycle per Advisory #3
   - Priority: P3
   - Target: when the P1-D1..D4 contract-extension tests add a third consumer

2. **Harden P2-UMB-PB-07 against shallow clones** - structural boundary pin or documented skip-with-reason per Advisory #4
   - Priority: P3
   - Target: backlog (CI uses full clones today)

3. **Close the P1 contract-extension gap** - extend `screenReader.contract.test.tsx` per P1-D1..D4 RED scaffolds (key pin, PT phrasing, App-gate refs, change-check invariant)
   - Priority: P1
   - Target: next a11y iteration (tracked, not scored here)

### Re-Review Needed?

✅ No re-review needed - approve as-is after trivial grouping (or group in follow-up)

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:
Ledger has 0 CRITICAL and 0 HIGH, 2 MEDIUM (ungrouped suite M4, one per file), score 100/100 A (96 raw + Excellent BDD + Perfect Isolation bonuses, clamped). Both suites execute green (11/11 API, 8/8 E2E, <600 ms combined) with no flake or false-green risk; the MEDIUMs are grooming (describe grouping) that does not block merge. The RED scaffolds and fixture module are context, never scored; the P1 contract-extension gap is tracked, not waived.

**For Approve with Comments**:

> Test quality is excellent with 100/100 score (A). High-priority recommendations should be addressed but don't block merge. Grouping each suite into 3 describes is cheap and worthwhile before the P1 contract follow-up grows these files — otherwise tests are production-ready and follow best practices.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| 1 (API gateway spec) | P2 (Medium) | M4 Ungrouped suite | 11 top-level `test()` without `describe` grouping | Wrap into 3 `describe` blocks by contract area |
| 1 (E2E umbrella spec) | P2 (Medium) | M4 Ungrouped suite | 8 top-level `test()` without `describe` grouping | Wrap into 3 `describe` blocks by journey |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-03 | 98/100 | A | 0       | ➡️ Baseline (canonical contract file; different review set, not directly comparable) |
| 2026-09-08 | 100/100 | A | 0       | ➡️ Stable (working-tree automate pass; 2 MEDIUM M4, offset by BDD + Isolation bonuses) |

### Related Reviews

| File     | Suite Score | Grade   | File MEDIUMs | Status             |
| -------- | ----------- | ------- | ------------ | ------------------ |
| tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts | 100/100 | A | 1 (M4) | Approved with Comments |
| tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts | 100/100 | A | 1 (M4) | Approved with Comments |

**Suite Average**: 100/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-9-2-screen-reader-contract-preview-banner-20260908
**Timestamp**: 2026-09-08 00:00:00
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

- _bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md
- _bmad-output/test-artifacts/test-design/test-design-9-2-screen-reader-contract-td-20260907.md
- _bmad-output/test-artifacts/test-design/test-design-epic-9-2-screen-reader-contract.md
- _bmad-output/test-artifacts/atdd-checklist-9-2-screen-reader-contract.preview-banner.md
- _bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts
- _bmad-output/test-artifacts/fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts
- triade/__tests__/a11y/screenReader.contract.test.tsx
- triade/App.tsx
- triade/src/ui/PreviewCard.tsx
- triade/src/a11y/announcements.ts
- triade/src/i18n/locales/en.json
- triade/src/i18n/locales/pt.json
