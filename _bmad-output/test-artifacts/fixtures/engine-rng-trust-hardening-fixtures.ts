/**
 * Fixtures — dw-engine-rng-trust-hardening (DW-56)
 * Malformed-RNG trust hardening: weightedPicker clamp + normalizeDisplayRoll + [0,1) + draw-budget
 * Deterministic, host-only, no faker — pure engine weights.ts:20-37 + game.ts:8-18,34,110
 * Covers: triade/src/engine/core/weights.ts:20-37 safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON) + scaled = safeRoll*total
 *         triade/src/engine/core/game.ts:8-18 normalizeDisplayRoll(raw:unknown) + :34 newGame + :110 move effective path
 *         triade/src/engine/core/spawn.ts:46-60 pickIndex already finite guard (reference for DATA chain)
 *         triade/src/engine/core/types.ts:1-30 Rng = () => number, PendingSpawn {value, displayRoll}, GRID_SIZE=4, draw-budget 20/3/0/1
 * Spec: _bmad-output/implementation-artifacts/deferred-work.md DW-56
 *       baseline 2e91c12 → working-tree triade/src/engine/core/game.ts 16-line normalizeDisplayRoll + triade/src/engine/core/weights.ts 7-line safeRoll + deferred-work.md DW-56 done
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-engine-rng-trust-hardening.md (9 risks, 3 high score 6: R-001/R-002/R-003 weightedPicker/displayRoll/draw-budget)
 *         _bmad-output/test-artifacts/test-design-dw-engine-rng-trust-hardening.md (mirror canonical)
 * ATDD: triade/__tests__/engine/rng-trust-hardening.atdd.test.ts (20 it.skip RED-phase scaffolds, host node:test+tsx, 10 P0 +4 P1 +4 P2 +2 P3)
 *       _bmad-output/test-artifacts/tests/unit/engine-rng-trust-hardening.atdd.test.ts (20 RED-phase dormant mirror)
 *       _bmad-output/test-artifacts/tests/api/engine-rng-trust-hardening.gateway.spec.ts (14 active)
 *       _bmad-output/test-artifacts/tests/e2e/engine-rng-trust-hardening.umbrella.spec.ts (9 active)
 * Run: npm --prefix triade test -- __tests__/engine/rng-trust-hardening.atdd.test.ts  (20 dormant→20 pass when activated)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx helpers (engine pure TS, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { weightedPicker } from '../../../triade/src/engine/core/weights.ts';
import { newGame, move, stateFromResult } from '../../../triade/src/engine/core/game.ts';
import { GRID_SIZE } from '../../../triade/src/engine/core/types.ts';
import {
  boardWith,
  emptyBoard,
  gameState,
  rngOf,
  spyRng,
  mulberry32,
  staticBoard,
  runSeededSession,
  occupiedCells,
  resultingTiles,
} from '../../../triade/test-utils/helpers.ts';
import type { Board, Direction, GameState, PendingSpawn } from '../../../triade/src/engine/core/index.ts';

export { boardWith, emptyBoard, gameState, rngOf, spyRng, mulberry32, staticBoard, runSeededSession, occupiedCells, resultingTiles, weightedPicker, newGame, move, stateFromResult, GRID_SIZE };
export type { Board, Direction, GameState, PendingSpawn };

// ── Deterministic board factories (no faker) ───────────────────────────
export function gameOverBoard(): Board {
  return boardWith([
    [3, 6, 3, 6],
    [6, 3, 6, 3],
    [3, 6, 3, 6],
    [6, 3, 6, 3],
  ]);
}

export function effective12Board(): Board {
  const b = staticBoard([1, 2, null, null]);
  return b;
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

// ── RNG scalar wall fixtures ───────────────────────────────────────────
export const RNG_WALL = {
  NEG: -0.5 as unknown as number,
  NEG_1: -1 as unknown as number,
  NEG_INF: -Infinity as unknown as number,
  ZERO: 0 as unknown as number,
  SMALL: 0.3 as unknown as number,
  MID: 0.5 as unknown as number,
  NEAR_06: 0.599 as unknown as number,
  AT_06: 0.6 as unknown as number,
  NEAR_1: 0.999 as unknown as number,
  ONE: 1 as unknown as number,
  ONE_HALF: 1.5 as unknown as number,
  INF: Infinity as unknown as number,
  NAN: NaN as unknown as number,
  EPSILON: (1 - Number.EPSILON) as unknown as number,
} as const;

export const MALFORMED_DISPLAY_ROLLS: ReadonlyArray<{ raw: unknown; expected: number; label: string }> = [
  { raw: NaN, expected: 0.5, label: 'NaN→0.5' },
  { raw: Infinity, expected: 0.5, label: 'Infinity→0.5' },
  { raw: -Infinity, expected: 0.5, label: '-Infinity→0.5' },
  { raw: undefined, expected: 0.5, label: 'undefined→0.5' },
  { raw: null, expected: 0.5, label: 'null→0.5' },
  { raw: 'bad', expected: 0.5, label: '"bad"→0.5' },
  { raw: {}, expected: 0.5, label: '{}→0.5' },
  { raw: -0.5, expected: 0, label: '-0.5→0' },
  { raw: -1, expected: 0, label: '-1→0' },
  { raw: 0, expected: 0, label: '0→0' },
  { raw: 0.5, expected: 0.5, label: '0.5→0.5' },
  { raw: 0.999, expected: 0.999, label: '0.999→0.999' },
  { raw: 1, expected: 1 - Number.EPSILON, label: '1→1-EPSILON' },
  { raw: 1.5, expected: 1 - Number.EPSILON, label: '1.5→1-EPSILON' },
] as const;

export const WEIGHTS_FIXTURE: readonly number[] = [1, 0.5] as const;

export const SCAN_STRINGS = {
  SAFE_ROLL_DEF: 'const safeRoll',
  SAFE_ROLL_USE: 'safeRoll',
  MATH_MIN_MAX_ROLL: 'Math.min(Math.max(roll',
  SCALED_SAFE_ROLL: 'const scaled = safeRoll * total',
  SCALED_BARE: 'const scaled = roll * total',
  EPSILON_WEIGHTS: 'Number.EPSILON',
  EPSILON_GAME: 'Number.EPSILON',
  ONE_MINUS_EPSILON: '1 - Number.EPSILON',
  NORMALIZE_DEF: 'function normalizeDisplayRoll',
  NORMALIZE_CALLS: 'normalizeDisplayRoll',
  RETURN_05: 'return 0.5',
  RETURN_0_NEG: 'if (raw < 0) return 0',
  RAW_GTE_1: 'raw >= 1',
  DISPLAY_ROLL_BARE: 'displayRoll: rng()',
  TYPEOF_ROLL: "typeof roll !== 'number'",
  ISNAN_ROLL: 'Number.isNaN(roll)',
  FINITE_RAW: '!Number.isFinite(raw)',
  TYPEOF_RAW: "typeof raw !== 'number'",
  DR_WINDOW: 'dr >= 0 && dr < 1',
  WHILE_RNG: 'while.*rng',
  RNG_CALL: 'rng()',
  GRID_SIZE_4: 'GRID_SIZE = 4',
  RESOLUTION_UNDO: 'resolution-undo',
  HASH_0EB6CE61: '0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e',
  HEX_TAIL: '7374617475733a206f70656e',
  SPRINT_STATUS: 'sprint-status.yaml',
  MUSIC_LEAK: 'Music|bgm|RevenueCat|AdMob',
} as const;

// ── Source scan helpers ─────────────────────────────────────────────────
const __dirname_fixture = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname_fixture, '../../..');

export function readSource(relativePath: string): string {
  return readFileSync(join(PROJECT_ROOT, relativePath), 'utf8');
}

export function countMatches(source: string, pattern: RegExp | string): number {
  const re =
    typeof pattern === 'string'
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  return (source.match(re) || []).length;
}

export const WEIGHTS_SOURCE_PATH = 'triade/src/engine/core/weights.ts';
export const GAME_SOURCE_PATH = 'triade/src/engine/core/game.ts';
export const SPAWN_SOURCE_PATH = 'triade/src/engine/core/spawn.ts';
export const TYPES_SOURCE_PATH = 'triade/src/engine/core/types.ts';
export const LEDGER_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';
export const SPEC_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';

// ── Validation helpers (host allowlist gates) ──────────────────────────
export function assertWeightsGuard(weightsSrc: string): void {
  if (countMatches(weightsSrc, /const safeRoll/g) !== 1) throw new Error(`weights const safeRoll must be 1, got ${countMatches(weightsSrc, /const safeRoll/g)}`);
  if (countMatches(weightsSrc, /safeRoll/g) !== 2) throw new Error(`weights safeRoll total 2 (def+use), got ${countMatches(weightsSrc, /safeRoll/g)}`);
  if (countMatches(weightsSrc, /Math\.min\(Math\.max\(roll/g) !== 1) throw new Error(`Math.min(Math.max(roll must be 1, got ${countMatches(weightsSrc, /Math\.min\(Math\.max\(roll/g)}`);
  if (countMatches(weightsSrc, /const scaled = roll \* total/g) !== 0) throw new Error(`no bare const scaled = roll * total, got ${countMatches(weightsSrc, /const scaled = roll \* total/g)}`);
  if (countMatches(weightsSrc, /const scaled = safeRoll \* total/g) !== 1) throw new Error(`safeRoll scaled must be 1, got ${countMatches(weightsSrc, /const scaled = safeRoll \* total/g)}`);
  if (countMatches(weightsSrc, /Number\.EPSILON/g) !== 1) throw new Error(`weights Number.EPSILON must be 1, got ${countMatches(weightsSrc, /Number\.EPSILON/g)}`);
  if (countMatches(weightsSrc, /1 - Number\.EPSILON/g) !== 1) throw new Error(`weights 1 - Number.EPSILON must be 1`);
  if (!weightsSrc.includes("typeof roll !== 'number'")) throw new Error("weights typeof roll !== 'number' guard missing");
  if (!weightsSrc.includes('Number.isNaN(roll)')) throw new Error('weights Number.isNaN(roll) guard missing');
  if (countMatches(weightsSrc, /rng\(\)/g) !== 1) throw new Error(`weights rng() single draw site 1, got ${countMatches(weightsSrc, /rng\(\)/g)}`);
  if (countMatches(weightsSrc, /while.*rng/g) !== 0) throw new Error('weights no while rng');
}

export function assertGameGuard(gameSrc: string): void {
  if (countMatches(gameSrc, /function normalizeDisplayRoll/g) !== 1) throw new Error(`normalizeDisplayRoll def 1, got ${countMatches(gameSrc, /function normalizeDisplayRoll/g)}`);
  if (countMatches(gameSrc, /normalizeDisplayRoll/g) !== 3) throw new Error(`normalizeDisplayRoll total 3 (def+2 calls), got ${countMatches(gameSrc, /normalizeDisplayRoll/g)}`);
  if (countMatches(gameSrc, /Number\.EPSILON/g) !== 1) throw new Error(`game Number.EPSILON 1, got ${countMatches(gameSrc, /Number\.EPSILON/g)}`);
  if (countMatches(gameSrc, /1 - Number\.EPSILON/g) !== 1) throw new Error(`game 1 - Number.EPSILON 1`);
  if (countMatches(gameSrc, /return 0\.5/g) !== 1) throw new Error(`game return 0.5 midpoint 1, got ${countMatches(gameSrc, /return 0\.5/g)}`);
  if (countMatches(gameSrc, /displayRoll:\s*rng\(\)/g) !== 0) throw new Error(`no bare displayRoll: rng(), got ${countMatches(gameSrc, /displayRoll:\s*rng\(\)/g)}`);
  if (countMatches(gameSrc, /while.*rng/g) !== 0) throw new Error('game no while rng');
  if (countMatches(gameSrc, /raw >= 1/g) !== 1) throw new Error(`raw >=1 1, got ${countMatches(gameSrc, /raw >= 1/g)}`);
  if (countMatches(gameSrc, /if \(raw < 0\) return 0/g) !== 1) throw new Error(`if (raw <0) return 0 1`);
  if (countMatches(gameSrc, /dr >= 0 && dr < 1/g) !== 1) throw new Error(`sanitizePending dr >=0 && dr <1 1`);
}

export function assertEpsilonMidpoint(weightsSrc: string, gameSrc: string): void {
  if (countMatches(weightsSrc, /1 - Number\.EPSILON/g) !== 1) throw new Error('weights 1-EPSILON 1');
  if (countMatches(gameSrc, /1 - Number\.EPSILON/g) !== 1) throw new Error('game 1-EPSILON 1');
  if (countMatches(weightsSrc, /1e-9/g) !== 0 || countMatches(gameSrc, /1e-9/g) !== 0) throw new Error('no 1e-9 surrogate');
  if (countMatches(weightsSrc, /return 0\.5/g) !== 0) throw new Error('weights return 0.5 0 (midpoint only in game)');
  if (countMatches(gameSrc, /return 0\.5/g) !== 1) throw new Error('game return 0.5 1');
}

export function assertDrawBudget(weightsSrc: string, gameSrc: string): void {
  if (countMatches(weightsSrc, /rng\(\)/g) !== 1) throw new Error(`weights rng() 1`);
  if (countMatches(weightsSrc, /while.*rng/g) !== 0) throw new Error('no while rng in weights');
  if (countMatches(gameSrc, /while.*rng/g) !== 0) throw new Error('no while rng in game');
}

export function assertCrossCutting(weightsSrc: string, gameSrc: string): void {
  if (countMatches(weightsSrc, /Music|bgm|RevenueCat|AdMob/g) !== 0) throw new Error('weights no cross-cutting Music/bgm/RevenueCat/AdMob');
  if (countMatches(gameSrc, /Music|bgm|RevenueCat|AdMob/g) !== 0) throw new Error('game no cross-cutting');
}

export function assertLedger(ledgerSrc: string): void {
  if (!ledgerSrc.includes(SCAN_STRINGS.HASH_0EB6CE61)) throw new Error('ledger must contain 0eb6ce61 resolution-undo for DW-56');
  if (countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.HASH_0EB6CE61, 'g')) !== 1) throw new Error(`ledger 0eb6ce61 must be 1 hit DW-56, got ${countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.HASH_0EB6CE61, 'g'))}`);
  if (!/DW-56[\s\S]*?status: done 2026-09-02/.test(ledgerSrc)) throw new Error('DW-56 must be done 2026-09-02');
  if (!ledgerSrc.includes('resolved by sweep bundle dw-engine-rng-trust-hardening')) throw new Error('ledger resolution line dw-engine-rng-trust-hardening');
}

// ── Host probe helpers ───────────────────────────────────────────────────
export function assertDisplayRollValid(v: number, label: string): void {
  if (typeof v !== 'number') throw new Error(`${label} typeof number got ${typeof v}`);
  if (!Number.isFinite(v)) throw new Error(`${label} finite got ${v}`);
  if (!(v >= 0 && v < 1)) throw new Error(`${label} ∈ [0,1) got ${v}`);
}

export const LEDGER = {
  DW56: 'DW-56',
  HASH: '0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e',
  HEX_TAIL: '7374617475733a206f70656e',
  DATE: '2026-09-02',
  BUNDLE: 'dw-engine-rng-trust-hardening',
  BASELINE: '2e91c12',
} as const;
