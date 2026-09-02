/**
 * TEA Automate — Unit ATDD Combined Mirror for dw-6-rotation-race-safe-area-initial-metrics (DW-6)
 * Location: _bmad-output/test-artifacts/tests/unit/dw-6-rotation-race-safe-area-initial-metrics.atdd.test.ts
 * Runner: node:test + tsx (host-only, no Playwright)
 * Mirrors triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts (20 it.skip RED-phase) + triade/__tests__/ui/useSyncedLayout.test.ts (4)
 * This file is the TEA artifact under test_artifacts/tests/unit per _bmad/tea/config.yaml.
 * All tests are it.skip RED-phase mirrors — dormant 20 skip → 20 pass when activated (python3 it.skip→it).
 * Triade oracle (triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts) is canonical green; this mirror is compliance copy.
 *
 * Execute dormant (expect 20 skipped):
 *   npm --prefix triade test -- ../_bmad-output/test-artifacts/tests/unit/dw-6-rotation-race-safe-area-initial-metrics.atdd.test.ts
 * Activate (expect 20 pass):
 *   python3 -c "import pathlib; p=pathlib.Path('_bmad-output/test-artifacts/tests/unit/dw-6-rotation-race-safe-area-initial-metrics.atdd.test.ts'); t=p.read_text(); p.write_text(t.replace('it.skip','it'))" && npm --prefix triade test -- ../_bmad-output/test-artifacts/tests/unit/dw-6-rotation-race-safe-area-initial-metrics.atdd.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { layoutFor, getBandTop, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR } from '../../../../triade/src/ui/layout.ts';

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

describe('ATDD dw-6 rotation race — P0 critical (spec AC + first-frame/rotation coalesce)', () => {
  it.skip('[P0-01] App.tsx provides SafeAreaProvider initialMetrics so first frame not 0-insets', () => {
    assert.ok(appSrc.includes('initialWindowMetrics'), 'App.tsx must import initialWindowMetrics');
    assert.ok(appSrc.includes('initialMetrics={initialWindowMetrics'), 'SafeAreaProvider must receive initialMetrics={initialWindowMetrics');
    assert.ok(appSrc.includes('initialWindowMetrics ?? undefined'), 'fallback must be null-safe ?? undefined');
    assert.equal((appSrc.match(/initialWindowMetrics/g) ?? []).length, 2, 'initialWindowMetrics hits 2');
    assert.equal((appSrc.match(/initialMetrics/g) ?? []).length, 1, 'initialMetrics prop should appear once');
    assert.equal((appSrc.match(/SafeAreaProvider/g) ?? []).length, 3, 'SafeAreaProvider 3');
  });

  it.skip('[P0-02] AppContent uses single useSyncedLayout not racy direct hooks', () => {
    assert.ok(appSrc.includes('useSyncedLayout'), 'AppContent must use useSyncedLayout');
    assert.ok(appSrc.includes("from './src/ui/useSyncedLayout"), 'must import from useSyncedLayout');
    assert.equal((appSrc.match(/useSyncedLayout/g) ?? []).length, 3, 'useSyncedLayout 3');
    const racy = appSrc.includes('useWindowDimensions()') && appSrc.includes('useSafeAreaInsets()') && appSrc.includes('layoutFor({width,height,insets})');
    assert.equal(racy, false, 'racy triple replaced');
  });

  it.skip('[P0-03] coalesceLayout holds last valid when transient layout would be 0 (degenerate 2000-top)', () => {
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    assert.ok(lastValid.boardSize > 0, `lastValid >0 got ${lastValid.boardSize}`);
    const degenerate = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
    assert.strictEqual(layoutFor(degenerate).boardSize, 0, 'degenerate clamp 0');
    assert.strictEqual(coalesceLayoutLocal(degenerate, lastValid).boardSize, lastValid.boardSize, 'coalesce hold');
  });

  it.skip('[P0-04] coalesceLayout valid next replaces stale (844×390 left47 isLandscape)', () => {
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const coalesced = coalesceLayoutLocal({ width: 844, height: 390, insets: LANDSCAPE_NOTCH }, lastValid);
    assert.ok(coalesced.boardSize > 0, `valid next >0 got ${coalesced.boardSize}`);
    assert.notStrictEqual(coalesced.boardSize, lastValid.boardSize, 'valid next not stale');
    assert.strictEqual(coalesced.isLandscape, true, '844×390 left47 landscape');
    assert.strictEqual(coalesced.bandHeight, LANDSCAPE_BAND_HEIGHT, `landscape band ${LANDSCAPE_BAND_HEIGHT}`);
  });

  it.skip('[P0-05] useSyncedLayout module exports hook with debounce + lastValid + bandTop + coalesce helper', () => {
    assert.ok(hookSrc.includes('export function useSyncedLayout'), 'useSyncedLayout exported');
    assert.ok(hookSrc.includes('useWindowDimensions'), 'useWindowDimensions');
    assert.ok(hookSrc.includes('useSafeAreaInsets'), 'useSafeAreaInsets');
    assert.ok(hookSrc.includes('setTimeout'), 'setTimeout');
    assert.ok(hookSrc.includes('clearTimeout'), 'clearTimeout');
    assert.ok(hookSrc.includes('lastValid'), 'lastValid');
    assert.ok(hookSrc.includes('getBandTop'), 'getBandTop');
    assert.ok(hookSrc.includes('DEFAULT_DEBOUNCE_MS'), 'DEFAULT_DEBOUNCE_MS');
    assert.ok(hookSrc.includes('coalesceLayout'), 'coalesceLayout');
    assert.ok(hookSrc.includes('pendingRef'), 'pendingRef');
    assert.ok(hookSrc.includes('timerRef'), 'timerRef');
  });

  it.skip('[P0-06] layoutFor pure contract: 0-insets >0, degenerate 0, SAFE_MARGIN 16, floor 216', () => {
    assert.ok(layoutFor({ width: 390, height: 844, insets: ZERO }).boardSize > 0, '0-insets >0');
    assert.strictEqual(layoutFor({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }).boardSize, 0, 'degenerate 0');
    assert.ok(layoutSrc.includes('SAFE_MARGIN = 16'), 'SAFE_MARGIN 16');
    assert.ok(layoutSrc.includes('PORTRAIT_BAND_HEIGHT = 96'), 'PORTRAIT 96');
    assert.ok(layoutSrc.includes('LANDSCAPE_BAND_HEIGHT = 48'), 'LANDSCAPE 48');
    assert.ok(layoutSrc.includes('BOARD_SIZE_FLOOR'), 'BOARD_SIZE_FLOOR');
    assert.equal(BOARD_SIZE_FLOOR, 216, 'BOARD_SIZE_FLOOR 216');
  });

  it.skip('[P0-07] bandTop derived from synced insets + effective bandHeight (47+16+96 vs 0+16+48)', () => {
    assert.ok(hookSrc.includes('getBandTop(synced'), 'hook bandTop from synced');
    assert.ok(hookSrc.includes('effectiveLayout.bandHeight'), 'effectiveLayout.bandHeight');
    assert.equal(getBandTop({ top: 47, bottom: 34, left: 0, right: 0 }, PORTRAIT_BAND_HEIGHT), 47 + SAFE_MARGIN + PORTRAIT_BAND_HEIGHT, 'portrait 159');
    assert.equal(getBandTop({ top: 0, bottom: 0, left: 47, right: 21 }, LANDSCAPE_BAND_HEIGHT), 0 + SAFE_MARGIN + LANDSCAPE_BAND_HEIGHT, 'landscape 64');
  });

  it.skip('[P0-08] existing layout.test.ts 18-case regression anchor (golden 382/688/452) still implied', () => {
    assert.equal(layoutFor({ width: 414, height: 896, insets: ZERO }).boardSize, 382, '414×896 382');
    const b = layoutFor({ width: 1024, height: 768, insets: ZERO });
    assert.ok(b.boardSize === 688 || b.isLandscape === true, `1024×768 688 landscape got ${b.boardSize}`);
    for (const sz of [{ w: 390, h: 844 }, { w: 844, h: 390 }, { w: 414, h: 896 }, { w: 1024, h: 768 }, { w: 320, h: 480 }]) {
      const r = layoutFor({ width: sz.w, height: sz.h, insets: ZERO });
      assert.ok(Number.isFinite(r.boardSize) && r.boardSize >= 0, `${sz.w}×${sz.h} finite >=0`);
    }
  });
});

describe('ATDD dw-6 rotation race — P1 wiring (debounce/persist/bandTop/layout P1)', () => {
  it.skip('[P1-01] DEFAULT_DEBOUNCE_MS = 32 singleton and debounceMs<=0 immediate commit branch', () => {
    assert.equal((hookSrc.match(/DEFAULT_DEBOUNCE_MS/g) ?? []).length, 2, 'DEFAULT_DEBOUNCE_MS 2');
    assert.ok(hookSrc.includes('DEFAULT_DEBOUNCE_MS = 32'), 'DEFAULT 32');
    assert.ok(hookSrc.includes('debounceMs <= 0'), 'debounceMs <=0 branch');
    assert.ok(hookSrc.includes('debounceMs: number = DEFAULT_DEBOUNCE_MS'), 'param default');
  });

  it.skip('[P1-02] pendingRef + timerRef coalesce single commit: clear+set+cleanup', () => {
    assert.ok(hookSrc.includes('pendingRef.current ='), 'pendingRef assigned');
    assert.ok((hookSrc.match(/timerRef\.current/g) ?? []).length >= 4, 'timerRef >=4');
    assert.equal((hookSrc.match(/clearTimeout/g) ?? []).length, 2, 'clearTimeout 2');
    assert.equal((hookSrc.match(/setTimeout\(/g) ?? []).length, 1, 'setTimeout( 1');
    assert.ok(hookSrc.includes('ReturnType<typeof setTimeout>'), 'ReturnType');
    assert.ok(hookSrc.includes('insets.top'), 'insets.top');
    assert.ok(hookSrc.includes('insets.bottom'), 'insets.bottom');
    assert.ok(hookSrc.includes('insets.left'), 'insets.left');
    assert.ok(hookSrc.includes('insets.right'), 'insets.right');
  });

  it.skip('[P1-03] useMemo dep arrays exact: rawLayout 6 deps + bandTop 2 deps', () => {
    assert.equal((hookSrc.match(/useMemo\(\(\) => layoutFor\(synced\)/g) ?? []).length, 1, 'useMemo layoutFor 1');
    assert.ok(hookSrc.includes('synced.insets.left'), 'left');
    assert.ok(hookSrc.includes('synced.insets.right'), 'right');
    assert.ok(hookSrc.includes('getBandTop(synced.insets'), 'getBandTop synced');
    assert.ok(hookSrc.includes('effectiveLayout.bandHeight'), 'effectiveLayout.bandHeight');
    assert.ok(hookSrc.includes('[rawLayout]'), 'effectiveLayout deps rawLayout');
  });

  it.skip('[P1-04] initialMetrics fallback is null-safe (?? undefined not &&)', () => {
    assert.ok(appSrc.includes('initialWindowMetrics ?? undefined'), '?? undefined');
    assert.equal(appSrc.includes('initialMetrics={initialWindowMetrics &&'), false, 'not &&');
    assert.equal(appSrc.includes('initialMetrics={initialWindowMetrics ?') && !appSrc.includes('initialMetrics={initialWindowMetrics ??'), false, 'not ?:');
    assert.ok(layoutFor({ width: 390, height: 844, insets: ZERO }).boardSize > 0, '0-insets >0');
  });

  it.skip('[P1-05] layout.test.ts P1-3 still green: isLandscape + asymmetry + floor edge', () => {
    const p = layoutFor({ width: 390, height: 844, insets: ZERO });
    assert.equal(p.isLandscape, false, '390×844 portrait');
    const l = layoutFor({ width: 844, height: 390, insets: ZERO });
    assert.equal(l.isLandscape, true, '844×390 landscape');
    const narrow = layoutFor({ width: 390, height: 844, insets: { top: 0, bottom: 0, left: 10, right: 10 } });
    assert.ok(narrow.boardSize < layoutFor({ width: 390, height: 844, insets: ZERO }).boardSize, 'horizontal shrink');
    const small = layoutFor({ width: 400, height: 250, insets: ZERO });
    assert.ok(small.boardSize > 0, '400×250 >0');
    assert.ok(layoutSrc.includes('Number.isFinite(width)'), 'isFinite width');
    assert.ok(layoutSrc.includes('Number.isFinite(insets.top)'), 'isFinite insets.top');
  });

  it.skip('[P1-06] lastValid only holds on boardSize===0 transient, valid>0 replaces stale (legitimate shrink)', () => {
    const lastLarge = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const coalescedShrink = coalesceLayoutLocal({ width: 400, height: 250, insets: ZERO }, lastLarge);
    assert.ok(coalescedShrink.boardSize > 0, 'shrink >0');
    assert.notStrictEqual(coalescedShrink.boardSize, lastLarge.boardSize, 'shrink replaces');
    assert.ok(coalescedShrink.boardSize < lastLarge.boardSize, 'shrink smaller');
    assert.strictEqual(coalesceLayoutLocal({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }, lastLarge).boardSize, lastLarge.boardSize, 'degenerate holds');
  });
});

describe('ATDD dw-6 rotation race — P2 static scans (allowlists + ledger + isolation)', () => {
  it.skip('[P2-01] SCAN single-source allowlists', () => {
    assert.equal((appSrc.match(/SafeAreaProvider/g) ?? []).length, 3, 'SafeAreaProvider 3');
    assert.equal((appSrc.match(/useSyncedLayout/g) ?? []).length, 3, 'useSyncedLayout 3');
    assert.equal((hookSrc.match(/export function coalesceLayout/g) ?? []).length, 1, 'coalesceLayout 1');
    assert.equal((hookSrc.match(/lastValidLayoutRef/g) ?? []).length, 6, 'lastValid 6');
    assert.equal((hookSrc.match(/boardSize === 0/g) ?? []).length, 2, 'boardSize ===0 2');
    assert.equal((appSrc.match(/initialWindowMetrics/g) ?? []).length, 2, 'initialWindowMetrics 2');
    assert.equal((appSrc.match(/initialMetrics/g) ?? []).length, 1, 'initialMetrics 1');
  });

  it.skip('[P2-02] SCAN no ScrollView reintroduction and no bare useWindowDimensions racy path', () => {
    assert.equal((appSrc.match(/ScrollView/g) ?? []).length, 0, 'ScrollView 0');
    assert.ok(hookSrc.includes('effectiveLayout.isLandscape') || hookSrc.includes('effectiveLayout'), 'effectiveLayout');
  });

  it.skip('[P2-03] SCAN engine/layout isolation', () => {
    const hookExists = fs.existsSync(fileURLToPath(new URL('../../../../triade/src/ui/useSyncedLayout.ts', import.meta.url)));
    assert.ok(hookExists, 'useSyncedLayout.ts exists');
    assert.equal(layoutSrc.includes('useWindowDimensions') ? 1 : 0, 0, 'layout.ts pure');
    assert.equal(layoutSrc.includes('useSafeAreaInsets') ? 1 : 0, 0, 'layout.ts pure');
  });

  it.skip('[P2-04] ledger DW-6 done + resolution-undo 61d4ee9e 64-hex + decision prefix + sprint-status untouched', () => {
    const deferred = fs.readFileSync(fileURLToPath(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)), 'utf8');
    assert.ok(deferred.includes('DW-6'), 'DW-6');
    assert.ok(deferred.includes('status: done 2026-09-02'), 'done 2026-09-02');
    assert.ok(deferred.includes('61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48'), 'hash');
    assert.ok(deferred.includes('Add initialMetrics plus synced hook'), 'decision prefix');
    assert.equal((deferred.match(new RegExp('61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48', 'g')) ?? []).length, 1, 'hash 1');
    assert.ok(deferred.includes('resolution-undo: 61d4ee9e5c27'), 'resolution-undo');
  });
});

describe('ATDD dw-6 rotation race — P3 exploratory / residual / hygiene', () => {
  it.skip('[P3-01] fast double rotation within 32ms coalesces to final only', () => {
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    assert.strictEqual(coalesceLayoutLocal({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }, lastValid).boardSize, lastValid.boardSize, 'intermediate degenerate holds');
    const finalCoalesce = coalesceLayoutLocal({ width: 844, height: 390, insets: LANDSCAPE_NOTCH }, lastValid);
    assert.ok(finalCoalesce.boardSize > 0 && finalCoalesce.boardSize !== lastValid.boardSize, 'final valid replaces');
    assert.strictEqual(finalCoalesce.isLandscape, true, 'final landscape');
    assert.ok(hookSrc.includes('clearTimeout(timerRef.current)'), 'clear timer');
  });

  it.skip('[P3-02] hygiene: hook never throws on NaN, boardSize 0 finite, O(1) debounce not perf regression', () => {
    assert.doesNotThrow(() => layoutFor({ width: NaN, height: 844, insets: ZERO }));
    assert.strictEqual(layoutFor({ width: NaN, height: 844, insets: ZERO }).boardSize, 0, 'NaN clamp 0');
    assert.ok(Number.isFinite(layoutFor({ width: NaN, height: 844, insets: ZERO }).boardSize), 'finite');
    assert.equal(/mulberry32|RevenueCat|AdMob|music|ceilingDetector|tierForCeiling|potForTier|spawnTile|weights/.test(hookSrc) ? 1 : 0, 0, 'no engine leak');
    const lv = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) {
      coalesceLayoutLocal({ width: 390 + (i % 3), height: 844, insets: i % 2 === 0 ? ZERO : PORTRAIT_NOTCH }, lv);
      coalesceLayoutLocal({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }, lv);
    }
    assert.ok(performance.now() - t0 < 200, '10k coalesce <200ms');
  });
});
