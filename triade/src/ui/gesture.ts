import type { Direction } from '../engine/core/index.ts';
import { resolveSwipeDirection } from './swipe.ts';

export interface SwipeEvent {
  translationX: number;
  translationY: number;
}

export interface BusyRef {
  current: boolean;
}

/**
 * Core swipe contract: busy gate + optional success gate + resolveSwipeDirection
 * then dispatch. Returns true when a direction was dispatched.
 * Mirrors App.tsx pan onEnd wiring so tests can import the real wiring
 * instead of a local copy (DW-50). No gameplay change.
 */
export function handleSwipe(
  dx: number,
  dy: number,
  busy: BusyRef,
  dispatch: (dir: Direction) => void,
  opts?: { success?: boolean }
): boolean {
  if (!busy || busy.current) return false;
  if (opts != null && 'success' in opts && !opts.success) return false;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  if (typeof dispatch !== 'function') return false;
  const dir = resolveSwipeDirection({ dx, dy });
  if (!dir) return false;
  try {
    dispatch(dir);
  } catch {
    return false;
  }
  return true;
}

export function handleGestureEnd(
  event: SwipeEvent,
  success: boolean,
  busy: BusyRef,
  dispatch: (dir: Direction) => void
): boolean {
  if (!event || typeof event.translationX !== 'number' || typeof event.translationY !== 'number') return false;
  if (!success) return false;
  return handleSwipe(event.translationX, event.translationY, busy, dispatch, { success });
}
