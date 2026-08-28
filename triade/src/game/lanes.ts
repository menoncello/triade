export type LaneId = 'clean' | 'accelerated';

export interface LaneDef {
  id: LaneId;
  index: number;
  label: string;
  subtitle: string;
  toneLine: string;
}

export const LANES: readonly LaneDef[] = [
  {
    id: 'clean',
    index: 0,
    label: 'Pura', // TODO 5.4: t('lane.clean.label')
    subtitle: '', // Clean has no subtitle, tone line carries the fantasy
    toneLine: 'Score puro, sem ajuda.', // TODO 5.4: t('lane.clean.tone')
  },
  {
    id: 'accelerated',
    index: 1,
    label: 'Iniciante', // TODO 5.4: t('lane.accelerated.label')
    subtitle: 'Com ajuda', // TODO 5.4: t('lane.accelerated.subtitle')
    toneLine: 'Com ajuda quando precisar.', // TODO 5.4: t('lane.accelerated.tone')
  },
] as const;

export const DEFAULT_LANE: LaneId = 'clean';
export const DEFAULT_LANE_INDEX = 0;

export function laneFromIndex(index: number): LaneDef {
  if (index === 1) return LANES[1];
  return LANES[0];
}

export function indexFromId(id: LaneId): number {
  return id === 'accelerated' ? 1 : 0;
}

export function labelForLaneId(id: LaneId): string {
  return laneFromIndex(indexFromId(id)).label;
}

export function isValidLaneIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && (value === 0 || value === 1);
}
