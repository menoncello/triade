---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-spawn-mutation-hygiene.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/board.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/__tests__/engine/spawn-candidates.unit.test.ts'
  - 'triade/__tests__/engine/spawn.test.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/engine/engine.purity.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-engine-spawn-mutation-hygiene — clone boards on spawn and deep-freeze helper snapshots

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-engine-spawn-mutation-hygiene`
**Scope:** Targeted test design for the working-tree delta of `dw-engine-spawn-mutation-hygiene`

> **Delta under assessment:** Commit `53c4f3d sweep dw-engine-spawn-mutation-hygiene: DW-23, DW-70, DW-75, DW-81 via bmad-loop` vs baseline `edfc574` (`spec-engine-spawn-mutation-hygiene.md` `baseline_revision: edfc574`, `final_revision: 9d2e534`). Working-tree `git diff HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` DW-23/70/75/81 `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-spawn-mutation-hygiene` + `resolution-undo: b85f43d1… 2026-09-02 7374617475733a206f70656e`); production delta is `triade/src/engine/core/spawn.ts` + `triade/src/engine/core/game.ts` + `triade/test-utils/helpers.ts` + `triade/__tests__/engine/spawn-candidates.unit.test.ts` + spec `spec-engine-spawn-mutation-hygiene.md`:
> - `triade/src/engine/core/spawn.ts:58-96` — adds `function cloneBoard(board): Board { return board.map(r=>[...r]) }`; `spawnTile` clones at top `const next = cloneBoard(board)` and operates/returns `next` in all 3 branches (omitted-full `board→next`, candidate-empty `board→next`, placing `board[cell]→next[cell]`). Adds hygiene doc comment `DW-23/70/75`. Draw budget preserved: empty/full/pool-empty returns 0 draws, placing returns 1 draw via `pickIndex`.
> - `triade/src/engine/core/game.ts:40-92` — `move()` renames `const newBoard` → `let effectiveBoard = built.board`, computes `moved = !boardsEqual(state.board, effectiveBoard)`, passes `effectiveBoard` to `ceilingDetector`/`spawnTile`, then `effectiveBoard = spawn.board` and `trace.push` on `spawn.cell`, returns `board: effectiveBoard` (was `newBoard` alias-mutated by `spawnTile`). No other line changed; `pendingSpawn` shallow copy ` { ...state.pendingSpawn }` on noop retained; `newGame` unchanged.
> - `triade/test-utils/helpers.ts:22-34` — adds `cloneBoard` + `deepFreezeBoard(board: Board){ for(row of board) Object.freeze(row); return Object.freeze(board) }`; `gameState(board, pendingSpawn)` now `const b = deepFreezeBoard(cloneBoard(board)); return { board: b, pendingSpawn: { ...pendingSpawn } }` (was `{ board, pendingSpawn }` shallow). `emptyBoard/boardWith/staticBoard` remain mutable (setup side), isolation is output-side.
> - `triade/__tests__/engine/spawn-candidates.unit.test.ts:34-172` — two tests gain clone-hygiene assertions: `[P0] omitted candidates: places uniformly…` captures `const before = b.map(r=>r.slice())` + `assert.deepStrictEqual(b, before, input board must not be mutated)` + `assert.strictEqual(res.board[cell],42)` (was `b[cell]`); `[P0] single candidate…` captures `before` + `assert.deepStrictEqual(board, before)` + `assert.strictEqual(res.board[3][3],7)` (was `board[3][3]`). No new test file; statistical uniformity gates unchanged.
> - `triade/src/engine/core/types.ts: GRID_SIZE=4`, `board.ts: emptyBoard/boardsEqual`, `rules.ts: canMerge/mergeValue`, `ceiling.ts/pot.ts/weights.ts/line.ts` byte-identical (`git diff --stat -- triade/src/engine` shows only `spawn.ts` + `game.ts`).
> - Ledger `deferred-work.md` — DW-23, DW-70, DW-75, DW-81 flipped `open→done 2026-09-02` (`status: open` retained as `resolution-undo` hash source `7374617475733a206f70656e` = hex `status: open`).

---

## Executive Summary

**Scope:** Eliminate the shared-mutable board alias that `spawnTile` left behind (`board[cell]=value; return { board, cell, value }` returning the same reference it mutated) and the shallow-ref snapshot that `gameState` kept (`return { board, pendingSpawn }` sharing the caller's `board` rows). Both were latent because `move()` only ever passed a freshly built `boardFromLines` board, so aliases did not leak today — but any future caller that reused an input board (or retained a `GameState` and mutated `result.board`) would silently rewrite history, breaking ADR-06 snapshot isolation.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3
- Critical categories: TECH (clone hygiene / effectiveBoard propagation / freeze breakage), DATA (ADR-06 history isolation, trace-board divergence)

**Coverage Summary:**

- P0 scenarios: 8 groups (host unit, pure `spawnTile` no-mutation + returned clone occupancy + `gameState` row+outer freeze + `move` effectiveBoard pipeline + noop isolation, 0/1 draw budget, OOB candidate ignore)
- P1 scenarios: 6 groups (4-direction `game.move` wall/spawn pipeline + existing `spawn.test.ts`/`game.test.ts`/`line.test.ts`/`engine.purity` green + `tsc` twin gates + draw-budget statistical uniformity)
- P2/P3 scenarios: 6 groups (full-board new-ref identity drift, clone depth, freeze-as-TYPE-assertion, single-cloneBoard site, ledger `resolution-undo` hash)
- **Total effort**: ~3.5–6.5 hours (~0.5–0.9 days; host-only, no device lane — pure TS engine + helper, `npm test` + `npx tsc --noEmit` gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score `shiftLine` wall-compaction + `boardFromLines`/`movementLines` 4×4 guards, `canMerge(1+2→3, >=3 equal)` / `mergeValue` / merge-once cascade, `GRID_SIZE=4`** | `git diff --stat -- triade/src/engine` shows only `spawn.ts` + `game.ts` changed; `types.ts:GRID_SIZE=4` + `rules.ts` + `line.ts` + `board.ts` byte-identical. | `line.test.ts` + `line-moved.unit.test.ts` + `line-compaction.regression.test.ts` + `game.test.ts` wall expectations remain gate (already green after `dw-engine-line-compaction`). |
| **Ceiling/weights/pot/ladder `tierForCeiling` / `potForTier` / `pickCombined` bands `[0.4,0.8,1.0]` / `normalizeTo` / `weightedPicker` NaN guard, `pickIndex` clamp, `previewFor` ambiguous band, `matchScore.applyMove`, `stateFromResult` dedup** | Untouched; sweep only changes board cloning, not distribution math. `weightedValue`/`resolveSpawn`/`pickIndex` are read-only callers here. | Existing `weights.test.ts` + `ceiling.test.ts` + `pot.test.ts` + `adaptive-spawn-integration.test.ts` + `preview-pot-ladder-hygiene` sigma gate remain gate. |
| **Changing `GRID_SIZE`, altering `Board` cell type from `number\|null` to object, introducing async I/O, changing tier/spawn RNG budgets** | Spec Boundaries: `Block If: Would need to change GRID_SIZE, pot/ceiling/weights distribution, or public MoveResult/GameState shape`; `Never: Change spawn distribution or candidate eligibility; add new dependencies`. | This plan pins `GRID_SIZE===4` via `rg -n "GRID_SIZE"` single definition in `types.ts`; Board cell primitives guarantee `board.map(r=>[...r])` sufficiency — any widening triggers a P0 failure (R-004). |
| **Production `Board` short/ragged defensive guard (line-compaction `board[r]?.[c] ?? null` / `lines[i][k]` length guard)** | Belongs to `dw-engine-line-compaction`; production `Board` is always 4×4 via `emptyBoard`/`boardFromLines`. This hygiene's short-input guard is only `cloneBoard` row spread, not line math. | That bundle's design already covers short-board guards; `engine.purity` + `line-compaction.regression` remain gate. |
| **`spawnTile` trust-the-rng `pickIndex` NaN/Infinity→0 / `weightedPicker` NaN degrade** | Explicit `open` deferred DW-71/DW-76, pre-existing and unrelated to clone hygiene; `spawnTile` still delegates to `pickIndex` unchanged. | DW-71/DW-76 stay `open` and are not re-triaged; this plan only verifies `pickIndex` still consumes exactly 1 draw when placing and 0 when full/empty-pool. |
| **RevenueCat / AdMob / IAP / Epic 8.x feel/haptics/punch/shake/bullet/sfx, `App.tsx` swipe threshold, `layout.ts`/`Hud.tsx`, RNGH gesture, `RNGH` wiring** | No feel/render/layout/monetization code touched (`git diff HEAD -- triade/src/feel triade/src/render triade/src/ui triade/App.tsx` empty). | Existing 8.x suites + `ci-gesture-wiring-docs` 19-pass bundle remain gate. |
| **Benchmark / frame-rate `feel.bench.test.ts` both-profile lane** | `spawnTile` clone is O(16) spread (4 rows × 4 cells) + `gameState` clone+freeze O(16) — both per `move()` once; existing `feel.bench` already gates frame budget. | No extra bench lane; host `npm test` `<15 min` + `tsc` twin gates are sufficient (R-009). |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `spawnTile(Board, number, Rng, candidates?)→SpawnResult` is pure with no `expo-*`/`Skia`/`RNGH` dependency; `move(GameState,Direction,Rng)→MoveResult` and `gameState(Board,PendingSpawn)→GameState` are pure with only `GRID_SIZE` + `emptyBoard`/`cloneBoard`. Every path is host-testable via `node --import tsx --test` with `boardWith([...])`/`emptyBoard` fixtures + `rngOf(0|0.5|1)` + `spyRng(...values).calls` 0/1 draw budget and `Object.isFrozen` inspection. No mocking or env seeding required.

**Observability — Good.** Outputs are deterministic primitives: `res.board` 4×4 occupancy, `res.board !== input` reference inequality, `res.cell`/`res.value` nullability, `spy.call.length` 0 vs 1, `Object.isFrozen(res.board)` outer + `res.board.every(r=>Object.isFrozen(r))` row, `deepEqual(b, before)` input unchanged. `move` pipeline is observable as `result.board` occupancy vs `trace.find(e=>e.spawned).to`, `result.board !== state.board` ref inequality, `result.pendingSpawn !== state.pendingSpawn` shallow-copy ref inequality.

**Reliability — Strong (engine never throws, helpers never throw).** `cloneBoard` is `board.map(r=>[...r])` — bounds-checked by `GRID_SIZE` loops in callers, not by clone itself; `deepFreezeBoard` freezes rows then outer, never throws on `null` entries (primitives). Both `tsc` gates (`tsconfig.json` + `tsconfig.test.json`) clean; `npm --prefix triade test` full gate `<15 min` (882 pass / 11 expected-RED `feel` ATDD / 98 skipped per `npm test 2026-09-02`).

**Testability Risks:** Two surfaces are thin: (a) clone hygiene has 3 return branches — a future edit that clones only the placing branch but forgets the `empty→next` early returns would reintroduce alias on full/empty-pool; mitigated by P0 full-pool 0-draw clone-neq-input pin (R-002). (b) `gameState` freeze is intentional strict-mode throw on assignment — a future caller that wrote `state.board[0][0]=999` in setup would see `TypeError` not silent pass; mitigated by freeze-throw pin + `gameState` doc that setup helpers (`boardWith` etc.) stay mutable, only the returned snapshot is frozen (R-003).

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **`move()` effectiveBoard propagation drift — `spawnTile` clone hygiene requires `let effectiveBoard` to carry `spawn.board`.** Before fix `move()` did `const newBoard = built.board` then `spawnTile(newBoard,…)` mutating it and `return { board: newBoard,… }` — the mutation was the propagation. Now `spawnTile` returns `next` and `effectiveBoard = spawn.board` is the only link. A future edit that reverted to `const newBoard` + `spawnTile(newBoard,…)` without assigning would silently drop the spawn tile: `result.board` would lack the new value, `trace.spawned` would point to a cell that is still `null` on the returned board, and `board occupancy` would be off by 1. Blast radius on every effective move (100% of turns). | 2 | 3 | **6** | Enforce single propagation site: (a) **grep pin** `rg -n "let effectiveBoard" triade/src/engine/core/game.ts` ==1 && `rg -n "effectiveBoard = spawn\.board" triade/src/engine/core/game.ts` ==1 && `rg -n "return \{ board: effectiveBoard" triade/src/engine/core/game.ts` ==1 — no `return newBoard` survivor; (b) **host P0 pipeline pin** `move(state,'left',rngOf(0,0,0))` on a single-tile board asserts `result.board[ candidate ] === state.pendingSpawn.value` && `result.board !== state.board` && prior `state.board` deepEqual after `result.board[0][0]=999` (ADR-06 history isolation) — see P0 group G-07; (c) **trace-board congruence** `resultingTiles(plan) ≈ occupiedCells(result.board)` via `assertNoLeak` in `game.test.ts` already green — spawn divergence would break it. | FE lead | Immediate (gate this sweep; protects DW-75 hygiene) |
| R-002 | TECH | **`spawnTile` clone hygiene incomplete — input mutation on one branch or missing new ref.** `spawnTile` now has 3 exits: omitted-full `empty.length===0` → `next`, candidate-empty `pool.length===0` → `next`, placing → `next[cell]=value`. Risk: a future edit clones only the placing branch (where mutation is visible) and forgets the two early returns, reintroducing `return { board, cell:null,… }` same-ref on full/empty-pool. Then a caller that does `const before=board.slice(); spawnTile(board,…); assert(before≠board)` would silently alias, and a harness that drives 3-move sessions reusing a `boardWith` fixture would see the fixture board overwritten on the 2nd spawn when the pool is filtered empty (engine-never-throws branch). Current host suites would go green-hiding because most tests drive the placing branch. | 2 | 3 | **6** | Enforce clone in all branches: (a) **host P0 pins** `full board → board!==res.board && cell=null && 0 draws` + `empty candidates [] → board!==res.board && cell=null && 0 draws` + `all candidates occupied → board!==res.board && 0 draws` — see P0 groups G-02/G-04/G-05; (b) **clone-hygiene pins** `before=b.map(r=>r.slice()); spawnTile(b,42,spy)→ deepEqual(b,before)` + `res.board!==b` already landed in `spawn-candidates.unit.test.ts:34-38` + `165-172` — keep as P0; (c) **static guard** `rg -n "cloneBoard" triade/src/engine/core/spawn.ts` ==1 def + 1 usage + `rg -n "const next = cloneBoard" triade/src/engine/core/spawn.ts` ==1 && `rg -n "return \{ board: next" triade/src/engine/core/spawn.ts` ==3 (all exits return `next`); any `return { board,` without `next` is a regression. | FE lead | Immediate (gate this sweep; protects DW-23/70) |
| R-003 | TECH | **`gameState` deep-freeze breakage — rows+outer freeze throws in strict modules.** `gameState` now does `for(row of board) Object.freeze(row); Object.freeze(board)`; `triade/test-utils/helpers.ts` and all `__tests__/engine/*.test.ts` run as ESM (`"type":"module"` + `node --import tsx`), where assignment to a frozen index throws `TypeError` instead of silent fail. A future test that did `const s=gameState(boardWith([...])); s.board[0][0]=999` in setup would now crash the suite rather than pass (intentional hygiene, flagged as low in sweep review). More subtly, a helper that did `boardWith([...])` then `s.board = otherBoard` after `gameState` is now also thrown. This is the intended hygiene, but it is a distribution-wide contract change (every suite that imports `gameState` is affected). | 2 | 3 | **6** | Make freeze observable and documented: (a) **host P0 pin** `Object.isFrozen(gameState(board).board) && gameState(board).board.every(r=>Object.isFrozen(r))` plus `assert.throws(()=>{ gameState(board).board[0][0]=999 }, TypeError)` already in spec Verification manual probe — promote to a host unit `freeze-throw` suite (or keep as probe) so future `tsconfig` strict toggle cannot regress; (b) **isolation pins** `b=boardWith([[1,2,null,null],…]); s=gameState(b); b[0][0]=999; assert(s.board[0][0]===1)` && `s2=gameState(b); s2.board[0][0]=999` does not affect `s.board` (history isolation) — P0 group G-06; (c) **doc guard** — keep `emptyBoard/boardWith/staticBoard` mutable for *setup* and `gameState` frozen for *snapshot* (helpers.ts comment); `rg -n "deepFreezeBoard" triade/test-utils/helpers.ts` ==1 def + 1 usage + `rg -n "cloneBoard\(board\)" triade/test-utils/helpers.ts` ==1. | FE lead | Immediate (gate this sweep; protects DW-81) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Clone depth `board.map(r=>[...r])` is sufficient today but assumes `Cell = number\|null` primitives.** If `Board` ever widens to `Cell = { v:number, id:string }` object, row spread copies row array but shares cell object refs — mutating `res.board[0][0].v` would alias input. Current `types.ts: Cell = number\|null` + `board.ts: emptyBoard` row of `null` so shallow row copy is exactly the right depth; a type widening without test would green-hide. | 2 | 2 | 4 | Pin cell-type assumption: (a) **static pin** `rg -n "export type Cell" triade/src/engine/core/types.ts` → `number \| null` literal (no object); (b) **host smoke** deepEqual clone test — if Cell widens, `board.map(r=>[...r])` clone pin `assert.notStrictEqual(res.board, board) && assert.notStrictEqual(res.board[0], board[0])` still passes but `b[0][0] object` alias would not be caught — add `Cell` type guard in review checklist. Keep as P2 gate. |
| R-005 | DATA | **Full-board new-ref identity drift — legacy `spawnTile` returned same `board` ref on full board (`if(empty.length===0) return { board, cell:null… }` same ref), now returns `next` clone ≠ input.** Any caller that did `if(res.board===board) /* noop */` identity check for no-op detection would now mis-detect (branch flip). Production `move()` uses `!boardsEqual(state.board, effectiveBoard)` + `moved` flag + no identity check, so this is latent; but a helper or smoke harness could use identity. Also `boardWith` fixtures that `assert.strictEqual(res.board, board)` on full board would now fail (correctly). | 1 | 3 | 3 | Pin intentional divergence: (a) **host P0** `full board → res.board !== board` + `empty candidates [] → res.board !== board` (new contract) — P0 G-02 pins this; (b) **grep guard** `rg -n "board ===" triade/src/engine` ==0 identity checks on board refs (no caller relies on identity); (c) sweep review low #2 already documented this as intentional — keep as INFO. |
| R-006 | TECH | **Single `cloneBoard` definition per module, no duplicate `GRID_SIZE` literal.** `spawn.ts` and `helpers.ts` each define local `cloneBoard(board){ return board.map(r=>[...r]) }` — two sites, not one. A future edit that inlines one and changes spread to `structuredClone` or `JSON.parse(JSON.stringify(board))` could diverge on frozen-board handling (structuredClone throws on frozen). Single-site invariant is not literally 1 across files, but per-module 1 is expected. | 1 | 3 | 3 | Pin per-module single site: (a) **grep** `rg -n "function cloneBoard" triade/src/engine/core/spawn.ts` ==1 && `rg -n "function cloneBoard" triade/test-utils/helpers.ts` ==1 — no second literal `\.map\(r=>\[` spawn-helper outside those; (b) **no `structuredClone`/`JSON\.parse`** for boards: `rg -n "structuredClone|JSON\.parse.*board" triade/src/engine triade/test-utils` ==0. |
| R-007 | DATA | **Trace vs board occupancy divergence after hygiene — `trace.spawned` cell must equal `result.board[cell]` value.** `move()` pushes `{ value: spawn.value, to: spawn.cell, from:[], spawned:true }` only when `spawn.cell && spawn.value!==null`; `effectiveBoard` is the `spawn.board` that already carries that value. A stale `trace.push` that used `newBoard` coordinates but `effectiveBoard` value could double-write or miss by 1. | 1 | 3 | 3 | Pin trace-board congruence: (a) host `game.test.ts: trace:` suites `merged tile records both sources, spawn flagged, trace wall merge` + `assertNoLeak(plan, result.board)` via `resultingTiles(plan)` equals `occupiedCells(result.board)` already green — keep as P1; (b) **grep** `rg -n "spawn\.cell && spawn\.value" triade/src/engine/core/game.ts` ==1 (spawn flag gate) && `rg -n "trace\.push" triade/src/engine/core/game.ts` ==1. |
| R-008 | OPS | **Deferred-ledger `resolution-undo` hash coupling + `sprint-status.yaml` ownership.** Sweep marks DW-23/70/75/81 `done` with `resolution-undo: b85f43d1… 7374617475733a206f70656e` (hex of `status: open`); `sprint-status.yaml` is orchestrator-owned and must not be written or reverted by this workflow. | 1 | 2 | 2 | Ledger `resolution-undo: b85f43d1a077f8ad7f8d33c07155f5e3ae81c44b4b974f1cfcc598d8b869d26e 2026-09-02 7374617475733a206f70656e` per entry already recorded; any reopen must keep the hash. `git diff --stat` gate shows `deferred-work.md` but not `sprint-status.yaml`. This plan never writes the latter. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | PERF | **Clone+freeze cost per `move()` — `board.map(r=>[...r])` (4×4 spread, 16 cells) + `Object.freeze` 5 objects per `gameState` call.** Per effective move one `spawnTile` clone (16 cells) + optionally one `gameState` clone+freeze if harness wraps result. At 60 FPS worst 60 * 32 cell copies = 1920 primitives — negligible vs frame budget `<8ms` (guarded by `feel.bench` both-profile sweep). Production `move()` itself is the only clone today; no render-loop clone. | 1 | 1 | 1 | Monitor — `npm test` full gate `<15 min` is sufficient; no extra bench lane. Existing `engine.smoke` + `feel.bench.test.ts` both-profile gate frame budget. |
| R-010 | TECH | **Spec `final_revision: 9d2e534` hash vs `HEAD 53c4f3d` commit hash literal drift — spec `final_revision` is a commit hash literal; a follow-on commit would make it stale.** Bundle spec is intentionally `status: done` with `followup_review_recommended: false`; stale hash is doc-only. | 1 | 1 | 1 | Monitor — doc pin only; `deferred-work.md` DW-23/70/75/81 `resolution-undo` hash is the revert trail, not `final_revision`. |

### Risk Category Legend

- **TECH**: Technical/Architecture (clone hygiene, effectiveBoard propagation, freeze breakage, Board cell-type assumption, GRID_SIZE invariant)
- **SEC**: Security — none this sweep (pure engine math, no auth/data exposure; `board.map(r=>[...r])` is layout math, not security boundary)
- **PERF**: Performance — clone+freeze O(16) per spawn/move (R-009); no async/worklet lane
- **DATA**: Data Integrity — ADR-06 history isolation via freeze + trace-board occupancy congruence, full-board identity drift (R-005/R-007)
- **BUS**: Business Impact — none directly (hygiene-only, no merge/score/ceiling distribution change); player-visible gaps belong to line-compaction bundle
- **OPS**: Operations (deferred ledger `resolution-undo`, `sprint-status.yaml` ownership, tsc gates)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability | Engine never throws (all draw paths, full/empty pool, OOB candidates, frozen row assignment must degrade or throw only as intended hygiene) | R-002, R-003 | Host unit: `spawnTile` clone branches 0-draw no-throw + `pickIndex` NaN degrade + `gameState` freeze-throw pin | `npm --prefix triade test` pass 882/11-expected-RED + `node -e` freeze probe `Object.isFrozen(gameState(board).board) && row frozen && throws on assignment` |
| Reliability | ADR-06 snapshot history isolation holds (mutating `result.board` or input after `move`/`gameState` never rewrites prior history) | R-001, R-003 | Host unit: input-not-mutated deepEqual + `result.board !== input` + `gameState(input) !== input && isFrozen` + prior snapshot deepEqual after mutating result | `spawn-candidates.unit.test.ts: clone-hygiene` asserts + P0 G-06/G-07 pins |
| Maintainability | Single clone site per module, no `structuredClone`/`JSON` board copy, no duplicate `GRID_SIZE` change, no new deps | R-004, R-006 | Static scan: `rg -n "cloneBoard"` 2 defs + 2 uses, `rg -n "structuredClone\|JSON\.parse.*board"` 0, `rg -n "GRID_SIZE"` single def in `types.ts` | `rg` counts + `npm run tsc --noEmit` (no new dep) |
| Performance | Clone+freeze O(16) per effective move / per helper snapshot, invisible to frame budget | R-009 | Host timing: `npm --prefix triade test` `<15 min` + existing `feel.bench.test.ts` both-profile median `<0.05ms` tick | `npm test` timing + `feel.bench` report (already gating frame budget) |
| Security | No new attack surface (pure TS clone/freeze, no IO, no auth) | - | Static: `engine.purity` + `helpers` no RN/Expo import scan | `engine.purity.test.ts` 4 pass |
| Offline | No new network/ persistence dep (in-memory Board only) | - | Static: `git diff --stat` no `src/persistence`/`src/services` touch | `git diff --stat` empty outside `triade/src/engine` + `triade/test-utils` |

**Unknown thresholds:** None — every threshold is a pin (never-throw, ref inequality, isFrozen, tsc clean, draw counts). No value guessed.

---

## Entry Criteria

- [ ] `spec-engine-spawn-mutation-hygiene.md` intent/boundaries/I-O matrix frozen (8 rows) + Code Map read against `triade/src/engine/core/spawn.ts:58-96` + `game.ts:40-92` + `helpers.ts:22-34`
- [ ] `triade/src/engine/core/types.ts: GRID_SIZE=4` + `Board = Cell[][]` (`number\|null`) confirmed as clone-depth assumption
- [ ] Working-tree delta vs `HEAD 53c4f3d` inspected (`git diff --stat` shows `triade/src/engine/core/spawn.ts triade/src/engine/core/game.ts triade/test-utils/helpers.ts triade/__tests__/engine/spawn-candidates.unit.test.ts`) + ledger `deferred-work.md` DW-23/70/75/81 `status: done` with `resolution-undo` hash
- [ ] Toolchain ready: `node --import tsx` + `npm --prefix triade test` (host) + `npx tsc --noEmit` + `npx tsc -p triade/tsconfig.test.json --noEmit` (twin gates) + `rg` static scans

## Exit Criteria

- [ ] All P0 tests passing (`spawnTile` clone hygiene + `gameState` freeze + `move` effectiveBoard pipeline — P0 groups G-01..G-08 green)
- [ ] All P1 tests passing or triaged (`game.move` 4-dir wall/spawn + existing `spawn.test.ts`/`game.test.ts`/`engine.purity` 182 pass + `tsc` twin clean)
- [ ] No open high-priority / high-severity bugs (R-001/R-002/R-003 mitigated or waived with owner + timeline)
- [ ] Test coverage agreed as sufficient (P0 100% branches — 3 `spawnTile` exits + `gameState` freeze + `move` effectiveBoard; P1 ≥95%)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (isFrozen + ref-inequality + tsc + 882-pass host gate)
- [ ] Ledger `deferred-work.md` DW-23/70/75/81 `resolution-undo: b85f43d1… 7374617475733a206f70656e` preserved (reopen keeps hash); `sprint-status.yaml` untouched

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE lead / TEA | Owns P0 clone/freeze/effectiveBoard pins, `npm test` + `tsc` gates, `rg` hygiene scans, this test design |
| Murat (TEA) | Test Architect | Risk scoring review, quality gate sign-off |

---

## Test Coverage Plan

> **Note:** `P0/P1/P2/P3` = **priority/risk**, NOT execution timing. Execution timing is defined in the Execution Strategy section below.

### P0 (Critical) - Host unit, pure engine clone/freeze + effectiveBoard + 0/1 draw budget

**Criteria**: Blocks core hygiene (ADR-06 history isolation) + High risk (≥6) + No workaround (clone is the only propagation site)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| G-01 `spawnTile` clones (no input mutation) — board with empties `rng 0` → `input deepEqual before && res.board !== input && res.board[cell]===value && res.cell!==null && spy.calls===1` | Unit | R-002 | 2 | FE | `spawn-candidates.unit.test.ts:13-49` 4000-draw uniformity loop already captures `before = b.map(r=>r.slice())` + `deepEqual(b,before)` + `res.board[cell]===42` (was `b[cell]`). Promote same loop to explicit `res.board !== b` + `res.board[0] !== b[0]` row ref inequality (row spread). |
| G-02 `spawnTile` full board — `full 4×4` → `res.board !== input clone && cell:null && value:null && 0 draws` | Unit | R-002, R-005 | 1 | FE | `spawn-candidates.unit.test.ts:52-66` `spyRng(0.5) → calls 0 && cell null && board[0][0]===1` — add `assert.notStrictEqual(res.board, board)` + `assert.notStrictEqual(res.board[0], board[0])` (new-ref identity divergence pin). |
| G-03 `spawnTile` with candidates pool — `empties 4 but candidates 5 (2 occupied filtered) → pool 3 uniform 1 draw && input not mutated && res.board !== input` | Unit | R-002 | 2 | FE | `spawn-candidates.unit.test.ts:68-123` 6000-draw uniformity + `expectedPool 3` + `res.cell in pool` + `assert.notDeepStrictEqual(res.cell,[0,1])`. Add `before` deepEqual + `res.board !== b` clone pin (same as G-01). |
| G-04 `spawnTile` empty candidate pool `candidates=[]` → `res.board clone !== input && nulls && 0 draws && no mutation (empty pool is engine-never-throws guard, `move()` assumes non-empty but `spawnTile` guards)` | Unit | R-002 | 1 | FE | `spawn-candidates.unit.test.ts:146-158` `spy 0 draws && cell null` — add `notStrictEqual(res.board, board)` + `deepEqual(board, snapshot)` clone pin. |
| G-05 `spawnTile` provided but all candidates occupied + OOB candidates ignored `candidates ([-1,0],[0,0] occupied)` → `pool empty → res.board !== input && nulls && 0 draws; OOB silently filtered only in-bounds empties eligible` | Unit | R-002 | 2 | FE | `spawn-candidates.unit.test.ts:125-144` `occupied pool → 0 draws && nulls` + `221-232` `full board unchanged on empty pool` — add OOB row `spawnTile(board,42,rngOf(0),[[-1,0],[0,1]])` where only `[0,1]` empty is eligible → `res.cell===[0,1] && res.board !== board`. |
| G-06 `gameState` snapshot freeze — `board=boardWith([...]) → gameState(board)` → `returned board deepEqual but !== input && Object.isFrozen(board) && row frozen && mutating copy does not affect stored && input mutation after does not affect stored; mutating stored throws TypeError in strict ESM` | Unit | R-003 | 2 | FE | `helpers.ts:32` `deepFreezeBoard(cloneBoard(board))`. Host: `const b=boardWith([[1,2,null,null],[],[],[]]); const s=gameState(b); assert(Object.isFrozen(s.board)&&s.board.every(r=>Object.isFrozen(r))); assert(s.board!==b); b[0][0]=999; assert(s.board[0][0]===1); assert.throws(()=>{ s.board[0][0]=999 })`. |
| G-07 `move` propagates cloned spawn board — `effective left move with spawn candidates → result.board contains spawned value at candidate && result.board !== input board ref && prior GameState board unchanged after mutating result.board && trace.spawned.to === candidate` | Unit (game pipeline) | R-001, R-007 | 2 | FE | From spec I-O: `left move on [[1, null…],[…]]` → `effectiveBoard = spawn.board`. Host: `state=gameState(boardWith([[null,2,null,null],…])); res=move(state,'left',rngOf(0,0,0)); assert(state.board[0][3]===null && res.board[0][3]===state.pendingSpawn.value); assert(res.board!==state.board); res.board[0][3]=999; assert(state.board[0][3]===null)` + `res.trace.find(e=>e.spawned).to in oppositeEdgeCandidates(state.board,'left')`. |
| G-08 `move` noop isolation — `fullNoopBoard move left → result.board deepEqual input && result.pendingSpawn !== input pendingSpawn (shallow copy) && 0 draws && result.board is frozen? No — move returns mutable effectiveBoard (not frozen); gameState freeze is helper-only` | Unit (game pipeline) | R-001 | 1 | FE | Spec I-O: `fullNoopBoard move left → deepEqual input, pendingSpawn copy !== input ref, 0 draws`. Host: `spyRng()` draws 0 + `assert.deepStrictEqual(res.board, state.board)` + `assert.notStrictEqual(res.pendingSpawn, state.pendingSpawn)` + `assert(res.moved===false && res.score===0)`. |

**Total P0**: 13 tests (8 groups), ~1.5–2.5 hours (host-only, pure TS, each `<5ms` except uniformity loops `4000/6000` draws ≈ `80ms` total)

### P1 (High) - Game/move directional pipeline + existing 182 pass + tsc twin gates + draw-budget uniformity

**Criteria**: Important hygiene propagation + Medium risk (3-4) + Common workflows (every `move()` call)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| P1-01 `game.move` 4-direction wall+spawn pipeline (left/right/up/down) with `staticBoard`/`emptyBoard` wall compaction still correct after hygiene | Unit (game pipeline) | R-001, R-007 | 4 | FE | `game.test.ts` directional suites `left/right/up/down` each `staticBoard`/`emptyBoard` remain green — effectiveBoard hygiene must not change wall coordinates (already `line-compaction` wall pins, but re-run as gate). Pin: `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass. |
| P1-02 `transitionPlan` slide coordinates wall-compacted `to [0,0]/[0,3]/[3,1]` + `assertNoLeak(plan, result.board)` occupancy congruence | Unit | R-007 | 2 | FE | `transitionPlan.test.ts` 3 slide expects `to [0,0] / [0,3] / [3,1]` already patched for wall; `assertNoLeak` via `resultingTiles(plan)` vs `occupiedCells(result.board)` pins trace-board occupancy after clone (spawn divergence would break). |
| P1-03 Draw-budget preservation — `spawnTile` placing 1 draw vs full/empty-pool 0 draws; `move` effective 3 draws vs noop 0; `newGame` 20 draws | Unit | R-002 | 2 | FE | `spawn-candidates.unit.test.ts` 5 `spy.calls===1` vs 3 `spy.calls===0` + `game.test.ts` `AC4 effective move 3 draws` + `newGame 20 draws` suites remain green — clone must not call `rng`. |
| P1-04 `engine.purity` ADR-01/05 — `triade/src/engine/core/spawn.ts` + `game.ts` import nothing from RN/React/Skia/Expo, relative imports only | Unit | R-006 | 1 | DEV | `engine.purity.test.ts` 4 pass — scan `FORBIDDEN_PREFIXES` on `src/engine + src/game + helpers` — hygiene adds no new specifier. Run as `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts`. |
| P1-05 Twin `tsc` gates — `npx tsc --noEmit` + `npx tsc -p triade/tsconfig.test.json --noEmit` both clean | Unit (static) | R-003 | 2 | FE | `helpers.ts` `Object.freeze` + `Board` cast `as Board` must satisfy `Cell = number\|null` narrowing; `triade/tsconfig.test.json` has `ignoreDeprecations: "6.0"` for RN stub — both gates must stay clean after freeze. |
| P1-06 Statistical uniformity still 40/40-like among empties/candidates (place-not-roll invariant) after clone | Unit | R-002 | 1 | FE | `spawn-candidates.unit.test.ts` 2 uniformity gates (4 empties 4000 draws, pool 3 6000 draws) within `5σ` remain green — clone must not bias `pickIndex` ordering. |

**Total P1**: 12 tests, ~1.5–3.0 hours (host-only)

### P2 (Medium) - Static hygiene guards + legacy identity drift + helper mutability

**Criteria**: Secondary hygiene invariants + Low/Medium risk (1-4) + Edge cases (frozen strict throw, OOB candidate, clone depth)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| P2-01 Static single-site `cloneBoard` + `deepFreezeBoard` + no `structuredClone`/`JSON` board copy | Unit (static scan) | R-004, R-006 | 1 | DEV | `rg -n "function cloneBoard" triade/src/engine/core/spawn.ts` ==1 + `rg -n "function cloneBoard|function deepFreezeBoard" triade/test-utils/helpers.ts` ==2 + `rg -n "structuredClone\|JSON\.parse.*board" triade/src/engine triade/test-utils` ==0. Pinned in this plan, not a `npm test` suite. |
| P2-02 Legacy identity `fullBoard → new ref !== input` pinned intentionally (divergence from same-ref legacy) | Unit | R-005 | 1 | FE | Documents that `res.board !== board` on `empty.length===0` and `pool.length===0` is correct — not a bug. Kept in P0 G-02 already; this is the doc+grep companion `rg -n "board ===" triade/src/engine` ==0. |
| P2-03 Row-freeze completeness — `gameState(board).board[0]` frozen, not just outer | Unit (probe) | R-003 | 1 | FE | Manual probe in spec Verification already does `Object.isFrozen(s.board) && s.board[0]` row; promote to one-liner `node --loader tsx -e "…"` gate in CI script or keep as P2 note. |
| P2-04 No `GRID_SIZE` literal drift — `types.ts` single definition, `spawn.ts` loops over `GRID_SIZE` not hardcoded `4` | Unit (static scan) | R-004 | 1 | DEV | `rg -n "GRID_SIZE" triade/src/engine/core/spawn.ts` ==3 (full board + OOB guard `r<GRID_SIZE && c<GRID_SIZE`) + `rg -n "export const GRID_SIZE = 4" triade/src/engine/core/types.ts` ==1 — no `4` literal for board dims. |

**Total P2**: 4 checks, ~0.3–0.6 hours

### P3 (Low) - Exploratory / degenerate + clipping

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| P3-01 Degenerate `move()` 200-move `runSeededSession` with `gameState` frozen snapshots via `stateFromResult` — no alias leak across 200 effective moves | Unit | 1 | DEV | `helpers.ts: runSeededSession` drives `state = stateFromResult(res)` 200 moves (seeded `mulberry32`) — with frozen `gameState` history each `state.board[0][0]=999` after would not corrupt prior snapshot. Deferred DW-81 harness already drives this; hygiene must not break it (already 882 pass). |
| P3-02 Performance exploratory — `spawnTile` clone + `gameState` freeze per move not regressing `feel.bench.test.ts` both-profile median `<0.05ms` | Unit (bench) | 1 | DEV | `triade/__tests__/feel/bench.test.ts` both-profile lane; clone O(16) is noise vs 16-frame animation budget. No new bench file needed; existing median is the gate. |

**Total P3**: 2 tests, ~0.2–0.4 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch hygiene break before deep suites

- [ ] `gameState` deep-freeze probe `Object.isFrozen(board) && row frozen && throws on assignment` (probe in spec Verification) (10s)
- [ ] `spawnTile` input-not-mutated probe `before=b.slice(); spawnTile(b,42,rngOf(0)); deepEqual(b,before)` (10s)
- [ ] `move` effectiveBoard propagation probe `res.board !== state.board && res.board[oppCell]===pending` (15s)

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical hygiene validation — clone ref inequality, freeze outer+rows, effectiveBoard occupancy, 0/1 draw budget

- [ ] G-01 omitted candidates uniformity + clone hygiene (4000 draws, `before` deepEqual, `res.board[cell]===42`) (Unit)
- [ ] G-02 full board `res.board !== input && cell null && 0 draws` (Unit)
- [ ] G-03 candidates pool filtered uniformity + clone hygiene (6000 draws) (Unit)
- [ ] G-04 empty `candidates=[]` clone `!== input && 0 draws` (Unit)
- [ ] G-05 all occupied + OOB filtered pool-empty clone (Unit)
- [ ] G-06 `gameState` row+outer frozen + input isolation + throws (Unit)
- [ ] G-07 `move` effectiveBoard occupancy + `!== input` + prior history unchanged (Unit)
- [ ] G-08 `move` noop shallow `pendingSpawn` copy + `moved false && 0 draws` (Unit)

**Total**: 8 groups / 13 tests

### P1 Tests (<30 min)

**Purpose**: Important pipeline coverage — 4-dir wall/spawn, transitionPlan `assertNoLeak`, draw-budget 20/3/0, `tsc` twin, 182 pass

- [ ] 4-direction `game.move` wall+spawn suites (Unit)
- [ ] `transitionPlan` `to [0,0]/[0,3]/[3,1]` + `assertNoLeak` (Unit)
- [ ] Draw-budget `spawnTile 1 vs 0` + `move effective 3 vs noop 0` + `newGame 20` (Unit)
- [ ] `engine.purity` 4 pass + twin `tsc` clean (Unit/static)

**Total**: 6 groups / 12 tests

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage — static scans, helper mutability, ledger preservation

- [ ] Single-site `cloneBoard/deepFreezeBoard` + no `structuredClone` (static)
- [ ] Legacy identity `full→new ref` doc pin (static)
- [ ] Row-freeze completeness probe (Unit)
- [ ] No `GRID_SIZE` drift (static)
- [ ] 200-move `runSeededSession` alias sweep + bench median (Unit)

**Total**: 6 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 13 | 0.15–0.2 | ~2.0–2.6 | Small pure helpers + `spyRng` + `Object.isFrozen`; uniformity loops already landed |
| P1 | 12 | 0.1–0.2 | ~1.0–2.4 | Existing suites (`game.test.ts` 32 pass, `transitionPlan`, `twin tsc`, purity) — gate only |
| P2 | 4 | 0.08–0.15 | ~0.3–0.6 | Static `rg` scans + one-liner probes |
| P3 | 2 | 0.1–0.2 | ~0.2–0.4 | 200-move harness + bench median (existing) |
| **Total** | **31** | **-** | **~3.5–6.5** | **~0.5–0.9 days host-only; no device lane — `npm test` + `tsc` `<15 min` gate** |

### Prerequisites

**Test Data:**

- `boardWith([...])` 4×4 matrix factory + `emptyBoard()` + `staticBoard(row)` (helpers mutable setup) + `gameState(board, pendingSpawn)` frozen snapshot — factories already in `triade/test-utils/helpers.ts`
- `rngOf(...values)` + `spyRng(...values).calls` scripted draw budget (1 vs 0 draws) + `mulberry32(seed)` for 4k/6k uniformity loops

**Tooling:**

- `node --import tsx --test` (host, `triade` `type:module`, no Metro)
- `npx tsc --noEmit` + `npx tsc -p triade/tsconfig.test.json --noEmit` (twin gates)
- `rg` (ripgrep) static scan for single-site `cloneBoard` / no `structuredClone` / `GRID_SIZE` pin

**Environment:**

- `triade/package.json` `test` script `node --import tsx --test` (benchmarks excluded via glob `__tests__` only)
- `triade/tsconfig.test.json` `ignoreDeprecations: "6.0"` (RN stub `useWindowDimensions` waiver)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — 8 groups / 13 tests green; any `b !== res.board` or `isFrozen` failure blocks merge)
- **P1 pass rate**: ≥95% (waivers required for `transitionPlan` coordinate flake or `tsc` incremental error)
- **P2/P3 pass rate**: ≥90% (informational — `rg` scans are doc pins, not suite blockers)
- **High-risk mitigations**: 100% complete or approved waivers for R-001/R-002/R-003 before `done` ledger flip

### Coverage Targets

- **Critical paths**: ≥80% (`spawnTile` 3 exits + `move` moved/noop + `gameState` freeze)
- **Security scenarios**: 100% (not applicable — no auth boundary; `board[r]?.[c]` guard belongs to line-compaction bundle)
- **Business logic**: ≥70% (hygiene-only, no merge/score/ceiling distribution re-derived)
- **Edge cases**: ≥50% (OOB candidate, empty pool, full board, frozen strict throw)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`res.board !== input`, input deepEqual `before`, row+outer frozen, `effectiveBoard` occupancy, `spy.calls` 0 vs 1)
- [ ] No high-risk (≥6) items unmitigated (R-001 effectiveBoard propagation, R-002 clone-all-branches, R-003 row+outer freeze all gated)
- [ ] Security tests (SEC category) pass 100% (none this sweep; `engine.purity` 4 pass is the only SEC-adjacent gate)
- [ ] Performance targets met (PERF negligible — clone O(16) per spawn/move, no new bench lane, `npm test` `<15 min` is gate)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (isFrozen row+outer + ref-inequality + twin `tsc` clean + 882-pass host gate already collected)

---

## Mitigation Plans

### R-001: `move()` effectiveBoard propagation drift — stale `newBoard` alias drops spawn (Score: 6)

**Mitigation Strategy:**
1. Keep `let effectiveBoard = built.board` + `effectiveBoard = spawn.board` + `return { board: effectiveBoard,… }` as the single propagation path — no `const newBoard` survivor. Add comment `// Hygiene (DW-75): spawnTile clones — propagate spawn.board` (already in `game.ts:73`).
2. Add host P0 pipeline pin `res.board[ candidate ] === pending && res.board !== state.board && prior state.board deepEqual after mutating res.board` (G-07) — any revert to `newBoard` fails the `!==` + occupancy asserts.
3. Keep `assertNoLeak(plan, result.board)` in `game.test.ts` — spawn cell missing from `result.board` breaks `resultingTiles(plan)` vs `occupiedCells(result.board)` congruence.
**Owner:** FE lead
**Timeline:** Gate this sweep (`2026-09-02`)
**Status:** Planned → Complete (code landed `53c4f3d`, pins in P0 G-07)
**Verification:** `rg -n "let effectiveBoard" triade/src/engine/core/game.ts` ==1 && `rg -n "effectiveBoard = spawn\.board" triade/src/engine/core/game.ts` ==1 && `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass + `__tests__/engine/spawn-candidates.unit.test.ts` 13 P0 pass

### R-002: `spawnTile` clone hygiene incomplete — one branch forgets `next` and reintroduces alias (Score: 6)

**Mitigation Strategy:**
1. Clone at top `const next = cloneBoard(board)` then return `next` in all 3 exits — do not touch `board[r][c]` after clone. Keep `cloneBoard(board){ return board.map(r=>[...r]) }` as the only board-copy helper in `spawn.ts`.
2. Add explicit `res.board !== board && res.board[0] !== board[0]` clone ref pins on full, empty-pool, and OOB-filtered pool-empty (G-02/G-04/G-05) plus `deepEqual(board, before)` input-not-mutated on placing branches (G-01/G-03) — already `spawn-candidates.unit.test.ts:34-38,165-172`.
3. Static guard: `rg -n "return \{ board: next" triade/src/engine/core/spawn.ts` must be 3 (not 0, not 1) — any `return { board,` without `next` is a regression.
**Owner:** FE lead
**Timeline:** Gate this sweep (`2026-09-02`)
**Status:** Planned → Complete (code landed `53c4f3d`, pins in P0 G-01..G-05)
**Verification:** `rg -n "const next = cloneBoard" triade/src/engine/core/spawn.ts` ==1 && `rg -n "return \{ board: next" triade/src/engine/core/spawn.ts` ==3 && `npm --prefix triade test -- __tests__/engine/spawn-candidates.unit.test.ts` 10 P0 pass including 2 clone-hygiene loops

### R-003: `gameState` deep-freeze breakage — rows+outer freeze throws in strict ESM setup (Score: 6)

**Mitigation Strategy:**
1. Keep `gameState` as the only freezing site (`helpers.ts:32`), document that `emptyBoard/boardWith/staticBoard` stay mutable for setup and only the returned snapshot is frozen — helpers comment already states history alias prevention.
2. Add host P0 pins: `Object.isFrozen(gameState(board).board) && every row frozen` + `throws on assignment TypeError` + `input mutation after does not affect stored` + `mutating stored does not affect prior snapshot` (G-06). Keep the manual probe `node --loader tsx -e "… Object.isFrozen(s.board), s.board!==b …"` as a CI one-liner (spec Verification).
3. Twin `tsc` gates must stay clean — `Object.freeze(board) as Board` cast is required because `Board` is mutable `Cell[][]` but frozen value is still a valid `Board` read-view; any `ReadonlyBoard` widening would break the cast and `npx tsc` would fail first.
**Owner:** FE lead
**Timeline:** Gate this sweep (`2026-09-02`)
**Status:** Planned → Complete (code landed `53c4f3d`, pins in P0 G-06)
**Verification:** `rg -n "deepFreezeBoard" triade/test-utils/helpers.ts` ==2 (def+usage) && `Object.isFrozen` probe `true && true` + `throws TypeError` + `npx tsc --noEmit && npx tsc -p triade/tsconfig.test.json --noEmit` clean

---

## Assumptions and Dependencies

### Assumptions

1. `Board Cell = number | null` primitives (per `types.ts:3`) — so `board.map(r=>[...r])` shallow row spread is sufficient isolation; no deep object clone needed.
2. Production `Board` is always 4×4 via `emptyBoard`/`boardFromLines`/`staticBoard`; `spawnTile` clone loops over `GRID_SIZE` not a hardcoded `4` and does not need ragged-board padding.
3. `spawnTile` draw budget is unchanged (1 draw when placing via `pickIndex`, 0 draws on full/empty-pool early return) — clone adds no draws.
4. `gameState` freeze is output-side only; setup helpers remain mutable so existing `boardWith([[1,2,…],…])` fixtures keep working before being wrapped by `gameState`.
5. `move()` caller (`App.tsx` / `GameE2ETestFixture` / `runSeededSession`) uses `stateFromResult(result)` or `State` snapshot literal — no caller relied on `res.board === inputBoard` identity for noop detection (all use `boardsEqual` + `moved`).

### Dependencies

1. `triade/__tests__/engine/spawn-candidates.unit.test.ts` clone-hygiene asserts — required by `2026-09-02` (landed `53c4f3d`, before merge)
2. `triade/src/engine/core/spawn.ts: cloneBoard` + `triade/test-utils/helpers.ts: deepFreezeBoard` — required by `2026-09-02` (landed `53c4f3d`)
3. `npx tsc --noEmit && npx tsc -p triade/tsconfig.test.json --noEmit` twin gates — required before merge (existing `dw-layout`+`dw-purity` gates)
4. `_bmad-output/implementation-artifacts/deferred-work.md` DW-23/70/75/81 `status: done` + `resolution-undo: b85f43d1…` — already ledgered `2026-09-02`

### Risks to Plan

- **Risk**: A future `Board` widening from `number|null` to `object { v, id }` would make row spread insufficient and reintroduce alias via cell object sharing.
  - **Impact**: `res.board[0][0] object` mutation leaks to input board — silent history corruption,  `type Cell` drift.
  - **Contingency**: `rg -n "export type Cell" triade/src/engine/core/types.ts` must stay `number | null`; any widening requires `cloneBoard` to become `board.map(r=>r.map(c=> c===null?null:{...c}))` + a new P0 object-alias pin.

- **Risk**: `sprint-status.yaml` is orchestrator-owned — this design must never write it; working-tree `git diff --stat` should not list it.
  - **Impact**: Orchestrator stalls, sweep sweep bundle name `dw-engine-spawn-mutation-hygiene` mismatched with `status: done`.
  - **Contingency**: Gate `git diff --stat` before commit — must show `deferred-work.md` but not `sprint-status.yaml`.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run) — for this hygiene, P0s already exist (`spawn-candidates` 2 clone pins); ATDD is not required.
- Run `*automate` for broader coverage once implementation exists — `automate` for `dw-engine-spawn-mutation-hygiene` would be redundant (host `npm test` 882 pass already gates hygiene).

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date}
- [ ] QA Lead: {name} Date: {date}

**Comments:**

---

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`triade/src/engine/core/spawn.ts` `spawnTile` (pure) + `cloneBoard` helper** | Direct hygiene — every `move()` effective path clones then places; full/empty-pool returns new ref (divergence from same-ref legacy). | `npm --prefix triade test -- __tests__/engine/spawn-candidates.unit.test.ts __tests__/engine/spawn.test.ts` 22 pass + `rg -n "return \{ board: next" triade/src/engine/core/spawn.ts` ==3 + `rg -n "cloneBoard" triade/src/engine/core/spawn.ts` ==2 |
| **`triade/src/engine/core/game.ts` `move()` `effectiveBoard = spawn.board` pipeline** | `move()` is the only consumer of `spawnTile`; trace `spawned` push and `MoveResult.pendingSpawn` (tier `resolveSpawn` 1 draw) follow the clone. | `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass + `__tests__/engine/adaptive-spawn-integration.test.ts` 10k-spawn statistical + `__tests__/engine/line.test.ts` 4-dir wall compaction 182 pass + `assertNoLeak` |
| **`triade/test-utils/helpers.ts` `gameState` + `deepFreezeBoard` + `emptyBoard/boardWith/staticBoard`** | Helper `gameState` now freezes output snapshot (5 freezes per call); 9 setup helpers stay mutable. 80+ engine suites + `runSeededSession` 200-move harness depend on `gameState`. | `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/engine/pending-spawn-contract.test.ts` + full `npm --prefix triade test` 882 pass / 11 expected-RED feel ATDD / 98 skipped + `Object.isFrozen` probe |
| **`triade/__tests__/engine/spawn-candidates.unit.test.ts` + `triade/__tests__/engine/line-compaction.regression.test.ts` + `triade/__tests__/render/transitionPlan.test.ts`** | G-01/G-03 clone loops + wall-compaction `to [0,0]/[0,3]/[3,1]` heritage; hygiene must not change coordinates. | `npm --prefix triade test -- __tests__/engine/line-compaction.regression.test.ts` + `__tests__/render/transitionPlan.test.ts` |
| **Deferred ledger `deferred-work.md` DW-23/70/75/81 + `sprint-status.yaml` ownership** | Ledger flips `open→done` with `resolution-undo: b85f43d1…`; `sprint-status.yaml` is orchestrator-owned (never written by this workflow). | `cat _bmad-output/implementation-artifacts/deferred-work.md | rg -n "DW-23|DW-70|DW-75|DW-81"` shows 4 `status: done` + `resolution-undo: b85f43d1a077f8ad7f8d33c07155f5e3ae81c44b4b974f1cfcc598d8b869d26e` + `git diff --stat` lists `deferred-work.md` only |
| **`triade/src/engine/core/types.ts` + `board.ts` + `rules.ts` + `ceiling.ts`/`pot.ts`/`weights.ts`** | Byte-identical this sweep (no GRID_SIZE, merge, or distribution change). | `git diff --stat -- triade/src/engine` shows only `spawn.ts` + `game.ts` — single-source `GRID_SIZE=4` pin; `weights/ceiling/pot` 858-host-gate still green |
| **Render `src/render/GameBoard.tsx` / `transitionPlan` / `feel` / `App.tsx` swipe `SWIPE_THRESHOLD`** | None — hygiene is engine+helpers only, no UI change. | Existing `GameBoard` smoke + `feel` 8.x + `ci-gesture-wiring-docs` `GameBoard.tsx` `SWIPE_THRESHOLD` literal guard remain gate |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (TECH/SEC/PERF/DATA/BUS/OPS, P×I 1-9, ≥6 MITIGATE, 9 BLOCK)
- `probability-impact.md` - Risk scoring methodology (1 Unlikely/Low ... 3 Likely/Critical, 6-8 CONCERNS, 9 FAIL)
- `test-levels-framework.md` - Test level selection (Unit for `spawnTile`/`gameState`/`move` pure; no E2E needed for engine hygiene)
- `test-priorities-matrix.md` - P0-P3 prioritization (P0 blocks ADR-06 isolation + high risk ≥6 + no workaround clone site; P1 pipeline + twin tsc; P2 static scans; P3 bench)
- `nfr-criteria.md` - NFR planning (reliability never-throw + isolation, maintainability single-site clone, performance O(16), evidence deferred to `nfr-assess`)

### Related Documents

- PRD: n/a (sweep bundle, no PRD — intent from `spec-engine-spawn-mutation-hygiene.md` intent/boundaries/I-O matrix)
- Epic: n/a (hygiene sweep, not a product epic; deferred-work DW-23/70/75/81 trace to stories `1-1`, `12-1`, `7-4`)
- Architecture: `triade/src/engine/core/types.ts` (`GRID_SIZE=4`, `Board`, `GameState`, `MoveResult`, `SpawnResult`, `Rng` + draw-budget contract)
- Tech Spec: `_bmad-output/implementation-artifacts/spec-engine-spawn-mutation-hygiene.md` (`baseline edfc574`, `final 9d2e534`, 8-row I-O matrix, Code Map `spawn.ts:66-89` + `game.ts:32-91` + `helpers.ts:22-74`)
- Deferred Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-23 `spawnTile mutates its input board`, DW-70 `spawnTile muta o board de entrada`, DW-75 `spawnTile muta board in-place`, DW-81 `Board shallow ref — gameState guarda board por referência`)
- Engine line/spawn heritage: `_bmad-output/test-artifacts/test-design/test-design-dw-engine-line-compaction.md` (wall-compaction hygiene — same test-design-output folder, no overlap)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6) — dw-engine-spawn-mutation-hygiene deep-dive (working-tree `git diff HEAD` metadata-only, production delta `53c4f3d` vs `edfc574`)
