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
  const from = (entry as unknown as { from?: unknown }).from;
  if (!Array.isArray(from)) return 'slide';
  if (from.length === 2) return 'merge';
  if (from.length === 1) {
    const first = from[0] as unknown;
    const to = (entry as unknown as { to?: unknown }).to;
    if (
      Array.isArray(first) &&
      first.length === 2 &&
      Array.isArray(to) &&
      to.length === 2 &&
      typeof first[0] === 'number' &&
      typeof first[1] === 'number' &&
      typeof (to as unknown[])[0] === 'number' &&
      typeof (to as unknown[])[1] === 'number' &&
      sameCell(first as [number, number], to as [number, number])
    )
      return 'hold';
    return 'slide';
  }
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
