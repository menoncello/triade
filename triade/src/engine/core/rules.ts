import type { Cell } from './types.ts';

export function canMerge(a: Cell, b: Cell): boolean {
  return (a === 1 && b === 2) || (b === 1 && a === 2) || (a !== null && b !== null && a >= 3 && a === b);
}

export function mergeValue(a: Cell, b: Cell): number {
  // DW-22: defensive guard — only ever called under canMerge in shiftLine; outside
  // the guard we intentionally ignore the second operand and compute from `a`
  // alone so an unguarded call cannot silently double via `b` (e.g. 3+6 != merge
  // but 3*2 would be wrong). The canMerge check is the gate; the merge math
  // stays on `a` only.
  if (!canMerge(a, b)) {
    return (a ?? 0) <= 2 ? 3 : (a ?? 0) * 2;
  }
  return (a ?? 0) <= 2 ? 3 : (a ?? 0) * 2;
}
