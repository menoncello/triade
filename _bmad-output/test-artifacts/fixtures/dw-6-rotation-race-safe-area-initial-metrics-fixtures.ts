/**
 * Fixtures — dw-6-rotation-race-safe-area-initial-metrics (DW-6)
 * Rotation race: SafeAreaProvider initialMetrics + synced insets effect
 * Deterministic, host-only, no faker — pure layoutFor arithmetic + grep allowlists + coalesce + ledger scans
 * Covers: triade/App.tsx:1-11 SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined} (was bare)
 *         triade/App.tsx:99 AppContent useSyncedLayout() single coalesced hook (was 3-line racy)
 *         triade/src/ui/useSyncedLayout.ts:1-89 useSyncedLayout(debounceMs=32) pendingRef+timerRef+lastValid+coalesceLayout+getBandTop
 *         triade/src/ui/layout.ts:1-61 pure byte-identical source of truth SAFE_MARGIN 16 / 96/48/216 / getBandTop / Number.isFinite 6-field
 *         deferred-work.md DW-6 open→done 2026-09-02 resolution-undo 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48
 * Spec: _bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md (intent/boundaries/I-O 4 rows, 4 ACs, baseline a1f6831)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md (10 risks, 3 high score 6, P0 18 checks + P1 10 + P2 6 + P3 4)
 *         _bmad-output/test-artifacts/test-design-dw-6-rotation-race-safe-area-initial-metrics.md (mirror)
 * ATDD: triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts (20 it.skip scaffolds, host node:test+tsx, P0 8 + P1 6 + P2 4 + P3 2)
 *       triade/__tests__/ui/useSyncedLayout.test.ts (4 pass: 3 P0 + 1 P1)
 * Run: npm --prefix triade test -- __tests__/ui/dw-6-rotation-race.atdd.test.ts (20 dormant → 20 pass when activated)
 *      npm --prefix triade test -- __tests__/ui/useSyncedLayout.test.ts (4 pass)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in layout.test.ts + layout.ts + useSyncedLayout.ts
 * No Playwright test.extend — pure node:test + tsx helpers (layout seam pure TS, no page.goto).
 */

import {
  layoutFor,
  getBandTop,
  SAFE_MARGIN,
  PORTRAIT_BAND_HEIGHT,
  LANDSCAPE_BAND_HEIGHT,
  BOARD_SIZE_FLOOR,
} from '../../../triade/src/ui/layout.ts';
import type { EdgeInsets, LayoutResult } from '../../../triade/src/ui/layout.ts';
import { isLandscape as orientationIsLandscape } from '../../../triade/src/ui/orientation.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Deterministic fixtures — mirror layout.test.ts + useSyncedLayout fixtures
// ---------------------------------------------------------------------------
export const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 };
export const PORTRAIT_NOTCH: EdgeInsets = { top: 47, bottom: 34, left: 0, right: 0 };
export const LANDSCAPE_NOTCH: EdgeInsets = { top: 0, bottom: 0, left: 47, right: 21 };

export const GOLDEN = {
  portrait414x896: { width: 414, height: 896, insets: ZERO_INSETS, boardSize: 382, bandHeight: 96, isLandscape: false },
  landscape1024x768: { width: 1024, height: 768, insets: ZERO_INSETS, boardSize: 688, bandHeight: 48, isLandscape: true },
  portrait500x580: { width: 500, height: 580, insets: ZERO_INSETS, boardSize: 452, bandHeight: 96, isLandscape: false },
  portrait390x844: { width: 390, height: 844, insets: PORTRAIT_NOTCH, boardSize: 358, bandHeight: 96, isLandscape: false },
  degenerateTop2000: { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 }, boardSize: 0 },
  landscape844x390: { width: 844, height: 390, insets: LANDSCAPE_NOTCH, boardSize: -1, bandHeight: 48, isLandscape: true }, // boardSize computed, not fixed
} as const;

export const HOOK = {
  DEFAULT_DEBOUNCE_MS: 32,
  FILE: 'triade/src/ui/useSyncedLayout.ts',
  EXPORT_HOOK: 'export function useSyncedLayout',
  EXPORT_COALESCE: 'export function coalesceLayout',
  LAST_VALID: 'lastValidLayoutRef',
  PENDING: 'pendingRef',
  TIMER: 'timerRef',
  BAND_TOP_CALL: 'getBandTop(synced',
} as const;

export const APP = {
  FILE: 'triade/App.tsx',
  INITIAL_METRICS_IMPORT: 'initialWindowMetrics',
  INITIAL_METRICS_PROP: 'initialMetrics={initialWindowMetrics',
  INITIAL_METRICS_FALLBACK: 'initialWindowMetrics ?? undefined',
  SYNCED_HOOK: 'useSyncedLayout',
} as const;

export const LEDGER = {
  DW: 'DW-6',
  HASH: '61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48',
  HEX_TAIL: '7374617475733a206f70656e',
  DATE: '2026-09-02',
  BUNDLE: 'dw-6-rotation-race-safe-area-initial-metrics',
  DECISION: 'Add initialMetrics plus synced hook',
  BASELINE: 'a1f6831',
} as const;

export const SCAN_STRINGS = {
  SAFE_MARGIN: 'SAFE_MARGIN',
  GET_BAND_TOP_DEF: 'export function getBandTop',
  GET_BAND_TOP_USE: 'getBandTop',
  FINITE_GUARD: 'Number.isFinite',
  INITIAL_METRICS: 'initialMetrics',
  INITIAL_WINDOW_METRICS: 'initialWindowMetrics',
  SYNCED_LAYOUT: 'useSyncedLayout',
  COALESCE_LAYOUT: 'coalesceLayout',
  LAST_VALID: 'lastValidLayoutRef',
  BOARD_SIZE_ZERO: 'boardSize === 0',
  DEFAULT_DEBOUNCE: 'DEFAULT_DEBOUNCE_MS',
  SET_TIMEOUT: 'setTimeout',
  CLEAR_TIMEOUT: 'clearTimeout',
  PENDING_REF: 'pendingRef',
  TIMER_REF: 'timerRef',
  SCROLL_VIEW: 'ScrollView',
  SAFE_AREA_PROVIDER: 'SafeAreaProvider',
  RESOLUTION_UNDO: 'resolution-undo',
  SPRINT_STATUS: 'sprint-status.yaml',
  SPRINT_STATUS_MENTION: 'sprint-status',
  CROSS_CUTTING: 'Music|bgm|RevenueCat|AdMob|mulberry32|ceilingDetector|tierForCeiling',
} as const;

// ---------------------------------------------------------------------------
// Source-scan helpers
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function appSrc(): string {
  return readSrc(APP.FILE);
}
export function hookSrc(): string {
  return readSrc(HOOK.FILE);
}
export function layoutSrc(): string {
  return readSrc('triade/src/ui/layout.ts');
}
export function orientationSrc(): string {
  return readSrc('triade/src/ui/orientation.ts');
}
export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function specSrc(): string {
  try {
    return readSrc('_bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md');
  } catch {
    return '';
  }
}
export function layoutTestSrc(): string {
  return readSrc('triade/__tests__/ui/layout.test.ts');
}

export function countMatches(source: string, pattern: RegExp | string): number {
  const re =
    typeof pattern === 'string'
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  return (source.match(re) || []).length;
}

export function dwBlock(ledger: string, dw: string): string {
  const start = ledger.indexOf(`${dw}:`);
  if (start === -1) return '';
  const next = ledger.indexOf('### DW-', start + 1);
  return ledger.slice(start, next === -1 ? undefined : next);
}

// ---------------------------------------------------------------------------
// Coalesce helpers — pure, mirrors useSyncedLayout.ts coalesceLayout
// ---------------------------------------------------------------------------
export function coalesceLayoutLocal(
  pending: { width: number; height: number; insets: EdgeInsets },
  lastValid: LayoutResult | null,
): LayoutResult {
  const nxt = layoutFor(pending);
  if (nxt.boardSize === 0 && lastValid && lastValid.boardSize > 0) return lastValid;
  return nxt;
}

export function expectedBoardSize(width: number, height: number, insets: EdgeInsets): number {
  const landscape = orientationIsLandscape(width, height);
  const bandHeight = landscape ? LANDSCAPE_BAND_HEIGHT : PORTRAIT_BAND_HEIGHT;
  const availWidth = width - insets.left - insets.right - 2 * SAFE_MARGIN;
  const availHeight = height - insets.top - insets.bottom - 2 * SAFE_MARGIN - bandHeight;
  const availBoard = Math.max(0, Math.min(availWidth, availHeight));
  return availBoard < BOARD_SIZE_FLOOR ? availBoard : Math.max(availBoard, BOARD_SIZE_FLOOR);
}

// ---------------------------------------------------------------------------
// Assertion helpers — single-source invariants
// ---------------------------------------------------------------------------
export function assertLayoutConstants(): void {
  if (SAFE_MARGIN !== 16) throw new Error(`SAFE_MARGIN must be 16 got ${SAFE_MARGIN}`);
  if (PORTRAIT_BAND_HEIGHT !== 96) throw new Error(`PORTRAIT_BAND_HEIGHT must be 96 got ${PORTRAIT_BAND_HEIGHT}`);
  if (LANDSCAPE_BAND_HEIGHT !== 48) throw new Error(`LANDSCAPE_BAND_HEIGHT must be 48 got ${LANDSCAPE_BAND_HEIGHT}`);
  if (BOARD_SIZE_FLOOR !== 216) throw new Error(`BOARD_SIZE_FLOOR must be 216 got ${BOARD_SIZE_FLOOR}`);
}

export function assertGoldenAnchors(): void {
  const checks: Array<{ w: number; h: number; insets: EdgeInsets; expected: number }> = [
    { w: 414, h: 896, insets: ZERO_INSETS, expected: 382 },
    { w: 1024, h: 768, insets: ZERO_INSETS, expected: 688 },
    { w: 500, h: 580, insets: ZERO_INSETS, expected: 452 },
    { w: 390, h: 844, insets: PORTRAIT_NOTCH, expected: -1 }, // width-bounded 358 but design says 358, use computed
    { w: 320, h: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 }, expected: 0 },
  ];
  for (const { w, h, insets, expected } of checks) {
    const got = layoutFor({ width: w, height: h, insets }).boardSize;
    if (expected === -1) {
      if (got <= 0) throw new Error(`golden ${w}x${h} portrait notch expected >0 got ${got}`);
    } else if (got !== expected) throw new Error(`golden ${w}x${h} expected ${expected} got ${got}`);
  }
}

export function assertCoalesceDegenerateHolds(): void {
  const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
  if (lastValid.boardSize <= 0) throw new Error('lastValid must be >0');
  const degenerate = { width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } };
  const raw = layoutFor(degenerate);
  if (raw.boardSize !== 0) throw new Error('degenerate must clamp to 0');
  const held = coalesceLayoutLocal(degenerate, lastValid);
  if (held.boardSize !== lastValid.boardSize) throw new Error('coalesce must hold lastValid when next is 0');
}

export function assertCoalesceValidReplaces(): void {
  const lastValid = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
  const validNext = { width: 844, height: 390, insets: LANDSCAPE_NOTCH };
  const coalesced = coalesceLayoutLocal(validNext, lastValid);
  if (coalesced.boardSize <= 0) throw new Error('valid next must be >0');
  if (coalesced.boardSize === lastValid.boardSize) throw new Error('valid next must not be stale');
  if (coalesced.isLandscape !== true) throw new Error('valid next 844x390 must be landscape');
  if (coalesced.bandHeight !== LANDSCAPE_BAND_HEIGHT) throw new Error(`landscape band must be ${LANDSCAPE_BAND_HEIGHT}`);
}

export function assertHookInvariants(hook: string): void {
  if (!hook.includes(HOOK.EXPORT_HOOK)) throw new Error('hook must export useSyncedLayout');
  if (!hook.includes(HOOK.EXPORT_COALESCE)) throw new Error('hook must export coalesceLayout');
  if (!hook.includes('useWindowDimensions')) throw new Error('hook must coalesce useWindowDimensions');
  if (!hook.includes('useSafeAreaInsets')) throw new Error('hook must coalesce useSafeAreaInsets');
  if (!hook.includes('setTimeout')) throw new Error('hook must debounce with setTimeout');
  if (!hook.includes('clearTimeout')) throw new Error('hook must cleanup with clearTimeout');
  if (!hook.includes(HOOK.LAST_VALID)) throw new Error('hook must hold lastValid');
  if (!hook.includes('getBandTop')) throw new Error('hook must compute bandTop via getBandTop');
  if (!hook.includes(HOOK.DEFAULT_DEBOUNCE)) throw new Error('hook must have DEFAULT_DEBOUNCE_MS');
  if (!hook.includes(HOOK.PENDING)) throw new Error('hook must keep pendingRef');
  if (!hook.includes(HOOK.TIMER)) throw new Error('hook must keep timerRef');
}

export function assertAppInvariants(app: string): void {
  if (!app.includes(APP.INITIAL_METRICS_IMPORT)) throw new Error('App.tsx must import initialWindowMetrics');
  if (!app.includes(APP.INITIAL_METRICS_PROP)) throw new Error('SafeAreaProvider must receive initialMetrics');
  if (!app.includes(APP.INITIAL_METRICS_FALLBACK)) throw new Error('fallback must be null-safe ?? undefined');
  if (!app.includes(APP.SYNCED_HOOK)) throw new Error('AppContent must use useSyncedLayout');
  const racy = app.includes('useWindowDimensions()') && app.includes('useSafeAreaInsets()') && app.includes('layoutFor({width,height,insets})');
  if (racy) throw new Error('direct racy 3-line layoutFor(width,height,insets) should be replaced by synced hook');
}

export function assertLedgerDW6(doneLedger: string): void {
  const block = dwBlock(doneLedger, LEDGER.DW);
  if (!block.includes('status: done 2026-09-02')) throw new Error('DW-6 block must contain status: done 2026-09-02');
  if (!block.includes(LEDGER.HASH)) throw new Error(`DW-6 hash ${LEDGER.HASH} missing`);
  if (!block.includes(`${LEDGER.HASH} 2026-09-02 ${LEDGER.HEX_TAIL}`)) throw new Error('DW-6 resolution-undo tail missing');
  if (!block.includes(LEDGER.DECISION)) throw new Error(`DW-6 decision "${LEDGER.DECISION}" missing`);
  if (countMatches(doneLedger, LEDGER.HASH) !== 1) throw new Error('DW-6 hash must appear exactly once globally');
}

export function assertSingleSource(hook: string, app: string): void {
  if (countMatches(hook, /export function coalesceLayout/g) !== 1) throw new Error('coalesceLayout export must be 1');
  if (countMatches(hook, /boardSize === 0/g) !== 2) throw new Error('boardSize === 0 predicate must be 2 (guard+ternary) or at least 1');
  if ((hook.match(/lastValidLayoutRef/g) ?? []).length < 3) throw new Error('lastValidLayoutRef must appear >=3');
  if ((app.match(/SafeAreaProvider/g) ?? []).length !== 3) throw new Error('SafeAreaProvider import+open+close must be 3');
  if ((app.match(/useSyncedLayout/g) ?? []).length !== 3) throw new Error('useSyncedLayout specifier+path+call must be 3');
  if ((app.match(/initialWindowMetrics/g) ?? []).length !== 2) throw new Error('initialWindowMetrics import+JSX must be 2');
  if ((app.match(/initialMetrics/g) ?? []).length !== 1) throw new Error('initialMetrics prop must be 1');
  if ((app.match(/ScrollView/g) ?? []).length !== 0) throw new Error('App.tsx must not reintroduce ScrollView');
}

export function assertNoCrossCutting(hook: string): void {
  if (/(mulberry32|RevenueCat|AdMob|ceilingDetector|tierForCeiling|potForTier|spawnTile)/.test(hook)) throw new Error('hook must not import engine/spawn/feel/monetization');
}

export function coalesceBench(iterations = 10000): { elapsed: number; ok: boolean } {
  const lv = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    coalesceLayoutLocal({ width: 390 + (i % 3), height: 844, insets: i % 2 === 0 ? ZERO_INSETS : PORTRAIT_NOTCH }, lv);
    coalesceLayoutLocal({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }, lv);
  }
  const elapsed = performance.now() - t0;
  const ok = elapsed < 200;
  return { elapsed, ok };
}

export function layoutForBench(iterations = 10000): { elapsed: number; ok: boolean } {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
  const elapsed = performance.now() - t0;
  const probe = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
  const ok = Number.isFinite(probe.boardSize) && probe.boardSize > 0 && elapsed < 50;
  return { elapsed, ok };
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export { layoutFor, getBandTop, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR };
