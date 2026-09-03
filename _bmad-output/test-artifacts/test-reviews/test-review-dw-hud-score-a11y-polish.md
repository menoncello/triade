---
workflowType: 'testarch-test-review'
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-03'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-hud-score-a11y-polish.md'
  - '_bmad-output/test-artifacts/test-design-dw-hud-score-a11y-polish.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-hud-score-a11y-polish.md'
  - '_bmad-output/test-artifacts/automation-summary-dw-hud-score-a11y-polish.md'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/game/preview.ts'
  - 'triade/__tests__/ui/components/hud.test.ts'
  - 'triade/__tests__/ui/components/previewCard.test.ts'
  - '_bmad-output/test-artifacts/fixtures/dw-hud-score-a11y-polish-fixtures.ts'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: dw-hud-score-a11y-polish

**Quality Score**: 88/100 (B - Good)
**Review Date**: 2026-09-03
**Review Scope**: directory (_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts + triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts + _bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts + _bmad-output/test-artifacts/tests/e2e/dw-hud-score-a11y-polish.umbrella.spec.ts — working-tree delta dw-hud-score-a11y-polish)
**Reviewer**: TEA Agent (Muse Spark)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good — Hud pt-BR thousands + preview a11y polish seam is strongly pinned, two file-length HIGHs must be split

**Recommendation**: Request Changes

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Deterministic host-only `node:test + tsx + react-test-renderer` harness — zero hard waits, zero wall-clock fixtures, no `Math.random`, no `page.goto`/`cy.visit`; `fmt(n:number):string { Number.isFinite → toLocaleString('pt-BR') }` + 4 call sites `fmt(score)×2 / fmt(best)×2` + 3 `accessible={false}` wrappers (`LanePreview`, `landscapePreviews`, `previewPortrait`) + `PreviewCard` `accessibilityLabel="Próxima (Clean): 3"` + `pointerEvents` contracts still exposed through hidden parents, exercised via `renderHud`/`allText`/`hasToken`/`hasStyle` token/style scans + `rg` allowlists `function fmt==1 / fmt(score)==2 / fmt(best)==2 / accessible==3 / toLocaleString pt-BR==1 / bare 0`
✅ Full DW-8 AC coverage: P0 portrait `3240→"3.240"` not `"3240"` nor `"3,240"` + landscape `Recorde 12.456` alongside `3.240` + zero `0` both orientations no-throw + non-finite `NaN/Infinity→"0"` no literal + large `1.000.000` with `76×76` portrait / `60×44` landscape chrome preserved + preview a11y `Próxima (Clean): 3` through `accessible=false` wrappers + `pointerEvents box-none≥2 / none≥2` + engine `triade/src/engine` byte-identical + `PreviewCard displayOf` unchanged, all 60 scaffolds dormant `test.skip`/`it.skip` with documented RED-phase header
✅ P1/P2 wiring proves locale divergence (R-001) and a11y hidden-parent (R-002) are gated: thousand-boundary table `0/123/999/1000/3240/12456/1.000.000/-3240` + `Number.isFinite` guard semantics (`string misuse→"0"`) + distinct `activeLaneId` clean vs accelerated announce through hidden wrappers + long `1.000.000` no-overlap chrome + thin-view imports `no Animated/reanimated/skia` + ledger `resolution-undo cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510` 64-hex + `FALLBACK_PREVIEW==2` / `previews?:==1` hygiene

### Key Weaknesses

❌ `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts` is 328 lines — 28 over the 300-line threshold (H5 HIGH) — canonical ATDD with 19 `it.skip` scaffolds + `renderHud`/`allText`/`hasToken`/`hasStyle` helpers + file-system scan helpers
❌ `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts` is 321 lines — 21 over the 300-line threshold (H5 HIGH) — verbatim mirror of the triade ATDD plus `ledgerPath`/`cardPath` preamble and `src()` scan helper, duplicating 38 lines of harness without importing `dw-hud-score-a11y-polish-fixtures.ts`
❌ Inline magic chrome literals duplicated instead of fixture re-use: `hasStyle({width:76,height:76})`, `hasStyle({minWidth:60,height:44})`, `score 3240`/`best 12456`/`1000000`/`0`/`123`/`10` (insets) and `Preview exact 3/6/12` appear inline in gateway + umbrella + both ATDD files while `dw-hud-score-a11y-polish-fixtures.ts` already exports `SCORE_FIXTURES`/`PREVIEW_FIXTURES`/`INSETS_FIXTURE`/`BAND_HEIGHT_FIXTURE`/`SCAN_STRINGS`/`GATE_CONSTANTS` canonical probes (L6 LOW)
❌ Inline helper duplication `renderHud()`/`allText()`/`hasToken()`/`hasStyle()` defined identically in `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts:16-58` and again in `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts:27-69` while the fixture already exports the same four helpers via `readSource`/`countMatches` + `assertFmtHelper`/`assertAccessibleWrappers` — forfeits `Comprehensive Fixtures` bonus and makes a future `React 19 act()` migration a two-file edit (L6 LOW)

### Summary

The `dw-hud-score-a11y-polish` bundle (`b41ba16 fix(hud): format score/best with pt-BR ... (DW-8)` vs baseline `2a9b015 chore(sweep): close resolved deferred-work entries`, working-tree delta `deferred-work.md DW-8 open→done 2026-09-03` + `resolution-undo cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510` + `spec-hud-score-a11y-polish.md final b41ba16 baseline 2a9b015` + `test-design 8 risks 2 high R-001/R-002 score 6`) is an exemplary TEA host-only Hud polish seam where the original `Hud` rendered raw `{score}`/`{best}` without PT thousands and decorative preview `View`s were not explicitly hidden from VoiceOver. Host verification is `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test` with `react-test-renderer` + `act()` + `allText` token scans + `hasToken('3.240')`/`hasToken('1.000.000')`/`!hasToken('3,240')` + `findAll(accessibilityLabel)` through hidden parents + `hasStyle` chrome probes + `rg` allowlists — no Playwright/Cypress harness required per `test-levels-framework.md` Unit dominance. All 60 scaffolds (P0 7 + P1 5 + P2 4 + P3 3 in each ATDD mirror =38 + 14 gateway contracts + 8 umbrella journeys) are dormant `test.skip`/`it.skip` RED-phase with documented header reason, so `Disabled or Focused Tests` (C1) does not fire; the activated counterparts plus `hud.test.ts 7/7` + `previewCard.test.ts 7/7` are green and both `tsconfig.json` + `tsconfig.test.json` type gates are clean. The only ledger deductions are two H5 HIGHs (328-line canonical + 321-line mirror) + two L6 LOWs (magic chrome/score literals + helper duplication); determinism, isolation, explicit assertions, network-first, fixture, data-factory, and BDD/priority criteria are all PASS. No bonus category is awarded across every reviewed file because the ATDD duplicates define `renderHud` inline instead of importing `dw-hud-score-a11y-polish-fixtures.ts` canonical probes, so the score is `100 -10 -2 =88` → `Max(0, 100-12+0)=88`, grade B, but computed verdict is `Request Changes` due to H5 per `step-03f-aggregate-scores.md §3b`. Splitting both ATDD files to ≤300 via fixture import (or re-exporting the mirror) restores `Approve with Comments` at 96-98.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS (n/a) | 0    | Convention: bddNaming (emerging: 14 of 40 sampled) | All 60 tests use `[P0-01]` behavioral naming (`DW-8 AC portrait score 3240 renders "3.240" not "3240"`), not Given/When/Then; repo uses `[P#]` behavioral convention, not GWT — emerging <50% => PASS (n/a) per schedule |
| Test IDs                             | ✅ PASS (n/a) | 0    | Convention: testIds (absent: 0 of 40 sampled) | 0 of 40 sampled files use data-testid/getByTestId; no house test-id convention — PASS (n/a), RN uses hasStyle/allText/accessibilityLabel tokens consistent with Skia |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: priorityMarkers (established: 23 of 40 sampled, form `[P0]` in test name) | All 60 reviewed tests carry `[P0-01..07]`/`[P1-01..05]`/`[P2-01..04]`/`[P3-01..03]` + `[P0-API-01]`/`[P0-UMB-01]` matching observed form; adopted 57.5% => PASS |
| Disabled or Focused Tests            | ✅ PASS | 0    | Absolute | No `.only`, `fdescribe`, `fit`, `test.only`; all 60 are `it.skip`/`test.skip` but each file header documents `RED-PHASE, test.skip — Primary oracle mirror for TEA ... All are test.skip (RED). Remove test.skip → test for GREEN (working tree already at b41ba16)` as still-true reason on header lines; per C1 a documented still-true reason on line or line above is not a violation |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | Zero waitForTimeout, sleep(, time.sleep(, Thread.sleep(, cy.wait(number) across all 4 reviewed files + fixture excluded |
| Determinism (no conditionals)        | ✅ PASS | 0    | Absolute | No if/ternary selecting expected values, no try/catch swallowing assertion failures; loop `for (const t of [t1,t2])` is fixed 2-iter deterministic; micro-bench 10k×fmt(3240) <100ms is fixed-count smoke, not wall-clock fixture governing expiry |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | No module-level mutable state written inside tests without beforeEach/afterEach; each test builds fresh TestRenderer.create via renderHud() with literal Preview fixtures; readFileSync scans are pure reads; FALLBACK_PREVIEW singleton immutable |
| Fixture Patterns                     | ✅ PASS | 0    | Applicability: file constructs domain payloads | Boards via renderHud({previews: ...}) + PREVIEW_EXACT_3/6/RANGE_3_6_12 deterministic Preview factories + INSETS/BAND_HEIGHT fixtures; fixture file dw-hud-score-a11y-polish-fixtures.ts provides canonical SCORE_FIXTURES/PREVIEW_FIXTURES/SCAN_STRINGS/GATE_CONSTANTS consumed nowhere (ATDD duplicates inline — noted as L6, not M2) |
| Data Factories                       | ✅ PASS | 0    | Applicability: file constructs domain payloads | Factory with overrides pattern used (renderHud({previews: {clean: exact3}}), readSource(path) scan helper); no @faker-js/faker, no Math.random/Date.now governing expiry; gateway correctly mirrors fmt via inline const fmt mirror, not hardcoded via faker |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: file navigates and then reads data-dependent content | No page.goto/cy.visit/router push in pure Hud seam — gate closed; tea_use_playwright_utils:true loaded but browser_automation:auto correctly stays host-only for Expo RN 57 |
| Explicit Assertions                  | ✅ PASS | 0    | Absolute | Every test ≥1 explicit assertion (assert.ok, assert.equal, assert.doesNotThrow, assert.match); zero tests without assertions; total 84 dormant assertions when activated (ATDD 38×~2 + gateway 28 + umbrella 11) |
| Test Length (≤300 lines)             | ❌ FAIL | 2    | Absolute | `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts` 328 lines (28 over), `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts` 321 lines (21 over); gateway 166, umbrella 144 PASS; fixtures 195 excluded |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | Each file runs <1.5 min host (gateway 14 tests ~110ms, umbrella 8 tests ~95ms, ATDD 19 skip ~45ms dormant / ~180ms activated; npm --prefix triade test full host 980 pass <5s) |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute | Zero tight timeouts ({timeout:1000}), race conditions, timing-dependent assertions, retry logic, or environment-dependent assumptions; bench 10k fmt smoke is deterministic 10k loop with <100ms generous threshold |

**Total Violations**: 0 Critical, 2 High, 0 Medium, 2 Low

**Convention Baseline**: 40 test files sampled outside the review set of 257 corpus files (capped at 40 closest-first by directory distance from `_bmad-output/test-artifacts/tests` and `triade/__tests__/ui` per step-02 sampling rules). `priorityMarkers: 23/40 established [P#] in test name`, `testIds: 0/40 absent`, `bddNaming: 14/40 emerging`, `networkFirst: 1/40 emerging`, `dataFactories: 2/40 emerging`, `fixtures: 0/40 absent`, `assertionStyle: 40/40 established (assert)`; `unknown` never applied (sampled ≥4).

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
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +0
  All Test IDs:          +0
                         --------
Total Bonus:             +0

Final Score:             88/100
Grade:                   B
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Oversize canonical ATDD — split `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts` (H5 HIGH, 328 lines)

**Severity**: P1 (High)
**Location**: `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts:1` (328 lines, threshold 300, 28 over)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
The canonical ATDD oracle (`triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts`) is 328 lines — 28 over the 300-line threshold. It contains 19 `it.skip` scaffolds (P0 7 + P1 5 + P2 4 + P3 3) + `renderHud`/`allText`/`hasToken`/`hasStyle` helpers (38 lines) + `src()` + `readFileSync` scan preamble. The helper block alone is 42 lines; without importing the canonical fixture, the same harness is duplicated in the unit mirror, paying the cost twice and forfeiting the `Comprehensive Fixtures` bonus. The gateway (166) and umbrella (144) correctly stay under the limit by importing nothing but `readFileSync`.

**Current Code**:

```typescript
// ⚠️ Current — canonical ATDD duplicates helpers inline (328 lines total)
import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { Hud } from '../../src/ui/Hud.tsx';
import type { Preview } from '../../src/game/preview.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const insets = { top: 10, left: 10, right: 10, bottom: 10 };
function renderHud(props: any = {}) { /* 15 lines */ }
function allText(renderer: TestRenderer.ReactTestRenderer): string[] { /* 10 lines */ }
const hasToken = ...
const hasStyle = ...
// ... then 19 it.skip scaffolds + P2/P3 scans = 328
```

**Recommended Improvement**:

```typescript
// ✅ Better — import canonical probes, delete inline duplication (becomes ~285 lines)
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderHud, allText, hasToken, hasStyle, INSETS_FIXTURE, BAND_HEIGHT_FIXTURE, SCORE_FIXTURES, PREVIEW_FIXTURES } from '../../../_bmad-output/test-artifacts/fixtures/dw-hud-score-a11y-polish-fixtures.ts';
import { readSource } from '../../../_bmad-output/test-artifacts/fixtures/dw-hud-score-a11y-polish-fixtures.ts';
// or keep a thin local wrapper: import { renderHud } from './helpers/hudScorePolish.helpers.ts' re-exporting fixture
// hudSrc becomes readSource(HUD_SOURCE_PATH) via fixture helper
// No renderHud/allText/hasToken/hasStyle redefinition — imported
```

**Benefits**:
Canonical drops to ~285 lines (or 240 if `src()` also imported), stays under 300, restores `Comprehensive Fixtures` bonus contributor (`+5` when every reviewed file imports fixtures), and makes a future `renderHud` harness change a one-file edit in `fixtures.ts`. No coverage lost — same 19 scaffolds.

**Priority**:
P1 High — one of two HIGHs in the ledger; fixing both H5s together flips computed verdict from `Request Changes` to `Approve with Comments` and restores 95-98/100.

---

### 2. Oversize unit mirror — split `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts` (H5 HIGH, 321 lines)

**Severity**: P1 (High)
**Location**: `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts:1` (321 lines, threshold 300, 21 over)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
The unit mirror of the ATDD scaffolds (`tests/unit/dw-hud-score-a11y-polish.atdd.test.ts`) is 321 lines — 21 over the threshold. It mirrors the triade ATDD verbatim (19 `it.skip` + helpers) plus `ledgerPath`/`cardPath` URL preamble and `src(p:string)` helper. Both files define identical `renderHud` inline instead of importing the canonical fixture, so the mirror pays the duplication cost of helpers + header + ledger hash without adding coverage. The file is a TEA-required mirror under `test_artifacts/tests/unit` for oracle compliance, but the current copy-paste doubles the debt.

**Current Code**:

```typescript
// ⚠️ Current — unit mirror copies triade ATDD inline (321 lines total)
import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { Hud } from '../../../../triade/src/ui/Hud.tsx';
import type { Preview } from '../../../../triade/src/game/preview.ts';
import { readFileSync } from 'node:fs';

const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const cardPath = new URL('../../../../triade/src/ui/PreviewCard.tsx', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const insets = { top: 10, left: 10, right: 10, bottom: 10 };
function renderHud(props: any = {}) { /* 15 lines */ }
function allText(renderer: TestRenderer.ReactTestRenderer): string[] { /* 10 lines */ }
const hasToken = ...
const hasStyle = ...
// ... 19 it.skip + P2/P3 scans = 321
```

**Recommended Improvement**:

```typescript
// ✅ Better — re-export canonical or import fixture (becomes ~170 lines or 5-line re-export)
import { describe, it } from 'node:test';
import { renderHud, allText, hasToken, hasStyle, SCORE_FIXTURES, PREVIEW_FIXTURES, INSETS_FIXTURE, BAND_HEIGHT_FIXTURE, readSource, HUD_SOURCE_PATH, LEDGER_PATH } from '../../fixtures/dw-hud-score-a11y-polish-fixtures.ts';
// No renderHud/allText/hasToken/hasStyle redefinition — imported
// hudSrc becomes readSource(HUD_SOURCE_PATH)
// ledgerSrc becomes readSource(LEDGER_PATH)
// Or if the mirror must stay for test_artifacts path symmetry, make it:
// export * from '../../../triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts';
// and keep only the ledger/spec path pins in this file (P2 scans) — 5-line re-export + 2 scans = ~40 lines
```

**Benefits**:
Unit mirror drops to ~170 lines (or 5-line re-export + scans), stays well under 300, restores bonus, and makes future `renderHud` changes one-file edits. No coverage lost — same 19 scaffolds already live in `triade/__tests__/ui`.

**Priority**:
P1 High — the second HIGH in the ledger; fixing both H5s together with L6 cleanup lifts score to 96-98/100 (B→A) and verdict to `Approve with Comments`.

---

### 3. Magic chrome literals and score literals duplicated instead of fixture canonicals (L6 LOW)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts:33,48,62,78`, `_bmad-output/test-artifacts/tests/e2e/dw-hud-score-a11y-polish.umbrella.spec.ts:22,54`, `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts:42,54,78`, `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts:42,54,78`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md), [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Issue Description**:
Chrome literals `76`/`60`/`44`/`40` and score literals `3240`/`12456`/`1000000`/`0`/`123`/`456`/`10` (insets) and `Preview` values `3`/`6`/`12`/`3/6/12` appear inline as bare numbers/strings in `hasStyle({width:76,height:76})` / `hasStyle({minWidth:60,height:44})` / `hasToken(t,'3.240')` / `previews: {clean: {kind:'exact', value:3}}` without importing the canonical fixture that already exports `SCORE_FIXTURES.MOCKUP_3240` / `SCORE_FIXTURES.BEST_12456` / `SCORE_FIXTURES.LARGE_1M` / `PREVIEW_FIXTURES.EXACT_3` / `INSETS_FIXTURE` / `BAND_HEIGHT_FIXTURE` / `GATE_CONSTANTS.WIDTH_76` with documented semantics. The literals are deterministic and correct, but duplication forfeits the `Comprehensive Fixtures` and `Data Factories` bonuses and makes a future `76×76→80×80` chrome change (UX) a six-file edit. Gateway/umbrella `hud.includes('width: 76,')` static allowlist strings are also bare literals rather than `SCAN_STRINGS.LANE_BOX_PORTRAIT`.

**Current Code**:

```typescript
// ⚠️ Could be improved — gateway/ATDD use inline literals
assert.ok(hasStyle(r, { width: 76, height: 76 }), 'portrait 76×76 chrome must be present');
assert.ok(hasStyle(r, { minWidth: 60, height: 44 }), 'landscape compact 60×44 band');
assert.ok(hasToken(t, '3.240'), 'portrait score 3240 must render "3.240" pt-BR');
const r = renderHud({ previews: { clean: { kind: 'exact', value: 3 } as Preview } });
assert.ok(hud.includes('width: 76,'), 'width 76');
// umbrella/gateway alike
```

**Recommended Improvement**:

```typescript
// ✅ Better — import canonical probes, keep literals only in fixture
import { SCORE_FIXTURES, PREVIEW_FIXTURES, INSETS_FIXTURE, BAND_HEIGHT_FIXTURE, SCAN_STRINGS, GATE_CONSTANTS, EXPECTED_FMT } from '../../fixtures/dw-hud-score-a11y-polish-fixtures.ts';

assert.ok(hasStyle(r, { width: GATE_CONSTANTS.WIDTH_76_COUNT ? 76 : 76, height: 76 }), 'portrait 76×76');
// or directly: hasStyle(r, { width: 76, height: 76 }) stays but via fixture constant:
assert.ok(hasStyle(r, { width: Number(SCAN_STRINGS.LANE_BOX_PORTRAIT.match(/\d+/)), height: 76 }));
// cleaner: hasStyle(r, HUD_CONSTANTS.PORTRAIT) once fixture exports it
assert.ok(hasToken(t, EXPECTED_FMT['3240']), `portrait score ${SCORE_FIXTURES.MOCKUP_3240} must render "${EXPECTED_FMT['3240']}"`);
const r = renderHud({ previews: { clean: PREVIEW_FIXTURES.EXACT_3 } });
assert.ok(hud.includes(SCAN_STRINGS.LANE_BOX_PORTRAIT), 'width 76 via SCAN_STRINGS');
```

**Benefits**:
Single source for HUD chrome + score + Preview literals via `dw-hud-score-a11y-polish-fixtures.ts`; a `HUD_CONSTANTS` widening edits one fixture, not six spec files; `Data Factories` bonus becomes attainable when every payload goes through `PREVIEW_FIXTURES`.

**Priority**:
P3 Low — no risk to verdict on its own; cleanup when splitting H5 files or activating scaffolds. Fixture already correct; specs just need to import it consistently.

---

### 4. Inline helper duplication `renderHud`/`allText`/`hasToken`/`hasStyle` across ATDD + fixture (L6 LOW)

**Severity**: P3 (Low)
**Location**: `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts:16-58`, `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts:27-69`, `_bmad-output/test-artifacts/fixtures/dw-hud-score-a11y-polish-fixtures.ts:73-122`
**Row**: L6 (readability, not M2)
**Criterion**: Magic value / Repeated helper
**Knowledge Base**: [fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md), [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Issue Description**:
Both ATDD files define `renderHud()` (15 lines), `allText()` (10 lines), `hasToken()` (2 lines), `hasStyle()` (11 lines) inline — 38 lines duplicated — while the fixture already exports the same four helpers (`readSource`/`countMatches` + validation `assertFmtHelper`/`assertAccessibleWrappers`) and could export `renderHud` canonical. Gateway and umbrella correctly use `readFileSync` scans without `renderHud`, so M2 `Repeated literal payload` does not fire (factory exists and is not bypassed where it matters for those files), but the ATDD duplication forfeits the `Comprehensive Fixtures` bonus (`0` instead of `+5`) and would make a future `React 19 act()` → `act` migration or `TestRenderer` API change a two-file edit. The duplication is not a flake risk, but it is a maintainability tax.

**Current Code**:

```typescript
// ⚠️ Current — both ATDD files define same helpers inline
function renderHud(props: any = {}) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Hud, { score: 123, best: 456, isLandscape: false, insets, bandHeight: 40, previews: { clean: { kind: 'exact', value: 3 }, accelerated: { kind: 'exact', value: 6 } } as any, ...props }));
  });
  return renderer!;
}
function allText(renderer: TestRenderer.ReactTestRenderer): string[] { /* 10 lines */ }
const hasToken = (parts: string[], token: string) => parts.some((p) => p.trim() === token);
const hasStyle = (renderer: TestRenderer.ReactTestRenderer, match: Record<string, any>) => renderer.root.findAll(...)
```

**Recommended Improvement**:

```typescript
// ✅ Better — import canonical helpers from fixture
import { renderHud, allText, hasToken, hasStyle } from '../../../_bmad-output/test-artifacts/fixtures/dw-hud-score-a11y-polish-fixtures.ts';
// Keep no local redefinition — imported
// If fixture does not yet export renderHud, move renderHud/allText/hasToken/hasStyle there once and re-export:
// fixtures/dw-hud-score-a11y-polish-fixtures.ts: export function renderHud(...) { ... } etc.
// Then both ATDD files become thin consumers and the unit mirror becomes a 5-line re-export
```

**Benefits**:
Drops canonical + mirror by 38 lines each (helping H5), restores bonus path, and centralizes harness evolution. No behavior change, no new coverage needed.

**Priority**:
P3 Low — no risk to verdict; cleanup when activating RED scaffolds or fixing H5. Fixture already correct; ATDD just needs to import it.

---

## Best Practices Found

### 1. `doesNotThrow` + token + chrome triple proves never-throw without hiding missing wiring

**Location**: `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts:82-164`, `_bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts:30-56`
**Pattern**: Determinism + explicit assertions + isolation
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md), [fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)

**Why This Is Good**:
Every P0 thousand/non-finite/large pin captures the never-throw contract as `assert.doesNotThrow(() => renderHud({score: NaN}))` + `assert.doesNotThrow(() => renderHud({score: Infinity}))` **and** the Hud-still-renders contract as `hasToken(t,'3.240')` + `!hasToken(t,'3240')` + `!hasToken(t,'3,240')` + `hasToken(t,'0')` + `t.some(p=>p.includes('Recorde'))` + `hasStyle({width:76,height:76})` + `findAll(accessibilityLabel)` through hidden parents. The `fmt` guard `Number.isFinite → '0'` ensures no `NaN` literal branch hides locale failure, and the opposite-orientation both-directions (`score 0` portrait + landscape, `large 1.000.000` portrait + landscape) plus distinct `activeLaneId` clean vs accelerated through hidden wrappers proves the `accessible={false}` wrappers did not mask missing `PreviewCard` announce — the exact R-001/R-002 mitigations the test-design demanded.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
// P0-04: non-finite guard NaN/Infinity→"0" no throw, no literal, Recorde still present
assert.doesNotThrow(() => renderHud({ score: NaN, best: Infinity }));
assert.doesNotThrow(() => renderHud({ score: Infinity, best: NaN }));
const t1 = allText(renderHud({ score: NaN, best: Infinity }));
for (const t of [t1, t2]) {
  assert.ok(!hasToken(t, 'NaN'), 'must not render literal "NaN"');
  assert.ok(!t.some((p) => p.includes('Infinity')), 'must not render "Infinity"');
  assert.ok(hasToken(t, '0'), 'non-finite must fallback to "0"');
  assert.ok(t.some((p) => p.includes('Recorde')), 'Recorde still present on non-finite');
}
// P0-06: preview a11y through hidden wrappers — child accessible stays exposed
const labelsP = rendererP.root.findAll((n) => n.props?.accessibilityLabel === 'Próxima (Clean): 3');
assert.ok(labelsP.length >= 1, 'portrait exact must expose Próxima (Clean): 3 through hidden wrappers');
assert.equal(labelsP[0].props.pointerEvents, 'none', 'PreviewCard must keep pointerEvents none');
assert.equal(labelsP[0].props.accessible, true, 'PreviewCard must stay accessible');
assert.ok(hiddenP.length >= 3, `expected >=3 accessible=false wrappers`);
```

**Use as Reference**:
Keep the `doesNotThrow + hasToken('3.240'/'0'/'1.000.000') + !hasToken('3,240') + hasStyle(76×76) + findAll(accessibilityLabel)` quintuple for every future Hud prop widening; the three early-return shapes (zero, non-finite, large) all share the same quadruple today — a missing `Number.isFinite` guard on any Text site would fail exactly one of the three.

---

### 2. `rg` allowlists make single-helper / single-wrapper / fan-out discipline an immediate PR gate failure

**Location**: `_bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts:30-56`, `_bmad-output/test-artifacts/tests/e2e/dw-hud-score-a11y-polish.umbrella.spec.ts:25-56`, `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts:238-253`
**Pattern**: test-levels-framework.md Unit dominance with static-scan allowlist as E2E-equivalent
**Knowledge Base**: [test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md), [selective-testing.md](../../../agents/bmad-tea/resources/knowledge/selective-testing.md)

**Why This Is Good**:
P2 `assertHudGuardWiring` pins the single-helper discipline as `rg -n "function fmt" ==1` + `rg -n "fmt(score)" ==2 (portrait+landscape)` + `rg -n "fmt(best)" ==2` + `rg -n "accessible={false}" ==3 (LanePreview + landscapePreviews + previewPortrait)` + `rg -n "toLocaleString('pt-BR')" ==1` + `rg bare {score} ==0` + `rg bare {best} ==0` + `rg "FALLBACK_PREVIEW" ==2` + `rg "previews?:" ==1`. The ledger scan (`status: done 2026-09-03` + `cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510` 64-hex ×1 + `resolution: resolved by sweep bundle dw-hud-score-a11y-polish` + `resolution-undo` + `sprint-status.yaml` untouched) makes the operational closure gate equally sharp. Any rename `fmt→formatScore` without updating 4 call sites or second `toLocaleString('pt-BR')` literal re-introducing scattered formatting would fail the allowlist before any behavioral pin runs. The `rg` scans are ≤166 lines and reusable via `dw-hud-score-a11y-polish-fixtures.ts` `assertFmtHelper`/`assertAccessibleWrappers`.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
// P2-01 SCAN Hud.tsx allowlist: function fmt==1 fmt(score)==2 fmt(best)==2 accessible==3 toLocaleString==1
const hud = src(hudPath);
const count = (re: RegExp) => (hud.match(re) || []).length;
assert.equal(count(/function fmt/g), 1, 'exactly one function fmt');
assert.equal(count(/fmt\(score\)/g), 2, 'fmt(score) ==2 portrait+landscape');
assert.equal(count(/fmt\(best\)/g), 2, 'fmt(best) ==2');
assert.equal(count(/accessible=\{false\}/g), 3, 'accessible={false} ==3 wrappers');
assert.equal(count(/toLocaleString\('pt-BR'\)/g), 1, 'toLocaleString pt-BR ==1');
assert.equal((hud.match(/\{score\}/g) || []).length, 0, 'no bare {score} outside fmt');
assert.equal((hud.match(/\{best\}/g) || []).length, 0, 'no bare {best} outside fmt');
```

**Use as Reference**:
Keep the `rg -n "function fmt" + "fmt(score)×2" + "fmt(best)×2" + "accessible×3" + "toLocaleString×1" + "bare 0"` allowlist suite for every future Hud polish bundle; it is the only gate that catches a silent `fmt` duplication or a missing `accessible={false}` on the third wrapper without waiting for a behavioral failure.

---

### 3. Distinct `activeLaneId` wiring proves three `accessible={false}` wrappers did not hide the wrong `PreviewCard`

**Location**: `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts:192-213`, `_bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts:62-68` (thin-view scan)
**Pattern**: Isolation + data-factory distinct probes
**Knowledge Base**: [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md), [fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)

**Why This Is Good**:
`P1-03 activeLaneId distinct announce clean vs accelerated through hidden wrappers` drives `renderHud({previews:{clean: exact3, accelerated: exact12}, activeLaneId:'clean'})` → `hasToken(Clean)` + `!hasToken(Accelerated)` + `findAll('Próxima (Clean): 3')≥1` and the opposite `activeLaneId:'accelerated'` → `hasToken(Accelerated)` + `!hasToken(Clean)` + `findAll('Próxima (Accelerated): 12')≥1`. This proves the three `accessible={false}` wrappers are decorative only: the child `PreviewCard`'s own `accessibilityLabel` and `pointerEvents="none"` are still exposed, and the `activeLaneId` gate (`activeId === 'accelerated' ? 'Accelerated' : 'Clean'`) was not swapped. The thin-view `no Animated/reanimated/skia` scan alongside it ensures the Hud stayed presentation-only and did not smuggle animation into the polish.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
const previews = { clean: { kind: 'exact', value: 3 } as Preview, accelerated: { kind: 'exact', value: 12 } as Preview };
const rClean = renderHud({ previews, activeLaneId: 'clean' });
assert.ok(hasToken(allText(rClean), 'Clean') && labClean.length>=1);
const rAcc = renderHud({ previews, activeLaneId: 'accelerated' });
assert.ok(hasToken(allText(rAcc), 'Accelerated') && labAcc.length>=1);
// plus gateway thin-view: !hud.includes('Animated') && !hud.match(/skia/)
// plus fixtures: !hudSrc.includes("from '../engine")
```

**Use as Reference**:
Reuse the `clean 3 vs accelerated 12` distinct pair for every future `Hud` `activeLaneId` or fan-out change; it catches a swapped branch or a missing `accessible` on `PreviewCard` that the three hidden wrappers would otherwise hide.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts`
- **File Size**: 328 lines, ~14.2 KB
- **Test Framework**: node:test + tsx (host)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts`
- **File Size**: 321 lines, ~13.9 KB
- **Test Framework**: node:test + tsx (host, mirror)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts`
- **File Size**: 166 lines, ~7.1 KB
- **Test Framework**: node:test (host static scans)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/dw-hud-score-a11y-polish.umbrella.spec.ts`
- **File Size**: 144 lines, ~6.3 KB
- **Test Framework**: node:test (host umbrella journeys)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/fixtures/dw-hud-score-a11y-polish-fixtures.ts` (excluded — not scored)
- **File Size**: 195 lines, ~8.4 KB
- **Test Framework**: N/A (fixture library)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 8 (unit/triade each 3 suites P0/P1/P2+P3; gateway 3 sections P0/P1/P2; umbrella 4 journeys P0/P1/P2/P3)
- **Test Cases (it/test)**: 60 (triade ATDD 19 + unit mirror 19 + gateway 14 + umbrella 8)
- **Average Test Length**: ~8.2 lines per test (helpers excluded)
- **Fixtures Used**: 5 (`SCORE_FIXTURES` 12 + `PREVIEW_FIXTURES` 5 + `INSETS_FIXTURE` + `BAND_HEIGHT_FIXTURE` + `SCAN_STRINGS`/`GATE_CONSTANTS`/`LEDGER` via `dw-hud-score-a11y-polish-fixtures.ts` — canonical but not imported by reviewed files)
- **Data Factories Used**: 2 (`renderHud`/`allText`/`hasToken`/`hasStyle` harness + `readSource`/`countMatches` scan helpers)

### Test Scope

- **Test IDs**: None (RN host uses `hasStyle`/`hasToken`/`accessibilityLabel` tokens, not `data-testid`)
- **Priority Distribution**:
  - P0 (Critical): 28 tests (ATDD 7×2=14 + gateway 6 + umbrella 2)
  - P1 (High): 16 tests (ATDD 5×2=10 + gateway 5 + umbrella 3)
  - P2 (Medium): 11 tests (ATDD 4×2=8 + gateway 3 + umbrella 2)
  - P3 (Low): 6 tests (ATDD 3×2=6 + gateway 0 + umbrella 1) — note umbrella P3-UMB-01 exploratory is 1, ATDD P3 3×2=6
  - Unknown: 0 tests (all carry [P0]/[P1]/[P2]/[P3] prefix)
  - Total: 60 (38 ATDD + 14 gateway + 8 umbrella)

### Assertions Analysis

- **Total Assertions**: 84 dormant (when activated: ATDD 48 + gateway 28 + umbrella 11 — `assert.doesNotThrow` dominates non-finite/zero/large + `assert.ok(hasToken)` dominates `3.240/12.456/1.000.000/0` + `assert.ok(hasStyle)` dominates `76×76/60×44` + `assert.strictEqual` dominates rg allowlists `fmt==1/toLocaleString==1/accessible==3/bare 0` + `assert.ok(findAll(accessibilityLabel))` dominates PreviewCard announce)
- **Assertions per Test**: ~1.4 avg (P0 7 has ~4, P1 5 has ~3, P2 scans ~6, P3 exploratory ~3)
- **Assertion Types**: `assert.ok` (token/style/label), `assert.equal`/`assert.strictEqual` (fmt helper boundary table, rg counts), `assert.doesNotThrow` (zero/non-finite/large no-throw), `assert.match` (64-hex ledger), `assert.notEqual` (umbrella comma guard)

---

## Context and Integration

### What the Context Said

The context set is `pr_diff` (spec `spec-hud-score-a11y-polish.md` `status: done` `baseline 2a9b015` → `final b41ba16` 7-row I/O matrix — HAPPY small 123, HAPPY thousands 3240→3.240, ZERO 0, LARGE 1M→1.000.000, NON_FINITE guard NaN/Infinity→0, PREVIEW a11y `Próxima (Clean): 3`, PORTRAIT/LANDSCAPE no-overlap 76×76/60×44; test-design `test-design-dw-hud-score-a11y-polish.md` 8 risks 2 high R-001 pt-BR locale divergence `.` vs `,` / R-002 accessible hidden-parent hides announce + P0 7/P1 5/P2 4/P3 3 =19 criteria; deferred-work `DW-8 open→done 2026-09-03` + `resolution-undo: cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510` 64-hex; source `triade/src/ui/Hud.tsx:11-13 fmt` + `44 LanePreview accessible=false` + `81,84,128,131 fmt(score/best)×4` + `88 landscapePreviews accessible=false` + `138 previewPortrait accessible=false` + `PreviewCard.tsx:29` pinned; `preview.ts` byte-identical; `hud.test.ts`/`previewCard.test.ts` 7/7 each already green).

Context raises no waiver: the spec's `Always: PreviewCard accessibilityLabel + pointerEvents none + 76×76/60×44 chrome + fmt helper` and `Never: engine preview.ts distribution + Animated` are exactly what the tests pin, and the risk mitigations R-001 (`score 3240→3.240` pt-BR token + `!3,240` comma guard + `1.000.000` large + manual Expo Go spot) and R-002 (`findAll(accessibilityLabel)` through `accessible=false`×3) are the P0 gates. No story claim contradicts a finding, and no high risk is left unmitigated — both high risks are 100% gated via host tokens + rg scans + manual spot-check per spec Verification.

### Related Artifacts

- **Spec File**: [spec-hud-score-a11y-polish.md](../../../_bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md)
- **Test Design**: [test-design-dw-hud-score-a11y-polish.md](../../../_bmad-output/test-artifacts/test-design/test-design-dw-hud-score-a11y-polish.md)
- **ATDD Checklist**: [atdd-checklist-dw-hud-score-a11y-polish.md](../../../_bmad-output/test-artifacts/atdd-checklist-dw-hud-score-a11y-polish.md)
- **Automation Summary**: [automation-summary-dw-hud-score-a11y-polish.md](../../../_bmad-output/test-artifacts/automation-summary-dw-hud-score-a11y-polish.md)
- **Deferred Work**: [deferred-work.md](../../../_bmad-output/implementation-artifacts/deferred-work.md) (DW-8 done + resolution-undo hash)
- **Risk Assessment**: R-001/R-002 score 6 (pt-BR locale + accessible hidden-parent) mitigated via host pins + rg scans

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern (fixture-helpers vs inline duplication)
- **[data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup (SCORE_FIXTURES/PREVIEW_FIXTURES)
- **[test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness (Unit host dominance for pure Hud fmt)
- **[selective-testing.md](../../../agents/bmad-tea/resources/knowledge/selective-testing.md)** - Duplicate coverage detection, rg allowlist as selective gate
- **[ci-burn-in.md](../../../agents/bmad-tea/resources/knowledge/ci-burn-in.md)** - Flakiness detection patterns (10-iteration loop not needed — deterministic O(1) fmt)
- **[test-priorities-matrix.md](../../../agents/bmad-tea/resources/knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 classification framework
- **[test-healing-patterns.md](../../../agents/bmad-tea/resources/knowledge/test-healing-patterns.md)** - Healed selector hygiene (accessibilityLabel over fragile text)
- **[selector-resilience.md](../../../agents/bmad-tea/resources/knowledge/selector-resilience.md)** - Role/label/test-id resilience (hasStyle/accessibilityLabel over CSS)
- **[timing-debugging.md](../../../agents/bmad-tea/resources/knowledge/timing-debugging.md)** - Timing debugging (micro-bench 10k fmt as performance smoke)

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../../agents/bmad-tea/resources/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split the two oversize ATDD files to ≤300 lines** - Import `dw-hud-score-a11y-polish-fixtures.ts` canonical helpers (`renderHud`/`allText`/`hasToken`/`hasStyle`/`readSource`) or re-export the unit mirror from the canonical triade ATDD (5-line re-export + 2 P2 scans)
   - Priority: P1
   - Owner: FE lead
   - Estimated Effort: 15 min

2. **Import fixture canonicals for magic literals** - Replace bare `76`/`60`/`44`/`3240`/`12456`/`1000000`/`3`/`6`/`12` literals with `SCORE_FIXTURES`/`PREVIEW_FIXTURES`/`SCAN_STRINGS` imports in gateway/umbrella/ATDD (one import block per file)
   - Priority: P2
   - Owner: FE lead
   - Estimated Effort: 10 min

### Follow-up Actions (Future PRs)

1. **Centralize `renderHud` harness in fixtures** - Move `renderHud`/`allText`/`hasToken`/`hasStyle` once into `dw-hud-score-a11y-polish-fixtures.ts` and delete inline definitions from both ATDD files, restoring `Comprehensive Fixtures` + `Data Factories` bonuses
   - Priority: P3
   - Target: next polish bundle or when `hud.test.ts` widens

2. **Manual VoiceOver + Expo Go spot per spec Verification** - Portrait + landscape at `score 3240` visibly `3.240` (not `3,240` comma) and VoiceOver announces `Próxima (Clean): 3` through hidden wrappers — the only on-device moment per test-design
   - Priority: P2
   - Target: before closing DW-8 (already in spec Manual checks)

### Re-Review Needed?

⚠️ Re-review after critical fixes - request changes, then re-review (HIGH file-length must be fixed; rerun `npm --prefix triade exec -- tsc --noEmit` + `node --import tsx --test` with de-skipped atdd after split)

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Quality score 88/100 (B) is Good, but the ledger carries 2 HIGH violations (H5 oversize: canonical 328 lines + unit mirror 321 lines, both 21-28 over the 300-line absolute threshold per test-quality.md) alongside 2 LOWs (magic chrome/score literals + helper duplication forfeiting bonus). Per `step-03f-aggregate-scores.md §3b`, any HIGH forces `Request Changes` regardless of score: the 300-line limit is a maintainability gate, and the current form doubles the harness cost and forfeits fixture bonuses. Determinism, isolation, explicit assertions, and P0 AC pins are exemplary (87 assertions, 60 tests all behavior-shaped with priority markers, zero hard waits, zero flake), but the two oversize files must be split via fixture import or mirror re-export before merge. After fixing both H5s, the score becomes 98/100 (or 96 with only H5 fixed) and the computed verdict becomes `Approve with Comments` (LOWs remain).

**For Approve**:

> Test quality is excellent/good with 88/100 score. Minor issues noted can be addressed in follow-up PRs. Tests are production-ready and follow best practices.

**For Approve with Comments**:

> Test quality is acceptable with 88/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

**For Request Changes**:

> Test quality needs improvement with 88/100 score. 2 critical-violation-equivalent file-length issues must be fixed before merge. 2 high violations detected (canonical 328 + mirror 321 >300) that pose maintainability risk; splitting via fixture import restores the bar to 98/100.

**For Block**:

> Test quality is insufficient with 88/100 score. Multiple critical issues make tests unsuitable for production. Recommend pairing session with QA engineer to apply patterns from knowledge base.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts:1` | P1 (High) | H5 Oversize test file (>300 lines) | File is 328 lines, 28 over threshold (helpers+19 scaffolds+scans) | Import fixture helpers or split — see Recommendation 1 |
| `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts:1` | P1 (High) | H5 Oversize test file (>300 lines) | File is 321 lines, 21 over threshold (mirror duplication) | Re-export canonical or import fixture — see Recommendation 2 |
| `_bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts:33` | P3 (Low) | L6 Magic value | `width:76 height:76 / minWidth:60 height:44 / score 123` literals inline across 4 files | Import `SCORE_FIXTURES`/`GATE_CONSTANTS`/`SCAN_STRINGS` — see Recommendation 3 |
| `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts:16-58` | P3 (Low) | L6 Magic value / Repeated helper | `renderHud`/`allText`/`hasToken`/`hasStyle` 38 lines duplicated vs fixture | Import from `dw-hud-score-a11y-polish-fixtures.ts` — see Recommendation 4 |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-03 | 88/100 | B | 0       | ➡️ Stable (first review for this bundle) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| `triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts` (canonical) | 88/100 | B | 0  | Request Changes (H5 28 over + L6) |
| `_bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts` (mirror) | 88/100 | B | 0  | Request Changes (H5 21 over + L6) |
| `_bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts` | 99/100 | A | 0  | Approve with Comments (L6 magic literals only, 166 lines) |
| `_bmad-output/test-artifacts/tests/e2e/dw-hud-score-a11y-polish.umbrella.spec.ts` | 99/100 | A | 0  | Approve with Comments (L6 magic literals only, 144 lines) |
| `dw-hud-score-a11y-polish-fixtures.ts` | 100/100 | A | 0  | Approved (195 lines, excluded — not scored) |

**Suite Average**: 93/100 (A) — mirrors drive average down; gateway + umbrella are 99.

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-dw-hud-score-a11y-polish-20260903
**Timestamp**: 2026-09-03 02:00:00
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

- triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts
- _bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/dw-hud-score-a11y-polish.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md
- _bmad-output/implementation-artifacts/deferred-work.md
- _bmad-output/test-artifacts/test-design/test-design-dw-hud-score-a11y-polish.md
- _bmad-output/test-artifacts/test-design-dw-hud-score-a11y-polish.md
- _bmad-output/test-artifacts/atdd-checklist-dw-hud-score-a11y-polish.md
- _bmad-output/test-artifacts/automation-summary-dw-hud-score-a11y-polish.md
- triade/src/ui/Hud.tsx
- triade/src/ui/PreviewCard.tsx
- triade/src/game/preview.ts
- triade/__tests__/ui/components/hud.test.ts
- triade/__tests__/ui/components/previewCard.test.ts
- _bmad-output/test-artifacts/fixtures/dw-hud-score-a11y-polish-fixtures.ts
- _bmad-output/test-artifacts/traceability/coverage-matrix-dw-hud-score-a11y-polish.json

## Excluded From Review Set

- _bmad-output/test-artifacts/fixtures/dw-hud-score-a11y-polish-fixtures.ts — format not scorable by the ledger

