import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

// O-2 — App game-over wiring integration pins (story 6.1 review)
// Covers what the 6.1 automation-summary deferred as "App wiring
// verified indirectly": isGameOver(game.board) conditional overlay,
// handleRestart busyRef deadlock defense, matchStats + applyMoveStats
// projection, and availablePot once-per-render invariant.

import { boardWith, emptyBoard } from '../../../test-utils/helpers.ts';
import { isGameOver } from '../../../src/engine/core/index.ts';
import { ceilingDetector } from '../../../src/engine/core/ceiling.ts';
import { tierForCeiling } from '../../../src/engine/core/index.ts';
import { potForTier } from '../../../src/engine/core/pot.ts';
import { initialScore, isNewRecord } from '../../../src/game/matchScore.ts';
import { initialStats, applyMoveStats } from '../../../src/game/matchStats.ts';
import { GameOverOverlay } from '../../../src/ui/GameOverOverlay.tsx';
import type { Board, MoveResult } from '../../../src/engine/core/types.ts';

function traceEntry(value: number, to: [number, number], from: Array<[number, number]>, spawned = false) {
  return { value, to, from, spawned } as any;
}
function moveResult(board: Board, trace: any[], score = 0, moved = true): MoveResult {
  return { board, trace, score, moved, pendingSpawn: { value: 1, displayRoll: 0 } } as any;
}

// ── Structural wiring ───────────────────────────────────────────────

test('[P0] AC1/AC4 App wiring: App.tsx renders GameOverOverlay when isGameOver(game.board) and passes lane-scoped stats', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(/isGameOver\s*\(\s*game\.board\s*\)/.test(clean), 'App.tsx must evaluate isGameOver(game.board) (committed snapshot, not moveResult.board)');
  assert.ok(/GameOverOverlay/.test(src), 'App.tsx must import and render GameOverOverlay');
  assert.ok(/gameOver\s*\?\s*\(\s*<GameOverOverlay/.test(src), 'App.tsx must conditionally render GameOverOverlay when gameOver');
  assert.ok(/reducedMotion=\{false\}/.test(src), 'App.tsx must thread reducedMotion={false} literal until Epic 9 (forward-compat)');
  assert.ok(/insets=\{insets\}/.test(src), 'App.tsx must pass insets={insets} to GameOverOverlay (SAFE_MARGIN padding)');
  assert.ok(/stats=\{\{\s*score:\s*match\.score/.test(src), 'GameOverOverlay stats.score must come from match.score (lane-scoped via matchScore)');
  assert.ok(/maxTile:\s*matchStats\.maxTile/.test(src), 'maxTile must come from matchStats (ceilingDetector layered)');
  assert.ok(/isNewRecord\s*\(\s*sessionStartBest/.test(src), 'isNewRecord must be gated on sessionStartBest*Ref.current (per-lane after 3.4), not current.best');
  // availablePot once per render after if(!ready) and shared by both lanes
  assert.ok(/availablePot\s*=\s*potForTier\s*\(\s*tierForCeiling\s*\(\s*ceilingDetector\s*\(\s*game\.board\s*\)\s*\)/.test(src), 'availablePot must be potForTier(tierForCeiling(ceilingDetector(game.board))) once per render');
  const afterReadyIdx = src.indexOf('if (!ready)');
  const availablePotIdx = src.indexOf('availablePot = potForTier');
  assert.ok(afterReadyIdx !== -1 && availablePotIdx > afterReadyIdx, 'availablePot must be computed after if(!ready) guard (once per render, review patch F2)');
  assert.ok(/clean:\s*previewFor\s*\(\s*game\.pendingSpawn\s*,\s*availablePot\s*\)/.test(src), 'clean preview must be previewFor(game.pendingSpawn, availablePot)');
  assert.ok(/accelerated:\s*previewFor\s*\(\s*game\.pendingSpawn/.test(src), 'accelerated preview must share same availablePot');
});

test('[P0] AC4/T3 handleRestart deadlock defense: App.tsx resets game + match + matchStats + busyRef', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  assert.ok(/const\s+handleRestart\s*=\s*useCallback/.test(src), 'handleRestart must be useCallback');
  assert.ok(/newGame\s*\(\s*rngRef\.current\s*\)/.test(src), 'handleRestart must call newGame(rngRef.current) (injectable rng, no Math.random)');
  assert.ok(/setMatch\s*\(\s*initialScore\s*\(\s*persistedBest/.test(src), 'handleRestart must reset match via initialScore(persistedBest*) (lane-scoped after 3.4)');
  assert.ok(/setMatchStats\s*\(\s*initialStats\s*\(/.test(src), 'handleRestart must reset matchStats via initialStats(s.board)');
  assert.ok(/busyRef\.current\s*=\s*false/.test(src), 'handleRestart must set busyRef.current=false (deadlock defense Df5)');
  // Both handleRestart and onMoveSettled must release the gate
  const matches = src.match(/busyRef\.current\s*=\s*false/g) || [];
  assert.ok(matches.length >= 2, `busyRef.current=false must appear at least twice (handleRestart + onMoveSettled), got ${matches.length}`);
  assert.ok(/setMoveResult\s*\(\s*null\s*\)/.test(src), 'handleRestart must clear moveResult');
});

test('[P0] AC1 doMove projects via applyMoveStats on post-move board (maxTile monotonic source)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  assert.ok(/setMatchStats\s*\(\s*\(prev\)\s*=>\s*applyMoveStats\s*\(\s*prev\s*,\s*result\.board\s*,\s*result\s*\)/.test(src), 'doMove must call setMatchStats(prev => applyMoveStats(prev, result.board, result)) (post-move board for maxTile)');
  assert.ok(/initialStats\s*\(\s*game\.board\s*\)/.test(src), 'matchStats initial state must be () => initialStats(game.board) reusing existing game.board (no second newGame rng draw, deferred-work.md:81-82)');
  // also pinned: matchStats seeded from game.board already created at App.tsx:46, not newGame inside initializer
  assert.ok(!/useState.*initialStats.*newGame/.test(src), 'matchStats initializer must not call newGame inside (would double-consume mulberry32)');
});

// ── Runtime integration ───────────────────────────────────────────

test('[P0] AC1/AC2 runtime: gameOver board is full with no mergeable pair — isGameOver true and overlay would mount with correct stats shape', async () => {
  // Full board with no mergeable adjacency: only >=3 values, never equal neighbors, no 1/2.
  const gameOverBoard: Board = boardWith([
    [3, 6, 12, 24],
    [6, 12, 24, 3],
    [12, 24, 3, 6],
    [24, 3, 6, 12],
  ]);
  assert.strictEqual(isGameOver(gameOverBoard), true, 'crafted board must be gameOver (full + no adjacent mergeable pair)');
  // Non-gameOver board: empty cell or mergeable pair present
  const liveBoard: Board = boardWith([
    [3, 3, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  assert.strictEqual(isGameOver(liveBoard), false, 'board with mergeable pair must not be gameOver');

  // Simulate overlay mounting with lane-scoped MatchScore + MatchStats (thin-view posture)
  const persistedBest = 100;
  const match = initialScore(persistedBest); // {score:0,best:100}
  const stats = initialStats(liveBoard); // maxTile from liveBoard ceiling
  // Simulate one merge move to exercise applyMoveStats + ceilingDetector layering
  const postBoard: Board = boardWith([
    [6, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  const result = moveResult(postBoard, [traceEntry(6, [0, 0], [[0, 0], [0, 1]])], 6, true);
  const nextMatch = { score: match.score + 6, best: Math.max(match.best, match.score + 6) };
  const nextStats = applyMoveStats(stats, postBoard, result);
  assert.strictEqual(nextStats.merges, 1, 'applyMoveStats must project merges from trace');
  assert.strictEqual(nextStats.maxTile, ceilingDetector(postBoard), 'maxTile must be ceilingDetector(postBoard)');

  // Overlay thin-view: receives resolved stats + isNewRecord, never raw Board/GameState
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(GameOverOverlay, {
        stats: { score: nextMatch.score, best: nextMatch.best, maxTile: nextStats.maxTile, merges: nextStats.merges, longestStreak: nextStats.longestStreak },
        isNewRecord: isNewRecord(persistedBest, nextMatch.score),
        onRestart: () => {},
        reducedMotion: false,
        insets: { top: 10, bottom: 10, left: 10, right: 10 },
      })
    );
  });
  const text = renderer!.root.findAll((n) => (n.type as string) === 'Text').map((n) => String((n.props.children as any) ?? '')).join('|');
  assert.ok(text.includes(String(nextMatch.score)), 'overlay must render score from match');
  assert.ok(text.includes(String(nextStats.maxTile)), 'overlay must render maxTile from matchStats');
  assert.ok(renderer!.root.findAll((n) => n.props?.accessibilityRole === 'alert').length > 0, 'overlay must have alert role when mounted due to gameOver');
  // Hierarchy: overlay zIndex:2 blocks Hud zIndex:1 (pinned in component test, reproduced here via integration)
  const hasZ2 = renderer!.root.findAll((n) => {
    const raw = n.props?.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    return layers.some((s: any) => s && typeof s === 'object' && s.zIndex === 2);
  }).length > 0;
  assert.ok(hasZ2, 'integrated overlay (via GameOverOverlay) must carry zIndex:2 above Hud');
});

test('[P1] AC1 gameOver board edge: emptyBoard is NOT gameOver, full-but-mergeable board is NOT gameOver', () => {
  const empty = emptyBoard();
  assert.strictEqual(isGameOver(empty), false, 'empty board must not be gameOver');
  // Full board with one mergeable 1+2 pair horizontally
  const almostOver: Board = boardWith([
    [1, 2, 3, 6],
    [6, 12, 24, 3],
    [12, 24, 3, 6],
    [24, 3, 6, 12],
  ]);
  assert.strictEqual(isGameOver(almostOver), false, 'full board containing 1|2 adjacent must not be gameOver (canMerge 1+2)');
  // Full board with equal >=3 adjacent
  const pairOver: Board = boardWith([
    [3, 3, 6, 12],
    [6, 12, 24, 3],
    [12, 24, 3, 6],
    [24, 3, 6, 12],
  ]);
  assert.strictEqual(isGameOver(pairOver), false, 'full board with equal 3|3 adjacent must not be gameOver');
});
