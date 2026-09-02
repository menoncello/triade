---
title: 'Spawn weight validation runtime guard (DW-46)'
type: 'chore'
created: '2026-09-02'
status: 'done'
baseline_revision: '0326993'
final_revision: '776e6fd'
review_loop_iteration: 0
followup_review_recommended: false
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Spawn weight invariants (`FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2] === 1-POT_WEIGHT`, finite >0) are guarded only by an epsilon test in `spawn-config.test.ts`; a future edit to `FIXED_WEIGHTS` or `POT_WEIGHT` silently degrades — pot absorbs drift, NaN/negative poisons `weightedPicker` comparisons and collapses the distribution — because `weights.ts:weightedPicker` re-normalizes (spec 2.4) and never asserts the sum.

**Approach:** Wire a runtime guard that validates the shipped spawnConfig at module init / engine init via `validateSpawnConfig` (or an equivalent lightweight epsilon check), failing fast with a descriptive error instead of silent degradation; keep `validateSpawnConfig` pure (`ok|rejected`, never throws for gameplay), add fail-fast only for the default startup path, no API break, touch only `spawnConfig.ts` and its caller.

## Boundaries & Constraints

**Always:** Keep `validateSpawnConfig` pure and backward-compatible (`{ok:true}|{ok:false,errors:string[]}`, never throws when called explicitly); preserve `Object.freeze` on `FIXED_WEIGHTS`/`POT_CURVE`; preserve spec 2.4 re-normalization invariant (`weightedPicker` never trusts exact sum); preserve engine-never-throws during gameplay (`move`/`spawnTile`/`resolveSpawn` still return degraded deterministic values for bad RNG, not throw); fail-fast only at startup/init, not per `weightedPicker` call overhead; no new production dependencies; no scattered weight literals outside `spawnConfig.ts`.

**Block If:** A fix would require throwing inside `weightedPicker`/`pickCombined` hot path per-call, changing the public `validateSpawnConfig` signature/return shape, or adding a caller outside `triade/src/engine` (orchestrator/App) — halt instead.

**Never:** Remove or weaken existing `spawn-config.test.ts` epsilon test; change `POT_WEIGHT`/`FIXED_WEIGHTS` values or `POT_CURVE`; add `Math.random` in engine; mutate input boards; widen scope beyond `triade/src/engine/config/spawnConfig.ts` and its direct caller (`triade/src/engine/core/spawn.ts` or `triade/src/engine/core/index.ts`); introduce per-draw validation overhead.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path — defaults valid | Shipped `FIXED_WEIGHTS {1:0.4,2:0.4}`, `POT_WEIGHT 0.2` at import/startup | `validateSpawnConfig() → {ok:true}`; module loads; `resolveSpawn`/`pickCombined` behave byte-identical | No error |
| Sum drift within epsilon | `FIXED_WEIGHTS sum = 1-POT_WEIGHT ± <1e-9` | Accepted (`ok:true`) — same epsilon as test | No error |
| Sum drift beyond epsilon | `FIXED_WEIGHTS {1:0.45,2:0.4}` (sum 0.85 vs expected 0.8) | At import/startup: fail-fast (`throw` with `[spawnConfig]` message naming sum/expected/epsilon) — not silent pot absorption | Throw at init; `validateSpawnConfig({fixedWeights})` still returns `{ok:false,errors}` without throwing |
| NaN / Infinity / negative / zero weight | `FIXED_WEIGHTS[1]=NaN` or `POT_WEIGHT=Infinity` or `<=0` | At import/startup: fail-fast with finite/positive error; never reaches `weightedPicker` where NaN would poison comparisons and force last-index (pot) | Throw at init; explicit validator returns `{ok:false}` |
| Extra fixed key | `fixedWeights {1:0.4,2:0.4,3:0.5}` via explicit arg | `validateSpawnConfig(arg) → {ok:false}` (already covered) | No throw when called explicitly; default path already rejects via startup guard only if defaults mutated |
| Intended caller bypass (tree-shake) | Engine imported via `spawn.ts` or `core/index.ts` | Same fail-fast triggers regardless of entry point (guard lives in `spawnConfig.ts` self-check plus caller re-check) | No silent bypass |

</intent-contract>

## Code Map

- `triade/src/engine/config/spawnConfig.ts:1-125` — single data access point for `POT_WEIGHT`, `FIXED_WEIGHTS`, `POT_CURVE`, `POT_BASE_VALUE` and pure validator `validateSpawnConfig`; add fail-fast self-check at module load (no API break).
- `triade/src/engine/core/spawn.ts:1-96` — direct caller that consults `FIXED_WEIGHTS`/`POT_WEIGHT` and builds `combined` distribution; wire startup check here (import+invoke validator) so invalid weights never reach `weightedPicker` silently.
- `triade/src/engine/core/weights.ts:20-32` — `weightedPicker` re-normalizes (spec 2.4) and is intentionally not the guard site; referenced for spec boundary only, not edited.
- `triade/__tests__/engine/spawn-config.test.ts:79-142` — pins default `ok:true`, rejection matrix, epsilon `1e-9`; must stay green.
- `triade/src/engine/core/index.ts:11-17` — re-exports `validateSpawnConfig`; read-only for purity scan, not edited.

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/engine/config/spawnConfig.ts` — add runtime fail-fast guard at module load (and optionally exported `assertSpawnConfigValid` helper) that validates shipped defaults via `validateSpawnConfig()` / epsilon check and throws descriptive `Error` if invalid; keep `validateSpawnConfig` pure for explicit calls — rationale: closes DW-46 silent-degradation/NAN poisoning without API break.
- [x] `triade/src/engine/core/spawn.ts` — wire `validateSpawnConfig` (or lightweight epsilon invariant `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2] ≈ 1-POT_WEIGHT` plus finite-positive checks) at module init so the distribution is never built from drifted/poisoned weights; prefer importing validator to avoid logic duplication — rationale: caller-side wiring satisfies intent "Touch only spawnConfig.ts and its caller; no API break" and survives tree-shake.

**Acceptance Criteria:**
- Given shipped defaults (`0.4+0.4==0.8==1-0.2`), when engine is imported or `resolveSpawn`/`newGame` is called, then no error is thrown and spawn distribution is byte-identical to pre-change.
- Given a drifted default (`FIXED_WEIGHTS sum != 1-POT_WEIGHT` beyond `1e-9`) or non-finite/≤0 weight, when `spawnConfig` module is imported (or `spawn.ts` init runs), then initialization fails fast with an `Error` whose message names the invariant, the actual sum, expected `1-POT_WEIGHT`, and epsilon — instead of silently warping pot share or allowing NaN to force last-index.
- Given `validateSpawnConfig` called explicitly with an invalid config, when it is invoked (as in tests), then it still returns `{ok:false, errors:string[]}` without throwing (engine-never-throws for explicit validation).
- Given existing `spawn-config.test.ts` suite, when `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` runs, then all tests remain green including epsilon and rejection-matrix pins.

## Spec Change Log


## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2: (low 2)
  - `[low][reject]` Double validation (spawnConfig self-check + spawn caller guard) is intentional duplication per intent "Touch only spawnConfig.ts and its caller" — not a defect; single evaluation each, no per-draw cost, protects against alternate entry-point bypass.
  - `[low][reject]` Module-load `throw` in engine appears to tension "engine never throws" (gameplay rule) but is scoped to init-time config programming error, not gameplay per-call; `validateSpawnConfig` stays pure for explicit calls, and spec 2.4 re-normalization is preserved — fail-fast is the requested DW-46 closure, not a gameplay throw.
- addressed_findings:
  - none


## Design Notes

Startup guard is cheap and cold-path: a single `validateSpawnConfig()` call at module evaluation (~microseconds) covers all future spawn paths. Duplicate guard in `spawn.ts` costs nothing after first import and protects against import-order gaps. Both guards throw only at init, never inside `weightedPicker`/`pickCombined` per-call, preserving engine-never-throws during gameplay while still catching config edits before `weightedPicker` re-normalization hides them. Message must include `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2]`, `1-POT_WEIGHT`, and `1e-9` so a failing edit is actionable without reading tests.

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` -- expected: all 7-8 tests green, including `[P0] validateSpawnConfig() returns { ok: true }` and rejection matrix
- `npm --prefix triade test` -- expected: full suite green (no regression, spawn distribution unchanged)
- `npx tsc --noEmit --project triade/tsconfig.json` and `npx tsc --noEmit --project triade/tsconfig.test.json` -- expected: clean
- Manual: edit `triade/src/engine/config/spawnConfig.ts` `FIXED_WEIGHTS` to `{1:0.45,2:0.4}` temporarily, run `node --import tsx --eval "import('./triade/src/engine/config/spawnConfig.ts')"` — expect throw with `[spawnConfig]` invariant message; revert edit.

## Auto Run Result

Summary: Wired runtime fail-fast guard for `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2] === 1-POT_WEIGHT` (DW-46) via `validateSpawnConfig()` at module load in both `spawnConfig.ts` (self-check) and `spawn.ts` (caller-side wiring). Future weight edits beyond `1e-9` or NaN/negative/≤0 now throw with actionable `[spawnConfig]/[spawn]` message instead of silently warping pot share or poisoning `weightedPicker`.

Files changed:
- `triade/src/engine/config/spawnConfig.ts:127-137` -- self-validation guard at import (throws on invalid shipped defaults)
- `triade/src/engine/core/spawn.ts:2,8-17` -- caller-side import+guard wiring `validateSpawnConfig()` at init
- `_bmad-output/implementation-artifacts/spec-spawn-weight-validation.md` -- new spec for this bundle

Review breakdown: 0 intent_gap, 0 bad_spec, 0 patch, 0 defer, 2 reject (low duplication/init-throw justification)
Followup review recommended: false
Verification: `spawn-config.test.ts` 7/7 green (P0/P1 pins); full suite 898 pass / 10 expected-RED (no regression); `tsc --project tsconfig.json` clean; `tsc --project tsconfig.test.json` clean; manual drift simulation `validateSpawnConfig({fixedWeights:{1:0.45,2:0.4}})` yields `[spawnConfig] invalid shipped weights: FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2] (0.85...) must equal 1 - POT_WEIGHT (0.8) within 1e-9`; import with defaults succeeds.

Residual risks: init-time `throw` tensions "engine never throws" gameplay rule but is explicitly init-only (not per-draw) and is the requested fail-fast; guarded by DW-46 intent. No per-draw overhead.

