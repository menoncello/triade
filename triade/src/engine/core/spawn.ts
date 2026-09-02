import { GRID_SIZE, resolveGridSize, type Board, type BoardConfig, type Rng, type SpawnResult } from './types.ts';
import { FIXED_WEIGHTS, POT_WEIGHT, validateSpawnConfig } from '../config/spawnConfig.ts';
import type { CeilingTier } from './ceiling.ts';
import { tierForCeiling } from './ceiling.ts';
import { potForTier } from './pot.ts';
import { potWeights, normalizeTo, weightedPicker } from './weights.ts';

// Caller-side runtime guard (DW-46): wire validateSpawnConfig at engine init so
// a drifted FIXED_WEIGHTS/POT_WEIGHT fails fast even if spawnConfig's self-check
// is tree-shaken or bypassed via alternate entry point. Single invocation at
// module evaluation; not per-draw. Spec 2.4: weightedPicker re-normalizes but
// never asserts the sum — this invariant check closes the silent-degradation gap
// (pot absorbtion / NaN poisoning → last-index collapse).
const _spawnWeightValidation = validateSpawnConfig();
if (!_spawnWeightValidation.ok) {
  throw new Error(`[spawn] invalid spawn weights: ${_spawnWeightValidation.errors.join('; ')}`);
}

// Combined single-roll pick (promised by 2.4's AC "the combined distribution is
// picked by a weightedPicker that always re-normalizes" and 2.5's dev note
// "combined single-roll pick (that is 2.6)"): fixed 40/40 bands for values
// 1 and 2, plus the pot normalized to POT_WEIGHT — built as ONE weight array
// picked by a single weightedPicker call, which re-normalizes (N1 float rule)
// and consumes EXACTLY one rng draw per call. It consults POT_WEIGHT directly,
// closing the 2.3 deferred item "POT_WEIGHT exported but never consulted".
// Keys off spawnConfig only (boundary rule 4) — no scattered weight literals.
function pickCombined(tier: CeilingTier, rng: Rng): number {
  const pot = potForTier(tier);
  const norm = normalizeTo(POT_WEIGHT, potWeights(pot)); // sums to POT_WEIGHT (0.2)
  const combined = [FIXED_WEIGHTS[1], FIXED_WEIGHTS[2], ...norm]; // [1, 2, ...pot] bands
  const idx = weightedPicker(combined, rng); // re-normalizes (N1 float rule), 1 draw
  return idx < 2 ? idx + 1 : pot[idx - 2];
}

// THE spawn resolver for move(): same combined distribution for any ceiling;
// ceiling < 48 resolves to tier 0, whose combined pick is exactly the base
// 40/40/20. Consumes exactly one rng draw.
// Note: intentionally deviates from N1's guide signature resolveSpawn(config,
// ceiling, rng) — the config param is omitted because spawnConfig is the
// module-level single access point (boundary rule 4) and there is exactly one
// config instance; re-add the param only if a second spawn config ever exists.
export function resolveSpawn(ceiling: number, rng: Rng): number {
  return pickCombined(tierForCeiling(ceiling), rng);
}

export function pickIndex(len: number, rng: Rng): number {
  // Empty collection: no valid index exists — degrade deterministically to 0
  // instead of leaking len - 1 (-1) through the idx >= len clamp below.
  // Callers guard today (spawnTile checks empties first); this keeps the
  // engine-never-throws posture even if a future caller forgets.
  if (len <= 0) return 0;
  const idx = Math.floor(rng() * len);
  // Contract-violating rng (NaN / ±Infinity) degrades deterministically to
  // index 0 instead of poisoning downstream indexing — same defense posture
  // as weightedPicker's NaN guard; the engine never throws.
  if (!Number.isFinite(idx)) return 0;
  if (idx < 0) return 0;
  if (idx >= len) return len - 1;
  return idx;
}

// Consolidated onto the combined single-roll path (2.6): replaces the old
// two-stage draw (band roll, then a second pot-pick roll). Every call now
// consumes exactly one rng draw, regardless of tier.
export function weightedValue(rng: Rng = Math.random, tier: CeilingTier = 0): number {
  return pickCombined(tier, rng);
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

// Place, not roll: puts the given value (the materialized pendingSpawn, per
// the N3 invariant — the value is never rolled here) into a uniformly random
// empty cell (one draw via pickIndex). On a full board nothing is placed.
// An optional `candidates` pool restricts the pick to a specific set of cells
// (Story 12.1 directional spawn). When omitted, behavior is unchanged (all-empty
// pick). When provided, only empty in-bounds cells within the pool are
// eligible; a provided-but-empty pool returns nulls and consumes 0 draws
// (engine-never-throws). Out-of-bounds candidates are silently ignored.
// Hygiene (DW-23/70/75): clones the board before placing so the input is never
// mutated and the returned board is a new reference (no shared-mutable alias).
export function spawnTile(
  board: Board,
  value: number,
  rng: Rng = Math.random,
  candidates?: Array<[number, number]>,
  boardConfig?: number | BoardConfig | null
): SpawnResult {
  const size = resolveGridSize(boardConfig);
  const next = cloneBoard(board);
  if (candidates === undefined) {
    const empty: Array<[number, number]> = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r]?.[c] === null) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return { board: next, cell: null, value: null };
    const cell = empty[pickIndex(empty.length, rng)];
    next[cell[0]][cell[1]] = value;
    return { board: next, cell, value };
  }
  // DW-72/73: single-source validation for second callers (direct-API/tests).
  // Production `game.ts:53-78` already guarantees distinct in-bounds empties,
  // but direct callers may pass OOB `[4,0]`, `null`, `[r]` without `c`, or
  // duplicates that would inflate pool and bias pickIndex (break AC3).
  // Filter strictly: array-of-2 integers in bounds, empty on board, deduped.
  if (!Array.isArray(candidates)) return { board: next, cell: null, value: null };
  const seen = new Set<string>();
  const pool: Array<[number, number]> = [];
  for (const entry of candidates as unknown as unknown[]) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const r = (entry as unknown[])[0];
    const c = (entry as unknown[])[1];
    if (typeof r !== 'number' || typeof c !== 'number') continue;
    if (!Number.isInteger(r) || !Number.isInteger(c)) continue;
    if (r < 0 || r >= size || c < 0 || c >= size) continue;
    if (board[r]?.[c] !== null) continue;
    const key = `${r},${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push([r, c]);
  }
  if (pool.length === 0) return { board: next, cell: null, value: null };
  const cell = pool[pickIndex(pool.length, rng)];
  next[cell[0]][cell[1]] = value;
  return { board: next, cell, value };
}
