import { test } from 'node:test';
import assert from 'node:assert';
import * as game from '../../src/engine/core/index.ts';
import { SIZE, emptyBoard, boardWith, mulberry32 } from '../../test-utils/helpers.ts';

const DIRECTIONS = ['left', 'right', 'up', 'down'] as const;

function tileCount(board: Array<Array<number | null>>): number {
  let count = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== null) count++;
    }
  }
  return count;
}

test('SMOKE: game launches — newGame returns a playable 4x4 board', () => {
  const rng = mulberry32(12345);
  const state = game.newGame(rng);
  const board = state.board;
  assert.strictEqual(board.length, SIZE, 'board has 4 rows');
  for (let r = 0; r < SIZE; r++) {
    assert.strictEqual(board[r].length, SIZE, `row ${r} has 4 cells`);
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      assert.ok(v === null || (v >= 1 && v <= 3), `tile value ${v} is a valid spawn value`);
    }
  }
  assert.strictEqual(tileCount(board), 9, 'new game spawns exactly 9 tiles');
});

test('SMOKE: core loop executes — 500 deterministic moves never crash and score never decreases', () => {
  const rng = mulberry32(20260808);
  let state = game.newGame(rng);
  let score = 0;
  let moves = 0;
  let games = 0;
  while (moves < 500) {
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    const res = game.move(state, dir, rng);
    assert.strictEqual(res.board.length, SIZE, 'board stays 4x4');
    assert.strictEqual(typeof res.score, 'number', 'score is a number');
    assert.ok(res.score >= 0, 'score is non-negative');
    assert.ok(score + res.score >= score, 'cumulative score never decreases');
    assert.ok(Array.isArray(res.trace), 'move returns a trace');
    score += res.score;
    state = { board: res.board, pendingSpawn: res.pendingSpawn };
    moves++;
    const count = tileCount(state.board);
    assert.ok(count >= 1 && count <= SIZE * SIZE, `after move ${moves} tile count ${count} stays in bounds`);
    if (game.isGameOver(state.board)) {
      const noop = game.move(state, dir, rng);
      assert.strictEqual(noop.moved, false, 'game-over board cannot move');
      state = game.newGame(rng);
      games++;
    }
  }
  assert.ok(moves === 500, `exactly 500 moves executed (got ${moves})`);
  assert.ok(games >= 1, 'game-over path exercised (fresh game started)');
});

test('SMOKE: game over detected on a full immovable board', () => {
  const board = boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1]
  ]);
  assert.strictEqual(game.isGameOver(board), true, 'full board with no merges is game over');
});

test('SMOKE: empty board is never game over', () => {
  assert.strictEqual(game.isGameOver(emptyBoard()), false, 'empty board is playable');
});
