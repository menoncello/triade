import type { Cell } from './types.ts';

export function canMerge(a: Cell, b: Cell): boolean {
  return (a === 1 && b === 2) || (b === 1 && a === 2) || (a !== null && b !== null && a >= 3 && a === b);
}

export function mergeValue(a: Cell, b: Cell): number {
  return (a ?? 0) <= 2 ? 3 : (a ?? 0) * 2;
}
