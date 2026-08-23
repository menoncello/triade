import { test } from 'node:test';
import assert from 'node:assert';
import { newGame, move, isGameOver } from '../../src/engine/core/index.ts';
import type { Direction, GameState } from '../../src/engine/core/index.ts';
import { applyMove, initialScore } from '../../src/game/matchScore.ts';
import { GameE2ETestFixture } from '../../test-utils/e2e/GameE2ETestFixture.ts';
import { scenario } from '../../test-utils/e2e/scenarioBuilder.ts';
import { mulberry32 } from '../../src/utils/mulberry32.ts';

test('smoke: new game starts successfully with a valid board', () => {
  const state: GameState = newGame(mulberry32(1));
  const board = state.board;
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) {
        assert.ok(Number.isInteger(cell) && cell > 0, `spawned tile must be positive integer, got ${cell}`);
        count++;
      }
    }
  }
  assert.strictEqual(count, 9, 'new game spawns exactly 9 tiles');
  assert.strictEqual(isGameOver(state.board), false, 'fresh board is never game over');
});

test('smoke: core gameplay loop executes without crash over a full session', () => {
  const dirs: Direction[] = ['left', 'up', 'right', 'down'];
  let state = newGame(mulberry32(2026));
  let match = initialScore(0);
  for (let i = 0; i < 200 && !isGameOver(state.board); i++) {
    const result = move(state, dirs[i % 4], mulberry32(i + 50000));
    if (result.moved) {
      state = { board: result.board, pendingSpawn: result.pendingSpawn };
      match = applyMove(match, result);
    }
    assert.strictEqual(result.board.length, 4, 'board stays 4x4 every turn');
    assert.ok(result.score >= 0, 'per-move score never negative');
  }
  assert.ok(match.best >= match.score, 'live best dominates score');
});

test('smoke: session launches, plays moves and persists the record end-to-end', async () => {
  const fixture = await scenario().withSeed(20260808).withPersistedBest(0).launch();
  try {
    const dirs = ['left', 'up', 'right', 'down'] as const;
    for (let i = 0; i < 20 && !fixture.gameOver; i++) {
      if (fixture.input.swipeDirection(dirs[i % 4])) fixture.settle();
    }
    await fixture.syncPersistence();
    const snap = fixture.snapshot();
    assert.ok(snap.ready, 'session ready after launch');
    assert.ok(snap.match.best >= snap.match.score, 'best tracks score');
    assert.ok(fixture.occupiedCount >= 9, 'board populated throughout session');
  } finally {
    await fixture.teardown();
  }
});
