/**
 * API Gateway — dw-grid-size-configurable (RED-PHASE, test.skip)
 * Engine BoardConfig hard-gate + 4x4 identity + threading — host node:test + tsx
 * Mirrors triade/__tests__/engine/grid-size-configurable.atdd.test.ts P0/P1
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  GRID_SIZE,
  DEFAULT_BOARD_CONFIG,
  validateGridSize,
  validateBoardConfig,
  resolveGridSize,
  emptyBoard as coreEmptyBoard,
  boardsEqual as coreBoardsEqual,
} from '../../../../triade/src/engine/core/index.ts';
import {
  boardWith,
  emptyBoard as helperEmptyBoard,
  gameState,
  rngOf,
  spyRng,
} from '../../../../triade/test-utils/helpers.ts';
import * as game from '../../../../triade/src/engine/core/index.ts';
import { spawnTile } from '../../../../triade/src/engine/core/spawn.ts';
import type { Board, BoardConfig } from '../../../../triade/src/engine/core/index.ts';

test.skip('[P0-API-01] validateGridSize hard-gate 10-case: null→4, 4, {size:4}, 3/5/0/-1/3.5/NaN/Infinity → RangeError', () => {
  assert.strictEqual(resolveGridSize(null), 4);
  assert.strictEqual(resolveGridSize(4), 4);
  assert.strictEqual(resolveGridSize({ size: 4 } as BoardConfig), 4);
  for (const bad of [3, 5, 0, -1, 3.5, NaN, Infinity] as number[]) {
    assert.throws(() => validateGridSize(bad), /\[BoardConfig\] unsupported grid size/);
  }
  assert.throws(() => validateBoardConfig(null as unknown as BoardConfig), /BoardConfig/);
  assert.throws(() => resolveGridSize(5), /unsupported grid size/);
});

test.skip('[P0-API-02] emptyBoard 4x4 shape + default vs explicit 4 deepEquals', () => {
  const a = coreEmptyBoard();
  const b = coreEmptyBoard(4);
  const c = coreEmptyBoard({ size: 4 } as BoardConfig);
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual(a, c);
  assert.strictEqual(a.length, 4);
  assert.throws(() => coreEmptyBoard(5), /unsupported grid size/);
});

test.skip('[P0-API-03] newGame default vs explicit 4 same 9 tiles + 20 draws preserved', () => {
  const vals = Array.from({ length: 20 }, (_, i) => (i + 1) / 100);
  const a = game.newGame(rngOf(...vals));
  const b = game.newGame(rngOf(...vals), 4);
  assert.deepStrictEqual(a.board, b.board);
  assert.strictEqual(a.board.flat().filter((v) => v !== null).length, 9);
  assert.throws(() => game.newGame(rngOf(...vals), 5), /unsupported grid size/);
});

test.skip('[P0-API-04] move 4-dir identity default vs explicit 4 deepEquals trace/score', () => {
  const board = boardWith([[1, 2, null, null], [3, 6, 12, 24], [3, 6, 12, 24], [3, 6, 12, 24]]);
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    const s = gameState(board, { value: 1, displayRoll: 0 });
    const a = game.move(s, dir, spyRng(0, 0.01, 0.99) as any);
    const b = game.move(s, dir, spyRng(0, 0.01, 0.99) as any, 4);
    assert.deepStrictEqual(a.board, b.board);
    assert.strictEqual(a.score, b.score);
  }
});

test.skip('[P0-API-05] spawnTile OOB filter size-aware [4,0] ignored, [3,3] eligible', () => {
  const board = boardWith([[1, 3, 6, 12], [6, 12, 1, 3], [3, 1, 12, 6], [12, 6, 3, null]]);
  const res = spawnTile(board, 3, spyRng(0) as any, [[4, 0], [0, 4], [3, 3]], 4);
  assert.deepStrictEqual(res.cell, [3, 3]);
  assert.throws(() => spawnTile(board, 3, spyRng(0) as any, undefined, 5), /unsupported grid size/);
});

test.skip('[P0-API-06] isGameOver 4x4 parity empty→false full no-merge→true merge→false', () => {
  const empty = helperEmptyBoard(4);
  assert.strictEqual(game.isGameOver(empty), false);
  assert.strictEqual(game.isGameOver(empty, 4), false);
  const fullNoMerge = boardWith([[1, 3, 6, 12], [6, 12, 1, 3], [3, 1, 12, 6], [12, 6, 3, 1]]);
  assert.strictEqual(game.isGameOver(fullNoMerge, 4), true);
  const fullMerge = boardWith([[3, 3, 6, 12], [6, 12, 1, 3], [3, 1, 12, 6], [12, 6, 3, 1]]);
  assert.strictEqual(game.isGameOver(fullMerge, 4), false);
  assert.throws(() => game.isGameOver(empty, 5), /unsupported grid size/);
});

test.skip('[P1-API-01] BoardConfig object vs number parity across entry points', () => {
  assert.strictEqual(resolveGridSize(4), resolveGridSize({ size: 4 } as BoardConfig));
  assert.deepStrictEqual(helperEmptyBoard(4), helperEmptyBoard({ size: 4 } as BoardConfig));
});

test.skip('[P1-API-02] helper SIZE===GRID_SIZE and DEFAULT_BOARD_CONFIG.size===4', () => {
  assert.strictEqual(GRID_SIZE, 4);
  assert.strictEqual(DEFAULT_BOARD_CONFIG.size, 4);
  const src = readFileSync(new URL('../../../../triade/test-utils/helpers.ts', import.meta.url).pathname, 'utf8');
  assert.ok(/SIZE.*=.*GRID_SIZE/.test(src));
});

test.skip('[P1-API-03] ledger resolution-undo 0f53c41e single hit', () => {
  const ledger = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  assert.strictEqual((ledger.match(/0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f/g) || []).length, 1);
});

test.skip('[P1-API-04] re-export surface index.ts GRID_SIZE/BoardConfig/validateGridSize', () => {
  const src = readFileSync(new URL('../../../../triade/src/engine/core/index.ts', import.meta.url).pathname, 'utf8');
  assert.ok(/validateGridSize/.test(src));
  assert.ok(/BoardConfig/.test(src));
});

test.skip('[P2-API-01] NaN/Infinity/float/string rejected', () => {
  for (const bad of [NaN, Infinity, 4.5, '4' as unknown as number]) assert.throws(() => resolveGridSize(bad as number), /unsupported grid size/);
});

test.skip('[P2-API-02] no Math.random in new suites', () => {
  const s = readFileSync(new URL('../../../../triade/__tests__/engine/grid-size-configurable.atdd.test.ts', import.meta.url).pathname, 'utf8');
  assert.strictEqual(/Math\.random/.test(s), false);
});
