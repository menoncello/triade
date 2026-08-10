// Differential parity suite: proves the TS engine (src/engine) is behaviorally
// identical to the frozen web reference (js/game.js) for the same seeded inputs.
//
// LIMITATION: parity asserts TS === web. If BOTH engines share a bug, this suite
// passes silently. The absolute oracle is the unit suite (game.test.ts), which
// asserts concrete expected boards/scores/traces — do not rely on parity alone
// when the behavior under test is changed, and keep unit assertions in sync.
import { test } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import * as ts from '../../src/engine/core/index.ts';
import type { Board, Rng } from '../../src/engine/core/index.ts';
import { mulberry32, rngOf } from '../../test-utils/helpers.ts';

const require = createRequire(import.meta.url);
const web = require('../../../js/game.js');

const SIZE = 4;

function boardWith(matrix: Array<Array<number | null | undefined>>): Board {
  const b: Board = [];
  for (let r = 0; r < SIZE; r++) {
    const row: Array<number | null> = [];
    for (let c = 0; c < SIZE; c++) row.push(matrix[r]?.[c] ?? null);
    b.push(row);
  }
  return b;
}

function rowBoard(row: Array<number | null>): Board {
  const b = boardWith([
    row,
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24]
  ]);
  return b;
}

function clone(board: Board): Board {
  return board.map((row) => row.slice());
}

function deepClone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as unknown as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) out[k] = deepClone((value as Record<string, unknown>)[k]);
    return out as unknown as T;
  }
  return value;
}

function cloneResult(res: { board: Board; score: number; moved: boolean; trace: unknown }) {
  return {
    board: clone(res.board),
    score: res.score,
    moved: res.moved,
    trace: deepClone(res.trace)
  };
}

function makeTrackingRng(values: number[]): { rng: Rng; calls: () => number } {
  let i = 0;
  return {
    rng: () => (i < values.length ? values[i++] : 0.5),
    calls: () => i
  };
}

function runMoveBoth(board: Board, dir: string, seed: number): { tsRes: unknown; webRes: unknown } {
  const tsInput = clone(board);
  const webInput = clone(board);
  const tsRes = ts.move(tsInput, dir as ts.Direction, mulberry32(seed));
  const webRes = web.move(webInput, dir, mulberry32(seed));
  assert.deepStrictEqual(tsInput, board, `TS move leaves input board unmutated (${dir})`);
  assert.deepStrictEqual(webInput, board, `web move leaves input board unmutated (${dir})`);
  assert.deepStrictEqual(Object.keys(tsRes).sort(), Object.keys(webRes).sort(), `result shape identical (${dir})`);
  return { tsRes: cloneResult(tsRes), webRes: cloneResult(webRes) };
}

test('PARITY: newGame spawns identical 9-tile boards', () => {
  for (const seed of [1, 42, 20260808]) {
    const tsBoard = ts.newGame(mulberry32(seed));
    const webBoard = web.newGame(mulberry32(seed));
    assert.deepStrictEqual(tsBoard, webBoard, `newGame boards match for seed ${seed}`);
    let count = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (tsBoard[r][c] !== null) count++;
      }
    }
    assert.strictEqual(count, 9, `exactly 9 starting tiles for seed ${seed}`);
  }
});

test('PARITY: weightedValue 40/40/20 boundaries identical', () => {
  for (const roll of [0, 0.39, 0.4, 0.79, 0.8, 0.999]) {
    assert.strictEqual(ts.weightedValue(rngOf(roll)), web.weightedValue(rngOf(roll)), `roll ${roll}`);
  }
});

test('PARITY: canMerge/mergeValue identical across the predicate matrix', () => {
  const pairs: Array<[number | null, number | null]> = [
    [1, 2],
    [2, 1],
    [1, 1],
    [2, 2],
    [3, 3],
    [6, 6],
    [3, 6],
    [null, null],
    [null, 1],
    [1, null]
  ];
  for (const [a, b] of pairs) {
    assert.strictEqual(ts.canMerge(a, b), web.canMerge(a, b), `canMerge(${a}, ${b})`);
    if (ts.canMerge(a, b)) {
      assert.strictEqual(ts.mergeValue(a, b), web.mergeValue(a, b), `mergeValue(${a}, ${b})`);
    }
  }
});

test('PARITY: move scenarios produce identical { board, score, moved, trace }', () => {
  const scenarios: Array<{ name: string; board: Board; dir: string; seed: number }> = [
    { name: 'merge 1+2 [1,2]', board: rowBoard([1, 2, null, null]), dir: 'left', seed: 1 },
    { name: 'merge 1+2 [2,1] reversed', board: rowBoard([2, 1, null, null]), dir: 'left', seed: 2 },
    { name: 'non-merge 1+1', board: rowBoard([1, 1, null, null]), dir: 'left', seed: 3 },
    { name: 'non-merge 2+2', board: rowBoard([2, 2, null, null]), dir: 'left', seed: 4 },
    { name: 'equal >=3 wall cascade', board: rowBoard([3, 3, 3, 3]), dir: 'left', seed: 5 },
    { name: 'equal >=3 cascade blocked', board: rowBoard([3, 3, 6, null]), dir: 'left', seed: 6 },
    { name: 'higher equal 12+12', board: rowBoard([12, 12, null, null]), dir: 'left', seed: 7 },
    { name: 'one-cell left [3,_,3,_]', board: rowBoard([3, null, 3, null]), dir: 'left', seed: 8 },
    { name: 'one-cell left [_,3,_,3]', board: rowBoard([null, 3, null, 3]), dir: 'left', seed: 9 },
    { name: 'one-cell right [3,3,3,_]', board: rowBoard([3, 3, 3, null]), dir: 'right', seed: 10 },
    { name: 'one-cell right merge wall', board: rowBoard([2, 1, 2, 1]), dir: 'right', seed: 11 },
    { name: 'new tile not re-merged [1,2,3,_]', board: rowBoard([1, 2, 3, null]), dir: 'left', seed: 12 },
    {
      name: 'noop full grid no merges',
      board: boardWith([
        [1, 3, 6, 12],
        [1, 3, 6, 12],
        [1, 3, 6, 12],
        [1, 3, 6, 12]
      ]),
      dir: 'left',
      seed: 13
    },
    {
      name: 'move up column [2,1,3,6]',
      board: boardWith([
        [2, null, null, null],
        [1, null, null, null],
        [3, null, null, null],
        [6, null, null, null]
      ]),
      dir: 'up',
      seed: 14
    },
    {
      name: 'move down column [2,1,3,6]',
      board: boardWith([
        [2, null, null, null],
        [1, null, null, null],
        [3, null, null, null],
        [6, null, null, null]
      ]),
      dir: 'down',
      seed: 15
    },
    {
      name: 'one-cell down [3,_,_,3]',
      board: boardWith([
        [3, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [3, null, null, null]
      ]),
      dir: 'down',
      seed: 16
    }
  ];

  for (const sc of scenarios) {
    const { tsRes, webRes } = runMoveBoth(sc.board, sc.dir, sc.seed);
    assert.deepStrictEqual(tsRes, webRes, `PARITY ${sc.name} (${sc.dir})`);
  }
});

test('PARITY: spawn happens exactly once after an effective move with identical rng consumption', () => {
  const board = rowBoard([1, 2, null, null]);
  const tsTrack = makeTrackingRng([0.99, 0]);
  const webTrack = makeTrackingRng([0.99, 0]);
  const tsRes = ts.move(clone(board), 'left', tsTrack.rng);
  const webRes = web.move(clone(board), 'left', webTrack.rng);
  assert.deepStrictEqual(cloneResult(tsRes), cloneResult(webRes));
  assert.strictEqual(tsTrack.calls(), 2, 'TS engine consumed exactly 2 rng rolls');
  assert.strictEqual(webTrack.calls(), 2, 'web engine consumed exactly 2 rng rolls');
});

test('PARITY: noop move consumes zero rng rolls', () => {
  const board = boardWith([
    [1, 3, 6, 12],
    [1, 3, 6, 12],
    [1, 3, 6, 12],
    [1, 3, 6, 12]
  ]);
  const tsTrack = makeTrackingRng([]);
  const webTrack = makeTrackingRng([]);
  const tsRes = ts.move(clone(board), 'left', tsTrack.rng);
  const webRes = web.move(clone(board), 'left', webTrack.rng);
  assert.deepStrictEqual(cloneResult(tsRes), cloneResult(webRes));
  assert.strictEqual(tsTrack.calls(), 0, 'TS engine consumed 0 rng rolls on noop');
  assert.strictEqual(webTrack.calls(), 0, 'web engine consumed 0 rng rolls on noop');
});

test('PARITY: isGameOver identical across terminal boards', () => {
  const boards: Array<{ name: string; board: Board }> = [
    { name: 'empty', board: boardWith([]) },
    {
      name: 'full immovable',
      board: boardWith([
        [1, 3, 6, 12],
        [6, 12, 1, 3],
        [3, 1, 12, 6],
        [12, 6, 3, 1]
      ])
    },
    {
      name: '1-2 adjacent in a row',
      board: boardWith([
        [1, 2, 6, 12],
        [6, 12, 1, 3],
        [3, 1, 12, 6],
        [12, 6, 3, 1]
      ])
    },
    {
      name: '1-2 adjacent in a column',
      board: boardWith([
        [1, 3, 6, 12],
        [2, 12, 1, 3],
        [3, 1, 12, 6],
        [12, 6, 3, 1]
      ])
    },
    {
      name: 'equal >=3 adjacent',
      board: boardWith([
        [3, 3, 6, 12],
        [6, 12, 1, 3],
        [3, 1, 12, 6],
        [12, 6, 3, 1]
      ])
    }
  ];
  for (const { name, board } of boards) {
    assert.strictEqual(ts.isGameOver(clone(board)), web.isGameOver(clone(board)), `isGameOver: ${name}`);
  }
});

test('PARITY: spawnTile identical on a seeded board', () => {
  const board = rowBoard([null, null, 2, 1]);
  const tsSpawn = ts.spawnTile(clone(board), mulberry32(77));
  const webSpawn = web.spawnTile(clone(board), mulberry32(77));
  assert.deepStrictEqual(tsSpawn, webSpawn);
});

test('PARITY: trace contract EXACT — merge sources, advance, spawn flag, noop has no spawn', () => {
  const merged = runMoveBoth(rowBoard([1, 2, 3, null]), 'left', 12);
  const tsTrace = (merged.tsRes as { trace: Array<{ value: number; to: number[]; from: number[][]; spawned: boolean }> }).trace;
  const webTrace = (merged.webRes as { trace: Array<{ value: number; to: number[]; from: number[][]; spawned: boolean }> }).trace;

  const tsMerged = tsTrace.find((t) => t.value === 3 && !t.spawned && t.to[0] === 0 && t.to[1] === 0);
  const webMerged = webTrace.find((t) => t.value === 3 && !t.spawned && t.to[0] === 0 && t.to[1] === 0);
  assert.ok(tsMerged && webMerged, 'merged 3 present in both traces');
  assert.deepStrictEqual(tsMerged.from, [[0, 0], [0, 1]], 'TS merge sources [0,0] and [0,1]');
  assert.deepStrictEqual(webMerged.from, [[0, 0], [0, 1]], 'web merge sources [0,0] and [0,1]');

  const tsAdvanced = tsTrace.find((t) => t.value === 3 && !t.spawned && t.to[0] === 0 && t.to[1] === 1);
  const webAdvanced = webTrace.find((t) => t.value === 3 && !t.spawned && t.to[0] === 0 && t.to[1] === 1);
  assert.ok(tsAdvanced && webAdvanced, 'advanced tile present in both traces');
  assert.deepStrictEqual(tsAdvanced.from, [[0, 2]], 'TS advanced tile from [0,2]');
  assert.deepStrictEqual(webAdvanced.from, [[0, 2]], 'web advanced tile from [0,2]');

  const tsSpawned = tsTrace.find((t) => t.spawned);
  const webSpawned = webTrace.find((t) => t.spawned);
  assert.ok(tsSpawned && webSpawned, 'spawned tile present in both traces');
  assert.deepStrictEqual(tsSpawned.from, [], 'TS spawned tile has empty from');
  assert.deepStrictEqual(webSpawned.from, [], 'web spawned tile has empty from');
  assert.strictEqual(tsSpawned.value, webSpawned.value, 'spawn value identical');

  const noop = runMoveBoth(
    boardWith([
      [1, 3, 6, 12],
      [1, 3, 6, 12],
      [1, 3, 6, 12],
      [1, 3, 6, 12]
    ]),
    'left',
    13
  );
  const tsNoopTrace = (noop.tsRes as { trace: Array<{ spawned: boolean }> }).trace;
  const webNoopTrace = (noop.webRes as { trace: Array<{ spawned: boolean }> }).trace;
  assert.strictEqual(tsNoopTrace.filter((t) => t.spawned).length, 0, 'TS noop trace has no spawned entry');
  assert.strictEqual(webNoopTrace.filter((t) => t.spawned).length, 0, 'web noop trace has no spawned entry');
  assert.deepStrictEqual(noop.tsRes, noop.webRes, 'noop full result identical');
});
