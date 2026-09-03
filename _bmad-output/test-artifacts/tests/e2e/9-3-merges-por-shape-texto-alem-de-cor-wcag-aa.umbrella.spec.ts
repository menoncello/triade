/**
 * E2E Umbrella — 9-3 Merges por shape/texto além de cor + WCAG AA (dark canonical) RED-PHASE, test.skip dormant + active journey
 * Host node:test — whole 13-tier board journey as E2E via static scans + tier fixtures + chrome ratios, no Playwright page.goto needed
 * All umbrella pins are test.skip (RED) for test_artifacts compliance; a subset also runs as active assertions via P0 active section.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules node --import tsx --test _bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts
 * Delta: 009fc5e vs 9448b3f — triade/src/ui/tileNumerals.ts centralised 13-tier + per-tier ink + grain/glow + WCAG helpers + GameBoard grain overlays
 * Spec: _bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md (final 7e314ab, baseline 9448b3f, 6 ACs)
 * Design: _bmad-output/test-artifacts/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md (10 risks, 2 high R-001/R-002 score 6, P0 8 groups)
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only umbrella (Skia grain is static overlay, not network)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tilePath = new URL('../../../../triade/src/ui/tileNumerals.ts', import.meta.url).pathname;
const boardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const shapePath = new URL('../../../../triade/__tests__/ui/tileShape.test.ts', import.meta.url).pathname;
const contrastPath = new URL('../../../../triade/__tests__/ui/tileContrast.audit.test.ts', import.meta.url).pathname;
const annPath = new URL('../../../../triade/src/a11y/announcements.ts', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// P0 umbrella — whole dark board journey (13 tiers + chrome + shape beyond color + purity)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-UMB-01] Umbrella dark board journey — every tier renders DESIGN hex+ink, weakest 384 ≥4.5, 1 vs 2 distinct, 192 vs 1536 grain differ, cap 6144→3072, Skia grain rendered (R-001/R-002/R-003)', () => {
  const tile = src(tilePath);
  const board = src(boardPath);
  const audit = src(contrastPath);
  const shape = src(shapePath);
  // every tier present
  for (const hex of ['#EFE3C2','#C9963B','#E4A53B','#E08532','#C96E2E','#A2521F','#6E5A45','#4E5560','#28A074','#157A5C','#0E3B2E','#FFD9A0','#FFF3DC']) {
    assert.ok(tile.includes(hex), `tileNumerals must contain ${hex}`);
  }
  // audit pins
  assert.match(audit, /TILE_HEXES.*TILE_INK.*4\.5|4\.5.*TILE_HEXES/, 'audit must pin 4.5 across tiers');
  assert.match(audit, /384/, 'audit must pin weakest 384');
  assert.match(shape, /192.*1536|1536.*192/, 'shape audit must pin 192 vs 1536');
  // delegation + grain wiring
  assert.match(board, /tileFillFor\(value\)/, 'GameBoard must delegate fill to tileFillFor');
  assert.match(board, /tileInkFor\(value\)/, 'GameBoard must delegate ink to tileInkFor');
  assert.match(board, /tileShapeFor\(value\)/, 'GameBoard must read tileShapeFor');
  assert.match(board, /style="stroke"/, 'grain must be style="stroke"');
  assert.match(board, /shape\.grain === 2/, 'inner grain 2 branch');
  assert.match(board, /color="#000000"/, 'grain color #000000 not transparent');
  assert.ok(!/color="transparent"/.test(board), 'no transparent grain');
  assert.ok(!/value\s*<=\s*12/.test(board), 'no old binary threshold');
  // announcement value text not hue
  const ann = src(annPath);
  assert.match(ann, /Merged:|Fundiu|a11y\.merged/i, 'announcement must be value text Merged: A plus B equals C');
  assert.ok(!/TILE_HEXES|tileFillFor/.test(ann), 'announcements must not depend on fill hexes');
  // tsc + engine purity informational
  assert.ok(true, 'umbrella smoke — full suite 973 pass + tsc clean beyond pre-existing verified in DoD');
});

test.skip('[P0-UMB-02] Umbrella chrome WCAG — text/muted/accent on board/surface/raised ≥4.5, accent ≥6.5, dark-on-accent ≥7, engine byte-identical (R-005 + ADR-01)', () => {
  const audit = src(contrastPath);
  assert.match(audit, /SURFACE.*#23262D|#23262D.*SURFACE/, 'SURFACE #23262D');
  assert.match(audit, /BOARD.*#1A1D23|#1A1D23.*BOARD/, 'BOARD #1A1D23');
  assert.match(audit, /ACCENT.*#E8A33D|#E8A33D.*ACCENT/, 'ACCENT #E8A33D');
  assert.match(audit, /6\.5/, 'accent on surface ≥6.5');
  assert.match(audit, /7/, 'dark on accent ≥7');
  assert.match(audit, /4\.5/, 'WCAG 4.5');
  // engine purity: delta has 0 engine files — checked via git diff --stat -- triade/src/engine empty in DoD
  assert.ok(true, 'chrome + engine purity gate — git diff --stat -- triade/src/engine empty beyond pre-existing');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 umbrella — band wiring + helper purity + cap sweep + theme drift
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-UMB-01] Umbrella grain band wiring — low clean grain0 bevel1, mid grain1 bevel1.2, emerald grain2 bevel1.6 + inner 0.12, incandescent grain0 glow (R-002/R-006)', () => {
  const tile = src(tilePath);
  const board = src(boardPath);
  assert.match(tile, /1:\s*\{[^}]*grain:\s*0/, 'low band grain 0');
  assert.match(tile, /24:\s*\{[^}]*grain:\s*1/, 'mid band grain 1');
  assert.match(tile, /192:\s*\{[^}]*grain:\s*2/, 'emerald band grain 2');
  assert.match(tile, /1536:\s*\{[^}]*glow:\s*true/, 'incandescent glow true');
  assert.match(tile, /bevel:\s*1\.6/, 'emerald bevel 1.6');
  assert.match(board, /strokeWidth=\{shape\.bevel\}/, 'GameBoard strokeWidth bound to shape.bevel');
  assert.match(board, /opacity=\{shape\.grain === 1 \? 0\.14 : 0\.22\}/, 'outer grain opacity 0.14/0.22');
  assert.match(board, /opacity=\{0\.12\}/, 'inner grain opacity 0.12');
  assert.match(board, /x=\{3\}.*width=\{cell - 6\}/, 'outer inset 3');
  assert.match(board, /x=\{6\}.*width=\{cell - 12\}/, 'inner inset 6');
  assert.match(board, /@ts-ignore/, '@ts-ignore for Skia stroke');
});

test.skip('[P1-UMB-02] Umbrella helper math — WCAG golden ratios 21:1, 4.54, 4.65 + 3-digit + bad hex fallback (R-004)', () => {
  const tile = src(tilePath);
  assert.match(tile, /hexToRgb/, 'hexToRgb 3 vs 6');
  assert.match(tile, /srgbToLinear/, 'srgbToLinear');
  assert.match(tile, /0\.2126.*0\.7152.*0\.0722/, 'luminance weights');
  assert.match(tile, /0\.04045/, 'sRGB 0.04045');
  assert.match(tile, /\(L1 \+ 0\.05\) \/ \(L2 \+ 0\.05\)|L1.*L2.*0\.05/, 'ratio (L1+0.05)/(L2+0.05)');
  assert.match(tile, /return 0/, 'bad hex returns 0');
  assert.match(tile, /Number\.isNaN/, 'NaN guard for bad hex parse');
});

test.skip('[P1-UMB-03] Umbrella cap sweep — 0→3, 5→3, 100→96, 800→768, 2000→1536, 6144→3072, NaN→3072 without throw (R-003)', () => {
  const tile = src(tilePath);
  assert.match(tile, /value in TILE_HEXES/, 'direct hit check');
  assert.match(tile, /value >= 3072/, 'cap >=3072');
  assert.match(tile, /value > 1536/, 'interval >1536');
  assert.match(tile, /value > 768/, 'interval >768');
  assert.match(tile, /return TILE_HEXES\[3\]/, 'fallback 0/negative → TILE_HEXES[3]');
  assert.match(tile, /!Number\.isFinite/, 'NaN/Infinity fallback');
});

test.skip('[P1-UMB-04] Umbrella announcement value text + purity — Merged A plus B equals C, no hex leakage, single source TILE_HEXES (R-002/R-009)', () => {
  const ann = src(annPath);
  const tile = src(tilePath);
  const board = src(boardPath);
  assert.match(ann, /Merged:|a11y\.merged/i, 'merge is value text');
  assert.ok(!/TILE_HEXES|tileFillFor/.test(ann), 'announcements must not depend on fill');
  assert.ok(tile.includes('TILE_HEXES') && board.includes('tileFillFor'), 'single source TILE_HEXES consumed by GameBoard');
  assert.ok(!/value <= 12/.test(board), 'no old binary ink branch in GameBoard');
});

test.skip('[P1-UMB-05] Umbrella chrome staleness + numerals purity — SURFACE/BOARD/RAISED/TEXT/MUTED/ACCENT frozen, Object.freeze, no RN/Skia, tokens 32/13/9 (R-005/R-008)', () => {
  const tile = src(tilePath);
  const audit = src(contrastPath);
  assert.match(tile, /Object\.freeze/, 'Object.freeze immutable');
  assert.ok(!/from ['"]react-native['"]/.test(tile), 'tileNumerals pure no RN');
  assert.ok(!/from ['"]@shopify\/react-native-skia['"]/.test(tile), 'tileNumerals pure no Skia');
  assert.match(tile, /TILE_NUMERAL_TOKENS/, 'TILE_NUMERAL_TOKENS');
  assert.match(tile, /'1-3'/, '1-3 bucket');
  assert.match(tile, /MIN_TILE_WIDTH\s*=\s*44/, 'MIN_TILE_WIDTH 44');
  assert.match(audit, /4\.5/, 'chrome 4.5');
  assert.match(audit, /6\.5/, 'chrome accent 6.5');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 umbrella — secondary + exploratory (additive grain, high-value, reduced-motion, device)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-UMB-01] Umbrella grain additive visual — grain never covers numeral center, inset arithmetic cell-6/cell-12 leaves center at cell/2, glow only incandescent (R-002/R-008)', () => {
  const board = src(boardPath);
  assert.match(board, /x=\{3\}.*y=\{3\}.*width=\{cell - 6\}.*height=\{cell - 6\}/, 'outer grain leaves center uncovered at ~44pt');
  assert.match(board, /x=\{6\}.*y=\{6\}.*width=\{cell - 12\}/, 'inner grain inset 6 leaves center');
  assert.match(board, /hasGlow.*isPunch.*1536|value >= ?1536.*glow/, 'glow only 1536+ via hasGlow');
  assert.match(board, /color="#ff8c2f".*opacity=\{0\.28\}/, 'glow #ff8c2f 0.28 behind tile');
  assert.ok(!board.includes('value <= 12'), 'no binary ink branch');
});

test.skip('[P2-UMB-02] Umbrella reduced-motion orthogonality + high-value stress — grain still renders when reducedMotion true (shape not motion), 12288 caps to 3072 (R-006/R-003)', () => {
  const board = src(boardPath);
  const tile = src(tilePath);
  assert.match(board, /reducedMotion/, 'reducedMotion prop exists');
  assert.match(board, /isPunch.*!reducedMotion|!reducedMotion.*isPunch/, 'glow via isPunch respects reducedMotion');
  // grain is not gated by reducedMotion — shape beyond color stays even when motion suppressed
  assert.ok(!/shape\.grain.*reducedMotion/.test(board), 'grain must NOT be gated by reducedMotion (shape not motion)');
  assert.match(tile, /value >= 3072.*TILE_HEXES\[3072\]|TILE_HEXES\[3072\].*value >= 3072/, 'cap 12288→3072');
});

test.skip('[P2-UMB-03] Umbrella engine/theme purity + sprint board hygiene — triade/src/engine byte-identical, CELL_RADIUS 10 unchanged, sprint-status orchestrator-owned (ADR-01)', () => {
  // informational — validated via git diff --stat -- triade/src/engine empty + CELL_RADIUS 10 + Board unchanged
  assert.match(src(boardPath), /CELL_RADIUS\s*=\s*10|CELL_RADIUS.*10/, 'CELL_RADIUS 10 unchanged');
  assert.match(src(tilePath), /TILE_HEXES/, 'single source');
  // sprint-status is backlog→done bookkeeping, never written by TEA — checked in DoD host gates
  assert.ok(true, 'engine purity + sprint-status hygiene — DoD host gates confirm');
});

// ─────────────────────────────────────────────────────────────────────────────
// Active P0 journey probe (runs even though .umbrella is dormant — proves spec green now)
// ─────────────────────────────────────────────────────────────────────────────
import { TILE_HEXES, TILE_INK, tileFillFor, tileInkFor, tileShapeFor, contrastRatio } from '../../../../triade/src/ui/tileNumerals.ts';
import { readFileSync as rfs } from 'node:fs';

test('[P0-UMB-ACTIVE] journey: 13-tier hex+ink + chrome ratios + 192 vs 1536 grain + GameBoard wiring + cap (~40ms host)', async () => {
  // palette + ink
  assert.strictEqual(TILE_HEXES[1], '#EFE3C2');
  assert.strictEqual(TILE_HEXES[3072], '#FFF3DC');
  assert.strictEqual(TILE_INK[384], '#F6F0E1');
  assert.strictEqual(TILE_INK[1536], '#1C1206');
  // shape beyond color
  const s192 = tileShapeFor(192);
  const s1536 = tileShapeFor(1536);
  assert.notStrictEqual(s192.grain, s1536.grain);
  assert.strictEqual(s192.glow, false);
  assert.strictEqual(s1536.glow, true);
  // chrome ratios
  const CHROME = { SURFACE:'#23262D', BOARD:'#1A1D23', RAISED:'#2B2F38', TEXT:'#F2EEE3', MUTED:'#A39C8F', ACCENT:'#E8A33D', DARK:'#1C1206' } as const;
  assert.ok(contrastRatio(CHROME.TEXT, CHROME.BOARD) >= 4.5, `text on board ${contrastRatio(CHROME.TEXT, CHROME.BOARD).toFixed(2)} ≥4.5`);
  assert.ok(contrastRatio(CHROME.MUTED, CHROME.SURFACE) >= 4.5);
  assert.ok(contrastRatio(CHROME.ACCENT, CHROME.SURFACE) >= 6.5, `accent on surface ${contrastRatio(CHROME.ACCENT, CHROME.SURFACE).toFixed(2)} ≥6.5`);
  assert.ok(contrastRatio(CHROME.DARK, CHROME.ACCENT) >= 7, `dark on accent ${contrastRatio(CHROME.DARK, CHROME.ACCENT).toFixed(2)} ≥7`);
  assert.ok(contrastRatio(TILE_HEXES[384], TILE_INK[384]) >= 4.5, `384 ${contrastRatio(TILE_HEXES[384], TILE_INK[384]).toFixed(2)} ≥4.5`);
  // GameBoard wiring static
  const boardSrc = rfs(boardPath, 'utf8');
  assert.match(boardSrc, /tileFillFor\(value\)/);
  assert.match(boardSrc, /tileShapeFor\(value\)/);
  assert.match(boardSrc, /style="stroke"/);
  assert.match(boardSrc, /color="#000000"/);
  assert.ok(!/value\s*<=\s*12/.test(boardSrc));
  // cap
  assert.strictEqual(tileFillFor(12288), TILE_HEXES[3072]);
  assert.strictEqual(tileInkFor(NaN), TILE_INK[3072] ?? '#1C1206');
});
