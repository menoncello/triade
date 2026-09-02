---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-defensive-guards.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/game/matchScore.ts'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/__tests__/game/matchScore.test.ts'
  - 'triade/__tests__/render/transitionPlan.test.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-engine-defensive-guards — matchScore / transitionPlan / game pendingSpawn defensive hardening (DW-24, DW-30, DW-65)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-engine-defensive-guards`
**Scope:** Targeted test design for the working-tree delta of `dw-engine-defensive-guards`

> **Delta under assessment:** Commit `000b640 sweep dw-engine-defensive-guards: DW-24, DW-30, DW-65 via bmad-loop` vs baseline `266aa03` (`spec-engine-defensive-guards.md` `baseline_revision: 266aa03`, `final_revision: c7e1c51`). Working-tree diff vs `HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` DW-24/DW-30/DW-65 `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-defensive-guards` + `resolution-undo: f115c8c…` + `_bmad-output/implementation-artifacts/spec-engine-defensive-guards.md` `Auto Run Result Status: done`); production delta is three pure-TS defensive seams plus spec:
> - `triade/src/game/matchScore.ts:12-15` — `applyMove` gains `const raw = result.score; const sanitized = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : 0; const effective = result.moved ? sanitized : 0; const score = current.score + effective; best = Math.max(current.best, score)` replacing `current.score + result.score` (DW-24)
> - `triade/src/render/transitionPlan.ts:21-50` — `classify` gains `const from = (entry as unknown as {from?:unknown}).from; if (!Array.isArray(from)) return 'slide'; if (from.length===2) return 'merge'; if (from.length===1) { const first = from[0]; const to = (entry as unknown as {to?:unknown}).to; if (Array.isArray(first)&&first.length===2 && Array.isArray(to)&&to.length===2 && typeof first[0]==='number'&&typeof first[1]==='number'&&typeof (to as unknown[])[0]==='number'&&typeof (to as unknown[])[1]==='number' && sameCell(first as [number,number], to as [number,number])) return 'hold'; return 'slide'; } return 'slide'` replacing bare `entry.from.length===2` / `sameCell(entry.from[0], entry.to)` derefs (DW-30)
> - `triade/src/engine/core/game.ts:27-50,83,100` — new `function sanitizePending(raw: unknown): PendingSpawn { if (!raw||typeof raw!=='object') return {value:1,displayRoll:0}; const v=rec.value, dr=rec.displayRoll; safeValue typeof v==='number'&&isFinite&&v>0 ? v : 1; safeDisplay typeof dr==='number'&&isFinite&&dr>=0&&dr<1 ? dr : 0; }` plus `const safePending = sanitizePending((state as unknown as {pendingSpawn?:unknown}).pendingSpawn)` at top of `move`; effective branch `spawnTile(effectiveBoard, safePending.value, rng, candidates)` (was `state.pendingSpawn.value`) and noop branch `pendingSpawn = { ...safePending }` (was `{ ...state.pendingSpawn }`) (DW-65)
> - `triade/src/engine/core/spawn.ts` byte-identical — `spawnTile` already clones and handles NaN via placement but `ceilingDetector` downstream already filters NaN; guard prevents placement itself (no change needed)
> - `triade/src/engine/core/ceiling.ts:23-36` byte-identical — reference: `ceilingDetector` already skips NaN/non-finite/<=0, so NaN pendingSpawn value placed would be ignored invisibly — game guard prevents that allocation (DW-65 Design Notes)
> - `triade/src/engine/core/types.ts: GRID_SIZE=4, MoveResult/GameState/TraceEntry/PendingSpawn` shapes unchanged per `Block If`; `GRID_SIZE`, spawn distribution, merge rules unchanged
> - `triade/__tests__/game/matchScore.test.ts:1-42` unchanged — 8 cases (initialScore, accumulate 3+6, best tracks, noop 0, isNewRecord, session best, wiring) all green — no DW-24 sanitization pin yet
> - `triade/__tests__/render/transitionPlan.test.ts:1-202` unchanged — 13 cases (slide 4 dirs, merge×3, hold stationary, noop empty plan, 1+1/2+2 no-merge, last-empty spawn, prevBoard-ignored) all green — classify empty/malformed `from` not yet pinned
> - `triade/__tests__/engine/game.test.ts:1-240` unchanged — 32 cases (newGame 9 tiles, weightedValue 40/40/20, 13 move paths, cascade, compact, down trace, full-board spawn nothing, pickIndex, 3-draw/20-draw, game over 4, merge, trace, noop) all green — pendingSpawn malformed not yet pinned
> - Ledger `deferred-work.md` — DW-24 (`matchScore.applyMove` no guard), DW-30 (`classify dereferences entry.from[0] unguarded`), DW-65 (`pendingSpawn trusted — undefined/NaN`) flipped `open→done 2026-09-02` + `resolution-undo: f115c8c2…` each

---

## Executive Summary

**Scope:** Harden three `engine-never-throws` seams that leak malformed data: score poisoning (`matchScore.applyMove`), render trace deref (`transitionPlan.classify`), and snapshot spawn materialization (`game.move` pendingSpawn). Before the sweep a fuzzed `MoveResult.score = NaN/Infinity/-5` poisoned cumulative `score`+`best` to `NaN`, a `moved:false` with `score>0` inflated, an empty `from: []` or `from: undefined` in `TraceEntry` threw `TypeError: Cannot read properties of undefined (reading '0')` inside `classify`, and a `GameState.pendingSpawn = undefined` threw `TypeError: Cannot read properties of undefined (reading 'value')` on effective move while noop degraded to `{} losing fields` and `NaN` value was placed as tile then invisibly ignored by `ceilingDetector`. After guards each seam degrades deterministically (bad score→0, malformed `from`→slide, malformed pendingSpawn→`{value:1,displayRoll:0}` fallback) with valid-path outputs byte-identical and draw budget intact (effective 3, noop 0). Production blast radius on valid boards is zero (valid scores finite ≥0, valid `from` non-empty for non-spawn, valid `pendingSpawn {value, displayRoll}` well-formed per engine contract), but fence is load-bearing for correctness: a future caller, fuzz harness, or persisted-state corruption that fed malformed data would have crashed or poisoned without these guards.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3
- Critical categories: TECH (score poisoning vs Math.max(NaN), classify deref vs Array guard, pendingSpawn undefined/NaN vs spawn placement), DATA (score+best integrity, trace plan integrity, board tile NaN vs ceilingDetector silent ignore), BUS (noop score inflation vs best record, hold/merge misclassification vs spawn candidate leakage)

**Coverage Summary:**

- P0 scenarios: 10 groups (host unit, pure `applyMove` NaN/Infinity/-5/true + noop 5/true→0, `classify` empty/undefined/non-array/1/2 lengths, `game.move` undefined↦fallback 1 both branches + NaN pendingSpawn effective NaN→1 + displayRoll NaN→0, wall `tsc` + manual probe gate)
- P1 scenarios: 7 groups (valid-path byte-identical pins — score 3 moved:true, from [[0,0]]→hold, pendingSpawn 2→spawn, plus pipeline `game.move` 4-dir wall + `transitionPlan` hold/slide/merge/spawn + existing suites 8+13+32 green + draw budget 3/0 + ADR-06 snapshot isolation)
- P2/P3 scenarios: 7 groups (single-guard scans per file, ledger resolution-undo, ceilingDetector chain unaffected, exploratory ragged pendingSpawn edge)
- **Total effort**: ~3.0–5.6 hours (~0.4–0.7 days; host-only, no device lane — pure engine/match/transition TS, `npm test` + `tsc` gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score rules `canMerge(1+2→3, >=3 equal)` / `mergeValue` / merge-once cascade / `shiftLine` wall-scan / `boardFromLines` 4×4 guard, ceiling/tier pipeline `ceilingDetector`/`tierForCeiling`/`potForTier`, spawn `pickIndex` NaN clamp, `previewFor` ambiguous band, `matchOrchestrator`/`undo`/`rewardedAd`/`entitlements`, `src/feel` haptics/punch/shake/bullet/sfx, `App.tsx`/`GameBoard.tsx` Skia/Reanimated, `RNGH` gesture, `layout.ts`/`Hud.tsx`** | `git diff --stat -- triade/src/engine` between baseline `266aa03` and `000b640` shows only `game.ts` changed inside engine (`spawn.ts/ceiling.ts/line.ts/rules.ts/types.ts` byte-identical); `git diff HEAD` shows only `game.ts` + `matchScore.ts` + `transitionPlan.ts` + `deferred-work.md` + `spec-engine-defensive-guards.md` — no line/ceiling/feel/render/layout/monetization change. | Engine invariants stay gated by 182 `__tests__/engine/*.test.ts` pass (per spec Auto Run `882 pass / 11 expected-RED` baseline) + `git diff --stat -- triade/src/engine` shows single-file `game.ts` delta as gate. |
| **Changing `MoveResult`/`GameState`/`TraceEntry` shapes, altering spawn distribution / `GRID_SIZE` / merge predicates, reworking `ceilingDetector`/`spawnTile` beyond pendingSpawn sanitization** | Spec Boundaries: `Block If: Would need to change MoveResult/GameState/TraceEntry shapes, alter spawn distribution or GRID_SIZE, introduce new dependencies, or rework ceilingDetector/spawnTile beyond pendingSpawn sanitization`. | This plan pins shapes via `rg -n "interface GameState" triade/src/engine/core/types.ts` + `rg -n "interface MoveResult"` + `GRID_SIZE=4 single definition` + valid spawn values `1,2,3*2^k` unchanged per `spawn.ts` + `pot.ts` byte-identical. Changing shapes/distribution would require architecture review (Block If). |
| **Mutating input boards/GameState, changing public App/matchScore/transitionPlan contracts beyond guards, adding build steps or deps** | Spec Boundaries: `Never: Change valid spawn values/distribution; mutate input boards/GameState; edit deferred-work.md ledger; add build steps or deps; change public App/matchScore/transitionPlan engine contracts beyond guards`. | Guards are `typeof Number.isFinite` + `Array.isArray` + `sanitizePending` local helper with no new exports; `tsc` clean both configs proves no shape leak. |
| **Persisted `best` conflation (`matchScore.isNewRecord`/`best` vs session max), `current.score NaN` edge, `state null` edge, malformed `rng` function** | Spec Review Triage: two low informational rejects — `current.score NaN would still poison but out of DW scope; state null would throw at movementLines but DW scopes only pendingSpawn malformed — same trust-the-input posture as malformed-rng`. Current score is orchestrator-owned, `state` null is caller bug not pendingSpawn. | Document-only residuals (see R-009/R-010); not pinned as P0 because `applyMove` sanitizes `result.score` only, not `current.score`; `sanitizePending` scopes to `pendingSpawn` field only. |
| **Rewarded-ads / RevenueCat / AdMob / IAP / Epic 9-11 a11y** | No monetization/a11y code touched. | Existing suites remain gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** All three seams are pure with no `expo-*`/`Skia`/`RNGH`/`MMKV` dependency: `applyMove(MatchScore, MoveResult)→MatchScore` with only `result.score: number` + `result.moved: boolean`; `classify(TraceEntry)→TransitionType` with only `entry.spawned/from/to`; `move(GameState,Direction,Rng)→MoveResult` with `state.pendingSpawn: PendingSpawn` as the only sanitized input (board is `Board` 4×4, `Rng` is `() => number`). Every path is host-testable via `node --import tsx --test` with `moveResult(score,moved)` factory, `emptyBoard()`/`staticBoard()`/`boardWith()` fixtures, `TraceEntry {value,to,from,spawned}` literals including `{from: [], from: undefined as any, from: null as any, from: [[0,0],[0,1]]}`, and `gameState(board, pendingSpawn)` plus `rngOf(0,0,0.5)` deterministic 3-draw effective / 0-draw noop.

**Observability — Good.** Outputs are deterministic numerics/booleans/objects with no hidden state: `MatchScore {score: number, best: number}` (finite `score` never `NaN`, `best = Math.max(current.best, score)`), `TileTransition {type: 'slide'|'merge'|'spawn'|'hold', value, to, from}` (malformed `from`→slide not throw, `from.length===2`→merge, single `from===to`→hold else slide), `MoveResult {board: Board, pendingSpawn: PendingSpawn {value:number, displayRoll:number}, moved:boolean, score:number, trace:TraceEntry[]}` + `pendingSpawn` fallback `{value:1,displayRoll:0}` observable on both effective and noop, board tile at spawn cell observable `1` not `NaN`, `displayRoll` `[0,1)`.

**Reliability — Strong (engine never throws, helpers never throw).** Guards prevent `TypeError` on `entry.from[0]` / `state.pendingSpawn.value` and `NaN` poisoning via `Number.isFinite` + `>0` / `>=0&&<1` + `Array.isArray`; `sanitizePending` returns `{value:1,displayRoll:0}` fallback when `raw` is `null`/`undefined`/non-object or fields are non-finite; `applyMove` `typeof raw==='number' && Number.isFinite(raw) && raw>=0 ? raw : 0` + `moved? sanitized : 0` prevents `Math.max(current.best, NaN)` from collapsing `best` to `NaN`. Both `tsc` gates (`tsconfig.json` + `tsconfig.test.json`) clean; `npm --prefix triade test` full gate `<15 min` (882 pass / 11 expected-RED baseline).

**Testability Risks:** Three surfaces are thin: (a) `applyMove` sanitizes `result.score` only — a follow-on that reintroduced `current.score + result.score` without sanitized intermediate would re-poison on `result.score=NaN` and `Math.max` would lock `best` to `NaN` forever (R-001); mitigated by NaN/Inf/-5 + noop>0 pins + scan `Number.isFinite(raw)` single site. (b) `classify` `Array.isArray(from)` guard could be collapsed to `from?.length` truthiness — empty `[]` would still deref `from[0]` as `undefined` and `sameCell(undefined, to)` throw (R-002); mitigated by `from: [] → slide` pin + `from: undefined → slide` pin. (c) `sanitizePending` fallback `value:1` is the same as `weightedValue` tier-0 fallback — a change to `value:0` would place `null` tile via `spawnTile` and silently drop spawn while `ceilingDetector` still skips it, making the noop degrade from `1` to `0` indistinguishable from a real ceiling-0 spawn (R-003); mitigated by `undefined→1` effective+noop pins.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | DATA / BUS | **Score poisoning via `applyMove` — `result.score NaN/Infinity/-5` or `moved:false + score>0` inflates, `best` locks to `NaN`.** Before fix `applyMove` did `current.score + result.score` then `Math.max(current.best, score)` so `NaN` leaked: `10+NaN→NaN` then `Math.max(20,NaN)→NaN` (both fields poisoned forever, never recovers, corrupts `isNewRecord` and persisted best); `Infinity+10→Infinity` then `best→Infinity` (record permanently held); `-5` moved `true` deflated score; `moved:false` with `score=5` inflated score+best by 5 (noop should add 0). Engine contract guarantees finite ≥0 and noop 0, but guard is defensive-only for malformed result. | 2 | 3 | **6** | Enforce sanitized contribution: (a) **host P0 pins** `applyMove({score:10,best:20},{score:NaN,moved:true})→{score:10,best:20}` + `Infinity→10,20` + `-5→10,20` + `moved:false, score:5→10,20` (spec I-O matrix 4 rows); (b) **static scan** `rg -n "Number\.isFinite\(raw\)" triade/src/game/matchScore.ts` ==1 and `rg -n "result\.moved \? sanitized" triade/src/game/matchScore.ts` ==1 (no bare `result.score` sum); (c) **valid-path pin** `finish +3 moved:true →13, best 20 stays` + `6→9 best10 +10→24 best24` stays green in `matchScore.test.ts:11-24`; `isNewRecord` unchanged. | FE lead | Immediate (gate DW-24) |
| R-002 | TECH | **`classify` throw on empty/malformed `from` — `entry.from[0]` deref TypeError.** Before fix `classify` did `if (entry.from.length===2) return 'merge'; if (sameCell(entry.from[0], entry.to)) return 'hold'` so `from: []` read `entry.from[0]=undefined` then `sameCell(undefined, [0,0])` threw `Cannot read properties of undefined (reading '0')`; `from: undefined` threw `Cannot read properties of undefined (reading 'length')`; `from: null` same. Engine guarantees non-empty `from` for non-spawn, but `transitionPlan` is render seam that must handle planner fuzz. Traces are consumed by `planTileTransitions` via `result.trace.map(classify)` so one malformed entry would crash the whole plan (empty plan vs throw). | 2 | 3 | **6** | Enforce `Array.isArray(from)` fence: (a) **host P0 pins** `planTileTransitions(emptyBoard,{moved:true,trace:[{value:3,to:[0,0],from:[],spawned:false}]})→[{type:'slide',…}] no throw` + `from: undefined→slide` + `from: null→slide` + `from: [[0,0],[0,1]]→merge` still + `from [[0,0]] to [0,0]→hold` + `from [[0,0]] to [0,1]→slide` (spec I-O classify 3 rows); (b) **static scan** `rg -n "Array\.isArray\(from\)" triade/src/render/transitionPlan.ts` ==1 and `rg -n "from\.length === 2" triade/src/render/transitionPlan.ts` ==2 (merge fence) + `rg -n "from\.length === 1" triade/src/render/transitionPlan.ts` ==1; (c) **pipeline tie** `transitionPlan.test.ts` 13 cases wall (`slide left to [0,0]`, `merge 1+2`, `hold stationary`, `noop []`) stay green — valid `from` still classifies correctly. | FE lead | Immediate (gate DW-30) |
| R-003 | TECH / DATA | **`game.move` pendingSpawn malformed — `undefined` throws, noop `{}` loses fields, `NaN` value placed as tile then silently ignored by ceilingDetector.** Before fix `move` did `state.pendingSpawn.value` directly so `pendingSpawn: undefined as any` threw `TypeError` on effective move (`spawnTile(effectiveBoard, undefined.value)`); noop did `{ ...state.pendingSpawn }` so `{ ...undefined }→{}` with missing `value/displayRoll` (ADR-06 snapshot violated, subsequent effective `undefined.value` throw); `pendingSpawn {value:NaN, displayRoll:NaN}` effective placed `NaN` tile via `spawnTile` at candidate `[0,3]` then `ceilingDetector` rejected `NaN` (filtered `isFinite`) so next `resolveSpawn(ceiling, rng)` resolved from board without NaN but the placed tile itself is `NaN` (visible garbage + `boardsEqual` vs trace divergence); noop malformed `displayRoll NaN` persisted as `NaN` and preview `previewFor` reads `[0,1)` would mis-bucket. | 2 | 3 | **6** | Enforce `sanitizePending` degrade to `{value:1,displayRoll:0}`: (a) **host P0 pins** `move({board:b, pendingSpawn: undefined as any}, 'left', rngOf(0,0,0.5)).pendingSpawn → {value:1,displayRoll:0}` noop + effective same (no throw) + `pendingSpawn {value:NaN,displayRoll:NaN} effective → board[0][3]===1` (not NaN) and `pendingSpawn` valid + `displayRoll NaN noop →0`; (b) **static scan** `rg -n "function sanitizePending" triade/src/engine/core/game.ts` ==1 + `rg -n "safePending\.value" triade/src/engine/core/game.ts` ==1 (effective) + `rg -n "\.\.\.safePending" triade/src/engine/core/game.ts` ==1 (noop) and `rg -n "state\.pendingSpawn\.value" triade/src/engine/core/game.ts` ==0 (no bare); (c) **pipeline tie** `game.test.ts` 32 pass + `pending-spawn-contract.test.ts`/`adaptive-spawn-integration` chain still green — valid `{value:2, displayRoll:0.5}` path byte-identical. | FE lead | Immediate (gate DW-65) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Negative-score floor vs caller-decrement — `result.score=-5 moved:true` treated as 0 vs caller expects negative delta to credit.** Guard floors negative to 0; a future caller that intentionally emitted negative score (undo refund) would be silently swallowed. Engine contract says finite ≥0 only; negative is malformed. | 1 | 3 | 3 | Keep floor `raw>=0` pin: host `applyMove({10,20},{-5:true})→10,20` + scan `raw >= 0` 1 hit; document that negative scores are malformed and callers must not emit them; `isNewRecord` stays `>` not `>=`. |
| R-005 | TECH | **Hold-vs-slide misclassification on malformed `to`/`from[0]` — `from:[[0,0]] to: undefined/null/[0]` falling through to slide is correct, but a revert that reintroduced `sameCell(entry.from[0], entry.to)` without `Array.isArray(to)` check would throw on `to: undefined` or mis-hold on `to:[0]` (length 1 not 2).**  | 2 | 2 | 4 | Pin hold fence: host `from [[0,0]] to [0,0]→hold` vs `to [0,1]→slide` vs `to undefined→slide` + scan `Array.isArray(to) && to.length===2` 1 hit + `Array.isArray(first) && first.length===2` 1 hit + `typeof first[0]==='number'` 1 hit. |
| R-006 | TECH | **pendingSpawn `value:0` vs `value:1` fallback — `value 0` is falsy and invalid (`>0` guard) so fallback is 1, not 0; a change to `value>=0` fallback would place 0 (then board cell 0 fails `v>0` in ceilingDetector but is visible as numeric 0 tile, breaking `Board Cell number|null` semantics vs display).**  | 1 | 3 | 3 | Pin `>0` strict: host `pendingSpawn {value:0 as any} effective→board cell 1` not 0 + scan `v > 0` 1 hit + `v===1` fallback literal 1 hit; `Board` valid tiles are `>0` per `ceilingDetector`. |
| R-007 | TECH | **Draw-budget regression — `sanitizePending` must not consume RNG; effective stays 3 draws (cell, next value, displayRoll), noop 0.** Before sanitize, `resolveSpawn(ceiling, rng)` is called once on effective (2nd draw) and `rng()` once for displayRoll (3rd). A guard that called `rng()` inside `sanitizePending` or that conditioned on `safePending.value` to skip cell draw would shift budget. | 1 | 3 | 3 | Pin budgets: `spyRng` host `move(state,'left',spyRng(0.99,0.5,0.2))` 3 calls effective + `move(noop,'left',spyRng())` 0 calls + `newGame spyRng 20` unchanged; scan `rng` appears only in `pendingSpawn = {value: resolveSpawn(ceiling,rng), displayRoll: rng()}` 1 site + `spawnTile(... rng ...)` 1 site, not in `sanitizePending`. |
| R-008 | DATA | **ADR-06 snapshot isolation — `pendingSpawn = { ...safePending }` shallow copy vs `{ ...state.pendingSpawn }` mutation leak.** Before fix noop copied `state.pendingSpawn` which on well-formed input was already isolated, but on malformed `undefined` degraded to `{}` and a caller mutating `result.pendingSpawn.value=999` would have mutated nothing (empty). After fix the copy is still shallow; mutating `result.pendingSpawn` must not rewrite `state.pendingSpawn` (history). | 1 | 3 | 3 | Pin isolation: host `const result = move(state,'left',rngNoop); result.pendingSpawn.value=999; assert(state.pendingSpawn.value===original)` + scan `...safePending` 1 + existing `helpers.gameState` `deepFreezeBoard` still freezes board but pendingSpawn is `{...}` shallow. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | TECH | **Out-of-scope current.score NaN — `applyMove({score:NaN,best:5},{score:3,moved:true})→NaN,NaN` still poisons but is out of DW-24 scope (trust input posture). Review triage rejected as low informational.** | 1 | 2 | 2 | Monitor — spec Boundaries `Never: Change valid spawn values`; `current` is orchestrator-owned. If needed, extend sanitization to `current.score` with same `isFinite>=0` gate in a follow-up DW. |
| R-010 | TECH | **State null edge — `move(null as any,'left',rng)` still throws at `movementLines(state.board)` (DW scopes only pendingSpawn malformed). Same trust posture as malformed-rng.** | 1 | 2 | 2 | Monitor — `state null` is caller bug; `sanitizePending` only scopes to `pendingSpawn` field. Document residual; do not extend guard to whole `state`. |
| R-011 | PERF | **Guard cost — `Number.isFinite` per score (1), `Array.isArray(from)` per trace entry (≤16), `sanitizePending` 2 isFinite+2 range checks per move (1) — O(1) per move, `<0.01 ms`, vs frame budget `<8 ms`.** | 1 | 1 | 1 | Monitor — `npm test` full gate `<15 min` is sufficient; no bench lane. |
| R-012 | OPS | **Ledger `resolution-undo: f115c8c2…` 64-hex per DW-24/30/65 + `sprint-status.yaml` ownership.** Sweep marks 3 DW `done` with `resolution-undo: f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18`; `sprint-status.yaml` is orchestrator-owned and must not be written or reverted by this workflow. | 1 | 2 | 2 | Monitor — ledger already records 64-hex per entry; any reopen must keep hash. `git diff --stat` gate shows `deferred-work.md` + `spec-engine-defensive-guards.md` but NOT `sprint-status.yaml`. This plan never writes the latter. |

### Risk Category Legend

- **TECH**: `classify` Array guard vs `from[0]` deref, `sanitizePending` object/type guard vs `pendingSpawn.value` throw, `move` noop `{}` vs `{value:1,displayRoll:0}`, draw-budget invariant, snapshot isolation
- **SEC**: none this sweep (pure engine math, no auth/data exposure; `Array.isArray` + `isFinite` are data math, not security boundary)
- **PERF**: `isFinite` per score + per trace + `sanitizePending` 4 checks O(1) (R-011)
- **DATA**: `score+best NaN` lock (R-001), trace plan divergence vs `resultingTiles`/`occupiedCells` (R-002), `NaN` tile vs `ceilingDetector` silent ignore chain (R-003,R-008)
- **BUS**: noop score inflation vs best record (R-001), hold/merge drift vs spawn candidate leakage (R-002), `displayRoll NaN` vs preview band mis-bucket (R-003)
- **OPS**: `resolution-undo` 64-hex + `sprint-status.yaml` ownership + `tsc` gates (R-012)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-engine-defensive-guards` touches the **engine-never-throws + finiteness** seam only: **reliability/never-throw** (every `applyMove`/`classify`/`move` finite and non-throwing on `NaN/Infinity/-5/undefined/null/[]` including ragged pendingSpawn), **maintainability (single `Number.isFinite` score sanitizer + single `Array.isArray(from)` fence + single `sanitizePending` helper + single 64-hex `resolution-undo` per DW)**, **correctness** (valid-path byte-identical: finite ≥0 scores sum correctly, `from.length==2→merge / single-from==to→hold / else slide`, valid `{value,displayRoll}` spawns correctly), **60 FPS/frame budget unchanged** (O(1) guards, no worklet), and **offline/installability** unchanged (no new deps).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw + finiteness | `applyMove({10,20},{NaN/Infinity/-5:true})→10,20` + `{5:false}→10,20` (no NaN/Infinity/negative leak, `best` never NaN); `classify {from:[]/undefined/null}→slide` no throw; `move({pendingSpawn:undefined/NaN},dir,rng) → {value:1,displayRoll:0}` fallback both branches no throw. | R-001, R-002, R-003 | Host unit negative-path sweep: `applyMove` 4 probes + `planTileTransitions(...{from:[]})→slide` + `planTileTransitions(...{from:undefined})→slide` + `move(undefined pendingSpawn effective→1) + noop→{1,0}` + `move({value:NaN,displayRoll:NaN} effective board cell 1) + displayRoll NaN noop→0` — from spec Verification manual probe | `triade/__tests__/game/matchScore.test.ts` 8 pins + manual `Infinity→96` probe reinterpreted for score 10,20 + `triade/__tests__/render/transitionPlan.test.ts` 13 pins + `triade/__tests__/engine/game.test.ts` 32 pins + spec Verification single `node --loader tsx -e` 5-log probe (score 10,20×2 + slide plan + pendingSpawn {1,0} + board without NaN) |
| Maintainability | Single `Number.isFinite(raw) && raw>=0` in `matchScore.ts`; single `Array.isArray(from)` + `from.length===2` / `from.length===1` fence in `transitionPlan.ts`; single `sanitizePending` helper + `safePending.value` 1 site + `...safePending` 1 site in `game.ts`; `resolution-undo` 64-hex per resolved DW; no duplicate guard site. | R-001, R-002, R-003, R-012 | Static scans: `rg -n "Number\.isFinite\(raw\)" triade/src/game/matchScore.ts` ==1, `rg -n "Array\.isArray\(from\)" triade/src/render/transitionPlan.ts` ==1, `rg -n "function sanitizePending" triade/src/engine/core/game.ts` ==1, `rg -n "safePending\.value" triade/src/engine/core/game.ts` ==1, `rg -n "\.\.\.safePending" triade/src/engine/core/game.ts` ==1, `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` shows 3 new 64-hex entries DW-24/30/65. | Source scans + `matchScore.ts:12` + `transitionPlan.ts:21` + `game.ts:27,42,83,100` diffs + ledger diff |
| Correctness — valid-path byte-identical | `applyMove` finite `3 moved:true→13 best20` + `3+6→9 best10 +10→24 best24` vs `matchScore.test.ts:11-24` unchanged; `classify` `from [[0,0],[0,1]]→merge`, `from [[0,0]] to [0,0]→hold`, `spawned:true→spawn`, `moved:false→[]`; `game.move` valid `{value:2,displayRoll:0.5}` spawns `2` at candidate and resolves next `resolveSpawn(ceiling,rng)` correctly. | R-001, R-002, R-003, R-007 | Host boundary suite + chain: `matchScore.test.ts` 8 pass + `transitionPlan.test.ts` 13 pass + `game.test.ts` 32 pass + manual probe `finite score 3→13` + `hold/slide/merge/spawn` valid pins. | `matchScore.test.ts` 8 pass + `transitionPlan.test.ts` 13 pass + `game.test.ts` 32 pass + manual no-throw probe `valid inputs byte-identical` line |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn` (score 1 isFinite + classify Array per entry ≤16 + sanitizePending 4 checks O(1) per move), frame worst `<8 ms`, device `p99 <16.7 ms`. Guard adds `<0.01 ms` per `move()` / `applyMove()` / `classify()`. | R-011 | Host gate only: `npm --prefix triade test` median per 3-suite `<0.01 ms` (observed `<1 s` for 53-case suite); `feel.bench.test.ts` both-profile budget unchanged. | CI `npm test` timing + both `tsc` clean; no bench lane |
| Compliance — score+best / trace / spawn chain | `current.score + effective(sanitized, moved) → Math.max(best)` chain must stay finite and capped; any `NaN`/`Infinity` leak would corrupt `score` then `best` forever and `isNewRecord` signal; `ceilingDetector→tierForCeiling→potForTier→spawnTile(pendingValue)` chain must stay finite (NaN pendingSpawn already guarded, ceilingDetector already filters). | R-001, R-003, R-006 | Host + pipeline: `game.test.ts` 32 pass + `adaptive-spawn-integration` 5 suites + `pending-spawn-contract.test.ts` `N3` pin + `matchOrchestrator.test.ts` `isNewRecord` wiring. | `game.test.ts` 32 pass + `adaptive-spawn-integration` 5 suites + `matchScore.test.ts` `isNewRecord` 2 pins |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (matchScore + transitionPlan + game are pure TS `types`/`ceiling`/`spawn`). | — | `npm --prefix triade test` offline (no network) still green. | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. Guard cost `<0.01 ms` observed not threshold-invented. `displayRoll` fallback `0` vs `0.5` is documented as deterministic fallback (same as `newGame` displayRoll distribution `[0,1)` midpoint `0`). If a future sweep introduces a `score` upper bound, record its measured `MAX_SCORE` as baseline rather than inventing.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-engine-defensive-guards.md` intent/boundaries/I-O matrix 10 rows + 3 Tasks acceptance 4 ACs signed; DW-24/30/65 ledger entries `open→done` reviewed)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsx` + `tsconfig.test.json` (`TSX_TSCONFIG_PATH`) + `helpers.ts` `emptyBoard`/`boardWith`/`staticBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32` + `resultingTiles` oracle)
- [ ] Test data available or factories ready (`moveResult(score,moved)` 0-args helper, `emptyBoard()` 4×4, `staticBoard([1,2,null,null])` row 0 fixture, `EMPTY_FROM entry {spawned:false, from:[], to:[0,0], value:3}`, `MALFORMED_FROM {spawned:false, from: undefined as any, to:[0,0]}`, `MALFORMED_TO {spawned:false, from:[[0,0]], to: undefined as any}`, `gameState(board, {value:NaN,displayRoll:NaN} as any)` + scalar sweep `[NaN,Infinity,-5,0,5]` + `pendingSpawn {value: undefined as any, displayRoll: NaN}` + `rngOf(0,0,0.5)` 3-draw / `rngOf()` 0-draw noop)
- [ ] Feature deployed to test environment (commit `000b640` on host — `matchScore.ts:12` + `transitionPlan.ts:21` + `game.ts:27,42,83,100` patched + ledger `deferred-work.md` DW-24/30/65 + spec `Auto Run Result Status: done`; baseline `266aa03` committed; `git diff --stat -- triade/src` shows `matchScore.ts` + `transitionPlan.ts` + `game.ts` only vs baseline)
- [ ] No ceiling/line/feel/layout edits (`git diff --stat -- triade/src/engine -- triade/src/feel triade/src/ui triade/src/services` shows `game.ts` only inside engine, no `line.ts`/`ceiling.ts`/`spawn.ts` diff; `triade/src/game` shows `matchScore.ts` only; `triade/src/render` shows `transitionPlan.ts` only) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`applyMove NaN/Infinity/-5 moved:true→10,20` + `moved:false 5→10,20` + `classify []/undefined/null→slide` + `hold/slide/merge` valid + `game undefined→{1,0}` both branches + `NaN value→1` + `NaN displayRoll→0`)
- [ ] All P1 tests passing (or failures triaged with waivers) — `matchScore.test.ts` 8 pass + `transitionPlan.test.ts` 13 pass + `game.test.ts` 32 pass + draw 3/0 + ADR-06 isolation green
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigations green or formally waived with owner+expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on three seams; `rg` allowlists for single `isFinite`/`Array.isArray`/`sanitizePending` green)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (both via `TSX_TSCONFIG_PATH`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness+valid-path byte-identical, single-guard maintainability, O(1) frame budget, ADR-06 isolation)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns three-seam P0 guard pins (score NaN/Inf/-5+noop, classify empty/malformed, pendingSpawn undefined/NaN), valid-path byte-identical pipeline gates, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `matchScore.ts` NaN/Infinity/negative+noop guard vs `Math.max` lock, `transitionPlan.ts` `Array.isArray(from)` fence vs `sameCell` throw, `game.ts` `sanitizePending` fallback `1/0` + valid placement + draw budget `3/0` preservation |
| PM | PM | Signs defensive `engine-never-throws` posture (malformed inputs degrade to deterministic fallback, valid-path unchanged, ADR-06 snapshot isolation preserved), accepts `current.score NaN` / `state null` residual (spec-allowed deferred) |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, already green (manual probe + existing suites 8+13+32)

**Criteria**: Blocks `NaN` poison / `TypeError` throw / `undefined.value` throw / `{} ` loss / `NaN` tile placement vs `ceilingDetector` silent ignore, or `best NaN` lock — high risk (≥6) + no workaround (every move flows through these three seams)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `applyMove({score:10,best:20},{score:NaN,moved:true})→{score:10,best:20}` no `NaN` poison | Unit | R-001 | 1 | QA (done) | Spec I-O `NaN score` row + manual probe `console.log(applyMove(...,{score:NaN,moved:true}))→10,20`; gate `Number.isFinite(raw)` fallback 0. |
| AC — `applyMove Infinity→10,20` and `-5→10,20` floored to 0 on moved:true | Unit | R-001, R-004 | 2 | QA (done) | `Infinity>=0 false so 0`, `-5<0 so 0`; scan `raw>=0` 1 hit. |
| AC — `applyMove({score:10,best:20},{score:5,moved:false})→{score:10,best:20}` noop forced 0, no inflation | Unit | R-001 | 1 | QA (done) | `effective = moved ? sanitized : 0`; existing `matchScore.test.ts:27 'noop move (score 0) adds nothing'` kept but `score>0 moved:false` pin is new guard probe. |
| AC — `classify {spawned:false, from:[], to:[0,0], value:3}→slide` no throw | Unit | R-002 | 1 | QA (done) | Manual probe `planTileTransitions(emptyBoard(),{moved:true,trace:[{value:3,to:[0,0],from:[],spawned:false}]})→slide` — from `[]` length 0 falls to final `return 'slide'`. |
| AC — `classify {spawned:false, from: undefined as any}→slide` and `from: null as any→slide` and `from: {} as any→slide` no throw | Unit | R-002 | 2 | QA (done) | `if (!Array.isArray(from)) return 'slide'` fence; `rg` shows 1 hit. Also `from not array` vs empty array are distinct branches. |
| AC — `classify` valid still `merge` / `hold` / `slide` byte-identical: `from [[0,0],[0,1]]→merge`, `from [[0,0]] to [0,0]→hold`, `from [[0,0]] to [0,1]→slide`, `spawned:true→spawn` | Unit | R-002, R-005 | 4 | QA (done) | Ensures guard did not flip valid taxonomy; sameCell `Array.isArray(to) && to.length===2 && typeof` fence keeps hold strict. |
| AC — `game.move({board:b, pendingSpawn: undefined as any},'left',rngOf(0,0,0.5))→pendingSpawn {value:1,displayRoll:0}` on effective (no throw, spawn value 1 at candidate) + `board` cell not `NaN` | Unit | R-003 | 1 | QA (done) | `sanitizePending(undefined)→{1,0}` then `spawnTile(...,safePending.value=1)` — `ceilingDetector` not poisoned. Manual probe `board[0]` row check. |
| AC — `game.move({board:b, pendingSpawn: undefined as any},'left',rngOf(0,0,0.5))` noop path `pendingSpawn → {value:1,displayRoll:0}` not `{}`, both fields present | Unit | R-003 | 1 | QA (done) | `pendingSpawn = {...safePending}` vs old `{...undefined}→{}`; `Object.keys(pendingSpawn) 2` pin. |
| AC — `game.move({board:b, pendingSpawn:{value:NaN,displayRoll:NaN} as any},'left',rngOf(0,0,0.5))` effective `board[0][3]===1` (not NaN) and `pendingSpawn {value: finite, displayRoll finite}` + noop `displayRoll NaN→0` | Unit | R-003, R-006 | 2 | QA (done) | `safeValue isFinite&&>0? v :1` + `safeDisplay isFinite&&>=0&&<1? dr :0`; valid displayRoll `[0,1)` narrow, not just `isFinite`. |
| AC — Manual probe gate from spec Verification: single `node --loader tsx -e` 5-log run `applyMove NaN→10,20` + `moved:false 5→10,20` + `plan ...from:[]→slide` + `undefined pendingSpawn→{1,0}` + `NaN spawn→1` | Unit | R-001, R-002, R-003 | 1 | QA (done) | Spec `Verification` command — run host, expect `10,20 ×2 + slide plan + {value:1,displayRoll:0} not {} + board row without NaN`; covers all 3 seams in one command. |
| AC — Valid-path smoke: finite score 3 moved:true still `+3 best bump`, `from [[0,0]] to [0,0] hold`, valid `pendingSpawn {value:2}→spawn 2` at `[0,3]` | Unit | R-001, R-002, R-003 | 1 | QA (done) | I-O last row `Valid paths unchanged` — same probe last line verifies no regression on finite score. |

**Total P0**: 17 checks (score 4 + classify 3 malformed + 4 valid taxonomy + game 4 malformed + probe 1 + valid 1), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & wall pipeline

**Criteria**: Important valid-path byte-identical pipeline + medium/high risk + common game workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| `matchScore.test.ts` 8 suites still green: `initialScore 0+best`, `accumulate 3+6→9 best10`, `best tracks 12+2→20 stays then +10→24 best24`, `noop 0→3 best10 unchanged`, `isNewRecord 5→6 true, 5→5 false`, `session best wiring`, `no moved/trace leak` | Unit | R-001, R-004 | 8 | QA | `npm test -- __tests__/game/matchScore.test.ts` 8 pass — byte-identical guard keeps existing 0/3/6/12/10/24 wall. |
| `transitionPlan.test.ts` 13 cases still green: `slide 4 dirs ([0,0]/[0,3]/[3,1] wall)`, `merge 1+2×2 + equal>=3`, `hold stationary [0,0]`, `noop empty plan`, `1+1/2+2 no-merge`, `last-empty [3,3]`, `prevBoard-ignored` | Unit | R-002, R-005 | 13 | QA | `npm test -- __tests__/render/transitionPlan.test.ts` 13 pass — classify still returns `slide/merge/hold/spawn` correctly for valid traces. |
| `game.test.ts` 32 suites still green: `newGame 9 tiles`, `weightedValue 40/40/20`, `HAPPY_PATH 1+2→3 [3,null,null,1] +3`, `NO_1_1/2_2 noMerge`, `EQUAL_GE3 cascade`, `ONE_CELL compact`, `right/up/down mirrors`, `trace spawned`, `full-board spawn nothing`, `pickIndex clamp`, `3-draw effective / 20-draw newGame / 0-draw noop`, `GAME_OVER 4` | Integration (game) | R-003, R-007, R-008 | 32 | QA | `npm test -- __tests__/engine/game.test.ts` 32 pass — valid `pendingSpawn {value:1 displayRoll:0.5}` path byte-identical, draw budgets intact. |
| Draw-budget pins: effective `move(...,spyRng(0.99,0.5,0.2))` 3 calls, noop `spyRng()` 0 calls, `newGame spyRng 20` | Unit | R-007 | 3 | QA | `game.test.ts` `spawn happens exactly once` + `newGame returns 9 tiles` already assert; sanitize adds 0 draws — add `spyRng` isolate pin. |
| ADR-06 snapshot isolation: mutating `result.pendingSpawn.value=999` after `move(noop)` does not mutate `state.pendingSpawn` | Unit | R-008 | 1 | QA | `const st=gameState(b); const r=move(st,'left',rngNoop); r.pendingSpawn.value=999; assert(st.pendingSpawn.value===1)` — shallow `{...safePending}` provenance. |
| `ceilingDetector` chain unaffected: placing `safePending.value=1` vs `NaN` — next `resolveSpawn(ceiling,rng)` still sees finite ceiling `0..768`, `ceiling.ts` filter `isFinite&&>0` still green, `adaptive-spawn-integration` 5 suites `tier>=1 v<=ceiling` companion + `N3 promise` stay green | Integration (engine) | R-003 | 5 | QA | `adaptive-spawn-integration` 5 suites prove `pendingSpawn→spawnTile→ceilingDetector→tierForCeiling→potForTier` still capped. |
| Ledger `deferred-work.md` DW-24/30/65 `done` with `resolution-undo: f115c8c…` 64-hex, `sprint-status.yaml` untouched | Static | R-012 | 1 | QA | `rg -n "status: done 2026-09-02" deferred-work.md` shows 3 hits DW-24/30/65 each with `resolution-undo: f115c8…`; `git diff --stat` shows `deferred-work.md` but not `sprint-status.yaml`. |

**Total P1**: 63 checks (8+13+32+3+1+5+1), ~1.2–2.0 h host (mostly existing suites, manual probe guard already landed)

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary helper edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-guard allowlists — `matchScore.ts` `Number.isFinite(raw)` 1 + `result.moved` 1, `transitionPlan.ts` `Array.isArray(from)` 1 + `from.length===2` 1 + `from.length===1` 1 + `Array.isArray(first)` 1 + `Array.isArray(to)` 1 + `typeof first[0]` 1, `game.ts` `function sanitizePending` 1 + `safePending.value` 1 + `...safePending` 1 | Static scan | R-001, R-002, R-003 | 1 | QA | Any second `sanitizePending` or reintroduced `state.pendingSpawn.value` bare is a fail; `rg -n "sanitizePending" triade/src/engine/core/game.ts` stays 2 (def + call), `rg -n "state\.pendingSpawn\.value"` ==0. |
| No bare-score sum — `rg -n "current\.score \+ result\.score" triade/src/game/matchScore.ts` ==0 and `rg -n "current\.score \+ effective" triade/src/game/matchScore.ts` ==1 (sanitized path) | Static scan | R-001 | 1 | QA | Old `current.score + result.score` predicate gone; only `current.score + effective` remains. |
| Hold fence scan — `rg -n "sameCell\(first" triade/src/render/transitionPlan.ts` ==1 (only guarded path) and `rg -n "sameCell\(entry\.from\[0\]" triade/src/render/transitionPlan.ts` ==0 (no bare deref) | Static scan | R-002, R-005 | 1 | QA | Ensures `sameCell` is only called after `Array.isArray(first)&&length===2 && Array.isArray(to)&&length===2 && typeof===number` gate. |
| PendingSpawn shape — `rg -n "PendingSpawn" triade/src/engine/core/types.ts` interface still `{value:number, displayRoll:number}` and `rg -n "GRID_SIZE = 4" triade/src/engine/core/types.ts` ==1, `displayRoll` range `[0,1)` only — no `displayRoll >=0` without `<1` | Static scan | R-003, R-006 | 1 | QA | Keeps `MoveResult/GameState/TraceEntry` shapes + `GRID_SIZE=4` + `displayRoll` window `>=0&&<1` strict (not just `isFinite`). |
| Ledger + spec hashes — `rg -n "resolution-undo: f115c8c2" _bmad-output/implementation-artifacts/deferred-work.md` 3 hits DW-24/30/65 + `rg -n "final_revision: c7e1c51" _bmad-output/implementation-artifacts/spec-engine-defensive-guards.md` 1 | Static scan | R-012 | 1 | QA | Doc pin only; `deferred-work.md` DW entries each 64-hex `f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18` — revert trail. |

**Total P2**: 5 checks, ~0.5–0.9 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — `pendingSpawn {value: 0 as any}→1` vs `value: -1→1` vs `value: Infinity→1` vs `value: "3" as any→1` all fallback 1; `displayRoll: -0.1→0`, `1→0`, `1.5→0`, `NaN→0`, `undefined→0`, `0.5→0.5` kept | Unit (host `node`) | 1 | QA | No assertion beyond no-throw + `{value:1,displayRoll:0}` fallback vs `0.5` preserved; if hit file residual DW for `displayRoll` edge (R-006). |
| Exploratory — `applyMove` with `result.score` as string `as any "3"` →0 (typeof guard) vs `3.5→3.5` kept (finite >=0 float allowed) | Unit | 1 | QA | Type guard `typeof raw==='number'` proves non-number degraded; float scores are engine-valid. |
| Micro-zero — `planTileTransitions(prevBoard,{moved:false,trace:[{value:3,to:[0,0],from:[[],[]] as any}]})→[]` (moved:false short-circuits before classify) + `planTileTransitions(...{moved:true, trace:[{value:3,to:[0,0],from:[[0,0]],spawned:true}]})→spawn` even with malformed `from` (spawn takes precedence) | Unit | 1 | QA | Already `moved:false →[]` but classify not called; spawn `spawned:true` bypasses `from` check (R-002 spawn path). |
| No-leak ladder bench — `applyMove` 10k× random `score NaN/Infinity/-5` sanitized median `<0.01 ms` + `classify` 10k× `from:[]`→slide median `<0.01 ms` + `sanitizePending(undefined)` 10k× median `<0.01 ms` (guards O(1), no bench lane beyond `feel.bench.test.ts` full-board `median/p99` unchanged) | Unit (bench) | 1 | DEV | Engine `<2 ms/turn`, frame worst `<8 ms`; guard adds `<0.01 ms` per call — just confirm no `while` infinite (no loop). Not a new lane, just CI `npm test` timing. |
| Cross-cutting negative scan — `rg -n "music\|bgm\|RevenueCat\|AdMob" triade/src/engine --include="*.ts"` empty + `rg -n "current\.score.*NaN" triade/src/game/matchScore.ts` empty (no current-score sanitization, intentional residual) | Static scan | 1 | QA | Trivial hygiene; carry-over — prove sweep stayed in scope + residual is documented. |

**Total P3**: 5 checks, ~0.3–0.6 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch guard/format regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/game/matchScore.test.ts __tests__/render/transitionPlan.test.ts __tests__/engine/game.test.ts` green on clean working tree (53 pass = 8+13+32) — includes `initialScore`, `accumulate`, `noop`, `slide 4 dirs`, `merge`, `hold`, `spawn [3,3]`, `last-empty`, `newGame 9 tiles`, `3-draw/0-draw`, `GAME_OVER`
- [ ] Manual probe from spec Verification (single command): `node --loader tsx -e "import {applyMove,initialScore} from './triade/src/game/matchScore.ts';import {planTileTransitions} from './triade/src/render/transitionPlan.ts';import * as g from './triade/src/engine/core/index.ts';import {gameState,emptyBoard,rngOf} from './triade/test-utils/helpers.ts';console.log(applyMove({score:10,best:20},{board:emptyBoard(),score:NaN,moved:true,trace:[],pendingSpawn:{value:1,displayRoll:0}}));console.log(applyMove({score:10,best:20},{board:emptyBoard(),score:5,moved:false,trace:[],pendingSpawn:{value:1,displayRoll:0}}));console.log(planTileTransitions(emptyBoard(),{board:emptyBoard(),score:0,moved:true,trace:[{value:3,to:[0,0],from:[],spawned:false}],pendingSpawn:{value:1,displayRoll:0}}));let b=emptyBoard();b[0]=[1,2,null,null];for(let r=1;r<4;r++)b[r]=[3,6,12,24];console.log(g.move({board:b,pendingSpawn:undefined as any},'left',rngOf(0,0,0.5)).pendingSpawn);console.log(g.move({board:b,pendingSpawn:{value:NaN,displayRoll:NaN} as any},'left',rngOf(0,0,0.5)).board[0])"` — expect `10,20 ×2 + slide plan + {value:1,displayRoll:0} not {} + board row without NaN`
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore`, guards typed `unknown→number`)
- [ ] `rg -n "Number\.isFinite\(raw\)" triade/src/game/matchScore.ts | wc -l` ==1 and `rg -n "Array\.isArray\(from\)" triade/src/render/transitionPlan.ts | wc -l` ==1 and `rg -n "sanitizePending" triade/src/engine/core/game.ts | wc -l` ==2 (def+call) and `rg -n "state\.pendingSpawn\.value" triade/src/engine/core/game.ts | wc -l` ==0 (quick scan)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical three-seam guards (host only)

- [ ] Score poison: `NaN/Infinity/-5 moved:true→10,20` + `moved:false 5→10,20` (no `best NaN/Infinity` lock)
- [ ] Classify malformed: `from:[]→slide`, `from:undefined→slide`, `from:null→slide` no throw, plus `merge [2]→merge` and `hold [0,0]==[0,0]→hold` vs `[0,1]→slide`
- [ ] pendingSpawn malformed: `undefined→{1,0}` both branches + `NaN→1` board not NaN + `NaN displayRoll→0` + `valid 2→spawn 2` byte-identical
- [ ] Manual probe 5-log single command (covers all 3 seams) + valid-path smoke `finite 3→13 hold/spawn`

**Total**: 17 P0 checks (already passing in `000b640` — existing suites 53 + manual probe green)

### P1 Tests (<30 min)

**Purpose**: Pipeline + ladder chain

- [ ] `matchScore.test.ts` 8 pass + `transitionPlan.test.ts` 13 pass + `game.test.ts` 32 pass (valid-path byte-identical)
- [ ] Draw `spyRng 3/0/20` + ADR-06 isolation `result.pendingSpawn` mutate not leak + `ceilingDetector` chain 5 suites `tier>=1 v<=ceiling`
- [ ] Ledger `resolution-undo: f115c8c2…` 3 hits + `git diff --stat -- triade/src` shows 3 files only, not `sprint-status.yaml`

**Total**: 63 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, bench, exploratory

- [ ] Single-guard / single-fence / `current+effective` + `sameCell` + shape 5 scans (<1 min)
- [ ] Ledger `resolution-undo` 64-hex 3 hits + `git diff` `sprint-status.yaml` untouched (<1 min)
- [ ] Ragged pendingSpawn exploratory + micro-bench + cross-cutting scan (<3 min)

**Total**: 10 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 17 | ~0.08 | ~1.0–1.6 | Pure `matchScore.ts` 4 + `transitionPlan.ts` 7 + `game.ts` 4 + probe 1 + valid 1 are O(1) host; malformed `from:[]/undefined` + `pendingSpawn undefined/NaN` + `NaN/Infinity/-5` already green (done in `000b640`) |
| P1 | 63 | ~0.05 | ~1.4–2.6 | Existing `matchScore:8` + `transitionPlan:13` + `game:32` + draw 3 + isolation 1 + chain 5 + ledger 1 (mostly existing suites, manual probe guard already landed) |
| P2 | 5 | ~0.12 | ~0.4–0.8 | Static allowlists + bare-sum 0-hit + hold fence + shape + ledger doc pin |
| P3 | 5 | ~0.10 | ~0.3–0.6 | Ragged pendingSpawn exploratory + non-number score + moved:false classify + micro-bench + cross-cutting scan |
| **Total** | **90** | **-** | **~3.0–5.6** | **~0.4–0.7 days host; full gate `<15 min` (`npm test` + `tsc` + `rg`) — no device bench lane required; guards are O(1) <0.01ms** |

### Prerequisites

**Test Data:**

- `moveResult(score,moved)` helper `__tests__/game/matchScore.test.ts:5` + `emptyBoard()` 4×4 + `staticBoard([1,2,null,null])` row 0 + `boardWith` 4×4 16-cell + `gameState(board, pendingSpawn)` + `EMPTY_FROM {spawned:false, from:[], to:[0,0], value:3}` + `MALFORMED {from: undefined as any}` + `pendingSpawn {value:NaN,displayRoll:NaN} as any` + `rngOf(0,0,0.5)` 3-draw / `rngOf()` 0-draw + `spyRng` + `mulberry32(seed)` + `resultingTiles`/`occupiedCells` oracle + `stateFromResult`/`preSpawnBoardOf`
- `GRID_SIZE=4` + `POT_BASE_VALUE` + `MAX_POT_TIER=30` + `FIXED_WEIGHTS 40/40` + `POT_CURVE` fixtures (for chain `ceilingDetector` still skips `NaN` tile)

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `rg` (ripgrep) for allowlist scans (`Number.isFinite(raw)`, `Array.isArray(from)`, `sanitizePending`, `safePending.value`, `...safePending`, `state.pendingSpawn.value`, `sameCell(first`, `resolution-undo`, `f115c8c2`)
- `npm --prefix triade exec -- tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — matchScore/transitionPlan/game are pure TS, no native module)
- Working tree on `266aa03` baseline + `000b640` delta; `triade/src` delta guard 3 files only

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — `NaN/Infinity/-5→0` + `moved:false→0` + `from:[]/undefined→slide` + `hold/merge` valid + `undefined→{1,0}` + `NaN→1` + `displayRoll NaN→0` + probe 5-log)
- **P1 pass rate**: ≥95% (waivers required for failures — e.g. `adaptive-spawn-integration` statistical `N=10k` 5σ tripwire may be `WAIVED` only with seed reason if `sigmaBound` 5σ headroom drifts)
- **P2/P3 pass rate**: ≥90% (informational; static allowlists must be 100%)
- **High-risk mitigations**: 100% complete or approved waivers with owner + expiry (R-001..R-003)

### Coverage Targets

- **Critical paths**: ≥90% (score poisoning 4 probes + classify malformed 3 + pendingSpawn undefined/NaN 4 + valid 3 are all critical)
- **Three-seam scenarios**: 100% (`NaN/Infinity/-5→10,20`, `moved:false 5→10,20`, `from:[]/undefined→slide`, `hold [0,0]→hold`, `undefined pendingSpawn→{1,0}` both branches, `NaN value→1`, `NaN displayRoll→0` must be PINNED)
- **Business logic** (`applyMove` `isFinite>=0 && moved` + `classify` `Array.isArray(from)/to/first + sameCell` + `sanitizePending` `isFinite&&>0 / >=0&&<1 →1/0`): ≥85%
- **Edge cases** (empty `from`, `undefined` `from`, `null` `from`, `from length 2→merge`, `hold to undefined→slide`, `pendingSpawn {value:"3"}` string→1, `displayRoll -0.1→0`, `1→0`, `moved:false` before classify): ≥80%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`NaN/Infinity/-5 moved:true→10,20` + `moved:false 5→10,20` + `from:[]/undefined/null→slide` + `hold/merge` valid + `undefined pendingSpawn→{1,0}` both branches + `NaN value→1 board not NaN` + `NaN displayRoll→0`)
- [ ] No high-risk (≥6) items unmitigated (R-001..R-003 mitigations green or formally waived with owner+expiry)
- [ ] Score invariant holds (`Infinity` never becomes `score`/`best`, `Math.max(NaN,20)` never `NaN`, `moved:false` never inflates)
- [ ] No bare `state.pendingSpawn.value` and no `sameCell(entry.from[0]` deref (1 `Array.isArray(from)` + 2 `sanitizePending` sites, 0 bare)
- [ ] pendingSpawn fallback `1/0` documented (`value:1` when `!isFinite||<=0`, `displayRoll:0` when `!isFinite||<0||>=1`) + `GRID_SIZE=4` + `MoveResult/GameState/TraceEntry` shapes preserved
- [ ] `npx tsc --noEmit` clean for both `tsconfig.json` + `tsconfig.test.json` (no new `@ts-ignore` outside `rn-stub` ring)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness+valid-path byte-identical, single-guard maintainability, O(1) frame budget, ADR-06 isolation)

---

## Mitigation Plans

### R-001: Score poisoning via applyMove — NaN/Infinity/-5 / moved:false inflation (Score: 6)

**Mitigation Strategy:** Pin score contribution as **sanitized `isFinite>=0` else 0 and `moved?sanitized:0`**: host unit `applyMove({10,20},{NaN,true})→10,20` + `Infinity→10,20` + `-5→10,20` + `5,false→10,20`; grep `Number.isFinite(raw)` 1 + `result.moved ? sanitized` 1 + `raw >= 0` 1; existing `matchScore.test.ts:11-27` `3+6→9 best10` + `12+2 stays 20 +10→24 best24` + `noop 0→3` stay green proves finite path unchanged.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-24)
**Status:** Complete (code `000b640: matchScore.ts:12` guard landed + manual probe `10,20×2` green + `tsc` clean)
**Verification:** `npm --prefix triade test -- __tests__/game/matchScore.test.ts` (8 pass) + `rg -n "Number\.isFinite\(raw\)" triade/src/game/matchScore.ts` ==1 + `rg -n "result\.moved \? sanitized" triade/src/game/matchScore.ts` ==1 + manual probe `NaN→10,20` + `5,false→10,20`

### R-002: classify throw on empty/malformed from (Score: 6)

**Mitigation Strategy:** Fence `from` as **Array guard before deref**: `if (!Array.isArray(from)) return 'slide'` + `if (from.length===2) return 'merge'` + `if (from.length===1) { if (Array.isArray(first)&&first.length===2 && Array.isArray(to)&&to.length===2 && typeof first[0]==='number' && typeof first[1]==='number' && sameCell(first,to)) return 'hold'; return 'slide'; } return 'slide'` ; host pins `from:[]→slide` + `from:undefined→slide` + `from:null→slide` no throw + valid `merge/hold/slide/merge` stay; grep `Array.isArray(from)` 1 + `from.length===2` 2 + `sameCell(first` 1 and `sameCell(entry.from[0]` 0.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-30)
**Status:** Complete (`transitionPlan.ts:21` fence landed; `planTileTransitions(...{from:[]})→slide` manual probe green)
**Verification:** Manual probe `from:[]→slide` no throw + `from:undefined→slide` + `from: null→slide` + `rg -n "Array\.isArray\(from\)" triade/src/render/transitionPlan.ts` ==1 + `rg -n "sameCell\(entry\.from" triade/src/render/transitionPlan.ts` ==0 + `npm --prefix triade test -- __tests__/render/transitionPlan.test.ts` 13 pass

### R-003: game.move pendingSpawn malformed — undefined throw / {} loss / NaN placement (Score: 6)

**Mitigation Strategy:** Degrade via **`sanitizePending` fallback `{value:1,displayRoll:0}`**: `if (!raw||typeof raw!=='object')→{1,0}`, `safeValue isFinite&&>0?v:1`, `safeDisplay isFinite&&>=0&&<1?dr:0`; host `undefined pendingSpawn effective→{1,0} board[0][3]===1` + `undefined noop→{1,0} not {}` + `NaN value→1` + `NaN displayRoll→0`; scan `function sanitizePending` 1 + `safePending.value` 1 + `...safePending` 1 + `state.pendingSpawn.value` 0 (no bare); valid `{value:2,displayRoll:0.5}→spawn 2 at [0,3]` stays.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-65)
**Status:** Complete (`game.ts:27 sanitizePending` + `safePending` 2 sites landed; manual probe `undefined→{1,0}` + `NaN→1` green)
**Verification:** Manual probe `undefined→{1,0}` + `NaN spawn board not NaN` + `rg -n "function sanitizePending" triade/src/engine/core/game.ts` ==1 + `rg -n "safePending\.value" triade/src/engine/core/game.ts` ==1 + `rg -n "\.\.\.safePending" triade/src/engine/core/game.ts` ==1 + `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass + `pending-spawn-contract.test.ts` chain

---

## Assumptions and Dependencies

### Assumptions

1. Production `MoveResult.score` is always finite ≥0 and `moved:false` means `score 0` via `game.ts shiftLine score` + `boardsEqual` (spec I-O: malformed scores are harness/fuzz/edge only; `deferred-work.md` DW-24 says "Engine contract guarantees finite ≥0 scores and noop scores 0; defensive guard only"). Guard paths are defensive-only.
2. Production `TraceEntry.from` is always `[]` for `spawned:true` and non-empty `[[r,c]]` or `[[r0,c0],[r1,c1]]` for `spawned:false` via `boardFromLines` (spec Design Notes: "engine contract guarantees non-empty from for non-spawn"). Malformed `from` is render-seam fuzz only.
3. Production `GameState.pendingSpawn` is always `{value: number>0 finite, displayRoll: [0,1) finite}` via `newGame`/`resolveSpawn` + `rng()` (spec `pendingSpawn {value,displayRoll}` well-formed vs malformed sanitization table). Malformed pendingSpawn is persisted-state corruption / fuzz only.
4. Valid spawn values are `1,2,3*2^k` finite `>0`; `displayRoll` is `[0,1)` per Epic 7 preview band `60/40`; `GRID_SIZE=4` stays fixed (spec `Never: Change GRID_SIZE, introduce async I/O, or alter tier/spawn RNG budgets`).
5. Draw budgets are pinned: `newGame 20`, effective `3` (cell pick 1 + `resolveSpawn` 1 + `displayRoll` 1), noop `0`; `sanitizePending` consumes 0 draws (spec Boundaries `Always: draw budget (effective 3, noop 0) unchanged`).
6. ADR-06 snapshot isolation holds: `result.pendingSpawn` is a shallow copy that callers may mutate without rewriting history; `board` is frozen via `helpers.gameState` `deepFreezeBoard`.

### Dependencies

1. `triade/src/engine/core/types.ts:1-16` `Board/Cell 4×4` + `PendingSpawn {value,displayRoll}` + `TraceEntry/MoveResult/GameState` — required for shape pins; `git diff --stat -- triade/src/engine` shows `types.ts` byte-identical.
2. `triade/src/engine/core/spawn.ts:58-96` `spawnTile` — required to prove sanitized `value 1` placement vs `NaN` placement divergence and `ceilingDetector` filter `isFinite&&>0` skip; `triade/src/engine/core/ceiling.ts:23-36` already skips `NaN`/`Infinity`/0/negative.
3. `triade/__tests__/game/matchScore.test.ts:1-42` 8-case suite + `triade/__tests__/render/transitionPlan.test.ts:1-202` 13-case + `triade/__tests__/engine/game.test.ts:1-240` 32-case — required as P1 baselines; `npm --prefix triade test -- __tests__/game/matchScore.test.ts __tests__/render/transitionPlan.test.ts __tests__/engine/game.test.ts` must stay 53 pass before sweep lands P0 malformed pins.
4. `triade/test-utils/helpers.ts: gameState/emptyBoard/staticBoard/boardWith/rngOf/spyRng` + `resultingTiles` oracle — required for pendingSpawn malformed probes and draw-budget asserts; `git diff --stat -- triade/test-utils` shows `helpers.ts` unchanged (no new helper drift).
5. `_bmad/tea/config.yaml` `test_artifacts: _bmad-output/test-artifacts` + `test_design_output: _bmad-output/test-artifacts/test-design` — required for output path `_bmad-output/test-artifacts/test-design/test-design-dw-engine-defensive-guards.md`.

### Risks to Plan

- **Risk**: Manual probe `applyMove({10,20},{NaN,true})→10,20` + `planTileTransitions(...{from:[]})→slide` + `move(undefined→{1,0})` not yet in `matchScore.test.ts`/`transitionPlan.test.ts`/`game.test.ts` (only spec Verification) — a follow-on that reverted guards to `current.score+result.score` / `entry.from[0]` / `state.pendingSpawn.value` would pass existing 53 but fail the probes.
  - **Impact**: `NaN` `best` lock / `TypeError` on empty `from` / `undefined.value` throw would be hidden until fuzz/manual QA.
  - **Contingency**: Promote probe pins to committed `defensive-guards.atdd.test.ts` if guards ever regress; keep probes in this plan's P0 Smoke as the gate until then.

- **Risk**: `isNewRecord(previousBest, score)` vs `current.best` conflation still live (DW-33) — `applyMove` fixing `score+best` but `isNewRecord` still called with stale `current.best` by orchestrator would miss new-record signal once `score` passes persisted best (spec `isNewRecord` section `must be called with the session-start (persisted) best, never current.best`).
  - **Impact**: Game-over overlay missed new-record badge; `best` itself is correct (`Math.max`) but UI signal is stale.
  - **Contingency**: `matchOrchestrator.test.ts` already pins `isNewRecord(storedBest, score)` vs `isNewRecord(liveBest, score)` false; keep that pin as P1 and document caller contract in `matchScore.ts:17` comment.

---

## References

- Spec: `_bmad-output/implementation-artifacts/spec-engine-defensive-guards.md` (`baseline_revision: 266aa03`, `final_revision: c7e1c51`, `status: done`, 3 Tasks + 10-row I-O matrix + 4 ACs + Verification single `node --loader tsx -e` 5-log)
- Code under test: `triade/src/game/matchScore.ts:12` + `triade/src/render/transitionPlan.ts:21` + `triade/src/engine/core/game.ts:27,42,83,100` (diff `000b640` vs `266aa03`)
- Existing suites: `triade/__tests__/game/matchScore.test.ts:5 moveResult` + `triade/__tests__/render/transitionPlan.test.ts:7 boardOf` + `triade/__tests__/engine/game.test.ts:7 newGame 9 tiles / 32 move paths` + `triade/__tests__/engine/adaptive-spawn-integration.test.ts` 5 + `triade/__tests__/engine/pending-spawn-contract.test.ts` N3 + `helpers.ts: gameState(emptyBoard deepFreeze + clone + {…pendingSpawn})`
- Prior sweep references (pattern reuse): `test-design-dw-engine-ceiling-hardening.md` 437 lines (row/tile guard vs tier ladder), `test-design-dw-engine-line-compaction.md` (wall-scan vs `GRID_SIZE` guard)
- TEA config: `_bmad/tea/config.yaml` (`test_artifacts: _bmad-output/test-artifacts`, `test_design_output: _bmad-output/test-artifacts/test-design`, `risk_threshold: p1`, `communication_language: Português`, `document_output_language: English`)
