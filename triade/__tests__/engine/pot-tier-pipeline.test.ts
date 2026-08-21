import { test } from 'node:test';
import assert from 'node:assert';
import {
  ceilingDetector,
  tierForCeiling,
  potForTier,
  weightedValue,
  type Board,
} from '../../src/engine/core/index.ts';
import { rngOf } from '../../test-utils/helpers.ts';

// Story 2.3 (pot tierizado por teto) — integration coverage for the full
// pipeline described in the Dev Notes: board -> ceilingDetector ->
// tierForCeiling -> potForTier -> weightedValue pot branch. Complements
// pot.test.ts (unit pins) without duplicating the spawn.test.ts sum invariant.

function boardWithMax(max: number): Board {
  const b: Board = [
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [3, max, null, null],
  ];
  return b;
}

test('[P0] pipeline: board ceiling flows through tierForCeiling into the pot branch', () => {
  const cases: Array<{ max: number; expectedPot: number[] }> = [
    { max: 24, expectedPot: [3] },
    { max: 48, expectedPot: [3, 6] },
    { max: 96, expectedPot: [3, 6, 12] },
    { max: 192, expectedPot: [3, 6, 12, 24] },
    { max: 384, expectedPot: [3, 6, 12, 24, 48] },
    { max: 768, expectedPot: [3, 6, 12, 24, 48, 96] },
  ];
  for (const { max, expectedPot } of cases) {
    const tier = tierForCeiling(ceilingDetector(boardWithMax(max)));
    assert.deepStrictEqual(potForTier(tier), expectedPot, `board max ${max}`);
    const resolved = weightedValue(rngOf(0.9, 0.999), tier);
    assert.ok(expectedPot.includes(resolved), `tier from max ${max}: ${resolved} must be a pot value`);
  }
});

test('[P1] empty and low boards resolve to tier 0 pot (backward-compatible single roll)', () => {
  const b: Board = [
    [3, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, 6],
  ];
  const tier = tierForCeiling(ceilingDetector(b));
  assert.strictEqual(tier, 0);
  let calls = 0;
  const value = weightedValue(() => {
    calls++;
    return 0.95;
  }, tier);
  assert.strictEqual(value, 3);
  assert.strictEqual(calls, 1);
});

test('[P1] defensive inputs: fractional tiers floor, negative tiers clamp to base pot', () => {
  assert.deepStrictEqual(potForTier(1.9), [3, 6]);
  assert.deepStrictEqual(potForTier(-5), [3]);
  assert.deepStrictEqual(potForTier(-0.5), [3]);
});

test('[P1] every intra-pot slot is reachable at its tier (uniform pick placeholder)', () => {
  for (const tier of [2, 5]) {
    const pot = potForTier(tier);
    const seen = new Set<number>();
    for (let i = 0; i < pot.length; i++) {
      // pickIndex uses floor(roll * len): mid-slot roll lands on index i.
      seen.add(weightedValue(rngOf(0.9, i / pot.length + 1e-6), tier));
    }
    assert.deepStrictEqual(
      [...seen].sort((a, b) => a - b),
      pot,
      `tier ${tier}: all pot values must be drawable`
    );
  }
});
