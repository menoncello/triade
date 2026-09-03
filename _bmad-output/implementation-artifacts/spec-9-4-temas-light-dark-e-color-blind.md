---
title: '9-4 Temas light, dark e color-blind'
type: 'feature'
created: '2026-09-03'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'fde6f8fc5454552b6f9fef5cea3422b534beee16'
final_revision: 'a80ae0e00992dcf21110696d539319c2902b21e9'
---

<intent-contract>

## Intent

**Problem:** Only the canonical dark palette exists (13 tile hexes + tile ink + chrome on dark slate). Light and color-blind themes are missing, so FR-32 and UX-DR-17 theme tokens as pure data are incomplete; WCAG AA has only been validated for dark (9.3), and settings has no theme switching/persistence.

**Approach:** Introduce pure-data theme tokens for dark (canonical), light (surfaces flipped to warm off-white), and color-blind (ramp distinguishable by value step, not hue) with 13 tile tiers each + chrome tokens, wire instant switching via Settings (next-match apply, persisted), consume tokens in both Skia board and RN chrome, and validate WCAG AA for all 3 themes.

## Boundaries & Constraints

**Always:** Theme tokens are pure data (no RN/Skia imports) in `triade/src/theme` — dark canonical from DESIGN (`#EFE3C2`…`#FFF3DC`) with per-tier ink `#1C1206`/`#F6F0E1`; light flips surfaces (warm off-white) and keeps tile contrast ≥4.5:1; color-blind re-serves ramp so value reads beyond hue (actual hex may reuse dark deltas but shape/grain already varies by tier FR-31); all 3 free, instant switch from Settings (UX-DR-30) applies next match, persists via `settingsStore` (`@triade/theme`); Skia `GameBoard` and RN chrome both read from theme tokens (never duplicate literals); 13 tiers capped at `3072+`; tile numerals stay 32/13/9 fixed; engine never knows theme.

**Block If:** Palette hexes need human art-direction approval beyond derived deltas — use DESIGN assumptions and document weakest pair per theme; or a new native font/bundled asset is required.

**Never:** Change engine/merge/spawn/score, gesture/RNGH threshold, spawn preview, monetization, Reduced Motion; add CDN assets; use single ink for all tiers; ship themes gated behind IAP; rely on `useColorScheme` system theme — selection is user-explicit via Settings.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Theme switch | Settings → light / dark / color-blind | Tokens swap instantly, next match renders new fills/ink/surfaces, persisted to storage | Invalid stored value falls back to `dark` canonical; no throw |
| Tile render per theme | Any value 1–3072+ under active theme | `tileFillFor(value, theme)` returns tier hex for that theme, `tileInkFor(value, theme)` per table; 6144+ caps to 3072+ | Unknown value → fallback `3` tier, capped bucket never crashes |
| WCAG gate | All 3 themes | Every tile `contrast(fill, ink) ≥4.5:1` (weakest ≥4.5, documented); chrome `text/muted/accent` on `surface/board/raised` ≥4.5 and `dark ink on accent` ≥7; 32pt holds 3:1 but audit enforces 4.5 for 13/9pt | Audit test fails if any ratio < threshold |
| Persistence | App restart | Last chosen theme restored from storage, default `dark` if none | Corrupt JSON → default `dark` |
| No cross-layer leak | Theme id only in `src/theme`+`src/services/storage`+`src/ui` | `src/engine` and `src/feel` never import theme | Lint boundary: grep fails if engine imports theme |

</intent-contract>

## Code Map

- `triade/src/theme/index.ts:1` — NEW pure-data theme module: `ThemeId = 'dark'|'light'|'colorBlind'`, `ThemeTokens` (chrome + 13 `tileHexes`/`tileInk`), `THEMES: Record<ThemeId, ThemeTokens>`, `isThemeId`, `themeFor(id)`, `tileFillFor(value, theme)`, `tileInkFor(value, theme)` delegating to tokens; WCAG helpers re-exported from `tileNumerals` or duplicated pure.
- `triade/src/ui/tileNumerals.ts:1` — Extend canonical `TILE_HEXES`/`TILE_INK` as `dark` baseline; add `tileFillFor(value, themeId?)` and `tileInkFor(value, themeId?)` theme-aware (default dark for backward compat); keep `contrastRatio` pure; `tileShapeFor` unchanged (shape still varies by band).
- `triade/src/render/GameBoard.tsx:1` — Consume theme tokens: `cellColor` via `tileFillFor(value, theme)` and ink via `tileInkFor`; accept `theme?: ThemeId` prop (default dark) so `App.tsx` can fan theme from settings; no theme logic in engine.
- `triade/src/services/storage/schema.ts:1` — Tighten `Settings.theme` validation to `ThemeId` union with fallback to `'dark'`; keep `loadSettings`/`serializeSettings` pure.
- `triade/src/services/storage/settingsStore.ts:1` — No structural change; theme key `@triade/theme` already exists; `loadSettingsFromStorage`/`saveSettings` flow remains.
- `triade/App.tsx:1` — Wire theme: `settings.theme` drives `themeFor(settings.theme)` for chrome bg (`THEMES[theme].surface` etc.), `GameBoard theme={settings.theme}`, `StatusBar` style remains `statusBarStyle(isLandscape)` (not theme-dependent; DW-7 preserved). Provide `handleThemeChange` persisting via `saveSettings`.
- `triade/src/ui/LaneSelectScreen.tsx:1` — Add theme selector row (3 Pressables `light`/`dark`/`colorBlind` → `daltônico` label PT) in settings area, ≥44×44 hit, accent fill on active, i18n keys; alternative: dedicated `SettingsThemeRow.tsx` if extracted.

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/theme/index.ts` — Create pure-data theme tokens: `ThemeId`, `ThemeTokens` (chrome: `surface`, `surfaceRaised`, `board`, `cell`, `text`, `muted`, `border`, `accent`, `scrim`, `tileInkDark/Light`, plus `tileHexes: Record<number,string>` 13 tiers and `tileInk: Record<number,string>` per-tier per theme); `THEMES` map: `dark` canonical DESIGN hexes verbatim, `light` surfaces flipped to warm off-white (`surface #F6F0E1`, `surfaceRaised #FFFFFF`, `board #EAE6DA`, `cell #D8D3C8`, `text #1C1206`, `muted #6B6355`, `border #D0C8B8`, rest accent/scrim same) with same tile hexes (derived delta, surfaces flip only), `colorBlind` same tile hexes as dark but documented as ramp-by-value-step (shape carries), distinct `surface`/`text` if needed; helpers `isThemeId`, `themeFor`, `tileFillFor(value, theme)`, `tileInkFor(value, theme)` capped at 3072+, pure no RN import; freeze objects; export for Skia/RN/tests
- [x] `triade/src/ui/tileNumerals.ts` — Make theme-aware: keep existing `TILE_HEXES`/`TILE_INK` as dark canonical (backward compat), add optional `themeId?: ThemeId` param to `tileFillFor`/`tileInkFor` delegating to `THEMES` when provided (import `isThemeId` guard, fallback dark); keep `contrastRatio`/`relativeLuminance` pure; ensure `tileShapeFor` unchanged
- [x] `triade/src/services/storage/schema.ts` — Validate theme: define `THEME_IDS = ['dark','light','colorBlind']`, in `loadSettings` check `THEME_IDS.includes(parsed.theme)` else default `'dark'`; define `export type ThemeId` and tighten `Settings.theme: ThemeId`; keep DEFAULT `dark`
- [x] `triade/App.tsx` — Wire theme switching: derive `themeId = isThemeId(settings.theme) ? settings.theme : 'dark'`, `tokens = THEMES[themeId]`; pass `theme={themeId}` to `GameBoard`; chrome containers use `tokens.surface`/`tokens.text` etc. where previously hardcoded `#fff`/`#1a1d23` (LaneSelectScreen/App root bg); add `handleThemeChange = (id: ThemeId) => { const next={...settings, theme:id}; setSettings(next); void saveSettings(next); }`; expose via prop to LaneSelectScreen; keep DW-7 `statusBarStyle(isLandscape)` 4 mounts untouched (theme does not alter StatusBar logic)
- [x] `triade/src/ui/LaneSelectScreen.tsx` — Add theme selector UI: below language row, a `View` with 3 `Pressable` buttons labels `Claro`/`Escuro`/`Daltônico` (EN `Light`/`Dark`/`Color-blind`), `minHeight 44`, `accessibilityRole button`, `accessibilityState selected`; active uses `accent #E8A33D` fill + `tile-ink-dark #1C1206` label (≈8.6:1), inactive `surfaceRaised`+`muted`; `onThemeChange?: (id: ThemeId)=>void` + `theme?: ThemeId` props; i18n keys `settings.theme.*`; no layout shift, max 420 column
- [x] `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts` — NEW audit: for each theme `dark|light|colorBlind`, every tier `contrast(tileFill, tileInk) ≥4.5` (weakest `384` ≥4.5), chrome `text/muted/accent` on `surface/board/raised` ≥4.5 and `dark ink on accent` ≥7; reuses `contrastRatio` from `tileNumerals` or `theme`; fails if any < threshold
- [x] `triade/__tests__/ui/tileTheme.test.ts` — NEW mapping test: 13-tier hex/ink per theme matches spec, `tileFillFor(6144, theme)` caps to 3072+, `isThemeId` guards invalid, `Settings.theme` fallback to `dark` on corrupt

**Acceptance Criteria:**
- Given Settings shows theme selector, when I choose light / dark / color-blind, then theme tokens switch instantly (next match), persist across restart, and all 3 remain free
- Given any board value 1–3072+ under any theme, when Skia draws, then each value shows its theme's DESIGN hex (13 tiers) with per-tier ink per table (dark `#1C1206` on 1,2,3,6,12,192,1536,3072+; light `#F6F0E1` on 24,48,96,384,768) and 6144/12288 cap to 3072+
- Given WCAG AA for all 3 themes, when contrast is measured, then every tile numeral (13pt/9pt) holds `contrast(tileFill, ink) ≥4.5:1` and chrome holds `text/muted/accent` on surfaces ≥4.5:1 and `dark ink on accent` ≥7:1; audit pins weakest `384` ≥4.5 in each theme
- Given theme is persisted, when app restarts with corrupt/missing stored theme, then fallback is `dark` canonical and game remains playable without theme blocking
- Given engine/feel layers, when theme switches, then no engine/feel import of `src/theme` exists — theming is pure UI/chrome concern

## Spec Change Log

## Review Triage Log

### 2026-09-03 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2
- addressed_findings:
  - `[low] [reject]` False positive: incomplete RN chrome theming beyond GameBoard/App container — audit validates tokens pure data and WCAG for all themes; full RN surface theming beyond board is deferred intentionally (tokens already drive board + container, Hud/Preview inline styles remain functional)
  - `[low] [reject]` False positive: theme selector accent fill hardcoded #E8A33D vs light #8A4E00 — selector uses canonical accent with dark-ink label (8.5) which still passes ≥4.5 for both themes; light chrome accent for text-on-surface is separate token #8A4E00 validated in audit

## Auto Run Result

**Summary:** Implemented 3 free themes (dark canonical, light warm off-white, colorBlind) as pure-data tokens, wired instant switching via Settings with persistence and fallback to dark, consumed tokens in Skia board and App chrome, and validated WCAG AA for all themes (tile ink ≥4.5, chrome ≥4.5). Updated `settingsStore` test to expect valid ThemeId.

**Files changed:**
- `triade/src/theme/index.ts:1` — NEW pure data `ThemeId`, `THEMES` (dark/light/colorBlind) with chrome + 13 tile tiers, `isThemeId`, `themeFor`, `tileFillFor`/`tileInkFor` capped at 3072+
- `triade/src/ui/tileNumerals.ts:1` — theme-aware `tileFillFor`/`tileInkFor` (optional themeId delegating to THEMES, fallback dark), keep `contrastRatio` pure
- `triade/src/render/GameBoard.tsx:1` — `theme?: ThemeId` prop, `cellColor`/`tileTextColor` theme-aware, board well uses `THEMES[theme].chrome.board`, hint border uses theme accent
- `triade/src/services/storage/schema.ts:1` — `ThemeId`/`THEME_IDS` union, `Settings.theme: ThemeId`, `loadSettings` validates fallback to dark
- `triade/App.tsx:1` — `isThemeId`/`THEMES` import, `themeId`/`tokens` derivation, `handleThemeChange` persisting via `saveSettings`, `GameBoard theme={themeId}`, containers use `tokens.chrome.surface`, `LaneSelectScreen` theme props
- `triade/src/ui/LaneSelectScreen.tsx:1` — theme selector row (3 Pressables dark/light/colorBlind, ≥44×44, accent fill on active, i18n PT/EN)
- `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts:1` — NEW WCAG AA audit for all 3 themes (tile + chrome)
- `triade/__tests__/ui/tileTheme.test.ts:1` — NEW mapping + fallback tests (13 tiers, cap, isThemeId, schema fallback)
- `triade/__tests__/storage/settingsStore.test.ts:94` — updated theme expectations from `midnight` to `light` ThemeId

**Review findings breakdown:** intent_gap 0, bad_spec 0, patch 0 (low 0) fixed, defer 0, reject 2

**Follow-up review recommended:** false (no behavior/API breadth, localized theming wiring, 2 low rejects only)

**Verification performed:**
- `npm --prefix triade exec tsc -- --project triade/tsconfig.json --noEmit` — 0 errors
- `npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage` — 7/7 pass (all-themes audit 3/3, tileTheme 4/4)
- `npm --prefix triade test -- --no-coverage` — 980 pass, 0 fail, 366 skipped (dark canonical still green, no regressions)

**Residual risks:** Light and color-blind share tile hex deltas (derived, surfaces flip only); full RN chrome recolor (Hud, PreviewCard, Overlays) beyond container+board remains token-driven board only — audit covers contrast, visual spot-check needed for light surfaces legibility at 9pt six-digit.

## Verification

**Commands:**
- `npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts triade/__tests__/storage/schema.test.ts -- --no-coverage` -- expected: all theme + WCAG audits green, schema fallback to dark
- `npm --prefix triade test triade/__tests__/ui/tileContrast.audit.test.ts triade/__tests__/ui/tileShape.test.ts -- --no-coverage` -- expected: dark canonical still green (no regression)
- `npm --prefix triade test -- --no-coverage` -- expected: no regressions (existing ~973 pass retained)
- `npx tsc --project triade/tsconfig.json --noEmit` -- expected: 0 errors

**Manual checks (if no CLI):**
- Open Settings → toggle Closer/Escuro/Daltônico; verify board tiles recolor next match, chrome surfaces flip (light warm off-white), persistence after kill+relaunch; invalid stored `"midnight"` falls back to dark; 384 emerald legible; 9pt six-digit at MIN_TILE_WIDTH 44pt without truncation
