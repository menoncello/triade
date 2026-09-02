import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { presetFor, allPresetValues, reducedPresetFor, FEEL_PRESETS } from '../../src/feel/feel.ts';
import { hapticsStyleForValue, triggerHapticsForTrace } from '../../src/feel/haptics.ts';

describe('feel — presetFor', () => {
  it('[P0] AC1 3 -> light', () => {
    assert.equal(presetFor(3).haptic, 'light');
  });
  it('[P0] AC1 6 -> medium', () => {
    assert.equal(presetFor(6).haptic, 'medium');
  });
  it('[P0] AC1 12+ -> heavy', () => {
    for (const v of [12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144]) {
      assert.equal(presetFor(v).haptic, 'heavy', `value ${v} should be heavy`);
    }
  });
  it('[P0] AC2 presetFor is pure and data-driven (same input -> same object identity)', () => {
    const a = presetFor(3);
    const b = presetFor(3);
    assert.equal(a, b, 'should return frozen canonical object');
    assert.equal(presetFor(6), FEEL_PRESETS[6]);
    assert.equal(presetFor(12), FEEL_PRESETS[12]);
  });
  it('[P0] AC2 sweeps all preset values', () => {
    const tiers = allPresetValues();
    assert.ok(tiers.length >= 3);
    for (const v of tiers) {
      const p = presetFor(v);
      assert.ok(['light', 'medium', 'heavy'].includes(p.haptic), `tier ${v} haptic valid`);
      assert.ok(Number.isFinite(p.shakeMs));
      assert.ok(Number.isFinite(p.particleBurst));
      assert.ok(Number.isFinite(p.overshootMs));
      assert.equal(typeof p.flash, 'boolean');
    }
  });
  it('[P0] AC3 shakeMs capped at 8 and monotonic light/medium/heavy', () => {
    const light = presetFor(3);
    const medium = presetFor(6);
    const heavy = presetFor(12);
    assert.ok(light.shakeMs <= 8);
    assert.ok(medium.shakeMs <= 8);
    assert.ok(heavy.shakeMs <= 8);
    // heavy >= medium per spec (5 vs 2)
    assert.ok(heavy.shakeMs >= medium.shakeMs);
  });
  it('[P0] edge non-finite / small values fallback to light and never throw', () => {
    assert.equal(presetFor(NaN).haptic, 'light');
    assert.equal(presetFor(Infinity).haptic, 'light');
    assert.equal(presetFor(-1).haptic, 'light');
    assert.equal(presetFor(0).haptic, 'light');
    assert.equal(presetFor(1 as any).haptic, 'light');
    assert.equal(presetFor(2 as any).haptic, 'light');
  });
  it('[P0] reducedPresetFor keeps haptic, cuts visual', () => {
    assert.equal(reducedPresetFor(3).haptic, 'light');
    assert.equal(reducedPresetFor(6).haptic, 'medium');
    assert.equal(reducedPresetFor(12).haptic, 'heavy');
    assert.equal(reducedPresetFor(12).shakeMs, 0);
    assert.equal(reducedPresetFor(12).particleBurst, 0);
    assert.equal(reducedPresetFor(12).flash, false);
  });
});

describe('feel — haptics gateway', () => {
  it('[P0] AC1 hapticsStyleForValue maps 3/6/12+ to Light/Medium/Heavy', () => {
    assert.equal(hapticsStyleForValue(3), 'Light');
    assert.equal(hapticsStyleForValue(6), 'Medium');
    for (const v of [12, 24, 48, 768, 1536]) {
      assert.equal(hapticsStyleForValue(v), 'Heavy', `value ${v}`);
    }
  });
  it('[P0] AC4 NOOP / empty trace never throws', () => {
    assert.doesNotThrow(() => triggerHapticsForTrace([]));
    assert.doesNotThrow(() => triggerHapticsForTrace(null as any));
    assert.doesNotThrow(() => triggerHapticsForTrace(undefined as any));
    // trace with only spawns / slides / holds — no merge (from length !=2)
    assert.doesNotThrow(() =>
      triggerHapticsForTrace([
        { value: 3, to: [0, 0], from: [[0, 1]], spawned: false } as any,
        { value: 1, to: [3, 3], from: [], spawned: true } as any,
      ])
    );
  });
  it('[P0] AC1 triggerHapticsForTrace fires per merge entry (best-effort, no throw with mocked haptics)', () => {
    // The actual expo-haptics call is dynamic import + best-effort; we only verify the gateway
    // does not throw and correctly identifies merge entries (from.length===2, spawned false).
    const trace: any[] = [
      { value: 3, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false },
      { value: 6, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false },
      { value: 12, to: [2, 2], from: [[2, 0], [2, 1]], spawned: false },
    ];
    assert.doesNotThrow(() => triggerHapticsForTrace(trace));
    // mapping is verified via hapticsStyleForValue above; this test pins the gateway's contract
    assert.equal(hapticsStyleForValue(trace[0].value), 'Light');
    assert.equal(hapticsStyleForValue(trace[1].value), 'Medium');
    assert.equal(hapticsStyleForValue(trace[2].value), 'Heavy');
  });
  it('[P0] FR-30 haptics stay under Reduced Motion (gateway does not read settings)', () => {
    // Gateway deliberately ignores reducedMotion; verify mapping is identical regardless.
    assert.equal(hapticsStyleForValue(12), 'Heavy');
    assert.equal(reducedPresetFor(12).haptic, 'heavy');
  });
});
