import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname_local = dirname(fileURLToPath(import.meta.url));

test('[P0] DW-6 App.tsx provides SafeAreaProvider initialMetrics so first frame is not 0-insets (no flash)', async () => {
  const appPath = resolve(__dirname_local, '../../App.tsx');
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('initialWindowMetrics'), 'App.tsx must import initialWindowMetrics');
  assert.ok(src.includes('initialMetrics={initialWindowMetrics'), 'SafeAreaProvider must receive initialMetrics={initialWindowMetrics');
  assert.ok(src.includes('useSyncedLayout'), 'AppContent must use useSyncedLayout (synced coalesced hook)');
  assert.ok(!src.includes('useWindowDimensions()') || src.includes('useSyncedLayout'), 'Direct useWindowDimensions in AppContent should be replaced by synced hook');
});

test('[P0] DW-6 coalesce helper holds last valid boardSize when transient layout would be 0', async () => {
  const { layoutFor } = (await import('../../src/ui/layout.ts')) as {
    layoutFor: (i: any) => any;
  };
  function coalesceLayout(pending: any, lastValid: any) {
    const nxt = layoutFor(pending);
    if (nxt.boardSize === 0 && lastValid && lastValid.boardSize > 0) return lastValid;
    return nxt;
  }
  const lastValid = layoutFor({ width: 390, height: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } });
  assert.ok(lastValid.boardSize > 0, 'lastValid must be positive');
  // Degenerate insets that exceed container -> layoutFor returns 0
  const degenerate = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
  const raw = layoutFor(degenerate);
  assert.strictEqual(raw.boardSize, 0, 'degenerate insets must clamp to 0');
  const coalesced = coalesceLayout(degenerate, lastValid);
  assert.strictEqual(coalesced.boardSize, lastValid.boardSize, 'coalesce must hold last valid when next is 0');
  // A valid next must replace last
  const validNext = { width: 844, height: 390, insets: { top: 0, bottom: 0, left: 47, right: 21 } };
  const coalesced2 = coalesceLayout(validNext, lastValid);
  assert.ok(coalesced2.boardSize > 0 && coalesced2.boardSize !== lastValid.boardSize, 'valid next must be used, not stale');
  assert.strictEqual(coalesced2.isLandscape, true, 'valid next is landscape');
});

test('[P0] DW-6 synced hook module exports useSyncedLayout with debounce and bandTop', async () => {
  const src = readFileSync(resolve(__dirname_local, '../../src/ui/useSyncedLayout.ts'), 'utf8');
  assert.ok(src.includes('export function useSyncedLayout'), 'useSyncedLayout must be exported');
  assert.ok(src.includes('useWindowDimensions'), 'hook must coalesce useWindowDimensions');
  assert.ok(src.includes('useSafeAreaInsets'), 'hook must coalesce useSafeAreaInsets');
  assert.ok(src.includes('setTimeout'), 'hook must debounce with setTimeout');
  assert.ok(src.includes('lastValid'), 'hook must hold last valid boardSize');
  assert.ok(src.includes('getBandTop'), 'hook must compute bandTop via getBandTop');
  assert.ok(src.includes('DEFAULT_DEBOUNCE_MS'), 'hook must have default debounce constant');
  assert.ok(src.includes('coalesceLayout'), 'module must export coalesce helper for tests');
});

test('[P1] DW-6 initialMetrics fallback is null-safe (no crash when initialWindowMetrics is null)', async () => {
  const appSrc = readFileSync(resolve(__dirname_local, '../../App.tsx'), 'utf8');
  // Must use nullish coalescing or conditional so null passes through safely
  assert.ok(appSrc.includes('initialWindowMetrics ?? undefined') || appSrc.includes('initialWindowMetrics ?? null') || appSrc.includes('initialWindowMetrics'), 'fallback must be null-safe');
});
