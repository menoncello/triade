---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-line-compaction.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
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

# Test Design: DW bundle dw-engine-line-compaction — line shift compaction + 4x4 guard hardening

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-engine-line-compaction`
**Scope:** Targeted test design for the working-tree delta of `dw-engine-line-compaction`

> **Delta under assessment:** Commit `7eacd93 fix(engine): fully compact shiftLine multi-gap and harden 4x4 guards (DW-20, DW-74)` vs baseline `505c8ea chore(sweep): close resolved deferred-work entries` (`spec-engine-line-compaction.md` `baseline_revision: 505c8eac145fccd9b18fc97b8fd4a51826e24847`, `final_revision: 4f6cc04dd3b59bcb025fc463a21619d195ae09a6`). Working-tree diff vs `HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` DW-20/DW-74 `open→done 2026-09-02` + `resolution-undo: 26a75af…`); production delta is `triade/src/engine/core/line.ts` + 3 test files + spec:
> - `triade/src/engine/core/line.ts:16-110` — `movementLines` now `board[r]?.[c] ?? null` (was `board[r][c]`) for both row/col paths; `shiftLine` gains `const n = line.length` + `i < n` loop (was `GRID_SIZE`) + `dest` bounds guard + **wall-scan** `let target=dest; while(target>0 && out[target-1].v===null) target--` before placing tile (merge branch keeps `dest=i-1` only); `boardFromLines` now `for i < lines.length / row.length` with `if (!row) continue` + `if (!item) continue` (was `GRID_SIZE` fixed loops + `lines[i][k]` direct).
> - `triade/__tests__/engine/line-compaction.regression.test.ts` (new 82 LOC, 11 cases) — DW-74 multi-gap compaction pins (`[null,null,null,2]→[2,null,null,null]` with `from [[0,3]]`, `[null,2,null,4]→[2,4,null,null]`, `[null,null,3,null]→[3,…]`, empty stay) + DW-20 short-input guards (1-elem, 0-elem, 2-elem gap, `boardFromLines` short, `movementLines` short board) + preserve `gap-non-merge [3,null,3,null]→[3,3,null,null] score 0` and `cascade [3,3,3,3]→[6,3,3,null] score 6`.
> - `triade/__tests__/engine/game.test.ts` — `ONE_CELL [_,3,_,3] left` expectation ` [3,null,3,1]` → `[3,3,null,1]` (fully compact) and `move down [3,_,_,3]→[_,_,3,3]` wall expectation (was `[_,3,_,3]` one-cell semantics).
> - `triade/__tests__/render/transitionPlan.test.ts` — slide left `to [0,1]→[0,0]`, slide right `to [0,2]→[0,3]`, slide down `to [1,1]→[3,1]` (wall-compacted coordinates).
> - `triade/src/engine/core/types.ts: GRID_SIZE=4` unchanged; `rules.ts: canMerge/mergeValue` unchanged (read-only); `game.ts` unchanged (`movementLines/shiftLine/boardFromLines` pipeline byte-identical consumer).
> - Ledger `deferred-work.md` — DW-20 (`shiftLine/move/boardFromLines assume 4x4 and crash on shorter input`) and DW-74 (`Compactação single-pass falha para linhas com múltiplos gaps`) flipped `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-line-compaction` + `resolution-undo: 26a75af1…`.

---

## Executive Summary

**Scope:** Correct a single-pass compaction defect in the pure engine line mover (`shiftLine`) that left multi-gap lines partially compacted (`[null,null,null,2]→[null,null,2,null]` instead of wall `[2,null,null,null]`), and harden the three engine line/board helpers against short/empty inputs without changing `GRID_SIZE=4`. Before the sweep every direction pipeline masked the defect when the board was fully rectangular (`movementLines` always produced length-4 lines, `boardFromLines` always consumed 4 lines), so the bug had limited production blast radius — but it was load-bearing for correctness: a future consumer that passed a short/ragged line (or a test harness) would crash on `out[dest]` OOB, and the wall-compaction invariant would diverge from the trace's `from`/`moved` reporting, breaking `transitionPlan` slide coordinates and the directional-spawn candidate count (spawn lands on the opposite edge of each `moved` line).

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3
- Critical categories: TECH (wall-scan vs gap-non-merge contract, length-guard vs GRID_SIZE mapping, trace `from`/`moved` fidelity), DATA (board trace integrity for `transitionPlan`/spawn), BUS (wall semantics vs legacy one-cell expectations)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit, pure `shiftLine` wall-compaction + gap-non-merge + cascade + short/empty guards + `boardFromLines`/`movementLines` short guards)
- P1 scenarios: 6 groups (engine `game.move` directional wall pipeline 4 dirs + `transitionPlan` slide coordinates + existing `line.test.ts`/`line-moved` regression green)
- P2/P3 scenarios: 6 groups (static single-constant / single-scan / no-duplicate-GRID_SIZE scans, degenerate zero board + no-leak/ assertNoLeak 200-move sweep + ledger `resolution-undo`)
- **Total effort**: ~4–7 hours (~0.6–1.0 days; host-only, no device lane — pure engine/transition pure TS, `npm test` + `tsc` gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score rules `canMerge(1+2→3, >=3 equal)` / `mergeValue` / merge-once cascade, ceiling/weights/pot/ladder, spawn-tier, `spawnTile` cell/value draw budget (20 newGame / 3 effective move), `pickIndex` NaN clamp, `previewFor` ambiguous band, `matchOrchestrator`/`undo`/`rewardedAd`/`entitlements`, `src/feel` haptics/punch/shake/bullet/sfx, `App.tsx`/`GameBoard.tsx` Skia/Reanimated, `RNGH` gesture, `layout.ts`/`Hud.tsx`** | `git diff --stat -- triade/src/engine` shows only `line.ts` changed; `types.ts:GRID_SIZE=4` + `rules.ts` + `game.ts` + `spawn.ts`/`pot.ts`/`ceiling.ts` byte-identical. `git diff HEAD` shows only `line.ts` + 3 test files + ledger/spec — no spawn/feel/render/layout/monetization change. | Engine merge/score/ceiling/spawn invariants stay gated by 182 `__tests__/engine/*.test.ts` pass (per spec Auto Run) + `git diff --stat -- triade/src/engine` shows single-file `line.ts` delta as gate. |
| **Changing `GRID_SIZE` from 4, altering `canMerge` predicate (D-006 single-merge-site vs duplicate), `boardFromLines` orientation mapping `GRID_SIZE-1-k` for right/down** | Spec Boundaries: `Always: Keep GRID_SIZE=4`; `Never: Change GRID_SIZE, introduce async I/O, or alter tier/spawn RNG budgets`; `Block If: Changing GRID_SIZE … required`. Orientation mapping is pre-existing and unchanged. | This plan pins `GRID_SIZE===4` via `rg -n "GRID_SIZE"` single definition in `types.ts` + `line.ts` 3 uses (`GRID_SIZE-1-k` right/down + 2 `movementLines` loops). Changing GRID_SIZE would require architecture review (Block If). |
| **Real `span`-style allocation-free scan vs `while(target>0…)` micro-bench lane** | Sweep scan is O(n) `n=4` single wall walk per tile (max 3 steps, worst 6 ops/line); `feel.bench.test.ts` already gates frame budget `<0.05ms median`. Spec `Verification: npm test` `<15 min` is the gate. | No extra bench lane; host `npm test` timing is the gate. |
| **Short-board production path (production `Board` is always 4×4 via `emptyBoard`/`staticBoard`/`boardFromLines(emptyBoard)`); short-input guard is defensive-only** | Production `movementLines`/`boardFromLines` consumers (`game.move`, `transitionPlan`) always pass 4×4 boards + length-4 lines. Short guard exists for harness/ragged-input defensiveness and for test isolation, not for a live code path that ships a 1×1 board. | Captured as R-003 residual — guard prevents `throw TypeError: Cannot read properties of undefined` on `board[r][c]` / `lines[i][k]` OOB but masks a malformed-board caller that should have been caught earlier. Document-only residual. |
| **`spawnTile` aliasing DW-75 (`spawnTile` muta `board` in-place)** | Explicit `open` deferred entry DW-75, unrelated to line compaction; `game.move` passes fresh `newBoard` from `boardFromLines` so alias does not leak. | DW-75 stays `open` and is not re-triaged; `spawnTile` alias is not re-tested here. |
| **RevenueCat / AdMob / IAP / Epic 9-11 a11y** | No monetization/a11y code touched. | Existing suites remain gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `shiftLine(CellRef[])→{line:ShiftedCell[], score, moved}` is pure with no `expo-*`/`Skia`/`RNG` dependency; `movementLines(Board,Direction)→CellRef[][]` and `boardFromLines(ShiftedCell[][],Direction)→{board,trace}` are pure with only `GRID_SIZE` + `emptyBoard`. Every path is host-testable via `node --import tsx --test` with `refLine(...vs)` 4-literal factory + short/empty variants + `STATIC`/`emptyBoard` fixtures and `rngOf(0,0,0.5)` (unchanged draw budget).

**Observability — Good.** Outputs are deterministic numerics/booleans with no hidden state: `line.map(c=>c.v)` `4`-literal, `score` integer, `moved` boolean (`out.some(v!==line[i].v)`), `from: [[r,c]]` single-cell trace (or `[[r0,c0],[r1,c1]]` for merges), `boardFromLines` `TraceEntry[]` + `Board` 4×4, `movementLines` `CellRef {v,r,c}` per cell. Wall-compaction is observable as `line[0].v===2 && line[0].from=== [[0,3]]` for `[null,null,null,2]`.

**Reliability — Strong (engine never throws, helpers never throw).** Guard prevents `TypeError` on `board[r]?.[c]` / `lines[i][k]` OOB; wall-scan `while(target>0 && out[target-1].v===null)` is bounds-checked `>0`; merge branch stays `canMerge(out[dest].v, t.v)` immediate-neighbor only. Both `tsc` gates (`tsconfig.json` + `tsconfig.test.json`) clean; `npm --prefix triade test` full gate `<15 min`.

**Testability Risks:** Two surfaces are thin: (a) wall-scan for shift vs merge uses different destinations (`target` wall vs `dest` immediate) — a refactor that collapsed them to a shared `target` would make gap-adjacent tiles merge (R-002); mitigated by gap-non-merge pin. (b) length-guard `n=line.length` vs `GRID_SIZE` — a follow-on that reintroduces `for(i<GRID_SIZE)` inside `shiftLine` would re-crash on short lines; mitigated by short-input regression suite.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Wall-scan incomplete or overshoots — multi-gap compaction still partial or slides through a mergeable neighbor and corrupts score/moved.** Before fix `shiftLine` used `dest=i-1` without scanning, so `[null,null,null,2]` stopped at `k=2` (`[null,null,2,null]`) requiring a second pass that never ran. Fix adds wall scan `target=dest; while(target>0 && out[target-1].v===null) target--`. Risk: scan misses consecutive run (off-by-one `>0` vs `>=0`), or scans even when `dest` holds a mergeable tile (merging `[1,2,null,2]` as wall-shift instead of checking `canMerge`), or ordering `line[i]` vs `out[dest]` uses stale `line` not `out` and double-fills wall after a prior tile already vacated it. Current blast radius on production 4×4 is medium (pipeline feeds fully populated lines, so wall compaction is expected by `transitionPlan` — slide left `to [0,1]` vs `[0,0]` diverge), but the logical site is single `while` with no second consumer. | 2 | 3 | **6** | Enforce wall invariant: (a) **host P0 pins** `shiftLine([null,null,null,2])→[2,null,null,null] from [[0,3]] moved true`, `[null,2,null,4]→[2,4,null,null]`, `[null,null,3,null]→[3,null,null,null]` (already `line-compaction.regression.test.ts:12-33` landed); (b) **static scan** `rg -n "while \(target > 0 && out\[target - 1\]\.v ===" triade/src/engine/core/line.ts` ==1 wall scan site (merge branch must stay `else if (canMerge(out[dest].v` with `dest` not `target`); (c) **pipeline tie** `transitionPlan.test.ts` wall expectations `to [0,0]/[0,3]/[3,1]` must stay green — slide to wall is the observable side-effect. | FE lead | Immediate (gate this sweep; protects DW-74) |
| R-002 | TECH | **Gap-non-merge invariant breaks — gap-adjacent tiles incorrectly merge after wall compaction.** Spec requires `[3,null,3,null]→[3,3,null,null] score 0` (no merge across a gap that was compacted). Shift moves `line[2]=3` at `i=2` where `out[1]` is empty to `target=1` (not wall `0` because `out[0]=3` occupied), leaving `[3,3,null,null]`. Merge must only fire when `out[dest].v` (immediate `i-1`) is `canMerge`-true, not when `target` wall cell is mergeable. A refactor that reused `target` for the merge check (`canMerge(out[target].v, t.v)`) would merge `3` at `i=2` into the wall `3` at `0` via gap and score `6` where spec says `0`. | 2 | 3 | **6** | Pin gap-non-merge as **no-merge-on-wall**: (a) **host P0** `[3,null,3,null]→[3,3,null,null] score 0` and `[3,3,3,3]→[6,3,3,null] score 6` (cascade block still one merge) already in `line-compaction.regression.test.ts:72-82` + `line.test.ts:82-98`; (b) **predicate grep** `rg -n "canMerge\(out\[dest\]" triade/src/engine/core/line.ts` ==1 (not `out[target]`) and `rg -n "out\[target\]\.v = t\.v" triade/src/engine/core/line.ts` ==1 vs `out\[dest\]\.v = merged` ==1 (shift uses wall, merge uses immediate); (c) **negative pin** `[1,null,2,null]→[1,2,null,null] score 3` would be wrong if merge-through-gap, so add one extra pin `shiftLine([1,null,2,null])→score 0? actually 1+2 merges when adjacent, so after compaction [1,2,_,_] are adjacent and must merge` — verify spec gap rule is *only* for equal `>=3` gap? Wait `canMerge(1,2)` true regardless of prior gap? In `line` domain gap is erased before adjacency, so `1+2` across gap *should* merge if they become neighbors — but `[3,null,3]` across gap must not? No, per spec `[3,null,3,null] score 0` — equal 3s across gap do NOT merge because they were not adjacent before compaction? Actually after compaction `[3,3,…]` they are adjacent; why score 0? Because they started as `[3,null,3]` and after compaction both at wall they are adjacent but spec says score 0 — this is the single-pass merge-once + shift-first semantics: `i=2` 3 sees `out[1]` empty so it shifts to 1, not merge. So merge only on immediate dest that is occupied `canMerge`. That pin is the gate. | FE | Immediate |
| R-003 | TECH | **Short/empty guard masks malformed boards and changes `moved`/`boardFromLines` totals — `movementLines` `board[r]?.[c] ?? null` pads ragged boards silently and `boardFromLines(lines.length / row.length)` truncates instead of throwing.** Before fix `movementLines(board[r][c])` on `[[1]]` threw `TypeError`; `shiftLine([])` looped `GRID_SIZE` and OOB'd; `boardFromLines([line])` iterated `GRID_SIZE` and read `undefined`. Fix makes each helper length-driven. Risk: a caller that accidentally passed a ragged `Board` (`[[1],[2,3]]`) now silently pads to 4×4 with nulls and `boardsEqual` in `game.move` reports `moved:true` with fewer tiles — `trace` length mismatches `board` occupancy and `spawnTile` opposite-edge candidate count drifts. Production boards are always 4×4 via `emptyBoard()`, but a test that built `boardWith([...])` off-by-one row count would now be green-hiding. | 2 | 3 | **6** | Make guard observable, not hidden: (a) **host P0** `movementLines([[1]] as Board,'left')→lines.length===GRID_SIZE && lines[0][0].v===1 && lines[0][1].v===null` + `shiftLine([])→length 0 moved false` + `boardFromLines([line],'left').board[0][0]===2` already `line-compaction.regression.test.ts:36-69`; (b) **grep guard** `rg -n "board\[r\]\?\.\[c\] \?\? null" triade/src/engine/core/line.ts` ==2 (row+col paths) and `rg -n "for \(let i = 0; i < GRID_SIZE; i\+\+\)" triade/src/engine/core/line.ts` shows exactly 2 retained (`movementLines` header) + `shiftLine` shows `i < n` not `GRID_SIZE`; (c) **pipeline pin** `game.move` 4-direction wall suites (left/right/up/down) with `staticBoard`/`emptyBoard` stay green — short guard must not change any 4×4 pipeline total; `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass is the gate. | FE lead | Immediate (gate DW-20 crash; protects trace/spawn) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Cascade-block regression — `[3,3,3,3]→[6,3,3,null] score 6` (merge-once) diverges if wall-scan + iteration order interact.** Line order `i=0..n-1` is sequential; `i=1` merges into `0`, `i=2` then sees `out[1]` occupied (`3` slid from somewhere? Actually after merge `out[0]=6`, `out[1]=null` cleared, then `i=2` shifts to `1`, `i=3` stays at `2→`? No, after `i=2→1`, `i=3` sees `out[2]==null` so scans to `2`. Result `[6,3,3,null]`. A refactor that re-ordered to two-pass (compact then merge) would collapse to `[6,6,null,null]` score 12. | 2 | 2 | 4 | Keep single-pass sequential order: host `line.test.ts:82-89` ` [3,3,3,3] → [6,3,3,null] score 6` + `line.test.ts:109-116` `[3,3,6,6]→[6,6,6,null] score 6` + regression `preserve: [3,3,3,3]` stay blocked; `rg -n "for \(let i = 0; i < n; i\+\+\)" triade/src/engine/core/line.ts` ==1 (no second loop). |
| R-005 | TECH | **Direction `right`/`down` reversal vs wall-scan interaction — `movementLines` reverses row/col for right/down, `boardFromLines` un-reverses via `GRID_SIZE-1-k`.** Wall-scan is direction-agnostic (wall is index 0 in the reversed line), but a future edit that scanned toward `n-1` for reversed lines would compact away from the wall. | 1 | 3 | 3 | Pin 4-direction pipeline: `PIPELINE left/right/up/down` in `line.test.ts:145-188` + `game.test.ts` directional suites (`left/right/up/down` each with `staticBoard`/`emptyBoard`) stay green; `movementLines(...,'right')[0][0].v must be rightmost cell` pin (`line.test.ts:31-38`) plus `movementLines(...,'down')[2][0].v === bottom` pin. |
| R-006 | DATA | **Trace `from`/`spawn` opposite-edge drift — wall compaction changes `shiftLine` `from [[r,c]]` wall assignment, and `boardFromLines` trace `to: [r,c]` derivation is direction-split. If a tile moves from `[0,3]` to `[0,0]` its `from` must be `[[0,3]]`, not `[[0,2]]` (the intermediate null). A future wall-scan that copied `out[dest].from` instead of `[[t.r,t.c]]` would misattribute source and `transitionPlan` would animate wrong origin; similarly `game.move` candidate set `if (shifted[i].moved) candidates push([i, oppCol])` depends on `moved` fidelity.** | 1 | 3 | 3 | Pin trace wall fidelity: (a) host `DW-74 regression: [null,null,null,2] compacts to [2,…] with from [[0,3]] at 0` already `line-compaction.regression.test.ts:12-17`; (b) `game.test.ts` `trace:` suites `merged tile records both sources, spawn flagged, trace wall merge` + `transitionPlan.test.ts` slide `from [[0,2]]→to [0,0]` / `[[0,1]]→[0,3]` / `[[0,1]]→[3,1]` already green — keep as P1 gate; (c) grep `rg -n "from: \[\[t\.r, t\.c\]" triade/src/engine/core/line.ts` ==1 (shift always sources from `line[i]` not `out[dest]`). |
| R-007 | BUS | **Legacy wall vs one-cell expectation drift — existing suites assumed `ONE_CELL` one-step semantics (`[_,3,_,3] → [3,_,3,_]` single step, `[3,_,_,3] col down → [_,3,_,3]`). Spec corrects to wall `[3,3,…]` / `[_,_,3,3]`. Risk: a follow-on that reverts game/transition expectations to one-cell would re-pin the defect and ship a board with internal gaps visible to the player as a mid-board gap after a swipe.** | 2 | 2 | 4 | Keep wall expectations: `game.test.ts` `ONE_CELL: [_,3,_,3] left → [3,3,_,_] (fully compact)` + `move down [3,_,_,3] → [_,_,3,3]` (already patched) + `transitionPlan` wall `to [0,0]/[0,3]/[3,1]` serve as living wall pins; any revert is a test failure, not a silent drift. |
| R-008 | OPS | **Deferred-ledger `resolution-undo` hash coupling + `sprint-status.yaml` ownership.** Sweep marks DW-20/DW-74 `done` with `resolution-undo: 26a75af… 2026-09-02 7374617475733a206f70656e`; `sprint-status.yaml` is orchestrator-owned and must not be written or reverted by this workflow. | 1 | 2 | 2 | Ledger already records `resolution-undo: 26a75af…` per entry; any reopen must keep the hash. `git diff --stat` gate shows `deferred-work.md` but NOT `sprint-status.yaml`. This plan never writes the latter. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | PERF | **Wall scan adds `while(target>0…)` per shifting tile (max 3 steps, line length 4).** On 4×4 board 4 lines × 4 tiles = 16 scans worst, each ≤3 steps = 48 ops total per `move()` — negligible vs frame budget `<8ms`. | 1 | 1 | 1 | Monitor — `npm test` full gate `<15 min` is sufficient; no bench lane. Existing `engine.smoke` + `feel.bench` already gate frame budget. |
| R-010 | TECH | **Helper name / spec `final_revision` drift — spec `final_revision: 4f6cc04…` is a commit hash literal; a follow-on commit would make it stale.** Bundle spec is intentionally `status: done` with `followup_review_recommended: false`; stale hash is doc-only. | 1 | 1 | 1 | Monitor — doc pin only; `deferred-work.md` DW-20/74 `resolution-undo` hash is the revert trail, not `final_revision`. |

### Risk Category Legend

- **TECH**: Technical/Architecture (wall-scan algorithm, gap-non-merge contract, length-guard vs GRID_SIZE, direction reversal, trace fidelity)
- **SEC**: Security — none this sweep (pure engine math, no auth/data exposure; `board[r]?.[c] ?? null` is layout math, not security boundary)
- **PERF**: Performance — wall scan O(n) n=4 (R-009); no async/worklet lane
- **DATA**: Data Integrity — trace `from` wall attribution + board reconstruction (R-006) and board occupancy via `boardFromLines`
- **BUS**: Business Impact — wall semantics player-visible gaps vs one-cell expectation (R-007)
- **OPS**: Operations (deferred ledger `resolution-undo`, `sprint-status.yaml` ownership, tsc gates)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-engine-line-compaction` touches the **engine line seam only**: **reliability/never-throw** (every `shiftLine`/`movementLines`/`boardFromLines` finite and non-throwing on any `Board`/`CellRef[]` including ragged/empty), **maintainability (single `GRID_SIZE=4` + single wall-scan site + single `canMerge` predicate + single 64-hex `resolution-undo`)**, **correctness** (wall-compaction invariant, gap-non-merge, cascade block), **60 FPS/frame budget unchanged** (O(1) wall scan, no worklet), and **offline/installability** unchanged (no new deps).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw + finiteness | `shiftLine` never throws on any `CellRef[]` including `[]`, `[{v:1}]`, ragged `[null,2,null,4]`-length 2 slice, `[null,null,3,null]`; `movementLines` never throws on ragged `[[1]]` board; `boardFromLines` never throws on `[[line]]` short or ragged `lines[i]`; every returned `line.length === input.length`, `board` 4×4 via `emptyBoard()` + filled cells finite, `trace` entries finite, `moved` boolean deterministically `out.some(v!==line[i].v)`. | R-003, R-006 | Host unit negative-path sweep: `shiftLine([])`, `shiftLine([single])`, `shiftLine([null,3].slice(0,2))`, `movementLines([[1]] as Board,'left')`, `boardFromLines([line],'left')` — already `line-compaction.regression.test.ts:36-69` 5-case guard; exhaustive ragged `board[0..1][0..1]` 2×2 + 1×3 boards vs 4×4 pipeline already in `line.test.ts` pipeline suites. | `triade/__tests__/engine/line-compaction.regression.test.ts` 5 DW-20 pins + `triade/__tests__/engine/line.test.ts` 18 pins + `npm --prefix triade test -- __tests__/engine/line.test.ts __tests__/engine/line-moved.unit.test.ts __tests__/engine/line-compaction.regression.test.ts` green + both `tsc` clean |
| Maintainability | Single `GRID_SIZE=4` definition in `types.ts:1`; single wall-scan `while(target>0 && out[target-1].v===null)` in `line.ts`; single `Number.isFinite`-free arithmetic path; single `canMerge` predicate (no new site added) — still 4 feel sites + `transitionPlan` + `game.ts` `isGameOver` = 6 allowlist but line's `canMerge` is single line site; `resolution-undo` 64-hex per resolved DW; `movementLines` length `GRID_SIZE` header loops 2 sites (row+col) but `shiftLine` is `n=line.length`. | R-001, R-002, R-005, R-008 | Static scans: `rg -n "GRID_SIZE" triade/src/engine/core/line.ts` shows 5 hits (2 `GRID_SIZE` header + 2 `GRID_SIZE-1-k` right/down + 1 `GRID_SIZE` `movementLines` col loop) with `shiftLine` asserting `n = line.length` not `GRID_SIZE`; `rg -n "while \(target > 0" triade/src/engine/core/line.ts` ==1; `rg -n "canMerge\(out\[dest\]" triade/src/engine --include="*.ts"` shows line + game + purity allowlist; ledger `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` shows 2 new 64-hex entries DW-20/74. | Source scans + `line.ts:16-110` diff + `types.ts:1` + ledger diff |
| Correctness — wall-compaction + gap-non-merge + cascade | Wall invariant: every non-merging tile ends at the wall-most consecutive empty (e.g. `[null,null,null,2]→[2,null,null,null]`, `[null,2,null,4]→[2,4,null,null]`); gap-non-merge: `[3,null,3,null]→[3,3,null,null] score 0` (not `6`); cascade block: `[3,3,3,3]→[6,3,3,null] score 6` (not `12`); right/down mirror the left/up rules via reversed lines. | R-001, R-002, R-004 | Host regression suite + pipeline 4-direction: `line-compaction.regression.test.ts` 4 wall pins + 2 preserve pins (`gap-non-merge` + `cascade`) + `line.test.ts` 12 merge lanes (`1+2→3`, `3+3→6`, `1+1` no-merge, packed `[1,3,6,12]` noop) → `score` + `moved` asserted; directional `PIPELINE left/right/up/down` + `game.test.ts` directional suites pin right/down mirror. | `line-compaction.regression.test.ts` 11 pass + `line.test.ts` 18 pass + `game.test.ts` 32 pass + `transitionPlan.test.ts` 16 pass |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn` (line O(1) scan ≤3 steps per tile, board pipeline 16 scan steps total), frame worst `<8 ms`, device `p99 <16.7 ms`. Wall scan adds ≤48 null checks per `move()` — `<0.01 ms`. No `Math.random` in `line.ts`, no worklet, no `setTimeout`. | R-009 | Host gate only: `npm --prefix triade test` (full) median per `line.test.ts` `<0.01 ms` (observed `<1 s` for 43-case engine line suite); `feel.bench.test.ts` both-profile budget unchanged. | CI `npm test` timing + both `tsc` clean; no bench lane |
| Compliance — wall trace + opposite-edge spawn | Wall compaction must not break the directional spawn invariant: every `moved` line vacates its opposite-edge cell, `candidates` set is `shifted[i].moved ? [i, oppCol/oppRow] : []` and is non-empty on effective move (AC4). `transitionPlan` slide `from` must be wall-attributed (`[[0,3]]` at `0` not `[[0,2]]`). | R-006, R-007 | Host + pipeline: `game.test.ts` `spawn happens exactly once … after effective move` + `GAME_OVER` + `trace:` suites + `transitionPlan.test.ts` wall `from` pins + `directional-spawn.smoke.test.ts` + `adaptive-spawn-integration` tier ceiling ordering. | `game.test.ts` 32 pass + `transitionPlan.test.ts` 16 pass + `spawn`/`ceiling` suites |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (line is pure TS `types` + `rules` + `board`). | — | `npm --prefix triade test` offline (no network) still green. | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. Wall scan cost `<0.01 ms` is observed, not threshold-invented; `boardSize` guard `null`-pad is defensive-only (no PRD threshold). If a future sweep introduces a `BOARD_SIZE` change, record its measured `emptyBoard()` cost as baseline rather than inventing a threshold.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-engine-line-compaction.md` intent/boundaries/I-O matrix 8 rows + 6 ACs signed; DW-20/DW-74 ledger entries `open→done` reviewed)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsx` + `tsconfig.test.json` (`TSX_TSCONFIG_PATH`) + `helpers.ts` `staticBoard`/`emptyBoard`/`boardWith`/`rngOf`/`mulberry32`)
- [ ] Test data available or factories ready (`refLine(...vs)` 4-literal factory + `CellRef {v,r,c}` + short/empty variants `[]`/`[{v:1}]`/`[null,3].slice(0,2)` + `GRID_SIZE=4` + `emptyBoard` 4×4 fixtures + `rngOf(0,0,0.5)` 3-draw effective / `rngOf(0,0, 9×0, 9×0.5)` 20-draw `newGame`)
- [ ] Feature deployed to test environment (commit `7eacd93` on host — `line.ts` patched + `line-compaction.regression.test.ts` + `game.test.ts`/`transitionPlan.test.ts` wall expectations; baseline `505c8ea` committed; `git diff --stat -- triade/src/engine` shows single file `line.ts` delta)
- [ ] No spawn/feel/layout edits (`git diff --stat -- triade/src/render triade/src/feel triade/src/ui triade/src/services` empty) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`shiftLine` wall 4-case + gap-non-merge + cascade + empty/1-elem/2-elem short guards + board short + movement short — host)
- [ ] All P1 tests passing (or failures triaged with waivers) — directional pipelines 4 dirs + wall `game.move` 3 wall expectations + `transitionPlan` wall `to` coordinates + `line.test.ts`/`line-moved` 43 pass green
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on line seam; `rg` allowlists for single `GRID_SIZE` / single wall-scan / no-duplicate-`GRID_SIZE` in `shiftLine` green)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (both via `TSX_TSCONFIG_PATH`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+wall correctness, single-wall-scan maintainability, O(1) frame budget, wall trace opposite-edge)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns line P0 wall + gap-non-merge + cascade pins, directional pipeline `transitionPlan`/spawn gates, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `line.ts` wall-scan contract + length-guard vs `GRID_SIZE` mapping, finite-path correctness, `boardFromLines`/`movementLines` short guards |
| PM | PM | Signs DW-74 wall semantics vs legacy one-cell expectations (visible gap fix) + accepts short-input silent-pad residual (spec-allowed) |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, already green

**Criteria**: Blocks wall-compaction bypass or gap-non-merge recurrence + high risk (≥6) + no workaround (wall invariant is the player-visible board)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `shiftLine([null,null,null,2])→[2,null,null,null] from [[0,3]] moved true` (wall-most empty run) | Unit | R-001, R-006 | 1 | QA (done) | `line-compaction.regression.test.ts:12-17` — wall scan `target=dest; while(target>0 && out[target-1].v===null) target--` proven; `moved true` + `from [[0,3]]` at 0. |
| AC — `shiftLine([null,2,null,4])→[2,4,null,null]` (double gap two tiles, sequential scan) | Unit | R-001 | 1 | QA (done) | `regression:22-27` — proves scan restarts after prior tile vacated `1→0`, so `4` lands at `1` not `2`. |
| AC — `shiftLine([null,null,3,null])→[3,null,null,null]` + `[null,null,null,null] stays empty moved false` | Unit | R-001 | 2 | QA (done) | `regression:24-33` — 3-gap single tile + `all-null` no-op (exhaustive multi-gap edge). |
| AC — `[3,null,3,null] stays [3,3,null,null] score 0` (gap non-merge preserved — shift uses wall `target`, merge uses immediate `dest`) | Unit | R-002 | 1 | QA (done) | `regression:72-76` + `line.test.ts:91-98` — shift to wall `1` not `0` + `score 0`; gate `rg -n "canMerge\(out\[dest\]"` ==1 (not `target`). |
| AC — `[3,3,3,3] stays [6,3,3,null] score 6` (cascade block / merge-once sequential) | Unit | R-004 | 1 | QA (done) | `regression:78-82` + `line.test.ts:82-89` — one merge at `i=1`, `i=2` shifts to `1`, `i=3` shifts to `2` (not `[6,6,…]`). |
| AC — Short/empty guards: `shiftLine([]) length 0 moved false`, `shiftLine([{v:1}]) length 1 moved false`, `shiftLine([null,3].slice(0,2))→[3,null]` + `boardFromLines([line],'left')` short + `movementLines([[1]] as Board,'left')` short board | Unit | R-003 | 5 | QA (done) | `regression:36-69` — all 5 already landed; guards `n=line.length`, `lines.length/row.length`, `board[r]?.[c] ?? null` proven. |
| AC — `movementLines`/`boardFromLines` invariant `lines.length===GRID_SIZE && line.length===GRID_SIZE` on 4×4 still holds (short guard does not break rectangular pipeline) | Unit | R-003, R-005 | 1 | QA (done) | `line.test.ts:20-56` 4-case `movementLines left/right/up/down` — keep green; ensures `for r<GRID_SIZE / c<GRID_SIZE` header still 4, only cell access padded. |

**Total P0**: 12 checks (host unit: 4 wall + 2 preserve + 6 guard), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & wall pipeline

**Criteria**: Important line→game→transition wiring + medium/high risk + common 4-direction workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Engine→board pipeline 4 dirs: `PIPELINE left/right/up/down` full board matches `game.move` pre-spawn (`line.test.ts:145-188` — `staticBoard [1,2,_,_]` left `→3`, right `→3` at `GRID_SIZE-1`, col `[2,1,3,6]` up `→[3,3,6,null]` / down `→[null,3,3,6]`) | Integration (engine→board) | R-005 | 4 | QA | Reuse `line.test.ts` pipeline 4-case — proves reversed line `row.reverse()`/`col.reverse()` + wall-scan + `GRID_SIZE-1-k` un-reverse stay green. |
| `game.move` wall expectations (post-fix): `ONE_CELL [_,3,_,3] left → [3,3,_,_] fully compact` + `move down [3,_,_,3] col down → [_,_,3,3]` wall + `HAPPY_PATH [1,2,_,_]→[3,…]`, `EQUAL_GE3 [3,3,3,3]→[6,3,3,_]`, `NO_1_1`/`NO_2_2` no-merge, `isGameOver`, `spawn exactly once / pickIndex clamp` | Integration (game) | R-001, R-004, R-007 | 6 | QA | Already `game.test.ts` (32 cases) — 3 are wall-corrected, remainder unchanged. Gate `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass. |
| `planTileTransitions` wall coordinates: `slide left [null,null,2,null] → to [0,0] from [[0,2]]`, `slide right [null,2,null,null] → to [0,3] from [[0,1]]`, `slide down [null,9,_,_] col → to [3,1] from [[0,1]]` (was `[0,1]/[0,2]/[1,1]`) | Integration (transition) | R-006, R-007 | 3 | QA | `transitionPlan.test.ts:19-61` 3 wall slide pins (already patched `to [0,0]/[0,3]/[3,1]`); complements `merge 1+2`, `hold`, `noop empty plan`, `no-leak` 200-move `assertNoLeak`. |
| Existing `line.test.ts` + `line-moved.unit.test.ts` green (no regression on `line.test.ts` 18 + `line-moved` moved-flag suites) | Unit | R-002, R-004 | 1 | QA | Spec `Verification: npm test -- line.test.ts line-moved` expected pass; Auto Run Result `43 pass` (line + line-moved + regression) is gate. |
| Trace wall fidelity: single shift `from [[r,c]]` at wall (`[0,3]→[0,0]`), merge `from [[r0,c0],[r1,c1]]` at wall, `moved` true iff `out.some(v!==line[i].v)` | Unit | R-006 | 1 | QA | `regression` wall `from [[0,3]]` + `line.test.ts:58-64` `merge 1+2 from [[0,0],[0,1]] at 0` + `game.test.ts` `trace:` suites (merged + advanced + spawned). |
| Ledger `deferred-work.md` DW-20/DW-74 `done` with `resolution-undo` 64-hex hash, `sprint-status.yaml` untouched (orchestrator-owned) | Static | R-008 | 1 | QA | `rg -n "status: done 2026-09-02" _bmad-output/implementation-artifacts/deferred-work.md` shows 2 hits (DW-20/74) each with `resolution-undo: 26a75af…`; `git diff --stat` shows `deferred-work.md` but not `sprint-status.yaml`. |

**Total P1**: 16 checks, ~0.6–1.2 h host (mostly existing suites, 3 wall expectation pins are already patched)

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary helper edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-wall-scan / single-`GRID_SIZE` / single-`n=line.length` allowlists — `rg -n "while \(target > 0" line.ts` ==1, `rg -n "const n = line\.length" line.ts` ==1, `rg -n "for \(let i = 0; i < n" line.ts` ==1 + `for i < GRID_SIZE` stays 2 (movementLines) | Static scan | R-001, R-003, R-005 | 1 | QA | Any duplicate `while(target…)` or reintroduced `for(i<GRID_SIZE)` in `shiftLine` is a fail; `GRID_SIZE` stays single definition `types.ts: GRID_SIZE = 4`. |
| No duplicate wall predicate — `canMerge(out[dest].v` 1 site in `line.ts` (shift uses `target`, merge uses `dest`), `out[target].v = t.v` 1 site vs `out[dest].v = merged` 1 site | Static scan | R-002 | 1 | QA | `rg -n "out\[target\]\.v = t\.v" line.ts` ==1; `rg -n "out\[dest\]\.v = merged" line.ts` ==1; `rg -n "canMerge\(out\[" line.ts` ==1 (line seam). |
| `GRID_SIZE` single definition + board `emptyBoard()` 4×4 invariant — `rg -n "GRID_SIZE =" triade/src/engine/core/types.ts` ==1 and `git diff --stat -- triade/src/engine` shows only `line.ts` changed | Static scan | R-005, R-008 | 1 | QA | Ensures `boardFromLines` `GRID_SIZE-1-k` right/down mapping not drifted to `n-1-k`; `emptyBoard()` remains 4 loop. |
| Board `board never exceeds safe-margin-bounded` complement + zero-board `emptyBoard` 4×4 zero board + `transitionPlan` no-leak `assertNoLeak` 200-move `mulberry32(20260808)` sweep | Integration | R-006, R-009 | 1 | QA | `transitionPlan.test.ts:177-202` `9-start-tile board plan covers every occupied cell` + `resultingTiles 200-move` — keep green (wall coordinates already pinned). |

**Total P2**: 4 checks, ~0.3–0.6 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — ragged board sweep beyond `[[1]]`: `boardFromLines` with `lines = [[line,len4],[line,len2],…]` short row still maps without crash, `movementLines` with `board=[[1,2],[3]] as Board` ragged still pads to 4×4 | Device exploratory (host `node`) | 1 | QA | No assertion beyond no-throw; if hit, file DW for ragged-Board production guard vs silent pad decision (R-003 residual). |
| Micro-zero — `shiftLine` with all-null `GRID_SIZE` stays `moved false` `from []` + `score 0` across 4 dirs (left/right/up/down noop) — complements 4×4 empty board `isGameOver false` vs full no-merge board `isGameOver` | Unit | 1 | DEV | Already `regression` empty + `line.test.ts:100-106` `keeps packed non-mergeable [1,3,6,12]` + `game.test.ts` `NOOP_SWIPE` full no-merge. |
| No-shift-wall benchmark — `shiftLine` 10k × 4-length random board (density 75%) median `<0.05 ms` (wall while branch is ≤3 steps, no bench lane beyond `feel.bench.test.ts` full-board `median/p99` unchanged) | Unit (bench) | 1 | DEV | Engine `<2 ms/turn`, frame worst `<8 ms`; wall scan adds `<0.01 ms` per line — just confirm no `while` infinite (target monotonic). Not a new lane, just CI `npm test` timing. |
| Cross-cutting negative scan — `rg -n "music\|bgm\|RevenueCat\|AdMob" triade/src/engine --include="*.ts"` empty (engine sweep stayed in scope, no cross-cutting concern leaked) | Static scan | 1 | QA | Trivial hygiene; carry-over — no new gate, just prove sweep stayed in scope. |

**Total P3**: 4 checks, ~0.2–0.4 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch wall-scan/guard regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/engine/line.test.ts __tests__/engine/line-moved.unit.test.ts __tests__/engine/line-compaction.regression.test.ts` green on clean working tree (43 pass) — includes wall ` [null,null,null,2]→[2,…,from [[0,3]]` + gap-non-merge + cascade + short/empty guards
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore`, wall-scan typed `number`)
- [ ] `rg -n "while \(target > 0" triade/src/engine/core/line.ts | wc -l` == 1 and `rg -n "const n = line\.length" triade/src/engine/core/line.ts | wc -l` == 1 and `rg -n "canMerge\(out\[dest\]" triade/src/engine/core/line.ts | wc -l` == 1 and `rg -n "board\[r\]\?\.\[c\]" triade/src/engine/core/line.ts | wc -l` == 2 (quick scan)

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical wall compaction + guard (host only)

- [ ] 4 wall `shiftLine` multi-gap pins (`[null,null,null,2]→[2,…,from [[0,3]]]`, `[null,2,null,4]→[2,4,…]`, `[null,null,3,null]`, empty `moved false`)
- [ ] Gap-non-merge `[3,null,3,null] score 0` + cascade `[3,3,3,3] score 6`
- [ ] Short/empty 5-case guard sweep + rectangular 4×4 invariant

**Total**: 12 P0 checks (already passing in `7eacd93` — `line-compaction.regression.test.ts:11` + `line.test.ts:18` green)

### P1 Tests (<30 min)

**Purpose**: Directional pipeline + wall trace

- [ ] 4-direction `PIPELINE left/right/up/down` + `game.test.ts` 32 pass (3 wall expectations `to [0,0]/[0,3]/[3,1]` + directional spawn)
- [ ] `transitionPlan` wall `to [0,0]/[0,3]/[3,1]` + merge/hold/noop/no-leak 200 sweep
- [ ] `line.test.ts` + `line-moved` 43 pass trace `from` wall fidelity

**Total**: 16 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, bench, exploratory

- [ ] Single-wall-scan / single-`n` / `GRID_SIZE` allowlists + trace `from [[t.r,t.c]]` scan (<1 min)
- [ ] Ledger `resolution-undo` 64-hex 2 hits + `git diff --stat -- triade/src/engine` shows `line.ts` only, not `sprint-status.yaml` (<1 min)
- [ ] Ragged board exploratory + wall micro-bench + cross-cutting scan (<2 min)

**Total**: 8 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 12 | ~0.15 | ~1.0–1.8 | Pure `line.ts` + regression suite already green (done in sweep `7eacd93`); wall 4-case + gap-non-merge + cascade + 5-case short guard are O(1) host |
| P1 | 16 | ~0.2 | ~1.8–3.2 | Existing `line.test.ts:18` + `game.test.ts:32` + `transitionPlan:16` suites (4-direction pipelines + wall `to` coords + trace fidelity + ledger) — mostly existing suites, 3 wall expectation patches already landed |
| P2 | 4 | ~0.2 | ~0.5–1.0 | Static allowlists + trace `from` scan + floor/no-leak complements |
| P3 | 4 | ~0.15 | ~0.3–0.6 | Ragged exploratory + micro-bench + cross-cutting scan |
| **Total** | **36** | **-** | **~3.6–6.6** | **~0.5–0.9 days host; full gate `<15 min` (`npm test` + `tsc` + `rg`) — no device bench lane required; wall scan is O(1) <0.01ms** |

### Prerequisites

**Test Data:**

- `refLine(...vs)` 4-literal factory + `CellRef {v,r,c}` + short `[]`/`[{v:1}]`/`[null,3].slice(0,2)` + `GRID_SIZE=4` + `emptyBoard`/`staticBoard`/`boardWith`/`rngOf(0,0,0.5)` 3-draw + `mulberry32(20260808)` + `assertNoLeak`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `rg` (ripgrep) for allowlist scans (`while(target>0`, `const n = line.length`, `canMerge(out[dest]`, `board[r]?.[c]`, `GRID_SIZE`, `resolution-undo`, duplicate-GRID_SIZE)
- `npm --prefix triade exec -- tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — engine is pure TS, no native module)
- Working tree on `505c8ea` baseline + `7eacd93` delta; `triade/src/engine` delta guard `line.ts` only

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — wall 4-case + gap-non-merge + cascade + short/empty guards)
- **P1 pass rate**: ≥95% (waivers required for failures — e.g. `transitionPlan` wall `to` pins may be `WAIVED` only with trace reason if pipeline re-baselined)
- **P2/P3 pass rate**: ≥90% (informational; static allowlists must be 100%)
- **High-risk mitigations**: 100% complete or approved waivers with owner + expiry (R-001..R-003)

### Coverage Targets

- **Critical paths**: ≥90% (wall-compaction wall-most + gap + cascade + directional left/right/up/down are all critical)
- **Line engine scenarios**: 100% (`[null,null,null,2]`, `[null,2,null,4]`, empty, single, `3+3` cascade, gap `3,null,3` must be PINNED)
- **Business logic** (`shiftLine` pure + `movementLines`/`boardFromLines` length-guard + `canMerge` single predicate): ≥85%
- **Edge cases** (short `[]`/1/2, right/down reversal, full-board no-merge, 9-start `assertNoLeak`, ragged exploratory): ≥80%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (wall 4 wall + gap-non-merge + cascade + 5 short guards)
- [ ] No high-risk (≥6) items unmitigated (R-001..R-003 mitigations green or formally waived with owner+expiry)
- [ ] Wall invariant holds (`[null,null,null,2]→[2,…,from [[0,3]]]` and `[null,2,null,4]→[2,4,…]` + `transitionPlan to [0,0]/[0,3]/[3,1]`)
- [ ] Gap-non-merge invariant holds (`[3,null,3,null] score 0`, merge uses `dest` not `target`)
- [ ] No duplicate wall-scan predicate (`while(target>0…)` 1 site) and no `for(i<GRID_SIZE)` in `shiftLine` (length-driven `i<n`)
- [ ] `npx tsc --noEmit` clean for both `tsconfig.json` + `tsconfig.test.json` (no new `@ts-ignore` outside `rn-stub` ring)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+wall correctness, single-wall-scan maintainability, O(1) frame budget, wall trace opposite-edge)

---

## Mitigation Plans

### R-001: Wall-scan incomplete or overshoots — multi-gap still partial or through-merge (Score: 6)

**Mitigation Strategy:** Pin wall invariant as **exact wall + `from` fidelity**: host unit `shiftLine([null,null,null,2])` `line.map(v)` exact + `from [[0,3]]` at `0`; double-gap `[null,2,null,4]→[2,4,…]` proves sequential wall reuse; grep single wall-scan site + `canMerge(out[dest]` not `target`; transitionPlan wall `to [0,0]/[0,3]/[3,1]` ties pipeline wall to trace.
**Owner:** FE lead
**Timeline:** Immediate (gate this sweep; protects DW-74)
**Status:** Complete (code `7eacd93: line.ts:38-73` landed + `line-compaction.regression.test.ts:12-33` green + `transitionPlan.test.ts:19-61` wall `to` patched)
**Verification:** `npm --prefix triade test -- __tests__/engine/line.test.ts __tests__/engine/line-moved.unit.test.ts __tests__/engine/line-compaction.regression.test.ts` (43 pass) + `npm --prefix triade test -- __tests__/render/transitionPlan.test.ts` (16 pass) + `rg -n "while \(target > 0" line.ts` ==1

### R-002: Gap-non-merge breaks — gap-adjacent equal tiles incorrectly merge (Score: 6)

**Mitigation Strategy:** Keep `dest` vs `target` separation: shift branch uses `target` wall, merge branch uses `dest=i-1` with `canMerge(out[dest].v, t.v)`; host pin `[3,null,3,null]→[3,3,…] score 0` (not `6`) + cascade `[3,3,3,3]→[6,3,3,null] score 6`; static scan `out[target].v = t.v` 1 vs `out[dest].v = merged` 1.
**Owner:** FE
**Timeline:** Immediate
**Status:** Complete (code + 2 preserve pins landed; `rg -n "canMerge\(out\[dest\]" line.ts` ==1, no `out[target]` merge)
**Verification:** Regression `preserve: [3,null,3,null]` + `line.test.ts:91-98` green + `rg -n "canMerge\(out\[dest\]" triade/src/engine --include="*.ts"` allowlist (line + game + purity `engine.purity.test.ts` writers) + full `__tests__/engine/*.test.ts` 182 pass (per spec Auto Run)

### R-003: Short/empty guard masks ragged boards — trimmed board silent-pads and `moved`/`trace` drifts (Score: 6)

**Mitigation Strategy:** Make guard observable: `n=line.length` loop + `dest` bounds + `board[r]?.[c] ?? null` padding is defensive-only; host 5-case short guard + rectangular 4×4 invariant `lines.length===GRID_SIZE` on production boards + pipeline 4-direction byte-identical; grep guard 2 `board[r]?.[c]` sites + `i<n` not `GRID_SIZE` in `shiftLine`.
**Owner:** FE lead
**Timeline:** Immediate (gate DW-20 crash; trace/spawn)
**Status:** Complete (`movementLines` 2 `board[r]?.[c]` + `shiftLine` `n` + `boardFromLines` `lines.length/row.length` landed; 5 guard pins green)
**Verification:** `regression` DW-20 5-case guard + `line.test.ts:20-56` 4-case movement + `game.test.ts` 32 pass (4-dir pipelines byte-identical) + `rg -n "board\[r\]\?\.\[c\] \?\? null" line.ts` ==2 + `rg -n "for \(let i = 0; i < n; i" line.ts` ==1

---

## Assumptions and Dependencies

### Assumptions

1. Production `Board` is always 4×4 via `emptyBoard()`/`boardFromLines(emptyBoard())`/`staticBoard` (spec I-O: short/empty line/board inputs are harness/edge only; `deferred-work.md` DW-20 says "board é sempre compactado por direção" and production crash "re-confirmado" but masked). Guard paths are defensive-only.
2. Gap-non-merge contract: merge only when immediate predecessor `i-1` is `canMerge`-true, never through a wall-scan gap — `shiftLine` shift uses wall `target`, merge uses `dest`. Future gap semantics must not change `canMerge(1,2)` across gap (in line domain gap is erased before adjacency, so `1+2` after wall-compaction *does* merge if after shift they become adjacent — but equal `>=3` across gap stays non-merged because shifting fills wall).
3. Wall scan `while(target>0 && out[target-1].v===null)` is monotonic (`target` only decreases) and bounded to ≤3 steps for `n=4`; infinite-loop impossible because `target` decreases strictly.
4. `GRID_SIZE=4` stays fixed (spec `Always: Keep GRID_SIZE=4`); orientation mapping `GRID_SIZE-1-k` for `right`/`down` in `boardFromLines` is unchanged and correct.
5. `npx tsc --noEmit -p tsconfig.test.json` baseline is already clean after sweep (spec says `npm test` green); any new `@ts-ignore` is a regression.

### Dependencies

1. `triade/tsconfig.json` + `triade/tsconfig.test.json` — Required by host `npm test` (`TSX_TSCONFIG_PATH`) and `npx tsc --noEmit` gates. Status: Ready.
2. `triade/src/engine/core/line.ts` single wall-scan + length-guard implementation — Required before P0 wall pins. Status: Done (`7eacd93`).
3. `triade/__tests__/engine/line.test.ts` + `__tests__/engine/line-moved.unit.test.ts` + `__tests__/engine/line-compaction.regression.test.ts` (43 pass) + `__tests__/engine/game.test.ts` (32) + `__tests__/render/transitionPlan.test.ts` (16) — Required for P0/P1 wall/trace gates. Status: Ready (already in repo, wall expectations patched).
4. `deferred-work.md` ledger with `resolution-undo` hashes DW-20/74 — Required for P1 ledger verification. Status: Done (2 entries flipped `open→done 2026-09-02`).

### Risks to Plan

- **Risk**: Future `rules.ts:canMerge` predicate change (e.g. allow `1+1` or change double rule) without updating line gap/cascade pins.
  - **Impact**: `[1,1,_,_]` currently `moved false score 0` would become `moved true` + spawn — `one-cell` wall expectations would still pass but merge score drifts.
  - **Contingency**: Treat `rules.ts` + `line.test.ts` cascade pins as atomic; keep `rg -n "canMerge" triade/src/engine --include="*.ts"` allowlist (line + game + purity writers + feel `isMerge`) green as gate.

- **Risk**: New direction consumer adds a `direction==='left' ? 0 : GRID_SIZE-1` helper that duplicates `boardFromLines` `GRID_SIZE-1-k` logic and drifts on short row length.
  - **Impact**: Off-by-one on right/down wall for ragged lines → trace `to` wrong, spawn candidate misses opposite edge.
  - **Contingency**: Keep `boardFromLines` single un-reverse site (`GRID_SIZE-1-k` 2 hits) as the only mapping; `rg -n "GRID_SIZE - 1 - k" triade/src/engine/core/line.ts` ==2 (right+down) gates drift.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for any future line seam (e.g. larger `GRID_SIZE` or diagonal move) — separate workflow; not auto-run.
- Run `*automate` for broader engine coverage once production ragged-board guard is formalized (e.g. typed `Board` brand).
- Run `*nfr-assess` after implementation evidence (`line-compaction` regression 11 pass + pipeline 4-dir) to validate NFR planning without inventing thresholds.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: ______________________ Date: __________
- [ ] Tech Lead: ______________________ Date: __________
- [ ] QA Lead: ______________________ Date: __________

**Comments:**

---

---



---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`triade/src/engine/core/line.ts`** (pure) | Bump: wall-scan `while(target>0…)` + `n=line.length`/`dest` guard + `board[r]?.[c] ?? null` pad + `lines.length/row.length` truncation | `line.test.ts` 18 pass + `line-compaction.regression.test.ts` 11 pass + `line-moved.unit.test.ts` must stay green; grep wall-scan 1 site + `i<n` not `GRID_SIZE` |
| **`triade/src/engine/core/game.ts`** (`move` pipeline `movementLines→shiftLine→boardFromLines` + spawn + `trace` + `boardsEqual` + `pendingSpawn` 3-draw) | Transparent: consumes wall-compacted lines + short-guard-padded boards; directional spawn candidate `shifted[i].moved` fidelity drives opposite-edge `candidates` | `game.test.ts` 32 pass must stay green (3 wall expectations already patched); `adaptive-spawn-integration` ceiling ordering + `directional-spawn.smoke` stay green |
| **`triade/src/render/transitionPlan.ts`** (`planTileTransitions` `classify` slide/merge/hold/spawn via `trace`) | Slide `to` coordinates track wall positions (`[0,1]→[0,0]`, `[0,2]→[0,3]`, `[1,1]→[3,1]`) — wall change is observable as coordinate shift | `transitionPlan.test.ts` 16 pass must stay green (3 wall slide pins already patched); `assertNoLeak` 200-move sweep keeps `resultingTiles` ↔ `board` occupancy invariant |
| **`triade/src/engine/core/types.ts` `GRID_SIZE=4` + `rules.ts` `canMerge`** | Untouched: `GRID_SIZE` literal stays 4, `canMerge` stays `(1,2) or equal>=3`; wall/merge-once invariants reference them | `rg` scans `GRID_SIZE=4` 1 definition + `canMerge` 1 predicate site in `line.ts` (plus `game.ts`/`engine.purity` allowlist) |
| **`triade/test-utils/helpers.ts` `staticBoard`/`emptyBoard`/`rngOf`/`mulberry32`** | No change: `movementLines` padding `board[r]?.[c] ?? null` does not affect `emptyBoard()` 4×4 fixtures; `rngOf(0,0,0.5)` 3-draw budget untouched | `engine.smoke` / `render.smoke` / `session.integration` 4 smokes stay green + `helpers.hardening` draw-budget suite untouched |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (TECH/SEC/PERF/DATA/BUS/OPS, P×I scoring)
- `probability-impact.md` - Risk scoring methodology (1–3 scales, residual vs mitigated)
- `test-levels-framework.md` - Test level selection (Unit for `shiftLine` pure, Integration for `game.move`/`transitionPlan` pipelines)
- `test-priorities-matrix.md` - P0-P3 prioritization (blocks core + high risk + no workaround → P0)
- `nfr-criteria.md` - NFR planning (never-throw, maintainability single-wall-scan, frame budget O(1))

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-engine-line-compaction.md` (`baseline 505c8ea`, `final 4f6cc04`, `type: bugfix`, `status: done`)
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-20 4×4 guard + DW-74 multi-gap compaction → `done 2026-09-02`)
- Engine: `triade/src/engine/core/line.ts:16-110` (wall-scan + length guards), `triade/src/engine/core/types.ts:1 GRID_SIZE=4`, `triade/src/engine/core/rules.ts:3-9 canMerge/mergeValue`
- Tests: `triade/__tests__/engine/line.test.ts` (18), `triade/__tests__/engine/line-moved.unit.test.ts`, `triade/__tests__/engine/line-compaction.regression.test.ts` (11), `triade/__tests__/engine/game.test.ts` (32), `triade/__tests__/render/transitionPlan.test.ts` (16)
- Config: `_bmad/tea/config.yaml` (`test_artifacts: _bmad-output/test-artifacts`, `test_design_output: _bmad-output/test-artifacts/test-design`, `risk_threshold: p1`, `tea_use_playwright_utils: true`)

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6) + tri-modal step-file architecture (Create mode `steps-c/step-01…05`)
