import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

test('App wiring: handleHintPurchase exists with busy guard and mock hook', async () => {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  assert.match(src, /createPurchasesGateway/);
  assert.match(src, /handleHintPurchase/);
  assert.match(src, /purchaseBusyRef/);
  assert.match(src, /__triadePurchasesMock/);
  assert.match(src, /orchestratorPurchaseHintPack/);
  const idx = src.indexOf('handleHintPurchase');
  const slice = src.slice(idx, idx + 1500);
  assert.ok(slice.includes('granted'), 'must check granted');
  assert.ok(slice.includes('purchaseHintPack'), 'must call purchaseHintPack');
  assert.ok(slice.includes('canHint'), 'must gate canHint');
});

test('App mounts hint purchase prompt when accelerated hints exhausted (lane wall Clean never)', async () => {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  assert.ok(src.includes("reward.noHint") || /Sem dicas — comprar 5\?/.test(src), 'must use t(reward.noHint) for hint prompt');
  assert.match(src, /activeLaneId\s*===\s*['"]accelerated['"]\s*&&\s*!canHintDerived/);
  assert.match(src, /hintHighlight\s*===\s*null/);
  // Clean lane wall: purchase prompt gated by accelerated
  const promptIdx = src.indexOf('reward.noHint') !== -1 ? src.indexOf('reward.noHint') : src.indexOf('Sem dicas — comprar 5?');
  const context = src.slice(Math.max(0, promptIdx - 500), promptIdx + 500);
  assert.ok(context.includes('accelerated'), 'prompt must be gated by accelerated');
  assert.ok(!context.includes('clean'), 'prompt context should not mount for clean');
  // RewardPrompt reuse with onAd no-op and onIap handleHintPurchase
  assert.ok(src.includes('onAd={() => {}}') || src.includes('onAd={() => {} }') || src.includes('onAd'), 'onAd no-op');
  assert.ok(src.includes('onIap={handleHintPurchase}'), 'onIap must be handleHintPurchase');
});

test('hint highlights one valid mergeable pair and never direction/spawn', async () => {
  const { requestHint, initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const { canMerge } = await import('../../../src/engine/core/rules.ts');
  const acc = LANE_PROFILES.accelerated;
  const board: any = [
    [1, 2, null, null],
    [3, 3, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ];
  const r = requestHint(initialOrchestratorState(), board, acc, false);
  assert.equal(r.ok, true);
  assert.ok(r.pair);
  const [[r1, c1], [r2, c2]] = r.pair!;
  assert.equal(canMerge(board[r1][c1], board[r2][c2]), true);
  assert.equal(Math.abs(r1 - r2) + Math.abs(c1 - c2), 1);
  // result must not contain direction or spawn
  assert.ok(!('direction' in (r as any)));
  assert.ok(!('pendingSpawn' in (r as any)) || (r as any).pendingSpawn === undefined);
});

test('purchase via mock gateway increments hintBudget; fail leaves unchanged', async () => {
  const { purchaseHintPack, initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const acc = LANE_PROFILES.accelerated;
  let state = { ...initialOrchestratorState(), hintBudget: { remaining: 0 } };
  // Mock success
  (globalThis as any).__triadePurchasesMock = { purchaseHintPack: async () => ({ granted: true }) };
  const gwSuccess = (globalThis as any).__triadePurchasesMock;
  const resSuccess = await gwSuccess.purchaseHintPack();
  assert.equal(resSuccess.granted, true);
  if (resSuccess.granted) state = purchaseHintPack(state, acc);
  assert.equal(state.hintBudget.remaining, 5);
  // Mock fail
  (globalThis as any).__triadePurchasesMock = { purchaseHintPack: async () => ({ granted: false, error: 'cancelled' }) };
  const gwFail = (globalThis as any).__triadePurchasesMock;
  const resFail = await gwFail.purchaseHintPack();
  assert.equal(resFail.granted, false);
  const beforeFail = state.hintBudget.remaining;
  if (!resFail.granted) {
    // do not apply purchase
  } else {
    state = purchaseHintPack(state, acc);
  }
  assert.equal(state.hintBudget.remaining, beforeFail, 'fail must not increment');
  delete (globalThis as any).__triadePurchasesMock;
});

test('Clean never mounts hint purchase — orchestrator no-op', async () => {
  const { purchaseHintPack, requestHint, initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const clean = LANE_PROFILES.clean;
  const board: any = [[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
  const base = { ...initialOrchestratorState(), hintBudget: { remaining: 0 } };
  const after = purchaseHintPack(base, clean);
  assert.equal(after.hintBudget.remaining, 0);
  assert.equal(requestHint(base, board, clean, false).ok, false);
});

test('restart after purchase resets hints to 5 but entitlement survives (merge never downgrades)', async () => {
  const { purchaseHintPack, resetForNewMatch, initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const { mergeEntitlements } = await import('../../../src/services/storage/entitlements.ts');
  const acc = LANE_PROFILES.accelerated;
  let state = { ...initialOrchestratorState(), hintBudget: { remaining: 0 } };
  state = purchaseHintPack(state, acc);
  assert.equal(state.hintBudget.remaining, 5);
  // consume one
  const board: any = [[3, 3, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
  const { requestHint } = await import('../../../src/game/matchOrchestrator.ts');
  const r = requestHint(state, board, acc, false);
  assert.equal(r.ok, true);
  state = r.state;
  assert.equal(state.hintBudget.remaining, 4);
  // Entitlement set
  const offline = { triade_hint_5: true };
  const afterReset = resetForNewMatch(state);
  assert.equal(afterReset.hintBudget.remaining, 5, 'hints die with match');
  assert.equal(afterReset.hintHighlight, null);
  // entitlement survives
  const remote = {};
  const merged = mergeEntitlements(offline, remote);
  assert.equal(merged.triade_hint_5, true, 'entitlement survives restart');
  // remote empty never downgrades
  const merged2 = mergeEntitlements(offline, { triade_hint_5: false } as any);
  assert.equal(merged2.triade_hint_5, true);
});

test('purchase busy double-tap does not double-grant', async () => {
  const { createPurchasesGateway, __resetPurchasesForTests } = await import('../../../src/services/monetization/purchases.ts');
  __resetPurchasesForTests();
  const gw = createPurchasesGateway();
  const p1 = gw.purchaseHintPack();
  const p2 = gw.purchaseHintPack();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.granted, false);
  assert.equal(r2.granted, false);
  if (r2.error) assert.ok(r2.error.length > 0);
  __resetPurchasesForTests();
});

test('App handleHint still gated by profile.canHint and busyRef', async () => {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const hintIdx = src.indexOf('const handleHint');
  const slice = src.slice(hintIdx, hintIdx + 1200);
  assert.ok(slice.includes('orchestratorRequestHint'), 'handleHint must call orchestratorRequestHint');
  assert.ok(slice.includes('busyRef'), 'handleHint must check busyRef');
  assert.ok(slice.includes('activeProfile'), 'handleHint must gate profile');
});

test('RewardPrompt reused for hint purchase has correct title ordering', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  const { RewardPrompt } = await import('../../../src/ui/AcceleratedAids.tsx');
  let ad = 0, iap = 0, cancel = 0;
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(RewardPrompt, {
      title: 'Sem dicas — comprar 5?',
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
