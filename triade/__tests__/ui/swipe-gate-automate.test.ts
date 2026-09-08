import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { handleSwipe, handleGestureEnd } from '../../src/ui/gesture.ts';
import { move } from '../../src/engine/core/index.ts';
import { planTileTransitions } from '../../src/render/transitionPlan.ts';
import { staticBoard, gameState, spyRng } from '../../test-utils/helpers.ts';

// Story 1.6 automate gap expansion (TEA `bmad-testarch-automate`, 2026-09-06).
// Working tree carries no production diff (D-008 zero-drift pass at
// final_revision d7ee643); the shipped contract is green via `swipe.test.ts`
// (10) + `gesture-pipeline.test.ts` (7) + `ui.gesture.test.ts` (1).
// This file covers the one known automation gap (test-design R-003 / deferred
// Df1, proposed 1.6-PROP-001): the `busyRef` in-flight gate state machine,
// plus the untested defensive branches of the real gesture wiring.
//
// Seam honesty (DW-50 lesson): every dispatch decision below goes through the
// REAL `handleSwipe` / `handleGestureEnd` from `src/ui/gesture.ts` and the
// REAL `move()` / `planTileTransitions`. The ONLY modeled piece is the
// three-line App gate protocol — `reportMoveResult` mirrors `App.tsx` doMove
// ("busyRef set ONLY when result.moved === true", the noop deadlock guard)
// and `reportSettled` mirrors `App.tsx` onMoveSettled (clear fallback, then
// release). When 1.6-PROP-001 ships a pure `src/ui/swipeGate.ts`, migrate
// these protocol tests onto it and delete the harness (see the P2 note in
// the automation summary).

interface Gate {
  current: boolean;
}

function createGate(): Gate {
  return { current: false };
}

function reportMoveResult(gate: Gate, result: { moved: boolean }): void {
  if (result.moved) gate.current = true;
}

function reportSettled(gate: Gate): void {
  gate.current = false;
}

// Full board, no empties, no adjacent merges: any swipe is a noop
// (moved:false, 0 RNG rolls). Row filler [3,6,12,24] matches staticBoard.
function lockedBoard() {
  return staticBoard([3, 6, 12, 24]);
}

// Row 0 [null,null,2,1]: a right swipe merges 2+1 -> 3 (moved:true, 2 rolls).
function mergeableBoard() {
  return staticBoard([null, null, 2, 1]);
}

// --- P0: gate deadlock guards (R-003/Df1) ---

test('[P0] noop move result never arms the gate (moved:false leaves busy untouched)', () => {
  // Given a fresh gate and a board where a right swipe cannot move
  const gate = createGate();
  const rng = spyRng();
  // When a real noop move runs and its result is reported
  const result = move(gameState(lockedBoard()), 'right', rng);
  assert.strictEqual(result.moved, false, 'locked board must produce moved:false');
  assert.strictEqual(rng.calls.length, 0, 'noop must consume 0 RNG rolls (seeded stream preserved)');
  reportMoveResult(gate, result);
  // Then the gate stays open so the next swipe is accepted, not dropped
  assert.strictEqual(gate.current, false, 'noop must never arm the gate (deadlock guard)');
  let dispatched = false;
  const accepted = handleSwipe(30, 0, gate, () => {
    dispatched = true;
  });
  assert.strictEqual(accepted, true, 'swipe after noop must be accepted');
  assert.strictEqual(dispatched, true, 'dispatch must run for the post-noop swipe');
});

test('[P0] effective move arms the gate (further swipes rejected while closed)', () => {
  // Given a fresh gate and a board where a right swipe merges
  const gate = createGate();
  const rng = spyRng(0, 0.5, 0.5);
  // When a real effective move runs and its result is reported
  const result = move(gameState(mergeableBoard()), 'right', rng);
  assert.strictEqual(result.moved, true, 'mergeable board must produce moved:true');
  reportMoveResult(gate, result);
  // Then the gate closes and the next swipe is rejected silently
  assert.strictEqual(gate.current, true, 'effective move must arm the gate');
  let dispatchCalls = 0;
  const accepted = handleSwipe(30, 0, gate, () => {
    dispatchCalls += 1;
  });
  assert.strictEqual(accepted, false, 'swipe while gate closed must be rejected');
  assert.strictEqual(dispatchCalls, 0, 'rejected swipe must never dispatch (no spawn, no turn)');
});

test('[P0] settle signal re-opens the gate (early-input release)', () => {
  // Given an armed gate after a real effective move
  const gate = createGate();
  const result = move(gameState(mergeableBoard()), 'right', spyRng(0, 0.5, 0.5));
  reportMoveResult(gate, result);
  assert.strictEqual(gate.current, true, 'precondition: gate armed');
  // When the settle signal fires (GameBoard early-input timer path)
  reportSettled(gate);
  // Then the next swipe is accepted again
  let dispatched = false;
  const accepted = handleSwipe(-30, 0, gate, () => {
    dispatched = true;
  });
  assert.strictEqual(accepted, true, 'swipe after settle must be accepted');
  assert.strictEqual(dispatched, true, 'dispatch must run after settle');
});

test('[P0] moved ⟺ plan.length>0 invariant holds on real modules (Df1 guard)', () => {
  // Given a noop result and an effective result from the real engine
  const noop = move(gameState(lockedBoard()), 'right', spyRng());
  const effective = move(gameState(mergeableBoard()), 'right', spyRng(0, 0.5, 0.5));
  // When transition plans are derived
  const noopPlan = planTileTransitions(lockedBoard(), noop);
  const effectivePlan = planTileTransitions(mergeableBoard(), effective);
  // Then noop maps to an empty plan (nothing to animate -> gate must not arm)
  // and effective maps to a non-empty plan (animation runs -> gate arms)
  assert.deepStrictEqual(noopPlan, [], 'moved:false must yield an empty plan');
  assert.ok(effectivePlan.length > 0, 'moved:true must yield a non-empty plan');
});

// --- P1: untested defensive branches of the real wiring ---

test('[P1] non-finite translation (NaN/±Infinity) is rejected, gate untouched', () => {
  // Given an open gate
  const gate = createGate();
  // When non-finite translations arrive (corrupted RNGH event payload)
  for (const [dx, dy] of [
    [NaN, 0],
    [0, NaN],
    [Infinity, 0],
    [30, -Infinity],
  ] as Array<[number, number]>) {
    let dispatchCalls = 0;
    const accepted = handleSwipe(dx, dy, gate, () => {
      dispatchCalls += 1;
    });
    // Then the swipe is rejected without dispatch and the gate is untouched
    assert.strictEqual(accepted, false, `(${dx},${dy}) must be rejected`);
    assert.strictEqual(dispatchCalls, 0, `(${dx},${dy}) must not dispatch`);
  }
  assert.strictEqual(gate.current, false, 'rejected swipes must not arm the gate');
});

test('[P1] malformed gesture event (null / non-numeric translation) never dispatches', () => {
  // Given an open gate
  const gate = createGate();
  // When malformed events arrive at the gesture end point
  const badEvents = [null, undefined, {}, { translationX: '30', translationY: 0 }, { translationX: 30 }] as const;
  for (const event of badEvents) {
    let dispatchCalls = 0;
    const accepted = handleGestureEnd(event as never, true, gate, () => {
      dispatchCalls += 1;
    });
    // Then each is rejected silently
    assert.strictEqual(accepted, false, `${JSON.stringify(event)} must be rejected`);
    assert.strictEqual(dispatchCalls, 0, `${JSON.stringify(event)} must not dispatch`);
  }
  assert.strictEqual(gate.current, false, 'malformed events must not arm the gate');
});

test('[P1] throwing dispatch is swallowed (returns false, gate state unchanged)', () => {
  // Given an open gate and a dispatch that throws (downstream failure)
  const gate = createGate();
  // When a decisive swipe dispatches into the throwing handler
  const accepted = handleSwipe(30, 0, gate, () => {
    throw new Error('downstream boom');
  });
  // Then no exception escapes and the swipe reports as not dispatched
  assert.strictEqual(accepted, false, 'throwing dispatch must report false');
  assert.strictEqual(gate.current, false, 'gate must be unchanged after a throwing dispatch');
});

test('[P1] App.tsx arms busyRef only under result.moved + onMoveSettled releases in order (static tripwire)', () => {
  // Given the shipped App wiring source
  const appSrc = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
  // When the gate protocol sites are inspected
  // Then busyRef arms only inside the moved:true branch (noop deadlock guard)
  assert.ok(appSrc.includes('if (result.moved)'), 'missing if (result.moved) gate branch');
  const movedIdx = appSrc.indexOf('if (result.moved)');
  const armIdx = appSrc.indexOf('busyRef.current = true', movedIdx);
  assert.ok(armIdx > movedIdx, 'busyRef=true must sit under the moved:true branch');
  // And the settle release clears the fallback timer BEFORE releasing the gate
  const settledIdx = appSrc.indexOf('const onMoveSettled');
  assert.ok(settledIdx >= 0, 'missing onMoveSettled');
  const settledSlice = appSrc.slice(settledIdx, settledIdx + 2500);
  const clearIdx = settledSlice.indexOf('clearTimeout(fallbackBusyTimerRef.current)');
  const releaseIdx = settledSlice.indexOf('busyRef.current = false');
  assert.ok(clearIdx >= 0 && releaseIdx >= 0, 'onMoveSettled must clear fallback and release busyRef');
  assert.ok(clearIdx < releaseIdx, 'fallback clear must precede gate release (no double-fire)');
});

// --- P2: idempotency + defensive guards ---

test('[P2] noop after effective keeps the gate armed until settle (no early release, no deadlock)', () => {
  // Given an armed gate after a real effective move
  const gate = createGate();
  const effective = move(gameState(mergeableBoard()), 'right', spyRng(0, 0.5, 0.5));
  reportMoveResult(gate, effective);
  assert.strictEqual(gate.current, true, 'precondition: gate armed');
  // When a noop result is reported before the settle signal
  const noop = move(gameState(lockedBoard()), 'right', spyRng());
  reportMoveResult(gate, noop);
  // Then the gate stays armed (noop must not release it early)
  assert.strictEqual(gate.current, true, 'noop must not release an armed gate');
  let dispatchCalls = 0;
  assert.strictEqual(
    handleSwipe(30, 0, gate, () => {
      dispatchCalls += 1;
    }),
    false,
    'swipe while still armed must be rejected'
  );
  assert.strictEqual(dispatchCalls, 0, 'rejected swipe must not dispatch');
  // And the settle signal still releases it (no deadlock)
  reportSettled(gate);
  assert.strictEqual(gate.current, false, 'settle must release the gate');
});

test('[P2] missing busy ref or non-function dispatch is rejected (defensive guards)', () => {
  // Given a decisive swipe payload
  // When the busy ref is missing or the dispatch is not callable
  assert.strictEqual(handleSwipe(30, 0, null as never, () => {}), false, 'null busy must be rejected');
  assert.strictEqual(handleSwipe(30, 0, undefined as never, () => {}), false, 'undefined busy must be rejected');
  assert.strictEqual(handleSwipe(30, 0, createGate(), null as never), false, 'null dispatch must be rejected');
  // Then a well-formed call on an open gate still succeeds (guards are narrow)
  let dispatched = false;
  assert.strictEqual(
    handleSwipe(30, 0, createGate(), () => {
      dispatched = true;
    }),
    true,
    'well-formed swipe must still dispatch'
  );
  assert.strictEqual(dispatched, true, 'dispatch must run for the well-formed swipe');
});
