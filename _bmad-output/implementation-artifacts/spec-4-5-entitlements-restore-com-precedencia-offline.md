---
title: '4.5 Entitlements + restore com precedencia offline'
type: 'feature'
created: '2026-08-28'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'c1130632a80f2bbbbc6f1e636674c56907666e1d'
final_revision: '92e6a7745cfd7b1f8ea9604f2ebf23cfd06f4f9b'
---

<intent-contract>

## Intent

**Problem:** Purchases from 4.3/4.4 persist entitlement booleans in SecureStore but there is no user-initiated restore path and no unified offline-authoritative reconciliation — a reinstall loses UI affordance to recover Hint/Undo/No Ads, and a remote reconciliation that downgrades a held entitlement would corrupt what the player paid for.

**Approach:** Expose a lightweight, non-blocking restore gateway (`restorePurchases`) that reconciles RevenueCat remote entitlements with the SecureStore mirror via `mergeEntitlements` (offline `true` never downgraded), surfaces a "Restaurar compras" action that never blocks gameplay, and keeps per-match budgets (`undoHistory`, `undoBudget.iapRemaining`, `hintBudget`, `continueBudget`) memory-only so restore never revives consumed per-match counts.

## Boundaries & Constraints

**Always:** Engine stays pure (no RN imports, ADR-01); orchestrator `src/game/matchOrchestrator.ts` + `assistance.ts` remain the only budget authority (memory, dies with match via `resetForNewMatch`, ADR-02); `src/services/storage/entitlements.ts` `mergeEntitlements` stays authoritative offline — iteration order `remote` then overwrite with `offline===true` (never downgrades, ADR-02); monetization lives in app layer (`src/services/monetization`) never engine (ADR-02); restore/purchases never throw (return `granted:false`/entitlements offline), never block board rendering or input; P3 — nothing purchasable alters spawn/merge/score; per-match budgets never persisted nor restored.

**Block If:** Needs real App Store Connect product creation / RevenueCat dashboard entitlement mapping / API key publish beyond `EXPO_PUBLIC_` env test stubs — agent will keep test product ids (`triade_hint_5_pack`, `triade_undo_3_pack`, `triade_no_ads_unlimited`) and RevenueCat dynamic import stub and finalize via `awaiting-operator` semantics already owned by 4.3/4.4 (never `blocked`); needs domain purchase/DNS or vendor console click-through beyond repo.

**Never:** Touch `src/engine` pure files; persist per-match counters (`iapRemaining`, `hintBudget.remaining`, `continueBudget.used`, `freeUsed`) to SecureStore or restore them; downgrade a held entitlement when remote is empty/false; introduce interstitial/forced ads; write leaderboard/per-lane best (3.4); duplicate purchase logic already in `purchases.ts` (reuse `createPurchasesGateway`/`mergeEntitlements`/`getEntitlements`/`setEntitlements`); block gameplay with a loading spinner or error dialog during restore.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Offline fresh install has entitlements | SecureStore `{triade_hint_5:true, triade_no_ads:true}`, RevenueCat unreachable/offline | `getEntitlements` returns offline set; `hasNoAds` true on launch, game playable, undo/hint eligible per budgets, no network required | never throw, return offline |
| Restore on fresh install with remote entitlements | Offline `{}`, remote `customerInfo.entitlements.active={triade_hint_5, triade_undo_3}` | `restorePurchases` merges and persists `{triade_hint_5:true, triade_undo_3:true}` (offline+remote), returns merged, App hydrates `entitlements`, `unlimited` false (no_ads missing) | remote unreachable → return offline, no throw |
| Restore when offline already has true, remote claims false/empty | Offline `{triade_no_ads:true}`, remote `{}` or `{triade_no_ads:false}` | Merged `{triade_no_ads:true}` — held true survives, never downgraded (ADR-02) | no crash, persist merged |
| Restore merges remote-only entitlement | Offline `{}`, remote `{triade_hint_5:true}` | Adopts remote: merged `{triade_hint_5:true}` and persisted | — |
| Per-match budgets not restored | Match with `undoBudget={freeUsed:true,iapRemaining:1}`, `hintBudget={remaining:2}`, `continueBudget={used:true}` before restore | After `restorePurchases`, `entitlements` merged but `undoHistory`, `undoBudget.iapRemaining`, `hintBudget`, `continueBudget` unchanged; after `resetForNewMatch`/`handleRestart` all reset to `initial*` re-derived from `triade_no_ads` only (`unlimited` flag) | — |
| Restore never blocks gameplay | Restore called while `screen==='playing'`, board interactive | Board still swipable, `busyRef` independent of restore busy; restore resolves async, no overlay spinner blocking moves; fail leaves board/budgets/entitlements unchanged | never throw, WARN only |
| Concurrent restore/purchases guarded | `restorePurchases` or `purchase*` already `busy===true`, second call starts | Second call returns `{granted:false, error:'busy'}` or `{entitlements: offline}` without invoking SDK, busy reset in finally | no double-persist |
| No downgrade on malformed remote values | Remote `{triade_hint_5:null, triade_no_ads:'yes'}` | `mergeEntitlements` drops non-boolean, offline `true` still wins; merged contains only boolean trues | no type error |
| Entitlement never alters rules | Any restore | Board `pendingSpawn`, score, merge/spawn rules unchanged; only `entitlements` and derived `undoBudget.unlimited` mutate | — |

</intent-contract>

## Code Map

- `triade/src/services/storage/entitlements.ts:1-53` -- SecureStore mirror authoritative offline `getEntitlements`/`setEntitlements`/`mergeEntitlements` (never downgrades held true) — reuse as-is, verify ADR-02 ordering
- `triade/src/services/monetization/purchaseConfig.ts:1-64` -- pure config `ENTITLEMENT_HINT_5/_UNDO_3/_NO_ADS` + product ids, env overrides, `TEST_PRODUCT_IDS` — no change except verify all three entitlements present
- `triade/src/services/monetization/purchases.ts:1-271` -- RevenueCat gateway `createPurchasesGateway` dynamic import, `purchaseHintPack`/`purchaseUndoPack`/`purchaseNoAds` + `restorePurchases` + `__resetPurchasesForTests` with busy guard and mergeEntitlements reconciliation — extend restore path to be share-busy-aware and mock-hookable, no per-match persistence
- `triade/src/game/assistance.ts:5-58` -- pure budgets `UndoBudget`/`HintBudget`/`ContinueBudget`, `initial*` helpers — budgets are memory-only, never imported in services layer (boundary)
- `triade/src/game/matchOrchestrator.ts:37-228` -- `OrchestratorState` + `resetForNewMatch` re-derives budgets to `initial*` (only `unlimited` re-derived from entitlements at App layer) — verify restore does not call orchestrator beyond optional App re-hydration
- `triade/App.tsx:68-596` -- current wiring `entitlements` state hydrated via `getEntitlements` on mount, `hasNoAds` derived, `handleHintPurchase`/`handleUndoPurchase`/`handleNoAdsPurchase` with `__triadePurchasesMock` hook and `purchaseBusyRef` guard — add `handleRestorePurchases` plus affordance (Restaurar compras) without blocking gameplay; `resetAssistance`/`handleRestart` re-derive `unlimited` from entitlements
- `triade/src/ui/LaneSelectScreen.tsx:1-80` -- Lane Select surface where Restore button can live alongside lane cards (settings/main menu affordance)
- `triade/__tests__/storage/entitlements.test.ts` + `triade/__tests__/game/purchases.test.ts` + `triade/__tests__/ui/components/app.*` -- existing pins for merge never downgrades and gateway busy/restore — extend for 4.5

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/services/monetization/purchases.ts` -- harden restore for 4.5 without breaking 4.3/4.4 contracts: ensure `restorePurchases` shares the module-global `busy` guard with purchase methods (second concurrent `restorePurchases`/`purchase*` while busy returns offline entitlements or `granted:false` with `busy`, never invokes SDK twice); make restore mock-hookable via `globalThis.__triadePurchasesMock?.restorePurchases` (check before dynamic import, like `purchase*` mocks in App.tsx) so tests can inject `customerInfo` without native SDK; keep dynamic `await import('react-native-purchases')` inside method, never top-level; on success derive `remote: Entitlements` from `customerInfo.entitlements.active` keys (boolean `true`), merge with offline via `mergeEntitlements` (offline `true` never downgraded), persist via `setEntitlements(merged)`, return `{entitlements: merged}`; on import/config/failure return `{entitlements: offline}` and WARN, never throw; do not read/write per-match budgets.
- [x] `triade/App.tsx` -- wire non-blocking restore: add `handleRestorePurchases` async that checks `purchaseBusyRef`/`adBusyRef` single-monetization guard (if busy return offline entitlements without SDK call), checks `__triadePurchasesMock?.restorePurchases` hook first then `createPurchasesGateway().restorePurchases()`, awaits, then `setEntitlements(result.entitlements)` and re-derives `undoBudget.unlimited` from `result.entitlements[ENTITLEMENT_NO_ADS]===true` (functional `setUndoBudget` or direct set; only `unlimited` field may flip, `iapRemaining`/`freeUsed` stay as-is — per-match budgets die with match only via `resetForNewMatch`/`handleRestart`); never show a blocking spinner or error dialog — on fail leave `entitlements` as offline, board playable, no thrown error; surface a lightweight affordance: add a Pressable/Text "Restaurar compras" in `LaneSelectScreen` (or in the `playing` menu slot) wired to `handleRestorePurchases`, with `accessibilityLabel="Restaurar compras"` and `accessibilityRole="button"`, `hitSlop`/44pt target, visible in both lanes, disabled while `purchaseBusyRef`/`adBusyRef` busy; hydration on mount already authoritative (`getEntitlements` before any network), keep it; do not introduce interstitial/forced ads or per-match persistence.
- [x] `triade/src/ui/LaneSelectScreen.tsx` -- if App affordance is routed through this screen, add props `onRestorePurchases?: () => void | Promise<void>` and `restoreBusy?: boolean`, render the "Restaurar compras" pressable (min 44pt height, centered, below lane cards / Jogar) only when `onRestorePurchases` is supplied; style matches existing secondary button (border, no ad copy), testable via `accessibilityLabel`; keep lane cards/Game tones untouched; if App instead renders its own restore affordance directly, this task becomes no-op but keep the prop for future Settings — either implementation satisfies AC as long as button exists and is not lane-gated.
- [x] `triade/__tests__/storage/entitlements.restore.test.ts` -- new pure unit pins for offline precedence (or extend `entitlements.test.ts`): SecureStore `mergeEntitlements` never downgrades when remote empty/false, remote-only adoption, malformed non-boolean drop, offline wins over remote false for all three keys (`triade_hint_5`, `triade_undo_3`, `triade_no_ads`), share across 4.3/4.4 pack keys.
- [x] `triade/__tests__/game/purchases.restore.test.ts` -- new gateway contract pins: `restorePurchases` returns `entitlements` object even when native module missing (offline), second concurrent restore/purchase returns busy without double-persist, restore via `__triadePurchasesMock` merges `remote`+`offline` and never downgrades held true, never throws, `purchaseConfig`/`purchases` modules stay pure (no top-level native import).
- [x] `triade/__tests__/ui/components/app.restore.test.ts` -- new app-level pins: LaneSelect/mounted App exposes "Restaurar compras" button with correct a11y label and ≥44pt target in both lanes; tapping restore via mock gateway merges remote entitlements, sets `entitlements[ENTITLEMENT_NO_ADS]` and flips `undoBudget.unlimited` without altering `iapRemaining`/`hintBudget`/`continueBudget`/`undoHistory`; restore when offline already `triade_no_ads:true` and remote empty preserves `true`; concurrent restore while purchase busy is guarded (no double grant); restore fail leaves board/budgets/entitlements unchanged; after `handleRestart`, `unlimited` re-derived from `entitlements` while `iapRemaining` resets to 0 (dies with match), entitlement booleans survive in SecureStore.

**Acceptance Criteria:**
- Given RevenueCat + SecureStore with offline entitlements (e.g. `{triade_hint_5:true}`), when the app launches offline or `restorePurchases` is called with network unavailable, then SecureStore is authoritative — `getEntitlements`/restore return the offline set, the game remains fully playable, and no throw or blocking UI appears
- Given offline `{}`, when `restorePurchases` succeeds with remote `customerInfo.entitlements.active={triade_hint_5:true, triade_undo_3:true, triade_no_ads:true}`, then the SecureStore mirror persists the merged set `{triade_hint_5:true, triade_undo_3:true, triade_no_ads:true}`, `entitlements` state reflects it, and `undoBudget.unlimited` becomes true without touching `iapRemaining`/`hintBudget`/`continueBudget`
- Given offline `{triade_no_ads:true}` and remote `{}` or `{triade_no_ads:false}`, when `restorePurchases` reconciles, then the merged result retains `{triade_no_ads:true}` — held entitlements never downgrade (ADR-02)
- Given per-match budgets have been consumed (`freeUsed:true, iapRemaining:1, hintBudget.remaining:2, continueBudget.used:false`), when `restorePurchases` is invoked, then budgets remain exactly as they were — restore never revives consumed per-match counts; only `handleRestart`/`resetForNewMatch` resets them to `initial*` with `unlimited` re-derived from `entitlements[triade_no_ads]`
- Given any restore success or failure, when gameplay is active, then board `pendingSpawn`, score, merge/spawn rules and input handling stay unchanged (P3), the lane wall still gates Clean (`canUndo/canHint/canContinue` false), and the app never shows a forced interstitial or blocks the board with a spinner/error
- Given the LaneSelect (or menu) surface, when the player taps "Restaurar compras", then `handleRestorePurchases` fires via the `__triadePurchasesMock` hook or real `createPurchasesGateway`, respects the single-monetization busy guard (second tap while busy returns `busy`), and the button has `accessibilityLabel "Restaurar compras"` with ≥44pt hit target visible in both lanes
- Given any entitlement or restore path, then no `src/engine` file is imported by services/monetization/storage, per-match budget state never persists to SecureStore, and telemetry/ads remain observer-only

## Spec Change Log

## Review Triage Log

## Auto Run Result

- Summary: Entitlements + restore com precedência offline — SecureStore authoritative, RevenueCat reconciles without downgrading, restore recovers Hint/Undo/No Ads via "Restaurar compras" affordance, per-match budgets die with match, P3 intact, non-blocking.
- FilesChanged: `triade/src/services/monetization/purchases.ts` (share busy guard, mock-hookable restore, mergeEntitlements never downgrades), `triade/App.tsx` (handleRestorePurchases non-blocking, hasNoAds re-derive, LaneSelect wiring), `triade/src/ui/LaneSelectScreen.tsx` (Restaurar compras button ≥44pt a11y), `triade/__tests__/storage/entitlements.restore.test.ts` (new 7 pins), `triade/__tests__/game/purchases.restore.test.ts` (new 7 pins), `triade/__tests__/ui/components/app.restore.test.ts` (new 8 pins)
- Review: patch 0, defer 0, reject 0 (narrow storage/monetization surface, awaiting-operator not needed for 4.5 — vendor console covered by 4.3/4.4)
- FollowupReview: false
- Verification: `npm --prefix triade test` 635 pass, `npm exec tsc --noEmit --project triade/tsconfig.json` clean, `npm exec tsc --noEmit --project triade/tsconfig.test.json` clean, offline precedence verified via mergeEntitlements, restore busy double-call blocked, per-match budgets not restored verified, Clean lane wall intact, P3 engine purity verified
- Risks: Real App Store products + RevenueCat offering require vendor console publish (owned by 4.3/4.4 awaiting-operator); gateway busy is module-global singleton (1 monetization at a time); actual device restore validation remains manual on physical device (project rule: native purchases are manual)

## Design Notes

Restore is the only operation that reads remote entitlements; purchases already write the local mirror on success. Suggested minimal harness for testability:
```ts
const mock = (globalThis as any).__triadePurchasesMock?.restorePurchases;
if (mock) return mock(); // returns { entitlements: { triade_hint_5: true, ... } }
```
Keep `busy` as a single module-global shared between `purchase*` and `restorePurchases` — either monetization operation blocks the other (one transaction at a time), matching StoreKit/RevenueCat behavior.

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (new ~18-22 pins for offline precedence, restore busy, no budget restore, a11y target, no P3 drift)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean
