---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/board.ts'
  - 'triade/__tests__/engine/spawn-placement.test.ts'
  - 'triade/__tests__/engine/spawn-candidates.unit.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-engine-spawn-candidates-validation — single-source pool validation + dedup for second callers (DW-72, DW-73)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-engine-spawn-candidates-validation`
**Scope:** Targeted test design for the working-tree delta of `dw-engine-spawn-candidates-validation`

> **Delta under assessment:** Working-tree `git diff HEAD` is 2 files (`triade/src/engine/core/spawn.ts` + `_bmad-output/implementation-artifacts/deferred-work.md` DW-72/73 `open→done` + `spec-engine-spawn-candidates-validation.md` untracked). Production delta is `triade/src/engine/core/spawn.ts:102-122` vs baseline `51e4677` (`spec-engine-spawn-candidates-validation.md` `status: done`, `review_loop_iteration: 1`):
> - `triade/src/engine/core/spawn.ts:102-122` — replaces `const pool = candidates.filter(([r,c])=> r>=0 && r<GRID_SIZE && c>=0 && c<GRID_SIZE && board[r][c]===null)` with a loop + `Set<string>` dedup. New guard: `if (!Array.isArray(candidates)) return {board: next, cell:null, value:null}` (non-array `null`/object/number guard) then for each `entry as unknown` → `!Array.isArray(entry)||entry.length<2` continue; `typeof r/c !== 'number'` continue; `!Number.isInteger(r/c)` continue; `r<0||r>=GRID_SIZE||c<0||c>=GRID_SIZE` continue; `board[r]?.[c]!==null` (occupied via optional chaining) continue; `seen.has(key)` continue; `pool.push([r,c])`. Preserves `cloneBoard` at top, `pool.length===0 → 0 draws` early return, `pickIndex(pool.length, rng)` single draw otherwise. Adds DW-72/73 comment `triade/src/engine/core/spawn.ts:102-106`.
> - `triade/src/engine/core/game.ts:53-78` — byte-identical (`git diff HEAD -- triade/src/engine/core/game.ts` 0). Production opposite-edge candidate generation (`oppCol/oppRow` + `shifted[i].moved` push) untouched; guarantees distinct in-bounds empties for the live path.
> - `triade/src/engine/core/types.ts:1` — `export const GRID_SIZE = 4` untouched.
> - Spec `_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md:1-108` — NEW bundle wiring 8-row I/O matrix (OOB, null, missing c, non-number, duplicate dedup, valid pool, mix, omitted) + Code Map + Tasks/ACs + Review Triage (0/0/0) + Verification (`npm test 910 pass`, `tsc --noEmit clean`, 13-case edge script).
> - Ledger `_bmad-output/implementation-artifacts/deferred-work.md:593-603` — DW-72, DW-73 flipped `status: open` → `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-spawn-candidates-validation` + `resolution-undo: 365ffe33… 73…` (hex `status: open` tail `73…6e`), exactly the hygiene bundle pattern.

---

## Executive Summary

**Scope:** Close DW-72 (malformed/OOB/null `candidates` throws or leaks OOB) and DW-73 (duplicate cells inflate `pool` and bias `pickIndex` uniform AC3) at a single source — `spawnTile` candidates pool construction — without touching the production `game.ts` opposite-edge path. The old `filter(([r,c])=>…)` destructures the entry before any guard, so `candidates=[null]` throws `TypeError: null is not iterable`, and `[4,0]` or `[1]` are either OOB-filtered by numeric compare or silently produce `board[1]===undefined` / `board[1][undefined]`, while `[0,0],[0,0]` inflates `pool.length` from 2 to 3 and makes `pickIndex` pick `[0,0]` with P=2/3 instead of 1/2.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3
- Critical categories: TECH (destructuring throw / duplicate bias / OOB+occupied optional chaining), DATA (AC3 uniform distribution, draw-budget 0 vs 1, engine-never-throws)

**Coverage Summary:**

- P0 scenarios: 9 groups (host unit, pure `spawnTile` malformed/OOB/null/float/occupied/duplicate/mix/omitted/non-array + draw-budget + input-not-mutated + returned `next` occupancy, each `<5ms` except one statistical dedup-uniformity loop)
- P1 scenarios: 6 groups (4-direction `game.move` opposite-edge wall/spawn pipeline still non-empty + existing `spawn-placement`/`spawn.test`/`game.test`/`adaptive-spawn` green + `tsc` twin gates + directional `oppEdge` equivalence)
- P2/P3 scenarios: 5 groups (single-site validation loop grep, `GRID_SIZE` pin, Set key shape, no `Math.random` in engine, ledger `resolution-undo` hash)
- **Total effort**: ~2.8–5.2 hours (~0.4–0.7 days; host-only, no device lane — pure TS engine + helpers, `npm test` + `npx tsc --noEmit` gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score `shiftLine` wall-compaction + `boardFromLines`/`movementLines` 4×4 guards, `canMerge(1+2→3, >=3 equal)` / `mergeValue` / merge-once cascade, `GRID_SIZE=4` literal, `emptyBoard`/`boardsEqual`** | `git diff --stat -- triade/src/engine` shows only `spawn.ts` changed; `types.ts:GRID_SIZE=4` + `rules.ts` + `line.ts:46-64` + `board.ts` byte-identical. | `line.test.ts` + `line-moved.unit.test.ts` + `game.test.ts` wall expectations remain gate (already green after `dw-engine-line-compaction`). |
| **Ceiling/weights/pot/ladder `tierForCeiling` / `potForTier` / `pickCombined` bands `[0.4,0.8,1.0]` / `normalizeTo` / `weightedPicker` NaN guard, `pickIndex` clamp→0, `previewFor` ambiguous band, `matchScore.applyMove`, `stateFromResult` dedup** | Untouched; sweep only changes candidate filtering, not distribution math. `weightedValue`/`resolveSpawn`/`pickIndex` are read-only callers here; `pickIndex` still `Math.floor(rng()*len)` clamped, consumed exactly once on non-empty pool. | Existing `weights.test.ts` + `ceiling.test.ts` + `pot.test.ts` + `adaptive-spawn-integration.test.ts` + `preview-pot-ladder-hygiene` sigma gate remain gate. |
| **Clone hygiene `cloneBoard` / `deepFreezeBoard` / `gameState` row+outer freeze / `move` `let effectiveBoard` propagation** | Belongs to `dw-engine-spawn-mutation-hygiene` (`53c4f3d`); this bundle does not change `cloneBoard` (still `board.map(r=>[...r])` before the new guard) nor `gameState`/`game.ts` effectiveBoard. | That bundle's design already covers clone/ freeze; `spawn-mutation-hygiene.atdd.test.ts` + `engine.purity` remain gate. |
| **`spawnTile` trust-the-rng `pickIndex` NaN/Infinity→0 / `weightedPicker` NaN degrade** | Explicit `open` deferred DW-71/DW-76, pre-existing and unrelated to candidate validation; `spawnTile` still delegates to `pickIndex` unchanged. | DW-71/DW-76 stay `open` and are not re-triaged; this plan only verifies `pickIndex` still consumes exactly 1 draw when pool non-empty and 0 when empty. |
| **Changing `game.ts` opposite-edge production candidates, throwing on invalid candidates, or adding fallback to all-empty when candidates provided-but-empty** | Spec Boundaries: `Block If: Need to change game.ts production candidates, need to throw on invalid candidates, or need store/persistence changes`; `Never: Mutate input board; throw on bad candidates; add fallback to all-empty when candidates provided-but-empty; change pickIndex distribution logic`. | This plan pins `game.ts` byte-identical via `git diff HEAD -- triade/src/engine/core/game.ts` 0; any throw path is a P0 failure (R-001). |
| **RevenueCat / AdMob / IAP / Epic 8.x feel/haptics/punch/shake/bullet/sfx, `App.tsx` swipe threshold, `layout.ts`/`Hud.tsx`, RNGH gesture** | No feel/render/layout/monetization code touched (`git diff HEAD -- triade/src/feel triade/src/render triade/src/ui triade/App.tsx` empty). | Existing 8.x suites + `ci-gesture-wiring-docs` bundle remain gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `spawnTile(Board, number, Rng, candidates?)→SpawnResult` is pure with no `expo-*`/`Skia`/`RNGH` dependency; `GRID_SIZE=4` is the only external constant. Every branch is host-testable via `node --import tsx --test` with `boardWith([...])`/`staticBoard` fixtures + `rngOf(0|0.5)` + `spyRng(...values).calls` 0/1 draw budget and `Object.isFrozen` not needed here. Candidates are injected as `unknown[]` (deliberately malformed: `null`, `[1]`, `["a","b"]`, `[0.5,0]`, `[4,0]`, duplicates) without env seeding.

**Observability — Strong.** Outputs are deterministic primitives: `res.board` 4×4 occupancy, `res.board !== input` clone inequality, `res.cell`/`res.value` nullability, `spy.calls.length` 0 vs 1, `counts.get("r,c")/N` uniform deltas. Destructuring-throw vs silent-filter is observable as `assert.doesNotThrow(()=>spawnTile(board,42,spy,malformed))` vs `assert.throws`. Dedup is observable as `pool.length 2 not 3` via `spy` uniform 1/2 not 2/3.

**Reliability — Strong (engine never throws).** New guard is `continue`-only (never `throw`), `board[r]?.[c]!==null` uses optional chaining so `r=4` never `TypeError`, and `pool.length===0 → {cell:null,value:null}` 0-draw early return keeps `pickIndex` off empty pool. Both `tsc` gates (`tsconfig.json` + `tsconfig.test.json`) clean; `npm --prefix triade test` host gate `<15 min` (910 pass / 238 skipped per `2026-09-02`).

**Testability Risks:** Two surfaces are thin: (a) duplicate dedup bias is statistical — a 100-draw loop may still pass with `2/3` bias by chance; mitigated by 4000-draw loop with `5σ` window (R-002 P0 G-05). (b) non-array `candidates=null` guard is easy to forget on a future edit that restores `candidates.filter` — mitigated by explicit `!Array.isArray(candidates)` pin (R-001 P0 G-09).

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **`candidates` destructuring throw on `null` / non-array entry.** Old `candidates.filter(([r,c])=>…)` destructures each entry as an array; `filter` on `[null, [0,0]]` throws `TypeError: null is not iterable` at the parameter binding before the predicate body runs. Any direct-API caller (test helper, future `debugSpawn`) that passes `null` or an object crashes the engine, violating engine-never-throws. Window: every direct call with a malformed entry. | 2 | 3 | **6** | Harden with guard-before-destructure: (a) **host P0 pins** `null entry → pool = [[0,0]] only, 1 draw, no throw` + `non-array candidates (null/number/object) → {cell:null,value:null} 0 draws, no throw` — see P0 G-02/G-09; (b) **static grep** `rg -n "candidates\.filter\(" triade/src/engine/core/spawn.ts` ==0 (old throw site gone) && `rg -n "if \(!Array\.isArray\(entry\)" triade/src/engine/core/spawn.ts` ==1; (c) **doesNotThrow** harness `assert.doesNotThrow(()=>spawnTile(board,1,spy,[null,[0,0]]))` already in 13-case edge script. | FE lead | Immediate (gate this sweep; protects DW-72) |
| R-002 | TECH | **Duplicate cells inflate `pool` and bias `pickIndex` uniformity (AC3).** `[0,0],[0,0],[1,1]` without dedup makes `pool.length 3` with two refs to `[0,0]`; `pickIndex(3,rng)` picks `[0,0]` with P=2/3 not 1/2, breaking the promised uniform `1/pool.length` and the 1-draw AC3 contract. `game.ts` never emits duplicates (distinct `i` per pushed candidate), so this is latent on direct-API/test callers only — but it is exactly AC3 and would be missed by wall-only suites. | 2 | 3 | **6** | Enforce dedup-after-validation: (a) **host P0 statistical pin** `candidates [[0,0],[0,0],[1,1]] all empty → N=4000 loop, counts 1/2 each within 5σ, spy 1 draw each, observed 50/50 not 66/33` — see P0 G-05; (b) **static grep** `rg -n "Set<string>" triade/src/engine/core/spawn.ts` ==1 + `rg -n "seen\.has\(key\)" triade/src/engine/core/spawn.ts` ==1 + `rg -n "seen\.add\(key\)" triade/src/engine/core/spawn.ts` ==1; (c) **pool-size pin** `spyRng(0) → spawnTile(board,42,spy,[[0,0],[0,0],[1,1]]).cell` observed set size 2 over N trials. | FE lead | Immediate (gate this sweep; protects DW-73) |
| R-003 | TECH | **Mixed valid+invalid+dup+OOB silently filtered but must preserve 1-draw vs 0-draw contract.** `candidates=[[0,0],null,[4,0],[0,0],[0,3]]` should dedup/filter to `[[0,0],[0,3]]` and consume 1 draw; if every valid filtered (all OOB/occupied) the pool is empty and must consume 0 draws with `{cell:null,value:null}`. A future edit that returns 1 draw even on empty filtered pool would silently drift the seeded session's RNG cursor, breaking deterministic replay (draw-budget is part of the contract). | 2 | 3 | **6** | Keep 0-vs-1 draw budget pinned: (a) **host P0 pins** `mix → pool 2, spy.calls 1, cell in pool` (G-07) + `all-OOB → pool 0, spy.calls 0, nulls` (G-01) + `occupied pool → 0 draws` (G-10) — three explicit `spy.calls` asserts; (b) **integration** `move effective → 3 draws` vs `noop → 0 draws` via `directional-spawn.integration.test.ts` stays green, so a filtered-pool drift would surface as cursor skew in `mulberry32` seeded runs. | FE lead | Immediate (gate this sweep; protects DW-72+73) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **OOB candidates not silently ignored — stale `board[r][c]===null` without `?.` throws on `r=4`.** Before guard `candidates.filter(([r,c])=> board[r][c]===null)` would `TypeError` on `board[4]` is `undefined`. New code uses `board[r]?.[c]!==null` after bounds check, but a future edit that reorders bounds after occupancy would reintroduce throw. | 2 | 2 | 4 | Pin optional chaining: (a) **host P0** `candidates [[4,0]] on empty board → pool [] → nulls 0 draws, doesNotThrow` (G-01); (b) **static** `rg -n "board\[r\]\?\.\[c\]" triade/src/engine/core/spawn.ts` ==1 && `rg -n "board\[r\]\[c\]" triade/src/engine/core/spawn.ts` ==1 (only the `all-empty` branch legitimately uses direct index, guarded by `r<GRID_SIZE` loops). |
| R-005 | TECH | **Float / non-integer coordinates slip through (`[0.5,0]`).** Without `Number.isInteger` a float would pass `r>=0 && r<GRID_SIZE` and index `board[0.5]` is `undefined`, then `board[0.5]?.[0]` is `undefined !== null` → filtered, but only by accident; a future board accessor change could treat stringified float differently. Explicit `isInteger` is the intended guard. | 2 | 2 | 4 | Pin integer guard: (a) **host P0** `candidates [[0.5,0],[0,0]] → pool [[0,0]] only, 1 draw` (G-11, edge script float case); (b) **static** `rg -n "Number\.isInteger" triade/src/engine/core/spawn.ts` ==2 (`r` and `c`). |
| R-006 | TECH | **Occupied cell at candidate passes through — `board[r][c]!==null` check uses stale board snapshot after `cloneBoard`.** Guard must read `board` (input) not `next` (clone) for occupancy, but the check is `board[r]?.[c]!==null` (correct). A future edit that mistakenly reads `next[r][c]` after already writing one candidate would treat the first placed value as occupancy and mis-filter the second duplicate distinct check (order-dependent). | 1 | 3 | 3 | Pin occupied filter before push: (a) **host P0** `candidates [[0,0] occupied, [0,0] again filtered, [1,1] empty] → pool size 1` vs distinct empties pool size 2 — G-06/G-10 distinguish; (b) **read-order guard** `rg -n "board\[r\]\?\.\[c\] !== null" triade/src/engine/core/spawn.ts` ==1 (input board, not `next`). |
| R-007 | TECH | **Production `game.ts` opposite-edge pool non-empty guarantee vs new validation over-filtering.** `game.ts` pushes only distinct in-bounds empties from `shifted[i].moved`, but a future validation that also (incorrectly) treated `candidate length !==2` as valid after extra fields `[[r,c,extra]]` would widen pool; conversely an overly strict guard (e.g. `entry.length===2` exact) would shrink it if `game.ts` ever emitted a 3-tuple. Current `length<2` tolerate-extra is correct. | 1 | 3 | 3 | Pin `game.ts` untouched + `length<2` tolerance: (a) **`git diff HEAD -- triade/src/engine/core/game.ts` 0** as P1 gate; (b) **host P1** `board [[null,2],[4,8]…] move left → spawned on opposite edge` (AC1 4-dir) stays green — any over-filter would make pool empty and spawn null, breaking AC4. |
| R-008 | DATA | **Provided-but-empty pool must stay engine-never-throws (no fallback to all-empty).** When `candidates=[]` or all filtered empty, contract is `{cell:null,value:null} 0 draws`, not "fall back to all-empty pick". A future edit that added fallback would silently reintroduce non-deterministic spawns on a board the caller explicitly constrained to none. | 1 | 3 | 3 | Pin no-fallback: (a) **host P0** `spawnTile(fullBoard,42,spy,[[0,0],[1,1]] occupied → 0 draws, nulls)` + `candidates [[4,0]] OOB only → 0 draws` (G-01/G-10) — any fallback would draw 1 and produce a cell, failing; (b) **static** no `empty:` fallback in the `if (!Array.isArray(candidates))` branch nor `if (pool.length===0)` branch. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | TECH | **Non-array `candidates` (bare `null`/`42`/`{0:0,1:0}`) via `as unknown` bypass.** Guard `!Array.isArray(candidates)` returns nulls 0 draws. Low probability (typed `Array<[number,number]>` at call site) but `as unknown as unknown[]` in tests can bypass. | 1 | 1 | 1 | Monitor — P0 G-09 pins `spawnTile(board,1,spy,null as unknown)` → 0 draws, no throw. |
| R-010 | OPS | **Deferred-ledger `resolution-undo` hex tail + `sprint-status.yaml` ownership.** Working-tree delta flips DW-72/73 `done` with `resolution-undo: 365ffe33… 73…` (hex of `status: open`); `sprint-status.yaml` is orchestrator-owned and must not be written or reverted by this workflow. | 1 | 1 | 1 | Monitor — `git diff --stat` gate shows `deferred-work.md` but not `sprint-status.yaml`; this plan never writes the latter. |

### Risk Category Legend

- **TECH**: Technical/Architecture (destructuring throw, duplicate bias, OOB/occupied/float validation, draw-budget, single-source guard, `GRID_SIZE` invariant)
- **SEC**: Security — none this sweep (pure engine math, no auth/data exposure; `Array.isArray` + `Number.isInteger` are validation, not security boundary)
- **PERF**: Performance — none new (loop + Set over ≤4 candidates, O(4) per spawn; clone is `board.map(r=>[...r])` O(16) unchanged; no async/worklet lane)
- **DATA**: Data Integrity — AC3 uniform distribution after dedup, draw-budget 0 vs 1 deterministic replay, occupied vs empty filtering, engine-never-throws payload shape
- **BUS**: Business Impact — directional spawn lane still lands on opposite edge of moved lines (AC1/AC7); player-visible mis-spawn belongs to `spawnTile` path
- **OPS**: Operations (deferred ledger `resolution-undo`, `sprint-status.yaml` ownership, tsc gates)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability | Engine never throws on any `candidates` shape (`null`, `[1]`, `["a","b"]`, `[4,0]`, float, duplicates, non-array) — all degrade to filtered 0/1-draw pool | R-001, R-004, R-005, R-009 | Host unit: `doesNotThrow` across 13 malformed shapes + `spy.calls` 0 vs 1 + `tsc` twin | `npm --prefix triade test` pass 910/238 + `node -e` 13-case probe `doesNotThrow` |
| Reliability | Draw-budget preserved: non-empty filtered pool 1 draw, empty filtered pool 0 draws, omitted `undefined` 1 draw, full board 0 draws | R-003, R-008 | Host unit: `spyRng(...).calls.length` asserts in every P0 group + integration `move effective 3 draws vs noop 0` | `spawn-placement.test.ts` G-01..G-09 + `directional-spawn.integration.test.ts` draw-budget 3/0 |
| Reliability | Uniform AC3 after dedup: duplicate entries do not inflate probability; valid pool uniformly covers `1/pool.length` | R-002 | Host unit: 4000-draw statistical loop `5σ` window (`tol = 5*sqrt(p*(1-p)/N)`) | `counts.get("r,c")/N` within `tol` for `candidates [[0,0],[0,0],[1,1]]` (expected 1/2 each, not 2/3) |
| Maintainability | Single-site candidate validation loop, no `candidates.filter(([r,c])=>)` survivor, single `GRID_SIZE` constant, no `Math.random` in engine | R-001, R-007 | Static scans: `rg -n` counts for filter/Set/isInteger/GRID_SIZE | `rg` counts + `npm run tsc --noEmit` (no new dep) |
| Performance | Guard loop over ≤ `GRID_SIZE` (4) candidates + `Set` dedup O(4) per spawn, no hot-path allocation beyond pool + set | - | Host timing: `npm --prefix triade test` `<15 min` | `npm test` timing (no extra bench lane) |
| Security | No new attack surface (pure TS validation/loop, no IO, no auth) | - | Static: `engine.purity` no RN/Expo import scan | `engine.purity.test.ts` 4 pass |

**Unknown thresholds:** None — every threshold is a pin (never-throw, 0 vs 1 draw, 1/2 uniform after dedup, tsc clean, draw counts). No value guessed.

---

## Entry Criteria

- [ ] `spec-engine-spawn-candidates-validation.md` intent/boundaries/I-O matrix frozen (8 rows) + Code Map read against `triade/src/engine/core/spawn.ts:83-127` + `game.ts:53-78` + `types.ts:1`
- [ ] `triade/src/engine/core/types.ts: GRID_SIZE=4` + `Board = Cell[][]` (`number|null`) confirmed as validation-loop invariant
- [ ] Working-tree delta vs `HEAD` inspected (`git diff HEAD -- triade/src/engine/core/spawn.ts` shows loop+Set; `git diff --stat` shows `spawn.ts` + `deferred-work.md`; `git diff HEAD -- triade/src/engine/core/game.ts` 0)
- [ ] Existing coverage baseline collected: `triade/__tests__/engine/spawn-placement.test.ts` (8 P0) + `directional-spawn.integration.test.ts` (4 P0 + 1 P1) green on `HEAD` before this guard (910 pass baseline)
- [ ] Toolchain ready: `node --import tsx` + `npm --prefix triade test` (host) + `npx tsc --noEmit` + `npx tsc -p triade/tsconfig.test.json --noEmit` (twin gates) + `rg` static scans

## Exit Criteria

- [ ] All P0 tests passing (`spawnTile` malformed/OOB/duplicate/mix/omitted/non-array/occupied/float + draw-budget + no-throw + `next` occupancy — P0 groups G-01..G-09 green)
- [ ] All P1 tests passing or triaged (`game.move` 4-dir opposite-edge + existing `spawn-placement`/`game.test`/`engine.purity` 910 pass + `tsc` twin clean)
- [ ] No open high-priority / high-severity bugs (R-001 destructuring throw, R-002 duplicate bias, R-003 draw-budget all mitigated or waived with owner + timeline)
- [ ] Test coverage agreed as sufficient (P0 100% guard branches — 7 filter `continue`s + `!Array.isArray` early return + `pool.length===0` vs `pickIndex`; P1 ≥95%)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw + 0/1 draw + uniform + tsc + 910-pass host gate)
- [ ] Ledger `_bmad-output/implementation-artifacts/deferred-work.md` DW-72/73 `resolution-undo: 365ffe33… 73…` preserved (reopen keeps hash); `sprint-status.yaml` untouched

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE lead / TEA | Owns P0 malformed/duplicate/OOB/draw-budget pins, `npm test` + `tsc` gates, `rg` validation-loop scans, this test design |
| Murat (TEA) | Test Architect | Risk scoring review, quality gate sign-off |

---

## Test Coverage Plan

> **Note:** `P0/P1/P2/P3` = **priority/risk**, NOT execution timing. Execution timing is defined in the Execution Strategy section below.

### P0 (Critical) - Host unit, pure `spawnTile` second-caller validation + dedup + 0/1 draw budget + engine-never-throws

**Criteria**: Blocks core contract (second-caller robustness) + High risk (≥6) + No workaround (single validation site)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| G-01 OOB candidate filtered → empty pool → `{cell:null,value:null} 0 draws, no throw` — `candidates=[[4,0]]` on empty board + `candidates=[[0,4],[-1,0]]` mixed OOB | Unit | R-001, R-004 | 1 | FE | Spec row 1: `pool [] → nulls 0 draws`. Host: `boardWith([[null,…],…])` empty board `spyRng(0.5)` → `assert.doesNotThrow(()=>spawnTile(board,42,spy,[[4,0]])) && spy.calls 0 && cell null`. Add `candidates [[4,0],[0,0]] where [0,0] empty → pool [[0,0]] 1 draw` (OOB ignored, valid kept). |
| G-02 Null / `undefined` entry in `candidates` array → filtered, valid kept, uniform, no throw | Unit | R-001 | 1 | FE | Spec row 2: `candidates=[null,[0,0]]` where `[0,0]` empty → `pool [[0,0]] 1 draw`. Host: `assert.doesNotThrow(()=>spawnTile(board,42,spy,[null as unknown as [number,number],[0,0]])) && spy.calls 1 && cell [0,0]`. Add `candidates=[undefined as unknown,…]` same path (`!Array.isArray(entry)`). |
| G-03 Missing column `[1]` (no `c`) → filtered → empty pool 0 draws if no other valid | Unit | R-001 | 1 | FE | Spec row 3: `candidates=[[1]]` filtered via `entry.length<2`, empty pool `0 draws`. Host: `spawnTile(board,42,spy,[[1] as unknown as [number,number]]) → spy 0 && nulls`. Add `candidates=[[1] as unknown, [0,0]] → pool [[0,0]] 1 draw` (tolerate-extra complement). |
| G-04 Non-number type `["a","b"]` / `["a",0]` / `[[0,"b"]]` → filtered, no throw | Unit | R-001 | 1 | FE | Spec row 4: `typeof r/c !== 'number'` continue. Host: `spawnTile(board,42,spy,[["a","b"] as unknown,…]) → 0 draws, nulls`; `candidates=[["a","b"] as unknown,[0,0]] → pool [[0,0]] 1 draw`. |
| G-05 Duplicate cells deduped — `[[0,0],[0,0],[1,1]]` all empty → `pool.length 2` uniform 1/2 each, 1 draw (not 2/3 bias) | Unit | R-002 | 2 | FE | Spec row 5: statistical dedup pin (AC3). Host: `N=4000` loop `mulberry32` + `spyRng(rng())` each iter `spawnTile(b,42,spy,candidates)` → `spy 1` && `cell in pool` + `counts 1/2 within 5σ` (`tol=5*sqrt(0.5*0.5/N)≈0.04`). Add cheap deterministic `rngOf(0)→[0,0] && rngOf(0.6)→[1,1]` curve. Also assert `board deepEqual before` + `res.board !== b` not mutated (reuse of hygiene). |
| G-06 Valid pool kept — `[[0,3],[1,3]]` both empty → uniform `pickIndex(2,rng)` 1 draw, placed value, no mutation | Unit | R-006 | 1 | FE | Spec row 6: `candidates [[0,3],[1,3]]` → `N=200` loop uniform + `spy 1` + `res.board[cell]===42` + `deepEqual(b,before)`. |
| G-07 Mix valid+invalid+dup+OOB → `[[0,0],null,[4,0],[0,0],[0,3]]` with empties → `pool [[0,0],[0,3]]` deduped/filtered, 1 draw (spec row 7) | Unit | R-003 | 1 | FE | Host: `boardWith([[null,2,3,null],[…],[…],[13,14,15,null]])` empties include `[0,0],[0,3]`; `candidates` as mixed `as unknown[]` → `spawnTile → pool 2, spy 1, cell in [[0,0],[0,3]]`. Add 4000-draw uniformity on same mixed pool. |
| G-08 Omitted `candidates` (undefined) → unchanged all-empty uniform pick, 1 draw (spec row 8) | Unit | R-008 | 1 | FE | Spec row 8: `spawnTile(board,val,rng)` no 4th arg → `empty 6000-draw` uniform over all `board[r][c]===null`, `spy 1`, `res.board!==board`. Existing `spawn-placement AC5` already pins this — keep as gate. |
| G-09 Non-array `candidates` outer guard → `null`/`42`/`{0:0}` as `unknown` → `{cell:null,value:null} 0 draws, no throw, no pickIndex` | Unit | R-009 | 1 | FE | Host: `spawnTile(board,42,spy,null as unknown) → spy 0 && nulls && doesNotThrow`; `…(board,42,spy,42 as unknown) → 0 draws`; complement `!Array.isArray(candidates)` early return is the only place `candidates.filter` throw is eliminated. Static: `rg -n "if \(!Array\.isArray\(candidates\)" triade/src/engine/core/spawn.ts` ==1. |
| G-10 Occupied + float filtering — `[[0,0] occupied, [0.5,0] float, [1.1,1] float]` → empty pool 0 draws; `[[0,0] occupied, [0,3] empty]` → pool size 1 not 2 | Unit | R-004, R-005, R-006 | 1 | FE | Host: `boardWith([[1,2,3,null],[…]])` where `[0,0]=1` occupied → `candidates=[[0,0],[0,3]] → pool [[0,3]] spy 1`; `candidates=[[0.5,0] as unknown, [0,0] occupied] → pool [] 0 draws` (int guard + occupied). Pin `board[r]?.[c]!==null` via optional chaining. |
| G-11 Input board never mutated — every P0 above captures `before=b.map(r=>r.slice())` + `deepEqual(b,before)` + `res.board !== b && res.board[0] !== b[0]` | Unit | - | 0 | FE | Not a separate suite — asserted inside G-01..G-10. Clone is `const next=cloneBoard(board)` before guard, still `board.map(r=>[...r])`. |

**Total P0**: 11 tests (9 groups counting G-05 as 2, G-11 inline), ~1.5–2.5 hours (host-only, pure TS, each `<5ms` except G-05 4000-draw ≈ `60ms`)


### P1 (High) - Game/move directional pipeline + existing suites + tsc twin gates

**Criteria**: Important second-caller defense + Medium risk (3-4) + Common workflows (every `move()` + `spawnTile` direct call)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| P1-01 `game.move` 4-direction opposite-edge pipeline still correct after hygiene (left→rightmost col, right→leftmost col, up→bottom row, down→top row) | Unit (game pipeline) | R-007 | 4 | FE | `spawn-placement.test.ts` AC1 4-dir `oppositeEdgeCandidates` suites: `board [[null,2,…],[4,8…]] move left → spawned [0,3]` etc. Must stay green — valid-pool filtering must not swallow a `game.ts`-produced candidate (distinct in-bounds empty). |
| P1-02 `spawnTile` provided-but-empty candidate pool still returns `{cell:null,value:null} 0 draws` (engine-never-throws) and `game.move` noop 0 draws | Unit | R-008 | 2 | FE | `spawn-placement AC5` `fullBoard candidates [[0,0],[1,1]] → 0 draws nulls` + `move noop → 0 draws, no spawned trace`. |
| P1-03 Draw-budget preservation regression — `spawnTile` placing 1 vs full/empty-pool 0; `move` effective 3 vs noop 0; `newGame` 20 | Unit | R-003 | 2 | FE | `directional-spawn.integration.test.ts` `effective 3 draws` + `noop 0 draws` + `newGame 20 draws` suites remain green — filtered-pool drift to 1-draw-on-empty would skew seeded `mulberry32` cursor. |
| P1-04 `transitionPlan` + `assertNoLeak` trace-board congruence after candidate filtering — spawned cell is from pool, board occupancy off by 1 if pool wrong | Unit | R-007 | 1 | FE | `game.test.ts` `trace:` suites + `assertNoLeak(plan, result.board)` via `resultingTiles(plan)` vs `occupiedCells(result.board)` already green — wrong pool would break. |
| P1-05 Twin `tsc` gates — `npx tsc --noEmit` + `npx tsc -p triade/tsconfig.test.json --noEmit` both clean | Unit (static) | R-001 | 2 | FE | `spawn.ts:102-122` loop uses `as unknown as unknown[]` cast + `GRID_SIZE` const + `Set<string>`; both configs must stay clean after cast. |
| P1-06 Statistical uniformity still holds for valid pools (no dedup, no OOB) — `spawnTile` `candidates [[0,3],[1,3]]` 40/40-like uniform | Unit | R-002 | 1 | FE | `spawn-placement AC3` 6000-draw uniformity gate within `5σ` remains green — validation loop must not bias `pickIndex` ordering. |

**Total P1**: 12 tests, ~1.2–2.0 hours (host-only)

### P2 (Medium) - Static hygiene guards + ledger

**Criteria**: Secondary invariants + Low/Medium risk (1-4) + Edge cases (float, occupied, ledger)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| P2-01 Static single-site validation loop + Set dedup + no `candidates.filter` survivor | Unit (static scan) | R-001, R-002 | 1 | DEV | `rg -n "candidates\.filter\(" triade/src/engine/core/spawn.ts` ==0 && `rg -n "Set<string>" triade/src/engine/core/spawn.ts` ==1 && `rg -n "seen\.has" triade/src/engine/core/spawn.ts` ==1 && `rg -n "seen\.add" triade/src/engine/core/spawn.ts` ==1 && `rg -n "if \(!Array\.isArray\(entry\)" triade/src/engine/core/spawn.ts` ==1 && `rg -n "Number\.isInteger" triade/src/engine/core/spawn.ts` ==2. |
| P2-02 No `GRID_SIZE` literal drift — `types.ts` single definition, `spawn.ts` bounds `r<GRID_SIZE && c<GRID_SIZE` | Unit (static scan) | R-004 | 1 | DEV | `rg -n "export const GRID_SIZE = 4" triade/src/engine/core/types.ts` ==1 && `rg -n "GRID_SIZE" triade/src/engine/core/spawn.ts` ==3 (imports + two bound checks) — no `4` literal for board dims. |
| P2-03 Optional chaining guard pin `board[r]?.[c] !== null` (not `board[r][c]`) | Unit (static scan) | R-004, R-006 | 1 | DEV | `rg -n "board\[r\]\?\.\[c\]" triade/src/engine/core/spawn.ts` ==1 (candidate loop) && `rg -n "board\[r\]\[c\] === null" triade/src/engine/core/spawn.ts` ==1 (all-empty branch loop `r<GRID_SIZE` — safe direct index). |
| P2-04 No `Math.random` in engine, no new deps, ledger `resolution-undo` hex tail preserved | Unit (static scan) | R-010 | 1 | DEV | `rg -n "Math\.random" triade/src/engine` ==0 && `rg -n "365ffe33" _bmad-output/implementation-artifacts/deferred-work.md` ==1 && tail `73…6e` = hex `status: open` 64-hex check. |

**Total P2**: 4 checks, ~0.3–0.6 hours

### P3 (Low) - Exploratory / degenerate

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| P3-01 Degenerate `move()` 200-move `runSeededSession` with validated candidates vs `mulberry32` seeded — no cursor drift across 200 effective moves (R-003 regression) | Unit | 1 | DEV | `helpers.ts: runSeededSession` drives `state=stateFromResult(res)` 200 moves (seeded `mulberry32`) — if filtered-pool miscounted 1 vs 0 draws, cursor skews and later spawned cells diverge from wall manifold. |
| P3-02 Performance exploratory — `spawnTile` loop+Set O(4) per spawn not regressing `feel.bench.test.ts` both-profile median | Unit (bench) | 0 | DEV | `spawnTile` guard is 4 entries × Set, `board.map(r=>[...r])` O(16) is the dominant cost; existing `feel.bench` already gates frame budget — no new bench file. |

**Total P3**: 1 test, ~0.1–0.3 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch validation throw before deep suites

- [ ] OOB probe `spawnTile(emptyBoard,1,spyRng(0.5),[[4,0]] as unknown) → 0 draws, nulls, doesNotThrow` (10s)
- [ ] Null probe `spawnTile(board,1,spyRng(0),[null,[0,0]] as unknown) → 1 draw, cell [0,0]` (10s)
- [ ] Duplicate dedup probe `spawnTile(board,1,rngOf(0),[[0,0],[0,0],[1,1]] as unknown) → cell [0,0] stable` (10s)
- [ ] `game.ts` byte-identical gate `git diff HEAD -- triade/src/engine/core/game.ts` 0 (5s)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical second-caller validation — malformed/OOB/null/float/occupied/duplicate/mix/omitted/non-array + draw-budget + engine-never-throws

- [ ] G-01 OOB filtered → nulls 0 draws (Unit)
- [ ] G-02 null entry → valid kept 1 draw, no throw (Unit)
- [ ] G-03 missing column `[1]` → empty filtered 0 draws (Unit)
- [ ] G-04 non-number `["a","b"]` → filtered 0 draws (Unit)
- [ ] G-05 duplicate dedup uniform 1/2 (4000 draws, 5σ) (Unit)
- [ ] G-06 valid pool uniform 1 draw (Unit)
- [ ] G-07 mix valid+invalid+dup+OOB → pool 2, 1 draw (Unit)
- [ ] G-08 omitted candidates → all-empty uniform 1 draw (Unit)
- [ ] G-09 non-array `candidates=null` → 0 draws noop (Unit)
- [ ] G-10 occupied+float → 0 draws empty-pool (Unit)
- [ ] G-11 input deepEqual + clone `!==` inline (Unit)

**Total**: 9 groups / 11 tests

### P1 Tests (<30 min)

**Purpose**: Important pipeline coverage — 4-dir opposite-edge + draw-budget 3/0 + `tsc` twin

- [ ] 4-direction `game.move` left/right/up/down opposite-edge suites (Unit)
- [ ] Provided-but-empty pool `fullBoard → nulls 0 draws` + `noop 0 draws` (Unit)
- [ ] Draw-budget `spawnTile 1 vs 0` + `move effective 3 vs noop 0` + `newGame 20` (Unit)
- [ ] `transitionPlan assertNoLeak` trace-board congruence (Unit)
- [ ] Twin `tsc --noEmit` clean (static)

**Total**: 6 groups / 12 tests

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage — static loop scans, GRID_SIZE pin, optional chaining, 200-move seeded session

- [ ] Single-site `Set`/`isInteger`/`filter` survivor scan (static)
- [ ] `GRID_SIZE=4` single-def pin (static)
- [ ] `board[r]?.[c]` optional chaining pin (static)
- [ ] Ledger `resolution-undo 365ffe33…` 64-hex + `sprint-status.yaml` untouched (static)
- [ ] 200-move `runSeededSession` cursor-drift sweep (Unit)

**Total**: 5 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 11 | 0.12–0.18 | ~1.3–2.0 | Pure `spawnTile` malformed/null/OOB/duplicate/mix pins; G-05 loop 4000 draws already scripted in edge case probe |
| P1 | 12 | 0.08–0.15 | ~1.0–1.8 | Existing suites (`spawn-placement` 8 P0, `directional-spawn` 5 P0/P1, twin `tsc`, `assertNoLeak`) — gate only, no new plumbing |
| P2 | 4 | 0.07–0.12 | ~0.3–0.5 | Static `rg` scans + ledger hash check (one-liners) |
| P3 | 1 | 0.15–0.25 | ~0.15–0.25 | 200-move seeded session harness (already `runSeededSession` in helpers) |
| **Total** | **28** | **-** | **~2.8–5.2** | **~0.4–0.7 days host-only; no device lane — `npm test` + `tsc` `<15 min` gate** |

### Prerequisites

**Test Data:**

- `boardWith([...])` 4×4 matrix factory + `emptyBoard()` + `staticBoard(row)` (helpers mutable setup) + `gameState(board, pendingSpawn)` frozen snapshot — factories already in `triade/test-utils/helpers.ts`
- `rngOf(...values)` + `spyRng(...values).calls` scripted draw budget (1 vs 0 draws) + `mulberry32(seed)` for 4000-draw dedup uniformity loop

**Tooling:**

- `node --import tsx --test` (host, `triade` `type:module`, no Metro)
- `npx tsc --noEmit` + `npx tsc -p triade/tsconfig.test.json --noEmit` (twin gates)
- `rg` (ripgrep) static scan for `candidates.filter` survivor / `Set<string>` / `isInteger` / `GRID_SIZE` / `board[r]?.[c]` / `365ffe33` ledger

**Environment:**

- `triade/package.json` `test` script `node --import tsx --test` (benchmarks excluded via glob `__tests__` only)
- `triade/tsconfig.test.json` `ignoreDeprecations: "6.0"` (RN stub waiver)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — 9 groups / 11 tests green; any `doesNotThrow` or `spy.calls` 0 vs 1 failure blocks merge)
- **P1 pass rate**: ≥95% (waivers required for `transitionPlan` coordinate flake or `tsc` incremental error)
- **P2/P3 pass rate**: ≥90% (informational — `rg` scans are doc pins, not suite blockers)
- **High-risk mitigations**: 100% complete or approved waivers for R-001/R-002/R-003 before `done` ledger flip

### Coverage Targets

- **Critical paths**: ≥80% (`spawnTile` 7 filter `continue`s + `!Array.isArray` early return + `pool.length===0` vs `pickIndex` + `cloneBoard` before guard)
- **Security scenarios**: 100% (not applicable — no auth boundary; `board[r]?.[c]` guard belongs to this bundle's data-integrity, not security)
- **Business logic**: ≥70% (second-caller robustness only; merge/score/ceiling distribution not re-derived)
- **Edge cases**: ≥50% (OOB, null, missing c, non-number, float, occupied, dup-uniform, empty-pool 0-draw, valid 1-draw, omitted)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`doesNotThrow` on malformed, dedup 1/2 uniform, OOB ignored, `spy.calls` 0 vs 1, `res.board !== input && deepEqual(input, before)`)
- [ ] No high-risk (≥6) items unmitigated (R-001 destructuring throw, R-002 duplicate bias, R-003 0/1 draw all gated)
- [ ] Security tests (SEC category) pass 100% (none this sweep; `engine.purity` 4 pass is the only SEC-adjacent gate)
- [ ] Performance targets met (PERF negligible — loop O(4) + Set O(4) per spawn, clone O(16) unchanged, no new bench lane, `npm test` `<15 min` is gate)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw + ref-inequality + tsc + 910-pass host gate already collected)

---

## Mitigation Plans

### R-001: `candidates` destructuring throw on `null` / non-array entry (Score: 6)

**Mitigation Strategy:**
1. Guard before destructure: `if (!Array.isArray(candidates)) return {board: next,…}` then `if (!Array.isArray(entry)||entry.length<2) continue` — do not touch `entry[0]`/`[1]` until array check passes.
2. Cover each `continue` path with a P0 pin: `null`→keep valid, `[1]`→empty, `["a","b"]`→empty, `null` outer→early return, each with `doesNotThrow` + `spy.calls` 0 vs 1.
3. Static guard: `rg -n "candidates\.filter\(" triade/src/engine/core/spawn.ts` must be 0 — any reintroduction of `filter(([r,c])=>)` is a regression.
**Owner:** FE lead
**Timeline:** Gate this sweep (`2026-09-02`)
**Status:** Planned → Complete (code landed working-tree `ed54b4e`, pins in P0 G-02/G-03/G-04/G-09)
**Verification:** `rg -n "if \(!Array\.isArray\(entry\)" triade/src/engine/core/spawn.ts` ==1 && `rg -n "candidates\.filter" triade/src/engine/core/spawn.ts` ==0 && `npm --prefix triade test` 910 pass including 13-case edge probe `doesNotThrow`

### R-002: Duplicate cells inflate `pool` and bias `pickIndex` uniformity (Score: 6)

**Mitigation Strategy:**
1. Dedup after validation via `Set<string>` keyed by `${r},${c}` — `seen` before `pool.push`, not after `pickIndex`.
2. Statistical pin: `N=4000` loop over `candidates [[0,0],[0,0],[1,1]]` all empty must show `counts 50%±4%` each, not `66%`, with `spy 1` each iteration — existing edge script does 13 cases but not uniform; promote to P0 G-05.
3. Static guard: `Set<string>` + `seen.has` + `seen.add` each exactly 1.
**Owner:** FE lead
**Timeline:** Gate this sweep (`2026-09-02`)
**Status:** Planned → Complete (code landed `ed54b4e`, pin in P0 G-05)
**Verification:** `rg -n "Set<string>" triade/src/engine/core/spawn.ts` ==1 && `rg -n "seen\.has\(key\)" triade/src/engine/core/spawn.ts` ==1 && `node --loader tsx` 4000-draw loop `|observed - 0.5| < 5σ` green

### R-003: Mixed valid+invalid+dup+OOB draw-budget skew (0 vs 1) (Score: 6)

**Mitigation Strategy:**
1. Keep `pool.length===0 → return {board: next, cell:null,value:null}` 0 draws (no `pickIndex`) and `pool non-empty → pickIndex(pool.length,rng)` exactly 1 draw — guard does not call `rng` itself.
2. Pin both sides: `all-OOB → 0 draws` (G-01) + `mix → 1 draw` (G-07) + `occupied → 0 draws` (G-10) with explicit `spy.calls` asserts; integration `move effective 3 draws vs noop 0` keeps cursor honest.
3. No `rng()` inside the `for (entry of candidates)` loop — `rg -n "rng\(\)" triade/src/engine/core/spawn.ts` must remain 0 outside `pickIndex` call sites.
**Owner:** FE lead
**Timeline:** Gate this sweep (`2026-09-02`)
**Status:** Planned → Complete (code landed `ed54b4e`, pins in P0 G-01/G-07/G-10 + P1-03)
**Verification:** `rg -n "pickIndex\(pool\.length" triade/src/engine/core/spawn.ts` ==1 && `rg -n "if \(pool\.length === 0\)" triade/src/engine/core/spawn.ts` ==1 && `npm --prefix triade test -- __tests__/integration/directional-spawn.integration.test.ts` draw-budget 3/0 green

---

## Assumptions and Dependencies

### Assumptions

1. `Board Cell = number | null` primitives (per `types.ts:3`) — so `board[r]?.[c]!==null` occupancy via optional chaining is sufficient; no deep object clone needed.
2. Production `Board` is always 4×4 via `emptyBoard`/`boardFromLines`; `candidates` validation loops over `GRID_SIZE` not a hardcoded `4` and does not need ragged-board padding.
3. `spawnTile` draw budget is unchanged (1 draw when filtered pool non-empty via `pickIndex`, 0 draws on filtered-empty early return) — validation loop adds no draws even on malformed input.
4. `game.ts:53-78` opposite-edge candidates are already distinct in-bounds empties; validation is defensive for second callers, not for the live `move()` path.
5. `sprint-status.yaml` is orchestrator-owned — this design must never write it; working-tree `git diff --stat` should not list it.

### Dependencies

1. `triade/__tests__/engine/spawn-placement.test.ts` AC3/AC5 + `triade/__tests__/integration/directional-spawn.integration.test.ts` AC1-AC6 — required by `2026-09-02` (already 910 pass, before this guard)
2. `triade/src/engine/core/spawn.ts: cloneBoard` + `triade/test-utils/helpers.ts: rngOf/spyRng/mulberry32/boardWith` — required by `2026-09-02` (landed pre `dw-engine-spawn-mutation-hygiene`, reused here)
3. `npx tsc --noEmit && npx tsc -p triade/tsconfig.test.json --noEmit` twin gates — required before merge
4. `_bmad-output/implementation-artifacts/deferred-work.md` DW-72/73 `status: done` + `resolution-undo: 365ffe33… 7374617475733a206f70656e` — already ledgered working-tree `2026-09-02`

### Risks to Plan

- **Risk**: A future edit reintroduces `candidates.filter(([r,c])=>…)` for brevity and re-exposes the `null is not iterable` throw.
  - **Impact**: Direct-API `spawnTile(board,1,rng,[null as unknown])` crashes the suite — engine-never-throws violated, `TypeError` at destructuring.
  - **Contingency**: `rg -n "candidates\.filter" triade/src/engine/core/spawn.ts` must stay 0; P0 G-02 `doesNotThrow` on `null` entry is the living pin.

- **Risk**: A future `Board` widening from `number|null` to `object { v, id }` would make `board[r]?.[c] !== null` occupancy check insufficient (object ref always truthy).
  - **Impact**: Occupied object cells would be treated as empty, pool would include occupied candidates, `spawnTile` would overwrite a merge result.
  - **Contingency**: `rg -n "export type Cell" triade/src/engine/core/types.ts` must stay `number | null`; any widening requires `Board` emptiness check to become `board[r]?.[c] == null` vs occupancy sentinel + a new P0 object-alias pin.

- **Risk**: `sprint-status.yaml` is orchestrator-owned — this design must never write it; working-tree `git diff --stat` should not list it.
  - **Impact**: Orchestrator stalls, sweep sweep bundle name `dw-engine-spawn-candidates-validation` mismatched with `status: done`.
  - **Contingency**: Gate `git diff --stat` before commit — must show `deferred-work.md` but not `sprint-status.yaml`.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run) — for this validation, P0s already exist as the 13-case manual edge script but not yet as a committed `__tests__` suite; ATDD would codify G-01..G-10 as a new `spawn-candidates-validation.atdd.test.ts`.
- Run `*automate` for broader coverage once implementation exists — `automate` for `dw-engine-spawn-candidates-validation` would expand `spawn-placement.test.ts` AC3 statistical gate to cover the mixed-pool 4000-draw case explicitly.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date}
- [ ] QA Lead: {name} Date: {date}

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **`triade/src/engine/core/game.ts` — directional spawn opposite-edge path (DW-72/73 second-caller)** | `game.ts:53-78` is the primary caller of `spawnTile(board,pending,rng,candidates)` with `candidates` derived from `shifted[i].moved` pushed distinctly per row/col. This bundle does NOT change it, but validation must not over-filter its distinct in-bounds empties — otherwise every effective move would see empty pool and spawn null (AC4 break). | `spawn-placement.test.ts` AC1 4-dir (left `[0,3]`, right `[0,0]`, up `[3,0]`, down `[0,0]`) + `directional-spawn.integration.test.ts` 204/236/303 must stay green. `git diff HEAD -- triade/src/engine/core/game.ts` 0 is the gate. |
| **`triade/src/engine/core/spawn.ts` — `resolveSpawn`/`pickCombined`/`weightedPicker` distribution** | Untouched: `weights.ts:20-32` `weightedPicker` re-normalizes, `pickCombined` `[0.4,0.8,1.0]` bands + `normalizeTo(POT_WEIGHT)` remain; `pickIndex` still `Math.floor(rng()*len)` clamped. Candidate validation must not call `rng` (guard is pure loop+Set). | `weights.test.ts` + `ceiling.test.ts` + `pot.test.ts` + `adaptive-spawn-integration.test.ts` sigma gate + `spawn-config.test.ts` 7/7 must stay green. `rg -n "Math\.random" triade/src/engine` 0. |
| **`triade/__tests__/engine/spawn-placement.test.ts` — existing AC3/AC5 gates** | 8 P0s already cover omitted vs candidate vs empty-pool vs 4-dir wall; this bundle hardens the optional `candidates` branch that those ACs exercise. New guard must keep their `spy.calls` 0 vs 1 and uniform `1/candidates.length` asserts. | `npm --prefix triade test -- __tests__/engine/spawn-placement.test.ts` 11 pass stays green; `npm --prefix triade test` 910/238. |
| **`triade/src/engine/core/board.ts` / `line.ts` / `rules.ts` wall & merge** | Byte-identical; wall-compaction + merge-once invariants are prerequisites for `board[r]?.[c]` occupancy check (occupied means `number`, empty means `null`). | `line.test.ts` + `game.test.ts` wall expectations remain gate. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (TECH/SEC/PERF/DATA/BUS/OPS, P×I scoring, ≥6 high)
- `probability-impact.md` - Risk scoring methodology (Probability 1-3 × Impact 1-3)
- `test-levels-framework.md` - Test level selection (Unit for pure `spawnTile`, no E2E)
- `test-priorities-matrix.md` - P0-P3 prioritization (blocks core + high risk → P0, medium → P1)
- `nfr-criteria.md` - NFR thresholds → planned validation mapping (reliability/uniform/draw-budget)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md`
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-72, DW-73)
- Architecture: `triade/src/engine/core/spawn.ts:83-127` (primary site), `triade/src/engine/core/game.ts:53-78` (production caller, must NOT be changed)
- Tests: `triade/__tests__/engine/spawn-placement.test.ts` + `triade/__tests__/integration/directional-spawn.integration.test.ts`
- Helpers: `triade/test-utils/helpers.ts` (`spyRng`/`rngOf`/`mulberry32`/`boardWith`)
- Config: `_bmad/tea/config.yaml` (`test_artifacts: _bmad-output/test-artifacts`)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Bundle**: `dw-engine-spawn-candidates-validation` (DW-72, DW-73)
**Execution**: Sequential (TEA host-only, no Playwright/Pact CLI — pure engine validation)
