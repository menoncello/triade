/**
 * E2E Umbrella (delta) — 9-3 automate-1 run (2026-09-08, tea.automate-1).
 * Host node:test static-scan journeys (no page.goto — Expo RN Skia board).
 * Supplements umbrella.spec.ts (2026-09-03). Delta scope: theme-aware board journey
 * (GameBoard theme prop → cellColor/tileTextColor), DW-117/DW-118 journey pins.
 * Dormant test.skip + 1 active journey that always runs.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules node --import tsx --test _bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-tea.automate-1.umbrella.spec.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tilePath = new URL('../../../../triade/src/ui/tileNumerals.ts', import.meta.url).pathname;
const boardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const annPath = new URL('../../../../triade/src/a11y/announcements.ts', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

async function loadTiles() {
  return import(tilePath) as Promise<typeof import('../../../../triade/src/ui/tileNumerals.ts')>;
}

// ── P0 ─────────────────────────────────────────────────────────────────────

test.skip('[P0-UMB-D1] Whole dark board journey — 13 tiers render DESIGN hex+ink via GameBoard theme delegation (R-001)', async () => {
  // Given a board containing every tier 1–3072+ on dark canonical
  const tiles = await loadTiles();
  const board = src(boardPath);
  // When GameBoard resolves colors through the theme seam
  assert.match(board, /theme\?:\s*ThemeId/, 'GameBoard must accept theme prop');
  assert.match(board, /tileFillFor\(value,\s*theme\)/, 'cellColor must delegate tileFillFor(value, theme)');
  assert.match(board, /tileInkFor\(value,\s*theme\)/, 'tileTextColor must delegate tileInkFor(value, theme)');
  assert.match(board, /theme\s*=\s*'dark'/, 'theme must default to dark');
  // Then every tier holds its DESIGN pair at runtime
  for (const v of [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072]) {
    assert.equal(tiles.tileFillFor(v, 'dark'), tiles.tileFillFor(v), `tier ${v} dark fill`);
    assert.ok(tiles.contrastRatio(tiles.tileFillFor(v), tiles.tileInkFor(v)) >= 4.5, `tier ${v} AA`);
  }
});

// ── P1 ─────────────────────────────────────────────────────────────────────

test.skip('[P1-UMB-D2] Grain band wiring journey — shape.bevel drives RoundedRect stroke, grain 2 adds inner inset (R-001/R-002)', () => {
  // Given tier-band shapes low(clean) → mid(bevel 1.2) → emerald(bevel 1.6 + inner)
  const board = src(boardPath);
  // When AnimatedTile renders the grain layer
  assert.match(board, /strokeWidth=\{shape\.bevel\}/, 'outer grain uses shape.bevel');
  assert.match(board, /shape\.grain\s*===\s*2/, 'inner grain only for grain 2');
  assert.match(board, /color="#000000"/, 'grain stroke must be #000000 (never transparent)');
  assert.match(board, /style="stroke"/, 'grain must be stroke style');
  // Then grain is additive overlay — never covers numeral center (inset arithmetic pinned by tileShape bevels)
});

test.skip('[P1-UMB-D3] Theme journey — board chrome + tile fill follow THEMES[theme], invalid theme falls back dark (R-004)', async () => {
  // Given GameBoard rendered under each THEME_ID
  const board = src(boardPath);
  const tiles = await loadTiles();
  // When theme prop flows to chrome + tiles
  assert.match(board, /THEMES\[theme\]\?\.chrome\.board/, 'board chrome follows THEMES[theme]');
  assert.match(board, /THEMES\[theme\]\?\.chrome\.accent/, 'accent follows THEMES[theme]');
  // Then invalid theme never crashes (dark fallback at both layers)
  assert.equal(tiles.tileFillFor(192, 'sepia' as never), tiles.tileFillFor(192, 'dark'), 'fill falls back dark');
  assert.equal(tiles.tileInkFor(192, 'sepia' as never), tiles.tileInkFor(192, 'dark'), 'ink falls back dark');
});

// ── P2 ─────────────────────────────────────────────────────────────────────

test.skip('[P2-UMB-D4] Reduced-motion orthogonality — grain stays declarative under reducedMotion; only glow (isPunch) is feel-gated (spec Always)', () => {
  // Given reducedMotion=true on GameBoard
  const board = src(boardPath);
  // When the grain layer renders
  assert.match(board, /shape\.grain\s*>\s*0/, 'grain renders independent of reducedMotion flag');
  assert.match(board, /hasGlow\s*=\s*Boolean\(isPunch/, 'glow gated via isPunch (feel path respects RM)');
  // Then shape-beyond-color survives Reduced Motion preset (grain declarative, not particle)
});

test.skip('[P2-UMB-D5] Purity + hygiene journey — engine untouched, announcements value-text, sprint-status untouched', () => {
  // Given the 9-3 contract (engine never knows color/shape)
  const ann = src(annPath);
  // Value text lives in locale (en: "Merged: {{a}} plus {{b}} equals {{c}}"); bridge passes numeric a/b/c, never hue
  assert.match(ann, /a11y\.merged/, 'announceMerge must use the a11y.merged value-text key');
  assert.match(ann, /String\(a\).*String\(b\).*String\(c\)/s, 'merge announcement must carry numeric a/b/c');
  assert.ok(!/hue|#[0-9A-Fa-f]{6}/.test(ann), 'announcements never encode hue or hex');
  const tiles = src(tilePath);
  assert.ok(!/from 'react-native'/.test(tiles), 'tileNumerals stays pure (no RN import)');
});

// ── Active journey (always runs) ───────────────────────────────────────────

test('[P0-UMB-DACTIVE] Delta journey — theme delegation + weakest contrast + glow wiring + grain contract', async () => {
  // Given the committed 9-3 board (working tree clean)
  const tiles = await loadTiles();
  const board = src(boardPath);
  // When walking fill → ink → shape → board wiring
  assert.equal(tiles.tileFillFor(1, 'dark'), '#EFE3C2', 'tier 1 dark fill');
  assert.equal(tiles.tileFillFor(3072, 'dark'), '#FFF3DC', 'tier 3072 dark fill');
  assert.ok(tiles.contrastRatio(tiles.tileFillFor(384), tiles.tileInkFor(384)) >= 4.6, 'weakest 384 AA');
  assert.match(board, /tileShapeFor\(value\)/, 'AnimatedTile reads tileShapeFor');
  assert.match(board, /color="#000000"/, 'grain visible (patched from transparent)');
  assert.match(board, /theme\s*=\s*'dark'/, 'dark default');
  // Then the delta journey holds end-to-end at host speed
});
