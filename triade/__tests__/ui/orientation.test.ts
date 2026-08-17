import { test } from 'node:test';
import assert from 'node:assert';

// Story 1.5 red-phase ATDD contract (T2.2): orientation.ts is pure TS with a
// single isLandscape(width, height) -> boolean — the single source of truth for
// orientation (landscape = width > height). It must agree with the runtime
// useWindowDimensions() orientation because the pure function and the hook read
// the same width/height. Variable-specifier dynamic imports keep `tsc --noEmit`
// green until the developer activates these scaffolds.

const ORIENTATION_SPEC = '../../src/ui/orientation.ts';

test('[P0] isLandscape returns true when width > height (landscape, AC-2)', async () => {
  const { isLandscape } = (await import(ORIENTATION_SPEC)) as { isLandscape: (w: number, h: number) => boolean };
  assert.strictEqual(isLandscape(844, 390), true, '844x390 is landscape');
});

test('[P0] isLandscape returns false when width < height (portrait, AC-1)', async () => {
  const { isLandscape } = (await import(ORIENTATION_SPEC)) as { isLandscape: (w: number, h: number) => boolean };
  assert.strictEqual(isLandscape(390, 844), false, '390x844 is portrait');
});

test('[P0] isLandscape returns false when width === height (square defaults to portrait)', async () => {
  const { isLandscape } = (await import(ORIENTATION_SPEC)) as { isLandscape: (w: number, h: number) => boolean };
  assert.strictEqual(isLandscape(500, 500), false, 'square is not landscape');
});

test('[P0] isLandscape is exact at the boundary: width one greater than height is landscape, one less is portrait', async () => {
  const { isLandscape } = (await import(ORIENTATION_SPEC)) as { isLandscape: (w: number, h: number) => boolean };
  assert.strictEqual(isLandscape(501, 500), true, 'width just above height is landscape');
  assert.strictEqual(isLandscape(499, 500), false, 'width just below height is portrait');
});

test('[P1] isLandscape is pure: no width/height mutation, no state, same inputs always same result', async () => {
  const { isLandscape } = (await import(ORIENTATION_SPEC)) as { isLandscape: (w: number, h: number) => boolean };
  for (const [w, h] of [
    [320, 568],
    [844, 390],
    [1024, 768],
    [200, 2000],
    [2000, 200]
  ]) {
    const first = isLandscape(w, h);
    const second = isLandscape(w, h);
    assert.strictEqual(first, second, `isLandscape(${w}, ${h}) must be deterministic`);
    assert.strictEqual(typeof first, 'boolean', `isLandscape(${w}, ${h}) must return a boolean`);
  }
});