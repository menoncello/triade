import type { PendingSpawn } from '../engine/core/types.ts';
import { POT_CURVE } from '../engine/config/spawnConfig.ts';

export type Preview =
  | { kind: 'exact'; value: number }
  | { kind: 'range'; values: number[] };

// Tier value ladder (FR-9), derived from ENGINE CONFIG DATA — boundary rule 4:
// fixed [1, 2] prefix + ascending POT_CURVE keys. No scattered literals anywhere.
const FULL_POT_LADDER: readonly number[] = Object.freeze([
  1,
  2,
  ...Object.keys(POT_CURVE)
    .map(Number)
    .sort((a, b) => a - b),
]);

const WINDOW_MAX = 3;

// Frozen constant windows — stable identity so React memoization of the Hud /
// PreviewCard is not defeated by a fresh array on every render (review patch F2).
const RANGE_1_2: readonly number[] = Object.freeze([1, 2]);

// Index of the ladder element nearest to `value` (used by the defensive fallback —
// reached when `value` is absent from the live `availablePotValues`, e.g. a pending
// rolled at a higher tier than the current post-placement ceiling / board deflate).
function nearestLadderIndex(value: number): number {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < FULL_POT_LADDER.length; i++) {
    const diff = Math.abs(FULL_POT_LADDER[i] - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

// FR-43 ambiguous-range CONTENT. Returns a contiguous slice of `availablePotValues`
// that always contains `value`. `availablePotValues` is the live pot tier (computed
// by the orchestrator from the board ceiling); the default keeps existing single-arg
// callers and 7.2 tests green by falling back to the full ladder.
function ambiguousRange(value: number, availablePotValues: readonly number[]): number[] {
  // AC2 — fixed [1,2] prefix rendered "1/2" regardless of availability.
  if (value === 1 || value === 2) return RANGE_1_2 as number[];

  // Pot value: slice the available sequence from `value`'s index, capped at
  // WINDOW_MAX (AC3/AC4 — starting-at-value contiguous slice, contains the truth).
  const idx = availablePotValues.indexOf(value);
  if (idx !== -1) {
    const len = Math.min(WINDOW_MAX, availablePotValues.length - idx);
    return availablePotValues.slice(idx, idx + len);
  }

  // Defensive fallback: `value` absent from the live `availablePotValues` — reachable
  // in production when a pending was rolled at a tier higher than the current
  // post-placement ceiling (board deflate). Clamp to the nearest ladder index and take
  // a WINDOW_MAX-wide centered slice of the FULL ladder, clamped to bounds. Never a
  // single-element [value] lie — truthful-by-proximity (the slice still contains the
  // roll-time-correct tier, so the displayed window is spawnable-correct).
  const clamped = nearestLadderIndex(value);
  const start = Math.max(0, Math.min(clamped - 1, FULL_POT_LADDER.length - WINDOW_MAX));
  const end = Math.min(FULL_POT_LADDER.length, start + WINDOW_MAX);
  return FULL_POT_LADDER.slice(start, end);
}

// N3 Ambiguous Preview: READS the engine-pre-resolved `pendingSpawn`; the 60/40
// decision uses the SEPARATE `displayRoll`, never re-rolls. Pure function — no
// rng, no Math.random, no engine roll imports (host-testable like matchScore.ts).
export function previewFor(
  pending: PendingSpawn,
  availablePotValues: readonly number[] = FULL_POT_LADDER,
): Preview {
  // Defensive: the engine guarantees a well-formed PendingSpawn ([0,1) displayRoll,
  // ladder value), but guard against malformed input so a bad snapshot can never
  // crash the HUD or silently flip the 60/40 decision (review P1).
  const roll = Number.isFinite(pending.displayRoll) ? pending.displayRoll : 0;
  const value = Number.isFinite(pending.value) ? pending.value : 0;
  if (roll < 0.6) {
    return { kind: 'exact', value };
  }
  return { kind: 'range', values: ambiguousRange(value, availablePotValues) };
}
