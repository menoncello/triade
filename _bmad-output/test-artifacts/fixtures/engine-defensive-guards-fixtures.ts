// TEA Automate — Fixtures for dw-engine-defensive-guards
// Deterministic, no @faker-js/faker — defensive guards are pure TS with fixed literals.
// Host-only: node:test + tsx, no RN/Reanimated/Skia, no Playwright browser.
// Spec: spec-engine-defensive-guards.md (DW-24 matchScore NaN/Infinity/-5+noop, DW-30 classify empty/malformed from, DW-65 pendingSpawn {1,0} fallback, 10-row I-O matrix, 5 ACs, baseline 266aa03 → 000b640)
// Test-design: test-design-dw-engine-defensive-guards.md (10 risks, 3 high score 6: R-001 score poison, R-002 from deref, R-003 pendingSpawn malformed; P0 17 checks, P1 63, P2 5, P3 5)
// ATDD: triade/__tests__/engine/defensive-guards.atdd.test.ts (24 it.skip, P0 11 + P1 6 + P2 4 + P3 3)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Source-scan helpers — single guard / single helper invariants
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function matchScoreSrc(): string {
  return readSrc('triade/src/game/matchScore.ts');
}
export function transitionPlanSrc(): string {
  return readSrc('triade/src/render/transitionPlan.ts');
}
export function gameSrc(): string {
  return readSrc('triade/src/engine/core/game.ts');
}
export function typesSrc(): string {
  return readSrc('triade/src/engine/core/types.ts');
}
export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function sprintStatusSrc(): string {
  try {
    return readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
  } catch {
    return readSrc('_bmad-output/sprint-status.yaml');
  }
}
export function specSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/spec-engine-defensive-guards.md');
}

// --- matchScore scans (DW-24) ---
export function countIsFiniteRaw(): number {
  return (matchScoreSrc().match(/Number\.isFinite\(raw\)/g) ?? []).length;
}
export function countRawGte0(): number {
  return (matchScoreSrc().match(/raw >= 0/g) ?? []).length;
}
export function countMovedSanitized(): number {
  return (matchScoreSrc().match(/result\.moved \? sanitized/g) ?? []).length;
}
export function countBareScoreSum(): number {
  return (matchScoreSrc().match(/current\.score \+ result\.score/g) ?? []).length;
}
export function countEffectiveSum(): number {
  return (matchScoreSrc().match(/current\.score \+ effective/g) ?? []).length;
}

// --- transitionPlan scans (DW-30) ---
export function countArrayIsArrayFrom(): number {
  return (transitionPlanSrc().match(/Array\.isArray\(from\)/g) ?? []).length;
}
export function countFromLen2(): number {
  return (transitionPlanSrc().match(/from\.length === 2/g) ?? []).length;
}
export function countFromLen1(): number {
  return (transitionPlanSrc().match(/from\.length === 1/g) ?? []).length;
}
export function countArrayIsArrayFirst(): number {
  return (transitionPlanSrc().match(/Array\.isArray\(first\)/g) ?? []).length;
}
export function countArrayIsArrayTo(): number {
  return (transitionPlanSrc().match(/Array\.isArray\(to\)/g) ?? []).length;
}
export function countSameCellFirst(): number {
  return (transitionPlanSrc().match(/sameCell\(first/g) ?? []).length;
}
export function countBareSameCellEntryFrom0(): number {
  return (transitionPlanSrc().match(/sameCell\(entry\.from\[0\]/g) ?? []).length;
}
export function countBareEntryFromLength(): number {
  return (transitionPlanSrc().match(/entry\.from\.length/g) ?? []).length;
}

// --- game.ts scans (DW-65) ---
export function countSanitizePendingDef(): number {
  return (gameSrc().match(/function sanitizePending/g) ?? []).length;
}
export function countSanitizePendingCall(): number {
  return (gameSrc().match(/sanitizePending\(/g) ?? []).length;
}
export function countSafePendingValue(): number {
  return (gameSrc().match(/safePending\.value/g) ?? []).length;
}
export function countSpreadSafePending(): number {
  return (gameSrc().match(/\.\.\.safePending/g) ?? []).length;
}
export function countBareStatePendingValue(): number {
  return (gameSrc().match(/state\.pendingSpawn\.value/g) ?? []).length;
}
export function countBareStatePending(): number {
  return (gameSrc().match(/state\.pendingSpawn/g) ?? []).length;
}
export function countDisplayRollWindow(): number {
  return (gameSrc().match(/dr >= 0 && dr < 1/g) ?? []).length;
}
export function countGridSize(): number {
  return (typesSrc().match(/export const GRID_SIZE/g) ?? []).length;
}
export function ledgerHasDWs(): boolean {
  const s = ledgerSrc();
  return (
    /DW-24[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /DW-30[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /DW-65[\s\S]*?status:\s*done 2026-09-02/.test(s) &&
    /resolution-undo:\s*[0-9a-f]{64}/.test(s)
  );
}
export function ledgerUndoHitCount(): number {
  return [...ledgerSrc().matchAll(/resolution-undo:\s*[0-9a-f]{64}/gi)].length;
}
export function ledgerDoneHitCount(): number {
  return [...ledgerSrc().matchAll(/status:\s*done 2026-09-02/gi)].length;
}
export function ledgerHasSweepHash(): boolean {
  return ledgerSrc().includes('f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18');
}
export function sprintStatusHasNoBundle(): boolean {
  return !sprintStatusSrc().includes('dw-engine-defensive-guards');
}

// ---------------------------------------------------------------------------
// Board fixtures — deterministic, mirror helpers.ts + spec Verification probe
// ---------------------------------------------------------------------------
import type { Board } from '../../../triade/src/engine/core/types.ts';
import { boardWith, emptyBoard } from '../../../triade/test-utils/helpers.ts';

// Effective board: row 0 has gap so left move compacts and spawns at opposite edge [0,3]
export function effectiveBoard(): Board {
  const b = emptyBoard();
  b[0] = [1, 2, null, null];
  for (let r = 1; r < 4; r++) b[r] = [3, 6, 12, 24] as any;
  return b;
}

// Noop board: compact with no merges, left move does nothing
// Use distinct non-merging values per row: 3+12 false, 12+48 false, etc. (1+2 would merge, so avoid 1 next to 2)
export function noopBoard(): Board {
  const b = emptyBoard();
  b[0] = [3, 12, 48, 192] as any;
  b[1] = [6, 24, 96, 384] as any;
  b[2] = [12, 48, 192, 768] as any;
  b[3] = [24, 96, 384, 1536] as any;
  return b;
}

// TraceEntry fixtures for transitionPlan classify
export const EMPTY_FROM_ENTRY = { value: 3, to: [0, 0] as [number, number], from: [] as unknown as Array<[number, number]>, spawned: false as const };
export const UNDEFINED_FROM_ENTRY = { value: 3, to: [0, 0] as [number, number], from: undefined as unknown as Array<[number, number]>, spawned: false as const };
export const NULL_FROM_ENTRY = { value: 3, to: [0, 0] as [number, number], from: null as unknown as Array<[number, number]>, spawned: false as const };
export const NON_ARRAY_FROM_ENTRY = { value: 3, to: [0, 0] as [number, number], from: {} as unknown as Array<[number, number]>, spawned: false as const };
export const MERGE_ENTRY = { value: 3, to: [0, 0] as [number, number], from: [[0, 0], [0, 1]] as Array<[number, number]>, spawned: false as const };
export const HOLD_ENTRY = { value: 3, to: [0, 0] as [number, number], from: [[0, 0]] as Array<[number, number]>, spawned: false as const };
export const SLIDE_ENTRY = { value: 3, to: [0, 1] as [number, number], from: [[0, 0]] as Array<[number, number]>, spawned: false as const };
export const SPAWN_ENTRY = { value: 2, to: [3, 3] as [number, number], from: [] as Array<[number, number]>, spawned: true as const };

// Score fixtures for matchScore matrix
export const BAD_SCORES: Array<{ raw: unknown; label: string }> = [
  { raw: NaN, label: 'NaN' },
  { raw: Infinity, label: 'Infinity' },
  { raw: -Infinity, label: '-Infinity' },
  { raw: -5, label: '-5' },
  { raw: -0.1, label: '-0.1' },
  { raw: '3' as unknown as number, label: 'string "3"' },
];
export const VALID_SCORES: Array<{ raw: number; moved: boolean; expected: number }> = [
  { raw: 3, moved: true, expected: 3 },
  { raw: 0, moved: false, expected: 0 },
  { raw: 3.5, moved: true, expected: 3.5 },
];

// PendingSpawn fixtures for game.move
export const BAD_PENDING_VALUES: Array<{ value: unknown; label: string }> = [
  { value: 0, label: '0' },
  { value: -1, label: '-1' },
  { value: Infinity, label: 'Infinity' },
  { value: -Infinity, label: '-Infinity' },
  { value: '3' as unknown as number, label: 'string "3"' },
  { value: null, label: 'null' },
  { value: undefined, label: 'undefined' },
  { value: NaN, label: 'NaN' },
];
export const BAD_DISPLAY_ROLLS: Array<{ dr: unknown; label: string }> = [
  { dr: -0.1, label: '-0.1' },
  { dr: 1, label: '1' },
  { dr: 1.5, label: '1.5' },
  { dr: NaN, label: 'NaN' },
  { dr: Infinity, label: 'Infinity' },
  { dr: -Infinity, label: '-Infinity' },
  { dr: '0.5' as unknown as number, label: 'string "0.5"' },
];
export const VALID_PENDING = { value: 2, displayRoll: 0.5 };
export const VALID_PENDING_DISPLAY_ZERO = { value: 2, displayRoll: 0 };

// ---------------------------------------------------------------------------
// Bench helper — guards O(1) per call
// ---------------------------------------------------------------------------
import { applyMove } from '../../../triade/src/game/matchScore.ts';
import { planTileTransitions } from '../../../triade/src/render/transitionPlan.ts';
import { move } from '../../../triade/src/engine/core/game.ts';
import { rngOf } from '../../../triade/test-utils/helpers.ts';

export function guardsBench(iterations = 5000): { elapsed: number; ok: boolean } {
  const b = effectiveBoard();
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: NaN, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } } as any);
    planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [EMPTY_FROM_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    move({ board: b, pendingSpawn: undefined as any }, 'left', rngOf(0, 0.5, 0.2));
  }
  const elapsed = performance.now() - t0;
  return { elapsed, ok: elapsed < 500 };
}

// ---------------------------------------------------------------------------
// Re-exports — mirrors engine surface + helpers
// ---------------------------------------------------------------------------
export { applyMove, initialScore } from '../../../triade/src/game/matchScore.ts';
export { planTileTransitions } from '../../../triade/src/render/transitionPlan.ts';
export { move, isGameOver } from '../../../triade/src/engine/core/game.ts';
export { GRID_SIZE } from '../../../triade/src/engine/core/types.ts';
export { boardWith, emptyBoard, gameState, rngOf, spyRng } from '../../../triade/test-utils/helpers.ts';
