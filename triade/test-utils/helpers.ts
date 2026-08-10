import type { Board, Rng } from '../src/engine/core/index.ts';

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

export { mulberry32 } from '../src/utils/mulberry32.ts';
