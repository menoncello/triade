import { test } from 'node:test';
import assert from 'node:assert';
import { newGame, move, isGameOver } from '../../src/engine/core/index.ts';
import type { Direction } from '../../src/engine/core/index.ts';
import { mulberry32 } from '../../src/utils/mulberry32.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';
import type { Board } from '../../src/engine/core/index.ts';
import { oppositeEdgeCandidates } from '../../test-utils/helpers.ts';
import { GameE2ETestFixture } from '../../test-utils/e2e/GameE2ETestFixture.ts';
import { scenario } from '../../test-utils/e2e/scenarioBuilder.ts';

const eligibleOppositeCells = oppositeEdgeCandidates;

// Story 12.1 smoke — critical-path with the directional-spawn invariant.
// Must run in <5s total and validate that the game launches, loops, and
// persists while never violating "spawn on opposite edge of a moved line".

test('smoke: game launches without crash — board valid, not game over, 9 tiles', () => {
  const state = newGame(mulberry32(1));
  assert.strictEqual(state.board.length, GRID_SIZE);
  for (let r = 0; r < GRID_SIZE; r++) assert.strictEqual(state.board[r].length, GRID_SIZE);
  let count = 0;
  for (const row of state.board) for (const v of row) if (v !== null) count++;
  assert.strictEqual(count, 9, 'new game must spawn exactly 9 tiles');
  assert.strictEqual(isGameOver(state.board), false, 'fresh board is never game over');
  assert.ok(state.pendingSpawn && typeof state.pendingSpawn.value === 'number');
  assert.ok(state.pendingSpawn.displayRoll >= 0 && state.pendingSpawn.displayRoll < 1);
});

test('smoke: main menu is navigable — fixture hydrates best and board is ready', async () => {
  const fixture = await scenario().withSeed(42).withPersistedBest(100).launch();
  try {
    const snap = fixture.snapshot();
    assert.strictEqual(snap.ready, true, 'session ready after launch (navigable)');
    assert.strictEqual(snap.hydrationOk, true, 'hydration ok (no corrupt state blocking launch)');
    assert.ok(snap.board.length === GRID_SIZE, 'board rendered after launch');
  } finally {
    await fixture.teardown();
  }
});

test('smoke: new game starts successfully — fixture fresh state is playable', async () => {
  const fixture = await GameE2ETestFixture.launch({ seed: 20260808 });
  try {
    assert.strictEqual(fixture.snapshot().ready, true);
    assert.strictEqual(fixture.occupiedCount, 9);
    assert.strictEqual(fixture.gameOver, false);
    // First move in any direction that is effective should produce a directional spawn
    const beforeBoard: Board = fixture.board.map((r) => r.slice());
    const beforePending = fixture.pendingSpawn;
    // Try directions until one is effective
    let effectiveDir: Direction | null = null;
    for (const dir of ['left', 'up', 'right', 'down'] as const) {
      const boardCopy = beforeBoard.map((r) => r.slice());
      // Simulate without fixture to find an effective dir quickly (pure engine, no fixture needed)
      const testState = { board: boardCopy, pendingSpawn: beforePending };
      const res = move(testState, dir, mulberry32(999));
      if (res.moved) {
        effectiveDir = dir;
        break;
      }
    }
    // If no effective dir from this board (rare but possible), just assert the game can start (smoke doesn't fail)
    if (effectiveDir) {
      const eligible = eligibleOppositeCells(beforeBoard, effectiveDir);
      assert.ok(eligible.length > 0, `effective dir ${effectiveDir} must have at least one eligible opposite-edge cell`);
    }
  } finally {
    await fixture.teardown();
  }
});

test('smoke: core gameplay loop executes 200 moves with directional spawn invariant (critical path)', () => {
  const rng = mulberry32(20260808);
  let state = newGame(rng);
  const dirs: Direction[] = ['left', 'up', 'right', 'down'];
  let effective = 0;
  let offEdge = 0;
  for (let i = 0; i < 200; i++) {
    if (isGameOver(state.board)) {
      // New game on game over — still critical path
      state = newGame(rng);
      assert.strictEqual(isGameOver(state.board), false, 'fresh game after game-over must be playable');
      continue;
    }
    const dir = dirs[i % 4];
    const beforeBoard: Board = state.board.map((r) => r.slice());
    const beforePending = state.pendingSpawn;
    const eligible = eligibleOppositeCells(beforeBoard, dir);
    const result = move(state, dir, rng);
    assert.strictEqual(result.board.length, GRID_SIZE, `move ${i} board stays 4x4`);
    assert.ok(result.score >= 0, `move ${i} score non-negative`);
    assert.ok(Array.isArray(result.trace), `move ${i} trace is array`);
    if (result.moved) {
      effective++;
      // Every effective move must have at least one eligible opposite-edge cell (AC4)
      assert.ok(eligible.length > 0, `effective ${dir} move #${effective} must have non-empty candidate set`);
      const spawned = result.trace.find((e) => e.spawned);
      assert.ok(spawned, `effective move #${effective} must have spawned trace entry`);
      const isOnEligible = eligible.some(([r, c]) => r === spawned!.to[0] && c === spawned!.to[1]);
      if (!isOnEligible) offEdge++;
      assert.strictEqual(spawned!.value, beforePending.value, 'spawn value equals pre-resolved pending');
      // Board has the spawn at the announced cell
      assert.strictEqual(result.board[spawned!.to[0]][spawned!.to[1]], beforePending.value);
      // PendingSpawn for next turn is a fresh random (value + displayRoll)
      assert.ok(result.pendingSpawn.value >= 1);
      assert.ok(result.pendingSpawn.displayRoll >= 0 && result.pendingSpawn.displayRoll < 1);
    } else {
      // NOOP: no spawn, 0 extra draw semantics are inside move; just verify shape
      assert.strictEqual(result.trace.filter((e) => e.spawned).length, 0, `noop ${dir} must not spawn`);
      assert.deepStrictEqual(result.pendingSpawn, beforePending, 'noop keeps pendingSpawn');
    }
    state = { board: result.board, pendingSpawn: result.pendingSpawn };
    // Board occupancy stays within 1..16
    let occ = 0;
    for (const row of state.board) for (const v of row) if (v !== null) occ++;
    assert.ok(occ >= 1 && occ <= 16, `move ${i} occupancy ${occ} in bounds`);
  }
  assert.ok(effective >= 20, `200 moves should yield >=20 effective moves (got ${effective})`);
  assert.strictEqual(offEdge, 0, `no spawn ever off the moved-line opposite edge (${offEdge} violations)`);
});

test('smoke: save/load works — best round-trips through fixture persistence gate', async () => {
  const fixture = await scenario().withSeed(99).withPersistedBest(10).launch();
  try {
    // Play a few moves to possibly beat the record
    const dirs: Direction[] = ['left', 'up', 'right', 'down'];
    for (let i = 0; i < 20 && !fixture.gameOver; i++) {
      if (fixture.input.swipeDirection(dirs[i % 4])) fixture.settle();
    }
    const beforeBest = fixture.best;
    const saved = await fixture.syncPersistence();
    const snap = fixture.snapshot();
    if (beforeBest > 10) {
      assert.strictEqual(saved, true, 'record that beats session-start must persist');
      assert.strictEqual(snap.persistedBest, beforeBest, 'persistedBest mirrors live best after save');
    } else {
      assert.strictEqual(saved, false, 'no persistence when best does not beat session-start');
    }
    // Corrupt hydration blocks persistence (engine-never-throws posture)
    await fixture.teardown();
    const degraded = await scenario().withSeed(5).withPersistedBest('not-a-number').launch();
    try {
      assert.strictEqual(degraded.snapshot().hydrationOk, false, 'corrupt best degrades hydration');
      const blocked = await degraded.syncPersistence();
      assert.strictEqual(blocked, false, 'degraded hydration must block persistence');
    } finally {
      await degraded.teardown();
    }
  } finally {
    // fixture may already be torn down in the degraded branch scope; ensure cleanup
    try {
      await fixture.teardown();
    } catch {}
  }
});

test('smoke: effective-move 3-draw budget holds across a 50-move session (directional path)', () => {
  let state = newGame(mulberry32(555));
  const dirs: Direction[] = ['left', 'up', 'right', 'down'];
  for (let i = 0; i < 50; i++) {
    const dir = dirs[i % 4];
    const beforePending = state.pendingSpawn;
    // Use a spy to count draws for a single move
    let draws = 0;
    const countingRng = (() => {
      let n = 0;
      const fn = () => {
        draws++;
        return 0.5; // dummy
      };
      return fn;
    })();
    // Need to know if move is effective without consuming the counting rng first,
    // so probe with a non-counting rng
    const probeRng = mulberry32(1000 + i);
    const probeBoard: Board = state.board.map((r) => r.slice());
    const probeState = { board: probeBoard, pendingSpawn: beforePending };
    // We can't cleanly probe without side effects; instead run the real move with counting and check moved flag
    const result = move(state, dir, countingRng);
    if (result.moved) {
      assert.strictEqual(draws, 3, `effective ${dir} move must consume exactly 3 draws (cell, next value, displayRoll)`);
    } else {
      assert.strictEqual(draws, 0, `noop ${dir} must consume 0 draws`);
    }
    // Advance state with a real rng for next iteration's board
    if (result.moved) {
      state = { board: result.board, pendingSpawn: result.pendingSpawn };
    }
  }
});
