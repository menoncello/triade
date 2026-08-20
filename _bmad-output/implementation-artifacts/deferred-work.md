# Deferred Work

## Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)

- ~~Preview placeholder (76×76) overlaps the centered "TEMP move harness" hint text on devices with `insets.bottom === 0` (visual only — card is `pointerEvents="none"`) (`triade/src/ui/Hud.tsx:53`, `triade/App.tsx:131`). Temp harness is replaced by real swipe input in story 1.6.~~ **CLOSED by story 1.6 (2026-08-18):** T3.1 removed the TEMP hint text and the harness from `App.tsx`; the placeholder no longer overlaps anything.

- `stripComments` corrupts string/regex literals containing `//` or `/*` — the purity/thin-view tripwire can false-pass or false-fail on future edits that embed such literals (`triade/test-utils/helpers.ts:67-71`). Test-tooling robustness; current files are clean.
- `boardSize` clamps to 0 on degenerate/tiny windows (the old 40pt floor was removed; the 360 cap removal is intended per UX-DR-20 container-driven maximize) (`triade/src/ui/layout.ts:31`). Acceptable per spec; board simply doesn't render on absurd sizes.
- NaN/Infinity inputs propagate NaN through `layoutFor` despite the "all finite" test sweeping only finite sizes (`triade/__tests__/ui/layout.test.ts:189`). Runtime inputs from `useWindowDimensions` are always finite.
- Rotation race: `useSafeAreaInsets` lags `useWindowDimensions` by a frame → board can flash to 0; `SafeAreaProvider` mounts without `initialMetrics`; ScrollView offset persists across rotation (`triade/App.tsx:28-30,103`). Native polish, manual-validation domain.
- Status bar legibility / band-under-status-bar on non-notch landscape (light UI + `StatusBar style="auto"`). Manual validation domain.
- Preview placeholder Views aren't a11y-hidden (`accessible={false}`), and the raw score lacks a thousands separator vs the mockup's "3.240" (`triade/src/ui/Hud.tsx:26,48`). Out of scope — preview data is Epic 7, a11y is Epic 9.
- ~~Temp move harness + ScrollView not `__DEV__`-gated — ships to production until story 1.6 replaces the input path. Documented temp state.~~ **CLOSED by story 1.6 (2026-08-18):** T3.1 removed the `DirButton` controls, the `ScrollView`, and the hint from `App.tsx`; the board now renders in a plain `View` with real RNGH swipe input.
- Band height formula duplicated between `App.tsx` (`bandTop`) and `Hud.tsx` (`topPad + bandHeight`) — drift risk on future margin changes (`triade/App.tsx:31`).
- Story doc T2 note says "12 layout tests"; final suite is 14 (clamp-path + golden-anchor tests added in the 2026-08-17 review fixes). Doc-only.

## Deferred from: story 1-5-layout-portrait-e-landscape (2026-08-16)

- ~~**Landscape rotation visual pass on the simulator** — `expo run:ios` built and booted the app on the iOS 26.5 simulator (iPhone 17 Pro); portrait HUD rendered with no runtime errors. The rotation gesture (Cmd+arrow) is a GUI action that cannot be automated in an unattended run (TCC blocks assistive access). The landscape contract itself is fully covered by the 12 layout unit tests (band collapse, board dominance, insets, extreme aspect) and the native mask includes landscape (Info.plist verified post-prebuild); the visual rotation reading remains **manual validation remaining** (informative per project rules). Trigger to close: rotate the simulator and confirm the thin 22pt/11pt top edge band + board dominance by eye.~~ **CLOSED (2026-08-19):** visual pass confirmed on simulator — thin 22pt/11pt top edge band renders correctly in landscape, board dominates, pause reachable.

## Deferred from: code review (2026-08-06)

- `user-scalable=no` + `maximum-scale=1.0` block pinch-zoom — accessibility tradeoff for a swipe game; revisit for a11y pass.
- Board `role="grid"` has no row/gridcell semantics or live-region score announcements — screen readers get an empty grid.

## Deferred from: Story 1-1 device gates (2026-08-10)

- **T1.4** — dev-build boot on a **physical iOS device** (Expo prebuild + Xcode; requires connected iPhone + CocoaPods). Simulator boot validated instead (2026-08-10): dev build boots and the Skia board renders on the iOS runtime.
- **T5.2** — **on-device frame-rate baseline** (fps + p99) via `useFrameRateBaseline` hook. Simulator reading recorded (60 fps · p99 16.67ms · 120 frames) is **informative only** (Mac GPU); the physical-device p99 < 16.7ms evidence (AC-4) stays open.
- **Trigger to resume:** a physical iPhone + Apple Developer account (code signing) become available. Run `_bmad-output/implementation-artifacts/1-1-device-gates-runbook.md` from the top; expected gate outcome for Story 1-1: PASS.

## Deferred from: code review of story 1-1-technical-spike-engine-ts-board-skia-benchmark-ci (2026-08-10)

- **pickIndex lets NaN slip through both clamps and crashes spawnTile** (`triade/src/engine/core/spawn.ts:3-8`) — `Math.floor(NaN * len)` → `NaN`; both guards (`< 0`, `>= len`) are false, so `empty[NaN]` is `undefined` and `spawnTile` throws. Deferred as pre-existing: `js/game.js` has identical behavior and the port must preserve it; default `Math.random` never yields NaN.

## Deferred from: code review of story 1-1-technical-spike-engine-ts-board-skia-benchmark-ci — pass 2 (2026-08-10)

- **pickIndex returns -1 when len===0** (`triade/src/engine/core/spawn.ts:6`) — `Math.floor(0 * rng()) = 0` passes `idx < 0`, then `idx >= len` sets `-1`; `array[-1]` → undefined, downstream callers crash. Pre-existing (`js/game.js` identical); internal callers guard `len > 0`.
- **shiftLine/move/boardFromLines assume 4x4 and crash on shorter input** (`triade/src/engine/core/line.ts:46`) — the shift loop and board remap iterate to hard-coded `GRID_SIZE`, so a shorter line/board throws. Pre-existing (`js/game.js` identical); `Board` is a fixed 4x4 contract.
- **Noop moves return a full trace of stationary tiles** (`triade/src/engine/core/game.ts:29-44`) — every non-null cell emits a trace entry (`to === from`), so a noop on a full board yields 16 entries. Faithful port: the trace contract is the game's identity and `ui.js` renders from it.
- **mergeValue ignores its second operand outside the canMerge guard** (`triade/src/engine/core/rules.ts:7-8`) — result depends only on `a`; `mergeValue(null, 2)` returns 3. Pre-existing (`js/game.js` identical); only ever called under `canMerge`.
- **spawnTile mutates its input board and returns the same reference** (`triade/src/engine/core/spawn.ts:17-28`) — writes the spawn value into the caller's array. Pre-existing (`js/game.js` identical); `move()` only passes a freshly built board.


## Deferred from: code review of story 1-2-port-completo-do-engine-de-regras-para-typescript (2026-08-10)

- `matchScore.applyMove` has no guard on `result.score` — a NaN poisons both score and best; `moved:false` with score>0 would inflate. Engine contract guarantees finite ≥0 scores and noop scores 0; defensive guard only.
- Parity `spawnTile` only cross-checks the non-full-board path; the spawn-nothing branch (full board) is covered by the absolute unit test `game.test.ts:198`, not parity.
- 13 parity move scenarios assert only TS===web, never an absolute outcome — inherent shared-bug blind spot. Mitigated by absolute-assertion unit suite (`game.test.ts`); header comment documents the limitation.

## Deferred from: code review of story 1-3-board-skia-declarativo-dirigido-pelo-trace (2026-08-13)

- AC-4 no-leak automated coverage stops at the planner (`resultingTiles` oracle); `GameBoard` reconcile/remove is manual-only — project rule: Skia animation is manual validation; the leak itself is fixed by the merge-ghost patch.
- `moveResult === null` after a previous non-null leaves tile state stale in `GameBoard.tsx:171-175` — unreachable today (App never resets); latent for the future new-game/reset path.
- ~~Temp harness `doMove` stale board closure drops rapid same-frame moves (`triade/App.tsx:20-27`) — temporary code replaced by real input in story 1.6.~~ **CLOSED by story 1.6 (2026-08-18):** T3.3/T3.4 replaced the harness with the RNGH `Gesture.Pan()` + `busyRef` in-flight gate; the stable gesture reads the latest `doMove` through `doMoveRef`, and rapid swipes during an in-flight animation are rejected instead of dropped.
- `classify` dereferences `entry.from[0]` unguarded (`triade/src/render/transitionPlan.ts:21-26`) — engine contract guarantees non-empty `from` for non-spawn entries; defensive hardening only.
- Purity scan blind spots — `PURITY_FILES` is a hand-maintained explicit list (a new pure file in `src/render` silently escapes the ADR-01/05 scan until edited); `FORBIDDEN_PREFIXES` misses a hypothetical bare `reanimated`/`skia` import (`triade/__tests__/engine/engine.purity.test.ts:12-16`). Current files are covered; maintenance hardening only.

## Deferred from: code review of story 1-3-board-skia-declarativo-dirigido-pelo-trace (2026-08-13, re-review)

- AC-5 (60 FPS / 10-min session) has no completed rendering-side evidence — only the planner micro-benchmark exists; the simulator/device frame-rate reading stays open as "Manual validation remaining" (project rule: Skia animation is manual validation; informative only). Trigger to close: run the temporary move harness in App.tsx on the iOS simulator/device and record fps·p99.

## Deferred from: code review of story 1-2-port-completo-do-engine-de-regras-para-typescript (2026-08-10, re-review)

- `matchScore.isNewRecord`/`best` conflate persisted best with live session max; the persisted value is unrecoverable once the session passes it. Contract documented + tested; revisit when app-storage lands in story 1.4 (orchestrator must call `isNewRecord` with the session-start best, never `current.best`).
- Parity suite has no multi-move / full-game seeded differential — sequence-level divergences (spawn-position loops, repeated-move score accumulation) are invisible. Deferred; unit suite + parity matrix cover the I/O matrix.

## Deferred from: code review of story 1-6-input-por-swipe-rngh-edge-cases-contract (2026-08-18)

- **Df1 — Gate/timer state machine has zero automated coverage** and the `moved ⟺ plan.length>0` invariant is unenforced across `App`/`GameBoard` (`triade/App.tsx:84-90`, `triade/src/render/GameBoard.tsx:258-268`): if the engine ever reports `moved:true` with an empty `transitionPlan` (or a React bailout skips the effect), `busyRef` stays true forever and every subsequent swipe is dropped. Current code is deadlock-free; the risk is future-regression-only. Suggest a regression test when the test harness gains the ability to drive the App/GameBoard gate state machine. Deferred — gesture/animation behavior is manual-validation domain per project rule.
- **Df2 — `tilesRef` mirrors tile state outside React's functional-update flow** (`triade/src/render/GameBoard.tsx:192, 244-245, 271-275`): any future `setTilesState` writer that forgets to sync `tilesRef` would silently corrupt subsequent plans (dropped/phantom tiles, wrong merge sources). The two current writers (`applyPlan`, `onVanish`) are consistent. Latent maintenance risk.
- **Df3 — Orientation/resize mid-animation leaves shared values in stale pixel space** (`triade/src/render/GameBoard.tsx:98-112, 174-175, 250-269`): rest tiles never re-target on `cell` change; a swipe accepted right after a resize re-plans and tiles visibly jump. Pre-existing render bug that the story 1.6 re-plan path now triggers. Manual-validation domain.
- **Df4 — `tilesRef` remains a second source of truth for tile state** (`triade/src/render/GameBoard.tsx:205, 257-258, 285-287`): re-confirmed during the story 1.6 re-review that both writers (`applyPlan`, `onVanish`) keep the ref in sync, but any future `setTilesState` writer that forgets to sync the ref would desync rendering from the plan. Latent maintenance risk (same class as Df2).
- **Df5 — GameBoard unmount clears the settle timer without releasing the App input gate** (`triade/src/render/GameBoard.tsx:215-219`, `triade/App.tsx:105-107`): the unmount cleanup `clearTimeout`s a pending settle timer but never calls `onMoveSettled`, so if the board ever unmounts mid-animation (orientation/conditional render/remount) `busyRef` stays `true` and all swipe input freezes permanently — no fallback timeout. Not reachable today (the board never unmounts). Suggest a fallback timer release if a remount path is ever added.

## Deferred from: code review of 1-4-offline-capability-instalavel-e-persistencia (2026-08-15)

- ~~**`useState(() => newGame(rngRef.current))` mutates the RNG ref inside a state initializer** (`triade/App.tsx:23`) — StrictMode double-invokes initializers, consuming the seeded `mulberry32` stream twice and making the board a non-deterministic function of the seed. Pre-existing harness (real input lands in story 1.6); `registerRootComponent` doesn't enable StrictMode today.~~ **CLOSED with verification by story 1.6 (2026-08-18):** real swipe input landed (T3), and the initializer was re-checked per T4.3 — `registerRootComponent` (Expo) does not enable StrictMode, so the initializer runs exactly once and the ref is NOT consumed twice. The board init was NOT touched, so no new test is required. Latent only if StrictMode is ever enabled (then gate the board init behind its own test).

## Deferred from: code review of story 2-1-deteccao-de-teto-de-spawn-spawn-ceiling (2026-08-20)

- `ceilingDetector` quebra em row ausente/undefined (`row.length` em undefined) (`triade/src/engine/core/ceiling.ts:5-7`). Contrato de board retangular do engine; pré-existente e consistente com o resto do core.
- Fragilidade de ponto flutuante em `tierForCeiling` para ceilings muito grandes / >MAX_SAFE_INTEGER (`triade/src/engine/core/ceiling.ts:19`). Fórmula fechada endossada pelo spec; negligible dado o bound de tiles do jogo 2048.
- Sem guard de teto superior nos tiers; `tierForCeiling` cresce ilimitado com o ceiling (`triade/src/engine/core/ceiling.ts:19`). Sem bug atual; risco de acoplamento caso consumidores assumam tiers enumerados fixos.
- Valores de tile inválidos (NaN/negativo/0) silenciosamente tratados como sem-tile (`v !== null && v > max`) (`triade/src/engine/core/ceiling.ts:9`). Inalcançável com tiles válidos positivos potências de 2; defensivo apenas.
- `tierForCeiling` não testado para entradas negativo/0/fracionário/Infinity (`triade/src/engine/core/ceiling.ts:18-19`). Entradas sempre são ceilings válidos produzidos por `ceilingDetector`.
