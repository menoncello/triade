import { test } from 'node:test';
import assert from 'node:assert';
import { FIXED_WEIGHTS, POT_WEIGHT, weightedValue } from '../../src/engine/core/index.ts';
import { mulberry32, rngOf } from '../../test-utils/helpers.ts';

test('FIXED_WEIGHTS are pinned at 40% each (never change invariant)', () => {
  assert.strictEqual(FIXED_WEIGHTS[1], 0.4);
  assert.strictEqual(FIXED_WEIGHTS[2], 0.4);
});

test('distribution sum is 1.0 within epsilon (coupling invariant)', () => {
  const sum = FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2] + POT_WEIGHT;
  assert.ok(Math.abs(sum - 1.0) < 1e-9, `expected sum ~1.0, got ${sum}`);
});

test('the pot band equals the top (1 - POT_WEIGHT) of the roll', () => {
  const potBand = FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2];
  assert.ok(Math.abs(potBand - (1 - POT_WEIGHT)) < 1e-9);
});

test('weightedValue resolves the pot value for the top band', () => {
  assert.strictEqual(weightedValue(rngOf(0.99)), 3);
});

test('statistical sampling: weightedValue frequencies match 40/40/20 within ±2% (drift tripwire)', () => {
  const rng = mulberry32(0x5eed);
  const N = 10000;
  let ones = 0;
  let twos = 0;
  let pots = 0;
  for (let i = 0; i < N; i++) {
    const v = weightedValue(rng);
    if (v === 1) ones++;
    else if (v === 2) twos++;
    else pots++;
  }
  const tol = 0.02;
  assert.ok(Math.abs(ones / N - FIXED_WEIGHTS[1]) < tol, `expected ~40% ones, got ${(ones / N).toFixed(4)}`);
  assert.ok(Math.abs(twos / N - FIXED_WEIGHTS[2]) < tol, `expected ~40% twos, got ${(twos / N).toFixed(4)}`);
  assert.ok(Math.abs(pots / N - POT_WEIGHT) < tol, `expected ~20% pot, got ${(pots / N).toFixed(4)}`);
});
