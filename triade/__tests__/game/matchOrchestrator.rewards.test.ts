import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialOrchestratorState,
  canUndoForState,
  requestUndo,
  confirmUndoAd,
  confirmUndoIap,
  cancelUndo,
  resetForNewMatch,
} from '../../src/game/matchOrchestrator.ts';
import { LANE_PROFILES } from '../../src/game/lanes.ts';

const acc = LANE_PROFILES.accelerated;
const clean = LANE_PROFILES.clean;

function snap(n = 1): any {
  return {
    game: { board: [[n, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } },
    match: { score: n, best: n },
    matchStats: { maxTile: n, merges: 1, longestStreak: 1, currentStreak: 1 },
  };
}

describe('4.1 rewarded ad undo — per-game free budget', () => {
  it('first confirmUndoAd consumes freeUsed once and rewires snapshot', () => {
    const s1 = snap(10);
    const s2 = snap(20);
    const state = { ...initialOrchestratorState(), undoHistory: [s1, s2] };
    const r = confirmUndoAd(state, acc);
    assert.equal(r.ok, true);
    assert.equal(r.state.undoBudget.freeUsed, true);
    assert.equal(r.state.undoHistory.length, 1);
    assert.equal(r.snapshot, s2);
    assert.equal(r.state.showUndoPrompt, false);
  });

  it('second confirmUndoAd same game rejected — exactly 1 free per game', () => {
    const s = snap();
    const afterFirst = confirmUndoAd({ ...initialOrchestratorState(), undoHistory: [s, snap()] }, acc);
    assert.equal(afterFirst.ok, true);
    const second = confirmUndoAd(afterFirst.state, acc);
    assert.equal(second.ok, false);
    assert.equal(second.state.undoBudget.freeUsed, true);
    // history unchanged on rejected
    assert.equal(second.state.undoHistory.length, 1);
  });

  it('canUndoForState reflects 1-free gate', () => {
    const s = snap();
    const fresh = { ...initialOrchestratorState(), undoHistory: [s] };
    assert.equal(canUndoForState(fresh, acc), true);
    const consumed = { ...fresh, undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    assert.equal(canUndoForState(consumed, acc), false);
    const withIap = { ...consumed, undoBudget: { freeUsed: true, iapRemaining: 1, unlimited: false } };
    assert.equal(canUndoForState(withIap, acc), true);
    assert.equal(canUndoForState(withIap, clean), false);
  });

  it('ad fail/cancel leaves board and budget unchanged — via cancelUndo', () => {
    const s = snap();
    const state = { ...initialOrchestratorState(), undoHistory: [s], showUndoPrompt: true };
    const next = cancelUndo(state);
    assert.equal(next.showUndoPrompt, false);
    assert.equal(next.undoHistory.length, 1);
    assert.deepEqual(next.undoBudget, { freeUsed: false, iapRemaining: 0, unlimited: false });
  });

  it('cancelUndo does not pop history', () => {
    const s = snap();
    const state = { ...initialOrchestratorState(), undoHistory: [s], showUndoPrompt: true };
    const next = cancelUndo(state);
    assert.equal(next.undoHistory[0], s);
  });

  it('resetForNewMatch resets freeUsed so next game again offers ad undo', () => {
    const consumed = {
      ...initialOrchestratorState(),
      undoHistory: [snap()],
      undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false },
      showUndoPrompt: true,
    };
    const next = resetForNewMatch(consumed);
    assert.equal(next.undoBudget.freeUsed, false);
    assert.equal(next.undoHistory.length, 0);
    assert.equal(next.showUndoPrompt, false);
    const ready = { ...next, undoHistory: [snap()] };
    assert.equal(canUndoForState(ready, acc), true);
  });

  it('requestUndo → confirmUndoAd → second request undo blocked', () => {
    const s1 = snap(1);
    const s2 = snap(2);
    let state = { ...initialOrchestratorState(), undoHistory: [s1, s2] };
    const req1 = requestUndo(state, acc, false);
    assert.equal(req1.ok, true);
    state = req1.state;
    const conf1 = confirmUndoAd(state, acc);
    assert.equal(conf1.ok, true);
    state = conf1.state;
    // history left 1, but freeUsed now true so even with history, need IAP/unlimited
    const req2 = requestUndo({ ...state, undoHistory: [s1] }, acc, false);
    assert.equal(req2.ok, false);
  });

  it('Clean never canUndo even after granted ad attempt', () => {
    const state = { ...initialOrchestratorState(), undoHistory: [snap()], showUndoPrompt: true };
    assert.equal(confirmUndoAd(state, clean).ok, false);
    assert.equal(confirmUndoIap(state, clean).ok, false);
  });

  it('busy flag blocks requestUndo (between-turn gate, never during animation)', () => {
    const state = { ...initialOrchestratorState(), undoHistory: [snap()] };
    assert.equal(requestUndo(state, acc, true).ok, false);
    assert.equal(requestUndo(state, acc, false).ok, true);
  });
});
