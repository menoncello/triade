import { test } from 'node:test';
import assert from 'node:assert';
import { applyMove, initialScore, isNewRecord } from '../../src/game/matchScore.ts';
import type { MoveResult } from '../../src/engine/core/index.ts';
import { emptyBoard } from '../../test-utils/helpers.ts';

function moveResult(score: number, moved = true): MoveResult {
  return { board: emptyBoard(), score, moved, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } };
}

test('initialScore seeds score 0 with the stored best', () => {
  const s = initialScore(42);
  assert.deepStrictEqual(s, { score: 0, best: 42 });
});

test('applyMove accumulates score across moves', () => {
  let s = initialScore(10);
  s = applyMove(s, moveResult(3));
  s = applyMove(s, moveResult(6));
  assert.strictEqual(s.score, 9);
  assert.strictEqual(s.best, 10);
});

test('best tracks the max score seen', () => {
  let s = initialScore(20);
  s = applyMove(s, moveResult(12));
  s = applyMove(s, moveResult(2));
  assert.strictEqual(s.best, 20, 'best stays at stored value while cumulative is below');
  s = applyMove(s, moveResult(10));
  assert.strictEqual(s.score, 24);
  assert.strictEqual(s.best, 24, 'best becomes the live max once cumulative passes it');
});

test('noop move (score 0) adds nothing', () => {
  let s = initialScore(10);
  s = applyMove(s, moveResult(3));
  const before = s;
  s = applyMove(s, moveResult(0, false));
  assert.strictEqual(s.score, 3);
  assert.strictEqual(s.best, 10);
  assert.deepStrictEqual(s, before);
});

test('isNewRecord flags the record transition against the stored best', () => {
  assert.strictEqual(isNewRecord(5, 6), true);
  assert.strictEqual(isNewRecord(5, 5), false);
  assert.strictEqual(isNewRecord(5, 4), false);
});

test('applyMove keeps only the best across a session that passes the old record', () => {
  let s = initialScore(5);
  s = applyMove(s, moveResult(6));
  assert.strictEqual(s.score, 6);
  assert.strictEqual(s.best, 6);
  assert.strictEqual(isNewRecord(5, s.score), true);
});

test('isNewRecord uses the session-start (persisted) best, not the live best', () => {
  const storedBest = 5;
  let s = initialScore(storedBest);
  s = applyMove(s, moveResult(6));
  assert.strictEqual(s.score, 6);
  assert.strictEqual(s.best, 6, 'live best becomes the session max');
  assert.strictEqual(isNewRecord(storedBest, s.score), true, 'record still flagged against stored best');
  assert.strictEqual(isNewRecord(s.best, s.score), false, 'live best equals score — never a record signal');
});

test('game-over wiring stays out of matchScore (only result.score is consumed)', () => {
  const s = applyMove(initialScore(0), moveResult(0, false));
  assert.strictEqual(s.score, 0);
  assert.strictEqual(s.best, 0);
  assert.ok(!('moved' in s), 'matchScore does not expose engine move state');
  assert.ok(!('trace' in s), 'matchScore does not expose the render trace');
});
