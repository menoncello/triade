import { test } from 'node:test';
import assert from 'node:assert';
import { newGame, move, stateFromResult } from '../../src/engine/core/index.ts';
import type { Board, Direction } from '../../src/engine/core/index.ts';
import { applyMove, initialScore } from '../../src/game/matchScore.ts';
import { planTileTransitions, resultingTiles } from '../../src/render/transitionPlan.ts';
import {
  loadBest,
  saveBest,
  setStorageBackendForTests,
  STORAGE_KEYS
} from '../../src/services/storage/settingsStore.ts';
import { createMemoryStorage } from '../../test-utils/e2e/memoryStorage.ts';
import { mulberry32 } from '../../src/utils/mulberry32.ts';

function occupiedOf(board: Board): Array<{ cell: [number, number]; value: number }> {
  const out: Array<{ cell: [number, number]; value: number }> = [];
  board.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v !== null) out.push({ cell: [r, c], value: v });
    })
  );
  return out.sort((a, b) => a.cell[0] - b.cell[0] || a.cell[1] - b.cell[1]);
}

test('integration: move trace renders exactly the occupied cells of the result board', () => {
  const start = newGame(mulberry32(314159));
  const result = move(start, 'left', mulberry32(271828));
  assert.strictEqual(result.moved, true, 'seeded session must produce an effective first move');
  const plan = planTileTransitions(start.board, result);
  const tiles = resultingTiles(plan)
    .map((t) => ({ cell: t.cell, value: t.value }))
    .sort((a, b) => a.cell[0] - b.cell[0] || a.cell[1] - b.cell[1]);
  assert.deepStrictEqual(
    tiles,
    occupiedOf(result.board),
    'rendered tiles equal result.board cells after a real move'
  );
});

test('integration: matchScore accumulates across a full session of moves', () => {
  let match = initialScore(50);
  let state = newGame(mulberry32(777));
  const dirs: Direction[] = ['left', 'up', 'right', 'down'];
  for (let i = 0; i < 80; i++) {
    const result = move(state, dirs[i % 4], mulberry32(9000 + i));
    if (result.moved) {
      state = stateFromResult(result);
      match = applyMove(match, result);
    }
  }
  assert.ok(match.score >= 0, 'session score is non-negative');
  assert.ok(match.best >= Math.max(50, match.score), 'best is at least max(persisted seed, live score)');
});

test('integration: save/load best round-trips through the injected storage backend', async () => {
  const storage = createMemoryStorage();
  setStorageBackendForTests(storage);
  try {
    const saved = await saveBest(1234);
    assert.strictEqual(saved, true, 'saveBest succeeds on healthy backend');
    const loaded = await loadBest();
    assert.deepStrictEqual(loaded, { best: 1234, ok: true }, 'loadBest reads back persisted record');
    assert.strictEqual(storage.dump()[STORAGE_KEYS.best], '1234', 'raw stored format is decimal string');
  } finally {
    setStorageBackendForTests(null);
  }
});
