// Test-data builders for the 10-6 calibration-gate RED scaffolds.
//
// Mirrors the `data-factories` pattern (override-friendly builders, fresh
// object per call, no shared state) WITHOUT `@faker-js/faker`: the gate's
// domain is small fixed numerics (seconds, ladder tiers), and the spec
// boundary forbids new runtime deps. Plain deterministic builders are the
// correct factory here — randomness would only add flakiness to threshold
// assertions.

export type GateSummary = {
  firstMergeP50Seconds: number;
  firstGameoverP50Seconds: number;
  maxTileMedian: number;
};

export type GateBaseline = {
  maxTileMedianBaseline: number;
};

// A healthy summary: every metric comfortably within bounds
// (first-merge 10s < 25s, first-gameover 120s < 210s, median 96 == baseline).
export function healthySummary(overrides: Partial<GateSummary> = {}): GateSummary {
  return {
    firstMergeP50Seconds: 10,
    firstGameoverP50Seconds: 120,
    maxTileMedian: 96,
    ...overrides,
  };
}

// Playtest baseline builder (default: max-tile median tier 96).
export function baseline96(maxTileMedianBaseline = 96): GateBaseline {
  return { maxTileMedianBaseline };
}
