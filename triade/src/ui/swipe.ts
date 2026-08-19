import type { Direction } from '../engine/core/index.ts';

export const SWIPE_THRESHOLD = 10;

export interface SwipeInput {
  dx: number;
  dy: number;
  threshold?: number;
}

export function resolveSwipeDirection({ dx, dy, threshold = SWIPE_THRESHOLD }: SwipeInput): Direction | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax === ay) return null;
  if (ax > ay) {
    if (ax < threshold) return null;
    return dx > 0 ? 'right' : 'left';
  }
  if (ay < threshold) return null;
  return dy > 0 ? 'down' : 'up';
}
