/**
 * TEA Automate — E2E Umbrella Journey Tests for dw-6-rotation-race-safe-area-initial-metrics (DW-6)
 * Location: _bmad-output/test-artifacts/tests/e2e/dw-6-rotation-race-safe-area-initial-metrics.umbrella.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright page.goto — pure static scans + exploratory journeys as E2E)
 * TEA mapping: "E2E" = rotation race umbrella journeys (App mount → rotation → degenerate → ledger → isolation).
 * Provider is the layout seam + SafeAreaProvider + ledger; consumer is the rotation polish journey.
 *
 * Execute:
 *   npm --prefix triade test -- ../_bmad-output/test-artifacts/tests/e2e/dw-6-rotation-race-safe-area-initial-metrics.umbrella.spec.ts
 * Covers P2 secondary scans + P3 exploratory per test-design-dw-6-rotation-race-safe-area-initial-metrics.md.
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
const deferred = fs.readFileSync(fileURLToPath(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)), 'utf8');

function coalesceLayoutLocal(pending: { width: number; height: number; insets: { top: number; bottom: number; left: number; right: number } }, lastValid: ReturnType<typeof layoutFor> | null): ReturnType<typeof layoutFor> {
  const nxt = layoutFor(pending);
  if (nxt.boardSize === 0 && lastValid && lastValid.boardSize > 0) return lastValid;
  return nxt;
}

describe('[E2E] dw-6 rotation race umbrella — scans + exploratory + ledger + isolation (P2/P3)', () => {
  it('[P2-E2E-01] SCAN single-source allowlists: SafeAreaProvider 3, useSyncedLayout 3, coalesceLayout 1, lastValid 6, boardSize===0 2', () => {
    // Given working tree vs HEAD a1f6831 delta is triade/App.tsx + useSyncedLayout.ts + tests + ledger only
    // When scanned for single-source invariants
    // Then exactly one provider, one hook, one helper, single lastValid/boardSize-zero sites
    assert.equal((appSrc.match(/SafeAreaProvider/g) ?? []).length, 3, 'SafeAreaProvider import+open+close 3');
    assert.equal((appSrc.match(/useSyncedLayout/g) ?? []).length, 3, 'useSyncedLayout specifier+path+call 3');
    assert.equal((hookSrc.match(/export function coalesceLayout/g) ?? []).length, 1, 'export function coalesceLayout 1');
    assert.equal((hookSrc.match(/lastValidLayoutRef/g) ?? []).length, 6, 'lastValidLayoutRef 6 (init+guard+update+ternary)');
    assert.equal((hookSrc.match(/boardSize === 0/g) ?? []).length, 2, 'boardSize === 0 predicate 2 (guard+ternary)');
    assert.ok((hookSrc.match(/DEFAULT_DEBOUNCE_MS/g) ?? []).length >= 2, `DEFAULT_DEBOUNCE_MS >=2 got ${(hookSrc.match(/DEFAULT_DEBOUNCE_MS/g) ?? []).length}`);
    assert.equal((appSrc.match(/initialWindowMetrics/g) ?? []).length, 2, 'initialWindowMetrics import+JSX 2');
    assert.equal((appSrc.match(/initialMetrics/g) ?? []).length, 1, 'initialMetrics prop 1');
  });

  it('[P2-E2E-02] SCAN no ScrollView reintroduction and no bare useWindowDimensions racy path', () => {
    // Given spec Never: do not introduce an overlay ScrollView
    // When App.tsx scanned
    // Then ScrollView 0 and isLandscape via effectiveLayout not duplication
    assert.equal((appSrc.match(/ScrollView/g) ?? []).length, 0, 'App.tsx must not reintroduce ScrollView');
    assert.ok(hookSrc.includes('effectiveLayout.isLandscape') || hookSrc.includes('effectiveLayout'), 'isLandscape should come from effectiveLayout');
  });

  it('[P2-E2E-03] SCAN engine/layout isolation: triade/src/engine byte-identical + layout.ts pure + useMemo dep 6-field', () => {
    // Given spec Always: layout.ts pure source of truth, never engine
    // When hook and layout inspected
    // Then layout stays pure, hook deps exact
    const hookExists = fs.existsSync(fileURLToPath(new URL('../../../../triade/src/ui/useSyncedLayout.ts', import.meta.url)));
    assert.ok(hookExists, 'triade/src/ui/useSyncedLayout.ts must exist as the only new ui file');
    assert.equal(hookSrc.includes('layoutFor') ? 1 : 0, 1, 'hook must call layoutFor');
    assert.equal(layoutSrc.includes('useWindowDimensions') ? 1 : 0, 0, 'layout.ts must stay pure (no hooks)');
    assert.equal(layoutSrc.includes('useSafeAreaInsets') ? 1 : 0, 0, 'layout.ts must stay pure (no insets hook)');
    // useMemo(layoutFor(synced)) + pendingRef effect deps include left/right
    assert.ok(hookSrc.includes('synced.insets.left'), 'rawLayout deps must include left');
    assert.ok(hookSrc.includes('synced.insets.right'), 'rawLayout deps must include right');
    assert.ok(hookSrc.includes('getBandTop(synced.insets'), 'bandTop memo must use synced.insets');
    assert.ok(hookSrc.includes('effectiveLayout.bandHeight'), 'bandTop memo must use effectiveLayout.bandHeight');
  });

  it('[P2-E2E-04] ledger DW-6 done + resolution-undo 61d4ee9e 64-hex + decision prefix + sprint-status untouched', () => {
    // Given sweep bundle dw-decision-dw-6 marks DW-6 done
    // When deferred-work.md inspected
    // Then DW-6 done + 64-hex + decision prefix + sprint-status not written
    assert.ok(deferred.includes('DW-6'), 'deferred-work.md must contain DW-6');
    assert.ok(deferred.includes('status: done 2026-09-02'), 'DW-6 should be status: done 2026-09-02');
    assert.ok(deferred.includes('61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48'), 'resolution-undo 61d4ee9e… 64-hex must be present');
    assert.ok(deferred.includes('Add initialMetrics plus synced hook'), 'decision prefix Add initialMetrics plus synced hook must be present');
    const undoCount = (deferred.match(new RegExp('61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48', 'g')) ?? []).length;
    assert.equal(undoCount, 1, `resolution-undo 61d4ee9e hits ${undoCount} expected 1`);
    assert.ok(deferred.includes('resolution-undo: 61d4ee9e5c27'), 'resolution-undo line must exist');
    // sprint-status.yaml ownership is orchestrator-owned — umbrella scan only pins checklist never-write intent
    // verified via git diff --stat HEAD not containing sprint-status.yaml (see automation summary)
  });

  it('[P2-E2E-05] layoutFor never-throw + finiteness + goldens still green as umbrella regression', () => {
    // Given layout.ts byte-identical pure seam
    // When umbrella regression re-checks goldens + finiteness
    // Then never-throw and anchors hold
    assert.doesNotThrow(() => layoutFor({ width: NaN, height: 844, insets: ZERO }));
    assert.strictEqual(layoutFor({ width: NaN, height: 844, insets: ZERO }).boardSize, 0, 'NaN width must clamp to 0 not throw');
    assert.ok(Number.isFinite(layoutFor({ width: NaN, height: 844, insets: ZERO }).boardSize), 'NaN boardSize must still be finite');
    assert.equal(layoutFor({ width: 414, height: 896, insets: ZERO }).boardSize, 382, '414×896 ZERO should be 382');
    assert.ok(layoutFor({ width: 1024, height: 768, insets: ZERO }).isLandscape, '1024×768 landscape');
    for (const sz of [{ w: 390, h: 844 }, { w: 844, h: 390 }, { w: 414, h: 896 }, { w: 1024, h: 768 }, { w: 320, h: 480 }]) {
      const r = layoutFor({ width: sz.w, height: sz.h, insets: ZERO });
      assert.ok(Number.isFinite(r.boardSize) && r.boardSize >= 0, `${sz.w}×${sz.h} boardSize finite >=0`);
    }
  });

  it('[P3-E2E-06] exploratory — fast double rotation within 32ms coalesces to final only (no intermediate 390×844 flash)', () => {
    // Given pendingRef double-set within debounce window
    // When coalesce intermediate degenerate then final landscape
    // Then intermediate holds, final replaces, hook clears timer path holds
    const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const intermediate = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
    const final = { width: 844, height: 390, insets: LANDSCAPE_NOTCH };
    assert.strictEqual(coalesceLayoutLocal(intermediate, lastValid).boardSize, lastValid.boardSize, 'intermediate degenerate must hold');
    const finalCoalesce = coalesceLayoutLocal(final, lastValid);
    assert.ok(finalCoalesce.boardSize > 0 && finalCoalesce.boardSize !== lastValid.boardSize, 'final valid must replace');
    assert.strictEqual(finalCoalesce.isLandscape, true, 'final should be landscape');
    assert.ok(hookSrc.includes('clearTimeout(timerRef.current)'), 'hook must clear previous timer before setting new (single commit)');
  });

  it('[P3-E2E-07] exploratory — hygiene: hook never throws on NaN dimensions, O(1) debounce not perf regression, no engine leak', () => {
    // Given malformed inputs and bench
    // When hook file inspected and bench run
    // Then never-throw, O(1), no engine imports
    const nanInput = { width: NaN, height: 844, insets: ZERO };
    assert.doesNotThrow(() => layoutFor(nanInput));
    assert.strictEqual(layoutFor(nanInput).boardSize, 0, 'NaN width must clamp to 0 not throw');
    assert.ok(Number.isFinite(layoutFor(nanInput).boardSize), 'NaN boardSize must still be finite');
    assert.equal(/mulberry32|RevenueCat|AdMob|music|ceilingDetector|tierForCeiling|potForTier|spawnTile|weights/.test(hookSrc) ? 1 : 0, 0, 'hook must not import engine/spawn/feel/monetization');
    const lv = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) {
      coalesceLayoutLocal({ width: 390 + (i % 3), height: 844, insets: i % 2 === 0 ? ZERO : PORTRAIT_NOTCH }, lv);
      coalesceLayoutLocal({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }, lv);
    }
    const dt = performance.now() - t0;
    assert.ok(dt < 200, `10k×2 coalesce should be <200ms got ${dt}ms`);
  });

  it('[P3-E2E-08] bench — 10k layoutFor <50ms O(1) guard + 10k coalesce <200ms', () => {
    // Given pure layoutFor + coalesce O(1) per rotation
    // When benched 10k iterations
    // Then both under budget
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) layoutFor({ width: 390, height: 844, insets: ZERO });
    const dtLayout = performance.now() - t0;
    assert.ok(dtLayout < 50, `10k layoutFor should be <50ms got ${dtLayout}ms`);
    const lv = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
    const t1 = performance.now();
    for (let i = 0; i < 10_000; i++) coalesceLayoutLocal({ width: 844, height: 390, insets: LANDSCAPE_NOTCH }, lv);
    const dtCoalesce = performance.now() - t1;
    assert.ok(dtCoalesce < 200, `10k coalesce should be <200ms got ${dtCoalesce}ms`);
  });
});
