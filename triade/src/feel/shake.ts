// Screen shake helpers — pure, no RN imports (S8.3, UX-DR-16, S8.5)
// FR-30: Reduced Motion is a preset, not a flag — delegate to reducedPresetFor when gated.

import { presetFor, reducedPresetFor } from './feel.ts';
import type { Direction, TraceEntry } from '../engine/core/types.ts';

export const SHAKE_CAP = 8;

function clampShake(v: number): number {
  try {
    if (!Number.isFinite(v)) return 0;
    return Math.min(Math.max(v, 0), SHAKE_CAP);
  } catch {
    return 0;
  }
}

export function shakeMsFor(value: number, reducedMotion: boolean): number {
  try {
    if (reducedMotion) return reducedPresetFor(value).shakeMs;
    const raw = presetFor(value).shakeMs;
    if (!Number.isFinite(raw)) return 0;
    return Math.min(raw, SHAKE_CAP);
  } catch {
    return 0;
  }
}

export function shakeAmplitudeFor(value: number, reducedMotion: boolean): number {
  try {
    return clampShake(shakeMsFor(value, reducedMotion));
  } catch {
    return 0;
  }
}

export function directionVector(dir: Direction | string | undefined | null): { x: number; y: number } {
  try {
    if (dir === 'left') return { x: -1, y: 0 };
    if (dir === 'right') return { x: 1, y: 0 };
    if (dir === 'up') return { x: 0, y: -1 };
    if (dir === 'down') return { x: 0, y: 1 };
    return { x: 0, y: 0 };
  } catch {
    return { x: 0, y: 0 };
  }
}

export function maxShakeForTrace(
  trace: readonly TraceEntry[] | undefined | null,
  reducedMotion: boolean,
): number {
  try {
    if (reducedMotion) return 0;
    if (!Array.isArray(trace) || trace.length === 0) return 0;
    let max = 0;
    for (const entry of trace) {
      if (!entry || entry.spawned) continue;
      if (!Array.isArray(entry.from) || entry.from.length !== 2) continue;
      if (!Number.isFinite(entry.value)) continue;
      const ms = shakeMsFor(entry.value, false);
      if (ms > max) max = ms;
    }
    return clampShake(max);
  } catch {
    return 0;
  }
}

export function shouldShake(
  trace: readonly TraceEntry[] | undefined | null,
  reducedMotion: boolean,
): boolean {
  try {
    if (reducedMotion) return false;
    if (!Array.isArray(trace) || trace.length === 0) return false;
    return maxShakeForTrace(trace, false) > 0;
  } catch {
    return false;
  }
}
