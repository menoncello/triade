import { test } from 'node:test';
import assert from 'node:assert';
import {
  FIRST_MERGE_P50_THRESHOLD_S,
  FIRST_GAMEOVER_P50_THRESHOLD_S,
  MAX_TIER_DROP,
  evaluateCalibrationGate,
} from '../../src/engine/config/calibrationGate.ts';
import { validateSpawnConfig } from '../../src/engine/config/spawnConfig.ts';

// Spec 10-6 (gate de calibracao da curva, dono: Eduardo) — I/O matrix tests
// for the pure threshold evaluator. No I/O, no telemetry fetching: summaries
// are operator-supplied dashboard values.

// A healthy baseline summary: every metric within bounds.
function healthySummary() {
  return {
    firstMergeP50Seconds: 10,
    firstGameoverP50Seconds: 120,
    maxTileMedian: 96,
  };
}

function baseline(maxTileMedianBaseline = 96) {
  return { maxTileMedianBaseline };
}

test('[P0] threshold constants pin the spec values (25s / 210s / 1-tier drop)', () => {
  assert.strictEqual(FIRST_MERGE_P50_THRESHOLD_S, 25);
  assert.strictEqual(FIRST_GAMEOVER_P50_THRESHOLD_S, 210);
  assert.strictEqual(MAX_TIER_DROP, 1);
});

test('[P0] breach first-merge p50 alone triggers retune', () => {
  const result = evaluateCalibrationGate(
    { ...healthySummary(), firstMergeP50Seconds: 26 },
    baseline()
  );
  assert.strictEqual(result.verdict, 'retune');
  assert.strictEqual(result.needsRetune, true);
  assert.deepStrictEqual(result.missing, []);
  assert.ok(result.reasons.length > 0, 'must list the triggered reason');
});

test('[P0] breach first-gameover p50 alone triggers retune', () => {
  const result = evaluateCalibrationGate(
    { ...healthySummary(), firstGameoverP50Seconds: 211 },
    baseline()
  );
  assert.strictEqual(result.verdict, 'retune');
  assert.strictEqual(result.needsRetune, true);
  assert.ok(result.reasons.length > 0, 'must list the triggered reason');
});

test('[P0] max-tile median drop of 2 tiers triggers retune (96 -> 24)', () => {
  const result = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 24 },
    baseline(96)
  );
  assert.strictEqual(result.verdict, 'retune');
  assert.strictEqual(result.needsRetune, true);
  assert.ok(result.reasons.length > 0, 'must list the triggered reason');
});

test('[P0] all metrics within bounds returns ok with empty reasons', () => {
  const result = evaluateCalibrationGate(healthySummary(), baseline());
  assert.strictEqual(result.verdict, 'ok');
  assert.strictEqual(result.needsRetune, false);
  assert.deepStrictEqual(result.reasons, []);
  assert.deepStrictEqual(result.missing, []);
});

test('[P0] missing fields return unknown with the missing list, never retune', () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ['missing firstMergeP50Seconds', { firstGameoverP50Seconds: 120, maxTileMedian: 96 }],
    ['missing firstGameoverP50Seconds', { firstMergeP50Seconds: 10, maxTileMedian: 96 }],
    ['missing maxTileMedian', { firstMergeP50Seconds: 10, firstGameoverP50Seconds: 120 }],
    ['empty summary', {}],
  ];
  for (const [label, partial] of cases) {
    const result = evaluateCalibrationGate(partial, baseline());
    assert.strictEqual(result.verdict, 'unknown', `${label}: verdict must be unknown`);
    assert.strictEqual(result.needsRetune, false, `${label}: must never recommend retune`);
    assert.ok(result.missing.length > 0, `${label}: must list missing fields`);
  }

  // Missing baseline also forces unknown.
  const noBaseline = evaluateCalibrationGate(
    healthySummary(),
    {} as { maxTileMedianBaseline: number }
  );
  assert.strictEqual(noBaseline.verdict, 'unknown');
  assert.strictEqual(noBaseline.needsRetune, false);
  assert.ok(
    noBaseline.missing.includes('maxTileMedianBaseline'),
    'must name the missing baseline field'
  );
});

test('[P1] boundary equality (== threshold) is ok, not a breach', () => {
  const result = evaluateCalibrationGate(
    {
      firstMergeP50Seconds: FIRST_MERGE_P50_THRESHOLD_S,
      firstGameoverP50Seconds: FIRST_GAMEOVER_P50_THRESHOLD_S,
      maxTileMedian: 96,
    },
    baseline(96)
  );
  assert.strictEqual(result.verdict, 'ok');
  assert.strictEqual(result.needsRetune, false);
  assert.deepStrictEqual(result.reasons, []);
});

test('[P1] tier drop of exactly 1 is ok, drop of 2 triggers', () => {
  // Ladder: 1, 2, 3, 6, 12, 24, 48, 96, 192, ... — 96 -> 48 is one tier.
  const oneTier = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 48 },
    baseline(96)
  );
  assert.strictEqual(oneTier.verdict, 'ok');
  assert.strictEqual(oneTier.needsRetune, false);

  // 96 -> 24 skips 48: two tiers, triggers.
  const twoTiers = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 24 },
    baseline(96)
  );
  assert.strictEqual(twoTiers.verdict, 'retune');
  assert.strictEqual(twoTiers.needsRetune, true);
});

test('[P1] off-ladder values resolve to the nearest lower tier', () => {
  // Baseline 100 sits on tier 96; current 50 sits on tier 48: one tier, ok.
  const result = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 50 },
    baseline(100)
  );
  assert.strictEqual(result.verdict, 'ok');
  assert.strictEqual(result.needsRetune, false);
});

test('[P1] null summary returns unknown, never throws', () => {
  const result = evaluateCalibrationGate(
    null as unknown as Parameters<typeof evaluateCalibrationGate>[0],
    baseline()
  );
  assert.strictEqual(result.verdict, 'unknown');
  assert.strictEqual(result.needsRetune, false);
  assert.ok(result.missing.length > 0, 'must list missing fields');
});

test('[P1] non-positive values count as missing, never ok', () => {
  for (const bad of [-5, 0]) {
    const r1 = evaluateCalibrationGate(
      { ...healthySummary(), firstMergeP50Seconds: bad },
      baseline()
    );
    assert.strictEqual(r1.verdict, 'unknown', `firstMerge=${bad} must be unknown`);
    assert.strictEqual(r1.needsRetune, false);
    assert.ok(r1.missing.includes('firstMergeP50Seconds'));

    const r2 = evaluateCalibrationGate(
      { ...healthySummary(), maxTileMedian: bad },
      baseline()
    );
    assert.strictEqual(r2.verdict, 'unknown', `maxTile=${bad} must be unknown`);
    assert.strictEqual(r2.needsRetune, false);
  }
});

test('[P0] invalid retune candidate is rejected via validateSpawnConfig', () => {
  // Non-2^k key breaks the curve invariant.
  const badKey = validateSpawnConfig({
    potCurve: { 3: 1, 6: 0.5, 12: 0.25, 24: 0.125, 48: 0.0625, 96: 0.03125, 7: 0.1 },
  });
  assert.strictEqual(badKey.ok, false);
  assert.ok(
    (badKey as { errors: string[] }).errors.length > 0,
    'must list violations'
  );

  // Non-strict-decrease breaks the curve invariant.
  const nonDecreasing = validateSpawnConfig({
    potCurve: { 3: 1, 6: 0.25, 12: 0.5, 24: 0.125, 48: 0.0625, 96: 0.03125 },
  });
  assert.strictEqual(nonDecreasing.ok, false);

  // Fixed-sum drift breaks the pot-share invariant.
  const sumDrift = validateSpawnConfig({
    fixedWeights: { 1: 0.45, 2: 0.4 },
  });
  assert.strictEqual(sumDrift.ok, false);

  // The shipped defaults stay accepted in the same activation.
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
});
