---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-02'
workflowType: 'testarch-atdd'
storyId: 'dw-layout-band-dedup-and-guard'
storyKey: 'dw-layout-band-dedup-and-guard'
storyFile: '_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-layout-band-dedup-and-guard.md'
generatedTestFiles:
  - 'triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-layout-band-dedup-and-guard.md'
  - 'triade/src/ui/layout.ts'
  - 'triade/App.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/orientation.ts'
  - 'triade/__tests__/ui/layout.test.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-layout-band-dedup-and-guard — layoutFor NaN/Infinity guard + band-height dedup

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) — pure layout arithmetic + static dedup scans; no E2E/API harness required. Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 + Skia/Reanimated) but scenario is framework-free pure TS `layoutFor`/`getBandTop` exercised via `node:test`.

---

## Story Summary

DW bundle `dw-layout-band-dedup-and-guard` hardens container-driven layout math that sizes the 4×4 board and the HUD band. Before the sweep a hypothetical `NaN`/`Infinity` reaching `layoutFor` (test harness or future native insets provider) propagated `NaN` through `availWidth/Height` into `boardSize`, while `insets.top + SAFE_MARGIN + bandHeight` lived duplicated in `App.tsx:bandTop` and `Hud.tsx:topPad+bandHeight` with drift risk when the 16-pt margin changes. The sweep makes every `layoutFor` output finite via an early `Number.isFinite` guard on 6 fields (`width/height/insets.top/bottom/left/right`) degrading to `{boardSize:0, bandHeight:96, isLandscape:false}`, and centralizes the band formula into exported `getBandTop` with zero change to any finite rendering (portrait 96, landscape 48, maximized square, 0-clamp).

**As a** player on any phone/orientation
**I want** board sizing to never produce `NaN` and band height to come from a single helper
**So that** even a malformed container degrades to a finite 0-board and future margin changes cannot drift between App and HUD.

---

## Acceptance Criteria

1. **AC guard NaN/Infinity** — Given `NaN` or `Infinity` for `width`/`height` or any inset edge, when `layoutFor` is called, then `boardSize` is `0` and `bandHeight`/`isLandscape` are finite and no `NaN` propagates (no throw).
2. **AC finite byte-identical** — Given any finite `width`/`height`/`insets`, when `layoutFor` is called, then output is byte-identical to pre-change (portrait 96, landscape 48, maximized square `min(availWidth,availHeight)`, `BOARD_SIZE_FLOOR` 216 floor, golden `382/688/452`).
3. **AC degenerate-clamp `layout.test.ts:232`** — Given `layout.test.ts:232` degenerate `top:2000` exceeds container, when run, then `boardSize` is `0` and test stays green (clamp path distinct from guard path).
4. **AC band helper single-source** — Given `App.tsx` and `Hud.tsx` render, when band height is computed, then both use the single shared `getBandTop(insets,bandHeight)` from `layout.ts` and no duplicated `insets.top + SAFE_MARGIN + bandHeight` / `topPad + bandHeight` remains; `getBandTop` is pure `insets.top + SAFE_MARGIN + bandHeight`.

---

## Story Integration Metadata

- **Story ID:** `dw-layout-band-dedup-and-guard` (bundle; spec `baseline_revision: 80dc5c1c6a02f56dc1f3335100c64d9d266314b7`, final `a09e6ed23b968201717a4848cb1cff148172ac4e`)
- **Story Key:** `dw-layout-band-dedup-and-guard`
- **Story File:** `_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-layout-band-dedup-and-guard.md`
- **Generated Test Files:**
  - `triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts` (NEW — 20 RED-phase scaffolds, `it.skip`, host `node:test` + `tsx`; 8 P0 + 6 P1 + 4 P2 + 2 P3)
  - Existing suites (reference, already green): `triade/__tests__/ui/layout.test.ts` (18 pass), `triade/src/ui/orientation.ts` (`width>height`)
- **Working-tree delta covered (vs baseline `80dc5c1`):**
  - `triade/src/ui/layout.ts:33-47` — `export function getBandTop(insets,bh){return insets.top+SAFE_MARGIN+bh;}` + `layoutFor` 6-field `Number.isFinite` early guard → `{boardSize:0, bandHeight:PORTRAIT_BAND_HEIGHT, isLandscape:false}` (finite, no throw)
  - `triade/App.tsx:31,101` — `import {layoutFor,getBandTop}` (was `SAFE_MARGIN`) and `const bandTop=getBandTop(insets,bandHeight)` (was `insets.top+SAFE_MARGIN+bandHeight`) for `content paddingTop`
  - `triade/src/ui/Hud.tsx:3,67,113` — `import {SAFE_MARGIN,getBandTop}` and both `height:` sites (`landscapeBand` `topPad+bandHeight` + `portraitBand` same) → `getBandTop(insets,bandHeight)`; `topPad/leftPad/rightPad/bottomPad` locals retained for `padding*`
  - `git diff --stat -- triade/src/engine` empty — no engine/feel/render change
- **Deferred-work ledger:** `deferred-work.md` DW-5 (`NaN propagation`) + DW-10 (`band duplication`) flipped `open` → `done 2026-09-01` with `resolution-undo: 6f4ef234…` (`73746…`) hashes; `sprint-status.yaml` not written (orchestrator-owned per prompt)

---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`)
- **No Playwright/Cypress harness needed:** scenario is pure `layoutFor`/`getBandTop` arithmetic + static `rg` allowlists; correct level is **Unit host** + static scans. E2E/API scaffolds intentionally absent (per `test-design-dw-layout-band-dedup-and-guard.md` risk `R-001..R-003` mitigations). `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN Skia Canvas project).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`

---

## Red-Phase Test Scaffolds Created

### Unit Tests (20 tests, host `node:test`)

**File:** `triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts` (310 lines, 4 suites)

All 20 are `it.skip` — RED-phase scaffolds. When activated (`it.skip` → `it`) they assert the **expected** post-sweep behaviour; before `a09e6ed` they would fail (NaN-propagation, duplicated formula, missing helper); with the working-tree delta they **PASS** (see Execution Evidence). TDD inversion: tests document the contract; implementation already in working tree makes them green.

#### P0 Critical — Spec AC (8 tests)

- ✅ **Test:** `[P0-01] AC NaN/Infinity guard — 6-field Number.isFinite degrades to boardSize:0 finite (DW-5)`
  - **Status:** RED (skip) — would fail before guard (`boardSize: NaN`); after guard `boardSize:0 && bandHeight 96 && isLandscape false` finite, no throw
  - **Verifies:** `layout.ts:37-47` 6-field guard (R-001/R-003) — width, height, top, bottom, left, right each exercised with `NaN`/`Infinity`
- ✅ **Test:** `[P0-02] AC guard also covers -Infinity and each inset edge Infinity`
  - **Status:** RED — before: `-Infinity` avail calc → `NaN`; after: guard catches all non-finite variants
  - **Verifies:** guard completeness per I-O matrix row `Infinity insets.top` (R-001)
- ✅ **Test:** `[P0-03] AC finite portrait 390×844 byte-identical — width-bounded 358 + band 96`
  - **Status:** RED — before: already passing but now pinned as byte-identical guarantee vs pre-change
  - **Verifies:** finite-path regression guard-order (R-003) — `isLandscape` delegation not moved before guard
- ✅ **Test:** `[P0-04] AC finite landscape 844×390 byte-identical — height-bounded below thin band 48`
  - **Status:** RED — landscape `310` height-bounded + `board > band` (D-006)
  - **Verifies:** `LANDSCAPE_BAND_HEIGHT` 48 thin band contract (R-007)
- ✅ **Test:** `[P0-05] AC finite golden anchors byte-identical — 414×896→382 / 1024×768→688 / 500×580→452`
  - **Status:** RED — regression anchors from `layout.test.ts` re-pinned as ATDD byte-identity
  - **Verifies:** `maximized square min(availWidth,availHeight)` unchanged (R-003)
- ✅ **Test:** `[P0-06] AC degenerate-clamp layout.test.ts:232 — top:2000 clamps to 0 and stays finite`
  - **Status:** RED — `top:2000` clamp path (existing) vs `top:Infinity` guard path both `0` but distinct branches
  - **Verifies:** 0-clamp defensive claim (R-001 vs R-004) — `layout.test.ts:232` stays green
- ✅ **Test:** `[P0-07] AC getBandTop dedup — App.tsx bandTop + Hud.tsx 2× height use single helper, no duplicated formula`
  - **Status:** RED — before: `App.tsx insets.top + SAFE_MARGIN + bandHeight` and `Hud.tsx topPad+bandHeight` present; after: both `getBandTop`
  - **Verifies:** DW-10 single-helper dedup drift (R-002) — `rg getBandTop` 5 occurrences / `SAFE_MARGIN` 0 in App non-import
- ✅ **Test:** `[P0-08] AC getBandTop pure arithmetic — insets.top + SAFE_MARGIN + bandHeight byte-identical`
  - **Status:** RED — `47+16+96=159` / `0+16+48=64` arithmetic pins
  - **Verifies:** helper pure `+` (R-002/R-005)

#### P1 Wiring — band/isLandscape/ledger (6 tests)

- ✅ **Test:** `[P1-01] band pins — PORTRAIT 96 / LANDSCAPE 48 and landscape collapses (96>48)`
  - **Status:** RED — pins `PORTRAIT_BAND_HEIGHT`/`LANDSCAPE_BAND_HEIGHT` constants and `layoutFor` reporting
  - **Verifies:** HUD chrome / pause hit target ≥44 (R-007)
- ✅ **Test:** `[P1-02] isLandscape single-source — layoutFor.isLandscape agrees with orientation.ts width>height`
  - **Status:** RED — square `400×400 → false` (`>` not `>=`)
  - **Verifies:** orientation delegation single call `layout.ts isLandscape(` count 1 (R-009)
- ✅ **Test:** `[P1-03] per-edge insets bind asymmetrically — horizontal shrinks width-bounded, vertical shrinks height-bounded`
  - **Status:** RED — `390×844 358→338` with side insets + `500×580 452→371` with notch
  - **Verifies:** `availWidth = width-left-right-2*SAFE_MARGIN` binding (R-004)
- ✅ **Test:** `[P1-04] SAFE_MARGIN single-constant and getBandTop single-export invariant`
  - **Status:** RED — `SAFE_MARGIN` defined once (layout.ts), `getBandTop` exported once
  - **Verifies:** single constant 16 (R-005)
- ✅ **Test:** `[P1-05] finiteness sweep — all layoutFor outputs finite across sizes and many insets`
  - **Status:** RED — sweep 320/390/844/2000/200/500/1024
  - **Verifies:** never-throw + finiteness NFR (R-001)
- ✅ **Test:** `[P1-06] ledger DW-5/DW-10 done with resolution-undo 64-hex, sprint-status.yaml untouched`
  - **Status:** RED — before: ledger `open`; after: 2 entries `done 2026-09-01` + 64-hex hashes, `sprint-status.yaml` has no `dw-layout-band-dedup-and-guard`
  - **Verifies:** deferred-work ledger correct, orchestrator-owned file not written (R-008)

#### P2 Static scans / floor / clamp (4 tests)

- ✅ **Test:** `[P2-01] SCAN single helper allowlist — getBandTop 1 export + 3 uses`
  - **Status:** RED — before: no export; after: `layout.ts export function getBandTop` 1, `App 2 + Hud 3 =5 occurrences incl imports` / `Hud 2× height:` / `App 1× const bandTop`
  - **Verifies:** single-helper invariant (R-002)
- ✅ **Test:** `[P2-02] SCAN no duplicate formula — App/Hud band height not via + SAFE_MARGIN inline`
  - **Status:** RED — before: duplicates present; after: 0 each
  - **Verifies:** no `insets.top + SAFE_MARGIN + bandHeight` / `topPad + bandHeight` (R-002)
- ✅ **Test:** `[P2-03] SCAN early-guard invariant — Number.isFinite guard is first statement in layoutFor`
  - **Status:** RED — `Number.isFinite` 6 hits, guard before `isLandscape`/`availWidth`
  - **Verifies:** guard-order not regressed (R-003)
- ✅ **Test:** `[P2-04] BOARD_SIZE_FLOOR + floor-clamp + 0-clamp branch stays byte-identical`
  - **Status:** RED — `BOARD_SIZE_FLOOR 216`, typical landscape `≥216`, small `400×250 <216` positive finite, extreme `2000×200 board>band`
  - **Verifies:** `min-tile floor` legibility (UX-DR-18) + board dominates thin band (R-004/R-007)

#### P3 Exploratory / residual / hygiene (2 tests)

- ✅ **Test:** `[P3-01] exploratory — getBandTop non-finite residual is pure arithmetic NaN→NaN per spec`
  - **Status:** RED — `getBandTop({top:NaN},48)→NaN` and `Infinity→Infinity` (no throw, spec-allowed residual R-006)
  - **Verifies:** DW-5 residual doc — bandTop NaN propagation accepted while bandHeight stays finite
- ✅ **Test:** `[P3-02] hygiene — layout scope stays pure, no engine/feel/monetization leakage, O(1) <1 ms`
  - **Status:** RED — `layout.ts` has no `mulberry32/RevenueCat/AdMob/music`; `10k layoutFor <50 ms` O(1) smoke
  - **Verifies:** sweep stayed in scope + performance NFR unchanged

---

## Data Factories Created

Not applicable to this pure layout scenario (per `test-design-dw-layout-band-dedup-and-guard.md`):
- **No data factories / `@faker-js/faker`** — fixtures are deterministic `ZERO_INSETS`/`PORTRAIT_NOTCH`/`LANDSCAPE_NOTCH` + sizes `320/390/414/500/844/1024/2000` + band constants (already in `triade/src/ui/layout.test.ts`). `getBandTop` is pure arithmetic, not a factory.
- **No new fixture file** — reuse existing `layout.test.ts` fixtures plus the two notch constants.

---

## Fixtures Created

Not applicable — pure TS layout, no Playwright fixtures / browser automation:
- **No Playwright fixture / `test.extend`** — layout `isLandscape` + `tileNumerals` + host `node:test` harnesses are sufficient.
- **No external service mocking** — no I/O in `layoutFor`/`getBandTop` or the `isLandscape` delegation.

---

## Mock Requirements

None. No UI surface change that mocks `useWindowDimensions`/`useSafeAreaInsets` — those hooks always return finite values (per deferred-work DW-5 "Runtime inputs … are always finite"). Tests call `layoutFor` directly with synthetic insets; no RN provider needed.

---

## Required data-testid Attributes

None — layout is a pure function (`layoutFor`) + a pure helper (`getBandTop`). No component is mounted in these host unit tests; `Hud.tsx` band `height` wiring is verified via source-level `rg` scans (`getBandTop` 2-site pin) and existing `layout.test.ts` chrome pins. If a future visual regression lane is added, `data-testid="hud-band"` could be added to `Hud.tsx:landscapeBand`/`portraitBand`, but not required for this sweep.

---

## Implementation Checklist

Maps directly to the working-tree diff already in place (`80dc5c1` → `a09e6ed`). Each scaffold's GREEN task is the code change that makes it pass — for this completed sweep the tasks are **already done** (working tree implements them; activated ATDD now GREEN). Keep checklist as the red→green roadmap for any re-hardening.

### Test: [P0-01] 6-field Number.isFinite guard

**File:** `triade/src/ui/layout.ts:37-47`

**Tasks to make this test pass (DONE in working tree):**
- [x] Add early guard `if(!Number.isFinite(width)||!Number.isFinite(height)||!Number.isFinite(insets.top)||!Number.isFinite(insets.bottom)||!Number.isFinite(insets.left)||!Number.isFinite(insets.right)) return {boardSize:0, bandHeight:PORTRAIT_BAND_HEIGHT, isLandscape:false}`
- [x] Place guard as first statement inside `layoutFor`, before `isLandscape`/`availWidth`
- [x] Run test: `npm --prefix triade test -- __tests__/ui/layout.band-dedup-guard.atdd.test.ts` → `it.skip` → `it` → 20 pass
- [x] ✅ Test passes (green phase — 20/20 when activated)

**Estimated Effort:** 0.2h

---

### Test: [P0-02] -Infinity / per-edge Infinity guard

**File:** `triade/src/ui/layout.ts:37-47`

**Tasks:**
- [x] Same guard covers `-Infinity` (non-finite) per spec I-O row
- [x] ✅ Test passes

**Estimated Effort:** 0.05h

---

### Test: [P0-03/04/05] finite byte-identical portrait/landscape + golden anchors

**File:** `triade/src/ui/layout.ts:48-61`

**Tasks:**
- [x] Keep `const landscape=isLandscape(width,height); bandHeight=landscape?LANDSCAPE:PORTRAIT; availWidth=width-left-right-2*SAFE_MARGIN; availHeight=height-top-bottom-2*SAFE_MARGIN-bandHeight; availBoard=max(0,min(...))` unchanged
- [x] Verify `layout.test.ts:18` (18 pass) + golden `382/688/452` unchanged post-guard
- [x] ✅ Tests pass

**Estimated Effort:** 0.2h

---

### Test: [P0-06] degenerate-clamp `top:2000` (layout.test.ts:232)

**File:** `triade/src/ui/layout.ts:52-60` clamp branch

**Tasks:**
- [x] Keep `availBoard < BOARD_SIZE_FLOOR ? availBoard : max(availBoard,FLOOR)` and `Math.max(0, min(availWidth,availHeight))` unchanged
- [x] Verify `layout.test.ts:232` `boardSize:0` stays green (degenerate path distinct from guard)
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Test: [P0-07/08] getBandTop dedup + pure arithmetic

**File:** `triade/src/ui/layout.ts:33-35` (`export function getBandTop`)

**Tasks:**
- [x] Add `export function getBandTop(insets:EdgeInsets, bandHeight:number){return insets.top+SAFE_MARGIN+bandHeight;}`
- [x] `triade/App.tsx:31` change `import {SAFE_MARGIN,layoutFor}` → `import {layoutFor,getBandTop}` and `App.tsx:101` `const bandTop=getBandTop(insets,bandHeight)` (was `insets.top+SAFE_MARGIN+bandHeight`)
- [x] `triade/src/ui/Hud.tsx:3` change `import {SAFE_MARGIN}` → `import {SAFE_MARGIN,getBandTop}` and `Hud.tsx:67,113` `height:getBandTop(insets,bandHeight)` (was `topPad+bandHeight`) — keep `topPad/leftPad/rightPad/bottomPad` for `padding*`
- [x] Verify `rg -n "getBandTop" triade/App.tsx triade/src/ui/Hud.tsx` 5 occurrences and `rg -n "SAFE_MARGIN" triade/App.tsx` (non-import) 0
- [x] ✅ Tests pass

**Estimated Effort:** 0.4h

---

### Tests: [P1-01..05] band pins / isLandscape / asymmetry / finiteness sweep

**File:** `triade/src/ui/layout.ts` constants + delegation

**Tasks:**
- [x] Keep `SAFE_MARGIN=16`, `PORTRAIT 96`, `LANDSCAPE 48`, `BOARD_SIZE_FLOOR 216` pinned
- [x] Keep `isLandscape(width,height)` delegation exactly once in `layout.ts`
- [x] Verify `layout.test.ts` band pins + asymmetry + finiteness sweep stay green (18 pass)
- [x] ✅ Tests pass

**Estimated Effort:** 0.3h

---

### Test: [P1-06] ledger DW-5/DW-10 done + sprint-status untouched

**File:** `_bmad-output/implementation-artifacts/deferred-work.md` + `sprint-status.yaml`

**Tasks:**
- [x] Flip DW-5 (`NaN propagate`) + DW-10 (`band duplication`) `open` → `done 2026-09-01` + `resolution: resolved by sweep bundle dw-layout-band-dedup-and-guard` + `resolution-undo: 6f4ef234… 73746…` 64-hex each
- [x] Never write `sprint-status.yaml` (orchestrator-owned — verify `git diff --stat` has no `sprint-status.yaml`)
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P2-01..03] single-helper / no-duplicate / early-guard scans

**File:** `triade/src/ui/layout.ts` + `triade/App.tsx` + `triade/src/ui/Hud.tsx` grep allowlists

**Tasks:**
- [x] `rg -n "export function getBandTop" triade/src/ui/layout.ts` ==1
- [x] `rg -n "insets\.top \+ SAFE_MARGIN \+ bandHeight" triade/App.tsx triade/src/ui/Hud.tsx` ==0
- [x] `rg -n "topPad \+ bandHeight" triade/src/ui/Hud.tsx` ==0
- [x] `rg -n "Number.isFinite" triade/src/ui/layout.ts` ==6 (guard first statement)
- [x] ✅ All scans pass

**Estimated Effort:** 0.2h

---

### Test: [P2-04] floor-clamp / 0-clamp byte-identical

**File:** `triade/src/ui/layout.ts:59`

**Tasks:**
- [x] Keep `boardSize = availBoard < BOARD_SIZE_FLOOR ? availBoard : max(availBoard,FLOOR)` byte-identical
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P3-01..02] non-finite residual + hygiene bench

**File:** `triade/src/ui/layout.ts:33` helper residual + layout src scope

**Tasks:**
- [x] Document `getBandTop` pure `+` residual: `NaN→NaN / Infinity→Infinity` while `layoutFor` guard keeps `bandHeight` finite (spec `Never: add broad sanitization beyond Number.isFinite guard on layoutFor`)
- [x] Keep helpers `<1 ms` per layout calc (O(1) `<0.01 ms` smoke)
- [x] ✅ Bench passes

**Estimated Effort:** 0.1h

---

## Running Tests

```bash
# Run all activated tests for this story (dormant by default — RED scaffolds)
# 1) Activate one scaffold at a time for the current task, then confirm RED→GREEN:
#    edit triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts: change it.skip → it for that test

# Run the single ATDD file (skipped = 20, dormant)
npm --prefix triade test -- __tests__/ui/layout.band-dedup-guard.atdd.test.ts

# Run the single ATDD file activated (with working-tree delta — expect 20 pass)
# (temporarily: sed 's/it\.skip/it/g' then run, as verified in evidence)
cp triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts /tmp/active.test.ts && sed -i '' 's/it\.skip/it/g' /tmp/active.test.ts 2>&1 || sed -i 's/it\.skip/it/g' /tmp/active.test.ts; cp /tmp/active.test.ts triade/__tests__/ui/layout.band-dedup-guard.active.test.ts && npm --prefix triade test -- __tests__/ui/layout.band-dedup-guard.active.test.ts && rm triade/__tests__/ui/layout.band-dedup-guard.active.test.ts
# → with it.skip→it: 20 pass / 0 fail (delta already GREEN at a09e6ed)

# Run the existing layout regression suite (must stay 18 pass)
npm --prefix triade test -- __tests__/ui/layout.test.ts

# Full host gate (<15 min)
npm --prefix triade test

# Typecheck both TsConfigs
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 20 tests written as red-phase scaffolds with `it.skip` (TDD red phase — `node:test` skip is the `test.skip()` analogue)
- ✅ No fixtures/factories needed beyond existing `layout.test.ts` harnesses (`ZERO_INSETS`/`PORTRAIT_NOTCH`/`LANDSCAPE_NOTCH`/`SAFE_MARGIN`)
- ✅ Mock requirements documented (none)
- ✅ data-testid requirements listed (none — pure `layoutFor` + `getBandTop`)
- ✅ Implementation checklist created (8 P0 + 6 P1 + 4 P2 + 2 P3 tasks)

**Verification:**

- All 20 generated tests are present and marked with `it.skip` (see `npm --prefix triade test -- __tests__/ui/layout.band-dedup-guard.atdd.test.ts` output: `tests 20 / skipped 20`)
- Activation guidance is clear (one `it.skip → it` at a time per task)
- Activated tests fail due to missing implementation before `a09e6ed` — now PASS because working-tree delta implements them (evidence: de-skipped run 20 pass / 0 fail)
- This is INTENTIONAL (TDD red phase); implementation already covers the working-tree delta

---

### GREEN Phase (DEV Team — Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with highest priority P0-01)
2. **Remove `it.skip` → `it`** for that test and confirm it fails first (before `a09e6ed` it would be `boardSize:NaN` / duplicated formula)
3. **Read the test** to understand expected behaviour (guard 6-field / helper pure `+`)
4. **Implement minimal code** to make that specific test pass (see Checklist task for file:line)
5. **Run the test** `npm --prefix triade test -- __tests__/ui/layout.band-dedup-guard.atdd.test.ts` to verify green
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat

**For this completed sweep:** every GREEN task is already DONE in the working tree (see `git diff 80dc5c1..a09e6ed -- triade/src/ui/layout.ts triade/App.tsx triade/src/ui/Hud.tsx`); activating all 20 at once now yields `20 pass`. Keep the one-at-a-time rule for any future re-hardening.

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer — `getBandTop` is exactly 3 lines)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap

**Progress Tracking:**

- Check off tasks as you complete them
- Share progress in daily standup

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete — 20/20 activated)
2. **Review code for quality** (readability — early guard, single helper, `SAFE_MARGIN` constant)
3. **Extract duplications** (already done — single `getBandTop` vs two inline formulas)
4. **Optimize performance** (already O(1) single `+`, `<0.01 ms` per `layoutFor`)
5. **Ensure tests still pass** after each refactor (`npm --prefix triade test` stays 18/18 `layout.test.ts` + 20/20 activated ATDD)
6. **Update documentation** (if contract changes — `spec-layout-band-dedup-and-guard.md` Design Notes already cover fallback `96/false`)

**Key Principles:**

- Tests provide safety net (refactor with confidence — guard finiteness catches regressions)
- Make small refactors (easier to debug if tests fail — 6-field `Number.isFinite` pinpoints missing edge)
- Run tests after each change
- Don't change test behaviour (only implementation)

**Completion:**

- All tests pass (20/20 activated, plus existing suite 18/18 `layout.test.ts`)
- Code quality meets team standards (single helper, single constant, early guard)
- No duplications or code smells (no duplicated `insets.top + SAFE_MARGIN + bandHeight`)
- Ready for code review and story approval

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md`)
2. **If the story file cannot be updated automatically**, share this checklist and `triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts` with the dev workflow as a manual handoff
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001..R-003 mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this sweep, implementation already in working tree (de-skipped run proves GREEN)
5. **Activate one scaffold at a time** by removing `it.skip` for the current task, then confirm it fails before implementing (before `a09e6ed`, P0-01 would be `boardSize:NaN`; now `0`)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single helper already done)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-01`) — do not touch `sprint-status.yaml`

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (via `test-design-dw-layout-band-dedup-and-guard.md` + `tea-index.csv`):

- **fixture-architecture.md** — Not needed for pure `node:test` layout host — reuse `layout.test.ts` fixtures
- **data-factories.md** — Not needed — deterministic `ZERO_INSETS`/`PORTRAIT_NOTCH` fixtures suffice (no `@faker-js/faker`)
- **component-tdd.md** — Host unit TDD contract (red-phase `it.skip` scaffolds, one behavioural pin per suite)
- **network-first.md** — Not applicable (no network — pure `layoutFor` arithmetic)
- **test-quality.md** — Given-When-Then per test, one pin per `it`, determinism via fixed sizes, isolation via `ZERO_INSETS`
- **test-levels-framework.md** — Level selection: Unit (layout) vs Static scans (grep allowlists) vs Integration (ledger + `tsc`)
- **test-healing-patterns.md** — Guard `boardSize:0` finite pin is the healing hook (CI points to guard vs clamp)
- **selector-resilience.md / timing-debugging.md** — Not applied (no DOM selectors / no `waitFor`)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN Skia project)

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-layout-band-dedup-and-guard.md` Section "Risk Assessment" for the 9 risks (3 high) and NFR planning that informed P0/P1/P2/P3 levels.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification (dormant, expected skip)

**Command:** `npm --prefix triade test -- __tests__/ui/layout.band-dedup-guard.atdd.test.ts`

**Results:**
```
▶ ATDD dw-layout-band-dedup-and-guard — P0 critical (spec AC)
  ﹣ [P0-01] AC NaN/Infinity guard — 6-field Number.isFinite degrades to boardSize:0 finite (DW-5) (0.41ms) # SKIP
  ﹣ [P0-02] AC guard also covers -Infinity and each inset edge Infinity (width/height/top/bottom/left/right) (0.04ms) # SKIP
  ﹣ [P0-03] AC finite portrait 390×844 byte-identical — width-bounded maximized square + band 96 (0.03ms) # SKIP
  ﹣ [P0-04] AC finite landscape 844×390 byte-identical — height-bounded below thin band 48 (0.03ms) # SKIP
  ﹣ [P0-05] AC finite golden anchors byte-identical — 414×896→382 / 1024×768→688 / 500×580→452 (0.03ms) # SKIP
  ﹣ [P0-06] AC degenerate-clamp layout.test.ts:232 — insets exceed container clamps to 0 and stays finite (0.03ms) # SKIP
  ﹣ [P0-07] AC getBandTop dedup — App.tsx bandTop + Hud.tsx 2× height use single helper, no duplicated formula (0.03ms) # SKIP
  ﹣ [P0-08] AC getBandTop pure arithmetic — insets.top + SAFE_MARGIN + bandHeight byte-identical (0.02ms) # SKIP
✔ ATDD dw-layout-band-dedup-and-guard — P0 critical (spec AC) (1.14ms)
▶ ATDD dw-layout-band-dedup-and-guard — P1 wiring (band/isLandscape/ledger)
  ﹣ [P1-01] band pins — PORTRAIT 96 / LANDSCAPE 48 and landscape collapses (96>48) (0.07ms) # SKIP
  ﹣ [P1-02] isLandscape single-source — layoutFor.isLandscape agrees with orientation.ts width>height (0.05ms) # SKIP
  ﹣ [P1-03] per-edge insets bind asymmetrically — horizontal shrinks width-bounded, vertical shrinks height-bounded (0.03ms) # SKIP
  ﹣ [P1-04] SAFE_MARGIN single-constant and getBandTop single-export invariant (0.02ms) # SKIP
  ﹣ [P1-05] finiteness sweep — all layoutFor outputs finite across sizes and many insets (0.02ms) # SKIP
  ﹣ [P1-06] ledger DW-5/DW-10 done with resolution-undo 64-hex, sprint-status.yaml untouched (0.02ms) # SKIP
✔ ATDD dw-layout-band-dedup-and-guard — P1 wiring (band/isLandscape/ledger) (0.31ms)
▶ ATDD dw-layout-band-dedup-and-guard — P2 static scans / floor / clamp
  ﹣ [P2-01] SCAN single helper allowlist — getBandTop 1 export + 3 uses (0.05ms) # SKIP
  ﹣ [P2-02] SCAN no duplicate formula — App/Hud band height not via + SAFE_MARGIN inline (0.02ms) # SKIP
  ﹣ [P2-03] SCAN early-guard invariant — Number.isFinite guard is first statement in layoutFor (0.02ms) # SKIP
  ﹣ [P2-04] BOARD_SIZE_FLOOR + floor-clamp + 0-clamp branch stays byte-identical (0.02ms) # SKIP
✔ ATDD dw-layout-band-dedup-and-guard — P2 static scans / floor / clamp (0.14ms)
▶ ATDD dw-layout-band-dedup-and-guard — P3 exploratory / residual / hygiene
  ﹣ [P3-01] exploratory — getBandTop non-finite residual is pure arithmetic NaN→NaN per spec (0.03ms) # SKIP
  ﹣ [P3-02] hygiene — layout scope stays pure, no engine/feel/monetization leakage, O(1) <1 ms (0.01ms) # SKIP
✔ ATDD dw-layout-band-dedup-and-guard — P3 exploratory / residual / hygiene (0.08ms)
ℹ tests 20
ℹ suites 4
ℹ pass 0
ℹ fail 0
ℹ cancelled 0
ℹ skipped 20
ℹ todo 0
ℹ duration_ms 175

Summary:
- Total tests: 20
- Skipped: 20 (expected before activation — RED scaffolds dormant)
- Passing: 0 before activation (expected, scaffolds skipped)
- Status: ✅ Red-phase scaffolds verified (all present, all `it.skip`, correct harness `node:test` + `tsx`)
```

### Activated Run / GREEN Verification (working-tree delta covers delta)

**Command:** `cp triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts /tmp/active.test.ts && sed -i '' 's/it\.skip/it/g' /tmp/active.test.ts 2>&1 || sed -i 's/it\.skip/it/g' /tmp/active.test.ts; cp /tmp/active.test.ts triade/__tests__/ui/layout.band-dedup-guard.active.test.ts && npm --prefix triade test -- __tests__/ui/layout.band-dedup-guard.active.test.ts && rm triade/__tests__/ui/layout.band-dedup-guard.active.test.ts`

**Results:**
```
ℹ tests 20
ℹ suites 4
ℹ pass 20
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 148

- P0 8/8 pass (guard 6-way + finite byte-identical + golden anchors + degenerate clamp + getBandTop dedup)
- P1 6/6 pass (band 96/48 + isLandscape single-source + asymmetry + single constant + finiteness sweep + ledger)
- P2 4/4 pass (single helper allowlist + no duplicate formula + early guard + floor/clamp)
- P3 2/2 pass (non-finite residual NaN→NaN + O(1) bench <50 ms)
Status: ✅ All ATDD scaffolds GREEN when activated — working-tree diff implements the contract.
Expected failure before sweep would be: boardSize: NaN on NaN inputs, topPad+bandHeight still present in Hud, no getBandTop export — now all fixed at a09e6ed.
```

### Existing Suite Regression (layout)

**Command:** `npm --prefix triade test -- __tests__/ui/layout.test.ts` → `18 pass / 0 fail`

**Command:** `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` → clean

**Command:** `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` → clean

**Expected Failure Messages (per test, when NOT hardened):**
- P0-01: Expected `boardSize 0` but got `NaN` (`width:NaN` poisoned `availWidth` before guard)
- P0-07: Expected 0 `insets.top + SAFE_MARGIN + bandHeight` in App/Hud but got 1+ hits (duplicated formula still present)
- P0-08: Expected `getBandTop` `159` but helper missing (`not a function`)

---

## Notes

- **Working-tree already implements the delta.** These ATDD scaffolds were written RED and are now GREEN when activated — that inversion is correct for a sweep bundle whose working-tree diff is the implementation (`git diff 80dc5c1..a09e6ed` shows only `layout.ts`+`App.tsx`+`Hud.tsx`+spec+ledger). Keep them `it.skip` in the repo so the dev workflow activates one at a time per task.
- **No `sprint-status.yaml` write.** This workflow never writes `_bmad-output/implementation-artifacts/sprint-status.yaml` (orchestrator-owned per prompt). Ledger `deferred-work.md` DW flips are the only status change, each with `resolution-undo` 64-hex.
- **Engine `src/engine` byte-identical.** `git diff --stat -- triade/src/engine` empty — engine invariants pinned by 857 pass / 10 EXPECTED RED (`felt-atdd`) existing tests, not re-derived here.
- **Band-height fallback is portrait 96 / false (finite).** Spec says "choice of fallback bandHeight/isLandscape for non-finite inputs is not observable in production (inputs always finite) but must be finite and consistent" — the landed literal `96/false` satisfies finiteness; callers must not branch on `boardSize:0` alone.
- **Helper residual is acknowledged.** `getBandTop({top:NaN},48) → NaN` (pure `+`) has zero current blast radius (production `useSafeAreaInsets` always finite); spec forbids broad sanitization beyond `layoutFor` guard — helper stays pure arithmetic; R-006 residual.
- **Follow-on:** run `*automate` once broader coverage needed; run `*nfr-assess` after implementation evidence to validate NFR planning without inventing thresholds.

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @TEA / Murat in Slack/Discord
- Refer to `./bmm/docs/tea-README.md` for workflow documentation
- Consult `./resources/knowledge` for testing best practices

---

**Generated by BMad TEA Agent** - 2026-09-02 (story `dw-layout-band-dedup-and-guard`, baseline `80dc5c1c6a02f56dc1f3335100c64d9d266314b7` → `a09e6ed23b968201717a4848cb1cff148172ac4e`, engine byte-identical)
