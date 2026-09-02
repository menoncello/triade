---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-02'
workflowType: 'testarch-atdd'
storyId: 'dw-engine-line-compaction'
storyKey: 'dw-engine-line-compaction'
storyFile: '_bmad-output/implementation-artifacts/spec-engine-line-compaction.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-engine-line-compaction.md'
generatedTestFiles:
  - 'triade/__tests__/engine/line-compaction.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-line-compaction.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-engine-line-compaction.md'
  - 'triade/src/engine/core/line.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/rules.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/__tests__/engine/line.test.ts'
  - 'triade/__tests__/engine/line-moved.unit.test.ts'
  - 'triade/__tests__/engine/line-compaction.regression.test.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/render/transitionPlan.test.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-engine-line-compaction — line shift compaction + 4x4 guard hardening

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) — pure engine line/board arithmetic + static guard scans; no E2E/API harness required. Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 + Skia/Reanimated) but scenario is framework-free pure TS `shiftLine`/`movementLines`/`boardFromLines` exercised via `node:test`.

---

## Story Summary

DW bundle `dw-engine-line-compaction` corrects a single-pass compaction defect in the pure engine line mover (`shiftLine` in `triade/src/engine/core/line.ts`) that left multi-gap lines partially compacted (`[null,null,null,2]` → `[null,null,2,null]` instead of wall `[2,null,null,null]` via `dest=i-1` without scan), and hardens the three helpers against short/empty inputs (`shiftLine([])`, `movementLines([[1]] as Board)`, `boardFromLines([line])`) that previously threw `TypeError/Cannot read properties of undefined`. The sweep keeps `GRID_SIZE=4` (no GRID_SIZE change), preserves merge-once cascade and gap-non-merge semantics, and updates wall expectations in `game.test.ts` (`[_,3,_,3] left → [3,3,_,_]` fully compact, `down [3,_,_,3] → [_,_,3,3]`) and `transitionPlan.test.ts` (`to [0,0]/[0,3]/[3,1]` wall). Before the sweep the board was always rectangular 4×4 so the defect had limited production blast radius, but the wall invariant is load-bearing for correctness: `transitionPlan` slide coordinates and directional-spawn candidate count (`oppCol/OppRow` per `moved` line) depend on wall-compacted `from`/`moved` fidelity.

**As a** player swiping any direction on the 4×4 board
**I want** every non-merging tile to slide to the wall in a single swipe and every helper to tolerate ragged/short inputs without crashing
**So that** no mid-board gaps survive a swipe, trace/`moved` remains wall-faithful for rendering and spawn, and a future ragged-line consumer degrades to padded nulls rather than throwing.

---

## Acceptance Criteria

1. **AC multi-gap wall compaction (DW-74)** — Given `[null,null,null,2]` (or `[null,2,null,4]` / `[null,null,3,null]` / all-null) when `shiftLine` is called, then every occupied tile slides to the wall-most empty in a single pass: `[null,null,null,2] → [2,null,null,null] from [[0,3]] moved true`, `[null,2,null,4] → [2,4,null,null]`, `[null,null,3,null] → [3,null,null,null]`, all-null stays `moved false` (`score 0` when no merge).
2. **AC gap-non-merge preserved** — Given `[3,null,3,null]` when `shiftLine`, then result is `[3,3,null,null] score 0` (no merge across a gap that was compacted; shift uses wall `target`, merge uses immediate `dest=i-1` only).
3. **AC cascade block preserved** — Given `[3,3,3,3]` when `shiftLine`, then result stays `[6,3,3,null] score 6` (merge-once sequential; not `6,6` two-pass).
4. **AC short/empty guard (DW-20)** — Given `shiftLine([])` (empty) or `shiftLine([{v:1}])` (1-elem) or `shiftLine([null,3].slice(0,2))` (2-elem gap) or `boardFromLines([line], left)` (short lines) or `movementLines([[1]] as Board, left)` (short board) when called, then no throw, length preserved (`[]→0`, `1→1`), ragged boards pad to `null` via `board[r]?.[c] ?? null`, and `moved` reflects wall comparison.
5. **AC pipeline wall invariant (game/transition)** — Given the 4-direction pipeline (`movementLines → shiftLine → boardFromLines`) for `left/right/up/down` when a tile starts 2 gaps off wall, then the pre-spawn board places it at the wall (`game.test.ts` `ONE_CELL [_,3,_,3] left → [3,3,_,_]` fully compact, `down [3,_,_,3] → [_,_,3,3]`, `transitionPlan` left `to [0,0]` from `[0,2]`, right `to [0,3]`, down `to [3,1]`), and `trace.from` records the original `[[r,c]]` wall attribution (not intermediate `[[r,c-1]]`).
6. **AC single-wall-scan / single-guard / single-GRID_SIZE invariants** — Given `line.ts` source when `rg`-scanned, then exactly 1 wall-scan `while(target>0 && out[target-1].v===null)`, exactly 1 `canMerge(out[dest].v` (not `target`) + 1 `out[target].v=t.v` vs 1 `out[dest].v=merged`, `shiftLine` body contains `const n=line.length` + `for i<n` + `dest` bounds and 0 `GRID_SIZE` refs, `movementLines` pads via `board[r]?.[c] ?? null` ×2 (row+col), `boardFromLines` guards with `lines.length/row.length` and `if(!row)/if(!item) continue`, and `GRID_SIZE=4` remains single definition in `types.ts:1`.

---

## Story Integration Metadata

- **Story ID:** `dw-engine-line-compaction` (bundle; spec `baseline_revision: 505c8eac145fccd9b18fc97b8fd4a51826e24847`, final working-tree `7eacd93` → `4f6cc04dd3b59bcb025fc463a21619d195ae09a6` per spec `final_revision`)
- **Story Key:** `dw-engine-line-compaction`
- **Story File:** `_bmad-output/implementation-artifacts/spec-engine-line-compaction.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-engine-line-compaction.md`
- **Generated Test Files:**
  - `triade/__tests__/engine/line-compaction.atdd.test.ts` (NEW — 20 RED-phase scaffolds, `it.skip`, host `node:test` + `tsx`; 8 P0 + 6 P1 + 4 P2 + 2 P3)
  - Existing hardened suites (reference, already green after sweep): `triade/__tests__/engine/line.test.ts` (18 pass), `triade/__tests__/engine/line-moved.unit.test.ts` (passed), `triade/__tests__/engine/line-compaction.regression.test.ts` (11 new DW-74/DW-20 pins, all green), `triade/__tests__/engine/game.test.ts` (32 pass — 3 wall expectations patched), `triade/__tests__/render/transitionPlan.test.ts` (16 pass — 3 wall `to` coords patched)
- **Working-tree delta covered (vs baseline `505c8ea`):**
  - `triade/src/engine/core/line.ts:16-110` — `movementLines` both row/col paths now `board[r]?.[c] ?? null` (was `board[r][c]`) for ragged-board padding; `shiftLine` gains `const n=line.length` + `for(i<n)` (was `GRID_SIZE`) + `dest` bounds guard `if(dest<0||dest>=n) continue` + **wall-scan** `let target=dest; while(target>0 && out[target-1].v===null) target--` before placing tile at `target` (merge branch keeps `dest=i-1` only `canMerge(out[dest].v, t.v)` → `out[dest].v=merged`); `boardFromLines` now `for i<lines.length / if(!row)continue` + `for k<row.length / if(!item)continue` (was `GRID_SIZE` fixed loops + `lines[i][k]` direct). `src/engine` byte-identical otherwise (`GRID_SIZE=4` unchanged, `rules.ts:canMerge/mergeValue` unchanged, `game.ts` unchanged as pipeline consumer).
  - `triade/__tests__/engine/line-compaction.regression.test.ts` (new 82 LOC, 11 cases) — DW-74 multi-gap pins (`[null,null,null,2]→[2,…] from [[0,3]]`, `[null,2,null,4]→[2,4,…]`, `[null,null,3,null]→[3,…]`, empty stay) + DW-20 short-input guards (1-elem, 0-elem, 2-elem gap, `boardFromLines` short, `movementLines` short board) + preserve `gap-non-merge [3,null,3,null]→[3,3,null,null] score 0` and `cascade [3,3,3,3]→[6,3,3,null] score 6`.
  - `triade/__tests__/engine/game.test.ts` — `ONE_CELL [_,3,_,3] left` expectation ` [3,null,3,1]` → `[3,3,null,1]` (fully compact) and `move down [3,_,_,3]→[_,_,3,3]` wall expectation (was `[_,3,_,3]` one-cell semantics).
  - `triade/__tests__/render/transitionPlan.test.ts` — slide left `to [0,1]→[0,0]`, slide right `to [0,2]→[0,3]`, slide down `to [1,1]→[3,1]` (wall-compacted coordinates).
  - Ledger `deferred-work.md` — DW-20 (`shiftLine/move/boardFromLines assume 4x4 and crash on shorter input`) and DW-74 (`Compactação single-pass falha para linhas com múltiplos gaps`) flipped `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-line-compaction` + `resolution-undo: 26a75af… 73746… 64-hex`.
  - `sprint-status.yaml` NOT written (orchestrator-owned per prompt — verified via `git diff --stat` having no `sprint-status.yaml`).

---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`)
- **No Playwright/Cypress harness needed:** scenario is pure `shiftLine`/`movementLines`/`boardFromLines` arithmetic + static `rg` allowlists; correct level is **Unit host** + integration via engine fixtures and pipeline suites. E2E/API scaffolds intentionally absent (per `test-design-dw-engine-line-compaction.md` risk `R-001..R-003` mitigations and pipeline 4-dir gates). `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN Skia Canvas project, not a web Playwright flow).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`

---

## Red-Phase Test Scaffolds Created

### Unit Tests (20 tests, host `node:test`)

**File:** `triade/__tests__/engine/line-compaction.atdd.test.ts` (300 lines, 4 suites)

All 20 are `it.skip` — RED-phase scaffolds. When activated (`it.skip` → `it`) they assert the **expected** post-sweep wall-compaction + guard behaviour; before `7eacd93` they would fail (`[null,null,null,2]→[null,null,2,null]` one-cell, `shiftLine([])` throw, `movementLines([[1]]) TypeError`); with the working-tree delta they **PASS** (see Execution Evidence). This is the correct TDD inversion: tests document the contract; implementation already in working tree makes them green.

#### P0 Critical — Spec AC (8 tests)

- ✅ **Test:** `[P0-01] DW-74 wall-most multi-gap: [null,null,null,2] -> [2,null,null,null] from [[0,3]] moved true`
  - **Status:** RED (skip) — would fail before fix (`[null,null,2,null]` one-cell, `moved` false on intermediate/ `from` at `[0,2]`); after wall-scan `target` wall `0` with `from [[0,3]]` and `moved true`
  - **Verifies:** `line.ts:57-64` wall-scan `while(target>0 && out[target-1].v===null)` proves multi-gap single-pass (R-001).
- ✅ **Test:** `[P0-02] DW-74 double gap two tiles: [null,2,null,4] -> [2,4,null,null] sequential scan`
  - **Status:** RED — before: `[null,2,null,4] → [2,null,4,null]` partial (second tile stuck at `1` not wall `1`? Actually `4` at `2`); after: `2→0` then `4→1` sequential scan after prior vacate
  - **Verifies:** scan restarts per tile (R-001) + `from [[0,1]] at 0` / `[[0,3]] at 1` fidelity.
- ✅ **Test:** `[P0-03] DW-74 3-gap single tile: [null,null,3,null] -> [3,null,null,null]`
  - **Status:** RED — before: would stop at `k=1`; after: wall `0`
  - **Verifies:** 3-gap single-tile wall case (R-001 boundary).
- ✅ **Test:** `[P0-04] DW-74 all-null stays empty moved false without throw`
  - **Status:** RED — before: already empty but now pinned as no-op wall case
  - **Verifies:** `moved false` + `score 0` wall no-op (R-001).
- ✅ **Test:** `[P0-05] preserve gap-non-merge: [3,null,3,null] -> [3,3,null,null] score 0 (wall vs immediate)`
  - **Status:** RED — would fail if merge reused wall `target` (`3+3→6 score 6` across gap); after: shift to wall `1` (not `0`) keeps `score 0`
  - **Verifies:** shift uses `target` wall, merge uses immediate `dest` only (R-002) — `canMerge(out[dest].v` not `out[target]`).
- ✅ **Test:** `[P0-06] preserve cascade block: [3,3,3,3] -> [6,3,3,null] score 6 (merge-once sequential)`
  - **Status:** RED — before: already `6,3,3,null` but now pinned as merge-once invariant; a two-pass compact-then-merge refactor would yield `6,6,null,null` score 12
  - **Verifies:** single-pass `i=0..n-1` sequential order (R-004).
- ✅ **Test:** `[P0-07] DW-20 guard empty line: shiftLine([]) length 0 moved false no throw`
  - **Status:** RED — before: `for(i<GRID_SIZE=4)` OOB `line[i] undefined` throw; after: `const n=line.length` + `i<n` → length 0, no throw
  - **Verifies:** `line.ts:39-43` length guard (R-003).
- ✅ **Test:** `[P0-08] DW-20 guard single element: shiftLine([{v:1}]) length 1 moved false no throw`
  - **Status:** RED — before: `i=1..3` OOB dest checks; after: `n=1` single iteration skipped
  - **Verifies:** 1-elem ragged guard (R-003).

#### P1 Wiring — board/4-dir/pipeline/wall trace (6 tests)

- ✅ **Test:** `[P1-01] DW-20 guard 2-elem gap: refLine(null,3).slice(0,2) -> [3,null] without crash`
  - **Status:** RED — before: `n=2` vs `GRID_SIZE=4` mismatch would OOB on dest 0 wall scan; after: `n=2` line compaction to wall
  - **Verifies:** 2-elem sliced line still wall-compacts (R-003).
- ✅ **Test:** `[P1-02] DW-20 guard boardFromLines short: boardFromLines([line], left) maps without crash`
  - **Status:** RED — before: `for(i<GRID_SIZE)` read `lines[1] undefined` throw; after: `lines.length` + `if(!row)continue` maps only available cells
  - **Verifies:** short-lines padding via `emptyBoard()` + `trace` length correct (R-003).
- ✅ **Test:** `[P1-03] DW-20 guard movementLines short board: movementLines([[1]] as Board, left) pads to 4x4`
  - **Status:** RED — before: `board[r][c]` on `[[1]]` threw `TypeError: Cannot read properties of undefined`; after: `board[r]?.[c] ?? null` pads `null` via Optional chaining
  - **Verifies:** ragged board degrades to padded 4×4 (R-003), `lines.length===GRID_SIZE && lines[0][1].v===null`.
- ✅ **Test:** `[P1-04] PIPELINE 4-dir left/right/up/down full board matches pre-spawn wall compaction`
  - **Status:** RED — before: `movementLines` right/down reversed + `boardFromLines` `GRID_SIZE-1-k` un-reverse would still produce one-cell board if wall-scan missing; after: `left [1,2,_,_]→[3]` wall `right [_,_,2,1]→[_,_,_,3]` + `up [2,1,3,6]→[3,3,6,null]` / `down →[null,3,3,6]`
  - **Verifies:** direction-agnostic wall-scan + reversal contract (R-005) — covers `game.move` consumer pipeline.
- ✅ **Test:** `[P1-05] game.move wall expectations: ONE_CELL [_,3,_,3] left fully compact + down wall mirrors left`
  - **Status:** RED — before: `ONE_CELL [_,3,_,3] left` expected `[3,null,3,null]` one-cell / `down [3,_,_,3] → [_,3,_,3]`; after: `[3,3,_,_]` fully compact + `down [_,_,3,3]` wall (patched `game.test.ts`)
  - **Verifies:** working-tree `game.test.ts` wall corrections (R-007) — without fix the board retains a mid-gap visible to player.
- ✅ **Test:** `[P1-06] transitionPlan wall slide: left to [0,0], right to [0,3], down to [3,1] (wall-compacted coordinates)`
  - **Status:** RED — before: slide left `[null,null,2,null] (from [0,2]) → to [0,1]` one-cell / `right [null,2,null,null] → to [0,2]` / `down → to [1,1]`; after: `to [0,0] / [0,3] / [3,1]` wall (patched `transitionPlan.test.ts`)
  - **Verifies:** wall trace `from [[r,c]]` fidelity + `to` wall attribution (R-006) — `boardFromLines` direction-split `GRID_SIZE-1-k` + `trace` unchanged.

#### P2 Static scans — allowlist gates (4 tests)

- ✅ **Test:** `[P2-01] SCAN single wall-scan site: while(target > 0 && out[target-1].v===null) ==1 in line.ts`
  - **Status:** RED — before: 0 hits (no scan); after: exactly 1 `while(target>0 …)` site; merge branch must keep `dest=i-1` only
  - **Verifies:** single wall-scan invariant (R-001) — duplicate scan or missing scan is a fail.
- ✅ **Test:** `[P2-02] SCAN shiftLine length guard: const n=line.length + for i<n + dest bounds, not GRID_SIZE`
  - **Status:** RED — before: `for(i<GRID_SIZE)` + no `n`; after: `const n=line.length`, `for(i<n)`, `if(dest<0||dest>=n) continue`, shift body has 0 `GRID_SIZE` refs
  - **Verifies:** length-driven vs GRID_SIZE-fixed loop (R-003) — `movementLines` retains 2 `GRID_SIZE` header loops (row+col) but `shiftLine` must not.
- ✅ **Test:** `[P2-03] SCAN shift vs merge site separation: shift out[target].v=t.v and merge canMerge(out[dest].v`
  - **Status:** RED — before: no `out[target]` site; after: `out[target].v=t.v ==1`, `canMerge(out[dest].v …)==1` (not `out[target]`), `out[dest].v=merged ==1`
  - **Verifies:** gap-non-merge contract via source-level allowlist (R-002).
- ✅ **Test:** `[P2-04] SCAN boardFromLines guards + movementLines optional chaining pads ragged boards`
  - **Status:** RED — before: `for(i<GRID_SIZE)` / `lines[i][k]` direct; after: `lines.length / row.length` + `if(!row)continue / if(!item)continue` and `board[r]?.[c] ?? null ×2` (row+col)
  - **Verifies:** short-board/short-lines defensive guards (R-003) + `GRID_SIZE=4` single definition in `types.ts:1`.

#### P3 Exploratory / residual / hygiene (2 tests)

- ✅ **Test:** `[P3-01] exploratory — boardFromLines ragged row length beyond [[1]] still maps without crash`
  - **Status:** RED — would fail if `row.length` guard missing on `[[1,2],[3]]` ragged 2-row mapping; after: `row.length` loop maps each row independently
  - **Verifies:** ragged-board exploratory beyond the single `[[1]]` pin (R-003 residual).
- ✅ **Test:** `[P3-02] hygiene — line scope stays pure, no spawn/feel/monetization leakage, wall scan O(1) <1ms`
  - **Status:** RED — before: no bench lane; after: `line.ts` has no `mulberry32/RevenueCat/AdMob/music` and `10k shiftLine(null,3,null,3) <50ms` O(1) wall scan
  - **Verifies:** sweep stayed in scope (test-design Not in Scope) + perf `O(n) n=4` ≤6 ops total (R-009).

---

## Data Factories Created

Not applicable to this pure engine line scenario (per `test-design-dw-engine-line-compaction.md`):
- **No data factories / `@faker-js/faker`** — fixtures are deterministic `refLine(...vs)` 4-literal factory + `CellRef {v,r,c}` + short/empty variants `[]`/`[{v:1}]`/`[null,3].slice(0,2)` + `GRID_SIZE=4` + `emptyBoard`/`staticBoard`/`boardWith`/`rngOf(0,0,0.5)` (already in `triade/test-utils/helpers.ts`). No new factory file — reuse existing `line.test.ts` / `helpers.ts` seams.
- **No new fixture file** — `movementLines`/`shiftLine`/`boardFromLines` are pure and take `Board`/`CellRef[]` directly; `DEFAULT` board fixtures `emptyBoard()`/`staticBoard([…])` suffice.

---

## Fixtures Created

Not applicable — pure TS engine, no Playwright fixtures / browser automation:
- **No Playwright fixture / `test.extend`** — the line seam uses host `node:test` + `tsx` with pure `shiftLine`/`boardFromLines`/`movementLines` calls; browser `test.extend` is not needed (RN Skia project, no `page.goto`).
- **No external service mocking** — no I/O in `shiftLine`/`movementLines`/`boardFromLines` or the `isLandscape` delegation; `game.move` spawn-tier/RNG seam is exercised via existing `rngOf` fixtures in `game.test.ts`.

---

## Mock Requirements

None. No UI surface change that mocks `useWindowDimensions`/`useSafeAreaInsets` — line helpers are pure arithmetic with no provider hook. The only consumers are `game.move` (spawn `rngOf` seam) and `transitionPlan:classify` (Skia animation seam) — both already have deterministic fixtures in `game.test.ts` / `transitionPlan.test.ts` and stay green via `<15 min` host gate; no mock endpoint needed.

---

## Required data-testid Attributes

None — `shiftLine`/`movementLines`/`boardFromLines` are pure functions (`CellRef[]`→`ShiftedCell[]`→`Board`/`TraceEntry[]`). No component is mounted in these host unit tests; `GameBoard.tsx` Skia tile `data-testid` wiring is verified via existing `transitionPlan.test.ts` no-leak/ assertNoLeak 200-move sweep and `engine.purity` / `ui.norolls` scanner gates, not re-derived here.

---

## Implementation Checklist

Maps directly to the working-tree diff already in place (`505c8ea` → `7eacd93` → working-tree ledger `26a75af`). Each scaffold's GREEN task is the code change that makes it pass — for this completed sweep the tasks are **already done** (working tree implements them; activated ATDD now GREEN). Keep checklist as the red→green roadmap for any re-hardening.

### Test: [P0-01..04] DW-74 wall-most multi-gap compaction (4 variants)

**File:** `triade/src/engine/core/line.ts:57-64` (wall-scan)

**Tasks to make these tests pass (DONE in working tree):**
- [x] In `shiftLine`, capture `const n = line.length` (not `GRID_SIZE`) before loop
- [x] Replace `out[dest].v = t.v` (one-cell) with wall-scan:
      `let target = dest; while (target > 0 && out[target - 1].v === null) target--; out[target].v = t.v; out[target].from = [[t.r,t.c]]; out[i].v = null; out[i].from = [];`
- [x] Keep `moved = out.some((cell,i)=>cell.v !== line[i].v)` unchanged (wall comparison is now wall-faithful)
- [x] Run test: `npm --prefix triade test -- __tests__/engine/line-compaction.atdd.test.ts` → `it.skip` → `it` → 20 pass (P0-01..04 green)
- [x] ✅ Tests pass (green phase — wall `[2,null,null,null]` + `[2,4,…]` + `[3,…]` + empty `moved false`)

**Estimated Effort:** 0.4h

---

### Test: [P0-05] gap-non-merge preserved

**File:** `triade/src/engine/core/line.ts:65-72` (merge branch)

**Tasks:**
- [x] Keep merge branch as `else if (canMerge(out[dest].v, t.v)) { const merged=mergeValue(...); out[dest].v=merged; out[dest].from=[out[dest].from[0],[t.r,t.c]]; score+=merged; out[i].v=null; }` — **not** `canMerge(out[target].v` (would merge across gap)
- [x] Pin gap-non-merge `[3,null,3,null] → [3,3,null,null] score 0` alongside wall-scan
- [x] Verify `rg -n "canMerge\(out\[dest\]" triade/src/engine/core/line.ts` ==1 (not `target`)
- [x] ✅ Test passes

**Estimated Effort:** 0.2h

---

### Test: [P0-06] cascade block preserved

**File:** `triade/src/engine/core/line.ts:46-55` (single-pass sequential order)

**Tasks:**
- [x] Keep single-pass `for(let i=0;i<n;i++)` sequential order (no second compact-then-merge pass)
- [x] Verify `[3,3,3,3] → [6,3,3,null] score 6` (not `6,6,..,12`) and `[3,3,6,6] → [6,6,6,null] score 6` stays green
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P0-07..08][P1-01..03] short/empty guards

**File:** `triade/src/engine/core/line.ts:16-35` (`movementLines` pads) + `39-43` (`shiftLine` length) + `88-102` (`boardFromLines` guards)

**Tasks:**
- [x] `movementLines` row path `for(c<GRID_SIZE) row.push({v: board[r]?.[c] ?? null, r,c})` (was `board[r][c]`) — both row+col paths ×2
- [x] `shiftLine` header `const n=line.length` + `for(i<n)` + `if(dest<0||dest>=n) continue` (was `for(i<GRID_SIZE)`)
- [x] `boardFromLines` header `for(i<lines.length){const row=lines[i]; if(!row)continue; for(k<row.length){const item=row[k]; if(!item)continue; ...}}` (was `for i<GRID_SIZE / lines[i][k]` direct)
- [x] Verify `movementLines([[1]] as Board,'left')` pads to 4×4, `shiftLine([])` length 0, `shiftLine([{v:1}])` length 1, `boardFromLines([line],'left')` maps `board[0][0]==2` without throw
- [x] ✅ All 5 tests pass

**Estimated Effort:** 0.6h

---

### Tests: [P1-04..06] pipeline wall invariant (4-dir + game.move + transitionPlan wall)

**File:** `triade/src/engine/core/line.ts:23/29` (`GRID_SIZE-1-k` right/down) + `triade/__tests__/engine/game.test.ts` + `triade/__tests__/render/transitionPlan.test.ts`

**Tasks:**
- [x] Keep `movementLines` right `row.reverse()` + `boardFromLines` right `c=GRID_SIZE-1-k` / down `r=GRID_SIZE-1-k` unchanged (wall-compaction is direction-agnostic, wall is index 0 in reversed line)
- [x] `triade/__tests__/engine/game.test.ts` wall corrections: `ONE_CELL [_,3,_,3] left → [3,3,_,_]` (was `[3,null,3,1]` one-cell) and `move down [3,_,_,3] → [_,_,3,3]` wall (was `[_,3,_,3]`)
- [x] `triade/__tests__/render/transitionPlan.test.ts` wall corrections: slide left `to [0,1]→[0,0]`, slide right `to [0,2]→[0,3]`, slide down `to [1,1]→[3,1]` (wall-compacted `trace.to`)
- [x] Verify `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/render/transitionPlan.test.ts __tests__/engine/line.test.ts` 32+16+18 pass
- [x] ✅ Tests pass

**Estimated Effort:** 0.5h

---

### Tests: [P2-01..04] single-wall-scan / single-n / GRID_SIZE / optional chaining allowlists

**File:** `triade/src/engine/core/line.ts` + `triade/src/engine/core/types.ts:1` grep allowlists

**Tasks:**
- [x] `rg -n "while \(target > 0" triade/src/engine/core/line.ts` ==1
- [x] `rg -n "const n = line\.length" triade/src/engine/core/line.ts` ==1 and `rg -n "for \(let i = 0; i < n" triade/src/engine/core/line.ts` ==1 and shift body `GRID_SIZE` 0
- [x] `rg -n "out\[target\]\.v = t\.v" triade/src/engine/core/line.ts` ==1 vs `rg -n "out\[dest\]\.v = merged" triade/src/engine/core/line.ts` ==1 vs `rg -n "canMerge\(out\[dest\]" triade/src/engine/core/line.ts` ==1
- [x] `rg -n "board\[r\]\?\.\[c\] \?\? null" triade/src/engine/core/line.ts` ==2 and `rg -n "GRID_SIZE =" triade/src/engine/core/types.ts` ==1 (single `4`)
- [x] ✅ All scans pass

**Estimated Effort:** 0.3h

---

### Tests: [P3-01..02] ragged exploratory + hygiene bench

**File:** `triade/src/engine/core/line.ts` residual + hygiene

**Tasks:**
- [x] Document `boardFromLines` ragged `[[1,2],[3]]` residual: `row.length` loop maps each row independently beyond the single `[[1]]` pin (no throw, padded `null`)
- [x] Keep `line.ts` pure (no `mulberry32/RevenueCat/AdMob/music/preview/haptics/feel` imports) — `git diff --stat -- triade/src/engine` shows `line.ts` only, not `src/feel`/`src/render`/`src/ui`
- [x] `10k shiftLine(null,3,null,3) <50ms` O(1) wall scan bench (n=4, ≤3 steps per tile, 48 ops per `move()` — `<0.01ms`)
- [x] ✅ Bench passes

**Estimated Effort:** 0.2h

---

### Test: ledger DW-20/DW-74 done + sprint-status untouched

**File:** `_bmad-output/implementation-artifacts/deferred-work.md` + `sprint-status.yaml`

**Tasks:**
- [x] Flip DW-20 (`shiftLine/move/boardFromLines assume 4x4 and crash on shorter input`) + DW-74 (`Compactação single-pass falha…`) `open` → `done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-line-compaction` + `resolution-undo: 26a75af183b8ffbe96535a58ff2c6ec6f12a3a000117765a9f94e84b21702c64 2026-09-02 7374617475733a206f70656e` 64-hex each
- [x] Never write `sprint-status.yaml` (orchestrator-owned — verify `git diff --stat` has no `sprint-status.yaml` and ledger shows only `deferred-work.md` diff)
- [x] ✅ Test passes (`rg -n "status: done 2026-09-02" deferred-work.md` shows 2 hits DW-20/74 each with 64-hex `resolution-undo`)

**Estimated Effort:** 0.1h

---

## Running Tests

```bash
# Run all activated tests for this story (dormant by default — RED scaffolds)
# 1) Activate one scaffold at a time for the current task, then confirm RED→GREEN:
#    edit triade/__tests__/engine/line-compaction.atdd.test.ts: change it.skip → it for that test

# Run the single ATDD file (skipped = 20, dormant)
npm --prefix triade test -- __tests__/engine/line-compaction.atdd.test.ts

# Run the single ATDD file activated (with working-tree delta — expect 20 pass)
# (temporarily: use python3 to replace it.skip → it, as verified in evidence)
python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/engine/line-compaction.atdd.test.ts'); t=p.read_text(); pathlib.Path('/tmp/active.test.ts').write_text(t.replace('it.skip','it'))" && cp /tmp/active.test.ts triade/__tests__/engine/line-compaction.atdd.active.test.ts && npm --prefix triade test -- __tests__/engine/line-compaction.atdd.active.test.ts && rm triade/__tests__/engine/line-compaction.atdd.active.test.ts
# → with it.skip→it: 20 pass / 0 fail (delta already GREEN at 7eacd93)

# Run the existing regression suite (must stay 11+18+? pass)
npm --prefix triade test -- __tests__/engine/line.test.ts __tests__/engine/line-moved.unit.test.ts __tests__/engine/line-compaction.regression.test.ts
# → 43 pass (18+?+11) + game/transition wall expectations green

# Run the pipeline suites that prove wall invariant for game.move / transitionPlan
npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/render/transitionPlan.test.ts
# → 32+16 pass (3 wall expectations patched)

# Full host gate (<15 min)
npm --prefix triade test

# Typecheck both TsConfigs
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 20 tests written as red-phase scaffolds with `it.skip` (TDD red phase — `node:test` skip is the `test.skip()` analogue)
- ✅ No fixtures/factories needed beyond existing `helpers.ts` harnesses (`refLine`/`staticBoard`/`emptyBoard`/`GRID_SIZE`/`rngOf` already cover line seam)
- ✅ Mock requirements documented (none)
- ✅ data-testid requirements listed (none — pure `shiftLine`/`movementLines`/`boardFromLines`)
- ✅ Implementation checklist created (8 P0 + 6 P1 + 4 P2 + 2 P3 tasks)

**Verification:**

- All 20 generated tests are present and marked with `it.skip` (see `npm --prefix triade test -- __tests__/engine/line-compaction.atdd.test.ts` output: `tests 20 / skipped 20`)
- Activation guidance is clear (one `it.skip → it` at a time per task)
- Activated tests fail due to missing implementation before `7eacd93` — now PASS because working-tree delta implements them (evidence: de-skipped run 20 pass / 0 fail)
- This is INTENTIONAL (TDD red phase); implementation already covers the working-tree delta (`git diff 505c8ea..7eacd93 -- triade/src/engine/core/line.ts` shows only wall-scan + length guards)

---

### GREEN Phase (DEV Team — Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with highest priority P0-01 `[null,null,null,2]→[2,…]`)
2. **Remove `it.skip` → `it`** for that test and confirm it fails first (before `7eacd93` it would be `[null,null,2,null]` one-cell / `TypeError` on `[[1]]`)
3. **Read the test** to understand expected behaviour (wall-most empty run vs gap-non-merge immediate neighbor)
4. **Implement minimal code** to make that specific test pass (see Checklist task for file:line — typically `line.ts:57-64` wall-scan + `39` length guard)
5. **Run the test** `npm --prefix triade test -- __tests__/engine/line-compaction.atdd.test.ts` to verify green
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat

**For this completed sweep:** every GREEN task is already DONE in the working tree (see `git diff 505c8ea..7eacd93 -- triade/src/engine/core/line.ts` + regression file + `game.test.ts`/`transitionPlan.test.ts` wall patches); activating all 20 at once now yields `20 pass`. Keep the one-at-a-time rule for any future re-hardening.

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer — wall-scan is exactly 3 lines `let target=dest; while…; out[target]…`)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap

**Progress Tracking:**

- Check off tasks as you complete them
- Share progress in daily standup

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete — 20/20 activated)
2. **Review code for quality** (readability — `const n=line.length` + wall-scan `target` naming vs `GRID_SIZE`, `Optional chaining` guards, single `GRID_SIZE=4`)
3. **Extract duplications** (already done — no duplicate `while(target…)` or duplicate `canMerge` predicate)
4. **Optimize performance** (already O(1) per line `n=4` ≤3 wall steps, 48 null checks per `move()` — `<0.01ms`)
5. **Ensure tests still pass** after each refactor (`npm --prefix triade test` stays 43 pass on line suites + 32 pass `game.test.ts`)
6. **Update documentation** (if contract changes — `spec-engine-line-compaction.md` Design Notes already cover wall `target` vs `dest` split)

**Key Principles:**

- Tests provide safety net (refactor with confidence — gap-non-merge scan catches collapsed merge predicate)
- Make small refactors (easier to debug if tests fail — `rg` allowlists pinpoint wall-scan vs GRID_SIZE regression)
- Run tests after each change
- Don't change test behaviour (only implementation)

**Completion:**

- All tests pass (20/20 activated, plus existing suites 43/43 line + 32/32 `game.test.ts` + 16/16 `transitionPlan`)
- Code quality meets team standards (single wall-scan, single `GRID_SIZE=4`, length-driven guards, never-throw)
- No duplications or code smells (no duplicate `while(target` or duplicate `board[r][c]` direct)
- Ready for code review and story approval

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-engine-line-compaction.md`)
2. **If the story file cannot be updated automatically**, share this checklist and `triade/__tests__/engine/line-compaction.atdd.test.ts` with the dev workflow as a manual handoff
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001..R-003 mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this sweep, implementation already in working tree (de-skipped run proves GREEN)
5. **Activate one scaffold at a time** by removing `it.skip` for the current task, then confirm it fails before implementing (before `7eacd93`, P0-01 would be `[null,null,2,null]` / P0-07 would throw)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single wall-scan already done)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-02`) — do not touch `sprint-status.yaml`

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (via `test-design-dw-engine-line-compaction.md` + `tea-index.csv`):

- **fixture-architecture.md** — Not needed for pure `node:test` line host — reuse `line.test.ts` `refLine`/`nullLine`/`fullGrid` + `helpers.ts` `emptyBoard`/`staticBoard` harnesses, no `test.extend`
- **data-factories.md** — Not needed — deterministic `refLine(...vs)` + `CellRef {v,r,c}` fixtures suffice (no `@faker-js/faker` — board math is integer-valued)
- **component-tdd.md** — Host unit TDD contract (red-phase `it.skip` scaffolds, one behavioural pin per suite, wall `from [[r,c]]` fidelity)
- **network-first.md** — Not applicable (no network — pure `shiftLine` arithmetic)
- **test-quality.md** — Given-When-Then per test, one pin per `it`, determinism via `refLine` literals, isolation via `emptyBoard` per test, `moved` boolean `out.some(v!==line[i].v)` observable
- **test-levels-framework.md** — Level selection: Unit (line) vs Integration (pipeline `game.move`/`transitionPlan` via `movementLines`→`boardFromLines`) vs Static scans (grep allowlists `GRID_SIZE`/`while(target`/`canMerge`)
- **test-healing-patterns.md** — Wall-scan `target` naming is the healing hook (CI `canMerge(out[dest]` vs `out[target]` scan pinpoints gap-non-merge collapse)
- **selector-resilience.md / timing-debugging.md** — Not applied (no DOM selectors / no `waitFor` — line seam is sync arithmetic)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN Skia project)

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-engine-line-compaction.md` Section "Risk Assessment" for the 10 risks (3 high) and NFR planning that informed P0/P1/P2/P3 levels.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification (dormant, expected skip)

**Command:** `npm --prefix triade test -- __tests__/engine/line-compaction.atdd.test.ts`

**Results:**
```
▶ ATDD dw-engine-line-compaction — P0 critical (spec AC + DW-74/DW-20)
  ﹣ [P0-01] DW-74 wall-most multi-gap: [null,null,null,2] -> [2,null,null,null] from [[0,3]] moved true (0.49ms) # SKIP
  ﹣ [P0-02] DW-74 double gap two tiles: [null,2,null,4] -> [2,4,null,null] sequential scan (0.04ms) # SKIP
  ﹣ [P0-03] DW-74 3-gap single tile: [null,null,3,null] -> [3,null,null,null] (0.04ms) # SKIP
  ﹣ [P0-04] DW-74 all-null stays empty moved false without throw (0.03ms) # SKIP
  ﹣ [P0-05] preserve gap-non-merge: [3,null,3,null] -> [3,3,null,null] score 0 (wall vs immediate) (0.03ms) # SKIP
  ﹣ [P0-06] preserve cascade block: [3,3,3,3] -> [6,3,3,null] score 6 (merge-once sequential) (0.03ms) # SKIP
  ﹣ [P0-07] DW-20 guard empty line: shiftLine([]) length 0 moved false no throw (0.03ms) # SKIP
  ﹣ [P0-08] DW-20 guard single element: shiftLine([{v:1}]) length 1 moved false no throw (0.03ms) # SKIP
✔ ATDD dw-engine-line-compaction — P0 critical (spec AC + DW-74/DW-20) (1.52ms)
▶ ATDD dw-engine-line-compaction — P1 wiring (board/4-dir/pipeline/wall trace)
  ﹣ [P1-01] DW-20 guard 2-elem gap: refLine(null,3).slice(0,2) -> [3,null] without crash (0.09ms) # SKIP
  ﹣ [P1-02] DW-20 guard boardFromLines short: boardFromLines([line], left) maps without crash (0.06ms) # SKIP
  ﹣ [P1-03] DW-20 guard movementLines short board: movementLines([[1]] as Board, left) pads to 4x4 (0.03ms) # SKIP
  ﹣ [P1-04] PIPELINE 4-dir left/right/up/down full board matches pre-spawn wall compaction (0.02ms) # SKIP
  ﹣ [P1-05] game.move wall expectations: ONE_CELL [_,3,_,3] left fully compact + down wall mirrors left (0.03ms) # SKIP
  ﹣ [P1-06] transitionPlan wall slide: left to [0,0], right to [0,3], down to [3,1] (wall-compacted coordinates) (0.02ms) # SKIP
✔ ATDD dw-engine-line-compaction — P1 wiring (board/4-dir/pipeline/wall trace) (0.45ms)
▶ ATDD dw-engine-line-compaction — P2 static scans (single-wall-scan / guards)
  ﹣ [P2-01] SCAN single wall-scan site: while(target > 0 && out[target-1].v===null) ==1 in line.ts (0.05ms) # SKIP
  ﹣ [P2-02] SCAN shiftLine length guard: const n=line.length + for i<n + dest bounds, not GRID_SIZE (0.03ms) # SKIP
  ﹣ [P2-03] SCAN shift vs merge site separation: shift out[target].v=t.v and merge canMerge(out[dest].v (0.02ms) # SKIP
  ﹣ [P2-04] SCAN boardFromLines guards + movementLines optional chaining pads ragged boards (0.02ms) # SKIP
✔ ATDD dw-engine-line-compaction — P2 static scans (single-wall-scan / guards) (0.21ms)
▶ ATDD dw-engine-line-compaction — P3 exploratory / residual / hygiene
  ﹣ [P3-01] exploratory — boardFromLines ragged row length beyond [[1]] still maps without crash (0.04ms) # SKIP
  ﹣ [P3-02] hygiene — line scope stays pure, no spawn/feel/monetization leakage, wall scan O(1) <1ms (0.02ms) # SKIP
✔ ATDD dw-engine-line-compaction — P3 exploratory / residual / hygiene (0.11ms)
ℹ tests 20
ℹ suites 4
ℹ pass 0
ℹ fail 0
ℹ cancelled 0
ℹ skipped 20
ℹ todo 0
ℹ duration_ms 280

Summary:
- Total tests: 20
- Skipped: 20 (expected before activation — RED scaffolds dormant)
- Passing: 0 before activation (expected, scaffolds skipped)
- Status: ✅ Red-phase scaffolds verified (all present, all `it.skip`, correct harness `node:test` + `tsx`)
```

### Activated Run / GREEN Verification (working-tree delta covers delta)

**Command:** `python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/engine/line-compaction.atdd.test.ts'); t=p.read_text(); pathlib.Path('/tmp/active.test.ts').write_text(t.replace('it.skip','it'))" && cp /tmp/active.test.ts triade/__tests__/engine/line-compaction.atdd.active.test.ts && npm --prefix triade test -- __tests__/engine/line-compaction.atdd.active.test.ts && rm triade/__tests__/engine/line-compaction.atdd.active.test.ts`

**Results:**
```
▶ ATDD dw-engine-line-compaction — P0 critical (spec AC + DW-74/DW-20)
  ✔ [P0-01] DW-74 wall-most multi-gap: [null,null,null,2] -> [2,null,null,null] from [[0,3]] moved true (1.29ms)
  ✔ [P0-02] DW-74 double gap two tiles: [null,2,null,4] -> [2,4,null,null] sequential scan (0.09ms)
  ✔ [P0-03] DW-74 3-gap single tile: [null,null,3,null] -> [3,null,null,null] (0.05ms)
  ✔ [P0-04] DW-74 all-null stays empty moved false without throw (0.03ms)
  ✔ [P0-05] preserve gap-non-merge: [3,null,3,null] -> [3,3,null,null] score 0 (wall vs immediate) (0.04ms)
  ✔ [P0-06] preserve cascade block: [3,3,3,3] -> [6,3,3,null] score 6 (merge-once sequential) (0.04ms)
  ✔ [P0-07] DW-20 guard empty line: shiftLine([]) length 0 moved false no throw (0.02ms)
  ✔ [P0-08] DW-20 guard single element: shiftLine([{v:1}]) length 1 moved false no throw (0.03ms)
✔ ATDD dw-engine-line-compaction — P0 critical (spec AC + DW-74/DW-20) (2.56ms)
▶ ATDD dw-engine-line-compaction — P1 wiring (board/4-dir/pipeline/wall trace)
  ✔ [P1-01] DW-20 guard 2-elem gap: refLine(null,3).slice(0,2) -> [3,null] without crash (0.11ms)
  ✔ [P1-02] DW-20 guard boardFromLines short: boardFromLines([line], left) maps without crash (0.13ms)
  ✔ [P1-03] DW-20 guard movementLines short board: movementLines([[1]] as Board, left) pads to 4x4 (0.07ms)
  ✔ [P1-04] PIPELINE 4-dir left/right/up/down full board matches pre-spawn wall compaction (0.45ms)
  ✔ [P1-05] game.move wall expectations: ONE_CELL [_,3,_,3] left fully compact + down wall mirrors left (0.12ms)
  ✔ [P1-06] transitionPlan wall slide: left to [0,0], right to [0,3], down to [3,1] (wall-compacted coordinates) (0.38ms)
✔ ATDD dw-engine-line-compaction — P1 wiring (board/4-dir/pipeline/wall trace) (1.28ms)
▶ ATDD dw-engine-line-compaction — P2 static scans (single-wall-scan / guards)
  ✔ [P2-01] SCAN single wall-scan site: while(target > 0 && out[target-1].v===null) ==1 in line.ts (0.18ms)
  ✔ [P2-02] SCAN shiftLine length guard: const n=line.length + for i<n + dest bounds, not GRID_SIZE (0.28ms)
  ✔ [P2-03] SCAN shift vs merge site separation: shift out[target].v=t.v and merge canMerge(out[dest].v (0.11ms)
  ✔ [P2-04] SCAN boardFromLines guards + movementLines optional chaining pads ragged boards (0.37ms)
✔ ATDD dw-engine-line-compaction — P2 static scans (single-wall-scan / guards) (1.06ms)
▶ ATDD dw-engine-line-compaction — P3 exploratory / residual / hygiene
  ✔ [P3-01] exploratory — boardFromLines ragged row length beyond [[1]] still maps without crash (0.06ms)
  ✔ [P3-02] hygiene — line scope stays pure, no spawn/feel/monetization leakage, wall scan O(1) <1ms (5.05ms)
✔ ATDD dw-engine-line-compaction — P3 exploratory / residual / hygiene (5.17ms)
ℹ tests 20
ℹ suites 4
ℹ pass 20
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 350

- P0 8/8 pass (multi-gap wall `[null,null,null,2]`→wall`0` + double-gap + gap-non-merge + cascade + empty/1-elem guards)
- P1 6/6 pass (2-elem gap + short `boardFromLines`/`movementLines` + 4-dir pipeline + game.move `ONE_CELL` fully compact + transitionPlan `to [0,0]/[0,3]/[3,1]`)
- P2 4/4 pass (single wall-scan + single `n=line.length` / 0 GRID_SIZE in shiftLine + shift `target` vs merge `dest` sites + `lines.length/row.length` + `board[r]?.[c] ?? null ×2`)
- P3 2/2 pass (ragged `[[1,2],[3]]` + O(1) bench `10k <50ms` pure scope)
Status: ✅ All ATDD scaffolds GREEN when activated — working-tree diff implements the contract.
Expected failure before sweep would be: `[null,null,null,2]` at `[null,null,2,null]`, `shiftLine([])` throw, `movementLines([[1]])` TypeError — now all fixed at 7eacd93.
```

### Existing Suite Regression (line + game + transition)

**Command:** `npm --prefix triade test -- __tests__/engine/line.test.ts __tests__/engine/line-moved.unit.test.ts __tests__/engine/line-compaction.regression.test.ts` → `43 pass / 0 fail`

**Command:** `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/render/transitionPlan.test.ts` → `32 pass / 0 fail` + `16 pass / 0 fail`

**Command:** `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` → clean

**Command:** `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` → clean

**Expected Failure Messages (per test, when NOT hardened):**
- P0-01: Expected `[2,null,null,null]` but got `[null,null,2,null]` (one-cell slide without wall-scan)
- P0-07: Expected length 0 but threw `TypeError: Cannot read properties of undefined (reading 'v')` (`for i<GRID_SIZE` OOB)
- P1-03: Expected `lines[0][1].v===null` but threw `TypeError: Cannot read properties of undefined (reading '0')` (no Optional chaining)
- P1-06: Expected `to [0,0]` but got `to [0,1]` (one-cell vs wall)

---

## Notes

- **Working-tree already implements the delta.** These ATDD scaffolds were written RED and are now GREEN when activated — that inversion is correct for a sweep bundle whose working-tree diff is the implementation (`git diff 505c8ea..7eacd93 -- triade/src/engine/core/line.ts` shows only wall-scan + length guards + `board[r]?.[c]` pads; `game.test.ts`/`transitionPlan.test.ts` wall expectations are the living wall pins). Keep them `it.skip` in the repo so the dev workflow activates one at a time per task.
- **No `sprint-status.yaml` write.** This workflow never writes `_bmad-output/implementation-artifacts/sprint-status.yaml` (orchestrator-owned per prompt). Ledger `deferred-work.md` DW flips (`done 2026-09-02` with `resolution-undo` 64-hex) are the only status change.
- **Engine `src/engine` delta is `line.ts` only.** `git diff --stat -- triade/src/engine` shows single file `triade/src/engine/core/line.ts` (3 guard sites + 1 wall-scan site) — spawn/feel/render/layout invariants pinned by 991 existing host tests, not re-derived here (`spawnTile` alias DW-75 stays `open` as unrelated deferred).
- **Short-board production path is defensive-only.** `movementLines`/`boardFromLines` production callers always pass 4×4 via `emptyBoard()`/`staticBoard`; short guard exists for harness/ragged-input defensiveness. `movementLines([[1]])` now pads silently rather than throwing — document-only residual R-003 (no new threshold needed; wall correctness is the invariant).
- **GRID_SIZE stays 4.** Any follow-on that changes `GRID_SIZE` or reintroduces `for(i<GRID_SIZE)` inside `shiftLine` must fail `P2-02` scan; `types.ts: GRID_SIZE=4` is the single-definition pin.
- **Follow-on:** run `*automate` once broader coverage needed; run `*nfr-assess` after implementation evidence to validate NFR planning without inventing thresholds.

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @TEA / Murat in Slack/Discord
- Refer to `./bmm/docs/tea-README.md` for workflow documentation
- Consult `./resources/knowledge` for testing best practices

---

**Generated by BMad TEA Agent** - 2026-09-02 (story `dw-engine-line-compaction`, baseline `505c8eac145fccd9b18fc97b8fd4a51826e24847` → `7eacd93` → `4f6cc04dd3b59bcb025fc463a21619d195ae09a6`, delta `line.ts` only + 11 regression pins + `game`/`transition` wall expectations)
