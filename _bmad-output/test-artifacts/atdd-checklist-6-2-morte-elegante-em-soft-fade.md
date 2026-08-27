---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-26'
workflowType: 'testarch-atdd'
storyId: '6.2'
storyKey: '6-2-morte-elegante-em-soft-fade'
storyFile: '_bmad-output/implementation-artifacts/6-2-morte-elegante-em-soft-fade.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-6-2-morte-elegante-em-soft-fade.md'
generatedTestFiles:
  - 'triade/__tests__/ui/components/gameOverOverlay.softFade.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/6-2-morte-elegante-em-soft-fade.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md'
  - 'triade/App.tsx'
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/PauseButton.tsx'
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

# ATDD Checklist - Epic 6, Story 6.2: Morte elegante em soft fade

**Date:** 2026-08-26
**Author:** Eduardo (TEA / Murat)
**Primary Test Level:** Component (host-testable RN presentational via `react-test-renderer` + `tsx`) — `GameOverOverlay.tsx` is a thin overlay (`triade/src/ui/`) enhanced with post-mount `Animated` fade/drift. No E2E/API/Unit required (host-testable surface, `App.tsx` wiring verified structurally, engine `src/engine`/`src/game/preview`/`src/game/matchStats` byte-identical).

---

## Story Summary

As a player, I want the game over to feel like a graceful ending, so that a loss doesn't feel like an abrupt cutoff. The game-over overlay (landed synchronously in 6.1) gains a quiet post-mount soft-fade: scrim `opacity 0→1` + content `translateY 12→0 + opacity 0→1` over `FADE_MS 280ms` (`Easing.out(Easing.cubic)`, `useNativeDriver:true`, content `delay:80`), CTA stays hittable throughout (no forced wait), last move stays frozen under scrim, reduced-motion cuts motion via `setValue`, no celebration.

**As a** player
**I want** the game over to feel like a graceful ending
**So that** a loss doesn't feel like an abrupt cutoff

---

## Acceptance Criteria

1. **AC1 / FR-27, D-010** — Given a game over, When the overlay appears, Then the board soft-fades and the last move stays visible behind the stats (board frozen by scrim, not unmounted).
2. **AC2 / UX-DR-25, S6.4** — And the stats drift in quietly over the frozen board — no abrupt cutoff, no forced wait (CTA `pointerEvents:auto` hittable during 280ms fade, scrim `opacity 0→1` + content `translateY 12→0`).
3. **AC3 / UX-DR-25** — And the death treatment receives the same care as the big merge — the "fall" is elegant, not abrupt (280ms pinned, `Easing.out(Easing.cubic)`, 80ms scrim lead, `useNativeDriver:true`, cleanup `stop`+`stopAnimation`).
4. **AC4 / UX-DR-16, FR-30** — And under Reduced Motion, the game-over soft fade is cut or smoothed while haptics and sound stay (`if (reducedMotion) { setValue }` branch, `translateY 0`/`opacity 1`, no `Animated.timing` with `duration:0`, no `expo-haptics`/`expo-audio` gating).
5. **AC5 / D-013** — And no celebration, confetti, or reward pacing appears on the overlay (no `confetti|celebrat|lottie|reward|particleBurst|shakeMs`).

---

## Story Integration Metadata

- **Story ID:** `6.2`
- **Story Key:** `6-2-morte-elegante-em-soft-fade`
- **Story File:** `_bmad-output/implementation-artifacts/6-2-morte-elegante-em-soft-fade.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-6-2-morte-elegante-em-soft-fade.md`
- **Generated Test Files:**
  - `triade/__tests__/ui/components/gameOverOverlay.softFade.test.ts` (NEW — T3, 8 tests, ~334 lines, `test.skip` red-phase)

> No BMM `create-story` wrapper exists — `dev-story` should discover scaffolds via this checklist / story `Dev Notes`. This story is **additive animation** (no engine/preview/matchStats change, `App.tsx` literal `reducedMotion={false}` stays).

---

## Stack Detection

- **Config `test_stack_type`:** `auto`
- **Detected stack:** `frontend` (Expo RN — `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia` 2.6.2 + `react-native-reanimated` 4.5.1, but overlay uses `Animated` from `react-native` only) adapted runner is `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`) — preserves `node:test` host-testable rule since S1.1. No `playwright.config.*` / `cypress.config.*` anywhere.
- **Test framework:** `node:test` + `node:assert` + `react-test-renderer` 19.2.3 + `tsx` loader (not Playwright/Cypress). `playwright`/`cypress` not installed; `tea_use_playwright_utils:true` is **not applicable** to this host surface (scanned `__tests__` for `page.goto`/`page.locator` → 0 hits → would select API-only profile, intentionally skipped).
- **TEA flags:** `tea_use_playwright_utils: true` (skipped), `tea_use_pactjs_utils: false`, `tea_pact_mcp: none`, `tea_browser_automation: auto` (no browser surface), `tea_execution_mode: auto` → resolved `sequential` (pure host tests, subagents adapted → sequential direct write), `tea_capability_probe: true`, `test_stack_type: auto`

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (5 ACs, FR-27/D-010, UX-DR-25/S6.4, UX-DR-16/FR-30, D-013; 6.1 landed at `e03bff7` 444 pass)
- [x] Test framework configured — `triade/package.json` `test` script + `tsconfig.test.json` (`baseUrl:.`, `paths:{react-native: rn-stub}`, `ignoreDeprecations:6.0`) + `node:test` (baseline 440 pass / 0 fail on current `HEAD` after 6.1; 6.1 alone added `matchStats` + `GameOverOverlay` + wiring)
- [x] Development environment available (Node 26, `tsx` 4.23.12, `react-test-renderer` 19.2.3, `typescript` 6.0.3)
- [x] Existing patterns inspected — `__tests__/ui/components/gameOverOverlay.test.ts` (11 tests, `allText`/`hasStyle`/`collectStyles` copy pattern, `hasToken`, `baseProps`/`renderOverlay` with `import(SPEC)`, source-level `stripCommentsAndStrings` + `extractNamedImports` guards), `app.gameOverWiring.test.ts` (structural `isGameOver(game.board)` + `availablePot` once-per-render + `handleRestart` deadlock defense), `ui.norolls.test.ts` (`ROLL_SYMBOLS` + `Math.random` guard over `src/ui|src/render|src/services`), `ui.thinview.test.ts` (`isAllowedViewImport` `react-native`+same-dir + `RULE_LOGIC_SYMBOLS`), `test-utils/helpers.ts` (`stripCommentsAndStrings` string-aware, `extractNamedImports`), `test-utils/rn-stub.ts` (host `View/Text/Pressable/StyleSheet` → string hosts), `src/ui/layout.ts` (`SAFE_MARGIN 16`), `App.tsx:193-197` (`reducedMotion={false}` literal + `insets={insets}` passthrough + `{gameOver ? <GameOverOverlay …/> : null}` sibling to unconditional `GameBoard`)

---

## Knowledge Base Fragments Loaded

- **Core (always):** `data-factories.md` (adapted: no faker — literal `stats: {score,best,maxTile,merges,longestStreak}` fixtures, determinism mandatory, zero-dep project), `test-quality.md` (Given-When-Then, one intent per test, determinism, isolation — each `renderOverlay` builds fresh renderer, no shared board), `test-healing-patterns.md` (`test.skip()` + direct import for CI-green red phase; module exists, assertions pin missing motion), `test-levels-framework.md` (Component is correct level for thin-view overlay animation; Unit/E2E/API duplicate avoided)
- **Frontend conditional (applied — component surface):** `selector-resilience.md` (RN: `accessibilityLabel`/`accessibilityRole` + style markers `backgroundColor rgba(12,14,17,0.7)`, `zIndex:2`, `pointerEvents:auto`, `width: HIT_TARGET` — resilient to text changes), `timing-debugging.md` (post-mount timing only: `Animated.timing` after mount, `Easing.out(Easing.cubic)`, `delay:80`, `useNativeDriver:true`, `setValue` for reducedMotion, cleanup `stop`/`stopAnimation`; no `setTimeout` gating mount), `component-tdd.md` (red→green→refactor via `react-test-renderer` + `hasStyle`/`allText` copy pattern, provider isolation not needed — no `GestureHandlerRootView` inside overlay)
- **Backend patterns (gates):** `test-priorities-matrix.md` (P0 = soft-fade choreography correctness + timing + no-forced-wait + reducedMotion cut + no celebration; P1 = tokens + thin-view + norolls), `ci-burn-in.md` (adapted: `git diff --stat` engine/preview/matchStats byte-identical gates + `npm test` + `tsc --noEmit`)
- **Playwright Utils (skipped):** `overview.md`, `api-request.md` etc. not loaded — no browser surface (same adaptation as 6.1/7.3)
- **Traditional Patterns (skipped):** `fixture-architecture.md`, `network-first.md` — no Playwright fixtures/network

---

## Generation Mode

**Chosen:** AI Generation (no browser recording). Reason: acceptance criteria are clear and the surface is a dumb presentational overlay (`GameOverOverlay.tsx`) with deterministic props (`stats`, `isNewRecord`, `onRestart`, `reducedMotion`, `insets`) plus `Animated` choreography (`FADE_MS 280`, `delay 80`, `Easing.out(Easing.cubic)`, `useNativeDriver:true`) and structural `App.tsx` wiring. No browser interaction needs live verification; the 6.2 fade is host-testable via `react-test-renderer` + source-level `stripCommentsAndStrings` pinning (same posture as 6.1 overlay + PreviewCard/Hud in 7.2/7.3). `tea_browser_automation: auto` finds no web surface to record; recording is dead weight. `detected_stack: frontend` would allow recording, but overlay has no DOM and `rn-stub` provides headless `Animated.View` if needed — recording would add no signal.

---

## Test Strategy

| AC | Scenario | Level | Priority | File | Test Names |
|----|----------|-------|----------|------|------------|
| AC1/AC2 | Overlay mounts synchronously with all five stats and CTA pressable during fade (no forced wait — `onPress` at opacity 0 calls `onRestart` once, `pointerEvents:auto`/`accessibilityViewIsModal`/`zIndex:2`/`position:absolute`/`rgba(12,14,17,0.7)` kept) | Component | P0 | `gameOverOverlay.softFade.test.ts` | `[P0] AC1/AC2 overlay mounts synchronously with all five stats and CTA pressable during fade (no forced wait)` |
| AC1 | Board last move stays visible — overlay does not unmount `GameBoard` (structural `App.tsx` pin: `isGameOver(game.board)` + `<GameBoard` unconditional + `{gameOver ? <GameOverOverlay` sibling, no `gameBoard=null` / `if(gameOver) return`) | Component (structural) | P0 | `gameOverOverlay.softFade.test.ts` | `[P0] AC1 board last move stays visible — overlay does not unmount GameBoard (structural App.tsx pin)` |
| AC2/AC3 | Soft fade + drift exist when `reducedMotion=false` (elegant fall — source `Animated`+`Animated.timing`+`opacity`+`translateY`+`280`+`Easing.out(Easing.cubic)`+`delay:80`+`useNativeDriver:true`+ no `setTimeout`/`setInterval`+ no `react-native-reanimated`/`skia`, cleanup `return()=>{anim.stop();…stopAnimation}`) | Component | P0 | `gameOverOverlay.softFade.test.ts` | `[P0] AC2/AC3 soft fade + drift exist when reducedMotion=false (elegant fall, same care as big merge)` |
| AC4 | `reducedMotion=true` cuts fade/drift (`if(reducedMotion){setValue(1)/setValue(0); return;}` before `Animated.timing`, not `duration:0`, no `expo-haptics`/`expo-audio`/`Haptics`/`Audio`, rendered no non-zero `translateY`) | Component | P0 | `gameOverOverlay.softFade.test.ts` | `[P0] AC4 reducedMotion=true cuts fade/drift (setValue, drift 0, haptics/sound stay)` |
| AC5 | No celebration/confetti/reward pacing (`/confetti|celebrat|lottie|reward/i` + `particleBurst`/`shakeMs` absent over `stripCommentsAndStrings`, no `Continuar` CTA, no `Lottie` node) | Component | P0 | `gameOverOverlay.softFade.test.ts` | `[P0] AC5 no celebration/confetti/reward pacing (D-013)` |
| AC1/AC2 (tokens) | Tokens + `HIT_TARGET` preserved through fade (`#8a8578` label + `#E8A33D` record via `hasStyle`, `width: HIT_TARGET`/`height: HIT_TARGET` in source + `width:44` rendered, `reducedMotion` variant also) | Component | P1 | `gameOverOverlay.softFade.test.ts` | `[P1] tokens + HIT_TARGET preserved through fade (DESIGN.md:153-279 table)` |
| AC4 (purity) | Thin-view + norolls still green (`ROLL_SYMBOLS` + `Math.random` + `RULE_LOGIC_SYMBOLS` absent, specifiers only `react`/`react-native`+same-dir, no `react-native-reanimated`) | Component | P1 | `gameOverOverlay.softFade.test.ts` | `[P1] thin-view + norolls still green (Animated/Easing from react-native only)` |
| AC2/AC3 (supersession) | Supersedes 6.1 timing guard — mount synchronous (no `setTimeout`/`setInterval` gating mount) but post-mount `Animated.timing` with `opacity`+`translateY`+`Easing`+`280`+`80`+`useNativeDriver:true` IS present (opposite of 6.1 `!Animated.timing`) | Component | P0 | `gameOverOverlay.softFade.test.ts` | `[P0] AC2/AC3 supersedes 6.1 timing guard — mount synchronous but post-mount Animated.timing IS present` |

**No duplicate coverage** across levels — all 6.2 scenarios are Component (thin-view animation + structural App wiring). E2E is intentionally absent (game-over is a state overlay, not a browser journey; simulator-manual covers swipe-to-game-over as in 1.6). Unit is absent (no new pure function; `matchStats`/`preview`/`engine` byte-identical). App wiring (`App.tsx` `isGameOver` + `availablePot` once-per-render + `handleRestart` deadlock defense) is verified via structural pins plus existing `app.gameOverWiring.test.ts` staying green; no new integration file needed.

**Red Phase Requirements:** `GameOverOverlay.tsx` exists from 6.1 but lacks `Animated` choreography — scaffolds are **designated RED** (they fail with `must contain Animated.timing / 280 / Easing / delay:80 / setValue` when `test.skip()` is removed) but are **CI-green while skipped** (`npm test` 440 pass / 8 skipped). This is the correct ATDD signal for pre-enhancement: tests pin the expected 6.2 contract so the future implementation regression fails. No placeholder assertions; every test asserts EXPECTED behavior per `T1` choreography + tokens in `DESIGN.md:193,251-253` + `EXPERIENCE.md:73,84`.

---

## Red-Phase Test Scaffolds Created

> Framework note: this project uses **node:test + tsx** (not Playwright/Cypress). Scaffolds use `test.skip()` with direct `import(SPEC)` inside helper (`SPEC='../../../src/ui/GameOverOverlay.tsx'`) so the suite stays green while skipped (440 pass / 8 skipped); removing `test.skip()` makes assertions fail on `GameOverOverlay.tsx` missing `Animated` (expected RED), then pass after `T1` ships (GREEN). Same pattern as 6.1 `test.skip()` + variable-specifier `import(SPEC)` inside skipped callback — adapted for an existing module whose motion is missing. No `playwright/utils` or `pact` needed.

### Component Tests — `triade/__tests__/ui/components/gameOverOverlay.softFade.test.ts` (NEW, 8 tests, ~334 lines)

**File:** `triade/__tests__/ui/components/gameOverOverlay.softFade.test.ts` (334 lines)

- ✅ **Test:** `[P0] AC1/AC2 overlay mounts synchronously with all five stats and CTA pressable during fade (no forced wait)`
  - **Status:** RED — fails with `Stat token … must render synchronously` / `CTA must expose onPress immediately` / `overlay must keep pointerEvents auto` when motion missing; currently skipped so suite stays green. When `Animated` ships, CTA `onPress` at opacity 0 must still call `onRestart` once.
  - **Verifies:** AC1/AC2 FR-27/D-010/UX-DR-25 — synchronous mount, 5 stats as own `Text` nodes (`allText`/`hasToken`), CTA `accessibilityLabel "Jogar de novo"` pressable without awaiting animation, `pointerEvents:auto`+`accessibilityViewIsModal`+`zIndex:2`+`elevation:2`+`position:absolute` kept during 280ms fade, final `backgroundColor rgba(12,14,17,0.7)` pinned, never `pointerEvents:none`.

- ✅ **Test:** `[P0] AC1 board last move stays visible — overlay does not unmount GameBoard (structural App.tsx pin)`
  - **Status:** RED — fails with `App.tsx must evaluate isGameOver(game.board)` / `GameBoard must not be hidden` if wiring regresses; currently skipped.
  - **Verifies:** AC1 — `App.tsx` source over `stripCommentsAndStrings` contains `isGameOver(game.board)` + `<GameOverOverlay` + `<GameBoard` as unconditional sibling inside `styles.container`, not `gameOver ? null : <GameBoard>` or `gameBoard=null` or `if(gameOver) return`, overlay conditional is `{gameOver ? <GameOverOverlay …/> : null}` — board frozen under scrim, not flashed to empty.

- ✅ **Test:** `[P0] AC2/AC3 soft fade + drift exist when reducedMotion=false (elegant fall, same care as big merge)`
  - **Status:** RED — fails with `must contain Animated` / `must contain Animated.timing` / `must pin FADE_MS 280` / `must be Easing.out(Easing.cubic)` / `must have delay: 80` / `must use useNativeDriver:true` / `must return cleanup with stop()` — expected before T1.
  - **Verifies:** AC2/AC3 choreography: outer `Animated.View opacity 0→1` 280ms `Easing.out(Easing.cubic)`, inner `Animated.View translateY 12→0 + opacity 0→1` 280ms `delay:80`, `useNativeDriver:true`, no `setTimeout`/`setInterval` gating mount, no `react-native-reanimated`/`@shopify/react-native-skia`, unmount cleanup `return()=>{anim.stop();…stopAnimation}` to prevent leaked `Animated` timer when `handleRestart` unmounts mid-fade. Rendered check supplements source gate.

- ✅ **Test:** `[P0] AC4 reducedMotion=true cuts fade/drift (setValue, drift 0, haptics/sound stay)`
  - **Status:** RED — fails with `must branch on if (reducedMotion)` / `must setValue(1)/setValue(0)` / `must return early` / `must not contain expo-haptics` if gate wrong.
  - **Verifies:** AC4 UX-DR-16/FR-30 — `if(reducedMotion){ scrimOpacity.setValue(1); contentOpacity.setValue(1); contentY.setValue(0); return; }` before any `Animated.timing` (not `duration:0`), rendered reducedMotion=true has no non-zero `translateY`, stripped source has no `expo-haptics`/`expo-audio`/`Haptics`/`Audio` (haptics/sound stay enabled, Epic 8 owns them; 6.2 must not gate).

- ✅ **Test:** `[P0] AC5 no celebration/confetti/reward pacing (D-013)`
  - **Status:** RED — fails with `must not contain confetti / celebrat / lottie / reward / particleBurst / shakeMs` if celebration added.
  - **Verifies:** AC5 D-013 — over `stripCommentsAndStrings` source, absence of `/confetti|celebrat|lottie|reward/i` + `particleBurst`/`shakeMs` (Epic 8 feel), no `Continuar` CTA (6.3), no `Lottie`/confetti rendered node.

- ✅ **Test:** `[P1] tokens + HIT_TARGET preserved through fade (DESIGN.md:153-279 table)`
  - **Status:** RED — fails with `label must keep muted #8a8578` / `must keep accent #E8A33D` / `width: HIT_TARGET` if tokens regress; currently skipped.
  - **Verifies:** P1 — label `#8a8578` 13/500 muted + value `#E8A33D` record accent preserved when `isNewRecord` and through `reducedMotion:true` variant; CTA `width: HIT_TARGET`/`height: HIT_TARGET` in source + rendered `width:44`.

- ✅ **Test:** `[P1] thin-view + norolls still green (Animated/Easing from react-native only)`
  - **Status:** RED — fails with `must not contain resolveSpawn|weightedValue|spawnTile|weightedPicker|pickIndex|Math.random` or `layoutFor|isLandscape|…|resolveSwipeDirection` or `react-native-reanimated` if boundary violated.
  - **Verifies:** P1 — `GameOverOverlay.tsx` over `stripCommentsAndStrings` + `extractNamedImports` contains none of `ROLL_SYMBOLS` + `Math.random`, specifiers only `react`/`react-native`+same-dir (`isAllowedViewImport` `ui.thinview.test.ts:33-40` stays green because `Animated`/`Easing` are `react-native` primitives), no `../engine/` specifier, no `RULE_LOGIC_SYMBOLS`.

- ✅ **Test:** `[P0] AC2/AC3 supersedes 6.1 timing guard — mount synchronous but post-mount Animated.timing IS present`
  - **Status:** RED — fails with `must not contain setTimeout` / `must NOW contain Animated.timing` — documents supersession of 6.1 `'[P0] AC2 overlay renders synchronously — no setTimeout, no Animated.timing before mount, no transform props'`.
  - **Verifies:** Supersession note: mount stays synchronous (no timer gating overlay visibility) but post-mount `Animated.timing` with `opacity`+`translateY`+`Easing`+`280`+`delay:80`+`useNativeDriver:true` IS required (opposite of 6.1's `!Animated.timing`). Keep `setTimeout`/`setInterval` absence; add post-mount motion.

---

## Data Factories Created

None — pure presentational overlay with literal `stats: {score,best,maxTile,merges,longestStreak}` fixtures on every `renderOverlay` (no faker per zero-dep project rule). Each test builds its own props via `baseProps(overrides)` local helper (mirrors `gameOverOverlay.test.ts` pattern). No DB/state lifecycle.

---

## Fixtures Created

None (reuses existing `test-utils/helpers.ts` + `test-utils/rn-stub.ts` headless `View/Text/Pressable/StyleSheet`). `gameOverOverlay.softFade.test.ts` reuses `allText`/`hasStyle`/`collectStyles` copy pattern of `gameOverOverlay.test.ts` + `hud.test.ts`/`previewCard.test.ts` (copy, don't import across test files). Auto-cleanup fixtures would be dead weight. Each `renderOverlay` builds a fresh `TestRenderer` — no module-level shared renderer (isolation per `test-quality.md`). `App.tsx` structural pins use `readFileSync` + `stripCommentsAndStrings` — no mount of full `App` needed (same posture as `app.gameOverWiring.test.ts`).

---

## Mock Requirements

None — no external services. `loadBest`/`saveBest` (MMKV/SecureStore) and `preloadAssets` are **not** under test in 6.2; persistence wiring (`persistedBest` → `initialScore` → `match.best` → `GameOverOverlay stats`) is verified via existing `app.gameOverWiring.test.ts` staying green. `expo-haptics`/`expo-audio` are intentionally absent from overlay (Epic 8 owns them); 6.2 must not import them — verified by AC4 absence gate. `Animated`/`Easing` come from `react-native` (already in `rn-stub` after T1 enhancement, no new dep).

---

## Required data-testid Attributes

RN overlay uses `accessibilityLabel`/`accessibilityRole` + style markers (not `data-testid`) per prior component pattern (`PreviewCard`/`Hud`/`GameOverOverlay`). Required for test stability (already satisfied by 6.1, preserved through fade):

### GameOverOverlay (preserved + animated)

- `accessibilityRole="alert"` + `accessibilityLabel` containing `"Game over. Score {score}, best {best}, max tile {maxTile}, merges {merges}, longest streak {longestStreak}"` (+ `"Novo recorde"` when `isNewRecord`) — inner `View` child of `Animated.View content`
- `accessibilityRole="button"` + `accessibilityLabel="Jogar de novo"` — `Pressable` CTA (`width: HIT_TARGET`/`height: HIT_TARGET` directly, thinview gate `ui.thinview.test.ts:39-40`)
- `pointerEvents="auto"` + `accessibilityViewIsModal` + `backgroundColor: 'rgba(12,14,17,0.7)'` + `position:'absolute', top:0,left:0,right:0,bottom:0, zIndex:2, elevation:2` — outer `Animated.View` scrim (now animated `opacity 0→1`, final `rgba` pinned via `hasStyle`)
- `opacity: Animated.Value` (outer scrim) + `transform: [{translateY: Animated.Value}]` + `opacity: Animated.Value` (inner content, `delay:80`) — animated styles (new in 6.2, gated by `reducedMotion`)
- `paddingTop: (insets?.top ?? 0)+SAFE_MARGIN` (16) on all edges via outer `Animated.View` style array (preserved from 6.1)

**Implementation Example (post-mount motion, mount stays synchronous):**

```tsx
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { HIT_TARGET } from './PauseButton';
import { SAFE_MARGIN } from './layout';

const FADE_MS = 280; // pinned

export function GameOverOverlay({ stats, isNewRecord, onRestart, reducedMotion, insets }: GameOverOverlayProps) {
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (reducedMotion) { scrimOpacity.setValue(1); contentOpacity.setValue(1); contentY.setValue(0); return; }
    const anim = Animated.parallel([
      Animated.timing(scrimOpacity, { toValue:1, duration:FADE_MS, easing:Easing.out(Easing.cubic), useNativeDriver:true }),
      Animated.timing(contentOpacity, { toValue:1, duration:FADE_MS, delay:80, easing:Easing.out(Easing.cubic), useNativeDriver:true }),
      Animated.timing(contentY, { toValue:0, duration:FADE_MS, delay:80, easing:Easing.out(Easing.cubic), useNativeDriver:true }),
    ]);
    anim.start();
    return () => { anim.stop(); scrimOpacity.stopAnimation(); contentOpacity.stopAnimation(); contentY.stopAnimation(); };
  }, [reducedMotion]);

  return (
    <Animated.View accessibilityViewIsModal pointerEvents="auto" style={[styles.overlay, { opacity: scrimOpacity }, { paddingTop: padTop, /* ... */ }]}>
      <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
        <View accessible accessibilityRole="alert" accessibilityLabel={`Game over. Score ${stats.score} …${isNewRecord?' Novo recorde':''}`}>
          { /* 5 stat rows + CTA Pressable width:HIT_TARGET height:HIT_TARGET */ }
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Jogar de novo" onPress={onRestart} style={styles.cta}>
          <Text style={styles.ctaLabel}>Jogar de novo</Text>{/* TODO 5.4: t('gameOver.restart') */}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
```

---

## Implementation Checklist

### Test: `[P0] AC1/AC2/AC1-structural` — mount synchronous + CTA hittable during fade + board visibility

**File:** `triade/__tests__/ui/components/gameOverOverlay.softFade.test.ts` (2 tests)

**Tasks to make these tests pass (T1 subset + T2 verify):**

- [ ] Keep `GameOverOverlay.tsx` props byte-identical to 6.1 — `interface GameOverOverlayProps { stats:{score,best,maxTile,merges,longestStreak}; isNewRecord:boolean; onRestart:()=>void; reducedMotion?:boolean; insets:{top,bottom,left,right}}` — `App.tsx:193-195` already threads `reducedMotion={false}` + `insets={insets}`; no API change, no new required prop.
- [ ] Verify `App.tsx` wiring stays: `const gameOver=isGameOver(game.board)` (committed snapshot) + `{gameOver ? <GameOverOverlay … reducedMotion={false} insets={insets} /> : null}` **above** `Hud` (`zIndex:2` over `Hud zIndex:1`) with `pointerEvents:'auto'` blocking `Gesture.Pan` (`App.tsx:154`) and `PauseButton` unreachable (one-level overlay `DESIGN.md:251-253`). No `setTimeout` before mount, no `handleRestart` change (`newGame`+`setMatch`+`setMatchStats`+`busyRef=false` deadlock defense `App.tsx:103-110` stays).
- [ ] Overlay must still mount synchronously when `isGameOver(game.board)===true` (FR-27/D-010/6.1 timing contract). No `setTimeout`/`setInterval` gates mount; fade starts after mount in `useEffect`/`useLayoutEffect` — CTA stays `pointerEvents:auto` and `pressable` throughout (tapping during 280ms fade must call `onRestart` immediately).
- [ ] Board (`GameBoard`) stays unconditional sibling under scrim inside `View style=container` — not `gameOver ? null : <GameBoard>`; last move frozen under `rgba(12,14,17,0.7)` scrim, not flashed to empty.
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.softFade.test.ts --test-name-pattern "AC1"` (inside `triade/`) — remove `test.skip()` for that case first, confirm RED, implement, confirm GREEN
- [ ] ✅ Tests pass (green phase)

**Estimated Effort:** 1 hour

---

### Test: `[P0] AC2/AC3 elegant fall + superseded guard` — 280/80/Easing/useNativeDriver/cleanup

**File:** `triade/__tests__/ui/components/gameOverOverlay.softFade.test.ts` (2 tests)

**Tasks to make these tests pass (T1 choreography):**

- [ ] Enhance `triade/src/ui/GameOverOverlay.tsx` to `Animated.View` outer+inner with `opacity`+`translateY` post-mount timing gated by `reducedMotion` via `setValue` (T1). Outer `Animated.View` keeps `accessibilityViewIsModal`+`pointerEvents:'auto'` throughout — never `pointerEvents:'none'` even at opacity 0 so CTA stays hittable.
- [ ] Tokens/choreography: scrim outer `Animated.View opacity 0→1` over **FADE_MS 280ms** (260-320 window, pin 280) `Easing.out(Easing.cubic)`; inner content `translateY 12→0 + opacity 0→1` same 280ms **delay 80** after scrim start; `useNativeDriver:true` for `opacity`/`transform`. When `reducedMotion===true`, `setValue(1)`/`setValue(0)` with no `Animated.timing`.
- [ ] Keep single final scrim `rgba(12,14,17,0.7)` (`{colors.scrim}` `#0C0E11` @70% `DESIGN.md:193`); animation drives container `opacity` style `0→1`, not second `backgroundColor` interpolation — children keep fading together as quiet drift (supersedes 6.1 "no opacity prop" which was for static immediate overlay).
- [ ] Use `Animated`/`Easing` from `react-native` (allowed `react-native` specifier, `isAllowedViewImport` `ui.thinview.test.ts:33-40` stays green); do NOT add `react-native-reanimated`/`@shopify/react-native-skia`/`expo-haptics`/`expo-audio` (would trip `ui.thinview` + `engine.purity` + AC4 gate).
- [ ] Unmount cleanup: `useEffect` returns `()=>{ anim.stop(); scrimOpacity.stopAnimation(); contentOpacity.stopAnimation(); contentY.stopAnimation(); }` so `handleRestart` mid-fade does not leak JS timer / warn `Animated: useNativeDriver`.
- [ ] Update existing `gameOverOverlay.test.ts` guard `'[P0] AC2 overlay renders synchronously — no setTimeout, no Animated.timing before mount, no transform props'` to instead assert mount synchronous but **post-mount** `Animated.timing` with `opacity`+`translateY`+`Easing.out(Easing.cubic)`+`duration:280`+`delay:80`+`useNativeDriver:true` IS present (document supersession in test header). New scaffold already pins this as `[P0] AC2/AC3 supersedes 6.1 timing guard …` — keep both green after merge.
- [ ] Ensure `triade/test-utils/rn-stub.ts` exposes `Animated` (`View` with `opacity`/`transform` support) + `Easing` (`out`, `cubic`) so `npx tsc --noEmit -p tsconfig.test.json` stays clean (add minimal `Animated: { View, timing, parallel, Value }` shim + `Easing` if missing; `Animated` types come from `react-native` stub, no new dep).
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.softFade.test.ts --test-name-pattern "soft fade|supersedes"` — confirm RED, implement, confirm GREEN
- [ ] ✅ Tests pass (green phase)

**Estimated Effort:** 3 hours

---

### Test: `[P0] AC4 reducedMotion + AC5 no celebration` — preset gate + D-013

**File:** `triade/__tests__/ui/components/gameOverOverlay.softFade.test.ts` (2 tests)

**Tasks to make these tests pass:**

- [ ] Branch on `reducedMotion` at top of effect: `if(reducedMotion){ scrimOpacity.setValue(1); contentOpacity.setValue(1); contentY.setValue(0); return; }` — both opacities jump to 1 and `translateY` to 0 via `setValue` with no `Animated.timing` (not `duration:0`). Haptics/sound stay enabled: file must not import `expo-haptics`/`expo-audio` or gate them (`if(reducedMotion) return` that suppresses Haptics is forbidden — this story's `true` path is exercised via component tests passing `reducedMotion={true}` directly; `App.tsx` literal `false` stays until 9-4).
- [ ] No celebration: file contains no `/confetti|celebrat|lottie|reward/i` and no `particleBurst`/`shakeMs` strings; no second CTA `Continuar` (6.3) — pin `renderer.root.findAll(n=>n.props?.accessibilityLabel==='Continuar').length===0` + stripped source absence gate.
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.softFade.test.ts --test-name-pattern "reducedMotion|celebration"`
- [ ] ✅ Tests pass (green phase)

**Estimated Effort:** 1 hour

---

### Test: `[P1] tokens + thin-view/norolls` — DESIGN + guard suite

**File:** `triade/__tests__/ui/components/gameOverOverlay.softFade.test.ts` (2 tests)

**Tasks to make these tests pass:**

- [ ] Preserve 6.1 tokens through fade: `label #8a8578 13/500 muted`, `value #1a1d23 17/500 tabular-nums`, `valueRecord #E8A33D` when `isNewRecord`, CTA `width: HIT_TARGET`/`height: HIT_TARGET` (44) untouched, `// TODO 5.4: t('gameOver.*')` comments stay next to five PT literals + CTA literal (i18n waiver until 5.4).
- [ ] Keep `HIT_TARGET` CTA `backgroundColor #E8A33D` dark-ink `#1C1206` (~8.6:1), `borderRadius 12`, `maxWidth 420` card `#fff` — unchanged.
- [ ] Import hygiene: allowed only `react` + `react-native` primitives (`View/Text/Pressable/StyleSheet/Animated/Easing`) + same-dir `HIT_TARGET`/`SAFE_MARGIN` + same-dir types. No `../engine/**` (`ROLL_SYMBOLS`), no `Math.random`, no `layoutFor|isLandscape|…|resolveSwipeDirection`, no `src/game/matchStats` beyond types. `Animated`/`Easing` from `react-native` stays inside `isAllowedViewImport` (`ui.thinview.test.ts:33-40`).
- [ ] Ensure existing gate suites stay green **without modification** beyond `Animated`/`Easing` from `'react-native'`: `triade/__tests__/ui/ui.norolls.test.ts`, `triade/__tests__/ui/ui.thinview.test.ts`, `triade/__tests__/engine/engine.purity.test.ts`, `triade/__tests__/ui/components/hud.previewWiring.test.ts`, `triade/__tests__/ui/components/app.gameOverWiring.test.ts` — verify via `npm test`.
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.softFade.test.ts --test-name-pattern "tokens|thin-view"`
- [ ] ✅ Tests pass (green phase)

**Estimated Effort:** 1 hour

---

### Test: T4 gates & regression guard (AC: 1–5)

**Files:** `triade/` (full suite)

**Tasks:**

- [ ] `npm test` (inside `triade/`) → all green. Baseline on `e03bff7` post-6.1: **440 pass / 0 fail / 8 skipped** (this scaffold). New count after GREEN should be **448 pass / 0 fail** (440 + 8 pins) with `engine.purity`+`ui.norolls`/`ui.thinview`/`hud.previewWiring`/`app.gameOverWiring`+`gameOverOverlay` (both files) green.
- [ ] `npx tsc --noEmit` (default tsconfig — CI gate) → clean. Also `npx tsc --noEmit -p tsconfig.test.json` → clean (only flag **NEW** errors; after 6.1 fix `rn-stub`+`ignoreDeprecations` both gates are clean — `Animated` types from `react-native` stub cause no new errors).
- [ ] `git diff --stat -- triade/src/engine` **must be empty** — engine byte-identical (this story is `src/ui/` animation + tests; same posture as 6.1 and Epic 7).
- [ ] `git diff --stat -- triade/src/game/preview.ts` **must be empty** — preview unchanged; `pendingSpawn`/`previewFor` not touched.
- [ ] `git diff --stat -- triade/src/game/matchStats.ts` **must be empty** — stats projection unchanged; fade owns no stat.
- [ ] `git diff --stat -- triade/src/render` **must be empty** — board trace-driven, no overlay knowledge; early-input `EARLY_INPUT_MS 84` + `settleTimerRef` unchanged.
- [ ] `git diff --stat -- triade/src/services` **must be empty** — no monetization/telemetry/storage touched.
- [ ] `npm run`/`npx expo` not needed; `npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` inside `triade/` (no new deps, no build step).
- [ ] Manual smoke (informative — Skia manual-validation domain): on iOS simulator fill board with no mergeable pair → verify CTA "Jogar de novo" hittable during 280ms fade, scrim ends `rgba(12,14,17,0.7)`, content drift quiet (not snap), `reducedMotion=true` (via test prop — App literal stays `false` until 9-4) shows no drift, no confetti, last move tiles frozen under scrim (board not flashing to empty).

**Estimated Effort:** 0.5 hour

---

## Running Tests

```bash
# Inside triade/ — run all 6.2 scaffolds (remove test.skip() for the current task first)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/gameOverOverlay.softFade.test.ts
npm test -- __tests__/ui/components/gameOverOverlay.softFade.test.ts
npm test -- --test-name-pattern "AC1"
npm test -- --test-name-pattern "soft fade"
npm test -- --test-name-pattern "reducedMotion"
npm test -- --test-name-pattern "celebration"
npm test -- --test-name-pattern "tokens|thin-view"

# Run alongside 6.1 overlay + wiring (full game-over surface)
npm test -- __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/gameOverOverlay.softFade.test.ts __tests__/ui/components/app.gameOverWiring.test.ts

# Run all tests (skipped scaffolds stay skipped, suite stays green — 440 pass / 8 skipped red-phase)
npm test

# Run specific story slice
npm test -- __tests__/ui/components/gameOverOverlay.softFade.test.ts __tests__/ui/components/gameOverOverlay.test.ts

# Type check (default tsconfig — CI gate)
npx tsc --noEmit

# Type check test config
npx tsc --noEmit -p tsconfig.test.json  # clean on current HEAD; only flag NEW errors

# Gates — must be empty
git diff --stat -- triade/src/engine
git diff --stat -- triade/src/game/preview.ts
git diff --stat -- triade/src/game/matchStats.ts
git diff --stat -- triade/src/render
git diff --stat -- triade/src/services

# Guard suites (must stay green without modification)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.norolls.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.thinview.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/engine.purity.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/hud.previewWiring.test.ts
```

> No headed/debug browser mode applies — this is a `node:test` + `react-test-renderer` + host `rn-stub` suite (same posture as 6.1 overlay, PreviewCard, Hud). No Playwright/MCP.

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 8 tests written as red-phase scaffolds with `test.skip()` + direct `import(SPEC)` inside helper (`SPEC='../../../src/ui/GameOverOverlay.tsx'`) so the suite stays CI-green while skipped (440 pass / 8 skipped); removing `test.skip()` makes assertions fail on missing `Animated.timing`/`280`/`Easing.out(Easing.cubic)`/`delay:80`/`setValue`/`stopAnimation` (expected RED), then pass after T1 ships (GREEN). Same `test.skip` red-phase pattern as 6.1 `matchStats` + `gameOverOverlay` scaffolds (21 skipped) and 1.6 `swipe`/`engine.purity` precedent.
- ✅ Source-level deterministic gates via `stripCommentsAndStrings` + `extractNamedImports` (no wall-clock, no `setTimeout` wait — `FADE_MS 280` + `delay 80` pinned as literals, `useNativeDriver:true` pinned, cleanup `stop`+`stopAnimation` pinned).
- ✅ Rendered + structural gates supplement source gates (CTA `pointerEvents:auto` hittable during fade, `isGameOver(game.board)` + `GameBoard` unconditional sibling, tokens `HIT_TARGET` preserved).
- ✅ Thin-view + norolls boundary pinned (only `react` + `react-native` primitives + same-dir `HIT_TARGET`/`SAFE_MARGIN`; `Animated`/`Easing` from `'react-native'` stays inside `isAllowedViewImport` `ui.thinview.test.ts:33-40`).
- ✅ No factories/fixtures/mocks/data-testids beyond existing `test-utils/helpers.ts` + `rn-stub`; literal `stats` fixtures on every render (determinism, zero-dep).
- ✅ Implementation checklist created (T1–T4, estimated 6.5h total) + AC→test→file traceability table (Test Strategy) + running tests + `data-testid`→`accessibilityLabel` mapping.

**Verification:**

- All 8 generated tests are present and marked with `test.skip()` (8 skipped)
- Activation guidance is clear and actionable per test (Implementation Checklist T1–T4)
- Any activated test fails on `GameOverOverlay.tsx` missing `Animated` choreography due to missing enhancement, not test bugs — verified via `stripCommentsAndStrings` source probe (`Animated` 0 hits on current HEAD) and `npm test` 440 pass / 8 skipped
- Existing gate suites (`ui.norolls` 1/1, `ui.thinview` 2/2, `engine.purity` 2/2, `hud.previewWiring` 4/4, `app.gameOverWiring` 4/4, `gameOverOverlay` 11/11) stay green while skipped (see Test Execution Evidence)

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from Implementation Checklist (start with `[P0] AC2/AC3 soft fade + drift exist when reducedMotion=false` — highest risk choreography)
2. **Remove `test.skip()`** for that test and confirm it fails first (`must contain Animated.timing` — expected RED)
3. **Read the test** to understand expected behavior (see `T1` choreography table + `DESIGN.md:193,251-253` scrim tokens)
4. **Implement minimal code** to make that specific test pass (`GameOverOverlay.tsx` `Animated.View` + `useEffect` + `FADE_MS 280` + `delay 80` + `Easing.out(Easing.cubic)` + `useNativeDriver:true` + cleanup)
5. **Run the test** to verify it now passes (green) — `npm test -- __tests__/ui/components/gameOverOverlay.softFade.test.ts --test-name-pattern "soft fade"`
6. **Check off the task** in Implementation Checklist
7. **Move to next test** and repeat (reducedMotion gate → no celebration → tokens/thin-view → mount/CTA + board visibility → superseded guard)
8. **Keep `ui.thinview`/`ui.norolls`/`engine.purity` green** — if `Animated`/`Easing` trips `isAllowedViewImport`, confirm it is from `'react-native'` (allowed) not `react-native-reanimated` (forbidden); no per-file exemption needed.

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer — stick to `src/ui/` `react-native` `Animated`/`Easing` + same-dir `HIT_TARGET`/`SAFE_MARGIN`; no engine/preview/matchStats/render/service edits)
- Run tests frequently (immediate feedback; `npm test` 440→448 incremental)
- Use Implementation Checklist as roadmap; keep `FADE_MS 280` + `delay 80` literals exact (not `260` or `300` — pin 280)
- Preserve `reducedMotion` prop byte-identical API; `App.tsx` literal `false` until 9-4 — `true` path exercised via component tests directly

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete) — `npm test` → 448 pass / 0 fail, `npx tsc --noEmit` clean on both configs, `src/engine`/`src/game/preview`/`src/game/matchStats`/`src/render`/`src/services` diffs empty, `hud.previewWiring` + `ui.norolls`/`ui.thinview`/`engine.purity` + `gameOverOverlay` (both files) green
2. **Review code for quality** (readability, maintainability, token fidelity — `rgba(12,14,17,0.7)` final, `maxWidth 420`, `#8a8578`/`#1a1d23`/`#E8A33D` + `HIT_TARGET 44`)
3. **Extract duplications** (DRY — `FADE_MS` const, `Easing.out(Easing.cubic)` shared, `useRef` trio creation)
4. **Optimize performance** (if needed — `useNativeDriver:true` already performant; no JS thread work)
5. **Ensure tests still pass** after each refactor (run `npm test -- __tests__/ui/components/gameOverOverlay.softFade.test.ts` after each change)
6. **Update documentation** — supersede 6.1 `no Animated.timing before mount` guard comment in `gameOverOverlay.test.ts` to note post-mount motion now expected; keep `// TODO 5.4: t('gameOver.*')` waivers next to literals

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (or manual handoff via `_bmad-output/implementation-artifacts/6-2-morte-elegante-em-soft-fade.md` `Dev Notes` mirrors `Story Integration Metadata` paths).
2. **Review this checklist** with team in standup or planning (walk `Test Strategy` table AC→test→file, confirm `FADE_MS 280` + `delay 80` + `Easing.out(Easing.cubic)` + `useNativeDriver:true` + `setValue` reducedMotion + `stop` cleanup + no celebration + `HIT_TARGET` + thin-view pins).
3. **Begin implementation** using Implementation Checklist as guide (T1 `GameOverOverlay.tsx` `Animated` choreography → T2 verify `App.tsx` wiring unchanged → T3 `gameOverOverlay.softFade.test.ts` pins + superseded guard update → T4 gates).
4. **Activate one scaffold at a time** by removing `test.skip()` for the current task, then confirm it fails before implementing (red → green for each).
5. **Work one activated test at a time** (red → green for each; `npm test` stays greenIncremental).
6. **Share progress** in daily standup; when all 8 pins green, consolidate `gameOverOverlay.softFade.test.ts` into `gameOverOverlay.test.ts` if team prefers single file (or keep separate — both satisfy `T3` as long as `npm test` 448 green).
7. **When refactoring complete**, manually update story status to `done` in `_bmad-output/implementation-artifacts/sprint-status.yaml` (`6-2-morte-elegante-em-soft-fade: done`, `epic-6` stays `in-progress` until 6.3/6.4 land).

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (see `tea-index.csv`):

- **data-factories.md** — Factory patterns overridden to literal `stats` fixtures + `baseProps` helper (no `@faker-js/faker`; zero-dep project determinism).
- **component-tdd.md** — Component TDD via `react-test-renderer` + `hasStyle`/`allText`/`collectStyles` copy pattern (no Playwright Component Testing — headless `rn-stub` maps RN to string hosts; `Animated.View` after T1 is still a RN primitive via same specifier).
- **test-quality.md** — Test design principles (Given-When-Then comments, one assertion focus per test, determinism, isolation — each `renderOverlay` builds fresh `TestRenderer`, no hard waits, no `Math.random`).
- **test-healing-patterns.md** — `test.skip()` + direct `import(SPEC)` for CI-green red phase (module exists but motion missing; same as 6.1 `test.skip` + variable-specifier `import(SPEC)` inside skipped callback — when activated, source assertions fail deterministically).
- **selector-resilience.md** — Resilient selectors via `accessibilityLabel`/`accessibilityRole` (`"Jogar de novo"`, `"Game over"`+stats) + style markers (`backgroundColor rgba(12,14,17,0.7)`, `zIndex:2`, `pointerEvents:auto`, `width: HIT_TARGET`) instead of fragile text/class selectors.
- **timing-debugging.md** — Timing contract verified via source scan for `setTimeout`/`setInterval` gating mount (must be absent) + `Animated.timing` + `Easing.out(Easing.cubic)` + `delay:80` + `duration:280` + `useNativeDriver:true` + `setValue` for reducedMotion + `stop`/`stopAnimation` cleanup (no wall-clock).
- **test-levels-framework.md** — Test level selection (Component for thin-view overlay animation; Unit/E2E/API correctly absent — no pure function, no browser journey, no service contract).
- **test-priorities-matrix.md** — P0/P1 prioritization (soft-fade choreography + no-forced-wait + reducedMotion cut + no celebration = P0; tokens + thin-view/norolls = P1).

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification

**Command:** `npm test` (inside `triade/`) + `npx tsc --noEmit` + `npx tsc --noEmit -p tsconfig.test.json` + `stripCommentsAndStrings` source probe

**Results:**

```
# npm test (triade/) — 2026-08-26, Node 26, pre-enhancement (red-phase skipped)
ℹ tests 448
ℹ suites 0
ℹ pass 440
ℹ fail 0
ℹ cancelled 0
ℹ skipped 8
ℹ todo 0
ℹ duration_ms 3286.489167

# npx tsc --noEmit (default tsconfig — CI gate)
exit:0 (clean)

# npx tsc --noEmit -p tsconfig.test.json (test config)
exit:0 (clean)

# git diff --stat -- triade/src/engine  → empty (engine byte-identical, T4 gate)
# git diff --stat -- triade/src/game/preview.ts → empty
# git diff --stat -- triade/src/game/matchStats.ts → empty
# git diff --stat -- triade/src/render → empty
# git diff --stat -- triade/src/services → empty

# Gate suites still green while skipped:
#   triade/__tests__/ui/ui.norolls.test.ts — 1 pass (AC4 UI never rolls)
#   triade/__tests__/ui/ui.thinview.test.ts — 2 pass (Hud/PauseButton/GameOverOverlay thin-view + HIT_TARGET)
#   triade/__tests__/engine/engine.purity.test.ts — 2 pass
#   triade/__tests__/ui/components/hud.previewWiring.test.ts — 4 pass
#   triade/__tests__/ui/components/app.gameOverWiring.test.ts — 4 pass
#   triade/__tests__/ui/components/gameOverOverlay.test.ts — 11 pass (6.1 immediate overlay)
#   triade/test-utils/rn-stub.ts — host View/Text/Pressable/StyleSheet still green

# Source probe (RED verification — target choreography does not exist yet):
#   stripCommentsAndStrings(GameOverOverlay.tsx) contains:
#     'Animated' → false
#     'Animated.timing' → false
#     'translateY' → false
#     '280' → false
#     'Easing' → false
#   Removing test.skip() for any scaffold makes it fail with
#   `must contain Animated.timing / 280 / Easing.out(Easing.cubic) / delay: 80`
#   (expected RED), then pass after T1 enhancement (GREEN).
```

**Summary:**

- Total tests: 448 (440 existing + 8 new scaffolds)
- Skipped: 8 (expected before activation — all in `gameOverOverlay.softFade.test.ts`)
- Activated RED tests: 8 would fail with `must contain Animated.timing / 280 / Easing` (verified via source probe) — expected before enhancement
- Passing: 440 (all existing) / 0 before enhancement for activated scaffolds (expected)
- Status: ✅ Red-phase scaffolds verified (CI-green while skipped, RED when activated)

**Expected Failure Messages (when `test.skip()` removed):**

- `gameOverOverlay.softFade.test.ts` (8 tests): `AssertionError [ERR_ASSERTION]: GameOverOverlay.tsx must contain Animated (from react-native)` / `must contain Animated.timing for post-mount fade/drift` / `must pin FADE_MS 280 literal` / `must be Easing.out(Easing.cubic) exactly` / `must have delay: 80` / `must use useNativeDriver:true` / `must branch on if (reducedMotion)` / `must not contain confetti` (module exists but choreography missing — T1 creates it)
- After `T1` enhancement, imports resolve and `Animated`/`Easing` from `react-native` satisfy `isAllowedViewImport` + `useNativeDriver:true` + `setValue` + `stop` gates, and all 8 turn GREEN (asserting expected behavior per ACs + `DESIGN.md` tokens + choreography table).

---

## Notes

- **Adaptation — Playwright Utils not applicable:** `tea_use_playwright_utils:true` would normally load `overview.md`, `api-request.md`, `network-recorder.md`, etc., but scanned `__tests__` contain zero `page.goto`/`page.locator` hits and runner is `node:test` headless — profile would be API-only but intentionally skipped; correct level for 6.2 is Component via `react-test-renderer` (same as 6.1/7.2/7.3 precedent). `tea_use_pactjs_utils:false` likewise N/A (no contract).
- **Adaptation — ATDD two-worker split (API + E2E) → Component:** No HTTP API and no browser UI journey in this story (fade is a 280ms choreography, not a service contract), so workers `step-04a` (API) / `step-04b` (E2E) are adapted to Component (overlay) red-phase scaffolds, written sequentially as a single `gameOverOverlay.softFade.test.ts` file. E2E manual smoke (simulator) is documented in T4, not scaffolded.
- **Animation API choice:** `Animated`/`Easing` from `react-native` is chosen over `react-native-reanimated` because `ui.thinview.test.ts:33-40` `isAllowedViewImport` allows only `'react-native'` + same-dir siblings; `reanimated` would require a per-file exemption inside `isAllowedViewImport` for `GameOverOverlay.tsx` only — `Animated` satisfies the choreography (`opacity`/`transform` with `useNativeDriver:true`) without widening the allowlist (story T1 explicitly calls this out). Do not add `react-native-reanimated` here.
- **Supersession:** 6.1 guard `'[P0] AC2 overlay renders synchronously — no setTimeout, no Animated.timing before mount, no transform props'` pinned `!Animated.timing` because the immediate overlay had no motion. 6.2 keeps mount synchronous (no `setTimeout` gating overlay visibility) but **adds** post-mount `Animated.timing` — new scaffold `[P0] AC2/AC3 supersedes 6.1 timing guard …` documents the opposite (`Animated.timing` + `opacity`+`translateY`+`Easing`+`280`+`80`+`useNativeDriver` IS present) and will require updating the 6.1 test header during GREEN (keep `setTimeout` absence, flip `Animated.timing` assertion). The `backgroundColor rgba(12,14,17,0.7)` final pin stays — animation drives container `opacity` `0→1`, not a second `backgroundColor` interpolation (so children fade together as designed quiet drift).
- **Reduced Motion is a preset, not a flag:** `UX-DR-16` + `game-architecture.md Feel Data Model` — full feel layer gated (`shake`, `bullet time`, `flash`/`particles`, `overshoot`, `1536+ glow`, **and game-over soft fade**) while haptics/sound stay (FR-30). 6.2 only gates its own fade/drift via `if(reducedMotion){setValue}` — do not add feel presets/haptics here; pin that reducedMotion gate covers only visual motion, not `expo-haptics`/`expo-audio` (asserted absence of gating in this file). `App.tsx` literal `false` until 9-4; `true` path exercised via `renderOverlay({reducedMotion:true})`.
- **No celebration (D-013):** New-record figure is already `valueRecord #E8A33D` from 6.1 (number highlight, not event) — keep it, don't add confetti/banner/`particleBurst` (Epic 8 feel). 6.2 verifies via stripped-source absence gate `/confetti|celebrat|lottie|reward/i` + `particleBurst`/`shakeMs`.
- **StrictMode / deadlock:** `App.tsx` `handleRestart` `busyRef.current=false` deadlock defense (`GameBoard.tsx:215-219` settle timer Df5) must not be touched — overlay fade never touches `busyRef`; verify `app.gameOverWiring.test.ts` stays green.
- **One-level overlay:** `DESIGN.md:251-253` — pause replaces, game-over never stacks pause; when `gameOver` true `Hud` `PauseButton` under scrim unreachable via `pointerEvents:'auto'`+`zIndex:2`; do not add conditional `Hud` hiding — stacking via `zIndex` is contract.
- **Scoped guard (CC 2026-08-23 + CC 2026-08-26 6.1 review):** Epic 6 runs before Epic 3/4 on single-lane board. **6.2 lands aesthetic death only** — soft fade + drift + reduced-motion gate + no celebration. Accelerated-lane discreet Continue (6.3/3-4) remains future — do NOT add rewarded-ad/IAP/entitlements here.
- **Baseline drift:** `50285a3` 325 pass → `70e4fb0` 396 → `7-4` 414 → `6.1` 417→440 on this `HEAD` (no regression; variance reflects `main` post-12.1 + 6.1). 8 skipped are new 6.2 scaffolds. `npx tsc --noEmit -p tsconfig.test.json` clean on this HEAD (after 7-1 `rn-stub` fix).
- **Deferred-work ledger carry:** `deferred-work.md` ~30 entries; 6.1 closed `rn-stub` waiver but left 4 low defers from 7-4 (ULP 0.6, fallback beyond ladder, mutable slices, board shallow ref) + Df5 `busyRef` + Df1-4 gate/timer/tilesRef/orientation gaps + `engine.purity` blind spots. 6.2 does not touch `preview.ts`/`src/engine`/`matchStats.ts`, so those remain open — do not re-close unless verified. Any new animation gap (e.g., `Animated.Value` leaking without `stopAnimation` on unmount) must be added as new ledger entry only if verified after code review, not pre-emptively.

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @eduardo in Slack/Discord
- Refer to `_bmad/tea/config.yaml` for workflow configuration
- Consult `.agents/skills/bmad-testarch-atdd/resources/knowledge` for testing best practices

---

**Generated by BMad TEA Agent** - 2026-08-26
