// RED-phase scaffold — spec 10-6, gate de calibracao da curva (dono: Eduardo).
//
// Verdict-matrix acceptance tests for the pure threshold evaluator
// `evaluateCalibrationGate(summary, baseline)` in
// `triade/src/engine/config/calibrationGate.ts`.
//
// TDD RED PHASE: every test is `test.skip()`. Activation = remove `.skip`
// for the current task and confirm RED before implementing:
//   - Pre-implementation (baseline 272efcd): module does not exist, so the
//     static import below throws on load -> the whole file FAILS (RED).
//   - Post-implementation (rev 20b91aa): all tests PASS (GREEN, 12/12 in the
//     canonical suite `triade/__tests__/engine/calibration-gate.test.ts`).
//
// Given-When-Then is written in comments; one assertion per test (atomic).
import { test } from 'node:test';
import assert from 'node:assert';
import {
  evaluateCalibrationGate,
  FIRST_MERGE_P50_THRESHOLD_S,
  FIRST_GAMEOVER_P50_THRESHOLD_S,
  MAX_TIER_DROP,
} from '../../../triade/src/engine/config/calibrationGate.ts';
import {
  healthySummary,
  baseline96,
} from './calibration-summary.factory.ts';

// AC1 — Given telemetry summary + playtest baseline, when the gate runs,
// then needsRetune is true exactly when a threshold breaches.

test.skip('[P0] AC1a — breach first-merge p50 alone triggers retune', () => {
  // Given a healthy summary with first-merge p50 one second over the limit
  // When the gate evaluates
  // Then verdict is retune with the reason listed and nothing missing
  const result = evaluateCalibrationGate(
    { ...healthySummary(), firstMergeP50Seconds: 26 },
    baseline96()
  );
  assert.strictEqual(result.verdict, 'retune');
});

test.skip('[P0] AC1b — breach first-gameover p50 alone triggers retune', () => {
  // Given a healthy summary with first-gameover p50 one second over the limit
  // When the gate evaluates
  // Then verdict is retune with the reason listed
  const result = evaluateCalibrationGate(
    { ...healthySummary(), firstGameoverP50Seconds: 211 },
    baseline96()
  );
  assert.strictEqual(result.verdict, 'retune');
});

test.skip('[P0] AC1c — max-tile median drop of 2 tiers triggers retune (96 -> 24)', () => {
  // Given baseline 96 and current median 24 (skips tier 48: two tiers)
  // When the gate evaluates
  // Then verdict is retune with the tier-drop reason listed
  const result = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 24 },
    baseline96()
  );
  assert.strictEqual(result.verdict, 'retune');
});

test.skip('[P0] AC1d — all metrics within bounds returns ok with empty reasons', () => {
  // Given every metric within bounds
  // When the gate evaluates
  // Then verdict is ok, needsRetune false, reasons and missing empty
  const result = evaluateCalibrationGate(healthySummary(), baseline96());
  assert.strictEqual(result.verdict, 'ok');
});

test.skip('[P0] threshold constants pin the spec values (25s / 210s / 1-tier drop)', () => {
  // Given the spec thresholds
  // When the constants are read
  // Then they equal 25 / 210 / 1 (guards silent spec drift)
  assert.strictEqual(FIRST_MERGE_P50_THRESHOLD_S, 25);
  assert.strictEqual(FIRST_GAMEOVER_P50_THRESHOLD_S, 210);
  assert.strictEqual(MAX_TIER_DROP, 1);
});

// AC4 — Given no telemetry summaries are available, when the gate is invoked,
// then verdict is unknown with missing-fields listed and no retune.

test.skip('[P0] AC4a — missing fields return unknown, never retune', () => {
  // Given a summary missing firstMergeP50Seconds
  // When the gate evaluates
  // Then verdict is unknown, needsRetune false, missing names the field
  const result = evaluateCalibrationGate(
    { firstGameoverP50Seconds: 120, maxTileMedian: 96 },
    baseline96()
  );
  assert.strictEqual(result.verdict, 'unknown');
});

test.skip('[P0] AC4b — missing baseline forces unknown', () => {
  // Given a healthy summary but an empty baseline
  // When the gate evaluates
  // Then verdict is unknown and missing names maxTileMedianBaseline
  const result = evaluateCalibrationGate(
    healthySummary(),
    {} as { maxTileMedianBaseline: number }
  );
  assert.strictEqual(result.verdict, 'unknown');
});

// P1 boundaries — equality is ok, ladder semantics, defensive inputs.

test.skip('[P1] boundary equality (== threshold) is ok, not a breach', () => {
  // Given metrics exactly equal to each threshold
  // When the gate evaluates
  // Then verdict is ok (strict-greater-than semantics)
  const result = evaluateCalibrationGate(
    {
      firstMergeP50Seconds: FIRST_MERGE_P50_THRESHOLD_S,
      firstGameoverP50Seconds: FIRST_GAMEOVER_P50_THRESHOLD_S,
      maxTileMedian: 96,
    },
    baseline96()
  );
  assert.strictEqual(result.verdict, 'ok');
});

test.skip('[P1] tier drop of exactly 1 is ok, drop of 2 triggers', () => {
  // Given ladder 1,2,3,6,12,24,48,96,... with baseline 96
  // When current is 48 (one tier) vs 24 (two tiers)
  // Then 48 is ok and 24 is retune
  const oneTier = evaluateCalibrationGate(
    { ...healthySummary(), maxTileMedian: 48 },
    baseline96()
  );
  assert.strictEqual(oneTier.verdict, 'ok');
});

test.skip('[P1] null summary returns unknown, never throws', () => {
  // Given a null summary (operator pasted nothing)
  // When the gate evaluates
  // Then verdict is unknown and no exception escapes
  const result = evaluateCalibrationGate(
    null as unknown as Parameters<typeof evaluateCalibrationGate>[0],
    baseline96()
  );
  assert.strictEqual(result.verdict, 'unknown');
});
