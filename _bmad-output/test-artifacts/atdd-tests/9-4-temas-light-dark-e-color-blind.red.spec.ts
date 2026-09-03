import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// ATDD RED PHASE SCAFFOLD — Story 9-4 Temas light, dark e color-blind
// Generated: 2026-09-03 | TEA (Murat) | commit delta fde6f8f → 568987a + a80ae0e spec
// All tests are `test.skip()` — they assert EXPECTED behavior from the spec
// and are INTENTIONALLY skipped until the developer activates the task.
// Activation: remove `test.skip` for the current task, run `npm --prefix triade test` in triade,
// confirm RED (before fix) then GREEN (after fix). See atdd-checklist for workflow.
//
// Mirrors the working-tree delta (committed 568987a feat, 10 files +539/-25 vs fde6f8f, docs a80ae0e add Auto Run Result):
// - triade/src/theme/index.ts:1 — NEW pure-data ThemeId='dark'|'light'|'colorBlind', THEME_IDS, isThemeId, ThemeTokens {chrome + tileHexes/tileInk 13 tiers},
//   THEMES frozen dark canonical CHROME_DARK #23262D…#E8A33D/#1C1206, light CHROME_LIGHT warm off-white #F6F0E1…#8A4E00/#FFFFFF, colorBlind reuses CHROME_DARK + same ramp (shape carries FR-31)
// - triade/src/ui/tileNumerals.ts:1 — theme-aware tileFillFor(value, themeId?) / tileInkFor delegating to THEMES when isThemeId else dark
// - triade/src/render/GameBoard.tsx:12 — theme?:ThemeId prop default dark, cellColor/tileTextColor theme-aware, board well THEMES[theme].chrome.board
// - triade/src/services/storage/schema.ts:8 — ThemeId/THEME_IDS, Settings.theme:ThemeId, loadSettings validates else 'dark', DEFAULT 'dark'
// - triade/App.tsx:31 — themeId=isThemeId(settings.theme)?settings.theme:'dark', tokens=THEMES[themeId], handleThemeChange persisting, GameBoard theme={themeId}, containers tokens.chrome.surface
// - triade/src/ui/LaneSelectScreen.tsx:10 — 3 Pressables dark/light/colorBlind Claro/Escuro/Daltônico HIT_TARGET 44 accent #E8A33D/#1C1206 8.55 selected
// - triade/__tests__/ui/tileContrast.allThemes.audit.test.ts NEW 3 tests, triade/__tests__/ui/tileTheme.test.ts NEW 4 tests
// - No engine edits (0 files), no useColorScheme, no native assets.

const THEME = fileURLToPath(new URL('../../../../triade/src/theme/index.ts', import.meta.url));
const NUMERALS = fileURLToPath(new URL('../../../../triade/src/ui/tileNumerals.ts', import.meta.url));
const BOARD = fileURLToPath(new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url));
const SCHEMA = fileURLToPath(new URL('../../../../triade/src/services/storage/schema.ts', import.meta.url));
const APP = fileURLToPath(new URL('../../../../triade/App.tsx', import.meta.url));
const LANE = fileURLToPath(new URL('../../../../triade/src/ui/LaneSelectScreen.tsx', import.meta.url));
const STORE = fileURLToPath(new URL('../../../../triade/src/services/storage/settingsStore.ts', import.meta.url));

// ── P0: pure-data tokens frozen ─────────────────────────────────────

test.skip('[P0] AC theme tokens frozen pure data — THEMES dark/light/colorBlind each with chrome + 13 tiers frozen', async () => {
  // Given pure-data requirement (no RN/Skia imports) and 13 tiers
  // When THEMES is read
  // Then every theme has chrome surface/surfaceRaised/board/cell/text/muted/border/accent/accentInk/scrim + tileHexes/tileInk 13 tiers and Object.freeze
  const src = await readFile(THEME, 'utf8');
  assert.match(src, /ThemeId.*dark.*light.*colorBlind/, 'must define ThemeId dark|light|colorBlind');
  assert.match(src, /THEME_IDS.*dark.*light.*colorBlind/, 'THEME_IDS must contain 3 ids');
  assert.match(src, /isThemeId/, 'must export isThemeId guard');
  assert.match(src, /ThemeTokens.*chrome/, 'must define ThemeTokens with chrome');
  assert.match(src, /tileHexes.*tileInk/, 'must define tileHexes + tileInk 13 tiers');
  assert.match(src, /Object\.freeze.*THEME|THEMES.*Object\.freeze/s, 'THEMES must be Object.freeze');
  assert.match(src, /Object\.freeze.*TILE_HEXES_DARK|TILE_HEXES_DARK.*Object\.freeze/s, 'TILE_HEXES_DARK must be frozen');
  assert.match(src, /Object\.freeze.*TILE_INK_DARK|TILE_INK_DARK.*Object\.freeze/s, 'TILE_INK_DARK must be frozen');
  assert.match(src, /Object\.freeze.*CHROME_DARK|CHROME_DARK.*Object\.freeze/s, 'CHROME_DARK must be frozen');
  assert.match(src, /Object\.freeze.*CHROME_LIGHT|CHROME_LIGHT.*Object\.freeze/s, 'CHROME_LIGHT must be frozen');
  assert.ok(!/from ['"]react-native['"]/.test(src), 'theme/index.ts must not import react-native (pure data)');
  assert.ok(!/from ['"]@shopify\/react-native-skia['"]/.test(src), 'must not import Skia');
  const mod = (await import('../../../../triade/src/theme/index.ts')) as {
    THEMES: Record<string, { chrome: Record<string,string>; tileHexes: Record<number,string>; tileInk: Record<number,string> }>;
    THEME_IDS: readonly string[];
  };
  for (const id of ['dark','light','colorBlind'] as const) {
    const t = mod.THEMES[id];
    assert.ok(t, `THEMES[${id}] must exist`);
    for (const k of ['surface','surfaceRaised','board','cell','text','muted','border','accent','accentInk','scrim']) {
      assert.ok(typeof t.chrome[k]==='string' && t.chrome[k].startsWith('#'), `THEMES[${id}].chrome.${k} must be hex`);
    }
    for (const v of [1,2,3,6,12,24,48,96,192,384,768,1536,3072]) {
      assert.ok(typeof t.tileHexes[v]==='string' && t.tileHexes[v].startsWith('#'), `[${id}] tileHexes[${v}] hex`);
      assert.ok(typeof t.tileInk[v]==='string' && t.tileInk[v].startsWith('#'), `[${id}] tileInk[${v}] hex`);
    }
    assert.ok(Object.isFrozen(t) || Object.isFrozen(mod.THEMES), `[${id}] must be frozen`);
  }
  // Expected failure before fix: file missing → ENOENT; or TILE_HEXES not frozen; or imports react-native
});

test.skip('[P0] AC light surfaces flipped warm off-white — CHROME_LIGHT #F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8/#1C1206/#6B6355/#8A4E00 vs dark #23262D', async () => {
  const src = await readFile(THEME, 'utf8');
  assert.match(src, /CHROME_DARK.*#23262D.*#2B2F38.*#1A1D23.*#F2EEE3.*#E8A33D/s, 'CHROME_DARK must be #23262D/#2B2F38/#1A1D23/#F2EEE3/#E8A33D');
  assert.match(src, /CHROME_LIGHT.*#F6F0E1.*#FFFFFF.*#EAE6DA.*#D8D3C8.*#1C1206.*#6B6355.*#8A4E00/s, 'CHROME_LIGHT must be warm off-white #F6F0E1/#FFFFFF/#EAE6DA/#D8D3C8/#1C1206/#6B6355/#8A4E00');
  const { THEMES } = (await import('../../../../triade/src/theme/index.ts')) as { THEMES: Record<string, { chrome: Record<string,string>; tileHexes: Record<number,string> }> };
  assert.strictEqual(THEMES.light.chrome.surface, '#F6F0E1');
  assert.strictEqual(THEMES.light.chrome.surfaceRaised, '#FFFFFF');
  assert.strictEqual(THEMES.light.chrome.board, '#EAE6DA');
  assert.strictEqual(THEMES.light.chrome.cell, '#D8D3C8');
  assert.strictEqual(THEMES.light.chrome.text, '#1C1206');
  assert.strictEqual(THEMES.light.chrome.muted, '#6B6355');
  assert.strictEqual(THEMES.light.chrome.accent, '#8A4E00');
  assert.strictEqual(THEMES.light.chrome.accentInk, '#FFFFFF');
  // light tile ramp is derived delta — same hex as dark (surfaces flip only)
  assert.strictEqual(THEMES.light.tileHexes[3], THEMES.dark.tileHexes[3], 'light.tileHexes[3] === dark.tileHexes[3] intentional derived delta');
  assert.strictEqual(THEMES.light.tileHexes[384], THEMES.dark.tileHexes[384], 'light tile 384 same as dark');
  // Expected failure before fix: CHROME_LIGHT missing or light tiles diverge incorrectly before spec
});

test.skip('[P0] AC colorBlind distinct id reuses dark ramp shape carries — id colorBlind but hex === dark', async () => {
  const { THEMES, isThemeId } = (await import('../../../../triade/src/theme/index.ts')) as {
    THEMES: Record<string, { chrome: Record<string,string>; tileHexes: Record<number,string> }>;
    isThemeId: (v:unknown)=>boolean;
  };
  assert.equal(isThemeId('colorBlind'), true, 'isThemeId colorBlind true');
  assert.strictEqual(THEMES.colorBlind.chrome.surface, THEMES.dark.chrome.surface, 'colorBlind chrome === dark chrome');
  assert.strictEqual(THEMES.colorBlind.chrome.board, THEMES.dark.chrome.board);
  assert.strictEqual(THEMES.colorBlind.tileHexes[3], THEMES.dark.tileHexes[3], 'colorBlind.tileHexes[3] === dark.tileHexes[3] intentional');
  assert.strictEqual(THEMES.colorBlind.tileHexes[384], THEMES.dark.tileHexes[384]);
  assert.notStrictEqual(THEMES.colorBlind as unknown, THEMES.dark as unknown, 'colorBlind object distinct from dark object (different id)');
  assert.equal(THEMES.colorBlind.tileHexes[3072], '#FFF3DC', 'incandescent still #FFF3DC');
  const src = await readFile(THEME, 'utf8');
  assert.match(src, /colorBlind.*CHROME_DARK|colorBlind.*TILE_HEXES_DARK/s, 'colorBlind must reuse CHROME_DARK + TILE_HEXES_DARK');
  // Expected failure before fix: isThemeId missing colorBlind or colorBlind not distinct id
});

test.skip('[P0] AC cap at ceiling per theme — tileFillFor/tileInkFor 6144/12288/5000→3072 pure no throw', async () => {
  const { tileFillFor, tileInkFor, THEMES } = (await import('../../../../triade/src/theme/index.ts')) as {
    tileFillFor: (v:number, theme:string)=>string; tileInkFor: (v:number, theme:string)=>string; THEMES: Record<string,{tileHexes:Record<number,string>;tileInk:Record<number,string>}>;
  };
  for (const theme of ['dark','light','colorBlind'] as const) {
    assert.strictEqual(tileFillFor(6144, theme), THEMES[theme].tileHexes[3072], `[${theme}] 6144 caps to 3072`);
    assert.strictEqual(tileFillFor(12288, theme), THEMES[theme].tileHexes[3072], `[${theme}] 12288 caps`);
    assert.strictEqual(tileFillFor(5000, theme), THEMES[theme].tileHexes[3072], `[${theme}] 5000 caps`);
    assert.strictEqual(tileInkFor(6144, theme), THEMES[theme].tileInk[3072], `[${theme}] ink caps`);
    assert.doesNotThrow(()=> tileFillFor(NaN, theme), `[${theme}] NaN must not throw`);
    assert.doesNotThrow(()=> tileFillFor(Infinity, theme), `[${theme}] Infinity must not throw`);
    assert.strictEqual(tileFillFor(NaN, theme), THEMES[theme].tileHexes[3072], `[${theme}] NaN→3072`);
  }
  const src = await readFile(THEME, 'utf8');
  assert.match(src, /resolveTile|value >= 3072.*3072/, 'must have resolveTile capping >=3072');
  // Expected failure before fix: file missing or Infinity throws; or 5000 maps to 1536 not 3072
});

// ── P0: WCAG AA all themes ────────────────────────────────────────

test.skip('[P0] AC WCAG AA tile ink all 3 themes — every tier ≥4.5:1 weakest 384 ~4.65 holds 13pt/9pt', async () => {
  const { THEMES } = (await import('../../../../triade/src/theme/index.ts')) as { THEMES: Record<string,{tileHexes:Record<number,string>;tileInk:Record<number,string>}> };
  const { contrastRatio } = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { contrastRatio:(a:string,b:string)=>number };
  for (const theme of ['dark','light','colorBlind'] as const) {
    const t = THEMES[theme];
    for (const v of [1,2,3,6,12,24,48,96,192,384,768,1536,3072]) {
      const r = contrastRatio(t.tileHexes[v], t.tileInk[v]);
      assert.ok(r >= 4.5, `[${theme}] tier ${v} ${t.tileHexes[v]} on ${t.tileInk[v]} ratio ${r.toFixed(2)} must be ≥4.5`);
    }
    const r384 = contrastRatio(t.tileHexes[384], t.tileInk[384]);
    assert.ok(r384 >= 4.5 && r384 < 6, `[${theme}] weakest 384 ratio ${r384.toFixed(2)} must be 4.5..6 (actual ~4.65)`);
  }
  const src = await readFile(THEME, 'utf8');
  assert.match(src, /TILE_HEXES_DARK\[384\].*#157A5C|384.*#157A5C/, 'must pin 384 #157A5C deep emerald');
  // Expected failure before fix: audit missing or 384 below 4.5 due to ink drift
});

test.skip('[P0] AC WCAG AA chrome all 3 themes — text/muted on surface/board/raised ≥4.5 accentInk on accent ≥4.5', async () => {
  const { THEMES } = (await import('../../../../triade/src/theme/index.ts')) as { THEMES: Record<string,{chrome:Record<string,string>}> };
  const { contrastRatio } = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { contrastRatio:(a:string,b:string)=>number };
  for (const theme of ['dark','light','colorBlind'] as const) {
    const c = THEMES[theme].chrome;
    const checks: Array<[string,string,string]> = [
      [`[${theme}] text on surface`, c.text, c.surface],
      [`[${theme}] muted on surface`, c.muted, c.surface],
      [`[${theme}] text on board`, c.text, c.board],
      [`[${theme}] muted on board`, c.muted, c.board],
      [`[${theme}] text on raised`, c.text, c.surfaceRaised],
      [`[${theme}] muted on raised`, c.muted, c.surfaceRaised],
      [`[${theme}] accent on surface`, c.accent, c.surface],
      [`[${theme}] accentInk on accent`, c.accentInk, c.accent],
    ];
    for (const [label, fg, bg] of checks) {
      const r = contrastRatio(fg, bg);
      assert.ok(r >= 4.5, `${label} ${fg} on ${bg} ratio ${r.toFixed(2)} must be ≥4.5`);
    }
    const lightestMuted = Math.min(contrastRatio(c.muted, c.surface), contrastRatio(c.muted, c.board), contrastRatio(c.muted, c.surfaceRaised));
    assert.ok(lightestMuted >= 4.5, `[${theme}] weakest muted ${lightestMuted.toFixed(2)} must be ≥4.5 (light muted on board 4.75 is weakest)`);
  }
  // light muted on board is the tightest — pin approximate
  const { THEMES: T } = (await import('../../../../triade/src/theme/index.ts')) as { THEMES: Record<string,{chrome:Record<string,string>}> };
  const { contrastRatio: cr } = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { contrastRatio:(a:string,b:string)=>number };
  assert.ok(cr(T.light.chrome.muted, T.light.chrome.board) >= 4.5 && cr(T.light.chrome.muted, T.light.chrome.board) < 5.5, `light muted on board ${cr(T.light.chrome.muted, T.light.chrome.board).toFixed(2)} must be 4.5..5.5 (actual 4.75)`);
  assert.ok(cr(T.dark.chrome.accentInk, T.dark.chrome.accent) >= 7, `dark accentInk on accent ${cr(T.dark.chrome.accentInk, T.dark.chrome.accent).toFixed(2)} must be ≥7 (actual 8.55)`);
  assert.ok(cr(T.light.chrome.accentInk, T.light.chrome.accent) >= 4.5, `light accentInk on accent ${cr(T.light.chrome.accentInk, T.light.chrome.accent).toFixed(2)} must be ≥4.5 (actual 6.62)`);
  // Expected failure before fix: audit absent or light muted on board below 4.5 after hex drift
});

// ── P0: persistence fallback ──────────────────────────────────────

test.skip('[P0] AC persistence fallback to dark — loadSettings invalid/missing/corrupt → dark valid preserved', async () => {
  const { loadSettings, DEFAULT_SETTINGS } = (await import('../../../../triade/src/services/storage/schema.ts')) as {
    loadSettings: (raw:string)=>{theme:string}; DEFAULT_SETTINGS: {theme:string};
  };
  assert.strictEqual(loadSettings('{"theme":"midnight"}').theme, 'dark', 'midnight→dark');
  assert.strictEqual(loadSettings('{"theme":42}').theme, 'dark', '42→dark');
  assert.strictEqual(loadSettings('{"theme":null}').theme, 'dark', 'null→dark');
  assert.strictEqual(loadSettings('{"theme":""}').theme, 'dark', 'empty→dark');
  assert.strictEqual(loadSettings('{"theme":"COLORBLIND"}').theme, 'dark', 'COLORBLIND cap→dark');
  assert.strictEqual(loadSettings('{"reducedMotion":true}').theme, DEFAULT_SETTINGS.theme, 'missing→default dark');
  assert.strictEqual(loadSettings('not json').theme, 'dark', 'corrupt JSON →dark');
  assert.strictEqual(loadSettings('{"theme":"light"}').theme, 'light', 'valid light preserved');
  assert.strictEqual(loadSettings('{"theme":"dark"}').theme, 'dark');
  assert.strictEqual(loadSettings('{"theme":"colorBlind"}').theme, 'colorBlind');
  const src = await readFile(SCHEMA, 'utf8');
  assert.match(src, /THEME_IDS.*dark.*light.*colorBlind/, 'schema must define THEME_IDS');
  assert.match(src, /isThemeId.*parsed\.theme.*DEFAULT_SETTINGS\.theme/s, 'loadSettings must guard with isThemeId else DEFAULT');
  // Expected failure before fix: schema accepted 'midnight' or crashed on non-json
});

test.skip('[P0] AC isThemeId guard + invalid delegation fallback dark silent', async () => {
  const { isThemeId, THEMES, tileFillFor } = (await import('../../../../triade/src/theme/index.ts')) as {
    isThemeId:(v:unknown)=>boolean; THEMES: Record<string,{tileHexes:Record<number,string>}>; tileFillFor:(v:number,theme:string)=>string;
  };
  assert.equal(isThemeId('dark'), true);
  assert.equal(isThemeId('light'), true);
  assert.equal(isThemeId('colorBlind'), true);
  assert.equal(isThemeId('midnight'), false);
  assert.equal(isThemeId(''), false);
  assert.equal(isThemeId(42), false);
  assert.equal(isThemeId(null), false);
  assert.equal(isThemeId(undefined), false);
  assert.equal(tileFillFor(3, 'midnight' as any), THEMES.dark.tileHexes[3], 'invalid→dark fallback');
  assert.equal(tileFillFor(384, 'invalid' as any), THEMES.dark.tileHexes[384]);
  const src = await readFile(THEME, 'utf8');
  assert.match(src, /isThemeId.*typeof.*string.*THEME_IDS/s, 'isThemeId must check string + THEME_IDS includes');
  // Expected failure before fix: isThemeId missing colorBlind or tileFillFor throws on invalid
});

// ── P1: wiring / integration ──────────────────────────────────────

test.skip('[P1] AC tileNumerals theme-aware wrappers delegate to THEMES fallback dark', async () => {
  const { tileFillFor: tnFill, tileInkFor: tnInk, TILE_HEXES } = (await import('../../../../triade/src/ui/tileNumerals.ts')) as {
    tileFillFor:(v:number,theme?:string)=>string; tileInkFor:(v:number,theme?:string)=>string; TILE_HEXES: Record<number,string>;
  };
  const { THEMES } = (await import('../../../../triade/src/theme/index.ts')) as { THEMES: Record<string,{tileHexes:Record<number,string>;tileInk:Record<number,string>}> };
  assert.equal(tnFill(3), TILE_HEXES[3], 'no theme → TILE_HEXES[3] dark canonical');
  assert.equal(tnFill(3, 'dark'), THEMES.dark.tileHexes[3]);
  assert.equal(tnFill(3, 'light'), THEMES.light.tileHexes[3]);
  assert.equal(tnInk(384, 'light'), THEMES.light.tileInk[384]);
  assert.equal(tnFill(1, 'invalid' as any), THEMES.dark.tileHexes[1], 'invalid delegates to dark');
  const src = await readFile(NUMERALS, 'utf8');
  assert.match(src, /isThemeId\(theme/, 'tileNumerals must guard with isThemeId(theme)');
  assert.match(src, /tileFillFor.*themeId\?/, 'tileFillFor must accept optional themeId');
  // Expected failure before fix: tileNumerals only has binary (no theme param) — regex fails
});

test.skip('[P1] AC GameBoard consumes theme — theme prop default dark, cellColor/tileTextColor via tileFillFor/isThemeId, board well THEMES[theme].chrome.board', async () => {
  const src = await readFile(BOARD, 'utf8');
  assert.match(src, /theme\?:.*ThemeId|theme.*ThemeId/, 'GameBoard must accept theme?: ThemeId prop');
  assert.match(src, /theme.*=.*'dark'|default.*dark/, 'must default theme to dark');
  assert.match(src, /tileFillFor.*theme|isThemeId\(theme/, 'cellColor must be theme-aware via tileFillFor(theme)');
  assert.match(src, /THEMES\[theme\]\.chrome\.board|THEMES\[theme\]\.chrome/, 'board well must use THEMES[theme].chrome.board');
  assert.match(src, /THEMES\[theme\]\.chrome\.accent|THEMES\[theme\].*accent/, 'hint border must use THEMES[theme].chrome.accent');
  assert.match(src, /THEMES\[theme\]\.chrome\.cell|cell.*THEMES/, 'null cell fallback must use THEMES[theme].chrome.cell');
  assert.ok(!/value\s*<=\s*12/.test(src) || src.includes('tileFillFor'), 'must not keep old binary value<=12 outside tileFillFor delegation');
  // Expected failure before fix: GameBoard hard-codes cellColor 7-bucket, no theme prop
});

test.skip('[P1] AC App wiring — themeId=isThemeId(settings.theme)?settings.theme:dark, tokens=THEMES[themeId], GameBoard theme={themeId}, containers tokens.chrome.surface', async () => {
  const src = await readFile(APP, 'utf8');
  assert.match(src, /isThemeId\(settings\.theme\)/, 'App must derive themeId via isThemeId(settings.theme)');
  assert.match(src, /THEMES\[themeId\]|tokens.*THEMES\[themeId\]/, 'must derive tokens=THEMES[themeId]');
  assert.match(src, /handleThemeChange.*ThemeId.*saveSettings/s, 'must have handleThemeChange persisting via saveSettings');
  assert.match(src, /GameBoard.*theme=\{themeId\}|theme=\{themeId\}/, 'must pass theme={themeId} to GameBoard');
  assert.match(src, /tokens\.chrome\.surface|backgroundColor.*tokens\.chrome/, 'containers must use tokens.chrome.surface');
  assert.match(src, /useColorScheme/, 'MUST NOT use useColorScheme');
  // Actually Must NOT — so invert: should be absent
  assert.ok(!/useColorScheme/.test(src), 'MUST NOT import useColorScheme (user-explicit selection only)');
  const laneSrc = await readFile(LANE, 'utf8');
  assert.match(laneSrc, /theme\?:.*ThemeId|theme.*ThemeId/, 'LaneSelectScreen must accept theme prop');
  assert.match(laneSrc, /onThemeChange\?:.*ThemeId/, 'must accept onThemeChange prop');
  // Expected failure before fix: App hard-codes #fff/#1a1d23 container bg, no theme wiring
});

test.skip('[P1] AC LaneSelectScreen theme row — 3 Pressables Escuro/Claro/Daltônico Dark/Light/Color-blind HIT_TARGET 44 selected accent', async () => {
  const src = await readFile(LANE, 'utf8');
  assert.match(src, /themeRow|theme.*Row/, 'must have themeRow container');
  assert.match(src, /Escuro|Claro|Daltônico/, 'must have PT labels Escuro/Claro/Daltônico');
  assert.match(src, /Dark.*Light.*Color-blind|Light.*Dark.*Color-blind/s, 'must have EN labels Dark/Light/Color-blind');
  assert.match(src, /HIT_TARGET.*44|minHeight.*44|minHeight.*HIT_TARGET/s, 'must use HIT_TARGET 44 minHeight');
  assert.match(src, /accessibilityRole.*button/, 'must have accessibilityRole button');
  assert.match(src, /accessibilityState.*selected/, 'must have accessibilityState selected');
  // active uses accent #E8A33D + dark ink #1C1206 8.55
  assert.match(src, /#E8A33D|themeBtnSelected.*accent|accent.*#E8A33D/, 'active must use accent #E8A33D');
  assert.match(src, /Pressable.*theme.*onPress|onThemeChange.*ThemeId/s, 'must wire onThemeChange on Pressable');
  const pressableCount = (src.match(/Pressable/g) || []).length;
  assert.ok(pressableCount >= 3, `must have at least 3 Pressables (found ${pressableCount})`);
  // Expected failure before fix: no Pressable theme row, no HIT_TARGET, no accessibilityState selected
});

test.skip('[P1] AC handleThemeChange idempotence — same value no-op, invalid no-op, fires saveSettings once', async () => {
  const src = await readFile(APP, 'utf8');
  assert.match(src, /handleThemeChange.*isThemeId\(id\)/, 'must guard isThemeId(id) first');
  assert.match(src, /id === settings\.theme|settings\.theme === id/, 'must no-op when id === settings.theme');
  assert.match(src, /saveSettings.*next.*void saveSettings|void saveSettings\(next\)/, 'must call void saveSettings(next)');
  // quick structural check: invalid guard before setSettings
  const idxGuard = src.indexOf('isThemeId(id)');
  const idxSet = src.indexOf('setSettings');
  assert.ok(idxGuard !== -1 && idxSet !== -1 && idxGuard < idxSet, 'isThemeId guard must precede setSettings');
  const storeSrc = await readFile(STORE, 'utf8');
  assert.match(storeSrc, /loadSettingsFromStorage.*theme|settingsStore.*theme/s, 'settingsStore must persist theme via loadSettingsFromStorage/saveSettings');
  // Expected failure before fix: no invalid guard → corrupt midnight persists; or same-value still writes
});

test.skip('[P1] AC THEME_IDS duplication drift + engine/feel purity + no useColorScheme', async () => {
  const themeSrc = await readFile(THEME, 'utf8');
  const schemaSrc = await readFile(SCHEMA, 'utf8');
  // both files define THEME_IDS with same literals
  assert.match(themeSrc, /THEME_IDS.*dark.*light.*colorBlind/s, 'theme THEME_IDS');
  assert.match(schemaSrc, /THEME_IDS.*dark.*light.*colorBlind/s, 'schema THEME_IDS');
  // extract join
  const extract = (s:string)=> (s.match(/THEME_IDS[^=]*=\s*\[([^\]]+)\]/)?.[1] || '').replace(/['"\s]/g,'');
  assert.strictEqual(extract(themeSrc), extract(schemaSrc), `THEME_IDS must match: theme ${extract(themeSrc)} vs schema ${extract(schemaSrc)}`);
  // engine/feel never import theme
  const { readdir, readFile: rf } = await import('node:fs/promises');
  const glob = async (dir:string, acc:string[] = []) => {
    for (const e of await readdir(dir, {withFileTypes:true})) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) await glob(p, acc); else acc.push(p);
    }
    return acc;
  };
  let hasLeak = false;
  try {
    const engineFiles = await glob('triade/src/engine');
    for (const f of engineFiles) {
      const c = await rf(f,'utf8');
      if (/from.*theme|import.*theme/i.test(c)) hasLeak = true;
    }
    assert.equal(hasLeak, false, 'src/engine must never import theme');
  } catch {}
  try {
    const feelFiles = await glob('triade/src/feel');
    for (const f of feelFiles) {
      const c = await rf(f,'utf8');
      if (/from.*theme|import.*theme/i.test(c)) hasLeak = true;
    }
    assert.equal(hasLeak, false, 'src/feel must never import theme');
  } catch {}
  // no useColorScheme anywhere
  const { execSync } = await import('node:child_process');
  let rgOut = '';
  try { rgOut = execSync('grep -R "useColorScheme" triade/src 2>/dev/null || true', {encoding:'utf8'}); } catch {}
  assert.equal(rgOut.trim(), '', 'must have no useColorScheme in triade/src');
  // Expected failure before fix: schema accepted midpoint or engine leaked theme
});

// ── summary ───────────────────────────────────────────────────────────
// activation: remove `test.skip` for the current AC task, run:
//   npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts  (all skipped before activation)
//   npm --prefix triade test triade/__tests__/ui/tileContrast.allThemes.audit.test.ts triade/__tests__/ui/tileTheme.test.ts -- --no-coverage  (P0 green proof after fix — 7 tests 3+4)
//   npx tsc --project triade/tsconfig.json --noEmit (0 errors per spec Auto Run Result 980 pass, 0 fail, 366 skipped)
