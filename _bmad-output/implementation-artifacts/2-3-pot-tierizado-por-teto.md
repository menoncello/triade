---
baseline_commit: c138606cb8d44f0487b43adc119819708a0e8d86
---

# Story 2.3: Pot tierizado por teto

Status: done

## Story

As a player,
I want the 20% pot to offer bigger pieces as my ceiling crosses each tier,
So that the run stays ambitious and the big merge arrives sooner.

## Acceptance Criteria

1. **Given** the ceiling tier, **When** the pot is resolved, **Then** 20% of spawn weight is a pot for pieces `≥3`, opened per ceiling tier (FR-7).
2. **And** `<48` → only `3`; `≥48` → `3,6`; `≥96` → `3,6,12`; `≥192` → `3,6,12,24`; `≥384` → `3,6,12,24,48`; `≥768` → `3,6,12,24,48,96`; tiers double thereafter (`≥1536` adds `192`, `≥3072` adds `384`, …).
3. **And** the `potResolver` is a pure function keyed by the validated `spawnConfig` — never scattered literals (boundary rule 4).
4. **And** the pot always sums to 20% of total spawn weight, verified with epsilon tolerance (the pot *band* is unchanged; only which values can be drawn from it grows).

## Tasks / Subtasks

- [x] Extend `src/engine/config/spawnConfig.ts` with the pot base datum (AC: 3)
  - [x] Replace `export const POT_VALUE = 3;` with `export const POT_BASE_VALUE = 3;` — the anchor of the doubling ladder. `POT_VALUE` has exactly two consumers today (`spawn.ts`, re-export in `core/index.ts`); update both. Nothing else imports it (verified by grep).
  - [x] Do NOT add per-value weight parameters here — that is Story 2.5 (`{3: 1.0, 6: 0.5, ...}` curve). This story only needs the *values* per tier.
- [x] Add `src/engine/core/pot.ts` with the pure resolver (AC: 1, 2, 3)
  - [x] `import { POT_BASE_VALUE } from '../config/spawnConfig.ts';` and `import type { CeilingTier } from './ceiling.ts';`
  - [x] `export function potForTier(tier: CeilingTier): number[]` — returns the pot values open at that tier. Closed form (mirrors `tierForCeiling`'s style): value at index `i` is `POT_BASE_VALUE * 2 ** i`, so tier `t` returns indices `0..t`: `Array.from({ length: t + 1 }, (_, i) => POT_BASE_VALUE * 2 ** i)`.
    - tier `0` → `[3]`; tier `1` → `[3, 6]`; tier `2` → `[3, 6, 12]`; tier `3` → `[3, 6, 12, 24]`; tier `4` → `[3, 6, 12, 24, 48]`; tier `5` → `[3, 6, 12, 24, 48, 96]`; tier `6` → `[…, 192]`; tier `7` → `[…, 384]` — exactly the FR-7 ladder, doubling thereafter by construction.
    - Guard non-negative tiers: `const t = Math.max(0, Math.floor(tier));` — defensive only; callers always pass `tierForCeiling` output (≥ 0).
  - [x] Pure module, no RN/React/Skia/Expo imports, single responsibility — mirrors `ceiling.ts`.
- [x] Wire the tier into `weightedValue` in `src/engine/core/spawn.ts` (AC: 1, 4)
  - [x] Change signature to `weightedValue(rng: Rng = Math.random, tier: CeilingTier = 0): number` — the default `tier = 0` keeps every existing call site (`spawnTile`, tests) valid and byte-compatible.
  - [x] Pot branch becomes: `const pot = potForTier(tier); return pot.length === 1 ? pot[0] : pot[pickIndex(pot.length, rng)];`
  - [x] **RNG-consumption guard (do not drift):** when `pot.length === 1`, do NOT draw a second rng value. Tier `0` must consume exactly one roll, preserving the exact RNG stream the existing tests pin (`game.test.ts:22–27`, `spawn.test.ts`). Only tiers ≥ 1 consume a second draw (roll first, then the intra-pot pick — this order is part of the determinism contract). This contract is pinned by the draw-count test below — outcome-based tests alone cannot detect an extra draw here (a single-value pot returns the same value regardless of index).
  - [x] Intra-pot selection is **uniform** in this story — an explicit placeholder. Story 2.4 replaces it with halving-decay weights + normalization; do not pre-build any weighting here.
- [x] Re-export from `src/engine/core/index.ts` (AC: 3)
  - [x] `export { potForTier } from './pot.ts';`
  - [x] Update the spawnConfig re-export line: swap `POT_VALUE` for `POT_BASE_VALUE`.
- [x] Add `__tests__/engine/pot.test.ts` covering the NEW invariants (AC: 2, 3, 4)
  - [x] Enumerated FR-7 matrix pinned literally: tier `0..7` each assert the exact array (`[3]`, `[3,6]`, `[3,6,12]`, `[3,6,12,24]`, `[3,6,12,24,48]`, `[3,6,12,24,48,96]`, `+192`, `+384`) via `assert.deepStrictEqual`.
  - [x] Structural invariants for a sweep of tiers `0..12`: every value `≥ 3`; consecutive values double (`pot[i+1] === pot[i] * 2`); length equals `tier + 1`.
  - [x] `weightedValue` wiring: `rngOf(0.9)` (default tier) → `3`; `rngOf(0.9, 0.99)` tier `1` → `6`; `rngOf(0.9, 0.4)` tier `1` → `3`; `rngOf(0.9, 0.99)` tier `5` → `96` (last slot); `rngOf(0.9, 0.0)` tier `5` → `3` (first slot).
  - [x] Draw-count pin (determinism contract): with a counting rng (`let calls = 0; const rng = () => { calls++; return 0.9; };`), assert `calls === 1` after `weightedValue(rng)` at default tier, and `calls === 2` after `weightedValue(rng, 1)` — one roll for the band + exactly one intra-pot pick, never more.
  - [x] Distribution-sum invariant already pinned in `spawn.test.ts` (`FIXED_WEIGHTS + POT_WEIGHT === 1.0` within `1e-9`) — do NOT duplicate it; just keep the suite green.
  - [x] Use `rngOf` from `../../test-utils/helpers.ts`; import from `../../src/engine/core/index.ts` exactly like sibling engine tests.
- [x] Run the full suite: `npm test` (runs `node --test` via tsx loader — see 2.2 review note; plain `node --test` no longer works) → all green, including `game.test.ts:22` ("weightedValue respects 40/40/20 distribution") and the `spawn.test.ts` drift tripwire.

## Dev Notes

- **Scope guard (CRITICAL):** This story opens the pot VALUES per tier and wires the tier into `weightedValue`. It does NOT implement the halving-decay weight curve (2.4), the configurable parameter set (2.5), or the `resolveSpawn`/`pendingSpawn` snapshot integration (2.6). The full N1 resolver assembly (`normalizeTo`, `weightedPicker` that re-normalizes) belongs to 2.4/2.6.
- **Where this sits in Epic 2:** 2.1 gave `ceilingDetector`/`tierForCeiling` (derived from board, undo-free by construction — ADR-06). 2.2 extracted fixed 40/40 + `POT_WEIGHT` into `spawnConfig.ts` and deliberately left `POT_VALUE = 3` as "named so 2.3 swaps this for `potResolver` without touching `weightedValue`'s structure" — this story executes exactly that swap. The tier flows: board → `ceilingDetector` → `tierForCeiling` → `potForTier` → pot branch of `weightedValue`.
- **Uniform intra-pot pick is a documented placeholder:** FR-8 (halving decay, `3=1, 6=1/2, …` normalized to 20%) arrives in 2.4 and will replace the `pickIndex` call inside the pot branch. Keep the branch shape trivial so 2.4 is a surgical replacement, not a refactor.
- **Backward compatibility is test-pinned:** with the default `tier = 0`, `potForTier(0)` is `[3]`, so `weightedValue` behaves identically to today for every existing caller and test. The `game.test.ts:22` boundary assertions (`rngOf(0.39)→1, rngOf(0.4)→2, rngOf(0.79)→2, rngOf(0.8)→3, rngOf(0.999)→3`) MUST stay green unchanged.
- **Threshold coupling carries over from 2.2:** the pot branch still covers the top `(1 - POT_WEIGHT)` of the roll, computed as `FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2]`. Do not introduce a second threshold source.
- **AC 3 "keyed by the validated `spawnConfig`" in this story:** `potForTier(tier: CeilingTier): number[]` deliberately takes no config parameter — it reads `POT_BASE_VALUE` from `spawnConfig.ts`, which satisfies "never scattered literals" (boundary rule 4). The fully parameterized resolver (`potForTier(config, tier)`) arrives with Story 2.5 when the curve becomes configurable; do not pre-parameterize here.
- **Deferred items inherited from 2.2 review (do not fix here):** runtime validation of config weights lands with 2.5 (`weightedPicker` will re-normalize and never trust its input); `Object.freeze` hardening of config constants revisited in 2.5 when the curve becomes configurable.
- `src/engine` never imports RN/React/Skia/Expo. TS imports use explicit `.ts` extensions (ESM); `strict: true` is on — type the tier param as `CeilingTier` (alias of `number`, exported from `ceiling.ts`).
- No external dependencies, no build step. Tests use the built-in `node:test` runner through the repo's tsx-based setup established in the 2.2 follow-up work.

### Project Structure Notes

- New module mirrors the existing single-responsibility pure-module pattern: `triade/src/engine/core/pot.ts`, exported via `triade/src/engine/core/index.ts` — same shape as `ceiling.ts` (2.1).
- Tests live beside the engine suite in `triade/__tests__/engine/` and run with the repo's node:test setup. Import from `../../src/engine/core/index.ts` and `../../test-utils/helpers.ts` exactly as `game.test.ts` does.
- **CRITICAL — wrong codebase trap:** the repository also contains a legacy vanilla-JS web PWA under the root `js/`. **Implement in `triade/`.** Do not edit `js/game.js` or add npm dependencies — `triade/` is the active RN + Expo + Skia + TypeScript app. The root `_bmad-output/project-context.md` describes that legacy PWA and is STALE for Epic 2.

### Project Context Rules

- Implement game rules only inside `triade/src/engine` (never in `ui`/`render`/`services`). Rule duplication breaks the deterministic test suite.
- Randomness flows through the injectable `rng` param (`Rng = () => number`); `weightedValue` keeps that boundary — no `Math.random` inside the pure path beyond the existing default param.
- `move()` returns `{ board, score, moved, trace }` — untouched in this story; the tier is not yet plumbed into `move()` (that integration, plus `pendingSpawn`, is Story 2.6).
- The ceiling/tier is derived from the board each time — never stored in state/snapshot (ADR-06); undo rewinds it for free.
- `spawnConfig` is data validated by tests; never scattered literals (architecture boundary rule 4).

### References

- Epic 2 + Story 2.3 spec: `_bmad-output/planning-artifacts/epics.md` (Epic 2, "Story 2.3: Pot tierizado por teto", lines ~398–411)
- Adaptive Spawn design (N1 resolver components, boundary rule 4): `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (N1, lines ~663–693; module map lines ~568–645)
- GDD Adaptive Spawn tier ladder: `_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md` (Adaptive Spawn, line ~96)
- Engine source to read before editing: `triade/src/engine/config/spawnConfig.ts`, `triade/src/engine/core/{spawn.ts,ceiling.ts,index.ts,types.ts}`
- Previous story intelligence: `_bmad-output/implementation-artifacts/2-2-pesos-fixos-1-2-em-40-40.md` (threshold coupling, scope guard, deferred validation) and `_bmad-output/implementation-artifacts/2-1-deteccao-de-teto-de-spawn-spawn-ceiling.md` (closed-form tier convention, derived-not-stored rule)
- Test conventions: `triade/__tests__/engine/{game.test.ts,spawn.test.ts,ceiling.test.ts}`, `triade/test-utils/helpers.ts` (`rngOf`, `boardWith`)

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-2-3-pot-tierizado-por-teto.md`
- Unit tests (RED-phase scaffolds): `triade/__tests__/engine/pot.test.ts`

## Dev Agent Record

### Agent Model Used

ox-alpha-free (opencode-go/ox-alpha-free)

### Debug Log References

- Full suite: `npm test` (node --test via tsx loader) — 236 tests, 0 failures, 0 skipped.
- New suite `__tests__/engine/pot.test.ts`: 5 activated ATDD scaffolds, all green.
- Compatibility pins stayed green unchanged: `game.test.ts:22` ("weightedValue respects 40/40/20 distribution"), `spawn.test.ts` drift tripwire and boundary assertions (`rngOf(0.8) -> 3`).
- `npx tsc --noEmit -p tsconfig.test.json`: only the pre-existing TS 6 `baseUrl` deprecation warning in tsconfig.test.json (unrelated to this story).

### Completion Notes List

- Renamed `POT_VALUE` to `POT_BASE_VALUE` in `src/engine/config/spawnConfig.ts`; both consumers updated (`spawn.ts`, re-export in `core/index.ts`) — grep confirmed no other consumers.
- Added pure resolver `potForTier(tier)` in `src/engine/core/pot.ts`: closed form `Array.from({ length: t + 1 }, (_, i) => POT_BASE_VALUE * 2 ** i)` with defensive `Math.max(0, Math.floor(tier))` guard. No RN/React/Skia/Expo imports; mirrors `ceiling.ts` single-responsibility shape.
- Wired the tier into `weightedValue(rng = Math.random, tier: CeilingTier = 0)`: default `tier = 0` keeps every existing call site byte-compatible. RNG-consumption contract honored: single-value pot (tier 0) consumes exactly one roll (no second draw); tiers >= 1 consume roll + one intra-pot pick via `pickIndex` (uniform placeholder for Story 2.4).
- Re-exported `potForTier` from `core/index.ts`; swapped `POT_VALUE` for `POT_BASE_VALUE` in the spawnConfig re-export line.
- Activated all 5 RED-phase scaffolds in `__tests__/engine/pot.test.ts` (FR-7 literal matrix tiers 0..7, structural invariants tiers 0..12, weightedValue wiring, draw-count pin, purity/spawnConfig-keying). Distribution-sum invariant intentionally NOT duplicated (already pinned in `spawn.test.ts` within 1e-9).
- Scope guard respected: no halving-decay weights (2.4), no per-value weight parameters or config parameterization (2.5), no `resolveSpawn`/`pendingSpawn`/tier-in-`move()` plumbing (2.6).

### File List

- triade/src/engine/config/spawnConfig.ts (modified: POT_VALUE -> POT_BASE_VALUE)
- triade/src/engine/core/pot.ts (new: potForTier resolver)
- triade/src/engine/core/spawn.ts (modified: tier param + pot branch in weightedValue)
- triade/src/engine/core/index.ts (modified: potForTier export, POT_BASE_VALUE re-export)
- triade/__tests__/engine/pot.test.ts (modified: activated 5 ATDD scaffolds)
- triade/__tests__/engine/pot-tier-pipeline.test.ts (new: board→ceiling→tier→pot integration coverage)

## Change Log

- 2026-08-21: Story 2.3 implemented — tiered pot values via `potForTier` (FR-7 ladder), tier wired into `weightedValue` with RNG-consumption contract pinned by draw-count test. 236/236 tests green. Post-review (2026-08-21): NaN/Infinity guards + `readonly` return on `potForTier`; anchored purity-test regex; record updated (pipeline test file + test count).
- 2026-08-21 (re-review): added `MAX_POT_TIER = 30` cap in `potForTier` to bound allocation and prevent `Infinity` overflow for large finite tiers. 236/236 tests green.

### Review Findings

- [x] [Review][Patch] Vacuous index-export regex in purity test — the alternation's second branch (`export {[^}]*potForTier[^}]*}`) matches any export mentioning `potForTier` anywhere, so the strict `../core/pot.ts` path check can never fail on path grounds [`triade/__tests__/engine/pot.test.ts:182`]
- [x] [Review][Patch] `potForTier` lacks NaN/Infinity guards — `potForTier(NaN)` → `[]` → `weightedValue` returns `undefined` (pot[NaN]→undefined); `potForTier(Infinity)` throws `RangeError: Invalid array length`, huge finite tiers allocate explosive arrays [`triade/src/engine/core/pot.ts:5-6`]
- [x] [Review][Patch] Mutable pot arrays returned without `readonly` — callers can corrupt a pot mid-game; a `readonly number[]` return type is cheap insurance [`triade/src/engine/core/pot.ts:6`]
- [x] [Review][Patch] Dev Agent Record inaccurate — claims 230 tests (actual 236), omits `pot-tier-pipeline.test.ts` from the File List
- [x] [Review][Defer] Tier not wired into `spawnTile`/`move()` — pot feature is dead via real gameplay until then — deferred, pre-existing (spec defers tier plumbing to Story 2.6)
- [x] [Review][Defer] Variable RNG draw-count per call (1 roll vs 2 rolls) undocumented in the `Rng` contract — deferred, spec-mandated (pinned by draw-count tests; re-evaluated by 2.6 plumbing)
- [x] [Review][Defer] `POT_WEIGHT` exported but never consulted (pot band derived from `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2]`) — deferred, pre-existing (threshold coupling carried over from 2.2)
- [x] [Review][Defer] Source-text-coupled purity test (`readFileSync` + import-specifier regex) brittle under refactor — deferred, documented ATDD purity check design
- [x] [Review][Defer] `pickIndex` NaN roll passes both clamps → `NaN` index — deferred, pre-existing (contract-violating `Rng`; new exposure via pot branch's 2nd roll)
- [x] [Review][Patch] `potForTier` defensive guard does not cap large finite tiers — `Number.isFinite(1e8)` is true, so `potForTier(1e8)` allocates a 10⁸-element array (`RangeError`/OOM); tiers ≥ 1024 overflow `POT_BASE_VALUE * 2 ** i` to `Infinity` [`triade/src/engine/core/pot.ts:5`] — fixed: added `MAX_POT_TIER = 30` cap
