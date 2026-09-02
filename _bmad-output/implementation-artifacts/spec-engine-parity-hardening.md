---
title: 'engine-parity-hardening: spawn-nothing, blind-spot doc, multi-move differential, and ladder-ceiling chain pin'
type: 'refactor'
created: '2026-09-02T08:20:00'
status: 'done'
baseline_revision: '398a06db1a91e3dd8c68b8468c5490239452a816'
final_revision: '73f1b733704d1078256ecee4d4b6d58837e1e9ca'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Engine parity coverage only cross-checks single-move TS===web paths and `spawnTile` non-full branch, leaving the spawn-nothing full-board branch parity-unchecked, a shared-bug blind spot undocumented, sequence-level divergences invisible, and the ladder ceiling `ceilingDetector→tierForCeiling→potForTier` chain only thin-view pinned via `stats.maxTile`.

**Approach:** Harden within `triade/__tests__` parity suites: add a full-board spawn-nothing parity branch, document the TS===web shared-bug limitation with absolute-oracle mitigation, add a seeded multi-move/full-game differential suite, and add an end-to-end ladder-ceiling tier-chain pin beyond the overlay prop, without touching `deferred-work.md` or engine source beyond docs.

## Boundaries & Constraints

**Always:** Keep engine source unchanged except docs/comments; keep existing `game.test.ts:198` absolute full-board test green; use deterministic `mulberry32`/`rngOf`/`spyRng` only, no `Math.random`; preserve thin-view overlay contract (overlay only reads `stats.maxTile`/`isNewRecord` prop, ladder lives in `App.tsx`/`src/game`/`src/engine`).

**Block If:** Would need to reintroduce `js/game.js` web PWA, change store schema, modify `deferred-work.md` ledger, or change `Board`/`GameState`/`PendingSpawn` public types.

**Never:** Edit `_bmad-output/implementation-artifacts/deferred-work.md`; change spawn weights/distribution or GRID_SIZE; add new production dependencies; mutate input boards in tests; use `Math.random` in parity suites.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| spawn-nothing full-board parity | board fully occupied 4x4, any value/rng, candidates omitted and provided-empty | `spawnTile` returns `{board: clone!=input, cell:null, value:null}`, 0 draws, board unchanged vs pre-call snapshot on both TS and reference path | No throw; clone identity checked |
| spawn-nothing with candidates | full board + candidates `[[0,0]]` occupied or `[]` | same as above, 0 draws | Guard: pool empty → nulls |
| shared-bug blind spot doc | 13 parity move scenarios TS===web only | header comment states limitation and mitigation via `game.test.ts` absolute suite | Docs only |
| multi-move differential | seed S, move sequence `['left','up','right','down']*k` from `newGame(S)` | two independent replays with same seed+sequence produce identical `{board,score,pendingSpawn,trace}` and cumulative score; single-run snapshot pinned | No error; deterministic spyRng budget validated (effective=3, noop=0) |
| full-game seeded run | `newGame(42)` then 20 seeded moves | final board/score deterministic across replays, no throw | Engine-never-throws |
| ladder chain e2e | board ceilings `[0,3,48,96,192,384,768,1536]` | `ceilingDetector(board)→tierForCeiling→potForTier` equals `potForTier(tierForCeiling(ceilingDetector(board)))` and matches App `availablePot` pipeline; `isNewRecord` uses sessionStartBest not `match.best` | No throw; thin-view overlay still only reads `stats.maxTile` |

</intent-contract>

## Code Map

- `triade/__tests__/engine/game.test.ts:198` -- existing absolute `spawnTile` full-board nulls test (oracle for DW-25, stays green)
- `triade/src/engine/core/spawn.ts:72-96` -- `spawnTile` implementation with full-board early return (0 draws, clone) to be parity-pinned
- `triade/src/engine/core/game.ts:41-105` -- `move` directional candidates + 3-draw budget and spawn path; multi-move suite exercises this pipeline
- `triade/src/engine/core/ceiling.ts:23-52` -- `ceilingDetector` + `tierForCeiling` ladder, input to chain
- `triade/src/engine/core/pot.ts:6-9` -- `potForTier` clamped ladder terminus
- `triade/src/engine/config/spawnConfig.ts` -- `FIXED_WEIGHTS`/`POT_WEIGHT` used by pot chain
- `triade/src/game/matchStats.ts:1-36` -- `initialStats`/`applyMoveStats` using `ceilingDetector`; `stats.maxTile` is thin-view prop
- `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts:252-296` -- existing ceiling ladder thin-view test (varies only `stats.maxTile` prop, correctly thin-view per spec); DW-103 needs chain beyond it
- `triade/test-utils/helpers.ts:13-60` -- `rngOf`/`spyRng`/`mulberry32`/`boardWith`/`gameState` deterministic helpers
- `triade/src/engine/core/index.ts` -- public re-exports for test wiring

## Tasks & Acceptance

**Execution:**
- [x] `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` -- create parity-hardening suite: header comment documents TS===web shared-bug blind spot + mitigation via `game.test.ts` absolute oracle (DW-26); add spawn-nothing full-board parity branch (omitted candidates, provided-empty, occupied pool) asserting clone!==input, nulls, 0 draws, board unchanged (DW-25); add seeded multi-move/full-game differential suite (seeded `newGame` + repeated `move` sequences, replay determinism, cumulative score accumulation) (DW-34)
- [x] `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` -- create end-to-end ladder-ceiling chain pin: assert `ceilingDetector→tierForCeiling→potForTier` chain end-to-end for ceilings `[0,3,12,48,96,192,384,768,1536,3072]` matches `potForTier(tierForCeiling(ceilingDetector(board)))` and equals App's `availablePot = potForTier(tierForCeiling(ceilingDetector(board)))` pipeline; plus `isNewRecord` sessionStartBest gating vs `match.best` alias leak (DW-103) keeping overlay thin-view
- [x] `triade/__tests__/engine/game.test.ts` -- add header limitation doc comment if not already present referencing parity blind spot (or keep existing absolute oracle comment), and ensure full-board spawn test at :198 remains green (no code change if already documented)

**Acceptance Criteria:**
- Given a fully occupied 4x4 board, when `spawnTile(board,value,rng)` and `spawnTile(board,value,rng,candidates)` are called with omitted/provided-empty/occupied pool, then each returns `{cell:null,value:null}`, consumes 0 rng draws, returns board clone !== input and board deepEquals input, pinned in parity-hardening suite
- Given header at top of `engine.parity-hardening.atdd.test.ts`, when read, then it documents shared-bug blind spot (TS===web passes if both share bug) and mitigation via `game.test.ts` absolute oracle
- Given seed 42 and move sequence `['left','up','right','down']*5` from `newGame(seed)`, when replayed twice independently with same rng stream, then boards/scores/pendingSpawn/traces are identical and cumulative score is deterministic; full-game 20-move run produces same snapshot on replay
- Given boards with known maxTile ceilings `[0,48,96,192,384,768,1536]`, when `ceilingDetector→tierForCeiling→potForTier` chain is computed, then `potForTier(tierForCeiling(ceilingDetector(board)))` equals tiered expected `[1],[1,6],[1,6,12],…` per `spawnConfig`, matching App's `availablePot` derivation, and `isNewRecord(sessionStartBest, score)` is true iff score>sessionStartBest (0,0→false, 0,1→true, stored 100 vs 150/100 cases)
- Given existing suites, when `npm --prefix triade test` runs, then all suites including new hardening pass and `game.test.ts:198` still passes

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2: (low 2)
- addressed_findings:
  - none

Notes: Blind Hunter: no intent gap — harden matches I/O matrix without resurrecting js/game.js; shared-bug doc + absolute oracle sufficient. Edge Case Hunter: noted rngOf throw-on-exhaust correctly pins 0-draw noop, spyRng clone hygiene covered; ladder chain board max 0 vs null edge handled. No patch/defer required; 897/11 baseline preserved (+15 new passes).

## Design Notes

Parity previously relied on `js/game.js` UMD reference but that PWA was removed (`e500e21`); hardening now uses TS self-differential determinism for sequence level plus absolute assertions as oracle, preserving intent without resurrecting deleted `js/`. Spawn-nothing branch is unreachable via `move()` (effective move always frees a cell) but still contract-relevant for direct `spawnTile` callers and must be parity-pinned. Ladder chain pin is `engine.purity`/`preview-invariant` level, not overlay responsibility — overlay stays thin-view (`stats.maxTile` prop only).

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` -- expected: pass (header doc, spawn-nothing 0-draw, multi-move determinism)
- `npm --prefix triade test -- __tests__/game/ladder-ceiling-chain.atdd.test.ts` -- expected: pass (chain mapping, availablePot pipeline, isNewRecord gating)
- `npm --prefix triade test -- __tests__/engine/game.test.ts` -- expected: pass (full-board spawn still green)
- `npm --prefix triade test` -- expected: all pass, no `Math.random` in new suites (ui.norolls equivalent)
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` -- expected: no errors
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` -- expected: no errors

## Auto Run Result

Status: done

Summary: Hardened engine parity per DW-25/26/34/103: added spawn-nothing full-board branch (0 draws, clone, occupied/[] pools), documented shared-bug blind spot with absolute oracle, added seeded multi-move/full-game differential (replay determinism + cumulative score), and pinned end-to-end `ceilingDetector→tierForCeiling→potForTier` chain plus `isNewRecord(sessionStartBest)` gating beyond thin-view `stats.maxTile`.

Files changed:
- `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` -- new parity-hardening suite (DW-25/26/34)
- `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` -- new ladder-ceiling chain e2e pin (DW-103)
- `triade/__tests__/engine/game.test.ts:1` -- header doc for shared-bug blind spot mitigation
- `_bmad-output/implementation-artifacts/spec-engine-parity-hardening.md` -- spec for bundle

Review findings breakdown: patches applied 0, items deferred 0, items rejected 2 low (pre-existing expected REDs unrelated)

Follow-up review recommended: false — 15 new tests, all low-severity hardening, 897/11 same fail baseline, tsc clean

Verification performed:
- `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` pass (10 tests: DW-25 5, DW-34 5)
- `npm --prefix triade test -- __tests__/game/ladder-ceiling-chain.atdd.test.ts` pass (5 tests: chain, App wiring, isNewRecord, celebration, matchStats)
- `npm --prefix triade test -- __tests__/engine/game.test.ts` pass (32 tests)
- `npm --prefix triade test` pass 897/fail 11 (same expected RED baseline, +15)
- `tsc --noEmit` (triade/tsconfig.json, tsconfig.test.json) clean

Residual risks: `js/game.js` web PWA remains removed (`e500e21`) so differential is TS self-replay determinism, not TS===web cross-check; absolute oracle `game.test.ts` remains mitigation. Ladder chain max 0 vs empty board edge handled; pot caps at tier 30.
