import { POT_BASE_VALUE } from '../config/spawnConfig.ts';
import type { CeilingTier } from './ceiling.ts';

const MAX_POT_TIER = 30;

// Ladder delay (2026-09-04, pedido do product owner): o pot desbloqueia 2 tiers
// depois do teto — 6 só a partir de 192 (tier 3), 12 só a partir de 384 (tier 4),
// 24 a partir de 768, etc. Tiers 0–2 ficam só com [3]. O tier do teto
// (tierForCeiling) não muda; só o mapeamento tier→pot atrasa.
const POT_LADDER_DELAY = 2;

export function potForTier(tier: CeilingTier): readonly number[] {
  const t = Number.isFinite(tier) ? Math.min(Math.max(0, Math.floor(tier)), MAX_POT_TIER) : 0;
  const effective = Math.max(0, t - POT_LADDER_DELAY);
  return Array.from({ length: effective + 1 }, (_, i) => POT_BASE_VALUE * 2 ** i);
}
