// RED-phase scaffold — spec 10-6, gate de calibracao da curva (dono: Eduardo).
//
// Retune-candidate rejection acceptance tests: a candidate curve that breaks
// pot share / strict decrease / 2^k keys / fixed-sum invariants must be
// rejected by `validateSpawnConfig` (which is what makes CI fail closed).
//
// TDD RED PHASE: every test is `test.skip()`. Pre-implementation the
// `calibrationGate.ts` import below throws (module absent at baseline
// 272efcd) -> whole file FAILS (RED). Post-implementation all PASS (GREEN).
//
// Given-When-Then in comments; one assertion per test (atomic).
import { test } from 'node:test';
import assert from 'node:assert';
import { validateSpawnConfig } from '../../../triade/src/engine/config/spawnConfig.ts';

// AC2 — Given a candidate retune, when curve invariants break,
// then validation rejects (and CI fails).

test.skip('[P0] AC2a — non-2^k key breaks the curve invariant', () => {
  // Given a candidate POT_CURVE containing key 7 (not 3 * 2^k)
  // When validateSpawnConfig runs
  // Then the candidate is rejected with listed violations
  const badKey = validateSpawnConfig({
    potCurve: { 3: 1, 6: 0.5, 12: 0.25, 24: 0.125, 48: 0.0625, 96: 0.03125, 7: 0.1 },
  });
  assert.strictEqual(badKey.ok, false);
});

test.skip('[P0] AC2b — non-strict-decrease breaks the curve invariant', () => {
  // Given a candidate where weight(12) > weight(6)
  // When validateSpawnConfig runs
  // Then the candidate is rejected
  const nonDecreasing = validateSpawnConfig({
    potCurve: { 3: 1, 6: 0.25, 12: 0.5, 24: 0.125, 48: 0.0625, 96: 0.03125 },
  });
  assert.strictEqual(nonDecreasing.ok, false);
});

test.skip('[P0] AC2c — fixed-sum drift breaks the pot-share invariant', () => {
  // Given a candidate where FIXED weights sum to 0.85 instead of 0.8
  // When validateSpawnConfig runs
  // Then the candidate is rejected
  const sumDrift = validateSpawnConfig({
    fixedWeights: { 1: 0.45, 2: 0.4 },
  });
  assert.strictEqual(sumDrift.ok, false);
});

test.skip('[P0] AC2d — shipped defaults stay accepted in the same activation', () => {
  // Given the shipped spawnConfig defaults (no overrides)
  // When validateSpawnConfig runs
  // Then the result is ok (guards over-strict validator locking the release)
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
});

test.skip('[P1] non-positive gate inputs count as missing, never ok', async () => {
  // Given a dynamic import of the gate (proves the module resolves) plus a
  // non-positive first-merge p50
  // When the gate evaluates
  // Then verdict is unknown and missing names the field
  const { evaluateCalibrationGate } = await import(
    '../../../triade/src/engine/config/calibrationGate.ts'
  );
  const result = evaluateCalibrationGate(
    { firstMergeP50Seconds: 0, firstGameoverP50Seconds: 120, maxTileMedian: 96 },
    { maxTileMedianBaseline: 96 }
  );
  assert.strictEqual(result.verdict, 'unknown');
});
