// Punch visual — pure helpers over FeelPreset (S8.2, S8.5)
// Host-testable, no RN/Reanimated imports; board decides imperative mounting.
// FR-30: Reduced Motion is a preset, not a flag — delegate to reducedPresetFor when gated.

import { presetFor, reducedPresetFor } from './feel.ts';

export function punchScaleFor(value: number, reducedMotion: boolean): number {
  if (reducedMotion) return reducedPresetFor(value).overshootScale;
  return presetFor(value).overshootScale;
}

export function punchDurationFor(value: number, reducedMotion: boolean): number {
  if (reducedMotion) return reducedPresetFor(value).overshootMs;
  return presetFor(value).overshootMs;
}

export function shouldFlash(value: number, reducedMotion: boolean): boolean {
  if (reducedMotion) return reducedPresetFor(value).flash;
  return presetFor(value).flash;
}

export function particleCountFor(value: number, reducedMotion: boolean): number {
  if (reducedMotion) return reducedPresetFor(value).particleBurst;
  return presetFor(value).particleBurst;
}

export function shouldGlow(value: number, reducedMotion: boolean): boolean {
  if (reducedMotion) return false;
  if (!Number.isFinite(value)) return false;
  // 1536+ glow is the only glow (S8.2) and is flat under reduced preset (UX-DR-16)
  return value >= 1536;
}

// Composite convenience for tests — never throws
export function punchProfileFor(value: number, reducedMotion: boolean): {
  scale: number;
  duration: number;
  flash: boolean;
  particles: number;
  glow: boolean;
} {
  return {
    scale: punchScaleFor(value, reducedMotion),
    duration: punchDurationFor(value, reducedMotion),
    flash: shouldFlash(value, reducedMotion),
    particles: particleCountFor(value, reducedMotion),
    glow: shouldGlow(value, reducedMotion),
  };
}
