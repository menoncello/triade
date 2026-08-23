import { test } from 'node:test';
import assert from 'node:assert';
import * as game from '../../src/engine/core/index.ts';
import { emptyBoard, boardWith, mulberry32, assertNoLeak, gameState } from '../../test-utils/helpers.ts';
import { planTileTransitions } from '../../src/render/transitionPlan.ts';

const DIRECTIONS = ['left', 'right', 'up', 'down'] as const;
const TRANSITION_TYPES = ['slide', 'merge', 'spawn', 'hold'] as const;

test('SMOKE: fresh game board plans every starting tile as a hold transition (no leak on first render)', () => {
  const state = game.newGame(mulberry32(20260808));
  const result = game.move(state, 'left', mulberry32(20260809));
  assert.strictEqual(result.moved, true);
  const plan = planTileTransitions(state.board, result);
  assert.strictEqual(plan.length, result.trace.length, 'every trace entry maps to a transition');
  assertNoLeak(plan, result.board);
});

test('SMOKE: render critical path — 500 deterministic moves never leak and never produce an empty plan on a move', () => {
  const rng = mulberry32(20260808);
  let state = game.newGame(rng);
  let moved = 0;
  let games = 0;
  for (let i = 0; i < 500; i++) {
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    const result = game.move(state, dir, rng);
    const plan = planTileTransitions(state.board, result);
    if (result.moved) {
      moved++;
      assert.strictEqual(plan.length, result.trace.length, `move ${i} (${dir}): every trace entry maps to a transition`);
      assert.ok(plan.length > 0, `move ${i} (${dir}) moved but produced an empty plan`);
      assertNoLeak(plan, result.board);
      for (const t of plan) {
        assert.ok(TRANSITION_TYPES.includes(t.type), `move ${i}: unknown transition type ${t.type}`);
      }
    } else {
      assert.deepStrictEqual(plan, [], `move ${i} (${dir}) did not move but produced a non-empty plan`);
    }
    state = { board: result.board, pendingSpawn: result.pendingSpawn };
    if (game.isGameOver(state.board)) {
      state = game.newGame(rng);
      games++;
    }
  }
  assert.ok(moved > 0, 'critical path includes effective moves');
  assert.ok(games >= 1, 'game-over path exercised (fresh game started)');
});

test('SMOKE: a full-game session exercises every transition type at least once', () => {
  const rng = mulberry32(424242);
  let state = game.newGame(rng);
  const seen = new Set<string>();
  for (let i = 0; i < 400 && seen.size < 4; i++) {
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    const result = game.move(state, dir, rng);
    const plan = planTileTransitions(state.board, result);
    for (const t of plan) seen.add(t.type);
    state = { board: result.board, pendingSpawn: result.pendingSpawn };
    if (game.isGameOver(state.board)) state = game.newGame(rng);
  }
  for (const type of TRANSITION_TYPES) {
    assert.ok(seen.has(type), `full-game session never produced a '${type}' transition`);
  }
});

test('SMOKE: full immovable board plans empty (no animation on a dead board)', () => {
  const board = boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1]
  ]);
  const result = game.move(gameState(board), 'left', mulberry32(1));
  assert.strictEqual(result.moved, false);
  assert.deepStrictEqual(planTileTransitions(board, result), [], 'dead board must not animate');
});

test('SMOKE: empty board plans empty and never animates', () => {
  const board = emptyBoard();
  const result = game.move(gameState(board), 'left', mulberry32(1));
  assert.strictEqual(result.moved, false);
  assert.deepStrictEqual(planTileTransitions(board, result), []);
});
