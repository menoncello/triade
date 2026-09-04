/**
 * Unit — dw-undo-iap-stub-cleanup (DW-105), GREEN executable regression pins.
 * Host node:test + tsx. All tests ACTIVE (implementation is in the working tree).
 * Relationship to ATDD red scaffolds
 * (_bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts,
 * 13x test.skip): those assert the pre/post-fix contract for TDD activation;
 * these assert the post-fix behavior as permanent regression coverage.
 * No overlap in execution (skipped vs active, different files).
 * Run (from triade/): TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/unit/undo-iap-stub-cleanup.atdd.test.ts
 * Delta: triade/src/game/matchOrchestrator.ts:99-103 stub removed;
 *        triade/__tests__/game/matchOrchestrator.test.ts:120-128 pin flipped to deny.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmUndoIap,
  confirmUndoAd,
  canUndoForState,
  purchaseUndoPack,
  applyNoAds,
  resetForNewMatch,
} from '../../../../triade/src/game/matchOrchestrator.ts';
import {
  acc,
  clean,
  snap,
  stateWith,
  deniedState,
  BUDGETS,
} from '../../fixtures/dw-undo-iap-stub-cleanup-fixtures.ts';

// Given denied budget {freeUsed:true, iapRemaining:0, unlimited:false} + 1 snapshot
// When confirmUndoIap(accelerated)
// Then ok:false, budget deep-unchanged, history retained, prompt closed, no snapshot
test('[P0] confirmUndoIap denies when freeUsed and no remaining without purchase', () => {
  const state = deniedState();
  const r = confirmUndoIap(state, acc);
  assert.equal(r.ok, false);
  assert.deepEqual(r.state.undoBudget, { ...BUDGETS.denied });
  assert.equal(r.state.undoHistory.length, 1);
  assert.equal(r.state.showUndoPrompt, false);
  assert.equal(r.snapshot, undefined);
});

// Given denied input
// When confirmUndoIap denies
// Then iapRemaining stays exactly 0 and the input object is not mutated
test('[P0] no phantom persistence — deny never fabricates iapRemaining', () => {
  const state = deniedState();
  const before = structuredClone(state);
  const r = confirmUndoIap(state, acc);
  assert.equal(r.state.undoBudget.iapRemaining, 0);
  assert.deepEqual(state, before);
});

// Given purchaseUndoPack grant (0→3) + 3 snapshots
// When confirmUndoIap x4
// Then 3→2→1→0 with history rewind, 4th denies (legitimate path survives cleanup)
test('[P0] purchase→consume chain — 3 packs allow exactly 3 undos, 4th denied', () => {
  let s = stateWith({ freeUsed: true, iapRemaining: 0, unlimited: false }, 0);
  s = purchaseUndoPack(s, acc);
  assert.equal(s.undoBudget.iapRemaining, 3);
  s = { ...s, undoHistory: [snap(), snap(), snap()] };
  for (const expected of [2, 1, 0]) {
    const r = confirmUndoIap(s, acc);
    assert.equal(r.ok, true);
    assert.equal(r.state.undoBudget.iapRemaining, expected);
    s = r.state;
  }
  assert.equal(s.undoHistory.length, 0);
  const denied = confirmUndoIap(s, acc);
  assert.equal(denied.ok, false);
});

// Given 4 budget/history/profile combos
// When canUndoForState vs confirmUndoIap compared
// Then they agree (gate parity — confirm strictly obeys consumeUndo)
test('[P0] canUndo gate parity — gate false ⇔ confirm denies', () => {
  const rows = [
    { budget: { ...BUDGETS.denied }, hist: 1, profile: acc, expect: false },
    { budget: { ...BUDGETS.withPack }, hist: 1, profile: acc, expect: true },
    { budget: { ...BUDGETS.unlimited }, hist: 1, profile: acc, expect: true },
    { budget: { ...BUDGETS.withPack }, hist: 1, profile: clean, expect: false },
  ] as const;
  for (const row of rows) {
    const s = stateWith({ ...row.budget }, row.hist);
    assert.equal(canUndoForState(s, row.profile), row.expect, `gate ${JSON.stringify(row.budget)}`);
    assert.equal(confirmUndoIap(s, row.profile).ok, row.expect, `confirm ${JSON.stringify(row.budget)}`);
  }
});

// Given identical (budget, historyLen, profile) inputs
// When confirmUndoAd vs confirmUndoIap compared over free/iap/unlimited/deny rows
// Then ok agrees on every row (bodies symmetric post-cleanup; catches one-sided drift)
test('[P1] Ad/Iap symmetry — same input yields same ok on both paths', () => {
  const rows = [
    { freeUsed: false, iapRemaining: 0, unlimited: false },
    { freeUsed: true, iapRemaining: 2, unlimited: false },
    { freeUsed: true, iapRemaining: 0, unlimited: true },
    { freeUsed: true, iapRemaining: 0, unlimited: false },
  ] as const;
  for (const b of rows) {
    const s = stateWith({ ...b }, 1);
    assert.equal(
      confirmUndoAd(s, acc).ok,
      confirmUndoIap(s, acc).ok,
      `symmetry ${JSON.stringify(b)}`,
    );
  }
});

// Given unlimited budget + history
// When confirmUndoIap x3
// Then always ok:true with iapRemaining untouched at 0
test('[P1] unlimited path — repeated Iap confirms never decrement', () => {
  let s = stateWith({ ...BUDGETS.unlimited }, 3);
  for (let i = 0; i < 3; i++) {
    const r = confirmUndoIap(s, acc);
    assert.equal(r.ok, true);
    assert.equal(r.state.undoBudget.iapRemaining, 0);
    s = r.state;
  }
});

// Given clean profile
// When confirmUndoIap with purchased balance
// Then denies without mutation (consumeUndo gates on profile first)
test('[P1] clean lane no-op — Iap confirm denies even with balance', () => {
  const s = stateWith({ ...BUDGETS.withPack }, 1);
  const r = confirmUndoIap(s, clean);
  assert.equal(r.ok, false);
  assert.deepEqual(r.state.undoBudget, { ...BUDGETS.withPack });
  assert.equal(r.state.undoHistory.length, 1);
});

// Given empty history + purchased balance + accelerated profile
// When confirmUndoIap
// Then denies (historyLen gate + snap guard)
test('[P2] empty-history guard — denies even with iapRemaining>0', () => {
  const s = stateWith({ ...BUDGETS.withPack }, 0);
  const r = confirmUndoIap(s, acc);
  assert.equal(r.ok, false);
  assert.equal(r.state.undoBudget.iapRemaining, 3);
});

// Given fresh state then purchase/reset flows
// When purchaseUndoPack at 997 / resetForNewMatch applied
// Then cap 999 holds and reset wipes to initial budget (re-apply baseline)
test('[P2] cap 999 + resetForNewMatch baseline', () => {
  const capped = purchaseUndoPack(stateWith({ freeUsed: true, iapRemaining: 997, unlimited: false }, 0), acc);
  assert.equal(capped.undoBudget.iapRemaining, 999);
  const over = purchaseUndoPack(stateWith({ freeUsed: true, iapRemaining: 999, unlimited: false }, 0), acc);
  assert.equal(over.undoBudget.iapRemaining, 999);
  const reset = resetForNewMatch(stateWith({ freeUsed: true, iapRemaining: 5, unlimited: true }, 2));
  assert.deepEqual(reset.undoBudget, { freeUsed: false, iapRemaining: 0, unlimited: false });
  assert.equal(reset.undoHistory.length, 0);
});

// Given applyNoAds on accelerated state
// When then confirmUndoIap
// Then unlimited grant enables Iap path (entitlement wiring intact post-cleanup)
test('[P2] applyNoAds enables Iap path — unlimited grant respected', () => {
  const granted = applyNoAds(stateWith({ ...BUDGETS.denied }, 0), acc);
  assert.equal(granted.undoBudget.unlimited, true);
  const s = { ...granted, undoHistory: [snap()] };
  const r = confirmUndoIap(s, acc);
  assert.equal(r.ok, true);
});
