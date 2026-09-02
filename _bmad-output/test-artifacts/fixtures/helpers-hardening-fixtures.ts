// TEA Automate — Fixture helpers for dw-test-scanner-helpers-hardening
// Deterministic, no @faker-js/faker — rngOf/spyRng are scripted draws, boards are fixed data.
// Host-only: node:test + tsx, no RN/Reanimated/Skia. Pure helpers mirror triade/test-utils/helpers.ts contracts.
// Spec: spec-test-scanner-helpers-hardening.md (DW-3/48/59/60/66, 5 ACs, I/O matrix 7 rows, baseline 1fb45ca → HEAD)
// Test-design: test-design-dw-test-scanner-helpers-hardening.md (10 risks, P0 7 groups, P1 6, P2 4, P3 3)

import { newGame, move } from '../../../triade/src/engine/core/index.ts';
import type { Board, GameState, PendingSpawn, Rng } from '../../../triade/src/engine/core/types.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import {
  rngOf,
  spyRng,
  defaultPendingSpawn,
  gameState,
  emptyBoard,
  staticBoard,
  boardWith,
  stripComments,
  stripCommentsAndStrings,
  extractSpecifiers,
  extractNamedImports,
  occupiedCells,
  mulberry32 as mulberry32Reexport,
} from '../../../triade/test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// RNG fixture helpers — fail-fast contract (DW-48 / DW-59)
// ---------------------------------------------------------------------------
export function scriptedRng(...values: number[]): Rng {
  return rngOf(...values);
}
export function scriptedSpyRng(...values: number[]): Rng & { calls: number[] } {
  return spyRng(...values);
}
export function exhaustedMessage(label: 'rngOf' | 'spyRng'): RegExp {
  return new RegExp(`${label} exhausted after \\d+ scripted draw`);
}
export function drawBudgetForEffectiveMove(): number {
  return 3; // pickIndex + resolveSpawn + displayRoll (spawn.ts:pickCombined single roll)
}
export function drawBudgetForNewGame(): number {
  return 20; // 9 pickIndex + 9 weightedValue + 1 resolveSpawn + 1 displayRoll
}
export function effectiveMoveRng(pickIndex = 0, resolveSpawn = 0, displayRoll = 0.5): Rng {
  return rngOf(pickIndex, resolveSpawn, displayRoll);
}
export function newGameRng20(): Rng {
  // 0,0 (newGame internal) + 9×0 (pickIndex) + 9×0.5 (weightedValue displayRoll pads)
  return rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
}
export function assertThrowsExhausted(fn: () => unknown, label = 'rng'): void {
  let threw = false;
  try {
    fn();
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (!/exhausted after \d+ scripted draw/.test(msg)) throw new Error(`Expected exhausted message, got: ${msg}`);
    threw = true;
  }
  if (!threw) throw new Error(`Expected ${label} to throw exhausted, but it did not`);
}

// ---------------------------------------------------------------------------
// Board fixture helpers — deterministic, mirror helpers.ts emptyBoard/staticBoard
// ---------------------------------------------------------------------------
export function boardForTest(row: Array<number | null>): Board {
  return staticBoard(row);
}
export function happyPathBoard(): Board {
  return staticBoard([1, 2, null, null]);
}
export function noopBoard(): Board {
  return boardWith([
    [2, 3, 6, 12],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
}
export function denseBoard9(): Board {
  // Used for newGame verification — not the board itself but the expected count
  return emptyBoard();
}

// ---------------------------------------------------------------------------
// stripComments fixture sources — I/O matrix rows (spec I/O table)
// ---------------------------------------------------------------------------
export const STRIP_FIXTURES = {
  // Row 1: URL with // inside string, trailing comment must be stripped, URL preserved
  urlDouble: 'const u="http://x"; // cmt',
  urlDoubleExpectedPreserves: 'http://x',
  urlDoubleExpectedStripped: 'cmt',
  // Row 2: block inside single quotes preserved, only outer block stripped
  blockInSingle: "const s='a /* b */ c'; /* real */",
  blockInSinglePreserves: 'a /* b */ c',
  blockInSingleStripped: 'real',
  // Row 3: template URL
  urlTemplate: 'const t=`http://y`; // cmt2',
  urlTemplatePreserves: 'http://y',
  urlTemplateStripped: 'cmt2',
  // Row 4: escaped quote edge
  escapedQuote: 'const s="a \\" // not comment"; // real',
  escapedQuotePreserves: 'a \\"',
  escapedQuoteStripped: 'real',
  // Row 5: specifier extraction source
  specifierSrc: 'import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */',
  specifierExpected: ['bar', 'qux'] as string[],
  // Row 6: template interpolation with inner strings and trailing comment
  templateInterp: 'const s=`hi ${a ? "x" : "y"} // cmt`; // real',
  templateInterpPreservesFalse: 'hi', // stripComments keeps hi
  templateInterpStripped: 'real',
  // Row 7: regex with quote (DW-66 known limitation — documented false NEGATIVE)
  regexQuoteDoc: "const re=/it's/; import { roll } from 'x'",
  // Row 8: empty / unterminated edge cases (never-throw contract)
  empty: '',
  unterminatedBlock: '/* unterminated',
  unterminatedString: '"unterminated',
  unterminatedTemplate: '`unterminated',
} as const;

export function stripCommentsPreserves(urlFixture: string, expectedPreserve: string): boolean {
  const cleaned = stripComments(urlFixture);
  return cleaned.includes(expectedPreserve);
}
export function stripCommentsStrips(source: string, strippedToken: string): boolean {
  return !stripComments(source).includes(strippedToken);
}
export function stripAndStringsBlanks(source: string, token: string): boolean {
  return !stripCommentsAndStrings(source).includes(token);
}
export function lengthPreserving(source: string, blankStrings: boolean): boolean {
  const cleaned = blankStrings ? stripCommentsAndStrings(source) : stripComments(source);
  return cleaned.length === source.length;
}

// ---------------------------------------------------------------------------
// gameState factory helpers — defaultPendingSpawn contract (DW-60)
// ---------------------------------------------------------------------------
export function factoryIsExported(): boolean {
  return typeof defaultPendingSpawn === 'function';
}
export function gameStateDefaultEqualsFactory(): boolean {
  const b = emptyBoard();
  const s = gameState(b);
  const f = defaultPendingSpawn();
  return JSON.stringify(s.pendingSpawn) === JSON.stringify(f);
}
export function gameStateFreshObject(): boolean {
  const b = emptyBoard();
  const s1 = gameState(b);
  const s2 = gameState(b);
  const f = defaultPendingSpawn();
  // deep-equal but not reference-equal
  return JSON.stringify(s1.pendingSpawn) === JSON.stringify({ value: 1, displayRoll: 0 }) && s1.pendingSpawn !== s2.pendingSpawn && s1.pendingSpawn !== f;
}
export function explicitPending(value: number, displayRoll = 0): PendingSpawn {
  return { value, displayRoll };
}

// ---------------------------------------------------------------------------
// Scanner fixture helpers — engine.purity / ui.norolls tripwire preservation
// ---------------------------------------------------------------------------
export function scannerDelegationOk(helpersSrc: string): boolean {
  return /stripCommentsInternal\(source,\s*false\)/.test(helpersSrc) && /stripCommentsInternal\(source,\s*true\)/.test(helpersSrc) && (helpersSrc.match(/stripCommentsInternal/g) ?? []).length === 3;
}
export function noNaiveRegexFallback(helpersSrc: string): boolean {
  // No naive /\/\*[\s\S]*?\*\//g literal should remain
  return !/\/\\\*\[\\s\\S\]\*\\\?\\\*\//.test(helpersSrc);
}
export function docHasRegexLimitation(helpersSrc: string): boolean {
  return /Known limitation — regex literals/.test(helpersSrc) && /flips the state machine into string mode/.test(helpersSrc) && /false[\s\S]*?NEGATIVES[\s\S]*?ui\.norolls/.test(helpersSrc);
}
export function extractSpecifiersStillWorks(): boolean {
  const specs = extractSpecifiers(STRIP_FIXTURES.specifierSrc);
  return specs.includes('bar') && specs.includes('qux');
}

// ---------------------------------------------------------------------------
// Engine draw-budget helpers — 3 effective / 20 newGame via real engine
// ---------------------------------------------------------------------------
export function effectiveMoveSucceedsWith3(): boolean {
  const board = happyPathBoard();
  const res = move(gameState(board), 'left', effectiveMoveRng(0, 0, 0.5));
  return res.moved === true && res.score === 3;
}
export function effectiveMoveThrowsWith2(): boolean {
  try {
    move(gameState(happyPathBoard()), 'left', rngOf(0, 0));
    return false;
  } catch (e) {
    return /exhausted after 2/.test((e as Error).message);
  }
}
export function newGameHas9TilesWith20(): boolean {
  const board = newGame(newGameRng20()).board;
  let count = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (board[r][c] !== null) count++;
  return count === 9;
}
export function newGameThrowsWith9(): boolean {
  try {
    newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0));
    return false;
  } catch (e) {
    return /exhausted/.test((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Ledger helpers — DW-3/48/59/60/66 done with resolution-undo hash
// ---------------------------------------------------------------------------
export function ledgerDoneCount(ledgerSrc: string): number {
  return [...ledgerSrc.matchAll(/status:\s*done 2026-09-01/g)].length;
}
export function ledgerUndoHashCount(ledgerSrc: string): number {
  return [...ledgerSrc.matchAll(/resolution-undo:\s*[0-9a-f]{6,}/gi)].length;
}

// ---------------------------------------------------------------------------
// Bench helper — stripComments O(n) single-pass <1 ms for 4k source
// ---------------------------------------------------------------------------
export function stripCommentsBench(iterations = 1000, repeat = 400): { elapsed: number; ok: boolean } {
  const big = 'const u="http://x"; // cmt\n'.repeat(repeat); // ~10k
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) stripComments(big);
  const elapsed = performance.now() - t0;
  const once = stripComments(big);
  const ok = once.length === big.length && once.includes('http://x') && elapsed < 500;
  return { elapsed, ok };
}

// ---------------------------------------------------------------------------
// Re-exports for convenience — mirrors helpers.ts public surface
// ---------------------------------------------------------------------------
export { rngOf, spyRng, defaultPendingSpawn, gameState, emptyBoard, staticBoard, boardWith, stripComments, stripCommentsAndStrings, extractSpecifiers, extractNamedImports, occupiedCells, mulberry32Reexport as mulberry32 };
