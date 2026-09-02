/**
 * TEA Automate — API Gateway Contract Tests for dw-layout-band-dedup-and-guard
 * Location: _bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture)
 * TEA mapping: "API" = pure layout gateway contract (layoutFor + getBandTop).
 * Provider is triade/src/ui/layout.ts (pure arithmetic), consumer is App.tsx bandTop + Hud.tsx band heights + orientation delegation.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing-patterns + data-factories fragments, adapted for pure TS layout seam.
 *
 * Spec: spec-layout-band-dedup-and-guard.md (DW-5 guard + DW-10 dedup, 6-row I/O matrix, 4 ACs, baseline 80dc5c → a09e6ed)
 * Test-design: test-design-dw-layout-band-dedup-and-guard.md (9 risks, P0 7 groups, P1 6, P2 4, P3 3; 3 high R-001/002/003)
 * ATDD source: triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts (20 it.skip scaffolds, P0 8 + P1 6 + P2 4 + P3 2)
 *
 * Execute:
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json
 *   npx tsx --test _bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts
 * Or via triade harness:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts
 * Canonical ATDD execution remains via triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts (activate it.skip → it → 20 pass) + triade/__tests__/ui/layout.test.ts (18 pass).
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  layoutFor,
  getBandTop,
  SAFE_MARGIN,
  PORTRAIT_BAND_HEIGHT,
  LANDSCAPE_BAND_HEIGHT,
  BOARD_SIZE_FLOOR,
} from '../../../../triade/src/ui/layout.ts';
import { isLandscape as orientationIsLandscape } from '../../../../triade/src/ui/orientation.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ZERO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 } as const;
const PORTRAIT_NOTCH = { top: 47, bottom: 34, left: 0, right: 0 } as const;
const LANDSCAPE_NOTCH = { top: 0, bottom: 0, left: 47, right: 21 } as const;

function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

function assertFiniteLayout(result: { boardSize: number; bandHeight: number; isLandscape: boolean }) {
  assert.ok(Number.isFinite(result.boardSize), 'boardSize finite');
  assert.ok(Number.isFinite(result.bandHeight), 'bandHeight finite');
  assert.equal(typeof result.isLandscape, 'boolean');
  assert.ok(result.boardSize >= 0, 'boardSize never negative');
  assert.ok(result.bandHeight > 0, 'bandHeight positive');
}

// ---------------------------------------------------------------------------
// P0 — Critical guard + finite byte-identical + helper dedup
// ---------------------------------------------------------------------------
describe('[API] layout band-dedup guard gateway — P0 critical (guard + finite + dedup)', () => {
  it('[P0] AC NaN/Infinity guard — 6-field Number.isFinite degrades to boardSize:0 finite (DW-5, R-001/R-003)', () => {
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
      assert.doesNotThrow(() => {
        result = layoutFor(input as any);
      }, `must not throw for ${JSON.stringify(input)}`);
      assert.equal(result!.boardSize, 0, `boardSize 0 for ${JSON.stringify(input)}`);
      assertFiniteLayout(result!);
      // guard fallback is always portrait 96 + false (finite consistent, not landscape-correct by spec)
      assert.equal(result!.bandHeight, PORTRAIT_BAND_HEIGHT, 'fallback bandHeight is PORTRAIT 96 (spec-allowed finite)');
      assert.equal(result!.isLandscape, false);
    }
  });

  it('[P0] guard also covers -Infinity and each inset edge Infinity (width/height/top/bottom/left/right, R-001)', () => {
    const extra: Array<{ width: number; height: number; insets: { top: number; bottom: number; left: number; right: number } }> = [
      { width: -Infinity, height: 844, insets: ZERO_INSETS },
      { width: 390, height: -Infinity, insets: ZERO_INSETS },
      { width: 390, height: 844, insets: { top: -Infinity, bottom: 0, left: 0, right: 0 } },
      { width: 390, height: 844, insets: { top: 0, bottom: -Infinity, left: 0, right: 0 } },
      { width: 390, height: 844, insets: { top: 0, bottom: 0, left: Infinity, right: 0 } },
      { width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: Infinity } },
    ];
    for (const input of extra) {
      const r = layoutFor(input as any);
      assert.equal(r.boardSize, 0);
      assertFiniteLayout(r);
    }
  });

  it('[P0] finite portrait 390×844 byte-identical — width-bounded maximized square + band 96 (R-003, AC byte-identical)', () => {
    const r = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
    assert.equal(r.isLandscape, false);
    assert.equal(r.bandHeight, 96);
    // 390-0-0-32=358 width; 844-0-0-32-96=716 height; board max square 358; floor 216 so stays 358
    assert.equal(r.boardSize, 358, 'portrait 390×844 board is width-bounded 358');
    assertFiniteLayout(r);
  });

  it('[P0] finite landscape 844×390 byte-identical — height-bounded below thin band 48 (R-003/R-007, D-006)', () => {
    const r = layoutFor({ width: 844, height: 390, insets: ZERO_INSETS });
    assert.equal(r.isLandscape, true);
    assert.equal(r.bandHeight, 48);
    assertFiniteLayout(r);
    // height-bounded: 390-0-0-32-48=310 available height, so board ≤310
    assert.equal(r.boardSize, 310, 'landscape 844×390 is height-bounded 310 and >48 band');
    assert.ok(r.boardSize > r.bandHeight, 'board dominates thin band');
  });

  it('[P0] finite golden anchors byte-identical — 414×896→382 / 1024×768→688 / 500×580→452 (R-003 regression anchors)', () => {
    const a = layoutFor({ width: 414, height: 896, insets: ZERO_INSETS });
    assert.equal(a.boardSize, 382, '414×896 portrait golden');
    assert.equal(a.bandHeight, 96);
    const b = layoutFor({ width: 1024, height: 768, insets: ZERO_INSETS });
    assert.equal(b.boardSize, 688, '1024×768 landscape golden');
    assert.equal(b.bandHeight, 48);
    const c = layoutFor({ width: 500, height: 580, insets: ZERO_INSETS });
    assert.equal(c.boardSize, 452, '500×580 portrait golden (580-32-96=452)');
    assert.equal(c.bandHeight, 96);
  });

  it('[P0] degenerate-clamp layout.test.ts:232 — insets exceed container clamps to 0 and stays finite (R-001 vs degenerate path)', () => {
    // existing clamp path (huge finite): top 2000 exceeds container
    const finiteDegenerate = layoutFor({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } });
    assert.equal(finiteDegenerate.boardSize, 0, 'finite top:2000 clamp is 0');
    assertFiniteLayout(finiteDegenerate);
    // guard path (Infinity) also 0 but via early guard — same observable 0, distinct branch
    const guardDegenerate = layoutFor({ width: 320, height: 480, insets: { top: Infinity, bottom: 0, left: 0, right: 0 } } as any);
    assert.equal(guardDegenerate.boardSize, 0, 'Infinity top guard is 0');
    assertFiniteLayout(guardDegenerate);
  });

  it('[P0] getBandTop dedup — App.tsx bandTop + Hud.tsx 2× height use single helper, no duplicated formula (DW-10, R-002)', () => {
    const appSrc = readSrc('triade/App.tsx');
    const hudSrc = readSrc('triade/src/ui/Hud.tsx');
    const layoutSrc = readSrc('triade/src/ui/layout.ts');
    // no inline formula remains in App/Hud
    assert.equal((appSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0, 'App must not inline bandTop formula');
    assert.equal((hudSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0, 'Hud must not inline bandTop formula');
    assert.equal((hudSrc.match(/topPad \+ bandHeight/g) ?? []).length, 0, 'Hud must not use topPad+bandHeight');
    // single export
    assert.equal((layoutSrc.match(/export function getBandTop/g) ?? []).length, 1, 'single getBandTop export in layout.ts');
    // App 1 call + Hud 2 height calls (imports counted separately, but height sites are what matters)
    assert.match(appSrc, /const bandTop = getBandTop\(insets, bandHeight\)/);
    assert.equal((hudSrc.match(/height: getBandTop\(insets, bandHeight\)/g) ?? []).length, 2, 'Hud 2× height:getBandTop');
    // App import is getBandTop (not SAFE_MARGIN), Hud still imports SAFE_MARGIN for padding locals but also getBandTop
    assert.match(appSrc, /import \{ layoutFor, getBandTop \}/);
    assert.match(hudSrc, /import \{ SAFE_MARGIN, getBandTop \}/);
  });

  it('[P0] getBandTop pure arithmetic — insets.top + SAFE_MARGIN + bandHeight byte-identical (R-002/R-005)', () => {
    assert.equal(getBandTop({ top: 47, bottom: 34, left: 0, right: 0 }, 96), 47 + 16 + 96, '47+16+96=159');
    assert.equal(getBandTop({ top: 47, bottom: 34, left: 0, right: 0 }, PORTRAIT_BAND_HEIGHT), 47 + 16 + PORTRAIT_BAND_HEIGHT);
    assert.equal(getBandTop({ top: 0, bottom: 0, left: 0, right: 0 }, 48), 0 + 16 + 48, '0+16+48=64');
    assert.equal(getBandTop(PORTRAIT_NOTCH, 96), 47 + 16 + 96);
    assert.equal(getBandTop(LANDSCAPE_NOTCH, 48), 0 + 16 + 48);
    assert.equal(SAFE_MARGIN, 16, 'SAFE_MARGIN is 16');
  });

  it('[P0] early-guard invariant — Number.isFinite guard is first statement in layoutFor before isLandscape/avail (R-003)', () => {
    const layoutSrc = readSrc('triade/src/ui/layout.ts');
    const fnBody = layoutSrc.slice(layoutSrc.indexOf('export function layoutFor'));
    const guardIdx = fnBody.indexOf('Number.isFinite');
    const landscapeIdx = fnBody.indexOf('isLandscape(');
    const availIdx = fnBody.indexOf('availWidth');
    assert.ok(guardIdx !== -1, 'guard must exist');
    assert.ok(guardIdx < landscapeIdx, 'guard before isLandscape');
    assert.ok(guardIdx < availIdx, 'guard before availWidth');
    // 6-field guard
    assert.equal((fnBody.match(/Number\.isFinite/g) ?? []).length, 6, 'exactly 6 Number.isFinite checks (width/height/top/bottom/left/right)');
  });
});

// ---------------------------------------------------------------------------
// P1 — Band pins / isLandscape single-source / asymmetry / finiteness sweep / ledger
// ---------------------------------------------------------------------------
describe('[API] layout band-dedup guard gateway — P1 wiring (band/isLandscape/ledger)', () => {
  it('[P1] band pins — PORTRAIT 96 / LANDSCAPE 48 and landscape collapses 96>48 (R-007, D-006)', () => {
    assert.equal(PORTRAIT_BAND_HEIGHT, 96);
    assert.equal(LANDSCAPE_BAND_HEIGHT, 48);
    assert.ok(PORTRAIT_BAND_HEIGHT > LANDSCAPE_BAND_HEIGHT, 'portrait band > landscape thin band');
    const portrait = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
    const landscape = layoutFor({ width: 844, height: 390, insets: ZERO_INSETS });
    assert.equal(portrait.bandHeight, 96);
    assert.equal(landscape.bandHeight, 48);
  });

  it('[P1] isLandscape single-source — layoutFor.isLandscape agrees with orientation.ts width>height, square→portrait (R-009)', () => {
    const cases: Array<[number, number, boolean]> = [
      [390, 844, false],
      [844, 390, true],
      [400, 400, false],
      [1024, 768, true],
      [500, 580, false],
    ];
    for (const [w, h, expectedLandscape] of cases) {
      assert.equal(orientationIsLandscape(w, h), expectedLandscape, `orientationIsLandscape(${w},${h})`);
      const r = layoutFor({ width: w, height: h, insets: ZERO_INSETS });
      assert.equal(r.isLandscape, expectedLandscape, `layoutFor.isLandscape(${w},${h})`);
      assert.equal(r.isLandscape, orientationIsLandscape(w, h), 'single source agreement');
    }
    const layoutSrc = readSrc('triade/src/ui/layout.ts');
    assert.equal((layoutSrc.match(/isLandscape\(/g) ?? []).length, 1, 'exactly one isLandscape() delegation in layout.ts');
  });

  it('[P1] per-edge insets bind asymmetrically — horizontal shrinks width-bounded, vertical shrinks height-bounded (R-004, AC-4)', () => {
    // width-bounded portrait: side insets shrink availWidth → board shrinks 358→338
    const withoutSides = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
    const withSides = layoutFor({ width: 390, height: 844, insets: { top: 0, bottom: 0, left: 10, right: 10 } });
    assert.ok(withSides.boardSize < withoutSides.boardSize, 'side insets shrink width-bounded board');
    assert.equal(withSides.boardSize, 338, '390 -10-10 -32 =338 width-bounded 390×844');
    // height-bounded portrait: notch shrinks availHeight → 452→371
    const withoutNotch = layoutFor({ width: 500, height: 580, insets: ZERO_INSETS });
    const withNotch = layoutFor({ width: 500, height: 580, insets: PORTRAIT_NOTCH });
    assert.ok(withNotch.boardSize < withoutNotch.boardSize, 'notch shrinks height-bounded board');
    assert.equal(withNotch.boardSize, 371, '580-47-34-32-96=371 height-bounded');
  });

  it('[P1] SAFE_MARGIN single-constant and getBandTop single-export invariant (R-002/R-005)', () => {
    const layoutSrc = readSrc('triade/src/ui/layout.ts');
    assert.equal((layoutSrc.match(/SAFE_MARGIN\s*=\s*16/g) ?? []).length, 1, 'exactly one SAFE_MARGIN=16 definition (single constant)');
    assert.equal(SAFE_MARGIN, 16);
    assert.equal((layoutSrc.match(/export function getBandTop/g) ?? []).length, 1);
    // App must not mention SAFE_MARGIN at all after dedup
    const appSrc = readSrc('triade/App.tsx');
    assert.equal((appSrc.match(/SAFE_MARGIN/g) ?? []).length, 0, 'App must not reference SAFE_MARGIN after dedup (uses getBandTop)');
    // Hud keeps SAFE_MARGIN only for padding locals, not for height
    const hudSrc = readSrc('triade/src/ui/Hud.tsx');
    assert.equal((hudSrc.match(/SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0);
  });

  it('[P1] finiteness sweep — all layoutFor outputs finite across sizes and many insets (R-001, never-throw+finiteness NFR)', () => {
    const sizes: Array<[number, number]> = [
      [320, 480],
      [390, 844],
      [414, 896],
      [844, 390],
      [1024, 768],
      [2000, 200],
      [500, 580],
    ];
    const insetsList: Array<{ top: number; bottom: number; left: number; right: number }> = [
      ZERO_INSETS,
      PORTRAIT_NOTCH,
      LANDSCAPE_NOTCH,
      { top: 10, bottom: 10, left: 10, right: 10 },
    ];
    for (const [w, h] of sizes) {
      for (const insets of insetsList) {
        let r: ReturnType<typeof layoutFor>;
        assert.doesNotThrow(() => {
          r = layoutFor({ width: w, height: h, insets });
        });
        assertFiniteLayout(r!);
      }
    }
    // min-tile floor keeps boardSize ≥ BOARD_SIZE_FLOOR when container fits
    const fits = layoutFor({ width: 500, height: 700, insets: ZERO_INSETS });
    assert.ok(fits.boardSize >= BOARD_SIZE_FLOOR, `fits floor: ${fits.boardSize} >= ${BOARD_SIZE_FLOOR}`);
    assert.equal(BOARD_SIZE_FLOOR, 216);
  });

  it('[P1] ledger DW-5/DW-10 done with resolution-undo 64-hex, sprint-status.yaml untouched (R-008, OPS)', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    // DW-5 and DW-10 each have status done 2026-09-01 + resolution-undo 64-hex
    assert.match(ledger, /DW-5[\s\S]*?status:\s*done 2026-09-01[\s\S]*?resolution-undo:\s*[0-9a-f]{64}/);
    assert.match(ledger, /DW-10[\s\S]*?status:\s*done 2026-09-01[\s\S]*?resolution-undo:\s*[0-9a-f]{64}/);
    assert.match(ledger, /resolved by sweep bundle dw-layout-band-dedup-and-guard/);
    const sprintStatus = readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
    assert.equal(sprintStatus.includes('dw-layout-band-dedup-and-guard'), false, 'sprint-status.yaml must not be written by this workflow (orchestrator-owned)');
    // git diff should show deferred-work but not sprint-status (verified via ledger; git check is host)
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (allowlist gates) — single helper / no duplicate / floor
// ---------------------------------------------------------------------------
describe('[API] layout band-dedup guard gateway — P2 static scans (allowlist + floor)', () => {
  it('[P2] single helper allowlist — getBandTop 1 export + 3 height uses + no duplicate formula (R-002)', () => {
    const layoutSrc = readSrc('triade/src/ui/layout.ts');
    const appSrc = readSrc('triade/App.tsx');
    const hudSrc = readSrc('triade/src/ui/Hud.tsx');
    assert.equal((layoutSrc.match(/export function getBandTop/g) ?? []).length, 1);
    assert.equal((appSrc.match(/getBandTop/g) ?? []).length, 2, 'App: import + 1 call');
    assert.equal((hudSrc.match(/getBandTop/g) ?? []).length, 3, 'Hud: import + 2 height calls');
    assert.equal((appSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0);
    assert.equal((hudSrc.match(/topPad \+ bandHeight/g) ?? []).length, 0);
  });

  it('[P2] no duplicate formula — App/Hud band height not via inline + SAFE_MARGIN for band (R-002)', () => {
    const appSrc = readSrc('triade/App.tsx');
    const hudSrc = readSrc('triade/src/ui/Hud.tsx');
    assert.equal((appSrc.match(/SAFE_MARGIN/g) ?? []).length, 0, 'App must have 0 SAFE_MARGIN');
    assert.equal((hudSrc.match(/SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0, 'Hud must have 0 SAFE_MARGIN+bandHeight inline');
    // Hud still has SAFE_MARGIN for padding locals — that's the only allowed use outside layout.ts
    assert.match(hudSrc, /topPad = insets\.top \+ SAFE_MARGIN/);
    assert.match(hudSrc, /leftPad = insets\.left \+ SAFE_MARGIN/);
  });

  it('[P2] BOARD_SIZE_FLOOR + floor-clamp + 0-clamp branch stays byte-identical (R-004/R-007, UX-DR-18)', () => {
    assert.equal(BOARD_SIZE_FLOOR, 216);
    // container that can fit floor keeps board ≥ FLOOR
    const fitsFloor = layoutFor({ width: 500, height: 700, insets: ZERO_INSETS });
    assert.ok(fitsFloor.boardSize >= BOARD_SIZE_FLOOR, `fits floor: ${fitsFloor.boardSize}`);
    // container too small to fit floor yields positive finite (fallback path keeps availBoard without growing)
    const tooSmall = layoutFor({ width: 200, height: 320, insets: ZERO_INSETS });
    assertFiniteLayout(tooSmall);
    assert.ok(tooSmall.boardSize > 0 && tooSmall.boardSize < BOARD_SIZE_FLOOR);
    // extreme landscape board dominates thin band
    const extreme = layoutFor({ width: 2000, height: 200, insets: ZERO_INSETS });
    assertFiniteLayout(extreme);
    assert.ok(extreme.boardSize > extreme.bandHeight, 'extreme landscape board dominates thin band');
    assert.equal(extreme.bandHeight, 48);
  });

  it('[P2] total-height invariant — boardSize + bandHeight does not exceed availHeight (R-004, chrome)', () => {
    // from layout.test.ts board never exceeds availHeight check — keep pinned
    const r = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const availHeight = 844 - PORTRAIT_NOTCH.top - PORTRAIT_NOTCH.bottom - 2 * SAFE_MARGIN - r.bandHeight;
    assert.ok(r.boardSize <= availHeight, `board ${r.boardSize} ≤ availHeight ${availHeight}`);
    assert.ok(r.boardSize + r.bandHeight <= availHeight + r.bandHeight);
  });
});
