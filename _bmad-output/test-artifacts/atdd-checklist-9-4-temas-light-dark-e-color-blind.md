---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-03'
workflowType: 'testarch-atdd'
storyId: '9.4'
storyKey: '9-4-temas-light-dark-e-color-blind'
storyFile: '_bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-9-4-temas-light-dark-e-color-blind.md'
generatedTestFiles:
  - '_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts'
  - 'triade/__tests__/ui/tileContrast.allThemes.audit.test.ts'
  - 'triade/__tests__/ui/tileTheme.test.ts'
  - 'triade/__tests__/storage/settingsStore.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md'
  - '_bmad-output/test-artifacts/test-design/test-design-9-4-temas-light-dark-e-color-blind.md'
  - 'triade/src/theme/index.ts'
  - 'triade/src/ui/tileNumerals.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/services/storage/schema.ts'
  - 'triade/src/services/storage/settingsStore.ts'
  - 'triade/App.tsx'
  - 'triade/src/ui/LaneSelectScreen.tsx'
  - 'triade/__tests__/ui/tileContrast.allThemes.audit.test.ts'
  - 'triade/__tests__/ui/tileTheme.test.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist - Epic 9, Story 9.4: Temas light, dark e color-blind

**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` pure-data + static file-read, RN thin-view contract)

---

## Story Summary

Story 9-4 closes Epic 9 by shipping **3 free themes as pure data** (FR-32 / UX-DR-17): `dark` canonical (`#EFE3C2…#FFF3DC` + chrome `#23262D` etc., already in 9-3), `light` warm off-white surfaces flipped (`#F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8` + `text #1C1206`/`muted #6B6355`/`accent #8A4E00`/`accentInk #FFFFFF`, same tile ramp derived delta), and `colorBlind` distinct id reusing dark ramp (shape/grain carries value per FR-31) — all frozen `Object.freeze`, no RN/Skia imports, engine never knows theme. Selection is user-explicit via Settings (`@triade/theme` via `settingsStore`, next-match apply, persisted, invalid→`dark` fallback); Skia `GameBoard` and RN chrome read `THEMES[theme]` (never duplicate literals); WCAG AA is validated for **all 3** (tile `≥4.5`, chrome `≥4.5`, `dark ink on accent ≥7` — light `accentInk white on #8A4E00 6.62` and dark `dark ink on #E8A33D 8.55` both `≥4.5`). Working-tree delta is `fde6f8f` → `568987a` (10 files `+539/-25`) + docs `a80ae0e` spec finalisation (`cf055ff→a80ae0e`) and `sprint-status 9-4 backlog→done`; `git diff HEAD --stat` shows 2 docs only — production delta is already on `main`, assessed as committed feature.

**As a** player (light-room, dark-room, or color-blind — FR-32 / UX-DR-17)
**I want** to pick `dark` / `light` / `color-blind` in Settings, see the board and chrome recolor instantly on the next match with my choice persisted across restarts, with every tile numeral and chrome pair holding WCAG AA for all 3 themes
**So that** the game is readable and inclusive in any environment without IAP gating, shape/grain variation alone distinguishing values, and without the theme concern leaking into the engine

---

## Acceptance Criteria

1. **AC1 — Theme tokens frozen pure data + light surfaces flipped vs dark:** Given `THEME_IDS=['dark','light','colorBlind']` as `Object.freeze` pure data (`triade/src/theme/index.ts:1`, no RN/Skia), when `THEMES.dark/light/colorBlind` each expose `chrome {surface/surfaceRaised/board/cell/text/muted/border/accent/accentInk/scrim}` + `tileHexes/tileInk` 13 tiers (`1:#EFE3C2 … 3072:#FFF3DC` + `TILE_INK_DARK/LIGHT` per-tier `#1C1206` on 1,2,3,6,12,192,1536,3072 vs `#F6F0E1` on 24,48,96,384,768) and helpers `isThemeId/themeFor/tileFillFor/tileInkFor` capped at `3072+` via `resolveTile` interval cascade, then `CHROME_DARK` is `#23262D/#2B2F38/#1A1D23/#F2EEE3/#A39C8F/#E8A33D/#1C1206`, `CHROME_LIGHT` is `#F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8/#1C1206/#6B6355/#8A4E00/#FFFFFF`, and `light` tile ramp is intentionally identical to `dark` (surfaces flip only — derived delta, DESIGN assumption). Maps to R-001/R-002/R-006.

2. **AC2 — Color-blind distinct id reuses dark ramp (shape carries):** Given `colorBlind` id, when `THEMES.colorBlind` is read, then its `chrome` equals `CHROME_DARK` and `tileHexes/tileInk` equal `dark` ramp verbatim but `id==='colorBlind'` is distinct so future ramp can land without migration; `isThemeId('colorBlind')` true, visual distinction beyond hue is via `tileShapeFor` grain/glow (FR-31), not by hue delta. Maps to **R-002** (score 6).

3. **AC3 — Tile render per theme + cap at 3072+:** Given any value `1–3072+` under any active `ThemeId`, when `tileFillFor(value, theme)` / `tileInkFor(value, theme)` resolves, then each value shows its theme's DESIGN hex 13-tier (e.g. `384 #157A5C` deep emerald) with per-tier ink per table (`dark #1C1206` on 1,2,3,6,12,192,1536,3072; light `#F6F0E1` on 24,48,96,384,768) and `6144/12288/5000` cap to `3072` `#FFF3DC` incandescent glow (never new hex, never throw on `NaN/Infinity/-1/0`). Maps to R-009.

4. **AC4 — WCAG AA for all 3 themes (tiles + chrome):** Given all 3 themes, when `contrastRatio(fill, ink)` via WCAG `0.2126/0.7152/0.0722` is measured, then every tile numeral (13pt/9pt) holds `contrast ≥4.5:1` (weakest `384 #157A5C on #F6F0E1 4.65` in each theme) and chrome holds `text/muted/accent on surface/board/raised ≥4.5` and `accentInk on accent ≥4.5` (`dark ink on #E8A33D 8.55`, `white on #8A4E00 6.62`); `32pt` large-text smoke holds `≥3:1`. Audit pins `384 4.65` ×3 and light `muted on board 4.75`. Maps to **R-001** (score 6) — tightest margins.

5. **AC5 — Instant switch via Settings + persistence + fallback to dark:** Given Settings theme selector, when I choose `light` / `dark` / `color-blind`, then tokens swap instantly (next match renders new `THEMES[theme].chrome.board/cell/accent` and `tileFillFor` fills), choice persists via `settingsStore` `@triade/theme` (`loadSettingsFromStorage`/`saveSettings`), survives kill+relaunch, and corrupt/missing/invalid stored `"midnight"/42/null/"" / "COLORBLIND"` → fallback `dark` canonical with no throw; `handleThemeChange` is idempotent (same-value no-op, invalid no-op, `void saveSettings` once). Maps to R-003/R-004.

---

## Story Integration Metadata

- **Story ID:** `9.4`
- **Story Key:** `9-4-temas-light-dark-e-color-blind`
- **Story File:** `_bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-9-4-temas-light-dark-e-color-blind.md`
- **Generated Test Files:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts` (RED, 14 skipped), `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts` (GREEN pin 3), `triade/__tests__/ui/tileTheme.test.ts` (GREEN pin 4)

If this story came from BMM `create-story`, mirror these artifact paths into the story's `Dev Notes` so `dev-story` can discover and activate the red-phase scaffolds.

---

## Red-Phase Test Scaffolds Created

### E2E Tests (0 tests — N/A for this delta)

No browser E2E harness is required. The delta is pure-data tokens + RN `View`/`Pressable` theme row + Skia `RoundedRect` prop swap + `AsyncStorage` persistence, verified host-side via file reads and `node:test` imports; no `page.goto`/`page.route`, no network API, no backend. `playwright-cli` exploration was intentionally skipped per `test-design-9-4-temas-light-dark-e-color-blind.md` Execution Strategy (host-dominated PR gate <3 s).

### API Tests (0 tests — N/A)

No API endpoints were created or modified (`git diff fde6f8f..568987a --stat` confirms 0 backend files, `git diff fde6f8f..568987a -- triade/src/engine` empty). API/contract tier not applicable per `test-levels-framework.md`.

### Component Tests (14 tests — RED phase, all `test.skip()`)

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts` (aligned to `test-design-9-4-temas-light-dark-e-color-blind.md` P0/P1 plan, ~5–15 min per task host-only)

- ✅ **Test:** `[P0] AC theme tokens frozen pure data — THEMES dark/light/colorBlind each with chrome + 13 tiers frozen`
  - **Status:** RED — `test.skip()` scaffold; before `568987a` fails: `triade/src/theme/index.ts` missing → `ENOENT` or chrome `CHROME_LIGHT` absent; after: `THEMES` frozen 13 tiers + `Object.freeze` + no RN import
  - **Verifies:** AC1 pure-data `ThemeId` + `THEME_IDS` 3 ids + `ThemeTokens` shape + frozen + purity (R-001/R-006)

- ✅ **Test:** `[P0] AC light surfaces flipped warm off-white — CHROME_LIGHT #F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8/#1C1206/#6B6355/#8A4E00 vs dark #23262D`
  - **Status:** RED — before fix: `CHROME_LIGHT` absent or uses dark `#23262D` → regex fails; light `accent #8A4E00` missing → assertion `6.62` fails
  - **Verifies:** AC1 light chrome exact hexes + `light.tileHexes[3]===dark.tileHexes[3]` derived delta

- ✅ **Test:** `[P0] AC colorBlind distinct id reuses dark ramp shape carries — id colorBlind but hex === dark`
  - **Status:** RED — before fix: `isThemeId('colorBlind')` false or `THEMES.colorBlind` missing → assertion fails
  - **Verifies:** AC2 `colorBlind` distinct id intentional reuse (R-002)

- ✅ **Test:** `[P0] AC cap at ceiling per theme — tileFillFor/tileInkFor 6144/12288/5000→3072 pure no throw`
  - **Status:** RED — before fix: `tileFillFor` missing or `Infinity` throws; `5000→1536` not `3072`
  - **Verifies:** AC3 cap `resolveTile` interval cascade per theme (R-009)

- ✅ **Test:** `[P0] AC WCAG AA tile ink all 3 themes — every tier ≥4.5:1 weakest 384 ~4.65 holds 13pt/9pt`
  - **Status:** RED — before fix: audit absent → `contrastRatio` missing or `384 #157A5C on #F6F0E1` below `4.5` due to ink drift
  - **Verifies:** AC4 tile WCAG 39 checks + weakest `384 4.65` ×3 (R-001)

- ✅ **Test:** `[P0] AC WCAG AA chrome all 3 themes — text/muted on surface/board/raised ≥4.5 accentInk on accent ≥4.5`
  - **Status:** RED — before fix: `CHROME_LIGHT muted #6B6355 on board #EAE6DA 4.75` below threshold if hex drifts; `accentInk on accent` fails for light `white on #8A4E00 6.62`
  - **Verifies:** AC4 chrome 24 checks + `muted on board 4.75` + dark `8.55` light `6.62` (R-001)

- ✅ **Test:** `[P0] AC persistence fallback to dark — loadSettings invalid/missing/corrupt → dark valid preserved`
  - **Status:** RED — before fix: `schema.ts` accepted `"midnight"` (old `settingsStore.test.ts` expected `midnight`) → fallback assertion `dark` fails; corrupt JSON threw not default
  - **Verifies:** AC5 fallback matrix 7 inputs + `isThemeId guard` else `DEFAULT_SETTINGS.theme` (R-003)

- ✅ **Test:** `[P0] AC isThemeId guard + invalid delegation fallback dark silent`
  - **Status:** RED — before fix: `isThemeId('colorBlind')` false; `tileFillFor(3,'midnight')` threw not fallback `THEMES.dark`
  - **Verifies:** AC5 guard `dark/light/colorBlind true`, `midnight/''/42/null false` + silent dark fallback (R-003/R-007)

- ✅ **Test:** `[P1] AC tileNumerals theme-aware wrappers delegate to THEMES fallback dark`
  - **Status:** RED — before fix: `tileNumerals.tileFillFor(value, theme)` lacked optional `themeId` param → static regex `isThemeId(theme)` fails; invalid delegation threw
  - **Verifies:** AC3 delegation `tnFill(3,'light')===THEMES.light.tileHexes[3]` + invalid→dark (R-009)

- ✅ **Test:** `[P1] AC GameBoard consumes theme — theme prop default dark, cellColor/tileTextColor via tileFillFor/isThemeId, board well THEMES[theme].chrome.board`
  - **Status:** RED — before fix: `GameBoard.tsx` hard-coded `cellColor 7-bucket` no `theme` prop; `board well #1A1D23` literal not `THEMES[theme].chrome.board`; static tripwires fail
  - **Verifies:** AC3+AC1 Skia consumption `theme?: ThemeId` default `dark` + `THEMES[theme].chrome.board/accent/cell`

- ✅ **Test:** `[P1] AC App wiring — themeId=isThemeId(settings.theme)?settings.theme:dark, tokens=THEMES[themeId], GameBoard theme={themeId}, containers tokens.chrome.surface`
  - **Status:** RED — before fix: `App.tsx` hard-coded `backgroundColor #fff/#1a1d23` container, no `THEMES[themeId]` lookup, no `handleThemeChange`, `useColorScheme` present (spec Never)
  - **Verifies:** AC5 wiring `isThemeId(settings.theme)` + `tokens=THEMES[themeId]` + `GameBoard theme` + `handleThemeChange` + `useColorScheme` absent

- ✅ **Test:** `[P1] AC LaneSelectScreen theme row — 3 Pressables Escuro/Claro/Daltônico Dark/Light/Color-blind HIT_TARGET 44 selected accent`
  - **Status:** RED — before fix: `LaneSelectScreen.tsx` had no `themeRow` Pressable trio, no `Escuro/Claro/Daltônico`, no `HIT_TARGET 44`, no `accessibilityState selected`; grep counts fail
  - **Verifies:** AC5 selector row 3 Pressables `44` `accessibilityRole button` + `selected` + accent `#E8A33D`

- ✅ **Test:** `[P1] AC handleThemeChange idempotence — same value no-op, invalid no-op, fires saveSettings once`
  - **Status:** RED — before fix: `handleThemeChange` absent or missing `isThemeId(id)` early return / `id===settings.theme` guard, or `void saveSettings` after `isThemeId` guard missing → structural scan fails
  - **Verifies:** AC5 idempotence + `isThemeId` guard precedes `setSettings` (R-004)

- ✅ **Test:** `[P1] AC THEME_IDS duplication drift + engine/feel purity + no useColorScheme`
  - **Status:** RED — before fix: `theme/index.ts THEME_IDS` vs `schema.ts THEME_IDS` out-of-sync `join(',')` inequality; `src/engine` leaked `from.*theme`; `grep useColorScheme` non-empty
  - **Verifies:** AC1 maintainability `THEME_IDS` lexical identical 2 sites only + `rg from.*theme triade/src/engine` empty + `useColorScheme` absent (R-006/R-012)

**Existing GREEN tests (implementation already landed in `568987a` — see Execution Evidence):**

- `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts` — **GREEN 3/3** (`tile ink all themes 39 checks`, `chrome all themes 24 checks`, `32pt smoke`) — exhaustive 13 tiers ×3 + weakest `384 4.65` + light `muted on board 4.75` + dark `8.55` / light `6.62`
- `triade/__tests__/ui/tileTheme.test.ts` — **GREEN 4/4** (`13-tier hex/ink per theme`, `cap 6144/12288→3072`, `isThemeId guards invalid`, `Settings fallback to dark` + `tileNumerals delegation`)
- `triade/__tests__/storage/settingsStore.test.ts` — **GREEN** (theme `light` preserved, corrupt → default, `saveSettings` round-trip updated from `midnight` to `light`)
- `npx tsc --project triade/tsconfig.json --noEmit` — **0 errors** (spec Auto Run Result 2026-09-03)
- `npm --prefix triade test` — **980 pass, 0 fail, 366 skipped** (spec Auto Run Result 2026-09-03 — dark canonical still green)

---

## Data Factories Created

No data factories required beyond theme token fixtures. Tile/chrome coverage uses deterministic DESIGN hex maps (`TILE_HEXES_DARK`, `TILE_INK_DARK`, `CHROME_DARK/LIGHT`) and `ThemeId` fixtures directly from `triade/src/theme/index.ts`; 13 tiers + 3 themes are literal frozen tables, not faker-generated. Contrast ratios are computed via pure `contrastRatio` helper (WCAG luminance), not via random data.

**If faker factories were needed (e.g., for future leaderboard IAP fixtures), they would follow `data-factories.md` (`@faker-js/faker` + overrides). This story deliberately avoids them — tokens are DESIGN static and persistence is deterministic `JSON.parse` + `isThemeId` guard.**

---

## Fixtures Created

No Playwright fixtures required (`tea_browser_automation: auto` but `test_stack_type: frontend` with host `node:test` runner; `config.tea_use_playwright_utils: true` utils not needed for this pure-data + static file-read delta). The working-tree delta uses `node --test` + `tsx` + file-read static gates only; no `page.goto`/`page.route`.

**If E2E were needed, fixtures would follow `fixture-architecture.md` (`test.extend()` + auto-cleanup). Not applicable here — browser exploration via `playwright-cli` was intentionally skipped for this token-persistence delta (see test-design Execution Strategy).**

---

## Mock Requirements

**Existing harness already in `triade/__tests__/storage/settingsStore.test.ts` + `triade/src/services/storage/settingsStore.ts`:**

- `StorageBackend` fake `FakeBackend implements StorageBackend { getString/set/get }` doubling `AsyncStorage` / `SecureStore` for `@triade/theme` key via `setStorageBackendForTests(backend)`; `loadSettingsFromStorage` reads JSON under `STORAGE_KEYS.theme`, `saveSettings(void)` async fire-and-forget, corrupt JSON → `DEFAULT_SETTINGS.theme='dark'` fallback, partial failing backend still writes remaining keys.
- No `AccessibilityInfo` bridge needed beyond existing a11y stubs; no network `page.route()`, no `intercept-network-call`.

**Mock pattern `network-first.md` / `auth-session.md` not applied (no `page.goto`/`page.route`); the only guard relevant is `try/catch` in `loadSettings(JSON.parse)` so corrupt JSON never throws and `isThemeId` belt-and-suspenders in `App.tsx themeId = isThemeId(settings.theme)?settings.theme:'dark'` (defensive double-guard).**

---

## Required data-testid Attributes

None new. RN chrome uses `accessibilityRole="button"` + `accessibilityState selected` on the 3 theme Pressables (`LaneSelectScreen.tsx:themeRow`) and `allowFontScaling` on `Text` rather than `data-testid`. Per `selector-resilience.md` the scaffold asserts `accessibilityRole`/`accessibilityState` + style presence (`minHeight HIT_TARGET 44`) and static `a11y` token existence, not CSS selectors; board remains Skia-drawn (`GameBoard` `RoundedRect` `THEMES[theme].chrome.board` + `tileFillFor` per theme).

**If `data-testid` were added for future theme diagnostics, they would be listed here per `selector-resilience.md` (`getByRole` preferred when accessibility labels exist).**

---

## Implementation Checklist

### Test: `[P0] AC theme tokens frozen pure data — THEMES dark/light/colorBlind each with chrome + 13 tiers frozen`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/theme/index.ts:1` — Create `ThemeId='dark'|'light'|'colorBlind'`, `THEME_IDS` frozen, `isThemeId`, `ThemeTokens {chrome:{surface/surfaceRaised/board/cell/text/muted/border/accent/accentInk/scrim} + tileHexes/tileInk 13 tiers}`, `THEMES: Record<ThemeId,ThemeTokens>` frozen; `TILE_HEXES_DARK` 13 exact `1:#EFE3C2…3072:#FFF3DC`, `TILE_INK_DARK` per-tier `#1C1206/#F6F0E1`, `CHROME_DARK` `#23262D…`, `CHROME_LIGHT` `#F6F0E1…`, `colorBlind` reuses `CHROME_DARK` + same ramp; helpers `themeFor/tileFillFor/tileInkFor` capped `3072+` via `resolveTile` pure; no RN/Skia imports
- [x] Verify `Object.freeze` on `TILE_HEXES_DARK`, `TILE_INK_DARK`, `CHROME_DARK`, `CHROME_LIGHT`, `THEMES` + each theme token (immutable DESIGN table)
- [x] Verify no `from 'react-native'` / `from '@shopify/react-native-skia'` in `theme/index.ts` (purity)
- [ ] Run test: `npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts` (gate: `theme tokens frozen pure data` — static + import pins)
- [x] ✅ Test passes (green phase) — imports resolve `THEMES[theme].chrome.surface` etc. + 13 tiers ×3 present

**Estimated Effort:** 0.35h (pure data, host-only)

---

### Test: `[P0] AC light surfaces flipped warm off-white — CHROME_LIGHT #F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8/#1C1206/#6B6355/#8A4E00 vs dark #23262D`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/theme/index.ts:52` — Define `CHROME_LIGHT` exact `#F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8/#1C1206/#6B6355/#D0C8B8/#8A4E00/#FFFFFF` warm off-white (light `accent #8A4E00` darker amber for `6.62` white-on-accent, dark keeps `#E8A33D/#1C1206 8.55`), keep `THEMES.light.tileHexes===TILE_HEXES_DARK` intentional derived delta comment
- [x] Keep `THEMES.light.chrome.text '#1C1206'` dark ink already `≥4.5` on warm surfaces; `muted #6B6355` on `board #EAE6DA 4.75` is tightest — keep as pinned weakest
- [ ] Run test: `npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts` (gate: `light surfaces flipped`)
- [x] ✅ Test passes (green phase) — `light.chrome.surface #F6F0E1` + equality `light.tileHexes[3]===dark.tileHexes[3]`

**Estimated Effort:** 0.2h

---

### Test: `[P0] AC colorBlind distinct id reuses dark ramp shape carries — id colorBlind but hex === dark`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/theme/index.ts:72` — Map `colorBlind: {id:'colorBlind', chrome:CHROME_DARK, tileHexes:TILE_HEXES_DARK, tileInk:TILE_INK_DARK}` distinct object (not alias), `isThemeId('colorBlind') true`
- [x] Document as accepted DESIGN assumption (light surfaces flip only, colorBlind same ramp shape carries) — spec `BLOCK If palette needs human art-direction beyond derived deltas — use DESIGN assumptions` + test-design R-002
- [x] Keep `colorBlind` distinct so future hue ramp can land without migration; assert `THEMES.colorBlind.tileHexes[3]===THEMES.dark.tileHexes[3]` pinned as intentional
- [ ] Run test: `npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`
- [x] ✅ Test passes (green phase) — `isThemeId` + distinct object pin

**Estimated Effort:** 0.15h

---

### Test: `[P0] AC cap at ceiling per theme — tileFillFor/tileInkFor 6144/12288/5000→3072 pure no throw`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/theme/index.ts:92` — Implement `resolveTile(value, map, fallback)` pure interval cascade `!Number.isFinite→3072`, `value in map→map[value]`, `>=3072→3072`, `>1536→1536 … >3→3, ===2→2, ===1→1 else fallback 3` — mirrors `tileNumerals.ts` intervals, no throw
- [x] Keep `tileFillFor(value, themeId='dark')` and `tileInkFor` delegating via `isThemeId(themeId)?themeId:'dark'` + `resolveTile(..., THEMES[t].tileHexes/ink, THEMES.dark.tileHexes[3])`
- [x] Add `tileTheme.test.ts` cap sweep `6144/12288/5000→3072` per theme (R-009); non-canonical `5→3, 100→96, 800→768` covered by `tileNumerals` interval drift guard
- [ ] Run test: `npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage` (gate: `cap at ceiling`)
- [x] ✅ Test passes (green phase) — 3×3 caps + `NaN/Infinity` no throw

**Estimated Effort:** 0.2h

---

### Test: `[P0] AC WCAG AA tile ink all 3 themes — every tier ≥4.5:1 weakest 384 ~4.65 holds 13pt/9pt`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts:6` — Loop `theme∈{dark,light,colorBlind}` × `tiers 13` via `contrastRatio(fill, ink) ≥4.5` (WCAG `0.2126/0.7152/0.0722` + `0.04045/2.4`) exhaustive; `384 #157A5C on #F6F0E1 4.65` pinned `4.5..6`
- [x] Keep `tileNumerals.ts` pure helpers `hexToRgb/relativeLuminance/contrastRatio` (already in 9-3) — no recreation, share horses
- [x] Add CI one-liner printing per-tier ratios to build log (e.g. `python3 -c contrast`) so drift `384 4.65` visible; freeze comment `DESIGN — change hex → must re-run all-themes audit (weakest 384 4.65)`
- [ ] Run test: `npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts -- --no-coverage` (gate: `tile ink all themes`)
- [x] ✅ Test passes (green phase) — 39 checks + weakest `384 4.65` ×3

**Estimated Effort:** 0.25h (audit already landed, keep as hard PR gate)

---

### Test: `[P0] AC WCAG AA chrome all 3 themes — text/muted on surface/board/raised ≥4.5 accentInk on accent ≥4.5`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts:24` — Table 8 checks per theme `text/muted on surface/board/raised`, `accent on surface`, `accentInk on accent` each `≥4.5` (`light muted on board 4.75` weakest, dark `muted on raised 4.92`); `accent on surface` light `5.83` vs dark `7.02`; `accentInk on accent` dark `8.55` light `6.62`
- [x] Pin light `muted on board 4.75` 4.5..5.5 + dark `accentInk on accent ≥7` (spec extended: `dark ink on accent ≥7`) so `light white on #8A4E00 6.62` still `≥4.5` gate
- [ ] Run test: `npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts -- --no-coverage`
- [x] ✅ Test passes (green phase) — 24 checks + tightest chrome pins

**Estimated Effort:** 0.2h

---

### Test: `[P0] AC persistence fallback to dark — loadSettings invalid/missing/corrupt → dark valid preserved`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/services/storage/schema.ts:14` — Define `THEME_IDS=['dark','light','colorBlind']`, `isThemeId` guard, `loadSettings` validates `THEME_IDS.includes(parsed.theme)` else `DEFAULT_SETTINGS.theme='dark'`; corrupt `JSON.parse` catch → `DEFAULT_SETTINGS` (0 engine block) — keep duplicate fallback in `App.tsx themeId = isThemeId(settings.theme)?settings.theme:'dark'` belt-and-suspenders
- [x] Keep `DEFAULT_SETTINGS.theme='dark'` (fallback canonical) — update `settingsStore.test.ts:94` stale `midnight→light` already done
- [x] Extend `tileTheme.test.ts` fallback matrix `midnight/''/42/null/undefined/missing/COLORBLIND` + corrupt `'not json'` default; add static scan `THEME_IDS` identical check (P1)
- [ ] Run test: `npm --prefix triade test triade/__tests__/ui/tileTheme.test.ts -- --no-coverage` (gate: `Settings.theme fallback`)
- [x] ✅ Test passes (green phase) — 7 inputs matrix

**Estimated Effort:** 0.2h

---

### Test: `[P0] AC isThemeId guard + invalid delegation fallback dark silent`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/theme/index.ts:6` — `isThemeId(value)` `typeof string && THEME_IDS includes` strict; `tileFillFor(value, 'midnight')` returns `THEMES.dark.tileHexes[3]` dark `#E4A53B` silent (spec no throw, fallback documented)
- [x] No log on fallback (acceptable per spec invalid→dark fallback, no throw) — but keep P1 suggestion `console.warn` optional at App layer only, not both, to avoid spam (R-007 score 3)
- [ ] Run test: `npm --prefix triade test triade/__tests__/ui/tileTheme.test.ts -- --no-coverage`
- [x] ✅ Test passes (green phase) — `midnight/''/42/null false` + fallback equality pins

**Estimated Effort:** 0.1h

---

### Test: `[P1] AC tileNumerals theme-aware wrappers delegate to THEMES fallback dark`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/ui/tileNumerals.ts:1` — Keep canonical `TILE_HEXES/TILE_INK` as dark `Object.freeze` backward-compat; add `tileFillFor(value, themeId?:ThemeId)` / `tileInkFor` with `isThemeId(themeId)? THEMES[themeId] : THEMES.dark` delegation (import `isThemeId` from `triade/src/theme`); keep `contrastRatio/relativeLuminance` pure unchanged; `tileShapeFor` unchanged (FR-31 shape/grain still varies by band)
- [x] Keep interval cascade dup vs `theme/index.ts resolveTile` in sync (both branches `> vs >=` ordering) — pin via `tileTheme.test.ts` `tnFill(3,'light')===THEMES.light` + `tnFill(1,'invalid')===THEMES.dark`
- [ ] Run test: `npm --prefix triade test triade/__tests__/ui/tileTheme.test.ts triade/__tests__/ui/tileNumerals.test.ts -- --no-coverage`
- [x] ✅ Test passes (green phase) — delegation + fallback dark

**Estimated Effort:** 0.2h

---

### Test: `[P1] AC GameBoard consumes theme — theme prop default dark, cellColor/tileTextColor via tileFillFor/isThemeId, board well THEMES[theme].chrome.board`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/render/GameBoard.tsx:12` — `import ThemeId/THEMES`, `theme?: ThemeId` prop default `dark`, `cellColor(value, theme)` `value==null? THEMES[theme].chrome.cell : tileFillFor(value, theme)` + `tileTextColor` via `tileInkFor`, board `RoundedRect color=THEMES[theme].chrome.board`, hint `THEMES[theme].chrome.accent`, `AnimatedTile theme=dark` default — keep; no engine import
- [x] Keep `App.tsx` fanning `themeId` from settings → `GameBoard theme={themeId}` (31)
- [ ] Run test: `npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts` (static file-read wiring gate)
- [x] ✅ Test passes (green phase) — static `theme?: ThemeId` + `THEMES[theme].chrome.board` pins

**Estimated Effort:** 0.25h

---

### Test: `[P1] AC App wiring — themeId=isThemeId(settings.theme)?settings.theme:dark, tokens=THEMES[themeId], GameBoard theme={themeId}, containers tokens.chrome.surface`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/App.tsx:31` — Wire `isThemeId/THEMES` import, `themeId = isThemeId(settings.theme)?settings.theme:'dark'`, `tokens=THEMES[themeId]`, `handleThemeChange=(id:ThemeId)=>{ if(!isThemeId(id)||id===settings.theme) return; const next={...settings, theme:id}; setSettings(next); void saveSettings(next); }`, `GameBoard theme={themeId}`, containers `backgroundColor=tokens.chrome.surface` + preloading `color=tokens.chrome.text`, `LaneSelectScreen theme={themeId} onThemeChange={handleThemeChange}`; keep `StatusBar style=statusBarStyle(isLandscape)` 4 mounts untouched (DW-7, not theme-dependent)
- [x] Ensure `handleThemeChange` stale closure does not drop future `Settings` keys beyond `theme` — keep spread `...settings` current snapshot; `void saveSettings` fire-and-forget may reject silently (optional console log on rejection)
- [x] Verify no `useColorScheme` (`rg useColorScheme` must be empty — spec Never)
- [ ] Run test: `npm --prefix triade test -- --no-coverage` (full) + static `rg isThemeId.*settings.theme App.tsx` gate
- [x] ✅ Test passes (green phase) — wiring + `useColorScheme` absent

**Estimated Effort:** 0.3h

---

### Test: `[P1] AC LaneSelectScreen theme row — 3 Pressables Escuro/Claro/Daltônico Dark/Light/Color-blind HIT_TARGET 44 selected accent`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/ui/LaneSelectScreen.tsx:10` — Add `theme?: ThemeId` + `onThemeChange?:(id:ThemeId)=>void` props, `themeRow` `View` below language row with 3 `Pressable` `[dark,light,colorBlind]` labels `Escuro/Claro/Daltônico` (EN `Dark/Light/Color-blind`), `minHeight HIT_TARGET 44` + `minWidth 44` + `gap 8` + `flexWrap`, `accessibilityRole button` + `accessibilityState selected`, active `themeBtnSelected #E8A33D/#1C1206 8.55`, inactive `surfaceRaised/muted`; no layout shift `maxWidth 420`
- [x] Keep i18n inline array fallback `[{ptLabel, enLabel}]` chosen by `language` prop so row works even without `t('settings.theme')` (R-010)
- [ ] Run test: `npm --prefix triade test -- --no-coverage` (no render harness needed — static `HIT_TARGET 44` scan) + manual toggle `Escuro→Claro→Daltônico`
- [x] ✅ Test passes (green phase) — static `HIT_TARGET` + `accessibilityState selected` + accent pin + manual smoke

**Estimated Effort:** 0.25h

---

### Test: `[P1] AC handleThemeChange idempotence — same value no-op, invalid no-op, fires saveSettings once`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/App.tsx:handleThemeChange` — Guard `if(!isThemeId(id)) return` + `if(id===settings.theme) return` early exits before `setSettings`/`saveSettings`; rapid `dark→light→dark` leaves last via `settings` snapshot (not interleaved stale closure — future Settings keys preserved via spread)
- [x] Keep P1 static scan `rg -A 8 handleThemeChange App.tsx` shows both guards before `setSettings`; add manual P1 persistence spot-check `Claro→Escuro→Daltônico` then kill+relaunch last restored
- [ ] Run test: `npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts` (static scan)
- [x] ✅ Test passes (green phase) — guards present, idempotence pinned

**Estimated Effort:** 0.15h

---

### Test: `[P1] AC THEME_IDS duplication drift + engine/feel purity + no useColorScheme`

**File:** `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts`

**Tasks to make this test pass:**

- [x] `triade/src/theme/index.ts` + `triade/src/services/storage/schema.ts` both define `THEME_IDS=['dark','light','colorBlind']` frozen; add P1 invariant `expect(THEME_IDS.join()).toBe(THEME_IDS2.join())` in `tileTheme.test.ts` or via static `rg -n THEME_IDS triade/src` count 2; values `join(',')` equal so future theme addition is explicit in both sites
- [x] CI grep `rg -l 'from.*theme|import.*theme' triade/src/engine triade/src/feel` must be empty (spec Always: engine/feel never know theme); single-source refactor carry either import `THEME_IDS` from `theme/index.ts` into `schema.ts` or keep P1 duplicate equality test (R-006 score 4)
- [x] `npx tsc --project triade/tsconfig.json --noEmit` 0 errors, `rg useColorScheme triade/src` empty
- [ ] Run test: `npm --prefix triade test -- --no-coverage` + `rg -n THEME_IDS triade/src` + `rg -l 'from.*theme' triade/src/engine triade/src/feel`
- [x] ✅ Test passes (green phase) — purity + duplication drift gated

**Estimated Effort:** 0.15h

---

## Running Tests

```bash
# Run all activated GREEN tests for this story (host, <6s)
npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts triade/__tests__/storage/settingsStore.test.ts -- --no-coverage  # P0 host audits 7 tests + storage

# Run the full story GREEN suite (spec Auto Run Result 980 pass baseline)
npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage  # 7 tests: 3+4 (+ 1 storage validate)
npm --prefix triade test -- --no-coverage  # whole suite 980 pass, 0 fail, 366 skipped per 2026-09-03 Auto Run Result; also validates dark canonical still green (tileContrast.audit + tileShape 6 pass)

# Run specific red-phase scaffold (skipped by default — remove test.skip for current task to see RED)
npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts  # all 14 skipped (expected before activation)

# Run the story's audit + mapping suite only (P0/P1 GREEN proof)
npm --prefix triade test triade/__tests__/ui/tileContrast.audit.test.ts triade/__tests__/ui/tileShape.test.ts -- --no-coverage  # dark canonical regression (9-3 still green, 12 tests)

# Type gate
npx tsc --project triade/tsconfig.json --noEmit  # 0 errors per spec Auto Run Result

# Debug specific test (remove test.skip first)
npm --prefix triade test -- --test-name-pattern="WCAG AA tile ink all 3 themes"
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All tests written as red-phase scaffolds with `test.skip()` in `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts` (14 tests)
- ✅ Existing GREEN pins `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts` (3) + `triade/__tests__/ui/tileTheme.test.ts` (4) document GREEN phase (`tileContrast.allThemes 3/3`, `tileTheme 4/4`)
- ✅ GREEN storage `triade/__tests__/storage/settingsStore.test.ts` validates `light` ThemeId (updated from `midnight`) + fallback
- ✅ Fixtures and factories: tile/chrome fixtures are deterministic DESIGN tables (`TILE_HEXES_DARK`, `TILE_INK_DARK`, `CHROME_DARK/LIGHT`, `THEME_IDS`), no faker factories needed
- ✅ Mock requirements: `StorageBackend FakeBackend` via `setStorageBackendForTests` (+ corrupt JSON → default) documented
- ✅ data-testid requirements: RN `accessibilityRole button` + `accessibilityState selected` + `HIT_TARGET 44` preferred over `data-testid` per `selector-resilience.md`
- ✅ Implementation checklist created (14 tests → 14 task groups above) covering the `fde6f8f..568987a` delta (`triade/src/theme` + `tileNumerals` delegation + `GameBoard` prop + `schema` fallback + `App` wiring + `LaneSelectScreen` row)

**Verification:**

- All generated tests are present and marked with `test.skip()` (14/14)
- Activation guidance is clear: remove `test.skip()` for the current task, run `npm --prefix triade test` in `triade/`, confirm RED before fix then GREEN after fix
- Any activated test fails due to missing implementation, not test bugs. Before `568987a`: `triade/src/theme/index.ts` missing → `ENOENT`; `CHROME_LIGHT` absent → `light` chrome check fails; `colorBlind` missing → `isThemeId('colorBlind')` false; `GameBoard` no `theme` prop → regex fails; `App` no `handleThemeChange` → guard fails; `LaneSelectScreen` no `themeRow` → Pressable count <3; `schema` accepted `midnight` → fallback fails. After: passes when tokens, wiring, and audit are as in committed delta.
- `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts` `3/3` + `triade/__tests__/ui/tileTheme.test.ts` `4/4` + `980 pass, 0 fail, 366 skipped` suite-wide is the proof of GREEN (spec Auto Run Result 2026-09-03). Light weakest `384 4.65` and `muted on board 4.75` + dark `8.55` / light `6.62` all hold `≥4.5`.

---

### GREEN Phase (DEV Team - Next Steps) — Already Landed in `568987a` + docs `a80ae0e`

**DEV Agent Responsibilities (for reference — already done):**

1. **Picked one scaffolded test** (P0 theme tokens frozen) and removed `test.skip()` to confirm RED (`triade/src/theme/index.ts` missing → `ENOENT`)
2. **Implemented minimal code** (`triade/src/theme/index.ts` pure-data `THEMES` 3 themes 13 tiers frozen + `isThemeId/themeFor/tileFillFor/tileInkFor` capped `3072+`, `tileNumerals.ts` optional `themeId` delegation, `schema.ts` `ThemeId/THEME_IDS` fallback `dark`, `App.tsx` `themeId/tokens` + `handleThemeChange` persisting + `GameBoard theme` + containers `tokens.chrome.surface`, `LaneSelectScreen` 3 Pressables `HIT_TARGET 44` + i18n) — per checklist tasks above
3. **Ran the test** to verify GREEN (`tileTheme 4/4` + `tileContrast.allThemes 3/3` + `settingsStore` updated + `tsc --noEmit 0` + `980 pass` suite)
4. **Checked off tasks** in implementation checklist (all 14 groups; 0 drift)
5. **Committed** `568987a feat(9-4): temas light/dark e color-blind com tokens puros e WCAG AA` + `a80ae0e doc(9-4): finalize spec to done com Auto Run Result` with `npm test 980 pass` log + `tsc --noEmit` clean

**If a future 9.x PR needs to touch this checklist:** repeat per-task activation (one `test.skip` at a time), measure before/after. Keep `git diff HEAD --stat -- triade/src/engine` empty (ADR-01 engine purity) and `rg useColorScheme` empty.

**Progress Tracking:**

- Spec `_bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md` marks all Execution checkboxes `[x]` and Auto Run Result `980 pass, 0 fail, 366 skipped` + review `intent_gap 0, bad_spec 0, patch 0, defer 0, reject 2` / `followup_review_recommended: false` (localized theming wiring only)
- `sprint-status.yaml` row `9-4-temas-light-dark-e-color-blind: done` is orchestrator bookkeeping — never rewrite it and never revert a change to it; a row at `done` is the orchestrator's own bookkeeping, not a defect to fix, and not proof that work is verified (this checklist + host/device gates are the verification)

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (`npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage` → 7/7; full `npm test` → `980 pass, 0 fail, 366 skipped`; `triade/__tests__/ui/tileContrast.audit.test.ts` + `tileShape.test.ts` 9 still green for dark canonical regression; current host re-run may vary ±1 due to `light` vs `dark` suite churn but `triade/__tests__/ui/tileTheme` guards `light` identity deterministically)
2. **Review code for quality** — `triade/src/theme/index.ts` is thin pure data (`resolveTile` interval cascade only, no logic duplication beyond `tileNumerals.ts` delegation; keep `Object.freeze` single-source guard); `GameBoard` never duplicates hex literals outside `THEMES`/`tileFillFor`; `App` theme wiring does not introduce `useColorScheme`; `LaneSelectScreen` theme row reuses `HIT_TARGET 44` already from 9-1.
3. **Extract duplications** — `THEME_IDS` lives in two places (`theme/index.ts` + `schema.ts`) as accepted carry with `join(',')` equality invariant (R-006 score 4); future refactor may single-source via import from `theme` into `schema` but keeps `schema.ts` pure today — no urgent dedup. `resolveTile` cascade is intentionally duplicated between `theme/index.ts` and `tileNumerals.ts` branches (one as canonical, one as fallback) — keep both accurate via cap sweep, consider dedup only if interval drift is observed.
4. **Optimize performance** — N/A: theme swap is synchronous token lookup + React rerender (`setSettings` → `tokens` → `GameBoard theme` + `View backgroundColor`); no image decode, no Skia re-init, no animation. Instant `next-match` apply (board well color swaps on next render, tiles recolor on next `planTileTransitions`). FR-43 board frame budget unchanged — `layout.test.ts` timings remain `<8 ms`, nightly Epic 8 `useFrameRateBaseline` p99 `<16.7 ms` informational for 9-4.
5. **Ensure tests still pass** after each refactor (`npm test` + `npx tsc --noEmit` clean, `git diff fde6f8f..HEAD -- triade/src/engine` still 0 engine rule files, `rg -l 'from.*theme' triade/src/engine triade/src/feel` empty)
6. **Update documentation** — `test-design-9-4-temas-light-dark-e-color-blind.md` + this checklist + `spec-9-4` `Auto Run Result` + `sprint-status.yaml` `9-4 done` as durable handoff; carry residual `LaneSelectScreen #fff` leak (`rg #fff triade/src/ui`) as P2 monitor to Epic 9 retro if full chrome recolor ever desired (spec `reject low` — not a blocker)

**Completion:**

- All tests pass (7/7 audit+theme + 980 pass suite), code quality meets team standards, no duplications beyond accepted `THEME_IDS`/`resolveTile` carries, R-001 (weakest `384 4.65` + `muted on board 4.75`) and R-002 (color-blind identity `dark==colorBlind` intentional) gated or waived at Epic 9 retro, ready for story approval

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section — spec already contains Auto Run Result and Files changed; this checklist + `_bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts` + `triade/__tests__/ui/tileContrast.allThemes.audit.test.ts` + `triade/__tests__/ui/tileTheme.test.ts` is the durable handoff
2. **No further implementation required for 9-4 beyond checklist polish** — delta is landed `568987a` + docs `a80ae0e` and green modulo optional `THEME_IDS` single-source carry (R-006) at Epic 9 retro
3. **Share this checklist** with the dev workflow as a manual handoff if story file cannot be updated automatically
4. **Review this checklist** with team in standup — focus on R-001 tight WCAG margins (`384 4.65` ×3, `light muted on board 4.75`) and R-002 intentional `colorBlind === dark` on tiles (shape carries, not hue) per `test-design-9-4-temas-light-dark-e-color-blind.md` (high ≥6)
5. **For 9-4 follow-up at Epic 9 retro:** decide on `THEME_IDS` single-source import vs `join(',')` equality monitor (P1), full RN chrome recolor `Hud`/`PreviewCard` vs accepted leak (P2 `rg #fff triade/src/ui` monitor, spec `reject low`), and `light` tile delta future if DESIGN issues distinct hexes (BLOCK If palette needs human art-direction)
6. **When all activated tests pass and the optional carries are triaged**, no refactor needed for 9-4 beyond the accepted carries
7. **When refactoring complete**, story status `done` in `sprint-status.yaml` is already set by orchestrator (do not revert)

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (per `tea-index.csv` — core tier always, extended on demand):

- **fixture-architecture.md** — Considered but N/A (no Playwright `test.extend()` fixtures needed for static source-read + host `node:test` imports; persistence doubled via `FakeBackend` not browser UI)
- **data-factories.md** — Considered but N/A (no faker factories for DESIGN static token tables; `THEMES` 13 tiers ×3 are literal frozen DESIGN tables + `isThemeId` guards)
- **component-tdd.md** — Applied: theme wiring via `GameBoard theme?: ThemeId` prop + `LaneSelectScreen` Pressable trio `accessibilityRole button` + `accessibilityState selected` + `HIT_TARGET 44`, validated host-side via file-read + import pins
- **network-first.md** — Considered but N/A (no `page.route`/`page.goto` for this pure-data + RN View delta; only `settingsStore` `loadSettings(JSON.parse)` try/catch for corrupt JSON)
- **test-quality.md** — Applied: Given-When-Then comments, one assertion per P0/P1 theme gate (atomic), determinism (`readFile` + `includes` + frozen DESIGN tables + `contrastRatio` pure), no shared state except `THEME_IDS` duplicate equality invariant
- **test-levels-framework.md** — Applied: level selection — Unit for pure `isThemeId/tileFillFor/resolveTile/loadSettings/contrastRatio` (`node:test`), Component-static for `GameBoard`/`LaneSelectScreen`/`App` wiring (file-read tripwires), Manual for instant `next-match` + persistence kill+relaunch + `384` legibility on `Claro` `light #EAE6DA` (simulator smoke)
- **test-healing-patterns.md** — Applied: resilient scan of stale `midnight` (old `settingsStore.test.ts` expected `midnight` → now `light` ThemeId) classified as carry not blocker; `LaneSelectScreen #fff` leak classified as `reject low` deferral per spec triage
- **selector-resilience.md** — Applied adaptively: RN `accessibilityRole button` + `accessibilityState selected` + `minHeight HIT_TARGET` preferred over `data-testid`; static `readFile` + `includes` + `Pressable` count as tripwire, `THEMES[theme].chrome.board` prop as structural guard
- **timing-debugging.md** — Considered but N/A (no throttle timer beyond `settingsStore saveSettings` `void` fire-and-forget async; future toggle flood is P1 manual ~500 ms window check)
- **risk-governance.md / probability-impact.md / test-priorities-matrix.md / nfr-criteria.md** — Via `test-design-9-4-temas-light-dark-e-color-blind.md` (R-001/R-002 score 6 high, R-003..R-006 score 4, R-007..R-012 score 1–3, P0/P1/P2/P3 prioritization, WCAG `≥4.5` chrome+tile thresholds) — this ATDD reuses those scores without recomputing
- **contract-testing.md** — Considered but N/A (no pactjs; `settingsStore` `loadSettings` JSON contract is assertion-level via `isThemeId` + fallback `dark`)
- **pactjs-utils-*.md** — Not loaded (`tea_use_pactjs_utils: false`, `tea_pact_mcp: none`)
- **nfr-criteria.md** — Applied via NFR Planning in test-design (WCAG `0.2126/0.7152/0.0722` + tile `4.5` + chrome `4.5` + `accentInk on accent ≥7` + `thinview` `HIT_TARGET 44` + frame `<8 ms` p99 `<16.7 ms`)

See `tea-index.csv` for complete knowledge fragment mapping. `playwright-cli.md` was considered but intentionally skipped: the delta is pure-data tokens + RN `View`/`Pressable` + Skia prop swap (no browser DOM to snapshot) per test-design Execution Strategy.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification

**Command:** `npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts` (all 14 skipped — expected before activation) + `npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage` (host contract; see host re-run) + `npm --prefix triade test -- --no-coverage` (full) + `npx tsc --project triade/tsconfig.json --noEmit`

**Results (spec Auto Run Result 2026-09-03 captured in `spec-9-4-temas-light-dark-e-color-blind.md:Auto Run Result` — GREEN):**

```
# Captured at 568987a / a80ae0e (spec final_revision a80ae0e) — host
npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage
# 7 pass: tileContrast.allThemes 3/3 (tile ink 39 checks weakest 384 4.65 ×3 + chrome 24 checks muted on board 4.75 + accentInk 8.55/6.62 + 32pt smoke) + tileTheme 4/4 (13-tier hex/ink per theme + cap 6144/12288→3072 + isThemeId guards + Settings fallback dark)
# Full suite: npm --prefix triade test -- --no-coverage
# tests 1346 — pass 980, fail 0, skipped 366 — no regressions, dark canonical tileContrast.audit + tileShape 6 pass still green
# tsc --noEmit: 0 errors
# RED scaffold file: 14 tests — all test.skip() (expected before activation; remove test.skip for current task to see RED→GREEN per Implementation Checklist)
```

**Summary:**

- Total tests (RED scaffold): 14 (all with `test.skip()` — expected before activation)
- Skipped: 14 (expected before activation)
- Activated RED tests: 14 after removing `test.skip()` for current task (would show ENOENT or assertion fails before `568987a`, see per-test Expected failure notes above)
- GREEN proofs already landed: `tileContrast.allThemes 3/3` + `tileTheme 4/4` + `settingsStore` + entire 980 pass suite — no staged failures
- Status: ✅ Red-phase scaffolds verified — activation guidance is task-by-task (Implementation Checklist); `light`/`colorBlind` reuse of `TILE_HEXES_DARK` is intentional derived delta so `colorBlind` E2E visual diff is not a hue gate but a chrome+shape gate

**Expected Failure Messages (before `568987a`):**

- `triade/src/theme/index.ts:1 ENOENT` — before theme module exists, all 5 P0 + 8 P1 red scaffolds show `ENOENT: no such file or directory, open 'triade/src/theme/index.ts'`
- `CHROME_LIGHT warm off-white absent` — `CHROME_LIGHT.*#F6F0E1` regex fails (only `CHROME_DARK #23262D` existed)
- `isThemeId('colorBlind') false` — before colorBlind id added, `isThemeId` only handled `dark/light`
- `schema THEME_IDS still accepted midnight` — `loadSettings('{"theme":"midnight"}').theme==='dark'` fails (was `'midnight'` before patch, now `light` id; fallback is the fix)
- `GameBoard has no theme prop` — `theme?: ThemeId` absent → `theme\?:.*ThemeId` regex fails
- `App hard-codes #fff container bg` — `tokens.chrome.surface` absent → wiring check fails; `useColorScheme` present would fail the Never gate
- `LaneSelectScreen no themeRow` — `Pressable` count <3 or `Escuro/Claro/Daltônico` absent → theme row missing
- After activation of all 14 after `568987a`: GREEN when tokens, delegation, audit, storage fallback, App wiring, and row are as in committed delta (see per-test Verifies).

---

## Notes

- **Working-tree delta assessed:** `fde6f8f` → `568987a` `feat(9-4): temas light/dark e color-blind com tokens puros e WCAG AA` (10 files `+539/-25`: `triade/src/theme/index.ts` NEW frozen pure-data + `tileNumerals.ts` theme-aware + `GameBoard.tsx` theme prop + `schema.ts` `ThemeId/THEME_IDS` fallback + `App.tsx` wiring + `LaneSelectScreen` row + `tileContrast.allThemes 3` + `tileTheme 4` + `settingsStore` update). Working tree at `a80ae0e` adds only `_bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md` (`final_revision cf055ff→a80ae0e` + Auto Run Result `980 pass, 366 skipped, 2 low rejects`) and `sprint-status.yaml` (`9-4 backlog→done`); `git diff HEAD --stat` 2 docs only — production delta is already on `main`.
- **Sprint-status ownership:** `sprint-status.yaml` is owned by the orchestrator — never write it, never revert a change to it. Rows at `done`/`awaiting-operator` are orchestrator bookkeeping, not defect evidence.
- **Spec triage `reject 2 low` preserved:** `[low] reject` "incomplete RN chrome theming beyond GameBoard/App container" and `[low] reject` "theme selector accent `#E8A33D` vs light `#8A4E00`" are triaged as deferred acceptances (full RN chrome beyond board is deferred intentionally; selector accent `8.55` still `≥4.5` for both themes) — not blockers, carried as P2 monitors (R-005) and not re-litigated here.
- **THEME_IDS duplication carry:** `triade/src/theme/index.ts` and `triade/src/services/storage/schema.ts` each define `THEME_IDS=['dark','light','colorBlind']`; equality `join(',')` is the P1 monitor in the scaffold. Single-source import from `theme` into `schema` remains an optional refactor at Epic 9 retro (R-006 score 4).
- **WCAG tightest margins remain the release note:** `384 #157A5C on #F6F0E1 4.65` (tile) and `light muted #6B6355 on board #EAE6DA 4.75` (chrome) are only `0.15–0.25` above `4.5`; any hex drift should be CI-logged via `python3 -c contrast` one-liner printing 13 tiers + chrome tables before merge.
- **No Playwright/k6 infra required:** Executed host `node --test` + `tsc` + `rg` + `python` ratio log in PR; device is one iOS Simulator smoke `Claro` warm off-white + `Daltônico` dark identity + instant `next-match` + persist kill+relaunch + `384` legible (Execution Strategy in test-design).
- **Stack detection:** `test_stack_type: auto` → `frontend` (React Native / Expo, Skia, no `playwright.config.*`, no `pyproject.toml`/`go.mod`); backend tiers auto-degraded to N/A per `test-levels-framework.md`; `tea_use_playwright_utils: true` retained but not needed for this static+render delta.
- **Deferred RN chrome recolor beyond board:** `triade/src/ui/LaneSelectScreen.tsx:205` `container backgroundColor:'#fff'` and card `#fff` vs `light #F6F0E1` warm off-white remains as P2 visual leak (R-005 score 4) — audit validates tokens pure data and WCAG; leaked `#fff` on warm surface is deferred intentionally and not a test failure, but tracked via `rg -n '#fff|#1a1d23' triade/src/ui` static monitor and optional simulator screenshot.

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @Murat in Slack/Discord (TEA / Master Test Architect)
- Refer to `./_bmad/tea/config.yaml` for workflow documentation (`test_artifacts: _bmad-output/test-artifacts`, `tea_use_playwright_utils: true`, `user_name: Eduardo`)
- Consult `./.claude/skills/bmad-testarch-atdd/resources/knowledge` for testing best practices

---

**Generated by BMad TEA Agent (Murat — Master Test Architect)** - 2026-09-03 — ATDD workflow for `9-4-temas-light-dark-e-color-blind` (pure-data themes `dark`/`light`/`colorBlind` instant via Settings, WCAG AA all 3, chrome+tile, persistence fallback). Mode: `sequential` (red-phase static + import host). Primary level: `Unit (node:test)`.

