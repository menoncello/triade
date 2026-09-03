import { test } from 'node:test';
import assert from 'node:assert';
import { applyMove, initialScore, isNewRecord } from '../../src/game/matchScore.ts';
import { emptyBoard } from '../../test-utils/helpers.ts';

function moveResult(score: number, moved = true): any {
  return { board: emptyBoard(), score, moved, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } };
}

test('[P0] isNewRecord finite guards — -5/NaN/Infinity never highlight', () => {
  assert.strictEqual(isNewRecord(NaN as any, 10), false);
  assert.strictEqual(isNewRecord(Infinity as any, 10), false);
  assert.strictEqual(isNewRecord(-5 as any, 10), false);
  assert.strictEqual(isNewRecord(10, NaN as any), false);
  assert.strictEqual(isNewRecord(10, Infinity as any), false);
  assert.strictEqual(isNewRecord(10, -1 as any), false);
  assert.strictEqual(isNewRecord(5, 6), true);
  assert.strictEqual(isNewRecord(5, 5), false);
  assert.strictEqual(isNewRecord(0, 0), false);
  assert.strictEqual(isNewRecord(0, 1), true);
  assert.strictEqual(isNewRecord(150, 150), false);
});

test('[P0] initialScore sanitizes NaN/Infinity/-5/"3" to best 0', () => {
  assert.deepStrictEqual(initialScore(NaN as any), { score: 0, best: 0 });
  assert.deepStrictEqual(initialScore(Infinity as any), { score: 0, best: 0 });
  assert.deepStrictEqual(initialScore(-5 as any), { score: 0, best: 0 });
  assert.deepStrictEqual(initialScore('3' as any), { score: 0, best: 0 });
  assert.deepStrictEqual(initialScore(42), { score: 0, best: 42 });
});

test('[P0] applyMove sanitizes corrupt current + result.score NaN/Infinity/-5 and moved:false', () => {
  let s = applyMove({ score: NaN as any, best: 10 }, moveResult(5, true));
  assert.ok(Number.isFinite(s.score) && Number.isFinite(s.best), 'NaN curScore sanitized');
  s = applyMove({ score: 10, best: NaN as any }, moveResult(5, true));
  assert.ok(Number.isFinite(s.best), 'NaN curBest sanitized');
  s = applyMove({ score: 10, best: 20 }, moveResult(NaN as any, true));
  assert.ok(Number.isFinite(s.score), 'NaN result sanitized');
  s = applyMove({ score: 10, best: 20 }, moveResult(Infinity as any, true));
  assert.ok(Number.isFinite(s.score));
  s = applyMove({ score: 10, best: 20 }, moveResult(-5 as any, true));
  assert.strictEqual(s.score, 10, 'negative sanitized to 0');
  s = applyMove({ score: 10, best: 20 }, moveResult(5 as any, false));
  assert.strictEqual(s.score, 10, 'moved:false adds 0');
});

test('[P0] applyMove safeScore fallback never NaN — large values', () => {
  const s = applyMove({ score: Number.MAX_VALUE, best: 10 }, moveResult(Number.MAX_VALUE, true));
  assert.ok(Number.isFinite(s.score), 'safeScore fallback finite');
});

test('[P0] applyMove best tracks max with sanitized inputs', () => {
  let s = initialScore(10);
  s = applyMove(s, moveResult(5, true));
  assert.strictEqual(s.best, 10);
  s = applyMove(s, moveResult(10, true));
  // curScore 5 + 10 =15, best max(10,15)=15
  assert.strictEqual(s.score, 15);
  assert.strictEqual(s.best, 15);
});

test('[P1] App.tsx source pin — Number.isFinite guards present + sanitized refs', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const scoreSrc = readFileSync(join(here, '../../src/game/matchScore.ts'), 'utf8');
  assert.ok((scoreSrc.match(/Number\.isFinite/g) || []).length >= 4, 'matchScore Number.isFinite >=4');
  const appSrc = readFileSync(join(here, '../../App.tsx'), 'utf8');
  assert.ok(appSrc.includes('pendingSaveByLaneRef'), 'pendingSaveByLaneRef present');
  assert.ok(appSrc.includes('persistedBestByLaneRef'), 'persistedBestByLaneRef present');
  assert.ok(appSrc.includes('hydrationOkByLaneRef'), 'hydrationOk present');
  assert.ok(appSrc.includes('sanitizedScore'), 'sanitizedScore present');
});
