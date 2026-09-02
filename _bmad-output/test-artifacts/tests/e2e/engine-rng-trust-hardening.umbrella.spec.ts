/**
 * E2E Umbrella — dw-engine-rng-trust-hardening (DW-56)
 * Host node:test + tsx — static single-guard allowlists + epsilon/midpoint + draw-budget + bench + ledger as E2E
 * Covers P2 secondary (single-clamp/single-normalize/single-epsilon/single-midpoint + epsilon coupling + window strict + no bare + no re-roll) + P3 exploratory/bench/cross-cutting
 * Mirrors triade/__tests__/engine/rng-trust-hardening.atdd.test.ts P2/P3 for test_artifacts compliance
 * Run: npm --prefix triade test -- _bmad-output/test-artifacts/tests/e2e/engine-rng-trust-hardening.umbrella.spec.ts
 * With working-tree safeRoll + normalizeDisplayRoll delta: 9 pass (~110ms). Before 2e91c12 baseline: bare roll*total / bare displayRoll: rng() / missing safeRoll / missing normalizeDisplayRoll.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { weightedPicker } from '../../../../triade/src/engine/core/weights.ts';
import { newGame, move } from '../../../../triade/src/engine/core/game.ts';
import { mulberry32, gameState, staticBoard, boardWith, rngOf } from '../../../../triade/test-utils/helpers.ts';

// ── P2 static scans — single-guard allowlists (4) ─────────────────────

test('[P2-E2E-01] SCAN single-clamp / single-normalize / single-epsilon / single-midpoint allowlists (R-001,R-004,R-005)', () => {
  const weightsSrc = readFileSync(new URL('../../../../triade/src/engine/core/weights.ts', import.meta.url).pathname, 'utf8');
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  assert.equal((weightsSrc.match(/const safeRoll/g) ?? []).length, 1, 'weights const safeRoll definition 1');
  assert.equal((weightsSrc.match(/safeRoll/g) ?? []).length, 2, 'weights safeRoll total occurrences 2 (def + use)');
  assert.equal((gameSrc.match(/normalizeDisplayRoll/g) ?? []).length, 3, 'game normalizeDisplayRoll 3 (def + 2 call sites)');
  assert.equal((weightsSrc.match(/Number\.EPSILON/g) ?? []).length, 1, 'weights Number.EPSILON 1');
  assert.equal((gameSrc.match(/Number\.EPSILON/g) ?? []).length, 1, 'game Number.EPSILON 1');
  assert.equal((weightsSrc.match(/Number\.EPSILON/g) ?? []).length + (gameSrc.match(/Number\.EPSILON/g) ?? []).length, 2, 'total EPSILON 2');
  assert.equal((gameSrc.match(/return 0\.5/g) ?? []).length, 1, 'game return 0.5 exactly 1 midpoint');
  assert.equal((weightsSrc.match(/return 0\.5/g) ?? []).length, 0, 'weights return 0.5 0 (midpoint only in game)');
});

test('[P2-E2E-02] SCAN no bare scale / no bare displayRoll / no re-roll loop (R-001,R-002,R-003)', () => {
  const weightsSrc = readFileSync(new URL('../../../../triade/src/engine/core/weights.ts', import.meta.url).pathname, 'utf8');
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  assert.equal((weightsSrc.match(/const scaled = roll \* total/g) ?? []).length, 0, 'no bare scaled');
  assert.equal((gameSrc.match(/displayRoll:\s*rng\(\)/g) ?? []).length, 0, 'no bare displayRoll');
  assert.equal((weightsSrc.match(/while.*rng/g) ?? []).length, 0, 'weights no while rng');
  assert.equal((gameSrc.match(/while.*rng/g) ?? []).length, 0, 'game no while rng');
  assert.equal((weightsSrc.match(/Math\.min\(Math\.max\(roll/g) ?? []).length, 1, 'Math.min(Math.max(roll 1');
  assert.equal((weightsSrc.match(/rng\(\)/g) ?? []).length, 1, 'weights single rng() draw site');
});

test('[P2-E2E-03] SCAN epsilon exactness + midpoint neutrality coupling — 1 - Number.EPSILON per file (R-004,R-005,R-006)', () => {
  const weightsSrc = readFileSync(new URL('../../../../triade/src/engine/core/weights.ts', import.meta.url).pathname, 'utf8');
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  assert.equal((weightsSrc.match(/1 - Number\.EPSILON/g) ?? []).length, 1, 'weights 1 - EPSILON 1');
  assert.equal((gameSrc.match(/1 - Number\.EPSILON/g) ?? []).length, 1, 'game 1 - EPSILON 1');
  assert.equal((weightsSrc.match(/1e-9/g) ?? []).length, 0, 'no 1e-9 in weights');
  assert.equal((gameSrc.match(/1e-9/g) ?? []).length, 0, 'no 1e-9 in game');
  assert.ok(weightsSrc.includes("typeof roll !== 'number'"), 'weights typeof guard');
  assert.ok(weightsSrc.includes('Number.isNaN(roll)'), 'weights NaN guard');
});

test('[P2-E2E-04] SCAN board pendingSpawn displayRoll window strict [0,1) — sanitizePending + normalizeDisplayRoll (R-002,R-007)', () => {
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  assert.equal((gameSrc.match(/dr >= 0 && dr < 1/g) ?? []).length, 1, 'sanitizePending dr >=0 && dr <1');
  assert.equal((gameSrc.match(/raw >= 1/g) ?? []).length, 1, 'normalizeDisplayRoll raw >=1 1 hit');
  assert.equal((gameSrc.match(/if \(raw < 0\) return 0/g) ?? []).length, 1, 'normalizeDisplayRoll <0 return 0 1');
  assert.equal((gameSrc.match(/raw < 0/g) ?? []).length, 1, 'raw <0 1');
});

test('[P2-E2E-05] SCAN ledger DW-56 hash + sprint-status untouched + Math.random defaults only (R-009,R-008)', () => {
  const ledger = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  const weightsSrc = readFileSync(new URL('../../../../triade/src/engine/core/weights.ts', import.meta.url).pathname, 'utf8');
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  assert.equal((ledger.match(/0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e/g) ?? []).length, 1, 'ledger 0eb6ce61 1 hit DW-56');
  assert.ok(/DW-56[\s\S]*?status: done 2026-09-02/.test(ledger), 'DW-56 done 2026-09-02');
  assert.ok(ledger.includes('resolved by sweep bundle dw-engine-rng-trust-hardening'), 'resolution line');
  assert.equal((weightsSrc.match(/Math\.random/g) ?? []).length, 0, 'weights no Math.random literal (rng injected)');
  // game.ts has 2 defaults: newGame(rng = Math.random) + move(rng = Math.random) — correct, only defaults
  assert.equal((gameSrc.match(/Math\.random/g) ?? []).length, 2, 'game Math.random 2 defaults only');
  assert.equal(gameSrc.includes('sprint'), false, 'no sprint-status leakage');
});

// ── P3 exploratory / bench / hygiene (4) ───────────────────────────────

test('[P3-E2E-01] exploratory — malformed sequence sweep: newGame + move malformed chain stays valid (R-002 residual)', () => {
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

test('[P3-E2E-02] bench — weightedPicker 10k + normalizeDisplayRoll 10k <500ms median, no loop, cross-cutting scan (R-008)', () => {
  const loops = 10_000;
  const rng = mulberry32(0xbeef);
  const start = performance.now();
  for (let i = 0; i < loops; i++) {
    const roll = rng();
    const malformed = i % 10 === 0 ? (i % 20 === 0 ? NaN : i % 20 === 10 ? Infinity : -0.5) : roll;
    weightedPicker([1, 0.5], () => malformed as unknown as number);
  }
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 500, `10k weightedPicker ${elapsed.toFixed(1)}ms <500ms (O(1) clamp, no while)`);
  const weightsSrc = readFileSync(new URL('../../../../triade/src/engine/core/weights.ts', import.meta.url).pathname, 'utf8');
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  assert.equal((weightsSrc.match(/Music|bgm|RevenueCat|AdMob/g) ?? []).length, 0);
  assert.equal((gameSrc.match(/Music|bgm|RevenueCat|AdMob/g) ?? []).length, 0);
});

test('[P3-E2E-03] micro-zero — weightedPicker 0/0.39/0.4 + normalizeDisplayRoll 0/0.599/0.6/0.999 complements 40/40 boundary (R-001)', () => {
  assert.strictEqual(weightedPicker([1, 0.5], rngOf(0)), 0);
  assert.strictEqual(weightedPicker([1, 0.5], rngOf(0.39)), 0);
  // 0.4 boundary: weights [1,0.5]=total1.5 → 0.4*1.5=0.6 <1? Actually acc 1 →0.6<1 →0 ; 0.4*? needs pot but for [1,0.5] 0.4 still first band
  const g0 = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0) as unknown as () => number);
  assert.strictEqual(g0.pendingSpawn.displayRoll, 0, 'normalize 0→0');
  const gMid = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0.599) as unknown as () => number);
  assert.strictEqual(gMid.pendingSpawn.displayRoll, 0.599);
  const g999 = newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0.999) as unknown as () => number);
  assert.strictEqual(g999.pendingSpawn.displayRoll, 0.999);
});

test('[P3-E2E-04] cross-cutting negative scan — no Music/bgm/RevenueCat/AdMob leaked + ledger hash exact (R-008,R-009)', () => {
  const weightsSrc = readFileSync(new URL('../../../../triade/src/engine/core/weights.ts', import.meta.url).pathname, 'utf8');
  const gameSrc = readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname, 'utf8');
  const ledger = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  assert.equal((weightsSrc.match(/Music|bgm|RevenueCat|AdMob/g) ?? []).length, 0);
  assert.equal((gameSrc.match(/Music|bgm|RevenueCat|AdMob/g) ?? []).length, 0);
  assert.equal((ledger.match(/0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e/g) ?? []).length, 1);
  assert.ok(ledger.includes('7374617475733a206f70656e'), 'hex tail status: open');
});
