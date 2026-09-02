import { test } from 'node:test';
import assert from 'node:assert';
import * as game from '../../src/engine/core/index.ts';
import type { Board, Direction, GameState, MoveResult, PendingSpawn, Rng } from '../../src/engine/core/index.ts';
import {
  rngOf,
  staticBoard,
  boardWith,
  mulberry32,
  gameState,
  runSeededSession,
  sigmaBound,
} from '../../test-utils/helpers.ts';

// Story 2.6 (integração com o engine — merge-once e effective-move) — acceptance
// tests for Adaptive Spawn wired into the live move path via the immutable
// GameState snapshot with pre-resolved pendingSpawn (N3 forward contract).
// Assertions pin EXPECTED behavior per the story acceptance criteria.
//
// Activated from the ATDD RED-phase scaffolds (T1–T6 landed; R1 rewrites applied
// separately in pot/pot-tier-pipeline/weights tests). Typed against the real
// engine exports — no facade, no casts.
//
// sigmaBound and runSeededSession live in test-utils/helpers.ts (lifted from
// the former module-local copies so the statistical windows shared with the
// 7.1 contract suite can't drift apart).
//
// DW-57 σ-budget (fixed-seed deterministic tripwires — brittle to seed/rng
// rotation; no band-math changes, DW-58 hand-computed literal thresholds remain
// the independent oracle):
// - AC2 directional tripwire: seed 0xc31, N=5000, exact-match (0 off-edge).
//   Historical uniformity gate that this replaced was N=15000, ±2% absolute
//   ≈10σ for uniform p=1/16 (σ=√(p(1-p)/N)≈0.00197 → 0.02/σ≈10.1). Bundle
//   intent phrase "AC2 ±2% ≈10σ at N=5000" preserved as shorthand for the
//   headroom the deterministic gate enjoys; treat any future seed rotation as
//   requiring re-validation of the σ budget.
// - AC7 session gate: seed 0x26c6, N=10000, aggregate 40/40/20 window ±2%
//   absolute ≈4.1σ for p=0.4 (σ≈0.00490) and ≈5.0σ for p=0.2 (σ≈0.00400).
//   Deterministic tripwire — survives only if new seed stays inside that
//   absolute window. Per-tier conditional frequencies are NOT absolute: they
//   use sigmaBound 5σ (see helpers.ts) and are decoupled from seed-starvation.
// - Ceiling-ordering gates: seeds 0x51ce+ceiling (and +0x100 for tier-0
//   exception), N=2000 per ceiling, exact 0-exceed contract — no tolerance.
// - DisplayRoll uniformity pin: N=10000 mean ±0.015 ≈5.4σ for uniform[0,1)
//   (Var=1/12, σ_mean=√(1/12/N)≈0.00289 → 0.015/σ≈5.19). Sigma-scaled gates
//   (displayRoll, per-tier conditional) are 5σ; absolute gates (aggregate,
//   AC2) remain 4–10σ per the notes above.

function spyRng(...values: number[]): Rng & { calls: number[] } {
  const calls: number[] = [];
  let i = 0;
  const rng = (): number => {
    if (i >= values.length) {
      throw new Error(`spyRng exhausted after ${calls.length} scripted draw(s) — the engine drew more than expected`);
    }
    const v = values[i++];
    calls.push(v);
    return v;
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

test('[P1] AC2 (Epic 12) directional placement tripwire: spawn lands on the opposite edge of the moved line (move-path, drift tripwire)', () => {
  // Story 12.1 redefined spawn placement (supersedes Epic 2 / 2-6 AC2 uniform
  // random). The [3,3] row merges to [6]; rows 1-3 are empty and UNCHANGED.
  // Only row 0 moved, so the ONLY eligible opposite-edge cell is (0, 3) — the
  // rightmost column of the moved row. Every effective move must spawn there,
  // never elsewhere and never in an unchanged line. A regression back to
  // board-wide uniform spawn (or any off-edge placement) fails loudly.
  // DW-57 σ-budget: fixed seed 0xc31, N=5000, exact 0 off-edge contract.
  // Historical AC2 uniformity gate was N=15000, ±2% absolute ≈10σ for p=1/16
  // (σ≈0.00197); current directional gate is deterministic — the "≈10σ at
  // N=5000" bundle phrase denotes equivalent headroom if reinterpreted as a
  // frequency gate. Brittle to any future seed rotation or rng switch.
  const N = 5000;
  const rng = mulberry32(0xc31);
  let onEdge = 0;
  let offEdge = 0;
  for (let i = 0; i < N; i++) {
    const state = gameState(boardWith([[3, 3, null, null], [], [], []]), { value: 1, displayRoll: 0 });
    const res = game.move(state, 'left', rng);
    assert.strictEqual(res.moved, true);
    const spawned = res.trace.find((e) => e.spawned);
    assert.ok(spawned, 'effective move must produce a spawned trace entry');
    assert.strictEqual(spawned.value, 1, 'spawn materializes the pending value');
    if (spawned.to[0] === 0 && spawned.to[1] === 3) onEdge++;
    else offEdge++;
  }
  assert.strictEqual(offEdge, 0, `directional contract violated: ${offEdge}/${N} spawns landed off the moved-line edge (0,3)`);
  assert.strictEqual(onEdge, N, `every effective move must spawn on (0,3) (got ${onEdge}/${N})`);
});

test('[P0] AC7 statistical distribution matches fixed 40/40 + pot-by-ceiling, N3 invariant and displayRoll uniformity over 10k spawns', () => {
  // DW-57 σ-budget: fixed seed 0x26c6, N=10000. Aggregate 40/40/20 window is
  // absolute ±2% (≈4.1σ for p=0.4, ≈5.0σ for p=0.2) — deterministic tripwire,
  // brittle to seed rotation. Per-tier conditional frequencies below use
  // sigmaBound 5σ (seed-starvation/knife-edge decoupled since 2026-08-23).
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
  const tol = 0.02; // DW-57: ~4–5σ at N=10k — see header σ-budget; absolute window, no sigma scaling (hand-computed DW-58 literals remain the oracle, no band-math change)
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
  // DW-57 σ-budget: seeds 0x5eed+ceiling, N=12000 per ceiling. Aggregate pot
  // share window is absolute ±2% (≈5.4σ for p=0.2); conditional frequencies
  // use sigmaBound 5σ (max 0.01 floor) — decoupled from seed-starvation.
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
  const replayInput = game.stateFromResult(r1);
  const r2a = game.move(replayInput, 'right', rngOf(0.25, 0.35, 0.45));
  const r2b = game.move({ board: r1.board, pendingSpawn: { ...r1.pendingSpawn } }, 'right', rngOf(0.25, 0.35, 0.45));
  assert.strictEqual(r2a.moved, true);
  assert.deepStrictEqual(r2a, r2b, 'state object fully determines the next result — no hidden state');
});

test('[P1] tier-0 ceiling-ordering exception: pot value 3 legitimately exceeds tiny ceiling 0/1/2 (documented harmless)', () => {
  // Game.ts:64-69 documents that tier-0 is the harmless exception — pot value 3 can exceed a tiny ceiling.
  // This was the exact case excluded from the tier>=1 ordering test and asserted nowhere (DW-63).
  // We pin that the exception actually occurs and is observable, so future refactors don't "fix" it away.
  // DW-57 σ-budget: seeds 0x51ce+ceiling+0x100, N=2000 per tiny ceiling, exact contract (no tolerance).
  for (const ceiling of [0, 1, 2]) {
    const rng = mulberry32(0x51ce + ceiling + 0x100);
    let sawThree = false;
    let sawExceeding = false;
    for (let i = 0; i < 2000; i++) {
      const v = game.resolveSpawn(ceiling, rng);
      assert.ok(isValidSpawnValue(v), `ceiling ${ceiling}: spawn value ${v} invalid`);
      // Tier-0 pot is [3]; combined band is 1(0.4),2(0.4),3(0.2) — only 3 can be pot and exceed 0/1/2
      assert.ok(v === 1 || v === 2 || v === 3, `ceiling ${ceiling}: tier-0 spawn must be 1,2 or 3, got ${v}`);
      if (v === 3) sawThree = true;
      if (v > ceiling) sawExceeding = true;
    }
    assert.ok(sawThree, `ceiling ${ceiling}: must eventually spawn 3 (tier-0 pot)`);
    assert.ok(sawExceeding, `ceiling ${ceiling}: value 3 must exceed tiny ceiling ${ceiling} at least once (harmless exception)`);
  }
});

// Tier >= 1 only: for ceilings 0/1/2 the tier-0 pot value 3 can legitimately
// exceed the ceiling (documented exception in spawn.ts/game.ts comments).
// DW-57 σ-budget: seeds 0x51ce+ceiling, N=2000 per ceiling, exact 0-exceed contract (no tolerance, no sigma window).
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
