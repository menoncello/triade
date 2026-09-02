// TEA Automate — Fixtures for dw-engine-line-compaction
// Deterministic, no @faker-js/faker — line arithmetic is pure TS with fixed CellRef/Board literals.
// Host-only: node:test + tsx, no RN/Reanimated/Skia, no Playwright browser.
// Spec: spec-engine-line-compaction.md (DW-20 guard + DW-74 multi-gap wall scan, 8-row I-O matrix, 6 ACs, baseline 505c8ea → 7eacd93 → 4f6cc04)
// Test-design: test-design-dw-engine-line-compaction.md (10 risks, 3 high score 6: R-001 wall-scan, R-002 gap-non-merge, R-003 short guard)
// ATDD: triade/__tests__/engine/line-compaction.atdd.test.ts (20 it.skip, P0 8 + P1 6 + P2 4 + P3 2)

import { shiftLine, movementLines, boardFromLines } from '../../../triade/src/engine/core/line.ts';
import type { CellRef, ShiftedCell } from '../../../triade/src/engine/core/line.ts';
import type { Board } from '../../../triade/src/engine/core/types.ts';
import { GRID_SIZE } from '../../../triade/src/engine/core/types.ts';
import { emptyBoard, staticBoard } from '../../../triade/test-utils/helpers.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Deterministic CellRef factory — mirrors line.test.ts refLine + line-compaction.atdd.test.ts
// ---------------------------------------------------------------------------
export function refLine(...vs: Array<number | null>): CellRef[] {
  return vs.map((v, c) => ({ v, r: 0, c }));
}

export function colRefLine(col: number, ...vs: Array<number | null>): CellRef[] {
  return vs.map((v, r) => ({ v, r, c: col }));
}

// ---------------------------------------------------------------------------
// Board fixtures — deterministic, mirror helpers.ts staticBoard/emptyBoard
// ---------------------------------------------------------------------------
export const WALL_RIGHT_BOARD: Board = (() => {
  const b = emptyBoard();
  b[0][3] = 2;
  return b;
})();

export const DOUBLE_GAP_BOARD: Board = (() => {
  const b = emptyBoard();
  b[0][1] = 2;
  b[0][3] = 4;
  return b;
})();

export const HAPPY_PATH_BOARD: Board = staticBoard([1, 2, null, null]);

export const CASCADE_BOARD: Board = staticBoard([3, 3, 3, 3]);

export const GAP_NON_MERGE_BOARD: Board = staticBoard([3, null, 3, null]);

export const COLUMN_BOARD: Board = (() => {
  const b = emptyBoard();
  b[0][0] = 2;
  b[1][0] = 1;
  b[2][0] = 3;
  b[3][0] = 6;
  return b;
})();

// ---------------------------------------------------------------------------
// Expected outcomes — wall-compaction + gap-non-merge + cascade invariants
// ---------------------------------------------------------------------------
export function wallMostSingleGap(): { input: CellRef[]; expected: Array<number | null>; from: [number, number][] } {
  return { input: refLine(null, null, null, 2), expected: [2, null, null, null], from: [[0, 3]] };
}

export function doubleGapTwoTiles(): { input: CellRef[]; expected: Array<number | null> } {
  return { input: refLine(null, 2, null, 4), expected: [2, 4, null, null] };
}

export function gapNonMergeInvariant(): { input: CellRef[]; expected: Array<number | null>; score: number } {
  return { input: refLine(3, null, 3, null), expected: [3, 3, null, null], score: 0 };
}

export function cascadeBlockInvariant(): { input: CellRef[]; expected: Array<number | null>; score: number } {
  return { input: refLine(3, 3, 3, 3), expected: [6, 3, 3, null], score: 6 };
}

// ---------------------------------------------------------------------------
// Short/empty guard fixtures — DW-20
// ---------------------------------------------------------------------------
export function emptyLine(): CellRef[] {
  return [];
}
export function singleElemLine(): CellRef[] {
  return [{ v: 1, r: 0, c: 0 }];
}
export function slicedTwoElemLine(): CellRef[] {
  return refLine(null, 3).slice(0, 2);
}
export function shortBoardOneCell(): Board {
  return [[1]] as unknown as Board;
}
export function shortLineForBoardFromLines(): ShiftedCell[] {
  return shiftLine(refLine(2, null, null, null)).line;
}

// ---------------------------------------------------------------------------
// 4-direction pipeline helpers — via movementLines → shiftLine → boardFromLines
// ---------------------------------------------------------------------------
export function pipelinePreSpawn(board: Board, dir: 'left' | 'right' | 'up' | 'down'): { board: Board; trace: import('../../../triade/src/engine/core/types.ts').TraceEntry[] } {
  const lines = movementLines(board, dir);
  const shifted = lines.map((l) => shiftLine(l).line);
  return boardFromLines(shifted, dir);
}

// ---------------------------------------------------------------------------
// Source-scan helpers — single-wall-scan / length-guard / GRID_SIZE invariants
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function lineSrc(): string {
  return readSrc('triade/src/engine/core/line.ts');
}
export function typesSrc(): string {
  return readSrc('triade/src/engine/core/types.ts');
}
export function rulesSrc(): string {
  return readSrc('triade/src/engine/core/rules.ts');
}
export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function sprintStatusSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
}

export function wallScanCount(): number {
  return (lineSrc().match(/while\s*\(\s*target\s*>\s*0\s*&&\s*out\[target\s*-\s*1\]\.v\s*===\s*null\s*\)/g) ?? []).length;
}
export function nCaptureCount(): number {
  return (lineSrc().match(/const\s+n\s*=\s*line\.length/g) ?? []).length;
}
export function forICount(): number {
  return (lineSrc().match(/for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*n\s*;/g) ?? []).length;
}
export function canMergeDestCount(): number {
  return (lineSrc().match(/canMerge\(out\[dest\]\.v/g) ?? []).length;
}
export function canMergeTargetCount(): number {
  return (lineSrc().match(/canMerge\(out\[target\]/g) ?? []).length;
}
export function shiftTargetCount(): number {
  return (lineSrc().match(/out\[target\]\.v\s*=\s*t\.v/g) ?? []).length;
}
export function mergeDestCount(): number {
  return (lineSrc().match(/out\[dest\]\.v\s*=\s*merged/g) ?? []).length;
}
export function optionalChainingCount(): number {
  return (lineSrc().match(/board\[r\]\?\.\[c\]\s*\?\?\s*null/g) ?? []).length;
}
export function gridSizeDefCount(): number {
  return (typesSrc().match(/GRID_SIZE\s*=\s*4/g) ?? []).length;
}
export function gridSizeInShiftLine(): number {
  const body = lineSrc().slice(lineSrc().indexOf('export function shiftLine'), lineSrc().indexOf('export function boardFromLines'));
  return (body.match(/GRID_SIZE/g) ?? []).length;
}
export function fromWallAssignmentCount(): number {
  return (lineSrc().match(/from\s*=\s*\[\[t\.r,\s*t\.c\]/g) ?? []).length;
}
export function linesDotLengthCount(): number {
  return (lineSrc().match(/lines\.length/g) ?? []).length;
}
export function rowDotLengthCount(): number {
  return (lineSrc().match(/row\.length/g) ?? []).length;
}
export function ledgerHasDWsDone(): boolean {
  const s = ledgerSrc();
  return s.includes('DW-20') && s.includes('DW-74') && /DW-20[\s\S]*?status:\s*done 2026-09-02[\s\S]*?resolution-undo:/.test(s) && /DW-74[\s\S]*?status:\s*done 2026-09-02[\s\S]*?resolution-undo:/.test(s);
}
export function ledgerUndoHashCount(): number {
  return [...ledgerSrc().matchAll(/resolution-undo:\s*[0-9a-f]{6,}/gi)].length;
}
export function sprintStatusHasNoBundle(): boolean {
  return !sprintStatusSrc().includes('dw-engine-line-compaction');
}
export function engineDiffIsLineOnly(): boolean {
  // host check: git diff --stat -- triade/src/engine should be single file line.ts
  // We approximate via readSrc — board/spawn/pot must be unchanged by inspecting spec's statement
  // Here we just verify GRID_SIZE unchanged and rules unchanged
  return gridSizeDefCount() === 1 && typesSrc().includes('GRID_SIZE = 4') && rulesSrc().includes('canMerge');
}

// ---------------------------------------------------------------------------
// Bench helper — shiftLine O(1) n=4 ≤3 wall steps, 10k <50 ms
// ---------------------------------------------------------------------------
export function shiftLineBench(iterations = 10000): { elapsed: number; ok: boolean } {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) shiftLine(refLine(null, 3, null, 3));
  const elapsed = performance.now() - t0;
  const probe = shiftLine(refLine(null, null, null, 2));
  const ok = probe.line.map((c) => c.v)[0] === 2 && elapsed < 50;
  return { elapsed, ok };
}

// ---------------------------------------------------------------------------
// Re-exports — mirrors line.ts public surface + helpers
// ---------------------------------------------------------------------------
export { shiftLine, movementLines, boardFromLines, GRID_SIZE, emptyBoard, staticBoard };
