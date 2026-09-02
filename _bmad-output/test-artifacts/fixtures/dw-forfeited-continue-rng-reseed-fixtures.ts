/**
 * Fixtures — dw-forfeited-continue-rng-reseed (DW-86 + DW-93)
 * ForfeitedContinue flag + RNG reseed per newGame
 * Deterministic, host-only, no faker — pure triade/App.tsx + mulberry32 + newGame
 * Covers: triade/App.tsx:102-103 rngSeedRef/mulberry32 decls
 *         triade/App.tsx:128-129 forfeitedContinue useState(false) (DW-86)
 *         triade/App.tsx:237-238 resetAssistance setForfeitedContinue(false)
 *         triade/App.tsx:260-262 applyLaneSelection needsReset reseed rngSeedRef+=1 + mulberry32 before newGame (DW-93)
 *         triade/App.tsx:443-445 handleRestart same reseed before newGame (DW-93) + 464-465 setForfeitedContinue(false)
 *         triade/App.tsx:740-742,780-781 handleContinueAd top+after deaths + 792-794,817-818 handleContinueIap top+after
 *         triade/App.tsx:961-966 useEffect gameOver && canContinueDerived && !forfeitedContinue → true
 *         triade/__tests__/ui/components/app.restart.test.ts slice 800→1200 keep order pin
 *         triade/__tests__/ui/components/app.contextualHelp.test.ts 900→1300 + continueAd 1500→2200
 * Spec: _bmad-output/implementation-artifacts/spec-forfeited-continue-rng-reseed.md (status done, 4 ACs, I/O matrix 6 rows)
 * Design: _bmad-output/test-artifacts/test-design-dw-forfeited-continue-rng-reseed.md (11 risks, 2 high R-001/R-002 score 6, P0 7 + P1 6 + P2 4 + P3 1)
 * ATDD: triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts (3 pass GREEN oracle)
 *       _bmad-output/test-artifacts/tests/unit/forfeited-continue-rng-reseed.atdd.test.ts (13 skip → 13 pass when activated)
 *       _bmad-output/test-artifacts/tests/api/forfeited-continue-rng-reseed.gateway.spec.ts (11 skip → 11 pass when activated)
 *       _bmad-output/test-artifacts/tests/e2e/forfeited-continue-rng-reseed.umbrella.spec.ts (8 skip → 8 pass when activated)
 * Run: npm --prefix triade test -- __tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts (3 pass)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx helpers (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newGame } from '../../../triade/src/engine/core/game.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import type { Board, GameState } from '../../../triade/src/engine/core/index.ts';
import {
  boardWith,
  emptyBoard,
  rngOf,
  spyRng,
  stripCommentsAndStrings,
} from '../../../triade/test-utils/helpers.ts';

export { boardWith, emptyBoard, rngOf, spyRng, mulberry32, stripCommentsAndStrings, newGame };
export type { Board, GameState };

// ── Deterministic board factories ──────────────────────────────────────────
export function boardFresh(seed = 20260808): { board: Board; game: GameState } {
  const game = newGame(mulberry32(seed));
  return { board: game.board, game };
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

// ── Scan strings (single-source grep) ─────────────────────────────────────
export const SCAN_STRINGS = {
  FORFEITED_DECL: 'const [forfeitedContinue, setForfeitedContinue] = useState(false)',
  FORFEITED_SET_TRUE: 'setForfeitedContinue(true)',
  FORFEITED_SET_FALSE: 'setForfeitedContinue(false)',
  FORFEITED_GUARD: 'gameOver && canContinueDerived',
  FORFEITED_GUARD_FULL: 'gameOver && canContinueDerived && !forfeitedContinue',
  FORFEITED_USEEFFECT: 'useEffect(() => {',
  FORFEITED_DEPS: '[gameOver, canContinueDerived, forfeitedContinue]',
  RNG_SEED_DECL: 'const rngSeedRef = useRef(20260808)',
  RNG_REF_DECL: 'const rngRef = useRef(mulberry32(20260808))',
  RNG_INCREMENT: 'rngSeedRef.current += 1',
  RNG_RESEED: 'rngRef.current = mulberry32(rngSeedRef.current)',
  RNG_NEWGAME: 'newGame(rngRef.current)',
  HANDLE_RESTART: 'const handleRestart',
  HANDLE_CONTINUE_AD: 'handleContinueAd',
  HANDLE_CONTINUE_IAP: 'handleContinueIap',
  RESET_ASSISTANCE: 'resetAssistance',
  APPLY_LANE: 'const applyLaneSelection',
  NEEDS_RESET: 'needsReset',
  DW86_MARKER: 'DW-86',
  DW86_COMMENT: 'forfeitedContinue',
  DW93_MARKER: 'DW-93',
  DW93_COMMENT: 'RNG reseed',
  AC67_COMMENT: 'forfeited continue dies',
  ORDER_NEWGAME: 'newGame(rngRef.current)',
  ORDER_SETGAME: 'setGame(s)',
  ORDER_SETMOVERESULT: 'setMoveResult(null)',
  ORDER_SETMATCH: 'setMatch(',
  ORDER_SETMATCHSTATS: 'setMatchStats(',
  ORDER_BUSY_FALSE: 'busyRef.current = false',
  SLICE_1200: '1200',
  SLICE_1300: '1300',
  SLICE_2200: '2200',
  MULBERRY32: 'mulberry32',
  MATH_RANDOM: 'Math.random',
  LEDGER_HASH: '41838b7d5d1cd4d3eab8fc2b81bcbe63090ee4682d07e1b39bb448e0c2be82f6',
  HEX_TAIL: '7374617475733a206f70656e',
  LEDGER_STATUS_DONE: 'status: done 2026-09-02',
  LEDGER_RESOLUTION: 'resolved by sweep bundle dw-forfeited-continue-rng-reseed',
  SPEC_PATH_FRAGMENT: 'spec-forfeited-continue-rng-reseed',
  SPRINT_STATUS: 'sprint-status.yaml',
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
export const MULBERRY_SOURCE_PATH = 'triade/src/utils/mulberry32.ts';
export const ENGINE_GAME_PATH = 'triade/src/engine/core/game.ts';
export const LEDGER_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';
export const SPEC_PATH = '_bmad-output/implementation-artifacts/spec-forfeited-continue-rng-reseed.md';
export const TEST_ORACLE_PATH = 'triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts';

// ── Validation helpers (host allowlist gates) ─────────────────────────────
export function assertForfeitedLifecycle(appSrc: string): void {
  if (!appSrc.includes(SCAN_STRINGS.FORFEITED_DECL) && !/const\s*\[forfeitedContinue\s*,\s*setForfeitedContinue\]\s*=\s*useState\s*\(\s*false\s*\)/.test(appSrc))
    throw new Error('forfeitedContinue useState(false) decl missing');
  if (!appSrc.includes(SCAN_STRINGS.FORFEITED_SET_TRUE)) throw new Error('setForfeitedContinue(true) missing');
  if (!/gameOver\s*&&\s*canContinueDerived/.test(appSrc)) throw new Error('gameOver && canContinueDerived guard missing');
  const falseCount = countMatches(appSrc, /setForfeitedContinue\s*\(\s*false\s*\)/g);
  if (falseCount < 4) throw new Error(`setForfeitedContinue(false) must be >=4, got ${falseCount}`);
  const adIdx = appSrc.indexOf(SCAN_STRINGS.HANDLE_CONTINUE_AD);
  const iapIdx = appSrc.indexOf(SCAN_STRINGS.HANDLE_CONTINUE_IAP);
  if (adIdx === -1) throw new Error('handleContinueAd missing');
  if (iapIdx === -1) throw new Error('handleContinueIap missing');
  if (!appSrc.slice(adIdx, adIdx + 1500).includes(SCAN_STRINGS.FORFEITED_SET_FALSE)) throw new Error('handleContinueAd must clear forfeitedContinue');
  if (!appSrc.slice(iapIdx, iapIdx + 800).includes(SCAN_STRINGS.FORFEITED_SET_FALSE)) throw new Error('handleContinueIap must clear forfeitedContinue');
  const restartIdx = appSrc.indexOf(SCAN_STRINGS.HANDLE_RESTART);
  if (!appSrc.slice(restartIdx, restartIdx + 1600).includes(SCAN_STRINGS.FORFEITED_SET_FALSE)) throw new Error('handleRestart must clear forfeitedContinue');
  if (!appSrc.slice(appSrc.indexOf(SCAN_STRINGS.RESET_ASSISTANCE), appSrc.indexOf(SCAN_STRINGS.RESET_ASSISTANCE) + 800).includes(SCAN_STRINGS.FORFEITED_SET_FALSE))
    throw new Error('resetAssistance must clear forfeitedContinue');
  if (!appSrc.includes(SCAN_STRINGS.DW86_MARKER) || !appSrc.includes(SCAN_STRINGS.DW86_COMMENT)) throw new Error('DW-86 comment pin missing');
  if (!appSrc.includes(SCAN_STRINGS.AC67_COMMENT)) throw new Error('AC6/7 forfeited continue dies comment missing in handleRestart');
}

export function assertRngReseed(appSrc: string): void {
  if (!/const\s+rngSeedRef\s*=\s*useRef\s*\(\s*20260808\s*\)/.test(appSrc)) throw new Error('rngSeedRef = useRef(20260808) missing');
  if (!/const\s+rngRef\s*=\s*useRef\s*\(\s*mulberry32\s*\(\s*20260808\s*\)\s*\)/.test(appSrc)) throw new Error('rngRef mulberry32(20260808) missing');
  if (!/rngSeedRef\.current\s*\+=\s*1/.test(appSrc)) throw new Error('rngSeedRef.current +=1 missing');
  if (!/rngRef\.current\s*=\s*mulberry32\s*\(\s*rngSeedRef\.current\s*\)/.test(appSrc)) throw new Error('rngRef.current = mulberry32(rngSeedRef.current) missing');
  const restartIdx = appSrc.indexOf(SCAN_STRINGS.HANDLE_RESTART);
  const restartSlice = appSrc.slice(restartIdx, restartIdx + 900);
  const r = restartSlice.indexOf(SCAN_STRINGS.RNG_INCREMENT);
  const n = restartSlice.indexOf(SCAN_STRINGS.RNG_NEWGAME);
  // tolerate string with space variation
  const r2 = restartSlice.indexOf('rngSeedRef.current');
  const n2 = restartSlice.indexOf('newGame(rngRef.current)');
  if (r2 === -1 || n2 === -1 || r2 >= n2) throw new Error('handleRestart must reseed before newGame');
  const laneIdx = appSrc.indexOf(SCAN_STRINGS.APPLY_LANE);
  const laneSlice = appSrc.slice(laneIdx, laneIdx + 1800);
  if (!laneSlice.includes('rngSeedRef.current')) throw new Error('applyLaneSelection must reseed rng before newGame when needsReset');
  if (countMatches(appSrc, /rngSeedRef\.current\s*\+=\s*1/g) !== 2) throw new Error(`rngSeedRef increment must be 2 hits, got ${countMatches(appSrc, /rngSeedRef\.current\s*\+=\s*1/g)}`);
  if (countMatches(appSrc, /rngRef\.current\s*=\s*mulberry32\s*\(\s*rngSeedRef\.current\s*\)/g) !== 2) throw new Error(`reseed must be 2 hits`);
  if (countMatches(appSrc, /mulberry32/g) !== 3) throw new Error(`mulberry32 must be 3 hits (decl +2 reseeds), got ${countMatches(appSrc, /mulberry32/g)}`);
  if (countMatches(appSrc, /Math\.random/g) !== 0) throw new Error(`App.tsx must have 0 Math.random, got ${countMatches(appSrc, /Math\.random/g)}`);
  if (!appSrc.includes(SCAN_STRINGS.DW93_MARKER) || !appSrc.includes(SCAN_STRINGS.DW93_COMMENT)) throw new Error('DW-93 RNG reseed comment missing');
}

export function assertHandleRestartOrder(appSrc: string): void {
  const idx = appSrc.indexOf(SCAN_STRINGS.HANDLE_RESTART);
  const slice = appSrc.slice(idx, idx + 1200);
  const order = [SCAN_STRINGS.ORDER_NEWGAME, SCAN_STRINGS.ORDER_SETGAME, SCAN_STRINGS.ORDER_SETMOVERESULT, SCAN_STRINGS.ORDER_SETMATCH, SCAN_STRINGS.ORDER_SETMATCHSTATS, SCAN_STRINGS.ORDER_BUSY_FALSE];
  let last = -1;
  for (const token of order) {
    const pos = slice.indexOf(token);
    if (pos === -1) throw new Error(`handleRestart 1200 must contain ${token}`);
    if (pos <= last) throw new Error(`${token} must be after previous in handleRestart order`);
    last = pos;
  }
}

export function assertLedger(ledgerSrc: string): void {
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_HASH)) throw new Error('ledger must contain 41838b7d hash');
  if (countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g')) < 2) throw new Error(`ledger 41838b7d must be >=2 (DW-86+DW-93), got ${countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g'))}`);
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_STATUS_DONE)) throw new Error('ledger must contain status: done 2026-09-02');
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_RESOLUTION)) throw new Error('ledger resolution line missing');
}

// ── Gate constants (single-source) ────────────────────────────────────────
export const GATE_CONSTANTS = {
  INITIAL_SEED: 20260808,
  RESEED_INCREMENT: 1,
  RESEED_HITS: 2,
  MULBERRY_HITS: 3,
  FORFEITED_FALSE_MIN: 4,
  SLICE_RESTART: 1200,
  SLICE_CONTEXTUAL: 1300,
  SLICE_CONTINUE_AD: 2200,
} as const;

export const LEDGER = {
  HASH: '41838b7d5d1cd4d3eab8fc2b81bcbe63090ee4682d07e1b39bb448e0c2be82f6',
  HEX_TAIL: '7374617475733a206f70656e',
  DATE: '2026-09-02',
  BUNDLE: 'dw-forfeited-continue-rng-reseed',
  DW86: 'DW-86',
  DW93: 'DW-93',
} as const;

export const SPEC = {
  PATH: SPEC_PATH,
  TITLE: 'forfeited-continue-rng-reseed',
  STATUS: 'done',
} as const;
