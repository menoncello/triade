# Automation Summary — Story 12.1

**Engine**: Custom TypeScript (framework-free engine) + React Native / Expo SDK 57 · `node:test` via `tsx` loader (Node ≥26)
**Story**: 12.1 — Spawn no lado oposto das linhas movidas (directional spawn placement)
**Tests Generated**: 49 (new) · **Total suite**: 396 pass / 0 fail (was 347)
**Date**: 2026-08-25
**Source of Truth**: `triade/src/engine/core/{line,spawn,game,types}.ts` — pure TS, single source of truth per Architecture ADR-06

## Scope of This Pass

Story 12.1 redefines post-move spawn placement from *uniformly random empty cell* (Epic 2 / story 2-6 AC2, superseded) to **directional**: after an effective move, the spawned tile appears only on the opposite edge of a line (row/column) that actually changed during the swipe (`left→col 3`, `right→col 0`, `up→row 3`, `down→row 0`). Change touches only engine internals (`line.ts:shiftLine` returns `moved`, `spawn.ts:spawnTile` accepts optional `candidates`, `game.ts:move` derives opposite-edge candidates) — no UI/runtime change beyond *where* the tile appears. Draw-budget contract preserved: effective move = 3 draws (cell among candidates, next pending value, displayRoll), `spawnTile` cell pick = 1 draw, noop = 0 draws.

This automation pass generates **49 new automated tests** that close the gaps left by the existing 11-test acceptance suite (`spawn-placement.test.ts`, tripwire in `adaptive-spawn-integration.test.ts`). Existing suites remain green and are not duplicated.

## Test Distribution

| Type | Count | Coverage |
|------|-------|----------|
| Unit — `line.moved` | 13 | `shiftLine` `moved` flag: packed vs shifted vs merged, 1-cell semantics, empty line, 1,1/2,2 no-merge, value-equality detection, table-driven parity (incl. gap-prevents-merge), purity, `from` tracking |
| Unit — `spawn candidates` | 12 | `spawnTile` candidates contract: omitted→all-empty uniform (1 draw), full-board 0 draws, provided→filtered to empties uniform (1 draw), occupied candidates never selected, empty pool/array → nulls 0 draws, single candidate deterministic, place-not-roll invariant, backward-compat omitted vs all-empties equivalence, `pickIndex` edge clamps |
| Integration — `move` directional | 13 | Per-direction placement via live `move()` pipeline (left/right/up/down), only-moved-lines eligible (horizontal + vertical), AC4 non-empty candidate guarantee, noop 0 draws, 3-draw budget (cell among candidates), statistical uniformity among candidates on live path, trace+`planTileTransitions`/`resultingTiles` consistency, `boardFromLines+spawnTile` equivalence to `move`, all-directions table |
| E2E — fixture pipeline | 5 | Infrastructure verification (`GameE2ETestFixture`, `ScenarioBuilder`, `InputSimulator`, `waitFor`), scenario chaining (seed + persisted best + queued swipes), stochastic session 120 moves via `swipeDirection`+`settle`+busy gate with opposite-edge invariant, per-direction contract over fixture, `waitFor` timeout message |
| Smoke — critical path | 6 | Game launches (4×4, 9 tiles, not game over), main menu hydrates (fixture ready), new game playable, 200-move loop with directional invariant, save/load round-trip via persistence gate (incl. degraded hydration blocks overwrite), 50-move 3-draw budget smoke |

**Infrastructure already present (verified, not overwritten):**

- `triade/test-utils/e2e/GameE2ETestFixture.ts` — launch/hydration, `doMove`→`move`, busy gate, `settle`, `syncPersistence`, `snapshot`, `teardown`
- `triade/test-utils/e2e/scenarioBuilder.ts` — fluent `withSeed`/`withPersistedBest`/`queueSwipe(s)`/`launch`
- `triade/test-utils/e2e/inputSimulator.ts` — `DIRECTION_GESTURES`, `gestureFor`, `swipe`/`swipeDirection` via `resolveSwipeDirection` + busy check
- `triade/test-utils/e2e/asyncAssertions.ts` — `tick`, `waitFor` (timeout+interval+message), `waitForEvent`
- `triade/test-utils/helpers.ts` — `boardWith`/`staticBoard`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`sigmaBound`/`runSeededSession`

## Files Created

- `triade/__tests__/engine/line-moved.unit.test.ts` (13 tests) — unit for T1 `shiftLine.moved`
- `triade/__tests__/engine/spawn-candidates.unit.test.ts` (12 tests) — unit for T2 `spawnTile(candidates)`
- `triade/__tests__/integration/directional-spawn.integration.test.ts` (13 tests) — integration for T3 `move` candidate derivation + render plan
- `triade/__tests__/e2e/directional-spawn.e2e.test.ts` (5 tests) — E2E via existing fixture/infra (Step 3.5)
- `triade/__tests__/smoke/directional-spawn.smoke.test.ts` (6 tests) — smoke for critical path (Step 4)

**Modified (no production code):** none — engine at `src/engine/core/{line,spawn,game}.ts` already implements T1–T3 and stays byte-identical through this pass.

**Existing coverage (unchanged, still green):**

- `triade/__tests__/engine/spawn-placement.test.ts` (11 tests, story 12.1 acceptance, AC1–AC6 + 5σ uniformity)
- `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (rewritten Epic 12 tripwire + 2.6 integration, 5000-seed drift)
- `triade/__tests__/engine/game.test.ts`, `line.test.ts`, `spawn.test.ts`, `weights.test.ts`, etc. (347 baseline)

## Execution

```bash
cd triade
npm test
# → 396 pass / 0 fail / 0 skip (~3.0s)
# per-suite:
#   line-moved.unit              13 pass
#   spawn-candidates.unit        12 pass
#   directional-spawn.integration 13 pass
#   directional-spawn.e2e         5 pass
#   directional-spawn.smoke       6 pass
```

## Story 12.1 Acceptance Criteria Coverage

| AC | Criterion | Coverage |
|----|-----------|----------|
| AC1 | Directional placement (left→col3, right→col0, up→row3, down→row0) | FULL — unit moved + integration per-direction (4 dirs) + e2e stochastic + smoke 200-move loop |
| AC2 | Only moved lines eligible; unchanged line never spawns | FULL — spawn-candidates unit (filter), integration AC2 horizontal+vertical, e2e opposite-edge checks |
| AC3 | Uniform among candidates, exactly 1 rng draw for cell pick | FULL — spawn-candidates statistical (6000 draws, 3-way), integration statistical (6000, 2-way), draw-budget spy (3 draws) |
| AC4 | No fallback needed: effective→non-empty candidates, noop→no spawn 0 draws | FULL — integration AC4 table (4 dirs), spawn-candidates empty-pool 0-draw, smoke noop |
| AC5 | Value + preview unchanged, `spawnTile(candidates?)` backward compat, provided-but-empty→nulls 0 draws | FULL — spawn-candidates omitted vs provided, empty-pool guard, place-not-roll invariant |
| AC6 | `move` shape unchanged `{board,score,moved,trace,pendingSpawn}`, spawn in trace `spawned:true` | FULL — integration trace+render plan, smoke shape checks |
| AC7 | Tests updated: tripwire rewritten + `spawn-placement.test.ts` | FULL — pre-existing acceptance suite (11 tests) stays green; this pass adds 49 complementary tests without duplicating AC7 |

## Validation Checklist

- [x] Test framework initialized (`node:test` via `tsx`, project-mandated `npm test` at `triade/`)
- [x] Engine detected — custom TS (not Unity/Unreal/Godot), `triade/src/engine/core/*`, `GRID_SIZE=4`
- [x] Source code accessible — `line.ts:38` `shiftLine` returns `{line,score,moved}`, `spawn.ts:65` `spawnTile` with `candidates?`, `game.ts:31` `move` derives `oppCol`/`oppRow` from `shifted[i].moved`
- [x] Existing tests located + patterns understood — `boardWith`/`gameState`/`rngOf`/`spyRng`/`mulberry32`, `[P0] ACn` naming, AAA, deterministic boards
- [x] Coverage gaps identified — `line.test.ts` never asserted `moved`; `spawn.test.ts` never exercised candidates; integration/e2e/smoke never pinned opposite-edge invariant
- [x] Tests follow engine conventions — pure logic, no RN/Expo imports in engine tests, `assert` with messages, `node:test`
- [x] Arrange-Act-Assert pattern used — every test has explicit Arrange (board via helper), Act (`shiftLine`/`spawnTile`/`move`/`fixture.input.swipeDirection`), Assert (deepStrictEqual + messages)
- [x] Setup/teardown implemented — `GameE2ETestFixture.launch`/`teardown`, `fixture.settle` to reopen busy gate, `setStorageBackendForTests(null)` isolation, no shared state
- [x] Parameterized tests where appropriate — table-driven `moved` parity (10 shapes), all-directions table (4 dirs), statistical loops
- [x] No external dependencies — only `node:test`, `node:assert`, engine core, `test-utils/helpers` + `test-utils/e2e/*`
- [x] Tests are deterministic — `rngOf`/`spyRng` scripted draws + `mulberry32(seed)` seeded RNG, no `Math.random` in assertions
- [x] Scene/level integration tested — `move` + `boardFromLines` + `planTileTransitions` + `resultingTiles` + fixture pipeline
- [x] Async handling correct — `await waitFor(...,{timeout, message})`, `await fixture.syncPersistence()`, `async teardown`
- [x] Cleanup prevents leaks — `try/finally` `teardown` in every e2e/smoke fixture test, `board.map(r=>r.slice())` copies
- [x] Tests run independently — each test builds its own board/fixture/rng, no order dependency, `grep test.skip` is 0
- [x] Critical path covered — launch, main menu (hydration), new game (9 tiles), core loop (200 moves), save/load (persistence gate)
- [x] Tests complete quickly — full suite 396 in ~3.0s, each new suite <200ms, smoke <150ms
- [x] Tests compile without errors — `npm test` exit 0, `tsc --noEmit` clean (no new type errors)
- [x] Assertions have messages — every `assert.*` includes a descriptive third arg where the condition is non-obvious
- [x] Test names are descriptive — `[P0]/[P1] ACn` + `integration/e2e/smoke:` + story 12.1 phrasing
- [x] Files placed in correct directories — `__tests__/engine/*.unit.test.ts`, `__tests__/integration/*.test.ts`, `__tests__/e2e/*.e2e.test.ts`, `__tests__/smoke/*.smoke.test.ts`
- [x] Naming conventions followed — `*.unit.test.ts`, `*.integration.test.ts`, `*.e2e.test.ts`, `*.smoke.test.ts`
- [x] Engine-specific syntax correct — `import { test } from 'node:test'`, `import assert from 'node:assert'`, `*.ts` extension imports (allowImportingTsExtensions)
- [x] Automation summary created — this file
- [x] Tests pass initial run — 49/49 new pass, 396/396 total pass

## Next Steps

1. Review generated tests — the 49 new suites are complementary to the 11-test acceptance suite; keep both.
2. Fill in any story-specific logic where placeholders were left — none; all assertions are concrete and green.
3. Run tests to verify — `cd triade && npm test` (already 396/396).
4. Add to CI pipeline — `npm test` is already the CI gate (`triade/package.json` `test` script `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`); no further wiring.

## Anti-Patterns Avoided

- No engine functionality tests (only game logic: `moved`, `candidates`, directional placement).
- No hard-coded waits as primary sync — `waitFor` with predicate + `settle` via busy gate; smoke `waitFor(() => occupiedCount>0)`.
- No order-dependent suites — each test constructs its own board/rng/fixture.
- No missing teardown — every fixture test has `try/finally` `teardown` and storage reset.

## Completion Criteria

- [x] All requested tests generated — Unit (25) + Integration (13) + E2E (5) + Smoke (6) = 49
- [x] Tests pass initial run — 396/396 pass, 0 fail, 0 skip
- [x] No orphan objects after tests — fixtures torn down, boards copied, storage backend reset
- [x] Summary report created — `triade/_bmad-output/automation-summary-12-1.md` (this file)

---
**Completed by:** Muse Spark (Opencode)
**Date:** 2026-08-25
**Tests Generated:** 49
