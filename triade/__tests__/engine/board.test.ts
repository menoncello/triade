import { test } from 'node:test';
import assert from 'node:assert';
import { emptyBoard, boardsEqual } from '../../src/engine/core/board.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';

test('emptyBoard is a GRID_SIZE x GRID_SIZE matrix of nulls', () => {
  const b = emptyBoard();
  assert.strictEqual(b.length, GRID_SIZE);
  for (let r = 0; r < GRID_SIZE; r++) {
    assert.strictEqual(b[r].length, GRID_SIZE);
    for (let c = 0; c < GRID_SIZE; c++) {
      assert.strictEqual(b[r][c], null);
    }
  }
});

test('emptyBoard returns independent rows (no shared references)', () => {
  const a = emptyBoard();
  const b = emptyBoard();
  a[0][0] = 3;
  assert.strictEqual(b[0][0], null);
});

test('boardsEqual: two empty boards are equal', () => {
  assert.strictEqual(boardsEqual(emptyBoard(), emptyBoard()), true);
});

test('boardsEqual: a board with one tile differs from an empty one', () => {
  const filled = emptyBoard();
  filled[1][2] = 6;
  assert.strictEqual(boardsEqual(filled, emptyBoard()), false);
  assert.strictEqual(boardsEqual(emptyBoard(), filled), false);
});

test('boardsEqual: identical non-empty boards are equal', () => {
  const a = emptyBoard();
  const b = emptyBoard();
  a[0][0] = 1;
  a[3][3] = 24;
  b[0][0] = 1;
  b[3][3] = 24;
  assert.strictEqual(boardsEqual(a, b), true);
});

test('boardsEqual: same tiles, different positions are not equal', () => {
  const a = emptyBoard();
  const b = emptyBoard();
  a[0][0] = 3;
  b[0][1] = 3;
  assert.strictEqual(boardsEqual(a, b), false);
});
