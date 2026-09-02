import { POT_BASE_VALUE, POT_CURVE } from '../config/spawnConfig.ts';
import type { Rng } from './types.ts';

// Override+fallback contract: POT_CURVE covers the calibratable FR-7 base
// ladder (3..96). The pot ladder extends to POT_BASE_VALUE * 2^MAX_POT_TIER
// and cannot be fully enumerated in config, so values beyond the last
// configured entry continue the documented halving rule via the formula
// fallback. Retuning an unlisted value = add ONE entry to POT_CURVE.
export function potWeights(pot: readonly number[]): readonly number[] {
  return pot.map((v) => POT_CURVE[v] ?? POT_BASE_VALUE / v);
}

export function normalizeTo(target: number, weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return weights.map(() => 0);
  const scale = target / total;
  return weights.map((w) => w * scale);
}

export function weightedPicker(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return weights.length > 0 ? weights.length - 1 : 0;
  const roll = rng();
  if (typeof roll !== 'number' || Number.isNaN(roll)) return weights.length - 1;
  // DW-56 hardening: clamp malformed rng deterministically instead of collapsing
  // via fallthrough. roll >=1 (including Infinity) is clamped to the top pot
  // slot (1 - EPSILON guarantees scaled < total); roll <0 clamps to 0 (first
  // band). NaN already degraded to last index above per AC5 engine-never-throws.
  const safeRoll = Math.min(Math.max(roll, 0), 1 - Number.EPSILON);
  const scaled = safeRoll * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (scaled < acc) return i;
  }
  return weights.length - 1;
}