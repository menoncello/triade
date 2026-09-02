/**
 * Fixtures — dw-spawn-weight-validation (deterministic, host-only, no faker)
 * Runtime guard for spawn weight invariants (DW-46)
 * Covers: triade/src/engine/config/spawnConfig.ts:127-137 self-check
 *         triade/src/engine/core/spawn.ts:2,8-17 caller wiring
 *         triade/src/engine/core/weights.ts:20-32 weightedPicker re-normalization
 * Mirrors triade/test-utils/helpers.ts deterministic harness
 * No Playwright test.extend — pure node:test + tsx helpers.
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POT_WEIGHT, POT_CURVE, FIXED_WEIGHTS, validateSpawnConfig } from '../../../triade/src/engine/core/index.ts';
import { FIXED_WEIGHTS as FW } from '../../../triade/src/engine/config/spawnConfig.ts';
import { extractSpecifiers, stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

export { POT_WEIGHT, POT_CURVE, FIXED_WEIGHTS, validateSpawnConfig, extractSpecifiers, stripCommentsAndStrings };

// ── Deterministic config factories ────────────────────────────────────────
export const DEFAULT_CURVE: Readonly<Record<number, number>> = {
  3: 1,
  6: 0.5,
  12: 0.25,
  24: 0.125,
  48: 0.0625,
  96: 0.03125,
} as const;

export type SpawnTestConfig = { potCurve: Record<number, number>; fixedWeights: Record<number, number> };

export function spawnConfigOf(overrides: Partial<SpawnTestConfig> = {}): SpawnTestConfig {
  return { potCurve: { ...DEFAULT_CURVE }, fixedWeights: { ...FW } as any, ...overrides };
}

// ── Shipped defaults (single-source verification) ─────────────────────────
export const SHIPPED_DEFAULTS = {
  POT_WEIGHT: 0.2,
  FIXED_WEIGHTS: { 1: 0.4, 2: 0.4 } as const,
  POT_BASE_VALUE: 3,
  POT_CURVE: { 3: 1, 6: 0.5, 12: 0.25, 24: 0.125, 48: 0.0625, 96: 0.03125 } as const,
  EPSILON: 1e-9,
  FIXED_SUM_EXPECTED: 0.8, // 1 - 0.2
} as const;

// ── Drift fixtures ────────────────────────────────────────────────────────
export const DRIFT_FIXTURES = {
  /** sum 0.85 vs 0.8 diff 0.05 >> 1e-9 — must fail fast */
  beyondEpsilon: spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } }),
  /** within 5e-10 — must be accepted */
  withinEpsilon: spawnConfigOf({ fixedWeights: { 1: 0.40000000024, 2: 0.39999999976 } as any }),
  /** diff 1.1e-9 — just beyond epsilon boundary */
  justBeyond: spawnConfigOf({ fixedWeights: { 1: 0.4000000006, 2: 0.4000000005 } as any }),
} as const;

export const POISON_FIXTURES: Array<[string, Record<number, number>]> = [
  ['NaN', { 1: NaN, 2: 0.4 }],
  ['Infinity', { 1: Infinity, 2: 0.4 }],
  ['zero', { 1: 0, 2: 0.4 }],
  ['negative', { 1: -0.25, 2: 0.4 }],
] as const;

// ── Scan helpers ──────────────────────────────────────────────────────────
const __dirname_fixture = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname_fixture, '../../..');

export function readSource(relativePath: string): string {
  return readFileSync(join(PROJECT_ROOT, relativePath), 'utf8');
}

export const SPAWN_WEIGHT_CONSTANTS = {
  POT_WEIGHT: 0.2,
  EPSILON: 1e-9,
  POT_BASE_VALUE: 3,
  GRID_SIZE: 4,
  FIXED_SUM: 0.8,
} as const;

export const LEDGER = {
  DW: 'DW-46',
  HASH: 'db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b',
  TAIL_HEX: '7374617475733a206f70656e', // ASCII "status: open"
  DATE: '2026-09-02',
} as const;

// ── Validation helpers ────────────────────────────────────────────────────
export function assertShippedDefaultsOk(): void {
  const res = validateSpawnConfig();
  if (res.ok !== true) throw new Error(`shipped defaults must be ok:true, got ${JSON.stringify(res)}`);
}

export function assertDriftRejected(cfg: SpawnTestConfig, label: string): void {
  const res = validateSpawnConfig(cfg as any) as any;
  if (res.ok !== false) throw new Error(`${label} must be ok:false`);
  if (!res.errors.length) throw new Error(`${label} errors must be non-empty`);
}
