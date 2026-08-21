# Test Review Report: 3-clone (triade)

**Review Date**: 2026-08-20
**Reviewer**: Game QA Lead (automated review)
**Period Covered**: suite state as of 2026-08-20

---

## Executive Summary

### Overall Health: Good

The `triade` suite is small, fast, and unusually disciplined for a game project of this size. It is fully deterministic (seeded RNG everywhere, zero timers/`Math.random`), has built-in architecture-boundary guards (ADR purity tests), and is CI-gated on every PR with typecheck + a deterministic performance budget. The main weaknesses are at the persistence and React-component layer, which are currently deferred by project convention rather than by accident.

### Key Findings

1. **194 tests, 100% passing, ~2.2s total** — all unit/perf tests run in well under a second per file; no slow, flaky, or skipped tests exist.
2. **Core engine is over-covered and well-characterized** — move/merge/spawn/game-over logic has both happy-path and edge-case tests, plus pipe-level characterization tests that lock current `shiftLine` behavior.
3. **Two real coverage gaps remain**: the MMKV-backed `settingsStore` (save/load of best score + settings) and the React component layer (`Hud`, `PauseButton`, `GameBoard`) are untested. Both are deferred because they touch native RN modules, not because they are low-risk.

### Recommended Actions

1. (High) Make `settingsStore` testable by injecting the storage backend (or extracting pure parse/serialize) so best-score/settings persistence has at least a unit-level regression net.
2. (Medium) Add a React Native Testing Library layer for the presentational components, starting with `PauseButton` and `Hud`.
3. (Ongoing) Keep the ADR-purity and benchmark gates; they are the suite's biggest strengths.

---

## Test Suite Metrics

### Test Distribution

| Type                 | Count | % of Total |
| -------------------- | ----- | ---------- |
| Unit / Logic         | 174   | 89.7%      |
| Play Mode / Functional (Smoke) | 9 | 4.6% |
| Architecture / Purity (ADR) | 7 | 3.6% |
| Performance (Benchmark) | 4  | 2.1%       |
| **Total**            | 194   | 100%       |

> Note: `benchmarks/` (4 perf tests) are picked up by `node --test` and are CI-gated. No standalone "integration" suite exists; critical-path integration is covered by the smoke tests' 500-move deterministic loops.

### Execution Metrics

| Metric         | Current | Previous | Trend |
| -------------- | ------- | -------- | ----- |
| Pass Rate      | 100%    | n/a      | →     |
| Avg Duration   | ~11ms/test (2.2s full) | n/a | → |
| Flaky Tests    | 0       | n/a      | →     |
| Disabled Tests | 0       | n/a      | →     |

### Recent Run History

| Date       | Passed | Failed | Skipped | Duration |
| ---------- | ------ | ------ | ------- | -------- |
| 2026-08-20 | 194    | 0      | 0       | ~2.2s    |

---

## Quality Assessment

### Strengths

- **Deterministic by design** — every test seeds its RNG (`rngOf`, `mulberry32`), so no `Math.random`, `Date.now()`, `setTimeout`, or `sleep` appears anywhere in the suite. Flake risk is near zero.
- **Leak detection** — `assertNoLeak` (in `test-utils/helpers.ts`) verifies the render transition plan accounts for exactly the occupied cells, catching orphan-tile regressions automatically.
- **Architecture guards** — `engine.purity`, `storage.purity`, `ui.purity`, and `ui.gesture` tests enforce ADR-01/05 import boundaries (no RN/React/Skia/Expo leakage into pure logic), which is exactly what keeps `node:test` able to run the engine headless.
- **Characterization tests** — `line.test.ts` locks subtle `shiftLine` behavior (e.g. `[3,3,6,6] -> [6,6,6,null]`), so a future merge-logic change is caught.
- **Strong helper reuse** — `rngOf`, `staticBoard`, `boardWith`, `emptyBoard`, `occupiedCells`, `assertNoLeak` remove most boilerplate.

### Issues Found

| Issue | Severity | Count | Example | Recommended Fix |
| ----- | -------- | ----- | ------- | --------------- |
| Persistence layer untested (`settingsStore`) | Medium | 1 module | `loadBest`/`saveBest`/`saveSettings` | Inject store interface or extract pure parse/serialize; mock MMKV |
| React component layer untested | Medium | 3 components | `Hud`, `PauseButton`, `GameBoard` | Add RNTL + metro transform; test behavior, not internals |
| `App.tsx` gesture→move wiring only source-checked | Low | 1 | `ui.gesture.test.ts` | Add a behavior test for swipe-threshold→direction mapping |
| `useFrameRateBaseline` untested (RN-bound hook) | Low | 1 | frame callback stats | Test via reanimated test mocks if added |

### Anti-Patterns Detected

| Pattern   | Occurrences | Impact | Fix Effort |
| --------- | ----------- | ------ | ---------- |
| Hard-coded waits | 0 | none | n/a |
| Shared test state | 0 | none | n/a |
| Testing private implementation | 0 | none | n/a |
| Missing cleanup | 0 | none | n/a |
| Assertion-free tests | 0 | none | n/a |

---

## Coverage Analysis

### Feature Coverage Matrix

| Feature       | P0 Tests | P1 Tests | P2 Tests | Gap? |
| ------------- | -------- | -------- | -------- | ---- |
| Core move/merge engine | ✅ 67 | — | — | No |
| Spawn / weighted tile | ✅ 4 | — | — | No |
| Game-over detection | ✅ | — | — | No |
| Scoring (`matchScore`) | ✅ 8 | — | — | No |
| Ceiling / tier progression | ✅ 7 | — | — | No |
| Render transition plan | ✅ 16 | — | — | No |
| Save/Load (MMKV) | ⚠️ partial | — | — | **Yes (P1)** |
| Settings (theme/motion/lang/lane) | ⚠️ schema only | — | — | **Yes (P1)** |
| UI pure logic (layout/numerals/swipe/orientation) | ✅ 49 | — | — | No |
| UI components (Hud/Pause/GameBoard) | — | — | ⚠️ none | **Yes (P2)** |
| Asset manifest bundling | — | ✅ 3 | — | No |
| Perf budget (engine/frame/render) | ✅ 4 bench | — | — | No |

### Critical Gaps

| Gap | Risk | Impact if broken | Priority |
| --- | ---- | ---------------- | -------- |
| `settingsStore` read/write/parse (best + settings) | Medium | Silent loss/overwrite of high score or settings | P1 |
| `App.tsx` end-to-end gesture→move | Medium | Swipes stop working despite unit-passing engine | P2 |
| `Hud` / `PauseButton` / `GameBoard` | Low–Med | Visual/UX regression ships unnoticed | P2 |
| `useFrameRateBaseline` stats accuracy | Low | Wrong FPS/reduce-motion decisions | P3 |

### Coverage by Priority

```
P0 Coverage: 100% ████████████████████  (engine, spawn, scoring, game-over)
P1 Coverage:  70% ███████████████░░░░░  (settingsStore missing; ceiling/transition present)
P2 Coverage:  60% █████████████░░░░░░░  (UI logic present, components missing)
P3 Coverage:  40% ██████████░░░░░░░░░░  (RN-bound hooks untested)
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect            | Status | Notes |
| ----------------- | ------ | ----- |
| Tests in CI       | ✅ | `.github/workflows/ci.yml` runs `node --test` on PR + push to main |
| Results visible   | ✅ | GitHub Actions run output |
| Failures block    | ✅ | Job fails on any test/typecheck error |
| Nightly runs      | ❌ | Only event-driven (PR/push); acceptable at this size |
| Performance tests | ✅ | 4 benchmark tests, names assert CI-gated budgets (`<0.1ms`, `<0.2ms p99`, etc.) |

### Test Infrastructure Quality

| Component      | Quality | Notes |
| -------------- | ------- | ----- |
| Fixtures       | Good    | `helpers.ts` provides board/RNG builders reused across suites |
| Helpers        | Good    | `assertNoLeak`, `occupiedCells`, `staticBoard`, `boardWith` |
| Data factories | Good    | Seeded `mulberry32`/`rngOf` |
| Documentation  | Fair    | Tests are self-documenting via names; `AGENTS.md` present but no test README |

### Maintenance Burden

- Test update frequency: **low** — deterministic tests track behavior, not internals.
- Brittleness score: **low** — no DOM/timing dependence in the pure layer.
- Developer friction: **low** — single `node --test` command, no extra tooling.

---

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| ------ | ------ | ------ | ----- |
| Extract pure parse/serialize from `settingsStore` (or inject a `Store` interface) and add unit tests for `loadBest`/`saveBest`/`saveSettings`/`loadSettingsFromStorage` | ~1 day | High | Dev |
| Add an RNTL smoke test for `PauseButton` (renders, fires callback) as a pilot for the component layer | ~0.5 day | Medium | Dev |

### Short-term (This Milestone)

| Action | Effort | Impact | Owner |
| ------ | ------ | ------ | ----- |
| Add component tests for `Hud` and `GameBoard` | ~2 days | Medium | Dev |
| Add a behavior test for `App.tsx` swipe-threshold → direction mapping (currently only source-referenced) | ~1 day | Medium | Dev |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| ------ | ------ | ------ | ----- |
| Promote the informational coverage report to a tracked threshold if a target is agreed | ~weeks | High | Needs owner decision on % target |
| Consider nightly full-matrix run once component tests exist | ~weeks | Medium | Low priority at current size |

---

## Appendices

### Appendix A: Flaky Tests
None.

### Appendix B: Slow Tests
None. Full suite ~2.2s; longest single test (a benchmark measuring a median over many iterations) ~95ms. All far below the 30s/5s thresholds.

### Appendix C: Disabled Tests
None (no `.skip`/`.only`/disabled blocks found).

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| ---- | ----------- | ------ | -------- |
| `settingsStore` testability | Native MMKV import makes the persistence logic unreachable under `node:test`; inject a store or split pure logic | Medium | P1 |
| Component test harness | No RNTL/metro-transform configured; component layer is a blind spot | Medium | P2 |
| Test README | No document explaining suites, how to add a test, or the ADR-purity contract | Low | P3 |

---

## Next Review

**Scheduled**: 2026-09-20 (monthly full review)
**Focus Areas**: persistence-layer coverage, component-test adoption, any flake introduced by new RN-bound features.
**Success Criteria**: `settingsStore` has unit coverage; at least `PauseButton` + `Hud` have component tests; coverage report promoted from informational to a tracked gate.

---

## Resolution Update (2026-08-21)

The gaps identified above were actioned. Status:

| Original Gap | Action | Status |
| ------------ | ------ | ------ |
| `settingsStore` save/load untested (P1) | Refactored to inject a `StorageBackend` (`setStorageBackend`) + extracted pure `parseBest`; added 16 unit tests (`__tests__/storage/settingsStore.test.ts`) with a fake backend | ✅ Resolved |
| UI component layer untested (PauseButton, Hud) | Added headless component tests via `react-test-renderer` + a `react-native` stub (`test-utils/rn-stub.ts`, mapped through `tsconfig.test.json` `paths`); `PauseButton` (4) + `Hud` (4) tests | ✅ Resolved |
| `App.tsx` gesture→move only source-checked | Added `__tests__/ui/gesture-pipeline.test.ts` (6) exercising the real `resolveSwipeDirection` + `move` contract (right/left merge, sub-threshold noop, diagonal tie, in-flight busy gate) plus a wiring-presence check against `App.tsx` | ✅ Resolved |
| `GameBoard` (Skia + reanimated) untested | Deferred — requires mocking `@shopify/react-native-skia` and `react-native-reanimated`; disproportionate for a headless unit test. Consistent with the project's convention of leaving RN-bound modules to native testing. | ⏸ Deferred |

### Infrastructure added
- `tsx` loader + `react-test-renderer` (devDeps). `package.json` `test`/`benchmark` now run `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`.
- `tsconfig.test.json` (extends base, adds `paths` mapping `react-native` → `test-utils/rn-stub.ts`) so the app `tsc --noEmit` typecheck is unaffected.
- `.github/workflows/ci.yml` updated to run tests under tsx.

### Verification
- `npm test`: **224 pass / 0 fail** (194 prior + 16 settingsStore + 6 gesture + 4 PauseButton + 4 Hud).
- `npx tsc --noEmit`: passes.
