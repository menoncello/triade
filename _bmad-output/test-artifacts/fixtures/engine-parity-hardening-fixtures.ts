/**
 * Fixtures — dw-engine-parity-hardening (deterministic, host-only, no faker)
 * Spawn-nothing / blind-spot / multi-move / ladder-ceiling chain
 * Mirrors triade/test-utils/helpers.ts + triade/src/utils/mulberry32.ts deterministic harness
 * No Playwright test.extend — pure node:test + tsx helpers.
 * This file is TEA-required fixture surface under test_artifacts/fixtures; the oracle helpers live in triade/test-utils/helpers.ts (already hardened DW-3/48/59/60/66).
 */
import { boardWith, emptyBoard, gameState, rngOf, spyRng, stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import * as game from '../../../triade/src/engine/core/index.ts';
import type { Board, Direction, GameState } from '../../../triade/src/engine/core/index.ts';

export { boardWith, emptyBoard, gameState, rngOf, spyRng, stripCommentsAndStrings, mulberry32 };

// ── Board factories ───────────────────────────────────────────────────────
export function fullBoard(): Board {
  return boardWith([[1,3,6,12],[6,12,1,3],[3,1,12,6],[12,6,3,1]]);
}
export function cloneBoard(b: Board): Board { return b.map((r)=>r.slice()); }
export function boardWithMax(max: number | null): Board {
  if (max===null||max===0) return emptyBoard();
  const b=emptyBoard(); b[0][0]=max as number; return b;
}

// ── Seeded replay factory (shared mulberry32 stream) ──────────────────────
export function replay(seed:number, dirs:Direction[]) {
  const rng=mulberry32(seed); let state:GameState=game.newGame(rng);
  const boards:Board[]=[cloneBoard(state.board)]; const scores:number[]=[]; const states:GameState[]=[state]; let cumulative=0;
  for(const d of dirs){ const r=game.move(state,d,rng); cumulative+=r.score; scores.push(r.score); state={board:r.board, pendingSpawn:r.pendingSpawn}; boards.push(cloneBoard(state.board)); states.push(state); }
  return { boards, scores, states, cumulative };
}

// ── Deterministic pins (hand-computed literals, not oracle recomputation) ──
export const LADDER_12: Array<{ ceiling:number; tier:number; pot:number[] }> = [
  { ceiling:0,tier:0,pot:[3]}, { ceiling:3,tier:0,pot:[3]}, { ceiling:12,tier:0,pot:[3]}, { ceiling:24,tier:0,pot:[3]}, { ceiling:47,tier:0,pot:[3]},
  { ceiling:48,tier:1,pot:[3,6]}, { ceiling:96,tier:2,pot:[3,6,12]}, { ceiling:192,tier:3,pot:[3,6,12,24]}, { ceiling:384,tier:4,pot:[3,6,12,24,48]}, { ceiling:768,tier:5,pot:[3,6,12,24,48,96]},
  { ceiling:1536,tier:6,pot:[3,6,12,24,48,96,192]}, { ceiling:3072,tier:7,pot:[3,6,12,24,48,96,192,384]},
];
export const SEED_42_DIRS: Direction[] = ['left','up','right','down','left','left','up','down','right','up'];
export const SEED_20260808_DIRS: Direction[] = Array.from({length:20},(_,i)=>(['left','up','right','down'] as Direction[])[i%4]);
export const SEED_0XC31_DIRS: Direction[] = Array.from({length:50},(_,i)=>(['left','right','up','down'] as Direction[])[i%4]);

// ── Scan helpers (mirror helpers.ts stripCommentsAndStrings) ───────────────
export function ledgerMatches(text:string, hash:string): number { return (text.match(new RegExp(hash,'g'))||[]).length; }
export const LEDGER_HASH = '043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b';
export const AVAILABLE_POT_PIPELINE = /availablePot\s*=\s*potForTier\s*\(\s*tierForCeiling\s*\(\s*ceilingDetector\s*\(\s*game\.board/;
export const SESSION_START_BEST = /isNewRecord\s*\(\s*sessionStartBest/;
