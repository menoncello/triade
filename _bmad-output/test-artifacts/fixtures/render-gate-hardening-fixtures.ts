/**
 * Fixtures — dw-render-gate-hardening (deterministic, host-only, no faker)
 * App/GameBoard input gate and tile-state invariants (DW-35,36,38,39,88,89,90,96)
 * Mirrors triade/test-utils/helpers.ts + triade/src/utils/mulberry32.ts deterministic harness
 * No Playwright test.extend — pure node:test + tsx helpers.
 * This file is TEA-required fixture surface under test_artifacts/fixtures; the oracle helpers live in triade/test-utils/helpers.ts (already hardened DW-3/48/59/60/66).
 */
import { boardWith, emptyBoard, gameState, rngOf, spyRng, stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import * as game from '../../../triade/src/engine/core/index.ts';
import type { Board, Direction, GameState, MoveResult } from '../../../triade/src/engine/core/index.ts';
import { planTileTransitions } from '../../../triade/src/render/transitionPlan.ts';

export { boardWith, emptyBoard, gameState, rngOf, spyRng, stripCommentsAndStrings, mulberry32, planTileTransitions };

// ── Board factories ───────────────────────────────────────────────────────
export function board9(): Board {
  // 9 tiles (fresh newGame post-restart) — 4×4 with 7 empties
  return boardWith([
    [1, 1, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
}
export function board16(): Board {
  return boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1],
  ]);
}
export function cloneBoard(b: Board): Board { return b.map((r) => r.slice()); }

// ── MoveResult fixtures ───────────────────────────────────────────────────
export function emptyMove(board: Board): MoveResult {
  return { moved: false, trace: [], board, score: 0 } as unknown as MoveResult;
}
export function effectiveMoveWithEmptyPlan(board: Board): MoveResult {
  // Injected empty plan case: moved:true but empty trace (future engine regression guard)
  // planTileTransitions(board, {moved:true, trace:[]}) → [] via !moved guard — inject via trace stub
  // For host test we stub planTileTransitions to return [] while moved:true
  return { moved: true, trace: [], board, score: 0 } as unknown as MoveResult;
}

// ── Gate constants (single-source verification) ───────────────────────────
export const GATE_CONSTANTS = {
  SLIDE_MS: 160,
  TILE_FADE_MS: 120,
  MAX_MOVE_ANIM_MS: 280,
  EARLY_INPUT_FRACTION: 0.3,
  EARLY_INPUT_MS: 84,
  FALLBACK_APP_MS: 420,
  GRID: 4,
  BOARD_PADDING: 8,
  CELL_GAP: 8,
} as const;

// ── Scan helpers (mirror helpers.ts stripCommentsAndStrings) ───────────────
export function count(hay: string, needle: string): number {
  return (hay.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}
export function countRe(hay: string, re: RegExp): number {
  return (hay.match(re) ?? []).length;
}
export const LEDGER_HASH = '4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c';
export const LEDGER_RESOLUTION = 'resolved by sweep bundle dw-render-gate-hardening';
