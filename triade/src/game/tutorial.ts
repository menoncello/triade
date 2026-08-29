import type { MoveResult } from '../engine/core/types.ts';

export type LaneId = 'clean' | 'accelerated';

export type TutorialPhase = 'merge12' | 'merge12_followup' | 'oneCell' | 'completed' | 'skipped';

export interface TutorialState {
  laneId: LaneId;
  phase: TutorialPhase;
  stepIndex: number;
}

export function createTutorialState(laneId: LaneId): TutorialState {
  return { laneId, phase: 'merge12', stepIndex: 0 };
}

export function isTutorialActive(state: TutorialState | null): boolean {
  if (!state) return false;
  return state.phase !== 'completed' && state.phase !== 'skipped';
}

export function skipTutorial(state: TutorialState): TutorialState {
  return { ...state, phase: 'skipped' };
}

function has12Merge(trace: MoveResult['trace']): boolean {
  for (const entry of trace) {
    if (entry.value !== 3) continue;
    if (entry.from.length < 2) continue;
    // entry.from are positions, not values; we need to infer via value check?
    // Engine trace: `value` is merged result (3), `from` positions, spawned false.
    // To detect 1+2→3 we check value===3 and from length 2 (only 1+2 can produce 3).
    // 1+1 and 2+2 never merge, equal ≥3 merges produce ≥6, so 3 with 2 sources is 1+2.
    return true;
  }
  return false;
}

export function has12MergeInResult(result: MoveResult): boolean {
  return has12Merge(result.trace);
}

export function nextPhase(state: TutorialState, result: MoveResult): TutorialState {
  if (state.phase === 'completed' || state.phase === 'skipped') return state;
  if (!result.moved) return state;
  if (state.phase === 'merge12') {
    if (has12Merge(result.trace)) {
      return { ...state, phase: 'merge12_followup', stepIndex: state.stepIndex + 1 };
    }
    // Still allow progress? No — stay until 1+2 merge observed.
    return state;
  }
  if (state.phase === 'merge12_followup') {
    return { ...state, phase: 'oneCell', stepIndex: state.stepIndex + 1 };
  }
  if (state.phase === 'oneCell') {
    return { ...state, phase: 'completed', stepIndex: state.stepIndex + 1 };
  }
  return state;
}
