import type { Board, MoveResult, TraceEntry } from '../engine/core/index.ts';

export type TransitionType = 'slide' | 'merge' | 'spawn' | 'hold';

export interface TileTransition {
  type: TransitionType;
  value: number;
  to: [number, number];
  from: Array<[number, number]>;
}

export interface ResultingTile {
  cell: [number, number];
  value: number;
}

function sameCell(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function classify(entry: TraceEntry): TransitionType {
  if (entry.spawned) return 'spawn';
  if (entry.from.length === 2) return 'merge';
  if (sameCell(entry.from[0], entry.to)) return 'hold';
  return 'slide';
}

export function planTileTransitions(prevBoard: Board, result: MoveResult): TileTransition[] {
  if (!result.moved) return [];
  return result.trace.map((entry) => ({
    type: classify(entry),
    value: entry.value,
    to: entry.to,
    from: entry.from
  }));
}

export function resultingTiles(plan: TileTransition[]): ResultingTile[] {
  return plan.map((t) => ({ cell: t.to, value: t.value }));
}
