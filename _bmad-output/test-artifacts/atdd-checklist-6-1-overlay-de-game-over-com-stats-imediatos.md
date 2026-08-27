---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-26'
workflowType: 'testarch-atdd'
storyId: '6.1'
storyKey: '6-1-overlay-de-game-over-com-stats-imediatos'
storyFile: '_bmad-output/implementation-artifacts/6-1-overlay-de-game-over-com-stats-imediatos.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-6-1-overlay-de-game-over-com-stats-imediatos.md'
generatedTestFiles:
  - 'triade/__tests__/game/matchStats.test.ts'
  - 'triade/__tests__/ui/components/gameOverOverlay.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/6-1-overlay-de-game-over-com-stats-imediatos.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md'
  - 'triade/App.tsx'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/src/engine/core/line.ts'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/src/game/matchScore.ts'
  - 'triade/src/game/preview.ts'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/ui/PauseButton.tsx'
  - 'triade/src/ui/layout.ts'
  - 'triade/__tests__/game/matchScore.test.ts'
  - 'triade/__tests__/ui/components/previewCard.test.ts'
  - 'triade/__tests__/ui/components/hud.test.ts'
  - 'triade/__tests__/ui/components/hud.previewWiring.test.ts'
  - 'triade/__tests__/ui/ui.norolls.test.ts'
  - 'triade/__tests__/ui/ui.thinview.test.ts'
  - 'triade/__tests__/engine/engine.purity.test.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/test-utils/rn-stub.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist - Epic 6, Story 6.1: Overlay de game over com stats imediatos

**Date:** 2026-08-26
**Author:** Eduardo (TEA / Murat)
**Primary Test Level:** Unit + Component (host-testable pure projection + RN presentational via react-test-renderer) — `matchStats.ts` is a pure app-domain module (`triade/src/game/`) and `GameOverOverlay.tsx` is a thin presentational overlay (`triade/src/ui/`). No E2E/API required (host-testable surface, zero-dep web PWA/RN rule preserves node:test runner).

---

## Story Summary

As a player, I want my run's full stats the moment it ends, so that I can understand what happened and what to chase next. The game-over overlay fires synchronously when `isGameOver(board)===true` (grid full + no adjacent mergeable pair), showing `score`, `best`, `maxTile`, `merges`, `longestStreak` immediately with no timer, last move visible behind a `rgba(12,14,17,0.7)` scrim at `zIndex:2` over `Hud`, blocked gestures, single CTA "Jogar de novo" resetting the match.

**As a** player
**I want** my run's full stats the moment it ends
**So that** I can understand what happened and what to chase next

---

## Acceptance Criteria

1. **AC1 / FR-25, UX-DR-12, EXPERIENCE.md:73** — Given a match that reaches game over (grid full and no adjacent mergeable pair — `isGameOver(board) === true`), When the game-over state fires, Then the overlay shows immediately: `score`, `best score`, `max tile`, `number of merges`, and `longest streak`.
2. **AC2 / FR-27, D-010** — And the stats appear without any forced wait — no timer, no artificial delay gates the overlay; the last move stays visible behind the stats (board frozen by scrim, not unmounted).
3. **AC3 / P3, FR14 (lane-scoped)** — And the stats are lane-scoped where relevant (`best` = active lane's live `match.best` seeded from `persistedBest` via `initialScore`/`isNewRecord`; `best` never derived from global).
4. **AC4 / architecture error handling, ADR-02/06** — And game over is a state, not an error — the engine emits no throw; `isGameOver` is called on the post-move board, and the overlay renders from app-owned `MatchScore` + `MatchStats` (`move()` never throws).

---

## Story Integration Metadata

- **Story ID:** `6.1`
- **Story Key:** `6-1-overlay-de-game-over-com-stats-imediatos`
- **Story File:** `_bmad-output/implementation-artifacts/6-1-overlay-de-game-over-com-stats-imediatos.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-6-1-overlay-de-game-over-com-stats-imediatos.md`
- **Generated Test Files:**
  - `triade/__tests__/game/matchStats.test.ts` (NEW — T1, 10 tests, 271 lines)
  - `triade/__tests__/ui/components/gameOverOverlay.test.ts` (NEW — T2/T3, 11 tests, 243 lines)

> No BMM `create-story` wrapper exists for this install — `dev-story` should discover scaffolds via the story file's Dev Notes / this checklist. This story is **pure-additive** like Epic 7 (no engine change, no preview change).

---

## Stack Detection

- **Config `test_stack_type`:** `auto`
- **Detected stack:** `frontend` (Expo RN — `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`) but **adapted runner is `node:test` + `tsx`** (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`) — project zero-dep web/RN rule preserves node:test for host-testable logic since S1.1. No `playwright.config.*` / `cypress.config.*` anywhere.
- **Test framework:** `node:test` + `node:assert` + `react-test-renderer` + `tsx` loader (not Playwright/Cypress). `playwright`/`cypress` not installed; `tea_use_playwright_utils:true` is **not applicable** to this headless surface (scanned `__tests__` for `page.goto`/`page.locator` → 0 hits → API-only profile would be selected, but intentionally skipped — pure Unit+Component).
- **TEA flags:** `tea_use_playwright_utils: true` (no browser tests — skipped, same as 1.6 adaptation), `tea_use_pactjs_utils: false`, `tea_pact_mcp: none`, `tea_browser_automation: auto` (no browser surface), `tea_execution_mode: auto` → resolved `sequential` (pure host tests, subagents adapted → sequential direct write), `tea_capability_probe: true`, `test_stack_type: auto`

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (4 ACs, FR-25/27/FR14, UX-DR-12, FR-26 NFR-3)
- [x] Test framework configured — `triade/package.json` `test` script + `tsconfig.test.json` + `node:test` (baseline 417 pass / 0 fail on `main` `70e4fb0` after 12.1, 396 pre-12.1)
- [x] Development environment available (Node 26, `tsx`, `react-test-renderer` 19.2.3)
- [x] Existing patterns inspected — `__tests__/game/matchScore.test.ts` (8 pins, `initialScore`/`applyMove`/`isNewRecord`), `__tests__/game/preview.test.ts` (LADDER derivation), `__tests__/ui/components/previewCard.test.ts` + `hud.test.ts` (react-test-renderer + `hasStyle`/`allText` helper copy pattern), `test-utils/helpers.ts` (boardWith, gameState, rngOf, spyRng, stripCommentsAndStrings, extractNamedImports), `ui.norolls`/`ui.thinview`/`engine.purity` structural guards

---

## Knowledge Base Fragments Loaded

- **Core (always):** `data-factories.md` (overrides, no faker — determinism mandatory, zero-dep project), `test-quality.md` (Given-When-Then, one assertion per test intent, determinism, isolation, no hard waits), `test-healing-patterns.md` (variable-specifier dynamic `import(SPEC)` for CI-green red phase), `component-tdd.md` (not applied to non-animated chrome but a11y + style assertions reused)
- **Frontend conditional (applied — component surface):** `selector-resilience.md` (RN: not `data-testid` but `accessibilityLabel`/`accessibilityRole` + style markers `zIndex`/`backgroundColor`/`pointerEvents`/`width`/`height` — resilient to text changes), `timing-debugging.md` (no `setTimeout`/`Animated.timing` before mount — timing contract is immediate)
- **Backend patterns (applicable — pure `src/game`):** `test-levels-framework.md` (Unit for pure `matchStats`), `test-priorities-matrix.md` (P0 = game-over stats correctness + timing, P1 = lane-scoping separation + purity), `ci-burn-in.md` (not applied, but `git diff --stat` engine byte-identical gate mirrors it)
- **Playwright Utils (skipped):** `overview.md`, `api-request.md` etc. not loaded — no browser surface (same adaptation as 7.4)
- **Traditional Patterns (skipped):** `fixture-architecture.md`, `network-first.md` — no Playwright fixtures/network

---

## Generation Mode

**Chosen:** AI Generation (no browser recording). Reason: acceptance criteria are clear and the surface is a pure projection (`matchStats.ts`) + a dumb presentational RN component (`GameOverOverlay.tsx`) with deterministic props (`stats`, `isNewRecord`, `onRestart`, `reducedMotion`). No browser interaction needs live verification; stack is frontend but the 6.1 overlay is host-testable via `react-test-renderer` + `rn-stub` (same posture as `PreviewCard`/`Hud` in 7.2/7.3). `tea_browser_automation: auto` finds no web surface to record; recording is dead weight.

---

## Test Strategy

| AC | Scenario | Level | Priority | File | Test Names |
|----|----------|-------|----------|------|------------|
| AC1 | initialStats seeds merges=0, longest=0, current=0, maxTile=ceilingDetector(board) (including empty board ceiling 0 and 48 ceiling) | Unit | P0 | `matchStats.test.ts` | `[P0] AC1 initialStats seeds ...`, `[P0] AC1 initialStats on empty-ish ...`, `[P0] AC1 initialStats on game board ...` |
| AC1 | applyMoveStats increments merges by trace merge count (`from.length===2` / classify==="merge") — zero-merge move leaves merges unchanged | Unit | P0 | `matchStats.test.ts` | `[P0] AC1 applyMoveStats increments merges ...` |
| AC1 | streak per-move (not per-tile): consecutive merge moves increment currentStreak by 1, longestStreak = max, zero-merge resets current but preserves longest; double-merge in one swipe ([3,3,3,3]->[6,6]) counts as 1 streak step | Unit | P0 | `matchStats.test.ts` | `[P0] AC1 applyMoveStats streak ...`, `[P0] AC1 streak is per-move, not per-tile ...` |
| AC1 | maxTile monotonic: never decreases, tracks ceilingDetector(postBoard), rises when ceiling grows | Unit | P0 | `matchStats.test.ts` | `[P0] AC1 maxTile monotonic ...` |
| AC1 | overlay renders all five stats as own Text nodes (score/best/maxTile/merges/longestStreak) | Component | P0 | `gameOverOverlay.test.ts` | `[P0] AC1 overlay renders all five stats ...` |
| AC1 | a11y announcement contains "Game over" + stats; CTA has role button + label "Jogar de novo" | Component | P0 | `gameOverOverlay.test.ts` | `[P0] AC1 overlay accessibility ...` |
| AC1 | isNewRecord=true appends "Novo recorde" to a11y and highlights value with accent #E8A33D | Component | P0 | `gameOverOverlay.test.ts` | `[P0] AC1 isNewRecord=true ...` |
| AC1 | CTA onPress calls onRestart once (no confirmation dialog) | Component | P0 | `gameOverOverlay.test.ts` | `[P0] AC1 CTA "Jogar de novo" ...` |
| AC2 | scrim uses rgba(12,14,17,0.7) via backgroundColor (not opacity) — children keep full opacity | Component | P0 | `gameOverOverlay.test.ts` | `[P0] AC2 scrim uses rgba ...` |
| AC2 | overlay sits above Hud (zIndex:2, elevation:2, position:absolute) and blocks gestures via pointerEvents auto (one-level overlay) | Component | P0 | `gameOverOverlay.test.ts` | `[P0] AC2 overlay sits above Hud ...` |
| AC2 | renders synchronously — no setTimeout/setInterval/Animated.timing before mount, no transform props | Component | P0 | `gameOverOverlay.test.ts` | `[P0] AC2 overlay renders synchronously ...` |
| AC2 | CTA hit target is HIT_TARGET (44) via width+height directly (thinview gate) | Component | P0 | `gameOverOverlay.test.ts` | `[P0] AC2 CTA hit target ...` |
| AC1/AC2 | stat row tokens: label muted #8a8578 13/500, value text #1a1d23 17/500 tabular-nums | Component | P1 | `gameOverOverlay.test.ts` | `[P1] AC1/AC2 stat row tokens ...` |
| AC4 | matchStats purity: no Math.random, no roll symbols (resolveSpawn/weightedValue/spawnTile/weightedPicker/pickIndex), host-testable | Unit | P1 | `matchStats.test.ts` | `[P1] AC4 applyMoveStats purity ...` |
| AC4 | determinism: same prev+board+result yields deepEqual, no mutation of prev, spawn entries must not count as merges | Unit | P1 | `matchStats.test.ts` | `[P1] AC1/AC4 applyMoveStats determinism ...` |
| AC3 | lane-scoped best separation: MatchStats must not expose score/best (belongs to MatchScore via initialScore/isNewRecord) | Unit | P1 | `matchStats.test.ts` | `[P1] AC3 lane-scoped best is NOT inside MatchStats ...` |
| AC4 | overlay thin-view: never imports engine roll symbols, never Math.random, never layout/orientation rule logic | Component | P1 | `gameOverOverlay.test.ts` | `[P1] AC4 overlay is thin-view ...` |
| AC4 | reducedMotion prop gates future fade — defaults appropriately, no transform when false (Epic 9 gate for 6.2) | Component | P1 | `gameOverOverlay.test.ts` | `[P1] reducedMotion prop gates future fade ...` |

**No duplicate coverage** across levels — pure projection tested once at Unit, presentational chrome once at Component. E2E is intentionally absent (game-over is a state overlay, not a browser journey; simulator-manual would cover the swipe-to-game-over manual path if needed — same posture as swipe gesture 1.6). App wiring (App.tsx `matchStats` state + `isGameOver` + `handleRestart` + `busyRef` deadlock defense) is verified indirectly via Unit+Component pins plus the T5 gate suite; a dedicated `App.tsx` integration test is deferred to 6.3 when restart forfeit lanes land (scope guard CC 2026-08-23).

**Red Phase Requirements:** Neither `triade/src/game/matchStats.ts` nor `triade/src/ui/GameOverOverlay.tsx` exists on `main` `70e4fb0` — scaffolds are **designated RED** (they fail with `Cannot find module ...` when `test.skip()` is removed) but are **CI-green while skipped** (`npm test` 417 pass / 21 skipped). This is the correct ATDD signal for a pre-implementation overlay: the tests pin the expected contract so a future implementation regression fails. No placeholder assertions; every test asserts EXPECTED behavior per the story spec and tokens in `DESIGN.md`/`EXPERIENCE.md`.

---

## Red-Phase Test Scaffolds Created

> Framework note: this project uses **node:test + tsx** (not Playwright/Cypress). Scaffolds use `test.skip()` with variable-specifier dynamic `import(SPEC)` inside the skipped callback so the ESM loader does not fail at suite link time while the target module is absent. `npm test` stays green while skipped (417 pass / 21 skipped); removing `test.skip()` makes the dynamic import fail with `Cannot find module ...` (RED), then pass after implementation (GREEN). The same pattern was used for 2.4 `weights.ts` and 1.6 `swipe.ts` red phase.

### Unit Tests — `triade/__tests__/game/matchStats.test.ts` (NEW, 10 tests, 271 lines)

**File:** `triade/__tests__/game/matchStats.test.ts` (271 lines)

- ✅ **Test:** `[P0] AC1 initialStats seeds merges=0, longest=0, current=0 and maxTile from ceilingDetector(board)`
  - **Status:** RED — `Cannot find module '../../src/game/matchStats.ts'` when activated (file does not exist yet)
  - **Verifies:** AC1 `initialStats(board)` seeds `merges=0, longestStreak=0, currentStreak=0, maxTile=ceilingDetector(board)` (24 case via `boardWith`)
- ✅ **Test:** `[P0] AC1 initialStats on empty-ish board uses ceiling 0 (defensive floor)`
  - **Status:** RED — same import failure
  - **Verifies:** AC1 defensive floor: `emptyBoard()` ceiling 0 → `maxTile 0`
- ✅ **Test:** `[P0] AC1 initialStats on game board (newGame-like 9-tile setup) maxTile matches ceiling`
  - **Status:** RED — same import failure
  - **Verifies:** AC1 `boardWith` 48 ceiling → `maxTile 48`
- ✅ **Test:** `[P0] AC1 applyMoveStats increments merges by trace merge count (from.length===2, or classify==="merge")`
  - **Status:** RED — same import failure
  - **Verifies:** AC1 `applyMoveStats` `merges += trace.filter(!spawned && from.length===2).length`; zero-merge move leaves merges unchanged; spawn entries excluded
- ✅ **Test:** `[P0] AC1 applyMoveStats streak: consecutive merge moves increment currentStreak by 1, longestStreak tracks max`
  - **Status:** RED — same import failure
  - **Verifies:** AC1 streak per-move contract: merge → `currentStreak+1, longestStreak=Math.max`, zero-merge → `currentStreak=0` longest preserved; 5-move sequence pins 0→1→2→0→1→3 longest 3
- ✅ **Test:** `[P0] AC1 streak is per-move, not per-tile: [3,3,3,3]->[6,6] (two merges in one swipe) counts as ONE streak step`
  - **Status:** RED — same import failure
  - **Verifies:** AC1 spec pin: double-merge `MoveResult` with `from.length===2` x2 increments `merges` by 2 but `currentStreak` by 1; next single merge → streak 2 (not 3)
- ✅ **Test:** `[P0] AC1 maxTile monotonic: never decreases and tracks ceilingDetector(postBoard)`
  - **Status:** RED — same import failure
  - **Verifies:** AC1 `maxTile = Math.max(prev.maxTile, ceilingDetector(board))` monotonic; deflate 48→24 stays 48, grow to 96 rises to 96 and equals `ceilingDetector`
- ✅ **Test:** `[P1] AC1/AC4 applyMoveStats determinism: same prev+board+result yields deepEqual, no mutation of prev`
  - **Status:** RED — same import failure
  - **Verifies:** AC4 deterministic pure function: `structuredClone` prev → `applyMoveStats` twice → `deepEqual`; prev not mutated; spawn `spawned:true` entries never count as merges
- ✅ **Test:** `[P1] AC4 applyMoveStats purity: no Math.random, no engine roll symbols, host-testable (no RN)`
  - **Status:** RED — same import failure
  - **Verifies:** AC4 `matchStats.ts` source over `stripCommentsAndStrings` contains none of `Math.random, resolveSpawn, weightedValue, spawnTile, weightedPicker, pickIndex`; runtime `Math.random` not called via monkey-patch
- ✅ **Test:** `[P1] AC3 lane-scoped best is NOT inside MatchStats — matchStats only owns merges/longestStreak/maxTile/currentStreak (separation pin)`
  - **Status:** RED — same import failure
  - **Verifies:** AC3 separation: `MatchStats` must not expose `score`/`best` (belongs to `MatchScore` via `initialScore`/`isNewRecord` lane-scoped via `persistedBest`); exactly `merges, longestStreak, maxTile, currentStreak`

### Component Tests — `triade/__tests__/ui/components/gameOverOverlay.test.ts` (NEW, 11 tests, 243 lines)

**File:** `triade/__tests__/ui/components/gameOverOverlay.test.ts` (243 lines)

- ✅ **Test:** `[P0] AC1 overlay renders all five stats as own Text nodes (score/best/maxTile/merges/longestStreak)`
  - **Status:** RED — `Cannot find module '../../../src/ui/GameOverOverlay.tsx'` when activated
  - **Verifies:** AC1 FR-25 UX-DR-12 stats surface: 123/456/48/7/3 each as own `Text` node via `allText`/`hasToken` (copy pattern from `previewCard.test.ts`/`hud.test.ts`)
- ✅ **Test:** `[P0] AC1 overlay accessibility announcement contains "Game over" + stats (a11y contract)`
  - **Status:** RED — same import failure
  - **Verifies:** AC1 container `accessible` + `accessibilityRole="alert"` + `accessibilityLabel` "Game over. Score ... best ... max tile ... merges ... longest streak ..." + CTA `accessibilityRole="button"` `accessibilityLabel="Jogar de novo"`
- ✅ **Test:** `[P0] AC1 isNewRecord=true appends "Novo recorde" to a11y and highlights number with accent #E8A33D`
  - **Status:** RED — same import failure
  - **Verifies:** AC1 D-013 new-record accent highlight only via `color: '#E8A33D'` when `isNewRecord===true` else muted/text
- ✅ **Test:** `[P0] AC1 CTA "Jogar de novo" calls onRestart once (thin-view, no confirmation dialog)`
  - **Status:** RED — same import failure
  - **Verifies:** AC1 FR-26 single primary CTA; `onPress` calls `onRestart` exactly once; no confirmation dialog
- ✅ **Test:** `[P0] AC2 scrim uses rgba(12,14,17,0.7) via backgroundColor (not opacity) — children keep full opacity (DESIGN.md:193, mockup key-gameover.html:43)`
  - **Status:** RED — same import failure
  - **Verifies:** AC2 scrim `backgroundColor: 'rgba(12,14,17,0.7)'` (`#0C0E11` @70% via rgba, not separate `opacity` prop so children keep full opacity); fails if `opacity` style used beyond `1`
- ✅ **Test:** `[P0] AC2 overlay sits above Hud (zIndex:2, elevation:2) and blocks gestures via pointerEvents auto (one-level overlay, DESIGN.md:251-253)`
  - **Status:** RED — same import failure
  - **Verifies:** AC2 `position:'absolute', top:0,left:0,right:0,bottom:0, zIndex:2, elevation:2, pointerEvents:'auto'`; scrim `pointerEvents:'auto'` so `Gesture.Pan` cannot leak and `PauseButton` under scrim unreachable; hierarchy via `zIndex` not shadow pile
- ✅ **Test:** `[P0] AC2 overlay renders synchronously — no setTimeout, no Animated.timing before mount, no transform props (timing contract)`
  - **Status:** RED — same import failure
  - **Verifies:** AC2 UX-DR-12 FR-27 timing contract: no `setTimeout`/`setInterval`/`Animated.timing` before mount; board behind stays visible (board frozen by scrim, not unmounted); `transform` props absent on mount (6.2 owns future fade)
- ✅ **Test:** `[P0] AC2 CTA hit target is HIT_TARGET (44) via width+height directly (thinview gate thinview.test.ts:39-40)`
  - **Status:** RED — same import failure
  - **Verifies:** AC2 `width: HIT_TARGET` + `height: HIT_TARGET` directly (thinview gate `thinview.test.ts:39-40`); rendered style `width:44/48` pinned; `hitSlop` not needed
- ✅ **Test:** `[P1] AC1/AC2 stat row tokens: label muted #8a8578 13/500, value text #1a1d23 17/500 tabular-nums (DESIGN.md:153-279 token table)`
  - **Status:** RED — same import failure
  - **Verifies:** AC1/AC2 token table: label `color:#8a8578` 13/500, value `color:#1a1d23` 17/500 `tabular-nums`; `recordColor: #E8A33D` only when `isNewRecord`
- ✅ **Test:** `[P1] AC4 overlay is thin-view: never imports engine roll symbols, never Math.random, never layout/orientation rule logic (ui.norolls + ui.thinview + engine.purity)`
  - **Status:** RED — same import failure
  - **Verifies:** AC4 `GameOverOverlay.tsx` import allowlist: `react-native` primitives + same-dir `HIT_TARGET` + `../game/matchStats` types only; forbids `resolveSpawn|weightedValue|spawnTile|weightedPicker|pickIndex` + `Math.random` + `layoutFor|isLandscape|PORTRAIT_BAND_HEIGHT|LANDSCAPE_BAND_HEIGHT|resolveSwipeDirection`; structural guard mirrors `ui.norolls.test.ts:24` / `ui.thinview.test.ts:22` over `stripCommentsAndStrings`
- ✅ **Test:** `[P1] reducedMotion prop gates future fade — defaults appropriately and overlay carries no transform when false (Epic 9 gate for 6.2)`
  - **Status:** RED — same import failure
  - **Verifies:** AC2 future-compat: `reducedMotion` prop threaded (`false` literal in `App.tsx` until Epic 9); overlay carries no `transform` regardless of value (6.1 has no animation; 6.2 will gate fade behind this)

---

## Data Factories Created

None — pure functions with literal fixtures (`boardWith`, `emptyBoard`, `ceilingDetector`, `rngOf`-style `moveResult` + `traceEntry` helpers local to `matchStats.test.ts`; no faker per zero-dep project rule). Component tests use literal `stats: {score,best,maxTile,merges,longestStreak}` on every render (no factory indirection).

## Fixtures Created

None (reuses existing `test-utils/helpers.ts` + `test-utils/rn-stub.ts`). `matchStats.test.ts` is host-testable like `matchScore.test.ts`/`preview.test.ts`; `gameOverOverlay.test.ts` uses `react-test-renderer` + `hasStyle`/`allText` helper copy pattern of `hud.test.ts` + `previewCard.test.ts` (copy, don't import across test files).

## Mock Requirements

None — no external services. `loadBest`/`saveBest` (MMKV/SecureStore) and `preloadAssets` are **not** under test in 6.1; persistence wiring (`persistedBest` → `initialScore` → `match.best`) is verified via the existing `storage/settingsStore.test.ts` and `matchScore.test.ts`.

---

## Required data-testid Attributes

RN overlay uses `accessibilityLabel`/`accessibilityRole` (not `data-testid`) per prior component pattern (`PreviewCard`/`Hud`). Required for test stability:

### GameOverOverlay

- `accessibilityRole="alert"` + `accessibilityLabel` containing "Game over. Score {score}, best {best}, max tile {maxTile}, merges {merges}, longest streak {longestStreak}" (+ "Novo recorde" when `isNewRecord`) — container
- `accessibilityRole="button"` + `accessibilityLabel="Jogar de novo"` — primary CTA `Pressable`
- `pointerEvents="auto"` + `backgroundColor: 'rgba(12,14,17,0.7)'` + `zIndex:2` + `position:'absolute'` — scrim/overlay style markers
- `width: HIT_TARGET` + `height: HIT_TARGET` (≥44) — CTA style (thinview gate)

**Implementation Example:**

```tsx
<View accessible accessibilityRole="alert" accessibilityLabel={`Game over. Score ${score}, best ${best}, max tile ${maxTile}, merges ${merges}, longest streak ${longestStreak}${isNewRecord ? ' Novo recorde' : ''}`} style={styles.overlay} pointerEvents="auto">

<View style={[styles.scrim, { backgroundColor: 'rgba(12,14,17,0.7)' }]} pointerEvents="auto" />
<Text style={styles.value}>{score}</Text> // + best/maxTile/merges/longestStreak each as own Text

<Pressable accessibilityRole="button" accessibilityLabel="Jogar de novo" onPress={onRestart} style={styles.cta} hitSlop={4}>
  <Text>Jogar de novo</Text> // TODO 5.4: t('gameOver.restart')
</Pressable>
```

---

## Implementation Checklist

### Test: `[P0] AC1 initialStats / merges / streak / maxTile` (matchStats Unit)

**File:** `triade/__tests__/game/matchStats.test.ts`

**Tasks to make these tests pass (T1):**
- [ ] Create `triade/src/game/matchStats.ts` — relative imports only: `import { ceilingDetector } from '../engine/core/ceiling.ts'` + `import type { Board, MoveResult } from '../engine/core/types.ts'` — `src/game` is a purity root (`engine.purity.test.ts:7-50` scans `src/game/**` for `FORBIDDEN_PREFIXES` and non-relative specifiers)
- [ ] Export `interface MatchStats { merges: number; longestStreak: number; maxTile: number; currentStreak: number }` + `initialStats(board: Board): MatchStats` (`merges=0, longest=0, current=0, maxTile=ceilingDetector(board)`)
- [ ] Export `applyMoveStats(prev: MatchStats, board: Board, result: MoveResult): MatchStats` — pure, host-testable, no RN. Derive `mergeCountThisMove` via `classify(entry)==='merge'` (`src/render/transitionPlan.ts:21-26`) or fallback `!e.spawned && e.from.length===2` per `line.ts:40-43`; `merges = prev.merges + mergeCountThisMove`; streak `currentStreak = mergeCountThisMove>0 ? prev.currentStreak+1 : 0; longestStreak = Math.max(prev.longestStreak, currentStreak)` (per-move, not per-tile); `maxTile = Math.max(prev.maxTile, ceilingDetector(board))`; no `Math.random`, no roll symbols `resolveSpawn|weightedValue|spawnTile|weightedPicker|pickIndex`
- [ ] Keep `StyleSheet`/`react-native` out of this file; match `matchScore.ts` precedent (`triade/src/game/matchScore.ts:1-22`)
- [ ] Run test: `npm test -- __tests__/game/matchStats.test.ts` (inside `triade/`) — remove `test.skip()` for the active test, confirm RED, implement, confirm GREEN
- [ ] ✅ Tests pass (green phase)

**Estimated Effort:** 2 hours

---

### Test: `[P0] AC1/AC2 GameOverOverlay stats + a11y + scrim + hierarchy + timing + CTA` (Component)

**File:** `triade/__tests__/ui/components/gameOverOverlay.test.ts`

**Tasks to make these tests pass (T2):**
- [ ] Create `triade/src/ui/GameOverOverlay.tsx` — props fixed: `{ stats: { score: number; best: number; maxTile: number; merges: number; longestStreak: number }; isNewRecord: boolean; onRestart: () => void; reducedMotion?: boolean }` — dumb presentational; `App.tsx` computes `stats` + `isNewRecord(sessionStartBestRef.current, match.score)` and passes down (thin-view posture, mirrors 7.2 `PreviewCard` dumb pattern)
- [ ] Imports allowed: `react-native` primitives (`View/Text/Pressable/StyleSheet`) + same-dir `HIT_TARGET` (`./PauseButton` for `HIT_TARGET` only) + `../game/matchStats.ts` types; never `../engine/**` roll symbols, never `layout.ts`/`orientation.ts`/`swipe.ts` rule logic (`ui.thinview.test.ts:22` `RULE_LOGIC_SYMBOLS`)
- [ ] Style per `DESIGN.md:153-279` + `EXPERIENCE.md:73/82-84`: scrim `{colors.scrim}` `rgba(12,14,17,0.7)` (`#0C0E11` @70%) `position:'absolute', inset:0` covering frozen board; **single source of opacity via `backgroundColor` rgba, not separate `opacity` prop**; stat rows `{components.game-over-stat-row}` label `{colors.muted}` `#8a8578` 13/500, value `{colors.text}` `#1a1d23` 17/500 `tabular-nums`; primary CTA `{components.button}` accent fill `#E8A33D` dark-ink label `#1C1206`, `minHeight HIT_TARGET` 44, `borderRadius 12`; container `position:'absolute', top:0,left:0,right:0,bottom:0, zIndex:2, elevation:2, pointerEvents:'auto'` — must sit above `Hud` (`zIndex:1`)
- [ ] Apply safe-margin padding `insets` + `SAFE_MARGIN 16` (`src/ui/layout.ts:7-9`) like `Hud.tsx:35-37`; single primary CTA "Jogar de novo" hard-coded PT with `// TODO 5.4: t('gameOver.restart')` next to literal (waived until 5.4 i18n)
- [ ] Timing contract: overlay renders synchronously with `isGameOver(board)` true — no `setTimeout`, no `Animated.timing` before mount; `reducedMotion` prop gates any future fade/drift — defaults to `false` in `App.tsx` until Epic 9
- [ ] Accessibility: container `accessible` with `accessibilityRole="alert"` + `accessibilityLabel` announcing "Game over. Score {score}, best {best}, max tile {maxTile}, merges {merges}, longest streak {longestStreak}" (+ "Novo recorde" when `isNewRecord`); CTA `Pressable` has `accessibilityRole="button"` + `accessibilityLabel="Jogar de novo"` and `width: HIT_TARGET`/`height: HIT_TARGET` directly (thinview gate)
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.test.ts` — remove `test.skip()` for the active test, confirm RED, implement, confirm GREEN
- [ ] ✅ Tests pass (green phase)

**Estimated Effort:** 3 hours

---

### Test: `[P1] tokens + thin-view + reducedMotion` (Component P1)

**File:** `triade/__tests__/ui/components/gameOverOverlay.test.ts` (P1 subset)

**Tasks to make these tests pass:**
- [ ] Ensure token coverage stays green: label muted `#8a8578`, value `#1a1d23`, accent `#E8A33D` highlight only when `isNewRecord` (D-013, no confetti/banner)
- [ ] Thread `reducedMotion` prop now so 6.2 needs no API change (`App.tsx` passes literal `false` until 9-4)
- [ ] Keep `ui.norolls`/`ui.thinview`/`engine.purity` gates green without modification
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.test.ts` (P1 subset)
- [ ] ✅ Tests pass (green phase)

**Estimated Effort:** 1 hour

---

### Test: App wiring (integration, manual verification today)

**Files:** `triade/App.tsx` (modified, T3)

**Tasks (not directly pinned by a red scaffold — verified via Unit+Component + gate suite):**
- [ ] Import `isGameOver` from `src/engine/core/index.ts:18`, `initialStats`/`applyMoveStats` from `src/game/matchStats.ts`, `GameOverOverlay` from `src/ui/GameOverOverlay.tsx`; keep `availablePot` computation **once per render after** `if(!ready)` guard (`App.tsx:126-137`)
- [ ] State: `const [matchStats, setMatchStats] = useState<MatchStats>(() => initialStats(game.board))` seeded from existing `game.board` (reuse, don't re-call `newGame(rng)` in initializer — StrictMode double-invoke determinism)
- [ ] `doMove` update: after `setGame`/`setMoveResult`/`setMatch`, call `setMatchStats(prev => applyMoveStats(prev, result.board, result))` (use `result.board` post-move)
- [ ] Render condition: `const gameOver = isGameOver(game.board)` (committed snapshot); when true render `<GameOverOverlay ... reducedMotion={false} />` above `Hud` (`zIndex:2` over `Hud`'s `1`, scrim covers frozen board)
- [ ] `handleRestart = useCallback(() => { const s = newGame(rngRef.current); setGame(s); setMoveResult(null); setMatch(initialScore(persistedBest)); setMatchStats(initialStats(s.board)); busyRef.current=false; }, [persistedBest])` — **mandatory `busyRef=false` deadlock defense** (GameBoard settle timer Df5)
- [ ] Keep thin-view boundary: overlay receives resolved `stats` + `isNewRecord`, not raw `GameState`/`Board`
- [ ] Verify: `npm test` stays 417 pass → 438+ green after implementation; `npx tsc --noEmit` clean; `git diff --stat -- triade/src/engine` empty; `git diff --stat -- triade/src/game/preview.ts` empty

**Estimated Effort:** 2 hours

---

## Running Tests

```bash
# Inside triade/ — run all activated tests for this story (remove test.skip() for the current task first)
npm test -- __tests__/game/matchStats.test.ts
npm test -- __tests__/ui/components/gameOverOverlay.test.ts

# Run all tests (skipped scaffolds stay skipped, suite stays green)
npm test

# Run specific story suite (matchStats + overlay)
npm test -- __tests__/game/matchStats.test.ts __tests__/ui/components/gameOverOverlay.test.ts

# Type check (default tsconfig — CI gate)
npx tsc --noEmit

# Type check test config (waived TS5101 + 3 stub-typing errors from 7-1 2026-08-24)
npx tsc --noEmit -p tsconfig.test.json

# Gates
git diff --stat -- triade/src/engine   # must be empty
git diff --stat -- triade/src/game/preview.ts  # must be empty
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All tests written as red-phase scaffolds with `test.skip()` + variable-specifier dynamic `import(SPEC)` for not-yet-existing modules
- ✅ Fixtures and factories: none needed (reuses `test-utils/helpers.ts` + `rn-stub`); helpers `boardWith`/`emptyBoard`/`ceilingDetector`/`traceEntry`/`moveResult` local to scaffold
- ✅ Mock requirements: none documented
- ✅ `accessibilityLabel`/`pointerEvents`/`zIndex`/`rivg BG` requirements listed (instead of `data-testid`)
- ✅ Implementation checklist created (T1–T5, estimated 8h total)

**Verification:**

- All generated tests are present and marked with `test.skip()` (21 tests)
- Activation guidance is clear and actionable per test (Implementation Checklist)
- Any activated test fails with `Cannot find module .../matchStats.ts` or `.../GameOverOverlay.tsx` due to missing implementation, not test bugs — verified via `node --import tsx` dynamic import probe and `npm test` 417 pass / 21 skipped

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with `matchStats` `initialStats` — highest priority P0)
2. **Remove `test.skip()`** for that test and confirm it fails first (`Cannot find module ...`)
3. **Read the test** to understand expected behavior (see trace classifier + token table T2)
4. **Implement minimal code** to make that specific test pass (`matchStats.ts` pure projection)
5. **Run the test** to verify it now passes (green) — `npm test -- __tests__/game/matchStats.test.ts`
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat (overlay presentational → App wiring)

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer — stick to `src/game/` pure + `src/ui/` thin-view allowlist)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete) — `npm test` → all green, `npx tsc --noEmit` clean, `engine`/`preview` diffs empty, `hud.previewWiring` + `ui.norolls`/`ui.thinview`/`engine.purity` green
2. **Review code for quality** (readability, maintainability, token fidelity)
3. **Extract duplications** (DRY principle — stat row `StyleSheet` reuse)
4. **Optimize performance** (if needed — `matchStats` is host-pure, no memo needed beyond `useState` initializer guard)
5. **Ensure tests still pass** after each refactor
6. **Update documentation** (no API contract change beyond `matchStats` export + overlay props; add `// TODO 5.4: t('gameOver.restart')` next to literal per T2)

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (or manual handoff)
2. **Review this checklist** with team in standup or planning
3. **Begin implementation** using implementation checklist as guide (T1 `matchStats.ts` → T2 `GameOverOverlay.tsx` → T3 `App.tsx` wiring → T5 gates)
4. **Activate one scaffold at a time** by removing `test.skip()` for the current task, then confirm it fails before implementing
5. **Work one activated test at a time** (red → green for each)
6. **Share progress** in daily standup
7. **When all activated tests pass**, refactor code for quality
8. **When refactoring complete**, manually update story status to `done` in `sprint-status.yaml`

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments:

- **data-factories.md** — Factory patterns overridden to literal fixtures (no `@faker-js/faker`; project zero-dep rule — `boardWith`/`emptyBoard`/`moveResult` local helpers)
- **component-tdd.md** — Component TDD via `react-test-renderer` + `hasStyle`/`allText` copy pattern (no Playwright Component Testing — headless stub `rn-stub.ts` maps RN to string hosts)
- **test-quality.md** — Test design principles (Given-When-Then comments, one assertion focus per test, determinism, isolation, no hard waits, no `Math.random`)
- **test-healing-patterns.md** — `test.skip()` + variable-specifier dynamic `import(SPEC)` for CI-green red phase (from 1.6/2.4 precedent)
- **selector-resilience.md** — Resilient selectors via `accessibilityLabel`/`accessibilityRole` + style markers (`zIndex`, `backgroundColor`, `pointerEvents`, `width`/`height`) instead of fragile text/class selectors
- **timing-debugging.md** — Timing contract verified via source scan for `setTimeout`/`setInterval`/`Animated.timing` and absence of `transform` props on mount
- **test-levels-framework.md** — Test level selection framework (Unit for pure `matchStats`, Component for thin-view overlay, no E2E/API duplicate)
- **test-priorities-matrix.md** — P0/P1 prioritization (game-over stats correctness + timing = P0, lane-scoping separation + purity + tokens = P1)

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification

**Command:** `npm test` (inside `triade/`) + `npx tsc --noEmit` + `node --import tsx` dynamic import probe

**Results:**

```
# npm test (triade/) — 2026-08-26, Node 26, pre-implementation (red-phase skipped)
ℹ tests 438
ℹ suites 0
ℹ pass 417
ℹ fail 0
ℹ cancelled 0
ℹ skipped 21
ℹ todo 0
ℹ duration_ms 2994.672292

# npx tsc --noEmit (default tsconfig — CI gate)
exit:0 (clean)

# npx tsc --noEmit -p tsconfig.test.json
tsconfig.test.json(4,5): error TS5101: Option 'baseUrl' is deprecated ... (PRE-EXISTING waived per deferred-work.md:122-124, from 7-1 2026-08-24)
exit:0 (no NEW errors beyond waived set)

# git diff --stat -- triade/src/engine  → empty (engine byte-identical, T5 gate)
# git diff --stat -- triade/src/game/preview.ts → empty (preview byte-identical, T5 gate)

# Dynamic import probe (RED verification — target modules do not exist yet):
#   await import('./src/game/matchStats.ts') → Cannot find module '.../src/game/matchStats.ts'
#   await import('./src/ui/GameOverOverlay.tsx') → Cannot find module '.../src/ui/GameOverOverlay.tsx'
# Removing test.skip() for any scaffold makes it fail with the above (expected RED), then pass after implementation (GREEN).
```

**Summary:**

- Total tests: 438 (417 existing + 21 new scaffolds)
- Skipped: 21 (expected before activation — 10 in `matchStats.test.ts` + 11 in `gameOverOverlay.test.ts`)
- Activated RED tests: 21 would fail with `Cannot find module` (verified via dynamic import probe) — expected before implementation
- Passing: 417 (all existing) / 0 before implementation for activated scaffolds (expected)
- Status: ✅ Red-phase scaffolds verified (CI-green while skipped, RED when activated)

**Expected Failure Messages (when `test.skip()` removed):**

- `matchStats.test.ts` (10 tests): `Error: Cannot find module '/.../triade/src/game/matchStats.ts' imported from /.../triade/__tests__/game/matchStats.test.ts` (module does not exist yet — T1 creates it)
- `gameOverOverlay.test.ts` (11 tests): `Error: Cannot find module '/.../triade/src/ui/GameOverOverlay.tsx' imported from /.../triade/__tests__/ui/components/gameOverOverlay.test.ts` (module does not exist yet — T2 creates it)
- Both: after implementation, imports resolve and tests turn GREEN (asserting expected behavior per ACs + token table)

---

## Notes

- **Adaptation — Playwright Utils not applicable:** `tea_use_playwright_utils:true` would normally load `overview.md`, `api-request.md`, `network-recorder.md`, etc., but the scanned `__tests__` contain zero `page.goto`/`page.locator` hits and the runner is `node:test` headless — so the profile is API-only but intentionally skipped; the correct level for 6.1 is Unit+Component via `react-test-renderer` (same as 1.6/7.2/7.3 precedent). `tea_use_pactjs_utils:false` likewise N/A.
- **Adaptation — ATDD two-worker split (API + E2E) → Unit + Component:** No HTTP API and no browser UI in this story, so workers `step-04a` (API) / `step-04b` (E2E) are adapted to Unit (`matchStats`) + Component (`GameOverOverlay`) red-phase scaffolds, written sequentially.
- **Tracer — state-placement tension carry:** master rule `game-architecture.md:776-777` *anything undo must revert lives in snapshot* — `longestStreak` is named as future undo-owned field. 6.1 deliberately defers snapshot placement (Epic 6 before Epic 3 undo; per-match cumulative sufficient for Clean-lane 1-tap restart). When Epic 3 `MatchOrchestrator` lands (story 3-5), re-evaluate: if undo rewinds `board`+`pendingSpawn` (ADR-06), `applyMoveStats` must become invertible or `MatchStats` must move into snapshot; pin decision in 3-5's review. Not a code change now — documented.
- **StrictMode deterministic init:** `App.tsx` `matchStats` state is seeded from the existing `game.board` (already `newGame(rngRef.current)` at `App.tsx:43`); do NOT call `newGame` again inside initializer — that would consume a second 20-draw `mulberry32` stream if StrictMode double-invokes initializers (`deferred-work.md:81-82` waived latent for `game`; reuse already-created `game.board`).
- **Scrim pin:** `rgba(12,14,17,0.7)` (`#0C0E11` @70% via `backgroundColor` rgba, not separate `opacity` prop) per `DESIGN.md:193` + mockup `key-gameover.html:43` — single source of opacity so children keep full opacity.
- **busyRef deadlock defense:** `handleRestart` must set `busyRef.current=false` — if `gameOver` mounted while `busyRef=true` (effective move in flight), `GameBoard` settle timer (`GameBoard.tsx:215-219`) would be unmounted without calling `onMoveSettled` (`deferred-work.md:81` Df5); without reset next match freezes on first swipe.
- **Thin-view boundary:** `GameOverOverlay` receives resolved `stats` + `isNewRecord`, not raw `GameState`/`Board` — preserves `ui.thinview.test.ts` pattern (Hud precedent). Imports allowed only `react-native` primitives + `HIT_TARGET` + `../game/matchStats` types.
- **Scope guard (CC 2026-08-23):** Single-lane board today. This story lands Clean-lane overlay (stats + "Jogar de novo" only). Accelerated-lane discreet Continue offer belongs to 6.3/3-4 — do NOT add rewarded-ad/IAP wiring here.
- **Baseline drift:** `50285a3` 325 pass → `70e4fb0` 396 → `7-4` 414 → `6.1` pre-dev 417 (no regression; 21 skipped are new scaffolds). `npx tsc --noEmit -p tsconfig.test.json` abort TS5101 + 3 stub `useWindowDimensions`/`GestureHandlerRootViewProps.style`/`Platform` errors are **PRE-EXISTING waived** (`deferred-work.md:122-124` from 7-1 2026-08-24) — only flag NEW errors.

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @eduardo in Slack/Discord
- Refer to `_bmad/tea/config.yaml` for workflow configuration
- Consult `.agents/skills/bmad-testarch-atdd/resources/knowledge` for testing best practices

---

**Generated by BMad TEA Agent** - 2026-08-26
