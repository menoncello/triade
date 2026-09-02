// TEA Automate — Fixture helpers for dw-layout-band-dedup-and-guard
// Deterministic, no @faker-js/faker — layoutFor is pure arithmetic with fixed insets/sizes.
// Host-only: node:test + tsx, no RN/Reanimated/Skia mount, no Playwright browser.
// Spec: spec-layout-band-dedup-and-guard.md (DW-5 NaN guard + DW-10 getBandTop dedup, 6-row I/O matrix, 4 ACs, baseline 80dc5c→a09e6ed)
// Test-design: test-design-dw-layout-band-dedup-and-guard.md (9 risks, 3 high score 6: R-001 guard fallback vs 0-clamp, R-002 single-helper drift, R-003 finite-path regression)
// ATDD: triade/__tests__/ui/layout.band-dedup-guard.atdd.test.ts (20 it.skip scaffolds, P0 8 + P1 6 + P2 4 + P3 2)

import {
  layoutFor,
  getBandTop,
  SAFE_MARGIN,
  PORTRAIT_BAND_HEIGHT,
  LANDSCAPE_BAND_HEIGHT,
  BOARD_SIZE_FLOOR,
} from '../../../triade/src/ui/layout.ts';
import type { EdgeInsets, LayoutInput, LayoutResult } from '../../../triade/src/ui/layout.ts';
import { isLandscape as orientationIsLandscape } from '../../../triade/src/ui/orientation.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Deterministic fixtures — mirror layout.test.ts + layout fixtures
// ---------------------------------------------------------------------------
export const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 };
export const PORTRAIT_NOTCH: EdgeInsets = { top: 47, bottom: 34, left: 0, right: 0 };
export const LANDSCAPE_NOTCH: EdgeInsets = { top: 0, bottom: 0, left: 47, right: 21 };

export const GOLDEN = {
  // pre-computed maximized squares (finite-path byte-identical anchors)
  // 414×896 portrait → max(0,min(382, 896-34-47-32-96=686)) → 382
  portrait414x896: { width: 414, height: 896, insets: ZERO_INSETS, boardSize: 382, bandHeight: 96, isLandscape: false },
  // 1024×768 landscape → 768-0-0-32-48=688 height-bounded
  landscape1024x768: { width: 1024, height: 768, insets: ZERO_INSETS, boardSize: 688, bandHeight: 48, isLandscape: true },
  // 500×580 portrait → 580-2*16-96=452 height-bounded
  portrait500x580: { width: 500, height: 580, insets: ZERO_INSETS, boardSize: 452, bandHeight: 96, isLandscape: false },
} as const;

export const SIZES = [320, 390, 414, 844, 1024, 2000, 500, 568, 768, 390, 200] as const;

// ---------------------------------------------------------------------------
// Guard fixture helpers — 6-field Number.isFinite early degrade to finite 0
// ---------------------------------------------------------------------------
export function guardVariants(): Array<LayoutInput> {
  return [
    { width: NaN, height: 844, insets: ZERO_INSETS },
    { width: 390, height: Infinity, insets: ZERO_INSETS },
    { width: 390, height: 844, insets: { top: NaN, bottom: 0, left: 0, right: 0 } },
    { width: 390, height: 844, insets: { top: 0, bottom: Infinity, left: 0, right: 0 } },
    { width: 390, height: 844, insets: { top: 0, bottom: 0, left: -Infinity, right: 0 } },
    { width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: NaN } },
  ];
}

export function negInfinityVariants(): Array<LayoutInput> {
  return [
    { width: -Infinity, height: 844, insets: ZERO_INSETS },
    { width: 390, height: 844, insets: { top: -Infinity, bottom: 0, left: 0, right: 0 } },
    { width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: -Infinity } },
  ];
}

export function assertFiniteLayout(result: LayoutResult): void {
  if (!Number.isFinite(result.boardSize)) throw new Error(`boardSize not finite: ${result.boardSize}`);
  if (!Number.isFinite(result.bandHeight)) throw new Error(`bandHeight not finite: ${result.bandHeight}`);
  if (typeof result.isLandscape !== 'boolean') throw new Error(`isLandscape not boolean`);
  if (result.boardSize < 0) throw new Error(`boardSize negative: ${result.boardSize}`);
  if (result.bandHeight <= 0) throw new Error(`bandHeight not positive: ${result.bandHeight}`);
}

export function guardProducesFiniteZero(input: LayoutInput): boolean {
  const r = layoutFor(input);
  return r.boardSize === 0 && Number.isFinite(r.bandHeight) && typeof r.isLandscape === 'boolean' && r.bandHeight > 0;
}

// ---------------------------------------------------------------------------
// Finite-path byte-identical helpers
// ---------------------------------------------------------------------------
export function finitePortrait390x844(): LayoutResult {
  return layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
}
export function finiteLandscape844x390(): LayoutResult {
  return layoutFor({ width: 844, height: 390, insets: ZERO_INSETS });
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
// getBandTop helpers — pure arithmetic single source
// ---------------------------------------------------------------------------
export function bandTopFor(insets: EdgeInsets, bandHeight: number): number {
  return getBandTop(insets, bandHeight);
}

export function getBandTopVariants(): Array<{ insets: EdgeInsets; bandHeight: number; expected: number }> {
  return [
    { insets: { top: 47, bottom: 34, left: 0, right: 0 }, bandHeight: 96, expected: 47 + 16 + 96 }, // 159
    { insets: { top: 0, bottom: 0, left: 0, right: 0 }, bandHeight: 48, expected: 0 + 16 + 48 }, // 64
    { insets: { top: 0, bottom: 0, left: 47, right: 21 }, bandHeight: 48, expected: 0 + 16 + 48 },
    { insets: PORTRAIT_NOTCH, bandHeight: PORTRAIT_BAND_HEIGHT, expected: 47 + 16 + 96 },
  ];
}

// ---------------------------------------------------------------------------
// Source-scan helpers — single-helper / single-constant / early-guard invariants
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
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

export function guardIsFirstStatement(): boolean {
  const src = layoutSrc();
  const fnBody = src.slice(src.indexOf('export function layoutFor'));
  const guardIdx = fnBody.indexOf('Number.isFinite');
  const landscapeIdx = fnBody.indexOf('isLandscape(');
  const availIdx = fnBody.indexOf('availWidth');
  return guardIdx !== -1 && guardIdx < landscapeIdx && guardIdx < availIdx;
}

export function getBandTopExportCount(): number {
  return (layoutSrc().match(/export function getBandTop/g) ?? []).length;
}

export function getBandTopUseCount(): number {
  // counts App + Hud getBandTop occurrences (imports + calls). Expected 5: layout export + App import + App call + Hud import + 2 Hud height calls → but Hud import counts as 1
  const app = appSrc();
  const hud = hudSrc();
  const appHits = (app.match(/getBandTop/g) ?? []).length; // import + call = 2
  const hudHits = (hud.match(/getBandTop/g) ?? []).length; // import + 2 height = 3
  return appHits + hudHits;
}

export function hudUsesTopPadForPaddingOnly(): boolean {
  // Hud must retain topPad for padding* but height must use getBandTop
  const hud = hudSrc();
  return hud.includes('topPad = insets.top + SAFE_MARGIN') && !hud.includes('topPad + bandHeight') && hud.includes('getBandTop(insets, bandHeight)');
}

export function duplicatedFormulaCount(): number {
  const combined = appSrc() + '\n' + hudSrc();
  const inline = (combined.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length;
  const topPad = (combined.match(/topPad \+ bandHeight/g) ?? []).length;
  return inline + topPad;
}

export function safeMarginInAppHudOutsideImport(): number {
  // SAFE_MARGIN should only appear via padding locals in Hud, not as band-height formula in App/Hud outside layout.ts
  // App should have 0 SAFE_MARGIN outside the removed import; Hud retains SAFE_MARGIN only for topPad/leftPad/rightPad/bottomPad (4 lines), not for height
  const app = appSrc();
  const hud = hudSrc();
  // after dedup, App has 0 SAFE_MARGIN hits (import removed), Hud has 4 pad hits but 0 band-height hits
  const appSafe = (app.match(/SAFE_MARGIN/g) ?? []).length;
  // Hud: count SAFE_MARGIN occurrences that are NOT in padded assignment
  const hudBandDup = (hud.match(/SAFE_MARGIN \+ bandHeight/g) ?? []).length;
  return appSafe + hudBandDup;
}

// ---------------------------------------------------------------------------
// Ledger helpers — DW-5/DW-10 done with resolution-undo hash
// ---------------------------------------------------------------------------
export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function ledgerDoneCount(): number {
  return [...ledgerSrc().matchAll(/status:\s*done 2026-09-01/g)].length;
}
export function ledgerUndoHashCount(): number {
  return [...ledgerSrc().matchAll(/resolution-undo:\s*[0-9a-f]{6,}/gi)].length;
}
export function ledgerHasDW5AndDW10Done(): boolean {
  const src = ledgerSrc();
  // both DW-5 and DW-10 sections contain status done + resolution-undo with sweep bundle id
  return src.includes('DW-5') && src.includes('DW-10') && /DW-5[\s\S]*?status:\s*done 2026-09-01[\s\S]*?resolution-undo:/.test(src) && /DW-10[\s\S]*?status:\s*done 2026-09-01[\s\S]*?resolution-undo:/.test(src);
}
export function sprintStatusHasNoLayoutBundle(): boolean {
  const s = readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
  return !s.includes('dw-layout-band-dedup-and-guard');
}

// ---------------------------------------------------------------------------
// Bench helper — layoutFor O(1) <1 ms per call, 10k calls <50 ms
// ---------------------------------------------------------------------------
export function layoutForBench(iterations = 10000): { elapsed: number; ok: boolean } {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
  const elapsed = performance.now() - t0;
  const probe = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
  const ok = Number.isFinite(probe.boardSize) && probe.boardSize > 0 && elapsed < 50;
  return { elapsed, ok };
}

// ---------------------------------------------------------------------------
// Re-exports for convenience — mirrors layout.ts public surface
// ---------------------------------------------------------------------------
export { layoutFor, getBandTop, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR };
