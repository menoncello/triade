import { test } from 'node:test';
import assert from 'node:assert';

test('[P0] 13-tier hex+ink per theme matches spec and caps 6144/12288 → 3072+', async () => {
  const { THEMES, tileFillFor, tileInkFor } = (await import('../../src/theme/index.ts')) as {
    THEMES: Record<string, { tileHexes: Record<number, string>; tileInk: Record<number, string> }>;
    tileFillFor: (v: number, theme: string) => string;
    tileInkFor: (v: number, theme: string) => string;
  };
  const tiers = [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072];
  for (const themeId of ['dark', 'light', 'colorBlind'] as const) {
    const t = THEMES[themeId];
    for (const v of tiers) {
      assert.ok(typeof t.tileHexes[v] === 'string' && t.tileHexes[v].startsWith('#'), `[${themeId}] tier ${v} hex must be #`);
      assert.ok(typeof t.tileInk[v] === 'string' && t.tileInk[v].startsWith('#'), `[${themeId}] tier ${v} ink must be #`);
    }
    // caps
    assert.equal(tileFillFor(6144, themeId), t.tileHexes[3072], `[${themeId}] 6144 caps to 3072`);
    assert.equal(tileFillFor(12288, themeId), t.tileHexes[3072], `[${themeId}] 12288 caps to 3072`);
    assert.equal(tileInkFor(6144, themeId), t.tileInk[3072], `[${themeId}] 6144 ink caps`);
    assert.equal(tileFillFor(5000, themeId), t.tileHexes[3072], `[${themeId}] 5000 caps`);
  }
});

test('[P0] isThemeId guards invalid and tileFillFor falls back to dark', async () => {
  const { isThemeId, THEMES, tileFillFor } = (await import('../../src/theme/index.ts')) as {
    isThemeId: (v: unknown) => boolean;
    THEMES: Record<string, { tileHexes: Record<number, string> }>;
    tileFillFor: (v: number, theme: string) => string;
  };
  assert.equal(isThemeId('dark'), true);
  assert.equal(isThemeId('light'), true);
  assert.equal(isThemeId('colorBlind'), true);
  assert.equal(isThemeId('midnight'), false);
  assert.equal(isThemeId(''), false);
  assert.equal(isThemeId(42), false);
  assert.equal(isThemeId(null), false);
  // invalid theme falls back to dark canonical
  assert.equal(tileFillFor(3, 'midnight' as any), THEMES.dark.tileHexes[3]);
  assert.equal(tileFillFor(384, 'invalid' as any), THEMES.dark.tileHexes[384]);
});

test('[P0] Settings.theme fallback to dark on corrupt/invalid', async () => {
  const { loadSettings, DEFAULT_SETTINGS } = (await import('../../src/services/storage/schema.ts')) as {
    loadSettings: (raw: string) => { theme: string };
    DEFAULT_SETTINGS: { theme: string };
  };
  const corrupt = loadSettings('{"theme":"midnight"}');
  assert.equal(corrupt.theme, 'dark', 'invalid midnight must fallback to dark');
  const validLight = loadSettings('{"theme":"light"}');
  assert.equal(validLight.theme, 'light', 'valid light must be preserved');
  const validDark = loadSettings('{"theme":"dark"}');
  assert.equal(validDark.theme, 'dark');
  const validCB = loadSettings('{"theme":"colorBlind"}');
  assert.equal(validCB.theme, 'colorBlind');
  const missing = loadSettings('{"reducedMotion":true}');
  assert.equal(missing.theme, DEFAULT_SETTINGS.theme, 'missing theme falls back to default dark');
  const wrongType = loadSettings('{"theme":42}');
  assert.equal(wrongType.theme, 'dark', 'wrong typed theme falls back');
});

test('[P1] tileNumerals theme-aware wrappers delegate correctly', async () => {
  const { tileFillFor: tnFill, tileInkFor: tnInk, TILE_HEXES } = (await import('../../src/ui/tileNumerals.ts')) as {
    tileFillFor: (v: number, theme?: string) => string;
    tileInkFor: (v: number, theme?: string) => string;
    TILE_HEXES: Record<number, string>;
  };
  const { THEMES } = (await import('../../src/theme/index.ts')) as {
    THEMES: Record<string, { tileHexes: Record<number, string>; tileInk: Record<number, string> }>;
  };
  // without theme → dark canonical
  assert.equal(tnFill(3), TILE_HEXES[3]);
  assert.equal(tnFill(3, 'dark'), THEMES.dark.tileHexes[3]);
  assert.equal(tnFill(3, 'light'), THEMES.light.tileHexes[3]);
  assert.equal(tnInk(384, 'light'), THEMES.light.tileInk[384]);
  // invalid delegates to dark
  assert.equal(tnFill(1, 'invalid' as any), THEMES.dark.tileHexes[1]);
});
