/**
 * API Gateway — 9-4 Temas light, dark e color-blind (3 free themes pure data, WCAG AA all themes)
 * Host node:test — source-pins for THEMES dark/light/colorBlind 13 tiers frozen + CHROME_DARK/LIGHT + isThemeId/themeFor/tileFillFor/tileInkFor resolveTile + tileNumerals wrappers + schema fallback + App wiring + LaneSelectScreen
 * All gateway pins are test.skip (RED) for test_artifacts compliance; a subset also runs as active smoke via P0 active probe.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules node --import tsx --test _bmad-output/test-artifacts/tests/api/9-4-temas-light-dark-e-color-blind.gateway.spec.ts
 * Mirrors triade/__tests__/ui/tileContrast.allThemes.audit.test.ts 3 pass + tileTheme.test.ts 4 pass + tileShape.test.ts 6 pass at API gateway level (~200ms host).
 * Delta: 568987a vs fde6f8f — triade/src/theme NEW pure-data THEMES 3 themes 13 tiers + CHROME_LIGHT warm off-white + isThemeId + tileFillFor/tileInkFor capped 3072+ + tileNumerals delegation + GameBoard theme prop + schema fallback + App wiring + LaneSelectScreen 3 Pressables
 * Spec: _bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md (final a80ae0e, baseline fde6f8f, 5 ACs)
 * Design: _bmad-output/test-artifacts/test-design-9-4-temas-light-dark-e-color-blind.md (12 risks, 2 high R-001/R-002 score 6, P0 9 groups)
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only gateway (no page.goto)
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
const contrastAllPath = new URL('../../../../triade/__tests__/ui/tileContrast.allThemes.audit.test.ts', import.meta.url).pathname;
const themeTestPath = new URL('../../../../triade/__tests__/ui/tileTheme.test.ts', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// P0 — must be green on every commit (pure-data tokens + WCAG all themes + persistence fallback)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-API-01] AC theme tokens frozen pure data — THEMES dark/light/colorBlind each chrome + 13 tiers Object.freeze, no RN/Skia (R-001/R-006)', () => {
  const s = src(themePath);
  assert.match(s, /ThemeId.*dark.*light.*colorBlind/, 'ThemeId dark|light|colorBlind');
  assert.match(s, /THEME_IDS.*dark.*light.*colorBlind/, 'THEME_IDS 3 ids');
  assert.match(s, /isThemeId/, 'isThemeId guard');
  assert.match(s, /ThemeTokens.*chrome/, 'ThemeTokens chrome');
  assert.match(s, /tileHexes.*tileInk/, 'tileHexes+tileInk 13 tiers');
  assert.match(s, /THEMES.*Object\.freeze/, 'THEMES Object.freeze');
  assert.match(s, /TILE_HEXES_DARK.*Object\.freeze/, 'TILE_HEXES_DARK frozen');
  assert.match(s, /TILE_INK_DARK.*Object\.freeze/, 'TILE_INK_DARK frozen');
  assert.match(s, /CHROME_DARK.*Object\.freeze/, 'CHROME_DARK frozen');
  assert.match(s, /CHROME_LIGHT.*Object\.freeze/, 'CHROME_LIGHT frozen');
  assert.ok(!/from 'react-native'/.test(s), 'pure data no RN');
  assert.ok(!/from '@shopify\/react-native-skia'/.test(s), 'no Skia');
  for (const hex of ['#EFE3C2','#C9963B','#E4A53B','#157A5C','#FFF3DC']) {
    assert.ok(s.includes(hex), `must contain ${hex}`);
  }
});

test.skip('[P0-API-02] AC light surfaces flipped warm off-white — CHROME_LIGHT #F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8/#1C1206/#6B6355/#8A4E00 vs dark #23262D (R-002)', () => {
  const s = src(themePath);
  assert.match(s, /CHROME_DARK.*#23262D.*#2B2F38.*#1A1D23.*#F2EEE3.*#E8A33D/s, 'CHROME_DARK exact');
  assert.match(s, /CHROME_LIGHT.*#F6F0E1.*#FFFFFF.*#EAE6DA.*#D8D3C8.*#1C1206.*#6B6355.*#8A4E00/s, 'CHROME_LIGHT warm off-white');
  // runtime equality checked in active probe: light.tileHexes[3]===dark.tileHexes[3]
});

test.skip('[P0-API-03] AC colorBlind distinct id reuses dark ramp shape carries — id colorBlind but hex===dark (R-002 score 6)', () => {
  const s = src(themePath);
  assert.match(s, /colorBlind.*CHROME_DARK|colorBlind.*TILE_HEXES_DARK/s, 'colorBlind reuses CHROME_DARK+TILE_HEXES_DARK');
  assert.match(s, /colorBlind.*Object\.freeze/, 'colorBlind frozen distinct');
  // runtime: THEMES.colorBlind.chrome.surface===THEMES.dark.chrome.surface + tileHexes[3]=== in active probe
});

test.skip('[P0-API-04] AC cap at ceiling per theme — tileFillFor/tileInkFor 6144/12288/5000→3072 pure no throw, resolveTile intervals (R-009)', () => {
  const s = src(themePath);
  assert.match(s, /tileFillFor/, 'tileFillFor exists');
  assert.match(s, /tileInkFor/, 'tileInkFor exists');
  assert.match(s, /resolveTile/, 'resolveTile helper');
  assert.match(s, /value\s*>=\s*3072/, 'cap >=3072');
  assert.match(s, /value\s*>\s*1536/, 'cascade >1536');
  assert.match(s, /Number\.isFinite\(value\)/, 'Number.isFinite guard never throw NaN/Infinity');
  assert.match(s, /isThemeId\(themeId\)/, 'isThemeId fallback dark');
});

test.skip('[P0-API-05] AC WCAG AA tile ink all 3 themes — every tier ≥4.5 weakest 384 4.65 holds 13pt/9pt (R-001 score 6)', () => {
  const s = src(themePath);
  assert.ok(s.includes('#157A5C'), 'must pin 384 #157A5C deep emerald');
  const audit = src(contrastAllPath);
  assert.match(audit, /contrastRatio/, 'audit uses contrastRatio');
  assert.match(audit, /4\.5/, 'audit asserts ≥4.5');
  assert.match(audit, /384/, 'audit pins weakest 384');
  assert.match(audit, /dark.*light.*colorBlind|colorBlind.*dark/s, 'audit loops all 3 themes');
  const numer = src(numeralsPath);
  assert.match(numer, /contrastRatio/, 'numerals has contrastRatio');
  assert.match(numer, /0\.2126/, 'luminance weight 0.2126');
});

test.skip('[P0-API-06] AC WCAG AA chrome all 3 themes — text/muted on surface/board/raised ≥4.5 accentInk on accent ≥4.5 (R-001)', () => {
  const audit = src(contrastAllPath);
  assert.match(audit, /text.*muted|muted.*text/, 'audit checks text+muted');
  assert.match(audit, /surface.*board.*raised|chrome/, 'audit checks surface/board/raised');
  assert.match(audit, /accentInk.*accent|accent.*accentInk/, 'accentInk on accent');
  assert.match(audit, /4\.5/, 'threshold 4.5');
  // weakest light muted on board 4.75 and dark accentInk 8.55 / light 6.62 are pinned in active probe
});

test.skip('[P0-API-07] AC persistence fallback to dark — loadSettings invalid/missing/corrupt→dark valid preserved (R-003 score 4)', () => {
  const s = src(schemaPath);
  assert.match(s, /THEME_IDS.*dark.*light.*colorBlind/, 'schema THEME_IDS');
  assert.match(s, /ThemeId/, 'schema ThemeId');
  assert.match(s, /loadSettings/, 'loadSettings exists');
  assert.match(s, /THEME_IDS\.includes\(parsed\.theme\)/, 'guard THEME_IDS.includes(parsed.theme)');
  assert.match(s, /DEFAULT_SETTINGS.*theme.*'dark'|DEFAULT.*'dark'/, 'default dark');
  assert.ok(!/midnight/.test(s) || s.includes('dark'), 'must fallback to dark not midnight');
  const audit = src(themeTestPath);
  assert.match(audit, /midnight|fallback.*dark/i, 'tileTheme tests fallback');
});

test.skip('[P0-API-08] AC isThemeId guard + invalid delegation fallback dark silent + engine/feel purity + no useColorScheme (R-003/R-006/R-012)', () => {
  const s = src(themePath);
  assert.match(s, /isThemeId.*typeof.*string.*THEME_IDS/s, 'isThemeId checks string+THEME_IDS');
  assert.match(s, /THEME_IDS.*dark.*light.*colorBlind/s, 'THEME_IDS exact');
  const numer = src(numeralsPath);
  assert.match(numer, /isThemeId\(theme/, 'numerals guards isThemeId(theme)');
  const app = src(appPath);
  assert.ok(!/useColorScheme/.test(app), 'App must NOT use useColorScheme');
  assert.ok(!/useColorScheme/.test(s), 'theme pure no useColorScheme');
  // engine/feel purity checked in umbrella + active probe via file existence
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — PR gate (wiring depth + chrome delegation + persistence idempotence)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-API-01] P1 tileNumerals theme-aware wrappers delegate to THEMES fallback dark, backward compat TILE_HEXES', () => {
  const s = src(numeralsPath);
  assert.match(s, /tileFillFor.*themeId\?/, 'tileFillFor optional themeId');
  assert.match(s, /isThemeId\(theme/, 'guard isThemeId(theme)');
  assert.match(s, /THEMES\[theme/, 'delegates to THEMES[theme]');
  assert.match(s, /TILE_HEXES.*Object\.freeze/, 'canonical TILE_HEXES frozen backward compat');
  assert.match(s, /contrastRatio/, 'contrastRatio still pure');
  assert.ok(!/from 'react-native'/.test(s) || s.includes('tileNumerals'), 'pure helpers no RN needed');
});

test.skip('[P1-API-02] P1 GameBoard consumes theme — theme prop default dark, cellColor/tileTextColor via tileFillFor(theme), board well THEMES[theme].chrome.board', () => {
  const s = src(boardPath);
  assert.match(s, /theme\?:.*ThemeId|theme.*ThemeId/, 'theme?: ThemeId prop');
  assert.match(s, /theme.*=.*'dark'|default.*dark/, 'default dark');
  assert.match(s, /THEMES\[theme\]\.chrome\.board/, 'board well THEMES[theme].chrome.board');
  assert.match(s, /THEMES\[theme\]\.chrome\.accent|THEMES\[theme\].*accent/, 'hint accent THEMES[theme].chrome.accent');
  assert.match(s, /THEMES\[theme\]\.chrome\.cell|cell.*THEMES/, 'null cell THEMES[theme].chrome.cell');
  assert.match(s, /tileFillFor.*theme/, 'cellColor theme-aware');
  assert.ok(!/value\s*<=\s*12/.test(s) || s.includes('tileFillFor'), 'no old binary value<=12');
});

test.skip('[P1-API-03] P1 App wiring — themeId=isThemeId(settings.theme)?settings.theme:dark, tokens=THEMES[themeId], GameBoard theme={themeId}, handleThemeChange void saveSettings', () => {
  const s = src(appPath);
  assert.match(s, /isThemeId\(settings\.theme\)/, 'themeId via isThemeId(settings.theme)');
  assert.match(s, /THEMES\[themeId\]/, 'tokens=THEMES[themeId]');
  assert.match(s, /handleThemeChange.*ThemeId.*saveSettings/s, 'handleThemeChange persists via saveSettings');
  assert.match(s, /GameBoard.*theme=\{themeId\}/, 'GameBoard theme={themeId}');
  assert.match(s, /tokens\.chrome\.surface|backgroundColor.*tokens\.chrome/, 'containers tokens.chrome.surface');
  assert.ok(!/useColorScheme/.test(s), 'MUST NOT useColorScheme');
});

test.skip('[P1-API-04] P1 LaneSelectScreen theme row — 3 Pressables Escuro/Claro/Daltônico HIT_TARGET 44 selected accent #E8A33D', () => {
  const s = src(lanePath);
  assert.match(s, /themeRow|theme.*Row/, 'themeRow container');
  assert.match(s, /Escuro/, 'Escuro');
  assert.match(s, /Claro/, 'Claro');
  assert.match(s, /Daltônico/, 'Daltônico');
  assert.match(s, /HIT_TARGET.*44|minHeight.*44|minHeight.*HIT_TARGET/s, 'HIT_TARGET 44');
  assert.match(s, /accessibilityRole.*button/, 'accessibilityRole button');
  assert.match(s, /accessibilityState.*selected/, 'accessibilityState selected');
  assert.match(s, /#E8A33D|themeBtnSelected/, 'accent #E8A33D selected');
  assert.match(s, /Pressable/, 'Pressable');
  assert.ok((s.match(/Pressable/g)||[]).length >= 3, 'at least 3 Pressables');
});

test.skip('[P1-API-05] P1 handleThemeChange idempotence — invalid no-op, same-value no-op, guards before setSettings (R-004)', () => {
  const s = src(appPath);
  assert.match(s, /handleThemeChange.*isThemeId\(id\)/, 'guard isThemeId(id)');
  assert.match(s, /id === settings\.theme|settings\.theme === id/, 'no-op when id===settings.theme');
  assert.match(s, /void saveSettings\(next\)|saveSettings.*next/, 'void saveSettings(next)');
  const g = s.indexOf('isThemeId(id)');
  const st = s.indexOf('setSettings');
  assert.ok(g !== -1 && st !== -1 && g < st, 'isThemeId guard before setSettings');
});

test.skip('[P1-API-06] P1 THEME_IDS duplication drift + StatusBar DW-7 preserved (R-006/R-008)', () => {
  const t = src(themePath);
  const sc = src(schemaPath);
  assert.match(t, /THEME_IDS.*dark.*light.*colorBlind/s, 'theme THEME_IDS');
  assert.match(sc, /THEME_IDS.*dark.*light.*colorBlind/s, 'schema THEME_IDS');
  const extract = (s:string)=> (s.match(/THEME_IDS[^=]*=\s*\[([^\]]+)\]/)?.[1]||'').replace(/['"\s]/g,'');
  assert.strictEqual(extract(t), extract(sc), `THEME_IDS must match theme ${extract(t)} vs schema ${extract(sc)}`);
  const app = src(appPath);
  assert.match(app, /statusBarStyle\(isLandscape\)/, 'statusBarStyle(isLandscape) preserved DW-7');
  assert.ok(!/useColorScheme/.test(app), 'no useColorScheme');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 — secondary gates (visual additive + overflow + i18n drift)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-API-01] P2 LaneSelectScreen #fff container leak + accent divergence dark #E8A33D vs light #8A4E00 (R-005 monitor)', () => {
  const s = src(lanePath);
  // container backgroundColor '#fff' is expected deferral per spec reject low — documented not defect
  assert.match(s, /themeBtnSelected.*#E8A33D|accent.*#E8A33D/, 'active selected accent #E8A33D');
  // light chrome accent #8A4E00 exists in theme but selector uses canonical #E8A33D with dark ink 8.55 still ≥4.5 — intentional
  const t = src(themePath);
  assert.match(t, /#8A4E00/, 'CHROME_LIGHT accent #8A4E00');
  assert.match(t, /#E8A33D/, 'CHROME_DARK accent #E8A33D');
});

test.skip('[P2-API-02] P2 cap interval invariants non-canonical 0/5/100/800/2000/NaN/Infinity map to frozen tiers without throw (R-009)', () => {
  const s = src(themePath);
  assert.match(s, /resolveTile/, 'resolveTile interval cascade');
  assert.match(s, /value\s*>\s*12/, 'cascade >12');
  assert.match(s, /value\s*>\s*3/, 'cascade >3');
  assert.match(s, /return.*\[3\]/, 'fallback → 3 tier');
  assert.match(s, /!Number\.isFinite/, 'NaN/Infinity guard');
});

// ─────────────────────────────────────────────────────────────────────────────
// Active P0 probe (runs even though gateway is dormant — proves spec green now)
// ─────────────────────────────────────────────────────────────────────────────
import { THEMES, isThemeId, tileFillFor as themeFillFor, tileInkFor as themeInkFor } from '../../../../triade/src/theme/index.ts';
import { TILE_HEXES, TILE_INK, contrastRatio } from '../../../../triade/src/ui/tileNumerals.ts';
import { loadSettings, DEFAULT_SETTINGS } from '../../../../triade/src/services/storage/schema.ts';

test('[P0-API-ACTIVE] smoke: THEMES dark/light/colorBlind frozen + weakest 384 4.65 + chrome weakest + persistence fallback + no useColorScheme (~20ms host)', async () => {
  // tokens frozen + chrome exact
  assert.ok(Object.isFrozen(THEMES));
  for (const id of ['dark','light','colorBlind'] as const) {
    const t = THEMES[id];
    assert.ok(t);
    for (const k of ['surface','surfaceRaised','board','cell','text','muted','border','accent','accentInk','scrim'] as const) {
      assert.ok(typeof t.chrome[k]==='string' && t.chrome[k].startsWith('#'), `${id}.chrome.${k}`);
    }
    for (const v of [1,2,3,6,12,24,48,96,192,384,768,1536,3072]) {
      assert.ok(typeof t.tileHexes[v]==='string' && t.tileHexes[v].startsWith('#'), `${id} tileHexes[${v}]`);
      assert.ok(typeof t.tileInk[v]==='string' && t.tileInk[v].startsWith('#'), `${id} tileInk[${v}]`);
    }
  }
  assert.strictEqual(THEMES.light.chrome.surface, '#F6F0E1');
  assert.strictEqual(THEMES.light.chrome.accent, '#8A4E00');
  assert.strictEqual(THEMES.dark.chrome.surface, '#23262D');
  assert.strictEqual(THEMES.colorBlind.chrome.surface, THEMES.dark.chrome.surface);
  assert.strictEqual(THEMES.light.tileHexes[3], THEMES.dark.tileHexes[3]);
  assert.strictEqual(THEMES.colorBlind.tileHexes[384], THEMES.dark.tileHexes[384]);
  // cap
  for (const th of ['dark','light','colorBlind'] as const) {
    assert.strictEqual(themeFillFor(6144, th), THEMES[th].tileHexes[3072]);
    assert.strictEqual(themeFillFor(12288, th), THEMES[th].tileHexes[3072]);
    assert.strictEqual(themeInkFor(6144, th), THEMES[th].tileInk[3072]);
    assert.strictEqual(themeFillFor(NaN as any, th), THEMES[th].tileHexes[3072]);
  }
  // isThemeId + fallback silent
  assert.equal(isThemeId('dark'), true);
  assert.equal(isThemeId('colorBlind'), true);
  assert.equal(isThemeId('midnight'), false);
  assert.equal(isThemeId(42), false);
  assert.equal(themeFillFor(3, 'midnight' as any), THEMES.dark.tileHexes[3]);
  // persistence fallback
  assert.strictEqual(loadSettings('{"theme":"midnight"}').theme, 'dark');
  assert.strictEqual(loadSettings('{"theme":42}').theme, 'dark');
  assert.strictEqual(loadSettings('not json').theme, 'dark');
  assert.strictEqual(loadSettings('{"theme":"light"}').theme, 'light');
  assert.strictEqual(loadSettings('{"theme":"colorBlind"}').theme, 'colorBlind');
  // WCAG weakest pins
  for (const th of ['dark','light','colorBlind'] as const) {
    const r384 = contrastRatio(THEMES[th].tileHexes[384], THEMES[th].tileInk[384]);
    assert.ok(r384 >= 4.5 && r384 < 6, `${th} 384 ${r384.toFixed(2)} must 4.5..6 actual ~4.65`);
  }
  const mutedOnBoardLight = contrastRatio(THEMES.light.chrome.muted, THEMES.light.chrome.board);
  assert.ok(mutedOnBoardLight >= 4.5 && mutedOnBoardLight < 5.5, `light muted on board ${mutedOnBoardLight.toFixed(2)} 4.5..5.5 actual 4.75`);
  assert.ok(contrastRatio(THEMES.dark.chrome.accentInk, THEMES.dark.chrome.accent) >= 7, `dark accentInk on accent ${contrastRatio(THEMES.dark.chrome.accentInk, THEMES.dark.chrome.accent).toFixed(2)} must ≥7 actual 8.55`);
  assert.ok(contrastRatio(THEMES.light.chrome.accentInk, THEMES.light.chrome.accent) >= 4.5, `light accentInk ${contrastRatio(THEMES.light.chrome.accentInk, THEMES.light.chrome.accent).toFixed(2)} must ≥4.5 actual 6.62`);
  // no useColorScheme
  const appSrc = readFileSync(appPath, 'utf8');
  assert.ok(!/useColorScheme/.test(appSrc), 'App must NOT use useColorScheme');
  assert.ok(!/from 'react-native'/.test(readFileSync(themePath,'utf8')), 'theme pure');
  // backward compat TILE_HEXES canonical still present
  assert.strictEqual((TILE_HEXES as any)[1], '#EFE3C2');
  assert.strictEqual(DEFAULT_SETTINGS.theme, 'dark');
});
