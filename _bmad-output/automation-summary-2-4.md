# Automation Summary — Story 2.4

**Engine**: Custom TypeScript + React Native (Expo SDK 57, `node:test` via tsx loader, Node 26)
**Story**: 2.4 — Curva halving-decay normalizada
**Tests Verified**: 245 triade (235 baseline + 10 story-2.4) · `npx tsc --noEmit -p tsconfig.test.json` clean (apenas o aviso pré-existente de `baseUrl` TS 6)
**Date**: 2026-08-21

## Scope of This Pass

Story 2.4 shipped a new pure module `weights.ts` (halving-decay curve + normalization + weighted picker) wired into `weightedValue`'s pot branch, replacing the 2.3 uniform placeholder, plus a weighted-aware rewrite of the stale uniform-reachability test. This pass verifies the 10 ATDD red-phase scaffolds are **active and green** (no `test.skip(` remaining), confirms AC 1–5 coverage at the pure layer, and closes no further gaps — the curve is not configurable (that is 2.5) and the combined single-roll `resolveSpawn` is deferred (2.6) by explicit scope guard.

## Verification Results

- `npm test` (from `triade/`) → **245 pass / 0 fail / 0 skip** (~2.1s).
- Story-2.4 files isolated: `weights.test.ts` → **9/9 pass**; `pot-tier-pipeline.test.ts` → **4/4 pass** (incl. weighted-aware reachability).
- Backward-compat pins isolated (`game.test.ts` + `spawn.test.ts` + `pot.test.ts`) → **43/43 pass** unchanged.
- `npx tsc --noEmit -p tsconfig.test.json` → only the pre-existing TS 6 `baseUrl` deprecation notice.
- No `test.skip(` remaining in `triade/__tests__/`.
- CI (`ci.yml`) picks up the new tests automatically (`node --test` in `triade/`); informational coverage already includes `src/engine/**`.

## Test Distribution (story 2.4 surface)

| Type | Count | Coverage |
| ----- | ----- | -------- |
| Unit/halving matrix | 1 | AC 1 — `potWeights([3,6,12,24,48,96])` → `[1, 0.5, 0.25, 0.125, 0.0625, 0.03125]` via `deepStrictEqual` (exact FR-8 matrix, no tolerance); `[3]`→`[1]`, `[3,6]`→`[1,0.5]` |
| Unit/normalization | 2 | AC 2 — `normalizeTo(POT_WEIGHT, potWeights(potForTier(t)))` sums to `0.2` within `1e-9` for pot lengths 1..6; returns a fresh array, input untouched |
| Unit/monotonicity | 1 | AC 3 — tiers 1..8 strictly decreasing (`w[i+1] < w[i]`) and `w[i+1] ≈ w[i]/2` |
| Unit/weightedPicker | 2 | AC 4, N1 — `[1, 0.5]` vs `[2/3, 1/3]` same ~66.7% index-0 distribution (100k samples); boundary rolls `rngOf(2/3 ± 1e-6)` → 1/0, `rngOf(0.99)` → last index (both weight sets) |
| Unit/draw-count | 1 | RNG contract — exactly one rng draw per `weightedPicker` call, including pot length 1 edge |
| Unit/statistical | 1 | AC 5 — `mulberry32(seed)`, N=100_000 at tier 1 & 5; only open pot values hit; within-pot frequencies within ±1% **absolute** of halving-decay ratios (tier 1: 3≈0.6667/6≈0.3333; tier 5: 3≈0.5079 … 96≈0.0159) |
| Unit/purity | 1 | `weights.ts` keys off `spawnConfig.ts` (no scattered literals, boundary rule 4), no RN/React/Skia/Expo imports; re-exported via `core/index.ts` |
| Unit/integration | 1 | Weighted-aware reachability rewrite in `pot-tier-pipeline.test.ts` — cumulative-band **midpoints** (never exact boundaries) land on every pot slot for tiers 2 & 5 |

**Files** (all active, from ATDD red phase):

- `triade/__tests__/engine/weights.test.ts` (9 tests, P0×5 / P1×4 — NEW)
- `triade/__tests__/engine/pot-tier-pipeline.test.ts` (4 tests — uniform-reachability test rewritten weighted-aware, coverage intent preserved)

## Story 2.4 Acceptance Criteria Coverage

| AC | Criterion | Coverage |
| -- | --------- | -------- |
| 1  | Each pot value weighs half the next-lower: `3=1, 6=1/2, 12=1/4, …` (FR-8) | FULL (automated) — literal halving matrix via `deepStrictEqual`; curve keyed off `POT_BASE_VALUE` (purity pin) |
| 2  | Pot weights normalized per tier to sum to 20% (`POT_WEIGHT = 0.2`), epsilon `1e-9` | FULL — sweep pot lengths 1..6, sum within `1e-9`; fresh array, input never mutated |
| 3  | Monotonic — strictly decreasing within a tier | FULL — tiers 1..8, `w[i+1] < w[i]` and `w[i+1] ≈ w[i]/2` |
| 4  | Combined distribution picked by a `weightedPicker` that always re-normalizes (N1) | FULL — re-normalization equivalence ([1,0.5] ≡ [2/3,1/3]), boundary rolls, non-1.0-sum inputs, exactly one draw; two-stage draw preserved (tier 0 → 1 roll, tiers ≥1 → 2 rolls) via `pot.test.ts` pins |
| 5  | Curve validated by unit tests vs the full I/O matrix (FR-8) | FULL — literal matrix + statistical frequency sampling (±1% absolute, tier 1 & 5) + weighted-aware pipeline reachability |

## Validation Checklist

- [x] Test framework initialized (`node:test` via tsx, project-mandated)
- [x] Engine detected (custom TS/RN; pure-engine module `weights.ts` host-testable, ADR-01)
- [x] Testable systems identified (`potWeights`, `normalizeTo`, `weightedPicker`, wiring in `spawn.ts`)
- [x] Existing tests located + patterns understood (dynamic-import activation, purity guard, rng helpers)
- [x] Coverage gaps identified (none — 10/10 scaffolds cover the testable surface; configurable curve 2.5 / `resolveSpawn` 2.6 out of scope by guard)
- [x] Tests deterministic (pure functions, literal fixtures, seeded `mulberry32`, no `Math.random` in test paths)
- [x] Arrange-Act-Assert pattern used
- [x] No hard-coded waits; no cleanup needed (pure logic)
- [x] Tests isolated, no interdependencies, no execution-order dependence
- [x] Assertions have descriptive messages
- [x] Files in correct directories (`triade/__tests__/engine/`), engine-appropriate syntax
- [x] `tsc --noEmit` clean; triade 245/245; compat pins 43/43 green unchanged
- [x] CI picks up new tests automatically; informational coverage includes `src/engine/**`
- [x] Anti-patterns avoided (no engine-under-test, no hard waits as primary sync, no teardown leaks, no duplicate coverage — distribution-sum/drift tripwire/backward-compat pins stay in their original files only)

## Next Steps

1. Review the activated 2.4 suites (done — 10/10 green, 245/245 total).
2. Feed this summary into the upcoming code review (story is in `review`).
3. Do not pull forward: configurable curve (2.5), combined single-roll `resolveSpawn` + pendingSpawn/tier-in-`move()` (2.6), preview card (Epic 5).