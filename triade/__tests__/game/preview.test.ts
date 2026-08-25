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

// F-3 (test-review 7.2, CLOSED by 7.3): defensive branch — a value outside the
// tier ladder yields a truthful-by-proximity 3-wide tail, NEVER a single-element
// [value] lie. The engine never emits such a value, but pin the accepted
// defensive behavior so it cannot silently regress into an exact/throw OR a lie.
test('[P0] AC1/F-3 — out-of-ladder value yields a defensive 3-wide tail, never a single-element lie', () => {
  const p = previewFor(pending(99, 0.9));
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') {
    assert.ok(p.values.length >= 1 && p.values.length <= 3, 'defensive window capped at 3');
    assert.ok(isContiguousSlice(p.values), 'defensive window is a contiguous slice of the full ladder');
    assert.notDeepStrictEqual(p.values, [99], 'defensive branch must NOT lie with a single-element [value]');
    // 99 (beyond the tail) clamps to the tail window [24,48,96].
    assert.deepStrictEqual(p.values, [24, 48, 96]);
  }
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

// ===== Story 7.3 RED-PHASE scaffolds (FR-43 / FR-44) — fail until 7.3 lands =====
// These pin the hardened ambiguous-range CONTENT. previewFor gains a second
// parameter `availablePotValues` (the live pot tier); the default keeps the
// existing 7.2 callers/tests green. They read only `pendingSpawn` and emit no
// spawn side effects.

// AC2/FR-43 — fixed [1,2] prefix rendered "1/2" regardless of availability.
test('[P0] AC2/FR-43 — value 1 with only [3] available yields range [1,2]', () => {
  const p = previewFor(pending(1, 0.9), [3]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') assert.deepStrictEqual(p.values, [1, 2]);
});

test('[P0] AC2/FR-43 — value 2 with only [3] available yields range [1,2]', () => {
  const p = previewFor(pending(2, 0.9), [3]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') assert.deepStrictEqual(p.values, [1, 2]);
});

// AC3/FR-43 — "only 3 available" (ceiling tier 0) collapses to [3].
test('[P0] AC3/FR-43 — value 3 with only [3] available yields range [3]', () => {
  const p = previewFor(pending(3, 0.9), [3]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') assert.deepStrictEqual(p.values, [3]);
});

// AC4/FR-43 — pot value when more are spawnable: contiguous slice of the
// available pot sequence starting at value, capped at 3.
test('[P0] AC4/FR-43 — available [3,6], value 3 yields [3,6]', () => {
  const p = previewFor(pending(3, 0.9), [3, 6]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') assert.deepStrictEqual(p.values, [3, 6]);
});

test('[P0] AC4/FR-43 — available [3,6,12], value 3 yields [3,6,12]', () => {
  const p = previewFor(pending(3, 0.9), [3, 6, 12]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') assert.deepStrictEqual(p.values, [3, 6, 12]);
});

test('[P0] AC4/FR-43 — available [3,6,12,24], value 6 yields [6,12,24]', () => {
  const p = previewFor(pending(6, 0.9), [3, 6, 12, 24]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') assert.deepStrictEqual(p.values, [6, 12, 24]);
});

test('[P0] AC4/FR-43 — available [3,6,12], value 12 yields [12]', () => {
  const p = previewFor(pending(12, 0.9), [3, 6, 12]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') assert.deepStrictEqual(p.values, [12]);
});

// AC5/FR-43 — "only 3 available" is driven by the PASSED availablePotValues,
// not hardcoded; with the full ladder the window still always contains value.
test('[P0] AC5/FR-43 — "only 3 available" is driven by passed availablePotValues, not hardcoded', () => {
  const only3 = previewFor(pending(3, 0.9), [3]);
  assert.deepStrictEqual(only3.kind === 'range' ? only3.values : [], [3]);
  const more3 = previewFor(pending(3, 0.9), [3, 6, 12]);
  assert.notDeepStrictEqual(more3.kind === 'range' ? more3.values : [], [3]);
});

test('[P0] AC5/FR-43 — full available ladder still yields a window containing 3 (never empty)', () => {
  const p = previewFor(pending(3, 0.9), LADDER);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') {
    assert.ok(p.values.includes(3), 'window must contain the truth');
    assert.ok(p.values.length >= 1, 'window never empty');
    assert.ok(isContiguousSlice(p.values), 'window is a contiguous slice of the available sequence');
  }
});

// AC1/FR-43 — sweep: every ladder value is contained in the range for any
// displayRoll >= 0.6, across both a tight [3] set and the full ladder.
test('[P0] AC1/FR-43 — every ladder value is contained in the range for displayRoll >= 0.6', () => {
  for (const value of [1, 2, 3, 6, 12, 24, 48, 96]) {
    for (const avail of [[3], LADDER]) {
      const p = previewFor(pending(value, 0.9), avail);
      assert.strictEqual(p.kind, 'range');
      if (p.kind === 'range') {
        assert.ok(p.values.includes(value), `range must contain ${value} (avail=${JSON.stringify(avail)})`);
      }
    }
  }
});

// AC6/FR-44 — previewFor reads only pendingSpawn and emits no spawn side effects.
test('[P0] AC6/FR-44 — previewFor produces no side effects on the provided pendingSpawn', () => {
  const original = { value: 12, displayRoll: 0.9 };
  const before = JSON.parse(JSON.stringify(original));
  const p = previewFor(original, LADDER);
  assert.strictEqual(p.kind, 'range');
  assert.deepStrictEqual(original, before, 'pendingSpawn object must be untouched');
});

// AC7/FR-41/42 — exact path (displayRoll < 0.6) returns { kind:'exact', value }
// unchanged. (Covered by the 7.2 AC2 exact pins above; re-pinned here for 7.3.)
test('[P0] AC7 — exact path is preserved (no regression) for every ladder value', () => {
  for (const value of [1, 2, 3, 6, 12, 24, 48, 96]) {
    const p = previewFor(pending(value, 0.1));
    assert.deepStrictEqual(p, { kind: 'exact', value });
  }
});

// AC8/FR-44 — previewFor stays a pure projection: same input -> deep-equal output
// and no engine roll imports. (Purity of the module against the resolver is owned
// by 7.4's hard invariant; this is the 7.3 smoke pin.)
test('[P0] AC8 — previewFor is deterministic: identical input yields deep-equal output', () => {
  for (const value of [1, 2, 3, 6, 12, 24, 48, 96]) {
    for (const avail of [[3], [3, 6, 12], LADDER]) {
      const a = previewFor(pending(value, 0.8), avail);
      const b = previewFor(pending(value, 0.8), avail);
      assert.deepStrictEqual(a, b, `determinism broken for value ${value}`);
    }
  }
});
