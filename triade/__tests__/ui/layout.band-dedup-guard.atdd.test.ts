import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutFor, getBandTop, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR } from '../../src/ui/layout.ts';
import type { EdgeInsets } from '../../src/ui/layout.ts';
import { isLandscape } from '../../src/ui/orientation.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-layout-band-dedup-and-guard — red-phase scaffolds
// covering working-tree delta vs baseline 80dc5c1 → a09e6ed:
// layout.ts: export getBandTop(insets,bandHeight)=insets.top+SAFE_MARGIN+bandHeight
//            + layoutFor 6-field Number.isFinite guard → {boardSize:0, 96, false}
// App.tsx:  bandTop = getBandTop(insets,bandHeight) (was insets.top+SAFE_MARGIN+bandHeight)
// Hud.tsx:  2× height: getBandTop(insets,bandHeight) (was topPad+bandHeight)
// Host-only: node:test + tsx, no RN/native, no browser harness.
// ---------------------------------------------------------------------------

const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 };
const PORTRAIT_NOTCH: EdgeInsets = { top: 47, bottom: 34, left: 0, right: 0 };
const LANDSCAPE_NOTCH: EdgeInsets = { top: 0, bottom: 0, left: 47, right: 21 };

const layoutSrc = fs.readFileSync(fileURLToPath(new URL('../../src/ui/layout.ts', import.meta.url)), 'utf8');
const appSrc = fs.readFileSync(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8');
const hudSrc = fs.readFileSync(fileURLToPath(new URL('../../src/ui/Hud.tsx', import.meta.url)), 'utf8');

function assertFiniteLayout(result: { boardSize: number; bandHeight: number; isLandscape: boolean }) {
  assert.ok(Number.isFinite(result.boardSize), 'boardSize finite');
  assert.ok(Number.isFinite(result.bandHeight), 'bandHeight finite');
  assert.equal(typeof result.isLandscape, 'boolean');
  assert.ok(result.boardSize >= 0, 'boardSize never negative');
  assert.ok(result.bandHeight > 0, 'bandHeight positive');
}

describe('ATDD dw-layout-band-dedup-and-guard — P0 critical (spec AC)', () => {
  it.skip('[P0-01] AC NaN/Infinity guard — 6-field Number.isFinite degrades to boardSize:0 finite (DW-5)', () => {
    // Before guard: layoutFor({width:NaN,...}) propagated NaN into availWidth/Height → boardSize NaN.
    // After: early return {boardSize:0, bandHeight:96, isLandscape:false} — finite, no throw, no NaN.
    const variants: Array<{ width: number; height: number; insets: typeof ZERO_INSETS }> = [
      { width: NaN, height: 844, insets: ZERO_INSETS },
      { width: 390, height: Infinity, insets: ZERO_INSETS },
      { width: 390, height: 844, insets: { top: NaN, bottom: 0, left: 0, right: 0 } },
      { width: 390, height: 844, insets: { top: 0, bottom: Infinity, left: 0, right: 0 } },
      { width: 390, height: 844, insets: { top: 0, bottom: 0, left: -Infinity, right: 0 } },
      { width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: NaN } },
    ];
    for (const input of variants) {
      let result: ReturnType<typeof layoutFor>;
      assert.doesNotThrow(() => { result = layoutFor(input as any); }, `must not throw for ${JSON.stringify(input)}`);
      result = layoutFor(input as any);
      assert.equal(result.boardSize, 0, `boardSize 0 for ${JSON.stringify(input)}`);
      assertFiniteLayout(result);
      // Spec fixes fallback to portrait 96/false — the contract is finiteness + 0, but the landed literal is pinned here
      assert.equal(result.bandHeight, PORTRAIT_BAND_HEIGHT, 'fallback bandHeight is portrait 96 per landed guard');
      assert.equal(result.isLandscape, false, 'fallback isLandscape false');
    }
  });

  it.skip('[P0-02] AC guard also covers -Infinity and each inset edge Infinity (width/height/top/bottom/left/right)', () => {
    const neg: Array<{ width: number; height: number; insets: typeof ZERO_INSETS }> = [
      { width: -Infinity, height: 844, insets: ZERO_INSETS },
      { width: 390, height: NaN, insets: { top: 0, bottom: 0, left: 0, right: Infinity } },
      { width: 390, height: 844, insets: { top: Infinity, bottom: 0, left: 0, right: 0 } },
    ];
    for (const input of neg) {
      const r = layoutFor(input as any);
      assert.equal(r.boardSize, 0);
      assertFiniteLayout(r);
    }
  });

  it.skip('[P0-03] AC finite portrait 390×844 byte-identical — width-bounded maximized square + band 96', () => {
    const layout = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    assert.equal(layout.isLandscape, false);
    assert.equal(layout.bandHeight, 96);
    assert.equal(layout.bandHeight, PORTRAIT_BAND_HEIGHT);
    // availWidth = 390 -0-0 -2*16 =358 ; availHeight =844-47-34-2*16-96=635 ; board = min =358
    assert.equal(layout.boardSize, 358, 'portrait 390×844 width-bounded 358');
  });

  it.skip('[P0-04] AC finite landscape 844×390 byte-identical — height-bounded below thin band 48', () => {
    const layout = layoutFor({ width: 844, height: 390, insets: LANDSCAPE_NOTCH });
    assert.equal(layout.isLandscape, true);
    assert.equal(layout.bandHeight, 48);
    assert.equal(layout.bandHeight, LANDSCAPE_BAND_HEIGHT);
    // availWidth=844-47-21-32=744 ; availHeight=390-0-0-32-48=310 ; board=310 height-bounded
    const availWidth = 844 - 47 - 21 - 2 * SAFE_MARGIN;
    const availHeight = 390 - 0 - 0 - 2 * SAFE_MARGIN - 48;
    assert.equal(layout.boardSize, Math.min(availWidth, availHeight));
    assert.ok(layout.boardSize > layout.bandHeight, 'board dominates thin landscape band (D-006)');
  });

  it.skip('[P0-05] AC finite golden anchors byte-identical — 414×896→382 / 1024×768→688 / 500×580→452', () => {
    assert.equal(layoutFor({ width: 414, height: 896, insets: ZERO_INSETS }).boardSize, 382, '414×896 portrait 382 =414-2*16');
    assert.equal(layoutFor({ width: 1024, height: 768, insets: ZERO_INSETS }).boardSize, 688, '1024×768 landscape 688 =768-2*16-48');
    assert.equal(layoutFor({ width: 500, height: 580, insets: ZERO_INSETS }).boardSize, 452, '500×580 portrait 452 =580-2*16-96');
  });

  it.skip('[P0-06] AC degenerate-clamp layout.test.ts:232 — insets exceed container clamps to 0 and stays finite', () => {
    const layout = layoutFor({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } });
    assert.equal(layout.boardSize, 0, 'degenerate insets clamp to 0 (existing clamp path)');
    assertFiniteLayout(layout);
    // Guard path vs degenerate path: both collapse to 0 but guard is the NaN/Infinity branch, degenerate is the clamp branch
    const guard = layoutFor({ width: 320, height: 480, insets: { top: Infinity, bottom: 0, left: 0, right: 0 } });
    assert.equal(guard.boardSize, 0, 'Infinity insets also 0 via guard (not clamp)');
    assertFiniteLayout(guard);
  });

  it.skip('[P0-07] AC getBandTop dedup — App.tsx bandTop + Hud.tsx 2× height use single helper, no duplicated formula', () => {
    // Source-level gate (DW-10): duplicated `insets.top + SAFE_MARGIN + bandHeight` must be gone from App/Hud
    assert.equal((appSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0, 'App.tsx no duplicated insets.top + SAFE_MARGIN + bandHeight');
    assert.equal((hudSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0, 'Hud.tsx no duplicated formula');
    assert.equal((hudSrc.match(/topPad \+ bandHeight/g) ?? []).length, 0, 'Hud.tsx no topPad + bandHeight');
    // SAFE_MARGIN direct use in App/Hud outside import must be 0 — helper owns the addition
    // Count SAFE_MARGIN occurrences that are not part of an import line
    const appNonImport = appSrc.split('\n').filter(l => !l.includes('import')).join('\n');
    const hudNonImport = hudSrc.split('\n').filter(l => !l.includes('import')).join('\n');
    assert.equal((appNonImport.match(/SAFE_MARGIN/g) ?? []).length, 0, 'App.tsx must not reference SAFE_MARGIN directly (uses getBandTop)');
    // Hud still imports SAFE_MARGIN for topPad/leftPad/rightPad paddings (retained) — but must not use it for band height
    // So this pin is: `getBandTop` present exactly where band height computed
    assert.ok(appSrc.includes('getBandTop'), 'App.tsx imports getBandTop');
    assert.ok(hudSrc.includes('getBandTop'), 'Hud.tsx imports getBandTop');
    assert.equal((appSrc.match(/getBandTop/g) ?? []).length, 2, 'App.tsx getBandTop import + 1 call site');
    assert.equal((hudSrc.match(/getBandTop/g) ?? []).length, 3, 'Hud.tsx getBandTop import + 2 height sites');
  });

  it.skip('[P0-08] AC getBandTop pure arithmetic — insets.top + SAFE_MARGIN + bandHeight byte-identical', () => {
    assert.equal(getBandTop({ top: 47, bottom: 34, left: 0, right: 0 }, 96), 47 + 16 + 96, 'PORTRAIT_NOTCH 47+16+96=159');
    assert.equal(getBandTop({ top: 0, bottom: 0, left: 0, right: 0 }, 48), 0 + 16 + 48, 'ZERO top 0+16+48=64');
    assert.equal(getBandTop({ top: 0, bottom: 0, left: 47, right: 21 }, 48), 0 + 16 + 48, 'LANDSCAPE_NOTCH top0 landscape 48→64');
    assert.equal(getBandTop(PORTRAIT_NOTCH, 96), 47 + 16 + 96);
    assert.equal(SAFE_MARGIN, 16, 'SAFE_MARGIN pin 16');
  });
});

describe('ATDD dw-layout-band-dedup-and-guard — P1 wiring (band/isLandscape/ledger)', () => {
  it.skip('[P1-01] band pins — PORTRAIT 96 / LANDSCAPE 48 and landscape collapses (96>48)', () => {
    assert.equal(PORTRAIT_BAND_HEIGHT, 96);
    assert.equal(LANDSCAPE_BAND_HEIGHT, 48);
    const portrait = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
    const landscape = layoutFor({ width: 844, height: 390, insets: ZERO_INSETS });
    assert.equal(portrait.bandHeight, 96);
    assert.equal(landscape.bandHeight, 48);
    assert.ok(portrait.bandHeight > landscape.bandHeight, 'landscape collapses to thin top-edge band D-006');
  });

  it.skip('[P1-02] isLandscape single-source — layoutFor.isLandscape agrees with orientation.ts width>height', () => {
    const cases = [
      { width: 390, height: 844, expect: false },
      { width: 844, height: 390, expect: true },
      { width: 1024, height: 768, expect: true },
      { width: 500, height: 580, expect: false },
      { width: 400, height: 400, expect: false }, // square → portrait (> not >=)
    ] as const;
    for (const { width, height, expect } of cases) {
      assert.equal(layoutFor({ width, height, insets: ZERO_INSETS }).isLandscape, expect, `${width}×${height}`);
      assert.equal(isLandscape(width, height), expect, `orientation.ts ${width}×${height}`);
      assert.equal(layoutFor({ width, height, insets: ZERO_INSETS }).isLandscape, isLandscape(width, height));
    }
    // Source-level: exactly one isLandscape call inside layout.ts (import + one call)
    const calls = (layoutSrc.match(/isLandscape\(/g) ?? []).length;
    assert.equal(calls, 1, 'layout.ts must call isLandscape exactly once (single source)');
  });

  it.skip('[P1-03] per-edge insets bind asymmetrically — horizontal shrinks width-bounded, vertical shrinks height-bounded', () => {
    const widthBounded = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
    assert.equal(widthBounded.boardSize, 358, '390×844 width-bounded 358');
    const withSide = layoutFor({ width: 390, height: 844, insets: { top: 0, bottom: 0, left: 10, right: 10 } });
    assert.equal(withSide.boardSize, 338, 'horizontal insets shrink width-bounded 358→338');
    assert.ok(widthBounded.boardSize > withSide.boardSize);

    const heightBounded = layoutFor({ width: 500, height: 580, insets: ZERO_INSETS });
    assert.equal(heightBounded.boardSize, 452);
    const withNotch = layoutFor({ width: 500, height: 580, insets: PORTRAIT_NOTCH });
    // availWidth 500-0-0-32=468 ; availHeight 580-47-34-32-96=371 ; board 371
    assert.ok(heightBounded.boardSize > withNotch.boardSize, 'vertical notch shrinks height-bounded');
    assert.equal(withNotch.boardSize, Math.min(500 - 0 - 0 - 32, 580 - 47 - 34 - 32 - 96));
  });

  it.skip('[P1-04] SAFE_MARGIN single-constant and getBandTop single-export invariant', () => {
    assert.equal(SAFE_MARGIN, 16);
    const defs = (layoutSrc.match(/export const SAFE_MARGIN/g) ?? []).length;
    assert.equal(defs, 1, 'SAFE_MARGIN defined once in layout.ts');
    const exports = (layoutSrc.match(/export function getBandTop/g) ?? []).length;
    assert.equal(exports, 1, 'getBandTop exported once');
    // Whole codebase allowlist: SAFE_MARGIN definition site only in layout.ts; App/Hud band math must use helper
    assert.ok(!appSrc.split('\n').filter(l => !l.includes('import')).join('\n').includes('SAFE_MARGIN'), 'App.tsx band math not via SAFE_MARGIN literal');
  });

  it.skip('[P1-05] finiteness sweep — all layoutFor outputs finite across sizes and many insets', () => {
    const sizes = [
      { width: 320, height: 480 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 2000, height: 200 },
      { width: 200, height: 2000 },
      { width: 500, height: 580 },
      { width: 1024, height: 768 },
    ];
    for (const { width, height } of sizes) {
      const r = layoutFor({ width, height, insets: ZERO_INSETS });
      assertFiniteLayout(r);
      assert.ok(r.boardSize <= width - 0 - 0 - 2 * SAFE_MARGIN || r.boardSize === 0);
    }
    // Tiny board guard sweep
    for (const width of [320, 390, 414, 844, 1024]) {
      const r = layoutFor({ width, height: 844, insets: ZERO_INSETS });
      assert.ok(Number.isFinite(r.boardSize));
      assert.ok(r.boardSize >= 0);
    }
  });

  it.skip('[P1-06] ledger DW-5/DW-10 done with resolution-undo 64-hex, sprint-status.yaml untouched', () => {
    const ledger = fs.readFileSync(fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)), 'utf8');
    const done = [...ledger.matchAll(/status:\s*done 2026-09-01/g)];
    assert.ok(done.length >= 2, 'at least DW-5 and DW-10 marked done 2026-09-01');
    const undo = [...ledger.matchAll(/resolution-undo:\s*[0-9a-f]{6,}/gi)];
    assert.ok(undo.length >= 2, 'each resolved DW has resolution-undo hash');
    // DW-5 and DW-10 specifically
    assert.ok(ledger.includes('DW-5'), 'DW-5 entry present');
    assert.ok(ledger.includes('DW-10'), 'DW-10 entry present');
    // Orchestrator-owned file must not mention this bundle as done
    const sprintStatus = fs.readFileSync(fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/sprint-status.yaml', import.meta.url)), 'utf8');
    assert.equal(sprintStatus.includes('dw-layout-band-dedup-and-guard'), false, 'sprint-status.yaml must not be written by this ATDD workflow');
  });
});

describe('ATDD dw-layout-band-dedup-and-guard — P2 static scans / floor / clamp', () => {
  it.skip('[P2-01] SCAN single helper allowlist — getBandTop 1 export + 3 uses', () => {
    assert.equal((layoutSrc.match(/export function getBandTop/g) ?? []).length, 1);
    const totalUses = (appSrc.match(/getBandTop/g) ?? []).length + (hudSrc.match(/getBandTop/g) ?? []).length;
    // App: import + 1 call =2, Hud: import +2 calls =3 → total 5 occurrences; distinct call sites 3
    assert.equal(totalUses, 5, 'App (2) + Hud (3) =5 occurrences incl imports');
    const hudHeightSites = (hudSrc.match(/height:\s*getBandTop\(insets,\s*bandHeight\)/g) ?? []).length;
    assert.equal(hudHeightSites, 2, 'Hud.tsx 2× height: getBandTop');
    const appBandTop = (appSrc.match(/const bandTop = getBandTop\(insets,\s*bandHeight\)/g) ?? []).length;
    assert.equal(appBandTop, 1, 'App.tsx 1× const bandTop = getBandTop');
  });

  it.skip('[P2-02] SCAN no duplicate formula — App/Hud band height not via + SAFE_MARGIN inline', () => {
    const dupInApp = (appSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length;
    const dupInHud = (hudSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length;
    const topPadBand = (hudSrc.match(/topPad \+ bandHeight/g) ?? []).length;
    assert.equal(dupInApp, 0);
    assert.equal(dupInHud, 0);
    assert.equal(topPadBand, 0);
  });

  it.skip('[P2-03] SCAN early-guard invariant — Number.isFinite guard is first statement in layoutFor', () => {
    const finiteHits = (layoutSrc.match(/Number\.isFinite/g) ?? []).length;
    assert.equal(finiteHits, 6, 'guard checks 6 fields width/height/top/bottom/left/right');
    // Verify guard block appears before isLandscape/allocation
    const guardIdx = layoutSrc.indexOf('!Number.isFinite(width)');
    const landscapeIdx = layoutSrc.indexOf('isLandscape(width');
    assert.ok(guardIdx !== -1 && landscapeIdx !== -1 && guardIdx < landscapeIdx, 'guard must be before isLandscape / availWidth derivation');
    const availIdx = layoutSrc.indexOf('availWidth');
    assert.ok(guardIdx < availIdx, 'guard before availWidth');
  });

  it.skip('[P2-04] BOARD_SIZE_FLOOR + floor-clamp + 0-clamp branch stays byte-identical', () => {
    assert.equal(BOARD_SIZE_FLOOR, 216, '216 =44*4 +8*2 +8*3 (MIN_TILE_WIDTH=44)');
    // Typical landscape fits floor
    const typical = layoutFor({ width: 844, height: 390, insets: ZERO_INSETS });
    assert.ok(typical.boardSize >= BOARD_SIZE_FLOOR, 'typical landscape keeps tiles >=44pt');
    // Small container below floor keeps positive finite via fallback path
    const small = layoutFor({ width: 400, height: 250, insets: ZERO_INSETS });
    assert.ok(Number.isFinite(small.boardSize) && small.boardSize > 0);
    assert.ok(small.boardSize < BOARD_SIZE_FLOOR, 'below-floor container may shrink below 216');
    // Extreme landscape board dominates band (chrome pin)
    const extreme = layoutFor({ width: 2000, height: 200, insets: ZERO_INSETS });
    assert.ok(extreme.isLandscape && extreme.boardSize > extreme.bandHeight);
    // board never exceeds safe-margin-bounded bounds
    for (const c of [{ width: 390, height: 844, insets: PORTRAIT_NOTCH }, { width: 844, height: 390, insets: LANDSCAPE_NOTCH }]) {
      const r = layoutFor(c as any);
      const aw = c.width - c.insets.left - c.insets.right - 2 * SAFE_MARGIN;
      const ah = c.height - c.insets.top - c.insets.bottom - 2 * SAFE_MARGIN - r.bandHeight;
      assert.ok(r.boardSize <= aw);
      assert.ok(r.boardSize <= ah);
    }
  });
});

describe('ATDD dw-layout-band-dedup-and-guard — P3 exploratory / residual / hygiene', () => {
  it.skip('[P3-01] exploratory — getBandTop non-finite residual is pure arithmetic NaN→NaN per spec', () => {
    // Spec allows: helper is pure `+`; NaN/Infinity insets.top still yields NaN/Infinity bandTop
    // while layoutFor guard keeps bandHeight finite. This is accepted residual (R-006).
    const nanBand = getBandTop({ top: NaN, bottom: 0, left: 0, right: 0 }, 48);
    assert.ok(Number.isNaN(nanBand), 'getBandTop NaN → NaN (no throw, spec-allowed)');
    const infBand = getBandTop({ top: Infinity, bottom: 0, left: 0, right: 0 }, 96);
    assert.equal(infBand, Infinity);
    // Helpers never throw
    assert.doesNotThrow(() => getBandTop({ top: 0, bottom: 0, left: 0, right: 0 }, 48));
    assert.doesNotThrow(() => layoutFor({ width: NaN, height: NaN, insets: { top: NaN, bottom: NaN, left: NaN, right: NaN } } as any));
  });

  it.skip('[P3-02] hygiene — layout scope stays pure, no engine/feel/monetization leakage, O(1) <1 ms', () => {
    assert.equal(/mulberry32|RevenueCat|AdMob|music|bgm/i.test(layoutSrc), false, 'layout.ts stays pure (no cross-cutting import)');
    // Bench: 10k layoutFor calls <50 ms is O(1) smoke
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 50, `10k layoutFor in ${elapsed.toFixed(1)} ms must be <50 ms (O(1))`);
    for (let i = 0; i < 1000; i++) getBandTop({ top: 47, bottom: 34, left: 0, right: 0 }, 96);
    assert.ok(performance.now() - t0 < 100, 'getBandTop bench also O(1)');
  });
});
