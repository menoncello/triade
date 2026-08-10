import { GRID_SIZE, type Board, type Direction, type MoveResult, type Rng } from './types.ts';
import { canMerge } from './rules.ts';
import { emptyBoard, boardsEqual } from './board.ts';
import { movementLines, shiftLine, boardFromLines } from './line.ts';
import { pickIndex, weightedValue, spawnTile } from './spawn.ts';

export function newGame(rng: Rng = Math.random): Board {
  const board = emptyBoard();
  const empty: Array<[number, number]> = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) empty.push([r, c]);
  }
  for (let i = 0; i < 9; i++) {
    const cell = empty.splice(pickIndex(empty.length, rng), 1)[0];
    board[cell[0]][cell[1]] = weightedValue(rng);
  }
  return board;
}

export function move(board: Board, dir: Direction, rng: Rng = Math.random): MoveResult {
  const lines = movementLines(board, dir);
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
  const moved = !boardsEqual(board, newBoard);
  if (moved) {
    const spawn = spawnTile(newBoard, rng);
    if (spawn.cell) {
      trace.push({
        value: spawn.value as number,
        to: spawn.cell,
        from: [],
        spawned: true
      });
    }
  }
  return { board: newBoard, score, moved, trace };
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
