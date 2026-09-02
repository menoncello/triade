export { GRID_SIZE } from './types.ts';
export type { Board, Cell, Direction, GameState, MoveResult, PendingSpawn, Rng, SpawnResult, TraceEntry } from './types.ts';
export { canMerge, mergeValue } from './rules.ts';
export { emptyBoard, boardsEqual } from './board.ts';
export { movementLines, shiftLine, boardFromLines } from './line.ts';
export { ceilingDetector, tierForCeiling } from './ceiling.ts';
export type { CeilingTier } from './ceiling.ts';
export { pickIndex, weightedValue, resolveSpawn, spawnTile } from './spawn.ts';
export { potForTier } from './pot.ts';
export { potWeights, normalizeTo, weightedPicker } from './weights.ts';
export {
  POT_WEIGHT,
  FIXED_WEIGHTS,
  POT_BASE_VALUE,
  POT_CURVE,
  validateSpawnConfig,
} from '../config/spawnConfig.ts';
export { newGame, move, isGameOver, stateFromResult } from './game.ts';
