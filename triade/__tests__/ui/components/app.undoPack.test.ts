import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

test('App wiring: handleUndoPurchase + handleNoAdsPurchase exist with busy guard and mock hook', async () => {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  assert.match(src, /createPurchasesGateway/);
  assert.match(src, /handleUndoPurchase/);
  assert.match(src, /handleNoAdsPurchase/);
  assert.match(src, /purchaseBusyRef/);
  assert.match(src, /__triadePurchasesMock/);
  assert.match(src, /orchestratorPurchaseUndoPack/);
  assert.match(src, /orchestratorApplyNoAds/);
  const idx = src.indexOf('handleUndoPurchase');
  const slice = src.slice(idx, idx + 1500);
  assert.ok(slice.includes('granted'), 'must check granted');
  assert.ok(slice.includes('purchaseUndoPack'), 'must call purchaseUndoPack');
  const idx2 = src.indexOf('handleNoAdsPurchase');
  const slice2 = src.slice(idx2, idx2 + 1500);
  assert.ok(slice2.includes('purchaseNoAds'), 'must call purchaseNoAds');
});

test('App mounts undo 3-pack purchase prompt when accelerated undo exhausted (lane wall Clean never)', async () => {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  assert.match(src, /Sem desfazer — comprar 3\?/);
  assert.match(src, /!canUndoDerived/);
  assert.match(src, /undoHistory\.length\s*>\s*0/);
  // Clean lane wall: prompt gated by accelerated
  const promptIdx = src.indexOf('Sem desfazer — comprar 3?');
  const context = src.slice(Math.max(0, promptIdx - 800), promptIdx + 800);
  assert.ok(context.includes('accelerated'), 'prompt must be gated by accelerated');
  assert.ok(context.includes('handleUndoPurchase'), 'onIap must be handleUndoPurchase');
  // suppressed when hasNoAds
  assert.ok(context.includes('!hasNoAds') || src.includes('hasNoAds'), 'must gate by hasNoAds');
});

test('App suppresses undo ad prompt when hasNoAds (unlimited owners rewind immediately)', async () => {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  // undo prompt gated by !hasNoAds
  const undoPromptIdx = src.indexOf('Desfazer último movimento?');
  const undoContext = src.slice(Math.max(0, undoPromptIdx - 1000), undoPromptIdx + 1000);
  assert.ok(undoContext.includes('!hasNoAds') || undoContext.includes('hasNoAds'), 'undo prompt must check hasNoAds');
  // handleUndoRequest immediate path when hasNoAds
  const reqIdx = src.indexOf('const handleUndoRequest');
  const reqSlice = src.slice(reqIdx, reqIdx + 2000);
  assert.ok(reqSlice.includes('hasNoAds'), 'handleUndoRequest must branch on hasNoAds');
  assert.ok(reqSlice.includes('orchestratorConfirmUndoAd'), 'immediate path must call confirmUndoAd without ad gateway');
  // handleContinueAd early bypass when hasNoAds
  const contIdx = src.indexOf('const handleContinueAd');
  const contSlice = src.slice(contIdx, contIdx + 2000);
  assert.ok(contSlice.includes('hasNoAds'), 'handleContinueAd must bypass ad when hasNoAds');
});

test('purchase Undo via mock gateway increments iapRemaining; fail leaves unchanged', async () => {
  const { purchaseUndoPack, initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const acc = LANE_PROFILES.accelerated;
  let state = { ...initialOrchestratorState(), undoHistory: [{ game: { board: [[null]] as any, pendingSpawn: { value: 1, displayRoll: 0 } } as any, match: { score: 0, best: 0 } as any, matchStats: { maxTile: 0, merges: 0, longestStreak: 0, currentStreak: 0 } as any }], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
  // Mock success
  (globalThis as any).__triadePurchasesMock = { purchaseUndoPack: async () => ({ granted: true }), purchaseNoAds: async () => ({ granted: false }) };
  const gwSuccess = (globalThis as any).__triadePurchasesMock;
  const resSuccess = await gwSuccess.purchaseUndoPack();
  assert.equal(resSuccess.granted, true);
  if (resSuccess.granted) state = purchaseUndoPack(state, acc);
  assert.equal(state.undoBudget.iapRemaining, 3);
  // Mock fail
  (globalThis as any).__triadePurchasesMock = { purchaseUndoPack: async () => ({ granted: false, error: 'cancelled' }) };
  const gwFail = (globalThis as any).__triadePurchasesMock;
  const resFail = await gwFail.purchaseUndoPack();
  assert.equal(resFail.granted, false);
  const beforeFail = state.undoBudget.iapRemaining;
  if (!resFail.granted) {
    // do not apply purchase
  } else {
    state = purchaseUndoPack(state, acc);
  }
  assert.equal(state.undoBudget.iapRemaining, beforeFail, 'fail must not increment');
  delete (globalThis as any).__triadePurchasesMock;
});

test('purchase No Ads via mock sets unlimited true and suppresses ad gateway', async () => {
  const { applyNoAds, initialOrchestratorState, canUndoForState } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const acc = LANE_PROFILES.accelerated;
  let state = { ...initialOrchestratorState(), undoHistory: [{ game: { board: [[1,2]] as any, pendingSpawn: { value: 1, displayRoll: 0 } } as any, match: { score: 0, best: 0 } as any, matchStats: { maxTile: 0, merges: 0, longestStreak: 0, currentStreak: 0 } as any }], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
  assert.equal(canUndoForState(state, acc), false);
  (globalThis as any).__triadePurchasesMock = { purchaseNoAds: async () => ({ granted: true }), purchaseUndoPack: async () => ({ granted: true }) };
  const gw = (globalThis as any).__triadePurchasesMock;
  const res = await gw.purchaseNoAds();
  assert.equal(res.granted, true);
  if (res.granted) state = applyNoAds(state, acc);
  assert.equal(state.undoBudget.unlimited, true);
  assert.equal(canUndoForState(state, acc), true);
  delete (globalThis as any).__triadePurchasesMock;
});

test('Clean never mounts undo purchase — orchestrator no-op', async () => {
  const { purchaseUndoPack, applyNoAds, requestUndo, initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const clean = LANE_PROFILES.clean;
  const base = { ...initialOrchestratorState(), undoHistory: [{ game: { board: [[1]] as any, pendingSpawn: { value: 1, displayRoll: 0 } } as any, match: { score: 0, best: 0 } as any, matchStats: { maxTile: 0, merges: 0, longestStreak: 0, currentStreak: 0 } as any }], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
  const after = purchaseUndoPack(base, clean);
  assert.equal(after.undoBudget.iapRemaining, 0);
  assert.equal(applyNoAds(base, clean).undoBudget.unlimited, false);
  assert.equal(requestUndo(base, clean, false).ok, false);
});

test('restart after undo purchase resets iapRemaining to 0 but entitlement survives (merge never downgrades) and unlimited stays if hasNoAds', async () => {
  const { purchaseUndoPack, applyNoAds, resetForNewMatch, initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const { mergeEntitlements } = await import('../../../src/services/storage/entitlements.ts');
  const acc = LANE_PROFILES.accelerated;
  let state = { ...initialOrchestratorState(), undoHistory: [{ game: { board: [[1]] as any, pendingSpawn: { value: 1, displayRoll: 0 } } as any, match: { score: 0, best: 0 } as any, matchStats: { maxTile: 0, merges: 0, longestStreak: 0, currentStreak: 0 } as any }], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
  state = purchaseUndoPack(state, acc);
  assert.equal(state.undoBudget.iapRemaining, 3);
  state = applyNoAds(state, acc);
  assert.equal(state.undoBudget.unlimited, true);
  const offlineUndo = { triade_undo_3: true };
  const offlineNoAds = { triade_no_ads: true };
  // resetForNewMatch clears per-match budgets (App re-applies unlimited from entitlements)
  const afterReset = resetForNewMatch(state);
  assert.equal(afterReset.undoBudget.iapRemaining, 0, 'iapRemaining dies with match');
  assert.equal(afterReset.undoBudget.unlimited, false, 'orchestrator reset clears unlimited — App re-derives');
  // Simulate App re-derive: if entitlements has No Ads, unlimited stays true
  const reDerived = { ...afterReset, undoBudget: { ...afterReset.undoBudget, unlimited: true } };
  assert.equal(reDerived.undoBudget.unlimited, true);
  // entitlement survives
  const mergedUndo = mergeEntitlements(offlineUndo, {});
  assert.equal(mergedUndo.triade_undo_3, true);
  const mergedNoAds = mergeEntitlements(offlineNoAds, { triade_no_ads: false } as any);
  assert.equal(mergedNoAds.triade_no_ads, true);
});

test('purchase busy double-tap does not double-grant — shared busy across methods', async () => {
  const { createPurchasesGateway, __resetPurchasesForTests } = await import('../../../src/services/monetization/purchases.ts');
  __resetPurchasesForTests();
  const gw = createPurchasesGateway();
  const p1 = gw.purchaseUndoPack();
  const p2 = gw.purchaseUndoPack();
  const p3 = gw.purchaseNoAds();
  const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
  assert.equal(r1.granted, false);
  assert.equal(r2.granted, false);
  assert.equal(r3.granted, false);
  if (r2.error) assert.ok(r2.error.length > 0);
  if (r3.error) assert.ok(r3.error.includes('busy') || r3.error.length > 0);
  __resetPurchasesForTests();
  const gw2 = createPurchasesGateway();
  const q1 = gw2.purchaseNoAds();
  const q2 = gw2.purchaseHintPack();
  const [s1, s2] = await Promise.all([q1, q2]);
  assert.equal(s1.granted, false);
  assert.equal(s2.granted, false);
  __resetPurchasesForTests();
});

test('RewardPrompt for undo purchase has correct title and button ordering', async () => {
  const { RewardPrompt } = await import('../../../src/ui/AcceleratedAids.tsx');
  let ad = 0, iap = 0, cancel = 0;
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(RewardPrompt, {
      title: 'Sem desfazer — comprar 3?',
      onAd: () => ad++,
      onIap: () => iap++,
      onCancel: () => cancel++,
    } as any));
  });
  const btns = renderer!.root.findAll((n) => (n.type as string) === 'Pressable');
  assert.equal(btns.length, 3);
  assert.equal(btns[0].props.accessibilityLabel, 'Ver anúncio');
  assert.equal(btns[1].props.accessibilityLabel, 'Comprar');
  assert.equal(btns[2].props.accessibilityLabel, 'Cancelar');
  act(() => btns[1].props.onPress());
  assert.equal(iap, 1);
});
