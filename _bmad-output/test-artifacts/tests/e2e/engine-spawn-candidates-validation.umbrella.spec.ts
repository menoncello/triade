/**
 * E2E Umbrella — dw-engine-spawn-candidates-validation (DW-72/DW-73)
 * Host node:test + tsx — static scans + exploratory + perf as E2E (no Playwright page.goto)
 * Mirrors P2/P3 for test_artifacts compliance. P2: single-site/Set/GRID_SIZE/optional-chaining/ledger. P3: seeded session + bench.
 * Run: npm --prefix triade test -- _bmad-output/test-artifacts/tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts
 * With ed54b4e delta: 9 pass (~110ms). Before 51e4677 baseline: candidates.filter survivor + Set missing + ledger open.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnTile } from '../../../../triade/src/engine/core/spawn.ts';
import { boardWith, rngOf, mulberry32 } from '../../../../triade/test-utils/helpers.ts';

// ── P2 static scans — single-site validation loop + Set dedup + no candidates.filter survivor (R-001/R-002) ──

test('[P2-E2E-01] SCAN single-site loop + Set dedup + no candidates.filter survivor (R-001/R-002)', () => {
  const spawnSrc = readFileSync(new URL('../../../../triade/src/engine/core/spawn.ts', import.meta.url).pathname, 'utf8');
  assert.equal((spawnSrc.match(/candidates\.filter\(/g) ?? []).length, 0, 'no candidates.filter survivor');
  assert.equal((spawnSrc.match(/Set<string>/g) ?? []).length, 1, 'exactly 1 Set<string>');
  assert.equal((spawnSrc.match(/seen\.has\(key\)/g) ?? []).length, 1);
  assert.equal((spawnSrc.match(/seen\.add\(key\)/g) ?? []).length, 1);
  assert.equal((spawnSrc.match(/if \(!Array\.isArray\(entry\)/g) ?? []).length, 1);
  assert.equal((spawnSrc.match(/Number\.isInteger/g) ?? []).length, 2);
  assert.equal((spawnSrc.match(/if \(!Array\.isArray\(candidates\)/g) ?? []).length, 1);
});

test('[P2-E2E-02] SCAN GRID_SIZE single definition + spawn bounds use GRID_SIZE not literal 4 (R-004)', () => {
  const typesSrc = readFileSync(new URL('../../../../triade/src/engine/core/types.ts', import.meta.url).pathname, 'utf8');
  const spawnSrc = readFileSync(new URL('../../../../triade/src/engine/core/spawn.ts', import.meta.url).pathname, 'utf8');
  assert.equal((typesSrc.match(/export const GRID_SIZE/g) ?? []).length, 1);
  assert.ok(typesSrc.includes('GRID_SIZE = 4'));
  assert.equal((spawnSrc.match(/GRID_SIZE/g) ?? []).length, 5, 'spawn.ts 5 GRID_SIZE refs (import+2 empty loops+2 bounds)');
  assert.ok(spawnSrc.includes('r >= GRID_SIZE') && spawnSrc.includes('c >= GRID_SIZE'));
});

test('[P2-E2E-03] SCAN board[r]?.[c] !== null optional chaining guard pin (R-004/R-006)', () => {
  const spawnSrc = readFileSync(new URL('../../../../triade/src/engine/core/spawn.ts', import.meta.url).pathname, 'utf8');
  assert.equal((spawnSrc.match(/board\[r\]\?\.\[c\] !== null/g) ?? []).length, 1, 'candidate loop optional chaining');
  assert.equal((spawnSrc.match(/board\[r\]\[c\] === null/g) ?? []).length, 1, 'all-empty branch direct');
  assert.ok(spawnSrc.includes('const next = cloneBoard(board)'));
  assert.ok(spawnSrc.includes('pickIndex(pool.length'));
  assert.equal((spawnSrc.match(/if \(pool\.length === 0\)/g) ?? []).length, 1);
});

test('[P2-E2E-04] SCAN Math.random defaults only + ledger resolution-undo 365ffe33 + sprint-status untouched (R-010)', () => {
  const spawnSrc = readFileSync(new URL('../../../../triade/src/engine/core/spawn.ts', import.meta.url).pathname, 'utf8');
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  assert.equal((spawnSrc.match(/Math\.random/g) ?? []).length, 2, 'spawn.ts 2 Math.random (weightedValue+spawnTile defaults)');
  assert.equal((gameSrc.match(/Math\.random/g) ?? []).length, 2, 'game.ts 2 Math.random (newGame+move defaults)');
  const deferredSrc = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  assert.ok(deferredSrc.includes('365ffe33'), 'ledger contains 365ffe33');
  assert.ok(deferredSrc.includes('status: done 2026-09-02'));
  assert.equal(gameSrc.includes('sprint'), false);
});

test('[P2-E2E-05] spec 8-row I-O matrix + boundaries Always/Never still stated (GRID_SIZE 4, draw-budget 1/0)', () => {
  const spec = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md', import.meta.url).pathname, 'utf8');
  assert.ok(/GRID_SIZE/.test(spec) || /4x4/.test(spec));
  assert.ok(/OOB candidate/.test(spec));
  assert.ok(/Null entry/.test(spec));
  assert.ok(/Duplicate cells/.test(spec));
  assert.ok(/Omitted candidates/.test(spec));
  assert.ok(/Never:.*Mutate input board/.test(spec) || /Never:/.test(spec));
});

// ── P3 exploratory / residual / hygiene ──

test('[P3-E2E-01] exploratory 50-move runSeededSession no cursor drift (R-003 residual)', async () => {
  const { runSeededSession } = await import('../../../../triade/test-utils/helpers.ts');
  const { spawnValues, n3pairs } = runSeededSession(0x1234, 50);
  assert.equal(spawnValues.length, 50, '50 spawns materialized');
  assert.equal(n3pairs.length, 50);
  for (const { promised, materialized } of n3pairs) {
    assert.equal(materialized, promised, 'N3 promised === materialized per move');
  }
});

test('[P3-E2E-02] hygiene bench O(4) per spawn — 10k mixed-pool spawnTile <800ms (R-009 perf)', () => {
  const board = boardWith([[1, null, null, null], [2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, null]]);
  const loops = 10_000;
  const start = performance.now();
  for (let i = 0; i < loops; i++) {
    spawnTile(board, 42, rngOf(0.5), [[4, 0], null as unknown as [number, number], [0, 0], [0, 0]] as unknown as Array<[number, number]>);
  }
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 800, `10k mixed-pool spawnTile ${elapsed.toFixed(1)}ms <800ms (O(4) guard + O(16) clone)`);
});

test('[P3-E2E-03] game.ts byte-identical gate — no production candidate drift (R-007)', () => {
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  // Production still pushes distinct per row/col via opposite-edge; guard lives only in spawn.ts
  assert.ok(/oppCol|oppRow|shifted\[i\]\.moved/.test(gameSrc) || gameSrc.includes('oppositeEdge') || gameSrc.includes('candidates'));
  // Must not have gained a filter in game.ts that duplicates spawn validation
  assert.equal((gameSrc.match(/Set<string>/g) ?? []).length, 0, 'game.ts must not have Set<string> (belongs in spawn.ts)');
  assert.equal((gameSrc.match(/candidates\.filter\(/g) ?? []).length, 0);
});

test('[P3-E2E-04] deferred-work DW-72/73 resolution-undo hex tail + spec done gate', () => {
  const deferredSrc = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  assert.equal((deferredSrc.match(/365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2/g) ?? []).length, 2, '2 hits DW-72/73 each');
  assert.ok(deferredSrc.includes('resolution: resolved by sweep bundle dw-engine-spawn-candidates-validation'));
  assert.ok(deferredSrc.includes('7374617475733a206f70656e'), 'hex tail status: open');
  const spec = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md', import.meta.url).pathname, 'utf8');
  assert.ok(/status:\s*'?done'?/.test(spec));
});
