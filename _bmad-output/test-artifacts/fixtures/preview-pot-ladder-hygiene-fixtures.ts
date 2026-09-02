// TEA Automate — Fixture helpers for dw-preview-pot-ladder-hygiene
// Deterministic, no @faker-js/faker — sigmaBound + stateFromResult are pure helpers with fixed seeds.
// Host-only: node:test + tsx, no RN/Reanimated/Skia mount, no Playwright browser.
// Spec: spec-preview-pot-ladder-hygiene.md (DW-61/62/63 hygiene: sigma gate 5σ + ±1%, single helper, tier-0 exception, baseline 3a6038e → working tree)
// Test-design: test-design-dw-preview-pot-ladder-hygiene.md (8 risks, 2 high score 6: R-001 sigma flake, R-002 dedup drift)
// ATDD: triade/__tests__/engine/preview-pot-ladder-hygiene.atdd.test.ts (19 it.skip scaffolds, P0 7 + P1 5 + P2 4 + P3 3)

import { POT_WEIGHT } from '../../../triade/src/engine/config/spawnConfig.ts';
import {
  POT_WEIGHT as POT_WEIGHT_REEXPORT,
  potForTier,
  potWeights,
  normalizeTo,
  weightedPicker,
  weightedValue,
  tierForCeiling,
  resolveSpawn,
} from '../../../triade/src/engine/core/index.ts';
import * as game from '../../../triade/src/engine/core/index.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import {
  sigmaBound,
  stateFromResult,
  stateFromResult as helpersStateFromResult,
  rngOf,
  spyRng,
  gameState,
  emptyBoard,
  staticBoard,
  boardWith,
  runSeededSession,
} from '../../../triade/test-utils/helpers.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Deterministic fixtures — mirror helpers.ts + engine fixtures
// ---------------------------------------------------------------------------
export const FIXTURE_SEED = {
  weightsTier1and5: 0x2a4d,
  tier0CeilingBase: 0x51ce,
} as const;

export const N_WEIGHTS = 100_000;
export const SIGMA_Z = 5;
export const SIGMA_5_AT_0_2_100K = SIGMA_Z * Math.sqrt((0.2 * 0.8) / N_WEIGHTS); // ≈0.0063249

export function expectedSigmaBound(): number {
  return sigmaBound(POT_WEIGHT, N_WEIGHTS, SIGMA_Z);
}

export function potRatioWithinSigma(potSamples: number, n: number): boolean {
  return Math.abs(potSamples / n - POT_WEIGHT) < sigmaBound(POT_WEIGHT, n, SIGMA_Z);
}
export function potRatioWithinOnePercent(potSamples: number, n: number): boolean {
  return Math.abs(potSamples / n - POT_WEIGHT) < 0.01;
}

// ---------------------------------------------------------------------------
// Sigma gate — recreates weights.test.ts authority stream
// ---------------------------------------------------------------------------
export function samplePotShare(tier: number, n = N_WEIGHTS, seed = FIXTURE_SEED.weightsTier1and5): { potSamples: number; ratio: number; bound: number } {
  const rng = mulberry32(seed + tier * 1000);
  let potSamples = 0;
  const pot = potForTier(tier);
  for (let i = 0; i < n; i++) {
    const v = (weightedValue as unknown as (rng: () => number) => number)(rng);
    if (pot.includes(v)) potSamples++;
  }
  return { potSamples, ratio: potSamples / n, bound: sigmaBound(POT_WEIGHT, n) };
}

// ---------------------------------------------------------------------------
// stateFromResult — single definition seam
// ---------------------------------------------------------------------------
export function makeSampleMoveResult() {
  const board = emptyBoard();
  board[0][0] = 1;
  return {
    board,
    score: 3,
    moved: true,
    trace: [] as never[],
    pendingSpawn: { value: 1, displayRoll: 0.5 },
  } as unknown as game.MoveResult;
}

export function assertBoardRefShared(result: game.MoveResult): boolean {
  const state = game.stateFromResult(result);
  return state.board === result.board && state.pendingSpawn === result.pendingSpawn;
}

export function helperIsSameReexport(): boolean {
  return (game.stateFromResult as unknown) === (helpersStateFromResult as unknown);
}

// ---------------------------------------------------------------------------
// Tier-0 exception — 2000 draws per ceiling 0/1/2
// ---------------------------------------------------------------------------
export function scanTier0Ceiling(ceiling: 0 | 1 | 2, draws = 2000): { sawThree: boolean; sawExceeding: boolean; values: number[] } {
  const rng = mulberry32(FIXTURE_SEED.tier0CeilingBase + ceiling + 0x100);
  let sawThree = false;
  let sawExceeding = false;
  const values: number[] = [];
  for (let i = 0; i < draws; i++) {
    const v = resolveSpawn(ceiling, rng);
    values.push(v);
    if (v === 3) sawThree = true;
    if (v > ceiling) sawExceeding = true;
  }
  return { sawThree, sawExceeding, values };
}

export function scanTierGte1Ceilings(ceilings = [48, 96, 192, 384, 768, 1536], draws = 2000): Array<{ ceiling: number; ok: boolean }> {
  return ceilings.map((ceiling) => {
    const rng = mulberry32(FIXTURE_SEED.tier0CeilingBase + ceiling);
    let ok = true;
    for (let i = 0; i < draws; i++) {
      const v = resolveSpawn(ceiling, rng);
      if (v > ceiling) ok = false;
    }
    return { ceiling, ok };
  });
}

export function isValidSpawnValueLocal(v: number): boolean {
  if (v === 1 || v === 2) return true;
  const k = Math.log2(v / 3);
  return v >= 3 && Number.isInteger(k);
}

// ---------------------------------------------------------------------------
// Draw-budget — 3 effective / 20 newGame
// ---------------------------------------------------------------------------
export function drawBudgetForEffective(): number {
  return 3;
}
export function drawBudgetForNewGame(): number {
  return 20;
}

export function rewindPair(): { r1: game.MoveResult; r2a: game.MoveResult; r2b: game.MoveResult } {
  const base = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
  const r1 = game.move(base, 'left', rngOf(0.1, 0.2, 0.3));
  const replayInput = game.stateFromResult(r1);
  const r2a = game.move(replayInput, 'right', rngOf(0.25, 0.35, 0.45));
  const r2b = game.move({ board: r1.board, pendingSpawn: { ...r1.pendingSpawn } } as never, 'right', rngOf(0.25, 0.35, 0.45));
  return { r1, r2a, r2b };
}

// ---------------------------------------------------------------------------
// Source-scan helpers — single helper / single threshold invariants
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function gameSrc(): string {
  return readSrc('triade/src/engine/core/game.ts');
}
export function indexSrc(): string {
  return readSrc('triade/src/engine/core/index.ts');
}
export function helpersSrc(): string {
  return readSrc('triade/test-utils/helpers.ts');
}
export function weightsSrc(): string {
  return readSrc('triade/__tests__/engine/weights.test.ts');
}
export function adaptiveSrc(): string {
  return readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
}

export function boardResultLiteralCount(src: string): number {
  return (src.match(/board: result\.board/g) ?? []).length;
}
export function stateFromResultDefCount(): number {
  return (gameSrc().match(/export function stateFromResult/g) ?? []).length;
}
export function oldFloorCount(): number {
  return (weightsSrc().match(/potSamples > N \* 0\.1/g) ?? []).length;
}
export function sigmaBoundCallCount(): number {
  return (weightsSrc().match(/sigmaBound\(POT_WEIGHT/g) ?? []).length;
}

export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function sprintStatusSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
}

// ---------------------------------------------------------------------------
// Bench helper — stateFromResult O(1) <1 ms per call, 10k <80 ms
// ---------------------------------------------------------------------------
export function stateFromResultBench(iterations = 10_000): { elapsed: number; ok: boolean } {
  const b = emptyBoard();
  b[0][0] = 1;
  const res = { board: b, score: 0, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } } as unknown as game.MoveResult;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) game.stateFromResult(res);
  const elapsed = performance.now() - t0;
  const probe = game.stateFromResult(res);
  const ok = probe.board === b && elapsed < 80;
  return { elapsed, ok };
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export {
  POT_WEIGHT,
  potForTier,
  potWeights,
  normalizeTo,
  weightedPicker,
  weightedValue,
  tierForCeiling,
  resolveSpawn,
  mulberry32,
  sigmaBound,
  stateFromResult,
  helpersStateFromResult,
  rngOf,
  spyRng,
  gameState,
  emptyBoard,
  staticBoard,
  boardWith,
  runSeededSession,
};
