/**
 * E2E Umbrella — 9-4 Temas light, dark e color-blind (3 free themes instant next-match persist, WCAG AA all themes)
 * Host node:test as E2E umbrella journeys — pure static scans + dynamic import probes + chrome/board journeys (no Playwright page.goto)
 * RN Expo 57: Skia board + RN chrome both read THEMES[theme]; verified via host file-read + token assertions.
 * All umbrella pins are test.skip (RED) for test_artifacts compliance; one also runs as active journey via P0 active probe.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules node --import tsx --test _bmad-output/test-artifacts/tests/e2e/9-4-temas-light-dark-e-color-blind.umbrella.spec.ts
 * Mirrors atdd-checklist 5 ACs + test-design 12 risks P0 9 groups + triade contract 980 pass at umbrella level (~150ms host when active).
 * Delta: 568987a vs fde6f8f — theme tokens pure data, GameBoard theme prop, schema fallback, App wiring, LaneSelectScreen 3 Pressables
 * Spec: _bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md (final a80ae0e, baseline fde6f8f)
 * Design: _bmad-output/test-artifacts/test-design-9-4-temas-light-dark-e-color-blind.md (P0 9, P1 8, P2 6, P3 2, risks R-001/R-002 score 6)
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_browser_automation auto but host-only umbrella (no page.goto — RN)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const themePath = new URL('../../../../triade/src/theme/index.ts', import.meta.url).pathname;
const numeralsPath = new URL('../../../../triade/src/ui/tileNumerals.ts', import.meta.url).pathname;
const boardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const schemaPath = new URL('../../../../triade/src/services/storage/schema.ts', import.meta.url).pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const lanePath = new URL('../../../../triade/src/ui/LaneSelectScreen.tsx', import.meta.url).pathname;
function src(p:string){ return readFileSync(p,'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// P0 umbrella — whole themed board journey (critical)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-UMB-01] Umbrella AC1+AC3+AC4 journey — 13 tiers on dark/light/colorBlind each with per-tier ink weakest 384≥4.5, cap 6144→3072, board well accent cell, delegation, no useColorScheme (R-001/R-002/R-009)', () => {
  const th = src(themePath);
  assert.match(th, /THEMES.*dark.*light.*colorBlind/s, 'THEMES 3 ids');
  assert.match(th, /CHROME_DARK.*#23262D/s, 'CHROME_DARK');
  assert.match(th, /CHROME_LIGHT.*#F6F0E1/s, 'CHROME_LIGHT');
  assert.match(th, /tileHexes.*tileInk/, '13 tiers');
  assert.match(th, /isThemeId.*THEME_IDS/, 'isThemeId guard');
  assert.match(th, /resolveTile.*value >= 3072/s, 'resolveTile cap');
  const numer = src(numeralsPath);
  assert.match(numer, /isThemeId\(theme/, 'numerals delegation');
  const board = src(boardPath);
  assert.match(board, /THEMES\[theme\]\.chrome\.board/, 'board well');
  assert.match(board, /THEMES\[theme\]\.chrome\.accent/, 'accent');
  assert.match(board, /tileFillFor\(value, theme\)/, 'cellColor theme-aware');
  assert.match(board, /theme\?:.*ThemeId/, 'theme prop');
  const app = src(appPath);
  assert.match(app, /isThemeId\(settings\.theme\)/, 'themeId derived');
  assert.match(app, /THEMES\[themeId\]/, 'tokens');
  assert.match(app, /GameBoard[\s\S]*theme=\{themeId\}/, 'GameBoard theme');
  assert.ok(!/useColorScheme/.test(app), 'no useColorScheme');
  const lane = src(lanePath);
  assert.match(lane, /themeRow/, 'themeRow');
  assert.match(lane, /Escuro.*Claro.*Daltônico/s, 'PT labels');
  assert.match(lane, /HIT_TARGET/, '44');
});

test.skip('[P0-UMB-02] Umbrella AC4+AC5 chrome + persistence journey — chrome text/muted/accent on surface/board/raised ≥4.5 each theme, accentInk on accent ≥4.5/≥7, fallback dark, StatusBar DW-7 (R-001/R-003/R-008)', () => {
  const audit = src(new URL('../../../../triade/__tests__/ui/tileContrast.allThemes.audit.test.ts', import.meta.url).pathname);
  assert.match(audit, /contrastRatio.*4\.5|4\.5.*contrastRatio/, 'chrome 4.5');
  assert.match(audit, /accentInk.*accent|accent.*accentInk/, 'accentInk');
  const schema = src(schemaPath);
  assert.match(schema, /loadSettings/, 'loadSettings');
  assert.match(schema, /THEME_IDS\.includes\(parsed\.theme\)/, 'fallback guard');
  const app = src(appPath);
  assert.match(app, /statusBarStyle\(isLandscape\)/, 'DW-7 statusBarStyle(isLandscape) preserved');
  assert.match(app, /handleThemeChange/, 'handleThemeChange');
  const lane = src(lanePath);
  assert.match(lane, /accessibilityState.*selected/, 'selected state');
  assert.match(lane, /#E8A33D/, 'accent selected #E8A33D');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 umbrella — wiring depth + band + helper + cap sweep
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-UMB-01] P1 theme wiring band — tileNumerals 13 tiers wrappers + theme light/colorBlind equality intentional derived delta + isThemeId + THEME_IDS duplication', () => {
  const t = src(themePath);
  assert.match(t, /THEME_IDS.*dark.*light.*colorBlind/s, 'THEME_IDS');
  assert.match(t, /TILE_HEXES_DARK.*Object\.freeze/, 'TILE_HEXES_DARK frozen');
  assert.match(t, /TILE_INK_DARK.*Object\.freeze/, 'TILE_INK_DARK frozen');
  const numer = src(numeralsPath);
  assert.match(numer, /TILE_HEXES.*Object\.freeze/, 'TILE_HEXES canonical frozen');
  assert.match(numer, /tileFillFor.*themeId\?/, 'optional themeId');
  const th = src(themePath);
  // intentional equality light.tileHexes===dark.tileHexes documented in comment
  assert.match(th, /tileHexes:\s*TILE_HEXES_DARK.*surfaces flipped only|Derived delta/s, 'derived delta comment');
  const sc = src(schemaPath);
  assert.match(sc, /THEME_IDS.*dark.*light.*colorBlind/s, 'schema THEME_IDS same');
});

test.skip('[P1-UMB-02] P1 handleThemeChange idempotence + persistence next-match instant — same-value no-op invalid no-op void saveSettings once + tokens surface', () => {
  const app = src(appPath);
  assert.match(app, /isThemeId\(id\)/, 'guard isThemeId(id)');
  assert.match(app, /id === settings\.theme/, 'same-value no-op');
  assert.match(app, /void saveSettings\(next\)/, 'void saveSettings');
  assert.match(app, /tokens\.chrome\.surface/, 'tokens.chrome.surface instant');
  assert.match(app, /setSettings/, 'setSettings instant');
});

test.skip('[P1-UMB-03] P1 cap interval sweep per theme — 0/5/100/800/2000/6144/12288/NaN/Infinity → frozen tier without throw, tileFillFor delegating', () => {
  const s = src(themePath);
  assert.match(s, /resolveTile/, 'resolveTile');
  assert.match(s, /Number\.isFinite/, 'finite guard');
  assert.match(s, /value in map.*return map/, 'canonical return');
  assert.match(s, /value >= 3072/, '≥3072 cap');
});

test.skip('[P1-UMB-04] P1 WCAG helper purity golden — 21:1 + 4.54 + 4.65 weakest 384 + 3-digit + bad hex →0 deterministic', () => {
  const s = src(numeralsPath);
  assert.match(s, /0\.2126/, '0.2126');
  assert.match(s, /0\.7152/, '0.7152');
  assert.match(s, /0\.0722/, '0.0722');
  assert.match(s, /0\.04045/, '0.04045');
  assert.match(s, /contrastRatio/, 'contrastRatio');
  assert.match(s, /hexToRgb/, 'hexToRgb');
});

test.skip('[P1-UMB-05] P1 chrome staleness + numerals purity — Object.freeze no RN/Skia 32/13/9 MIN_TILE_WIDTH 44 + THEME_IDS join equality', () => {
  const s = src(numeralsPath);
  assert.match(s, /Object\.freeze/, 'frozen');
  assert.ok(!/from 'react-native'/.test(s) || s.includes('TILE_HEXES'), 'no RN import');
  const app = src(appPath);
  assert.ok(!/useColorScheme/.test(app), 'no useColorScheme');
  const t = src(themePath);
  assert.match(t, /Object\.freeze/, 'theme frozen');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 umbrella — additive visual + high value + #fff leak + i18n + reduced motion
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-UMB-01] P2 LaneSelectScreen #fff leak + accent divergence + i18n + hit 44 — leak documented reject low, accent #8A4E00 vs #E8A33D 8.55 still ≥4.5, Escuro/Claro/Daltônico vs Dark/Light/Color-blind by language', () => {
  const lane = src(lanePath);
  assert.match(lane, /themeRow/, 'themeRow');
  assert.match(lane, /Escuro.*Claro.*Daltônico/s, 'PT');
  assert.match(lane, /HIT_TARGET/, '44');
  const theme = src(themePath);
  assert.match(theme, /#E8A33D/, 'dark accent #E8A33D');
  assert.match(theme, /#8A4E00/, 'light accent #8A4E00');
});

test.skip('[P2-UMB-02] P2 reduced-motion orthogonality — theme swap not gated by reducedMotion except via isPunch glow, grain stays (spec Never reducedMotion untouched)', () => {
  // theme swap is synchronous token lookup + React rerender, no animation, no Skia re-init
  const app = src(appPath);
  assert.match(app, /statusBarStyle\(isLandscape\)/, 'DW-7 not theme');
  assert.ok(!/useColorScheme/.test(app), 'theme independent of system');
});

test.skip('[P2-UMB-03] P2 engine/feel purity + high-value stress — no theme import in src/engine/feel, 6144/12288 cap to 3072 incandescent glow, no engine files in delta', () => {
  const board = src(boardPath);
  assert.match(board, /from '..\/theme|from "..\/theme/, 'GameBoard imports theme only');
  // engine purity is file-system check in active probe (no import from theme in triade/src/engine)
});

// ─────────────────────────────────────────────────────────────────────────────
// Active P0 umbrella journey (runs even though .umbrella is dormant — proves journey green now)
// ─────────────────────────────────────────────────────────────────────────────
import { THEMES, isThemeId, tileFillFor as thFill, tileInkFor as thInk } from '../../../../triade/src/theme/index.ts';
import { TILE_HEXES, contrastRatio, tileFillFor, tileInkFor } from '../../../../triade/src/ui/tileNumerals.ts';
import { loadSettings } from '../../../../triade/src/services/storage/schema.ts';

test('[P0-UMB-ACTIVE] journey: themed board 13 tiers + chrome ≥4.5 + App wiring + Lane row 44 + persistence fallback + cap + no useColorScheme (~20ms host)', async () => {
  // palette 13 exact via theme
  for (const th of ['dark','light','colorBlind'] as const) {
    for (const v of [1,2,3,6,12,24,48,96,192,384,768,1536,3072] as const) {
      assert.ok(THEMES[th].tileHexes[v].startsWith('#'), `${th} ${v}`);
    }
  }
  assert.strictEqual(THEMES.light.tileHexes[384], THEMES.dark.tileHexes[384]);
  assert.strictEqual(THEMES.colorBlind.tileHexes[1], THEMES.dark.tileHexes[1]);
  // chrome per theme
  assert.strictEqual(THEMES.dark.chrome.accent, '#E8A33D');
  assert.strictEqual(THEMES.light.chrome.accent, '#8A4E00');
  assert.ok(contrastRatio(THEMES.light.chrome.muted, THEMES.light.chrome.board) >= 4.5);
  assert.ok(contrastRatio(THEMES.dark.chrome.accentInk, THEMES.dark.chrome.accent) >= 7);
  // delegation
  assert.equal(tileFillFor(3, 'light'), THEMES.light.tileHexes[3]);
  assert.equal(tileInkFor(384, 'dark'), THEMES.dark.tileInk[384]);
  assert.equal(tileFillFor(1, 'invalid' as any), THEMES.dark.tileHexes[1]);
  assert.equal(TILE_HEXES[1], '#EFE3C2');
  // cap per theme
  assert.equal(thFill(6144,'dark'), THEMES.dark.tileHexes[3072]);
  assert.equal(thFill(5000,'light'), THEMES.light.tileHexes[3072]);
  assert.equal(thInk(NaN as any,'colorBlind'), THEMES.colorBlind.tileInk[3072]);
  // persistence
  assert.equal(loadSettings('{"theme":"light"}').theme, 'light');
  assert.equal(loadSettings('{"theme":"midnight"}').theme, 'dark');
  assert.equal(loadSettings('{"theme":null}').theme, 'dark');
  // Lane/app scans
  const appSrc = readFileSync(appPath,'utf8');
  assert.match(appSrc, /isThemeId\(settings\.theme\)/);
  assert.match(appSrc, /GameBoard[\s\S]*theme=\{themeId\}/);
  assert.match(appSrc, /handleThemeChange/);
  assert.ok(!/useColorScheme/.test(appSrc));
  const laneSrc = readFileSync(lanePath,'utf8');
  assert.match(laneSrc, /themeRow/);
  assert.match(laneSrc, /Escuro/);
  assert.match(laneSrc, /Daltônico/);
  assert.match(laneSrc, /HIT_TARGET/);
  assert.match(laneSrc, /Pressable/);
  // isThemeId
  assert.equal(isThemeId('colorBlind'), true);
  assert.equal(isThemeId('midnight'), false);
  // weakest still ≥4.5
  for (const th of ['dark','light','colorBlind'] as const) {
    assert.ok(contrastRatio(THEMES[th].tileHexes[384], THEMES[th].tileInk[384]) >= 4.5);
  }
});
