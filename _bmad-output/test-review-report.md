# Test Review Report: 3-clone — Story 2.3 (Pot tierizado por teto)

**Scope**: targeted (Story 2.3 test surface: `triade/__tests__/engine/pot.test.ts` + touched pins in `spawn.test.ts`, `game.test.ts`)
**Date**: 2026-08-21 · **Reviewer**: Game QA Lead (gds-test-review) · **Status**: `review`

## Executive Summary

- Overall health: **Good**
- Key findings:
  - All 5 ATDD scaffolds were activated with real assertions; suite is green: **234 tests, 0 fail, 0 skipped, ~2.2s total**.
  - The RNG-consumption contract is pinned by a draw-count test — the single most valuable test in the file, since outcome-based assertions cannot detect an extra draw on a single-value pot.
  - FR-7 ladder is pinned both literally (tiers 0–7) and structurally (tiers 0–12) — exactness plus generality without duplication.
  - No duplicate coverage: distribution-sum epsilon invariant and drift tripwire remain solely in `spawn.test.ts`; backward-compat boundary pins in `game.test.ts` stayed green unchanged.
  - Two minor gaps: the defensive tier guard in `pot.ts` is unpinned, and the draw-count contract is incomplete for tier ≥ 1 rolls landing inside the fixed band.
- Recommended actions (prioritized):
  1. Pin draw-count for tier ≥ 1 + fixed-band roll (`calls === 1`) — protects the determinism contract Story 2.6 will depend on.
  2. Pin or remove the defensive guard in `potForTier` (fractional/negative tiers).
  3. Inline the vestigial `coreWithPot()` dynamic-import wrapper left over from RED-phase scaffolds.

## Metrics

### Test Suite Statistics

| Type                 | Count | Pass Rate | Avg Duration |
| -------------------- | ----- | --------- | ------------ |
| Unit (engine, node:test) | 234 | 100% | ~9ms |
| Integration          | 0     | n/a       | n/a          |
| Play Mode/Functional | 0     | n/a       | n/a          |
| Performance (benchmark asserts) | 4 | 100% | < 130ms each |
| **Total**            | **234** | **100%** | **2204ms full run** |

Story 2.3 contribution: 5 activated tests in `pot.test.ts` (P0×3, P1×2).

### Recent History

- ATDD red phase: 230 tests, 225 pass, 5 skipped (scaffolds RED).
- Post-implementation: 234 tests, all green (suite grew by other stories' work since).
- No flaky tests observed; all engine tests are seeded/deterministic (`rngOf`, `mulberry32`).

## Quality Assessment

### Strengths

- **Deterministic**: every test uses injected seeded rngs; no `Math.random`, no timing waits, no shared mutable state. `potForTier` freshness is even verified via a mutation check (`pot.test.ts:78–80`).
- **Fast**: entire suite under 2.5s; new tests are sub-millisecond.
- **Draw-count pin** (`pot.test.ts:57–72`): pins the exact RNG stream contract (tier 0 → 1 roll; tier ≥ 1 in pot band → 2 rolls). This is exactly the kind of contract outcome-tests miss.
- **Literal matrix + structural sweep**: FR-7 values are pinned byte-exactly for tiers 0–7 while the doubling/length invariants generalize to tier 12 — catches both drift and construction errors.
- **Anti-scatter guard**: source scan asserts `pot.ts` keys off `spawnConfig.ts` and never imports RN/React/Skia/Expo (`pot.test.ts:82–92`) — consistent with repo-wide architecture-boundary tests.
- **No duplicated coverage**: AC4's epsilon sum stays in `spawn.test.ts:11–14`; boundary pins stay in `game.test.ts`.

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| ----- | -------- | -------------- | --- |
| Draw-count contract incomplete: tier ≥ 1 with roll inside the fixed band consumes only 1 draw (`spawn.ts:14–18`) — unpinned; story wording ("tiers ≥ 1 consume two") is only true in the pot band | Medium | none (gap) | Add assertion: counting rng returning `0.5` at tier 5 → `calls === 1` |
| Defensive guard `Math.max(0, Math.floor(tier))` (`pot.ts:5`) has no behavioral pin — fractional/negative input behavior is unspecified | Low | none (gap) | Add one-line test (`potForTier(-1)` → `[3]`, `potForTier(2.9)` → `[3,6,12]`) or drop the guard since callers always pass `tierForCeiling` output |
| `coreWithPot()` dynamic-import wrapper (`pot.test.ts:23–25`) is vestigial RED-phase scaffolding — adds indirection, no value post-activation | Low | all 5 | Replace with a static top-level import of `potForTier`/`weightedValue` |
| Source-scan regex for the re-export (`pot.test.ts:96`) is formatting-coupled (fails on harmless export reformatting) | Low | 1 | Acceptable per repo conventions; optionally loosen to a simple `/potForTier/` match on `index.ts` |

Anti-pattern scan: clean. No hard-coded waits, no static shared state, no private-implementation probing, no assertion-free tests, no leaked fixtures.

## Coverage Analysis

### Current Coverage

| Area                        | P0 Coverage | P1 Coverage | Gap? |
| --------------------------- | ----------- | ----------- | ---- |
| Pot ladder values (FR-7)    | ✅ literal tiers 0–7 | ✅ structural tiers 0–12 | No |
| `weightedValue` tier wiring | ✅ first/last slot, tiers 0/1/5 | — | No |
| RNG stream contract         | ✅ tier 0 = 1 draw, tier 1 = 2 draws | ⚠️ fixed-band roll at tier ≥ 1 unpinned | Partial |
| Purity / config keying      | ✅ determinism + mutation freshness | ✅ spawnConfig import, no UI imports, re-export | No |
| Distribution band (AC4)     | ✅ via `spawn.test.ts` (not duplicated) | ✅ ±2% drift tripwire | No |
| Backward compat (default tier 0) | ✅ `game.test.ts` boundaries green unchanged | ✅ `spawn.test.ts` tripwire | No |
| Board → tier → pot integration | — | — | Yes (accepted) |

### Critical Gaps

1. **Board→tier→pot end-to-end path** (`ceilingDetector` → `tierForCeiling` → `potForTier`): intentionally deferred to Story 2.6 per scope guard — accepted gap, revisit when the tier is plumbed into `move()`.
2. **Fixed-band draw count at tier ≥ 1**: small but real determinism-contract hole (see Issues). Cheap to close now, expensive to debug in 2.6 when replay streams desync.

## Recommendations

### Immediate (This Sprint)

1. ~~Add the fixed-band draw-count assertion to `pot.test.ts`~~ ✅ Done 2026-08-21: `tier >= 1 + fixed-band roll → calls === 1` pinned.
2. ~~Pin the defensive guard behavior in `potForTier`~~ ✅ Done 2026-08-21: negative/fractional tier behavior pinned (`clamp to [3]`, `floor`).

### Short-term (This Milestone)

1. Simplify `pot.test.ts`: replace `coreWithPot()` with static imports once Story 2.4 touches the file next.
2. When Story 2.4 replaces uniform pick with halving-decay weights, add distribution assertions *inside* the pot band (per-value frequencies) — current tests only pin membership, not intra-pot weighting.

### Long-term (Ongoing)

1. Keep the literal-matrix + structural-invariant pattern for future ladders (2.5 configurable curve will need the same treatment keyed off config).
2. In Story 2.6, add one integration test spanning board → tier → pot value to retire the accepted gap.

## Appendix

### Flaky Tests

None detected. All engine tests are deterministic (seeded rngs, pure functions).

### Slow Tests

None in scope. Slowest items are pre-existing benchmark asserts (< 130ms), well under thresholds.

### Disabled Tests

None — 0 skipped, 0 todo across the 234-test suite.

---

**Completed by:** Game QA Lead (gds-test-review)
**Date:** 2026-08-21
**Tests Reviewed:** 234 (5 new in `pot.test.ts`)
