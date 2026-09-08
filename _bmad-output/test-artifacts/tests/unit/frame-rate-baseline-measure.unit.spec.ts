/**
 * Unit — dw-frame-rate-baseline-measure (RED-PHASE, test.skip)
 * Host node:test — normative math via the RN-free fixture replica + shipped
 * window shapes. No RN imports (hook file needs reanimated at runtime).
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/frame-rate-baseline-measure.unit.spec.ts
 * Mirrors triade/__tests__/render/useFrameRateBaseline.math.test.ts (7 pass GREEN oracle).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFrameRateStatsReplica,
  steady119,
  spike100,
  loneSpike119,
  emptyWindow,
} from '../../fixtures/dw-frame-rate-baseline-measure-fixtures.ts';

test.skip('[P0-U-01] AC1 steady window: 119x16.667ms → fps≈60, p99≈16.67, frames=119', () => {
  // Given: the shipped full-window shape (first callback never pushes)
  // When: the normative formula runs
  // Then: fps ≈ 60, p99Ms ≈ 16.67, frames = 119
  const result = computeFrameRateStatsReplica(steady119());
  assert.ok(result !== null, 'expected non-null stats');
  assert.equal(result.frames, 119);
  assert.ok(result.fps > 59.9 && result.fps < 60.1, `fps ${result.fps} not in 59.9..60.1`);
  assert.ok(result.p99Ms > 16.66 && result.p99Ms < 16.68, `p99 ${result.p99Ms} not in 16.66..16.68`);
});

test.skip('[P0-U-02] AC2 empty window → null (hook resets, never NaN)', () => {
  // Given: a degenerate empty sample array
  // When: the normative formula runs
  // Then: null (the hook retries instead of publishing)
  assert.equal(computeFrameRateStatsReplica(emptyWindow()), null);
});

test.skip('[P0-U-03] 100-sample spike selects max (floor(100*0.99)=99)', () => {
  // Given: 99 base samples + one 50ms spike
  // When: the normative formula runs
  // Then: p99Ms is the spike (formula path truthfully exercised)
  const result = computeFrameRateStatsReplica(spike100());
  assert.ok(result !== null, 'expected non-null stats');
  assert.equal(result.p99Ms, 50);
});

test.skip('[P0-U-04] 119-shape lone-spike skip documents p99 leniency (DW-32)', () => {
  // Given: the shipped 119 shape with one 50ms spike
  // When: the normative formula runs
  // Then: p99Ms stays 16.667 (floor(119*0.99)=117 skips the max — deferred)
  const result = computeFrameRateStatsReplica(loneSpike119());
  assert.ok(result !== null, 'expected non-null stats');
  assert.equal(result.frames, 119);
  assert.equal(result.p99Ms, 16.667);
});

test.skip('[P0-U-05] fps is exactly 1000/avgMs (avg clamped at 0.001)', () => {
  // Given: uniform 10ms samples
  // When: the normative formula runs
  // Then: fps is exactly 100
  const result = computeFrameRateStatsReplica(Array.from({ length: 50 }, () => 10));
  assert.ok(result !== null, 'expected non-null stats');
  assert.equal(result.fps, 100);
  assert.equal(result.frames, 50);
});

test.skip('[P1-U-01] builders are deterministic (same seed → same arrays)', () => {
  // Given: two independent builder runs
  // When: compared deeply
  // Then: identical (no randomness anywhere in the probe-math surface)
  assert.deepEqual(steady119(), steady119());
  assert.deepEqual(spike100(), spike100());
  assert.deepEqual(loneSpike119(), loneSpike119());
});
