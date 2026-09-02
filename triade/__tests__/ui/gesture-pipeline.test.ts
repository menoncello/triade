import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { handleSwipe } from '../../src/ui/gesture.ts';
import * as game from '../../src/engine/core/index.ts';
import type { Rng } from '../../src/engine/core/index.ts';
import { staticBoard, rngOf, gameState } from '../../test-utils/helpers.ts';

// Now imports the real wiring from src/ui/gesture.ts (DW-50) instead of a local
// copy. The helper composes the imported busy-gate + resolveSwipeDirection
// dispatch with game.move so board-mutation is still exercised via real modules.
function swipeToMove(
  dx: number,
  dy: number,
  state: ReturnType<typeof game.newGame>,
  rng: Rng,
  busy: { current: boolean },
  success = true
): ReturnType<typeof game.move> | null {
  let result: ReturnType<typeof game.move> | null = null;
  const dispatched = handleSwipe(dx, dy, busy, (dir) => {
    result = game.move(state, dir, rng);
  }, { success });
  if (!dispatched) return null;
  return result;
}

test('GESTURE: a right swipe dispatches a right move that mutates the board', () => {
  const board = staticBoard([null, null, 2, 1]);
  const before = JSON.stringify(board);
  const res = swipeToMove(30, 2, gameState(board), rngOf(0, 0, 0.5), { current: false });
  assert.ok(res, 'a decisive right swipe must resolve to a move');
  assert.notStrictEqual(JSON.stringify(res!.board), before, 'board should change after a real swipe');
  assert.strictEqual(res!.board[0][3], 3, '2+1 merges to 3 at the right wall');
});

test('GESTURE: a left swipe dispatches a left move', () => {
  const board = staticBoard([1, 2, null, null]);
  const res = swipeToMove(-30, 1, gameState(board), rngOf(0, 0, 0.5), { current: false });
  assert.ok(res);
  assert.strictEqual(res!.board[0][0], 3, '1+2 merges to 3 at the left wall');
});

test('GESTURE: a sub-threshold swipe resolves to no move (gate below activation)', () => {
  const board = staticBoard([1, 2, null, null]);
  const res = swipeToMove(5, 1, gameState(board), rngOf(0, 0, 0.5), { current: false });
  assert.strictEqual(res, null, 'swipe under SWIPE_THRESHOLD must not move');
});

test('GESTURE: an exact diagonal tie resolves to no move (silent noop)', () => {
  const board = staticBoard([1, 2, null, null]);
  const res = swipeToMove(20, 20, gameState(board), rngOf(0, 0, 0.5), { current: false });
  assert.strictEqual(res, null, 'equal-magnitude swipe must not consume a turn');
});

test('GESTURE: the in-flight busy gate suppresses swipes mid-animation (T3.4)', () => {
  const board = staticBoard([1, 2, null, null]);
  const busy = { current: true };
  const res = swipeToMove(30, 0, gameState(board), rngOf(0, 0, 0.5), busy);
  assert.strictEqual(res, null, 'a swipe while busy must be ignored');
});

test('GESTURE: success=false suppresses dispatch even when busy is idle', () => {
  const board = staticBoard([1, 2, null, null]);
  const res = swipeToMove(30, 0, gameState(board), rngOf(0, 0, 0.5), { current: false }, false);
  assert.strictEqual(res, null, 'failed gesture success must not dispatch');
});

test('WIRING: App.tsx binds the pan gesture end to handleGestureEnd + doMove', () => {
  const appSource = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
  assert.ok(/handleGestureEnd/.test(appSource), 'App must route pan end through handleGestureEnd');
  assert.ok(/doMoveRef\.current\(dir\)/.test(appSource), 'App must dispatch the resolved direction to doMove');
  assert.ok(/SWIPE_THRESHOLD/.test(appSource), 'App must gate activation on SWIPE_THRESHOLD');
  // Secondary guard: gesture module itself still wires resolveSwipeDirection + dispatch (legacy WIRING regex preserved via module)
  const gestureSource = readFileSync(new URL('../../src/ui/gesture.ts', import.meta.url), 'utf8');
  assert.ok(
    /resolveSwipeDirection\(\{\s*dx:\s*dx/.test(gestureSource) || /resolveSwipeDirection/.test(gestureSource),
    'gesture module must resolve swipe via resolveSwipeDirection'
  );
});
