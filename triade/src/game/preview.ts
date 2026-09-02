import type { PendingSpawn } from '../engine/core/types.ts';
import { POT_CURVE, POT_BASE_VALUE } from '../engine/config/spawnConfig.ts';

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

// Preview 60/40 boundary — half-open interval `displayRoll < 0.6` is exact.
// Stabilized against 1 ULP drift (DW-78): the literal 0.6 is not binary-exact
// (double ≈ 0.59999999999999997), so a representable value like
// `0.6 - EPSILON/2` can round to 0.6 and would flip exact/range by one ULP.
// Using `roll + EPSILON < 0.6` insets the boundary by a single ULP so the
// invariant stays 60/40 for adjacent doubles while keeping `0.599` exact and
// `0.6` range as pinned by tests.
const PREVIEW_EXACT_BOUNDARY = 0.6;

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
function ambiguousRange(value: number, availablePotValues: readonly number[]): readonly number[] {
  // AC2 — fixed [1,2] prefix rendered "1/2" regardless of availability.
  if (value === 1 || value === 2) return RANGE_1_2 as number[];

  // Pot value: slice the available sequence from `value`'s index, capped at
  // WINDOW_MAX (AC3/AC4 — starting-at-value contiguous slice, contains the truth).
  const idx = availablePotValues.indexOf(value);
  if (idx !== -1) {
    const len = Math.min(WINDOW_MAX, availablePotValues.length - idx);
    // DW-80: freeze mutable slice for React memo safety (every non-constant path)
    return Object.freeze(availablePotValues.slice(idx, idx + len));
  }

  // DW-79: beyond-ladder truth containment — `FULL_POT_LADDER` freezes at the
  // current POT_CURVE max (96 today). A value beyond that (e.g. 192 when
  // POT_CURVE extends) is a valid ladder value but `nearestLadderIndex` would
  // clamp to 96 and return `[24,48,96]` without truth. Detect valid pot values
  // beyond FULL and return a window that contains truth instead of lying.
  if (Number.isFinite(value) && value > 0 && value > FULL_POT_LADDER[FULL_POT_LADDER.length - 1]) {
    const ratio = value / POT_BASE_VALUE;
    // Valid pot values are POT_BASE_VALUE * 2^k (power-of-two ratio)
    if (Number.isFinite(ratio) && ratio >= 1 && Number.isInteger(Math.log2(ratio))) {
      const tail = FULL_POT_LADDER.slice(Math.max(0, FULL_POT_LADDER.length - WINDOW_MAX + 1));
      return Object.freeze([...tail, value].slice(-WINDOW_MAX));
    }
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
  // DW-80: freeze defensive slice for memo safety
  return Object.freeze(FULL_POT_LADDER.slice(start, end));
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
  // DW-78: ULP-stabilized boundary — `roll + EPSILON < 0.6` keeps `0.599` exact
  // and `0.6` range while absorbing the single representable step around 0.6.
  if (roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY) {
    return { kind: 'exact', value };
  }
  // DW-80: ambiguousRange already returns frozen arrays; cast preserves readonly
  const values = ambiguousRange(value, availablePotValues) as number[];
  return { kind: 'range', values };
}
