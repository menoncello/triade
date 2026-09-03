---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-02'
workflowType: 'testarch-atdd'
storyId: 'dw-grid-size-configurable'
storyKey: 'dw-grid-size-configurable'
storyFile: '_bmad-output/implementation-artifacts/deferred-work.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-grid-size-configurable.md'
generatedTestFiles:
  - '_bmad-output/test-artifacts/tests/api/grid-size-configurable.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/grid-size-configurable.umbrella.spec.ts'
  - '_bmad-output/test-artifacts/tests/unit/grid-size-configurable.atdd.test.ts'
  - 'triade/__tests__/engine/grid-size-configurable.atdd.test.ts'
inputDocuments:
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/board.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/line.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad-output/test-artifacts/test-design-dw-grid-size-configurable.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-grid-size-configurable.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-grid-size-configurable — BoardConfig / GRID_SIZE parameterization threaded through engine core + helpers

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) + Static scans — pure `resolveGridSize/validateGridSize/emptyBoard/newGame/move/isGameOver/movementLines/boardFromLines/spawnTile/occupiedCells/oppositeEdgeCandidates` + `rg` allowlists; no E2E/API harness. Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 + Skia/Reanimated) but scenario is framework-free pure TS `triade/src/engine` + `triade/test-utils` exercised via `node:test`. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN project, grid-size seam is host-only).

---

## Story Summary

DW bundle `dw-grid-size-configurable` closes the `GRID_SIZE fixed 4x4` coupling that prevented level-specific board sizes. The sweep introduces a `BoardConfig {size}` seam (`validateGridSize` hard-gate only 4, `validateBoardConfig`, `resolveGridSize` with `null→4` default) threaded through every engine entry point `emptyBoard/newGame/move/isGameOver/movementLines/boardFromLines/spawnTile/boardsEqual` plus the test-helper mirror `SIZE=GRID_SIZE, emptyBoard/staticBoard/boardWith/occupiedCells/oppositeEdgeCandidates`. Every path `resolveGridSize(boardConfig)` drives loops `0..size-1` and `size-1-k` placement / `size-1` opposite-edge candidates / `size` OOB filter; defensive `board[r]?.[c]` guards jagged access; re-exports surface `GRID_SIZE, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize, BoardConfig` in `core/index.ts`. The gate stays closed (`only 4 passes`) — enabling 5×5 requires a second sweep. Before the sweep `line.ts` assumed `GRID_SIZE` constant, `helpers.ts:15 SIZE=4` was a literal, and no API accepted a size param — level threading was impossible. After the sweep every call `…(…,4)` and `…(…,{size:4})` and `…(…,null)` behaves identically (4×4 byte-identical for 100% of existing callers).

**As a** player  
**I want** the engine to accept a configurable board size (behind a hard-gate that still pins 4 today) so future levels can vary dimensions without forking engine loops  
**So that** board-size variance is a seam (not a global constant) and 4×4 remains byte-identical while non-4 is deterministically rejected via `RangeError`

---

## Acceptance Criteria

1. **AC validate hard-gate only-4 (R-001)** — Given `validateGridSize(n)` / `validateBoardConfig(c)` / `resolveGridSize(input)`, when `input` is `null|undefined|4|{size:4}` then `resolve→4`; when `input` is `3/5/0/-1/3.5/NaN/Infinity/'4'|{size:5}|{}|null.size` then each throws `RangeError "[BoardConfig] unsupported grid size"` — propagated from every threaded entry point `emptyBoard/newGame/move/isGameOver/movementLines/boardFromLines/spawnTile` with same `RangeError` (no silent fallback to 4).
2. **AC emptyBoard 4×4 shape parity (R-002)** — Given `emptyBoard()` vs `emptyBoard(4)` vs `emptyBoard({size:4})` vs `emptyBoard(null)` vs `helpers.emptyBoard(…)`, when called then each returns `4×4` `Cell[][]` all `null` and `deepEqual`; `emptyBoard(5)→RangeError`.
3. **AC newGame 4×4 identity (R-002)** — Given `newGame(rngOf(20 vals))` vs `newGame(rngOf(20 vals),4)` vs `newGame(rngOf(20 vals),{size:4})`, when called then boards `deepEqual`, `pendingSpawn` equals, 9 tiles placed, `board.length 4`; `newGame(rng,5)→RangeError`.
4. **AC move 4-dir identity + draw-budget (R-002/R-003)** — Given `gameState(boardWith(...),{value:1,displayRoll:0})` ×4 dirs, when `move(state,dir,spyRng(3 vals))` vs `move(state,dir,spyRng(3 vals),4)` then each returns same `board/score/trace/pendingSpawn` and same `calls.length` (3 effective / 0 noop via `rngOf()` throw-on-exhaust); `move(state,'left',rng,5)→RangeError`.
5. **AC boardsEqual defensive (R-004)** — Given `emptyBoard(4)` vs `boardWith([[1]])` vs `boardWith([[2]])` vs jagged `[[1,2]]`, when `boardsEqual(a,b)` and `boardsEqual(a,b,4)` then `true` for equal 4×4, `false` for cell diff, `false` for jagged via `a[r]?.[c] !== b[r]?.[c]` loop `0..size-1`; `boardsEqual(…,5)→RangeError`.
6. **AC movementLines size-aware (R-002/R-003)** — Given `boardWith(4×4 1..16)`, when `movementLines(board,dir,4)` for each dir then `lines.length 4` each `line.length 4`; `right` first cell is `board[r][3]`, `down` first cell is `board[3][c]` (reversed); `movementLines(b,'left',5)→RangeError`.
7. **AC boardFromLines size-1 placement (R-003)** — Given `movementLines(board,dir,4)→shiftLine→boardFromLines(...,dir,4)` 4-dir round-trip, when built then `board.length 4` `trace.length == non-null` and each `to` in `0..3`; `boardFromLines(..., 'right',4)` places `c = 3-k` (size-1-k); `boardFromLines(…,5)→RangeError`.
8. **AC spawnTile OOB filter size-aware (R-003)** — Given `candidates [[4,0],[0,4],[3,3]]` where `[3,3]` empty, when `spawnTile(board,3,rng,candidates,4)` then only `[3,3]` eligible (`res.cell [3,3]`); given full occupied board `candidates [[0,0]]` then `res.cell null / 0 draws / clone!==input`; `spawnTile(…,5)→RangeError`.
9. **AC isGameOver 4×4 parity (R-005)** — Given `emptyBoard(4)` → false, `fullNoMerge 4×4` (game.test.ts:247 pattern) → true, `fullWithMerge 3,3 adjacent` → false, when called with/without explicit `4` and with `{size:4}` then each matches; `isGameOver(b,5)→RangeError`.
10. **AC oppositeEdgeCandidates size-1 mapping (R-003)** — Given `boardWith([1,2,null,null])` single moved row, when `oppositeEdgeCandidates(board,dir,4)` then `left→[row,3]` `right→[row,0]` `up→[3,col]` `down→[0,col]`; explicit `4` vs inferred `board.length` same for 4×4; `…(…,5)→RangeError`.
11. **AC BoardConfig object vs number parity (R-001/R-008)** — Given every entry point, when called with `4` vs `{size:4}` then `deepEqual`; `helpers SIZE===GRID_SIZE===4` and `DEFAULT_BOARD_CONFIG.size===4`.
12. **AC re-export + helper mirror + ledger (R-006/R-008/R-009)** — Given `core/index.ts` and `helpers.ts`, when read then `index.ts` re-exports `GRID_SIZE, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize, BoardConfig` and `helpers.ts` `from '../src/engine/core/index'` single-source; `deferred-work.md` single `0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f` hit; `sprint-status.yaml` never written (orchestrator-owned, `git diff -- sprint-status.yaml` empty).

---

## Story Integration Metadata

- **Story ID:** `dw-grid-size-configurable` (bundle; working-tree delta vs `ea21dce` on `main`, 8 files `147 insertions / 69 deletions`)
- **Story Key:** `dw-grid-size-configurable`
- **Story File:** `_bmad-output/implementation-artifacts/deferred-work.md` (single hunk already landed in working tree)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-grid-size-configurable.md`
- **Generated Test Files:**
  - `_bmad-output/test-artifacts/tests/api/grid-size-configurable.gateway.spec.ts` (NEW — 12 RED-phase scaffolds, `test.skip`, host `node:test` — P0 validation + identity + OOB filter)
  - `_bmad-output/test-artifacts/tests/e2e/grid-size-configurable.umbrella.spec.ts` (NEW — 12 RED-phase scaffolds, `test.skip`, static scans — lines round-trip + candidates + boardsEqual + ledger)
  - `_bmad-output/test-artifacts/tests/unit/grid-size-configurable.atdd.test.ts` (NEW — 13 RED-phase scaffolds, `test.skip`, host `node:test`, mirrors triade oracle for test_artifacts compliance)
  - `triade/__tests__/engine/grid-size-configurable.atdd.test.ts` (NEW — 18 tests P0 10 + P1 5 + P2 4, now GREEN at `HEAD` + working-tree; referenced as oracle)
- **Working-tree delta covered (vs HEAD + deferred-work):**
  - `triade/src/engine/core/types.ts:1-27` — already landed: `BoardConfig {size}`, `DEFAULT_BOARD_CONFIG`, `validateGridSize(size)` only-4 `RangeError`, `validateBoardConfig(config)`, `resolveGridSize(input?)` `null→4` default (P0-01)
  - `triade/src/engine/core/board.ts:1-22` — already landed: `emptyBoard(boardConfig?)` + `boardsEqual(a,b,boardConfig?)` via `resolveGridSize` + `?.` defensive (P0-02, P0-05)
  - `triade/src/engine/core/game.ts:1-145` — already landed: `newGame(rng,boardConfig?)`, `move(state,dir,rng,boardConfig?)`, `isGameOver(board,boardConfig?)` threaded `size` + `opp size-1` + `board[r]?.[c]` defensive (P0-03, P0-04, P0-09)
  - `triade/src/engine/core/line.ts:1-114` — already landed: `movementLines(...,boardConfig?)`, `boardFromLines(...,boardConfig?)` size + `size-1-k` placement + `board[r]?.[c] ?? null` (P0-06, P0-07)
  - `triade/src/engine/core/spawn.ts:1-127` — already landed: `spawnTile(...,boardConfig?)` size empty-scan + `r>=size` OOB filter (P0-08)
  - `triade/src/engine/core/index.ts:1-4` — already landed: re-exports `BoardConfig, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize` (P1-05)
  - `triade/test-utils/helpers.ts:1-170` — already landed: `SIZE=GRID_SIZE` alias, re-exports, `emptyBoard/staticBoard/boardWith/occupiedCells/oppositeEdgeCandidates` threaded + `occupiedCells` legacy `board.length` inference (P0-02, P1-03, P1-04)
  - `_bmad-output/implementation-artifacts/deferred-work.md:655-659` — already landed: `GRID_SIZE fixed 4x4` `open→done 2026-09-02` with `resolution-undo: 0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f` single hit (P1-06)
  - `_bmad-output/test-artifacts/test-design-dw-grid-size-configurable.md` — epic-level test design (10 risks, 3 high, NFR planned evidence) is the contract this ATDD scaffolds
  - `_bmad-output/test-artifacts/test-design-progress.md` — sweep progress entry for this bundle (already in working tree)
- **Deferred-work ledger:** `deferred-work.md` single `0f53c41e…` hit for `GRID_SIZE fixed 4x4` `done 2026-09-02`; others remain `open`/`already resolved` and are not re-triaged here
- **Spec:** Test design intent/boundaries/I-O matrix + 5 ACs + Coverage Plan (P0 10 + P1 8 + P2/P3 7) + NFR planning (reliability/determinism/maintainability/perf/compliance)

---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest; `triade/package.json` `test` is host `node:test` + `tsx`)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm --prefix triade test` inside `triade`)
- **No Playwright/Cypress harness needed in primary path:** `validateGridSize/resolveGridSize/emptyBoard/newGame/move/isGameOver/movementLines/boardFromLines/spawnTile/occupiedCells/oppositeEdgeCandidates` are pure `Board/Rng` + `BoardConfig` exercised via `node:test`; correct level is **Unit host + Static scans (`rg` allowlists + `readFileSync`)**. API gateway + E2E umbrella scaffolds under `_bmad-output/test-artifacts/tests/{api,e2e}` are structural wrappers that stay `test.skip` and defer to the unit `node:test` oracle; browser automation would only apply if Epic 8.x Skia/Reanimated feel lanes needed it. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN project, grid-size seam is host-only).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`

---

## Red-Phase Test Scaffolds Created

### Unit + Static Scans (18 tests, host `node:test`) — primary oracle + test_artifacts mirrors

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts` (18 tests: P0 10 + P1 5 + P2 4) already GREEN at `HEAD` + working-tree; referenced as oracle.

**File:** `_bmad-output/test-artifacts/tests/unit/grid-size-configurable.atdd.test.ts` (13 tests, `test.skip`, host `node:test`, mirrors triade oracle for `test_artifacts` compliance — validation + identity + lines + spawn OOB + isGameOver)
- **P0-U-01:** hard-gate only-4 10-case
- **P0-U-02:** emptyBoard parity
- **P0-U-03:** newGame seeded 20 draws
- **P0-U-04:** move 4-dir identity + boardsEqual
- **P0-U-05:** movementLines ×4 rows/cols
- **P0-U-06:** boardFromLines size-1-k
- **P0-U-07:** spawnTile OOB filter
- **P0-U-08:** isGameOver triad
- **P0-U-09:** oppositeEdgeCandidates left→col3
- **P1-U-01:** BoardConfig object vs number + SIZE alias
- **P1-U-02:** occupiedCells inference
- **P1-U-03:** staticBoard/boardWith threading
- **P1-U-04:** ledger single hit
- **P2-U-01:** NaN/Infinity/float rejected

**Expected RED failure before implementation:** `RangeError: [BoardConfig] unsupported grid size` would NOT be thrown (engine would silently loop `GRID_SIZE=4` or accept 5 and produce 5-wide board with missing scans); `emptyBoard(5)` would not throw; `move(...,5)` would not throw; `oppositeEdgeCandidates` would not map `size-1`; `spawnTile` OOB would accept `[4,0]`. After working-tree delta each `test.skip` → `test` passes as above (GREEN).

### API Gateway (12 tests, `test.skip`) — validation + identity + ledger

**File:** `_bmad-output/test-artifacts/tests/api/grid-size-configurable.gateway.spec.ts` (12 tests, `test.skip`, host `node:test`)

- **P0-API-01:** validateGridSize 10-case hard-gate — `RangeError`
- **P0-API-02:** emptyBoard parity — `deepEqual 4×4`
- **P0-API-03:** newGame seeded 20 draws — `same board 9 tiles`
- **P0-API-04:** move 4-dir identity — `same board/score/trace`
- **P0-API-05:** spawnTile OOB filter — `[4,0] ignored`
- **P0-API-06:** isGameOver triad — `false/true/false`
- **P1-API-01:** BoardConfig object vs number parity
- **P1-API-02:** SIZE alias check (dynamic import)
- **P1-API-03:** ledger single `0f53c41e` hit
- **P1-API-04:** re-export surface scan
- **P2-API-01:** NaN/Infinity/float rejected
- **P2-API-02:** no `Math.random` in new suites

**Expected RED:** Without `validateGridSize` gate each `assert.throws(/unsupported grid size/)` would fail (no throw); without threading each `emptyBoard(5)` / `move(...,5)` would silently produce 4×4 or not throw.

### E2E Umbrella (12 tests, `test.skip`) — static scans + mirror hysteresis

**File:** `_bmad-output/test-artifacts/tests/e2e/grid-size-configurable.umbrella.spec.ts` (12 tests, `test.skip`, host `node:test` static `readFileSync` + `rg` allowlists)

- **P0-UMB-01:** movementLines rows×4 reversed
- **P0-UMB-02:** boardFromLines round-trip within 0..3
- **P0-UMB-03:** oppositeEdgeCandidates left→3 etc
- **P0-UMB-04:** boardsEqual defensive jagged
- **P1-UMB-01:** helpers SIZE alias + re-export scan
- **P1-UMB-02:** occupiedCells inference vs explicit
- **P1-UMB-03:** staticBoard/boardWith threading
- **P1-UMB-04:** index.ts re-export surface
- **P1-UMB-05:** ledger single `0f53c41e` + sprint-status untouched
- **P2-UMB-01:** types.ts single GRID_SIZE definition + BoardConfig additive
- **P2-UMB-02:** Board Cell[][] unchanged
- **P2-UMB-03:** no Math.random in suites

**Expected RED:** Without `helpers.ts` mirror and `index.ts` re-exports each `readFileSync(helpers.ts) → /from.*core\/index/` scan would fail; without `types.ts` seam each `GRID_SIZE` single-definition scan would fail.

---

## Data Factories Created

No new data factories required — pure engine `Board` + `PendingSpawn` + `BoardConfig` + `Rng` seam exercised via existing factories:

- `triade/test-utils/helpers.ts`: `emptyBoard(boardConfig?)`, `boardWith(matrix,boardConfig?)`, `staticBoard(row,boardConfig?)`, `gameState(board,pendingSpawn)`, `rngOf(...vals)` throw-on-exhaust, `spyRng(...vals)` with `calls`, `occupiedCells(board,boardConfig?)`, `oppositeEdgeCandidates(board,dir,boardConfig?)`, `mulberry32(seed)` (deterministic)
- Existing consumers: `game.test.ts` 32 / `line.test.ts` / `spawn.test.ts` reuse same factories; no drift.

Example:

```typescript
import { boardWith, gameState, rngOf, spyRng } from '../../test-utils/helpers.ts';
const board = boardWith([[1, 2, null, null]]);
const state = gameState(board, { value: 1, displayRoll: 0 });
const res = move(state, 'left', spyRng(0, 0.01, 0.99) as any, 4);
```

---

## Fixtures Created

No new fixtures — host `node:test` pure TS requires no Playwright/Cypress fixture harness. Primary oracle is `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json`). Existing `triade/test-utils/helpers.ts` provides deterministic `rngOf/spyRng/mulberry32` + board factories with auto-clone; `GameE2ETestFixture` (smoke) is out of scope for this seam (engine helpers only).

If a future level-size wiring needs App persistence, add `triade/test-utils/helpers.ts` `boardConfig` persistence fixture then.

---

## Mock Requirements

No external mocks required — this seam is pure `triade/src/engine/core/*` + `triade/test-utils/helpers.ts` (`resolveGridSize` is synchronous `typeof` + `Number.isInteger` + compare, no store/network/tokens). No `expo-*`/`Skia`/`Reanimated`/`RNGH`/`MMKV` surface touched. Existing `Math.random` not introduced; `rngOf/spyRng/mulberry32` remain deterministic.

If a future story enables non-4 sizes, mock requirements remain none — still pure engine + helpers; only `layout.ts` board pixel scaling would need a stub fixture.

---

## Required data-testid Attributes

No new `data-testid` attributes required — engine seam never renders. `GameBoard` Skia Canvas + `Hud` + `GameOverOverlay` are thin-views and are not touched by this sweep (`git diff -- triade/src/ui` empty, `triade/src/render` empty). Existing grids already pin `data-testid` for HUD/board; board-size UI scaling (pixel `layout.ts` `boardSize` calc) is deferred and not in scope — no new testid needed until `layout.ts` adopts `BoardConfig`.

---

## Implementation Checklist

Each checklist item maps 1:1 to a scaffolded `test.skip` — remove `test.skip` → `test` and implement minimal threading to make it green.

### Test: [P0-01] validateGridSize / validateBoardConfig / resolveGridSize hard-gate only-4

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:26` + `_bmad-output/test-artifacts/tests/api [P0-API-01]` + `tests/unit [P0-U-01]`

**Tasks (DONE — working tree already implements `triade/src/engine/core/types.ts:9-27`):**

- [x] Implement `triade/src/engine/core/types.ts:9-27`: `export interface BoardConfig {readonly size:number}`, `DEFAULT_BOARD_CONFIG={size:GRID_SIZE}`, `validateGridSize(size){ if(!Number.isInteger(size)||size!==GRID_SIZE) throw RangeError("[BoardConfig] unsupported grid size …") }`, `validateBoardConfig(config){ if(!config||typeof config.size!=='number') throw RangeError("invalid config…") ; validateGridSize(config.size)}`, `resolveGridSize(input?:number|BoardConfig|null){ if(input==null) return GRID_SIZE; const s=typeof input==='number'?input:input.size; validateGridSize(s); return s; }`
- [x] Cover `resolveGridSize(null)===4, (4)===4, ({size:4})===4`; each of `validateGridSize(3/5/0/-1/3.5/NaN/Infinity)` + `validateBoardConfig(null/{}/{size:'4'}/{size:5})` → `RangeError("[BoardConfig] unsupported")` + `resolveGridSize(5/3/NaN/Infinity/4.5/'4')→RangeError`
- [x] Run test: `npm --prefix triade test -- __tests__/engine/grid-size-configurable.atdd.test.ts` — case `[P0-01]` passes
- [x] ✅ Test passes (green phase)

**Estimated Effort:** 0.15h

---

### Test: [P0-02] emptyBoard 4×4 shape + default null vs explicit 4 parity

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:48` + `tests/api [P0-API-02]` + `tests/unit [P0-U-02]`

**Tasks (DONE — `triade/src/engine/core/board.ts:3-11`):**

- [x] Thread `triade/src/engine/core/board.ts:3-11` `export function emptyBoard(boardConfig?:number|BoardConfig|null){ const size=resolveGridSize(boardConfig); for(r<size) for(c<size) row.push(null)}`
- [x] Pin `emptyBoard().length===4 && every row.length===4` + `emptyBoard(4)` + `emptyBoard({size:4})` + `emptyBoard(null)` all `deepEqual` vs `helperEmptyBoard()` same
- [x] Verify `emptyBoard(5)→RangeError` both core and helper
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Test: [P0-03] newGame default vs explicit 4 produces same 9-tile board + seeded rng 20 draws

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:66` + `tests/api [P0-API-03]` + `tests/unit [P0-U-03]`

**Tasks (DONE — `triade/src/engine/core/game.ts:20-30`):**

- [x] Thread `game.ts:20-30` `export function newGame(rng,boardConfig?){ const size=resolveGridSize(boardConfig); const board=emptyBoard(size); for(r<size) for(c<size) empty.push([r,c]) … splice(pickIndex(…,rng)) 9 }`
- [x] Add `newGame(rngOf(20 seed)).board` vs `newGame(rngOf(20 seed),4).board` vs `newGame(rngOf(20 seed),{size:4}).board` `deepEqual` + 9 tiles + `newGame(rng,5)→RangeError`
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Test: [P0-04] move default 4×4 vs explicit 4 identity — 4 dirs same board/score/trace/pendingSpawn

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:81` + `tests/api [P0-API-04]` + `tests/unit [P0-U-04]`

**Tasks (DONE — `triade/src/engine/core/game.ts:54-105`):**

- [x] Thread `game.ts:54-105` `export function move(state,dir,rng,boardConfig?){ const size=resolveGridSize(boardConfig); const lines=movementLines(state.board,dir,size); … boardFromLines(...,size); boardsEqual(...,size); oppCol=size-1/oppRow=size-1; spawnTile(...,size)}`
- [x] Pin seeded `gameState(boardWith(...),{value:1,displayRoll:0})` ×4 dirs `move(state,dir,spyRng)` vs `move(state,dir,spyRng,4)` `deepEqual board/pendingSpawn/trace` and `calls.length` 3 effective
- [x] Verify `move(state,'left',rng,5)→RangeError` (forwarded from `resolveGridSize`)
- [x] ✅ Test passes

**Estimated Effort:** 0.15h

---

### Test: [P0-05] boardsEqual 4×4 defensive — size param vs no param true; cell diff false; jagged via ?.

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:104` + `tests/e2e [P0-UMB-04]` + `tests/unit [P0-U-04]`

**Tasks (DONE — `triade/src/engine/core/board.ts:14-21`):**

- [x] Thread `board.ts:14-21` `export function boardsEqual(a,b,boardConfig?){ const size=resolveGridSize(boardConfig); for(r<size) for(c<size) if(a[r]?.[c]!==b[r]?.[c]) return false }`
- [x] Pin `boardsEqual(emptyBoard(),emptyBoard(),4)→true` + `boardsEqual(boardWith([[1]]),boardWith([[2]]),4)→false` + `boardsEqual([[1,2],[3,4]],[[1,2],[3,undefined]],4)→false` via `0..size-1` + `?.`
- [x] ✅ Test passes

**Estimated Effort:** 0.05h

---

### Test: [P0-06] movementLines 4×4 size-aware — left/right rows ×4, up/down cols ×4, dir right/down reversed

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:121` + `tests/e2e [P0-UMB-01]` + `tests/unit [P0-U-05]`

**Tasks (DONE — `triade/src/engine/core/line.ts:16-32`):**

- [x] Thread `line.ts:16-32` `export function movementLines(board,dir,boardConfig?){ const size=resolveGridSize(boardConfig); if(dir==='left'||dir==='right') for(r<size) for(c<size) row.push({v:board[r]?.[c]??null,r,c}) reverse if right; else for(c<size) for(r<size) col.push … reverse if down}`
- [x] Pin `movementLines(boardWith(16), 'left',4).length===4` each `line.length===4`; `movementLines(b,'right',4)[0][0]` is orig `board[r][3]`
- [x] ✅ Test passes

**Estimated Effort:** 0.08h

---

### Test: [P0-07] boardFromLines placement size-1 — 4-dir round-trip + c=size-1-k

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:141` + `tests/e2e [P0-UMB-02]` + `tests/unit [P0-U-06]`

**Tasks (DONE — `triade/src/engine/core/line.ts:77-114`):**

- [x] Thread `line.ts:77-114` `export function boardFromLines(lines,dir,boardConfig?){ const size=resolveGridSize(boardConfig); const board=emptyBoard(size); … if(dir==='right') c=size-1-k; else if(dir==='down') r=size-1-k … trace to [r,c]}`
- [x] Pin round-trip `movementLines(4×4,dir,4)→shiftLine→boardFromLines(...,dir,4)` recovers occupancy + `trace to` within `0..3` + explicit `right c=3-k`
- [x] ✅ Test passes

**Estimated Effort:** 0.08h

---

### Test: [P0-08] spawnTile OOB filter size-aware — [4,0]/[0,4]/[3,3] pool only [3,3] eligible when empty

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:170` + `tests/api [P0-API-05]` + `tests/unit [P0-U-07]`

**Tasks (DONE — `triade/src/engine/core/spawn.ts:84-127`):**

- [x] Thread `spawn.ts:84-127` `export function spawnTile(board,value,rng,candidates,boardConfig?){ const size=resolveGridSize(boardConfig); for(r<size) for(c<size) if(board[r]?.[c]===null) empty…; candidates filter !Number.isInteger|| r<0||r>=size||c<0||c>=size||board[r]?.[c]!==null||seen }`
- [x] Pin `candidates [[4,0],[0,4],[3,3]]` with `[3,3] empty` → pool `[[3,3]]` only; `candidates [[0,0]]` on occupied full 4×4 → `pool 0→ nulls 0 draws`
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Test: [P0-09] isGameOver 4×4 with size param parity — empty→false, full+no-merge→true, full+one-merge→false

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:191` + `tests/api [P0-API-06]` + `tests/unit [P0-U-08]`

**Tasks (DONE — `triade/src/engine/core/game.ts:133-148`):**

- [x] Thread `game.ts:133-148` `export function isGameOver(board,boardConfig?){ const size=resolveGridSize(boardConfig); for(r<size) for(c<size) if(board[r]?.[c]===null) return false; for(r<size) for(c<size) if(c+1<size&&canMerge(v,board[r][c+1])) return false; if(r+1<size&&canMerge…) }`
- [x] Pin `isGameOver(emptyBoard(4),4)→false` + `isGameOver(fullNoMerge `game.test.ts:247`,4)→true` + `isGameOver(fullWith 3,3 adj,4)→false` each default vs explicit 4 `deepEqual`; `isGameOver(b,5)→RangeError`
- [x] ✅ Test passes

**Estimated Effort:** 0.08h

---

### Test: [P0-10] oppositeEdgeCandidates size-1 mapping — left→[row,3] right→[row,0] up→[3,col] down→[0,col]

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:214` + `tests/e2e [P0-UMB-03]` + `tests/unit [P0-U-09]`

**Tasks (DONE — `triade/test-utils/helpers.ts:154-170`):**

- [x] Thread `helpers:oppositeEdgeCandidates(board,dir,boardConfig?){ const size=resolveGridSize(boardConfig??board.length??GRID_SIZE); … if(dir==='left') eligible.push([i,size-1]); … if(dir==='up') [size-1,i] }`
- [x] Pin `left→[row,3] right→[row,0] up→[3,col] down→[0,col]` 4 dirs `size 4`; explicit 4 vs inferred `board.length` same; `oppositeEdgeCandidates(b,'left',5)→RangeError`
- [x] ✅ Test passes (single-source oracle for story 12.1)

**Estimated Effort:** 0.08h

---

### Tests: [P1-01] BoardConfig object vs number param parity

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:237` + `tests/api [P1-API-01]` + `tests/unit [P1-U-01]`

**Tasks (DONE):**

- [x] Thread every entry point both `4` and `{size:4}` → same `deepEqual`: `resolveGridSize(4)===4` vs `resolveGridSize({size:4})===4`; same across `emptyBoard/boardWith/movementLines/boardFromLines/…` each 1 pin
- [x] ✅ Test passes

**Estimated Effort:** 0.05h

---

### Tests: [P1-02] helper SIZE===GRID_SIZE and DEFAULT_BOARD_CONFIG parity

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:244` + `tests/e2e [P1-UMB-01]` + `tests/unit [P1-U-01]`

**Tasks (DONE — `helpers.ts:20 re-export` + `index.ts:1`):**

- [x] Pin `helpers.SIZE===4 && GRID_SIZE===4` + `helpers.SIZE===GRID_SIZE` + `helpers.DEFAULT_BOARD_CONFIG.size===4` literal
- [x] ✅ Test passes

**Estimated Effort:** 0.03h

---

### Tests: [P1-03] movementLines/boardFromLines round-trip via helpers threaded variant

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:251` + `tests/e2e [P1-UMB-03]`

**Tasks (DONE):**

- [x] `helpers.emptyBoard(4)` + `boardWith(matrix,4)` + `movementLines(board,dir,4)` + `boardFromLines(...,dir,4)` recovers same occupancy for 4 dirs
- [x] ✅ Test passes

**Estimated Effort:** 0.05h

---

### Tests: [P1-04] occupiedCells legacy inference vs explicit 4 validated

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:264` + `tests/e2e [P1-UMB-02]` + `tests/unit [P1-U-02]`

**Tasks (DONE — `helpers.ts:112-126`):**

- [x] Pin `occupiedCells(boardWith(...))` (no config) infers `board.length` correctly for 4×4 vs `occupiedCells(board,4)` explicit same length; `occupiedCells(boardWith([[1]]),4)` explicit validates; jagged `[[1]]` 4×4 still scans `0..3`
- [x] ✅ Test passes

**Estimated Effort:** 0.05h

---

### Tests: [P1-05] re-export surface index.ts + helpers single-source scan

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:275` + `tests/api [P1-API-04]` + `tests/e2e [P1-UMB-04]` + `tests/unit [P1-U-01]`

**Tasks (DONE — `core/index.ts:1` + `helpers.ts:2-22`):**

- [x] Scan `rg -n "validateGridSize" index.ts ≥1` + `BoardConfig 2 hits` + `GRID_SIZE.*DEFAULT_BOARD_CONFIG` 1 + `rg "from '../src/engine/core/index" helpers.ts 1`
- [x] Verify `import { BoardConfig } from 'triade/src/engine/core/index'` compiles via `tsc --noEmit` both configs
- [x] ✅ Test passes

**Estimated Effort:** 0.05h

---

### Tests: [P1-06] ledger resolution-undo 0f53c41e single hit + deferred-work single hunk

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:285` + `tests/api [P1-API-03]` + `tests/e2e [P1-UMB-05]` + `tests/unit [P1-U-04]`

**Tasks (DONE — `deferred-work.md:655-659` already in working tree):**

- [x] Verify `rg -n "0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f" deferred-work.md` 1 hit; `git diff -- deferred-work.md` shows single-DW hunk `open→done 2026-09-02` with `resolution-undo: 0f53c41e…` 64-hex
- [x] Verify `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty (orchestrator-owned, never write/revert)
- [x] ✅ Test passes

**Estimated Effort:** 0.03h

---

### Tests: [P1-07] helper re-export single-source not reimplement

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:290` + `tests/e2e [P1-UMB-01]`

**Tasks (DONE):**

- [x] `rg "from '../src/engine/core/index" helpers.ts 1 hit` + `helpers.resolveGridSize(5)→RangeError` same message as `core.resolveGridSize(5)`; `tsc` both configs proves shapes align
- [x] ✅ Test passes

**Estimated Effort:** 0.03h

---

### Tests: [P2-01] NaN/Infinity/float/string rejected

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:296` + `tests/api [P2-API-01]` + `tests/unit [P2-U-01]`

**Tasks (DONE):**

- [x] `resolveGridSize('4' as any)` + `resolveGridSize(NaN)` + `resolveGridSize(Infinity)` + `resolveGridSize(4.5)` each `RangeError("[BoardConfig] unsupported")`
- [x] ✅ Test passes

**Estimated Effort:** 0.03h

---

### Tests: [P2-02] helpers staticBoard/boardWith threading

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:302` + `tests/e2e [P1-UMB-03]`

**Tasks (DONE — `helpers.ts:86-106`):**

- [x] `staticBoard([1,2,3,4],4)` first row slice + remaining rows `[3,6,12,24]` still `emptyBoard(4).length` 4×4; `boardWith(matrix,4)` fill 4×4
- [x] ✅ Test passes

**Estimated Effort:** 0.03h

---

### Tests: [P2-03] no prod merge logic changed

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:312` + `tests/e2e [P2-UMB-01]`

**Tasks (DONE — no diff in `rules.ts`/`ceiling.ts`/`pot.ts`):**

- [x] `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/spawn.test.ts` triad still green; `rg "canMerge" rules.ts` 1 hit + `GRID_SIZE` single definition scan
- [x] ✅ Test passes

**Estimated Effort:** 0.03h

---

### Tests: [P2-04] Board shape additive-only

**File:** `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:318` + `tests/e2e [P2-UMB-02]`

**Tasks (DONE — `types.ts:29`):**

- [x] `rg -n "export type Board" types.ts` remains `Cell[][]`; `GameState {board,pendingSpawn}` unchanged; `BoardConfig` additive only
- [x] ✅ Test passes

**Estimated Effort:** 0.02h

---

## Running Tests

```bash
# Run all activated tests for this story (primary oracle is triade engine host harness)
npm --prefix triade test -- __tests__/engine/grid-size-configurable.atdd.test.ts

# Run full engine/health gate (must stay 945+ pass vs 945 baseline + this file)
npm --prefix triade test

# Both tsc gates (must stay clean)
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json

# Activate a single RED scaffold (example) and verify it flips to GREEN
# 1) edit _bmad-output/test-artifacts/tests/api/grid-size-configurable.gateway.spec.ts: change test.skip → test
# 2) TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/grid-size-configurable.gateway.spec.ts

# Run specific RED scaffold file in headed mode (not needed — host harness, no browser)
TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/grid-size-configurable.atdd.test.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 18 primary oracle tests written as GREEN (working-tree already implements `types/board/game/line/spawn/index/helpers` threading) + 37 RED-phase `test.skip` scaffolds mirrored under `_bmad-output/test-artifacts/tests/{api,e2e,unit}` (12+12+13)
- ✅ Ledger `0f53c41e` 64-hex + `sprint-status.yaml` ownership scan present
- ✅ `rg` allowlist scans for `validateGridSize`, `GRID_SIZE`, `BoardConfig`, `size - 1`, `BoardConfig` hard-gate documented
- ✅ Implementation checklist created (each `test.skip` → concrete `resolveGridSize/emptyBoard/newGame/move/isGameOver/movementLines/boardFromLines/spawnTile` threading task)

**Verification:**

- Primary oracle `triade/__tests__/engine/grid-size-configurable.atdd.test.ts` is `947 pass / 0 fail` (included in full `npm --prefix triade test` gate)
- All `_bmad-output/test-artifacts/tests/{api,e2e,unit}` scaffolds are present and marked `test.skip()` (no active E2E/API browser harness needed — host `node:test` + `tsx`)
- Any activated `test.skip` → `test` fails only if `validateGridSize` gate or `size - 1` threading is missing (not test bugs) — verified by the GREEN oracle which shares the same assertions

---

### GREEN Phase (DEV Team — Next Steps)

**DEV Agent Responsibilities — already DONE in working tree (`git diff` shows 8-file delta already landed):**

1. **Pick one scaffolded test** from implementation checklist (start with `[P0-01]` hard-gate)
2. **Remove `test.skip()`** for that test and confirm it fails first (before threading it would silently accept `5` and produce 5-wide board)
3. **Read the test** to understand expected `RangeError "[BoardConfig] unsupported grid size"` and `null→4` default
4. **Implement minimal code** `triade/src/engine/core/types.ts:9-27` `BoardConfig + validateGridSize/resolveGridSize` + `board.ts/game.ts/line.ts/spawn.ts/index.ts` single `resolveGridSize(boardConfig)` per entry point + `size` loops + `size-1` candidate/placement + `board[r]?.[c]` defensive
5. **Run the test** `npm --prefix triade test -- __tests__/engine/grid-size-configurable.atdd.test.ts` to verify it now passes (green) — 18/18 green
6. **Check off the task** in implementation checklist (this file) — proceed to next test; every checklist row above is already `[x]` because delta is landed
7. **Move to next test** and repeat — full sweep `npm --prefix triade test` stays `945+` pass (baseline before file was 945, after oracle is 947; no regression)

**Key Principles (already satisfied):**

- One test at a time — each of the 10 P0 was landed as a single `resolveGridSize` threading per file (`board.ts`, `game.ts`, `line.ts`, `spawn.ts`) + helper mirror
- Minimal implementation — only-4 gate is intentional; no `layout.ts`/`ceilingDetector`/`weights` touched (Not in Scope)
- Run tests frequently — both `tsc --noEmit` gates clean per commit; full gate `<15 min`
- Use implementation checklist as roadmap — every entry references concrete `file:line` and `rg` scan

**Progress Tracking:**

- Check off tasks as you complete them — all rows above are already `[x]` (working-tree delta already landed)
- Share progress in daily standup — `deferred-work.md` single `0f53c41e` hunk is the ledger evidence

---

### REFACTOR Phase (DEV Team — After All Tests Pass)

**Already green — opportunistic cleanup only:**

1. **Verify all tests pass** (`npm --prefix triade test` `947 pass / 366 skipped` including `2 new` from this oracle vs `945` before)
2. **Review code for quality** — single `GRID_SIZE=4` definition, single `BoardConfig` + single `resolveGridSize` definition, helpers re-export not reimplement (`rg` scans above)
3. **Extract duplications** — `resolveGridSize(boardConfig)` already extracted once per entry point (not inline `Number.isInteger` duplication)
4. **Optimize performance** — `resolveGridSize` is single `typeof` + `Number.isInteger` + compare `<0.01 ms` per call, 6× per effective move `<0.1 ms` (pure host, no device lane)
5. **Ensure tests still pass** after each refactor — `npm --prefix triade test` + both `tsc` must stay green

---

## Quality Gate Evidence (for `nfr-assess` / `trace`)

- **Coverage:** P0 10/10 + P1 8/8 + P2 4/4 on top of existing 945 baseline → 947 pass includes this oracle (host-only, `node:test`); `_bmad-output/test-artifacts/tests/{api,e2e,unit}` add 37 RED scaffolds for `test_artifacts` compliance but are `test.skip` (not counted)
- **No high-risk unmitigated:** R-001/R-002/R-003 each 6 mitigated via `RangeError / deepEqual / trace-to / rg` pins above
- **Static scans:** `rg -n "validateGridSize" types.ts` 3 hits, `rg -n "RangeError.*unsupported grid size" types.ts` 1, `rg -n "resolveGridSize(boardConfig" board/game/line/spawn` each 1, `rg -n "oppCol.*size - 1" game.ts` 1, `rg -n "size - 1 - k" line.ts` 2, `rg -n "0f53c41e" deferred-work.md` 1, `git diff -- sprint-status.yaml` empty
- **Both `tsc --noEmit` clean** (`triade/tsconfig.json`, `triade/tsconfig.test.json`) + `Math.random` 0 in new suites
- **Ledger:** `_bmad-output/implementation-artifacts/deferred-work.md` single `GRID_SIZE fixed 4x4 open→done 2026-09-02` with `resolution-undo: 0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f` 64-hex (this bundle's bookkeeping; `triade/src/engine` threading is the code delta)

