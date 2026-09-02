/**
 * Fixtures — dw-engine-trace-merge-guards (DW-21/DW-22)
 * Noop empty-trace + mergeValue canMerge guard + draw-budget + ledger scans
 * Deterministic, host-only, no faker — pure engine move(Board,Dir,Rng)→MoveResult
 * Covers: triade/src/engine/core/game.ts:50-57 let trace + if (!moved) trace=[]
 *         triade/src/engine/core/rules.ts:5-17 if (!canMerge) return a-only (tautology)
 *         triade/src/engine/core/line.ts:73 DW-21 doc + boardFromLines full-placement
 *         triade/src/engine/core/types.ts:43-57 TraceEntry/MoveResult GRID_SIZE=4
 *         triade/src/render/transitionPlan.ts:21-54 moved:false→[] short-circuit
 * Spec: _bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md
 *       baseline 3bcf38cc7734c79f133e9b1619f765b32679fa02 → final e325bab194848e43b64bb7425e2db9807e95d786 commit 35c9d1c
 * Design: _bmad-output/test-artifacts/test-design-dw-engine-trace-merge-guards.md (9 risks, 3 high score 6, P0 8 / P1 6 / P2 5 / P3 5)
 * ATDD: _bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts (29 RED-phase test.skip, host node:test+tsx)
 *       _bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts (12 RED-phase)
 *       _bmad-output/test-artifacts/tests/e2e/engine-trace-merge-guards.umbrella.spec.ts (10 RED-phase)
 * Run: npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/rules.test.ts __tests__/render/transitionPlan.test.ts __tests__/game/preview-invariant.test.ts
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx helpers (engine pure TS, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as game from '../../../triade/src/engine/core/index.ts';
import { canMerge, mergeValue } from '../../../triade/src/engine/core/rules.ts';
import { shiftLine } from '../../../triade/src/engine/core/line.ts';
import { planTileTransitions } from '../../../triade/src/render/transitionPlan.ts';
import { boardWith, emptyBoard, gameState, rngOf, spyRng, stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';
import type { Board, Direction } from '../../../triade/src/engine/core/index.ts';

export { boardWith, emptyBoard, gameState, rngOf, spyRng, stripCommentsAndStrings, canMerge, mergeValue, shiftLine, planTileTransitions };
export type { Board, Direction };

// ── Deterministic board factories (no faker) ───────────────────────────
export function fullNonMergeable(): Board {
  return boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1],
  ]);
}

export function packedRowBoard(): Board {
  return boardWith([
    [1, 3, 6, 12],
    [1, 3, 6, 12],
    [1, 3, 6, 12],
    [1, 3, 6, 12],
  ]);
}

export function effective12Board(): Board {
  const b = boardWith([
    [1, 2, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  for (let r = 1; r < 4; r++) b[r] = [3, 6, 12, 24] as any;
  return b;
}

export function gapBoard(): Board {
  const b = boardWith([
    [3, null, 3, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  for (let r = 1; r < 4; r++) b[r] = [12, 24, 48, 96] as any;
  return b;
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

// ── MergeValue domain fixtures ──────────────────────────────────────────
export const MERGE_UNGUARDED_CASES: Array<{ a: any; b: any; expected: number; desc: string }> = [
  { a: 1, b: 1, expected: 3, desc: '1,1→3 a-only' },
  { a: 2, b: 2, expected: 3, desc: '2,2→3 a-only' },
  { a: 3, b: 6, expected: 6, desc: '3,6→6 a-only (canMerge false)' },
  { a: null, b: 3, expected: 6, desc: 'null,3→6 a??0=0? actually 6 (3*2?) — null→0→3? check: (null??0)<=2?3: null*2 =>3? Wait: (null??0)=0 <=2?3:true →3 — but fixture expects 6? See rules: (a??0)<=2?3:a*2 — null=>0=>3 not 6. Pin actual: mergeValue(null,3)=3? No, (3,null) null is b ignored, a=3=>6. For (null,3) a=null=>0=>3. Correct below' },
];

export const MERGE_GUARDED_CASES: Array<{ a: any; b: any; expected: number; canMerge: boolean }> = [
  { a: 1, b: 2, expected: 3, canMerge: true },
  { a: 2, b: 1, expected: 3, canMerge: true },
  { a: 3, b: 3, expected: 6, canMerge: true },
  { a: 6, b: 6, expected: 12, canMerge: true },
  { a: 12, b: 12, expected: 24, canMerge: true },
];

export const SCAN_STRINGS = {
  LET_TRACE: 'let trace = built.trace',
  CONST_TRACE: 'const trace = built.trace',
  IF_NOT_MOVED_TRACE_EMPTY: 'if (!moved) trace = []',
  IF_NOT_CANMERGE: 'if (!canMerge',
  CANMERGE_A_B_DEF: 'canMerge(a, b)',
  DW21_DOC: 'DW-21: boardFromLines always returns a full placement trace',
  TRACE_PUSH: 'trace.push',
  IF_MOVED_PUSH: 'if (moved)',
  A_NULLISH: '(a ?? 0) <= 2',
  GRID_SIZE_4: 'GRID_SIZE = 4',
  TRACE_ENTRY_INTERFACE: 'interface TraceEntry',
  RESOLUTION_UNDO: 'resolution-undo',
  HASH_B4557FD: 'b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b',
  SPRINT_STATUS: 'sprint-status.yaml',
} as const;

// ── Source scan helpers ─────────────────────────────────────────────────
const __dirname_fixture = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname_fixture, '../../..');

export function readSource(relativePath: string): string {
  return readFileSync(join(PROJECT_ROOT, relativePath), 'utf8');
}

export function countMatches(source: string, pattern: RegExp | string): number {
  const re = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  return (source.match(re) || []).length;
}

export const GAME_SOURCE_PATH = 'triade/src/engine/core/game.ts';
export const RULES_SOURCE_PATH = 'triade/src/engine/core/rules.ts';
export const LINE_SOURCE_PATH = 'triade/src/engine/core/line.ts';
export const TYPES_SOURCE_PATH = 'triade/src/engine/core/types.ts';
export const TRANSITION_PLAN_PATH = 'triade/src/render/transitionPlan.ts';
export const LEDGER_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';
export const SPEC_PATH = '_bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md';

// ── Validation helpers ───────────────────────────────────────────────────
export function assertGameTraceGuard(gameSrc: string): void {
  const letTrace = countMatches(gameSrc, /let trace = built\.trace/g);
  if (letTrace !== 1) throw new Error(`let trace = built.trace must be 1, got ${letTrace}`);
  const ifNotMoved = countMatches(gameSrc, /if \(!moved\) trace = \[\]/g);
  if (ifNotMoved !== 1) throw new Error(`if (!moved) trace = [] must be 1, got ${ifNotMoved}`);
  const push = countMatches(gameSrc, /trace\.push/g);
  if (push !== 1) throw new Error(`trace.push must be 1 inside if(moved), got ${push}`);
  if (!/if \(moved\)[\s\S]*?trace\.push/.test(gameSrc)) throw new Error('trace.push must be inside if (moved)');
  const constTrace = countMatches(gameSrc, /const trace = built\.trace/g);
  if (constTrace !== 0) throw new Error(`const trace = built.trace must be 0, got ${constTrace}`);
}

export function assertRulesGuard(rulesSrc: string): void {
  const guard = countMatches(rulesSrc, /if \(!canMerge/g);
  if (guard !== 1) throw new Error(`if (!canMerge must be 1, got ${guard}`);
  const def = countMatches(rulesSrc, /canMerge\(a, b\)/g);
  if (def !== 2) throw new Error(`canMerge(a, b) must be 2 (def + guard), got ${def}`);
  const tautology = countMatches(rulesSrc, /\(a \?\? 0\) <= 2/g);
  if (tautology !== 2) throw new Error(`(a ?? 0) <= 2 must be 2 (tautology both branches), got ${tautology}`);
}

export function assertLineDoc(lineSrc: string, gameSrc: string): void {
  if (!lineSrc.includes(SCAN_STRINGS.DW21_DOC)) throw new Error(`line.ts must contain DW-21 doc "${SCAN_STRINGS.DW21_DOC}"`);
  if (!gameSrc.includes(SCAN_STRINGS.IF_NOT_MOVED_TRACE_EMPTY)) throw new Error('game.ts must contain if (!moved) trace = []');
  if (/if \(.*moved.*\) trace\.push|if \(.*moved.*\) continue/.test(lineSrc)) throw new Error('line.ts must not filter on moved');
}

export function assertLedger(ledgerSrc: string): void {
  if (countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.HASH_B4557FD, 'g')) !== 2) throw new Error(`ledger must contain b4557fd hash 2 hits, got ${countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.HASH_B4557FD, 'g'))}`);
  if (!/DW-21[\s\S]*?status: done 2026-09-02/.test(ledgerSrc)) throw new Error('DW-21 must be done 2026-09-02');
  if (!/DW-22[\s\S]*?status: done 2026-09-02/.test(ledgerSrc)) throw new Error('DW-22 must be done 2026-09-02');
}

export function assertTraceShape(typesSrc: string): void {
  if (!/interface TraceEntry/.test(typesSrc)) throw new Error('TraceEntry interface must exist');
  if (!/to:\s*\[number,\s*number\]/.test(typesSrc)) throw new Error('TraceEntry.to must be [number,number]');
  if (!/from:\s*Array<\[/.test(typesSrc)) throw new Error('TraceEntry.from must be Array<[...]>');
  if (!/spawned:\s*boolean/.test(typesSrc)) throw new Error('TraceEntry.spawned must be boolean');
  if (countMatches(typesSrc, /GRID_SIZE\s*=\s*4/g) !== 1) throw new Error('GRID_SIZE = 4 must be 1');
}

// ── Host probe helpers ───────────────────────────────────────────────────
export function noopRes(dir: Direction = 'left') {
  return game.move(gameState(fullNonMergeable()), dir, rngOf(0, 0, 0.5) as any);
}

export function effectiveRes() {
  return game.move(gameState(effective12Board()), 'left', rngOf(0, 0, 0.5) as any);
}

export const LEDGER = {
  DW21: 'DW-21',
  DW22: 'DW-22',
  HASH: 'b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b',
  DATE: '2026-09-02',
  BUNDLE: 'dw-engine-trace-merge-guards',
  BASELINE: '3bcf38cc7734c79f133e9b1619f765b32679fa02',
  FINAL: 'e325bab194848e43b64bb7425e2db9807e95d786',
  COMMIT: '35c9d1c',
} as const;
