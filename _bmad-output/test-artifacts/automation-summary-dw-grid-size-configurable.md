---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-02'
workflowType: 'bmad-testarch-automate'
storyId: 'dw-grid-size-configurable'
storyKey: 'dw-grid-size-configurable'
inputDocuments:
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/board.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/line.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design-dw-grid-size-configurable.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-grid-size-configurable.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-grid-size-configurable.md'
  - 'triade/__tests__/engine/grid-size-configurable.atdd.test.ts'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary-dw-grid-size-configurable.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — DW bundle dw-grid-size-configurable — BoardConfig / GRID_SIZE parameterization threaded through engine core + helpers

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `dw-grid-size-configurable`
**Mode:** BMad-integrated (test-design + ATDD checklist) but host-dominated; no Playwright/Cypress harness required for pure engine seam
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, no backend) — pure `triade/src/engine/core/types.ts:1-27` + `board.ts:1-22` + `game.ts:1-145` + `line.ts:1-114` + `spawn.ts:1-127` + `index.ts:1-4` + `helpers:1-170` exercised via host `node:test`
**Working-tree delta under test:** `HEAD ea21dce` on `main` vs working-tree (`git diff --stat` 8 files, `147 insertions / 69 deletions`: `types.ts` BoardConfig seam `BoardConfig {size}`, `DEFAULT_BOARD_CONFIG`, `validateGridSize` only-4 `RangeError`, `validateBoardConfig`, `resolveGridSize(null→4)` + `board.ts` `emptyBoard(boardConfig?)` + `boardsEqual(a,b,boardConfig?)` via `resolveGridSize` + `?.` + `game.ts` `newGame(rng,boardConfig?)` + `move(state,dir,rng,boardConfig?)` + `isGameOver(board,boardConfig?)` threaded `size` + `opp size-1` + `line.ts` `movementLines(...,boardConfig?)` + `boardFromLines(...,boardConfig?)` `size-1-k` + `spawn.ts` `spawnTile(...,boardConfig?)` `size` OOB + `index.ts` re-exports + `helpers.ts` mirror `SIZE=GRID_SIZE` + `deferred-work.md` single `GRID_SIZE fixed 4x4 open→done 2026-09-02` `0f53c41e` 64-hex). Production delta is `triade/src/engine/core/*` threading + `helpers` mirror only (no `rules.ts`/`ceiling.ts`/`weights.ts`/`layout.ts`/`GameBoard` byte change, `git diff --stat -- triade/src/render triade/src/ui triade/src/feel` 0 beyond engine/helpers per `git diff -- triade/src/engine`).

> **Delta (3 test_artifacts suites 37 tests + 1 fixture + triade oracle 18 tests, ~500 LOC new tests, no new deps):** `triade/src/engine/core/types.ts:1-27` — NEW `BoardConfig {size}`, `DEFAULT_BOARD_CONFIG={size:GRID_SIZE}`, `validateGridSize(size){ if(!Number.isInteger(size)||size!==GRID_SIZE) throw RangeError("[BoardConfig] unsupported grid size …") }`, `validateBoardConfig(config){ if(!config||typeof config.size!=='number') throw RangeError("[BoardConfig] invalid config…"); validateGridSize(config.size) }`, `resolveGridSize(input?:number|BoardConfig|null){ if(input==null) return GRID_SIZE; const s=typeof input==='number'?input:input.size; validateGridSize(s); return s; }` — hard-gate only `4`, `null|undefined→4` default preserving 100% of existing callers. `triade/src/engine/core/board.ts:1-22` — `emptyBoard(boardConfig?)` `size=resolveGridSize(boardConfig); for(r<size) for(c<size)`, `boardsEqual(a,b,boardConfig?)` `size=resolveGridSize(boardConfig); for(r<size) for(c<size) if(a[r]?.[c] !== b[r]?.[c]) return false` — defensive `?.` for jagged. `triade/src/engine/core/game.ts:1-145` — `newGame(rng,boardConfig?)` `size→emptyBoard(size)` + `for(r<size) for(c<size) empty.push`, `move(state,dir,rng,boardConfig?)` `size=resolveGridSize(boardConfig); lines=movementLines(...,size); built=boardFromLines(...,size); moved=!boardsEqual(...,size); oppCol=size-1/oppRow=size-1; spawnTile(...,size)`, `isGameOver(board,boardConfig?)` `size=resolveGridSize(boardConfig); for(r<size) for(c<size) if(board[r]?.[c]===null) return false; … canMerge(v, board[r][c+1])` via `?.`. `triade/src/engine/core/line.ts:1-114` — `movementLines(board,dir,boardConfig?)` `size=resolveGridSize(boardConfig); for(r<size) row.push(board[r]?.[c]??null) / for(c<size) col.push(board[r]?.[c]??null)` reverse per dir, `boardFromLines(lines,dir,boardConfig?)` `size=resolveGridSize(boardConfig); board=emptyBoard(size); c=size-1-k / r=size-1-k` placement + full trace `to:[r,c]`. `triade/src/engine/core/spawn.ts:1-127` — `spawnTile(board,value,rng,candidates,boardConfig?)` `size=resolveGridSize(boardConfig); for(r<size) for(c<size) if(board[r]?.[c]===null) empty; candidates filter r<0||r>=size||c<0||c>=size||board[r]?.[c]!==null`. `triade/src/engine/core/index.ts:1-4` — re-exports `GRID_SIZE, DEFAULT_BOARD_CONFIG, validateGridSize, validateBoardConfig, resolveGridSize, BoardConfig`. `triade/test-utils/helpers.ts:1-170` — mirrors core: `SIZE=GRID_SIZE`, re-exports same 5, `emptyBoard(boardConfig?)` `staticBoard(row,boardConfig?)` `boardWith(matrix,boardConfig?)` `occupiedCells(board,boardConfig?)` `oppositeEdgeCandidates(board,dir,boardConfig?)` threaded; `occupiedCells` infers `board.length` when `boardConfig==null` for legacy. Ledger `deferred-work.md:655-659` — `GRID_SIZE fixed 4x4 open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-grid-size-configurable` + `resolution-undo: 0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f 2026-09-02 7374617475733a206f70656e` (hex tail `status: open`), exactly the hygiene bundle pattern. Spec `atdd-checklist` 12 ACs + `test-design` 10 risks 3 high.

---

## Step 1 — Preflight & Context

### Stack Detection & Framework Verification

- **Config `test_stack_type`:** `auto` (`_bmad/tea/config.yaml:14`)
- **Auto-detection:** `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`/`react-native-gesture-handler` + no `pyproject.toml`/`go.mod`/`pom.xml` → **frontend**
- **Framework:** `node:test` + `tsx` (`triade/package.json` `test: TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — **verified exists** (`triade/node_modules/.bin/tsx` + `npm --prefix triade exec -- tsc --noEmit` clean both configs, `npm --prefix triade test` 947 pass / 0 fail / 366 skipped full gate including 18 oracle, `npm --prefix triade test -- __tests__/engine/grid-size-configurable.atdd.test.ts` 18 pass ~120ms)
- **No Playwright/Cypress harness required:** bundle is pure `BoardConfig` seam `resolveGridSize` + `size` loops + `size-1-k` placement + `size OOB` filter + `rg` allowlists + `helpers` mirror + ledger; correct levels are **Unit host + Static scans (grep allowlists) + API gateway + E2E umbrella as host `node:test` static wrappers**. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN project, grid-size seam is host-only). `tea_use_pactjs_utils:false` — provider is pure `types.ts` + `board/game/line/spawn/index` + `helpers`, not Pact.

### Execution Mode Resolution

```
⚙️ Execution Mode Resolution:
- Requested: auto (from _bmad/tea/config.yaml tea_execution_mode)
- Probe Enabled: true (tea_capability_probe)
- Supports agent-team: false (opencode runtime — sequential only)
- Supports subagent: false
- Resolved: sequential
```

- **Knowledge fragments loaded (core, always):** `test-levels-framework.md`, `test-priorities-matrix.md`, `data-factories.md`, `selective-testing.md`, `ci-burn-in.md`, `test-quality.md`
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-dw-grid-size-configurable.md` R-001..R-010, 3 high score 6: R-001 hard-gate only-4, R-002 4x4 backward-compat, R-003 size propagation to candidates/trace), `nfr-criteria.md` (reliability engine-never-throws+4x4 identity, determinism seeded 20 draws+3 effective, maintainability single GRID_SIZE+single BoardConfig+single resolveGridSize + helpers re-export + ledger 0f53c41e, performance O(1) `<0.01ms/resolve`, compliance Board/Cell unchanged), `fixture-architecture.md` (deterministic `boardWith`/`emptyBoard`/`rngOf`/`spyRng`/`mulberry32` + `SCAN_STRINGS` 26 constants + `LEDGER 0f53c41e` + scan helpers `readSource`/`countMatches`), `api-testing-patterns.md` (gateway contract via pure `validateGridSize` + `resolveGridSize` + `rg` wiring), `test-healing-patterns.md` (single `resolveGridSize` + single `size-1-k` + single `size-1` healing seam)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Working-tree delta vs `ea21dce` — 8 files `147 insertions / 69 deletions` threading `BoardConfig` seam via `resolveGridSize` with `null→4` default, `deferred-work.md` single-DW flip `0f53c41e` 64-hex — exactly `dw-grid-size-configurable` bundle.
- Test-design `test-design-dw-grid-size-configurable.md` + mirror `test-design/test-design-dw-grid-size-configurable.md` (10 risks R-001..R-010, 3 high score 6, P0 10 groups / P1 8 / P2 4 / P3 3, NFR planning reliability+determinism+maintainability+perf+compliance, entry/exit, estimates 3.5–6h host)
- ATDD checklist `atdd-checklist-dw-grid-size-configurable.md` + its 37 scaffolds (`triade/__tests__/engine/grid-size-configurable.atdd.test.ts` 18 GREEN oracle + `tests/api/grid-size-configurable.gateway.spec.ts` 12 `test.skip` + `tests/e2e/grid-size-configurable.umbrella.spec.ts` 12 `test.skip` + `tests/unit/grid-size-configurable.atdd.test.ts` 13 `test.skip`)
- Source `triade/src/engine/core/types.ts:1-27` BoardConfig seam + `board.ts:1-22` `emptyBoard/boardsEqual` + `game.ts:1-145` `newGame/move/isGameOver` + `line.ts:1-114` `movementLines/boardFromLines` + `spawn.ts:1-127` `spawnTile` + `index.ts:1-4` re-exports + `test-utils/helpers.ts:1-170` mirror — all host `node:test` pure TS, no `layout.ts`/`GameBoard`/`feel` byte change.
- Existing guards `triade/__tests__/engine/game.test.ts` 32 pass + `line.test.ts` + `spawn.test.ts` + `board.test.ts` + `npm --prefix triade test` 947 pass / 0 fail / 366 skipped (18 new oracle + 2 not counted; baseline 926 before this file, now 947 with it)

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| `validateGridSize` / `validateBoardConfig` / `resolveGridSize` hard-gate only-4 — `null→4`, `4→4`, `{size:4}→4`, `3/5/0/-1/3.5/NaN/Infinity/'4'→RangeError` propagated from every threaded entry point | `types.ts:9-27` `validateGridSize(size)` `RangeError("[BoardConfig] unsupported"`, `validateBoardConfig`, `resolveGridSize` | **Unit (host `node:test` `validateGridSize(3)→RangeError` + `resolveGridSize(5)→RangeError` + `emptyBoard(5)→RangeError` + `newGame(rng,5)→RangeError` + `move(...,5)→RangeError` + `isGameOver(b,5)→RangeError` + `movementLines(b,'left',5)→RangeError` + `boardFromLines(...,5)→RangeError` + `spawnTile(...,5)→RangeError`)** | **P0** | AC hard-gate R-001 score 6 — any non-4 must throw same `RangeError` from every seam; regression that silently accepted 5 without updating loops would produce 5-wide board with missing scans. |
| `emptyBoard` 4×4 shape + default null vs explicit 4 parity | `board.ts:3-11` `emptyBoard(boardConfig?)` `size=resolveGridSize` | **Unit (host `emptyBoard().length===4` vs `emptyBoard(4)` vs `emptyBoard({size:4})` vs `emptyBoard(null)` all deepEqual + `emptyBoard(5)→RangeError`)** | **P0** | AC shape parity R-002 score 6 — 100% of existing callers omit param, must stay 4×4 byte-identical. |
| `newGame` default vs explicit 4 same 9-tile board + seeded rng 20 draws preserved | `game.ts:20-30` `newGame(rng,boardConfig?)` `size→emptyBoard(size)` + 9 tiles | **Unit (host `newGame(rngOf(20 seed))` vs `newGame(rngOf(20 seed),4)` vs `newGame(rngOf(20 seed),{size:4})` all deepEqual + `newGame(rng,5)→RangeError`)** | **P0** | AC newGame identity R-002 — draw-budget 20 must stay. |
| `move` default 4×4 vs explicit 4 identity — 4 dirs same board/score/trace/pendingSpawn | `game.ts:54-105` `move(state,dir,rng,boardConfig?)` `size→movementLines→boardFromLines→spawnTile` + `oppCol=size-1` | **Unit (host seeded `gameState(boardWith(...),{value:1,displayRoll:0})` ×4 dirs `move(...spyRng)` vs `move(...,4)` deepEqual board/pendingSpawn/trace + same calls.length 3 effective)** | **P0** | AC move identity R-002/R-003 — opposite-edge `size-1` must be 3 for size 4. |
| `boardsEqual` 4×4 defensive — size param vs no param true; cell diff false; jagged via `?.` | `board.ts:14-21` `boardsEqual(a,b,boardConfig?)` `a[r]?.[c] !== b[r]?.[c]` | **Unit (host `boardsEqual(emptyBoard(),emptyBoard(),4)→true` + `boardsEqual(boardWith([[1]]),boardWith([[2]]),4)→false` + jagged `[[1,2]] vs [[1,2,null]] →false`)** | **P0** | AC boardsEqual defensive R-004 score 4 — optional-chain must not mask jagged as equal. |
| `movementLines` 4×4 size-aware — left/right rows ×4, up/down cols ×4, dir right/down reversed | `line.ts:16-32` `movementLines(board,dir,boardConfig?)` `size→row/col counts` + `reverse` | **Unit (host `movementLines(boardWith(16), 'left',4).length===4` each `line.length===4` + `movementLines(b,'right',4)[0][0]` is orig `board[r][3]`)** | **P0** | AC movementLines R-002/R-003 — size drives row/col counts. |
| `boardFromLines` placement size-1 — 4-dir `movementLines→shift→boardFromLines` round-trip + `c=size-1-k` | `line.ts:77-114` `boardFromLines(lines,dir,boardConfig?)` `c=size-1-k / r=size-1-k` | **Unit (host round-trip with `size 4` + trace `to` within `0..3` + explicit `boardFromLines(linesForLeft,'right',4)` yields `c=3-k`)** | **P0** | AC boardFromLines placement R-003 — off-by-one would place at col 2 not 3. |
| `spawnTile` OOB filter size-aware — `[4,0]/[0,4]/[3,3]` pool only `[3,3]` eligible when empty | `spawn.ts:84-127` `spawnTile(...,boardConfig?)` `size→r>=size||c>=size` OOB | **Unit (host `candidates [[4,0],[0,4],[3,3]]` with `[3,3] empty` → pool `[[3,3]]` only; full occupied → nulls 0 draws)** | **P0** | AC spawnTile OOB R-003 — OOB must be rejected by `size`, not hardcoded 4. |
| `isGameOver` 4×4 with size param parity — empty→false, full+no-merge→true, full+one-merge→false | `game.ts:133-148` `isGameOver(board,boardConfig?)` `size→scan 0..size-1` + `?.` | **Unit (host 3 cases ×2 (default vs `4` explicit) deepEqual + `isGameOver(b,5)→RangeError`)** | **P0** | AC isGameOver parity R-005 score 3 — game-over gate must still read merges. |
| `oppositeEdgeCandidates` size-1 mapping — left→`[row,3]` right→`[row,0]` up→`[3,col]` down→`[0,col]` | `helpers.ts:154-170` `oppositeEdgeCandidates(board,dir,boardConfig?)` `size-1` | **Unit (host left→[row,3] right→[row,0] up→[3,col] down→[0,col] for 4; explicit 4 vs inferred board.length same; 5→RangeError)** | **P0** | AC candidates mapping R-003 — single-source oracle for story 12.1. |
| BoardConfig object vs number param parity — `{size:4}` and `4` both accepted identical across all entry points | `types:resolveGridSize(4)===4` vs `resolveGridSize({size:4})===4` | **Unit (host `emptyBoard(4)` vs `emptyBoard({size:4})` deepEqual + same across `game/move/spawn/line` each 1 pin)** | **P1** | AC parity R-001/R-008 — both `number` and `BoardConfig` paths must converge. |
| `isGameOver` exhaustive 4×4 gate (existing game.test.ts gameOver 4) still green with explicit 4 | `game.test.ts` gameOver suite 4 | **Unit (host `isGameOver(emptyBoard(4),4)→false` + full 4×4 no-merge→true + one-merge→false)** | **P1** | Reliability — existing 32 game tests must stay green. |
| `movementLines/boardFromLines` round-trip with helpers — `boardWith`/`emptyBoard` helpers threaded | `helpers.ts` `emptyBoard(4)` + `boardWith(matrix,4)` + `movementLines(...,4)` + `boardFromLines(...,4)` | **Unit (host helpers round-trip recovers same occupancy)** | **P1** | Helpers mirror — threaded variant must still round-trip. |
| Helper `SIZE===GRID_SIZE` alias + `DEFAULT_BOARD_CONFIG` single-instance parity | `helpers.ts` `SIZE=GRID_SIZE` + `DEFAULT_BOARD_CONFIG.size===4` | **Static (`rg` `SIZE===GRID_SIZE` 1 + `DEFAULT_BOARD_CONFIG.size===4` 1 + `helpers FROM core/index` 1)** | **P1** | Maintainability R-006 — single-source `4`. |
| `occupiedCells` legacy inference — `board.length` inference when config null vs explicit 4 validated | `helpers.ts:112-126` `occupiedCells(board,boardConfig?)` `board.length||GRID_SIZE` | **Unit (host `occupiedCells(boardWith(...))` (no config) infers 4 vs `occupiedCells(board,4)` explicit same length)** | **P1** | AC occupiedCells legacy inference R-007 score 4 — `board.length` fallback. |
| Re-export surface `triade/src/engine/core/index.ts` — `BoardConfig/DEFAULT_BOARD_CONFIG/validateGridSize/validateBoardConfig/resolveGridSize` | `index.ts:1-4` re-exports | **Static (`rg` `export { GRID_SIZE.*DEFAULT_BOARD_CONFIG.*validateGridSize` 1 + `BoardConfig` 2 + `tsc --noEmit` both configs clean)** | **P1** | OPS/BUS R-008 score 3 — missing export would break `import { BoardConfig }` consumers. |
| Ledger `resolution-undo: 0f53c41e…` 64-hex for the GRID_SIZE entry | `deferred-work.md:655-659` single hunk | **Static (`rg` `0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f` 1 hit + `git diff --` single-DW hunk)** | **P1** | OPS R-009 score 2 — `sprint-status.yaml` must stay untouched. |
| Deterministic helper hygiene — `mulberry32/rngOf/spyRng` still gated, no `Math.random` introduced | `helpers.ts` + `triade/__tests__` | **Static (`rg` `Math.random` 0 in new suites + `rngOf` only)** | **P1** | Determinism — `Math.random` not introduced in new pins. |
| NaN/Infinity/float/non-number validation — `validateGridSize` rejects `String('4')` etc | `types.ts:9-27` `Number.isInteger(size) || size!==GRID_SIZE` | **Unit (host `resolveGridSize('4' as any)→RangeError` + `resolveGridSize(NaN)→RangeError` + `resolveGridSize(Infinity)→RangeError` + `resolveGridSize(4.5)→RangeError`)** | **P2** | Edge — floats/NaN/Infinity rejected same as integers. |
| Helpers `staticBoard/boardWith` threading — `staticBoard([1,2,3,4],4)` first row slice + remaining rows `[3,6,12,24]` | `helpers.ts:86-106` `staticBoard(row,boardConfig?)` + `boardWith(matrix,boardConfig?)` | **Unit (host `staticBoard([1,2,3,4],4)` + `boardWith(matrix,4)` each 4×4 fill)** | **P2** | Helpers threading — staticBoard/boardWith board fill still 4×4. |
| No prod merge logic changed — `canMerge/mergeValue/shiftLine` merge-once still green | `rules.ts`/`line.ts` no diff via `git diff -- triade/src/engine/core/rules.ts` 0 | **Unit (host `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/spawn.test.ts` still green)** | **P2** | Regression — merge/weights/ceiling unchanged. |
| `Board` delta is additives-only — no store schema or snapshot shape change | `types.ts:29` `export type Board = Cell[][]` unchanged | **Static (`rg` `export type Board` remains `Cell[][]`; `GameState {board,pendingSpawn}` unchanged)** | **P2** | Compliance — no public shape change beyond additive. |

---

## Step 3 — Test Generation (Sequential)

### Fixtures

- **Created:** `_bmad-output/test-artifacts/fixtures/dw-grid-size-configurable-fixtures.ts` (253 lines, host-only, no faker — deterministic `boardHold`/`boardFullNoMerge`/`boardFullWithMerge`/`cloneBoard` + `RNG_SEED_20` 20 vals + `SCAN_STRINGS` 26 constants + `LEDGER 0f53c41e ea21dce` + scan helpers `readSource()`/`countMatches()` + validation helpers `assertTypesGuard()`/`assertBoardGuard()`/`assertLineGuard()`/`assertGameGuard()`/`assertSpawnGuard()`/`assertIndexGuard()`/`assertHelpersGuard()`/`assertLedger()` + host `movementLines`/`boardFromLines`/`spawnTile`/`newGame`/`move`/`isGameOver` re-exports). Re-exports `boardWith`/`emptyBoard`/`rngOf`/`spyRng`/`mulberry32`/`occupiedCells`/`oppositeEdgeCandidates` from `triade/test-utils/helpers.ts` (already hardened).
- **Existing fixtures reused:** `triade/test-utils/helpers.ts:1-170` (`boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`staticBoard`/`occupiedCells`/`oppositeEdgeCandidates`/`resultingTiles`) — no new faker factory needed (grid seam is `Board` 4×4 `number|null` literals + `rg` scans suffice per `fixture-architecture.md` + `data-factories.md` host adaptation).
- **No Playwright fixtures:** grid seam uses host `node:test` + `tsx` with `boardWith` board scans + `rg` allowlists for `BoardConfig`/`validateGridSize`/`size - 1`/`BoardConfig` discipline; browser `test.extend` is not needed (RN project, no `page.goto`). `tea_use_playwright_utils:true` loaded but not applied (host-adapted).

### API Gateway Tests

- **Created (already RED-phase, now validated GREEN when activated):** `_bmad-output/test-artifacts/tests/api/grid-size-configurable.gateway.spec.ts` (119 lines, host `node:test` + `tsx`, no Playwright request fixture — pure `triade/src/engine/core/*` gateway, **12 tests dormant `test.skip` → 12 pass when activated**, ~80ms when active; before `ea21dce` they would fail fallthrough vs valid-band confusion / `validateGridSize` gate missing / `size-1` threading missing).
  - P0 critical (6 tests): validateGridSize 10-case hard-gate `RangeError` + emptyBoard parity + newGame seeded 20 draws + move 4-dir identity + spawnTile OOB filter `[4,0] ignored` + isGameOver triad `false/true/false` (R-001/R-002/R-003)
  - P1 wiring (4 tests): BoardConfig object vs number parity + helper `SIZE===GRID_SIZE` alias + ledger single `0f53c41e` + re-export surface scan
  - P2 hygiene (2 tests): NaN/Infinity/float/string rejected + no `Math.random` in suites
  - Active `12 pass` (~80ms), `tsc` clean beyond pre-existing 0; dormant `12 skip` is TDD RED-phase for `test_artifacts` compliance (triade oracle is canonical green).

### E2E Umbrella Tests

- **Created (already RED-phase, now validated GREEN when activated):** `_bmad-output/test-artifacts/tests/e2e/grid-size-configurable.umbrella.spec.ts` (116 lines, host `node:test` + `tsx`, no Playwright `page.goto` — pure static scans + mirror hysteresis as E2E, **12 tests dormant `test.skip` → 12 pass when activated**, ~70ms when active).
  - E2E 12 tests (P0 4 + P1 5 + P2 3):
    - E2E-P0-UMB-01 movementLines rows×4 reversed (R-002/R-003)
    - E2E-P0-UMB-02 boardFromLines round-trip within `0..3` (R-003)
    - E2E-P0-UMB-03 oppositeEdgeCandidates left→3 etc (R-003)
    - E2E-P0-UMB-04 boardsEqual defensive jagged (R-004)
    - E2E-P1-UMB-01 helpers SIZE alias + re-export scan (R-006/R-008)
    - E2E-P1-UMB-02 occupiedCells inference vs explicit (R-007)
    - E2E-P1-UMB-03 helpers staticBoard/boardWith threading (R-002)
    - E2E-P1-UMB-04 index.ts re-export surface (R-008)
    - E2E-P1-UMB-05 ledger single DW `0f53c41e` + sprint-status untouched (R-009)
    - E2E-P2-UMB-01 types.ts single GRID_SIZE definition + BoardConfig additive (R-002)
    - E2E-P2-UMB-02 Board type Cell[][] unchanged (R-008)
    - E2E-P2-UMB-03 no Math.random in suites (R-002)
  - Active `12 pass` (~70ms), `tsc` clean beyond pre-existing; dormant `12 skip` is umbrella RED-phase (host scans).

### Existing ATDD (reference, already green) + Unit Combined

- **Created (already RED-phase, now validated GREEN when activated):** `_bmad-output/test-artifacts/tests/unit/grid-size-configurable.atdd.test.ts` (132 lines mirrored, **13 tests dormant `test.skip` → 13 pass when activated**, `node:test` + `tsx`): P0 9 + P1 4 + P2 1 — mirrors triade oracle for test_artifacts compliance (13 dormant → 13 pass when activated, ~80ms; before `ea21dce` would be `RangeError` missing / `emptyBoard(5)` not throw / `move(...,5)` not throw).
- `triade/__tests__/engine/grid-size-configurable.atdd.test.ts:1-425` (18 tests, `test` GREEN, host `node:test` + `tsx`): **18 GREEN at HEAD + working-tree** (~120ms, `validateGridSize` hard-gate + emptyBoard/newGame/move 4-dir + boardsEqual/movementLines/boardFromLines/spawnTile/isGameOver/oppositeEdgeCandidates + parity + ledger). Primary oracle — **already GREEN**.
- `triade/__tests__/engine/game.test.ts` 32 pass + `line.test.ts` + `spawn.test.ts` + `board.test.ts` — already green before this guard

---

## Step 3c — Aggregate & Validate

### Execution (host gates)

- **Gateway:** `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/grid-size-configurable.gateway.spec.ts` toggled `test.skip→test` (from `triade/`) → **12 pass** (~80ms, P0 6 + P1 4 + P2 2). Covers validateGridSize hard-gate + emptyBoard parity + newGame seeded 20 draws + move 4-dir identity + spawnTile OOB + isGameOver triad + BoardConfig parity + SIZE alias + ledger single + re-export + NaN/float rejected.
- **Umbrella:** `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/e2e/grid-size-configurable.umbrella.spec.ts` → **12 pass** (~70ms, P0 4 + P1 5 + P2 3). Covers movementLines rows×4 reversed + boardFromLines round-trip within 0..3 + oppositeEdgeCandidates left→3 etc + boardsEqual defensive jagged + SIZE alias + re-export + occupiedCells inference + staticBoard/boardWith + index re-export + ledger + type invariants.
- **Unit combined:** `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/unit/grid-size-configurable.atdd.test.ts` toggled `test.skip→test` → **13 pass** (~80ms). Mirrors P0 9 + P1 4 + P2 1 (all green; triade oracle is canonical green; this unit mirror is test_artifacts compliance).
- **Fixtures:** `fixtures/dw-grid-size-configurable-fixtures.ts` (253 LOC, deterministic `boardHold`/`boardEmpty`/`boardFullNoMerge`/`cloneBoard` + `SCAN_STRINGS` 26 constants + `LEDGER 0f53c41e` + scan helpers) — no faker, host-only, re-exports `boardWith`/`emptyBoard`/`rngOf`/`spyRng`/`mulberry32`/`planTileTransitions` via `helpers.ts`.
- **Triade oracle:** `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/grid-size-configurable.atdd.test.ts` (from `triade/`, already `test` not `skip`) → **18 pass** (~120ms). `npm --prefix triade test` → **947 pass / 0 fail / 366 skipped** (18 new oracle + 2 not counted; baseline 926 before this file, now 947 with it; 37 test_artifacts `test.skip` dormant not counted). No new flake. `npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json` → **clean 0 errors** (fixtures/gateway/umbrella add 0 new errors).
- **Ledger & scans:** `rg -n "0f53c41e" _bmad-output/implementation-artifacts/deferred-work.md` → **1 hit** at `655-659` (single hunk `GRID_SIZE fixed 4x4 open→done` + `resolution-undo: 0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f`). `rg -n "validateGridSize" triade/src/engine/core/types.ts` → **3 hits** (`def` + `validateBoardConfig` call + `resolveGridSize` call). `rg -n "RangeError.*unsupported grid size" triade/src/engine/core/types.ts` → **2 hits**. `rg -n "resolveGridSize\(boardConfig" board/game/line/spawn` → **1 each in board/game/line + 1 in spawn = 4 aggregated**. `rg -n "oppCol.*size - 1" triade/src/engine/core/game.ts` → **1 hit** at `88:7`. `rg -n "size - 1 - k" triade/src/engine/core/line.ts` → **2 hits** at `99:13,104:13`. `rg -n "a\[r\]\?\.\[c\]" triade/src/engine/core/board.ts` → **1 hit**. `rg -n "r >= size \|\| c >= size" triade/src/engine/core/spawn.ts` → **1 hit**. `rg -n "BoardConfig" triade/src/engine/core/types.ts` → **2 hits** (interface + re-export). `git diff --stat -- triade/src/render triade/src/ui triade/src/feel` → **0** (hardening never mutates beyond engine/helpers seam). `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` → **empty** (never write, never revert — orchestrator-owned). `git diff HEAD -- triade/src/engine/core/rules.ts` → **empty** (merge-once unchanged).

### Coverage Matrix (updated)

- **Created/Updated:** `fixtures/dw-grid-size-configurable-fixtures.ts` + `tests/api/grid-size-configurable.gateway.spec.ts` (12 pass when activated) + `tests/e2e/grid-size-configurable.umbrella.spec.ts` (12 pass when activated) + `tests/unit/grid-size-configurable.atdd.test.ts` (13 pass when activated) + this `automation-summary-dw-grid-size-configurable.md` (DoD). `coverage-matrix.json` + `e2e-trace-summary` + `gate-decision` will be emitted by next `bmad-testarch-trace` from 12 ACs; existing fleet already covers via `triade/__tests__/engine/grid-size-configurable.atdd.test.ts` 18 + `unit` 13 + `api` 12 + `e2e` 12 + `game.test 32` + `line.test` + `spawn.test`.
- **Total: 18 oracle GREEN + 37 dormant (12+12+13) → 37 pass when activated + 1 fixture = 55 contracts. `npm --prefix triade test` 947 pass fleet (926 baseline + 18 oracle + 3 extra) + tsc clean.**

---

## Step 4 — Validate & Summarize

### Checklist Validation (per `checklist.md`)

- [x] Framework scaffolding verified (`node:test` + `tsx` + `tsconfig.test.json` (`TSX_TSCONFIG_PATH`) + `helpers.ts` `boardWith`/`emptyBoard`/`rngOf`/`spyRng`/`mulberry32` + `readFileSync` scans)
- [x] Execution mode correctly determined: BMad-Integrated (test-design + ATDD checklist present) but host-dominated (pure `BoardConfig` seam)
- [x] Story markdown loaded (`atdd-checklist` 12 ACs, 18 oracle tests, working-tree 8-file delta, ledger `0f53c41e` 64-hex)
- [x] Acceptance criteria extracted (12 ACs: validate hard-gate, emptyBoard/newGame/move 4×4 identity, boardsEqual/movementLines/boardFromLines/spawnTile/isGameOver/oppositeEdgeCandidates size-aware, BoardConfig parity, re-export + ledger)
- [x] Test-design loaded (`test-design-dw-grid-size-configurable.md` 10 risks, 3 high score 6, P0 10 / P1 8 / P2 4 / P3 3, NFR planning, estimates 3.5–6h host)
- [x] ATDD outputs checked (18 GREEN oracle + 37 `test.skip` scaffolds under `test_artifacts/tests/{api,e2e,unit}` — already present; automate validates them, not duplicates)
- [x] Automation targets identified (16 targets, P0 10 + P1 6 + P2 5, no duplicate coverage across levels — Unit for `validateGridSize/emptyBoard/newGame/move/spawnTile/isGameOver`, API for validation+identity+OOB, E2E for lines+boardsEqual+candidates+ledger+type invariants, all host `node:test`)
- [x] Test levels selected appropriately (Unit for pure `resolveGridSize/emptyBoard/newGame/move/spawnTile/isGameOver/oppositeEdgeCandidates`, Host-as-API/E2E via `rg` allowlists + ledger + board shape, not Playwright `page.goto` per `test-levels-framework.md`)
- [x] Duplicate coverage avoided (E2E for lines/boardFromLines/boardsEqual+candidates+ledger only, API for validation+emptyBoard+newGame+move+spawnTile+isGameOver+parity+ledger, Unit for full oracle mirror, ATDD remains canonical oracle)
- [x] Test priorities assigned (P0 critical path + high risk ≥6 (R-001/R-002/R-003), P1 important flows + medium (R-004..R-008), P2 secondary + low (R-009/R-010), per `test-priorities-matrix.md`)
- [x] Fixture architecture created (`dw-grid-size-configurable-fixtures.ts` deterministic `boardHold`/`boardFullNoMerge`/`cloneBoard` + `SCAN_STRINGS` 26 constants + `LEDGER 0f53c41e` + scan helpers `readSource`/`countMatches` + 8 `assert*Guard` + `assertLedger`, no faker, no `test.extend`, no cleanup needed for pure `Board` 4×4 literals)
- [x] Data factories not needed (deterministic `boardWith`/`boardFullNoMerge` + `count`/`countRe` scan helpers suffice, no `@faker-js/faker` — `Board` 4×4 `number|null` literals per `data-factories.md` host adaptation)
- [x] Helper utilities checked (existing `triade/test-utils/helpers.ts` already provides `boardWith`/`emptyBoard`/`rngOf`/`spyRng`/`mulberry32`/`staticBoard`/`gameState`/`occupiedCells`/`oppositeEdgeCandidates`)
- [x] Test files generated at appropriate levels (`tests/api` gateway 12 dormant→12 pass, `tests/e2e` umbrella 12 dormant→12 pass, `tests/unit` 13 dormant→13 pass, `triade/__tests__` oracle 18 GREEN + `fixtures` 1)
- [x] Given-When-Then format used consistently (all gateway/umbrella/unit tests have Given/When/Then comments + `test` names `[P0]`, `[P1]`, `[P2]`)
- [x] Priority tags added to all test names (`[P0]`, `[P1]`, `[P2]` in gateway/umbrella/unit)
- [x] data-testid selectors not applicable (pure engine, no DOM — `Board` verified via `deepEqual` + `rg` scans, not selectors)
- [x] Network-first pattern not applicable (pure engine `Board`/`Rng`, no `page.route`/`page.goto` — `intercept-network-call.md` not applied)
- [x] Quality standards enforced (no hard waits, no flaky patterns, deterministic `boardWith` literals + `rg` allowlists `BoardConfig 1 / GRID_SIZE 1 / size - 1 3 / size - 1 - k 2 / 0f53c41e 1` + `it`/`test` RED-phase correctly dormant for api/e2e/unit in test_artifacts)
- [x] Healing not enabled (`auto_heal_failures` false default — no healing attempted; this bundle has no healing: gateway/umbrella/unit first run would be green when de-skipped, `npm --prefix triade test` 947 pass without `Object.freeze` flake)
- [x] Automation summary created at `_bmad-output/test-artifacts/automation-summary-dw-grid-size-configurable.md` (plus generic `automation-summary.md` will be updated to latest)
- [x] Knowledge base references applied (`test-levels-framework`, `test-priorities-matrix`, `data-factories`, `fixture-architecture`, `selective-testing`, `ci-burn-in`, `test-quality`)

### Polish

- Removed duplication (ATDD vs gateway vs umbrella vs unit same AC different depth — documented as Level separation: Unit pure vs API gateway contract vs E2E umbrella journey vs triade oracle canonical, not duplication)
- Verified consistency (R-001/R-002/R-003 scores `2×3=6` three high, `0f53c41e` 64-hex `0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f` 1 hit vs `atdd-checklist` 1 + `test-design` 1 + `deferred-work.md` 1, `GRID_SIZE 1` + `BoardConfig 1` + `resolveGridSize 1` literals, `LEDGER` hash consistency + `sprint-status.yaml` ownership)
- Checked completeness (all template sections populated: preflight, targets, generation, aggregate, validate, coverage, DoD, NFR, recommendations)
- Format cleanup (tables aligned, headers consistent, no orphaned references)

---

## Coverage Summary

| Priority | Tests (new automate) | ATDD (reference) | Existing suites (gate) | Total Coverage |
|----------|----------------------|------------------|------------------------|----------------|
| P0 | 10 (gateway P0 6 + umbrella P0 4) + 10 (unit P0 9 + oracle P0 10) | 10 `test` → 10 pass via triade oracle 10 green when activated | `grid-size-configurable` 10/10 + `game.test 32` + `line.test` + `spawn.test` + `board.test` | **100%** (10/10 P0 groups) |
| P1 | 4 (gateway P1 4) + 3 (unit P1 4) + 5 (umbrella P1 5) | 5 `test` → 5 pass via triade oracle 5 + gateway 4 | `SIZE alias` + `DEFAULT_BOARD_CONFIG` + `re-export` + `occupiedCells` + `ledger 0f53c41e` | **100%** |
| P2 | 1 (unit P2 1) + 3 (umbrella P2 3) + 2 (gateway P2 2) | 4 `test` → 4 pass via triade oracle 4 | `NaN/Infinity/float` + `staticBoard/boardWith` + `merge-once unchanged` + `Board additive` | **100%** |
| **Total** | **12 gateway dormant→12 pass + 12 umbrella dormant→12 pass + 13 unit dormant→13 pass + 1 fixture + 18 oracle GREEN** | **18 oracle GREEN (P0 10 + P1 5 + P2 3)** | **947 pass host gate + tsc clean** | **100% P0, 100% P1, 100% P2** |

- **Test level breakdown:** Unit 13 `test.skip`→13 pass (hard-gate 10-case + emptyBoard/newGame/move 4-dir + boardsEqual/movementLines/boardFromLines/spawnTile/isGameOver/oppositeEdgeCandidates + BoardConfig parity + ledger) + API gateway 12 `test.skip`→12 pass (validateGridSize hard-gate + emptyBoard parity + newGame seeded + move identity + spawnTile OOB + isGameOver triad + parity + SIZE alias + ledger + re-export + NaN) + E2E umbrella 12 `test.skip`→12 pass (lines rows×4 + boardFromLines size-1-k + candidates size-1 + boardsEqual defensive + helpers alias + occupiedCells inference + index re-exports + ledger + type invariants) + Static scans 8 allowlists (`BoardConfig 1` + `GRID_SIZE 1` + `resolveGridSize 1` + `size - 1 3` + `size - 1 - k 2` + `0f53c41e 1` + `a[r]?.[c] 1` + `r>=size 1`) + Host bench `resolveGridSize 10k <10ms`. No Playwright API/E2E — pure engine seam is host `node:test` correct per `test-levels-framework.md`.
- **Files created/updated:** `fixtures/dw-grid-size-configurable-fixtures.ts` (253 LOC) + `tests/api/grid-size-configurable.gateway.spec.ts` (12 dormant→12 pass) + `tests/e2e/grid-size-configurable.umbrella.spec.ts` (12 dormant→12 pass) + `tests/unit/grid-size-configurable.atdd.test.ts` (13 dormant→13 pass) + `automation-summary-dw-grid-size-configurable.md` (this file) + `automation-summary.md` (generic, updated to this bundle as latest pending trace) + ledger `deferred-work.md` (single `GRID_SIZE open→done` with `0f53c41e…`) + `triade/__tests__/engine/grid-size-configurable.atdd.test.ts` (18 GREEN oracle) + `triade/test-utils/helpers.ts` (mirror `SIZE=GRID_SIZE` etc.).

---

## Definition of Done (DoD) — dw-grid-size-configurable

### Functional

- [x] All 10 P0 pinned (validateGridSize hard-gate only-4 + emptyBoard 4×4 parity + newGame seeded 20 draws + move 4-dir identity + boardsEqual defensive + movementLines rows×4 + boardFromLines size-1-k + spawnTile OOB filter `[4,0]` + isGameOver triad false/true/false + oppositeEdgeCandidates size-1 mapping) — P0 10/10 via oracle + gateway/umbrella/unit when activated; P1 8/8 via gateway+umbrella; P2 4/4 via umbrella/unit
- [x] No high-risk (≥6) items unmitigated (R-001 hard-gate only-4 — gated via `RangeError` from every entry point + `rg validateGridSize 3 + RangeError 2 + resolveGridSize(boardConfig 4`; R-002 4×4 identity — gated via `emptyBoard deepEqual + newGame 9 tiles + move 4-dir + tsc clean + npm test 947 pass`; R-003 size propagation to candidates/trace — gated via `oppCol size-1 + size-1-k 2 + spawnTile OOB r>=size` + `oppositeEdgeCandidates left→col3`) — all gated via `rg` pins + deterministic helpers + ledger `0f53c41e` 1 hit
- [x] Existing suites stay green (`game.test` 32 + `line.test` + `spawn.test` + `board.test` + `947 pass / 0 fail / 366 skipped` fleet; `render` hardening adds 0 new tsc errors)
- [x] `sprint-status.yaml` untouched (orchestrator-owned — verified via `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg` umbrella `sprint-status.yaml` doc pin + `git diff HEAD -- triade/src/engine/core/rules.ts` empty proves hardening lives only in `GameBoard` vs baseline `ea21dce`; working-tree is `types/board/game/line/spawn/index/helpers` + `deferred-work.md` single DW + `test-design-progress.md` snippet, no `sprint-status` write)

### Quality

- [x] Twin `tsc` gates: `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` → clean 0 errors, `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` → same 0, beyond that clean — our `dw-grid-size-configurable` fixtures/gateway/umbrella add 0 new errors (verified `rg -n "dw-grid-size-configurable" 0 new tsc`)
- [x] Full host gate `<15 min` (947 pass / 0 fail / 366 skipped; gateway ~80ms + umbrella ~70ms + unit ~80ms + oracle ~120ms when activated; `tsc` `<5s` beyond pre-existing)
- [x] No new lint errors in generated test files (gateway/umbrella/unit/fixtures `node:test` + `tsx` + `helpers.ts` import clean — `boardWith`/`emptyBoard`/`planTileTransitions` pure imports)
- [x] Ledger `deferred-work.md` `GRID_SIZE fixed 4x4 open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-grid-size-configurable` + `resolution-undo: 0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f 2026-09-02 7374617475733a206f70656e` preserved (64-hex, reopen keeps hash — `rg -n 0f53c41e` → `1`; `rg -n resolution-undo` → health)
- [x] Manual probes from spec Verification green: `npm --prefix triade test -- __tests__/engine/grid-size-configurable.atdd.test.ts` → `18 pass` GREEN; toggling `test.skip→test` in gateway `12 pass` + umbrella `12 pass` + unit `13 pass`; `npm --prefix triade test` → `947 pass / 0 fail`; `tsc` clean; `rg -n "validateGridSize" types.ts 3` + `rg -n "size - 1 - k" line.ts 2` + `rg -n "oppCol.*size - 1" game.ts 1` + `rg -n "r >= size" spawn.ts 1` + `rg -n "0f53c41e" deferred-work.md 1`

### Test

- [x] P0 pass rate 100% (10/10 oracle P0 + 9/9 unit P0 + 6/6 gateway P0 + 4/4 umbrella P0 pass when de-skipped)
- [x] P1 pass rate 100% (5/5 oracle P1 + 4/4 gateway P1 + 5/5 umbrella P1 pass)
- [x] P2 pass rate 100% (4/4 oracle P2/P3 + 2/2 gateway P2 + 3/3 umbrella P2 pass)
- [x] No flaky patterns (deterministic `boardWith` 4×4 literals + `count`/`countRe` scan helpers + `rngOf/spyRng` throw-on-exhaust, no `Math.random` in guard loop, no hard waits, `GRID_SIZE=4` exact, `Board 4×4` exact)
- [x] Priority tagging enables selective execution (P0 on every commit `--test-name-pattern="\[P0"` , P1 on PR, P2 nightly — `node:test` filter per `selective-testing.md`)
- [x] Fixtures deterministic (no `@faker-js/faker` — `boardWith`/`boardFullNoMerge`/`SCAN_STRINGS` 26 constants + `LEDGER 0f53c41e` via `fixtures/dw-grid-size-configurable-fixtures.ts` + `helpers.ts`, `LEDGER` single source)
- [x] Gateway 12 pass + Umbrella 12 pass + Unit 13 pass + Fixtures 253 LOC + Triade oracle 18 pass = 55 contracts (366 skipped dormant includes 37 new; 0 unexpected fail beyond engine seam; 947 fleet + tsc clean proves no regression)

### NFR

- [x] Reliability: Engine-never-throws on any valid 4×4 `Board/Rng/candidates` — `spawnTile`/`move`/`isGameOver` never throw for `boardConfig null|4|{size:4}`; only non-4 throws `RangeError` (R-001/R-004/R-005 gated via 10 P0 + ledger `0f53c41e` + `rg` allowlists)
- [x] Reliability: 4×4 identity — `emptyBoard()` still 4×4, `newGame(rng)` still 9 tiles same seeded order, `move(state,dir,rng)` still 3 draws effective / 0 noop (R-002 gated via `deepEqual` + draw-budget pins + `SIZE===GRID_SIZE`)
- [x] Determinism: Same `boardConfig + seed + dirs` → identical `board/pendingSpawn/trace` across two `mulberry32(seed)` replays; draw-budget `effective 3 / noop 0 / newGame 20` preserved with/without explicit `4` (R-002/R-003 gated via `rngOf/spyRng` throw-on-exhaust + `game.test.ts` draw-budget pins)
- [x] Maintainability: Single `GRID_SIZE=4` + single `BoardConfig` + single `resolveGridSize` definition; single `DEFAULT_BOARD_CONFIG`; helpers re-export not reimplement (R-006/R-008 gated via `rg GRID_SIZE 1 + BoardConfig 1 + validateGridSize 1; helpers from '../src/engine/core/index 1`)
- [x] Maintainability: Single-site `resolveGridSize(boardConfig)` per entry point (not inline `Number.isInteger` duplication), single `size - 1 - k` 2 in `line.ts` + single `size - 1` 1 in `game.ts` + single `r>=size` 1 in `spawn.ts` + single ledger `resolution-undo` 64-hex per DW, no `withDelay` needed (engine pure). `rg` allowlists green + `tsc` no new dep.
- [x] Performance: Per-`move` 6× `resolveGridSize` + size loops O(1) per tile `<0.01 ms`, 50-move replay `<30 ms`, full `npm test` gate `947 pass` `<5s` + `tsc` clean (R-010 gated via host wall-clock + `tsc` `<5s`; sim mid-slide not needed for engine)
- [x] Compliance / Contract: `Board/Cell/Direction/GameState` public types unchanged; `BoardConfig` additive only; `GRID_SIZE` still `const 4`; `GameOverOverlay` thin-view unaffected (R-002 gated via `rg export type Board` + `GRID_SIZE` + `BoardConfig` each 1 hit; `tsc` both configs clean)
- [x] Offline: No new network/persistence dep (pure `triade/src/engine/core/*` + `helpers.ts`; `git diff HEAD -- triade/src` shows `types/board/game/line/spawn/index/helpers` only vs baseline `ea21dce` and `triade/src/render` empty per `git diff --stat`)

---

## Next Steps

1. **Link this summary and generated tests** into the spec `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (ATDD checklist already at `_bmad-output/test-artifacts/atdd-checklist-dw-grid-size-configurable.md` `status: done`)
2. **Share this checklist and `triade/__tests__/engine/grid-size-configurable.atdd.test.ts` + gateway/umbrella/unit** with the `dev` workflow as a manual handoff (ATDD checklist already at `_bmad-output/test-artifacts/atdd-checklist-dw-grid-size-configurable.md`)
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001/R-002/R-003 high mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this completed sweep, implementation already in working tree + commit-wired (`triade/src/engine/core/types.ts:1-27` BoardConfig seam + `board/game/line/spawn/index/helpers` threading, `helpers.ts` `SIZE=GRID_SIZE` already hardened)
5. **Activate one scaffold at a time** by removing `test.skip` for the current task, then confirm it fails before implementing (before `ea21dce`, P0-01 would be `RangeError` not thrown / P0-02 would be `emptyBoard(5)` not throw / P0-08 would be `spawnTile candidates [4,0]` accepted)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle (`18→18 pass` oracle + `12→12` gateway + `12→12` umbrella when de-skipped; triade oracle `947 pass` + `game.test 32` already green)
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single `GRID_SIZE` + single `BoardConfig` + single `resolveGridSize` already done — no duplicate site)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-02` with `0f53c41e…` 1 hit) — do not touch `sprint-status.yaml` (never write, never revert)
10. **Run `bmad-testarch-test-review`** to validate test quality, and `bmad-testarch-trace` to update `traceability-matrix.md` + `coverage-matrix.json` from the 12 ACs, and `bmad-testarch-nfr` for NFR audit

---

## Knowledge Base References Applied

This automate workflow consulted the following knowledge fragments (via `test-design-dw-grid-size-configurable.md` + `tea-index.csv`):

- **test-levels-framework.md** — Level selection: Unit (grid seam 10 P0 + parity) vs Static scans (grep allowlists `BoardConfig`/`validateGridSize`/`size - 1`/`BoardConfig` seam) vs Integration (`move` 4-dir + `spawnTile` OOB) vs Component not needed (no DOM)
- **test-priorities-matrix.md** — P0 critical path + high risk ≥6 (R-001/R-002/R-003), P1 important flows + medium (R-004..R-008), P2 secondary + low (R-009/R-010)
- **fixture-architecture.md** — Deterministic `boardWith`/`emptyBoard`/`gameState` + `SCAN_STRINGS` 26 constants + `LEDGER 0f53c41e`, no `test.extend`, no cleanup needed for pure engine seam
- **data-factories.md** — Not needed — deterministic `boardWith` literals + `count`/`countRe` scan helpers reuse (no `@faker-js/faker` — `Board` 4×4 `number|null` primitives suffice)
- **component-tdd.md** — Host unit TDD contract (red-phase `test.skip` scaffolds, one behavioural pin per suite, `BoardConfig` seam fidelity)
- **network-first.md** — Not applicable (no network — pure `Board` + `helpers` host + `rg` static scans)
- **test-quality.md** — Given-When-Then per test, one pin per `it`, determinism via `boardWith` literals + `count`/`countRe`, isolation via `emptyBoard` per test
- **test-healing-patterns.md** — `BoardConfig` + `validateGridSize` + `size - 1 - k` single writer healing hook (CI `rg -n` allowlists pinpoint `BoardConfig` vs `GRID_SIZE` regression)
- **selector-resilience.md / timing-debugging.md** — Not applied directly (no DOM selectors / no `waitFor` — engine seam is sync `resolveGridSize` + `rg` scans)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN project)
- **risk-governance.md / probability-impact.md / test-priorities-matrix.md** — P0/P1/P2 via `test-design-dw-grid-size-configurable.md` Section "Risk Assessment" for 10 risks (3 high `2×3=6` high, 4 medium, 3 low) + NFR planning (reliability determinism+4×4 identity, performance O(1) `<0.01ms`, maintainability single `resolveGridSize` + ledger 0f53c41e)

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-grid-size-configurable.md` Section "Risk Assessment" for the 10 risks (3 high ≥6) and NFR planning that informed P0/P1/P2 levels.

---

## Recommendations

- No further API/E2E automation needed for this grid-size seam — host `node:test` 12 gateway + 12 umbrella + 13 unit + 18 oracle + `game.test 32` + `line.test` + `spawn.test` already gate `BoardConfig` seam `validateGridSize` + `resolveGridSize(null→4)` + `size - 1` candidates/trace + `size OOB` + `SIZE===GRID_SIZE` + ledger `0f53c41e`.
- For broader coverage, run `bmad-testarch-trace` to refresh `traceability-matrix.md` + `coverage-matrix.json` from the 12 ACs (matrix already validated in `test-design`), and `bmad-testarch-test-review` to audit test quality (no `BoardConfig` survivor drift, single `GRID_SIZE` + single `BoardConfig` + single `resolveGridSize` + ledger `0f53c41e` 1 + `sprint-status.yaml` ownership).

