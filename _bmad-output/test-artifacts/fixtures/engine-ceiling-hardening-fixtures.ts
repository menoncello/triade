// TEA Automate — Fixtures for dw-engine-ceiling-hardening
// Deterministic, no @faker-js/faker — ceiling/tier arithmetic is pure TS with fixed literals.
// Host-only: node:test + tsx, no RN/Reanimated/Skia, no Playwright browser.
// Spec: spec-engine-ceiling-hardening.md (DW-41..45 ceilingDetector row/tile guards + tierForCeiling finite/fractional/very-large, unbounded ladder 48*2^(k-1) → pot caps 30, 8-row I-O matrix, 4 ACs, baseline bc7d858 → 7ec307b)
// Test-design: test-design-dw-engine-ceiling-hardening.md (10 risks, 3 high score 6: R-001 invalid-tile filter, R-002 row guard, R-003 unbounded tier; P0 22 checks, P1 18, P2 4, P3 4)
// ATDD: triade/__tests__/engine/ceiling-hardening.atdd.test.ts (20 it.skip, P0 8 + P1 6 + P2 4 + P3 2)

import { ceilingDetector, tierForCeiling } from '../../../triade/src/engine/core/ceiling.ts';
import { potForTier } from '../../../triade/src/engine/core/pot.ts';
import { GRID_SIZE } from '../../../triade/src/engine/core/types.ts';
import type { Board } from '../../../triade/src/engine/core/types.ts';
import { boardWith, emptyBoard, staticBoard } from '../../../triade/test-utils/helpers.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Source-scan helpers — single guard / single formula / single cap invariants
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function ceilingSrc(): string {
  return readSrc('triade/src/engine/core/ceiling.ts');
}
export function potSrc(): string {
  return readSrc('triade/src/engine/core/pot.ts');
}
export function typesSrc(): string {
  return readSrc('triade/src/engine/core/types.ts');
}
export function helpersSrc(): string {
  return readSrc('triade/test-utils/helpers.ts');
}
export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function sprintStatusSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
}
export function specSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/spec-engine-ceiling-hardening.md');
}

export function countIsFiniteV(): number {
  return (ceilingSrc().match(/Number\.isFinite\(v\)/g) ?? []).length;
}
export function countVNotNull(): number {
  return (ceilingSrc().match(/v !== null/g) ?? []).length;
}
export function countArrayIsArrayBoard(): number {
  return (ceilingSrc().match(/Array\.isArray\(board\)/g) ?? []).length;
}
export function countArrayIsArrayRow(): number {
  return (ceilingSrc().match(/Array\.isArray\(row\)/g) ?? []).length;
}
export function countBareBoardAccess(): number {
  return (ceilingSrc().match(/board\[r\]\[c\]/g) ?? []).length;
}
export function countLog2Floor(): number {
  return (ceilingSrc().match(/Math\.floor\(Math\.log2\(ceiling \/ 48\)/g) ?? []).length;
}
export function countEpsilon(): number {
  return (ceilingSrc().match(/1e-9/g) ?? []).length;
}
export function countIsFiniteRaw(): number {
  return (ceilingSrc().match(/Number\.isFinite\(raw\)/g) ?? []).length;
}
export function countMathTrunc(): number {
  return (ceilingSrc().match(/Math\.trunc\(raw\)/g) ?? []).length;
}
export function countIsFiniteCeiling(): number {
  return (ceilingSrc().match(/Number\.isFinite\(ceiling\)/g) ?? []).length;
}
export function countUnbounded(): number {
  return (ceilingSrc().match(/Unbounded/g) ?? []).length;
}
export function countLadderDoc(): number {
  return (ceilingSrc().match(/48 \* 2/g) ?? []).length;
}
export function countMaxPotTierInPot(): number {
  return (potSrc().match(/MAX_POT_TIER/g) ?? []).length;
}
export function countGridSize(): number {
  return (typesSrc().match(/export const GRID_SIZE/g) ?? []).length;
}
export function ledgerHasDW41to45Done(): boolean {
  const s = ledgerSrc();
  return (
    /DW-41[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /DW-42[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /DW-43[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /DW-44[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /DW-45[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /resolution-undo:\s*[0-9a-f]{64}/.test(s)
  );
}
export function ledgerUndoHitCount(): number {
  return [...ledgerSrc().matchAll(/resolution-undo:\s*[0-9a-f]{64}/gi)].length;
}
export function ledgerDoneHitCount(): number {
  return [...ledgerSrc().matchAll(/status:\s*done 2026-09-02/gi)].length;
}
export function sprintStatusHasNoBundle(): boolean {
  return !sprintStatusSrc().includes('dw-engine-ceiling-hardening');
}

// ---------------------------------------------------------------------------
// Board fixtures — deterministic, mirror helpers.ts + spec Verification probe
// ---------------------------------------------------------------------------
export const INVALID_MIX_BOARD: Board = [[3, null], undefined as unknown as Board[0], [NaN as unknown as number, -5, 0, Infinity, 96]] as unknown as Board;
export const INVALID_SINGLE_ROW: Board = [[NaN as unknown as number, -5, 0, Infinity, 96] as unknown as Board[0]] as Board;
export const MISSING_ROW_BOARD: Board = [[3, null], undefined as unknown as Board[0], [768, null]] as unknown as Board;
export const RAGGED_JAGGED_BOARD: Board = [[3, null], [null, 6, 12], [null, null, null, 768, 1536]] as unknown as Board;
export const EMPTY_JAGGED_BOARD: Board = [[3, null], [null, 6, 12]] as unknown as Board;
export const CEILING_96_BOARD: Board = boardWith([[96, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
export const CEILING_384_BOARD: Board = boardWith([[384, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
export const CEILING_768_BOARD: Board = boardWith([[3, 6, null, null], [12, 24, null, null], [null, null, 48, null], [null, null, null, 768]]);

// ---------------------------------------------------------------------------
// Tier fixtures — boundary ladder + fractional + very-large
// ---------------------------------------------------------------------------
export const TIER_PROBE_INPUTS: number[] = [-5, 0, NaN, Infinity, 47.9, 48, 48.1, 95.9, 96, 192, 768, 1e15, Number.MAX_SAFE_INTEGER];
export const EXPECTED_TIER_PROBE: number[] = [0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 5, 45, 48];
export const BOUNDARY_CASES: Array<[number, number]> = [
  [24, 0], [47, 0], [48, 1], [95, 1], [96, 2], [191, 2], [192, 3], [383, 3], [384, 4], [767, 4], [768, 5], [1536, 6], [3072, 7], [6144, 8],
];
export const MID_TIER_CASES: Array<[number, number]> = [
  [50, 1], [100, 2], [200, 3], [400, 4], [800, 5], [1600, 6], [3071, 6], [3073, 7],
];
export const FRACTIONAL_CASES: Array<[number, number]> = [
  [47.9, 0], [48, 1], [48.1, 1], [95.9, 1], [96, 2],
];
export const NON_FINITE_CASES: number[] = [-5, 0, NaN, Infinity, -Infinity];

// ---------------------------------------------------------------------------
// Expected outcomes — ceiling → tier → pot chain
// ---------------------------------------------------------------------------
export function ceiling96Chain(): { ceiling: number; tier: number; potLen: number } {
  const c = 96;
  return { ceiling: c, tier: 2, potLen: 3 };
}
export function ceiling384Chain(): { ceiling: number; tier: number; potLen: number } {
  return { ceiling: 384, tier: 4, potLen: 5 };
}
export function veryLargeTier(): { input: number; tier: number; potLen: number }[] {
  return [
    { input: 1e15, tier: 45, potLen: 31 },
    { input: Number.MAX_SAFE_INTEGER, tier: 48, potLen: 31 },
  ];
}

// ---------------------------------------------------------------------------
// Bench helper — ceiling scan 16 cells + tier log2 O(1) per call
// ---------------------------------------------------------------------------
export function ceilingBench(iterations = 10000): { elapsed: number; ok: boolean } {
  const b = boardWith([[3, 6, 12, 24], [48, 96, 192, 384], [768, 1536, null, null], [null, null, null, null]]);
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) ceilingDetector(b);
  const elapsed = performance.now() - t0;
  return { elapsed, ok: elapsed < 200 };
}
export function tierBench(iterations = 10000): { elapsed: number; ok: boolean } {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) tierForCeiling(Number.MAX_SAFE_INTEGER);
  const elapsed = performance.now() - t0;
  return { elapsed, ok: elapsed < 100 };
}

// ---------------------------------------------------------------------------
// Re-exports — mirrors engine surface + helpers
// ---------------------------------------------------------------------------
export {
  ceilingDetector,
  tierForCeiling,
  potForTier,
  GRID_SIZE,
  boardWith,
  emptyBoard,
  staticBoard,
};
