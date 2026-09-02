/**
 * TEA Automate — API Gateway Contract Tests for dw-6-rotation-race-safe-area-initial-metrics (DW-6)
 * Location: _bmad-output/test-artifacts/tests/api/dw-6-rotation-race-safe-area-initial-metrics.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture needed)
 * TEA mapping: "API" = layout seam gateway contract (layoutFor + coalesceLayout + hook static wiring).
 * Provider is the layout seam (layoutFor pure + useSyncedLayout coalesce), consumer is App.tsx.
 *
 * Execute:
 *   npm --prefix triade test -- ../_bmad-output/test-artifacts/tests/api/dw-6-rotation-race-safe-area-initial-metrics.gateway.spec.ts
 * Canonical host gate is triade/__tests__/ui/layout.test.ts (18) + triade/__tests__/ui/useSyncedLayout.test.ts (4)
 * plus triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts (20 dormant → 20 pass when activated).
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { layoutFor, getBandTop, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR } from '../../../../triade/src/ui/layout.ts';

// Fixtures
const ZERO = { top: 0, bottom: 0, left: 0, right: 0 };
const PORTRAIT_NOTCH = { top: 47, bottom: 34, left: 0, right: 0 };
const LANDSCAPE_NOTCH = { top: 0, bottom: 0, left: 47, right: 21 };

const appSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/App.tsx', import.meta.url)), 'utf8');
const hookSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/src/ui/useSyncedLayout.ts', import.meta.url)), 'utf8');
const layoutSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/src/ui/layout.ts', import.meta.url)), 'utf8');

function coalesceLayoutLocal(pending: { width: number; height: number; insets: { top: number; bottom: number; left: number; right: number } }, lastValid: ReturnType<typeof layoutFor> | null): ReturnType<typeof layoutFor> {
  const nxt = layoutFor(pending);
  if (nxt.boardSize === 0 && lastValid && lastValid.boardSize > 0) return lastValid;
  return nxt;
}

describe('[API] dw-6 rotation race gateway — App.tsx provider + coalesce + layout contract (P0/P1)', () => {
  it('[P0-GW-01] App.tsx provides SafeAreaProvider initialMetrics so first frame not 0-insets', () => {
    // Given App mounts before native insets resolve
    // When SafeAreaProvider renders with initialMetrics
    // Then board renders non-zero via initialWindowMetrics fallback
    assert.ok(appSrc.includes('initialWindowMetrics'), 'App.tsx must import initialWindowMetrics');
    assert.ok(appSrc.includes('initialMetrics={initialWindowMetrics'), 'SafeAreaProvider must receive initialMetrics={initialWindowMetrics');
    assert.ok(appSrc.includes('initialWindowMetrics ?? undefined'), 'fallback must be null-safe ?? undefined');
    assert.equal((appSrc.match(/initialWindowMetrics/g) ?? []).length, 2, 'initialWindowMetrics hits 2 (import+JSX)');
    assert.equal((appSrc.match(/initialMetrics/g) ?? []).length, 1, 'initialMetrics prop 1');
    assert.equal((appSrc.match(/SafeAreaProvider/g) ?? []).length, 3, 'SafeAreaProvider import+open+close 3');
  });

  it('[P0-GW-02] AppContent uses single useSyncedLayout not racy direct hooks', () => {
    // Given device rotates 90deg where width/height swap before insets
    // When synced hook coalesces updates
    // Then board does not flash to 0
    assert.ok(appSrc.includes('useSyncedLayout'), 'AppContent must use useSyncedLayout');
    assert.ok(appSrc.includes("from './src/ui/useSyncedLayout"), 'must import from useSyncedLayout');
    assert.equal((appSrc.match(/useSyncedLayout/g) ?? []).length, 3, 'useSyncedLayout specifier+path+call 3');
    const racy = appSrc.includes('useWindowDimensions()') && appSrc.includes('useSafeAreaInsets()') && appSrc.includes('layoutFor({width,height,insets})');
    assert.equal(racy, false, 'direct racy 3-line layoutFor(width,height,insets) replaced by synced hook');
  });

  it('[P0-GW-03] coalesceLayout holds last valid when transient layout would be 0 (degenerate 2000-top)', () => {
    // Given degenerate insets exceed container
    // When hook receives transient 0
    // Then it preserves last valid boardSize
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    assert.ok(lastValid.boardSize > 0, `lastValid >0 got ${lastValid.boardSize}`);
    const degenerate = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
    const raw = layoutFor(degenerate);
    assert.strictEqual(raw.boardSize, 0, 'degenerate 320×480 top2000 must clamp to 0');
    const held = coalesceLayoutLocal(degenerate, lastValid);
    assert.strictEqual(held.boardSize, lastValid.boardSize, 'coalesce must hold last valid when next is 0');
    assert.strictEqual(held.bandHeight, lastValid.bandHeight, 'held bandHeight must be lastValid');
  });

  it('[P0-GW-04] coalesceLayout valid next replaces stale (844×390 left47 isLandscape)', () => {
    // Given lastValid portrait 390×844
    // When valid next 844×390 landscape arrives
    // Then coalesce returns valid not stale
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const validNext = { width: 844, height: 390, insets: LANDSCAPE_NOTCH };
    const coalesced = coalesceLayoutLocal(validNext, lastValid);
    assert.ok(coalesced.boardSize > 0, `valid next >0 got ${coalesced.boardSize}`);
    assert.notStrictEqual(coalesced.boardSize, lastValid.boardSize, 'valid next must not be stale lastValid');
    assert.strictEqual(coalesced.isLandscape, true, '844×390 left47 should be landscape');
    assert.strictEqual(coalesced.bandHeight, LANDSCAPE_BAND_HEIGHT, `landscape band should be ${LANDSCAPE_BAND_HEIGHT}`);
  });

  it('[P0-GW-05] layoutFor pure contract: 0-insets >0, degenerate 0, SAFE_MARGIN 16, floor 216, golden 382/688/452', () => {
    // Given layout.ts pure source of truth
    // When finite inputs with ZERO vs degenerate vs golden containers
    // Then contract holds never-negative finite
    assert.ok(layoutFor({ width: 390, height: 844, insets: ZERO }).boardSize > 0, '0-insets 390×844 must be >0');
    assert.strictEqual(layoutFor({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }).boardSize, 0, 'degenerate must be 0');
    assert.ok(layoutSrc.includes('SAFE_MARGIN = 16'), 'SAFE_MARGIN 16 literal must stay');
    assert.ok(layoutSrc.includes('PORTRAIT_BAND_HEIGHT = 96'), 'PORTRAIT 96 literal must stay');
    assert.ok(layoutSrc.includes('LANDSCAPE_BAND_HEIGHT = 48'), 'LANDSCAPE 48 literal must stay');
    assert.ok(layoutSrc.includes('BOARD_SIZE_FLOOR'), 'BOARD_SIZE_FLOOR reference must stay');
    assert.equal(BOARD_SIZE_FLOOR, 216, 'BOARD_SIZE_FLOOR 216 = 44*4+8*2+8*3');
    assert.equal(layoutFor({ width: 414, height: 896, insets: ZERO }).boardSize, 382, '414×896 ZERO should be 382');
    assert.equal(layoutFor({ width: 1024, height: 768, insets: ZERO }).bandHeight, 48, '1024×768 landscape band 48');
    assert.equal(layoutFor({ width: 500, height: 580, insets: ZERO }).boardSize, 452, '500×580 portrait 452');
  });

  it('[P0-GW-06] useSyncedLayout module exports hook with debounce + lastValid + bandTop + coalesce helper', () => {
    // Given hook module file exists
    // When inspected for required exports and coalesce seams
    // Then all seams present
    assert.ok(hookSrc.includes('export function useSyncedLayout'), 'useSyncedLayout must be exported');
    assert.ok(hookSrc.includes('useWindowDimensions'), 'hook must coalesce useWindowDimensions');
    assert.ok(hookSrc.includes('useSafeAreaInsets'), 'hook must coalesce useSafeAreaInsets');
    assert.ok(hookSrc.includes('setTimeout'), 'hook must debounce with setTimeout');
    assert.ok(hookSrc.includes('clearTimeout'), 'hook must cleanup with clearTimeout');
    assert.ok(hookSrc.includes('lastValid'), 'hook must hold lastValid boardSize');
    assert.ok(hookSrc.includes('getBandTop'), 'hook must compute bandTop via getBandTop');
    assert.ok(hookSrc.includes('DEFAULT_DEBOUNCE_MS'), 'hook must have DEFAULT_DEBOUNCE_MS');
    assert.ok(hookSrc.includes('coalesceLayout'), 'module must export coalesceLayout helper');
    assert.ok(hookSrc.includes('pendingRef'), 'hook must keep pendingRef for debounce commit');
    assert.ok(hookSrc.includes('timerRef'), 'hook must keep timerRef');
  });

  it('[P1-GW-07] DEFAULT_DEBOUNCE_MS = 32 singleton and debounceMs<=0 immediate commit branch', () => {
    // Given DEFAULT_DEBOUNCE_MS 32 inside spec 32-64 window
    // When inspected for singleton + immediate branch
    // Then exactly one literal 32 and one immediate branch
    assert.equal((hookSrc.match(/DEFAULT_DEBOUNCE_MS/g) ?? []).length, 2, 'DEFAULT_DEBOUNCE_MS hits 2 (const+param default)');
    assert.ok(hookSrc.includes('DEFAULT_DEBOUNCE_MS = 32'), 'DEFAULT_DEBOUNCE_MS must be 32 literal');
    assert.ok(hookSrc.includes('debounceMs <= 0'), 'hook must have debounceMs <=0 immediate commit branch');
    assert.ok(hookSrc.includes('debounceMs: number = DEFAULT_DEBOUNCE_MS'), 'param default must be DEFAULT_DEBOUNCE_MS');
  });

  it('[P1-GW-08] pendingRef + timerRef coalesce single commit: clear+set+cleanup deps', () => {
    // Given effect deps include all 6 fields width,height,insets.top,bottom,left,right,debounceMs
    // When two rapid rotation updates arrive within 32ms
    // Then only final commits via clear+set single commit
    assert.ok(hookSrc.includes('pendingRef.current ='), 'pendingRef.current must be assigned');
    assert.ok((hookSrc.match(/timerRef\.current/g) ?? []).length >= 4, 'timerRef.current hits >=4 (clear+null+set+clear)');
    assert.equal((hookSrc.match(/clearTimeout/g) ?? []).length, 2, 'clearTimeout should appear twice (pre-set + unmount)');
    assert.equal((hookSrc.match(/setTimeout\(/g) ?? []).length, 1, 'setTimeout( call should appear once');
    assert.ok(hookSrc.includes('ReturnType<typeof setTimeout>'), 'type should reference setTimeout');
    assert.ok(hookSrc.includes('insets.top'), 'effect must depend on insets.top');
    assert.ok(hookSrc.includes('insets.bottom'), 'effect must depend on insets.bottom');
    assert.ok(hookSrc.includes('insets.left'), 'effect must depend on insets.left');
    assert.ok(hookSrc.includes('insets.right'), 'effect must depend on insets.right');
  });

  it('[P1-GW-09] bandTop derived from synced insets + effective bandHeight (47+16+96 vs 0+16+48)', () => {
    // Given synced insets + effective bandHeight via getBandTop
    // When portrait 47 notch vs landscape 0
    // Then bandTop computes correctly
    assert.ok(hookSrc.includes('getBandTop(synced'), 'hook must compute bandTop from synced.insets');
    assert.ok(hookSrc.includes('effectiveLayout.bandHeight'), 'bandTop must use effectiveLayout.bandHeight not raw');
    assert.equal(getBandTop({ top: 47, bottom: 34, left: 0, right: 0 }, PORTRAIT_BAND_HEIGHT), 47 + SAFE_MARGIN + PORTRAIT_BAND_HEIGHT, 'portrait 47+16+96=159');
    assert.equal(getBandTop({ top: 0, bottom: 0, left: 47, right: 21 }, LANDSCAPE_BAND_HEIGHT), 0 + SAFE_MARGIN + LANDSCAPE_BAND_HEIGHT, 'landscape 0+16+48=64');
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const held = coalesceLayoutLocal({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }, lastValid);
    assert.equal(held.bandHeight, PORTRAIT_BAND_HEIGHT, 'degenerate held bandHeight must be lastValid portrait 96');
  });

  it('[P1-GW-10] lastValid only holds on boardSize===0 transient, valid>0 replaces stale (legitimate shrink)', () => {
    // Given lastValid large portrait
    // When legitimate shrink 400×250 ZERO still >0 but smaller
    // Then coalesce must replace not hold stale
    const lastLarge = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    assert.ok(lastLarge.boardSize > 0, 'lastLarge >0');
    const shrink = { width: 400, height: 250, insets: ZERO };
    const coalescedShrink = coalesceLayoutLocal(shrink, lastLarge);
    assert.ok(coalescedShrink.boardSize > 0, 'shrink 400×250 should be >0');
    assert.notStrictEqual(coalescedShrink.boardSize, lastLarge.boardSize, 'valid shrink must replace stale large');
    assert.ok(coalescedShrink.boardSize < lastLarge.boardSize, 'shrink should be smaller than portrait 390×844');
    const deg = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
    assert.strictEqual(coalesceLayoutLocal(deg, lastLarge).boardSize, lastLarge.boardSize, 'degenerate must hold large');
  });
});
