import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  POT_WEIGHT,
  potWeights,
  normalizeTo,
  weightedPicker,
  potForTier,
  weightedValue,
} from '../../src/engine/core/index.ts';
import { mulberry32, rngOf, extractSpecifiers } from '../../test-utils/helpers.ts';

// Story 2.4 (curva halving-decay normalizada) — acceptance tests for the
// halving-decay curve, normalization, and weighted picker (weights.ts).
// Assertions pin EXPECTED behavior per the story acceptance criteria.

// 3/v = 2^-i for the FR-7 ladder: 3→1, 6→1/2, 12→1/4, 24→1/8, 48→1/16, 96→1/32.
const FR8_HALVING = [1, 0.5, 0.25, 0.125, 0.0625, 0.03125];

test('[P0] potWeights literal halving matrix equals FR-8 exactly (AC 1)', () => {
  assert.deepStrictEqual(potWeights([3, 6, 12, 24, 48, 96]), FR8_HALVING);
  assert.deepStrictEqual(potWeights([3]), [1]);
  assert.deepStrictEqual(potWeights([3, 6]), [1, 0.5]);
});

test('[P0] normalizeTo(POT_WEIGHT, potWeights(pot)) sums to 0.2 within 1e-9 for pot lengths 1..6 (AC 2)', () => {
  for (let t = 0; t < 6; t++) {
    const pot = potForTier(t);
    const normalized = normalizeTo(POT_WEIGHT, potWeights(pot));
    const sum = normalized.reduce((a, b) => a + b, 0);
    assert.ok(
      Math.abs(sum - POT_WEIGHT) < 1e-9,
      `tier ${t} pot (${pot.join(',')}): expected sum ${POT_WEIGHT}, got ${sum}`
    );
  }
});

test('[P0] normalizeTo returns a fresh array and never mutates input (AC 2)', () => {
  const input = potWeights([3, 6, 12]);
  const snapshot = input.slice();
  const normalized = normalizeTo(POT_WEIGHT, input);
  assert.notStrictEqual(normalized, input, 'must return a new array');
  assert.deepStrictEqual(input, snapshot, 'input must be untouched');
});

test('[P1] defensive guard: normalizeTo returns all-zero weights for non-positive totals (N1)', () => {
  assert.deepStrictEqual(normalizeTo(POT_WEIGHT, [0, 0]), [0, 0]);
  assert.deepStrictEqual(normalizeTo(POT_WEIGHT, []), []);
  assert.deepStrictEqual(normalizeTo(POT_WEIGHT, [-1, 1]), [0, 0]);
});

test('[P1] normalized weights are strictly decreasing and halve per step, tiers 1..8 (AC 3)', () => {
  for (let t = 1; t <= 8; t++) {
    const weights = normalizeTo(POT_WEIGHT, potWeights(potForTier(t)));
    for (let i = 0; i < weights.length - 1; i++) {
      assert.ok(
        weights[i + 1] < weights[i],
        `tier ${t}: w[${i + 1}] must be strictly less than w[${i}]`
      );
      assert.ok(
        Math.abs(weights[i + 1] - weights[i] / 2) < 1e-9,
        `tier ${t}: w[${i + 1}] must be ~half of w[${i}]`
      );
    }
  }
});

test('[P0] weightedPicker re-normalizes: [1,0.5] and [2/3,1/3] select index 0 with the same probability (AC 4, N1)', () => {
  const N = 100000;
  const rngA = mulberry32(0xc0ffee);
  const rngB = mulberry32(0xc0ffee);
  let zerosA = 0;
  let zerosB = 0;
  for (let i = 0; i < N; i++) {
    if (weightedPicker([1, 0.5], rngA) === 0) zerosA++;
    if (weightedPicker([2 / 3, 1 / 3], rngB) === 0) zerosB++;
  }
  const freqA = zerosA / N;
  const freqB = zerosB / N;
  assert.ok(Math.abs(freqA - freqB) < 0.01, `expected equal distributions, got ${freqA} vs ${freqB}`);
  assert.ok(Math.abs(freqA - 2 / 3) < 0.01, `expected ~66.7% index 0, got ${freqA}`);
});

test('[P0] weightedPicker boundary rolls: 2/3+1e-6 → index 1, 2/3-1e-6 → index 0, 0.99 → last index (AC 4)', () => {
  for (const weights of [[1, 0.5], [2 / 3, 1 / 3]]) {
    assert.strictEqual(weightedPicker(weights, rngOf(2 / 3 + 1e-6)), 1);
    assert.strictEqual(weightedPicker(weights, rngOf(2 / 3 - 1e-6)), 0);
    assert.strictEqual(weightedPicker(weights, rngOf(0.99)), weights.length - 1);
  }
});

test('[P0] weightedPicker consumes exactly one rng draw per call, including pot length 1 edge (RNG contract)', () => {
  for (const weights of [[1, 0.5, 0.25], [1]]) {
    let calls = 0;
    weightedPicker(weights, () => {
      calls++;
      return 0.9;
    });
    assert.strictEqual(calls, 1, `weights [${weights.join(',')}]: expected exactly one draw`);
  }
});

test('[P1] defensive guard: weightedPicker returns the last index (never undefined) for non-positive totals and non-finite rolls (N1)', () => {
  assert.strictEqual(weightedPicker([0, 0], rngOf(0.9)), 1);
  assert.strictEqual(weightedPicker([1, 1], () => NaN), 1);
  assert.strictEqual(weightedPicker([1, 1], () => undefined as unknown as number), 1);
  assert.strictEqual(weightedPicker([], rngOf(0.9)), 0);
});

test('[P1] statistical sampling: within-pot frequencies match halving-decay ratios ±1% absolute AND ±10% relative (AC 5)', () => {
  const N = 100000;
  // Expected within-pot ratios (derived from the normalized halving-decay weights,
  // never hardcoded so they cannot go stale): tier 1 → 3≈0.6667, 6≈0.3333;
  // tier 5 → 3≈0.5079, 6≈0.2540, 12≈0.1270, 24≈0.0635, 48≈0.0317, 96≈0.0159.
  for (const tier of [1, 5]) {
    const pot = potForTier(tier);
    const weights = normalizeTo(POT_WEIGHT, potWeights(pot));
    const ratios = new Map<number, number>();
    for (let i = 0; i < pot.length; i++) ratios.set(pot[i], weights[i] / POT_WEIGHT);
    // Story 2.6 combined single-roll pick: one draw per weightedValue call.
    // Filter to pot values (>= 3) and compare each pot value's CONDITIONAL
    // frequency to its within-pot ratio — identical under the combined pick
    // because the pot sub-distribution is normalized to POT_WEIGHT.
    const rng = mulberry32(0x2a4d);
    const freqs = new Map<number, number>();
    for (const v of pot) freqs.set(v, 0);
    let potSamples = 0;
    for (let i = 0; i < N; i++) {
      const v = weightedValue(rng, tier);
      if (v >= 3) {
        assert.ok(freqs.has(v), `tier ${tier}: value ${v} must be an open pot value`);
        freqs.set(v, (freqs.get(v) as number) + 1);
        potSamples++;
      }
    }
    assert.ok(potSamples > N * 0.1, `tier ${tier}: pot band must be sampled (${potSamples} samples)`);
    for (const v of pot) {
      const freq = (freqs.get(v) as number) / potSamples;
      const ratio = ratios.get(v) as number;
      // Absolute floor keeps the high-frequency slots tight; the relative band
      // constrains the tail slots (e.g. 96 ≈ 0.0159) where ±1% absolute alone has
      // no discriminating power (0% or 2.5% would both pass).
      assert.ok(
        Math.abs(freq - ratio) < 0.01 && Math.abs(freq / ratio - 1) < 0.1,
        `tier ${tier} value ${v}: expected |${freq.toFixed(4)} - ${ratio.toFixed(4)}| < 0.01 and |freq/ratio - 1| < 0.1, got rel ${(Math.abs(freq / ratio - 1) * 100).toFixed(2)}%`
      );
    }
  }
});

test('[P1] weights.ts purity: keys off spawnConfig, re-exported via core/index.ts, no UI imports (AC 1, 3)', () => {
  assert.strictEqual(typeof potWeights, 'function');

  const weightsPath = join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/weights.ts');
  const source = readFileSync(weightsPath, 'utf8');
  const specifiers = extractSpecifiers(source);
  assert.ok(
    specifiers.some((s) => s.endsWith('spawnConfig.ts')),
    'weights.ts must key off spawnConfig, not scattered literals'
  );
  const forbidden = specifiers.filter((s) => /react|react-native|@shopify|expo|skia/i.test(s));
  assert.deepStrictEqual(forbidden, [], 'engine modules must never import RN/React/Skia/Expo');

  const indexPath = join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/index.ts');
  const indexSource = readFileSync(indexPath, 'utf8');
  const weightsExport = indexSource.match(/export\s*\{([\s\S]*?)\}\s*from\s*'\.\/weights\.ts'\s*;/);
  assert.ok(weightsExport, 'core/index.ts must re-export from ./weights.ts');
  for (const name of ['potWeights', 'normalizeTo', 'weightedPicker']) {
    assert.ok(
      new RegExp(`\\b${name}\\b`).test(weightsExport[1]),
      `core/index.ts weights.ts export must include ${name}`
    );
  }
});