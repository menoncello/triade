import type { MoveResult } from '../engine/core/types.ts';

export interface MatchScore {
  score: number;
  best: number;
}

export function initialScore(best: number): MatchScore {
  const sanitized = Number.isFinite(best) && best >= 0 ? best : 0;
  return { score: 0, best: sanitized };
}

export function applyMove(current: MatchScore, result: MoveResult): MatchScore {
  const raw = result.score;
  const sanitized = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : 0;
  const effective = result.moved ? sanitized : 0;
  const curScore = Number.isFinite(current.score) && current.score >= 0 ? current.score : 0;
  const curBest = Number.isFinite(current.best) && current.best >= 0 ? current.best : 0;
  const score = curScore + effective;
  const safeScore = Number.isFinite(score) && score >= 0 ? score : curScore;
  return { score: safeScore, best: Math.max(curBest, safeScore) };
}

// `best` is the live session max, seeded from the persisted best. Once the
// session passes the old record, `best` equals `score` — so `isNewRecord`
// must be called with the session-start (persisted) best, never `current.best`.
export function isNewRecord(previousBest: number, score: number): boolean {
  if (!Number.isFinite(previousBest) || !Number.isFinite(score)) return false;
  if (previousBest < 0 || score < 0) return false;
  return score > previousBest;
}
