# Test Review Report: 3-clone / Tríade

**Review Date**: 2026-08-10
**Reviewer**: gds-test-review (Game QA Lead)
**Scope**: Story 1.2 — Full rules-engine port to TypeScript (parity + score/best state)
**Period Covered**: 2026-08-09 to 2026-08-10

---

## Executive Summary

### Overall Health: Good

### Key Findings

1. **All 83 tests green and fully deterministic** — web PWA `test/game.test.js` (26) + triade suite (57: engine 31 + parity 9 + matchScore 8 + suite-parity 1 + smoke 4 + purity 2 + benchmark 2). Zero flaky (3 consecutive runs), zero disabled, zero `Math.random` in tests. `npx tsc --noEmit` clean.
2. **The parity suite is the right tool for a port.** `engine.parity.test.ts` loads the frozen `js/game.js` via `createRequire` and runs the same seeded scenario matrix through both engines, asserting **exact** `{ board, score, moved, trace }` equality — including trace `from`/`to`/`spawned`, and identical rng roll counts. The story's core risk (behavioral drift from `js/game.js`) is directly, measurably closed.
3. **`matchScore` is small, pure, and well-isolated.** 7 tests cover accumulation, best-tracking across a record pass, noop-adds-nothing, record transitions, and the API surface (asserts the module does *not* leak engine state). ADR-01 purity scan now covers `src/game` alongside `src/engine`.
4. **All six story-1.2 ACs map to executable coverage** (9-tile init, merge predicate incl. 1+1/2+2 non-merges, merge-once/one-cell, spawn-after-effective-move + 40/40/20, exact trace contract, score/best in-memory). AC-7 (26 web tests unchanged) verified: `test/game.test.js` untouched and green.
5. **Residual minor items**: parity has an inherent "shared-bug" blind spot (mitigated by absolute-assertion unit tests); benchmark gates still ~100× above measured baseline.

### Recommended Actions

1. Add one parity negative scenario for a bug class the two engines share, or explicitly document the shared-bug limitation in the parity file header so future readers don't over-trust it.
2. When the app-storage story lands (1.4), ensure `matchScore` gains persistence-backed tests — until then the in-memory contract is fully covered.

> Post-review note: the unused `dirname` import flagged below was removed in this diff, and `--experimental-test-coverage` shipped as an informational CI step (`ci.yml`).

### Action Status (from 1.1 review — all closed)

| # | Action | Status |
| - | ------ | ------ |
| 1 | `down` unit tests (board + trace) | ✅ Done — 3 added in `game.test.ts` + 2 down parity scenarios |
| 2 | Fix tautological smoke assertion | ✅ Done — `engine.smoke.test.ts:42` asserts `typeof res.score === 'number'` |
| 3 | `spawnTile` full-board + `pickIndex` clamp tests | ✅ Done — 2 tests |
| 4 | Recalibrate benchmark budgets | ✅ Done — 0.1 ms / 0.2 ms |
| 5 | Repo-root CI job for web suite | ✅ Done — `web-pwa-engine-test` job |
| 6 | Coverage tooling (`--experimental-test-coverage`) | ✅ Done — informational step in `ci.yml` |

---

## Test Suite Metrics

### Test Distribution

| Type                 | Count | % of Total |
| -------------------- | ----- | ---------- |
| Unit Tests           | 77    | 92.8%      |
| Integration Tests    | 0     | 0%         |
| Play Mode/Functional | 4     | 4.8%       |
| Performance Tests    | 2     | 2.4%       |
| **Total**            | 83    | 100%       |

Breakdown:
- `test/game.test.js` (web, legacy) — 26 unit
- `triade/__tests__/engine/game.test.ts` (TS port) — 31 unit (26 ported + 3 `down` + 1 `spawnTile` full-board + 1 `pickIndex` clamps)
- `triade/__tests__/engine/engine.parity.test.ts` (NEW, story 1.2) — 9 differential parity vs `js/game.js`
- `triade/__tests__/engine/engine.suite-parity.test.ts` (NEW, story 1.2) — 1 name-drift guard (web names ⊆ TS suite)
- `triade/__tests__/game/matchScore.test.ts` (NEW, story 1.2) — 8 score/best unit
- `triade/__tests__/engine/engine.smoke.test.ts` — 4 smoke
- `triade/__tests__/engine/engine.purity.test.ts` — 2 (extended to `src/game`, story 1.2)
- `triade/benchmarks/engine.bench.test.ts` — 2 performance gates

> Integration/functional/play-mode are N/A by design — the engine is pure logic and rendering is manually validated on device (story 1.3 scope).

### Execution Metrics

| Metric         | Current      | Previous (1.1) | Trend |
| -------------- | ------------ | -------------- | ----- |
| Pass Rate      | 100% (83/83) | 100% (63/63)   | →     |
| Avg Duration   | ~1.6 s (triade) | ~206 ms      | ↑ (benchmark sample count) |
| Flaky Tests    | 0 (3 runs)   | 0              | →     |
| Disabled Tests | 0            | 0              | →     |

### Recent Run History

| Date       | Passed | Failed | Skipped | Duration |
| ---------- | ------ | ------ | ------- | -------- |
| 2026-08-10 | 83     | 0      | 0       | ~1.6 s (root: 26 web + 57 triade) |
| 2026-08-10 | 57     | 0      | 0       | ~1.6 s (triade only) |
| 2026-08-10 | 26     | 0      | 0       | web only (`node --test test/game.test.js`) |

Verification: `node --test` at repo root (83/83) and in `triade/` (57/57), Node v26.0.0, 3 consecutive green runs (flakiness check). `npx tsc --noEmit` clean.

---

## Quality Assessment

### Strengths

- **Differential parity testing.** The single best property for a port: both engines fed the same seeded `mulberry32` stream, asserting exact `{ board, score, moved, trace }` deep-equality plus identical rng roll counts (`engine.parity.test.ts:169`). The trace (render contract) is asserted field-by-field (`from`/`to`/`spawned`), not just the final board.
- **Full determinism.** No `Math.random` anywhere in tests; all randomness flows through injected `rng`/`mulberry32`. Strongest possible property for a random-mechanic engine.
- **Pure, leak-free orchestration state.** `matchScore` imports only engine types; its tests assert the module does not expose `moved`/`trace` (`matchScore.test.ts:62-63`) — boundary hygiene verified by the extended ADR-01 purity scan.
- **Behavioral, not implementation-coupled.** Tests assert board + trace outcomes and public helpers, not private internals.
- **Excellent speed.** Sub-ms per unit test; the ~1.6 s total is dominated by the 2 benchmark gates (10k samples each), which are deterministic (fixed seed, median/p99) — no wall-clock flake.
- **CI protects both surfaces.** `engine-test-and-benchmark` (triade: tsc + node --test) and `web-pwa-engine-test` (root: `node --test test/game.test.js`) both block on failure.
- **Story discipline.** Web PWA files frozen (`js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js`) — confirmed untouched via `git status`; only tests + `matchScore` added.

### Issues Found

| Issue                                 | Severity | Count | Example | Recommended Fix |
| ------------------------------------- | -------- | ----- | ------- | --------------- |
| Parity shared-bug blind spot          | Low      | n/a   | if both engines share a bug, parity passes | Document limitation in file header; rely on absolute-assertion unit tests (already present) |
| Benchmark budgets still ~100× baseline | Medium   | 2     | engine ~0.001 ms vs 0.1 ms budget | Acceptable as guard; re-check when rendering lands |
| Duplicate suites (web vs TS)          | Medium   | 26    | two 26-test sources of truth | Parity check / sync script, or formal web deprecation |

### Anti-Patterns Detected

| Pattern                 | Occurrences | Impact | Fix Effort |
| ----------------------- | ----------- | ------ | ---------- |
| Duplicate test body     | 26          | Medium | Low (by design — port) |

---

## Coverage Analysis

### Feature Coverage Matrix

| Feature                      | P0 Tests | P1 Tests | P2 Tests | Gap? |
| ---------------------------- | -------- | -------- | -------- | ---- |
| Core Loop (move/spawn/score) | 26       | 8 (parity) | 2 (perf) | No |
| Merge rules (predicate, no 1+1/2+2) | 8 + parity matrix | — | — | No |
| Movement (one-cell, all 4 dirs) | 7 (incl. 3 down) | 2 down parity | — | **No** (down gap closed) |
| Spawn (weights/once/uniform/full-board) | 6 + parity | — | — | No |
| Game Over detection         | 6 + 5 parity | —        | — | No |
| Trace contract              | 3 + 1 parity (exact) | — | — | No |
| New Game init               | 2 + 1 parity | —        | — | No |
| Score/Best state (matchScore) | 7 (NEW) | — | — | No |
| ADR-01 purity (`src/game`)  | 2        | —        | — | No (extended) |
| UI / Skia board             | 0        | 0        | 0 | **Yes — manual only** (story 1.3) |
| Save/Load                   | 0        | 0        | 0 | Yes — story 1.4 |
| Multiplayer / Audio / Platform | n/a    | n/a      | n/a | Not in scope |

### Story 1.2 AC → Test Map

| AC | Requirement | Verification |
| -- | ----------- | ------------ |
| 1  | Fresh board = exactly 9 tiles | `newGame` unit + parity newGame (3 seeds) |
| 2  | Merge predicate, 1+1/2+2 never merge | `canMerge`/`mergeValue` unit + parity matrix |
| 3  | Merge-once / one-cell per swipe | unit `[3,3,3,3]→[6,3,3,_]`, `[1,2,3,_]→[3,3,_,_]` + parity |
| 4  | Spawn only after effective move; 40/40/20 | spawn-once unit + parity rng-count; weightedValue boundaries |
| 5  | `move()` → `{board,score,moved,trace}`; `isGameOver` same predicate | parity trace EXACT + isGameOver parity |
| 6  | Score by merged value; best in-memory | matchScore suite (7) |
| 7  | 26 existing web tests pass unchanged | `test/game.test.js` untouched, 26/26 green |

### Critical Gaps

| Gap                  | Risk         | Impact                | Priority to Fix |
| -------------------- | ------------ | --------------------- | --------------- |
| UI/rendering coverage| Medium       | Skia board manual-only until story 1.3 | P2 (next story) |
| Coverage % signal    | Low          | drift invisible over time | P3 (deferred) |
| Shared-bug parity blind spot | Low | both engines wrong in lockstep | P3 (document) |

### Coverage by Priority

```
P0 Coverage: 100% ██████████
P1 Coverage: 100% ██████████   (all engine I/O matrix + score/best)
P2 Coverage:  60% ██████░░░░   (UI board is the gap)
P3 Coverage:  40% ████░░░░░░
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect            | Status  | Notes |
| ----------------- | ------- | ----- |
| Tests in CI       | ✅      | triade suite + web PWA suite both in `.github/workflows/ci.yml` |
| Results visible   | ✅      | GitHub Actions |
| Failures block    | ✅      | jobs fail on test/benchmark/typecheck failure |
| Nightly runs      | ❌      | N/A — no scheduled device job yet |
| Performance tests | ✅      | 2 budget gates, deterministic (0.1 ms / 0.2 ms) |
| Typecheck         | ✅      | `npx tsc --noEmit` in CI |

### Test Infrastructure Quality

| Component      | Quality          | Notes |
| -------------- | ---------------- | ----- |
| Fixtures       | Good             | shared helpers (`emptyBoard`, `rngOf`, `staticBoard`, `boardWith`, `mulberry32`) |
| Helpers        | Good             | `test-utils/helpers.ts` reused across unit + parity + smoke + benchmark |
| Data factories | Good             | `boardWith`/`staticBoard`/`rowBoard` cover the I/O matrix |
| Documentation  | Good             | story file documents parity rng discipline + test standards; deferred-work ledger preserved |

### Maintenance Burden

- Test update frequency: **low** (engine frozen; web PWA untouched)
- Brittleness score: **low** (fully deterministic)
- Developer friction: **low** (`node --test` bare, zero-dep)

---

## Recommendations

### Immediate (This Sprint — story 1.2 in review)

| Action                                    | Effort | Impact | Owner |
| ----------------------------------------- | ------ | ------ | ----- |
| Add a header comment on `engine.parity.test.ts` stating the shared-bug limitation + that unit tests are the absolute oracle | 15m | Low | Dev |

### Short-term (This Milestone)

| Action                        | Effort | Impact | Notes |
| ----------------------------- | ------ | ------ | ----- |
| Add a parity check that `game.test.js` and `game.test.ts` keep the same 26 names | 1h | Medium | Prevents silent suite drift |
| Re-verify benchmark budgets when rendering lands (story 1.3) | 1h | Medium | Real frame budget is on-device |

> `--experimental-test-coverage` shipped as an informational CI step in this diff (`ci.yml`) — recommendation closed.

### Long-term (Ongoing)

| Action                        | Effort  | Impact | Notes |
| ----------------------------- | ------- | ------ | ----- |
| Add persistence-backed score/best tests with story 1.4 | 1 day | Medium | `matchScore` contract stays in-memory until then |
| Formalize web-PWA test deprecation or keep both suites in CI | 1 day | High | Product of record is the RN app |
| Component test for `GameBoard` when UI exists (story 1.3+) | 1-3 days | Medium | Currently manual-only, documented |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --------- | ------------ | --------------- | ------------ |
| (none)    | 0% (3/3 runs green) | — | — |

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --------- | -------- | ---- | ------ |
| benchmark: engine cost per turn < 0.1ms | ~58 ms | perf | ✅ deterministic, keep |
| benchmark: frame-logic tail p99 < 0.2ms | ~36 ms | perf | ✅ deterministic, keep |
| (all other tests) | < 4 ms each | unit | — |

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --------- | -------------- | ------ | ------ |
| (none)    | —              | —      | —      |

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| ---- | ----------- | ------ | -------- |
| Parity shared-bug blind spot | both engines in lockstep undetected | 15m (docs) | Low |
| Duplicate suites | web/TS 1:1 copy | ongoing | Medium |
| Device-level benchmark | p99 < 16.7 ms on physical device | 1-3 days | Blocked (no iPhone) |

---

## Next Review

**Scheduled**: After story 1.3 (first UI/rendering work) or the next milestone, whichever is first.
**Focus Areas**: UI/Skia component coverage, benchmark budgets vs real frame budget, coverage % trend, persistence-backed score/best tests.
**Success Criteria**: parity + matchScore stay green; story 1.3 introduces rendering tests; coverage report present in CI artifacts.
