/**
 * E2E Umbrella — dw-undo-iap-stub-cleanup (DW-105), GREEN executable journey pins.
 * Level "E2E" here = end-to-end user journeys through the undo seam, exercised as
 * host node:test static + behavioral wrappers (RN Expo 57 — no browser harness).
 * All ACTIVE. Run (from triade/):
 * TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/e2e/undo-iap-stub-cleanup.umbrella.spec.ts
 * Complements tests/unit (single-call pins) and tests/api (writer contracts) with
 * multi-step journey coverage; asserts outcomes, not intermediate re-pins.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmUndoIap,
  purchaseUndoPack,
  applyNoAds,
  resetForNewMatch,
} from '../../../../triade/src/game/matchOrchestrator.ts';
import {
  acc,
  stateWith,
  readLedger,
  readPinTest,
} from '../../fixtures/dw-undo-iap-stub-cleanup-fixtures.ts';
import { execSync } from 'node:child_process';

// Journey: free undo consumed in match 1 → second undo requested with no purchase
// Then confirmUndoIap denies (prompt closes, history kept) — the monetization gate
test('[P0-UMB-01] journey second-undo-blocked — no phantom grant end to end', () => {
  let s = stateWith({ freeUsed: false, iapRemaining: 0, unlimited: false }, 0);
  const first = confirmUndoIap({ ...s, undoHistory: [{} as any] }, acc);
  assert.equal(first.ok, true, 'free undo must still work');
  s = first.state;
  const second = confirmUndoIap({ ...s, undoHistory: [{} as any] }, acc);
  assert.equal(second.ok, false, 'second undo without purchase must block');
  assert.equal(second.state.undoBudget.iapRemaining, 0);
  assert.equal(second.state.undoHistory.length, 1);
});

// Journey: user buys undo pack → second undo succeeds → new match resets → re-apply
// Then purchase path works, reset wipes, post-reset deny holds (R-005 exposure pinned)
test('[P0-UMB-02] journey purchase-then-reset — grant, consume, wipe, deny', () => {
  let s = purchaseUndoPack(stateWith({ freeUsed: true, iapRemaining: 0, unlimited: false }, 0), acc);
  assert.equal(s.undoBudget.iapRemaining, 3);
  s = { ...s, undoHistory: [{} as any] };
  const used = confirmUndoIap(s, acc);
  assert.equal(used.ok, true);
  assert.equal(used.state.undoBudget.iapRemaining, 2);
  const fresh = resetForNewMatch(used.state);
  assert.deepEqual(fresh.undoBudget, { freeUsed: false, iapRemaining: 0, unlimited: false });
  const postReset = confirmUndoIap({ ...fresh, undoHistory: [{} as any] }, acc);
  assert.equal(postReset.ok, true, 'fresh match free undo available after reset');
  const postFree = confirmUndoIap({ ...postReset.state, undoHistory: [{} as any] }, acc);
  assert.equal(postFree.ok, false, 'second undo post-reset without re-apply must block');
});

// Journey: no-ads entitlement → unlimited undos across matches
test('[P1-UMB-01] journey no-ads unlimited — repeated confirms never exhaust', () => {
  let s = applyNoAds(stateWith({ freeUsed: true, iapRemaining: 0, unlimited: false }, 0), acc);
  s = { ...s, undoHistory: [{} as any, {} as any] };
  for (let i = 0; i < 2; i++) {
    const r = confirmUndoIap(s, acc);
    assert.equal(r.ok, true);
    s = r.state;
  }
  assert.equal(s.undoBudget.unlimited, true);
});

// Ledger: DW-105 closed by this bundle with undo hash; exactly one hunk touched
test('[P2-UMB-01] ledger DW-105 done with resolution-undo marker', () => {
  const ledger = readLedger();
  const idx = ledger.indexOf('DW-105');
  assert.ok(idx !== -1, 'DW-105 entry missing');
  const slice = ledger.slice(idx, idx + 600);
  assert.ok(slice.includes('status: done'), 'DW-105 must be done');
  assert.ok(slice.includes('dw-undo-iap-stub-cleanup'), 'must reference sweep bundle');
  assert.ok(slice.includes('resolution-undo'), 'must carry undo hash');
});

// Hygiene: repo pin flipped to deny AND orchestrator-owned sprint-status untouched
test('[P2-UMB-02] pin flipped + sprint-status.yaml untouched (orchestrator-owned)', () => {
  const pin = readPinTest();
  assert.ok(pin.includes('confirmUndoIap respects budget'), 'pin must carry new deny name');
  assert.ok(pin.includes('assert.equal(r.ok, false)'), 'pin must assert deny');
  const stat = execSync('git diff HEAD --stat -- _bmad-output/implementation-artifacts/sprint-status.yaml', { encoding: 'utf8' });
  assert.equal(stat.trim(), '', 'sprint-status.yaml must stay untouched');
});
