import type { Board } from './types.ts';

/**
 * Tier derived from the spawn ceiling.
 * 0 => <48, 1 => >=48, 2 => >=96, 3 => >=192, 4 => >=384, 5 => >=768,
 * then doubling: k>=1 => ceiling >= 48 * 2^(k-1) (6=>1536, 7=>3072, ...).
 * Unbounded: grows with ceiling; consumers that need a capped range
 * should clamp (e.g. potForTier caps at MAX_POT_TIER=30).
 * Float note (DW-42): log2 is closed-form per spec; drift for
 * ceilings >MAX_SAFE_INTEGER is negligible within 2048 tile bounds.
 */
export type CeilingTier = number;

/**
 * Returns the largest tile value on the board, or 0 for an empty board.
 * Pure read of board state (ADR-06 derived, not stored).
 * Defensive guards (DW-41, DW-44): skips missing/non-array rows and
 * ignores invalid tile values (non-number, NaN, non-finite, <=0).
 * Valid game tiles are positive finite powers-of-two multiples of 3;
 * engine contract boards are rectangular, but hardening avoids
 * row.length crashes on sparse/undefined input.
 */
export function ceilingDetector(board: Board): number {
  let max = 0;
  if (!Array.isArray(board)) return 0;
  for (let r = 0; r < board.length; r++) {
    const row = board[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
      if (v > max) max = v;
    }
  }
  return max;
}

/**
 * Maps a spawn ceiling to its tier via closed-form log2.
 * Contract: unbounded (no ceiling); grows as 48*2^(k-1). Capping
 * belongs to consumers like potForTier, not here (DW-43).
 * Guards (DW-42, DW-45): non-finite/negative/<48 =>0; fractional
 * handled via log2 floor; Infinity/NaN never leaks as tier;
 * very large finite ceilings stay finite (float caveat negligible).
 * Formula preserved per spec: Math.floor(Math.log2(c/48)+1e-9)+1.
 */
export function tierForCeiling(ceiling: number): CeilingTier {
  if (typeof ceiling !== 'number' || !Number.isFinite(ceiling) || ceiling < 48) return 0;
  const raw = Math.floor(Math.log2(ceiling / 48) + 1e-9) + 1;
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.trunc(raw);
}
