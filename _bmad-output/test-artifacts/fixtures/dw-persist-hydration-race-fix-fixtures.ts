/**
 * Fixtures — dw-persist-hydration-race-fix (DW-87, DW-97, DW-98, DW-99, DW-100)
 * hydrationOk gating + sessionStartBest update + pendingSave await + finite guards
 * Deterministic, host-only, no faker — pure triade/App.tsx + matchScore.ts
 * Covers: triade/src/game/matchScore.ts:1-31 Number.isFinite && >=0 guards
 *         triade/App.tsx:111-114 pendingSaveByLaneRef + persistedBestByLaneRef mirrors
 *         triade/App.tsx:181-185 hydration sets hydrationOk/sessionStart/persistedBest refs
 *         triade/App.tsx:215-244 persist effect sanitize + double gate + pending promise + .then update
 *         triade/App.tsx:458-477 handleRestart async await pending before initialScore(ref)
 *         triade/App.tsx:993-1073 sanitizedScore/Best/Persisted + Hud/overlay/stats guards
 * Spec: _bmad-output/implementation-artifacts/spec-persist-hydration-race-fix.md (status done, 8-row I/O matrix)
 * Design: _bmad-output/test-artifacts/test-design-dw-persist-hydration-race-fix.md (11 risks, 4 high R-001..R-004 score 6)
 * ATDD: triade/__tests__/game/matchScore.persist-hydration.test.ts (6 pass GREEN oracle)
 *       _bmad-output/test-artifacts/tests/unit/persist-hydration-race-fix.atdd.test.ts (14 skip → 14 pass when activated)
 *       _bmad-output/test-artifacts/tests/api/persist-hydration-race-fix.gateway.spec.ts (11 skip → 11 pass)
 *       _bmad-output/test-artifacts/tests/e2e/persist-hydration-race-fix.umbrella.spec.ts (8 skip → 8 pass)
 * Run: npm --prefix triade test -- __tests__/game/matchScore.persist-hydration.test.ts (6 pass)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx helpers (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMove, initialScore, isNewRecord } from '../../../triade/src/game/matchScore.ts';
import type { MatchScore } from '../../../triade/src/game/matchScore.ts';
import { newGame } from '../../../triade/src/engine/core/game.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import type { Board, GameState } from '../../../triade/src/engine/core/index.ts';
import {
  boardWith,
  emptyBoard,
  stripCommentsAndStrings,
} from '../../../triade/test-utils/helpers.ts';

export { applyMove, initialScore, isNewRecord, boardWith, emptyBoard, stripCommentsAndStrings, newGame, mulberry32 };
export type { Board, GameState, MatchScore };

// ── Deterministic board factories ──────────────────────────────────────────
export function boardFresh(seed = 20260808): { board: Board; game: GameState } {
  const game = newGame(mulberry32(seed));
  return { board: game.board, game };
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

export function moveResult(score: number, moved = true): any {
  return { board: emptyBoard(), score, moved, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } };
}

// ── Scan strings (single-source grep) ─────────────────────────────────────
export const SCAN_STRINGS = {
  // refs
  PENDING_SAVE_DECL: 'pendingSaveByLaneRef',
  PERSISTED_REF_DECL: 'persistedBestByLaneRef',
  HYDRATION_OK_DECL: 'hydrationOkByLaneRef',
  SESSION_START_DECL: 'sessionStartBestByLaneRef',
  PERSISTED_STATE_DECL: 'persistedBestByLane',
  // guards
  NUMBER_ISFINITE: 'Number.isFinite',
  SANITIZED_SCORE: 'sanitizedScore',
  SANITIZED_BEST: 'sanitizedBest',
  SANITIZED_PERSISTED: 'sanitizedPersisted',
  SANITIZED_MATCH_BEST: 'sanitizedMatchBest',
  SANITIZED_PERSISTED_CHECK: 'sanitizedPersistedForCheck',
  HYDRATION_GATE: 'if (!hydrationOkByLaneRef.current[activeLaneId]) return',
  OVERLAY_GATE: 'isNewRecord(sessionStartBestByLaneRef.current[activeLaneId as LaneId], match.score) && hydrationOkByLaneRef.current[activeLaneId as LaneId]',
  OVERLAY_GATE_SHORT: '&& hydrationOkByLaneRef',
  HANDLE_RESTART: 'const handleRestart',
  HANDLE_RESTART_ASYNC: 'const handleRestart = useCallback(async',
  PENDING_AWAIT: 'await pending',
  PENDING_TRY: 'try',
  PENDING_CATCH: 'catch',
  PENDING_FINALLY: 'p.finally',
  PENDING_ASSIGN: 'pendingSaveByLaneRef.current[activeLaneId] = p',
  INITIAL_SCORE_REF: 'initialScore(persistedBestByLaneRef.current[activeLaneId])',
  SESSION_UPDATE: 'sessionStartBestByLaneRef.current',
  SESSION_UPDATE_SANITIZED: 'sessionStartBestByLaneRef.current = { ...sessionStartBestByLaneRef.current, [activeLaneId]: sanitizedMatchBest }',
  PERSISTED_REF_WRITE: 'persistedBestByLaneRef.current = { ...persistedBestByLaneRef.current, [activeLaneId]: sanitizedMatchBest }',
  SANITIZED_SCORE_DECL: 'const sanitizedScore = Number.isFinite(match.score) && match.score >= 0 ? match.score : 0',
  SANITIZED_BEST_DECL: 'const sanitizedBest = Number.isFinite(match.best) && match.best >= 0 ? match.best : 0',
  SANITIZED_PERSISTED_DECL: 'sanitizedPersisted',
  OVERLAY_STATS_GUARD: 'match.score === match.score && Number.isFinite',
  HUD_SCORE_PROP: 'score={sanitizedScore}',
  HUD_BEST_PROP: 'best={sanitizedBest}',
  SAVE_CALL: 'saveBestForLane(activeLaneId, sanitizedMatchBest)',
  RECORD_LANE: 'Record<LaneId',
  THEN_OK: '.then((ok)',
  THEN_IF_OK: 'if (ok)',
  LANE_CLEAN: 'clean',
  LANE_ACC: 'accelerated',
  DW87: 'DW-87',
  DW97: 'DW-97',
  DW98: 'DW-98',
  DW99: 'DW-99',
  DW100: 'DW-100',
  LEDGER_HASH: 'd0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822',
  LEDGER_STATUS_DONE: 'status: done 2026-09-02',
  LEDGER_RESOLUTION: 'resolved by sweep bundle dw-persist-hydration-race-fix',
  SPEC_FRAGMENT: 'spec-persist-hydration-race-fix',
} as const;

// ── Source scan helpers ───────────────────────────────────────────────────
const __dirname_fixture = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname_fixture, '../../..');

export function readSource(relativePath: string): string {
  return readFileSync(join(PROJECT_ROOT, relativePath), 'utf8');
}

export function countMatches(source: string, pattern: RegExp | string): number {
  const re =
    typeof pattern === 'string'
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  return (source.match(re) || []).length;
}

export const APP_SOURCE_PATH = 'triade/App.tsx';
export const SCORE_SOURCE_PATH = 'triade/src/game/matchScore.ts';
export const LEDGER_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';
export const SPEC_PATH = '_bmad-output/implementation-artifacts/spec-persist-hydration-race-fix.md';
export const TEST_ORACLE_PATH = 'triade/__tests__/game/matchScore.persist-hydration.test.ts';

// ── Validation helpers (host allowlist gates) ─────────────────────────────
export function assertFiniteGuards(scoreSrc: string): void {
  const hits = countMatches(scoreSrc, /Number\.isFinite/g);
  if (hits < 4) throw new Error(`matchScore.ts Number.isFinite >=4, got ${hits}`);
  if (!/Number\.isFinite\(best\)\s*&&\s*best\s*>=\s*0\s*\?\s*best\s*:\s*0/.test(scoreSrc)) throw new Error('initialScore guard missing');
  if (!/curScore.*Number\.isFinite/.test(scoreSrc)) throw new Error('applyMove curScore guard missing');
  if (!/curBest.*Number\.isFinite/.test(scoreSrc)) throw new Error('applyMove curBest guard missing');
  if (!/!Number\.isFinite\(previousBest\)/.test(scoreSrc)) throw new Error('isNewRecord Number.isFinite guard missing');
  if (!/previousBest\s*<\s*0/.test(scoreSrc)) throw new Error('isNewRecord <0 guard missing');
}

export function assertHydrationGating(appSrc: string): void {
  if (!/if\s*\(!hydrationOkByLaneRef\.current\[activeLaneId\]\)\s*return/.test(appSrc)) throw new Error('persist effect hydrationOk top return missing');
  if (!appSrc.includes(SCAN_STRINGS.OVERLAY_GATE) && !/isNewRecord\(.*sessionStartBestByLaneRef.*&&\s*hydrationOkByLaneRef/.test(appSrc))
    throw new Error('GameOverOverlay isNewRecord && hydrationOk gate missing');
  if (countMatches(appSrc, /hydrationOkByLaneRef/g) < 3) throw new Error(`hydrationOkByLaneRef hits >=3, got ${countMatches(appSrc, /hydrationOkByLaneRef/g)}`);
}

export function assertSessionStartUpdate(appSrc: string): void {
  const thenIdx = appSrc.indexOf(SCAN_STRINGS.THEN_OK);
  if (thenIdx === -1) throw new Error('.then((ok) missing');
  const slice = appSrc.slice(thenIdx, thenIdx + 800);
  if (!slice.includes(SCAN_STRINGS.SESSION_START_DECL)) throw new Error('.then must update sessionStartBestByLaneRef');
  if (!slice.includes(SCAN_STRINGS.SANITIZED_MATCH_BEST)) throw new Error('.then must set to sanitizedMatchBest');
  if (!slice.includes(SCAN_STRINGS.THEN_IF_OK)) throw new Error('must be gated on ok===true');
  if (!slice.includes(SCAN_STRINGS.PERSISTED_REF_WRITE) && !slice.includes('persistedBestByLaneRef.current')) throw new Error('.then must direct-write persistedBestByLaneRef');
}

export function assertRaceRestart(appSrc: string): void {
  if (!/const\s+handleRestart\s*=\s*useCallback\(async/.test(appSrc)) throw new Error('handleRestart must be async');
  if (!appSrc.includes(SCAN_STRINGS.PENDING_SAVE_DECL)) throw new Error('pendingSaveByLaneRef missing');
  if (!appSrc.includes(SCAN_STRINGS.PENDING_AWAIT)) throw new Error('must await pending');
  const idx = appSrc.indexOf(SCAN_STRINGS.HANDLE_RESTART);
  const slice = appSrc.slice(idx, idx + 1400);
  if (!slice.includes(SCAN_STRINGS.INITIAL_SCORE_REF)) throw new Error('must call initialScore(persistedBestByLaneRef.current[activeLaneId])');
  if (!slice.includes(SCAN_STRINGS.PENDING_TRY) || !slice.includes(SCAN_STRINGS.PENDING_CATCH)) throw new Error('must have try/catch around await pending');
  const pendingIdx = slice.indexOf('pendingSaveByLaneRef.current[activeLaneId]');
  const scoreIdx = slice.indexOf('persistedBestByLaneRef.current[activeLaneId]');
  if (pendingIdx === -1 || scoreIdx === -1 || pendingIdx >= scoreIdx) throw new Error('pending await before initialScore read order invalid');
  if (!appSrc.includes(SCAN_STRINGS.PENDING_FINALLY)) throw new Error('p.finally clear missing');
}

export function assertSanitizedJSX(appSrc: string): void {
  if (!appSrc.includes(SCAN_STRINGS.SANITIZED_SCORE)) throw new Error('sanitizedScore missing');
  if (!appSrc.includes(SCAN_STRINGS.SANITIZED_BEST)) throw new Error('sanitizedBest missing');
  if (!appSrc.includes(SCAN_STRINGS.SANITIZED_PERSISTED)) throw new Error('sanitizedPersisted missing');
  if (!/const\s+sanitizedScore\s*=\s*Number\.isFinite\(match\.score\)/.test(appSrc)) throw new Error('sanitizedScore decl missing');
  if (!appSrc.includes(SCAN_STRINGS.HUD_SCORE_PROP)) throw new Error('Hud must receive sanitizedScore');
  if (!appSrc.includes(SCAN_STRINGS.HUD_BEST_PROP)) throw new Error('Hud must receive sanitizedBest');
  if (!appSrc.includes(SCAN_STRINGS.OVERLAY_STATS_GUARD)) throw new Error('GameOverOverlay stats self-compare guard missing');
}

export function assertPersistDoubleGate(appSrc: string): void {
  if (!appSrc.includes(SCAN_STRINGS.SANITIZED_MATCH_BEST)) throw new Error('sanitizedMatchBest missing');
  if (!appSrc.includes(SCAN_STRINGS.SANITIZED_PERSISTED_CHECK)) throw new Error('sanitizedPersistedForCheck missing');
  if (!/const\s+sanitizedMatchBest\s*=\s*Number\.isFinite\(match\.best\)/.test(appSrc)) throw new Error('sanitizedMatchBest decl missing');
  if (!appSrc.includes('isNewRecord(sessionStartBestByLaneRef.current[activeLaneId], sanitizedMatchBest)')) throw new Error('must gate on isNewRecord(sessionStart, sanitizedMatchBest)');
  if (!appSrc.includes('sanitizedMatchBest > sanitizedPersistedForCheck')) throw new Error('must check > sanitizedPersistedForCheck');
  const saves = countMatches(appSrc, /saveBestForLane\(activeLaneId,\s*sanitizedMatchBest\)/g);
  if (saves !== 1) throw new Error(`saveBestForLane(activeLaneId, sanitizedMatchBest) exactly 1, got ${saves}`);
}

export function assertLaneIsolation(appSrc: string): void {
  if (countMatches(appSrc, /Record<LaneId/g) < 4) throw new Error(`Record<LaneId >=4, got ${countMatches(appSrc, /Record<LaneId/g)}`);
  if (!appSrc.includes(SCAN_STRINGS.SAVE_CALL)) throw new Error('lane wall saveBestForLane missing');
}

export function assertLedger(ledgerSrc: string): void {
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_HASH)) throw new Error('ledger must contain d0e7d75 hash');
  const hits = countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g'));
  if (hits !== 5) throw new Error(`ledger d0e7d75 must be 5 (DW-87,97,98,99,100), got ${hits}`);
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_STATUS_DONE)) throw new Error('ledger must contain status: done 2026-09-02');
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_RESOLUTION)) throw new Error('ledger resolution line missing');
  for (const dw of ['DW-87', 'DW-97', 'DW-98', 'DW-99', 'DW-100']) {
    if (!ledgerSrc.includes(dw)) throw new Error(`missing ${dw}`);
    const sec = ledgerSrc.split(dw)[1] ?? '';
    if (!sec.includes('status: done 2026-09-02')) throw new Error(`${dw} not done`);
  }
}

// ── Gate constants (single-source) ────────────────────────────────────────
export const GATE_CONSTANTS = {
  NUMBER_ISFINITE_MATCH_SCORE_MIN: 4,
  NUMBER_ISFINITE_APP_MIN: 5,
  RECORD_LANE_MIN: 4,
  LEDGER_HASH_HITS: 5,
  SANITIZED_MATCH_BEST_MIN: 3,
  SANITIZED_PERSISTED_CHECK_MIN: 2,
  PENDING_SAVE_HITS_MIN: 5,
  PERSISTED_REF_HITS_MIN: 5,
} as const;

export const LEDGER = {
  HASH: 'd0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822',
  DATE: '2026-09-02',
  BUNDLE: 'dw-persist-hydration-race-fix',
  DWS: ['DW-87', 'DW-97', 'DW-98', 'DW-99', 'DW-100'] as const,
} as const;

export const SPEC = {
  PATH: SPEC_PATH,
  TITLE: 'persist-hydration-race-fix',
  STATUS: 'done',
} as const;
