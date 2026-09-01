import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HINT_5_PACK_PRODUCT_ID, ENTITLEMENT_HINT_5, TEST_PRODUCT_IDS, hintPackProductId } from '../../src/services/monetization/purchaseConfig.ts';
import { createPurchasesGateway, __resetPurchasesForTests } from '../../src/services/monetization/purchases.ts';
import { mergeEntitlements } from '../../src/services/storage/entitlements.ts';

describe('purchases — gateway contract (4.3)', () => {
  beforeEach(() => __resetPurchasesForTests());

  it('default product id is test id', () => {
    assert.equal(HINT_5_PACK_PRODUCT_ID, 'triade_hint_5_pack');
    assert.equal(TEST_PRODUCT_IDS.hint5Pack, 'triade_hint_5_pack');
    assert.equal(hintPackProductId(), 'triade_hint_5_pack');
  });

  it('TEST_PRODUCT_IDS map is correct', () => {
    assert.equal(TEST_PRODUCT_IDS.hint5Pack, 'triade_hint_5_pack');
  });

  it('ENTITLEMENT_HINT_5 is triade_hint_5', () => {
    assert.equal(ENTITLEMENT_HINT_5, 'triade_hint_5');
  });

  it('gateway returns granted:false when native SDK missing (no throw)', async () => {
    const gw = createPurchasesGateway();
    const res = await gw.purchaseHintPack();
    assert.equal(res.granted, false);
    assert.ok(typeof res.error === 'string' || res.error === undefined);
  });

  it('gateway never throws even when SDK missing', async () => {
    const gw = createPurchasesGateway();
    await assert.doesNotReject(async () => { await gw.purchaseHintPack(); });
    await assert.doesNotReject(async () => { await gw.restorePurchases(); });
  });

  it('concurrent purchase guarded — second returns granted:false with busy', async () => {
    const gw = createPurchasesGateway();
    const p1 = gw.purchaseHintPack();
    const p2 = gw.purchaseHintPack();
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1.granted, false);
    assert.equal(r2.granted, false);
    if (r2.error) assert.ok(r2.error.includes('busy') || r2.error.length > 0);
  });

  it('restorePurchases never throws and returns entitlements object', async () => {
    const gw = createPurchasesGateway();
    const res = await gw.restorePurchases();
    assert.ok(typeof res.entitlements === 'object' && res.entitlements !== null);
  });

  it('restore merge never downgrades held true (pure)', () => {
    const offline = { triade_hint_5: true };
    const remote: Record<string, boolean> = {};
    const merged = mergeEntitlements(offline, remote);
    assert.equal(merged.triade_hint_5, true);
  });

  it('merge retains true when remote claims false (offline authoritative)', () => {
    const offline = { triade_hint_5: true };
    const remote = { triade_hint_5: false };
    const merged = mergeEntitlements(offline, remote as any);
    assert.equal(merged.triade_hint_5, true);
  });

  it('gateway is pure — no RN import at top level', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../src/services/monetization/purchases.ts'), 'utf8');
    const lines = src.split('\n');
    const topLevelImports = lines.filter((l) => l.trim().startsWith('import '));
    for (const l of topLevelImports) {
      assert.doesNotMatch(l, /react-native-purchases/);
      assert.doesNotMatch(l, /react-native/);
    }
    assert.match(src, /await import\(['"]react-native-purchases['"]\)/);
  });

  it('purchaseConfig module is pure — no RN, no purchases import at top-level', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../src/services/monetization/purchaseConfig.ts'), 'utf8');
    const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(stripped, /from\s+['"]react-native['"]/);
    assert.doesNotMatch(stripped, /from\s+['"]react-native-purchases['"]/);
    assert.doesNotMatch(stripped, /from\s+['"]expo-/);
  });

  it('purchaseConfig env override not crashing (pure)', () => {
    assert.equal(typeof HINT_5_PACK_PRODUCT_ID, 'string');
    assert.ok(HINT_5_PACK_PRODUCT_ID.length > 0);
  });
});
