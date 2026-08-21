import { GRID_SIZE, type Board, type Rng, type SpawnResult } from './types.ts';
import { FIXED_WEIGHTS, POT_VALUE } from '../config/spawnConfig.ts';

export function pickIndex(len: number, rng: Rng): number {
  let idx = Math.floor(rng() * len);
  if (idx < 0) idx = 0;
  if (idx >= len) idx = len - 1;
  return idx;
}

export function weightedValue(rng: Rng = Math.random): number {
  const roll = rng();
  if (roll < FIXED_WEIGHTS[1]) return 1;
  if (roll < FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2]) return 2;
  return POT_VALUE;
}

export function spawnTile(board: Board, rng: Rng = Math.random): SpawnResult {
  const empty: Array<[number, number]> = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === null) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return { board, cell: null, value: null };
  const cell = empty[pickIndex(empty.length, rng)];
  const value = weightedValue(rng);
  board[cell[0]][cell[1]] = value;
  return { board, cell, value };
}
