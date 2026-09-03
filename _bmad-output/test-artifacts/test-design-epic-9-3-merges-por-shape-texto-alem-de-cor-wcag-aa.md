---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-03'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md'
  - '_bmad-output/implementation-artifacts/epic-9-context.md'
  - 'triade/src/ui/tileNumerals.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/__tests__/ui/tileShape.test.ts'
  - 'triade/__tests__/ui/tileContrast.audit.test.ts'
  - 'triade/__tests__/ui/tileNumerals.test.ts'
  - 'triade/src/a11y/announcements.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 9 / Story 9-3 — Merges por shape/texto além de cor + WCAG AA (dark canonical)

**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `9-3-merges-por-shape-texto-alem-de-cor-wcag-aa`
**Scope:** Targeted test design for the working-tree delta of story 9-3 (dark canonical only; light + color-blind deferred to 9-4)

> **Delta under assessment:** Commit `009fc5e` (`story 9-3: 13-tier palette + facet grain + WCAG AA dark audit`) on `main` (HEAD, ahead of `origin/main` by 10). `git diff HEAD --stat` shows only `_bmad-output/implementation-artifacts/sprint-status.yaml` uncommitted (`9-3 backlog → done`); the production delta is already committed. Assessed production change vs baseline `9448b3f` (`git diff 9448b3f..009fc5e --stat` = 6 files, 491 ins):
> - `triade/src/ui/tileNumerals.ts:49` — centralised `TILE_HEXES` (13 tiers `1:#EFE3C2 … 3072:#FFF3DC`), `TILE_INK` per-tier (`#1C1206` dark on 1,2,3,6,12,192,1536,3072+ / `#F6F0E1` light on 24,48,96,384,768), `tileFillFor`/`tileInkFor`/`tileShapeFor` (grain 0/1/2 + glow incandescent) with interval capping `6144/12288 → 3072+`, plus pure WCAG `hexToRgb`/`relativeLuminance`/`contrastRatio` (no RN imports, `Object.freeze`).
> - `triade/src/render/GameBoard.tsx:71` — `cellColor(value)` now delegates to `tileFillFor` (13-tier), `tileTextColor` to `tileInkFor` per-tier, `AnimatedTile:200` reads `tileShapeFor(value)` and renders facet grain beyond color as two `RoundedRect style="stroke"` overlays (`grain 1`: `strokeWidth bevel 1.6/1.2`, `opacity 0.14/0.22` on inset `3/6`; `grain 2`: second inner inset `6` `opacity 0.12`), glow `#ff8c2f 0.28` retained for `1536+` only; `CELL_RADIUS 10` unchanged; `@ts-ignore` on Skia `style`.
> - `triade/__tests__/ui/tileShape.test.ts:1` (NEW, 6 tests) — 13-tier hex exact, ink per-tier, cap, `192 vs 1536` grain/glow differs, monotonic grain `low(0) ≤ mid(1) ≤ emerald(2)`, `1 vs 2` distinct.
> - `triade/__tests__/ui/tileContrast.audit.test.ts:1` (NEW, 3 tests) — every tier `contrast(tileFill, ink) ≥4.5:1` (weakest `384 #157A5C` on `#F6F0E1` = 4.65 pinned ≥4.5, `384` deep emerald ~4.7 design), chrome `text #F2EEE3 / muted #A39C8F / accent #E8A33D` on `board #1A1D23 / surface #23262D / raised #2B2F38` all ≥4.5 and `dark ink on accent ≥7 (design ~8.6)`, plus large-text 3:1 smoke.
> - `triade/__tests__/ui/tileNumerals.test.ts:26` — ink expectations realigned to DESIGN (`#1C1206`/`#F6F0E1`, 192 dark, 1536 dark).
> - No engine edits (`src/engine` zero files), no new native assets, `matchFont` numeral tokens `32/13/9` untouched, translations fixed-size.

---

## Executive Summary

**Scope:** Story 9-3 pins the canonical 13-tier tile identity as pure data and makes value readable beyond hue. Two contracts ship together: (1) **shape/text beyond color** — tier-band `facet/grain` (low `1-12` clean `grain 0 bevel 1`, mid `24-96` bronze/iron `grain 1 bevel 1.2`, emerald/obsidian `192-768` `grain 2 bevel 1.6`, incandescent `1536+` `grain 0 + glow`) so a color-blind player distinguishes e.g. `192 #28A074` vs `1536 #FFD9A0` by grain/glow not lightness; Skia stays pure — shape is declarative props on `AnimatedTile`, not imperative particles; (2) **WCAG AA dark canonical** — every tile numeral (even `13pt/9pt` at 4–6+ digits, `MIN_TILE_WIDTH 44`) holds `contrast(tileFill, ink) ≥4.5:1` (weakest `384` holds ~4.65), and chrome holds `body ≈13.1/5.6` and `accent ≈7.0` with `dark-on-accent ≈8.6` — all computed via WCAG relative luminance. Validation is explicitly scoped to **dark**; light + color-blind hexes ship in 9.4.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (score ≥6): 2
- Critical categories: **TECH/BUS — compliance (WCAG AA at weakest 384)** and **TECH/BUS — accessibility beyond color (grain not rendered / numeral obscured)**. Both are mitigated by the new audits but remain regressible by palette or Skia changes.

**Coverage Summary:**

- P0 scenarios: 8 groups (13-tier hex+ink+cap+weakest pin, chrome pins, 192 vs 1536 shape, inscription legibility, render purity — ~2–3 hours host-only)
- P1 scenarios: 7 groups (monotonic bands, 1 vs 2 distinct, contrast helper purity, cap invariants, Skia prop contract, announcement text, chrome surface drift — ~3–5 hours)
- P2/P3 scenarios: 6 groups (grain visual additive check, high-value beyond ceiling, 3-digit hex resilience, glow scope, Reduced Motion orthogonality, exploratory device — ~2–5 hours)
- **Total effort**: ~7–13 hours (~1–1.5 days wall-clock; host-only ~0.5 day, device ~0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Light + color-blind palettes and their WCAG audits** | Spec boundary: 9-3 validates **dark canonical only**; light flip and color-blind ramps are 9.4. | 9.4 test design owns those hexes and their contrast audits; this plan asserts dark-only scope and pins `TILE_HEXES` dark values. |
| **Tap targets ≥44pt (9-1), screen-reader contract (9-2), tone/onboarding, leaderboard tabs** | Orthogonal a11y slices already shipped; no `HIT_TARGET` or `accessibilityLabel` edits in this delta (`git show 009fc5e --stat` confirms 0 `src/a11y` production edits). | Epic 9.1/9.2 suites remain gates; this plan asserts "no chrome hit-area change" regression gate. |
| **Engine merge/spawn/score, `pendingSpawn`/`previewFor`, pot ladder, RNG** | ADR-01 purity: engine byte-identical to baseline (0 engine files in delta). UI never duplicates merge rules. | Engine suite (~973 pass per Auto Run Result) remains the gate; this plan adds a CI purity check `git diff --stat -- triade/src/engine` empty. |
| **Reduced Motion new behavior, haptics/punch/shake/bullet time, SFX, monetisation (IAP/Ads)** | `Reduced Motion` untouched in 9-3 (spec Always); feel/audio/IAP code not in delta; grain is declarative not imperative spring/particle. | Epic 8 suites remain gates; this plan checks Reduced Motion orthogonality via existing 8.5 spec only. |
| **CDN assets, native font asset, `matchFont` fallback bundling** | Spec Never: no CDN, no new font asset decision in 9-3; numerals stay `matchFont` with `32/13/9` tokens. | `npx tsc --noEmit` + `tileNumerals.test.ts` token pins cover it. |
| **Visual pixel-perfect golden screenshots (Figma diff, Playwright visual baseline)** | 9-3 is a metric gate (contrast ratio + declarative shape props), not a screenshot gate; Skia grain is verified by props + audit, device spot-check is P2 not a golden. | Manual board render with 13 tiers on dark surface (verify 1 vs 2 distinct, 192 vs 1536 grain differ, 384 legible, 9pt six-digit centered) — no Playwright baseline required. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| **R-001** | **TECH / BUS (compliance)** | **Weakest tile 384 deep emerald `#157A5C` on `#F6F0E1` regresses below 4.5:1 on a future palette tweak or typed hex drift.** DESIGN notes 384 at ~4.7:1 is the weakest dark-canonical pair (verified 4.65 in this run); any hex rounding, ink swap (`#F6F0E1` → `#FFF8E8`), or new tier insertion without re-auditing silently breaks WCAG AA for 13pt/9pt numerals (6+ digits). Failure is not user-visible until a11y audit. | 2 | 3 | **6** | Keep `tileContrast.audit.test.ts` P0 pin `contrast(TILE_HEXES[384], TILE_INK[384]) ≥4.5` plus exhaustive `for v in tiers` loop as hard gate in PR. Add `python` or `node` one-liner in CI that prints every tier ratio to build log so reviewer sees `384 4.65` trend. Document `TILE_HEXES`/`TILE_INK` as frozen DESIGN table with "change hex → must re-run contrast audit" comment. | FE / QA | This story (audit already landed, keep as P0 gate) |
| **R-002** | **TECH / BUS (a11y beyond color)** | **Facet grain beyond color not actually rendered for color-blind players, or grain obscures numeral center.** `AnimatedTile` uses two `RoundedRect style="stroke"` with `@ts-ignore`, `color="#000000"` + low `opacity 0.14/0.22/0.12`, inset `3/6` inside `CELL_RADIUS 10`. Risk: Skia version bump deprecates `style="stroke"` or `strokeWidth`, transparent color regression (previous review patch `transparent` → `#000000` fix), or future density pass removes grain branch, leaving hue-only differentiation. Also grain near center could clip 9pt numerals at `MIN_TILE_WIDTH 44`. Grain is the only non-hue signal for `192 vs 1536` (both dark/light but different saturation) — if invisible, FR-31 fails while tests that only assert data `tileShapeFor` still green. | 2 | 3 | **6** | Two-layer gate: (1) data contract `tileShape.test.ts` P0 `192 grain 2 vs 1536 grain 0+glow` and monotonic `low≤mid≤emerald`; (2) Skia prop contract test or static grep that production `GameBoard.tsx` contains `tileShapeFor`, `RoundedRect … style="stroke"`, `strokeWidth={shape.bevel}`, and inner `RoundedRect … opacity 0.12` branch — so deletion fails. Keep review triage note that grain must be additive overlay never replacing fill/ink and never covering numeral center; manual device spot-check (P2) renders board with `192` and `1536` adjacent and confirms grain visible without numeral clipping at 44pt. | FE | This story (data audit done) + add Skia prop grep before 9.4 |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH / BUS | **Cap/interval mapping off-by-one for non-canonical values (0, 5, 7, 100, 6144, 12288, NaN, Infinity).** `tileFillFor`/`tileInkFor`/`tileShapeFor` use interval cascade (`>1536`, `>768` …). A regression swapping `>` vs `>=` or ordering tiers misroutes 5 → `#EFE3C2` vs `#E08532`, or 6144 maps to `#FFD9A0` not `#FFF3DC`. High score `12288` beyond `3072+` must cap to incandescent; `NaN/Infinity` must not throw. Current `tileShape.test.ts` only pins `6144/12288`, not intermediates. | 2 | 2 | **4** | Extend `tileShape.test.ts` P0 with interval sweep: e.g. `tileFillFor(5) === TILE_HEXES[3]`, `tileFillFor(100) === TILE_HEXES[96]`, `tileFillFor(NaN)` fallback, `tileFillFor(Infinity)` cap. Keep `tileInkFor` parallel sweep. Add property: `tileFillFor(v) ∈ TILE_HEXES` values and `tileInkFor(v) ∈ {DARK,LIGHT}` for random sample. | FE |
| R-004 | TECH | **`contrastRatio` helper math drift gives false PASS.** `hexToRgb` handles `3` vs `6` hex, `srgbToLinear` coefficient `0.04045/2.4`, luminance weights `0.2126/0.7152/0.0722`, and `(L1+0.05)/(L2+0.05)` ratio must match WCAG 2.1. A typo (e.g. `0.7152` → `0.715`) shifts weakest `384` from 4.65 to >4.5 incorrectly. `null` return for bad hex path (`relativeLuminance` returns 0) could inflate ratio. No golden reference in audit. | 2 | 2 | **4** | Pin `contrastRatio` against known WCAG examples in a P1 unit test: `contrastRatio('#FFFFFF','#000000') ≈21:1`, `'#767676' on '#FFFFFF' ≈4.54`, `'#157A5C' on '#F6F0E1' ≈4.65` (computed this run 4.65). Add `#000`/`#FFF` 3-digit path and invalid hex returns fallback not NaN. Cross-check with one `npm` contrast package in CI (optional). | FE / QA |
| R-005 | TECH / BUS | **Chrome contrast audit becomes stale as surface tokens drift.** `tileContrast.audit.test.ts` hard-codes `SURFACE #23262D / BOARD #1A1D23 / RAISED #2B2F38 / TEXT #F2EEE3 / MUTED #A39C8F / ACCENT #E8A33D` but production surfaces live in `src/theme` tokens. A theme tweak to `surface` lightness without updating audit silently lowers `muted on surface` below 4.5 while audit still greens on old constants. | 2 | 2 | **4** | Make audit import chrome tokens from `src/theme` (if exported) rather than hard-coding, or add a doc test that asserts `src/theme` tokens equal the audit constants. Keep `accent on surface ≥6.5` and `dark-on-accent ≥7` high pins so drift is caught early. Log chrome ratios to build output. | FE |
| R-006 | TECH / BUS | **Glow-only incandescent not visible at rest, so `1536/3072` at rest look like `1-12` clean tier.** `GameBoard.tsx:120` computes `hasGlow = isPunch && value >=1536` — glow only on merge punch, not on resting board. Resting `1536 grain 0 bevel 1` is shape-identical to `1 grain 0` except for fill hex; without glow, shape beyond color relies on hue alone for the resting board (the common board state). Color-blind player at rest cannot distinguish high vs low except via fill. | 2 | 2 | **4** | Decision: either (A) make low-cost resting glow always on for `1536+` (spec says "1536+ retains existing glow, never added elsewhere" — ambiguous if rest vs punch), or (B) give `1536/3072` a distinct static grain (e.g. `grain 1`) so `1536` differs from `1` even at rest. Until decided, document as known incandescent-rest gap and add a P2 test that asserts `tileShapeFor(1536).glow === true` (data) and a manual P2 device check that resting `1536` is distinguishable from `1` without hue (e.g. ask color-blind tester). | FE / UX | Before 9-4 |
| R-007 | TECH | **Skia `RoundedRect style="stroke"` brittleness across SDK 57 / Skia 2.6.2 bump.** The `@ts-ignore` + `style="stroke"` pattern is idiomatic but not typed; a Skia minor that renames to `isStroke` or changes `strokeWidth` semantics would silently drop grain. No runtime warning. Next bump is likely in 9.4 theme work. | 2 | 2 | **4** | Add `npx tsc --noEmit` gate (already required, 0 errors today) plus a static grep gate `grep -q 'style=\"stroke\"' triade/src/render/GameBoard.tsx` in CI. Keep `@ts-ignore` narrowly scoped to the two `RoundedRect` grain lines (not file-wide). Consider snapshot of `GameBoard.tsx` grain lines in `gameBoard.test.ts` render prop contract. | FE |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | PERF / BUS | **Numeral legibility regression at `9pt`/`13pt` on `MIN_TILE_WIDTH 44` clipping `≥6` digits (`1,536`+ not yet, but `6144` etc.)** `tileNumerals.ts` keeps `MIN_TILE_WIDTH 44` and `numeralSizeFor` scaling, but 6+ digit `12288` at 44pt with `FIT_INSET_FACTOR 0.5` may clip despite 9pt floor. Spec says translations stay fixed-size numerals, so long numbers rely on board cell width derivation, not dynamic shrinking. | 1 | 2 | 2 | Monitor — `tileNumerals.test.ts` already pins `numeralSizeFor(1536/3072 at 44) ≥9` and `numeralFits`; add P2 case `numeralSizeFor(12288,44) ≥9` and manual check "six-digit 6144+ centered without truncation at MIN_TILE_WIDTH~44pt" per spec Manual checks section. |
| R-009 | TECH | **Engine purity regression: `GameBoard.tsx` reintroduces bucket logic (`value <=12 ? …`) instead of delegating to `tileNumerals`.** The old `tileInkFor` was binary `(<=12 ? dark : light)`; new is per-tier. A merge conflict could restore the old branch negating 192/384/768 fixes. | 1 | 2 | 2 | Monitor — CI purity grep: `grep -E 'value\s*<=\s*12'` must be absent from `GameBoard.tsx` and `tileInkFor` must delegate to `TILE_INK`. Existing `tileInkFor` tests would catch but add static guard. |
| R-010 | OPS / BUS | **Light/color-blind deferral misread as full WCAG AA PASS at release notes.** PM or QA sign-off may claim "WCAG AA 4.5:1 all tiers" without qualifying "dark canonical only". | 1 | 2 | 2 | Document — spec Residual risks already states deferred; this test design carries the "dark canonical only; 9.4 defines and audits light/color-blind" box to every risk and gate checklist. Gate requires 9.4 before claiming theme-wide WCAG. |

### Risk Category Legend

- **TECH**: Technical/Architecture (contracts, Skia, purity, math)
- **SEC**: Security — none this story (no auth/data)
- **PERF**: Performance / legibility (numeral fit, frame budget unchanged)
- **DATA**: Data Integrity (engine rules) — none (engine untouched)
- **BUS**: Business / a11y impact (FR-31 shape/text, WCAG AA, color-blind, i18n truncation)
- **OPS**: Operations / release signalling (deferral, gating)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. Dark canonical only; light/color-blind thresholds are UNKNOWN until 9.4 and are carried as explicit assumptions, not guessed.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| **Accessibility — target size** | N/A this story (9-1). Kept as gate that 9-3 does not regress `HIT_TARGET 48 ≥44`. | — | `npm test -- tapTargets.audit.test.ts ui.thinview.test.ts` still green post-merge. | Same suite green; `git diff --stat -- triade/src/ui` shows no hit-area file except GameBoard. |
| **Accessibility — WCAG AA contrast (dark canonical)** | **WCAG 2.1 AA**: for every tile tier, `contrast(tileFill, tileInk) ≥4.5:1` for normal text (13pt/9pt numerals) — holds even under large-text 3:1 exemption. Weakest `384 #157A5C` on `#F6F0E1` holds ~4.65 (design ~4.7). Chrome: `text #F2EEE3 / muted #A39C8F / accent #E8A33D` on `board #1A1D23 / surface #23262D / raised #2B2F38` all ≥4.5 (accent on surface ≈7.0, dark-on-accent ≈8.6). Light/color-blind thresholds UNKNOWN until 9.4 — not asserted here. | R-001, R-004, R-005 | Host audit `tileContrast.audit.test.ts` (3 tests): exhaustive tier loop + chrome table + 3:1 smoke; `contrastRatio` pure helper; Python one-liner cross-check in CI logs `14.44 … 4.65` per tier. | `triade/__tests__/ui/tileContrast.audit.test.ts` green (3/3) + `npm test` log showing per-tier ratios `384 4.65` pinned; optional `python -c "contrast()"` log (this run verified 13 ratios). |
| **Accessibility — shape/text beyond color (FR-31, UX-DR-19)** | Value readable without hue: tier-band facet `grain`/`bevel`/`glow` monotonic beyond hue. Contract: `low(1-12) grain 0 bevel1 clean` → `mid(24-96) grain1 bevel1.2` → `emerald/obsidian(192-768) grain2 bevel1.6 + second inner 0.12` → `incandescent(1536+) grain0 glow`. `192 vs 1536` must differ by grain/glow/bevel, not hue. Grain is additive overlay never replacing fill/ink nor covering numeral center. | R-002, R-006, R-007 | Host data contract `tileShape.test.ts` (6 tests): exact DESIGN table, ink per-tier, `192 vs 1536` grain differs, monotonic `low≤mid≤emerald`, `1 vs 2` distinct, cap `6144/12288`. Skia prop contract grep on `GameBoard.tsx`. Manual P2 device spot-check. | `tileShape.test.ts` green (6/6) + grep `tileShapeFor` + `style="stroke"` present in GameBoard + one simulator screenshot of board with `192` adjacent `1536` (P2). |
| **Accessibility — announcements** | Merge announcement is text `"Merged: A plus B equals C"` (value text, never hue), so shape/text beyond color propagates to screen readers per `a11y/announcements.ts`. No new announcement work in 9-3 but contract must not regress. | — | Unit: `announcements.test.ts` (or atdd checklist) asserts announcement string contains values not `color`/`hex` tokens. | Existing announcement suite green; grep `Merged:` in `announcements.ts`. |
| **Reliability — never throw** | `tileFillFor`/`tileInkFor`/`tileShapeFor`/`contrastRatio`/`relativeLuminance` never throw on any input (`null`, `undefined`, `NaN`, `Infinity`, `0`, `-1`, `99999`, bad hex). Fallbacks: `tileFillFor(NaN) → TILE_HEXES[3072]`, `tileInkFor(NaN) → #1C1206`, `tileShapeFor(NaN) → grain map 3`, `relativeLuminance(bad) → 0`. | R-003 | Negative-path unit: mount helpers with `NaN/Infinity/-1/0/"#GGGGGG"` and assert no throw and non-empty fallbacks. | `tileShape.test.ts` cap tests + new `tileContrast` helper guard tests (P1). |
| **Maintainability** | `TILE_HEXES`/`TILE_INK`/`TILE_SHAPE_MAP` are frozen pure data (`Object.freeze`, no RN/Skia/Expo imports, deterministic). Single source for palette; Skia `GameBoard` consumes via `tileFillFor`/`tileInkFor`/`tileShapeFor` not inline hex. `contrastRatio` is pure no side-effects. | R-004, R-009 | Static scan: `grep -R 'TILE_HEXES\|tileFillFor' triade/src` only in `tileNumerals.ts` + `GameBoard.tsx`; `grep 'value <= 12'` absence; `npx tsc --noEmit` 0 errors. | Source scan output + `npx tsc` clean (spec Verification: 0 errors this run) + `tileNumerals.test.ts` purity test. |
| **Performance — frame budget** | 9-3 adds no worklet, no Reanimated driver, no per-frame allocation; luminance math is offline audit only. Must not regress existing Epic 8 budgets: engine <2 ms, frame <8 ms, p99 <16.7 ms. No new burn-in. | — | Host bench: layout/render still <1 ms; device `useFrameRateBaseline` stats re-run nightly lane (Epic 8) — 9-3 must not degrade p99. | `triade/__tests__/ui/layout.test.ts` timings (existing) + nightly Epic 8 trace — informational only for 9-3. |
| **Offline / Installability** | No new network/native dependency, no CDN, no `expo-doctor` drift; app remains offline-installable. | — | `npx tsc --noEmit` + `npm test` green + `expo-doctor` drift none (static file only). | Same as reliability gate. |

**Unknown thresholds (marked UNKNOWN, not guessed):**

- Light theme tile hexes + per-tier ink + their WCAG ratios — UNKNOWN until 9.4 DESIGN light table; converted to risk R-010 (deferral signalling).
- Color-blind ramps (deuteranopia/protanopia safe hexes + per-tier ink) + their ratios — UNKNOWN until 9.4.
- High-tier numeral legibility policy for 5-digit `6144+` at `44pt` truncation vs wrap — Unknown but converted to R-008 monitor (pin `12288 at 44 ≥9`).
- Resting incandescent shape policy — Unknown until UX decides static glow vs static grain for `1536+` at rest (R-006 decision before 9.4).

---

## Entry Criteria

- [ ] Spec `spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md` is the reviewed revision (`baseline_revision 9448b3f`, `final_revision 7e314ab` + head `009fc5e` applied).
- [ ] Epic 9 context `_bmad-output/implementation-artifacts/epic-9-context.md` and DESIGN.md E9 table available.
- [ ] `triade/src/engine/**` byte-identical to baseline `9448b3f` (ADR-01 purity; `git show 009fc5e --stat` confirms 0 engine files).
- [ ] Branch on SDK 57 pinned versions (expo ~57.0.11, RNH pick, Skia 2.6.2, Reanimated 4.5.1 — existing matrix).
- [ ] Host runner `npm --prefix triade test -- --no-coverage` green at `973 pass, 0 fail, 366 skipped` baseline before adding this plan (this run: 973/0/366).
- [ ] `npx tsc --project triade/tsconfig.json --noEmit` clean before and after (0 errors this run).
- [ ] Simulator/device available for one manual board spot-check (P2 grain additive + 1 vs 2 distinct + 384 legible) — can defer to PR reviewer on own sim.

## Exit Criteria

- [ ] All P0 tests passing (100%). Gate: `npm --prefix triade test triade/__tests__/ui/tileShape.test.ts triade/__tests__/ui/tileContrast.audit.test.ts triade/__tests__/ui/tileNumerals.test.ts -- --no-coverage` green (12 tests: 6+3+3 pinned).
- [ ] All P1 tests passing or failures triaged with approved waivers (≥95%).
- [ ] No open bugs with severity S0/S1 against tile palette, ink, grain visibility, or 384 contrast.
- [ ] `triade/src/engine/**` still byte-identical post-merge (`git diff --stat -- triade/src/engine` empty).
- [ ] `npx tsc --noEmit` still 0 errors; no new file-wide `@ts-ignore` outside the two `RoundedRect style="stroke"` lines.
- [ ] Manual simulator pass (≥10 min, one dark board): `1:#EFE3C2` areia vs `2:#C9963B` ocre distinct, `192` emerald vs `1536` incandescent differ by grain/glow not hue, `384 #157A5C` emerald legible at 768 weight, `12288` (via debug spawn) caps to `3072 #FFF3DC` glow, `9pt` six-digit centered without numeral clip at `MIN_TILE_WIDTH~44pt` — one screenshot optional.
- [ ] R-001 and R-002 gated or explicitly waived with owner+expiry at 9.4 review (no unmitigated high).
- [ ] Coverage target: all 13 tiers + cap + weakest pin + chrome pins covered by at least one automated test (actual: 13 loop + 2 chrome table + 3 helper pins = gate 100% tier coverage).

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE / QA (TEA) | Host audits (tileShape + contrast + numerals), purity gate, PR device spot-check |
| UX reviewer | UX (Sara/Po) | Sign-off on grain coverage vs numeral center (R-002) and resting incandescent policy (R-006) before 9.4 |
| QA / TEA | QA | Gate on R-001/R-002, release note qualifier "dark canonical only" (R-010) |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` denote priority/risk. Execution timing (PR vs nightly vs device-manual) is defined under Execution Strategy.

### P0 (Critical) — Host unit, no device, <3 s

**Criteria**: Blocks core a11y compliance (WCAG AA / FR-31 shape beyond color) + high risk (≥6) or no workaround + cheap host execution.

| # | Requirement / AC | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | AC dark canonical palette identity | `TILE_HEXES` matches DESIGN dark 13-tier table exact (`1:#EFE3C2` … `3072:#FFF3DC` frozen) | Unit (static map) | R-001, R-009 | 1 `test()` loop | DEV (done) | `tileShape.test.ts` P0 exact — exhaustive 13. |
| P0-02 | AC per-tier ink identity | `TILE_INK` per-tier matches DESIGN (`dark #1C1206` on 1,2,3,6,12,192,1536,3072 / `light #F6F0E1` on 24,48,96,384,768) and `tileInkFor(v) === TILE_INK[v]` | Unit | R-001 | 1 loop | DEV (done) | `tileShape.test.ts` P0 + `tileNumerals.test.ts` P0 192/1536 pins. |
| P0-03 | AC cap at ceiling | `tileFillFor(6144)`, `tileFillFor(12288)`, `tileInkFor(6144)`, `tileShapeFor(12288)` all cap to `3072` tier (incandescent `#FFF3DC` dark ink glow) — no new hex | Unit | R-003 | 1 | DEV (done) | `tileShape.test.ts` P0 cap + new `tileInkFor` cap sweep (P1). |
| P0-04 | AC WCAG AA tile ink (dark) | For every `v∈tiers`, `contrastRatio(TILE_HEXES[v], TILE_INK[v]) ≥4.5:1`; weakest `384` `#157A5C` on `#F6F0E1` = 4.65 pins `≥4.5` (design ~4.7) — 13pt/9pt small-text gate | Unit (audit) | **R-001**, R-004 | 1 loop | DEV (done) | `tileContrast.audit.test.ts` P0 — fails build if any tier <4.5. |
| P0-05 | AC WCAG AA chrome (dark) | Chrome `text #F2EEE3 / muted #A39C8F / accent #E8A33D` on `board #1A1D23 / surface #23262D / raised #2B2F38` all `≥4.5`, plus `accent on surface ≥6.5 (~7.0)` and `dark #1C1206 on accent ≥7 (~8.6)` | Unit (audit) | R-005 | 1 table loop | DEV (done) | `tileContrast.audit.test.ts` P0 table (8 checks + 2 high pins). |
| P0-06 | AC shape beyond color — 1 vs 2 at a glance | `TILE_HEXES[1] !== TILE_HEXES[2]` (GDD rule areia `#EFE3C2` vs ocre `#C9963B` distinct without hue ambiguity) | Unit | R-002 | 1 | DEV (done) | `tileShape.test.ts` P1 pin (elevated to P0 gate for GDD). |
| P0-07 | AC shape beyond color — 192 vs 1536 distinguishable by shape | `tileShapeFor(192) grain 2 glow false bevel 1.6` vs `tileShapeFor(1536) grain 0 glow true bevel 1` differ by at least `grain` or `glow` or `bevel`; specifically `grain 2 ≠ 0` so color-blind reads beyond hue/lightness | Unit | **R-002**, R-006 | 1 | DEV (done) | `tileShape.test.ts` P0 `assert grain differs`. |
| P0-08 | AC no regression on engine/purity/theme | `git diff --stat -- triade/src/engine` empty + `npx tsc --noEmit` + full suite still `973 pass` | Ops/CI | — | 1 CI check | CI | Single bash gate in PR. |

**Total P0**: 8 groups (12 `test()` assertions across three files), host-only, executes in PR in <3 s.

### P1 (High) — Integration + data/contract + helper math (host, <2 min)

**Criteria**: Validates the wiring, helper purity, cap invariants, and chrome drift; medium risk (3–5) and common workflows.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | AC grain band monotonic (shape beyond color) | `low(3):0 ≤ mid(48):1 ≤ emerald(384):2` grain non-decreasing; incandescent `1536 glow true` is the only glow in system | Unit | R-002, R-006 | 1 | DEV (done) | `tileShape.test.ts` P1 monotonic — catches band swap. |
| P1-02 | AC interval cap invariants (non-canonical values) | `tileFillFor(0)` fallback `#E4A53B` tier 3, `5→3`, `100→96`, `800→768`, `2000→1536`, `NaN→3072`, `Infinity→3072` all map to frozen tiers and `tileInkFor`/`tileShapeFor` follow same intervals without throw | Unit | R-003 | 1 sweep (8 values) | DEV | Add to `tileShape.test.ts` sweep (not yet exhaustive, this plan proposes). |
| P1-03 | AC contrast helper purity + 3-digit hex | `contrastRatio('#FFF','#000')≈21:1`, `'#767676' on '#FFF'≈4.54`, `'#157A5C' on '#F6F0E1'≈4.65` pinned, 3-digit `'#FFF'`/`'#000'` path works, invalid hex returns `0` fallback without throw, determinism same-input same-output | Unit | R-004 | 1 | DEV | New helper-guard test (proposes `triade/__tests__/ui/contrast.test.ts:1`). |
| P1-04 | AC Skia prop contract | `GameBoard.tsx` contains `tileShapeFor`, `cellColor → tileFillFor`, `tileTextColor → tileInkFor`, `RoundedRect … style="stroke" strokeWidth={shape.bevel}`, and second inner grain branch `shape.grain===2` | Unit (static scan) | R-002, R-007 | 1 grep | CI | Static grep tripwire complements data tests. |
| P1-05 | AC announcement carries value text not hue | `announcements.ts` merge string is `"Merged: A plus B equals C"` (engine-derived values) and never references `color`/`hex` per FR-31 | Unit (static) | — | 1 | DEV | Existing `announcements.test.ts` + grep `Merged:` . |
| P1-06 | AC chrome pin source-of-truth | Chrome audit constants match `src/theme` tokens (or documented freeze) — `muted #A39C8F` vs token drift would break R-005 | Unit (static) | R-005 | 1 | FE | Doc import vs hard-code check; optional. |
| P1-07 | AC tileNumerals purity + numerals fit | `tileNumerals.ts` exports are pure (`Object.freeze`, no RN/Skia), `TILE_NUMERAL_TOKENS 32/13/9` unchanged, `MIN_TILE_WIDTH 44` pinned, `numeralSizeFor(12288,44)≥9` does not clip | Unit | R-008 | 1 | DEV | `tileNumerals.test.ts` P0/P1 purity + fit pins (already green). |

**Total P1**: ~7 groups, ~3–5 h to finish supplement (helper-guard + cap sweep + static grep) plus 15-min device prep.

### P2 (Medium) — Edge, visual additive, high-value, narrow container

**Criteria**: Secondary flows + low/medium risk (1–4) + perf depth.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | Grain additive visual (FR-31) | Mount `GameBoard` mental model: grain `RoundedRect` inset `3` + `6` inside `CELL_RADIUS 10` never covers numeral center (`centerX/centerY` with `numeralSizeFor`) — static inset check `cell-6 > numeral width at 44pt` plus simulator spot-check that 192 grain does not clip 9pt numeral | Component (static+manual) | R-002, R-008 | 1 | DEV/QA | Inset arithmetic + device screenshot. |
| P2-02 | Glow scope at rest vs merge | Verify `hasGlow = isPunch && value>=1536` gates glow only to merge punch; resting `1536/3072` without glow must still be distinguishable from `1-12` via another signal — document decision or add static grain for resting incandescent | Manual + doc | R-006 | 1 | UX/FE | Gap note carried to 9.4. |
| P2-03 | High-value beyond ceiling stress | Render board via debug `board` containing `6144/12288/99999` and assert they show `3072 #FFF3DC` dark ink incandescent with glow, no new hex, no crash | Unit (cap already) + manual | R-003 | 1 | DEV | Already unit-pinned; manual confirms Skia renders cap. |
| P2-04 | 3-digit + invalid hex resilience | `relativeLuminance('#FFF')` and `hexToRgb('#ABC')` expand correctly; `relativeLuminance('#GGGGGG')` →0 and `contrastRatio(bad, good)` does not NaN | Unit | R-004 | 1 | DEV | Helper-guard P1-03 dual-covers. |
| P2-05 | Engine/theme purity regression | `git diff --stat -- triade/src/engine triade/src/theme` empty except docs; `npm test` 973/0 retained; `npx tsc` 0 errors | Ops/CI | — | 1 CI | CI | Single bash gate. |
| P2-06 | Reduced Motion orthogonality | Grain/glow not gated by `reducedMotion` except `hasGlow via isPunch` which respects `reducedMotion`; assure grain still renders under `reducedMotion:true` (shape is not motion) | Manual | — | 1 | QA | Announce in 8.5 check: grain stays when Reduced Motion on. |

**Total P2**: ~6 checks.

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have + exploratory + device tuning.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Device color-blind smoke | On simulator/device with macOS color-blind filter (deuteranopia) on, board with 13 tiers still shows `1 vs 2` and `192 vs 1536` differ by grain density without relying on hue — fingertip/eye ranking. | Exploratory (manual) | 1 | UX/QA | Not a pass/fail gate; capture note for 9.4 color-blind ramps. |
| P3-02 | Frame budget bench | 10-min play with 13-tier board, no p99 regression vs Epic 8 baseline (p99 <16.7 ms) — grain is declarative not per-frame. | Manual bench (nightly) | 1 | FE | Nightly only; host bench already <1 ms. |

**Total P3**: 2 exploratory checks.

---

## Execution Order

For this story execution is host-dominated; manual is the only visual/tactile gate.

### Smoke (<1 min, host, every save)

- `npm --prefix triade test triade/__tests__/ui/tileShape.test.ts triade/__tests__/ui/tileContrast.audit.test.ts triade/__tests__/ui/tileNumerals.test.ts -- --no-coverage` — P0 host audits (9 tests) + `npx tsc --noEmit` (0 errors).

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 + P1 host assertions (hex/ink/contrast/shape + cap sweep + helper guards + static grep `tileShapeFor`/`style="stroke"`).
- **CI purity gate**: `git diff --stat -- triade/src/engine` empty; `grep -q 'value <= 12' triade/src/render/GameBoard.tsx` must fail (no old binary threshold).
- **Static scan**: ratio log `python -c "contrast()"` or `node -e` printing 13 tiers plus chrome `13.1/5.6/7.0/8.6` so reviewer sees `384 4.65` trend.

### Device/simulator gate (manual, ~15 min, before merge)

- **Simulator pass** (iOS Simulator dark mode is sufficient for contrast — no Taptic needed): render board with `1,2,3,6,12,24,48,96,192,384,768,1536,3072` on dark `#1A1D23` board; verify `1 areia vs 2 ocre` distinct, `384` deep emerald legible, `192 vs 1536` grain differs, `12288` caps to `3072` glow, `9pt` six-digit centered without truncation at `MIN_TILE_WIDTH~44pt`. Capture one screenshot per checklist (P2-01).
- **Future 9.4 prep**: when light theme lands, re-run same 13 values on light surface and assert new WCAG audit (not this gate).

### Nightly/weekly — not required for 9-3

No k6/chaos/large-dataset suites. A sustained 10-min play p99 trace for Epic 8 benchmarks already covers frame budget; 9-3 adds no load. P3 bench is informational.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node --test` parallelisation); defer only visual grain additive and color-blind smoke to a quick simulator pass because they require a viewport/Skia, not a harness.

- **PR**: All functional host tests (P0 + P1 host + P2 static). No Playwright/k6 infra — `node --test` + `tsc` + `grep` + `python` ratio log are the only runners.
- **Pre-merge device**: One manual iOS Simulator pass (P2-01 grain not clipping numeral, P3-01 color-blind filter smoke, R-006 resting glow decision). Owner is PR author; sign-off is a checkbox in PR description ("tile dark WCAG + grain beyond color: 384 4.65, 192 vs 1536 grain differ, 1 vs 2 distinct").
- **Nightly/weekly**: None for 9-3. Light/color-blind contrast gates (9.4) are the nightly lane when those palettes land.

No Playwright/k6 contract/perf harness is required for this delta (no UI intercept, no network API, no backend).

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 8 groups (12 `it` assertions already written: 6+3+3) | 0.1–0.35 | **~2–3 h** | Already done; review + ratio log only. |
| P1 | 7 groups (monotonic + cap sweep + purity + Skia grep + announcement + chrome drift + helper guards) | 0.25–0.75 | **~3–5 h** | Dominated by new helper-guard + cap sweep tests (`contrast.test.ts`, cap interval sweep) + static grep gate. |
| P2 | 6 checks | 0.25–0.5 | **~1.5–3 h** | Static inset arithmetic + manual grain spot-check + glow-scope decision. |
| P3 | 2 exploratory | 0.25–0.5 | **~0.5–1 h** | Manual simulator color-blind filter ranking, not gating. |
| **Total** | **~23 checks** | — | **~7–13 h** | **~1–1.5 days** wall-clock with simulator access; host-only completion is ~0.5 day. |

Prerequisites:

- **Test data**: Deterministic DESIGN dark hex table (13 entries) + ink map + `SURFACE/BOARD/RAISED/TEXT/MUTED/ACCENT/DARK_INK` chrome tokens; `MIN_TILE_WIDTH 44` numeral fixtures from `tileNumerals.test.ts`.
- **Tooling**: `node --test`, `tsx`, `typescript`; iOS Simulator (Xcode) for P2/P3 smoke (no real-device Taptic needed); `python3` for ratio log.
- **Environment**: Host (`node >=22` per CI), iOS Simulator (SDK 57). No staging backend.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions; all P0 groups green). Weakest `384` ≥4.5 and `192 vs 1536` grain differs are blockers.
- **P1 pass rate**: ≥95% (if helper-guard or cap-sweep supplement is pending, count as waiver with owner+expiry at 9.4; audit's core loops must already be green).
- **P2/P3 pass rate**: ≥90% informational; P2-05 purity + `tsc` must be green (cheap).
- **High-risk mitigations**: R-001 and R-002 have a decision + test or explicit signed waiver with expiry (9.4 review) — otherwise FAIL.

### Coverage Targets

- **Critical paths (13 tiers + cap + weakest + chrome + shape beyond color)**: 100% of tile tiers covered by at least one automated test (actual: 13 loop + 2 chrome table + `192 vs 1536` pin; gate 100% file coverage, not line %).
- **Accessibility beyond color (FR-31)**: 100% of tier bands covered (`low/mid/emerald/incandescent` via monotonic + 192 vs 1536).
- **WCAG AA dark**: 100% of declared dark-canonical contrast scenarios swept via audit.
- **Edge cases (NaN/Infinity/cap/3-digit hex)**: ≥90%.

### Non-Negotiable Requirements

- [ ] All P0 tests pass; `384` holds ≥4.5 and `192 vs 1536` grain differs.
- [ ] No high-risk (≥6) items unmitigated without signed waiver.
- [ ] Engine byte-identical regression gate passes; `npx tsc --noEmit` 0 errors.
- [ ] WCAG AA dark canonical pinned by a ratio gate (not visual eyeball) for 13pt/9pt numerals.
- [ ] Simulator smoke sign-off ("tile 384 legible + grain beyond color + 1 vs 2") present in PR before merge.

---

## Mitigation Plans

### R-001: Weakest tile 384 deep emerald regresses below 4.5 (Score: 6)

**Mitigation Strategy:**
1. Keep the exhaustive P0 audit `tileContrast.audit.test.ts` that loops all 13 tiers and fails the build if any `contrastRatio <4.5`, with `384` pinned `≥4.5` (~4.65 this run, design ~4.7).
2. Add a CI one-liner that prints per-tier ratios to the build log so drift is visible: `python3 -c "contrast()"` output `14.44 6.95 8.56 6.65 5.05 4.91 5.75 6.61 5.60 4.65 10.97 13.78 16.78` (this run exact).
3. Freeze `TILE_HEXES`/`TILE_INK` as `Object.freeze` DESIGN table with comment `// DESIGN dark canonical — change hex → must re-run contrast audit (weakest 384 ~4.7)` .
4. Review checklist item for every palette PR: "ran `tileContrast.audit` and pasted `384` ratio in PR description".

**Owner:** FE (FE lead + QA reviewer)
**Timeline:** This story (audit already landed, keep as P0 gate; ratio log before 9.4)
**Status:** Complete (planned ratio log supplement)
**Verification:** `npm --prefix triade test triade/__tests__/ui/tileContrast.audit.test.ts` green + CI log shows `384 4.65`

### R-002: Facet grain beyond color not actually rendered / obscures numeral (Score: 6)

**Mitigation Strategy:**
1. Keep the data audit `tileShape.test.ts` P0 `192 grain 2 vs 1536 grain 0+glow` and P1 monotonic `low≤mid≤emerald` as the contract that value is encoded beyond hue.
2. Add a static Skia prop tripwire in CI: `rg -q 'tileShapeFor' triade/src/render/GameBoard.tsx && rg -q 'style="stroke"' triade/src/render/GameBoard.tsx && rg -q 'strokeWidth=\{shape.bevel\}' triade/src/render/GameBoard.tsx && rg -q 'shape.grain === 2' triade/src/render/GameBoard.tsx` — deletion of grain branch fails.
3. Retain the review fix `color="#000000" opacity 0.14/0.22` (not `transparent`) so grain is actually visible; add a comment `// grain beyond color — must stay #000 not transparent (FR-31)`.
4. Validate inset arithmetic: `x=3 y=3 w=cell-6` outer grain and `x=6 y=6 w=cell-12` inner grain for `grain 2` leave numeral center (`centerX/Y` at `cell/2`) uncovered at `cell~44`; manual P2 spot-check with 6-digit `12288` at 44pt confirms no clipping.

**Owner:** FE (FE lead)
**Timeline:** This story (data audit done; prop grep + inset check before 9.4)
**Status:** Planned (data audit complete, prop grep pending)
**Verification:** `tileShape.test.ts` green + grep gate green + one simulator screenshot of board with `192` adjacent `1536` grain visible

---

## Assumptions and Dependencies

### Assumptions

1. `TILE_HEXES` dark table is the single source of truth for tile fill in this story; no scattered hex literals for tiles exist outside `tileNumerals.ts` — assumption is `GameBoard.tsx` always calls `tileFillFor` (verified `cellColor → tileFillFor` in HEAD).
2. `TILE_INK` dark/light split per DESIGN table is correct and color-blind-safe for dark theme; light theme re-uses same per-tier ink split but on different fills (deferred to 9.4 — not assumed).
3. `contrastRatio` WCAG helper uses sRGB `0.04045/2.4` and weights `0.2126/0.7152/0.0722` per WCAG 2.1; 3-digit hex expansion is correct — assumption validated by P1-03 golden checks.
4. `tileShapeFor` monotonic interpretation is `low clean < mid < emerald` by grain; incandescent resets grain but adds glow, still distinguishable via shape. Resting `1536` without glow being shape-identical to `1` is assumed to be a gap accepted until UX decides static grain vs static glow (R-006).
5. `insets` and `layout.ts` board sizing are not changed by this story; `MIN_TILE_WIDTH 44` plus numeral tokens `32/13/9` guarantee fit — assumption pinned in `tileNumerals.test.ts`.
6. The audit's `chrome` constants are treated as frozen dark tokens for this story; drift vs `src/theme` is monitored via R-005.

### Dependencies

1. `triade/src/ui/tileNumerals.ts` must remain the single access point for `TILE_HEXES`/`TILE_INK`/`tileFillFor`/`tileInkFor`/`tileShapeFor`/`contrastRatio` — any rename or move must update `GameBoard.tsx` and the three audit files.
2. `triade/src/render/GameBoard.tsx` Skia contract `RoundedRect style="stroke"` must stay compatible with `@shopify/react-native-skia 2.6.x`; a Skia minor rename would require updating the `@ts-ignore` lines (R-007).
3. `triade/__tests__/ui/test-utils` helpers remain available for any future render prop contract.
4. Simulator access for the 15-min dark board gate before merge — required by merge day (manual, not CI). No real-device Taptic needed.
5. Story 9.4 must define light + color-blind hexes and their WCAG audits; this dark-only test design becomes stale if 9.4 changes `TILE_HEXES` shape without re-running R-001.

### Risks to Plan

- **Risk**: A density polish changes `CELL_RADIUS 10` or `CELL_GAP 8` and shrinks `cell` at landscape 320 width, causing `cell-12` inner grain to vanish or `cell-6` outer grain to clip → grain disappears on smallest devices.
  - **Impact**: Color-blind at small width loses grain signal on narrow tiles.
  - **Contingency**: P2-01 inset arithmetic check fails if `cell < 18`; add test `cellMin(44) >= 18` and keep grain width `max(cell-6,0)` defensive (already `Math.max((safeWidth-…)/GRID,1)` in GameBoard).

- **Risk**: Future theme PR hard-codes a new tile hex inline in `GameBoard.tsx` style instead of via `TILE_HEXES` → palette split, contrast not audited.
  - **Impact**: WCAG regression outside audit coverage.
  - **Contingency**: CI scan `rg -q '#[0-9A-Fa-f]{6}' triade/src/render/GameBoard.tsx` must only match board chrome (`#bdb6ab`) not tile fills; tile fills must come from `tileFillFor`.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|---|---|---|
| **Engine (`src/engine/core`)** | None — observer only, no rule duplicated. Purity ADR-01 must hold. | `git diff --stat -- triade/src/engine` empty + full engine suite green (973 pass log this run). |
| **Render / Board (`src/render/GameBoard`)** | Reads-only: `tileFillFor`/`tileInkFor`/`tileShapeFor` + grain `RoundedRect` overlays; no gesture/input/animation math changed. `CELL_RADIUS 10` unchanged, pulsing/glow retained for `1536+`. | `GameBoard` trace-driven tests remain gate; zero engine files in delta; `npx tsc --noEmit` 0 errors (today). |
| **Layout (`src/ui/layout.ts`, `useSyncedLayout.ts`)** | No band-height/size change; board sizing already pinned. Grain insets are relative to `cell`, so layout change propagates but never breaks grain beyond P2-01. | `layout.test.ts` + portrait/landscape golden anchors remain gate. |
| **Hud / PauseButton / Hit targets** | No touch-target change (9-1). Grain is inside Skia tiles, not RN chrome hit rects. | `tapTargets.audit.test.ts` + `ui.thinview.test.ts` still green (verified this run). |
| **LaneSelect / GameOver / AcceleratedAids / Tutorial / Tone** | None — no `src/ui` file besides `GameBoard` touched; tone 9-4 owns palette. | Allowlist audit green; snapshot tests green. |
| **Announcements (`src/a11y`)** | No production edit, but shape/text contract must keep `"Merged: A plus B equals C"` value text not hue. | `announcements.test.ts` green + grep `Merged:` . |
| **Theme / tokens (`src/theme`)** | None in 9-3 delta. Light/color-blind deferred. | No theme regression; 9.4 will validate light. |
| **App.tsx chrome vs boardWrap** | None — board chrome sibling ordering unchanged. | Ordering check `boardWrap` vs `menuBtn` still green if run. |
| **Future 9.4 a11y themes** | Break risk: new palette without re-running R-001 would regress 384. | Dark audit + ratio log gate; 9.4 must add light/color-blind audits and re-validate. |
| **Reduced Motion / Feel** | Grain is not motion; `hasGlow` via `isPunch` respects `reducedMotion` suppression already. | Epic 8.5 `reducedMotion` suite green; P2-06 checks grain stays. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk scoring (P×I), categories (TECH/SEC/PERF/DATA/BUS/OPS), gate thresholds (≥6 needs mitigation, 9 blocks).
- `probability-impact.md` — P1=Low, P2=Medium, P3=High; score interpretation (1–9; 6–8 MITIGATE, 9 BLOCK).
- `test-levels-framework.md` — Unit for pure `tileNumerals` constants/maps/math, component/static scan for Skia prop contract, manual for viewport grain/contrast eyeball.
- `test-priorities-matrix.md` — P0 = blocks core + high risk + no workaround (here: 384 contrast + 192 vs 1536 shape + 13-tier identity).
- `nfr-criteria.md` — WCAG 2.1 AA contrast thresholds (4.5 normal, 3.0 large), reliability never-throw, maintainability single-access-point, performance frame-budget gaps become risks.
- `selector-resilience.md` — Style-object / prop assertions (`hasStyle`, Skia `strokeWidth` prop) preferred over pixel screenshot.
- `test-quality.md` — Determinism, purity, `Object.freeze` invariants.

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md` (FR-31, FR-32)
- Epic context: `_bmad-output/implementation-artifacts/epic-9-context.md` (goal: todos jogam com WCAG AA, shape beyond color; stories 9.1–9.4)
- Story spec: `_bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md` (baseline `9448b3f`, final `7e314ab` → head `009fc5e`, review loop 0, followup false)
- Architecture: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (ADR-01 purity, UX-DR-19 facet/grain)
- UX Design: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md` (13-tier dark table `1:#EFE3C2 … 3072:#FFF3DC`, per-tier ink, tier bands, `T-03` numerals 32/13/9, `UX-DR-17/19`)
- Working-tree evidence: commit `009fc5e story 9-3` + `triade/__tests__/ui/tileShape.test.ts` (6 pass) + `tileContrast.audit.test.ts` (3 pass) verified this run `973 pass, 0 fail, 366 skipped`.

---

**Generated by**: BMad TEA Agent — Murat (Master Test Architect) via `bmad-testarch-test-design`
**Workflow**: `bmad-testarch-test-design` (Epic-Level)
**Version**: 4.0 (BMad v6) — targeted delta for `9-3-merges-por-shape-texto-alem-de-cor-wcag-aa`
**Config**: `_bmad/tea/config.yaml` → `test_artifacts: _bmad-output/test-artifacts` / `test_design_output: _bmad-output/test-artifacts/test-design`

### Follow-on Workflows (Manual)

- Run `*atdd` to generate missing P1 supplements: `contrast.test.ts` helper-guard (golden ratios, 3-digit, bad hex) and capped-interval sweep (`5→3, 100→96`) — separate workflow, not auto-run.
- Run `*automate` once 9.4 light/color-blind hexes land (adds light-theme contrast audit parallel to dark `tileContrast.audit`).
- Run `*nfr-assess` after 9.4 theme palettes exist for full WCAG AA evidence (dark + light + color-blind) before Epic 9 close.

---

## Approval

**Test Design Approved By:**

- [ ] Product / FE Lead: _____________ Date: ____
- [ ] UX (grain vs numeral center + resting incandescent R-006): _____________ Date: ____
- [ ] QA / TEA: _____________ Date: ____

**Comments:**

---
