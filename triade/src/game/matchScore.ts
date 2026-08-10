import type { MoveResult } from '../engine/core/types.ts';

export interface MatchScore {
  score: number;
  best: number;
}

export function initialScore(best: number): MatchScore {
  return { score: 0, best };
}

export function applyMove(current: MatchScore, result: MoveResult): MatchScore {
  const score = current.score + result.score;
  return { score, best: Math.max(current.best, score) };
}

// `best` is the live session max, seeded from the persisted best. Once the
// session passes the old record, `best` equals `score` — so `isNewRecord`
// must be called with the session-start (persisted) best, never `current.best`.
export function isNewRecord(previousBest: number, score: number): boolean {
  return score > previousBest;
}
