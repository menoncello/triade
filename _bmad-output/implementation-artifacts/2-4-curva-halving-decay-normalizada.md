---
baseline_commit: 096d13cc5e4c4e34b1b2de44a1b5e5a77f6d2a8a
---

# Story 2.4: Curva halving-decay normalizada

Status: done

## Story

As a player,
I want higher pot values to be rarer than lower ones,
So that bigger tiles stay special and the run keeps its pace.

## Acceptance Criteria

1. **Given** a pot of values for a tier, **When** weights are assigned within the pot, **Then** each value weighs half the next-lower one: `3=1`, `6=1/2`, `12=1/4`, `24=1/8`, `48=1/16`, `96=1/32` (FR-8).
2. **And** the pot weights are normalized per tier so the pot always sums to 20% of total spawn weight (`POT_WEIGHT = 0.2`), verified with epsilon tolerance.
3. **And** the weights are monotonic — a higher value never weighs more than a lower one (strictly decreasing within a tier).
4. **And** the combined distribution (fixed 40/40 + normalized pot) is picked by a `weightedPicker` that **always re-normalizes and never trusts its input to sum exactly** (N1 float rule).
5. **And** the halving-decay curve is validated by unit tests against the full I/O matrix (FR-8) — literal weight matrix + statistical frequency sampling per tier.

## Tasks / Subtasks

- [x] Add `src/engine/core/weights.ts` — the halving-decay curve + normalization + weighted picker (AC: 1, 2, 3, 4)
  - [x] `export function potWeights(pot: readonly number[]): readonly number[]` — halving-decay weights for the pot values: `pot.map((v) => POT_BASE_VALUE / v)`. For the FR-7 ladder this yields `3→1`, `6→1/2`, `12→1/4`, `24→1/8`, `48→1/16`, `96→1/32` — exactly FR-8, keyed off `POT_BASE_VALUE` from `spawnConfig.ts` (no scattered literals, boundary rule 4). `potWeights([3,6,12])` → `[1, 0.5, 0.25]`.
  - [x] `export function normalizeTo(target: number, weights: readonly number[]): number[]` — scales `weights` so their sum equals `target`. `const total = weights.reduce((a, b) => a + b, 0); if (!(total > 0)) return weights.map(() => 0); const scale = target / total; return weights.map((w) => w * scale);`. Returns a fresh array (never mutates input).
  - [x] `export function weightedPicker(weights: readonly number[], rng: Rng): number` — returns an **index** into `weights`. Always re-normalizes internally (N1 float rule): `const total = weights.reduce((a, b) => a + b, 0);` then walks cumulative thresholds against `rng() * total`. Never trusts the input to sum to 1 — `[1, 0.5]` and `[2/3, 1/3]` must select index `0` with the same ~66.7% probability.
    - Consumes **exactly one** rng draw (this is part of the RNG-consumption contract).
    - Defensive guard: if `!(total > 0)` or the roll is NaN, return `weights.length - 1` (never an undefined index; contract-violating `Rng` only).
    - Keep the pot-branch deterministic ordering: band roll first, then the intra-pot pick roll — do not reorder draws.
- [x] Wire the weighted pot into `weightedValue` in `src/engine/core/spawn.ts` (AC: 2, 4)
  - [x] Replace the uniform placeholder `pot[pickIndex(pot.length, rng)]` with the halving-decay pick:
    ```ts
    const pot = potForTier(tier);
    if (pot.length === 1) return pot[0];
    const weights = normalizeTo(POT_WEIGHT, potWeights(pot));
    return pot[weightedPicker(weights, rng)];
    ```
  - [x] Import `POT_WEIGHT` from `../config/spawnConfig.ts` (new import — `spawn.ts` currently imports only `FIXED_WEIGHTS` from there) and `potWeights, normalizeTo, weightedPicker` from `./weights.ts`.
  - [x] **Preserve the two-stage structure and RNG-consumption contract:** tier `0` (pot `[3]`) returns `pot[0]` with no second draw (exactly 1 roll total); tiers ≥ 1 consume exactly 2 rolls (band roll + one `weightedPicker` roll). Do NOT merge into a single combined roll — that refactor is Story 2.6 (`resolveSpawn`).
  - [x] `pickIndex` stays untouched and exported — `spawnTile` and `newGame` still use it for empty-cell picks.
- [x] Re-export from `src/engine/core/index.ts` (AC: 1, 2, 4)
  - [x] `export { potWeights, normalizeTo, weightedPicker } from './weights.ts';`
- [x] Add `__tests__/engine/weights.test.ts` covering the NEW invariants (AC: 1, 2, 3, 4, 5)
  - [x] **Literal halving matrix (AC 1):** `potWeights([3,6,12,24,48,96])` → `[1, 0.5, 0.25, 0.125, 0.0625, 0.03125]` via `assert.deepStrictEqual` (exact — every FR-8 value is `3/v = 2^-i`, exactly representable, so tolerance is unnecessary); also `potWeights([3])` → `[1]` and `potWeights([3,6])` → `[1, 0.5]`.
  - [x] **Normalization (AC 2):** for a sweep of pot lengths `1..6`, `normalizeTo(POT_WEIGHT, potWeights(potForTier(t)))` sums to `POT_WEIGHT` within `1e-9`. Assert `normalizeTo` returns a fresh array (input untouched).
  - [x] **Monotonicity (AC 3):** for tiers `1..8`, normalized weights are strictly decreasing (each `w[i+1] < w[i]`, and `w[i+1] ≈ w[i]/2`).
  - [x] **weightedPicker re-normalizes (AC 4, N1 float rule):** `weightedPicker([1, 0.5], rng)` and `weightedPicker([2/3, 1/3], rng)` select index `0` with the same probability; verify with deterministic boundary rolls: `rngOf(2/3 + 1e-6)` → index `1`; `rngOf(2/3 - 1e-6)` → index `0`; `rngOf(0.99)` → last index. Weights that do NOT sum to 1.0 must produce the same index distribution as their normalized equivalent.
  - [x] **weightedPicker draw-count:** exactly one rng draw per call (counting rng, assert `calls === 1`), including at pot length 1 edge.
  - [x] **Statistical validation (AC 5):** with `mulberry32(seed)`, sample `weightedValue(rng, tier)` at tier `1` and tier `5` (N ≈ 100_000). Assert pot values hit only the open pot values, and within-pot frequencies match the normalized halving-decay ratios within ±1% **absolute** (mirrors the `spawn.test.ts` drift-tripwire style; `|freq/N − ratio| < 0.01`, not relative — a relative reading would make the low-ratio `96` case vacuously pass). Expected within-pot ratios tier 1: `3≈0.6667`, `6≈0.3333`; tier 5: `3≈0.5079`, `6≈0.2540`, `12≈0.1270`, `24≈0.0635`, `48≈0.0317`, `96≈0.0159`.
  - [x] Use `rngOf`, `mulberry32` from `../../test-utils/helpers.ts`; import from `../../src/engine/core/index.ts` exactly like sibling engine tests.
  - [x] **Source-keying purity check for `weights.ts`** (mirror `pot.test.ts:102-108`): `readFileSync` the module, `extractSpecifiers` it, assert `./pot.ts`-style imports end with `spawnConfig.ts` (guards boundary rule 4 — no scattered `3`/`POT_BASE_VALUE` literal snuck into `potWeights`) and that no specifier matches `/react|react-native|@shopify|expo|skia/i`.
- [x] Update `__tests__/engine/pot-tier-pipeline.test.ts` — the "every intra-pot slot is reachable at its tier (uniform pick placeholder)" test (lines ~68-81) is now STALE
  - [x] It was written for the uniform `pickIndex` placeholder (`i / len + 1e-6` maps to index `i`). Under halving decay this no longer holds. Replace it with a **weighted-aware reachability** test: compute cumulative boundaries from `normalizeTo(POT_WEIGHT, potWeights(potForTier(tier)))`, then for each index `i` feed `rngOf(0.9, (c[i-1] + c[i]) / 2 / total)` (and `rngOf(0.9, c[0] / 2 / total)` for `i=0`, `rngOf(0.9, (c[len-2] + total) / 2 / total)` for the last index) and assert the pick lands on the `i`-th pot value. Use **midpoints**, not the exact boundary `c[i-1]/total` — a boundary feed is fragile against float drift and the picker's `<` vs `<=` semantics. Keep the same coverage intent (all pot slots drawable) but computed dynamically from `potWeights`+`normalizeTo` so it never goes stale again.
  - [x] The other pipeline tests (`[P0] pipeline`, `[P1] empty and low boards`, `[P1] defensive inputs`) stay green unchanged — verify.
- [x] Run the full suite and typecheck
  - [x] `npm test` (runs `node --test` via tsx loader — see 2.2/2.3 review notes; plain `node --test` no longer works) → all green.
  - [x] `npx tsc --noEmit -p tsconfig.test.json` → only the pre-existing TS 6 `baseUrl` deprecation warning expected.
  - [x] Compatibility pins MUST stay green unchanged: `game.test.ts:22` (40/40/20 boundary), `spawn.test.ts` drift tripwire + distribution-sum invariant, `pot.test.ts` draw-count pins + wiring assertions (`weightedValue(rngOf(0.9, 0.99), 5) → 96`, `weightedValue(rngOf(0.9, 0.0), 5) → 3` — these happen to hold under halving decay; verify).

## Dev Notes

- **Scope guard (CRITICAL):** This story implements the halving-decay **curve, normalization, and weighted picker** and wires them into `weightedValue`'s pot branch. It does NOT make the curve configurable (that is 2.5: `{3: 1.0, 6: 0.5, ...}` parameter set in `spawnConfig`), and it does NOT build `resolveSpawn`/`pendingSpawn`/tier-in-`move()` (that is 2.6). Keep `potWeights` as a derived formula from `POT_BASE_VALUE` — do not add config parameters here. 2.5 will replace the formula with config-driven weights; 2.6 will merge the two-stage draw into the full N1 combined pick.
- **Where this sits in Epic 2:** 2.1 gave `ceilingDetector`/`tierForCeiling`; 2.2 extracted `FIXED_WEIGHTS` 40/40 + `POT_WEIGHT` 0.2; 2.3 gave `potForTier` (FR-7 value ladder) and wired the tier in with a **uniform** intra-pot pick (documented placeholder). This story replaces that placeholder with FR-8 halving-decay weights normalized to the 20% pot. The tier flow stays: board → `ceilingDetector` → `tierForCeiling` → `potForTier` → `potWeights` → `normalizeTo(POT_WEIGHT, …)` → `weightedPicker` → tile value.
- **Two-stage draw is intentional here (do not collapse to one roll):** the 2.3 draw-count contract is pinned by tests (`pot.test.ts`: tier 0 → 1 roll, tier ≥ 1 → 2 rolls) and deferred-work notes explicitly say re-evaluate only when 2.6 plumbing lands. `weightedPicker` consumes exactly one roll, so tier ≥ 1 stays at 2 rolls. The combined single-roll `pick` over `{1:0.4, 2:0.4, ...norm}` is the N1 full assembly — Story 2.6's `resolveSpawn`.
- **AC 4 "combined distribution picked by a `weightedPicker`" — how this story satisfies it:** the combined distribution IS picked through `weightedPicker` in its two-stage form here: the band roll selects the fixed-vs-pot band, and `weightedPicker` picks within the pot from the `normalizeTo(POT_WEIGHT, …)` weights — re-normalizing internally and never trusting its input to sum exactly (N1 float rule). The single-roll combined pick (`resolveSpawn` assembling `{...fixed, ...norm}` in one call) is deliberately deferred to Story 2.6, per the 2.3 deferred-work draw-count contract. `weightedValue` keeps the two-stage structure so every pinned draw-count/backward-compat test stays green; 2.6 replaces it without touching `weights.ts`.
- **N1 float rule is the load-bearing constraint (AC 4):** `normalizeTo` scales weights to a target sum and `weightedPicker` re-normalizes by dividing thresholds by its own computed `total`. Neither trusts the input to sum to 1.0. All float assertions use **epsilon tolerance** (`1e-9`), never exact equality.
- **Backward compatibility:** default `tier = 0` → `potForTier(0)` is `[3]`, `pot.length === 1` short-circuit returns `3` with a single roll — `weightedValue` behaves identically to today for every existing caller and test. `game.test.ts:22` boundary assertions (`0.39→1, 0.4→2, 0.79→2, 0.8→3, 0.999→3`) MUST stay green unchanged.
- **Existing `pot.test.ts` wiring assertions happen to stay green under halving decay — verify, don't assume:** `weightedValue(rngOf(0.9, 0.99), 1) → 6`, `weightedValue(rngOf(0.9, 0.4), 1) → 3`, `weightedValue(rngOf(0.9, 0.99), 5) → 96`, `weightedValue(rngOf(0.9, 0.0), 5) → 3` all still hold (0.99 maps to the last slot, 0.0 to the first, for any monotonic decreasing weight set). The **only** stale test is the uniform-reachability test in `pot-tier-pipeline.test.ts` — it must be rewritten weighted-aware (see tasks). Do not silently delete its coverage intent.
- **Defensive guards worth adding (cheap insurance):** `normalizeTo` returns `weights.map(() => 0)` when `total <= 0`; `weightedPicker` returns `weights.length - 1` on non-finite total/roll. These guard the pre-existing `pickIndex` NaN-leak class for the new path (contract-violating `Rng` only), matching the deferred-work hardening direction from 2.3. **Note the combined degenerate path:** if `normalizeTo` ever yields all-zero weights, `weightedPicker`'s own `!(total > 0)` guard returns the last index (highest pot value) — an intentional "never undefined" fallback for contract-violating config only; the happy path never produces zeros (`potWeights` is all-positive for the FR-7 ladder).
- `src/engine` never imports RN/React/Skia/Expo. TS imports use explicit `.ts` extensions (ESM); `strict: true` is on — type pot params as `readonly number[]`.
- No external dependencies, no build step, no Expo/RN surface touched in this story — the `AGENTS.md` "read Expo v57 docs before writing code" reminder does not apply to pure-engine work; skip Expo docs unless a render/service surface is touched.

### Project Structure Notes

- New module mirrors the single-responsibility pure-module pattern: `triade/src/engine/core/weights.ts`, exported via `triade/src/engine/core/index.ts` — same shape as `ceiling.ts` (2.1) / `pot.ts` (2.3). It imports `POT_BASE_VALUE` from `../config/spawnConfig.ts` and `type Rng` from `./types.ts` only.
- Tests live beside the engine suite in `triade/__tests__/engine/` and run with the repo's node:test setup (`npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`). Import from `../../src/engine/core/index.ts` and `../../test-utils/helpers.ts` exactly as sibling engine tests do.
- **CRITICAL — wrong codebase trap:** the repository also contains a legacy vanilla-JS web PWA under the root `js/`. **Implement in `triade/`.** Do not edit `js/game.js` or add npm dependencies — `triade/` is the active RN + Expo + Skia + TypeScript app. The root `_bmad-output/project-context.md` describes that legacy PWA and is STALE for Epic 2.

### Project Context Rules

- Implement game rules only inside `triade/src/engine` (never in `ui`/`render`/`services`). Rule duplication breaks the deterministic test suite.
- Randomness flows through the injectable `rng` param (`Rng = () => number`); `weightedPicker` keeps that boundary — one draw, never `Math.random` inside the pure path beyond the existing default params.
- `spawnConfig` is data validated by tests; the curve must key off `POT_BASE_VALUE`/`POT_WEIGHT` — never scattered literals (architecture boundary rule 4).
- `move()` returns `{ board, score, moved, trace }` — untouched in this story; tier plumbing into `move()` plus `pendingSpawn` is Story 2.6.
- The ceiling/tier is derived from the board each time — never stored in state/snapshot (ADR-06); undo rewinds it for free.

### References

- Epic 2 + Story 2.4 spec: `_bmad-output/planning-artifacts/epics.md` (Epic 2, "Story 2.4: Curva halving-decay normalizada", lines ~413–428)
- Adaptive Spawn design (N1 resolver components, `normalizeTo`/`weightedPicker` float rule, boundary rule 4): `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (N1, lines ~663–693; module map lines ~568–645)
- GDD Adaptive Spawn halving-decay curve: `_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md` (Adaptive Spawn, line ~96)
- Engine source to read before editing: `triade/src/engine/core/{spawn.ts,pot.ts,ceiling.ts,index.ts,types.ts}`, `triade/src/engine/config/spawnConfig.ts`
- Previous story intelligence: `_bmad-output/implementation-artifacts/2-3-pot-tierizado-por-teto.md` (uniform placeholder note, draw-count contract, deferred `POT_WEIGHT`-never-consulted item) and `_bmad-output/implementation-artifacts/2-2-pesos-fixos-1-2-em-40-40.md` (threshold coupling, float rule)
- Test conventions: `triade/__tests__/engine/{game.test.ts,spawn.test.ts,pot.test.ts,pot-tier-pipeline.test.ts,ceiling.test.ts}`, `triade/test-utils/helpers.ts` (`rngOf`, `mulberry32`, `boardWith`)

## Dev Agent Record

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-2-4-curva-halving-decay-normalizada.md`
- API/unit tests: `triade/__tests__/engine/weights.test.ts` (new, RED)
- Component/unit tests: `triade/__tests__/engine/pot-tier-pipeline.test.ts` (modified — weighted-aware reachability, RED)

### Agent Model Used

opencode-go/deepseek-v4-flash

### Debug Log References

- Activated the pre-existing ATDD RED scaffolds (weights.test.ts 10× `test.skip`, pot-tier-pipeline reachability `test.skip`) by removing `test.skip` after the GREEN implementation landed; the initial RED state was verified during ATDD (TypeError: potWeights is not a function).
- `weightedValue` two-stage draw preserved: band roll first (FIXED_WEIGHTS thresholds), then exactly one `weightedPicker` roll for pot length > 1. Tier 0 short-circuits on `pot.length === 1` — no second draw. Verified by pot.test.ts draw-count pins (1 / 2 / 1 rolls).
- `normalizeTo(POT_WEIGHT, potWeights(pot))` sums to 0.2; `weightedPicker` re-normalizes internally via its own `reduce` (N1 float rule) — never trusts input to sum to 1.
- Defensive guards: `normalizeTo` returns all-zeros on non-positive total; `weightedPicker` returns `weights.length - 1` on non-finite total or NaN roll (never an undefined index).
- Boundary semantics: strict `<` accumulation (scaled < acc returns i) — `rngOf(2/3 ± 1e-6)` boundary test pins the `<` vs `<=` behavior for both `[1, 0.5]` and `[2/3, 1/3]`.
- Statistical sampling (AC 5): tier 1 & 5, N=100_000, strict band/pick alternation (band → 0.9, pick → mulberry32 stream) so every sample lands in the pot branch; within-pot frequencies within ±1% absolute of halving-decay ratios.
- Full suite: 245 pass, 0 fail, 0 skipped. `npx tsc --noEmit -p tsconfig.test.json`: only the pre-existing TS 6 `baseUrl` deprecation notice.

### Completion Notes List

- Implemented `triade/src/engine/core/weights.ts` with `potWeights` (halving-decay, `pot.map(v => POT_BASE_VALUE / v)` — exactly FR-8 keyed off `POT_BASE_VALUE`, no scattered literals), `normalizeTo` (scales to target sum, fresh array, all-zeros guard), and `weightedPicker` (returns index, re-normalizes internally, exactly one rng draw, NaN/zero-total guard → last index).
- Wired `weightedValue` in `triade/src/engine/core/spawn.ts` to use the halving-decay pick: `pot[weightedPicker(normalizeTo(POT_WEIGHT, potWeights(pot)), rng)]`; imported `POT_WEIGHT` from spawnConfig and the weights module. `pickIndex` untouched/exported for empty-cell picks. Two-stage structure and RNG-consumption contract preserved (tier 0 → 1 roll, tiers ≥ 1 → 2 rolls).
- Re-exported `potWeights, normalizeTo, weightedPicker` from `triade/src/engine/core/index.ts`.
- Activated the ATDD scaffolds: `weights.test.ts` (10 scenarios) and the weighted-aware reachability test in `pot-tier-pipeline.test.ts` (midpoint rolls, never exact boundaries).
- All 5 acceptance criteria satisfied: FR-8 literal halving matrix, per-tier normalization to POT_WEIGHT (1e-9), strict monotonicity with halving ratio, weightedPicker re-normalization + draw-count, and statistical frequency sampling (±1% absolute).
- Backward-compat pins green unchanged: game.test.ts:22 boundary assertions, spawn.test.ts drift tripwire + distribution-sum invariant, pot.test.ts draw-count pins + wiring assertions (`weightedValue(rngOf(0.9, 0.99), 5) → 96`, `weightedValue(rngOf(0.9, 0.0), 5) → 3`).

### File List

- triade/src/engine/core/weights.ts (new: potWeights, normalizeTo, weightedPicker)
- triade/src/engine/core/spawn.ts (modified: halving-decay weighted pot branch)
- triade/src/engine/core/index.ts (modified: weights re-export)
- triade/__tests__/engine/weights.test.ts (new: halving matrix, normalization, monotonicity, picker re-normalization, draw-count, statistical sampling, purity)
- triade/__tests__/engine/pot-tier-pipeline.test.ts (modified: uniform reachability → weighted-aware reachability)

### Change Log

- Implemented story 2.4 (curva halving-decay normalizada): halving-decay weight curve + normalization + weighted picker wired into `weightedValue`'s pot branch (Date: 2026-08-21)

### Review Findings

- [x] [Review][Patch] `weightedPicker([])` returns `-1` — an undefined index, contradicting the defensive-guard contract ("never an undefined index"). Reachability today: none — `spawn.ts` short-circuits `pot.length === 1` and `potForTier` always yields ≥ 1 element; latent only for direct callers. Fix: return `0` (or clamp) when `weights` is empty. [triade/src/engine/core/weights.ts:17]
- [x] [Review][Defer] `weightedValue` retorna `undefined` para pot vazio — a composição guarda só `pot.length === 1`; se `potForTier` retornasse `[]`, `normalizeTo(POT_WEIGHT, [])` → `[]` → `weightedPicker([], rng)` → `0` → `pot[0]` → `undefined` silencioso de uma função tipada `number` [triade/src/engine/core/spawn.ts:18-21] — deferred, pre-existing: `potForTier` sempre retorna ≥ 1 elemento (pot.ts:8, `length t+1`, tier clampado ≥ 0); o caminho antigo via `pickIndex` igualmente quebrava em pot vazio. Latente para callers futuros de `potForTier`.