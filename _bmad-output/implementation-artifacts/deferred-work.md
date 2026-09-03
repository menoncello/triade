# Deferred Work

### DW-1: `weightedValue` retorna `undefined` para pot vazio — a composição em `spawn.ts:18-21` guarda só `pot.length === 1`; se `potForTier` retornasse `[]`, `normalizeTo(POT_WEIGHT, [])` → `[]` → `weightedPicker([], rng)` → `0` → `pot[0]` → `undefined` silencioso de função tipada `number`. Inalcançável hoje: `potForTier` sempre retorna ≥ 1 elemento (pot.ts:8); caminho antigo via `pickIndex` igualmente quebrava em pot vazio. Pre-existing, latente para callers futuros de `potForTier`.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-4-curva-halving-decay-normalizada (2026-08-21)"), 2026-09-01
location: spawn.ts:18-21
reason: `weightedValue` retorna `undefined` para pot vazio — a composição em `spawn.ts:18-21` guarda só `pot.length === 1`; se `potForTier` retornasse `[]`, `normalizeTo(POT_WEIGHT, [])` → `[]` → `weightedPicker([], rng)` → `0` → `pot[0]` → `undefined` silencioso de função tipada `number`. Inalcançável hoje: `potForTier` sempre retorna ≥ 1 elemento (pot.ts:8); caminho antigo via `pickIndex` igualmente quebrava em pot vazio. Pre-existing, latente para callers futuros de `potForTier`.
status: done 2026-09-01
resolution: already resolved: triade/src/engine/core/spawn.ts:16-22 pickCombined handles pot=[] via FIXED_WEIGHTS bands so weightedValue never returns undefined; pot.ts:7-8 always >=1

### DW-2: Preview placeholder (76×76) overlaps the centered "TEMP move harness" hint text on devices with `insets.bottom === 0` (visual only — card is `pointerEvents="none"`) (`triade/src/ui/Hud.tsx:53`, `triade/App.tsx:131`). Temp harness is replaced by real swipe input in story 1.6.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: triade/src/ui/Hud.tsx:53
reason: Preview placeholder (76×76) overlaps the centered "TEMP move harness" hint text on devices with `insets.bottom === 0` (visual only — card is `pointerEvents="none"`) (`triade/src/ui/Hud.tsx:53`, `triade/App.tsx:131`). Temp harness is replaced by real swipe input in story 1.6.
status: done 2026-08-18
resolution: CLOSED by story 1.6 (2026-08-18): T3.1 removed the TEMP hint text and the harness from App.tsx; placeholder no longer overlaps

### DW-3: `stripComments` corrupts string/regex literals containing `//` or `/*` — the purity/thin-view tripwire can false-pass or false-fail on future edits that embed such literals (`triade/test-utils/helpers.ts:67-71`). Test-tooling robustness; current files are clean.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: triade/test-utils/helpers.ts:67-71
reason: `stripComments` corrupts string/regex literals containing `//` or `/*` — the purity/thin-view tripwire can false-pass or false-fail on future edits that embed such literals (`triade/test-utils/helpers.ts:67-71`). Test-tooling robustness; current files are clean.
status: done 2026-09-01
resolution: resolved by sweep bundle dw-test-scanner-helpers-hardening
resolution-undo: d03bd19660d953d51029cb993603729020df8a32a61c092cb18da7891621edd3 2026-09-01 7374617475733a206f70656e

### DW-4: `boardSize` clamps to 0 on degenerate/tiny windows (the old 40pt floor was removed; the 360 cap removal is intended per UX-DR-20 container-driven maximize) (`triade/src/ui/layout.ts:31`). Acceptable per spec; board simply doesn't render on absurd sizes.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: triade/src/ui/layout.ts:31
reason: `boardSize` clamps to 0 on degenerate/tiny windows (the old 40pt floor was removed; the 360 cap removal is intended per UX-DR-20 container-driven maximize) (`triade/src/ui/layout.ts:31`). Acceptable per spec; board simply doesn't render on absurd sizes.
status: open

### DW-5: NaN/Infinity inputs propagate NaN through `layoutFor` despite the "all finite" test sweeping only finite sizes (`triade/__tests__/ui/layout.test.ts:189`). Runtime inputs from `useWindowDimensions` are always finite.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: triade/__tests__/ui/layout.test.ts:189
reason: NaN/Infinity inputs propagate NaN through `layoutFor` despite the "all finite" test sweeping only finite sizes (`triade/__tests__/ui/layout.test.ts:189`). Runtime inputs from `useWindowDimensions` are always finite.
status: done 2026-09-01
resolution: resolved by sweep bundle dw-layout-band-dedup-and-guard
resolution-undo: 6f4ef234ac5b66d54037f0d76159f5f7967a91d50f0d5c9f7935907eaeec7467 2026-09-01 7374617475733a206f70656e

### DW-6: Rotation race: `useSafeAreaInsets` lags `useWindowDimensions` by a frame → board can flash to 0; `SafeAreaProvider` mounts without `initialMetrics`; ScrollView offset persists across rotation (`triade/App.tsx:28-30,103`). Native polish, manual-validation domain.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: triade/App.tsx:28-30
reason: Rotation race: `useSafeAreaInsets` lags `useWindowDimensions` by a frame → board can flash to 0; `SafeAreaProvider` mounts without `initialMetrics`; ScrollView offset persists across rotation (`triade/App.tsx:28-30,103`). Native polish, manual-validation domain.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-decision-dw-6
resolution-undo: 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Add initialMetrics plus synced hook — Provide SafeAreaProvider initialMetrics and synced insets effect that debounces rotation so board never flashes to 0; verify on simulator landscape rotation.

### DW-7: Status bar legibility / band-under-status-bar on non-notch landscape (light UI + `StatusBar style="auto"`). Manual validation domain.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: n/a
reason: Status bar legibility / band-under-status-bar on non-notch landscape (light UI + `StatusBar style="auto"`). Manual validation domain.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-decision-dw-7
resolution-undo: 0fca74990eec61dcdc0ddb42ec0e67898120b24fce4833ecc178f18ed2a2d422 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Force dark status bar — Set StatusBar style dark on landscape light backgrounds and verify contrast on device.

### DW-8: Preview placeholder Views aren't a11y-hidden (`accessible={false}`), and the raw score lacks a thousands separator vs the mockup's "3.240" (`triade/src/ui/Hud.tsx:26,48`). Out of scope — preview data is Epic 7, a11y is Epic 9.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: triade/src/ui/Hud.tsx:26
reason: Preview placeholder Views aren't a11y-hidden (`accessible={false}`), and the raw score lacks a thousands separator vs the mockup's "3.240" (`triade/src/ui/Hud.tsx:26,48`). Out of scope — preview data is Epic 7, a11y is Epic 9.
status: open

### DW-9: Temp move harness + ScrollView not `__DEV__`-gated — ships to production until story 1.6 replaces the input path. Documented temp state.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: n/a
reason: Temp move harness + ScrollView not `__DEV__`-gated — ships to production until story 1.6 replaces the input path. Documented temp state.
status: done 2026-08-18
resolution: CLOSED by story 1.6 (2026-08-18): T3.1 removed the DirButton controls, the ScrollView, and the hint from App.tsx; board now renders in a plain View with real RNGH swipe input

### DW-10: Band height formula duplicated between `App.tsx` (`bandTop`) and `Hud.tsx` (`topPad + bandHeight`) — drift risk on future margin changes (`triade/App.tsx:31`).

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: App.tsx
reason: Band height formula duplicated between `App.tsx` (`bandTop`) and `Hud.tsx` (`topPad + bandHeight`) — drift risk on future margin changes (`triade/App.tsx:31`).
status: done 2026-09-01
resolution: resolved by sweep bundle dw-layout-band-dedup-and-guard
resolution-undo: 6f4ef234ac5b66d54037f0d76159f5f7967a91d50f0d5c9f7935907eaeec7467 2026-09-01 7374617475733a206f70656e

### DW-11: Story doc T2 note says "12 layout tests"; final suite is 14 (clamp-path + golden-anchor tests added in the 2026-08-17 review fixes). Doc-only.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-5-layout-portrait-e-landscape (2026-08-17)"), 2026-09-01
location: n/a
reason: Story doc T2 note says "12 layout tests"; final suite is 14 (clamp-path + golden-anchor tests added in the 2026-08-17 review fixes). Doc-only.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-doc-layout-test-count-sync
resolution-undo: 8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb 2026-09-02 7374617475733a206f70656e

### DW-12: Landscape rotation visual pass on the simulator

origin: migrated from legacy ledger ("Deferred from: story 1-5-layout-portrait-e-landscape (2026-08-16)"), 2026-09-01
location: n/a
reason: Landscape rotation visual pass on the simulator
status: done 2026-08-19
resolution: CLOSED (2026-08-19): visual pass confirmed on simulator — thin 22pt/11pt top edge band renders correctly in landscape, board dominates, pause reachable

### DW-13: `user-scalable=no` + `maximum-scale=1.0` block pinch-zoom — accessibility tradeoff for a swipe game; revisit for a11y pass.

origin: migrated from legacy ledger ("Deferred from: code review (2026-08-06)"), 2026-09-01
location: n/a
reason: `user-scalable=no` + `maximum-scale=1.0` block pinch-zoom — accessibility tradeoff for a swipe game; revisit for a11y pass.
status: open

### DW-14: Board `role="grid"` has no row/gridcell semantics or live-region score announcements — screen readers get an empty grid.

origin: migrated from legacy ledger ("Deferred from: code review (2026-08-06)"), 2026-09-01
location: n/a
reason: Board `role="grid"` has no row/gridcell semantics or live-region score announcements — screen readers get an empty grid.
status: open

### DW-15: dev-build boot on a physical iOS device (Expo prebuild + Xcode; requires connected iPhone + CocoaPods). Simulator boot validated instead (2026-08-10): dev build boots and the Skia board renders on the iOS runtime.

origin: migrated from legacy ledger ("Deferred from: Story 1-1 device gates (2026-08-10)"), 2026-09-01
location: n/a
reason: dev-build boot on a physical iOS device (Expo prebuild + Xcode; requires connected iPhone + CocoaPods). Simulator boot validated instead (2026-08-10): dev build boots and the Skia board renders on the iOS runtime.
status: open

### DW-16: on-device frame-rate baseline

origin: migrated from legacy ledger ("Deferred from: Story 1-1 device gates (2026-08-10)"), 2026-09-01
location: n/a
reason: on-device frame-rate baseline
status: open

### DW-17: Trigger to resume:

origin: migrated from legacy ledger ("Deferred from: Story 1-1 device gates (2026-08-10)"), 2026-09-01
location: n/a
reason: Trigger to resume:
status: open

### DW-18: pickIndex lets NaN slip through both clamps and crashes spawnTile

origin: migrated from legacy ledger ("Deferred from: code review of story 1-1-technical-spike-engine-ts-board-skia-benchmark-ci (2026-08-10)"), 2026-09-01
location: n/a
reason: pickIndex lets NaN slip through both clamps and crashes spawnTile
status: done 2026-09-01
resolution: already resolved: triade/src/engine/core/spawn.ts:45 Number.isFinite(idx) guard degrades NaN to 0 — fixed in story 2.6

### DW-19: pickIndex returns -1 when len===0

origin: migrated from legacy ledger ("Deferred from: code review of story 1-1-technical-spike-engine-ts-board-skia-benchmark-ci — pass 2 (2026-08-10)"), 2026-09-01
location: n/a
reason: pickIndex returns -1 when len===0
status: done 2026-09-01
resolution: already resolved: triade/src/engine/core/spawn.ts:40 len<=0 return 0 replaces former return -1 — fixed in story 2.6

### DW-20: shiftLine/move/boardFromLines assume 4x4 and crash on shorter input

origin: migrated from legacy ledger ("Deferred from: code review of story 1-1-technical-spike-engine-ts-board-skia-benchmark-ci — pass 2 (2026-08-10)"), 2026-09-01
location: n/a
reason: shiftLine/move/boardFromLines assume 4x4 and crash on shorter input
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-line-compaction
resolution-undo: 26a75af183b8ffbe96535a58ff2c6ec6f12a3a000117765a9f94e84b21702c64 2026-09-02 7374617475733a206f70656e

### DW-21: Noop moves return a full trace of stationary tiles

origin: migrated from legacy ledger ("Deferred from: code review of story 1-1-technical-spike-engine-ts-board-skia-benchmark-ci — pass 2 (2026-08-10)"), 2026-09-01
location: n/a
reason: Noop moves return a full trace of stationary tiles
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-trace-merge-guards
resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b 2026-09-02 7374617475733a206f70656e

### DW-22: mergeValue ignores its second operand outside the canMerge guard

origin: migrated from legacy ledger ("Deferred from: code review of story 1-1-technical-spike-engine-ts-board-skia-benchmark-ci — pass 2 (2026-08-10)"), 2026-09-01
location: n/a
reason: mergeValue ignores its second operand outside the canMerge guard
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-trace-merge-guards
resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b 2026-09-02 7374617475733a206f70656e

### DW-23: spawnTile mutates its input board and returns the same reference

origin: migrated from legacy ledger ("Deferred from: code review of story 1-1-technical-spike-engine-ts-board-skia-benchmark-ci — pass 2 (2026-08-10)"), 2026-09-01
location: n/a
reason: spawnTile mutates its input board and returns the same reference
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-spawn-mutation-hygiene
resolution-undo: b85f43d1a077f8ad7f8d33c07155f5e3ae81c44b4b974f1cfcc598d8b869d26e 2026-09-02 7374617475733a206f70656e

### DW-24: `matchScore.applyMove` has no guard on `result.score` — a NaN poisons both score and best; `moved:false` with score>0 would inflate. Engine contract guarantees finite ≥0 scores and noop scores 0; defensive guard only.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-2-port-completo-do-engine-de-regras-para-typescript (2026-08-10)"), 2026-09-01
location: n/a
reason: `matchScore.applyMove` has no guard on `result.score` — a NaN poisons both score and best; `moved:false` with score>0 would inflate. Engine contract guarantees finite ≥0 scores and noop scores 0; defensive guard only.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-defensive-guards
resolution-undo: f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18 2026-09-02 7374617475733a206f70656e

### DW-25: Parity `spawnTile` only cross-checks the non-full-board path; the spawn-nothing branch (full board) is covered by the absolute unit test `game.test.ts:198`, not parity.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-2-port-completo-do-engine-de-regras-para-typescript (2026-08-10)"), 2026-09-01
location: game.test.ts:198
reason: Parity `spawnTile` only cross-checks the non-full-board path; the spawn-nothing branch (full board) is covered by the absolute unit test `game.test.ts:198`, not parity.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-parity-hardening
resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b 2026-09-02 7374617475733a206f70656e

### DW-26: 13 parity move scenarios assert only TS===web, never an absolute outcome — inherent shared-bug blind spot. Mitigated by absolute-assertion unit suite (`game.test.ts`); header comment documents the limitation.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-2-port-completo-do-engine-de-regras-para-typescript (2026-08-10)"), 2026-09-01
location: game.test.ts
reason: 13 parity move scenarios assert only TS===web, never an absolute outcome — inherent shared-bug blind spot. Mitigated by absolute-assertion unit suite (`game.test.ts`); header comment documents the limitation.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-parity-hardening
resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b 2026-09-02 7374617475733a206f70656e

### DW-27: AC-4 no-leak automated coverage stops at the planner (`resultingTiles` oracle); `GameBoard` reconcile/remove is manual-only — project rule: Skia animation is manual validation; the leak itself is fixed by the merge-ghost patch.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-3-board-skia-declarativo-dirigido-pelo-trace (2026-08-13)"), 2026-09-01
location: n/a
reason: AC-4 no-leak automated coverage stops at the planner (`resultingTiles` oracle); `GameBoard` reconcile/remove is manual-only — project rule: Skia animation is manual validation; the leak itself is fixed by the merge-ghost patch.
status: open

### DW-28: `moveResult === null` after a previous non-null leaves tile state stale in `GameBoard.tsx:171-175` — unreachable today (App never resets); latent for the future new-game/reset path.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-3-board-skia-declarativo-dirigido-pelo-trace (2026-08-13)"), 2026-09-01
location: GameBoard.tsx:171-175
reason: `moveResult === null` after a previous non-null leaves tile state stale in `GameBoard.tsx:171-175` — unreachable today (App never resets); latent for the future new-game/reset path.
status: done 2026-09-02
resolution: already resolved: triade/src/render/GameBoard.tsx:449-465 rebuildTilesFromBoard on moveResult null after non-null plus settle timer clear — stale tile state after App reset is now rebuilt, verified in current tree

### DW-29: Temp harness `doMove` stale board closure drops rapid same-frame moves (`triade/App.tsx:20-27`) — temporary code replaced by real input in story 1.6.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-3-board-skia-declarativo-dirigido-pelo-trace (2026-08-13)"), 2026-09-01
location: triade/App.tsx:20-27
reason: Temp harness `doMove` stale board closure drops rapid same-frame moves (`triade/App.tsx:20-27`) — temporary code replaced by real input in story 1.6.
status: done 2026-08-18
resolution: CLOSED by story 1.6 (2026-08-18): replaced harness with RNGH Gesture.Pan() + busyRef in-flight gate; stable gesture reads latest doMove through doMoveRef

### DW-30: `classify` dereferences `entry.from[0]` unguarded (`triade/src/render/transitionPlan.ts:21-26`) — engine contract guarantees non-empty `from` for non-spawn entries; defensive hardening only.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-3-board-skia-declarativo-dirigido-pelo-trace (2026-08-13)"), 2026-09-01
location: triade/src/render/transitionPlan.ts:21-26
reason: `classify` dereferences `entry.from[0]` unguarded (`triade/src/render/transitionPlan.ts:21-26`) — engine contract guarantees non-empty `from` for non-spawn entries; defensive hardening only.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-defensive-guards
resolution-undo: f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18 2026-09-02 7374617475733a206f70656e

### DW-31: Purity scan blind spots — `PURITY_FILES` is a hand-maintained explicit list (a new pure file in `src/render` silently escapes the ADR-01/05 scan until edited); `FORBIDDEN_PREFIXES` misses a hypothetical bare `reanimated`/`skia` import (`triade/__tests__/engine/engine.purity.test.ts:12-16`). Current files are covered; maintenance hardening only.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-3-board-skia-declarativo-dirigido-pelo-trace (2026-08-13)"), 2026-09-01
location: triade/__tests__/engine/engine.purity.test.ts:12-16
reason: Purity scan blind spots — `PURITY_FILES` is a hand-maintained explicit list (a new pure file in `src/render` silently escapes the ADR-01/05 scan until edited); `FORBIDDEN_PREFIXES` misses a hypothetical bare `reanimated`/`skia` import (`triade/__tests__/engine/engine.purity.test.ts:12-16`). Current files are covered; maintenance hardening only.
status: done 2026-09-01
resolution: already resolved: triade/__tests__/engine/engine.purity.test.ts:7-27 PURITY_ROOTS auto-scan via collectTsFiles plus FORBIDDEN_PREFIXES includes bare reanimated/skia — blind spots closed

### DW-32: AC-5 (60 FPS / 10-min session) has no completed rendering-side evidence — only the planner micro-benchmark exists; the simulator/device frame-rate reading stays open as "Manual validation remaining" (project rule: Skia animation is manual validation; informative only). Trigger to close: run the temporary move harness in App.tsx on the iOS simulator/device and record fps·p99.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-3-board-skia-declarativo-dirigido-pelo-trace (2026-08-13, re-review)"), 2026-09-01
location: App.tsx
reason: AC-5 (60 FPS / 10-min session) has no completed rendering-side evidence — only the planner micro-benchmark exists; the simulator/device frame-rate reading stays open as "Manual validation remaining" (project rule: Skia animation is manual validation; informative only). Trigger to close: run the temporary move harness in App.tsx on the iOS simulator/device and record fps·p99.
status: open

### DW-33: `matchScore.isNewRecord`/`best` conflate persisted best with live session max; the persisted value is unrecoverable once the session passes it. Contract documented + tested; revisit when app-storage lands in story 1.4 (orchestrator must call `isNewRecord` with the session-start best, never `current.best`).

origin: migrated from legacy ledger ("Deferred from: code review of story 1-2-port-completo-do-engine-de-regras-para-typescript (2026-08-10, re-review)"), 2026-09-01
location: n/a
reason: `matchScore.isNewRecord`/`best` conflate persisted best with live session max; the persisted value is unrecoverable once the session passes it. Contract documented + tested; revisit when app-storage lands in story 1.4 (orchestrator must call `isNewRecord` with the session-start best, never `current.best`).
status: done 2026-09-02
resolution: already resolved: triade/src/game/matchScore.ts:21-23 isNewRecord uses sessionStartBest + triade/App.tsx:112,180,215-217 sessionStartBestByLaneRef/hydrationOkByLaneRef now correctly scopes per-lane persisted best — contract documented and tested, app-storage revisit from 1.4 closed

### DW-34: Parity suite has no multi-move / full-game seeded differential — sequence-level divergences (spawn-position loops, repeated-move score accumulation) are invisible. Deferred; unit suite + parity matrix cover the I/O matrix.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-2-port-completo-do-engine-de-regras-para-typescript (2026-08-10, re-review)"), 2026-09-01
location: n/a
reason: Parity suite has no multi-move / full-game seeded differential — sequence-level divergences (spawn-position loops, repeated-move score accumulation) are invisible. Deferred; unit suite + parity matrix cover the I/O matrix.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-parity-hardening
resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b 2026-09-02 7374617475733a206f70656e

### DW-35: Gate/timer state machine has zero automated coverage and the `moved ⟺ plan.length>0` invariant is unenforced across `App`/`GameBoard` (`triade/App.tsx:84-90`, `triade/src/render/GameBoard.tsx:258-268`): if the engine ever reports `moved:true` with an empty `transitionPlan` (or a React bailout skips the effect), `busyRef` stays true forever and every subsequent swipe is dropped. Current code is deadlock-free; the risk is future-regression-only. Suggest a regression test when the test harness gains the ability to drive the App/GameBoard gate state machine. Deferred — gesture/animation behavior is manual-validation domain per project rule.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-6-input-por-swipe-rngh-edge-cases-contract (2026-08-18)"), 2026-09-01
location: triade/App.tsx:84-90
reason: Gate/timer state machine has zero automated coverage and the `moved ⟺ plan.length>0` invariant is unenforced across `App`/`GameBoard` (`triade/App.tsx:84-90`, `triade/src/render/GameBoard.tsx:258-268`): if the engine ever reports `moved:true` with an empty `transitionPlan` (or a React bailout skips the effect), `busyRef` stays true forever and every subsequent swipe is dropped. Current code is deadlock-free; the risk is future-regression-only. Suggest a regression test when the test harness gains the ability to drive the App/GameBoard gate state machine. Deferred — gesture/animation behavior is manual-validation domain per project rule.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-render-gate-hardening
resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c 2026-09-02 7374617475733a206f70656e

### DW-36: `tilesRef` mirrors tile state outside React's functional-update flow (`triade/src/render/GameBoard.tsx:192, 244-245, 271-275`): any future `setTilesState` writer that forgets to sync `tilesRef` would silently corrupt subsequent plans (dropped/phantom tiles, wrong merge sources). The two current writers (`applyPlan`, `onVanish`) are consistent. Latent maintenance risk.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-6-input-por-swipe-rngh-edge-cases-contract (2026-08-18)"), 2026-09-01
location: triade/src/render/GameBoard.tsx:192
reason: `tilesRef` mirrors tile state outside React's functional-update flow (`triade/src/render/GameBoard.tsx:192, 244-245, 271-275`): any future `setTilesState` writer that forgets to sync `tilesRef` would silently corrupt subsequent plans (dropped/phantom tiles, wrong merge sources). The two current writers (`applyPlan`, `onVanish`) are consistent. Latent maintenance risk.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-render-gate-hardening
resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c 2026-09-02 7374617475733a206f70656e

### DW-37: Orientation/resize mid-animation leaves shared values in stale pixel space (`triade/src/render/GameBoard.tsx:98-112, 174-175, 250-269`): rest tiles never re-target on `cell` change; a swipe accepted right after a resize re-plans and tiles visibly jump. Pre-existing render bug that the story 1.6 re-plan path now triggers. Manual-validation domain.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-6-input-por-swipe-rngh-edge-cases-contract (2026-08-18)"), 2026-09-01
location: triade/src/render/GameBoard.tsx:98-112
reason: Orientation/resize mid-animation leaves shared values in stale pixel space (`triade/src/render/GameBoard.tsx:98-112, 174-175, 250-269`): rest tiles never re-target on `cell` change; a swipe accepted right after a resize re-plans and tiles visibly jump. Pre-existing render bug that the story 1.6 re-plan path now triggers. Manual-validation domain.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-decision-dw-37
resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Retarget all kinds on cell change — Add cell-change effect retargeting x/y shared values for rest/vanish/move tiles to new pixel grid.

### DW-38: `tilesRef` remains a second source of truth for tile state (`triade/src/render/GameBoard.tsx:205, 257-258, 285-287`): re-confirmed during the story 1.6 re-review that both writers (`applyPlan`, `onVanish`) keep the ref in sync, but any future `setTilesState` writer that forgets to sync the ref would desync rendering from the plan. Latent maintenance risk (same class as Df2).

origin: migrated from legacy ledger ("Deferred from: code review of story 1-6-input-por-swipe-rngh-edge-cases-contract (2026-08-18)"), 2026-09-01
location: triade/src/render/GameBoard.tsx:205
reason: `tilesRef` remains a second source of truth for tile state (`triade/src/render/GameBoard.tsx:205, 257-258, 285-287`): re-confirmed during the story 1.6 re-review that both writers (`applyPlan`, `onVanish`) keep the ref in sync, but any future `setTilesState` writer that forgets to sync the ref would desync rendering from the plan. Latent maintenance risk (same class as Df2).
status: done 2026-09-02
resolution: resolved by sweep bundle dw-render-gate-hardening
resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c 2026-09-02 7374617475733a206f70656e

### DW-39: GameBoard unmount clears the settle timer without releasing the App input gate (`triade/src/render/GameBoard.tsx:215-219`, `triade/App.tsx:105-107`): the unmount cleanup `clearTimeout`s a pending settle timer but never calls `onMoveSettled`, so if the board ever unmounts mid-animation (orientation/conditional render/remount) `busyRef` stays `true` and all swipe input freezes permanently — no fallback timeout. Not reachable today (the board never unmounts). Suggest a fallback timer release if a remount path is ever added.

origin: migrated from legacy ledger ("Deferred from: code review of story 1-6-input-por-swipe-rngh-edge-cases-contract (2026-08-18)"), 2026-09-01
location: triade/src/render/GameBoard.tsx:215-219
reason: GameBoard unmount clears the settle timer without releasing the App input gate (`triade/src/render/GameBoard.tsx:215-219`, `triade/App.tsx:105-107`): the unmount cleanup `clearTimeout`s a pending settle timer but never calls `onMoveSettled`, so if the board ever unmounts mid-animation (orientation/conditional render/remount) `busyRef` stays `true` and all swipe input freezes permanently — no fallback timeout. Not reachable today (the board never unmounts). Suggest a fallback timer release if a remount path is ever added.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-render-gate-hardening
resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c 2026-09-02 7374617475733a206f70656e

### DW-40: `useState(() => newGame(rngRef.current))` mutates the RNG ref inside a state initializer

origin: migrated from legacy ledger ("Deferred from: code review of 1-4-offline-capability-instalavel-e-persistencia (2026-08-15)"), 2026-09-01
location: n/a
reason: `useState(() => newGame(rngRef.current))` mutates the RNG ref inside a state initializer
status: done 2026-08-18
resolution: CLOSED with verification by story 1.6 (2026-08-18): RNG input handled; StrictMode not enabled, initializer runs once; latent only if StrictMode ever enabled

### DW-41: `ceilingDetector` quebra em row ausente/undefined (`row.length` em undefined) (`triade/src/engine/core/ceiling.ts:5-7`). Contrato de board retangular do engine; pré-existente e consistente com o resto do core.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-1-deteccao-de-teto-de-spawn-spawn-ceiling (2026-08-20)"), 2026-09-01
location: triade/src/engine/core/ceiling.ts:5-7
reason: `ceilingDetector` quebra em row ausente/undefined (`row.length` em undefined) (`triade/src/engine/core/ceiling.ts:5-7`). Contrato de board retangular do engine; pré-existente e consistente com o resto do core.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-ceiling-hardening
resolution-undo: d403df0b7bb1b95ec4972b76d57119d999b1f9dd29ace759488cd6921759a517 2026-09-02 7374617475733a206f70656e

### DW-42: Fragilidade de ponto flutuante em `tierForCeiling` para ceilings muito grandes / >MAX_SAFE_INTEGER (`triade/src/engine/core/ceiling.ts:19`). Fórmula fechada endossada pelo spec; negligible dado o bound de tiles do jogo 2048.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-1-deteccao-de-teto-de-spawn-spawn-ceiling (2026-08-20)"), 2026-09-01
location: triade/src/engine/core/ceiling.ts:19
reason: Fragilidade de ponto flutuante em `tierForCeiling` para ceilings muito grandes / >MAX_SAFE_INTEGER (`triade/src/engine/core/ceiling.ts:19`). Fórmula fechada endossada pelo spec; negligible dado o bound de tiles do jogo 2048.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-ceiling-hardening
resolution-undo: d403df0b7bb1b95ec4972b76d57119d999b1f9dd29ace759488cd6921759a517 2026-09-02 7374617475733a206f70656e

### DW-43: Sem guard de teto superior nos tiers; `tierForCeiling` cresce ilimitado com o ceiling (`triade/src/engine/core/ceiling.ts:19`). Sem bug atual; risco de acoplamento caso consumidores assumam tiers enumerados fixos.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-1-deteccao-de-teto-de-spawn-spawn-ceiling (2026-08-20)"), 2026-09-01
location: triade/src/engine/core/ceiling.ts:19
reason: Sem guard de teto superior nos tiers; `tierForCeiling` cresce ilimitado com o ceiling (`triade/src/engine/core/ceiling.ts:19`). Sem bug atual; risco de acoplamento caso consumidores assumam tiers enumerados fixos.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-ceiling-hardening
resolution-undo: d403df0b7bb1b95ec4972b76d57119d999b1f9dd29ace759488cd6921759a517 2026-09-02 7374617475733a206f70656e

### DW-44: Valores de tile inválidos (NaN/negativo/0) silenciosamente tratados como sem-tile (`v !== null && v > max`) (`triade/src/engine/core/ceiling.ts:9`). Inalcançável com tiles válidos positivos potências de 2; defensivo apenas.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-1-deteccao-de-teto-de-spawn-spawn-ceiling (2026-08-20)"), 2026-09-01
location: triade/src/engine/core/ceiling.ts:9
reason: Valores de tile inválidos (NaN/negativo/0) silenciosamente tratados como sem-tile (`v !== null && v > max`) (`triade/src/engine/core/ceiling.ts:9`). Inalcançável com tiles válidos positivos potências de 2; defensivo apenas.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-ceiling-hardening
resolution-undo: d403df0b7bb1b95ec4972b76d57119d999b1f9dd29ace759488cd6921759a517 2026-09-02 7374617475733a206f70656e

### DW-45: `tierForCeiling` não testado para entradas negativo/0/fracionário/Infinity (`triade/src/engine/core/ceiling.ts:18-19`). Entradas sempre são ceilings válidos produzidos por `ceilingDetector`.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-1-deteccao-de-teto-de-spawn-spawn-ceiling (2026-08-20)"), 2026-09-01
location: triade/src/engine/core/ceiling.ts:18-19
reason: `tierForCeiling` não testado para entradas negativo/0/fracionário/Infinity (`triade/src/engine/core/ceiling.ts:18-19`). Entradas sempre são ceilings válidos produzidos por `ceilingDetector`.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-ceiling-hardening
resolution-undo: d403df0b7bb1b95ec4972b76d57119d999b1f9dd29ace759488cd6921759a517 2026-09-02 7374617475733a206f70656e

### DW-46: Sem validação em runtime dos pesos em `spawnConfig` — edição futura dos pesos degrada silenciosamente (pot absorve excesso de probabilidade, NaN/negativo envenena as comparações e tudo vira pot); a invariante `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2] === 1-POT_WEIGHT` é guardada apenas pelo teste de soma com epsilon (`triade/src/engine/config/spawnConfig.ts:1-5`, `triade/src/engine/core/spawn.ts:11-16`). Por design do spec: 2.4 (`weightedPicker`) re-normalizará e nunca confiará na soma exata.

origin: migrated from legacy ledger ("Deferred from: code review of 2-2-pesos-fixos-1-2-em-40-40 (2026-08-21)"), 2026-09-01
location: triade/src/engine/config/spawnConfig.ts:1-5
reason: Sem validação em runtime dos pesos em `spawnConfig` — edição futura dos pesos degrada silenciosamente (pot absorve excesso de probabilidade, NaN/negativo envenena as comparações e tudo vira pot); a invariante `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2] === 1-POT_WEIGHT` é guardada apenas pelo teste de soma com epsilon (`triade/src/engine/config/spawnConfig.ts:1-5`, `triade/src/engine/core/spawn.ts:11-16`). Por design do spec: 2.4 (`weightedPicker`) re-normalizará e nunca confiará na soma exata.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-spawn-weight-validation
resolution-undo: db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b 2026-09-02 7374617475733a206f70656e

### DW-47: `Readonly<Record<1|2, number>>` é somente compile-time; o objeto é mutável em runtime (sem `Object.freeze`) (`triade/src/engine/config/spawnConfig.ts:3`). Hardening trivial; revisitar quando 2.5 tornar `spawnConfig` configurável.

origin: migrated from legacy ledger ("Deferred from: code review of 2-2-pesos-fixos-1-2-em-40-40 (2026-08-21)"), 2026-09-01
location: triade/src/engine/config/spawnConfig.ts:3
reason: `Readonly<Record<1|2, number>>` é somente compile-time; o objeto é mutável em runtime (sem `Object.freeze`) (`triade/src/engine/config/spawnConfig.ts:3`). Hardening trivial; revisitar quando 2.5 tornar `spawnConfig` configurável.
status: done 2026-09-01
resolution: already resolved: triade/src/engine/config/spawnConfig.ts:13,17 Object.freeze on FIXED_WEIGHTS and POT_CURVE — runtime mutability hardened

### DW-48: Fallback de `rngOf` retorna 0.5 para sempre — um rng sub-provisionado num teste de `spawnTile` produz silenciosamente valor 2 em vez de falhar rápido (`triade/test-utils/helpers.ts:17-23`). Pre-existente ao diff.

origin: migrated from legacy ledger ("Deferred from: code review of 2-2-pesos-fixos-1-2-em-40-40 (2026-08-21)"), 2026-09-01
location: triade/test-utils/helpers.ts:17-23
reason: Fallback de `rngOf` retorna 0.5 para sempre — um rng sub-provisionado num teste de `spawnTile` produz silenciosamente valor 2 em vez de falhar rápido (`triade/test-utils/helpers.ts:17-23`). Pre-existente ao diff.
status: done 2026-09-01
resolution: resolved by sweep bundle dw-test-scanner-helpers-hardening
resolution-undo: d03bd19660d953d51029cb993603729020df8a32a61c092cb18da7891621edd3 2026-09-01 7374617475733a206f70656e

### DW-49: Benchmarks timing-sensitive continuam no run default do CI — script `benchmark` idêntico a `test`, mantendo benchmarks no caminho padrão (`triade/package.json`). Recomendação pré-existente do review R1 (mover benchmarks para fora do run default) ainda não atendida.

origin: migrated from legacy ledger ("Deferred from: code review of 2-2-pesos-fixos-1-2-em-40-40 (2026-08-21)"), 2026-09-01
location: triade/package.js
reason: Benchmarks timing-sensitive continuam no run default do CI — script `benchmark` idêntico a `test`, mantendo benchmarks no caminho padrão (`triade/package.json`). Recomendação pré-existente do review R1 (mover benchmarks para fora do run default) ainda não atendida.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-ci-gesture-wiring-docs
resolution-undo: facfde462834d7761c72189990cd308263bb12d1d706a13cdb222057e454067f 2026-09-02 7374617475733a206f70656e

### DW-50: Testes de busy-gate de `gesture-pipeline.test.ts` exercitam uma cópia local do contrato `handleSwipe`, não o wiring real de `App.tsx` (`triade/__tests__/ui/gesture-pipeline.test.ts`). Regex WIRING + suíte do pipeline cobrem o essencial; extrair handler para módulo testável é refactor para story futura. (Re-review 2026-08-21)

origin: migrated from legacy ledger ("Deferred from: code review of 2-2-pesos-fixos-1-2-em-40-40 (2026-08-21)"), 2026-09-01
location: gesture-pipeline.test.ts
reason: Testes de busy-gate de `gesture-pipeline.test.ts` exercitam uma cópia local do contrato `handleSwipe`, não o wiring real de `App.tsx` (`triade/__tests__/ui/gesture-pipeline.test.ts`). Regex WIRING + suíte do pipeline cobrem o essencial; extrair handler para módulo testável é refactor para story futura. (Re-review 2026-08-21)
status: done 2026-09-02
resolution: resolved by sweep bundle dw-ci-gesture-wiring-docs
resolution-undo: facfde462834d7761c72189990cd308263bb12d1d706a13cdb222057e454067f 2026-09-02 7374617475733a206f70656e

### DW-51: Tier not wired into `spawnTile`/`move()` — the pot feature is dead via real gameplay until the tier is plumbed.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-3-pot-tierizado-por-teto (2026-08-21)"), 2026-09-01
location: n/a
reason: Tier not wired into `spawnTile`/`move()` — the pot feature is dead via real gameplay until the tier is plumbed.
status: done 2026-08-22
resolution: CLOSED by story 2.6: tier flows ceilingDetector -> tierForCeiling -> resolveSpawn inside move()

### DW-52: Variable RNG draw-count per `weightedValue` call (1 roll in fixed band / tier-0 pot; 2 rolls for tier ≥ 1 pot) is behavior-pinned by draw-count tests but undocumented in the `Rng` contract.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-3-pot-tierizado-por-teto (2026-08-21)"), 2026-09-01
location: n/a
reason: Variable RNG draw-count per `weightedValue` call (1 roll in fixed band / tier-0 pot; 2 rolls for tier ≥ 1 pot) is behavior-pinned by draw-count tests but undocumented in the `Rng` contract.
status: done 2026-08-22
resolution: CLOSED by story 2.6: fixed draw-budget contract documented on Rng — effective=3 / noop=0 / newGame=20 / resolver=1; two-stage draw deleted

### DW-53: `POT_WEIGHT` is exported from `spawnConfig` but never consulted — the pot band is derived as `FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2]`.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-3-pot-tierizado-por-teto (2026-08-21)"), 2026-09-01
location: n/a
reason: `POT_WEIGHT` is exported from `spawnConfig` but never consulted — the pot band is derived as `FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2]`.
status: done 2026-08-22
resolution: CLOSED by story 2.6: pickCombined builds [FIXED_WEIGHTS[1], FIXED_WEIGHTS[2], ...normalizeTo(POT_WEIGHT, ...)]

### DW-54: Source-text-coupled purity test (`readFileSync` + import-specifier/export regex in `pot.test.ts`) is brittle under file moves/reformats. Documented ATDD purity/`spawnConfig`-keying check; revisit if it becomes a maintenance burden.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-3-pot-tierizado-por-teto (2026-08-21)"), 2026-09-01
location: pot.test.ts
reason: Source-text-coupled purity test (`readFileSync` + import-specifier/export regex in `pot.test.ts`) is brittle under file moves/reformats. Documented ATDD purity/`spawnConfig`-keying check; revisit if it becomes a maintenance burden.
status: done 2026-09-01
resolution: resolved by sweep bundle dw-purity-and-weight-doc-hardening
resolution-undo: 9a5dc3ebc3271f91a92a90436074f7eef0b497f2dcd57ca181503f028285fe7c 2026-09-01 7374617475733a206f70656e

### DW-55: `pickIndex` lets NaN rolls through both clamps (`NaN < 0` and `NaN >= len` both false) → `NaN` index.

origin: migrated from legacy ledger ("Deferred from: code review of story 2-3-pot-tierizado-por-teto (2026-08-21)"), 2026-09-01
location: n/a
reason: `pickIndex` lets NaN rolls through both clamps (`NaN < 0` and `NaN >= len` both false) → `NaN` index.
status: done 2026-08-22
resolution: CLOSED by story 2.6 code review (2026-08-22): Number.isFinite guard degrades deterministically to index 0, mirroring weightedPicker NaN defense

### DW-56: Malformed-rng hardening without crash: a roll ≥ 1 in `weightedPicker` collapses deterministically to the top pot slot (no clamp to a valid band), and a NaN third draw is copied unvalidated into `pendingSpawn.displayRoll` (breaking the documented `[0,1)` contract silently). Pre-existing trust-the-rng class — the engine assumes well-behaved `[0,1)` rngs; only crash-capable paths (see `pickIndex` patch) were fixed this story.

origin: migrated from legacy ledger ("Deferred from: code review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-22)"), 2026-09-01
location: n/a
reason: Malformed-rng hardening without crash: a roll ≥ 1 in `weightedPicker` collapses deterministically to the top pot slot (no clamp to a valid band), and a NaN third draw is copied unvalidated into `pendingSpawn.displayRoll` (breaking the documented `[0,1)` contract silently). Pre-existing trust-the-rng class — the engine assumes well-behaved `[0,1)` rngs; only crash-capable paths (see `pickIndex` patch) were fixed this story.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-rng-trust-hardening
resolution-undo: 0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Clamp roll and validate displayRoll — Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback.

### DW-57: Statistical gates in `adaptive-spawn-integration.test.ts` use fixed per-test seeds (AC2 uniformity `0xc31` at N=15000, ±2% absolute ≈ ~10σ; AC7 session `0x26c6`; ceiling-ordering derived from `0x51ce + ceiling`). Deterministic tripwires today, but brittle to any future seed rotation or rng switch; document the σ budget next time these tests are touched. (Numbers corrected by the third-pass review 2026-08-23: previously said "±2% at N=10k, ~4–5σ". In that same pass the AC7 frequency gates were switched to sigma-scaled 5σ bounds — see sigmaBound in the test file — eliminating the seed-starvation/knife-edge coupling for those specific gates; AC2 and the aggregate 40/40/20 window remain absolute.)

origin: migrated from legacy ledger ("Deferred from: code review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-22)"), 2026-09-01
location: adaptive-spawn-integration.test.ts
reason: Statistical gates in `adaptive-spawn-integration.test.ts` use fixed per-test seeds (AC2 uniformity `0xc31` at N=15000, ±2% absolute ≈ ~10σ; AC7 session `0x26c6`; ceiling-ordering derived from `0x51ce + ceiling`). Deterministic tripwires today, but brittle to any future seed rotation or rng switch; document the σ budget next time these tests are touched. (Numbers corrected by the third-pass review 2026-08-23: previously said "±2% at N=10k, ~4–5σ". In that same pass the AC7 frequency gates were switched to sigma-scaled 5σ bounds — see sigmaBound in the test file — eliminating the seed-starvation/knife-edge coupling for those specific gates; AC2 and the aggregate 40/40/20 window remain absolute.)
status: done 2026-09-01
resolution: resolved by sweep bundle dw-purity-and-weight-doc-hardening
resolution-undo: 9a5dc3ebc3271f91a92a90436074f7eef0b497f2dcd57ca181503f028285fe7c 2026-09-01 7374617475733a206f70656e

### DW-58: Circular-oracle risk in rewritten `pot.test.ts`: cumulative bands are recomputed from the same formula as the implementation, so a consistently-wrong formula passes both sides; only the hand-computed inline boundary comments are independent. Fix = hand-computed expected-value table (triade/__tests__/engine/pot.test.ts).

origin: migrated from legacy ledger ("Deferred from: re-review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-23)"), 2026-09-01
location: pot.test.ts
reason: Circular-oracle risk in rewritten `pot.test.ts`: cumulative bands are recomputed from the same formula as the implementation, so a consistently-wrong formula passes both sides; only the hand-computed inline boundary comments are independent. Fix = hand-computed expected-value table (triade/__tests__/engine/pot.test.ts).
status: done 2026-09-01
resolution: already resolved: triade/__tests__/engine/pot.test.ts:48-64 hand-computed literal thresholds for weightedValue vs recomputed oracle — circular-oracle closed

### DW-59: `spyRng` in `adaptive-spawn-integration.test.ts` silently serves `0.5` forever once its supplied values are exhausted instead of throwing — a regression that over-draws can pass frequency-style assertions unnoticed; exact `calls` deep-equal pins cover the P0 paths (triade/__tests__/engine/adaptive-spawn-integration.test.ts:16-24).

origin: migrated from legacy ledger ("Deferred from: re-review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-23)"), 2026-09-01
location: adaptive-spawn-integration.test.ts
reason: `spyRng` in `adaptive-spawn-integration.test.ts` silently serves `0.5` forever once its supplied values are exhausted instead of throwing — a regression that over-draws can pass frequency-style assertions unnoticed; exact `calls` deep-equal pins cover the P0 paths (triade/__tests__/engine/adaptive-spawn-integration.test.ts:16-24).
status: done 2026-09-01
resolution: resolved by sweep bundle dw-test-scanner-helpers-hardening
resolution-undo: d03bd19660d953d51029cb993603729020df8a32a61c092cb18da7891621edd3 2026-09-01 7374617475733a206f70656e

### DW-60: `gameState()` test helper defaults `{ value: 1, displayRoll: 0 }` — hidden magic default silently drives ~two dozen migrated assertions and means those sessions never exercise realistic pending-value flow (triade/test-utils/helpers.ts).

origin: migrated from legacy ledger ("Deferred from: re-review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-23)"), 2026-09-01
location: triade/test-utils/helpers.ts
reason: `gameState()` test helper defaults `{ value: 1, displayRoll: 0 }` — hidden magic default silently drives ~two dozen migrated assertions and means those sessions never exercise realistic pending-value flow (triade/test-utils/helpers.ts).
status: done 2026-09-01
resolution: resolved by sweep bundle dw-test-scanner-helpers-hardening
resolution-undo: d03bd19660d953d51029cb993603729020df8a32a61c092cb18da7891621edd3 2026-09-01 7374617475733a206f70656e

### DW-61: `weights.test.ts` statistical pot-sampling floor (`> N * 0.1`) is far looser than the surrounding ±1–2% frequency gates — triggers only after catastrophic failure (triade/__tests__/engine/weights.test.ts).

origin: migrated from legacy ledger ("Deferred from: re-review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-23)"), 2026-09-01
location: weights.test.ts
reason: `weights.test.ts` statistical pot-sampling floor (`> N * 0.1`) is far looser than the surrounding ±1–2% frequency gates — triggers only after catastrophic failure (triade/__tests__/engine/weights.test.ts).
status: done 2026-09-01
resolution: resolved by sweep bundle dw-preview-pot-ladder-hygiene
resolution-undo: ac1bd5ea06c0d2ad96d3691d63172b22d6b090a3ddbb09837137305667161f05 2026-09-01 7374617475733a206f70656e

### DW-62: `{ board: result.board, pendingSpawn: result.pendingSpawn }` reconstruction duplicated ad hoc across App.tsx + smoke/integration tests instead of a shared `stateFromResult` helper — drift risk.

origin: migrated from legacy ledger ("Deferred from: re-review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-23)"), 2026-09-01
location: App.tsx
reason: `{ board: result.board, pendingSpawn: result.pendingSpawn }` reconstruction duplicated ad hoc across App.tsx + smoke/integration tests instead of a shared `stateFromResult` helper — drift risk.
status: done 2026-09-01
resolution: resolved by sweep bundle dw-preview-pot-ladder-hygiene
resolution-undo: ac1bd5ea06c0d2ad96d3691d63172b22d6b090a3ddbb09837137305667161f05 2026-09-01 7374617475733a206f70656e

### DW-63: Tier-0 ceiling-ordering exception (documented "harmless" in game.ts comments) is the exact case excluded from the ceiling-ordering test — asserted nowhere.

origin: migrated from legacy ledger ("Deferred from: re-review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-23)"), 2026-09-01
location: game.ts
reason: Tier-0 ceiling-ordering exception (documented "harmless" in game.ts comments) is the exact case excluded from the ceiling-ordering test — asserted nowhere.
status: done 2026-09-01
resolution: resolved by sweep bundle dw-preview-pot-ladder-hygiene
resolution-undo: ac1bd5ea06c0d2ad96d3691d63172b22d6b090a3ddbb09837137305667161f05 2026-09-01 7374617475733a206f70656e

### DW-64: `npx tsc --noEmit -p tsconfig.test.json` fails at the repo baseline (verified pre-existing on `870c9ab` via `git stash`), so the "both tsc clean" gate cannot pass without out-of-scope work

origin: migrated from legacy ledger ("Deferred from: dev of story 7-1-pendingspawn-pre-resolvido-no-snapshot (2026-08-24)"), 2026-09-01
location: tsconfig.test.js
reason: `npx tsc --noEmit -p tsconfig.test.json` fails at the repo baseline (verified pre-existing on `870c9ab` via `git stash`), so the "both tsc clean" gate cannot pass without out-of-scope work
status: done 2026-08-26
resolution: CLOSED 2026-08-26 (trace 6.1 fix): rn-stub exports useWindowDimensions/Platform/Dimensions etc; tsconfig.test.json adds ignoreDeprecations; both tsc gates clean

### DW-65: Malformed-GameState hardening: an effective move throws TypeError if `state.pendingSpawn` is undefined (violates engine-never-throws); a noop degrades `{...undefined}` to `{}`, silently dropping both required fields; and an unvalidated `pendingSpawn.value` (NaN/non-ladder) is placed onto the board where `ceilingDetector` ignores it invisibly (triade/src/engine/core/game.ts:53,69, triade/src/engine/core/spawn.ts:61-72). Trust-the-input class — malformed GameState is outside the valid API domain; same posture as the 2026-08-22 malformed-rng deferral.

origin: migrated from legacy ledger ("Deferred from: third-pass review of 2-6-integracao-com-o-engine-merge-once-e-effective-move (2026-08-23)"), 2026-09-01
location: triade/src/engine/core/game.ts:53
reason: Malformed-GameState hardening: an effective move throws TypeError if `state.pendingSpawn` is undefined (violates engine-never-throws); a noop degrades `{...undefined}` to `{}`, silently dropping both required fields; and an unvalidated `pendingSpawn.value` (NaN/non-ladder) is placed onto the board where `ceilingDetector` ignores it invisibly (triade/src/engine/core/game.ts:53,69, triade/src/engine/core/spawn.ts:61-72). Trust-the-input class — malformed GameState is outside the valid API domain; same posture as the 2026-08-22 malformed-rng deferral.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-defensive-guards
resolution-undo: f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18 2026-09-02 7374617475733a206f70656e

### DW-66: Scanner regex-literal handling: `stripCommentsAndStrings` treats regex literals as plain code, so a quote/apostrophe inside a regex (e.g. `/it's/`) flips the state machine into string mode and blanks all subsequent real source until the next quote — producing false NEGATIVES in the ui.norolls structural guard. Documented as a known limitation in the helper, but the blast radius is mode-desync swallowing real code, not mere pass-through. No such pattern exists in any currently scanned view/service file; proper fix requires division-vs-regex disambiguation (real lexer work) — revisit if scanned sources ever adopt regex literals with quote characters (triade/test-utils/helpers.ts).

origin: migrated from legacy ledger ("Deferred from: code review pass 2 of 7-1-pendingspawn-pre-resolvido-no-snapshot (2026-08-24)"), 2026-09-01
location: triade/test-utils/helpers.ts
reason: Scanner regex-literal handling: `stripCommentsAndStrings` treats regex literals as plain code, so a quote/apostrophe inside a regex (e.g. `/it's/`) flips the state machine into string mode and blanks all subsequent real source until the next quote — producing false NEGATIVES in the ui.norolls structural guard. Documented as a known limitation in the helper, but the blast radius is mode-desync swallowing real code, not mere pass-through. No such pattern exists in any currently scanned view/service file; proper fix requires division-vs-regex disambiguation (real lexer work) — revisit if scanned sources ever adopt regex literals with quote characters (triade/test-utils/helpers.ts).
status: done 2026-09-01
resolution: resolved by sweep bundle dw-test-scanner-helpers-hardening
resolution-undo: d03bd19660d953d51029cb993603729020df8a32a61c092cb18da7891621edd3 2026-09-01 7374617475733a206f70656e

### DW-67: two-lane preview (both lanes show a preview card): IMPLEMENTED (HUD fan-out, 2026-08-24) — `Hud` now takes `previews: { clean, accelerated }` and fans the lane-agnostic `previewFor(game.pendingSpawn)` into two labeled `PreviewCard`s (Clean / Accelerated) in portrait & landscape (`triade/src/ui/Hud.tsx`). Both lanes currently show the same pre-resolved preview; per-lane board differentiation (distinct `pendingSpawn` per lane) remains Epic 3 — no Hud rework needed, just feed distinct `previews` when Epic 3 builds two-lane boards. Traced as `7.2-AC3` in `traceability-matrix-7-2.md`.

origin: migrated from legacy ledger ("Deferred from: traceability gate of story 7-2-preview-card-no-hud-60-40-nas-duas-pistas (2026-08-25)"), 2026-09-01
location: triade/src/ui/Hud.tsx
reason: two-lane preview (both lanes show a preview card): IMPLEMENTED (HUD fan-out, 2026-08-24) — `Hud` now takes `previews: { clean, accelerated }` and fans the lane-agnostic `previewFor(game.pendingSpawn)` into two labeled `PreviewCard`s (Clean / Accelerated) in portrait & landscape (`triade/src/ui/Hud.tsx`). Both lanes currently show the same pre-resolved preview; per-lane board differentiation (distinct `pendingSpawn` per lane) remains Epic 3 — no Hud rework needed, just feed distinct `previews` when Epic 3 builds two-lane boards. Traced as `7.2-AC3` in `traceability-matrix-7-2.md`.
status: done 2026-09-02
resolution: already resolved: triade/src/ui/Hud.tsx:14 and 46-68 previews fan-out implemented — Hud takes previews {clean,accelerated} and renders two LanePreviews (Clean/Accelerated) in portrait & landscape

### DW-68: `contiguousWindowContaining` returns `[value]` for any out-of-ladder value, which `PreviewCard` renders identically to an `exact` (single-element range shows as plain `"99"`) — the defensive "range" is indistinguishable from exact in the UI. Content/ambiguity semantics ("always contains truth", N3) are owned by Story 7.3 — deferred.

origin: migrated from legacy ledger ("Deferred from: code review of story 7-2-preview-card-no-hud-60-40-nas-duas-pistas (2026-08-24)"), 2026-09-01
location: n/a
reason: `contiguousWindowContaining` returns `[value]` for any out-of-ladder value, which `PreviewCard` renders identically to an `exact` (single-element range shows as plain `"99"`) — the defensive "range" is indistinguishable from exact in the UI. Content/ambiguity semantics ("always contains truth", N3) are owned by Story 7.3 — deferred.
status: done 2026-09-01
resolution: already resolved: triade/src/game/preview.ts:62-65 ambiguousRange now returns centered 3-window slice not defensive [value] — indistinguishable UI fixed

### DW-69: `Hud` throws if the `previews` prop is omitted by a caller (`previews.clean`/`previews.accelerated` accessed unconditionally). No current caller omits it; pre-existing robustness gap — deferred.

origin: migrated from legacy ledger ("Deferred from: code review of story 7-2-preview-card-no-hud-60-40-nas-duas-pistas (2026-08-24)"), 2026-09-01
location: n/a
reason: `Hud` throws if the `previews` prop is omitted by a caller (`previews.clean`/`previews.accelerated` accessed unconditionally). No current caller omits it; pre-existing robustness gap — deferred.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-hud-preview-hardening
resolution-undo: da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce 2026-09-02 7374617475733a206f70656e

### DW-70: `spawnTile` muta o board de entrada e retorna a mesma referência (`board[cell[0]][cell[1]] = value; return { board, cell, value }`) — pre-existing (js/game.js idêntico), documentado desde 1-1; `move()` só passa board recém-construído por `boardFromLines`, então aliases não vazam. Não causado por 12.1, latente para callers futuros que reutilizem o board.

origin: migrated from legacy ledger ("Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-25)"), 2026-09-01
location: js/game.js
reason: `spawnTile` muta o board de entrada e retorna a mesma referência (`board[cell[0]][cell[1]] = value; return { board, cell, value }`) — pre-existing (js/game.js idêntico), documentado desde 1-1; `move()` só passa board recém-construído por `boardFromLines`, então aliases não vazam. Não causado por 12.1, latente para callers futuros que reutilizem o board.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-spawn-mutation-hygiene
resolution-undo: b85f43d1a077f8ad7f8d33c07155f5e3ae81c44b4b974f1cfcc598d8b869d26e 2026-09-02 7374617475733a206f70656e

### DW-71: `pickIndex` / `weightedPicker` degradam NaN/Infinity para índice 0 em vez de lançar — trust-the-rng, já documentado em deferred 2-6; `spawnTile` com pool vazio retorna `nulls` com 0 draws (engine-never-throws) enquanto `move()` assume AC4 (pool sempre não-vazio quando `moved===true`), então o orçamento de 3 draws cairia para 2 no branch inalcançável mas guardado. Pre-existing.

origin: migrated from legacy ledger ("Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-25)"), 2026-09-01
location: n/a
reason: `pickIndex` / `weightedPicker` degradam NaN/Infinity para índice 0 em vez de lançar — trust-the-rng, já documentado em deferred 2-6; `spawnTile` com pool vazio retorna `nulls` com 0 draws (engine-never-throws) enquanto `move()` assume AC4 (pool sempre não-vazio quando `moved===true`), então o orçamento de 3 draws cairia para 2 no branch inalcançável mas guardado. Pre-existing.
status: done 2026-09-02
resolution: closed by human decision: Accept degrade as intentional
decision: 2026-09-02 Keep degrade-to-0 — Accept degrade as intentional

### DW-72: Sem validação de limites/tipo em `candidates` (OOB `[4,0]`, `null`, `[r]` sem `c`) — intencionalmente não guardado por spec `spawn.ts:58-67` "add guard only if second caller"; produção garante in-bounds via `game.ts:53-64` opposite-edge. Pre-existing design decision, segunda caller dispara guard (`r>=0 && r<GRID_SIZE && board[r]?.[c]===null`).

origin: migrated from legacy ledger ("Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: spawn.ts:58-67
reason: Sem validação de limites/tipo em `candidates` (OOB `[4,0]`, `null`, `[r]` sem `c`) — intencionalmente não guardado por spec `spawn.ts:58-67` "add guard only if second caller"; produção garante in-bounds via `game.ts:53-64` opposite-edge. Pre-existing design decision, segunda caller dispara guard (`r>=0 && r<GRID_SIZE && board[r]?.[c]===null`).
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-spawn-candidates-validation
resolution-undo: 365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2 2026-09-02 7374617475733a206f70656e

### DW-73: Duplicatas em `candidates` inflariam `pool` e enviesariam `pickIndex` (célula duplicada 2x mais provável, quebra uniforme AC3) — não alcançável via `game.ts` (push distinto por linha/coluna), só via API direta/teste.

origin: migrated from legacy ledger ("Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: game.ts
reason: Duplicatas em `candidates` inflariam `pool` e enviesariam `pickIndex` (célula duplicada 2x mais provável, quebra uniforme AC3) — não alcançável via `game.ts` (push distinto por linha/coluna), só via API direta/teste.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-spawn-candidates-validation
resolution-undo: 365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2 2026-09-02 7374617475733a206f70656e

### DW-74: Compactação single-pass falha para linhas com múltiplos gaps (`[null,null,null,2]` → `[null,null,2,null]` em vez de `[2,null,null,null]`) em `shiftLine` loop `dest=i-1` — pre-existing em `line.ts:46-64`, não causado por 12.1 (só `moved` adicionado); exposição limitada porque board é sempre compactado por direção.

origin: migrated from legacy ledger ("Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: line.ts:46-64
reason: Compactação single-pass falha para linhas com múltiplos gaps (`[null,null,null,2]` → `[null,null,2,null]` em vez de `[2,null,null,null]`) em `shiftLine` loop `dest=i-1` — pre-existing em `line.ts:46-64`, não causado por 12.1 (só `moved` adicionado); exposição limitada porque board é sempre compactado por direção.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-line-compaction
resolution-undo: 26a75af183b8ffbe96535a58ff2c6ec6f12a3a000117765a9f94e84b21702c64 2026-09-02 7374617475733a206f70656e

### DW-75: `spawnTile` muta `board` in-place (já listado em 2026-08-25, re-confirmado) — `move()` passa board fresco de `boardFromLines`, aliases não vazam hoje.

origin: migrated from legacy ledger ("Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: `spawnTile` muta `board` in-place (já listado em 2026-08-25, re-confirmado) — `move()` passa board fresco de `boardFromLines`, aliases não vazam hoje.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-spawn-mutation-hygiene
resolution-undo: b85f43d1a077f8ad7f8d33c07155f5e3ae81c44b4b974f1cfcc598d8b869d26e 2026-09-02 7374617475733a206f70656e

### DW-76: `pickIndex`/`weightedPicker` degradam NaN/Infinity para 0 / clamp e `pool=[]` retorna `nulls` 0 draws — trust-the-rng, branch inalcançável mas guardado per AC5 engine-never-throws.

origin: migrated from legacy ledger ("Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: `pickIndex`/`weightedPicker` degradam NaN/Infinity para 0 / clamp e `pool=[]` retorna `nulls` 0 draws — trust-the-rng, branch inalcançável mas guardado per AC5 engine-never-throws.
status: done 2026-09-02
resolution: closed by human decision: Close DW-76 and track via DW-71
decision: 2026-09-02 Close as duplicate of DW-71 — Close DW-76 and track via DW-71

### DW-77: Acoplamento `GRID_SIZE` fixo 4x4 (`line.ts` assume 4, `helpers.ts:15` `SIZE=4`) — contrato `Board` é fixo, não configurável por nível.

origin: migrated from legacy ledger ("Deferred from: code review of story 12-1-spawn-no-lado-oposto-das-linhas-movidas (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: line.ts
reason: Acoplamento `GRID_SIZE` fixo 4x4 (`line.ts` assume 4, `helpers.ts:15` `SIZE=4`) — contrato `Board` é fixo, não configurável por nível.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-grid-size-configurable
resolution-undo: 0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Make configurable — Introduce BoardConfig/GRID_SIZE param threaded through triade/src/engine/core/{line,spawn,types}.ts and triade/test-utils/helpers.ts with validation and migrate tests to use the param, enabling level-specific sizes.
decision: 2026-09-02 Make configurable — Introduce a BoardConfig/GRID_SIZE param threaded through triade/src/engine/core/line.ts, spawn.ts, types.ts and triade/test-utils/helpers.ts so levels can specify size; add validation and migrate tests.

### DW-78: ULP no boundary 0.6 — `preview.ts:80` `if (roll < 0.6)` pode flipar por 1 ULP (`0.5999999999999999` vs `0.6000000000000001` ou `0.6 - EPSILON/2` que arredonda para 0.6), quebrando invariante 60/40 por um double representável; teste atual pinna `0.599` exact / `0.6` range mas não EPSILON. Pre-existing, tolerância float do spec; engine assume `

origin: migrated from legacy ledger ("Deferred from: code review of story 7-4-invariante-preview-nunca-altera-o-spawn (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: preview.ts:80
reason: ULP no boundary 0.6 — `preview.ts:80` `if (roll < 0.6)` pode flipar por 1 ULP (`0.5999999999999999` vs `0.6000000000000001` ou `0.6 - EPSILON/2` que arredonda para 0.6), quebrando invariante 60/40 por um double representável; teste atual pinna `0.599` exact / `0.6` range mas não EPSILON. Pre-existing, tolerância float do spec; engine assume `
status: done 2026-09-02
resolution: resolved by sweep bundle dw-preview-boundary-hygiene
resolution-undo: deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1 2026-09-02 7374617475733a206f70656e

### DW-79: Fallback além do ladder (ex. `value=192` além de 96) não contém a verdade — `FULL_POT_LADDER` congela até 96; `nearestLadderIndex(192)` clamp em 96 retorna `FULL.slice(5,8)=[24,48,96]` sem 192; preview mente quando `POT_CURVE` estende além de 96. Pre-existing, limite do ladder; inalcançável com `POT_CURVE` atual.

origin: migrated from legacy ledger ("Deferred from: code review of story 7-4-invariante-preview-nunca-altera-o-spawn (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: Fallback além do ladder (ex. `value=192` além de 96) não contém a verdade — `FULL_POT_LADDER` congela até 96; `nearestLadderIndex(192)` clamp em 96 retorna `FULL.slice(5,8)=[24,48,96]` sem 192; preview mente quando `POT_CURVE` estende além de 96. Pre-existing, limite do ladder; inalcançável com `POT_CURVE` atual.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-preview-boundary-hygiene
resolution-undo: deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1 2026-09-02 7374617475733a206f70656e

### DW-80: Mutable pot slices — `ambiguousRange` retorna `availablePotValues.slice(idx, idx+len)` mutável; caller pode `push(99)` corromper janela em cache/memo. Só `RANGE_1_2` é `Object.freeze`; demais janelas não pinam imutabilidade. Higiene React-memo de baixa prioridade.

origin: migrated from legacy ledger ("Deferred from: code review of story 7-4-invariante-preview-nunca-altera-o-spawn (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: Mutable pot slices — `ambiguousRange` retorna `availablePotValues.slice(idx, idx+len)` mutável; caller pode `push(99)` corromper janela em cache/memo. Só `RANGE_1_2` é `Object.freeze`; demais janelas não pinam imutabilidade. Higiene React-memo de baixa prioridade.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-preview-boundary-hygiene
resolution-undo: deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1 2026-09-02 7374617475733a206f70656e

### DW-81: Board shallow ref — `gameState` guarda `board` por referência e `boardFromLines` não deep-freeze linhas; `result.board[0][0]=999` pode vazar para snapshot anterior se caller retiver referência de linha. Testes só mutam `pendingSpawn` em isolamento; `engine.purity` cobre board em outra suíte. Pre-existing desde 1-1.

origin: migrated from legacy ledger ("Deferred from: code review of story 7-4-invariante-preview-nunca-altera-o-spawn (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: Board shallow ref — `gameState` guarda `board` por referência e `boardFromLines` não deep-freeze linhas; `result.board[0][0]=999` pode vazar para snapshot anterior se caller retiver referência de linha. Testes só mutam `pendingSpawn` em isolamento; `engine.purity` cobre board em outra suíte. Pre-existing desde 1-1.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-spawn-mutation-hygiene
resolution-undo: b85f43d1a077f8ad7f8d33c07155f5e3ae81c44b4b974f1cfcc598d8b869d26e 2026-09-02 7374617475733a206f70656e

### DW-82: Facade `rn-stub` + `tsconfig.test.json` fecha waiver TS5101 de duas camadas (`baseUrl` deprecation + 3 erros de tipagem `useWindowDimensions`/`GestureHandlerRootViewProps`/`Platform`) — `triade/test-utils/rn-stub.ts` agora exporta `useWindowDimensions`/`Platform`/`Dimensions`/`StyleSheet.flatten`/`ViewStyle` e `triade/tsconfig.test.json` adiciona `ignoreDeprecations: "6.0"`; `npx tsc --noEmit` e `-p tsconfig.test.json` ambos clean live 2026-08-26. Mudança fora do escopo 6.1 mas correta; defer como hygiene fechada.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-1-overlay-de-game-over-com-stats-imediatos (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: tsconfig.test.js
reason: Facade `rn-stub` + `tsconfig.test.json` fecha waiver TS5101 de duas camadas (`baseUrl` deprecation + 3 erros de tipagem `useWindowDimensions`/`GestureHandlerRootViewProps`/`Platform`) — `triade/test-utils/rn-stub.ts` agora exporta `useWindowDimensions`/`Platform`/`Dimensions`/`StyleSheet.flatten`/`ViewStyle` e `triade/tsconfig.test.json` adiciona `ignoreDeprecations: "6.0"`; `npx tsc --noEmit` e `-p tsconfig.test.json` ambos clean live 2026-08-26. Mudança fora do escopo 6.1 mas correta; defer como hygiene fechada.
status: done 2026-09-01
resolution: already resolved: triade/test-utils/rn-stub.ts:80-114 exports useWindowDimensions/Platform/Dimensions plus triade/tsconfig.test.json:5 ignoreDeprecations 6.0 — both tsc clean since 2026-08-26

### DW-83: Testes 7.4 acoplados no mesmo branch: 4 pins de isolamento/snapshot/noop/direction-agnostic em `pending-spawn-contract.test.ts` + inclusão de `GameOverOverlay.tsx` no guard `ui.thinview.test.ts` — engine byte-identical, preview byte-identical; correto mas escopo cruzado com Epic 7, já deferido em `## Deferred from: code review of story 7-4...`.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-1-overlay-de-game-over-com-stats-imediatos (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: pending-spawn-contract.test.ts
reason: Testes 7.4 acoplados no mesmo branch: 4 pins de isolamento/snapshot/noop/direction-agnostic em `pending-spawn-contract.test.ts` + inclusão de `GameOverOverlay.tsx` no guard `ui.thinview.test.ts` — engine byte-identical, preview byte-identical; correto mas escopo cruzado com Epic 7, já deferido em `## Deferred from: code review of story 7-4...`.
status: open

### DW-84: Ledger pré-existente ainda aberto (ULP 0.6 no boundary 0.6, fallback além do ladder 192>96, mutable pot slices `slice()` sem freeze, board shallow ref `gameState` por referência) — `triade/src/game/preview.ts:53,62,80` + `triade/src/engine/core/game.ts:88` permanecem latentes, não causados por 6.1 (`git diff --stat -- triade/src/game/preview.ts` vazio, `triade/src/engine` vazio). Já deferido em 7-4, não reabrir aqui.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-1-overlay-de-game-over-com-stats-imediatos (2026-08-26 — gds-code-review, 3 camadas)"), 2026-09-01
location: triade/src/game/preview.ts:53
reason: Ledger pré-existente ainda aberto (ULP 0.6 no boundary 0.6, fallback além do ladder 192>96, mutable pot slices `slice()` sem freeze, board shallow ref `gameState` por referência) — `triade/src/game/preview.ts:53,62,80` + `triade/src/engine/core/game.ts:88` permanecem latentes, não causados por 6.1 (`git diff --stat -- triade/src/game/preview.ts` vazio, `triade/src/engine` vazio). Já deferido em 7-4, não reabrir aqui.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-preview-boundary-hygiene
resolution-undo: deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1 2026-09-02 7374617475733a206f70656e

### DW-85: Stub Animated incompleto — `Animated.timing` em `triade/test-utils/rn-stub.ts:34` não avança `_value` (timing `start` apenas chama `cb` sem `setValue`), então teste de `reducedMotion=false` não valida progressão; em produção `react-native` anima corretamente. Test-tooling only, não é regressão de produção; eventual melhoria do stub pode simular `setValue(toValue)` no `timing` para gate mais fiel.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-2-morte-elegante-em-soft-fade (2026-08-27 — gds-code-review, 3 camadas)"), 2026-09-01
location: triade/test-utils/rn-stub.ts:34
reason: Stub Animated incompleto — `Animated.timing` em `triade/test-utils/rn-stub.ts:34` não avança `_value` (timing `start` apenas chama `cb` sem `setValue`), então teste de `reducedMotion=false` não valida progressão; em produção `react-native` anima corretamente. Test-tooling only, não é regressão de produção; eventual melhoria do stub pode simular `setValue(toValue)` no `timing` para gate mais fiel.
status: done 2026-08-27
resolution: CLOSED 2026-08-27 (fix commit): timing/spring now value.setValue(config.toValue) sync in start() — 448 pass validates progression

### DW-86: Forfeited-continue vacuous (comment-only discard) — `triade/App.tsx:104` `// AC6/7 forfeited continue dies` sem state para descartar; futuro `continueCredit/reviveCount` burla `!continueBudget` — vacuous hoje (Clean single-lane) mas pin frágil — deferred, low.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/App.tsx:104
reason: Forfeited-continue vacuous (comment-only discard) — `triade/App.tsx:104` `// AC6/7 forfeited continue dies` sem state para descartar; futuro `continueCredit/reviveCount` burla `!continueBudget` — vacuous hoje (Clean single-lane) mas pin frágil — deferred, low.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-forfeited-continue-rng-reseed
resolution-undo: 41838b7d5d1cd4d3eab8fc2b81bcbe63090ee4682d07e1b39bb448e0c2be82f6 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Implement forfeitedContinue state — Add explicit forfeitedContinue flag that dies on continue attempt.

### DW-87: Persist race + degraded hydration discards live best — `triade/App.tsx:75-82 + 103-110` `initialScore(persistedBest)` `[persistedBest]` only; `saveBest` async vs restart pode perder record; `hydrationOkRef=false` zera best — trade-off spec para não vazar `match.best` — deferred, medium.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/App.tsx:75-82
reason: Persist race + degraded hydration discards live best — `triade/App.tsx:75-82 + 103-110` `initialScore(persistedBest)` `[persistedBest]` only; `saveBest` async vs restart pode perder record; `hydrationOkRef=false` zera best — trade-off spec para não vazar `match.best` — deferred, medium.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-persist-hydration-race-fix
resolution-undo: d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Serialize saveBest before restart — Await saveBest before handleRestart and gate isNewRecord on hydrationOkRef.

### DW-88: Tiles corrupt after restart (null moveResult never rebuilds) — `triade/src/render/GameBoard.tsx:262-265` `if(!moveResult) return` deixa tiles stale 16->9 — não causado por 6.3 (`render` byte-identical), já deferido em 1-3 — deferred, high (pre-existing).

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/src/render/GameBoard.tsx:262-265
reason: Tiles corrupt after restart (null moveResult never rebuilds) — `triade/src/render/GameBoard.tsx:262-265` `if(!moveResult) return` deixa tiles stale 16->9 — não causado por 6.3 (`render` byte-identical), já deferido em 1-3 — deferred, high (pre-existing).
status: done 2026-09-02
resolution: resolved by sweep bundle dw-render-gate-hardening
resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c 2026-09-02 7374617475733a206f70656e

### DW-89: Settle-timer leak fires after restart (Df5) — `triade/src/render/GameBoard.tsx:273-280` timer não limpo em `handleRestart` — Df5 já deferido — deferred.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/src/render/GameBoard.tsx:273-280
reason: Settle-timer leak fires after restart (Df5) — `triade/src/render/GameBoard.tsx:273-280` timer não limpo em `handleRestart` — Df5 já deferido — deferred.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-render-gate-hardening
resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c 2026-09-02 7374617475733a206f70656e

### DW-90: moved:true + empty plan deadlock (Df1) — `triade/App.tsx:91-98` + `GameBoard.tsx:275` — Df1 já deferido — deferred.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/App.tsx:91-98
reason: moved:true + empty plan deadlock (Df1) — `triade/App.tsx:91-98` + `GameBoard.tsx:275` — Df1 já deferido — deferred.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-render-gate-hardening
resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c 2026-09-02 7374617475733a206f70656e

### DW-91: Reduced-motion branch stale across remounts — `triade/src/ui/GameOverOverlay.tsx:26-50` `useRef` captura só 1º mount — não alcançável hoje `reducedMotion={false}` — deferred, low.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/src/ui/GameOverOverlay.tsx:26-50
reason: Reduced-motion branch stale across remounts — `triade/src/ui/GameOverOverlay.tsx:26-50` `useRef` captura só 1º mount — não alcançável hoje `reducedMotion={false}` — deferred, low.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-overlay-carriers-hardening
resolution-undo: 596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Recreate Animated.Value on toggle — Add effect that recreates or re-targets value on reducedMotion toggle.

### DW-92: insets undefined / rotation during fade — `triade/src/ui/GameOverOverlay.tsx:17-20` defensivo `?.top ??0` — edge tablet — deferred, low.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/src/ui/GameOverOverlay.tsx:17-20
reason: insets undefined / rotation during fade — `triade/src/ui/GameOverOverlay.tsx:17-20` defensivo `?.top ??0` — edge tablet — deferred, low.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-overlay-carriers-hardening
resolution-undo: 596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Clamp insets to finite >=0 — Add clamp for insets top/bottom to finite >=0.

### DW-93: RNG determinism discontinuity never reseeded — `triade/App.tsx:40` `mulberry32(20260808)` único — deferred, low.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/App.tsx:40
reason: RNG determinism discontinuity never reseeded — `triade/App.tsx:40` `mulberry32(20260808)` único — deferred, low.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-forfeited-continue-rng-reseed
resolution-undo: 41838b7d5d1cd4d3eab8fc2b81bcbe63090ee4682d07e1b39bb448e0c2be82f6 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Reseed RNG per game — Reseed rngRef on each newGame with Date.now or increment.

### DW-94: AvailablePot fan-out stale com deflate — `triade/App.tsx:152` + `preview.ts:55-65` — FR-43 edge — deferred, low.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/App.tsx:152
reason: AvailablePot fan-out stale com deflate — `triade/App.tsx:152` + `preview.ts:55-65` — FR-43 edge — deferred, low.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-preview-boundary-hygiene
resolution-undo: deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1 2026-09-02 7374617475733a206f70656e

### DW-95: Navigation/hardware-back não bloqueado — `triade/src/ui/GameOverOverlay.tsx:56-64` + `triade/App.tsx:184` — não bloqueia `BackHandler` — deferred, medium (Epic 3/4).

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/src/ui/GameOverOverlay.tsx:56-64
reason: Navigation/hardware-back não bloqueado — `triade/src/ui/GameOverOverlay.tsx:56-64` + `triade/App.tsx:184` — não bloqueia `BackHandler` — deferred, medium (Epic 3/4).
status: open

### DW-96: Stroke tiling restart during gesture race — `triade/App.tsx:119-139` `doMoveRef` + `panGesture` `runOnJS:true` — Df1-4 ledger — deferred, medium.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-3-restart-1-tap (2026-08-27)"), 2026-09-01
location: triade/App.tsx:119-139
reason: Stroke tiling restart during gesture race — `triade/App.tsx:119-139` `doMoveRef` + `panGesture` `runOnJS:true` — Df1-4 ledger — deferred, medium.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-render-gate-hardening
resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c 2026-09-02 7374617475733a206f70656e

### DW-97: Hydration failure `ok:false` falso-positivo: `loadBest()` degradado retorna `{best:0,ok:false}` mas `sessionStartBestRef=0` faz `isNewRecord(0,50)=true` acender recorde indevido para usuário com recorde 500. Pré-existente (App byte-identical), fora de escopo 6.4 verify-only; reavaliar em Epic 9/storage quando `hydrationOkRef` bloquear highlight.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-4-novo-recorde-como-numero-destacado (2026-08-28 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: Hydration failure `ok:false` falso-positivo: `loadBest()` degradado retorna `{best:0,ok:false}` mas `sessionStartBestRef=0` faz `isNewRecord(0,50)=true` acender recorde indevido para usuário com recorde 500. Pré-existente (App byte-identical), fora de escopo 6.4 verify-only; reavaliar em Epic 9/storage quando `hydrationOkRef` bloquear highlight.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-persist-hydration-race-fix
resolution-undo: d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Gate highlight on hydrationOk — Only compute isNewRecord when hydrationOkByLaneRef true.

### DW-98: Stale `sessionStartBestRef` multi-jogo: após recorde 150, segundo jogo 120 com `sessionStartBestRef 100` ainda acende (`100<120`) mesmo `persistedBest` já 150 — semântica cross-restart ambígua; spec mantém ref na sessão para não vazar `match.best`, mas sem update pós-persist. Pré-existente, Epic 3/6 follow-up.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-4-novo-recorde-como-numero-destacado (2026-08-28 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: Stale `sessionStartBestRef` multi-jogo: após recorde 150, segundo jogo 120 com `sessionStartBestRef 100` ainda acende (`100<120`) mesmo `persistedBest` já 150 — semântica cross-restart ambígua; spec mantém ref na sessão para não vazar `match.best`, mas sem update pós-persist. Pré-existente, Epic 3/6 follow-up.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-persist-hydration-race-fix
resolution-undo: d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Update ref on save resolution — Update sessionStartBestByLaneRef to persistedBest after save resolves.

### DW-99: Corrida async `saveBest`: `handleRestart` com `persistedBest` stale se restart antes de `saveBest` resolver; `initialScore(persistedBest)` captura 100 não 150. Pré-existente, manual-validation.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-4-novo-recorde-como-numero-destacado (2026-08-28 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: Corrida async `saveBest`: `handleRestart` com `persistedBest` stale se restart antes de `saveBest` resolver; `initialScore(persistedBest)` captura 100 não 150. Pré-existente, manual-validation.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-persist-hydration-race-fix
resolution-undo: d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Await saveBest before restart — Make handleRestart await pending saveBest promises.

### DW-100: Entradas não-finitas/corrompidas: `previousBest -5/NaN/Infinity` ou `score NaN/Infinity` → highlight ou render `"NaN"` sem `Number.isFinite` guard; `parseBest` já rejeita mas bypass via MMKV nativo possível. Contrato `MatchScore` garante finitos.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-4-novo-recorde-como-numero-destacado (2026-08-28 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: Entradas não-finitas/corrompidas: `previousBest -5/NaN/Infinity` ou `score NaN/Infinity` → highlight ou render `"NaN"` sem `Number.isFinite` guard; `parseBest` já rejeita mas bypass via MMKV nativo possível. Contrato `MatchScore` garante finitos.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-persist-hydration-race-fix
resolution-undo: d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Add isFinite guards — Add Number.isFinite guards in matchScore and render.

### DW-101: Overflow layout: `score >1e9` estoura `row space-between` sem `numberOfLines/ellipsizeMode/flexShrink` no `GameOverOverlay`. Pré-existente, fora de MVP.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-4-novo-recorde-como-numero-destacado (2026-08-28 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: Overflow layout: `score >1e9` estoura `row space-between` sem `numberOfLines/ellipsizeMode/flexShrink` no `GameOverOverlay`. Pré-existente, fora de MVP.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-overlay-carriers-hardening
resolution-undo: 596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Add ellipsize and flexShrink — Add numberOfLines=1 ellipsizeMode tail flexShrink.

### DW-102: `reducedMotion`/`insets`/`zIndex` carriers: toggle `useRef` one-time init sem re-target; `insets` parcial/negativo/NaN não clamped; `zIndex:2` vs `Hud 1` não testado integrado; `unmount` mid-fade single-cycle. Pré-existente, Epic 9 / manual.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-4-novo-recorde-como-numero-destacado (2026-08-28 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: `reducedMotion`/`insets`/`zIndex` carriers: toggle `useRef` one-time init sem re-target; `insets` parcial/negativo/NaN não clamped; `zIndex:2` vs `Hud 1` não testado integrado; `unmount` mid-fade single-cycle. Pré-existente, Epic 9 / manual.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-overlay-carriers-hardening
resolution-undo: 596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Bundle overlay carriers — Make reducedMotion reactive with re-target on prop change, clamp insets to finite >=0, assert zIndex layering (overlay 2 vs Hud 1) in an integration render test, and clear/restart cleanly on unmount mid-fade.
decision: 2026-09-02 Bundle overlay carriers — Fix GameOverOverlay carriers in one pass: make reducedMotion reactive with re-target on prop change, clamp insets to finite >=0, assert zIndex layering in an integration render test, and ensure unmount mid-fade clears and restarts cleanly.

### DW-103: Ladder ceiling não pinado end-to-end: novo teste varia só `stats.maxTile` prop (thin-view correto), não cadeia `ceilingDetector→tierForCeiling→potForTier`; `isNewRecord(match.best,…)` leak via alias não Runtime-pinado. Thin-view é intencional per spec; cadeia é `engine.purity`/`preview-invariant`.

origin: migrated from legacy ledger ("Deferred from: code review of story 6-4-novo-recorde-como-numero-destacado (2026-08-28 — gds-code-review, 3 camadas)"), 2026-09-01
location: n/a
reason: Ladder ceiling não pinado end-to-end: novo teste varia só `stats.maxTile` prop (thin-view correto), não cadeia `ceilingDetector→tierForCeiling→potForTier`; `isNewRecord(match.best,…)` leak via alias não Runtime-pinado. Thin-view é intencional per spec; cadeia é `engine.purity`/`preview-invariant`.
status: done 2026-09-02
resolution: resolved by sweep bundle dw-engine-parity-hardening
resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b 2026-09-02 7374617475733a206f70656e

### DW-104: Per-lane best tracking still global — `match.best`/`persistedBest` not yet scoped per lane (belongs to 3.4 leaderboards)

origin: migrated from legacy ledger ("Deferred from: code review of story 3-1-selecao-de-pista-no-menu-lane-select (2026-08-28 — dev-auto review)"), 2026-09-01
location: n/a
reason: Per-lane best tracking still global — `match.best`/`persistedBest` not yet scoped per lane (belongs to 3.4 leaderboards)
status: open

### DW-105: handleUndoIap stub injects iapRemaining:1 to simulate IAP before Epic 4 entitlements

origin: migrated from legacy ledger ("Deferred from: code review of story 3-3-accelerated-lane-com-assistencia (2026-08-28 — dev-auto review)"), 2026-09-01
location: n/a
reason: handleUndoIap stub injects iapRemaining:1 to simulate IAP before Epic 4 entitlements
status: open

### DW-106: Rapid second swipe before first shake 130ms completes overwrites withSequence without cancelAnimation — truncated overlap/jank

origin: migrated from legacy ledger ("Deferred from: code review of story 8-3-screen-shake (2026-09-01 — gds-code-review, 2 layers)"), 2026-09-01
location: n/a
reason: Rapid second swipe before first shake 130ms completes overwrites withSequence without cancelAnimation — truncated overlap/jank
status: done 2026-09-02
resolution: closed by human decision: Accept jank as low
decision: 2026-09-02 Keep truncated overlap as acceptable — Accept jank as low

### DW-107: Board shake 5-8px at edges clipped by parent View overflow hidden

origin: migrated from legacy ledger ("Deferred from: code review of story 8-3-screen-shake (2026-09-01 — gds-code-review, 2 layers)"), 2026-09-01
location: n/a
reason: Board shake 5-8px at edges clipped by parent View overflow hidden
status: done 2026-09-02
resolution: resolved by sweep bundle dw-board-shake-width-hardening
resolution-undo: e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Set overflow visible during shake — Toggle overflow visible during shake or add padding.

### DW-108: BulletTime spawned undefined gap — trace entry without spawned field misclassified as merge

origin: migrated from legacy ledger ("Deferred from: code review of story 8-4-bullet-time (2026-09-01 — gds-code-review, 2 layers)"), 2026-09-01
location: n/a
reason: BulletTime spawned undefined gap — trace entry without spawned field misclassified as merge
status: done 2026-09-02
resolution: already resolved: triade/src/feel/bulletTime.ts:14 entry.spawned !== false guard excludes undefined spawned entries from maxMergeValue — DW-108 trace gap fixed
decision: 2026-09-02 Check spawned === true explicitly — Filter with entry.spawned === true or in entry check.

### DW-109: BulletTime value <3 not filtered — 0 or negative finite pollutes sessionBestMerge

origin: migrated from legacy ledger ("Deferred from: code review of story 8-4-bullet-time (2026-09-01 — gds-code-review, 2 layers)"), 2026-09-01
location: n/a
reason: BulletTime value <3 not filtered — 0 or negative finite pollutes sessionBestMerge
status: done 2026-09-02
resolution: already resolved: triade/src/feel/bulletTime.ts:16 Number.isFinite(entry.value) && entry.value <3 guard filters zero/negative before sessionBestMerge — DW-109 pollutes fix
decision: 2026-09-02 Add value >=3 guard — Add value>=3 filter before max update.

### DW-110: GameBoard width unvalidated for bullet flash overlay — NaN width propagates to overlay style

origin: migrated from legacy ledger ("Deferred from: code review of story 8-4-bullet-time (2026-09-01 — gds-code-review, 2 layers)"), 2026-09-01
location: n/a
reason: GameBoard width unvalidated for bullet flash overlay — NaN width propagates to overlay style
status: done 2026-09-02
resolution: resolved by sweep bundle dw-board-shake-width-hardening
resolution-undo: e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f 2026-09-02 7374617475733a206f70656e
decision: 2026-09-02 Validate width finite fallback 1 — Clamp width to Math.max(1, finiteWidth) for overlay.

### DW-111: doMove identity invalidates on every sessionBestMerge change — gesture stability claim weakened

origin: migrated from legacy ledger ("Deferred from: code review of story 8-4-bullet-time (2026-09-01 — gds-code-review, 2 layers)"), 2026-09-01
location: n/a
reason: doMove identity invalidates on every sessionBestMerge change — gesture stability claim weakened
status: done 2026-09-02
resolution: closed by human decision: Keep current, functional updater avoids stale
decision: 2026-09-02 Keep deps as stability still functional — Keep current, functional updater avoids stale

### DW-112: Focus management after move — BoardA11yOverlay re-renders but never moves VoiceOver focus via setAccessibilityFocus

origin: deferred from review of spec-9-2-screen-reader-contract (2026-09-02)
location: triade/src/a11y/boardAccessibility.tsx
reason: BoardA11yOverlay renders per-tile accessible elements and re-renders on board changes, but does not call AccessibilityInfo.setAccessibilityFocus to move VoiceOver focus after a move; a vanished tile leaves focus on a dead node. Requires platform focus API beyond current patch scope.
status: open
source_spec: `_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md`

### DW-113: Skia Canvas duplicate accessibility nodes — GameBoard Canvas not hidden from accessibility tree

origin: deferred from review of spec-9-2-screen-reader-contract (2026-09-02)
location: triade/src/render/GameBoard.tsx
reason: Skia Canvas may expose empty/duplicate accessibility nodes alongside the RN BoardA11yOverlay bridge; should set importantForAccessibility="no-hide-descendants" on Canvas wrapper to avoid duplicate announcements.
status: open
source_spec: `_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md`
