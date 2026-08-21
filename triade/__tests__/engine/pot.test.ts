import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { weightedValue } from '../../src/engine/core/index.ts';
import { rngOf, extractSpecifiers } from '../../test-utils/helpers.ts';

// Story 2.3 (pot tierizado por teto) — activated from ATDD RED-phase scaffolds.
// Assertions pin EXPECTED behavior per the story acceptance criteria.

const FR7_LADDER: number[][] = [
  [3],
  [3, 6],
  [3, 6, 12],
  [3, 6, 12, 24],
  [3, 6, 12, 24, 48],
  [3, 6, 12, 24, 48, 96],
  [3, 6, 12, 24, 48, 96, 192],
  [3, 6, 12, 24, 48, 96, 192, 384],
];

async function coreWithPot(): Promise<typeof import('../../src/engine/core/index.ts')> {
  return import('../../src/engine/core/index.ts');
}

test('[P0] FR-7 ladder matrix pinned literally for tiers 0..7', async () => {
  const { potForTier } = await coreWithPot();
  for (let t = 0; t < FR7_LADDER.length; t++) {
    assert.deepStrictEqual(potForTier(t), FR7_LADDER[t], `tier ${t} ladder mismatch`);
  }
});

test('[P1] structural invariants hold for tiers 0..12 (>=3, doubling, length = tier + 1)', async () => {
  const { potForTier } = await coreWithPot();
  for (let t = 0; t <= 12; t++) {
    const pot = potForTier(t);
    assert.strictEqual(pot.length, t + 1, `tier ${t}: expected length ${t + 1}`);
    for (const v of pot) {
      assert.ok(v >= 3, `tier ${t}: value ${v} must be >= 3`);
    }
    for (let i = 0; i < pot.length - 1; i++) {
      assert.strictEqual(pot[i + 1], pot[i] * 2, `tier ${t}: consecutive values must double`);
    }
  }
});

test('[P0] weightedValue wiring resolves pot values by tier', async () => {
  await coreWithPot();
  assert.strictEqual(weightedValue(rngOf(0.9)), 3);
  assert.strictEqual(weightedValue(rngOf(0.9, 0.99), 1), 6);
  assert.strictEqual(weightedValue(rngOf(0.9, 0.4), 1), 3);
  assert.strictEqual(weightedValue(rngOf(0.9, 0.99), 5), 96);
  assert.strictEqual(weightedValue(rngOf(0.9, 0.0), 5), 3);
});

test('[P0] draw-count pin: tier 0 consumes one roll, tier >= 1 consumes two', async () => {
  await coreWithPot();
  let callsA = 0;
  weightedValue(() => {
    callsA++;
    return 0.9;
  });
  assert.strictEqual(callsA, 1);

  let callsB = 0;
  weightedValue(() => {
    callsB++;
    return 0.9;
  }, 1);
  assert.strictEqual(callsB, 2);
});

test('[P0] draw-count pin: tier >= 1 with roll inside the fixed band consumes one roll', async () => {
  await coreWithPot();
  let calls = 0;
  weightedValue(() => {
    calls++;
    return 0.5;
  }, 5);
  assert.strictEqual(calls, 1);
});

test('[P1] defensive guard: negative tiers clamp to tier 0, fractional tiers floor, NaN/Infinity fall back to base pot', async () => {
  const { potForTier } = await coreWithPot();
  assert.deepStrictEqual(potForTier(-1), [3]);
  assert.deepStrictEqual(potForTier(-0.5), [3]);
  assert.deepStrictEqual(potForTier(2.9), [3, 6, 12]);
  assert.deepStrictEqual(potForTier(NaN), [3]);
  assert.deepStrictEqual(potForTier(Infinity), [3]);
  assert.deepStrictEqual(potForTier(-Infinity), [3]);
});

test('[P1] resolver purity and spawnConfig keying (no scattered literals, re-exported, no UI imports)', async () => {
  const { potForTier } = await coreWithPot();
  assert.strictEqual(typeof potForTier, 'function');
  assert.deepStrictEqual(potForTier(2), potForTier(2));
  const first = potForTier(2);
  assert.notStrictEqual(potForTier(2), first, 'each call must return a fresh array');
  assert.deepStrictEqual(first, [3, 6, 12]);

  const potPath = join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/pot.ts');
  const source = readFileSync(potPath, 'utf8');
  const specifiers = extractSpecifiers(source);
  assert.ok(
    specifiers.some((s) => s.endsWith('spawnConfig.ts')),
    'pot.ts must key off spawnConfig, not scattered literals'
  );
  const forbidden = specifiers.filter((s) =>
    /react|react-native|@shopify|expo|skia/i.test(s)
  );
  assert.deepStrictEqual(forbidden, [], 'engine modules must never import RN/React/Skia/Expo');

  const indexPath = join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/index.ts');
  const indexSource = readFileSync(indexPath, 'utf8');
  assert.match(
    indexSource,
    /export\s*\{[^}]*\bpotForTier\b[^}]*\}\s*from\s*'\.\/pot\.ts'\s*;/
  );
});
