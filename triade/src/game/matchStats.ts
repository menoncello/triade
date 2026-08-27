import { ceilingDetector } from '../engine/core/ceiling.ts';
import type { Board, MoveResult } from '../engine/core/types.ts';

// Canônico `classify` vive em `src/render/transitionPlan.ts:21` — `from.length===2` é o fallback
// permitido (spec T1). Importar aqui blindaria contra evolução do TraceEntry, mas `src/game`
// é purity root (`engine.purity.test.ts`) e `src/render` não é same-dir; manter fallback inline
// evita cross-layer import e mantém `src/game` relativo-only. Equivalência pinada em testes
// via `!spawned && from.length===2` (line.ts:40-43). Se trace evoluir, migrar para `classify`.

export interface MatchStats {
  merges: number;
  longestStreak: number;
  maxTile: number;
  currentStreak: number;
}

export function initialStats(board: Board): MatchStats {
  return {
    merges: 0,
    longestStreak: 0,
    currentStreak: 0,
    maxTile: ceilingDetector(board),
  };
}

export function applyMoveStats(prev: MatchStats, board: Board, result: MoveResult): MatchStats {
  let mergeCountThisMove = 0;
  for (const e of result.trace) {
    if (!e.spawned && e.from.length === 2) mergeCountThisMove++;
  }
  const merges = prev.merges + mergeCountThisMove;
  const currentStreak = mergeCountThisMove > 0 ? prev.currentStreak + 1 : 0;
  const longestStreak = Math.max(prev.longestStreak, currentStreak);
  const maxTile = Math.max(prev.maxTile, ceilingDetector(board));
  return { merges, longestStreak, maxTile, currentStreak };
}
