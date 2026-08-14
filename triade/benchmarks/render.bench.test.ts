import { test } from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';
import * as engine from '../src/engine/core/index.ts';
import type { Board, Rng } from '../src/engine/core/index.ts';
import { emptyBoard, mulberry32 } from '../test-utils/helpers.ts';
import { planTileTransitions, resultingTiles } from '../src/render/transitionPlan.ts';

const GRID_SIZE = engine.GRID_SIZE;

// Story 1.3 NFR-1: the planner runs on every effective move inside the frame
// budget. Measured baseline 2026-08-13: median ~0.0002 ms, p99 ~0.0004 ms on
// random seeded boards. Budget keeps ~100x headroom over the baseline so the
// gate catches real regressions (e.g., accidental O(n^2) matching) without
// flaking on CI. Each sample is the mean of BATCH calls so timer resolution
// and GC pauses do not move a single-sample p99 (wall-clock flake guard).
const BUDGET_PLAN_MEDIAN_MS = 0.05;
const BUDGET_PLAN_TAIL_P99_MS = 0.1;
const TURNS = 10000;
const WARMUP = 1000;
const BATCH = 50;

const REACHABLE_VALUES = [1, 2, 3, 6, 12];

function seededRandomBoard(rng: Rng): Board {
  const b = emptyBoard();
  const filled: Array<[number, number]> = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) filled.push([r, c]);
  }
  const count = 6 + Math.floor(rng() * 10);
  for (let i = 0; i < count && filled.length > 0; i++) {
    const idx = Math.floor(rng() * filled.length);
    const [r, c] = filled.splice(idx, 1)[0];
    b[r][c] = REACHABLE_VALUES[Math.floor(rng() * REACHABLE_VALUES.length)];
  }
  return b;
}

const DIRECTIONS = ['left', 'right', 'up', 'down'] as const;

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
  return sorted[idx];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

test('benchmark: transition-plan cost per move < 0.05ms median / 0.1ms p99 (frame budget headroom)', () => {
  const rng = mulberry32(20260808);
  for (let i = 0; i < WARMUP; i++) {
    const board = seededRandomBoard(rng);
    const res = engine.move(board, DIRECTIONS[Math.floor(rng() * 4)], rng);
    planTileTransitions(board, res);
  }

  const samples: number[] = [];
  while (samples.length < TURNS) {
    const board = seededRandomBoard(rng);
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    const res = engine.move(board, dir, rng);
    if (!res.moved) continue;
    const start = performance.now();
    for (let b = 0; b < BATCH; b++) {
      const plan = planTileTransitions(board, res);
      resultingTiles(plan);
    }
    samples.push((performance.now() - start) / BATCH);
  }
  const medMs = median(samples);
  const tailMs = percentile(samples, 0.99);

  assert.ok(
    medMs < BUDGET_PLAN_MEDIAN_MS,
    `transition-plan median ${medMs.toFixed(4)}ms >= budget ${BUDGET_PLAN_MEDIAN_MS}ms`
  );
  assert.ok(
    tailMs < BUDGET_PLAN_TAIL_P99_MS,
    `transition-plan tail p99 ${tailMs.toFixed(4)}ms >= budget ${BUDGET_PLAN_TAIL_P99_MS}ms`
  );
});
