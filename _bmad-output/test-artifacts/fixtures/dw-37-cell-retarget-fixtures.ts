/**
 * Fixtures — dw-decision-dw-37 (DW-37 cell retarget)
 * Orientation/resize mid-animation stale pixel SharedValues fix
 * Deterministic, host-only, no faker — pure triade/src/render/GameBoard.tsx:82-88,180-195,315-316 + transitionPlan.ts
 * Covers: GameBoard.tsx pixel() helper BOARD_PADDING + col*(cell+CELL_GAP)
 *         AnimatedTile NEW useEffect at 180-195 // DW-37 cell-change retarget keyed on [cell]
 *           const next = pixel(to, cell) then rest|appear → x.value=next.x; y.value=next.y immediate
 *           vs move|vanish → x.value=withSpring(next.x,spring); y.value=withSpring(next.y,spring)
 *         cell = Math.max((width - BOARD_PADDING*2 - CELL_GAP*(GRID-1))/GRID, 1) at 315-316
 *         applyPlan:400-463 byCell re-plan (cellKey(t.to)) + syncTiles single-writer 358-361
 *         transitionPlan.ts:1-60 if (!result.moved) return [] + hold/slide classify
 * Spec: _bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md (baseline 0b81c67 → final eb11b56)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-37-cell-retarget.md (9 risks, 2 high R-001/R-002, 6 P0 +3 P1 +4 P2 +2 P3)
 * ATDD: triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts (15 it.skip RED-phase scaffolds, 6 P0 +3 P1 +4 P2 +2 P3)
 *       triade/__tests__/render/cell-retarget.atdd.test.ts (9 GREEN scans already at eb11b56)
 *       _bmad-output/test-artifacts/tests/api/dw-37-cell-retarget.gateway.spec.ts (10 active)
 *       _bmad-output/test-artifacts/tests/e2e/dw-37-cell-retarget.umbrella.spec.ts (9 active)
 * Run: npm --prefix triade test -- __tests__/render/dw-37-cell-retarget.atdd.test.ts (15 dormant → 15 pass when activated)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx helpers (RN Skia worklet, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planTileTransitions } from '../../../triade/src/render/transitionPlan.ts';
import type { Board, MoveResult } from '../../../triade/src/engine/core/index.ts';
import {
  boardWith,
  emptyBoard,
  rngOf,
  spyRng,
  mulberry32,
  stripCommentsAndStrings,
} from '../../../triade/test-utils/helpers.ts';

export { boardWith, emptyBoard, rngOf, spyRng, mulberry32, stripCommentsAndStrings, planTileTransitions };
export type { Board, MoveResult };

// ── Board factories (no faker) ───────────────────────────────────────────
export function boardHold(): Board {
  return boardWith([
    [2, null, null, null],
    [null, 3, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
}

export function boardEmpty(): Board {
  return emptyBoard();
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

// ── MoveResult fixtures for transitionPlan hold/slide ─────────────────────
export function noMove(board: Board): MoveResult {
  return { moved: false, trace: [], board, score: 0 } as unknown as MoveResult;
}

export function holdTwoTrace(board: Board): MoveResult {
  return {
    moved: true,
    board,
    score: 0,
    trace: [
      { value: 2, to: [0, 0], from: [[0, 0]], spawned: false } as unknown as MoveResult['trace'][number],
      { value: 3, to: [1, 1], from: [[1, 1]], spawned: false } as unknown as MoveResult['trace'][number],
    ],
  } as unknown as MoveResult;
}

// ── Scan strings (single-source grep) ─────────────────────────────────────
export const SCAN_STRINGS = {
  DW37_MARKER: 'DW-37',
  PIXEL_HELPER_DEF: 'function pixel(',
  PIXEL_TO_CELL: 'pixel(to, cell)',
  PIXEL_X: 'BOARD_PADDING + cell[1]',
  PIXEL_Y: 'BOARD_PADDING + cell[0]',
  CELL_GUARD: 'Math.max(',
  CELL_GUARD_FULL: 'const cell = Math.max',
  CELL_DEP: '}, [cell])',
  CELL_DEP_ALT: '[cell]',
  TOPOS_DEP: '[toPos.x, toPos.y, kind]',
  REST_APPEAR: "kind === 'rest'",
  REST_APPEAR2: "kind === 'appear'",
  MOVE_VANISH: "kind === 'move'",
  MOVE_VANISH2: "kind === 'vanish'",
  MOVE_VANISH_BRANCH: "if (kind === 'move' || kind === 'vanish')",
  X_SNAP: 'x.value = next.x',
  Y_SNAP: 'y.value = next.y',
  X_SPRING: 'withSpring(next.x',
  Y_SPRING: 'withSpring(next.y',
  TOPOS_SPRING_X: 'withSpring(toPos.x',
  TOPOS_SPRING_Y: 'withSpring(toPos.y',
  SPRING_LITERAL: 'const spring = { damping: 14, stiffness: 260, mass: 0.8 }',
  VANISH_FADE: "if (kind === 'vanish')",
  VANISH_DELAY: 'delay + SLIDE_MS',
  VANISH_TIMING: 'withTiming(0, { duration: 100 }',
  WITH_DELAY: 'withDelay',
  SYNC_TILES_DEF: 'const syncTiles =',
  SET_TILES_ONCE: 'setTilesState(next)',
  TILES_REF_ONCE: 'tilesRef.current = next',
  BYCELL_SET: 'byCell.set(cellKey(t.to[0], t.to[1]), t)',
  SYNC_TILES_CALL: 'syncTiles(next)',
  CELL_KEY_DEF: 'function cellKey',
  NOT_MOVED: 'if (!result.moved) return []',
  GRID_4: 'GRID = 4',
  BOARD_PADDING_8: 'BOARD_PADDING = 8',
  CELL_GAP_8: 'CELL_GAP = 8',
  SLIDE_MS_160: 'SLIDE_MS = 160',
  TILE_FADE_120: 'TILE_FADE_MS = 120',
  EARLY_FRACTION_03: 'EARLY_INPUT_FRACTION = 0.3',
  REDUCED_MOTION: 'reducedMotion',
  SPEC_RESIZE_MANUAL: 'Resize simulator mid-slide',
  SPEC_NO_JUMP: 'no tile jump',
  LEDGER_DW37: 'DW-37',
  LEDGER_DONE: 'status: done 2026-09-02',
  LEDGER_RESOLUTION: 'resolved by sweep bundle dw-decision-dw-37',
  LEDGER_DECISION: 'Retarget all kinds on cell change',
  LEDGER_HASH: '9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c',
  HEX_TAIL: '7374617475733a206f70656e',
  SPRINT_STATUS: 'sprint-status.yaml',
  SPEC_STATUS_DONE: 'Status: done',
} as const;

// ── Source scan helpers ────────────────────────────────────────────────────
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

export const BOARD_SOURCE_PATH = 'triade/src/render/GameBoard.tsx';
export const TRANSITION_SOURCE_PATH = 'triade/src/render/transitionPlan.ts';
export const LEDGER_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';
export const SPEC_PATH = '_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md';

// ── Validation helpers (host allowlist gates) ─────────────────────────────
export function assertBoardGuard(boardSrc: string): void {
  if (countMatches(boardSrc, /DW-37/g) !== 1) throw new Error(`DW-37 marker must be 1, got ${countMatches(boardSrc, /DW-37/g)}`);
  if (countMatches(boardSrc, /},\s*\[cell\]\)/g) !== 1) throw new Error(`}, [cell]) must be 1, got ${countMatches(boardSrc, /},\s*\[cell\]\)/g)}`);
  if (!boardSrc.includes('pixel(to, cell)')) throw new Error('pixel(to, cell) retarget missing');
  if (!boardSrc.includes("kind === 'rest'") || !boardSrc.includes("kind === 'appear'")) throw new Error('rest/appear branch missing');
  if (!boardSrc.includes("kind === 'move'") || !boardSrc.includes("kind === 'vanish'")) throw new Error('move/vanish branch missing');
  if (!boardSrc.includes('x.value = next.x')) throw new Error('x.value = next.x snap missing');
  if (!boardSrc.includes('withSpring(next.x')) throw new Error('withSpring(next.x spring missing');
  if (!boardSrc.includes('withSpring(next.y')) throw new Error('withSpring(next.y spring missing');
}

export function assertNoRegression(boardSrc: string): void {
  if (!boardSrc.includes("if (kind === 'move' || kind === 'vanish')")) throw new Error('original move|vanish toPos branch missing');
  if (!boardSrc.includes('withSpring(toPos.x')) throw new Error('withSpring(toPos.x missing');
  if (!boardSrc.includes('withSpring(toPos.y')) throw new Error('withSpring(toPos.y missing');
  if (!boardSrc.includes('[toPos.x, toPos.y, kind]')) throw new Error('[toPos.x,toPos.y,kind] dep missing');
  if (countMatches(boardSrc, /},\s*\[toPos\.x, toPos\.y, kind\]\)/g) !== 1) throw new Error(`toPos effect must be 1, got ${countMatches(boardSrc, /},\s*\[toPos\.x, toPos\.y, kind\]\)/g)}`);
}

export function assertInvariants(boardSrc: string, transitionSrc: string): void {
  if (!boardSrc.includes('function pixel(')) throw new Error('pixel helper missing');
  if (!boardSrc.includes('BOARD_PADDING + cell[1]')) throw new Error('pixel x formula missing');
  if (!boardSrc.includes('BOARD_PADDING + cell[0]')) throw new Error('pixel y formula missing');
  if (!boardSrc.includes('Math.max(') || !boardSrc.includes(', 1)')) throw new Error('Math.max(...,1) guard missing');
  if (!boardSrc.includes('const syncTiles =')) throw new Error('syncTiles missing');
  if (countMatches(boardSrc, /setTilesState\(next\)/g) !== 1) throw new Error(`setTilesState(next) must be 1, got ${countMatches(boardSrc, /setTilesState\(next\)/g)}`);
  if (countMatches(boardSrc, /tilesRef\.current = next/g) !== 1) throw new Error(`tilesRef.current=next must be 1, got ${countMatches(boardSrc, /tilesRef\.current = next/g)}`);
  if (!transitionSrc.includes('if (!result.moved) return []')) throw new Error('!moved guard missing');
  if (!boardSrc.includes('byCell.set(cellKey(t.to[0], t.to[1]), t)')) throw new Error('byCell index missing');
  if (!boardSrc.includes('syncTiles(next)')) throw new Error('syncTiles(next) missing');
  if (!boardSrc.includes("if (kind === 'vanish')")) throw new Error('vanish fade branch missing');
  if (!boardSrc.includes('delay + SLIDE_MS')) throw new Error('delay+SLIDE_MS missing');
  if (!boardSrc.includes('withTiming(0, { duration: 100 }')) throw new Error('vanish fade timing missing');
  const cellBlock = boardSrc.slice(boardSrc.indexOf('// DW-37'), boardSrc.indexOf('// DW-37') + 800);
  if (cellBlock.includes('withDelay')) throw new Error('[cell] retarget should not contain withDelay');
}

export function assertLedger(ledgerSrc: string): void {
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_HASH)) throw new Error('ledger must contain 9f25aea8 resolution-undo for DW-37');
  if (countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g')) !== 1) throw new Error(`ledger 9f25aea8 must be 1, got ${countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g'))}`);
  if (!/DW-37[\s\S]*?status: done 2026-09-02/.test(ledgerSrc)) throw new Error('DW-37 must be done 2026-09-02');
  if (!ledgerSrc.includes('resolved by sweep bundle dw-decision-dw-37')) throw new Error('ledger resolution line dw-decision-dw-37');
  if (!ledgerSrc.includes('Retarget all kinds on cell change')) throw new Error('ledger decision prefix missing');
}

// ── Gate constants (single-source) ────────────────────────────────────────
export const GATE_CONSTANTS = {
  GRID: 4,
  BOARD_PADDING: 8,
  CELL_GAP: 8,
  CELL_RADIUS: 10,
  SLIDE_MS: 160,
  TILE_FADE_MS: 120,
  MAX_MOVE_ANIM_MS: 280,
  EARLY_INPUT_FRACTION: 0.3,
  EARLY_INPUT_MS: 84,
  SPRING: { damping: 14, stiffness: 260, mass: 0.8 },
} as const;

export const LEDGER = {
  DW37: 'DW-37',
  HASH: '9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c',
  HEX_TAIL: '7374617475733a206f70656e',
  DATE: '2026-09-02',
  BUNDLE: 'dw-decision-dw-37',
  BASELINE: '0b81c678dbbc819b0ab0cc78bd6f10bba19895cb',
  FINAL: 'eb11b56b4f30845531a2ba121c9bbf9e0605d71f',
} as const;
