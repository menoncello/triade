import { test } from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';
import * as engine from '../src/engine/core/index.ts';
import type { Board, Rng } from '../src/engine/core/index.ts';
import { emptyBoard, mulberry32, gameState } from '../test-utils/helpers.ts';

const GRID_SIZE = engine.GRID_SIZE;

// Recalibrated 2026-08-09 from S1.1 spike baseline (measured medians
// ~0.001 ms/turn engine, ~0.001 ms p99 frame-logic tail). Budgets keep ~100x
// headroom over the baseline so the gate catches real regressions without
// flaking on CI. Re-measure before relaxing.
// Frame-logic is measured as the p99 tail (not the literal max): raw max is
// GC/OS-noisy on CI; the p99 tail tracks deterministically and matches the
// device-level p99 job. Renamed 2026-08-10 to "tail p99" to avoid claiming a
// worst-case metric the gate does not assert.
const BUDGET_ENGINE_PER_TURN_MS = 0.1;
const BUDGET_FRAME_TAIL_P99_MS = 0.2;
const TURNS = 10000;
const WARMUP = 1000;

const REACHABLE_VALUES = [1, 2, 3, 6, 12];

function boardWith(matrix: Array<Array<number | null>>): Board {
  const b = emptyBoard();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (matrix[r][c] !== null) b[r][c] = matrix[r][c];
    }
  }
  return b;
}

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

test('benchmark: engine cost per turn < 0.1ms (spawn + merge-once + game-over detection)', () => {
  const rng = mulberry32(20260808);
  for (let i = 0; i < WARMUP; i++) {
    const board = seededRandomBoard(rng);
    engine.move(gameState(board), DIRECTIONS[Math.floor(rng() * 4)], rng);
  }

  const samples: number[] = [];
  while (samples.length < TURNS) {
    const board = seededRandomBoard(rng);
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    const start = performance.now();
    const res = engine.move(gameState(board), dir, rng);
    engine.isGameOver(res.board);
    const elapsed = performance.now() - start;
    if (res.moved) samples.push(elapsed);
  }
  const perTurnMs = median(samples);

  assert.ok(
    perTurnMs < BUDGET_ENGINE_PER_TURN_MS,
    `engine cost per turn ${perTurnMs.toFixed(4)}ms >= budget ${BUDGET_ENGINE_PER_TURN_MS}ms`
  );
});

test('benchmark: frame-logic tail p99 < 0.2ms (merge-heavy slides across all directions)', () => {
  const rng = mulberry32(424242);
  const boards = [
    boardWith([
      [3, 3, 6, 12],
      [3, 3, 6, 12],
      [3, 3, 6, 12],
      [3, 3, 6, 12]
    ]),
    boardWith([
      [3, 3, 3, 3],
      [6, 6, 6, 6],
      [12, 12, 12, 12],
      [24, 24, 24, 24]
    ]),
    boardWith([
      [1, 2, 1, 2],
      [1, 2, 1, 2],
      [1, 2, 1, 2],
      [1, 2, 1, 2]
    ]),
    boardWith([
      [1, 3, 6, 12],
      [1, 3, 6, 12],
      [1, 3, 6, 12],
      [1, 3, 6, 12]
    ])
  ];
  for (let i = 0; i < WARMUP; i++) {
    const b = boards[i % boards.length];
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    engine.move(gameState(b), dir, rng);
  }

  const samples: number[] = [];
  for (let i = 0; i < TURNS; i++) {
    const b = boards[i % boards.length];
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    const start = performance.now();
    engine.move(gameState(b), dir, rng);
    samples.push(performance.now() - start);
  }
  const tailMs = percentile(samples, 0.99);

  assert.ok(
    tailMs < BUDGET_FRAME_TAIL_P99_MS,
    `frame-logic tail p99 ${tailMs.toFixed(4)}ms >= budget ${BUDGET_FRAME_TAIL_P99_MS}ms`
  );
});
