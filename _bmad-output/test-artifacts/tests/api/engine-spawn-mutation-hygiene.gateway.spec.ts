/**
 * TEA Automate — API Gateway Contract Tests for dw-engine-spawn-mutation-hygiene
 * Location: _bmad-output/test-artifacts/tests/api/engine-spawn-mutation-hygiene.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture)
 * TEA mapping: "API" = pure engine gateway contract (spawnTile clone + gameState freeze + move effectiveBoard).
 * Provider is triade/src/engine/core/spawn.ts + triade/src/engine/core/game.ts + triade/test-utils/helpers.ts (pure TS), consumers are move() + runSeededSession + isGameOver + transitionPlan.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing-patterns +
 * data-factories fragments, adapted for pure TS engine seam.
 *
 * Spec: spec-engine-spawn-mutation-hygiene.md (DW-23/70/75/81 clone+freeze hygiene, 8 ACs, baseline edfc574 → 53c4f3d)
 * Test-design: test-design-dw-engine-spawn-mutation-hygiene.md (10 risks, P0 8 groups, P1 12, P2 4, P3 2; 3 high R-001/002/003)
 * ATDD source: triade/__tests__/engine/spawn-mutation-hygiene.atdd.test.ts (20 it.skip, P0 8 + P1 6 + P2 4 + P3 2)
 * Fixtures: _bmad-output/test-artifacts/fixtures/engine-spawn-mutation-hygiene-fixtures.ts
 *
 * Execute:
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/engine-spawn-mutation-hygiene.gateway.spec.ts
 * Or via triade harness from triade/:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/engine-spawn-mutation-hygiene.gateway.spec.ts
 * Canonical ATDD remains via triade/__tests__/engine/spawn-mutation-hygiene.atdd.test.ts (activate it.skip → it → 20 pass)
 * plus triade/__tests__/engine/spawn-candidates.unit.test.ts (13 pass, 2 clone-hygiene pins) + spawn.test.ts + game.test.ts (32) + engine.purity (4).
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

'use strict';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnTile } from '../../../../triade/src/engine/core/spawn.ts';
import { move } from '../../../../triade/src/engine/core/game.ts';
import { GRID_SIZE } from '../../../../triade/src/engine/core/types.ts';
import {
  boardWith,
  emptyBoard,
  gameState,
  rngOf,
  spyRng,
  oppositeEdgeCandidates,
} from '../../../../triade/test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// Helpers — deterministic source reader
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

// ---------------------------------------------------------------------------
// P0 — Critical clone / freeze / effectiveBoard
// ---------------------------------------------------------------------------
describe('[API] engine spawn-mutation-hygiene gateway — P0 critical (clone / freeze / effectiveBoard)', () => {
  it('[P0] AC spawnTile clones — input not mutated, returned board has value at cell, 1 draw (R-002 DW-23/70)', () => {
    // Given a board with empty cells when spawnTile is called with rng 0
    // Then input stays deepEqual before, returned board has value at picked cell, res !== input, row spread, 1 draw
    const b = boardWith([
      [1, null, null, null],
      [2, 3, 4, 5],
      [6, 7, 8, 9],
      [10, 11, 12, null],
    ]);
    const before = b.map((r) => r.slice());
    const spy = spyRng(0);
    const res = spawnTile(b, 42, spy);
    assert.deepStrictEqual(b, before, 'input board must not be mutated');
    assert.notStrictEqual(res.board, b);
    assert.notStrictEqual(res.board[0], b[0], 'row array must be new reference');
    assert.ok(res.cell !== null);
    assert.strictEqual(res.board[res.cell![0]][res.cell![1]], 42);
    assert.strictEqual(spy.calls.length, 1, 'placing consumes exactly 1 draw');
  });

  it('[P0] AC spawnTile full board — returns clone !== input, cell/value null, 0 draws (R-002 R-005 DW-75)', () => {
    // Before fix full board returned same ref; after it returns new ref intentional divergence
    const board = boardWith([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
    const before = board.map((r) => r.slice());
    const spy = spyRng(0.5);
    const res = spawnTile(board, 99, spy);
    assert.strictEqual(spy.calls.length, 0, 'full board 0 draws');
    assert.strictEqual(res.cell, null);
    assert.strictEqual(res.value, null);
    assert.deepStrictEqual(board, before, 'full board input not mutated');
    assert.notStrictEqual(res.board, board, 'full board must return clone !== input');
    assert.notStrictEqual(res.board[0], board[0]);
  });

  it('[P0] AC spawnTile empty candidate pool [] — clone !== input, nulls, 0 draws (R-002)', () => {
    // Empty pool is engine-never-throws guard; move() assumes non-empty but spawnTile guards
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

  it('[P0] AC spawnTile all candidates occupied — clone !== input, nulls, 0 draws (R-002)', () => {
    // Candidates filter to 0 eligible empties → same as empty pool hygiene
    const board = boardWith([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
    const spy = spyRng(0.9);
    const res = spawnTile(board, 42, spy, [
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
    assert.strictEqual(spy.calls.length, 0);
    assert.strictEqual(res.cell, null);
    assert.strictEqual(res.value, null);
    assert.notStrictEqual(res.board, board);
  });

  it('[P0] AC spawnTile OOB candidates ignored — only in-bounds empty eligible (R-002 edge)', () => {
    // OOB [-1,0] must be filtered before pool check; only [0,1] is in-bounds+empty eligible
    const board = emptyBoard();
    board[0][0] = 1;
    const candidates: Array<[number, number]> = [[-1, 0], [0, 1]];
    const before = board.map((r) => r.slice());
    const spy = spyRng(0.99);
    const res = spawnTile(board, 7, spy, candidates);
    assert.strictEqual(spy.calls.length, 1, 'OOB-filtered pool still 1 draw');
    assert.deepStrictEqual(res.cell, [0, 1]);
    assert.strictEqual(res.board[0][1], 7);
    assert.deepStrictEqual(board, before);
    assert.notStrictEqual(res.board, board);
  });

  it('[P0] AC spawnTile single candidate deterministic — clone hygiene (R-002, P0-06 landed pin)', () => {
    const board = emptyBoard();
    board[0][0] = 1;
    const candidates: Array<[number, number]> = [[3, 3]];
    const before = board.map((r) => r.slice());
    const spy = spyRng(0.99);
    const res = spawnTile(board, 7, spy, candidates);
    assert.strictEqual(spy.calls.length, 1);
    assert.deepStrictEqual(res.cell, [3, 3]);
    assert.deepStrictEqual(board, before);
    assert.strictEqual(res.board[3][3], 7);
    assert.notStrictEqual(res.board, board);
  });

  it('[P0] AC gameState snapshot freeze — deepEqual !== input, frozen outer+rows, mutating stored throws (R-003 DW-81)', () => {
    // gameState now cloneBoard + deepFreezeBoard rows+outer — must be deepEqual, !== input, frozen, throw on assignment
    const b = boardWith([
      [1, 2, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const s = gameState(b);
    assert.deepStrictEqual(s.board, b);
    assert.notStrictEqual(s.board, b);
    assert.notStrictEqual(s.board[0], b[0], 'row ref must differ (clone)');
    assert.equal(Object.isFrozen(s.board), true, 'outer must be frozen');
    assert.equal(
      s.board.every((r) => Object.isFrozen(r)),
      true,
      'every row must be frozen (DW-81)',
    );
    // Frozen assignment throws TypeError in strict ESM (triade/__tests__), but silently fails in non-strict CJS (_bmad-output)
    // Accept either: the invariant is that the frozen board is not mutated and stays isFrozen.
    let threw = false;
    try {
      (s.board as unknown as Array<Array<number | null>>)[0][0] = 999;
    } catch (e) {
      threw = true;
      assert.equal((e as Error).name, 'TypeError');
    }
    assert.strictEqual(s.board[0][0], 1, 'frozen board must not be mutated (strict throws or non-strict silent fail)');
    // If it threw, the catch above already verified TypeError; if it did not throw, the value staying 1 proves freeze still protects.
    b[0][0] = 999;
    assert.strictEqual(s.board[0][0], 1, 'stored snapshot isolated from input mutation');
    const b2 = boardWith([
      [1, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const s2 = gameState(b2, { value: 3, displayRoll: 0.5 });
    s2.pendingSpawn.value = 999;
    const s3 = gameState(b2, { value: 3, displayRoll: 0.5 });
    assert.strictEqual(s3.pendingSpawn.value, 3, 'pendingSpawn copy isolation');
  });

  it('[P0] AC move propagates cloned spawn board — result.board contains spawned value at opposite-edge candidate, !== input ref, prior snapshot unchanged (R-001 DW-75)', () => {
    // Before fix move() relied on spawnTile mutating const newBoard; after let effectiveBoard = spawn.board
    const initial = boardWith([
      [null, 2, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const state = gameState(initial, { value: 9, displayRoll: 0.1 });
    const beforeStateBoard = state.board.map((r) => r.slice());
    const candidatesBefore = oppositeEdgeCandidates(state.board, 'left');
    const spy = spyRng(0, 0.35, 0.45); // 1 pick + 2 resolveSpawn/displayRoll
    const res = move(state, 'left', spy);
    assert.equal(res.moved, true, 'this board must move left');
    assert.ok(res.trace.some((e) => e.spawned), 'trace must have spawned entry');
    const spawned = res.trace.find((e) => e.spawned)!;
    assert.strictEqual(spawned.value, 9);
    assert.strictEqual(res.board[spawned.to[0]][spawned.to[1]], 9, 'result board carries spawned value');
    const inCandidates = candidatesBefore.some(([r, c]) => r === spawned.to[0] && c === spawned.to[1]);
    assert.equal(
      inCandidates,
      true,
      `spawn ${spawned.to} must be in oppositeEdgeCandidates left ${JSON.stringify(candidatesBefore)}`,
    );
    assert.notStrictEqual(res.board, state.board, 'result board must not be same ref as input GameState board');
    (res.board as unknown as Array<Array<number | null>>)[spawned.to[0]][spawned.to[1]] = 999;
    assert.deepStrictEqual(state.board, beforeStateBoard, 'prior GameState board unchanged after mutating result.board (ADR-06)');
  });
});

// ---------------------------------------------------------------------------
// P1 — Wiring: 4-dir pipeline / draw budget / purity / trace congruence
// ---------------------------------------------------------------------------
describe('[API] engine spawn-mutation-hygiene gateway — P1 wiring (4-dir + draw budget + purity)', () => {
  it('[P1] game.move 4-direction wall+spawn pipeline preserves line wall compaction after hygiene (R-001)', () => {
    const dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'];
    const seedBoards: Record<string, Array<Array<number | null>>> = {
      left: [
        [null, 2, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
      right: [
        [null, null, 2, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
      up: [
        [null, null, null, null],
        [2, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
      down: [
        [2, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
    };
    for (const dir of dirs) {
      const b = boardWith(seedBoards[dir]);
      const state = gameState(b, { value: 5, displayRoll: 0.1 });
      const res = move(state, dir as Direction, rngOf(0, 0.35, 0.45));
      assert.equal(res.moved, true, `${dir} must be effective`);
      const spawned = res.trace.find((e) => e.spawned)!;
      assert.ok(spawned, `${dir} trace has spawned`);
      assert.strictEqual(res.board[spawned.to[0]][spawned.to[1]], 5);
    }
  });

  it('[P1] transitionPlan congruence — resultingTiles(plan) equals occupiedCells(result.board) after cloned effectiveBoard (R-007)', async () => {
    const b = boardWith([
      [1, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const state = gameState(b, { value: 4, displayRoll: 0.2 });
    const res = move(state, 'right', rngOf(0, 0.35, 0.45));
    const { planTileTransitions, resultingTiles } = await import('../../../../triade/src/render/transitionPlan.ts');
    const { occupiedCells: occCells } = await import('../../../../triade/test-utils/helpers.ts');
    const plan = planTileTransitions(b, res as unknown as import('../../../../triade/src/engine/core/types.ts').MoveResult);
    const byCell = (a: { cell: [number, number] }, b2: { cell: [number, number] }) =>
      a.cell[0] - b2.cell[0] || a.cell[1] - b2.cell[1];
    const tiles = resultingTiles(plan)
      .map((t) => ({ cell: t.cell, value: t.value }))
      .sort(byCell);
    const occ = occCells(res.board);
    assert.deepStrictEqual(tiles, occ, 'resultingTiles(plan) must equal occupiedCells(result.board) — spawn divergence would break');
  });

  it('[P1] draw-budget preservation — spawnTile 1 vs 0, move effective 3 vs noop 0 (R-002, spec Always 3/0/1|0)', () => {
    // Placing 1 draw
    const bPlace = boardWith([
      [1, null, null, null],
      [2, 3, 4, 5],
      [6, 7, 8, 9],
      [10, 11, 12, null],
    ]);
    const spyPlace = spyRng(0);
    spawnTile(bPlace, 42, spyPlace);
    assert.strictEqual(spyPlace.calls.length, 1, 'placing 1 draw');
    // Full 0 draws
    const bFull = boardWith([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
    const spyFull = spyRng(0.5);
    spawnTile(bFull, 99, spyFull);
    assert.strictEqual(spyFull.calls.length, 0, 'full 0 draws');
    // Empty pool 0 draws
    const bEmptyPool = boardWith([
      [1, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const spyEmpty = spyRng(0.5);
    spawnTile(bEmptyPool, 42, spyEmpty, []);
    assert.strictEqual(spyEmpty.calls.length, 0, 'empty pool 0 draws');
    // Move effective 3 draws (pickIndex 1 + resolveSpawn 1 + displayRoll 1)
    const state = gameState(
      boardWith([
        [null, 2, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]),
      { value: 1, displayRoll: 0 },
    );
    const spyMove = spyRng(0, 0.5, 0.9);
    const res = move(state, 'left', spyMove);
    assert.equal(res.moved, true);
    assert.strictEqual(spyMove.calls.length, 3, 'effective move 3 draws (clone adds 0)');
    // Move noop 0 draws — true game-over board (no adjacent merge, full)
    const fullNoop = boardWith([
      [3, 6, 3, 6],
      [6, 3, 6, 3],
      [3, 6, 3, 6],
      [6, 3, 6, 3],
    ]);
    const noopState = gameState(fullNoop, { value: 1, displayRoll: 0 });
    let drew = false;
    const noDrawRng = Object.assign(
      () => {
        drew = true;
        return 0.5;
      },
      { calls: [] as number[] },
    );
    const noopRes = move(noopState, 'left', noDrawRng as unknown as ReturnType<typeof spyRng>);
    assert.equal(noopRes.moved, false);
    assert.equal(drew, false, 'noop 0 draws');
  });

  it('[P1] engine.purity ADR-01/05 — spawn.ts + game.ts import nothing from RN/Skia/Expo, spawnTile adds no new specifier (R-006)', () => {
    const spawnSrc = readSrc('triade/src/engine/core/spawn.ts');
    const gameSrc = readSrc('triade/src/engine/core/game.ts');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    const forbidden = ['react-native', 'react-native-reanimated', '@shopify/react-native-skia', 'expo', 'reanimated', 'skia'];
    for (const f of forbidden) {
      assert.equal(
        spawnSrc.includes(`from '${f}'`) || spawnSrc.includes(`from "${f}"`) || spawnSrc.includes(`'${f}'`),
        false,
        `spawn.ts must not import ${f}`,
      );
      assert.equal(
        gameSrc.includes(`from '${f}'`) || gameSrc.includes(`from "${f}"`),
        false,
        `game.ts must not import ${f}`,
      );
    }
    for (const f of forbidden) {
      assert.equal(helpersSrc.includes(`'${f}'`) || helpersSrc.includes(`"${f}"`), false, `helpers.ts must not import ${f}`);
    }
  });

  it('[P1] move noop isolation — deepEqual input board, pendingSpawn !== input ref, 0 draws (R-001)', () => {
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
    const noDrawRng = Object.assign(
      () => {
        drew = true;
        return 0.5;
      },
      { calls: [] as number[] },
    );
    const res = move(state, 'left', noDrawRng as unknown as never);
    assert.deepStrictEqual(res.board, beforeBoard, 'noop board deepEqual input');
    assert.notStrictEqual(res.pendingSpawn, state.pendingSpawn, 'pendingSpawn must be shallow copy !== input ref');
    assert.deepStrictEqual(res.pendingSpawn, beforePending);
    assert.equal(res.moved, false);
    assert.equal(res.score, 0);
    assert.equal(drew, false);
  });

  it('[P1] spawn-candidates statistical uniformity still 40/40-like within pool after clone (R-002 residual)', () => {
    const board = boardWith([
      [1, null, null, null],
      [2, 3, 4, 5],
      [6, 7, 8, 9],
      [10, 11, 12, null],
    ]);
    const N = 200;
    const counts = new Map<string, number>();
    const seq = [0, 0.25, 0.51, 0.76];
    for (let i = 0; i < N; i++) {
      const b = boardWith([
        [1, null, null, null],
        [2, 3, 4, 5],
        [6, 7, 8, 9],
        [10, 11, 12, null],
      ]);
      const res = spawnTile(b, 42, rngOf(seq[i % 4]));
      const key = `${res.cell![0]},${res.cell![1]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const cell of [
      [0, 1],
      [0, 2],
      [0, 3],
      [3, 3],
    ] as const) {
      const c = counts.get(`${cell[0]},${cell[1]}`) ?? 0;
      assert.ok(c >= 30, `cell ${cell} at least 30/200 (got ${c}) — clone must not bias pickIndex ordering`);
    }
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (single cloneBoard / effectiveBoard / GRID_SIZE)
// ---------------------------------------------------------------------------
describe('[API] engine spawn-mutation-hygiene gateway — P2 static hygiene (allowlist + guard)', () => {
  it('[P2] SCAN single cloneBoard definition per module, no structuredClone/JSON board copy (R-004 R-006)', () => {
    const spawnSrc = readSrc('triade/src/engine/core/spawn.ts');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
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

  it('[P2] SCAN effectiveBoard single propagation site — let effectiveBoard + spawn.board + return effectiveBoard, no return newBoard survivor (R-001)', () => {
    const gameSrc = readSrc('triade/src/engine/core/game.ts');
    const letEffective = (gameSrc.match(/let effectiveBoard/g) ?? []).length;
    const assignSpawn = (gameSrc.match(/effectiveBoard = spawn\.board/g) ?? []).length;
    const returnEffective = (gameSrc.match(/return \{ board: effectiveBoard/g) ?? []).length;
    assert.strictEqual(letEffective, 1, 'exactly 1 let effectiveBoard');
    assert.strictEqual(assignSpawn, 1, 'exactly 1 effectiveBoard = spawn.board');
    assert.strictEqual(returnEffective, 1, 'exactly 1 return { board: effectiveBoard');
    assert.equal(gameSrc.includes('return { board: newBoard'), false, 'no return { board: newBoard } survivor');
    assert.equal(gameSrc.includes('const newBoard'), false, 'no const newBoard survivor (renamed to effectiveBoard)');
  });

  it('[P2] SCAN row-freeze completeness — gameState freezes rows+outer, boardWith/emptyBoard stay mutable for setup (R-003)', () => {
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    assert.ok(helpersSrc.includes('Object.freeze(row)'), 'must freeze each row');
    assert.ok(helpersSrc.includes('Object.freeze(board)'), 'must freeze outer');
    assert.ok(helpersSrc.includes('deepFreezeBoard(cloneBoard(board))'), 'gameState must clone then deepFreeze');
    const emptyBoardSection = helpersSrc.slice(helpersSrc.indexOf('export function emptyBoard'));
    assert.equal(emptyBoardSection.includes('Object.freeze'), false, 'emptyBoard must stay mutable');
  });

  it('[P2] SCAN no GRID_SIZE drift — types.ts single GRID_SIZE=4, clone uses board.map spread not structuredClone (R-004)', () => {
    const spawnSrc = readSrc('triade/src/engine/core/spawn.ts');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    const typesSrc = readSrc('triade/src/engine/core/types.ts');
    assert.equal((typesSrc.match(/export const GRID_SIZE/g) ?? []).length, 1, 'single GRID_SIZE definition');
    assert.ok(typesSrc.includes('GRID_SIZE = 4'), 'GRID_SIZE stays 4');
    assert.ok(spawnSrc.includes('board.map((row) => [...row])'), 'cloneBoard is row spread (shallow sufficient for number|null)');
    assert.ok(helpersSrc.includes('board.map((row) => [...row])'), 'helpers cloneBoard same row spread');
  });

  it('[P2] SCAN ledger DW-23/70/75/81 done + sprint-status untouched (R-008)', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.match(ledger, /DW-23[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-70[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-75[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-81[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /resolution-undo:\s*[0-9a-f]{64}/);
    assert.match(ledger, /resolved by sweep bundle dw-engine-spawn-mutation-hygiene/);
    assert.equal(readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml').includes('dw-engine-spawn-mutation-hygiene'), false);
  });

  it('[P2] hygiene — clone+freeze O(16) per spawn/move invisible to frame budget (R-009)', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) spawnTile(boardWith([[1, null, null, null],[2,3,4,5],[6,7,8,9],[10,11,12,null]]), 42, rngOf(0.5));
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 500, `10k spawnTile clones ${elapsed.toFixed(1)}ms <500ms (O(16) spread)`);
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) gameState(boardWith([[1, null, null, null],[2,3,4,5],[6,7,8,9],[10,11,12,null]]), { value: 1, displayRoll: 0.5 });
    const elapsed2 = performance.now() - t0;
    assert.ok(elapsed2 < 800, `10k gameState clone+freeze ${elapsed2.toFixed(1)}ms <800ms`);
    assert.equal(GRID_SIZE, 4);
  });
});
