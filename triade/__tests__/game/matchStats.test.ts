import { test } from 'node:test';
import assert from 'node:assert';
import { emptyBoard, boardWith } from '../../test-utils/helpers.ts';
import { ceilingDetector } from '../../src/engine/core/ceiling.ts';
import type { Board, MoveResult, TraceEntry } from '../../src/engine/core/types.ts';

// Story 6.1 — Overlay de game over com stats imediatos (T1 pure projection)
// `triade/src/game/matchStats.ts` does not exist yet — red-phase scaffolds
// use variable-specifier dynamic `import(SPEC)` inside `test()` so the
// suite stays CI-green (417 pass baseline) while contracts assert EXPECTED
// behavior. Activating a scaffold removes `test()` and the dynamic import
// becomes a real failing import → then GREEN once the module ships.
// All tests are P0/P1 per test-priorities-matrix; determinism/purity mandatory.

const SPEC = '../../src/game/matchStats.ts';

function traceEntry(value: number, to: [number, number], from: Array<[number, number]>, spawned = false): TraceEntry {
  return { value, to, from, spawned };
}

function moveResult(board: Board, trace: TraceEntry[], score = 0, moved = true): MoveResult {
  return { board, trace, score, moved, pendingSpawn: { value: 1, displayRoll: 0 } };
}

// ── initialStats ──────────────────────────────────────────────────────

test('[P0] AC1 initialStats seeds merges=0, longest=0, current=0 and maxTile from ceilingDetector(board)', async () => {
  const { initialStats } = await import(SPEC);
  const board = boardWith([
    [24, 12, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  const s = initialStats(board);
  assert.strictEqual(s.merges, 0, 'merges must be 0 on init');
  assert.strictEqual(s.longestStreak, 0, 'longestStreak must be 0 on init');
  assert.strictEqual(s.currentStreak, 0, 'currentStreak must be 0 on init');
  assert.strictEqual(s.maxTile, ceilingDetector(board), 'maxTile must equal ceilingDetector(board)');
  assert.strictEqual(s.maxTile, 24);
});

test('[P0] AC1 initialStats on empty-ish board uses ceiling 0 (defensive floor)', async () => {
  const { initialStats } = await import(SPEC);
  const board = emptyBoard();
  const s = initialStats(board);
  assert.strictEqual(s.maxTile, 0, 'empty board ceiling is 0');
  assert.strictEqual(s.merges, 0);
  assert.strictEqual(s.longestStreak, 0);
  assert.strictEqual(s.currentStreak, 0);
});

test('[P0] AC1 initialStats on game board (newGame-like 9-tile setup) maxTile matches ceiling', async () => {
  const { initialStats } = await import(SPEC);
  const board = boardWith([
    [1, 2, 3, null],
    [3, 6, 12, null],
    [24, 48, null, null],
    [null, null, null, null],
  ]);
  const s = initialStats(board);
  assert.strictEqual(s.maxTile, 48, 'maxTile must be board ceiling 48');
});

// ── applyMoveStats: merges ────────────────────────────────────────────

test('[P0] AC1 applyMoveStats increments merges by trace merge count (from.length===2, or classify==="merge")', async () => {
  const { initialStats, applyMoveStats } = await import(SPEC);
  const board = boardWith([
    [6, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  let stats = initialStats(emptyBoard());
  // One merge in trace (from.length===2, spawned false)
  const prevBoard = emptyBoard();
  prevBoard[0][0] = 3;
  prevBoard[0][1] = 3;
  const postBoard = board;
  const result = moveResult(postBoard, [
    traceEntry(6, [0, 0], [[0, 0], [0, 1]], false),
    traceEntry(1, [3, 3], [], true),
  ]);
  stats = applyMoveStats(stats, postBoard, result);
  assert.strictEqual(stats.merges, 1, 'one merge in trace must increment merges by 1');
  // Second move with 0 merges does not increment merges
  const nextBoard = boardWith([
    [6, 3, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  const zeroMerge = moveResult(nextBoard, [
    traceEntry(6, [0, 0], [[0, 0]], false),
    traceEntry(3, [0, 1], [[0, 1]], false),
  ]);
  stats = applyMoveStats(stats, nextBoard, zeroMerge);
  assert.strictEqual(stats.merges, 1, 'zero-merge move must not increment merges');
});

test('[P0] AC1 applyMoveStats streak: consecutive merge moves increment currentStreak by 1, longestStreak tracks max', async () => {
  const { initialStats, applyMoveStats } = await import(SPEC);
  let stats = initialStats(emptyBoard());
  const mkBoard = (v: number) =>
    boardWith([
      [v, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);

  // Move 1: 1 merge → streak 1, longest 1
  stats = applyMoveStats(stats, mkBoard(6), moveResult(mkBoard(6), [traceEntry(6, [0, 0], [[0, 0], [0, 1]])]));
  assert.strictEqual(stats.currentStreak, 1, 'first merge move must set currentStreak 1');
  assert.strictEqual(stats.longestStreak, 1);
  assert.strictEqual(stats.merges, 1);

  // Move 2: 1 merge → streak 2, longest 2
  stats = applyMoveStats(stats, mkBoard(12), moveResult(mkBoard(12), [traceEntry(12, [0, 0], [[0, 0], [0, 1]])]));
  assert.strictEqual(stats.currentStreak, 2);
  assert.strictEqual(stats.longestStreak, 2);
  assert.strictEqual(stats.merges, 2);

  // Move 3: zero-merge (noop/slide) → current resets 0, longest preserved 2
  stats = applyMoveStats(stats, mkBoard(12), moveResult(mkBoard(12), [traceEntry(12, [0, 0], [[0, 0]])]));
  assert.strictEqual(stats.currentStreak, 0, 'zero-merge must reset currentStreak');
  assert.strictEqual(stats.longestStreak, 2, 'longestStreak preserved after reset');
  assert.strictEqual(stats.merges, 2, 'merges unchanged on zero-merge');

  // Move 4: merge again → streak 1, longest stays 2
  stats = applyMoveStats(stats, mkBoard(24), moveResult(mkBoard(24), [traceEntry(24, [0, 0], [[0, 0], [0, 1]])]));
  assert.strictEqual(stats.currentStreak, 1);
  assert.strictEqual(stats.longestStreak, 2, 'new streak 1 must not beat longest 2');

  // Move 5-6: two more merges → streak 3, longest becomes 3 (beats prior max)
  stats = applyMoveStats(stats, mkBoard(48), moveResult(mkBoard(48), [traceEntry(48, [0, 0], [[0, 0], [0, 1]])]));
  stats = applyMoveStats(stats, mkBoard(96), moveResult(mkBoard(96), [traceEntry(96, [0, 0], [[0, 0], [0, 1]])]));
  assert.strictEqual(stats.currentStreak, 3);
  assert.strictEqual(stats.longestStreak, 3);
});

test('[P0] AC1 streak is per-move, not per-tile: [3,3,3,3]->[6,6] (two merges in one swipe) counts as ONE streak step', async () => {
  const { initialStats, applyMoveStats } = await import(SPEC);
  let stats = initialStats(emptyBoard());
  const board = boardWith([
    [6, 6, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  // Two merges in a single MoveResult (line shift merges two pairs)
  const doubleMerge = moveResult(board, [
    traceEntry(6, [0, 0], [[0, 0], [0, 1]], false),
    traceEntry(6, [0, 1], [[0, 2], [0, 3]], false),
    traceEntry(1, [3, 3], [], true),
  ]);
  stats = applyMoveStats(stats, board, doubleMerge);
  assert.strictEqual(stats.merges, 2, 'two tile merges in one move must add 2 to merges count');
  assert.strictEqual(stats.currentStreak, 1, 'but streak must increment by 1 per move, not per tile');
  assert.strictEqual(stats.longestStreak, 1);
  // Next move with one merge → streak 2 (not 3)
  const next = boardWith([
    [12, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  stats = applyMoveStats(stats, next, moveResult(next, [traceEntry(12, [0, 0], [[0, 0], [0, 1]])]));
  assert.strictEqual(stats.currentStreak, 2);
  assert.strictEqual(stats.longestStreak, 2);
});

test('[P0] AC1 maxTile monotonic: never decreases and tracks ceilingDetector(postBoard)', async () => {
  const { initialStats, applyMoveStats } = await import(SPEC);
  const board48 = boardWith([
    [48, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  let stats = initialStats(board48);
  assert.strictEqual(stats.maxTile, 48);

  // Next board deflates to 24 (e.g., artificial but pins monotonic guard)
  const board24 = boardWith([
    [24, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  stats = applyMoveStats(stats, board24, moveResult(board24, [traceEntry(24, [0, 0], [[0, 0]])]));
  assert.strictEqual(stats.maxTile, 48, 'maxTile must never decrease — stays at 48 after deflate to 24');

  // Next board grows to 96 → maxTile rises
  const board96 = boardWith([
    [96, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  stats = applyMoveStats(stats, board96, moveResult(board96, [traceEntry(96, [0, 0], [[0, 0], [0, 1]])]));
  assert.strictEqual(stats.maxTile, 96, 'maxTile must rise to new ceiling 96');
  assert.strictEqual(stats.maxTile, ceilingDetector(board96), 'maxTile must equal ceilingDetector(postBoard) when it grows');
});

test('[P1] AC1/AC4 applyMoveStats determinism: same prev+board+result yields deepEqual, no mutation of prev', async () => {
  const { initialStats, applyMoveStats } = await import(SPEC);
  const prev = initialStats(boardWith([
    [12, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]));
  const prevSnapshot = structuredClone(prev);
  const board = boardWith([
    [24, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  const result = moveResult(board, [traceEntry(24, [0, 0], [[0, 0], [0, 1]])]);
  const a = applyMoveStats(prev, board, result);
  const b = applyMoveStats(prevSnapshot, board, result);
  assert.deepStrictEqual(a, b, 'deterministic: same inputs must yield deepEqual outputs');
  assert.deepStrictEqual(prev, prevSnapshot, 'must not mutate prev');
  // Spawn entries must not count as merges
  const spawnResult = moveResult(board, [
    traceEntry(24, [0, 0], [[0, 0]], false),
    traceEntry(1, [3, 3], [], true),
  ]);
  const withSpawn = applyMoveStats(prevSnapshot, board, spawnResult);
  assert.strictEqual(withSpawn.merges, prev.merges, 'spawn trace entries must not increment merges');
});

test('[P1] AC4 applyMoveStats purity: no Math.random, no engine roll symbols, host-testable (no RN)', async () => {
  const { applyMoveStats } = await import(SPEC);
  // Source-level guard: read the file and assert it contains no forbidden symbols.
  // This mirrors ui.norolls/engine.purity guard intent at the unit level so the
  // projection cannot silently drift into roll/RN territory.
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../src/game/matchStats.ts'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  for (const sym of ['Math.random', 'resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker', 'pickIndex']) {
    assert.ok(!stripped.includes(sym), `matchStats.ts must not contain forbidden symbol '${sym}'`);
  }
  // Runtime purity: repeated call with same inputs yields same output (already pinned) and does not touch global Math.random
  const origRandom = Math.random;
  let called = false;
  Math.random = () => { called = true; return 0.5; };
  try {
    const board = boardWith([[6, null, null, null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]);
    const prev = { merges: 0, longestStreak: 0, currentStreak: 0, maxTile: 0 } as any;
    applyMoveStats(prev, board, moveResult(board, [traceEntry(6, [0,0], [[0,0],[0,1]])]));
    assert.strictEqual(called, false, 'applyMoveStats must not call Math.random');
  } finally {
    Math.random = origRandom;
  }
});

test('[P1] AC3 lane-scoped best is NOT inside MatchStats — matchStats only owns merges/longestStreak/maxTile/currentStreak (separation pin)', async () => {
  const { initialStats } = await import(SPEC);
  const s = initialStats(emptyBoard());
  // MatchStats must not expose score/best — those live in matchScore.ts (app-owned)
  assert.ok(!('score' in s), 'MatchStats must not contain score (belongs to MatchScore)');
  assert.ok(!('best' in s), 'MatchStats must not contain best (belongs to MatchScore, lane-scoped via initialScore/persistedBest)');
  assert.ok('merges' in s && 'longestStreak' in s && 'maxTile' in s && 'currentStreak' in s, 'MatchStats must expose exactly merges/longestStreak/maxTile/currentStreak');
});
