import { test } from 'node:test';
import assert from 'node:assert';
import * as engine from '../../src/engine/core/index.ts';
import { spawnTile, pickIndex } from '../../src/engine/core/spawn.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';
import { boardWith, emptyBoard, spyRng, mulberry32, rngOf, staticBoard } from '../../test-utils/helpers.ts';

// Story 12.1 — T2: spawnTile gains optional candidates?: Array<[r,c]>
// - omitted => all-empty uniform pick, 1 draw (backward compatible)
// - provided => filtered to empty cells, uniform among pool, 1 draw; empty pool => nulls, 0 draws
// This suite exhaustively pins that contract at unit level, independent of move().

test('[P0] spawnTile omitted candidates: places uniformly among all empties, 1 draw', () => {
  const board = boardWith([
    [1, null, null, null],
    [2, 3, 4, 5],
    [6, 7, 8, 9],
    [10, 11, 12, null],
  ]);
  // empties are (0,1),(0,2),(0,3),(3,3) in row-major order
  const emptyCount = 4;
  const N = 4000;
  const rng = mulberry32(0xabc);
  const counts = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const b = boardWith([
      [1, null, null, null],
      [2, 3, 4, 5],
      [6, 7, 8, 9],
      [10, 11, 12, null],
    ]);
    const spy = spyRng(rng());
    const res = spawnTile(b, 42, spy);
    assert.strictEqual(spy.calls.length, 1, 'omitted candidates: exactly 1 draw');
    assert.ok(res.cell !== null, 'must place');
    assert.strictEqual(res.value, 42, 'place-not-roll: given value');
    assert.strictEqual(b[res.cell![0]][res.cell![1]], 42, 'board mutated at cell');
    const key = `${res.cell![0]},${res.cell![1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Uniform among 4 empties: each ~25% within 5σ
  for (const cell of [[0, 1], [0, 2], [0, 3], [3, 3]] as const) {
    const observed = (counts.get(`${cell[0]},${cell[1]}`) ?? 0) / N;
    const expected = 1 / emptyCount;
    const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
    assert.ok(Math.abs(observed - expected) < tol, `cell ${cell}: ${observed.toFixed(4)} vs ${expected.toFixed(4)}`);
  }
});

test('[P0] spawnTile omitted + full board: returns nulls, 0 draws (engine never throws)', () => {
  const board = boardWith([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
  const spy = spyRng(0.5);
  const res = spawnTile(board, 99, spy);
  assert.strictEqual(spy.calls.length, 0, 'full board must consume 0 draws');
  assert.strictEqual(res.cell, null);
  assert.strictEqual(res.value, null);
  // board untouched
  assert.strictEqual(board[0][0], 1);
});

test('[P0] spawnTile provided candidates: filtered to empties, uniform among pool, 1 draw', () => {
  // Board has empties at (0,0),(0,3),(1,1),(3,3) but candidates is a strict subset
  // -> only candidates that are empty are eligible; non-empty candidates ignored.
  const candidates: Array<[number, number]> = [
    [0, 0], // empty -> eligible
    [0, 3], // empty -> eligible
    [0, 1], // OCCUPIED (board has 2) -> filtered out
    [3, 3], // empty -> eligible
    [1, 0], // OCCUPIED (5) -> filtered out
  ];
  const expectedPool: Array<[number, number]> = [
    [0, 0],
    [0, 3],
    [3, 3],
  ];
  const N = 6000;
  const rng = mulberry32(0x1234);
  const counts = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const b = boardWith([
      [null, 2, 3, null],
      [5, null, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, null],
    ]);
    // candidates as above but board here has empties at (0,0),(0,3),(1,1),(3,3)
    // Cross-check: our per-iteration board matches the filtering expectation.
    const boardCandidates: Array<[number, number]> = [
      [0, 0],
      [0, 3],
      [0, 1], // 2 occupied
      [3, 3],
      [1, 0], // 5 occupied
    ];
    const spy = spyRng(rng());
    const res = spawnTile(b, 77, spy, boardCandidates);
    assert.strictEqual(spy.calls.length, 1, 'provided non-empty pool: exactly 1 draw');
    assert.ok(res.cell !== null);
    assert.strictEqual(res.value, 77);
    assert.ok(
      expectedPool.some(([r, c]) => r === res.cell![0] && c === res.cell![1]),
      `spawn ${res.cell} must be in filtered pool ${JSON.stringify(expectedPool)}`
    );
    // Ensure filtered-out occupied candidate never selected
    assert.notDeepStrictEqual(res.cell, [0, 1], 'occupied candidate must never receive spawn');
    assert.notDeepStrictEqual(res.cell, [1, 0], 'occupied candidate must never receive spawn');
    const key = `${res.cell![0]},${res.cell![1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const expected = 1 / expectedPool.length;
  const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
  for (const [r, c] of expectedPool) {
    const observed = (counts.get(`${r},${c}`) ?? 0) / N;
    assert.ok(Math.abs(observed - expected) < tol, `candidate (${r},${c}): ${observed.toFixed(4)} vs ${expected.toFixed(4)}`);
  }
});

test('[P0] spawnTile provided but all candidates occupied: returns nulls, 0 draws', () => {
  const board = boardWith([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
  // Every candidate is occupied on this full board -> pool empty
  const candidates: Array<[number, number]> = [
    [0, 0],
    [1, 1],
    [2, 2],
  ];
  const spy = spyRng(0.9);
  const res = spawnTile(board, 42, spy, candidates);
  assert.strictEqual(spy.calls.length, 0, 'empty filtered pool must not draw');
  assert.strictEqual(res.cell, null);
  assert.strictEqual(res.value, null);
  // Never throws, never picks pool[0] undefined
});

test('[P0] spawnTile provided empty array: returns nulls, 0 draws (edge)', () => {
  const board = boardWith([
    [1, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  const spy = spyRng(0.5);
  const res = spawnTile(board, 42, spy, []);
  assert.strictEqual(spy.calls.length, 0, 'empty candidates array => 0 draws');
  assert.strictEqual(res.cell, null);
  assert.strictEqual(res.value, null);
});

test('[P0] spawnTile provided single candidate that is empty: deterministic pick, 1 draw', () => {
  const board = emptyBoard();
  board[0][0] = 1;
  // Only (3,3) is the candidate and it is empty -> always that cell
  const candidates: Array<[number, number]> = [[3, 3]];
  const spy = spyRng(0.99);
  const res = spawnTile(board, 7, spy, candidates);
  assert.strictEqual(spy.calls.length, 1, 'single candidate still draws exactly 1');
  assert.deepStrictEqual(res.cell, [3, 3]);
  assert.strictEqual(res.value, 7);
  assert.strictEqual(board[3][3], 7);
});

test('[P0] spawnTile candidate determinism: same rng value picks same index', () => {
  const board = boardWith([
    [null, null, null, null],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
  // candidates order matters: pool order is input order filtered
  const candidates: Array<[number, number]> = [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ];
  // rng 0.0 -> index 0 -> (0,0); 0.5 -> index 2 -> (0,2); 0.99 -> index 3 -> (0,3)
  const check = (rngVal: number, expected: [number, number]) => {
    const b = boardWith([
      [null, null, null, null],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
    const res = spawnTile(b, 1, rngOf(rngVal), candidates);
    assert.deepStrictEqual(res.cell, expected, `rng ${rngVal} should pick ${expected}`);
  };
  check(0.0, [0, 0]);
  check(0.5, [0, 2]);
  check(0.99, [0, 3]);
});

test('[P0] spawnTile place-not-roll invariant holds for both paths', () => {
  const board = boardWith([
    [1, 2, null, null],
    [3, 4, 5, 6],
    [7, 8, 9, 10],
    [11, 12, 13, 14],
  ]);
  // Omitted path
  const r1 = spawnTile(boardWith([[1, 2, null, null], [3, 4, 5, 6], [7, 8, 9, 10], [11, 12, 13, 14]]), 99, rngOf(0));
  assert.strictEqual(r1.value, 99, 'omitted path places given value');
  // Candidate path
  const r2 = spawnTile(boardWith([[1, 2, null, null], [3, 4, 5, 6], [7, 8, 9, 10], [11, 12, 13, 14]]), 77, rngOf(0), [[0, 2], [0, 3]]);
  assert.strictEqual(r2.value, 77, 'candidate path places given value');
  assert.deepStrictEqual(r2.cell, [0, 2], 'rng 0 picks first candidate');
});

test('[P0] spawnTile does not mutate board when pool empty (provided)', () => {
  const board = boardWith([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
  const snapshot = board.map((r) => r.slice());
  const res = spawnTile(board, 42, rngOf(0.5), [[0, 0]]);
  assert.deepStrictEqual(board, snapshot, 'full board unchanged on empty pool');
  assert.strictEqual(res.cell, null);
});

test('[P1] pickIndex contract: 1 draw per spawnTile cell pick, never -1', () => {
  // pickIndex is the primitive behind spawnTile's uniformity
  assert.strictEqual(pickIndex(0, rngOf(0.5)), 0, 'empty collection -> 0');
  assert.strictEqual(pickIndex(4, rngOf(1)), 3, 'rng 1 clamps to len-1');
  assert.strictEqual(pickIndex(4, rngOf(-0.5)), 0, 'negative rng clamps to 0');
  // NaN guard
  const nanRng = () => NaN;
  assert.strictEqual(pickIndex(4, nanRng), 0, 'NaN rng -> 0 (engine-never-throws)');
});

test('[P1] spawnTile with mix of empty and occupied candidates respects exactly the empty subset (statistical)', () => {
  // Board has empties at (0,0) and (3,3) only among candidates; others are occupied
  const N = 3000;
  const rng = mulberry32(0xbeef);
  let unexpected = 0;
  for (let i = 0; i < N; i++) {
    const b = boardWith([
      [null, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11],
      [12, 13, 14, null],
    ]);
    const candidates: Array<[number, number]> = [
      [0, 0], // empty
      [0, 1], // occupied (1)
      [3, 3], // empty
      [1, 1], // occupied (5)
    ];
    const res = spawnTile(b, 1, rng, candidates);
    assert.ok(res.cell !== null);
    if (res.cell![0] === 0 && res.cell![1] === 1) unexpected++;
    if (res.cell![0] === 1 && res.cell![1] === 1) unexpected++;
  }
  assert.strictEqual(unexpected, 0, 'occupied candidates never selected over 3k draws');
});

test('[P1] spawnTile backward compat: omitted vs provided-with-all-empties are equivalent in eligibility', () => {
  // When candidates is exactly the set of all empties, both paths should be
  // equivalent (both pick among same pool). This verifies no off-by-one in filtering.
  const board = boardWith([
    [1, null, 2, null],
    [3, 4, 5, 6],
    [7, 8, 9, 10],
    [11, 12, 13, null],
  ]);
  // All empties are (0,1),(0,3),(3,3)
  const allEmpties: Array<[number, number]> = [
    [0, 1],
    [0, 3],
    [3, 3],
  ];
  // Omitted
  const b1 = boardWith([
    [1, null, 2, null],
    [3, 4, 5, 6],
    [7, 8, 9, 10],
    [11, 12, 13, null],
  ]);
  const r1 = spawnTile(b1, 5, rngOf(0), undefined);
  // Provided with all empties
  const b2 = boardWith([
    [1, null, 2, null],
    [3, 4, 5, 6],
    [7, 8, 9, 10],
    [11, 12, 13, null],
  ]);
  const r2 = spawnTile(b2, 5, rngOf(0), allEmpties);
  // Both with rng 0 -> first empty in pool order: (0,1)
  assert.deepStrictEqual(r1.cell, [0, 1], 'omitted rng 0 picks first empty row-major');
  assert.deepStrictEqual(r2.cell, [0, 1], 'provided all-empties rng 0 picks first candidate');
});
