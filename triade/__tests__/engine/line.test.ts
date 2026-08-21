import { test } from 'node:test';
import assert from 'node:assert';
import { movementLines, shiftLine, boardFromLines } from '../../src/engine/core/line.ts';
import type { CellRef } from '../../src/engine/core/line.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';
import { staticBoard, boardWith, emptyBoard } from '../../test-utils/helpers.ts';

function refLine(...vs: Array<number | null>): CellRef[] {
  return vs.map((v, c) => ({ v, r: 0, c }));
}

function nullLine() {
  return Array.from({ length: GRID_SIZE }, () => ({ v: null, from: [] as Array<[number, number]> }));
}

function fullGrid(first: ReturnType<typeof shiftLine>['line']) {
  return [first, ...Array.from({ length: GRID_SIZE - 1 }, () => nullLine())];
}

test('movementLines left: rows preserved in reading order', () => {
  const b = emptyBoard();
  b[1][0] = 1;
  b[1][2] = 3;
  const lines = movementLines(b, 'left');
  assert.strictEqual(lines.length, GRID_SIZE);
  assert.deepStrictEqual(lines[1][0], { v: 1, r: 1, c: 0 });
  assert.deepStrictEqual(lines[1][1], { v: null, r: 1, c: 1 });
  assert.deepStrictEqual(lines[1][2], { v: 3, r: 1, c: 2 });
});

test('movementLines right: rows reversed so the wall is index 0', () => {
  const b = emptyBoard();
  b[0][0] = 1;
  b[0][3] = 5;
  const line = movementLines(b, 'right')[0];
  assert.deepStrictEqual(line[0], { v: 5, r: 0, c: 3 });
  assert.deepStrictEqual(line[3], { v: 1, r: 0, c: 0 });
});

test('movementLines up: columns top-to-bottom', () => {
  const b = emptyBoard();
  b[0][2] = 1;
  b[3][2] = 4;
  const line = movementLines(b, 'up')[2];
  assert.deepStrictEqual(line[0], { v: 1, r: 0, c: 2 });
  assert.deepStrictEqual(line[3], { v: 4, r: 3, c: 2 });
});

test('movementLines down: columns reversed so the wall is index 0', () => {
  const b = emptyBoard();
  b[0][2] = 1;
  b[3][2] = 4;
  const line = movementLines(b, 'down')[2];
  assert.deepStrictEqual(line[0], { v: 4, r: 3, c: 2 });
  assert.deepStrictEqual(line[3], { v: 1, r: 0, c: 2 });
});

test('shiftLine merges 1+2 into 3 at the wall', () => {
  const { line, score } = shiftLine(refLine(1, 2, null, null));
  assert.strictEqual(score, 3);
  assert.strictEqual(line[0].v, 3);
  assert.deepStrictEqual(line[0].from, [[0, 0], [0, 1]]);
  assert.deepStrictEqual(line[1], { v: null, from: [] });
});

test('shiftLine does NOT merge 1+1 or 2+2', () => {
  assert.strictEqual(shiftLine(refLine(1, 1, null, null)).score, 0);
  assert.strictEqual(shiftLine(refLine(2, 2, null, null)).score, 0);
  assert.deepStrictEqual(
    shiftLine(refLine(1, 1, null, null)).line.map((c) => c.v),
    [1, 1, null, null]
  );
});

test('shiftLine merges equal tiles >= 3', () => {
  const { line, score } = shiftLine(refLine(3, 3, null, null));
  assert.strictEqual(score, 6);
  assert.strictEqual(line[0].v, 6);
  assert.strictEqual(line[1].v, null);
});

test('shiftLine blocks cascade: [3,3,3,3] -> [6,3,3,null], score 6', () => {
  const { line, score } = shiftLine(refLine(3, 3, 3, 3));
  assert.strictEqual(score, 6);
  assert.deepStrictEqual(
    line.map((c) => c.v),
    [6, 3, 3, null]
  );
});

test('shiftLine shifts a lone tile toward the wall without merging', () => {
  const { line, score } = shiftLine(refLine(3, null, 3, null));
  assert.strictEqual(score, 0);
  assert.deepStrictEqual(
    line.map((c) => c.v),
    [3, 3, null, null]
  );
});

test('shiftLine keeps packed non-mergeable lines unchanged', () => {
  const { line, score } = shiftLine(refLine(1, 3, 6, 12));
  assert.strictEqual(score, 0);
  assert.deepStrictEqual(
    line.map((c) => c.v),
    [1, 3, 6, 12]
  );
});

test('shiftLine documents current gap behavior: [3,3,6,6] -> [6,6,6,null]', () => {
  const { line, score } = shiftLine(refLine(3, 3, 6, 6));
  assert.strictEqual(score, 6);
  assert.deepStrictEqual(
    line.map((c) => c.v),
    [6, 6, 6, null]
  );
});

test('boardFromLines left maps line index to column directly', () => {
  const { line } = shiftLine(refLine(1, 2, null, null));
  const { board } = boardFromLines(fullGrid(line), 'left');
  assert.strictEqual(board[0][0], 3);
  for (let c = 1; c < GRID_SIZE; c++) assert.strictEqual(board[0][c], null);
});

test('boardFromLines right maps line index to the mirrored column', () => {
  // pre-spawn result of row [_,_,2,1] swiped right: merged 3 at the rightmost column
  const { line } = shiftLine(refLine(1, 2, null, null));
  const { board } = boardFromLines(fullGrid(line), 'right');
  assert.strictEqual(board[0][GRID_SIZE - 1], 3);
  assert.strictEqual(board[0][0], null);
});

test('boardFromLines up maps line index to row', () => {
  const { line } = shiftLine(refLine(2, 1, 3, 6));
  const { board } = boardFromLines(fullGrid(line), 'up');
  assert.deepStrictEqual([board[0][0], board[1][0], board[2][0], board[3][0]], [3, 3, 6, null]);
});

test('boardFromLines down maps line index to the mirrored row', () => {
  const { line } = shiftLine(refLine(6, 3, 1, 2));
  const { board } = boardFromLines(fullGrid(line), 'down');
  assert.deepStrictEqual([board[0][0], board[1][0], board[2][0], board[3][0]], [null, 3, 3, 6]);
});

test('PIPELINE left: full board matches game.move pre-spawn result', () => {
  const board = staticBoard([1, 2, null, null]);
  const lines = movementLines(board, 'left');
  const shifted = lines.map((l) => shiftLine(l).line);
  const { board: result } = boardFromLines(shifted, 'left');
  assert.strictEqual(result[0][0], 3);
  for (let c = 1; c < GRID_SIZE; c++) assert.strictEqual(result[0][c], null);
  for (let r = 1; r < GRID_SIZE; r++) assert.deepStrictEqual(result[r], [3, 6, 12, 24]);
});

test('PIPELINE right: full board matches game.move pre-spawn result', () => {
  const board = emptyBoard();
  board[0][2] = 2;
  board[0][3] = 1;
  const lines = movementLines(board, 'right');
  const shifted = lines.map((l) => shiftLine(l).line);
  const { board: result } = boardFromLines(shifted, 'right');
  assert.strictEqual(result[0][GRID_SIZE - 1], 3);
  for (let c = 0; c < GRID_SIZE - 1; c++) assert.strictEqual(result[0][c], null);
});

test('PIPELINE up: column merge matches game.move pre-spawn result', () => {
  const board = emptyBoard();
  board[0][0] = 2;
  board[1][0] = 1;
  board[2][0] = 3;
  board[3][0] = 6;
  const lines = movementLines(board, 'up');
  const shifted = lines.map((l) => shiftLine(l).line);
  const { board: result } = boardFromLines(shifted, 'up');
  assert.deepStrictEqual([result[0][0], result[1][0], result[2][0], result[3][0]], [3, 3, 6, null]);
});

test('PIPELINE down: column merge matches game.move pre-spawn result', () => {
  const board = emptyBoard();
  board[0][0] = 2;
  board[1][0] = 1;
  board[2][0] = 3;
  board[3][0] = 6;
  const lines = movementLines(board, 'down');
  const shifted = lines.map((l) => shiftLine(l).line);
  const { board: result } = boardFromLines(shifted, 'down');
  assert.deepStrictEqual([result[0][0], result[1][0], result[2][0], result[3][0]], [null, 3, 3, 6]);
});
