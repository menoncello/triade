import {
  HINT_5_PACK_PRODUCT_ID,
  UNDO_3_PACK_PRODUCT_ID,
  NO_ADS_UNLIMITED_PRODUCT_ID,
  ENTITLEMENT_HINT_5,
  ENTITLEMENT_UNDO_3,
  ENTITLEMENT_NO_ADS,
} from './purchaseConfig.ts';
import { REWARDED_AD_UNIT_ID_UNDO, REWARDED_AD_UNIT_ID_CONTINUE } from './adsConfig.ts';

export const DECLARED_IAPS = [
  {
    productId: HINT_5_PACK_PRODUCT_ID,
    entitlement: ENTITLEMENT_HINT_5,
    type: 'consumable' as const,
    priceUSD: '0.99',
    priceBRL: '4.90',
    referenceName: 'Hint 5-pack',
  },
  {
    productId: UNDO_3_PACK_PRODUCT_ID,
    entitlement: ENTITLEMENT_UNDO_3,
    type: 'consumable' as const,
    priceUSD: '0.99',
    priceBRL: '4.90',
    referenceName: 'Undo 3-pack',
  },
  {
    productId: NO_ADS_UNLIMITED_PRODUCT_ID,
    entitlement: ENTITLEMENT_NO_ADS,
    type: 'non_consumable' as const,
    priceUSD: '2.99',
    priceBRL: '14.90',
    referenceName: 'No Ads + Unlimited Undo',
  },
] as const;

export const DECLARED_AD_PLACEMENTS = [
  {
    adUnitId: REWARDED_AD_UNIT_ID_UNDO,
    placement: 'between-games' as const,
    context: 'rewarded-undo-1-per-game' as const,
    trigger: 'player-initiated' as const,
    lane: 'accelerated' as const,
    format: 'rewarded' as const,
  },
  {
    adUnitId: REWARDED_AD_UNIT_ID_CONTINUE,
    placement: 'between-games' as const,
    context: 'rewarded-continue-1-per-game-over' as const,
    trigger: 'player-initiated' as const,
    lane: 'accelerated' as const,
    format: 'rewarded' as const,
  },
] as const;

export const DECLARATION_NOTES =
  'FR-19 no forced/interstitial/banner/app-open ads during gameplay in any lane; ads are player-initiated rewarded only between games (Accelerated lane). ' +
  'FR-20 all IAPs and ad placements must be declared in App Store Connect at submission. ' +
  'Privacy/GDPR consent mode, ATT prompt, and public privacy policy URL are owned solely by Epic 10 (Stories 10.4/10.5) and must be verified before submission — out of scope for this story.';
