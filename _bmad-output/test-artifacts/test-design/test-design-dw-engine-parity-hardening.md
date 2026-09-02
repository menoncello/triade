---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-parity-hardening.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/src/engine/core/pot.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/game/matchStats.ts'
  - 'triade/src/game/matchScore.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/engine/engine.parity-hardening.atdd.test.ts'
  - 'triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts'
  - 'triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/src/utils/mulberry32.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-engine-parity-hardening — spawn-nothing / blind-spot / multi-move / ladder-ceiling chain (DW-25, DW-26, DW-34, DW-103)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-engine-parity-hardening`
**Scope:** Targeted test design for the working-tree delta of `dw-engine-parity-hardening`

> **Delta under assessment:** Commit `73f1b73 sweep dw-engine-parity-hardening: DW-25, DW-26, DW-34, DW-103 via bmad-loop` (spec `baseline_revision 398a06d`, `final_revision 73f1b73`, `8f62b44` on `main`) vs baseline `398a06d` (`spec-engine-parity-hardening.md`). Working-tree diff vs `HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` DW-25/DW-26/DW-34/DW-103 `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-parity-hardening` + `resolution-undo: 043844070ab…` four entries, `spec-engine-parity-hardening.md` no production diff); production-side delta is two new ATDD suites plus one header doc (no engine source change):
> - `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts:1-223` — NEW 10 tests (223 LOC): header comment DW-26 shared-bug blind-spot + absolute-oracle mitigation (`game.test.ts:198`), DW-25 5 spawn-nothing full-board branch pins (omitted / provided-`[]` / occupied `[[0,0]]` pool → `cell:null,value:null, board clone!==input, deepEquals, input not mutated, calls.length===0`, plus control `1-empty→1 draw, placed` and hygiene 4-case sweep including occupied-filtered pool `[[0,1],[0,2]]` → clone), DW-34 5 seeded multi-move/full-game differential pins (`replay(seed, dirs)` helper via `mulberry32` + `game.newGame` + `game.move` loop, boards/scores/cumulative/pendingSpawn identical across replay, different-seed divergence, 20-move `20260808` deterministic snapshot, draw-budget `effective 3 / noop 0` via `spyRng`/`rngOf()`, 50-move `0xc31` accumulation).
> - `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts:1-129` — NEW 5 tests (129 LOC): DW-103 end-to-end `ceilingDetector→tierForCeiling→potForTier` ladder 12 ceilings `[0,3,12,24,47,48,96,192,384,768,1536,3072]` → tiers `[0×5,1,2,3,4,5,6,7]` → pots `[[3],[3],[3],[3],[3],[3,6],[3,6,12],…,[3×8]]`, App wiring `rg availablePot\s*=\s*potForTier\s*\(\s*tierForCeiling\s*\(\s*ceilingDetector\s*\(\s*game\.board` plus thin-view `GameOverOverlay` no `ceilingDetector|tierForCeiling|potForTier`, `isNewRecord(sessionStartBest` anti-leak `handleRestart` never writes `sessionStartBest*Ref.current` plus runtime `isNewRecord(0,0)→false / (0,1)→true / (150,150)→false`, no celebration symbols scan, `matchStats` `initialStats→maxTile` + `applyMoveStats` max monotonic never-deflates.
> - `triade/__tests__/engine/game.test.ts:1` — header doc comment added for DW-26 limitation (`TS===web passes if both share bug` + `game.test.ts absolute oracle`), plus existing `game.test.ts:198` absolute `spawnTile full-board→nulls` (32 tests total) kept green as oracle.
> - Engine sources byte-identical by spec boundary: `triade/src/engine/core/spawn.ts:72-96` `spawnTile` early `empty.length===0→{board:next,cell:null,value:null}` / `pool.length===0→nulls` + `cloneBoard` hygiene, `triade/src/engine/core/game.ts:41-105` `move` 3-draw effective / 0 noop + `newGame` 20 draws, `triade/src/engine/core/ceiling.ts:5-50` `ceilingDetector` + `tierForCeiling` closed-form `Math.floor(Math.log2(c/48)+1e-9)+1`, `triade/src/engine/core/pot.ts:6-9` `potForTier` clamp `MAX_POT_TIER=30`, `triade/src/engine/config/spawnConfig.ts:1-17` `FIXED_WEIGHTS/POT_WEIGHT/POT_BASE_VALUE/POT_CURVE`, `triade/src/game/matchStats.ts:1-36` `initialStats/applyMoveStats maxTile`, `triade/test-utils/helpers.ts:13-60` `rngOf/spyRng/mulberry32/boardWith/gameState` deterministic helpers — none changed except docs.
> - Ledger `deferred-work.md` — DW-25 (spawn-nothing parity only absolute), DW-26 (13 parity TS===web blind spot), DW-34 (no multi-move differential), DW-103 (ladder ceiling thin-view only) flipped `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-parity-hardening` + `resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b` each; `sprint-status.yaml` is orchestrator-owned and **not** in scope for this design (no write, no revert).

---

## Executive Summary

**Scope:** Harden engine parity where the original `1-2` suite only cross-checked single-move `TS===web` non-full paths. Before the sweep `spawnTile` full-board `spawn-nothing` was covered by a single absolute unit test (`game.test.ts:198`) not parity, 13 move scenarios asserted `TS===web` never an absolute board/score/trace oracle, no seeded `newGame→move×k` replay existed so sequence-level spawn-position loops and repeated-move score accumulation divergences were invisible, and the ladder ceiling `ceilingDetector→tierForCeiling→potForTier` was pinned only as a thin-view `stats.maxTile` prop in `gameOverOverlay.recordHighlight.test.ts:252-296`, not as the engine `availablePot = potForTier(tierForCeiling(ceilingDetector(board)))` pipeline. The `js/game.js` UMD reference that once supported `TS===web` was removed (`e500e21`), so sequence hardening now uses TS self-differential replay determinism plus absolute oracle, preserving intent without resurrecting deleted PWA. `spawn-nothing` is unreachable via `move()` (effective move always frees a cell) but is contract-relevant for direct `spawnTile` callers.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3
- Critical categories: TECH (spawn-nothing 0-draw vs clone hygiene, shared-bug blind spot vs absolute oracle, multi-move draw-budget + replay determinism), DATA (ladder chain tier/pot vs App `availablePot`, `isNewRecord` sessionStartBest alias leak)

**Coverage Summary:**

- P0 scenarios: 11 groups (host unit, spawn-nothing omitted/`[]`/occupied → `nulls,0 draws,clone!==input,deepEquals,notMutated` + control + header doc, multi-move replay identical + different-seed divergence + 20-move deterministic + 50-move accumulation, ladder chain 12 ceilings tiers/pots + App wiring grep + isNewRecord sessionStart gating)
- P1 scenarios: 8 groups (single-move absolute still green 32 tests, draw-budget `effective 3 / noop 0` via `rngOf()` throw + `spyRng` calls, `game.test.ts:198` full-board absolute, `matchStats` max monotonic, `GameOverOverlay` thin-view no ladder import, hygiene 4-case sweep, ladder no-celebration scan)
- P2/P3 scenarios: 8 groups (ledger resolution-undo 64-hex 4 hits, no `Math.random` scan, chain `0 vs null` empty-board, `potForTier` cap 30, spawn candidate pool filter `[0,1]×[0,3]` bounds, helper factory `mulberry32`/`rngOf`/`spyRng` reuse, exploratory cross-cutting)
- **Total effort**: ~4.2–7.0 hours (~0.5–1.0 day; host-only, no device lane — pure `triade/__tests__/engine|game` + `triade/src/engine` TS, `npm --prefix triade test` + `tsc --noEmit` gate `<15 min`, both configs clean)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score rules `canMerge(1+2→3, >=3 equal)` / `mergeValue` / merge-once cascade / `shiftLine` / `boardFromLines` 4×4 guard, grid `GRID_SIZE=4`, weight distribution `FIXED_WEIGHTS 40/40 + POT_WEIGHT 0.2 + POT_BASE_VALUE 3`, `pickIndex` NaN clamp, `previewFor`/`previewInvariant`/`ambiguity band`, `matchOrchestrator`/`undo`/`rewardedAd`, `src/feel` haptics/punch/shake/bullet/sfx, `App.tsx`/`GameBoard` Skia/Reanimated, `RNGH` gesture, `layout.ts`/`Hud.tsx`** | `git diff --stat -- triade/src/engine` between baseline `398a06d` and `73f1b73` shows no engine file changed (spec boundary `Always: Keep engine source unchanged except docs/comments`); `git diff HEAD` shows only `deferred-work.md` + `spec-engine-parity-hardening.md` + the two new test suites + `game.test.ts:1` header doc (engine byte-identical). | Invariants stay gated by 897 pass / 11 expected-RED baseline (`npm --prefix triade test` Auto Run) + `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `tsconfig.test.json` clean, and by existing `__tests__/engine/game.test.ts` 32 + `line.test.ts` / `ceiling.test.ts` / `pot.test.ts` / `adaptive-spawn-integration.test.ts` suites still green. |
| **Reintroducing `js/game.js` web PWA for `TS===web` cross-check, changing `Board`/`GameState`/`PendingSpawn` public types, changing store schema** | Spec Boundaries `Block If: Would need to reintroduce js/game.js, change store schema, modify deferred-work.md ledger, or change Board/GameState/PendingSpawn public types`. | Design Notes in spec document the deletion (`e500e21` removes UMD) and the replacement strategy: TS self-differential determinism + absolute oracle `game.test.ts`. Shapes stay pinned via `rg -n "export type Board" triade/src/engine/core/types.ts` + `rg -n "export type GameState" triade/src/engine/core/types.ts` + `rg -n "export type PendingSpawn" triade/src/engine/core/types.ts` (each 1 hit) + `tsc` both configs. Re-adding PWA would require architecture review (Block If). |
| **Changing spawn weights/distribution, `GRID_SIZE`, adding production dependencies, mutating input boards in tests** | Spec Boundaries `Never: Change spawn weights/distribution or GRID_SIZE; add new production dependencies; mutate input boards in tests; use Math.random in parity suites`. | Pinned via `rg -n "FIXED_WEIGHTS" triade/src/engine/config/spawnConfig.ts` + `rg -n "GRID_SIZE" triade/src/engine/core/types.ts` single definition `4` + `rg -n "Math\.random" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` `0` + `rg -n "Math\.random" triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` `0` + `boardWith cloneBoard notStrictEqual + deepEquals` pins. |
| **Editing `_bmad-output/implementation-artifacts/deferred-work.md` ledger beyond `done+resolution-undo`, or writing `sprint-status.yaml`** | Spec `Never: Edit deferred-work.md` beyond bundle sweep; `sprint-status.yaml is owned by the orchestrator: never write it, and never revert a change to it`. | Working-tree `git diff` already shows ledger `open→done` 4 entries with `resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b` 64-hex each (`rg -n "043844070ab" _bmad-output/implementation-artifacts/deferred-work.md` 4 hits); `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in this workflow (reverting a `done→backlog` would violate orchestrator ownership). This plan never writes ledger or status. |
| **Board `role="grid"` a11y, dev-build physical device, frame-rate bench, rewarded-ads / RevenueCat / Epic 9-11** | No a11y/bench/ads code touched. | Existing suites + `gameOverOverlay.recordHighlight.test.ts:252-296` thin-view already cover `stats.maxTile` prop; device/bench remain `EXPECT REDUX` not caused by this bundle. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** Both suites are pure TS with no `expo-*`/`Skia`/`Reanimated`/`RNGH`/`MMKV` dependency: `spawnTile(Board, number, Rng, candidates?)→SpawnResult` with only `Board 4×4` + `value` + `Rng () => number in [0,1)` + optional `candidates: [row,col][]`; `move(GameState, Direction, Rng)→MoveResult` with `GameState {board, pendingSpawn {value, displayRoll}}` + `mulberry32(seed)()` deterministic; `ceilingDetector(Board)→number` + `tierForCeiling(number)→CeilingTier` + `potForTier(CeilingTier)→number[]` with only board max. All paths host-testable via `node --import tsx --test` with `boardWith`/`emptyBoard`/`fullBoard` fixtures, `rngOf(...vals)` throwing on over-draw, `spyRng(...vals)` recording `calls: number[]`, `mulberry32(seed)` seeded engine replay, and `gameState(board, pending)` helper.

**Observability — Good.** Outputs are deterministic numerics/objects/booleans with no hidden state: `SpawnResult {board: Board, cell: [r,c]|null, value: number|null}` with `cell/value null` + `board!==input && deepEquals` + `calls.length===0` observable on spawn-nothing, `MoveResult {board, pendingSpawn {value, displayRoll}, trace, score, moved}` + `replay().boards/scores/cumulative/states[].pendingSpawn` determinism observable across two independent `mulberry32(seed)` replays, `ceilingDetector→tier→pot` chain observable as numeric triples `0→0→[3]`, `47→0→[3]`, `48→1→[3,6]`, `96→2→[3,6,12]`, … `3072→7→[3×8]` and as `App availablePot` pipeline equality, `isNewRecord(sessionStartBest, score)` boolean observable `>strict` not `>=`.

**Reliability — Strong (engine never throws, helpers throw on misuse).** `spawnTile` on full board returns `board: cloneBoard(input)` not throw, `move` noop consumes 0 draws so `rngOf()` with 0 values never exhausts, effective move consumes exactly 3 draws (cell pick + next value + displayRoll) deterministically across replay, `ceilingDetector` on empty board → `0` not throw, `potForTier` clamped `MAX_POT_TIER=30` never throw. `rngOf(...vals)` throws `exhausted after N` when over-drawn so 0-draw noop would fail closed if a regression started drawing, `spyRng(...vals)` blanks extra calls with failure via `calls.length` assertion. Both `tsc` gates (`tsconfig.json` + `tsconfig.test.json`) clean; `npm --prefix triade test` full gate `<15 min` (897 pass / 11 expected-RED baseline per spec Auto Run).

**Testability Risks:** Two surfaces are thin: (a) spawn-nothing parity only asserts via new hardening suite + existing absolute `game.test.ts:198`; a revert that reintroduced `Math.random` in parity suites would break determinism and pass on one host but `EXPECT RED` on CI due to rely on `mulberry32`/`rngOf` only (R-007); mitigated by `Math.random` 0 scan + `rngOf`/`spyRng`/`mulberry32` imports only. (b) Ladder chain `availablePot` pipeline in `App.tsx` is a single `rg` textual pin; a rename `availablePot`→`spawnPot` without updating chain would diverge while tests still pass if new name not scanned (R-004); mitigated by `rg availablePot\s*=\s*potForTier` 1 hit + `ceilingDetector|tierForCeiling|potForTier` imports pin in `App.tsx` 3 hits.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH / DATA | **Spawn-nothing branch parity gap — `spawnTile` on full board via omitted / `[]` / occupied `[[0,0]]` pool must return `{board: clone!==input, cell:null, value:null}`, 0 draws, board deepEquals input and input not mutated.** Before fix only `game.test.ts:198` absolute covered it (single `[]` case) while parity only checked non-full path, so a regression that made `spawnTile` return `board: input` (aliased) vs `board: clone` on full board, or that consumed 1 draw on empty pool, or that filtered candidates without `board[r][c]===null` would pass parity but corrupt callers relying on clone hygiene (App `setGame` alias leak) and skew seeded replay determinism. Full board is unreachable via `move()` (effective always frees a cell) so the gap stayed latent for direct `spawnTile` callers. | 2 | 3 | **6** | Enforce 0-draw clone hygiene: (a) **host P0 pins** 5 cases `engine.parity-hardening.atdd.test.ts:64-139` — `'[P0] DW-25 spawn-nothing parity: omitted candidates…'` `cell null, value null, deepEquals, notStrictEqual, input not mutated, calls.length 0` + `'[P0] provided [] pool …'` + `'[P0] provided occupied candidates … [[0,0],[1,1],[2,2]]'` + `'[P0] non-full control 1 draw placed'` + `'[P1] hygiene parity: all empty-pool paths …'` 4-case sweep (each `clone!==input, deepEquals, calls 0`); (b) **static scans** `rg -n "spawnTile" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 5 hits + `rg -n "calls\.length" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 5 hits (0 on empty pool, 1 on placed) + `rg -n "notStrictEqual\(res\.board" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 5 hits; (c) **regression gate** `game.test.ts:198` absolute stays green (oracle) + `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` 10 pass; Spec I-O matrix rows 1–2. | FE lead | Immediate (gate DW-25) |
| R-002 | TECH | **Shared-bug blind spot — parity that asserts `TS===web` (or TS self-differential) has an inherent `shared-bug` blind spot: if BOTH sides share the same defect, the differential passes silently.** Original 13 parity move scenarios asserted only `TS===web` never an absolute board/score/trace oracle, and the `js/game.js` UMD was removed `e500e21` so the cross-check no longer even existed; without a documented limitation + absolute-oracle mitigation, a future reader would trust parity alone and miss a shared defect (e.g. `canMerge` off-by-one would pass both). | 2 | 3 | **6** | Enforce documented duality: (a) **header doc pin** `ladder chunk read` `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts:1-18` header states `Limitation & mitigation (DW-26): Parity that asserts TS === web (or TS self-differential) has an inherent shared-bug blind spot — if BOTH sides share the same defect, the differential passes silently. The absolute oracle is the unit suite game.test.ts, which asserts concrete expected boards/scores/traces (e.g. game.test.ts:198)`; (b) **static scans** `rg -n "shared-bug" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 1 hit + `rg -n "blind spot" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 1 + `rg -n "absolute oracle" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 1 + `rg -n "game\.test\.ts:198" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 1; (c) **absolute gate** `game.test.ts` 32 tests all assert concrete expected boards (e.g. `game.test.ts:198` `spawnTile on a full board spawns nothing`) remain green alongside parity; Spec I-O row 3 + Design Notes `js/game.js remains removed`. | FE lead | Immediate (gate DW-26) |
| R-003 | TECH / DATA | **Multi-move / full-game seeded differential divergence invisible — sequence-level spawn-position loops, repeated-move score accumulation, and draw-budget creep are invisible to single-move parity.** Without a `newGame(seed)→move(dir,rng)×k` replay that pins boards/scores/pendingSpawn/traces identical across two independent `mulberry32(seed)` runs, a regression that changed `resolveSpawn` resolver from 1 draw to 2, or `move effective` from 3 to 4, or that leaked `Math.random` or that broke `mergeOnce` order would pass single-move matrix but drift after 5–50 moves and corrupt deterministic replay (undo, session seed). | 2 | 3 | **6** | Enforce seeded replay determinism + draw-budget: (a) **host P0 pins** 5 cases `engine.parity-hardening.atdd.test.ts:142-223` — `'[P0] DW-34 multi-move differential: same seed+sequence replayed twice is identical (boards, scores, pendingSpawn)'` `seed 42 dirs 10` `deepEqual boards/scores/cumulative/pendingSpawn[i]` + `'[P0] different seed diverges'` `1 vs 2 anyDiffer` proves suite would catch drift + `'[P0] full-game seeded differential: newGame+20 moves deterministic snapshot pin'` `seed 20260808` `×20 left/up/right/down` `final board deepEqual, cumulative finite ≥0` + `'[P1] draw-budget preserved across sequence: effective 3 draws, noop 0'` `spyRng 3 calls effective true` + `rngOf() 0 values noop not draw no throw` + `'[P1] 50 seeded moves accumulate score deterministically'` `seed 0xc31 ×50`; (b) **static scans** `rg -n "mulberry32\(\s*seed" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 2 hits + `rg -n "game\.newGame" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 3 hits + `rg -n "game\.move" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 6 hits + `rg -n "rngOf\(\)|spyRng" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 6 hits; (c) **control gate** different-seed divergence proves not vacuous; Spec I-O rows 4–5 + execution `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` 10 pass. | FE lead | Immediate (gate DW-34) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | BUS / TECH | **Ladder ceiling `ceilingDetector→tierForCeiling→potForTier` end-to-end drift vs App `availablePot` pipeline or overlay thin-view breach.** Thin-view is intentional (`GameOverOverlay` only reads `stats.maxTile`/`isNewRecord` prop, ladder lives in `App.tsx`/`src/game`/`src/engine` per spec boundary), but the chain itself was only thin-view pinned via `gameOverOverlay.recordHighlight.test.ts:252-296` varying `stats.maxTile` prop — the tier `48,96,192,384,768,1536,3072` mapping and `potForTier([3,6,12,…])` plus `App availablePot = potForTier(tierForCeiling(ceilingDetector(board)))` were unpinned; a rename `availablePot→spawnPot` or a change `POT_BASE_VALUE 3→1` without updating `App.tsx` / board-max would silently drift pot ladder. | 2 | 2 | 4 | Pin chain + thin-view + wiring: (a) **host P0 pins** `ladder-ceiling-chain.atdd.test.ts:37-80` — `'[P0] DW-103 ladder chain end-to-end: ceilingDetector→tierForCeiling→potForTier matches expected ladder'` 12 ceilings `0,3,12,24,47,48,96,192,384,768,1536,3072` → tiers `0×5,1,2,3,4,5,6,7` → pots `[[3],…,[3×8]]` `detected==ceiling, tier==expected, pot==expected, availablePot==pot` + `'[P0] DW-103 App wiring pin: … derives availablePot = potForTier(tierForCeiling(ceilingDetector(game.board))) once per render'` `GameOverOverlay` no `ceilingDetector|tierForCeiling|potForTier` + `App.tsx` contains `availablePot\s*=\s*potForTier\s*\(\s*tierForCeiling\s*\(\s*ceilingDetector` ; (b) **static scans** `rg -n "availablePot\s*=" triade/App.tsx` 1 hit + `rg -n "ceilingDetector" triade/App.tsx` 1–2 hits + `rg -n "tierForCeiling.*potForTier|potForTier.*tierForCeiling" triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` 2 hits; spec ladder chain is `engine.purity`/`preview-invariant` not overlay responsibility per Design Notes. |
| R-005 | BUS / DATA | **`isNewRecord(match.best, score)` leak via alias — `match.best`/`persistedBest` is live `Math.max(best, score)` not session-start best; overlay `isNewRecord(match.best, score)` would stay true forever after crossing, while correct `isNewRecord(sessionStartBest, score)` gates only sessions that actually exceed entry best.** `DW-33` documents the conflation; `DW-103` notes `isNewRecord(match.best,…) leak via alias not Runtime-pinned`. Before fix `gameOverOverlay.recordHighlight.test.ts` only checked `stats.maxTile` thin-view; `App` wiring `isNewRecord={isNewRecord(match.best, …)}` would pass thin-view but leak in production. | 2 | 2 | 4 | Pin session-start gating not alias: (a) **host P0 pins** `ladder-ceiling-chain.atdd.test.ts:82-103` — `'[P0] DW-103 isNewRecord session-start gating pin: sessionStartBest, not match.best alias'` `isNewRecord(sessionStartBest` + `isNewRecord={isNewRecord(sessionStartBest` + `handleRestart must never write sessionStartBest*Ref.current` (slice `indexOf('const handleRestart')+1500, stripCommentsAndStrings`) + runtime `isNewRecord(0,0) false, (0,1) true, (100,150) true, (150,150) false, (100,100) false` (spec `0,0→false, 0,1→true, 150 vs 150 false`); (b) **static scans** `rg -n "isNewRecord\(sessionStartBest" triade/App.tsx` 2 hits + `rg -n "sessionStartBest.*\.current\s*=" triade/App.tsx` 0–1 hit (no write in handler) + `rg -n "isNewRecord" triade/src/game/matchScore.ts` 2 hits (`best` + `isNewRecord`); spec boundary `overlay stays thin-view stats.maxTile prop only` preserved. |
| R-006 | TECH | **Candidate pool empty-filter hygiene — provided `candidates` must filter `r in [0,GRID_SIZE) && c in [0,GRID_SIZE) && board[r][c]===null`; a bug that trusted candidates without emptiness check would place onto occupied cells, overwriting tiles, or that missed out-of-bounds would throw indexing `board[r][c]` on `c=10`.** `spawn.ts:flag` handles via `pool.filter([r,c]=>… board[r][c]===null)` but before `helpers` hardening the test-level `spyRng` silently served `0.5` forever so an over-draw would not throw; after helper hardening `rngOf` throws on exhaust so pool-length mismatch now fails closed. | 1 | 3 | 3 | Pin pool filter + bounds: (a) **host P1 pin** `engine.parity-hardening.atdd.test.ts:117-139` 4-case sweep includes `candidates [[0,0]] occupied pool` → `pool.length===0→nulls, 0 draws, deepEquals, clone` + `candidates [[0,1],[0,2]] occupied` same via `cases[3]` reassigned to full board; (b) **static scan** `rg -n "candidates\.filter" triade/src/engine/core/spawn.ts` 1 hit + `rg -n "GRID_SIZE" triade/src/engine/core/spawn.ts` 2 hits + `rg -n "board\[r\]\[c\] === null" triade/src/engine/core/spawn.ts` 1 hit; engine never throws posture preserved. |
| R-007 | TECH | **`rngOf`/`spyRng`/`mulberry32` misuse — suite must use deterministic `mulberry32/rngOf/spyRng` only, no `Math.random`; `rngOf` throw-on-exhaust correctly pins 0-draw noop, `spyRng` clone hygiene covered; a stray `Math.random` in a parity suite would break replay determinism and make the same test non-reproducible across hosts/CI runs.** | 2 | 2 | 4 | Pin deterministic helpers only: (a) **static scans** `rg -n "Math\.random" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 0 + `rg -n "Math\.random" triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` 0 + `rg -n "mulberry32|rngOf|spyRng" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 6 hits; (b) **host P1 pin** `'[P1] draw-budget preserved'` uses `rngOf()` with 0 values + `spyRng calls` to prove 0/3 draws, while `ladder` suite uses no rng at all (pure ceilings), so residual `Math.random` would be caught by `ui.norolls` equivalent scan. |
| R-008 | TECH | **Pot ladder `POT_BASE_VALUE 3` and `MAX_POT_TIER 30` implied — `potForTier` clamped terminus not pinned beyond tier 7; a change `POT_BASE_VALUE 3→6` or doubling logic `*2 vs <<1` would drift `[3,6,12]` while App wiring still matches generic `potForTier(tier)` call so both sides drift together (shared-bug class via ladder config).** | 1 | 3 | 3 | Pin literals not re-computed: (a) **host P0** ladder 12-case asserts `pot: [3], [3,6], [3,6,12], … [3×8]` hand-computed literals, not `recompute potForTier` oracle (spec I-O ladder `[1],[1,6],[1,6,12],…` via `spawnConfig`); (b) **static scan** `rg -n "POT_BASE_VALUE" triade/src/engine/config/spawnConfig.ts` 2 hits + `rg -n "MAX_POT_TIER" triade/src/engine/core/pot.ts` 1 hit (clamp 30) + `rg -n "potForTier\(tierForCeiling\(ceilingDetector" triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` 2 hits; circular-oracle risk (DW-58 analogue) already closed via literal table. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | OPS | **Ledger `resolution-undo: 043844070ab…` 64-hex per DW-25/26/34/103 + `sprint-status.yaml` ownership.** Sweep marks 4 DW `done` with `resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b` 64-hex each plus 9-digit prefix-derived tail; `sprint-status.yaml` is orchestrator-owned and must not be written or reverted by this workflow (instruction `never write it, and never revert a change to it`). | 1 | 2 | 2 | Monitor — ledger already records `resolution-undo: 043844070ab…` per entry (`rg -n "043844070ab" _bmad-output/implementation-artifacts/deferred-work.md` 4 hits); any reopen must keep hash. `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty (gate shows `epic-1/2/4/6 done`, `epic-3/5/8 backlog` unchanged). This plan never writes ledger or status. |
| R-010 | PERF | **Measurement + engine-never-throws overhead — ladder chain `Array.from({length:t+1})` ≤31 allocations per `potForTier` per board, 12-case suite runs 48 pure calls; multi-move replay 50× `move` clones 4×4 ints; both O(1) per move, `<0.1 ms` per call, vs 60 FPS budget `<8 ms`.** | 1 | 1 | 1 | Monitor — `npm --prefix triade test` full gate `<15 min` (897/11 baseline) is sufficient; `npm --prefix triade exec -- tsc --noEmit` both configs `<5 s` proves no allocation leak; no bench lane needed for this refactor (bench already exists for 8-1..8-6 feel). |

### Risk Category Legend

- **TECH**: spawnTile input-board mutation vs clone, candidates pool filter/bounds, `pickIndex` vs throw, `rngOf` throw-on-exhaust vs `spyRng 0.5` fallback, `Math.random` vs `mulberry32`, `js/game.js` deletion vs self-differential, draw-budget 3 vs 0, merge-once vs mergeLoop
- **DATA**: score accumulation + pendingSpawn `value/displayRoll` determinism, ladder tier/pot literal vs recomputed oracle, `ceilingDetector` max vs empty-board 0, `potForTier` MAX_POT_TIER 30 cap
- **BUS**: `availablePot` App wiring vs thin-view overlay `stats.maxTile`/`isNewRecord prop`, `isNewRecord` sessionStartBest alias leak vs `match.best`, FR-30/FR-32 game-over highlight vs tier celebration
- **OPS**: `deferred-work.md` 64-hex `resolution-undo` ledger, `sprint-status.yaml` orchestrator ownership (never write/revert)
- **SEC**: n/a for this bundle (no tokens, no network)
- **PERF**: host-only TS O(1) `<0.1 ms`; no device lane — pure engine/game ATDD

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category    | Requirement / Threshold | Risk Link | Planned Validation                         | Evidence Needed                  |
| --------------- | ----------------------- | --------- | ------------------------------------------ | -------------------------------- |
| Reliability | engine-never-throws on any Board/Rng/candidates (including full board, empty `[]` pool, occupied pool) — `spawnTile` always returns `board clone, cell/value nulls` not throw, `move` never throws across 20–50 seeded replays | R-001, R-006 | Host `engine.parity-hardening.atdd.test.ts` 5 spawn-nothing + control + 4-case hygiene + 5 replay/draw-budget all green; `game.test.ts` 32 including `game.test.ts:198` full-board | `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` pass 10; `npm --prefix triade test -- __tests__/engine/game.test.ts` pass 32; `tsc --noEmit` both configs clean |
| Determinism | Same `seed + dirs` → identical `boards/scores/pendingSpawn/trace` across two independent `mulberry32(seed)` replays; different seed diverges; `effective 3 draws / noop 0 draws / newGame 20 draws` preserved | R-003, R-007 | Host `rngOf()` throw-on-exhaust + `spyRng calls` exact 0/3 + `mulberry32(seed)` replays 10/20/50 moves | `engine.parity-hardening.atdd.test.ts:143-223` 5 replay pins + `game.test.ts` 3-draw/20-draw pins still green |
| Maintainability | Single parity-hardening suite + single ladder-chain suite as sources for spawn-nothing + shared-bug doc + replay + ladder; single `availablePot` pipeline definition in `App.tsx`; single `POT_BASE_VALUE 3` + `GRID_SIZE 4` + `GRID_SIZE` spawn filter | R-004, R-008, R-009 | Static scans `rg -n "availablePot\s*=" triade/App.tsx ==1` + `rg -n "GRID_SIZE" triade/src/engine/core/types.ts ==1` + `rg -n "POT_BASE_VALUE" triade/src/engine/config/spawnConfig.ts ==2` + `rg -n "043844070ab" _bmad-output/implementation-artifacts/deferred-work.md ==4` | `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 1 definition + `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` 1 definition + `rg` gate scans 1 hit each |
| Performance | Host parity pure O(1) per `spawnTile`/`move`/`ceilingDetector`/`tierForCeiling`/`potForTier` `<0.1 ms`, 50-move replay `<30 ms` wall-clock, full `npm test` gate `<15 min` for 897/11 baseline + 15 new passes | R-010 | Host wall-clock `npm --prefix triade test` gate; `tsc` both configs `<5 s` | `npm --prefix triade test` wall-clock log + `tsc --noEmit` log; no device lane needed |
| Compliance / Contract | `Board`/`GameState`/`PendingSpawn` public types unchanged; `clone!==input` hygiene; thin-view overlay (`GameOverOverlay` only reads `stats.maxTile`/`isNewRecord` prop, never imports ladder); no `Math.random` in parity suites | R-002, R-005 | `rg` scans `rg -n "Math\.random" parity-suites ==0` + `rg -n "ceilingDetector|tierForCeiling|potForTier" triade/src/ui/GameOverOverlay.tsx` via `stripCommentsAndStrings ==0` + `rg -n "Board.*Cell" triade/src/engine/core/types.ts` | `ladder-ceiling-chain.atdd.test.ts` thin-view + wiring pins `stripCommentsAndStrings` assertions `73,110-111` green |
| Security | N/A — no secrets/tokens/network/store/attester in scope | - | N/A | N/A |

**Unknown thresholds:** `js/game.js` cross-check no longer applies (`e500e21` deletion) — self-differential replaces it per Design Notes; `newGame` 20-draw budget is documented contract not spec-quantized latency; `potForTier` MAX_POT_TIER=30 cap not re-quantized for ladder chain but already pinned in `pot.ts` unrelated to this sweep; all engine NFR thresholds derive from `game.ts:41-105`/`spawn.ts:72-96`/`ceiling.ts:5-50` existing contracts and are not re-quantized in this hardening.

---

## Entry Criteria

- [ ] Spec `spec-engine-parity-hardening.md` revision pinned `baseline 398a06d → final 73f1b73` (intent/boundaries/I-O matrix 6 rows + 5 ACs) and `deferred-work.md` DW-25/26/34/103 `done 2026-09-02 + resolution-undo 043844070ab…` four entries are ledger truth (not sprint-status, which is orchestrator-owned)
- [ ] Helpers `triade/test-utils/helpers.ts` expose `mulberry32/rngOf/spyRng/boardWith/emptyBoard/gameState/stripCommentsAndStrings` and `triade/src/utils/mulberry32.ts` is the same `mulberry32(a){return function(){…}}` deterministic used by `game.newGame/mulberry32` seam
- [ ] Engine contracts `triade/src/engine/core/spawn.ts:cloneBoard` hygiene + `GameState pendingSpawn {value,displayRoll}` shape + `GRID_SIZE=4` + `FIXED_WEIGHTS/POT_WEIGHT` unchanged (engine byte-identical to `398a06d`)
- [ ] Feature deployed to host test harness (`node --import tsx --test` resolves `tsx` + `tsconfig.test.json`) — no Expo/Skia/RNGH runtime needed for parity+ladder

## Exit Criteria

- [ ] All P0 11 groups passing including `game.test.ts:198` absolute still green
- [ ] All P1 8 groups passing (draw-budget 3/0, GameOverOverlay thin-view, matchStats max monotonic)
- [ ] No open high-priority (≥6) risks unmitigated (R-001 + R-002 + R-003 each 6) — mitigations are runtime `deepEqual/calls.length/notStrictEqual/rg` pins not just header docs
- [ ] Test coverage agreed as sufficient (12 ladder ceilings + 10 spawn/multi-move pins + thin-view/wiring/isNewRecord/celebration/matchStats ladder pins = 15 new cases on top of 897/11 baseline → 912/11)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` clean and `tsconfig.test.json` clean, `Math.random` scan 0 in new suites, `sprint-status.yaml` untouched (`git diff --` empty)

## Project Team (Optional)

| Name   | Role     | Testing Responsibilities |
| ------ | -------- | ------------------------ |
| Eduardo | FE / Test Architect | Owns parity-hardening + ladder-chain E2E invariants, `rg` pin hygiene, ledger 64-hex + orchestrator `sprint-status.yaml` ownership gate |
| Murat (TEA) | QA / NFR assessor | Owns reliability/determinism/maintainability/perf compliance, `nfr-assess` header thresholds vs `nfr-criteria.md` mapping |

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| DW-25 spawn-nothing parity — omitted candidates full board `nulls, 0 draws, clone!==input, board unchanged vs snapshot, input not mutated` | Unit | R-001 | 1 | QA | `engine.parity-hardening.atdd.test.ts:64` `[P0] omitted candidates full board` `spyRng(0.5,0.9)` → `cell null, value null, deepEquals snapshot, notStrictEqual input, deepEquals input snapshot, calls.length 0` |
| DW-25 spawn-nothing parity — provided `[]` pool full board same `nulls,0 draws,clone` | Unit | R-001 | 1 | QA | `:77` `[P0] provided [] pool` `spyRng(0.1)` → same 0-draw clone hygiene |
| DW-25 spawn-nothing parity — provided occupied `[[0,0],[1,1],[2,2]]` full board `pool filter empty → nulls,0 draws` | Unit | R-001,R-006 | 1 | QA | `:89` `[P0] provided occupied candidates` `spyRng(0.7)` → `pool 0 → nulls` proves `board[r][c]===null` filter |
| DW-25 control — non-full board with 1 empty still places 1 draw | Unit | R-001 brake | 1 | QA | `:101` `[P0] non-full board still places (control, 1 draw)` `board [12,6,3,null] + spyRng(0)` → `cell!==null, value 3, calls 1, clone` proves branch split real not vacuous |
| DW-26 shared-bug blind spot header doc + mitigation | Unit | R-002 | 1 | QA | `:1-18` header `shared-bug blind spot — if BOTH sides share the same defect, the differential passes silently. The absolute oracle is game.test.ts … game.test.ts:198` + `rg shared-bug/blind spot/absolute oracle/game.test.ts:198` 4 hits; `game.test.ts:198` 1 absolute full-board + 20+ absolute move/merge cases |
| DW-34 multi-move replay identical `seed 42 ×10 left/up/right/down + left/left/up/down/right/up` → boards/scores/cumulative/pendingSpawn[0..10] deepEqual across two `mulberry32(42)` replays | Unit | R-003 | 1 | QA | `:143` `[P0] same seed+sequence replayed twice is identical` `replay(42,10 dirs)` `deepEqual boards/scores + strict cumulative + deepEqual pendingSpawn[i]` |
| DW-34 multi-move divergence proves suite would catch drift — `seed 1 vs 2 ×5 left/up/right/down/left` `anyDiffer` true | Unit | R-003 brake | 1 | QA | `:156` `[P0] different seed diverges` `some(board, deepEqual catch differs)` → `anyDiffer ok` proves not vacuous |
| DW-34 full-game 20-move deterministic — `seed 20260808 ×20 left/up/right/down*5` `final board deepEqual + cumulative deepEqual + finite ≥0` | Unit | R-003 | 1 | QA | `:172` `[P0] full-game seeded differential: newGame+20 moves deterministic snapshot pin` `Array.from len20 i%4 dirs` |
| DW-103 ladder chain end-to-end `ceilingDetector→tierForCeiling→potForTier` 12 ceilings | Unit | R-004,R-008 | 1 | QA | `ladder-ceiling-chain.atdd.test.ts:37` `[P0] ladder chain end-to-end: … matches expected ladder` 12 cases `0,3,12,24,47,48,96,192,384,768,1536,3072` each `detected==ceilingOr0, tier==exp, pot==exp literal, availablePot==pot` |
| DW-103 App wiring pin `App.tsx availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once per render + thin-view overlay no ladder imports | Unit | R-004,R-005 | 1 | QA | `:69` `[P0] App wiring pin` `readFileSync GameOverOverlay stripCommentsAndStrings no /ceilingDetector|tierForCeiling|potForTier/` + `rg /availablePot\s*=\s*potForTier…ceilingDetector\(game\.board/` 1 hit on `App.tsx` |
| DW-103 `isNewRecord(sessionStartBest,…)` sessionStart gating not alias + anti-leak | Unit | R-005 | 1 | QA | `:82` `[P0] isNewRecord session-start gating pin` `isNewRecord(sessionStartBest` + `isNewRecord={isNewRecord(sessionStartBest` + `handleRestart` slice `never write sessionStartBest*Ref.current` + `isNewRecord(0,0)=false,(0,1)=true,(100,150)=true,(150,150)=false,(100,100)=false` |

**Total P0**: 11 tests, ~1.6 hours (0.15 h per check avg incl. host runs + `rg` gates + `tsc` guards) — each is `node --import tsx --test` host `<1 s` plus scan cost

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| DW-25 spawnTile hygiene 4-case sweep — all empty-pool `board flat every? candidates len0` → `nulls,0 draws, Mutated=no, clone` | Unit | R-001,R-006 | 1 | QA | `:117` `[P1] spawnTile hygiene parity: all empty-pool paths return next (not board) and never throw` 4 `cases` (full omit, full `[]`, full `[[0,0]]`, full `[[0,1],[0,2]]` via reassigned `cases[3]` full `1,2,3,6`) `snap clone, spy 0.3/0.4, cell null + calls==before on empty, deepEquals snap, notStrictEqual clone` |
| Existing absolute oracle `game.test.ts:198` + 31 other game tests remain green | Unit | R-002 | 1 | QA | `game.test.ts` 32 tests (newGame 9 tiles, weighted 40/40/20, 13 move paths, cascade, compact, down trace, full-board spawn nothing, pickIndex, 3-draw/20-draw, game over 4, merge, trace, noop) — `npm --prefix triade test -- __tests__/engine/game.test.ts` |
| DW-34 draw-budget `effective 3 draws / noop 0` via `spyRng` exact + `rngOf() 0 values` throw | Unit | R-003,R-007 | 1 | QA | `:183` `[P1] draw-budget preserved` `board left [1,2,null,null] state value3 display0.5 spy 0,0.01,0.99 … 3 calls effective true` + `fullBoard stale→ move left rngOf() no throw, moved false, score 0` proves `move noop 0` vs `newGame 20` unchanged |
| DW-34 50-move seeded accumulation `seed 0xc31 ×50` `cumulative deepEqual + final board deepEqual` | Unit | R-003 | 1 | QA | `:216` `[P1] 50 seeded moves accumulate deterministically` `Array.from 50 i%4 left/right/up/down` |
| DW-103 `GameOverOverlay` no celebration symbols beyond `isNewRecord` number highlight | Unit | R-005 brake | 1 | QA | `ladder-ceiling-chain.atdd.test.ts:105` `[P1] ceiling ladder produces no overlay celebration` `GameOverOverlay strip no /confetti|celebrat|lottie|reward|particleBurst|shakeMs/` + `includes(isNewRecord)` |
| DW-103 `matchStats` chain `initialStats→ceilingDetector, applyMoveStats max monotonic` deflate never drops | Unit | R-004 | 1 | QA | `:115` `[P1] board maxTile via matchStats chain equals ceilingDetector` `b48→s0[48], b96→s1[96], b3 deflated→s2[96]` |
| Thin-view + `stripCommentsAndStrings` seam hygiene — `App.tsx` ladder imports remain single pipeline | Unit | R-004 | 1 | QA | `ladder-ceiling-chain.atdd.test.ts:69-96` `stripCommentsAndStrings(src)` shared scanner `rg` allowlist vs `FORBIDDEN_PREFIXES` analogue (DW-31 closed) — helper documented `Known limitation — regex` bounded |
| Deterministic helper hygiene — `mulberry32` same seed same stream held for replays | Unit | R-007 | 1 | QA | `engine.parity-hardening.atdd.test.ts` `import mulberry32` + sequential `const rng = mulberry32(seed); let state = game.newGame(rng)` shared stream consumed correctly (3 draws effective, 0 noop, 20 newGame) — `boardWith/mulberry32/gameState` helpers reuse |

**Total P1**: 8 tests, ~1.8 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| Ledger `resolution-undo: 043844070ab…` 64-hex per DW gate (DW-25/26/34/103) | Unit | R-009 | 4 | QA | `rg -n "043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b" _bmad-output/implementation-artifacts/deferred-work.md` 4 hits, tails `open` hex `7374617475733a206f70656e`; `sprint-status.yaml` diff empty |
| No `Math.random` in new suites (`ui.norolls` analogue) | Unit | R-007 | 1 | QA | `rg -n "Math\.random" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 0 + `rg -n "Math\.random" triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` 0 + `triade/test-utils/helpers.ts` `rngOf fallback 0.5` already removed (`d03bd19`) |
| Empty-board `max 0 vs null` edge — ladder chain `null`→`emptyBoard()`→`ceiling 0` | Unit | R-004 edge | 1 | QA | `ladder-ceiling-chain.atdd.test.ts:29` `boardWithMax(null||0)→emptyBoard()` before `ceilingDetector` 0 |
| `potForTier` cap 30 + `POT_BASE_VALUE 3` literal not recomputed | Unit | R-008 | 1 | QA | `triade/src/engine/core/pot.ts:4-8` `MAX_POT_TIER 30` + `ladder-ceiling-chain 12-case` literals `0.9016` style analogue `[[3],…]` not `recompute potForTier` oracle |

**Total P2**: 7 tests, ~0.6 hours

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement   | Test Level | Test Count | Owner | Notes   |
| ------------- | ---------- | ---------- | ----- | ------- |
| Cross-cutting scan `availablePot` single definition vs duplicate inline `potForTier(tierForCeiling(ceilingDetector(board)))` | Unit | 1 | QA | `rg -n "potForTier\(tierForCeiling" triade/App.tsx` 1 hit + `triade/src/engine/core/ceiling.ts` unchanged confirm; duplicate re-inline would be 2 hits |
| `spawnTile` host bench 1k× clone intact + replay 50× wall <30 ms | Unit | 1 | QA | Exploratory bench `engine.parity-hardening replay 50` `<30 ms` vs 60 FPS 8 ms per move budget (informative) |
| `ceilingDetector→potForTier` tier 30+ cap overflow exploratory (`ceiling 48*2^29`) | Unit | 1 | QA | `pot.ts MAX 30` caps `t>30→length 31` still finite; not AC but perf/compliance informative |

**Total P3**: 3 tests, ~0.4 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` clean (30s)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` clean (30s)
- [ ] `rg -n "Math\.random" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 0 (10s)
- [ ] `rg -n "Math\.random" triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` 0 (10s)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [ ] `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` 10 pass (P0/P1 mix but run together `<3 s`)
- [ ] `npm --prefix triade test -- __tests__/game/ladder-ceiling-chain.atdd.test.ts` 5 pass (`<2 s`)
- [ ] `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass incl. `game.test.ts:198` absolute (`<3 s`)
- [ ] `rg` suite: `rg -n "043844070ab" _bmad-output/implementation-artifacts/deferred-work.md` 4 hits + `rg -n "availablePot\s*=" triade/App.tsx` 1 hit + `rg -n "isNewRecord\(sessionStartBest" triade/App.tsx` 2 hits (`<10 s`)

**Total**: 4 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] `npm --prefix triade test` full gate 912 pass / 11 expected-RED same baseline (`<3 min`) — `897 baseline +15 new — 11 RED unchanged`
- [ ] Host draw-budget exact `spyRng calls.length 3/0` pins (in P0 file already but gate separately `<5 s`)
- [ ] `matchStats` chain `initialStats→maxTile` + `GameOverOverlay` thin-view `stripCommentsAndStrings` no-ladder (`<5 s`)

**Total**: 3 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] `rg` ledger + `sprint-status.yaml` ownership (`git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty) (`<10 s`)
- [ ] Optional exploratory bench 50× replay `<30 ms` + 1k spawn clone bench (`<10 s`)

**Total**: 2 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority  | Count             | Hours/Test | Total Hours       | Notes                   |
| --------- | ----------------- | ---------- | ----------------- | ----------------------- |
| P0        | 11        | 0.15        | 1.6        | `spawnTile` 0-draw clone + header doc + replay identical + divergence + 20-move + 50-move + ladder 12 + App wiring + isNewRecord — pure host, deterministic helpers |
| P1        | 8        | 0.22        | 1.8        | Hygiene sweep 4-case + 3-draw/0-draw + 50 accumulation + no-celebration + matchStats max + thin-view seam + helper reuse |
| P2        | 7        | 0.09        | 0.6        | Ledger 4 + Math.random 1 + empty-board 0 edge + cap 30 |
| P3        | 3        | 0.13        | 0.4        | Single-definition scans + benches + cap overflow |
| **Total** | **29** | **-**      | **~4.2–7.0** | **~0.5–1.0 day** (host-only, no device lane; `<15 min` gate)  |

### Prerequisites

**Test Data:**

- `fullBoard()` fixture `boardWith [[1,3,6,12],[6,12,1,3],[3,1,12,6],[12,6,3,1]]` fully occupied + `cloneBoard(b){b.map(r=>r.slice())}` + `emptyBoard()` 16×null + `boardWithMax(max)` `emptyBoard()[0][0]=max`
- `replay(seed, dirs)` factory `mulberry32(seed)→newGame(rng)→loop move(state,dir,rng) + cloneBoard + cumulative` deterministic, shared RNG stream (3 effective / 0 noop / 20 newGame)
- `rngOf(...vals)` throwing `exhausted after N` (helpers `d03bd19` fix) + `spyRng(...vals)` with `calls: number[]` exact + `emptyBoard()/fullBoard()` seeds for 6-way finiteness analogue

**Tooling:**

- `node --import tsx --test "triade/__tests__/**/*.test.ts" -- TSX_TSCONFIG_PATH=tsconfig.test.json` host harness (no Expo/Skia/RNGH, no device)
- `tsx 4.23 + TypeScript 6.0.3 + @types/node 26` pinned in `triade/package.json`

**Environment:**

- No physical iOS device / CocoaPods / Xcode needed — parity+ladder are host TS (`triade/src/engine` byte-identical, no `expo-*`dep)
- `git` baseline `398a06d` tagged as `baseline_revision` with `sprint-status.yaml` untouched (orchestrator-owned)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80% (spawn-nothing 5 branches + multi-move replays 5 + ladder chain 12 ceilings = 22 pins on 4 seams)
- **Security scenarios**: n/a (no store per `Block If`)
- **Business logic**: ≥70% (ladder `potForTier` ladder + `isNewRecord` session gating each >80% of spec I-O matrix)
- **Edge cases**: ≥50% (`[]` vs `[[0,0]]` vs omit vs `[GRID_SIZE]` bounds, `0 vs null` empty board, `seed 1 vs 2` diverge, `0,0→false` vs `0,1→true` vs `150,150→false` record, `max deflate 96→3` monotonic, `handleRestart` no-write)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`engine.parity-hardening 10 + ladder-ceiling-chain 5` plus `game.test.ts 32` absolute)
- [ ] No high-risk (≥6) items unmitigated (R-001 6 spawn-nothing clone, R-002 6 shared-bug header, R-003 6 multi-move replay all pinned with host `deepEqual/calls/notStrictEqual/rg` not header-only)
- [ ] Security tests (SEC category) n/a — no tokens/store per spec `Block If`
- [ ] Performance targets met (host-only O(1) `<0.1 ms`, no nightly/weekly needed per Execution Strategy)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (reliability never-throw + determinism replay + maintainability single-definition + compliance thin-view + perf gate)

---

## Mitigation Plans

### R-001: Spawn-nothing branch `full-board → {board clone, cell null, value null, 0 draws, not mutated}` (Score: 6)

**Mitigation Strategy:** Land `engine.parity-hardening.atdd.test.ts:64-139` 5 pins: omitted candidates `spyRng(0.5,0.9)→nulls, deepEquals snapshot, notStrictEqual input, deepEquals input snapshot (not mutated), calls 0`; provided `[]` same; occupied `[[0,0],[1,1],[2,2]]` pool-filter empty same; control non-full 1-empty → `cell!==null,value 3,calls 1`; hygiene sweep 4 cases full-omit/full-`[]`/full-occupied-plus-filter `[[0,1],[0,2]]` each clone. Keep `game.test.ts:198` absolute `spawnTile full-board→nulls` green as absolute oracle. Never use `Math.random` in parity suites.
**Owner:** FE lead
**Timeline:** 2026-09-02 (sweep bundle gate)
**Status:** Complete (host 5/5 green, `rg calls.length` 5 hits, `rg notStrictEqual` 5 hits)
**Verification:** `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` 10 pass (5 spawn-nothing) + `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass + `rg -n "calls\.length" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` expect `5` hits (0,0,0,1,hygiene 0 loop)

### R-002: Shared-bug blind spot `TS===web` / `TS self-differential` passes if both share bug (Score: 6)

**Mitigation Strategy:** Require parity suites to keep header doc that states the limitation and names the absolute-oracle mitigation (`game.test.ts` 20+ absolute move/merge/directional cases + `game.test.ts:198` full-board), and keep `js/game.js` deletion `e500e21` documented as intentional (self-differential replaces web cross-check). Parity never relied on alone when behavior changes.
**Owner:** FE lead
**Timeline:** 2026-09-02
**Status:** Complete (header `1-18` green, `rg shared-bug + blind spot + absolute oracle + game.test.ts:198` each 1 hit)
**Verification:** `cat triade/__tests__/engine/engine.parity-hardening.atdd.test.ts | head -20 | rg "shared-bug"` 1 + `rg "absolute oracle" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 1 + `triade/__tests__/engine/game.test.ts:198` still green

### R-003: Multi-move / full-game seeded differential determinism + draw-budget (Score: 6)

**Mitigation Strategy:** Land `engine.parity-hardening.atdd.test.ts:142-223` 5 replay pins: `seed 42×10 dirs` two `mulberry32(seed)` runs `replay()` deepEqual boards/scores/cumulative/pendingSpawn[i]; `seed 1 vs 2 ×5` `anyDiffer true`; `seed 20260808 ×20` `final board + cumulative deepEqual, finite ≥0`; `effective 3 / noop 0` via `spyRng(0,0.01,0.99,…) 3 calls` + `rngOf() 0 values noop no throw`; `seed 0xc31 ×50` `cumulative+finalBoard deepEqual`. Use `mulberry32` not `Math.random`, never mutate input boards (`cloneBoard`). Keep `game.newGame 20-draw` contract intact.
**Owner:** FE lead
**Timeline:** 2026-09-02
**Status:** Complete (host 5/5 green, `rg mulberry32|rngOf|spyRng` 6 hits, `different seed anyDiffer true` brake)
**Verification:** `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` `'[P0] DW-34 multi-move differential: same seed+sequence replayed twice is identical` pass + `'[P0] DW-34 full-game seeded…10260808'` pass + `'[P1] DW-34 draw-budget preserved'` pass; `rg -n "mulberry32\(\s*seed" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 2 + `rg -n "game\.move" 6 hits`

---

## Assumptions and Dependencies

### Assumptions

1. `triade/src/engine` byte-identical between baseline `398a06d` and `73f1b73` (spec `baseline_revision`) except docs/comments — therefore `cloneBoard` hygiene, `pickIndex Number.isFinite` degrade-to-0, `weightedPicker` re-normalization, `tierForCeiling Math.log2+1e-9` float caveat, and `potForTier MAX_POT_TIER=30` remain as per DW-41..45 ceiling hardening bundle (proven by `git diff --stat -- triade/src/engine` empty at time of this design).
2. `triade/__tests__/engine/game.test.ts:198` `spawnTile on a full board spawns nothing` + 31 other game tests remain absolute board/score/trace oracle; they were green before this sweep (`897 pass / 11 expected RED` per spec) and stay green after (this hardening adds docs not engine change).
3. `mulberry32(seed)()` is the RNG seam used by both `newGame` and `move` and is monotonic within a run (shared stream `3 draws effective / 0 noop / 20 newGame`); a future switch to `crypto.getRandomValues` would break parity suites and is out of scope per `Never: use Math.random`.
4. Thin-view `GameOverOverlay` contract holds: overlay only reads `stats.maxTile` prop + `isNewRecord(isNewRecord(sessionStartBest,…))` boolean and never imports `ceilingDetector|tierForCeiling|potForTier` (closed via `stripCommentsAndStrings` scan); ladder chain lives in `App.tsx`/`src/game`/`src/engine`.
5. `sprint-status.yaml` is orchestrator-owned and byte-identical to `HEAD` before this workflow (this plan never writes it, never reverts it) — a row at `done` or `awaiting-operator` is the orchestrator's own bookkeeping, not a defect to fix.

### Dependencies

1. `triade/test-utils/helpers.ts` `rngOf`/`spyRng`/`mulberry32`/`boardWith`/`emptyBoard`/`gameState`/`stripCommentsAndStrings` already hardened (`deferred-work DW-3/48/59/60/66` `done` via `d03bd19` sweep) — Required at design time for pins
2. `triade/src/engine/core/spawn.ts` + `game.ts` + `ceiling.ts` + `pot.ts` + `src/game/matchStats.ts` + `src/game/matchScore.ts` APIs stable (`cloneBoard`, `spawnTile/Board,Rng,candidates`, `move(GameState,Direction,Rng)→MoveResult`, `ceilingDetector(Board)→number`, `tierForCeiling(number)→CeilingTier`, `potForTier(CeilingTier)→number[]`, `initialStats/applyMoveStats`) — Required at gate time
3. Host harness `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "triade/__tests__/**/*.test.ts"` + `npm --prefix triade exec -- tsc --noEmit` both configs clean — Required at gate time

### Risks to Plan

- **Risk**: Regression adds `Math.random` inside a parity suite or replaces `mulberry32(seed)` with non-deterministic source, breaking replay determinism and making `different seed diverges` brake vacuous (`anyDiffer` would sporadically false).
  - **Impact**: Host CI would flake (sometimes pass, sometimes `anyDiffer` false due to shared Math state), `Choose-your-own-RED` 3 fails next to pass, gate blocks PR.
  - **Contingency**: `rg -n "Math\.random" parity-suites` 0 gate in smoke `<10 s`; `triade/test-utils/helpers.ts` already pins `Math.random` via `ui.norolls` analogue; flip back to `mulberry32/rngOf/spyRng`.

- **Risk**: `App.tsx` refactors `availablePot` to a new variable name or moves ladder derivation from `game.board` to `stats.maxTile` (re-introducing the thin-view-only gap that DW-103 closed), while tests still grep old name `availablePot` and falsely pass.
  - **Impact**: Ladder ceiling `ceilingDetector→tierForCeiling→potForTier` drifts (e.g. `stats.maxTile` stales one frame) while `ladder-ceiling-chain` still passes because it scans `GameOverOverlay` not `App`; production pot ladder wrong, preview `availablePot` stale.
  - **Contingency**: Keep `rg availablePot\s*=\s*potForTier` 1 hit gate; also gate `rg ceilingDetector\(game\.board\)` 1 hit in `App.tsx` + extend `ladder-ceiling-chain.atdd.test.ts:69-80` to assert both patterns if `App.tsx` renames.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run) — already have 10+5 passing; extend with `stateFromResult` style helper if `spawnTile` gains a second pool type (Story 12.1 directional spawn already plumbed via `candidates`).
- Run `*automate` for broader coverage once implementation exists — not needed: implementation is docs-only hardening, `npm --prefix triade test` is the broaden gate.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: _________________ Date: _______
- [ ] Tech Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact         | Regression Scope                |
| ----------------- | -------------- | ------------------------------- |
| **triade/src/engine/core/spawn.ts** | Direct grace of DW-25 clone hygiene — full-board empty-pool early returns share the same `cloneBoard` + `empty.length===0→nulls` fence; changing filter `board[r][c]===null` or `GRID_SIZE` 4 would break spawn-nothing pins + directional `candidates` pool (Story 12.1) | `game.test.ts:198` + `engine.parity-hardening.atdd.test.ts` 5 spawn-nothing + `weights.test.ts` `>N*0.1` removed → `sigmaBound` + `directional-spawn.test.ts` candidates |
| **triade/src/engine/core/game.ts** | `move` draw-budget 3/0 + `newGame 20` + `pendingSpawn {value,displayRoll}` shape share deterministic RNG stream with `mulberry32`; reordering draws (cell vs value) would swap spawn position/value and diverge replay `boards/scores/pendingSpawn` | `game.test.ts` 32 + `engine.parity-hardening.atdd.test.ts` 5 replay + `adaptive-spawn-integration.test.ts` 15 sigma + `game.laneSelect` lane wall |
| **triade/src/engine/core/ceiling.ts + pot.ts + src/engine/config/spawnConfig.ts** | Ladder `ceilingDetector→tierForCeiling→potForTier(→ POT_BASE_VALUE 3)` feeds `App availablePot` pipeline; `POT_BASE_VALUE` change would drift all tiers and `App` wiring together (shared-bug class) while thin-view still green | `ladder-ceiling-chain.atdd.test.ts` 12-ceiling literals `[[3],…]` + `ceiling.test.ts` 7 + `pot.test.ts` hand-computed literals 48-64 + `App.tsx rg availablePot` 1 hit |
| **triade/src/game/matchStats.ts + src/game/matchScore.ts** | `initialStats`/`applyMoveStats` `maxTile = max(maxTile, ceilingDetector(board))` monotonic feeds `GameOverOverlay stats.maxTile thin-view` + `isNewRecord(sessionStartBest)` gating (session vs live best alias); breaking monotonic or switching `match.best` would leak `*Record` highlight | `ladder-ceiling-chain.atdd.test.ts:115 maxTile monotonic` + `matchStats.test.ts` + `matchScore.test.ts` + `gameOverOverlay.recordHighlight.test.ts:252-296` |
| **triade/test-utils/helpers.ts + triade/src/utils/mulberry32.ts** | `rngOf` throw-on-exhaust + `spyRng` `calls` + `mulberry32` determinism + `stripCommentsAndStrings` are the trust seam for all parity/ladder scans; changing fallback `0.5` vs throw or `blankStrings` toggle would silently flip `ui.norolls`/`purity`/`wiring` pins | `engine.parity-hardening` + `ladder-ceiling-chain` + `engine.purity.test.ts` PURITY_ROOTS + `ui.norolls` + `app.restart` + `GameE2ETestFixture` |
| **triade/src/ui/GameOverOverlay.tsx + triade/App.tsx** | `GameOverOverlay` thin-view `stats.maxTile` + `isNewRecord` boolean vs `App` ladder derivation `availablePot = potForTier(tierForCeiling(ceilingDetector(board))) live` — two separate invariants that must stay complementary (overlay never imports ladder, App always derives from `game.board` not `stats.maxTile`) | `ladder-ceiling-chain.atdd.test.ts:69 isNewRecord sessionStart` + `gameOverOverlay.recordHighlight.test.ts` thin-view + `App.tsx rg wiring` 1 hit |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (TECH/DATA/BUS/OPS categories, P×I 1-9, ≥6 HIGH demand mitigation, 9 BLOCK gate)
- `probability-impact.md` - Risk scoring methodology (P 1 unlikely / 2 possible / 3 likely × I 1 minor / 2 degraded / 3 critical → 1-9 PRODUCT not TIMED)
- `test-levels-framework.md` - Test level selection (Unit for pure `spawnTile/move/ceiling` host, no E2E/Skia device needed for this bundle)
- `test-priorities-matrix.md` - P0-P3 prioritization (P0 blocks core + HIGH risk + no workaround: spawn-nothing clone, shared-bug header, replay identical/diverge/20-move/ladder chain/wiring/isNewRecord; P1 high/medium/common; P2/P3 low/edge/exploratory)

### Related Documents

- PRD: n/a for sweep bundle (intent is `spec-engine-parity-hardening.md` plus ledger DW-25/26/34/103)
- Epic: sweep bundle (no Epic number; sprint board `epic-1/2/4/6 done`, `epic-8 backlog 8-1..8-6 done` already done via automation; this bundle is DW ledger hardening)
- Architecture: `triade/src/engine/core/index.ts` public re-exports + `triade/src/engine/core/types.ts` `Board/Grid/N/M PendingSpawn` contract (engine-never-throws, deterministic `Rng () => number`, `GRID_SIZE=4`)
- Tech Spec: `_bmad-output/implementation-artifacts/spec-engine-parity-hardening.md` (`baseline 398a06d`) + `triade/src/engine/core/spawn.ts:72-96` + `triade/src/engine/core/game.ts:41-105` + `triade/src/engine/core/ceiling.ts:5-50` + `triade/src/engine/core/pot.ts:6-9` + `triade/test-utils/helpers.ts:13-60`

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat — Master Test Architect, merged with Muse Spark)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6 — Epic-Level sweep bundle dw-engine-parity-hardening, deterministic single-worker)
