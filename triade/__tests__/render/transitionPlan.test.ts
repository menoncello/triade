import { test } from 'node:test';
import assert from 'node:assert';
import * as game from '../../src/engine/core/index.ts';
import { SIZE, emptyBoard, rngOf, boardWith, mulberry32, assertNoLeak, gameState } from '../../test-utils/helpers.ts';
import { planTileTransitions } from '../../src/render/transitionPlan.ts';

const DIRECTIONS = ['left', 'right', 'up', 'down'] as const;

function boardOf(...rows: Array<Array<number | null>>) {
  const b = emptyBoard();
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < SIZE; c++) {
      b[r][c] = rows[r][c];
    }
  }
  return b;
}

test('planTileTransitions: slide left maps the moving tile from source to dest', () => {
  const board = boardOf([null, null, 2, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  assert.deepStrictEqual(plan, [
    { type: 'slide', value: 2, to: [0, 1], from: [[0, 2]] },
    { type: 'spawn', value: 1, to: [0, 3], from: [] }
  ]);
});

test('planTileTransitions: slide right maps the moving tile from source to dest', () => {
  const board = boardOf([null, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'right', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  assert.deepStrictEqual(plan, [
    { type: 'slide', value: 2, to: [0, 2], from: [[0, 1]] },
    { type: 'spawn', value: 1, to: [0, 0], from: [] }
  ]);
});

test('planTileTransitions: slide up maps the moving tile from source to dest', () => {
  const board = boardOf([null, null, null, null], [null, 9, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'up', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  assert.deepStrictEqual(plan, [
    { type: 'slide', value: 9, to: [0, 1], from: [[1, 1]] },
    { type: 'spawn', value: 1, to: [3, 1], from: [] }
  ]);
});

test('planTileTransitions: slide down maps the moving tile from source to dest', () => {
  const board = boardOf([null, 9, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'down', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  assert.deepStrictEqual(plan, [
    { type: 'slide', value: 9, to: [1, 1], from: [[0, 1]] },
    { type: 'spawn', value: 1, to: [0, 1], from: [] }
  ]);
});

test('planTileTransitions: merge 1+2 converges two sources to dest with merged value', () => {
  const board = boardOf([1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  assert.deepStrictEqual(plan, [
    { type: 'merge', value: 3, to: [0, 0], from: [[0, 0], [0, 1]] },
    { type: 'spawn', value: 1, to: [0, 3], from: [] }
  ]);
});

test('planTileTransitions: merge 2+1 (reversed order) converges the same two sources', () => {
  const board = boardOf([2, 1, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  assert.deepStrictEqual(plan, [
    { type: 'merge', value: 3, to: [0, 0], from: [[0, 0], [0, 1]] },
    { type: 'spawn', value: 1, to: [0, 3], from: [] }
  ]);
});

test('planTileTransitions: merge equal >=3 doubles the value at dest', () => {
  const board = boardOf([3, 3, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  assert.deepStrictEqual(plan, [
    { type: 'merge', value: 6, to: [0, 0], from: [[0, 0], [0, 1]] },
    { type: 'spawn', value: 1, to: [0, 3], from: [] }
  ]);
});

test('planTileTransitions: stationary tiles become hold transitions in a partial move', () => {
  const board = boardOf([2, null, null, null], [null, 3, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  assert.deepStrictEqual(plan, [
    { type: 'hold', value: 2, to: [0, 0], from: [[0, 0]] },
    { type: 'slide', value: 3, to: [1, 0], from: [[1, 1]] },
    { type: 'spawn', value: 1, to: [1, 3], from: [] }
  ]);
});

test('planTileTransitions: noop move (moved:false) yields an empty plan even though trace has entries', () => {
  const board = boardOf([2, 3, 6, 12], [3, 6, 12, 24], [3, 6, 12, 24], [3, 6, 12, 24]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, false);
  assert.ok(result.trace.length > 0, 'trace still describes the stationary board');
  assert.deepStrictEqual(planTileTransitions(board, result), []);
});

test('planTileTransitions: no 1+1 merge is a noop with an empty plan', () => {
  const board = boardOf([1, 1, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, false);
  assert.deepStrictEqual(planTileTransitions(board, result), []);
});

test('planTileTransitions: no 2+2 merge is a noop with an empty plan', () => {
  const board = boardOf([2, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, false);
  assert.deepStrictEqual(planTileTransitions(board, result), []);
});

test('planTileTransitions: spawn lands on the last empty cell [3,3]', () => {
  const board = boardOf([3, 6, 12, 24], [3, 6, 12, 24], [3, 6, 12, 24], [3, 6, null, 12]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  const spawn = plan.find((t) => t.type === 'spawn');
  assert.ok(spawn, 'effective move must spawn');
  assert.deepStrictEqual(spawn.to, [3, 3], 'spawn must land on the sole empty cell [3,3]');
});

test('planTileTransitions: the plan derives from result.trace only, never from prevBoard values (AC-1/AC-6)', () => {
  const cases: Array<{ board: ReturnType<typeof boardOf>; dir: (typeof DIRECTIONS)[number] }> = [
    { board: boardOf([1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]), dir: 'left' },
    { board: boardOf([2, null, null, null], [null, 3, null, null], [null, null, null, null], [null, null, null, null]), dir: 'left' },
    { board: boardOf([2, 3, 6, 12], [3, 6, 12, 24], [3, 6, 12, 24], [3, 6, 12, 24]), dir: 'left' }
  ];
  const unrelatedBoards = [
    boardOf([24, 12, 6, 3], [3, 6, 12, 24], [12, 3, 24, 6], [6, 24, 3, 12]),
    emptyBoard()
  ];
  for (const { board, dir } of cases) {
    const result = game.move(gameState(board), dir, rngOf(0, 0));
    const expected = planTileTransitions(board, result);
    for (const wrong of unrelatedBoards) {
      assert.deepStrictEqual(
        planTileTransitions(wrong, result),
        expected,
        `plan must be identical regardless of prevBoard values (dir=${dir})`
      );
    }
  }
});

test('planTileTransitions: full-board merge-once produces merges, slides, and one spawn', () => {
  const board = boardOf([3, 3, 3, 3], [3, 3, 3, 3], [3, 3, 3, 3], [3, 3, 3, 3]);
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  const merges = plan.filter((t) => t.type === 'merge');
  const slides = plan.filter((t) => t.type === 'slide');
  const spawns = plan.filter((t) => t.type === 'spawn');
  assert.strictEqual(merges.length, 4, 'one merge per row');
  assert.strictEqual(slides.length, 8, 'two slides per row');
  assert.strictEqual(spawns.length, 1, 'one spawn on a board with free cells');
  assert.strictEqual(plan.length, result.trace.length, 'every trace entry maps to exactly one transition');
});

test('planTileTransitions: 9-start-tile board plan covers every occupied cell (no-leak oracle)', () => {
  const board = game.newGame(mulberry32(20260808)).board;
  const result = game.move(gameState(board), 'left', rngOf(0, 0));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(board, result);
  assert.strictEqual(plan.length, result.trace.length, 'every trace entry maps to exactly one transition');
  assertNoLeak(plan, result.board);
});

test('planTileTransitions: resultingTiles is the no-leak oracle across random deterministic moves', () => {
  const rng = mulberry32(20260808);
  let board = game.newGame(rng).board;
  for (let i = 0; i < 200; i++) {
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    const result = game.move(gameState(board), dir, rng);
    const plan = planTileTransitions(board, result);
    if (result.moved) {
      assert.ok(plan.length > 0, `move ${i} (${dir}) moved but produced an empty plan`);
      assertNoLeak(plan, result.board);
    } else {
      assert.deepStrictEqual(plan, [], `move ${i} (${dir}) did not move but produced a non-empty plan`);
    }
    board = result.board;
    if (game.isGameOver(board)) board = game.newGame(rng).board;
  }
});
