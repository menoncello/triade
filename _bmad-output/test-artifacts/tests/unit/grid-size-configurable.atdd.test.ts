/**
 * Unit — dw-grid-size-configurable (RED-PHASE, test.skip)
 * Primary oracle mirror for TEA test_artifacts compliance — host node:test
 * Mirrors triade/__tests__/engine/grid-size-configurable.atdd.test.ts
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
  boardsEqual,
  movementLines,
  boardFromLines,
  shiftLine,
  spawnTile,
  newGame,
  move,
  isGameOver,
} from '../../../../triade/src/engine/core/index.ts';
import {
  SIZE,
  emptyBoard as helperEmptyBoard,
  boardWith,
  staticBoard,
  occupiedCells,
  oppositeEdgeCandidates,
  gameState,
  rngOf,
  spyRng,
} from '../../../../triade/test-utils/helpers.ts';
import type { Board, BoardConfig } from '../../../../triade/src/engine/core/index.ts';

test.skip('[P0-U-01] hard-gate only-4: null→4, 4→4, {size:4}→4, 3/5/0/-1/3.5/NaN/Infinity → RangeError', () => {
  assert.strictEqual(resolveGridSize(null), 4);
  assert.strictEqual(resolveGridSize(4), 4);
  assert.strictEqual(resolveGridSize({ size: 4 } as BoardConfig), 4);
  for (const bad of [3, 5, 0, -1, 3.5, NaN, Infinity] as number[]) assert.throws(() => validateGridSize(bad), /unsupported grid size/);
  assert.throws(() => validateBoardConfig(null as unknown as BoardConfig), /BoardConfig/);
  assert.throws(() => resolveGridSize(5), /unsupported grid size/);
});

test.skip('[P0-U-02] emptyBoard 4x4 shape parity default vs explicit 4', () => {
  const a = coreEmptyBoard();
  const b = coreEmptyBoard(4);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.length, 4);
  assert.throws(() => coreEmptyBoard(5), /unsupported grid size/);
});

test.skip('[P0-U-03] newGame seeded 20 draws identity', () => {
  const vals = Array.from({ length: 20 }, (_, i) => (i + 1) / 100);
  assert.deepStrictEqual(gameState(boardWith([[1]])), gameState(boardWith([[1]])));
  const a = newGame(rngOf(...vals));
  const b = newGame(rngOf(...vals), 4);
  assert.deepStrictEqual(a.board, b.board);
});

test.skip('[P0-U-04] move 4-dir identity + boardsEqual defensive', () => {
  const board = boardWith([[1, 2, null, null], [3, 6, 12, 24], [3, 6, 12, 24], [3, 6, 12, 24]]);
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    const s = gameState(board, { value: 1, displayRoll: 0 });
    const a = move(s, dir, spyRng(0, 0.01, 0.99) as any);
    const b = move(s, dir, spyRng(0, 0.01, 0.99) as any, 4);
    assert.deepStrictEqual(a.board, b.board);
  }
  const empty = helperEmptyBoard(4);
  assert.strictEqual(boardsEqual(empty, empty, 4), true);
});

test.skip('[P0-U-05] movementLines left/right rows×4 up/down cols×4', () => {
  const board = boardWith([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    const lines = movementLines(board, dir, 4);
    assert.strictEqual(lines.length, 4);
  }
});

test.skip('[P0-U-06] boardFromLines size-1-k placement trace within bounds', () => {
  const board = boardWith([[1, null, null, 2]]);
  const lines = movementLines(board, 'left', 4);
  const shifted = lines.map((l) => shiftLine(l).line);
  const built = boardFromLines(shifted, 'right', 4);
  assert.strictEqual(built.board[0][3] !== null, true);
});

test.skip('[P0-U-07] spawnTile OOB filter [4,0] ignored', () => {
  const board = boardWith([[1, 3, 6, 12], [6, 12, 1, 3], [3, 1, 12, 6], [12, 6, 3, null]]);
  const res = spawnTile(board, 3, spyRng(0) as any, [[4, 0], [3, 3]], 4);
  assert.deepStrictEqual(res.cell, [3, 3]);
});

test.skip('[P0-U-08] isGameOver empty→false full no-merge→true merge→false', () => {
  assert.strictEqual(isGameOver(helperEmptyBoard(4)), false);
  assert.strictEqual(isGameOver(boardWith([[1, 3, 6, 12], [6, 12, 1, 3], [3, 1, 12, 6], [12, 6, 3, 1]]), 4), true);
  assert.strictEqual(isGameOver(boardWith([[3, 3, 6, 12], [6, 12, 1, 3], [3, 1, 12, 6], [12, 6, 3, 1]]), 4), false);
});

test.skip('[P0-U-09] oppositeEdgeCandidates left→col3 right→0 up→row3 down→0', () => {
  const board = boardWith([[1, 2, null, null], [3, 6, 12, 24], [3, 6, 12, 24], [3, 6, 12, 24]]);
  for (const [r, c] of oppositeEdgeCandidates(board, 'left', 4)) assert.strictEqual(c, 3);
});

test.skip('[P1-U-01] BoardConfig object parity + SIZE alias', () => {
  assert.strictEqual(SIZE, GRID_SIZE);
  assert.strictEqual(DEFAULT_BOARD_CONFIG.size, 4);
  assert.deepStrictEqual(helperEmptyBoard(4), helperEmptyBoard({ size: 4 } as BoardConfig));
});

test.skip('[P1-U-02] occupiedCells inference vs explicit same', () => {
  const board = boardWith([[1, null, null, null]]);
  assert.deepStrictEqual(occupiedCells(board), occupiedCells(board, 4));
});

test.skip('[P1-U-03] staticBoard/boardWith threading', () => {
  const s = staticBoard([1, 2, 3, 4], 4);
  assert.deepStrictEqual(s[0], [1, 2, 3, 4]);
});

test.skip('[P1-U-04] ledger single 0f53c41e hit', () => {
  const ledger = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  assert.strictEqual((ledger.match(/0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f/g) || []).length, 1);
});

test.skip('[P2-U-01] NaN/Infinity/float rejected', () => {
  for (const bad of [NaN, Infinity, 4.5] as number[]) assert.throws(() => resolveGridSize(bad), /unsupported grid size/);
});
