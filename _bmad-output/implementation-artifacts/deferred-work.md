# Deferred Work

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
- Temp harness `doMove` stale board closure drops rapid same-frame moves (`triade/App.tsx:20-27`) — temporary code replaced by real input in story 1.6.
- `classify` dereferences `entry.from[0]` unguarded (`triade/src/render/transitionPlan.ts:21-26`) — engine contract guarantees non-empty `from` for non-spawn entries; defensive hardening only.
- Purity scan blind spots — `PURITY_FILES` is a hand-maintained explicit list (a new pure file in `src/render` silently escapes the ADR-01/05 scan until edited); `FORBIDDEN_PREFIXES` misses a hypothetical bare `reanimated`/`skia` import (`triade/__tests__/engine/engine.purity.test.ts:12-16`). Current files are covered; maintenance hardening only.

## Deferred from: code review of story 1-3-board-skia-declarativo-dirigido-pelo-trace (2026-08-13, re-review)

- AC-5 (60 FPS / 10-min session) has no completed rendering-side evidence — only the planner micro-benchmark exists; the simulator/device frame-rate reading stays open as "Manual validation remaining" (project rule: Skia animation is manual validation; informative only). Trigger to close: run the temporary move harness in App.tsx on the iOS simulator/device and record fps·p99.

## Deferred from: code review of story 1-2-port-completo-do-engine-de-regras-para-typescript (2026-08-10, re-review)

- `matchScore.isNewRecord`/`best` conflate persisted best with live session max; the persisted value is unrecoverable once the session passes it. Contract documented + tested; revisit when app-storage lands in story 1.4 (orchestrator must call `isNewRecord` with the session-start best, never `current.best`).
- Parity suite has no multi-move / full-game seeded differential — sequence-level divergences (spawn-position loops, repeated-move score accumulation) are invisible. Deferred; unit suite + parity matrix cover the I/O matrix.

## Deferred from: code review of 1-4-offline-capability-instalavel-e-persistencia (2026-08-15)

- **`useState(() => newGame(rngRef.current))` mutates the RNG ref inside a state initializer** (`triade/App.tsx:23`) — StrictMode double-invokes initializers, consuming the seeded `mulberry32` stream twice and making the board a non-deterministic function of the seed. Pre-existing harness (real input lands in story 1.6); `registerRootComponent` doesn't enable StrictMode today.
