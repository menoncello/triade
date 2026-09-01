import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');
const monetDir = join(repoRoot, 'triade/src/services/monetization');
const docsPath = join(repoRoot, 'triade/docs/app-store-declarations.md');
function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), 'utf8');
}
import { DECLARED_IAPS, DECLARED_AD_PLACEMENTS, DECLARATION_NOTES } from '../../src/services/monetization/appStoreDeclarations.ts';
import {
  HINT_5_PACK_PRODUCT_ID,
  UNDO_3_PACK_PRODUCT_ID,
  NO_ADS_UNLIMITED_PRODUCT_ID,
  ENTITLEMENT_HINT_5,
  ENTITLEMENT_UNDO_3,
  ENTITLEMENT_NO_ADS,
  TEST_PRODUCT_IDS,
} from '../../src/services/monetization/purchaseConfig.ts';
import { REWARDED_AD_UNIT_ID_UNDO, REWARDED_AD_UNIT_ID_CONTINUE, TEST_IDS } from '../../src/services/monetization/adsConfig.ts';

describe('appStoreDeclarations — 4.6 declared IAPs match purchaseConfig', () => {
  it('has exactly 3 entries', () => {
    assert.equal(DECLARED_IAPS.length, 3);
  });

  it('productIds map 1:1 to purchaseConfig test ids', () => {
    const ids = DECLARED_IAPS.map((e) => e.productId);
    assert.ok(ids.includes(HINT_5_PACK_PRODUCT_ID));
    assert.ok(ids.includes(UNDO_3_PACK_PRODUCT_ID));
    assert.ok(ids.includes(NO_ADS_UNLIMITED_PRODUCT_ID));
    assert.equal(HINT_5_PACK_PRODUCT_ID, TEST_PRODUCT_IDS.hint5Pack);
    assert.equal(UNDO_3_PACK_PRODUCT_ID, TEST_PRODUCT_IDS.undo3Pack);
    assert.equal(NO_ADS_UNLIMITED_PRODUCT_ID, TEST_PRODUCT_IDS.noAds);
  });

  it('entitlements match purchaseConfig', () => {
    const ents = DECLARED_IAPS.map((e) => e.entitlement);
    assert.ok(ents.includes(ENTITLEMENT_HINT_5));
    assert.ok(ents.includes(ENTITLEMENT_UNDO_3));
    assert.ok(ents.includes(ENTITLEMENT_NO_ADS));
  });

  it('types and prices correct', () => {
    const hint = DECLARED_IAPS.find((e) => e.productId === HINT_5_PACK_PRODUCT_ID)!;
    assert.equal(hint.type, 'consumable');
    assert.equal(hint.priceUSD, '0.99');
    assert.equal(hint.priceBRL, '4.90');
    const undo = DECLARED_IAPS.find((e) => e.productId === UNDO_3_PACK_PRODUCT_ID)!;
    assert.equal(undo.type, 'consumable');
    assert.equal(undo.priceUSD, '0.99');
    const noAds = DECLARED_IAPS.find((e) => e.productId === NO_ADS_UNLIMITED_PRODUCT_ID)!;
    assert.equal(noAds.type, 'non_consumable');
    assert.equal(noAds.priceUSD, '2.99');
    assert.equal(noAds.priceBRL, '14.90');
  });

  it('no duplicate productIds or entitlements', () => {
    const ids = DECLARED_IAPS.map((e) => e.productId);
    assert.equal(new Set(ids).size, ids.length);
    const ents = DECLARED_IAPS.map((e) => e.entitlement);
    assert.equal(new Set(ents).size, ents.length);
  });

  it('DECLARED_IAPS reference names match triad trilogy', () => {
    const names = DECLARED_IAPS.map((e) => e.referenceName);
    assert.ok(names.includes('Hint 5-pack'));
    assert.ok(names.includes('Undo 3-pack'));
    assert.ok(names.includes('No Ads + Unlimited Undo'));
  });
});

describe('appStoreDeclarations — declared ad placements', () => {
  it('has exactly 2 rewarded entries', () => {
    assert.equal(DECLARED_AD_PLACEMENTS.length, 2);
  });

  it('both are rewarded, player-initiated, between-games, accelerated only', () => {
    for (const p of DECLARED_AD_PLACEMENTS) {
      assert.equal(p.format, 'rewarded');
      assert.equal(p.trigger, 'player-initiated');
      assert.equal(p.placement, 'between-games');
      assert.equal(p.lane, 'accelerated');
    }
  });

  it('adUnitIds match adsConfig test ids', () => {
    const ids = DECLARED_AD_PLACEMENTS.map((p) => p.adUnitId);
    assert.ok(ids.includes(REWARDED_AD_UNIT_ID_UNDO));
    assert.ok(ids.includes(REWARDED_AD_UNIT_ID_CONTINUE));
    assert.equal(REWARDED_AD_UNIT_ID_UNDO, TEST_IDS.ios.rewarded);
  });

  it('contexts are undo and continue', () => {
    const contexts = DECLARED_AD_PLACEMENTS.map((p) => p.context);
    assert.ok(contexts.includes('rewarded-undo-1-per-game'));
    assert.ok(contexts.includes('rewarded-continue-1-per-game-over'));
  });
});

describe('appStoreDeclarations — no interstitial / forced-ad literals', () => {
  it('no interstitial/banner/app-open literals in monetization sources', () => {
    const monetFiles = [
      'triade/src/services/monetization/rewardedAds.ts',
      'triade/src/services/monetization/adsConfig.ts',
      'triade/src/services/monetization/purchaseConfig.ts',
      'triade/src/services/monetization/purchases.ts',
      'triade/src/services/monetization/appStoreDeclarations.ts',
    ];
    const forbidden = /InterstitialAd|BannerAd|AppOpenAd|GAMInterstitialAd|GAMBannerAd/;
    for (const rel of monetFiles) {
      const src = readRepo(rel);
      assert.ok(!forbidden.test(src), `${rel} must not contain interstitial/banner/app-open literal`);
    }
    // rewardedAds must only reference RewardedAd, not Interstitial
    const rewardedSrc = readRepo('triade/src/services/monetization/rewardedAds.ts');
    assert.ok(/RewardedAd/.test(rewardedSrc), 'rewardedAds.ts must reference RewardedAd');
  });

  it('purchases modules do not top-level import native SDKs', () => {
    for (const rel of ['triade/src/services/monetization/purchases.ts', 'triade/src/services/monetization/rewardedAds.ts']) {
      const src = readRepo(rel);
      // top-level static import of native module would be `from 'react-native-purchases'` or `from 'react-native-google-mobile-ads'` not inside a function
      const lines = src.split('\n');
      const topLevelNative = lines.filter((l) => /^\s*import\s+.*from\s+['"]react-native-(purchases|google-mobile-ads)['"]/.test(l));
      assert.equal(topLevelNative.length, 0, `${rel} must not top-level import native SDK (must be dynamic inside method)`);
    }
  });

  it('appStoreDeclarations has no forbidden native imports', () => {
    const src = readRepo('triade/src/services/monetization/appStoreDeclarations.ts');
    assert.ok(!/react-native/.test(src), 'appStoreDeclarations must not import react-native');
    assert.ok(!/react-native-google-mobile-ads/.test(src), 'must not import google-mobile-ads directly (only via adsConfig)');
    assert.ok(!/react-native-purchases/.test(src), 'must not import react-native-purchases directly (only via purchaseConfig)');
    assert.ok(!/expo-secure-store/.test(src), 'must not import expo-secure-store');
    // Should only import from purchaseConfig / adsConfig
    assert.ok(/from\s+['"]\.\/purchaseConfig/.test(src));
    assert.ok(/from\s+['"]\.\/adsConfig/.test(src));
  });

  it('DECLARATION_NOTES mentions FR-19/FR-20 and Epic 10 dependency', () => {
    assert.ok(/FR-19/.test(DECLARATION_NOTES));
    assert.ok(/FR-20/.test(DECLARATION_NOTES));
    assert.ok(/Epic 10/.test(DECLARATION_NOTES) || /10\.4/.test(DECLARATION_NOTES));
  });
});

describe('appStoreDeclarations — docs checklist exists and syncs with module', () => {
  it('docs file exists', () => {
    assert.ok(existsSync(docsPath), 'triade/docs/app-store-declarations.md must exist');
  });

  it('docs contains all three IAP productIds and FR-19/FR-20 and Epic 10 note', () => {
    const doc = readRepo('triade/docs/app-store-declarations.md');
    for (const e of DECLARED_IAPS) {
      assert.ok(doc.includes(e.productId), `docs must contain ${e.productId}`);
    }
    for (const p of DECLARED_AD_PLACEMENTS) {
      // doc tables contain either the raw test id or the constant name; check for shared substring of the test id
      assert.ok(doc.includes(p.adUnitId) || doc.includes('REWARDED_AD_UNIT'), `docs must mention placement adUnitId or constant`);
    }
    assert.ok(/FR-19/.test(doc), 'docs must mention FR-19');
    assert.ok(/FR-20/.test(doc), 'docs must mention FR-20');
    assert.ok(/Epic 10/.test(doc) || /10\.4/.test(doc), 'docs must mention Epic 10 dependency');
    assert.ok(/No Ad/.test(doc) || /No Ads/.test(doc), 'docs must mention No Ads');
    assert.ok(/between-games/.test(doc), 'docs must mention between-games');
    assert.ok(/player-initiated/.test(doc), 'docs must mention player-initiated');
  });

  it('docs explicitly declares no interstitial/banner/app-open', () => {
    const doc = readRepo('triade/docs/app-store-declarations.md');
    assert.ok(/interstitial/i.test(doc) || /No interstitial/i.test(doc));
  });
});
