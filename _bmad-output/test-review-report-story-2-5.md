# Test Review Report: 3-clone — Story 2.5 (spawnConfig configurável)

**Scope**: targeted (Story 2.5 test surface: `triade/__tests__/engine/spawn-config.test.ts` — new — plus touched pins in `weights.test.ts`, `pot.test.ts`, `spawn.test.ts`, `pot-tier-pipeline.test.ts`, `game.test.ts`)
**Date**: 2026-08-22 · **Reviewer**: Game QA Lead (gds-test-review) · **Status**: `review`

## Executive Summary

- Overall health: **Good**
- Key findings:
  - All **7 ATDD scaffolds are activated and green** (0 skipped); full suite is **265 tests, 0 fail, 0 skip, ~2.5s total**. Story-2.5 file alone: **7/7 pass in ~218ms**.
  - The validator is a pure `{ ok: true } | { ok: false; errors }` predicate (never throws) and its rejection matrix is exercised against **mutated copies** via the optional `config` param — no frozen export is ever mutated in tests, honoring the architecture "engine never throws" rule and the data-factories pattern.
  - **Byte-for-byte equivalence is honored**: no tracked test file was modified (`git diff --stat` on `triade/__tests__` is empty); every backward-compat pin (`game.test.ts:22`, `spawn.test.ts` drift tripwire + distribution-sum, `pot.test.ts` ladder/draw pins, `weights.test.ts` FR-8 matrix + sampling, `pot-tier-pipeline.test.ts` reachability) stayed green UNCHANGED.
  - The override+fallback contract (`POT_CURVE[v] ?? POT_BASE_VALUE / v`) is pinned as a **regression tripwire**: tiers 6..12 keep strict halving beyond the configured range within `1e-9` — exactly the FR-7 vs `MAX_POT_TIER` boundary the story flags.
  - Duplicate-coverage guard honored: FR-8 output matrix stays in `weights.test.ts`; distribution-sum/drift stay in `spawn.test.ts`; the story file pins the `POT_CURVE` **symbol** itself and the validator — distinct aspects.
  - **Vestigial RED-phase dynamic-import wrappers**: 5 of 7 tests `await import('../../src/engine/config/spawnConfig.ts')` instead of a static import from `core/index.ts` — the same anti-pattern flagged and fixed in the 2.4 review (Low).
  - Two low-severity refinements: the `spawnConfigOf` factory hardcodes `{1:0.4, 2:0.4}` coupling it to the shipped `FIXED_WEIGHTS`/`POT_WEIGHT`; and the freeze pin asserts `Object.isFrozen` but not the story's "must not throw on mutation attempts" behavior.
- Recommended actions (prioritized):
  1. ~~Switch the 5 dynamic-import wrappers to static imports from `core/index.ts` for consistency with sibling engine tests (Low effort).~~ ✅ Fixed 2026-08-22: all 5 tests now statically import `POT_CURVE`, `FIXED_WEIGHTS`, `validateSpawnConfig` from `core/index.ts`; `async` dropped.
  2. ~~(Optional) Add a mutation-attempt assertion (`assert.throws`) to the freeze pin to cover the story's non-strict-consumer contract.~~ ✅ Fixed 2026-08-22: freeze pin now asserts `assert.throws(..., TypeError)` on mutation of both `POT_CURVE` and `FIXED_WEIGHTS`.
  3. ~~(Optional) Derive the factory's `fixedWeights` from the exported constants so retuning can't silently stale the rejection matrix.~~ ✅ Fixed 2026-08-22: `spawnConfigOf` now spreads `FIXED_WEIGHTS`.

## Metrics

### Test Suite Statistics

| Type | Count | Pass Rate | Avg Duration |
| ----- | ----- | --------- | ------------ |
| Unit (engine, node:test) | 265 | 100% | ~9ms |
| Integration | 0 | n/a | n/a |
| Play Mode/Functional | 0 | n/a | n/a |
| Performance (benchmark asserts) | 4 | 100% | < 130ms each |
| **Total** | **265** | **100%** | **2515ms full run** |

Story 2.5 contribution: 7 activated tests in `spawn-config.test.ts` (P0×4, P1×3). Isolated run: **7/7 pass, 218ms**.

### Recent History

- ATDD red phase: 254 tests / 247 pass / 7 skipped (scaffolds RED — missing exports via dynamic `import()`).
- Post-implementation: 265 tests, all green, 0 skipped.
- No flaky tests observed; all engine tests are deterministic (seeded `mulberry32`, `rngOf`, counting rngs); no `Math.random` in test paths.

## Quality Assessment

### Strengths

- **Deterministic & pure**: validator and `potWeights` are pure functions; the fallback proof feeds `potForTier(t)` for t=6..12 deterministically.
- **Byte-for-byte guard honored**: no tracked test file changed; every backward-compat pin green untouched. The fallback-rule tripwire is the right shape for the override+fallback — it would fail loudly if the curve lookup diverged from halving.
- **Literal curve matrix (AC 1)**: `deepStrictEqual` on `{3:1, 6:0.5, … 96:0.03125}` — all values are `3/2^k`, exactly representable, no tolerance needed.
- **Validator rejection matrix (AC 2)**: 8 cases (NaN, zero, negative, Infinity, non-monotonic, bad key, fixed-sum drift, empty) each assert `{ ok: false }`, non-empty string `errors`, **and** `doesNotThrow` — the "engine never throws" rule is asserted per-case, not assumed.
- **Factory without mutation**: `spawnConfigOf(overrides)` builds mutated copies; the optional `config` param keeps frozen exports safe while still exercising rejection paths.
- **Freeze pins (AC 4)**: `Object.isFrozen(POT_CURVE)` and `Object.isFrozen(FIXED_WEIGHTS)` both asserted.
- **Source-keying purity (AC 3, 5)**: re-export regex is order-insensitive per-name (learned from 2.4); asserts `weights.ts` keys off `spawnConfig.ts` (single access point) and no RN/React/Skia/Expo imports.
- **No duplicated coverage**: FR-8 output matrix, distribution-sum, and drift tripwire stay solely in their original files.

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| ----- | -------- | -------------- | --- |
| Vestigial RED-phase dynamic-import wrappers — 5 tests `await import('../../src/engine/config/spawnConfig.ts')` rather than a static import from `core/index.ts` (same anti-pattern flagged+fixed in the 2.4 review at `weights.test.ts:18-20`) | Low | 5 of 7 | ✅ Fixed 2026-08-22: static imports from `core/index.ts`; `async` dropped |
| Freeze pin asserts `Object.isFrozen` only — the story's "engine must not throw on mutation attempts from non-strict consumers" contract is unpinned (ESM modules are strict, so a mutation attempt throws `TypeError`; non-strict silently no-ops) | Low | 1 (freeze pin) | ✅ Fixed 2026-08-22: added `assert.throws(..., TypeError)` on mutation of `POT_CURVE` and `FIXED_WEIGHTS` |
| `spawnConfigOf` factory hardcodes `fixedWeights: {1:0.4, 2:0.4}` — couples the rejection matrix to the shipped `FIXED_WEIGHTS`/`POT_WEIGHT`; if these are ever retuned the factory goes stale and the fixed-sum drift case becomes a misleading pass/fail | Low | 1 (rejection matrix) | ✅ Fixed 2026-08-22: factory spreads `{ ...FIXED_WEIGHTS }` |

Anti-pattern scan: clean. No hard-coded waits, no shared mutable state, no private-implementation probing, no assertion-free tests, no leaked fixtures.

## Coverage Analysis

### Current Coverage

| Area | P0 Coverage | P1 Coverage | Gap? |
| ----- | ----------- | ----------- | ---- |
| `POT_CURVE` literal matrix (AC 1, FR-9) | ✅ exact `deepStrictEqual` | ✅ structural invariants (keys `POT_BASE_VALUE*2^k`, finite >0, strictly decreasing) | No |
| Validator happy path (AC 2) | ✅ `validateSpawnConfig()` → `{ok:true}` on defaults | ✅ default accepted inside same activation as rejections | No |
| Validator rejection matrix (AC 2) | ✅ 8 invalid cases, never throws | ✅ human-readable string `errors` | No |
| Freeze hardening (AC 4) | ✅ `Object.isFrozen` ×2 | — (mutation-attempt unpinned — see Issues) | Minor |
| Fallback-rule proof (AC 1 vs `MAX_POT_TIER`) | — | ✅ tiers 6..12 strict halving, ε 1e-9 | No |
| Config-driven purity (AC 3, 5) | ✅ re-export + source-keying | ✅ no UI imports | No |

### Critical Gaps

- None at P0/P1. All five acceptance criteria have explicit test coverage (AC1 literal+structural+fallback; AC2 happy+rejection; AC3/AC5 purity+re-export; AC4 freeze).
- Minor: mutation-attempt behavior of frozen config unpinned (Low).

## Recommendations

### Immediate (This Sprint)

1. Convert the 5 dynamic-import wrappers in `spawn-config.test.ts` to static imports from `core/index.ts` and drop the now-unneeded `async` — mirrors the 2.4 fix and keeps the suite internally consistent.

### Short-term (This Milestone)

1. Add a `assert.throws` mutation-attempt assertion to the freeze pin to cover the story's "must not throw on mutation attempts" wording.
2. Derive `spawnConfigOf`'s default `fixedWeights` from the exported `FIXED_WEIGHTS` constant so a future retune can't silently stale the rejection matrix.

### Long-term (Ongoing)

1. When Story 2.6 lands the combined single-roll pick, re-verify the distribution/statistical tripwires (the band/pick alternation coupling documented in the 2.4 review remains open and intentional).

## Appendix

### Flaky Tests

None observed; all engine tests seeded/deterministic.

### Slow Tests

None in the 2.5 surface (worst 0.99ms). Full suite ~2.5s.

### Disabled Tests

0 skipped in the 2.5 file; all 7 scaffolds activated. Full suite 0 skipped.

## Scope Note

The untracked `triade/__tests__/{e2e,integration,smoke}/` tests (`session.e2e.test.ts`, `session.integration.test.ts`, `criticalPath.smoke.test.ts`) are generic smoke/integration coverage not part of Story 2.5; they pass but are uncommitted — flag for commit ownership outside this story.
