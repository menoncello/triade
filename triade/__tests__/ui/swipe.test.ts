import { test } from 'node:test';
import assert from 'node:assert';
import { SWIPE_THRESHOLD, resolveSwipeDirection } from '../../src/ui/swipe.ts';
import type { SwipeInput } from '../../src/ui/swipe.ts';

// Story 1.6 contract (T2.1/T2.2, UX-DR-3/UX-DR-23): swipe.ts is a pure TS
// module (ADR-01 spirit, mirror of layout.ts/orientation.ts) exporting
// SWIPE_THRESHOLD = 10 and a single resolveSwipeDirection({ dx, dy, threshold })
// -> Direction | null. The dominant axis (largest |dx| vs |dy|) wins and the
// sign gives the direction; an exact tie returns null (silent noop); a
// dominant-axis magnitude below the threshold returns null. Static import keeps
// these tests type-bound to the real module and the engine Direction union.

test('[P0] SWIPE_THRESHOLD is exported and equals 10 (~10px activation threshold, UX-DR-3)', () => {
  assert.strictEqual(SWIPE_THRESHOLD, 10, 'activation threshold must be 10px');
});

test('[P0] threshold boundary is exact: magnitude 9 returns null, magnitude 10 returns a direction (T2.2)', () => {
  assert.strictEqual(resolveSwipeDirection({ dx: 9, dy: 0 }), null, '|9| must be below the activation threshold');
  assert.strictEqual(resolveSwipeDirection({ dx: -9, dy: 0 }), null, '|-9| must be below the activation threshold');
  assert.strictEqual(resolveSwipeDirection({ dx: 10, dy: 0 }), 'right', '|10| must activate with a right direction');
  assert.strictEqual(resolveSwipeDirection({ dx: -10, dy: 0 }), 'left', '|-10| must activate with a left direction');
});

test('[P0] all four directions resolve from the dominant-axis sign (T2.2, AC-1)', () => {
  assert.strictEqual(resolveSwipeDirection({ dx: 25, dy: 0 }), 'right', 'positive dx is right');
  assert.strictEqual(resolveSwipeDirection({ dx: -25, dy: 0 }), 'left', 'negative dx is left');
  assert.strictEqual(resolveSwipeDirection({ dx: 0, dy: 25 }), 'down', 'positive dy is down');
  assert.strictEqual(resolveSwipeDirection({ dx: 0, dy: -25 }), 'up', 'negative dy is up');
});

test('[P0] horizontal dominant axis wins on diagonals: dx dominant decides direction (T2.2)', () => {
  assert.strictEqual(resolveSwipeDirection({ dx: 25, dy: 10 }), 'right', 'dx dominant positive is right');
  assert.strictEqual(resolveSwipeDirection({ dx: -25, dy: 10 }), 'left', 'dx dominant negative is left');
});

test('[P0] vertical dominant axis wins on diagonals: dy dominant decides direction (T2.2)', () => {
  assert.strictEqual(resolveSwipeDirection({ dx: -10, dy: -30 }), 'up', 'dy dominant negative is up');
  assert.strictEqual(resolveSwipeDirection({ dx: 10, dy: 30 }), 'down', 'dy dominant positive is down');
});

test('[P0] an exact dominant-axis tie returns null (silent noop, no turn consumed) (T2.2)', () => {
  assert.strictEqual(resolveSwipeDirection({ dx: 25, dy: 25 }), null, 'equal magnitudes must not resolve');
  assert.strictEqual(resolveSwipeDirection({ dx: -25, dy: 25 }), null, 'equal magnitudes must not resolve');
  assert.strictEqual(resolveSwipeDirection({ dx: 25, dy: -25 }), null, 'equal magnitudes must not resolve');
  assert.strictEqual(resolveSwipeDirection({ dx: -25, dy: -25 }), null, 'equal magnitudes must not resolve');
});

test('[P0] a dominant-axis magnitude below the threshold returns null even on a diagonal (T2.2)', () => {
  assert.strictEqual(resolveSwipeDirection({ dx: 9, dy: 5 }), null, 'dominant |9| < 10 must not resolve');
  assert.strictEqual(resolveSwipeDirection({ dx: -9, dy: -5 }), null, 'dominant |-9| < 10 must not resolve');
});

test('[P1] a zero-magnitude swipe returns null (no-op) (UX-DR-23)', () => {
  assert.strictEqual(resolveSwipeDirection({ dx: 0, dy: 0 }), null, 'zero translation must not resolve');
});

test('[P1] a custom threshold parameter is honored and overrides the default (T2.2)', () => {
  assert.strictEqual(resolveSwipeDirection({ dx: 15, dy: 0, threshold: 10 }), 'right', '|15| above a 10px threshold resolves');
  assert.strictEqual(resolveSwipeDirection({ dx: 15, dy: 0, threshold: 20 }), null, '|15| below a 20px threshold does not resolve');
});

test('[P1] resolveSwipeDirection is pure: same input always yields the same result, no state (T2.2 purity)', () => {
  const cases: SwipeInput[] = [
    { dx: 25, dy: 0 },
    { dx: -25, dy: 10 },
    { dx: -10, dy: -30 },
    { dx: 25, dy: 25 },
    { dx: 15, dy: 5 }
  ];
  for (const input of cases) {
    const first = resolveSwipeDirection(input);
    const second = resolveSwipeDirection(input);
    assert.strictEqual(first, second, `resolveSwipeDirection(${JSON.stringify(input)}) must be deterministic`);
  }
});
