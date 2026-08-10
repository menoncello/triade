# Test Review Report: 3-clone / Tríade

**Review Date**: 2026-08-09
**Reviewer**: gds-test-review (Game QA Lead)
**Scope**: Story 1.1 — Technical spike (engine TS + board Skia + benchmark CI)
**Period Covered**: 2026-08-06 to 2026-08-09

---

## Executive Summary

### Overall Health: Good

### Key Findings

1. **All 58 tests green and fully deterministic.** Root web suite (`test/game.test.js`, 26) + triade suite (`game.test.ts` 26 + smoke 4 + benchmark 2) pass in ~206 ms. Zero flaky, zero disabled, zero `Math.random` in tests — every random path is injectable `rng`/`mulberry32`.
2. **The `down` direction has no explicit unit test.** Both suites test `left`/`right`/`up` directly; `down` appears only inside the smoke test's random 500-move loop and the benchmark. The `boardFromLines` down-branch mapping (`r = GRID_SIZE - 1 - k`) is never asserted in isolation — the one true I/O matrix hole.
3. **The benchmark budget gate is nearly tautological.** Measured medians: engine per-turn **0.0009 ms** vs 2 ms budget (~2000× headroom), frame-logic worst **0.0006 ms** vs 8 ms (~13000×). A 100× regression would still pass. Acceptable as a spike "starting hypothesis," but the gate as shipped gives almost no protection.
4. **CI protects only the triade suite.** `.github/workflows/ci.yml` runs `node --test` in `working-directory: triade`; the web PWA's 26 tests (`test/game.test.js`) have no CI coverage at all — an unguarded edit to `js/game.js` would go uncaught.
5. **One tautological assertion** in the smoke test (`assert.strictEqual(res.score, res.score, 'score is a number')`) asserts nothing; plus small untested engine edge cases (`spawnTile` on a full board, `pickIndex` clamping).

### Recommended Actions

1. Add explicit `down`-direction unit tests to close the I/O matrix gap (extend the ported suite).
2. Fix the tautological smoke assertion and add the two engine edge-case tests.
3. Calibrate benchmark budgets to measured baseline with realistic headroom so the CI gate has teeth.
4. Add a root-level CI job (zero-dep, `node --test` at repo root) so the legacy web suite is protected.
5. Add Node 26's built-in test coverage (`--experimental-test-coverage`) as a signal, not a hard gate.

### Action Status (2026-08-09)

| # | Action | Status |
| - | ------ | ------ |
| 1 | `down` unit tests (board + trace) | ✅ Done — 3 tests added |
| 2 | Fix tautological smoke assertion | ✅ Done — `engine.smoke.test.ts:40` |
| 3 | `spawnTile` full-board + `pickIndex` clamp tests | ✅ Done — 2 tests added |
| 4 | Recalibrate benchmark budgets | ✅ Done — 0.1 ms / 0.2 ms |
| 5 | Repo-root CI job for web suite | ✅ Done — `web-pwa-engine-test` job |
| 6 | Coverage tooling (`--experimental-test-coverage`) | ⏳ Not started — deferred (informational only) |

---

## Test Suite Metrics

### Test Distribution

| Type                 | Count | % of Total |
| -------------------- | ----- | ---------- |
| Unit Tests           | 56    | 96.6%      |
| Integration Tests    | 0     | 0%         |
| Play Mode/Functional | 0     | 0%         |
| Performance Tests    | 2     | 3.4%       |
| **Total**            | 58    | 100%       |

Breakdown:
- `test/game.test.js` (web, legacy) — 26 unit
- `triade/__tests__/engine/game.test.ts` (TS port) — 31 unit (26 ported + 3 `down` + 1 `spawnTile` full-board + 1 `pickIndex` clamps)
- `triade/__tests__/engine/engine.smoke.test.ts` — 4 smoke
- `triade/benchmarks/engine.bench.test.ts` — 2 performance gates

> **Post-review total: 63 tests (63/63 green)** — 26 web + 37 triade. Verified 2026-08-09.

> Note: `game.test.js` and `game.test.ts` are intentional 1:1 duplicates (port preserving identical behavior). Verified both are 26/26. Integration/functional/play-mode are N/A by design — the engine is pure logic and rendering is manually validated on a physical device (documented, story AC 4 / T5.2).

### Execution Metrics

| Metric         | Current | Previous | Trend |
| -------------- | ------- | -------- | ----- |
| Pass Rate      | 100% (58/58) | 100% | → |
| Avg Duration   | ~206 ms | —       | — |
| Flaky Tests    | 0       | —       | → |
| Disabled Tests | 0       | —       | → |

### Recent Run History

| Date       | Passed | Failed | Skipped | Duration  |
| ---------- | ------ | ------ | ------- | --------- |
| 2026-08-09 | 58     | 0      | 0       | 206 ms    |
| 2026-08-09 | 32     | 0      | 0       | 201 ms (triade only) |

Verification run: `node --test` at repo root (58/58) and `node --test` in `triade/` (32/32), Node v26.0.0.

---

## Quality Assessment

### Strengths

- **Full determinism.** No `Math.random` anywhere in tests; all randomness flows through injectable `rng` (`rngOf`) or seeded `mulberry32`. This is the strongest possible property for a random-mechanic puzzle engine.
- **Shared, reusable fixtures.** `triade/test-utils/helpers.ts` (`emptyBoard`, `rngOf`, `staticBoard`, `boardWith`, `mulberry32`) is DRY across unit + smoke + benchmark and sits outside `__tests__` so it isn't counted as a test file.
- **Behavioral, not implementation-coupled.** Tests assert board + trace outcomes (the public contract), not private internals — the merge-once/one-cell identity is exercised through `move()` results.
- **Excellent speed.** Entire suite completes in ~200 ms; no slow tests, no hard-coded waits, no timing dependence.
- **Trace contract is tested.** Three dedicated tests assert merge sources (`from`), destinations (`to`), spawn flags, and noop-with-no-spawn — exactly the render contract the UI depends on.
- **Perf gates are deterministic** (fixed seed, median of 10k samples, warmup) — no wall-clock flake.
- **Process artifacts exist.** Story file, ATDD checklist, architecture spike results, and project-context rules all document the testing standards and the manual-device scope.

### Issues Found

| Issue                                      | Severity | Count | Example | Recommended Fix |
| ------------------------------------------ | -------- | ----- | ------- | --------------- |
| `down` direction never unit-tested         | High     | 0     | no `move(board,'down',…)` assertion in either suite | Add 2-3 down-direction tests (mirror of up/right) |
| Tautological assertion                     | Low      | 1     | `engine.smoke.test.ts:40` `assert.strictEqual(res.score, res.score)` | Replace with `assert.strictEqual(typeof res.score, 'number')` |
| `spawnTile` full-board edge untested       | Low      | 1     | empty-length guard `spawn.ts:24` never hit | Add test: full board spawn returns `cell:null, value:null` |
| `pickIndex` clamping untested              | Low      | 1     | idx<0 / idx≥len branches never exercised | Add boundary rng values (1.0, negative) |
| Engine sub-functions only tested indirectly | Low      | 6     | `canMerge`, `mergeValue`, `pickIndex`, `movementLines`, `boardFromLines`, `boardsEqual` | Optional direct unit tests for pinpoint regressions |
| Benchmark budgets far above measured baseline | Medium | 2     | 0.0009ms vs 2ms; 0.0006ms vs 8ms | Recalibrate to measured baseline + headroom |
| Web suite has no CI coverage               | High     | 26    | `test/game.test.js` excluded from CI | Add repo-root CI job running `node --test` |
| Duplicate suites (web vs TS)               | Medium   | 26    | two 26-test sources of truth | Parity check / sync script, or formal web deprecation |

### Anti-Patterns Detected

| Pattern             | Occurrences | Impact | Fix Effort |
| ------------------- | ----------- | ------ | ---------- |
| Tautological assert | 1           | Low    | Minutes    |
| Duplicate test body | 26          | Medium | Low (by design — port) |
| No coverage metric  | n/a         | Low    | Low (built-in flag) |

---

## Coverage Analysis

### Feature Coverage Matrix

| Feature              | P0 Tests | P1 Tests | P2 Tests | Gap? |
| -------------------- | -------- | -------- | -------- | ---- |
| Core Loop (move/spawn/score) | 26  | 4        | 2 (perf) | No |
| Merge rules (1+2, eq≥3, no 1+1/2+2) | 8 | — | — | No |
| Movement (one-cell)  | 4        | —        | —        | Partial — no `down` |
| Spawn (weights/once/uniform) | 4  | —        | —        | Partial — full-board edge |
| Game Over detection  | 6        | 2        | —        | No |
| Trace contract       | 3        | —        | —        | No |
| New Game init        | 2        | 1        | —        | No |
| UI / Skia board      | 0        | 0        | 0        | **Yes — manual only** (documented) |
| Save/Load            | 0        | 0        | 0        | Yes — deferred to S1.4 (T4.5) |
| Multiplayer / Audio / Platform | n/a | n/a | n/a | Not in scope for S1.1 |

### Critical Gaps

| Gap                        | Risk         | Impact                | Priority to Fix |
| -------------------------- | ------------ | --------------------- | --------------- |
| `down` movement mapping    | High         | wrong board on down-swipe goes untested | P1 |
| Web PWA suite not in CI    | High         | `js/game.js` regressions unguarded | P1 |
| Benchmark gate has no teeth| Medium       | perf regressions pass silently | P2 |
| `spawnTile` full-board     | Low          | engine-only guard untested | P3 |
| `pickIndex` clamps         | Low          | defensive branch untested | P3 |

### Coverage by Priority

```
P0 Coverage: 100% ██████████
P1 Coverage:  80% ████████░░   (down direction + web CI are the gaps)
P2 Coverage:  50% █████░░░░░   (benchmark gate effective? no)
P3 Coverage:  40% ████░░░░░░
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect            | Status  | Notes |
| ----------------- | ------- | ----- |
| Tests in CI       | ✅      | triade suite only (32) |
| Results visible   | ✅      | GitHub Actions |
| Failures block    | ✅      | job fails on test/benchmark assert |
| Nightly runs      | ❌      | N/A — no scheduled device job yet (S1.1 Level 2 is a later story) |
| Performance tests | ✅      | 2 budget gates, deterministic |
| Web PWA in CI     | ❌      | `working-directory: triade` excludes it |

### Test Infrastructure Quality

| Component      | Quality          | Notes |
| -------------- | ---------------- | ----- |
| Fixtures       | Good             | shared helpers, deterministic |
| Helpers        | Good             | `mulberry32` reused across suites |
| Data factories | Good             | `boardWith`/`staticBoard` cover the I/O matrix |
| Documentation  | Good             | ATDD checklist + architecture spike results |

### Maintenance Burden

- Test update frequency: **low** (engine frozen; port is the product of record)
- Brittleness score: **low** (fully deterministic)
- Developer friction: **low** (`node --test`, no directory args, zero-dep)

---

## Recommendations

### Immediate (This Sprint — story 1.1 is in review)

| Action                                   | Effort | Impact | Owner |
| ---------------------------------------- | ------ | ------ | ----- |
| Add `down` unit tests (mirror of up; assert board + trace) | 1-2h   | High   | Dev  |
| Fix tautology in `engine.smoke.test.ts:40` | 5m    | Low    | Dev  |
| Add `spawnTile`-full-board and `pickIndex`-clamp tests | 1h     | Medium | Dev  |
| Recalibrate benchmark budgets to measured baseline (0.0009/0.0006 ms) with realistic headroom, or document the budget as hypothesis-only in the gate message | 1h | Medium | Dev |

### Short-term (This Milestone)

| Action                        | Effort | Impact | Notes |
| ----------------------------- | ------ | ------ | ----- |
| Add repo-root CI job for the web suite (`node --test` at root — zero-dep) | 2h     | High   | Protects the frozen `test/game.test.js` |
| Enable `node --test --experimental-test-coverage` on the engine in CI as a signal (report-only, not a gate) | 2h | Medium | No new deps; Node 26 built-in |
| Add a parity check that `game.test.js` and `game.test.ts` keep the same 26 test names | 1h | Medium | Prevents silent suite drift |

### Long-term (Ongoing)

| Action                        | Effort  | Impact | Notes |
| ----------------------------- | ------- | ------ | ----- |
| Formalize web-PWA test deprecation or keep both suites in CI | 1 day   | High   | Product of record is the RN app |
| Device-level benchmark job (p99 < 16.7 ms) + `useFrameRateBaseline` gate when rendering lands | 1-3 days | High | Story S1.1 Level 2 |
| Component test for `GameBoard` once the full UI rewrite exists (react-test-renderer or RN Testing Library) | 1 day | Medium | Currently manual-only, documented |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --------- | ------------ | --------------- | ------------ |
| (none)    | 0%           | —               | —            |

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --------- | -------- | ---- | ------ |
| benchmark: engine cost per turn < 0.1ms | ~38 ms | perf | ✅ budget recalibrated (was 2 ms) |
| benchmark: frame-logic worst case < 0.2ms | ~32 ms | perf | ✅ budget recalibrated (was 8 ms) |
| (all other tests) | < 1 ms each | unit | — |

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --------- | -------------- | ------ | ------ |
| (none)    | —              | —      | —      |

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| ---- | ----------- | ------ | -------- |
| ~~`down` untested~~ | I/O matrix incomplete | 2h | ✅ fixed 2026-08-09 |
| ~~Web suite no CI~~ | legacy 26 tests unguarded | 2h | ✅ fixed (`web-pwa-engine-test` job) |
| ~~Benchmark budgets loose~~ | gate ≈ tautology | 1h | ✅ fixed (0.1/0.2 ms) |
| ~~`spawnTile`/`pickIndex` edges~~ | untested guards | 1h | ✅ fixed |
| ~~Tautological assert~~ | smoke test line 40 | 5m | ✅ fixed |
| Coverage tooling | `--experimental-test-coverage` informational | 2h | Pending (deferred) |
| Duplicate suites | web/TS 1:1 copy | ongoing | Medium |

---

## Next Review

**Scheduled**: After story 1.2 (first UI work) or at the next milestone, whichever is first.
**Focus Areas**: `down` coverage, web-suite CI job, benchmark calibration, coverage % trend, device benchmark (Level 2) once rendering ships.
**Success Criteria**: `down` tested + web suite in CI + budget gate recalibrated; all suites green with coverage report in CI artifacts.
