/**
 * API Gateway — dw-engine-rng-trust-hardening (DW-56)
 * Host node:test + tsx — pure weightedPicker clamp + normalizeDisplayRoll [0,1) + draw-budget gateway (no Playwright request)
 * Covers P0 critical (negative/≥1/NaN clamp + displayRoll [0,1) + draw-budget + bare-site) + P1 wiring (40/40/20 pipeline + ledger)
 * Mirrors triade/__tests__/engine/rng-trust-hardening.atdd.test.ts P0/P1 for test_artifacts compliance
 * Run: npm --prefix triade test -- _bmad-output/test-artifacts/tests/api/engine-rng-trust-hardening.gateway.spec.ts
 * With working-tree game.ts normalizeDisplayRoll + weights.ts safeRoll delta: 14 pass (~150ms). Before 2e91c12 baseline: fallthrough vs valid-band confusion / displayRoll NaN leak / bare rng() sites.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

// ── helpers ────────────────────────────────────────────────────────────
function assertDisplayRollValid(v: number, label: string) {
  assert.equal(typeof v, 'number', `${label} typeof number`);
  assert.ok(Number.isFinite(v), `${label} finite`);
  assert.ok(v >= 0 && v < 1, `${label} ∈ [0,1) got ${v}`);
}

const W: readonly number[] = [1, 0.5];
const wLast = W.length - 1;

// ── P0 critical — weightedPicker clamp vs fallthrough + displayRoll [0,1) + draw-budget + bare site ──

test('[P0-GW-01] weightedPicker negative clamp → first band 0, not NaN fallthrough (R-001)', () => {
  // Before: -0.5 → scaled -0.75 → first scaled<acc by accident. After: safeRoll = max(roll,0) →0 →scaled 0 deterministic.
  assert.strictEqual(weightedPicker(W, rngOf(-0.5)), 0, '-0.5 →0');
  assert.strictEqual(weightedPicker(W, rngOf(-1)), 0);
  assert.strictEqual(weightedPicker(W, () => -Infinity), 0, '-Infinity→0');
  assert.strictEqual(weightedPicker(W, rngOf(0)), 0, '0→0');
});

test('[P0-GW-02] weightedPicker ≥1 / Infinity clamp → last via valid band 1-EPSILON, not fallthrough (R-001)', () => {
  // Before: 1 → scaled 1.5 >=total never hits scaled<acc → fallthrough return last (invalid scaled). After: safeRoll clamp →scaled<total valid band.
  assert.strictEqual(weightedPicker(W, rngOf(1)), wLast, '1→last clamp');
  assert.strictEqual(weightedPicker(W, rngOf(1.5)), wLast);
  assert.strictEqual(weightedPicker(W, () => Infinity), wLast, 'Infinity→last');
  assert.strictEqual(weightedPicker(W, rngOf(0.99)), wLast, '0.99→last valid band');
  assert.strictEqual(weightedPicker(W, rngOf(1 - Number.EPSILON)), wLast);
});

test('[P0-GW-03] weightedPicker NaN / non-number guard still last (R-001,R-006)', () => {
  assert.strictEqual(weightedPicker(W, () => NaN), 1, 'NaN→last');
  assert.strictEqual(weightedPicker(W, () => undefined as unknown as number), 1, 'undefined→last');
  assert.strictEqual(weightedPicker(W, () => '0.5' as unknown as number), 1, '"0.5"→last');
  assert.strictEqual(weightedPicker(W, () => null as unknown as number), 1, 'null→last');
  assert.strictEqual(weightedPicker(W, () => ({} as unknown as number)), 1, 'object→last');
});

test('[P0-GW-04] normalizeDisplayRoll non-finite / non-number → 0.5 midpoint, not 0 (R-002,R-005)', () => {
  // Via newGame 20-draw third draw pins: 9 cell picks +9 values +1 pending value +1 displayRoll=20
  const mkNaN = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, NaN);
  const gNaN = newGame(mkNaN as unknown as () => number);
  assert.strictEqual(gNaN.pendingSpawn.displayRoll, 0.5, 'newGame NaN→0.5');
  assertDisplayRollValid(gNaN.pendingSpawn.displayRoll, 'NaN');

  const gInf = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, Infinity) as unknown as () => number);
  assert.strictEqual(gInf.pendingSpawn.displayRoll, 0.5, 'Infinity→0.5');

  const gNegInf = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, -Infinity) as unknown as () => number);
  assert.strictEqual(gNegInf.pendingSpawn.displayRoll, 0.5, '-Infinity→0.5 non-finite before negative branch');

  const board = staticBoard([1, 2, null, null]);
  const state = gameState(board, { value: 1, displayRoll: 0 });
  const badRng = (() => {
    let i = 0;
    const vals: unknown[] = [0, 0.2, 'bad'];
    return () => vals[i++] as number;
  })();
  assert.strictEqual(move(state, 'left', badRng as unknown as () => number).pendingSpawn.displayRoll, 0.5, '"bad"→0.5');

  for (const v of [undefined, null, {}]) {
    const s = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
    let i = 0;
    const vals: unknown[] = [0, 0.2, v];
    const r = () => vals[i++] as number;
    assert.strictEqual(move(s, 'left', r as unknown as () => number).pendingSpawn.displayRoll, 0.5, `${String(v)}→0.5`);
  }
});

test('[P0-GW-05] normalizeDisplayRoll finite clamp: -0.5/-1→0, 0→0, 0.5→0.5, 1/1.5→1-EPSILON, valid kept (R-002,R-004,R-007)', () => {
  const gNeg = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, -0.5) as unknown as () => number);
  assert.strictEqual(gNeg.pendingSpawn.displayRoll, 0, 'newGame -0.5→0');
  assert.strictEqual(
    newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 1) as unknown as () => number).pendingSpawn.displayRoll,
    1 - Number.EPSILON,
    '1→1-EPSILON',
  );
  assert.strictEqual(
    newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 1.5) as unknown as () => number).pendingSpawn.displayRoll,
    1 - Number.EPSILON,
    '1.5→1-EPSILON',
  );
  for (const v of [0, 0.5, 0.599, 0.6, 0.999]) {
    const rng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, v);
    assert.strictEqual(newGame(rng as unknown as () => number).pendingSpawn.displayRoll, v, `${v} kept`);
    assertDisplayRollValid(v, `valid ${v}`);
  }
  const board = staticBoard([1, 2, null, null]);
  const s = gameState(board, { value: 1, displayRoll: 0 });
  let idx = 0;
  const vals: unknown[] = [0, 0.2, -0.5];
  const r = () => vals[idx++] as number;
  assert.strictEqual(move(s, 'left', r as unknown as () => number).pendingSpawn.displayRoll, 0, '-0.5 via move→0 not 0.5');
});

test('[P0-GW-06] newGame malformed third draw still valid [0,1) + 9 tiles + value finite (R-002)', () => {
  for (const malformed of [NaN, Infinity, 1, 1.5, -0.5] as unknown as number[]) {
    const rng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, malformed);
    const g = newGame(rng as unknown as () => number);
    let count = 0;
    for (let rr = 0; rr < GRID_SIZE; rr++) for (let cc = 0; cc < GRID_SIZE; cc++) if (g.board[rr][cc] !== null) count++;
    assert.strictEqual(count, 9, `malformed ${malformed} still 9 tiles`);
    assert.ok(Number.isFinite(g.pendingSpawn.value) && g.pendingSpawn.value > 0, `value finite >0 for ${malformed}`);
    assertDisplayRollValid(g.pendingSpawn.displayRoll, `newGame displayRoll malformed ${malformed}`);
  }
  const validRng = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0.3);
  assert.strictEqual(newGame(validRng as unknown as () => number).pendingSpawn.displayRoll, 0.3);
});

test('[P0-GW-07] move effective malformed third draw still valid + spawn deterministic (R-002,R-007)', () => {
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
    const spawned = res.trace.find((t) => t.spawned);
    assert.ok(spawned, `${label} spawned`);
    assert.ok(Number.isFinite(res.pendingSpawn.value) && res.pendingSpawn.value > 0);
  }
});

test('[P0-GW-08] draw-budget preserved — no re-roll loop, 1-draw per picker/displayRoll (R-003)', () => {
  for (const v of [Infinity, NaN, -0.5, 1, 1.5] as unknown as number[]) {
    const spy = spyRng(v);
    weightedPicker([1, 0.5], spy as unknown as () => number);
    assert.strictEqual(spy.calls.length, 1, `weightedPicker malformed ${v} 1 draw`);
  }
  const spyNew = spyRng(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, NaN);
  newGame(spyNew as unknown as () => number);
  assert.strictEqual(spyNew.calls.length, 20, 'newGame with malformed displayRoll still 20');
  const spyMove = spyRng(0, 0.2, NaN);
  move(gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 }), 'left', spyMove as unknown as () => number);
  assert.strictEqual(spyMove.calls.length, 3, 'effective move with malformed displayRoll NaN still 3');
  const spyMove2 = spyRng(0, 0.2, Infinity);
  move(gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 }), 'left', spyMove2 as unknown as () => number);
  assert.strictEqual(spyMove2.calls.length, 3, 'Infinity still 3');
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

test('[P0-GW-09] bare site eliminated — no displayRoll: rng() bare, no roll*total bare scaled (R-001,R-002)', () => {
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  const weightsSrc = readFileSync(new URL('../../../../triade/src/engine/core/weights.ts', import.meta.url).pathname, 'utf8');
  assert.equal((gameSrc.match(/displayRoll:\s*rng\(\)/g) ?? []).length, 0, 'no bare displayRoll: rng()');
  assert.equal((weightsSrc.match(/const scaled = roll \* total/g) ?? []).length, 0, 'no bare roll*total');
  assert.ok(weightsSrc.includes('safeRoll'), 'safeRoll exists');
  assert.ok(gameSrc.includes('normalizeDisplayRoll'), 'normalizeDisplayRoll exists');
});

test('[P0-GW-10] [0,1) invariant holds: 1.0 → 1-EPSILON not 1, NaN/Infinity→0.5 not 0, -0.5→0 not 0.5 (R-002,R-004)', () => {
  const rngOne = rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 1);
  const gOne = newGame(rngOne as unknown as () => number);
  assert.notStrictEqual(gOne.pendingSpawn.displayRoll, 1, '1 not stored as 1');
  assert.strictEqual(gOne.pendingSpawn.displayRoll, 1 - Number.EPSILON);
  assert.ok(gOne.pendingSpawn.displayRoll < 1 && gOne.pendingSpawn.displayRoll >= 0);
  const gNaN = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, NaN) as unknown as () => number);
  assert.notStrictEqual(gNaN.pendingSpawn.displayRoll, 0, 'NaN not 0');
  assert.strictEqual(gNaN.pendingSpawn.displayRoll, 0.5);
  const gNeg = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, -0.5) as unknown as () => number);
  assert.notStrictEqual(gNeg.pendingSpawn.displayRoll, 0.5, '-0.5 not midpoint');
  assert.strictEqual(gNeg.pendingSpawn.displayRoll, 0);
});

// ── P1 wiring — engine→spawn pipeline + draw-budget + ledger ──

test('[P1-GW-01] engine→spawn pipeline: resolveSpawn/weightedValue via weightedPicker still 40/40/20 via valid band (R-001)', async () => {
  const { weightedValue } = await import('../../../../triade/src/engine/core/index.ts');
  assert.strictEqual(weightedValue(rngOf(0.39)), 1);
  assert.strictEqual(weightedValue(rngOf(0.4)), 2);
  assert.strictEqual(weightedValue(rngOf(0.79)), 2);
  assert.strictEqual(weightedValue(rngOf(0.8)), 3);
  assert.strictEqual(weightedValue(rngOf(0.999)), 3);
  assert.strictEqual(weightedValue(rngOf(1)), 3, '1 → pot via clamp');
  assert.strictEqual(weightedValue(() => Infinity), 3);
});

test('[P1-GW-02] game.move 4 suites + newGame/effective/noop draw-budget still green (R-002,R-003)', async () => {
  const b1 = staticBoard([1, 2, null, null]);
  const r1 = move(gameState(b1), 'left', rngOf(0, 0, 0.5));
  assert.equal(r1.moved, true);
  assert.equal(r1.score, 3);
  const bNoop = boardWith([[1, 3, 6, 12], [1, 3, 6, 12], [1, 3, 6, 12], [1, 3, 6, 12]]);
  const rNoop = move(gameState(bNoop), 'left', rngOf(0, 0, 0.5));
  assert.equal(rNoop.moved, false);
  assert.equal(rNoop.score, 0);
});

test('[P1-GW-03] pending-spawn-contract N3 pipeline still green (R-002,R-003)', async () => {
  const { runSeededSession } = await import('../../../../triade/test-utils/helpers.ts');
  const { spawnValues, n3pairs } = runSeededSession(0x1234, 20);
  assert.equal(spawnValues.length, 20);
  for (const { promised, materialized } of n3pairs) {
    assert.equal(materialized, promised, 'N3 promised===materialized');
  }
});

test('[P1-GW-04] adaptive-spawn-integration 5 suites + ledger DW-56 done with resolution-undo + sprint-status untouched (R-009)', () => {
  const deferredSrc = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  assert.ok(deferredSrc.includes('DW-56'), 'deferred-work contains DW-56');
  assert.ok(deferredSrc.includes('0eb6ce61'), 'DW-56 resolution-undo 0eb6ce61');
  assert.ok(deferredSrc.includes('status: done 2026-09-02'), 'DW-56 done 2026-09-02');
  assert.ok(deferredSrc.includes('resolved by sweep bundle dw-engine-rng-trust-hardening'), 'resolution line');
  assert.equal(gameSrc.includes('sprint'), false);
});
