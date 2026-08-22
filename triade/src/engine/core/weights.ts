import { POT_BASE_VALUE } from '../config/spawnConfig.ts';
import type { Rng } from './types.ts';

export function potWeights(pot: readonly number[]): readonly number[] {
  return pot.map((v) => POT_BASE_VALUE / v);
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
  const scaled = roll * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (scaled < acc) return i;
  }
  return weights.length - 1;
}