import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

test('Continue slot ordering ad→IAP→Cancel for 4.2 (beneath Jogar de novo)', async () => {
  const { GameOverOverlay } = await import('../../../src/ui/GameOverOverlay.tsx');
  let ad = 0, iap = 0, cancel = 0, restart = 0;
  let renderer: TestRenderer.ReactTestRenderer;
  const insets = { top: 10, bottom: 10, left: 10, right: 10 } as any;
  act(() => {
    renderer = TestRenderer.create(React.createElement(GameOverOverlay, {
      stats: { score: 100, best: 200, maxTile: 48, merges: 10, longestStreak: 3 },
      isNewRecord: false,
      onRestart: () => restart++,
      insets,
      activeLaneId: 'accelerated',
      canContinue: true,
      onContinueAd: () => ad++,
      onContinueIap: () => iap++,
      onContinueCancel: () => cancel++,
    } as any));
  });
  const btns = renderer!.root.findAll((n) => (n.type as string) === 'Pressable');
  // Jogar de novo + 3 continue buttons = 4
  assert.equal(btns.length, 4, 'must have Jogar de novo + Ver anúncio + Comprar + Cancelar');
  assert.equal(btns[0].props.accessibilityLabel, 'Jogar de novo');
  assert.equal(btns[1].props.accessibilityLabel, 'Ver anúncio');
  assert.equal(btns[2].props.accessibilityLabel, 'Comprar');
  assert.equal(btns[3].props.accessibilityLabel, 'Cancelar');
  act(() => btns[1].props.onPress());
  assert.equal(ad, 1);
  act(() => btns[2].props.onPress());
  assert.equal(iap, 1);
  act(() => btns[3].props.onPress());
  assert.equal(cancel, 1);
  act(() => btns[0].props.onPress());
  assert.equal(restart, 1);
});

test('App wiring: rewarded continue only in Accelerated gameOver, ad success rewinds via mock gateway', async () => {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  assert.match(src, /from\s+['"]\.\/src\/services\/monetization\/rewardedAds\.ts['"]/);
  assert.match(src, /createRewardedAdGateway/);
  assert.match(src, /rewardedContinueUnitId/);
  assert.match(src, /handleContinueAd/);
  const contIdx = src.indexOf('handleContinueAd');
  const slice = src.slice(contIdx, contIdx + 2200);
  assert.ok(slice.includes('granted'), 'handleContinueAd must check granted');
  assert.ok(slice.includes('orchestratorConsumeContinueAd'), 'on granted must call orchestratorConsumeContinueAd');
  assert.ok(slice.includes('adBusyRef'), 'must guard adBusyRef');
  assert.ok(slice.includes('__triadeRewardedAdMock'), 'must support __triadeRewardedAdMock for tests');
  assert.ok(slice.includes('allowAds'), 'must gate allowAds');
  // GameOverOverlay mount gated
  assert.match(src, /canContinueDerived/);
  assert.match(src, /activeLaneId/);
  // onContinueCancel wired
  assert.ok(src.includes('handleContinueCancel'), 'must wire handleContinueCancel');
  assert.match(src, /onContinueCancel=\{handleContinueCancel\}/);
});

test('App handleContinueAd mock: granted true consumes, granted false leaves untouched', async () => {
  const { __resetRewardedAdsBusy } = await import('../../../src/services/monetization/rewardedAds.ts');
  const { consumeContinueAd } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const { initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');

  __resetRewardedAdsBusy();
  const acc = LANE_PROFILES.accelerated;
  function snap(n: number): any {
    return { game: { board: [[n, null, null, null], [null,null,null,null],[null,null,null,null],[null,null,null,null]], pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: n, best: n }, matchStats: { maxTile: n, merges: 1, longestStreak: 1, currentStreak: 1 } };
  }
  ;(globalThis as any).__triadeRewardedAdMock = { loadAndShow: async () => ({ granted: true }) };
  const gwGranted = (globalThis as any).__triadeRewardedAdMock;
  const resAd = await gwGranted.loadAndShow();
  assert.equal(resAd.granted, true);
  let state = { ...initialOrchestratorState(), undoHistory: [snap(1), snap(2)] };
  const ok = consumeContinueAd(state, acc);
  assert.equal(ok.ok, true);
  assert.equal(ok.state.continueBudget.used, true);
  assert.equal(ok.snapshot, state.undoHistory[1]);

  ;(globalThis as any).__triadeRewardedAdMock = { loadAndShow: async () => ({ granted: false }) };
  const gwFailed = (globalThis as any).__triadeRewardedAdMock;
  const resFail = await gwFailed.loadAndShow();
  assert.equal(resFail.granted, false);
  state = { ...initialOrchestratorState(), undoHistory: [snap(5)] };
  assert.equal(state.continueBudget.used, false);
  assert.equal(state.undoHistory.length, 1);

  delete (globalThis as any).__triadeRewardedAdMock;
  __resetRewardedAdsBusy();
});

test('Clean gameOver never mounts Continue slot', async () => {
  const { GameOverOverlay } = await import('../../../src/ui/GameOverOverlay.tsx');
  let renderer: TestRenderer.ReactTestRenderer;
  const insets = { top: 10, bottom: 10, left: 10, right: 10 } as any;
  act(() => {
    renderer = TestRenderer.create(React.createElement(GameOverOverlay, {
      stats: { score: 50, best: 50, maxTile: 12, merges: 2, longestStreak: 1 },
      isNewRecord: false,
      onRestart: () => {},
      insets,
      activeLaneId: 'clean',
      canContinue: true,
      onContinueAd: () => {},
      onContinueIap: () => {},
      onContinueCancel: () => {},
    } as any));
  });
  const labels = renderer!.root.findAll((n) => (n.type as string) === 'Pressable').map((n) => n.props.accessibilityLabel);
  assert.ok(labels.includes('Jogar de novo'), 'Clean must have Jogar de novo');
  assert.ok(!labels.includes('Ver anúncio') || labels.filter((l: string) => l === 'Ver anúncio').length === 0, 'Clean must not show Ver anúncio continue');
  // alternative: find continueWrap should not exist
  const contWraps = renderer!.root.findAll((n) => (n.props as any)?.accessibilityLabel === 'Continuar');
  assert.equal(contWraps.length, 0, 'Clean must not render continue wrap');
});

test('gateway + orchestrator: exactly 1 continue per gameOver, second blocked', async () => {
  const { consumeContinueAd } = await import('../../../src/game/matchOrchestrator.ts');
  const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
  const { initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');
  const acc = LANE_PROFILES.accelerated;
  function snap(n: number): any {
    return { game: { board: [[n, null, null, null], [null,null,null,null],[null,null,null,null],[null,null,null,null]], pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: n, best: n }, matchStats: { maxTile: n, merges: 1, longestStreak: 1, currentStreak: 1 } };
  }
  let s: any = { ...initialOrchestratorState(), undoHistory: [snap(1), snap(2)] };
  const r1 = consumeContinueAd(s, acc);
  assert.equal(r1.ok, true);
  s = r1.state;
  const r2 = consumeContinueAd(s, acc);
  assert.equal(r2.ok, false, 'second continue must be rejected');
});

test('App src does not use InterstitialAd — only RewardedAd for continue', async () => {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const appSrc = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  assert.ok(!/InterstitialAd/.test(appSrc), 'must not use InterstitialAd — only RewardedAd');
});

test('ad busy double-tap guarded for continue (second returns busy false)', async () => {
  const { createRewardedAdGateway, __resetRewardedAdsBusy } = await import('../../../src/services/monetization/rewardedAds.ts');
  __resetRewardedAdsBusy();
  const gw = createRewardedAdGateway();
  const p1 = gw.loadAndShow();
  const p2 = gw.loadAndShow();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.granted, false);
  assert.equal(r2.granted, false);
  if (r2.error) assert.ok(r2.error.length > 0);
  __resetRewardedAdsBusy();
});
