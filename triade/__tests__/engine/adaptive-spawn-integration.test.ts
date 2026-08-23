import { test } from 'node:test';
import assert from 'node:assert';
import * as game from '../../src/engine/core/index.ts';
import type { Board, Direction, GameState, MoveResult, PendingSpawn, Rng } from '../../src/engine/core/index.ts';
import { rngOf, staticBoard, boardWith, mulberry32, gameState } from '../../test-utils/helpers.ts';

// Story 2.6 (integração com o engine — merge-once e effective-move) — acceptance
// tests for Adaptive Spawn wired into the live move path via the immutable
// GameState snapshot with pre-resolved pendingSpawn (N3 forward contract).
// Assertions pin EXPECTED behavior per the story acceptance criteria.
//
// Activated from the ATDD RED-phase scaffolds (T1–T6 landed; R1 rewrites applied
// separately in pot/pot-tier-pipeline/weights tests). Typed against the real
// engine exports — no facade, no casts.

function spyRng(...values: number[]): Rng & { calls: number[] } {
  const calls: number[] = [];
  let i = 0;
  const rng = (): number => {
    const v = values[i++];
    calls.push(v === undefined ? 0.5 : v);
    return calls[calls.length - 1];
  };
  return Object.assign(rng, { calls });
}

function fullNoopBoard(): Board {
  return boardWith([
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
}

function isValidSpawnValue(v: number): boolean {
  if (v === 1 || v === 2) return true;
  const k = Math.log2(v / 3);
  return v >= 3 && Number.isInteger(k);
}

// Statistical tolerance scaled by sigma: z * sqrt(p(1-p)/n). Auto-adjusts to
// sample size so a frequency gate can never be simultaneously seed-starved
// (dead) and knife-edge flaky when a future seed/rng rotation revives it.
// Shared by the AC7 session gate and the per-ceiling composition gate so the
// two statistical windows can't drift apart again.
function sigmaBound(expected: number, n: number, z = 5): number {
  return z * Math.sqrt((expected * (1 - expected)) / n);
}

// Seeded session harness: plays effective moves cycling directions, restarts
// the game when stuck (deterministic — same seed replays identically) and
// records materialized spawn values plus the N3 promise/materialization pairs.
// tieredPairs buckets each MATERIALIZED value by the tier its pending was
// resolved from (recovered from the pre-spawn board), enabling pot-by-ceiling
// composition checks over the live move path.
function runSeededSession(seed: number, targetSpawns: number) {
  const rng = mulberry32(seed);
  const dirs: Direction[] = ['left', 'up', 'right', 'down'];
  let state: GameState = game.newGame(rng);
  let lastPending: PendingSpawn = state.pendingSpawn;
  let lastResolvedTier = game.tierForCeiling(game.ceilingDetector(state.board));
  const spawnValues: number[] = [];
  const displayRolls: number[] = [];
  const n3pairs: Array<{ promised: number; materialized: number }> = [];
  const tieredPairs: Array<{ tier: number; value: number }> = [];
  const snapshots: Array<{ board: Board; pendingSpawn: PendingSpawn }> = [];
  let dirIdx = 0;
  let stale = 0;
  while (spawnValues.length < targetSpawns) {
    const res = game.move(state, dirs[dirIdx++ % 4], rng);
    if (!res.moved) {
      stale++;
      if (stale >= 8 || game.isGameOver(res.board)) {
        state = game.newGame(rng);
        lastPending = state.pendingSpawn;
        lastResolvedTier = game.tierForCeiling(game.ceilingDetector(state.board));
        stale = 0;
      }
      continue;
    }
    stale = 0;
    const spawned = res.trace.find((e) => e.spawned);
    assert.ok(spawned, 'effective move must produce a spawned trace entry');
    spawnValues.push(spawned.value);
    displayRolls.push(res.pendingSpawn.displayRoll);
    n3pairs.push({ promised: lastPending.value, materialized: spawned.value });
    tieredPairs.push({ tier: lastResolvedTier, value: spawned.value });
    snapshots.push({ board: res.board, pendingSpawn: res.pendingSpawn });
    state = { board: res.board, pendingSpawn: res.pendingSpawn };
    lastPending = res.pendingSpawn;
    // The NEXT pending was resolved from the post-merge board BEFORE placing
    // the spawn — reconstruct that pre-spawn board to recover its tier.
    const preSpawnBoard: Board = res.board.map((row) => row.slice());
    preSpawnBoard[spawned.to[0]][spawned.to[1]] = null;
    lastResolvedTier = game.tierForCeiling(game.ceilingDetector(preSpawnBoard));
  }
  return { spawnValues, displayRolls, n3pairs, tieredPairs, snapshots };
}

test('[P0] AC1 noop on a full board: no spawn, no score, pendingSpawn unchanged, 0 draws', () => {
  const pending: PendingSpawn = { value: 3, displayRoll: 0.25 };
  const spy = spyRng();
  const res = game.move(gameState(fullNoopBoard(), pending), 'left', spy);
  assert.strictEqual(res.moved, false);
  assert.strictEqual(res.score, 0);
  assert.strictEqual(res.trace.filter((e) => e.spawned).length, 0);
  assert.deepStrictEqual(res.pendingSpawn, pending);
  assert.strictEqual(spy.calls.length, 0);
});

test('[P0] AC4 effective move consumes exactly 3 draws in order (cell, next value, displayRoll)', () => {
  const spy = spyRng(0, 0.9, 0.5);
  const res = game.move(gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 }), 'left', spy);
  assert.strictEqual(res.moved, true);
  assert.deepStrictEqual(spy.calls, [0, 0.9, 0.5]);
  assert.deepStrictEqual(res.pendingSpawn, { value: 3, displayRoll: 0.5 });
});

test('[P0] AC4 newGame consumes exactly 20 draws in order (18 alternating cell/value + pending value + displayRoll)', () => {
  // Draws 1..18: odd = cell pick, even = tile value. All-0.5 value draws land
  // in the tier-0 combined band [0.4, 0.8) -> every starting tile is a 2.
  // Draw 19 resolves the initial pending VALUE from the post-placement ceiling
  // (nine 2s -> tier 0; 0.9 ∈ [0.8, 1.0) -> 3); draw 20 is its displayRoll.
  const spy = spyRng(...Array(18).fill(0.5), 0.9, 0.25);
  const state = game.newGame(spy);
  assert.strictEqual(spy.calls.length, 20);
  assert.strictEqual(state.board.flat().filter((v) => v !== null).length, 9);
  assert.strictEqual(state.board.flat().filter((v) => v === 2).length, 9);
  assert.deepStrictEqual(state.pendingSpawn, { value: 3, displayRoll: 0.25 });
});

test('[P0] tier wiring pin: post-merge ceiling 96 -> tier 2 combined bands (0.9->3, 0.93->6, 0.99->12)', () => {
  const cases: Array<[number[], number]> = [
    [[0, 0.9, 0.5], 3],
    [[0, 0.93, 0.5], 6],
    [[0, 0.99, 0.5], 12],
  ];
  for (const [draws, expected] of cases) {
    const board = boardWith([[48, 48, null, null], [], [], []]);
    const res = game.move(gameState(board, { value: 1, displayRoll: 0 }), 'left', rngOf(...draws));
    assert.strictEqual(res.moved, true);
    assert.strictEqual(res.board[0][0], 96);
    assert.deepStrictEqual(res.pendingSpawn, { value: expected, displayRoll: 0.5 });
  }
});

test('[P0] tier ladder variants: pending pot membership for ceilings 96 / 192 / 384', () => {
  const ladders: Array<[Array<number | null>, number[]]> = [
    [[48, 48], [3, 6, 12]],
    [[96, 96], [3, 6, 12, 24]],
    [[192, 192], [3, 6, 12, 24, 48]],
  ];
  for (const [row, pot] of ladders) {
    const matrix: Array<Array<number | null>> = [];
    matrix.push([...row, null, null]);
    while (matrix.length < 4) matrix.push([]);
    const board = boardWith(matrix);
    const res = game.move(gameState(board, { value: 1, displayRoll: 0 }), 'left', rngOf(0, 0.85, 0.5));
    assert.strictEqual(res.moved, true);
    assert.ok(
      pot.includes(res.pendingSpawn.value),
      `pendingSpawn.value ${res.pendingSpawn.value} must be in tier pot [${pot.join(', ')}]`
    );
    assert.ok(isValidSpawnValue(res.pendingSpawn.value));
  }
});

test('[P0] AC3 merge-once holds when a pot tile is pending: [3,3,3,3] left -> [6,3,3,spawn]', () => {
  const board = boardWith([[3, 3, 3, 3], [], [], []]);
  const res = game.move(gameState(board, { value: 6, displayRoll: 0 }), 'left', rngOf(0, 0.1, 0.5));
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.score, 6);
  assert.deepStrictEqual(res.board[0], [6, 3, 3, 6]);
  const spawned = res.trace.find((e) => e.spawned);
  assert.ok(spawned);
  assert.strictEqual(spawned.value, 6);
  assert.deepStrictEqual(spawned.from, []);
});

test('[P0] AC5 move returns { board, score, moved, trace, pendingSpawn } and an assertable spawn trace', () => {
  const input: PendingSpawn = { value: 2, displayRoll: 0 };
  const res = game.move(gameState(staticBoard([1, 2, null, null]), input), 'left', rngOf(0, 0.2, 0.5));
  assert.deepStrictEqual(Object.keys(res).sort(), ['board', 'moved', 'pendingSpawn', 'score', 'trace']);
  const spawned = res.trace.find((e) => e.spawned);
  assert.ok(spawned, 'trace must contain the spawned tile');
  assert.strictEqual(spawned.value, input.value);
  assert.deepStrictEqual(spawned.from, []);
  assert.strictEqual(typeof res.score, 'number');
  assert.strictEqual(typeof res.moved, 'boolean');
});

test('[P0] AC6 snapshot shape: newGame returns GameState with a valid initial pendingSpawn', () => {
  const state = game.newGame(mulberry32(42));
  assert.deepStrictEqual(Object.keys(state).sort(), ['board', 'pendingSpawn']);
  assert.deepStrictEqual(Object.keys(state.pendingSpawn).sort(), ['displayRoll', 'value']);
  assert.ok(isValidSpawnValue(state.pendingSpawn.value), `initial pending value ${state.pendingSpawn.value} invalid`);
  assert.ok(state.pendingSpawn.displayRoll >= 0 && state.pendingSpawn.displayRoll < 1);

  const res = game.move(gameState(staticBoard([1, 2, null, null])), 'left', mulberry32(7));
  assert.ok(isValidSpawnValue(res.pendingSpawn.value), `next pending value ${res.pendingSpawn.value} invalid`);
  assert.ok(res.pendingSpawn.displayRoll >= 0 && res.pendingSpawn.displayRoll < 1);
});

test('[P1] AC2 spawn cell is uniformly random across post-merge empties within ±2% (move-path, drift tripwire)', () => {
  // Exercises the FULL move path (spec T8: "run many effective moves"): the
  // [3,3] row merges to [6], so move() computes the empty set on the
  // POST-MERGE board and spawnTile picks uniformly among those 15 cells.
  // A bug in move()'s post-merge empty-cell computation can no longer hide.
  const N = 15000;
  const counts: number[][] = Array.from({ length: 4 }, () => new Array<number>(4).fill(0));
  const rng = mulberry32(0xc31);
  for (let i = 0; i < N; i++) {
    const state = gameState(boardWith([[3, 3, null, null], [], [], []]), { value: 1, displayRoll: 0 });
    const res = game.move(state, 'left', rng);
    assert.strictEqual(res.moved, true);
    const spawned = res.trace.find((e) => e.spawned);
    assert.ok(spawned, 'effective move must produce a spawned trace entry');
    assert.strictEqual(spawned.value, 1, 'spawn materializes the pending value');
    counts[spawned.to[0]][spawned.to[1]]++;
  }
  const expected = 1 / 15;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (r === 0 && c === 0) {
        assert.strictEqual(counts[r][c], 0, 'merged cell (0,0) is occupied and never receives the spawn');
        continue;
      }
      assert.ok(
        Math.abs(counts[r][c] / N - expected) < 0.02,
        `cell ${r},${c}: ${(counts[r][c] / N).toFixed(4)} vs expected ~${expected.toFixed(4)}`
      );
    }
  }
});

test('[P0] AC7 statistical distribution matches fixed 40/40 + pot-by-ceiling, N3 invariant and displayRoll uniformity over 10k spawns', () => {
  const { spawnValues, displayRolls, n3pairs, tieredPairs } = runSeededSession(0x26c6, 10000);
  const N = spawnValues.length;
  assert.ok(N >= 10000);
  let ones = 0;
  let twos = 0;
  let pots = 0;
  for (const v of spawnValues) {
    if (v === 1) ones++;
    else if (v === 2) twos++;
    else pots++;
  }
  const tol = 0.02;
  assert.ok(Math.abs(ones / N - 0.4) < tol, `expected ~40% ones, got ${(ones / N).toFixed(4)}`);
  assert.ok(Math.abs(twos / N - 0.4) < tol, `expected ~40% twos, got ${(twos / N).toFixed(4)}`);
  assert.ok(Math.abs(pots / N - 0.2) < tol, `expected ~20% pot band, got ${(pots / N).toFixed(4)}`);
  for (const { promised, materialized } of n3pairs) {
    assert.strictEqual(materialized, promised, 'materialized spawn must equal the previously resolved pendingSpawn');
  }
  // Pot-by-ceiling (spec T8): materialized values bucketed by the tier their
  // pending was resolved from must stay inside that tier's pot and follow its
  // conditional frequencies. Tiers with very few pot samples fall back to
  // membership checks; every tier gets exhaustive statistical coverage in the
  // dedicated composition test below. Frequency tolerance is sigma-scaled
  // (see sigmaBound) — with seed 0x26c6 tier 1 has ~199 pot samples, which a
  // fixed ±0.05 window would both skip and flake on.
  const valuesByTier = new Map<number, number[]>();
  for (const { tier, value } of tieredPairs) {
    const arr = valuesByTier.get(tier) ?? [];
    arr.push(value);
    valuesByTier.set(tier, arr);
  }
  for (const [tier, values] of valuesByTier) {
    const pot = game.potForTier(tier);
    const potValues = values.filter((v) => v >= 3);
    for (const v of potValues) {
      assert.ok(pot.includes(v), `materialized ${v} is not in tier-${tier} pot [${pot.join(', ')}]`);
    }
    if (pot.length === 1 || potValues.length < 50) continue;
    const cond = game.normalizeTo(game.POT_WEIGHT, game.potWeights(pot)).map((w) => w / game.POT_WEIGHT);
    const counts = new Array<number>(pot.length).fill(0);
    for (const v of potValues) counts[pot.indexOf(v)]++;
    for (let i = 0; i < pot.length; i++) {
      const observed = counts[i] / potValues.length;
      assert.ok(
        Math.abs(observed - cond[i]) < sigmaBound(cond[i], potValues.length),
        `tier ${tier}: P(${pot[i]}|pot)=${observed.toFixed(4)} vs expected ${cond[i].toFixed(4)}`
      );
    }
  }
  // displayRoll is a raw [0,1) draw today; pin its mean (~5σ headroom at this
  // N) so a future resolver change can't skew it before Epic 7's preview reads it.
  for (const d of displayRolls) {
    assert.ok(d >= 0 && d < 1, `displayRoll ${d} outside [0,1)`);
  }
  const mean = displayRolls.reduce((a, b) => a + b, 0) / displayRolls.length;
  assert.ok(Math.abs(mean - 0.5) < 0.015, `displayRoll mean ${mean.toFixed(4)} must be ~0.5 (uniform)`);
});

test('[P1] AC7 pot-by-ceiling composition: every tier\'s conditional pot frequencies match normalizeTo weights', () => {
  // Exhaustive per-tier statistical check of the combined resolver: aggregate
  // pot share ≈ POT_WEIGHT and within-pot conditional frequencies match
  // normalizeTo(POT_WEIGHT, potWeights(pot)) / POT_WEIGHT for EVERY ceiling.
  const ceilings = [48, 96, 192, 384, 768, 1536];
  const N = 12000;
  for (const ceiling of ceilings) {
    const tier = game.tierForCeiling(ceiling);
    const pot = game.potForTier(tier);
    const cond = game.normalizeTo(game.POT_WEIGHT, game.potWeights(pot)).map((w) => w / game.POT_WEIGHT);
    const rng = mulberry32(0x5eed + ceiling);
    const counts = new Array<number>(pot.length).fill(0);
    let pots = 0;
    for (let i = 0; i < N; i++) {
      const v = game.resolveSpawn(ceiling, rng);
      if (v >= 3) {
        counts[pot.indexOf(v)]++;
        pots++;
      }
    }
    assert.ok(
      Math.abs(pots / N - game.POT_WEIGHT) < 0.02,
      `ceiling ${ceiling}: pot share ${(pots / N).toFixed(4)} vs expected ~${game.POT_WEIGHT}`
    );
    for (let i = 0; i < pot.length; i++) {
      const observed = counts[i] / pots;
      assert.ok(
        Math.abs(observed - cond[i]) < Math.max(0.01, sigmaBound(cond[i], pots)),
        `ceiling ${ceiling} (tier ${tier}): P(${pot[i]}|pot)=${observed.toFixed(4)} vs expected ${cond[i].toFixed(4)}`
      );
    }
  }
});

test('[P1] determinism: identical seed reproduces the identical { board, pendingSpawn } sequence', () => {
  const a = runSeededSession(1234, 60);
  const b = runSeededSession(1234, 60);
  assert.deepStrictEqual(a.snapshots, b.snapshots);
  assert.deepStrictEqual(a.spawnValues, b.spawnValues);
});

test('[P1] rewind shape: reconstructing GameState from a result reproduces the identical next result', () => {
  const base = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
  const r1 = game.move(base, 'left', rngOf(0.1, 0.2, 0.3));
  const replayInput = { board: r1.board, pendingSpawn: r1.pendingSpawn };
  const r2a = game.move(replayInput, 'right', rngOf(0.25, 0.35, 0.45));
  const r2b = game.move({ board: r1.board, pendingSpawn: { ...r1.pendingSpawn } }, 'right', rngOf(0.25, 0.35, 0.45));
  assert.strictEqual(r2a.moved, true);
  assert.deepStrictEqual(r2a, r2b, 'state object fully determines the next result — no hidden state');
});

// Tier >= 1 only: for ceilings 0/1/2 the tier-0 pot value 3 can legitimately
// exceed the ceiling (documented exception in spawn.ts/game.ts comments).
test('[P1] ceiling ordering: resolveSpawn never returns a value above its ceiling (tier >= 1)', () => {
  for (const ceiling of [48, 96, 192, 384, 768, 1536]) {
    const rng = mulberry32(0x51ce + ceiling);
    for (let i = 0; i < 2000; i++) {
      const v = game.resolveSpawn(ceiling, rng);
      assert.ok(isValidSpawnValue(v));
      assert.ok(v <= ceiling, `resolved ${v} exceeds ceiling ${ceiling}`);
    }
  }
});
