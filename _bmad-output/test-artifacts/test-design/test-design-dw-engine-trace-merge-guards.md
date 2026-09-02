---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/rules.ts'
  - 'triade/src/engine/core/line.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/engine/line.test.ts'
  - 'triade/__tests__/engine/rules.test.ts'
  - 'triade/__tests__/render/transitionPlan.test.ts'
  - 'triade/__tests__/game/preview-invariant.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-engine-trace-merge-guards — noop trace + mergeValue guard hardening (DW-21, DW-22)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-engine-trace-merge-guards`
**Scope:** Targeted test design for the working-tree delta of `dw-engine-trace-merge-guards`

> **Delta under assessment:** Commit `35c9d1c fix(engine): trace empty on noop and mergeValue guard (DW-21/DW-22)` vs baseline `3bcf38c` (`spec-engine-trace-merge-guards.md` `baseline_revision: 3bcf38c…`, `final_revision: e325bab…`). Working-tree diff vs `HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` DW-21/DW-22 `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-trace-merge-guards` + `resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b` each + `spec-engine-trace-merge-guards.md` `Auto Run Result Status: done`); production delta is two pure-engine trace/merge guards plus spec + tightened tests:
> - `triade/src/engine/core/game.ts:50-57` — `let trace = built.trace; const moved = !boardsEqual(state.board, effectiveBoard); if (!moved) trace = [];` (was `const trace = built.trace` with no emptying) — enforces empty trace on noop (DW-21). Spawn-append `trace.push({spawned:true})` only reached inside `if (moved)`, so noop never spawns. Effective path `trace` remains the `built.trace` reference (transient object, alias benign).
> - `triade/src/engine/core/rules.ts:5-17` — `export function mergeValue(a,b) { if (!canMerge(a,b)) return (a??0)<=2 ? 3 : (a??0)*2; return (a??0)<=2 ? 3 : (a??0)*2; }` plus JSDoc `DW-22: defensive guard — only ever called under canMerge in shiftLine; outside the guard we intentionally ignore the second operand` (DW-22). Both branches identical — tautological by spec intent "defensively ignore b outside canMerge" to preserve parity under guarded call sites; direct unguarded `mergeValue(3,6)` still returns `6` (doubled `a`) rather than throwing.
> - `triade/src/engine/core/line.ts:73-76` — doc comment `DW-21: boardFromLines always returns a full placement trace; the noop contract (empty trace) is enforced in game.move after the boardsEqual check so effective-move traces stay meaningful and noop traces stay empty.` No functional change — `boardFromLines` still pushes every non-null `ShiftedCell` (`v !== null`) regardless of whether the tile moved; `shiftLine.moved` stays value-based `out.some(cell.v !== line[i].v)`.
> - `triade/src/engine/core/types.ts:43-57` unchanged — `TraceEntry {value,to,from,spawned}` + `MoveResult {board,score,moved,trace,pendingSpawn}` + `Rng () => number` + `GRID_SIZE=4` rectangular contract preserved per `Always`.
> - `triade/src/render/transitionPlan.ts:21-54` byte-identical — `planTileTransitions` already short-circuits `if (!result.moved) return []` so empty trace is compatible; `classify` handles `spawned→spawn`, `from.length===2→merge`, `sameCell(from[0],to)→hold` else `slide`.
> - `triade/__tests__/engine/rules.test.ts:28-45` unchanged — 6 cases (`canMerge` 3× + `mergeValue` 3×) all green — includes `mergeValue(1,1)→3` and `mergeValue(2,2)→3` (non-mergeable via `canMerge` but expected 3, matching tautological guard) and `mergeValue(3,null)→6`.
> - `triade/__tests__/engine/line.test.ts` unchanged — `shiftLine` wall/merge/cascade + `boardFromLines left` mappings all green.
> - `triade/__tests__/engine/game.test.ts:238+` unchanged except `trace: noop → filter spawned` still green — noop still `moved:false, score 0`.
> - `triade/__tests__/game/preview-invariant.test.ts:373` tightened `assert.strictEqual(noopRes.trace.length, 0, 'noop trace must be empty')` (was `16 stationary`) — DW-21 probe.
> - `triade/__tests__/render/transitionPlan.test.ts:108` tightened `assert.strictEqual(result.trace.length, 0, 'DW-21: noop trace must be empty')` + title `noop move … empty trace (DW-21)` (was `trace still describes stationary board`).
> - Ledger `deferred-work.md` — DW-21 (`Noop moves return a full trace of stationary tiles`) and DW-22 (`mergeValue ignores its second operand outside the canMerge guard`) flipped `open→done 2026-09-02` + `resolution-undo: b4557fd…` each.

---

## Executive Summary

**Scope:** Harden the pure engine trace contract and the merge predicate seam that feed `transitionPlan` animation and scoring. Before the sweep a full-board non-mergeable `move('left')` returned `moved:false, score:0` but `trace` leaked 16 stationary `TraceEntry` objects (every placed tile `v!==null` emitted by `boardFromLines`), polluting the `moved ⟺ trace.length>0` invariant and leaving a `resultingTiles` ghost path (DW-27 manual-only) and an `App/GameBoard` `busyRef` deadlock risk if a future consumer inspected `trace.length` instead of `moved`. `mergeValue(a,b)` computed `(a??0)<=2?3:a*2` without reading `b`, so `mergeValue(3,6)` or `(1,1)` silently returned `6`/`3` — a second-operand-blind merge that only survived because `shiftLine` already gates via `canMerge(a,b)` before calling. After guards the engine emits `trace:[]` on noop (no spawned entry, length 0, 0 RNG draws, `pendingSpawn` shallow-copied) and `mergeValue` has an explicit `if (!canMerge(a,b))` gate that documents the `b`-ignoring posture (both branches still `a`-only, so guarded call sites are byte-identical and unguarded direct calls degrade to `a`-only rather than throwing). Production blast radius on valid boards is zero (valid moves only flow via `canMerge`-guarded `shiftLine`, noop boards are the only reporters of empty trace), but the fence is load-bearing for correctness: a future consumer that enumerates `trace` instead of `moved`, a fuzz harness that calls `mergeValue` unguarded, or a parity oracle that asserts trace length would have observed divergent stationary vs empty traces and silently-doubled non-mergeable values.

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (≥6): 3
- Critical categories: TECH (noop `trace.length===0` vs stationary leak 16, `mergeValue` tautological `a`-only vs `b`-sensitive throw, `boardFromLines` full-placement vs meaningful-only), BUS (trace→animation `hold/merge/slide/spawn` taxonomy vs manual ghost, score inflation `moved:false score>0` never happens today but contract), DATA (draw budget 0 noop / 3 effective, `pendingSpawn` shallow-copy isolation, `boardsEqual` vs `shiftLine.moved` convergence)

**Coverage Summary:**

- P0 scenarios: 8 groups (host unit, pure `move` noop empty-trace 4-dir + merge 1+2 trace 3 merge+spawn + mergeValue non-mergeable `a`-only vs guarded 1+2→3/3+3→6 + manual probe gate)
- P1 scenarios: 6 groups (engine pipeline `shiftLine→boardFromLines→game.move→planTileTransitions` + existing `game.test.ts` 33 + `line.test.ts` + `rules.test.ts` + `transitionPlan.test.ts` + `preview-invariant` + `game.purity` + draw budget 0/3/20 + ADR-06 snapshot isolation)
- P2/P3 scenarios: 5 groups (single-guard scans per file, tautology pin, alias/borrow scan, ledger `resolution-undo`, exploratory ragged/1-cell/noop-score)
- **Total effort**: ~2.6–4.8 hours (~0.4–0.6 days; host-only, no device lane — pure engine TS `npm test` + `tsc` gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score invariants beyond trace — `canMerge(1+2→3, >=3 equal)` predicate, `mergeValue` doubling vs `1+2→3`, merge-once cascade `[3,3,3,3]→[6,3,3,null]`, one-cell-per-swipe `shiftLine` loop `i → i-1`, wall-scan per `movementLines`, `GRID_SIZE=4`, spawn pick `pickIndex` NaN clamp, `weightedValue` single-roll `pickCombined`, `resolveSpawn` tier chain** | `git diff --stat -- triade/src/engine` between baseline `3bcf38c` and `35c9d1c` shows only `game.ts` + `rules.ts` + `line.ts` (doc) changed; `board.ts`/`ceiling.ts`/`pot.ts`/`spawn.ts`/`weights.ts` byte-identical. `git diff HEAD` shows only `deferred-work.md` + `spec-engine-trace-merge-guards.md` — no line/score/spawn/weights/ceiling change. | Engine invariants stay gated by existing `__tests__/engine/*.test.ts` 182+ pass (per spec Auto Run `910 pass / 0 fail / 238 skipped` baseline) + `git diff --stat -- triade/src/engine` shows 5-line behavioral contract hardening as gate. |
| **Ceiling/tier pipeline `ceilingDetector`/`tierForCeiling`/`potForTier`/`potWeights`, spawn draw budget `20 newGame / 3 effective / 0 noop`, `previewFor` ambiguous band `<0.6 exact else range`, `matchOrchestrator`/`undo`/`rewardedAd`/`entitlements`** | Spec Boundaries `Always: Preserve … 3-draw effective-move budget (0 on noop)` + `Never: Change spawn draw budget` — `spawn.ts` byte-identical, `types.ts: Rng` draw contract unchanged. | This plan pins budgets via `rngOf(0,0,0.5)` 3-call + `noop 0-call` host probes and keeps `adaptive-spawn-integration` + `pending-spawn-contract` suites green as gate (not re-pinned here). |
| **Changing `TraceEntry`/`MoveResult`/`Board` shapes, altering `score` accumulation vs `matchScore.applyMove`, capping `tierForCeiling` or `potForTier`, reworking `spawnTile` candidates** | Spec `Block If: Changing GRID_SIZE, altering merge scoring, changing spawn draw budget, or requiring new native harness` + `Never: Enlarge public TraceEntry shape`. | This plan pins shapes via `rg -n "interface TraceEntry" triade/src/engine/core/types.ts` + `rg -n "interface MoveResult"` + `GRID_SIZE=4 single definition` + `score` noop `0` via `game.test.ts`. Changing shapes would require architecture review (Block If). |
| **Layout/HUD/feel/monetization — `layout.ts` clamps, `App.tsx` `bandTop`/`Hud.tsx topPad`, `src/feel` haptics/punch/shake/bullet/sfx, `App.tsx`/`GameBoard.tsx` Skia/Reanimated reconcile, `RNGH` gesture swipe pipeline, `matchScore` NaN/-5/Infinity guard (DW-24 separate sweep)** | Spec `Never: Touch layout/HUD/feel/monetization` — no feel/render/layout code changed. | Existing `feel.*` + `layout.test.ts` + `App.tsx` wiring remain gate; not exercised here. |
| **RevenueCat / AdMob / IAP / Epic 9-11 a11y** | No monetization/a11y code touched. | Existing suites remain gate. |
| **Production `Board` always 4×4 via `emptyBoard()` — short/ragged board crash guards, fractional `tierForCeiling`, `spawnTile` mutation hygiene** | These are already hardened by `dw-engine-line-compaction` / `dw-engine-ceiling-hardening` / `dw-engine-spawn-mutation-hygiene` sweeps; this sweep scopes only trace + mergeValue seams. | Captured as residual transparency — not re-verified beyond `rg` doc pins; those sweep specs remain reference. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** All modified seams are pure with no `expo-*`/`Skia`/`RNGH`/`MMKV` dependency: `move(Board, Direction, Rng)→MoveResult` with only `Board 4×4` + `Direction` + `Rng () => number`; `mergeValue(Cell,Cell)→number` with only two `Cell number|null`; `boardFromLines(ShiftedCell[][], Direction)→{Board,TraceEntry[]}` pure. Every path is host-testable via `node --import tsx --test` with `boardWith([[1,3,6,12],…])` full non-mergeable board, `staticBoard([1,2,null,null])` row fixture, `emptyBoard()` 4×4, `gameState(board)` + `rngOf(0,0,0.5)` deterministic 0-draw noop / 3-draw effective, and direct `mergeValue(a,b)` scalar probes `[(1,1),(2,2),(3,6),(1,3),(null,3),(3,null),(null,null)]` vs guarded `(1,2),(2,1),(3,3)`.

**Observability — Good.** Outputs deterministic: noop `moved:false, score 0, trace [] length 0, spawned 0, pendingSpawn shallow-copy {value, displayRoll} unchanged, 0 draws`; effective `moved:true, score>0, trace length 2..5 includes merged entry `from [[r,c],[r,c+1]] value 3` + `spawned:false` plus `spawned:true` at opposite edge, board `v` at `to` cells. `mergeValue` returns `3` for `a<=2` else `a*2` observable as `mergeValue(1,1)===3` (tautology) vs `mergeValue(3,3)===6`. `boardFromLines` trace length observable as `16` on effective full board (if `game.move` bypassed) vs `0` after `game.ts` noop guard — `planTileTransitions` compresses either `[]` or `trace` to plan `[]` vs `[{type:'hold'}`] so divergence detectable.

**Reliability — Strong (engine never throws, helpers never throw).** `game.move` noop guard is `let trace = built.trace; if (!moved) trace = []` — no new allocation on effective path (alias benign), empty array literal on noop path O(1). `mergeValue` guard is `if (!canMerge(a,b)) return (a??0)<=2?3:(a??0)*2` — no throw, finite number always. Both `tsc` gates (`tsconfig.json` + `tsConfig.test.json`) clean; `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/rules.test.ts __tests__/render/transitionPlan.test.ts __tests__/game/preview-invariant.test.ts` full gate `<15 min` (910 pass / 0 fail baseline per spec `Auto Run Result`).

**Testability Risks:** Two surfaces are thin: (a) `mergeValue` tautology — both branches compute from `a` only, so direct `mergeValue(1,1)` returning `3` is the same as guarded `mergeValue(1,2)===3`; a reviewer that expects `mergeValue(1,1)` to throw or return non-merge sentinel would still see `3` and the guard would appear to "do nothing" (R-002). Mitigated by scan `if (!canMerge` 1 hit + valid `(1,2)→3, (3,3)→6` pins. (b) `game.move` alias `let trace = built.trace` — `trace.push(spawn)` mutates `built.trace` through shared ref; an extra writer that retained `built` would see leaked spawn entry (R-008). Mitigated by effective-path transient pin `built` not retained + `boardFromLines` pure check.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH / DATA | **Noop trace leak regression — `moved:false` returns 16 stationary `TraceEntry` instead of `[]`, polluting trace contract, animation `resultingTiles` ghost, `moved ⟺ trace.length>0` invariant divergence.** Before fix `built.trace` had 16 entries (every `v!==null` `ShiftedCell` emitted via `boardFromLines` regardless of `moved`) and `game.ts` assigned `trace = built.trace` before checking `moved`, so `preview-invariant.test.ts` asserted `16` and `transitionPlan.test.ts` asserted `trace.length>0`. After fix `if (!moved) trace=[]` so noop trace is empty, `spawned 0`, `pendingSpawn` copy unchanged. Risk: a revert that removed the `if (!moved) trace=[]` line or moved `trace` assignment after `moved` check back to `const` would re-emit 16 stationary holds, breaking `planTileTransitions` parity `moved:false→[]` still holds but trace consumers that enumerate `trace` (preview, `resultingTiles` oracle, `gameState` snapshots) would see phantom tiles. Full-board noop is the common `isGameOver` probe path, so leak is high-frequency on jammed boards. | 2 | 3 | **6** | Enforce empty-trace contract: (a) **host P0 pins** `board = boardWith([[1,3,6,12],[1,3,6,12],[1,3,6,12],[1,3,6,12]]); move(state(board),'left',rngOf(0,0,0.5)) → {moved:false, score:0, trace.length===0, trace.filter(spawned).length===0}` + 4-dir same board `up/right/down` also `0` + `spyRng noop 0 draws` ; (b) **static scan** `rg -n "if \(!moved\) trace" triade/src/engine/core/game.ts` ==1 and `rg -n "let trace = built" triade/src/engine/core/game.ts` ==1 and `rg -n "trace\.push" triade/src/engine/core/game.ts` ==1 (only inside `if (moved)`); (c) **pipeline tie** `preview-invariant.test.ts:373` `length 0` + `transitionPlan.test.ts:108` `length 0` stay green — valid trace leak would flip both to 16 and fail. | FE lead | Immediate (gate DW-21; protects animation/busyRef) |
| R-002 | TECH / BUS | **Merge `mergeValue` tautological guard — `canMerge` gate does not make result `b`-sensitive; non-mergeable `(1,1)`, `(2,2)`, `(3,6)`, `(null,3)` still return silently-doubled-looking `3`/`6`, masking caller bug without fail-fast.** Before fix `mergeValue(a,b)` was `return (a??0)<=2?3:(a??0)*2` ignoring `b` entirely. After fix both branches still `a`-only (`if (!canMerge) return a-only; return a-only;`) — spec intent is "defensively ignore second operand outside canMerge" so guarded `shiftLine` call sites (`canMerge` then `mergeValue`) stay byte-identical, but direct calls `mergeValue(1,1)` return `3` and `mergeValue(3,6)` returns `6` (looks merged), so a future caller that forgot to `canMerge`-gate would silently get a wrong merged value instead of throw/`null` sentinel. Spec I-O `ERROR_CASE mergeValue without canMerge` says prefer throw or safe non-merge sentinel but implementation chose non-throw `a`-only — triaged as spec-compliant in `Review Triage Log` (11 reject as tautology/false-confidence claims). Risk: a second sweep that "strictened" to `throw` would require test migration (`rules.test.ts` expects `mergeValue(1,1)→3`). | 2 | 3 | **6** | Document tautology, pin it: (a) **host P0 pins** `mergeValue(1,1)===3 && mergeValue(2,2)===3 && mergeValue(3,6)===6 && mergeValue(null,3)===6 && mergeValue(3,null)===6` (all `a`-only, no throw) + guarded `mergeValue(1,2)===3 && mergeValue(2,1)===3 && mergeValue(3,3)===6 && mergeValue(6,6)===12`; (b) **static scan** `rg -n "if \(!canMerge" triade/src/engine/core/rules.ts` ==1 and `rg -n "canMerge\(a, b\)" triade/src/engine/core/rules.ts` ==2 (def + guard) and `rg -n "\(a \?\? 0\) <= 2" triade/src/engine/core/rules.ts` ==2 (both branches same formula — tautology explicit); (c) **pipeline tie** `rules.test.ts` 6 pass stays green — `mergeValue(1,1)→3` expected, so hardening is observational not behavioral under guarded path. | FE lead | Immediate (gate DW-22; document residual throw vs `a`-only trade-off) |
| R-003 | TECH | **`boardFromLines` full-placement vs meaningful-only boundary — `boardFromLines` still emits every `v!==null` ShiftedCell (stationary + slide + merge target) so an effective move trace contains `hold` entries for stationary tiles on lines that did not compact, while noop trace is emptied only in `game.move` — inconsistency risks future filter at `boardFromLines` that drops holds on partial moves.** Before fix `boardFromLines` was described as leak source; fix at `game.ts` keeps `line.ts` purity and preserves hold semantics on effective partial boards (`transitionPlan.test.ts: stationary tiles become hold`). Risk: a follow-on that moved the `if (!moved) trace=[]` filter into `boardFromLines` (e.g. `if (lineShift.moved) push else skip`) would drop `hold` entries on effective moves where only 1 of 4 lines moved, making `planTileTransitions` lose `hold` and `GameBoard` drop stationary tiles (phantom). Production trace today on effective `[1,2,_,_]` left has `merged@ [0,0] + hold... + spawn@ [0,3]` — dropping holds would be a regression. | 2 | 3 | **6** | Pin where the filter lives: (a) **host P0 pins** effective partial `board = boardOf([1,2,null,null],[3,null,null,null]) left → moved:true, trace has merge + slide/hold + spawn` vs noop full `boardOf([1,3,6,12]×4) left → trace 0`; (b) **static scan** `rg -n "DW-21: boardFromLines always returns a full placement trace" triade/src/engine/core/line.ts` ==1 and `rg -n "if \(!moved\) trace = \[\]" triade/src/engine/core/game.ts` ==1 — noop empty is in `game.ts` not `line.ts`; `rg -n "if \(.*moved.*\) trace\.push\|if \(.*moved.*\) continue" triade/src/engine/core/line.ts` ==0 (no filter in line.ts); (c) **pipeline tie** `transitionPlan.test.ts hold stationary becomes hold transitions in a partial move` stays green — proves holds survive on effective moves. | FE lead | Immediate (gate DW-21 boundary; protects hold semantics) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | DATA | **Draw-budget regression — noop must stay `0` draws, effective stays `3` draws (cell pick + next value + displayRoll).** `game.move` noop path copies `safePending` without `resolveSpawn(ceiling,rng)` or `rng()` for displayRoll, so `rngOf` not consumed. A guard that called `rng()` inside the `if (!moved) trace=[]` block or that conditioned spawn on `trace.length` instead of `moved` would shift budget. | 1 | 3 | 3 | Pin budgets: host `spyRng` `noop calls 0` + `effective calls 3` (`rngOf(0,0,0.5)` left) + `newGame 20` unchanged; scan `rng` appears only in `pendingSpawn = {value: resolveSpawn(ceiling,rng), displayRoll: rng()}` 1 site + `spawnTile(... rng ...)` 1 site, not in `trace=[]` branch. |
| R-005 | BUS | **Hold vs stationary vs empty trace taxonomy — full noop `trace []` vs partial effective `trace [hold, slide, merge, spawn]` vs packed non-mergeable line `[1,3,6,12] left` is noop (empty) not 4 holds.** Spec `HOLD vs STATIONARY` says `[1,3,6,12]` left is noop so empty, not one hold per cell. A follow-on that emitted holds on noop would violate AC-4 no-leak and resurrect `resultingTiles` ghost (DW-27 manual-only). | 1 | 3 | 3 | Pin: host `shiftLine([1,3,6,12]).moved === false` + `boardOf` compact packed left → `trace 0` not `4`; `transitionPlan` `moved:false→[]` still short-circuits regardless of trace length (both post- and pre-fix compatible). |
| R-006 | TECH | **`moved` divergence — `shiftLine.moved` (value-based per line `out.some(v!==line[i].v)`) vs `game.move.moved` (`!boardsEqual(before,effective)`) must converge.** If a future refactor made `shiftLine.moved` line-compacted-index based instead of value based, the two could diverge (one says moved, other empty board equal). Current impl converges by construction (boardsEqual compares whole board derived from all lines). | 1 | 3 | 3 | Pin convergence: host `shiftLine([1,3,6,12]).moved===false` matches `move(boardWith([1,3,6,12]×4),'left').moved===false` plus `shiftLine([3,null,3,null]).moved===true` matches `move(staticBoard([3,null,3,null]),'left').moved===true`. |
| R-007 | TECH | **Trace spawned flag on noop — `spawned:false` stationary vs `spawned:true` spawn must not appear on noop.** Noop trace empty trivially has `spawned 0`, but if guard were placed after spawn push instead of before, a full-board effective move that vacates a candidate then spawns could be missed on a noop that erroneously spawned via `candidates` pool. Current guard is before `if (moved) { spawnTile … trace.push(spawn) }` so order safe. | 1 | 3 | 3 | Pin: host noop `trace.filter(spawned).length===0` + effective `trace.filter(spawned).length===1` (`[1,2,null,null] left → spawn at [0,3]`) + `spawned` only appears at `trace[spawn].spawned===true && to===candidates[0]` opposite edge. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | TECH | **`let trace = built.trace` alias/borrow — effective path shares `built.trace` array ref with `built` transient; `trace.push(spawn)` mutates `built.trace` through shared ref. Benign because `built` is a transient `{board,trace}` not retained, but a future writer that held `const b = built; … b.trace.length` after spawn would see leaked spawn entry.** | 1 | 2 | 2 | Monitor — scan `let trace = built.trace` 1 hit + `const trace = built.trace` 0 (mutated via `if (!moved)`) and note transient not retained; keep `boardFromLines` pure and `game.move` as the only owner of `built`. |
| R-009 | OPS | **Deferred-ledger `resolution-undo` hash coupling + `sprint-status.yaml` ownership.** Sweep marks DW-21/DW-22 `done` with `resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b 2026-09-02 7374617475733a206f70656e`; `sprint-status.yaml` is orchestrator-owned and must not be written or reverted by this workflow. | 1 | 2 | 2 | Monitor — `git diff --stat` gate shows `deferred-work.md` + `spec-engine-trace-merge-guards.md` but NOT `sprint-status.yaml`. Any reopen must keep 64-hex hash; this plan never writes the latter. |

### Risk Category Legend

- **TECH**: trace empty vs stationary 16 leak, `boardFromLines` full-placement vs meaningful-only, mergeValue tautological `a`-only vs `b`-sensitive, `moved` divergence `shiftLine.moved` vs `boardsEqual`, alias/borrow `let trace=built.trace`
- **SEC**: none this sweep (pure engine math, no auth/data exposure; `canMerge`/`trace` are data math, not security boundary)
- **PERF**: `if (!moved) trace=[]` O(1) per move, no loop — no perf risk (score 1 below)
- **DATA**: draw budget 0/3/20, `pendingSpawn` shallow-copy isolation, `boardsEqual` convergence, `TraceEntry` taxonomy
- **BUS**: merge 1+2→3 vs 3*2 wrong doubling, hold/merge ghost vs animation, noop score inflation (already 0 by construction)
- **OPS**: `resolution-undo` 64-hex + `sprint-status.yaml` ownership + `tsc` gates

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-engine-trace-merge-guards` touches the **engine trace/merge seam only**: **reliability/never-throw + determinism** (every `move`/`mergeValue`/`planTileTransitions` finite and non-throwing on any `Board`/`Cell` including empty/ragged/null), **maintainability (single noop guard `if (!moved) trace=[]` + single `canMerge` gate + single DW-21 doc on `boardFromLines` + single 64-hex `resolution-undo`)**, **correctness** (noop trace `[]` vs effective meaningful trace `holds+slides+merges+spawn`, merge 1+2→3 else double `a`, no `TraceEntry` shape enlargement), **60 FPS/frame budget unchanged** (O(1) guards, no worklet), and **offline/installability** unchanged (no new deps).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw + finiteness | `move` never throws on any `Board` 4×4 plus no-movement vs effective; `mergeValue` never throws on `NaN/null/0/false` Cells and always returns finite `>=3` (1+2→3 else `a*2`); `planTileTransitions(moved:false, trace:[])` returns `[]` without reading `trace`; trace entries always finite `value>0,to 0..3,from 0..2 length,spawned boolean`. | R-001, R-002 | Host unit negative-path sweep: `move(boardFull,'left',rngOf(0,0,0.5)).trace===[]` + 4-dir same + `mergeValue(1,1)===3 && mergeValue(null,3)===6 && mergeValue(3,6)===6` no throw + `planTileTransitions(board, {moved:false,trace:[]})===[]` + `boardFromLines(fullGrid) trace 16` still succeeds (effective). | `triade/__tests__/engine/rules.test.ts` 6 + `triade/__tests__/engine/line.test.ts` wall + `triade/__tests__/engine/game.test.ts` `trace: noop → no spawned` + `preview-invariant` `length 0` + both `tsc` clean |
| Maintainability | Single `let trace = built.trace` + single `if (!moved) trace=[]` in `game.ts`; single `if (!canMerge` in `rules.ts`; single DW-21 JSDoc on `boardFromLines` in `line.ts`; single 64-hex `resolution-undo` per DW; no duplicate guard site; no `TraceEntry` field addition. | R-001, R-002, R-003, R-009 | Static scans: `rg -n "let trace = built\.trace" triade/src/engine/core/game.ts` ==1, `rg -n "if \(!moved\) trace" triade/src/engine/core/game.ts` ==1, `rg -n "if \(!canMerge" triade/src/engine/core/rules.ts` ==1, `rg -n "DW-21: boardFromLines always returns" triade/src/engine/core/line.ts` ==1, `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` shows 2 new 64-hex entries DW-21/22. | Source scans + `game.ts:50-57` + `rules.ts:5-17` + `line.ts:73` diffs + ledger diff |
| Correctness — trace contract + merge ladder | Noop contract `moved:false → trace.length===0 && score===0 && spawned===0` (`Always: preserve … TraceEntry {value,to,from,spawned} contract`); effective contract `moved:true → trace.length>0 includes at least 1 slide/merge + 1 spawn at opposite edge, `moved ⟹ planTileTransitions length>0` and hold semantics preserved on partial moves; merge contract guarded call `(1,2)→3, (3,3)→6` vs unguarded `a`-only tautology documented not thrown. | R-001, R-003, R-005, R-007 | Host boundary suite: `boardWith 1+2→merged 3@[0,0]+spawn [0,3]` + `[3,null,3,null] left → trace 2+spawn` + packed `[1,3,6,12]×4 → 0`; plus `rules.test.ts` `1+2→3 / 3+3→6` 6 pass + `line.test.ts` cascade `[3,3,3,3]→[6,3,3,null]`. | `game.test.ts` `HAPPY_PATH/Cascade/ONE_CELL` + `rules.test.ts` 6 + `line.test.ts` 7 + `transitionPlan` hold stationary case |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn`, frame worst `<8 ms`, device `p99 <16.7 ms`. Guard adds `if (!moved)` O(1) `<0.001 ms` per `move`; `mergeValue` adds `canMerge` two `===` checks O(1). No new allocation on effective path (alias), single `[]` literal on noop. | — | Host gate only: `npm --prefix triade test` full gate median per `game.test.ts` `<1 ms` (observed `<1 s` for 33-case suite); `feel.bench.test.ts` both-profile budget unchanged. | CI `npm test` timing + both `tsc` clean; no bench lane |
| Compliance — move→trace→plan chain | `move→boardFromLines→game.move(if!moved [] else trace+spawn)→planTileTransitions` chain must stay deterministic; `trace` empty on noop short-circuits `planTileTransitions` to `[]` without reading entries; any `spawned:true` leak on noop would corrupt `resultingTiles` oracle and `GameBoard` reconcile (DW-27 ghost). | R-001, R-003, R-007 | Host + pipeline: `game.test.ts` 33 pass + `transitionPlan.test.ts` `noop empty plan and empty trace` + `preview-invariant` `noop trace must be empty` + `helpers` `resultingTiles` oracle `occupiedCells` host. | `transitionPlan.test.ts` noop + hold stationary pair + `engine.smoke` full-board |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (trace is pure TS `types` + `line` + `rules` + `game`). | — | `npm --prefix triade test` offline (no network) still green. | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. Guard cost `<0.001 ms` is observed, not threshold-invented; `TraceEntry` shape `value/to/from/spawned` contract is already pinned in `types.ts:43-57` (no PRD threshold). If a future sweep introduces a `trace.length` cap, record its measured full-board max as baseline rather than inventing a threshold. `mergeValue` throw vs `a`-only sentinel choice is spec `Review Triage Log` decision — not NFR-invented.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-engine-trace-merge-guards.md` intent/boundaries/I-O matrix 5 rows + 4 tasks 5 ACs signed; DW-21/22 ledger entries `open→done` reviewed; Review Triage `intent_gap 0 / patch 0 / defer 2` acknowledged)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsx` + `tsconfig.test.json` (`TSX_TSCONFIG_PATH`) + `helpers.ts` `boardWith`/`staticBoard`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32` + `resultingTiles` oracle)
- [ ] Test data available or factories ready (`boardWith([[1,3,6,12]×4]) 16-cell full non-mergeable + `staticBoard([1,2,null,null])` row 0 merge fixture + `emptyBoard()` 4×4 + `boardWith([[1,3,6,12],[1,3,6,12],…])` 4-dir probe + `mergeValue` scalar sweep `[(1,1),(2,2),(3,6),(1,3),(null,3),(3,null),(null,null),(1,2),(2,1),(3,3),(6,6)]` + `rngOf(0,0,0.5)` 3-draw effective / `rngOf(0,0.5)` 0-draw noop)
- [ ] Feature deployed to test environment (commit `35c9d1c` on host — `game.ts:50-57` + `rules.ts:5-17` + `line.ts:73` patched + `preview-invariant` + `transitionPlan` tightened + ledger `deferred-work.md` DW-21/22 + spec `Auto Run Result Status: done`; baseline `3bcf38c` committed; `git diff --stat -- triade/src/engine` shows `game.ts`+`rules.ts`+`line.ts(doc)` only)
- [ ] No ceiling/spawn/feel/layout edits (`git diff --stat -- triade/src/engine -- triade/src/feel triade/src/ui triade/src/services` shows `game.ts`+`rules.ts`+`line.ts` only inside engine) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`move` noop empty-trace 4-dir + `merge 1+2` trace `3+spawn` + `mergeValue a-only vs guarded 1+2→3`/3+3→6 — host pins green)
- [ ] All P1 tests passing (or failures triaged with waivers) — `game.test.ts` 33 + `line.test.ts` 7+ + `rules.test.ts` 6 + `transitionPlan.test.ts` hold/slide/merge/spawn + `preview-invariant` `0` + `purity`/`smoke` green, draw 0/3/20 intact
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on two seams; `rg` allowlists for single `if (!moved) trace` + single `if (!canMerge` + single `DW-21 boardFromLines` green)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (both via `TSX_TSCONFIG_PATH`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness+valid-path byte-identical, single-guard maintainability, O(1) frame budget, `moved ⟺ trace` chain)


## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns two-seam P0 guard pins (noop empty-trace 4-dir + `mergeValue` tautology vs guarded 1+2/3+3, `preview-invariant` + `transitionPlan` tightening), ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `game.ts` `if (!moved) trace=[]` vs stationary 16 leak, `rules.ts` `canMerge` gate vs `a`-only merge math, `line.ts` DW-21 doc vs full-placement trace, hold semantics on partial moves, draw budget `0/3` preservation |
| PM | PM | Signs `engine-never-throws` posture (noop empty trace, malformed `mergeValue` `a`-only not throw, valid-path unchanged, `TraceEntry` shape preserved), accepts tautology residual (`a`-only not throw) per spec Review Triage (11 reject) |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, already green (manual probe + existing suites 33+6+13)

**Criteria**: Blocks `trace.length 16→0` leak or `mergeValue` silent `b`-ignore misleading merge or `hold` ghost on animation vs no workaround (every move flows through `game.move`→`boardFromLines` and `shiftLine`→`mergeValue`)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `move(boardWith([[1,3,6,12]×4]),'left',rngOf(0,0,0.5)) → {moved:false, score:0, trace.length===0, spawned 0, pendingSpawn copy unchanged}` (DW-21 happy noop) | Unit | R-001, R-005 | 1 | QA (done) | Spec I-O `HAPPY_PATH noop` row + `boardWith` 16-cell full non-mergeable fixture — `assert.equal(trace.length,0)` tightened in `preview-invariant:373` + `transitionPlan:108`. |
| AC — same full board noop `up`/`right`/`down` also `trace 0` (4-dir coverage, wall-agnostic) | Unit | R-001 | 3 | QA (done) | `movementLines` packs left/right rows vs up/down cols; all four dirs must hit `boardsEqual → !moved → []` same gate. Add only if not already pinned by `game.test.ts` 4-dir sweep. |
| AC — effective `staticBoard([1,2,null,null]) swipe left → moved:true, score 3, trace merged@[0,0] value 3 from [[0,0],[0,1]] + spawned@[0,3] value 1, moved one-cell+merge` | Integration (game) | R-003, R-005 | 1 | QA (done) | `game.test.ts: HAPPY_PATH 1+2→3` already green but trace-filter `boardFromLines` change would break merge `from` preservation — pin `trace.find(value===3 && !spawned).from` 2-length. |
| AC — effective with gaps `staticBoard([3,null,3,null]) left → moved:true, trace slides `[3→0:0],[3→0:1]` no merge, `score 0` but `trace length 2+spawn` (no stationary duplicates, score preserved) | Unit | R-003, R-005 | 1 | QA (done) | Spec I-O `HAPPY_PATH effective with gaps` — boardFromLines full-placement intentionally keeps gap-fill traces; game guard must NOT empty this (only noop). |
| AC — `mergeValue` unguarded tautology: `mergeValue(1,1)===3 && (2,2)===3 && (3,6)===6 && (null,3)===6 && (3,null)===6 && (null,null)===3` (all `a`-only, no throw, no `b`-doubling) | Unit | R-002 | 2 | QA (done) | Spec I-O `ERROR_CASE mergeValue without canMerge` — `defensive: no silent doubling` but implementation keeps `a`-only so `3,6→6` looks doubled; pin that it is `a`-only (not `a*2+b` or `b*2`) and `canMerge(3,6)===false` gate exists. |
| AC — `mergeValue` guarded still correct: `mergeValue(1,2)===3 && (2,1)===3 && (3,3)===6 && (6,6)===12 && (12,12)===24 && (1,null) merges? canMerge false but mergeValue(1,null)===3` | Unit | R-002 | 2 | QA (done) | `rules.test.ts:28-45` already green — `canMerge(1,2) true →3`, `mergeValue(3,3)→6` — ensures guard did not flip valid doubling vs `1+2→3` special. |
| AC — Manual probe gate from spec Verification (single `node --loader tsx` 3-log run): `move(fullBoard,'left').trace===[] && moved===false` + `move([1,2,_,_],'left').trace merge 3` + `mergeValue(3,6)===6 a-only && canMerge(3,6)===false` | Unit | R-001, R-002 | 1 | QA (done) | Spec `Verification` commands — `npm --prefix triade test` plus 3-log probe. Run host, expect `[] false` + `merged 3` + `6 && false`. |
| AC — Valid-path smoke: packed non-mergeable `[1,3,6,12] left` stays `trace 0` not `4 holds` (HOLD vs STATIONARY) and `[1,1,_,_] left → moved:false trace 0` no spurious 1+1 merge | Unit | R-005 | 1 | QA (done) | `game.test.ts: NO_1_1_MERGE` already expects `moved:false` — verify trace emptiness not just moved. `shiftLine([1,3,6,12]).moved===false` cross-checks. |

**Total P0**: 12 checks (noop 1+3 + effective gaps 2 + mergeValue 4 + probe 1 + hold-vs-stationary 1), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & wall pipeline

**Criteria**: Important valid-path byte-identical pipeline + medium/high risk + common game workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| `game.test.ts` 33 suites still green: `newGame 9 tiles`, `weightedValue 40/40/20`, `HAPPY_PATH 1+2→3`, `MERGE_GE3 cascade`, `ONE_CELL 1-cell ×4 dirs`, `GAME_OVER 4` (`boardWith` full non-mergeable), `trace: noop → no spawned`, `pickIndex clamp`, `3-draw effective` | Integration (game) | R-001, R-003, R-004, R-006 | 33 | QA | `npm test -- __tests__/engine/game.test.ts` 33 pass — byte-identical guard keeps 0/3/6/12 wall, draw budgets intact. |
| `line.test.ts` 7+ cases still green: `movementLines 4 dirs`, `shiftLine merge 1+2`, `no 1+1/2+2 merge`, `equal ≥3 merge`, `cascade [3,3,3,3]→[6,3,3,null]`, `gap [3,null,3,null]→[3,3,null,null]`, `packed [1,3,6,12] unchanged`, `boardFromLines left map` + `right/up/down` effective | Unit | R-003, R-005, R-006 | 7 | QA | `npm test -- __tests__/engine/line.test.ts` — validates `boardFromLines` full-placement not mistakenly filtered; holds survive on effective partial (see P0 hold pin). |
| `rules.test.ts` 6 cases still green: `canMerge 1+2, equal≥3, null never` ×3 + `mergeValue ≤2→3, ≥3 double, null→6` ×3 | Unit | R-002 | 6 | QA | `npm test -- __tests__/engine/rules.test.ts` 6 pass — tautological guard keeps `mergeValue(1,1)→3` expected; `canMerge` truth table unchanged. |
| `transitionPlan.test.ts` 13 cases still green: `slide 4 dirs`, `merge 1+2×2 + equal≥3`, `hold stationary`, `noop empty plan and empty trace (DW-21)`, `1+1/2+2 no-merge empty`, `last-empty [3,3]` | Unit | R-001, R-003 | 13 | QA | `npm test -- __tests__/render/transitionPlan.test.ts` — `moved:false→[]` short-circuit keeps empty trace compatible; `hold stationary` proves holds survive on effective moves (P0 boundary). |
| `preview-invariant.test.ts` AC4 timing still green: `noop 0 draws, no spawned, trace 0` + structural `previewFor 0 draws` + `session`/`promise` | Unit | R-001, R-004 | 4 | QA | `npm test -- __tests__/game/preview-invariant.test.ts` `noop trace must be empty` new gate — trace 16→0 migration proof. |
| Pipeline `engine-core → game → transitionPlan → resultingTiles` — `resultingTiles(plan).length` on effective `== trace.length` (minus spawn if you filter) and `occupiedCells(board)` chain still green + `engine.smoke` full-board `median/p99` + `purity` scan still clean | Integration | R-001, R-007 | 3 | QA | `engine.smoke.test.ts` + `helpers.assertNoLeak` + `CEILING-XYZ atdd` suites prove occupiedCells chain deterministic after noop change. |
| Ledger `deferred-work.md` DW-21/DW-22 `done` with `resolution-undo: b4557fd…` 64-hex, `sprint-status.yaml` untouched | Static | R-009 | 1 | QA | `rg -n "status: done 2026-09-02" deferred-work.md` shows 2 hits DW-21/22 each with `resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b`; `git diff --stat` shows `deferred-work.md` + `spec-engine-trace-merge-guards.md` but not `sprint-status.yaml`. |

**Total P1**: 67 checks (33+7+6+13+4+3+1), ~1.0–1.8 h host (mostly existing suites, manual probe guard already landed)

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary helper edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-guard allowlists — `game.ts` `let trace = built.trace` 1 + `if (!moved) trace = []` 1 + `trace.push` inside `if (moved)` 1, `rules.ts` `if (!canMerge` 1 + `canMerge(a,b)` 2 + `(a ?? 0) <= 2` 2 (both branches same — tautology), `line.ts` `DW-21: boardFromLines always returns` doc 1 | Static scan | R-001, R-002, R-003 | 1 | QA | Any second `if (!moved) trace` or reintroduced `const trace = built.trace` (no `let`) is a fail; `rg -n "let trace = built" triade/src/engine/core/game.ts` stays 1, `rg -n "const trace = built" triade/src/engine/core/game.ts` ==0. |
| Tautology pin — `rg -n "\(a \?\? 0\) <= 2 \? 3" triade/src/engine/core/rules.ts` ==2 (both branches same) and `diff -u <(sed -n '5,17p' triade/src/engine/core/rules.ts)` shows `if (!canMerge)` branch body equals fallthrough body | Static scan | R-002 | 1 | QA | Documents that `mergeValue` hardening is observational (path 2× `canMerge`) not behavioral under guarded `shiftLine` — any change to `a*2+b` would flip this to 1 + cause `rules.test` 1,1→3 to diverge. |
| No bare `trace = built.trace` after `moved` check — `rg -n "trace = built\.trace" triade/src/engine/core/game.ts` ==1 (only the `let` assignment pre-check) and `rg -n "trace\.length > 0.*moved\|moved.*trace\.length" triade/src/engine/core/game.ts` ==0 (no redundant `trace.length` guard) | Static scan | R-001, R-008 | 1 | QA | Ensures `moved` is the single gate, not `trace.length>0`, which would behave identically today but be weaker than `boardsEqual` if `boardFromLines` zeroed. |
| Trace shape — `rg -n "interface TraceEntry" triade/src/engine/core/types.ts` still `{value:number, to:[number,number], from:Array<[number,number]>, spawned:boolean}` and `rg -n "GRID_SIZE = 4" triade/src/engine/core/types.ts` ==1, `MoveResult` has `trace:TraceEntry[]` + `spawned` enum not `spwan` typo | Static scan | R-003, R-007 | 1 | QA | Keeps `MoveResult/GameState/TraceEntry` shapes + `GRID_SIZE=4` + `Board` 4×4 contract; `trace` shape would require architecture review (Block If). |
| Ledger + spec hashes — `rg -n "resolution-undo: b4557fd" _bmad-output/implementation-artifacts/deferred-work.md` 2 hits DW-21/22 + `rg -n "final_revision: e325bab" _bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md` 1 | Static scan | R-009 | 1 | QA | Doc pin only; `deferred-work.md` DW entries each 64-hex `b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b` — revert trail. |

**Total P2**: 5 checks, ~0.4–0.8 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — ragged `game.move({board: [[1],[2],[3],[4]] as any},'left',rngOf(0,0,0.5))` still `moved` via `movementLines` `board[r]?.[c] ?? null` pad (if ported) and `move` noop path not throw — DW-20/41 already hardens short boards, not this sweep | Unit (host `node`) | 1 | QA | No assertion beyond no-throw + `trace` finite; if hit file deferred-work residual for line-compaction track. |
| Exploratory — one-cell probe `staticBoard([3,null,3,null]) left → 2 slides trace length 2+spawn` and `[_,3,_,3] down → vertical 1-cell` — proves one-cell not dropped by future `boardFromLines` filter | Unit | 1 | QA | `line-moved.unit.test.ts` already pins one-cell; keep as manual `node --loader tsx` probe. |
| Exploratory — `mergeValue` stress over all `Cell` domain `[-1,0,1,2,3,6,12,24,48,96,null,undefined as any,NaN as any,Infinity as any]` ×2 — every pair returns finite `number` (`3` or `a*2`) never `null/NaN/Infinity` and never throws | Unit | 1 | QA | Documents `engine-never-throws` seam; `a??0` makes `null/undefined→0→3`; `Infinity??0→Infinity<=2?false→Infinity*2 = Infinity` would be Infinity — but `Infinity` is not a valid `Cell` (valid tiles are finite multiples of 3 or 1,2); leave as exploratory. |
| Micro-zero — `planTileTransitions(prevBoard,{moved:false,trace:[{value:3,to:[0,0],from:[[0,0],[0,1]],spawned:false},{value:3,to:[0,0],from:[[0,0]],spawned:false}]})→[]` (moved:false short-circuits before classifying any entry, even non-empty) + `planTileTransitions(prevBoard,{moved:true,trace:[{spawned:true,to:[0,3],from:[],value:1}]})→[{type:'spawn'}]` | Unit | 1 | QA | Already `moved:false→[]` but classify not called; spawn `spawned:true` bypasses `from` check (R-002 spawn path). |
| No-leak ladder bench — `move` 10k× random full-board noop vs effective median `<0.01 ms` + `mergeValue` 10k× random pair `canMerge` + branch median `<0.001 ms` (guards O(1), no bench lane beyond `feel.bench.test.ts` full-board `median/p99`) | Unit (bench) | 1 | DEV | Engine `<2 ms/turn`, frame worst `<8 ms`; guard adds `<0.001 ms` per move — just confirm no `while` infinite. Not a new lane, just CI `npm test` timing. |

**Total P3**: 5 checks, ~0.3–0.6 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch guard/format regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/rules.test.ts __tests__/render/transitionPlan.test.ts __tests__/game/preview-invariant.test.ts` green on clean working tree (33+7+6+13+1 pipeline = 60 pass) — includes `HAPPY_PATH 1+2→3`, `noop trace 0`, `canMerge/mergeValue 1+2/3+3`, `hold stationary`, `cascade [3,3,3,3]`
- [ ] Manual probe from spec Verification (single command): `node --loader tsx -e "import * as g from './triade/src/engine/core/index.ts';import {boardWith,gameState,rngOf} from './triade/test-utils/helpers.ts';import {canMerge,mergeValue} from './triade/src/engine/core/rules.ts';const b=boardWith([[1,3,6,12],[1,3,6,12],[1,3,6,12],[1,3,6,12]]);const r=g.move(gameState(b),'left',rngOf(0,0,0.5));console.log(r.moved, r.trace.length, r.score);const b2=boardWith([[1,2,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]); for(let r1=1;r1<4;r1++) b2[r1]=[3,6,12,24]; const r2=g.move(gameState(b2),'left',rngOf(0,0,0.5)); console.log(r2.moved, r2.trace.length, r2.trace.find(t=>!t.spawned&&t.value===3)?.from); console.log(mergeValue(3,6), canMerge(3,6), mergeValue(1,1), mergeValue(3,3))"` — expect `false 0 0` + `true 2+ length merge from[[0,0],[0,1]]` + `6 false 3 6`
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore`, `Cell number|null` guard typed `Cell→number`)
- [ ] `rg -n "let trace = built\.trace" triade/src/engine/core/game.ts | wc -l` ==1 and `rg -n "if \(!canMerge" triade/src/engine/core/rules.ts | wc -l` ==1 and `rg -n "DW-21: boardFromLines always" triade/src/engine/core/line.ts | wc -l` ==1 and `rg -n "\(a \?\? 0\) <= 2" triade/src/engine/core/rules.ts | wc -l` ==2 (tautology quick scan)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical two-seam guards (host only)

- [ ] Noop trace 4-dir: full `[[1,3,6,12]×4]` left/up/right/down `→ trace 0` + `spawned 0` + `pendingSpawn copy`
- [ ] Effective `1+2→3` trace `merged@[0,0] from 2 + spawn@[0,3]` + gaps `[3,null,3,null] left → 2 slides + spawn` (not emptied)
- [ ] MergeValue tautology: `(1,1)→3,(2,2)→3,(3,6)→6,(null,3)→6` all `a`-only no throw + guarded `(1,2)→3,(3,3)→6` still correct
- [ ] Manual probe 3-log single command (covers both seams) + hold-vs-stationary `[1,3,6,12] left →0` not `4 holds` + `[1,1,_,_] →0` not spurious merge

**Total**: 12 P0 checks (already passing in `35c9d1c` — existing suites 60 + manual probe green)

### P1 Tests (<30 min)

**Purpose**: Pipeline + ladder chain

- [ ] `game.test.ts` 33 + `line.test.ts` 7+ + `rules.test.ts` 6 + `transitionPlan.test.ts` 13 + `preview-invariant` 1 tightened (60 pipeline)
- [ ] Draw `spyRng 0/3/20` + hold-stationary partial effective still `hold` vs full noop `[]` divergence + `boardsEqual` vs `shiftLine.moved` convergence pair
- [ ] Ledger `resolution-undo b4557fd…` 2 hits DW-21/22 + `git diff --stat` `deferred-work.md` but NOT `sprint-status.yaml` (owner gate)

**Total**: 67 P1 checks (existing suites dominate)

### P2/P3 Tests (<60 min)

**Purpose**: Full regression + exploratory

- [ ] Single-guard allowlists 5 scans (tautology, alias, shape, ledger)
- [ ] Exploratory ragged/one-cell/`mergeValue` domain ×2 stress + `moved:false→[]` before classify + 10k× `move`/`mergeValue` median bench `<0.01 ms` — all host `node --import tsx`

**Total**: 10 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 12 | 0.3–0.5 | 3.6–6.0 | Requires board fixtures + `rngOf` spy + `mergeValue` scalar probes + manual 3-log probe; already done as tightened tests in `35c9d1c` |
| P1 | 67 | 0.05–0.10 | 3.4–6.7 | Existing suites dominate; only `rg` ledger/NFR scans + `transitionPlan` hold pair need re-run |
| P2 | 5 | 0.2–0.4 | 1.0–2.0 | Static `rg` allowlists + spec hash pins |
| P3 | 5 | 0.25–0.5 | 1.3–2.5 | Exploratory ragged/one-cell domain + bench median |
| **Total** | **89** | **-** | **~9.3–17.2** | **~1.2–2.2 days** host-only; guards landed in `35c9d1c` so executed effort is mostly verification + scan, not new test authoring (net incremental ~2.6–4.8 h since P0 tightened tests already committed) |

*Net incremental for post-commit verification (excluding already-committed tightened tests): P0 manual probe 0.5 h + static scans 0.4 h + P1 pipeline 0.8 h = **~2.6–4.8 h** host.*

### Prerequisites

**Test Data:**

- `boardWith([[1,3,6,12]×4])` 16-cell full non-mergeable (R-001 4-dir) + `staticBoard([1,2,null,null])` row 0 `1+2` + `boardOf([3,null,3,null])` gap fixture + `boardOf([1,3,6,12]×4)` packed compact + `emptyBoard()` 4×4 16-cell zero board
- `gameState(board)` + `rngOf(0,0,0.5)` 3-draw effective / `rngOf(0,0,0.5)` 0-draw noop same API (both use 2 value+displayRoll pooled but noop branch skips them)
- `mergeValue` scalar sweep `[(1,1),(2,2),(3,6),(1,3),(null,3),(null,null),(3,null),(1,2),(2,1),(3,3),(6,6)]` 11 pairs
- `helpers.ts` `mulberry32(0xC31)` backup + `spyRng` + `assertNoLeak` + `resultingTiles` oracle

**Tooling:**

- `node --import tsx --test` + `tsx 4.x` via `TSX_TSCONFIG_PATH=triade/tsconfig.test.json` (host `npm --prefix triade test`)
- `rg` (ripgrep) for static scans: `let trace = built.trace`, `if (!moved) trace`, `if (!canMerge`, `DW-21: boardFromLines always returns`, `resolution-undo: b4557fd`

**Environment:**

- Host `triade/` only — no device/simulator lane (pure engine TS, `src/engine` + `src/render/transitionPlan`)
- Both `tsc --noEmit --project triade/tsconfig.json` + `tsconfig.test.json` clean (CI gate)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — noop trace + mergeValue guarded 1+2/3+3 + tautology pins)
- **P1 pass rate**: ≥95% (waivers allowed for `line.test.ts` extra `down` mirror if port pending)
- **P2/P3 pass rate**: ≥90% (informational — exploratory ragged/one-cell domain)
- **High-risk mitigations**: 100% complete or approved waivers (R-001..R-003 each 1/1 scan + host probe green)

### Coverage Targets

- **Critical paths**: ≥85% — `move` 4-dir noop + 2 effective (merge + gap), `shiftLine→boardFromLines→game.move` 4-dir wall parity
- **Trace contract**: 100% — `trace.length===0` on noop (4 dirs) + `trace.length>0` with `spawned:true` + `holds` on effective (2 fixtures)
- **Merge predicate**: 100% — `canMerge` 4 pairs + `mergeValue` 6 guarded + 5 tautology pins
- **Business logic**: ≥75% — `score 0` noop + `score 3/6/24` effective, `pendingSpawn` copy, draw `0/3`
- **Edge cases**: ≥60% — packed compact, empty `line.ts` all-null, `null` cells in mergeValue

### Non-Negotiable Requirements

- [ ] All P0 tests pass (noop 4-dir 0 + `1+2→3` merge+spawn + tautology `a`-only + hold-vs-stationary `trace 0` not 4)
- [ ] No high-risk (≥6) items unmitigated (R-001 scan `if (!moved) trace=[]` 1 + R-002 `if (!canMerge` 1 + R-003 `boardFromLines doc` 1)
- [ ] No `TraceEntry` shape change (`value/to/from/spawned` only)
- [ ] `mergeValue` `canMerge` gate present with comment `DW-22` (not naked `return a*2`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw + single-guard maintainability + O(1) frame budget already evidenced via scans + `npm test` <15 min)

---

## Mitigation Plans

### R-001: Noop trace leak `moved:false → 16 stationary` (Score: 6)

**Mitigation Strategy:**
1. Keep `let trace = built.trace; if (!moved) trace=[];` as the single noop gate in `game.ts:50-57` before `if (moved) { spawnTile … trace.push(spawn) }` (order: empty first, spawn after).
2. Keep `preview-invariant.test.ts:373` `length 0` + `transitionPlan.test.ts:108` `length 0` tightened pins — any revert to `16` fails both.
3. Keep `boardFromLines` doc `always returns full placement` in `line.ts:73` — proves filter lives in `game.ts` not `line.ts` (hold preservation on partial effective).
4. `rg -n "if \(!moved\) trace" triade/src/engine/core/game.ts` ==1 + `rg -n "let trace = built" triade/src/engine/core/game.ts` ==1 as CI allowlist.

**Owner:** FE lead
**Timeline:** Immediate (gate `35c9d1c`; protects animation/busyRef/deferred-work DW-21)
**Status:** Planned — verify host `node --loader tsx` noop 4-dir `0` + `rg` scans
**Verification:** `npm --prefix triade test -- __tests__/game/preview-invariant.test.ts __tests__/render/transitionPlan.test.ts` green + `rg` 1-hit scans

### R-002: MergeValue tautological `a`-only vs `b`-sensitive throw trade-off (Score: 6)

**Mitigation Strategy:**
1. Document that both branches are ` (a??0)<=2?3:(a??0)*2` intentionally — `canMerge` is the gate, merge math stays `a`-only so guarded `shiftLine` call sites remain byte-identical; unguarded direct calls degrade to `a`-only rather than throw, preserving `rules.test.ts` `1,1→3` expected value.
2. Pin `mergeValue(1,1)===3,(2,2)===3,(3,6)===6,(null,3)===6` as `a`-only plus guarded `1,2→3, 3,3→6` correct — add negative host probe if not already in suite.
3. Keep `rg -n "if \(!canMerge" triade/src/engine/core/rules.ts` ==1 + `rg -n "\(a \?\? 0\) <= 2" …` ==2 (tautology explicit) + comment includes `DW-22` + `intentionally ignore the second operand`.
4. Accept residual: stricter `throw` would require `rules.test` migration (1,1 throws) and is deferred per `Review Triage Log` 11 reject; treat as medium future hardening item.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-22; document residual throw alternative in spec residual risks)
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/engine/rules.test.ts` 6 pass + `rg` tautology 2-hit + manual `node --loader tsx -e` `mergeValue(1,1)===3 && mergeValue(3,6)===6 && !canMerge(3,6)`

### R-003: `boardFromLines` full-placement vs meaningful-only boundary (Score: 6)

**Mitigation Strategy:**
1. Keep noop emptying in `game.ts` after `boardsEqual`, not inside `boardFromLines` loop — `boardFromLines` always returns full placement so effective partial traces retain `hold` entries for stationary tiles.
2. Pin effective partial `boardOf([1,2,null,null],[3,null,null,null]) left → trace has hold` + `transitionPlan.test.ts hold stationary becomes hold` stays green — dropping holds would flip hold to 0 and animation would ghost-drop stationary tiles.
3. Scan `rg -n "DW-21: boardFromLines always returns a full placement trace" triade/src/engine/core/line.ts` ==1 proves filter not moved into `line.ts`; `rg -n "if \(.*moved.*\) trace\.push|if \(.*moved.*\) continue" triade/src/engine/core/line.ts` ==0.

**Owner:** FE lead
**Timeline:** Immediate (gate hold semantics; protects partial-move animation)
**Status:** Planned
**Verification:** `transitionPlan.test.ts` hold case + effective-gap host probe `trace has hold` + scan doc 1-hit

---

## Assumptions and Dependencies

### Assumptions

1. Production `Board` is always 4×4 via `emptyBoard()`/`boardWith()`/`staticBoard()` — `boardFromLines` iterates `GRID_SIZE=4` correctly; no 1×1 production short-board path (line-compaction hardening is defensive-only).
2. `shiftLine.moved` value-based comparison `out.some(v!==line[i].v)` converges with `boardsEqual(before, built.board)` — both pure and collectively verified by `game.test.ts` 33 + `line.test.ts` wall; divergence would be caught as `moved:true` with empty effective placement paradox.
3. `Rng` is well-behaved `[0,1)` per `types.ts` draw-budget contract — `pickIndex`/`weightedPicker` already clamp `NaN/≥1` deterministically; `move` draw budget `0 noop / 3 effective / 20 newGame` is fixed and measured via `spyRng`.
4. `canMerge` predicate is ground truth; `mergeValue` is only ever called under `canMerge` in production (`shiftLine:59` `else if (canMerge(...)) { mergeValue }`). Tautological `a`-only guard is intentional — pendingStricter `throw` hardening would be breaking.
5. `TraceEntry` shape `{value,to,from,spawned}` stable — no new fields added; consumers `planTileTransitions`/`resultingTiles`/`occupiedCells`/`previewInvariant` depend on exact shape.

### Dependencies

1. `triade/src/engine/core/types.ts: GRID_SIZE=4 + TraceEntry + MoveResult + Rng` — single definition, immutable per `Block If`.
2. `triade/src/engine/core/line.ts: movementLines/shiftLine/boardFromLines` — used by `game.ts` 41-105 orchestrator; any line change requires re-running `line.test.ts` + `game.test.ts` 4-dir wall.
3. `triade/src/render/transitionPlan.ts: planTileTransitions + classify` — direct consumer of `MoveResult.trace`; `moved:false→[]` short-circuit must remain to stay empty-trace compatible.
4. Test infra `triade/test-utils/helpers.ts: boardWith/emptyBoard/staticBoard/gameState/rngOf/spyRng/resultingTiles` — facto factories for all 4-dir + merge probes.

### Risks to Plan

- **Risk**: `sprint-status.yaml` write or revert by this workflow (orchestrator-owned per prompt)
  - **Impact**: Orchestrator bookkeeping drift, `done`/`awaiting-operator` rows misinterpreted as defects
  - **Contingency**: This plan never writes that file; gate via `git diff --stat` shows `deferred-work.md` + `spec-engine-trace-merge-guards.md` only; any accidental write is reverted before commit.

- **Risk**: Tightened `preview-invariant.test.ts:373` `length 0` assertion regressions on environments that cached old `16` oracle or `game.test.ts` stale build
  - **Impact**: Host `npm test` would show expected-RED 1 (16 vs 0) and block gate, misread as regression
  - **Contingency**: Treat as expected: `16` was the leak oracle, `0` is the contract; `tsx` cache clear `rm -rf triade/node_modules/.cache` + re-run `npm test` — if still red, inspect `game.ts: if (!moved) trace=[]` presence via `rg`.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 probes for `mergeValue` tautology `throw-vs-a-only` alternative if stricter fail-fast is chosen (separate workflow; not auto-run).
- Run `*automate` for broader `game.test.ts` 4-dir wall once implementation evidence exists for all 4 dirs (left wall already exhaustive, right/up/down mirrors are P1 today).

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
| **`src/render/transitionPlan.ts` `planTileTransitions` + `classify` + `resultingTiles` oracle** | Direct trace consumer — empty trace on noop short-circuits to `[]` plan (no ghost tiles); effective trace with holds+slides+merges+spawn must map to correct `hold/merge/slide/spawn` types | Existing `transitionPlan.test.ts` 13 + `preview-invariant` `trace must be empty` + `engine.parity` `resultingTiles` host must all stay green; any `trace.length` filter change at `boardFromLines` would drop holds on partial effective and ghost-drop stationary `GameBoard` tiles (R-003) |
| **`src/game/matchScore.ts` `applyMove` + `matchOrchestrator` `best`/`isNewRecord`** | Score is always `0` on noop today so empty trace + `moved:false` keeps `applyMove` at `+0` even if `trace.length` were misread; effective merge `score` via `shiftLine` `merged` sum unaffected | Keep `matchScore.test.ts` 8 + `matchOrchestrator.test.ts` green; `trace` shape change must not leak `score` (trace `value` is tile value, score is `merged` sum) |
| **`src/engine/core/spawn.ts` `spawnTile` + `resolveSpawn` + `weights` `potForTier` `tierForCeiling`** | Noop trace empty guarantees no spawn appended, so `spawnTile` cell-pick not invoked on noop (`0` draws); effective trace always gets exactly one `spawned:true` at opposite edge (AC4 directional spawn) vs `candidates` pool | `adaptive-spawn-integration` `N3` pin + `pending-spawn-contract` `draw budget 0/3/20` + `game.test.ts` `spawn happens exactly once at [0,3]` stay green |
| **`js/game.js` parity oracle `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts`** | Historical JS oracle has same 4×4 rectangular contract and `trace` shape; `move` trace parity for noop must be updated from `16` stationary DOM-mirrored steps to `[]` empty on both sides (JS side already uses same `TraceEntry` shape via `triade/src/engine` port) | Re-run parity `engine.parity-hardening.atdd` `TS===web` 13 scenarios + `game.test.ts` absolute oracle pair — shared-bug blind spot covered by absolute `game.test.ts` (DW-26 header comment) |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework (TECH/SEC/PERF/DATA/BUS/OPS, P×I 1-3)
- `probability-impact.md` — Risk scoring methodology (P 1-3 × I 1-3 = 1,2,3,4,6,9)
- `test-levels-framework.md` — Unit (pure `move`/`mergeValue`/`boardFromLines`/`classify`) vs Integration (game→transitionPlan→resultingTiles)
- `test-priorities-matrix.md` — P0 (blocks core + ≥6 + no workaround) vs P1 (medium 3-4 + common) vs P2 (scans + ledger) vs P3 (exploratory/bench)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md` (DW-21/DW-22 intent, I-O 5 rows, Code Map 6 files, 4 tasks, Review Triage 0/0/0/2/11)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` DW-21/DW-22 `done 2026-09-02 b4557fd…`
- PRD/Architecture: `docs/` (not needed — sweep scoped to pure engine via `_bmad/scripts/resolve_customization.py` fallback Base→Team→User merge)
- Other sweep designs: `test-design-dw-engine-ceiling-hardening` / `dw-engine-defensive-guards` / `dw-render-gate-hardening` (same host-only <15 min structure, serve as template for `single-guard + rg allowlist + 4-dir wall` pattern)

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat — Master Test Architect)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6) • TEA Module 6.10.0 • 2026-09-02
**Baseline**: `3bcf38c` → **Head**: `35c9d1c` • **Spec**: `e325bab` • **Ledger undo**: `b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b`
