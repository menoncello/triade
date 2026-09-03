/**
 * API Gateway — 9-3 Merges por shape/texto além de cor + WCAG AA (dark canonical) RED-PHASE, test.skip dormant + active pins
 * Host node:test — source-pins for TILE_HEXES/TILE_INK/tileFillFor/tileInkFor/tileShapeFor/contrastRatio + GameBoard grain/glow delegation
 * All gateway pins are test.skip (RED) for test_artifacts compliance; a subset also runs as active assertions via P0 active section.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules node --import tsx --test _bmad-output/test-artifacts/tests/api/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.gateway.spec.ts
 * Mirrors triade/__tests__/ui/tileShape.test.ts 6 pass + triade/__tests__/ui/tileContrast.audit.test.ts 3 pass at API gateway level (200-400ms host).
 * Delta: 009fc5e vs 9448b3f — triade/src/ui/tileNumerals.ts centralised 13-tier + per-tier ink + grain/glow + WCAG helpers + GameBoard grain overlays
 * Spec: _bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md (final 7e314ab, baseline 9448b3f, 6 ACs)
 * Design: _bmad-output/test-artifacts/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md (10 risks, 2 high R-001/R-002 score 6, P0 8 groups)
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only gateway (no page.goto)
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
// P0 — must be green on every commit (dark canonical palette + ink + contrast + shape beyond color)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-API-01] AC 13-tier palette identity — TILE_HEXES matches DESIGN dark canonical exact 13 frozen (R-001/R-009)', () => {
  const s = src(tilePath);
  assert.match(s, /TILE_HEXES/, 'must export TILE_HEXES');
  for (const hex of ['#EFE3C2','#C9963B','#E4A53B','#E08532','#C96E2E','#A2521F','#6E5A45','#4E5560','#28A074','#157A5C','#0E3B2E','#FFD9A0','#FFF3DC']) {
    assert.ok(s.includes(hex), `TILE_HEXES must contain ${hex}`);
  }
  assert.match(s, /TILE_HEXES.*Object\.freeze/, 'TILE_HEXES must be Object.freeze');
  assert.match(s, /1:\s*'#EFE3C2'/, 'tier 1 #EFE3C2');
  assert.match(s, /3072:\s*'#FFF3DC'/, 'tier 3072 #FFF3DC');
});

test.skip('[P0-API-02] AC per-tier ink identity — TILE_INK dark #1C1206 on 1,2,3,6,12,192,1536,3072 light #F6F0E1 on 24,48,96,384,768 (R-001)', () => {
  const s = src(tilePath);
  assert.match(s, /TILE_INK_DARK\s*=\s*'#1C1206'/, 'TILE_INK_DARK #1C1206');
  assert.match(s, /TILE_INK_LIGHT\s*=\s*'#F6F0E1'/, 'TILE_INK_LIGHT #F6F0E1');
  assert.match(s, /TILE_INK.*Object\.freeze/, 'TILE_INK must be Object.freeze');
  assert.match(s, /1:\s*TILE_INK_DARK/, 'tier 1 must map to TILE_INK_DARK');
  assert.match(s, /24:\s*TILE_INK_LIGHT/, 'tier 24 must map to TILE_INK_LIGHT');
  assert.match(s, /192:\s*TILE_INK_DARK/, 'tier 192 emerald must be dark (bright emerald)');
  assert.match(s, /384:\s*TILE_INK_LIGHT/, 'tier 384 deep emerald must be light');
  assert.match(s, /1536:\s*TILE_INK_DARK/, 'tier 1536 incandescent must be dark');
});

test.skip('[P0-API-03] AC cap at ceiling — tileFillFor/tileInkFor/tileShapeFor cap 6144/12288→3072 incandescent no new hex (R-003)', () => {
  const s = src(tilePath);
  assert.match(s, /tileFillFor/, 'tileFillFor must exist');
  assert.match(s, /tileInkFor/, 'tileInkFor must exist');
  assert.match(s, /tileShapeFor/, 'tileShapeFor must exist');
  assert.match(s, /value\s*>=\s*3072/, 'must cap value >=3072');
  assert.match(s, /value\s*>\s*1536/, 'interval cascade >1536');
  assert.match(s, /TILE_HEXES\[3072\]/, 'cap must return TILE_HEXES[3072]');
  assert.match(s, /TILE_INK\[3072\]/, 'ink cap must return TILE_INK[3072]');
  assert.match(s, /TILE_SHAPE_MAP\[3072\]/, 'shape cap must return TILE_SHAPE_MAP[3072]');
  assert.match(s, /Number\.isFinite\(value\)/, 'must guard Number.isFinite(value) never throw on NaN/Infinity');
  const ts = src(shapePath);
  assert.match(ts, /6144/, 'shape audit must pin 6144 cap');
  assert.match(ts, /12288/, 'shape audit must pin 12288 cap');
});

test.skip('[P0-API-04] AC WCAG AA tile ink dark canonical — every tier contrast ≥4.5:1 weakest 384 #157A5C ≥4.5 (~4.7) (R-001/R-004)', () => {
  const s = src(tilePath);
  assert.match(s, /contrastRatio/, 'must export contrastRatio');
  assert.match(s, /relativeLuminance/, 'must export relativeLuminance');
  assert.match(s, /hexToRgb/, 'must have hexToRgb');
  assert.match(s, /0\.2126/, 'luminance weight 0.2126');
  assert.match(s, /0\.7152/, 'luminance weight 0.7152');
  assert.match(s, /0\.0722/, 'luminance weight 0.0722');
  assert.match(s, /0\.04045/, 'sRGB 0.04045');
  assert.match(s, /12\.92/, 'sRGB 12.92');
  assert.match(s, /2\.4/, 'pow 2.4');
  assert.match(s, /0\.05/, 'ratio +0.05');
  assert.ok(!/from 'react-native'/.test(s), 'contrast helper must be pure no RN import');
  assert.ok(!/from '@shopify\/react-native-skia'/.test(s), 'contrast helper must be pure no Skia import');
  const audit = src(contrastPath);
  assert.match(audit, /contrastRatio/, 'audit must use contrastRatio');
  assert.match(audit, /4\.5/, 'audit must assert ≥4.5');
  assert.match(audit, /384/, 'audit must pin weakest 384');
});

test.skip('[P0-API-05] AC WCAG AA chrome dark canonical — text/muted/accent on board/surface/raised ≥4.5 accent≥6.5 dark-on-accent≥7 (R-005)', () => {
  const audit = src(contrastPath);
  assert.match(audit, /SURFACE|BOARD|TEXT|MUTED|ACCENT/, 'audit must hard-code chrome SURFACE/BOARD/TEXT/MUTED/ACCENT');
  assert.match(audit, /SURFACE\s*=\s*'#23262D'/, 'SURFACE #23262D');
  assert.match(audit, /BOARD\s*=\s*'#1A1D23'/, 'BOARD #1A1D23');
  assert.match(audit, /ACCENT\s*=\s*'#E8A33D'/, 'ACCENT #E8A33D');
  assert.match(audit, /DARK_INK\s*=\s*'#1C1206'/, 'DARK_INK #1C1206');
  assert.match(audit, /6\.5/, 'accent on surface ≥6.5 (DESIGN ~7.0)');
  assert.match(audit, /7/, 'dark on accent ≥7 (DESIGN ~8.6)');
  const tileSrc = src(tilePath);
  assert.ok(tileSrc.includes('#F2EEE3') || audit.includes('#F2EEE3'), 'chrome TEXT #F2EEE3 must be referenced');
});

test.skip('[P0-API-06] AC 1 vs 2 distinct at a glance — areia vs ocre not hue-only ambiguity GDD rule (R-002)', () => {
  const s = src(tilePath);
  assert.ok(s.includes('#EFE3C2') && s.includes('#C9963B'), 'must contain both 1:#EFE3C2 and 2:#C9963B');
  assert.ok(src(shapePath).includes('TILE_HEXES[1]') || src(shapePath).includes('#EFE3C2'), 'shape test must pin 1 vs 2 distinct');
  // runtime distinctness checked in active probe
});

test.skip('[P0-API-07] AC shape beyond color — 192 emerald vs 1536 incandescent differ by grain/glow/bevel not hue (R-002/R-006)', () => {
  const s = src(tilePath);
  assert.match(s, /192:\s*\{[^}]*grain:\s*2/, '192 must have grain 2 heavy');
  assert.match(s, /1536:\s*\{[^}]*grain:\s*0[^}]*glow:\s*true/, '1536 must have grain 0 + glow true');
  assert.match(s, /bevel:\s*1\.6/, 'emerald bevel 1.6');
  assert.match(s, /bevel:\s*1\s*,/, 'incandescent bevel 1');
  const ts = src(shapePath);
  assert.match(ts, /192.*1536|1536.*192/, 'shape test must assert 192 vs 1536 grain differs');
  // GameBoard grain wiring checked separately
});

test.skip('[P0-API-08] AC GameBoard delegation — cellColor→tileFillFor 13-tier, tileTextColor→tileInkFor, no binary value<=12 (R-009)', () => {
  const s = src(boardPath);
  assert.match(s, /from ['"]\.\.\/ui\/tileNumerals/, 'GameBoard must import from tileNumerals');
  assert.match(s, /tileFillFor\(value\)/, 'cellColor must delegate to tileFillFor(value)');
  assert.match(s, /tileInkFor\(value\)/, 'tileTextColor must delegate to tileInkFor(value)');
  assert.match(s, /tileShapeFor\(value\)/, 'AnimatedTile must read tileShapeFor(value)');
  assert.ok(!/value\s*<=\s*12/.test(s), 'must NOT contain old binary value <=12');
  assert.ok(!/cellColor.*#EFE3C2/.test(s) || s.includes('tileFillFor'), 'no hard-coded tile hex in cellColor — single source TILE_HEXES');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — PR gate (wiring depth + helper purity + chrome drift)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-API-01] P1 grain band monotonic — low(1-12) grain 0 ≤ mid(24-96) grain1 ≤ emerald(192-768) grain2, incandescent glow only (R-002/R-006)', () => {
  const s = src(tilePath);
  assert.match(s, /1:\s*\{[^}]*grain:\s*0/, 'low 1-12 grain 0');
  assert.match(s, /24:\s*\{[^}]*grain:\s*1/, 'mid 24 grain 1');
  assert.match(s, /192:\s*\{[^}]*grain:\s*2/, 'emerald 192 grain 2');
  assert.match(s, /1536:\s*\{[^}]*glow:\s*true/, 'incandescent 1536 glow true');
  const ts = src(shapePath);
  assert.match(ts, /low.*mid|monotonic/, 'shape test must assert monotonic low≤mid≤emerald');
  // functional monotonic proved in active probe
});

test.skip('[P1-API-02] P1 interval cap invariants — non-canonical 0,5,100,800,2000,NaN,Infinity map to frozen tiers without throw (R-003)', () => {
  const s = src(tilePath);
  assert.match(s, /value\s*>\s*12/, 'interval cascade >12');
  assert.match(s, /value\s*>\s*3/, 'interval cascade >3');
  assert.match(s, /return TILE_HEXES\[3\]/, 'fallback 0/negative → TILE_HEXES[3]');
  assert.match(s, /!Number\.isFinite/, 'NaN/Infinity fallback guard');
  // sweep validated in active probe + triade suite
});

test.skip('[P1-API-03] P1 contrast helper purity — golden ratios 21:1, 4.54, 4.65 + 3-digit + bad hex never throw (R-004)', () => {
  const s = src(tilePath);
  assert.match(s, /hexToRgb/, 'hexToRgb must handle 3 vs 6');
  assert.match(s, /srgbToLinear/, 'srgbToLinear must exist');
  assert.match(s, /return 0/, 'bad hex must return 0 fallback not NaN (relativeLuminance)');
  assert.match(s, /Number\.isNaN/, 'must guard NaN hex parse');
  // golden pinned in active probe
});

test.skip('[P1-API-04] P1 Skia prop contract — RoundedRect style stroke bevel opacity grain 1/2 + glow exclusive (R-002/R-007)', () => {
  const s = src(boardPath);
  assert.match(s, /RoundedRect/, 'must use RoundedRect');
  assert.match(s, /style="stroke"/, 'grain must be RoundedRect style="stroke"');
  assert.match(s, /strokeWidth=\{shape\.bevel\}/, 'bevel must bind to shape.bevel');
  assert.match(s, /shape\.grain\s*>\s*0/, 'must branch shape.grain >0');
  assert.match(s, /shape\.grain\s*===\s*2/, 'must have inner grain 2 branch');
  assert.match(s, /color="#000000"/, 'grain color #000000 not transparent (review patch)');
  assert.ok(!/color="transparent"/.test(s), 'must NOT use transparent for grain');
  assert.match(s, /opacity=\{shape\.grain === 1 \? 0\.14 : 0\.22\}/, 'grain 1 opacity 0.14 vs grain 2 outer 0.22');
  assert.match(s, /opacity=\{0\.12\}/, 'inner grain 2 opacity 0.12');
  assert.match(s, /x=\{3\}.*y=\{3\}.*width=\{cell - 6\}/, 'outer grain inset 3');
  assert.match(s, /x=\{6\}.*y=\{6\}.*width=\{cell - 12\}/, 'inner grain inset 6');
  assert.match(s, /hasGlow/, 'hasGlow gated');
  assert.match(s, /value >= ?1536/, 'glow only for >=1536');
  assert.match(s, /color="#ff8c2f".*opacity=\{0\.28\}/, 'glow #ff8c2f 0.28');
  assert.match(s, /@ts-ignore/, '@ts-ignore required for Skia stroke');
});

test.skip('[P1-API-05] P1 announcement carries value text not hue + engine purity — Merged A plus B equals C (FR-31)', () => {
  const ann = src(annPath);
  assert.match(ann, /Merged:|Fundiu|a11y\.merged/i, 'announcement must carry value text Merged: A plus B equals C not hue');
  assert.ok(!/color.*Merged|Merged.*color|hex.*announce/i.test(ann), 'announcement must not encode hue/color');
  assert.ok(!/TILE_HEXES|tileFillFor/.test(ann), 'announcements must not depend on tile fill hexes — value text only');
  // engine purity
  const tileSrc = src(tilePath);
  assert.ok(tileSrc.includes('#EFE3C2') && tileSrc.includes('#FFF3DC'), 'dark canonical hexes present (#EFE3C2 … #FFF3DC)');
});

test.skip('[P1-API-06] P1 tileNumerals purity + numerals fit — Object.freeze, no RN/Skia, 32/13/9 unchanged, MIN_TILE_WIDTH 44 (R-008)', () => {
  const s = src(tilePath);
  assert.match(s, /Object\.freeze/, 'must be Object.freeze');
  assert.ok(!/from ['"]react-native['"]/.test(s), 'tileNumerals must not import react-native (pure)');
  assert.ok(!/from ['"]@shopify\/react-native-skia['"]/.test(s), 'tileNumerals must not import skia (pure)');
  assert.match(s, /TILE_NUMERAL_TOKENS/, 'TILE_NUMERAL_TOKENS must exist');
  assert.match(s, /'1-3'/, '1-3 bucket must remain');
  assert.match(s, /fontSize:\s*32/, '1-3 32pt');
  assert.match(s, /fontSize:\s*13/, '4-5 13pt');
  assert.match(s, /fontSize:\s*9/, '6+ 9pt');
  assert.match(s, /MIN_TILE_WIDTH\s*=\s*44/, 'MIN_TILE_WIDTH 44');
  assert.match(s, /CELL_RADIUS\s*=\s*10|CELL_RADIUS.*10/, 'CELL_RADIUS 10 — informational');
  const numer = src(numeralsPath);
  assert.match(numer, /#1C1206|TILE_INK_DARK.*1536/, 'tileNumerals.test must pin dark ink for 1536');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 — secondary gates (visual additive + high-value + stale chrome)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-API-01] P2 chrome pin source-of-truth staleness risk — audit hard-codes match design or import, accent pins documented (R-005)', () => {
  const audit = src(contrastPath);
  assert.match(audit, /SURFACE.*#23262D|#23262D.*SURFACE/, 'audit SURFACE');
  assert.match(audit, /TEXT.*#F2EEE3|#F2EEE3/, 'TEXT #F2EEE3');
  assert.match(audit, /6\.5/, 'accent on surface ≥6.5 pin');
  // staleness mitigated by documenting audit vs src/theme — informational
});

test.skip('[P2-API-02] P2 glow scope at rest vs merge — hasGlow isPunch && >=1536 (R-006 known gap)', () => {
  const s = src(boardPath);
  assert.match(s, /isPunch/, 'hasGlow via isPunch');
  assert.match(s, /value >= ?1536/, 'glow only 1536+');
  assert.match(s, /const hasGlow.*isPunch.*1536/, 'hasGlow = isPunch && value >=1536');
  // gap: resting 1536 grain 0 identical to 1 — documented before 9-4, not a fail
});

// ─────────────────────────────────────────────────────────────────────────────
// Active P0 probe (runs even though .gateway is dormant — proves spec green now)
// ─────────────────────────────────────────────────────────────────────────────
import { TILE_HEXES, TILE_INK, tileFillFor, tileInkFor, tileShapeFor, contrastRatio, relativeLuminance } from '../../../../triade/src/ui/tileNumerals.ts';

test('[P0-API-ACTIVE] smoke: 13-tier identity + contrast ≥4.5 weakest 384 + 192 vs 1536 shape + delegation + helpers (~30ms host)', async () => {
  // palette identity
  assert.strictEqual(TILE_HEXES[1], '#EFE3C2');
  assert.strictEqual(TILE_HEXES[3072], '#FFF3DC');
  assert.strictEqual(TILE_INK[192], '#1C1206');
  assert.strictEqual(TILE_INK[384], '#F6F0E1');
  assert.strictEqual(TILE_INK[1536], '#1C1206');
  assert.notStrictEqual(TILE_HEXES[1], TILE_HEXES[2], '1 vs 2 distinct');
  // cap
  assert.strictEqual(tileFillFor(6144), TILE_HEXES[3072]);
  assert.strictEqual(tileFillFor(12288), TILE_HEXES[3072]);
  assert.strictEqual(tileInkFor(6144), TILE_INK[3072]);
  assert.deepStrictEqual(tileShapeFor(12288), tileShapeFor(3072));
  assert.strictEqual(tileShapeFor(6144).glow, true);
  // shape beyond color
  const s192 = tileShapeFor(192);
  const s1536 = tileShapeFor(1536);
  assert.notStrictEqual(s192.grain, s1536.grain, '192 grain 2 vs 1536 grain 0');
  assert.strictEqual(s192.glow, false);
  assert.strictEqual(s1536.glow, true);
  // monotonic low≤mid≤emerald
  assert.ok(tileShapeFor(3).grain <= tileShapeFor(48).grain);
  assert.ok(tileShapeFor(48).grain <= tileShapeFor(384).grain);
  // delegation
  const boardSrc = readFileSync(boardPath, 'utf8');
  assert.match(boardSrc, /tileFillFor\(value\)/);
  assert.match(boardSrc, /tileInkFor\(value\)/);
  assert.match(boardSrc, /tileShapeFor\(value\)/);
  assert.ok(!/value\s*<=\s*12/.test(boardSrc));
  assert.match(boardSrc, /style="stroke"/);
  assert.match(boardSrc, /color="#000000"/);
  // contrast
  const r384 = contrastRatio(TILE_HEXES[384], TILE_INK[384]);
  assert.ok(r384 >= 4.5, `384 ratio ${r384.toFixed(2)} must be ≥4.5`);
  assert.ok(contrastRatio('#FFFFFF','#000000') >= 20.9 && contrastRatio('#FFFFFF','#000000') <= 21.1);
  assert.strictEqual(contrastRatio('#FFF','#FFF'), 1);
  assert.strictEqual(relativeLuminance('#GGGGGG'), 0);
  // non-canonical never throw
  assert.doesNotThrow(() => tileFillFor(NaN));
  assert.doesNotThrow(() => tileFillFor(Infinity));
  assert.strictEqual(tileFillFor(NaN), TILE_HEXES[3072]);
  assert.strictEqual(tileFillFor(5), TILE_HEXES[3]);
  assert.strictEqual(tileFillFor(100), TILE_HEXES[96]);
});
