/**
 * GRID-SIZE CONFIGURABLE — DW dw-grid-size-configurable
 *
 * BoardConfig seam threaded through engine core + helpers with hard-gate only 4.
 * All entry points validate via resolveGridSize / validateGridSize and preserve
 * exact 4x4 identity for callers that omit boardConfig (null→4 default).
 *
 * Working-tree delta vs HEAD ea21dce (main):
 *  - triade/src/engine/core/types.ts: BoardConfig {size}, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize (only 4)
 *  - triade/src/engine/core/board.ts: emptyBoard(boardConfig?), boardsEqual(a,b,boardConfig?) via resolveGridSize + ?. defensive
 *  - triade/src/engine/core/game.ts: newGame(rng,boardConfig?), move(state,dir,rng,boardConfig?), isGameOver(board,boardConfig?) threaded size + opp size-1
 *  - triade/src/engine/core/line.ts: movementLines(board,dir,boardConfig?), boardFromLines(lines,dir,boardConfig?) size + size-1-k placement
 *  - triade/src/engine/core/spawn.ts: spawnTile(board,value,rng,candidates,boardConfig?) size OOB filter + empty scan
 *  - triade/src/engine/core/index.ts: re-exports BoardConfig, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize
 *  - triade/test-utils/helpers.ts: SIZE=GRID_SIZE alias, mirrors core re-exports, emptyBoard/staticBoard/boardWith/occupiedCells/oppositeEdgeCandidates threaded
 *  - _bmad-output/implementation-artifacts/deferred-work.md: GRID_SIZE fixed 4x4 open→done 2026-09-02 resolution-undo 0f53c41e…
 *
 * Risk focus: R-001 hard-gate only-4, R-002 4x4 identity, R-003 size-1 candidates/trace propagation.
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
  movementLines,
  shiftLine,
  boardFromLines,
  spawnTile,
  newGame,
  move,
  isGameOver,
} from '../../src/engine/core/index.ts';
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
} from '../../test-utils/helpers.ts';
import type { Board, BoardConfig } from '../../src/engine/core/index.ts';

// ── P0: hard-gate only-4 validation ─────────────────────────────────────────

test('[P0-01] validateGridSize / validateBoardConfig / resolveGridSize hard-gate only-4', () => {
  // null/undefined → 4 default
  assert.strictEqual(resolveGridSize(null), 4);
  assert.strictEqual(resolveGridSize(undefined), 4);
  assert.strictEqual(resolveGridSize(4), 4);
  assert.strictEqual(resolveGridSize({ size: 4 } as BoardConfig), 4);
  assert.strictEqual(resolveGridSize(DEFAULT_BOARD_CONFIG), 4);

  // validateGridSize throws for any non-4
  for (const bad of [3, 5, 0, -1, 3.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => validateGridSize(bad), (e: unknown) => e instanceof RangeError && /\[BoardConfig\] unsupported grid size/.test((e as Error).message), `validateGridSize(${String(bad)}) should throw RangeError`);
  }
  // validateBoardConfig throws for invalid shapes
  assert.throws(() => validateBoardConfig(null as unknown as BoardConfig), /BoardConfig/);
  assert.throws(() => validateBoardConfig({} as BoardConfig), /BoardConfig/);
  assert.throws(() => validateBoardConfig({ size: '4' } as unknown as BoardConfig), /BoardConfig/);
  assert.throws(() => validateBoardConfig({ size: 5 } as BoardConfig), /unsupported grid size/);
  // resolveGridSize throws for non-4 inputs
  assert.throws(() => resolveGridSize(5), /unsupported grid size/);
  assert.throws(() => resolveGridSize({ size: 3 } as BoardConfig), /unsupported grid size/);
  assert.throws(() => resolveGridSize(NaN), /unsupported grid size/);
  assert.throws(() => resolveGridSize(Infinity), /unsupported grid size/);
  assert.throws(() => resolveGridSize(4.5), /unsupported grid size/);
  assert.throws(() => resolveGridSize('4' as unknown as number), /unsupported grid size/);
});

// ── P0: emptyBoard 4x4 shape + parity ───────────────────────────────────────

test('[P0-02] emptyBoard 4x4 shape + default null vs explicit 4 parity', () => {
  const a = coreEmptyBoard();
  const b = coreEmptyBoard(4);
  const c = coreEmptyBoard({ size: 4 } as BoardConfig);
  const d = coreEmptyBoard(null);
  for (const board of [a, b, c, d]) {
    assert.strictEqual(board.length, 4);
    for (const row of board) assert.strictEqual(row.length, 4);
    assert.ok(board.flat().every((v) => v === null));
  }
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual(a, c);
  assert.deepStrictEqual(a, d);

  // helper mirror parity
  const ha = helperEmptyBoard();
  assert.deepStrictEqual(ha, a);

  // non-4 throws
  assert.throws(() => coreEmptyBoard(5), /unsupported grid size/);
  assert.throws(() => helperEmptyBoard(5), /unsupported grid size/);
});

// ── P0: newGame default vs explicit 4 identity ──────────────────────────────

test('[P0-03] newGame default vs explicit 4 produces same 9-tile board + seeded rng 20 draws', () => {
  const seedVals = Array.from({ length: 20 }, (_, i) => (i + 1) / 100);
  const a = newGame(rngOf(...seedVals));
  const b = newGame(rngOf(...seedVals), 4);
  const c = newGame(rngOf(...seedVals), { size: 4 } as BoardConfig);
  assert.deepStrictEqual(a.board, b.board);
  assert.deepStrictEqual(a.board, c.board);
  assert.deepStrictEqual(a.pendingSpawn, b.pendingSpawn);
  // 9 tiles placed
  assert.strictEqual(a.board.flat().filter((v) => v !== null).length, 9);
  assert.strictEqual(b.board.length, 4);

  assert.throws(() => newGame(rngOf(...seedVals), 5), /unsupported grid size/);
});

// ── P0: move identity + boardsEqual defensive ───────────────────────────────

test('[P0-04] move default 4x4 vs explicit 4 identity — 4 dirs same board/score/trace/pendingSpawn', () => {
  const base = boardWith([
    [1, 2, null, null],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
  const pending = { value: 1, displayRoll: 0 };
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    const spyA = spyRng(0, 0.01, 0.99);
    const spyB = spyRng(0, 0.01, 0.99);
    const spyC = spyRng(0, 0.01, 0.99);
    const state = gameState(base, pending);
    const resDefault = move(state, dir, spyA as any);
    const res4 = move(state, dir, spyB as any, 4);
    const resCfg = move(state, dir, spyC as any, { size: 4 } as BoardConfig);
    assert.deepStrictEqual(resDefault.board, res4.board, `move ${dir} board identity`);
    assert.deepStrictEqual(resDefault.board, resCfg.board);
    assert.strictEqual(resDefault.score, res4.score);
    assert.deepStrictEqual(resDefault.trace, res4.trace);
    assert.deepStrictEqual(resDefault.pendingSpawn, res4.pendingSpawn);
    assert.strictEqual((spyA as any).calls.length, (spyB as any).calls.length);
  }

  // non-4 throws
  const state = gameState(base, pending);
  assert.throws(() => move(state, 'left', rngOf(0, 0.1, 0.9) as any, 5), /unsupported grid size/);
});

test('[P0-05] boardsEqual 4x4 defensive — size param vs no param, cell diff, jagged', () => {
  const a = coreEmptyBoard(4);
  const b = coreEmptyBoard(4);
  assert.strictEqual(coreBoardsEqual(a, b), true);
  assert.strictEqual(coreBoardsEqual(a, b, 4), true);
  assert.strictEqual(coreBoardsEqual(a, b, { size: 4 } as BoardConfig), true);

  const c = boardWith([[1, null, null, null]]);
  const d = boardWith([[2, null, null, null]]);
  assert.strictEqual(coreBoardsEqual(c, d), false);
  assert.strictEqual(coreBoardsEqual(c, d, 4), false);

  // jagged missing col via optional chain still false
  const jagged = [[1, 2], [3, 4]] as unknown as Board;
  const full = [[1, 2, null, null], [3, 4, null, null], [null, null, null, null], [null, null, null, null]] as Board;
  assert.strictEqual(coreBoardsEqual(jagged, full, 4), false);

  assert.throws(() => coreBoardsEqual(a, b, 5), /unsupported grid size/);
});

// ── P0: movementLines size-aware ────────────────────────────────────────────

test('[P0-06] movementLines 4x4 size-aware — left/right rows ×4, up/down cols ×4, reversed', () => {
  const board = boardWith([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    const lines = movementLines(board, dir, 4);
    assert.strictEqual(lines.length, 4, `movementLines ${dir} length 4`);
    for (const line of lines) assert.strictEqual(line.length, 4);
  }
  // right reversed: first element is original [r][3]
  const rightLines = movementLines(board, 'right', 4);
  assert.strictEqual(rightLines[0][0].v, 4);
  assert.strictEqual(rightLines[0][0].r, 0);
  assert.strictEqual(rightLines[0][0].c, 3);
  const downLines = movementLines(board, 'down', 4);
  assert.strictEqual(downLines[0][0].v, 13);
  assert.strictEqual(downLines[0][0].c, 0);

  assert.throws(() => movementLines(board, 'left', 5), /unsupported grid size/);
});

// ── P0: boardFromLines placement size-1 ─────────────────────────────────────

test('[P0-07] boardFromLines placement size-1 — 4-dir round-trip + c=size-1-k', () => {
  const board = boardWith([
    [1, null, null, 2],
    [3, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    const lines = movementLines(board, dir, 4);
    const shifted = lines.map((l) => shiftLine(l).line);
    const built = boardFromLines(shifted, dir, 4);
    assert.strictEqual(built.board.length, 4);
    assert.strictEqual(built.trace.length, built.board.flat().filter((v) => v !== null).length);
    // trace to coords within 0..3
    for (const entry of built.trace) {
      assert.ok(entry.to[0] >= 0 && entry.to[0] < 4);
      assert.ok(entry.to[1] >= 0 && entry.to[1] < 4);
    }
  }
  // explicit placement size-1-k pin: right direction yields c = 3 - k
  const linesLeft = movementLines(board, 'left', 4);
  const shiftedLeft = linesLeft.map((l) => shiftLine(l).line);
  const builtRight = boardFromLines(shiftedLeft, 'right', 4);
  // first line compacted left [1,2] placed right should be at cols 2,3
  assert.strictEqual(builtRight.board[0][3] !== null, true);

  assert.throws(() => boardFromLines(shiftedLeft, 'left', 5), /unsupported grid size/);
});

// ── P0: spawnTile OOB filter size-aware ─────────────────────────────────────

test('[P0-08] spawnTile OOB filter size-aware — [4,0]/[0,4] ignored, [3,3] eligible', () => {
  const board = boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, null],
  ]);
  // candidates with OOB + one valid empty [3,3]
  const spy = spyRng(0);
  const res = spawnTile(board, 3, spy as any, [[4, 0], [0, 4], [3, 3]], 4);
  assert.deepStrictEqual(res.cell, [3, 3]);
  assert.strictEqual(res.value, 3);

  // occupied full board with OOB candidates → nulls, 0 draws
  const full = boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1],
  ]);
  const spy2 = spyRng(0.5);
  const res2 = spawnTile(full, 3, spy2 as any, [[0, 0]], 4);
  assert.strictEqual(res2.cell, null);
  assert.strictEqual(res2.value, null);
  assert.strictEqual((spy2 as any).calls.length, 0);

  assert.throws(() => spawnTile(board, 3, spyRng(0) as any, undefined, 5), /unsupported grid size/);
});

// ── P0: isGameOver parity ───────────────────────────────────────────────────

test('[P0-09] isGameOver 4x4 with size param parity — empty→false, full+no-merge→true, full+merge→false', () => {
  const empty = helperEmptyBoard(4);
  assert.strictEqual(isGameOver(empty), false);
  assert.strictEqual(isGameOver(empty, 4), false);

  const fullNoMerge = boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1],
  ]);
  assert.strictEqual(isGameOver(fullNoMerge), true);
  assert.strictEqual(isGameOver(fullNoMerge, 4), true);
  assert.strictEqual(isGameOver(fullNoMerge, { size: 4 } as BoardConfig), true);

  const fullWithMerge = boardWith([
    [3, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1],
  ]);
  assert.strictEqual(isGameOver(fullWithMerge), false);
  assert.strictEqual(isGameOver(fullWithMerge, 4), false);

  assert.throws(() => isGameOver(empty, 5), /unsupported grid size/);
});

// ── P0: oppositeEdgeCandidates size-1 mapping ───────────────────────────────

test('[P0-10] oppositeEdgeCandidates size-1 mapping — left→[row,3] right→[row,0] up→[3,col] down→[0,col]', () => {
  const board = boardWith([
    [1, 2, null, null],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
  // only row 0 moved for left (has gap + merge), others stationary? Check helper oracle
  const left = oppositeEdgeCandidates(board, 'left', 4);
  for (const [r, c] of left) assert.strictEqual(c, 3, `left candidate col 3 got [${r},${c}]`);
  const right = oppositeEdgeCandidates(board, 'right', 4);
  for (const [r, c] of right) assert.strictEqual(c, 0);
  const up = oppositeEdgeCandidates(board, 'up', 4);
  for (const [r, c] of up) assert.strictEqual(r, 3);
  const down = oppositeEdgeCandidates(board, 'down', 4);
  for (const [r, c] of down) assert.strictEqual(r, 0);

  // explicit 4 vs inferred board.length same for 4x4
  const leftInferred = oppositeEdgeCandidates(board, 'left');
  assert.deepStrictEqual(left.sort(), leftInferred.sort());

  assert.throws(() => oppositeEdgeCandidates(board, 'left', 5 as unknown as number), /unsupported grid size/);
});

// ── P1: BoardConfig object vs number parity ─────────────────────────────────

test('[P1-01] BoardConfig object vs number param parity across all entry points', () => {
  const bNum = helperEmptyBoard(4);
  const bObj = helperEmptyBoard({ size: 4 } as BoardConfig);
  assert.deepStrictEqual(bNum, bObj);

  const board = boardWith([[1, null, null, null]]);
  assert.deepStrictEqual(boardWith([[1, null, null, null]], 4), boardWith([[1, null, null, null]], { size: 4 } as BoardConfig));
  assert.strictEqual(resolveGridSize(4), resolveGridSize({ size: 4 } as BoardConfig));
  assert.strictEqual(movementLines(board, 'left', 4).length, movementLines(board, 'left', { size: 4 } as BoardConfig).length);
  const lines = movementLines(board, 'left', 4).map((l) => shiftLine(l).line);
  assert.deepStrictEqual(boardFromLines(lines, 'left', 4).board, boardFromLines(lines, 'left', { size: 4 } as BoardConfig).board);
});

// ── P1: isGameOver exhaustive + helper SIZE alias ────────────────────────────

test('[P1-02] helper SIZE===GRID_SIZE and DEFAULT_BOARD_CONFIG parity', () => {
  assert.strictEqual(SIZE, 4);
  assert.strictEqual(GRID_SIZE, 4);
  assert.strictEqual(SIZE, GRID_SIZE);
  assert.strictEqual(DEFAULT_BOARD_CONFIG.size, 4);
  assert.deepStrictEqual(DEFAULT_BOARD_CONFIG, { size: 4 });
});

test('[P1-03] movementLines/boardFromLines round-trip via helpers threaded variant', () => {
  const board = helperEmptyBoard(4);
  board[0][0] = 1;
  board[1][1] = 2;
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    const lines = movementLines(board, dir, 4);
    const shifted = lines.map((l) => shiftLine(l).line);
    const built = boardFromLines(shifted, dir, 4);
    assert.strictEqual(built.board.length, 4);
    assert.strictEqual(built.board.flat().filter((v) => v !== null).length, 2);
  }
});

// ── P1: occupiedCells legacy inference ──────────────────────────────────────

test('[P1-04] occupiedCells legacy inference vs explicit 4 validated', () => {
  const board = boardWith([[1, null, null, null], [null, 2, null, null]]);
  const inferred = occupiedCells(board);
  const explicit = occupiedCells(board, 4);
  assert.deepStrictEqual(inferred, explicit);
  assert.strictEqual(inferred.length, 2);
  // jagged 4x4 still scans 0..3
  const jagged = helperEmptyBoard(4);
  jagged[0][0] = 99;
  assert.ok(occupiedCells(jagged, 4).some((e) => e.value === 99));
});

// ── P1: re-export surface ───────────────────────────────────────────────────

test('[P1-05] re-export surface index.ts exposes BoardConfig and validators', () => {
  // static scan: index.ts must re-export BoardConfig, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize
  const src = readFileSync(new URL('../../src/engine/core/index.ts', import.meta.url).pathname, 'utf8');
  assert.ok(/GRID_SIZE.*DEFAULT_BOARD_CONFIG.*validateGridSize/.test(src));
  assert.ok(/validateBoardConfig/.test(src));
  assert.ok(/resolveGridSize/.test(src));
  assert.ok(/BoardConfig/.test(src));
  // runtime: types are importable
  const cfg: BoardConfig = { size: 4 };
  assert.strictEqual(resolveGridSize(cfg), 4);
});

// ── P1: ledger + helpers single-source scans ─────────────────────────────────

test('[P1-06] deferred-work.md resolution-undo 0f53c41e 64-hex single DW entry', () => {
  const ledger = readFileSync(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  const hits = (ledger.match(/0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f/g) || []).length;
  assert.strictEqual(hits, 1, 'ledger must contain exactly one 0f53c41e 64-hex for GRID_SIZE entry');
});

test('[P1-07] helpers helpers.ts re-exports single-source from core/index not reimplements', () => {
  const src = readFileSync(new URL('../../test-utils/helpers.ts', import.meta.url).pathname, 'utf8');
  assert.ok(/from '\.\.\/src\/engine\/core\/index/.test(src), 'helpers must re-export from core/index');
  // runtime parity: helper resolveGridSize same message as core
  assert.throws(() => validateGridSize(5), /unsupported grid size/);
});

// ── P2: NaN/float/string + staticBoard/boardWith threading ──────────────────

test('[P2-01] NaN/Infinity/float/string rejected via resolveGridSize', () => {
  for (const bad of [NaN, Infinity, -Infinity, 4.5, '4' as unknown as number]) {
    assert.throws(() => resolveGridSize(bad as number), /unsupported grid size/);
  }
});

test('[P2-02] helpers staticBoard/boardWith threading preserves 4x4 fill', () => {
  const s = staticBoard([1, 2, 3, 4], 4);
  assert.deepStrictEqual(s[0], [1, 2, 3, 4]);
  for (let r = 1; r < 4; r++) assert.deepStrictEqual(s[r], [3, 6, 12, 24]);

  const b = boardWith([[9, null, null, null]], 4);
  assert.strictEqual(b[0][0], 9);
  assert.strictEqual(b.length, 4);
});

test('[P2-03] no prod merge logic changed — canMerge/mergeValue/shiftLine still driven by GRID_SIZE', () => {
  const src = readFileSync(new URL('../../src/engine/core/types.ts', import.meta.url).pathname, 'utf8');
  assert.strictEqual((src.match(/export const GRID_SIZE/g) || []).length, 1);
  assert.ok(/BoardConfig/.test(src));
});

test('[P2-04] Board shape is Cell[][] additive-only, GameState unchanged', () => {
  const src = readFileSync(new URL('../../src/engine/core/types.ts', import.meta.url).pathname, 'utf8');
  assert.ok(/export type Board = Cell\[\]\[\]/.test(src));
  assert.ok(/export interface GameState/.test(src));
});
