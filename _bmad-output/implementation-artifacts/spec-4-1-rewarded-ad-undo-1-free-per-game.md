---
title: '4.1 Rewarded ad — undo (1 free per game)'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_revision: '9ce6aae2e12c1f4d4a369fccb9a4d156d930b66d'
final_revision: '7cc555c0f749c07a580649109e03cf670a9bb1e4'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Accelerated lane has no way to recover a mis-swipe. Players need one free per-game rewind at the moment of pain, via a player-initiated rewarded ad, without ever leaking to Clean or altering rules.

**Approach:** Gate the existing undo rewind through a Rewarded Ad gateway (AdMob) with discrete ad→IAP→Cancel prompt. The per-match budget already limits to 1 free undo per game — wire it so the ad must succeed to consume the budget, and a fail/cancel restores the prompt without touching board or budget.

## Boundaries & Constraints

**Always:** Engine stays pure (no RN imports, ADR-01); orchestrator `src/game/matchOrchestrator.ts` + `assistance.ts` remain the only undo/budget authority (atomic `canUndo`/`consumeUndo`, memory budget dies with match, ADR-02); lane wall via `LaneProfile` — Clean `{canUndo:false, allowAds:false}` never shows prompt; ads player-initiated, between games, never during animation or game-over; board rewind is true rewind (ADR-06, snapshot includes PRNG/pendingSpawn/score/best/stats); no purchase logic alters spawn/merge/score (P3).

**Block If:** Needs real AdMob unit ID / App Store Connect declaration (owned by 4.6), needs domain purchase/DNS, needs publishable vendor console access beyond `__DEV__` test ad unit — agent will use test unit / stub and HALT via awaiting-operator, never `blocked`.

**Never:** Touch `src/engine` pure files; introduce interstitial/forced ads; write leaderboard/per-lane best (3.4); build full IAP entitlements/restore (4.3–4.5 own them — keep existing `handleUndoIap` stub); mutate per-match budgets to survive restart; duplicate rules in UI.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean lane undo attempt | `activeLane=clean`, `undoHistory.length>0`, tap undo | No prompt shown; orchestrator `canUndo` false, nothing happens | no error, no advert |
| Accelerated no history | `accelerated`, `historyLen=0`, requestUndo | Request rejected, prompt not shown | silent, no ad |
| Accelerated busy animation | `busyRef=true` during swipe animation | Prompt suppressed (first finger / in-flight gate) | silent |
| First undo via rewarded ad success | `accelerated`, `freeUsed=false`, history>0, ad load+show succeeds | Board rewinds to last snapshot, `freeUsed=true`, prompt dismissed, history popped | ad SDK error never propagates as thrown |
| Second undo same game wants ad | `accelerated`, `freeUsed=true`, `iapRemaining=0`, `unlimited=false` | `canUndo` false, prompt either not shown or second ad attempt rejected, board unchanged | silent block (routes to IAP) |
| Ad fail or cancelled | ad load fails / user closes before reward | Prompt dismissed (or reverts to CTA), board and budget unchanged, nothing lost, no blocking error | catch → `showUndoPrompt=false`, log WARN |
| Second game after restart | `handleRestart` resets `undoBudget=initial` (`freeUsed=false`) | New game gets a fresh free undo again | — |
| Ad during gameOver or portrait/landscape | gameOver true or orientation changes | Prompt not mounted when gameOver; rotation preserves `showUndoPrompt` without leak | no crash |

</intent-contract>

## Code Map

- `triade/src/game/assistance.ts:23-56` -- pure budget authority `UndoBudget {freeUsed, iapRemaining, unlimited}`, `canUndo`/`consumeUndo` (used by orchestrator, already correct for 1 free per game)
- `triade/src/game/matchOrchestrator.ts:46-94` -- `OrchestratorState`, `requestUndo` (gates profile.canUndo + busy + showUndoPrompt), `confirmUndoAd`/`confirmUndoIap`/`cancelUndo` (pop history, consume budget)
- `triade/src/game/lanes.ts:31-65` -- `LANE_PROFILES` / `profileForLaneId` lane wall (`clean.canUndo=false, allowAds=false`)
- `triade/App.tsx:246-328` -- current wiring `handleUndoRequest`/`handleUndoAd`/`handleUndoIap`/`handleUndoCancel`, `showUndoPrompt` state, `busyRef` gate, `resetAssistance`/`handleRestart` per-match reset; RewardPrompt mount at 503-505
- `triade/src/ui/AcceleratedAids.tsx:34-61` -- `RewardPrompt` discrete UI (ad first, IAP second, Cancel)
- `triade/package.json:6-19` -- deps; needs `react-native-google-mobile-ads 16.4.0` added (Expo SDK 57 pin), `app.json` plugin entry
- `triade/src/services/monetization/*` -- NEW directory for AdMob gateway (no file exists yet; `src/services` only has `storage/` + `assets/`)
- `triade/__tests__/game/assistance.test.ts` + `matchOrchestrator.test.ts` + `triade/__tests__/ui/components/app.restart.test.ts` -- existing pins for budget and prompts

## Tasks & Acceptance

**Execution:**
- [x] `triade/package.json` -- add `react-native-google-mobile-ads@16.4.0` to dependencies (pinned, SDK57-compatible) and keep `npm --prefix triade install` lockfile coherent; do not add RevenueCat/Firebase here (4.4/10.x)
- [x] `triade/app.json` -- register `react-native-google-mobile-ads` Expo config plugin (with placeholder `android_app_id`/`ios_app_id` test values, e.g. `ca-app-pub-3940256099942544~3347511713` / `ca-app-pub-3940256099942544~1458002511`, and keep existing `expo-asset`/`expo-secure-store` plugins untouched)
- [x] `triade/src/services/monetization/rewardedAds.ts` -- create thin gateway: `export type RewardedAdGateway = { loadAndShow(): Promise<{ granted: boolean; error?: string }> }`, exports `createRewardedAdGateway(adUnitId?: string): RewardedAdGateway` that dynamically imports `react-native-google-mobile-ads` (`RewardedAd` + `AdEventType` + `RewardedAdEventType`) inside the function (never at top-level so tests/Native without module don't crash), uses Google test unit `ca-app-pub-3940256099942544/5224354917` as default; handles already-loaded vs load race, `load`→`show`→wait for `EARNED_REWARD` (granted=true) or `CLOSED`/`ERROR` (granted=false), timeout fallback; never throws, returns `{granted:false}` on any import/config failure and logs WARN; single concurrency guard (second call while loading/showing returns granted:false). Keep `console.warn`/`Logger` only, no UI import.
- [x] `triade/src/services/monetization/adsConfig.ts` -- create pure config module: `REWARDED_AD_UNIT_ID_UNDO` (test ID above, overridable via `EXPO_PUBLIC_ADMOB_REWARDED_UNDO` env), `TEST_IDS` map (android/ios), re-exports; validatable by tests without importing native SDK
- [x] `triade/App.tsx` -- replace stub `handleUndoAd` with ad-gated flow: inject gateway (or lazy-create inside handler), `await gateway.loadAndShow()`, only on `granted===true` call `orchestratorConfirmUndoAd` and apply snapshot/budget/prompt reset as before; on `granted===false` just `setShowUndoPrompt(false)` (revert to primary CTA, board & budget untouched, no error state). Keep Cancel/IAP paths unchanged; add `adBusyRef` guard so double-tap on "Ver anúncio" doesn't double-consume; gate entire prompt behind `activeProfile.allowAds && profile.canUndo` (Clean never mounts RewardPrompt); keep `busyRef` input gate so ad never fires during animation.
- [x] `triade/__tests__/game/rewardedAds.test.ts` -- unit tests for gateway contract: default test unit id returned, env override respected, loadAndShow returns granted:false when native module missing (no throw), second concurrent load guarded, never throws on SDK error
- [x] `triade/__tests__/game/matchOrchestrator.rewards.test.ts` -- pure orchestrator pins for 4.1: confirmUndoAd consumes freeUsed once and rewires, second confirmUndoAd rejected, cancelUndo leaves history/budget intact, requestUndo blocked when freeUsed+no iap+no unlimited, clean profile never canUndo, busy blocks request
- [x] `triade/__tests__/ui/components/app.undoAd.test.ts` -- app-level pins: Accelerated shows RewardPrompt ad-first ordering (Ver anúncio / Comprar / Cancelar), ad success rewinds board, ad fail/cancel leaves board + budget unchanged, second undo same game blocked, Clean never mounts RewardPrompt, restart resets freeUsed so next game again offers ad undo

**Acceptance Criteria:**
- Given an Accelerated-lane match with at least one effective move history, when the player taps undo, then a discrete Reward Prompt appears with order Ver anúncio (first) / Comprar / Cancelar and the rewarded ad path is player-initiated only
- Given the Reward Prompt visible in Accelerated, when the rewarded ad loads and completes (reward earned), then the board rewinds exactly to the pre-move snapshot (board, pendingSpawn, score, stats) and the per-match `freeUsed` flips to true, consuming the single free undo of the game
- Given the free undo has been consumed (freeUsed=true, iapRemaining=0, unlimited=false) in the same game, when a further undo is requested, then orchestrator rejects it — no second free ad-undo is granted and the board stays as is (routes to IAP or blocked)
- Given the rewarded ad fails to load or the user cancels/closes before reward, when the ad result returns, then the prompt dismisses, the board and undo budget remain unchanged, no blocking error state appears and the primary CTA remains usable
- Given a match on the Clean lane, when undo is attempted (or assistance UI would mount), then no reward prompt or ad is ever shown (lane wall) and no monetization code path runs
- Given the game has restarted (handleRestart / resetForNewMatch), when a new Accelerated game begins, then a fresh free undo is available again via rewarded ad (freeUsed reset)

## Spec Change Log

## Review Triage Log

### 2026-08-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2
- addressed_findings:
  - none

## Auto Run Result

- Summary: Rewarded ad undo (1 free per game) via AdMob gateway — discrete prompt ad→IAP→Cancel, ad must grant before budget consumed, Clean never shows, restart resets budget.
- FilesChanged: `triade/package.json` (add react-native-google-mobile-ads 16.4.0), `triade/app.json` (register AdMob plugin with Google test app ids), `triade/src/services/monetization/adsConfig.ts` (new pure config with TEST_IDS), `triade/src/services/monetization/rewardedAds.ts` (new dynamic-import gateway with busy guard + timeout, never throws), `triade/App.tsx` (ad-gated handleUndoAd with adBusyRef + __triadeRewardedAdMock hook), `triade/types/google-mobile-ads.d.ts` (module shim for tsc), `triade/__tests__/game/rewardedAds.test.ts` (new), `triade/__tests__/game/matchOrchestrator.rewards.test.ts` (new), `triade/__tests__/ui/components/app.undoAd.test.ts` (new)
- Review: patch 0, defer 0, reject 2 (pre-existing: ULP 0.6 boundary in preview.ts, mutable pot slices — not caused by this diff)
- FollowupReview: false (patch-free, narrow behavior surface, no API/broad impact)
- Verification: `npm --prefix triade test` 541 pass, `tsc --noEmit` clean, `tsc --noEmit -p tsconfig.test.json` clean, ad fail leaves board/budget untouched via mock, Clean lane lane-wall verified, second ad undo blocked verified
- Risks: Real AdMob unit requires vendor console publish (owned by 4.6 declarations story); gateway busy is module-global singleton (1 ad at a time); actual device ad load/show remains manual-validation on physical device (project rule: native ads are manual)

## Design Notes

Gateway must be lazily imported (dynamic `import()` inside method) so `npm test` without native module still runs. Suggested minimal shape:

```ts
export async function showRewardedUndoAd(): Promise<boolean> {
  try { const { RewardedAd, RewardedAdEventType } = await import('react-native-google-mobile-ads'); ... }
  catch { return false; }
}
```

Keep App's snapshot shape `{ game: {board, pendingSpawn}, match, matchStats }` identical to existing (see App.tsx:75 Snapshot). Do not introduce `src/state` board storage.

Test IDs are Google's official test units and never bill.

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (new ~15-20 pins, no existing failures)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean
