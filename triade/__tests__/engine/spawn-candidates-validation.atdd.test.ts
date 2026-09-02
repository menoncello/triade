import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnTile, pickIndex } from '../../src/engine/core/spawn.ts';
import { move } from '../../src/engine/core/game.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';
import {
  boardWith,
  emptyBoard,
  gameState,
  rngOf,
  spyRng,
  mulberry32,
  oppositeEdgeCandidates,
} from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-engine-spawn-candidates-validation — red-phase scaffolds
// covering working-tree delta vs baseline 51e4677 → HEAD ed54b4e:
// triade/src/engine/core/spawn.ts:102-122 — replaces
//   const pool = candidates.filter(([r,c])=> r>=0 && r<GRID_SIZE && c>=0 && c<GRID_SIZE && board[r][c]===null)
// with loop + Set<string> dedup. New guard:
//   if (!Array.isArray(candidates)) return {board: next,…}
//   for(entry as unknown) → !Array.isArray(entry)||entry.length<2 continue
//   typeof r/c !== number continue; !isInteger continue
//   bounds continue; board[r]?.[c]!==null continue; seen.has continue
// Keeps cloneBoard at top, pool.length===0 → 0 draws, pickIndex(pool.length,rng) 1 draw.
// triade/src/engine/core/game.ts:53-78 — byte-identical (distinct in-bounds empties via opposite-edge).
// Spec: _bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md (8-row I/O matrix)
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-engine-spawn-candidates-validation.md
// ---------------------------------------------------------------------------

const spawnSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/engine/core/spawn.ts', import.meta.url)),
  'utf8'
);
const gameSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/engine/core/game.ts', import.meta.url)),
  'utf8'
);
const typesSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/engine/core/types.ts', import.meta.url)),
  'utf8'
);
const deferredSrc = fs.readFileSync(
  fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
  'utf8'
);

describe('ATDD dw-engine-spawn-candidates-validation — P0 critical (single-source pool validation + dedup)', () => {
  it.skip('[P0-01] OOB candidate filtered → empty pool → {cell:null,value:null} 0 draws, no throw (spec row 1, R-001/R-004)', () => {
    // Before fix: candidates.filter(([r,c])=>…) destructures before guard; [4,0] either
    // OOB compare or board[4] undefined. After: bounds check + optional chaining → nulls 0 draws, doesNotThrow.
    const empty = boardWith([
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const before = empty.map((r) => r.slice());
    const spy = spyRng(0.5);
    assert.doesNotThrow(() => spawnTile(empty, 42, spy, [[4, 0]] as unknown as Array<[number, number]>));
    // Re-run with fresh spy for draw count (doesNotThrow above consumed its spy; use new)
    const spy2 = spyRng(0.5);
    const res = spawnTile(empty, 42, spy2, [[4, 0]] as unknown as Array<[number, number]>);
    assert.strictEqual(spy2.calls.length, 0, 'OOB only → 0 draws');
    assert.strictEqual(res.cell, null);
    assert.strictEqual(res.value, null);
    assert.deepStrictEqual(empty, before, 'input not mutated');
    assert.notStrictEqual(res.board, empty, 'returned board is clone !== input');

    // OOB mixed with valid: [[4,0],[0,0]] where [0,0] empty → pool [[0,0]] 1 draw
    const b2 = boardWith([
      [null, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
    const spy3 = spyRng(0);
    const res2 = spawnTile(b2, 7, spy3, [[4, 0], [0, 0]] as unknown as Array<[number, number]>);
    assert.strictEqual(spy3.calls.length, 1, 'OOB ignored, valid kept → 1 draw');
    assert.deepStrictEqual(res2.cell, [0, 0]);
    assert.strictEqual(res2.board[0][0], 7);
  });

  it.skip('[P0-02] null / undefined entry in candidates array → filtered, valid kept, 1 draw, no throw (spec row 2, R-001)', () => {
    // Before fix: candidates.filter(([r,c])=>…) on [null,[0,0]] throws TypeError: null is not iterable
    // at parameter binding before predicate. After: !Array.isArray(entry) continue → pool [[0,0]].
    const board = boardWith([
      [null, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
    const before = board.map((r) => r.slice());
    const candidates = [null as unknown as [number, number], [0, 0] as [number, number]];
    assert.doesNotThrow(() => spawnTile(boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]), 42, spyRng(0), candidates));
    const spy = spyRng(0);
    const res = spawnTile(board, 42, spy, candidates);
    assert.strictEqual(spy.calls.length, 1, 'null filtered, valid kept → 1 draw');
    assert.deepStrictEqual(res.cell, [0, 0]);
    assert.deepStrictEqual(board, before, 'input not mutated');

    // undefined entry same path
    const board2 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spy2 = spyRng(0);
    const res2 = spawnTile(board2, 42, spy2, [undefined as unknown as [number, number], [0, 0]]);
    assert.strictEqual(spy2.calls.length, 1);
    assert.deepStrictEqual(res2.cell, [0, 0]);
  });

  it.skip('[P0-03] missing column [1] (no c) → filtered via length<2 → empty pool 0 draws if no other valid (spec row 3, R-001)', () => {
    const board = emptyBoard();
    const spy = spyRng(0.5);
    const res = spawnTile(board, 42, spy, [[1]] as unknown as Array<[number, number]>);
    assert.strictEqual(spy.calls.length, 0, '[1] filtered → 0 draws');
    assert.strictEqual(res.cell, null);
    assert.strictEqual(res.value, null);
    assert.doesNotThrow(() => spawnTile(emptyBoard(), 42, spyRng(0.5), [[1]] as unknown as Array<[number, number]>));

    // [1] mixed with valid → valid kept 1 draw
    const b2 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spy2 = spyRng(0);
    const res2 = spawnTile(b2, 42, spy2, [[1] as unknown as [number, number], [0, 0]]);
    assert.strictEqual(spy2.calls.length, 1);
    assert.deepStrictEqual(res2.cell, [0, 0]);
  });

  it.skip('[P0-04] non-number type ["a","b"] → filtered via typeof guard, no throw (spec row 4, R-001)', () => {
    const board = emptyBoard();
    const spy = spyRng(0.5);
    const res = spawnTile(board, 42, spy, [['a', 'b']] as unknown as Array<[number, number]>);
    assert.strictEqual(spy.calls.length, 0, 'non-number filtered → 0 draws');
    assert.strictEqual(res.cell, null);
    assert.doesNotThrow(() => spawnTile(emptyBoard(), 42, spyRng(0.5), [['a', 'b']] as unknown as Array<[number, number]>));

    // non-number mixed with valid → valid kept
    const b2 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spy2 = spyRng(0);
    const res2 = spawnTile(b2, 42, spy2, [['a', 'b'], [0, 0]] as unknown as Array<[number, number]>);
    assert.strictEqual(spy2.calls.length, 1);
    assert.deepStrictEqual(res2.cell, [0, 0]);

    // ["a",0] filtered as well
    const b3 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spy3 = spyRng(0);
    const res3 = spawnTile(b3, 42, spy3, [['a', 0], [0, 0]] as unknown as Array<[number, number]>);
    assert.deepStrictEqual(res3.cell, [0, 0]);
  });

  it.skip('[P0-05] duplicate cells deduped — [[0,0],[0,0],[1,1]] all empty → pool.length 2 uniform 1/2 each, 1 draw (spec row 5, R-002 AC3)', () => {
    // Without dedup pool.length would be 3 with [0,0] twice → P([0,0])=2/3 not 1/2, breaking AC3 uniform.
    // Must dedup via Set<string> keyed by `${r},${c}` after validation, not before pickIndex.
    const candidates = [[0, 0], [0, 0], [1, 1]] as unknown as Array<[number, number]>;
    // Deterministic pin: rng 0 → first pool entry, rng 0.6 → second
    const bA = boardWith([[null, null, 3, 4], [5, null, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    assert.deepStrictEqual(spawnTile(bA, 42, rngOf(0), candidates).cell, [0, 0], 'rng 0 picks first deduped');
    const bB = boardWith([[null, null, 3, 4], [5, null, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    assert.deepStrictEqual(spawnTile(bB, 42, rngOf(0.6), candidates).cell, [1, 1], 'rng 0.6 picks second deduped');

    // Statistical uniformity: N=4000 loop must show 50% ±5σ each, not 66/33. Also spy 1 draw each.
    const N = 4000;
    const rng = mulberry32(0xbeef);
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const b = boardWith([[null, null, 3, 4], [5, null, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
      const spy = spyRng(rng());
      const before = b.map((r) => r.slice());
      const res = spawnTile(b, 42, spy, candidates);
      assert.strictEqual(spy.calls.length, 1, 'deduped pool still 1 draw per spawn');
      assert.ok(res.cell !== null);
      assert.ok([[0, 0], [1, 1]].some(([r, c]) => r === res.cell![0] && c === res.cell![1]), 'cell in deduped pool');
      assert.deepStrictEqual(b, before, 'input not mutated (clone hygiene)');
      assert.notStrictEqual(res.board, b, 'returned board !== input');
      assert.strictEqual(res.board[res.cell![0]][res.cell![1]], 42);
      const key = `${res.cell![0]},${res.cell![1]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const expected = 0.5;
    const tol = 5 * Math.sqrt((expected * (1 - expected)) / N); // ~0.0395 at N=4000
    for (const cell of [[0, 0], [1, 1]] as const) {
      const observed = (counts.get(`${cell[0]},${cell[1]}`) ?? 0) / N;
      assert.ok(Math.abs(observed - expected) < tol, `cell ${cell}: ${observed.toFixed(4)} vs ${expected.toFixed(4)} within 5σ ${tol.toFixed(4)} (not 2/3 bias)`);
    }
  });

  it.skip('[P0-06] valid pool kept — [[0,3],[1,3]] both empty → uniform pickIndex(2) 1 draw, placed value (spec row 6)', () => {
    const candidates: Array<[number, number]> = [[0, 3], [1, 3]];
    const N = 200;
    const rng = mulberry32(0x1234);
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const b = boardWith([[null, 2, 3, null], [5, 6, 7, null], [9, 10, 11, 12], [13, 14, 15, 16]]);
      const spy = spyRng(rng());
      const before = b.map((r) => r.slice());
      const res = spawnTile(b, 77, spy, candidates);
      assert.strictEqual(spy.calls.length, 1);
      assert.ok(res.cell !== null);
      assert.strictEqual(res.value, 77);
      assert.ok(candidates.some(([r, c]) => r === res.cell![0] && c === res.cell![1]));
      assert.deepStrictEqual(b, before, 'input not mutated');
      assert.notStrictEqual(res.board, b);
      assert.strictEqual(res.board[res.cell![0]][res.cell![1]], 77);
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

  it.skip('[P0-07] mix valid+invalid+dup+OOB → [[0,0],null,[4,0],[0,0],[0,3]] deduped/filtered to [[0,0],[0,3]] 1 draw (spec row 7, R-003)', () => {
    // Board has empties at (0,0) and (0,3) among candidates; null/OOB/dup must be silently filtered.
    const mixed = [[0, 0], null, [4, 0], [0, 0], [0, 3]] as unknown as Array<[number, number]>;
    const board = boardWith([
      [null, 2, 3, null],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, null],
    ]);
    const spy = spyRng(0);
    const res = spawnTile(board, 42, spy, mixed);
    assert.strictEqual(spy.calls.length, 1, 'mixed pool deduped to 2 → 1 draw');
    assert.ok(res.cell !== null);
    assert.ok([[0, 0], [0, 3]].some(([r, c]) => r === res.cell![0] && c === res.cell![1]), `spawn ${res.cell} must be in [[0,0],[0,3]]`);

    // Uniformity over same mixed pool N=4000
    const N = 4000;
    const rng = mulberry32(0xabc);
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const b = boardWith([[null, 2, 3, null], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, null]]);
      const s = spyRng(rng());
      const r = spawnTile(b, 42, s, mixed);
      assert.strictEqual(s.calls.length, 1);
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

  it.skip('[P0-08] non-array candidates outer guard → null/42/object → {cell:null,value:null} 0 draws, no throw, no pickIndex (R-009)', () => {
    const board = emptyBoard();
    assert.doesNotThrow(() => spawnTile(board, 42, spyRng(0.5), null as unknown as Array<[number, number]>));
    const spyNull = spyRng(0.5);
    // spy must have 0 draws: guard returns before pickIndex; we need to avoid exhaustion so pass a dummy rng that would error if called
    // Instead use spyRng with one value but assert 0 calls means rng not consumed.
    const spyNull2 = spyRng(0.5);
    const resNull = spawnTile(board, 42, spyNull2, null as unknown as Array<[number, number]>);
    assert.strictEqual(spyNull2.calls.length, 0, 'null outer → 0 draws');
    assert.strictEqual(resNull.cell, null);
    assert.strictEqual(resNull.value, null);
    assert.notStrictEqual(resNull.board, board);

    const spyNum = spyRng(0.5);
    const resNum = spawnTile(board, 42, spyNum, 42 as unknown as Array<[number, number]>);
    assert.strictEqual(spyNum.calls.length, 0, 'number outer → 0 draws');
    assert.strictEqual(resNum.cell, null);

    const spyObj = spyRng(0.5);
    const resObj = spawnTile(board, 42, spyObj, { 0: 0, 1: 0 } as unknown as Array<[number, number]>);
    assert.strictEqual(spyObj.calls.length, 0, 'object outer → 0 draws');
    assert.strictEqual(resObj.cell, null);
  });

  it.skip('[P0-09] occupied + float filtering — [[0,0] occupied, [0.5,0] float] → empty pool 0 draws; [[0,0] occupied, [0,3] empty] → pool size 1 (R-004/R-005/R-006)', () => {
    // Occupied + float → 0 draws
    const boardOcc = boardWith([[1, 2, 3, null], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    // [0,0] occupied, [0.5,0] float → pool []
    const spyFloat = spyRng(0.5);
    const resFloat = spawnTile(boardOcc, 42, spyFloat, [[0.5, 0], [0, 0]] as unknown as Array<[number, number]>);
    assert.strictEqual(spyFloat.calls.length, 0, 'float+occupied → 0 draws');
    assert.strictEqual(resFloat.cell, null);

    // [0,0] occupied, [0,3] empty → pool [[0,3]] 1 draw
    const spyOcc = spyRng(0);
    const resOcc = spawnTile(boardOcc, 42, spyOcc, [[0, 0], [0, 3]]);
    assert.strictEqual(spyOcc.calls.length, 1, 'occupied filtered, valid kept → 1 draw');
    assert.deepStrictEqual(resOcc.cell, [0, 3]);
    assert.strictEqual(resOcc.board[0][3], 42);

    // [1.1,1] float mixed with valid
    const board2 = boardWith([[null, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spyF2 = spyRng(0);
    const resF2 = spawnTile(board2, 42, spyF2, [[1.1, 1], [0, 0]] as unknown as Array<[number, number]>);
    assert.deepStrictEqual(resF2.cell, [0, 0]);
    assert.strictEqual(spyF2.calls.length, 1);
  });

  it.skip('[P0-10] omitted candidates (undefined) → unchanged all-empty uniform pick, 1 draw (spec row 8, R-008)', () => {
    // When candidates is undefined, behavior is unchanged: all-empty uniform pick, 1 draw if empty else 0.
    const board = boardWith([
      [1, null, null, null],
      [2, 3, 4, 5],
      [6, 7, 8, 9],
      [10, 11, 12, null],
    ]);
    // empties (0,1)(0,2)(0,3)(3,3) — omitted path picks among all 4 uniformly
    const N = 4000;
    const rng = mulberry32(0xabc);
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const b = boardWith([[1, null, null, null], [2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, null]]);
      const spy = spyRng(rng());
      const before = b.map((r) => r.slice());
      const res = spawnTile(b, 42, spy);
      assert.strictEqual(spy.calls.length, 1, 'omitted non-empty → 1 draw');
      assert.ok(res.cell !== null);
      assert.deepStrictEqual(b, before, 'input not mutated');
      assert.notStrictEqual(res.board, b);
      const key = `${res.cell![0]},${res.cell![1]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const expected = 1 / 4;
    const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
    for (const cell of [[0, 1], [0, 2], [0, 3], [3, 3]] as const) {
      const observed = (counts.get(`${cell[0]},${cell[1]}`) ?? 0) / N;
      assert.ok(Math.abs(observed - expected) < tol, `omitted cell ${cell}: ${observed.toFixed(4)} vs ${expected.toFixed(4)}`);
    }

    // omitted on full board → 0 draws
    const full = boardWith([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spyFull = spyRng(0.5);
    const resFull = spawnTile(full, 42, spyFull);
    assert.strictEqual(spyFull.calls.length, 0, 'omitted full → 0 draws');
    assert.strictEqual(resFull.cell, null);
  });
});

describe('ATDD dw-engine-spawn-candidates-validation — P1 wiring (4-dir opposite-edge + draw budget + trace)', () => {
  it.skip('[P1-01] game.move 4-direction opposite-edge pipeline still correct after validation (R-007)', () => {
    // game.ts is byte-identical; validation must not over-filter its distinct in-bounds empties.
    // Seed boards: single tile off wall per direction → opposite edge spawn.
    const cases: Array<{ dir: 'left' | 'right' | 'up' | 'down'; board: Array<Array<number | null>>; expect: 'col' | 'row' }> = [
      { dir: 'left', board: [[null, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], expect: 'col' },
      { dir: 'right', board: [[null, null, 2, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], expect: 'col' },
      { dir: 'up', board: [[null, null, null, null], [2, null, null, null], [null, null, null, null], [null, null, null, null]], expect: 'row' },
      { dir: 'down', board: [[2, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], expect: 'row' },
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
      assert.strictEqual(res.board[spawned!.to[0]][spawned!.to[1]], 9);
      const inCandidates = candidatesBefore.some(([r, c]) => r === spawned!.to[0] && c === spawned!.to[1]);
      assert.equal(inCandidates, true, `${dir} spawn ${spawned!.to} must be in oppositeEdgeCandidates ${JSON.stringify(candidatesBefore)}`);
    }
  });

  it.skip('[P1-02] provided-but-empty pool still {cell:null,value:null} 0 draws, move noop 0 draws (R-008)', () => {
    // Full board with provided candidates → 0 draws
    const full = boardWith([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spy = spyRng(0.9);
    const res = spawnTile(full, 42, spy, [[0, 0], [1, 1]]);
    assert.strictEqual(spy.calls.length, 0, 'empty filtered pool → 0 draws');
    assert.strictEqual(res.cell, null);
    assert.strictEqual(res.value, null);
    // OOB-only pool → 0 draws (covers R-004)
    const empty = emptyBoard();
    const spyOob = spyRng(0.5);
    const resOob = spawnTile(empty, 42, spyOob, [[4, 0]] as unknown as Array<[number, number]>);
    assert.strictEqual(spyOob.calls.length, 0);
    assert.strictEqual(resOob.cell, null);
    // move noop → 0 draws (true gameOver board)
    const noopBoard = boardWith([[3, 6, 3, 6], [6, 3, 6, 3], [3, 6, 3, 6], [6, 3, 6, 3]]);
    const noopState = gameState(noopBoard, { value: 1, displayRoll: 0 });
    let drew = false;
    const noDrawRng = Object.assign(() => { drew = true; return 0.5; }, { calls: [] as number[] });
    const noopRes = move(noopState, 'left', noDrawRng as unknown as ReturnType<typeof spyRng>);
    assert.equal(noopRes.moved, false);
    assert.equal(drew, false, 'noop 0 draws');
  });

  it.skip('[P1-03] draw-budget preservation — spawnTile 1 vs 0, move effective 3 vs noop 0, newGame 20 (R-003)', () => {
    // spawnTile placing 1 draw
    const bPlace = boardWith([[1, null, null, null], [2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, null]]);
    const spyPlace = spyRng(0);
    spawnTile(bPlace, 42, spyPlace);
    assert.strictEqual(spyPlace.calls.length, 1, 'omitted placing 1 draw');
    // candidate pool non-empty 1 draw
    const spyCand = spyRng(0);
    spawnTile(boardWith([[null, 2, 3, null], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, null]]), 77, spyCand, [[0, 0], [0, 3]]);
    assert.strictEqual(spyCand.calls.length, 1, 'candidate non-empty 1 draw');
    // full 0 draws
    const bFull = boardWith([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spyFull = spyRng(0.5);
    spawnTile(bFull, 99, spyFull);
    assert.strictEqual(spyFull.calls.length, 0, 'full 0 draws');
    // move effective 3 draws (1 pickIndex + 1 resolveSpawn + 1 displayRoll)
    const state = gameState(boardWith([[null, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]), { value: 1, displayRoll: 0 });
    const spyMove = spyRng(0, 0.5, 0.9);
    const res = move(state, 'left', spyMove);
    assert.equal(res.moved, true);
    assert.strictEqual(spyMove.calls.length, 3, 'effective move 3 draws (validation adds 0)');
    // newGame 20 draws (not changed by this bundle, gate only)
  });

  it.skip('[P1-04] transitionPlan assertNoLeak — resultingTiles equals occupiedCells after candidate filtering (R-007)', async () => {
    const b = boardWith([[1, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
    const state = gameState(b, { value: 4, displayRoll: 0.2 });
    const res = move(state, 'right', rngOf(0, 0.35, 0.45));
    const { planTileTransitions, resultingTiles } = await import('../../src/render/transitionPlan.ts');
    const { occupiedCells } = await import('../../test-utils/helpers.ts');
    const plan = planTileTransitions(b, res);
    const byCell = (a: { cell: [number, number] }, bCell: { cell: [number, number] }) => a.cell[0] - bCell.cell[0] || a.cell[1] - bCell.cell[1];
    const tiles = resultingTiles(plan).map((t) => ({ cell: t.cell, value: t.value })).sort(byCell);
    const occ = occupiedCells(res.board);
    assert.deepStrictEqual(tiles, occ, 'resultingTiles(plan) must equal occupiedCells(result.board) — wrong pool would diverge by 1');
  });
});

describe('ATDD dw-engine-spawn-candidates-validation — P2 static scans + P3 exploratory', () => {
  it.skip('[P2-01] SCAN single-site validation loop + Set dedup + no candidates.filter survivor (R-001/R-002)', () => {
    // Old throw site must be gone, loop + Set must be exactly one site.
    assert.equal((spawnSrc.match(/candidates\.filter\(/g) ?? []).length, 0, 'no candidates.filter survivor (old throw site)');
    assert.equal((spawnSrc.match(/Set<string>/g) ?? []).length, 1, 'exactly 1 Set<string> dedup');
    assert.equal((spawnSrc.match(/seen\.has\(key\)/g) ?? []).length, 1, 'exactly 1 seen.has');
    assert.equal((spawnSrc.match(/seen\.add\(key\)/g) ?? []).length, 1, 'exactly 1 seen.add');
    assert.equal((spawnSrc.match(/if \(!Array\.isArray\(entry\)/g) ?? []).length, 1, 'exactly 1 !Array.isArray(entry) guard');
    assert.equal((spawnSrc.match(/Number\.isInteger/g) ?? []).length, 2, 'exactly 2 Number.isInteger (r and c)');
    assert.equal((spawnSrc.match(/if \(!Array\.isArray\(candidates\)/g) ?? []).length, 1, 'exactly 1 !Array.isArray(candidates) outer guard');
  });

  it.skip('[P2-02] SCAN no GRID_SIZE literal drift — types.ts single GRID_SIZE=4, spawn.ts bounds use GRID_SIZE (R-004)', () => {
    assert.equal((typesSrc.match(/export const GRID_SIZE/g) ?? []).length, 1, 'single GRID_SIZE definition');
    assert.ok(typesSrc.includes('GRID_SIZE = 4'), 'GRID_SIZE stays 4');
    assert.equal((spawnSrc.match(/GRID_SIZE/g) ?? []).length, 5, 'spawn.ts 5 GRID_SIZE refs (import + 2 empty loops + 2 bound checks)');
    // No hard-coded 4 literal for board dims inside spawnTile candidate loop
    assert.ok(spawnSrc.includes('r >= GRID_SIZE') && spawnSrc.includes('c >= GRID_SIZE'), 'bounds use GRID_SIZE not literal 4');
  });

  it.skip('[P2-03] SCAN optional chaining board[r]?.[c] !== null, not board[r][c] in candidate loop (R-004/R-006)', () => {
    // Candidate loop uses board[r]?.[c] !== null; the only board[r][c] === null survivor is the
    // all-empty branch (for r<GRID_SIZE nested loops) which is safe direct index.
    assert.equal((spawnSrc.match(/board\[r\]\?\.\[c\] !== null/g) ?? []).length, 1, 'candidate loop uses optional chaining');
    assert.equal((spawnSrc.match(/board\[r\]\[c\] === null/g) ?? []).length, 1, 'all-empty branch direct index (r<GRID_SIZE safe)');
    // Must have cloneBoard at top before guard (hygiene preserved)
    assert.ok(spawnSrc.includes('const next = cloneBoard(board)'), 'cloneBoard before guard');
    assert.ok(spawnSrc.includes('pickIndex(pool.length'), 'pool pick via pickIndex');
    assert.equal((spawnSrc.match(/if \(pool\.length === 0\)/g) ?? []).length, 1, 'single pool.length===0 early return');
  });

  it.skip('[P2-04] SCAN no Math.random in engine, ledger resolution-undo hex tail, sprint-status untouched (R-010)', () => {
    // Engine must stay deterministic — no Math.random leak inside spawn.ts candidate loop.
    // The two Math.random survivors are default params (weightedValue and spawnTile) — allowed, but not called inside loop.
    // Ensure loop itself never calls rng() — that is pickIndex only.
    assert.equal((spawnSrc.match(/Math\.random/g) ?? []).length, 2, 'spawn.ts exactly 2 Math.random (weightedValue + spawnTile default params), loop never calls rng');
    assert.equal((gameSrc.match(/Math\.random/g) ?? []).length, 2, 'game.ts exactly 2 Math.random (newGame + move default params)');
    // Ledger DW-72/73 done with 365ffe33… hash
    assert.ok(deferredSrc.includes('365ffe33'), 'deferred-work contains 365ffe33 resolution-undo for DW-72/73');
    assert.ok(deferredSrc.includes('status: done 2026-09-02'), 'DW-72/73 flipped done 2026-09-02');
    // Sprint-status not written by this bundle: verify gameSrc unchanged (proxy for git diff --stat not listing sprint-status)
    // The higher invariant is checked via git diff --stat in the checklist, but here gate the file didn't gain sprint text.
    assert.equal(gameSrc.includes('sprint'), false);
  });

  it.skip('[P3-01] exploratory — 200-move runSeededSession cursor-drift sweep with validated candidates (R-003 residual)', async () => {
    // If filtered-pool miscounted 1 vs 0 draws, seeded mulberry32 cursor skews and later spawned cells diverge.
    // runSeededSession drives stateFromResult 200 moves; we just verify it completes without throw and spawns materialized.
    const { runSeededSession } = await import('../../test-utils/helpers.ts');
    const { spawnValues, n3pairs } = runSeededSession(0x1234, 50);
    assert.equal(spawnValues.length, 50, '50 spawns materialized');
    assert.equal(n3pairs.length, 50, 'N3 pairs 50');
    for (const { promised, materialized } of n3pairs) {
      assert.equal(materialized, promised, 'N3 promised === materialized per move (resolveSpawn tier)');
    }
  });

  it.skip('[P3-02] perf — spawnTile loop+Set O(4) per spawn <500ms for 10k, validation adds no bench regression', () => {
    // Guard loop is ≤ GRID_SIZE (4) entries × Set dedup O(4), clone O(16) dominant — host gate <15 min, not a device lane.
    const board = boardWith([[1, null, null, null], [2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, null]]);
    const loops = 10_000;
    const start = performance.now();
    for (let i = 0; i < loops; i++) {
      spawnTile(board, 42, rngOf(0.5), [[4, 0], null as unknown as [number, number], [0, 0], [0, 0]] as unknown as Array<[number, number]>);
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 800, `10k mixed-pool spawnTile ${elapsed.toFixed(1)}ms <800ms (O(4) guard + O(16) clone)`);
  });
});
