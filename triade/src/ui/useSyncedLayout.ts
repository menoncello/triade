import { useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layoutFor, getBandTop } from './layout.ts';
import type { LayoutResult, EdgeInsets } from './layout.ts';

export interface SyncedLayoutResult extends LayoutResult {
  width: number;
  height: number;
  insets: EdgeInsets;
  bandTop: number;
}

const DEFAULT_DEBOUNCE_MS = 32;

/**
 * Coalesces `useWindowDimensions` and `useSafeAreaInsets` which update on
 * different frames during rotation. Debounces the commit so intermediate
 * mismatched (width/height vs stale insets) values that would make
 * `layoutFor` return 0 or a transient wrong size are never rendered.
 * Holds the last valid `boardSize` across transient 0 results.
 */
export function useSyncedLayout(debounceMs: number = DEFAULT_DEBOUNCE_MS): SyncedLayoutResult {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [synced, setSynced] = useState(() => ({ width, height, insets }));
  const pendingRef = useRef({ width, height, insets });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValidLayoutRef = useRef<LayoutResult>(layoutFor({ width, height, insets }));

  // Keep pending in sync for debounce commit
  useEffect(() => {
    pendingRef.current = { width, height, insets };
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (debounceMs <= 0) {
      setSynced({ width, height, insets });
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setSynced(pendingRef.current);
    }, debounceMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [width, height, insets.top, insets.bottom, insets.left, insets.right, debounceMs]);

  // Derive layout from synced (debounced) values, but guard transient 0.
  const rawLayout = useMemo(() => layoutFor(synced), [synced.width, synced.height, synced.insets.top, synced.insets.bottom, synced.insets.left, synced.insets.right]);

  const effectiveLayout = useMemo(() => {
    if (rawLayout.boardSize === 0 && lastValidLayoutRef.current.boardSize > 0) {
      return lastValidLayoutRef.current;
    }
    if (rawLayout.boardSize > 0) {
      lastValidLayoutRef.current = rawLayout;
    }
    return rawLayout.boardSize > 0 ? rawLayout : lastValidLayoutRef.current.boardSize > 0 ? lastValidLayoutRef.current : rawLayout;
  }, [rawLayout]);

  const bandTop = useMemo(() => getBandTop(synced.insets, effectiveLayout.bandHeight), [synced.insets, effectiveLayout.bandHeight]);

  return {
    width: synced.width,
    height: synced.height,
    insets: synced.insets,
    boardSize: effectiveLayout.boardSize,
    bandHeight: effectiveLayout.bandHeight,
    isLandscape: effectiveLayout.isLandscape,
    bandTop,
  };
}

/** Pure helper for tests: coalesce logic without hooks. */
export function coalesceLayout(
  pending: { width: number; height: number; insets: EdgeInsets },
  lastValid: LayoutResult | null,
): LayoutResult {
  const next = layoutFor(pending);
  if (next.boardSize === 0 && lastValid && lastValid.boardSize > 0) return lastValid;
  return next;
}
