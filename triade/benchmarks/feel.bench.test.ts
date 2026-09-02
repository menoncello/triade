import { test } from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';
import { presetFor, reducedPresetFor, allPresetValues } from '../src/feel/feel.ts';
import { punchScaleFor, punchDurationFor, shouldFlash, particleCountFor, shouldGlow } from '../src/feel/punch.ts';
import { shakeMsFor, shakeAmplitudeFor, maxShakeForTrace, shouldShake, directionVector } from '../src/feel/shake.ts';
import { shouldTriggerBulletTime, nextSessionBest, maxMergeValue } from '../src/feel/bulletTime.ts';
import { hapticsStyleForValue } from '../src/feel/haptics.ts';
import type { TraceEntry } from '../src/engine/core/types.ts';

// Budgets keep headroom so CI catches regressions without flaking.
// Baseline 2026-09-01: median ~0.0003ms per feel lookup, p99 ~0.0006ms on Node.
const BUDGET_MEDIAN_MS = 0.05;
const BUDGET_TAIL_P99_MS = 0.1;
const TURNS = 10000;
const WARMUP = 1000;

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
  return sorted[idx];
}
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function syntheticTrace(value: number, spawned = false): TraceEntry[] {
  return [{ value, to: [0, 0], from: [[0, 1], [0, 2]], spawned } as unknown as TraceEntry];
}

test('benchmark: feel helpers median/p99 sweep full profile', () => {
  const tiers = allPresetValues();
  for (let i = 0; i < WARMUP; i++) {
    const v = tiers[i % tiers.length];
    presetFor(v);
    punchScaleFor(v, false);
    shakeMsFor(v, false);
    shouldFlash(v, false);
    particleCountFor(v, false);
    shouldGlow(v, false);
    hapticsStyleForValue(v);
    const tr = syntheticTrace(v);
    maxShakeForTrace(tr, false);
    shouldShake(tr, false);
    directionVector('left');
    maxMergeValue(tr);
    shouldTriggerBulletTime(tr, 0, false);
    nextSessionBest(tr, 0);
  }
  const samples: number[] = [];
  for (let i = 0; i < TURNS; i++) {
    const v = tiers[i % tiers.length];
    const tr = syntheticTrace(v);
    const start = performance.now();
    presetFor(v);
    punchScaleFor(v, false);
    shakeMsFor(v, false);
    shouldFlash(v, false);
    particleCountFor(v, false);
    shouldGlow(v, false);
    hapticsStyleForValue(v);
    shakeAmplitudeFor(v, false);
    punchDurationFor(v, false);
    maxShakeForTrace(tr, false);
    shouldShake(tr, false);
    directionVector(i % 4 === 0 ? 'left' : i % 4 === 1 ? 'right' : i % 4 === 2 ? 'up' : 'down');
    maxMergeValue(tr);
    shouldTriggerBulletTime(tr, 6, false);
    nextSessionBest(tr, 6);
    samples.push(performance.now() - start);
  }
  const med = median(samples);
  const tail = percentile(samples, 0.99);
  assert.ok(med < BUDGET_MEDIAN_MS, `feel full median ${med.toFixed(4)}ms >= budget ${BUDGET_MEDIAN_MS}ms`);
  assert.ok(tail < BUDGET_TAIL_P99_MS, `feel full p99 ${tail.toFixed(4)}ms >= budget ${BUDGET_TAIL_P99_MS}ms`);
});

test('benchmark: feel helpers median/p99 sweep reduced profile', () => {
  const tiers = allPresetValues();
  for (let i = 0; i < WARMUP; i++) {
    const v = tiers[i % tiers.length];
    reducedPresetFor(v);
    punchScaleFor(v, true);
    shakeMsFor(v, true);
    shouldFlash(v, true);
    particleCountFor(v, true);
    shouldGlow(v, true);
    // haptics stay identical even under reducedMotion
    hapticsStyleForValue(v);
    const tr = syntheticTrace(v);
    maxShakeForTrace(tr, true);
    shouldShake(tr, true);
    shouldTriggerBulletTime(tr, 0, true);
    nextSessionBest(tr, 0);
  }
  const samples: number[] = [];
  for (let i = 0; i < TURNS; i++) {
    const v = tiers[i % tiers.length];
    const tr = syntheticTrace(v);
    const start = performance.now();
    const reduced = reducedPresetFor(v);
    // FR-30/UX-DR-16: visuals zeroed, haptic preserved
    assert.equal(reduced.shakeMs, 0);
    assert.equal(reduced.particleBurst, 0);
    assert.equal(reduced.flash, false);
    assert.equal(reduced.overshootScale, 1);
    assert.equal(reduced.overshootMs, 0);
    punchScaleFor(v, true);
    punchDurationFor(v, true);
    shakeMsFor(v, true);
    shakeAmplitudeFor(v, true);
    shouldFlash(v, true);
    particleCountFor(v, true);
    shouldGlow(v, true);
    // haptics stay: heavy stays heavy even when reduced
    hapticsStyleForValue(v);
    maxShakeForTrace(tr, true);
    shouldShake(tr, true);
    shouldTriggerBulletTime(tr, 6, true);
    nextSessionBest(tr, 6);
    samples.push(performance.now() - start);
  }
  const med = median(samples);
  const tail = percentile(samples, 0.99);
  assert.ok(med < BUDGET_MEDIAN_MS, `feel reduced median ${med.toFixed(4)}ms >= budget ${BUDGET_MEDIAN_MS}ms`);
  assert.ok(tail < BUDGET_TAIL_P99_MS, `feel reduced p99 ${tail.toFixed(4)}ms >= budget ${BUDGET_TAIL_P99_MS}ms`);
  // Invariant: reduced visuals are flat but haptics mapping is unchanged
  for (const v of [3, 6, 12, 24, 1536, 3072]) {
    const full = hapticsStyleForValue(v);
    // hapticsStyleForValue does not branch on reducedMotion, so same call covers it
    assert.ok(['Light', 'Medium', 'Heavy'].includes(full));
    assert.equal(punchScaleFor(v, true), 1);
    assert.equal(shouldFlash(v, true), false);
    assert.equal(particleCountFor(v, true), 0);
    assert.equal(shouldGlow(v, true), false);
    assert.equal(shakeMsFor(v, true), 0);
    assert.equal(shouldTriggerBulletTime(syntheticTrace(v), 0, true), false);
    assert.equal(shouldShake(syntheticTrace(v), true), false);
  }
});
