import { test } from 'node:test';
import assert from 'node:assert';
import {
  evaluateCalibrationGate,
  type CalibrationSummary,
} from '../../src/engine/config/calibrationGate.ts';

// Spec 10-6 (gate de calibracao da curva, dono: Eduardo) — TEA automate
// expansion beyond the canonical `calibration-gate.test.ts` (12 tests) and
// the ATDD RED scaffolds (which mirror AC1/AC2/AC4).
//
// This file covers ONLY gaps: non-finite/string/undefined inputs, the
// clog12 informational-only contract, growth (negative drop), multi-breach
// reasons, partial-signal behavior, missing[] exactness, ladder edges beyond
// 384 and below the floor, plus verdict-shape invariants. No duplication of
// the canonical I/O matrix. Deterministic numerics only — no faker (the
// gate's domain is fixed thresholds; randomness would only flake threshold
// assertions). No I/O, no telemetry fetching.

// A healthy baseline summary: every metric within bounds.
function healthySummary(): CalibrationSummary {
  return {
    firstMergeP50Seconds: 10,
    firstGameoverP50Seconds: 120,
    maxTileMedian: 96,
  };
}

function baseline(maxTileMedianBaseline = 96) {
  return { maxTileMedianBaseline };
}

test('[P1] NaN and Infinity count as missing, never retune, never throw', () => {
  // Given non-finite numerics (broken dashboard export, division by zero)
  // When the gate evaluates each in the first-merge slot
  // Then every case is unknown with the field named missing
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const result = evaluateCalibrationGate(
      { ...healthySummary(), firstMergeP50Seconds: bad },
      baseline()
    );
    assert.strictEqual(result.verdict, 'unknown', `firstMerge=${String(bad)} must be unknown`);
    assert.strictEqual(result.needsRetune, false);
    assert.ok(result.missing.includes('firstMergeP50Seconds'));
  }
});

test('[P1] string inputs from a dashboard paste count as missing, never throw', () => {
  // Given operator-pasted strings ("19") instead of numbers (R-001 paste risk)
  // When the gate evaluates
  // Then verdict is unknown — the gate never coerces, never throws
  const result = evaluateCalibrationGate(
    {
      firstMergeP50Seconds: '19' as unknown as number,
      firstGameoverP50Seconds: 120,
      maxTileMedian: 96,
    },
    baseline()
  );
  assert.strictEqual(result.verdict, 'unknown');
  assert.strictEqual(result.needsRetune, false);
  assert.ok(result.missing.includes('firstMergeP50Seconds'));
});

test('[P1] undefined summary and undefined baseline return unknown, never throw', () => {
  // Given undefined summary (nothing pasted at all)
  // When the gate evaluates
  // Then verdict is unknown with all summary fields missing
  const noSummary = evaluateCalibrationGate(
    undefined as unknown as CalibrationSummary,
    baseline()
  );
  assert.strictEqual(noSummary.verdict, 'unknown');
  assert.strictEqual(noSummary.needsRetune, false);
  assert.ok(noSummary.missing.length === 3, 'all three summary fields missing');

  // Given a healthy summary but undefined baseline
  // When the gate evaluates
  // Then verdict is unknown naming maxTileMedianBaseline
  const noBaseline = evaluateCalibrationGate(
    healthySummary(),
    undefined as unknown as { maxTileMedianBaseline: number }
  );
  assert.strictEqual(noBaseline.verdict, 'unknown');
  assert.strictEqual(noBaseline.needsRetune, false);
  assert.ok(noBaseline.missing.includes('maxTileMedianBaseline'));
});

test('[P1] clog12 is informational-only: never gates, never required', () => {
  // Given a healthy summary with an extreme clog12 ratio
  // When the gate evaluates
  // Then verdict stays ok — clog12 cannot trigger a retune
  const withClog = evaluateCalibrationGate(
    { ...healthySummary(), clog12: 999 },
    baseline()
  );
  assert.strictEqual(withClog.verdict, 'ok');
  assert.deepStrictEqual(withClog.reasons, []);

  // Given a breaching summary with clog12 present
  // When the gate evaluates
  // Then verdict is retune driven only by the breaching metric
  const breached = evaluateCalibrationGate(
    { ...healthySummary(), firstMergeP50Seconds: 30, clog12: 0.5 },
    baseline()
  );
  assert.strictEqual(breached.verdict, 'retune');
  assert.ok(
    breached.reasons.every((r) => !r.includes('clog')),
    'no reason may mention clog12'
  );
});

test('[P1] growth (current max-tile above baseline) never triggers retune', () => {
  // Given current median 192 vs baseline 96 (negative drop: players progress)
  // When the gate evaluates
  // Then verdict is ok — drop is baseline-minus-current, growth is safe
  const result = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 192 },
    baseline(96)
  );
  assert.strictEqual(result.verdict, 'ok');
  assert.strictEqual(result.needsRetune, false);
  assert.deepStrictEqual(result.reasons, []);
});

test('[P1] all three metrics breaching returns retune with one reason each', () => {
  // Given first-merge 30s + first-gameover 300s + 96 -> 24 tier drop
  // When the gate evaluates
  // Then verdict is retune with exactly three reasons
  const result = evaluateCalibrationGate(
    { firstMergeP50Seconds: 30, firstGameoverP50Seconds: 300, maxTileMedian: 24 },
    baseline(96)
  );
  assert.strictEqual(result.verdict, 'retune');
  assert.strictEqual(result.needsRetune, true);
  assert.strictEqual(result.reasons.length, 3);
});

test('[P2] partial signal: breach reported in reasons even when another field is missing', () => {
  // Given a breaching first-merge p50 but a missing first-gameover field
  // When the gate evaluates
  // Then verdict is unknown (missing blocks retune) yet reasons still show
  // the breach so the operator sees the partial signal
  const result = evaluateCalibrationGate(
    { firstMergeP50Seconds: 30, maxTileMedian: 96 },
    baseline()
  );
  assert.strictEqual(result.verdict, 'unknown');
  assert.strictEqual(result.needsRetune, false);
  assert.ok(result.missing.includes('firstGameoverP50Seconds'));
  assert.ok(
    result.reasons.some((r) => r.includes('first-merge')),
    'partial breach signal must stay visible'
  );
});

test('[P2] empty summary and baseline lists exactly the four missing fields', () => {
  // Given empty summary and empty baseline objects
  // When the gate evaluates
  // Then missing names all four fields in evaluation order
  const result = evaluateCalibrationGate(
    {},
    {} as { maxTileMedianBaseline: number }
  );
  assert.strictEqual(result.verdict, 'unknown');
  assert.deepStrictEqual(result.missing, [
    'firstMergeP50Seconds',
    'firstGameoverP50Seconds',
    'maxTileMedian',
    'maxTileMedianBaseline',
  ]);
});

test('[P2] ladder extends beyond 384: 768 -> 192 retune, 768 -> 384 ok', () => {
  // Given ladder 1,2,3,6,12,24,48,96,192,384,768 with baseline 768
  // When current is 192 (two tiers down) vs 384 (one tier down)
  // Then 192 is retune and 384 is ok
  const twoTiers = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 192 },
    baseline(768)
  );
  assert.strictEqual(twoTiers.verdict, 'retune');

  const oneTier = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 384 },
    baseline(768)
  );
  assert.strictEqual(oneTier.verdict, 'ok');
});

test('[P2] below-ladder-floor values pin to tier 0: 3 -> 1 retune, 2 -> 1 ok', () => {
  // Given baseline 3 (ladder index 2) and current 1 (floor index 0)
  // When the gate evaluates
  // Then the 2-tier drop triggers retune
  const drop2 = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 1 },
    baseline(3)
  );
  assert.strictEqual(drop2.verdict, 'retune');

  // Given baseline 2 (index 1) and current 1 (index 0): one tier
  // When the gate evaluates
  // Then verdict is ok
  const drop1 = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 1 },
    baseline(2)
  );
  assert.strictEqual(drop1.verdict, 'ok');
});

test('[P3] verdict/needsRetune/missing invariant holds across the input matrix', () => {
  // Given a deterministic matrix of summaries × baselines
  // When the gate evaluates each pair
  // Then retune ⟺ needsRetune, and unknown ⟺ missing non-empty
  const summaries: CalibrationSummary[] = [
    healthySummary(),
    { ...healthySummary(), firstMergeP50Seconds: 26 },
    { ...healthySummary(), firstGameoverP50Seconds: 211 },
    { ...healthySummary(), maxTileMedian: 24 },
    { ...healthySummary(), maxTileMedian: 192 },
    { ...healthySummary(), firstMergeP50Seconds: 25, firstGameoverP50Seconds: 210 },
    {},
    { firstMergeP50Seconds: 30, maxTileMedian: 96 },
    { ...healthySummary(), firstMergeP50Seconds: Number.NaN },
    null as unknown as CalibrationSummary,
  ];
  const baselines = [baseline(), baseline(768), {} as { maxTileMedianBaseline: number }];
  for (const summary of summaries) {
    for (const bl of baselines) {
      const r = evaluateCalibrationGate(summary, bl);
      assert.strictEqual(
        r.needsRetune,
        r.verdict === 'retune',
        `needsRetune must mirror verdict (got ${r.verdict})`
      );
      assert.strictEqual(
        r.verdict === 'unknown',
        r.missing.length > 0,
        'unknown ⟺ missing non-empty'
      );
      assert.ok(
        r.verdict === 'ok' || r.verdict === 'retune' || r.verdict === 'unknown',
        'verdict is always one of the three literals'
      );
    }
  }
});

test('[P3] garbage-input sweep never throws and always returns a shaped result', () => {
  // Given hostile operator inputs (arrays, booleans, nested objects)
  // When the gate evaluates each
  // Then no exception escapes and the result keeps its shape
  const garbage: unknown[] = [
    [],
    [1, 2, 3],
    true,
    42,
    'summary',
    { firstMergeP50Seconds: { nested: true } },
    { firstMergeP50Seconds: [10] },
    { maxTileMedianBaseline: 96 },
  ];
  for (const g of garbage) {
    assert.doesNotThrow(() => {
      const r = evaluateCalibrationGate(
        g as CalibrationSummary,
        baseline()
      );
      assert.ok(Array.isArray(r.reasons));
      assert.ok(Array.isArray(r.missing));
      assert.strictEqual(typeof r.needsRetune, 'boolean');
    });
  }
});
