import type { Board } from '../engine/core/types.ts';
import { canMerge } from '../engine/core/rules.ts';
import type { LaneProfile } from './lanes.ts';

export interface UndoBudget {
  freeUsed: boolean;
  iapRemaining: number;
  unlimited: boolean;
}

export interface HintBudget {
  remaining: number;
}

export interface ContinueBudget {
  used: boolean;
}

export type AssistResultOk<T> = { ok: true; budget: T };
export type AssistResultRejected = { ok: false; reason: string };
export type AssistResult<T> = AssistResultOk<T> | AssistResultRejected;

export function initialUndoBudget(): UndoBudget {
  return { freeUsed: false, iapRemaining: 0, unlimited: false };
}

export function initialHintBudget(initial = 5): HintBudget {
  return { remaining: initial };
}

export function initialContinueBudget(): ContinueBudget {
  return { used: false };
}

export function canUndo(budget: UndoBudget, historyLen: number, profile: LaneProfile): boolean {
  if (!profile.canUndo) return false;
  if (historyLen <= 0) return false;
  if (!budget.freeUsed) return true;
  if (budget.unlimited) return true;
  if (budget.iapRemaining > 0) return true;
  return false;
}

export function consumeUndo(budget: UndoBudget, historyLen: number, profile: LaneProfile): AssistResult<UndoBudget> {
  if (!canUndo(budget, historyLen, profile)) return { ok: false, reason: 'cannot undo' };
  if (!budget.freeUsed) {
    return { ok: true, budget: { ...budget, freeUsed: true } };
  }
  if (budget.unlimited) {
    return { ok: true, budget: { ...budget } };
  }
  if (budget.iapRemaining > 0) {
    return { ok: true, budget: { ...budget, iapRemaining: budget.iapRemaining - 1 } };
  }
  return { ok: false, reason: 'no budget' };
}

export function canHint(budget: HintBudget, board: Board, profile: LaneProfile): boolean {
  if (!profile.canHint) return false;
  if (budget.remaining <= 0) return false;
  return findMergeablePair(board) !== null;
}

export function consumeHint(budget: HintBudget, board: Board, profile: LaneProfile): AssistResult<HintBudget> {
  if (!canHint(budget, board, profile)) return { ok: false, reason: 'cannot hint' };
  return { ok: true, budget: { remaining: budget.remaining - 1 } };
}

export function canContinue(budget: ContinueBudget, profile: LaneProfile): boolean {
  if (!profile.canContinue) return false;
  if (budget.used) return false;
  return true;
}

export function consumeContinue(budget: ContinueBudget, profile: LaneProfile): AssistResult<ContinueBudget> {
  if (!canContinue(budget, profile)) return { ok: false, reason: 'cannot continue' };
  return { ok: true, budget: { used: true } };
}

export function findMergeablePair(board: Board): [[number, number], [number, number]] | null {
  if (!Array.isArray(board)) return null;
  const n = board.length;
  if (n === 0) return null;
  for (let r = 0; r < n; r++) {
    const row = board[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v === null || v === undefined) continue;
      // right neighbor
      if (c + 1 < row.length) {
        const nb = row[c + 1];
        if (nb !== null && nb !== undefined && canMerge(v as never, nb as never)) {
          return [
            [r, c],
            [r, c + 1],
          ];
        }
      }
      // down neighbor
      if (r + 1 < n) {
        const nextRow = board[r + 1];
        if (Array.isArray(nextRow) && c < nextRow.length) {
          const nb = nextRow[c];
          if (nb !== null && nb !== undefined && canMerge(v as never, nb as never)) {
            return [
              [r, c],
              [r + 1, c],
            ];
          }
        }
      }
    }
  }
  return null;
}
