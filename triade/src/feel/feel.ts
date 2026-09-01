// Feel preset — data, not code (UX-DR-16, S8.1)
// Pure, tested, host-bound; benchmark sweeps every preset.

export type HapticStyle = 'light' | 'medium' | 'heavy';

export interface FeelPreset {
  haptic: HapticStyle;
  shakeMs: number;
  particleBurst: number;
  overshootMs: number;
  overshootScale: number;
  flash: boolean;
}

// Canonical feel presets per tier band.
// Haptic mapping pinned by story 8-1:
//   3 -> light, 6 -> medium, 12+ -> heavy
// Other fields carry UX-DR-16 defaults so 8.2-8.5 can tune without rework.
// Values: shakeMs 2/5 capped 8 (UX-DR-16), particle/overshoot/flash scale with value.
const PRESET_LIGHT: FeelPreset = Object.freeze({
  haptic: 'light',
  shakeMs: 2,
  particleBurst: 4,
  overshootMs: 80,
  overshootScale: 1.08,
  flash: false,
} as const);

const PRESET_MEDIUM: FeelPreset = Object.freeze({
  haptic: 'medium',
  shakeMs: 2,
  particleBurst: 8,
  overshootMs: 100,
  overshootScale: 1.12,
  flash: false,
} as const);

const PRESET_HEAVY: FeelPreset = Object.freeze({
  haptic: 'heavy',
  shakeMs: 5,
  particleBurst: 16,
  overshootMs: 120,
  overshootScale: 1.15,
  flash: true,
} as const);

// Frozen map keyed by tier representative value.
// Data-driven lookup — not branching code per story.
export const FEEL_PRESETS: Readonly<Record<number, FeelPreset>> = Object.freeze({
  3: PRESET_LIGHT,
  6: PRESET_MEDIUM,
  12: PRESET_HEAVY,
} as const);

// All supported ladder values for exhaustive test sweeps.
// Includes 13 tiers to match tile manifest (3..3072); heavy tier covers 12+.
const ALL_TIERS: readonly number[] = Object.freeze([3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288]);

/**
 * Pure lookup: value -> FeelPreset for its tier band.
 * - 3 => light (PRESET_LIGHT)
 * - 6 => medium (PRESET_MEDIUM)
 * - 12+ (any >=12) => heavy (PRESET_HEAVY)
 * - Non-finite / <3 / unknown small values fall back to light (never throws).
 * Frozen identity: returns the canonical frozen preset object (memo-safe).
 */
export function presetFor(value: number): FeelPreset {
  if (!Number.isFinite(value)) return PRESET_LIGHT;
  if (value === 3) return PRESET_LIGHT;
  if (value === 6) return PRESET_MEDIUM;
  if (value >= 12) return PRESET_HEAVY;
  // Defensive: 0,1,2, negative, NaN, etc. — lightest preset (haptics still fire if called, never crash)
  return PRESET_LIGHT;
}

// Exposed for benchmark sweep without leaking internal constants.
export function allPresetValues(): readonly number[] {
  return ALL_TIERS;
}

// Reduced Motion preset is a preset, not a flag (UX-DR-16, FR-30).
// Haptics stay, other effects are cut/smoothed. See story 8.5 for full gating.
const REDUCED_PRESET: FeelPreset = Object.freeze({
  haptic: 'light', // placeholder — callers keep original haptic; this preset gates visual only
  shakeMs: 0,
  particleBurst: 0,
  overshootMs: 0,
  overshootScale: 1,
  flash: false,
} as const);

export function reducedPresetFor(value: number): FeelPreset {
  // Haptic is preserved from the full preset — Reduced Motion keeps haptics+sound (FR-30).
  const full = presetFor(value);
  return { ...REDUCED_PRESET, haptic: full.haptic };
}
