---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-spawn-weight-validation.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/weights.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/__tests__/engine/spawn-config.test.ts'
  - 'triade/__tests__/engine/adaptive-spawn-integration.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-spawn-weight-validation — runtime guard for spawn weight invariants (DW-46)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-spawn-weight-validation`
**Scope:** Targeted test design for the working-tree delta of `dw-spawn-weight-validation` (DW-46)

> **Delta under assessment:** Commit `f1aeb98 feat(engine): runtime guard for spawn weight invariants (DW-46)` (`_bmad-output/implementation-artifacts/spec-spawn-weight-validation.md` `baseline_revision 0326993`, `final_revision 776e6fd`) vs baseline `0326993`. Production-side delta (2 files + 1 spec, no test harness change):
> - `triade/src/engine/config/spawnConfig.ts:127-137` — NEW startup fail-fast guard: `const _defaultSpawnConfigValidation = validateSpawnConfig(); if (!_defaultSpawnConfigValidation.ok) throw new Error('[spawnConfig] invalid shipped weights: ' + errors.join('; '))` at module load; preserves `validateSpawnConfig` pure (`ok|rejected` never throws when called explicitly), `Object.freeze` on `FIXED_WEIGHTS`/`POT_CURVE` (`triade/src/engine/config/spawnConfig.ts:13,17`), `POT_WEIGHT 0.2` (`triade/src/engine/config/spawnConfig.ts:11`), `EPSILON 1e-9` (`triade/src/engine/config/spawnConfig.ts:26`).
> - `triade/src/engine/core/spawn.ts:2,8-17` — NEW caller-side guard: `import { validateSpawnConfig }` + `const _spawnWeightValidation = validateSpawnConfig(); if (!_spawnWeightValidation.ok) throw new Error('[spawn] invalid spawn weights: ' + ...)` at module evaluation; closes bypass if `spawnConfig` self-check is tree-shaken or import bypasses `spawnConfig` singleton entry point; NOT per-draw (`pickCombined`/`weightedPicker` hot path untouched, `triade/src/engine/core/spawn.ts:27-33` + `triade/src/engine/core/weights.ts:20-32` re-normalizes per spec 2.4 but never asserts sum).
> - `_bmad-output/implementation-artifacts/spec-spawn-weight-validation.md:1-108` — NEW spec bundle wiring intent/boundaries/I-O matrix (6 rows) + Code Map + 2 Tasks + 4 ACs + Review Triage (2 low reject) + Verification.
> - Working-tree diff vs `HEAD` is metadata-only: `_bmad-output/implementation-artifacts/deferred-work.md` DW-46 `status: open` → `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-spawn-weight-validation` + `resolution-undo: db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b 2026-09-02 7374617475733a206f70656e` (3 insertions); `git diff --stat -- triade/src` vs `HEAD` is 0 (production delta already committed at `f1aeb98`); `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty (orchestrator-owned, never write/revert — instruction `sprint-status.yaml is owned by the orchestrator: never write it, and never revert a change to it.`).

---

## Executive Summary

**Scope:** Close DW-46 silent-degradation where `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2] === 1-POT_WEIGHT` is guarded only by an epsilon test in `triade/__tests__/engine/spawn-config.test.ts:96,118-122` (`Math.abs(sum - (1-0.2)) > 1e-9`), while `triade/src/engine/core/weights.ts:20-32` `weightedPicker` re-normalizes and never asserts the sum (spec 2.4). Without a runtime guard, a future edit drifting `0.4+0.4` → `0.85` vs `0.8` is silently absorbed by `pot` (warps `combined [0.4,0.4,...norm POT_WEIGHT]` → effectively `[0.45,0.4,...]` before re-normalize still skews band share), and `NaN`/non-finite/≤0 poisons `weightedPicker` comparisons (`acc += NaN` → never `scaled < acc` until last-index `return weights.length-1`: pot collapse).

The `f1aeb98` bundle adds the minimal startup-only guard: two module-load single-calls to `validateSpawnConfig()` (cold-path, `~µs`) that fail-fast with `[spawnConfig]`/`[spawn]` actionable message (`sum, expected 0.8, epsilon 1e-9`) before `weightedPicker` can hide the drift. `validateSpawnConfig` stays pure for explicit caller use, `weightedPicker` hot path keeps re-normalization per spec 2.4, engine-never-throws during gameplay (`move`/`spawnTile`/`resolveSpawn` per-call) is preserved — throw is only at init-time config programming error.

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (≥6): 3
- Critical categories: DATA/TECH (silent pot-share warp vs NaN poisoning vs weightedPicker re-normalization), TECH (init throw vs engine-never-throws tension), TECH (double-guard vs tree-shake bypass)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit: shipped-defaults `ok:true` no-throw at import, sum drift beyond `1e-9` fail-fast at `spawnConfig` import, NaN/Infinity/negative/zero fail-fast, explicit `validateSpawnConfig(invalid) → ok:false` never throws, existing `spawn-config.test.ts` 7/7 green including `1e-9` rejectionmatrix, byte-identical distribution `pickCombined`/`resolveSpawn` 40/40/20 across tiers before/after)
- P1 scenarios: 8 groups (epsilon boundary `<1e-9` accepted vs `>1e-9` rejected, extra fixed key `key 3` via explicit validator, tree-shake bypass alternative entry point `core/index.ts` triggers same throw, error-message actionable contents `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2]` + `1-POT_WEIGHT 0.8` + `1e-9`, no per-draw overhead scan)
- P2/P3 scenarios: 8 groups (no `Math.random` in engine, `Object.freeze` still `TypeError`, no new production deps, no scattered weight literals outside `spawnConfig.ts:1-13`, ledger `resolution-undo db8b509b…` 64-hex + `sprint-status.yaml` untouched, bench cold-start `<0.5 ms`, `tsc` both configs clean)
- **Total effort**: ~2.8–5.2 hours (~0.4–0.7 day; host-only, no device lane — pure `triade/__tests__/engine/spawn-config.test.ts` + `triade/src/engine` TS, `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` + `tsc --noEmit` gates `<15 min`, both configs clean)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Changing `POT_WEIGHT` 0.2 / `FIXED_WEIGHTS {1:0.4,2:0.4}` / `POT_CURVE {3:1,…,96:0.03125}` values, `POT_BASE_VALUE 3`, `EPSILON 1e-9`, `GRID_SIZE 4`, `MAX_POT_TIER 30`, merge rules `canMerge(1+2→3, ≥3 equal)` / `mergeValue` / merge-once cascade / `shiftLine` / `boardFromLines`, grid board, ceiling `ceilingDetector`/`tierForCeiling`, `potForTier`, `isNewRecord`, `previewFor`/`previewInvariant`/`ambiguity band`, `matchStats`/`matchScore`, `App.tsx`/`GameBoard` Skia/Reanimated, `RNGH` gesture, `layout.ts`/`Hud.tsx`, `src/feel` haptics/punch/shake/bullet/sfx, `src/game/matchStats` ladder** | Spec Boundaries `Never: Remove or weaken existing spawn-config.test.ts epsilon test; change POT_WEIGHT/FIXED_WEIGHTS values or POT_CURVE; add Math.random in engine; mutate input boards; widen scope beyond spawnConfig.ts and its direct caller` — `git diff --stat -- triade/src/engine` between `0326993` and `f1aeb98` shows 2 files only (`spawnConfig.ts + spawn.ts`), `pot.ts/weights.ts/board.ts/line.ts/ceiling.ts/game.ts/types.ts` byte-identical per `git diff HEAD -- triade/src/engine/core` 0 beyond the 2 guards; values are data-only edits via `spawnConfig.ts` FR-9, not code. | Invariants stay gated by existing suites `spawn-config.test.ts` 7/7 + `pot.test.ts`/`adaptive-spawn-integration.test.ts`/`engine.purity.test.ts` green + `tsc` both configs clean; this plan never changes `POT_WEIGHT`/`FIXED_WEIGHTS` literals (scans pin them). |
| **Removing or weakening `triade/__tests__/engine/spawn-config.test.ts` epsilon pin (`1e-9`) or `Object.freeze` pin, or touching `weightedPicker` re-normalization logic** | Spec Boundaries `Always: Keep validateSpawnConfig pure and backward-compatible; preserve Object.freeze; preserve spec 2.4 re-normalization invariant (weightedPicker never trusts exact sum); preserve engine-never-throws during gameplay; Never: Remove or weaken existing spawn-config.test.ts epsilon test` — `weightedPicker` at `triade/src/engine/core/weights.ts:20-32` is intentionally NOT the guard site per Code Map `weights.ts:20-32 — referenced for spec boundary only, not edited`. | Pinned via `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` must stay 7/7 green (P0 pins including `[P0] validateSpawnConfig() returns ok:true` + rejection matrix `spawnConfigOf({fixedWeights:{1:0.45,2:0.4}})` `fixed-sum drift beyond 1e-9` + `Object.freeze` `TypeError` throw) + `tsc` both configs + `rg -n "weightedPicker" triade/src/engine/core/weights.ts` unchanged confirm. |
| **Introducing per-draw validation inside `weightedPicker`/`pickCombined` hot path, changing public `validateSpawnConfig` signature `ok|rejected`, or adding a caller outside `triade/src/engine` (`orchestrator/App.tsx`)** | Spec Boundaries `Block If: A fix would require throwing inside weightedPicker/pickCombined hot path per-call, changing the public validateSpawnConfig signature/return shape, or adding a caller outside triade/src/engine` — startup guard is cold-path single call at module evaluation (`~µs`), duplicate caller guard in `spawn.ts` costs nothing after first import and protects import-order gaps per Design Notes. | Pinned via `rg -n "validateSpawnConfig\(\)" triade/src/engine/config/spawnConfig.ts` 1 hit at `134` `self-check` + `rg -n "validateSpawnConfig\(\)" triade/src/engine/core/spawn.ts` 1 hit at `14` `caller guard` + `rg -n "Math\.random" triade/src/engine/core/spawn.ts` 0 + per-draw scan `rg -n "validateSpawnConfig" triade/src/engine/core/weights.ts` 0; caller never outside `src/engine` (`rg -n "validateSpawnConfig" triade/src --glob '!test*' ` 2 hits only). |
| **Editing `_bmad-output/implementation-artifacts/deferred-work.md` beyond `DW-46 done+resolution-undo`, or writing/reverting `sprint-status.yaml`** | Spec `Never: widen scope beyond spawnConfig.ts and its direct caller`; orchestrator instruction `sprint-status.yaml is owned by the orchestrator: never write it, and never revert a change to it. A row at done or awaiting-operator is the orchestrator's own bookkeeping — not a defect to fix, and not proof that the work is verified.` | Working-tree `git diff` shows ledger `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-spawn-weight-validation` + `resolution-undo: db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b 7374617475733a206f70656e` (3 lines, `rg -n "db8b509b" _bmad-output/implementation-artifacts/deferred-work.md` 1 hit, `length 64` hex tail `7374617475733a206f70656e` = `status: open` hex); `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty. This plan never writes ledger or status. |
| **Board `role="grid"` a11y, dev-build physical device, frame-rate bench beyond host `<0.5 ms` init, rewarded-ads / RevenueCat / Epic 9-11, `js/game.js` UMD** | No a11y/bench/ads code touched; `js/game.js` UMD already removed (`e500e21` not in scope). | Existing 897 pass / 11 expected-RED baseline + `tsc` gates; device/bench remain `EXPECT REDUX` not caused by this bundle. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `validateSpawnConfig(config?: SpawnConfigInput) → {ok:true}|{ok:false,errors:string[]}` is pure with no I/O: `config.potCurve ?? POT_CURVE` + `config.fixedWeights ?? FIXED_WEIGHTS` (`triade/src/engine/config/spawnConfig.ts:38-41`) falls back to shipped frozen exports (`FIXED_WEIGHTS: Readonly<Record<1|2,number>> = Object.freeze({1:0.4,2:0.4})` `triade/src/engine/config/spawnConfig.ts:13`). Tests inject `spawnConfigOf({fixedWeights:{1:0.45,2:0.4}})` / `{1:NaN}` / `{1:0.4,2:0.4,3:0.5}` without mutating frozen data (`triade/__tests__/engine/spawn-config.test.ts:37-47` factory). Startup fail-fast is observable via `node --import tsx --eval "import('./triade/src/engine/config/spawnConfig.ts')"` throw/catch or `assert.throws(() => require)` in host harness without Expo/Skia/RNGH.

**Observability — Good.** Guard messages are deterministic strings containing the invariant, actual `fixedSum`, expected `1-POT_WEIGHT 0.8`, and epsilon `1e-9` (`triade/src/engine/config/spawnConfig.ts:118-122` `format: FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2] (${fixedSum}) must equal 1 - POT_WEIGHT (${1-POT_WEIGHT}) within ${EPSILON}`), re-thrown as `[spawnConfig] invalid shipped weights: ...` (`triade/src/engine/config/spawnConfig.ts:136`) and `[spawn] invalid spawn weights: ...` (`triade/src/engine/core/spawn.ts:16`), so `catch (e) { assert.match(e.message, /FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS\[2\].*0\.85.*1 - POT_WEIGHT.*0\.8.*1e-9/) }` is directly assertable. Explicit validator returns `errors: string[]` human-readable (`triade/__tests__/engine/spawn-config.test.ts:107-115` each `typeof message === 'string' && length>0`). `weightedPicker` re-normalization (`triade/src/engine/core/weights.ts:21-30`) not observable as failure until pot-collapse (last-index) — which the guard now surfaces at import instead.

**Reliability — Strong (init-throw vs gameplay-never-throws).** Shipped defaults `0.4+0.4==0.8==1-0.2` keep `validateSpawnConfig() → {ok:true}` (`triade/__tests__/engine/spawn-config.test.ts:79-81`) so `spawnConfig.ts:134-136` + `spawn.ts:14-16` guards are cold-path single calls, no per-draw cost, and `resolveSpawn`/`move`/`spawnTile` keep `engine-never-throws` posture during gameplay (per-call returns deterministic degraded values for bad `Rng`, not throw, per `triade/src/engine/core/spawn.ts:47-60` `pickIndex` `!isFinite→0` + `weights.ts:22` `NaN roll→last-index`). `tsc` both configs clean; `npm --prefix triade test` full gate `<3 min` (898 baseline + guards) host-reliable.

**Testability Risks:** Two surfaces are thin: (a) import-time throw is observable only via a dedicated `assert.throws(() => import …)` or isolated `node --import tsx` eval — a plain `import` in a file that also imports `App` will crash the whole suite unless the throw-test is isolated to its own process/eval (R-003). Mitigated by using `validateSpawnConfig({...drift}) → ok:false` explicit-host path for 99% of pins and isolating the `throw` to a single `spawn-weight-guard.atdd.test.ts` that runs `assert.throws` on a dynamic `await import()` with mutated config via `validateSpawnConfig` arg not literal mutation. (b) Epsilon `5e-10` vs `1.1e-9` boundary is floating-literal fragile — `0.4+0.4===0.8` is exact in JS but `0.4000000005+0.3999999995` vs `0.8000000011` need exact literals in tests (R-005). Mitigated by using `spawnConfigOf({fixedWeights:{1:0.4000000005,2:0.3999999995}})` `=0.8+0e-10 → ok:true` vs `{1:0.45,2:0.4} =0.85→ok:false` with `ok` boolean pin + `errors.length>0` not string-compare of sum.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH / DATA | **Silent pot-share warp — sum drift beyond `1e-9` silently absorbed by pot and hidden by `weightedPicker` re-normalization before `f1aeb98`.** Before fix a future edit `FIXED_WEIGHTS {1:0.45,2:0.4} sum 0.85 vs expected 0.8` was silently re-normalized by `weightedPicker` (`triade/src/engine/core/weights.ts:21` `total = sum(combined)` + `scaled=rng()*total`) while `potWeights(POT_WEIGHT 0.2)` normalized pot slice correctly — so `combined [0.45,0.4, norm POT_WEIGHT]` before total-re-normalize still skews fixed bands `0.45/1.05 vs 0.4/1.05 collapsed to pot share` drift ≈`4.76%` vs intended `40/40/20` while `normalizeTo(POT_WEIGHT,…)` kept pot `0.2` but fixed bands lost/gained mass — `weightedPicker` never asserted `fixedSum==0.8`; `spawn-config.test.ts:96` only pinned via unit test, not runtime.** | 2 | 3 | **6** | Fail-fast at startup, preserve re-normalization invariant: (a) **self-check** `triade/src/engine/config/spawnConfig.ts:134-136` `validateSpawnConfig()` → throw `[spawnConfig] … 0.85 vs 0.8 within 1e-9`; (b) **caller wiring** `triade/src/engine/core/spawn.ts:14-16` same throw `[spawn] …`; (c) **host P0 pins** `spawn-weight-guard.atdd.test.ts` `validateSpawnConfig({fixedWeights:{1:0.45,2:0.4}}) → ok:false` + isolated `assert.throws await import` on mutated defaults; (d) **static scans** `rg -n "FIXED_WEIGHTS" triade/src/engine/config/spawnConfig.ts` 2 hits + `rg -n "POT_WEIGHT.*0\.2" triade/src/engine/config/spawnConfig.ts` 1; Spec I-O row `Sum drift beyond epsilon → fail-fast throw` vs `within epsilon → ok:true`. | FE lead | Immediate (gate DW-46) |
| R-002 | DATA / TECH | **NaN/Infinity/negative/zero poisoning collapses `weightedPicker` to last-index (pot).** `weightedPicker` at `triade/src/engine/core/weights.ts:26-30` does `acc+=weights[i]; if (scaled<acc) return i` — if `weights[i]===NaN` then `acc===NaN` and `NaN<acc` is false for every `i` until last `return length-1`, so fixed `1|2` weights `NaN` force tier-conditioned `pot[last]` always; `!Number.isFinite(w)||w<=0` also poisons `normalizeTo` (`total NaN`) and `potWeights` fallback `POT_BASE_VALUE/v` skew. Before `f1aeb98` a typo `FIXED_WEIGHTS[1]=NaN` at `spawnConfig.ts:13` would ship and only surface as `resolveSpawn` always returning tier pot max, invisible in `spawn-config.test.ts` unless explicit reject case ran.** | 2 | 3 | **6** | Finite/positive gate before distribution built: (a) `triade/src/engine/config/spawnConfig.ts:52-53,112-113` `!Number.isFinite(w)||w<=0 → errors.push(FIXED_WEIGHTS[1] must be finite and >0 / POT_CURVE weight …)` + `triade/src/engine/config/spawnConfig.ts:134-136` throw; (b) **host P0 pins** `validateSpawnConfig({fixedWeights:{1:NaN,2:0.4}}) → ok:false` + `Infinity / -0.25 / 0` 4-case sweep + import-throw isolation `spawnConfigOf({1:NaN})` errors include `finite`; (c) **static scan** `rg -n "Number\.isFinite" triade/src/engine/config/spawnConfig.ts` 3 hits + `rg -n "must be finite and > 0" triade/src/engine/config/spawnConfig.ts` 2 hits; Spec I-O rows `NaN/Infinity/negative/zero → fail-fast`. | FE lead | Immediate (gate DW-46) |
| R-003 | TECH | **Init-time `throw` tensions `engine-never-throws` gameplay rule and App startup crash.** `spawnConfig.ts:135-136` + `spawn.ts:15-16` `throw new Error('[spawnConfig]/[spawn] invalid…')` at module evaluation is the requested DW-46 fail-fast, but `triade/src/engine/core/game.ts move/spawnTile/resolveSpawn` contract `engine-never-throws` (per spec Boundaries `Always: preserve engine-never-throws during gameplay (move/spawnTile/resolveSpawn still return degraded deterministic values)`) is per-call, not init — if `App.tsx` simply `import { resolveSpawn } from './src/engine/core/spawn.ts'` without `try/catch`, a drifted default crashes the entire RN bundle at launch (`Expo JS bundle evaluation`) with raw `Error: [spawnConfig] …` not a user-facing error, and Jest `import` in `spawn-config.test.ts` would fail the whole suite unless isolated.** | 2 | 3 | **6** | Scope throw to init only, keep explicit validator pure: (a) **Code Map** `validateSpawnConfig` stays `ok|rejected` never throws when called explicitly (`triade/src/engine/config/spawnConfig.ts:36-125` return shape) — tests use explicit arg path for 99% pins; (b) **only default-path throw** `validateSpawnConfig()` with no arg at `134/14` — never inside `weightedPicker/pickCombined` per-call (`rg -n "validateSpawnConfig" triade/src/engine/core/weights.ts` must be 0); (c) **host P0 pin** `validateSpawnConfig(invalidExplicit) → ok:false` `assert.doesNotThrow` (`triade/__tests__/engine/spawn-config.test.ts:104-115`) + **isolated throw pin** in dedicated `.atdd.test.ts` via `assert.throws(async () => await import(path))` or `spawnConfigOf` mutated-arg not frozen mutation; (d) **doc** Design Notes `throws only at init, never during gameplay per-call` + Review Triage `low reject` justification; App crash is desired fail-fast for config programming error (like `invariant`), not gameplay error — no `try/catch` in `App.tsx` needed because shipped defaults always `ok:true` (gate `ship succeeds` holds). | FE lead | Immediate (gate DW-46) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Epsilon boundary brittleness — `1e-9` vs `1.1e-9` vs `0.8` literal drift could false-accept or false-reject due to float representation.** `triade/src/engine/config/spawnConfig.ts:26,118` `EPSILON=1e-9` and `Math.abs(fixedSum-(1-0.2)) > EPSILON` is the same epsilon as `triade/__tests__/engine/spawn-config.test.ts:118-122` test. `0.4+0.4===0.8` is exact, but `0.8000000005` vs `0.8000000011` boundary literals are float-approx; a test that used `0.8+1e-9` vs `0.8+5e-10` with `1:0.4000000005` etc must be hand-computed correctly else a future `POT_WEIGHT 0.2000000001` edit would slip within epsilon unexpectedly, or a valid `0.80000000005` within `5e-10` would false-FAIL.** | 2 | 2 | 4 | Pin boundary with exact-sum literals, not recomputed `1-POT_WEIGHT+EPSILON`: (a) **host P1 pins** `validateSpawnConfig({fixedWeights:{1:0.4000000005,2:0.3999999995}}) → sum 0.8000000000±5e-10 → ok:true` (`within epsilon`) vs `spawnConfigOf({fixedWeights:{1:0.45,2:0.4}}) 0.85 vs 0.8 → ok:false` (`beyond 1e-9`) + explicit `EPSILON` grep `1e-9`; (b) **static scans** `rg -n "EPSILON|1e-9" triade/src/engine/config/spawnConfig.ts` 2 hits + `rg -n "fixed-sum drift beyond 1e-9" triade/__tests__/engine/spawn-config.test.ts` 1 hit confirms boundary pin exists; spec I-O row `Sum drift within epsilon ±<1e-9 → Accepted` vs `beyond 1e-9 → throw` enforces same literal. |
| R-005 | TECH | **Double-guard divergence — `spawnConfig.ts` self-check + `spawn.ts` caller guard duplicate could drift if one is edited to `assertSpawnConfigValid()` helper vs the other kept `validateSpawnConfig()` or epsilon constant diverged.** Intent says `Touch only spawnConfig.ts and its caller — prefer importing validator to avoid logic duplication` (`spec-spawn-weight-validation.md` Boundaries `Always: …; Block If: … per-call …`). Before `f1aeb98` both guards called `validateSpawnConfig()` with no args sharing the same `EPSILON` and finite checks, so divergence today is 0 — but a future maintenance that inlines `fixedSum approx 0.8` in `spawn.ts` without `POT_WEIGHT` lookup would reintroduce drift between guards while tests still passed via `spawnConfig.ts` self-check.** | 2 | 2 | 4 | Keep single importer seam, no duplicated epsilon: (a) **static scans** `rg -n "from '../config/spawnConfig" triade/src/engine/core/spawn.ts` 1 hit `validateSpawnConfig` imported once + `rg -n "FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS" triade/src/engine/core/spawn.ts` 0 hits (no duplicated sum literal) + `rg -n "1e-9|EPSILON" triade/src/engine/core/spawn.ts` 0 hits (no duplicated epsilon); (b) **host P1 pin** both guards call `validateSpawnConfig()` no-arg, `spawn.ts:14` vs `spawnConfig.ts:134` share same error format `[spawnConfig]/[spawn] … within 1e-9`; spec Design Notes `Duplicate guard is intentional, single evaluation each, no per-draw cost, protects against alternate entry-point bypass`. |
| R-006 | TECH | **Alternate entry-point bypass / tree-shake — engine imported via `core/index.ts` re-export (`triade/src/engine/core/index.ts:11-17` `export { validateSpawnConfig } from '../config/spawnConfig.ts'`) or via `weights.ts` direct `import { POT_BASE_VALUE, POT_CURVE }` without ever importing `spawn.ts`/`spawnConfig.ts` could bypass one guard if bundler tree-shakes dead `spawn.ts` self-check.** `Bundle: spawn-weight-validation` says `guard lives in spawnConfig.ts self-check plus caller re-check` to survive import-order gaps, but a bundler that only imports `potForTier`+`ceilingDetector` for ladder (`triade/src/engine/core/pot.ts` + `ceiling.ts`) never evaluates `spawnConfig.ts`/`spawn.ts` at all — then a drifted `FIXED_WEIGHTS` would still be hidden though `move()` not used.** | 1 | 3 | 3 | Wire guard at the data singleton import regardless of entry: (a) **static scans** `rg -n "export \{.*validateSpawnConfig" triade/src/engine/core/index.ts` 1 hit re-exports `spawnConfig` so `import { validateSpawnConfig } from 'core/index.ts'` still evaluates `spawnConfig.ts:134-136`; (b) **host P1 pin** `import { spawnTile }` vs `import { POT_CURVE }` vs `import { validateSpawnConfig } from 'core/index.ts'` all three trigger `validateSpawnConfig` at `spawnConfig.ts` evaluation — verified by `npx tsc --noEmit` not eliminating guard (`rg -n "_defaultSpawnConfigValidation" triade/src/engine/config/spawnConfig.ts` 1 hit proves not DCE); spec I-O row `Intended caller bypass (tree-shake) → Same fail-fast regardless of entry point`. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-007 | PERF / TECH | **Per-draw validation creep — moving `validateSpawnConfig` inside `weightedPicker`/`pickCombined` per-call would add O(1) `Object.entries` + sum + `Math.abs` per draw.** `spawnConfig.ts:134-136` today is one cold-path call at module eval (`~µs`). `pickCombined` is called once per `resolveSpawn`/`weightedValue`/`move` effective path (1 draw per move, ~3 tile spawns per game start `newGame 20 draws`), so per-draw cost would be `~1 µs × 10k moves ≈10 ms` trivial today but would violate `Boundary: no per-draw overhead` and `Never: introduce per-draw validation overhead`. | 1 | 2 | 2 | Monitor — static scan `rg -n "validateSpawnConfig" triade/src/engine/core/spawn.ts` must be at top-level `14` not inside `function pickCombined|resolveSpawn|weightedValue|spawnTile` body + `rg -n "validateSpawnConfig" triade/src/engine/core/weights.ts` 0; spec Boundary `Block If: Would require throwing inside weightedPicker/pickCombined hot path per-call` enforced as gate; bundle adds `0` `Math.random`/`setTimeout`/`requestAnimationFrame` in engine. |
| R-008 | OPS | **Ledger `resolution-undo: db8b509b25e…` 64-hex per DW-46 + `sprint-status.yaml` ownership.** Sweep marks DW-46 `done 2026-09-02` with `resolution-undo: db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b 2026-09-02 7374617475733a206f70656e` (`64-hex` prefix-tail + hex `7374617475733a206f70656e` = ASCII `status: open` 13 bytes); `sprint-status.yaml` is orchestrator-owned and must not be written or reverted by this workflow (instruction `never write it, and never revert a change to it`). | 1 | 2 | 2 | Monitor — ledger already records `resolution-undo: db8b509b…` with 64-hex + ` 7374617475733a206f70656e` (`rg -n "db8b509b" _bmad-output/implementation-artifacts/deferred-work.md` 1 hit, `wc -c` 64); `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty (gate shows `epic-3/5 backlog` etc unchanged). This plan never writes ledger or status. |

### Risk Category Legend

- **TECH**: guard wiring, epsilon `1e-9`, double-guard divergence, tree-shake entry point, `Object.freeze` vs runtime mutability, per-draw vs init throw, `weightedPicker` re-normalization
- **DATA**: `FIXED_WEIGHTS` sum `0.8 vs 0.85` warp, `NaN/Infinity/≤0` collapse to pot last-index, `POT_CURVE` finite/positive monotonic untouched
- **BUS**: n/a for this bundle (no user journey change — spawn distribution byte-identical on shipped defaults)
- **OPS**: `deferred-work.md` 64-hex `resolution-undo` ledger, `sprint-status.yaml` orchestrator ownership (never write/revert)
- **SEC**: n/a for this bundle (no secrets, no network — engine data-only)
- **PERF**: host-only TS init `<0.5 ms` cold-path, `0` per-draw cost (`weightedPicker` hot path untouched)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category    | Requirement / Threshold | Risk Link | Planned Validation                         | Evidence Needed                  |
| --------------- | ----------------------- | --------- | ------------------------------------------ | -------------------------------- |
| Reliability | Init `throw` only for config programming error, never per-call during gameplay: shipped defaults `0.4+0.4==0.8==1-0.2` → no throw at `import('./spawnConfig.ts')` nor `spawnTile`/`resolveSpawn`/`move`; explicit `validateSpawnConfig(invalid) → ok:false` never throws (engine-never-throws post-init) | R-003 | Host `spawn-config.test.ts` `assert.doesNotThrow(() => validateSpawnConfig(invalid))` per `triade/__tests__/engine/spawn-config.test.ts:104-115` + isolated import-throw pin in `spawn-weight-guard.atdd.test.ts` `assert.throws` on shipped-drift guard | `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` 7/7 pass + `spawn-weight-guard.atdd.test.ts` isolation `throw` proof |
| Security | N/A — no auth/session/tokens/network in bundle | - | N/A | N/A |
| Performance | Cold-start guard single `validateSpawnConfig()` at module evaluation `<0.5 ms` wall-clock, `0` per-draw overhead (`weightedPicker`/`pickCombined` body has `0` `validateSpawnConfig` calls) | R-007 | Static scans `rg -n "validateSpawnConfig" triade/src/engine/core/weights.ts` 0 + `rg -n "validateSpawnConfig" triade/src/engine/core/spawn.ts` only at top-level `14-16` not inside functions + host bench `Date.now` around `import('./spawnConfig.ts')` `<0.5 ms` | `rg` gate scans `0` hot-path + `npm --prefix triade test` wall-clock log `<3 min`; `tsc` both configs `<5 s` proves no allocation leak |
| Maintainability | Single data source `spawnConfig.ts:1-26` holds `POT_WEIGHT 0.2` + `FIXED_WEIGHTS {1:0.4,2:0.4}` + `POT_CURVE {3:1,…,96:0.03125}` + `EPSILON 1e-9` + `Object.freeze`; `spawn.ts` imports validator not duplicating epsilon/sum | R-004,R-005,R-006 | Static scans `rg -n "FIXED_WEIGHTS\s*=\s*Object\.freeze" triade/src/engine/config/spawnConfig.ts` 1 + `rg -n "FIXED_WEIGHTS" triade/src/engine/core/spawn.ts` only via `import` (`2,30`) not literal `0.4` + `rg -n "1e-9|EPSILON" triade/src/engine/core/spawn.ts` 0 + `tsc --noEmit` both configs | `triade/src/engine/config/spawnConfig.ts` single definition + `spawn.ts` single `import {validateSpawnConfig}` + `tsc` clean logs |
| Compliance / Contract | `Board`/`GameState`/`PendingSpawn` public types unchanged; `validateSpawnConfig` return shape `{ok:true}|{ok:false,errors:string[]}` unchanged; `GRID_SIZE 4` + `POT_CURVE` strictly decreasing unchanged | R-002,R-004 | `rg -n "export function validateSpawnConfig" triade/src/engine/config/spawnConfig.ts` signature + `rg -n "export type Board" triade/src/engine/core/types.ts` 1 hit + `rg -n "Object\.isFrozen\(FIXED_WEIGHTS\)" triade/__tests__/engine/spawn-config.test.ts` 1 hit | `spawn-config.test.ts` return-shape pin `deepEqual {ok:true}/{ok:false,errors}` + `tsc` both configs |

**Unknown thresholds:** Startup `throw` is a new `Error` type `init programming error` not a gameplay latency SLO — no numeric `p95 < X ms` threshold beyond `<0.5 ms` init (cold-path). `weightedPicker` re-normalization `total = sum(weights)` contract is `N1 float rule` unchanged; no `1%` band drift budget because drift now fails fast instead of being budgetable. `POT_CURVE` halving fallback `POT_BASE_VALUE / v` beyond `96` untouched and out of scope for this bundle.

---

## Entry Criteria

- [ ] Spec `spec-spawn-weight-validation.md` revision pinned `baseline 0326993 → final 776e6fd` (intent/boundaries/I-O matrix 6 rows + 2 Tasks + 4 ACs) and `deferred-work.md` DW-46 `open→done 2026-09-02 + resolution-undo db8b509b… 64-hex 7374617475733a206f70656e` is ledger truth (not `sprint-status.yaml`, which is orchestrator-owned)
- [ ] Helpers `triade/test-utils/helpers.ts` expose `extractSpecifiers` / `stripCommentsAndStrings` if used, and `triade/__tests__/engine/spawn-config.test.ts:37-47` `spawnConfigOf` factory is the explicit-arg seam (`fixedWeights {1:…}` without mutating frozen `FIXED_WEIGHTS`)
- [ ] Engine contracts `triade/src/engine/config/spawnConfig.ts:134-136` self-check + `triade/src/engine/core/spawn.ts:14-16` caller guard use `validateSpawnConfig()` no-arg at top-level, not inside `pickCombined`/`weightedPicker`, and `triade/src/engine/core/weights.ts:20-32` re-normalizes per spec 2.4 without asserting sum
- [ ] Feature deployed to host test harness (`node --import tsx --test` resolves `tsx 4.23` + `tsconfig.test.json`) — no Expo/Skia/RNGH/MM-KV runtime needed for validate/guard pins

## Exit Criteria

- [ ] All P0 7 groups passing including `spawn-config.test.ts` 7/7 green (`[P0] validateSpawnConfig() returns ok:true`, rejection matrix `NaN/zero/negative/Infinity/fixed-sum drift/extra key/empty/non-monotonic/effective gap` 10 cases `doesNotThrow→ok:false`, `Object.freeze`, `config-driven purity`)
- [ ] All P1 8 groups passing (epsilon `<1e-9` accepted / `>1e-9` rejected via `0.45+0.4=0.85` vs `0.8`, `isFinite` 4-case, extra fixed key, tree-shake `core/index.ts` wiring 1 hit, error-message `0.85 vs 0.8 vs 1e-9` actionable, no per-draw `validateSpawnConfig` in hot path)
- [ ] No open high-priority (≥6) risks unmitigated (R-001 + R-002 + R-003 each 6) — mitigations are runtime `ok:false + errors.length>0` + isolated `throw` pin + `rg` scans on `spawnConfig.ts:134` / `spawn.ts:14` / `weights.ts:0` not just header docs
- [ ] Test coverage agreed as sufficient (`spawn-config.test.ts` 7/7 1 file covers `100%` of `validateSpawnConfig` branches `finite/positive/allowed-key/sum-epsilon/monotonic/effective-fallback/empty` + 2 guard lines 100% via explicit-arg + 1 throw isolation)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` clean and `tsconfig.test.json` clean, `Math.random` scan 0 in engine guards (`rg -n "Math\.random" triade/src/engine/config/spawnConfig.ts 0 + spawn.ts 0`), `sprint-status.yaml` untouched (`git diff --` empty)

## Project Team (Optional)

| Name   | Role     | Testing Responsibilities |
| ------ | -------- | ------------------------ |
| Eduardo | FE / Test Architect | Owns spawn-weight validation + init-throw vs gameplay-never-throws invariant, `rg` pin hygiene, ledger 64-hex + `sprint-status.yaml` ownership gate |
| Murat (TEA) | QA / NFR assessor | Owns reliability/determinism/maintainability/perf NFR planning, `nfr-assess` thresholds vs `nfr-criteria.md` mapping |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| Shipped defaults accepted — `validateSpawnConfig() → {ok:true}` and `import('./spawnConfig.ts')` + `import('./spawn.ts')` never throw | Unit | R-001,R-002,R-003 | 1 | QA | `triade/__tests__/engine/spawn-config.test.ts:79` `[P0] validateSpawnConfig() returns {ok:true} on shipped defaults` `deepEqual {ok:true}` + `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` green without isolated throw harness (controls defaults). |
| Fixed-sum drift beyond epsilon fails fast — `FIXED_WEIGHTS {1:0.45,2:0.4} sum 0.85 vs expected 0.8 within 1e-9` → guard `throw` at `spawnConfig` module load or `validateSpawnConfig({fixedWeights:…}) → ok:false` with actionable error | Unit | R-001 | 1 | QA | `triade/__tests__/engine/spawn-config.test.ts:96` `['fixed-sum drift beyond 1e-9', spawnConfigOf({fixedWeights:{1:0.45,2:0.4}})] ` `doesNotThrow→ok:false, errors non-empty string` + isolated `.atdd.test.ts` `assert.throws(await import muted) / spawnConfigOf drift → ok:false + errors.join contains /FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS\[2\].*0\.85.*1 - POT_WEIGHT.*0\.8.*1e-9/` |
| NaN / Infinity / negative / zero weight fails fast — `FIXED_WEIGHTS[1]=NaN|Infinity|0|-0.25` or `POT_CURVE[3]=NaN|0` → `ok:false` via explicit validator + throw at init before `weightedPicker` pot-collapse | Unit | R-002 | 1 | QA | `triade/__tests__/engine/spawn-config.test.ts:85-104` rejection matrix `NaN weight, zero, negative, Infinity` 4 cases `ok:false` + `spawnConfig.ts:52-53,112` `!Number.isFinite(w)||w<=0` + isolated throw `spawnConfigOf NaN → errors /must be finite/` |
| Explicit validator purity — `validateSpawnConfig(invalidExplicit)` never throws, always returns `{ok:false,errors:string[]}` (engine-never-throws for explicit caller) | Unit | R-003 | 1 | QA | `triade/__tests__/engine/spawn-config.test.ts:104-115` `assert.doesNotThrow(()=>result=validateSpawnConfig(config))` for all 10 rejections + `typeof errors[i]==='string' && length>0` + `validateSpawnConfig(spawnConfigOf()) → ok:true` stays accepted in same activation |
| Distribution byte-identical on shipped defaults — `resolveSpawn`/`pickCombined` `triade/src/engine/core/spawn.ts:27-33` `[FIXED_WEIGHTS[1],FIXED_WEIGHTS[2], …norm POT_WEIGHT]` picked by `weightedPicker` re-normalizing yields `40/40/20` band share across tiers `tierForCeiling 0..7` before/after guard (no weight value changed) | Unit | R-001 | 1 | QA | `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` 7/7 + `adaptive-spawn-integration.test.ts` `AC2 0xc31 N=5000 40/40/20` still green `±2%≈10σ` proves `pickCombined` single-roll unchanged; guard adds `0` per-draw calls so distribution is `triade/src/engine/config/spawnConfig.ts:13 0.4+0.4==0.8` exact |
| Existing freeze hardening — `Object.freeze FIXED_WEIGHTS/POT_CURVE` still resists mutation (`strict mode TypeError`) | Unit | R-002 | 1 | QA | `triade/__tests__/engine/spawn-config.test.ts:144-153` `[P0] Object.freeze hardening` `isFrozen true true` + `assert.throws(()=>POT_CURVE[3]=2, TypeError)` + `assert.throws(()=>FIXED_WEIGHTS[1]=0.9, TypeError)` |
| Guard wired at module init (not per-draw) — `spawnConfig.ts:134` + `spawn.ts:14` each exactly one top-level `validateSpawnConfig()` call, `weights.ts:0` calls inside `weightedPicker` | Unit | R-003,R-007 | 1 | QA | `rg -n "validateSpawnConfig\(\)" triade/src/engine/config/spawnConfig.ts` 1 hit at `134` + `rg -n "validateSpawnConfig\(\)" triade/src/engine/core/spawn.ts` 1 hit at `14` + `rg -n "validateSpawnConfig" triade/src/engine/core/weights.ts` 0 inside `weightedPicker` body `triade/src/engine/core/weights.ts:20-32` |

**Total P0**: 7 tests, ~1.0 hour (0.14 h per check avg incl. host runs + `rg` gates + `tsc` guards) — each is `node --import tsx --test` host `<1 s` plus scan cost

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| Epsilon boundary `within <1e-9` accepted — `fixedSum = 1-POT_WEIGHT + 4.9e-10` via `{1:0.4000000005,2:0.3999999995}` sum `0.8000000000+0e-10 exact` → `ok:true` (spec I-O `within epsilon`) | Unit | R-004 | 1 | QA | Host P1 pin `spawnConfigOf({fixedWeights:{1:0.4000000005,2:0.3999999995}}) → ok:true` or `fixedWeights:{1:0.40000000024,2:0.39999999976}` sum `0.8+0` exact proves `<1e-9` accepted; guards exact `Math.abs(sum-0.8) > 1e-9` gate not `>=` |
| Epsilon boundary `beyond 1e-9` rejected — `0.85 vs 0.8 = 0.05 >>1e-9` and `0.8000000011 vs 0.800000001 vs threshold 1e-9` → `ok:false` + isolated guard throws | Unit | R-004 | 1 | QA | `spawnConfigOf({fixedWeights:{1:0.4000000006,2:0.4000000005}}) sum 0.8000000011 vs 0.8 diff 1.1e-9 >1e-9 → ok:false` + drift `0.45+0.4=0.85` already P0 but boundary proves 1e-9 precision |
| Extra fixed key — `fixedWeights {1:0.4,2:0.4,3:0.5}` via explicit arg → `ok:false` (`FIXED_WEIGHTS key 3 not allowed`) never throws | Unit | R-002 | 1 | QA | `triade/__tests__/engine/spawn-config.test.ts:97` `['extra fixedWeights key', {1:0.4,2:0.4,3:0.5}]` `ok:false, errors /not allowed/` |
| Tree-shake alternate entry point — `core/index.ts` re-exports `validateSpawnConfig` still forces `spawnConfig.ts:134-136` evaluation regardless of `import { spawnTile }` vs `import { validateSpawnConfig } from 'core/index.ts'` | Unit | R-006 | 1 | QA | `triade/src/engine/core/index.ts:11-17` `export { POT_WEIGHT,FIXED_WEIGHTS,…,validateSpawnConfig } from '../config/spawnConfig.ts'` 1 hit + `rg -n "_defaultSpawnConfigValidation" triade/src/engine/config/spawnConfig.ts` 1 hit proves guard lives in data singleton not `spawn.ts` alone; P1 verifies `await import('core/index.ts')` still throws when defaults drifted (isolated) |
| Error message actionable — throw `message` contains `FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2] (${fixedSum}) must equal 1 - POT_WEIGHT (${0.8}) within ${1e-9}` and prefix `[spawnConfig]`/`[spawn]` | Unit | R-001,R-006 | 1 | QA | `triade/src/engine/config/spawnConfig.ts:119-122` format literal pin + `136` `[spawnConfig] invalid shipped weights: ` + `spawn.ts:16` `[spawn] invalid spawn weights: `; `assert.match(e.message, /FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS\[2\].*0\.85.*1 - POT_WEIGHT.*0\.8.*1e-9/)` |
| No per-draw overhead — `validateSpawnConfig` never referenced inside `pickCombined`/`resolveSpawn`/`weightedPicker`/`spawnTile` function bodies | Unit | R-007 | 1 | QA | `rg -n "validateSpawnConfig" triade/src/engine/core/spawn.ts` outside function bodies only (`2 import,14 guard`) + `rg -n "validateSpawnConfig" triade/src/engine/core/weights.ts` 0; spec `Never: introduce per-draw validation overhead` |
| No `Math.random` in engine guard path — `spawn.ts` guard uses `validateSpawnConfig` not direct `Math.random()` calls, `weights.ts` `weightedPicker` uses passed `Rng` only; default `rng: Rng = Math.random` params in `spawn.ts:65,86` remain (engine DI) | Unit | R-003 | 1 | QA | `rg -n "Math\.random\(\)" triade/src/engine/config/spawnConfig.ts` 0 + `rg -n "Math\.random\(\)" triade/src/engine/core/spawn.ts` 0 (`rg -n "Math\.random" triade/src/engine/core/spawn.ts` is 2 hits for `= Math.random` default params `weightedValue`/`spawnTile` DI, not direct calls) |
| Config-driven purity thin hygiene — `weights.ts` keys off `spawnConfig` (`import { POT_BASE_VALUE,POT_CURVE } from '../config/spawnConfig.ts'` at `triade/src/engine/core/weights.ts:1`) + `core/index.ts` re-exports `POT_CURVE`+`validateSpawnConfig` | Unit | R-006 | 1 | QA | `triade/__tests__/engine/spawn-config.test.ts:173-203` `[P1] config-driven purity` already host `rg` pins: `weightsSpecifiers some endsWith spawnConfig.ts` + `extractSpecifiers` no `react|react-native|@shopify|expo|skia` |

**Total P1**: 8 tests, ~1.0 hour

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| Ledger `resolution-undo: db8b509b25e…` 64-hex per DW-46 + tail `7374617475733a206f70656e` (`status: open` hex) | Unit | R-008 | 1 | QA | `rg -n "db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b" _bmad-output/implementation-artifacts/deferred-work.md` 1 hit, 64-hex + `rg -n "7374617475733a206f70656e" _bmad-output/implementation-artifacts/deferred-work.md` 1 hit; opened `2026-09-02` |
| `sprint-status.yaml` orchestrator ownership — `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty | Unit | R-008 | 1 | QA | `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must be empty; gate `epic-3/5 backlog` unchanged vs `HEAD`; this workflow never writes ledger/status |
| Single access point — `POT_WEIGHT`/`FIXED_WEIGHTS` defined once at `spawnConfig.ts:11-13` not inlined in `spawn.ts`/`weights.ts` | Unit | R-005 | 1 | QA | `rg -n "FIXED_WEIGHTS\s*=\s*\{" triade/src/engine/config` 1 hit + `rg -n "0\.4.*0\.4" triade/src/engine/core/spawn.ts` 0 (only `FIXED_WEIGHTS[1]` indexing at `30`) |
| Contract unchanged — `validateSpawnConfig` return shape `ok:true`/`ok:false+errors:string[]` still pins `game.ts`/`App` expectations | Unit | R-003 | 1 | QA | `rg -n "export function validateSpawnConfig" triade/src/engine/config/spawnConfig.ts:36` + `spawn-config.test.ts:79-81` `deepEqual {ok:true}` shape |
| `POT_CURVE` effective monotonic 20→3→`Object.entries` sort + fallback `POT_BASE_VALUE/v` still green (out of scope but regression gate) | Unit | R-002 edge | 1 | QA | `triade/__tests__/engine/spawn-config.test.ts:124-142` gapped `192:0.01` accepted vs `48:0.02` rejected effective-curve pin still green |

**Total P2**: 5 tests, ~0.6 hour

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement   | Test Level | Test Count | Owner | Notes   |
| ------------- | ---------- | ---------- | ----- | ------- |
| No new production dependencies | Unit | 1 | QA | `rg -n "spawnConfig" triade/src/engine/config/spawnConfig.ts` `0` new `require`/`import` outside `../config/spawnConfig.ts` + `package.json` diff empty vs `0326993` |
| Object mutability via `Object.freeze` scanner parity — `POT_CURVE`/`FIXED_WEIGHTS` still `Object.freeze` not just `Readonly` | Unit | 1 | QA | `rg -n "Object\.freeze" triade/src/engine/config/spawnConfig.ts` 2 hits (`FIXED_WEIGHTS` `13`, `POT_CURVE` `17`) |
| Cold-start bench `<0.5 ms` init (`node --import tsx --eval "await import('./triade/src/engine/config/spawnConfig.ts')"` timed) | Unit | 1 | QA | Exploratory `Date.now()` around `await import` proves single `validateSpawnConfig` `~0.02 ms` not `10 ms`; full `npm test` gate `<3 min` informative |

**Total P3**: 3 tests, ~0.3 hour

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` clean (30s)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` clean (30s)
- [ ] `rg -n "Math\.random\(\)" triade/src/engine/config/spawnConfig.ts` 0 + `rg -n "Math\.random\(\)" triade/src/engine/core/spawn.ts` 0 (`2` hits for `= Math.random` DI params `65,86` remain, `0` direct calls) (10s)
- [ ] `rg -n "validateSpawnConfig" triade/src/engine/core/weights.ts` 0 hot-path (10s)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation (validate + guard by gate DW-46)

- [ ] `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` 7 pass (`<3 s`) — `validateSpawnConfig() ok:true` + rejection matrix 10 cases + freeze + purity
- [ ] Isolated guard `throw` pin: `node --import tsx --eval "assert.throws(() => require mutated spawnConfig)"` harness single throw with `[spawnConfig] …0.85…0.8…1e-9` (`<2 s`)
- [ ] `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts __tests__/engine/adaptive-spawn-integration.test.ts` drift-free distribution still 40/40/20 (`<2 s`)
- [ ] `rg` suite: `rg -n "validateSpawnConfig\(\)" triade/src/engine/config/spawnConfig.ts` 1 + `spawn.ts` 1 + `rg -n "db8b509b" _bmad-output/implementation-artifacts/deferred-work.md` 1 (`<10 s`)

**Total**: 4 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage (epsilon boundary + bypass + message + overhead)

- [ ] `npm --prefix triade test` full gate baseline (`<3 min`) — 898 pass / 11 expected-RED unchanged + `spawn-config.test.ts` + `adaptive-spawn-integration.test.ts` + `pot.test.ts` green; `potWeights` fallback halving + `normalizeTo` + `weightedPicker` preserved
- [ ] Host `spawn-weight-guard.atdd.test.ts` epsilon boundary `within <1e-9 ok:true` vs `beyond 1.1e-9 ok:false` + `extra key 3` + `core/index.ts` wiring (`<3 s`)
- [ ] `rg` scan suite: `rg -n "1e-9|EPSILON" triade/src/engine/config/spawnConfig.ts` 2 hits + `rg -n "FIXED_WEIGHTS\s*=\s*Object\.freeze" triade/src/engine/config/spawnConfig.ts` 2 hits + `rg -n "export \{.*validateSpawnConfig" triade/src/engine/core/index.ts` 1 hit (`<10 s`)

**Total**: 3 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage + ledger ownership

- [ ] `rg` ledger + `sprint-status.yaml` ownership (`git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg -n "db8b509b.*7374617475733a206f70656e" _bmad-output/implementation-artifacts/deferred-work.md` 1 line) (`<10 s`)
- [ ] Optional exploratory bench `50× import('./spawnConfig.ts')` cold `<25 ms` wall + `tsc` both configs (`<5 s`)

**Total**: 2 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority  | Count             | Hours/Test | Total Hours       | Notes                   |
| --------- | ----------------- | ---------- | ----------------- | ----------------------- |
| P0        | 7        | 0.15        | ~1.0–1.6        | `spawn-config.test.ts` existing 7/7 + 1 isolated guard `throw` harness + 1 `Object.freeze` pin + 1 `rg` gate — pure host, `spawnConfigOf` seam only |
| P1        | 8        | 0.13        | ~1.0–1.6        | epsilon boundary `within/beyond 1e-9` 2 cases + extra key + tree-shake `core/index.ts` + message actionable 5 substrings + per-draw `0` scan + purity |
| P2        | 5        | 0.10        | ~0.5–0.9        | ledger 64-hex + tail `status: open` hex + `sprint-status.yaml` empty + single-source `0.4` literal scan + contract shape |
| P3        | 3        | 0.10        | ~0.3–0.6        | no-deps scan + `Object.freeze` scanner + `<0.5 ms` bench exploratory |
| **Total** | **23** | **-**      | **~2.8–5.2** | **~0.4–0.7 day** (host-only, no device lane; `<15 min` gate)  |

### Prerequisites

**Test Data:**

- `spawnConfigOf(overrides)` factory `triade/__tests__/engine/spawn-config.test.ts:37-47` `potCurve: {...DEFAULT_CURVE}, fixedWeights: {...FIXED_WEIGHTS}, ...overrides` — explicit-arg seam avoiding `Object.freeze` mutation
- Shipped defaults `FIXED_WEIGHTS {1:0.4,2:0.4} sum 0.8 === 1-POT_WEIGHT 0.8` exact (`0.4+0.4===0.8` JS) + `EPSILON 1e-9` (`triade/src/engine/config/spawnConfig.ts:26`)
- `validateSpawnConfig() → {ok:true}|{ok:false,errors:string[]}` host fixtures `invalid: {potCurve:{7:0.1}}, {1:NaN}, {1:0.45,2:0.4}, {1:0.4,2:0.4,3:0.5}, {} empty`

**Tooling:**

- `node --import tsx --test "triade/__tests__/engine/spawn-config.test.ts" -- TSX_TSCONFIG_PATH=tsconfig.test.json` host harness (no Expo/Skia/RNGH, no device)
- `tsx 4.23 + TypeScript 6.0.3 + @types/node 26` pinned in `triade/package.json`

**Environment:**

- No physical iOS device / CocoaPods / Xcode needed — parity+guard are host TS (`triade/src/engine` 2-file guard, no `expo-*` dep)
- `git` baseline `0326993` tagged as `baseline_revision` with `sprint-status.yaml` untouched (orchestrator-owned)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — shipped defaults + drift `0.85` + NaN/Infinity/negative/zero + explicit `ok:false` never-throw + freeze)
- **P1 pass rate**: ≥95% (waivers required for epsilon `5e-10` literal tweak vs `1.1e-9` discussion)
- **P2/P3 pass rate**: ≥90% (informational — ledger 64-hex + `sprint-status.yaml` empty are ops-ops not user-facing)
- **High-risk mitigations**: 100% complete or approved waivers (R-001 + R-002 + R-003 each 6 must have runtime pin not just `rg`)

### Coverage Targets

- **Critical paths**: ≥80% (`validateSpawnConfig` 7 branches `finite/positive/allowedKey/sum-epsilon/empty/monotonic/effective-fallback` + 2 guards `spawnConfig.ts:134-136`+`spawn.ts:14-16` 100% via host + `tsc` narrow)
- **Security scenarios**: n/a (no store per `Block If`)
- **Business logic**: ≥70% (spawn band 40/40/20 `pickCombined` remains `≥80%` via `adaptive-spawn-integration.test.ts` band pins unrelated to this bundle)
- **Edge cases**: ≥50% (`NaN vs Infinity vs 0 vs -0.25` 4-case + `empty POT_CURVE` + `gap 48:0.02` effective-break + `occupied key 3`)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`spawn-config.test.ts` 7/7 + 1 throw harness green)
- [ ] No high-risk (≥6) items unmitigated (R-001 warp + R-002 NaN collapse + R-003 init-throw tension each `mitigated` via runtime pin + `rg`)
- [ ] `validateSpawnConfig` explicit-arg `doesNotThrow` 100% for 10 rejection cases (engine-never-throws post-init)
- [ ] No high-risk `init throw` outside default-path (no `throws` inside `weightedPicker`/`pickCombined` per-call)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (init `<0.5 ms` cold, 0 per-draw, `Object.freeze` 2 hits pin)

---

## Mitigation Plans

### R-001: Silent pot-share warp — sum drift `0.85 vs 0.8` re-normalized and hidden (Score: 6)

**Mitigation Strategy:**
1. Land `triade/src/engine/config/spawnConfig.ts:134-136` self-check `validateSpawnConfig() → throw [spawnConfig] … within 1e-9` at module evaluation (single cold call, preserves `validateSpawnConfig` pure for explicit arg).
2. Wire `triade/src/engine/core/spawn.ts:14-16` caller guard same call+throw `[spawn]` so `import { spawnTile }` and `import { POT_WEIGHT }` both fail fast even if one file tree-shaken.
3. Keep `triade/src/engine/core/weights.ts:20-32` `weightedPicker` re-normalizing per spec 2.4 untouched — not the guard site (NFR).
4. Gate `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` `['fixed-sum drift beyond 1e-9', {1:0.45,2:0.4}] → ok:false` plus isolated `assert.throws` on drifted shipped default.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-46)
**Status:** Planned → Verified via host `ok:false` + `rg` `validateSpawnConfig()` 1+1
**Verification:** `rg -n "validateSpawnConfig\(\)" triade/src/engine/config/spawnConfig.ts` 1 + `spawn.ts` 1 + `rg -n "weightedPicker" triade/src/engine/core/weights.ts` unchanged + host 7/7 pass

### R-002: NaN/Infinity/≤0 poisoning collapses to pot last-index (Score: 6)

**Mitigation Strategy:**
1. Reuse `triade/src/engine/config/spawnConfig.ts:52-53,112` `!Number.isFinite(w)||w<=0 → errors.push` for both `POT_CURVE` entries and `FIXED_WEIGHTS[1|2]` plus `118` sum gate — single validator covers all poison vectors.
2. Same startup `throw` at `134-136`/`14-16` closes pot-collapse before `acc+=NaN` loop can force last-index at `weights.ts:28`.
3. Gate 4-case `NaN/Infinity/0/-0.25` via `spawnConfigOf` `ok:false` + `errors /finite/` (host P0) — no frozen mutation needed.

**Owner:** FE lead
**Timeline:** Immediate
**Status:** Planned → Verified via 4-case sweep `triade/__tests__/engine/spawn-config.test.ts:85-104`
**Verification:** `rg -n "Number\.isFinite" triade/src/engine/config/spawnConfig.ts` 3 + host 4/4 `ok:false`

### R-003: Init throw tensions engine-never-throws (Score: 6)

**Mitigation Strategy:**
1. Document that `throw` is init config programming error, not gameplay per-call: `validateSpawnConfig` explicit retains `doesNotThrow` for `spawnConfigOf` invalid, only default `validateSpawnConfig()` no-arg at top-level throws (spec Boundaries `Always: preserve engine-never-throws during gameplay`).
2. Keep explicit validator returning `{ok:false,errors}` for tests/REPL; integration `move`/`spawnTile` still `!isFinite→0` degraded path intact.
3. Isolate throw assertion to dedicated `.atdd.test.ts` `assert.throws(async()=>await import)` so `spawn-config.test.ts` suite never executes top-level throw on shipped defaults.
4. No `App.tsx` `try/catch` needed — shipped `0.4+0.4==0.8` keeps gate `ok:true` so production bundle never hits throw; throw is fail-closed for future weight edit only.

**Owner:** FE lead
**Timeline:** Immediate
**Status:** Planned → Verified via `spawn-config.test.ts:104` `doesNotThrow` for explicit + `spawn-weight-guard` throw harness for default-path
**Verification:** `rg -n "validateSpawnConfig" triade/src/engine/core/spawn.ts` only top-level + `rg -n "doesNotThrow" triade/__tests__/engine/spawn-config.test.ts` 1 hit

---

## Assumptions and Dependencies

### Assumptions

1. `FIXED_WEIGHTS 0.4+0.4==0.8` exact-equality holds in JS `Number` (true for these decimals, not `0.1+0.2`) — epsilon `1e-9` is guardrail for future `0.40000001` style edits, not for shipped literal fix.
2. `POT_WEIGHT` is `0.2` singleton in `spawnConfig.ts:11` and not overridden per-call — `1-POT_WEIGHT` `0.8` single source so drift is always `fixedSum-(1-POT_WEIGHT)` comparable, no per-tier pot weight.
3. Bundler does not DCE `const _defaultSpawnConfigValidation = validateSpawnConfig(); if(!ok) throw` as side-effect-free — guarded by re-check in `spawn.ts` plus `rg -n "_defaultSpawnConfigValidation" triade/src/engine/config/spawnConfig.ts` 1 hit proving side-effect kept.
4. `sprint-status.yaml` ownership `never write, never revert` is respected by this TEA workflow — only `deferred-work.md` ledger is truth for DW-46; orchestrator owns `sprint-status.yaml` `done`/`awaiting-operator` rows.

### Dependencies

1. `triade/test-utils/helpers.ts` `extractSpecifiers` / `stripCommentsAndStrings` seam available for purity scans — Required before `P1` `weights.ts keys off spawnConfig` gate.
2. Host harness `tsx` + `node --import tsx --test` + `tsconfig.test.json` resolves `src/engine` path alias — Required before `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` (`<3 s`).

### Risks to Plan

- **Risk**: Future spec `2.5 spawnConfig configurável` makes `FIXED_WEIGHTS` runtime-configurable via `spawnConfigOf` arg and shipped guard at import becomes stale (guard checks only defaults, dynamic config passed to `resolveSpawn(config,…)`) — **Impact**: Drift via runtime `config` arg bypasses default-path guard, reintroduces silent warp. **Contingency**: `Scope Block If` in spec: `never add caller outside src/engine (orchestrator/App)` — require `2.5` to extend `validateSpawnConfig` wiring to caller-supplied `config` at `resolveSpawn(config)` time with same `1e-9` + finite checks, or `abort` this bundle until `2.5` lands.
- **Risk**: RN `Expo` JS bundle caches `spawnConfig` evaluation and swallows `Error: [spawnConfig]…` as red screen not actionable log. **Impact**: Degraded `Expo` error reporting. **Contingency**: Keep guard message human-readable with `FIXED_WEIGHTS[1] + … must equal 1 - POT_WEIGHT within 1e-9` so red screen itself is actionable without reading `spec-spawn-weight-validation.md`.

---

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 isolated guard `throw` harness (`spawn-weight-guard.atdd.test.ts`) + epsilon boundary `5e-10 accepted / 1.1e-9 rejected` pins (separate workflow; not auto-run).
- Run `*automate` for broader coverage once `spawn-weight-guard` exists (already have `spawn-config.test.ts` 7/7).
- Run `*nfr-assess` once implementation evidence exists for Reliability `<0.5 ms` cold / `0 per-draw` — do not run until throw harness + `tsc` both-configs evidence collected.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: Eduardo Date: 2026-09-02
- [ ] Tech Lead: Eduardo Date: 2026-09-02
- [ ] QA Lead: Murat (TEA) Date: 2026-09-02

**Comments:** Dup `spawnConfig.ts` self-check + `spawn.ts` caller guard is intentional duplication per Intent `Touch only spawnConfig.ts and its caller` — not a defect; single evaluation each, no per-draw cost, protects against alternate entry-point bypass. Review already rejected 2 low `duplication/init-throw justification` in `spec-spawn-weight-validation.md:68-77`.

---

---


---

## Interworking & Regression

| Service/Component | Impact         | Regression Scope                |
| ----------------- | -------------- | ------------------------------- |
| **Engine `src/engine/core/weights.ts` `weightedPicker` / `normalizeTo` / `potWeights`** | Re-normalizes per spec 2.4; unchanged but would have hidden drift before `f1aeb98` — guard now fails before it re-normalizes. | `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts __tests__/engine/adaptive-spawn-integration.test.ts __tests__/engine/pot.test.ts` must still pin `weightedValue` hand-computed literals `0.9∈[0.8,0.9333)` tier-5 `0.4,0.8,0.9016,…,1.0` + `pot.test.ts FR7_LADDER` + `adaptive AC2 0xc31 N=5000 40/40/20 exact` |
| **Engine `src/engine/core/game.ts` `newGame`/`move`/`isGameOver` + `src/engine/core/spawn.ts` `spawnTile`/`resolveSpawn`/`pickCombined`** | Import-time guard duplication; `move` per-call never throws even if `spawnConfig` drifts — throw is init-only. | `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 tests + `triade/__tests__/engine/adaptive-spawn-integration.test.ts` 15/15 + `engine.purity.test.ts` `5/5` (`no react|react-native|@shopify|expo|skia` in engine) still green |
| **`triade/__tests__/engine/spawn-config.test.ts` (7/7) + helpers `spawnConfigOf`** | Core oracle for this bundle; guard adds startup throw but keeps `validateSpawnConfig(invalidExplicit) → ok:false` never-throw for helper seam. | `npm --prefix triade test -- __tests__/engine/spawn-config.test.ts` must stay 7/7 green including `Object.freeze` `TypeError` + `POT_CURVE gapped 192:0.01 accepted vs 48:0.02 rejected` + rejection matrix `10 cases` |
| **Ledger `deferred-work.md` DW-46 + orchestrator `sprint-status.yaml`** | DW-46 was sole open `spawnConfig runtime guard` item; sweep marks `done 2026-09-02 + resolution-undo db8b509b…` — `sprint-status.yaml` is orchestrator-owned not defect. | `rg -n "db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b" _bmad-output/implementation-artifacts/deferred-work.md` 1 hit + `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `triage` low `init-throw tension` justified via spec Review Triage |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification `P×I 1-9` `≥6 MITIGATE` `9 BLOCK`
- `probability-impact.md` - `1=unlikely/standard, 2=possible/edge, 3=likely/known` × `1=minor/workaround, 2=degraded/partial loss, 3=critical/blocker/security`
- `test-levels-framework.md` - Host `Unit` for pure `validateSpawnConfig` + `weightedPicker` vs `Component`/`E2E` for RN `App` (not needed here)
- `test-priorities-matrix.md` - `P0 blocks core + ≥6 no workaround`, `P1 medium ≥4 common`, `P2 LOW 1-2 edge`, `P3 nice-to-have/bench`
- `nfr-criteria.md` - Reliability (`engine-never-throws` vs `throw` init) + Performance (`<0.5 ms` init cold) + Maintainability (`single source spawnConfig.ts`)

### Related Documents

- PRD: `triade/docs` not re-quantized — FR-9 halving decay `weight(v)=POT_BASE_VALUE/v` pinned via `spawnConfig.ts:5-9` doc comment + `spec-spawn-weight-validation.md` intent.
- Epic: `spec-spawn-weight-validation.md` `DW-46` bundle wiring (2 files + intent/boundaries 6-row I-O matrix + 4 ACs + Design Notes `single validateSpawnConfig() cold-path ~µs, duplicate guard protects import-order gap`).
- Architecture: `triade/src/engine/core/index.ts:11-17` re-exports `POT_WEIGHT/FIXED_WEIGHTS/POT_CURVE/validateSpawnConfig` + `triade/src/engine/config/spawnConfig.ts:1-26` singleton data `EPSILON 1e-9` + `triade/src/engine/core/weights.ts:1` keys off `spawnConfig` (single access point boundary 4).
- Tech Spec: `triade/__tests__/engine/spawn-config.test.ts` 7/7 authoritative oracle (rejection matrix, epsilon, freeze) + `triade/src/engine/core/spawn.ts:27-33` `pickCombined` `combined [FIXED_WEIGHTS[1],FIXED_WEIGHTS[2],…norm]` single `weightedPicker` 1 draw.

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
