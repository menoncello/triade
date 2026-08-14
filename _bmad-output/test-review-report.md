# Test Review Report: 3-clone / Tríade

**Review Date**: 2026-08-13
**Reviewer**: gds-test-review (Game QA Lead)
**Scope**: Story 1.3 — Board Skia declarativo dirigido pelo trace
**Period Covered**: 2026-08-12 to 2026-08-13

---

## Executive Summary

### Overall Health: Good

### Key Findings

1. **All 105 tests green and fully deterministic** — web PWA `test/game.test.js` (26) + triade suite (79: engine 31 + parity 9 + suite-parity 1 + smoke 9 + purity 4 + matchScore 8 + transitionPlan 14 + benchmarks 3). Zero flaky across 3 consecutive runs, zero disabled, zero `Math.random` in tests. `npx tsc --noEmit` clean. Web PWA files untouched (frozen rule honored).
2. **The no-leak oracle is the strongest test in the suite.** `resultingTiles(plan)` deep-equals the occupied cells of `result.board` — asserted across a 200-move deterministic property test (`transitionPlan.test.ts`) and a 500-move render critical-path smoke (`render.smoke.test.ts`) that also exercises game-over→restart. This is the pure analog of the web `tileEls` rule and directly closes AC-4.
3. **The trace-only derivation (AC-1/AC-6) was the one genuine gap — now closed.** `planTileTransitions(prevBoard, result)` never reads `prevBoard`; a dedicated test now calls it with unrelated `prevBoard`s (incl. `emptyBoard`) and the same `result`, asserting identical plans for merge, slide+hold, and noop cases — locking "never match the old board by value heuristics" against regression.
4. **The planner frame budget is gated with ~100× headroom** (`render.bench.test.ts`: budget 0.05ms med / 0.1ms p99 vs measured 0.0002ms med / 0.0004ms p99) and the rationale is documented in the file header — deterministic, CI-safe.
5. **Residual documented gaps are all by design**: Skia/Reanimated animation + device 60 FPS remain manual validation (project rule: `node --test` cannot see the GPU); the benchmark gate is informative for NFR-1, not evidence of on-device FPS.

### Recommended Actions

1. ~~Add one test proving the plan is a function of `result` only~~ ✅ **Done (this review)** — `planTileTransitions` called with unrelated/empty `prevBoard` + same `result` yields identical plans across merge, slide+hold, and noop cases (`transitionPlan.test.ts`, 79/79 green).
2. Share the duplicated `assertNoLeak` helper (currently copy-pasted in `transitionPlan.test.ts` and `render.smoke.test.ts`) into `test-utils/helpers.ts`.
3. When `src/feel` lands (Epic 8), add a boundary test that `src/render` never imports `src/feel` (mirror of the ADR-01 purity scan).

### Action Status (from 1.2 review)

| # | Action | Status |
| - | ------ | ------ |
| 1 | Parity shared-bug limitation documented in file header | ✅ Already present in 1.2 review notes; parity header + absolute-assertion unit tests remain the mitigation |
| 2 | Re-verify benchmark budgets when rendering lands (1.3) | ✅ Done — `render.bench.test.ts` adds planner gate; engine budgets still ~100× baseline, acceptable |
| 3 | Persistence-backed score/best tests with story 1.4 | ⏳ Pending (story 1.4 not started) |
| 4 | Formalize web-PWA test deprecation or keep both suites | ⏳ Ongoing — both suites still gated in CI (intentional during migration) |
| 5 | Component test for `GameBoard` when UI exists | ⏳ Partially — render smoke covers the planner; component remains manual (project rule) |

---

## Test Suite Metrics

### Test Distribution

| Type                 | Count | % of Total |
| -------------------- | ----- | ---------- |
| Unit Tests           | 67    | 85.9%      |
| Integration Tests    | 0     | 0%         |
| Play Mode/Functional | 9     | 11.5%      |
| Performance Tests    | 3     | 3.8%       |
| **Total**            | 79    | 100%       |

Breakdown (triade):
- `triade/__tests__/engine/game.test.ts` — 31 unit
- `triade/__tests__/engine/engine.parity.test.ts` — 9 differential parity vs `js/game.js`
- `triade/__tests__/engine/engine.suite-parity.test.ts` — 1 name-drift guard
- `triade/__tests__/engine/engine.smoke.test.ts` — 4 smoke
- `triade/__tests__/engine/engine.purity.test.ts` — 4 (2 extended: ADR-01/05 purity + relative-import self-containment for `src/render/transitionPlan.ts`)
- `triade/__tests__/game/matchScore.test.ts` — 8 unit
- `triade/__tests__/render/transitionPlan.test.ts` — **14 (NEW, story 1.3)** planner unit matrix (13 + trace-only derivation lock)
- `triade/__tests__/render/render.smoke.test.ts` — **5 (NEW, story 1.3)** render critical-path smoke
- `triade/benchmarks/engine.bench.test.ts` — 2 perf gates
- `triade/benchmarks/render.bench.test.ts` — **1 (NEW, story 1.3)** planner frame-budget gate

> Web PWA frozen: `test/game.test.js` (26) untouched and green. UI/Skia animation and on-device FPS remain manual per project rules.

### Execution Metrics

| Metric         | Current        | Previous (1.2) | Trend |
| -------------- | -------------- | -------------- | ----- |
| Pass Rate      | 100% (105/105) | 100% (83/83)   | →     |
| Avg Duration   | ~1.5 s (triade) | ~1.6 s         | →     |
| Flaky Tests    | 0 (3 runs)     | 0              | →     |
| Disabled Tests | 0              | 0              | →     |

### Recent Run History

| Date       | Passed | Failed | Skipped | Duration |
| ---------- | ------ | ------ | ------- | -------- |
| 2026-08-13 | 105    | 0      | 0       | ~1.6 s (root: 26 web + 79 triade) |
| 2026-08-13 | 79     | 0      | 0       | ~1.5 s (triade only) |
| 2026-08-13 | 26     | 0      | 0       | ~90 ms (web only) |

Verification: `node --test` in `triade/` (78/78) and at repo root for web (`test/game.test.js`, 26/26), Node v26.0.0, 3 consecutive green runs (flakiness check). `npx tsc --noEmit` clean.

---

## Quality Assessment

### Strengths

- **Trace-only planner is tiny, pure, and host-testable.** `transitionPlan.ts` (40 lines) classifies every trace entry into `slide`/`merge`/`spawn`/`hold` with no RN/React/Skia imports — the ADR-05 hybrid boundary made executable.
- **The no-leak oracle property is excellent.** `resultingTiles(plan) === occupied cells of result.board` asserted over 200 + 500 deterministic moves, including partial moves (the case that historically leaks). Mirrors the web `tileEls` rule exactly.
- **Smoke covers the real game lifecycle**, not just fixtures: 500 moves with direction-driven play, game-over detection, and restart — while asserting every effective move yields a non-empty plan and every noop yields an empty plan.
- **Deterministic everywhere.** Seeded `mulberry32` / `rngOf` only; no `Math.random`; benchmarks use fixed seeds and fixed budgets.
- **Clean AAA structure.** Each test: build board fixture → move with injected rng → assert exact plan shape (deep equality on `type`/`value`/`to`/`from`, not just final tiles). Assertions carry messages.
- **No anti-patterns.** No hard-coded waits, no shared state, no private-implementation tests, no missing cleanup (pure functions), no assertion-free tests.
- **CI gates both surfaces** and automatically picks up the new test dirs (`node --test` discovery, `tsc --noEmit`).

### Issues Found

| Issue                                            | Severity | Count | Example | Recommended Fix |
| ------------------------------------------------ | -------- | ----- | ------- | --------------- |
| Dead parameter `prevBoard` in API surface        | Low      | 1     | never read by implementation | Kept intentionally — now guarded by the trace-only derivation test |
| Duplicate `assertNoLeak` helper                  | Low      | 2     | copy-pasted in `transitionPlan.test.ts` + `render.smoke.test.ts` | Hoist into `test-utils/helpers.ts` |
| Benchmark budgets ~100× measured baseline        | Low      | 3     | 0.0002ms vs 0.05ms budget | Acceptable; re-check when real on-device frame path lands (Epic 8) |
| Duplicate suites (web vs TS)                     | Medium   | 26    | two 26-test sources of truth | Parity/name-drift guard exists; formal deprecation when RN is product of record |

### Anti-Patterns Detected

| Pattern                 | Occurrences | Impact | Fix Effort |
| ----------------------- | ----------- | ------ | ---------- |
| Duplicate test body     | 2           | Low    | Low        |

---

## Coverage Analysis

### Feature Coverage Matrix

| Feature                                   | P0 Tests | P1 Tests | P2 Tests | Gap? |
| ----------------------------------------- | -------- | -------- | -------- | ---- |
| Trace→transition classification (slide/merge/spawn/hold) | 14 (NEW) | 5 smoke | — | No |
| No-leak (resultingTiles oracle)           | 200-move + 500-move property | — | — | No |
| Noop / dead-board / empty-board no-animate | 3 + smoke | — | — | No |
| Full-board merge-once plan                | 1        | —        | — | No |
| Partial move → hold for stationary tiles  | 1        | —        | — | No |
| 9-start-tile board coverage               | 1 + smoke | —        | — | No |
| Trace-only derivation (no prev-board heuristics) | 1 (NEW, this review) | — | — | No |
| Planner frame budget (NFR-1)              | 1 benchmark | — | — | No |
| ADR-01/05 purity (`src/render/transitionPlan.ts`) | 2 (extended) | — | — | No |
| `GameBoard.tsx` animation (Skia/Reanimated) | 0 | 0 | 0 | **Yes — manual only (by design)** |
| Device 60 FPS (NFR-1)                     | 0 | 0 | 0 | **Yes — manual, informative only (no device)** |
| Core engine / score / web parity          | 57 | 8 | — | No (unchanged, green) |

### Story 1.3 AC → Test Map

| AC | Requirement | Verification |
| -- | ----------- | ------------ |
| 1  | Render 100% from trace, no heuristic matching | Planner unit matrix + purity + trace-only derivation test (unrelated/empty `prevBoard` → identical plan) |
| 2  | Slide/merge/spawn animations from the trace | Planner transitions (slide all dirs, merge 1+2 both orders / equal ≥3, spawn flag, hold); animation itself manual |
| 3  | Overshoot declarative in `src/render`; feel in `src/feel` | Purity guard on `transitionPlan.ts`; `GameBoard` manual; `src/feel` not yet implemented (Epic 8) |
| 4  | No-leak in render tree | `resultingTiles` oracle — 200-move property test + 500-move smoke |
| 5  | 60 FPS sustained (NFR-1) | Planner benchmark gate (deterministic); on-device reading manual/informative |
| 6  | UI never duplicates rules | Purity + engine untouched (git status clean on `src/engine`) |

### Critical Gaps

| Gap | Risk | Impact | Priority to Fix |
| --- | ---- | ------ | --------------- |
| ~~Trace-only derivation not locked by test~~ | ✅ closed this review | — | P1 (done) |
| GameBoard/Skia animation coverage | Medium | animation broken until manual device smoke | P2 (manual by project rule; revisit with component test infra) |
| Device FPS evidence | Low | no iOS device available | P3 (deferred) |
| Coverage % signal for `src/render` | Low | CI coverage step only includes `src/engine/**` + `src/game/**` | P3 (informational step) |

### Coverage by Priority

```
P0 Coverage: 100% ██████████
P1 Coverage: 100% ██████████
P2 Coverage:  75% ███████░░░   (GameBoard + device FPS manual-only)
P3 Coverage:  50% █████░░░░░
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
| Performance tests | ✅     | 3 deterministic budget gates (2 engine + 1 planner) |
| Typecheck         | ✅     | `npx tsc --noEmit` in CI |

### Test Infrastructure Quality

| Component      | Quality          | Notes |
| -------------- | ---------------- | ----- |
| Fixtures       | Good             | shared helpers (`emptyBoard`, `boardWith`, `staticBoard`, `rngOf`, `mulberry32`) reused across unit + smoke + benchmark |
| Helpers        | Good             | `test-utils/helpers.ts`; minor duplication of `assertNoLeak` |
| Data factories | Good             | `boardOf(...rows)` + `seededRandomBoard` cover both exact-fixture and property-style tests |
| Documentation  | Good             | story file + benchmark header document rng discipline, budgets rationale, and the trace contract |

### Maintenance Burden

- Test update frequency: **low** (engine frozen; web PWA untouched)
- Brittleness score: **low** (fully deterministic, seeded)
- Developer friction: **low** (`node --test` bare, zero-dep)

---

## Recommendations

### Immediate (This Sprint — story 1.3 in review)

| Action | Effort | Impact | Owner |
| ------ | ------ | ------ | ----- |
| ~~Trace-only derivation test~~ | ✅ Done this review | High | Dev |

### Short-term (This Milestone)

| Action | Effort | Impact | Notes |
| ------ | ------ | ------ | ----- |
| Hoist `assertNoLeak` into `test-utils/helpers.ts` (dedupe 2 copies) | 15m | Low | Consistency |
| Extend CI informational coverage step to include `src/render/**` | 15m | Low | Coverage signal for the new planner |
| Add `src/render` ↔ `src/feel` boundary test when Epic 8 lands | 1h | Medium | Mirrors ADR-01 scan; prevents hybrid-boundary leak |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| ------ | ------ | ------ | ----- |
| Persistence-backed score/best tests with story 1.4 | 1 day | Medium | `matchScore` contract stays in-memory until then |
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
| benchmark: engine cost per turn < 0.1ms | ~60 ms | perf | ✅ deterministic, keep |
| benchmark: transition-plan cost per move < 0.05ms med / 0.1ms p99 | ~48 ms | perf | ✅ deterministic, keep |
| benchmark: frame-logic tail p99 < 0.2ms | ~26 ms | perf | ✅ deterministic, keep |
| (all other tests) | < 6 ms each | unit/smoke | — |

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --------- | -------------- | ------ | ------ |
| (none)    | —              | —      | —      |

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| ---- | ----------- | ------ | -------- |
| ~~Trace-only derivation untested~~ | ✅ closed this review | 30m | High |
| Duplicate `assertNoLeak` | copy-paste in 2 files | 15m | Low |
| Duplicate suites | web/TS 1:1 copy | ongoing | Medium |
| Device-level benchmark | p99 < 16.7 ms on physical device | 1-3 days | Blocked (no device) |

---

## Next Review

**Scheduled**: After story 1.4 (offline/persistence) or the next milestone, whichever is first.
**Focus Areas**: persistence-backed matchScore tests, `src/feel` boundary, device FPS evidence.
**Success Criteria**: trace-only derivation lock ✅ landed (79/79); parity + planner + matchScore stay green; coverage report includes `src/render`.
