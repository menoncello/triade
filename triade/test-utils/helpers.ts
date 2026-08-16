import assert from 'node:assert';
import type { Board, Rng } from '../src/engine/core/index.ts';
import { resultingTiles, type TileTransition } from '../src/render/transitionPlan.ts';

export const SIZE = 4;

export function emptyBoard(): Board {
  const b: Board = [];
  for (let r = 0; r < SIZE; r++) {
    const row: Array<number | null> = [];
    for (let c = 0; c < SIZE; c++) row.push(null);
    b.push(row);
  }
  return b;
}

export function rngOf(...values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i++];
    return v === undefined ? 0.5 : v;
  };
}

export function staticBoard(row: Array<number | null>): Board {
  const b = emptyBoard();
  b[0] = row.slice();
  for (let r = 1; r < SIZE; r++) b[r] = [3, 6, 12, 24];
  return b;
}

export function boardWith(matrix: Array<Array<number | null | undefined>>): Board {
  const b = emptyBoard();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (matrix[r][c] !== null && matrix[r][c] !== undefined) b[r][c] = matrix[r][c] as number;
    }
  }
  return b;
}

function byCell(a: { cell: [number, number] }, b: { cell: [number, number] }): number {
  return a.cell[0] - b.cell[0] || a.cell[1] - b.cell[1];
}

export function occupiedCells(board: Board): Array<{ cell: [number, number]; value: number }> {
  const out: Array<{ cell: [number, number]; value: number }> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== null) out.push({ cell: [r, c], value: board[r][c] as number });
    }
  }
  return out.sort(byCell);
}

export function assertNoLeak(plan: TileTransition[], resultBoard: Board, message?: string) {
  const tiles = resultingTiles(plan)
    .map((t) => ({ cell: t.cell, value: t.value }))
    .sort(byCell);
  assert.deepStrictEqual(
    tiles,
    occupiedCells(resultBoard),
    message ?? 'resultingTiles(plan) equals occupied cells of result.board'
  );
}

export { mulberry32 } from '../src/utils/mulberry32.ts';
