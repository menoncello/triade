---
title: '4.6 Declaracoes App Store + ads player-initiated only'
type: 'feature'
created: '2026-08-28'
status: 'awaiting-operator'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '8456eb0e76382896b52d988f0e6094dc476f1f22'
final_revision: 'f94ede12a672020cbb9aa003b6bd03f2a94bbf7c'
operator_actions:
  - 'Create App Store Connect In-App Purchase products triade_hint_5_pack (Type: Consumable, Price: US$0.99 / R$4.90, Reference Name: Hint 5-pack), triade_undo_3_pack (Type: Consumable, Price: US$0.99 / R$4.90), and triade_no_ads_unlimited (Type: Non-Consumable, Price: US$2.99 / R$14.90) and associate them with the Tríade app bundle'
  - 'Configure RevenueCat dashboard: create Products triade_hint_5_pack / triade_undo_3_pack / triade_no_ads_unlimited, link to App Store products, create Entitlements triade_hint_5 / triade_undo_3 / triade_no_ads, and add all three to current Offering/Package'
  - 'Configure AdMob placements in AdMob and App Store Connect: ensure Rewarded placements for undo (1 per game) and continue (1 per game over) use player-initiated between-games inventory only, verify no interstitial/banner/app-open units are registered, and declare ad placements in App Store Connect App Privacy / Advertising declarations'
  - 'Set RevenueCat API keys in Expo env EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY and production AdMob unit overrides EXPO_PUBLIC_ADMOB_REWARDED_UNDO / EXPO_PUBLIC_ADMOB_REWARDED_CONTINUE if replacing test IDs, then rebuild and validate purchases and rewarded ads on a physical iOS device via sandbox/TestFlight'
  - 'Verify before submission that Epic 10 privacy compliance is complete: GDPR consent mode + ATT prompt (10.4) and public privacy policy URL live in App Store Connect metadata (10.5) — this story depends on them per triade/docs/app-store-declarations.md'
---

<intent-contract>

## Intent

**Problem:** Monetization is wired via RevenueCat (Hint 5-pack, Undo 3-pack, No Ads + Unlimited) and AdMob rewarded ads, but there is no repo-owned App Store declaration artifact and no automated guard that rewarded ads are the *only* ad format and are strictly player-initiated between games (FR-19/FR-20). Submission would risk rejection for undeclared IAPs/ads or forced interstitials.

**Approach:** Add a repo-owned pure declaration source (`appStoreDeclarations.ts`) that enumerates the three IAPs and rewarded placements as the single source for docs/tests, create a human-readable `triade/docs/app-store-declarations.md` checklist mapping FR-19/FR-20 and noting Epic 10 privacy/consent dependency, and add structural guard tests that fail if any interstitial/forced-ad code appears or if rewarded callbacks are not player-initiated between games — while keeping P3 (nothing alters spawn/merge/score) and lane wall intact. Vendor-console creation of the products/placements remains `awaiting-operator`.

## Boundaries & Constraints

**Always:** Engine stays pure (no RN imports, ADR-01); monetization stays in app layer (`src/services/monetization`) never engine (ADR-02); rewarded ads are player-initiated only, between games, never during swipe/animation/game-play, gated by `LaneProfile.allowAds` (Clean never sees ad, FR-19); `appStoreDeclarations.ts` is pure data (no RN/AdMob/Purchases SDK imports) consumable by tests; P3 — no IAP/ad code path mutates board/pendingSpawn/score/merge predicate; lane wall enforced by contracts not trust (ADR-03).

**Block If:** Needs real App Store Connect product creation, RevenueCat offering publish, AdMob App ID/placement registration, age-rating/keywords/description edit, or store credential publish beyond `EXPO_PUBLIC_` env test stubs — agent will use test product IDs (`triade_hint_5_pack`, `triade_undo_3_pack`, `triade_no_ads_unlimited`) and test AdMob IDs and finalize via `awaiting-operator` (never `blocked`). Privacy/GDPR consent mode + ATT prompt + privacy policy URL are owned solely by Epic 10 (10.4/10.5); this story only records the dependency, never implements it.

**Never:** Touch `src/engine` pure files; introduce interstitial, banner, forced, or auto-play ad units or imports (`InterstitialAd`, `AppOpenAd`, `BannerAd`, `GAMInterstitialAd`, `load` outside user handler); show any ad during gameplay/swipe/animation or in Clean lane; alter spawn/merge/score logic or board shape to accommodate monetization; write leaderboard/per-lane best (owned by 3.4); duplicate purchase/ad logic that already lives in `purchases.ts`/`rewardedAds.ts` beyond re-exporting their IDs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean lane ad attempt | `activeLane=clean`, rewarded gateway available | No ad prompt mounted, no `loadAndShow` call, lane wall blocks | silent, no error, no budget mutation |
| Accelerated undo ad (player-initiated) | `accelerated`, `showUndoPrompt=true`, user taps Ver anúncio | `gateway.loadAndShow` called once, `granted=true` → board rewinds, `freeUsed` consumed, prompt dismissed | `granted=false`/cancel/timeout → prompt dismissed, board/budget unchanged, no blocking error |
| Accelerated interstitial probe | Any codebase import contains `InterstitialAd`/`BannerAd`/`AppOpenAd` or `rewardedAds.ts` imports `Interstitial` | Guard test fails — declaration violation | build/test failure, not runtime crash |
| Ad declared placement | `DECLARED_AD_PLACEMENTS` entry `context='rewarded-undo'` or `rewarded-continue`, `placement='between-games'`, `trigger='player-initiated'` | Doc lists both placements as player-initiated rewarded between games, matching `rewardedUndoUnitId`/`rewardedContinueUnitId` test ids | doc out of sync → test mismatch fails |
| IAP declared list | Three IAPs with ids `triade_hint_5_pack` (consumable, 0.99/4.90), `triade_undo_3_pack` (consumable, 0.99/4.90), `triade_no_ads_unlimited` (non-consumable, 2.99/14.90) | `DECLARED_IAPS` contains all three, purchaseConfig exports same ids, docs checklist enumerates them for App Store Connect declaration | mismatch → test fails |
| No Ads owner | `entitlements[triade_no_ads]=true`, Accelerated taps undo/continue | No ad prompt shown, no gateway call, rewind immediate (already gated by hasNoAds in App.tsx) | — |
| Privacy dependency | Epic 10 10.4/10.5 not yet verified | `app-store-declarations.md` notes DEPENDS on Epic 10 verified GDPR/ATT/privacy URL before submission, this story does not block on it | informative dependency, not a code error |
| Purchase/ad never alters rules | Any purchase or ad completion | `pendingSpawn`, score, merge predicate, board shape unchanged except exact rewind | P3 violation → test fails |

</intent-contract>

## Code Map

- `triade/src/services/monetization/purchaseConfig.ts:1-64` -- pure IAP product ids + entitlement keys (`HINT_5_PACK_PRODUCT_ID`, `UNDO_3_PACK_PRODUCT_ID`, `NO_ADS_UNLIMITED_PRODUCT_ID`, `ENTITLEMENT_*`), env overrides, `TEST_PRODUCT_IDS` — extend via re-export, never add native imports
- `triade/src/services/monetization/adsConfig.ts:1-43` -- pure AdMob rewarded unit ids (`REWARDED_AD_UNIT_ID_UNDO`/`CONTINUE`, `TEST_IDS`, env overrides `EXPO_PUBLIC_ADMOB_*`) — source for declaration ad placements
- `triade/src/services/monetization/rewardedAds.ts:1-123` -- Rewarded-only gateway (`createRewardedAdGateway`, `RewardedAd.createForAdRequest`, `EARNED_REWARD`/`CLOSED`/`LOADED`, busy guard, dynamic `react-native-google-mobile-ads` import) — must stay interstitial-free, only player-initiated via App.tsx handlers
- `triade/src/services/monetization/purchases.ts:1-301` -- RevenueCat gateway dynamic import, three purchase methods + restore, entitlements merge never downgrades — IAP source for declarations
- `triade/App.tsx:320-640` -- player-initiated wiring `handleUndoRequest`/`handleUndoAd`/`handleContinueAd` (each checks `activeProfile.allowAds`/`canUndo`/`canContinue`, `showUndoPrompt`, `gameOver`, `hasNoAds` bypass, `busyRef`/`adBusyRef`/`purchaseBusyRef` guards) and `RewardPrompt` mounts only between games — must remain the only call sites for `loadAndShow`
- `triade/src/game/lanes.ts:31-65` -- `LANE_PROFILES` lane wall (`clean.allowAds:false,canUndo:false,canContinue:false`) — gate for FR-19 compliance
- `triade/src/services/storage/entitlements.ts:1-53` -- SecureStore mirror authoritative offline, `mergeEntitlements` never downgrades — referenced by declarations doc dependency note
- `triade/app.json:26-36` -- Expo plugins (`expo-secure-store`, `expo-asset`, `react-native-google-mobile-ads` with test `android_app_id`/`ios_app_id`) — verify google-mobile-ads plugin present, no interstitial config added
- `triade/__tests__/game/purchases.*.test.ts` + `triade/__tests__/ui/components/app.*.test.ts` -- existing gateway/budget/ad pins to keep green; new guards extend them

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/services/monetization/appStoreDeclarations.ts` -- create pure data module (no RN/AdMob/Purchases/SecureStore imports) exporting `DECLARED_IAPS: Array<{ productId: string; entitlement: string; type: 'consumable'|'non_consumable'; priceUSD: string; priceBRL: string; referenceName: string }>` with exactly three entries `triade_hint_5_pack` (consumable 0.99/4.90 Hint 5-pack), `triade_undo_3_pack` (consumable 0.99/4.90 Undo 3-pack), `triade_no_ads_unlimited` (non_consumable 2.99/14.90 No Ads + Unlimited Undo) re-using constants from `purchaseConfig.ts` (import only from `./purchaseConfig.ts`, no SDK), and `DECLARED_AD_PLACEMENTS: Array<{ adUnitId: string; placement: string; context: string; trigger: 'player-initiated' }>` with two rewarded entries (undo `rewardedUndoUnitId()` + continue `rewardedContinueUnitId()`, both `placement:'between-games'`, `trigger:'player-initiated'`, `context` respectively `'rewarded-undo-1-per-game'` and `'rewarded-continue-1-per-game-over'`), plus `DECLARATION_NOTES` string noting FR-19/FR-20 and Epic 10 dependency; module must be importable in tests without native deps and pass purity check (no forbidden RN/AdMob/Purchases imports via string scan)
- [x] `triade/docs/app-store-declarations.md` -- create human-readable checklist doc (≤120 lines) with: header linking `appStoreDeclarations.ts` as SSOT, table of three IAPs (productId, type, price USD/BRL, entitlement, App Store Connect status column placeholder), table of two rewarded placements (adUnitId via adsConfig test ids, placement between-games, player-initiated only, lane Accelerated only, FR-19 mapping), declaration section stating no interstitial/banner/app-open/forced ads in any lane during gameplay (FR-19), IAP/ads disclaimer that all purchases/placements must be declared in App Store Connect (FR-20), explicit dependency note that privacy/GDPR consent mode/ATT prompt/privacy URL are owned by Epic 10 (10.4/10.5) and must be verified before submission (not in scope), and operator steps reference (points to `operator_actions` in spec frontmatter); keep tone calm, no celebration copy
- [x] `triade/__tests__/monetization/appStoreDeclarations.test.ts` -- new pure guard suite: `DECLARED_IAPS` has exactly 3 entries matching `TEST_PRODUCT_IDS`+`purchaseConfig` ids and entitlement keys (`triade_hint_5`, `triade_undo_3`, `triade_no_ads`), types/prices correct, no duplicate ids; `DECLARED_AD_PLACEMENTS` has exactly 2 rewarded entries with `trigger:'player-initiated'` and `placement:'between-games'` and ids matching `adsConfig` test ids; source-text scan of `triade/src/services/monetization/*.ts` finds no `InterstitialAd|BannerAd|AppOpenAd|GAM.*Ad|Interstitial` literal and `rewardedAds.ts` only imports `RewardedAd`+`RewardedAdEventType`; `purchases.ts`+`purchaseConfig.ts` dynamic import pattern intact (no top-level `react-native-purchases` import); `appStoreDeclarations.ts` has no forbidden imports (`react-native`, `react-native-google-mobile-ads`, `react-native-purchases`, `expo-secure-store`); docs file exists and contains FR-19/FR-20 strings and Epic 10 dependency note
- [x] `triade/__tests__/monetization/adsPlayerInitiated.test.ts` -- structural player-initiated guard (no device): source scan of `triade/App.tsx` shows `createRewardedAdGateway`/`loadAndShow`/`RewardedAd` only inside `handleUndoAd`/`handleContinueAd` (player handlers) and never at top-level/effect/mount, plus `showRewardedUndoAd`/`showRewardedContinueAd` not called outside those handlers; `LaneProfile` gate scan confirms `clean.allowAds===false` and `clean.canUndo/canContinue===false`; App mounts of `RewardPrompt` gated by `activeLaneId==='accelerated' && showUndoPrompt && !gameOver && !hasNoAds` and Continue slot gated by `gameOver && canContinueDerived` (between-games only); no `InterstitialAd` mount string in `App.tsx`/`AcceleratedAids.tsx`/`GameOverOverlay.tsx`
- [x] `triade/__tests__/monetization/appStoreDeclarations.purity.test.ts` -- thin-view guard extension: extend existing purity-like source scan to verify `triade/src/services/monetization/appStoreDeclarations.ts` is engine-layer-pure (no `Math.random`, no `spawn/merge/score` literals, no engine import) and that no monetization file alters engine rules (scan for `pendingSpawn` mutation, `mergeValue`, `canMerge` predicate duplication outside `src/engine`)

**Acceptance Criteria:**
- Given the three IAP products required at submission (Hint 5-pack, Undo 3-pack, No Ads + Unlimited Undo), when `DECLARED_IAPS` is inspected or the checklist doc is read, then all three appear with correct productId/type/price/entitlement and map 1:1 to `purchaseConfig.ts` test ids, and the doc states they must be declared in App Store Connect (FR-20)
- Given the rewarded ad inventory, when `DECLARED_AD_PLACEMENTS` and `adsConfig.ts` are inspected, then exactly two rewarded placements exist (undo 1-per-game, continue 1-per-game-over), both `player-initiated` `between-games`, Accelerated lane only, and no interstitial/banner/app-open placement exists anywhere in `src/services/monetization` or `App.tsx` (FR-19)
- Given any lane during gameplay (swipe in flight, animation, or board interactive), when ad-related code is searched, then no ad is triggered automatically — `loadAndShow` is only reachable via user tap handlers (`handleUndoAd`/`handleContinueAd`), Clean lane never mounts `RewardPrompt` nor calls the gateway, and unlimited owners bypass the gateway entirely without ad (FR-19)
- Given any IAP purchase or ad completion, when the board engine contract is checked, then `pendingSpawn`, score, merge predicate (`1+2`/`>=3 equal`) and board shape remain unchanged (only exact rewind via orchestrator snapshot), P3 upheld
- Given the App Store submission dependency, when the declarations doc is read, then it explicitly states privacy/GDPR consent/ATT prompt/privacy URL are owned by Epic 10 (10.4/10.5) and must be verified before submission, with no GDPR/ATT implementation in this story
- Given the Expo config, when `triade/app.json` is inspected, then `react-native-google-mobile-ads` plugin remains with test App IDs and no interstitial configuration is added

## Spec Change Log

## Review Triage Log

## Design Notes

Keep `appStoreDeclarations.ts` as pure data — never dynamically import SDKs; tests run without native modules. Suggested shape:

```ts
import { HINT_5_PACK_PRODUCT_ID, UNDO_3_PACK_PRODUCT_ID, NO_ADS_UNLIMITED_PRODUCT_ID, ENTITLEMENT_HINT_5, ENTITLEMENT_UNDO_3, ENTITLEMENT_NO_ADS } from './purchaseConfig.ts';
import { REWARDED_AD_UNIT_ID_UNDO, REWARDED_AD_UNIT_ID_CONTINUE } from './adsConfig.ts';
export const DECLARED_IAPS = [
  { productId: HINT_5_PACK_PRODUCT_ID, entitlement: ENTITLEMENT_HINT_5, type: 'consumable', priceUSD: '0.99', priceBRL: '4.90', referenceName: 'Hint 5-pack' },
  // ...
] as const;
export const DECLARED_AD_PLACEMENTS = [
  { adUnitId: REWARDED_AD_UNIT_ID_UNDO, placement: 'between-games', context: 'rewarded-undo-1-per-game', trigger: 'player-initiated' as const },
  // ...
] as const;
```

The checklist doc `triade/docs/app-store-declarations.md` is the operator-readable companion to this module; keep it synchronized (tests compare doc content to the module's ids).

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (new ~18-24 pins for declarations + player-initiated guards, no existing failures)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean

## Auto Run Result

- Summary: App Store declarations SSOT + player-initiated-only guards implemented; 3 IAPs + 2 rewarded placements declared as pure data, checklist doc mapped to FR-19/FR-20 with Epic 10 dependency, structural tests ensure no interstitial/forced ads and that rewarded gateway is only invoked from player tap handlers between games (Clean never shows ad, hasNoAds bypasses gateway, P3 intact).
- FilesChanged: `triade/src/services/monetization/appStoreDeclarations.ts` (new SSOT pure data), `triade/docs/app-store-declarations.md` (new checklist doc), `triade/__tests__/monetization/appStoreDeclarations.test.ts` (new 16 pins), `triade/__tests__/monetization/adsPlayerInitiated.test.ts` (new 8 pins), `triade/__tests__/monetization/appStoreDeclarations.purity.test.ts` (new 5 pins)
- Review: patch 0, defer 0, reject 0 (awaiting-operator; narrow monetization documentation/guard surface)
- FollowupReview: false
- Verification: `npm --prefix triade test` 664 pass, `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean, `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json` clean, no interstitial literals found, player-initiated gating verified, docs sync verified
- Risks: Real App Store Connect products + RevenueCat offering + AdMob production placements require vendor console clicks (owned by awaiting-operator); privacy/GDPR/ATT blocking dependency remains with Epic 10
- OperatorActions: 5 vendor-console steps enumerated in frontmatter `operator_actions`

