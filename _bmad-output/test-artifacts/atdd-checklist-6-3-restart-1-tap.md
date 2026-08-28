---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-27'
workflowType: 'testarch-atdd'
storyId: '6.3'
storyKey: '6-3-restart-1-tap'
storyFile: '_bmad-output/implementation-artifacts/6-3-restart-1-tap.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-6-3-restart-1-tap.md'
generatedTestFiles:
  - 'triade/__tests__/ui/components/app.restart.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/6-3-restart-1-tap.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md'
  - 'triade/App.tsx'
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/ui/PauseButton.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/game/matchScore.ts'
  - 'triade/src/game/matchStats.ts'
  - 'triade/src/game/preview.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/__tests__/ui/components/gameOverOverlay.test.ts'
  - 'triade/__tests__/ui/components/app.gameOverWiring.test.ts'
  - 'triade/__tests__/ui/ui.norolls.test.ts'
  - 'triade/__tests__/ui/ui.thinview.test.ts'
  - 'triade/__tests__/engine/engine.purity.test.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/test-utils/rn-stub.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist - Epic 6, Story 6.3: Restart 1-tap

**Date:** 2026-08-27
**Author:** Eduardo (TEA / Murat)
**Primary Test Level:** Component (host-testable RN presentational + structural App wiring via `react-test-renderer` + `tsx`) — `App.tsx` `handleRestart` is an orchestrator callback resetting store on same lane (FR-26, NFR-3) and `GameOverOverlay.tsx` is a thin overlay (Clean-lane single CTA). No E2E/API/Unit required (host-testable surface, `src/engine`/`src/game/preview`/`src/game/matchStats` byte-identical by design; `App.tsx` verification is structural over `stripCommentsAndStrings` plus rendered-overlay runtime pins, same posture as 6.1/6.2).

---

## Story Summary

As a player, I want to start over with one tap from the game-over overlay, so that the "one more" loop is frictionless. Clean-lane 1-tap restart: tapping "Jogar de novo" starts a new match immediately on the same lane (FR-26, UJ-5) — no navigation, zero loading screens (NFR-3), no confirmation dialog (1-tap), same lane with 9-tile setup and lane rules preserved. Forfeited-continue semantics are pinned for forward-compat (Accelerated Continue offer FR-18 lands with Epic 3/4; AC5 clean shows only primary CTA, AC6/7 forfeited continue dies with game-over, never carried nor re-offered). This story verifies/strengthens the existing `App.tsx:103-110` `handleRestart` contract and `GameOverOverlay.tsx` single-CTA contract with additive comments + structural pins.

**As a** player
**I want** to start over with one tap
**So that** the "one more" loop is frictionless

---

## Acceptance Criteria

1. **AC1 / FR-26, UJ-5** — Given the game-over overlay, When I tap "Jogar de novo", Then a new match starts immediately on the same lane.
2. **AC2 / architecture, NFR-3** — And the restart resets the store and creates a new match — no navigation, zero loading screens.
3. **AC3 / FR-26, UX-DR-12** — And the restart is one tap from the overlay — no confirmation dialog.
4. **AC4 / FR-26** — And the new match starts with the 9-tile setup and the same lane rules as the finished match.
5. **AC5 / D-010, FR-18, FR-12** — And in the Accelerated lane, a discreet Continue offer sits beneath the primary Jogar de novo when a continue remains (D-010, FR-18); in Clean, no offer appears (FR-12). — **Scope note (CC 2026-08-23): Clean-lane restart ships now; Accelerated offer lands with Epic 3/4. This story pins Clean only.**
6. **AC6 / ADR-02, per-match budgets** — And tapping "Jogar de novo" while a continue remains starts the new match immediately and the unused continue is forfeited — the once-per-game-over budget dies with the game-over state.
7. **AC7 / ADR-02** — And the forfeited continue is never carried into the next match and never re-offered.

**AC grouping for this story (single-lane):**
- **Clean asserts (P0, ship now):** AC 1, 2, 3, 4 — one tap `onRestart` resets store instantly on same lane with 9 tiles, no dialog, no navigation.
- **Forward-compat pins (P0 structural, vacuous today):** AC 5, 6, 7 — Clean renders only primary CTA; any per-match continue budget dies with `handleRestart` and is never re-offered. No Accelerated UI ships now; pins prevent scope creep and guard `S3.3`/`S4.2`.

---

## Story Integration Metadata

- **Story ID:** `6.3`
- **Story Key:** `6-3-restart-1-tap`
- **Story File:** `_bmad-output/implementation-artifacts/6-3-restart-1-tap.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-6-3-restart-1-tap.md`
- **Generated Test Files:**
  - `triade/__tests__/ui/components/app.restart.test.ts` (NEW — T3, 5 tests, ~390 lines, `test.skip` red-phase; canonical per story)

> No BMM `create-story` wrapper exists — `dev-story` should discover scaffolds via this checklist / story `Dev Notes`. This story is **pure-additive** (comments+tests only, `src/engine`/`src/game/preview`/`src/game/matchStats`/`src/render`/`src/services` byte-identical — ADR-01 + preview + services walls). `App.tsx` literal `reducedMotion={false}` stays until 9-4; `AC6/7` forfeited-continue is vacuous today but structurally pinned, `AC5` Clean-only CTA is the single-CTA guard.

---

## Stack Detection

- **Config `test_stack_type`:** `auto`
- **Detected stack:** `frontend` (Expo RN — `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia` 2.6.2 + `react-native-reanimated` 4.5.1, but restart uses `Animated` from `react-native` only via existing 6.2 fade; overlay remains thin-view) adapted runner is `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`) — preserves `node:test` host-testable rule since S1.1. No `playwright.config.*` / `cypress.config.*` anywhere.
- **Test framework:** `node:test` + `node:assert` + `react-test-renderer` 19.2.3 + `tsx` loader (not Playwright/Cypress). `playwright`/`cypress` not installed; `tea_use_playwright_utils:true` is **not applicable** to this host surface (scanned `__tests__` for `page.goto`/`page.locator` → 0 hits → would select API-only profile, intentionally skipped).
- **TEA flags:** `tea_use_playwright_utils: true` (skipped), `tea_use_pactjs_utils: false`, `tea_pact_mcp: none`, `tea_browser_automation: auto` (no browser surface), `tea_execution_mode: auto` → resolved `sequential` (pure host tests, subagents adapted → sequential direct write), `tea_capability_probe: true`, `test_stack_type: auto`

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (7 ACs, FR-26/UJ-5, NFR-3, FR-18/FR-12, ADR-02; 6.2 landed at `74813af`/`3218d23` 448 pass; Epic 6 before 3/4 single-lane — CC 2026-08-23)
- [x] Test framework configured — `triade/package.json` `test` script + `tsconfig.test.json` (`baseUrl:.`, `paths:{react-native: rn-stub}`, `ignoreDeprecations:6.0`) + `node:test` (baseline 448 pass / 0 fail on current `HEAD` after 6.2; 6.1→6.2 +8 to 448)
- [x] Development environment available (Node 26, `tsx` 4.23.12, `react-test-renderer` 19.2.3, `typescript` 6.0.3)
- [x] Existing patterns inspected — `__tests__/ui/components/gameOverOverlay.test.ts` (14 pins after 6.2: stats rows, a11y, scrim `rgba(12,14,17,0.7)`, `zIndex:2`, `HIT_TARGET`, `alignSelf:center`, wrapper `width:100%`, insets fallback, fade/drift, reducedMotion branch, no celebration), `app.gameOverWiring.test.ts` (structural `isGameOver(game.board)` + `availablePot` once-per-render + `handleRestart` deadlock defense `busyRef=false`), `ui.norolls.test.ts` (`ROLL_SYMBOLS` + `Math.random` guard over `src/ui|src/render|src/services`), `ui.thinview.test.ts` (`isAllowedViewImport` `react-native`+same-dir + `RULE_LOGIC_SYMBOLS`), `test-utils/helpers.ts` (`stripCommentsAndStrings` string-aware, `extractNamedImports`, `boardWith`/`gameState`/`mulberry32`/`newGame` + `initialScore`/`initialStats`/`ceilingDetector`), `test-utils/rn-stub.ts` (host `View/Text/Pressable/StyleSheet` + `Animated.Value`/`timing`/`parallel` + `Easing.out(Easing.cubic)`), `src/ui/layout.ts` (`SAFE_MARGIN 16`), `App.tsx:103-110` (`handleRestart` body + `doMoveRef`/`busyRef`/`onMoveSettled` `EARLY_INPUT_MS 84` gate), `GameOverOverlay.tsx:94-102` (`Pressable` CTA `width/height HIT_TARGET` + `alignSelf:center`)

---

## Knowledge Base Fragments Loaded

- **Core (always):** `data-factories.md` (adapted: no faker — literal `stats: {score,best,maxTile,merges,longestStreak}` fixtures + `baseProps` helper, determinism mandatory, zero-dep project; `boardWith` + `mulberry32` + `newGame` deterministic 9-tile fixtures inline), `test-quality.md` (Given-When-Then, one intent per test, determinism, isolation — each `renderOverlay` builds fresh renderer, no shared board; `act()` for `onPress`), `test-healing-patterns.md` (`test.skip()` + direct `import(SPEC)` for CI-green red phase; module exists, pins guard for missing additive comments — RED when comment absent, GREEN after T1/T2 ships), `test-levels-framework.md` (Component + structural source-pin is correct level for orchestrator callback + thin overlay; Unit/E2E/API duplicate avoided — `matchStats` unit already green from 6.1, engine `src/engine` byte-identical by wall)
- **Frontend conditional (applied — component surface):** `selector-resilience.md` (RN: `accessibilityLabel`/`accessibilityRole` + style markers `backgroundColor rgba(12,14,17,0.7)`, `zIndex:2`, `pointerEvents:auto`, `width: HIT_TARGET` + `alignSelf:center` — resilient to text changes; CTA remains hittable through 280ms fade `pointerEvents:auto` never `none`), `timing-debugging.md` (post-mount timing already pinned by 6.2; this story pins **no** added timer — `handleRestart` must have **no** `setTimeout`/`setInterval` + CTA hittable during fade; `busyRef=false` deadlock Df5 defense pinned), `component-tdd.md` (red→green→refactor via `react-test-renderer` + `hasStyle`/`allText`/`collectStyles` copy pattern, provider isolation not needed — no `GestureHandlerRootView` inside overlay; `App.tsx` verification via structural source pin not mount)
- **Backend patterns (gates):** `test-priorities-matrix.md` (P0 = 1-tap CTA no dialog + handleRestart store reset 9 tiles same-lane + forfeited-continue die/never re-offered; P1 = Clean-only primary CTA single pressable `AC5` + `alignSelf`/`width:100%` wrapper), `ci-burn-in.md` (adapted: `git diff --stat` engine/preview/matchStats/render/services byte-identical gates + `npm test` + `tsc --noEmit` on both configs)
- **Playwright Utils (skipped):** `overview.md`, `api-request.md` etc. not loaded — no browser surface (same adaptation as 6.1/6.2/7.3)
- **Traditional Patterns (skipped):** `fixture-architecture.md`, `network-first.md` — no Playwright fixtures/network

---

## Generation Mode

**Chosen:** AI Generation (no browser recording). Reason: acceptance criteria are clear and the surface is a thin overlay plus an orchestrator callback. All 7 ACs are host-testable: `GameOverOverlay.tsx` CTA is a dumb presentational `Pressable` with deterministic props (`stats`, `isNewRecord`, `onRestart`, `reducedMotion`, `insets`) and `App.tsx` `handleRestart` is a `useCallback(() => { newGame→setGame→setMoveResult(null)→setMatch(initialScore)→setMatchStats(initialStats)→busyRef=false }, [persistedBest])` orchestrator — both verifiable via `react-test-renderer` (CTA `onRestart` once, `pointerEvents:auto` hittable through 280ms fade) plus source-level `stripCommentsAndStrings` pinning (handle body order, dep `[persistedBest]` only, `!Alert`/`!confirm(`/`!Dialog`/`!navigation`/`!setTimeout`, `availablePot` once-per-render after `if(!ready)`, forfeited-continue `// AC6/7` comment, monetization wall `!react-native-purchases`). No browser interaction needs live verification; the 6.3 restart is host-testable via `react-test-renderer` + `rn-stub` (same posture as 6.1/6.2 overlay + `PreviewCard`/`Hud` in 7.2/7.3 and `app.gameOverWiring.test.ts`). `tea_browser_automation: auto` finds no web surface to record; recording is dead weight. `detected_stack: frontend` would allow recording, but overlay has no DOM and `rn-stub` provides headless `Animated.View` if needed — recording would add no signal. Forward-compat pins (AC5/6/7) are structural (no Accelerated UI ships now; they pin the contract so `S3.3`/`S4.2` cannot be violated before they land).

---

## Test Strategy

| AC | Scenario | Level | Priority | File | Test Names |
|----|----------|-------|----------|------|------------|
| AC1/AC3 | CTA one tap calls onRestart once with no confirmation — `renderOverlay({onRestart: spy})` + `act(() => cta.props.onPress())` → `spy` 1×; stripped `App.tsx`+`GameOverOverlay.tsx` have no `Alert`/`confirm(`/`Dialog` (T1/T2 pin, UX-DR-12/25 no forced wait, CTA `pointerEvents:auto` hittable during 280ms fade) | Component (rendered + structural) | P0 | `app.restart.test.ts` | `[P0] AC1/AC3 CTA one tap calls onRestart once with no confirmation` |
| AC1/AC2 | handleRestart resets store immediately — source pin body order `newGame(rngRef.current)` → `setGame(s)` → `setMoveResult(null)` → `setMatch(initialScore(persistedBest))` → `setMatchStats(initialStats(s.board))` → `busyRef.current=false` in that order + dep `[persistedBest]` only + `!navigation` + `!setTimeout` + `// AC6/7: forfeited continue dies` comment + `availablePot ===1` shared + `reducedMotion={false}` literal + monetization wall `!react-native-purchases/...` + runtime 9-tile determinism `newGame(mulberry32(20260808))` 9 non-null + `pendingSpawn` pre-resolved + `initialScore`/`initialStats` 0/ceiling + `busyRef` double release | Component (structural + runtime) | P0 | `app.restart.test.ts` | `[P0] AC1/AC2 handleRestart resets store immediately — 9 tiles, score 0 best persisted, merges 0, null moveResult, busyRef false, same lane, no navigation` |
| AC4 | 9-tile same lane — `newGame` deterministic 9 tiles (`src/engine/core/game.ts` 9-tile loop) on same `mulberry32(20260808)` stream, `ceilingDetector(board)` equals `initialStats(board).maxTile`, `potForTier(tierForCeiling(...))` availablePot fan-out preserved (`clean`/`accelerated` both `previewFor(game.pendingSpawn, availablePot)`), no `LaneProfile`/`SecureStore` lane-switch in handleRestart (implicit same-lane until Epic 3) | Component (runtime + structural) | P0 | `app.restart.test.ts` | `[P0] AC4 9-tile same lane` |
| AC6/AC7 | Forfeited continue dies — never carried, never re-offered — `GameOverOverlay` no second CTA (`findAll(...'Continuar').length===0`) + exactly one `Pressable` `Jogar de novo` + handleRestart contains `forfeited continue dies` comment + no surviving `continueBudget`/`continueRemaining` in stripped handle body + no `onContinue`/`rewardedAd`/`IAP`/`react-native-purchases` in Clean overlay + re-render after restart still single CTA (forward-compat pin per-match memory dies with match ADR-02) | Component (rendered + structural) | P0 | `app.restart.test.ts` | `[P0] AC6/AC7 forfeited continue dies — never carried, never re-offered` |
| AC5 | Clean only primary CTA — stripped source no `/Continuar|continue|reward/i` second-CTA UI + no `onContinue` beyond comment, rendered overlay exactly one `Pressable` with `accessibilityRole="button"` label `"Jogar de novo"` + CTA `width:HIT_TARGET`/`height:HIT_TARGET`+`alignSelf:center` + `backgroundColor #E8A33D` dark-ink `#1C1206` + inner `Animated.View` wrapper `width:100% maxWidth:420 alignSelf:center` + `reducedMotion={false}` pin + insets required | Component | P1 | `app.restart.test.ts` | `[P1] AC5 Clean only primary CTA` |

**No duplicate coverage** across levels — all 6.3 scenarios are Component (thin-view + structural App wiring). E2E is intentionally absent (restart is a store reset, not a browser journey; simulator-manual covers tap-to-restart as in 1.6/6.1). Unit is absent (no new pure function; `matchStats`/`preview`/`engine` byte-identical — Unit pins already in `matchStats.test.ts` 10/10 + `preview.test.ts`). App wiring (`App.tsx` `newGame`+`handleRestart`+`availablePot` fan-out + `busyRef` deadlock) is verified via structural pins plus existing `app.gameOverWiring.test.ts` staying green (4/4) and `gameOverOverlay.test.ts` staying green (14/14 after 6.2); no new integration file needed. Preview/Hud/Board/Engine purity walls stay identical — tested once at Unit/Component, not again.

**Red Phase Requirements:** `GameOverOverlay.tsx` and `App.tsx` `handleRestart` already exist from 6.1/6.2 (448 pass). Scaffolds are **designated RED for additive comment + structural guard** — T1 requires `// AC6/7: forfeited continue dies…` comment before `busyRef.current=false` inside `handleRestart`, T2 requires `// AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here` comment above `Pressable`; both comments are absent on current `HEAD` (`3218d23`), so 2 of 5 tests fail on `must contain "forfeited continue dies"` / `must contain "AC5: Continue offer"` when `test.skip()` is removed (expected RED before enhancement) while the 3 functional-verification tests are already GREEN (they pin the existing `handleRestart` body order + 9-tile determinism + single-CTA Clean; they stay green after comments land). All are **CI-green while skipped** (`npm test` 448 pass / 5 skipped). This is the correct ATDD signal for a verify/strengthen story: the comment pins fail red until strengthen, the contract pins stay green as regression guards. No placeholder assertions; every test asserts EXPECTED behavior per `T1` comment + `T2` `HIT_TARGET`/`alignSelf`/`width:100%` + AC grouping in `6-3-restart-1-tap.md`.

---

## Red-Phase Test Scaffolds Created

> Framework note: this project uses **node:test + tsx** (not Playwright/Cypress). Scaffolds use `test.skip()` with direct `import(SPEC)` inside helper (`SPEC='../../../src/ui/GameOverOverlay.tsx'`) plus `readFileSync` + `stripCommentsAndStrings` structural pins so the suite stays green while skipped (448 pass / 5 skipped); removing `test.skip()` makes 2 pins fail on missing `// AC6/7` / `// AC5` comment (expected RED before T1/T2), the other 3 verify and stay GREEN (contract already ships), then all 5 pass after T1/T2 ships (GREEN). Same pattern as 6.2 `test.skip()` + variable-specifier `import(SPEC)` inside skipped callback — adapted for a verify/strengthen story where the functional contract already exists and comments are the additive change. No `playwright/utils` or `pact` needed.

### Component Tests — `triade/__tests__/ui/components/app.restart.test.ts` (NEW, 5 tests, ~390 lines)

**File:** `triade/__tests__/ui/components/app.restart.test.ts` (390 lines)

- ✅ **Test:** `[P0] AC1/AC3 CTA one tap calls onRestart once with no confirmation`
  - **Status:** GREEN verification (when activated, already ships — CTA `onPress` direct, `accessibilityRole button` `Jogar de novo`, `pointerEvents:auto` hittable through fade, no `Alert`/`confirm(`/`Dialog` in stripped source). When skipped, suite stays 448 pass / 5 skipped. After T2 `// AC5` comment this test stays GREEN — it is the no-dialog regression gate.
  - **Verifies:** AC1/AC3 FR-26/FR-27 FR-12 UX-DR-25 — thin-view CTA is single primary `Pressable` with `accessibilityLabel "Jogar de novo"` + `onPress={onRestart}` direct (no confirmation, no `disabled`), `act(() => cta.props.onPress())` calls spy 1× then 2× on second press (no single-use lock), stripped `App.tsx`+`GameOverOverlay.tsx` have no `Alert`/`confirm(` (checked over `stripCommentsAndStrings`), `pointerEvents:auto` never `none` during 280ms fade (CTA stays hittable `UX-DR-25` no forced wait).

- ✅ **Test:** `[P0] AC1/AC2 handleRestart resets store immediately — 9 tiles, score 0 best persisted, merges 0, null moveResult, busyRef false, same lane, no navigation`
  - **Status:** RED — fails with `handleRestart must contain "forfeited continue dies"` when `test.skip()` is removed (expected before T1). All other assertions inside this test are GREEN verification (handle body order `newGame→setGame→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats(s.board))→busyRef=false` in order, dep `[persistedBest]` only, `!navigation`/`!setTimeout`/`!setInterval`, `availablePot ===1` shared after `if(!ready)`, `reducedMotion={false}` literal, monetization wall `!react-native-purchases/...`, runtime `newGame(mulberry32(20260808))` 9 tiles + `pendingSpawn` pre-resolved + `initialScore`/`initialStats` 0/ceiling, `busyRef` double release + no `sessionStartBestRef.current = persistedBest` leak). Once T1 adds `// AC6/7: forfeited continue dies…` before `busyRef`, the whole test turns GREEN.
  - **Verifies:** AC1/AC2 FR-26/NFR-3/UJ-5 — instant same-lane store reset (screen-state machine `game-architecture.md:339`, no nav/loader). `handleRestart` is the single discard point for per-match continue budget (ADR-02). Same-lane implicit today → restart `newGame(rngRef.current)` on same `mulberry32(20260808)` stream 9-tile setup with `pendingSpawn` pre-resolved after 20-draw budget (`src/engine/core/game.ts` loop). Score via `initialScore(persistedBest)` → `{score:0,best:persistedBest}` (P3 lane-scoped); stats via `initialStats(s.board)` → `{merges:0,longestStreak:0,currentStreak:0,maxTile:ceilingDetector(s.board)}` (`matchStats.ts:17-23`). `setMoveResult(null)` clears trace so overlay unmounts. `busyRef.current=false` is deadlock defense (`deferred-work.md Df5`: `GameBoard` settle timer `setTimeout(onMoveSettled,84)` cleared on unmount without `onMoveSettled` — without reset next match freezes on first swipe). `availablePot` fan-out once-per-render shared by both lane previews.

- ✅ **Test:** `[P0] AC4 9-tile same lane`
  - **Status:** GREEN verification — `newGame` deterministic 9 tiles on same stream, `ceilingDetector` equals `initialStats.maxTile`, `availablePot` fan-out preserved, no `LaneProfile`/`SecureStore` lane-switch. This pin is already GREEN and stays GREEN after T1/T2; it is the lane-invariance regression guard (after Epic 3 `LaneProfile.id` must not flip on restart — no lane-switch logic here).
  - **Verifies:** AC4 FR-26 — new match 9-tile setup and same lane rules as finished match. `newGame` on `mulberry32(20260808)` stream produces 9 non-null cells both calls, `pendingSpawn` pre-resolved after 20 draws, `initialStats` ceiling invariant, `App.tsx` fans `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once to both `previewFor(game.pendingSpawn, availablePot)` (`FR-43` `only 3 available` semantics). No `SecureStore`/`MMKV` lane memory (S3.1 concern) and no `LaneProfile` switch.

- ✅ **Test:** `[P0] AC6/AC7 forfeited continue dies — never carried, never re-offered`
  - **Status:** RED — fails with `handleRestart must contain "forfeited continue dies"` / `must not contain continueRemaining` carry when `test.skip()` is removed (expected before T1). Rendered overlay already has no second CTA `Continuar` (GREEN) but the structural comment + carry guard is RED until T1.
  - **Verifies:** AC6/AC7 ADR-02 per-match budgets live in memory and die with match (`game-architecture.md:338,382,509-510` + `epics.md:100,551`). `GameOverOverlay.tsx` no second CTA (`findAll(...'Continuar').length===0`) + exactly one `Jogar de novo` `Pressable`; handleRestart contains `forfeited continue dies` comment + stripped handle body has no surviving `continueBudget`/`continueRemaining` (any `continueRemaining`/`continueBudget` would be reset inside if it existed; none may survive into `s`). Forward-compat pin prevents carry into next match / re-offer on re-render with `gameOver=true` (props have no `continueRemaining` until Epic 3/4, Clean never re-offers).

- ✅ **Test:** `[P1] AC5 Clean only primary CTA`
  - **Status:** RED — fails with `GameOverOverlay.tsx must contain "AC5: Continue offer is Epic 3/4"` when `test.skip()` is removed (expected before T2). Other assertions are GREEN verification (stripped source no `Continuar`/`onContinue`/`rewardedAd`/`react-native-purchases`/`IAP` wiring, rendered exactly one `Pressable` `Jogar de novo` `HIT_TARGET`+`alignSelf:center` `#E8A33D/#1C1206`, inner `Animated.View` wrapper `width:100% maxWidth:420 alignSelf:center`, `reducedMotion={false}` literal + `insets` required).
  - **Verifies:** AC5 Clean only primary CTA — Clean renders ONLY primary CTA — no second CTA/Continue. `GameOverOverlay.tsx` stripped source contains no `/Continuar|continue|reward/i` UI nor `onContinue`; rendered overlay has exactly one `accessibilityRole="button"` label `"Jogar de novo"` (`all` buttons length 1). CTA style pins `width: HIT_TARGET`/`height: HIT_TARGET` directly (no arithmetic) + `alignSelf:center` in `styles.cta` + `backgroundColor #E8A33D` dark-ink `#1C1206` (~8.6:1), `// TODO 5.4: t('gameOver.restart')` waiver. Wrapper `width:100%` required so `content width:100%` resolves against `100%` not `auto` (6.2 patch). `App.tsx` keeps `availablePot` count `===1` and `doMoveRef` stable-gesture + `busyRef` + `onMoveSettled` gate (`EARLY_INPUT_MS 84` in `GameBoard.tsx:42`) — restart's `busyRef=false` is deadlock defense.

---

## Data Factories Created

None — pure presentational overlay with literal `stats: {score,best,maxTile,merges,longestStreak}` on every `renderOverlay` + `boardWith`/`mulberry32`/`newGame` deterministic 9-tile fixtures inline where needed (no faker per zero-dep project rule). Each test builds its own props via `baseProps(overrides)` local helper (mirrors `gameOverOverlay.test.ts:62-80`). No DB/state lifecycle. Runtime 9-tile pins use `mulberry32(20260808)` deterministic stream and `ceilingDetector` / `potForTier` / `tierForCeiling` pure functions — no faker.

---

## Fixtures Created

None (reuses existing `test-utils/helpers.ts` + `test-utils/rn-stub.ts` headless `View/Text/Pressable/StyleSheet` + `Animated.Value`/`timing`/`parallel` + `Easing`). `app.restart.test.ts` reuses `allText`/`hasStyle`/`collectStyles` copy-don't-import pattern of `gameOverOverlay.test.ts` + `hud.test.ts`/`previewCard.test.ts` (copy, don't import across test files per story T4). Structural pins use `readFileSync` + `stripCommentsAndStrings` + `extractNamedImports` (string-and-comment aware, blanking string/template contents) — no mount of full `App` needed (same posture as `app.gameOverWiring.test.ts`). Auto-cleanup fixtures would be dead weight. Each `renderOverlay` builds a fresh `TestRenderer` — no module-level shared renderer (isolation per `test-quality.md`). `App.tsx` `handleRestart` is never mounted in tests — its body is pinned via `stripCommentsAndStrings` ordering + runtime `newGame`/`initialScore`/`initialStats` invariants (host-testable pure functions).

---

## Mock Requirements

None — no external services. `loadBest`/`saveBest` (MMKV/SecureStore) and `preloadAssets` are **not** under test in 6.3; persistence wiring (`persistedBest` → `initialScore` → `match.best` → `GameOverOverlay stats`) is verified via existing `app.gameOverWiring.test.ts` staying green (4/4). `expo-haptics`/`expo-audio`/`react-native-purchases`/`react-native-google-mobile-ads`/`expo-secure-store` beyond `settingsStore` are intentionally absent from `App.tsx` + `GameOverOverlay.tsx` until Epic 4 — verified by monetization-wall stripped-source gate (`ui.norolls.test.ts:27` style). `Animated`/`Easing` come from `react-native` (already in `rn-stub` after 6.2, no new dep). No `SecureStore` lane memory, no `MMKV` lane memory, no `LaneProfile` until Epic 3.

---

## Required data-testid Attributes

RN overlay uses `accessibilityLabel`/`accessibilityRole` + style markers (not `data-testid`) per prior component pattern (`PreviewCard`/`Hud`/`GameOverOverlay`). Required for test stability (already satisfied by 6.1/6.2, pinned for restart — no new attr):

### GameOverOverlay (preserved + 1-tap restart, Clean only)

- `accessibilityRole="alert"` + `accessibilityLabel` containing `"Game over. Score {score}, best {best}, max tile {maxTile}, merges {merges}, longest streak {longestStreak}"` (+ `"Novo recorde"` when `isNewRecord`) — inner `View` child of `Animated.View content` (6.1 a11y fix, alert sibling to CTA)
- `accessibilityRole="button"` + `accessibilityLabel="Jogar de novo"` — `Pressable` CTA (`width: HIT_TARGET`/`height: HIT_TARGET` directly, thinview gate `ui.thinview.test.ts:39-40`)
- `accessibilityViewIsModal` + `pointerEvents="auto"` + `backgroundColor: 'rgba(12,14,17,0.7)'` + `position:'absolute', top:0,left:0,right:0,bottom:0, zIndex:2, elevation:2` — outer `Animated.View` scrim (now animated `opacity 0→1` post-mount in 6.2 but final `rgba` pinned via `hasStyle`)
- `width: '100%' + maxWidth:420 + alignSelf:'center'` + `opacity: Animated.Value` (inner content `delay:80`) + `transform: [{translateY: Animated.Value}]` — inner `Animated.View` wrapper (6.2 wrapper fix)
- `paddingTop: (insets?.top ?? 0)+SAFE_MARGIN` (16) on all edges via outer `Animated.View` style array (preserved from 6.1 via `insets` required prop + `?.` fallback for bare `as any` tests)
- `onPress={onRestart}` direct — no intermediary, no `Alert`/`confirm(`/`Dialog`, one tap immediately starts new match (no dialog)
- **Clean-only (AC5): exactly one `Pressable` CTA — no second `Continuar`/`onContinue`/`continueRemaining`/`rewardedAd`/`IAP` node** (forward-compat pin)

### App.tsx (orchestrator, structural handleRestart contract — no new data-testid)

- `handleRestart` body must be `const s = newGame(rngRef.current); setGame(s); setMoveResult(null); setMatch(initialScore(persistedBest)); setMatchStats(initialStats(s.board)); busyRef.current=false` with dep `[persistedBest]` only
- `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` exactly once per render after `if(!ready)` guard (`App.tsx:151`) shared by both lane previews `clean`/`accelerated` via `previewFor(game.pendingSpawn, availablePot)` (`App.tsx:163-166`)
- `reducedMotion={false}` literal on `<GameOverOverlay … reducedMotion={false} insets={insets} />` at `zIndex:2` over `Hud zIndex:1` with scrim `pointerEvents:'auto'` blocking `Gesture.Pan` (`App.tsx:154`) — `PauseButton` unreachable under scrim; `gameOver=isGameOver(game.board)` on committed board + `{gameOver ? <GameOverOverlay .../> : null}` sibling to unconditional `GameBoard`/`Hud`

**Implementation Example (Clean 1-tap restart — handleRestart body, additive comments only):**

```tsx
// triade/App.tsx (T1 — verify/strengthen only, no signature/dep change)
const handleRestart = useCallback(() => {
  // AC6/7: forfeited continue dies with game-over — any per-match continue budget is discarded here (ADR-02)
  const s = newGame(rngRef.current);
  setGame(s);
  setMoveResult(null);
  setMatch(initialScore(persistedBest));
  setMatchStats(initialStats(s.board));
  busyRef.current = false;
}, [persistedBest]);

// triade/src/ui/GameOverOverlay.tsx (T2 — add AC5 comment above Pressable, keep single CTA)
import { Animated, Easing, Pressable, View, Text } from 'react-native';
import { HIT_TARGET } from './PauseButton';
import { SAFE_MARGIN } from './layout';
// inner wrapper preserved from 6.2:
<Animated.View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
  <View style={styles.content}>
    <View accessible accessibilityRole="alert" accessibilityLabel={`Game over. Score ${stats.score} …${isNewRecord?' Novo recorde':''}`}>
      {/* 5 stat rows + TODO 5.4: t('gameOver.*') waivers */}
    </View>
    // AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here
    <Pressable accessibilityRole="button" accessibilityLabel="Jogar de novo" onPress={onRestart} style={styles.cta}>
      <Text style={styles.ctaLabel}>Jogar de novo</Text>{/* TODO 5.4: t('gameOver.restart') */}
    </Pressable>
  </View>
</Animated.View>
```

**Implementation Example (test-side `renderOverlay` helper — copy pattern):**

```tsx
async function renderOverlay(props: Partial<OverlayProps> = {}) {
  const { GameOverOverlay } = await import(SPEC); // SPEC='../../../src/ui/GameOverOverlay.tsx'
  const merged = baseProps(props); // stats:{score,best,maxTile,merges,longestStreak}+isNewRecord+onRestart+reducedMotion+insets
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(React.createElement(GameOverOverlay, merged as any)); });
  return renderer!;
}
```

---

## Implementation Checklist

### Test: `[P0] AC1/AC3 CTA one tap calls onRestart once with no confirmation` — `app.restart.test.ts` #1

**File:** `triade/__tests__/ui/components/app.restart.test.ts` (rendered + structural)

**Tasks to make this test pass:**

- [ ] Verify `triade/src/ui/GameOverOverlay.tsx` CTA is single `Pressable accessibilityRole="button" accessibilityLabel="Jogar de novo"` with `onPress={onRestart}` direct — no wrapper handler, no `Alert`/`confirm(`/`Dialog`/`disabled` state, `width: HIT_TARGET`/`height: HIT_TARGET` in `styles.cta` + `alignSelf:'center'` (T2). CTA stays `pointerEvents:'auto'` and hittable through entire 280ms fade (tapping during fade calls `onRestart` immediately — `UX-DR-25` no forced wait, same as 6.2 `pointerEvents` pin).
- [ ] Verify `triade/App.tsx` `handleRestart` surface has zero confirmation capability — stripped `App.tsx`+`GameOverOverlay.tsx` have no `Alert`/`confirm(`/`Dialog` import/guard (`!stripped.includes('Alert') && !/confirm\(/.test(stripped)`). This test is functional verification (already GREEN on `3218d23`) — no code change needed beyond T1/T2 comments; it is the no-dialog regression gate.
- [ ] Keep outer `Animated.View` `pointerEvents="auto"` + `accessibilityViewIsModal`, inner `View accessible alert` groups only stats (`a11yLabel` "Game over. Score …" + "Novo recorde" when `isNewRecord`), CTA `Pressable` sibling outside alert (6.1 a11y fix) — not re-introduced as child of alert.
- [ ] Run test: `npm test -- __tests__/ui/components/app.restart.test.ts --test-name-pattern "AC1/AC3 CTA one tap"` (inside `triade/`) — remove `test.skip()` for that case first, confirm GREEN (verification) vs expected GREEN after T2 comment (still GREEN)
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hour

---

### Test: `[P0] AC1/AC2 handleRestart resets store immediately — 9 tiles, score 0 best persisted, merges 0, null moveResult, busyRef false, same lane, no navigation` — `app.restart.test.ts` #2

**File:** `triade/__tests__/ui/components/app.restart.test.ts` (structural + runtime, P0 critical path)

**Tasks to make this test pass (T1):**

- [ ] Verify/strengthen `triade/App.tsx` `handleRestart` body (`App.tsx:103-110`) in that order — `const s = newGame(rngRef.current)` → `setGame(s)` → `setMoveResult(null)` → `setMatch(initialScore(persistedBest))` → `setMatchStats(initialStats(s.board))` → `busyRef.current = false` (story T1 table). No signature/dep change, no `Alert`/`navigation`/`navigate(`/`setTimeout`/`setInterval` (NFR-3 instant, 1-tap, no dialog, no route screen-state machine `game-architecture.md:339`).
- [ ] Add `// AC6/7: forfeited continue dies with game-over — any per-match continue budget is discarded here (ADR-02)` comment before `busyRef.current = false` — **this is the RED pin** (file lacks it on `3218d23`, test fails with `must contain "forfeited continue dies"` until added). Keep dependency `[persistedBest]` only — **never** `match.best` or `sessionStartBestRef.current`; do NOT add `sessionStartBestRef.current = persistedBest` inside `handleRestart` — the ref stays session-start value so `isNewRecord` highlight remains correct across restarts (`App.tsx:72-82` `hydrationOkRef` + `isNewRecord(sessionStartBestRef.current, match.best)`).
- [ ] Keep `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` **exactly once** per render after `if(!ready)` guard (`App.tsx:151`) shared by both lane previews — verify via source count `===1`. Keep `doMoveRef` stable-gesture pattern + `busyRef` + `onMoveSettled` gate (`EARLY_INPUT_MS 84` in `GameBoard.tsx:42`) — restart's `busyRef.current=false` is deadlock defense (`deferred-work.md Df5`: `GameBoard` settle timer `setTimeout(onMoveSettled,84)` cleared on unmount without `onMoveSettled`; without reset next match freezes on first swipe).
- [ ] New match invariants verified via runtime pin: `newGame(mulberry32(20260808))` on same stream — 9 tiles, `pendingSpawn` pre-resolved after 20-draw budget (`src/engine/core/game.ts` 9-tile loop). Score via `initialScore(persistedBest)` → `{score:0,best:persistedBest}` (P3 lane-scoped); stats via `initialStats(s.board)` → `{merges:0,longestStreak:0,currentStreak:0,maxTile:ceilingDetector(s.board)}` (`matchStats.ts:17-23`). `setMoveResult(null)` clears trace so overlay unmounts.
- [ ] Same-lane (FR-26): single-lane today → restart implicit; after Epic 3 must preserve `LaneProfile.id` — no lane-switch logic here, no `SecureStore`/`MMKV` lane memory (S3.1 concern). Keep `reducedMotion={false}` literal stays (`App.tsx:194`) until 9-4 — no `src/state`/`MMKV`/`SecureStore` wiring.
- [ ] Monetization wall (ADR-02): verify `App.tsx` has **no** import of `react-native-purchases`/`react-native-google-mobile-ads`/`expo-haptics`/`expo-audio`/`expo-secure-store` beyond existing `settingsStore` — `ui.norolls` scans `App+ui+render+services` over `stripCommentsAndStrings`; any such import fails until Epic 4.
- [ ] Run test: `npm test -- __tests__/ui/components/app.restart.test.ts --test-name-pattern "handleRestart resets store"` — remove `test.skip()` for that case first, confirm RED (missing `forfeited continue dies` comment), add comment, confirm GREEN
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2 hours

---

### Test: `[P0] AC4 9-tile same lane` — `app.restart.test.ts` #3

**File:** `triade/__tests__/ui/components/app.restart.test.ts` (runtime + structural)

**Tasks to make this test pass:**

- [ ] Keep `triade/App.tsx` restart implicit same-lane (single-lane today). `handleRestart` via `newGame(rngRef.current)` on same `mulberry32(20260808)` stream — verify deterministic 9 tiles (first `newGame` 9, second `newGame` on same rng 9) and `pendingSpawn` pre-resolved after 20-draw budget (both have `value` + `displayRoll`). Score via `initialScore`, stats via `initialStats` ceiling `ceilingDetector(s.board)` equals `maxTile` (`matchStats.ts:22`).
- [ ] Verify availablePot fan-out preserved — `App.tsx:151` `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once + `previews: { clean: previewFor(game.pendingSpawn, availablePot), accelerated: previewFor(game.pendingSpawn, availablePot) }` shared (FR-43 `only 3 available` semantics + FR-45 both lanes). Test asserts `availablePot` derived via `potForTier(tierForCeiling(ceilingDetector(board)))` and both previews use same value.
- [ ] No `LaneProfile`/`SecureStore`/`MMKV` lane memory in `handleRestart` — S3.1 concern, not here. Comment expectation for after Epic 3: lane param must not flip on restart.
- [ ] Keep `src/engine`/`src/game/preview`/`src/game/matchStats` byte-identical (this story only adds comments; `game.ts` 9-tile loop untouched, `preview.ts` `FULL_POT_LADDER`/`previewFor` frozen, `matchStats.ts` `initialStats`/`applyMoveStats` unchanged).
- [ ] Run test: `npm test -- __tests__/ui/components/app.restart.test.ts --test-name-pattern "9-tile same lane"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1 hour

---

### Test: `[P0] AC6/AC7 forfeited continue dies — never carried, never re-offered` — `app.restart.test.ts` #4

**File:** `triade/__tests__/ui/components/app.restart.test.ts` (rendered + structural, forward-compat P0 structural)

**Tasks to make this test pass (T1 forfeited-continue pin):**

- [ ] Verify `triade/src/ui/GameOverOverlay.tsx` renders ONLY one CTA today — `renderOverlay` finds zero `accessibilityLabel="Continuar"` / `children==="Continuar"` and zero `onContinue` / `continueRemaining` / `rewardedAd` / `IAP` / `react-native-purchases` over `stripCommentsAndStrings` (story T2 table must-NOT columns). Rendered `GameOverOverlay` must have exactly one `Pressable` `Jogar de novo` as in Clean (AC5) and zero `Continuar`.
- [ ] Verify `triade/App.tsx` `handleRestart` contains `// AC6/7: forfeited continue dies…` comment as single discard point — `handleRestart` body slice includes `forfeited continue dies` (added in T1). Stripped handle body (via `stripCommentsAndStrings`) must have no surviving `continueBudget`/`continueRemaining` variable carry (`!/\bcontinueBudget\b/.test(handleStripped)` and `!/\bcontinueRemaining\b/.test(handleStripped)`) — even though continue budget is vacuous in Clean single-lane today, any per-match budget that existed must be discarded here (ADR-02 memory dies with match, `game-architecture.md:338,382,509-510` + `epics.md:100,551`).
- [ ] Re-render overlay after restart still shows single CTA — props have no `continueRemaining` until Epic 3/4, so re-mounted `gameOver=true` still single CTA (forfeited is never re-offered). This guards `S3.3`/`S4.2` scope creep — Accelerated Continue offer belongs to Epic 4, not here.
- [ ] Keep no `SecureStore`/`MMKV` continue carryover, no second path carrying `continueRemaining` into `s` (`s = newGame(rngRef.current)` is clean). `App.tsx` `isGameOver(game.board)` conditional stays vacuous-carry safe.
- [ ] Run test: `npm test -- __tests__/ui/components/app.restart.test.ts --test-name-pattern "forfeited continue dies"` — remove `test.skip()` for that case, confirm RED (missing `forfeited continue dies` comment), add T1 comment, confirm GREEN
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1 hour

---

### Test: `[P1] AC5 Clean only primary CTA` — `app.restart.test.ts` #5

**File:** `triade/__tests__/ui/components/app.restart.test.ts` (P1 clean-only pin, forward-compat vacuous guard)

**Tasks to make this test pass (T2):**

- [ ] Verify/strengthen `triade/src/ui/GameOverOverlay.tsx` Clean-only CTA — add `// AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here` comment above `Pressable` (story T2). This is the RED pin (file lacks it on `3218d23`, test fails with `must contain "AC5: Continue offer is Epic 3/4"` until added). Keep single CTA with `width: HIT_TARGET`/`height: HIT_TARGET` in source (regex `width:\s*HIT_TARGET(?=[,}])`) + `alignSelf:'center'` in `styles.cta` + `backgroundColor '#E8A33D'` dark-ink label `#1C1206` (~8.6:1), `// TODO 5.4: t('gameOver.restart')` next to literal (waiver).
- [ ] Keep inner `Animated.View` wrapper `style={{ width:'100%', maxWidth:420, alignSelf:'center', opacity: contentOpacity, transform:[{translateY: contentY}] }}` — `width:'100%'` required so `content width:'100%'` resolves against `100%` not `auto` (6.2 patch). Outer stays `position:'absolute' top/left/right/bottom 0, zIndex:2, elevation:2, backgroundColor:'rgba(12,14,17,0.7)', justifyContent:'center', alignItems:'center'` with `padding insets+SAFE_MARGIN 16` on all edges. Keep `HIT_TARGET` (48) via `HIT_TARGET` from `./PauseButton` (allows 44 or 48 rendered check via `hasStyle` 44||48).
- [ ] Stripped source must have no `Continuar`/`onContinue`/`continueRemaining`/`continueBudget`/`rewardedAd`/`react-native-purchases`/`IAP`/`onContinue` beyond the `// AC5` comment — Clean has no second CTA (prevents Accelerated scope creep before Epic 3/4). Allowed imports only `react` + `react-native` (`Animated`/`Easing` same specifier, `isAllowedViewImport` `ui.thinview.test.ts:33-40` stays green) + `./PauseButton` (`HIT_TARGET`) + `../ui/layout` (`SAFE_MARGIN`) — no `../engine/**`, no `layoutFor`/`isLandscape` rule logic.
- [ ] Rendered overlay has exactly one `Pressable` `accessibilityRole button` label `"Jogar de novo"` and total buttons length 1 (no second `Continuar`). Keep `reducedMotion={false}` literal in `App.tsx` pinned until 9-4 and `insets` required + `?.` fallback defensive for bare `as any` tests (`gameOverOverlay.test.ts:252` pattern).
- [ ] Run test: `npm test -- __tests__/ui/components/app.restart.test.ts --test-name-pattern "Clean only primary CTA"` — remove `test.skip()` for that case, confirm RED (missing `AC5` comment), add comment, confirm GREEN
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1 hour

---

### Test: T4 gates & regression guard (AC: 1–7)

**Files:** `triade/` (full suite)

**Tasks:**

- [ ] `npm test` (inside `triade/`) → all green. Baseline on `3218d23` post-6.2: **448 pass / 0 fail / 0 skipped** (before this scaffold: 448 pass, after scaffold while skipped 448 pass / 5 skipped). After GREEN (comments added + scaffolds activated) expect `453 pass / 0 fail` (448 + 5) with `engine.purity` + `ui.norolls`/`ui.thinview`/`hud.previewWiring`/`app.gameOverWiring`/`gameOverOverlay` (both files) + `app.restart` (this file) green. `app.gameOverWiring.test.ts` stays verify only; `gameOverOverlay.test.ts` 14 pins stay green (soft-fade `280`/`80`/`Easing.out(Easing.cubic)`/`useNativeDriver:true`/`stop()`/`stopAnimation`×3, `HIT_TARGET`, scrim `rgba(12,14,17,0.7)`, `zIndex:2`, `accessibilityViewIsModal`, `alert` sibling CTA, no celebration).
- [ ] `npx tsc --noEmit` (default tsconfig — CI gate) → clean. Also `npx tsc --noEmit -p tsconfig.test.json` → clean (only flag **NEW** errors; after 6.2 `rn-stub` + `ignoreDeprecations` both gates clean — `Animated` types from `react-native` stub cause no new errors).
- [ ] `git diff --stat -- triade/src/engine` **must be empty** — ADR-01 wall: `src/engine` pure, never touched (this story is `App.tsx`/`src/ui/` comments+tests only, same posture as 6.2 and Epic 7). Only flag NEW errors; `Animated` types from `react-native` stub cause no issue.
- [ ] `git diff --stat -- triade/src/game/preview.ts` **must be empty** — preview byte-identical (`FULL_POT_LADDER`/`RANGE_1_2`/`previewFor` frozen, loop not touched).
- [ ] `git diff --stat -- triade/src/game/matchStats.ts` **must be empty** — stats via `initialStats` only (`merges`/`longestStreak`/`currentStreak`/`maxTile`, no matchStats change).
- [ ] `git diff --stat -- triade/src/game/matchScore.ts` **must be empty** — score via `initialScore` only.
- [ ] `git diff --stat -- triade/src/render` **must be empty** — `GameBoard.tsx` trace-driven, `EARLY_INPUT_MS 84` + `settleTimerRef` re-arm per `moveResult` unchanged (Df5).
- [ ] `git diff --stat -- triade/src/services` **must be empty** — no monetization/telemetry/storage touched (Continue belongs to Epic 4, `src/services/monetization` byte-identical).
- [ ] `git diff --stat -- triade/src/ui/Hud.tsx` / `PreviewCard.tsx` / `PauseButton.tsx` / `layout.ts` **must be empty** — HUD chrome unchanged beyond `GameOverOverlay.tsx` `// AC5` comment.
- [ ] `npm run`/`npx expo` not needed; `npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` inside `triade/` (no new deps, no build step).
- [ ] Manual smoke (informative — simulator manual domain, like 6.1/6.2): fill board via `boardWith` no-mergeable 4×4 (full no-mergeable), verify CTA "Jogar de novo" hittable during 280ms fade (pointerEvents auto), tap once → 9 tiles instantly, score 0 best persisted (`match.best === persistedBest`), merges 0 (`matchStats.merges===0`), no confirmation/spinner, `busyRef` allows immediate swipe (no deadlock after restart), scrim `rgba(12,14,17,0.7)` under CTA, `reducedMotion={false}` still literal, same-lane fan-out preserved, forfeited continue vacuous but not re-offered.

**Estimated Effort:** 0.5 hour

---

## Running Tests

```bash
# Inside triade/ — run all 6.3 scaffolds (remove test.skip() for the current task first to see RED → add T1/T2 comment → GREEN)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/app.restart.test.ts
npm test -- __tests__/ui/components/app.restart.test.ts
npm test -- --test-name-pattern "AC1/AC3 CTA one tap"
npm test -- --test-name-pattern "handleRestart resets store"
npm test -- --test-name-pattern "9-tile same lane"
npm test -- --test-name-pattern "forfeited continue dies"
npm test -- --test-name-pattern "Clean only primary CTA"

# Run alongside 6.1/6.2 overlay + wiring (full game-over + restart surface)
npm test -- __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/app.restart.test.ts __tests__/ui/components/app.gameOverWiring.test.ts
npm test -- __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/app.restart.test.ts

# Run all tests (skipped scaffolds stay skipped, suite stays green — 448 pass / 5 skipped red-phase)
npm test

# Run specific story slice (restart + overlay softFade from 6.2 if kept separate)
npm test -- __tests__/ui/components/app.restart.test.ts __tests__/ui/components/gameOverOverlay.test.ts

# Type check (default tsconfig — CI gate)
npx tsc --noEmit

# Type check test config (ignoreDeprecations, rn-stub paths)
npx tsc --noEmit -p tsconfig.test.json  # clean on current HEAD; only flag NEW errors

# Gates — must be empty (byte-identical)
git diff --stat -- triade/src/engine
git diff --stat -- triade/src/game/preview.ts
git diff --stat -- triade/src/game/matchStats.ts
git diff --stat -- triade/src/game/matchScore.ts
git diff --stat -- triade/src/render
git diff --stat -- triade/src/services

# Guard suites (must stay green without modification beyond // AC5 / // AC6/7 comments)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.norolls.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.thinview.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/engine.purity.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/hud.previewWiring.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/app.gameOverWiring.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/gameOverOverlay.test.ts
```

> No headed/debug browser mode applies — this is a `node:test` + `react-test-renderer` + host `rn-stub` suite (same posture as 6.1/6.2 overlay, PreviewCard, Hud). No Playwright/MCP. `handleRestart` structural pins use `stripCommentsAndStrings` + `readFileSync` (no App mount needed); overlay CTA pins use `react-test-renderer` with `allText`/`hasStyle`/`collectStyles` copy pattern.

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 5 tests written as red-phase scaffolds with `test.skip()` + direct `import(SPEC)` inside helper (`SPEC='../../../src/ui/GameOverOverlay.tsx'`) plus `readFileSync` + `stripCommentsAndStrings` structural pins so the suite stays CI-green while skipped (448 pass / 5 skipped); removing `test.skip()` makes 2 pins fail on missing `// AC6/7: forfeited continue dies` / `// AC5: Continue offer is Epic 3/4` comment (expected RED before T1/T2 enhancement) while 3 functional-verification pins stay GREEN (CTA one-tap no dialog, 9-tile same lane, handleReset body already ships on `3218d23`). After T1/T2 additive comments all 5 turn GREEN (asserting expected behavior per ACs 1-7 + `DESIGN.md` tokens + `App.tsx:103-110` contract + `game-architecture.md:339` NFR-3). Same `test.skip` red-phase pattern as 6.1 `matchStats` + `gameOverOverlay` (21 skipped) and 6.2 `softFade` (8 skipped) and 1.6 `swipe`/`engine.purity` precedent.
- ✅ Source-level deterministic gates via `stripCommentsAndStrings` + `extractNamedImports` (no wall-clock, no `setTimeout` wait — `FADE_MS 280` + `delay 80` already pinned by 6.2; this story pins `handleRestart` body order + dep `[persistedBest]` + `!Alert`/`!confirm(`/`!Dialog`/`!navigation`/`!setTimeout` + `availablePot ===1` + `forfeited continue dies` + `AC5 Clean` + CTA `HIT_TARGET`+`alignSelf:center` + wrapper `width:100%` + monetization wall).
- ✅ Rendered + structural gates supplement source gates (CTA `pointerEvents:auto` hittable during fade + `accessibilityRole button` label `Jogar de novo`, `isGameOver(game.board)` + `GameBoard` unconditional sibling still green via existing `app.gameOverWiring` 4/4; board last-move visible under scrim frozen).
- ✅ Thin-view + norolls boundary pinned (only `react` + `react-native` primitives + same-dir `HIT_TARGET`/`SAFE_MARGIN`; `Animated`/`Easing` from `'react-native'` stays inside `isAllowedViewImport` `ui.thinview.test.ts:33-40`; no `../engine/` specifier, no `RULE_LOGIC_SYMBOLS`, no `Math.random`, no `resolveSpawn|weightedValue|spawnTile|weightedPicker|pickIndex`).
- ✅ No factories/fixtures/mocks/data-testids beyond existing `test-utils/helpers.ts` + `rn-stub`; literal `stats` fixtures on every render (determinism, zero-dep) + `mulberry32(20260808)` deterministic 9-tile fixtures inline.
- ✅ Implementation checklist created (T1–T4, estimated 6 hours total) + AC→test→file traceability table (Test Strategy) + running tests + `data-testid`→`accessibilityLabel` mapping. Engine/preview/matchStats/render/services byte-identical gates enumerated.

**Verification:**

- All 5 generated tests are present and marked with `test.skip()` (5 skipped)
- Activation guidance is clear and actionable per test (Implementation Checklist T1–T4, one `test.skip()` removal at a time)
- 2 of the 5 activated tests fail on `GameOverOverlay.tsx`/`App.tsx` missing additive `// AC5` / `// AC6/7` comment due to missing enhancement (`must contain "AC5: Continue offer"` / `must contain "forfeited continue dies"`), not test bugs — verified via `stripCommentsAndStrings` source probe (`App.tsx` `handleRestart` lacks `forfeited continue dies`, `GameOverOverlay.tsx` lacks `AC5: Continue`; see Test Execution Evidence). 3 functional-verification tests already GREEN when activated (CTA one-tap no dialog, 9-tile same lane determinism, forfeited-continue structural absence of second CTA) — expected for verify/strengthen story where contract ships via `3218d23` and comments are the additive strengthen.
- Existing gate suites (`ui.norolls` 1/1, `ui.thinview` 2/2, `engine.purity` 5/5, `hud.previewWiring` 4/4, `app.gameOverWiring` 4/4, `gameOverOverlay` 14/14) stay green while skipped (see Test Execution Evidence); `matchScore`/`matchStats`/`preview` pure pins also green

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from Implementation Checklist (start with `[P0] AC1/AC2 handleRestart resets store immediately` — highest risk store-reset + forfeited-continue pin)
2. **Remove `test.skip()`** for that test and confirm it fails first (`must contain "forfeited continue dies"` — expected RED before T1)
3. **Read the test** to understand expected behavior (see `T1` handle body table + `DESIGN.md:193,251-253` scrim tokens + `EXPERIENCE.md:98` same-lane + `game-architecture.md:339` NFR-3)
4. **Implement minimal code** to make that specific test pass — add `// AC6/7: forfeited continue dies with game-over — any per-match continue budget is discarded here (ADR-02)` inside `handleRestart` before `busyRef.current=false` (T1, comments only, no dep/body/order change beyond comment). Then `// AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here` above `Pressable` in `GameOverOverlay.tsx` (T2, CTA + wrapper pins already green).
5. **Run the test** to verify it now passes (green) — `npm test -- __tests__/ui/components/app.restart.test.ts --test-name-pattern "handleRestart resets store"`
6. **Check off the task** in Implementation Checklist; keep `availablePot ===1` + `doMoveRef`/`busyRef`/`onMoveSettled` + `reducedMotion={false}` literal + monetization wall green
7. **Move to next scaffold** (forfeited-continue dies → Clean only primary CTA `// AC5` → 9-tile same lane → CTA one-tap no dialog) and repeat (one `test.skip()` removal at a time, red → green for each)
8. **Keep `ui.thinview`/`ui.norolls`/`engine.purity` green** — if `HIT_TARGET`/`SAFE_MARGIN` trips `isAllowedViewImport`, confirm it is from `'react-native'`/`./PauseButton`/`../ui/layout` (allowed same-dir); no per-file exemption needed. `Animated`/`Easing` from `'react-native'` already allowed.

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation — additive comments only + structural pins already green (don't over-engineer — stick to `App.tsx` orchestrator + `src/ui/` `react-native` `Animated`/`Easing` same specifier + same-dir `HIT_TARGET`/`SAFE_MARGIN`; no engine/preview/matchStats/render/service edits — byte-identical walls)
- Run tests frequently (immediate feedback; `npm test` 448→453 incremental)
- Use Implementation Checklist as roadmap; keep `handleRestart` body order literals exact (not reordered — pin `newGame→setGame→setMoveResult(null)→setMatch→setMatchStats→busyRef=false`)
- Preserve `reducedMotion` prop byte-identical API; `App.tsx` literal `false` until 9-4 — `true` path exercised via component tests directly (`renderOverlay({reducedMotion:true})`)

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete) — `npm test` → 453 pass / 0 fail, `npx tsc --noEmit` clean on both configs, `src/engine`/`src/game/preview`/`src/game/matchStats`/`src/game/matchScore`/`src/render`/`src/services` diffs empty (byte-identical walls), `hud.previewWiring` + `ui.norolls`/`ui.thinview`/`engine.purity` + `gameOverOverlay` (both files) + `app.restart` + `app.gameOverWiring` green
2. **Review code for quality** (readability, maintainability, token fidelity — `rgba(12,14,17,0.7)` final, `maxWidth 420`, `#8a8578`/`#1a1d23`/`#E8A33D` + `HIT_TARGET` 48, `alignSelf:center` CTA, wrapper `width:100%`)
3. **Extract duplications** (DRY — `handleRestart` already single site; `allText`/`hasStyle`/`collectStyles` copy pattern is deliberate copy-don't-import per story T4 — don't refactor to shared import)
4. **Optimize performance** (if needed — `newGame` + `initialStats` is synchronous host-pure, no JS thread work; `busyRef=false` deadlock defense already re-arms gate without waiting for `GameBoard` timer)
5. **Ensure tests still pass** after each refactor (run `npm test -- __tests__/ui/components/app.restart.test.ts` after each change)
6. **Update documentation** — update story `Dev Notes` with this checklist path + generated file path; keep `// TODO 5.4: t('gameOver.*')` waivers next to literals; when all 7 ACs green, mark story `6-3-restart-1-tap: done` in `sprint-status.yaml` (Epic 6 stays `in-progress` until 6.4 lands)

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (or manual handoff via `_bmad-output/implementation-artifacts/6-3-restart-1-tap.md` `Dev Notes` mirrors `Story Integration Metadata` paths). Story `6-3` `T3` already calls out canonical `triade/__tests__/ui/components/app.restart.test.ts` — keep that path byte-identical.
2. **Review this checklist** with team in standup or planning (walk `Test Strategy` table AC→test→file, confirm `handleRestart` body order `newGame→setGame(null)→initialScore→initialStats→busyRef=false` + dep `[persistedBest]` + `!navigation`/`!setTimeout`/`!Alert` + `availablePot ===1` + `// AC6/7` + `// AC5 Clean only CTA` + `HIT_TARGET`+`alignSelf:center`+`width:100%` wrapper + `reducedMotion={false}` literal + monetization wall + forfeited-continue never re-offered).
3. **Begin implementation** using Implementation Checklist as guide (T1 `App.tsx` `handleRestart` `// AC6/7` comment → T2 `GameOverOverlay.tsx` `// AC5` comment + `alignSelf`/`width:100%` verify → T3 `app.restart.test.ts` 5 pins + keep `gameOverOverlay` 14 pins green → T4 gates `npm test`+`tsc`+`git diff --stat` walls).
4. **Activate one scaffold at a time** by removing `test.skip()` for the current task, then confirm it fails before implementing (red → green for each; `npm test` stays green incremental 448→453). For this strengthen story, 2 of 5 will be RED on comment missing (expected) and 3 will be GREEN verification (also expected) — after T1/T2 all 5 GREEN.
5. **Work one activated test at a time** (red → green for each; keep `util: norolls/thinview/purity` green).
6. **Share progress** in daily standup; when all 5 pins green plus `gameOverOverlay.test.ts` 14 pins green, consider consolidating `app.restart.test.ts` into `app.gameOverWiring.test.ts` only if team prefers (or keep separate — both satisfy `T3` as long as `npm test` 453 green; canonical location per story is `app.restart.test.ts` separate to keep `app.gameOverWiring.test.ts` verify only).
7. **When refactoring complete**, manually update story status to `done` in `_bmad-output/implementation-artifacts/sprint-status.yaml` (`6-3-restart-1-tap: done`, `epic-6` stays `in-progress` until 6.4 done).

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (see `tea-index.csv`):

- **data-factories.md** — Factory patterns overridden to literal `stats` fixtures + `baseProps` helper + deterministic `newGame(mulberry32(20260808))` 9-tile fixtures (no `@faker-js/faker`; zero-dep project determinism; per `test-quality.md` no shared mutable state).
- **component-tdd.md** — Component TDD via `react-test-renderer` + `hasStyle`/`allText`/`collectStyles` copy pattern (no Playwright Component Testing — headless `rn-stub` maps RN to string hosts; `Animated.View` + `Pressable` after 6.2 is still a RN primitive via same specifier; `App.tsx` verification is structural over `stripCommentsAndStrings`, not mount).
- **test-quality.md** — Test design principles (Given-When-Then comments, one assertion focus per test, determinism via `mulberry32`, isolation — each `renderOverlay` builds fresh `TestRenderer`, no hard waits, no `Math.random` — `Rng` injectable only).
- **test-healing-patterns.md** — `test.skip()` + direct `import(SPEC)` + `readFileSync` for CI-green red phase (module exists but additive comments missing; same as 6.2 `test.skip` + variable-specifier `import(SPEC)` inside skipped callback — when activated, source assertions fail deterministically on missing `// AC5` / `// AC6/7` comment, not ESM link error).
- **selector-resilience.md** — Resilient selectors via `accessibilityLabel`/`accessibilityRole` (`"Jogar de novo"` single CTA, `"Game over"`+stats alert sibling, `"Continuar"` absence) + style markers (`backgroundColor rgba(12,14,17,0.7)`, `zIndex:2`, `pointerEvents:auto`, `width: HIT_TARGET`, `alignSelf:center`, inner wrapper `width:100% maxWidth:420`) instead of fragile text/class selectors.
- **timing-debugging.md** — Timing contract verified via source scan for `setTimeout`/`setInterval` gating `handleRestart` (must be absent — NFR-3 instant) + CTA `pointerEvents:auto` hittable during 280ms fade + `busyRef=false` deadlock defense `GameBoard` settle timer `setTimeout(onMoveSettled,84)` already pinned by `app.gameOverWiring` 4/4 (this story re-pins the `busyRef` release inside `handleRestart` and via `onMoveSettled` double-release guard).
- **test-levels-framework.md** — Test level selection (Component + structural source-pin for orchestrator callback + thin-view overlay; Unit/E2E/API correctly absent — no pure new function to Unit, no browser journey to E2E, no service contract to API; `matchStats` Unit already 10/10, `preview`/`engine` purity via walls).
- **test-priorities-matrix.md** — P0/P1 prioritization (1-tap no-dialog + handleRestart store reset 9-tiles same-lane + forfeited-continue die/never re-offered = P0; Clean-only single CTA + wrapper layout + `reducedMotion` literal = P1).

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification

**Command:** `npm test` (inside `triade/`) + `npx tsc --noEmit` + `npx tsc --noEmit -p tsconfig.test.json` + `stripCommentsAndStrings` source probe + `git diff --stat` walls

**Results:**

```
# npm test (triade/) — 2026-08-27, Node 26, pre-strengthen (red-phase skipped, // AC5 + // AC6/7 comments not yet added)
ℹ tests 453
ℹ suites 0
ℹ pass 448
ℹ fail 0
ℹ cancelled 0
ℹ skipped 5
ℹ todo 0
ℹ duration_ms 3460.64125

# npx tsc --noEmit (default tsconfig — CI gate)
exit:0 (clean)

# npx tsc --noEmit -p tsconfig.test.json (test config, ignoreDeprecations 6.0, baseUrl:., paths:{react-native: rn-stub})
exit:0 (clean)

# git diff --stat -- triade/src/engine  → empty (engine byte-identical, T4 wall)
# git diff --stat -- triade/src/game/preview.ts → empty
# git diff --stat -- triade/src/game/matchStats.ts → empty
# git diff --stat -- triade/src/game/matchScore.ts → empty
# git diff --stat -- triade/src/render → empty
# git diff --stat -- triade/src/services → empty
# git diff --stat -- triade/src/ui/Hud.tsx → empty (HUD chrome unchanged)

# Gate suites still green while skipped:
#   triade/__tests__/ui/ui.norolls.test.ts — 1 pass (AC4 UI never rolls: App/src-ui/src-render/src-services never roll + never Math.random)
#   triade/__tests__/ui/ui.thinview.test.ts — 2 pass (Hud/PauseButton/GameOverOverlay thin-view + HIT_TARGET ≥44)
#   triade/__tests__/engine/engine.purity.test.ts — 5 pass (engine+game + render pure)
#   triade/__tests__/ui/components/hud.previewWiring.test.ts — 4 pass (availablePot once + Hud markers 76x76/60x44)
#   triade/__tests__/ui/components/app.gameOverWiring.test.ts — 4 pass (isGameOver(game.board) + handleRestart deadlock + applyMoveStats projection)
#   triade/__tests__/ui/components/gameOverOverlay.test.ts — 14 pass (6.1/6.2 pins after 6.2 review: 5 stats + a11y + scrim zIndex + HIT_TARGET + tokens + reducedMotion + no celebration)
#   triade/__tests__/game/matchScore.test.ts — 8 pass
#   triade/__tests__/game/matchStats.test.ts — 10 pass
#   triade/__tests__/game/preview.test.ts — 12 pass (incl. preview-invariant)
#   triade/test-utils/rn-stub.ts — host View/Text/Pressable/StyleSheet + Animated.Value/timing/parallel + Easing.out(Easing.cubic) still green

# Source probe (RED verification — additive comments do not exist yet on HEAD 3218d23):
#   stripCommentsAndStrings(App.tsx) handleRestart slice contains:
#     'newGame(rngRef.current)' → true (ships)
#     'setGame(s)' → true
#     'setMoveResult(null)' → true
#     'setMatch(initialScore(persistedBest))' → true
#     'setMatchStats(initialStats(s.board))' → true
#     'busyRef.current = false' → true
#     'forfeited continue dies' → false  ← RED when activated (T1 additive comment)
#     'navigation'/'navigate('/'setTimeout'/'setInterval' → false (GREEN verification)
#     'availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))' count → 1 (GREEN)
#     'reducedMotion={false}' → true (GREEN)
#   stripCommentsAndStrings(GameOverOverlay.tsx) contains:
#     'AC5: Continue offer is Epic 3/4' → false  ← RED when activated (T2 additive comment)
#     'Continuar' / 'onContinue' / 'continueRemaining' / 'rewardedAd' → false (GREEN verificationClean)
#     'width: HIT_TARGET' + 'height: HIT_TARGET' + 'alignSelf' center + '#E8A33D' → true (GREEN)
#     'width: '100%' + maxWidth: 420 + alignSelf center wrapper → true (GREEN, from 6.2)
#   Removing test.skip() for any scaffold that checks for // AC5 or // AC6/7 makes it fail with
#   `AssertionError [ERR_ASSERTION]: handleRestart must contain "forfeited continue dies" before busyRef`
#   / `GameOverOverlay.tsx must contain "AC5: Continue offer is Epic 3/4"` (expected RED before strengthen),
#   then pass after T1/T2 additive comments (GREEN). Functional-verification scaffolds stay GREEN when activated.
```

**Summary:**

- Total tests: 453 (448 existing + 5 new scaffolds)
- Skipped: 5 (expected before activation — all in `app.restart.test.ts`)
- Activated RED tests: 2 would fail with `must contain "forfeited continue dies" / "AC5: Continue offer"` (verified via source probe) — expected before strengthen (additive comments); 3 would stay GREEN (CTA one-tap no dialog + 9-tile same lane remain verification GREEN)
- Passing: 448 (all existing) / 3 of 5 before strengthen for activated functional pins (expected strengthen story), 5 of 5 after T1/T2 (expected after)
- Status: ✅ Red-phase scaffolds verified (CI-green while skipped, 2 RED when activated for additive comments as designed, 3 GREEN verification for existing contract)

**Expected Failure Messages (when `test.skip()` removed before T1/T2):**

- `app.restart.test.ts` `[P0] AC1/AC2 handleRestart resets store immediately — 9 tiles, score 0 best persisted, merges 0, null moveResult, busyRef false, same lane, no navigation`: `AssertionError [ERR_ASSERTION]: handleRestart must contain "// AC6/7: forfeited continue dies with game-over — any per-match continue budget is discarded here (ADR-02)" comment before busyRef.current=false` (handle body ships but additive comment does not — T1 creates it)
- `app.restart.test.ts` `[P0] AC6/AC7 forfeited continue dies — never carried, never re-offered`: same `must contain "forfeited continue dies"` (forfeited-continue pin before strengthen)
- `app.restart.test.ts` `[P1] AC5 Clean only primary CTA`: `AssertionError [ERR_ASSERTION]: GameOverOverlay.tsx must contain "// AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here" above Pressable` (Clean-only CTA guard — T2 creates it)
- After `T1`/`T2` additive comments (`// AC6/7: forfeited continue dies…` before `busyRef` in `App.tsx:103-110` + `// AC5: Continue…` above `Pressable` in `GameOverOverlay.tsx:94-102` + `alignSelf:center` + `width:'100%'` already green), stripped-source probes satisfy `forfeited continue dies` / `AC5: Continue`, and all 5 turn GREEN (asserting expected behavior per ACs 1-7 + `DESIGN.md:193`/`EXPERIENCE.md:98` + choreography table).

---

## Notes

- **Adaptation — Playwright Utils not applicable:** `tea_use_playwright_utils:true` would normally load `overview.md`, `api-request.md`, `network-recorder.md`, etc., but scanned `__tests__` contain zero `page.goto`/`page.locator` hits and runner is `node:test` headless — so the profile would be API-only but intentionally skipped; the correct level for 6.3 is Component + structural source-pin via `react-test-renderer` + `stripCommentsAndStrings` (same as 6.1/6.2/7.3 precedent). `tea_use_pactjs_utils:false` likewise N/A (no contract).
- **Adaptation — ATDD two-worker split (API + E2E) → Component structural:** No HTTP API and no browser UI in this story, so workers `step-04a` (API) / `step-04b` (E2E) are adapted to 5-component structural + rendered scaffold in a single file. Workers are sequential (no Pact, no network). The 6.3 restart is a store reset (no route, no loading screen NFR-3), so the `playwright` `test.skip` network-first pattern is replaced by the `node:test` `test.skip` + `import(SPEC)` pattern used since S1.1.
- **Verify/strengthen posture:** `App.tsx:103-110` `handleRestart` already ships the 1-tap contract on `3218d23` (verified via source probe: body order correct, dep `[persistedBest]` only, `!navigation`/`!setTimeout`, `availablePot ===1` shared, `reducedMotion={false}` literal, monetization wall — all GREEN). This ATDD does not emit a failing ESM import; it pins the additive strengthening via `// AC6/7` + `// AC5` comments whose absence is RED, while the functional pins stay GREEN. This mirrors 6.2's approach (post-mount animation missing was RED) adapted to a strengthen story where the functional surface already exists and the structural guard (comments) is the delta.
- **Tracer — forfeited-continue forward-compat:** `game-architecture.md:338,382,509-510` + `epics.md:100` per-match budgets (memory dies with match, ADR-02) — Clean single-lane today has no `continueRemaining`/`continueBudget` variable, so AC6/7 is vacuous; the pins (`forfeited continue dies` comment + `!continueBudget` stripped-handle + no second CTA) guard that the budget **must** die with `handleRestart` when Accelerated Continue lands (S4.2). Without this pin a future `S3.3` `MatchOrchestrator` could carry `continueRemaining` into `s = newGame(...)` unnoticed.
- **StrictMode deterministic init:** `App.tsx` `matchStats` state is seeded from the existing `game.board` (already `newGame(rngRef.current)` at `App.tsx:46`); do NOT call `newGame` again inside initializer — that would consume a second 20-draw `mulberry32` stream if StrictMode double-invokes initializers (`deferred-work.md:81-82` waived latent for `game`; reuse already-created `game.board`). `App.tsx:49` `() => initialStats(game.board)` stays host-pure.
- **Scrim + overlay pins carry from 6.1/6.2:** `rgba(12,14,17,0.7)` (`#0C0E11` @70% via `backgroundColor` rgba, not separate `opacity` prop) per `DESIGN.md:193` + mockup `key-gameover.html:43` — single source of opacity so children keep full opacity; `position:'absolute' top/left/right/bottom 0, zIndex:2 elevation:2` above `Hud zIndex:1`, `pointerEvents:'auto'` blocks `Gesture.Pan` (`App.tsx:154`) until `handleRestart` re-arms; `padding insets+SAFE_MARGIN 16` on all edges; `width:'100%' maxWidth:420` inner wrapper; `HIT_TARGET` 48 via `HIT_TARGET` (thinview `ui.thinview.test.ts:33-40` + `HIT_TARGET` ≥44); `reducedMotion={false}` literal until 9-4; no celebration (`/confetti|celebrat|lottie|reward/i` + `particleBurst`/`shakeMs`); a11y `alert` sibling CTA — all remain pinned via `gameOverOverlay.test.ts` 14/14 and `app.gameOverWiring.test.ts` 4/4; this scaffold re-pins CTA `HIT_TARGET`+`alignSelf:center`+`width:100%` and overlay single-CTA clean-only.
- **busyRef deadlock defense (Df5):** `handleRestart` must set `busyRef.current=false` — if `gameOver` mounted while `busyRef=true` (effective move in flight), `GameBoard` settle timer (`GameBoard.tsx:215-219`) would be unmounted without calling `onMoveSettled` (`deferred-work.md:81` Df5); without reset next match freezes on first swipe. `busyRef` double-release (handleRestart + `onMoveSettled`) pinned via `busyRef.current=false >=2`.
- **Thin-view boundary carry:** `GameOverOverlay` receives resolved `stats` + `isNewRecord` + `onRestart` + `reducedMotion` + `insets`, not raw `GameState`/`Board` — preserves `ui.thinview.test.ts` pattern (Hud precedent). Imports allowed only `react-native` primitives + `HIT_TARGET` + `SAFE_MARGIN` + same-dir types; `Animated`/`Easing` from `'react-native'` keeps `ui.thinview` green (same as 6.2).
- **Scope guard (CC 2026-08-23):** Single-lane board today. This story lands Clean-lane 1-tap restart only (stats + "Jogar de novo" only + soft fade + immediate store reset). Accelerated-lane discreet Continue offer + rewarded-ad/IAP + entitlements belong to `S3.3`/`S4.2` / Epic 4 — do NOT add `src/services/monetization` (`react-native-purchases`/`react-native-google-mobile-ads`), `SecureStore`, or per-match budgets here (ADR-02 memory-only). Overlay unchanged from 6.2 except `// AC5` comment.
- **Baseline drift:** `50285a3` 325 pass → `70e4fb0` 396 → `7-4` 414 → `6.1` 417 (440 pass after 6.2 including soft-fade scaffolds skipped) → `3218d23` 448 pass (after 6.2 merge + 7-1/7-2/7-4 sync) → `6.3` scaffold 453 total (448 pass / 5 skipped) pre-strengthen, 453 pass after GREEN with comments. `npx tsc --noEmit` + `npx tsc --noEmit -p tsconfig.test.json` abort remain **clean** (no NEW errors beyond waived `ignoreDeprecations`/`baseUrl` pre-existing from 7-1 2026-08-24, `deferred-work.md:122-124`).

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @eduardo in Slack/Discord
- Refer to `_bmad/tea/config.yaml` for workflow configuration
- Consult `.agents/skills/bmad-testarch-atdd/resources/knowledge` for testing best practices

---

**Generated by BMad TEA Agent** - 2026-08-27
