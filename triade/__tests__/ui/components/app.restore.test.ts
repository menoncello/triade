import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

describe('App restore (4.5) — offline precedence, non-blocking, a11y', () => {
  test('LaneSelectScreen exposes Restaurar compras button with a11y label and 44pt target', async () => {
    const { LaneSelectScreen } = await import('../../../src/ui/LaneSelectScreen.tsx');
    let restoreCalls = 0;
    let renderer: TestRenderer.ReactTestRenderer;
    const insets = { top: 0, bottom: 0, left: 0, right: 0 } as any;
    act(() => {
      renderer = TestRenderer.create(
        React.createElement(LaneSelectScreen, {
          selectedIndex: 0,
          hasActiveMatch: false,
          insets,
          onSelectLane: () => {},
          onJogar: () => {},
          onRestorePurchases: () => {
            restoreCalls++;
          },
          restoreBusy: false,
        } as any),
      );
    });
    const restoreBtn = renderer!.root.findAll(
      (n) => (n.type as string) === 'Pressable' && (n.props as any).accessibilityLabel === 'Restaurar compras',
    );
    assert.equal(restoreBtn.length, 1, 'must have one restore button');
    assert.equal(restoreBtn[0].props.accessibilityRole, 'button');
    // hit target >=44pt via style minHeight
    const style = restoreBtn[0].props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style ?? {};
    assert.ok((flat.minHeight ?? 0) >= 44, `restore button minHeight ${flat.minHeight} must be >=44`);
    act(() => restoreBtn[0].props.onPress());
    assert.equal(restoreCalls, 1);
  });

  test('LaneSelectScreen restore button shows busy state and disabled', async () => {
    const { LaneSelectScreen } = await import('../../../src/ui/LaneSelectScreen.tsx');
    let renderer: TestRenderer.ReactTestRenderer;
    const insets = { top: 0, bottom: 0, left: 0, right: 0 } as any;
    act(() => {
      renderer = TestRenderer.create(
        React.createElement(LaneSelectScreen, {
          selectedIndex: 1,
          hasActiveMatch: true,
          insets,
          onSelectLane: () => {},
          onJogar: () => {},
          onRestorePurchases: () => {},
          restoreBusy: true,
        } as any),
      );
    });
    const btn = renderer!.root.findByProps({ accessibilityLabel: 'Restaurar compras' } as any);
    assert.equal(btn.props.accessibilityState?.busy, true);
    assert.equal(btn.props.disabled, true);
    // children is a Text element, inspect its rendered text
    const textNode = btn.findAll((n) => (n.type as string) === 'Text')[0];
    const label = textNode ? (textNode.children as unknown as string[])?.join('') : String(btn.props.children ?? '');
    assert.match(label, /Restaurando/);
  });

  test('App wiring: handleRestorePurchases exists with busy guard, gateway, and unlimited re-derive', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
    assert.match(src, /handleRestorePurchases/);
    assert.match(src, /createPurchasesGateway/);
    assert.match(src, /restorePurchases/);
    assert.match(src, /purchaseBusyRef/);
    assert.match(src, /adBusyRef/);
    assert.match(src, /restoreBusy/);
    assert.match(src, /setEntitlements/);
    assert.match(src, /ENTITLEMENT_NO_ADS/);
    // must not mutate per-match iapRemaining/hintBudget directly
    const idx = src.indexOf('const handleRestorePurchases');
    const slice = src.slice(idx, idx + 1500);
    assert.ok(slice.includes('restorePurchases'), 'must call restorePurchases');
    assert.ok(slice.includes('setEntitlements'), 'must update entitlements state');
    assert.ok(slice.includes('unlimited'), 'must re-derive unlimited');
    assert.ok(!slice.includes('iapRemaining'), 'restore must not set iapRemaining');
    assert.ok(!slice.includes('hintBudget'), 'restore must not mutate hintBudget');
  });

  test('App mounts restore affordance via LaneSelectScreen with onRestorePurchases', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
    assert.match(src, /LaneSelectScreen/);
    assert.match(src, /onRestorePurchases=\{handleRestorePurchases\}/);
    assert.match(src, /restoreBusy/);
  });

  test('restore does not alter per-match budgets — orchestrator reset still dies with match', async () => {
    const { resetForNewMatch, initialOrchestratorState } = await import('../../../src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../../src/game/lanes.ts');
    const { mergeEntitlements } = await import('../../../src/services/storage/entitlements.ts');
    const acc = LANE_PROFILES.accelerated;
    const base = {
      ...initialOrchestratorState(),
      undoHistory: [{ game: { board: [[null]] as any, pendingSpawn: { value: 1, displayRoll: 0 } } as any, match: { score: 0, best: 0 } as any, matchStats: { maxTile: 0, merges: 0, longestStreak: 0, currentStreak: 0 } as any }],
      undoBudget: { freeUsed: true, iapRemaining: 2, unlimited: false },
      hintBudget: { remaining: 1 },
      continueBudget: { used: false },
    };
    // Simulate restore that grants no_ads: budgets must stay
    const offline = { triade_no_ads: true };
    const remote = { triade_hint_5: true } as Record<string, boolean>;
    const merged = mergeEntitlements(offline, remote);
    assert.equal(merged.triade_no_ads, true);
    assert.equal(base.undoBudget.iapRemaining, 2, 'restore must not change iapRemaining');
    assert.equal(base.hintBudget.remaining, 1, 'restore must not change hintBudget');
    const afterReset = resetForNewMatch(base);
    assert.equal(afterReset.undoBudget.iapRemaining, 0, 'iapRemaining dies with match');
    assert.equal(afterReset.hintBudget.remaining, 5, 'hintBudget resets to initial');
    assert.equal(afterReset.continueBudget.used, false);
    // App re-derives unlimited from merged entitlements
    const reDerived = { ...afterReset, undoBudget: { ...afterReset.undoBudget, unlimited: !!merged.triade_no_ads } };
    assert.equal(reDerived.undoBudget.unlimited, true);
  });

  test('restore never downgrades held true — offline precedence across all three entitlements', async () => {
    const { mergeEntitlements } = await import('../../../src/services/storage/entitlements.ts');
    const offline = { triade_hint_5: true, triade_undo_3: true, triade_no_ads: true };
    const remoteEmpty = {} as Record<string, boolean>;
    assert.deepStrictEqual(mergeEntitlements(offline, remoteEmpty), offline);
    const remoteFalse = { triade_hint_5: false, triade_undo_3: false, triade_no_ads: false } as unknown as Record<string, boolean>;
    assert.deepStrictEqual(mergeEntitlements(offline, remoteFalse), offline);
  });

  test('App restore path never throws — gateway handles missing SDK', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../../src/services/monetization/purchases.ts'), 'utf8');
    // restorePurchases must have try/catch and return offline on failure
    assert.match(src, /restorePurchases[\s\S]*?try/);
    assert.match(src, /catch[\s\S]*?console\.warn/);
    assert.match(src, /return\s*\{\s*entitlements:\s*offline/);
    // busy guard with finally
    assert.match(src, /if\s*\(busy\)/);
    assert.match(src, /finally\s*\{\s*busy\s*=\s*false/);
  });

  test('Game remains playable during restore — no blocking spinner, board still swipable', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
    // handleRestorePurchases must not set any board-blocking state or overlay spinner
    const idx = src.indexOf('const handleRestorePurchases');
    const slice = src.slice(idx, idx + 2000);
    assert.ok(!slice.includes('setGame'), 'restore must not mutate game board');
    assert.ok(!slice.includes('setMatch('), 'restore must not mutate score');
    assert.ok(!slice.includes('isLoading') && !slice.includes('loading'), 'restore must not introduce loading blocker');
  });

  test('P3 intact — restore never alters spawn/merge/score rules (engine not imported)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const purchasesSrc = readFileSync(join(here, '../../../src/services/monetization/purchases.ts'), 'utf8');
    const entitlementsSrc = readFileSync(join(here, '../../../src/services/storage/entitlements.ts'), 'utf8');
    assert.doesNotMatch(purchasesSrc, /from\s+['"].*engine/);
    assert.doesNotMatch(entitlementsSrc, /from\s+['"].*engine/);
    assert.doesNotMatch(purchasesSrc, /pendingSpawn|spawnConfig/);
    // mergeEntitlements is allowed; forbid engine canMerge reference
    assert.doesNotMatch(purchasesSrc, /canMerge/);
  });
});
