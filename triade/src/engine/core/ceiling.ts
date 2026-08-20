import type { Board } from './types.ts';

export type CeilingTier = number;

export function ceilingDetector(board: Board): number {
  let max = 0;
  for (let r = 0; r < board.length; r++) {
    const row = board[r];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v !== null && v > max) max = v;
    }
  }
  return max;
}

export function tierForCeiling(ceiling: number): CeilingTier {
  if (ceiling < 48) return 0;
  return Math.floor(Math.log2(ceiling / 48) + 1e-9) + 1;
}
