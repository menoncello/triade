---
title: '4.2 Rewarded ad — death-continue (1 use per game over)'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_revision: 'ecbfa52914a328280b456e49ccd72877747ac6e0'
final_revision: '7affa665b7164b2f3e836a916911b6551c84386b'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** After gameOver in Accelerated, players have no way to salvage a near-perfect run. They need one discreet Continue per game-over via a player-initiated rewarded ad that rewinds to the pre-death snapshot, without ever leaking to Clean or altering rules.

**Approach:** Gate the existing `consumeContinueAd/CanContinue` budget through the same Rewarded Ad gateway (AdMob) used for undo. Ad success consumes the per-match `ContinueBudget {used}` and rewinds board; fail/cancel leaves board and budget untouched and reverts to the primary Jogar de novo CTA.

## Boundaries & Constraints

**Always:** Engine stays pure (no RN imports, ADR-01); orchestrator `src/game/matchOrchestrator.ts` + `assistance.ts` remain the only continue-budget authority (`canContinue`/`consumeContinue`, memory budget dies with match via `resetForNewMatch`/`handleRestart`, ADR-02); lane wall via `LaneProfile` — Clean `{canContinue:false, allowAds:false}` never shows continue slot; GameOverOverlay continues to use `activeLaneId==='accelerated' && canContinue` gate; ads player-initiated, between games (gameOver overlay), never during animation; board rewind is true rewind (ADR-06, snapshot includes board/pendingSpawn/score/stats); no purchase logic alters spawn/merge/score (P3); AdMob test unit `ca-app-pub-3940256099942544/5224354917` as default.

**Block If:** Needs real AdMob unit ID / App Store Connect declaration (owned by 4.6), needs domain purchase/DNS, needs publishable vendor console access beyond `__DEV__` test ad unit — agent will use test unit / stub and never `blocked` (use `awaiting-operator` pattern from 4.1 if needed, but this story is fully automatable with test unit).

**Never:** Touch `src/engine` pure files; introduce interstitial/forced ads or show ads during gameplay; write leaderboard/per-lane best (3.4); build full IAP entitlements/restore (4.3–4.5 own them — keep existing `handleContinueIap` stub path, only add ad gate); mutate per-match continue budget to survive restart; duplicate rules in UI; add a second continue offer after budget spent.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean lane gameOver | `activeLane=clean`, `gameOver=true`, `continueBudget.used=false` | No continue slot shown; only Jogar de novo CTA; orchestrator `canContinue` false | no error, no advert |
| Accelerated gameOver with budget | `accelerated`, `gameOver=true`, `canContinue=true`, history>0 or ==0 | Discreet Continue offer appears beneath primary Jogar de novo (Ver anúncio first, Comprar second, Cancelar) | no error |
| Accelerated second gameOver same match (budget spent) | `accelerated`, `continueBudget.used=true`, second `isGameOver` true | No Continue slot; Jogar de novo stands alone | silent |
| Continue via rewarded ad success | `accelerated`, `canContinue=true`, ad load+show succeeds (EARNED_REWARD) | `consumeContinue` flips `used=true`, board rewinds to `undoHistory[last]` snapshot (board+pendingSpawn+match+matchStats), overlay dismissed, game resumes; `busyRef=false` | ad SDK error never propagates as throw |
| Continue undoHistory empty | `accelerated`, `canContinue=true`, `undoHistory=[]`, ad granted | `continueBudget.used=true` consumed, no board rewind (snapshot undefined), overlay dismissed | no crash, budget consumed |
| Ad fail or cancelled | ad load fails / user closes before reward, `granted=false` | Board and `continueBudget` unchanged, overlay stays on gameOver with primary CTA usable, no blocking error | catch → no budget consumption, log WARN |
| Cancel Continue | user taps Cancelar on continue slot | No budget consumption, board unchanged, overlay stays with primary CTA (continue slot may remain if canContinue still true) | silent |
| Ad busy double-tap | `adBusyRef=true` second Ver anúncio tap while loading/showing | Second call guarded, returns granted:false, no double-consume | silent |
| Restart after continue consumed | `handleRestart` called after continue used | `continueBudget` reset via `initialContinueBudget()` (`used=false`), new game gets fresh continue again | — |
| Ad during animation / not gameOver | `gameOver=false` or `busyRef=true` while gameOver | Continue slot not mounted (only when gameOver); ad never fires during animation | no crash |

</intent-contract>

## Code Map

- `triade/src/game/assistance.ts:15-78` -- pure budget authority `ContinueBudget {used}`, `canContinue`/`consumeContinue` (used by orchestrator, already correct for 1 per gameOver)
- `triade/src/game/matchOrchestrator.ts:46-204` -- `OrchestratorState` (`continueBudget`, `undoHistory`), `canContinueForState`/`consumeContinueAd`/`consumeContinueIap`/`resetForNewMatch` (already present; needs ad gate only in App layer)
- `triade/src/game/lanes.ts:31-65` -- `LANE_PROFILES` / `profileForLaneId` lane wall (`clean.canContinue=false, allowAds=false`)
- `triade/App.tsx:246-560` -- current wiring `handleContinueAd`/`handleContinueIap` (today direct `orchestratorConsumeContinueAd` without ad gate + `onContinueCancel` noop), `adBusyRef`/`busyRef` guards, `resetAssistance`/`handleRestart` per-match reset; `GameOverOverlay` mount at 534-553 with `canContinueDerived`
- `triade/src/ui/GameOverOverlay.tsx:17-282` -- `GameOverOverlay` discreet Continue slot (Ver anúncio/Comprar/Cancelar) shown when `activeLaneId==='accelerated' && canContinue`; primary CTA Jogar de novo always; fade 280ms, `HIT_TARGET`, lane wall comments
- `triade/src/ui/AcceleratedAids.tsx:34-61` -- `RewardPrompt` discrete UI for undo (reference for ad→IAP→Cancel ordering)
- `triade/package.json:6-19` -- deps; `react-native-google-mobile-ads 16.4.0` already added by 4.1, `app.json` plugin already registered (verify no duplicate)
- `triade/src/services/monetization/rewardedAds.ts:1-119` -- existing gateway `createRewardedAdGateway` (dynamic import, busy singleton, timeout, never throws) used by undo; reuse for continue (add optional `rewardedContinueUnitId` helper or reuse same unit)
- `triade/src/services/monetization/adsConfig.ts:1-27` -- pure config `TEST_IDS` + `REWARDED_AD_UNIT_ID_UNDO` + `rewardedUndoUnitId()` (add `rewardedContinueUnitId` or alias; keep env override pattern)
- `triade/__tests__/game/matchOrchestrator.rewards.test.ts` + `triade/__tests__/ui/components/app.undoAd.test.ts` + `triade/__tests__/game/rewardedAds.test.ts` -- existing pins for 4.1 budget and prompts (extend for continue)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/services/monetization/adsConfig.ts` -- add continue ad unit helper: export `REWARDED_AD_UNIT_ID_CONTINUE` (alias to same Google test rewarded `ca-app-pub-3940256099942544/5224354917`, overridable via `EXPO_PUBLIC_ADMOB_REWARDED_CONTINUE` env, fallback to `REWARDED_AD_UNIT_ID_UNDO`), and `export function rewardedContinueUnitId(): string` returning it; keep existing `rewardedUndoUnitId` untouched; pure, testable without native SDK. Keep `TEST_IDS` map as is.
- [x] `triade/src/services/monetization/rewardedAds.ts` -- ensure gateway creation accepts optional `adUnitId` param and uses `rewardedContinueUnitId()` when caller passes continue id (no behavior change for undo); keep dynamic `import('react-native-google-mobile-ads')` inside method (never top-level), single module-global `busy` guard (second concurrent `loadAndShow` returns `{granted:false,error:'busy'}`), 8s timeout, never throws; export already present `__resetRewardedAdsBusy` for tests. No UI import. If continue needs distinct default unit, pass `rewardedContinueUnitId()` from App layer.
- [x] `triade/App.tsx` -- replace stub `handleContinueAd` with ad-gated flow mirroring `handleUndoAd`: use `adBusyRef` guard (single ad at a time across undo+continue), check `__triadeRewardedAdMock` global hook first then `createRewardedAdGateway(rewardedContinueUnitId())`, `await gateway.loadAndShow()`, only on `granted===true` call `orchestratorConsumeContinueAd(tmp, activeProfile)` and apply `continueBudget` + snapshot rewind (`setGame`/`setMatch`/`setMatchStats`/`setUndoHistory`/`setMoveResult(null)`/`busyRef=false`) as current does; on `granted===false` leave `continueBudget` and board untouched (no consumption), overlay stays with primary CTA (do not set error state). Keep `handleContinueIap` unchanged (IAP stub via `orchestratorConsumeContinueIap`). Fix `onContinueCancel` from noop to a real handler: `handleContinueCancel` that leaves budget untouched and optionally hides a transient dismiss flag but at minimum is a no-op that does not consume budget (wire `onContinueCancel={handleContinueCancel}` in `GameOverOverlay`). Gate Continue slot behind `activeProfile.allowAds && activeProfile.canContinue` (consistent with existing `canContinueDerived` which already checks profile.canContinue); ensure ad never fires when `gameOver===false` or `busyRef.current`. Keep `handleRestart` reset of `continueBudget` via `initialContinueBudget()` (already does).
- [x] `triade/__tests__/game/matchOrchestrator.rewards.test.ts` -- extend (or create `matchOrchestrator.continue.test.ts` if file absent) with pure orchestrator pins for continue: `canContinue` true when `used=false` + accelerated, false when `used=true`, false always for clean; `consumeContinueAd` flips `used=true` and pops `undoHistory` last snapshot when history>0, without history just flips budget; second `consumeContinueAd` rejected; `resetForNewMatch` resets `used=false`; clean never canContinue
- [x] `triade/__tests__/game/rewardedAds.test.ts` -- extend to cover continue unit id: default continue unit equals test unit, env override `EXPO_PUBLIC_ADMOB_REWARDED_CONTINUE` respected, gateway still returns `granted:false` when native module missing (no throw), busy guard holds across successive calls
- [x] `triade/__tests__/ui/components/app.continueAd.test.ts` -- new app-level pins: Accelerated gameOver shows Continue slot ad-first ordering (Ver anúncio / Comprar / Cancelar) beneath Jogar de novo, ad success rewinds board to pre-death snapshot and consumes `continueBudget` (second death no Continue), ad fail/cancel leaves board + budget unchanged and primary CTA usable, Clean gameOver never mounts Continue slot, restart after continue resets `used=false` so next gameOver again offers continue, ad busy double-tap does not double-consume

**Acceptance Criteria:**
- Given a gameOver in the Accelerated lane with `continueBudget.used=false`, when the overlay renders, then a discreet Continue offer appears beneath the primary Jogar de novo with order Ver anúncio (first) / Comprar / Cancelar and is player-initiated only
- Given the Continue offer visible in Accelerated gameOver, when the rewarded ad loads and completes (reward earned), then the board rewinds exactly to the pre-death `undoHistory` snapshot (board, pendingSpawn, score, stats) and the per-match `continueBudget.used` flips to true, dismissing the overlay and resuming play
- Given the continue has been consumed (`used=true`) in the same match, when a second gameOver occurs, then no Continue offer appears — Jogar de novo stands alone (orchestrator rejects second consume)
- Given the rewarded ad fails to load or the user cancels/closes before reward, when the ad result returns, then the overlay stays, the board and continue budget remain unchanged, no blocking error state appears and the primary CTA remains usable
- Given a gameOver on the Clean lane, when the overlay renders, then no Continue slot or ad is ever shown (lane wall) and no monetization code path runs
- Given the game has restarted (`handleRestart` / `resetForNewMatch`), when a new Accelerated game reaches gameOver again, then a fresh Continue is available again via rewarded ad (`used` reset)

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

## Design Notes

Reuse the gateway pattern from 4.1. Keep `App` snapshot shape `{ game:{board, pendingSpawn}, match, matchStats }` identical to existing (see `App.tsx:76 Snapshot`). Do not introduce `src/state` board storage. Gateway stays lazily imported inside `loadAndShow` so `npm test` without native module still runs. Continue and undo share the module-global `busy` guard — one ad at a time.

```ts
export async function showRewardedContinueAd(): Promise<boolean> {
  const gateway = createRewardedAdGateway(rewardedContinueUnitId());
  const { granted } = await gateway.loadAndShow();
  return granted;
}
```

`GameOverOverlay` already implements the discreet slot; `App.tsx` only needs to gate the handler with the ad, not redesign the overlay. `onContinueCancel` should at minimum not consume budget; if a transient hide is desired, add a local `continueDismissed` flag reset by `handleRestart` — not required if simply leaving `canContinue` true keeps the slot visible (retry allowed).

## Auto Run Result

- Summary: Rewarded ad death-continue (1 per gameOver) via AdMob gateway — discreet Continue beneath Jogar de novo, ad must grant before budget consumed, Clean never shows, second death no offer, restart resets budget.
- FilesChanged: `triade/src/services/monetization/adsConfig.ts` (add REWARDED_AD_UNIT_ID_CONTINUE + rewardedContinueUnitId), `triade/src/services/monetization/rewardedAds.ts` (export showRewardedContinueAd, import rewardedContinueUnitId), `triade/App.tsx` (ad-gated handleContinueAd with adBusyRef + __triadeRewardedAdMock hook + rewardedContinueUnitId, handleContinueCancel wired), `triade/__tests__/game/rewardedAds.test.ts` (extend continue unit pins), `triade/__tests__/game/matchOrchestrator.continue.test.ts` (new 8 pins), `triade/__tests__/ui/components/app.continueAd.test.ts` (new 7 pins)
- Review: patch 0, defer 0, reject 2 (pre-existing: ULP preview boundary + mutable pot slices — not caused by this diff)
- FollowupReview: false (patch-free, narrow behavior surface, no API/broad impact)
- Verification: `npm --prefix triade test` 555 pass, `npm exec tsc --noEmit --project triade/tsconfig.json` clean, `npm exec tsc --noEmit --project triade/tsconfig.test.json` clean, ad fail leaves board/budget untouched via mock, Clean lane wall verified, second continue blocked verified
- Risks: Real AdMob unit requires vendor console publish (owned by 4.6); gateway busy is module-global singleton (1 ad at a time); actual device ad load/show remains manual-validation on physical device

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (new ~10-15 pins for continue, no existing failures)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean
