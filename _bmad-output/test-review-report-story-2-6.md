# Test Review Report: 3-clone — Story 2.6 (integração com o engine — merge-once e effective-move)

**Scope**: targeted (Story 2.6 test surface: `triade/__tests__/engine/adaptive-spawn-integration.test.ts` — new, 13 activated ATDD scaffolds — plus R1 rewrites in `pot.test.ts`, `pot-tier-pipeline.test.ts`, `weights.test.ts`, the mechanical GameState port of `game.test.ts`, and the strengthened noop pins in `__tests__/e2e/session.e2e.test.ts`)
**Date**: 2026-08-22 · **Reviewer**: Game QA Lead (gds-test-review) · **Status**: `review`

## Executive Summary

- Overall health: **Good**
- Key findings:
  - All **13 ATDD scaffolds are activated and green** (`grep "test.skip("` → 0 matches); full suite is **278 tests, 0 fail, 0 skip, ~2.5s** (baseline pré-story era 266 pass + 13 skipped). Story file isolated: **13/13 pass, ~0.27s**.
  - Both type gates re-run by this review: `npx tsc --noEmit` clean; `-p tsconfig.test.json` shows only the pre-existing TS 6 `baseUrl` deprecation notice. No `Math.random` anywhere in test paths; all randomness seeded (`mulberry32`, `rngOf`, counting spies).
  - The **fixed draw-budget contract is pinned exactly**: noop = 0 draws (spy), effective move = exactly `[cell, nextValue, displayRoll]` in order (`deepStrictEqual(spy.calls, [0, 0.9, 0.5])`), `newGame` = 20. This closes the 2.3 "variable draw-count" deferred item with the strongest possible shape — order AND count.
  - The **N3 forward invariant** (materialized spawn on move N == pending resolved after move N−1) is asserted over the *same* 10k-seeded run used for the distribution stats — one harness (`runSeededSession`) powers both, avoiding duplicated session machinery.
  - All four **major review patches are verified in the code**: noop path returns `{ ...state.pendingSpawn }` shallow copy (`game.ts:69`); `pickIndex` has the NaN/out-of-range guard mirroring `weightedPicker` (`spawn.ts:40-42`); the integration suite imports real typed exports from `core/index.ts` (the `EngineV26` facade + duplicate `gameState()` helper are gone); the e2e not-busy branch now pins score stability, occupied-count, trace emptiness, and pending-preview identity.
  - The ceiling-ordering invariant was correctly **rescoped to tier ≥ 1** in both the source comment (`spawn.ts` header, `game.ts:46-51`) and the test title — the reviewer's overclaim finding (tier-0 pot value 3 > ceiling 0/1/2) is honored.
  - Two low-severity observations raised and **fixed in this pass**: the `newGame` pin now pins draw *order* (was count-only), and the ceiling-ordering scan no longer shares seed `0xc31` with the cell-uniformity tripwire. The `displayRoll` distribution is now pinned statistically (~5σ headroom) ahead of Epic 7's consumption.
- Recommended actions (prioritized):
  1. ~~Pin the `newGame` draw sequence structurally (e.g. first 18 draws alternate cell/value, 19th = pending value, 20th = displayRoll) so a future reorder of tile placement vs pending resolution can't slip through a count-only pin (Low).~~ ✅ Fixed 2026-08-22: pin feeds `18×0.5 + [0.9, 0.25]` and asserts nine starting 2s plus `pendingSpawn deep-equals { value: 3, displayRoll: 0.25 }` — any reorder of cells/values/pending fails loudly.
  2. ~~(Optional) When Epic 7 consumes `displayRoll`, add its distribution/range pinning at the consumption site — today only `∈ [0,1)` is checked, which is adequate until the preview reads it (Low).~~ ✅ Fixed 2026-08-22: the AC7 10k run now collects every resolved `displayRoll`, asserts range `[0,1)` per sample AND mean ≈ 0.5 within ±0.015 (~5σ headroom, matching the suite's statistical style). The `< 0.6` Ambiguous Preview threshold semantics remain correctly deferred to Epic 7.

## Metrics

### Test Suite Statistics

| Type | Count | Pass Rate | Avg Duration |
| ---- | ----- | --------- | ------------ |
| Unit (engine, node:test) | 270 | 100% | ~8ms |
| Integration/statistical | 4 | 100% | ~250ms (10k-spawn runs) |
| Play Mode/Functional (e2e fixture) | 1 | 100% | ~50ms |
| Performance (benchmark asserts) | 4 | 100% | < 110ms each |
| **Total** | **278** | **100%** | **2490ms full run** |

Story 2.6 contribution: 13 activated tests in `adaptive-spawn-integration.test.ts` (P0×8, P1×5) + 5 rewritten R1 pins + 1 deleted redundant pin (net suite growth 266 → 278). Isolated story file: **13/13 pass, ~0.27s**.

### Recent History

- ATDD red phase: 266 pass / 13 skipped (scaffolds RED).
- Post-implementation: 278 tests, all green, 0 skipped, both tsc gates clean.
- Debug-log failures during dev (async loss on draw-count pins, benchmark GameState port, seed-shifted e2e gate pin) were all caught by the gates before landing — evidence the double-tsc trap from the 2.5 review is being applied.
- No flaky tests observed; every statistical assertion is seed-fixed.

## Quality Assessment

### Strengths

- **Deterministic & pure**: the session harness replays identically per seed (pinned by the determinism test comparing two full runs with `deepStrictEqual` on snapshots AND spawn values). Zero hidden state — the rewind-shape test proves `{ board, pendingSpawn }` alone reproduces the next result bit-for-bit, including a deliberate spread-copy variant to prove structural independence.
- **Draw-contract pins are the strongest in the suite**: the AC4 pin asserts the exact ordered draw triple, so any change to draw order (e.g. resolving the pending before placing the spawn) fails loudly, not just a count mismatch.
- **Formula-derived R1 boundaries**: `pot.test.ts` recomputes cumulative combined bands from `normalizeTo(POT_WEIGHT, potWeights(potForTier(t)))` semantics in comments and picks band-interior probes (0.9 ∈ [0.8, 0.9333), etc.) — no hardcoded mid-values, honoring the spec rule. `pot-tier-pipeline.test.ts` keeps the midpoint technique (float-drift robust, `<` vs `<=` agnostic) but now feeds single rolls against the combined bands.
- **Conditional-frequency rewrite is mathematically sound**: `weights.test.ts` filters samples to pot values and compares within-pot ratios to `norm[i]/POT_WEIGHT` — correct under the combined pick because the pot sub-distribution normalizes to 0.2 regardless of tier — and adds a `potSamples > N·0.1` guard so an empty filter can't produce a vacuous 0/0 pass.
- **Statistical + invariant pairing**: the 10k run simultaneously checks the 40/40/20 marginal band and the N3 promise/materialization equality — the invariant costs nothing extra and would catch any resolver/bypass divergence (e.g. someone re-rolling inside `spawnTile`).
- **Place-not-roll provenance**: the uniform-cell test asserts `res.value === 3` on every one of 10k placements — pinning that `spawnTile` never rolls a value, which is exactly the N3 half of the contract.
- **Review patches landed correctly**: noop shallow copy, NaN-guarded `pickIndex`, real typed imports (no casts — the only remaining `as unknown as` hits are pre-existing defensive-input tests unrelated to 2.6), strengthened e2e noop branch.
- Anti-pattern scan: clean. No hard-coded waits, no shared mutable state (boards copied per iteration in the cell-uniformity loop), no private-implementation probing, no assertion-free tests, no fixture leaks (pure logic, no teardown needed).

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| ----- | -------- | -------------- | --- |
| `newGame` draw-budget pin asserts count (20) but not draw order — a future refactor swapping pending resolution before tile placement (or interleaving differently) passes a count-only pin while changing every downstream seeded sequence | Low | 1 (`AC4 newGame` pin) | ✅ Fixed 2026-08-22: pin feeds `18×0.5, 0.9, 0.25`; asserts nine 2s on the board and `pendingSpawn === { value: 3, displayRoll: 0.25 }` — order of the last two draws (and the alternating cell/value structure) is now pinned |
| Seed `0xc31` reused by both the AC2 cell-uniformity tripwire and the ceiling-ordering scan — correlated failure mode if that stream ever shifts (same class as the ledgered σ-headroom defer) | Low | 2 statistical tests | ✅ Fixed 2026-08-22: ceiling-ordering scan now seeds `mulberry32(0x51ce + ceiling)`; `0xc31` remains exclusive to the cell-uniformity test |
| `displayRoll` only range-checked `∈ [0,1)` — no distribution pin; acceptable now since nothing consumes it until Epic 7's Ambiguous Preview | Low | 1 (AC7 statistical run) | ✅ Fixed 2026-08-22: harness collects all resolved `displayRolls`; AC7 asserts per-sample range + mean ≈ 0.5 within ±0.015 (~5σ at N ≥ 10k); threshold semantics (`< 0.6`) stay deferred to Epic 7 |

## Coverage Analysis

### Current Coverage

| Area | P0 Coverage | P1 Coverage | Gap? |
| ---- | ----------- | ----------- | ---- |
| AC1 effective-move-only (FR-10) | ✅ noop pin: `moved:false`, score 0, no spawned trace, deep-equal pending, **0 draws** | ✅ e2e not-busy branch pins (score/count/pending) | No |
| AC2 uniform cell | ✅ ±2% over 10k seeded placements + place-not-roll value pin | — | No |
| AC3 merge-once unchanged | ✅ full `game.test.ts` suite green unedited + explicit pot-pending merge pin (`[3,3,3,3]→[6,3,3,_]`) | ✅ `line.ts`/`rules.ts`/`board.ts` untouched (verified in diff scope) | No |
| AC4 injected RNG + draw budget | ✅ ordered 3-draw pin, noop 0-draw pin, `newGame` 20-draw **ordered** pin (cells/values alternating, 19th = pending value, 20th = displayRoll) | ✅ same-seed determinism replay | No |
| AC5 return shape + trace | ✅ exact key-set pin + spawned-entry provenance (`value === input.pendingSpawn.value`, `from: []`) | ✅ scalar types pinned | No |
| AC6 snapshot shape (N3/ADR-06) | ✅ exact key sets for `GameState`/`PendingSpawn` + valid initial pending + displayRoll range | ✅ noop shallow-copy independence (via rewind test's spread variant) | No |
| AC7 same distribution + rewound by undo | ✅ 10k statistical band ±2% + N3 invariant same-run + `displayRoll` uniformity pin (mean ≈ 0.5 ±0.015) | ✅ rewind-shape replay + tier-ladder membership + ordering invariant (tier ≥ 1) | Undo orchestrator itself is Epic 3 — out of scope by guard |
| R1 single-roll migration | ✅ combined-band wiring pins (tiers 1/5), universal 1-draw pin (tiers 0/1/5) | ✅ midpoint reachability + conditional frequencies; old redundant two-roll pin deleted | No |

### Critical Gaps

- None at P0/P1. All seven acceptance criteria have explicit automated coverage, plus the N3 forward invariant, the fixed draw budget, determinism, rewind shape, and the scoped ordering invariant.
- Out-of-scope by guard (correctly not tested here): undo rewind orchestration (Epic 3), HUD ambiguous preview reading `pendingSpawn.displayRoll` (Epic 7).

## Recommendations

### Immediate (This Sprint)

1. None blocking. The story surface is green, deterministic, and matches the spec'd R1 map exactly.

### Short-term (This Milestone)

1. ~~Pin the `newGame` draw order (not just count) so placement/pending reordering can't silently shift every seeded sequence (Low effort, one test edit).~~ ✅ Fixed 2026-08-22.
2. ~~Diversify the `0xc31` seed between the cell-uniformity and ordering tests when the statistical σ budget is documented (per the open deferred item).~~ ✅ Fixed 2026-08-22 (ordering test now seeds `0x51ce + ceiling`).

### Long-term (Ongoing)

1. ~~When Epic 7 reads `displayRoll`, pin the Ambiguous Preview threshold behavior (`< 0.6` exact vs ranged) at the consumer, closing the current range-only coverage.~~ Distribution now pre-pinned in 2.6 (mean + range); the `< 0.6` threshold semantics themselves remain an Epic 7 consumption-site pin (unchanged scope guard).
2. Keep the pattern established here — one seeded session harness feeding both statistical and invariant assertions — for future engine integration stories (Epic 3 undo should extend `runSeededSession` rather than build a parallel harness).

## Appendix

### Flaky Tests

None observed; all engine tests seeded/deterministic (statistical gates are seed-fixed, so they fail deterministically if distributions drift).

### Slow Tests

Worst in the 2.6 surface: the 10k-spawn statistical+N3 run (~250ms). Full suite ~2.5s — well within CI budget.

### Disabled Tests

0 skipped in the entire suite; all 13 scaffolds activated. The only deleted test is the old two-stage "one roll inside the fixed band" pin, absorbed by the universal single-roll pin per §R1.3.

## Scope Note

Story 2.6 artifacts (`automation-summary-2-6.md`, story file, ATDD checklist, `adaptive-spawn-integration.test.ts`) and all modified files are still **uncommitted/untracked** on top of `b5ad874` — flag for commit ownership under the story's PR. The frozen vanilla-JS `js/` codebase remains untouched (verified: no diff entries under `js/`), honoring the wrong-codebase trap guard.
