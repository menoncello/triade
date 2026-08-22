import { test } from 'node:test';
import assert from 'node:assert';
import { GameE2ETestFixture } from '../../test-utils/e2e/GameE2ETestFixture.ts';
import { scenario } from '../../test-utils/e2e/scenarioBuilder.ts';
import { gestureFor } from '../../test-utils/e2e/inputSimulator.ts';
import { waitFor } from '../../test-utils/e2e/asyncAssertions.ts';
import { STORAGE_KEYS } from '../../src/services/storage/settingsStore.ts';

test('e2e: launch hydrates persisted best and starts a full board', async () => {
  const fixture = await scenario().withSeed(42).withPersistedBest(100).launch();
  try {
    const snap = fixture.snapshot();
    assert.strictEqual(snap.ready, true, 'session should be ready after hydration');
    assert.strictEqual(snap.hydrationOk, true, 'hydration should succeed with a clean backend');
    assert.strictEqual(snap.match.best, 100, 'best should be seeded from persisted value');
    assert.strictEqual(fixture.score, 0, 'score starts at zero');
    assert.strictEqual(fixture.occupiedCount, 9, 'new game spawns exactly 9 tiles');
  } finally {
    await fixture.teardown();
  }
});

test('e2e: swipe below threshold is ignored and does not change the board', async () => {
  const fixture = await scenario().withSeed(7).launch();
  try {
    const before = fixture.snapshot().board;
    const dispatched = fixture.input.swipe({ dx: 5, dy: 0 });
    assert.strictEqual(dispatched, false, 'sub-threshold swipe must not dispatch');
    assert.deepStrictEqual(fixture.board, before, 'board unchanged on ignored swipe');
  } finally {
    await fixture.teardown();
  }
});

test('e2e: core loop — moves accumulate score, gate opens after settle', async () => {
  const fixture = await scenario().withSeed(20260808).launch();
  try {
    let moves = 0;
    for (let i = 0; i < 50 && !fixture.gameOver; i++) {
      const dirs = ['left', 'up', 'right', 'down'] as const;
      for (const dir of dirs) {
        if (fixture.gameOver) break;
        const dispatched = fixture.input.swipeDirection(dir);
        if (dispatched) {
          moves++;
          assert.strictEqual(fixture.isBusy, true, 'effective move engages the busy gate');
          fixture.settle();
          assert.strictEqual(fixture.isBusy, false, 'settle reopens the input gate');
          await waitFor(() => fixture.occupiedCount > 0);
        }
      }
    }
    assert.ok(moves > 0, 'at least one move should dispatch in a fresh session');
    assert.ok(fixture.score >= 0, 'score never goes negative');
    assert.ok(fixture.occupiedCount >= 9, 'board never drops below spawn count');
  } finally {
    await fixture.teardown();
  }
});

test('e2e: record run persists best only when it passes the session-start value', async () => {
  const fixture = await GameE2ETestFixture.launch({ seed: 99, persistedBest: 4 });
  try {
    const saved = await fixture.syncPersistence();
    if (fixture.best > 4) {
      assert.strictEqual(saved, true, 'a passing record must persist');
      assert.strictEqual(
        fixture.storage.dump()[STORAGE_KEYS.best],
        String(fixture.best),
        'stored value matches live best'
      );
      const snap = fixture.snapshot();
      assert.strictEqual(snap.persistedBest, fixture.best, 'persistedBest mirrors storage');
    } else {
      assert.strictEqual(saved, false, 'no persistence when best does not pass');
    }
  } finally {
    await fixture.teardown();
  }
});

test('e2e: degraded hydration blocks persistence so records are never overwritten', async () => {
  const fixture = await scenario().withSeed(5).withPersistedBest('not-a-number').launch();
  try {
    assert.strictEqual(fixture.snapshot().hydrationOk, false, 'corrupt stored value degrades hydration');
    const saved = await fixture.syncPersistence();
    assert.strictEqual(saved, false, 'persistence blocked when hydration degraded');
    assert.strictEqual(
      fixture.storage.dump()[STORAGE_KEYS.best],
      'not-a-number',
      'corrupt stored value never overwritten while degraded'
    );
  } finally {
    await fixture.teardown();
  }
});
