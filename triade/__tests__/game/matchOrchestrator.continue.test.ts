import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialOrchestratorState,
  canContinueForState,
  consumeContinueAd,
  consumeContinueIap,
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

describe('4.2 rewarded ad death-continue — 1 use per gameOver', () => {
  it('canContinue true when used=false in accelerated, false after consumed', () => {
    const fresh = initialOrchestratorState();
    assert.equal(canContinueForState(fresh, acc), true);
    const consumed = consumeContinueAd(fresh, acc);
    assert.equal(consumed.ok, true);
    assert.equal(canContinueForState(consumed.state, acc), false);
  });

  it('consumeContinueAd flips used=true and rewinds snapshot when history>0', () => {
    const s1 = snap(10);
    const s2 = snap(20);
    const state = { ...initialOrchestratorState(), undoHistory: [s1, s2] };
    const r = consumeContinueAd(state, acc);
    assert.equal(r.ok, true);
    assert.equal(r.state.continueBudget.used, true);
    assert.equal(r.state.undoHistory.length, 1);
    assert.equal(r.snapshot, s2);
    assert.equal(r.state.hintHighlight, null);
    assert.equal(r.state.showUndoPrompt, false);
  });

  it('consumeContinueAd without history still consumes budget, no snapshot', () => {
    const state = { ...initialOrchestratorState(), undoHistory: [] };
    const r = consumeContinueAd(state, acc);
    assert.equal(r.ok, true);
    assert.equal(r.state.continueBudget.used, true);
    assert.equal(r.snapshot, undefined);
  });

  it('second consumeContinueAd same game rejected — exactly 1 per gameOver', () => {
    const state = { ...initialOrchestratorState(), undoHistory: [snap(), snap()] };
    const first = consumeContinueAd(state, acc);
    assert.equal(first.ok, true);
    const second = consumeContinueAd(first.state, acc);
    assert.equal(second.ok, false);
    assert.equal(second.state.continueBudget.used, true);
  });

  it('Clean never canContinue even after attempt', () => {
    const state = { ...initialOrchestratorState(), undoHistory: [snap()] };
    assert.equal(canContinueForState(state, clean), false);
    assert.equal(consumeContinueAd(state, clean).ok, false);
    assert.equal(consumeContinueIap(state, clean).ok, false);
  });

  it('consumeContinueIap also consumes once and respects lane wall', () => {
    const s = snap();
    const r = consumeContinueIap({ ...initialOrchestratorState(), undoHistory: [s] }, acc);
    assert.equal(r.ok, true);
    assert.equal(r.state.continueBudget.used, true);
    assert.equal(consumeContinueIap(r.state, acc).ok, false);
  });

  it('resetForNewMatch resets used=false so next game again offers continue', () => {
    const consumed = consumeContinueAd({ ...initialOrchestratorState(), undoHistory: [snap()] }, acc).state;
    assert.equal(consumed.continueBudget.used, true);
    const next = resetForNewMatch({ ...consumed, undoHistory: [snap()], showUndoPrompt: true });
    assert.equal(next.continueBudget.used, false);
    assert.equal(next.undoHistory.length, 0);
    assert.equal(canContinueForState(next, acc), true);
  });

  it('ad fail leaves budget untouched — no consume called means used stays false', () => {
    const state = { ...initialOrchestratorState(), undoHistory: [snap()] };
    assert.equal(state.continueBudget.used, false);
    // App would not call consumeContinueAd on granted===false; verify untouched
    assert.equal(canContinueForState(state, acc), true);
  });
});
