# Deferred Work

## Deferred from: code review of story 2-4-curva-halving-decay-normalizada (2026-08-21)

- `weightedValue` retorna `undefined` para pot vazio — a composição em `spawn.ts:18-21` guarda só `pot.length === 1`; se `potForTier` retornasse `[]`, `normalizeTo(POT_WEIGHT, [])` → `[]` → `weightedPicker([], rng)` → `0` → `pot[0]` → `undefined` silencioso de função tipada `number`. Inalcançável hoje: `potForTier` sempre retorna ≥ 1 elemento (pot.ts:8); caminho antigo via `pickIndex` igualmente quebrava em pot vazio. Pre-existing, latente para callers futuros de `potForTier`.

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

## Deferred from: code review of 2-2-pesos-fixos-1-2-em-40-40 (2026-08-21)

- Sem validação em runtime dos pesos em `spawnConfig` — edição futura dos pesos degrada silenciosamente (pot absorve excesso de probabilidade, NaN/negativo envenena as comparações e tudo vira pot); a invariante `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2] === 1-POT_WEIGHT` é guardada apenas pelo teste de soma com epsilon (`triade/src/engine/config/spawnConfig.ts:1-5`, `triade/src/engine/core/spawn.ts:11-16`). Por design do spec: 2.4 (`weightedPicker`) re-normalizará e nunca confiará na soma exata.
- `Readonly<Record<1|2, number>>` é somente compile-time; o objeto é mutável em runtime (sem `Object.freeze`) (`triade/src/engine/config/spawnConfig.ts:3`). Hardening trivial; revisitar quando 2.5 tornar `spawnConfig` configurável.
- Fallback de `rngOf` retorna 0.5 para sempre — um rng sub-provisionado num teste de `spawnTile` produz silenciosamente valor 2 em vez de falhar rápido (`triade/test-utils/helpers.ts:17-23`). Pre-existente ao diff.
- Benchmarks timing-sensitive continuam no run default do CI — script `benchmark` idêntico a `test`, mantendo benchmarks no caminho padrão (`triade/package.json`). Recomendação pré-existente do review R1 (mover benchmarks para fora do run default) ainda não atendida.
- Testes de busy-gate de `gesture-pipeline.test.ts` exercitam uma cópia local do contrato `handleSwipe`, não o wiring real de `App.tsx` (`triade/__tests__/ui/gesture-pipeline.test.ts`). Regex WIRING + suíte do pipeline cobrem o essencial; extrair handler para módulo testável é refactor para story futura. (Re-review 2026-08-21)

## Deferred from: code review of story 2-3-pot-tierizado-por-teto (2026-08-21)

- ~~Tier not wired into `spawnTile`/`move()` — the pot feature is dead via real gameplay until the tier is plumbed.~~ **CLOSED by story 2.6** (tier flows `ceilingDetector → tierForCeiling → resolveSpawn` inside `move()`).
- ~~Variable RNG draw-count per `weightedValue` call (1 roll in fixed band / tier-0 pot; 2 rolls for tier ≥ 1 pot) is behavior-pinned by draw-count tests but undocumented in the `Rng` contract.~~ **CLOSED by story 2.6** (fixed draw-budget contract documented on `Rng`: effective=3 / noop=0 / newGame=20 / resolver=1; two-stage draw deleted).
- ~~`POT_WEIGHT` is exported from `spawnConfig` but never consulted — the pot band is derived as `FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2]`.~~ **CLOSED by story 2.6** (`pickCombined` builds `[FIXED_WEIGHTS[1], FIXED_WEIGHTS[2], ...normalizeTo(POT_WEIGHT, …)]`).
- Source-text-coupled purity test (`readFileSync` + import-specifier/export regex in `pot.test.ts`) is brittle under file moves/reformats. Documented ATDD purity/`spawnConfig`-keying check; revisit if it becomes a maintenance burden.
- ~~`pickIndex` lets NaN rolls through both clamps (`NaN < 0` and `NaN >= len` both false) → `NaN` index.~~ **CLOSED by story 2.6 code review (2026-08-22)** (`Number.isFinite` guard degrades deterministically to index 0, mirroring `weightedPicker`'s NaN defense).

## Deferred from: code review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-22)

- Malformed-rng hardening without crash: a roll ≥ 1 in `weightedPicker` collapses deterministically to the top pot slot (no clamp to a valid band), and a NaN third draw is copied unvalidated into `pendingSpawn.displayRoll` (breaking the documented `[0,1)` contract silently). Pre-existing trust-the-rng class — the engine assumes well-behaved `[0,1)` rngs; only crash-capable paths (see `pickIndex` patch) were fixed this story.
- Statistical gates in `adaptive-spawn-integration.test.ts` use fixed per-test seeds (AC2 uniformity `0xc31` at N=15000, ±2% absolute ≈ ~10σ; AC7 session `0x26c6`; ceiling-ordering derived from `0x51ce + ceiling`). Deterministic tripwires today, but brittle to any future seed rotation or rng switch; document the σ budget next time these tests are touched. (Numbers corrected by the third-pass review 2026-08-23: previously said "±2% at N=10k, ~4–5σ". In that same pass the AC7 frequency gates were switched to sigma-scaled 5σ bounds — see sigmaBound in the test file — eliminating the seed-starvation/knife-edge coupling for those specific gates; AC2 and the aggregate 40/40/20 window remain absolute.)

## Deferred from: re-review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-23)

- Circular-oracle risk in rewritten `pot.test.ts`: cumulative bands are recomputed from the same formula as the implementation, so a consistently-wrong formula passes both sides; only the hand-computed inline boundary comments are independent. Fix = hand-computed expected-value table (triade/__tests__/engine/pot.test.ts).
- `spyRng` in `adaptive-spawn-integration.test.ts` silently serves `0.5` forever once its supplied values are exhausted instead of throwing — a regression that over-draws can pass frequency-style assertions unnoticed; exact `calls` deep-equal pins cover the P0 paths (triade/__tests__/engine/adaptive-spawn-integration.test.ts:16-24).
- `gameState()` test helper defaults `{ value: 1, displayRoll: 0 }` — hidden magic default silently drives ~two dozen migrated assertions and means those sessions never exercise realistic pending-value flow (triade/test-utils/helpers.ts).
- `weights.test.ts` statistical pot-sampling floor (`> N * 0.1`) is far looser than the surrounding ±1–2% frequency gates — triggers only after catastrophic failure (triade/__tests__/engine/weights.test.ts).
- `{ board: result.board, pendingSpawn: result.pendingSpawn }` reconstruction duplicated ad hoc across App.tsx + smoke/integration tests instead of a shared `stateFromResult` helper — drift risk.
- Tier-0 ceiling-ordering exception (documented "harmless" in game.ts comments) is the exact case excluded from the ceiling-ordering test — asserted nowhere.

## Deferred from: dev of story 7-1-pendingspawn-pre-resolvido-no-snapshot (2026-08-24)

- ~~**`npx tsc --noEmit -p tsconfig.test.json` fails at the repo baseline (verified pre-existing on `870c9ab` via `git stash`), so the "both tsc clean" gate cannot pass without out-of-scope work** (`triade/tsconfig.test.json`, `triade/test-utils/rn-stub.ts`). Two layers: (1) TS 6.0.3 raises TS5101 (`baseUrl` deprecated) and aborts the check before type-checking; (2) bypassing the abort (via `ignoreDeprecations: "6.0"`) exposes 3 masked type errors — `App.tsx:3` (`useWindowDimensions` not exported by the stub), `App.tsx:26` (`style` missing on `GestureHandlerRootViewProps`, RNGH types degraded by the stubbed `react-native`), `GameBoard.tsx:2` (`Platform` not exported) — because the `react-native` paths mapping swaps ALL RN types for the minimal test stub during this check. Fix requires either a fuller typed RN facade for tests or production typing changes (out of story 7.1's strict no-production-change scope). The default tsconfig gate (`npx tsc --noEmit`, the CI gate) IS clean. Waived by owner (Eduardo) 2026-08-24; trigger to close: give the test config its own RN type surface (or drop the redundant `-p` gate in favor of the default one). **Re-verified 2026-08-26 (story 6.1 review):** layer (1) still aborts at `TS5101`; adding `ignoreDeprecations: "6.0"` silences it but reveals layer (2) unchanged (3 stub-typing errors at `App.tsx:3,26`/`GameBoard.tsx:2`). Attempted single-line fix was reverted — full fix needs `triade/test-utils/rn-stub.ts` to export `useWindowDimensions`/`Platform`/`Dimensions` + a `ViewStyle`-aware facade so `react-native-gesture-handler` types resolve, i.e. the original "fuller typed RN facade" scope. Waiver stands as two-layer; do not add `ignoreDeprecations` alone. CI continues to gate on `npx tsc --noEmit` only (clean).~~ **CLOSED 2026-08-26 (trace 6.1 fix):** `triade/test-utils/rn-stub.ts` now exports `useWindowDimensions`/`Platform`/`Dimensions`/`StyleSheet.flatten`/`ViewStyle`/`TextStyle` shims + `GestureHandlerRootViewProps` alias; `triade/tsconfig.test.json` adds `ignoreDeprecations: "6.0"`; verified `npx tsc --noEmit -p tsconfig.test.json` → exit 0 (both gates clean: default `npx tsc --noEmit` + test `npx tsc --noEmit -p tsconfig.test.json`). Trigger satisfied; waiver retired. Re-verified full suite 444 pass / 0 fail, no new engine/preview diff.


## Deferred from: third-pass review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-23)

- Malformed-GameState hardening: an effective move throws TypeError if `state.pendingSpawn` is undefined (violates engine-never-throws); a noop degrades `{...undefined}` to `{}`, silently dropping both required fields; and an unvalidated `pendingSpawn.value` (NaN/non-ladder) is placed onto the board where `ceilingDetector` ignores it invisibly (triade/src/engine/core/game.ts:53,69, triade/src/engine/core/spawn.ts:61-72). Trust-the-input class — malformed GameState is outside the valid API domain; same posture as the 2026-08-22 malformed-rng deferral.

## Deferred from: code review pass 2 of 7-1-pendingspawn-pre-resolvido-no-snapshot (2026-08-24)

- Scanner regex-literal handling: `stripCommentsAndStrings` treats regex literals as plain code, so a quote/apostrophe inside a regex (e.g. `/it's/`) flips the state machine into string mode and blanks all subsequent real source until the next quote — producing false NEGATIVES in the ui.norolls structural guard. Documented as a known limitation in the helper, but the blast radius is mode-desync swallowing real code, not mere pass-through. No such pattern exists in any currently scanned view/service file; proper fix requires division-vs-regex disambiguation (real lexer work) — revisit if scanned sources ever adopt regex literals with quote characters (triade/test-utils/helpers.ts).

## Deferred from: traceability gate of story 7-2-preview-card-no-hud-60-40-nas-duas-pistas (2026-08-25)

- **7.2-AC3 — two-lane preview** (both lanes show a preview card): **IMPLEMENTED (HUD fan-out, 2026-08-24)** — `Hud` now takes `previews: { clean, accelerated }` and fans the lane-agnostic `previewFor(game.pendingSpawn)` into two labeled `PreviewCard`s (Clean / Accelerated) in portrait & landscape (`triade/src/ui/Hud.tsx`). Both lanes currently show the same pre-resolved preview; **per-lane board differentiation (distinct `pendingSpawn` per lane) remains Epic 3** — no Hud rework needed, just feed distinct `previews` when Epic 3 builds two-lane boards. Traced as `7.2-AC3` in `traceability-matrix-7-2.md`.

## Deferred from: code review of story 7-2-preview-card-no-hud-60-40-nas-duas-pistas (2026-08-24)

- `contiguousWindowContaining` returns `[value]` for any out-of-ladder value, which `PreviewCard` renders identically to an `exact` (single-element range shows as plain `"99"`) — the defensive "range" is indistinguishable from exact in the UI. Content/ambiguity semantics ("always contains truth", N3) are owned by Story 7.3 — deferred. [triade/src/game/preview.ts:25]
- `Hud` throws if the `previews` prop is omitted by a caller (`previews.clean`/`previews.accelerated` accessed unconditionally). No current caller omits it; pre-existing robustness gap — deferred. [triade/src/ui/Hud.tsx:237]

## Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-25)

- `spawnTile` muta o board de entrada e retorna a mesma referência (`board[cell[0]][cell[1]] = value; return { board, cell, value }`) — pre-existing (js/game.js idêntico), documentado desde 1-1; `move()` só passa board recém-construído por `boardFromLines`, então aliases não vazam. Não causado por 12.1, latente para callers futuros que reutilizem o board. [triade/src/engine/core/spawn.ts:82-89]
- `pickIndex` / `weightedPicker` degradam NaN/Infinity para índice 0 em vez de lançar — trust-the-rng, já documentado em deferred 2-6; `spawnTile` com pool vazio retorna `nulls` com 0 draws (engine-never-throws) enquanto `move()` assume AC4 (pool sempre não-vazio quando `moved===true`), então o orçamento de 3 draws cairia para 2 no branch inalcançável mas guardado. Pre-existing. [triade/src/engine/core/spawn.ts:35-48]

## Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-26 — gds-code-review, 3 camadas)

- D1 — Sem validação de limites/tipo em `candidates` (OOB `[4,0]`, `null`, `[r]` sem `c`) — intencionalmente não guardado por spec `spawn.ts:58-67` "add guard only if second caller"; produção garante in-bounds via `game.ts:53-64` opposite-edge. Pre-existing design decision, segunda caller dispara guard (`r>=0 && r<GRID_SIZE && board[r]?.[c]===null`). [triade/src/engine/core/spawn.ts:86]
- D2 — Duplicatas em `candidates` inflariam `pool` e enviesariam `pickIndex` (célula duplicada 2x mais provável, quebra uniforme AC3) — não alcançável via `game.ts` (push distinto por linha/coluna), só via API direta/teste. [triade/src/engine/core/spawn.ts:86]
- D3 — Compactação single-pass falha para linhas com múltiplos gaps (`[null,null,null,2]` → `[null,null,2,null]` em vez de `[2,null,null,null]`) em `shiftLine` loop `dest=i-1` — pre-existing em `line.ts:46-64`, não causado por 12.1 (só `moved` adicionado); exposição limitada porque board é sempre compactado por direção. [triade/src/engine/core/line.ts:46]
- D4 — `spawnTile` muta `board` in-place (já listado em 2026-08-25, re-confirmado) — `move()` passa board fresco de `boardFromLines`, aliases não vazam hoje. [triade/src/engine/core/spawn.ts:82]
- D5 — `pickIndex`/`weightedPicker` degradam NaN/Infinity para 0 / clamp e `pool=[]` retorna `nulls` 0 draws — trust-the-rng, branch inalcançável mas guardado per AC5 engine-never-throws. [triade/src/engine/core/spawn.ts:35]
- D6 — Acoplamento `GRID_SIZE` fixo 4x4 (`line.ts` assume 4, `helpers.ts:15` `SIZE=4`) — contrato `Board` é fixo, não configurável por nível. [triade/test-utils/helpers.ts:15 + triade/src/engine/core/line.ts:38]

## Deferred from: code review of story 7-4-invariante-preview-nunca-altera-o-spawn (2026-08-26 — gds-code-review, 3 camadas)

- ULP no boundary 0.6 — `preview.ts:80` `if (roll < 0.6)` pode flipar por 1 ULP (`0.5999999999999999` vs `0.6000000000000001` ou `0.6 - EPSILON/2` que arredonda para 0.6), quebrando invariante 60/40 por um double representável; teste atual pinna `0.599` exact / `0.6` range mas não EPSILON. Pre-existing, tolerância float do spec; engine assume `[0,1)` bem comportado. [triade/src/game/preview.ts:80]
- Fallback além do ladder (ex. `value=192` além de 96) não contém a verdade — `FULL_POT_LADDER` congela até 96; `nearestLadderIndex(192)` clamp em 96 retorna `FULL.slice(5,8)=[24,48,96]` sem 192; preview mente quando `POT_CURVE` estende além de 96. Pre-existing, limite do ladder; inalcançável com `POT_CURVE` atual. [triade/src/game/preview.ts:62]
- Mutable pot slices — `ambiguousRange` retorna `availablePotValues.slice(idx, idx+len)` mutável; caller pode `push(99)` corromper janela em cache/memo. Só `RANGE_1_2` é `Object.freeze`; demais janelas não pinam imutabilidade. Higiene React-memo de baixa prioridade. [triade/src/game/preview.ts:53]
- Board shallow ref — `gameState` guarda `board` por referência e `boardFromLines` não deep-freeze linhas; `result.board[0][0]=999` pode vazar para snapshot anterior se caller retiver referência de linha. Testes só mutam `pendingSpawn` em isolamento; `engine.purity` cobre board em outra suíte. Pre-existing desde 1-1. [triade/src/engine/core/game.ts:88]

## Deferred from: code review of story 6-1-overlay-de-game-over-com-stats-imediatos (2026-08-26 — gds-code-review, 3 camadas)

- Facade `rn-stub` + `tsconfig.test.json` fecha waiver TS5101 de duas camadas (`baseUrl` deprecation + 3 erros de tipagem `useWindowDimensions`/`GestureHandlerRootViewProps`/`Platform`) — `triade/test-utils/rn-stub.ts` agora exporta `useWindowDimensions`/`Platform`/`Dimensions`/`StyleSheet.flatten`/`ViewStyle` e `triade/tsconfig.test.json` adiciona `ignoreDeprecations: "6.0"`; `npx tsc --noEmit` e `-p tsconfig.test.json` ambos clean live 2026-08-26. Mudança fora do escopo 6.1 mas correta; defer como hygiene fechada. [triade/test-utils/rn-stub.ts:12 + triade/tsconfig.test.json:5]
- Testes 7.4 acoplados no mesmo branch: 4 pins de isolamento/snapshot/noop/direction-agnostic em `pending-spawn-contract.test.ts` + inclusão de `GameOverOverlay.tsx` no guard `ui.thinview.test.ts` — engine byte-identical, preview byte-identical; correto mas escopo cruzado com Epic 7, já deferido em `## Deferred from: code review of story 7-4...`. [triade/__tests__/engine/pending-spawn-contract.test.ts:271 + triade/__tests__/ui/ui.thinview.test.ts:8]
- Ledger pré-existente ainda aberto (ULP 0.6 no boundary 0.6, fallback além do ladder 192>96, mutable pot slices `slice()` sem freeze, board shallow ref `gameState` por referência) — `triade/src/game/preview.ts:53,62,80` + `triade/src/engine/core/game.ts:88` permanecem latentes, não causados por 6.1 (`git diff --stat -- triade/src/game/preview.ts` vazio, `triade/src/engine` vazio). Já deferido em 7-4, não reabrir aqui. [triade/src/game/preview.ts:53]

## Deferred from: code review of story 6-2-morte-elegante-em-soft-fade (2026-08-27 — gds-code-review, 3 camadas)

- ~~Stub Animated incompleto — `Animated.timing` em `triade/test-utils/rn-stub.ts:34` não avança `_value` (timing `start` apenas chama `cb` sem `setValue`), então teste de `reducedMotion=false` não valida progressão; em produção `react-native` anima corretamente. Test-tooling only, não é regressão de produção; eventual melhoria do stub pode simular `setValue(toValue)` no `timing` para gate mais fiel.~~ **CLOSED 2026-08-27 (fix commit):** `triade/test-utils/rn-stub.ts:40,55` `timing`/`spring` agora `value.setValue(config.toValue)` síncrono no `start()` — 448 pass valida progressão; `deferred-work` fechado. [triade/test-utils/rn-stub.ts:40]

## Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)

- Forfeited-continue vacuous (comment-only discard) — `triade/App.tsx:104` `// AC6/7 forfeited continue dies` sem state para descartar; futuro `continueCredit/reviveCount` burla `!continueBudget` — vacuous hoje (Clean single-lane) mas pin frágil — deferred, low. [triade/App.tsx:104 + triade/__tests__/ui/components/app.restart.test.ts:312]
- Persist race + degraded hydration discards live best — `triade/App.tsx:75-82 + 103-110` `initialScore(persistedBest)` `[persistedBest]` only; `saveBest` async vs restart pode perder record; `hydrationOkRef=false` zera best — trade-off spec para não vazar `match.best` — deferred, medium. [triade/App.tsx:75]
- Tiles corrupt after restart (null moveResult never rebuilds) — `triade/src/render/GameBoard.tsx:262-265` `if(!moveResult) return` deixa tiles stale 16->9 — não causado por 6.3 (`render` byte-identical), já deferido em 1-3 — deferred, high (pre-existing). [triade/src/render/GameBoard.tsx:262]
- Settle-timer leak fires after restart (Df5) — `triade/src/render/GameBoard.tsx:273-280` timer não limpo em `handleRestart` — Df5 já deferido — deferred. [triade/App.tsx:110]
- moved:true + empty plan deadlock (Df1) — `triade/App.tsx:91-98` + `GameBoard.tsx:275` — Df1 já deferido — deferred. [triade/src/render/GameBoard.tsx:275]
- Reduced-motion branch stale across remounts — `triade/src/ui/GameOverOverlay.tsx:26-50` `useRef` captura só 1º mount — não alcançável hoje `reducedMotion={false}` — deferred, low. [triade/src/ui/GameOverOverlay.tsx:26]
- insets undefined / rotation during fade — `triade/src/ui/GameOverOverlay.tsx:17-20` defensivo `?.top ??0` — edge tablet — deferred, low. [triade/src/ui/GameOverOverlay.tsx:17]
- RNG determinism discontinuity never reseeded — `triade/App.tsx:40` `mulberry32(20260808)` único — deferred, low. [triade/App.tsx:40]
- AvailablePot fan-out stale com deflate — `triade/App.tsx:152` + `preview.ts:55-65` — FR-43 edge — deferred, low. [triade/src/game/preview.ts:55]
- Navigation/hardware-back não bloqueado — `triade/src/ui/GameOverOverlay.tsx:56-64` + `triade/App.tsx:184` — não bloqueia `BackHandler` — deferred, medium (Epic 3/4). [triade/src/ui/GameOverOverlay.tsx:62]
- Stroke tiling restart during gesture race — `triade/App.tsx:119-139` `doMoveRef` + `panGesture` `runOnJS:true` — Df1-4 ledger — deferred, medium. [triade/App.tsx:133]

## Deferred from: code review of story 6-4-novo-recorde-como-numero-destacado (2026-08-28 — gds-code-review, 3 camadas)

- Hydration failure `ok:false` falso-positivo: `loadBest()` degradado retorna `{best:0,ok:false}` mas `sessionStartBestRef=0` faz `isNewRecord(0,50)=true` acender recorde indevido para usuário com recorde 500. Pré-existente (App byte-identical), fora de escopo 6.4 verify-only; reavaliar em Epic 9/storage quando `hydrationOkRef` bloquear highlight. [triade/App.tsx:59-60,75-81,193]
- Stale `sessionStartBestRef` multi-jogo: após recorde 150, segundo jogo 120 com `sessionStartBestRef 100` ainda acende (`100<120`) mesmo `persistedBest` já 150 — semântica cross-restart ambígua; spec mantém ref na sessão para não vazar `match.best`, mas sem update pós-persist. Pré-existente, Epic 3/6 follow-up. [triade/App.tsx:42,60,103-111,193]
- Corrida async `saveBest`: `handleRestart` com `persistedBest` stale se restart antes de `saveBest` resolver; `initialScore(persistedBest)` captura 100 não 150. Pré-existente, manual-validation. [triade/App.tsx:75-82,108]
- Entradas não-finitas/corrompidas: `previousBest -5/NaN/Infinity` ou `score NaN/Infinity` → highlight ou render `"NaN"` sem `Number.isFinite` guard; `parseBest` já rejeita mas bypass via MMKV nativo possível. Contrato `MatchScore` garante finitos. [triade/src/game/matchScore.ts:20; triade/src/services/storage/settingsStore.ts:64-70]
- Overflow layout: `score >1e9` estoura `row space-between` sem `numberOfLines/ellipsizeMode/flexShrink` no `GameOverOverlay`. Pré-existente, fora de MVP. [triade/src/ui/GameOverOverlay.tsx:131-146]
- `reducedMotion`/`insets`/`zIndex` carriers: toggle `useRef` one-time init sem re-target; `insets` parcial/negativo/NaN não clamped; `zIndex:2` vs `Hud 1` não testado integrado; `unmount` mid-fade single-cycle. Pré-existente, Epic 9 / manual. [triade/src/ui/GameOverOverlay.tsx:17-20,26-28,111-117]
- Ladder ceiling não pinado end-to-end: novo teste varia só `stats.maxTile` prop (thin-view correto), não cadeia `ceilingDetector→tierForCeiling→potForTier`; `isNewRecord(match.best,…)` leak via alias não Runtime-pinado. Thin-view é intencional per spec; cadeia é `engine.purity`/`preview-invariant`. [triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts:229; triade/src/engine/core/ceiling.ts:17]
