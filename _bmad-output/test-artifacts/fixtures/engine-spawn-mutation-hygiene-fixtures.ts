// TEA Automate — Fixtures for dw-engine-spawn-mutation-hygiene
// Deterministic, no @faker-js/faker — boards are fixed Cell=number|null literals.
// Host-only: node:test + tsx, no RN/Reanimated/Skia, no Playwright browser.
// Spec: spec-engine-spawn-mutation-hygiene.md (DW-23/70/75/81 clone+freeze hygiene, 8 ACs, baseline edfc574 → 53c4f3d)
// Test-design: test-design-dw-engine-spawn-mutation-hygiene.md (10 risks, 3 high R-001 effectiveBoard, R-002 clone branches, R-003 freeze throw)
// ATDD: triade/__tests__/engine/spawn-mutation-hygiene.atdd.test.ts (20 it.skip, P0 8 + P1 6 + P2 4 + P3 2)

import { spawnTile, pickIndex } from '../../../triade/src/engine/core/spawn.ts';
import { move } from '../../../triade/src/engine/core/game.ts';
import { GRID_SIZE } from '../../../triade/src/engine/core/types.ts';
import type { Board, GameState, Direction, PendingSpawn } from '../../../triade/src/engine/core/types.ts';
import {
  boardWith,
  emptyBoard,
  staticBoard,
  gameState,
  rngOf,
  spyRng,
  oppositeEdgeCandidates,
  occupiedCells,
} from '../../../triade/test-utils/helpers.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Source-scan helpers — clone/freeze/effectiveBoard allowlists
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function spawnSrc(): string {
  return readSrc('triade/src/engine/core/spawn.ts');
}
export function gameSrc(): string {
  return readSrc('triade/src/engine/core/game.ts');
}
export function helpersSrc(): string {
  return readSrc('triade/test-utils/helpers.ts');
}
export function typesSrc(): string {
  return readSrc('triade/src/engine/core/types.ts');
}
export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function sprintStatusSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
}

export function cloneBoardCountInSpawn(): number {
  return (spawnSrc().match(/function cloneBoard/g) ?? []).length;
}
export function cloneBoardCountInHelpers(): number {
  return (helpersSrc().match(/function cloneBoard/g) ?? []).length;
}
export function deepFreezeCountInHelpers(): number {
  return (helpersSrc().match(/function deepFreezeBoard/g) ?? []).length;
}
export function constNextCount(): number {
  return (spawnSrc().match(/const next = cloneBoard/g) ?? []).length;
}
export function returnNextCount(): number {
  return (spawnSrc().match(/return \{ board: next/g) ?? []).length;
}
export function returnBoardSurvivorCount(): number {
  return (spawnSrc().match(/return \{ board: board/g) ?? []).length;
}
export function letEffectiveBoardCount(): number {
  return (gameSrc().match(/let effectiveBoard/g) ?? []).length;
}
export function effectiveBoardAssignCount(): number {
  return (gameSrc().match(/effectiveBoard = spawn\.board/g) ?? []).length;
}
export function returnEffectiveBoardCount(): number {
  return (gameSrc().match(/return \{ board: effectiveBoard/g) ?? []).length;
}
export function constNewBoardSurvivor(): boolean {
  return gameSrc().includes('const newBoard');
}
export function returnNewBoardSurvivor(): boolean {
  return gameSrc().includes('return { board: newBoard');
}
export function structuredCloneBoardCount(): number {
  return (
    (spawnSrc().match(/structuredClone/g) ?? []).length +
    (helpersSrc().match(/structuredClone/g) ?? []).length +
    (gameSrc().match(/structuredClone/g) ?? []).length
  );
}
export function jsonParseBoardCount(): number {
  return (
    (spawnSrc().match(/JSON\.parse.*board/g) ?? []).length +
    (helpersSrc().match(/JSON\.parse.*board/g) ?? []).length
  );
}
export function gridSizeDefCount(): number {
  return (typesSrc().match(/export const GRID_SIZE/g) ?? []).length;
}
export function ledgerHasDWsDone(): boolean {
  const s = ledgerSrc();
  return (
    /DW-23[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /DW-70[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /DW-75[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /DW-81[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /resolution-undo:\s*[0-9a-f]{64}/.test(s)
  );
}
export function ledgerUndoHashCount(): number {
  return [...ledgerSrc().matchAll(/resolution-undo:\s*[0-9a-f]{6,}/gi)].length;
}
export function sprintStatusHasNoBundle(): boolean {
  return !sprintStatusSrc().includes('dw-engine-spawn-mutation-hygiene');
}

// ---------------------------------------------------------------------------
// Board fixtures — deterministic, mirror helpers.ts
// ---------------------------------------------------------------------------
export const FULL_BOARD: Board = boardWith([
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
]);

export const SPARSE_BOARD: Board = boardWith([
  [1, null, null, null],
  [2, 3, 4, 5],
  [6, 7, 8, 9],
  [10, 11, 12, null],
]);

export const SINGLE_TILE_LEFT_BOARD: Board = boardWith([
  [null, 2, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
]);

export const EMPTY_OOB_BOARD: Board = (() => {
  const b = emptyBoard();
  b[0][0] = 1;
  return b;
})();

export const FULL_NOOP_BOARD: Board = boardWith([
  [3, 6, 3, 6],
  [6, 3, 6, 3],
  [3, 6, 3, 6],
  [6, 3, 6, 3],
]);

// ---------------------------------------------------------------------------
// Helper factories — snapshot isolation probes
// ---------------------------------------------------------------------------
export function cloneIsolationProbe(): { input: Board; result: ReturnType<typeof spawnTile> } {
  const b = boardWith([
    [1, null, null, null],
    [2, 3, 4, 5],
    [6, 7, 8, 9],
    [10, 11, 12, null],
  ]);
  const spy = spyRng(0);
  const result = spawnTile(b, 42, spy);
  return { input: b, result };
}

export function fullBoardProbe(): ReturnType<typeof spawnTile> {
  const b = boardWith([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
  return spawnTile(b, 99, spyRng(0.5));
}

export function emptyPoolProbe(): ReturnType<typeof spawnTile> {
  const b = boardWith([
    [1, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  return spawnTile(b, 42, spyRng(0.5), []);
}

export function oobProbe(): ReturnType<typeof spawnTile> {
  const b = emptyBoard();
  b[0][0] = 1;
  return spawnTile(b, 7, spyRng(0.99), [[-1, 0], [0, 1]]);
}

export function frozenSnapshotProbe(): { input: Board; snapshot: GameState } {
  const b = boardWith([
    [1, 2, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  const s = gameState(b);
  return { input: b, snapshot: s };
}

export function effectiveMoveProbe(): { state: GameState; result: ReturnType<typeof move> } {
  const initial = boardWith([
    [null, 2, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  const state = gameState(initial, { value: 9, displayRoll: 0.1 });
  const spy = spyRng(0, 0.35, 0.45);
  const result = move(state, 'left', spy);
  return { state, result };
}

// ---------------------------------------------------------------------------
// Bench helper — clone+freeze O(16) per spawn/move <50 ms per 10k
// ---------------------------------------------------------------------------
export function spawnCloneBench(iterations = 10000): { elapsed: number; ok: boolean } {
  const b = boardWith([
    [1, null, null, null],
    [2, 3, 4, 5],
    [6, 7, 8, 9],
    [10, 11, 12, null],
  ]);
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) spawnTile(b, 42, rngOf(0.5));
  const elapsed = performance.now() - t0;
  return { elapsed, ok: elapsed < 500 };
}

export function freezeBench(iterations = 10000): { elapsed: number; ok: boolean } {
  const b = boardWith([
    [1, null, null, null],
    [2, 3, 4, 5],
    [6, 7, 8, 9],
    [10, 11, 12, null],
  ]);
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) gameState(b, { value: 1, displayRoll: 0.5 });
  const elapsed = performance.now() - t0;
  return { elapsed, ok: elapsed < 800 };
}

// ---------------------------------------------------------------------------
// Re-exports — mirrors engine surface + helpers
// ---------------------------------------------------------------------------
export {
  spawnTile,
  move,
  GRID_SIZE,
  boardWith,
  emptyBoard,
  staticBoard,
  gameState,
  rngOf,
  spyRng,
  oppositeEdgeCandidates,
  occupiedCells,
  pickIndex,
  mulberry32,
};
