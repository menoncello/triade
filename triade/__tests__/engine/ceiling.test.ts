import { test } from 'node:test';
import assert from 'node:assert';
import { ceilingDetector, tierForCeiling } from '../../src/engine/core/index.ts';
import { SIZE, emptyBoard, boardWith } from '../../test-utils/helpers.ts';

test('empty board -> ceilingDetector returns 0 -> tier 0', () => {
  const board = emptyBoard();
  assert.strictEqual(ceilingDetector(board), 0);
  assert.strictEqual(tierForCeiling(ceilingDetector(board)), 0);
});

test('ceilingDetector returns the actual largest tile on the board', () => {
  const board = boardWith([
    [3, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, 768],
  ]);
  assert.strictEqual(ceilingDetector(board), 768);
});

test('ceilingDetector covers every cell (not just first row/column)', () => {
  const board = boardWith([
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, 384],
  ]);
  assert.strictEqual(ceilingDetector(board), 384);
});

test('tierForCeiling maps every boundary to its enumerated tier', () => {
  assert.strictEqual(tierForCeiling(24), 0);
  assert.strictEqual(tierForCeiling(47), 0);
  assert.strictEqual(tierForCeiling(48), 1);
  assert.strictEqual(tierForCeiling(95), 1);
  assert.strictEqual(tierForCeiling(96), 2);
  assert.strictEqual(tierForCeiling(191), 2);
  assert.strictEqual(tierForCeiling(192), 3);
  assert.strictEqual(tierForCeiling(383), 3);
  assert.strictEqual(tierForCeiling(384), 4);
  assert.strictEqual(tierForCeiling(767), 4);
  assert.strictEqual(tierForCeiling(768), 5);
  assert.strictEqual(tierForCeiling(1536), 6);
  assert.strictEqual(tierForCeiling(3072), 7);
  assert.strictEqual(tierForCeiling(6144), 8);
});

test('board max at each boundary yields the correct tier (AC 1, 2, 4)', () => {
  const cases: Array<[number, number]> = [
    [24, 0],
    [48, 1],
    [96, 2],
    [192, 3],
    [384, 4],
    [768, 5],
    [1536, 6],
  ];
  for (const [maxValue, expectedTier] of cases) {
    const board = boardWith([
      [maxValue, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    assert.strictEqual(ceilingDetector(board), maxValue);
    assert.strictEqual(tierForCeiling(ceilingDetector(board)), expectedTier);
  }
});
