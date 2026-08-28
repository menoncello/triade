import type { Board, GameState } from '../engine/core/types.ts';
import type { LaneProfile } from './lanes.ts';
import type { MatchScore } from './matchScore.ts';
import type { MatchStats } from './matchStats.ts';
import {
  canUndo,
  consumeUndo,
  canHint,
  consumeHint,
  canContinue,
  consumeContinue,
  findMergeablePair,
  initialUndoBudget,
  initialHintBudget,
  initialContinueBudget,
} from './assistance.ts';
import type { UndoBudget, HintBudget, ContinueBudget } from './assistance.ts';

export interface Snapshot {
  game: GameState;
  match: MatchScore;
  matchStats: MatchStats;
}

export interface OrchestratorState {
  undoHistory: Snapshot[];
  undoBudget: UndoBudget;
  hintBudget: HintBudget;
  continueBudget: ContinueBudget;
  hintHighlight: [[number, number], [number, number]] | null;
  bannerDismissed: { ceiling: boolean; stuck: boolean };
  showUndoPrompt: boolean;
}

export function initialOrchestratorState(): OrchestratorState {
  return {
    undoHistory: [],
    undoBudget: initialUndoBudget(),
    hintBudget: initialHintBudget(5),
    continueBudget: initialContinueBudget(),
    hintHighlight: null,
    bannerDismissed: { ceiling: false, stuck: false },
    showUndoPrompt: false,
  };
}

export function canUndoForState(state: OrchestratorState, profile: LaneProfile): boolean {
  return canUndo(state.undoBudget, state.undoHistory.length, profile);
}

export function canHintForState(state: OrchestratorState, board: Board, profile: LaneProfile): boolean {
  return canHint(state.hintBudget, board, profile);
}

export function canContinueForState(state: OrchestratorState, profile: LaneProfile): boolean {
  return canContinue(state.continueBudget, profile);
}

export type UndoRequestResult = { ok: boolean; state: OrchestratorState };

export function requestUndo(
  state: OrchestratorState,
  profile: LaneProfile,
  busy: boolean
): UndoRequestResult {
  if (!profile.canUndo) return { ok: false, state };
  if (busy) return { ok: false, state };
  if (state.showUndoPrompt) return { ok: false, state };
  if (!canUndoForState(state, profile)) return { ok: false, state };
  return { ok: true, state: { ...state, showUndoPrompt: true } };
}

export type ConfirmUndoResult = { ok: boolean; state: OrchestratorState; snapshot?: Snapshot };

export function confirmUndoAd(
  state: OrchestratorState,
  profile: LaneProfile
): ConfirmUndoResult {
  const res = consumeUndo(state.undoBudget, state.undoHistory.length, profile);
  if (!res.ok) return { ok: false, state: { ...state, showUndoPrompt: false } };
  const snap = state.undoHistory[state.undoHistory.length - 1];
  if (!snap) return { ok: false, state: { ...state, showUndoPrompt: false } };
  return {
    ok: true,
    state: {
      ...state,
      undoHistory: state.undoHistory.slice(0, -1),
      undoBudget: res.budget,
      hintHighlight: null,
      showUndoPrompt: false,
    },
    snapshot: snap,
  };
}

export function confirmUndoIap(
  state: OrchestratorState,
  profile: LaneProfile
): ConfirmUndoResult {
  let budgetForCheck = state.undoBudget;
  if (budgetForCheck.freeUsed && !budgetForCheck.unlimited && budgetForCheck.iapRemaining === 0) {
    budgetForCheck = { ...budgetForCheck, iapRemaining: 1 };
  }
  const res = consumeUndo(budgetForCheck, state.undoHistory.length, profile);
  if (!res.ok) return { ok: false, state: { ...state, showUndoPrompt: false } };
  const snap = state.undoHistory[state.undoHistory.length - 1];
  if (!snap) return { ok: false, state: { ...state, showUndoPrompt: false } };
  return {
    ok: true,
    state: {
      ...state,
      undoHistory: state.undoHistory.slice(0, -1),
      undoBudget: res.budget,
      hintHighlight: null,
      showUndoPrompt: false,
    },
    snapshot: snap,
  };
}

export function cancelUndo(state: OrchestratorState): OrchestratorState {
  if (!state.showUndoPrompt) return state;
  return { ...state, showUndoPrompt: false };
}

export type HintRequestResult = { ok: boolean; state: OrchestratorState; pair?: [[number, number], [number, number]] };

export function requestHint(
  state: OrchestratorState,
  board: Board,
  profile: LaneProfile,
  busy: boolean
): HintRequestResult {
  if (busy) return { ok: false, state };
  if (!canHintForState(state, board, profile)) return { ok: false, state };
  const pair = findMergeablePair(board);
  if (!pair) return { ok: false, state };
  const res = consumeHint(state.hintBudget, board, profile);
  if (!res.ok) return { ok: false, state };
  return {
    ok: true,
    state: { ...state, hintBudget: res.budget, hintHighlight: pair },
    pair,
  };
}

export function consumeContinueAd(
  state: OrchestratorState,
  profile: LaneProfile
): { ok: boolean; state: OrchestratorState; snapshot?: Snapshot } {
  const res = consumeContinue(state.continueBudget, profile);
  if (!res.ok) return { ok: false, state };
  const snap = state.undoHistory[state.undoHistory.length - 1];
  if (snap) {
    return {
      ok: true,
      state: {
        ...state,
        undoHistory: state.undoHistory.slice(0, -1),
        continueBudget: res.budget,
        hintHighlight: null,
        showUndoPrompt: false,
      },
      snapshot: snap,
    };
  }
  return { ok: true, state: { ...state, continueBudget: res.budget, hintHighlight: null, showUndoPrompt: false } };
}

export function consumeContinueIap(
  state: OrchestratorState,
  profile: LaneProfile
): { ok: boolean; state: OrchestratorState; snapshot?: Snapshot } {
  const res = consumeContinue(state.continueBudget, profile);
  if (!res.ok) return { ok: false, state };
  const snap = state.undoHistory[state.undoHistory.length - 1];
  if (snap) {
    return {
      ok: true,
      state: {
        ...state,
        undoHistory: state.undoHistory.slice(0, -1),
        continueBudget: res.budget,
        hintHighlight: null,
        showUndoPrompt: false,
      },
      snapshot: snap,
    };
  }
  return { ok: true, state: { ...state, continueBudget: res.budget, hintHighlight: null, showUndoPrompt: false } };
}

export function resetForNewMatch(state: OrchestratorState): OrchestratorState {
  return {
    ...state,
    undoHistory: [],
    undoBudget: initialUndoBudget(),
    hintBudget: initialHintBudget(5),
    continueBudget: initialContinueBudget(),
    hintHighlight: null,
    bannerDismissed: { ceiling: false, stuck: false },
    showUndoPrompt: false,
  };
}

export function pushHistory(state: OrchestratorState, snapshot: Snapshot): OrchestratorState {
  return { ...state, undoHistory: [...state.undoHistory, snapshot] };
}

export function clearHintHighlight(state: OrchestratorState): OrchestratorState {
  if (state.hintHighlight === null) return state;
  return { ...state, hintHighlight: null };
}

export function dismissBanner(
  state: OrchestratorState,
  banner: 'ceiling' | 'stuck'
): OrchestratorState {
  if (state.bannerDismissed[banner]) return state;
  return { ...state, bannerDismissed: { ...state.bannerDismissed, [banner]: true } };
}

// Lane Wall helper: engine boundary check — orchestrator never passes LaneId to engine.
// This file must never import react-native/expo/skia/react-native-mmkv.
