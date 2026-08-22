---
baseline_commit: e3381d76b2665e0824550e28bcc68fa4ed981d4a
---

# Story 2.5: spawnConfig configurável

Status: done

## Story

As a developer,
I want the pot weight curve driven by a single configurable parameter set,
So that the curve can be tuned and playtest-calibrated without code changes.

## Acceptance Criteria

1. **Given** the `spawnConfig` module, **When** the curve is defined, **Then** weights are driven by one parameter per tile value (e.g., `{3: 1.0, 6: 0.5, 12: 0.25, ...}`) exposed in a config (FR-9).
2. **And** the config is data, not code, validated by engine tests (pot sums to 20%, epsilon tolerance).
3. **And** changing a weight value requires no code change and no rebuild beyond the config.
4. **And** the initial values are the halving decay (documented in the config and the architecture ADR/decision log).
5. **And** the config is the single access point — no scattered weight literals anywhere in `src/engine` (data pattern, boundary rule 4).

## Tasks / Subtasks

- [ ] Add the configurable pot curve to `src/engine/config/spawnConfig.ts` (AC: 1, 3, 4)
  - [ ] `export const POT_CURVE: Readonly<Record<number, number>> = { 3: 1, 6: 0.5, 12: 0.25, 24: 0.125, 48: 0.0625, 96: 0.03125 };` — one weight per tile value, keyed by tile VALUE (not index). Header comment documents: initial values = halving decay (`weight(v) = POT_BASE_VALUE / v`, i.e. each value weighs half the next-lower), tuning intent = playtest calibration via FR-9, and pointer to PRD decision-log entries #17/#23 (configurable curve + halving-decay initial values — the ADR/decision-log requirement of AC 4 is satisfied by these existing logged decisions plus this in-file documentation).
  - [ ] Keep `POT_WEIGHT`, `FIXED_WEIGHTS`, `POT_BASE_VALUE` exports and values EXACTLY as they are — every pinned test depends on them.
  - [ ] **Object.freeze hardening (closes deferred-work item from 2.2 review):** wrap all exported config data in `Object.freeze` (`FIXED_WEIGHTS`, `POT_CURVE`; freeze a shallow copy if needed to keep the exported type shape). The engine must not throw on mutation attempts from non-strict consumers; tests assert `Object.isFrozen(...) === true`.
- [ ] Add a pure config validator `validateSpawnConfig(): { ok: true } | { ok: false; errors: string[] }` in `spawnConfig.ts` (AC: 2)
  - [ ] Checks (all with epsilon `1e-9` where float): every `POT_CURVE` weight is finite and `> 0`; curve keys are positive multiples `POT_BASE_VALUE * 2^k`; curve weights strictly decreasing as values increase; `FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2]` ≈ `1 - POT_WEIGHT` (the threshold-coupling invariant); `FIXED_WEIGHTS` entries finite and `> 0`.
  - [ ] **Never throws** — engine consistency rule ("engine never throws", lint: no throw). Returns `ok: false` with human-readable error strings instead. This closes the "runtime validation" deferred-work item from the 2.2 review at the module level.
- [ ] Make `potWeights` config-driven in `src/engine/core/weights.ts` (AC: 1, 5)
  - [ ] Replace `pot.map((v) => POT_BASE_VALUE / v)` with curve lookup + documented fallback:
    ```ts
    return pot.map((v) => POT_CURVE[v] ?? POT_BASE_VALUE / v);
    ```
    Rationale: the tuned curve covers the FR-7 base ladder (`3..96`); the pot ladder extends to `3 * 2^30` (`MAX_POT_TIER` in pot.ts) and cannot be fully enumerated. Values beyond the last configured entry continue the halving rule via the formula fallback — so tiers ≥ 6 keep working with zero behavior change until someone adds an explicit entry for calibration. Document this override+fallback contract in a comment.
  - [ ] Import `POT_CURVE` from `../config/spawnConfig.ts` (weights.ts already imports `POT_BASE_VALUE` from there).
  - [ ] Signature stays `potWeights(pot: readonly number[]): readonly number[]` — no parameter threading; the config module remains the single access point (AC 5).
- [ ] Re-export from `src/engine/core/index.ts`
  - [ ] Add `POT_CURVE` and `validateSpawnConfig` alongside the existing `POT_WEIGHT, FIXED_WEIGHTS, POT_BASE_VALUE` export line.
- [ ] Add `__tests__/engine/spawn-config.test.ts` covering the NEW invariants (AC: 1, 2, 4)
  - [ ] **Literal curve matrix (AC 1):** `deepStrictEqual({ ...POT_CURVE }, { 3: 1, 6: 0.5, 12: 0.25, 24: 0.125, 48: 0.0625, 96: 0.03125 })` — exact, all values exactly representable.
  - [ ] **Curve structural invariants:** keys sorted ascending equal `POT_BASE_VALUE * 2^k`; weights finite `> 0`; strictly decreasing.
  - [ ] **Validator happy path (AC 2):** `validateSpawnConfig()` → `{ ok: true }` on the shipped defaults.
  - [ ] **Validator rejection matrix (AC 2):** against mutated copies (build a temp object mirroring the checks or refactor validator to accept an optional config param — see Dev Notes): NaN weight, zero/negative weight, Infinity, fixed-sum drift beyond `1e-9`, non-monotonic curve, key that is not `POT_BASE_VALUE * 2^k`. Each returns `{ ok: false }` with a non-empty `errors` array; never throws.
  - [ ] **Freeze pin:** `Object.isFrozen(POT_CURVE)` and `Object.isFrozen(FIXED_WEIGHTS)` both true.
  - [ ] **Fallback-rule proof (AC 1 vs MAX_POT_TIER):** for tiers `6..12`, `potWeights(potForTier(t))` continues strict halving beyond the configured range (each successive weight ≈ half the previous within `1e-9`) even though those values have no `POT_CURVE` entry.
  - [ ] Use `rngOf`/helpers conventions from sibling engine tests only as needed (this file is mostly pure-data assertions).
- [ ] Verify NO behavior change — full suite green unchanged (AC: 2, 5)
  - [ ] `npm test` (runs `node --test` via tsx loader — plain `node --test` does NOT work) → all green, including: `game.test.ts:22` boundary assertions, `spawn.test.ts` drift tripwire + distribution-sum invariant, `pot.test.ts` ladder matrix + draw-count pins + wiring assertions, `weights.test.ts` FR-8 literal matrix + statistical sampling ±1%/±10%, `pot-tier-pipeline.test.ts` weighted-aware reachability. For the FR-7 ladder the curve lookup and the old formula produce IDENTICAL weights, so every distribution/statistics pin must pass untouched — if any needs editing, STOP and re-read the scope guard below.
  - [ ] `npx tsc --noEmit -p tsconfig.test.json` → only the pre-existing TS 6 `baseUrl` deprecation notice expected.
  - [ ] Source-keying purity stays green: `weights.test.ts` asserts weights.ts imports end with `spawnConfig.ts` (now doubly true — it imports `POT_CURVE` too).

## Dev Notes

- **Scope guard (CRITICAL):** This story makes the curve CONFIGURABLE and adds config validation/freezing. It is a pure refactor + config surface: runtime spawn behavior must be BYTE-FOR-BYTE identical (initial curve ≡ halving formula for every reachable ladder value ≤ 96, and the fallback reproduces the formula beyond). It does NOT build `resolveSpawn`/`pendingSpawn`/tier-in-`move()`/combined single-roll pick (that is 2.6), does NOT change any function signature, and does NOT touch render/UI/services. No Expo/RN surface is touched — skip Expo docs (pure-engine story, same call as 2.4).
- **Where this sits in Epic 2:** 2.1 ceiling/tier; 2.2 extracted fixed 40/40 + `POT_WEIGHT` into `spawnConfig.ts` (single data access point established); 2.3 tiered pot + uniform placeholder; 2.4 halving-decay `potWeights` derived from `POT_BASE_VALUE` with an explicit note that "2.5 will replace the formula with config-driven weights". This story fulfills exactly that promise (FR-9). Tier flow after this story: board → `ceilingDetector` → `tierForCeiling` → `potForTier` → `potWeights` (curve lookup, formula fallback) → `normalizeTo(POT_WEIGHT, …)` → `weightedPicker` → tile value.
- **Validator design decision (ok|rejected, not throw):** architecture consistency rule says "Result: `ok | rejected`; engine never throws" and lint forbids throw in engine. So validation is a pure predicate, asserted in tests — NOT a module-load gate. Wiring the validator into startup/orchestrator is deliberately out of scope (orchestrator work belongs to 2.6's integration). To make the rejection matrix testable without mutating frozen exports, prefer giving the validator an optional parameter: `validateSpawnConfig(config = defaultConfig)` — internal use passes nothing; tests construct bad configs. Keep the public no-arg call working.
- **Why override+fallback in `potWeights` (do not "simplify" away the fallback):** `potForTier` can emit up to `3 * 2^30` (MAX_POT_TIER clamp, pot.ts:4-8). Enumerating every reachable value in config is impossible and pointless; AC 1's example `{3: 1.0, 6: 0.5, ...}` covers the calibratable range. The fallback keeps unlisted values on the documented halving rule — which is also AC 4's "initial values are the halving decay" applied everywhere. If a future playtest wants to retune value 192+, you add ONE config entry — no code change (AC 3).
- **Threshold coupling still load-bearing:** `weightedValue` reads only `FIXED_WEIGHTS` to compute band thresholds (`roll < FIXED_WEIGHTS[1]`, `< FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2]`). The invariant `FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2] ≈ 1 - POT_WEIGHT` moves from test-only enforcement to ALSO being checked by `validateSpawnConfig` — but the sum test in `spawn.test.ts` must stay green regardless.
- **Deferred-work items closed by this story (cite them in the completion notes):**
  1. 2.2 review: "Sem validação em runtime dos pesos em spawnConfig … revisitar quando 2.5 tornar spawnConfig configurável" → closed by `validateSpawnConfig`.
  2. 2.2 review: "`Readonly<Record<…>>` é somente compile-time; objeto mutável em runtime (sem Object.freeze) — revisitar quando 2.5 tornar spawnConfig configurável" → closed by freezing config data.
  Note what is NOT closed: 2.3's "POT_WEIGHT exported but never consulted" stays as-is — `weightedValue` keeps deriving thresholds from `FIXED_WEIGHTS` (two-stage draw is 2.6 territory).
- **Backward compatibility pins (must stay green UNCHANGED):** `weightedValue(rngOf(0.9))` → 3; `weightedValue(rngOf(0.9, 0.99), 5)` → 96; `weightedValue(rngOf(0.9, 0.0), 5)` → 3; draw counts 1/2/1; FR8_HALVING deepStrictEqual; statistical sampling frequencies. Any edit needed to these tests means the implementation broke byte-for-byte equivalence — fix the implementation, not the test.
- `src/engine` never imports RN/React/Skia/Expo. TS imports use explicit `.ts` extensions (ESM); `strict: true` — type the curve as `Readonly<Record<number, number>>`.
- No new dependencies, no build step (AC 3's "no rebuild beyond the config" is trivially true here: the config is a TS module consumed at import time; there is no separate bundling step for engine data).

### Project Structure Notes

- All changes live in existing files: `triade/src/engine/config/spawnConfig.ts` (curve + validator + freeze), `triade/src/engine/core/weights.ts` (config-driven `potWeights`), `triade/src/engine/core/index.ts` (re-exports), plus one NEW test file `triade/__tests__/engine/spawn-config.test.ts`. Same single-responsibility pure-module pattern as 2.1–2.4.
- Tests run with the repo's node:test setup: `npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` (run inside `triade/`).
- **CRITICAL — wrong codebase trap:** the repository also contains a legacy vanilla-JS web PWA under root `js/`. **Implement in `triade/`.** Do not edit `js/game.js` or add npm dependencies.

### Project Context Rules

- Game rules only inside `triade/src/engine` — never in `ui`/`render`/`services`.
- Randomness flows through the injectable `rng` param; untouched in this story (no draw-count change).
- `spawnConfig` is data validated by tests; after this story it is ALSO freezable/frozen data with a pure validator — still no scattered literals anywhere in `src/engine` (boundary rule 4). The ONLY numeric weight literals allowed in engine code are inside `spawnConfig.ts` itself and its tests.
- `move()` returns `{ board, score, moved, trace }` — untouched; tier plumbing into `move()` + `pendingSpawn` is Story 2.6.
- Ceiling/tier derived from the board each time — never stored (ADR-06).

### References

- Epic 2 + Story 2.5 spec: `_bmad-output/planning-artifacts/epics.md` (Epic 2, "Story 2.5: spawnConfig configurável", lines ~429–443; FR-9 line ~157)
- Architecture N1 resolver + float rule: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (N1 lines ~663–693; boundary rule 4 line ~645; module map line ~601; Data Patterns "config is data validated by tests" lines ~813–821; consistency rules table line ~830)
- GDD configurable curve intent: `_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md` (Adaptive Spawn line ~96: "The curve is configurable (one number per tile value)"; line ~314)
- Decision log (AC 4 documentation already exists here): `_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/decision-log.md` (#17 configurable curve, #23 halving-decay initial values)
- Engine source to read before editing: `triade/src/engine/config/spawnConfig.ts`, `triade/src/engine/core/{weights.ts,pot.ts,spawn.ts,index.ts}`
- Previous story intelligence: `_bmad-output/implementation-artifacts/2-4-curva-halving-decay-normalizada.md` (scope guard promising THIS story, backward-compat pins list), `_bmad-output/implementation-artifacts/2-2-pesos-fixos-1-2-em-40-40.md` (threshold coupling, the two deferred hardening items this story closes)
- Deferred-work ledger: `_bmad-output/implementation-artifacts/deferred-work.md` (2.2 section — runtime validation + Object.freeze revisit triggers)

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-2-5-spawnconfig-configuravel.md`
- Unit tests (RED scaffolds): `triade/__tests__/engine/spawn-config.test.ts` (7× `test.skip()`)

### Review Findings

- [x] [Review][Patch] validateSpawnConfig silently accepts extra keys in fixedWeights — only keys 1 and 2 are validated, but SpawnConfigInput.fixedWeights is typed Readonly<Record<number, number>>; a test-only config like {1:0.4, 2:0.4, 3:0.5} passes {ok:true}. Impossible via the shipped export (typed Record<1|2, number>), test-surface edge only. Fix: reject keys other than 1 and 2. [spawnConfig.ts:104-109]
  - FIXED (2026-08-22): validator rejects non-1/2 keys in FIXED_WEIGHTS; rejection matrix adds the extra-key case; 266/266 green.
- [x] [Review][Decision] Effective-curve monotonicity not validated across config gaps — `validateSpawnConfig` checks strict decrease only over *listed* POT_CURVE entries, but `potWeights` fills every unlisted ladder value via the halving fallback. A config like `{ 3: 1, 6: 0.5, 48: 0.02 }` passes validation yet produces a non-monotonic *effective* curve (tier-5 weights: `1, 0.5, 0.25, 0.125, 0.02, 0.03125` — rises from 48→96). Decision needed: should the validator also guarantee effective-curve (config+fallback) monotonicity, or is validating configured entries only the intended contract? [spawnConfig.ts:65-72, weights.ts:9-11]
  - RESOLVED (2026-08-22): validate effective-curve monotonicity. Implemented — successor/predecessor boundary checks on every configured entry.
- [x] [Review][Patch] New test file breaks CI typecheck — `npx tsc --noEmit` (default tsconfig, as CI runs) fails with TS2322 at `__tests__/engine/spawn-config.test.ts:102,7`: accumulator `let result: { ok: boolean; errors: string[] } | undefined` cannot accept the validator's `{ ok: true }` branch (no `errors` key). Fix: widen to `{ ok: boolean; errors?: string[] } | undefined` or `ReturnType<typeof validateSpawnConfig> | undefined`. Note: `tsconfig.test.json` masks this (only the pre-existing baseUrl deprecation), so the story's stated gate does not catch it — the CI default-tsconfig gate does. [__tests__/engine/spawn-config.test.ts:100-102]
  - FIXED (2026-08-22): accumulator widened to `{ ok: boolean; errors?: string[] } | undefined`; `npx tsc --noEmit` clean.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
