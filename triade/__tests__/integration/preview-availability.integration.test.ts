import { test } from 'node:test';
import assert from 'node:assert';
import { ceilingDetector, tierForCeiling, potForTier } from '../../src/engine/core/index.ts';
import type { Board, PendingSpawn } from '../../src/engine/core/index.ts';
import { previewFor } from '../../src/game/preview.ts';

// Mirrors the orchestrator wiring in App.tsx (~line 128-149): the spawnable pot
// set is derived ONCE from the live board ceiling and fed to both lane previews.
// This test pins that boundary so FR-43 "only 3 available" semantics cannot
// silently regress into a hardcoded ladder (AC3/AC4/AC5).
function previewForBoard(board: Board, pending: PendingSpawn) {
  const availablePot = potForTier(tierForCeiling(ceilingDetector(board)));
  return { availablePot, preview: previewFor(pending, availablePot) };
}

// A 4x4 board whose max cell equals `max` (rest low), to drive the ceiling.
function boardWithCeiling(max: number): Board {
  const empty: Board = Array.from({ length: 4 }, () => Array<number | null>(4).fill(2));
  empty[0][0] = max;
  return empty;
}

function pending(value: number, displayRoll: number): PendingSpawn {
  return { value, displayRoll };
}

// AC5 — the availability set is a DERIVED function of the board ceiling, not a
// constant. Pin the mapping at the integration boundary.
test('[P0] AC5/FR-43 — available pot set is derived from the live board ceiling', () => {
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(24), pending(3, 0.9)).availablePot, [3]);
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(48), pending(3, 0.9)).availablePot, [3, 6]);
  assert.deepStrictEqual(
    previewForBoard(boardWithCeiling(96), pending(3, 0.9)).availablePot,
    [3, 6, 12]
  );
  assert.deepStrictEqual(
    previewForBoard(boardWithCeiling(192), pending(3, 0.9)).availablePot,
    [3, 6, 12, 24]
  );
});

// AC3/FR-43 — when the board ceiling keeps only tier 0 spawnable (max < 48),
// a pot value collapses to a single-element range [3].
test('[P0] AC3/FR-43 — low ceiling (only 3 available) collapses value 3 to range [3]', () => {
  const { preview } = previewForBoard(boardWithCeiling(24), pending(3, 0.9));
  assert.strictEqual(preview.kind, 'range');
  if (preview.kind === 'range') assert.deepStrictEqual(preview.values, [3]);
});

// AC4/FR-43 — as the ceiling rises, the range grows as a contiguous slice of the
// available pot sequence starting at value, capped at 3.
test('[P0] AC4/FR-43 — rising ceiling widens the range as a contiguous slice from value', () => {
  const low = previewForBoard(boardWithCeiling(48), pending(3, 0.9)).preview;
  if (low.kind === 'range') assert.deepStrictEqual(low.values, [3, 6]);

  const mid = previewForBoard(boardWithCeiling(96), pending(6, 0.9)).preview;
  if (mid.kind === 'range') assert.deepStrictEqual(mid.values, [6, 12]);

  const high = previewForBoard(boardWithCeiling(192), pending(6, 0.9)).preview;
  if (high.kind === 'range') assert.deepStrictEqual(high.values, [6, 12, 24]);
});

// AC2/FR-43 — the fixed [1,2] prefix is rendered "1/2" regardless of ceiling.
test('[P0] AC2/FR-43 — value 1/2 render [1,2] independent of board ceiling', () => {
  for (const ceiling of [24, 48, 96, 192]) {
    for (const value of [1, 2]) {
      const { preview } = previewForBoard(boardWithCeiling(ceiling), pending(value, 0.9));
      assert.strictEqual(preview.kind, 'range');
      if (preview.kind === 'range') assert.deepStrictEqual(preview.values, [1, 2]);
    }
  }
});

// AC1/FR-43 — every ladder value is contained in the range produced by the
// live-ceiling wiring, across both a tight- and a wide-ceiling board.
test('[P0] AC1/FR-43 — live-ceiling wiring always contains the truth', () => {
  for (const value of [1, 2, 3, 6, 12, 24, 48, 96]) {
    for (const ceiling of [24, 48, 96, 192]) {
      const { preview } = previewForBoard(boardWithCeiling(ceiling), pending(value, 0.9));
      assert.strictEqual(preview.kind, 'range');
      if (preview.kind === 'range') {
        assert.ok(preview.values.includes(value), `range must contain ${value} (ceiling=${ceiling})`);
      }
    }
  }
});

// AC7/FR-41/42 — the exact path (displayRoll < 0.6) ignores availability entirely
// and returns { kind:'exact', value } unchanged through the live wiring.
test('[P0] AC7 — exact path is unaffected by the live-ceiling availability', () => {
  for (const ceiling of [24, 48, 96, 192]) {
    const { preview } = previewForBoard(boardWithCeiling(ceiling), pending(12, 0.1));
    assert.deepStrictEqual(preview, { kind: 'exact', value: 12 });
  }
});
