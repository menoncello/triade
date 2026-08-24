import { test } from 'node:test';
import assert from 'node:assert';
import * as game from '../../src/engine/core/index.ts';
import type { Board, GameState, MoveResult, PendingSpawn, Rng } from '../../src/engine/core/index.ts';
import {
  rngOf,
  staticBoard,
  boardWith,
  gameState,
  runSeededSession,
  sigmaBound,
  preSpawnBoardOf,
} from '../../test-utils/helpers.ts';

// Story 7.1 (pendingSpawn pre-resolvido no snapshot) — dedicated contract suite
// pinning each 7.1 acceptance criterion BY NAME. The engine-side forward
// contract already landed in story 2.6; this suite owns 7.1's AC→test
// traceability so a future regression in pendingSpawn semantics fails under
// 7.1's own label. The 2.6 integration suite (adaptive-spawn-integration.test.ts)
// pins the resolver integration and stays untouched.
//
// sigmaBound / runSeededSession / preSpawnBoardOf are shared test utilities
// living in test-utils/helpers.ts (lifted from the former module-local copies)
// — test files never import from other test files.

function spyRng(...values: number[]): Rng & { calls: number[] } {
  const calls: number[] = [];
  let i = 0;
  const rng = (): number => {
    if (i >= values.length) {
      throw new Error(
        `spyRng exhausted after ${calls.length} scripted draw(s) — the engine drew more than expected`
      );
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

// sigmaBound (5σ statistical tolerance, z * sqrt(p(1-p)/n)) and runSeededSession
// come from test-utils/helpers.ts — same convention as adaptive-spawn-integration
// .test.ts so a frequency gate can never be simultaneously seed-starved and
// knife-edge flaky, and the harness behavior can't drift between suites.

test('[P0] AC1 effective move resolves the NEXT pending from the post-merge ceiling; newGame returns an initial resolved pending (draw budget 20)', () => {
  // [48,48] merges to 96 -> next pending resolved from the post-merge/pre-spawn
  // ceiling (96), then the spawn is placed. Draws (cell=0, value=0.9, roll=0.5).
  const board = boardWith([[48, 48, null, null], [], [], []]);
  const spy = spyRng(0, 0.9, 0.5);
  const res = game.move(gameState(board, { value: 1, displayRoll: 0 }), 'left', spy);
  assert.strictEqual(res.moved, true);
  assert.strictEqual(res.board[0][0], 96);
  assert.deepStrictEqual(Object.keys(res.pendingSpawn).sort(), ['displayRoll', 'value']);
  assert.deepStrictEqual(res.pendingSpawn, { value: 3, displayRoll: 0.5 });
  assert.strictEqual(spy.calls.length, 3, 'effective move draws exactly (cell, next value, displayRoll)');
  // The resolved tier matches the post-merge board's ceiling (96), not the
  // post-spawn board's: recover the pre-spawn board and compare pots.
  const preSpawnBoard = preSpawnBoardOf(res);
  const tier = game.tierForCeiling(game.ceilingDetector(preSpawnBoard));
  assert.ok(
    game.potForTier(tier).includes(res.pendingSpawn.value),
    `pending value ${res.pendingSpawn.value} must come from tier-${tier}'s pot`
  );

  // newGame resolves an initial pending within the fixed 20-draw budget.
  const newGameSpy = spyRng(...Array(18).fill(0.5), 0.9, 0.25);
  const state = game.newGame(newGameSpy);
  assert.strictEqual(newGameSpy.calls.length, 20, 'newGame consumes exactly 20 draws');
  assert.deepStrictEqual(state.pendingSpawn, { value: 3, displayRoll: 0.25 });

  // Determinism: identical seed reproduces the identical { board, pendingSpawn } sequence.
  const a = runSeededSession(1234, 60);
  const b = runSeededSession(1234, 60);
  assert.deepStrictEqual(a.snapshots, b.snapshots);
});

test('[P0] AC2/FR-41 pendingSpawn shares the actual spawn distribution over >=10k effective moves (seeded, 5σ) and every materialization honors N3', () => {
  const { spawnValues, n3pairs, tieredPairs } = runSeededSession(0x71c7, 10000);
  const N = spawnValues.length;
  let ones = 0;
  let twos = 0;
  let pots = 0;
  for (const v of spawnValues) {
    if (v === 1) ones++;
    else if (v === 2) twos++;
    else pots++;
  }
  // Fixed bands 40/40 + pot 20, gated at 5σ (auto-scales with N — no dead gate).
  assert.ok(Math.abs(ones / N - 0.4) < sigmaBound(0.4, N), `ones ${(ones / N).toFixed(4)} vs ~0.4`);
  assert.ok(Math.abs(twos / N - 0.4) < sigmaBound(0.4, N), `twos ${(twos / N).toFixed(4)} vs ~0.4`);
  assert.ok(Math.abs(pots / N - 0.2) < sigmaBound(0.2, N), `pot band ${(pots / N).toFixed(4)} vs ~0.2`);
  // Same-run N3 forward invariant: each materialized spawn equals the
  // previously resolved pendingSpawn.value.
  for (const { promised, materialized } of n3pairs) {
    assert.strictEqual(materialized, promised, 'materialized spawn must equal the previously resolved pendingSpawn');
  }
  // Pot-by-ceiling: materialized values bucketed by their pending's tier stay
  // inside that tier's pot and follow its conditional frequencies.
  const valuesByTier = new Map<number, number[]>();
  for (const { tier, value } of tieredPairs) {
    const arr = valuesByTier.get(tier) ?? [];
    arr.push(value);
    valuesByTier.set(tier, arr);
  }
  let gatedTiers = 0;
  let skippedTiers = 0;
  for (const [tier, values] of valuesByTier) {
    const pot = game.potForTier(tier);
    const potValues = values.filter((v) => v >= 3);
    for (const v of potValues) {
      assert.ok(pot.includes(v), `materialized ${v} is not in tier-${tier} pot [${pot.join(', ')}]`);
    }
    if (pot.length === 1 || potValues.length < 50) {
      skippedTiers++;
      continue;
    }
    gatedTiers++;
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
  // The composition gates must not silently vanish: report gated-vs-skipped
  // tiers so a traffic-skewing regression cannot hide behind a green run.
  assert.ok(
    gatedTiers >= 1,
    `composition gates never ran — ${gatedTiers} gated / ${skippedTiers} skipped of ${valuesByTier.size} tiers`
  );
});

test('[P0] AC3/ADR-06 pendingSpawn lives in the snapshot: rewind shape reproduces the identical next result', () => {
  const base = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
  const r1 = game.move(base, 'left', rngOf(0.1, 0.2, 0.3));
  // Reconstructing GameState from { result.board, result.pendingSpawn } and
  // replaying the same rng reproduces the identical next result.
  const replayInput: GameState = { board: r1.board, pendingSpawn: r1.pendingSpawn };
  const r2a = game.move(replayInput, 'right', rngOf(0.25, 0.35, 0.45));
  const r2b = game.move({ board: r1.board, pendingSpawn: { ...r1.pendingSpawn } }, 'right', rngOf(0.25, 0.35, 0.45));
  assert.strictEqual(r2a.moved, true);
  assert.deepStrictEqual(r2a, r2b, 'state object fully determines the next result — no hidden state');
  // pendingSpawn is a first-class field of the snapshot itself.
  assert.deepStrictEqual(Object.keys(base).sort(), ['board', 'pendingSpawn']);
});

test('[P0] AC3/ADR-06 shallow-copy isolation: mutating a caller pendingSpawn never rewrites history (noop returns a copy, not a live reference)', () => {
  // NOOP path: result.pendingSpawn is a copy — not the input's live reference.
  const pending: PendingSpawn = { value: 3, displayRoll: 0.25 };
  const noopRes = game.move(gameState(fullNoopBoard(), pending), 'left', spyRng());
  assert.strictEqual(noopRes.moved, false, 'fullNoopBoard must actually produce a NOOP for this pin to apply');
  assert.notStrictEqual(noopRes.pendingSpawn, pending, 'noop must return a copy of the input pending');
  noopRes.pendingSpawn.value = 999;
  noopRes.pendingSpawn.displayRoll = 999;
  assert.deepStrictEqual(pending, { value: 3, displayRoll: 0.25 }, 'input state untouched by caller mutation');

  // Effective path: each result carries its own fresh object — mutating a
  // later result never rewrites earlier snapshots (prior history intact).
  const s0 = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
  const m1 = game.move(s0, 'left', rngOf(0.1, 0.2, 0.3));
  const history: Array<PendingSpawn> = [{ ...m1.pendingSpawn }];
  const s1: GameState = { board: m1.board, pendingSpawn: m1.pendingSpawn };
  const m2 = game.move(s1, 'right', rngOf(0.25, 0.35, 0.45));
  assert.notStrictEqual(m2.pendingSpawn, m1.pendingSpawn, 'each resolution produces a fresh pending object');
  m2.pendingSpawn.value = 999;
  m2.pendingSpawn.displayRoll = 999;
  assert.deepStrictEqual(history[0], { ...m1.pendingSpawn }, 'earlier snapshot unaffected by later mutation');
});

test('[P0] AC4 place-not-roll: spawnTile places exactly the given value (never rolls it); materialized tile equals the pre-resolved pending across the distribution sweep', () => {
  // spawnTile consumes one draw (the CELL pick) and the placed value is the
  // given one regardless of what the draw returns — even a boundary draw.
  for (const draw of [0, 0.5, 0.9999]) {
    const board = staticBoard([null, null, null, null]);
    const spy = spyRng(draw);
    const spawn = game.spawnTile(board, 42, spy);
    assert.ok(spawn.cell != null, 'spawnTile must place the tile on a concrete cell');
    assert.strictEqual(spawn.value, 42, `placed value must be the given 42 (draw was ${draw})`);
    assert.strictEqual(spy.calls.length, 1, 'spawnTile rolls only the cell, never the value');
  }

  // Distribution sweep through the live move path: pendings spanning the fixed
  // band and representative pot tiers all materialize exactly as pre-resolved.
  for (const pendingValue of [1, 2, 3, 6, 12, 24]) {
    const res = game.move(
      gameState(staticBoard([1, 2, null, null]), { value: pendingValue, displayRoll: 0 }),
      'left',
      rngOf(0, 0.5, 0.5)
    );
    assert.strictEqual(res.moved, true);
    const spawned = res.trace.find((e) => e.spawned);
    assert.ok(spawned, 'effective move must produce a spawned trace entry');
    assert.strictEqual(spawned.value, pendingValue, `pending ${pendingValue} must materialize unchanged`);
  }
});

test('[P0] AC5/UX-DR-23 NOOP never re-resolves the preview: pendingSpawn deep-equal to input, 0 rng draws', () => {
  const pending: PendingSpawn = { value: 24, displayRoll: 0.75 };
  const spy = spyRng();
  const res: MoveResult = game.move(gameState(fullNoopBoard(), pending), 'left', spy);
  assert.strictEqual(res.moved, false);
  assert.deepStrictEqual(res.pendingSpawn, pending, 'rejected move keeps the exact preview (no re-roll)');
  assert.strictEqual(spy.calls.length, 0, 'a NOOP consumes zero rng draws');
});

test('[P0] AC4 combined-resolver band edges: a draw landing EXACTLY on a cumulative boundary selects the next band', () => {
  // weightedPicker maps scaled = roll * total into band i when
  // prevCumulative <= scaled < cumulative — so a draw whose scaled value lands
  // ON an edge falls into the NEXT band. Edges are computed from spawnConfig
  // data only (boundary rule 4): [FIXED_WEIGHTS[1], FIXED_WEIGHTS[2],
  // ...normalizeTo(POT_WEIGHT, potWeights(pot))].
  // FP-safety: (acc / total) * total is NOT guaranteed to round back to acc,
  // so each probe roll is derived FROM the engine's own arithmetic — edgeRoll
  // is the smallest double r with r * total >= acc, and belowRoll the largest
  // double with r * total < acc — instead of trusting a naive division to
  // round-trip. Also probes the final band's upper edge (largest double < 1).
  for (const ceiling of [0, 48, 96, 192]) {
    const tier = game.tierForCeiling(ceiling);
    const pot = game.potForTier(tier);
    const norm = game.normalizeTo(game.POT_WEIGHT, game.potWeights(pot));
    const combined = [game.FIXED_WEIGHTS[1], game.FIXED_WEIGHTS[2], ...norm];
    const total = combined.reduce((a, b) => a + b, 0);
    const expected = [1, 2, ...pot]; // band i resolves to expected[i]
    const stepUp = (start: number, target: number): number => {
      let r = start;
      let guard = 0;
      while (r * total < target && guard++ < 64) r += Math.max(r * Number.EPSILON, Number.MIN_VALUE);
      assert.ok(r * total >= target, `no double r satisfies r * total >= ${target}`);
      return r;
    };
    // Probe every internal edge acc_i: exactly at the edge -> band i+1; one
    // representable double below it -> still band i.
    let acc = 0;
    for (let i = 0; i < combined.length - 1; i++) {
      acc += combined[i];
      const edgeRoll = stepUp(acc / total, acc);
      const spy = spyRng(edgeRoll);
      assert.strictEqual(
        game.resolveSpawn(ceiling, spy),
        expected[i + 1],
        `ceiling ${ceiling}: edge draw ${edgeRoll} must select band ${i + 1} (value ${expected[i + 1]}), not band ${i}`
      );
      assert.strictEqual(spy.calls.length, 1, 'resolveSpawn consumes exactly one rng draw');
      let belowRoll = edgeRoll;
      let guard = 0;
      while (belowRoll * total >= acc && guard++ < 64) {
        belowRoll -= Math.max(belowRoll * Number.EPSILON, Number.MIN_VALUE);
      }
      assert.ok(belowRoll > 0 && belowRoll * total < acc, 'found a representable draw strictly below the edge');
      const belowSpy = spyRng(belowRoll);
      assert.strictEqual(
        game.resolveSpawn(ceiling, belowSpy),
        expected[i],
        `ceiling ${ceiling}: largest draw below ${edgeRoll} must stay in band ${i} (value ${expected[i]})`
      );
      assert.strictEqual(belowSpy.calls.length, 1);
    }
    // Upper edge of the FINAL band: the largest representable double < 1 must
    // resolve into the last band (where accumulation-rounding bugs surface).
    const topRoll = 1 - Number.EPSILON / 2;
    const topSpy = spyRng(topRoll);
    assert.strictEqual(
      game.resolveSpawn(ceiling, topSpy),
      expected[expected.length - 1],
      `ceiling ${ceiling}: draw just under 1 must land in the final band (value ${expected[expected.length - 1]})`
    );
    assert.strictEqual(topSpy.calls.length, 1);
  }
});
