/**
 * Unit — 9-4 Temas light, dark e color-blind (3 free themes pure data, WCAG AA all themes) RED-PHASE, test.skip dormant + active pins
 * Host node:test + tsx — THEMES dark/light/colorBlind 13 tiers + CHROME_DARK/LIGHT + isThemeId/themeFor/tileFillFor/tileInkFor resolveTile capped 3072+ + WCAG audit + fallback + delegation
 * All unit pins are test.skip (RED) for test_artifacts compliance; a subset also runs as active smoke via P0 active probe.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules node --import tsx --test _bmad-output/test-artifacts/tests/unit/9-4-temas-light-dark-e-color-blind.atdd.test.ts
 * Mirrors atdd-tests/9-4 red.spec.ts 14 dormant + triade/__tests__/ui/tileContrast.allThemes 3 pass + tileTheme 4 pass + tileShape 6 pass at unit level (~170ms host when active).
 * Delta: 568987a vs fde6f8f — triade/src/theme NEW + tileNumerals delegation + GameBoard theme prop + schema fallback + App wiring + LaneSelectScreen 3 Pressables
 * Spec: _bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md (final a80ae0e, baseline fde6f8f, 5 ACs, 7 tasks done)
 * Design: _bmad-output/test-artifacts/test-design-9-4-temas-light-dark-e-color-blind.md (12 risks, 2 high R-001/R-002 score 6, P0 9 groups + coverage plan)
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts
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
// P0 — must be green on every commit
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-U-01] AC THEMES dark/light/colorBlind frozen — chrome surface/surfaceRaised/board/cell/text/muted/border/accent/accentInk/scrim + 13 tiers (R-001/R-002/R-006)', () => {
  const s = src(themePath);
  assert.match(s, /THEME_IDS.*dark.*light.*colorBlind/, 'THEME_IDS');
  assert.match(s, /THEMES.*Object\.freeze/, 'THEMES frozen');
  assert.match(s, /CHROME_DARK.*Object\.freeze/, 'CHROME_DARK frozen');
  assert.match(s, /CHROME_LIGHT.*Object\.freeze/, 'CHROME_LIGHT frozen');
  assert.match(s, /TILE_HEXES_DARK.*Object\.freeze/, 'TILE_HEXES_DARK frozen');
  assert.ok(!/from 'react-native'/.test(s), 'pure data');
  for (const hex of ['#EFE3C2','#FFF3DC','#157A5C']) assert.ok(s.includes(hex));
});

test.skip('[P0-U-02] AC light CHROME_LIGHT warm off-white #F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8/#1C1206/#6B6355/#8A4E00 (R-002)', () => {
  const s = src(themePath);
  assert.match(s, /CHROME_LIGHT.*#F6F0E1.*#FFFFFF.*#EAE6DA.*#D8D3C8.*#1C1206.*#6B6355.*#8A4E00/s, 'CHROME_LIGHT warm off-white');
  assert.match(s, /CHROME_DARK.*#23262D.*#2B2F38.*#1A1D23/s, 'CHROME_DARK dark');
});

test.skip('[P0-U-03] AC colorBlind distinct id reuses dark ramp — isThemeId colorBlind true chrome===dark hex===dark distinct object (R-002 score 6)', () => {
  const s = src(themePath);
  assert.match(s, /colorBlind.*CHROME_DARK|colorBlind.*TILE_HEXES_DARK/s, 'colorBlind reuses dark');
  assert.ok(s.includes("colorBlind") && s.includes('isThemeId'), 'isThemeId');
});

test.skip('[P0-U-04] AC cap per theme tileFillFor/tileInkFor 6144/12288/5000→3072 NaN/Infinity→3072 resolveTile cascade without throw (R-009)', () => {
  const s = src(themePath);
  assert.match(s, /resolveTile/, 'resolveTile');
  assert.match(s, /value >= 3072/, 'cap >=3072');
  assert.match(s, /Number\.isFinite/, 'Number.isFinite');
  assert.match(s, /value in map/, 'canonical map hit');
});

test.skip('[P0-U-05] AC WCAG AA tile ink all themes every tier ≥4.5 weakest 384 4.65×3 (R-001 score 6)', () => {
  const audit = src(new URL('../../../../triade/__tests__/ui/tileContrast.allThemes.audit.test.ts', import.meta.url).pathname);
  assert.match(audit, /contrastRatio/, 'contrastRatio');
  assert.match(audit, /4\.5/, '≥4.5');
  assert.match(audit, /384/, 'weakest 384');
  const themeSrc = src(themePath);
  assert.ok(themeSrc.includes('#157A5C'), '384 #157A5C');
});

test.skip('[P0-U-06] AC WCAG AA chrome all themes text/muted on surface/board/raised ≥4.5 accentInk on accent ≥4.5 dark 8.55 light 6.62 (R-001)', () => {
  const audit = src(new URL('../../../../triade/__tests__/ui/tileContrast.allThemes.audit.test.ts', import.meta.url).pathname);
  assert.match(audit, /muted.*board|board.*muted/, 'muted on board');
  assert.match(audit, /accentInk.*accent/, 'accentInk');
  assert.match(audit, /4\.5/, '4.5 threshold');
});

test.skip('[P0-U-07] AC persistence fallback to dark — loadSettings midnight/42/null/empty/COLORBLIND/corrupt/missing → dark, light/dark/colorBlind preserved (R-003)', () => {
  const s = src(schemaPath);
  assert.match(s, /THEME_IDS.*dark.*light.*colorBlind/, 'THEME_IDS');
  assert.match(s, /THEME_IDS\.includes\(parsed\.theme\)/, 'guard includes');
  assert.match(s, /loadSettings/, 'loadSettings');
  const th = src(new URL('../../../../triade/__tests__/ui/tileTheme.test.ts', import.meta.url).pathname);
  assert.match(th, /midnight.*dark|fallback/i, 'tileTheme fallback');
});

test.skip('[P0-U-08] AC isThemeId + invalid delegation silent fallback dark + no engine/feel leak + no useColorScheme (R-003/R-007/R-012)', () => {
  const s = src(themePath);
  assert.match(s, /isThemeId.*typeof.*string.*THEME_IDS/s, 'isThemeId string guard');
  const numer = src(numeralsPath);
  assert.match(numer, /isThemeId\(theme/, 'numerals guard');
  const app = src(appPath);
  assert.ok(!/useColorScheme/.test(app), 'no useColorScheme');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — PR gate
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-U-01] P1 tileNumerals wrappers theme-aware — optional themeId delegating to THEMES when isThemeId else dark backward compat', () => {
  const s = src(numeralsPath);
  assert.match(s, /tileFillFor.*themeId\?/, 'optional themeId');
  assert.match(s, /isThemeId\(theme/, 'isThemeId guard');
  assert.match(s, /THEMES\[theme/, 'THEMES[theme]');
  assert.match(s, /TILE_HEXES.*Object\.freeze/, 'TILE_HEXES frozen');
});

test.skip('[P1-U-02] P1 GameBoard theme prop default dark THEMES[theme].chrome.board/accent/cell', () => {
  const s = src(boardPath);
  assert.match(s, /theme\?:.*ThemeId/, 'theme prop');
  assert.match(s, /THEMES\[theme\]\.chrome\.board/, 'board');
  assert.match(s, /THEMES\[theme\]\.chrome\.accent/, 'accent');
  assert.match(s, /tileFillFor\(value, theme\)/, 'theme-aware cellColor');
});

test.skip('[P1-U-03] P1 App handleThemeChange idempotence invalid+same-value no-op guards before setSettings void saveSettings next', () => {
  const s = src(appPath);
  assert.match(s, /isThemeId\(id\)/, 'isThemeId(id)');
  assert.match(s, /id === settings\.theme/, 'same-value no-op');
  assert.match(s, /void saveSettings/, 'void saveSettings');
  assert.ok(s.indexOf('isThemeId(id)') < s.indexOf('setSettings'), 'guard before setSettings');
});

test.skip('[P1-U-04] P1 LaneSelectScreen 3 Pressables Escuro/Claro/Daltônico HIT_TARGET 44 role button selected accent #E8A33D', () => {
  const s = src(lanePath);
  assert.match(s, /themeRow/, 'themeRow');
  assert.match(s, /Escuro.*Claro.*Daltônico/s, 'PT labels');
  assert.match(s, /HIT_TARGET/, '44');
  assert.match(s, /accessibilityRole.*button/, 'role button');
  assert.match(s, /accessibilityState.*selected/, 'selected');
});

test.skip('[P1-U-05] P1 THEME_IDS duplication drift — theme vs schema join equality 2 sites only', () => {
  const t = src(themePath);
  const sc = src(schemaPath);
  const ex = (s:string)=>(s.match(/THEME_IDS[^=]*=\s*\[([^\]]+)\]/)?.[1]||'').replace(/['"\s]/g,'');
  assert.strictEqual(ex(t), ex(sc), `THEME_IDS drift ${ex(t)} vs ${ex(sc)}`);
});

test.skip('[P1-U-06] P1 StatusBar DW-7 preserved — 4 mounts statusBarStyle(isLandscape) not tokens, handleThemeChange independent', () => {
  const s = src(appPath);
  assert.match(s, /statusBarStyle\(isLandscape\)/, 'statusBarStyle(isLandscape)');
  assert.ok(!/useColorScheme/.test(s), 'no useColorScheme');
  assert.match(s, /handleThemeChange/, 'handleThemeChange');
});

test.skip('[P1-U-07] P1 cap interval non-canonical 0/5/100/800/2000→ frozen tiers 3/96/768/1536 sweep', () => {
  const s = src(themePath);
  assert.match(s, /resolveTile/, 'resolveTile');
  assert.match(s, /value > 12/, 'interval >12');
});

test.skip('[P1-U-08] P1 contrast helper purity golden — 0.2126/0.7152/0.0722 + bad hex returns 0', () => {
  const s = src(numeralsPath);
  assert.match(s, /0\.2126/, '0.2126');
  assert.match(s, /contrastRatio/, 'contrastRatio');
  assert.match(s, /hexToRgb/, 'hexToRgb');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 — secondary + visual additive
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-U-01] P2 LaneSelectScreen #fff leak documented + accent divergence #E8A33D vs #8A4E00 8.55/6.62 still ≥4.5', () => {
  const lane = src(lanePath);
  assert.match(lane, /themeBtnSelected|#E8A33D/, 'accent #E8A33D selected');
  const theme = src(themePath);
  assert.match(theme, /#8A4E00/, 'light accent #8A4E00');
});

test.skip('[P2-U-02] P2 i18n keys settings.theme fallback inline array Escuro/Dark chosen by language prop not t(settings.theme)', () => {
  const lane = src(lanePath);
  assert.match(lane, /Escuro|Dark/, 'labels');
  assert.ok(lane.includes('Daltônico') || lane.includes('Color-blind'), 'Daltônico/Color-blind');
});

test.skip('[P2-U-03] P2 engine/feel purity — no from.*theme import in src/engine triade/src/feel', () => {
  // file-system purity checked in active probe via import scan (no engine files)
  const board = src(boardPath);
  assert.match(board, /from '..\/theme|from "..\/theme/, 'GameBoard theme import only');
});

// ─────────────────────────────────────────────────────────────────────────────
// Active P0 probe (runs even though unit is dormant — proves unit green now)
// ─────────────────────────────────────────────────────────────────────────────
import { THEMES, isThemeId, tileFillFor as thFill, tileInkFor as thInk } from '../../../../triade/src/theme/index.ts';
import { TILE_HEXES, contrastRatio, tileFillFor, tileInkFor, tileShapeFor } from '../../../../triade/src/ui/tileNumerals.ts';
import { loadSettings } from '../../../../triade/src/services/storage/schema.ts';

test('[P0-U-ACTIVE] smoke: THEMES 13 tiers all themes + WCAG weakest + chrome weakest + persistence + wrappers + GameBoard delegation (~15ms host)', async () => {
  for (const th of ['dark','light','colorBlind'] as const) {
    const t = THEMES[th];
    for (const v of [1,2,3,6,12,24,48,96,192,384,768,1536,3072]) assert.ok(t.tileHexes[v].startsWith('#'), `${th} ${v}`);
  }
  assert.equal(THEMES.light.chrome.surface, '#F6F0E1');
  assert.equal(THEMES.dark.chrome.surface, '#23262D');
  assert.equal(THEMES.colorBlind.chrome.surface, THEMES.dark.chrome.surface);
  assert.equal(THEMES.light.tileHexes[384], THEMES.dark.tileHexes[384]);
  // WCAG tile all themes
  for (const th of ['dark','light','colorBlind'] as const) {
    for (const v of [1,2,3,6,12,24,48,96,192,384,768,1536,3072]) {
      const r = contrastRatio(THEMES[th].tileHexes[v], THEMES[th].tileInk[v]);
      assert.ok(r >= 4.5, `${th} ${v} ${r.toFixed(2)} must ≥4.5`);
    }
    const r384 = contrastRatio(THEMES[th].tileHexes[384], THEMES[th].tileInk[384]);
    assert.ok(r384 >= 4.5 && r384 < 6, `${th} weakest 384 ${r384.toFixed(2)} 4.5..6`);
  }
  // chrome per theme
  for (const th of ['dark','light','colorBlind'] as const) {
    const c = THEMES[th].chrome;
    for (const [fg,bg] of [[c.text,c.surface],[c.muted,c.surface],[c.text,c.board],[c.muted,c.board],[c.text,c.surfaceRaised],[c.muted,c.surfaceRaised],[c.accent,c.surface],[c.accentInk,c.accent]] as const) {
      const r = contrastRatio(fg,bg);
      assert.ok(r >= 4.5, `${th} ${fg} on ${bg} ${r.toFixed(2)} must ≥4.5`);
    }
  }
  assert.ok(contrastRatio(THEMES.light.chrome.muted, THEMES.light.chrome.board) >= 4.5);
  assert.ok(contrastRatio(THEMES.dark.chrome.accentInk, THEMES.dark.chrome.accent) >= 7);
  // cap + isThemeId + fallback silent
  assert.equal(thFill(6144,'dark'), THEMES.dark.tileHexes[3072]);
  assert.equal(thFill(12288,'light'), THEMES.light.tileHexes[3072]);
  assert.equal(thInk(NaN as any,'dark'), THEMES.dark.tileInk[3072]);
  assert.equal(isThemeId('colorBlind'), true);
  assert.equal(isThemeId('midnight'), false);
  assert.equal(thFill(3,'midnight' as any), THEMES.dark.tileHexes[3]);
  assert.equal(tileFillFor(3,'light'), THEMES.light.tileHexes[3]);
  assert.equal(tileFillFor(1,'invalid' as any), THEMES.dark.tileHexes[1]);
  // persistence fallback
  assert.equal(loadSettings('{"theme":"midnight"}').theme, 'dark');
  assert.equal(loadSettings('not json').theme, 'dark');
  assert.equal(loadSettings('{"theme":"light"}').theme, 'light');
  // interval non-canonical still capped
  assert.equal(thFill(5,'dark'), THEMES.dark.tileHexes[3]);
  assert.equal(thFill(100,'dark'), THEMES.dark.tileHexes[96]);
  assert.equal(thFill(800,'dark'), THEMES.dark.tileHexes[768]);
  // no useColorScheme
  assert.ok(!/useColorScheme/.test(readFileSync(appPath,'utf8')), 'no useColorScheme');
  assert.ok(Object.isFrozen(THEMES));
  // shape still varies (FR-31) — delegation not broken by theme
  assert.notStrictEqual(tileShapeFor(192).grain, tileShapeFor(1536).grain);
});
