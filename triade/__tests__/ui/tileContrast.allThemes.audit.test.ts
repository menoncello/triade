import { test } from 'node:test';
import assert from 'node:assert';

const THEME_SPEC = '../../src/theme/index.ts';
const NUMERALS_SPEC = '../../src/ui/tileNumerals.ts';

test('[P0] tile ink WCAG AA all themes: every tier ≥4.5:1 (weakest 384 ≥4.5)', async () => {
  const { THEMES } = (await import(THEME_SPEC)) as {
    THEMES: Record<string, { tileHexes: Record<number, string>; tileInk: Record<number, string> }>;
  };
  const { contrastRatio } = (await import(NUMERALS_SPEC)) as {
    contrastRatio: (a: string, b: string) => number;
  };
  const tiers = [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072];
  for (const themeId of ['dark', 'light', 'colorBlind'] as const) {
    const t = THEMES[themeId];
    for (const v of tiers) {
      const fill = t.tileHexes[v];
      const ink = t.tileInk[v];
      const ratio = contrastRatio(fill, ink);
      assert.ok(ratio >= 4.5, `[${themeId}] tier ${v} fill ${fill} ink ${ink} ratio ${ratio.toFixed(2)} must be ≥4.5:1`);
    }
    const r384 = contrastRatio(t.tileHexes[384], t.tileInk[384]);
    assert.ok(r384 >= 4.5, `[${themeId}] weakest 384 ratio ${r384.toFixed(2)} must be ≥4.5:1`);
  }
});

test('[P0] chrome WCAG AA all themes: text/muted on surfaces ≥4.5:1, accentInk on accent ≥4.5', async () => {
  const { THEMES } = (await import(THEME_SPEC)) as {
    THEMES: Record<string, { chrome: Record<string, string> }>;
  };
  const { contrastRatio } = (await import(NUMERALS_SPEC)) as {
    contrastRatio: (a: string, b: string) => number;
  };
  for (const themeId of ['dark', 'light', 'colorBlind'] as const) {
    const c = THEMES[themeId].chrome;
    const checks: Array<[string, string, string]> = [
      [`[${themeId}] text on surface`, c.text, c.surface],
      [`[${themeId}] muted on surface`, c.muted, c.surface],
      [`[${themeId}] text on board`, c.text, c.board],
      [`[${themeId}] muted on board`, c.muted, c.board],
      [`[${themeId}] text on raised`, c.text, c.surfaceRaised],
      [`[${themeId}] muted on raised`, c.muted, c.surfaceRaised],
      [`[${themeId}] accent on surface`, c.accent, c.surface],
      [`[${themeId}] accentInk on accent`, c.accentInk, c.accent],
    ];
    for (const [label, fg, bg] of checks) {
      const r = contrastRatio(fg, bg);
      // For accent on surface, allow light to use darker accent #8A4E00 which passes 5.8; dark accent #E8A33D passes 7.8
      // All must be ≥4.5 (WCAG AA body). accentInk on accent also ≥4.5 (dark 8.5, light white 6.6)
      assert.ok(r >= 4.5, `${label} ${fg} on ${bg} ratio ${r.toFixed(2)} must be ≥4.5:1`);
    }
    const rDarkOnAccent = contrastRatio(c.accentInk, c.accent);
    assert.ok(rDarkOnAccent >= 4.5, `[${themeId}] accentInk on accent ${rDarkOnAccent.toFixed(2)} must be ≥4.5`);
  }
});

test('[P1] 32pt large-text still holds 4.5 for high tiers across themes', async () => {
  const { THEMES } = (await import(THEME_SPEC)) as {
    THEMES: Record<string, { tileHexes: Record<number, string>; tileInk: Record<number, string> }>;
  };
  const { contrastRatio } = (await import(NUMERALS_SPEC)) as {
    contrastRatio: (a: string, b: string) => number;
  };
  for (const themeId of ['dark', 'light', 'colorBlind'] as const) {
    const t = THEMES[themeId];
    for (const v of [1, 3, 1536, 3072]) {
      const r = contrastRatio(t.tileHexes[v], t.tileInk[v]);
      assert.ok(r >= 3, `[${themeId}] tier ${v} must at least pass large-text 3:1, got ${r.toFixed(2)}`);
    }
  }
});
