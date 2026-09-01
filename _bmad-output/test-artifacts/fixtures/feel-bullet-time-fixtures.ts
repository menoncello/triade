// TEA Automate — Fixture helpers for 8-4 Bullet Time (Rarity-Gated 200ms Flash)
// Deterministic, no @faker-js/faker — datum BULLET_TIME_MS=200 is fixed data, ladder 3/6/12.. is fixed.
// Host-only: node:test + tsx, no RN/Reanimated/Skia imports. Pure helpers mirror bulletTime.ts contract.

import { newGame, move } from '../../../triade/src/engine/core/index.ts';
import type { TraceEntry, MoveResult } from '../../../triade/src/engine/core/types.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import {
  BULLET_TIME_MS,
  maxMergeValue,
  isNewSessionBest,
  shouldTriggerBulletTime,
  nextSessionBest,
} from '../../../triade/src/feel/bulletTime.ts';

// ---------------------------------------------------------------------------
// TraceEntry helpers — mirror src/engine/core/line.ts + bulletTime.ts contract
// Board merge entries: from.length === 2 && spawned === false && Number.isFinite(value)
// Slides: from.length === 1 (no merge), Spawn: spawned === true
// ---------------------------------------------------------------------------
export function mergeEntry(value: number, to: [number, number] = [0, 0]): TraceEntry {
  return {
    value,
    to,
    from: [
      [0, 1],
      [0, 2],
    ],
    spawned: false,
  } as unknown as TraceEntry;
}

export function slideEntry(value: number, to: [number, number] = [0, 0]): TraceEntry {
  return { value, to, from: [[0, 1]], spawned: false } as unknown as TraceEntry;
}

export function spawnEntry(value: number, to: [number, number] = [3, 3]): TraceEntry {
  return { value, to, from: [], spawned: true } as unknown as TraceEntry;
}

export function spawnedMergeEntry(value: number): TraceEntry {
  // Edge: from.length===2 but spawned:true — must NOT count as board merge (chrome guard)
  return { value, to: [0, 0], from: [[0, 1], [0, 2]], spawned: true } as unknown as TraceEntry;
}

// ---------------------------------------------------------------------------
// Session best helpers — simulate App.tsx sessionBestMerge wiring (ADR-06)
// ---------------------------------------------------------------------------
export function sessionBestSequence(traces: Array<readonly TraceEntry[]>, initial = 0): number[] {
  const seq: number[] = [];
  let best = initial;
  for (const t of traces) {
    best = nextSessionBest(t as any, best);
    seq.push(best);
  }
  return seq;
}

export function undoRewindSimulation(): { before: number; afterUndo: number; retriggers: boolean } {
  let best = 0;
  best = nextSessionBest([mergeEntry(3)] as any, best); // 3
  best = nextSessionBest([mergeEntry(6)] as any, best); // 6
  best = nextSessionBest([mergeEntry(12)] as any, best); // 12
  const before = best;
  const afterUndo = 6; // pop Snapshot with sessionBestMerge 6
  const retriggers = shouldTriggerBulletTime([mergeEntry(12)] as any, afterUndo, false);
  return { before, afterUndo, retriggers };
}

// ---------------------------------------------------------------------------
// Real engine trace fixture — deterministic, no stub drift (R-003)
// Uses mulberry32 seeded RNG so trace is reproducible. Mirrors P1-01 in ATDD.
// ---------------------------------------------------------------------------
export function realEngineBulletTrace(
  seed = 42,
  dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'],
): { game: ReturnType<typeof newGame>; results: MoveResult[]; merges: TraceEntry[] } {
  const rng = mulberry32(seed);
  let game = newGame(rng);
  const results: MoveResult[] = [];
  const merges: TraceEntry[] = [];
  for (const dir of dirs) {
    const res = move(game, dir, rng) as MoveResult;
    results.push(res);
    if (res.trace) {
      for (const e of res.trace as unknown as TraceEntry[]) {
        if (!e.spawned && Array.isArray((e as any).from) && (e as any).from.length === 2 && Number.isFinite(e.value)) {
          merges.push(e);
        }
      }
    }
    if (res.moved) game = { board: res.board, pendingSpawn: res.pendingSpawn };
  }
  return { game, results, merges };
}

// ---------------------------------------------------------------------------
// Bullet gateway helpers — API-like contract checks (TEA API mapping)
// ---------------------------------------------------------------------------
export function bulletGatewayContract(trace: readonly TraceEntry[] | null | undefined, sessionBest: number) {
  const max = maxMergeValue(trace as any);
  const isNewBest = isNewSessionBest(trace as any, sessionBest);
  const shouldTrigger = shouldTriggerBulletTime(trace as any, sessionBest, false);
  const shouldTriggerReduced = shouldTriggerBulletTime(trace as any, sessionBest, true);
  const nextBest = nextSessionBest(trace as any, sessionBest);
  return { max, isNewBest, shouldTrigger, shouldTriggerReduced, nextBest };
}

export function assertBulletNeverThrows(trace: any, sessionBest: any): void {
  // Engine-never-throws extension for bullet layer — must not throw on any input
  maxMergeValue(trace);
  isNewSessionBest(trace, sessionBest);
  shouldTriggerBulletTime(trace, sessionBest, false);
  shouldTriggerBulletTime(trace, sessionBest, true);
  nextSessionBest(trace, sessionBest);
}

// ---------------------------------------------------------------------------
// Datum / timing helpers — single-source BULLET_TIME_MS=200
// ---------------------------------------------------------------------------
export function bulletTimings(): { datum: number; inMs: number; outMs: number } {
  return { datum: BULLET_TIME_MS, inMs: 60, outMs: BULLET_TIME_MS - 60 };
}

export function isBulletDatumSingleSource(gameBoardSrc: string, bulletTimeSrc: string): boolean {
  // GameBoard must import BULLET_TIME_MS and use BULLET_TIME_MS - 60, not hardcoded 140
  const hasImport = gameBoardSrc.includes('BULLET_TIME_MS');
  const hasDerived = gameBoardSrc.includes('BULLET_TIME_MS - 60');
  const bulletBlock = gameBoardSrc.slice(gameBoardSrc.indexOf('bulletFlash.value = withSequence'));
  const noHardcoded140 = !bulletBlock.includes('duration: 140');
  const hasDatum = bulletTimeSrc.includes('BULLET_TIME_MS = 200');
  return hasImport && hasDerived && noHardcoded140 && hasDatum;
}
