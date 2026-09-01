---
title: '3.2 Clean lane pura'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: '867e3e26cd80525b8f0f27bfe8332e6758b458a0'
final_revision: '5f03a553ae4f7eb27560c18e2f505cfd01a5f92b'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** After lane-select (3.1) the game still renders as lane-agnostic: Hud fans out two previews at once and no profile gates assistance, so Clean ("Pura") cannot be a verifiably pure board.

**Approach:** Define the Clean lane as a data-driven profile (`{ id:'clean', undo:false, hint:false, continue:false, ads:false, learningAids:false }`) and gate all UI/assistance paths by that profile — Hud shows only the active_lane preview, GameOver shows only the primary CTA, and no banner/ads/prompt ever renders while Clean is active.

## Boundaries & Constraints

**Always:** Engine stays pure (no RN imports in `src/engine` or `src/game/lanes.ts`, ADR-01); lane memory via `settingsStore` per-key `laneDefault` 0/1 unchanged; preview stays trace-derived `previewFor(pendingSpawn, availablePot)` with `availablePot=potForTier(tierForCeiling(ceilingDetector(board)))`; safe margins `SAFE_MARGIN 16 + insets` + `maxWidth 420` + `HIT_TARGET 44` hold; `App` screen-state `laneSelect | playing` unchanged; i18n waiver `// TODO 5.4: t('...')` may stay.

**Block If:** Need to add RevenueCat/AdMob/Firebase SDKs, per-lane leaderboard persistence (belongs to 3.4), or to change spawn/merge/score rules for Clean (FR12 never alters rules, P3).

**Never:** Add undo/hint buttons, continue offers, rewarded-ad prompts, interstitial ads, or learning-aid banners (ceiling indicator / stuck warning) for Clean; add monetization imports (`react-native-purchases`, `react-native-google-mobile-ads`, `expo-secure-store` beyond settingsStore) or engine imports into UI; alter `previewFor` distribution or re-roll pending spawn; block the orchestrator with `blocked` for human-only App Store steps (this story is fully automatable).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean: Hud single preview | `activeLane='clean'`, `previews={clean:{value:3}, accelerated:{value:6}}` portrait+landscape | Hud renders exactly one PreviewCard with value 3 and no Accelerated lane chrome; only score+best+preview+pause visible | if activeLane omitted → fallback clean (no crash) |
| Accelerated: Hud single preview | `activeLane='accelerated'`, same previews | Hud renders exactly one PreviewCard with value 6 | same fallback |
| Clean: GameOver overlay | `gameOver=true`, `activeLane='clean'` | Overlay shows 5 stats + single CTA "Jogar de novo" (≥44×44, accent #E8A33D / ink #1C1206), no "Continuar"/Continue/rewardedAd/IAP slot, hittable through fade | if stats undefined → render 0s, never crash |
| Clean: no learning aids | `activeLane='clean'` during play | No ceiling-indicator or stuck-warning banner/prompt is mounted at any time, before or between games | vacuously passes if aids not wired |
| Clean: no monetization routing | `activeLane='clean'`, any undo/hint/continue/ad trigger | Nothing routes to monetization — no `react-native-purchases`/`google-mobile-ads` import, no ad prompt, no SecureStore entitlement read | no error, silent noop guard |
| Lane switch persistence | Clean→Accelerated via LaneSelect with confirm | New game on tapped lane, `laneDefault` persisted, next boot defaults to that lane; Hud overlay follows new lane immediately | persist failure → in-memory lane still updates, next launch reverts, no crash |
| Invalid lane index | `laneFromIndex(99)` or `activeLane` prop invalid | Fallback to `clean` profile, no crash, tests pin | — |

</intent-contract>

## Code Map

- `triade/src/game/lanes.ts:1-46` -- pure lane data module (LANES, LaneId, laneFromIndex); extend with LaneProfile data + profile helpers, no RN/engine imports
- `triade/App.tsx:34-270` -- orchestrator, screen-state laneSelect→playing, hydration + laneDefault, hasActiveMatch, applyLaneSelection/newGame, bandTop/layout, Hud/GameOverOverlay wiring; add activeLane wiring to Hud/GameOverOverlay
- `triade/src/ui/Hud.tsx:10-174` -- HUD overlay zIndex:1, portrait stacked vs landscape band, safe margins, score/best/PreviewCard; gate to single active-lane preview per UX-DR-7/FR-12
- `triade/src/ui/GameOverOverlay.tsx:1-170` -- scrim zIndex:2, 5 stats + CTA, reducedMotion fade, a11y alert; guard Continue/monetization slot so Clean shows only primary CTA (FR12)
- `triade/src/services/storage/schema.ts:1-48` -- Settings/laneDefault validation; reference only, no change (lane memory belongs to 3.1)
- `triade/src/services/storage/settingsStore.ts:1-153` -- per-key persist; reference only
- `triade/__tests__/game/lanes.test.ts:1-50` -- pins lanes purity + labels; extend with profile contract pins
- `triade/__tests__/ui/components/hud.test.ts:1-132` -- preview fan-out tests; will be updated to activeLane-gated single preview
- `triade/__tests__/ui/components/gameOverOverlay.test.ts` + `app.restart.test.ts` -- verify Clean-only primary CTA and monetization wall; extend guard

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/game/lanes.ts` -- add `LaneProfile` data + `LANE_PROFILES` / `profileForLaneId`/`profileForIndex` helpers: `clean: { id:'clean', canUndo:false, canHint:false, canContinue:false, allowAds:false, showLearningAids:false, leaderboard:'clean' }`, `accelerated: { id:'accelerated', canUndo:true, canHint:true, canContinue:true, allowAds:true, showLearningAids:true, leaderboard:'assisted' }`; keep `LANES`/`laneFromIndex`/`isValidLaneIndex` byte-compatible; file stays pure (relative imports only, no RN/Skia/Expo, no `Math.random`, no engine imports), add guards for invalid→clean fallback
- [x] `triade/src/ui/Hud.tsx` -- make lane-pure: add prop `activeLaneId?: LaneId` (fallback `'clean'` if absent/invalid), render exactly one `LanePreview` for the active lane (portrait: single `previewPortrait` at `rightPad, bottomPad`; landscape: single chip inside `landscapeRight`); remove dual-stack `clean+accelerated` rendering; keep `previews: {clean, accelerated}` fan-out prop but gate display; preserve safe margins, `zIndex:1`, `HIT_TARGET`, `SAFE_MARGIN`, `LanePreview` label; update both orientation branches
- [x] `triade/App.tsx` -- wire Clean lane through the playing surface: derive `activeLaneId` from `selectedLaneIndex` via `laneFromIndex`, pass `activeLaneId` to `Hud` and to `GameOverOverlay`; keep `availablePot=potForTier(tierForCeiling(ceilingDetector(game.board)))` once per render after `if(!ready)` and `previews` fan-out byte-identical; no new SDK imports, no per-lane best yet (3.4 owns leaderboard persistence, keep global `persistedBest` today)
- [x] `triade/src/ui/GameOverOverlay.tsx` -- gate for Clean purity: add optional prop `activeLaneId?: LaneId` (fallback `'clean'`), keep single CTA "Jogar de novo" when `activeLaneId==='clean'` (no Continue/rewardedAd/IAP slot, no second Pressable); add source comment `// 3.2 Clean lane: no continue/ad/hint — see LaneProfile` next to CTA guard; preserve 280ms fade, `reducedMotion`, `zIndex:2`, a11y alert, `HIT_TARGET` 44 CTA styling, insets + SAFE_MARGIN
- [x] `triade/__tests__/game/lanes.test.ts` + new/migrated UI tests -- add/extend tests: lanes profile round-trip + invalid fallback + canUndo/canHint/canContinue/allowAds/showLearningAids false for clean vs true for accelerated + leaderboard mapping + import-guard (no RN/engine); Hud activeLane-gated single preview in portrait+landscape (clean shows 3 not 6, accelerated shows 6 not 3, exactly one preview chip `findAll` count + label/values, exactly one `PreviewCard` subtree, no banner learner); GameOverOverlay clean shows exactly one CTA and no `Continuar`/`onContinue`/`rewardedAd`

**Acceptance Criteria:**
- Given a match started on the Clean lane, when the HUD renders, then it shows only score, best (lane-scoped display today global), one preview card for the Clean lane, and pause — no Accelerated lane preview, no ceiling-indicator banner, no stuck-warning, in both portrait and landscape
- Given game over on the Clean lane, when the overlay renders, then it shows the 5 stats plus single primary CTA "Jogar de novo" (≥44×44, accent #E8A33D / ink #1C1206, hittable through fade, zIndex 2 over Hud) and never shows a Continue/rewarded-ad/IAP offer — exactly one button is rendered
- Given the Clean lane is active, when any undo/hint/continue/ad trigger is attempted, then nothing routes to monetization (no `react-native-purchases`/`google-mobile-ads` import in `App/Hud/GameOverOverlay`, no ad prompt mounted, per-match budgets never consulted) — enforced by `LaneProfile` contract not by trust
- Given invalid `activeLaneId` or missing prop, when Hud/GameOverOverlay render, then they fallback to Clean profile with no crash and still show the single preview/primary CTA
- Given the LaneProfile module, when `profileForLaneId('clean')` is read, then `{canUndo:false, canHint:false, canContinue:false, allowAds:false, showLearningAids:false, leaderboard:'clean'}` and `profileForLaneId('accelerated')` returns `{canUndo:true, canHint:true, canContinue:true, allowAds:true, showLearningAids:true, leaderboard:'assisted'}`; invalid id falls back to clean profile

## Spec Change Log

## Review Triage Log

### 2026-08-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 0, medium 0, low 3)
- defer: 0
- reject: 0
- addressed_findings:
  - `[low]` `[patch]` Hud `LANE_STACK_GAP` dead code after dual-stack removal — removed constant (kept comment for Accelerated parity but no runtime)
  - `[low]` `[patch]` GameOverOverlay `void laneId` dead store for unused lane gate — replaced with reserved-prop comment, no runtime branch
  - `[low]` `[patch]` lanes.test `@ts-expect-error` unused directive after `as any` cast — removed directive, test still pins invalid→clean fallback

## Auto Run Result

- Summary: Clean lane pura enforced by data-driven LaneProfile — Hud displays exactly one active-lane preview (fallback clean), GameOverOverlay stays single CTA, App wires activeLaneId through the playing surface; no undo/hint/ads/continue/learning-aids ever render in Clean.
- FilesChanged: `triade/src/game/lanes.ts` (LaneProfile + LANE_PROFILES + profileFor helpers + isLaneId), `triade/src/ui/Hud.tsx` (activeLaneId gate single preview), `triade/App.tsx` (activeLaneId wiring), `triade/src/ui/GameOverOverlay.tsx` (activeLaneId prop + Clean comment), `triade/__tests__/game/lanes.test.ts` (profile pins), `triade/__tests__/ui/components/hud.test.ts` (migrated dual to single activeLane), `triade/__tests__/ui/components/hud.previewWiring.test.ts` (migrated dual to activeLane gate)
- Review: patch 3 low fixed (dead constants/directives), defer 0, reject 0
- FollowupReview: false (three localized low patches, no API/broad impact, thin-view and purity gates green)
- Verification: `npm --prefix triade test` 470 pass, `tsc` clean both configs, Hud single-preview and overlay single-CTA manually via tests
- Risks: per-lane best/leaderboard still global (belongs to 3.4); Accelerated continue/undo/hint prompts not yet wired (3.3/4.x must consult LaneProfile, not duplicate gate)

## Design Notes

Clean is data, not restraint. The profile `{ id:'clean', undo:false, hint:false, continue:false, ads:false, learningAids:false }` lives in `src/game/lanes.ts` and is the single source for `App → Hud/GameOverOverlay` gating. Future monetization stories (4.x) and assistance stories (3.3) must consult `profileForLaneId(activeLaneId).allowAds/canUndo` — they cannot render a prompt without passing the profile check. This is ADR-03 "lane wall" — enforced by contracts, not UI discipline.

Hud today fans out `previews: {clean, accelerated}` from the single `pendingSpawn` (N3). For Clean purity it must DISPLAY only `previews[activeLaneId]` — one `LanePreview` child, not two stacked at `bottomPad` / `bottomPad+76+GAP`. Keep the fan-out prop shape (so 7.2 previewWiring tests migrate, not delete) and gate rendering by `activeLaneId`. Same for GameOverOverlay — one CTA in Clean, Continue slot only when `profile.canContinue` and Accelerated.

```tsx
// Hud props after 3.2
type HudProps = { score:number; best:number; isLandscape:boolean; insets:EdgeInsets; bandHeight:number; activeLaneId: LaneId; previews: {clean:Preview; accelerated:Preview} }
```

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (baseline ~467 pass + new 8-12 lane-clean pins, 0 fail; hud.test.tsx 7.2 dual-preview pins migrated to activeLane single-preview, no dual label "Clean+Accelerated" assertion left in Clean)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean

**Manual checks (if no CLI):**
- Boot portrait on Clean → Hud shows only one preview card bottom-right, score center-top, pause top-right; switch to Accelerated → single preview shows other lane value, still one card; never two stacked cards
- Game over on Clean → overlay shows 5 stats + single "Jogar de novo" (no "Continuar", no second button); Accelerated game over (future) will add Continue slot outside this story, Clean stays single CTA today
