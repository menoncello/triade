// TEA automate fixtures — 8-2 punch-visual working-tree delta.
// Host-only: node:test + tsx, no RN/native imports. Pure data builders so
// API-level (unit) and E2E-contract tests share one source of truth.
import { presetFor } from '../../../src/feel/feel.ts';
import { punchProfileFor } from '../../../src/feel/punch.ts';

export const LIGHT_TIERS = [3] as const;
export const MEDIUM_TIERS = [6] as const;
export const HEAVY_TIERS = [12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288] as const;
export const ALL_TIERS = [3, 6, ...HEAVY_TIERS] as const;
export const GLOW_TIERS = [1536, 3072, 6144, 12288] as const;
export const NO_GLOW_TIERS = [1, 2, 3, 6, 12, 768] as const;

export const EXPECTED_DURATION: Record<string, number> = { light: 80, medium: 100, heavy: 120 };

export function tierClass(value: number): 'light' | 'medium' | 'heavy' {
  if (value === 6) return 'medium';
  if (value === 3 || value < 6) return 'light';
  return 'heavy';
}

/** Minimal trace-entry builder mirroring engine trace shape (type/from/spawned). */
export function mergeEntry(to: [number, number], value: number) {
  return { type: 'merge' as const, from: [[to[0] - 1, to[1]], to] as [number, number][], to, value, spawned: false };
}

export function spawnEntry(to: [number, number], value: number) {
  return { type: 'spawn' as const, from: [to] as [number, number][], to, value, spawned: true };
}

/** Expected full punch profile for a tier (non-reduced). Single source of truth. */
export function expectedProfile(value: number) {
  const preset = presetFor(value);
  const cls = tierClass(value);
  return {
    scale: preset.overshootScale,
    duration: EXPECTED_DURATION[cls],
    flash: cls === 'heavy',
    particles: preset.particleBurst,
    glow: GLOW_TIERS.includes(value as never),
    host: punchProfileFor(value, false),
  };
}

/** Reduced-motion profile: all visual cut, haptic preserved by reducedPresetFor. */
export function expectedReducedProfile(value: number) {
  return { scale: 1, duration: 0, flash: false, particles: 0, glow: false, host: punchProfileFor(value, true) };
}
