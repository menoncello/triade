import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { Direction } from '../engine/core/index.ts';
import { resolveSwipeDirection } from '../ui/swipe.ts';

export interface ScreenReaderGestureEvent {
  translationX: number;
  translationY: number;
  numberOfPointers?: number;
}

export function isThreeFingerMove(event: ScreenReaderGestureEvent): Direction | null {
  if (!event || typeof event.translationX !== 'number' || typeof event.translationY !== 'number') return null;
  if (!Number.isFinite(event.translationX) || !Number.isFinite(event.translationY)) return null;
  if (event.numberOfPointers !== 3) return null;
  return resolveSwipeDirection({ dx: event.translationX, dy: event.translationY });
}

export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    try {
      void AccessibilityInfo.isScreenReaderEnabled().then((v) => {
        if (mounted) setEnabled(Boolean(v));
      });
    } catch {}
    let sub: { remove: () => void } | null = null;
    try {
      sub = AccessibilityInfo.addEventListener('change', (v: boolean) => {
        setEnabled(Boolean(v));
      });
    } catch {}
    return () => {
      mounted = false;
      try {
        sub?.remove();
      } catch {}
    };
  }, []);
  return enabled;
}
