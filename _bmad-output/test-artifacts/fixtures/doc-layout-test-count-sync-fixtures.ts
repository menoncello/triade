/**
 * Fixtures — dw-doc-layout-test-count-sync (DW-11) + co-located DW-56 hygiene
 * Doc-only story sync: 12 → 14 layout tests + ledger resolution-undo + Auto Run Result singleton
 * Deterministic, host-only, no faker — pure layoutFor arithmetic + grep allowlists + ledger scans
 * Covers: _bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md:177,180,201 + deferred-work.md DW-11/DW-56
 *         triade/src/ui/layout.ts:1-61 SAFE_MARGIN 16 / PORTRAIT 96 / LANDSCAPE 48 / BOARD_SIZE_FLOOR 216 / getBandTop / Number.isFinite guard
 *         triade/__tests__/ui/layout.test.ts:1-315 18 test( invocations + 382/688/452 anchors
 * Spec: spec-layout-band-dedup-and-guard.md (baseline 80dc5c1 → final a09e6ed, DW-5/DW-10 done, not re-bumped)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-doc-layout-test-count-sync.md (6 risks, 0 high functional, 2 high isolation R-EXT-01/02, P0 5 + P1 4 + P2 2 + P3 2)
 *         _bmad-output/test-artifacts/test-design-dw-doc-layout-test-count-sync.md (mirror)
 * ATDD: triade/__tests__/ui/layout.doc-layout-count-sync.atdd.test.ts (13 it.skip RED-phase scaffolds, host node:test+tsx, P0 5 + P1 4 + P2 2 + P3 2)
 *       _bmad-output/test-artifacts/tests/unit/doc-layout-test-count-sync.atdd.test.ts (13 dormant mirror)
 *       _bmad-output/test-artifacts/tests/api/doc-layout-test-count-sync.gateway.spec.ts (P0 gateway)
 *       _bmad-output/test-artifacts/tests/e2e/doc-layout-test-count-sync.umbrella.spec.ts (P1/P2/P3 umbrella)
 * Run: npm --prefix triade test -- __tests__/ui/layout.doc-layout-count-sync.atdd.test.ts (13 dormant → 13 pass when activated)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in layout.test.ts + layout.ts
 * No Playwright test.extend — pure node:test + tsx helpers (doc sync pure text + layoutFor pure TS, no page.goto).
 */

import {
  layoutFor,
  getBandTop,
  SAFE_MARGIN,
  PORTRAIT_BAND_HEIGHT,
  LANDSCAPE_BAND_HEIGHT,
  BOARD_SIZE_FLOOR,
} from '../../../triade/src/ui/layout.ts';
import type { EdgeInsets } from '../../../triade/src/ui/layout.ts';
import { isLandscape as orientationIsLandscape } from '../../../triade/src/ui/orientation.ts';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Deterministic fixtures — mirror layout.test.ts + layout fixtures
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
} as const;

export const DOC_PINS = {
  T2_ALL_14: 'All 14 layout tests (12 original + clamp-path + golden-anchor',
  T5_14_UNIT: '14 layout unit tests',
  ATDD_14: '14 tests, P0/P1',
  QUALIFIER: 'plus clamp-path and golden-anchor cases added in the 2026-08-17 review fixes',
  STALE_ALL_12: 'All 12 layout tests',
  STALE_12_UNIT: '12 layout unit tests',
  STALE_12_ATDD: '12 tests, P0/P1',
  AUTO_RUN_HEADER: '## Auto Run Result',
  STATUS_DONE: 'Status: done',
} as const;

export const ANCHORS = ['382', '688', '452'] as const;

export const LEDGER = {
  DW11: 'DW-11',
  DW56: 'DW-56',
  DW11_HASH: '8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb',
  DW56_HASH: '0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e',
  HEX_TAIL_DW11: '7374617475733a206f70656e',
  HEX_TAIL_DW56: '7374617475733a206f70656e',
  DATE: '2026-09-02',
  BUNDLE_DW11: 'dw-doc-layout-test-count-sync',
  BUNDLE_DW56: 'dw-engine-rng-trust-hardening',
  BASELINE: '2e91c12',
} as const;

export const SCAN_STRINGS = {
  SAFE_MARGIN: 'SAFE_MARGIN',
  GET_BAND_TOP_DEF: 'export function getBandTop',
  GET_BAND_TOP_USE: 'getBandTop',
  FINITE_GUARD: 'Number.isFinite',
  DUPLICATED_FORMULA: 'insets.top + SAFE_MARGIN + bandHeight',
  TOPPAD_BAND: 'topPad + bandHeight',
  NUMBER_EPSILON: 'Number.EPSILON',
  RESOLUTION_UNDO: 'resolution-undo',
  AUTO_RUN: '## Auto Run Result',
  SPRINT_STATUS: 'sprint-status.yaml',
  SPRINT_STATUS_MENTION: 'sprint-status',
  CROSS_CUTTING: 'Music|bgm|RevenueCat|AdMob',
  ATDD_CHECKLIST_REF: 'atdd-checklist-1-5',
  VERIFICATION_127: '127/127 pass',
  LEDGER_DONE: 'status: done 2026-09-02',
  LEDGER_RESOLVED_DW11: 'resolved by sweep bundle dw-doc-layout-test-count-sync',
  LEDGER_RESOLVED_DW56: 'resolved by sweep bundle dw-engine-rng-trust-hardening',
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

export function storyDocSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md');
}
export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function layoutSrc(): string {
  return readSrc('triade/src/ui/layout.ts');
}
export function appSrc(): string {
  return readSrc('triade/App.tsx');
}
export function hudSrc(): string {
  return readSrc('triade/src/ui/Hud.tsx');
}
export function layoutTestSrc(): string {
  return readSrc('triade/__tests__/ui/layout.test.ts');
}
export function specSrc(): string {
  const p = '_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md';
  try {
    return readSrc(p);
  } catch {
    return '';
  }
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
// Layout helpers — pure arithmetic single source
// ---------------------------------------------------------------------------
export function expectedBoardSize(width: number, height: number, insets: EdgeInsets): number {
  const landscape = orientationIsLandscape(width, height);
  const bandHeight = landscape ? LANDSCAPE_BAND_HEIGHT : PORTRAIT_BAND_HEIGHT;
  const availWidth = width - insets.left - insets.right - 2 * SAFE_MARGIN;
  const availHeight = height - insets.top - insets.bottom - 2 * SAFE_MARGIN - bandHeight;
  const availBoard = Math.max(0, Math.min(availWidth, availHeight));
  return availBoard < BOARD_SIZE_FLOOR ? availBoard : Math.max(availBoard, BOARD_SIZE_FLOOR);
}

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
    { w: 390, h: 844, insets: PORTRAIT_NOTCH, expected: 358 },
    { w: 320, h: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 }, expected: 0 },
  ];
  for (const { w, h, insets, expected } of checks) {
    const got = layoutFor({ width: w, height: h, insets }).boardSize;
    if (got !== expected) throw new Error(`golden ${w}x${h} expected ${expected} got ${got}`);
  }
}

export function assertGetBandTopDedup(): void {
  const layout = layoutSrc();
  const app = appSrc();
  const hud = hudSrc();
  if ((layout.match(/export function getBandTop/g) ?? []).length !== 1) throw new Error('layout.ts must export getBandTop exactly once');
  if (!app.includes('getBandTop')) throw new Error('App.tsx must reference getBandTop');
  if ((layout.match(/Number\.isFinite/g) ?? []).length < 6) throw new Error('layout.ts Number.isFinite guard must be >=6 (6-field)');
  if ((layout.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length !== 1) throw new Error('layout.ts duplicated formula must be exactly 1 (helper definition)');
  if ((app.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length !== 0) throw new Error('App.tsx must not contain duplicated band formula');
  if ((hud.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length !== 0) throw new Error('Hud.tsx must not contain duplicated band formula');
  if ((hud.match(/topPad \+ bandHeight/g) ?? []).length !== 0) throw new Error('Hud.tsx must not contain topPad + bandHeight');
}

export function assertLedgerDW11(doneLedger: string): void {
  const block = dwBlock(doneLedger, 'DW-11');
  if (!block.includes('status: done 2026-09-02')) throw new Error('DW-11 block must contain status: done 2026-09-02');
  if (!block.includes('resolved by sweep bundle dw-doc-layout-test-count-sync')) throw new Error('DW-11 resolution string missing');
  if (!block.includes(LEDGER.DW11_HASH)) throw new Error(`DW-11 hash ${LEDGER.DW11_HASH} missing`);
  if (!block.includes(`${LEDGER.DW11_HASH} 2026-09-02 ${LEDGER.HEX_TAIL_DW11}`)) throw new Error('DW-11 resolution-undo tail missing');
  if (countMatches(doneLedger, LEDGER.DW11_HASH) !== 1) throw new Error('DW-11 hash must appear exactly once globally');
}

export function assertLedgerDW56(doneLedger: string): void {
  const block = dwBlock(doneLedger, 'DW-56');
  if (!block.includes('status: done 2026-09-02')) throw new Error('DW-56 block must contain status: done 2026-09-02');
  if (!block.includes(LEDGER.DW56_HASH)) throw new Error(`DW-56 hash ${LEDGER.DW56_HASH} missing`);
  if (!block.includes('decision: 2026-09-02 Clamp roll and validate displayRoll')) throw new Error('DW-56 decision line missing');
  if (countMatches(doneLedger, LEDGER.DW56_HASH) !== 1) throw new Error('DW-56 hash must appear exactly once globally');
}

export function assertDocCounts(story: string): void {
  if (countMatches(story, DOC_PINS.T2_ALL_14) !== 1) throw new Error(`T2 All 14 pin must be 1 got ${countMatches(story, DOC_PINS.T2_ALL_14)}`);
  if (countMatches(story, /14 layout unit tests.*clamp-path and golden-anchor/g) !== 1) throw new Error('T5 14 layout unit tests pin must be 1');
  if (countMatches(story, /14 tests, P0\/P1.*plus clamp-path and golden-anchor/g) !== 1) throw new Error('ATDD 14 tests pin must be 1');
  if (countMatches(story, DOC_PINS.STALE_ALL_12) !== 0) throw new Error('Stale All 12 must be 0');
  if (countMatches(story, DOC_PINS.STALE_12_UNIT) !== 0) throw new Error('Stale 12 layout unit tests must be 0');
  if (countMatches(story, DOC_PINS.STALE_12_ATDD) !== 0) throw new Error('Stale 12 tests, P0/P1 must be 0');
}

export function assertFileTruth(layoutTest: string): void {
  const fileCount = (layoutTest.match(/\btest\s*\(\s*['"`]/g) ?? []).length;
  if (fileCount < 14) throw new Error(`layout.test.ts must have >=14 test( got ${fileCount}`);
  if (fileCount !== 18) throw new Error(`layout.test.ts truth is 18 got ${fileCount}`);
  for (const anchor of ANCHORS) {
    if (countMatches(layoutTest, new RegExp(`\\b${anchor}\\b`, 'g')) < 1) throw new Error(`anchor ${anchor} missing`);
  }
}

export function assertAutoRunSingleton(story: string): void {
  if (countMatches(story, /^## Auto Run Result$/gm) !== 1) throw new Error('Auto Run Result header must be exactly 1');
  const idx = story.lastIndexOf('## Auto Run Result');
  const tail = story.slice(idx);
  if (countMatches(tail, /^Status:\s*done$/gm) !== 1) throw new Error('Status: done inside Auto Run Result must be exactly 1');
  if (!tail.includes('orientation unlocked')) throw new Error('Auto Run tail must contain orientation unlocked');
  if (!tail.includes('SafeAreaProvider')) throw new Error('Auto Run tail must contain SafeAreaProvider');
  if (!tail.includes('tsc --noEmit')) throw new Error('Auto Run tail must contain tsc --noEmit');
}

export function assertSprintStatusUntouched(ledger: string): void {
  if (ledger.includes('sprint-status')) throw new Error('deferred-work.md must not mention sprint-status');
}

export function assertNoCrossCutting(story: string): void {
  if (/(Music|bgm|RevenueCat|AdMob)/i.test(story)) throw new Error('story doc must not leak Music/bgm/RevenueCat/AdMob');
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
