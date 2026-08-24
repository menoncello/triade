import { test } from 'node:test';
import assert from 'node:assert';
import { previewFor } from '../../src/game/preview.ts';
import type { PendingSpawn } from '../../src/engine/core/types.ts';
import { POT_CURVE } from '../../src/engine/config/spawnConfig.ts';

// Tier value ladder the preview window is drawn from (architecture N3 guide):
// fixed [1, 2] prefix + ascending POT_CURVE keys. Mirrors how preview.ts must
// derive the sequence from ENGINE CONFIG DATA (boundary rule 4, no literals).
const LADDER: number[] = [1, 2, ...Object.keys(POT_CURVE).map(Number).sort((a, b) => a - b)];

function pending(value: number, displayRoll: number): PendingSpawn {
  return { value, displayRoll };
}

// A list is a contiguous slice of LADDER if every adjacent pair is also
// adjacent in LADDER (same order). This captures the "contiguous window"
// property without pinning the centering behavior (Story 7.3 hardens content).
function isContiguousSlice(values: number[]): boolean {
  if (values.length === 0) return false;
  const idx = values.map((v) => LADDER.indexOf(v));
  if (idx.some((i) => i === -1)) return false;
  for (let i = 1; i < idx.length; i++) {
    if (idx[i] !== idx[i - 1] + 1) return false;
  }
  return true;
}

test('[P0] AC2 — displayRoll below 0.6 yields the exact value', () => {
  const p = previewFor(pending(12, 0.599));
  assert.deepStrictEqual(p, { kind: 'exact', value: 12 });
});

test('[P0] AC2 — displayRoll at 0.6 (boundary) yields a range', () => {
  const p = previewFor(pending(12, 0.6));
  assert.strictEqual(p.kind, 'range');
});

// F-2 (test-review 7.2): pin the *window contents* at exactly the 0.6 boundary,
// not just the kind. The produced window must satisfy the range invariants.
test('[P0] AC2/F-2 — displayRoll exactly 0.6 produces a valid window', () => {
  const p = previewFor(pending(12, 0.6));
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') {
    assert.ok(p.values.includes(12), 'boundary window must include the pending value');
    assert.ok(p.values.length >= 1 && p.values.length <= 3, 'boundary window capped at 3');
    assert.ok(isContiguousSlice(p.values), 'boundary window is a contiguous slice');
  }
});

// F-3 (test-review 7.2): defensive branch — a value outside the tier ladder
// yields a single-element range rather than an exact. The engine never emits
// such a value, but pin the accepted defensive behavior so it cannot silently
// regress into an exact/throw.
test('[P0] AC1/F-3 — out-of-ladder value yields a defensive single-element range', () => {
  const p = previewFor(pending(99, 0.9));
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') assert.deepStrictEqual(p.values, [99], 'defensive branch wraps the value');
});

test('[P0] AC2 — exact path echoes pendingSpawn.value verbatim', () => {
  const p = previewFor(pending(24, 0.1));
  assert.strictEqual(p.kind, 'exact');
  if (p.kind === 'exact') assert.strictEqual(p.value, 24);
});

test('[P0] AC2 — range path always contains the pending value', () => {
  for (const value of [1, 2, 3, 6, 12, 24, 48, 96]) {
    const p = previewFor(pending(value, 0.9));
    assert.strictEqual(p.kind, 'range');
    if (p.kind === 'range') assert.ok(p.values.includes(value), `range must include ${value}`);
  }
});

test('[P0] AC2 — range is capped at 3 values and ascending', () => {
  const p = previewFor(pending(48, 0.99));
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') {
    assert.ok(p.values.length >= 1 && p.values.length <= 3, 'window capped at 3');
    for (let i = 1; i < p.values.length; i++) {
      assert.ok(p.values[i] > p.values[i - 1], 'window sorted ascending');
    }
  }
});

test('[P0] AC2 — range is a contiguous window of the tier sequence', () => {
  for (const value of [1, 2, 3, 6, 12, 24, 48, 96]) {
    const p = previewFor(pending(value, 0.8));
    if (p.kind === 'range') assert.ok(isContiguousSlice(p.values), `window for ${value} is contiguous`);
  }
});

test('[P0] AC1/AC7 — previewFor is pure: identical input yields deep-equal output', () => {
  const a = previewFor(pending(6, 0.7));
  const b = previewFor(pending(6, 0.7));
  assert.deepStrictEqual(a, b);
});

test('[P0] AC1 — previewFor never re-rolls: distinct displayRoll values do not collide on exact', () => {
  // Below 0.6 must always be exact; the decision is a pure function of displayRoll,
  // never a hidden RNG. Multiple sub-threshold rolls must all map to exact.
  for (const roll of [0, 0.1, 0.3, 0.599]) {
    const p = previewFor(pending(12, roll));
    assert.strictEqual(p.kind, 'exact', `displayRoll ${roll} must be exact`);
  }
});
