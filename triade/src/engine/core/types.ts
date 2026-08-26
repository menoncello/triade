export const GRID_SIZE = 4;

export type Cell = number | null;
export type Board = Cell[][];
export type Direction = 'left' | 'right' | 'up' | 'down';

// Draw-budget contract (FIXED): every RNG consumer draws an exact count.
//   newGame            = 20 draws (9 cells + 9 values + 1 pending value + 1 displayRoll)
//   move effective     = 3 draws, in order (cell, next value, next displayRoll)
//                        (a full-board effective move would skip the cell draw,
//                        but that branch is unreachable via move(): an effective
//                        move always frees at least one cell before spawning)
//   move noop          = 0 draws
//   resolveSpawn / weightedValue = 1 draw each
//   spawnTile (cell pick) = 1 draw — except on a full board, where it returns
//                         early with nulls and consumes 0 draws (unreachable
//                         via move(): an effective move always frees a cell).
//                         When called with a `candidates` pool (Story 12.1
//                         directional spawn) it still draws exactly 1 value and
//                         picks uniformly within that pool; a provided-but-empty
//                         pool returns nulls with 0 draws (engine-never-throws).
export type Rng = () => number;

// GameState is the immutable engine snapshot (ADR-06). Anything the undo must
// revert lives in the snapshot (state-placement master rule): pendingSpawn is
// the engine-owned piece, board is the other; cumulative score stays app-owned
// (matchScore.applyMove) and must never be folded into this snapshot.
export interface GameState {
  board: Board;
  pendingSpawn: PendingSpawn;
}

// Pre-resolved next spawn, living in the snapshot from day one so Epic 7's
// Ambiguous Preview (N3) can read it without refactoring the resolver.
// `value` is the real value the NEXT effective move materializes;
// `displayRoll` is a separate [0,1) roll the preview uses (< 0.6 exact,
// else range). Both resolved together — the UI only reads, never rolls.
export interface PendingSpawn {
  value: number;
  displayRoll: number;
}

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
  // The NEXT spawn to preview (not the one just placed — that one is on board).
  pendingSpawn: PendingSpawn;
}

export interface SpawnResult {
  board: Board;
  cell: [number, number] | null;
  value: number | null;
}
