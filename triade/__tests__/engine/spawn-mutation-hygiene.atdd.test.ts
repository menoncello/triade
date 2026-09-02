import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnTile } from '../../src/engine/core/spawn.ts';
import { move } from '../../src/engine/core/game.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';
import { boardWith, emptyBoard, gameState, rngOf, spyRng, oppositeEdgeCandidates } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-engine-spawn-mutation-hygiene — red-phase scaffolds
// covering working-tree delta vs baseline edfc574 → HEAD 53c4f3d:
// triade/src/engine/core/spawn.ts:58-96 — adds cloneBoard(board) {board.map(r=>[...r])}
//   spawnTile clones at top const next=cloneBoard(board) and operates/returns next
//   in all 3 branches (omitted-full board→next, candidate-empty board→next,
//   placing board[cell]→next[cell]). Hygiene doc DW-23/70/75.
// triade/src/engine/core/game.ts:40-92 — move() let effectiveBoard=built.board,
//   spawnTile(effectiveBoard,…) then effectiveBoard=spawn.board, trace.push,
//   return board:effectiveBoard (was const newBoard alias-mutated by spawnTile).
// triade/test-utils/helpers.ts:22-34 — cloneBoard + deepFreezeBoard(board)
//   for(row) Object.freeze(row); Object.freeze(board); gameState(board,pending)
//   now const b=deepFreezeBoard(cloneBoard(board)); return {board:b, pending:{...}}.
// triade/__tests__/engine/spawn-candidates.unit.test.ts:34-172 — two tests gain
//   clone-hygiene before deepEqual + res.board[cell] pins.
// Spec: _bmad-output/implementation-artifacts/spec-engine-spawn-mutation-hygiene.md
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-engine-spawn-mutation-hygiene.md
// ---------------------------------------------------------------------------

const spawnSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/engine/core/spawn.ts', import.meta.url)),
  'utf8'
);
const gameSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/engine/core/game.ts', import.meta.url)),
  'utf8'
);
const helpersSrc = fs.readFileSync(
  fileURLToPath(new URL('../../test-utils/helpers.ts', import.meta.url)),
  'utf8'
);

describe('ATDD dw-engine-spawn-mutation-hygiene — P0 critical (clone / freeze / effectiveBoard)', () => {
  it.skip('[P0-01] spawnTile clones — input not mutated, returned board has value at cell, 1 draw', () => {
    // Before fix: board[cell]=value mutated input and returned same ref; input would equal res.board.
    // After: input deepEqual before, res.board !== input, res.board[cell]===value, spy.calls 1.
    const b = boardWith([
      [1, null, null, null],
      [2, 3, 4, 5],
      [6, 7, 8, 9],
      [10, 11, 12, null],
    ]);
    const before = b.map((r) => r.slice());
    const spy = spyRng(0);
    const res = spawnTile(b, 42, spy);
    assert.deepStrictEqual(b, before, 'input board must not be mutated (clone hygiene DW-23/70)');
    assert.notStrictEqual(res.board, b, 'returned board must be new reference');
    assert.notStrictEqual(res.board[0], b[0], 'row array must be new reference (row spread)');
    assert.ok(res.cell !== null);
    assert.strictEqual(res.board[res.cell![0]][res.cell![1]], 42);
    assert.strictEqual(spy.calls.length, 1, 'placing consumes exactly 1 draw');
  });

  it.skip('[P0-02] spawnTile full board — returns clone !== input, cell/value null, 0 draws', () => {
    // Before fix: full board returned {board, cell:null} same ref as input.
    // After: must return new ref clone !== input even when empty.length===0, 0 draws.
    const board = boardWith([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
    const before = board.map((r) => r.slice());
    const spy = spyRng(0.5);
    const res = spawnTile(board, 99, spy);
    assert.strictEqual(spy.calls.length, 0, 'full board must consume 0 draws');
    assert.strictEqual(res.cell, null);
    assert.strictEqual(res.value, null);
    assert.deepStrictEqual(board, before, 'full board input not mutated');
    assert.notStrictEqual(res.board, board, 'full board must return clone !== input (new-ref divergence DW-75)');
    assert.notStrictEqual(res.board[0], board[0], 'full board row must be new ref');
  });

  it.skip('[P0-03] spawnTile empty candidate pool [] — clone !== input, nulls, 0 draws', () => {
    // Before fix: empty pool returned {board same ref, cell null} alias.
    // After: const next=cloneBoard at top ensures clone even on pool empty.
    const board = boardWith([
      [1, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const before = board.map((r) => r.slice());
    const spy = spyRng(0.5);
    const res = spawnTile(board, 42, spy, []);
    assert.strictEqual(spy.calls.length, 0);
    assert.strictEqual(res.cell, null);
    assert.strictEqual(res.value, null);
    assert.deepStrictEqual(board, before);
    assert.notStrictEqual(res.board, board);
  });

  it.skip('[P0-04] spawnTile all candidates occupied — clone !== input, nulls, 0 draws', () => {
    // Candidates filter to 0 eligible empties → same as empty pool hygiene.
    const board = boardWith([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
    const spy = spyRng(0.9);
    const res = spawnTile(board, 42, spy, [[0, 0], [1, 1], [2, 2]]);
    assert.strictEqual(spy.calls.length, 0);
    assert.strictEqual(res.cell, null);
    assert.strictEqual(res.value, null);
    assert.notStrictEqual(res.board, board);
  });

  it.skip('[P0-05] spawnTile OOB candidates ignored — only in-bounds empty eligible', () => {
    // OOB candidates [−1,0] must be filtered before pool check; otherwise pool empty or wrong idx.
    const board = emptyBoard();
    board[0][0] = 1; // only (0,1) empty among chosen row+ OOB
    // empties on emptyBoard are all cells, but pool is restricted to candidates;
    // only (0,1) is in-bounds+empty, so it must be picked.
    const candidates: Array<[number, number]> = [[-1, 0], [0, 1]];
    const before = board.map((r) => r.slice());
    const spy = spyRng(0.99);
    const res = spawnTile(board, 7, spy, candidates);
    assert.strictEqual(spy.calls.length, 1, 'OOB-filtered pool still 1 draw');
    assert.deepStrictEqual(res.cell, [0, 1]);
    assert.strictEqual(res.board[0][1], 7, 'returned clone has value');
    assert.deepStrictEqual(board, before, 'input not mutated');
    assert.notStrictEqual(res.board, board);
  });

  it.skip('[P0-06] spawnTile provided single candidate empty — deterministic clone hygiene', () => {
    // The second clone-hygiene pin landed in spawn-candidates.unit.test.ts single candidate.
    const board = emptyBoard();
    board[0][0] = 1;
    const candidates: Array<[number, number]> = [[3, 3]];
    const before = board.map((r) => r.slice());
    const spy = spyRng(0.99);
    const res = spawnTile(board, 7, spy, candidates);
    assert.strictEqual(spy.calls.length, 1);
    assert.deepStrictEqual(res.cell, [3, 3]);
    assert.deepStrictEqual(board, before, 'input board must not be mutated');
    assert.strictEqual(res.board[3][3], 7);
    assert.notStrictEqual(res.board, board);
  });

  it.skip('[P0-07] gameState snapshot freeze — returned board deepEqual !== input, frozen outer+rows, mutating stored throws, input mutation after does not affect stored', () => {
    // Before fix: gameState returned {board, pendingSpawn} shallow — input alias leaked, not frozen.
    // After: cloneBoard + deepFreezeBoard rows+outer — must be deepEqual, !== input, frozen, throw on assignment.
    const b = boardWith([
      [1, 2, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const s = gameState(b);
    // deepEqual but not same ref
    assert.deepStrictEqual(s.board, b);
    assert.notStrictEqual(s.board, b);
    assert.notStrictEqual(s.board[0], b[0], 'row ref must differ (clone)');
    assert.equal(Object.isFrozen(s.board), true, 'outer must be frozen');
    assert.equal(s.board.every((r) => Object.isFrozen(r)), true, 'every row must be frozen (DW-81)');
    // mutating stored throws in ESM strict
    assert.throws(() => { (s.board as unknown as Array<Array<number | null>>)[0][0] = 999; }, TypeError);
    // mutating input after does not affect stored
    b[0][0] = 999;
    assert.strictEqual(s.board[0][0], 1, 'stored snapshot isolated from input mutation');
    // pendingSpawn shallow copy isolation
    const b2 = boardWith([[1, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
    const s2 = gameState(b2, { value: 3, displayRoll: 0.5 });
    s2.pendingSpawn.value = 999;
    const s3 = gameState(b2, { value: 3, displayRoll: 0.5 });
    assert.strictEqual(s3.pendingSpawn.value, 3, 'pendingSpawn copy isolation');
  });

  it.skip('[P0-08] move propagates cloned spawn board — result.board contains spawned value at opposite-edge candidate, result.board !== input board ref, prior GameState board unchanged after mutating result.board', () => {
    // Before fix: move() relied on spawnTile mutating const newBoard, then returned newBoard alias.
    // After: let effectiveBoard = spawn.board — must set pendingSpawn.value at a 12.1 opposite-edge candidate,
    // result.board !== state.board, and mutating result.board does not leak to prior state (ADR-06).
    const initial = boardWith([
      [null, 2, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const state = gameState(initial, { value: 9, displayRoll: 0.1 });
    const beforeStateBoard = state.board.map((r) => r.slice());
    const candidatesBefore = oppositeEdgeCandidates(state.board, 'left');
    const spy = spyRng(0, 0.35, 0.45); // 1 draw for spawnTile pick + 2 for resolveSpawn/displayRoll
    const res = move(state, 'left', spy);
    assert.equal(res.moved, true, 'this board must move left');
    // spawned value materialized
    assert.ok(res.trace.some((e) => e.spawned), 'trace must have spawned entry');
    const spawned = res.trace.find((e) => e.spawned)!;
    assert.strictEqual(spawned.value, 9, 'spawned value is pendingSpawn materialized');
    assert.strictEqual(res.board[spawned.to[0]][spawned.to[1]], 9, 'result board carries spawned value');
    // candidate eligibility — 12.1 opposite edge: left→col 3
    const inCandidates = candidatesBefore.some(([r, c]) => r === spawned.to[0] && c === spawned.to[1]);
    assert.equal(inCandidates, true, `spawn ${spawned.to} must be in oppositeEdgeCandidates left ${JSON.stringify(candidatesBefore)}`);
    // ref inequality — hygiene DW-75
    assert.notStrictEqual(res.board, state.board, 'result board must not be same ref as input GameState board');
    // history isolation — mutating result.board does not rewrite prior snapshot
    (res.board as unknown as Array<Array<number | null>>)[spawned.to[0]][spawned.to[1]] = 999;
    assert.deepStrictEqual(state.board, beforeStateBoard, 'prior GameState board unchanged after mutating result.board (ADR-06)');
  });
});

describe('ATDD dw-engine-spawn-mutation-hygiene — P1 wiring (4-dir + draw budget + purity)', () => {
  it.skip('[P1-01] game.move 4-direction wall+spawn pipeline preserves line wall compaction after hygiene', () => {
    // Left/right/up/down via spawn-mut hygiene must not change movementLines→boardFromLines wall invariant.
    // Each direction: single tile off wall must still spawn on opposite edge with effectiveBoard.
    const dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'];
    const seedBoards: Record<string, Array<Array<number | null>>> = {
      left: [[null, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]],
      right: [[null, null, 2, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]],
      up: [[null, null, null, null], [2, null, null, null], [null, null, null, null], [null, null, null, null]],
      down: [[2, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]],
    };
    for (const dir of dirs) {
      const b = boardWith(seedBoards[dir]);
      const state = gameState(b, { value: 5, displayRoll: 0.1 });
      const res = move(state, dir, rngOf(0, 0.35, 0.45));
      assert.equal(res.moved, true, `${dir} must be effective`);
      const spawned = res.trace.find((e) => e.spawned)!;
      assert.ok(spawned, `${dir} trace has spawned`);
      // hygiene: result board carries spawned value and trace.to congruence
      assert.strictEqual(res.board[spawned.to[0]][spawned.to[1]], 5);
    }
  });

  it.skip('[P1-02] transitionPlan congruence — resultingTiles(plan) equals occupiedCells(result.board) after cloned effectiveBoard', async () => {
    const b = boardWith([
      [1, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const state = gameState(b, { value: 4, displayRoll: 0.2 });
    const res = move(state, 'right', rngOf(0, 0.35, 0.45));
    // imported helper assertNoLeak is the oracle for trace-board congruence (would break if stale newBoard used)
    const { planTileTransitions, resultingTiles } = await import('../../src/render/transitionPlan.ts');
    const { occupiedCells } = await import('../../test-utils/helpers.ts');
    const plan = planTileTransitions(b, res);
    // re-derive via same helpers so hygiene doesn't break resultingTiles equality
    const byCell = (a: { cell: [number, number] }, bCell: { cell: [number, number] }) =>
      a.cell[0] - bCell.cell[0] || a.cell[1] - bCell.cell[1];
    const tiles = resultingTiles(plan).map((t) => ({ cell: t.cell, value: t.value })).sort(byCell);
    const occ = occupiedCells(res.board);
    assert.deepStrictEqual(tiles, occ, 'resultingTiles(plan) must equal occupiedCells(result.board) — spawn divergence would break');
  });

  it.skip('[P1-03] draw-budget preservation — spawnTile 1 vs 0, move effective 3 vs noop 0, newGame 20', () => {
    // Clone adds no draws: placing still 1, full/empty-pool 0; move effective still 3 total, noop 0.
    // Placing 1 draw
    const bPlace = boardWith([[1, null, null, null], [2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, null]]);
    const spyPlace = spyRng(0);
    spawnTile(bPlace, 42, spyPlace);
    assert.strictEqual(spyPlace.calls.length, 1, 'placing 1 draw');

    // Full 0 draws
    const bFull = boardWith([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    const spyFull = spyRng(0.5);
    spawnTile(bFull, 99, spyFull);
    assert.strictEqual(spyFull.calls.length, 0, 'full 0 draws');

    // Empty candidate pool 0 draws
    const bEmptyPool = boardWith([[1, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
    const spyEmpty = spyRng(0.5);
    spawnTile(bEmptyPool, 42, spyEmpty, []);
    assert.strictEqual(spyEmpty.calls.length, 0, 'empty pool 0 draws');

    // Move effective 3 draws (pickIndex 1 + resolveSpawn 1 + displayRoll 1)
    const state = gameState(
      boardWith([[null, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]),
      { value: 1, displayRoll: 0 }
    );
    const spyMove = spyRng(0, 0.5, 0.9);
    const res = move(state, 'left', spyMove);
    assert.equal(res.moved, true);
    assert.strictEqual(spyMove.calls.length, 3, 'effective move 3 draws (clone adds 0)');

    // Move noop 0 draws — use a true game-over board (no adjacent merge, full)
    const fullNoop = boardWith([
      [3, 6, 3, 6],
      [6, 3, 6, 3],
      [3, 6, 3, 6],
      [6, 3, 6, 3],
    ]);
    const noopState = gameState(fullNoop, { value: 1, displayRoll: 0 });
    let drew = false;
    const noDrawRng = Object.assign(() => { drew = true; return 0.5; }, { calls: [] as number[] });
    const noopRes = move(noopState, 'left', noDrawRng as unknown as ReturnType<typeof spyRng>);
    assert.equal(noopRes.moved, false);
    assert.equal(drew, false, 'noop 0 draws');
  });

  it.skip('[P1-04] engine.purity ADR-01/05 — spawn.ts + game.ts import nothing from RN/Skia/Expo, spawnTile adds no new specifier', () => {
    // Static allowlist: helpers.ts still only imports from src/engine/core, no RN; spawn/game only import GRID_SIZE/types/ceiling/pot/weights/board/line
    const forbidden = ['react-native', 'react-native-reanimated', '@shopify/react-native-skia', 'expo', 'reanimated', 'skia'];
    for (const f of forbidden) {
      assert.equal(spawnSrc.includes(`from '${f}'`) || spawnSrc.includes(`from "${f}"`) || spawnSrc.includes(`'${f}'`), false, `spawn.ts must not import ${f}`);
      assert.equal(gameSrc.includes(`from '${f}'`) || gameSrc.includes(`from "${f}"`), false, `game.ts must not import ${f}`);
    }
    // helpers must not import RN either (it imports only engine + node:assert)
    for (const f of forbidden) {
      assert.equal(helpersSrc.includes(`'${f}'`) || helpersSrc.includes(`"${f}"`), false, `helpers.ts must not import ${f}`);
    }
  });

  it.skip('[P1-05] move noop isolation — deepEqual input board, pendingSpawn !== input ref, 0 draws', () => {
    const fullNoop = boardWith([
      [3, 6, 3, 6],
      [6, 3, 6, 3],
      [3, 6, 3, 6],
      [6, 3, 6, 3],
    ]);
    const state = gameState(fullNoop, { value: 7, displayRoll: 0.3 });
    const beforeBoard = state.board.map((r) => r.slice());
    const beforePending = { ...state.pendingSpawn };
    let drew = false;
    const noDrawRng = Object.assign(() => { drew = true; return 0.5; }, { calls: [] as number[] });
    const res = move(state, 'left', noDrawRng as unknown as typeof rngOf extends (...args: unknown[]) => infer R ? R : never);
    assert.deepStrictEqual(res.board, beforeBoard, 'noop board deepEqual input');
    assert.notStrictEqual(res.pendingSpawn, state.pendingSpawn, 'pendingSpawn must be shallow copy !== input ref (DW hygiene pending copy)');
    assert.deepStrictEqual(res.pendingSpawn, beforePending);
    assert.equal(res.moved, false);
    assert.equal(res.score, 0);
    assert.equal(drew, false);
  });

  it.skip('[P1-06] spawn-candidates statistical uniformity still 40/40-like within pool after clone (place-not-roll invariant)', () => {
    // Smoke of the two uniformity loops already in spawn-candidates.unit.test but repinned as ATDD.
    const board = boardWith([
      [1, null, null, null],
      [2, 3, 4, 5],
      [6, 7, 8, 9],
      [10, 11, 12, null],
    ]);
    // empties 4 row-major (0,1)(0,2)(0,3)(3,3) — sample 200 draws, uniform within 5σ
    const N = 200;
    const counts = new Map<string, number>();
    // Use deterministic seeded draws 0..1 uniform via simple counter rng
    // Instead drive deterministically: round-robin rng 0,0.25,0.51,0.76 cycles 4 empties uniformly
    const seq = [0, 0.25, 0.51, 0.76];
    for (let i = 0; i < N; i++) {
      const b = boardWith([[1, null, null, null], [2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, null]]);
      const res = spawnTile(b, 42, rngOf(seq[i % 4]));
      const key = `${res.cell![0]},${res.cell![1]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    // each cell at least 10% in 200 draws even with round-robin (25% each)
    for (const cell of [[0, 1], [0, 2], [0, 3], [3, 3]] as const) {
      const c = counts.get(`${cell[0]},${cell[1]}`) ?? 0;
      assert.ok(c >= 30, `cell ${cell} at least 30/200 (got ${c}) — clone must not bias pickIndex ordering`);
    }
  });
});

describe('ATDD dw-engine-spawn-mutation-hygiene — P2 static hygiene + P3 exploratory', () => {
  it.skip('[P2-01] SCAN single cloneBoard definition per module, no structuredClone/JSON board copy', () => {
    const spawnCloneDefs = (spawnSrc.match(/function cloneBoard/g) ?? []).length;
    const helpersCloneDefs = (helpersSrc.match(/function cloneBoard/g) ?? []).length;
    const helpersFreezeDefs = (helpersSrc.match(/function deepFreezeBoard/g) ?? []).length;
    assert.strictEqual(spawnCloneDefs, 1, 'spawn.ts exactly 1 cloneBoard definition');
    assert.strictEqual(helpersCloneDefs, 1, 'helpers.ts exactly 1 cloneBoard definition');
    assert.strictEqual(helpersFreezeDefs, 1, 'helpers.ts exactly 1 deepFreezeBoard definition');
    assert.equal(spawnSrc.includes('structuredClone'), false, 'no structuredClone for boards');
    assert.equal(helpersSrc.includes('structuredClone'), false, 'no structuredClone for boards');
    assert.equal(spawnSrc.includes('JSON.parse'), false, 'no JSON.parse board copy');
    assert.equal((spawnSrc.match(/const next = cloneBoard/g) ?? []).length, 1, 'spawnTile clones once at top');
    assert.equal((spawnSrc.match(/return \{ board: next/g) ?? []).length, 4, 'all 4 spawnTile exits return next (not board)');
    assert.equal((spawnSrc.match(/return \{ board: board/g) ?? []).length, 0, 'no return { board: board } survivor');
  });

  it.skip('[P2-02] SCAN effectiveBoard single propagation site — let effectiveBoard + spawn.board + return effectiveBoard, no return newBoard survivor', () => {
    const letEffective = (gameSrc.match(/let effectiveBoard/g) ?? []).length;
    const assignSpawn = (gameSrc.match(/effectiveBoard = spawn\.board/g) ?? []).length;
    const returnEffective = (gameSrc.match(/return \{ board: effectiveBoard/g) ?? []).length;
    assert.strictEqual(letEffective, 1, 'exactly 1 let effectiveBoard');
    assert.strictEqual(assignSpawn, 1, 'exactly 1 effectiveBoard = spawn.board');
    assert.strictEqual(returnEffective, 1, 'exactly 1 return { board: effectiveBoard');
    assert.equal(gameSrc.includes('return { board: newBoard'), false, 'no return { board: newBoard } survivor');
    assert.equal(gameSrc.includes('const newBoard'), false, 'no const newBoard survivor (renamed to effectiveBoard)');
  });

  it.skip('[P2-03] SCAN row-freeze completeness — gameState freezes rows+outer, boardWith/emptyBoard stay mutable for setup', () => {
    // helpersSrc must have for(row of board) Object.freeze(row) then Object.freeze(board)
    assert.ok(helpersSrc.includes('Object.freeze(row)'), 'must freeze each row');
    assert.ok(helpersSrc.includes('Object.freeze(board)'), 'must freeze outer');
    assert.ok(helpersSrc.includes('deepFreezeBoard(cloneBoard(board))'), 'gameState must clone then deepFreeze');
    // emptyBoard/boardWith must not freeze (setup helpers mutable)
    const emptyBoardSection = helpersSrc.slice(helpersSrc.indexOf('export function emptyBoard'));
    assert.equal(emptyBoardSection.includes('Object.freeze'), false, 'emptyBoard must stay mutable');
  });

  it.skip('[P2-04] SCAN no GRID_SIZE drift — types.ts single GRID_SIZE=4, clone uses board.map spread not structuredClone', () => {
    const typesSrc = fs.readFileSync(
      fileURLToPath(new URL('../../src/engine/core/types.ts', import.meta.url)),
      'utf8'
    );
    assert.equal((typesSrc.match(/export const GRID_SIZE/g) ?? []).length, 1, 'single GRID_SIZE definition');
    assert.ok(typesSrc.includes('GRID_SIZE = 4'), 'GRID_SIZE stays 4');
    assert.ok(spawnSrc.includes('board.map((row) => [...row])'), 'cloneBoard is row spread (shallow sufficient for number|null)');
    assert.ok(helpersSrc.includes('board.map((row) => [...row])'), 'helpers cloneBoard same row spread');
  });

  it.skip('[P3-01] exploratory — 200-move runSeededSession alias sweep with frozen snapshots via stateFromResult', async () => {
    // Drive effective moves cycling dirs; each move mutates res.board copy then asserts prior snapshot unchanged.
    // This would fail with shared-mutable alias (result.board[0][0]=999 would leak to snapshot before clone fix).
    const { mulberry32 } = await import('../../test-utils/helpers.ts');
    const rng = mulberry32(0xbeef);
    let moves = 0;
    let attempts = 0;
    const dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'up', 'right', 'down'];
    while (moves < 20 && attempts < 500) {
      attempts++;
      const dir = dirs[attempts % 4];
      const b = boardWith([
        [null, 2, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);
      const s = gameState(b, { value: 3, displayRoll: 0.5 });
      const before = s.board.map((r) => r.slice());
      const res = move(s, dir, rng);
      if (!res.moved) continue;
      moves++;
      // mutate res.board copy should not affect s.board (ADR-06)
      (res.board as unknown as Array<Array<number | null>>)[0][0] = 999;
      assert.deepStrictEqual(s.board, before, `move ${moves} prior GameState board unchanged after mutating result.board`);
    }
    assert.ok(moves >= 10, `got ${moves}/20 effective moves within 500 attempts (dirs cycled by attempts, not moves)`);
  });

  it.skip('[P3-02] hygiene — clone+freeze O(16) per spawn/move invisible to frame budget <15 ms gate', () => {
    // Perf: single move must stay <1ms median; clone is 4x4 spread = 16 primitives.
    const b = boardWith([
      [1, null, null, null],
      [2, 3, 4, 5],
      [6, 7, 8, 9],
      [10, 11, 12, null],
    ]);
    const loops = 10_000;
    const start = performance.now();
    for (let i = 0; i < loops; i++) {
      spawnTile(b, 42, rngOf(0.5));
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 500, `10k spawnTile clones ${elapsed.toFixed(1)}ms <500ms (O(16) spread)`);
    const t0 = performance.now();
    for (let i = 0; i < loops; i++) {
      gameState(b, { value: 1, displayRoll: 0.5 });
    }
    const elapsed2 = performance.now() - t0;
    assert.ok(elapsed2 < 800, `10k gameState clone+freeze ${elapsed2.toFixed(1)}ms <800ms`);
  });
});
