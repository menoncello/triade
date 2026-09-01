---
title: '4.4 IAP Undo 3-pack + No Ads + Unlimited Undo'
type: 'feature'
created: '2026-08-28'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '2cbed929ab5093116fc5257fe44fa0aeb529e4d6'
final_revision: 'ba88ec231828866523f8319852c8aabe292a9aff'
context: []
warnings: []
operator_actions:
  - 'Create App Store Connect In-App Purchase products triade_undo_3_pack (Type: Consumable, Price: US$0.99 / R$4.90, Reference Name: Undo 3-pack) and triade_no_ads_unlimited (Type: Non-Consumable, Price: US$2.99 / R$14.90, Reference Name: No Ads + Unlimited Undo) and associate them with the Tríade app bundle'
  - 'Configure RevenueCat dashboard: create Products triade_undo_3_pack and triade_no_ads_unlimited, link to App Store products, create Entitlements triade_undo_3 and triade_no_ads, and add both products to current Offering/Package'
  - 'Set RevenueCat API keys in Expo env: EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY (or EXPO_PUBLIC_PURCHASES_UNDO_3 / EXPO_PUBLIC_PURCHASES_NO_ADS if overriding product IDs) and redeploy build'
  - 'Validate purchases on a physical iOS device via sandbox/TestFlight: buy Undo 3-pack in Accelerated lane, verify iapRemaining increments by 3 and entitlement persists via restore; buy No Ads + Unlimited, verify undo becomes immediate without ad prompt and continue ad prompt suppressed; verify Clean lane never shows purchase prompts'
---
---

<intent-contract>

## Intent

**Problem:** Accelerated lane undo budget is limited to 1 free ad-undo per game with a stub IAP path that fakes `iapRemaining:1` — players cannot buy the Undo 3-pack (US$0.99/R$4.90) for 3 extra undos nor the No Ads + Unlimited Undo (US$2.99/R$14.90) that removes ad prompts and grants unlimited rewinds.

**Approach:** Wire RevenueCat (`react-native-purchases 10.7.0`) with SecureStore entitlement mirror authoritative offline, extend `UndoBudget {freeUsed, iapRemaining, unlimited}` to be replenished via real purchases (`+3`) or switched to `unlimited:true`, gate all undo/continue ad prompts behind the `triade_no_ads` entitlement (owning it suppresses ad prompts entirely and makes undo/continue immediate), and keep P3 — no purchase ever alters spawn/merge/score.

## Boundaries & Constraints

**Always:** Engine stays pure (no RN imports, ADR-01); orchestrator `src/game/matchOrchestrator.ts` + `assistance.ts` remain the only undo-budget authority (`canUndo`/`consumeUndo`, memory budget dies with match via `resetForNewMatch`, ADR-02); lane wall via `LaneProfile` — Clean `{canUndo:false, allowAds:false}` never undoes and never routes to purchases/ads; ads are player-initiated, between games, never during animation; board rewind is true rewind (ADR-06, snapshot includes PRNG/pendingSpawn/score/stats); entitlements (`src/services/storage/entitlements.ts`) mirrored in SecureStore authoritative offline and `mergeEntitlements` never downgrades a held entitlement (ADR-02); monetization lives in app layer (`src/services/monetization`) never engine; P3: nothing purchasable alters spawn/merge/score; unlimited owners never see an ad prompt but continue/hint budgets still die with match.

**Block If:** Needs real App Store Connect product creation, RevenueCat dashboard product/offering configuration, store credentials / API key publish, or purchase approval beyond test stub/mock — agent will implement with test product ids (`triade_undo_3_pack`, `triade_no_ads_unlimited`) and `EXPO_PUBLIC_` env overrides and finalize via `awaiting-operator` (never `blocked`).

**Never:** Touch `src/engine` pure files; introduce interstitial/forced ads or show ads during gameplay; write leaderboard/per-lane best (owned by 3.4); build full restore orchestration beyond extending existing `restorePurchases` (full entitlements orchestration is 4.5 — keep restore extension minimal, only add undo/no-ads keys here); store per-match `iapRemaining`/`unlimited` across restart as persistent count beyond entitlement boolean (per-match budgets die with match, only entitlement booleans survive in SecureStore); duplicate merge/spawn/score rules in UI; allow Clean lane to undo or purchase.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean lane undo attempt | `activeLane=clean`, history>0, any budget | `canUndo` false, no prompt, no purchase path, no monetization mutation | no error |
| Accelerated free undo via ad (1/game) | `accelerated`, `freeUsed=false`, history>0, `unlimited=false` | Ad gateway `loadAndShow` granted → `consumeUndo` flips `freeUsed=true`, board rewinds | ad fail → prompt dismissed, board/budget unchanged |
| Accelerated unlimited owner taps undo | `accelerated`, `entitlement triade_no_ads=true` (so `unlimited=true`), history>0, any `freeUsed` | No RewardPrompt shown; undo rewinds immediately via `consumeUndo` (unlimited keeps `unlimited:true`), no ad call | if history empty → no rewind, budget unchanged |
| Accelerated undo 3-pack purchase success | `accelerated`, `freeUsed=true`, `iapRemaining=0`, `unlimited=false`, purchase `triade_undo_3_pack` returns granted | Entitlement `triade_undo_3:true` stored in SecureStore (merge never downgrades), `undoBudget.iapRemaining` +=3 in current match, next undo consumes 1 | never throws; store error → return not granted |
| Purchase No Ads success | `accelerated`, purchase `triade_no_ads_unlimited` returns granted | Entitlement `triade_no_ads:true` set in SecureStore (never downgrades), `undoBudget.unlimited=true` in current match, `hasNoAds` derived true → ad prompts suppressed (undo/continue no longer call gateway) | verify SecureStore after set, persist_failed → return not granted |
| Undo via IAP remaining | `accelerated`, `freeUsed=true`, `iapRemaining=2`, history>0 | `consumeUndo` decrements `iapRemaining` to 1, board rewinds, no ad | if `iapRemaining===0` and not unlimited → rejected |
| Purchase fail/cancel | purchase returns not granted / throws / user cancels | Budget, board, entitlement unchanged, no blocking error, primary CTA usable | catch → no budget change, logged WARN |
| Continue suppressed for unlimited | `accelerated`, `gameOver=true`, `entitlement triade_no_ads=true` | No Continue ad prompt shown; continue rewinds without ad when tapped (or prompt hidden) — ad gateway never called | — |
| Restart / new match | `resetForNewMatch` / `handleRestart` called | `undoHistory` cleared, `freeUsed` reset false, `iapRemaining` reset 0, `unlimited` re-derived from SecureStore entitlement `triade_no_ads` (if held, stays true), purchased `iapRemaining` from previous match NOT carried (die with match) but `triade_undo_3` boolean survives in SecureStore (restorable) | — |
| Busy animation guard | `busyRef=true` during swipe animation | `requestUndo` blocked, no prompt, no purchase | silent |
| Entitlements offline restore | Fresh install, SecureStore has `{triade_no_ads:true}` or `{triade_undo_3:true}`, RevenueCat remote empty/populated | `mergeEntitlements(offline,remote)` retains `true` (never downgrades); offline entitlement remains authoritative; after restore, `unlimited` reflects `triade_no_ads` | no crash, merge pure |
| Undo never alters rules | any undo/purchase | Board `pendingSpawn`, score, merge rules unchanged except rewind; only `undoBudget`/`entitlements` mutate | — |

</intent-contract>

## Code Map

- `triade/src/game/assistance.ts:5-58` -- pure budget authority `UndoBudget {freeUsed,iapRemaining,unlimited}`, `canUndo`/`consumeUndo`/`initialUndoBudget` (extend with constants for pack sizes if needed)
- `triade/src/game/matchOrchestrator.ts:27-230` -- `OrchestratorState` (`undoHistory`,`undoBudget`), `requestUndo`/`confirmUndoAd`/`confirmUndoIap`/`resetForNewMatch` (already correct; add `purchaseUndoPack` + `applyNoAds` helpers)
- `triade/src/game/lanes.ts:31-65` -- `LANE_PROFILES` / `profileForLaneId` lane wall (`clean.canUndo=false, allowAds=false`)
- `triade/App.tsx:252-460` -- current wiring `handleUndoRequest`/`handleUndoAd`/`handleUndoIap`/`handleContinueAd`, `busyRef`/`adBusyRef`/`purchaseBusyRef` guards, `resetAssistance`/`handleRestart` per-match reset, `RewardPrompt` mounts
- `triade/src/services/storage/entitlements.ts:1-53` -- SecureStore mirror authoritative offline `getEntitlements`/`setEntitlements`/`mergeEntitlements` (never downgrades held true)
- `triade/package.json:6-19` -- deps already has `react-native-purchases@10.7.0` (added by 4.3) and `react-native-google-mobile-ads 16.4.0` + `react-native-mmkv`
- `triade/app.json:24-35` -- Expo plugins (expo-secure-store, expo-asset, google-mobile-ads); purchases needs no Expo plugin
- `triade/src/services/monetization/purchaseConfig.ts:1-23` -- pure config `HINT_5_PACK_PRODUCT_ID` / `ENTITLEMENT_HINT_5` (extend with undo 3-pack and no-ads ids)
- `triade/src/services/monetization/purchases.ts:1-150` -- RevenueCat gateway `createPurchasesGateway` dynamic import, never throws, busy guard (extend with `purchaseUndoPack` + `purchaseNoAdsUnlimited` + `restorePurchases` already)
- `triade/__tests__/game/assistance.test.ts` + `triade/__tests__/game/matchOrchestrator.test.ts` + `triade/__tests__/game/matchOrchestrator.rewards.test.ts` -- existing pins for undo budgets (extend for pack/unlimited)
- `triade/__tests__/game/purchases.test.ts` -- gateway contract tests (extend for new product ids)
- `triade/__tests__/ui/components/app.undoAd.test.ts` + `triade/__tests__/ui/components/app.continueAd.test.ts` -- app-level pins for ad-gated undo/continue (extend for entitlement-suppressed prompts)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/services/monetization/purchaseConfig.ts` -- extend pure config: add `UNDO_3_PACK_PRODUCT_ID = 'triade_undo_3_pack'` (overridable via `EXPO_PUBLIC_PURCHASES_UNDO_3` env, validated `^[a-zA-Z0-9_.\-]+$` length ≤100), `NO_ADS_UNLIMITED_PRODUCT_ID = 'triade_no_ads_unlimited'` (overridable via `EXPO_PUBLIC_PURCHASES_NO_ADS` env), `ENTITLEMENT_UNDO_3 = 'triade_undo_3'`, `ENTITLEMENT_NO_ADS = 'triade_no_ads'`, and `TEST_PRODUCT_IDS.undo3Pack` / `TEST_PRODUCT_IDS.noAds` map entries; keep `HINT_5_PACK_PRODUCT_ID` untouched; module stays pure (no RN, no purchases import, testable without native SDK)
- [x] `triade/src/services/monetization/purchases.ts` -- extend gateway: add `async purchaseUndoPack(): Promise<{granted:boolean;error?:string}>` and `async purchaseNoAds(): Promise<{granted:boolean;error?:string}>` alongside existing `purchaseHintPack`, each dynamically `import('react-native-purchases')` inside method (never top-level), using `UNDO_3_PACK_PRODUCT_ID` / `NO_ADS_UNLIMITED_PRODUCT_ID` via `purchaseStoreProduct` or fallback `purchasePackage` via `getOfferings`, on success merge entitlements via `getEntitlements`/`setEntitlements`+`mergeEntitlements` (never downgrades) and set `triade_undo_3:true` or `triade_no_ads:true` respectively, verify SecureStore after set and return `persist_failed` on failure, never throw (return `granted:false` + WARN); single module-global `busy` guard shared across all purchase methods (second concurrent purchase returns `granted:false,busy`); keep `restorePurchases` merging new entitlement keys; add `__resetPurchasesForTests` reset (already exists) covers busy
- [x] `triade/src/game/assistance.ts` -- ensure `initialUndoBudget` remains pure; optionally export `UNDO_PACK_SIZE = 3` constant for orchestrator to consume (if adding, keep pure, no RN); verify `canUndo` already handles `unlimited` and `iapRemaining` correctly (no change needed unless constant added)
- [x] `triade/src/game/matchOrchestrator.ts` -- add `UNDO_PURCHASE_INCREMENT = 3` (or import `UNDO_PACK_SIZE`) and pure helpers `purchaseUndoPack(state, profile): OrchestratorState` that if `!profile.canUndo` returns state unchanged else returns `{...state, undoBudget:{...state.undoBudget, iapRemaining: Math.min(999, state.undoBudget.iapRemaining+3)}}` (cap 999, safe integer guard) and `applyNoAds(state, profile): OrchestratorState` that if `!profile.canUndo` returns state unchanged else returns `{...state, undoBudget:{...state.undoBudget, unlimited:true}}`; keep `confirmUndoAd`/`confirmUndoIap` unchanged; ensure `resetForNewMatch` still resets to `initialUndoBudget()` but note App layer will re-apply `unlimited` from entitlements after reset (do not mutate orchestrator to read SecureStore — keep pure); document that purchased `iapRemaining` dies with match
- [x] `triade/App.tsx` -- wire purchases + entitlement-derived unlimited + prompt suppression: add `entitlements` state or ref loaded via `getEntitlements` on mount and after each purchase/restore, derive `hasNoAds = entitlements[ENTITLEMENT_NO_ADS]===true` and `hasUndoPack = entitlements[ENTITLEMENT_UNDO_3]===true` (debug only); hydrate `undoBudget` from entitlements on mount and after `handleRestart` (if `hasNoAds` then `unlimited:true` else `false`), and after `restorePurchases`; add `handleUndoPurchase` and `handleNoAdsPurchase` async using `purchaseBusyRef`+`adBusyRef` guards (single monetization at a time), check `__triadePurchasesMock` global hook first then `createPurchasesGateway()`, `await gateway.purchaseUndoPack()` or `purchaseNoAds()`, only on `granted===true` apply orchestrator `purchaseUndoPack` / `applyNoAds` via functional `setUndoBudget` to avoid stale closure, and update local `entitlements` state; on `granted===false` leave budget/entitlements unchanged, no blocking error. Suppress ad prompts when `hasNoAds`: gate `RewardPrompt` mount for undo (`showUndoPrompt && !hasNoAds`) and make `handleUndoRequest` immediate when `hasNoAds` (directly call `orchestratorConfirmUndoAd` or shared consume path without gateway, rewind immediately, no ad call); similarly gate `GameOverOverlay` Continue ad path — when `hasNoAds` the Continue slot either hidden or its `onContinueAd` becomes direct `orchestratorConsumeContinueAd` without gateway (add `handleContinueAd` early bypass if hasNoAds). Keep existing `handleUndoAd`/`handleContinueAd` ad-gated paths for non-unlimited owners, keep `adBusyRef` double-tap guard, keep `busyRef` gate, keep `handleUndoIap` stub path (but now purchases gateway is the primary IAP path; stub remains for fallback). Ensure `handleRestart` re-derives `unlimited` from entitlements. Do not introduce forced ads or interstitials; do not show ad prompt to unlimited owners; do not allow Clean lane to purchase/undo (lane wall).
- [x] `triade/__tests__/game/purchases.test.ts` -- extend gateway contract tests: default undo and no-ads product ids are test ids, env overrides respected, `purchaseUndoPack`/`purchaseNoAds` return granted:false when native module missing (no throw), second concurrent purchase guarded (busy), `purchaseConfig` module pure — no RN, restore merge never downgrades held true
- [x] `triade/__tests__/game/matchOrchestrator.undoPack.test.ts` -- new pure orchestrator pins: `canUndo` with `freeUsed=true, iapRemaining=0, unlimited=false` false, with `iapRemaining=3` true and consumes 1 per `confirmUndoIap`-like path, `purchaseUndoPack` increments by 3 only for accelerated, clean no-op, `applyNoAds` sets unlimited true only for accelerated, busy blocks request but not purchase, `resetForNewMatch` resets to `freeUsed:false,iapRemaining:0,unlimited:false` (App re-applies from entitlements), second undo after purchase respects budget
- [x] `triade/__tests__/ui/components/app.undoPack.test.ts` -- new app-level pins: Accelerated shows purchase affordance when undo budget exhausted; purchase via mock gateway increments `undoBudget.iapRemaining` by 3 and sets entitlement `triade_undo_3`; purchase fail/cancel leaves budget unchanged; No Ads purchase via mock sets `unlimited:true` and suppresses future ad prompts (RewardPrompt not mounted, undo becomes immediate rewind without ad call, continue ad prompt suppressed); Clean never mounts purchase/undo prompts; restart after undo purchase resets `iapRemaining` to 0 (die with match) but `triade_undo_3` entitlement remains in SecureStore and `unlimited` stays true if `triade_no_ads` held, otherwise false; purchase busy double-tap does not double-grant; ad busy still guards undo ad path

**Acceptance Criteria:**
- Given an Accelerated-lane match with a mergeable move history and `undoBudget={freeUsed:false}`, when the player taps undo, then a discrete Reward Prompt appears (Ver anúncio first / Comprar / Cancelar) and completing the rewarded ad rewinds exactly and flips `freeUsed:true`
- Given an Accelerated match where `freeUsed=true,iapRemaining=0,unlimited=false` and history>0, when the player purchases the Undo 3-pack (US$0.99) and the purchase grants, then entitlement `triade_undo_3` is stored in SecureStore (never downgraded) and `undoBudget.iapRemaining` increases by 3 in the current match; the next undo consumes 1 and rewinds
- Given an Accelerated match, when the player purchases No Ads + Unlimited Undo (US$2.99) and the purchase grants, then entitlement `triade_no_ads` is stored in SecureStore (never downgraded), `undoBudget.unlimited` becomes true in the current match, and subsequent undo/continue taps never show an ad prompt — undo rewinds immediately without calling the ad gateway
- Given the Undo 3-pack or No Ads purchase fails or is cancelled, when the result returns, then the board and undo budget remain unchanged, no entitlement is set, no blocking error appears and the primary CTA remains usable
- Given a match on the Clean lane, when undo is attempted or a purchase is triggered, then no highlight or purchase code path runs (lane wall) and no monetization state mutates
- Given undos have been consumed or purchased in a match, when the game restarts (`resetForNewMatch`/`handleRestart`), then `undoHistory` clears and `undoBudget` resets to `initialUndoBudget` re-derived from entitlements (so `unlimited` stays true if `triade_no_ads` held, `iapRemaining` resets to 0 — purchased undos die with match while entitlement booleans survive in SecureStore and are recoverable via restore/merge never downgraded)
- Given any undo or purchase, then board `pendingSpawn`, score and merge/spawn rules remain unchanged (P3)

## Spec Change Log

## Review Triage Log

## Design Notes

Gateway must be lazily imported (`await import('react-native-purchases')` inside method) so `npm test` without native module still runs. Suggested minimal shape:

```ts
export async function purchaseUndoPack(): Promise<boolean> {
  try { const { default: Purchases } = await import('react-native-purchases'); await Purchases.purchaseStoreProduct(UNDO_3_PACK_PRODUCT_ID); return true; }
  catch { return false; }
}
```

Keep App's snapshot shape `{ game:{board, pendingSpawn}, match, matchStats }` identical to existing (see `App.tsx:80 Snapshot`). Do not introduce `src/state` board storage. Product IDs `triade_undo_3_pack` and `triade_no_ads_unlimited` are test ids; real App Store Connect products must be created by operator (awaiting-operator). Unlimited is entitlement-driven, not budget-persistent.

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (new ~20 pins for undo IAP/no-ads, no existing failures)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean

## Auto Run Result

- Summary: IAP Undo 3-pack (+3 iapRemaining via RevenueCat) and No Ads + Unlimited Undo (unlimited=true, suppresses all rewarded-ad prompts) wired via RevenueCat 10.7.0 with SecureStore entitlement mirror authoritative offline; Clean lane wall never routes to purchases, per-match budgets die with match, unlimited re-derived from entitlements, P3 intact.
- FilesChanged: `triade/src/services/monetization/purchaseConfig.ts` (add undo 3-pack + no-ads ids/entitlements, env overrides), `triade/src/services/monetization/purchases.ts` (add purchaseUndoPack + purchaseNoAds, shared busy, dynamic import, merge never downgrades), `triade/src/game/assistance.ts` (add UNDO_PACK_SIZE), `triade/src/game/matchOrchestrator.ts` (add purchaseUndoPack + applyNoAds, cap 999), `triade/App.tsx` (hydrate entitlements, hasNoAds suppression, handleUndoPurchase/handleNoAdsPurchase with mocks + busy guards, undo purchase prompt mounts), `triade/__tests__/game/matchOrchestrator.undoPack.test.ts` (new 13 pins), `triade/__tests__/ui/components/app.undoPack.test.ts` (new 8 pins)
- Review: patch 0, defer 0, reject 0 (awaiting-operator; no code review blockers)
- FollowupReview: false (narrow monetization surface, awaiting-operator for vendor console)
- Verification: `npm --prefix triade test` 611 pass, `npm exec tsc --noEmit --project triade/tsconfig.json` clean, `npm exec tsc --noEmit --project triade/tsconfig.test.json` clean, undo fail leaves budget unchanged via mock, Clean lane wall verified, purchase busy double-tap blocked verified, unlimited suppresses ad prompts verified
- Risks: Real App Store products + RevenueCat offering require vendor console publish (owned by awaiting-operator); purchases gateway busy is module-global singleton (1 purchase at a time); actual device purchase flow remains manual-validation on physical device
- OperatorActions: 4 vendor-console steps enumerated in frontmatter `operator_actions`

