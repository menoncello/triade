import { GRID_SIZE, type Board, type Cell } from './types.ts';

export function emptyBoard(): Board {
  const b: Board = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) row.push(null);
    b.push(row);
  }
  return b;
}

export function boardsEqual(a: Board, b: Board): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}
