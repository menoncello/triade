import { test } from 'node:test';
import assert from 'node:assert';
import { shiftLine, boardFromLines, movementLines } from '../../src/engine/core/line.ts';
import type { CellRef } from '../../src/engine/core/line.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';

function refLine(...vs: Array<number | null>): CellRef[] {
  return vs.map((v, c) => ({ v, r: 0, c }));
}

// DW-74 reverted: GDD one-cell — each tile moves at most one cell per swipe (Threes authentic)
test('DW-74 regression: [null,null,null,2] one-cell to [null,null,2,null]', () => {
  const { line, moved } = shiftLine(refLine(null, null, null, 2));
  assert.deepStrictEqual(line.map((c) => c.v), [null, null, 2, null]);
  assert.strictEqual(moved, true);
  assert.deepStrictEqual(line[2].from, [[0, 3]]);
});

test('DW-74 regression: [null,2,null,4] one-cell to [2,null,4,null]', () => {
  const { line } = shiftLine(refLine(null, 2, null, 4));
  assert.deepStrictEqual(line.map((c) => c.v), [2, null, 4, null]);
});

test('DW-74 regression: [null,null,3,null] one-cell to [null,3,null,null]', () => {
  const { line } = shiftLine(refLine(null, null, 3, null));
  assert.deepStrictEqual(line.map((c) => c.v), [null, 3, null, null]);
});

test('DW-74 regression: [null,null,null,null] stays empty without throw', () => {
  const { line, moved } = shiftLine(refLine(null, null, null, null));
  assert.deepStrictEqual(line.map((c) => c.v), [null, null, null, null]);
  assert.strictEqual(moved, false);
});

// DW-20: guard short inputs
test('DW-20 regression: shiftLine handles 1-element line without crash', () => {
  const single: CellRef[] = [{ v: 1, r: 0, c: 0 }];
  const { line, moved } = shiftLine(single);
  assert.strictEqual(line.length, 1);
  assert.strictEqual(line[0].v, 1);
  assert.strictEqual(moved, false);
});

test('DW-20 regression: shiftLine handles empty line without crash', () => {
  const { line, moved } = shiftLine([]);
  assert.strictEqual(line.length, 0);
  assert.strictEqual(moved, false);
});

test('DW-20 regression: shiftLine handles 2-element line with gap', () => {
  const { line } = shiftLine(refLine(null, 3).slice(0, 2));
  // refLine(null,3) length 2, compaction should give [3,null]
  assert.deepStrictEqual(line.map((c) => c.v), [3, null]);
});

test('DW-20 regression: boardFromLines handles short lines without crash', () => {
  const { line } = shiftLine(refLine(2, null, null, null));
  // pass only one line instead of GRID_SIZE lines
  const { board } = boardFromLines([line], 'left');
  assert.strictEqual(board[0][0], 2);
});

test('DW-20 regression: movementLines handles short board without crash', () => {
  const shortBoard = [[1]] as unknown as import('../../src/engine/core/types.ts').Board;
  const lines = movementLines(shortBoard, 'left');
  assert.strictEqual(lines.length, GRID_SIZE);
  assert.strictEqual(lines[0][0].v, 1);
  assert.strictEqual(lines[0][1].v, null);
});

// Preserve existing semantics: gap non-merge still holds after fix
test('preserve: [3,null,3,null] stays [3,3,null,null] score 0', () => {
  const { line, score } = shiftLine(refLine(3, null, 3, null));
  assert.deepStrictEqual(line.map((c) => c.v), [3, 3, null, null]);
  assert.strictEqual(score, 0);
});

test('preserve: [3,3,3,3] stays [6,3,3,null] score 6', () => {
  const { line, score } = shiftLine(refLine(3, 3, 3, 3));
  assert.deepStrictEqual(line.map((c) => c.v), [6, 3, 3, null]);
  assert.strictEqual(score, 6);
});
