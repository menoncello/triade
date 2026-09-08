/**
 * API Gateway (delta) — 9-3 automate-1 run (2026-09-08, tea.automate-1).
 * Supplements gateway.spec.ts (2026-09-03). Delta scope: theme delegation (THEMES +
 * themeId wrappers), DW-117/DW-118 pins, 9.4 boundary. Host node:test, no page.goto.
 * Dormant test.skip (RED-phase, test_artifacts compliance) + 1 active smoke that always runs.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules node --import tsx --test _bmad-output/test-artifacts/tests/api/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-tea.automate-1.gateway.spec.ts
 * Mirrors: triade/__tests__/ui/tileTheme.test.ts + tileContrast.allThemes.audit.test.ts at gateway level.
 * Spec: _bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md
 * Design: _bmad-output/test-artifacts/test-design/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-td-20260908.md (8 risks, 1 high R-001; DW-117/DW-118 deferred)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tilePath = new URL('../../../../triade/src/ui/tileNumerals.ts', import.meta.url).pathname;
const boardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const themePath = new URL('../../../../triade/src/theme/index.ts', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

async function loadTiles() {
  return import(tilePath) as Promise<typeof import('../../../../triade/src/ui/tileNumerals.ts')>;
}

const TIERS = [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072];

// ── P0 ─────────────────────────────────────────────────────────────────────

test.skip('[P0-API-D1] Theme delegation dark default — tileFillFor/tileInkFor(v) === (v, "dark") for all 13 tiers (R-004 drift)', async () => {
  const tiles = await loadTiles();
  for (const v of TIERS) {
    assert.equal(tiles.tileFillFor(v), tiles.tileFillFor(v, 'dark'), `fill(${v}) must default to dark`);
    assert.equal(tiles.tileInkFor(v), tiles.tileInkFor(v, 'dark'), `ink(${v}) must default to dark`);
  }
});

test.skip('[P0-API-D2] Runtime WCAG — every tier contrast(fill, ink) ≥ 4.5, weakest 384 pinned ≥ 4.6 (R-004)', async () => {
  const tiles = await loadTiles();
  let weakest = { value: 0, ratio: Infinity };
  for (const v of TIERS) {
    const ratio = tiles.contrastRatio(tiles.tileFillFor(v), tiles.tileInkFor(v));
    if (ratio < weakest.ratio) weakest = { value: v, ratio };
    assert.ok(ratio >= 4.5, `tier ${v} contrast ${ratio.toFixed(2)} must be ≥ 4.5`);
  }
  assert.equal(weakest.value, 384, 'weakest tier must be 384');
  assert.ok(weakest.ratio >= 4.6, `weakest 384 ${weakest.ratio.toFixed(2)} must be ≥ 4.6`);
});

test.skip('[P0-API-D3] GameBoard glow wiring — hasGlow = isPunch && value >= 1536, glow #ff8c2f only for 1536+ (R-001)', () => {
  const s = src(boardPath);
  assert.match(s, /hasGlow\s*=\s*Boolean\(isPunch\s*&&\s*value\s*>=\s*1536\)/, 'hasGlow must be isPunch && value>=1536');
  assert.match(s, /#ff8c2f/, 'glow color #ff8c2f must be present');
  assert.ok(!/value\s*>=\s*768[^;]*#ff8c2f/.test(s), 'glow must not leak below 1536');
});

// ── P1 ─────────────────────────────────────────────────────────────────────

test.skip('[P1-API-D4] DW-117 pin — incandescent rest grain resets to 0 (1536/3072 grain 0, glow true); 192 emerald keeps grain 2 (documented exception)', async () => {
  const tiles = await loadTiles();
  for (const v of [1536, 3072]) {
    const shape = tiles.tileShapeFor(v);
    assert.equal(shape.grain, 0, `shape(${v}).grain must be 0 (DW-117 rest-state exception)`);
    assert.equal(shape.glow, true, `shape(${v}).glow must be true`);
  }
  assert.equal(tiles.tileShapeFor(192).grain, 2, 'shape(192).grain must stay 2');
  assert.equal(tiles.tileShapeFor(192).glow, false, 'shape(192).glow must stay false');
});

test.skip('[P1-API-D5] DW-118 pin — fill/ink/shape fallback chains agree on cap + guards (6144/12288/NaN/Infinity/0/negative)', async () => {
  const tiles = await loadTiles();
  for (const v of [6144, 12288, 99999]) {
    assert.equal(tiles.tileFillFor(v), tiles.tileFillFor(3072), `fill(${v}) must cap to 3072`);
    assert.equal(tiles.tileInkFor(v), tiles.tileInkFor(3072), `ink(${v}) must cap to 3072`);
    assert.deepEqual(tiles.tileShapeFor(v), tiles.tileShapeFor(3072), `shape(${v}) must cap to 3072`);
  }
  // Non-finite inputs never throw: fill caps to 3072, ink to TILE_INK_DARK (== INK[3072]), shape to safe MAP[3]
  for (const v of [NaN, Infinity]) {
    assert.equal(tiles.tileFillFor(v), tiles.tileFillFor(3072), `fill(${v}) must cap to 3072`);
    assert.equal(tiles.tileInkFor(v), '#1C1206', `ink(${v}) must be TILE_INK_DARK`);
    assert.deepEqual(tiles.tileShapeFor(v), { grain: 0, glow: false, bevel: 1 }, `shape(${v}) must be safe MAP[3]`);
  }
  for (const v of [0, -1]) {
    assert.doesNotThrow(() => tiles.tileFillFor(v), `fill(${v}) must never throw`);
    assert.doesNotThrow(() => tiles.tileInkFor(v), `ink(${v}) must never throw`);
    assert.doesNotThrow(() => tiles.tileShapeFor(v), `shape(${v}) must never throw`);
    assert.equal(tiles.tileFillFor(v), tiles.tileFillFor(3), `fill(${v}) must fall back to tier 3`);
  }
  const s = src(tilePath);
  // 5 chain guards: 3 dark-canonical (fill/ink/shape) + 2 theme-delegation branches (fill/ink map[3072])
  assert.equal(countOccurrences(s, 'if (!Number.isFinite(value))'), 5, 'fill/ink/shape + theme branches must guard Number.isFinite');
  assert.match(s, /if \(!Number\.isFinite\(value\)\) return TILE_HEXES\[3072\]/, 'fill chain guard');
  assert.match(s, /if \(!Number\.isFinite\(value\)\) return TILE_INK_DARK/, 'ink chain guard');
  assert.match(s, /if \(!Number\.isFinite\(value\)\) return TILE_SHAPE_MAP\[3\]/, 'shape chain guard');
  function countOccurrences(hay: string, needle: string) { return hay.split(needle).length - 1; }
});

test.skip('[P1-API-D6] isThemeId guard — invalid theme falls back to dark, never throws (R-003)', async () => {
  const tiles = await loadTiles();
  for (const bad of ['sepia', '', 'DARK', null, undefined]) {
    assert.equal(tiles.tileFillFor(48, bad as never), tiles.tileFillFor(48, 'dark'), `fill(48, ${String(bad)}) must fall back to dark`);
  }
  const s = src(tilePath);
  assert.match(s, /_isThemeId\(themeId\)/, 'must guard via _isThemeId(themeId)');
});

test.skip('[P1-API-D7] 192 vs 1536 runtime shape — differ by grain+glow, not hue alone (FR-31)', async () => {
  const tiles = await loadTiles();
  const emerald = tiles.tileShapeFor(192);
  const incand = tiles.tileShapeFor(1536);
  assert.notDeepEqual(emerald, incand, '192 vs 1536 shapes must differ');
  assert.equal(emerald.grain, 2, '192 grain 2');
  assert.equal(incand.grain, 0, '1536 grain 0 (DW-117)');
  assert.equal(incand.glow, true, '1536 glow distinguishes at rest via isPunch path');
});

// ── P2 ─────────────────────────────────────────────────────────────────────

test.skip('[P2-API-D8] 9.4 boundary — THEMES light/colorBlind currently reuse dark ramp; delegation path exists for 9.4 (Never-list guard)', () => {
  const s = src(themePath);
  assert.match(s, /tileHexes:\s*TILE_HEXES_DARK/, 'light/colorBlind reuse dark ramp until 9.4');
  const t = src(tilePath);
  assert.match(t, /themeId\?:\s*string/, 'tileFillFor/tileInkFor accept optional themeId (9.4 seam ready)');
});

// ── Active smoke (always runs) ─────────────────────────────────────────────

test('[P0-API-DACTIVE] Delta smoke — 13-tier identity + dark-default delegation + weakest 384 + DW-117/DW-118 pins', async () => {
  // Given the committed 9-3 implementation (working tree clean, verified 1051 pass)
  const tiles = await loadTiles();
  // When probing the delegation seam + contrast floor + deferred-work pins
  for (const v of TIERS) {
    assert.equal(tiles.tileFillFor(v), tiles.tileFillFor(v, 'dark'), `fill(${v}) dark default`);
  }
  assert.equal(tiles.tileFillFor(6144), tiles.tileFillFor(3072), 'cap 6144→3072');
  assert.equal(tiles.tileFillFor(12288), tiles.tileFillFor(3072), 'cap 12288→3072');
  const weakest = tiles.contrastRatio(tiles.tileFillFor(384), tiles.tileInkFor(384));
  assert.ok(weakest >= 4.6, `weakest 384 ${weakest.toFixed(2)} ≥ 4.6`);
  assert.equal(tiles.tileShapeFor(1536).grain, 0, 'DW-117: 1536 grain 0');
  assert.equal(tiles.tileShapeFor(192).grain, 2, '192 grain 2');
  assert.equal(tiles.tileFillFor(48, 'sepia' as never), tiles.tileFillFor(48, 'dark'), 'invalid theme → dark');
  // Then the delta seam holds without duplicating the full audit suite
});
