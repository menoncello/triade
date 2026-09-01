import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialOrchestratorState,
  purchaseUndoPack,
  applyNoAds,
  resetForNewMatch,
  confirmUndoAd,
  confirmUndoIap,
  requestUndo,
  canUndoForState,
} from '../../src/game/matchOrchestrator.ts';
import { LANE_PROFILES } from '../../src/game/lanes.ts';
import { UNDO_PACK_SIZE } from '../../src/game/assistance.ts';

const acc = LANE_PROFILES.accelerated;
const clean = LANE_PROFILES.clean;

function snap(): any {
  return {
    game: { board: [[1,2,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]], pendingSpawn: { value: 1, displayRoll: 0.1 } },
    match: { score: 10, best: 10 },
    matchStats: { maxTile: 3, merges: 1, longestStreak: 1, currentStreak: 1 },
  };
}

describe('4.4 undo 3-pack + no ads — orchestrator pure pins', () => {
  it('UNDO_PACK_SIZE is 3 and pure', () => {
    assert.equal(UNDO_PACK_SIZE, 3);
  });

  it('canUndo false when freeUsed true and iapRemaining 0 and not unlimited, true with iapRemaining 3', () => {
    const base = { ...initialOrchestratorState(), undoHistory: [snap()] };
    const noIap = { ...base, undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    assert.equal(canUndoForState(noIap, acc), false);
    const withIap = { ...base, undoBudget: { freeUsed: true, iapRemaining: 3, unlimited: false } };
    assert.equal(canUndoForState(withIap, acc), true);
    // unlimited true always true (if history)
    const unlimited = { ...base, undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: true } };
    assert.equal(canUndoForState(unlimited, acc), true);
    // clean never
    assert.equal(canUndoForState(withIap, clean), false);
  });

  it('purchaseUndoPack increments iapRemaining by 3 only for accelerated, clean no-op', () => {
    const baseAcc = { ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    const afterAcc = purchaseUndoPack(baseAcc, acc);
    assert.equal(afterAcc.undoBudget.iapRemaining, 3);
    assert.equal(afterAcc.undoBudget.freeUsed, true);
    assert.equal(afterAcc.undoBudget.unlimited, false);
    assert.equal(afterAcc.undoHistory.length, 0);

    const baseClean = { ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    const afterClean = purchaseUndoPack(baseClean, clean);
    assert.deepEqual(afterClean, baseClean);
  });

  it('purchaseUndoPack additive — from 0→3, 1→4, 997→999 cap', () => {
    assert.equal(purchaseUndoPack({ ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } }, acc).undoBudget.iapRemaining, 3);
    assert.equal(purchaseUndoPack({ ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 1, unlimited: false } }, acc).undoBudget.iapRemaining, 4);
    const nearCap = { ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 997, unlimited: false } };
    assert.equal(purchaseUndoPack(nearCap, acc).undoBudget.iapRemaining, 999);
    const atCap = { ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 999, unlimited: false } };
    assert.equal(purchaseUndoPack(atCap, acc).undoBudget.iapRemaining, 999);
  });

  it('purchaseUndoPack does not mutate caller', () => {
    const base = { ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 5, unlimited: false } };
    const copy = JSON.parse(JSON.stringify(base));
    purchaseUndoPack(base, acc);
    assert.deepEqual(base, copy);
  });

  it('applyNoAds sets unlimited true only for accelerated, clean no-op', () => {
    const baseAcc = { ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    const afterAcc = applyNoAds(baseAcc, acc);
    assert.equal(afterAcc.undoBudget.unlimited, true);
    assert.equal(afterAcc.undoBudget.iapRemaining, 0);

    const baseClean = { ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    const afterClean = applyNoAds(baseClean, clean);
    assert.deepEqual(afterClean, baseClean);
    assert.equal(afterClean.undoBudget.unlimited, false);

    // idempotent
    const already = { ...initialOrchestratorState(), undoBudget: { freeUsed: false, iapRemaining: 0, unlimited: true } };
    assert.equal(applyNoAds(already, acc).undoBudget.unlimited, true);
  });

  it('consume after purchaseUndoPack decrements iapRemaining and rewinds', () => {
    let state = { ...initialOrchestratorState(), undoHistory: [snap(), snap()], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    assert.equal(canUndoForState(state, acc), false);
    state = purchaseUndoPack(state, acc);
    assert.equal(state.undoBudget.iapRemaining, 3);
    assert.equal(canUndoForState(state, acc), true);
    // first consume via IAP path (simulates real purchase consumption)
    const r1 = confirmUndoIap(state, acc);
    assert.equal(r1.ok, true);
    assert.equal(r1.state.undoBudget.iapRemaining, 2);
    assert.equal(r1.state.undoHistory.length, 1);
    const r2 = confirmUndoAd(r1.state, acc);
    assert.equal(r2.ok, true);
    assert.equal(r2.state.undoBudget.iapRemaining, 1);
  });

  it('unlimited undo consumes without decrementing iapRemaining', () => {
    let state = { ...initialOrchestratorState(), undoHistory: [snap(), snap()], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    state = applyNoAds(state, acc);
    assert.equal(state.undoBudget.unlimited, true);
    const r1 = confirmUndoAd(state, acc);
    assert.equal(r1.ok, true);
    assert.equal(r1.state.undoBudget.unlimited, true);
    assert.equal(r1.state.undoBudget.iapRemaining, 0);
    const r2 = confirmUndoAd(r1.state, acc);
    assert.equal(r2.ok, true);
    assert.equal(r2.state.undoBudget.unlimited, true);
  });

  it('busy blocks request but not purchase', () => {
    const base = { ...initialOrchestratorState(), undoHistory: [snap()], undoBudget: { freeUsed: false, iapRemaining: 0, unlimited: false } };
    assert.equal(requestUndo(base, acc, true).ok, false);
    const purchased = purchaseUndoPack({ ...base, undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } }, acc);
    assert.equal(purchased.undoBudget.iapRemaining, 3);
    const noAds = applyNoAds(base, acc);
    assert.equal(noAds.undoBudget.unlimited, true);
  });

  it('resetForNewMatch resets to freeUsed:false,iapRemaining:0,unlimited:false — App re-applies from entitlements', () => {
    let state = { ...initialOrchestratorState(), undoHistory: [snap()], undoBudget: { freeUsed: true, iapRemaining: 3, unlimited: true } };
    const next = resetForNewMatch(state);
    assert.deepEqual(next.undoBudget, { freeUsed: false, iapRemaining: 0, unlimited: false });
    assert.equal(next.undoHistory.length, 0);
  });

  it('second undo after purchase respects budget — 3 purchases allow 3 undos', () => {
    let state = { ...initialOrchestratorState(), undoHistory: [snap(), snap(), snap(), snap()], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    state = purchaseUndoPack(state, acc);
    assert.equal(state.undoBudget.iapRemaining, 3);
    const r1 = confirmUndoAd(state, acc);
    assert.equal(r1.ok, true);
    assert.equal(r1.state.undoBudget.iapRemaining, 2);
    const r2 = confirmUndoAd(r1.state, acc);
    assert.equal(r2.ok, true);
    assert.equal(r2.state.undoBudget.iapRemaining, 1);
    const r3 = confirmUndoAd(r2.state, acc);
    assert.equal(r3.ok, true);
    assert.equal(r3.state.undoBudget.iapRemaining, 0);
    // fourth should fail (no budget left, freeUsed still true)
    assert.equal(canUndoForState(r3.state, acc), false);
  });

  it('purchase undo never alters board/pendingSpawn/score rules — only budget', () => {
    const board: any = [[1,2,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]];
    const snapObj: any = { game: { board, pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: 42, best: 42 }, matchStats: { maxTile: 6, merges: 2, longestStreak: 1, currentStreak: 1 } };
    const state = { ...initialOrchestratorState(), undoHistory: [snapObj], hintHighlight: null as any };
    const after = purchaseUndoPack(state, acc);
    assert.equal(after.undoHistory[0], snapObj);
    assert.equal(after.undoHistory.length, 1);
    assert.equal(after.hintHighlight, null);
  });

  it('Clean never gets undo even with purchase', () => {
    const base = { ...initialOrchestratorState(), undoHistory: [snap()], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    assert.equal(purchaseUndoPack(base, clean).undoBudget.iapRemaining, 0);
    assert.equal(applyNoAds(base, clean).undoBudget.unlimited, false);
    assert.equal(requestUndo(base, clean, false).ok, false);
  });
});
