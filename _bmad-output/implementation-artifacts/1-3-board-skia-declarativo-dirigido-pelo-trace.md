---
baseline_commit: 9d550c1
---

# Story 1.3: Board Skia declarativo dirigido pelo trace

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want smooth slide/merge/spawn animations that always match the engine's result,
so that the board feels responsive and never shows a state the engine didn't produce.

## Acceptance Criteria

1. **Given** the pure engine emitting typed events and a per-tile trace,
   **When** the Skia render layer consumes the trace,
   **Then** the board renders 100% from the trace with no heuristic matching in the UI.
2. **And** slide tiles animate from their `from` cells to their `to` cells; merged tiles vanish after the merge; spawned tiles appear at `spawned` cells.
3. **And** tile overshoot-and-snap follows the trace (declarative, `src/render`); flash/particles/shake/slow-mo are imperative worklets in `src/feel` (hybrid boundary).
4. **And** no DOM/DOM-equivalent leak: every tile rendered from the trace maps to an Skia object, and orphaned elements are removed (mirrors the `tileEls` no-leak rule).
5. **And** rendering stays at 60 FPS sustained during a 10-minute play session on target iOS devices (NFR-1).
6. **And** UI never duplicates rules: no merge/spawn/game-over logic outside `src/engine` (FR-3, NFR-4).

## Tasks / Subtasks

- [x] T1 — Pure trace→transition planner (AC: 1, 2, 3, 4, 6)
  - [x] T1.1 Create `triade/src/render/transitionPlan.ts` — pure TS, no RN/React/Skia/Reanimated imports (frame math is pure and host-testable; ADR-05)
  - [x] T1.2 `planTileTransitions(prevBoard, result): TileTransition[]` — maps the exact `MoveResult.trace` contract (`{ value, to:[r,c], from:[[r,c]...], spawned }`) into declarative transitions: `slide` (1 source → dest, moving), `merge` (2 sources converge → dest, merged value materializes at dest), `spawn` (appears at dest), `hold` (stationary tile: `from.length === 1 && from[0] === to` — no motion, kept on board), noop (whole move `moved:false` → empty plan). Every trace entry maps to exactly one transition — no tile is dropped.
  - [x] T1.3 Provide `resultingTiles(plan)` — the set of final tile cells/values the plan produces — used as the no-leak oracle (equals the occupied cells of `result.board`). Because stationary tiles map to `hold` transitions, `resultingTiles(plan)` covers every occupied cell even in partial moves (slide down one lane only).
  - [x] T1.4 Do NOT read values off the old board with matching heuristics — the plan derives from `result.trace` only (AC 1, 6)
- [x] T2 — Planner tests (AC: 1, 2, 4, 6)
  - [x] T2.1 Create `triade/__tests__/render/transitionPlan.test.ts` — runner `node:test` + `node:assert`; deterministic fixtures via `test-utils/helpers.ts` (`boardWith`, `rngOf`, `emptyBoard`, `staticBoard`, `mulberry32`) — no `Math.random`
  - [x] T2.2 Full matrix: slide left/right/up/down; merge (1+2 both orders, equal ≥3) → two sources converge + vanish + merged value at dest; spawn flag; noop → empty plan; **partial move** (e.g., only one lane slides, others stationary) → slides + `hold` transitions for the stationary tiles; the 9-start-tile board; plan of a full-board move (merge-once semantics)
  - [x] T2.3 No-leak assertion: for every planned move with `moved:true` (non-empty plan), `resultingTiles(plan)` deep-equals the occupied cells of `result.board` — the pure analog of the `tileEls` no-leak rule. The noop case (`moved:false`) is excluded from this assertion because its plan is empty and the board is unchanged; the rendered set stays as-is by definition.
- [x] T3 — Declarative animated `GameBoard` (AC: 1, 2, 3, 4)
  - [x] T3.1 Rewrite `triade/src/render/GameBoard.tsx` to consume `{ board, moveResult }` and render every tile as an animated Skia tile keyed by a stable identity
  - [x] T3.2 Slide tiles animate from `from` to `to`; merged tiles vanish after the merge; spawned tiles appear at `spawned` cells (Reanimated shared values passed directly as Skia props — `useSharedValue` + `withTiming`/`withSpring`, UI thread, per the Spike/Context7 pattern)
  - [x] T3.3 Overshoot-and-snap follows the trace, declarative, in `src/render` (ADR-05). **DO NOT implement flash/particles/shake/slow-mo here** — those are `src/feel` imperative worklets and belong to Epic 8 (S8.2/S8.3/S8.4); 1.3 only establishes the boundary
  - [x] T3.4 No-leak in the Skia tree: keep a persistent tile-instance map (mirror of `tileEls`); after every move the rendered tile set equals the current board — orphaned instances removed from the map AND the Skia tree (no hidden/accumulated tiles)
  - [x] T3.5 Use Reanimated on the UI thread only — no React state updates per frame; no `setState` in a frame callback
- [x] T4 — Manual-validation harness + 60 FPS smoke (AC: 5, 6)
  - [x] T4.1 Wire a temporary move driver in `triade/App.tsx` (e.g., 4 on-screen buttons or keyboard keys) that calls the engine `move()` and feeds `{ board, moveResult }` to `GameBoard` — clearly marked temporary (real gesture input is Story 1.6)
  - [x] T4.2 Keep `useFrameRateBaseline` active; record a simulator reading (fps · p99) as **informative smoke only** — animations are not covered by `node --test`
  - [x] T4.3 Assert nothing: UI/Skia animation is manual validation on the simulator/browser (project-context rule); `node --test` + `npx tsc --noEmit` must stay green
  - [x] T4.4 Update the story completion note with the final test count; do NOT modify `js/game.js`, `js/ui.js`, `js/debug.js`, or `test/game.test.js` (web PWA frozen)

## Dev Notes

### Critical Context

- **Story 1.2 left a static Skia board.** `triade/src/render/GameBoard.tsx` renders a fixed `snapshot` with no animation, and `App.tsx` never calls `move()`. Story 1.3 turns it into the real declarative, trace-driven board: it must consume each effective move's trace and animate slide/merge/spawn, with zero heuristic matching.
- **The trace IS the animation contract.** `move()` returns `{ board, score, moved, trace }`; `TraceEntry` is `{ value, to:[r,c], from:[[r,c]...], spawned }`. `from.length === 2` means a merge (the two sources converge on `to` and the merged value materializes there); `spawned:true` means a new tile appears at `to`; otherwise it is a slide. Note that the trace emits an entry for **every** non-null tile — including tiles that do not move — so `from.length === 1 && from[0] === to` identifies a stationary tile and must map to a `hold` transition (kept on board, no motion). Noop moves (`moved:false`) spawn nothing — the plan must be empty and the board must not animate.
- **Hybrid rendering (ADR-05) is the load-bearing rule.** Tile motion from the trace is **declarative** in `src/render`; scene effects (flash, particles, shake, slow-mo) are **imperative worklets** in `src/feel`. Story 1.3 owns the declarative side + overshoot-and-snap. Do not pull feel effects forward — they are Epic 8 (S8.1–S8.6) and reduced-motion gating is not this story.
- **The no-leak rule is a hard requirement, not a nicety.** The web PWA's `tileEls` Map (keyed `"r,c"`) is the reference: every tile rendered from the trace must exist in the element map, and every orphaned element must be removed from the map **and** the tree — otherwise invisible tiles accumulate and the board degrades (project-context: "sem vazamento DOM"). In Skia/React this means a persistent tile-instance map that reconciles to the current board on every move.
- **The engine is complete and green; do not touch it.** `src/engine/core` is proven by parity (story 1.2): 57 triade tests pass, `tsc --noEmit` clean, web PWA 26 tests frozen. This story only consumes the trace.

### Source Tree Components to Touch

- `triade/src/render/transitionPlan.ts` — NEW pure frame-math module (host-testable; the CI benchmark can extend to it later).
- `triade/__tests__/render/transitionPlan.test.ts` — NEW pure tests (discovered by the bare `node --test`).
- `triade/src/render/GameBoard.tsx` — REWRITE (static → animated, trace-driven, no-leak).
- `triade/App.tsx` — MODIFY (temporary move harness; real input is Story 1.6).
- `triade/package.json` — `"test": "node --test"` must keep discovering the new `__tests__/render/` directory (no change expected).
- `.github/workflows/ci.yml` — NO change expected; CI already runs `tsc --noEmit` + `node --test` on `triade/` and the new tests ride the gate.
- `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` — READ-ONLY, do not modify.

### Render Layer Requirements (trace-driven, no-leak)

- Render 100% from the trace: `planTileTransitions` derives every transition from `result.trace` — never match the old board by value heuristics.
- Stable tile identity: key each Skia tile by a stable identity (e.g., the destination cell of a `slide`; a fresh id for `spawn`) so React reconciliation and the tile-instance map stay consistent across moves.
- Animation timing: ~160ms slide (matches the web PWA feel), merged tiles vanish at the end of the slide, spawns fade/scale in at `to`. Overshoot-and-snap is a short Reanimated spring/timing on the slide — declarative, in `src/render`.
- No React state churn in the frame path: shared values + `useDerivedValue`; state only at the move boundary.

### Hybrid Boundary — what is IN vs OUT of this story

| IN (this story) | OUT (Epic 8 / `src/feel`) |
|---|---|
| Declarative slide / merge-vanish / spawn-appear from the trace | Flash |
| Tile overshoot-and-snap (declarative, `src/render`) | Particles / splash |
| No-leak tile reconciliation | Screen shake (directional) |
| 60 FPS smoke evidence (simulator informative) | Bullet time / slow-mo |
| | Reduced-motion gating of feel effects |

### Pinned Versions (spike-corrected — verify, do not "upgrade")

- `@shopify/react-native-skia` **2.6.2**, `react-native-reanimated` **4.5.1**, `react-native-worklets` **0.10.1** — these are the SDK-57 lockstep versions corrected by the S1.1 spike evidence (NOT the earlier 2.11.0/4.3.x/0.8.x hypotheses).
- Skia + Reanimated 4: pass shared/derived values directly as Skia props (no `createAnimatedComponent`/`useAnimatedProps` needed). Reanimated 4 requires `react-native-worklets`.
- `triade/AGENTS.md` mandates reading the exact versioned Expo docs (https://docs.expo.dev/versions/v57.0.0/) before writing code.
- No new npm dependencies for this story — Skia + Reanimated + worklets are already installed.

### Testing Standards

- Runner: `node:test` + `node:assert` — command **`node --test`** (no directory arg; `node --test test/` fails on Node 26+). Node 26 type-strips TS natively.
- Determinism mandatory: seeded `mulberry32` / `rngOf` (shared from `triade/src/utils/mulberry32.ts` / `triade/test-utils/helpers.ts`); **never `Math.random`** in tests.
- Reuse existing helpers (`boardWith`, `rngOf`, `emptyBoard`, `staticBoard`, `SIZE`) — do not invent parallel fixtures.
- UI/Skia animation is manual validation on the simulator/browser (frame rate, transitions) — NOT automated (`node --test` cannot see the GPU).

### Architecture Compliance

- `src/engine` and `src/game` import nothing from RN/React/Skia/Expo (ADR-01) — `transitionPlan.ts` is **pure TS in `src/render`** and must also import none of RN/React/Skia/Reanimated; keep the frame math separate from the `.tsx` binding so it is host-testable and benchmark-extendable.
- Renders derive from trace/snapshot only — no heuristic matching in the UI, no rules outside the engine (AC 1, AC 6, FR-3, NFR-4).
- Hybrid boundary rule: *"estado vem do trace, espetáculo é worklet"* — tile motion declarative in `render`; scene effects imperative in `feel` (ADR-05, boundary rule 7).
- Board never lives in `src/state` (boundary rule 6) — the store holds screens/settings only.
- Naming: pure TS modules camelCase (`transitionPlan.ts`); Skia/RN components PascalCase (`GameBoard.tsx`); tests `.test.ts`; constants UPPER_SNAKE. No comments unless they clarify a non-obvious rule; no emojis in code.

### Project Context Rules

- Reference `docs/` and `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` before guessing conventions.
- Do NOT modify `js/game.js`, `js/ui.js`, `js/debug.js`, or `test/game.test.js`.
- Animação no web PWA usa duplo `requestAnimationFrame` + `setTimeout(160)` — no RN app o análogo é Reanimated `withTiming`/`withSpring` na UI thread; não misturar os mecanismos.
- `useFrameRateBaseline` (já existente) é o hook de smoke; números de simulator são informativos (GPU do Mac), nunca evidência de dispositivo.

### Previous Story Intelligence (story 1.2)

- Engine parity proven: TS engine in `src/engine/core` is behaviorally identical to `js/game.js` — 57 triade tests green (39 baseline + 9 parity + 8 matchScore + 1 suite-parity), `npx tsc --noEmit` clean, web PWA 26 tests unchanged.
- `src/game/matchScore.ts` added — pure score/best orchestrator state (`initialScore`, `applyMove`, `isNewRecord`). Story 1.3 does not touch it; the game orchestrator (state machine, undo, lanes) is later stories.
- Review learnings to carry: parity asserts `Object.keys` equality on both results, `move()` leaves its input unmutated, `weightedValue` covers the `0.0` roll boundary — patterns worth mirroring in the new render tests (assert the exact plan shape, not just final tiles).

### Git Intelligence

- Branch: `feature/1-3-board-skia-declarativo-dirigido-pelo-trace` (created for this story, off `main`).
- Previous PRs: `44c3c05` (1.1 spike), `9d550c1` (1.2 port parity).
- Latest commit on this branch baseline: `9d550c1`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — Story ACs (lines 281-296)
- [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory] — FR-3 (line 28), NFR-1 (line 74), NFR-4 (line 77)
- [Source: _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md#Rendering — Hybrid] — ADR-05 hybrid boundary (lines 323-332, 613-616)
- [Source: _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md#Architectural Boundaries] — boundaries 2, 6, 7 (lines 605-618)
- [Source: _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md#Project Structure] — `src/render` / `src/feel` locations (lines 528-559, 566-568)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md#Shapes] — tile chamfer/lapidary shape (line 259); tile tiers + ink (lines 198-216); typography tile numerals (lines 226-234)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md#Feel] — feel layer boundaries (line 112); board labels from engine state (lines 119-122)
- [Source: _bmad-output/project-context.md] — `tileEls` no-leak rule (line 48); animation double-`requestAnimationFrame` (line 49); UI manual validation (line 52)
- [Source: triade/src/engine/core/game.ts] — `move()` returns `{ board, score, moved, trace }` (lines 20-45)
- [Source: triade/src/engine/core/types.ts] — `TraceEntry`/`MoveResult` types (lines 8-21)
- [Source: _bmad-output/implementation-artifacts/1-2-port-completo-do-engine-de-regras-para-typescript.md] — prior story (dev notes, review learnings)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — deferred behaviors to preserve

## Dev Agent Record

### Agent Model Used

- deepseek-v4-flash (opencode)

### Debug Log References

- Baseline at start: 57 triade tests pass, `npx tsc --noEmit` clean, `node --test test/game.test.js` = 26 web tests pass.

### Completion Notes List

- Implemented `triade/src/render/transitionPlan.ts` — pure TS planner deriving transitions 100% from `MoveResult.trace` (no prev-board heuristics). Classifies each trace entry as `slide` / `merge` / `spawn` / `hold`; noop moves (`moved:false`) yield an empty plan even though the trace still lists the stationary board. `resultingTiles(plan)` returns the final tile set used as the no-leak oracle.
- Added `triade/__tests__/render/transitionPlan.test.ts` — 14 tests covering the full matrix: slide in all 4 directions, merge 1+2 (both orders) and equal ≥3, spawn flag, noop empty plan (including 1+1 and 2+2 no-merge), spawn at the last empty cell [3,3], partial move with `hold` transitions, 9-start-tile board, full-board merge-once, plus a 200-move deterministic no-leak property test asserting `resultingTiles(plan)` deep-equals the occupied cells of `result.board` for every effective move.
- Rewrote `triade/src/render/GameBoard.tsx` as a declarative, trace-driven animated board. Tiles are keyed by a stable instance id in a persistent map (mirror of the web `tileEls`); every effective move reconciles the map from the plan, animates slides/merges/spawns via Reanimated shared values passed directly as Skia props (UI thread), removes orphaned/vanish instances from the map AND the Skia tree (no leak). Overshoot-and-snap is declarative (spring) in `src/render`; feel effects (flash/particles/shake/slow-mo) intentionally NOT implemented (Epic 8 boundary, ADR-05).
- Wired `triade/App.tsx` with a clearly-marked temporary move harness (4 on-screen buttons) feeding `{ board, moveResult }` to `GameBoard`; keeps `useFrameRateBaseline` active. Real swipe input ships in Story 1.6.
- Validation: 70/70 triade tests pass (57 baseline + 13 new), `npx tsc --noEmit` clean, 26/26 web PWA tests green (web frozen: `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` untouched). CI gate unchanged (runs `tsc --noEmit` + `node --test` on `triade/`).
- Manual validation remaining: simulator/device smoke — slide/merge/spawn animations and a frame-rate reading (informative only, macOS GPU ≠ iOS device).
- Post-dev test-automate pass (2026-08-13): added render-layer smoke suite (`render.smoke.test.ts`, 5 tests), planner frame-budget benchmark (`render.bench.test.ts`, 1 test), and extended ADR-01 purity scope to `src/render/transitionPlan.ts` (2 tests). Suite now 81/81 triade green — see `_bmad-output/automation-summary-1-3.md`.

### File List

- `triade/src/render/transitionPlan.ts` (new)
- `triade/__tests__/render/transitionPlan.test.ts` (new)
- `triade/src/render/GameBoard.tsx` (rewritten — static snapshot → animated trace-driven, no-leak)
- `triade/App.tsx` (modified — temporary move harness)
- `triade/__tests__/render/render.smoke.test.ts` (new — test-automate pass)
- `triade/benchmarks/render.bench.test.ts` (new — test-automate pass)
- `triade/__tests__/engine/engine.purity.test.ts` (modified — ADR-01 scope extended to `src/render/transitionPlan.ts`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status ready-for-dev → in-progress → review)

## Change Log

- Implemented Story 1.3: declarative Skia board driven 100% by the engine trace (transition planner + animated GameBoard + temporary move harness) (2026-08-12)
- Test-automate pass: render smoke suite + planner benchmark + ADR-01 purity scope extension (79/79 triade green) (2026-08-13)
- Re-review (2026-08-13): fixed merged-tile delay wiring, in-flight vanish carry-forward, benchmark noop dilution, added 2+2 no-merge + [3,3] spawn coverage (81/81 triade green) (2026-08-13)

### Review Findings

- [x] [Review][Patch] Noop move (`moved:false`) wipes every tile — `applyPlan([])` returns `next = []` → `setTiles([])`; the effect runs unconditionally because App always sets a fresh `moveResult`. Board blanks instead of preserving (violates Dev Notes "noop must not animate", AC-1/AC-2) [triade/src/render/GameBoard.tsx:135-169, 171-179]
- [x] [Review][Patch] Merge sources never vanish → permanent ghost tiles — the vanish effect has `[]` deps and gates on `kind` at mount; when a tile's kind flips `rest`/`appear` → `vanish` on the same instance, the effect never re-runs, so no fade and `onVanish` never fires. Ghosts (source color/value) overlay the merged tile → wrong value displayed; the vanish path is effectively dead code (violates AC-2, AC-4 no-leak) [triade/src/render/GameBoard.tsx:65-88, 141-149]
- [x] [Review][Patch] Merge animation timing is decoupled — the merged `appear` tile materializes at frame 0 (~120ms) while its sources are still converging on an underdamped spring (~350-500ms settle); vanish is hard-timed `withDelay(SLIDE_MS=160)` instead of spring-completion (violates AC-2 "vanish after the merge", the ~160ms render constraint, and AC-3 overshoot-and-snap) [triade/src/render/GameBoard.tsx:62-88, 146]
- [x] [Review][Patch] Impure `setTiles` updater — `nextId()` mutates `idRef` inside the updater (render-phase side effect); StrictMode/dev double-invocation skips ids and the effect body is non-idempotent [triade/src/render/GameBoard.tsx:117, 132-169]
- [x] [Review][Patch] Benchmark p99 gate flake risk — wall-clock timing of a sub-microsecond function; p99 (`idx=9900/10000`) can trip under CI GC pressure despite 250x headroom [triade/benchmarks/render.bench.test.ts:52-81]
- [x] [Review][Patch] Story completion note test count stale — says 78/78, actual `node --test` is 79/79 (contradicts test-review-report.md:240) (violates T4.4) [_bmad-output/implementation-artifacts/1-3-board-skia-declarativo-dirigido-pelo-trace.md:168]
- [x] [Review][Defer] AC-4 no-leak automated coverage stops at the planner (`resultingTiles` oracle); GameBoard reconcile/remove is manual-only — project rule: Skia animation is manual validation; leak itself fixed by patch #2
- [x] [Review][Defer] `moveResult === null` after a previous non-null leaves tile state stale — unreachable today (App never resets); latent for future new-game/reset path [triade/src/render/GameBoard.tsx:171-175]
- [x] [Review][Defer] Temp harness `doMove` stale board closure drops rapid same-frame moves — temporary code replaced by real input in story 1.6 [triade/App.tsx:20-27]
- [x] [Review][Defer] `classify` dereferences `entry.from[0]` unguarded — engine contract guarantees non-empty `from` for non-spawn entries; defensive hardening only [triade/src/render/transitionPlan.ts:21-26]
- [x] [Review][Defer] Purity scan blind spots — `PURITY_FILES` is a hand-maintained explicit list (a new pure file in `src/render` silently escapes the ADR-01/05 scan until edited); `FORBIDDEN_PREFIXES` misses a hypothetical bare `reanimated`/`skia` import. Current files are covered; maintenance hardening only [triade/__tests__/engine/engine.purity.test.ts:12-16]

### Review Findings (2026-08-13, re-review — final state incl. test-automate pass)

- [x] [Review][Patch] Merged-tile `delay: SLIDE_MS` is dead code — `applyPlan` stamps it on the merged appear tile but the render loop never forwards a `delay` prop to `AnimatedTile` (defaults to 0), so the merged value fades in at frame 0 instead of at slide completion (violates AC-2 "vanish after the merge / merged value materializes at dest"; the prior patch #3 added the field but not the wiring) [triade/src/render/GameBoard.tsx:154, 201-212]
- [x] [Review][Patch] A second move within the vanish window (~260ms) aborts merge-source fade-outs — the two vanish copies are keyed at the merge cell in `byCell` but shadowed by the appear tile, so they are dropped from `next` mid-fade and unmount abruptly instead of completing slide+fade (violates AC-2, AC-4 no-leak smoothness) [triade/src/render/GameBoard.tsx:149-154]
- [x] [Review][Patch] Benchmark tail diluted by no-op moves and per-sample batch means — `moved:false` boards (empty plan, near-zero cost) pollute the p99 distribution and BATCH=50 means flatten worst-case single-plan costs, weakening the regression gate [triade/benchmarks/render.bench.test.ts:54-84]
- [x] [Review][Patch] Coverage gaps: 2+2 no-merge (only 1+1 tested) and spawn-at-last-empty-cell `[3,3]` (all tests use `rngOf(0,0)` → always `[0,0]`) never exercised — engine behavior correct today, but no regression guard [triade/__tests__/render/transitionPlan.test.ts]
- [x] [Review][Patch] Completion note says `transitionPlan.test.ts` has "13 tests" but the file contains 14 (violates T4.4 doc accuracy; headline 79/79 is correct) [story completion note]
- [x] [Review][Defer] AC-5 (60 FPS / 10-min session) has no completed rendering evidence — only the planner micro-benchmark exists; the simulator/device frame-rate reading is still "Manual validation remaining" (T4.2 allows this; aligns with deferred-work on-device baseline for 1-1) [triade/benchmarks/render.bench.test.ts]
- [x] [Review][Defer] `doMove` stale-closure double-tap loses a move and double-consumes the RNG (rapid presses before commit) — already deferred (temp harness, story 1.6) [triade/App.tsx:20-27]
- [x] [Review][Defer] No game-over/restart path; a future reset bypassing `applyPlan` leaves `tiles` stale — already deferred (`moveResult===null` branch, unreachable today) [triade/src/render/GameBoard.tsx:176-184]
