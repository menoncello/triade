/**
 * API Gateway — dw-undo-iap-stub-cleanup (DW-105), GREEN executable contract pins.
 * Level "API" here = entitlement-service contract: purchaseUndoPack / applyNoAds /
 * resetForNewMatch (budget writers) + consumeUndo delegation (sole reader) +
 * App.handleUndoIap wiring. Host node:test + tsx, all ACTIVE.
 * Run (from triade/): TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/undo-iap-stub-cleanup.gateway.spec.ts
 * Complements tests/unit (behavioral pins) with writer/reader contract + source wiring;
 * does not re-execute the same assertions (no duplicate coverage).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  purchaseUndoPack,
  applyNoAds,
  resetForNewMatch,
} from '../../../../triade/src/game/matchOrchestrator.ts';
import {
  acc,
  clean,
  stateWith,
  readOrchestrator,
  readApp,
  countMatches,
} from '../../fixtures/dw-undo-iap-stub-cleanup-fixtures.ts';

// Given accelerated state with zero balance
// When purchaseUndoPack applied
// Then iapRemaining +3, other budget fields and history untouched (writer contract)
test('[P0-API-01] purchaseUndoPack writer contract — +3, history untouched', () => {
  const s = stateWith({ freeUsed: true, iapRemaining: 0, unlimited: false }, 2);
  const after = purchaseUndoPack(s, acc);
  assert.equal(after.undoBudget.iapRemaining, 3);
  assert.equal(after.undoBudget.freeUsed, true);
  assert.equal(after.undoBudget.unlimited, false);
  assert.equal(after.undoHistory.length, 2);
  const cleanAfter = purchaseUndoPack(s, clean);
  assert.deepEqual(cleanAfter, s);
});

// Given accelerated state
// When applyNoAds applied
// Then unlimited:true, idempotent on second call, clean no-op (writer contract)
test('[P1-API-01] applyNoAds writer contract — unlimited grant, idempotent', () => {
  const once = applyNoAds(stateWith({ freeUsed: true, iapRemaining: 0, unlimited: false }, 1), acc);
  assert.equal(once.undoBudget.unlimited, true);
  const twice = applyNoAds(once, acc);
  assert.deepEqual(twice, once);
  const s = stateWith({ freeUsed: true, iapRemaining: 0, unlimited: false }, 1);
  assert.deepEqual(applyNoAds(s, clean), s);
});

// Given dirty state (budget + history + prompt)
// When resetForNewMatch applied
// Then full wipe to initial budget (re-apply baseline for entitlement re-apply)
test('[P1-API-02] resetForNewMatch writer contract — full budget wipe', () => {
  const dirty = { ...stateWith({ freeUsed: true, iapRemaining: 5, unlimited: true }, 2), showUndoPrompt: true };
  const reset = resetForNewMatch(dirty);
  assert.deepEqual(reset.undoBudget, { freeUsed: false, iapRemaining: 0, unlimited: false });
  assert.equal(reset.undoHistory.length, 0);
  assert.equal(reset.showUndoPrompt, false);
});

// Given matchOrchestrator.ts source
// When scanned for the stub
// Then budgetForCheck absent and confirmUndoIap delegates with state.undoBudget directly
test('[P1-API-03] SCAN stub absent — confirmUndoIap strictly delegates to consumeUndo', () => {
  const src = readOrchestrator();
  assert.equal(countMatches(src, /budgetForCheck/g), 0);
  assert.equal(countMatches(src, /iapRemaining: 1/g), 0);
  assert.ok(src.includes('consumeUndo(state.undoBudget, state.undoHistory.length, profile)'));
});

// Given matchOrchestrator.ts source
// When confirmUndoAd and confirmUndoIap bodies compared
// Then both delegate identically (symmetric reader contract, R-002 monitor)
test('[P1-API-04] SCAN Ad/Iap reader symmetry — both call consumeUndo identically', () => {
  const src = readOrchestrator();
  assert.equal(countMatches(src, /consumeUndo\(state\.undoBudget, state\.undoHistory\.length, profile\)/g), 2);
});

// Given App.tsx source
// When handleUndoIap fail-closed branch inspected
// Then on !ok it only closes the prompt and returns (no history/budget/game mutation)
test('[P1-API-05] SCAN App.handleUndoIap fail-closed — deny only closes prompt', () => {
  const src = readApp();
  const idx = src.indexOf('const handleUndoIap');
  assert.ok(idx !== -1, 'handleUndoIap missing');
  const slice = src.slice(idx, idx + 600);
  assert.ok(slice.includes('if (!res.ok || !res.snapshot)'), 'fail-closed guard missing');
  const branch = slice.slice(slice.indexOf('if (!res.ok'), slice.indexOf('if (!res.ok') + 120);
  assert.ok(branch.includes('setShowUndoPrompt(false)'), 'must close prompt');
  assert.ok(!branch.includes('setUndoHistory') && !branch.includes('setUndoBudget'), 'deny must not mutate budget/history');
});
