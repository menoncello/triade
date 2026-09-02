/**
 * Fixtures — dw-grid-size-configurable (BoardConfig / GRID_SIZE seam)
 * Deterministic, host-only, no faker — pure triade/src/engine/core/* + triade/test-utils/helpers.ts
 * Covers: triade/src/engine/core/types.ts:1-27 BoardConfig {size}, DEFAULT_BOARD_CONFIG, validateGridSize(size) only-4 RangeError, validateBoardConfig(config), resolveGridSize(input?) null→4
 *         triade/src/engine/core/board.ts:1-22 emptyBoard(boardConfig?) + boardsEqual(a,b,boardConfig?) via resolveGridSize + ?. defensive
 *         triade/src/engine/core/game.ts:1-145 newGame(rng,boardConfig?), move(state,dir,rng,boardConfig?), isGameOver(board,boardConfig?) threaded size + opp size-1 + board[r]?.[c]
 *         triade/src/engine/core/line.ts:1-114 movementLines(board,dir,boardConfig?) + boardFromLines(lines,dir,boardConfig?) size + size-1-k placement + board[r]?.[c] ?? null
 *         triade/src/engine/core/spawn.ts:1-127 spawnTile(board,value,rng,candidates,boardConfig?) size empty-scan + r>=size OOB filter
 *         triade/src/engine/core/index.ts:1-4 re-exports GRID_SIZE, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize, BoardConfig
 *         triade/test-utils/helpers.ts:1-170 SIZE=GRID_SIZE alias, re-exports, emptyBoard/staticBoard/boardWith/occupiedCells/oppositeEdgeCandidates threaded + occupiedCells legacy board.length inference
 * Spec: _bmad-output/test-artifacts/test-design-dw-grid-size-configurable.md (10 risks, 3 high R-001/R-002/R-003, P0 10 + P1 8 + P2 4 + P3 3)
 * ATDD: triade/__tests__/engine/grid-size-configurable.atdd.test.ts (18 tests P0 10 + P1 5 + P2 4, GREEN)
 *       _bmad-output/test-artifacts/tests/unit/grid-size-configurable.atdd.test.ts (13 RED-phase dormant mirror)
 *       _bmad-output/test-artifacts/tests/api/grid-size-configurable.gateway.spec.ts (12 RED-phase)
 *       _bmad-output/test-artifacts/tests/e2e/grid-size-configurable.umbrella.spec.ts (12 RED-phase)
 * Run: npm --prefix triade test -- __tests__/engine/grid-size-configurable.atdd.test.ts (18 GREEN)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx helpers (engine pure TS, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GRID_SIZE,
  DEFAULT_BOARD_CONFIG,
  validateGridSize,
  validateBoardConfig,
  resolveGridSize,
  emptyBoard as coreEmptyBoard,
  boardsEqual as coreBoardsEqual,
  movementLines,
  boardFromLines,
  shiftLine,
  spawnTile,
  newGame,
  move,
  isGameOver,
} from '../../../triade/src/engine/core/index.ts';
import {
  SIZE,
  emptyBoard as helperEmptyBoard,
  boardWith,
  staticBoard,
  occupiedCells,
  oppositeEdgeCandidates,
  gameState,
  rngOf,
  spyRng,
  mulberry32,
} from '../../../triade/test-utils/helpers.ts';
import type { Board, BoardConfig } from '../../../triade/src/engine/core/index.ts';

export {
  GRID_SIZE,
  DEFAULT_BOARD_CONFIG,
  validateGridSize,
  validateBoardConfig,
  resolveGridSize,
  coreEmptyBoard,
  coreBoardsEqual,
  movementLines,
  boardFromLines,
  shiftLine,
  spawnTile,
  newGame,
  move,
  isGameOver,
  SIZE,
  helperEmptyBoard,
  boardWith,
  staticBoard,
  occupiedCells,
  oppositeEdgeCandidates,
  gameState,
  rngOf,
  spyRng,
  mulberry32,
};
export type { Board, BoardConfig };

// ── Board factories (no faker) ───────────────────────────────────────────
export function boardHold(): Board {
  return boardWith([
    [1, 2, null, null],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
}

export function boardEmpty(): Board {
  return helperEmptyBoard(4);
}

export function boardFullNoMerge(): Board {
  return boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1],
  ]);
}

export function boardFullWithMerge(): Board {
  return boardWith([
    [3, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1],
  ]);
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

// ── RNG / seed fixtures ──────────────────────────────────────────────────
export const RNG_SEED_20: readonly number[] = Array.from({ length: 20 }, (_, i) => (i + 1) / 100);

// ── Scan strings (single-source grep) ────────────────────────────────────
export const SCAN_STRINGS = {
  GRID_SIZE_DEF: 'export const GRID_SIZE',
  BOARD_CONFIG_INTERFACE: 'export interface BoardConfig',
  BOARD_CONFIG_SIZE_FIELD: 'readonly size: number',
  DEFAULT_BOARD_CONFIG_DEF: 'export const DEFAULT_BOARD_CONFIG',
  VALIDATE_GRID_SIZE_DEF: 'export function validateGridSize',
  VALIDATE_BOARD_CONFIG_DEF: 'export function validateBoardConfig',
  RESOLVE_GRID_SIZE_DEF: 'export function resolveGridSize',
  RANGE_ERROR_UNSUPPORTED: '[BoardConfig] unsupported grid size',
  RANGE_ERROR_INVALID_CONFIG: '[BoardConfig] invalid config',
  RESOLVE_NULL_DEFAULT: 'if (input == null) return GRID_SIZE',
  EMPTY_BOARD_DEF: 'export function emptyBoard',
  BOARDS_EQUAL_DEF: 'export function boardsEqual',
  BOARDS_EQUAL_OPTIONAL: 'a[r]?.[c] !== b[r]?.[c]',
  MOVEMENT_LINES_DEF: 'export function movementLines',
  BOARD_FROM_LINES_DEF: 'export function boardFromLines',
  SIZE_MINUS_ONE_K: 'size - 1 - k',
  OPP_COL_SIZE_MINUS_ONE: 'oppCol = dir ===',
  OPP_ROW_SIZE_MINUS_ONE: 'oppRow = dir ===',
  SIZE_GTE_OOB: 'r >= size || c >= size',
  IS_GAME_OVER_DEF: 'export function isGameOver',
  IS_GAME_OVER_OPTIONAL: 'board[r]?.[c] === null',
  INDEX_REEXPORT_GRID: 'export { GRID_SIZE',
  INDEX_REEXPORT_BOARD_CONFIG: 'BoardConfig',
  INDEX_REEXPORT_VALIDATE: 'validateGridSize',
  INDEX_REEXPORT_RESOLVE: 'resolveGridSize',
  HELPERS_SIZE_ALIAS: 'export const SIZE = GRID_SIZE',
  HELPERS_REEXPORT_FROM: "from '../src/engine/core/index",
  HELPERS_BOARD_LENGTH_FALLBACK: 'board.length || GRID_SIZE',
  LEDGER_HASH: '0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f',
  LEDGER_GRID_FIXED: 'GRID_SIZE fixed 4x4',
  LEDGER_DONE: 'status: done 2026-09-02',
  SPRINT_STATUS: 'sprint-status.yaml',
  BOARD_TYPE: 'export type Board = Cell[][]',
  GAME_STATE_TYPE: 'export interface GameState',
} as const;

// ── Source scan helpers ──────────────────────────────────────────────────
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

export const TYPES_SOURCE_PATH = 'triade/src/engine/core/types.ts';
export const BOARD_SOURCE_PATH = 'triade/src/engine/core/board.ts';
export const GAME_SOURCE_PATH = 'triade/src/engine/core/game.ts';
export const LINE_SOURCE_PATH = 'triade/src/engine/core/line.ts';
export const SPAWN_SOURCE_PATH = 'triade/src/engine/core/spawn.ts';
export const INDEX_SOURCE_PATH = 'triade/src/engine/core/index.ts';
export const HELPERS_SOURCE_PATH = 'triade/test-utils/helpers.ts';
export const LEDGER_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';
export const SPRINT_STATUS_PATH = '_bmad-output/implementation-artifacts/sprint-status.yaml';

// ── Validation helpers (host allowlist gates) ────────────────────────────
export function assertTypesGuard(typesSrc: string): void {
  if (countMatches(typesSrc, /export const GRID_SIZE/g) !== 1) throw new Error(`GRID_SIZE def must be 1, got ${countMatches(typesSrc, /export const GRID_SIZE/g)}`);
  if (countMatches(typesSrc, /export interface BoardConfig/g) !== 1) throw new Error(`BoardConfig interface must be 1, got ${countMatches(typesSrc, /export interface BoardConfig/g)}`);
  if (countMatches(typesSrc, /export const DEFAULT_BOARD_CONFIG/g) !== 1) throw new Error(`DEFAULT_BOARD_CONFIG def must be 1`);
  if (countMatches(typesSrc, /export function validateGridSize/g) !== 1) throw new Error(`validateGridSize def must be 1`);
  if (countMatches(typesSrc, /export function validateBoardConfig/g) !== 1) throw new Error(`validateBoardConfig def must be 1`);
  if (countMatches(typesSrc, /export function resolveGridSize/g) !== 1) throw new Error(`resolveGridSize def must be 1`);
  if (!typesSrc.includes('[BoardConfig] unsupported grid size')) throw new Error('unsupported grid size message missing');
  if (!typesSrc.includes('[BoardConfig] invalid config')) throw new Error('invalid config message missing');
  if (!typesSrc.includes('if (input == null) return GRID_SIZE')) throw new Error('resolveGridSize null→4 default missing');
}

export function assertBoardGuard(boardSrc: string): void {
  if (!boardSrc.includes('resolveGridSize(boardConfig')) throw new Error('emptyBoard/boardsEqual must call resolveGridSize(boardConfig');
  if (!boardSrc.includes('a[r]?.[c] !== b[r]?.[c]')) throw new Error('boardsEqual defensive a[r]?.[c] missing');
}

export function assertLineGuard(lineSrc: string): void {
  if (countMatches(lineSrc, /resolveGridSize\(boardConfig/g) < 2) throw new Error(`line.ts must have ≥2 resolveGridSize(boardConfig, got ${countMatches(lineSrc, /resolveGridSize\(boardConfig/g)}`);
  if (countMatches(lineSrc, /size - 1 - k/g) !== 2) throw new Error(`boardFromLines size - 1 - k must be 2, got ${countMatches(lineSrc, /size - 1 - k/g)}`);
  if (!lineSrc.includes('board[r]?.[c] ?? null')) throw new Error('movementLines defensive board[r]?.[c] ?? null missing');
}

export function assertGameGuard(gameSrc: string): void {
  if (countMatches(gameSrc, /resolveGridSize\(boardConfig/g) < 3) throw new Error(`game.ts must have ≥3 resolveGridSize(boardConfig, got ${countMatches(gameSrc, /resolveGridSize\(boardConfig/g)}`);
  if (!gameSrc.includes('oppCol = dir ===')) throw new Error('move oppCol size-1 missing');
  if (!gameSrc.includes('oppRow = dir ===')) throw new Error('move oppRow size-1 missing');
  if (!gameSrc.includes('size - 1')) throw new Error('move size-1 missing');
  if (!gameSrc.includes('board[r]?.[c] === null')) throw new Error('isGameOver defensive board[r]?.[c] missing');
}

export function assertSpawnGuard(spawnSrc: string): void {
  if (!spawnSrc.includes('resolveGridSize(boardConfig')) throw new Error('spawnTile must call resolveGridSize(boardConfig');
  if (!spawnSrc.includes('r >= size || c >= size')) throw new Error('spawnTile OOB r>=size || c>=size missing');
}

export function assertIndexGuard(indexSrc: string): void {
  if (!indexSrc.includes('GRID_SIZE')) throw new Error('index re-export GRID_SIZE missing');
  if (!indexSrc.includes('BoardConfig')) throw new Error('index re-export BoardConfig missing');
  if (!indexSrc.includes('validateGridSize')) throw new Error('index re-export validateGridSize missing');
  if (!indexSrc.includes('resolveGridSize')) throw new Error('index re-export resolveGridSize missing');
}

export function assertHelpersGuard(helpersSrc: string): void {
  if (!helpersSrc.includes("from '../src/engine/core/index")) throw new Error('helpers must re-export from core/index');
  if (!helpersSrc.includes('export const SIZE = GRID_SIZE')) throw new Error('helpers SIZE alias missing');
}

export function assertLedger(ledgerSrc: string): void {
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_HASH)) throw new Error('ledger must contain 0f53c41e resolution-undo for GRID_SIZE');
  if (countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g')) !== 1) throw new Error(`ledger 0f53c41e must be 1, got ${countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g'))}`);
  if (!/GRID_SIZE fixed 4x4[\s\S]*?status: done 2026-09-02/.test(ledgerSrc)) throw new Error('GRID_SIZE fixed 4x4 must be done 2026-09-02');
}

// ── Gate constants (single-source) ───────────────────────────────────────
export const GATE_CONSTANTS = {
  GRID_SIZE: 4,
  BOARD_SIZE: 4,
  DEFAULT_BOARD_CONFIG: { size: 4 },
} as const;

export const LEDGER = {
  GRID_SIZE: 'GRID_SIZE fixed 4x4',
  HASH: '0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f',
  DATE: '2026-09-02',
  BUNDLE: 'dw-grid-size-configurable',
  BASELINE: 'ea21dce',
} as const;
