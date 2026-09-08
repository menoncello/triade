// Calibration gate — pure threshold evaluator over operator-supplied telemetry
// summaries (spec 10-6, dono: Eduardo).
//
// Data-only, no I/O, no deps: the operator pastes dashboard summaries
// (first-merge p50, first-gameover p50, max-tile mediana — see docs/
// calibracao-da-curva.md) into `evaluateCalibrationGate`. Threshold breaches
// recommend a data-only retune of `spawnConfig.ts`; the final decision always
// stays with Eduardo. Engine files under `src/engine/core/` are never touched.

export const FIRST_MERGE_P50_THRESHOLD_S = 25;
export const FIRST_GAMEOVER_P50_THRESHOLD_S = 210;
// Max tolerated max-tile median drop, in ladder tiers. A drop strictly greater
// than this (i.e. >= 2 tiers) triggers a retune recommendation.
export const MAX_TIER_DROP = 1;

export type CalibrationSummary = {
  firstMergeP50Seconds?: number;
  firstGameoverP50Seconds?: number;
  maxTileMedian?: number;
  // clog 1/2 ratio context, informational only: never gated, never required.
  clog12?: number;
};

export type CalibrationBaseline = {
  maxTileMedianBaseline: number;
};

export type CalibrationVerdict = 'retune' | 'ok' | 'unknown';

export type CalibrationGateResult = {
  verdict: CalibrationVerdict;
  needsRetune: boolean;
  reasons: string[];
  missing: string[];
};

// Tier ladder: fixed tiles 1, 2, then POT_CURVE keys extended (3 * 2^k).
function buildLadder(upTo: number): number[] {
  const ladder = [1, 2];
  let v = 3;
  while (v <= upTo) {
    ladder.push(v);
    v *= 2;
  }
  return ladder;
}

// Ladder index of a tile value: exact match, else the nearest lower tier.
// Values below the ladder floor map to index 0 (lowest tier).
function tierIndex(value: number, ladder: number[]): number {
  let idx = 0;
  for (let i = 0; i < ladder.length; i++) {
    if (ladder[i] <= value) idx = i;
    else break;
  }
  return idx;
}

function isUsableNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

export function evaluateCalibrationGate(
  summary: CalibrationSummary,
  baseline: CalibrationBaseline
): CalibrationGateResult {
  const missing: string[] = [];
  const reasons: string[] = [];

  const firstMerge = summary?.firstMergeP50Seconds;
  const firstGameover = summary?.firstGameoverP50Seconds;
  const maxTile = summary?.maxTileMedian;
  const maxTileBaseline = baseline?.maxTileMedianBaseline;

  if (!isUsableNumber(firstMerge)) missing.push('firstMergeP50Seconds');
  if (!isUsableNumber(firstGameover)) missing.push('firstGameoverP50Seconds');
  if (!isUsableNumber(maxTile)) missing.push('maxTileMedian');
  if (!isUsableNumber(maxTileBaseline)) missing.push('maxTileMedianBaseline');

  // Evaluate every present metric even when others are missing, so the
  // operator sees the partial signal; a missing field still forces `unknown`
  // with no retune recommendation.
  if (isUsableNumber(firstMerge) && firstMerge > FIRST_MERGE_P50_THRESHOLD_S) {
    reasons.push(
      `first-merge p50 ${firstMerge}s > threshold ${FIRST_MERGE_P50_THRESHOLD_S}s`
    );
  }
  if (isUsableNumber(firstGameover) && firstGameover > FIRST_GAMEOVER_P50_THRESHOLD_S) {
    reasons.push(
      `first-gameover p50 ${firstGameover}s > threshold ${FIRST_GAMEOVER_P50_THRESHOLD_S}s`
    );
  }
  if (isUsableNumber(maxTile) && isUsableNumber(maxTileBaseline)) {
    const ladder = buildLadder(Math.max(maxTile, maxTileBaseline));
    const drop = tierIndex(maxTileBaseline, ladder) - tierIndex(maxTile, ladder);
    if (drop > MAX_TIER_DROP) {
      reasons.push(
        `max-tile median drop ${drop} tiers (baseline ${maxTileBaseline} -> current ${maxTile}) exceeds max ${MAX_TIER_DROP}`
      );
    }
  }

  if (missing.length > 0) {
    return { verdict: 'unknown', needsRetune: false, reasons, missing };
  }
  if (reasons.length > 0) {
    return { verdict: 'retune', needsRetune: true, reasons, missing };
  }
  return { verdict: 'ok', needsRetune: false, reasons, missing };
}
