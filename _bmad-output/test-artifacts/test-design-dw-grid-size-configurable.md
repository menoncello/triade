---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/board.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/line.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-grid-size-configurable — BoardConfig / GRID_SIZE parameterization threaded through engine core + helpers

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-grid-size-configurable`
**Scope:** Targeted test design for the working-tree delta of `dw-grid-size-configurable`

> **Delta under assessment:** Working-tree diff vs `HEAD` (`ea21dce` on `main`) — 8 files, `138 insertions / 69 deletions`:
> - `triade/src/engine/core/types.ts:1-27` — NEW `BoardConfig {size}`, `DEFAULT_BOARD_CONFIG`, `validateGridSize(size)`, `validateBoardConfig(config)`, `resolveGridSize(input?)` — hard-gate: only `4` passes, all other integers/NaN/float throw `RangeError`.
> - `triade/src/engine/core/board.ts:1-22` — `emptyBoard(boardConfig?)` and `boardsEqual(a,b,boardConfig?)` threaded via `resolveGridSize`; loops `0..size-1`; `boardsEqual` now defensive `a[r]?.[c] !== b[r]?.[c]`.
> - `triade/src/engine/core/game.ts:1-145` — `newGame(rng, boardConfig?)`, `move(state,dir,rng,boardConfig?)`, `isGameOver(board,boardConfig?)` threaded; `size = resolveGridSize(boardConfig)`; `movementLines`/`boardFromLines`/`spawnTile` all called with `size`; candidate calc `oppCol/oppRow = size-1`; defensive `board[r]?.[c]` in `isGameOver`.
> - `triade/src/engine/core/line.ts:1-114` — `movementLines(board,dir,boardConfig?)` and `boardFromLines(lines,dir,boardConfig?)` threaded; `size` drives row/col counts and `boardFromLines` placement `c = size-1-k` / `r = size-1-k`; defensive `board[r]?.[c] ?? null`.
> - `triade/src/engine/core/spawn.ts:1-127` — `spawnTile(board,value,rng,candidates,boardConfig?)` threaded; `size` drives empty-scan `0..size-1` and candidate OOB filter `r <0 || r >= size || c <0 || c >= size`.
> - `triade/src/engine/core/index.ts:1-4` — re-exports `GRID_SIZE, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize, BoardConfig`.
> - `triade/test-utils/helpers.ts:1-170` — mirrors core: `SIZE = GRID_SIZE`, re-exports `DEFAULT_BOARD_CONFIG/validateGridSize/validateBoardConfig/resolveGridSize`; `emptyBoard(boardConfig?)`, `staticBoard(row,boardConfig?)`, `boardWith(matrix,boardConfig?)`, `occupiedCells(board,boardConfig?)`, `oppositeEdgeCandidates(board,dir,boardConfig?)` threaded; `occupiedCells` infers from `board.length` when `boardConfig==null` for legacy callers.
> - `_bmad-output/implementation-artifacts/deferred-work.md:655-659` — entry `GRID_SIZE fixed 4x4` (`line.ts` + `helpers.ts:15 SIZE=4`) flipped `open → done 2026-09-02` with `resolution: resolved by sweep bundle dw-grid-size-configurable` + `resolution-undo: 0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f` 64-hex.
> - `sprint-status.yaml` is **orchestrator-owned** and intentionally not in scope — no write, no revert.

---

## Executive Summary

**Scope:** Close the DW `GRID_SIZE 4x4 fixed` coupling that prevented level-specific sizes. The sweep introduces a `BoardConfig` seam (`validate/resolve`) threaded through every engine entry point plus the test helpers, but gates it to `only 4` for now (enabling without yet varying). Before the sweep `line.ts` assumed `GRID_SIZE` constant, `helpers.ts:15 SIZE=4` was its own literal, and no API accepted a size param — level threading was impossible. After the sweep every path `emptyBoard/newGame/move/isGameOver/movementLines/boardFromLines/spawnTile/occupiedCells/oppositeEdgeCandidates` accepts `number|BoardConfig|null` and validates, with default `null → 4` preserving exact 4x4 behavior for all existing callers. The risk is not "does 5x5 work" (it is intentionally rejected today) but "does 4x4 still work byte-for-byte, does every threaded path validate identically, and does the helpers mirror stay single-source with core."

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3
- Critical categories: TECH (hard-gate only-4 vs future sizes, 4x4 backward-compat, size propagation to candidates/trace), DATA (board shape vs GRID_SIZE contract, helper inference vs explicit config)

**Coverage Summary:**

- P0 scenarios: 10 groups (validate/resolve throws on non-4, default null→4, emptyBoard/newGame/move 4x4 identity vs baseline, candidate opposite-edge size-1 mapping, spawnTile OOB filter size-aware, boardsEqual defensive optional-chain)
- P1 scenarios: 8 groups (BoardConfig object vs number param parity, isGameOver 4x4 vs full+no-merge still true, movementLines/boardFromLines round-trip, helper SIZE alias, occupiedCells legacy inference, re-export surface, ledger resolution-undo 64-hex)
- P2/P3 scenarios: 8 groups (NaN/Infinity/float validation, helpers staticBoard/boardWith threading, docs-not-code change, exploratory future-size enablement deferred, perf O(1) resolve)
- **Total effort**: ~3.5–6.0 hours (~0.5–0.75 day; host-only `node:test` + `tsc`, no device lane — pure `triade/src/engine|test-utils` TS, `npm --prefix triade test` + both `tsc --noEmit` gates `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Actual variable board sizes (3x3, 5x5, 6x6) and per-level sizing, board UI scaling, persistence of BoardConfig, level-select wiring** | The current `validateGridSize` hard-gates to `only 4` (`validateGridSize: size !== 4 → RangeError`). Enabling non-4 sizes is a future story; the seam exists but is closed. Changing to allow `5` requires a second sweep (remove gate, update loops, adapt `isGameOver`/`ceilingDetector`/`layout.ts`, add BoardConfig persistence). | This design pins the gate intentionally: every entry point must `throw RangeError` for any `size !==4`. Future enablement must add new tests and update this plan. |
| **Engine merge/score rules `canMerge/mergeValue/shiftLine` merge-once cascade, weight distribution `FIXED_WEIGHTS 40/40 + POT_WEIGHT`, `ceilingDetector/tierForCeiling/potForTier`, `matchScore/matchStats`, `App/GameBoard` Skia/Reanimated, `RNGH` gesture, `layout.ts/Hud.tsx`** | No file in the delta modifies merge logic, weights, ceiling, pot, stats, or render. `git diff -- triade/src/engine` touches only threading (`resolveGridSize(size)` + `size` loops) not rule bodies; `game.test.ts`/`line.test.ts`/`ceiling.test.ts` behavior is unchanged except via `size` param default `4`. | Existing 926 pass / 366 skipped baseline (`npm --prefix triade test` on `ea21dce`) stays the invariant. Any regression in merge/weights/ceiling would be caught by `game.test.ts` 32 + `line.test.ts` + `ceiling.test.ts` etc. |
| **Reintroducing non-4 GRID_SIZE global, changing `Board/Cell/Direction/GameState` public shapes, changing store schema** | Spec-boundary: the sweep must not change store shape or public snapshot types beyond adding optional param. `BoardConfig` is additive; `GRID_SIZE` stays `const 4`. | Pinned via `rg -n "export const GRID_SIZE" triade/src/engine/core/types.ts` → `4` + `rg -n "export type Board" triade/src/engine/core/types.ts` 1 hit + both `tsc --noEmit` clean. |
| **Editing `sprint-status.yaml` or deferred-work beyond the single DW entry** | `sprint-status.yaml` is orchestrator-owned (`never write it, and never revert`). `deferred-work.md` change is exactly one entry `GRID_SIZE fixed 4x4 open→done` with `resolution-undo: 0f53c41e…` 64-hex (`git diff HEAD -- deferred-work.md` 1 hunk). | This plan never writes `sprint-status.yaml`; `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in CI. Ledger already records the correct hash. |
| **Board `role="grid"` a11y, dev-build physical device, frame-rate bench, rewarded-ads/RevenueCat/Epic 9-11** | No a11y/bench/ads code touched. | Existing suites + manual-validation domain remain. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** All 8 threaded paths are pure TS with no `expo-*`/`Skia`/`Reanimated`/`RNGH`/`MMKV`: `validateGridSize(n)→throws|void`, `resolveGridSize(n|{size}|null)→4|throws`, `emptyBoard(boardConfig?)→Board size×size`, `newGame(rng,boardConfig?)→GameState`, `move(state,dir,rng,boardConfig?)→MoveResult`, `isGameOver(board,boardConfig?)→boolean`, `movementLines(board,dir,boardConfig?)→CellRef[][]`, `boardFromLines(lines,dir,boardConfig?)→{board,trace}`, `spawnTile(board,value,rng,candidates,boardConfig?)→SpawnResult`. All host-testable via `node --import tsx --test` with `rngOf/spyRng/mulberry32`, `boardWith/emptyBoard` fixtures, and `boardConfig` as `number` vs `{size}`.

**Observability — Good.** Outputs are deterministic numerics/booleans/objects with no hidden state: `resolveGridSize(5)→RangeError`, `emptyBoard(4).length→4`, `newGame(rng,4).board.length→4`, `boardsEqual(4x4,4x4,4)→true`, `isGameOver(full 4x4 with merges→false)`, `spawnTile` candidate OOB vs in-bounds deterministically filtered by `size`, trace `to: [r,c]` uses `size-1-k` observable.

**Reliability — Strong (engine throws only via validation, helpers throw on misuse).** All normal `size=4|null` paths are `never-throws` (existing 926 pass). Any non-4 integer/float/NaN/Infinity throws `RangeError` deterministically from every entry point (`types → board/game/line/spawn/helpers`). `rngOf/spyRng` still throw on over-draw so draw-budget remains gated. Both `tsc` gates (`tsconfig.json` + `tsconfig.test.json`) clean; `npm --prefix triade test` full gate `<15 min` on `ea21dce` was `926 pass`.

**Testability Risks:** Two surfaces are thin: (a) helper mirror `triade/test-utils/helpers.ts` re-exports `validateGridSize/validateBoardConfig/resolveGridSize` from `triade/src/engine/core/index.ts` — a future drift that reimplements instead of re-exporting would diverge validation message but tests would still pass if new message not scanned (R-008); mitigated by `rg "from '../src/engine/core/index"` pin + message `RangeError: \[BoardConfig\] unsupported` scan. (b) `occupiedCells` legacy inference `board.length` when `boardConfig==null` — malformed `board.length===3` but `GRID_SIZE=4` would infer `3` and iterate 3 not 4, masking shape bug; mitigated by validation on explicit path and noting that production boards are always `4×4` via `emptyBoard/newGame`.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Hard-gate only-4: `validateGridSize` / `validateBoardConfig` / `resolveGridSize` must throw `RangeError` for any `size !== 4` (including 3,5,6,0,-1,3.5,NaN,Infinity, null.size).** A regression that silently accepted `5` without updating `isGameOver`/`boardFromLines`/`spawnTile` loops would produce a 5-wide board with 4-high scans (missing row) or `board[r]` undefined crashes. Conversely a regression that threw on `null/undefined` would break every existing caller that omits `boardConfig`. | 2 | 3 | **6** | Enforce symmetric validation: (a) **host P0 pins** `types.test helpers`: `resolveGridSize(null)→4, resolveGridSize(4)→4, resolveGridSize({size:4})→4`; `validateGridSize(3/5/0/-1/3.5/NaN/Infinity)→RangeError` 7 cases; `validateBoardConfig(null/{} /{size:'4'}/ {size:5})→RangeError`; `resolveGridSize(5)→RangeError` (b) **threading pins** same throw from every entry point `emptyBoard(5)→RangeError, newGame(rng,5)→RangeError, move(state,'left',rng,5)→RangeError, isGameOver(b,5)→RangeError, movementLines(b,'left',5)→RangeError, boardFromLines(lines,'left',5)→RangeError, spawnTile(b,1,rng,undefined,5)→RangeError` (c) **static scans** `rg -n "validateGridSize" triade/src/engine/core/types.ts` 3 hits + `rg -n "RangeError.*unsupported grid size" triade/src/engine/core/types.ts` 1 hit; Spec I-O rows 1-2. | FE lead | Immediate (gate DW configurable) |
| R-002 | TECH / DATA | **Backward-compat 4x4 identity — existing callers that omit `boardConfig` (100% of `game.test.ts` 32, `line.test.ts`, `spawn.test.ts`, `adaptive-spawn-integration`, helpers consumers) must produce byte-identical boards/scores/traces/pendingSpawn as before.** `emptyBoard()` still 4x4, `newGame(rng)` still 9 tiles with same seeded order, `move(state,dir,rng)` still 3 draws effective / 0 noop, `isGameOver(4x4 full + merge)` still true/false same as before. A regression that changed default from `GRID_SIZE` to `resolveGridSize(undefined) → 3` via off-by-one would silently corrupt 926 passes into `EXPECT RED`. | 2 | 3 | **6** | Enforce identity: (a) **host P0 pins** `emptyBoard().length===4 && every row.length===4`; `newGame(rngOf(20 seed)).board` deepEquals snapshot baseline; `move` 4-dir smoked vs baseline `game.test.ts` traces still pass (`npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass); `boardsEqual(emptyBoard(), emptyBoard())→true` with and without explicit `4`; `isGameOver` 4x4 pins unchanged (b) **suite gate** `npm --prefix triade test` 926 pass unchanged vs `ea21dce` baseline (c) **static scan** `rg -n "resolveGridSize\(boardConfig"` in each of board/game/line/spawn 1 hit each; helpers `SIZE===GRID_SIZE` 1 hit. | FE lead | Immediate |
| R-003 | TECH | **Size propagation to opposite-edge candidates and trace placement — `move` builds `candidates` via `oppCol = size-1` / `oppRow = size-1` and `boardFromLines` places via `c = size-1-k` / `r = size-1-k`; `spawnTile` OOB filter uses `size`.** Bug mapping `size-1` off-by-one would place directional spawn at col 2 instead of 3 (for size 4) or silently allow `[4,0]` (OOB) as candidate, violating AC3/AC4 of story 12.1. | 2 | 3 | **6** | Enforce placement: (a) **host P0 pins** `oppositeEdgeCandidates(board,'left',4)→ every [row,3]`; `move` effective via `gameState` with 1 moved line `directional spawn lands at [movedRow,3]` for left, `[movedRow,0]` for right, `[3,col]` for up, `[0,col]` for down — 4 dirs; `boardFromLines` 4-dir round-trip `movementLines(4x4,dir,4) → boardFromLines(...,dir,4)` recovers same occupied cells (b) **host P0 spawnTile filter** `spawnTile(fullBoard,1,rng,[[4,0],[0,4],[3,3]],4)→ ignores [4,0]/[0,4] OOB, only [3,3] eligible if empty` + `candidates [[0,0]] on occupied 4x4 full→ pool 0 → nulls` (c) **static scans** `rg -n "oppCol.*size - 1" triade/src/engine/core/game.ts` 1 + `rg -n "size - 1 - k" triade/src/engine/core/line.ts` 2 hits. | FE lead | Immediate |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **boardsEqual defensive `a[r]?.[c] !== b[r]?.[c]` — must still detect equality correctly and not mask jagged boards as equal.** Old loop used `GRID_SIZE` hard; new uses `size` + optional chain. If one board is jagged `[[1,2],[3]]` (missing col) the old would throw or compare `undefined`; new must compare via `?.` and still return `false` when shape differs but size says equal. | 2 | 2 | 4 | Pin defensive equality: (a) **host P1 pins** `boardsEqual(emptyBoard(4), emptyBoard(4),4)→true`; `boardsEqual(boardWith([[1]]), boardWith([[2]]),4)→false` on cell diff; jagged `[[1,2]] vs [[1,2,null]]` still false via scan `0..size-1` + `?.` (b) **static scan** `rg -n "boardsEqual" triade/src/engine/core/board.ts` 1 hit + `rg -n "a\[r\]\?\.\[c\]" triade/src/engine/core/board.ts` 1 hit. |
| R-005 | TECH | **isGameOver scan `board[r]?.[c]` — defensive chain must not hide that a row is missing and then incorrectly report not-game-over or game-over.** `isGameOver` is the last gate before overlay; scanning `size` rows with `?.` on a 3-row board would see `undefined===null → false` and would miss that missing row should have been counted as not-full. But production boards are always `emptyBoard(4)` / `newGame` shape, so missing-row never occurs. | 1 | 3 | 3 | Pin game-over 4x4 pins unchanged: (a) **host P1 pins** `isGameOver(emptyBoard(4),4)→false` (has nulls); `isGameOver(full 4x4 no-merge,4)→true`; `isGameOver(full 4x4 with 1 merge pair,4)→false` — existing `game.test.ts` gameOver 4 pins still green (b) **static scan** `rg -n "isGameOver" triade/src/engine/core/game.ts` 1 hit. |
| R-006 | TECH | **Helper mirror drift — `triade/test-utils/helpers.ts` re-exports vs reimplements `validateGridSize/resolveGridSize`.** If helpers reimplemented with different message or with `size===4 || size===5` while core stays `only 4`, helper tests would pass with `5` while engine throws, masking drift. | 2 | 2 | 4 | Pin single-source: (a) **static scans** `rg -n "from '\.\./src/engine/core/index" triade/test-utils/helpers.ts` 1 hit + `rg -n "export \{ DEFAULT_BOARD_CONFIG" triade/test-utils/helpers.ts` 1 hit + `rg -n "respect.*board.length" triade/test-utils/helpers.ts` legacy comment (b) **host P1 pin** `helpers.resolveGridSize(5) → RangeError` same message as `core.resolveGridSize(5)`; `SIZE===GRID_SIZE` gate; both `tsc --noEmit` clean proves export shapes align. |
| R-007 | TECH | **occupiedCells / oppositeEdgeCandidates legacy inference `board.length` when `boardConfig==null`.** Callers that omit `boardConfig` and pass a non-4 board (future test) would infer `3` from `board.length===3` while `resolveGridSize(null)` would have resolved `4`, mismatching. | 2 | 2 | 4 | Pin legacy inference: (a) **host P1 pins** `occupiedCells(boardWith([[1]]))` infers `board.length` correctly for 4x4; `occupiedCells(board,4)` explicit validates; `oppositeEdgeCandidates(board,'left')` without config infers `board.length` and yields `[row,3]` for 4x4 (b) **static scan** `rg -n "board\.length \|\| GRID_SIZE" triade/test-utils/helpers.ts` 1 hit + `rg -n "resolveGridSize\(boardConfig"` helpers 3 hits. |
| R-008 | BUS / OPS | **Re-export surface in `triade/src/engine/core/index.ts` — must expose exactly `GRID_SIZE, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize, BoardConfig`.** Missing export would break consumers that `import { BoardConfig }` from `core/index`. Duplicate export would break tree-shake. | 1 | 3 | 3 | Pin surface: (a) **static scans** `rg -n "export \{ GRID_SIZE" triade/src/engine/core/index.ts` 1 + `rg -n "BoardConfig" triade/src/engine/core/index.ts` 2 hits; both `tsc` clean proves types resolve (b) **host P1 pin** `import { BoardConfig } from 'triade/src/engine/core/index'` compiles. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | OPS | **Ledger `resolution-undo: 0f53c41e…` 64-hex for the single DW entry `GRID_SIZE fixed 4x4` + `sprint-status.yaml` ownership.** Sweep flips exactly one deferred-work hunk `open→done 2026-09-02` with `resolution-undo: 0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f` 64-hex; `sprint-status.yaml` must stay untouched. | 1 | 2 | 2 | Monitor — `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty (gate `epic-1/2/4/6 done` unchanged); ledger `rg -n "0f53c41e" deferred-work.md` 1 hit. Any reopen must keep hash. This plan never writes ledger or status. |
| R-010 | PERF | **`resolveGridSize` per-call overhead across `emptyBoard`/`move`/`isGameOver`/`movementLines`/`boardFromLines`/`spawnTile` — 6 calls per effective move.** Each is a single `typeof` + `Number.isInteger` + compare, `<0.01 ms`, vs 60 FPS budget `<8 ms`; 50-move replay wall stays `<30 ms`. | 1 | 1 | 1 | Monitor — `npm --prefix triade test` wall-clock log; `tsc` both configs `<5 s` proves no allocation leak; no bench lane needed (feels 8-1..8-6 bench already covers frame budget). |

### Risk Category Legend

- **TECH**: hard-gate `validateGridSize only 4` vs future sizes, `resolveGridSize(null)→4` default, `size` propagation to `emptyBoard/movementLines/boardFromLines/spawnTile` loops, `oppCol/oppRow size-1` opposite-edge, `boardsEqual` optional-chain, `oppositeEdgeCandidates` inference
- **DATA**: board shape `size×size` vs `GRID_SIZE` contract, `isGameOver` null-scan vs missing-row, candidate OOB filter `size` vs hardcoded `4`
- **BUS**: `BoardConfig` seam enabling level-specific sizes vs current closed gate (no per-level wiring yet)
- **OPS**: `deferred-work.md` 64-hex `resolution-undo` ledger, `sprint-status.yaml` orchestrator ownership (never write/revert)
- **SEC**: n/a for this bundle (no tokens/network/store)
- **PERF**: per-call `resolveGridSize` O(1) `<0.01 ms`; no device lane — pure engine/helpers ATDD

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category    | Requirement / Threshold | Risk Link | Planned Validation                         | Evidence Needed                  |
| --------------- | ----------------------- | --------- | ------------------------------------------ | -------------------------------- |
| Reliability | engine-never-throws on any valid 4x4 `Board/Rng/candidates` — `spawnTile`/`move`/`isGameOver` never throw for `boardConfig null|4|{size:4}`; only non-4 throws `RangeError` | R-001, R-004, R-005 | Host `helpers` + `core` 4x4 pins 10 P0 all green; `game.test.ts` 32 including full-board spawn-nothing still green | `npm --prefix triade test -- __tests__/engine/game.test.ts` pass 32; `tsc --noEmit` both configs clean |
| Determinism | Same `boardConfig + seed + dirs` → identical `board/pendingSpawn/trace` across two independent `mulberry32(seed)` replays; draw-budget `effective 3 / noop 0 / newGame 20` preserved with/without explicit `4` | R-002, R-003 | Host `rngOf/spyRng` throw-on-exhaust + `mulberry32(seed)` replays 10/20/50 moves with `boardConfig 4` explicit vs omitted | `game.test.ts` draw-budget pins + `engine.parity-hardening.atdd` replay pins still green with added explicit-4 variant |
| Maintainability | Single `GRID_SIZE=4` + single `BoardConfig` + single `resolveGridSize` definition; single `DEFAULT_BOARD_CONFIG`; helpers re-export not reimplement | R-006, R-008 | Static scans `GRID_SIZE` 1 definition, `DEFAULT_BOARD_CONFIG` 1, `BoardConfig` 1, `validateGridSize` 1; helpers `from '..'` re-export | `rg -n "GRID_SIZE" types.ts` 1 + `rg -n "BoardConfig" types.ts` 1 + `rg -n "from.*core/index" helpers.ts` 1 |
| Performance | Per-`move` 6× `resolveGridSize` + size loops O(1) per tile `<0.1 ms`, 50-move replay `<30 ms`, full `npm test` gate `<15 min` for 926 baseline | R-010 | Host wall-clock `npm --prefix triade test` gate; `tsc` both configs `<5 s` | Wall-clock log + `tsc` log; no device lane needed |
| Compliance / Contract | `Board/Cell/Direction/GameState` public types unchanged; `BoardConfig` additive only; `GRID_SIZE` still `const 4`; overlay `GameOverOverlay` thin-view unaffected | R-002 | `rg` scans `export type Board` + `GRID_SIZE` + `BoardConfig` each 1 hit; `tsc` both configs | `triade/src/engine/core/types.ts` shape scan + `tsc` clean |
| Security | N/A — no secrets/tokens/network/store/attester in scope | - | N/A | N/A |

**Unknown thresholds:** Non-4 sizes (`3,5,6`) have no spec'd threshold — intentionally `RangeError` today; enabling them requires new thresholds for `layout.ts` board scaling, `ceilingDetector` max-tile ladder, `spawnTile` weight distribution on non-4 empties, and persistence. All engine NFR thresholds derive from `game.ts:41-105` / `spawn.ts:72-96` / `ceiling.ts:5-50` existing contracts and are not re-quantized in this hardening.

---

## Entry Criteria

- [ ] Working-tree diff is exactly `types.ts:validateGridSize/resolveGridSize` + `board.ts/game.ts/line.ts/spawn.ts/index.ts` threading + `helpers.ts` mirror + `deferred-work.md` single-DW flip (`git diff --stat` 8 files, no `sprint-status.yaml` hunk)
- [ ] Helpers `triade/test-utils/helpers.ts` expose `SIZE, DEFAULT_BOARD_CONFIG, validateBoardConfig, validateGridSize, resolveGridSize` re-exported from `triade/src/engine/core/index.ts` and `triade/src/utils/mulberry32.ts` deterministic seam is available for any replay variants
- [ ] Engine contracts `GRID_SIZE=4`, `FIXED_WEIGHTS/POT_WEIGHT` unchanged (no weight/size drift beyond gate)
- [ ] Feature deployed to host harness (`node --import tsx --test` resolves `tsx` + `tsconfig.test.json`) — no Expo/Skia/RNGH runtime needed for board-size seam

## Exit Criteria

- [ ] All P0 10 groups passing including `validateGridSize` non-4 throws + default null→4 + 4x4 identity + candidate `size-1` + OOB filter + ledger 64-hex still retrievable
- [ ] All P1 8 groups passing (BoardConfig parity, isGameOver still true/false, lines round-trip, helper SIZE alias, re-exports, thin-view unaffected)
- [ ] No open high-priority (≥6) risks unmitigated (R-001 + R-002 + R-003 each 6) — mitigations are runtime `RangeError / deepEqual / trace-to / rg` pins not just header docs
- [ ] Test coverage agreed as sufficient (10 P0 + 8 P1 + helper mirror + ledger pin on top of 926 baseline)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` clean and `tsconfig.test.json` clean, `Math.random` not introduced in new pins, `sprint-status.yaml` untouched (`git diff --` empty)

## Project Team (Optional)

| Name   | Role     | Testing Responsibilities |
| ------ | -------- | ------------------------ |
| Eduardo | FE / Test Architect | Owns grid-size seam validation, board/core/helpers `rg` pin hygiene, ledger 64-hex + orchestrator `sprint-status.yaml` ownership gate |
| Murat (TEA) | QA / NFR assessor | Owns reliability/determinism/maintainability/perf compliance, `nfr-assess` header thresholds vs `nfr-criteria.md` mapping |

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| `validateGridSize` / `validateBoardConfig` / `resolveGridSize` hard-gate only-4 — null→4, 4→4, {size:4}→4, 3/5/0/-1/3.5/NaN/Infinity → RangeError | Unit | R-001 | 1 | QA | `types.ts:9-27` exhaustive 10-case: `resolveGridSize(null)===4, (4)===4, ({size:4})===4`; each of `types.validateGridSize(3/5/0/-1/3.5/NaN/Infinity)` + `validateBoardConfig(null/{}/{size:'4'}/{size:5})` → `RangeError("[BoardConfig] unsupported"` |
| `emptyBoard` 4x4 shape + default null vs explicit 4 parity | Unit | R-001,R-002 | 1 | QA | `board.ts:3-11` `emptyBoard().length===4 && every row.length===4` + `emptyBoard(4).length===4` + `emptyBoard({size:4}).length===4` + `emptyBoard(null).length===4` all deepEquals; `emptyBoard(5)→RangeError` |
| `newGame` default vs explicit 4 produces same 9-tile board + seeded rng 20 draws preserved | Unit | R-001,R-002 | 1 | QA | `game.ts:20-30` `newGame(rngOf(20 seed)).board` vs `newGame(rngOf(20 seed),4).board` + vs `newGame(rngOf(20 seed),{size:4}).board` all `deepEqual`; `newGame(rng,5)→RangeError` |
| `move` default 4x4 vs explicit 4 identity — 4 dirs same board/score/trace/pendingSpawn | Unit | R-002,R-003 | 1 | QA | `game.ts:54-105` seeded `gameState(boardWith(...),{value:1,displayRoll:0})` ×4 dirs `move(state,dir,spyRng)` vs `move(state,dir,spyRng,4)` `deepEquals board/pendingSpawn/trace` and same `calls.length` (3 effective / 0 noop) |
| `boardsEqual` 4x4 defensive — size param vs no param true; cell diff false; survives jagged row missing col via `?.` | Unit | R-004 | 1 | QA | `board.ts:14-21` `boardsEqual(emptyBoard(),emptyBoard(),4)→true` + `boardsEqual(boardWith([[1]]),boardWith([[2]]),4)→false` + `boardsEqual([[1,2],[3,4]],[[1,2],[3,undefined]],4)→false` via loop `0..size-1` + `a[r]?.[c]` |
| `movementLines` 4x4 size-aware — left/right rows ×4, up/down cols ×4, dir right/down reversed | Unit | R-002,R-003 | 1 | QA | `line.ts:16-32` `movementLines(boardWith(...), 'left',4).length===4` etc.; each line `length===4`; `movementLines(b,'right',4)[0][0]` is orig `board[r][3]` not `board[r][0]` (reversed) |
| `boardFromLines` placement size-1 — 4-dir `movementLines→shift→boardFromLines` round-trip recovers expected occupancy and trace `to` uses `size-1-k` | Unit | R-003 | 1 | QA | `line.ts:77-114` round-trip with `size 4` + explicit placement `boardFromLines(linesForLeft, 'right',4)` yields `c = 3 - k` pin; trace `to` length equals non-null count |
| `spawnTile` OOB filter size-aware — `[4,0]/[0,4]/[3,3]` pool only `[3,3]` eligible when empty; full-board `[]`/occupied → nulls | Unit | R-003 | 1 | QA | `spawn.ts:84-127` `candidates [[4,0],[0,4],[3,3]]` with `3,3 empty` → pool `[[3,3]]` only; `candidates [[0,0]]` on full occupied 4x4 → `pool 0→ nulls, 0 draws, board clone!==input` |
| `isGameOver` 4x4 with size param parity — empty→false, full+no-merge→true, full+one-merge→false same with/without explicit 4 | Unit | R-005 | 1 | QA | `game.ts:133-148` 3 cases ×2 (default vs `4` explicit) `deepEqual`; `isGameOver(b,5)→RangeError` |
| `oppositeEdgeCandidates` size-1 mapping — left→`[row,3]`, right→`[row,0]`, up→`[3,col]`, down→`[0,col]` for 4 | Unit | R-003 | 1 | QA | `helpers.ts:154-170` single-source oracle pinned for 12.1; explicit `4` vs inferred `board.length` same; `oppositeEdgeCandidates(b,'left','5')→RangeError` |

**Total P0**: 10 tests, ~1.5 hours

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| BoardConfig object vs number param parity — `{size:4}` and `4` both accepted and identical across all entry points | Unit | R-001,R-008 | 1 | QA | `types:resolveGridSize(4)===4` vs `resolveGridSize({size:4})===4`; same across `emptyBoard/game/move/spawn/line` each 1 pin |
| `isGameOver` exhaustive 4x4 gate (existing `game.test.ts` gameOver 4 pins) still green with explicit 4 | Unit | R-005 | 1 | QA | `game.test.ts` gameOver suite 4 + `helpers emptyBoard(4)` 4×4 variant |
| `movementLines/boardFromLines` round-trip with helpers — `boardWith`/`emptyBoard` helpers threaded variant still round-trips | Unit | R-002 | 1 | QA | `helpers.emptyBoard(4)` + `boardWith(matrix,4)` + `movementLines(board,dir,4)` + `boardFromLines(...,dir,4)` recovers same occupancy |
| Helper `SIZE===GRID_SIZE` alias + `DEFAULT_BOARD_CONFIG` single-instance parity | Unit | R-006 | 1 | QA | `helpers.SIZE===4 && GRID_SIZE===4` + `helpers.DEFAULT_BOARD_CONFIG.size===4` + `helpers.DEFAULT_BOARD_CONFIG===DEFAULT_BOARD_CONFIG` or `.size` literal |
| `occupiedCells` legacy inference — `board.length` inference when config null vs explicit 4 validated | Unit | R-007 | 1 | QA | `occupiedCells(boardWith(...))` (no config) infers 4 vs `occupiedCells(board,4)` explicit same length; jagged `[[1]]` 4x4 still scans 0..3 |
| Re-export surface `triade/src/engine/core/index.ts` — `BoardConfig/DEFAULT_BOARD_CONFIG/validateGridSize/validateBoardConfig/resolveGridSize` | Unit | R-008 | 1 | QA | `rg -n "GRID_SIZE.*DEFAULT_BOARD_CONFIG.*validateGridSize" index.ts` + `tsc --noEmit` both configs clean |
| Ledger `resolution-undo: 0f53c41e…` 64-hex for the GRID_SIZE entry | Unit | R-009 | 1 | QA | `rg -n "0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f" deferred-work.md` 1 hit; `git diff --` shows single-DW hunk |
| Deterministic helper hygiene — `mulberry32/rngOf/spyRng` still gated, no `Math.random` introduced | Unit | R-002 | 1 | QA | `rg -n "Math\.random" triade/__tests__/engine/game.test.ts` still 0 + new seam tests use `rngOf` only |

**Total P1**: 8 tests, ~1.6 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| NaN/Infinity/float/non-number validation — `validateGridSize` rejects `Number('4')`? No string, only number path; `resolveGridSize('4' as any)→ RangeError` | Unit | R-001 | 1 | QA | `resolveGridSize('4' as any)` + `resolveGridSize(NaN)` + `resolveGridSize(Infinity)` + `resolveGridSize(4.5)` each `RangeError` |
| Helpers `staticBoard/boardWith` threading — `staticBoard([1,2,3,4],4)` first row slice + remaining rows `[3,6,12,24]` still | Unit | R-002 | 1 | QA | `helpers.staticBoard` + `boardWith(matrix,4)` each 4×4 fill `emptyBoard(4).length` |
| No prod merge logic changed — `canMerge/mergeValue/shiftLine` merge-once still `game.test.ts` green | Unit | R-002 edge | 1 | QA | `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/spawn.test.ts` triad green |
| `Board` delta is additives-only — no store schema or snapshot shape change | Unit | R-008 | 1 | QA | `rg -n "export type Board" types.ts` remains `Cell[][]`; `GameState {board,pendingSpawn}` unchanged |

**Total P2**: 4 tests, ~0.6 hours

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement   | Test Level | Test Count | Owner | Notes   |
| ------------- | ---------- | ---------- | ----- | ------- |
| Cross-cutting scan `GRID_SIZE` single definition vs duplicate `4` literal creeping into new code | Unit | 1 | QA | `rg -n "GRID_SIZE" triade/src/engine/core` 6 hits; bare `4` outside `GRID_SIZE` comment allowed but track |
| `resolveGridSize` bench 10k× `<10 ms` | Unit | 1 | QA | Exploratory bench `for i 10k resolveGridSize(4)` `<10 ms` (informative, not gate) |
| Future 5x5 enablement exploratory — note thresholds needed (`layout.ts`, `ceilingDetector`, `spawnTile` empties) | Unit | 1 | QA | Defer: when gate lifted, board loop `5`, `isGameOver` `5`, scoring same; document unknowns |

**Total P3**: 3 tests, ~0.4 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` clean (30s)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` clean (30s)
- [ ] `rg -n "0f53c41e" _bmad-output/implementation-artifacts/deferred-work.md` 1 hit (10s)
- [ ] `rg -n "validateGridSize" triade/src/engine/core/types.ts` ≥2 hits (10s)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [ ] `validateGridSize` 10-case exhaustive (unit)
- [ ] `emptyBoard` 4×4 shape parity (unit)
- [ ] `newGame` seeded identity (unit)
- [ ] `move` 4-dir identity + `boardsEqual` defensive (unit)
- [ ] `movementLines/boardFromLines` size-1 placement + `spawnTile` OOB filter + `isGameOver` parity + `oppositeEdgeCandidates` mapping (unit)

**Total**: 10 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] BoardConfig object vs number parity + legacy inference (unit)
- [ ] Helper `SIZE/DEFAULT_BOARD_CONFIG` alias + re-export surface (unit)
- [ ] `isGameOver` triad + ledger + no `Math.random` (unit)

**Total**: 8 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] NaN/float/string validation + `staticBoard/boardWith` threading + merge still green + `rg GRID_SIZE` single-def (unit)
- [ ] Bench + future-5x5 note (unit, informational)

**Total**: 7 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority  | Count             | Hours/Test | Total Hours       | Notes                   |
| --------- | ----------------- | ---------- | ----------------- | ----------------------- |
| P0        | 10        | 0.15        | ~1.2–1.8        | Validation + identity + size-1 pins |
| P1        | 8        | 0.2        | ~1.3–1.9        | Parity objects vs number + helpers mirror |
| P2        | 4        | 0.15        | ~0.5–0.8        | Edge shapes, no new logic |
| P3        | 3        | 0.15        | ~0.3–0.5        | Scans + bench exploratory |
| **Total** | **25** | **-**      | **~3.5–6.0** | **~0.5–0.75 days**  |

### Prerequisites

**Test Data:**

- `rngOf(...vals)` throwing on exhaust, `spyRng(...vals)` with `calls`, `mulberry32(seed)` deterministic (from `triade/test-utils/helpers.ts` + `triade/src/utils/mulberry32.ts`)
- `boardWith/emptyBoard/gameState` factories (4x4 default, explicit 4 variant)
- `GRID_SIZE=4` constant as single source

**Tooling:**

- `node --import tsx --test` host harness (`tsx` + `tsconfig.test.json`) for all `triade/src/engine` + `test-utils` pure TS — no Expo/Skia/RNGH harness needed
- `rg` static scans for `GRID_SIZE`, `validateGridSize`, `BoardConfig`, `0f53c41e`, `sprint-status.yaml` ownership

**Environment:**

- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` and `tsconfig.test.json` clean
- Working-tree is `ea21dce` + 8-file diff (no `sprint-status.yaml` hunk) — `git diff --stat` as above

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers (R-001, R-002, R-003 each 6)

### Coverage Targets

- **Critical paths**: ≥80% (all size-threaded entry points covered: `emptyBoard/newGame/move/isGameOver/movementLines/boardFromLines/spawnTile` plus helpers)
- **Validation gate**: 100% (every non-4 integer/float/NaN/Infinity case)
- **Business logic**: ≥70% (helpers mirror + re-export surface)
- **Edge cases**: ≥50% (`boardsEqual` jagged, `candidate` OOB, legacy `board.length` inference)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (10/10)
- [ ] No high-risk (≥6) items unmitigated (R-001, R-002, R-003)
- [ ] Validation scan `validateGridSize` non-4 → `RangeError` passes 100%
- [ ] `npm --prefix triade test` baseline still 926 pass (no 4x4 regression)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers

---

## Mitigation Plans

### R-001: Hard-gate only-4 validation (Score: 6)

**Mitigation Strategy:** Exhaustively pin `validateGridSize`/`validateBoardConfig`/`resolveGridSize` throws `RangeError` for every non-4 (`3,5,0,-1,3.5,NaN,Infinity,null.size,'4'`) and that every threaded entry point (`emptyBoard`, `newGame`, `move`, `isGameOver`, `movementLines`, `boardFromLines`, `spawnTile` with `candidates`) forwards the same throw (no silent fallback to 4). Also pin that `null/undefined` correctly resolves to `4` (existing callers).

**Owner:** FE lead
**Timeline:** Immediate (gate DW configurable)
**Status:** Planned
**Verification:** `rg -n "RangeError.*unsupported grid size"` 1 hit + `npm --prefix triade test -- grid-size-configurable` 10 P0 pass including 7-case non-4 + `newGame(5)` throws etc.

### R-002: Backward-compat 4x4 identity (Score: 6)

**Mitigation Strategy:** Run `emptyBoard`/`newGame`/`move`/`isGameOver`/`boardsEqual` with and without explicit `4`/`{size:4}` and assert `deepEqual` boards/scores/traces/pendingSpawn vs pre-sweep baseline; full suite `npm --prefix triade test` stays 926 pass with no `EXPECT RED` increase. `SIZE===GRID_SIZE` pin prevents literal drift.

**Owner:** FE lead
**Timeline:** Immediate
**Status:** Planned
**Verification:** `npm --prefix triade test` 926 pass wall-clock log + `game.test.ts` 32 still green + `rg SIZE.*GRID_SIZE` 1 hit + manual `boardWith` 4×4 snapshot gate.

### R-003: Size propagation to candidates/trace (Score: 6)

**Mitigation Strategy:** Pin `oppCol = size-1` (left→3) and `boardFromLines` `size-1-k` via `movementLines→boardFromLines` 4-dir round-trip + `oppositeEdgeCandidates` oracle; pin `spawnTile` OOB filter rejects `r>=size` with pool `[[4,0]]` and only `[[3,3]]` remains when empty; all verified at `size 4`.

**Owner:** FE lead
**Timeline:** Immediate
**Status:** Planned
**Verification:** `rg -n "oppCol.*size - 1"` 1 + `rg -n "size - 1 - k"` 2 + `spawnTile OOB` pool filter 1 host pin + `oppositeEdgeCandidates` 4-dir 1 pin.

---

## Assumptions and Dependencies

### Assumptions

1. `GRID_SIZE=4` remains the single source of truth — no other file defines a competing `4` as board dimension beyond the gate message.
2. `resolveGridSize(null|undefined)→4` is the intended default for all existing callers (100% of baseline suites omit the param).
3. Helper mirror `triade/test-utils/helpers.ts` is single-source via `from '../src/engine/core/index.ts'` re-export, not a second implementation.
4. Future non-4 enablement (3x3/5x5) is out of scope for this bundle; any future size will require a new sweep that removes the `size !== GRID_SIZE` throw and updates `layout.ts`/`ceilingDetector`/weights/persistence thresholds.

### Dependencies

1. `triade/src/utils/mulberry32.ts` deterministic `mulberry32(seed)` — Required by any replay identity pins (already in tree).
2. `triade/test-utils/helpers.ts` `rngOf/spyRng/boardWith/gameState` — Required for draw-budget + board shape pins.

### Risks to Plan

- **Risk**: A follow-on story enables `size 5` by removing the `RangeError` gate without updating `layout.ts` board-size calc (still assumes 4×4 in pixels/cell) or `ceilingDetector` tier mapping.
  - **Impact**: 5×5 board renders clipped or score ladder miscomputes tiers on 25 cells.
  - **Contingency**: Require a new `bmad-testarch-test-design` run with NFR `layout/ceiling` thresholds re-quantized and a visual simulator pass before lifting the gate.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run).
- Run `*automate` for broader coverage once implementation exists.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: Date:
- [ ] Tech Lead: Date:
- [ ] QA Lead: Date:

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact         | Regression Scope                |
| ----------------- | -------------- | ------------------------------- |
| **`triade/src/engine/core/*` (board/game/line/spawn/types/index)** | Every engine consumer (App `newGame/move/isGameOver`, helpers `emptyBoard/occupiedCells`, 926-test baseline) reads `size` via `resolveGridSize`; default `4` keeps 4x4 byte-identical, but explicit non-4 now throws instead of silently looping 4 | `npm --prefix triade test` 926 pass / 366 skipped must stay; `tsc --noEmit` both configs clean; `game.test.ts:32` + `line.test.ts` + `spawn.test.ts` + `board.test.ts` + `adaptive-spawn-integration` still green; `git diff -- sprint-status.yaml` empty |
| **`triade/test-utils/helpers.ts` (SIZE, emptyBoard, boardWith, occupiedCells, oppositeEdgeCandidates)`** | All engine/render/game tests import helpers; helper mirror must stay single-source or validation drift hides `5` gate | Helpers re-export scan `from '../src/engine/core/index.ts'` 1 hit; `helpers.resolveGridSize(5)→RangeError` same message as core; `tsc` proves shapes |
| **`_bmad-output/implementation-artifacts/deferred-work.md`** | Single ledger hunk `GRID_SIZE fixed 4x4 open→done + 0f53c41e` is book-keeping for this bundle | `rg 0f53c41e` 1 hit; any `open→done` beyond this DW would violate Not in Scope |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology (P×I 1–9, ≥6 HIGH, 9 CRITICAL block)
- `test-levels-framework.md` - Test level selection (Unit for pure `resolveGridSize/emptyBoard/move/spawnTile`; no E2E needed for this seam)
- `test-priorities-matrix.md` - P0-P3 prioritization (P0 = blocks 4x4 journey + high risk + no workaround)
- `nfr-criteria.md` - NFR thresholds & planned evidence (reliability/determinism/maintainability/perf)

### Related Documents

- PRD: n/a (sweep bundle)
- Epic: n/a (DW bundle `dw-grid-size-configurable`)
- Architecture: `triade/src/engine/core/types.ts:GRID_SIZE + BoardConfig` contract
- Tech Spec: Working-tree diff vs `ea21dce` (8 files) as above

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
