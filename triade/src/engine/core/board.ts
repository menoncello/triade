import { GRID_SIZE, resolveGridSize, type Board, type BoardConfig, type Cell } from './types.ts';

export function emptyBoard(boardConfig?: number | BoardConfig | null): Board {
  const size = resolveGridSize(boardConfig);
  const b: Board = [];
  for (let r = 0; r < size; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < size; c++) row.push(null);
    b.push(row);
  }
  return b;
}

export function boardsEqual(a: Board, b: Board, boardConfig?: number | BoardConfig | null): boolean {
  const size = resolveGridSize(boardConfig);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (a[r]?.[c] !== b[r]?.[c]) return false;
    }
  }
  return true;
}
