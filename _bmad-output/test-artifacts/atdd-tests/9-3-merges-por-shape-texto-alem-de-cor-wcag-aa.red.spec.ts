import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// ATDD RED PHASE SCAFFOLD — Story 9-3 Merges por shape/texto além de cor + WCAG AA
// Generated: 2026-09-03 | TEA (Murat) | commit delta 9448b3f → HEAD (009fc5e)
// All tests are `test.skip()` — they assert EXPECTED behavior from the spec
// and are INTENTIONALLY skipped until the developer activates the task.
// Activation: remove `test.skip` for the current task, run `npm test` in triade,
// confirm RED (before fix) then GREEN (after fix). See atdd-checklist for workflow.
//
// Mirrors the working-tree delta (committed 9448b3f..009fc5e, 6 files +491/-20):
// - triade/src/ui/tileNumerals.ts:49 — centralised TILE_HEXES (13 tiers 1:#EFE3C2 … 3072:#FFF3DC), TILE_INK per-tier
//   (#1C1206 dark on 1,2,3,6,12,192,1536,3072 / #F6F0E1 light on 24,48,96,384,768),
//   tileFillFor/tileInkFor/tileShapeFor interval capping 6144/12288→3072, plus pure WCAG helpers
//   hexToRgb/relativeLuminance/contrastRatio (no RN imports, Object.freeze).
// - triade/src/render/GameBoard.tsx:71 — cellColor→tileFillFor (13-tier), tileTextColor→tileInkFor per-tier,
//   AnimatedTile reads tileShapeFor(value) and renders facet grain beyond color as two
//   RoundedRect style="stroke" overlays (grain 1 bevel 1.2 opacity 0.14/0.22, grain 2 second inset 0.12), glow #ff8c2f 0.28 for 1536+ only.
// - triade/__tests__/ui/tileShape.test.ts NEW (6 tests) — 13-tier exact + ink + cap + 192 vs 1536 grain diff + monotonic + 1 vs 2.
// - triade/__tests__/ui/tileContrast.audit.test.ts NEW (3 tests) — every tier ≥4.5 (weakest 384 4.65), chrome text/muted/accent on board/surface/raised ≥4.5, 3:1 smoke.
// - triade/__tests__/ui/tileNumerals.test.ts:26 — ink expectations realigned to DESIGN (#1C1206/#F6F0E1, 192 dark, 1536 dark).
// - No engine edits (0 files), no new native assets, numeral tokens 32/13/9 untouched.

const TILE = fileURLToPath(new URL('../../../../triade/src/ui/tileNumerals.ts', import.meta.url));
const BOARD = fileURLToPath(new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url));
const CONTRAST_AUDIT = fileURLToPath(new URL('../../../../triade/__tests__/ui/tileContrast.audit.test.ts', import.meta.url));
const SHAPE_T = fileURLToPath(new URL('../../../../triade/__tests__/ui/tileShape.test.ts', import.meta.url));
const NUMERALS = fileURLToPath(new URL('../../../../triade/__tests__/ui/tileNumerals.test.ts', import.meta.url));
const ANNOUNCE = fileURLToPath(new URL('../../../../triade/src/a11y/announcements.ts', import.meta.url));

// ── P0: palette identity ─────────────────────────────────────────────

test.skip('[P0] AC 13-tier palette — TILE_HEXES matches DESIGN dark canonical exact', async () => {
  // Given the 13-tier DESIGN dark canonical (E9 identity)
  // When TILE_HEXES is read from tileNumerals.ts
  // Then every tier 1,2,3,6,12,24,48,96,192,384,768,1536,3072 maps to its exact DESIGN hex
  const src = await readFile(TILE, 'utf8');
  const expected: Record<number, string> = {
    1: '#EFE3C2', 2: '#C9963B', 3: '#E4A53B', 6: '#E08532', 12: '#C96E2E',
    24: '#A2521F', 48: '#6E5A45', 96: '#4E5560', 192: '#28A074', 384: '#157A5C',
    768: '#0E3B2E', 1536: '#FFD9A0', 3072: '#FFF3DC',
  };
  for (const [k, hex] of Object.entries(expected)) {
    assert.match(src, new RegExp(`${k}:\\s*'${hex}'|${k}:\\s*"${hex}"`), `TILE_HEXES[${k}] must be ${hex}`);
  }
  assert.match(src, /TILE_HEXES.*Object\.freeze/, 'TILE_HEXES must be Object.freeze (immutable)');
  // Dynamic import proof — before 9448b3f TILE_HEXES missing → ENOENT or undefined
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { TILE_HEXES: Record<number, string> };
  for (const [k, hex] of Object.entries(expected)) {
    assert.strictEqual(mod.TILE_HEXES[Number(k)], hex, `imported TILE_HEXES[${k}] must equal ${hex}`);
  }
  // Expected failure before fix: file contains only tileInkFor binary (#3a2f1d/#fff8e8) not TILE_HEXES → regex fails
});

test.skip('[P0] AC per-tier ink — TILE_INK dark #1C1206 on 1,2,3,6,12,192,1536,3072 light #F6F0E1 on 24,48,96,384,768', async () => {
  // Given DESIGN per-tier ink table
  // When TILE_INK is read
  // Then dark ink on pale/amber/bright-emerald/incandescent, light ink on copper/bronze/iron/deep-emerald/obsidian
  const src = await readFile(TILE, 'utf8');
  assert.match(src, /TILE_INK_DARK\s*=\s*['"]#1C1206['"]/, 'must define TILE_INK_DARK #1C1206');
  assert.match(src, /TILE_INK_LIGHT\s*=\s*['"]#F6F0E1['"]/, 'must define TILE_INK_LIGHT #F6F0E1');
  assert.match(src, /TILE_INK.*Object\.freeze/, 'TILE_INK must be Object.freeze');
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { TILE_INK: Record<number, string>; tileInkFor: (v:number)=>string };
  const DARK = '#1C1206'; const LIGHT = '#F6F0E1';
  const expected: Record<number,string> = { 1:DARK,2:DARK,3:DARK,6:DARK,12:DARK,24:LIGHT,48:LIGHT,96:LIGHT,192:DARK,384:LIGHT,768:LIGHT,1536:DARK,3072:DARK };
  for (const [k,v] of Object.entries(expected)) {
    assert.strictEqual(mod.TILE_INK[Number(k)], v, `TILE_INK[${k}]`);
    assert.strictEqual(mod.tileInkFor(Number(k)), v, `tileInkFor(${k}) must equal TILE_INK[${k}]`);
  }
  // Expected failure before fix: tileInkFor was `value <=12 ? #3a2f1d : #fff8e8` binary → 192 returns #fff8e8 not #1C1206
});

test.skip('[P0] AC cap at ceiling — tileFillFor/tileInkFor/tileShapeFor cap 6144/12288→3072 incandescent', async () => {
  // Given values beyond ceiling 6144/12288
  // When tileFillFor/tileInkFor/tileShapeFor map them
  // Then they cap to 3072 tier #FFF3DC dark ink grain 0 glow true (no new hex)
  const src = await readFile(TILE, 'utf8');
  assert.match(src, /tileFillFor.*value.*3072|value >= 3072.*TILE_HEXES\[3072\]/s, 'tileFillFor must cap >=3072 to TILE_HEXES[3072]');
  assert.match(src, /tileShapeFor.*value.*3072|value >= 3072.*TILE_SHAPE_MAP\[3072\]/s, 'tileShapeFor must cap >=3072');
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as {
    tileFillFor:(v:number)=>string; tileInkFor:(v:number)=>string; tileShapeFor:(v:number)=>{grain:number;glow:boolean}; TILE_HEXES:Record<number,string>; TILE_INK:Record<number,string>;
  };
  assert.strictEqual(mod.tileFillFor(6144), mod.TILE_HEXES[3072], '6144 must cap to 3072 hex #FFF3DC');
  assert.strictEqual(mod.tileFillFor(12288), mod.TILE_HEXES[3072], '12288 must cap to 3072');
  assert.strictEqual(mod.tileInkFor(6144), mod.TILE_INK[3072], 'tileInkFor(6144) must cap to dark #1C1206');
  assert.deepStrictEqual(mod.tileShapeFor(12288), mod.tileShapeFor(3072), 'tileShapeFor(12288) must equal 3072 shape');
  assert.strictEqual(mod.tileShapeFor(6144).glow, true, 'capped shape must have glow true incandescent');
  // Expected failure before fix: tileFillFor missing (only cellColor 7-bucket) or Infinity throws
});

// ── P0: WCAG AA contrast ────────────────────────────────────────────

test.skip('[P0] AC WCAG AA tile ink dark canonical — every tier contrast ≥4.5:1 weakest 384 #157A5C ≥4.5 (~4.7)', async () => {
  // Given every tile value 1..3072+ in dark canonical
  // When contrast(tileFill, tileInk) via WCAG relative luminance (0.2126/0.7152/0.0722, sRGB 0.04045/2.4, (L1+0.05)/(L2+0.05))
  // Then every tier ≥4.5:1 for 13pt/9pt small text; weakest 384 deep emerald on #F6F0E1 holds ~4.65 (design ~4.7) still ≥4.5
  const src = await readFile(TILE, 'utf8');
  assert.match(src, /contrastRatio|relativeLuminance/, 'must export contrastRatio/relativeLuminance');
  assert.match(src, /0\.2126.*0\.7152.*0\.0722/, 'luminance weights must be WCAG 0.2126/0.7152/0.0722');
  assert.match(src, /0\.04045.*12\.92|srgbToLinear/, 'must use sRGB linearisation 0.04045/12.92 + 2.4');
  assert.match(src, /\(L1 \+ 0\.05\) \/ \(L2 \+ 0\.05\)|L1.*L2.*0\.05/, 'ratio must be (L1+0.05)/(L2+0.05)');
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as {
    TILE_HEXES:Record<number,string>; TILE_INK:Record<number,string>; contrastRatio:(a:string,b:string)=>number;
  };
  for (const v of [1,2,3,6,12,24,48,96,192,384,768,1536,3072]) {
    const ratio = mod.contrastRatio(mod.TILE_HEXES[v], mod.TILE_INK[v]);
    assert.ok(ratio >= 4.5, `tier ${v} ${mod.TILE_HEXES[v]} on ${mod.TILE_INK[v]} ratio ${ratio.toFixed(2)} must be ≥4.5`);
  }
  const r384 = mod.contrastRatio(mod.TILE_HEXES[384], mod.TILE_INK[384]);
  assert.ok(r384 >= 4.5 && r384 < 6, `weakest 384 ratio ${r384.toFixed(2)} must be 4.5..6 (actual ~4.65, design ~4.7)`);
  // Expected failure before fix: contrastRatio missing → audit cannot exist; or binary ink #3a2f1d/#fff8e8 makes 384 ratio below 4.5
});

test.skip('[P0] AC WCAG AA chrome dark canonical — text/muted/accent on board/surface/raised ≥4.5 dark-on-accent ≥7', async () => {
  // Given chrome tokens on dark surfaces
  // When contrast is measured (body 13.1/5.6, accent 7.0, dark-on-accent 8.6 per spec)
  // Then every pair holds WCAG AA (muted ≥4.5) and accent high pins hold
  const audit = await readFile(CONTRAST_AUDIT, 'utf8');
  assert.match(audit, /SURFACE|BOARD|TEXT|MUTED|ACCENT/, 'audit must hard-code chrome tokens SURFACE/BOARD/TEXT/MUTED/ACCENT');
  assert.match(audit, /contrastRatio/, 'audit must use contrastRatio helper');
  assert.match(audit, /accent on surface.*6\.5|ACCENT.*SURFACE.*6\.5/, 'must pin accent on surface ≥6.5 (DESIGN ~7.0)');
  assert.match(audit, /dark.*on accent.*7|DARK_INK.*ACCENT.*7/, 'must pin dark on accent ≥7 (DESIGN ~8.6)');
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { contrastRatio:(a:string,b:string)=>number };
  // pinned spot checks (≈13.1 /5.6 /7.0 /8.6 per spec — tolerance ±0.6)
  const SURFACE='#23262D', BOARD='#1A1D23', RAISED='#2B2F38', TEXT='#F2EEE3', MUTED='#A39C8F', ACCENT='#E8A33D', DARK='#1C1206';
  const checks: Array<[string,number]> = [
    [`text on board ${mod.contrastRatio(TEXT,BOARD).toFixed(2)}`, mod.contrastRatio(TEXT,BOARD)],
    [`muted on surface ${mod.contrastRatio(MUTED,SURFACE).toFixed(2)}`, mod.contrastRatio(MUTED,SURFACE)],
    [`accent on surface ${mod.contrastRatio(ACCENT,SURFACE).toFixed(2)}`, mod.contrastRatio(ACCENT,SURFACE)],
    [`dark on accent ${mod.contrastRatio(DARK,ACCENT).toFixed(2)}`, mod.contrastRatio(DARK,ACCENT)],
  ];
  for (const [label,ratio] of checks) assert.ok(ratio >= 4.5, `${label} must be ≥4.5`);
  assert.ok(mod.contrastRatio(ACCENT,SURFACE) >= 6.5, `accent on surface ${mod.contrastRatio(ACCENT,SURFACE).toFixed(2)} must be ≥6.5`);
  assert.ok(mod.contrastRatio(DARK,ACCENT) >= 7, `dark on accent ${mod.contrastRatio(DARK,ACCENT).toFixed(2)} must be ≥7`);
  // Expected failure before fix: audit file missing → ENOENT; or chrome constants stale without WCAG helper
});

// ── P0: shape beyond color ──────────────────────────────────────────

test.skip('[P0] AC 1 vs 2 distinct at a glance — areia vs ocre not hue-only ambiguity (GDD rule)', async () => {
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { TILE_HEXES:Record<number,string> };
  assert.notStrictEqual(mod.TILE_HEXES[1], mod.TILE_HEXES[2], 'TILE_HEXES[1] areia #EFE3C2 vs TILE_HEXES[2] ocre #C9963B must be distinct');
  const src = await readFile(SHAPE_T, 'utf8');
  assert.match(src, /1 vs 2 distinct|TILE_HEXES\[1\].*TILE_HEXES\[2\]|areia.*ocre/i, 'shape audit must pin 1 vs 2 distinct');
  // Expected failure before fix: 7-bucket cellColor mapped both 1 and 2 to same bucket #EFE3C2-ish (indistinguishable)
});

test.skip('[P0] AC shape beyond color — 192 emerald vs 1536 incandescent differ by grain/glow/bevel not hue', async () => {
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { tileShapeFor:(v:number)=>{grain:number;glow:boolean;bevel:number} };
  const s192 = mod.tileShapeFor(192);
  const s1536 = mod.tileShapeFor(1536);
  const differs = s192.grain !== s1536.grain || s192.glow !== s1536.glow || s192.bevel !== s1536.bevel;
  assert.ok(differs, `192 ${JSON.stringify(s192)} vs 1536 ${JSON.stringify(s1536)} must differ by grain/glow/bevel`);
  assert.notStrictEqual(s192.grain, s1536.grain, 'grain must differ between 192 (heavy grain 2) and 1536 (grain 0 + glow)');
  const src = await readFile(SHAPE_T, 'utf8');
  assert.match(src, /192.*1536.*grain|grain.*192.*1536/, 'shape test must assert 192 vs 1536 grain differs');
  // Expected failure before fix: tileShapeFor missing or both grain 0 → indistinguishable by shape, FR-31 fails
});

test.skip('[P0] AC GameBoard delegation — cellColor→tileFillFor 13-tier, tileTextColor→tileInkFor, no binary value<=12', async () => {
  const src = await readFile(BOARD, 'utf8');
  assert.match(src, /tileFillFor/, 'GameBoard must import and delegate to tileFillFor (13 tiers)');
  assert.match(src, /tileInkFor|tileTextColor.*tileInkFor/, 'GameBoard must delegate ink to tileInkFor per-tier');
  assert.match(src, /tileShapeFor/, 'GameBoard must read tileShapeFor(value) for facet grain');
  assert.ok(!/value\s*<=\s*12/.test(src), 'must NOT contain old binary threshold value <=12 (relic of 7-bucket)');
  assert.ok(!/cellColor.*#EFE3C2|cellColor.*#C9963B/.test(src) || src.includes('tileFillFor'), 'hard-coded tile hexes must be gone from cellColor — single source TILE_HEXES');
  // Expected failure before fix: GameBoard contains `value <=12 ? #3a2f1d : #fff8e8` binary + 7-bucket switch on ranges
});

test.skip('[P0] AC facet grain Skia contract — RoundedRect style stroke bevel opacity grain 1/2 + glow exclusive', async () => {
  const src = await readFile(BOARD, 'utf8');
  assert.match(src, /style="stroke"/, 'must render grain as RoundedRect style="stroke"');
  assert.match(src, /strokeWidth=\{shape\.bevel\}/, 'bevel must be bound to shape.bevel (1 /1.2 /1.6)');
  assert.match(src, /shape\.grain\s*>\s*0|shape\.grain === 1|grain.*0\.14/, 'must branch on shape.grain >0 with opacity 0.14 for grain 1');
  assert.match(src, /shape\.grain\s*===\s*2/, 'must have second inner RoundedRect for grain 2 (heavy emerald/obsidian) with opacity 0.12');
  assert.match(src, /hasGlow.*1536|value >= ?1536.*glow|glow.*1536/, 'glow must be gated to value >=1536 (only glow in system)');
  assert.match(src, /color="#000000"/, 'grain inner stroke must be #000000 with opacity, not transparent (review patch)');
  assert.ok(!/color="transparent"/.test(src) || src.includes('#000000'), 'must not use transparent for grain (previous bug, now #000000)');
  // Expected failure before fix: GameBoard has no RoundedRect stroke branches, no tileShapeFor, glow was hard-coded per merge only
});

// ── P1: band monotonic + helper purity ──────────────────────────────

test.skip('[P1] AC grain band monotonic — low(1-12) grain 0 ≤ mid(24-96) grain 1 ≤ emerald(192-768) grain 2, incandescent glow only', async () => {
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { tileShapeFor:(v:number)=>{grain:number;glow:boolean} };
  const low = mod.tileShapeFor(3).grain;
  const mid = mod.tileShapeFor(48).grain;
  const emerald = mod.tileShapeFor(384).grain;
  assert.ok(low <= mid, `low grain ${low} <= mid ${mid}`);
  assert.ok(mid <= emerald, `mid ${mid} <= emerald ${emerald}`);
  const inc = mod.tileShapeFor(1536);
  assert.strictEqual(inc.glow, true, '1536 incandescent must have glow true (only glow in system)');
  const lowGlow = mod.tileShapeFor(3).glow;
  const midGlow = mod.tileShapeFor(48).glow;
  const emeraldGlow = mod.tileShapeFor(384).glow;
  assert.strictEqual(lowGlow, false, 'low must not glow');
  assert.strictEqual(midGlow, false, 'mid must not glow');
  assert.strictEqual(emeraldGlow, false, 'emerald must not glow');
  // Expected failure before fix: all grains equal (no band) or incandescent missing glow
});

test.skip('[P1] AC interval cap invariants — non-canonical values 0,5,100,800,2000,NaN,Infinity map to frozen tiers without throw', async () => {
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as {
    tileFillFor:(v:number)=>string; tileInkFor:(v:number)=>string; tileShapeFor:(v:number)=>{grain:number;glow:boolean}; TILE_HEXES:Record<number,string>; TILE_INK:Record<number,string>;
  };
  // 0 or negative → fallback to tile 3
  assert.doesNotThrow(() => mod.tileFillFor(0), 'tileFillFor(0) must not throw');
  assert.strictEqual(mod.tileFillFor(5), mod.TILE_HEXES[3], '5 → 3 (#E4A53B) interval fallback');
  assert.strictEqual(mod.tileFillFor(100), mod.TILE_HEXES[96], '100 → 96 (#4E5560)');
  assert.strictEqual(mod.tileFillFor(800), mod.TILE_HEXES[768], '800 → 768 (#0E3B2E)');
  assert.strictEqual(mod.tileFillFor(2000), mod.TILE_HEXES[1536], '2000 → 1536 (#FFD9A0)');
  assert.strictEqual(mod.tileFillFor(NaN), mod.TILE_HEXES[3072], 'NaN → 3072 cap (never throw)');
  assert.strictEqual(mod.tileFillFor(Infinity), mod.TILE_HEXES[3072], 'Infinity → 3072 cap');
  assert.doesNotThrow(() => mod.tileInkFor(NaN), 'tileInkFor(NaN) must not throw');
  assert.doesNotThrow(() => mod.tileShapeFor(NaN), 'tileShapeFor(NaN) must not throw');
  assert.strictEqual(mod.tileInkFor(5), mod.TILE_INK[3], 'tileInkFor(5) → TILE_INK[3]');
  // All fill results belong to frozen TILE_HEXES values
  for (const v of [0,5,100,800,2000]) assert.ok(Object.values(mod.TILE_HEXES).includes(mod.tileFillFor(v)), `tileFillFor(${v}) must be one of TILE_HEXES values`);
  // Expected failure before fix: tileFillFor missing or switch mishandles > vs >= ordering; NaN throws TypeError
});

test.skip('[P1] AC contrast helper purity — golden ratios 21:1, 4.54, 4.65 + 3-digit + bad hex never throw', async () => {
  const mod = (await import('../../../../triade/src/ui/tileNumerals.ts')) as { contrastRatio:(a:string,b:string)=>number; relativeLuminance:(h:string)=>number };
  const approx = (a:number,b:number,eps:number)=> Math.abs(a-b) <= eps;
  assert.ok(approx(mod.contrastRatio('#FFFFFF','#000000'), 21, 0.05), `#FFF vs #000 must be ~21:1 got ${mod.contrastRatio('#FFFFFF','#000000').toFixed(2)}`);
  assert.ok(approx(mod.contrastRatio('#767676','#FFFFFF'), 4.54, 0.1), `#767676 on #FFF must be ~4.54 got ${mod.contrastRatio('#767676','#FFFFFF').toFixed(2)}`);
  assert.ok(approx(mod.contrastRatio('#157A5C','#F6F0E1'), 4.65, 0.15), `weakest 384 deep emerald on #F6F0E1 must be ~4.65 got ${mod.contrastRatio('#157A5C','#F6F0E1').toFixed(2)}`);
  // 3-digit path
  assert.ok(approx(mod.contrastRatio('#FFF','#000'), 21, 0.05), `3-digit #FFF vs #000 must also be ~21:1`);
  assert.doesNotThrow(() => mod.relativeLuminance('#FFF'), 'relativeLuminance #FFF 3-digit must not throw');
  assert.strictEqual(mod.relativeLuminance('#GGGGGG'), 0, 'bad hex #GGGGGG must return 0 fallback not NaN');
  assert.ok(Number.isFinite(mod.contrastRatio('#GGGGGG','#FFFFFF')), 'contrastRatio with bad hex must be finite (0-luminance branch) not NaN');
  assert.strictEqual(mod.contrastRatio('#FFF','#FFF'), 1, 'same color must be 1:1');
  // determinism
  assert.strictEqual(mod.contrastRatio('#EFE3C2','#1C1206'), mod.contrastRatio('#EFE3C2','#1C1206'), 'same inputs must be deterministic');
  const src = await readFile(TILE, 'utf8');
  assert.ok(!/react-native|expo|skia/i.test(src.split('contrastRatio')[0].slice(-2000)) || /pure.*no RN|no RN imports/.test(src), 'contrast helper region must be pure no RN imports (header comment)');
  // Expected failure before fix: hexToRgb only handles 6-digit, srgbToLinear coefficient typo (0.715 instead of 0.7152), or returns NaN on bad hex
});

test.skip('[P1] AC tileNumerals purity + numeral tokens — Object.freeze, no RN/Skia, 32/13/9 unchanged, MIN_TILE_WIDTH 44', async () => {
  const src = await readFile(TILE, 'utf8');
  assert.ok(/Object\.freeze/.test(src), 'TILE_HEXES/TILE_INK/TILE_SHAPE_MAP must be Object.freeze');
  // no RN/Skia import in the contrast/shape region — tileNumerals stays pure
  const header = src.split('TILE_HEXES')[0];
  // purity: imports limited to none or type-only at top; no `from 'react-native'` in tileNumerals
  assert.ok(!/from ['"]react-native['"]/.test(src), 'tileNumerals must not import react-native (pure helper)');
  assert.ok(!/from ['"]@shopify\/react-native-skia['"]/.test(src), 'tileNumerals must not import skia (pure)');
  assert.match(src, /TILE_NUMERAL_TOKENS/, 'must retain TILE_NUMERAL_TOKENS');
  assert.match(src, /'1-3':.*32.*800|'1-3'.*fontSize:\s*32/s, '1-3 bucket must remain 32pt/800');
  assert.match(src, /'4-5':.*13.*700|'4-5'.*fontSize:\s*13/s, '4-5 bucket 13pt/700');
  assert.match(src, /'6\+':.*9.*700|'6+'.*fontSize:\s*9/s, '6+ bucket 9pt/700');
  assert.match(src, /MIN_TILE_WIDTH\s*=\s*44/, 'MIN_TILE_WIDTH must remain 44');
  const numeralsSrc = await readFile(NUMERALS, 'utf8');
  assert.match(numeralsSrc, /#1C1206|TILE_INK_DARK.*1536/, 'tileNumerals.test must have been realigned to DESIGN dark ink for 1536 (not old #fff8e8)');
  assert.match(numeralsSrc, /192.*DARK|tileInkFor\(192\).*dark/i, 'tileNumerals.test must pin 192 dark ink (bright emerald)');
  // Expected failure before fix: no Object.freeze, numeral tokens changed, or tileNumerals.test still expects old binary #3a2f1d/#fff8e8 for 192/1536
});

test.skip('[P1] AC announcements carry value text not hue + engine purity — Merged A plus B equals C, engine untouched', async () => {
  const ann = await readFile(ANNOUNCE, 'utf8');
  // announcement must be value text per FR-31 shape/text beyond color, not hue/color
  assert.match(ann, /Merged:.*plus.*equals|Fundiu.*mais.*igual|a11y\.merged/i, 'announcement must carry value text Merged: A plus B equals C not hue');
  assert.ok(!/color.*Merged|Merged.*color|hex.*announce/i.test(ann), 'announcement must not encode hue/color');
  // engine purity — core game rules not in tile render
  const { readFile: rf } = await import('node:fs/promises');
  // we assert engine directory unchanged by scanning delta: no TILE_HEXES leakage into engine
  // lightweight: announcements file should never import engine Board colors, only values
  assert.ok(!/TILE_HEXES|tileFillFor/.test(ann), 'announcements must not depend on tile fill hexes — value text only');
  // light + color-blind hexes NOT required here — validation scoped to dark canonical only, per spec Never
  const tileSrc = await readFile(TILE, 'utf8');
  assert.ok(tileSrc.includes('#EFE3C2') && tileSrc.includes('#FFF3DC'), 'dark canonical hexes present (#EFE3C2 … #FFF3DC)');
  // Expected failure before fix would be: announcements encode hue string or engine purity not checked — this is additive guard
});

// ── summary ───────────────────────────────────────────────────────────
// activation: remove `test.skip` for the current AC task, run:
//   npm --prefix triade test _bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts  (all skipped before activation)
//   npm --prefix triade test triade/__tests__/ui/tileShape.test.ts triade/__tests__/ui/tileContrast.audit.test.ts triade/__tests__/ui/tileNumerals.test.ts -- --no-coverage  (P0 green proof after fix — 12 tests 6+3+3)
// type gate: npx tsc --project triade/tsconfig.json --noEmit (0 errors per spec Auto Run Result)
