# Test Review Report: 3-clone — Story 2.4 (Curva halving-decay normalizada)

**Scope**: targeted (Story 2.4 test surface: `triade/__tests__/engine/weights.test.ts` + `pot-tier-pipeline.test.ts` weighted-aware rewrite + touched pins in `pot.test.ts`, `spawn.test.ts`)
**Date**: 2026-08-21 · **Reviewer**: Game QA Lead (gds-test-review) · **Status**: `review`

## Executive Summary

- Overall health: **Good**
- Key findings:
  - All 10 ATDD scaffolds are activated and green; suite is **245 tests, 0 fail, 0 skip, ~2.25s total**. Story-2.4 files alone: **13/13 pass in ~254ms**.
  - The statistical test derives expected ratios from `normalizeTo` output rather than hardcoding literals — ratios cannot go stale, and the band/pick roll alternation forces the pot branch deterministically.
  - The RNG draw-count contract is pinned at both layers (`weightedPicker` = 1 draw; `weightedValue` two-stage = 1 or 2 draws incl. fixed-band roll) — exactly what replay determinism in Story 2.6 will depend on.
  - The weighted-picker re-normalization equivalence ([1,0.5] ≡ [2/3,1/3]) pins the N1 float rule; the reachability rewrite uses cumulative-band **midpoints**, robust to float drift and `<` vs `<=` semantics.
  - No duplicate coverage: distribution-sum invariant and drift tripwire remain solely in `spawn.test.ts`; backward-compat boundary pins in `game.test.ts` and `pot.test.ts` stayed green unchanged (43/43 isolated).
  - Two real gaps: the **defensive guards** in `normalizeTo`/`weightedPicker` (all-zero on non-positive total; `length-1` on non-finite total/roll) were specified in the ATDD checklist but have **no behavioral pin**; and the **±1% absolute** tolerance leaves the tier-5 tail slot (96 ≈ 1.6%) effectively unconstrained.
- Recommended actions (prioritized) — **all resolved 2026-08-21**:
  1. ~~Pin the `normalizeTo`/`weightedPicker` defensive-guard branches~~ ✅ Done: +2 tests (`normalizeTo` non-positive totals → all-zero; `weightedPicker` non-positive total / `NaN` / `undefined` roll → `length-1`, never `undefined`).
  2. ~~Tighten the statistical test's small-slot discrimination~~ ✅ Done: added a ±10% **relative** band alongside the ±1% absolute floor (96 slot now constrained to ratio ±0.0016 ≈ 4σ vs. the old vacuous ±0.01 ≈ 25σ window).
  3. ~~Replace the vestigial `coreWithWeights()` dynamic-import wrapper~~ ✅ Done: static imports everywhere in `weights.test.ts` + `pot-tier-pipeline.test.ts`; all 10 tests sync.
  4. ~~Loosen the re-export purity regex~~ ✅ Done: order-insensitive name-presence check on the `weights.ts` export line.

## Metrics

### Test Suite Statistics

| Type | Count | Pass Rate | Avg Duration |
| ----- | ----- | --------- | ------------ |
| Unit (engine, node:test) | 245 | 100% | ~9ms |
| Integration | 0 | n/a | n/a |
| Play Mode/Functional | 0 | n/a | n/a |
| Performance (benchmark asserts) | 4 | 100% | < 130ms each |
| **Total** | **245** | **100%** | **2254ms full run** |

Story 2.4 contribution: 9 activated tests in `weights.test.ts` (P0×5, P1×4) + 2 defensive-guard tests added post-review (P1×2) + 1 rewritten weighted-aware test in `pot-tier-pipeline.test.ts` (P1).

### Recent History

- ATDD red phase: 235 pass / 10 skipped (scaffolds RED — activation verified via `TypeError: potWeights is not a function`).
- Post-implementation: 245 tests, all green.
- No flaky tests observed; all engine tests are seeded/deterministic (`mulberry32`, `rngOf`, counting rngs), no `Math.random` in test paths.

## Quality Assessment

### Strengths

- **Deterministic**: pure functions with injected seeded rngs; the statistical test feeds a strict band(0.9)/pick(mulberry) alternation so every sample deterministically lands in the pot branch (`weights.test.ts:120-122`).
- **Ratios derived, not hardcoded**: expected within-pot ratios are computed from `normalizeTo(POT_WEIGHT, potWeights(pot))` (`weights.test.ts:114-116`) — the assertion can't go stale when the curve changes.
- **Float-exact matrix (AC 1)**: `deepStrictEqual` on `[1, 0.5, 0.25, …]` — every value is `3/2^i`, exactly representable, so no tolerance needed; plus `[3]→[1]`, `[3,6]→[1,0.5]` edge pots.
- **Boundary semantics pinned**: `2/3+1e-6 → 1`, `2/3−1e-6 → 0`, `0.99 → last index` — pins `scaled < acc` vs `<=` behavior on both weight sets.
- **Re-normalization equivalence (N1)**: 100k-sample comparison proves `weightedPicker` never trusts input to sum to 1.0.
- **Draw-count contract**: `weightedPicker` = exactly 1 draw including pot-length-1 edge (`weights.test.ts:94-104`), complementing the `pot.test.ts` two-stage pins (1 roll tier 0, 2 rolls tier ≥ 1, 1 roll inside fixed band).
- **Reachability via midpoints**: cumulative-band midpoints, never exact boundaries (`pot-tier-pipeline.test.ts:85-91`), robust to float drift and picker semantics; every pot slot drawable at tiers 2 & 5.
- **Purity guard**: `weights.ts` keys off `spawnConfig.ts`, no RN/React/Skia/Expo imports, re-exported via `core/index.ts` (`weights.test.ts:141-161`).
- **No duplicated coverage**: distribution-sum/drift tripwire/backward-compat pins stay in their original files only (ATDD duplicate-coverage guard honored).

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| ----- | -------- | -------------- | --- |
| Defensive-guard branches in `normalizeTo`/`weightedPicker` unpinned — `weights.ts:10` (total ≤ 0 → all-zero) and `weights.ts:17,19` (total ≤ 0 or `NaN`/`undefined` roll → `length-1`) were story-mandated (`never undefined`) but no test exercises them | Medium | none (gap) | ✅ Fixed 2026-08-21: `normalizeTo([0,0]|[]|[-1,1])` → all-zero; `weightedPicker([0,0])` → last, `NaN`/`undefined` roll → last index |
| Statistical tolerance is ±1% **absolute** (`weights.test.ts:134`): at tier 5 the 96 slot ratio ≈ 0.0159, so a frequency of 0% or 2.5% both pass — the tail slot has ~no discriminating power (≈25σ window at N=100k) | Medium | 1 (statistical, AC 5) | ✅ Fixed 2026-08-21: assertion now requires **both** `\|freq − ratio\| < 0.01` **and** `\|freq/ratio − 1\| < 0.1` — high-frequency slots keep the tight absolute floor, tail slots get a real relative band |
| Vestigial RED-phase dynamic-import wrappers: `coreWithWeights()` (`weights.test.ts:18-20`) and inline `await import(...)` (`pot-tier-pipeline.test.ts:73`) — indirection with no value now that exports exist | Low | all 9 + 1 | ✅ Fixed 2026-08-21: static imports from `core/index.ts`; tests de-async'd |
| Re-export purity regex is formatting-coupled: `/export\s*\{[^}]*\bpotWeights\b[^}]*\bnormalizeTo\b[^}]*\bweightedPicker\b[^}]*\}` requires the three names in that exact order in one export block | Low | 1 | ✅ Fixed 2026-08-21: order-insensitive name-presence check on the `weights.ts` export line (`[\s\S]*?`, per-name `\b…\b` regex) |
| Statistical test's band/pick alternation assumes strict two-stage draw structure (`call++ % 2 === 0`); Story 2.6's combined single-roll refactor will break it — it fails **loudly** (frequencies skew off ratios), so this is an acceptable tripwire, but the coupling is implicit in a comment | Low | 1 | Document the dependency in the story; re-derive sampling when 2.6 lands (still open — intentional) |

Anti-pattern scan: clean. No hard-coded waits, no shared mutable state, no private-implementation probing, no assertion-free tests, no leaked fixtures.

## Coverage Analysis

### Current Coverage

| Area | P0 Coverage | P1 Coverage | Gap? |
| ----- | ----------- | ----------- | ---- |
| Halving matrix `potWeights` (AC 1, FR-8) | ✅ literal `deepStrictEqual` | ✅ monotonicity tiers 1..8 | No |
| Normalization sum (AC 2) | ✅ pot lengths 1..6, ε 1e-9 | ✅ fresh array, no mutation | No |
| weightedPicker re-normalize (AC 4, N1) | ✅ equivalence + boundary rolls | ✅ exactly 1 draw | No |
| Statistical distribution (AC 5) | ✅ tier 1 (3,6) | ✅ tier 5 tail slot constrained by ±10% relative band (fixed) | No |
| Defensive guards (`weights.ts:10,17,19`) | ✅ pinned (fixed) | ✅ `NaN`/`undefined` roll → last index, never `undefined` | No |
| Purity / config keying | ✅ spawnConfig keying | ✅ no UI imports, re-export | No |
| Pipeline reachability | — | ✅ weighted-aware midpoints, tiers 2 & 5 | No |
| Distribution-sum / drift (spawn) | ✅ stays in `spawn.test.ts` (not duplicated) | ✅ | No |
| Backward compat | ✅ `game.test.ts`/`pot.test.ts` pins green unchanged | ✅ 43/43 isolated | No |
| Combined single-roll `resolveSpawn` | — | — | Yes (deferred to 2.6, accepted) |

### Critical Gaps

1. ~~Defensive-guard branches unpinned~~ ✅ Closed 2026-08-21: `normalizeTo` all-zero and `weightedPicker` `length-1` fallbacks now pinned.
2. ~~Tier-5 tail-slot discrimination~~ ✅ Closed 2026-08-21: ±10% relative band now constrains the 96 slot (ratio ±0.0016 ≈ 4σ at N=100k).
3. **Board→tier→pot end-to-end via `spawnTile`/`move()`**: deferred to Story 2.6 by explicit scope guard — accepted gap, revisit when the tier is plumbed into `move()`.

### Coverage by Priority

```
P0 Coverage: 100% ██████████
P1 Coverage: 100% ██████████
P2 Coverage: 100% ██████████  (guards + tail-slot tolerance closed)
```

## Infrastructure Review

### CI/CD Integration

| Aspect | Status | Notes |
| ------ | ------ | ----- |
| Tests in CI | ✅ | `ci.yml` runs `node --import tsx --test` in `triade/` on PR + push to main |
| Results visible | ✅ | GitHub Actions checks; new tests auto-discovered (`node --test`) |
| Failures block | ✅ | `engine-test-and-benchmark` job gates merge |
| Nightly runs | ❌ | Not configured (suite is 2.3s — not needed today) |
| Performance tests | ✅ | In-suite deterministic benchmark asserts (< 0.1ms engine cost) |

### Test Infrastructure Quality

| Component | Quality | Notes |
| --------- | ------- | ----- |
| Fixtures | Good | Reuses `rngOf`, `mulberry32`, `extractSpecifiers` from `test-utils/helpers.ts`; 0 new fixtures needed |
| Helpers | Good | Counting rng closure for draw-count; band/pick alternation closure for statistical sampling |
| Data factories | n/a | Pure-function scope, no factories needed |
| Documentation | Good | ATDD checklist links each test to AC + scenario ID; comments explain float rationale |

### Maintenance Burden

- Test update frequency: **low** (story-bound; the reachability rewrite was the only stale test, and it was rewritten, not deleted)
- Brittleness score: **low** — one formatting-coupled regex and one implicit draw-structure coupling (both flagged)
- Developer friction: **low** — dynamic-import wrappers are the only ergonomic wart

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| ------ | ------ | ------ | ----- |
| ~~Pin defensive guards~~ ✅ Done: `normalizeTo([0,0])` → `[0,0]`; `weightedPicker` with zero-total weights and `NaN`/`undefined` roll → `length-1` (never `undefined`) | 0.5h | High | QA |
| ~~Switch statistical tail-slot assertion to relative tolerance~~ ✅ Done: `\|freq/ratio − 1\| < 0.1` combined with the ±1% absolute floor | 0.5h | Medium | QA |

### Short-term (This Milestone)

| Action | Effort | Impact | Owner |
| ------ | ------ | ------ | ----- |
| ~~Replace `coreWithWeights()` / inline `await import(...)` with static imports~~ ✅ Done in both 2.4 files; all 10 tests now sync | 1h | Low | Dev |
| ~~Loosen the re-export purity regex~~ ✅ Done: order-insensitive name-presence check | 0.5h | Low | Dev |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| ------ | ------ | ------ | ----- |
| When Story 2.6 lands the combined single-roll `resolveSpawn`, re-derive the statistical sampling so the band/pick alternation matches the new draw structure; keep the draw-count pins authoritative | 1d | High | Explicit scope guard; do not pull forward |
| Keep the literal-matrix + derived-ratios pattern for the 2.5 configurable curve (keyed off config, same treatment) | 0.5d | Medium | Continue the anti-scatter purity guard |

## Appendix

### Flaky Tests

None detected. All engine tests are deterministic (seeded rngs, pure functions, no timing).

### Slow Tests

None in scope. Slowest 2.4 item is the statistical sampling test (~101ms, N=100k × 2 tiers) — well under thresholds; no action needed.

### Disabled Tests

None — 0 skipped, 0 todo across the 245-test suite.

### Technical Debt

| Item | Description | Effort | Priority |
| ---- | ----------- | ------ | -------- |
| ~~Unpinned defensive guards~~ ✅ Closed | `normalizeTo` all-zero / `weightedPicker` `length-1` fallbacks now pinned | 0.5h | ~~Medium~~ done |
| ~~Absolute-tolerance tail slot~~ ✅ Closed | Tier-5 96 slot now constrained by ±10% relative band | 0.5h | ~~Medium~~ done |
| ~~Dynamic-import wrappers~~ ✅ Closed | Static imports in `weights.test.ts` + `pot-tier-pipeline.test.ts` | 1h | ~~Low~~ done |
| ~~Formatting-coupled re-export regex~~ ✅ Closed | `weights.test.ts` name-presence check, order-insensitive | 0.5h | ~~Low~~ done |
| Implicit draw-structure coupling | Statistical test's `call++ % 2` alternation (will break loudly on 2.6) | document | Low |

---

**Completed by:** Game QA Lead (gds-test-review)
**Date:** 2026-08-21
**Tests Reviewed:** 247 (12 story-2.4: 9 in `weights.test.ts` + 2 defensive-guard tests added post-review + 1 weighted-aware rewrite in `pot-tier-pipeline.test.ts`)
**Review follow-up:** 4/4 actionable gaps closed and verified green (247/247, ~2.5s); only intentional carry-forward is the draw-structure coupling tripwire for Story 2.6.