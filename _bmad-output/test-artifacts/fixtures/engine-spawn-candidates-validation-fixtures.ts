/**
 * Fixtures — dw-engine-spawn-candidates-validation (DW-72/DW-73)
 * Single-source pool validation + Set dedup for second callers — pure spawnTile seam
 * Deterministic, host-only, no faker — pure engine spawnTile(Board,number,Rng,candidates?)→SpawnResult
 * Covers: triade/src/engine/core/spawn.ts:102-122  loop + Set<string>  !Array.isArray guards
 *         triade/src/engine/core/game.ts:53-78 byte-identical opposite-edge distinct empties
 *         triade/src/engine/core/types.ts:1 GRID_SIZE=4 bounds
 *         triade/test-utils/helpers.ts spyRng/rngOf/mulberry32/boardWith/emptyBoard/gameState
 * Spec: _bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md
 *       baseline 51e4677 → final ed54b4e  working-tree ed54b4e (loop+Set, game.ts 0)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-engine-spawn-candidates-validation.md (10 risks, 3 high score 6: R-001 destructuring throw, R-002 dedup bias, R-003 draw-budget)
 * ATDD: triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts (20 RED-phase it.skip, host node:test+tsx)
 *       _bmad-output/test-artifacts/tests/unit/engine-spawn-candidates-validation.atdd.test.ts (20 RED-phase)
 *       _bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts (14)
 *       _bmad-output/test-artifacts/tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts (9)
 * Run: npm --prefix triade test -- __tests__/engine/spawn-candidates-validation.atdd.test.ts
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx helpers (engine pure TS, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnTile, pickIndex } from '../../../triade/src/engine/core/spawn.ts';
import { move } from '../../../triade/src/engine/core/game.ts';
import { GRID_SIZE } from '../../../triade/src/engine/core/types.ts';
import {
  boardWith,
  emptyBoard,
  gameState,
  rngOf,
  spyRng,
  mulberry32,
  oppositeEdgeCandidates,
  sigmaBound,
  stripCommentsAndStrings,
  occupiedCells,
  resultingTiles,
} from '../../../triade/test-utils/helpers.ts';
import type { Board, Direction } from '../../../triade/src/engine/core/index.ts';

export { boardWith, emptyBoard, gameState, rngOf, spyRng, mulberry32, oppositeEdgeCandidates, sigmaBound, stripCommentsAndStrings, occupiedCells, resultingTiles, spawnTile, pickIndex, move, GRID_SIZE };
export type { Board, Direction };

// ── Deterministic board factories (no faker) ───────────────────────────
export function empty4x4(): Board {
  return emptyBoard();
}

export function boardWithSingleEmptyAt00(): Board {
  // Only (0,0) empty, all others occupied — isolates OOB/mixed filters to one survivor
  return boardWith([
    [null, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
}

export function boardWithTwoEmpties(): Board {
  // Empties at (0,0) and (0,3) — used for dedup uniform 1/2 + mixed pool [[0,0],[0,3]]
  return boardWith([
    [null, 2, 3, null],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
}

export function boardWithDedupCandidates(): Board {
  // Empties at (0,0) and (1,1) — for [[0,0],[0,0],[1,1]] dedup uniform 1/2
  return boardWith([
    [null, 2, 3, 4],
    [5, null, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
}

export function occupiedAt00Board(): Board {
  // [0,0] occupied (1) — for occupied+float filter → empty vs valid
  return boardWith([
    [1, 2, 3, null],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
}

export function fullBoard(): Board {
  return boardWith([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]);
}

export function boardWithFourEmpties(): Board {
  // Empties (0,1)(0,2)(0,3)(3,3) — for omitted candidates all-empty uniform 1/4
  return boardWith([
    [1, null, null, null],
    [2, 3, 4, 5],
    [6, 7, 8, 9],
    [10, 11, 12, null],
  ]);
}

export function gameOverBoard(): Board {
  // 3,6 alternation — no merges, full, gameOver true (noop 0 draws)
  return boardWith([
    [3, 6, 3, 6],
    [6, 3, 6, 3],
    [3, 6, 3, 6],
    [6, 3, 6, 3],
  ]);
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

// ── Candidate fixtures (malformed pool inputs) ─────────────────────────
export const CANDIDATES = {
  OOB_ONLY: [[4, 0]] as unknown as Array<[number, number]>,
  OOB_PLUS_VALID: [[4, 0], [0, 0]] as unknown as Array<[number, number]>,
  NULL_PLUS_VALID: [null, [0, 0]] as unknown as Array<[number, number]>,
  MISSING_C: [[1]] as unknown as Array<[number, number]>,
  NON_NUMBER: [['a', 'b']] as unknown as Array<[number, number]>,
  DUP_TRIPLE: [[0, 0], [0, 0], [1, 1]] as unknown as Array<[number, number]>,
  VALID_TWO: [[0, 3], [1, 3]] as unknown as Array<[number, number]>,
  MIX: [[0, 0], null, [4, 0], [0, 0], [0, 3]] as unknown as Array<[number, number]>,
  NON_ARRAY_NULL: null as unknown as Array<[number, number]>,
  NON_ARRAY_NUMBER: 42 as unknown as Array<[number, number]>,
  FLOAT_PLUS_OCCUPIED: [[0.5, 0], [0, 0]] as unknown as Array<[number, number]>,
} as const;

export const SCAN_STRINGS = {
  CANDIDATES_FILTER: 'candidates.filter(',
  SET_STRING: 'Set<string>',
  SEEN_HAS: 'seen.has(key)',
  SEEN_ADD: 'seen.add(key)',
  OUTER_GUARD: 'if (!Array.isArray(candidates))',
  ENTRY_GUARD: 'if (!Array.isArray(entry)',
  IS_INTEGER: 'Number.isInteger',
  GRID_SIZE_IMPORT: 'GRID_SIZE',
  BOUNDS_R: 'r >= GRID_SIZE',
  BOUNDS_C: 'c >= GRID_SIZE',
  OPTIONAL_CHAIN: 'board[r]?.[c] !== null',
  DIRECT_INDEX_ALL_EMPTY: 'board[r][c] === null',
  CLONE_BOARD: 'const next = cloneBoard(board)',
  PICK_INDEX_POOL: 'pickIndex(pool.length',
  POOL_EMPTY: 'if (pool.length === 0)',
  MATH_RANDOM: 'Math.random',
  LEDGER_HASH: '365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2',
  HEX_TAIL: '7374617475733a206f70656e',
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

export const SPAWN_SOURCE_PATH = 'triade/src/engine/core/spawn.ts';
export const GAME_SOURCE_PATH = 'triade/src/engine/core/game.ts';
export const TYPES_SOURCE_PATH = 'triade/src/engine/core/types.ts';
export const LEDGER_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';
export const SPEC_PATH = '_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md';
export const ATDD_PATH = 'triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts';

// ── Validation helpers (host allowlist gates) ──────────────────────────
export function assertSpawnValidationLoop(spawnSrc: string): void {
  if (countMatches(spawnSrc, /candidates\.filter\(/g) !== 0) throw new Error('candidates.filter survivor must be 0 (old throw site)');
  if (countMatches(spawnSrc, /Set<string>/g) !== 1) throw new Error('Set<string> must be 1');
  if (countMatches(spawnSrc, /seen\.has\(key\)/g) !== 1) throw new Error('seen.has(key) must be 1');
  if (countMatches(spawnSrc, /seen\.add\(key\)/g) !== 1) throw new Error('seen.add(key) must be 1');
  if (countMatches(spawnSrc, /if \(!Array\.isArray\(entry\)/g) !== 1) throw new Error('!Array.isArray(entry) guard must be 1');
  if (countMatches(spawnSrc, /Number\.isInteger/g) !== 2) throw new Error('Number.isInteger must be 2 (r and c)');
  if (countMatches(spawnSrc, /if \(!Array\.isArray\(candidates\)/g) !== 1) throw new Error('!Array.isArray(candidates) outer guard must be 1');
}

export function assertGridSizeInvariant(spawnSrc: string, typesSrc: string): void {
  if (countMatches(typesSrc, /export const GRID_SIZE/g) !== 1) throw new Error('single GRID_SIZE definition');
  if (!typesSrc.includes('GRID_SIZE = 4')) throw new Error('GRID_SIZE stays 4');
  if (countMatches(spawnSrc, /GRID_SIZE/g) !== 5) throw new Error(`spawn.ts 5 GRID_SIZE refs (import+2 empty loops+2 bound checks), got ${countMatches(spawnSrc, /GRID_SIZE/g)}`);
  if (!spawnSrc.includes('r >= GRID_SIZE') || !spawnSrc.includes('c >= GRID_SIZE')) throw new Error('bounds use GRID_SIZE not literal 4');
}

export function assertOptionalChaining(spawnSrc: string): void {
  if (countMatches(spawnSrc, /board\[r\]\?\.\[c\] !== null/g) !== 1) throw new Error('candidate loop uses board[r]?.[c] !== null 1');
  if (countMatches(spawnSrc, /board\[r\]\[c\] === null/g) !== 1) throw new Error('all-empty branch board[r][c] === null 1');
  if (!spawnSrc.includes('const next = cloneBoard(board)')) throw new Error('cloneBoard before guard');
  if (!spawnSrc.includes('pickIndex(pool.length')) throw new Error('pool pick via pickIndex');
  if (countMatches(spawnSrc, /if \(pool\.length === 0\)/g) !== 1) throw new Error('single pool.length===0 early return');
}

export function assertNoRngInLoop(spawnSrc: string): void {
  // Math.random only as default params (weightedValue+spawnTile), never called inside for(entry) loop
  if (countMatches(spawnSrc, /Math\.random/g) !== 2) throw new Error(`spawn.ts Math.random must be 2 (weightedValue+spawnTile defaults), got ${countMatches(spawnSrc, /Math\.random/g)}`);
  const ledger = readSource('triade/src/engine/core/game.ts');
  if (countMatches(ledger, /Math\.random/g) !== 2) throw new Error(`game.ts Math.random must be 2 (newGame+move defaults)`);
}

export function assertLedger(ledgerSrc: string): void {
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_HASH)) throw new Error('ledger must contain 365ffe33 resolution-undo for DW-72/73');
  if (countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g')) !== 2) throw new Error(`ledger 365ffe33 must be 2 hits (DW-72+DW-73), got ${countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g'))}`);
  if (!/DW-72[\s\S]*?status: done 2026-09-02/.test(ledgerSrc)) throw new Error('DW-72 must be done 2026-09-02');
  if (!/DW-73[\s\S]*?status: done 2026-09-02/.test(ledgerSrc)) throw new Error('DW-73 must be done 2026-09-02');
}

export const LEDGER = {
  DW72: 'DW-72',
  DW73: 'DW-73',
  HASH: '365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2',
  HEX_TAIL: '7374617475733a206f70656e',
  DATE: '2026-09-02',
  BUNDLE: 'dw-engine-spawn-candidates-validation',
  BASELINE: '51e4677',
  FINAL: 'ed54b4e',
} as const;
