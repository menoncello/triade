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
  const shifted: Array<ReturnType<typeof shiftLine>> = [];
  let score = 0;
  for (let i = 0; i < lines.length; i++) {
    const res = shiftLine(lines[i]);
    shifted.push(res);
    score += res.score;
  }
  const built = boardFromLines(shifted.map((s) => s.line), dir);
  let effectiveBoard = built.board;
  const trace = built.trace;
  const moved = !boardsEqual(state.board, effectiveBoard);
  let pendingSpawn: PendingSpawn;
  if (moved) {
    // Directional spawn (Story 12.1): only lines that actually changed during
    // the shift are eligible, and the spawn lands on the OPPOSITE edge of each
    // moved line (left->rightmost col, right->leftmost col, up->bottom row,
    // down->top row). Every moved line vacates its opposite-edge cell, so the
    // candidate set is guaranteed non-empty (AC4 — no fallback needed). The
    // pick still consumes exactly 1 rng draw (AC3), preserving the 3-draw
    // effective-move budget.
    const candidates: Array<[number, number]> = [];
    if (dir === 'left' || dir === 'right') {
      const oppCol = dir === 'left' ? GRID_SIZE - 1 : 0;
      for (let i = 0; i < shifted.length; i++) {
        if (shifted[i].moved) candidates.push([i, oppCol]);
      }
    } else {
      const oppRow = dir === 'up' ? GRID_SIZE - 1 : 0;
      for (let i = 0; i < shifted.length; i++) {
        if (shifted[i].moved) candidates.push([oppRow, i]);
      }
    }
    // Ceiling ordering invariant: the next pending is resolved from the
    // post-merge board BEFORE placing the spawn. Ordering is provably
    // immaterial for tier >= 1 — a spawned pot tile never exceeds the
    // pre-spawn ceiling (tier-t pot max 3·2^t < 48·2^(t−1)); tier 0 is the
    // exception (pot value 3 can exceed a tiny ceiling) and harmless there.
    // The order is pinned by adaptive-spawn-integration.test.ts.
    const ceiling = ceilingDetector(effectiveBoard);
    const spawn = spawnTile(effectiveBoard, state.pendingSpawn.value, rng, candidates);
    effectiveBoard = spawn.board;
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
  return { board: effectiveBoard, score, moved, trace, pendingSpawn };
}

export function stateFromResult(result: MoveResult): GameState {
  return { board: result.board, pendingSpawn: result.pendingSpawn };
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
