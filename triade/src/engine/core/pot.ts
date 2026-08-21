import { POT_BASE_VALUE } from '../config/spawnConfig.ts';
import type { CeilingTier } from './ceiling.ts';

const MAX_POT_TIER = 30;

export function potForTier(tier: CeilingTier): readonly number[] {
  const t = Number.isFinite(tier) ? Math.min(Math.max(0, Math.floor(tier)), MAX_POT_TIER) : 0;
  return Array.from({ length: t + 1 }, (_, i) => POT_BASE_VALUE * 2 ** i);
}
