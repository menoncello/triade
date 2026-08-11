---
baseline_commit: 9d550c1
---

# Story 1.3: Board Skia declarativo dirigido pelo trace

Status: ready-for-dev

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

- [ ] T1 — Pure trace→transition planner (AC: 1, 2, 3, 4, 6)
  - [ ] T1.1 Create `triade/src/render/transitionPlan.ts` — pure TS, no RN/React/Skia/Reanimated imports (frame math is pure and host-testable; ADR-05)
  - [ ] T1.2 `planTileTransitions(prevBoard, result): TileTransition[]` — maps the exact `MoveResult.trace` contract (`{ value, to:[r,c], from:[[r,c]...], spawned }`) into declarative transitions: `slide` (1 source → dest, moving), `merge` (2 sources converge → dest, merged value materializes at dest), `spawn` (appears at dest), `hold` (stationary tile: `from.length === 1 && from[0] === to` — no motion, kept on board), noop (whole move `moved:false` → empty plan). Every trace entry maps to exactly one transition — no tile is dropped.
  - [ ] T1.3 Provide `resultingTiles(plan)` — the set of final tile cells/values the plan produces — used as the no-leak oracle (equals the occupied cells of `result.board`). Because stationary tiles map to `hold` transitions, `resultingTiles(plan)` covers every occupied cell even in partial moves (slide down one lane only).
  - [ ] T1.4 Do NOT read values off the old board with matching heuristics — the plan derives from `result.trace` only (AC 1, 6)
- [ ] T2 — Planner tests (AC: 1, 2, 4, 6)
  - [ ] T2.1 Create `triade/__tests__/render/transitionPlan.test.ts` — runner `node:test` + `node:assert`; deterministic fixtures via `test-utils/helpers.ts` (`boardWith`, `rngOf`, `emptyBoard`, `staticBoard`, `mulberry32`) — no `Math.random`
  - [ ] T2.2 Full matrix: slide left/right/up/down; merge (1+2 both orders, equal ≥3) → two sources converge + vanish + merged value at dest; spawn flag; noop → empty plan; **partial move** (e.g., only one lane slides, others stationary) → slides + `hold` transitions for the stationary tiles; the 9-start-tile board; plan of a full-board move (merge-once semantics)
  - [ ] T2.3 No-leak assertion: for every planned move with `moved:true` (non-empty plan), `resultingTiles(plan)` deep-equals the occupied cells of `result.board` — the pure analog of the `tileEls` no-leak rule. The noop case (`moved:false`) is excluded from this assertion because its plan is empty and the board is unchanged; the rendered set stays as-is by definition.
- [ ] T3 — Declarative animated `GameBoard` (AC: 1, 2, 3, 4)
  - [ ] T3.1 Rewrite `triade/src/render/GameBoard.tsx` to consume `{ board, moveResult }` and render every tile as an animated Skia tile keyed by a stable identity
  - [ ] T3.2 Slide tiles animate from `from` to `to`; merged tiles vanish after the merge; spawned tiles appear at `spawned` cells (Reanimated shared values passed directly as Skia props — `useSharedValue` + `withTiming`/`withSpring`, UI thread, per the Spike/Context7 pattern)
  - [ ] T3.3 Overshoot-and-snap follows the trace, declarative, in `src/render` (ADR-05). **DO NOT implement flash/particles/shake/slow-mo here** — those are `src/feel` imperative worklets and belong to Epic 8 (S8.2/S8.3/S8.4); 1.3 only establishes the boundary
  - [ ] T3.4 No-leak in the Skia tree: keep a persistent tile-instance map (mirror of `tileEls`); after every move the rendered tile set equals the current board — orphaned instances removed from the map AND the Skia tree (no hidden/accumulated tiles)
  - [ ] T3.5 Use Reanimated on the UI thread only — no React state updates per frame; no `setState` in a frame callback
- [ ] T4 — Manual-validation harness + 60 FPS smoke (AC: 5, 6)
  - [ ] T4.1 Wire a temporary move driver in `triade/App.tsx` (e.g., 4 on-screen buttons or keyboard keys) that calls the engine `move()` and feeds `{ board, moveResult }` to `GameBoard` — clearly marked temporary (real gesture input is Story 1.6)
  - [ ] T4.2 Keep `useFrameRateBaseline` active; record a simulator reading (fps · p99) as **informative smoke only** — animations are not covered by `node --test`
  - [ ] T4.3 Assert nothing: UI/Skia animation is manual validation on the simulator/browser (project-context rule); `node --test` + `npx tsc --noEmit` must stay green
  - [ ] T4.4 Update the story completion note with the final test count; do NOT modify `js/game.js`, `js/ui.js`, `js/debug.js`, or `test/game.test.js` (web PWA frozen)

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

- (filled at implementation time)

### File List

- `triade/src/render/transitionPlan.ts` (new)
- `triade/__tests__/render/transitionPlan.test.ts` (new)
- `triade/src/render/GameBoard.tsx` (rewritten)
- `triade/App.tsx` (modified — temporary move harness)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status ready-for-dev → in-progress → review)
