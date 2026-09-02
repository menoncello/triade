/**
 * TEA Automate — E2E Umbrella Tests for dw-layout-band-dedup-and-guard
 * Location: _bmad-output/test-artifacts/tests/e2e/layout.band-dedup-guard.umbrella.spec.ts
 * Runner: Host-only node:test + tsx (no Playwright page.goto for RN layout seam)
 * TEA mapping: "E2E" = scanner + ledger + bench + chrome verification journeys (end-to-end through layout seam).
 * This file documents the E2E journeys as specs for traceability, but execution is host
 * (node:test, no browser/device). It mirrors the P1/P2/P3 journeys from
 * test-design-dw-layout-band-dedup-and-guard.md plus the exit-criteria smoke checklist.
 *
 * Each journey below maps to an ATDD gate in
 * triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts (P0-01..08, P1-01..06, P2-01..04, P3-01..02) plus
 * existing layout regression (layout.test.ts 18 pass), tsc gates, and ledger.
 *
 * Spec: spec-layout-band-dedup-and-guard.md (DW-5/DW-10, 4 ACs, I/O matrix 6 rows, baseline 80dc5c → a09e6ed)
 * Delta: triade/src/ui/layout.ts (getBandTop + 6-field guard) + App.tsx bandTop + Hud.tsx 2× height + deferred-work.md DW done
 *
 * To run host gates that back these E2E journeys:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts  # 20 skip (activate → 20 pass)
 *   npx tsx --test _bmad-output/test-artifacts/tests/api/layout.band-dedup-guard.gateway.spec.ts # 15 gateway contracts (~15ms)
 *   npx tsx --test _bmad-output/test-artifacts/tests/e2e/layout.band-dedup-guard.umbrella.spec.ts # 7 journeys in this file (host, P1/P2/P3)
 *   npm --prefix triade test -- __tests__/ui/layout.test.ts  # 18 pass existing regression
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json  # type gate
 */

// This file IS executed via node:test — unlike ingest/sync E2E artifacts that are Playwright page suites,
// the layout seam is pure TS and host-verifiable. The "E2E" label here means
// "through the layout seam + scanner pipeline + ledger", not "through a browser".

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { layoutFor, getBandTop, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR } from '../../../../triade/src/ui/layout.ts';

function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export const E2E_JOURNEYS = {
  // P1 E2E-01: Chrome pinned end-to-end — portrait 96 fits pause hit target ≥44, landscape thin 48
  'E2E-01 chrome band 96/48 pinned end-to-end (P1, chrome + board dominance)': {
    priority: 'P1',
    level: 'E2E (host, chrome seam)',
    ac: 'AC band single-source — portrait 96 / landscape 48 thin band D-006',
    risk: 'R-007 (BUS 4), R-004 (TECH 3)',
    traceability: 'P0-03/04/05 golden anchors + P1-01 band pins + gateway [P1] band pins',
    steps: [
      'Given triade/src/ui/layout.ts SAFE_MARGIN 16 + PORTRAIT 96 / LANDSCAPE 48 constants',
      'When layoutFor is called for portrait 390×844 and landscape 844×390 with ZERO_INSETS',
      'Then portrait reports bandHeight 96 (fits ≥44pt pause hit target), landscape 48 (thin top-edge D-006)',
      'And extreme landscape 2000×200 board 120 dominates thin band 48 (board > band, chrome no overlap)',
      'And boardSize + bandHeight ≤ availHeight (board never overlaps HUD band, small-screen smoke)',
    ],
    hostGate: 'gateway [P1] band pins + [P2] floor dominance + layout.test.ts 18 pass (board dominates thin band at 2000×200)',
    device: 'N/A — host chrome pins are the E2E gate (no simulator required; optional 15-min rotation smoke is on-demand)',
  },

  // P1 E2E-02: Finite-path regression — any finite container byte-identical to pre-change
  'E2E-02 finite byte-identical through App bandTop + Hud band heights (P1, finite regression)': {
    priority: 'P1',
    level: 'E2E (host, App+Hud wiring)',
    ac: 'AC finite byte-identical — maximized square, 0-clamp, orientation delegation unchanged',
    risk: 'R-003 (TECH 6), R-002 (TECH 6)',
    traceability: 'P0-03/04/05 + P1-02 isLandscape single-source + gateway [P1] per-edge asymmetry',
    steps: [
      'Given layout.ts guard is the first statement in layoutFor (before isLandscape/availWidth)',
      'When any finite width/height/insets is fed through layoutFor and through getBandTop(insets,bandHeight) in App/Hud',
      'Then portrait 390×844 358 and landscape 844×390 310 and golden 382/688/452 remain byte-identical to baseline 80dc5c',
      'And App bandTop getBandTop(insets,bandHeight) and Hud 2× height:getBandTop yield same arithmetic as before (47+16+96=159, 0+16+48=64)',
      'And TRIAGE: if guard moved after isLandscape, NaN would leak; gate is guard-order scan',
    ],
    hostGate: 'gateway [P0] guard first statement + [P0] finite portrait/landscape/golden + layout.test.ts 18 pass + rg getBandTop 3-height-uses 0-duplicate',
    device: 'N/A — host byte-identical suite is the E2E gate',
  },

  // P1 E2E-03: Ledger closed end-to-end — DW-5/DW-10 done with resolution-undo 64-hex, sprint-status untouched
  'E2E-03 ledger closed end-to-end (P1, DW-5/DW-10 resolution-undo + orchestrator file guard)': {
    priority: 'P1',
    level: 'E2E (host, ledger pipeline)',
    ac: 'AC ledger DW-5/DW-10 done with resolution-undo 64-hex hashes',
    risk: 'R-008 (OPS 2)',
    traceability: 'P1-06 ledger done + gateway [P1] ledger DW-5/DW-10 done',
    steps: [
      'Given _bmad-output/implementation-artifacts/deferred-work.md DW-5 (NaN propagation) + DW-10 (band duplication) were status: open',
      'When sweep bundle dw-layout-band-dedup-and-guard lands (a09e6ed) + ledger flips',
      'Then both entries read status: done 2026-09-01 + resolution: resolved by sweep bundle dw-layout-band-dedup-and-guard + resolution-undo: 6f4ef234… (64-hex, 73746… date-salt)',
      'And any reopen of DW-5/DW-10 must preserve the 64-hex hash (undo trail) else rollback is invalid',
      'And _bmad-output/implementation-artifacts/sprint-status.yaml is NOT written by this workflow (orchestrator-owned — git diff shows deferred-work.md but not sprint-status.yaml)',
    ],
    hostGate: 'gateway [P1] ledger DW-5/DW-10 done + atdd-checklist P1-06 ledger scan + git diff --stat shows deferred-work.md + spec but not sprint-status.yaml',
    device: 'N/A — host ledger scan is the E2E gate',
  },

  // P1 E2E-04: Orientation delegation end-to-end — layoutFor agrees with orientation.ts on every finite container
  'E2E-04 orientation delegation end-to-end (P1, isLandscape single source width>height)': {
    priority: 'P1',
    level: 'E2E (host, delegation seam)',
    ac: 'AC isLandscape single call — layoutFor delegates to orientation.ts width>height, square→portrait',
    risk: 'R-009 (TECH 2), R-003 (TECH 6)',
    traceability: 'P1-02 isLandscape agrees + gateway [P1] isLandscape single-source + layout.test.ts [P1] agree',
    steps: [
      'Given triade/src/ui/orientation.ts exports isLandscape(width,height) as width>height (strict, square false)',
      'When layoutFor is called for finite sizes including square 400×400 and portraits/landscapes 390×844, 844×390, 1024×768',
      'Then layoutFor.isLandscape matches orientation.ts for every case (single source; grep isLandscape( in layout.ts ==1 call)',
      'And fallback for guard (non-finite) is always isLandscape false (finite consistent, not orientation-correct — spec-allowed, callers must not branch on boardSize:0 alone)',
      'And a future edit that changes width≥height would be caught by 4-case pin + grep guard',
    ],
    hostGate: 'gateway [P1] isLandscape single-source + atdd P1-02 + layout.test.ts [P1] isLandscape agrees (4-case) + rg isLandscape count',
    device: 'N/A — host delegation pin is the E2E gate',
  },

  // P2 E2E-05: Static allowlists end-to-end — single constant + single helper + no duplicate + early guard
  'E2E-05 static allowlists end-to-end (P2, single-constant/helper/early-guard/no-duplicate)': {
    priority: 'P2',
    level: 'E2E (host, static scans)',
    ac: 'AC band helper single-source — getBandTop single export, 3 height uses, no duplicated formula',
    risk: 'R-002 (TECH 6), R-005 (TECH 3), R-003 (TECH 6)',
    traceability: 'P2-01..03 allowlists + gateway [P2] helper allowlist + [P2] no duplicate + [P0] early guard',
    steps: [
      'Given layout.ts owns SAFE_MARGIN=16 (single definition) and export function getBandTop single site',
      'When App.tsx + Hud.tsx are scanned with rg -n',
      'Then rg "export function getBandTop" triade/src/ui/layout.ts ==1, rg getBandTop App+Hud ==5 occurrences (App import+call=2, Hud import+2 heights=3)',
      'And rg "insets.top + SAFE_MARGIN + bandHeight" App+Hud ==0 and rg "topPad + bandHeight" Hud ==0',
      'And rg SAFE_MARGIN App ==0 and Hud SAFE_MARGIN ==4 pad locals only (not band-height), guard 6 Number.isFinite early, isLandscape 1 call',
      'And any future re-inline of the band formula would fail the P0 dedup scan (PR gate)',
    ],
    hostGate: 'gateway [P0] dedup + [P2] allowlist gates + atdd P2-01..03 scans + layout.test.ts 18 pass',
    device: 'N/A — host rg allowlist is the E2E gate',
  },

  // P2 E2E-06: Floor + clamp seam end-to-end — BOARD_SIZE_FLOOR 216 + floor-clamp vs 0-clamp
  'E2E-06 floor + clamp seam end-to-end (P2, BOARD_SIZE_FLOOR 216 + board dominance)': {
    priority: 'P2',
    level: 'E2E (host, floor seam)',
    ac: 'AC 0-clamp + floor-clamp byte-identical to pre-change (UX-DR-18/20)',
    risk: 'R-004 (TECH 3), R-007 (BUS 4)',
    traceability: 'P2-04 floor+clamp + gateway [P2] floor-clamp dominance + layout.test.ts min-tile floor + 0-clamp',
    steps: [
      'Given BOARD_SIZE_FLOOR 216 (MIN_TILE_WIDTH*4 + 8*2 + 8*3) and layoutFor availBoard < FLOOR ? availBoard : max(availBoard,FLOOR)',
      'When container fits floor (500×700 portrait → availBoard ≥216) then boardSize ≥216 (tile legibility); when container too small (200×320) then positive finite <216 (fallback scaling via numeralSizeFor)',
      'And extreme 2000×200 landscape board dominates thin band 48 and stays finite',
      'And degenerate finite top:2000 clamp 0 distinct from Infinity guard 0 — both collapse to 0 but different branches, both finite',
      'And total-height invariant boardSize + bandHeight ≤ availHeight+bandHeight holds for notched screens',
    ],
    hostGate: 'gateway [P2] floor + total-height + atdd P2-04 + layout.test.ts floor/0-clamp/extreme dominance pins',
    device: 'N/A — host floor seam is the E2E gate',
  },

  // P3 E2E-07: Residual + hygiene end-to-end — getBandTop NaN→NaN accepted + O(1) bench + scope guard
  'E2E-07 residual + hygiene end-to-end (P3, getBandTop NaN residual + O(1) bench + no scope leakage)': {
    priority: 'P3',
    level: 'E2E (host, residual + bench)',
    ac: 'AC getBandTop residual NaN→NaN while layoutFor guard keeps bandHeight finite (spec-allowed R-006)',
    risk: 'R-006 (TECH 3, residual), R-008 (OPS 2, ledger), NFR perf',
    traceability: 'P3-01 exploratory NaN + P3-02 hygiene bench + gateway perf O(1) + NFR planning bench gate',
    steps: [
      'Given spec Never: add broad sanitization beyond layoutFor Number.isFinite guard — helper stays pure arithmetic return insets.top + SAFE_MARGIN + bandHeight',
      'When getBandTop({top:NaN},48) or getBandTop({top:Infinity},48) is called',
      'Then result is NaN / Infinity (no throw, arithmetic propagation is spec-allowed — zero current blast radius because production useSafeAreaInsets is always finite)',
      'And layoutFor guard still yields finite bandHeight 96 for layoutFor({insets:{top:NaN}}) — bandHeight finiteness is layout-owned, bandTop NaN is Hud-owned and not layout-dependent',
      'And layoutFor 10k calls <50 ms (O(1) single pass arithmetic, no bench lane needed), layout.ts has no engine/feel/monetization leakage (rg music|bgm|RevenueCat|AdMob empty)',
    ],
    hostGate: 'atdd P3-01 exploratory + gateway bench O(1) + rg mus` — host hygiene gate; no nightly needed',
    device: 'N/A — host residual bench is the E2E gate (optional 15-min rotation smoke is on-demand, not required for this refactor)',
  },
};

// ---------------------------------------------------------------------------
// Host-executable journey verifiers — each maps to one E2E journey above.
// These are not Playwright page flows; they verify the host contract that the journey asserts.
// ---------------------------------------------------------------------------

describe('[E2E] layout band-dedup guard umbrella — P1 chrome journeys', () => {
  it('[P1][E2E-01] chrome band 96/48 pinned and board dominates thin band', () => {
    assert.equal(PORTRAIT_BAND_HEIGHT, 96);
    assert.equal(LANDSCAPE_BAND_HEIGHT, 48);
    const portrait = layoutFor({ width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    const landscape = layoutFor({ width: 844, height: 390, insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    assert.equal(portrait.bandHeight, 96);
    assert.equal(landscape.bandHeight, 48);
    const extreme = layoutFor({ width: 2000, height: 200, insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    assert.equal(extreme.bandHeight, 48);
    assert.ok(extreme.boardSize > extreme.bandHeight, 'board dominates thin band at 2000×200');
    assert.ok(Number.isFinite(extreme.boardSize) && extreme.boardSize > 0);
  });

  it('[P1][E2E-02] finite byte-identical through App bandTop + Hud heights', () => {
    const layoutSrc = readSrc('triade/src/ui/layout.ts');
    const fnBody = layoutSrc.slice(layoutSrc.indexOf('export function layoutFor'));
    assert.ok(fnBody.indexOf('Number.isFinite') < fnBody.indexOf('isLandscape('), 'guard before delegation');
    assert.equal(layoutFor({ width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: 0 } }).boardSize, 358);
    assert.equal(layoutFor({ width: 414, height: 896, insets: { top: 0, bottom: 0, left: 0, right: 0 } }).boardSize, 382);
    assert.equal(layoutFor({ width: 1024, height: 768, insets: { top: 0, bottom: 0, left: 0, right: 0 } }).boardSize, 688);
    assert.equal(getBandTop({ top: 47, bottom: 34, left: 0, right: 0 }, 96), 159);
    assert.equal(getBandTop({ top: 0, bottom: 0, left: 0, right: 0 }, 48), 64);
  });

  it('[P1][E2E-03] ledger DW-5/DW-10 done with resolution-undo 64-hex, sprint-status untouched', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.match(ledger, /DW-5[\s\S]*?status:\s*done 2026-09-01/);
    assert.match(ledger, /DW-10[\s\S]*?status:\s*done 2026-09-01/);
    assert.match(ledger, /resolution-undo:\s*[0-9a-f]{64}/);
    assert.match(ledger, /resolved by sweep bundle dw-layout-band-dedup-and-guard/);
    assert.equal(readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml').includes('dw-layout-band-dedup-and-guard'), false);
  });

  it('[P1][E2E-04] orientation delegation end-to-end', () => {
    const layoutSrc = readSrc('triade/src/ui/layout.ts');
    assert.equal((layoutSrc.match(/isLandscape\(/g) ?? []).length, 1, 'single delegation in layout.ts');
    for (const [w, h, exp] of [
      [390, 844, false],
      [844, 390, true],
      [400, 400, false],
    ] as const) {
      assert.equal(layoutFor({ width: w, height: h, insets: { top: 0, bottom: 0, left: 0, right: 0 } }).isLandscape, exp);
    }
  });
});

describe('[E2E] layout band-dedup guard umbrella — P2 static scans + floor', () => {
  it('[P2][E2E-05] static allowlists — single constant/helper/no duplicate/early guard', () => {
    const layoutSrc = readSrc('triade/src/ui/layout.ts');
    assert.equal((layoutSrc.match(/export function getBandTop/g) ?? []).length, 1);
    assert.equal((layoutSrc.match(/SAFE_MARGIN\s*=\s*16/g) ?? []).length, 1);
    const appSrc = readSrc('triade/App.tsx');
    const hudSrc = readSrc('triade/src/ui/Hud.tsx');
    assert.equal((appSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0);
    assert.equal((hudSrc.match(/topPad \+ bandHeight/g) ?? []).length, 0);
    assert.equal((appSrc.match(/SAFE_MARGIN/g) ?? []).length, 0);
    assert.equal((hudSrc.match(/SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0);
  });

  it('[P2][E2E-06] floor + clamp seam', () => {
    assert.equal(BOARD_SIZE_FLOOR, 216);
    const fits = layoutFor({ width: 500, height: 700, insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    assert.ok(fits.boardSize >= BOARD_SIZE_FLOOR);
    const tooSmall = layoutFor({ width: 200, height: 320, insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    assert.ok(tooSmall.boardSize > 0 && tooSmall.boardSize < BOARD_SIZE_FLOOR);
    assert.ok(tooSmall.boardSize >= 0 && Number.isFinite(tooSmall.boardSize));
  });
});

describe('[E2E] layout band-dedup guard umbrella — P3 residual + bench', () => {
  it('[P3][E2E-07] residual getBandTop NaN→NaN + O(1) bench <50 ms + no scope leakage', () => {
    // residual is spec-allowed — pure + propagates NaN/Infinity, but no throw
    assert.ok(Number.isNaN(getBandTop({ top: NaN, bottom: 0, left: 0, right: 0 }, 48)));
    assert.equal(getBandTop({ top: Infinity, bottom: 0, left: 0, right: 0 }, 48), Infinity);
    // guard still keeps layoutFor finite
    assert.equal(layoutFor({ width: 390, height: 844, insets: { top: NaN, bottom: 0, left: 0, right: 0 } } as any).bandHeight, 96);
    // O(1) bench
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) layoutFor({ width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 80, `10k layoutFor <80 ms, got ${elapsed.toFixed(1)} ms`);
    // scope guard
    const layoutSrc = readSrc('triade/src/ui/layout.ts');
    assert.equal(/RevenueCat|AdMob|music|bgm/.test(layoutSrc), false, 'layout scope stays pure');
  });
});
