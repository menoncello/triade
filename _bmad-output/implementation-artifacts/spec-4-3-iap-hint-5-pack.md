---
title: '4.3 IAP Hint 5-pack'
type: 'feature'
created: '2026-08-28'
status: 'awaiting-operator'
review_loop_iteration: 0
baseline_revision: '149da731c67b346cf2b8c4ffefc8bfd384af7b8a'
final_revision: '0bebef7a1f85690e55310cee38e6b59ecfdfaf65'
followup_review_recommended: false
context: []
warnings: []
operator_actions:
  - 'Create App Store Connect In-App Purchase product triade_hint_5_pack (Type: Consumable, Price: US$0.99 / R$4.90, Reference Name: Hint 5-pack) and associate it with the Tríade app bundle'
  - 'Configure RevenueCat dashboard: create Product triade_hint_5_pack, link to App Store product, create Entitlement triade_hint_5, and add product to current Offering/Package'
  - 'Set RevenueCat API keys in Expo env: EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY (or EXPO_PUBLIC_PURCHASES_HINT_5 if overriding product ID) and redeploy build'
  - 'Validate purchase on a physical iOS device via sandbox/TestFlight: buy Hint 5-pack in Accelerated lane, verify hintBudget increments by 5 and entitlement persists via restore'
---

<intent-contract>

## Intent

**Problem:** Accelerated lane hints are implemented with a per-match budget but have no purchase path — players cannot buy the Hint 5-pack (US$0.99/R$4.90) to replenish hints when stuck.

**Approach:** Wire a RevenueCat purchases gateway (`react-native-purchases 10.7.0`) with SecureStore entitlement mirror authoritative offline, gate hint availability by `LaneProfile` (Clean never hints), and make a successful purchase add 5 hints to the Accelerated per-match `HintBudget` without ever altering spawn/merge/score rules.

## Boundaries & Constraints

**Always:** Engine stays pure (no RN imports, ADR-01); orchestrator `src/game/matchOrchestrator.ts` + `assistance.ts` remain the only hint-budget authority (`canHint`/`consumeHint`/`requestHint`, memory budget dies with match via `resetForNewMatch`, ADR-02); lane wall via `LaneProfile` — Clean `{canHint:false, allowAds:false}` never hints and never routes to purchases; hint (`findMergeablePair`) highlights exactly one valid mergeable pair on the board and never suggests a direction nor reveals `pendingSpawn` value; entitlements (`src/services/storage/entitlements.ts`) mirrored in SecureStore authoritative offline and `mergeEntitlements` never downgrades a held entitlement (ADR-02); monetization lives in app layer (`src/services/monetization`) never engine; P3: nothing purchasable alters spawn/merge/score.

**Block If:** Needs real App Store Connect product creation, RevenueCat dashboard product/offering configuration, store credentials / API key publish, or purchase approval beyond test stub/mock — agent will implement with test product id and `EXPO_PUBLIC_` env override and finalize via `awaiting-operator` (never `blocked`).

**Never:** Touch `src/engine` pure files; introduce interstitial/forced ads or show ads during gameplay; write leaderboard/per-lane best (owned by 3.4); build undo 3-pack / No Ads unlimited or full restore orchestration (owned by 4.4/4.5 — keep stubs minimal, only hint pack here); store per-match hint count across restart (it dies with match); duplicate merge/spawn/score rules in UI; allow Clean lane to hint or purchase.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean lane hint attempt | `activeLane=clean`, board with mergeable pair, budget remaining>0 | `canHint` false, no highlight, no purchase prompt, no monetization code path | no error |
| Accelerated hint with budget | `accelerated`, `hintBudget.remaining>0`, board has mergeable pair, `busy=false` | `requestHint` finds pair via `findMergeablePair`, consumes 1, `hintHighlight` set to `[[r1,c1],[r2,c2]]`; pair each step satisfies `canMerge`; highlight never encodes direction nor spawn value | rejected if no pair → no consumption |
| Accelerated hint no pair | `accelerated`, board has no mergeable pair (e.g. no `1+2` nor `>=3` equal) | `canHint` false, no highlight, no budget consumption | silent |
| Accelerated hint budget empty | `accelerated`, `hintBudget.remaining===0` | `canHint` false, highlight not set; UI may offer purchase path (buy 5) but not auto-consume | silent |
| Purchase Hint 5-pack success | `accelerated`, `hintBudget.remaining===0`, purchase via `purchaseHintPack()` returns granted | Entitlement `triade_hint_5` set true in SecureStore (merge never downgrades), `hintBudget.remaining` +=5 (current match), next `requestHint` succeeds | never throws; store error logged |
| Purchase fail/cancel | purchase returns not granted / throws / user cancels | Budget and board unchanged, entitlement not set, no blocking error, primary CTA usable | catch → no budget change, logged WARN |
| Hint consumed | `accelerated`, `remaining=3`, board pair `[[0,0],[0,1]]`, `requestHint` ok | `remaining=2`, highlight set; hintHighlight cleared on next effective move via `clearHintHighlight` | — |
| Restart / new match | `resetForNewMatch` called | `hintBudget` reset to `initialHintBudget(5)`, `hintHighlight=null`, `bannerDismissed` reset; purchased hints from previous match are NOT carried (die with match) but entitlement boolean survives in SecureStore (restorable) | — |
| Busy animation guard | `busyRef=true` during swipe animation | `requestHint` blocked, no consumption, no highlight | silent |
| Entitlements offline restore | Fresh install, SecureStore has `{triade_hint_5:true}`, RevenueCat remote empty or populated | `mergeEntitlements(offline, remote)` retains `true` (never downgrades); offline entitlement remains authoritative | no crash, merge pure |
| Hint never alters rules | any hint highlight/purchase | Board, `pendingSpawn`, score, merge rules unchanged; only `hintHighlight` and `hintBudget` mutate | — |

</intent-contract>

## Code Map

- `triade/src/game/assistance.ts:9-78` -- pure budget authority `HintBudget {remaining}`, `canHint`/`consumeHint`/`findMergeablePair`/`initialHintBudget(5)` (hint 5-pack replenishes this)
- `triade/src/game/matchOrchestrator.ts:46-145` -- `OrchestratorState` (`hintBudget`, `hintHighlight`), `requestHint`/`clearHintHighlight`/`resetForNewMatch` (already present, per-match memory die-with-match)
- `triade/src/game/lanes.ts:31-65` -- `LANE_PROFILES` / `profileForLaneId` lane wall (`clean.canHint=false, allowAds=false`)
- `triade/App.tsx:303-361` -- current wiring `handleHint` (`orchestratorRequestHint`, `setHintBudget`/`setHintHighlight`, `busyRef` gate), `resetAssistance`/`handleRestart` per-match reset, `Hud`/`GameBoard` hintHighlight passthrough
- `triade/src/services/storage/entitlements.ts:1-53` -- SecureStore mirror authoritative offline `getEntitlements`/`setEntitlements`/`mergeEntitlements` (never downgrades held true)
- `triade/package.json:6-19` -- deps; needs `react-native-purchases@10.7.0` added (Pinned Version Matrix), keep `react-native-google-mobile-ads 16.4.0` and existing plugins untouched
- `triade/app.json:24-35` -- Expo plugins (expo-secure-store, expo-asset, google-mobile-ads); purchases needs no Expo plugin but verify no duplicate
- `triade/src/services/monetization/*` -- NEW `purchaseConfig.ts` (pure product ids) + `purchases.ts` (RevenueCat gateway dynamic import, never throws) alongside existing `adsConfig.ts`/`rewardedAds.ts`
- `triade/src/ui/Hud.tsx` + `triade/src/render/GameBoard.tsx` -- consume `hintHighlight` (no logic change, verify highlight rendering stays pure)
- `triade/__tests__/game/assistance.test.ts` + `triade/__tests__/game/matchOrchestrator.test.ts` -- existing pins for hint budgets (extend for purchase replenish)

## Tasks & Acceptance

**Execution:**
- [x] `triade/package.json` -- add `react-native-purchases@10.7.0` to dependencies (pinned, Pinned Version Matrix) and keep `npm --prefix triade install` lockfile coherent; do not add Firebase/Crashlytics here (owned by Epic 10)
- [x] `triade/src/services/monetization/purchaseConfig.ts` -- create pure config module: `HINT_5_PACK_PRODUCT_ID = 'triade_hint_5_pack'` (overridable via `EXPO_PUBLIC_PURCHASES_HINT_5` env), `ENTITLEMENT_HINT_5 = 'triade_hint_5'`, `TEST_PRODUCT_IDS` map; re-exports; validatable by tests without importing native SDK (no RN import, no purchases import at top-level)
- [x] `triade/src/services/monetization/purchases.ts` -- create thin RevenueCat gateway: exports `createPurchasesGateway(): PurchasesGateway` with `async purchaseHintPack(): Promise<{ granted: boolean; error?: string }>` and `async restorePurchases(): Promise<{ entitlements: Entitlements }>` and `__resetPurchasesForTests`. Dynamically import `react-native-purchases` inside methods (never at top-level so tests without native module don't crash), use `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `ANDROID` env if present (test stub returns not-granted), purchase flow `Purchases.purchaseStoreProduct` or `purchasePackage` gated by `HINT_5_PACK_PRODUCT_ID`, on success merge entitlements via `getEntitlements`/`setEntitlements` + `mergeEntitlements` (never downgrades held true) and set `triade_hint_5:true`; on any import/config/failure return `{granted:false}` and log WARN, never throw; single concurrency guard (second concurrent purchase returns granted:false busy). Keep `console.warn` only, no UI import.
- [x] `triade/src/game/assistance.ts` -- no change required except ensure `initialHintBudget(5)` remains; optionally export `HINT_PACK_SIZE = 5` constant for purchases to consume (if adding, keep pure, no RN); verify `findMergeablePair` stays the only hint source (never direction/spawn)
- [x] `triade/src/game/matchOrchestrator.ts` -- add `purchaseHintPack(state: OrchestratorState, profile: LaneProfile): OrchestratorState` pure helper that if `!profile.canHint` returns state unchanged, else returns `{...state, hintBudget: { remaining: state.hintBudget.remaining + 5 }}` (additive, capped? no cap, simple +5). Keep `requestHint` unchanged; document that purchase does not auto-highlight. Ensure `resetForNewMatch` still resets to `initialHintBudget(5)` (purchase hints die with match, entitlement boolean survives in SecureStore — not in budget). Do not mutate per-match budgets to survive restart.
- [x] `triade/App.tsx` -- wire purchase: add `handleHintPurchase` async using `adBusyRef`-like `purchaseBusyRef` guard (single monetization at a time across purchases if needed), check `__triadePurchasesMock` global hook first then `createPurchasesGateway()`, `await gateway.purchaseHintPack()`, only on `granted===true` apply orchestrator `purchaseHintPack` to increment `hintBudget` (keep `hintHighlight` unchanged, entitlement already persisted by gateway); on `granted===false` leave budget unchanged (no consumption, no entitlement), no blocking error. Wire `Hud` or `AcceleratedAids` purchase affordance: when `activeLaneId==='accelerated' && !canHintDerived && hintHighlight===null` (i.e. hints exhausted but board has pair) optionally show a discreet "Comprar 5 dicas" slot or reuse `RewardPrompt` title "Sem dicas — comprar 5?" with `onAd` → no-op and `onIap` → `handleHintPurchase` (if UI added, keep lane wall: Clean never mounts it). Keep existing `handleHint` untouched and gated by `activeProfile.canHint` + `busyRef`. Ensure `handleRestart`/`resetAssistance` still reset hintBudget via `initialHintBudget(5)`. Do not introduce forced ads or interstitials.
- [x] `triade/__tests__/game/purchases.test.ts` -- unit tests for gateway contract: default product id is test id, env override respected, `purchaseHintPack` returns granted:false when native module missing (no throw), second concurrent purchase guarded (busy), `purchaseConfig` module pure — no RN, restore merge never downgrades held true
- [x] `triade/__tests__/game/matchOrchestrator.hints.test.ts` -- pure orchestrator pins: `canHint` true only when accelerated + remaining>0 + pair exists; `requestHint` consumes 1 and sets highlight to valid `canMerge` pair, never encodes direction/spawn; `purchaseHintPack` increments remaining by 5 only for accelerated, clean no-op, busy blocks request but not purchase, `resetForNewMatch` resets to 5 and clears highlight, second hint after purchase respects budget
- [x] `triade/__tests__/ui/components/app.hintIap.test.ts` -- app-level pins: Accelerated shows hint UI, hint highlights one valid mergeable pair and never direction/spawn; when hints exhausted, purchase via mock gateway increments hintBudget; purchase fail/cancel leaves budget unchanged; Clean never mounts hint purchase; restart after purchase resets hints to 5 (purchase hints die with match) but entitlement remains in SecureStore mock; purchase busy double-tap does not double-grant

**Acceptance Criteria:**
- Given an Accelerated-lane match with a mergeable pair on board and `hintBudget.remaining>0`, when the player requests a hint, then one valid mergeable pair is highlighted (satisfying `canMerge`) and the budget decrements by 1, without suggesting a direction or revealing `pendingSpawn`
- Given an Accelerated match where `hintBudget.remaining===0`, when the player purchases the Hint 5-pack (US$0.99/R$4.90) and the purchase grants, then the entitlement `triade_hint_5` is stored in SecureStore (never downgraded on merge) and the per-match `hintBudget.remaining` increases by 5 in the current match
- Given the Hint 5-pack purchase fails or is cancelled, when the result returns, then the board and hint budget remain unchanged, no entitlement is set, no blocking error appears and the primary CTA remains usable
- Given a match on the Clean lane, when a hint is attempted or a purchase is triggered, then no highlight or purchase code path runs (lane wall) and no monetization state mutates
- Given hints have been consumed or purchased in a match, when the game restarts (`resetForNewMatch`/`handleRestart`), then `hintBudget` resets to `initialHintBudget(5)` and `hintHighlight` clears — per-match count dies with the match while the entitlement boolean survives in SecureStore and is recoverable via restore/merge (never downgraded)
- Given any hint highlight or hint purchase, then board, `pendingSpawn`, score and merge/ spawn rules remain unchanged (P3)

## Spec Change Log


## Review Triage Log

### 2026-08-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 2, medium 3, low 0)
- defer: 4: (high 2, medium 1, low 1)
- reject: 7
- addressed_findings:
  - `[high] [patch] Hint purchase prompt shown when no mergeable pair — gated prompt on hintBudget remaining===0 && findMergeablePair !== null to avoid useless purchase offer`
  - `[high] [patch] Stale closure after async purchase — switched handleHintPurchase to functional setHintBudget to avoid overwriting fresher budget after await`
  - `[medium] [patch] Dual source of truth for pack size — purchaseHintPack now uses HINT_PACK_SIZE constant (single source)`
  - `[medium] [patch] Purchases gateway persist failure still granted true — added verification of SecureStore after set and return persist_failed on failure`
  - `[medium] [patch] purchaseConfig env product ID not validated — added regex ^[a-zA-Z0-9_.\-]+$ and length check`
  - `[high] [defer] Consumable modeled as forever entitlement — per spec entitlement boolean survives restore, per-match budget dies; RevenueCat consumable vs boolean tracked as deferred design note`
  - `[high] [defer] Offline mirror forgeable via SecureStore — client authoritative, inherent to SecureStore design, deferred`
  - `[medium] [defer] Unbounded hint stacking — spec allows no cap, is intentional, deferred`
  - `[low] [defer] Hint highlight invariant verified no spawn/merge/score mutation — P3 upheld, no action`

## Auto Run Result

- Summary: IAP Hint 5-pack wired via RevenueCat (react-native-purchases 10.7.0) with SecureStore entitlement mirror authoritative offline; hint budget replenishes +5 in Accelerated lane only, Clean lane wall never hints/purchases, hint highlights one valid mergeable pair never direction/spawn, nothing alters spawn/merge/score.
- FilesChanged: `triade/package.json` (add react-native-purchases 10.7.0), `triade/package-lock.json` (lockfile), `triade/src/services/monetization/purchaseConfig.ts` (new pure config), `triade/src/services/monetization/purchases.ts` (new gateway dynamic import busy guard never throws), `triade/src/game/assistance.ts` (add HINT_PACK_SIZE), `triade/src/game/matchOrchestrator.ts` (add purchaseHintPack + HINT_PURCHASE_INCREMENT), `triade/App.tsx` (handleHintPurchase with purchaseBusyRef + __triadePurchasesMock hook + gated RewardPrompt when hints exhausted and pair exists), `triade/__tests__/game/purchases.test.ts` (new 10 pins), `triade/__tests__/game/matchOrchestrator.hints.test.ts` (new 13 pins), `triade/__tests__/ui/components/app.hintIap.test.ts` (new 8 pins)
- Review: patch 5, defer 4, reject 7
- FollowupReview: false (patch-limited, narrow monetization surface, no API/broad impact, manual device purchase validation remains)
- Verification: `npm --prefix triade test` 589 pass, `npx --prefix triade tsc -p triade/tsconfig.json --noEmit` clean, `npx --prefix triade tsc -p triade/tsconfig.test.json --noEmit` clean, hint purchase fail leaves budget untouched via mock, Clean lane wall verified, purchase busy double-tap blocked verified
- Risks: Real App Store product + RevenueCat offering require vendor console publish (owned by awaiting-operator); purchases gateway busy is module-global singleton (1 purchase at a time); actual device purchase flow remains manual-validation on physical device

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (new ~31 pins for hint IAP, no existing failures)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean


## Design Notes

Gateway must be lazily imported (`await import('react-native-purchases')` inside method) so `npm test` without native module still runs. Suggested minimal shape:

```ts
export async function purchaseHintPack(): Promise<boolean> {
  try { const { default: Purchases } = await import('react-native-purchases'); await Purchases.purchaseStoreProduct(HINT_5_PACK_PRODUCT_ID); return true; }
  catch { return false; }
}
```

Keep App's snapshot shape `{ game:{board, pendingSpawn}, match, matchStats }` identical to existing (see `App.tsx:78 Snapshot`). Do not introduce `src/state` board storage. Product ID `triade_hint_5_pack` is test id; real App Store Connect product must be created by operator (awaiting-operator).

