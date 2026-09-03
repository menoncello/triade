import { test } from 'node:test';
import assert from 'node:assert';

const SPEC = '../../src/ui/tileNumerals.ts';

// DESIGN dark canonical tokens
const SURFACE = '#23262D';
const SURFACE_RAISED = '#2B2F38';
const BOARD = '#1A1D23';
const TEXT = '#F2EEE3';
const MUTED = '#A39C8F';
const ACCENT = '#E8A33D';
const DARK_INK = '#1C1206';

test('[P0] tile ink contrast WCAG AA dark canonical: every tier ≥4.5:1 (weakest 384 ≥4.5, ~4.7 design)', async () => {
  const { TILE_HEXES, TILE_INK, contrastRatio } = (await import(SPEC)) as {
    TILE_HEXES: Record<number, string>;
    TILE_INK: Record<number, string>;
    contrastRatio: (a: string, b: string) => number;
  };
  const tiers = [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072];
  for (const v of tiers) {
    const fill = TILE_HEXES[v];
    const ink = TILE_INK[v];
    const ratio = contrastRatio(fill, ink);
    assert.ok(ratio >= 4.5, `tier ${v} fill ${fill} ink ${ink} ratio ${ratio.toFixed(2)} must be ≥4.5:1 (WCAG AA small text)`);
  }
  const r384 = contrastRatio(TILE_HEXES[384], TILE_INK[384]);
  // DESIGN notes weakest is 384 deep emerald ~4.7:1 — allow small tolerance (computed 4.65 with #F6F0E1)
  assert.ok(r384 >= 4.5, `weakest 384 ratio ${r384.toFixed(2)} must be ≥4.5:1 (DESIGN ~4.7:1)`);
});

test('[P0] chrome contrast WCAG AA dark canonical: text/muted/accent on surfaces ≥4.5:1', async () => {
  const { contrastRatio } = (await import(SPEC)) as {
    contrastRatio: (a: string, b: string) => number;
  };
  const checks: Array<[string, string, string, number]> = [
    ['text on board', TEXT, BOARD, 4.5],
    ['muted on board', MUTED, BOARD, 4.5],
    ['accent on board', ACCENT, BOARD, 4.5],
    ['text on surface', TEXT, SURFACE, 4.5],
    ['muted on surface', MUTED, SURFACE, 4.5],
    ['accent on surface', ACCENT, SURFACE, 4.5],
    ['accent on raised', ACCENT, SURFACE_RAISED, 4.5],
    ['muted on raised', MUTED, SURFACE_RAISED, 4.5],
    ['dark ink on accent', DARK_INK, ACCENT, 4.5],
  ];
  for (const [label, fg, bg, min] of checks) {
    const r = contrastRatio(fg, bg);
    assert.ok(r >= min, `${label} ${fg} on ${bg} ratio ${r.toFixed(2)} must be ≥${min}:1`);
  }
  // Accent specifically documents ≈7.0:1 on surface — pin high assurance
  const rAccentSurface = contrastRatio(ACCENT, SURFACE);
  assert.ok(rAccentSurface >= 6.5, `accent on surface ${rAccentSurface.toFixed(2)} must be ≥6.5 (DESIGN ~7.0)`);
  const rDarkOnAccent = contrastRatio(DARK_INK, ACCENT);
  assert.ok(rDarkOnAccent >= 7, `dark on accent ${rDarkOnAccent.toFixed(2)} must be ≥7 (DESIGN ~8.6)`);
});

test('[P1] 32pt large-text 3:1 exemption still holds 4.5 (but audit enforces 4.5 for 13/9pt)', async () => {
  const { TILE_HEXES, TILE_INK, contrastRatio } = (await import(SPEC)) as {
    TILE_HEXES: Record<number, string>;
    TILE_INK: Record<number, string>;
    contrastRatio: (a: string, b: string) => number;
  };
  // 13pt/9pt numerals (4-5 digits, 6+ digits) must hold 4.5, not just 3:1
  // Our audit above already covers, but explicitly check lightest high tier still ≥3:1
  for (const v of [1, 3, 1536, 3072]) {
    const r = contrastRatio(TILE_HEXES[v], TILE_INK[v]);
    assert.ok(r >= 3, `tier ${v} must at least pass large-text 3:1, got ${r.toFixed(2)}`);
  }
});
