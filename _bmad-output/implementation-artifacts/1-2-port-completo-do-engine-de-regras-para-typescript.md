---
baseline_commit: 44c3c05
---

# Story 1.2: Port completo do engine de regras para TypeScript

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the exact rules I know from the web PWA to run in the iOS app,
so that my skill transfers and the game behaves identically on every surface.

## Acceptance Criteria

1. **Given** the TypeScript engine ported in the spike (story 1.1),
   **When** all rules are verified against `js/game.js` with identical behavior,
   **Then** a fresh board opens with exactly 9 starting tiles.
2. **And** merges follow the predicate `(a===1 && b===2) || (b===1 && a===2) || (a>=3 && a===b)` with value `a <= 2 ? 3 : a*2`; `1+1` and `2+2` never merge.
3. **And** each tile moves at most one cell per swipe and merge-once locks freshly merged tiles (`[3,3,3,3] → [6,3,3,_]`, `[1,2,3,_] → [3,3,_,_]`).
4. **And** spawn happens only after an effective move (`boardsEqual` noop spawns nothing, scores nothing, consumes no turn); weights 40/40/20 for 1/2/3.
5. **And** `move()` returns `{ board, score, moved, trace }` preserving the exact per-tile trace contract, and `isGameOver` reuses the same merge predicate.
6. **And** score increments by the merged tile's value, and the app tracks best score (in-memory; app-storage persistence ships in story 1.4).
7. **And** the 26 existing unit tests pass against the ported engine (`node --test`), covering the full I/O matrix (FR-1, FR-2).

## Tasks / Subtasks

- [x] T1 — Differential parity suite: `js/game.js` vs TS engine (AC: 1, 2, 3, 4, 5, 7)
  - [x] T1.1 Create `triade/__tests__/engine/engine.parity.test.ts` that loads `js/game.js` (UMD CJS via `createRequire(import.meta.url)` from `node:module`) alongside `src/engine/core` and runs an IDENTICAL scenario matrix through both, asserting identical `{ board, score, moved, trace }`
  - [x] T1.2 Matrix covers: 9-start-tile count; weighted 40/40/20; merge 1+2 both orders; non-merge 1+1/2+2; equal ≥3; one-cell movement left/right/up/down; noop without spawn; game-over (empty, 1-2 row/column, equal ≥3); spawn-once; trace assertions (merge sources, spawn flag, noop has no spawned entry)
  - [x] T1.3 Assert trace EXACTLY (to/from/spawned/value arrays), not just the final board — the trace is the render contract
  - [x] T1.4 Both engines fed the same deterministic `rng` (seeded `mulberry32`); no `Math.random` anywhere in the test
- [x] T2 — Score & best-score state in the orchestrator (AC: 6)
  - [x] T2.1 Create `triade/src/game/matchScore.ts` — pure TS (no RN/React/Skia imports; ADR-01 applies to `src/game` orchestrator the same way)
  - [x] T2.2 `initialScore(best: number): MatchScore` with `{ score: 0, best }`; `applyMove(current: MatchScore, result: MoveResult): MatchScore` accumulates `result.score` and tracks `best = Math.max(best, score)`; `isNewRecord` helper if useful to the orchestrator
  - [x] T2.3 In-memory only — app-storage persistence (AsyncStorage/MMKV decision) is story 1.4 scope; do NOT add a storage dependency here
  - [x] T2.4 Tests in `triade/__tests__/game/matchScore.test.ts`: accumulation across moves, best tracks max, new-record transition, noop move adds nothing, game-over wiring stays out of the engine
- [x] T3 — Verify complete engine port + I/O matrix coverage (AC: 1, 2, 3, 4, 5, 7)
  - [x] T3.1 Audit `src/engine/core` against `js/game.js` exports: `SIZE`/`GRID_SIZE`, `canMerge`, `mergeValue`, `newGame`, `move`, `spawnTile`, `weightedValue`, `isGameOver` all present and behaviorally identical (spike already ported them — verify, do not rewrite)
  - [x] T3.2 Extend the ADR-01 purity test (`__tests__/engine/engine.purity.test.ts`) to scan BOTH `src/engine` and `src/game` (engine + `src/game` import nothing from RN/React/Skia/Expo) and confirm it passes
  - [x] T3.3 Run `node --test` (triade) and `npx tsc --noEmit` — full suite green
  - [x] T3.4 Update the story completion note with the final test count; do NOT modify `js/game.js`, `js/ui.js`, `js/debug.js`, or `test/game.test.js` (web PWA frozen)

## Dev Notes

### Critical Context

- **The port already exists and works.** Story 1.1 shipped the complete engine in `triade/src/engine/core/` (pure TS): `canMerge`, `mergeValue`, `shiftLine` (front-to-back, merge-once, one-cell), `movementLines`, `boardFromLines` + trace, `boardsEqual`, `spawnTile`, `newGame`, `move` (effective-move-only spawn), `isGameOver`. 39 triade tests pass today (31 in `game.test.ts` = 26 ported + 5 new, plus purity/smoke/benchmark). **Do NOT re-port or "clean up" the engine** — this story PROVES parity and adds score/best state.
- **`js/game.js` is read-only.** The web PWA is the frozen legacy secondary surface. Any behavior difference must be reported, not silently "fixed" in the TS engine (that would break the identity contract).
- **The trace is the game's identity.** `move()` returns `{ board, score, moved, trace }`; the Skia board (story 1.3) renders 100% from the trace. Parity assertions MUST check the trace, not only the board.
- **Best-score persistence is NOT this story.** App storage (AsyncStorage vs MMKV, decided by the deferred T4.5 benchmark) ships in story 1.4. Story 1.2 delivers in-memory score/best state in the orchestrator.

### Source Tree Components to Touch

- `triade/src/engine/core/*.ts` — existing ported engine (read/verify; only extend if parity finds a real bug).
- `triade/src/game/matchScore.ts` — NEW pure score/best module (`src/game` does not exist yet; create the directory).
- `triade/__tests__/engine/engine.parity.test.ts` — NEW differential parity suite.
- `triade/__tests__/game/matchScore.test.ts` — NEW score/best tests.
- `js/game.js` — read-only reference engine for parity (UMD CJS: `module.exports` under Node).
- `triade/package.json` — `"test": "node --test"` must keep discovering the new `__tests__/game/` files (bare `node --test`, no directory arg).
- `.github/workflows/ci.yml` — CI already runs `tsc --noEmit` + `node --test` in `triade/`; new tests ride that gate for free.

### Engine Port Requirements (identical behavior — verify, do not rewrite)

- Merge predicate: `(a===1 && b===2) || (b===1 && a===2) || (a>=3 && a===b)`. Merge value: `a <= 2 ? 3 : a*2`. `1+1` and `2+2` NEVER merge.
- Merge-once / one-cell identity: each tile moves at most 1 cell per swipe; a freshly merged tile is locked (never re-merges in the same swipe). `[3,3,3,3] → [6,3,3,_]`; `[1,2,3,_] → [3,3,_,_]`.
- DO NOT rewrite `shiftLine` with 2048-style compaction (`filter`+`concat`) — front-to-back with simultaneous semantics; compaction breaks merge-once and the trace.
- Spawn only after an effective move (`boardsEqual` noop spawns nothing, scores nothing, consumes no turn). Weights 40/40/20 for 1/2/3.
- `move()` returns `{ board, score, moved, trace }`; trace entries `{ value, to:[r,c], from:[[r,c]...], spawned }`. Preserve the exact trace.
- Randomness ONLY via injectable `rng` param (fallback `Math.random`) in `newGame`, `move`, `spawnTile`, `weightedValue`.
- `isGameOver` reuses the SAME merge predicate (never "optimize" to equality-only — loses 1-2 adjacencies).
- Score increments by the merged tile's value.
- Board is a 2D array `board[r][c]` of `null | value`. Directions `'left'|'right'|'up'|'down'`.

### Known Deferred Behaviors — PRESERVE, do not "fix"

These were reviewed in story 1.1 (pass 2) and deferred as faithful-port behavior identical to `js/game.js`. Parity tests should EXPECT them:

- `pickIndex` lets `NaN` through both clamps (`spawn.ts`); default `Math.random` never yields NaN — internal callers guard `len > 0`.
- `pickIndex` returns `-1` when `len===0` — internal callers guard.
- `shiftLine`/`move`/`boardFromLines` assume 4×4 and crash on shorter input — `Board` is a fixed 4×4 contract.
- Noop moves return a full trace of stationary tiles — the trace contract is the game's identity.
- `mergeValue` ignores its second operand outside the `canMerge` guard — only ever called under `canMerge`.
- `spawnTile` mutates its input board and returns the same reference — `move()` only passes a freshly built board.

### Testing Standards

- Runner: `node:test` + `node:assert` — command **`node --test`** (no directory arg; `node --test test/` fails on Node 26+). Node 26 type-strips TS natively.
- Determinism mandatory: seeded `mulberry32` (shared from `triade/src/utils/mulberry32.ts` / `test-utils/helpers.ts`); **never `Math.random`** in tests.
- Reuse existing helpers (`emptyBoard`, `rngOf`, `staticBoard`, `boardWith`, `SIZE`) from `triade/test-utils/helpers.ts` — don't invent parallel fixtures.
- Loading the legacy engine in an ESM TS test: `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url); const web = require('../../../js/game.js')` (path from `triade/__tests__/engine/` to repo root). Its API is the UMD `module.exports` surface.
- The parity test's rng must be consumed IDENTICALLY by both engines — the same `rng` instance drives `move` on each side in the same order, so spawn rolls line up.

### Architecture Compliance

- `src/engine` and `src/game` import nothing from RN/React/Skia/Expo (ADR-01). The purity test enforces this on BOTH trees — extend `engine.purity.test.ts` to scan `src/game` alongside `src/engine` (T3.2). Score/best is pure orchestration state.
- Renders derive from trace/snapshot only — no heuristic matching in the UI, no rules outside the engine (this story only PROVES the engine; rendering is story 1.3).
- Engine produces new board objects (feeds `boardsEqual`, trace, testability) — never mutate in place.
- Directory layout follows `game-architecture.md` Project Structure: `src/game` = orchestration (state machine, undo stack, lanes — score state starts here; undo/lanes are later stories).

### Project Context Rules

- Naming: TS modules camelCase (`matchScore.ts`); components PascalCase; tests `.test.ts`; true constants UPPER_SNAKE (`GRID_SIZE = 4`); events PascalCase with discriminated `type`.
- No comments unless they clarify a non-obvious rule; no emojis in code.
- Do NOT modify `js/game.js`, `js/ui.js`, `js/debug.js`, or `test/game.test.js`.
- The RN app never uses the web debug panel pattern for production; debug tools are `__DEV__`-only (later stories).
- Reference `docs/` and `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` before guessing conventions.

### Previous Story Intelligence (story 1.1)

- Engine ported and green: 39 triade tests pass, `tsc --noEmit` clean, ADR-01 purity verified, CI benchmark ships (engine cost/turn budget `< 0.1 ms`, frame-logic tail p99 `< 0.2 ms`).
- Version matrix corrected by spike evidence: Skia 2.6.2 / reanimated 4.5.1 / worklets 0.10.1 are the pinned SDK-57 versions (NOT the earlier 2.11.0/4.3.x/0.8.x).
- Device gates deferred (need physical iPhone): T1.4 (dev-build boot), T5.2 (on-device frame-rate p99 < 16.7 ms).
- Review learnings applied in 1.1: purity test regex now strips comments + extracts dynamic `import()`; `mulberry32` shared in `src/utils/`; benchmark measures tail p99 (renamed honestly), rotates all 4 directions and 4 board shapes, and times game-over post-spawn.

### Git Intelligence

- Branch: `feature/1-2-port-completo-do-engine-de-regras-para-typescript` (created for this story, off `main`).
- Previous PR: `44c3c05` merge of `feature/1-1-technical-spike-engine-ts-board-skia-benchmark-ci` (`46d82cc`).
- Web PWA MVP (`cdc0e99`) is the legacy baseline; `test/game.test.js` is the 26-test source.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — Story ACs (lines 263-279)
- [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory] — FR-1, FR-2 (lines 26-27); FR Coverage Map (line 148-149)
- [Source: _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md#ADR-01] — engine purity boundary (line 408)
- [Source: _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md#Project Structure] — `src/game` orchestrator location (lines 528-559)
- [Source: js/game.js] — reference engine (UMD export surface: `SIZE`, `canMerge`, `mergeValue`, `newGame`, `move`, `spawnTile`, `weightedValue`, `isGameOver`)
- [Source: test/game.test.js] — the 26 tests to stay passing unchanged
- [Source: _bmad-output/implementation-artifacts/1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md] — prior story; port/benchmark/dev-notes (story 1.1)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — deferred behaviors to preserve (2026-08-10)

## Dev Agent Record

### Agent Model Used

- deepseek-v4-flash (opencode)

### Debug Log References

- Baseline at start: 39 triade tests pass, `npx tsc --noEmit` clean, `node --test test/game.test.js` = 26 web tests pass.
- Parity suite (8 tests) written first and green on first run — confirms the story-1.1 port is behaviorally identical to `js/game.js`; no engine changes required (only tests added).
- matchScore tests: two initial test bugs fixed (cumulative-score arithmetic in "best tracks max" and a `'moved' in s` runtime assertion vs TS type — changed to `in` operator checks).

### Completion Notes List

- **T1 (parity suite):** `triade/__tests__/engine/engine.parity.test.ts` loads `js/game.js` via `createRequire(import.meta.url)` and runs the same seeded scenario matrix through the TS engine and the web UMD engine, asserting identical `{ board, score, moved, trace }`. 8 tests cover: newGame 9-tile identity, weightedValue 40/40/20 boundaries, canMerge/mergeValue predicate matrix, 16 move scenarios (1+2 both orders, non-merge 1+1/2+2, equal ≥3, one-cell left/right/up/down, higher merges, noop, up/down columns), spawn-once with identical rng consumption, isGameOver terminal boards, spawnTile, and exact trace contract (merge sources, advance, spawn flag, noop has no spawn). Deterministic `mulberry32` only; no `Math.random`.
- **T2 (score/best state):** `triade/src/game/matchScore.ts` — pure TS orchestrator state `initialScore(best)`, `applyMove(current, result)` (accumulates `result.score`, `best = Math.max(best, score)`), `isNewRecord(previousBest, score)`. In-memory only; no storage dependency (persistence is story 1.4). 7 tests in `triade/__tests__/game/matchScore.test.ts`: accumulation, best tracks max, noop adds nothing, new-record transition, game-over wiring stays out.
- **T3 (verification):** Export audit — `GRID_SIZE`(=4) plus `canMerge`, `mergeValue`, `newGame`, `move`, `spawnTile`, `weightedValue`, `isGameOver` all present in `src/engine/core/index.ts` and behaviorally identical (proven by parity suite). Purity test extended to scan `src/game` alongside `src/engine` (ADR-01) and passes. Full suite: **57 triade tests green** (39 baseline + 9 parity + 8 matchScore + 1 suite-parity), `npx tsc --noEmit` clean, web PWA **26 tests unchanged and green**. No web PWA files modified (`js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` untouched).

### File List

- `triade/__tests__/engine/engine.parity.test.ts` (new) — differential parity suite vs `js/game.js`
- `triade/__tests__/engine/engine.purity.test.ts` (modified) — purity scan extended to `src/game` (ADR-01)
- `triade/src/game/matchScore.ts` (new) — pure score/best orchestrator state
- `triade/__tests__/game/matchScore.test.ts` (new) — score/best unit tests
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — story status ready-for-dev → in-progress → review

### Review Findings

- [x] [Review][Patch] Suite-parity regex misses backtick/apostrophe/escaped-quote names and does not strip comments [triade/__tests__/engine/engine.suite-parity.test.ts:16] — `[^'"]+` terminates at quotes, backticks unhandled, and a `test('name',` inside a comment/string is falsely extracted
- [x] [Review][Patch] Parity `cloneResult` JSON round-trip normalizes NaN→null, -0→0, drops undefined [triade/__tests__/engine/engine.parity.test.ts:50] — masks real numeric divergences both engines could share
- [x] [Review][Patch] `matchScore.best` conflates persisted best with live session max; `isNewRecord(s.best, s.score)` is false on the record-breaking move [triade/src/game/matchScore.ts:12-18] — document the contract or store the session-start best; add test using `s.best`
- [x] [Review][Patch] Rng roll-count parity only proven for one effective-move scenario; noop 0-roll consumption never asserted [triade/__tests__/engine/engine.parity.test.ts:176-185]
- [x] [Review][Patch] Purity ENOENT swallow silently voids the `src/game` half of ADR-01 if that dir is missing/typo'd [triade/__tests__/engine/engine.purity.test.ts:36-42]
- [x] [Review][Patch] Docs claim 54 triade / 80 total tests but actual is 55 / 81 — suite-parity test unaccounted [automation-summary.md, test-review-report.md]
- [x] [Review][Patch] test-review-report stale vs shipped code: lists coverage tooling as "not started" (ci.yml already adds it) and flags unused `dirname` (already removed) [test-review-report.md]
- [x] [Review][Defer] `applyMove` no guard on `result.score` — NaN poisons state, `moved:false`+score>0 would inflate [triade/src/game/matchScore.ts:12-15] — deferred, pre-existing engine contract guarantees finite ≥0, noop scores 0
- [x] [Review][Defer] Parity `spawnTile` only exercises non-full-board path; full-board spawn-nothing branch never cross-checked [triade/__tests__/engine/engine.parity.test.ts:232] — deferred, covered by absolute unit test game.test.ts:198
- [x] [Review][Defer] 13 parity move scenarios assert only TS===web, never an absolute outcome — shared-bug blind spot [triade/__tests__/engine/engine.parity.test.ts:110-173] — deferred, header documents limitation; absolute oracle is unit suite (game.test.ts)

### Review Findings — re-review (2026-08-10, gds-code-review)

- [x] [Review][Patch] Parity result-shape drift invisible: `cloneResult` rebuilds a fixed `{board, score, moved, trace}`; an extra field on either engine passes silently [triade/__tests__/engine/engine.parity.test.ts:55-62] — assert `Object.keys` equality on both results
- [x] [Review][Patch] Parity never asserts `move()` leaves its input board unmutated — project-context contract (never mutate board in-place); an in-place mutation in the TS engine passes parity because inputs are cloned per side [triade/__tests__/engine/engine.parity.test.ts:72-76]
- [x] [Review][Patch] `DIRS` constant is dead code — declared, never referenced [triade/__tests__/engine/engine.parity.test.ts:19]
- [x] [Review][Patch] `weightedValue` parity misses roll `0.0` — a valid `[0,1)` boundary that catches off-by-one in the 40/40/20 split [triade/__tests__/engine/engine.parity.test.ts:94]
- [x] [Review][Patch] Story completion note test count wrong: claims "54 triade" but actual is 57 (parity is 9 not 8, matchScore is 8 not 7, suite-parity 1 omitted) — violates T3.4 [story 1-2:152]
- [x] [Review][Patch] Purity per-root guard: combined `assert.ok(files.length > 0)` silently voids the `src/game` half of ADR-01 if that dir empties — assert each PURITY_ROOT yields files [triade/__tests__/engine/engine.purity.test.ts:60-75]
- [x] [Review][Patch] CI coverage step contradicts "informational — not a gate": a failure still fails the job, re-runs the whole suite (incl. benchmarks) a second time, and reports unfiltered coverage mixing tests/helpers/`js/game.js` [.github/workflows/ci.yml:33-34]
- [x] [Review][Defer] `isNewRecord`/`best` API conflates persisted best with live session max; the persisted value becomes unrecoverable once the session passes it — contract documented + tested; revisit when app-storage lands in story 1.4 [triade/src/game/matchScore.ts:17-21] — deferred, works as documented; orchestrator must call with session-start best
- [x] [Review][Defer] `applyMove` has no guard on `result.score` — NaN poisons state, `moved:false`+score>0 would inflate — already in deferred-work ledger from prior review [triade/src/game/matchScore.ts:12-15] — deferred, engine contract guarantees finite ≥0
- [x] [Review][Defer] No multi-move / full-game seeded differential in the parity suite — sequence-level divergences invisible [triade/__tests__/engine/engine.parity.test.ts] — deferred, unit suite + parity matrix cover the I/O matrix; enhancement for a future pass
