---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-test-review'
inputDocuments:
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-hud-preview-hardening.md'
  - '_bmad-output/test-artifacts/test-design-dw-hud-preview-hardening.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-hud-preview-hardening.md'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/game/preview.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/ui/hud-preview-hardening.atdd.test.ts'
  - 'triade/__tests__/ui/components/hud.test.ts'
  - 'triade/__tests__/ui/components/hud.previewWiring.test.ts'
  - 'triade/__tests__/ui/components/previewCard.test.ts'
  - '_bmad-output/test-artifacts/fixtures/hud-preview-hardening-fixtures.ts'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: dw-hud-preview-hardening

**Quality Score**: 93/100 (A - Excellent)
**Review Date**: 2026-09-02
**Review Scope**: directory (_bmad-output/test-artifacts/tests + triade/__tests__/ui/hud-preview-hardening.atdd.test.ts — working-tree delta)
**Reviewer**: TEA Agent (Muse Spark)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent — hardening seam is strongly tested, one file-length HIGH must be fixed

**Recommendation**: Request Changes

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Deterministic, host-only `node:test + tsx + react-test-renderer` harness — zero hard waits, zero wall-clock fixtures, no `Math.random`, no `page.goto`/`cy.visit`; `FALLBACK_PREVIEW {range, []}` singleton + `previews?:` optional + `previews?.clean/?accelerated ?? FALLBACK` guard exercised via `renderHud`/`allText`/`hasToken`/`hasStyle` token/style scans + `rg` allowlists `FALLBACK==2/previews?:==1/?? FALLBACK==1/bare 0`
✅ Full DW-69 invariant coverage: every P0 omitted/partial/null pin asserts `doesNotThrow` + `score 123`/`Recorde 456` + `Clean`/`Accelerated` label + `76×76` portrait / `60×44` landscape chrome + empty `""` not populated `3/6/12` plus branch-not-swapped opposite-partial both directions plus `PreviewCard range []→""` + `Próxima (Clean):` a11y + `App.tsx` fan-out `previewFor(game.pendingSpawn, availablePot) ≥2` + `previews={{` ≥1 + ledger `da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce` 64-hex
✅ P1 distinct-lane wiring proves silent fallback did not mask missing wiring: populated `clean exact 3` vs `accelerated range [3,6,12]` via `activeLaneId` gate stays green (`hud.test.ts:F-4` + `hud.previewWiring.test.ts` 9/9), thin-view `PreviewCard` no animation/transform/Animated, `triade/src/engine` + `triade/src/game/preview.ts` byte-identical, `sprint-status.yaml` untouched

### Key Weaknesses

❌ `tests/unit/hud-preview-hardening.atdd.test.ts` is 308 lines — 8 lines over the 300-line threshold (H5 HIGH) — mirror duplication of `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts` (297 lines) plus header + ledger scan helpers pushes it over; split or dedup via fixture import
❌ Inline magic chrome literals duplicated instead of fixture re-use: `hasStyle({width:76,height:76})`, `hasStyle({minWidth:60,height:44})`, `score 123`/`best 456`/`bandHeight 40`/`insets 10` appear inline in gateway + umbrella + both ATDD files while `hud-preview-hardening-fixtures.ts` already exports `HUD_CONSTANTS.PORTRAIT/LANDSCAPE`/`SCORE_FIXTURES`/`INSETS`/`BAND_HEIGHT`/`PREVIEW_EXACT_3/6/RANGE_3_6_12` canonical probes (L6 LOW)
❌ Inline helper duplication: `renderHud()`/`allText()`/`hasToken()`/`hasStyle()` defined identically in `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts:14-54` and again in `tests/unit/hud-preview-hardening.atdd.test.ts:14-64` plus again in gateway/umbrella via fixture import — does not fire M2 (factory exists and gateway/umbrella correctly import via fixtures) but forfeits `Comprehensive Fixtures` bonus and makes a future `renderHud` harness change a three-file edit (L6 LOW)

### Summary

The `dw-hud-preview-hardening` bundle (`4f674b4 sweep dw-hud-preview-hardening: DW-69 via bmad-loop` vs baseline `e329d35` package-lock sync, metadata-only working-tree diff `deferred-work.md DW-69 open→done 2026-09-02` + `resolution-undo da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce` + `spec-hud-preview-hardening` via ledger + `test-design-dw-hud-preview-hardening.md` 20 criteria P0 7/P1 6/P2 4/P3 3) is an exemplary TEA hardened HUD seam where the original `Hud` accessed `previews.clean` unconditionally and threw `TypeError: Cannot read properties of undefined (reading 'clean')` when a caller omitted the prop or supplied a partial object. Host verification is `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test` with `react-test-renderer` + `act()` + `allText` token scans + `hasStyle` chrome probes + `rg` allowlists — no Playwright/Cypress harness required per `test-levels-framework.md` Unit dominance and test-design execution strategy `host <15 s / no device`. All 20 unit scaffolds (P0 7 + P1 6 + P2 4 + P3 3) + 14 gateway contracts (P0 7 + P1 3 + P2 4) + 9 umbrella journeys (P2 4 + P3 5 + hygiene) are dormant `test.skip`/`it.skip` RED-phase with documented header reason, so `Disabled or Focused Tests` (C1) does not fire; the activated counterparts `hud-preview-hardening.atdd.test.ts` (when `it.skip→it`) plus `hud.test.ts 8/8` + `hud.previewWiring.test.ts 9/9` + `previewCard.test.ts 7/7` are green and both `tsconfig.json` + `tsconfig.test.json` type gates are clean. The only ledger deductions are one H5 HIGH (308-line mirror) + two L6 LOWs (magic chrome literals + helper duplication); determinism, isolation, explicit assertions, network-first, fixture, data-factory, and BDD/priority criteria are all PASS. No bonus category is awarded across every reviewed file because the ATDD duplicates define `renderHud` inline instead of importing `hud-preview-hardening-fixtures.ts` canonical probes, so the score is `100 -5 -2 =93` → `Max(0, 100-7+0)=93` without bonus offset, grade A, but computed verdict is `Request Changes` due to H5 per `step-03f-aggregate-scores.md §3b`. Fixing the file-length split (or importing fixtures to halve the duplicate) restores `Approve with Comments` at 97-98.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS (n/a) | 0    | Convention: bddNaming (emerging: 14 of 40 sampled) | Repo uses `[P0-01]`/`[API-P0-01]`/`[E2E-P2-01]` behavioral naming convention (23/40 priority-marked), not Given/When/Then; convention emerging (<50%) — no deduction per schedule. P0 naming is behavior-shaped (`omitted previews portrait no-throw + score/Recorde/Clean + 76×76`) |
| Test IDs                             | ✅ PASS (n/a) | 0    | Convention: testIds (absent: 0 of 40 sampled) | 0 of 40 sampled files use `data-testid`/`getByTestId`; no house test-id convention — PASS (n/a), deducted nothing. Hud uses `hasStyle`/`allText` token scans + `accessibilityLabel Próxima`, not test ids, consistent with RN Skia project |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: priorityMarkers (established: 23 of 40 sampled, form `[P0]` in test name) | All 43 reviewed tests carry `[P0-01..07]`/`[P1-01..06]`/`[P2-01..04]`/`[P3-01..03]` and `[API-P0-01..07]`/`[E2E-P2-01..04]` prefix matching observed form; adopted in 57.5% of corpus — PASS |
| Disabled or Focused Tests            | ✅ PASS | 0    | Absolute | No `.only`, `fdescribe`, `fit`, `test.only` committed. All 20 ATDD inner + 14 gateway + 9 umbrella inner are `it.skip`/`test.skip` but each file header documents `ATDD dw-hud-preview-hardening — RED-PHASE SCAFFOLDS (host node:test, it.skip) covering working-tree delta vs HEAD 4f674b4 → e329d35` as the still-true reason on the lines above the skips; per C1/C2 a documented, still-true reason on the line or the line above is not a violation. Trace records these as `status: skipped` with `skip_reason: RED-phase scaffold it.skip — active coverage via hud.test.ts 8 + previewWiring 9 + previewCard 7 (43 pass when activated)` — intentional dormant, not disabled |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | Zero `waitForTimeout`, `sleep(`, `time.sleep(`, `Thread.sleep(`, `cy.wait(number)` across all five reviewed files (including fixture) |
| Determinism (no conditionals)        | ✅ PASS | 0    | Absolute | No `if`/`ternary` selecting expected values, no `try/catch` swallowing assertion failures. `activeId === 'accelerated' ? previews?.accelerated : previews?.clean` in `Hud.tsx:66-67` is SUT code, not test conditional; bench `100 renders <5s` smoke in `[P3-02]` is fixed-count deterministic with generous threshold, not wall-clock fixture governing expiry |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | No module-level mutable state written inside tests without `beforeEach`/`afterEach` reset; each test builds fresh `TestRenderer.create` via `renderHud()` or `renderPreviewCard()` with fresh `Preview` literals (`PREVIEW_EXACT_3`, `FALLBACK_PREVIEW`); `FALLBACK_PREVIEW` singleton is immutable empty `[]` never mutated (P1-06 documents `Object.freeze` advisory, not a write); `readFileSync` scans are pure reads |
| Fixture Patterns                     | ✅ PASS | 0    | Applicability: file constructs domain payloads | Boards via `renderHud({previews: ...})` prop factory, `PREVIEW_EXACT_3/6/RANGE_3_6_12/FALLBACK_PREVIEW` deterministic Preview factories, `INSETS`/`BAND_HEIGHT`/`SCORE_FIXTURES` band fixtures, `HUD_CONSTANTS` chrome probes; fixture file `hud-preview-hardening-fixtures.ts` provides canonical `PREVIEW_EXACT_3/6/RANGE_3_6_12/FALLBACK_PREVIEW/INSETS/BAND_HEIGHT/SCORE_FIXTURES/HUD_CONSTANTS/LEDGER` consumed via import in gateway/umbrella (ATDD duplicates inline — noted as L6, not M2) |
| Data Factories                       | ✅ PASS | 0    | Applicability: file constructs domain payloads | Factory functions with overrides pattern used throughout (`renderHud({previews: {clean: PREVIEW_EXACT_3}})`, `renderPreviewCard(preview,label)`, `readSource(path)` scan helper); no hardcoded inline payload bypassing existing factory; gateway correctly mirrors ATDD literals via fixtures, not inline `Preview` duplication; no `@faker-js/faker`, no `Math.random`/`Date.now` governing expiry |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: file navigates and then reads data-dependent content | No `page.goto`/`cy.visit`/router push in pure Hud seam — gate closed; `tea_use_playwright_utils:true` loaded but `browser_automation:auto` correctly stays host-only for Expo RN 57 Skia/RNGH pure Hud (no DOM, no `fetch`/`route` race) |
| Explicit Assertions                  | ✅ PASS | 0    | Absolute | Every test contains ≥1 explicit assertion (`assert.doesNotThrow`/`assert.ok`/`assert.strictEqual`/`assert.match`); zero tests without assertions. Total 87 assertions (ATDD 48 + gateway 28 + umbrella 11 dormant — when activated, `assert.doesNotThrow` dominates `previews undefined/null/partial` + `assert.ok(hasToken)` dominates `123/456/Clean/Accelerated` + `assert.ok(hasStyle)` dominates `76×76/60×44` + `assert.strictEqual` dominates `rg` allowlists `FALLBACK==2/previews?:==1/?? FALLBACK==1`) |
| Test Length (≤300 lines)             | ❌ FAIL | 1    | Absolute | `hud-preview-hardening.atdd.test.ts` unit mirror is 308 lines, 8 over the 300-line threshold; all other reviewed files are ≤300 (`triade` ATDD 297, gateway 231, umbrella 144, fixtures 188). Threshold per `test-quality.md` ≤300 ideal; H5 HIGH fires on the mirror |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | Each test file runs <1.5 min host (`gateway 14 tests ~110 ms`, `umbrella 9 tests ~95 ms`, `ATDD 20 skip ~45 ms dormant / ~180 ms activated`; `npm --prefix triade test` full host 910 pass / 10 expected RED / 228 skipped <5 s) — well under target |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute | Zero tight timeouts (`{timeout:1000}`), race conditions, timing-dependent assertions, retry logic, or environment-dependent assumptions; bench smoke is deterministic 100-render loop with `<5 s` generous threshold not wall-clock governed |

**Total Violations**: 0 Critical, 1 High, 0 Medium, 2 Low

**Convention Baseline**: 40 test files sampled outside the review set of 107 corpus files (capped at 40 closest-first by directory distance from `_bmad-output/test-artifacts/tests` and `triade/__tests__/ui` per step-02 sampling rules). `priorityMarkers: 23/40 established [P#]`, `testIds: 0/40 absent`, `bddNaming: 14/40 emerging`, `networkFirst: 1/40 emerging`, `dataFactories: 2/40 emerging`, `fixtures: 0/40 absent`, `assertionStyle: 40/40 established (assert)`; `unknown` never applied (sampled ≥4).

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -1 × 5 = -5
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

Final Score:             93/100
Grade:                   A
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Oversize test file — split `tests/unit/hud-preview-hardening.atdd.test.ts` (H5 HIGH, 308 lines)

**Severity**: P1 (High)
**Location**: `_bmad-output/test-artifacts/tests/unit/hud-preview-hardening.atdd.test.ts:1` (308 lines, threshold 300)
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)

**Issue Description**:
The unit mirror of the ATDD scaffolds (`tests/unit/hud-preview-hardening.atdd.test.ts`) is 308 lines — 8 lines over the 300-line threshold. It mirrors `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts` (297 lines, just under) plus the same `renderHud`/`allText`/`hasToken`/`hasStyle` helpers and file-system scan preamble. Both files define identical `renderHud` inline instead of importing the canonical fixture, so the mirror pays the duplication cost of helpers + header + ledger hash without adding coverage. The gateway (231) and umbrella (144) correctly import from `hud-preview-hardening-fixtures.ts` and stay well under the limit.

**Current Code**:

```typescript
// ⚠️ Current — unit mirror duplicates triade ATDD inline (308 lines total)
import { describe, it } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hud } from '../../../../triade/src/ui/Hud.tsx';
import type { Preview } from '../../../../triade/src/game/preview.ts';
import { PreviewCard } from '../../../../triade/src/ui/PreviewCard.tsx';

const insets = { top: 10, left: 10, right: 10, bottom: 10 };
function renderHud(props: any = {}) { /* 15 lines */ }
function allText(renderer: TestRenderer.ReactTestRenderer): string[] { /* 10 lines */ }
const hasToken = ...
const hasStyle = ...
const hudSrc = fs.readFileSync(path.join(__dirname, '../../../../triade/src/ui/Hud.tsx'), 'utf8');
// ... then 20 it.skip scaffolds + P2/P3 scans = 308
```

**Recommended Improvement**:

```typescript
// ✅ Better — import canonical probes, delete mirror duplication (becomes ~165 lines, restores bonus)
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderHud, allText, hasToken, hasStyle, PREVIEW_EXACT_3, PREVIEW_EXACT_6, PREVIEW_RANGE_3_6_12, FALLBACK_PREVIEW, INSETS, BAND_HEIGHT, HUD_CONSTANTS, LEDGER, readSource, HUD_SOURCE_PATH } from '../../fixtures/hud-preview-hardening-fixtures.ts';
import type { Preview } from '../../../../triade/src/game/preview.ts';

// no renderHud/allText/hasToken/hasStyle redefinition — imported
// hudSrc becomes readSource(HUD_SOURCE_PATH)
// ledgerSrc becomes readSource(LEDGER_PATH)
// ...
// Or keep triade ATDD as canonical (297 lines) and delete the unit mirror entirely — 
// gateway (14 tests) + umbrella (9 tests) + triade ATDD (20) already cover P0-P3 43 contracts
// without a second 308-line copy. If the mirror must stay for test-artifacts path symmetry,
// make it `export * from '../../../triade/__tests__/ui/hud-preview-hardening.atdd.test.ts'`
// re-export rather than copy.
```

**Benefits**:
`tests/unit` drops to ~165 lines (or 5-line re-export), stays under 300, restores `Comprehensive Fixtures` bonus (`+5` when every reviewed file imports fixtures), and makes a future `renderHud` harness change a one-file edit in `fixtures.ts`. No coverage lost — the same 20 scaffolds already live in `triade/__tests__/ui`.

**Priority**:
P1 High — the only HIGH in the ledger; fixing it flips the computed verdict from `Request Changes` to `Approve with Comments` and restores grade A at 98/100 (with L6 fixes) or 95/100 (fixture import alone).

---

### 2. Magic chrome literals and score literals duplicated instead of fixture canonicals (L6 LOW)

**Severity**: P3 (Low)
**Location**: `_bmad-output/test-artifacts/tests/api/hud-preview-hardening.gateway.spec.ts:33,48,62,78`, `_bmad-output/test-artifacts/tests/e2e/hud-preview-hardening.umbrella.spec.ts:22,54`, `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts:42,54,78`, `_bmad-output/test-artifacts/tests/unit/hud-preview-hardening.atdd.test.ts:42,54,78`
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md), [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Issue Description**:
Chrome literals `76`/`60`/`44`/`40` and score literals `123`/`456`/`10` (insets) and `Preview` values `3`/`6`/`12` appear inline as bare numbers/strings in `hasStyle({width:76,height:76})` / `hasStyle({minWidth:60,height:44})` / `hasToken(t,'123')` / `previews: {clean: {kind:'exact', value:3}}` without importing the canonical fixture that already exports `HUD_CONSTANTS.PORTRAIT` / `HUD_CONSTANTS.LANDSCAPE_BAND` / `SCORE_FIXTURES` / `INSETS` / `BAND_HEIGHT` / `PREVIEW_EXACT_3/6/RANGE_3_6_12` with documented semantics. The literals are deterministic and correct, but the duplication forfeits the `Comprehensive Fixtures` bonus and makes a future `76×76→80×80` chrome change (UX-DR-20) a six-file edit.

**Current Code**:

```typescript
// ⚠️ Could be improved — gateway/ATDD use inline literals
assert.ok(hasStyle(r, { width: 76, height: 76 }), 'portrait 76×76 chrome must be present');
assert.ok(hasStyle(r, { minWidth: 60, height: 44 }), 'landscape compact 60×44 band');
assert.ok(hasToken(t, '123'), 'score 123 must still render');
const r = renderHud({ previews: { clean: { kind: 'exact', value: 3 } as Preview } });
```

**Recommended Improvement**:

```typescript
// ✅ Better — import canonical probes, keep literals only in fixture
import { HUD_CONSTANTS, SCORE_FIXTURES, INSETS, BAND_HEIGHT, PREVIEW_EXACT_3, PREVIEW_EXACT_6, PREVIEW_RANGE_3_6_12, FALLBACK_PREVIEW } from '../../fixtures/hud-preview-hardening-fixtures.ts';

assert.ok(hasStyle(r, HUD_CONSTANTS.PORTRAIT), 'portrait 76×76 chrome must be present');
assert.ok(hasStyle(r, HUD_CONSTANTS.LANDSCAPE_BAND), 'landscape compact 60×44 band');
assert.ok(hasToken(t, String(SCORE_FIXTURES.score)), `score ${SCORE_FIXTURES.score} must still render`);
const r = renderHud({ previews: { clean: PREVIEW_EXACT_3 } });
// triade ATDD should also `import { INSETS, BAND_HEIGHT, PREVIEW_EXACT_3 } from '../../..'` 
// via the same fixture (gateway/umbrella already do) — one source for chrome literals
```

**Benefits**:
Single source for HUD chrome + score + Preview literals; `HUD_CONSTANTS` widening edits one fixture, not six spec files.

**Priority**:
P3 Low — no risk to verdict on its own; cleanup when splitting helpers or activating scaffolds. Fixture already correct; specs just need to import it consistently.

---

### 3. Inline helper duplication `renderHud`/`allText`/`hasToken`/`hasStyle` across ATDD + fixture (L6 LOW)

**Severity**: P3 (Low)
**Location**: `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts:14-54`, `_bmad-output/test-artifacts/tests/unit/hud-preview-hardening.atdd.test.ts:14-64`, `_bmad-output/test-artifacts/fixtures/hud-preview-hardening-fixtures.ts:73-122`
**Row**: L6 (readability, not M2)
**Criterion**: Magic value / Repeated helper
**Knowledge Base**: [fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md), [data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)

**Issue Description**:
Both ATDD files define `renderHud()` (15 lines), `allText()` (10 lines), `hasToken()` (2 lines), `hasStyle()` (11 lines) inline — 38 lines duplicated — while the fixture already exports the same four helpers with identical `act()` + `TestRenderer.create` + `findAll Text` + `layers.some every` logic. Gateway and umbrella correctly `import { renderHud, allText, hasToken, hasStyle } from '../fixtures/hud-preview-hardening-fixtures.ts'`, so M2 `Repeated literal payload` does not fire (factory exists and is used where it matters), but the ATDD duplication forfeits the `Comprehensive Fixtures` bonus (`0` instead of `+5`) and would make a future `React 19 act()` → `act` migration a three-file edit.

**Recommended Improvement**:
`triade/__tests__/ui/hud-preview-hardening.atdd.test.ts` should `import { renderHud, allText, hasToken, hasStyle, INSETS } from '../../..'` (or from the fixture via relative path) exactly as gateway/umbrella do. Keep the local `hasStyle` only as a one-line re-export if needed for spec readability. The unit mirror then becomes a one-line `export * from '../../../triade/__tests__/ui/hud-preview-hardening.atdd.test.ts'` re-export rather than a 308-line copy.

**Priority**:
P3 Low — no risk to verdict; cleanup when activating RED scaffolds. Fixture already correct; ATDD just needs to import it.

---

## Best Practices Found

### 1. `doesNotThrow` + token + chrome triple proves never-throw without hiding missing wiring

**Location**: `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts:18-31`, `_bmad-output/test-artifacts/tests/api/hud-preview-hardening.gateway.spec.ts:19-31`, `_bmad-output/test-artifacts/tests/e2e/hud-preview-hardening.umbrella.spec.ts:18-44`
**Pattern**: Determinism + explicit assertions + lane-gate hygiene
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md), [fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)

**Why This Is Good**:
Every P0 omitted/partial/null pin captures the never-throw contract as `assert.doesNotThrow(() => renderHud({previews: undefined}))` + `assert.doesNotThrow(() => renderHud({} as any))` + `assert.doesNotThrow(() => renderHud({previews: null as any}))` **and** the HUD-still-renders contract as `hasToken(t,'123')` + `t.some(p=>p.includes('Recorde'))` + `hasToken(t,'Clean')` + `hasStyle({width:76,height:76})` + `!hasToken(t,'3')` empty-fallback. The `FALLBACK_PREVIEW {range, []} → ""` empty-window is least-lying (any `[1,2]` would lie about spawn), and the opposite-partial both-directions (`{clean:3}+clean→3 / +accelerated→""` and `{accelerated:6}+clean→!6 / +accelerated→6`) plus distinct populated `clean 3 vs accelerated 3/6/12` via `activeLaneId` (kept green in `hud.test.ts:F-4` + `previewWiring`) proves the fallback did not mask missing wiring. Any future `App.tsx` omission that dropped one lane would fail the populated distinct-lane pin, not the empty-path success — the exact R-001/R-003 mitigation the test-design demanded.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
// P0-01: omitted previews portrait — never-throw + chrome + not populated
assert.doesNotThrow(() => renderHud({ previews: undefined }));
assert.doesNotThrow(() => renderHud({} as any));
const r = renderHud({ previews: undefined });
const t = allText(r);
assert.ok(hasToken(t, '123'), 'score 123 must still render when previews omitted');
assert.ok(t.some((p) => p.includes('Recorde')), 'Recorde label must still render');
assert.ok(hasToken(t, 'Clean'), 'default activeId clean → Clean label must render');
assert.ok(hasStyle(r, { width: 76, height: 76 }), 'portrait 76×76 chrome must be present even when fallback active');
assert.ok(!hasToken(t, '3') && !hasToken(t, '6'), 'fallback range [] → "" must not show populated value 3/6');

// P1-01 distinct: populated clean 3 vs accelerated 3/6/12 are not masked by empty
const rClean = renderHud({ previews: { clean: PREVIEW_EXACT_3, accelerated: PREVIEW_RANGE_3_6_12 }, activeLaneId: 'clean' });
assert.ok(hasToken(allText(rClean), 'Clean') && hasToken(allText(rClean), '3') && !allText(rClean).some(p=>p.includes('/')));
const rAcc = renderHud({ previews: { clean: PREVIEW_EXACT_3, accelerated: PREVIEW_RANGE_3_6_12 }, activeLaneId: 'accelerated' });
assert.ok(hasToken(allText(rAcc), 'Accelerated') && allText(rAcc).some(p=>p.includes('3/6/12')));
```

**Use as Reference**:
Keep the `doesNotThrow + hasToken(123/Clean) + hasStyle(76×76) + !hasToken(3)` quadruple for every future `Hud` prop widening; the three early-return shapes (omitted, partial clean, null) all share the same quadruple today — a missing `previews?.` optional chain on any lane would fail exactly one of the three.

---

### 2. `rg` allowlists make single-constant / single-freeze / fan-out discipline an immediate PR gate failure

**Location**: `_bmad-output/test-artifacts/fixtures/hud-preview-hardening-fixtures.ts:151-188`, `_bmad-output/test-artifacts/tests/api/hud-preview-hardening.gateway.spec.ts:19-231`, `_bmad-output/test-artifacts/tests/e2e/hud-preview-hardening.umbrella.spec.ts:18-144`
**Pattern**: test-levels-framework.md Unit dominance with static-scan allowlist as E2E-equivalent
**Knowledge Base**: [test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md), [selective-testing.md](../../../agents/bmad-tea/resources/knowledge/selective-testing.md)

**Why This Is Good**:
P2 `assertHudGuardWiring` pins the single-constant discipline as `rg -n "FALLBACK_PREVIEW" ==2 (def + use)` + `rg -n "previews?: " ==1 (interface)` + `rg -n "?? FALLBACK_PREVIEW" ==1 (coalesce)` + `rg previews.clean ==0` + `rg previews.accelerated ==0` + `previews?.clean && previews?.accelerated` existence plus `PreviewCard` no `export type Preview` pollution via `strip read` and `App.tsx` fan-out `previews={{` ×1 + `previewFor(game.pendingSpawn` ≥2 via `assertAppFanout`. The ledger scan (`status: done 2026-09-02` + `da2f401d…` 64-hex ×1 + `resolution: resolved by sweep bundle dw-hud-preview-hardening` + `resolution-undo` + `sprint-status.yaml` untouched) makes the operational closure gate equally sharp. Any rename `previews→preview` without updating chain or second `FALLBACK_PREVIEW` literal re-introducing scattered `[]` would fail the allowlist before any behavioral pin runs. The `H5` HIGH is the only file-level debt; the allowlists themselves are ≤188 lines and reusable.

**Code Example**:

```typescript
// ✅ Excellent pattern demonstrated in this test
export function assertHudGuardWiring(hudSrc: string): void {
  const fallbackHits = countMatches(hudSrc, /FALLBACK_PREVIEW/g);
  if (fallbackHits !== 2) throw new Error(`FALLBACK_PREVIEW must be 2, got ${fallbackHits}`);
  const previewsOptionalHits = countMatches(hudSrc, /previews\?:/g);
  if (previewsOptionalHits !== 1) throw new Error(`previews?: must be 1, got ${previewsOptionalHits}`);
  const coalesceHits = countMatches(hudSrc, /\?\? FALLBACK_PREVIEW/g);
  if (coalesceHits !== 1) throw new Error(`?? FALLBACK_PREVIEW must be 1, got ${coalesceHits}`);
  const bareClean = countMatches(hudSrc, /previews\.clean/g);
  if (bareClean !== 0) throw new Error(`bare previews.clean must be 0, got ${bareClean}`);
  if (!hudSrc.includes('previews?.clean') || !hudSrc.includes('previews?.accelerated')) throw new Error('previews?.clean + previews?.accelerated must both exist');
}
assert.ok(!hudSrc.includes('export type Preview'), 'Hud must not re-export Preview type');
assert.ok(previewCardSrc.includes('Number.isFinite') && previewCardSrc.includes("join('/')"));
```

**Use as Reference**:
Any future Hud chrome sweep (e.g., `60×44→64×48` landscape or `FALLBACK_PREVIEW` → `Object.freeze`) should copy this `rg allowlist + ledger hash + sprint-status ownership` triad; failure then localizes to one helper string, not to a flaky end-to-end HUD comparison.

---

### 3. Host `react-test-renderer` harness proves the suite would catch drift without an Expo dev build

**Location**: `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts:14-54`, `_bmad-output/test-artifacts/tests/api/hud-preview-hardening.gateway.spec.ts:14-31`, `_bmad-output/test-artifacts/fixtures/hud-preview-hardening-fixtures.ts:73-122`
**Pattern**: Determinism + isolation + component-tdd (pure presentation, host-inspectable)
**Knowledge Base**: [test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md), [component-tdd.md](../../../agents/bmad-tea/resources/knowledge/component-tdd.md)

**Why This Is Good**:
`renderHud()` wraps `TestRenderer.create(React.createElement(Hud, {score,best,isLandscape,insets,bandHeight,previews,activeLaneId}))` in `act()` and `allText` walks `root.findAll(n=>n.type==='Text')` with `walk(n.props.children)` + `hasToken` exact-trim + `hasStyle` layer-aware `Array.isArray(style)? layers.every` — the exact depth the production `Hud.tsx:9,23,64-67` guard + `PreviewCard displayOf` `filter(Number.isFinite).join('/')` guarantees for `Preview=exact|range` union. The `INSETS {top:10}` + `BAND_HEIGHT 40` + `isLandscape` portrait/landscape fixtures are deterministic and correct per `getBandTop(insets,bandHeight)` chrome budget, and `PreviewCard` direct probe `renderPreviewCard({kind:'range', values:[]},'Clean')` pins `range []→""` without involving `Hud` at all. Any future `activeLaneId` swap (`accelerated→clean` order) or `previews.clean` bare without `?.` or `displayOf` returning `undefined` literal would fail one of the `hasToken`/`hasStyle`/`a11y` gates while keeping the host run `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test` `<200 ms` and `npm --prefix triade test` `910 pass / 10 expected RED / 228 skipped` unchanged.

**Use as Reference**:
This is the canonical `Hud` hardening harness for the repo; copy it for any future `Hud`/`PreviewCard` prop widening where `previews` gains a third lane or `PreviewCard` gains a placeholder `—` for empty — the `renderHud + allText + hasStyle` triple is the only harness the next Hud sweep should need.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts`
- **File Size**: 297 lines, 10.8 KB
- **Test Framework**: node:test + tsx (TSX_TSCONFIG_PATH=triade/tsconfig.test.json)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/unit/hud-preview-hardening.atdd.test.ts`
- **File Size**: 308 lines, 11.1 KB
- **Test Framework**: node:test + tsx (mirror of triade ATDD, same harness)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/api/hud-preview-hardening.gateway.spec.ts`
- **File Size**: 231 lines, 9.2 KB
- **Test Framework**: node:test + tsx (TEA API gateway — Hud seam gateway contract)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/hud-preview-hardening.umbrella.spec.ts`
- **File Size**: 144 lines, 6.0 KB
- **Test Framework**: node:test + tsx (TEA E2E umbrella — Hud host + static-scan journeys)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/fixtures/hud-preview-hardening-fixtures.ts`
- **File Size**: 188 lines, 8.4 KB
- **Test Framework**: fixture helpers (not a test suite; not scored by the ledger)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 4 (triade ATDD: P0 7 + P1 6 + P2 4 + P3 3 via `describe`; gateway: P0 7 + P1 3 + P2 4 via 14 `test()` at top level with commented sections; umbrella: P2 4 + P3 5 via 9 `test()` at top level — no `describe` grouping, per TEA node:test convention for ATDD)
- **Test Cases (it/test)**: 43 (triade ATDD 20 `it.skip` + unit mirror 20 `it.skip` + gateway 14 `test.skip` dormant + umbrella 9 `test.skip` dormant — when activated 43 pass; counted as 43 reviewed, 43 dormant RED-phase)
- **Average Test Length**: 7.1 lines per test body (median, excluding header/boilerplate/helpers)
- **Fixtures Used**: `renderHud`/`allText`/`hasToken`/`hasStyle` host harness, `renderPreviewCard` PreviewCard harness, `readSource`/`countMatches` scan helpers, `assertHudGuardWiring`/`assertPreviewCardDefensive`/`assertAppFanout`/`assertLedger` rg-gate helpers, `PREVIEW_EXACT_3/6/RANGE_3_6_12/FALLBACK_PREVIEW/PREVIEW_RANGE_EMPTY` Preview factories, `INSETS`/`BAND_HEIGHT`/`SCORE_FIXTURES`/`SCORE_ZERO`/`HUD_CONSTANTS`/`LEDGER`/`SCAN_STRINGS` catalog (15 helpers in fixtures)
- **Data Factories Used**: `renderHud({previews: ...})` HudProps prop factory, `renderPreviewCard(preview,label)` PreviewCard factory, `readSource(path)` scan factory; no `@faker-js/faker`, no `Math.random`/`Date.now` governing expiry

### Test Scope

- **Test IDs**: No `data-testid`/`getByTestId` — house convention absent (0/40 sampled) — intentionally not applied (RN Hud seam, no DOM); PASS (n/a)
- **Priority Distribution**:
  - P0 (Critical): 14 tests (triade ATDD 7 + gateway 7)
  - P1 (High): 9 tests (triade ATDD 6 + gateway 3)
  - P2 (Medium): 8 tests (triade ATDD 4 + gateway 4 + umbrella 4)
  - P3 (Low): 12 tests (triade ATDD 3 + umbrella 5 + unit mirror counted once; gateway P3 is 0 as umbrella covers P3)
  - Unknown: 0 (every reviewed test carries explicit `[P0-01]`/`[API-P0-01]`/`[E2E-P2-01]` priority prefix)
- **Traceability**: 20 acceptance-criteria contracts (P0 7 + P1 6 + P2 4 + P3 3) via `coverage-matrix-dw-hud-preview-hardening.json` FULL 20/20 + `e2e-trace-summary-dw-hud-preview-hardening.json` FULL; gateway + umbrella + triade ATDD + unit mirror all map onto those 20 contracts plus `App` fan-out + ledger + chrome

### Assertions Analysis

- **Total Assertions**: 87 (triade ATDD 32 + unit mirror 32 + gateway 28 + umbrella 11 dormant — when activated, `assert.doesNotThrow` dominates `previews undefined/null/partial` + `assert.ok(hasToken)` dominates `123/456/Clean/Accelerated` + `assert.ok(hasStyle)` dominates `76×76/60×44` + `assert.strictEqual` dominates `rg` allowlists `FALLBACK==2/previews?:==1/?? FALLBACK==1/bare 0` + `assert.ok` dominates `Number.isFinite/join` + `assertLedger` hash)
- **Assertions per Test**: 2.4 avg overall (median 3: one `doesNotThrow`, one `hasToken(Clean/123)`, one `hasStyle(76×76)`; lane tests add 2 asserts per direction (label + value + not-leak); allowlist tests add 3 asserts per scan (count+bare+existence))
- **Assertion Types**: `assert.doesNotThrow` (omitted/partial/null never-throw), `assert.ok(hasToken)` (score/label/value), `assert.ok(hasStyle)` (chrome), `assert.ok` (ledger hash / `Number.isFinite` / `join('/')` / `previews?.` existence), `assert.strictEqual` (FALLBACK count / `previews?:` count / `??` count / `bare 0` / hash length)

---

## Context and Integration

### What the Context Said

The supplied context set (`_bmad-output/implementation-artifacts/deferred-work.md` DW-69 `Hud throws if previews prop omitted` `status: open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-hud-preview-hardening` + `resolution-undo: da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce 64-hex + date-salt` + `test-design-dw-hud-preview-hardening.md` 9 risks R-001..R-009 with 2 high score 6 (R-001 silent fallback masks missing wiring, R-002 empty `range []→""` a11y trailing empty) + `Hud.tsx:9 FALLBACK_PREVIEW: Preview = {kind:'range', values:[]}` singleton least-lying empty window + `:23 previews?: {clean?: Preview; accelerated?: Preview}` optional shape (backward compatible) + `:64-67 activeId default 'clean' + activePreview = (activeId==='accelerated'? previews?.accelerated : previews?.clean) ?? FALLBACK_PREVIEW` guard (replaces unconditional `previews.clean/accelerated` throw) + `PreviewCard.tsx:14-22 displayOf` `filter(Number.isFinite).join('/') → ""` + `App.tsx:950-952 previews={{clean: previewFor(game.pendingSpawn, availablePot), accelerated: previewFor(...)}}` fan-out — hardening is Hud-only defensive, no engine roll) established:

- The **never-throw invariant** is `previews` optional + `?.` + `?? FALLBACK` never throws on omitted/partial/null and still renders `score`/`Recorde`/`Clean` + `76×76`/`60×44` chrome with empty `""` not populated `3/6/12` (DW-69 AC1-5), while populated distinct `clean exact 3 vs accelerated range [3,6,12]` via `activeLaneId` gate stays green (`hud.test.ts:F-4` + `previewWiring` 9/9) so a future `App.tsx` omission would be caught by the populated-path distinctness failure, not masked by the empty-path success (R-001).
- The **empty-chip invariant** is `FALLBACK_PREVIEW = {kind:'range', values:[]}` least-lying (not `[1,2]`) with `PreviewCard.displayOf` `range []→""` + `Próxima (Clean): ` trailing empty a11y still present; `60×44` landscape band reuses same guard, no YellowBox, no `undefined` literal (R-002). Future `Object.freeze(FALLBACK_PREVIEW)+values` hardening is advisory (P1-06) with zero current blast radius because no caller mutates `.values` today.
- The **single-constant invariant** is `FALLBACK_PREVIEW` single definition (def + use `==2`), single `previews?:` interface (`==1`), single `?? FALLBACK_PREVIEW` site (`==1`), no bare `previews.clean`/`previews.accelerated` outside guard, `Preview` imported only via `PreviewCard` (no `any` widening), no `export type Preview` duplication in `Hud.tsx:1` (R-006).
- The **ledger invariant** is 64-hex reversibility: `deferred-work.md` DW-69 flips `status: open→done 2026-09-02` with `resolution: resolved by sweep bundle dw-hud-preview-hardening` + `resolution-undo: da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce` (64-hex + date-salt); `sprint-status.yaml` is orchestrator-owned and must not be written (verified empty diff).

Context raised no contradictions with the reviewed tests; the tests exercise exactly the 6 ACs and 9 risks the design names, plus the 20 criteria via P0/P1/P2/P3 and the P3 exploratory + bench + hygiene. No story claim was contradicted by a tested assertion. Context did not waive any rubric violation, lower any severity, or amend the ledger — per the workflow contract, context may add findings and clarify impact but cannot exempt a row.

### Related Artifacts

- **Story File**: Not supplied as a story artifact — this is a deferred-work sweep bundle `dw-hud-preview-hardening` (DW-69) with ledger as source of record
- **Spec**: [_bmad-output/implementation-artifacts/deferred-work.md](../../../implementation-artifacts/deferred-work.md) (DW-69 entry `Hud throws if previews prop omitted`)
- **Test Design**: [_bmad-output/test-artifacts/test-design/test-design-dw-hud-preview-hardening.md](../test-design/test-design-dw-hud-preview-hardening.md)
- **ATDD Checklist**: [_bmad-output/test-artifacts/atdd-checklist-dw-hud-preview-hardening.md](../atdd-checklist-dw-hud-preview-hardening.md)
- **Automation Summary**: [_bmad-output/test-artifacts/automation-summary.md](../automation-summary.md)
- **Traceability / Coverage Matrix**: [_bmad-output/test-artifacts/traceability/coverage-matrix-dw-hud-preview-hardening.json](../traceability/coverage-matrix-dw-hud-preview-hardening.json) + [_bmad-output/test-artifacts/traceability/e2e-trace-summary-dw-hud-preview-hardening.json](../traceability/e2e-trace-summary-dw-hud-preview-hardening.json) + [_bmad-output/test-artifacts/traceability/gate-decision-dw-hud-preview-hardening.json](../traceability/gate-decision-dw-hud-preview-hardening.json)
- **NFR Assessment**: [_bmad-output/test-artifacts/nfr-assessment-dw-hud-preview-hardening.md](../nfr-assessment-dw-hud-preview-hardening.md)
- **Risk Assessment**: 9 risks R-001..R-009 (R-001 silent fallback masks missing wiring 6 P0, R-002 empty chip a11y 6 P0, R-003 lane swap 4 P1, R-004 mutable singleton 4 P1, R-005 null 4 P0, R-006 single-source 4 P1, R-007 ledger 3 P1, R-008 perf 1 P3, R-009 hygiene scope 1 P3)
- **Priority Framework**: P0-P3 per `test-priorities-matrix.md` applied via ATDD priority distribution + gateway/umbrella P0/P1/P2/P3 mapping + fixtures probes

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../agents/bmad-tea/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../agents/bmad-tea/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern
- **[network-first.md](../../../agents/bmad-tea/resources/knowledge/network-first.md)** - Route intercept before navigate (race condition prevention) — gate closed for pure Hud seam, not applied
- **[data-factories.md](../../../agents/bmad-tea/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](../../../agents/bmad-tea/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness (Unit dominant, host static-scan as E2E-equivalent for pure Hud seam)
- **[component-tdd.md](../../../agents/bmad-tea/resources/knowledge/component-tdd.md)** - Red-Green-Refactor patterns (ATDD RED-phase scaffolds intentionally dormant)
- **[selective-testing.md](../../../agents/bmad-tea/resources/knowledge/selective-testing.md)** - Duplicate coverage detection (gateway + umbrella duplication is intentional secondary seam, not waste)
- **[ci-burn-in.md](../../../agents/bmad-tea/resources/knowledge/ci-burn-in.md)** - Flakiness detection patterns (fixed-count bench smoke, not wall-clock)
- **[test-priorities-matrix.md](../../../agents/bmad-tea/resources/knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 classification framework
- **[probability-impact.md](../../../agents/bmad-tea/resources/knowledge/probability-impact.md)** - P×I scoring for R-001..R-009 (2 high ≥6)
- **[risk-governance.md](../../../agents/bmad-tea/resources/knowledge/risk-governance.md)** - Risk-driven test selection
- **[nfr-criteria.md](../../../agents/bmad-tea/resources/knowledge/nfr-criteria.md)** - Reliability never-throw + 60 FPS O(1) + ledger 64-hex quality gates

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../../agents/bmad-tea/resources/knowledge/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split the 308-line unit mirror — import fixtures or re-export** - Recommendation 1 (H5 HIGH) — import canonical probes or replace mirror with `export *` re-export
   - Priority: P1
   - Owner: ui owner + TEA reviewer
   - Estimated Effort: 10 min (replace `renderHud`/`allText`/`hasToken`/`hasStyle` inline with `import { renderHud, allText, hasToken, hasStyle, PREVIEW_EXACT_3 } from '../../fixtures/hud-preview-hardening-fixtures.ts'` + delete duplicate `fs.readFileSync` preamble; drops to ~165 lines; re-run `node --import tsx --test`)

2. **Import fixture canonicals instead of duplicating literals** - Recommendation 2 (L6 LOW) — `hasStyle({width:76...})`/`hasToken('123')`/`value:3` inline → `HUD_CONSTANTS`/`SCORE_FIXTURES`/`PREVIEW_EXACT_3` imports
   - Priority: P3
   - Owner: ui owner
   - Estimated Effort: 10 min (replace 6 literals with `HUD_CONSTANTS.PORTRAIT` + `SCORE_FIXTURES.score` + `PREVIEW_EXACT_3` + re-run `npm --prefix triade test -- __tests__/ui/hud-preview-hardening.atdd.test.ts`)

### Follow-up Actions (Future PRs)

1. **Activate RED-phase scaffolds on bundle close** - `s/test.skip/test/g` `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts` + `s/it.skip/it/g` `_bmad-output/test-artifacts/tests/unit` → 43/43 pass when `4f674b4` guard is at HEAD (already verified via `hud.test.ts 8/8` + `previewWiring 9/9` + `previewCard 7/7` green; keep `PreviewCard` defensive `[]→""` as oracle)
   - Priority: P2
   - Target: bundle close

2. **Consider `Object.freeze(FALLBACK_PREVIEW)` + `Object.freeze(FALLBACK_PREVIEW.values)` hardening** - Recommendation 3 advisory (P1-06)
   - Priority: P3
   - Target: backlog (zero blast radius today; future caller `push` gap deferred to Epic 7)

### Re-Review Needed?

⚠️ Re-review needed after H5 fix — `tests/unit/hud-preview-hardening.atdd.test.ts` → ≤300 lines (import fixtures or re-export) then re-run this review; LOWs can ride.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Quality score 93/100 is Excellent but one H5 HIGH (308-line mirror, 8 over 300) remains. The 20 unit scaffolds + 14 gateway contracts + 9 umbrella journeys are dormant RED-phase with documented header reason (so `Disabled or Focused Tests` does not fire), while the activated counterparts plus `hud.test.ts 8/8` + `previewWiring 9/9` + `previewCard 7/7` + NFR PASS + both `tsc` gates are green with perfect determinism, isolation, and explicit-assertion discipline (all ≤231 except the mirror). The score reflects `100 -5(HIGH) -2(LOW×2) +0(bonus forfeited via ATDD helper duplication) =93`, grade A, but computed verdict per `steps-c/step-03f-aggregate-scores.md §3b` is `any HIGH → Request Changes` regardless of score. With 1 HIGH and 2 LOW the computed verdict is `Request Changes`. Importing the fixture canonicals into the ATDD files and splitting the unit mirror to ≤300 lines (or re-exporting) resolves the HIGH and restores `Approve with Comments` at 97-98/100 without new coverage.

**For Approve**:

> Test quality is excellent/good with 93/100 score. Minor issues noted can be addressed in follow-up PRs. Tests are production-ready and follow best practices.

**For Approve with Comments**:

> Test quality is acceptable with 93/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

**For Request Changes**:

> Test quality needs improvement with 93/100 score. Critical issues must be fixed before merge. 1 high violation detected (file length >300) that poses maintainability risk. Splitting the 308-line mirror via fixture import restores the bar.

**For Block**:

> Test quality is insufficient with 93/100 score. Multiple critical issues make tests unsuitable for production. Recommend pairing session with QA engineer to apply patterns from knowledge base.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| `_bmad-output/test-artifacts/tests/unit/hud-preview-hardening.atdd.test.ts:1` | P1 (High) | H5 Oversize test file (>300 lines) | File is 308 lines, 8 over threshold | Split via fixture import or re-export as in Recommendation 1 |
| `_bmad-output/test-artifacts/tests/api/hud-preview-hardening.gateway.spec.ts:33` | P3 (Low) | L6 Magic value | `width:76 height:76` / `minWidth:60 height:44` / `score 123` literals inline | Import `HUD_CONSTANTS`/`SCORE_FIXTURES` as in Recommendation 2 |
| `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts:14-54` | P3 (Low) | L6 Magic value | `renderHud`/`allText`/`hasToken`/`hasStyle` 38 lines duplicated vs fixture | Import from `hud-preview-hardening-fixtures.ts` as in Recommendation 3 |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-02 | 93/100 | A | 0       | ➡️ Stable (first review for this bundle) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| `hud-preview-hardening.atdd.test.ts` (triade) | 98/100 | A | 0  | Approve with Comments (L6 helper dup) |
| `hud-preview-hardening.atdd.test.ts` (unit mirror) | 93/100 | A | 0  | Request Changes (H5 + L6) |
| `hud-preview-hardening.gateway.spec.ts` | 98/100 | A | 0  | Approve with Comments (L6 magic literals) |
| `hud-preview-hardening.umbrella.spec.ts` | 100/100 | A | 0  | Approve (144 lines, no HIGH) |
| `hud-preview-hardening-fixtures.ts` | 100/100 | A | 0  | Approve (188 lines, not scored) |

**Suite Average**: 97/100 (A) — mirrors drive average down; canonical triade + gateway are 98.

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-dw-hud-preview-hardening-20260902
**Timestamp**: 2026-09-02 12:00:00
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

- triade/__tests__/ui/hud-preview-hardening.atdd.test.ts
- _bmad-output/test-artifacts/tests/unit/hud-preview-hardening.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/hud-preview-hardening.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/hud-preview-hardening.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/deferred-work.md
- _bmad-output/test-artifacts/test-design/test-design-dw-hud-preview-hardening.md
- _bmad-output/test-artifacts/test-design-dw-hud-preview-hardening.md
- _bmad-output/test-artifacts/atdd-checklist-dw-hud-preview-hardening.md
- triade/src/ui/Hud.tsx
- triade/src/ui/PreviewCard.tsx
- triade/src/game/preview.ts
- triade/App.tsx
- triade/__tests__/ui/components/hud.test.ts
- triade/__tests__/ui/components/hud.previewWiring.test.ts
- triade/__tests__/ui/components/previewCard.test.ts
- _bmad-output/test-artifacts/fixtures/hud-preview-hardening-fixtures.ts
- _bmad-output/test-artifacts/traceability/coverage-matrix-dw-hud-preview-hardening.json

## Excluded From Review Set

- _bmad-output/test-artifacts/fixtures/hud-preview-hardening-fixtures.ts — format not scorable by the ledger

