## Automation Summary

**Engine**: Custom (TypeScript, `node:test`, Node 26 native TS type-stripping)
**Story**: 1.2 — Port completo do engine de regras para TypeScript
**Tests Verified**: 57 (31 unit + 9 parity + 8 matchScore + 1 suite-parity + 4 smoke + 2 purity + 2 benchmark)
**Date**: 2026-08-10

### Test Distribution

| Type          | Count | Coverage      |
| ------------- | ----- | ------------- |
| Unit Tests    | 31    | Engine I/O matrix (merge, one-cell, noop, game-over, spawn, trace) |
| Parity        | 9     | Differential vs `js/game.js` — identical `{ board, score, moved, trace }` |
| Suite Parity  | 1     | Name-drift guard: every web test name exists in the TS ported suite |
| Integration   | 8     | `matchScore` — score/best orchestrator state |
| Smoke Tests   | 4     | Critical path: launch, 500-move loop, game-over detection |
| Purity        | 2     | ADR-01 boundary: `src/engine` + `src/game` import nothing from RN/React/Skia/Expo |
| Benchmarks    | 2     | Performance gates: engine < 0.1ms/turn, frame-logic p99 < 0.2ms |

### Story 1.2 Acceptance Criteria Coverage

| AC | Criterion | Coverage |
| -- | --------- | -------- |
| 1  | Fresh board opens with exactly 9 starting tiles | FULL — `game.test.ts` newGame 9-tile + parity newGame |
| 2  | Merge predicate `(a===1&&b===2)||(b===1&&a===2)||(a>=3&&a===b)`; value `a<=2?3:a*2`; `1+1`/`2+2` never merge | FULL — `game.test.ts` MERGE_1_2 / NO_1_1 / NO_2_2 + parity predicate matrix |
| 3  | One-cell movement + merge-once (`[3,3,3,3]→[6,3,3,_]`, `[1,2,3,_]→[3,3,_,_]`) | FULL — `game.test.ts` EQUAL_GE3, NEW_TILE_NOT_REMERGED, ONE_CELL x4 + parity scenarios |
| 4  | Spawn only after effective move; noop spawns/scores/turns nothing; weights 40/40/20 | FULL — `game.test.ts` NOOP_SWIPE, spawn-once, weightedValue + parity |
| 5  | `move()` returns `{board, score, moved, trace}`; trace exact; `isGameOver` reuses same predicate | FULL — trace tests + parity trace/isGameOver |
| 6  | Score increments by merged tile value; best-score tracked in-memory | FULL — `matchScore.test.ts` (8) + score assertions in `game.test.ts` |
| 7  | All 26 existing tests pass against the ported engine | FULL — 31 tests in `game.test.ts` (26 ported + 5 new), web suite 26/26 green |

### Files Created / Modified (story 1.2)

- `triade/__tests__/engine/engine.parity.test.ts` (NEW) — differential parity suite vs `js/game.js` (9 tests)
- `triade/__tests__/engine/engine.suite-parity.test.ts` (NEW) — name-drift guard: web test names ⊆ TS suite (1 test)
- `triade/src/game/matchScore.ts` (NEW) — pure score/best orchestrator state
- `triade/__tests__/game/matchScore.test.ts` (NEW) — score/best unit tests (8 tests)
- `triade/__tests__/engine/engine.purity.test.ts` (modified) — ADR-01 scan extended to `src/game`

### Validation Checklist

- [x] Test framework initialized (`node --test`, Node 26)
- [x] Engine detected (custom TS, ADR-01 pure — no RN/React/Skia imports)
- [x] Testable systems identified (rules, line, spawn, game, board, score state)
- [x] Existing tests located (31 ported + smoke + benchmark)
- [x] Coverage gaps identified (none for story 1.2 — all 7 ACs FULL)
- [x] Tests deterministic (injectable `rng` / seeded `mulberry32`, no `Math.random`)
- [x] Parity suite asserts EXACT trace (`to`/`from`/`spawned`/`value`), not just final board
- [x] Both engines fed identical deterministic `rng` (seeded `mulberry32`)
- [x] Arrange-Act-Assert pattern used
- [x] `tsc --noEmit` clean; 57/57 triade tests + 26/26 web tests pass
- [x] Web PWA frozen: `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` untouched
- [x] CI gate (`ci.yml`) runs `tsc --noEmit` + `node --test` in `triade/` + web-suite job

### Next Steps

1. Review the parity + matchScore suites (done — 57/57 green)
2. Story 1.2 is **done** (code review passed, patches applied) — merge `feature/1-2-port-completo-do-engine-de-regras-para-typescript`
3. Score/best persistence ships in story 1.4 (AsyncStorage/MMKV)
4. Skia board rendering (story 1.3) — device frame-rate validation remains manual
