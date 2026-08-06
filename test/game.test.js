'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const game = require('../js/game.js');

const SIZE = 4;

function emptyBoard() {
  const b = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) row.push(null);
    b.push(row);
  }
  return b;
}

// Deterministic rng: returns the provided values in order, then 0.5.
function rngOf(...values) {
  let i = 0;
  return () => {
    const v = values[i++];
    return v === undefined ? 0.5 : v;
  };
}

// A row of [3,6,12,24] never merges or slides under any axis collapse,
// so tests can focus on the row under test.
function staticBoard(row) {
  const b = emptyBoard();
  b[0] = row.slice();
  for (let r = 1; r < SIZE; r++) b[r] = [3, 6, 12, 24];
  return b;
}

function boardWith(matrix) {
  const b = emptyBoard();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (matrix[r][c] !== null && matrix[r][c] !== undefined) b[r][c] = matrix[r][c];
    }
  }
  return b;
}

test('newGame returns a board with exactly 9 starting tiles', () => {
  const rng = rngOf(
    0, 0, // fill 16 cells from index 0
    0, 0, 0, 0, 0, 0, 0, 0, 0 // 9 values, each roll 0 -> 1
  );
  const board = game.newGame(rng);
  let count = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== null) count++;
    }
  }
  assert.strictEqual(count, 9);
});

test('weightedValue respects 40/40/20 distribution', () => {
  assert.strictEqual(game.weightedValue(rngOf(0.39)), 1);
  assert.strictEqual(game.weightedValue(rngOf(0.40)), 2);
  assert.strictEqual(game.weightedValue(rngOf(0.79)), 2);
  assert.strictEqual(game.weightedValue(rngOf(0.80)), 3);
  assert.strictEqual(game.weightedValue(rngOf(0.999)), 3);
});

test('HAPPY_PATH: [1,2,_,_] swipe left -> [3,_,_,_] + spawn, score +3', () => {
  const board = staticBoard([1, 2, null, null]);
  const rng = rngOf(0, 0); // spawn at first empty cell (0,1), value 1
  const res = game.move(board, 'left', rng);
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 3);
  assert.deepStrictEqual(res.board[0], [3, 1, null, null]);
  for (let r = 1; r < SIZE; r++) {
    assert.deepStrictEqual(res.board[r], [3, 6, 12, 24]);
  }
});

test('MERGE_1_2: [2,1,_,_] swipe left -> [3,_,_,_] regardless of order', () => {
  const board = staticBoard([2, 1, null, null]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 3);
  assert.strictEqual(res.board[0][0], 3);
});

test('NO_1_1_MERGE: [1,1,_,_] swipe left -> [1,1,_,_], no merge, no spawn', () => {
  const board = staticBoard([1, 1, null, null]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, false);
  assert.strictEqual(res.score, 0);
  assert.deepStrictEqual(res.board[0], [1, 1, null, null]);
});

test('NO_2_2_MERGE: [2,2,_,_] swipe left -> [2,2,_,_], no merge, no spawn', () => {
  const board = staticBoard([2, 2, null, null]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, false);
  assert.strictEqual(res.score, 0);
  assert.deepStrictEqual(res.board[0], [2, 2, null, null]);
});

test('EQUAL_GE3: [3,3,3,3] swipe left -> [6,3,3,_], one merge, score +6', () => {
  const board = staticBoard([3, 3, 3, 3]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 6);
  // wall 3 merges with next 3; trailing 3s shift one cell
  assert.deepStrictEqual(res.board[0], [6, 3, 3, 1]); // spawn at (0,3)
});

test('NEW_TILE_NOT_REMERGED: [1,2,3,_] swipe left -> [3,3,_,_] (new 3 does not merge with trailing 3)', () => {
  const board = staticBoard([1, 2, 3, null]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 3);
  // 1+2 merge at the wall; the trailing 3 advances one cell into the gap
  assert.deepStrictEqual(res.board[0], [3, 3, 1, null]); // spawn at (0,2)
});

test('EQUAL_GE3 cascades are blocked: [3,3,6,_] -> [6,6,_,_] not [12,...]', () => {
  const board = staticBoard([3, 3, 6, null]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.score, 6);
  assert.deepStrictEqual(res.board[0], [6, 6, 1, null]); // spawn at (0,2)
});

test('ONE_CELL: [3,_,3,_] swipe left -> [3,3,_,_] (each moves one cell, no merge)', () => {
  const board = staticBoard([3, null, 3, null]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 0);
  assert.deepStrictEqual(res.board[0], [3, 3, 1, null]); // spawn at (0,2)
});

test('ONE_CELL: [_,3,_,3] swipe left -> [3,_,3,_] (both advance one cell)', () => {
  const board = staticBoard([null, 3, null, 3]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 0);
  assert.deepStrictEqual(res.board[0], [3, 1, 3, null]); // spawn at (0,1)
});

test('ONE_CELL right: [3,3,3,_] swipe right -> [_,3,3,3] (no merge, space at wall)', () => {
  const board = staticBoard([3, 3, 3, null]);
  const res = game.move(board, 'right', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 0);
  assert.deepStrictEqual(res.board[0], [1, 3, 3, 3]); // spawn at (0,0)
});

test('ONE_CELL right: [2,1,2,1] swipe right -> [_,2,1,3] (2 merges into wall 1, others shift)', () => {
  const board = staticBoard([2, 1, 2, 1]);
  const res = game.move(board, 'right', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 3);
  assert.deepStrictEqual(res.board[0], [1, 2, 1, 3]); // spawn at (0,0)
});

test('NOOP_SWIPE: full grid with no merges, swipe left changes nothing', () => {
  const board = boardWith([
    [1, 3, 6, 12],
    [1, 3, 6, 12],
    [1, 3, 6, 12],
    [1, 3, 6, 12]
  ]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, false);
  assert.strictEqual(res.score, 0);
  assert.deepStrictEqual(res.board, board);
});

test('move to the right mirrors the left rules', () => {
  const board = staticBoard([null, null, 2, 1]);
  const res = game.move(board, 'right', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 3);
  // [_,_,2,1] swipe right -> [_,_,_,3]; empty cells are (0,0),(0,1),(0,2),
  // spawn at index 0 -> (0,0) with value 1
  assert.deepStrictEqual(res.board[0], [1, null, null, 3]);
});

test('move up mirrors the left rules on columns', () => {
  const board = emptyBoard();
  board[0][0] = 2;
  board[1][0] = 1;
  board[2][0] = 3;
  board[3][0] = 6;
  // column 0 = [2,1,3,6], swipe up -> [3,3,6,_]: 2+1 merge, then 3 and 6 shift
  const res = game.move(board, 'up', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 3);
  assert.strictEqual(res.board[0][0], 3);
  assert.strictEqual(res.board[1][0], 3);
  assert.strictEqual(res.board[2][0], 6);
  assert.strictEqual(res.board[3][0], null);
});

test('spawn happens exactly once, in a uniformly random empty cell, after an effective move', () => {
  const board = staticBoard([1, 2, null, null]);
  let calls = 0;
  const rng = () => {
    calls++;
    return calls === 1 ? 0.99 : 0; // index = floor(0.99*3)=2 -> cell (0,3); then value 1
  };
  const res = game.move(board, 'left', rng);
  assert.strictEqual(calls, 2);
  assert.strictEqual(res.board[0][3], 1);
  assert.strictEqual(res.board[0][0], 3);
  assert.strictEqual(res.board[0][1], null);
});

test('GAME_OVER: full grid with no adjacent mergeable pair reports game over', () => {
  const board = boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1]
  ]);
  assert.strictEqual(game.isGameOver(board), true);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, false);
  assert.strictEqual(res.score, 0);
});

test('GAME_OVER is false when any empty cell exists', () => {
  const board = boardWith([
    [1, 3, 6, null],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1]
  ]);
  assert.strictEqual(game.isGameOver(board), false);
});

test('GAME_OVER is false when 1 is adjacent to 2 in a row', () => {
  const board = boardWith([
    [1, 2, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1]
  ]);
  assert.strictEqual(game.isGameOver(board), false);
});

test('GAME_OVER is false when 1 is adjacent to 2 in a column', () => {
  const board = boardWith([
    [1, 3, 6, 12],
    [2, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1]
  ]);
  assert.strictEqual(game.isGameOver(board), false);
});

test('GAME_OVER is false when two equal tiles >= 3 are adjacent', () => {
  const board = boardWith([
    [3, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1]
  ]);
  assert.strictEqual(game.isGameOver(board), false);
});

test('higher merges: equal tiles >= 3 merge and score by value', () => {
  const board = staticBoard([12, 12, null, null]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 24);
  assert.strictEqual(res.board[0][0], 24);
});

test('trace: merged tile records both sources, spawn is flagged spawned', () => {
  const board = staticBoard([1, 2, 3, null]);
  const res = game.move(board, 'left', rngOf(0, 0));
  const merged = res.trace.find(t => t.value === 3 && !t.spawned);
  assert.ok(merged, 'merged 3 present in trace');
  assert.deepStrictEqual(merged.from, [[0, 0], [0, 1]]);
  assert.deepStrictEqual(merged.to, [0, 0]);
  const advanced = res.trace.find(t => t.value === 3 && !t.spawned && t.to[0] === 0 && t.to[1] === 1);
  assert.deepStrictEqual(advanced.from, [[0, 2]]);
  const spawned = res.trace.find(t => t.spawned);
  assert.ok(spawned, 'spawned tile present in trace');
  assert.deepStrictEqual(spawned.from, []);
  assert.deepStrictEqual(spawned.to, [0, 2]);
  assert.strictEqual(spawned.value, 1);
});

test('trace: wall merge recorded, trailing tile advances', () => {
  const board = staticBoard([3, 3, 3, null]);
  const res = game.move(board, 'left', rngOf(0, 0));
  const merged = res.trace.find(t => t.value === 6);
  assert.deepStrictEqual(merged.from, [[0, 0], [0, 1]]);
  assert.deepStrictEqual(merged.to, [0, 0]);
  const advanced = res.trace.find(t => t.value === 3 && !t.spawned && t.to[0] === 0 && t.to[1] === 1);
  assert.deepStrictEqual(advanced.from, [[0, 2]]);
});

test('trace: noop move produces no spawned entry', () => {
  const board = boardWith([
    [1, 3, 6, 12],
    [1, 3, 6, 12],
    [1, 3, 6, 12],
    [1, 3, 6, 12]
  ]);
  const res = game.move(board, 'left', rngOf(0, 0));
  assert.strictEqual(res.moved, false);
  assert.strictEqual(res.trace.filter(t => t.spawned).length, 0);
});
