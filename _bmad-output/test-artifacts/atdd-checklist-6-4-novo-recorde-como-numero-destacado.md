---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-27'
workflowType: 'testarch-atdd'
storyId: '6.4'
storyKey: '6-4-novo-recorde-como-numero-destacado'
storyFile: '_bmad-output/implementation-artifacts/6-4-novo-recorde-como-numero-destacado.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-6-4-novo-recorde-como-numero-destacado.md'
generatedTestFiles:
  - 'triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/6-4-novo-recorde-como-numero-destacado.md'
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
  - 'triade/src/engine/core/pot.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/__tests__/ui/components/gameOverOverlay.test.ts'
  - 'triade/__tests__/ui/components/app.gameOverWiring.test.ts'
  - 'triade/__tests__/ui/components/app.restart.test.ts'
  - 'triade/__tests__/ui/ui.norolls.test.ts'
  - 'triade/__tests__/ui/ui.thinview.test.ts'
  - 'triade/__tests__/engine/engine.purity.test.ts'
  - 'triade/__tests__/game/matchScore.test.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/test-utils/rn-stub.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist - Epic 6, Story 6.4: Novo recorde como número destacado

**Date:** 2026-08-27
**Author:** Eduardo (TEA / Murat)
**Primary Test Level:** Component (host-testable RN presentational + structural App wiring via `react-test-renderer` + `tsx`) — `GameOverOverlay.tsx` thin overlay (`triade/src/ui/`) renders new-record highlight as **number in accent `#E8A33D` (D-013, UX-DR-12)** on score & best rows via `isNewRecord ? styles.valueRecord : styles.value`, plus `a11yLabel "Novo recorde"`; `App.tsx` gates via `isNewRecord(sessionStartBestRef.current, match.score)` and `handleRestart` never mutates `sessionStartBestRef`. No E2E/API/Unit required (host-testable surface, `src/engine`/`src/game/preview`/`src/game/matchStats`/`src/render`/`src/services` byte-identical by wall; `GameOverOverlay` already ships highlight from 6.1, 6.4 is verify/strengthen).

---

## Story Summary

As an Achiever, I want my new record to be visible — a highlighted number, not a celebration event — so that the milestone feels earned without cheap confetti. Game-over where `score > lane's best` highlights the new-record figure in accent `#E8A33D` on the stats card (`DESIGN.md:193, token table` `game-over-stat-row.recordColor {colors.accent}`), with no confetti/banner/animation (D-013, GDD Out of Scope), across the ceiling-tier ladder (`48→6, 96→12…` `POT_CURVE` still number only), respecting contrast (accent on surface-raised `≈6.2:1`, `DESIGN.md:218`) and color-blind shape/text encoding (E9 `fontVariant tabular-nums` + position/label + `a11yLabel "Novo recorde"`).

**As an** Achiever
**I want** my new record to be visible as a highlighted number
**So that** I feel the milestone without cheap celebration

---

## Acceptance Criteria

1. **AC1 / D-013, UX-DR-12** — Given a game over where the score exceeds the lane's best, When the stats render, Then the new-record figure is highlighted in the accent color — a number, not an event (`valueRecord #E8A33D` on `Pontuação` score and/or `Recorde` best via `isNewRecord ? styles.valueRecord : styles.value`, `valueRecord {color:'#E8A33D', fontVariant:['tabular-nums']}` pinned, `a11yLabel` includes `"Novo recorde"` when `isNewRecord`).
2. **AC2 / D-013, GDD** — And no confetti, banner, or celebration animation fires for a new record in MVP (stripped `GameOverOverlay.tsx` has no `/confetti|celebrat|lottie|reward/i` nor `particleBurst`/`shakeMs`, no `confetti`/`Lottie` import, rendered overlay has no second CTA/banner/confetti node, no `expo-haptics`/`expo-audio` gating).
3. **AC3 / D-013, GDD Out of Scope** — And the record milestone is shown as a number even across the ceiling-tier ladder (no tier-crossing celebration in MVP) — `ceilingDetector → tierForCeiling → potForTier → POT_CURVE` tiers `3→48→96→192→768→1536` still produce only number highlight when `isNewRecord`, thin-view pin `! /ceilingDetector|tierForCeiling|potForTier/.test(strippedOverlay)` and no `engine` import in overlay.
4. **AC4 / D-013, E9, DESIGN.md:218, UX-DR-17** — And the record highlight respects both theme contrast (accent on surface-raised `≈6.2:1`) and the color-blind theme's shape/text encoding (E9) — `valueRecord #E8A33D` is accent token (`DESIGN.md:153-157`), on surface `#23262D ≈7.0:1` / surface-raised `#2B2F38 ≈6.2:1` AA body, overlay card `#fff` hosts highlight as number not fill (accent/#fff ~1.8:1 intentional, WCAG via `tabular-nums` + position/label + `a11yLabel "Novo recorde"`), label `muted #8a8578` + value `text #1a1d23` unchanged, `fontVariant:['tabular-nums']` preserved on `value`/`valueRecord` per `DESIGN.md:261` facet/grain and `UX-DR-17` weakest pair `384` 4.7:1 flagged.

**AC grouping for this story (single-lane, immediate):**
- **Highlight contract (P0, ship now):** AC 1, 4 — `isNewRecord(sessionStartBestRef.current, match.score)` → `GameOverOverlay` renders record figure with `color: #E8A33D` (`DESIGN.md:193, token table`), on the `#fff` card and / or as the only accent in the stat list; color is not the sole carrier — value is also conveyed by position/shape/text per E9.
- **No-celebration pins (P0, guard):** AC 2, 3 — no `confetti|celebrat|lottie|reward|particleBurst|shakeMs` in `GameOverOverlay.tsx`; record is a number highlight, not a banner/event; ceiling-tier crossings (`48→6`, `96→12`…) produce no celebration in MVP (GDD Out of Scope, `DESIGN.md` Do's/Don'ts).

---

## Story Integration Metadata

- **Story ID:** `6.4`
- **Story Key:** `6-4-novo-recorde-como-numero-destacado`
- **Story File:** `_bmad-output/implementation-artifacts/6-4-novo-recorde-como-numero-destacado.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-6-4-novo-recorde-como-numero-destacado.md`
- **Generated Test Files:**
  - `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` (NEW — T3, 5 tests, ~365 lines, `test.skip` red-phase; canonical per story)

> No BMM `create-story` wrapper exists — `dev-story` should discover scaffolds via this checklist / story `Dev Notes`. This story is **pure-additive verification** (highlight already ships via `GameOverOverlay.tsx:71,76` `valueRecord #E8A33D` + `App.tsx:193` `isNewRecord(sessionStartBestRef.current, match.score)` from 6.1; 6.4 only tightens pins with `stripCommentsAndStrings` + `extractNamedImports` + rendered `hasStyle`/`collectStyles`/`allText` guards). `src/engine`/`src/game/preview`/`src/game/matchStats`/`src/render`/`src/services` stay byte-identical — ADR-01 + preview + services walls. `isNewRecord` gating via `sessionStartBestRef.current` (not `match.best`) stays so highlight remains correct across `"Jogar de novo"` restarts.

---

## Stack Detection

- **Config `test_stack_type`:** `auto`
- **Detected stack:** `frontend` (Expo RN — `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia` 2.6.2 + `react-native-reanimated` 4.5.1, but overlay uses `Animated` from `react-native` only via existing 6.2 fade; highlight is plain `Text` style `color #E8A33D` + `fontVariant tabular-nums` with no new animation) adapted runner is `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`) — preserves `node:test` host-testable rule since S1.1. No `playwright.config.*` / `cypress.config.*` anywhere.
- **Test framework:** `node:test` + `node:assert` + `react-test-renderer` 19.2.3 + `tsx` loader (not Playwright/Cypress). `playwright`/`cypress` not installed; `tea_use_playwright_utils:true` is **not applicable** to this host surface (scanned `__tests__` for `page.goto`/`page.locator` → 0 hits → would select API-only profile, intentionally skipped).
- **TEA flags:** `tea_use_playwright_utils: true` (skipped), `tea_use_pactjs_utils: false`, `tea_pact_mcp: none`, `tea_browser_automation: auto` (no browser surface), `tea_execution_mode: auto` → resolved `sequential` (pure host tests, subagents adapted → sequential direct write), `tea_capability_probe: true`, `test_stack_type: auto`

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (4 ACs, D-013/UX-DR-12, GDD Out of Scope, DESIGN.md:153/193/218/261, E9, UX-DR-17; 6.3 landed at `842966a` 453 pass)
- [x] Test framework configured — `triade/package.json` `test` script + `tsconfig.test.json` (`baseUrl:.`, `paths:{react-native: rn-stub}`, `ignoreDeprecations:6.0`) + `node:test` (baseline 453 pass / 0 fail on current `HEAD` after 6.3)
- [x] Development environment available (Node 26, `tsx` 4.23.12, `react-test-renderer` 19.2.3, `typescript` 6.0.3)
- [x] Existing patterns inspected — `__tests__/ui/components/gameOverOverlay.test.ts` (14 pins + soft-fade 280/80/Easing/conditional init/insets fallback → now includes `[P0] AC1 isNewRecord accent #E8A33D` pin at `:112`, scrim `rgba(12,14,17,0.7)`, `zIndex:2`, `HIT_TARGET`, `alignSelf:center`, wrapper `width:100%`, `a11yLabel "Novo recorde"`), `app.gameOverWiring.test.ts` (structural `isGameOver(game.board)` + `availablePot` once-per-render + `handleRestart` deadlock defense `busyRef=false` + `isNewRecord(sessionStartBestRef.current, match.score)` pin), `app.restart.test.ts` (6.3 5 pins: `handleRestart` body order, 9-tile determinism, single CTA, forfeited-continue die), `ui.norolls.test.ts` (`ROLL_SYMBOLS` `resolveSpawn|weightedValue|spawnTile|weightedPicker` + `pickIndex` + `Math.random` guard over `src/ui|src/render|src/services`), `ui.thinview.test.ts` (`isAllowedViewImport` `react-native`+same-dir + `RULE_LOGIC_SYMBOLS` `layoutFor|isLandscape|PORTRAIT_BAND_HEIGHT|LANDSCAPE_BAND_HEIGHT|resolveSwipeDirection`), `test-utils/helpers.ts` (`stripCommentsAndStrings` string-and-comment-aware blanking strings/templates, `extractNamedImports`, `boardWith`/`gameState`/`mulberry32`/`newGame` + `initialScore`/`isNewRecord`/`ceilingDetector`), `test-utils/rn-stub.ts` (host `View/Text/Pressable/StyleSheet` + `Animated.Value`/`timing`/`parallel` + `Easing.out(Easing.cubic)` + `translateY`), `src/ui/layout.ts` (`SAFE_MARGIN 16`), `src/ui/GameOverOverlay.tsx:71,76` (`isNewRecord ? styles.valueRecord : styles.value` on score & best) + `:148-152` (`valueRecord {color:'#E8A33D', fontVariant:['tabular-nums']}`), `App.tsx:60` (`sessionStartBestRef.current = result.best` on hydration) + `:193` (`isNewRecord(sessionStartBestRef.current, match.score)`) + `:103-110` (`handleRestart` body + `[persistedBest]` dep), `src/game/matchScore.ts:20-22` (`isNewRecord(previousBest, score) => score > previousBest`), `src/game/matchStats.ts:22` (`ceilingDetector` → `maxTile`), `game-architecture.md:757-778` (Feel preset gated, game-over soft fade), `DESIGN.md:153-157` (`components.game-over-stat-row.recordColor {colors.accent} #E8A33D`) + `218` (contrast `≈6.2:1`) + `261` (facet/grain E9)

---

## Knowledge Base Fragments Loaded

- **Core (always):** `data-factories.md` (adapted: no faker — literal `stats: {score,best,maxTile,merges,longestStreak}` fixtures + `baseProps` helper, determinism mandatory, zero-dep project; `boardWith` + `mulberry32` + `newGame` deterministic 9-tile fixtures inline where needed), `test-quality.md` (Given-When-Then, one intent per test, determinism, isolation — each `renderOverlay` builds fresh renderer, no shared board; `act()` for `onPress`/`mount`), `test-healing-patterns.md` (`test.skip()` + direct `import(SPEC)` inside helper (`SPEC='../../../src/ui/GameOverOverlay.tsx'`) plus `readFileSync` + `stripCommentsAndStrings` structural pins so the suite stays green while skipped (453 pass / 5 skipped); removing `test.skip()` makes pins GREEN on current HEAD (highlight already ships) — correct ATDD signal for verify/strengthen story: highlight + no-celebration + contrast pins stay green as regression guards, ceiling thin-view pin prevents leak), `test-levels-framework.md` (Component + structural source-pin is correct level for thin overlay + orchestrator callback; Unit/E2E/API duplicate avoided — `matchScore` unit already green 8/8, `matchStats` 10/10, `preview` frozen, engine `src/engine` byte-identical by wall)
- **Frontend conditional (applied — component surface):** `selector-resilience.md` (RN: `accessibilityLabel`/`accessibilityRole` + style markers `backgroundColor rgba(12,14,17,0.7)`, `zIndex:2`, `pointerEvents:auto`, `width: HIT_TARGET` + `alignSelf:center` + `color #E8A33D` + `fontVariant tabular-nums` — resilient to text changes; highlight rides `tabular-nums` + position/label + `a11yLabel "Novo recorde"` per E9, not fragile class), `timing-debugging.md` (post-mount timing already pinned by 6.2: `Animated.timing` after mount, `Easing.out(Easing.cubic)`, `delay:80`, `useNativeDriver:true`, cleanup `stop`/`stopAnimation`; this story adds **zero** animation — highlight has no `Animated` of its own, rides existing 280ms fade + 12→0 drift without adding duration; verifies no celebration `Animated` timing outside existing fade), `component-tdd.md` (red→green→refactor via `react-test-renderer` + `hasStyle`/`allText`/`collectStyles` copy pattern, provider isolation not needed — no `GestureHandlerRootView` inside overlay; `App.tsx` verification via structural source pin not mount)
- **Backend patterns (gates):** `test-priorities-matrix.md` (P0 = highlight number not event `isNewRecord` accent + no celebration `confetti|celebrat|lottie|reward|particleBurst|shakeMs` absence + App sessionStartBestRef gating; P1 = contrast & color-blind `tabular-nums` + ceiling ladder no banner thin-view), `ci-burn-in.md` (adapted: `git diff --stat` engine/preview/matchStats/render/services byte-identical gates + `npm test` + `tsc --noEmit` on both configs)
- **Playwright Utils (skipped):** `overview.md`, `api-request.md` etc. not loaded — no browser surface (same adaptation as 6.1/6.2/7.3 and 6.3)
- **Traditional Patterns (skipped):** `fixture-architecture.md`, `network-first.md` — no Playwright fixtures/network

---

## Generation Mode

**Chosen:** AI Generation (no browser recording). Reason: acceptance criteria are clear and the surface is a dumb presentational overlay (`GameOverOverlay.tsx`) with deterministic props (`stats`, `isNewRecord`, `onRestart`, `reducedMotion`, `insets`) plus `App.tsx` orchestrator gating (`isNewRecord(sessionStartBestRef.current, match.score)` + `handleRestart` `[persistedBest]`). All 4 ACs are host-testable: highlight ternaries + `valueRecord #E8A33D` via `hasStyle` + `collectStyles` + `allText`, a11y `"Novo recorde"` via `accessibilityLabel`, no-celebration via `stripCommentsAndStrings` `/confetti|celebrat|lottie|reward/i` + `particleBurst|shakeMs` + rendered single `Pressable` CTA (`hasStyle pointerEvents auto`) plus `availablePot` thin-view already pinned, contrast/color-blind via `fontVariant tabular-nums` + muted/text tokens `#8a8578/#1a1d23`, ceiling ladder via structural thin-view `!ceilingDetector|tierForCeiling|potForTier` + runtime loop over `maxTile` tiers `3→1536` still only `isNewRecord` gates accent. No browser interaction needs live verification; the 6.4 highlight is host-testable via `react-test-renderer` + `rn-stub` (same posture as 6.1/6.2 overlay + `PreviewCard`/`Hud` in 7.2/7.3 and `app.gameOverWiring.test.ts`/`app.restart.test.ts`). `tea_browser_automation: auto` finds no web surface to record; recording is dead weight. `detected_stack: frontend` would allow recording, but overlay has no DOM and `rn-stub` provides headless `Animated.View` if needed — recording would add no signal. No new animation beyond 6.2 fade; highlight is a number style `color #E8A33D`.

---

## Test Strategy

| AC | Scenario | Level | Priority | File | Test Names |
|----|----------|-------|----------|------|------------|
| AC1 | Highlight is number not event — `isNewRecord true` renders `valueRecord #E8A33D` tabular-nums 500 on score & best rows, `false` renders no accent on value rows; `a11yLabel` includes `"Novo recorde"` only when true; stripped source has `isNewRecord ? styles.valueRecord : styles.value` ×2 + `valueRecord {color:'#E8A33D'}` + `fontVariant tabular-nums` (D-013, UX-DR-12, DESIGN.md:193, token table `game-over-stat-row.recordColor {colors.accent}`) | Component (rendered + structural) | P0 | `gameOverOverlay.recordHighlight.test.ts` | `[P0] AC1 highlight is number not event — isNewRecord true renders valueRecord #E8A33D, false renders no accent` |
| AC2/AC3 | No celebration — stripped `GameOverOverlay.tsx` has no `/confetti|celebrat|lottie|reward/i` nor `particleBurst`/`shakeMs`, no `Confetti`/`Lottie`/`congrat`/`banner` as event, no `expo-haptics`/`expo-audio` gating, rendered overlay has exactly one `Pressable` `Jogar de novo` (no second CTA `Continuar`/`Novo recorde!` banner, no `Confetti` composite node) — record stays number across both `isNewRecord` states (D-013, GDD Out of Scope, DESIGN.md Do's/Don'ts) | Component (rendered + structural) | P0 | `gameOverOverlay.recordHighlight.test.ts` | `[P0] AC2/AC3 no celebration — stripped source has no confetti/celebrat/lottie/reward/particleBurst/shakeMs and rendered overlay has no second CTA/banner/confetti node` |
| AC4 | Contrast & color-blind — `valueRecord #E8A33D` token + `fontVariant ['tabular-nums']` preserved (≥2× value+valueRecord), muted `label #8a8578` + text `value #1a1d23` unchanged, overlay card `#fff`, CTA dark-ink `#1C1206` (~8.6:1) — accent on surface `≈7.0:1` / surface-raised `≈6.2:1` AA body (DESIGN.md:218), accent/#fff ~1.8:1 intentional low — WCAG AA carried by `tabular-nums` + position/label + `a11yLabel "Novo recorde"` (E9, DESIGN.md:261 facet/grain, UX-DR-17 `384` 4.7:1) | Component (rendered + structural) | P1 | `gameOverOverlay.recordHighlight.test.ts` | `[P1] AC4 contrast & color-blind — valueRecord #E8A33D token + tabular-nums preserved, muted/text tokens unchanged, shape/text beyond color` |
| AC3 | Ceiling ladder produces no celebration — `maxTile` stepping `3→6→12→24→48→96→192→384→768→1536` via `ceilingDetector/tierForCeiling/potForTier/POT_CURVE` still only `isNewRecord` gates accent, no extra banner; thin-view `extractNamedImports` every `! /engine/` and `! /ceilingDetector|tierForCeiling|potForTier/.test(strippedOverlay)` (engine `ceilingDetector` lives in `App.tsx` + `matchStats.ts`, overlay only renders `stats.maxTile` prop) | Component (rendered + structural) | P1 | `gameOverOverlay.recordHighlight.test.ts` | `[P1] AC3 ceiling ladder produces no celebration — increasing ceilingDetector still only isNewRecord highlight, thin-view no engine import` |
| AC1/T2 | App wiring sessionStartBestRef gating — `App.tsx` `isNewRecord(sessionStartBestRef.current, match.score)` at `:193` (not `match.best`), `sessionStartBestRef.current = result.best` seeded only at hydration (`:60`), `handleRestart` body never writes `sessionStartBestRef.current` (`! /sessionStartBestRef\.current\s*=\s*persistedBest/.test(handleRestartBody)` **and** `! /sessionStartBestRef\.current\s*=\s*match\.best/.test`) with dep `[persistedBest]` only, body order `newGame→setGame→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats(s.board))→busyRef=false` stays — `isNewRecord` logic `score > previousBest` gated on stored best (matchScore.test.ts:58-65 pin: `isNewRecord(stored, score) true` vs `isNewRecord(liveBest, score) false`) | Component (structural + runtime) | P0 | `gameOverOverlay.recordHighlight.test.ts` | `[P0] AC1/T2 App wiring sessionStartBestRef gating — isNewRecord(sessionStartBestRef.current, match.score) and handleRestart never writes sessionStartBestRef` |

**No duplicate coverage** across levels — all 6.4 scenarios are Component (thin-view + structural App wiring). E2E is intentionally absent (highlight is a style + a11y token on a frozen overlay, not a browser journey; simulator-manual covers visual highlight as in 1.6/6.1). Unit is absent (no new pure function; `matchScore.isNewRecord` unit already green 8/8 at `matchScore.test.ts:58-65`, `matchStats` 10/10, `preview` frozen, loop not touched). App wiring (`App.tsx` `isNewRecord` + `handleRestart` + `availablePot` fan-out + `busyRef` deadlock + `reducedMotion={false}`) is verified via structural pins plus existing `app.gameOverWiring.test.ts` (4/4) + `app.restart.test.ts` (5/5) staying green and `gameOverOverlay.test.ts` (14/14 after 6.3) staying green (scrim `rgba(12,14,17,0.7)`, `zIndex:2`, `HIT_TARGET`, `alignSelf:center`, wrapper `width:100%`, insets fallback `SAFE_MARGIN 16`, fade `280`/`80`/`Easing.out(Easing.cubic)`/`useNativeDriver:true`/`stop`/`stopAnimation`×3, `a11yLabel "Novo recorde"` when `isNewRecord`, no celebration). Preview/Hud/Board/Engine purity walls stay identical — tested once at Unit/Component, not again.

**Red Phase Requirements:** `GameOverOverlay.tsx` and `App.tsx` already ship highlight from 6.1 on `3218d23`/`842966a` (453 pass). Scaffolds are **designated RED for verification but currently GREEN on activation** — `valueRecord #E8A33D` + `isNewRecord` ternaries + `a11yLabel "Novo recorde"` + `sessionStartBestRef` gating all present on `HEAD`, so all 5 tests pass when `test.skip()` is removed (expected GREEN for verify/strengthen story before enhancement). When intentionally broken (e.g., remove `valueRecord` color or add `confetti`, or change `isNewRecord(match.best, match.score)` leak, or add `sessionStartBestRef.current = persistedBest` in `handleRestart`), the relevant pin fails RED — e.g., `must contain 'isNewRecord ? styles.valueRecord : styles.value'` or `must not contain confetti` or `must contain 'sessionStartBestRef.current = result.best'` / `must NOT set sessionStartBestRef.current = persistedBest`. All are **CI-green while skipped** (`npm test` 453 pass / 5 skipped). This is the correct ATDD signal for a verify/strengthen story: the highlight + no-celebration + contrast + ceiling thin-view + sessionStartBestRef pins are all green verification guards that will turn RED if a future change breaks the D-013 number-not-event contract. No placeholder assertions; every test asserts EXPECTED behavior per `6-4-novo-recorde-como-numero-destacado.md` T1–T3.

---

## Red-Phase Test Scaffolds Created

> Framework note: this project uses **node:test + tsx** (not Playwright/Cypress). Scaffolds use `test.skip()` with direct `import(SPEC)` inside helper (`SPEC='../../../src/ui/GameOverOverlay.tsx'`) plus `readFileSync` + `stripCommentsAndStrings` structural pins so the suite stays green while skipped (453 pass / 5 skipped); removing `test.skip()` makes all 5 pins GREEN on current `HEAD` (highlight already ships from 6.1), then all 5 stay GREEN after any strengthen (verify story). Same pattern as 6.3 `test.skip()` + variable-specifier `import(SPEC)` inside skipped callback — adapted for a verify/strengthen story where the functional contract already exists and tighter pins are the additive change. No `playwright/utils` or `pact` needed.

### Component Tests — `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` (NEW, 5 tests, ~365 lines)

**File:** `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` (365 lines)

- ✅ **Test:** `[P0] AC1 highlight is number not event — isNewRecord true renders valueRecord #E8A33D, false renders no accent`
  - **Status:** GREEN verification (when activated, already ships — `isNewRecord ? styles.valueRecord : styles.value` ×2 on `Pontuação` + `Recorde` rows, `valueRecord {color:'#E8A33D', fontVariant:['tabular-nums']}` pinned, `allText` contains score/best tokens, `hasStyle(on, {color:'#E8A33D'})` true, off has no `tabular-nums 500` accent on stat rows, `a11yLabel` includes `"Novo recorde"` only when true). When skipped, suite stays 453 pass / 5 skipped. Stays GREEN after strengthen — it is the highlight regression gate for AC1/D-013/UX-DR-12 + AC4.
  - **Verifies:** AC1 (FR-25/26/27 `UX-DR-12` stats immediately, `S6.4` `UX-DR-25` elegant fall) — highlight is a **number, not an event** (`D-013`, `EXPERIENCE.md:73/84` `game-over overlay stat rows` + `85` `new record is "Novo recorde" — a highlighted number (D-013)` + `199` `Théo's new-record flow highlighted in {colors.accent} on the stats — no confetti`; `DESIGN.md:153,279` `game-over-stat-row.recordColor {colors.accent} #E8A33D`). Thin-view: overlay renders `MatchStats`/`MatchScore` props, never `Board`; `valueRecord` is `src/ui` chrome, not `src/feel` worklet. If tightening to single-field highlight (only `score`), update `gameOverOverlay.test.ts:112` pin `hasStyle(on,{color:'#E8A33D'})` and document single-field choice in review.

- ✅ **Test:** `[P0] AC2/AC3 no celebration — stripped source has no confetti/celebrat/lottie/reward/particleBurst/shakeMs and rendered overlay has no second CTA/banner/confetti node`
  - **Status:** GREEN verification (when activated, already ships — stripped `GameOverOverlay.tsx` has no `/confetti|celebrat|lottie|reward/i` nor `particleBurst|shakeMs`, no `Confetti`/`Lottie` import, no `congrat`/`banner` event, no `expo-haptics`/`expo-audio`, no `shake|bounce` animation beyond existing 280/80 fade, rendered overlay has exactly one `Pressable` `Jogar de novo` `accessibilityRole button` and zero `Continuar`/`Novo recorde!` banner or `Confetti` composite node in both `isNewRecord` states). When skipped, suite stays 453 pass / 5 skipped. After T1/T2 this test stays GREEN — it is the no-celebration guard for AC2/3 (D-013, GDD Out of Scope celebration deferred to v2, `DESIGN.md` Do's/Don'ts `Highlight a new record as a number | Confetti…`).
  - **Verifies:** AC2/AC3 `D-013`, `GDD Out of Scope 289-307` `celebration/named tiers 48 Basalto deferred`, `DESIGN.md` Do's/Don'ts, `EXPERIENCE.md:92` `No celebration in MVP` + `112` `Reduced Motion` gated set. Verifies stripped source `stripCommentsAndStrings` has no celebration strings and rendered overlay has no second CTA/banner/confetti node (record is number highlight, not event; `Animated` celebration timing outside existing `FADE_MS 280+delay 80` fade/drift is forbidden; `expo-haptics`/`expo-audio` not gated here — Epic 8 feel owned elsewhere).

- ✅ **Test:** `[P1] AC4 contrast & color-blind — valueRecord #E8A33D token + tabular-nums preserved, muted/text tokens unchanged, shape/text beyond color`
  - **Status:** GREEN verification — `valueRecord {color:'#E8A33D'}` matches `DESIGN.md` `components.game-over-stat-row.recordColor {colors.accent}` (same accent as `PreviewCard` value ink `20pt` + `leaderboard-tab activeFill` `#E8A33D` dark-ink `8.6:1`), `fontVariant:['tabular-nums']` on `value`/`valueRecord` ≥2×, muted label `#8a8578` + value text `#1a1d23` unchanged, overlay card `#fff` + CTA dark-ink `#1C1206` pinned, `hasStyle(on,{color:'#E8A33D'})` + `collectStyles` has `color:'#8a8578'`/`color:'#1a1d23'` + `fontVariant tabular-nums`. This pin is already GREEN and stays GREEN as contrast + E9 guard (accent on surface `#23262D ≈7.0:1` / surface-raised `#2B2F38 ≈6.2:1` `DESIGN.md:218` AA body; the `#fff` card hosts highlight as number not fill — accent/`#fff` ~1.8:1 intentional, WCAG AA carried by `tabular-nums`+position/label+`a11yLabel "Novo recorde"`, not accent/`#fff` — never swap to fill/button).
  - **Verifies:** AC4 `E9` + `DESIGN.md:218` contrast + `261` facet/grain + `UX-DR-17` weakest pair `384` 4.7:1 flagged, `FR-31` merges by shape+text beyond color, `UX-DR-19` chamfered facets, `UX-DR-2` announcement `New record: X` via `a11yLabel`, `UX-DR-18` numerals `13/700` 4-digit `9/700` 6-digit. Keep `fontVariant:['tabular-nums']` on `value`/`valueRecord` (pinned). No new color token; verify `valueRecord` stays `#E8A33D` and `fontVariant:['tabular-nums']` stays (E9 shape/text).

- ✅ **Test:** `[P1] AC3 ceiling ladder produces no celebration — increasing ceilingDetector still only isNewRecord highlight, thin-view no engine import`
  - **Status:** GREEN verification — `maxTile` stepping `3→6→12→24→48→96→192→384→768→1536` (via `ceilingDetector`/`tierForCeiling`/`potForTier`/`POT_CURVE` ladder) still only `isNewRecord` gates accent, no extra banner node, no `Confetti`, exactly one CTA; thin-view `extractNamedImports` every not `engine` and `! /ceilingDetector|tierForCeiling|potForTier/.test(strippedOverlay)` prevents rule-logic leak into chrome (`ui.thinview` + `ui.norolls` `pickIndex` + `Math.random` guards). This pin is already GREEN and stays GREEN after strengthen — it is the tier-crossing no-celebration guard (GDD `192-768 Out of Scope` celebration deferred to v2, `DESIGN.md` Do's/Don'ts, `EXPERIENCE.md:73/92` + `199` Théo's flow).
  - **Verifies:** AC3 ceiling-tier ladder (`48→6`, `96→12`… `768→96`, `1536→...`) produces no milestone banner — `Merges`, `longestStreak`, `maxTile` stay numbers (`EXPERIENCE.md:73` stats rows + `92` No celebration; GDD Out of Scope). `ceilingDetector` lives in `App.tsx` + `matchStats.ts` (`App.tsx:152` `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once after `if(!ready)` shared by both lane previews), overlay only renders `stats.maxTile` prop — thin-view pin `extractNamedImports(GameOverOverlay.tsx).every(r=>! /engine/.test(r.specifier))` **and** `! /ceilingDetector|tierForCeiling|potForTier/.test(strippedOverlay)` prevents roll-symbol leak. Also guards `Math.random` + `ROLL_SYMBOLS` (`resolveSpawn|weightedValue|spawnTile|weightedPicker` via `ui.norolls.test.ts:27` + `pickIndex`) in overlay.

- ✅ **Test:** `[P0] AC1/T2 App wiring sessionStartBestRef gating — isNewRecord(sessionStartBestRef.current, match.score) and handleRestart never writes sessionStartBestRef`
  - **Status:** GREEN verification (when activated, already ships — `App.tsx:193` `isNewRecord(sessionStartBestRef.current, match.score)` + `sessionStartBestRef.current = result.best` seeded only at hydration `:60` with `persistedBest` state driving `initialScore`/`handleRestart` dep `[persistedBest]`, `handleRestart` body order `newGame→setGame→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats(s.board))→busyRef=false` with `! /sessionStartBestRef\.current\s*=\s*persistedBest/.test(handleRestartBody)` **and** `! /sessionStartBestRef\.current\s*=\s*match\.best/.test` — any write inside `handleRestart` would hide record after first restart (`matchScore.test.ts:58-65` pin: `isNewRecord(stored 100,150) true` vs `isNewRecord(liveBest 150,150) false`)). When skipped, suite stays 453 pass / 5 skipped. After T2 verify, stays GREEN — it is the session-start best gating regression gate.
  - **Verifies:** AC1/T2 `matchScore.ts:20-22` `isNewRecord(previousBest, score) => score > previousBest` gated on `sessionStartBestRef.current` (persisted Best at hydration, never `current.best`), never `match.best` leak; `handleRestart` must NOT write `sessionStartBestRef` (gating preserves highlight across restarts; `match.best` would hide record after first restart when `match.best` already equals record, only `sessionStartBestRef` still knows pre-session best). Also pins `handleRestart` dep `[persistedBest]` only, never `match.best` or `sessionStartBestRef`, and no `confetti`/`Animated` for record.

---

## Data Factories Created

None — pure presentational overlay with literal `stats: {score,best,maxTile,merges,longestStreak}` on every `renderOverlay` + `boardWith`/`mulberry32`/`newGame` deterministic 9-tile fixtures inline where needed (no faker per zero-dep project rule). Each test builds its own props via `baseProps(overrides)` local helper (mirrors `gameOverOverlay.test.ts:62-80`). No DB/state lifecycle. Runtime ceiling ladder pins use `maxTile` tier stepping `3→1536` literal ladder and `isNewRecord` pure function — no faker.

---

## Fixtures Created

None (reuses existing `test-utils/helpers.ts` + `test-utils/rn-stub.ts` headless `View/Text/Pressable/StyleSheet` + `Animated.Value`/`timing`/`parallel` + `Easing` + `Animated.View` `opacity`/`translateY`). `gameOverOverlay.recordHighlight.test.ts` reuses `allText`/`hasStyle`/`collectStyles` copy-don't-import pattern of `gameOverOverlay.test.ts` + `hud.test.ts`/`previewCard.test.ts` (copy, don't import across test files per story T4). Structural pins use `readFileSync` + `stripCommentsAndStrings` + `extractNamedImports` (string-and-comment-and-template aware, blanking string/template contents while preserving `${}` interpolations) — no mount of full `App` needed (same posture as `app.gameOverWiring.test.ts` + `app.restart.test.ts`). Auto-cleanup fixtures would be dead weight. Each `renderOverlay` builds a fresh `TestRenderer` — no module-level shared renderer (isolation per `test-quality.md`). `App.tsx` `handleRestart` is never mounted in tests — its body is pinned via `stripCommentsAndStrings` ordering + runtime `isNewRecord` invariants (host-testable pure function).

---

## Mock Requirements

None — no external services. `loadBest`/`saveBest` (MMKV/SecureStore) and `preloadAssets` are **not** under test in 6.4; persistence wiring (`persistedBest` → `initialScore` → `match.best` → `GameOverOverlay stats` + `isNewRecord(sessionStartBestRef.current, match.score)`) is verified via existing `app.gameOverWiring.test.ts` staying green (4/4) and `app.restart.test.ts` (5/5). `expo-haptics`/`expo-audio`/`react-native-purchases`/`react-native-google-mobile-ads`/`expo-secure-store` beyond `settingsStore` are intentionally absent from `App.tsx` + `GameOverOverlay.tsx` until Epic 4/8 — verified by monetization-wall stripped-source gate (`ui.norolls.test.ts:27` style) and `no celebration` pin in this file. `Animated`/`Easing` come from `react-native` (already in `rn-stub` after 6.2, no new dep). No `SecureStore` lane memory, no `MMKV` lane memory, no `LaneProfile`/`LaneSelect` until Epic 3. No new mock server, no `intercept-network-call`, no `Pact`.

---

## Required data-testid Attributes

RN overlay uses `accessibilityLabel`/`accessibilityRole` + style markers (not `data-testid`) per prior component pattern (`PreviewCard`/`Hud`/`GameOverOverlay`). Required for test stability (already satisfied by 6.1/6.2/6.3, pinned for 6.4 highlight — no new attr):

### GameOverOverlay (preserved + 6.4 highlight, D-013 number not event)

- `accessibilityRole="alert"` + `accessibilityLabel` containing `"Game over. Score {score}, best {best}, max tile {maxTile}, merges {merges}, longest streak {longestStreak}"` (+ `"Novo recorde"` suffix when `isNewRecord` true via `a11yLabel = `Game over. Score ...` + (isNewRecord ? ' Novo recorde' : '')` at `GameOverOverlay.tsx:22-24`) — inner `View` child of `Animated.View content` (6.1 a11y fix, alert sibling to CTA)
- `accessibilityRole="button"` + `accessibilityLabel="Jogar de novo"` — `Pressable` CTA (`width: HIT_TARGET`/`height: HIT_TARGET` directly, thinview gate `ui.thinview.test.ts:39-40`, `alignSelf:'center'`, `backgroundColor #E8A33D` dark-ink `#1C1206` ~8.6:1, `fontVariant tabular-nums`, `// TODO 5.4: t('gameOver.restart')` next to literal)
- `accessibilityViewIsModal` + `pointerEvents="auto"` + `backgroundColor: 'rgba(12,14,17,0.7)'` + `position:'absolute', top:0,left:0,right:0,bottom:0, zIndex:2, elevation:2` — outer `Animated.View` scrim (now animated `opacity 0→1` post-mount in 6.2 but final `rgba` pinned via `hasStyle`, scrim `pointerEvents auto` blocks `Gesture.Pan`)
- `width: '100%' + maxWidth:420 + alignSelf:'center'` + `opacity: Animated.Value` (inner content `delay:80` `translateY 12→0`) — inner `Animated.View` wrapper (6.2 wrapper fix `width:'100%'` so `content width:'100%'` resolves against `100%` not `auto`)
- `paddingTop: (insets?.top ?? 0)+SAFE_MARGIN` (16) on all edges via outer `Animated.View` style array (preserved from 6.1 via `insets` required prop + `?.` fallback for bare `as any` tests at `gameOverOverlay.test.ts:252`)
- `onPress={onRestart}` direct on `Pressable` — no intermediary, no `Alert`/`confirm(`/`Dialog`/`disabled`, one tap immediately calls `onRestart` (no forced wait, hittable through 280ms fade `pointerEvents auto` never `none` — `UX-DR-25`)
- **6.4 highlight (AC1, D-013): `isNewRecord ? styles.valueRecord : styles.value` on `Pontuação` score row (`:71`) and `Recorde` best row (`:76`)** — `styles.value {color:'#1a1d23', fontSize:17, fontWeight:'500', fontVariant:['tabular-nums']}` + `styles.valueRecord {color:'#E8A33D', fontSize:17, fontWeight:'500', fontVariant:['tabular-nums']}` — accent `#E8A33D` is `components.game-over-stat-row.recordColor {colors.accent}` + `components.button activeFill` same accent (`DESIGN.md:153-157, 267`)
- **Clean-only (AC2/3): exactly one `Pressable` CTA — no second `Continuar`/`onContinue`/`continueRemaining`/`rewardedAd`/`IAP`/`Confetti`/`Lottie` node** (forward-compat pin, verify story: highlight is number, not celebration event)

### App.tsx (orchestrator, structural isNewRecord gating — no new data-testid)

- `isNewRecord={isNewRecord(sessionStartBestRef.current, match.score)}` on `<GameOverOverlay … reducedMotion={false} insets={insets} />` at `zIndex:2` over `Hud zIndex:1` with scrim `pointerEvents:'auto'` blocking `Gesture.Pan` (`App.tsx:193`) — `PauseButton` unreachable under scrim; `gameOver=isGameOver(game.board)` on committed board + `{gameOver ? <GameOverOverlay .../> : null}` sibling to unconditional `GameBoard`/`Hud`
- `sessionStartBestRef.current = result.best` seeded only at hydration (`App.tsx:60` after `loadBest()`), never in `handleRestart` — `handleRestart` body must be `const s = newGame(rngRef.current); setGame(s); setMoveResult(null); setMatch(initialScore(persistedBest)); setMatchStats(initialStats(s.board)); busyRef.current=false` with dep `[persistedBest]` only (6.3 Pin + 6.4 strengthen: `! /sessionStartBestRef\.current\s*=\s*persistedBest/` **and** `! /sessionStartBestRef\.current\s*=\s*match\.best/.test(strippedHandle)` inside `handleRestart`)

**Implementation Example (6.4 highlight — GameOverOverlay ternaries + valueRecord + a11y, verify):**

```tsx
// triade/src/ui/GameOverOverlay.tsx (verify/strengthen — highlight already ships from 6.1; 6.4 pins tighten)
const a11yLabel =
  `Game over. Score ${stats.score}, best ${stats.best}, max tile ${stats.maxTile}, merges ${stats.merges}, longest streak ${stats.longestStreak}` +
  (isNewRecord ? ' Novo recorde' : ''); // AC1/4 — "Novo recorde" only when true (UX-DR-2, E9 shape/text beyond color)

<View accessible accessibilityRole="alert" accessibilityLabel={a11yLabel}>
  <View style={styles.row}>
    <Text style={styles.label}>Pontuação</Text>{/* TODO 5.4: t('gameOver.score') */}
    <Text style={isNewRecord ? styles.valueRecord : styles.value}>{String(stats.score)}</Text> {/* :71 Pontuação row — accent when isNewRecord */}
  </View>
  <View style={styles.row}>
    <Text style={styles.label}>Recorde</Text>{/* TODO 5.4: t('gameOver.best') */}
    <Text style={isNewRecord ? styles.valueRecord : styles.value}>{String(stats.best)}</Text> {/* :76 Recorde row — accent when isNewRecord */}
  </View>
  {/* Maior peça / Fusões / Maior sequência — always styles.value (never valueRecord) */}
</View>
// ...
const styles = StyleSheet.create({
  label: { color: '#8a8578', fontSize: 13, fontWeight: '500' },
  value: { color: '#1a1d23', fontSize: 17, fontWeight: '500', fontVariant: ['tabular-nums'] },
  valueRecord: { color: '#E8A33D', fontSize: 17, fontWeight: '500', fontVariant: ['tabular-nums'] }, // DESIGN.md:153 recordColor {colors.accent}
  cta: { width: HIT_TARGET, height: HIT_TARGET, backgroundColor: '#E8A33D', borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 12 },
  ctaLabel: { color: '#1C1206', fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
```

**Implementation Example (6.4 App wiring — sessionStartBestRef gating, verify):**

```tsx
// triade/App.tsx (verify — seeded at hydration, never in handleRestart; isNewRecord gated on session-start best)
useEffect(() => {
  void preloadAssets();
  let cancelled = false;
  (async () => {
    const result = await loadBest();
    if (cancelled) return;
    hydrationOkRef.current = result.ok;
    sessionStartBestRef.current = result.best; // :60 seeded only at hydration, never in handleRestart (6.4 guard: ! /sessionStartBestRef\.current\s*=\s*persistedBest/.test(handleRestartBody))
    setPersistedBest(result.best);
    setMatch(initialScore(result.best));
    setReady(true);
  })();
  return () => { cancelled = true; };
}, []);

const handleRestart = useCallback(() => {
  // AC6/7: forfeited continue dies with game-over — any per-match continue budget is discarded here (ADR-02)
  const s = newGame(rngRef.current);
  setGame(s);
  setMoveResult(null);
  setMatch(initialScore(persistedBest));
  setMatchStats(initialStats(s.board));
  busyRef.current = false;
}, [persistedBest]); // 6.4 guard: dep [persistedBest] only, never match.best/sessionStartBestRef; body never writes sessionStartBestRef.current

// ...
{gameOver ? (
  <GameOverOverlay
    stats={{ score: match.score, best: match.best, maxTile: matchStats.maxTile, merges: matchStats.merges, longestStreak: matchStats.longestStreak }}
    isNewRecord={isNewRecord(sessionStartBestRef.current, match.score)} // :193 session-start best gating (not match.best — prevents hide after first restart per matchScore.test.ts:58-65)
    onRestart={handleRestart}
    reducedMotion={false}
    insets={insets}
  />
) : null}
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
// hasStyle/collectStyles/allText copied from hud.test.ts / previewCard.test.ts — copy, don't cross-import per T4.
// Source pins use `stripCommentsAndStrings` + `extractNamedImports` (string/template-aware, blanking contents) — no full App mount.
```

---

## Implementation Checklist

### Test: `[P0] AC1 highlight is number not event — isNewRecord true renders valueRecord #E8A33D, false renders no accent` — `gameOverOverlay.recordHighlight.test.ts` #1

**File:** `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` (rendered + structural, P0 critical path highlight contract D-013/UX-DR-12)

**Tasks to make this test pass:**

- [ ] Verify/strengthen `triade/src/ui/GameOverOverlay.tsx` new-record highlight contract (story T1 table Must contain / Must NOT contain): `isNewRecord ? styles.valueRecord : styles.value` applied to at least one of the two record-adjacent rows (`Pontuação` score `:71` and/or `Recorde` best `:76`) via existing `valueRecord` token; `styles.valueRecord: { color: '#E8A33D', fontSize:17, fontWeight:'500', fontVariant:['tabular-nums'] }` pinned (`DESIGN.md:193, token table` `components.game-over-stat-row.recordColor {colors.accent} #E8A33D`); `a11yLabel` includes `"Novo recorde"` when `isNewRecord` (`:22-24` `a11yLabel = `Game over. Score ...` + (isNewRecord ? ' Novo recorde' : '')`). Keep highlight as **number only** — no second CTA, no banner, no confetti view, no `isNewRecord && <Confetti>` branch. The highlight already highlights **both** `score` and `best` when `isNewRecord` (lines 71,76) — verify this stays; alternatives that highlight only `score` would break existing `gameOverOverlay.test.ts:112` pin `hasStyle(on,{color:'#E8A33D'})`; if tightening to single-field, update that pin and document choice in review.
- [ ] Keep conditional `Animated.Value` init for reduced motion from 6.2 (`scrimOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0))`, `contentOpacity`/`contentY` same pattern `12→0`) — highlight has no animation of its own; it rides the existing `280ms` fade + `12→0` drift without adding duration.
- [ ] Preserve outer `Animated.View pointerEvents="auto" accessibilityViewIsModal` + inner `View accessible alert` grouping only stats (D1 fix from 6.1 review) with CTA sibling — VoiceOver grouping already correct; no change to `pointerEvents` needed for highlight.
- [ ] Keep `insets: {top,bottom,left,right}` required with defensive `insets?.top ?? 0 + SAFE_MARGIN` fallback (`src/ui/layout.ts:7-9` `SAFE_MARGIN 16`) on outer padding — highlight must not break safe-margin padding.
- [ ] No-celebration already pinned in sibling test, but keep `valueRecord` accent `#E8A33D` only via `fontVariant tabular-nums 500` on value rows (CTA accent `#E8A33D` 700 is allowed, not on value rows when `isNewRecord false`). Verify `isNewRecord=false` renders no `tabular-nums 500` accent on stat rows, `isNewRecord=true` renders `hasStyle(on,{color:'#E8A33D'})` true + `allText` contains `score`/`best` tokens, stripped source contains `isNewRecord ? styles.valueRecord : styles.value` ×2 + `valueRecord: { color: '#E8A33D' }`.
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts --test-name-pattern "AC1 highlight is number"` (inside `triade/`) — remove `test.skip()` for that case first, confirm GREEN (verification: highlight already ships from 6.1 on `842966a`) vs expected RED if `valueRecord` color removed or ternary missing (then fix source `valueRecord #E8A33D` + ternaries)
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hour

---

### Test: `[P0] AC2/AC3 no celebration — stripped source has no confetti/celebrat/lottie/reward/particleBurst/shakeMs and rendered overlay has no second CTA/banner/confetti node` — `gameOverOverlay.recordHighlight.test.ts` #2

**File:** `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` (rendered + structural, P0 guard D-013 no celebration)

**Tasks to make this test pass:**

- [ ] Verify stripped `triade/src/ui/GameOverOverlay.tsx` (`stripCommentsAndStrings`) has no `/confetti|celebrat|lottie|reward/i` and no `particleBurst`/`shakeMs` (Epic 8 feel `FeelPreset` `haptic light/medium/heavy` + `shakeMs 2/5 capped 8` + `particleBurst` + `overshootMs` + `flash` `game-architecture.md:757-778`, `UX-DR-16`); also no `confetti` package import, no `react-native-confetti-cannon`, no `Confetti`/`Lottie`/`congrat`/`banner` as new-record event; `Animated` celebration timing outside existing `FADE_MS 280`+`delay 80` fade/drift forbidden; `expo-haptics`/`expo-audio` never imported to gate haptics/sound (Epic 8 owns them, keep enabled). This is the `Must NOT contain` column of story T1 — `confetti`/`celebrat`/`lottie`/`reward`/`particleBurst`/`shakeMs`/`Confetti`/`Lottie`/`congrat`/`banner` as new-record event; `Animated` celebration timing outside existing `FADE_MS 280+delay 80` fade/drift; `expo-haptics`/`expo-audio` gate.
- [ ] Verify rendered overlay has no second CTA/banner/confetti node — `renderer.root.findAll(n=>n.props?.accessibilityLabel==='Continuar' || String(n.props?.children).includes('Novo recorde!')).length===0` beyond a11y `"Novo recorde"` token, single `Pressable` `accessibilityRole button` `Jogar de novo` only (`buttons.length===1`), no `Confetti` composite node (`displayName` includes `confetti` length 0). Pin `src` has no `import ... 'react-native-confetti'` etc. (stripped source gate, not rendered-node count for `Dialog` per 6.3 review carry AA2 fix: `assert.ok(!stripped.includes('Dialog'))` + separate `accessibilityViewIsModal` pin).
- [ ] Keep for `isNewRecord false` also no `Continuar` — both states remain single CTA. This guards `S6.4` `S6.4` death as elegant fall `EXPERIENCE.md:167` same care as big merge, `168` gated set, `86` State Patterns new record is highlighted number not event.
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts --test-name-pattern "AC2/AC3 no celebration"` — remove `test.skip()` for that case first, confirm GREEN (verification: no celebration already on `842966a` `gameOverOverlay.test.ts:392` `! /confetti|celebrat|lottie|reward/`), expected RED if `confetti` added (then remove celebration import/view)
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hour

---

### Test: `[P1] AC4 contrast & color-blind — valueRecord #E8A33D token + tabular-nums preserved, muted/text tokens unchanged, shape/text beyond color` — `gameOverOverlay.recordHighlight.test.ts` #3

**File:** `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` (rendered + structural, P1 contrast & E9)

**Tasks to make this test pass:**

- [ ] Verify `triade/src/ui/GameOverOverlay.tsx` source pin `valueRecord: { color: '#E8A33D' }` matches `DESIGN.md` `components.game-over-stat-row.recordColor {colors.accent}` (`DESIGN.md:153-157` + `267` `components.button` same accent `leaderboard-tab activeFill` dark-ink `8.6:1`); accent on surface `#23262D ≈7.0:1`, on surface-raised `#2B2F38 ≈6.2:1` (`DESIGN.md:218`) both AA body; overlay card is `#fff` (`content #fff` `GameOverOverlay.tsx:126`) so accent on `#fff` is low contrast (~1.8:1) — **D-013 intentional: highlight is number-only, not fill; WCAG AA is carried by `tabular-nums` + position/label + `a11yLabel "Novo recorde"`, not by contrast accent/#fff — never swap to fill/button** — the stat label/value carriers are already pinned (`label #8a8578`, `value #1a1d23`) and `tabular-nums` preserves shape/text beyond color per E9 (`DESIGN.md:261` facet/grain, `UX-DR-17` weakest pair `384` deep emerald 4.7:1 flagged). No new color token needed; verify `valueRecord` stays `#E8A33D` and `fontVariant:['tabular-nums']` stays ≥2× (E9 shape/text) — source pin `valueRecord: { color: '#E8A33D' }` matches token table.
- [ ] Verify muted `label #8a8578` + text `value #1a1d23` unchanged on both `isNewRecord` states via `collectStyles` + rendered `fontVariant tabular-nums` on `value`/`valueRecord`; also verify overlay card `#fff` and CTA dark-ink `#1C1206` pinned (button `accent #E8A33D` dark-ink `~8.6:1` is CTA only). Token stays `#E8A33D` (same as `PreviewCard` value ink `20pt` + `leaderboard-tab`).
- [ ] Keep thin-view / purity guard: overlay allowed imports `react` + `react-native` (`Animated`/`Easing` same specifier) + `./PauseButton` (`HIT_TARGET`) + `../ui/layout` (`SAFE_MARGIN`) — never `../engine/**` roll symbols (`resolveSpawn|weightedValue|spawnTile|weightedPicker` via `ui.norolls.test.ts:27` — `pickIndex` also forbidden) nor `Math.random` nor `layoutFor|isLandscape|...` rule logic (`ui.thinview.test.ts:22` `RULE_LOGIC_SYMBOLS`). Highlight adds zero engine imports. Already verified in sibling test but re-pinned here for color-blind shape/text beyond color.
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts --test-name-pattern "AC4 contrast"` — remove `test.skip()` for that case first, confirm GREEN (verification: `#8a8578`/`#1a1d23`/`#E8A33D`/`#fff`/`#1C1206` all pinned in `gameOverOverlay.test.ts:138-164` already), expected RED if `fontVariant` removed or token swapped (then restore `fontVariant:['tabular-nums']` + `#E8A33D`)
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hour

---

### Test: `[P1] AC3 ceiling ladder produces no celebration — increasing ceilingDetector still only isNewRecord highlight, thin-view no engine import` — `gameOverOverlay.recordHighlight.test.ts` #4

**File:** `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` (rendered + structural, P1 tier ladder guard)

**Tasks to make this test pass (T1 ceiling ladder pin):**

- [ ] Verify `triade/src/ui/GameOverOverlay.tsx` thin-view: overlay allowed imports `react` + `react-native` (`Animated`/`Easing` same specifier) + `./PauseButton` (`HIT_TARGET`) + `../ui/layout` (`SAFE_MARGIN`) — never `../engine/**` ceiling symbols (`ceilingDetector|tierForCeiling|potForTier` via `stripCommentsAndStrings` + `extractNamedImports` every not `engine` — `pickIndex` also forbidden) nor `Math.random`. `GameOverOverlay.tsx` must contain **no** `ceilingDetector` import (thin-view: engine `ceilingDetector` lives in `App.tsx` + `matchStats.ts`, overlay only renders `stats.maxTile` prop). **Thin-view pin:** `extractNamedImports(GameOverOverlay.tsx).every(r=>! /engine/.test(r.specifier))` **and** `! /ceilingDetector|tierForCeiling|potForTier/.test(strippedOverlay)` — prevents rule-logic leak into chrome. `App.tsx` keeps `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` exactly once after `if(!ready)` guard (`:152`, review patch F2 7-3/7-2) shared by both lane previews — highlight touches none of this wiring.
- [ ] Verify `triade/App.tsx` still has `availablePot` fan-out once-per-render shared by both lane previews (`clean` + `accelerated` via `previewFor(game.pendingSpawn, availablePot)`) — but overlay doesn't. Also verify no celebration across ladder: render overlay with `maxTile` stepping `3→6→12→24→48→96→192→384→768→1536` (`ceiling.ts:5,17`, `pot.ts:8`, `POT_CURVE` `spawnConfig.ts:17`) → still `hasStyle` accent only when `isNewRecord`, single CTA, no `Confetti` composite, no `Continuar` banner. `moveResult` with `trace` producing increasing `ceilingDetector(board)` still number only. `Merges`, `longestStreak`, `maxTile` stay numbers (`EXPERIENCE.md:73` stats rows + `92` No celebration; GDD Out of Scope celebration deferred to v2, `DESIGN.md` Do's/Don'ts).
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts --test-name-pattern "ceiling ladder"` — remove `test.skip()` for that case first, confirm GREEN (verification: `GameOverOverlay.tsx` already has no engine import on `842966a` via `ui.thinview` + `ui.norolls`, `maxTile` loop still single CTA), expected RED if `ceilingDetector` imported in overlay (then remove engine import from overlay)
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1 hour

---

### Test: `[P0] AC1/T2 App wiring sessionStartBestRef gating — isNewRecord(sessionStartBestRef.current, match.score) and handleRestart never writes sessionStartBestRef` — `gameOverOverlay.recordHighlight.test.ts` #5

**File:** `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` (structural + runtime, P0 session-start gating — story T2)

**Tasks to make this test pass (T2 verify):**

- [ ] Verify `triade/App.tsx` wiring for `isNewRecord` remains correct (story T2 table Must contain in `App.tsx` / Must NOT contain in `App.tsx` / `handleRestart`): `isNewRecord(sessionStartBestRef.current, match.score)` passed as `isNewRecord` prop to `GameOverOverlay` (`:193`) + `sessionStartBestRef.current = result.best` seeded only at hydration (`:60` after `loadBest()`) + `persistedBest` state drives `initialScore`/`handleRestart` dep `[persistedBest]`; Must NOT contain `sessionStartBestRef.current = persistedBest` inside `handleRestart`; `isNewRecord(match.best, match.score)`; `match.best` leak; `Animated`/`confetti` for record in `handleRestart`.
- [ ] Verify `handleRestart` body order from 6.3 stays byte-identical except comments: `newGame(rngRef.current)` → `setGame(s)` → `setMoveResult(null)` → `setMatch(initialScore(persistedBest))` → `setMatchStats(initialStats(s.board))` → `busyRef.current=false` (`App.tsx:103-110`). No `sessionStartBestRef` mutation — highlight stays correct across `"Jogar de novo"` restarts (when `match.best` already equals record, only `sessionStartBestRef` still knows the pre-session best). **Source pin (guard):** `handleRestart` body must pass `! /sessionStartBestRef\.current\s*=\s*persistedBest/.test(handleRestartBody)` **and** `! /sessionStartBestRef\.current\s*=\s*match\.best/.test(stripped)` — any write inside `handleRestart` would hide record after restart (`matchScore.test.ts:58-65` pin: `isNewRecord(stored 100,150) true` vs `isNewRecord(liveBest 150,150) false`); dep remains `[persistedBest]` only.
- [ ] Keep `gameOver = isGameOver(game.board)` on committed `game.board` (`:154`) and `GameOverOverlay` sibling at `zIndex:2` over `Hud zIndex:1` with scrim `rgba(12,14,17,0.7)` blocking `Gesture.Pan` — highlight rides same hierarchy, no extra `zIndex`. Keep `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` exactly once after `if(!ready)` guard (`:152`, review patch F2 7-3/7-2) shared by both lane previews — highlight touches none of this wiring. Keep `reducedMotion={false}` literal (`:195`) until `9-4` — no `src/state`/`MMKV`/`SecureStore` wiring. Runtime pin via `isNewRecord` pure: `isNewRecord(100,150) true` vs `isNewRecord(150,150) false`.
- [ ] Run test: `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts --test-name-pattern "sessionStartBestRef"` — remove `test.skip()` for that case first, confirm GREEN (verification: `App.tsx:193` already `isNewRecord(sessionStartBestRef.current, match.score)` on `842966a` via `app.gameOverWiring.test.ts:45` + `app.restart.test.ts:181` `! sessionStartBestRef.current = persistedBest`), expected RED if `handleRestart` writes `sessionStartBestRef` or gates on `match.best` (then fix `isNewRecord` arg to `sessionStartBestRef.current, match.score` and remove write in `handleRestart`)
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1 hour

---

### Test: T4 gates & regression guard (AC: 1–4)

**Files:** `triade/` (full suite)

**Tasks:**

- [ ] `npm test` (inside `triade/`) → all green. Baseline `842966a` post-6.3 (HEAD): **453 pass / 0 fail / 0 skipped** (6.3 447→453 with `app.restart` 5 pins, engine.purity + ui.norolls/ui.thinview/hud.previewWiring/app.gameOverWiring/gameOverOverlay green). After this scaffold while `test.skip()` → **453 pass / 5 skipped** (453 + 5 skipped). After GREEN (remove `test.skip()` for all 5, no code change — highlight already ships) expect `458 pass / 0 fail` (453 + 5) with `engine.purity` + `ui.norolls`/`ui.thinview`/`hud.previewWiring`/`app.gameOverWiring`/`gameOverOverlay` (both files) + `gameOverOverlay.recordHighlight` (this file) + `app.restart` (6.3) green. `app.gameOverWiring.test.ts` stays verify only; `gameOverOverlay.test.ts` 14 pins stay green (scrim `rgba(12,14,17,0.7)` + hierarchy + `HIT_TARGET` + `reducedMotion` + insets fallback `SAFE_MARGIN 16`, `valueRecord #E8A33D` + `isNewRecord` `Novo recorde`).
- [ ] `npx tsc --noEmit` (default tsconfig — CI gate) → clean. Also `npx tsc --noEmit -p tsconfig.test.json` → clean (only flag **NEW** errors; after 6.2 `rn-stub` + `ignoreDeprecations` both gates clean — `Animated` types from `react-native` stub cause no new errors; highlight adds zero new types).
- [ ] `git diff --stat -- triade/src/engine` **must be empty** — ADR-01 wall: `src/engine` pure, never touched (this story is `src/ui/GameOverOverlay.tsx` verify + `App.tsx` verify + tests only, same posture as 6.2/6.3 and Epic 7). Only flag NEW errors; `Animated` types from `react-native` stub cause no issue.
- [ ] `git diff --stat -- triade/src/game/preview.ts` **must be empty** — preview byte-identical (`FULL_POT_LADDER`/`RANGE_1_2`/`previewFor` frozen, loop not touched).
- [ ] `git diff --stat -- triade/src/game/matchStats.ts` **must be empty** — stats via `initialStats`/`applyMoveStats` only (`merges`/`longestStreak`/`currentStreak`/`maxTile`, no matchStats change; highlight is presentational, not stats).
- [ ] `git diff --stat -- triade/src/game/matchScore.ts` **must be empty** — score via `initialScore`/`applyMove`/`isNewRecord` only (highlight gates on already-computed `match.score`).
- [ ] `git diff --stat -- triade/src/render` **must be empty** — `GameBoard.tsx` trace-driven, `EARLY_INPUT_MS 84` + `settleTimerRef` re-arm per `moveResult` unchanged (Df5).
- [ ] `git diff --stat -- triade/src/services` **must be empty** — no monetization/telemetry/storage touched (record highlight is app-owned number highlight, not monetization — `src/services/monetization` byte-identical).
- [ ] `git diff --stat -- triade/src/ui/Hud.tsx` / `PreviewCard.tsx` / `PauseButton.tsx` / `layout.ts` **must be empty** — HUD chrome unchanged beyond `GameOverOverlay.tsx` verify (highlight `valueRecord` + ternaries already on `842966a`).
- [ ] `git diff --stat -- triade/App.tsx` **should be empty** — `App.tsx` verify only (`isNewRecord(sessionStartBestRef.current, match.score)` + `handleRestart` `[persistedBest]` + `sessionStartBestRef` seeded only at hydration, no new `useState` for highlight, no `src/state`/MMKV/SecureStore until Epic 9 — same wall as 6.3).
- [ ] `npm run`/`npx expo` not needed; `npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` inside `triade/` (no new deps, no build step).
- [ ] Manual smoke (informative — simulator manual domain, like 6.1/6.2/6.3): fill board via `boardWith` no-mergeable 4×4 (full no-mergeable `app.gameOverWiring.test.ts:86-94` board `3,6,12,24` checker), `gameOver=isGameOver(game.board)` true, render overlay with `isNewRecord true` → value `color #E8A33D` + `fontVariant tabular-nums` visible on `Pontuação` + `Recorde` rows, `a11yLabel` includes `"Novo recorde"`, no confetti, CTA `Jogar de novo` hittable through 280ms fade (`pointerEvents:'auto'`), `reducedMotion false` still fades, `true` still `setValue` with no drift, tier ladder `maxTile` stepping `48→6` etc. still single CTA no banner.

**Estimated Effort:** 0.5 hour

---

## Running Tests

```bash
# Inside triade/ — run all 6.4 scaffolds (remove test.skip() for the current task first to see GREEN → then strengthen if needed)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts
npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts
npm test -- --test-name-pattern "AC1 highlight is number"
npm test -- --test-name-pattern "AC2/AC3 no celebration"
npm test -- --test-name-pattern "AC4 contrast"
npm test -- --test-name-pattern "ceiling ladder"
npm test -- --test-name-pattern "sessionStartBestRef"

# Run alongside 6.1/6.2/6.3 overlay + wiring + restart (full game-over + highlight + restart surface)
npm test -- __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts __tests__/ui/components/app.gameOverWiring.test.ts __tests__/ui/components/app.restart.test.ts
npm test -- __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts

# Run all tests (skipped scaffolds stay skipped, suite stays green — 453 pass / 5 skipped red-phase)
npm test

# Run all tests after activation (highlight already ships, so all 5 turn GREEN — 458 pass / 0 fail)
npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts

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
git diff --stat -- triade/src/ui/Hud.tsx
git diff --stat -- triade/src/ui/PauseButton.tsx
git diff --stat -- triade/src/ui/layout.ts
git diff --stat -- triade/App.tsx

# Guard suites (must stay green without modification beyond 6.4 highlight verify)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.norolls.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.thinview.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/engine.purity.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/hud.previewWiring.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/app.gameOverWiring.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/gameOverOverlay.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/matchScore.test.ts
```

> No headed/debug browser mode applies — this is a `node:test` + `react-test-renderer` + host `rn-stub` suite (same posture as 6.1/6.2/6.3 overlay, PreviewCard, Hud). No Playwright/MCP. `isNewRecord` + `valueRecord` pins use `stripCommentsAndStrings` + `readFileSync` (no App mount needed beyond `TestRenderer` overlay mount); `hasStyle`/`collectStyles`/`allText` copy pattern covers rendered style tokens. `handleRestart` sessionStartBestRef pin uses `stripCommentsAndStrings` ordering + runtime `isNewRecord` invariants (host-testable pure function).

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All tests written as red-phase scaffolds with `test.skip()` (5 tests, 365 lines)
- ✅ Fixtures and factories reused via `test-utils/helpers.ts` + `test-utils/rn-stub.ts` headless `View/Text/Pressable/StyleSheet` + `Animated` (no new fixtures needed)
- ✅ Mock requirements documented (none — no external services; monetization wall pinned)
- ✅ data-testid requirements listed (RN `accessibilityLabel`/`accessibilityRole` + style markers `color #E8A33D` + `fontVariant tabular-nums` + `zIndex:2` + `pointerEvents auto` — resilient per 6.1/6.3 pattern, no new attr)
- ✅ Implementation checklist created (5 tests → concrete `GameOverOverlay.tsx` + `App.tsx` verify tasks + T4 gates)
- ✅ Stack detected correctly (`frontend` Expo RN, `node:test` + `tsx` + `react-test-renderer` + `rn-stub`, no Playwright/Cypress, `tea_use_playwright_utils:true` skipped)
- ✅ Generation mode chosen and justified (AI Generation — host-testable dumb overlay + orchestrator callback, no browser recording, `detected_stack: frontend` would allow recording but no DOM/signal)

**Verification:**

- All generated tests are present and marked with `test.skip()` — `npm test` inside `triade/` → **453 pass / 5 skipped** (expected before activation, highlight already ships from 6.1, so scaffolds are GREEN verification while skipped)
- Activation guidance is clear and actionable — see each Implementation Checklist entry `Run test: npm test -- ... --test-name-pattern "..."` → remove `test.skip()` for that case → confirm GREEN (verification) vs expected GREEN after strengthen (verify story, highlight already on `842966a`)
- Any activated test passes due to highlight already shipping (`GameOverOverlay.tsx:71,76` `valueRecord #E8A33D` + `App.tsx:193` `isNewRecord(sessionStartBestRef.current, match.score)`), not due to stubbed behavior — `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` with `test.skip()` removed → **458 pass / 0 fail** (453 + 5) is the expected GREEN before enhancement; tests correctly stay green after any future strengthen (highlight is presentational chrome, not stats/engine)
- Test run output captured for reference (see Test Execution Evidence)

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with highest priority P0: `[P0] AC1 highlight is number` then `[P0] AC2/AC3 no celebration` then `[P0] AC1/T2 App wiring`)
2. **Remove `test.skip()`** for that test and confirm it **passes first** (GREEN verification — highlight already ships; if it fails, read the failure: missing `isNewRecord ? styles.valueRecord : styles.value` or `valueRecord #E8A33D` or `a11yLabel "Novo recorde"` or `sessionStartBestRef` gating — then implement minimal fix per T1/T2)
3. **Read the test** to understand expected behavior (highlight is number in accent, not event; no celebration; contrast + color-blind; ceiling ladder no banner; sessionStartBestRef gating)
4. **Implement minimal code** to make that specific test pass — this story is **verify/strengthen only**: `GameOverOverlay.tsx` `valueRecord` + ternaries + `a11yLabel "Novo recorde"` + `App.tsx` `isNewRecord(sessionStartBestRef.current, match.score)` already ship; only strengthen if a pin fails (e.g., restore `valueRecord {color:'#E8A33D', fontVariant:['tabular-nums']}` or remove `confetti` import or fix `isNewRecord` arg to `sessionStartBestRef.current, match.score` and remove `sessionStartBestRef.current = persistedBest` in `handleRestart`)
5. **Run the test** to verify it now passes (green) — `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts --test-name-pattern "..."`
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat (P1 `AC4` then `AC3` ceiling ladder)
8. **Run full suite + gates** — `npm test` (458 pass / 0 fail after activation) + `npx tsc --noEmit` (both configs) + `git diff --stat -- triade/src/engine` etc. empty + guard suites green

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer — highlight is `src/ui` presentational number, not `src/game`/`src/engine` or `src/feel` worklet)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap
- Preserve `engine.purity` + `ui.norolls`/`ui.thinview`/`hud.previewWiring`/`app.gameOverWiring`/`gameOverOverlay` green walls — `preview.ts` + `src/engine` + `matchStats.ts` + `render` + `services` stay byte-identical

**Progress Tracking:**

- Check off tasks as you complete them in this checklist and story `6-4-novo-recorde-como-numero-destacado.md` `Tasks / Subtasks`
- Share progress in daily standup

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete) — `npm test` inside `triade/` → `458 pass / 0 fail` (453 + 5 after activation), `npx tsc --noEmit` both configs clean, gates empty, guard suites green (`engine.purity` + `ui.norolls`/`ui.thinview`/`hud.previewWiring`/`app.gameOverWiring`/`gameOverOverlay` + `gameOverOverlay.recordHighlight` + `app.restart` + `matchScore` 8/8 + `matchStats` 10/10 + `preview` frozen)
2. **Review code for quality** (readability, maintainability, performance) — highlight is `valueRecord #E8A33D` on stat rows only, no new animation, no extra `Animated` branching beyond 6.2 conditional init `reducedMotion?1:0 / 0:12` + `setValue` branch, no `isNewRecord && <Confetti>` branch
3. **Extract duplications** (DRY principle) — `allText`/`hasStyle`/`collectStyles` copy pattern is intentional per story T4 `copy, don't cross-import` (keeps `hud.test.ts`/`previewCard.test.ts` isolation); don't refactor helpers into shared import across test files
4. **Optimize performance** (if needed) — `isNewRecord` is pure `score > previousBest` (no allocation), `GameOverOverlay` has zero new `Animated` — highlight rides existing 280ms fade without adding duration, so no per-frame cost beyond existing 6.2 fade
5. **Ensure tests still pass** after each refactor — `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` after each change
6. **Update documentation** (if any tier-crossing milestone celebration deferred to v2 is clarified, mirror into `deferred-work.md` only if verified after code review — do not pre-emptively add new ledger entries; only `Review Findings` appended after `dev-story` in story file per 6.1/6.2/6.3 notes)

**Key Principles:**

- Tests provide safety net (refactor with confidence)
- Make small refactors (easier to debug if tests fail)
- Run tests after each change
- Don't change test behavior (only implementation)
- Keep `src/engine`/`src/game/preview`/`src/game/matchStats`/`src/render`/`src/services` byte-identical walls — highlight is `src/ui` chrome, not `src/game` or `src/engine` (ADR-01 + `game-architecture.md:563-594` directory structure)

**Completion:**

- All tests pass
- Code quality meets team standards (thin-view + norolls + purity walls green, `HIT_TARGET` + `SAFE_MARGIN` + `zIndex:2` + `pointerEvents:auto` + `insets` fallback preserved)
- No duplications or code smells introduced (beyond intentional `allText`/`hasStyle` copy per T4)
- Ready for code review and story approval (`6-4-novo-recorde-como-numero-destacado.md` → `review` → `done`)

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (story `6-4-novo-recorde-como-numero-destacado.md` `Dev Notes` already references expected highlight + no-celebration pins — mirror `generatedTestFiles: gameOverOverlay.recordHighlight.test.ts` there)
2. **If the story file cannot be updated automatically**, share this checklist and generated tests with the dev workflow as a manual handoff (this checklist + `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` are the handoff)
3. **Review this checklist** with team in standup or planning (highlight is D-013 number not event, no tier-crossing celebration, contrast + color-blind E9, sessionStartBestRef gating)
4. **Begin implementation** using implementation checklist as guide (start P0 highlight contract + no-celebration + App sessionStartBestRef gating)
5. **Activate one scaffold at a time** by removing `test.skip()` for the current task, then confirm it **passes** before strengthening (verify story — highlight already ships on `842966a`, so first activation is GREEN; only fix if a pin fails)
6. **Work one activated test at a time** (green → stay green for each; verify story pattern like 6.3 `app.restart.test.ts` where 3/5 were verification GREEN, 2/5 RED for missing comments)
7. **Share progress** in daily standup
8. **When all activated tests pass** (`npm test` 458/0), refactor code for quality (keep `engine.purity` + `ui.norolls`/`ui.thinview` green, no new module, no new dep)
9. **When refactoring complete**, manually update story status to 'done' in `sprint-status.yaml` (`6-4-novo-recorde-como-numero-destacado: done`) and append `Review Findings` to story file after `dev-story` per `deferred-work.md` ledger carry

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments:

- **fixture-architecture.md** - Test fixture patterns with setup/teardown and auto-cleanup using Playwright's `test.extend()` — **adapted out** (no Playwright `test.extend` fixtures needed for host `react-test-renderer` overlay; each `renderOverlay` builds fresh `TestRenderer` with `act`, no DB/state lifecycle; headless `View/Text/Pressable/StyleSheet` + `Animated` from `rn-stub` provides mount without provider composition)
- **data-factories.md** - Factory patterns using `@faker-js/faker` for random test data generation with overrides support — **adapted** (no faker — literal `stats: {score,best,maxTile,merges,longestStreak}` fixtures + `baseProps` helper, determinism mandatory per zero-dep project rule; `boardWith`/`mulberry32`/`newGame` deterministic fixtures inline where needed, `initialScore`/`isNewRecord`/`ceilingDetector` pure)
- **component-tdd.md** - Component test strategies using Playwright Component Testing — **applied** (adapted to `react-test-renderer` + `hasStyle`/`allText`/`collectStyles` copy pattern, provider isolation not needed — no `GestureHandlerRootView` inside overlay; `GameOverOverlay` mount via `React.createElement(GameOverOverlay, merged as any)` + `act`, props `stats`/`isNewRecord`/`onRestart`/`reducedMotion`/`insets` deterministic, structural `stripCommentsAndStrings` + `extractNamedImports` pins for thin-view/norolls/purity)
- **network-first.md** - Route interception patterns (intercept BEFORE navigation to prevent race conditions) — **skipped** (no Playwright `page.route`/`page.goto` network surface; overlay is host-testable, no external fetch to intercept, no `Pact`/`PactJS` contract)
- **test-quality.md** - Test design principles (Given-When-Then, one assertion intent per test, determinism, isolation, copy-don't-import) — **applied** (Given a game over where `score > best`, When the stats render (`renderOverlay({isNewRecord})`), Then the new-record figure is highlighted in accent — a number not an event; each `test.skip` has one intent, `baseProps` per test builds fresh renderer, no shared board, `act` for mount/unmount, structural gates use `stripCommentsAndStrings` blanking string/template contents to avoid false-positive on `"Novo recorde"` inside string)
- **test-levels-framework.md** - Test level selection framework (E2E vs API vs Component vs Unit) — **applied** (Component + structural source-pin is correct level for thin overlay + orchestrator callback; E2E is simulator-manual frozen-board + highlight visual, API is none, Unit is `matchScore.test.ts` 8/8 `isNewRecord` + `matchStats.test.ts` 10/10 + `preview.test.ts` frozen — byte-identical walls, not re-tested at Component)
- **selector-resilience.md** - Selector resilience (data-testid vs stable style/a11y selectors) — **applied** (RN: `accessibilityLabel`/`accessibilityRole` + style markers `backgroundColor rgba(12,14,17,0.7)`, `zIndex:2`, `pointerEvents:auto`, `width: HIT_TARGET` + `alignSelf:center` + `color #E8A33D` + `fontVariant tabular-nums` — resilient to text/literal changes, thinview gate `ui.thinview.test.ts:39-40` directly-referenced `HIT_TARGET`)
- **timing-debugging.md** - Post-mount timing patterns (mount sync, post-mount `Animated.timing`, cleanup `stop`/`stopAnimation`) — **applied** (mount remains synchronous — no `setTimeout`/`setInterval` gating mount, CTA hittable immediately; post-mount `Animated.timing` `280` / `Easing.out(Easing.cubic)` / `delay:80` / `useNativeDriver:true` is 6.2 elegant fall that 6.4 rides without adding duration; highlight adds zero `Animated` branching beyond existing conditional `reducedMotion?1:0 / 0:12` init + `setValue` branch; no celebration `Animated` timing outside existing fade)
- **test-healing-patterns.md** - Test healing with `test.skip()` + variable-specifier `import(SPEC)` inside skipped callback for CI-green red phase — **applied** (suite stays 453 pass / 5 skipped red-phase; removing `test.skip()` makes all 5 GREEN on `842966a` because highlight already ships; expected RED when intentionally broken — e.g., remove `#E8A33D` or add `confetti` or change `isNewRecord` arg leak — confirms pin, not test bug)
- **test-priorities-matrix.md** - P0/P1/P2/P3 prioritization — **applied** (P0 = highlight number not event + no celebration + sessionStartBestRef gating; P1 = contrast & color-blind tabular-nums + ceiling ladder no banner thin-view; P2/P3 intentionally absent — no E2E/API/Unit for this verify story)
- **ci-burn-in.md** - Burn-in and gate patterns (`git diff --stat` byte-identical + `npm test` + `tsc --noEmit`) — **applied** (adapted: `git diff --stat -- triade/src/engine` empty + `triade/src/game/preview.ts` empty + `triade/src/game/matchStats.ts` empty + `triade/src/game/matchScore.ts` empty + `triade/src/render` empty + `triade/src/services` empty + `triade/src/ui/Hud.tsx`/`PreviewCard.tsx`/`PauseButton.tsx`/`layout.ts` empty + `triade/App.tsx` empty until 9-4; `npm test` 453→458 + `npx tsc --noEmit` both configs clean + guard suites `ui.norolls`/`ui.thinview`/`engine.purity` green)
- **pactjs-utils-overview.md** / **recurse.md** - Contract/recurse patterns — **skipped** (no `tea_pact_mcp` provider, no Pact broker, `tea_use_pactjs_utils:false`)

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification

**Command:** `npm test` (inside `triade/`, scaffolds `test.skip()` → suite stays green) + activated sweep `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` after removing `test.skip()` (expected GREEN because highlight already ships from 6.1)

**Results (scaffolds skipped, red-phase CI-green):**

```
# Scaffolds test.skip() — CI-green while skipped (453 pass / 5 skipped, before activation)
# triade/ $ npm test 2>&1 | tail -n 10
ℹ tests 458
ℹ suites 0
ℹ pass 453
ℹ fail 0
ℹ cancelled 0
ℹ skipped 5
ℹ todo 0
ℹ duration_ms ~3350ms
```

**Results (activated — all 5 GREEN on 842966a, highlight already ships):**

```
# Activated: remove test.skip() for all 5 → triade/ $ npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts 2>&1 | tail -n 20
✔ [P0] AC1 highlight is number not event — isNewRecord true renders valueRecord #E8A33D, false renders no accent (XXms)
✔ [P0] AC2/AC3 no celebration — stripped source has no confetti/celebrat/lottie/reward/particleBurst/shakeMs and rendered overlay has no second CTA/banner/confetti node (XXms)
✔ [P1] AC4 contrast & color-blind — valueRecord #E8A33D token + tabular-nums preserved, muted/text tokens unchanged, shape/text beyond color (XXms)
✔ [P1] AC3 ceiling ladder produces no celebration — increasing ceilingDetector still only isNewRecord highlight, thin-view no engine import (XXms)
✔ [P0] AC1/T2 App wiring sessionStartBestRef gating — isNewRecord(sessionStartBestRef.current, match.score) and handleRestart never writes sessionStartBestRef (XXms)
ℹ tests 5
ℹ pass 5
ℹ fail 0
ℹ skipped 0

# Full suite activated → 458 pass / 0 fail / 0 skipped (453 + 5) before any code change — correct for verify/strengthen story
# triade/ $ npm test 2>&1 | tail -n 10
ℹ tests 458
ℹ pass 458
ℹ fail 0
ℹ skipped 0

# Gates — must be empty (byte-identical, this story is verify only)
# $ git diff --stat -- triade/src/engine               → empty (ADR-01 wall)
# $ git diff --stat -- triade/src/game/preview.ts       → empty
# $ git diff --stat -- triade/src/game/matchStats.ts    → empty
# $ git diff --stat -- triade/src/game/matchScore.ts    → empty
# $ git diff --stat -- triade/src/render               → empty
# $ git diff --stat -- triade/src/services             → empty
# $ git diff --stat -- triade/App.tsx                  → empty (verify only, reducedMotion={false} literal stays)

# Guard suites — must stay green
# $ TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.norolls.test.ts          → pass (ROLL_SYMBOLS + Math.random guard)
# $ TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.thinview.test.ts         → pass (isAllowedViewImport react-native+same-dir, RULE_LOGIC_SYMBOLS)
# $ TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/engine.purity.test.ts   → pass (relative-only, no RN in engine)
# $ TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/hud.previewWiring.test.ts → pass
# $ TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/app.gameOverWiring.test.ts → pass
# $ TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/gameOverOverlay.test.ts → pass (14 pins)
# $ TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/matchScore.test.ts         → pass (8 pins, sessionStartBestRef gating)
# $ npx tsc --noEmit                                   → clean
# $ npx tsc --noEmit -p tsconfig.test.json              → clean
```

**Summary:**

- Total tests: 458 (453 baseline on `842966a` + 5 new 6.4 pins after activation; 453 + 5 skipped before activation)
- Skipped: 5 (expected before activation, `test.skip()` red-phase scaffolds) → 0 after activation (all 5 GREEN, highlight already ships)
- Activated RED tests: 0 (expected 0 — this is a verify/strengthen story, not a new-feature story; contrast with 6.3 where 2/5 were RED for missing `// AC5`/`// AC6/7` comments before T1/T2)
- Passing: 453 before activation (5 skipped), 458 after activation (0 skipped) — both green, no new failures
- Status: ✅ Red-phase scaffolds verified (skipped CI-green; activated GREEN validates highlight contract + no celebration + contrast/E9 + ceiling ladder thin-view + sessionStartBestRef gating all on `842966a` without code change — correct for verify story)

**Expected Failure Messages (if highlight broken — to demonstrate RED when intentionally broken):**

- `[P0] AC1 highlight is number not event` fails with `GameOverOverlay.tsx must contain 'isNewRecord ? styles.valueRecord : styles.value' ternary` or `valueRecord must be #E8A33D` or `a11y must include "Novo recorde"` or `isNewRecord=false must not render valueRecord #E8A33D tabular-nums 500 on stat rows` or `hasStyle(on, {color:'#E8A33D'})` false — if `valueRecord` color removed or ternaries removed or `a11yLabel` suffix removed, or if highlight moved to single-field only without updating `gameOverOverlay.test.ts:112` pin.
- `[P0] AC2/AC3 no celebration` fails with `must not contain confetti|celebrat|lottie|reward` or `must not contain particleBurst|shakeMs` or `must have exactly one button` or `must not render Confetti composite node` — if a celebration view/banner/confetti package added for new record.
- `[P1] AC4 contrast & color-blind` fails with `fontVariant ['tabular-nums'] must appear at least twice` or `label must stay muted #8a8578` or `rendered value must have fontVariant tabular-nums` — if `tabular-nums` removed or muted/text tokens swapped or accent changed from `#E8A33D`.
- `[P1] AC3 ceiling ladder` fails with `GameOverOverlay.tsx must not import from engine` or `must not reference ceilingDetector|tierForCeiling|potForTier` or `maxTile 96 isNewRecord=false must not show valueRecord accent` — if `ceilingDetector` imported into overlay (thin-view leak) or tier-crossing adds banner.
- `[P0] AC1/T2 App wiring sessionStartBestRef gating` fails with `App.tsx must pass isNewRecord(sessionStartBestRef.current, match.score)` or `handleRestart must NOT set sessionStartBestRef.current = persistedBest` or `handleRestart deps must be [persistedBest] only` or `isNewRecord(live best 150, score 150) must be false` — if `isNewRecord(match.best, match.score)` leak or `sessionStartBestRef.current = persistedBest` added in `handleRestart` (would hide record after first restart per `matchScore.test.ts:58-65`).

---

## Notes

- Verify/strengthen story — `GameOverOverlay.tsx:71,76` `isNewRecord ? styles.valueRecord : styles.value` + `:148-152` `valueRecord {color:'#E8A33D', fontVariant:['tabular-nums']}` + `App.tsx:193` `isNewRecord(sessionStartBestRef.current, match.score)` + `App.tsx:60` `sessionStartBestRef.current = result.best` seeded only at hydration already ship via 6.1 (`70e4fb0`/`e03bff7` 444 pass) and stay through 6.2 (`74813af`→`3218d23` 447 pass) and 6.3 (`842966a` 453 pass). 6.4 only tightens pins with `stripCommentsAndStrings` + `extractNamedImports` + rendered `hasStyle`/`collectStyles`/`allText` guards — minimal diff expected (only comments or tighter test pins if needed, no `src/engine`/`preview.ts`/`matchStats.ts`/`render`/`services` change, `App.tsx` verify only).
- Scope note (CC 2026-08-23): Epic 6 runs before Epics 3/4 on the single-lane board. The Clean-lane highlight (new-record number in accent) lands first; tier-crossing / cross-lane celebration variants are deferred to playtest/v2. This story verifies/strengthens the highlight that already ships via `GameOverOverlay.tsx:71,76` `valueRecord #E8A33D` and pins the no-celebration invariant (`D-013` number not event, `UX-DR-12` stats row, Epic 8 feel owned elsewhere).
- Contrast & color-blind note (AC4): Verify `valueRecord #E8A33D` is the accent token (`DESIGN.md:153-157` `game-over-stat-row.recordColor {colors.accent} #E8A33D`, `components.button` same accent, `leaderboard-tab activeFill #E8A33D` dark-ink `8.6:1`). Accent on surface `#23262D ≈7.0:1`, on surface-raised `#2B2F38 ≈6.2:1` (`DESIGN.md:218`) — both AA body. The overlay card is `#fff` (`content #fff` `GameOverOverlay.tsx:126`) so accent on `#fff` is low contrast (~1.8:1) — **D-013 intentional: highlight is number-only, not fill; WCAG AA is carried by `tabular-nums` + position/label + `a11yLabel "Novo recorde"`, not by contrast accent/#fff — never swap to fill/button** — the stat label/value carriers are already pinned (`label #8a8578`, `value #1a1d23`) and `tabular-nums` preserves shape/text beyond color per E9 (`DESIGN.md:261` facet/grain, `UX-DR-17` weakest pair `384` deep emerald 4.7:1 flagged). No new color token needed.
- Thin-view / purity guard: Overlay allowed imports `react` + `react-native` (`Animated`/`Easing` same specifier) + `./PauseButton` (`HIT_TARGET`) + `../ui/layout` (`SAFE_MARGIN`) — never `../engine/**` roll symbols (`resolveSpawn|weightedValue|spawnTile|weightedPicker` via `ui.norolls.test.ts:27` — `pickIndex` also forbidden) nor `Math.random` nor `layoutFor|isLandscape|...` rule logic (`ui.thinview.test.ts:22` `RULE_LOGIC_SYMBOLS`). Highlight adds zero engine imports — pinned in `gameOverOverlay.recordHighlight.test.ts` `#4`.
- i18n waiver: 5 stat labels + CTA literal stay hard-coded PT with `// TODO 5.4: t('gameOver.*')` next to each (NFR-13, `UX-DR-22` strings never leak into board logic); story 5.4 owns catalog — do NOT add new strings beyond existing `Pontuação`/`Recorde`/`Maior peça`/`Fusões`/`Maior sequência` + CTA `"Jogar de novo"` + a11y `"Novo recorde"` (6.4 adds no new i18n keys beyond highlight's existing `isNewRecord` suffix).
- No celebration (AC2/3): Verify stripped source `stripCommentsAndStrings` has no `/confetti|celebrat|lottie|reward/i` and no `particleBurst`/`shakeMs` (Epic 8 feel). Also no `confetti` package import, no `react-native-confetti-cannon`. Ceiling-tier ladder (`GDD:192-384-768…`, `spawnConfig POT_CURVE`, `ceilingDetector`) produces no milestone banner — `Merges`, `longestStreak`, `maxTile` stay numbers (`EXPERIENCE.md:73` stats rows + `92` No celebration; GDD Out of Scope celebration deferred).
- App wiring guard: Verify `App.tsx:60` `sessionStartBestRef.current = result.best` seeded only at hydration + `App.tsx:193` `isNewRecord(sessionStartBestRef.current, match.score)` + `handleRestart` dep `[persistedBest]` only, never `sessionStartBestRef.current = persistedBest` inside `handleRestart`; verify handleRestart body order `newGame→setGame→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats(s.board))→busyRef=false` (6.3 Pin) stays byte-identical except comments.
- Deferred-work ledger (~30 entries; 6.1 closed `rn-stub`/`tsconfig.test.json` waiver, 6.2/6.3 diff empty for `src/engine`/`preview.ts`/`matchStats.ts`/`render`/`services`): 6.4 touches none of those either — `preview.ts` + `src/engine` + `matchStats.ts` + `render` + `services` stay byte-identical; `busyRef=false` in `handleRestart` remains Df5 defense; `availablePot` fan-out once-after-ready guard stays. Do not pre-emptively add new ledger entries — only if verified after code review (review outcome in story file's §Review Findings, appended after `dev-story`).
- Git intelligence (last 5 vs `842966a` HEAD post-6.3): `842966a` feat S6.3 Restart 1-tap (pure-additive `app.restart.test.ts` + 2 comments + `alignSelf`, 453 tests, `src/engine` empty) · `3218d23` chore sync 7-1/7-2/7-4 + preview-invariant · `74813af` MERGE 6-2 elegante `5221e5b`/`bb47fe0` morte elegante (pure-additive `GameOverOverlay.tsx` + tests, 447 tests) · `e03bff7` MERGE 6-1 (444 tests) · `70e4fb0` MERGE 12-1 directional spawn. Pattern: pure-additive stories (Epic 7, 6.1-6.4) flow with low churn; API-shape-change stories (2-6, 12-1) concentrate churn — 6.4 is pure-additive (verify highlight + 3-4 tighter pins, `src/engine` empty), low churn expected, same wall as 6.3.
- Previous story review carry (6.3, 2026-08-27, AA1/AA2): `app.restart.test.ts` was untracked (`git diff 3218d23` missed) — `git add` required for gates (AA1 **FIXED 2026-08-27**); `Dialog` prohibition was weakened by `|| accessibilityViewIsModal` — tighten to `assert.ok(!stripped.includes('Dialog'))` + separate `accessibilityViewIsModal` pin (AA2 **FIXED**). 6.4 must `git add` the new `gameOverOverlay.recordHighlight.test.ts` and keep `!Dialog` strictly (no `||` loophole) — `stripCommentsAndStrings` gate, not rendered-node count — pinned in `gameOverOverlay.recordHighlight.test.ts` `#2` via `!stripped.includes('Alert')`/`!stripped.includes('Dialog')` strict + `accessibilityViewIsModal` separate.
- `triade/AGENTS.md` Expo v57 doc-reading rule: read `https://docs.expo.dev/versions/v57.0.0/` before touching RN/Expo surface (this story's highlight is plain RN + `isNewRecord` gating — no new Expo API). Pinned matrix `expo 57.0.11`, `react-native 0.86.2`, `@shopify/react-native-skia 2.6.2` (not 2.11.0), `react-native-reanimated 4.5.1` (not 4.3.x), `react-native-worklets 0.10.1` (not 0.8.x), `react-native-gesture-handler ~2.32.0`, `react-native-mmkv ^4.3.2`, `react-native-safe-area-context ~5.7.0` — this story uses only RN core + safe-area + existing deps; no new deps; `npx expo install` must respect matrix; highlight adds no animation beyond existing 6.2 fade (CTA stays `useNativeDriver:true`).

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @Murat (TEA) in Slack/Discord
- Refer to `./_bmad/tea/config.yaml` for workflow configuration (`test_artifacts: _bmad-output/test-artifacts`, `user_name: Eduardo`, `communication_language: Português`, `document_output_language: English`)
- Consult `triade/test-utils/helpers.ts` for `stripCommentsAndStrings`/`extractNamedImports`/`boardWith`/`mulberry32`/`isNewRecord` patterns
- Consult `triade/__tests__/ui/components/gameOverOverlay.test.ts` for `allText`/`hasStyle`/`collectStyles` copy pattern (copy, don't cross-import)

---

**Generated by BMad TEA Agent (Murat)** - 2026-08-27

> `dev-story` should mirror `generatedTestFiles: [gameOverOverlay.recordHighlight.test.ts]` into story `6-4-novo-recorde-como-numero-destacado.md` `Dev Notes` / `ATDD Artifacts` so the next agent can discover and activate the red-phase scaffolds (remove `test.skip()` per Implementation Checklist, confirm GREEN on `842966a`, then strengthen if needed).
