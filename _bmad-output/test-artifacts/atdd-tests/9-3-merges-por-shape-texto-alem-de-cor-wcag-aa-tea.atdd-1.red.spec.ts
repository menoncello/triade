import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// ATDD RED-PHASE SCAFFOLD — Story 9-3 Merges por shape/texto além de cor + WCAG AA
// Run: tea.atdd-1 (2026-09-08) | TEA (Master Test Architect)
// Working-tree scope: NO production diff in this run (only orchestrator
// bookkeeping in _bmad-output/implementation-artifacts/*.td-1.md +
// sprint-status.yaml, which this workflow never touches). Implementation had
// landed pre-baseline: triade/src/ui/tileNumerals.ts (TILE_HEXES/TILE_INK/
// tileFillFor/tileInkFor/tileShapeFor/contrastRatio), triade/src/render/
// GameBoard.tsx (13-tier delegation + grain/glow), triade/__tests__/ui/
// tileShape.test.ts + tileContrast.audit.test.ts. These scaffolds therefore
// PIN the landed behavior: every test below is `test.skip()` by ATDD
// convention (RED phase). Activating one (remove `.skip`) against the current
// tree is expected to go GREEN immediately; against the pre-story baseline
// (7-bucket cellColor + binary ink, no tileShapeFor/contrastRatio) each FAILS
// for the reason noted in its trailing comment.
// Activation: remove `test.skip` for the current task, run
//   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \
//     ../_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-tea.atdd-1.red.spec.ts
// from triade/ (or `npm --prefix triade test` for the full suite), confirm
// RED-before/GREEN-after, then implement per the checklist.

const TILE = fileURLToPath(new URL('../../../triade/src/ui/tileNumerals.ts', import.meta.url));
const BOARD = fileURLToPath(new URL('../../../triade/src/render/GameBoard.tsx', import.meta.url));
const SHAPE_T = fileURLToPath(new URL('../../../triade/__tests__/ui/tileShape.test.ts', import.meta.url));
const CONTRAST_AUDIT = fileURLToPath(new URL('../../../triade/__tests__/ui/tileContrast.audit.test.ts', import.meta.url));
const ANNOUNCE = fileURLToPath(new URL('../../../triade/src/a11y/announcements.ts', import.meta.url));

// ── P0: 13-tier dark-canonical palette identity ──────────────────────

test.skip('[P0] AC1 13-tier palette — TILE_HEXES matches DESIGN dark canonical exact', async () => {
  // Given the DESIGN dark-canonical table (1:#EFE3C2 … 3072+:#FFF3DC)
  // When TILE_HEXES is read from tileNumerals.ts
  // Then every tier maps to its exact DESIGN hex and the map is frozen
  const src = await readFile(TILE, 'utf8');
  const expected: Record<number, string> = {
    1: '#EFE3C2', 2: '#C9963B', 3: '#E4A53B', 6: '#E08532', 12: '#C96E2E',
    24: '#A2521F', 48: '#6E5A45', 96: '#4E5560', 192: '#28A074',
    384: '#157A5C', 768: '#0E3B2E', 1536: '#FFD9A0', 3072: '#FFF3DC',
  };
  for (const [k, hex] of Object.entries(expected)) {
    assert.match(src, new RegExp(`${k}:\\s*'${hex}'|${k}:\\s*"${hex}"`), `TILE_HEXES[${k}] must be ${hex}`);
  }
  assert.match(src, /TILE_HEXES.*Object\.freeze/, 'TILE_HEXES must be Object.freeze');
  // Expected RED pre-story: only a 7-bucket cellColor existed, no TILE_HEXES → regex fails.
});

test.skip('[P0] AC1 per-tier ink — dark #1C1206 on 1,2,3,6,12,192,1536,3072; light #F6F0E1 on 24,48,96,384,768', async () => {
  // Given the DESIGN per-tier ink table
  // When TILE_INK / tileInkFor is read
  // Then dark ink sits on pale/amber/bright-emerald/incandescent, light ink on copper/bronze/iron/deep-emerald/obsidian
  const src = await readFile(TILE, 'utf8');
  assert.match(src, /TILE_INK_DARK\s*=\s*['"]#1C1206['"]/, 'must define TILE_INK_DARK #1C1206');
  assert.match(src, /TILE_INK_LIGHT\s*=\s*['"]#F6F0E1['"]/, 'must define TILE_INK_LIGHT #F6F0E1');
  assert.match(src, /TILE_INK.*Object\.freeze/, 'TILE_INK must be Object.freeze');
  assert.match(src, /192:\s*TILE_INK_DARK/, '192 bright emerald must use dark ink (not binary light)');
  // Expected RED pre-story: tileInkFor was binary `value <= 12 ? dark : light` → 192 returned light.
});

test.skip('[P0] AC1 ceiling cap — 6144/12288 cap to 3072+ tier (#FFF3DC, dark ink, glow)', async () => {
  // Given values beyond the ceiling (6144/12288)
  // When tileFillFor/tileInkFor/tileShapeFor map them
  // Then they cap to the 3072+ incandescent tier — no new hex, never throws
  const src = await readFile(TILE, 'utf8');
  assert.match(src, /value >= 3072.*TILE_HEXES\[3072\]/s, 'tileFillFor must cap >=3072 to TILE_HEXES[3072]');
  assert.match(src, /value >= 3072.*TILE_SHAPE_MAP\[3072\]/s, 'tileShapeFor must cap >=3072');
  // Expected RED pre-story: tileFillFor/tileShapeFor missing entirely (only cellColor 7-bucket).
});

// ── P0: WCAG AA contrast (dark canonical) ────────────────────────────

test.skip('[P0] AC3 tile-ink contrast — every tier contrast(tileFill, tileInk) ≥ 4.5:1, weakest 384 (#157A5C) ≥ 4.5', async () => {
  // Given every tile value 1..3072+ in dark canonical
  // When contrast is measured via WCAG relative luminance
  // Then every tier holds ≥4.5:1 for 13pt/9pt small-text numerals
  const src = await readFile(TILE, 'utf8');
  assert.match(src, /contrastRatio|relativeLuminance/, 'must export contrastRatio/relativeLuminance');
  assert.match(src, /0\.2126.*0\.7152.*0\.0722/, 'luminance weights must be WCAG 0.2126/0.7152/0.0722');
  assert.match(src, /\(L1 \+ 0\.05\) \/ \(L2 \+ 0\.05\)|L1.*L2.*0\.05/, 'ratio must be (L1+0.05)/(L2+0.05)');
  const audit = await readFile(CONTRAST_AUDIT, 'utf8');
  assert.match(audit, /4\.5/, 'contrast audit must enforce the 4.5:1 AA floor');
  assert.match(audit, /384/, 'contrast audit must pin the weakest 384 tier');
  // Expected RED pre-story: contrastRatio helper missing → audit file cannot exist (ENOENT).
});

test.skip('[P0] AC3 chrome contrast — body/muted/accent on dark surfaces ≥ 4.5:1, accent pins hold', async () => {
  // Given chrome tokens on dark surfaces (body ≈13.1, muted ≈5.6, accent ≈7.0, dark-on-accent ≈8.6)
  // When contrast is measured
  // Then body holds AA and accent high pins hold
  const audit = await readFile(CONTRAST_AUDIT, 'utf8');
  assert.match(audit, /SURFACE|BOARD|TEXT|MUTED|ACCENT/, 'audit must hard-code chrome tokens');
  assert.match(audit, /contrastRatio/, 'audit must use the contrastRatio helper');
  // Expected RED pre-story: audit file missing → ENOENT.
});

// ── P0: shape/text beyond color (FR-31) ──────────────────────────────

test.skip('[P0] AC2 192 vs 1536 — distinguishable by grain/glow/bevel, not hue alone', async () => {
  // Given a color-blind player reading 192 (emerald) vs 1536 (incandescent)
  // When tileShapeFor maps each
  // Then the shapes differ by grain/glow/bevel (shape test pins grain-differs)
  const src = await readFile(TILE, 'utf8');
  assert.match(src, /192:\s*\{\s*grain:\s*2/, '192 emerald must be heavy grain 2');
  assert.match(src, /1536:\s*\{\s*grain:\s*0,\s*glow:\s*true/, '1536 incandescent must be grain 0 + glow');
  const shapeSrc = await readFile(SHAPE_T, 'utf8');
  assert.match(src, /tileShapeFor/, 'must export tileShapeFor');
  assert.match(shapeSrc, /192.*1536.*grain|grain.*192.*1536/, 'shape test must assert 192 vs 1536 grain differs');
  // Expected RED pre-story: tileShapeFor missing → both tiles hue-only.
});

test.skip('[P0] AC2 GameBoard delegation — 13-tier fill, per-tier ink, grain bevels, glow only for 1536+', async () => {
  // Given the Skia board renders any tile value
  // When GameBoard resolves fill/ink/shape
  // Then it delegates to tileFillFor/tileInkFor/tileShapeFor (no binary `value <= 12`, no hard-coded hexes)
  const src = await readFile(BOARD, 'utf8');
  assert.match(src, /tileFillFor/, 'GameBoard must delegate to tileFillFor (13 tiers)');
  assert.match(src, /tileInkFor/, 'GameBoard must delegate ink to tileInkFor per-tier');
  assert.match(src, /tileShapeFor/, 'GameBoard must read tileShapeFor(value) for facet grain');
  assert.ok(!/value\s*<=\s*12/.test(src), 'must NOT contain the old binary threshold value <= 12');
  assert.match(src, /style="stroke"/, 'grain must render as RoundedRect style="stroke" overlays');
  assert.match(src, /color="#000000"/, 'grain stroke must be #000000 with opacity, never transparent (review patch)');
  // Expected RED pre-story: `value <= 12 ? #3a2f1d : #fff8e8` binary + 7-bucket switch, no stroke branches.
});

// ── P1: bands, fallback purity, announcements ────────────────────────

test.skip('[P1] AC2 grain bands — low(1–12) grain 0 ≤ mid(24–96) grain 1 ≤ emerald(192–768) grain 2; glow exclusive to incandescent', async () => {
  // Given the tier-band model (thin clean low → mid bevel → heavy emerald → glow incandescent)
  // When tileShapeFor maps one value per band
  // Then grain is monotonic non-decreasing and only 1536+ glows
  const src = await readFile(TILE, 'utf8');
  assert.match(src, /24:\s*\{\s*grain:\s*1/, 'mid band must be grain 1');
  assert.match(src, /384:\s*\{\s*grain:\s*2/, 'emerald band must be grain 2');
  assert.match(src, /3072:\s*\{\s*grain:\s*0,\s*glow:\s*true/, 'incandescent must be glow-only');
  // Expected RED pre-story: no TILE_SHAPE_MAP at all.
  // Known deferred exception (DW-117): incandescent resets grain to 0 — glow alone distinguishes it; pinned, not fixed here.
});

test.skip('[P1] AC1 interval fallback — non-canonical 0/5/100/800/2000/NaN map to frozen tiers without throw', async () => {
  // Given off-catalog inputs (0, negative, NaN, Infinity, in-between values)
  // When tileFillFor/tileInkFor/tileShapeFor map them
  // Then they resolve to a frozen-tier value and never throw
  const src = await readFile(TILE, 'utf8');
  assert.match(src, /Number\.isFinite\(value\)/, 'mappers must guard non-finite input (NaN/Infinity)');
  assert.match(src, /fallback for 0 or negative|return TILE_HEXES\[3\]/, 'must fall back to a safe tier, never throw');
  // Expected RED pre-story: mappers missing; switch mishandled NaN.
});

test.skip('[P1] AC4 announcements carry value text, never hue — engine untouched', async () => {
  // Given a merge completes
  // When the screen-reader announcement fires
  // Then it carries value text ("Merged: A plus B equals C"), never hue/hex
  const ann = await readFile(ANNOUNCE, 'utf8');
  assert.match(ann, /Merged:.*plus.*equals|Fundiu.*mais.*igual|a11y\.merged/i, 'announcement must carry value text, not hue');
  assert.ok(!/TILE_HEXES|tileFillFor/.test(ann), 'announcements must not depend on fill hexes — value text only');
  // Expected RED pre-story: n/a (guard test — announcements predated this story via 9.2 bridge; stays green).
});

// ── summary ──────────────────────────────────────────────────────────
// Activation: remove `test.skip` for the task under test, then
//   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \
//     ../_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-tea.atdd-1.red.spec.ts
// P0 green proof (landed): npm --prefix triade test
//   triade/__tests__/ui/tileShape.test.ts triade/__tests__/ui/tileContrast.audit.test.ts -- --no-coverage
// Type gate: npx tsc --project triade/tsconfig.json --noEmit (0 errors)
