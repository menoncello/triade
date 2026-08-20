# Test Review Report: triade (3-clone RN rewrite)

**Scope:** `triade/` — React Native / Expo / TypeScript rewrite (`node:test`, Node 26 TS-stripping).
**Reviewer:** Game QA Lead (automated review)
**Date:** 2026-08-20
**Suite command:** `cd triade && node --test`

---

## Executive Summary

- **Overall health:** Good — a well-engineered, deterministic, fast suite with unusually strong architectural guards.
- **Key findings:**
  1. 167 tests, **100% passing**, ~2.3s total. No skips, no todos, no disabled tests.
  2. Excellent determinism and isolation: every random path uses injected RNG (`rngOf` / `mulberry32`); board immutability is asserted.
  3. Standout regression protection: a **differential parity suite** pins the TS engine byte-for-byte to the frozen web reference (`js/game.js`), plus a **suite-parity guard** that forbids silent drift between the two suites.
  4. Strong **architectural tripwires**: auto-scanned ADR-01/05 purity guards, thin-view import guards, and a render **no-leak oracle** (`assertNoLeak`) run across hundreds of random moves.
  5. **Gaps:** several runtime-bound modules (`GameBoard.tsx`, `useFrameRateBaseline.ts`, `settingsStore.ts` I/O, `Hud`/`PauseButton` behavior) have only structural/static tests and rely on manual simulator validation; performance **benchmarks are wired into the default test run** and are timing-sensitive.
- **Recommended actions (prioritized):** split benchmarks to a nightly run; add integration smoke tests for `settingsStore` I/O and the render prop mapping; add a `mulberry32` seed-sequence assertion; stand up CI with flaky/slow tracking.

---

## Metrics

### Test Suite Statistics

Run: `cd triade && node --test` → **167 tests / 167 pass / 0 fail / 0 skip / 0 todo / 2333 ms**.

| Layer / Type            | Files | Tests (approx) | Notes |
| ----------------------- | ----- | -------------- | ----- |
| Engine core (rules)     | 1 (`game.test.ts`)        | 26  | Full I/O matrix + trace contract |
| Engine smoke            | 1 (`engine.smoke.test.ts`)| 4   | 500-move fuzz, game-over path |
| Engine parity (TS⇄web)  | 2 (`*.parity`, `*.suite-parity`) | 10 | Differential oracle + suite-drift guard |
| Engine purity/structure  | 1 (`engine.purity.test.ts`)| 5  | Auto-scanned ADR-01 imports |
| Engine ceiling/tiers    | 1 (`ceiling.test.ts`)     | 5   | Tier boundaries |
| Render (transition plan)| 1 (`transitionPlan.test.ts`)| 14 | slide/merge/spawn/hold + no-leak |
| Render smoke            | 1 (`render.smoke.test.ts`)| 5   | 500-move critical path, all transition types |
| Game (score)            | 1 (`matchScore.test.ts`)  | 8   | Best tracking, record signal |
| Storage (schema/keys/entitlements/purity) | 4 | 23 | Defensive load, keyspace, merge |
| UI (layout/orientation/swipe/tileNumerals/purity/thinview/gesture) | 7 | ~61 | Behavioral + structural guards |
| Assets (manifest)       | 1 (`assetManifest.test.ts`)| 3  | No remote/CDN |
| Benchmarks (perf)       | — (inline `benchmark:`)   | 4   | engine / frame-logic / transition-plan / settings |
| **Total**               | **20** | **~167** | |

> Per-file counts are approximate where files were sampled; the authoritative total is the `node --test` run above.

### Recent History

No CI history is available in the repo, so pass-rate trend, flaky-test frequency, and slow-test drift **cannot be measured**. This is itself a finding (see R6).

---

## Quality Assessment

### Strengths

- **Deterministic:** 100% seeded RNG; `Math.random` is never used in tests. `pickIndex` clamping is explicitly tested.
- **Isolated:** Shared fixtures (`emptyBoard`, `staticBoard`, `boardWith`, `rngOf`) live in one `test-utils/helpers.ts`; no cross-test shared state. Input-board immutability is asserted in both the unit and parity suites.
- **Fast:** Entire suite in ~2.3s; individual tests are sub-millisecond to low-double-digit ms.
- **Readable:** Tests are named by scenario and expected outcome (`MERGE_1_2`, `NO_1_1_MERGE`, `ONE_CELL right`), and tagged with priority (`[P0]`/`[P1]`/`[P2]`) and story/AC references.
- **Valuable:** Tests assert real behavior (boards, scores, traces, tiers, layout math), not implementation trivia. The trace contract and the no-leak oracle catch real rendering regressions.
- **Architectural guards as tests:** Purity/import scans, thin-view guards, gesture-threshold wiring guard, and suite-parity guard turn architectural rules into executable tripwires — a notable maturity signal.

### Issues Found

| # | Issue | Severity | Tests Affected | Fix |
| - | ----- | -------- | -------------- | --- |
| R1 | **Benchmarks run in the default suite.** 4 `benchmark:` tests assert CPU-timing thresholds (engine <0.1ms, frame-logic p99 <0.2ms, transition-plan p99 <0.1ms, settings round-trip <0.1ms). These are machine-load sensitive and can **flake on CI** or inflate the default time budget. | Med | 4 (benchmark) | Move to `node --test benchmarks/` (nightly); assert medians with wider tolerance, not p99 hard caps. |
| R2 | **Runtime-bound modules lack behavioral coverage.** `src/render/GameBoard.tsx` and `src/render/useFrameRateBaseline.ts` have *no* automated test (exempt under ADR-05, validated manually). A regression in the Skia draw or frame-rate baseline would not fail CI. | High | 0 (covered only by manual validation) | Add a component-level smoke (e.g., render `<GameBoard>` with a known plan → assert emitted draw commands or a snapshot) and a `useFrameRateBaseline` pure-function extract that *is* unit-tested. |
| R3 | **`settingsStore.ts` I/O is untested.** Only the `STORAGE_KEYS` export is asserted (`keyspace.test.ts`). Actual read/write via MMKV (load/save settings + best score) has no automated test; it relies on manual simulator checks. | High | 0 (store I/O) | Extract a pure, MMKV-free persistence core (mirror the schema.ts pattern) and unit-test load/save round-trips + best-score persistence. |
| R4 | **`Hud.tsx` / `PauseButton.tsx` behavior is untested.** Only import-shape and `HIT_TARGET` are guarded. Layout composition, pause toggling, etc. are manual-only. | Med | 0 (behavior) | Add render smoke tests (e.g., React Testing Library / RNTL) for the HUD wiring once a test host is available. |
| R5 | **`matchScore` ↔ engine ↔ storage integration is untested.** `matchScore` is tested in isolation; no test feeds `move().score` into `applyMove` and persists `best` through `settingsStore`/`initialScore`. | Med | 0 (integration) | Add one integration test: seeded moves → `applyMove` → persist best → reload → `initialScore` reflects it. |
| R6 | **No CI / no flaky-or-slow telemetry.** Cannot detect regressions in stability or speed over time. | Med | n/a | Stand up CI running `node --test`; record durations; alert on new skips/flakes. |
| R7 | **`mulberry32` PRNG is untested.** It is the seed source for *every* randomized scenario. A bug in the PRNG would shift all seeded outputs yet still pass (outputs are compared to themselves). | Low | 0 (PRNG) | Add a known-seed sequence assertion (e.g., `mulberry32(1)` → first 3 values == expected constants). |
| R8 | **Parity coupling is a hard cross-package dependency.** `engine.parity.test.ts` requires `../../../js/game.js` and `engine.suite-parity.test.ts` parses `../../../test/game.test.js`. The triade suite cannot run green if the root PWA is refactored/removed, and both suites must stay in lockstep. Also, parity **passes if both engines share a bug** (documented in-file). | Low (documented) | parity (10) | Keep the absolute unit suite as the source of truth (already noted in comments); document the coupling in CI and gate root refactors on triade parity. |

### Anti-Pattern Scan

- **Hard-coded waits:** none found.
- **Shared mutable state:** none found; fixtures are rebuilt per test.
- **Testing private implementation:** not observed; tests assert public contracts (boards/scores/traces/layout).
- **Missing cleanup:** N/A (no DOM/teardown needed in `node:test` pure modules).
- **Assertion-free tests:** none; every test has at least one `assert`.

---

## Coverage Analysis

### Current Coverage (by feature area)

| Area          | P0 Coverage | P1 Coverage | Gap? |
| ------------- | ----------- | ----------- | ---- |
| Core loop / engine rules | ✅ Full I/O matrix | ✅ Trace, immutability, parity | None |
| Save/Load (persistence) | ⚠️ Keyspace + schema only | ❌ Store I/O, best-score round-trip | **Gap (R3)** |
| Progression (ceiling/tiers) | ✅ `ceiling.test.ts` | ✅ All boundaries | None |
| Render (transition planning) | ✅ `transitionPlan.test.ts` | ✅ No-leak oracle | **Gap (R2)** actual draw |
| UI / Menus | ⚠️ Structural guards | ❌ Behavior | **Gap (R4)** |
| Multiplayer | N/A (single-player) | N/A | N/A |
| Platform cert / native | ⚠️ Manifest no-CDN guard | ❌ Native runtime | Manual (acceptable per ADR-05) |

### Critical Gaps (prioritized)

1. **P0 — Persisted state correctness (R3):** storage read/write and best-score persistence are the only untested *logic* paths that affect player progress. Highest player impact.
2. **P0 — Render correctness (R2):** the Skia `GameBoard` is the thing the player sees; only its inputs (the plan) are tested.
3. **P1 — Integration (R5):** engine→score→storage wiring.
4. **P1 — Stability (R1, R6):** benchmark flakiness + missing CI telemetry.
5. **P2 — PRNG + coupling (R7, R8):** cheap hardening.

---

## Recommendations

### Immediate (This Sprint)
1. **R3 (High):** Extract a pure persistence core in `settingsStore.ts` and unit-test load/save + best-score round-trip. (Mirror `schema.ts`.)
2. **R2 (High):** Add a `GameBoard` render smoke + a unit-testable `useFrameRateBaseline` pure extract.
3. **R1 (Med):** Move the 4 `benchmark:` tests out of the default `node --test` into a nightly/separate run with median-based, tolerance-loose assertions.

### Short-term (This Milestone)
4. **R5 (Med):** Add one engine→`matchScore`→storage integration test.
5. **R4 (Med):** Add RNTL render smokes for `Hud`/`PauseButton` once a test host is configured.
6. **R6 (Med):** Stand up CI running `node --test`; capture durations; alert on skips/flakes.

### Long-term (Ongoing)
7. **R7 (Low):** Add a `mulberry32` known-seed assertion.
8. **R8 (Low):** Document the triade⇄root parity coupling in CI; gate root `js/game.js` refactors on triade parity staying green.
9. **Coverage matrix:** Maintain the area table above as a living doc; review quarterly.

---

## Appendix

### Flaky Tests
None detected in a single run. **Cannot confirm absence without CI history (R6).** The benchmark tests (R1) are the most likely future flake source.

### Slow Tests
Slowest observed: `transition-plan cost per move` benchmark (~100ms, expected) and the `ui.thinview`/`ui.gesture` source-scan guards (~7–28ms, one-time file reads). All within budget; the 100ms figure is a *measured* benchmark, not a timeout.

### Disabled Tests
None (0 skipped, 0 todo, 0 `skip()`/`todo()`).

### Modules with No Behavioral Test
- `src/render/GameBoard.tsx` (RN/Skia — manual)
- `src/render/useFrameRateBaseline.ts` (RN hook — manual)
- `src/services/storage/settingsStore.ts` (MMKV I/O — only `STORAGE_KEYS` shape tested)
- `src/ui/Hud.tsx`, `src/ui/PauseButton.tsx` (RN views — only import/`HIT_TARGET` guards)
- `src/utils/mulberry32.ts` (PRNG — used everywhere, not directly asserted)
