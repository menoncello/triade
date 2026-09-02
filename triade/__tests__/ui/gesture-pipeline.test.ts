import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolveSwipeDirection } from '../../src/ui/swipe.ts';
import * as game from '../../src/engine/core/index.ts';
import type { Rng } from '../../src/engine/core/index.ts';
import { staticBoard, rngOf, gameState } from '../../test-utils/helpers.ts';

// Mirrors App.tsx's pan gesture onEnd contract (App.tsx:115-120):
//   const dir = resolveSwipeDirection({ dx: event.translationX, dy: event.translationY });
//   if (dir) doMoveRef.current(dir);
// doMove dispatches game.move(state, dir, rng). We exercise that exact contract
// with the real modules so a regression in either the swipe resolver or the
// engine move breaks this test (the two halves App wires together).
function handleSwipe(
  dx: number,
  dy: number,
  state: ReturnType<typeof game.newGame>,
  rng: Rng,
  busy: { current: boolean }
): ReturnType<typeof game.move> | null {
  if (busy.current) return null;
  const dir = resolveSwipeDirection({ dx, dy });
  if (!dir) return null;
  return game.move(state, dir, rng);
}

test('GESTURE: a right swipe dispatches a right move that mutates the board', () => {
  const board = staticBoard([null, null, 2, 1]);
  const before = JSON.stringify(board);
  const res = handleSwipe(30, 2, gameState(board), rngOf(0, 0, 0.5), { current: false });
  assert.ok(res, 'a decisive right swipe must resolve to a move');
  assert.notStrictEqual(JSON.stringify(res!.board), before, 'board should change after a real swipe');
  assert.strictEqual(res!.board[0][3], 3, '2+1 merges to 3 at the right wall');
});

test('GESTURE: a left swipe dispatches a left move', () => {
  const board = staticBoard([1, 2, null, null]);
  const res = handleSwipe(-30, 1, gameState(board), rngOf(0, 0, 0.5), { current: false });
  assert.ok(res);
  assert.strictEqual(res!.board[0][0], 3, '1+2 merges to 3 at the left wall');
});

test('GESTURE: a sub-threshold swipe resolves to no move (gate below activation)', () => {
  const board = staticBoard([1, 2, null, null]);
  const res = handleSwipe(5, 1, gameState(board), rngOf(0, 0, 0.5), { current: false });
  assert.strictEqual(res, null, 'swipe under SWIPE_THRESHOLD must not move');
});

test('GESTURE: an exact diagonal tie resolves to no move (silent noop)', () => {
  const board = staticBoard([1, 2, null, null]);
  const res = handleSwipe(20, 20, gameState(board), rngOf(0, 0, 0.5), { current: false });
  assert.strictEqual(res, null, 'equal-magnitude swipe must not consume a turn');
});

test('GESTURE: the in-flight busy gate suppresses swipes mid-animation (T3.4)', () => {
  const board = staticBoard([1, 2, null, null]);
  const busy = { current: true };
  const res = handleSwipe(30, 0, gameState(board), rngOf(0, 0, 0.5), busy);
  assert.strictEqual(res, null, 'a swipe while busy must be ignored');
});

test('WIRING: App.tsx binds the pan gesture end to resolveSwipeDirection + doMove', () => {
  const source = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
  assert.ok(
    /resolveSwipeDirection\(\{\s*dx:\s*event\.translationX/.test(source),
    'App must resolve the swipe from event.translationX/translationY'
  );
  assert.ok(/doMoveRef\.current\(dir\)/.test(source), 'App must dispatch the resolved direction to doMove');
  assert.ok(/SWIPE_THRESHOLD/.test(source), 'App must gate activation on SWIPE_THRESHOLD');
});
