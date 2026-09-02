// Haptics gateway — thin observer over expo-haptics (S8.1, UX-DR-16)
// FR-30: haptics stay under Reduced Motion — never gate on reducedMotion.
// Best-effort, never throws, never blocks gameplay.

import { presetFor } from './feel.ts';
import type { TraceEntry } from '../engine/core/types.ts';

export type HapticsImpactStyle = 'Light' | 'Medium' | 'Heavy';

function styleForValue(value: number): HapticsImpactStyle {
  const preset = presetFor(value);
  if (preset.haptic === 'light') return 'Light';
  if (preset.haptic === 'medium') return 'Medium';
  return 'Heavy';
}

// Low-level: fire a single haptic for a merged tile value.
// Dynamic import so test envs without native module stay green; catch-all swallows failures.
export function triggerHapticsForMerge(value: number): void {
  try {
    const style = styleForValue(value);
    // Fire-and-forget — never await, never block the move dispatch.
    // @ts-ignore expo-haptics optional — SDK 57 pinned, may not be installed in test env
    void import('expo-haptics')
      .then((mod: any) => {
        const impactStyle = mod?.ImpactFeedbackStyle?.[style];
        if (impactStyle !== undefined && typeof mod.impactAsync === 'function') {
          return mod.impactAsync(impactStyle);
        }
        // Fallback: some SDKs expose Haptics.impactAsync directly; try generic.
        if (typeof mod.impactAsync === 'function' && impactStyle !== undefined) {
          return mod.impactAsync(impactStyle);
        }
      })
      .catch(() => {});
  } catch {
    // Engine never throws rule: haptics layer also never throws.
  }
}

// High-level: observe a MoveResult trace and fire one haptic per merge entry.
// Merge entries are trace entries where from.length===2 && spawned===false (line.ts contract).
export function triggerHapticsForTrace(trace: readonly TraceEntry[] | undefined | null): void {
  if (!Array.isArray(trace) || trace.length === 0) return;
  for (const entry of trace) {
    if (!entry || entry.spawned) continue;
    if (!Array.isArray(entry.from) || entry.from.length !== 2) continue;
    triggerHapticsForMerge(entry.value);
  }
}

// Test seam: synchronous mapper for unit tests that inject a mock invoker.
// Pure mapping, no import — lets tests assert the 3/6/12+ -> Light/Medium/Heavy mapping without mocking the dynamic import.
export function hapticsStyleForValue(value: number): HapticsImpactStyle {
  return styleForValue(value);
}
