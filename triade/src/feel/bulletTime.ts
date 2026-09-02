// Bullet time helpers — pure, no RN imports (S8.4, UX-DR-28)
// Data datum: BULLET_TIME_MS=200 fixed for S8.4; trigger is rarity-gated (new session-best).
// Only board merges count: from.length===2 && !spawned, Number.isFinite value; never throws.

import type { TraceEntry } from '../engine/core/types.ts';

export const BULLET_TIME_MS = 200;

export function maxMergeValue(trace: readonly TraceEntry[] | undefined | null): number | null {
  try {
    if (!Array.isArray(trace) || trace.length === 0) return null;
    let max: number | null = null;
    for (const entry of trace) {
      if (!entry || entry.spawned !== false) continue;
      if (!Array.isArray(entry.from) || entry.from.length !== 2) continue;
      if (!Number.isFinite(entry.value) || entry.value < 3) continue;
      if (max === null || entry.value > max) max = entry.value;
    }
    return max;
  } catch {
    return null;
  }
}

export function isNewSessionBest(
  trace: readonly TraceEntry[] | undefined | null,
  sessionBest: number,
): boolean {
  try {
    if (!Number.isFinite(sessionBest)) return false;
    const max = maxMergeValue(trace);
    if (max === null) return false;
    return max > sessionBest;
  } catch {
    return false;
  }
}

export function shouldTriggerBulletTime(
  trace: readonly TraceEntry[] | undefined | null,
  sessionBest: number,
  reducedMotion: boolean,
): boolean {
  try {
    if (reducedMotion) return false;
    if (!Number.isFinite(sessionBest)) return false;
    return isNewSessionBest(trace, sessionBest);
  } catch {
    return false;
  }
}

export function nextSessionBest(
  trace: readonly TraceEntry[] | undefined | null,
  sessionBest: number,
): number {
  try {
    if (!Number.isFinite(sessionBest)) return 0;
    const max = maxMergeValue(trace);
    if (max === null) return sessionBest;
    if (max > sessionBest) return max;
    return sessionBest;
  } catch {
    return Number.isFinite(sessionBest) ? sessionBest : 0;
  }
}
