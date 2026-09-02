/**
 * API Gateway — dw-engine-spawn-candidates-validation (DW-72/DW-73)
 * Host node:test + tsx — pure spawnTile candidates validation + dedup gateway (no Playwright request)
 * Covers P0 critical (malformed/OOB/duplicate uniform/draw-budget) + P1 wiring (4-dir + budget + trace congruence)
 * Mirrors triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts P0/P1 for test_artifacts compliance
 * Run: npm --prefix triade test -- _bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts
 * With working-tree ed54b4e loop+Set delta: 14 pass (~120ms). Before 51e4677 baseline: null is not iterable / 2/3 bias / 1-draw drift.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnTile, pickIndex } from '../../../../triade/src/engine/core/spawn.ts';
import { move } from '../../../../triade/src/engine/core/game.ts';
import { GRID_SIZE } from '../../../../triade/src/engine/core/types.ts';
import {
  boardWith,
  emptyBoard,
  gameState,
  rngOf,
  spyRng,
  mulberry32,
  oppositeEdgeCandidates,
  sigmaBound,
} from '../../../../triade/test-utils/helpers.ts';

// ── P0 critical — spec 8-row matrix + outer guard + occupied/float (10 tests collapsed to 9 gateway, one merged) ──

test('[P0-GW-01] OOB candidate [[4,0]] filtered → empty pool 0 draws no throw (R-001/R-004)', () => {
  const empty = boardWith([
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  const before = empty.map((r) => r.slice());
  assert.doesNotThrow(() => spawnTile(empty, 42, spyRng(0.5), [[4, 0]] as unknown as Array<[number, number]>));
  const spy = spyRng(0.5);
  const res = spawnTile(empty, 42, spy, [[4, 0]] as unknown as Array<[number, number]>);
  assert.equal(spy.calls.length, 0, 'OOB only → 0 draws');
  assert.equal(res.cell, null);
  assert.equal(res.value, null);
  assert.deepEqual(empty, before, 'input not mutated');
  assert.notEqual(res.board, empty, 'clone !== input');

  const b2 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const spy2 = spyRng(0);
  const res2 = spawnTile(b2, 7, spy2, [[4, 0], [0, 0]] as unknown as Array<[number, number]>);
  assert.equal(spy2.calls.length, 1, 'OOB ignored valid kept → 1 draw');
  assert.deepEqual(res2.cell, [0, 0]);
  assert.equal(res2.board[0][0], 7);
});

test('[P0-GW-02] null/undefined entry filtered via !Array.isArray guard → valid kept 1 draw no throw (R-001)', () => {
  const board = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const before = board.map((r) => r.slice());
  const candidates = [null as unknown as [number, number], [0, 0] as [number, number]];
  assert.doesNotThrow(() => spawnTile(boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]), 42, spyRng(0), candidates));
  const spy = spyRng(0);
  const res = spawnTile(board, 42, spy, candidates);
  assert.equal(spy.calls.length, 1);
  assert.deepEqual(res.cell, [0, 0]);
  assert.deepEqual(board, before);

  const board2 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const spy2 = spyRng(0);
  const res2 = spawnTile(board2, 42, spy2, [undefined as unknown as [number, number], [0, 0]]);
  assert.equal(spy2.calls.length, 1);
  assert.deepEqual(res2.cell, [0, 0]);
});

test('[P0-GW-03] missing column [1] + non-number ["a","b"] filtered via length<2 + typeof guard (R-001)', () => {
  const spy1 = spyRng(0.5);
  const res1 = spawnTile(emptyBoard(), 42, spy1, [[1] as unknown as Array<[number, number]>]);
  assert.equal(spy1.calls.length, 0, '[1] → 0 draws');
  assert.equal(res1.cell, null);
  assert.doesNotThrow(() => spawnTile(emptyBoard(), 42, spyRng(0.5), [[1] as unknown as Array<[number, number]>]));

  const b2 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const spy2 = spyRng(0);
  const res2 = spawnTile(b2, 42, spy2, [[1] as unknown as [number, number], [0, 0]]);
  assert.equal(spy2.calls.length, 1);
  assert.deepEqual(res2.cell, [0, 0]);

  const spy3 = spyRng(0.5);
  const res3 = spawnTile(emptyBoard(), 42, spy3, [['a', 'b'] as unknown as Array<[number, number]>]);
  assert.equal(spy3.calls.length, 0, 'non-number → 0 draws');
  assert.equal(res3.cell, null);
  assert.doesNotThrow(() => spawnTile(emptyBoard(), 42, spyRng(0.5), [['a', 'b'] as unknown as Array<[number, number]>]));

  const b3 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const spy4 = spyRng(0);
  const res4 = spawnTile(b3, 42, spy4, [['a', 'b'] as unknown as Array<[number, number]>, [0, 0]]);
  assert.equal(spy4.calls.length, 1);
  assert.deepEqual(res4.cell, [0, 0]);
});

test('[P0-GW-04] duplicate dedup uniform AC3 — [[0,0],[0,0],[1,1]] → pool 2 uniform 1/2 not 2/3 (R-002)', () => {
  const candidates = [[0, 0], [0, 0], [1, 1]] as unknown as Array<[number, number]>;
  const bA = boardWith([[null, 2, 3, 4], [5, null, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  assert.deepEqual(spawnTile(bA, 42, rngOf(0), candidates).cell, [0, 0], 'rng 0 → [0,0]');
  const bB = boardWith([[null, 2, 3, 4], [5, null, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  assert.deepEqual(spawnTile(bB, 42, rngOf(0.6), candidates).cell, [1, 1], 'rng 0.6 → [1,1]');

  const N = 4000;
  const rng = mulberry32(0xbeef);
  const counts = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const b = boardWith([[null, 2, 3, 4], [5, null, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spy = spyRng(rng());
    const before = b.map((r) => r.slice());
    const res = spawnTile(b, 42, spy, candidates);
    assert.equal(spy.calls.length, 1);
    assert.ok(res.cell !== null);
    assert.ok([[0, 0], [1, 1]].some(([r, c]) => r === res.cell![0] && c === res.cell![1]));
    assert.deepEqual(b, before);
    assert.notEqual(res.board, b);
    assert.equal(res.board[res.cell![0]][res.cell![1]], 42);
    const key = `${res.cell![0]},${res.cell![1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const expected = 0.5;
  const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
  for (const cell of [[0, 0], [1, 1]] as const) {
    const observed = (counts.get(`${cell[0]},${cell[1]}`) ?? 0) / N;
    assert.ok(Math.abs(observed - expected) < tol, `cell ${cell}: ${observed.toFixed(4)} vs ${expected.toFixed(4)} within 5σ ${tol.toFixed(4)} (not 2/3 bias)`);
  }
});

test('[P0-GW-05] valid pool [[0,3],[1,3]] uniform pickIndex(2) 1 draw placed value (spec row 6)', () => {
  const candidates: Array<[number, number]> = [[0, 3], [1, 3]];
  const N = 200;
  const rng = mulberry32(0x1234);
  const counts = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const b = boardWith([[null, 2, 3, null], [5, 6, 7, null], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spy = spyRng(rng());
    const before = b.map((r) => r.slice());
    const res = spawnTile(b, 77, spy, candidates);
    assert.equal(spy.calls.length, 1);
    assert.ok(res.cell !== null);
    assert.equal(res.value, 77);
    assert.ok(candidates.some(([r, c]) => r === res.cell![0] && c === res.cell![1]));
    assert.deepEqual(b, before);
    assert.notEqual(res.board, b);
    assert.equal(res.board[res.cell![0]][res.cell![1]], 77);
    const key = `${res.cell![0]},${res.cell![1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const expected = 0.5;
  const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
  for (const [r, c] of candidates) {
    const observed = (counts.get(`${r},${c}`) ?? 0) / N;
    assert.ok(Math.abs(observed - expected) < tol, `candidate (${r},${c}): ${observed.toFixed(4)} vs ${expected.toFixed(4)}`);
  }
});

test('[P0-GW-06] mix valid+invalid+dup+OOB → [[0,0],null,[4,0],[0,0],[0,3]] deduped to [[0,0],[0,3]] 1 draw (R-003)', () => {
  const mixed = [[0, 0], null, [4, 0], [0, 0], [0, 3]] as unknown as Array<[number, number]>;
  const board = boardWith([[null, 2, 3, null], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, null]]);
  const spy = spyRng(0);
  const res = spawnTile(board, 42, spy, mixed);
  assert.equal(spy.calls.length, 1, 'mixed pool deduped to 2 → 1 draw');
  assert.ok(res.cell !== null);
  assert.ok([[0, 0], [0, 3]].some(([r, c]) => r === res.cell![0] && c === res.cell![1]));

  const N = 4000;
  const rng = mulberry32(0xabc);
  const counts = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const b = boardWith([[null, 2, 3, null], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, null]]);
    const s = spyRng(rng());
    const r = spawnTile(b, 42, s, mixed);
    assert.equal(s.calls.length, 1);
    const key = `${r.cell![0]},${r.cell![1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const expected = 0.5;
  const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
  for (const cell of [[0, 0], [0, 3]] as const) {
    const observed = (counts.get(`${cell[0]},${cell[1]}`) ?? 0) / N;
    assert.ok(Math.abs(observed - expected) < tol, `mix cell ${cell}: ${observed.toFixed(4)} vs ${expected.toFixed(4)}`);
  }
});

test('[P0-GW-07] non-array outer guard null/42/object → {cell:null,value:null} 0 draws no throw (R-009)', () => {
  const board = emptyBoard();
  assert.doesNotThrow(() => spawnTile(board, 42, spyRng(0.5), null as unknown as Array<[number, number]>));
  const spyNull = spyRng(0.5);
  const resNull = spawnTile(board, 42, spyNull, null as unknown as Array<[number, number]>);
  assert.equal(spyNull.calls.length, 0, 'null outer → 0 draws');
  assert.equal(resNull.cell, null);
  assert.equal(resNull.value, null);
  assert.notEqual(resNull.board, board);

  const spyNum = spyRng(0.5);
  const resNum = spawnTile(board, 42, spyNum, 42 as unknown as Array<[number, number]>);
  assert.equal(spyNum.calls.length, 0);
  assert.equal(resNum.cell, null);

  const spyObj = spyRng(0.5);
  const resObj = spawnTile(board, 42, spyObj, { 0: 0, 1: 0 } as unknown as Array<[number, number]>);
  assert.equal(spyObj.calls.length, 0);
  assert.equal(resObj.cell, null);
});

test('[P0-GW-08] occupied + float filtering — [[0,0] occupied,[0.5,0] float]→0 draws; [[0,0] occupied,[0,3] empty]→1 draw (R-004/R-005/R-006)', () => {
  const boardOcc = boardWith([[1, 2, 3, null], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const spyFloat = spyRng(0.5);
  const resFloat = spawnTile(boardOcc, 42, spyFloat, [[0.5, 0] as unknown as Array<[number, number]>, [0, 0]]);
  assert.equal(spyFloat.calls.length, 0, 'float+occupied → 0 draws');
  assert.equal(resFloat.cell, null);

  const spyOcc = spyRng(0);
  const resOcc = spawnTile(boardOcc, 42, spyOcc, [[0, 0], [0, 3]]);
  assert.equal(spyOcc.calls.length, 1);
  assert.deepEqual(resOcc.cell, [0, 3]);
  assert.equal(resOcc.board[0][3], 42);

  const board2 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const spyF2 = spyRng(0);
  const resF2 = spawnTile(board2, 42, spyF2, [[1.1, 1] as unknown as Array<[number, number]>, [0, 0]]);
  assert.deepEqual(resF2.cell, [0, 0]);
  assert.equal(spyF2.calls.length, 1);
});

test('[P0-GW-09] omitted candidates undefined → unchanged all-empty uniform 1 draw (spec row 8, R-008)', () => {
  const N = 4000;
  const rng = mulberry32(0xabc);
  const counts = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const b = boardWith([[1, null, null, null], [2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, null]]);
    const spy = spyRng(rng());
    const before = b.map((r) => r.slice());
    const res = spawnTile(b, 42, spy);
    assert.equal(spy.calls.length, 1, 'omitted non-empty → 1 draw');
    assert.ok(res.cell !== null);
    assert.deepEqual(b, before);
    assert.notEqual(res.board, b);
    const key = `${res.cell![0]},${res.cell![1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const expected = 1 / 4;
  const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
  for (const cell of [[0, 1], [0, 2], [0, 3], [3, 3]] as const) {
    const observed = (counts.get(`${cell[0]},${cell[1]}`) ?? 0) / N;
    assert.ok(Math.abs(observed - expected) < tol, `omitted cell ${cell}: ${observed.toFixed(4)} vs ${expected.toFixed(4)}`);
  }

  const full = boardWith([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const spyFull = spyRng(0.5);
  const resFull = spawnTile(full, 42, spyFull);
  assert.equal(spyFull.calls.length, 0, 'omitted full → 0 draws');
  assert.equal(resFull.cell, null);
});

// ── P1 wiring — game.move 4-dir + draw-budget + trace congruence ──

test('[P1-GW-01] game.move 4-dir opposite-edge pipeline still correct after validation (R-007)', () => {
  const cases: Array<{ dir: 'left' | 'right' | 'up' | 'down'; board: Array<Array<number | null>> }> = [
    { dir: 'left', board: [[null, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]] },
    { dir: 'right', board: [[null, null, 2, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]] },
    { dir: 'up', board: [[null, null, null, null], [2, null, null, null], [null, null, null, null], [null, null, null, null]] },
    { dir: 'down', board: [[2, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]] },
  ];
  for (const { dir, board: mat } of cases) {
    const b = boardWith(mat);
    const state = gameState(b, { value: 9, displayRoll: 0.1 });
    const candidatesBefore = oppositeEdgeCandidates(state.board, dir);
    assert.ok(candidatesBefore.length > 0, `${dir} must have at least 1 opposite-edge candidate`);
    const res = move(state, dir, rngOf(0, 0.35, 0.45));
    assert.equal(res.moved, true, `${dir} must be effective`);
    const spawned = res.trace.find((e) => e.spawned);
    assert.ok(spawned, `${dir} trace has spawned`);
    assert.equal(res.board[spawned!.to[0]][spawned!.to[1]], 9);
    const inCandidates = candidatesBefore.some(([r, c]) => r === spawned!.to[0] && c === spawned!.to[1]);
    assert.equal(inCandidates, true, `${dir} spawn ${spawned!.to} must be in oppositeEdgeCandidates ${JSON.stringify(candidatesBefore)}`);
  }
});

test('[P1-GW-02] provided-but-empty pool still nulls 0 draws, move noop 0 draws (R-008)', () => {
  const full = boardWith([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const spy = spyRng(0.9);
  const res = spawnTile(full, 42, spy, [[0, 0], [1, 1]]);
  assert.equal(spy.calls.length, 0);
  assert.equal(res.cell, null);
  assert.equal(res.value, null);

  const empty = emptyBoard();
  const spyOob = spyRng(0.5);
  const resOob = spawnTile(empty, 42, spyOob, [[4, 0]] as unknown as Array<[number, number]>);
  assert.equal(spyOob.calls.length, 0);
  assert.equal(resOob.cell, null);

  const noopBoard = boardWith([[3, 6, 3, 6], [6, 3, 6, 3], [3, 6, 3, 6], [6, 3, 6, 3]]);
  const noopState = gameState(noopBoard, { value: 1, displayRoll: 0 });
  let drew = false;
  const noDrawRng = Object.assign(() => { drew = true; return 0.5; }, { calls: [] as number[] });
  const noopRes = move(noopState, 'left', noDrawRng as unknown as ReturnType<typeof spyRng>);
  assert.equal(noopRes.moved, false);
  assert.equal(drew, false, 'noop 0 draws');
});

test('[P1-GW-03] draw-budget preservation — spawnTile 1 vs 0, move effective 3 vs noop 0 (R-003)', () => {
  const bPlace = boardWith([[1, null, null, null], [2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, null]]);
  const spyPlace = spyRng(0);
  spawnTile(bPlace, 42, spyPlace);
  assert.equal(spyPlace.calls.length, 1, 'omitted placing 1 draw');

  const spyCand = spyRng(0);
  spawnTile(boardWith([[null, 2, 3, null], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, null]]), 77, spyCand, [[0, 0], [0, 3]]);
  assert.equal(spyCand.calls.length, 1, 'candidate non-empty 1 draw');

  const bFull = boardWith([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  const spyFull = spyRng(0.5);
  spawnTile(bFull, 99, spyFull);
  assert.equal(spyFull.calls.length, 0, 'full 0 draws');

  const state = gameState(boardWith([[null, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]), { value: 1, displayRoll: 0 });
  const spyMove = spyRng(0, 0.5, 0.9);
  const res = move(state, 'left', spyMove);
  assert.equal(res.moved, true);
  assert.equal(spyMove.calls.length, 3, 'effective move 3 draws (validation adds 0)');
});

test('[P1-GW-04] transitionPlan assertNoLeak — resultingTiles equals occupiedCells after candidate filtering (R-007)', async () => {
  const b = boardWith([[1, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
  const state = gameState(b, { value: 4, displayRoll: 0.2 });
  const res = move(state, 'right', rngOf(0, 0.35, 0.45));
  const { planTileTransitions, resultingTiles } = await import('../../../../triade/src/render/transitionPlan.ts');
  const { occupiedCells } = await import('../../../../triade/test-utils/helpers.ts');
  const plan = planTileTransitions(b, res);
  const byCell = (a: { cell: [number, number] }, bCell: { cell: [number, number] }) => a.cell[0] - bCell.cell[0] || a.cell[1] - bCell.cell[1];
  const tiles = resultingTiles(plan).map((t) => ({ cell: t.cell, value: t.value })).sort(byCell);
  const occ = occupiedCells(res.board);
  assert.deepEqual(tiles, occ, 'resultingTiles(plan) must equal occupiedCells(result.board)');
});

test('[P1-GW-05] ledger 365ffe33 + sprint-status untouched pin (R-010)', () => {
  const ledger = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  assert.ok(ledger.includes('365ffe33'), 'ledger contains 365ffe33 for DW-72/73');
  assert.ok(ledger.includes('status: done 2026-09-02'), 'DW-72/73 done 2026-09-02');
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  assert.equal(gameSrc.includes('sprint'), false);
});
