---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-08-27'
workflowType: 'testarch-trace'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources: ['_bmad-output/implementation-artifacts/6-3-restart-1-tap.md (ACs 1-7)', '_bmad-output/planning-artifacts/epics.md (Epic 6 / Story 6.3)', '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md', '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md', '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md', '_bmad-output/test-artifacts/atdd-checklist-6-3-restart-1-tap.md']
externalPointerStatus: 'not_used'
tempCoverageMatrixPath: '/tmp/tea-trace-coverage-matrix-6-3.json'
inputDocuments: ['_bmad-output/implementation-artifacts/6-3-restart-1-tap.md', '_bmad-output/planning-artifacts/epics.md']
---

# Traceability Report — Story 6.3: Restart 1-tap

**Target:** Story 6.3
**Date:** 2026-08-27
**Evaluator:** Eduardo (TEA Master Test Architect)
**Coverage Oracle:** `acceptance_criteria` via `formal_requirements` (confidence: high) — story file ACs 1–7
**Oracle Sources:** `_bmad-output/implementation-artifacts/6-3-restart-1-tap.md` (ACs 1–7), `epics.md` Epic 6 Story 6.3 lines 766–784 + scope note CC 2026-08-23, `game-architecture.md` (screen-state overlay NFR-3 / ADR-02 per-match budgets / ADR-06 determinism), `DESIGN.md` (scrim `rgba(12,14,17,0.7)` `#0C0E11` @70% / `HIT_TARGET` 44 / `zIndex:2`), `EXPERIENCE.md` (UJ-5 one-more loop / S6.4 elegant fall / UX-DR-25 no forced wait), ATDD checklist 6.3
**Re-verification:** 4 suítes mapeadas executadas ao vivo — **453 pass / 0 fail / 0 skipped** (full triade suite `npm test` 2026-08-27, node 26). Mapped 6.3 subset: **38 pass / 0 fail** (5 restart + 18 overlay + 5 wiring + 10 matchStats, 0 skipped/fixme/pending).

---

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% (6/6 ACs fully covered by active, green tests: AC1 CTA one-tap on same lane, AC2 store reset no navigation/loader, AC3 no confirmation dialog, AC4 9-tile setup same-lane deterministic, AC6 forfeited-continue dies, AC7 never carried/re-offered + AC5 P1 Clean-only guard included), 38 mapped tests active (0 skipped/fixme/pending); full triade suite verified green at run time (453 pass / 0 fail). Gate logic: P0 100% required MET, P1 100% (1/1) ≥90% target MET, overall 100% ≥80% MET. No critical/high gaps, no endpoint/auth blind spots (pure app-domain story), thin-view/purity/norolls guards green, engine/preview/matchStats/render/services byte-identical pure-additive (2 comments + alignSelf).

---

## Coverage Summary

| Priority | Total Criteria | FULL Coverage | Coverage % | Status |
|----------|----------------|---------------|------------|--------|
| P0       | 6              | 6             | 100%       | ✅ PASS |
| P1       | 1              | 1             | 100%       | ✅ PASS |
| P2       | 0              | 0             | 100%*      | ✅ PASS |
| P3       | 0              | 0             | 100%*      | ✅ PASS |
| **Total**| **7**          | **7**         | **100%**   | ✅ PASS |

\* No P2/P3 requirements in isolated 6.3 scope; effective coverage treated as 100% per gate rules. P1-owned hygiene (thin-view, norolls, HIT_TARGET+alignSelf, width 100% wrapper, insets, determinism) is pinned inside P0/P1 criteria and verified via Carry tests — all green.

---

## Traceability Matrix

| Req ID | Requirement (summary) | Priority | Coverage | Tests |
|---|---|---|---|---|
| 6.3-AC1 | Given game-over overlay, When I tap "Jogar de novo", Then new match starts immediately on same lane (FR-26, UJ-5) | P0 | FULL | 6.3-R-001, 6.3-R-002, 6.2-C-004, 6.2-C-012, 6.2-W-001, 6.2-C-013 |
| 6.3-AC2 | And restart resets store and creates new match — no navigation, zero loading screens (architecture, NFR-3) | P0 | FULL | 6.3-R-002, 6.3-R-001, 6.2-W-002, 6.2-C-007, 6.2-C-014 |
| 6.3-AC3 | And restart is one tap from overlay — no confirmation dialog (FR-26) | P0 | FULL | 6.3-R-001, 6.2-C-004, 6.2-C-012 |
| 6.3-AC4 | And new match starts with 9-tile setup and same lane rules as finished match (FR-26) | P0 | FULL | 6.3-R-003, 6.3-R-002, 6.2-U-001, 6.2-U-003, 6.2-U-007, 6.2-W-003 |
| 6.3-AC5 | And in Accelerated a discreet Continue beneath primary when continue remains (D-010, FR-18); in Clean, no offer appears (FR-12) — Clean-only guard | P1 | FULL | 6.3-R-005, 6.2-C-016, 6.2-C-005, 6.2-C-006, 6.2-C-008, 6.2-W-001 |
| 6.3-AC6 | And tapping "Jogar de novo" while continue remains starts immediately and unused continue is forfeited — budget dies with game-over (ADR-02) | P0 | FULL | 6.3-R-004, 6.3-R-002, 6.3-R-005, 6.2-C-016 |
| 6.3-AC7 | And forfeited continue never carried into next match and never re-offered (ADR-02) | P0 | FULL | 6.3-R-004, 6.3-R-002, 6.3-R-005 |

### Detailed Mapping

#### 6.3-AC1: One-tap CTA on same lane (P0) — FULL ✅

- **Sources:** `implementation-artifacts/6-3.md:19` AC1 FR-26 UJ-5, `epics.md:766-784` FR-26, `App.tsx:103-110` handleRestart + `App.tsx:154` isGameOver sibling, `GameOverOverlay.tsx:1-170` CTA `Pressable accessibilityLabel "Jogar de novo"` + `HIT_TARGET 44 alignSelf center`
- **Tests:**
  - `6.3-R-001` `triade/__tests__/ui/components/app.restart.test.ts:94` — CTA one tap calls onRestart once with no confirmation — stripped `App.tsx`+`GameOverOverlay.tsx` have no `Alert`/`confirm(`/`Dialog` (except accessibilityViewIsModal) + `!disabled`, rendered CTA `accessibilityRole button` `onPress spy` 1× then 2× (no lock), `pointerEvents auto` never `none` hittable through 280ms fade (UX-DR-25)
  - `6.3-R-002` `triade/__tests__/ui/components/app.restart.test.ts:134` — handleRestart body order pinned `newGame(rngRef.current)→setGame(s)→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats(s.board))→busyRef=false` with dep `[persistedBest]` only + `!navigation`/`!setTimeout` + `availablePot===1` after `if(!ready)` + `reducedMotion={false}` literal + monetization wall + runtime 9-tile determinism via `newGame(mulberry32(20260808))` + `busyRef double release`
  - `6.2-C-004` `triade/__tests__/ui/components/gameOverOverlay.test.ts:127` — CTA "Jogar de novo" calls onRestart once (thin-view, no confirmation)
  - `6.2-C-012` `triade/__tests__/ui/components/gameOverOverlay.test.ts:266` — Overlay mounts synchronously with all five stats + CTA pressable during fade (no forced wait) — `act(()=>cta.props.onPress())` hits onRestart at opacity 0, pointerEvents never none
  - `6.2-W-001` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:31` — App wiring: `isGameOver(game.board)` committed snapshot + `{gameOver ? <GameOverOverlay : null}` sibling to unconditional `GameBoard` (board not unmounted, one-level overlay) + lane-scoped `match.score/best` + `matchStats.maxTile` + `isNewRecord(sessionStartBestRef)` + `reducedMotion={false}` literal + `insets`
  - `6.2-C-013` `triade/__tests__/ui/components/gameOverOverlay.test.ts:290` — Board last move stays visible: `isGameOver(game.board)` sibling, not `gameBoard=null`, frozen board under `rgba(12,14,17,0.7)` scrim at `zIndex:2` over `Hud zIndex:1`

#### 6.3-AC2: Store reset, no navigation/loader (P0) — FULL ✅

- **Sources:** `implementation-artifacts/6-3.md:20` AC2 NFR-3 / `game-architecture.md:339` screen-state machine (game-over as overlay, not route; restart = reset store), `App.tsx:103-110` + `GameOverOverlay.tsx`
- **Tests:**
  - `6.3-R-002` `triade/__tests__/ui/components/app.restart.test.ts:134` — Structural + runtime instant reset: body order 6 regex in sequence via `src.slice(handleStart,800)` + dep `[persistedBest]` only (no `match.best`, no `sessionStartBestRef.current=`) + `!Alert`/`!Dialog`/`!navigation`/`!navigate(`/`!setTimeout`/`!setInterval` + `!confirm(` + `availablePot===1` shared after `if(!ready)` + `reducedMotion={false}` + monetization wall `!react-native-purchases`/`!react-native-google-mobile-ads`/`!expo-haptics`/`!expo-audio`/`!expo-secure-store` + runtime `newGame(mulberry32) 9 tiles` + `pendingSpawn` pre-resolved 20-draw budget + `initialScore(77) {0,77}` + `initialStats 0/0/0/ceiling` + `busyRef false×2` (handleRestart + onMoveSettled Df5 deadlock defense)
  - `6.3-R-001` carry confirms no confirmation dialog capability exists
  - `6.2-W-002` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:55` — handleRestart deadlock defense: `App.tsx` resets game + match + matchStats + busyRef (Df5: `GameBoard settleTimerRef setTimeout(onMoveSettled,84)` cleared on unmount without `onMoveSettled`; `busyRef=false` defense)
  - `6.2-C-007` `triade/__tests__/ui/components/gameOverOverlay.test.ts:167` — Mount sync (no setTimeout gating) but post-mount `Animated.timing 280/80/Easing.out(cubic)/useNativeDriver true` IS present — proves restart path is instant while overlay fade is post-mount choreography (no loader)
  - `6.2-C-014` `triade/__tests__/ui/components/gameOverOverlay.test.ts:307` — Soft fade + drift exist when `reducedMotion=false` (`FADE_MS 280`+`delay 80`+`Easing.out(Easing.cubic)`+`useNativeDriver:true` + `translateY 12→0`) — overlay fade does not block restart `pointerEvents auto`

#### 6.3-AC3: One tap, no confirmation dialog (P0) — FULL ✅

- **Sources:** `implementation-artifacts/6-3.md:21` AC3 / `DESIGN.md`/`EXPERIENCE.md:98` one-more loop frictionless, `GameOverOverlay.tsx:94-102` single CTA
- **Tests:**
  - `6.3-R-001` `triade/__tests__/ui/components/app.restart.test.ts:94` — Explicit `!Alert` + `!/confirm\(/` + `!Dialog` (only `accessibilityViewIsModal`) over `stripCommentsAndStrings(App.tsx + GameOverOverlay.tsx)` + `!disabled` (no disabled guard), CTA `onPress={onRestart}` direct, `spy` 1× then 2× proves no single-use lock / no dialog intercepts, `hasStyle pointerEvents auto` never `none` (UX-DR-25 no forced wait)
  - `6.2-C-004` `triade/__tests__/ui/components/gameOverOverlay.test.ts:127` — CTA calls onRestart once, thin-view no confirmation
  - `6.2-C-012` `triade/__tests__/ui/components/gameOverOverlay.test.ts:266` — CTA hittable at `opacity 0` immediate after mount (`act(()=>cta.props.onPress())` does not wait for 280ms/80ms)

#### 6.3-AC4: 9-tile setup same lane (P0) — FULL ✅

- **Sources:** `implementation-artifacts/6-3.md:22` AC4 FR-26 / `src/engine/core/game.ts:8-24` 9-tile loop + 20-draw `pendingSpawn` budget ADR-06, `src/game/matchStats.ts:17-23` `initialStats`/`ceilingDetector`, `App.tsx:151` `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once after `if(!ready)` shared by `previewFor`
- **Tests:**
  - `6.3-R-003` `triade/__tests__/ui/components/app.restart.test.ts:233` — Deterministic `newGame(mulberry32(20260808))` 9 tiles twice on same stream (`occA===9 && occB===9`), `pendingSpawn` pre-resolved `value`+`displayRoll` 20-draw budget, `initialStats(a.board).maxTile===ceilingDetector(a.board)`, `clean: previewFor(game.pendingSpawn,availablePot)` + `accelerated: previewFor(...,availablePot)` same `availablePot` fan-out (FR-43 only-3-available + FR-45 both lanes), `potForTier(tierForCeiling(ceilingDetector(board)))` array determinism, handleRestart has no `LaneProfile`/`laneId`/`setLane` flip — implicit same-lane (FR-26, single-lane until Epic 3; after Epic 3 must preserve `LaneProfile.id`)
  - `6.3-R-002` runtime 9-tile invariants inside handleRestart pin (cross-covers AC4)
  - `6.2-U-001` `triade/__tests__/game/matchStats.test.ts:27` — `initialStats` seeds `merges=0, longest=0, current=0` and `maxTile from ceilingDetector(board)`
  - `6.2-U-003` `triade/__tests__/game/matchStats.test.ts:53` — `initialStats` on game board (newGame-like 9-tile) `maxTile` matches `ceiling`
  - `6.2-U-007` `triade/__tests__/game/matchStats.test.ts:174` — `maxTile` monotonic never decreases and tracks `ceilingDetector(postBoard)`
  - `6.2-W-003` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:72` — `doMove` projects via `applyMoveStats(prev,result.board,result)` post-move board (maxTile monotonic source) — carry ensures stats projection stays correct after restart via `initialStats`

#### 6.3-AC5: Clean only primary CTA — Accelerated Continue is Epic 3/4 (P1) — FULL ✅

- **Sources:** `implementation-artifacts/6-3.md:23` AC5 D-010 FR-18 FR-12 + scope note CC 2026-08-23 (Clean-lane restart ships now; Accelerated offer lands with Epic 3/4), `GameOverOverlay.tsx:94-102` single CTA + comment `// AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here`
- **Tests:**
  - `6.3-R-005` `triade/__tests__/ui/components/app.restart.test.ts:322` — Source must have `AC5: Continue offer is Epic 3/4` comment above Pressable; stripped source has no `Continuar`/`onContinue`/`rewardedAd`/`react-native-purchases`/`IAP` (beyond comment), allowed imports only `react`+`react-native` (`Animated`/`Easing` same `'react-native'` specifier) + `./PauseButton HIT_TARGET` + `../ui/layout SAFE_MARGIN` (no `../engine/**`, no `layoutFor`/`isLandscape`/`resolveSwipeDirection`), rendered exactly one `Pressable accessibilityRole button label "Jogar de novo"` (`ctas.length===1` filtered host nodes due to rn-stub composite+host dup) + total buttons `1` (no second `Continuar`), CTA `width: HIT_TARGET`+`height: HIT_TARGET` directly (`/width:\s*HIT_TARGET/` + `height`) + `alignSelf:center` in `styles.cta` + `backgroundColor #E8A33D` dark-ink `#1C1206` (~8.6:1) + `TODO 5.4` waiver, inner `Animated.View width:100% maxWidth:420 alignSelf:center` wrapper (6.2 patch), `reducedMotion={false}` literal in `App.tsx` pinned until 9-4, `insets` required prop `{top,bottom,left,right}` + defensive `?.` fallback
  - `6.2-C-016` `triade/__tests__/ui/components/gameOverOverlay.test.ts:392` — `! /confetti|celebrat|lottie|reward/i` + no `particleBurst`/`shakeMs` + no `Continuar` second CTA + no `Lottie` import, rendered 0 `Continuar` (D-013 no celebration carry)
  - `6.2-C-005` `triade/__tests__/ui/components/gameOverOverlay.test.ts:138` — Scrim final `backgroundColor rgba(12,14,17,0.7)` (`DESIGN.md:193` `#0C0E11` @70%)
  - `6.2-C-006` `triade/__tests__/ui/components/gameOverOverlay.test.ts:158` — Overlay `zIndex:2 elevation:2 position:absolute pointerEvents:auto accessibilityViewIsModal` above Hud `zIndex:1`
  - `6.2-C-008` `triade/__tests__/ui/components/gameOverOverlay.test.ts:191` — CTA `width:HIT_TARGET height:HIT_TARGET` directly (44) + rendered 44
  - `6.2-W-001` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:31` — App threads literal `reducedMotion={false}` until 9-4

#### 6.3-AC6: Forfeited continue dies — budget dies with game-over (P0) — FULL ✅

- **Sources:** `implementation-artifacts/6-3.md:24` AC6 ADR-02 per-match budgets live in memory and die with match (`game-architecture.md:338,382,509-510` + `epics.md:100,551`), `App.tsx:103-110` `handleRestart` is single discard point
- **Tests:**
  - `6.3-R-004` `triade/__tests__/ui/components/app.restart.test.ts:276` — Overlay has no second CTA `Continuar` (`findAll(...Continuar).length===0` host-filtered) + exactly one `Jogar de novo` Pressable, no `onContinue`/`continueRemaining`/`continueBudget` in stripped overlay, `handleRestart` slice contains `forfeited continue dies` comment (T1 single discard point ADR-02) + stripped `handleSlice` has no `\bcontinueBudget\b`/`\bcontinueRemaining\b` carry, no `rewardedAd`/`IAP`/`react-native-purchases`, re-render after restart still single CTA (vacuous forward-compat proves budget die)
  - `6.3-R-002` contains `forfeited continue dies` mandatory comment pin inside handleRestart before `busyRef=false`
  - `6.3-R-005` carry ensures no `rewardedAd` wire
  - `6.2-C-016` carry ensures `Continuar` count 0 (scope guard `S3.3`/`S4.2`)

#### 6.3-AC7: Never carried nor re-offered (P0) — FULL ✅

- **Sources:** `implementation-artifacts/6-3.md:25` AC7 ADR-02, `game-architecture.md:338,382,509-510` per-match budgets memory dies with match (vacuous today, pin forward-compat for `S3.3`/`S4.2` Continue offer Epic 3/4)
- **Tests:**
  - `6.3-R-004` `triade/__tests__/ui/components/app.restart.test.ts:276` — Second render with `gameOver=true` still `0 Continuar` (`second.root.findAll(...Continuar).length===0` — never re-offered on re-mounted `gameOver=true`), `handleStripped` (comment-blanked via `stripCommentsAndStrings(handleSlice)`) has no `continueBudget`/`continueRemaining` carry (`!/\bcontinueBudget\b/ && !/\bcontinueRemaining\b/`), overlay stripped has no `onContinue` beyond comment
  - `6.3-R-002` handleRestart comment ensures no second path carrying `continueRemaining` into `s = newGame(rngRef.current)` (clean)
  - `6.3-R-005` stripped overlay has no `Continuar`/`onContinue`/`continueRemaining` beyond `// AC5` comment — Clean never re-offers; pins prevent scope creep before Epic 3/4

### Test Inventory (deduplicated)

| ID | Level | File:Line | Title |
|---|---|---|---|
| 6.3-R-001 | component | triade/__tests__/ui/components/app.restart.test.ts:94 | [P0] AC1/AC3 CTA one tap calls onRestart once with no confirmation |
| 6.3-R-002 | component | triade/__tests__/ui/components/app.restart.test.ts:134 | [P0] AC1/AC2 handleRestart resets store immediately — 9 tiles, score 0 best persisted, merges 0, null moveResult, busyRef false, same lane, no navigation |
| 6.3-R-003 | component | triade/__tests__/ui/components/app.restart.test.ts:233 | [P0] AC4 9-tile same lane |
| 6.3-R-004 | component | triade/__tests__/ui/components/app.restart.test.ts:276 | [P0] AC6/AC7 forfeited continue dies — never carried, never re-offered |
| 6.3-R-005 | component | triade/__tests__/ui/components/app.restart.test.ts:322 | [P1] AC5 Clean only primary CTA |
| 6.2-C-001 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:84 | [P0] AC1 overlay renders all five stats as own Text nodes (score/best/maxTile/merges/longestStreak) |
| 6.2-C-002 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:93 | [P0] AC1 overlay accessibility announcement contains "Game over" + stats (a11y contract) |
| 6.2-C-003 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:112 | [P0] AC1 isNewRecord=true appends "Novo recorde" to a11y and highlights number with accent #E8A33D |
| 6.2-C-004 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:127 | [P0] AC1 CTA "Jogar de novo" calls onRestart once (thin-view, no confirmation dialog) |
| 6.2-C-005 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:138 | [P0] AC2 scrim uses rgba(12,14,17,0.7) via backgroundColor (not opacity) — children keep full opacity (DESIGN.md:193, mockup key-gameover.html:43) |
| 6.2-C-006 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:158 | [P0] AC2 overlay sits above Hud (zIndex:2, elevation:2) and blocks gestures via pointerEvents auto (one-level overlay, DESIGN.md:251-253) |
| 6.2-C-007 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:167 | [P0] AC2/AC3 supersedes 6.1 timing guard — mount sync (no setTimeout gating) but post-mount Animated.timing 280/80/Easing/useNativeDriver IS present (elegant fall) |
| 6.2-C-008 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:191 | [P0] AC2 CTA hit target is HIT_TARGET (44) via width+height directly (thinview gate thinview.test.ts:39-40) |
| 6.2-C-009 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:208 | [P1] AC1/AC2 stat row tokens: label muted #8a8578 13/500, value text #1a1d23 17/500 tabular-nums (DESIGN.md:153-279 token table) |
| 6.2-C-010 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:219 | [P1] AC4 overlay is thin-view: never imports engine roll symbols, never Math.random, never layout/orientation rule logic (ui.norolls + ui.thinview + engine.purity) |
| 6.2-C-011 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:240 | [P1] reducedMotion prop gates future fade — defaults appropriately and overlay carries no transform when false (Epic 9 gate for 6.2) |
| 6.2-C-012 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:266 | [P0] AC1/AC2 overlay mounts synchronously with all five stats and CTA pressable during fade (no forced wait) |
| 6.2-C-013 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:290 | [P0] AC1 board last move stays visible — overlay does not unmount GameBoard |
| 6.2-C-014 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:307 | [P0] AC2/AC3 soft fade + drift exist when reducedMotion=false (elegant fall) |
| 6.2-C-015 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:349 | [P0] AC4 reducedMotion=true cuts fade/drift (setValue, drift 0, haptics/sound stay) |
| 6.2-C-016 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:392 | [P0] AC5 no celebration/confetti/reward pacing |
| 6.2-C-017 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:408 | [P1] tokens + HIT_TARGET preserved through fade (DESIGN.md:153-279 table) |
| 6.2-C-018 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:424 | [P1] thin-view + norolls still green (overlay imports only react-native + same-dir + SAFE_MARGIN) |
| 6.2-C-019 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:445 | [P1] AC4 insets fallback — undefined insets yields SAFE_MARGIN-only padding (defensive, App always passes insets) |
| 6.2-C-020 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:484 | [P1] AC2/AC3 unmount mid-fade cleans up animation without leak (restart during 280ms fade) |
| 6.2-W-001 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:31 | [P0] AC1/AC4 App wiring: App.tsx renders GameOverOverlay when isGameOver(game.board) and passes lane-scoped stats |
| 6.2-W-002 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:55 | [P0] AC4/T3 handleRestart deadlock defense: App.tsx resets game + match + matchStats + busyRef |
| 6.2-W-003 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:72 | [P0] AC1 doMove projects via applyMoveStats on post-move board (maxTile monotonic source) |
| 6.2-W-004 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:86 | [P0] AC1/AC2 runtime: gameOver board is full with no mergeable pair — isGameOver true and overlay would mount with correct stats shape |
| 6.2-W-005 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:147 | [P1] AC1 gameOver board edge: emptyBoard is NOT gameOver, full-but-mergeable board is NOT gameOver |
| 6.2-U-001 | unit | triade/__tests__/game/matchStats.test.ts:27 | [P0] AC1 initialStats seeds merges=0, longest=0, current=0 and maxTile from ceilingDetector(board) |
| 6.2-U-002 | unit | triade/__tests__/game/matchStats.test.ts:43 | [P0] AC1 initialStats on empty-ish board uses ceiling 0 (defensive floor) |
| 6.2-U-003 | unit | triade/__tests__/game/matchStats.test.ts:53 | [P0] AC1 initialStats on game board (newGame-like 9-tile setup) maxTile matches ceiling |
| 6.2-U-004 | unit | triade/__tests__/game/matchStats.test.ts:67 | [P0] AC1 applyMoveStats increments merges by trace merge count (from.length===2, or classify==='merge') |
| 6.2-U-005 | unit | triade/__tests__/game/matchStats.test.ts:102 | [P0] AC1 applyMoveStats streak: consecutive merge moves increment currentStreak by 1, longestStreak tracks max |
| 6.2-U-006 | unit | triade/__tests__/game/matchStats.test.ts:143 | [P0] AC1 streak is per-move, not per-tile: [3,3,3,3]->[6,6] (two merges in one swipe) counts as ONE streak step |
| 6.2-U-007 | unit | triade/__tests__/game/matchStats.test.ts:174 | [P0] AC1 maxTile monotonic: never decreases and tracks ceilingDetector(postBoard) |
| 6.2-U-008 | unit | triade/__tests__/game/matchStats.test.ts:207 | [P1] AC1/AC4 applyMoveStats determinism: same prev+board+result yields deepEqual, no mutation of prev |
| 6.2-U-009 | unit | triade/__tests__/game/matchStats.test.ts:236 | [P1] AC4 applyMoveStats purity: no Math.random, no engine roll symbols, host-testable (no RN) |
| 6.2-U-010 | unit | triade/__tests__/game/matchStats.test.ts:265 | [P1] AC3 lane-scoped best is NOT inside MatchStats — matchStats only owns merges/longestStreak/maxTile/currentStreak (separation pin) |

Files: 4 · Cases: 38 · Skipped/Fixme/Pending: 0/0/0

### Coverage Validation Notes

- **AC1** immediate same-lane start is proven at three layers: CTA presentational `GameOverOverlay` single `Pressable accessibilityLabel "Jogar de novo" accessibilityRole button onPress={onRestart} direct` (R-001 + C-004) with stripped no-Alert/confirm/Dialog + pointerEvents auto never none hittable through fade (R-001 + C-012 at opacity 0 callable via `act(()=>cta.props.onPress())` 1× then 2× no lock), orchestrator `handleRestart` body order pinned `newGame(rngRef.current)->setGame->setMoveResult(null)->setMatch(initialScore(persistedBest))->setMatchStats(initialStats(s.board))->busyRef=false` with dep `[persistedBest]` only (R-002 order[6] + dep regex) + `!setTimeout`/`!navigation`/`!Alert` (NFR-3 / screen-state machine `game-architecture.md:339`), and App wiring (W-001 `isGameOver(game.board)` sibling + W-004 runtime full no-mergeable true + emptyBoard false). Scrim stays `rgba(12,14,17,0.7)` final (C-005) while outer Animated opacity 0→1 drives fade — children keep fading together, not dimmed separately; CTA stays `pointerEvents auto` through `FADE_MS 280 delay80`.
- **AC2** store reset no-loader is source-pinned as 6 regex in order + runtime 9 tiles: `newGame(mulberry32(20260808))` → 9 occupied + `pendingSpawn` pre-resolved 20-draw budget + `initialScore(77)={0,77}` + `initialStats merges0/longest0/current0/maxTile===ceilingDetector` (R-002). `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once-per-render after `if(!ready)` shared by `clean`+`accelerated` via `previewFor(game.pendingSpawn,availablePot)` (R-002 count===1 + R-003 fan-out). `busyRef=false` appears ≥2× (handleRestart + onMoveSettled `App.tsx:122-124` Df5 deadlock defense) — without reset next match freezes on first swipe. `reducedMotion={false}` literal until 9-4 (R-002). Monetization wall `!react-native-purchases/...` (R-002) + `ui.norolls`/`ui.thinview`/`engine.purity` green.
- **AC3** no-dialog is negative-pinned: `stripCommentsAndStrings(App.tsx + GameOverOverlay.tsx)` has no `Alert`/`confirm(`/`Dialog` (only `accessibilityViewIsModal`) + no `disabled` guard (R-001 text `must not use disabled`), CTA `1×` then `2×` proves no single-use lock; outer `pointerEvents auto` + inner alert sibling CTA pattern preserves a11y (outer `Animated.View pointerEvents auto accessibilityViewIsModal`, inner `View accessible alert` groups stats only, CTA sibling outside alert — 6.1 a11y fix carry via C-002/C-006).
- **AC4** 9-tile same-lane determinism is runtime + structural: `newGame(mulberry32(20260808))` 9 tiles twice on same stream (R-003 `occA===9 && occB===9`), `pendingSpawn` pre-resolved after 20 draws, `initialStats.maxTile===ceilingDetector` (R-003), shared `availablePot` fan-out `clean: previewFor(...,availablePot)`+`accelerated: previewFor(...,availablePot)` regex at `R-003:269-270`, `potForTier(tierForCeiling(ceilingDetector(board)))` derivation invariant. HandleRestart has no `LaneProfile`/`laneId`/`setLane` flip — implicit same-lane today (R-003). After Epic 3 `LaneProfile.id` must be preserved — structural guard documents vacuous today vs explicit tomorrow. Engine pure, preview invariant, matchStats, render, services all byte-identical — 6.3 is pure-additive `App.tsx`/`GameOverOverlay.tsx` additive comments + `alignSelf:center` already 6.1.
- **AC5** Clean-only is absence + presence pinned: `// AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here` comment above `Pressable` (R-005 source `src.includes('AC5: Continue offer is Epic 3/4')`), stripped source has no `Continuar`/`onContinue`/`rewardedAd`/`react-native-purchases`/`IAP`/`onContinue` (R-005), rendered exactly one `Pressable button "Jogar de novo"` (`allButtons.length===1` filtered host nodes via `typeof n.type==='string'` due to rn-stub composite+host dup) + total buttons 1 (no second `Continuar` — Accelerated would add later). CTA `width: HIT_TARGET`+`height: HIT_TARGET` directly + `alignSelf:center` + `backgroundColor #E8A33D` dark-ink `#1C1206` (~8.6:1) + wrapper `width:100% maxWidth:420 alignSelf:center` (6.2 patch). Scrim/elevation/HIT_TARGET via C-005/C-006/C-008 carry. Accelerated path belongs to `S3.3`/`S4.2` not shipped — pin guards scope creep.
- **AC6/AC7** forfeited-continue dies/never re-offered is vacuous forward-compat but structurally enforced before it can be violated: `handleRestart` contains `forfeited continue dies` comment before `busyRef=false` (R-004 + R-002 cross-cover) as single discard point ADR-02 (per-match budgets memory dies with match `game-architecture.md:338,382,509-510` + `epics.md:100,551`); stripped `handleSlice` (via `stripCommentsAndStrings(handleSlice)`) has no `\bcontinueBudget\b`/`\bcontinueRemaining\b` (`!/continueBudget/ && !/continueRemaining/` in R-004), overlay stripped has no `onContinue`/`continueRemaining`/`continueBudget`/`rewardedAd`/`react-native-purchases` beyond `// AC5` comment. Rendered `0 Continuar` before and after restart (`continuars.length===0` + `second.root.findAll(...Continuar).length===0` — R-004) proves never carried nor re-offered on re-mounted `gameOver=true` until Epic 3/4 owns it. Future Accelerated `S3.3`/`S4.2` must keep this pin green (contract: per-match budgets memory-only die with match).
- **Heuristics:** endpoint/auth N/A (pure app-domain, no HTTP/API per `game-architecture.md` purity wall); happy-path-only gaps: 0 (negative paths via zero-merge streak reset, noop emptyBoard `isGameOver false`, full-but-mergeable `1|2 or equal≥3` not gameOver `W-005`, reducedMotion true `setValue(1)/setValue(0)` early return not `duration:0` `C-015`, unmount mid-fade `C-020`, `!Alert`/`!confirm(`/`!Dialog`/`!disabled`, `!setTimeout`/`!navigation` NFR-3, `!continueBudget` carry `R-004`). UI journey is state-overlay (`isGameOver(game.board)` sibling), not route — E2E intentionally N/A same posture as 7.1/7.2/6.1; UI state gaps: 0 (insets `undefined`/zero → `SAFE_MARGIN 16` `C-019`, `isNewRecord true/false` `C-003`, `reducedMotion true/false` `C-015`, `pointerEvents auto` never `none` `R-001`).
- **Structural guards still green:** `npx tsc --noEmit` clean (both configs `tsconfig.json` + `tsconfig.test.json` via `rn-stub` + `ignoreDeprecations`, only `TS5101 baseUrl` waiver already 7-1 deferred); `git diff --stat -- triade/src/engine` empty (ADR-01 engine pure); `git diff --stat -- triade/src/game/preview.ts` empty (FULL_POT_LADDER/ previewFor frozen); `git diff --stat -- triade/src/game/matchStats.ts` empty (initialStats/applyMoveStats unchanged); `git diff --stat -- triade/src/render` empty (`EARLY_INPUT_MS 84` + `settleTimerRef` re-arm unchanged, Df5); `git diff --stat -- triade/src/services` empty (no monetization/ SecureStore lanes); `triade/App.tsx` diff pure-additive 2 comments + wiring intact (availablePot once, doMoveRef/busyRef/onMoveSettled, reducedMotion false literal, insets); `npm test` 453/0 (0 skipped) verified live; `ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`/`app.gameOverWiring` green — `Animated`/`Easing` from `'react-native'` (allowed same specifier) so `isAllowedViewImport` stays green, no `react-native-reanimated`/`@shopify/react-native-skia`/`expo-haptics`/`expo-audio`/`react-native-purchases` until Epic 4.

---

## Gaps & Recommendations

**Coverage gaps (in-scope):** none (critical: 0, high: 0, medium: 0, low: 0).

**All 7 ACs FULL.** No P0 gaps. No waived blockers. Engine pure, preview invariant, matchStats, render, services all byte-identical — 6.3 is pure-additive `GameOverOverlay`/`App.tsx` additive comments + 5 structural pins.

**Recommendations:**
1. **LOW — OPEN** — Keep `app.restart.test.ts` 5 active as single source of truth for FR-26 frictionless loop + `gameOverOverlay.test.ts` 18 + `app.gameOverWiring.test.ts` 5 + `matchStats.test.ts` 10; any `App.tsx handleRestart` body order / dep / `busyRef` / `availablePot` / `reducedMotion` literal or `GameOverOverlay.tsx` CTA `HIT_TARGET`/`alignSelf`/`width:100%` display change must keep 38 pins green and be flagged in `deferred-work.md`. Do not delete `// AC6/7 forfeited continue dies` or `// AC5: Continue…` when Accelerated ships — only expand/document.
2. **INFO — OPEN** — When Epic 3 LaneProfile lands (S3.3), expand handleRestart same-lane implicit (single-lane today) to explicit `LaneProfile.id` preservation — pin `app.restart.test.ts:273` documents implicit today; do not add `SecureStore`/`MMKV` lane memory before S3.1; also re-evaluate `game-architecture.md:776-777` `longestStreak` undo-owned vs per-match cumulative.
3. **LOW — OPEN** — `engine.purity` blind spots + 4 low defers (ULP 0.6 `preview.ts:80`, fallback beyond ladder `192>96`, mutable `slice()` no freeze, board shallow ref `gameState` by ref) + Df5 carry respected (`busyRef=false` defense); `-p tsconfig.test.json` `TS5101 baseUrl` waiver carry — do not silence fix inside Epic 6.
4. **INFO — OPEN** — When Epic 9 settings (story 9-4) lands, replace `App.tsx` literal `reducedMotion={false}` with `settings.reducedMotion` without changing `GameOverOverlay` API (wiring pin `W-001` enforces prop still threaded).

---

## Next Actions

Gate **PASS** — Story 6.3 approved do ponto de vista de cobertura/traceabilidade, com frictionless loop fechado (1-tap CTA no confirmation, instant same-lane store reset 9 tiles `mulberry32(20260808)` + `pendingSpawn` 20-draw budget + `initialScore`/`initialStats` invariants + `busyRef=false`×2 + `availablePot` once-per-render fan-out + `reducedMotion={false}` literal + forfeited-continue die/never-reoffered vacuous pin forward-compat + Clean-only Single CTA guard `HIT_TARGET`+`alignSelf:center`+`width:100%` wrapper + scrim `rgba(12,14,17,0.7)` `zIndex:2`). Engine permanece byte-identical.

---

_Gate decision summary (step-05):_

🚨 GATE DECISION: **PASS**

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (PASS target: 90%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale: All 7 acceptance criteria traced to active, green tests across unit and component layers; zero uncovered requirements; mapped 6.3 suites 38 pass / 0 fail (5 restart +18 overlay +5 wiring +10 matchStats); full triade suite 453 pass / 0 fail; structural guards green; no waived blockers. Forfeited-continue AC6/7 is vacuous-in-Clean but enforced as structural forward-compat pin (per-match budgets ADR-02) before Epic 3/4 can violate it.

⚠️ Critical Gaps: 0

📂 Machine-readable outputs:
- `_bmad-output/test-artifacts/traceability/coverage-matrix-6-3.json`
- `_bmad-output/test-artifacts/traceability/e2e-trace-summary-6-3.json`
- `_bmad-output/test-artifacts/traceability/gate-decision-6-3.json`

ℹ️ GATE: PASS - Release approved, coverage meets standards
