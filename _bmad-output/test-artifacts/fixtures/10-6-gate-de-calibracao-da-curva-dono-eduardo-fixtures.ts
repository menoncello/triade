/**
 * Fixtures — 10-6 gate de calibracao da curva (dono: Eduardo)
 * Deterministic builders for the pure `evaluateCalibrationGate` evaluator.
 * Host-only, no faker — the gate's domain is small fixed numerics (seconds,
 * ladder tiers), and randomness would only flake threshold assertions. Fresh
 * object per call via overrides spread; no shared state between tests.
 * Covers: triade/src/engine/config/calibrationGate.ts (thresholds 25s / 210s /
 *           1-tier drop, ladder 1,2,3,6,12,24,48,96,192,384,...)
 *         triade/__tests__/engine/calibration-gate.test.ts (canonical 12)
 *         triade/__tests__/engine/calibration-gate-automate.test.ts (gap 12)
 * Spec: _bmad-output/implementation-artifacts/spec-10-6-gate-de-calibracao-da-curva-dono-eduardo.md (rev 20b91aa)
 * Design: _bmad-output/test-artifacts/test-design/test-design-epic-10-6.md (8 risks, 3 high; P0 7 / P1 6 / P2 4 / P3 2)
 * ATDD: _bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/ (factory + 2 RED scaffolds, test.skip)
 *       _bmad-output/test-artifacts/atdd-checklist-10-6-gate-de-calibracao-da-curva-dono-eduardo.md
 * Run: npm --prefix triade test -- __tests__/engine/calibration-gate-automate.test.ts (12 pass)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers
 * live in the triade test files. No Playwright test.extend — pure node:test +
 * tsx (gate is a pure function: no page.goto, no UI, no I/O).
 */

import type {
  CalibrationSummary,
  CalibrationBaseline,
} from '../../../triade/src/engine/config/calibrationGate.ts';

// ---------------------------------------------------------------------------
// Deterministic fixtures — mirror calibration-gate.test.ts healthy builders
// ---------------------------------------------------------------------------

// A healthy summary: every metric comfortably within bounds
// (first-merge 10s < 25s, first-gameover 120s < 210s, median 96 == baseline).
export function healthySummary(overrides: Partial<CalibrationSummary> = {}): CalibrationSummary {
  return {
    firstMergeP50Seconds: 10,
    firstGameoverP50Seconds: 120,
    maxTileMedian: 96,
    ...overrides,
  };
}

// Playtest baseline builder (default: max-tile median tier 96).
export function baseline96(maxTileMedianBaseline = 96): CalibrationBaseline {
  return { maxTileMedianBaseline };
}

// Boundary summary: every metric EXACTLY on its threshold (== is ok).
export function boundarySummary(): CalibrationSummary {
  return {
    firstMergeP50Seconds: 25,
    firstGameoverP50Seconds: 210,
    maxTileMedian: 96,
  };
}

// Triple-breach summary: every gated metric over its limit (96 -> 24 = 2 tiers).
export function tripleBreachSummary(): CalibrationSummary {
  return {
    firstMergeP50Seconds: 30,
    firstGameoverP50Seconds: 300,
    maxTileMedian: 24,
  };
}

// Growth summary: current median ABOVE baseline (negative drop, never retune).
export function growthSummary(): CalibrationSummary {
  return { ...healthySummary(), maxTileMedian: 192 };
}

// ---------------------------------------------------------------------------
// Cleanup helpers — pure data has nothing to tear down, but the surface is
// kept for contract parity with other TEA fixture files.
// ---------------------------------------------------------------------------
export function deleteGateSummary(): void {
  // No-op: gate summaries are in-memory plain objects, no external state.
}
