import type { MoveResult } from '../engine/core/types.ts';

export interface MatchScore {
  score: number;
  best: number;
}

export function initialScore(best: number): MatchScore {
  return { score: 0, best };
}

export function applyMove(current: MatchScore, result: MoveResult): MatchScore {
  const raw = result.score;
  const sanitized = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : 0;
  const effective = result.moved ? sanitized : 0;
  const score = current.score + effective;
  return { score, best: Math.max(current.best, score) };
}

// `best` is the live session max, seeded from the persisted best. Once the
// session passes the old record, `best` equals `score` — so `isNewRecord`
// must be called with the session-start (persisted) best, never `current.best`.
export function isNewRecord(previousBest: number, score: number): boolean {
  return score > previousBest;
}
