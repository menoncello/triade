# Test Review Report: Story 2.2 — Fixed 1/2 Weights at 40/40

**Workflow**: gds-test-review (targeted scope)
**Date**: 2026-08-21
**Story**: `_bmad-output/implementation-artifacts/2-2-pesos-fixos-1-2-em-40-40.md` (status: review)
**Suite run**: `npm test` (tsx loader + `TSX_TSCONFIG_PATH=tsconfig.test.json`) → **224 tests, 224 pass, 0 fail, 0 skipped** (2.69s)

## Executive Summary

- Overall health: **Good**
- Key findings:
  - `spawn.test.ts` is deterministic, isolated, fast (<1ms), and well-named — no anti-patterns detected.
  - All four Story 2.2 ACs are covered: fixed-weight pins (AC1/AC2), distribution-sum with epsilon (AC3), and the existing `game.test.ts:22` boundary test stays green (AC4).
  - The `FIXED_WEIGHTS sum === 1 − POT_WEIGHT` coupling — the only guard against silent pot-band drift — is explicitly tested.
  - Minor redundancy: the pot-band coupling test partially overlaps the distribution-sum test; acceptable given it enforces a distinct invariant.
  - No ceiling-tier interaction test exists for `weightedValue`; structurally safe today (the function takes no ceiling input) but worth a guard when Stories 2.3–2.6 land.

## Metrics

### Story 2.2 Test Inventory

| Test (spawn.test.ts) | Type | Duration | Verdict |
| --- | --- | --- | --- |
| FIXED_WEIGHTS are pinned at 40% each | Unit (data invariant) | <0.1ms | Good — intentional pin per "never change" invariant |
| distribution sum is 1.0 within epsilon | Unit (invariant) | <0.1ms | Good — epsilon used, not exact equality |
| pot band equals top (1 − POT_WEIGHT) of roll | Unit (coupling) | <0.1ms | Good — guards the documented drift risk |
| weightedValue resolves pot value for top band | Unit (behavioral) | <0.1ms | Good — real behavior via injected rng |

### Related Existing Coverage (verified green)

| Test | Location | Role |
| --- | --- | --- |
| weightedValue respects 40/40/20 distribution | game.test.ts:22 | AC4 boundary pins: 0.39→1, 0.4→2, 0.79→2, 0.8→3, 0.999→3 |
| spawnTile on a full board spawns nothing | game.test.ts:198 | spawnTile edge case |
| pickIndex clamps out-of-range rng rolls | game.test.ts:211 | pickIndex edge cases |

### Recent History

- Full suite: 224/224 pass, zero flaky indicators (all tests use injected `rngOf`, no timing dependence).
- Note: story record cites "163 tests" at implementation time; suite has since grown to 224 via later stories — no regression in this area.

## Quality Assessment

### Strengths

- **Deterministic**: every test uses `rngOf(...)` seeded sequences; no `Math.random`, no sleeps, no shared state.
- **No duplication discipline honored**: boundary assertions were not re-implemented in `spawn.test.ts` (per story instruction); they live once in `game.test.ts:22`.
- **Float rule respected**: epsilon (`1e-9`) on all sum comparisons; exact equality only where appropriate (literal pins).
- **Imports via public surface**: constants imported from `src/engine/core/index.ts` re-export, not the config file directly — refactor-friendly.

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| --- | --- | --- | --- |
| Pin test asserts literals identical to source (`FIXED_WEIGHTS[1] === 0.4`) — a change-detector by nature | Low | spawn.test.ts:6 | Acceptable as a deliberate contract pin (FR-6); document intent in test name (already done). No action needed. |
| Sum test and coupling test overlap arithmetically | Low | spawn.test.ts:11,16 | Keep both — they enforce different failure modes (distribution vs. pot-band drift). No action needed. |
| No explicit "weights independent of ceiling tier" assertion | Low | — | Structurally guaranteed while `weightedValue(rng)` takes no tier input. Add a guard test when 2.3–2.6 introduce `resolveSpawn`. |

Anti-pattern scan: **clean** — no hard-coded waits, no static/shared state, no private-implementation access, no missing cleanup, no assertion-free tests.

## Coverage Analysis

### AC Traceability

| AC | Requirement | Covered By | Status |
| --- | --- | --- | --- |
| 1 | Weights fixed at 40/40 regardless of ceiling | spawn.test.ts:6 + structural absence of tier input | ✅ |
| 2 | Constants live in own data module, separate from pot | spawnConfig.ts + pin test | ✅ |
| 3 | Distribution sums to 1.0 within epsilon | spawn.test.ts:11 | ✅ |
| 4 | Existing 40/40/20 boundaries preserved | game.test.ts:22 (green) | ✅ |

### Critical Gaps

None for this story's scope. Forward-looking gap: when Story 2.6 builds `resolveSpawn`, add a property/statistical test that sampled spawn frequencies match 40/40/20 within tolerance across all ceiling tiers.

## Recommendations

### Immediate (This Sprint)

1. None blocking — story tests are review-ready.

### Short-term (Stories 2.3–2.6)

1. When `POT_VALUE` is replaced by the tier-keyed pot (2.3), extend `spawn.test.ts` with a test that every tier's weights still sum to 1.0.
2. When `weightedPicker` (2.4) lands, add a statistical sampling test (e.g., 10k rolls, ±2% tolerance) as a drift tripwire.

### Long-term (Ongoing)

1. Consider a single "spawn invariants" suite that runs after each Epic 2 story to keep the 40/40/20 contract pinned centrally.

## Appendix

- Flaky tests: none identified.
- Slow tests: none (slowest relevant test <1ms; suite total 2.69s).
- Disabled/skipped tests: none (0 skipped, 0 todo).

---

**Completed by:** Game QA Lead (gds-test-review)
**Date:** 2026-08-21
**Tests Reviewed:** 4 new (Story 2.2) + 3 related existing
