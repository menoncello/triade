export const GRID_SIZE = 4;

export type Cell = number | null;
export type Board = Cell[][];
export type Direction = 'left' | 'right' | 'up' | 'down';
export type Rng = () => number;

export interface TraceEntry {
  value: number;
  to: [number, number];
  from: Array<[number, number]>;
  spawned: boolean;
}

export interface MoveResult {
  board: Board;
  score: number;
  moved: boolean;
  trace: TraceEntry[];
}

export interface SpawnResult {
  board: Board;
  cell: [number, number] | null;
  value: number | null;
}
