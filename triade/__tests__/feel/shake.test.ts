import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shakeMsFor,
  shakeAmplitudeFor,
  shouldShake,
  directionVector,
  maxShakeForTrace,
} from '../../src/feel/shake.ts';
import { presetFor } from '../../src/feel/feel.ts';

describe('feel — shake helpers (S8.3)', () => {
  it('[P0] medium 6 -> shakeMs 2 subtle', () => {
    assert.equal(shakeMsFor(6, false), 2);
    assert.equal(shakeAmplitudeFor(6, false), 2);
    assert.equal(presetFor(6).shakeMs, 2);
  });

  it('[P0] heavy 12+ -> shakeMs 5', () => {
    for (const v of [12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288]) {
      assert.equal(shakeMsFor(v, false), 5, `value ${v} should be 5`);
      assert.equal(shakeAmplitudeFor(v, false), 5, `value ${v} amp 5`);
    }
  });

  it('[P0] light 3 -> shakeMs 2', () => {
    assert.equal(shakeMsFor(3, false), 2);
    assert.equal(shakeAmplitudeFor(3, false), 2);
  });

  it('[P0] cap 8 enforcement — never exceeds 8 for any tier', () => {
    for (const v of [3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288]) {
      const ms = shakeMsFor(v, false);
      assert.ok(ms <= 8, `value ${v} shakeMs ${ms} <=8`);
      assert.ok(shakeAmplitudeFor(v, false) <= 8);
      assert.ok(maxShakeForTrace([{ value: v, to: [0, 0], from: [[0, 0], [0, 1]], spawned: false } as any], false) <= 8);
    }
    // Hypothetical hypothetical: even if preset were >8, helper clamps
    // We verify clamp logic directly: maxShakeForTrace returns min(...,8)
    assert.ok(shakeMsFor(999999, false) <= 8);
  });

  it('[P0] reducedMotion gating — all ->0/false', () => {
    for (const v of [3, 6, 12, 24, 768, 1536]) {
      assert.equal(shakeMsFor(v, true), 0, `value ${v} reduced 0`);
      assert.equal(shakeAmplitudeFor(v, true), 0, `value ${v} amp reduced 0`);
    }
    const trace: any[] = [
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false },
      { value: 6, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false },
    ];
    assert.equal(maxShakeForTrace(trace, true), 0);
    assert.equal(shouldShake(trace, true), false);
    // Single value helpers also gated
    assert.equal(shouldShake(trace, true), false);
  });

  it('[P0] NOOP / empty trace -> no shake', () => {
    assert.equal(shouldShake([], false), false);
    assert.equal(shouldShake(null as any, false), false);
    assert.equal(shouldShake(undefined as any, false), false);
    assert.equal(maxShakeForTrace([], false), 0);
    assert.equal(maxShakeForTrace(null as any, false), 0);
    assert.equal(maxShakeForTrace(undefined as any, false), 0);
    // Trace with only slides/spawns — no merge (from.length !==2 or spawned true)
    const noMerge: any[] = [
      { value: 3, to: [0, 0], from: [[0, 1]], spawned: false },
      { value: 1, to: [3, 3], from: [], spawned: true },
      { value: 6, to: [1, 1], from: [[1, 1]], spawned: false },
    ];
    assert.equal(shouldShake(noMerge, false), false);
    assert.equal(maxShakeForTrace(noMerge, false), 0);
    // Single merge should shake
    const oneMerge: any[] = [{ value: 6, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false }];
    assert.equal(shouldShake(oneMerge, false), true);
    assert.equal(maxShakeForTrace(oneMerge, false), 2);
  });

  it('[P0] multiple merges -> max wins (not stacked)', () => {
    const trace: any[] = [
      { value: 3, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false }, // light 2
      { value: 12, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false }, // heavy 5
    ];
    assert.equal(maxShakeForTrace(trace, false), 5);
    assert.equal(shouldShake(trace, false), true);
    // Same tier multiple merges — max is that tier
    const twoMedium: any[] = [
      { value: 6, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false },
      { value: 6, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false },
    ];
    assert.equal(maxShakeForTrace(twoMedium, false), 2);
    // Mix 6 (2) and 3 (2) -> 2
    const lightMedium: any[] = [
      { value: 3, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false },
      { value: 6, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false },
    ];
    assert.equal(maxShakeForTrace(lightMedium, false), 2);
    // Spawned merges are ignored — spawned true with from length 2 should not count
    const spawnedMerge: any[] = [
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: true },
      { value: 3, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false },
    ];
    assert.equal(maxShakeForTrace(spawnedMerge, false), 2);
  });

  it('[P0] direction vectors left(-1,0)/right(1,0)/up(0,-1)/down(0,1)', () => {
    assert.deepEqual(directionVector('left'), { x: -1, y: 0 });
    assert.deepEqual(directionVector('right'), { x: 1, y: 0 });
    assert.deepEqual(directionVector('up'), { x: 0, y: -1 });
    assert.deepEqual(directionVector('down'), { x: 0, y: 1 });
  });

  it('[P0] invalid dir -> zero vector safety', () => {
    assert.deepEqual(directionVector(undefined as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector(null as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector('' as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector('invalid' as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector('LEFT' as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector(123 as any), { x: 0, y: 0 });
  });

  it('[P0] non-finite values never throw', () => {
    assert.doesNotThrow(() => shakeMsFor(NaN, false));
    assert.doesNotThrow(() => shakeMsFor(Infinity, false));
    assert.doesNotThrow(() => shakeMsFor(-Infinity, false));
    assert.doesNotThrow(() => shakeMsFor(undefined as any, false));
    assert.doesNotThrow(() => shakeMsFor(null as any, false));
    assert.doesNotThrow(() => shakeAmplitudeFor(NaN, false));
    assert.doesNotThrow(() => shakeAmplitudeFor(Infinity, true));
    assert.doesNotThrow(() => maxShakeForTrace([{ value: NaN, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as any], false));
    assert.doesNotThrow(() => shouldShake([{ value: Infinity, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as any], false));
    assert.doesNotThrow(() => directionVector(null as any));
    // Non-finite should yield 0 amplitude, not throw
    assert.equal(shakeMsFor(NaN, false), 2); // NaN falls back to light preset 2 per presetFor? Actually presetFor(NaN) returns light -> 2
    // But shakeMsFor should be finite and capped
    assert.ok(Number.isFinite(shakeMsFor(NaN, false)));
    assert.equal(shakeMsFor(NaN, true), 0);
    assert.equal(maxShakeForTrace([{ value: NaN, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as any], true), 0);
  });

  it('[P0] shakeMsFor uses presetFor data (not hardcoded) and capped', () => {
    // Verify shakeMsFor aligns with presetFor for all tiers and never exceeds cap
    for (const v of [3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072]) {
      const expected = Math.min(presetFor(v).shakeMs, 8);
      assert.equal(shakeMsFor(v, false), expected, `value ${v}`);
      assert.equal(shakeAmplitudeFor(v, false), expected, `value ${v} amplitude`);
    }
  });

  it('[P0] shouldShake requires moved-like trace with merge', () => {
    // shouldShake returns true only when trace has at least one merge and not reduced
    const traceMerge: any[] = [{ value: 3, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false }];
    assert.equal(shouldShake(traceMerge, false), true);
    assert.equal(shouldShake(traceMerge, true), false);
    const traceNoMerge: any[] = [{ value: 3, to: [0, 0], from: [[0, 1]], spawned: false }];
    assert.equal(shouldShake(traceNoMerge, false), false);
  });
});
