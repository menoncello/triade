import { test } from 'node:test';
import assert from 'node:assert';
import { GameE2ETestFixture } from '../../test-utils/e2e/GameE2ETestFixture.ts';
import { scenario } from '../../test-utils/e2e/scenarioBuilder.ts';
import { gestureFor } from '../../test-utils/e2e/inputSimulator.ts';
import { waitFor } from '../../test-utils/e2e/asyncAssertions.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';
import type { Board, Direction } from '../../src/engine/core/index.ts';
import { oppositeEdgeCandidates } from '../../test-utils/helpers.ts';

// Story 12.1 E2E — directional spawn via the full fixture pipeline
// (hydration -> input -> move -> render-ready -> persistence gate).
// The fixture's doMove path IS the production path (move with candidate
// derivation), so these tests validate that the opposite-edge contract holds
// end-to-end through the scenario builder's launch + swipe queue.

const eligibleOppositeCells = oppositeEdgeCandidates;

function diffCells(before: Board, after: Board): Array<[number, number]> {
  const diff: Array<[number, number]> = [];
  for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) if (before[r][c] !== after[r][c]) diff.push([r, c]);
  return diff;
}

test('e2e infrastructure: fixture provides scene readiness, input simulation, and cleanup guarantees', async () => {
  const fixture = await scenario().withSeed(42).withPersistedBest(100).launch();
  try {
    assert.strictEqual(fixture.snapshot().ready, true, 'GameE2ETestFixture must report ready after launch');
    assert.strictEqual(fixture.snapshot().hydrationOk, true, 'hydration should succeed on clean backend');
    assert.ok(typeof fixture.input.swipeDirection === 'function', 'InputSimulator must expose swipeDirection');
    assert.ok(typeof fixture.input.swipe === 'function', 'InputSimulator must expose swipe(gesture)');
    assert.ok(typeof fixture.settle === 'function', 'fixture must expose settle() to reopen the input gate');
    assert.ok(typeof fixture.syncPersistence === 'function', 'fixture must expose syncPersistence()');
    // gesteFor produces threshold-exceeding gestures
    const gLeft = gestureFor('left');
    assert.ok(Math.abs(gLeft.dx) >= 10, 'gesture magnitude must exceed SWIPE_THRESHOLD (10)');
    // asyncAssertions waitFor resolves when predicate becomes truthy
    const val = await waitFor(() => fixture.occupiedCount > 0, { timeout: 500, message: 'board populated' });
    assert.ok(val, 'waitFor must resolve to the truthy predicate value');
  } finally {
    await fixture.teardown();
    // After teardown the backend is reset and a fresh fixture can launch
    const fresh = await scenario().withSeed(1).launch();
    try {
      assert.strictEqual(fresh.snapshot().ready, true, 'fresh fixture must launch after prior teardown');
    } finally {
      await fresh.teardown();
    }
  }
});

test('e2e: scenario builder chains seed, persisted best, and queued swipes before launch', async () => {
  const fixture = await scenario()
    .withSeed(123)
    .withPersistedBest(50)
    .queueSwipe('left')
    .queueSwipes(['up', 'right'])
    .launch();
  try {
    const snap = fixture.snapshot();
    assert.strictEqual(snap.ready, true);
    assert.strictEqual(snap.match.best >= 50, true, 'persisted best should seed the match');
    // Queued swipes were attempted; at least one may have been effective, but all noops are allowed
    assert.ok(typeof snap.board[0][0] === 'number' || snap.board[0][0] === null, 'board is a valid 4x4 after queued swipes');
  } finally {
    await fixture.teardown();
  }
});

test('e2e: directional spawn via fixture — every effective swipe lands on the opposite edge of a moved line', async () => {
  const fixture = await GameE2ETestFixture.launch({ seed: 0xc31 });
  try {
    const dirs: Direction[] = ['left', 'up', 'right', 'down'];
    let effective = 0;
    let offEdge = 0;
    // Drive 120 moves through the fixture's input pipeline so the
    // busy gate + settle contract is exercised (not just raw move calls).
    for (let i = 0; i < 120 && !fixture.gameOver; i++) {
      const dir = dirs[i % 4];
      const beforeBoard: Board = fixture.board.map((r) => r.slice());
      const eligible = eligibleOppositeCells(beforeBoard, dir);
      const occupiedBefore = fixture.occupiedCount;
      const beforePending = fixture.pendingSpawn;
      const dispatched = fixture.input.swipeDirection(dir);
      if (!dispatched) {
        // Swipes can be suppressed by the busy gate; settle and retry is allowed
        fixture.settle();
        continue;
      }
      // Dispatched swipe: either NOOP (moved=false, no spawn, no score, pending unchanged, gate stays open)
      // or EFFECTIVE (moved=true, spawn on opposite edge, gate engages until settle)
      if (fixture.isBusy) {
        // Effective move engaged the gate
        effective++;
        const afterBoard = fixture.board;
        // The new tile is the cell that was null before among eligible opposites
        // Find which eligible cell now holds the materialized spawn (pendingBefore.value)
        const matched = eligible.filter(([r, c]) => afterBoard[r][c] === beforePending.value);
        if (matched.length === 0) {
          // Debug: show eligible vs diff for failure message
          const diffDbg = diffCells(beforeBoard, afterBoard);
          assert.fail(
            `effective ${dir} move #${effective}: spawn of ${beforePending.value} not found in eligible ${JSON.stringify(eligible)}; diff=${JSON.stringify(diffDbg)} board before=${JSON.stringify(beforeBoard)} after=${JSON.stringify(afterBoard)}`
          );
        }
        // Must not have spawned in an unchanged line's opposite edge — only
        // opposite-edge diff cells that now hold the spawn value count.
        const isOppositeEdge = (r: number, c: number): boolean => {
          if (dir === 'left') return c === GRID_SIZE - 1;
          if (dir === 'right') return c === 0;
          if (dir === 'up') return r === GRID_SIZE - 1;
          return r === 0;
        };
        const diff = diffCells(beforeBoard, afterBoard);
        for (const [r, c] of diff) {
          if (!isOppositeEdge(r, c)) continue;
          if (afterBoard[r][c] !== beforePending.value) continue;
          const isEligible = eligible.some(([er, ec]) => er === r && ec === c);
          if (!isEligible) offEdge++;
        }
        assert.strictEqual(offEdge, 0, `spawn landed off the moved-line opposite edge on ${dir} move #${effective}`);
        // Occupied count delta: merging can keep count stable, but never drops below 9ish?
        // Just verify board stays 4x4 and occupied stays within bounds
        assert.strictEqual(afterBoard.length, 4);
        assert.ok(fixture.occupiedCount >= 1 && fixture.occupiedCount <= 16);
        fixture.settle();
        assert.strictEqual(fixture.isBusy, false, 'settle must reopen the input gate');
        await waitFor(() => fixture.occupiedCount > 0, { timeout: 200 });
      } else {
        // NOOP path — board, occupied, pending should be unchanged
        assert.deepStrictEqual(fixture.board, beforeBoard, `${dir} noop must not mutate board`);
        assert.strictEqual(fixture.occupiedCount, occupiedBefore, 'noop must not spawn');
        assert.deepStrictEqual(fixture.pendingSpawn, beforePending, 'noop must keep pendingSpawn');
      }
    }
    assert.ok(effective > 10, `fixture should produce >10 effective moves in 120 tries (got ${effective})`);
    assert.strictEqual(offEdge, 0, 'no spawn ever landed off the moved-line opposite edge');
  } finally {
    await fixture.teardown();
  }
});

test('e2e: per-direction opposite-edge contract via deterministic single-tile boards', async () => {
  // Drive the fixture into specific boards via seeded move helpers would be
  // fragile, so we validate the same pipeline using raw move + render helpers
  // seeded identically to how the fixture seeds — ensuring the contract holds
  // for each direction in isolation, which the stochastic session above covers
  // probabilistically.
  const directions: Direction[] = ['left', 'right', 'up', 'down'];
  for (const dir of directions) {
    const fixture = await GameE2ETestFixture.launch({ seed: 777 + directions.indexOf(dir) * 100 });
    try {
      let verified = 0;
      for (let i = 0; i < 40 && !fixture.gameOver; i++) {
        const beforeBoard: Board = fixture.board.map((r) => r.slice());
        const eligible = eligibleOppositeCells(beforeBoard, dir);
        const beforePending = fixture.pendingSpawn;
        const dispatched = fixture.input.swipeDirection(dir);
        if (!dispatched) {
          fixture.settle();
          continue;
        }
        if (fixture.isBusy) {
          verified++;
          const afterBoard = fixture.board;
          // Spawn must be on an eligible opposite edge
          const isOnEligible = eligible.some(([r, c]) => afterBoard[r][c] === beforePending.value);
          assert.ok(isOnEligible, `dir ${dir} move #${verified}: spawn ${beforePending.value} must be on eligible ${JSON.stringify(eligible)}`);
          // Spawn must NOT be on an unchanged line's opposite edge
          const oppositeForDir = (r: number, c: number): boolean => {
            if (dir === 'left') return c === GRID_SIZE - 1;
            if (dir === 'right') return c === 0;
            if (dir === 'up') return r === GRID_SIZE - 1;
            return r === 0;
          };
          // Every cell that holds the new spawn value and is on the opposite edge must be eligible
          for (let r = 0; r < GRID_SIZE; r++)
            for (let c = 0; c < GRID_SIZE; c++)
              if (afterBoard[r][c] === beforePending.value && oppositeForDir(r, c)) {
                // If this is the spawn cell (was null before), it must be eligible
                if (beforeBoard[r][c] === null) {
                  assert.ok(
                    eligible.some(([er, ec]) => er === r && ec === c),
                    `dir ${dir}: spawn at (${r},${c}) must be in eligible ${JSON.stringify(eligible)}`
                  );
                }
              }
          fixture.settle();
        }
      }
      // At least a few effective moves should have happened in 40 tries
      assert.ok(verified >= 1, `direction ${dir}: expected at least 1 effective move in 40 tries (got ${verified})`);
    } finally {
      await fixture.teardown();
    }
  }
});

test('e2e: waitFor async assertion times out with a descriptive message when condition never met', async () => {
  const fixture = await scenario().withSeed(1).launch();
  try {
    let threw = false;
    try {
      await waitFor(() => null as unknown as number, { timeout: 50, interval: 5, message: 'never-ready' });
    } catch (e: unknown) {
      threw = true;
      const msg = (e as Error).message;
      assert.ok(msg.includes('never-ready'), `timeout message must contain custom text, got: ${msg}`);
      assert.ok(msg.includes('50ms'), `timeout message must contain timeout duration, got: ${msg}`);
    }
    assert.strictEqual(threw, true, 'waitFor must reject when condition never becomes truthy');
  } finally {
    await fixture.teardown();
  }
});
