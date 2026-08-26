import { test } from 'node:test';
import assert from 'node:assert';
import * as engine from '../../src/engine/core/index.ts';
import type { Board, Direction } from '../../src/engine/core/index.ts';
import {
  boardWith,
  emptyBoard,
  gameState,
  mulberry32,
  oppositeEdgeCandidates,
  rngOf,
  spyRng,
} from '../../test-utils/helpers.ts';
import { planTileTransitions, resultingTiles } from '../../src/render/transitionPlan.ts';

// Story 12.1 integration: move() restricting spawn to opposite edge of moved
// lines (left->rightmost col, right->leftmost col, up->bottom row, down->top row)
// must integrate correctly with line shift, board reconstruction, trace,
// draw-budget, and render plan. These tests exercise the FULL pipeline
// (movementLines -> shiftLine(moved) -> boardFromLines -> spawnTile(candidates)
// -> trace -> pendingSpawn) rather than isolated helpers.

const eligibleOppositeCells = oppositeEdgeCandidates;

function spawnedCellOf(res: ReturnType<typeof engine.move>): [number, number] {
  const spawned = res.trace.find((e) => e.spawned);
  assert.ok(spawned, 'effective move must produce spawned trace entry');
  return spawned.to;
}

// ---------------------------------------------------------------------------
// Per-direction placement via the real move() pipeline
// ---------------------------------------------------------------------------

test('[P0] integration left: spawn is at (row, GRID_SIZE-1) of a moved row only', () => {
  const board = boardWith([
    [null, 2, null, null], // row0 moves left
    [4, 8, 16, 32], // row1 packed -> unchanged
    [3, 6, 12, 24], // row2 unchanged
    [3, 6, 12, 24], // row3 packed -> unchanged (not [1,2] which merges)
  ]);
  const res = engine.move(gameState(board, { value: 5, displayRoll: 0 }), 'left', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  // Only row0 moved => only (0,3) eligible
  assert.deepStrictEqual(spawnedCellOf(res), [0, engine.GRID_SIZE - 1]);
  assert.strictEqual(res.board[0][3], 5, 'spawn value materializes at opposite edge');
  // Unchanged rows must not shift
  assert.deepStrictEqual(res.board[1], [4, 8, 16, 32]);
  assert.deepStrictEqual(res.board[2], [3, 6, 12, 24]);
});

test('[P0] integration right: spawn is at (row, 0) of a moved row only', () => {
  const board = boardWith([
    [null, null, 2, null], // row0 moves right -> [_,_,_,2] pre-spawn
    [32, 16, 8, 4], // row1 packed right -> unchanged
    [24, 12, 6, 3],
    [null, null, null, 1], // row3 already right-aligned -> unchanged
  ]);
  const res = engine.move(gameState(board, { value: 9, displayRoll: 0 }), 'right', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  assert.deepStrictEqual(spawnedCellOf(res), [0, 0]);
  assert.strictEqual(res.board[0][0], 9);
});

test('[P0] integration up: spawn is at (GRID_SIZE-1, col) of a moved column only', () => {
  const board = boardWith([
    [null, 4, 3, 1],
    [2, 8, 6, 2],
    [null, 16, 12, null],
    [null, 32, 24, null],
  ]);
  // col0 [null,2,null,null] shifts up -> moved; others packed -> unchanged
  const res = engine.move(gameState(board, { value: 7, displayRoll: 0 }), 'up', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  assert.deepStrictEqual(spawnedCellOf(res), [engine.GRID_SIZE - 1, 0]);
  assert.strictEqual(res.board[3][0], 7);
});

test('[P0] integration down: spawn is at (0, col) of a moved column only', () => {
  const board = boardWith([
    [2, 4, 3, 1],
    [null, 8, 6, 2],
    [null, 16, 12, null],
    [null, 32, 24, null],
  ]);
  // col0 [2,null,null,null] shifts down -> moved
  const res = engine.move(gameState(board, { value: 11, displayRoll: 0 }), 'down', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  assert.deepStrictEqual(spawnedCellOf(res), [0, 0]);
  assert.strictEqual(res.board[0][0], 11);
});

// ---------------------------------------------------------------------------
// Only moved lines are eligible — unchanged line never receives spawn
// ---------------------------------------------------------------------------

test('[P0] integration AC2: spawn never lands on opposite edge of an unchanged line', () => {
  const board = boardWith([
    [null, 2, null, null], // row0 moves
    [null, 4, null, null], // row1 moves
    [3, 6, 12, 24], // row2 unchanged
    [3, 6, 12, 24], // row3 unchanged (packed, not mergeable [1,2])
  ]);
  const eligible = eligibleOppositeCells(board, 'left'); // [(0,3),(1,3)]
  assert.deepStrictEqual(eligible, [
    [0, 3],
    [1, 3],
  ]);
  const res = engine.move(gameState(board, { value: 1, displayRoll: 0 }), 'left', rngOf(0, 0.5, 0.5));
  const cell = spawnedCellOf(res);
  assert.ok(
    eligible.some(([r, c]) => r === cell[0] && c === cell[1]),
    `spawn ${cell} must be in eligible ${JSON.stringify(eligible)}`
  );
  assert.notDeepStrictEqual(cell, [2, 3], 'unchanged row2 must not receive spawn');
  assert.notDeepStrictEqual(cell, [3, 3], 'unchanged row3 must not receive spawn');
});

test('[P0] integration AC2 vertical: only moved columns eligible', () => {
  const board = boardWith([
    [1, null, 3, 4],
    [null, null, 6, 8],
    [null, null, 12, 16],
    [null, null, 24, 32],
  ]);
  // col0 [1,null,null,null]: already at wall (up) -> not moved; but down it moves.
  // Test up: only col0's single tile is already at top -> no move; other cols similarly.
  // Use a board where exactly col1 moves up — other cols packed so only col1 is eligible.
  const upBoard = boardWith([
    [4, null, 3, 1],
    [8, 2, 6, 6],
    [16, null, 12, 12],
    [32, null, 24, 24],
  ]);
  // col1 [null,2,null,null] moves up; others unchanged (col3 [1,6,12,24] is packed)
  const upEligible = eligibleOppositeCells(upBoard, 'up');
  assert.deepStrictEqual(upEligible, [[3, 1]]);
  const upRes = engine.move(gameState(upBoard, { value: 1, displayRoll: 0 }), 'up', rngOf(0, 0.5, 0.5));
  assert.deepStrictEqual(spawnedCellOf(upRes), [3, 1]);
});

// ---------------------------------------------------------------------------
// Candidate set is guaranteed non-empty when moved==true (AC4) — no fallback
// ---------------------------------------------------------------------------

test('[P0] integration AC4: effective move always has non-empty candidate set => spawn cell non-null', () => {
  // Enumerate several effective boards for each direction and assert spawn exists
  // All boards have ONLY the intended line moving; other rows/cols are packed.
  const cases: Array<{ board: Board; dir: Direction }> = [
    { board: boardWith([[null, 2, null, null], [4, 8, 16, 32], [3, 6, 12, 24], [3, 6, 12, 24]]), dir: 'left' },
    { board: boardWith([[null, null, 2, null], [32, 16, 8, 4], [24, 12, 6, 3], [3, 6, 12, 24]]), dir: 'right' },
    {
      board: boardWith([
        [null, 4, 3, 1],
        [2, 8, 6, 6],
        [null, 16, 12, 12],
        [null, 32, 24, 24],
      ]),
      dir: 'up',
    },
    {
      board: boardWith([
        [2, 4, 3, 1],
        [null, 8, 6, 6],
        [null, 16, 12, 12],
        [null, 32, 24, 24],
      ]),
      dir: 'down',
    },
  ];
  for (const { board, dir } of cases) {
    const res = engine.move(gameState(board, { value: 1, displayRoll: 0 }), dir, rngOf(0, 0.5, 0.5));
    assert.strictEqual(res.moved, true, `board must move ${dir}`);
    const spawned = res.trace.find((e) => e.spawned);
    assert.ok(spawned, `${dir}: effective move must spawn`);
    assert.ok(spawned!.to[0] >= 0 && spawned!.to[0] < engine.GRID_SIZE);
    assert.ok(spawned!.to[1] >= 0 && spawned!.to[1] < engine.GRID_SIZE);
    // Candidate cell must be empty before spawn; after move it holds the spawn value
    assert.strictEqual(res.board[spawned!.to[0]][spawned!.to[1]], 1);
  }
});

test('[P0] integration noop: no spawn, trace clean, 0 draws', () => {
  const board = boardWith([
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
  const spy = spyRng();
  const res = engine.move(gameState(board, { value: 99, displayRoll: 0.9 }), 'left', spy);
  assert.strictEqual(res.moved, false, 'full immovable board must be noop');
  assert.strictEqual(res.trace.filter((e) => e.spawned).length, 0, 'noop must not spawn in trace');
  assert.deepStrictEqual(res.board, board, 'noop board unchanged');
  assert.strictEqual(spy.calls.length, 0, 'noop consumes 0 draws');
  // Pending unchanged
  assert.deepStrictEqual(res.pendingSpawn, { value: 99, displayRoll: 0.9 });
});

// ---------------------------------------------------------------------------
// Draw-budget preserved: effective = 3 draws (cell, next value, displayRoll)
// ---------------------------------------------------------------------------

test('[P0] integration draw-budget: effective move 3 draws, cell draw picks among candidates', () => {
  const board = boardWith([
    [null, 2, null, null],
    [null, 4, null, null],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
  // eligible [(0,3),(1,3)] -> rng 0 picks first, 0.66 picks second (0.99 would be second as well but 0.66 is clearer for 2 items)
  const spyA = spyRng(0, 0.2, 0.3);
  const resA = engine.move(gameState(board, { value: 1, displayRoll: 0 }), 'left', spyA);
  assert.deepStrictEqual(spyA.calls, [0, 0.2, 0.3], 'draw order: cell, next value, displayRoll');
  assert.deepStrictEqual(spawnedCellOf(resA), [0, 3], 'rng 0 picks first candidate (0,3)');

  // New board instance for second draw
  const board2 = boardWith([
    [null, 2, null, null],
    [null, 4, null, null],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
  const spyB = spyRng(0.75, 0.2, 0.3);
  const resB = engine.move(gameState(board2, { value: 1, displayRoll: 0 }), 'left', spyB);
  assert.deepStrictEqual(spawnedCellOf(resB), [1, 3], 'rng 0.75 picks last candidate (1,3) for 2-way choice');
  // pendingSpawn resolved from post-merge ceiling (value draw 0.2)
  assert.ok(resA.pendingSpawn.value >= 1 && resA.pendingSpawn.value <= 3);
  assert.strictEqual(resA.pendingSpawn.displayRoll, 0.3);
});

// ---------------------------------------------------------------------------
// Uniform distribution among candidates (statistical, on the live move path)
// ---------------------------------------------------------------------------

test('[P0] integration AC3: uniform among candidates on the live move path (statistical)', () => {
  // Board with exactly 2 moved rows -> 2 candidates -> uniform 50/50
  const template: Board = boardWith([
    [null, 2, null, null], // row0 moves
    [null, 4, null, null], // row1 moves
    [3, 6, 12, 24], // unchanged (packed)
    [3, 6, 12, 24], // unchanged (packed) — not [1,2] which would merge and move!
  ]);
  const N = 6000;
  const rng = mulberry32(0xbeef);
  const counts = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const board = boardWith([
      [null, 2, null, null],
      [null, 4, null, null],
      [3, 6, 12, 24],
      [3, 6, 12, 24],
    ]);
    const res = engine.move(gameState(board, { value: 1, displayRoll: 0 }), 'left', rng);
    assert.strictEqual(res.moved, true);
    const cell = spawnedCellOf(res);
    const key = `${cell[0]},${cell[1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    // Must be one of the two eligible
    assert.ok(cell[0] === 0 || cell[0] === 1, 'row must be 0 or 1');
    assert.strictEqual(cell[1], 3, 'col must be opposite edge (3)');
  }
  const expected = 0.5;
  const tol = 5 * Math.sqrt((expected * (1 - expected)) / N);
  for (const r of [0, 1] as const) {
    const observed = (counts.get(`${r},3`) ?? 0) / N;
    assert.ok(Math.abs(observed - expected) < tol, `candidate (${r},3): ${observed.toFixed(4)} vs ${expected.toFixed(4)}`);
  }
  assert.strictEqual(counts.size, 2, 'no spawn outside the two candidates');
});

// ---------------------------------------------------------------------------
// Trace + render plan consistency
// ---------------------------------------------------------------------------

test('[P0] integration trace + render plan: spawned tile appears in trace and is realized on board', () => {
  const board = boardWith([
    [1, 2, null, null],
    [4, 8, 16, 32],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
  const res = engine.move(gameState(board, { value: 42, displayRoll: 0 }), 'left', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true);
  const spawned = res.trace.find((e) => e.spawned);
  assert.ok(spawned);
  assert.strictEqual(spawned!.value, 42, 'spawn materializes pendingSpawn.value');
  assert.deepStrictEqual(spawned!.from, [], 'spawn from is empty');
  // The board has the spawn at the announced cell
  assert.strictEqual(res.board[spawned!.to[0]][spawned!.to[1]], 42);
  // Render plan must realize exactly the occupied cells of the result board
  const plan = planTileTransitions(board, res);
  const tiles = resultingTiles(plan)
    .map((t) => ({ cell: t.cell, value: t.value }))
    .sort((a, b) => a.cell[0] - b.cell[0] || a.cell[1] - b.cell[1]);
  const occupied: Array<{ cell: [number, number]; value: number }> = [];
  for (let r = 0; r < engine.GRID_SIZE; r++)
    for (let c = 0; c < engine.GRID_SIZE; c++) if (res.board[r][c] !== null) occupied.push({ cell: [r, c], value: res.board[r][c] as number });
  occupied.sort((a, b) => a.cell[0] - b.cell[0] || a.cell[1] - b.cell[1]);
  assert.deepStrictEqual(tiles, occupied, 'render plan tiles equal occupied cells after directional spawn');
});

test('[P1] integration boardFromLines + spawnTile equivalence: pre-spawn board plus candidate spawn equals move result', () => {
  const board = boardWith([
    [null, 2, null, null],
    [null, 4, null, null],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
  const dir: Direction = 'left';
  const lines = engine.movementLines(board, dir);
  const shifted = lines.map((l) => engine.shiftLine(l));
  const preBoard = engine.boardFromLines(shifted.map((s) => s.line), dir).board;
  // Derive candidates exactly as game.ts does
  const oppCol = engine.GRID_SIZE - 1;
  const candidates: Array<[number, number]> = [];
  for (let i = 0; i < shifted.length; i++) if (shifted[i].moved) candidates.push([i, oppCol]);
  assert.deepStrictEqual(candidates, [
    [0, 3],
    [1, 3],
  ]);
  // Simulate the spawn pick with a deterministic rng
  const rngVal = 0;
  const preCopy = preBoard.map((r) => r.slice());
  const spawn = engine.spawnTile(preCopy, 99, rngOf(rngVal), candidates);
  assert.deepStrictEqual(spawn.cell, [0, 3], 'rng 0 picks first candidate');
  // Compare to move() with same draws (cell=0, value=0.5, displayRoll=0.5)
  const moveRes = engine.move(gameState(board, { value: 99, displayRoll: 0 }), dir, rngOf(rngVal, 0.5, 0.5));
  assert.deepStrictEqual(moveRes.board, spawn.board, 'move board equals manual preBoard+spawnTile');
});

// ---------------------------------------------------------------------------
// All four directions pinned in a single parameterized table
// ---------------------------------------------------------------------------

test('[P1] integration all directions table: eligible set and spawn coincide per direction', () => {
  const rows: Array<{ dir: Direction; board: Board; expected: Array<[number, number]> }> = [
    {
      dir: 'left',
      board: boardWith([[null, 2, null, null], [4, 8, 16, 32], [3, 6, 12, 24], [3, 6, 12, 24]]),
      expected: [[0, 3]],
    },
    {
      dir: 'right',
      board: boardWith([[null, null, 2, null], [32, 16, 8, 4], [24, 12, 6, 3], [3, 6, 12, 24]]),
      expected: [[0, 0]],
    },
    {
      dir: 'up',
      board: boardWith([
        [null, 4, 3, 1],
        [2, 8, 6, 6],
        [null, 16, 12, 12],
        [null, 32, 24, 24],
      ]),
      expected: [[3, 0]],
    },
    {
      dir: 'down',
      board: boardWith([
        [2, 4, 3, 1],
        [null, 8, 6, 6],
        [null, 16, 12, 12],
        [null, 32, 24, 24],
      ]),
      expected: [[0, 0]],
    },
  ];
  for (const { dir, board, expected } of rows) {
    const eligible = eligibleOppositeCells(board, dir);
    assert.deepStrictEqual(eligible, expected, `eligible for ${dir} must be ${JSON.stringify(expected)}`);
    const res = engine.move(gameState(board, { value: 1, displayRoll: 0 }), dir, rngOf(0, 0.5, 0.5));
    assert.deepStrictEqual(spawnedCellOf(res), expected[0], `spawn for ${dir} must be ${expected[0]}`);
  }
});
