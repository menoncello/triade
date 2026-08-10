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

## Deferred from: code review of story 1-2-port-completo-do-engine-de-regras-para-typescript (2026-08-10, re-review)

- `matchScore.isNewRecord`/`best` conflate persisted best with live session max; the persisted value is unrecoverable once the session passes it. Contract documented + tested; revisit when app-storage lands in story 1.4 (orchestrator must call `isNewRecord` with the session-start best, never `current.best`).
- Parity suite has no multi-move / full-game seeded differential — sequence-level divergences (spawn-position loops, repeated-move score accumulation) are invisible. Deferred; unit suite + parity matrix cover the I/O matrix.
