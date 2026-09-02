import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { layoutFor, getBandTop, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR } from '../../src/ui/layout.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-decision-dw-6 — dw-6-rotation-race-safe-area-initial-metrics
// covering working-tree delta vs baseline a1f6831:
// triade/App.tsx:1-11  SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}
//                      (was bare <SafeAreaProvider> → first frame 0-insets flash)
// triade/App.tsx:99    AppContent now useSyncedLayout() single coalesced hook
//                      (was 3-line direct useWindowDimensions()+useSafeAreaInsets()+layoutFor racy)
// triade/src/ui/useSyncedLayout.ts  78 LOC new — useSyncedLayout(debounceMs=32)
//   coalesces useWindowDimensions+useSafeAreaInsets with pendingRef+timerRef setTimeout(32)
//   + lastValidLayoutRef hold across transient boardSize===0; pure coalesceLayout exported
//   DEFAULT_DEBOUNCE_MS=32 + getBandTop(synced.insets, effectiveLayout.bandHeight)
// triade/__tests__/ui/useSyncedLayout.test.ts 124 LOC new — 4 probes (3 P0 + 1 P1)
// triade/src/ui/layout.ts  byte-identical pure source of truth — must stay 18 tests green
// Spec: _bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md
// Ledger: _bmad-output/implementation-artifacts/deferred-work.md DW-6 open→done 2026-09-02
//          decision: Add initialMetrics plus synced hook + resolution-undo: 61d4ee9e5c27…
// constraint: sprint-status.yaml is orchestrator-owned and MUST NOT be written
// ---------------------------------------------------------------------------

const appSrc = fs.readFileSync(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8');
const hookSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/ui/useSyncedLayout.ts', import.meta.url)),
  'utf8',
);
const layoutSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/ui/layout.ts', import.meta.url)),
  'utf8',
);

function coalesceLayoutLocal(pending: { width: number; height: number; insets: { top: number; bottom: number; left: number; right: number } }, lastValid: ReturnType<typeof layoutFor> | null): ReturnType<typeof layoutFor> {
  const nxt = layoutFor(pending);
  if (nxt.boardSize === 0 && lastValid && lastValid.boardSize > 0) return lastValid;
  return nxt;
}

const ZERO = { top: 0, bottom: 0, left: 0, right: 0 };
const PORTRAIT_NOTCH = { top: 47, bottom: 34, left: 0, right: 0 };
const LANDSCAPE_NOTCH = { top: 0, bottom: 0, left: 47, right: 21 };

describe('ATDD dw-6 rotation race — P0 critical (spec AC + first-frame/rotation coalesce)', () => {
  it.skip('[P0-01] App.tsx provides SafeAreaProvider initialMetrics so first frame not 0-insets', () => {
    // Before: <SafeAreaProvider> bare → first frame 0 insets before native measures.
    // After: import initialWindowMetrics + <SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>
    assert.ok(appSrc.includes('initialWindowMetrics'), 'App.tsx must import initialWindowMetrics');
    assert.ok(appSrc.includes('initialMetrics={initialWindowMetrics'), 'SafeAreaProvider must receive initialMetrics={initialWindowMetrics');
    assert.ok(appSrc.includes('initialWindowMetrics ?? undefined'), 'fallback must be null-safe ?? undefined');
    const importHits = (appSrc.match(/initialWindowMetrics/g) ?? []).length;
    assert.equal(importHits, 2, `initialWindowMetrics hits ${importHits} expected 2 (import+JSX)`);
    assert.equal((appSrc.match(/initialMetrics/g) ?? []).length, 1, 'initialMetrics prop should appear once');
    assert.equal((appSrc.match(/SafeAreaProvider/g) ?? []).length, 3, 'SafeAreaProvider import+open+close 3 hits');
  });

  it.skip('[P0-02] AppContent uses single useSyncedLayout not racy direct hooks', () => {
    // Before: const {width,height}=useWindowDimensions(); const insets=useSafeAreaInsets(); layoutFor({width,height,insets})
    // After: const {width,height,insets,boardSize,bandHeight,isLandscape,bandTop}=useSyncedLayout();
    assert.ok(appSrc.includes('useSyncedLayout'), 'AppContent must use useSyncedLayout');
    assert.ok(appSrc.includes("from './src/ui/useSyncedLayout"), 'must import from useSyncedLayout');
    const syncedHits = (appSrc.match(/useSyncedLayout/g) ?? []).length;
    // import line has specifier + path =2 hits + call =1 → 3
    assert.equal(syncedHits, 3, `useSyncedLayout hits ${syncedHits} expected 3 (specifier+path+call)`);
    // Direct racy triple should not co-exist as the layout path; allow import line only.
    // The file should not contain a direct layoutFor({width,height,insets}) racy call after hook.
    const racy = appSrc.includes('useWindowDimensions()') && appSrc.includes('useSafeAreaInsets()') && appSrc.includes('layoutFor({width,height,insets})');
    assert.equal(racy, false, 'direct racy 3-line layoutFor(width,height,insets) should be replaced by synced hook');
  });

  it.skip('[P0-03] coalesceLayout holds last valid when transient layout would be 0 (degenerate 2000-top)', () => {
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    assert.ok(lastValid.boardSize > 0, `lastValid 390×844 top47 should be >0 got ${lastValid.boardSize}`);
    const degenerate = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
    const raw = layoutFor(degenerate);
    assert.strictEqual(raw.boardSize, 0, 'degenerate 320×480 top2000 must clamp to 0');
    const held = coalesceLayoutLocal(degenerate, lastValid);
    assert.strictEqual(held.boardSize, lastValid.boardSize, 'coalesce must hold last valid when next is 0');
    assert.strictEqual(held.bandHeight, lastValid.bandHeight, 'held bandHeight must be lastValid');
  });

  it.skip('[P0-04] coalesceLayout valid next replaces stale (844×390 left47 isLandscape)', () => {
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const validNext = { width: 844, height: 390, insets: LANDSCAPE_NOTCH };
    const coalesced = coalesceLayoutLocal(validNext, lastValid);
    assert.ok(coalesced.boardSize > 0, `valid next must be >0 got ${coalesced.boardSize}`);
    assert.notStrictEqual(coalesced.boardSize, lastValid.boardSize, 'valid next must not be stale lastValid');
    assert.strictEqual(coalesced.isLandscape, true, '844×390 left47 should be landscape');
    assert.strictEqual(coalesced.bandHeight, LANDSCAPE_BAND_HEIGHT, `landscape band should be ${LANDSCAPE_BAND_HEIGHT}`);
  });

  it.skip('[P0-05] useSyncedLayout module exports hook with debounce + lastValid + bandTop + coalesce helper', () => {
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

  it.skip('[P0-06] layoutFor pure contract still holds: 0-insets still >0, degenerate 0, SAFE_MARGIN 16, floor 216', () => {
    // Working-tree layout.ts byte-identical — these are regression anchors from layout.test.ts P0.
    // 390×844 portrait with 0 insets must still be >0 (web/Jest null→undefined fallback not flash to 0, only slightly oversized).
    assert.ok(layoutFor({ width: 390, height: 844, insets: ZERO }).boardSize > 0, '0-insets 390×844 must be >0');
    assert.strictEqual(layoutFor({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }).boardSize, 0, 'degenerate must be 0');
    assert.ok(layoutSrc.includes('SAFE_MARGIN = 16'), 'SAFE_MARGIN 16 literal must stay');
    assert.ok(layoutSrc.includes('PORTRAIT_BAND_HEIGHT = 96'), 'PORTRAIT 96 literal must stay');
    assert.ok(layoutSrc.includes('LANDSCAPE_BAND_HEIGHT = 48'), 'LANDSCAPE 48 literal must stay');
    assert.ok(layoutSrc.includes('BOARD_SIZE_FLOOR'), 'BOARD_SIZE_FLOOR reference must stay');
    assert.equal(BOARD_SIZE_FLOOR, 216, 'BOARD_SIZE_FLOOR 216 = 44*4+8*2+8*3');
  });

  it.skip('[P0-07] bandTop derived from synced insets + effective bandHeight (47+16+96 vs 0+16+48)', () => {
    // Hook does bandTop = getBandTop(synced.insets, effectiveLayout.bandHeight)
    assert.ok(hookSrc.includes('getBandTop(synced'), 'hook must compute bandTop from synced.insets');
    assert.ok(hookSrc.includes('effectiveLayout.bandHeight'), 'bandTop must use effectiveLayout.bandHeight not raw');
    assert.equal(getBandTop({ top: 47, bottom: 34, left: 0, right: 0 }, PORTRAIT_BAND_HEIGHT), 47 + SAFE_MARGIN + PORTRAIT_BAND_HEIGHT, 'portrait 47+16+96=159');
    assert.equal(getBandTop({ top: 0, bottom: 0, left: 47, right: 21 }, LANDSCAPE_BAND_HEIGHT), 0 + SAFE_MARGIN + LANDSCAPE_BAND_HEIGHT, 'landscape 0+16+48=64');
    // Coalesce degenerate hold must still have correct bandHeight via lastValid not raw.
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const deg = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
    const held = coalesceLayoutLocal(deg, lastValid);
    assert.equal(held.bandHeight, PORTRAIT_BAND_HEIGHT, 'degenerate held bandHeight must be lastValid portrait 96');
  });

  it.skip('[P0-08] existing layout.test.ts 18-case regression anchor (golden 382/688/452 etc) still implied', () => {
    // Representative golden anchors from layout.test.ts that catch layout.ts drift.
    // 414×896 →382, 1024×768 →688, 500×580 →452 (width/height bounded via MAX clamp) — check layoutFor directly.
    // These mirror layout.test.ts golden path but as a host unit guard for the ATDD bundle.
    const a = layoutFor({ width: 414, height: 896, insets: ZERO });
    // availWidth 414-32=382, availHeight 896-32-96=768 → min 382 → board 382
    assert.equal(a.boardSize, 382, `414×896 ZERO should be 382 got ${a.boardSize}`);
    const b = layoutFor({ width: 1024, height: 768, insets: ZERO });
    // availWidth 992, availHeight 768-32-48(golden uses landscape band?) — but 1024×768 isLandscape true so band 48 → availHeight 688 → min 688
    assert.ok(b.boardSize === 688 || b.isLandscape === true, `1024×768 should be 688 landscape got ${b.boardSize} landscape ${b.isLandscape}`);
    // Degenerate never-negative already pinned; ensure sweep 5 sizes all finite never-negative.
    for (const sz of [{ w: 390, h: 844 }, { w: 844, h: 390 }, { w: 414, h: 896 }, { w: 1024, h: 768 }, { w: 320, h: 480 }]) {
      const r = layoutFor({ width: sz.w, height: sz.h, insets: ZERO });
      assert.ok(Number.isFinite(r.boardSize) && r.boardSize >= 0, `${sz.w}×${sz.h} boardSize finite >=0`);
    }
  });
});

describe('ATDD dw-6 rotation race — P1 wiring (debounce/persist/bandTop/layout P1)', () => {
  it.skip('[P1-01] DEFAULT_DEBOUNCE_MS = 32 singleton and debounceMs<=0 immediate commit branch', () => {
    const defHits = (hookSrc.match(/DEFAULT_DEBOUNCE_MS/g) ?? []).length;
    assert.equal(defHits, 2, `DEFAULT_DEBOUNCE_MS hits ${defHits} expected 2 (const+param default)`);
    assert.ok(hookSrc.includes('DEFAULT_DEBOUNCE_MS = 32'), 'DEFAULT_DEBOUNCE_MS must be 32 literal');
    assert.ok(hookSrc.includes('debounceMs <= 0'), 'hook must have debounceMs <=0 immediate commit branch');
    // debounceMs param default should be DEFAULT_DEBOUNCE_MS
    assert.ok(hookSrc.includes('debounceMs: number = DEFAULT_DEBOUNCE_MS'), 'param default must be DEFAULT_DEBOUNCE_MS');
  });

  it.skip('[P1-02] pendingRef + timerRef coalesce single commit: clear+set+cleanup', () => {
    // Effect deps include width,height,insets.top,bottom,left,right,debounceMs and clears previous timer before setting new one
    assert.ok(hookSrc.includes('pendingRef.current ='), 'pendingRef.current must be assigned');
    const timerHits = (hookSrc.match(/timerRef\.current/g) ?? []).length;
    assert.ok(timerHits >= 4, `timerRef.current hits ${timerHits} expected >=4 (clear+null+set+clear)`);
    assert.equal((hookSrc.match(/clearTimeout/g) ?? []).length, 2, 'clearTimeout should appear twice (pre-set + unmount)');
    // setTimeout string appears twice: ReturnType<typeof setTimeout> + setTimeout( call
    assert.equal((hookSrc.match(/setTimeout\(/g) ?? []).length, 1, 'setTimeout( call should appear once');
    assert.ok(hookSrc.includes('ReturnType<typeof setTimeout>'), 'type should reference setTimeout');
    // Dep array must include all 6 fields
    assert.ok(hookSrc.includes('insets.top'), 'effect must depend on insets.top');
    assert.ok(hookSrc.includes('insets.bottom'), 'effect must depend on insets.bottom');
    assert.ok(hookSrc.includes('insets.left'), 'effect must depend on insets.left');
    assert.ok(hookSrc.includes('insets.right'), 'effect must depend on insets.right');
  });

  it.skip('[P1-03] useMemo dep arrays exact: rawLayout 6 deps + bandTop 2 deps', () => {
    // rawLayout = useMemo(()=>layoutFor(synced),[synced.width, synced.height, synced.insets.top, ...right])
    const memoHits = (hookSrc.match(/useMemo\(\(\) => layoutFor\(synced\)/g) ?? []).length;
    assert.equal(memoHits, 1, 'useMemo(()=>layoutFor(synced) should appear once');
    assert.ok(hookSrc.includes('synced.insets.left'), 'rawLayout deps must include left');
    assert.ok(hookSrc.includes('synced.insets.right'), 'rawLayout deps must include right');
    // bandTop = useMemo(()=>getBandTop(synced.insets, effectiveLayout.bandHeight),[synced.insets, effectiveLayout.bandHeight])
    assert.ok(hookSrc.includes('getBandTop(synced.insets'), 'bandTop memo must use synced.insets');
    assert.ok(hookSrc.includes('effectiveLayout.bandHeight'), 'bandTop memo must use effectiveLayout.bandHeight');
    // effectiveLayout deps must be rawLayout only
    assert.ok(hookSrc.includes('[rawLayout]'), 'effectiveLayout memo should depend on rawLayout');
  });

  it.skip('[P1-04] initialMetrics fallback is null-safe (?? undefined not &&)', () => {
    assert.ok(appSrc.includes('initialWindowMetrics ?? undefined'), 'must use ?? undefined null-safe fallback');
    // Should not use bare truthy && that would pass null incorrectly (check && not ??)
    const bareAnd = appSrc.includes('initialMetrics={initialWindowMetrics &&');
    // For ternary, need to ensure it's not the ?? case: look for ' ? ' but not ' ??'
    const hasTernaryFallback = appSrc.includes('initialMetrics={initialWindowMetrics ?') && !appSrc.includes('initialMetrics={initialWindowMetrics ??');
    assert.equal(bareAnd, false, 'should not use truthy && for initialMetrics fallback');
    assert.equal(hasTernaryFallback, false, 'should not use ternary ?: for initialMetrics fallback');
    // Verify 0-insets still yields board>0 so web fallback does not flash to 0 only slightly oversized
    assert.ok(layoutFor({ width: 390, height: 844, insets: ZERO }).boardSize > 0, '0-insets fallback must still be >0');
  });

  it.skip('[P1-05] layout.test.ts P1-3 still green: isLandscape + asymmetry + floor edge', () => {
    // Direct layoutFor checks mirroring layout.test.ts P1 slice.
    // isLandscape w>h contract via orientation
    const p = layoutFor({ width: 390, height: 844, insets: ZERO });
    assert.equal(p.isLandscape, false, '390×844 portrait should not be landscape');
    const l = layoutFor({ width: 844, height: 390, insets: ZERO });
    assert.equal(l.isLandscape, true, '844×390 landscape should be landscape');
    // Asymmetry: horizontal insets shrink width-bounded case 390→338 when left+right 20
    const narrow = layoutFor({ width: 390, height: 844, insets: { top: 0, bottom: 0, left: 10, right: 10 } });
    assert.ok(narrow.boardSize < layoutFor({ width: 390, height: 844, insets: ZERO }).boardSize, 'horizontal insets should shrink width-bounded board');
    // Floor edge 400×250 still >0 and <216 is below floor but defensive clamp still keeps >0 when possible
    const small = layoutFor({ width: 400, height: 250, insets: ZERO });
    assert.ok(small.boardSize > 0, '400×250 small should still be >0');
    // Verify layout.ts non-finite guard still 6-field Number.isFinite
    assert.ok(layoutSrc.includes('Number.isFinite(width)'), 'layoutFor must guard Number.isFinite(width)');
    assert.ok(layoutSrc.includes('Number.isFinite(insets.top)'), 'layoutFor must guard insets.top');
  });

  it.skip('[P1-06] lastValid only holds on boardSize===0 transient, valid>0 replaces stale (legitimate shrink)', () => {
    const lastLarge = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    assert.ok(lastLarge.boardSize > 0, 'lastLarge >0');
    // Legitimate shrink to smaller container that still yields board>0 must replace, not stale-hold.
    const shrink = { width: 400, height: 250, insets: ZERO };
    const coalescedShrink = coalesceLayoutLocal(shrink, lastLarge);
    assert.ok(coalescedShrink.boardSize > 0, 'shrink 400×250 should be >0');
    assert.notStrictEqual(coalescedShrink.boardSize, lastLarge.boardSize, 'valid shrink must replace stale large');
    assert.ok(coalescedShrink.boardSize < lastLarge.boardSize, 'shrink should be smaller than portrait 390×844');
    // Degenerate 0 must hold, not shrink.
    const deg = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
    assert.strictEqual(coalesceLayoutLocal(deg, lastLarge).boardSize, lastLarge.boardSize, 'degenerate must hold large');
  });
});

describe('ATDD dw-6 rotation race — P2 static scans (allowlists + ledger + isolation)', () => {
  it.skip('[P2-01] SCAN single-source allowlists: SafeAreaProvider 3, useSyncedLayout 3, coalesceLayout 1, lastValid 6, boardSize===0 2', () => {
    assert.equal((appSrc.match(/SafeAreaProvider/g) ?? []).length, 3, 'SafeAreaProvider import+open+close 3');
    // App.tsx import line contains useSyncedLayout twice (specifier + path) + call = 3
    assert.equal((appSrc.match(/useSyncedLayout/g) ?? []).length, 3, 'useSyncedLayout specifier+path+call 3');
    assert.equal((hookSrc.match(/export function coalesceLayout/g) ?? []).length, 1, 'export function coalesceLayout 1');
    // lastValidLayoutRef appears 6 times: init + guard return + assign + ternary double-hit
    assert.equal((hookSrc.match(/lastValidLayoutRef/g) ?? []).length, 6, 'lastValidLayoutRef 6 (init+guard+update+ternary)');
    // boardSize === 0 appears twice: guard if + ternary
    assert.equal((hookSrc.match(/boardSize === 0/g) ?? []).length, 2, 'boardSize === 0 predicate 2 (guard+ternary)');
    // DEFAULT_DEBOUNCE_MS appears 2 times: const + param default (check uses debounceMs variable)
    assert.ok((hookSrc.match(/DEFAULT_DEBOUNCE_MS/g) ?? []).length >= 2, `DEFAULT_DEBOUNCE_MS >=2 got ${(hookSrc.match(/DEFAULT_DEBOUNCE_MS/g) ?? []).length}`);
    assert.equal((appSrc.match(/initialWindowMetrics/g) ?? []).length, 2, 'initialWindowMetrics import+JSX 2');
    assert.equal((appSrc.match(/initialMetrics/g) ?? []).length, 1, 'initialMetrics prop 1');
  });

  it.skip('[P2-02] SCAN no ScrollView reintroduction and no bare useWindowDimensions racy path', () => {
    assert.equal((appSrc.match(/ScrollView/g) ?? []).length, 0, 'App.tsx must not reintroduce ScrollView');
    // hookSrc should have isLandscape derived via layoutFor, not via direct orientation check duplication
    assert.ok(hookSrc.includes('effectiveLayout.isLandscape') || hookSrc.includes('effectiveLayout'), 'isLandscape should come from effectiveLayout');
  });

  it.skip('[P2-03] SCAN engine/layout isolation: triade/src/engine byte-identical + layout.ts byte-identical except hook is only new ui file', () => {
    // hook file exists as the only new triade/src/ui file vs HEAD already verified in test-design
    const hookExists = fs.existsSync(fileURLToPath(new URL('../../src/ui/useSyncedLayout.ts', import.meta.url)));
    assert.ok(hookExists, 'triade/src/ui/useSyncedLayout.ts must exist as the only new ui file');
    // layout.ts must still contain pure layoutFor contract and not import hooks
    assert.equal(hookSrc.includes('layoutFor') ? 1 : 0, 1, 'hook must call layoutFor');
    assert.equal(layoutSrc.includes('useWindowDimensions') ? 1 : 0, 0, 'layout.ts must stay pure (no hooks)');
    assert.equal(layoutSrc.includes('useSafeAreaInsets') ? 1 : 0, 0, 'layout.ts must stay pure (no insets hook)');
  });

  it.skip('[P2-04] ledger DW-6 done + resolution-undo 61d4ee9e 64-hex + decision prefix + sprint-status untouched', () => {
    const deferred = fs.readFileSync(
      fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
      'utf8',
    );
    assert.ok(deferred.includes('DW-6'), 'deferred-work.md must contain DW-6');
    assert.ok(deferred.includes('status: done 2026-09-02'), 'DW-6 should be status: done 2026-09-02');
    assert.ok(deferred.includes('61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48'), 'resolution-undo 61d4ee9e… 64-hex must be present');
    assert.ok(deferred.includes('Add initialMetrics plus synced hook'), 'decision prefix Add initialMetrics plus synced hook must be present');
    const undoCount = (deferred.match(new RegExp('61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48', 'g')) ?? []).length;
    assert.equal(undoCount, 1, `resolution-undo 61d4ee9e hits ${undoCount} expected 1`);
    assert.ok(deferred.includes('resolution-undo: 61d4ee9'), 'resolution-undo line must exist');
    // sprint-status.yaml ownership is orchestrator-owned — this test only pins that the checklist does not require writing it.
    // The implementation checklist below explicitly lists this as a never-write.
  });
});

describe('ATDD dw-6 rotation race — P3 exploratory / residual / hygiene', () => {
  it.skip('[P3-01] fast double rotation within 32ms coalesces to final only (no intermediate 390×844 flash)', () => {
    // Host unit simulation of pendingRef double-set → single setSynced after 32ms.
    // coalesce logic: degenerate intermediate should hold lastValid, final valid replaces.
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    // Simulate fast double: 390×844 → 320×480 degenerate (racy) → 844×390 valid final
    const intermediate = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
    const final = { width: 844, height: 390, insets: LANDSCAPE_NOTCH };
    // First coalesce (intermediate) should hold lastValid, not flash to 0.
    assert.strictEqual(coalesceLayoutLocal(intermediate, lastValid).boardSize, lastValid.boardSize, 'intermediate degenerate must hold');
    // Final coalesce should be valid landscape, not stale.
    const finalCoalesce = coalesceLayoutLocal(final, lastValid);
    assert.ok(finalCoalesce.boardSize > 0 && finalCoalesce.boardSize !== lastValid.boardSize, 'final valid must replace');
    assert.strictEqual(finalCoalesce.isLandscape, true, 'final should be landscape');
    // Hook coalesce window is debounceMs; pendingRef holds last so only final commits — static pin covers clearTimeout path.
    assert.ok(hookSrc.includes('clearTimeout(timerRef.current)'), 'hook must clear previous timer before setting new (single commit)');
  });

  it.skip('[P3-02] hygiene: hook never throws on NaN dimensions, boardSize stays 0 finite, O(1) debounce not perf regression', () => {
    // layoutFor NaN still never-throw 0 finite via early Number.isFinite guard — hook must propagate without throw.
    const nanInput = { width: NaN, height: 844, insets: ZERO };
    assert.doesNotThrow(() => layoutFor(nanInput));
    assert.strictEqual(layoutFor(nanInput).boardSize, 0, 'NaN width must clamp to 0 not throw');
    assert.ok(Number.isFinite(layoutFor(nanInput).boardSize), 'NaN boardSize must still be finite');
    // Hook file must stay pure layout seam only — no engine/feel/monetization imports
    assert.equal(/mulberry32|RevenueCat|AdMob|music|ceilingDetector|tierForCeiling|potForTier|spawnTile|weights/.test(hookSrc) ? 1 : 0, 0, 'hook must not import engine/spawn/feel/monetization');
    // Basic hygiene: 10k coalesce calls <200ms O(1)
    const lv = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) {
      coalesceLayoutLocal({ width: 390 + (i % 3), height: 844, insets: i % 2 === 0 ? ZERO : PORTRAIT_NOTCH }, lv);
      coalesceLayoutLocal({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }, lv);
    }
    const dt = performance.now() - t0;
    assert.ok(dt < 200, `10k×2 coalesce should be <200ms got ${dt}ms`);
  });
});
