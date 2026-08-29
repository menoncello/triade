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
    label: 'Pura',
    subtitle: '',
    toneLine: 'Score puro, sem ajuda.',
  },
  {
    id: 'accelerated',
    index: 1,
    label: 'Iniciante',
    subtitle: 'Com ajuda',
    toneLine: 'Com ajuda quando precisar.',
  },
] as const;

export const DEFAULT_LANE: LaneId = 'clean';
export const DEFAULT_LANE_INDEX = 0;

export interface LaneProfile {
  id: LaneId;
  canUndo: boolean;
  canHint: boolean;
  canContinue: boolean;
  allowAds: boolean;
  showLearningAids: boolean;
  leaderboard: 'clean' | 'assisted';
}

export const LANE_PROFILES: Readonly<Record<LaneId, LaneProfile>> = {
  clean: {
    id: 'clean',
    canUndo: false,
    canHint: false,
    canContinue: false,
    allowAds: false,
    showLearningAids: false,
    leaderboard: 'clean',
  },
  accelerated: {
    id: 'accelerated',
    canUndo: true,
    canHint: true,
    canContinue: true,
    allowAds: true,
    showLearningAids: true,
    leaderboard: 'assisted',
  },
} as const;

export function profileForLaneId(id: LaneId): LaneProfile {
  if (id === 'accelerated') return LANE_PROFILES.accelerated;
  return LANE_PROFILES.clean;
}

export function profileForIndex(index: number): LaneProfile {
  return profileForLaneId(laneFromIndex(index).id);
}

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

export function isLaneId(value: unknown): value is LaneId {
  return value === 'clean' || value === 'accelerated';
}
