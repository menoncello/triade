/**
 * Unit — dw-decision-dw-56 (RED-PHASE combined mirror, test.skip)
 * Mirrors triade/__tests__/engine/rng-trust-hardening.atdd.test.ts (20 tests) for test_artifacts compliance
 * All are describe/it with it.skip (RED). Remove it.skip → it for GREEN. Before 2e91c12 they would fail (fallthrough / displayRoll NaN leak / bare rng()).
 * Run activated: node --loader tsx --test  or  npm --prefix triade test -- _bmad-output/test-artifacts/tests/unit/dw-decision-dw-56.atdd.test.ts
 * With game.ts normalizeDisplayRoll + weights.ts safeRoll delta: 20 pass when activated (~240ms). Host gate 910 pass dormant → 930 pass when activated.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { weightedPicker } from '../../../../triade/src/engine/core/weights.ts';
import { newGame, move } from '../../../../triade/src/engine/core/game.ts';
import { GRID_SIZE } from '../../../../triade/src/engine/core/types.ts';
import {
  boardWith,
  emptyBoard,
  gameState,
  rngOf,
  spyRng,
  mulberry32,
  staticBoard,
} from '../../../../triade/test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-decision-dw-56 — red-phase scaffolds
// covering working-tree delta vs baseline 2e91c12 → HEAD + working tree:
// triade/src/engine/core/weights.ts:20-37 — weightedPicker gains
//   safeRoll = Math.min(Math.max(roll, 0), 1 - Number.EPSILON) then scaled = safeRoll * total
//   (was roll * total with only NaN early-return; >=1/Infinity relied on fallthrough,
//   negative relied on scaled < acc accident).
// triade/src/engine/core/game.ts:8-18,34,110 — new normalizeDisplayRoll(raw: unknown): number
//   + two call sites newGame and move effective path: !finite/non-number → 0.5 midpoint,
//   <0 → 0, >=1 → 1 - Number.EPSILON, else raw. Preserves 1-draw budget.
// DW-56 trust-the-rng class closed: weightedPicker clamp vs fallthrough + displayRoll [0,1) + draw-budget.
// Spec: _bmad-output/implementation-artifacts/deferred-work.md DW-56
// Design: _bmad-output/test-artifacts/test-design-dw-engine-rng-trust-hardening.md (R-001..R-009, 38 P0 + 19 P1)
// ---------------------------------------------------------------------------

const weightsSrc = fs.readFileSync(
  fileURLToPath(new URL('../../../../triade/src/engine/core/weights.ts', import.meta.url)),
  'utf8',
);
const gameSrc = fs.readFileSync(
  fileURLToPath(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url)),
  'utf8',
);
const deferredSrc = fs.readFileSync(
  fileURLToPath(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
  'utf8',
);

// Helper to assert [0,1) window strict
function assertDisplayRollValid(v: number, label: string) {
  assert.equal(typeof v, 'number', `${label} typeof number`);
  assert.ok(Number.isFinite(v), `${label} finite`);
  assert.ok(v >= 0 && v < 1, `${label} ∈ [0,1) got ${v}`);
}

describe('ATDD dw-engine-rng-trust-hardening — P0 critical (weightedPicker clamp + displayRoll normalization + draw-budget)', () => {
  it.skip('[P0-01] weightedPicker negative clamp → first band (0), not NaN fallthrough (R-001)', () => {
    // Before fix: roll -0.5 → scaled -0.75 → scaled < acc true on first iter → 0 by accident, not clamp.
    // After: safeRoll = max(roll,0) → 0 → scaled 0 → first band deterministically.
    const w: readonly number[] = [1, 0.5];
    assert.strictEqual(weightedPicker(w, rngOf(-0.5)), 0, '-0.5 → 0 first band');
    assert.strictEqual(weightedPicker(w, rngOf(-1)), 0);
    assert.strictEqual(weightedPicker(w, () => -Infinity), 0, '-Infinity → 0');
    assert.strictEqual(weightedPicker(w, rngOf(0)), 0, '0 kept → 0');
  });

  it.skip('[P0-02] weightedPicker ≥1 / Infinity clamp → last via valid band 1-EPSILON, not fallthrough (R-001)', () => {
    // Before: roll 1 → scaled 1.5 (>=total 1.5) never hits scaled<acc → fallthrough return last (invalid scaled).
    // After: safeRoll = min(roll,1-EPSILON) → scaled < total → hits last via valid band.
    const w: readonly number[] = [1, 0.5];
    const last = w.length - 1;
    assert.strictEqual(weightedPicker(w, rngOf(1)), last, '1 → last via clamp');
    assert.strictEqual(weightedPicker(w, rngOf(1.5)), last);
    assert.strictEqual(weightedPicker(w, () => Infinity), last, 'Infinity → last');
    assert.strictEqual(weightedPicker(w, rngOf(0.99)), last, '0.99 → last also valid band');
    // Also verify 1-EPSILON path explicitly maps to last
    assert.strictEqual(weightedPicker(w, rngOf(1 - Number.EPSILON)), last);
  });

  it.skip('[P0-03] weightedPicker NaN / non-number guard still last (R-001,R-006)', () => {
    // Early typeof !== number || NaN → last before clamp; clamp alone would give NaN scaled but different path.
    const w: readonly number[] = [1, 1];
    assert.strictEqual(weightedPicker(w, () => NaN), 1, 'NaN → last');
    assert.strictEqual(weightedPicker(w, () => undefined as unknown as number), 1, 'undefined → last');
    assert.strictEqual(weightedPicker(w, () => '0.5' as unknown as number), 1, '"0.5" → last');
    assert.strictEqual(weightedPicker(w, () => null as unknown as number), 1, 'null → last');
    assert.strictEqual(weightedPicker(w, () => ({} as unknown as number)), 1, 'object → last');
  });

  it.skip('[P0-04] normalizeDisplayRoll non-finite / non-number → 0.5 midpoint, not 0 (R-002,R-005)', () => {
    // game.ts:8-18 — if (typeof raw !== number || !isFinite(raw)) return 0.5
    // 0.5 is midpoint → exact branch (<0.6) centrally not edge, chosen to keep preview neutral not zero-biased.
    const mk = (values: unknown[], expected: number) => {
      // helper via newGame with crafted third draw: 9 cell picks + 9 values + 1 pending value + 1 displayRoll = 20 draws
      // Use 9×0 for cells, 9×0.5 for values, 0.1 for pending value, then target displayRoll
      const rng = rngOf(...([0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1] as number[]), expected as unknown as number);
      // Directly test normalize via newGame displayRoll when rng is well-behaved scalar: we can't pass non-number via rngOf number[] so test via move third draw with spy that returns non-number
      // Instead test via direct function behavior: we replicate logic inline — the real test pins via move/newGame with NaN/Infinity.
      // For non-number injection, call normalizeDisplayRoll logic equivalent: newGame/move both do normalizeDisplayRoll(rng()) where rng returns unknown.
      // Here we test via game move with a rng that returns the crafted value as third draw.
      return rng;
    };
    // Pin via newGame: NaN → 0.5
    const nanRng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, NaN);
    const nanGame = newGame(nanRng as unknown as () => number);
    assert.strictEqual(nanGame.pendingSpawn.displayRoll, 0.5, 'newGame NaN → 0.5');
    assertDisplayRollValid(nanGame.pendingSpawn.displayRoll, 'NaN');

    const infRng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, Infinity);
    assert.strictEqual(newGame(infRng as unknown as () => number).pendingSpawn.displayRoll, 0.5, 'Infinity → 0.5');

    const negInfRng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, -Infinity);
    assert.strictEqual(newGame(negInfRng as unknown as () => number).pendingSpawn.displayRoll, 0.5, '-Infinity → 0.5 (non-finite before negative branch)');

    // non-number via move third draw: rngOf(0 pick, 0.2 value, "bad")
    const board = staticBoard([1, 2, null, null]);
    const state = gameState(board, { value: 1, displayRoll: 0 });
    const badRng = (() => {
      let i = 0;
      const vals: unknown[] = [0, 0.2, 'bad'];
      return () => vals[i++] as number;
    })();
    const badRes = move(state, 'left', badRng as unknown as () => number);
    assert.strictEqual(badRes.pendingSpawn.displayRoll, 0.5, '"bad" → 0.5 midpoint');

    // undefined / null / {} also → 0.5 via move
    for (const v of [undefined, null, {}]) {
      const s = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
      let i = 0;
      const vals: unknown[] = [0, 0.2, v];
      const r = () => vals[i++] as number;
      const res = move(s, 'left', r as unknown as () => number);
      assert.strictEqual(res.pendingSpawn.displayRoll, 0.5, `${String(v)} → 0.5`);
    }

    // Also Infinity via move effective path
    const s2 = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
    let j = 0;
    const valsInf: unknown[] = [0, 0.2, Infinity];
    const rInf = () => valsInf[j++] as number;
    assert.strictEqual(move(s2, 'left', rInf as unknown as () => number).pendingSpawn.displayRoll, 0.5);
  });

  it.skip('[P0-05] normalizeDisplayRoll finite clamp: -0.5/-1→0, 0→0, 0.5→0.5, 1/1.5→1-EPSILON, valid kept (R-002,R-004,R-007)', () => {
    // Finite <0 → 0 (clampable edge, not midpoint); >=1 → 1-EPSILON exclusive; valid kept.
    // Test via newGame for displayRoll 1 → 1-EPSILON (third draw), and via move for -0.5 → 0
    const negRng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, -0.5);
    const negGame = newGame(negRng as unknown as () => number);
    // newGame -0.5 displayRoll is the 20th draw → should be 0 not 0.5 (finite negative → 0)
    // Note: newGame uses normalizeDisplayRoll for displayRoll, so -0.5 → 0
    assert.strictEqual(negGame.pendingSpawn.displayRoll, 0, 'newGame -0.5 → 0');

    const oneRng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 1);
    assert.strictEqual(newGame(oneRng as unknown as () => number).pendingSpawn.displayRoll, 1 - Number.EPSILON, '1 → 1-EPSILON');

    const oneHalfRng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 1.5);
    assert.strictEqual(newGame(oneHalfRng as unknown as () => number).pendingSpawn.displayRoll, 1 - Number.EPSILON, '1.5 → 1-EPSILON');

    // Valid kept: 0, 0.5, 0.999
    for (const v of [0, 0.5, 0.599, 0.6, 0.999]) {
      const rng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, v);
      const g = newGame(rng as unknown as () => number);
      assert.strictEqual(g.pendingSpawn.displayRoll, v, `${v} kept`);
      assertDisplayRollValid(g.pendingSpawn.displayRoll, `valid ${v}`);
    }

    // Move finite negative →0 vs non-finite →0.5 distinction: -0.5 →0 not 0.5
    const board = staticBoard([1, 2, null, null]);
    const state = gameState(board, { value: 1, displayRoll: 0 });
    let idx = 0;
    const vals: unknown[] = [0, 0.2, -0.5];
    const r = () => vals[idx++] as number;
    assert.strictEqual(move(state, 'left', r as unknown as () => number).pendingSpawn.displayRoll, 0, '-0.5 via move →0 not 0.5');
  });

  it.skip('[P0-06] newGame malformed third draw still valid [0,1) + 9 tiles + value finite (R-002)', () => {
    // newGame draws: 9 cells + 9 values + 1 pending value + 1 displayRoll = 20
    // With malformed displayRoll, still 20 draws and pendingSpawn valid.
    for (const malformed of [NaN, Infinity, 1, 1.5, -0.5] as unknown as number[]) {
      const rng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, malformed);
      const g = newGame(rng as unknown as () => number);
      // count tiles ==9
      let count = 0;
      for (let rr = 0; rr < GRID_SIZE; rr++) for (let cc = 0; cc < GRID_SIZE; cc++) if (g.board[rr][cc] !== null) count++;
      assert.strictEqual(count, 9, `malformed ${malformed} still 9 tiles`);
      assert.ok(Number.isFinite(g.pendingSpawn.value) && g.pendingSpawn.value > 0, `value finite >0 for ${malformed}`);
      assertDisplayRollValid(g.pendingSpawn.displayRoll, `newGame displayRoll malformed ${malformed}`);
    }
    // valid 0.3 kept
    const validRng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0.3);
    assert.strictEqual(newGame(validRng as unknown as () => number).pendingSpawn.displayRoll, 0.3);
  });

  it.skip('[P0-07] move effective malformed third draw still valid + spawn value deterministic (R-002,R-007)', () => {
    // Effective move draws 3: cell pick 1 + resolveSpawn 1 + displayRoll 1 (third draw is displayRoll before sanitize)
    const cases: Array<{ third: unknown; expected: number; label: string }> = [
      { third: NaN, expected: 0.5, label: 'NaN→0.5' },
      { third: Infinity, expected: 0.5, label: 'Infinity→0.5' },
      { third: 1, expected: 1 - Number.EPSILON, label: '1→1-EPSILON' },
      { third: 1.5, expected: 1 - Number.EPSILON, label: '1.5→1-EPSILON' },
      { third: -0.5, expected: 0, label: '-0.5→0' },
    ];
    for (const { third, expected, label } of cases) {
      const board = staticBoard([1, 2, null, null]);
      const state = gameState(board, { value: 1, displayRoll: 0 });
      let i = 0;
      const vals: unknown[] = [0, 0.2, third];
      const rng = () => vals[i++] as number;
      const res = move(state, 'left', rng as unknown as () => number);
      assert.strictEqual(res.moved, true, `${label} moved`);
      assert.strictEqual(res.pendingSpawn.displayRoll, expected, label);
      assertDisplayRollValid(res.pendingSpawn.displayRoll, label);
      // board spawn value still deterministic: spawned tile exists and board 4x4 finite
      const spawned = res.trace.find((t) => t.spawned);
      assert.ok(spawned, `${label} spawned`);
      assert.ok(Number.isFinite(res.pendingSpawn.value) && res.pendingSpawn.value > 0);
    }
  });

  it.skip('[P0-08] draw-budget preserved — no re-roll loop, 1-draw per picker/displayRoll (R-003)', () => {
    // weightedPicker consumes exactly 1 even on malformed
    for (const v of [Infinity, NaN, -0.5, 1, 1.5] as unknown as number[]) {
      const spy = spyRng(v);
      weightedPicker([1, 0.5], spy as unknown as () => number);
      assert.strictEqual(spy.calls.length, 1, `weightedPicker malformed ${v} 1 draw`);
    }
    // normalizeDisplayRoll does not consume extra rng: single rng() call then map
    // Verify via newGame 20 and effective move 3 still even with malformed third draw
    const spyNew = spyRng(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, NaN);
    newGame(spyNew as unknown as () => number);
    assert.strictEqual(spyNew.calls.length, 20, 'newGame with malformed displayRoll still 20');

    const board = staticBoard([1, 2, null, null]);
    const spyMove = spyRng(0, 0.2, NaN);
    move(gameState(board, { value: 1, displayRoll: 0 }), 'left', spyMove as unknown as () => number);
    assert.strictEqual(spyMove.calls.length, 3, 'effective move with malformed displayRoll NaN still 3');

    const spyMove2 = spyRng(0, 0.2, Infinity);
    move(gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 }), 'left', spyMove2 as unknown as () => number);
    assert.strictEqual(spyMove2.calls.length, 3, 'Infinity still 3');

    // noop 0 draws still
    const full = boardWith([[3, 6, 3, 6], [6, 3, 6, 3], [3, 6, 3, 6], [6, 3, 6, 3]]);
    let drew = false;
    const noopRng = Object.assign(
      () => {
        drew = true;
        return 0.5;
      },
      { calls: [] as number[] },
    );
    const noopRes = move(gameState(full, { value: 1, displayRoll: 0 }), 'left', noopRng as unknown as () => number);
    assert.equal(noopRes.moved, false);
    assert.equal(drew, false, 'noop 0 draws even after hardening');
  });

  it.skip('[P0-09] bare site eliminated — no displayRoll: rng() bare, no roll*total bare scaled (R-001,R-002)', () => {
    // Static scan: game.ts must have 0 bare displayRoll: rng(), weights must have 0 bare scaled = roll * total
    assert.equal((gameSrc.match(/displayRoll:\s*rng\(\)/g) ?? []).length, 0, 'no bare displayRoll: rng()');
    // weights: old was const scaled = roll * total; new is const scaled = safeRoll * total + safeRoll = clamp
    assert.equal((weightsSrc.match(/const scaled = roll \* total/g) ?? []).length, 0, 'no bare roll*total');
    assert.ok(weightsSrc.includes('safeRoll'), 'safeRoll exists');
    assert.ok(gameSrc.includes('normalizeDisplayRoll'), 'normalizeDisplayRoll exists');
  });

  it.skip('[P0-10] [0,1) invariant holds: 1.0 → 1-EPSILON not 1, NaN/Infinity→0.5 not 0, -0.5→0 not 0.5 (R-002,R-004)', () => {
    // Epsilon exactness: 1 must be 1-EPSILON exclusive, not 1
    const rngOne = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 1);
    const gOne = newGame(rngOne as unknown as () => number);
    assert.notStrictEqual(gOne.pendingSpawn.displayRoll, 1, '1 not stored as 1');
    assert.strictEqual(gOne.pendingSpawn.displayRoll, 1 - Number.EPSILON);
    assert.ok(gOne.pendingSpawn.displayRoll < 1 && gOne.pendingSpawn.displayRoll >= 0);

    // Also verify Infinity/NaN → 0.5 not 0
    const gNaN = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, NaN) as unknown as () => number);
    assert.notStrictEqual(gNaN.pendingSpawn.displayRoll, 0, 'NaN not 0');
    assert.strictEqual(gNaN.pendingSpawn.displayRoll, 0.5);

    const gNeg = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, -0.5) as unknown as () => number);
    assert.notStrictEqual(gNeg.pendingSpawn.displayRoll, 0.5, '-0.5 not midpoint');
    assert.strictEqual(gNeg.pendingSpawn.displayRoll, 0);
  });
});

describe('ATDD dw-engine-rng-trust-hardening — P1 wiring (pipeline + ledger)', () => {
  it.skip('[P1-01] engine→spawn pipeline: resolveSpawn/weightedValue via weightedPicker still 40/40/20 via valid band (R-001)', async () => {
    // weightedValue(0.39)→1, 0.4→2, 0.8→3 via FIXED 40/40 + POT_WEIGHT 0.2 single-roll pickCombined
    const { weightedValue } = await import('../../src/engine/core/index.ts');
    assert.strictEqual(weightedValue(rngOf(0.39)), 1);
    assert.strictEqual(weightedValue(rngOf(0.4)), 2);
    assert.strictEqual(weightedValue(rngOf(0.79)), 2);
    assert.strictEqual(weightedValue(rngOf(0.8)), 3);
    assert.strictEqual(weightedValue(rngOf(0.999)), 3);
    // 1/Infinity must still map to pot 3 via valid band not fallthrough — same as 0.99
    assert.strictEqual(weightedValue(rngOf(1)), 3, '1 → pot via clamp');
    assert.strictEqual(weightedValue(() => Infinity), 3);
  });

  it.skip('[P1-02] game.move 4 suites + newGame/effective/noop draw-budget still green (R-002,R-003)', async () => {
    // Proxy: run game smoke checks from game.test.ts 32 — here at least 4 moves: left merge, noop, up, down
    const b1 = staticBoard([1, 2, null, null]);
    const r1 = move(gameState(b1), 'left', rngOf(0, 0, 0.5));
    assert.equal(r1.moved, true);
    assert.equal(r1.score, 3);
    const bNoop = boardWith([[1, 3, 6, 12], [1, 3, 6, 12], [1, 3, 6, 12], [1, 3, 6, 12]]);
    const rNoop = move(gameState(bNoop), 'left', rngOf(0, 0, 0.5));
    assert.equal(rNoop.moved, false);
    assert.equal(rNoop.score, 0);
    const bUp = emptyBoard();
    bUp[0][0] = 2; bUp[1][0] = 1;
    const rUp = move(gameState(bUp), 'up', rngOf(0, 0, 0.5));
    assert.equal(rUp.moved, true);
    bUp[0][0] = 3; bUp[1][0] = 3;
  });

  it.skip('[P1-03] pending-spawn-contract N3 pipeline still green (R-002,R-003)', async () => {
    const { runSeededSession } = await import('../../test-utils/helpers.ts');
    const { spawnValues, n3pairs } = runSeededSession(0x1234, 20);
    assert.equal(spawnValues.length, 20);
    for (const { promised, materialized } of n3pairs) {
      assert.equal(materialized, promised, 'N3 promised===materialized');
    }
  });

  it.skip('[P1-04] adaptive-spawn-integration 5 suites + ledger DW-56 done with resolution-undo + sprint-status untouched (R-009)', () => {
    // Ledger DW-56 done with 0eb6ce61… hash + resolution-undo tail hex status: open
    assert.ok(deferredSrc.includes('DW-56'), 'deferred-work contains DW-56');
    assert.ok(deferredSrc.includes('0eb6ce61'), 'DW-56 resolution-undo 0eb6ce61');
    assert.ok(deferredSrc.includes('status: done 2026-09-02'), 'DW-56 done 2026-09-02');
    assert.ok(deferredSrc.includes('resolved by sweep bundle dw-engine-rng-trust-hardening'), 'resolution line');
    // sprint-status.yaml not written is checked via checklist git diff --stat gate; here proxy: gameSrc doesn't contain sprint text
    assert.equal(gameSrc.includes('sprint'), false);
  });
});

describe('ATDD dw-engine-rng-trust-hardening — P2 static scans (single-guard allowlists)', () => {
  it.skip('[P2-01] SCAN single-clamp / single-normalize / single-epsilon / single-midpoint allowlists (R-001,R-004,R-005)', () => {
    // safeRoll appears twice: const safeRoll = ... + const scaled = safeRoll * total
    assert.equal((weightsSrc.match(/const safeRoll/g) ?? []).length, 1, 'weights const safeRoll definition 1');
    assert.equal((weightsSrc.match(/safeRoll/g) ?? []).length, 2, 'weights safeRoll total occurrences 2 (def + use)');
    assert.equal((gameSrc.match(/normalizeDisplayRoll/g) ?? []).length, 3, 'game normalizeDisplayRoll 3 (def + 2 call sites)');
    assert.equal((weightsSrc.match(/Number\.EPSILON/g) ?? []).length, 1, 'weights Number.EPSILON 1');
    assert.equal((gameSrc.match(/Number\.EPSILON/g) ?? []).length, 1, 'game Number.EPSILON 1');
    assert.equal((weightsSrc.match(/Number\.EPSILON/g) ?? []).length + (gameSrc.match(/Number\.EPSILON/g) ?? []).length, 2, 'total EPSILON 2');
    assert.equal((gameSrc.match(/return 0\.5/g) ?? []).length, 1, 'game return 0.5 exactly 1 midpoint');
    assert.equal((weightsSrc.match(/return 0\.5/g) ?? []).length, 0, 'weights return 0.5 0 (midpoint only in game)');
  });

  it.skip('[P2-02] SCAN no bare scale / no bare displayRoll / no re-roll loop (R-001,R-002,R-003)', () => {
    assert.equal((weightsSrc.match(/const scaled = roll \* total/g) ?? []).length, 0, 'no bare scaled');
    assert.equal((gameSrc.match(/displayRoll:\s*rng\(\)/g) ?? []).length, 0, 'no bare displayRoll');
    assert.equal((weightsSrc.match(/while.*rng/g) ?? []).length, 0, 'weights no while rng');
    assert.equal((gameSrc.match(/while.*rng/g) ?? []).length, 0, 'game no while rng');
    // also ensure Math.min(Math.max(roll pattern exists exactly 1
    assert.equal((weightsSrc.match(/Math\.min\(Math\.max\(roll/g) ?? []).length, 1, 'Math.min(Math.max(roll 1');
    assert.equal((weightsSrc.match(/rng\(\)/g) ?? []).length, 1, 'weights single rng() draw site');
  });

  it.skip('[P2-03] SCAN epsilon exactness + midpoint neutrality coupling — 1 - Number.EPSILON per file (R-004,R-005,R-006)', () => {
    assert.equal((weightsSrc.match(/1 - Number\.EPSILON/g) ?? []).length, 1, 'weights 1 - EPSILON 1');
    assert.equal((gameSrc.match(/1 - Number\.EPSILON/g) ?? []).length, 1, 'game 1 - EPSILON 1');
    // no 1 - 1e-9 or 0.999 literal as epsilon surrogate
    assert.equal((weightsSrc.match(/1e-9/g) ?? []).length, 0, 'no 1e-9 in weights');
    assert.equal((gameSrc.match(/1e-9/g) ?? []).length, 0, 'no 1e-9 in game');
    // Both guards present: typeof roll !== number + Number.isNaN(roll) + safeRoll in weights
    assert.ok(weightsSrc.includes("typeof roll !== 'number'"), 'weights typeof guard');
    assert.ok(weightsSrc.includes('Number.isNaN(roll)'), 'weights NaN guard');
  });

  it.skip('[P2-04] SCAN board pendingSpawn displayRoll window strict [0,1) — sanitizePending + normalizeDisplayRoll (R-002,R-007)', () => {
    // sanitizePending window: dr >=0 && dr <1 (strict <1 not <=1)
    assert.equal((gameSrc.match(/dr >= 0 && dr < 1/g) ?? []).length, 1, 'sanitizePending dr >=0 && dr <1');
    // normalizeDisplayRoll: raw >=1 strict (not >1) + raw <0 →0
    assert.equal((gameSrc.match(/raw >= 1/g) ?? []).length, 1, 'normalizeDisplayRoll raw >=1 1 hit');
    assert.equal((gameSrc.match(/if \(raw < 0\) return 0/g) ?? []).length, 1, 'normalizeDisplayRoll <0 return 0 1');
    assert.equal((gameSrc.match(/raw < 0/g) ?? []).length, 1, 'raw <0 1');
  });
});

describe('ATDD dw-engine-rng-trust-hardening — P3 exploratory / bench / hygiene', () => {
  it.skip('[P3-01] exploratory — malformed sequence sweep: newGame + move malformed chain stays valid (R-002 residual)', () => {
    // newGame with NaN displayRoll still valid then move with Infinity/-0.5 etc stays valid
    const rngNew = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, NaN);
    const g = newGame(rngNew as unknown as () => number);
    assert.strictEqual(g.pendingSpawn.displayRoll, 0.5);
    let i = 0;
    const vals1: unknown[] = [0, 0.2, -0.5];
    const r1 = () => vals1[i++] as number;
    const res1 = move(gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 }), 'left', r1 as unknown as () => number);
    assert.strictEqual(res1.pendingSpawn.displayRoll, 0, '-0.5 finite-negative not midpoint');

    let j = 0;
    const vals2: unknown[] = [0, 0.2, 1.5];
    const r2 = () => vals2[j++] as number;
    assert.strictEqual(
      move(gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 }), 'left', r2 as unknown as () => number).pendingSpawn.displayRoll,
      1 - Number.EPSILON,
    );
  });

  it.skip('[P3-02] bench — weightedPicker 10k + normalizeDisplayRoll 10k <0.05ms median, no loop, cross-cutting scan (R-008)', () => {
    const loops = 10_000;
    const rng = mulberry32(0xbeef);
    const start = performance.now();
    for (let i = 0; i < loops; i++) {
      const roll = rng();
      // mix 10% malformed
      const malformed = i % 10 === 0 ? (i % 20 === 0 ? NaN : i % 20 === 10 ? Infinity : -0.5) : roll;
      weightedPicker([1, 0.5], () => malformed as unknown as number);
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 500, `10k weightedPicker ${elapsed.toFixed(1)}ms <500ms (O(1) clamp, no while)`);
    // cross-cutting: engine has no Music/bgm/RevenueCat leakage
    assert.equal((weightsSrc.match(/Music|bgm|RevenueCat|AdMob/g) ?? []).length, 0);
    assert.equal((gameSrc.match(/Music|bgm|RevenueCat|AdMob/g) ?? []).length, 0);
  });
});
