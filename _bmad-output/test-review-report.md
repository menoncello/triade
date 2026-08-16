# Test Review Report: 3-clone / Tríade

**Review Date**: 2026-08-14
**Reviewer**: gds-test-review (Game QA Lead)
**Scope**: Story 1.3 — Board Skia declarativo dirigido pelo trace (re-run / updated evidence)
**Period Covered**: 2026-08-12 to 2026-08-14

---

## Executive Summary

### Overall Health: Good

### Key Findings

1. **All 133 tests green and fully deterministic** — web PWA `test/game.test.js` (26) + triade suite (107: engine 45 + parity 9 + suite-parity 1 + smoke 9 + purity 5 + matchScore 8 + transitionPlan 16 + render smoke 5 + assets 3 + storage 21 + benchmarks 4). Zero flaky across 3 consecutive runs, zero disabled, zero `Math.random` in tests. `npx tsc --noEmit` clean. Story 1.3 files verified unchanged since `2bb5083` (web PWA frozen rule honored).
2. **The no-leak oracle remains the strongest test in the suite.** `resultingTiles(plan)` deep-equals the occupied cells of `result.board` — asserted across a 200-move deterministic property test (`transitionPlan.test.ts`) and a 500-move render critical-path smoke (`render.smoke.test.ts`) that also exercises game-over→restart. This is the pure analog of the web `tileEls` rule and directly closes AC-4.
3. **Trace-only derivation (AC-1/AC-6) is locked and still green.** `planTileTransitions(prevBoard, result)` never reads `prevBoard`; a dedicated test calls it with unrelated/empty `prevBoard`s and the same `result`, asserting identical plans for merge, slide+hold, and noop cases.
4. **Re-review coverage additions are holding.** The 2+2 no-merge and spawn-at-last-cell `[3,3]` guards added in the 2026-08-13 re-review are present and green — `transitionPlan.test.ts` now carries 16 tests (the earlier report's "14" was stale).
5. **Residual documented gaps are all by design**: Skia/Reanimated animation + device 60 FPS remain manual validation (project rule: `node --test` cannot see the GPU); the benchmark gate is informative for NFR-1, not evidence of on-device FPS.

### Recommended Actions

1. ~~Hoist the duplicated `assertNoLeak` helper~~ ✅ **Done (this review)** — now in `test-utils/helpers.ts`; both `transitionPlan.test.ts` and `render.smoke.test.ts` import the shared version. Bonus: the smoke suite now asserts cells **and values** (the previous local copy compared cells only), so the no-leak oracle is strictly stronger.
2. ~~Extend the CI informational coverage step to include `src/render/**`~~ ✅ **Done (this review)** — `ci.yml` coverage now includes `src/engine/**`, `src/game/**`, `src/render/**`, `src/services/**`; `transitionPlan.ts` reports 100% line/function/branch.
3. ~~Harden the purity scan (hand-maintained `PURITY_FILES` + prefix blind spots)~~ ✅ **Done (this review)** — `src/render` is now auto-scanned with an explicit runtime-bound exemption set (`GameBoard.tsx`, `useFrameRateBaseline.ts`); `FORBIDDEN_PREFIXES` extended with `reanimated`/`skia`; a new purity guard test fails if the exemption set rots (stale entries) or the scan goes void.
4. When `src/feel` lands (Epic 8), add a boundary test that `src/render` never imports `src/feel` (mirror of the ADR-01 purity scan).

### Action Status (from 1.3 previous review)

| # | Action | Status |
| - | ------ | ------ |
| 1 | ~~Add trace-only derivation test~~ | ✅ Done (previous review) — present and green (`transitionPlan.test.ts:159`) |
| 2 | ~~Hoist duplicated `assertNoLeak` into `test-utils/helpers.ts`~~ | ✅ Done (this review) — shared helper; smoke upgraded to cells+values |
| 3 | ~~Extend CI coverage include to `src/render/**`~~ | ✅ Done (this review) — `transitionPlan.ts` @ 100% line/function/branch |
| 4 | ~~Harden purity scan (auto-scan + exemption set + stale guard)~~ | ✅ Done (this review) — `PURITY_FILES` replaced by scan; prefixes +`reanimated`/`skia` |
| 5 | `src/render` ↔ `src/feel` boundary test | ⏳ Pending (Epic 8, `src/feel` not implemented yet) |
| 6 | Persistence-backed score/best tests with story 1.4 | 🔄 In progress — 1.4 branch carries uncommitted `__tests__/storage/` (21 tests) + `storage.bench.test.ts`; not merged |
| 7 | Formalize web-PWA test deprecation or keep both suites | 🔄 Ongoing — both suites still gated in CI (intentional during migration) |
| 8 | Component test for `GameBoard` when UI exists | ⏳ Pending — render smoke covers the planner; component remains manual (project rule) |

---

## Test Suite Metrics

> Note: the triade suite currently runs **107 tests** because the working tree is on `feature/1-4-...` with in-progress story 1.4 test files (25 tests: assets 3 + storage 21 + storage benchmark 1). Story 1.3 itself contributed **25 net-new tests** (16 transitionPlan + 5 render smoke + 1 render benchmark + 3 purity guards). Figures below separate 1.3 scope from in-progress 1.4 work.

### Test Distribution (triade, current working tree)

| Type                 | Count | % of Total |
| -------------------- | ----- | ---------- |
| Unit Tests           | 92    | 86.0%      |
| Integration Tests    | 0     | 0%         |
| Play Mode/Functional | 9     | 8.4%       |
| Performance Tests    | 4     | 3.7%       |
| Smoke (lifecycle)    | 2     | 1.9%       |
| **Total**            | 107   | 100%       |

Breakdown:
- `triade/__tests__/engine/game.test.ts` — 31 unit (pre-1.3)
- `triade/__tests__/engine/engine.parity.test.ts` — 9 differential parity vs `js/game.js` (pre-1.3)
- `triade/__tests__/engine/engine.smoke.test.ts` — 4 smoke (pre-1.3)
- `triade/__tests__/engine/engine.suite-parity.test.ts` — 1 name-drift guard (pre-1.3)
- `triade/__tests__/engine/engine.purity.test.ts` — 5 (2 original ADR-01 + **3 story-1.3 ADR-05 guards: auto-scan of `src/render` pure modules, relative-imports-only, runtime-bound exemption staleness**)
- `triade/__tests__/game/matchScore.test.ts` — 8 unit (pre-1.3)
- `triade/__tests__/render/transitionPlan.test.ts` — **16 (story 1.3)** planner unit matrix
- `triade/__tests__/render/render.smoke.test.ts` — **5 (story 1.3)** render critical-path smoke
- `triade/benchmarks/render.bench.test.ts` — **1 (story 1.3)** planner frame-budget gate
- `triade/benchmarks/engine.bench.test.ts` — 2 perf gates (pre-1.3)
- `triade/__tests__/assets/assetManifest.test.ts` — 3 (in-progress 1.4)
- `triade/__tests__/storage/{entitlements,keyspace,schema,storage.purity}.test.ts` — 21 (in-progress 1.4)
- `triade/benchmarks/storage.bench.test.ts` — 1 (in-progress 1.4)

> Web PWA frozen: `test/game.test.js` (26) untouched and green. UI/Skia animation and on-device FPS remain manual per project rules.

### Story 1.3 Test Distribution

| Type                 | Count |
| -------------------- | ----- |
| Unit (planner matrix) | 16    |
| Play Mode/Functional | 5     |
| Performance          | 1     |
| Purity (ADR-05)      | 3     |
| **Story 1.3 net-new** | **25** |

### Execution Metrics

| Metric         | Current               | Previous (1.3 report) | Trend |
| -------------- | --------------------- | --------------------- | ----- |
| Pass Rate      | 100% (133/133)        | 100% (105/105)        | →     |
| Avg Duration   | ~2.0 s (triade 107)   | ~1.5 s (triade 79)    | ↑ (1.4 tests added) |
| Flaky Tests    | 0 (3 runs)            | 0                     | →     |
| Disabled Tests | 0                     | 0                     | →     |

### Recent Run History

| Date       | Passed | Failed | Skipped | Duration |
| ---------- | ------ | ------ | ------- | -------- |
| 2026-08-14 | 133    | 0      | 0       | ~2.0 s (26 web + 107 triade, post-fix) |
| 2026-08-14 | 132    | 0      | 0       | ~2.0 s (26 web + 106 triade, pre-fix) |
| 2026-08-14 | 107    | 0      | 0       | ~1.9 s (triade only, post-fix) |
| 2026-08-14 | 26     | 0      | 0       | ~240 ms (story 1.3 files, 3/3 runs) |
| 2026-08-14 | 26     | 0      | 0       | ~96 ms (web only) |
| 2026-08-13 | 105    | 0      | 0       | ~1.6 s (previous review) |

Verification: `node --test` in `triade/` (106/106), repo-root web suite `node --test test/game.test.js` (26/26), story-1.3 files run in isolation (26/26 × 3 consecutive runs for flakiness check), Node v26.0.0. `npx tsc --noEmit` clean. Story 1.3 test files unchanged since `2bb5083` (git clean).

---

## Quality Assessment

### Strengths

- **Trace-only planner is tiny, pure, and host-testable.** `transitionPlan.ts` (40 lines) classifies every trace entry into `slide`/`merge`/`spawn`/`hold` with no RN/React/Skia imports — the ADR-05 hybrid boundary made executable. Guarded by 3 purity tests (this review: now an **auto-scan of `src/render`** with a runtime-bound exemption set, plus a stale-exemption guard).
- **The no-leak oracle property is excellent.** `resultingTiles(plan) === occupied cells of result.board` asserted over 200 + 500 deterministic moves, including partial moves (the case that historically leaks). Mirrors the web `tileEls` rule exactly. This review hoisted it into `test-utils/helpers.ts` — the smoke suite now asserts cells **and values**, making the oracle strictly stronger than before.
- **Smoke covers the real game lifecycle**, not just fixtures: 500 moves with direction-driven play, game-over detection, restart, full-session transition-type coverage (all 4 types seen), dead-board and empty-board no-animate.
- **Deterministic everywhere.** Seeded `mulberry32` / `rngOf` only; no `Math.random`; benchmarks use fixed seeds and fixed budgets with batch-mean sampling (GC/timer flake guard).
- **Clean AAA structure.** Each test: build board fixture → move with injected rng → assert exact plan shape (deep equality on `type`/`value`/`to`/`from`, not just final tiles). Assertions carry messages.
- **No anti-patterns.** No hard-coded waits, no shared state, no private-implementation tests, no missing cleanup (pure functions), no assertion-free tests.
- **Re-review findings all resolved in the shipped code** — merge-vanish dead code, decoupled timing, impure `setTiles` updater, benchmark p99 gate, stale completion-note count (fixed in commit `2bb5083`).
- **CI gates both surfaces** and auto-discovers new test dirs (`node --test` + `tsc --noEmit`).

### Issues Found

| Issue | Severity | Count | Example | Recommended Fix |
| ----- | -------- | ----- | ------- | --------------- |
| ~~Duplicate `assertNoLeak` helper~~ | ~~Low~~ | ~~2~~ | ✅ fixed this review — shared in `test-utils/helpers.ts` | — |
| ~~CI coverage missing `src/render/**`~~ | ~~Low~~ | ~~1~~ | ✅ fixed this review — `transitionPlan.ts` @ 100% | — |
| ~~Purity scan hand-maintained list~~ | ~~Low~~ | ~~1~~ | ✅ fixed this review — auto-scan + exemption set + stale guard | — |
| Dead parameter `prevBoard` in API surface | Low | 1 | never read by implementation | Kept intentionally — guarded by the trace-only derivation test |
| Benchmark budgets ~100× measured baseline | Low | 3 | 0.0002ms vs 0.05ms budget | Acceptable; re-check when real on-device frame path lands (Epic 8) |
| Duplicate suites (web vs TS) | Medium | 26 | two 26-test sources of truth | Parity/name-drift guard exists; formal deprecation when RN is product of record |

### Anti-Patterns Detected

| Pattern             | Occurrences | Impact | Fix Effort |
| ------------------- | ----------- | ------ | ---------- |
| (none)              | 0           | —      | —          |

*(Duplicate test body resolved this review — `assertNoLeak` hoisted into `test-utils/helpers.ts`.)*

---

## Coverage Analysis

### Feature Coverage Matrix

| Feature | P0 Tests | P1 Tests | P2 Tests | Gap? |
| ------- | -------- | -------- | -------- | ---- |
| Trace→transition classification (slide/merge/spawn/hold) | 16 | 5 smoke | — | No |
| No-leak (resultingTiles oracle) | 200-move + 500-move property | — | — | No |
| Noop / dead-board / empty-board no-animate | 4 + smoke | — | — | No |
| Full-board merge-once plan | 1 | — | — | No |
| Partial move → hold for stationary tiles | 1 | — | — | No |
| 9-start-tile board coverage | 1 + smoke | — | — | No |
| 1+1 / 2+2 no-merge (2048 trap) | 2 | — | — | No |
| Spawn at last empty cell `[3,3]` | 1 | — | — | No |
| Trace-only derivation (no prev-board heuristics) | 1 | — | — | No |
| Planner frame budget (NFR-1) | 1 benchmark | — | — | No |
| ADR-01/05 purity (`src/render` pure modules auto-scanned) | 3 | — | — | No |
| `GameBoard.tsx` animation (Skia/Reanimated) | 0 | 0 | 0 | **Yes — manual only (by design)** |
| Device 60 FPS (NFR-1) | 0 | 0 | 0 | **Yes — manual, informative only (no device)** |
| Core engine / score / web parity | 57 | 8 | — | No (unchanged, green) |

### Story 1.3 AC → Test Map

| AC | Requirement | Verification |
| -- | ----------- | ------------ |
| 1  | Render 100% from trace, no heuristic matching | Planner unit matrix + purity + trace-only derivation test (unrelated/empty `prevBoard` → identical plan) |
| 2  | Slide/merge/spawn animations from the trace | Planner transitions (slide all dirs, merge 1+2 both orders / equal ≥3, spawn flag, hold); animation itself manual |
| 3  | Overshoot declarative in `src/render`; feel in `src/feel` | Purity guard on `transitionPlan.ts`; `GameBoard` manual; `src/feel` not yet implemented (Epic 8) |
| 4  | No-leak in render tree | `resultingTiles` oracle — 200-move property test + 500-move smoke |
| 5  | 60 FPS sustained (NFR-1) | Planner benchmark gate (deterministic); on-device reading manual/informative |
| 6  | UI never duplicates rules | Purity auto-scan of `src/render` pure modules + engine untouched (git clean on `src/engine`; `src/render/transitionPlan.ts` imports engine types only) |

### Critical Gaps

| Gap | Risk | Impact | Priority to Fix |
| --- | ---- | ------ | --------------- |
| GameBoard/Skia animation coverage | Medium | animation broken until manual device smoke | P2 (manual by project rule; revisit with component test infra) |
| Device FPS evidence | Low | no iOS device available | P3 (deferred) |
| ~~Coverage % signal for `src/render`~~ | ~~Low~~ | ✅ closed this review — CI coverage includes `src/render/**`; `transitionPlan.ts` @ 100% line/function/branch | — |

### Coverage by Priority

```
P0 Coverage: 100% ██████████
P1 Coverage: 100% ██████████
P2 Coverage:  75% ███████░░░   (GameBoard + device FPS manual-only)
P3 Coverage:  75% ███████░░░   (only device FPS evidence remains — no device available)
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect            | Status | Notes |
| ----------------- | ------ | ----- |
| Tests in CI       | ✅     | `engine-test-and-benchmark` (triade: tsc + node --test) + `web-pwa-engine-test` (root web suite) |
| Results visible   | ✅     | GitHub Actions |
| Failures block    | ✅     | jobs fail on test/benchmark/typecheck failure |
| Nightly runs      | ❌     | N/A — no scheduled device job yet |
| Performance tests | ✅     | 4 deterministic budget gates (2 engine + 1 planner + 1 storage in-progress 1.4) |
| Typecheck         | ✅     | `npx tsc --noEmit` in CI |
| Coverage (informational) | ✅ | `src/engine/**` + `src/game/**` + `src/render/**` + `src/services/**` |

### Test Infrastructure Quality

| Component      | Quality          | Notes |
| -------------- | ---------------- | ----- |
| Fixtures       | Good             | shared helpers (`emptyBoard`, `boardWith`, `staticBoard`, `rngOf`, `mulberry32`) reused across unit + smoke + benchmark |
| Helpers        | Good             | `test-utils/helpers.ts` now also exports `occupiedCells` + `assertNoLeak` (deduped this review) |
| Data factories | Good             | `boardOf(...rows)` + `seededRandomBoard` cover both exact-fixture and property-style tests |
| Documentation  | Good             | story file + benchmark header document rng discipline, budgets rationale, and the trace contract |

### Maintenance Burden

- Test update frequency: **low** (engine frozen; web PWA untouched; 1.3 files git-clean since merge)
- Brittleness score: **low** (fully deterministic, seeded, batch-mean benchmark sampling)
- Developer friction: **low** (`node --test` bare, zero-dep)

---

## Recommendations

### Immediate (This Sprint — story 1.3 closed, findings fixed)

| Action | Effort | Impact | Owner |
| ------ | ------ | ------ | ----- |
| ~~Hoist `assertNoLeak` into `test-utils/helpers.ts`~~ | ✅ Done | Low | QA |
| ~~Extend CI coverage include to `src/render/**`~~ | ✅ Done | Low | QA |
| ~~Harden purity scan (auto-scan + exemption + stale guard)~~ | ✅ Done | Low | QA |

### Short-term (This Milestone)

| Action | Effort | Impact | Notes |
| ------ | ------ | ------ | ----- |
| Add `src/render` ↔ `src/feel` boundary test when Epic 8 lands | 1h | Medium | Mirrors ADR-01 scan; prevents hybrid-boundary leak |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| ------ | ------ | ------ | ----- |
| Persistence-backed score/best tests with story 1.4 | 1 day | Medium | In progress — 1.4 storage suite (21 tests + benchmark) uncommitted on branch |
| Formalize web-PWA test deprecation or keep both suites | 1 day | High | Product of record is the RN app |
| Component test harness for `GameBoard` (Reanimated) when feasible | 1-3 days | Medium | Currently manual-only, documented |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --------- | ------------ | --------------- | ------------ |
| (none)    | 0% (3/3 runs green) | — | — |

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --------- | -------- | ---- | ------ |
| benchmark: engine cost per turn < 0.1ms | ~56 ms | perf | ✅ deterministic, keep |
| benchmark: transition-plan cost per move < 0.05ms med / 0.1ms p99 | ~106 ms | perf | ✅ deterministic, keep |
| benchmark: frame-logic tail p99 < 0.2ms | ~31 ms | perf | ✅ deterministic, keep |
| benchmark: settings round-trip < 0.1ms (1.4, in-progress) | ~11 ms | perf | ✅ deterministic, keep |
| (all other tests) | < 7 ms each | unit/smoke | — |

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --------- | -------------- | ------ | ------ |
| (none)    | —              | —      | —      |

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| ---- | ----------- | ------ | -------- |
| ~~Duplicate `assertNoLeak`~~ | ✅ closed this review — hoisted into `test-utils/helpers.ts` | 15m | Low |
| ~~CI coverage excludes `src/render/**`~~ | ✅ closed this review — include added; `transitionPlan.ts` @ 100% | 15m | Low |
| ~~Purity scan hand-maintained list~~ | ✅ closed this review — auto-scan + runtime-bound exemption + stale guard | 1h | Low |
| Duplicate suites | web/TS 1:1 copy | ongoing | Medium |
| Device-level benchmark | p99 < 16.7 ms on physical device | 1-3 days | Blocked (no device) |

---

## Next Review

**Scheduled**: After story 1.4 (offline/persistence) is merged and its 25 in-progress tests are reviewed.
**Focus Areas**: persistence-backed matchScore/storage tests, `src/feel` boundary, device FPS evidence, close the open `assertNoLeak` + `src/render` coverage items.
**Success Criteria**: story-1.3 gates stay green; story-1.4 tests reviewed and merged; `assertNoLeak` hoisted; coverage report includes `src/render`.
