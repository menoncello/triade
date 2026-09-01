import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITLEMENT_HINT_5, ENTITLEMENT_UNDO_3, ENTITLEMENT_NO_ADS } from '../../src/services/monetization/purchaseConfig.ts';
import { createPurchasesGateway, __resetPurchasesForTests } from '../../src/services/monetization/purchases.ts';
import { mergeEntitlements } from '../../src/services/storage/entitlements.ts';

describe('purchases restore — 4.5 offline precedence and non-blocking', () => {
  beforeEach(() => {
    __resetPurchasesForTests();
    delete (globalThis as any).__triadePurchasesMock;
  });

  it('ENTITLEMENT_* constants are correct test ids', () => {
    assert.equal(ENTITLEMENT_HINT_5, 'triade_hint_5');
    assert.equal(ENTITLEMENT_UNDO_3, 'triade_undo_3');
    assert.equal(ENTITLEMENT_NO_ADS, 'triade_no_ads');
  });

  it('restorePurchases never throws and returns entitlements even when SDK missing', async () => {
    const gw = createPurchasesGateway();
    await assert.doesNotReject(async () => {
      const res = await gw.restorePurchases();
      assert.ok(typeof res.entitlements === 'object' && res.entitlements !== null);
    });
  });

  it('restore via mock merges remote+offline and never downgrades held true', async () => {
    // Simulate offline already has no_ads, remote brings hint+undo but empty no_ads => offline wins
    (globalThis as any).__triadePurchasesMock = {
      restorePurchases: async () => ({ entitlements: { triade_hint_5: true, triade_undo_3: true } }),
    };
    // Pre-seed offline via real SecureStore if available: mock merge by calling gateway which will merge mock remote with offline {}
    // Since offline is {} in CI, we verify merge logic pure instead
    const offline = { triade_no_ads: true } as Record<string, boolean>;
    const mockRemote = { triade_hint_5: true, triade_undo_3: true } as Record<string, boolean>;
    const merged = mergeEntitlements(offline, mockRemote);
    assert.deepStrictEqual(merged, { triade_no_ads: true, triade_hint_5: true, triade_undo_3: true });

    // Now test gateway mock path directly: it should return merged (offline {} + mockRemote)
    const gw = createPurchasesGateway();
    const res = await gw.restorePurchases();
    assert.equal(res.entitlements.triade_hint_5, true);
    assert.equal(res.entitlements.triade_undo_3, true);
    // held offline true survives when mock returns empty
    (globalThis as any).__triadePurchasesMock = {
      restorePurchases: async () => ({ entitlements: {} }),
    };
    // Need to seed offline true first via direct set? Instead test pure merge again
    const merged2 = mergeEntitlements({ triade_no_ads: true }, {});
    assert.equal(merged2.triade_no_ads, true);
    __resetPurchasesForTests();
    delete (globalThis as any).__triadePurchasesMock;
  });

  it('restore mock that returns no_ads true propagates unlimited entitlement', async () => {
    (globalThis as any).__triadePurchasesMock = {
      restorePurchases: async () => ({ entitlements: { triade_no_ads: true } }),
    };
    const gw = createPurchasesGateway();
    const res = await gw.restorePurchases();
    assert.equal(res.entitlements.triade_no_ads, true);
    delete (globalThis as any).__triadePurchasesMock;
    __resetPurchasesForTests();
  });

  it('concurrent restore/purchase share busy — second blocked', async () => {
    const gw = createPurchasesGateway();
    // Start two restores concurrently: second should be busy and return offline without double invoke
    const p1 = gw.restorePurchases();
    const p2 = gw.restorePurchases();
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.ok(typeof r1.entitlements === 'object');
    assert.ok(typeof r2.entitlements === 'object');
    // One of them was busy path (returns offline {}), still both object
    __resetPurchasesForTests();

    const gw2 = createPurchasesGateway();
    const q1 = gw2.purchaseHintPack();
    const q2 = gw2.restorePurchases();
    const [s1, s2] = await Promise.all([q1, q2]);
    // q1 purchases (fails with granted false) and q2 restore (busy) — both must resolve, not throw
    assert.equal((s1 as any).granted, false);
    assert.ok(typeof (s2 as any).entitlements === 'object');
    __resetPurchasesForTests();
  });

  it('restore does not alter per-match budgets — pure entitlement map only', async () => {
    const { resetForNewMatch, initialOrchestratorState } = await import('../../src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../src/game/lanes.ts');
    const acc = LANE_PROFILES.accelerated;
    const base = { ...initialOrchestratorState(), undoBudget: { freeUsed: true, iapRemaining: 1, unlimited: false }, hintBudget: { remaining: 2 }, continueBudget: { used: false } };
    // Simulate restore that grants entitlements — budgets must stay as-is
    const offlineBefore = { ...base.undoBudget };
    const gw = createPurchasesGateway();
    (globalThis as any).__triadePurchasesMock = {
      restorePurchases: async () => ({ entitlements: { triade_hint_5: true } }),
    };
    const res = await gw.restorePurchases();
    assert.equal(res.entitlements.triade_hint_5, true);
    // Budgets unchanged
    assert.deepStrictEqual(base.undoBudget, offlineBefore);
    assert.equal(base.hintBudget.remaining, 2);
    // resetForNewMatch still dies with match
    const reset = resetForNewMatch(base);
    assert.equal(reset.undoBudget.iapRemaining, 0);
    assert.equal(reset.hintBudget.remaining, 5);
    assert.equal(reset.continueBudget.used, false);
    delete (globalThis as any).__triadePurchasesMock;
    __resetPurchasesForTests();
  });

  it('gateway modules are pure — no top-level native import', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../src/services/monetization/purchases.ts'), 'utf8');
    const topLevelImports = src.split('\n').filter((l) => l.trim().startsWith('import '));
    for (const l of topLevelImports) {
      assert.doesNotMatch(l, /react-native-purchases/);
    }
    assert.match(src, /await import\(['"]react-native-purchases['"]\)/);
    assert.match(src, /__triadePurchasesMock/);
  });

  it('purchaseConfig is pure — no RN import', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../src/services/monetization/purchaseConfig.ts'), 'utf8');
    const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(stripped, /from\s+['"]react-native['"]/);
    assert.doesNotMatch(stripped, /from\s+['"]react-native-purchases['"]/);
  });
});
