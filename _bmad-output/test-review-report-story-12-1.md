# Test Review Report: Story 12.1 — Spawn no lado oposto das linhas movidas

**Workflow**: gds-test-review · **Scope**: targeted (story 12.1 test surface) · **Date**: 2026-08-25
**Reviewed by**: Game QA Lead (gds-test-review) · **Engine**: Custom TS pure-engine + RN thin views (`node:test` via `tsx`)
**Config**: user Eduardo · output English · experience intermediate
**Baseline commit**: `d7fc9b0c4f2fcd557c459f92dade6a79c841a870` · **Story artifact**: `_bmad-output/implementation-artifacts/12-1-spawn-no-lado-oposto-das-linhas-movidas.md` (review)

---

## Executive Summary

- Overall health: **Good**
- Key findings:
  1. **All 7 acceptance criteria are fully pinned** at the correct test level with named `[P0] AC{n}` traceability. The story redefines spawn placement from *uniform all-empty* (superseded 2-6 AC2) to *directional opposite-edge of each moved line* — every AC is exercised by isolated unit, live-move integration, fixture E2E, and smoke layers without duplication against the baseline 11-test acceptance suite `spawn-placement.test.ts:1`.
  2. **60 tests cover the story**. 49 new tests (25 unit + 13 integration + 5 E2E + 6 smoke) plus the 11-test acceptance suite and rewritten drift tripwire in `adaptive-spawn-integration.test.ts:158` all pass. Full suite **396 pass / 0 fail / 0 skip** (~2.6 s) verified live during this review; 12.1-isolated surface 50 pass when filtered (`line-moved|spawn-candidates|directional-spawn`), 60 when including `spawn-placement`.
  3. **Draw-budget contract is preserved and pinned exactly**: effective move = 3 draws (cell among candidates, next value, displayRoll — `types.ts:7`), `spawnTile` cell pick = 1 draw, noop = 0 draws. Order AND count are asserted via `spyRng` (`helpers.ts:40`) in both unit and integration layers — any reorder of cell/value/pending fails loudly.
  4. **No flaky, slow, or disabled tests**. All statistical gates are seed-fixed with `mulberry32` and a 5σ tolerance helper `sigmaBound` (`helpers.ts:103`), so drift fails deterministically rather than intermittently. Slowest in surface is the 6k-sample uniformity integration at ~36 ms; whole suite median per-test ~6 ms.
  5. **Anti-pattern scan clean** at the story level — no hard-coded waits, no shared mutable state, no private-field probing, no assertion-free tests, no orphan fixtures. Two low-severity code-hygiene observations remain (orphan helper reference, duplicated oracle) with fixes drafted below.
- Recommended actions (prioritized):
  1. *(Immediate)* None blocking — suite green at 396; all AC1–AC7 green.
  2. *(Short-term, hygiene ~30 min)* Remove the dead helper reference in E2E and consolidate the duplicated `eligibleOppositeCells` oracle.
  3. *(Long-term)* When adding future directional features, extend the existing `eligibleOppositeCells` derivation pattern rather than building parallel harnesses; keep 12.1 as the single source of truth for opposite-edge eligibility.

## Metrics

### Test Suite Statistics

| Type | Count (12.1 surface) | Pass Rate | Avg Duration |
| --- | --- | --- | --- |
| Unit — `line.moved` (`line-moved.unit.test.ts:1`) | 13 | 100% | <1 ms each |
| Unit — `spawn candidates` (`spawn-candidates.unit.test.ts:1`) | 12 | 100% | <3 ms each (statistical loops ~9 ms) |
| Acceptance — `spawn-placement.test.ts:1` (AC1–AC6, story-owned) | 11 | 100% | <1 ms each (seeded-drift ~6 ms) |
| Integration — directional `move` pipeline (`directional-spawn.integration.test.ts:1`) | 13 | 100% | ~1 ms each (6k-uniform ~36 ms) |
| E2E — fixture pipeline (`directional-spawn.e2e.test.ts:1`) | 5 | 100% | ~8 ms each |
| Smoke — critical path (`directional-spawn.smoke.test.ts:1`) | 6 | 100% | ~2 ms each |
| **New 12.1 surface (automation pass 2026-08-25)** | **49** | **100%** | **<200 ms per suite** |
| **Total acceptance surface (new + AC-owned)** | **60** | **100%** | — |
| **Full suite (all stories, context)** | **396** | **100%** | **2643 ms total** |

### Recent History

- Story baseline pre-12.1 (epic 2 end): 347 pass / 0 fail.
- Post-implementation (`implementation-artifacts/12-1`): 347 pass (acceptance suite 11 + rewritten tripwire green).
- Post-automation (`automation-summary-12-1.md:5`): **396 pass / 0 fail / 0 skip** (+49). This review re-ran and confirmed 396/0.
- Isolated filtered run (`--test-name-pattern="line-moved|spawn-candidates|directional-spawn"`): **50 pass** (12.1-isolated excluding `spawn-placement`); with the acceptance suite included, 60 pass.
- Flaky tests: **none detected** — deterministic `rngOf`/`spyRng`/`mulberry32` throughout; `grep -r "test.skip\|test.todo"` → 0.
- Slow tests (>30 s): none. Slowest items in this review: `engine.bench`/`render.bench` ~114 ms each (out of scope), story-level slowest ~36 ms (6k-uniform integration).
- Disabled/skipped: **zero**.
- Type gates: `tsc -p tsconfig.json --noEmit` and `tsc -p tsconfig.test.json --noEmit` clean (other than baseUrl deprecation notice noted in 7.x reports).

### Recent Run History (this review)

| Date | Passed | Failed | Skipped | Duration |
| --- | --- | --- | --- | --- |
| 2026-08-25 (full suite, `npm test`) | 396 | 0 | 0 | 2643 ms |
| 2026-08-25 (filtered 12.1 surface) | 50 | 0 | 0 | 2138 ms (includes other matching suites) |
| 2026-08-25 (pre-automation baseline, per `automation-summary-12-1.md:5`) | 347 | 0 | 0 | ~3.0 s |

---

## Quality Assessment

### Strengths

- **Deterministic**: every 12.1 test is seed-fixed or script-drawn. `spyRng` (`helpers.ts:40`) throws on over-draw so draw-budget drift fails loudly; `rngOf` (`helpers.ts:28`) falls back to 0.5 only for pure boards in smoke probes, never in draw assertions; statistical tests use `mulberry32:1` with `sigmaBound:103` (5σ) rather than fixed ±ε windows.
- **Isolated**: each case builds its own `boardWith`/`gameState`/`spyRng`/`fixture` locally. No module-level shared board; `board.map(r=>r.slice())` copies are consistent across unit/integration/E2E. E2E `try/finally teardown` with storage reset (`GameE2ETestFixture.ts:147`) guarantees no leak to the next fixture (verified by fresh-seed launch after teardown in `directional-spawn.e2e.test.ts:56`).
- **Fast**: 49 new tests complete in <200 ms aggregate; full suite 396 in 2.6 s (CI-friendly). No hard waits; `waitFor` (`asyncAssertions.ts`) is used with 50 ms timeout only in the E2E timeout-message pin.
- **Readable**: `[P0] AC{n}` / `[P1]` prefixes map 1:1 to `implementation-artifacts/12-1:19` ACs; helper names `eligibleOppositeCells`/`spawnedCellOf` document intent; assertions carry messages (`spawn ${cell} must be in filtered pool`, `effective ... must have non-empty candidate set`).
- **Valuable**: tests pin *behavior*, not internals. The most valuable is `directional-spawn.integration.test.ts:210` (draw-budget) + `242` (live-move 6k uniform) — they prove the *same* `move()` path that the player drives obeys the 3-draw / uniform-candidate contract end-to-end, not merely `spawnTile` in isolation. The `spawn-candidates.unit.test.ts:13` omitted-vs-provided backward-compat block protects the non-move caller path.
- **Anti-pattern-free (at contract level)**: no `Task.Delay`/`Thread.Sleep`-style waits, no `static wasSetup`, no `GetPrivateField` probing, no orphan `var go = Instantiate(prefab)` patterns, no assertion-free tests (every test has `assert.ok/strictEqual/deepStrictEqual` with messages where non-obvious).

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| --- | --- | --- | --- |
| **I-1 — Dead helper reference in E2E stochastic session** `directional-spawn.e2e.test.ts:95-96` declares `const movedBefore = diffCells; void movedBefore;` — a no-op that survives review and misleads readers into thinking `diffCells:33` is conditionally used before `eligible` is derived. | Low (hygiene / readability) | 1 (E2E 120-move session) | Delete the two lines. `diffCells` is already properly used at `directional-spawn.e2e.test.ts:116,130,165`. One-line edit. |
| **I-2 — Table case dead-code / fixup indirection in `line-moved` parity** `line-moved.unit.test.ts:119` contains `expectedLine: [1, 3, null, null] ? [1, 3, null, null] : [1, 3, null, null]` (ternary that always yields the same array), compensated by a `fixed` map at `:122-127` that repairs `expectedMoved`. Demonstrates a placeholder that was partially patched — confusing and leaves a branch never exercised. | Low (readability / future copy-paste hazard) | 1 (parity table) | Replace the case inline with `{ input: [1,3,null,null], expectedMoved: false, expectedLine: [1,3,null,null] }` and delete the `fixed` remapping block; keep the comment "already left-aligned, no gap, no merge → false". |
| **I-3 — Duplicated `eligibleOppositeCells` oracle in 4 files** `spawn-placement.test.ts:19`, `directional-spawn.integration.test.ts:15`, `directional-spawn.e2e.test.ts:17`, `directional-spawn.smoke.test.ts:12` each re-derive the oracle via `movementLines+shiftLine` value-compare. Identical but divergent risk (one already adds redundant `shifted.some(v!==orig)` at `spawn-placement.test.ts:25`). | Low (maintainability / drift risk) | 4 | Extract a single shared helper `oppositeEdgeCandidates(board, dir)` into `test-utils/helpers.ts` (adjacent to existing `preSpawnBoardOf:113` and `sigmaBound:103`), re-export for all suites, and keep the original value-compare derivation (`orig.some(v!==shifted)`) as the canonical definition (matches `line.ts:67`). Update the divergent variant to remove the redundant second clause. |
| **I-4 — Dynamic import inside smoke loop** `directional-spawn.smoke.test.ts:71` does `await import('../../src/engine/core/index.ts')` inside a for-loop to probe effective direction. Functionally green but needlessly re-modules and serializes via async in a smoke path that claims <150 ms. | Low (style / perf noise) | 1 (smoke) | Hoist `pureMove` to the top-level static import (`import { move as pureMove }`) and use it synchronously in the loop; smoke keeps its budget justification. |
| **I-5 — Candidates param out-of-bounds not exercised** `spawn.ts:83` filters `candidates` by direct board index without bounds guard. Production path is safe (candidates derived only from `shifted[i].moved` with `oppCol/oppRow` at `game.ts:55,60`), but a future caller passing `[-1,0]` or `[4,4]` would throw on `board[r][c]` access. No test pins the `engine-never-throws` posture for this edge. | Low / Accepted (hypothetical, not reachable via current call sites) | `spawn-candidates.unit.test.ts` gap | Accepted — do not add a guard or test unless a second caller is introduced. Document the invariant in `spawn.ts:58` note ("callers must supply in-bounds cells; production path guarantees this via opposite-edge derivation"). |
| **I-6 — Pre-existing TS `baseUrl` deprecation (non-12.1)** inherited from 7.x reports (`deferred-work.md`). | Low / Accepted | — | Accepted; waived per prior reports; default `tsc` gate is clean. |

No High- or Medium-severity open issues. I-1–I-4 are hygiene with draft fixes; I-5–I-6 are accepted with mitigation.

### Anti-Patterns Detected

| Pattern | Occurrences (12.1 surface) | Impact | Fix Effort |
| --- | --- | --- | --- |
| Hard-coded waits (`await Task.Delay`) | 0 | — | — |
| Shared test state (`static wasSetup`) | 0 | — | — |
| Testing private implementation (`GetPrivateField`) | 0 — all 12.1 tests use public `move`/`spawnTile`/`shiftLine`/`boardFromLines`/`planTileTransitions` | — | — |
| Missing cleanup (leaked `Board`/`Fixture`) | 0 — every E2E/smoke fixture test has `try/finally teardown`; boards copied via `map(r=>r.slice())` | — | — |
| Assertion-free tests | 0 — every new test carries descriptive `assert.*` | — | — |

---

## Coverage Analysis

### Feature Coverage Matrix (Story 12.1 ACs)

| AC | Criterion (per `implementation-artifacts/12-1:19`) | Coverage | Gap? |
| --- | --- | --- | --- |
| AC1 | Directional placement `left→col3, right→col0, up→row3, down→row0` | **FULL** — acceptance per-direction `spawn-placement.test.ts:46/59/72/86`; unit `moved` gating `line-moved.unit.test.ts:58/65`; integration per-direction live `move()` `directional-spawn.integration.test.ts:41/58/71/84`; parameterized all-directions table `:342`; smoke `directional-spawn.smoke.test.ts:88` directional invariant over 200 moves; E2E stochastic 120-move via busy gate `directional-spawn.e2e.test.ts:84` + per-direction contract `:158` | No |
| AC2 | Only moved lines eligible; unchanged line never spawns | **FULL** — acceptance AC2 `spawn-placement.test.ts:106,126` (seeded drift 5k); spawn unit filter `spawn-candidates.unit.test.ts:66` (occupied candidates never selected over 6k draws); integration horizontal+vertical `directional-spawn.integration.test.ts:103,125`; tripwire rewritten `adaptive-spawn-integration.test.ts:158` (directional tripwire, 5k stream, 0 off-edge) | No |
| AC3 | Uniform among candidates, exactly 1 rng draw for cell pick | **FULL** — spawn unit statistical 6k `spawn-candidates.unit.test.ts:13,66`; integration statistical 6k 2-way `directional-spawn.integration.test.ts:242` + 5σ `sigmaBound`; draw-budget pin `directional-spawn.integration.test.ts:210` (`spyA.calls [0,0.2,0.3]` cell+next value+displayRoll) | No |
| AC4 | No fallback needed: effective→non-empty candidate set (cell non-null); noop→no spawn, 0 draws | **FULL** — integration AC4 table `directional-spawn.integration.test.ts:152` (4 directions) + noop guard `:189`; acceptance AC4 `spawn-placement.test.ts:206`; smoke 200-move invariant `directional-spawn.smoke.test.ts:112` (`eligible.length>0` on every effective) | No |
| AC5 | Value+preview unchanged, `spawnTile(candidates?)` backward compat, provided-but-empty→nulls 0 draws, place-not-roll | **FULL** — spawn unit omitted vs provided-with-all-empties equivalence `spawn-candidates.unit.test.ts:266`; empty pool 0-draw `spawn-candidates.unit.test.ts:123,144`; place-not-roll invariant `spawn-candidates.unit.test.ts:201`; acceptance AC5 `spawn-placement.test.ts:238,255` | No |
| AC6 | `move` shape unchanged `{board,score,moved,trace,pendingSpawn}`, spawn in `trace.spawned:true` | **FULL** — acceptance shape `spawn-placement.test.ts:277` + integration trace+render-plan `directional-spawn.integration.test.ts:282` (`planTileTransitions`→`resultingTiles`≡`occupiedCells`); smoke shape `directional-spawn.smoke.test.ts:32,106` | No |
| AC7 | Tests updated: tripwire rewritten + `spawn-placement.test.ts` | **FULL** — pre-existing acceptance 11 stays green post-12.1 (verified); tripwire redefinition at `adaptive-spawn-integration.test.ts:158` asserts directional (100% on `(0,3)` over 5k); this review adds 49 complementary tests without duplicating AC7 | No |

### Story-Level Critical Gaps

1. ~~Directional placement off-edge / board-wide uniform regression~~ **CLOSED** — 12.1 redefinition is enforced by 60 tests including a 5k-drift tripwire that would fail any regression to uniform.
2. ~~Only-moved-lines eligibility~~ **CLOSED** — filtered-to-empty + horizontal+vertical + e2e fixture paths all assert unchanged lines never receive spawn.
3. ~~Draw-budget divergence~~ **CLOSED** — the ordered 3-draw pin and 1-draw cell-pick plus omitted-vs-candidate equivalence guarantee the budget survived the candidate derivation.
4. **Remaining by invariant** — gaps are Low/Accepted (I-5 bounds guard) or hygiene (I-1–I-4); no P0/P1 critical gap remains on the AC surface.

### Critical Areas (project-context) — 12.1 relevance

| Area | P0 Coverage (12.1) | P1 Coverage (12.1) | Gap? |
| --- | --- | --- | --- |
| Core Loop (move→merge→spawn→trace→render) | FULL — `move` directional candidate derivation (`game.ts:31`), `boardFromLines+spawnTile` equivalence (`integration:309`), `planTileTransitions`/`resultingTiles` no-leak (`integration:282`) | FULL — 200-move loop (`smoke:88`), 120-move fixture session (`e2e:84`) | No |
| Save/Load | P1 — smoke save/load round-trip via persistence gate (`smoke:138`) incl. degraded-hydration blocks-overwrite | — | No (out of 12.1 primary scope; retained as smoke hygiene) |
| Progression / Spawn distribution (pot/tier) | FULL — existing `adaptive-spawn-integration.test.ts:183` (10k 40/40/20 + N3 + `displayRoll` mean) unaffected by 12.1 | — | No |
| Performance | 12.1 adds only candidate derivation loop `(game.ts:53)`, well within `<2 ms` per-turn budget (`architecture:193`); benchmark preserved at 396-pass gate | — | No |
| UI/Menus | — (UI thin-view boundary pinned elsewhere, `ui.norolls`/`ui.purity`) | — | No (engine-only story per dev notes) |
| Multiplayer / Platform Cert | — (out of scope) | — | — |

### Coverage by Priority

```
P0 Coverage: 100% ██████████  (all AC1–AC6 acceptance conditions have ≥3 independent pins)
P1 Coverage: 100% ██████████  (uniform/draw-budget/statistical + fixture/E2E)
P2 Coverage:  n/a ░░░░░░░░░░  (performance/plumbing; benchmark out of 12.1 scope)
P3 Coverage:  n/a ░░░░░░░░░░
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect | Status | Notes |
| --- | --- | --- |
| Tests in CI | ✅ | `triade/package.json` `test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` (single gate) |
| Results visible | ✅ | `npm test` plain output + `automation-summary-12-1.md:51` per-suite breakdown |
| Failures block | ✅ | `implementation-artifacts/12-1:117` — suite must stay 347→396 green |
| Nightly runs | ✅ (inferred) | Benchmark suites (`engine.bench.test.ts`, `render.bench.test.ts`) present and ~114 ms; device p99 gate documented at `architecture:193` |
| Performance tests | ✅ | `benchmarks/*.bench.test.ts` asserting `<2 ms` per turn, `<16.7 ms` device p99 |

### Test Infrastructure Quality

| Component | Quality | Notes |
| --- | --- | --- |
| Fixtures | Good | `GameE2ETestFixture.ts:1` — `launch`/`doMove`→`move`→busy gate→`settle`→`syncPersistence`→`snapshot`→`teardown`; ADR-06 copy discipline in `lastMoveGuard:151` |
| Helpers | Good | `helpers.ts:1` — `boardWith`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`sigmaBound`/`runSeededSession`/`preSpawnBoardOf` shared and stable |
| Data factories | Good | Deterministic board fixtures; no `faker` needed for pure engine |
| Documentation | Good | `automation-summary-12-1.md:1` covers scope/test distribution/execution/AC mapping/validation checklist; `atdd-checklist-12-1.md:1` covers red-phase scaffolds |
| Helpers reuse | Good | Draw-budget helper `spyRng` now single-export (no per-file duplication) |

### Maintenance Burden

- Test update frequency: **low** — engine is single source of truth (ADR-06); 12.1 touched only `line.ts:38` (`moved`), `spawn.ts:65` (`candidates?`), `game.ts:31` (candidate derivation); helpers are stable pure functions.
- Brittleness score: **low** — `eligibleOppositeCells` derives expected state from the same `shiftLine` semantics the engine uses, so a future `line.ts` refactor must keep value-equality semantics to stay consistent (intentionally coupled). No hard-coded cell lists.
- Developer friction: **low** — `npm test` covers all suites in 2.6 s; smoke/e2e use existing `test-utils/e2e/*` infra with no new external deps.

---

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| None blocking — 60-test AC surface green; full suite 396/0. Follow hygiene below to prevent drift. | — | — | — |

### Short-term (This Milestone)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| **R-1**: Remove dead `movedBefore` reference at `directional-spawn.e2e.test.ts:95-96` (delete two lines) | 5 min | Low — readability | QA |
| **R-2**: Normalize parity table at `line-moved.unit.test.ts:119-127`: inline `[1,3,null,null]`→`moved:false` and delete `fixed` remap | 10 min | Low — prevents copy-paste confusion | QA |
| **R-3**: Extract shared `oppositeEdgeCandidates(board,dir)` to `test-utils/helpers.ts` and replace the 4 duplicated oracles (consolidate divergent `shifted.some` variant in `spawn-placement.test.ts:25` to the canonical `orig.some(v!==shifted)`) | 20 min | Medium — eliminates drift risk across unit/integration/E2E/smoke | QA |
| **R-4**: Hoist smoke probe `pureMove` to top-level import at `directional-spawn.smoke.test.ts:4` (remove `await import` in loop) | 5 min | Low — keeps smoke budget faithful | QA |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| --- | --- | --- | --- |
| Keep `eligibleOppositeCells` pattern as the single oracle for opposite-edge eligibility for any future directional story (e.g. Epic 12 follow-ups) | n/a | High (guard against parallel harnesses) | Already documented by this review |
| When a second `spawnTile` caller is introduced, add an in-bounds guard test and normalize the `candidates` error shape (I-5) | — | Medium | Do NOT add premature guard now — production path is in-bounds by construction |
| Track the `tsconfig.test.json` `baseUrl` deprecation waiver (inherited) | — | Low | Waived per 7.x reports; default CI gate clean |

---

## Appendix

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --- | --- | --- | --- |
| — (none detected) | — | — | — |
| Rationale: all 12.1 statistical tests are seed-fixed (`mulberry32`), use 5σ `sigmaBound` windows, and counts are deterministic per seed. Re-running the filtered 50-test surface in this review was stable. | | | |

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --- | --- | --- | --- |
| `integration AC3: uniform among candidates on the live move path (6000 runs)` `directional-spawn.integration.test.ts:242` | ~36 ms (in filtered run ~230 ms total with outer suites) | Integration (statistical) | None — in budget; move to nightly only if suite exceeds 10 s |
| `spawn-candidates omitted candidates: 4000 runs` `spawn-candidates.unit.test.ts:13` | ~8 ms per test | Unit (statistical) | None — fast; statistical depth justifies duration |
| Story slowest overall (filtered): `directional-spawn.integration` suite ~230 ms | — | — | None — whole 49-test surface <200 ms excluding global benchmark peers |
| Pre-existing benchmark peers (`engine.bench`/`render.bench` ~114 ms) are out of 12.1 scope and unchanged. | | | |

No test >30 s individually. Full suite 396 in 2643 ms.

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --- | --- | --- | --- |
| — (none) | — | `grep -r "test.skip\|test.todo\|\\.skip(" triade/` → 0 | — |

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| --- | --- | --- | --- |
| ~~12.1 AC2 uniform-random off-edge tripwire~~ | Was board-wide uniform; **CLOSED** this story via rewritten `adaptive-spawn-integration.test.ts:158` + 11-test `spawn-placement.test.ts` + 49 cross-layer pins | — | **CLOSED** |
| I-1 | Dead `movedBefore` reference in E2E stochastic session | 5 min | Low |
| I-2 | Parity table dead ternary + `fixed` compensation | 10 min | Low |
| I-3 | 4-file `eligibleOppositeCells` duplication (drift risk) | 20 min | Low-Med |
| I-4 | `await import` in smoke probe loop | 5 min | Low |
| I-5 | Out-of-bounds `candidates` not pinned (accepted — unreachable) | — | Accepted |
| I-6 | `tsconfig.test.json` baseUrl deprecation (pre-existing waiver) | — | Accepted |

---

## Validation Checklist

- [x] Test suite accessible — `triade/__tests__/**` enumerated, `npm test` reproduced live (396/0)
- [x] Test results available — full + filtered runs captured (`2643 ms` / `2138 ms`)
- [x] Feature list known — AC1–AC7 from `implementation-artifacts/12-1:19`
- [x] Access to CI pipeline — `npm test` single gate; benchmarks present
- [x] Test counts by type gathered — per-type table above (unit/integration/E2E/smoke + acceptance)
- [x] Pass rates calculated — 100% (396/396) and 100% (49/49 new)
- [x] Average durations measured — per-suite + story surface + slowest item
- [x] Flaky tests identified — none (seed-fixed + 5σ)
- [x] Slow tests identified — none >30 s; slowest ~36 ms
- [x] Disabled tests listed — none
- [x] Determinism evaluated — `rngOf`/`spyRng`/`mulberry32`/`sigmaBound` (Strong)
- [x] Isolation checked — per-test fresh boards/fixtures, copy discipline, teardown (Good)
- [x] Speed benchmarked — 396 in 2.6 s (Good)
- [x] Readability assessed — `[P0] AC{n}` mapping, named helpers, messages (Good)
- [x] Anti-patterns documented — scan above (Clean)
- [x] All features listed — AC1–AC7 mapped
- [x] Test coverage mapped — per-AC FULL table + P0/P1 matrix
- [x] P0/P1 coverage verified — 100% / 100%
- [x] Critical gaps identified — none at P0/P1; I-1–I-6 triaged
- [x] Gap priorities assigned — Low/Accepted
- [x] CI integration verified — single `npm test` gate + benchmark presence
- [x] Results visibility confirmed — auto-summary + this report
- [x] Failure blocking assessed — suite blocks per story artifact
- [x] Fixture quality evaluated — `GameE2ETestFixture` / helpers rated Good
- [x] Maintenance burden estimated — low
- [x] Findings prioritized — I-1–I-6 with R-1–R-4
- [x] Effort estimated — per-R timing above
- [x] Immediate actions identified — none blocking
- [x] Short-term improvements listed — R-1–R-4
- [x] Long-term strategy outlined — single-oracle continuity
- [x] Executive summary complete — above
- [x] Metrics section complete — above
- [x] Quality assessment documented — above
- [x] Coverage analysis included — above
- [x] Recommendations actionable — above
- [x] Appendices populated — A–D

---

**Completed by**: Game QA Lead (gds-test-review)
**Date**: 2026-08-25
**Tests Reviewed**: 60 (49 new + 11 acceptance) · **Full suite**: 396 pass / 0 fail / 0 skip
