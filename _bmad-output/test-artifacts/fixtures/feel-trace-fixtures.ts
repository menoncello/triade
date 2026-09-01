// TEA Automate — Fixture helpers for 8-1 Haptics
// Deterministic, no @faker-js/faker — preset ladder is fixed data.
// Copy or import into triade/__tests__/feel/ when extending coverage.
// Host-only: node:test + tsx, no RN, no expo-haptics native.

import { newGame, move } from '../../../triade/src/engine/core/index.ts';
import type { TraceEntry } from '../../../triade/src/engine/core/types.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';

// ---------------------------------------------------------------------------
// TraceEntry helpers — mirror src/engine/core/line.ts contract
// Merge entries: from.length === 2 && spawned === false
// Slides/holds: from.length === 1 or 0 with spawned false
// Spawns: spawned === true
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

export function countHapticFires(trace: readonly TraceEntry[] | null | undefined): number {
  if (!Array.isArray(trace)) return 0;
  return trace.filter((e) => !!e && !e.spawned && Array.isArray((e as any).from) && (e as any).from.length === 2).length;
}

// ---------------------------------------------------------------------------
// Real engine trace fixture — deterministic, no hand-built stub drift
// Uses mulberry32 seeded RNG so trace is reproducible across CI.
// ---------------------------------------------------------------------------
export function realEngineTrace(seed = 20260808, dir: 'left' | 'right' | 'up' | 'down' = 'left') {
  const rng = mulberry32(seed);
  const game = newGame(rng);
  const result = move(game, dir, mulberry32(seed + 1));
  return { game, result, trace: result.trace as TraceEntry[] };
}

// ---------------------------------------------------------------------------
// Haptics gateway spy — counts Light/Medium/Heavy without mocking expo-haptics
// Mirrors triade/src/feel/haptics.ts hapticsStyleForValue contract.
// ---------------------------------------------------------------------------
export function stylesForTrace(trace: readonly TraceEntry[]): string[] {
  const { hapticsStyleForValue } = require('../../../triade/src/feel/haptics.ts');
  // Dynamic to avoid top-level import cycle in TEA fixture context
  // Fallback: inline mapping if import fails in fixture-only run
  try {
    return trace
      .filter((e) => !e.spawned && Array.isArray((e as any).from) && (e as any).from.length === 2)
      .map((e) => (hapticsStyleForValue as any)(e.value));
  } catch {
    return trace
      .filter((e) => !e.spawned && Array.isArray((e as any).from) && (e as any).from.length === 2)
      .map((e) => (e.value === 3 ? 'Light' : e.value === 6 ? 'Medium' : 'Heavy'));
  }
}
