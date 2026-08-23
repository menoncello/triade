import { GRID_SIZE, type Board, type Direction, type GameState, type MoveResult, type PendingSpawn, type Rng } from './types.ts';
import { canMerge } from './rules.ts';
import { emptyBoard, boardsEqual } from './board.ts';
import { movementLines, shiftLine, boardFromLines } from './line.ts';
import { ceilingDetector } from './ceiling.ts';
import { pickIndex, weightedValue, resolveSpawn, spawnTile } from './spawn.ts';

export function newGame(rng: Rng = Math.random): GameState {
  const board = emptyBoard();
  const empty: Array<[number, number]> = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) empty.push([r, c]);
  }
  for (let i = 0; i < 9; i++) {
    const cell = empty.splice(pickIndex(empty.length, rng), 1)[0];
    board[cell[0]][cell[1]] = weightedValue(rng);
  }
  // Initial pendingSpawn: tier-0 combined single-roll (same distribution as
  // the starting tiles) + a separate displayRoll for Epic 7's preview.
  const pendingSpawn: PendingSpawn = {
    value: resolveSpawn(ceilingDetector(board), rng),
    displayRoll: rng()
  };
  return { board, pendingSpawn };
}

// state.pendingSpawn (input) = the value THIS effective move materializes;
// result.pendingSpawn (output) = the value the NEXT effective move will
// materialize. A noop does neither: no spawn, no score, no turn, no rng draw,
// and the pending preview stays put.
export function move(state: GameState, dir: Direction, rng: Rng = Math.random): MoveResult {
  const lines = movementLines(state.board, dir);
  const shifted: Array<ReturnType<typeof shiftLine>['line']> = [];
  let score = 0;
  for (let i = 0; i < lines.length; i++) {
    const res = shiftLine(lines[i]);
    shifted.push(res.line);
    score += res.score;
  }
  const built = boardFromLines(shifted, dir);
  const newBoard = built.board;
  const trace = built.trace;
  const moved = !boardsEqual(state.board, newBoard);
  let pendingSpawn: PendingSpawn;
  if (moved) {
    // Ceiling ordering invariant: the next pending is resolved from the
    // post-merge board BEFORE placing the spawn. Ordering is provably
    // immaterial for tier >= 1 — a spawned pot tile never exceeds the
    // pre-spawn ceiling (tier-t pot max 3·2^t < 48·2^(t−1)); tier 0 is the
    // exception (pot value 3 can exceed a tiny ceiling) and harmless there.
    // The order is pinned by adaptive-spawn-integration.test.ts.
    const ceiling = ceilingDetector(newBoard);
    const spawn = spawnTile(newBoard, state.pendingSpawn.value, rng);
    if (spawn.cell && spawn.value !== null) {
      trace.push({
        value: spawn.value,
        to: spawn.cell,
        from: [],
        spawned: true
      });
    }
    pendingSpawn = {
      value: resolveSpawn(ceiling, rng),
      displayRoll: rng()
    };
  } else {
    // Shallow copy keeps snapshots structurally independent (ADR-06): a
    // caller mutating result.pendingSpawn must never rewrite prior history.
    pendingSpawn = { ...state.pendingSpawn };
  }
  return { board: newBoard, score, moved, trace, pendingSpawn };
}

export function isGameOver(board: Board): boolean {
  let r: number;
  let c: number;
  for (r = 0; r < GRID_SIZE; r++) {
    for (c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === null) return false;
    }
  }
  for (r = 0; r < GRID_SIZE; r++) {
    for (c = 0; c < GRID_SIZE; c++) {
      const v = board[r][c];
      if (v === null) continue;
      if (c + 1 < GRID_SIZE && canMerge(v, board[r][c + 1])) return false;
      if (r + 1 < GRID_SIZE && canMerge(v, board[r + 1][c])) return false;
    }
  }
  return true;
}
