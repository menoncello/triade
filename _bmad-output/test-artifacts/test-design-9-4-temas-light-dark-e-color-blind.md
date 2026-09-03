---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-03'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md'
  - '_bmad-output/implementation-artifacts/epic-9-context.md'
  - 'triade/src/theme/index.ts'
  - 'triade/src/ui/tileNumerals.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/services/storage/schema.ts'
  - 'triade/src/services/storage/settingsStore.ts'
  - 'triade/App.tsx'
  - 'triade/src/ui/LaneSelectScreen.tsx'
  - 'triade/__tests__/ui/tileContrast.allThemes.audit.test.ts'
  - 'triade/__tests__/ui/tileTheme.test.ts'
  - 'triade/__tests__/storage/settingsStore.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 9 / Story 9-4 — Temas light, dark e color-blind

**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `9-4-temas-light-dark-e-color-blind`
**Scope:** Targeted test design for the working-tree delta of story 9-4 (3 free themes as pure data, instant switch via Settings, Skia + RN consumption, WCAG AA across all 3)

> **Delta under assessment:** Commit `568987a` (`feat(9-4): temas light/dark e color-blind com tokens puros e WCAG AA`) on `main` vs baseline `fde6f8f` (`git diff fde6f8f..568987a --stat` = 10 files, 539 ins / 25 del). Working tree at `a80ae0e` adds only `_bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md` (`final_revision` `cf055ff` → `a80ae0e` + Auto Run Result) and `sprint-status.yaml` (`9-4 backlog → done`) — no uncommitted production delta; `git diff HEAD --stat` shows 2 docs only. Assessed production delta is the committed feature; docs are the only working-tree change.
> - `triade/src/theme/index.ts:1` — **NEW** pure-data module: `ThemeId='dark'|'light'|'colorBlind'`, `THEME_IDS`, `isThemeId`, `ThemeTokens { chrome: surface/surfaceRaised/board/cell/text/muted/border/accent/accentInk/scrim + tileHexes/tileInk 13 tiers }`, `THEMES: Record<ThemeId,ThemeTokens>` frozen; `dark` canonical `CHROME_DARK (#23262D/#2B2F38/#1A1D23/#F2EEE3/#A39C8F/#3A3F49/#E8A33D/#1C1206)`, `light` flipped warm off-white `CHROME_LIGHT (#F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8/#1C1206/#6B6355/#D0C8B8/#8A4E00/#FFFFFF)` with **same** `TILE_HEXES_DARK` / `TILE_INK_DARK` (derived delta, surfaces flip only), `colorBlind` re-uses `CHROME_DARK` + same tile ramp (shape/grain carries FR-31); helpers `themeFor`, `tileFillFor(value,theme)/tileInkFor(value,theme)` capped at `3072+` via `resolveTile` interval cascade, pure no RN import.
> - `triade/src/ui/tileNumerals.ts:1` — theme-aware wrappers: `tileFillFor(value, themeId?)` / `tileInkFor(value, themeId?)` optional `themeId` delegating to `THEMES` when `isThemeId`, fallback `dark`; keeps `TILE_HEXES`/`TILE_INK` canonical frozen for backward compat; `contrastRatio`/`relativeLuminance` pure unchanged; `tileShapeFor` unchanged.
> - `triade/src/render/GameBoard.tsx:12` — theme consumption: `import ThemeId/THEMES`, `theme?: ThemeId` prop default `dark`, `cellColor(value,theme)` via `tileFillFor(value,theme)` + null→`THEMES[theme].chrome.cell`, `tileTextColor` via `tileInkFor`, board well `RoundedRect color=THEMES[theme].chrome.board`, hint border `THEMES[theme].chrome.accent`; `AnimatedTile theme=dark` default.
> - `triade/src/services/storage/schema.ts:8` — `ThemeId`/`THEME_IDS` union, `Settings.theme: ThemeId`, `loadSettings` validates `THEME_IDS.includes(parsed.theme)` else `DEFAULT_SETTINGS.theme='dark'`; corrupt JSON → default `dark`.
> - `triade/src/services/storage/settingsStore.ts:1` — no structural change; `@triade/theme` key persists via existing `loadSettingsFromStorage`/`saveSettings` flow.
> - `triade/App.tsx:31` — wiring: `import THEMES,isThemeId`, `themeId=isThemeId(settings.theme)?settings.theme:'dark'`, `tokens=THEMES[themeId]`, `handleThemeChange=(id:ThemeId)=>{ setSettings({...settings,theme:id}); void saveSettings(next)}`, `GameBoard theme={themeId}`, containers `backgroundColor=tokens.chrome.surface` + preloading `color=tokens.chrome.text`, `LaneSelectScreen` receives `theme`/`onThemeChange`; `StatusBar style=statusBarStyle(isLandscape)` untouched (DW-7).
> - `triade/src/ui/LaneSelectScreen.tsx:10` — theme selector row: `theme?: ThemeId` + `onThemeChange?:(id:ThemeId)=>void` props, 3 `Pressable` `[dark,light,colorBlind]` labels `Escuro/Claro/Daltônico` (EN Dark/Light/Color-blind), `minHeight HIT_TARGET 44`, `accessibilityRole button` + `accessibilityState selected`, active `themeBtnSelected #E8A33D/#1C1206 (8.55)`, inactive `surfaceRaised/muted`; `flexWrap`.
> - `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts:1` — **NEW** WCAG AA audit (3 tests): every tier `contrast(tileFill,ink)≥4.5` per theme (weakest `384 4.65`), chrome `text/muted on surface/board/raised ≥4.5` + `accentInk on accent ≥4.5` for all 3 themes, 32pt large-text 3:1 smoke.
> - `triade/__tests__/ui/tileTheme.test.ts:1` — **NEW** mapping tests (4): 13-tier hex/ink per theme present, caps `6144/12288/5000→3072`, `isThemeId` guards invalid, `Settings.theme` fallback to `dark` on corrupt, `tileNumerals` wrappers delegate.
> - `triade/__tests__/storage/settingsStore.test.ts:94` — updated theme expectation `midnight` → `light` ThemeId.
> - No engine edits (`src/engine` 0 files), no new native assets, no `useColorScheme`, no CDN.

---

## Executive Summary

**Scope:** Story 9-4 closes Epic 9 by delivering the **3 free themes as pure data** that were pure-data-deferred in 9-3's dark canonical. `dark` stays canonical (`#EFE3C2…#FFF3DC` + chrome `#23262D` etc.); `light` flips surfaces to warm off-white (`#F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8` with `text #1C1206`/`muted #6B6355`/`accent #8A4E00`/`accentInk #FFFFFF`); `colorBlind` re-exposes dark ramp as distinct id (shape/grain already varies per tier per FR-31) so `FR-32`/`UX-DR-17` tokens as pure data are complete and WCAG AA is validated for **all 3** (tile `≥4.5`, chrome `≥4.5`, `dark ink on accent ≥7` — light `accentInk white on #8A4E00 6.62` and dark `dark ink on #E8A33D 8.55` both `≥4.5`). Selection is user-explicit via Settings (`@triade/theme` via `settingsStore`, `next-match` apply, persisted, invalid→`dark` fallback); `GameBoard` and RN chrome read `THEMES[theme]` (never duplicate literals); engine/feel never import theme.

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (score ≥6): 2
- Critical categories: **TECH/BUS — WCAG chrome weakest on light (muted on board 4.75) + tile weakest 384 4.65** and **TECH/BUS — partial RN theming / color-blind identity gap (same tile hex as dark, LaneSelectScreen container #fff not token-driven)**. Both are mitigated by new audits but remain regressible by palette or chrome drift.

**Coverage Summary:**

- P0 scenarios: 9 groups (tokens frozen 13 tiers, tile 4.5 all themes weakest 384 pinned, chrome 4.5 all themes, switching + persistence + fallback, theme-aware wrappers, Skia prop + engine purity — host <3 s)
- P1 scenarios: 8 groups (cap intervals 0/5/100/6144/NaN, isThemeId guards, schema corrupt matrix, App handleThemeChange idempotence, hit-target 44 on 3 buttons, StatusBar DW-7 preserved, contrast helper purity, duplication drift — ~2–4 h)
- P2/P3 scenarios: 7 groups (LaneSelectScreen visual token leak #fff, color-blind hue vs shape gap, accent fill #E8A33D vs light #8A4E00 divergence, light surface legibility 9pt six-digit at 44pt, Reduced Motion orthogonality, i18n keys, exploratory color-blind filter — ~1–3 h)
- **Total effort**: ~7–12 hours (~1–1.5 days wall-clock; host-only ~0.5 day, device ~0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **HDR / OLED burn-in, dynamic type scaling beyond 32/13/9, Figma visual goldens** | 9-4 is a metric gate (contrast ratio per token + declarative Skia `RoundedRect` prop), not a pixel-perfect screenshot baseline; Skia grain already verified in 9-3. | Manual board render with 13 tiers on dark + light surfaces (verify `384` legible, `9pt` six-digit centered at `MIN_TILE_WIDTH 44`, board well `board` color flips `dark #1A1D23 → light #EAE6DA`) — no Playwright golden required. |
| **Engine merge/spawn/score, `pendingSpawn`/`previewFor`, pot ladder, RNG reseed** | ADR-01 purity: engine byte-identical to baseline `fde6f8f` (0 engine files in `568987a`). | Engine suite (~980 pass per Auto Run Result) remains gate; this plan adds CI purity `git diff --stat -- triade/src/engine` empty. |
| **Tap targets ≥44pt new chrome beyond theme row (9-1), screen-reader contract (9-2)** | Theme row reuses `HIT_TARGET 44` but does not introduce new chrome pattern; 9-1/9-2 suites already gate those slices and 9-4 adds 3 buttons at `≥44`. | Epic 9.1/9.2 suites remain gates; this plan asserts `themeRow` 3 buttons `minHeight 44` pinned (P1). |
| **Reduced Motion new behavior, haptics/punch/shake/bullet time, SFX** | Spec Never: `Reduced Motion` untouched; feel/audio/IAP not in delta; theme is declarative token swap, not imperative spring/particle. | Epic 8 suites remain gates; this plan checks theme × Reduced Motion orthogonality (P2). |
| **CDN assets, native font, `matchFont` fallback, system `useColorScheme`** | Spec Never: no CDN, no new font asset, explicit user-explicit selection (never `useColorScheme`). | `npx tsc --noEmit` + `tileNumerals.test.ts` token pins cover it; grep `useColorScheme` must be absent. |
| **`PendingSpawn` preview colorization per theme** | `previewFor` derives from engine pending; theme is board-fill only. Preview card styling is outside token map in this story. | Preview smoke manual: spawn preview legible on both `board #1A1D23` and `#EAE6DA`. |
| **Full RN chrome recolor (Hud, PreviewCard, Overlays, LaneSelectScreen container #fff)** | Spec triage `reject low` notes: full RN surface theming beyond container+board is deferred intentionally; tokens drive board + App container, `Hud`/`PreviewCard` inline styles remain functional. Deferred, not defect. | Audit validates tokens/WCAG; this plan carries residual `LaneSelectScreen #fff` leak as P2 monitor (R-006). |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| **R-001** | **TECH / BUS (compliance)** | **Weakest WCAG pair regresses below 4.5 across themes.** Tile `384 #157A5C` on `#F6F0E1` is `4.65` in **all 3** themes (same tile hex/ink) — only `0.15` margin above 4.5, so any hex drift (`#157A5C` rounding or ink `#F6F0E1→#FFF8E8`) fails 13pt/9pt small-text AA. Chrome weakest is light `muted #6B6355 on board #EAE6DA 4.75` (dark analogue `muted on raised 4.92`) — also tight. Failure is silent until audit. `python` confirms `384 4.65`, light chrome `muted on board 4.75`, dark `accentInk on accent 8.55`, light `white on #8A4E00 6.62`. | 2 | 3 | **6** | Keep exhaustive `tileContrast.allThemes.audit.test.ts` P0 exhaustive 13 tiers × 3 themes + chrome 8 checks per theme (`isThemeId` × theme) as hard PR gate (today 3/3 green). Add CI one-liner printing per-tier ratios to build log so reviewer sees `384 4.65` + light `muted on board 4.75` trend. Freeze `TILE_HEXES_DARK`/`TILE_INK_DARK`/`CHROME_DARK`/`CHROME_LIGHT` as `Object.freeze` pure data with `// change hex → must re-run all-themes audit (weakest 384 4.65, light muted on board 4.75)` comment. | FE / QA | This story (audits landed, keep as P0) |
| **R-002** | **TECH / BUS (identity)** | **Color-blind theme offers no hue benefit beyond dark; light surfaces only partially applied.** `THEMES.colorBlind` and `THEMES.light.tileHexes/tileInk` both reuse `TILE_HEXES_DARK`/`TILE_INK_DARK` verbatim (light flips chrome only). FR-32 and UX-DR-17 claim color-blind ramp distinguishable by value step, not hue — but hexes are identical to dark, so `colorBlind` vs `dark` board is visually indistinguishable except for chrome (which is same `CHROME_DARK`). A color-blind tester expecting a distinct ramp sees dark again; story passes audit (same ratios) while FR-32's "ramp distinguishable by value step" is actually carried by **shape/grain** from 9-3, not by color-blind hex. Similarly, light tile hexes identical to dark means light's "warm off-white surfaces flip only" intent means board is lighter (`board #EAE6DA` vs `#1A1D23`) but tiles are dark palette on light board — contrast holds but aesthetic diverges from DESIGN if a future designer expects light-specific tile deltas. | 2 | 3 | **6** | Document as accepted DESIGN assumption in spec (light = surfaces flip only, color-blind = same ramp shape carries) and in test design gap note; add P2 manual check: board on `dark`, `light`, `colorBlind` all render 13 tiers and are distinguishable at least by chrome board (`#1A1D23` vs `#EAE6DA`) and that `colorBlind === dark` on tiles is intentional (spec `*` BLOCK If palette needs human art-direction beyond derived deltas — use DESIGN assumptions*). Add unit assert `THEMES.colorBlind.tileHexes[3] === THEMES.dark.tileHexes[3]` and `THEMES.light.tileHexes[3] === THEMES.dark.tileHexes[3]` pinned as intentional derived delta so future light-delta PR is explicit. Keep `colorBlind` id distinct so a future ramp can land without migration. | FE / UX | This story (intentional) — revisit if DESIGN issues distinct hexes |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH / BUS | **Persistence fallback regresses to `midnight`/`null` or corrupt JSON not defaulting to `dark`.** `schema.ts` validates `THEME_IDS.includes(parsed.theme)` else `dark`, but `settingsStore.test.ts` previously expected `midnight` and now expects `light`. A regression reintroducing `midnight` allowlist or storing `null` stringifies as `"null"` and would pass `isThemeId` false → fallback correct, but a typo allowing `theme: 'Midnight'` capital would slip if locale-normalized. Corrupt JSON path `JSON.parse` throws → returns `DEFAULT_SETTINGS` (0 engine block) — but `App.tsx themeId = isThemeId(settings.theme) ? settings.theme:'dark'` double-guards. Risk is duplicated `THEME_IDS` + `isThemeId` in `theme/index.ts` and `schema.ts` drifting (one enum adds value, other not). | 2 | 2 | **4** | Extend `tileTheme.test.ts` P0 fallback matrix (`midnight`, `''`, `42`, `null`, `undefined`, missing key, `COLORBLIND` cap, `{"theme":42}`) + `loadSettings('not json')` default. Add static scan that `theme/index.ts` `THEME_IDS` and `schema.ts` `THEME_IDS` are lexically identical or import from single source (P1). Keep duplicate fallback in `App.tsx` as defensive belt-and-suspenders, and assert `handleThemeChange` ignores `midnight` (P1). | FE |
| R-004 | TECH | **App handleThemeChange races or no-ops on same value, or persists stale closure.** `handleThemeChange` checks `isThemeId(id)` and `id===settings.theme` return, else `{...settings, theme:id}` + `void saveSettings(next)` (fire-and-forget). If `Settings` grows a new key not in snapshot, stale closure drops it; fire-and-forget `saveSettings` may reject and persistence silently fails with no UI feedback. Rapid toggling `dark→light→dark` within one render could interleave saves. No throw but theme appears to stick then revert on restart. | 2 | 2 | **4** | Keep P1 test that `handleThemeChange('light')` calls `saveSettings` once, same-value is no-op, invalid is no-op (static scan of `handleThemeChange` branches). Add manual P1 persistence spot-check: toggle `Claro→Escuro→Daltônico` then kill+relaunch, last chosen restored. Log save rejection to console (optional). | FE |
| R-005 | TECH | **Theme prop not propagated to all chrome: `LaneSelectScreen` container `#fff`, `Hud`/`PreviewCard` inline styles, `GameOverOverlay` remain hardcoded.** `triade/src/ui/LaneSelectScreen.tsx:205` `container backgroundColor:'#fff'` and card `backgroundColor:'#fff'` never read `tokens.chrome.surface/surfaceRaised`; `App.tsx` only themes `App.container` wrapper. On `light` theme the board (`#EAE6DA`) and overlay `#fff` container clash (board warm off-white vs chrome pure white) — audit still greens because tokens are correct, but shipped chrome is visually inconsistent. Future PR recolors one `Hud` file but not `LaneSelectScreen` → drift. | 2 | 2 | **4** | Document as accepted deferral (spec triage `reject low` — full RN chrome recolor deferred, audit validates tokens pure data and WCAG). Add static P2 monitor: `rg -n '#fff|#1a1d23' triade/src/ui` shows hard-coded chrome outside `theme` (expected leak list), and assert `App.tsx` at least themes `container` + `GameBoard board/accent/cell`. Add manual P2 screenshot gate: lane-select on `light` warm off-white still legible, white cards on `#F6F0E1` don't obscure. Carry to Epic 9 retro as follow-up if DESIGN wants full chrome recolor. | FE / UX |
| R-006 | TECH | **Duplicated `THEME_IDS` / `isThemeId` between `triade/src/theme/index.ts` and `triade/src/services/storage/schema.ts` drift.** Two frozen arrays with same literals `['dark','light','colorBlind']`; adding a new theme in one file but not the other causes `isThemeId('new')` true in `App.tsx` (theme) but `loadSettings` fallback→`dark` (schema) or vice versa → inconsistent `themeId` between persisted and consumed. | 2 | 2 | **4** | Single-source refactor carry: either import `THEME_IDS` from `theme/index.ts` into `schema.ts` (keeps `schema.ts` pure but now cross-import) or add a P1 test that asserts both arrays `join(',')` equal. Keep P1 static `rg -n 'THEME_IDS' triade/src` asserts exactly two sites and values match. | FE |
| R-007 | TECH | **`tileNumerals.ts` delegation silently masks invalid theme as dark; caller cannot distinguish fallback.** `tileFillFor(value, 'midnight')` returns dark `#E4A53B` tier 3 silently; `theme/index.ts tileFillFor` also falls back to dark via `isThemeId` ternary. No log, no assert, audit loop would still green while app shows dark when user stored corrupt value — user sees "stuck on dark" with no error. | 1 | 3 | **3** | Acceptable per spec (invalid→dark fallback, no throw). Mitigate via P1 logging: `if (!isThemeId(id)) console.warn invalid theme fallback dark` in one layer (App), not both, to avoid spam. Add test that fallback value equals `THEMES.dark.tileHexes[3]` explicitly pinned, so silent is documented. | FE |
| R-008 | TECH / BUS | **StatusBar style not theme-driven (`statusBarStyle(isLandscape)` 4 mounts) leaves light board with dark bar illegible.** Spec Always preserves `DW-7` (`statusBarStyle(isLandscape)` dependent, not theme) and App wires `StatusBar style=statusBarStyle(isLandscape)` in 4 mounts unchanged. On `light` with `board #EAE6DA` the OS bar `dark` on white text may be fine, but on `light` full chrome `#F6F0E1` the dark bar on light may be intended but never validated for WCAG (bar is outside token). Spec says theme does not alter StatusBar — intentional. | 1 | 2 | **2** | Document as intentional Always (spec Never: rely on `useColorScheme`); keep `DW-7` `status-bar-dark-landscape` suite green; manual P2 check light theme status bar legible on both portrait/landscape (`#EAE6DA` vs white notch). | FE |
| R-009 | TECH | **`tileFillFor` interval cascade duplicated between `theme/index.ts resolveTile` and `tileNumerals.ts` delegation drift on cap.** `theme/index.ts resolveTile` maps `value>1536→1536, >768→768…` etc.; `tileNumerals.ts` has same cascade in two branches (theme-aware vs legacy). Ordering or operator (`>` vs `>=`) drift in one branch would desync caps (e.g. `1537` maps `1536` in theme but `3072` in numerals). Currently 13-tier exact but intervals for `5000→3072` vs `2000→1536` sensitive. | 1 | 2 | **2** | Keep `tileTheme.test.ts` cap sweep (`6144/12288/5000` → `3072`) and `tileShape.test.ts` analog; add P2 interval sweep for non-canonical `5→3, 100→96, 500→48` so drift fails. Consider dedup: `tileNumerals.ts` delegates to `theme` for all paths and keeps legacy as fallback only (already). | FE |
| R-010 | OPS / BUS | **i18n keys `settings.theme.*` missing cause raw key shown in theme row.** `LaneSelectScreen` renders `Escuro/Claro/Daltônico` via inline const array `[ptLabel,enLabel]` selected by `language` prop, but spec also mentions `i18n keys settings.theme.*`. If future switches to `t('settings.theme.dark')` but keys absent, label shows key. | 1 | 2 | **2** | Keep inline fallback already (array of `ptLabel/enLabel` chosen by `language` prop) so row works even without i18n; add P2 grep `rg 'settings.theme' triade/src` and assert no missing `t('settings.theme` without fallback. Manual click-through PT→EN toggle shows `Escuro→Dark` correctly. | FE |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-011 | PERF / BUS | **Numeral legibility on light surfaces at 9pt six-digit `6144+` at `MIN_TILE_WIDTH 44` on `light` board.** Light board `#EAE6DA` has slightly lower contrast vs dark ink `768 #0E3B2E on #F6F0E1 10.97` is high, so not a contrast risk, but six-digit `12288` at `cell~44` with `FIT_INSET_FACTOR 0.5` may clip; light board has narrower cell on landscape 320 same as dark so same risk. | 1 | 2 | 2 | Monitor — `tileNumerals.test.ts` already pins `numeralSizeFor(12288,44)≥9` and `numeralFits`; manual 9-4 P2 screenshot light board with `12288` capped to `3072 #FFF3DC` incandescent glow confirms centered without truncation per spec Manual checks. |
| R-012 | TECH | **Engine/feel purity regression: `src/engine` or `src/feel` imports `src/theme`.** `theme` is UI/chrome concern; engine must never know theme (spec Always: engine never knows theme, lint grep fails if engine imports theme). | 1 | 2 | 2 | Monitor — CI grep `rg -l 'from.*theme|import.*theme' triade/src/engine triade/src/feel` must be empty; `npx tsc --noEmit` 0 errors, engine suite still 980 pass. |

### Risk Category Legend

- **TECH**: Technical/Architecture (tokens frozen pure data, duplication, Skia prop, cap intervals, purity)
- **SEC**: Security — none this story (no auth/data at rest beyond `@triade/theme`; no IAP/Ads in delta)
- **PERF**: Performance / legibility (numeral fit at 44pt, instant switch no animation jank)
- **DATA**: Data Integrity (engine untouched, no migration) — none (engine byte-identical)
- **BUS**: Business / a11y impact (FR-32 light/dark/color-blind free instant persist, WCAG AA, Daltônico label, HUD/monetisation not gated)
- **OPS**: Operations / release signalling (deferral of full RN recolor, `useColorScheme` Never, status bar DW-7)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. Story-scoped to light/dark/color-blind theming; light/color-blind thresholds are now **KNOWN** (audits landed) but residual visual chrome recolor is marked monitor per triage.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| **Accessibility — WCAG AA contrast (tiles, all 3 themes)** | **WCAG 2.1 AA**: for every tier `contrast(tileFill, ink) ≥4.5:1` for normal text (13pt/9pt numerals, even `6+` 9pt). Weakest `384 #157A5C` on `#F6F0E1` = `4.65` pinned in each theme (dark/light/colorBlind same ramp) — `python` this run verified 14.44/8.56/6.65/5.05/4.91/5.75/6.61/5.60/4.65/10.97/13.78/16.78. Color-blind same loop, not visual eyeball. | R-001 | Host audit `tileContrast.allThemes.audit.test.ts` (3 tests): exhaustive 13 tiers × 3 themes + weakest `384` pin + 32pt 3:1 smoke. | `tileContrast.allThemes.audit.test.ts` green `3/3` + build log `384 4.65` + `python` ratio print. |
| **Accessibility — WCAG AA contrast (chrome, all 3 themes)** | Chrome `text/muted/accent` on `surface/board/raised` `≥4.5`, `accentInk on accent ≥4.5` (spec extended: `dark ink on accent ≥7` → dark `8.55`, light `white on #8A4E00 6.62` both `≥4.5`). Light weakest `muted #6B6355 on board #EAE6DA 4.75`, dark `muted on raised 4.92`. | R-001 | Same `tileContrast.allThemes.audit` chrome table 8 checks per theme (dark `text on surface 13.06/5.56/7.02`, light `16.22/5.22/5.83`). | `tileContrast.allThemes.audit.test.ts` chrome P0 `≥4.5` + logged 8 rows per theme. |
| **Accessibility — shape/text beyond color (FR-31)** | Unchanged from 9-3: `grain 0/1/2 + glow incandescent` monotonic beyond hue; theme does not alter `tileShapeFor`. Color-blind's value-step readability is via grain, not hue — tile hex reuse does not regress FR-31. | R-002 | Host `tileShape.test.ts` 6 tests (already) monotonic `low≤mid≤emerald`, `192 grain2 vs 1536 glow`. | `tileShape.test.ts` green; no new assertion needed in 9-4. |
| **Accessibility — tap target 44 (theme row)** | Theme selector 3 Pressables each `minHeight HIT_TARGET 44`, `minWidth 44`, `accessibilityRole button` + `selected` state, gap 8 wrap. | — | `tileTheme.test.ts` or static `rp -q 'minHeight.*HIT_TARGET' triade/src/ui/LaneSelectScreen.tsx` + `grep themeBtn` count 3. Manual toggle. | Grep hit + manual `Claro/Escuro/Daltônico` all `≥44`. |
| **Accessibility — announcements** | Merge announcement still `"Merged: A plus B equals C"` value-text (never hue/hex), so theming not audible. | — | Unit `announcements.test.ts` greps `Merged:` remains (no theme assert). | Same suite green; `rg 'Merged:'` . |
| **Reliability — never throw / fallback to dark** | `tileFillFor(NaN/Infinity/-1/0/5000/6144)`, `tileInkFor`, `themeFor`, `loadSettings(corrupt)` never throw; invalid stored `"midnight"/42/null/""` → `dark`; `isThemeId` guards non-string; `settings.language` same guards still coherent. | R-003, R-009 | Negative-path `tileTheme.test.ts` fallback sweep + `tileShape.test.ts` caps + audit helper bad-hex not throwing. | `tileTheme.test.ts` `3/4` fallback tests + `tileShape.test.ts` caps. |
| **Reliability — persistence instant + next-match** | Setting via `handleThemeChange(id)` instant (`setSettings` sync), `saveSettings(void)` async fire-and-forget, next board render uses `tokens=THEMES[themeId]` synchronously; persisted via `@triade/theme` round-trip (AsyncStorage/SecureStore mock). On restart `loadSettingsFromStorage` restores last chosen; default `dark` if none. | R-004 | Unit `tileTheme` + `schema.test.ts` + manual toggle → kill → relaunch (P1). | Manual note `Claro→persist` + host fallback tests. |
| **Maintainability** | `THEMES`/`TILE_HEXES_DARK`/`TILE_INK_DARK`/`CHROME_*` are `Object.freeze` pure data (no RN/Skia import), single source; `GameBoard` consumes via `tileFillFor`/`tileInkFor`/`THEMES[theme].chrome.*` not inline hex; `contrastRatio` pure. Never `useColorScheme`. | R-006, R-012 | Static scans: `rg 'TILE_HEXES|tileFillFor' triade/src` only `tileNumerals` + `GameBoard` + `theme`; `rg 'useColorScheme'` absent; `rg 'from.*theme' triade/src/engine` absent; `npx tsc --noEmit` 0 errors. | Scan output + `npx tsc` clean + `tileNumerals.test.ts` purity pins. |
| **Performance — instant switch no jank** | Theme swap is synchronous token lookup + React rerender (`setSettings` → `tokens` → `GameBoard theme` + `View backgroundColor`); no image decode, no Skia re-init, no animation. Instant `next-match` apply (board well color swaps on next render, tiles recolor on next `planTileTransitions`). FR-43 board frame budget unchanged. | — | Host: board frame still <8 ms (`layout.test.ts` timings); device nightly Epic 8 `useFrameRateBaseline` p99 <16.7 ms unchanged. | `layout.test.ts` timings + optional nightly trace — informational for 9-4. |
| **Offline / Installability** | No new network/native dep, no CDN asset, no `expo-doctor` drift; theme pure data deterministic offline. | — | `npx tsc --noEmit` + `npm test` green + `expo-doctor` drift none. | Same as reliability gate. |

**Unknown thresholds (marked UNKNOWN, not guessed):**

- Light tile deltas beyond surfaces: UNKNOWN whether DESIGN will ever issue light-specific tile hue deltas (currently `light.tileHexes === dark.tileHexes` intentional derived delta, documented as assumption — not threshold unknown).
- Full RN chrome recolor for `Hud`/`PreviewCard`/`GameOverOverlay` on `light`: UNKNOWN (deferred per triage `reject low`); carried as R-005 monitor, not gate.
- Resting incandescent `1536+` glow vs grain at rest: UNKNOWN (R-006 gap from 9-3 still, not re-decided in 9-4 — kept as accepted).

---

## Entry Criteria

- [ ] Spec `spec-9-4-temas-light-dark-e-color-blind.md` is the reviewed revision (`baseline_revision fde6f8f`, `final_revision a80ae0e` + `568987a` feature commit applied).
- [ ] Epic 9 context `_bmad-output/implementation-artifacts/epic-9-context.md` and `DESIGN.md` E9 table available.
- [ ] `triade/src/theme/index.ts` exists as pure data `Object.freeze`, no RN/Skia imports (verify `rg 'react-native|skia' triade/src/theme` empty).
- [ ] `triade/src/engine/**` byte-identical to baseline `fde6f8f` (ADR-01 purity; `git show 568987a --stat` confirms 0 engine files).
- [ ] Branch on SDK 57 pinned versions (expo ~57.0.11, Skia 2.6.2, Reanimated 4.5.1, RNH) — existing matrix.
- [ ] Host runner `npm --prefix triade test -- --no-coverage` green at `980 pass, 0 fail, 366 skipped` baseline per Auto Run Result before this plan (this run artifact: 980/0/366).
- [ ] `npx tsc --project triade/tsconfig.json --noEmit` clean before and after (0 errors this run per Auto Run Result).
- [ ] Simulator/device available for one theme-switch smoke (light `Claro` warm off-white + color-blind `Daltônico` dark) — can defer to PR reviewer on own sim.

## Exit Criteria

- [ ] All P0 tests passing (100%). Gate: `npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage` green (7 tests: 3+4) + `triade/__tests__/ui/tileShape.test.ts` + `tileContrast.audit` dark canonical still green if run (total 13 pinned this epic).
- [ ] All P1 tests passing or failures triaged with approved waivers (≥95%).
- [ ] No open bugs with severity S0/S1 against theme tokens, theme switch instant, persistence fallback, or 384 contrast.
- [ ] `triade/src/engine/**` + `triade/src/feel/**` still `rg 'from.*theme' empty` (`engine`/`feel` never import theme).
- [ ] `npx tsc --noEmit` still 0 errors; no `useColorScheme` introduced (`rg useColorScheme` empty).
- [ ] Manual simulator pass (≥10 min): Settings → `Claro` (`surface #F6F0E1`, board `#EAE6DA` warm) → next match tiles recolor (`tileFillFor` same hex but board well light) and persist after kill+relaunch; `Daltônico` renders (dark chrome same as `Escuro`) without crash; `384 #157A5C` legible on all 3; `9pt` six-digit at `MIN_TILE_WIDTH 44` without truncation; invalid stored `"midnight"` falls back to dark on restart — one screenshot optional (P2).
- [ ] R-001 and R-002 gated or explicitly waived with owner+expiry at Epic 9 retro (no unmitigated high).
- [ ] Coverage target: all 13 tiers × 3 themes + weakest `384` × 3 + chrome 8×3 + 3 `isThemeId` + persistence fallback covered by at least one automated test (gate 100% tier×theme coverage).

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE / QA (TEA) | Host audits (all-themes contrast + tileTheme + tileShape), App persistence gate, PR simulator smoke |
| UX reviewer | UX (Sara/Po) | Sign-off on light warm off-white palette vs board contrast at 9pt (R-001 weakest 384, light muted 4.75) and color-blind intentional `dark` identity (R-002) |
| QA / TEA | QA | Gate on R-001/R-002, release note "all 3 themes free, next-match apply", verify `THEME_IDS` duplication monitor |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` denote priority/risk. Execution timing (PR vs nightly vs device-manual) is defined under Execution Strategy.

### P0 (Critical) — Host unit, no device, <3 s

**Criteria**: Blocks core FR-32 theming + WCAG AA all-themes + persistence fallback + high risk (≥6) or no workaround + cheap host execution.

| # | Requirement / AC | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | AC theme tokens frozen pure data | `THEMES.dark/light/colorBlind` each frozen with `chrome {surface/surfaceRaised/board/cell/text/muted/border/accent/accentInk/scrim}` + `tileHexes/tileInk` 13 tiers (`1:#EFE3C2 … 3072:#FFF3DC` + `TILE_INK_DARK/LIGHT` per-tier) present and `Object.freeze` | Unit (static map) | R-001, R-005, R-006 | 1 loop (13 tiers × 3) | DEV (done) | `tileTheme.test.ts` P0 exhaustive tier present + `THEMES` frozen. |
| P0-02 | AC light surfaces flip vs dark | `dark CHROME_DARK #23262D/#2B2F38/#1A1D23` vs `light CHROME_LIGHT #F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8` exact; `light.tileHexes===dark.tileHexes` intentional derived delta (spec BLOCK If) — pin as equality | Unit | R-002 | 1 | DEV (done) | `tileTheme` equality + spec `light surfaces flipped` comment. |
| P0-03 | AC colorBlind distinct id reuses dark ramp | `colorBlind chrome===CHROME_DARK` and `tileHexes===dark` but `id==='colorBlind'` distinct so shape carries; pin `THEMES.colorBlind.tileHexes[3]===THEMES.dark.tileHexes[3]` and `isThemeId('colorBlind') true` | Unit | **R-002** | 1 | DEV (done) | Intentional derived delta; future ramp can land. |
| P0-04 | AC cap at ceiling per theme | `tileFillFor(6144,theme)===THEMES[theme].tileHexes[3072]`, `tileInkFor(6144,theme)` same, `5000→3072`, `12288→3072` for `dark/light/colorBlind`; never new hex | Unit | R-009 | 1 (3×3 values) | DEV (done) | `tileTheme.test.ts` caps. |
| P0-05 | AC WCAG AA tile ink all 3 themes | For every `theme∈{dark,light,colorBlind}` and `v∈tiers`, `contrast(THEMES[theme].tileHexes[v], THEMES[theme].tileInk[v])≥4.5`; weakest `384 4.65` loop pinned `≥4.5` per theme (13pt/9pt gate) | Unit (audit) | **R-001** | 1 loop (39 checks) | DEV (done) | `tileContrast.allThemes.audit.test.ts` P0 loop — fails build if any tier <4.5. |
| P0-06 | AC WCAG AA chrome all 3 themes | Per theme chrome `text/muted on surface/board/raised ≥4.5` + `accent on surface ≥4.5` + `accentInk on accent ≥4.5` (dark 8.55, light 6.62) — 8 checks per theme, light `muted on board 4.75` weakest pinned | Unit (audit) | **R-001** | 1 table (24 checks) | DEV (done) | `tileContrast.allThemes.audit.test.ts` chrome P0 table. |
| P0-07 | AC persistence fallback to dark | `loadSettings('{"theme":"midnight"}').theme==='dark'`, `'{"theme":42}'`, missing key `→dark`, `JSON.parse` corrupt `'not json' →dark`, valid `light/dark/colorBlind` preserved | Unit | R-003 | 1 sweep (7 inputs) | DEV (done) | `tileTheme.test.ts` fallback matrix. |
| P0-08 | AC `isThemeId` guard + invalid delegation | `isThemeId('dark/light/colorBlind') true`, `midnight/''/42/null false`; `tileFillFor(3,'midnight')===THEMES.dark.tileHexes[3]` silent dark fallback documented | Unit | R-003, R-007 | 1 | DEV (done) | `tileTheme.test.ts` + `tileNumerals.ts` delegation branch. |
| P0-09 | AC no engine/feel leak + tsc + suite gate | `rg -l 'from.*theme' triade/src/engine triade/src/feel` empty + `npx tsc --noEmit 0 errors` + `npm test 980 pass` (`568987a` Auto Run Result) | Ops/CI | R-012 | 1 CI check | CI | Single bash gate in PR. |

**Total P0**: 9 groups (7 host audit `test()` loops already written + 2 scans), host-only, executes in PR in <3 s (`npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage` = 7 pass this run, plus existing `tileShape` 6 pass).

### P1 (High) — Integration + contract + helper + chrome (host, <2 min)

**Criteria**: Validates wiring, persistence idempotence, hit target, status bar DW-7, helper purity, cap intervals, duplication drift; medium risk (3–5).

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | AC Settings→theme row interaction | `LaneSelectScreen themeRow` renders 3 `Pressable` `Escuro→Claro→Daltônico` labels PT and `Dark→Light→Color-blind` EN, `accessibilityRole button` + `selected` reflects `theme` prop; `onThemeChange` fires `ThemeId` on tap | Unit (static) | — | 1 (`rg themeRow` + `themeBtn` count 3 + label array) | DEV | Static + `render` prop contract if harness exists; grep tripwire complements manual. |
| P1-02 | AC `handleThemeChange` idempotence + invalid no-op | `handleThemeChange('midnight')` no state change / no `saveSettings` call; same-value `id===settings.theme` no-op; rapid `dark→light→dark` leaves `light` once (no interleaved stale closure) | Unit (static) | R-004 | 1 (`rg -A 8 handleThemeChange App.tsx`) | DEV | Static scan of branches + manual toggle holds. |
| P1-03 | AC hit target 44 theme row | Each `themeBtn` style `minHeight HIT_TARGET 44` + `minWidth 44` + `gap 8` + `flexWrap`; row `accessibilityLabel="theme selector"` | Unit (static) | — | 1 | DEV | `rg HIT_TARGET` in `LaneSelectScreen` already `langRow` analog; pin `themeRow` same. |
| P1-04 | AC StatusBar DW-7 preserved | `App.tsx` 4 mounts `StatusBar style={statusBarStyle(isLandscape)}` unchanged (not `tokens.chrome`); `rg 'statusBarStyle\(isLandscape\)'` count 4, `rg 'useColorScheme'` count 0 | Unit (static) | R-008 | 1 | CI | `statusBarStyle` pure vs theme independent. |
| P1-05 | AC `tileNumerals` theme-aware wrappers delegate | `tileNumerals.tileFillFor(value,theme)` delegates to `THEMES[theme]` when `isThemeId`, fallback dark; legacy `TILE_HEXES`/`TILE_INK` canonical preserved (`tileFillFor` without theme → `TILE_HEXES[3]`) | Unit | R-009 | 1 (`rg 'isThemeId\(theme' triade/src/ui/tileNumerals.ts`) | DEV (done) | `tileTheme` `P1` `tnFill(3,'light')` + `tnFill(1,'invalid')` pins. |
| P1-06 | AC cap interval invariants (non-canonical) | `tileFillFor(0)→#E4A53B tier3`, `5→3`, `100→96`, `800→768`, `2000→1536`, `NaN→3072`, `Infinity→3072` all map to frozen tier and `tileInkFor`/`tileShapeFor` follow without throw — per theme | Unit | R-009 | 1 sweep (8 values × 3) | DEV | Add to `tileTheme` sweep if not yet exhaustive. |
| P1-07 | AC `THEME_IDS` duplication drift | `theme/index.ts THEME_IDS` vs `schema.ts THEME_IDS` lexically identical `['dark','light','colorBlind']`; 2 sites only, values `join(',')` equal | Unit (static) | R-006 | 1 | CI | `rg -n THEME_IDS triade/src` count 2; add test `expect(THEME_IDS.join).toBe(THEME_IDS2.join)`. |
| P1-08 | AC theme token leak hard-codes | `rg -n '#EFE3C2|#C9963B|#E4A53B|#23262D|#F6F0E1' triade/src/render triade/App.tsx` only via `THEMES`/`tileFillFor` not inline literals (board chrome is token-driven; only `#fff7ec` warningBanner etc. outside theme is allowed) | Unit (static) | R-005 | 1 | CI | `GameBoard` `THEMES[theme].chrome.board` + `cellColor→tileFillFor` pins. |

**Total P1**: ~8 groups, ~2–4 h to finish supplement (status-bar/duplicate scans + cap interval sweep + hit-target grep) plus manual persistence prep.

### P2 (Medium) — Edge, visual additive, chrome leak, i18n

**Criteria**: Secondary flows + low/medium risk (1–4) + edge/persistence depth.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | LaneSelectScreen #fff container leak | `LaneSelectScreen container backgroundColor '#fff'` inside `App container tokens.chrome.surface` (`light #F6F0E1` vs `#fff` white) visual leak; `card backgroundColor '#fff'` same | Manual (visual) | R-005 | 1 | FE/QA | Documented deferral; screenshot `Claro` light on `#F6F0E1` vs `#fff` card not clip; carry to Epic 9 retro. |
| P2-02 | Light tile hex identical to dark at rest vs merge polish | Dark and light share tile ramp; light board `#EAE6DA` lighter than dark `#1A1D23` so same `384 #157A5C` appears relatively more saturated on light — verify `384` still legible at 13pt (4.65 holds, but light surface may bias perception) | Manual | R-001 | 1 | UX/FE | Device check dark vs light side-by-side `384` tier. |
| P2-03 | Theme row accent divergence `E8A33D vs 8A4E00` | Selected theme button uses canonical `accent #E8A33D` + `dark ink #1C1206 8.55` even on light where `light chrome accent #8A4E00` is the text-on-surface token; mismatch is intentional (review triage `reject low`: selector accent `8.5` still `≥4.5` for both) — verify active label still `≥4.5` on `light` `surface #F6F0E1` | Manual | R-001 | 1 | QA | Pin `contrast(#E8A33D,#1C1206) 8.55` covers; optional assert light `muted on board 4.75` still holds. |
| P2-04 | Persistence corrupt JSON + missing key | `loadSettings('')` `null` / `'{"reducedMotion":true}'` / `'{"theme":null}'` all `theme→dark`, hydrated `settings.language` still coherent with `normalizeLng` | Unit | R-003 | 1 | DEV | Already `tileTheme.test.ts` missing + wrongType; add empty string. |
| P2-05 | i18n keys drift for theme row | Inline array `['dark','Escuro','Dark']` chosen by `language` prop, not `t('settings.theme.dark')`, so row works even if keys absent; if future swaps to `t` but keys missing, fallback shows key | Manual | R-010 | 1 | QA | `rg 'settings.theme' triade/src` count; PT toggle shows `Daltônico`, EN shows `Color-blind`. |
| P2-06 | Reduced Motion orthogonality with theme | Theme swap must not suppress `reducedMotion` except via existing `App.tsx` `reducedMotion` prop to `GameBoard` (theme and reducedMotion independent) | Manual | — | 1 | QA | Toggle Reduced Motion vs theme independent; announce in 8.5. |

**Total P2**: ~6 checks.

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have + exploratory + device tuning.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Device color-blind filter smoke | On simulator/device with macOS color-blind filter (deuteranopia) on, board with 13 tiers on `colorBlind` (dark) still shows `1 vs 2` (`#EFE3C2 vs #C9963B`) and `192 vs 1536` differ by grain density (FR-31) without relying on hue — fingertip/eye ranking. | Exploratory (manual) | 1 | UX/QA | Not pass/fail gate; capture note for Epic 9 close. |
| P3-02 | Frame budget + instant switch bench | 10-min play while toggling `Claro↔Escuro` every 30 s, no p99 regression vs Epic 8 baseline (p99 <16.7 ms), no flash/flicker on `GameBoard` board well recolor (`THEMES[theme].chrome.board`) | Manual bench (nightly) | 1 | FE | Nightly only; host bench already <1 ms, theme swap is sync. |

**Total P3**: 2 exploratory checks.

---

## Execution Order

For this story execution is host-dominated; device is only for instant-switch persist + visual leak smoke.

### Smoke (<1 min, host, every save)

- `npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage` — P0 host audits (7 tests) + `npx tsc --noEmit` (0 errors) — this run: `980 pass, 0 fail, 366 skipped`.

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 + P1 host assertions (exhaustive `dark/light/colorBlind` tile 39 + chrome 24 + caps + `isThemeId`/`Settings` fallback + `tileNumerals` delegation + `THEME_IDS` duplication scan + `useColorScheme` absent).
- **CI purity + theme gate**: `git diff --stat -- triade/src/engine triade/src/feel` empty on `engine/feel`; `rg -q 'THEMES\[theme\]\.chrome\.board' triade/src/render/GameBoard.tsx`; `rg -q "themeId.*isThemeId" triade/App.tsx`; `rg -q 'useColorScheme' triade` must fail.
- **Static scan**: ratio log `python3 -c "contrast()"` or `node -e` printing 13 tiers + chrome `dark 13.06/5.56/7.02/8.55` and `light 16.22/5.22/5.83/6.62` so reviewer sees `384 4.65` + light `muted on board 4.75` trend.
- **App wiring**: 4 `StatusBar style={statusBarStyle(isLandscape)}` mounts still present; 3 theme buttons `minHeight 44` present (`rg 'themeRow|themeBtn' LaneSelectScreen`).

### Device/simulator gate (manual, ~15 min, before merge)

- **Simulator pass** (iOS Simulator sufficient; no Taptic needed): render board with `1,2,3,6,12,24,48,96,192,384,768,1536,3072` on `dark #1A1D23` then toggle to `Claro` `light #EAE6DA` and `Daltônico` `colorBlind #1A1D23`; verify `384 #157A5C` deep emerald legible on all 3, chrome `text/muted/accent` legible on `surface/board/raised` (light `muted on board 4.75` visual), `6144/12288` capped to `3072 #FFF3DC` incandescent glow, `9pt` six-digit centered without truncation at `MIN_TILE_WIDTH~44pt`, theme persists after kill+relaunch, corrupt `"midnight"` falls back to dark (simulate via `AsyncStorage` edit). Capture one screenshot per theme (P2-01 leak visible ok).

### Nightly/weekly — not required for 9-4

No k6/chaos/large-dataset suites. A sustained 10-min toggle+play p99 trace for Epic 8 benchmarks already covers frame budget; 9-4 adds no load. P3 bench is informational.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node --test` parallelisation); defer only visual light-vs-dark board + `LaneSelectScreen #fff` leak + color-blind filter smoke to a quick simulator pass because they require a viewport/Skia, not a harness.

- **PR**: All functional host tests (P0 + P1 host + P2 static). No Playwright/k6 infra — `node --test` + `tsc` + `rg` + `python` ratio log are the only runners.
- **Pre-merge device**: One manual iOS Simulator pass (instant `next-match` apply, persistence round-trip, `384` legibility on `Claro`, `colorBlind` vs `Escuro` dark identity, `LaneSelectScreen` white-on-warm leak, `useColorScheme` never used). Owner is PR author; sign-off is a checkbox in PR description ("themes light/dark/color-blind free, next-match, WCAG all-themes 384 4.65 / light muted on board 4.75, persist + fallback dark").
- **Nightly/weekly**: None for 9-4. Full Epic 9 NFR `nfr-assess` before close aggregates 9-3 dark + 9-4 all-themes evidence.

No Playwright/k6 contract/perf harness is required for this delta (no UI intercept, no network API, no backend).

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 9 groups (7 `test()` loops already written: `tileContrast.allThemes 3 + tileTheme 4` + engines scans) | 0.1–0.35 | **~2–3 h** | Already done; review + ratio log only. Auto Run Result verified `980 pass`. |
| P1 | 8 groups (theme row wiring + handleThemeChange + StatusBar DW-7 + THEME_IDS drift + cap intervals + tileNumerals delegation + purity) | 0.25–0.6 | **~2–4 h** | Dominated by `handleThemeChange` no-op + THEME_IDS dedup check + cap interval sweep. |
| P2 | 6 checks (LaneSelectScreen #fff leak + accent divergence + persistence corrupt + i18n + Reduced Motion) | 0.25–0.5 | **~1.5–3 h** | Visual leak + light 384 side-by-side + PT/EN language toggle. |
| P3 | 2 exploratory (color-blind filter + frame toggle bench) | 0.25–0.5 | **~0.5–1 h** | Manual simulator filter ranking, not gating. |
| **Total** | **~25 checks** | — | **~6–11 h** | **~0.75–1.5 days** wall-clock with simulator access; host-only completion is ~0.5 day. |

Prerequisites:

- **Test data**: Deterministic DESIGN dark hex `13` + ink map + `CHROME_DARK/LIGHT` + `THEME_IDS` + `MIN_TILE_WIDTH 44` numeral fixtures from `tileNumerals.test.ts`.
- **Tooling**: `node --test`, `tsx`, `typescript`; iOS Simulator (Xcode) for P2/P3 smoke (no real-device Taptic needed); `python3` for ratio log.
- **Environment**: Host (`node >=22` per CI), iOS Simulator (SDK 57). No staging backend.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions; all P0 groups green). Weakest `384 4.65` ×3 and light `muted on board 4.75` and `colorBlind` identity are blockers.
- **P1 pass rate**: ≥95% (if THEME_IDS dedup scan or cap-sweep supplement is pending, count as waiver with owner+expiry at Epic 9 retro; audit's all-themes loops must already be green).
- **P2/P3 pass rate**: ≥90% informational; P2-01 leak acknowledgement + `tsc` must be green (cheap).
- **High-risk mitigations**: R-001 and R-002 have a decision + test or explicit signed waiver with expiry (Epic 9 retro) — otherwise FAIL.

### Coverage Targets

- **Critical paths (13 tiers × 3 themes + caps + weakest + chrome 8×3 + persistence fallback)**: 100% of theme×tier cells covered by at least one automated test (actual: 39 tile + 24 chrome loops + 7 fallback inputs + 3 handleThemeChange branches = gate 100%).
- **WCAG AA all-themes**: 100% of declared `dark`+`light`+`colorBlind` contrast scenarios swept via audit.
- **Theme switch + persist**: 100% (`Settings→light/dark/colorBlind` next-match, restart round-trip, corrupt fallback).
- **Edge cases (NaN/Infinity/0/5/100)**: ≥90% (P1-06 sweep).

### Non-Negotiable Requirements

- [ ] All P0 tests pass; `384 4.65` holds on `dark/light/colorBlind` and light `muted on board 4.75` holds `≥4.5`.
- [ ] No high-risk (≥6) items unmitigated without signed waiver.
- [ ] Engine byte-identical regression gate passes; `npx tsc --noEmit` 0 errors; `useColorScheme` absent.
- [ ] WCAG AA all-themes pinned by ratio gate (not visual eyeball) for 13pt/9pt numerals + chrome.
- [ ] Simulator smoke sign-off ("theme light `Claro` warm off-white + `Daltônico` dark identity + instant next-match + persist + fallback dark`) present in PR before merge.

---

## Mitigation Plans

### R-001: Weakest tile 384 + chrome light weakest regress below 4.5 (Score: 6)

**Mitigation Strategy:**
1. Keep the exhaustive P0 audit `tileContrast.allThemes.audit.test.ts` looping all 13 tiers × 3 themes and 8 chrome checks per theme failing the build if any `contrastRatio <4.5`, with `384 4.65` and light `muted on board 4.75` explicitly pinned.
2. Add a CI one-liner printing per-tier ratios to the build log so drift is visible: this run exact `dark/light/colorBlind` `14.44 6.95 8.56 6.65 5.05 4.91 5.75 6.61 5.60 4.65 10.97 13.78 16.78` and chrome `dark 13.06/5.56/14.56/6.20/11.56/4.92/7.02/8.55`, `light 16.22/5.22/14.78/4.75/18.44/5.93/5.83/6.62`.
3. Freeze `TILE_HEXES_DARK`/`TILE_INK_DARK`/`CHROME_DARK`/`CHROME_LIGHT` as `Object.freeze` DESIGN table with comment `// DESIGN — change hex → must re-run all-themes audit (weakest 384 4.65, light muted on board 4.75)`.
4. Review checklist item for every palette PR: "ran `tileContrast.allThemes.audit` and pasted `384 4.65` + light `muted on board 4.75` in PR description".

**Owner:** FE (FE lead + QA reviewer)
**Timeline:** This story (audit already landed, keep as P0 gate; ratio log before Epic 9 close)
**Status:** Complete (planned ratio log supplement)
**Verification:** `npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts` green + CI log shows `384 4.65` + light `muted on board 4.75`

### R-002: Color-blind identity gap + light partial tile delta (Score: 6)

**Mitigation Strategy:**
1. Document as accepted DESIGN assumption: `light.tileHexes === dark.tileHexes` (surfaces flip only) and `colorBlind.tileHexes === dark.tileHexes` (shape/grain carries, FR-31) in spec + gap note; keep `colorBlind` id distinct so a future ramp ships without migration.
2. Add unit pins `expect(THEMES.light.tileHexes[3]).toBe(THEMES.dark.tileHexes[3])` and `expect(THEMES.colorBlind.tileHexes[3]).toBe(THEMES.dark.tileHexes[3])` so the intentional derived delta is explicit — a future light-delta PR that changes `light` hex without updating spec fails intentionally.
3. Manual P2: dark vs light vs colorBlind all render 13 tiers, board well differs (`#1A1D23` vs `#EAE6DA`), tiles same hex but board chrome distinguishes; color-blind tester confirms board still distinguishable via `grain` not hue (9-3 `192 vs 1536` grain contract still holds).
4. Carry to Epic 9 retro: if DESIGN issues distinct light/color-blind tile hue deltas, open follow-up story.

**Owner:** FE (FE lead) + UX
**Timeline:** This story (decision documented; pins before Epic 9 close)
**Status:** Planned (spec assumption documented, pins pending)
**Verification:** Spec `9-4` Always `light … same tile hexes (derived delta, surfaces flip only)` present + pin test green + one P2 screenshot `Claro` vs `Escuro` board well flip visible

---

## Assumptions and Dependencies

### Assumptions

1. `triade/src/theme/index.ts` is the single source for `THEMES`/`THEME_IDS`/`tileFillFor`/`tileInkFor`/`themeFor`; `tileNumerals.ts` delegates but keeps canonical `TILE_HEXES`/`TILE_INK` for backward compat — assumption verified `THEMES[theme].tileHexes` equal dark for light/colorBlind until DESIGN issues distinct deltas.
2. `CHROME_LIGHT` warm off-white `#F6F0E1/#FFFFFF/#EAE6DA` with `muted #6B6355` and `accent #8A4E00` is DSS/DESIGN correct; WCAG audit treats those as truth, not `DESIGN.md` secondary draft.
3. `contrastRatio` helper uses WCAG sRGB `0.04045/2.4` and weights `0.2126/0.7152/0.0722`; verified via `python` cross-check `384 4.65`; `isThemeId` string includes check only, not enum auto.
4. `settingsStore` `@triade/theme` is per-device persisted via `AsyncStorage` (mock in host tests); `App.tsx` `themeId` + `tokens` derivation is synchronous so next-match apply requires no animation jank.
5. `LaneSelectScreen` row `themeRow` `gap 8` + `flexWrap` + `HIT_TARGET 44` is sufficient; `i18n` labels `Escuro/Claro/Daltônico` are literal fallback (not `t('settings.theme.dark')`); `language` prop `'pt'/'en'` drives labels.
6. `StatusBar` DW-7 `statusBarStyle(isLandscape)` 4 mounts preserved is intentional even on `light` (theme does not alter bar).

### Dependencies

1. `triade/src/theme/index.ts` must remain pure-data; any new theme value must update both `THEME_IDS` arrays (`theme` + `schema`) or use single import.
2. `triade/App.tsx` `handleThemeChange` + `themeId`/`tokens` derivation and `GameBoard theme` prop must stay synced with `LaneSelectScreen` `theme`/`onThemeChange` props.
3. `triade/src/render/GameBoard.tsx` Skia `RoundedRect` board `THEMES[theme].chrome.board` + hint `accent` must stay `THEMES`-driven; `contrastRatio` must stay pure.
4. Simulator access for the 15-min `light` + `colorBlind` smoke before merge — required by merge day (manual, not CI). No real-device Taptic needed.
5. Story 9-3 `tileShape.test.ts` 6 pass remains gate for FR-31 shape beyond color; 9-4 does not re-decide resting `1536` glow policy.

### Risks to Plan

- **Risk**: A density polish changes `CELL_RADIUS 10` or `CELL_GAP 8` and shrinks `cell` at landscape 320, causing `cell-12` inner grain to vanish or `cell-6` outer grain to clip → grain disappears on smallest devices.
  - **Impact**: Color-blind at small width loses grain signal on narrow tiles.
  - **Contingency**: P2-01 inset arithmetic check fails if `cell < 18`; add test `cellMin(44) >= 18` and keep grain width `max(cell-6,0)` defensive (already `Math.max((safeWidth-…)/GRID,1)` in GameBoard).

- **Risk**: Future palette PR hard-codes a new tile hex inline in `GameBoard.tsx` or `App.tsx` style instead of via `THEMES`/`TILE_HEXES` → palette split, audit not covering inline.
  - **Impact**: WCAG regression outside audit coverage.
  - **Contingency**: CI scan `rg -q '#[0-9A-Fa-f]{6}' triade/src/render/GameBoard.tsx` must only match board chrome vs tokens; tile fills must come from `tileFillFor`; add `rg 'TILE_HEXES|THEMES\[theme\]' triade/src/render/GameBoard.tsx` asserts token-driven.

- **Risk**: `isThemeId` / `THEME_IDS` drift between `theme/index.ts` and `schema.ts` when a new theme lands.
  - **Impact**: Persisted `light` validated in one but fallback to `dark` in the other → user sees stuck theme after restart.
  - **Contingency**: P1-07 duplication test `expect(arraysEqual)` fails on drift, forcing single-source import or both updated atomically.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|---|---|---|
| **Engine (`src/engine/core`)** | None — observer only, no rule duplicated. Theme id only in `src/theme`+`src/services/storage`+`src/ui`. ADR-01 purity must hold. | `git diff --stat -- triade/src/engine` empty + full engine suite green (980 pass this run). `rg 'from.*theme' triade/src/engine` empty. |
| **Feel (`src/feel`)** | None — theme never imported (spec Never). `feel` still imperative worklets only. | `rg 'from.*theme' triade/src/feel` empty; Epic 8 `reducedMotion` suites green. |
| **Render / Board (`src/render/GameBoard`)** | Reads-only: `tileFillFor(theme)/tileInkFor(theme)` + `THEMES[theme].chrome.board/accent/cell` (`hintHighlight` border, board well, empty cell). No gesture/animation math changed. `AnimatedTile theme=dark` default. | `GameBoard` trace-driven tests gate; zero engine files in delta; `npx tsc --noEmit` 0 errors (today). |
| **Layout (`src/ui/layout.ts`, `useSyncedLayout.ts`)** | No band-height/size change; board sizing already pinned. `CELL_RADIUS 10` unchanged. Theme chrome does not affect `boardSize` derivation. | `layout.test.ts` + portrait/landscape golden anchors remain gate. |
| **Hud / PauseButton / Hit targets** | No touch-target change (9-1). Theme selector row is inside `LaneSelectScreen` not `Hud`. Board shake `onShakeActiveChange` still independent of theme. | `tapTargets.audit.test.ts` + `ui.thinview.test.ts` still green. |
| **LaneSelect / GameOver / AcceleratedAids / Tutorial / Tone** | `LaneSelectScreen` new row only; `GameOverOverlay`/`AcceleratedAids`/`Tutorial`/`ToneScreen` untouched. `App.tsx` only adds `themeId`/`tokens` wrapper and `handleThemeChange`. | Allowlist audit green; snapshot tests green if run; `npx tsc` clean. |
| **Announcements (`src/a11y`)** | No production edit; `"Merged: A plus B equals C"` still value text not hue; theme not audible. | `announcements.test.ts` green + `rg 'Merged:'`. |
| **Storage (`src/services/storage/schema + settingsStore`)** | `schema.ts` union tightened to `ThemeId`, fallback to `dark`; `settingsStore` key `@triade/theme` already existed (no migration). No new SecureStore key. | `settingsStore.test.ts` `midnight→light` spec updated (1 file, 8 lines) green; `schema.test.ts` fallback sweep green. |
| **Theme / tokens (`src/theme`)** | New pure-data source; no RN/Skia import. Light = dark ramp + warm surfaces; colorBlind = dark ramp id. No `useColorScheme`. | `tileTheme.test.ts` + `tileContrast.allThemes.audit.test.ts` green 7/7 this run; `npx tsc` clean. |
| **App.tsx chrome vs boardWrap vs StatusBar** | `App.tsx` `tokens.chrome.surface` themes `container` + `content` + `boardWrap` parent; 4 `StatusBar style={statusBarStyle(isLandscape)}` mounts unchanged per DW-7; `boardWrap overflow:visible` DW-107 still independent. | Ordering check `boardWrap` vs `menuBtn` + `status-bar-dark-landscape` still green; `useColorScheme` absent. |
| **Future 9.x / Epic 9 retro** | Break risk: new palette without re-running all-themes audit would regress 384 or light `muted on board`. | `tileContrast.allThemes.audit` + ratio log gate; full RN chrome recolor is deferred to retro if needed. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk scoring (P×I), categories (TECH/SEC/PERF/DATA/BUS/OPS), gate thresholds (≥6 needs mitigation, 9 blocks).
- `probability-impact.md` — P1=Low, P2=Medium, P3=High; score interpretation (1–9; 6–8 MITIGATE, 9 BLOCK).
- `test-levels-framework.md` — Unit for pure `theme`/`tileNumerals` constants/maps/math, component/static scan for Skia prop contract, manual for viewport grain/contrast eyeball.
- `test-priorities-matrix.md` — P0 = blocks core + high risk + no workaround (here: all-themes 384 4.65 + light muted 4.75 + theme switch persist).
- `nfr-criteria.md` — WCAG 2.1 AA contrast thresholds (4.5 normal, 3.0 large), reliability never-throw, maintainability single-access-point, performance frame-budget.
- `selector-resilience.md` — Style-object / prop assertions (`hasStyle`, `minHeight HIT_TARGET`) preferred over pixel screenshot for `themeRow`.
- `test-quality.md` — Determinism, purity, `Object.freeze` invariants.

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md` (FR-32, FR-31, S9.4, UX-DR-17/19)
- Epic context: `_bmad-output/implementation-artifacts/epic-9-context.md` (goal: todos jogam com WCAG AA, 3 temas gratuitos; stories 9.1–9.4; 9.3 dark canonical → 9.4 light+color-blind)
- Story spec: `_bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md` (`baseline_revision fde6f8f`, `final_revision a80ae0e`, commit `568987a`, review loop 0, followup false, 2 low `reject` — full RN recolor deferred + accent #E8A33D vs light #8A4E00 divergent)
- Architecture: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (ADR-01 purity, UX-DR-17 pure-data theme `src/theme`, FR-31 grain)
- UX Design: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md` (13-tier dark table `1:#EFE3C2 … 3072:#FFF3DC`, per-tier ink dark `#1C1206` / light `#F6F0E1`, tier bands, `T-03` numerals 32/13/9, `UX-DR-17/19`, `DESIGN NOTE light surfaces flip only`)
- Prior TEA: `_bmad-output/test-artifacts/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md` (dark canonical 10 risks, 384 4.65 gate, `tileShape` grain)
- Working-tree evidence: commit `568987a` + `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts` (3 pass) + `tileTheme.test.ts` (4 pass) + `settingsStore.test.ts` (1 pin updated) verified this session; `python` cross-check 13 ratios + chrome 8 per theme `384 4.65`, `muted on board light 4.75` pinned.

---

**Generated by**: BMad TEA Agent — Murat (Master Test Architect) via `bmad-testarch-test-design`
**Workflow**: `bmad-testarch-test-design` (Epic-Level)
**Version**: 4.0 (BMad v6) — targeted delta for `9-4-temas-light-dark-e-color-blind`
**Config**: `_bmad/tea/config.yaml` → `test_artifacts: _bmad-output/test-artifacts` / `test_design_output: _bmad-output/test-artifacts/test-design`

### Follow-on Workflows (Manual)

- Run `*nfr-assess` after this and 9-3 evidence to aggregate Epic 9 WCAG AA (dark 9-3 + all-themes 9-4) before Epic 9 close — full evidence table `tileContrast.allThemes.audit 3/3` + `tileShape 6/6` + chrome per theme.
- Run `*trace` / `*test-review` for 9-4 to add traceability `spec AC → P0/P1/P2 test → ratio evidence` and adversarial review of `THEME_IDS` duplication + `LaneSelectScreen #fff` leak.
- No `*atdd` supplement required unless a future light tile delta breaks the derived-delta assumption — then add `contrast.test.ts` helper golden.

---

## Approval

**Test Design Approved By:**

- [ ] Product / FE Lead: _____________ Date: ____
- [ ] UX (light warm off-white `Claro` + `dark` + `Daltônico` intentional identity R-002 + weakest 384/muted 4.75): _____________ Date: ____
- [ ] QA / TEA: _____________ Date: ____

**Comments:**

---
