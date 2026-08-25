import type { PendingSpawn } from '../engine/core/types.ts';
import { POT_CURVE } from '../engine/config/spawnConfig.ts';

export type Preview =
  | { kind: 'exact'; value: number }
  | { kind: 'range'; values: number[] };

// Tier value ladder (FR-9), derived from ENGINE CONFIG DATA — boundary rule 4:
// fixed [1, 2] prefix + ascending POT_CURVE keys. No scattered literals anywhere.
const TIER_LADDER: readonly number[] = Object.freeze([
  1,
  2,
  ...Object.keys(POT_CURVE)
    .map(Number)
    .sort((a, b) => a - b),
]);

const WINDOW_MAX = 3;

// Basic contiguous window over the tier ladder, capped at WINDOW_MAX values,
// that always contains `value`. Centered-ish on `value`'s index but clamped so
// it stays a real sub-slice. Content pins (incl. the "1/2 shown together" rule)
// are owned by Story 7.3 — this is intentionally basic (architecture N3 guide:
// correct-but-basic contiguous window).
function contiguousWindowContaining(value: number): number[] {
  const idx = TIER_LADDER.indexOf(value);
  if (idx === -1) return [value];
  const start = Math.max(0, Math.min(idx - 1, TIER_LADDER.length - WINDOW_MAX));
  const end = Math.min(TIER_LADDER.length, start + WINDOW_MAX);
  return TIER_LADDER.slice(start, end);
}

// N3 Ambiguous Preview: READS the engine-pre-resolved `pendingSpawn`; the 60/40
// decision uses the SEPARATE `displayRoll`, never re-rolls. Pure function — no
// rng, no Math.random, no engine roll imports (host-testable like matchScore.ts).
export function previewFor(pending: PendingSpawn): Preview {
  // Defensive: the engine guarantees a well-formed PendingSpawn ([0,1) displayRoll,
  // ladder value), but guard against malformed input so a bad snapshot can never
  // crash the HUD or silently flip the 60/40 decision (review P1).
  const roll = Number.isFinite(pending.displayRoll) ? pending.displayRoll : 0;
  const value = Number.isFinite(pending.value) ? pending.value : 0;
  if (roll < 0.6) {
    return { kind: 'exact', value };
  }
  return { kind: 'range', values: contiguousWindowContaining(value) };
}
