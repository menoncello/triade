import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialOrchestratorState,
  canHintForState,
  requestHint,
  purchaseHintPack,
  resetForNewMatch,
} from '../../src/game/matchOrchestrator.ts';
import { LANE_PROFILES } from '../../src/game/lanes.ts';
import { canMerge } from '../../src/engine/core/rules.ts';
import { HINT_PACK_SIZE } from '../../src/game/assistance.ts';

const acc = LANE_PROFILES.accelerated;
const clean = LANE_PROFILES.clean;

describe('4.3 hint 5-pack — orchestrator pure pins', () => {
  it('HINT_PACK_SIZE is 5 and pure', () => {
    assert.equal(HINT_PACK_SIZE, 5);
  });

  it('canHint true only when accelerated + remaining>0 + pair exists', () => {
    const boardWithPair: any = [
      [1, 2, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const boardNoPair: any = [
      [1, 1, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const accWithBudget = { ...initialOrchestratorState(), hintBudget: { remaining: 5 } };
    assert.equal(canHintForState(accWithBudget, boardWithPair, acc), true);
    assert.equal(canHintForState({ ...accWithBudget, hintBudget: { remaining: 0 } }, boardWithPair, acc), false);
    assert.equal(canHintForState(accWithBudget, boardNoPair, acc), false);
    assert.equal(canHintForState(accWithBudget, boardWithPair, clean), false);
  });

  it('requestHint consumes 1 and sets highlight to valid canMerge pair, never direction/spawn', () => {
    const board: any = [
      [3, 3, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const pendingSpawnBefore = { value: 99, displayRoll: 0.9 } as any;
    const base = initialOrchestratorState();
    const copyBoard = JSON.parse(JSON.stringify(board));
    const r = requestHint(base, board, acc, false);
    assert.equal(r.ok, true);
    assert.equal(r.state.hintBudget.remaining, 4);
    assert.ok(r.state.hintHighlight !== null);
    assert.ok(r.pair !== undefined);
    const [[r1, c1], [r2, c2]] = r.pair!;
    // adjacency = 1 (Manhattan)
    assert.equal(Math.abs(r1 - r2) + Math.abs(c1 - c2), 1);
    assert.equal(canMerge(board[r1][c1], board[r2][c2]), true);
    // board unchanged
    assert.deepEqual(board, copyBoard);
    // pendingSpawn not exposed in result
    assert.ok(!('pendingSpawn' in (r as any)) || (r as any).pendingSpawn === undefined);
    // highlight equals pair
    assert.deepEqual(r.state.hintHighlight, r.pair);
  });

  it('requestHint no pair → no consumption', () => {
    const boardNoPair: any = [
      [1, 1, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const base = initialOrchestratorState();
    const r = requestHint(base, boardNoPair, acc, false);
    assert.equal(r.ok, false);
    assert.equal(r.state.hintBudget.remaining, 5);
    assert.equal(r.state.hintHighlight, null);
  });

  it('requestHint budget empty → no highlight', () => {
    const board: any = [[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    const base = { ...initialOrchestratorState(), hintBudget: { remaining: 0 } };
    const r = requestHint(base, board, acc, false);
    assert.equal(r.ok, false);
    assert.equal(r.state.hintHighlight, null);
  });

  it('purchaseHintPack increments remaining by 5 only for accelerated, clean no-op', () => {
    const baseAcc = { ...initialOrchestratorState(), hintBudget: { remaining: 0 } };
    const afterAcc = purchaseHintPack(baseAcc, acc);
    assert.equal(afterAcc.hintBudget.remaining, 5);
    assert.equal(afterAcc.hintHighlight, null);
    // does not auto-highlight
    assert.equal(afterAcc.hintHighlight, null);

    const baseClean = { ...initialOrchestratorState(), hintBudget: { remaining: 0 } };
    const afterClean = purchaseHintPack(baseClean, clean);
    assert.equal(afterClean.hintBudget.remaining, 0);
    assert.deepEqual(afterClean, baseClean);
  });

  it('purchaseHintPack additive — from 2 → 7, from 5 → 10 (no cap)', () => {
    const s2 = { ...initialOrchestratorState(), hintBudget: { remaining: 2 } };
    assert.equal(purchaseHintPack(s2, acc).hintBudget.remaining, 7);
    const s5 = { ...initialOrchestratorState(), hintBudget: { remaining: 5 } };
    assert.equal(purchaseHintPack(s5, acc).hintBudget.remaining, 10);
  });

  it('purchaseHintPack does not mutate caller', () => {
    const base = { ...initialOrchestratorState(), hintBudget: { remaining: 3 } };
    const copy = { ...base, hintBudget: { ...base.hintBudget } };
    purchaseHintPack(base, acc);
    assert.deepEqual(base.hintBudget, copy.hintBudget);
  });

  it('busy blocks request but not purchase', () => {
    const board: any = [[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    const base = initialOrchestratorState();
    assert.equal(requestHint(base, board, acc, true).ok, false);
    // purchase should succeed even when busy flag would block hint
    const purchased = purchaseHintPack({ ...base, hintBudget: { remaining: 0 } }, acc);
    assert.equal(purchased.hintBudget.remaining, 5);
  });

  it('resetForNewMatch resets to 5 and clears highlight — purchase hints die with match', () => {
    let state = { ...initialOrchestratorState(), hintBudget: { remaining: 0 } };
    state = purchaseHintPack(state, acc);
    assert.equal(state.hintBudget.remaining, 5);
    // consume one
    const board: any = [[3, 3, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    const r = requestHint(state, board, acc, false);
    assert.equal(r.ok, true);
    state = r.state;
    assert.equal(state.hintBudget.remaining, 4);
    assert.ok(state.hintHighlight !== null);
    const next = resetForNewMatch(state);
    assert.equal(next.hintBudget.remaining, 5);
    assert.equal(next.hintHighlight, null);
  });

  it('second hint after purchase respects budget', () => {
    const board: any = [[1, 2, null, null], [3, 3, null, null], [null, null, null, null], [null, null, null, null]];
    let state = { ...initialOrchestratorState(), hintBudget: { remaining: 0 } };
    state = purchaseHintPack(state, acc);
    assert.equal(state.hintBudget.remaining, 5);
    const r1 = requestHint(state, board, acc, false);
    assert.equal(r1.ok, true);
    assert.equal(r1.state.hintBudget.remaining, 4);
    const r2 = requestHint(r1.state, board, acc, false);
    assert.equal(r2.ok, true);
    assert.equal(r2.state.hintBudget.remaining, 3);
  });

  it('purchaseHintPack never alters board/pendingSpawn/score rules — only hintBudget', () => {
    const board: any = [[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    const snap: any = { game: { board, pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: 42, best: 42 }, matchStats: { maxTile: 6, merges: 2, longestStreak: 1, currentStreak: 1 } };
    const state = { ...initialOrchestratorState(), hintBudget: { remaining: 1 }, undoHistory: [snap] };
    const after = purchaseHintPack(state, acc);
    assert.equal(after.undoHistory[0], snap);
    assert.equal(after.undoHistory.length, 1);
    assert.equal(after.hintHighlight, null);
    assert.equal(after.hintBudget.remaining, 6);
  });

  it('Clean never gets hint even with budget', () => {
    const board: any = [[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    const base = { ...initialOrchestratorState(), hintBudget: { remaining: 5 } };
    assert.equal(requestHint(base, board, clean, false).ok, false);
    assert.equal(purchaseHintPack(base, clean).hintBudget.remaining, 5);
  });
});
