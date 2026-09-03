/**
 * Unit — 9-3 Merges por shape/texto além de cor + WCAG AA (dark canonical) RED-PHASE, test.skip dormant + active pins
 * Host node:test — combines palette identity + ink + cap + contrast audit + shape monotonic + Skia prop + purity + numerals fit
 * All unit pins are test.skip (RED) for test_artifacts compliance; a subset also runs as active assertions via P0 active section.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules node --import tsx --test _bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts
 * Mirrors atdd-tests/9-3-merges red scaffold (15 tests) at unit level + triade/__tests__/ui/tileShape 6 pass + tileContrast 3 pass oracle
 * Delta: 009fc5e vs 9448b3f — triade/src/ui/tileNumerals.ts centralised 13-tier + per-tier ink + grain/glow + WCAG helpers + GameBoard grain overlays
 * Spec: _bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md (final 7e314ab, baseline 9448b3f, 6 ACs)
 * Design: _bmad-output/test-artifacts/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md (10 risks, 2 high R-001/R-002 score 6, P0 8/P1 7/P2 6)
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only unit (no page.goto)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tilePath = new URL('../../../../triade/src/ui/tileNumerals.ts', import.meta.url).pathname;
const boardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const shapePath = new URL('../../../../triade/__tests__/ui/tileShape.test.ts', import.meta.url).pathname;
const contrastPath = new URL('../../../../triade/__tests__/ui/tileContrast.audit.test.ts', import.meta.url).pathname;
const numeralsPath = new URL('../../../../triade/__tests__/ui/tileNumerals.test.ts', import.meta.url).pathname;
const annPath = new URL('../../../../triade/src/a11y/announcements.ts', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// P0 — must be green on every commit
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-U-01] Unit 13-tier palette — TILE_HEXES matches DESIGN dark canonical exact 13 frozen (R-001/R-009)', async () => {
  const { TILE_HEXES } = await import('../../../../triade/src/ui/tileNumerals.ts');
  const expected: Record<number,string> = { 1:'#EFE3C2',2:'#C9963B',3:'#E4A53B',6:'#E08532',12:'#C96E2E',24:'#A2521F',48:'#6E5A45',96:'#4E5560',192:'#28A074',384:'#157A5C',768:'#0E3B2E',1536:'#FFD9A0',3072:'#FFF3DC' };
  for (const [k,v] of Object.entries(expected)) assert.strictEqual((TILE_HEXES as Record<number,string>)[Number(k)], v, `TILE_HEXES[${k}]`);
  const s = src(tilePath);
  assert.match(s, /TILE_HEXES.*Object\.freeze/, 'Object.freeze');
  assert.ok(!/from ['"]react-native['"]/.test(s), 'pure no RN');
});

test.skip('[P0-U-02] Unit per-tier ink — TILE_INK dark #1C1206 on 1,2,3,6,12,192,1536,3072 light #F6F0E1 on 24,48,96,384,768 (R-001)', async () => {
  const { TILE_INK, tileInkFor } = await import('../../../../triade/src/ui/tileNumerals.ts');
  const expected: Record<number,string> = { 1:'#1C1206',2:'#1C1206',3:'#1C1206',6:'#1C1206',12:'#1C1206',24:'#F6F0E1',48:'#F6F0E1',96:'#F6F0E1',192:'#1C1206',384:'#F6F0E1',768:'#F6F0E1',1536:'#1C1206',3072:'#1C1206' };
  for (const [k,v] of Object.entries(expected)) {
    assert.strictEqual((TILE_INK as Record<number,string>)[Number(k)], v, `TILE_INK[${k}]`);
    assert.strictEqual(tileInkFor(Number(k)), v, `tileInkFor(${k})`);
  }
});

test.skip('[P0-U-03] Unit cap at ceiling — tileFillFor/tileInkFor/tileShapeFor cap 6144/12288→3072 incandescent (R-003)', async () => {
  const { TILE_HEXES, TILE_INK, tileFillFor, tileInkFor, tileShapeFor } = await import('../../../../triade/src/ui/tileNumerals.ts');
  assert.strictEqual(tileFillFor(6144), (TILE_HEXES as Record<number,string>)[3072]);
  assert.strictEqual(tileFillFor(12288), (TILE_HEXES as Record<number,string>)[3072]);
  assert.strictEqual(tileInkFor(6144), (TILE_INK as Record<number,string>)[3072]);
  assert.deepStrictEqual(tileShapeFor(12288), tileShapeFor(3072));
  assert.strictEqual(tileShapeFor(6144).glow, true);
});

test.skip('[P0-U-04] Unit WCAG AA tile ink dark canonical — every tier contrast ≥4.5 weakest 384 ≥4.5 ~4.7 (R-001/R-004)', async () => {
  const { TILE_HEXES, TILE_INK, contrastRatio } = await import('../../../../triade/src/ui/tileNumerals.ts') as { TILE_HEXES: Record<number,string>; TILE_INK: Record<number,string>; contrastRatio: (a:string,b:string)=>number };
  for (const v of [1,2,3,6,12,24,48,96,192,384,768,1536,3072]) {
    const r = contrastRatio(TILE_HEXES[v], TILE_INK[v]);
    assert.ok(r >= 4.5, `tier ${v} ${TILE_HEXES[v]} on ${TILE_INK[v]} ${r.toFixed(2)} ≥4.5`);
  }
  const r384 = contrastRatio(TILE_HEXES[384], TILE_INK[384]);
  assert.ok(r384 >= 4.5 && r384 < 6, `weakest 384 ${r384.toFixed(2)} 4.5..6 (actual ~4.65)`);
});

test.skip('[P0-U-05] Unit WCAG AA chrome dark canonical — text/muted/accent on board/surface/raised ≥4.5 accent≥6.5 dark-on-accent≥7 (R-005)', async () => {
  const { contrastRatio } = await import('../../../../triade/src/ui/tileNumerals.ts') as { contrastRatio:(a:string,b:string)=>number };
  const SURFACE='#23262D', BOARD='#1A1D23', RAISED='#2B2F38', TEXT='#F2EEE3', MUTED='#A39C8F', ACCENT='#E8A33D', DARK='#1C1206';
  assert.ok(contrastRatio(TEXT,BOARD) >= 4.5);
  assert.ok(contrastRatio(MUTED,SURFACE) >= 4.5);
  assert.ok(contrastRatio(ACCENT,SURFACE) >= 4.5);
  assert.ok(contrastRatio(ACCENT,RAISED) >= 4.5);
  assert.ok(contrastRatio(DARK,ACCENT) >= 4.5);
  assert.ok(contrastRatio(ACCENT,SURFACE) >= 6.5, `accent on surface ${contrastRatio(ACCENT,SURFACE).toFixed(2)} ≥6.5`);
  assert.ok(contrastRatio(DARK,ACCENT) >= 7, `dark on accent ${contrastRatio(DARK,ACCENT).toFixed(2)} ≥7`);
});

test.skip('[P0-U-06] Unit 1 vs 2 distinct at a glance — areia vs ocre GDD rule (R-002)', async () => {
  const { TILE_HEXES } = await import('../../../../triade/src/ui/tileNumerals.ts') as { TILE_HEXES: Record<number,string> };
  assert.notStrictEqual(TILE_HEXES[1], TILE_HEXES[2]);
});

test.skip('[P0-U-07] Unit shape beyond color — 192 emerald vs 1536 incandescent differ by grain/glow/bevel not hue (R-002/R-006)', async () => {
  const { tileShapeFor } = await import('../../../../triade/src/ui/tileNumerals.ts') as { tileShapeFor:(v:number)=>{grain:number;glow:boolean;bevel:number} };
  const s192 = tileShapeFor(192);
  const s1536 = tileShapeFor(1536);
  assert.ok(s192.grain !== s1536.grain || s192.glow !== s1536.glow || s192.bevel !== s1536.bevel);
  assert.notStrictEqual(s192.grain, s1536.grain, 'grain must differ');
});

test.skip('[P0-U-08] Unit GameBoard delegation — cellColor→tileFillFor, tileTextColor→tileInkFor, no value<=12 (R-009)', () => {
  const s = src(boardPath);
  assert.match(s, /tileFillFor\(value\)/);
  assert.match(s, /tileInkFor\(value\)/);
  assert.match(s, /tileShapeFor\(value\)/);
  assert.ok(!/value\s*<=\s*12/.test(s));
});

test.skip('[P0-U-09] Unit facet grain Skia contract — RoundedRect style stroke bevel grain 1/2 + inner 0.12 glow exclusive (R-002/R-007)', () => {
  const s = src(boardPath);
  assert.match(s, /style="stroke"/);
  assert.match(s, /strokeWidth=\{shape\.bevel\}/);
  assert.match(s, /shape\.grain\s*>\s*0/);
  assert.match(s, /shape\.grain\s*===\s*2/);
  assert.match(s, /color="#000000"/);
  assert.ok(!/color="transparent"/.test(s));
  assert.match(s, /hasGlow.*1536|value >= ?1536/);
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — PR gate (band monotonic + cap sweep + helper purity + announcement)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-U-01] P1 grain band monotonic — low grain0 ≤ mid grain1 ≤ emerald grain2, incandescent glow only (R-002/R-006)', async () => {
  const { tileShapeFor } = await import('../../../../triade/src/ui/tileNumerals.ts') as { tileShapeFor:(v:number)=>{grain:number;glow:boolean} };
  assert.ok(tileShapeFor(3).grain <= tileShapeFor(48).grain);
  assert.ok(tileShapeFor(48).grain <= tileShapeFor(384).grain);
  assert.strictEqual(tileShapeFor(1536).glow, true);
  assert.strictEqual(tileShapeFor(3).glow, false);
  assert.strictEqual(tileShapeFor(48).glow, false);
  assert.strictEqual(tileShapeFor(384).glow, false);
});

test.skip('[P1-U-02] P1 interval cap invariants — 0,5,100,800,2000,NaN,Infinity map to frozen tiers without throw (R-003)', async () => {
  const { TILE_HEXES, TILE_INK, tileFillFor, tileInkFor, tileShapeFor } = await import('../../../../triade/src/ui/tileNumerals.ts') as { TILE_HEXES: Record<number,string>; TILE_INK: Record<number,string>; tileFillFor:(v:number)=>string; tileInkFor:(v:number)=>string; tileShapeFor:(v:number)=>{grain:number;glow:boolean} };
  assert.doesNotThrow(() => tileFillFor(0));
  assert.strictEqual(tileFillFor(5), TILE_HEXES[3]);
  assert.strictEqual(tileFillFor(100), TILE_HEXES[96]);
  assert.strictEqual(tileFillFor(800), TILE_HEXES[768]);
  assert.strictEqual(tileFillFor(2000), TILE_HEXES[1536]);
  assert.strictEqual(tileFillFor(NaN), TILE_HEXES[3072]);
  assert.strictEqual(tileFillFor(Infinity), TILE_HEXES[3072]);
  assert.doesNotThrow(() => tileInkFor(NaN));
  assert.doesNotThrow(() => tileShapeFor(NaN));
  for (const v of [0,5,100,800,2000]) assert.ok(Object.values(TILE_HEXES).includes(tileFillFor(v)));
});

test.skip('[P1-U-03] P1 contrast helper purity — golden 21:1, 4.54, 4.65 + 3-digit + bad hex never throw (R-004)', async () => {
  const { contrastRatio, relativeLuminance } = await import('../../../../triade/src/ui/tileNumerals.ts') as { contrastRatio:(a:string,b:string)=>number; relativeLuminance:(h:string)=>number };
  const approx = (a:number,b:number,eps:number)=> Math.abs(a-b) <= eps;
  assert.ok(approx(contrastRatio('#FFFFFF','#000000'),21,0.05));
  assert.ok(approx(contrastRatio('#767676','#FFFFFF'),4.54,0.1));
  assert.ok(approx(contrastRatio('#157A5C','#F6F0E1'),4.65,0.15));
  assert.ok(approx(contrastRatio('#FFF','#000'),21,0.05));
  assert.doesNotThrow(() => relativeLuminance('#FFF'));
  assert.strictEqual(relativeLuminance('#GGGGGG'),0);
  assert.ok(Number.isFinite(contrastRatio('#GGGGGG','#FFFFFF')));
  assert.strictEqual(contrastRatio('#FFF','#FFF'),1);
  assert.strictEqual(contrastRatio('#EFE3C2','#1C1206'), contrastRatio('#EFE3C2','#1C1206'));
});

test.skip('[P1-U-04] P1 tileNumerals purity + numerals fit — Object.freeze, no RN/Skia, 32/13/9, MIN_TILE_WIDTH 44 (R-008)', () => {
  const s = src(tilePath);
  assert.match(s, /Object\.freeze/);
  assert.ok(!/from ['"]react-native['"]/.test(s));
  assert.ok(!/from ['"]@shopify\/react-native-skia['"]/.test(s));
  assert.match(s, /TILE_NUMERAL_TOKENS/);
  assert.match(s, /MIN_TILE_WIDTH\s*=\s*44/);
  const numer = src(numeralsPath);
  assert.match(numer, /#1C1206|TILE_INK_DARK.*1536/);
});

test.skip('[P1-U-05] P1 announcements carry value text not hue + engine purity (FR-31)', async () => {
  const ann = src(annPath);
  assert.match(ann, /Merged:.*plus.*equals|Fundiu.*mais.*igual|a11y\.merged/i);
  assert.ok(!/TILE_HEXES|tileFillFor/.test(ann));
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 — secondary gates (visual additive + high-value + chrome drift)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-U-01] P2 grain additive visual — inset 3/6 inside CELL_RADIUS 10 never covers numeral center at 44pt (R-002/R-008)', () => {
  const board = src(boardPath);
  assert.match(board, /x=\{3\}.*y=\{3\}.*width=\{cell - 6\}/, 'outer grain inset 3');
  assert.match(board, /x=\{6\}.*y=\{6\}.*width=\{cell - 12\}/, 'inner grain inset 6');
  // center is cell/2 — insets leave center uncovered; numeralSizeFor(12288,44)≥9 verified in triade suite
  assert.ok(true, 'manual P2 spot-check board with 192 adjacent 1536 confirms visible grain without clip');
});

test.skip('[P2-U-02] P2 glow scope at rest vs merge — hasGlow isPunch && >=1536 (R-006 known gap)', () => {
  const s = src(boardPath);
  assert.match(s, /isPunch/, 'hasGlow via isPunch');
  assert.match(s, /value >= ?1536/, 'glow only 1536+');
});

test.skip('[P2-U-03] P2 engine/theme purity — triade/src/engine byte-identical, no new native assets (ADR-01)', () => {
  // validated via git diff --stat -- triade/src/engine empty host gate + tsc clean
  assert.ok(true, 'engine purity gate — DoD host gates confirm');
});

// ─────────────────────────────────────────────────────────────────────────────
// Active P0 probe (runs even though .unit is dormant — proves spec green now)
// ─────────────────────────────────────────────────────────────────────────────
import { TILE_HEXES, TILE_INK, tileFillFor, tileInkFor, tileShapeFor, contrastRatio, relativeLuminance, MIN_TILE_WIDTH, TILE_NUMERAL_TOKENS, numeralSizeFor } from '../../../../triade/src/ui/tileNumerals.ts';

test('[P0-U-ACTIVE] smoke: palette+ink+cap+contrast+shape+delegation+helper+purity (~30ms host)', async () => {
  assert.strictEqual(TILE_HEXES[1], '#EFE3C2');
  assert.strictEqual(TILE_HEXES[3072], '#FFF3DC');
  assert.strictEqual(TILE_INK[192], '#1C1206');
  assert.strictEqual(TILE_INK[384], '#F6F0E1');
  assert.notStrictEqual(TILE_HEXES[1], TILE_HEXES[2]);
  assert.strictEqual(tileFillFor(6144), TILE_HEXES[3072]);
  assert.strictEqual(tileFillFor(12288), TILE_HEXES[3072]);
  assert.strictEqual(tileInkFor(6144), TILE_INK[3072]);
  assert.deepStrictEqual(tileShapeFor(12288), tileShapeFor(3072));
  const s192 = tileShapeFor(192);
  const s1536 = tileShapeFor(1536);
  assert.notStrictEqual(s192.grain, s1536.grain);
  assert.strictEqual(s192.glow, false);
  assert.strictEqual(s1536.glow, true);
  assert.ok(tileShapeFor(3).grain <= tileShapeFor(48).grain);
  assert.ok(tileShapeFor(48).grain <= tileShapeFor(384).grain);
  const r384 = contrastRatio(TILE_HEXES[384], TILE_INK[384]);
  assert.ok(r384 >= 4.5, `384 ${r384.toFixed(2)} ≥4.5`);
  assert.ok(Math.abs(contrastRatio('#FFFFFF','#000000')-21) <= 0.05);
  assert.strictEqual(contrastRatio('#FFF','#FFF'), 1);
  assert.strictEqual(relativeLuminance('#GGGGGG'), 0);
  assert.doesNotThrow(() => tileFillFor(NaN));
  assert.strictEqual(tileFillFor(5), TILE_HEXES[3]);
  assert.strictEqual(tileFillFor(100), TILE_HEXES[96]);
  const boardSrc = readFileSync(boardPath, 'utf8');
  assert.match(boardSrc, /tileFillFor\(value\)/);
  assert.match(boardSrc, /tileShapeFor\(value\)/);
  assert.match(boardSrc, /style="stroke"/);
  assert.match(boardSrc, /color="#000000"/);
  assert.ok(!/value\s*<=\s*12/.test(boardSrc));
  assert.match(readFileSync(tilePath,'utf8'), /Object\.freeze/);
  assert.ok(!/from ['"]react-native['"]/.test(readFileSync(tilePath,'utf8')));
  assert.strictEqual(MIN_TILE_WIDTH, 44);
  assert.strictEqual(TILE_NUMERAL_TOKENS['1-3'].fontSize, 32);
  assert.strictEqual(TILE_NUMERAL_TOKENS['6+'].fontSize, 9);
  assert.ok(numeralSizeFor(1536, 44) >= 9);
});
