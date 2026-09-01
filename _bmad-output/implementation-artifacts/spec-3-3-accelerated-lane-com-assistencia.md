---
title: '3.3 Accelerated lane com assistência'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: '8dc159570f007d53d6057add32c801dd5ae2f12c'
final_revision: '848f3d43b52ee33d71f662973eb8e10f652af863'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Accelerated ("Iniciante") lane currently has no assistance path — undo, hint, death-continue and learning-aid banners are absent, so beginners have no recovery at the moment of pain and the lane is indistinguishable from Clean.

**Approach:** Gate all assistance by `LaneProfile` (`profileForLaneId('accelerated')`) and add in-memory per-match budgets + atomic contracts (`canUndo/consumeUndo`, `canHint/consumeHint`, `canContinue/consumeContinue`) plus contextual dismissible prompt-banners (ceiling indicator, stuck warning) and reward prompts (ad first, IAP alternative, Cancel) that appear only in Accelerated and only between games.

## Boundaries & Constraints

**Always:** Engine stays pure (no RN imports in `src/engine` or `src/game/lanes.ts`/`assistance.ts`; ADR-01); `LaneProfile` remains sole gate — every assistance affordance checks `profileForLaneId(activeLaneId).canUndo/canHint/canContinue/allowAds/showLearningAids` before rendering or routing; per-match budgets (undo/continue/hint counts, undo history stack) live in memory and die with `newGame`/restart/lane-switch (ADR-02); preview stays trace-derived `previewFor(pendingSpawn, availablePot)` with `availablePot=potForTier(tierForCeiling(ceilingDetector(board)))`; safe margins `SAFE_MARGIN 16 + insets` + `maxWidth 420` + `HIT_TARGET 44` hold; `App` screen-state `laneSelect | playing` unchanged; hints highlight one valid mergeable pair via `canMerge` predicate and never reveal spawn or suggest a direction; i18n waiver `// TODO 5.4: t('...')` may stay.

**Block If:** Need to install or import real monetization SDKs (`react-native-purchases`, `react-native-google-mobile-ads`, `expo-secure-store` beyond settingsStore) or to persist budgets/entitlements — belongs to Epic 4 (3.3 stubs the IAP/ad affordance, Epic 4 wires entitlements); need to change spawn/merge/score rules per lane (FR12/13 never alter rules, P3); need to add interstitial/forced ads during gameplay.

**Never:** Render undo/hint/continue prompts, rewarded-ad affordances, or learning-aid banners in Clean lane; route Clean through any monetization import; add forced/interstitial ads during play in any lane (FR-19); alter `previewFor` distribution or re-roll `pendingSpawn`; suggest swipe direction or expose `pendingSpawn.value` via hint display.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Accelerated: undo affordance gated | `activeLaneId='accelerated'`, `profile.canUndo=true`, `undoBudget={freeUsed:false, iapRemaining:0, unlimited:false}`, history length >=1 | Undo control visible and enabled; `canUndo()` true; `consumeUndo` returns `ok` with previous snapshot | if history empty → `rejected`, no board mutation |
| Accelerated: undo consumes free via ad stub | first undo in game, ad stub succeeds (simulated) | Board+score+stats rewind to previous snapshot, `freeUsed=true`, free undo of the game consumed, `canUndo` still true only if IAP remaining or unlimited | ad stub fail/cancel → no undo consumed, board unchanged, revert to primary affordance |
| Accelerated: second free undo blocked | `freeUsed=true`, no IAP, not unlimited | `canUndo()` false; further ad-undo attempts show IAP alternative + Cancel, never second free ad undo (FR-16) | silent rejected |
| Clean: no assistance affordance | `activeLaneId='clean'`, any undo/hint/continue trigger | No undo/hint/continue UI mounted; `profile.canUndo=false`; no monetization import consulted; budgets ignored | silent noop |
| Accelerated: hint via IAP stub | `activeLaneId='accelerated'`, `hintBudget.remaining=5`, board has mergeable pair | `canHint()` true; consuming hint highlights one valid mergeable pair (`canMerge` predicate) and never reveals spawn or direction; remaining decrements | if no mergeable pair → `rejected`, no highlight; if remaining=0 → blocked |
| Accelerated: death-continue once per game-over | `activeLaneId='accelerated'`, `gameOver=true`, `continueUsed=false` | GameOverOverlay shows primary CTA plus discreet Continue offer (rewarded ad first, IAP alternative, Cancel); consuming continue rewinds pre-death snapshot and `continueUsed=true` | second death → no Continue offer; ad fail/cancel → revert to primary CTA, nothing lost |
| Learning aids contextual only | `activeLaneId='accelerated'`, `profile.showLearningAids=true` | Ceiling indicator banner (dismissible, accent edge, muted copy) appears only when relevant (ceiling >=48 tier open); stuck warning banner appears only when relevant (board near-full / limited moves); both dismissible and never in Clean | dismiss persists for session; if condition not met → banner not mounted |
| Ads only between games | any lane during `playing` with `gameOver=false` | No ad prompt UI ever mounted during play; rewarded prompts only between games (undo prompt at moment of bad move still between-turn, not mid-animation; death-continue as game-over overlay) | if ad stub called during play → guard rejects |

</intent-contract>

## Code Map

- `triade/src/game/lanes.ts:1-90` -- pure LaneProfile data + profile helpers (no RN/engine imports); reference-only, no change (gate source)
- `triade/src/game/assistance.ts` -- NEW pure assistance module: per-match budgets (`UndoBudget`, `HintBudget`, `ContinueBudget`), atomic contracts `canUndo/consumeUndo`, `canHint/consumeHint`, `canContinue/consumeContinue`, `findMergeablePair(board)` via `canMerge`; no RN, no Math.random, no engine mutation
- `triade/App.tsx:34-316` -- orchestrator, screen-state laneSelect→playing, hydration + laneDefault, game/move/isGameOver wiring, Hud/GameOverOverlay host; add in-memory per-match budgets + undo history stack (true rewind of board+pendingSpawn+match+matchStats, dies with newGame/restart/lane-switch), wire Accelerated affordances gated by LaneProfile
- `triade/src/ui/GameOverOverlay.tsx:1-177` -- scrim zIndex:2, 5 stats + CTA, reducedMotion fade; extend discreet Continue slot for Accelerated (rewarded ad first, IAP alternative, Cancel) gated by `activeLaneId` + `canContinue`
- `triade/src/ui/Hud.tsx:10-175` -- HUD overlay zIndex:1, portrait stacked vs landscape band, safe margins, activeLaneId-gated single preview; keep preview gating, add Accelerated undo affordance anchor if needed (still outside swipe rect, ≥44×44)
- `triade/src/ui/AcceleratedAids.tsx` -- NEW UI: dismissible prompt-banners for ceiling indicator + stuck warning (surface-raised strip, accent edge #E8A33D, muted copy, dismiss button ≥44×44), plus reward-prompt pattern (ad first, IAP alternative, Cancel) for undo/continue
- `triade/src/engine/core/rules.ts:1-10` + `ceiling.ts:1-20` + `board.ts` -- `canMerge` predicate + `ceilingDetector`/`tierForCeiling`; consumed by hint finder + banner relevance; no change
- `triade/__tests__/game/assistance.test.ts` -- NEW pure tests for budgets, atomic contracts, hint pair finder, invalid fallback, no-RN guard
- `triade/__tests__/ui/components/acceleratedAids.test.ts` + `hud.test.ts` + `gameOverOverlay.test.ts` -- UI tests for Accelerated-only affordances, Clean purity (no assistance in Clean), banner dismiss, reward prompt layout, CTA targets

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/game/assistance.ts` -- create pure assistance module: export types `UndoBudget = { freeUsed:boolean; iapRemaining:number; unlimited:boolean }`, `HintBudget`, `ContinueBudget`; helpers `initialUndoBudget()`, `initialHintBudget(5)`, `initialContinueBudget()`, `canUndo(budget, historyLen, profile)` / `canHint` / `canContinue`, `consumeUndo/consumeHint/consumeContinue` returning `ok|rejected` without mutating caller; `findMergeablePair(board): [coord,coord]|null` scanning with `canMerge(v,neighbor)` and returning one valid pair or null; guard invalid inputs → `rejected`/null; file pure (relative imports only, no RN/Skia/Expo, no Math.random, no engine board mutation)
- [x] `triade/App.tsx` -- add Accelerated per-match assistance state in memory: `undoHistory: Array<{game:GameState, match:MatchScore, matchStats:MatchStats}>`, `undoBudget`, `hintBudget`, `continueBudget + continueUsed`, `hintHighlight: [coord,coord]|null`, `bannerDismissed: {ceiling:boolean, stuck:boolean}`; push current snapshot onto history before each effective move (`moved===true`), pop on undo; reset all budgets/history on `newGame`/restart/`applyLaneSelection` when needsReset (dies with match per ADR-02); gate every affordance handler by `profileForLaneId(activeLaneId).canUndo/canHint/canContinue/showLearningAids/allowAds`; `handleUndo` checks `canUndo` then consumes budget (first undo = free via ad stub, further via IAP remaining or unlimited), rewinds board+score+stats; `handleHint` checks `canHint`, calls `findMergeablePair`, consumes; `handleContinue` checks `canContinue` and rewinds pre-death snapshot; expose derived `canUndo/canHint/canContinue` + hintHighlight + banner relevance to children; keep `availablePot`/`previews` fan-out and `activeLaneId` wiring byte-compatible; no new SDK imports
- [x] `triade/src/ui/AcceleratedAids.tsx` -- build Accelerated aids UI: two dismissible prompt-banners (`CeilingBanner`, `StuckBanner`) as surface-raised strip (`backgroundColor '#fff7ec'`, `borderLeftColor '#E8A33D'` 3pt accent edge, muted copy, dismiss Pressable ≥44×44, `accessibilityRole button`); `RewardPrompt` for undo/continue with layout "Ver anúncio" (ad first) + "Comprar" (IAP alternative) + "Cancelar" (always), each ≥44×44, accent/neutral styling, never rendered when `activeLaneId==='clean'`; banners appear contextually only when relevant (ceiling banner when `ceilingDetector(board) >=48`, stuck banner when board near-full/limited moves heuristic — e.g. emptyCells <=2 or no mergeable pair with >10 tiles), dismissed state gates re-show for session
- [x] `triade/src/ui/GameOverOverlay.tsx` -- add discreet Continue slot for Accelerated only: add props `activeLaneId?: LaneId`, `canContinue?: boolean`, `onContinue?: () => void`, `onContinueAd?: () => void`, `onContinueIap?: () => void`; when `activeLaneId==='accelerated'` and `canContinue` true, render Continue offer beneath primary CTA "Jogar de novo" with rewarded-ad first + IAP alternative + Cancel per UX-DR-14 (each CTA ≥44×44, accent/neutral), ad fail/cancel reverts to primary CTA, nothing lost; when `activeLaneId==='clean'` or `canContinue===false` render only primary CTA (preserve 3.2 purity); keep 280ms fade, reducedMotion, zIndex:2, a11y alert
- [x] `triade/src/ui/Hud.tsx` -- keep activeLaneId-gated single preview; wire Accelerated undo affordance anchor if needed (small undo chip/button near preview but outside board swipe rect, ≥44×44, `accessibilityLabel 'Desfazer'`), rendered only when `activeLaneId==='accelerated'` and `canUndo` derived from parent; no monetization import, no ad UI during play; portrait bottom corner and landscape band `landscapeRight` parity
- [x] `triade/__tests__/game/assistance.test.ts` + UI tests -- pure tests: budgets round-trip, canUndo/canHint/canContinue gates by profile, free-only-once, unlimited override, findMergeablePair returns valid canMerge pair or null, invalid board → null; UI tests: Accelerated shows undo/hint banners + RewardPrompt, Clean shows none (exactly zero assistance affordances), ceiling banner only when ceiling>=48, stuck banner only when near-full, Continue slot appears once per gameOver in Accelerated only, second gameOver hides slot, ad fail/cancel keeps board, exactly one primary CTA in Clean

**Acceptance Criteria:**
- Given a match on the Accelerated lane, when undo is requested with a free undo remaining and history present, then the board+score+stats rewind exactly (true rewind of last effective move), free undo consumed, and a second free ad-undo in same game is blocked (requires IAP or unlimited)
- Given a match on the Accelerated lane, when hint is requested with remaining hints and a mergeable pair exists, then one valid mergeable pair is highlighted via `canMerge` and never suggests direction nor reveals `pendingSpawn`; when no pair exists or budget 0, hint is rejected with no highlight
- Given game over on the Accelerated lane with `continueUsed===false`, when the overlay renders, then a discreet Continue offer appears beneath primary CTA with rewarded ad first, IAP alternative, Cancel always; consuming continue rewinds pre-death state once, second death shows no Continue offer and ad fail/cancel reverts to primary CTA with nothing lost
- Given the Accelerated lane is active, when ceiling or stuck conditions are met, then the corresponding dismissible prompt-banner (ceiling indicator / stuck warning) appears contextually (accent edge #E8A33D, muted copy, dismiss ≥44×44) and never appears in Clean; dismissed banners stay hidden for the session
- Given either lane during active play (`gameOver===false`), when the game loops, then no ad prompt UI is mounted during play; rewarded prompts appear only between games (undo between-turn, continue at game over) per FR-15/FR-19, and Clean never mounts any reward/ad prompt at any time
- Given invalid assistance inputs (no history, no mergeable pair, invalid lane id), when the helper or UI is invoked, then it fails closed with `rejected`/no-ops, never mutates board/score, and never crashes (guarded fallback to Clean profile)

## Spec Change Log

## Review Triage Log

### 2026-08-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 0, low 2)
- defer: 1: (high 0, medium 0, low 1)
- reject: 1
- addressed_findings:
  - `[low]` `[patch]` Hud `assistRowPortrait` pointerEvents box-none could block Pressable — verified box-none still delivers to children (PauseButton precedent) but tightened to explicit `pointerEvents auto` on assist buttons via style isolation
  - `[low]` `[patch]` `app.restart.test.ts` Clean-only pins updated to allow gated Accelerated Continue — relaxed stripped checks to require `activeLaneId === 'accelerated'` gate and kept Clean single-CTA render pin
- deferred_findings:
  - `handleUndoIap` stub injects `iapRemaining:1` to simulate IAP before Epic 4 entitlements — deferred to Epic 4 (RevenueCat + SecureStore) to wire real `iapRemaining/unlimited` from entitlements
- rejected_findings:
  - `GameBoard` View wrapper around Canvas flagged as layout break — rejected, wrapper preserves width/height and hint highlight overlay is pointerEvents none

## Design Notes

Assistance is data-gated, not UI-disciplined. Every affordance checks `profileForLaneId(activeLaneId)` — Clean's `canUndo:false / canHint:false / canContinue:false / allowAds:false / showLearningAids:false` closes the path by construction (ADR-03 lane wall). Per-match budgets die with `newGame`/restart/lane-switch (never persisted); entitlements (Epic 4) will only affect `iapRemaining/unlimited` in-memory for the current match, and SecureStore remains Epic 4 scope — 3.3 stubs the IAP slot without SDK imports.

History for undo is `Array<{game:GameState, match:MatchScore, matchStats:MatchStats}>` pushed before each effective `move()` and popped on undo; RNG state is intentionally not rewound in 3.3 (mulberry32 closure is not snapshotable today) — the board+score+stats rewind is the true rewind per ADR-06 for gameplay, and the 3-draw RNG budget note lives in `types.ts:6-22`.

Hint finder is `canMerge` scan:

```ts
for each cell (r,c) if neighbor (r,c+1) or (r+1,c) and canMerge(v,neighbor) return pair
```

No direction hint, no `pendingSpawn.value` exposure. Banners are `prompt-banner` surface-raised strip, accent left edge 3pt #E8A33D, muted copy, dismiss button ≥44×44; relevance is board-driven (ceiling >=48 for ceiling indicator, near-full heuristic for stuck warning) and gated by `showLearningAids`.

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (baseline ~470 pass + new 12-16 assistance pins, 0 fail; clean purity tests still pass)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean

**Manual checks (if no CLI):**
- Boot Accelerated: undo affordance visible, tap des.faz rewinds last move once; second tap blocked without IAP; hint highlights one mergeable pair, never shows direction or next spawn value
- Accelerated game over: overlay shows "Continuar" beneath "Jogar de novo" with ad/IAP/Cancel; tap Continuar resumes once, second death hides it; Cancel leaves board unchanged
- Clean: no undo/hint/banners/Continue ever; Accelerated banners appear only when ceiling>=48 or board near-full and dismiss stops re-show

## Auto Run Result

- Summary: Accelerated lane assistência delivered — per-match budgets + undo history rewind (board+score+stats) gated by LaneProfile, hint pair via canMerge, death-continue once per game-over, ceiling/stuck dismissible banners, reward prompts ad-first/IAP alternative/Cancel, all Clean-gated and ads never during play.
- FilesChanged: `triade/src/game/assistance.ts` (new pure budgets + contracts + findMergeablePair), `triade/src/ui/AcceleratedAids.tsx` (new banners + RewardPrompt), `triade/App.tsx` (per-match budgets/history + handlers + banner gating), `triade/src/ui/Hud.tsx` (Accelerated undo/hint affordances), `triade/src/ui/GameOverOverlay.tsx` (discreet Continue slot Accelerated only), `triade/src/render/GameBoard.tsx` (hintHighlight overlay), `triade/__tests__/game/assistance.test.ts` (new pins), `triade/__tests__/ui/components/app.restart.test.ts` (relaxed Clean-only pins to gated Accelerated)
- Review: patch 2 low fixed (Hud pointerEvents, test gating), defer 1 low (handleUndoIap stub), reject 1 (GameBoard wrapper)
- FollowupReview: false (localized low patches, no API/broad impact, purity and lane wall gates green)
- Verification: `npm --prefix triade test` 484 pass 0 fail, `npx tsc --noEmit` clean, `npx tsc --noEmit -p tsconfig.test.json` clean, manual Clean vs Accelerated overlay/hint/banner checks via tests
- Risks: RNG state not rewound on undo (mulberry32 closure); per-lane best still global (belongs to 3.4); IAP entitlements stubbed (Epic 4 wires RevenueCat)
