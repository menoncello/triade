import { test } from 'node:test';
import assert from 'node:assert';
import * as engine from '../../src/engine/core/index.ts';
import type { Board, Direction, Rng } from '../../src/engine/core/index.ts';
import {
  boardWith,
  gameState,
  mulberry32,
  oppositeEdgeCandidates,
  rngOf,
  spyRng,
  staticBoard,
} from '../../test-utils/helpers.ts';

// Story 12.1 — Spawn no lado oposto das linhas movidas.
//
// RED-PHASE ACCEPTANCE SCAFFOLDS. These tests encode the NEW directional-spawn
// contract (Epic 12). They are expected to FAIL against the current engine,
// which still spawns into a uniformly random empty cell. They drive the
// implementation (T1–T4 in the story) toward GREEN.
//
// Oracle: `oppositeEdgeCandidates` (shared in `test-utils/helpers.ts`) derives
// the expected spawn set from the engine's OWN shift primitives
// (movementLines + shiftLine) — independent of whether `move` actually restricts
// the spawn to that set. If `move` places the spawn elsewhere, the test is red.
const eligibleOppositeCells = oppositeEdgeCandidates;

function spawnedCellOf(res: ReturnType<typeof engine.move>): [number, number] {
  const spawned = res.trace.find((e) => e.spawned);
  assert.ok(spawned, 'an effective move must produce a spawned trace entry');
  return spawned.to;
}

// ---------------------------------------------------------------------------
// AC1 — directional placement: spawned tile is on the opposite edge of a moved
// line (left->rightmost col, right->leftmost col, up->bottom row, down->top row).
// ---------------------------------------------------------------------------

test('[P0] AC1 left: spawn lands on the rightmost column of the only moved row', () => {
  const board = boardWith([
    [null, 2, null, null], // row0 shifts left -> moved
    [4, 8, 16, 32], // row1 compact, no merge -> unchanged
    [3, 6, 12, 24], // row2 unchanged
    [1, 2, null, null], // row3 already left-aligned -> unchanged
  ]);
  const res = engine.move(gameState(board, { value: 1, displayRoll: 0 }), 'left', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  // Only row0 moved; opposite edge = (0, GRID_SIZE-1) = (0, 3).
  assert.deepStrictEqual(spawnedCellOf(res), [0, engine.GRID_SIZE - 1]);
});

test('[P0] AC1 right: spawn lands on the leftmost column of the only moved row', () => {
  const board = boardWith([
    [null, null, 2, null], // row0 shifts right -> moved
    [32, 16, 8, 4], // row1 compact right, no merge -> unchanged
    [24, 12, 6, 3], // row2 unchanged
    [null, null, null, 1], // row3 already right-aligned -> unchanged
  ]);
  const res = engine.move(gameState(board, { value: 1, displayRoll: 0 }), 'right', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  // Only row0 moved; opposite edge = (0, 0).
  assert.deepStrictEqual(spawnedCellOf(res), [0, 0]);
});

test('[P0] AC1 up: spawn lands on the bottom row of the only moved column', () => {
  const board = boardWith([
    [null, 4, 3, 1],
    [2, 8, 6, 2],
    [null, 16, 12, null],
    [null, 32, 24, null],
  ]);
  // col0 [null,2,null,null] shifts up -> moved; other columns unchanged.
  const res = engine.move(gameState(board, { value: 1, displayRoll: 0 }), 'up', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  // Only col0 moved; opposite edge = (GRID_SIZE-1, 0) = (3, 0).
  assert.deepStrictEqual(spawnedCellOf(res), [engine.GRID_SIZE - 1, 0]);
});

test('[P0] AC1 down: spawn lands on the top row of the only moved column', () => {
  const board = boardWith([
    [2, 4, 3, 1],
    [null, 8, 6, 2],
    [null, 16, 12, null],
    [null, 32, 24, null],
  ]);
  // col0 [2,null,null,null] shifts down -> moved; other columns unchanged.
  const res = engine.move(gameState(board, { value: 1, displayRoll: 0 }), 'down', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  // Only col0 moved; opposite edge = (0, 0).
  assert.deepStrictEqual(spawnedCellOf(res), [0, 0]);
});

// ---------------------------------------------------------------------------
// AC2 — only moved lines eligible: a line that did not change is never an
// eligible spawn line; the spawn never lands on the opposite edge of an
// unchanged line. (Story: 12.1 AC2, AC7 rewrite of the old uniform tripwire.)
// ---------------------------------------------------------------------------

test('[P0] AC2 only moved lines eligible: spawn restricted to the moved-row opposite edges, never an unchanged line', () => {
  const board = boardWith([
    [null, 2, null, null], // row0 moves
    [null, 4, null, null], // row1 moves
    [3, 6, 12, 24], // row2 unchanged
    [1, 2, null, null], // row3 unchanged
  ]);
  const eligible = eligibleOppositeCells(board, 'left'); // [(0,3),(1,3)]
  const res = engine.move(gameState(board, { value: 7, displayRoll: 0 }), 'left', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  const cell = spawnedCellOf(res);
  assert.ok(
    eligible.some(([r, c]) => r === cell[0] && c === cell[1]),
    `spawn ${cell} must be on a moved line's opposite edge ${JSON.stringify(eligible)}`
  );
  // Unchanged lines (rows 2 and 3) must never receive the spawn.
  assert.notDeepStrictEqual(cell, [2, engine.GRID_SIZE - 1]);
  assert.notDeepStrictEqual(cell, [3, engine.GRID_SIZE - 1]);
});

test('[P0] AC2 seeded drift tripwire: across many effective left moves the spawn NEVER lands off a moved line', () => {
  // Row 0 [3,3,null,null] merges to [6]; rows 1-3 empty (unchanged). Only
  // row0 moved -> the ONLY eligible cell is (0, GRID_SIZE-1) = (0, 3).
  const eligible = [[0, engine.GRID_SIZE - 1]];
  const N = 5000;
  const rng = mulberry32(0xc31);
  let offEdge = 0;
  let onEdge = 0;
  for (let i = 0; i < N; i++) {
    const state = gameState(boardWith([[3, 3, null, null], [], [], []]), { value: 1, displayRoll: 0 });
    const res = engine.move(state, 'left', rng);
    assert.strictEqual(res.moved, true);
    const cell = spawnedCellOf(res);
    if (cell[0] === eligible[0][0] && cell[1] === eligible[0][1]) onEdge++;
    else offEdge++;
  }
  assert.strictEqual(offEdge, 0, `directional contract violated: ${offEdge}/${N} spawns landed off the moved-line edge`);
  assert.strictEqual(onEdge, N, `every effective move must spawn on the moved-line edge (got ${onEdge}/${N})`);
});

// ---------------------------------------------------------------------------
// AC3 — uniform among candidates, exactly 1 rng draw for the cell pick.
// ---------------------------------------------------------------------------

test('[P0] AC3 spawnTile with candidates: picks uniformly among candidates and consumes EXACTLY 1 draw', () => {
  const board = boardWith([
    [null, 2, 3, null], // (0,0) and (0,3) empty -> both in candidates
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, null], // (3,3) empty -> in candidates; the 3 empties ARE the candidates
  ]);
  // candidates is a strict SUBSET of all empties -> if the engine honors the
  // pool, every pick lands in candidates (never a non-candidate empty).
  const candidates: Array<[number, number]> = [
    [3, 3],
    [0, 0],
    [0, 3],
  ];
  const N = 6000;
  const rng = mulberry32(0x1234);
  const counts = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const b = boardWith([
      [null, 2, 3, null],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, null],
    ]);
    const spy = spyRng(rng());
    // NOTE: 4th arg `candidates` is the new optional param (story T2). Current
    // engine ignores it; once implemented it must restrict the pick to candidates.
    const spawn = engine.spawnTile(b, 42, spy, candidates);
    assert.strictEqual(spy.calls.length, 1, 'spawnTile must draw exactly 1 rng value for the cell pick');
    assert.ok(spawn.cell != null, 'spawn must place on a concrete cell');
    assert.strictEqual(spawn.value, 42, 'spawnTile places the given value (place-not-roll)');
    assert.ok(
      candidates.some(([r, c]) => r === spawn.cell![0] && c === spawn.cell![1]),
      `spawn ${spawn.cell} must be one of the candidates ${JSON.stringify(candidates)}`
    );
    const key = `${spawn.cell![0]},${spawn.cell![1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Uniform over the 3 candidates (5σ window). Current uniform-over-all-empties
  // behavior places candidates at ~1/15 each, far below 1/3 -> red until fixed.
  const expected = 1 / candidates.length;
  const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
  for (const [r, c] of candidates) {
    const observed = (counts.get(`${r},${c}`) ?? 0) / N;
    assert.ok(
      Math.abs(observed - expected) < tol,
      `candidate (${r},${c}): ${observed.toFixed(4)} vs expected ~${expected.toFixed(4)}`
    );
  }
});

// ---------------------------------------------------------------------------
// AC4 — no fallback needed: a moved move always yields a non-empty candidate
// set, so the spawn cell is non-null. A noop produces no spawn and 0 draws.
// ---------------------------------------------------------------------------

test('[P0] AC4 effective move always yields a spawn cell (candidate set non-empty); noop yields none and 0 draws', () => {
  const movedBoard = boardWith([
    [null, 2, null, null],
    [4, 8, 16, 32],
    [3, 6, 12, 24],
    [1, 2, null, null],
  ]);
  const movedRes = engine.move(gameState(movedBoard, { value: 1, displayRoll: 0 }), 'left', rngOf(0, 0.5, 0.5));
  assert.strictEqual(movedRes.moved, true);
  const spawned = movedRes.trace.find((e) => e.spawned);
  assert.ok(spawned, 'effective move must spawn');
  assert.ok(spawned!.to != null, 'spawn cell must be non-null when a line moved');

  const noopBoard = boardWith([
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
  const spy = spyRng();
  const noopRes = engine.move(gameState(noopBoard, { value: 1, displayRoll: 0 }), 'left', spy);
  assert.strictEqual(noopRes.moved, false);
  assert.ok(!noopRes.trace.some((e) => e.spawned), 'a noop must produce no spawned trace entry');
  assert.strictEqual(spy.calls.length, 0, 'a noop consumes zero rng draws');
});

// ---------------------------------------------------------------------------
// AC5 — value + preview unchanged, backward compatible. spawnTile gains an
// optional `candidates` param. When OMITTED, behavior is unchanged (all-empty
// pick, 1 draw). Regression guard: stays green before AND after implementation.
// ---------------------------------------------------------------------------

test('[P0] AC5 spawnTile with no candidates (omitted) keeps all-empty behavior: places on an empty cell, 1 draw', () => {
  const board = staticBoard([1, 2, null, null]); // row0 has two empties; rows1-3 full
  const emptyCells: Array<[number, number]> = [
    [0, 2],
    [0, 3],
  ];
  const spy = spyRng(0);
  const spawn = engine.spawnTile(board, 42, spy);
  assert.strictEqual(spy.calls.length, 1, 'spawnTile (no candidates) draws exactly 1 for the cell');
  assert.ok(spawn.cell != null, 'must place on a concrete cell');
  assert.ok(
    emptyCells.some(([r, c]) => r === spawn.cell![0] && c === spawn.cell![1]),
    `spawn ${spawn.cell} must be one of the empty cells ${JSON.stringify(emptyCells)}`
  );
  assert.strictEqual(spawn.value, 42, 'placed value is the given one (place-not-roll)');
});

test('[P0] AC5 spawnTile with a provided-but-empty candidate pool returns {cell:null,value:null} and 0 draws (engine-never-throws)', () => {
  const board = boardWith([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16], // full board
  ]);
  const spy = spyRng(0.5);
  const spawn = engine.spawnTile(board, 42, spy, [
    [0, 0],
    [1, 1],
  ]);
  assert.strictEqual(spy.calls.length, 0, 'empty pool must not call pickIndex (avoids pool[0] undefined)');
  assert.strictEqual(spawn.cell, null);
  assert.strictEqual(spawn.value, null);
});

// ---------------------------------------------------------------------------
// AC6 — move() shape unchanged; spawned tile appears in trace with spawned:true.
// Regression guard (green before AND after).
// ---------------------------------------------------------------------------

test('[P0] AC6 move() returns {board,score,moved,trace,pendingSpawn} and the spawn carries spawned:true', () => {
  const board = boardWith([
    [null, 2, null, null],
    [4, 8, 16, 32],
    [3, 6, 12, 24],
    [1, 2, null, null],
  ]);
  const res = engine.move(gameState(board, { value: 1, displayRoll: 0 }), 'left', rngOf(0, 0.5, 0.5));
  assert.deepStrictEqual(Object.keys(res).sort(), ['board', 'moved', 'pendingSpawn', 'score', 'trace']);
  const spawned = res.trace.find((e) => e.spawned);
  assert.ok(spawned, 'trace must carry the spawned tile');
  assert.strictEqual(spawned!.value, 1, 'spawned value equals the pre-resolved pending');
  assert.deepStrictEqual(spawned!.from, []);
});
