---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/weights.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-engine-rng-trust-hardening — malformed-RNG trust hardening (weightedPicker clamp + displayRoll normalization)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-engine-rng-trust-hardening`
**Scope:** Targeted test design for the working-tree delta of `dw-engine-rng-trust-hardening`

> **Delta under assessment:** Hardening of the engine RNG trust boundary for DW-56 vs baseline `HEAD` (`2e91c12` / `HEAD` before sweep). Working-tree diff vs `HEAD` is two production files + ledger metadata:
> - `triade/src/engine/core/weights.ts:20-37` — `weightedPicker` gains deterministic clamp: `safeRoll = Math.min(Math.max(roll, 0), 1 - Number.EPSILON)` then `scaled = safeRoll * total` (was `roll * total` with only `NaN` early-return to last index, relying on fallthrough for `>=1`/`Infinity`/negative). Comment documents DW-56: `<0 → 0` (first band), `>=1` including `Infinity` → `1 - EPSILON` (top pot slot via valid band, `scaled < total`), `NaN` already degraded to last index via existing `typeof !== 'number' || NaN` guard per AC5 engine-never-throws.
> - `triade/src/engine/core/game.ts:8-18,34,110` — new `normalizeDisplayRoll(raw: unknown): number` + two call sites `newGame` and `move` effective path: `if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0.5` (NaN/Infinity/non-number → midpoint, not 0, to keep Epic 7 preview distribution neutral), `if (raw < 0) return 0`, `if (raw >= 1) return 1 - Number.EPSILON`, else `return raw`. Preserves 1-draw budget (no re-roll). Contract: `PendingSpawn.displayRoll ∈ [0,1)` always, even with malformed third draw.
> - `triade/src/engine/core/spawn.ts:46-60` unchanged — `pickIndex` already guards `!Number.isFinite(idx) → 0`, `<0 → 0`, `>=len → len-1` (engine-never-throws); kept as reference for DATA chain.
> - `triade/src/engine/core/types.ts:1-30` unchanged — `Rng = () => number`, `PendingSpawn { value: number, displayRoll: number }`, draw-budget contract `newGame 20 (9 cells + 9 values + 1 pending value + 1 displayRoll) / effective 3 (cell, next value, next displayRoll) / noop 0 / resolveSpawn 1` pinned in JSDoc.
> - Ledger `_bmad-output/implementation-artifacts/deferred-work.md` DW-56 `open → done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-rng-trust-hardening` + `resolution-undo: 0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e`.

---

## Executive Summary

**Scope:** Harden the engine RNG trust boundary at two sites: (1) `weights.weightedPicker` roll clamping for the combined `40/40/20` distribution (`pickCombined` → `weightedPicker`) and (2) `game.normalizeDisplayRoll` for Epic 7 preview's third draw `PendingSpawn.displayRoll`. Before the sweep a `roll >= 1` (e.g. `1`, `1.5`, `Infinity`) collapsed deterministically to the top pot slot only via fallthrough (`scaled >= total` → loop never hits `scaled < acc` → `return weights.length - 1`), indistinguishable from the intentional NaN-to-last degradation and not via a valid band; a negative roll mapped to first band only by accident (`scaled < acc` on first iteration) — not clamped explicitly; and a `NaN`/`Infinity`/`non-number` third draw was copied unvalidated into `pendingSpawn.displayRoll`, breaking the documented `[0,1)` contract silently (`previewFor` `< 0.6 exact` vs `range` misclassifies, HUD preview shows wrong distribution, invariant `N3` weakened). Production blast radius is low on well-behaved `Math.random`/`mulberry32` (always `[0,1)`), but the seam is load-bearing for correctness: a fuzzed/custom RNG, a `rngOf` mis-wire, or a future deterministic replay that replays out-of-range values would have violated distribution neutrality and preview contract.

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (≥6): 3
- Critical categories: TECH (weightedPicker roll clamp vs fallthrough, displayRoll [0,1) contract, draw-budget preservation), DATA (PendingSpawn → previewFor → HUD pipeline), BUS (spawn 40/40/20 distribution integrity)

**Coverage Summary:**

- P0 scenarios: 9 groups (host unit: weightedPicker clamp + normalizeDisplayRoll + draw-budget)
- P1 scenarios: 6 groups (engine pipeline `resolveSpawn`/`weightedValue`/`game.move`/`newGame` + spawn/weights + preview chain)
- P2/P3 scenarios: 6 groups (static single-guard scans, finiteness bench, ledger `resolution-undo`)
- **Total effort**: ~3.0–5.6 hours (~0.4–0.7 days; host-only, no device lane — pure engine TS, `npm test` + `tsc` gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score rules `canMerge(1+2→3, >=3 equal)` / `mergeValue` / merge-once cascade, `shiftLine`/`movementLines`/`boardFromLines` wall-scan, `board.ts` occupancy, `ceilingDetector`/`tierForCeiling` guards (DW-41..45), `spawnTile` candidate validation (DW-72/73), `GameBoard` gate/tilesRef, `transitionPlan` classify, `matchScore.applyMove` NaN guard (DW-24), `src/feel` haptics/punch/shake, `App.tsx`/`Hud` layout, `RNGH` gesture** | `git diff --stat -- triade/src/engine` between `HEAD` and working tree shows only `game.ts` + `weights.ts` changed; `spawn.ts`/`ceiling.ts`/`pot.ts`/`line.ts`/`board.ts`/`rules.ts`/`types.ts`/`spawnConfig.ts` byte-identical. `git diff HEAD -- triade/src/engine/core/spawn.ts triade/src/engine/core/ceiling.ts` is empty. | Engine invariants stay gated by `triade/__tests__/engine/*.test.ts` (~180+ cases) + `npm --prefix triade test` full gate `<15 min` + `tsc` clean as gate. |
| **Changing `Rng` signature to `(seed: number) => number` or re-rolling on malformed values** | Draw-budget contract `newGame 20 / effective 3 / noop 0 / resolver 1` is fixed per `types.ts:14-27` and `helpers.rngOf`/`spyRng` throw-on-exhaust. A re-roll loop would add 1+ draws per malformed value, desyncing `mulberry32` sequences and breaking parity with `js/game.js` seed contract. | This plan pins 1-draw budget: `weightedPicker` clamp consumes exactly 1 draw, `normalizeDisplayRoll` consumes exactly 1 draw (no loop). `spyRng` exact-length assertions enforce it. |
| **Changing `PendingSpawn` shape or `displayRoll` semantics (`<0.6 exact` / `>=0.6 range` ambiguous band, `previewFor` 60/40)** | `PendingSpawn { value, displayRoll }` is ADR-06 snapshot-owned (undo must revert); `displayRoll` semantics are Epic 7 `previewFor` / `Hud` preview card, not this sweep. | `previewFor` 60/40 + `preview-pot-ladder-hygiene` remain out of scope; `normalizeDisplayRoll` only ensures `displayRoll ∈ [0,1)` so existing preview branching stays valid. |
| **Capping or re-weighting the 40/40/20 ladder (`FIXED_WEIGHTS`, `POT_WEIGHT`, `POT_CURVE`, `potWeights`, `normalizeTo`)** | Weights ladder is frozen per `spawnConfig.ts:3` `FIXED_WEIGHTS[1]=0.4, [2]=0.4` + `POT_WEIGHT=0.2` sum 1.0 ±1e-9 (spec `Never: Change spawn weights/distribution or GRID_SIZE`). | `spawn.test.ts` sum 1.0 pin + `weights.test.ts` halving matrix stay gate. |
| **RevenueCat / AdMob / IAP / Epic 9-11 a11y** | No monetization/a11y code touched. | Existing suites remain gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `weightedPicker(weights, rng)` and `normalizeDisplayRoll(raw)` are pure with no `expo-*`/`Skia`/`RNG` state; `game.newGame(rng)` / `game.move(state, dir, rng)` are pure with injected `Rng`. Every path is host-testable via `node --import tsx --test` with `rngOf(0, 0.5, 1, Infinity, NaN, -0.5, 1.5)` + `weights [1,0.5]` / `[0.4,0.4, ...pot]` + `emptyBoard()`/`staticBoard([1,2,null,null])`/`gameState(board, pendingSpawn)` + `spyRng` draw-count.

**Observability — Good.** Outputs are deterministic numerics/booleans with no hidden state: `weightedPicker` index `0..n-1` via `scaled < acc`, `normalizeDisplayRoll` `0..1-EPSILON` or `0.5` midpoint, `pendingSpawn.displayRoll` `[0,1)` invariant, `move` `pendingSpawn.displayRoll ∈ [0,1)` and `board` 4×4 finite. Malformed clamp is observable as `weightedPicker([1,0.5], () => -1) === 0` (first band) and `() => Infinity` → last index via valid band not fallthrough, `normalizeDisplayRoll(NaN) === 0.5` not `NaN`.

**Reliability — Strong (engine never throws, rng never throws).** `weightedPicker` guards `typeof roll !== 'number' || NaN → last` + new `clamp [0,1-EPSILON]` eliminates `scaled >= total` fallthrough vs valid-band ambiguity; `normalizeDisplayRoll` guards `!Number.isFinite` + `unknown` → `0.5` before `<0`/`>=1` clamps. Both `tsc` gates clean; `npm --prefix triade test` full gate `<15 min` (existing 180+ pass preserved).

**Testability Risks:** Two surfaces are thin: (a) `weightedPicker` `NaN` guard vs clamp ordering — a follow-on that removed `NaN → last` and relied solely on `Math.max(NaN,0) → NaN` would re-leak `NaN` scaled path to fallthrough (different last-index path) — mitigated by NaN pin + scan. (b) `normalizeDisplayRoll` `>=1` vs `>1` threshold — a `>1` (strict) would let `1.0` leak as `1` (exclusive upper bound violated) breaking `[0,1)` contract — mitigated by `1.0 → 1-EPSILON` pin.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **WeightedPicker malformed roll ≥1/Infinity/negative not clamped to valid band — fallthrough vs explicit band confusion + distribution bias.** Before fix `roll >=1` (including `Infinity`) produced `scaled >= total` which never satisfied `scaled < acc` so fell through to `return weights.length - 1` (same value as NaN path but via invalid scaled, not via valid `1-EPSILON` band). Negative `roll` produced `scaled < 0` which satisfied first `scaled < acc` immediately (first band) by accident, not by clamp. Risk: a revert that removed `safeRoll = clamp(roll, 0, 1-EPSILON)` would re-expose fallthrough path and make `roll 1.0` map via fallthrough not via `0.999...` band; a future caller comparing `roll >=1 → re-roll` expectation vs `last-index` would mis-handle, and distribution neutrality shifts if clamp is off-by-epsilon vs `1` exclusive. | 2 | 3 | **6** | Pin clamp semantics: (a) **host P0** `weightedPicker([1,0.5], rngOf(1)) === last` + `Infinity → last` + `1.5 → last` + `-0.5 → 0` + `-Infinity → 0` + `0 → 0` + `0.999 → last` via valid band; (b) **static scan** `rg -n "safeRoll" triade/src/engine/core/weights.ts` ==1 and `rg -n "1 - Number\.EPSILON" weights.ts` ==1 and `rg -n "Math\.min\(Math\.max\(roll" weights.ts` ==1; (c) **pipeline** `weightedValue(rngOf(1)) === 3` pot slot via valid band not fallthrough — `spawn.test.ts:22` stays green. | FE lead | Immediate (gate DW-56 weightedPicker half) |
| R-002 | DATA | **DisplayRoll NaN/Infinity/non-number/≥1 copied unvalidated into `PendingSpawn.displayRoll` breaking `[0,1)` contract → Epic 7 preview misclassifies.** Before fix `newGame` and `move` effective path did `displayRoll: rng()` with no validation, so `rng → NaN` stored `NaN`, `Infinity → Infinity`, `1 → 1`, `1.5 → 1.5`, `"0.5" → "0.5"` (non-number) — all outside `[0,1)`. Downstream `previewFor(state.pendingSpawn.displayRoll)` uses `<0.6 exact` else `range`; `NaN >=0.6` is false so always exact branch mis-branch, `Infinity` always range but value `Infinity` leaks, HUD preview shows wrong bucket, `sanitizePending` in next `move` would then `dr >=0 && dr <1 ? dr : 0` coerce `NaN/1/Infinity → 0` but only one move later (one-move stale preview). Risk: a revert that removed `normalizeDisplayRoll` would re-break `displayRoll ∈ [0,1)` invariant for any malformed RNG. | 2 | 3 | **6** | Enforce `[0,1)` invariant at source: (a) **host P0** `newGame(rngOf(9×0, 9×0, 0.1, NaN)) → pendingSpawn.displayRoll===0.5` + `Infinity →0.5` + `"bad"→0.5` + `move effective rngOf(0, 0.2, NaN)→0.5` + `rngOf(0, 0.2, Infinity)→0.5` + `rngOf(0, 0.2, 1)→1-EPSILON` + `rngOf(0, 0.2, -0.5)→0`; (b) **static scan** `rg -n "normalizeDisplayRoll" triade/src/engine/core/game.ts` 3 hits (def + 2 call sites) and `rg -n "displayRoll: rng\(\)" game.ts` ==0 (no bare rng); (c) **pipeline** `previewFor` exact/range 60/40 still green after normalized `0.5` midpoint (neutral, not `0` bias). | FE lead | Immediate (gate DW-56 displayRoll half) |
| R-003 | TECH | **Draw-budget drift — displayRoll normalization or roll clamp introduces extra rng consumption (re-roll loop).** Contract: `newGame 20`, `effective move 3 (cell pick 1 + resolveSpawn 1 + displayRoll 1)`, `noop 0`, `resolveSpawn 1`, `spawnTile cell pick 1`. Before fix `displayRoll: rng()` was 1 draw; after fix `normalizeDisplayRoll(rng())` is still 1 draw (pure function, no loop). `weightedPicker` clamp is still 1 draw (`rng()` then clamp). Risk: a follow-on that implemented `while (!isFinite(roll)) roll = rng()` would add 1+ draws per malformed value, desyncing `mulberry32` sequences and breaking `helpers.rngOf` throw-on-exhaust and seeded session determinism (`adaptive-spawn-integration` 10k N sigma gates). | 2 | 3 | **6** | Pin 1-draw budget: (a) **host P0** `spyRng` exact-length `newGame 20`, `effective move with malformed displayRoll NaN still 3` (`spyRng(0, 0.5, NaN)` length 3), `weightedPicker([1,0.5], spyRng(Infinity)) length 1`; (b) **static scan** `rg -n "rng\(\)" triade/src/engine/core/weights.ts` 1 hit (single draw site) and `rg -n "while.*rng" triade/src/engine/core/` ==0 (no re-roll loop); (c) **pipeline** `pending-spawn-contract.test.ts` `newGame 20` + `effective 3` + `noop 0` stay green. | FE lead | Immediate (gate DW-56 budget preservation) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Epsilon off-by-one — `1 - Number.EPSILON` vs `1 - 1e-9` vs `1` exclusive confusion for `>=1` branch.** `Number.EPSILON ≈ 2.22e-16`, so `1 - EPSILON` is the largest `<1` double; a follow-on that used `1 - 1e-9` or `0.999` would bias the top pot bucket slightly larger, and `>=1 → 1` (without epsilon) would store `1` violating `[0,1)` exclusive upper bound (downstream `previewFor` `1` is valid but contract says `<1`). | 2 | 2 | 4 | Pin epsilon: (a) host `normalizeDisplayRoll(1) === 1 - Number.EPSILON` + `1.5 → 1 - EPSILON` + `Infinity → 0.5` (non-finite before epsilon branch) + `weightedPicker([1,0.5], rngOf(1))` still last via `safeRoll 1-EPSILON`; (b) scan `rg -n "Number\.EPSILON" triade/src/engine/core/game.ts` 1 + `weights.ts` 1 = total 2. |
| R-005 | BUS | **Midpoint neutrality — `NaN/Infinity/non-number → 0.5` vs `0` bias for preview distribution.** Preview `displayRoll` drives `previewFor` 60/40 ladder (`<0.6 exact` else `range`); `0` would always be exact branch, skewing preview distribution. `0.5` is midpoint → exact branch (`<0.6`) but centrally not edge, chosen to keep preview distribution neutral not zero-biased. A follow-on that changed fallback to `0` would silently skew exact vs range toward exact on malformed RNG. | 2 | 2 | 4 | Pin midpoint: host `normalizeDisplayRoll(NaN)===0.5` + `undefined as any →0.5` + `"bad"→0.5` + `null→0.5`; scan `return 0\.5` in `game.ts` 1 hit (only midpoint path). |
| R-006 | TECH | **NaN guard ordering — `weightedPicker` keeps both `NaN → last` early-return and `clamp [0,1-EPSILON]`; clamp alone would map NaN differently.** `Math.max(NaN,0)` is `NaN`, `Math.min(NaN, 1-EPSILON)` is `NaN`, so `scaled = NaN * total = NaN` → loop `NaN < acc` false → fallthrough to last anyway (same result numerically but different path). Keeping explicit `if (typeof roll !== 'number' || NaN) return last` documents intent and avoids NaN scaled path ambiguity. Risk: removing NaN guard would still return last but via NaN scaled not via explicit degradation, changing debuggability and spec AC5 wording. | 1 | 3 | 3 | Pin both guards: (a) host `weightedPicker([1,1], () => NaN) === 1` + `() => undefined as any === 1` + `() => "0.5" as any === 1`; (b) scan `typeof roll !== 'number'` 1 hit + `Number\.isNaN\(roll\)` 1 hit + `safeRoll` 1 hit in `weights.ts`. |
| R-007 | DATA | **DisplayRoll finite-negative clamp `→ 0` vs midpoint `0.5` distinction — negatives are clampable not midpoint.** Finite `raw <0` → `0` (first edge, valid `[0,1)`), while non-finite/non-number → `0.5`. Confusing the two would map `-0.5 → 0.5` (midpoint) losing deterministic edge mapping for out-of-range finite negatives that are clampable to valid band. | 1 | 3 | 3 | Pin split: host `normalizeDisplayRoll(-0.5)===0` + `-1→0` + `-Infinity→0.5` (non-finite before negative branch); scan `if \(raw < 0\) return 0` 1 hit not `0.5`. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | PERF | **Guard cost — `normalizeDisplayRoll` 2 branches + `weightedPicker` clamp 2 Math calls per effective move / newGame.** On 4×4 board per `move()` one clamp + one normalize (`<0.01 ms`) vs frame budget `<8 ms`; per `newGame` one normalize. No loop, no allocation. | 1 | 1 | 1 | Monitor — `npm --prefix triade test` full gate `<15 min` is sufficient; `feel.bench` both-profile budget unchanged. |
| R-009 | OPS | **Deferred-ledger `resolution-undo` hash coupling + `sprint-status.yaml` ownership.** Sweep marks DW-56 `done` with `resolution-undo: 0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e 2026-09-02 7374617475733a206f70656e`; `sprint-status.yaml` is orchestrator-owned and must not be written or reverted by this workflow. | 1 | 2 | 2 | Monitor — ledger already records `resolution-undo: 0eb6ce61…`; any reopen must keep hash. `git diff --stat` gate shows `deferred-work.md` + `game.ts`/`weights.ts` but NOT `sprint-status.yaml`. This plan never writes the latter. |

### Risk Category Legend

- **TECH**: Technical/Architecture (roll clamp vs fallthrough, NaN guard ordering, epsilon, draw-budget loop avoidance, displayRoll finite vs non-finite split)
- **SEC**: Security — none this sweep (pure engine math, no auth/data exposure; `Number.isFinite` + `unknown` guard are data math, not security boundary)
- **PERF**: Performance — `isFinite` + `Math.min/Math.max` O(1) per call (R-008)
- **DATA**: Data Integrity — `PendingSpawn.displayRoll ∈ [0,1)` → `previewFor` → HUD preview card chain (R-002, R-007) and 40/40/20 pot composition
- **BUS**: Business Impact — spawn distribution 40/40/20 via `weightedPicker` (R-005) and preview neutrality
- **OPS**: Operations (deferred ledger `resolution-undo`, `sprint-status.yaml` ownership, `tsc` gates)

---

## NFR Planning

**Purpose:** Capture sweep-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-engine-rng-trust-hardening` touches the **engine RNG trust seam only**: **reliability/never-throw + finiteness** (every `weightedPicker`/`normalizeDisplayRoll`/`move`/`newGame` finite and non-throwing on any `Rng` including `NaN/Infinity/non-number/negative/≥1`), **correctness** (40/40/20 distribution preserved via valid-band clamp, `[0,1)` contract via deterministic 0.5/0/EPSILON mapping), **maintainability (single `safeRoll` clamp + single `normalizeDisplayRoll` + single epsilon `Number.EPSILON` + single midpoint `0.5` + single ledger `resolution-undo` hash)**, **performance** (O(1) clamp, no re-roll loop), and **draw-budget determinism** (1-draw per picker, 1-draw per displayRoll).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw + finiteness | `weightedPicker` never throws on any `roll` including `NaN/Infinity/琀*neg/≥1/non-number`; `normalizeDisplayRoll` never throws on any `raw` including `undefined/null/"bad"/{}`; every `pendingSpawn.displayRoll` finite `∈ [0,1)` and `value` finite `>0`; `move`/`newGame` never throw on malformed RNG. | R-001, R-002, R-006 | Host unit negative-path sweep: `weightedPicker([1,0.5], rngOf(Infinity))→last` + `NaN→last` + `-1→0` + `normalizeDisplayRoll(NaN)→0.5` + `Infinity→0.5` + `"bad"→0.5` + `1→1-EPSILON` + `move effective with NaN third draw → displayRoll 0.5` — plus `spawn.test.ts` NaN clamp + `game.test.ts` newGame effective smoke. | `triade/__tests__/engine/weights.test.ts` + `game.test.ts` + `spawn.test.ts` green + manual probe `normalizeDisplayRoll` scalar wall + both `tsc` clean |
| Maintainability | Single `safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON)` in `weights.ts`; single `normalizeDisplayRoll(raw: unknown)` in `game.ts` with 3 branches (`!finite/non-number→0.5`, `<0→0`, `>=1→1-EPSILON`); single weight literal `1 - Number.EPSILON` per file (2 total); single midpoint `return 0.5` per game; `resolution-undo` 64-hex per resolved DW-56; no duplicate `displayRoll: rng()` bare site, no re-roll loop. | R-001, R-004, R-005, R-009 | Static scans: `rg -n "safeRoll" weights.ts` ==1, `rg -n "Number\.EPSILON" game.ts` ==1, `rg -n "Number\.EPSILON" weights.ts` ==1, `rg -n "normalizeDisplayRoll" game.ts` ==3, `rg -n "displayRoll: rng\(\)" game.ts` ==0, `rg -n "while.*rng" engine/core` ==0, ledger `rg -n "resolution-undo" deferred-work.md` shows 1 new 64-hex DW-56. | Source scans + `weights.ts:29` + `game.ts:8-18` diff + ledger diff |
| Correctness — 40/40/20 + [0,1) + epsilon | Ladder `FIXED_WEIGHTS[1]=0.4, [2]=0.4, POT_WEIGHT=0.2 sum 1.0 ±1e-9`; weightedPicker `0 → first band (1)`, `1/Infinity/1.5 → last pot (3)`, `-0.5 → first (1)`, `NaN → last` preserved; `displayRoll` `NaN→0.5` (midpoint, not 0), `-0.5→0`, `1→1-EPSILON`, `Infinity→0.5`, valid `0..0.999→raw`; epsilon `Number.EPSILON` exact. | R-001, R-004, R-005, R-007 | Host ladder suite: `weights.test.ts` 40/40/20 `spawn.test.ts` + `weightedPicker([1,0.5], rngOf(0))→0` + `0.99→last` + `negative/≥1/NaN` P0 + `normalizeDisplayRoll` scalar wall 9 probes + `previewFor` 60/40 `hud-preview-hardening` ladder. | `weights.test.ts` + `spawn.test.ts` 5-case + `game.test.ts` + `preview-pot-ladder-hygiene` 60/40 |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn` (weights clamp O(1) + log2 O(1) for ceiling path), frame worst `<8 ms`, device `p99 <16.7 ms`. Guards add ≤2 `Math.min/max` + 2 branches per `move()` — `<0.01 ms`. No `while` loop, no allocation, no re-roll. | R-008 | Host gate only: `npm --prefix triade test` (full) median per `weights.test.ts` `<0.01 ms`; `feel.bench.test.ts` both-profile budget unchanged. | CI `npm test` timing + both `tsc` clean; no bench lane |
| Draw-budget determinism | `Rng` draw contract `newGame 20 / effective 3 / noop 0 / resolver 1` preserved even with malformed rolls; every `weightedPicker` consumes exactly 1, every `normalizeDisplayRoll(rng())` consumes exactly 1, no re-roll loop. | R-003 | Host + pipeline: `spyRng` exact-length `newGame(rngOf(9×0,9×0.5, 0.1, 0.5)) 20` + `move effective with malformed displayRoll NaN still 3` + `weightedPicker Infinity 1` + `helpers.rngOf` throw-on-exhaust + `pending-spawn-contract.test.ts` `N3` pin. | `game.test.ts` 32 pass + `pending-spawn-contract.test.ts` + `helpers.ts` `rngOf`/`spyRng` |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (pure TS `game` + `weights`). | — | `npm --prefix triade test` offline (no network) still green. | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. Guard cost `<0.01 ms` is observed, not threshold-invented; `normalizeDisplayRoll` `0.5` midpoint threshold is design choice documented here (neutral preview, not PRD-invented). If a future sweep introduces a `displayRoll` value change, record its measured `previewFor` 60/40 impact rather than inventing a threshold. `Number.EPSILON` is language-level, not NFR-invented.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (DW-56 ledger reason + decision `Clamp roll and validate displayRoll — Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback` signed; `weights.ts:29` + `game.ts:8-18` intent reviewed)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsx` + `tsconfig.test.json` (`TSX_TSCONFIG_PATH`) + `helpers.ts` `emptyBoard`/`boardWith`/`gameState`/`rngOf`/`spyRng`/`mulberry32`)
- [ ] Test data available or factories ready (`emptyBoard`/`staticBoard([1,2,null,null])`/`boardWith` 4×4 16-cell + `rngOf(NaN, Infinity, -0.5, 0, 0.5, 1, 1.5)` scalar wall + `weights [1,0.5]` / `FIXED_WEIGHTS+pot` / `pendingSpawn {value, displayRoll}` + `emptyBoard`→`ceilingDetector`→`tier` fixtures + `mulberry32(seed)` + `stateFromResult`/`preSpawnBoardOf`/`runSeededSession`)
- [ ] Feature deployed to test environment (working tree on `2e91c12` + diff `game.ts` 16-line `normalizeDisplayRoll` + `weights.ts` 7-line `safeRoll` clamp + ledger `deferred-work.md` DW-56 `0eb6ce61…`; `git diff HEAD` shows `game.ts` + `weights.ts` + `deferred-work.md` (+ `1-5-*.md` metadata unrelated))
- [ ] No ceiling/line/spawn/feel/layout edits (`git diff --stat -- triade/src/engine -- triade/src/feel triade/src/ui triade/src/services` shows `game.ts`+`weights.ts` only outside ledger) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`weightedPicker` negative/≥1/Infinity/NaN clamp + `normalizeDisplayRoll` NaN/Infinity/non-number/negative/≥1 + draw-budget 20/3/0/1)
- [ ] All P1 tests passing (or failures triaged with waivers) — `game.test.ts` 32 pass + `weights`/`spawn`/`pot`/`adaptive-spawn` + `pending-spawn-contract` + `preview` 60/40 chain green
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on RNG trust seam; `rg` allowlists for single `safeRoll`/`normalizeDisplayRoll`/`Number.EPSILON`/`return 0.5` green)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (both via `TSX_TSCONFIG_PATH`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness+ladder correctness + [0,1) contract, single-guard maintainability, O(1) frame budget, draw-budget determinism)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns RNG trust P0 clamp + displayRoll [0,1) + draw-budget pins, pipeline `newGame→move→previewFor` gates, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `weights.ts` `safeRoll` clamp vs fallthrough, `game.ts` `normalizeDisplayRoll` finite/non-number/negative/≥1 branches, epsilon `Number.EPSILON`, 1-draw budget preservation |
| PM | PM | Signs midpoint `0.5` neutral (not 0 bias) for malformed preview fallback + clamp 0 vs 0.5 split (finite negative →0) + unbounded displayRoll contract `[0,1)` |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, mostly landed in working tree

**Criteria**: Blocks RNG trust bypass (negative/≥1/NaN leak to distribution or preview [0,1) break) or displayRoll contract drift + high risk (≥6) + no workaround (RNG is the spawn-seed for every `move`/`newGame`)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `weightedPicker` negative clamp: `weights [1,0.5]` `rngOf(-0.5)→0`, `rngOf(-Infinity)→0`, `rngOf(-1)→0` (first band, not NaN fallthrough) | Unit | R-001 | 3 | QA | `safeRoll = max(roll,0)` before `min(...,1-EPSILON)`. |
| AC — `weightedPicker` ≥1/Infinity clamp: `rngOf(1)→last`, `rngOf(1.5)→last`, `rngOf(Infinity)→last` via valid band `1-EPSILON` (`scaled < total`) not via fallthrough `scaled >= total` | Unit | R-001 | 3 | QA | `Math.min(...,1-EPSILON)` guarantees `scaled < total`. |
| AC — `weightedPicker` NaN/non-number guard still last: `() => NaN → last`, `() => undefined as any → last`, `() => "0.5" as any → last` | Unit | R-001, R-006 | 3 | QA | Early `typeof !== 'number' || NaN` before clamp. |
| AC — `normalizeDisplayRoll` non-finite/non-number → 0.5 midpoint: `NaN→0.5`, `Infinity→0.5`, `-Infinity→0.5`, `undefined→0.5`, `null→0.5`, `"0.5"→0.5`, `{}→0.5` | Unit | R-002, R-005 | 7 | QA | `if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0.5`. |
| AC — `normalizeDisplayRoll` finite clamp: `-0.5→0`, `-1→0`, `0→0` (kept), `0.5→0.5` (kept), `0.999→0.999` (kept), `1→1-EPSILON`, `1.5→1-EPSILON` | Unit | R-002, R-004, R-007 | 7 | QA | `if (raw <0) return 0`, `if (raw >=1) return 1-EPSILON` — strict `>=1` not `>1`. |
| AC — `newGame` malformed third draw still valid: `rngOf(9×0, 9×0, 0.1, NaN) → pendingSpawn.displayRoll===0.5` + `Infinity→0.5` + `1→1-EPSILON` + valid `0.3→0.3` | Unit (game) | R-002 | 4 | QA | `newGame` call site `normalizeDisplayRoll(rng())` pinned via `spyRng` 20-draw. |
| AC — `move` effective malformed third draw still valid + board spawn value still deterministic: `gameState(staticBoard([1,2,null,null]))` + `rngOf(0, 0.2, NaN) → pendingSpawn.displayRoll 0.5` + `rngOf(0, 0.2, Infinity) →0.5` + `rngOf(0, 0.2, 1) →1-EPSILON` + `rngOf(0, 0.2, -0.5) →0` | Unit (game) | R-002, R-007 | 4 | QA | Effective `3-draw` budget preserved; third draw is displayRoll before sanitize. |
| AC — Draw-budget preserved (no re-roll): `weightedPicker([1,0.5], spyRng(Infinity)) calls.length===1`, `weightedPicker NaN calls 1`, `normalizeDisplayRoll(NaN)` does not consume extra `rng` (single `rng()` call), `newGame` with malformed still 20 draws, `effective move` with malformed displayRoll still 3 draws | Unit | R-003 | 5 | QA | `rg "while.*rng" ==0` + `rg "rng()" weights.ts ==1` per spec. |
| AC — Bare site eliminated: `rg -n "displayRoll: rng\(\)" game.ts ==0` (all via `normalizeDisplayRoll`) and `rg -n "const scaled = roll" weights.ts ==0` (all via `safeRoll`) | Static scan | R-001, R-002 | 2 | QA | No bare `rng()` displayRoll or bare `roll*total` scaled. |

**Total P0**: 38 checks (host unit: negative 3 + ≥1 3 + NaN 3 + midpoint 7 + finite 7 + newGame 4 + move 4 + budget 5 + bare 2), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & wall pipeline

**Criteria**: Important RNG→spawn→preview pipeline + medium/high risk + common game workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Engine→spawn pipeline: `resolveSpawn` single-roll `FIXED_WEIGHTS 0.4/0.4 + POT_WEIGHT 0.2` via `weightedPicker` with clamp still green; `weightedValue(rngOf(0.99))→3` pot slot via valid band | Integration (engine→spawn) | R-001 | 2 | QA | `spawn.test.ts` 5-case + `weights.test.ts` `FIXED 40/40` + `pot ladder` suites. |
| `weights.test.ts` defensive: `NaN → last` + `[0,0] → last` + `[] → 0` + boundary `0.99 → last` + `2/3±1e-6` still green after clamp | Unit | R-001, R-006 | 5 | QA | `weights.test.ts:98-112` 5 pins — keep green; ensures clamp did not break NaN degrade. |
| `game.move` 4 suites: `HAPPY_PATH/CASCADE/ONE_CELL` + `newGame 20-draw`/`effective 3-draw`/`noop 0-draw` + `trace` spawned + `isGameOver` (indirectly consumes `displayRoll` via `newGame`/`move` spawn branch) | Integration (game) | R-002, R-003 | 4 | QA | `game.test.ts` 32 pass — `normalizeDisplayRoll` feeds `pendingSpawn.displayRoll` inside `move`/`newGame`. |
| `pending-spawn-contract.test.ts` N3 pipeline: `preSpawnBoardOf`/`runSeededSession` 200-move sweep still green — proves guarded `displayRoll` never leaks `NaN/Infinity/≥1` into `previewFor` `N3` materialization | Integration (engine) | R-002, R-003 | 2 | QA | `helpers.preSpawnBoardOf` + `runSeededSession` `N3` pin + `preview-pot-ladder-hygiene` `60/40`. |
| `adaptive-spawn-integration` 5 suites: `AC7 distribution 10k N`, `pot-by-ceiling conditional`, `tier-0 0/1/2 exception`, `ceiling ordering tier>=1 v<=ceiling`, `N3` still green (no RNG shape change) | Integration (engine) | R-001, R-003 | 5 | QA | `triade/__tests__/engine/adaptive-spawn-integration.test.ts` 5 suites — proves clamp did not shift 40/40/20 aggregate. |
| Ledger `deferred-work.md` DW-56 `done` with `resolution-undo` 64-hex, `sprint-status.yaml` untouched (orchestrator-owned) | Static | R-009 | 1 | QA | `rg -n "status: done 2026-09-02" deferred-work.md` DW-56 hit with `resolution-undo: 0eb6ce61…`; `git diff --stat` shows `deferred-work.md` but not `sprint-status.yaml`. |

**Total P1**: 19 checks, ~1.0–1.9 h host (mostly existing suites + ledger 1 hit already landed)

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary helper edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-clamp / single-normalize / single-epsilon / single-midpoint allowlists — `rg -n "safeRoll" weights.ts ==1`, `rg -n "normalizeDisplayRoll" game.ts ==3`, `rg -n "Number\.EPSILON" game.ts ==1` + `weights.ts ==1` total 2, `rg -n "return 0\.5" game.ts ==1`, `rg -n "Math\.min\(Math\.max\(roll" weights.ts ==1` | Static scan | R-001, R-004, R-005 | 1 | QA | Any duplicate `safeRoll` or second `return 0.5` or missing `Number.EPSILON` is a fail. |
| No bare scale / no bare displayRoll / no re-roll loop — `rg -n "const scaled = roll \* total" weights.ts ==0`, `rg -n "displayRoll: rng\(\)" game.ts ==0`, `rg -n "while.*rng" triade/src/engine --include="*.ts" ==0` | Static scan | R-001, R-002, R-003 | 1 | QA | Ensures `weights.ts:30` `safeRoll * total` is sole scaled site and `game.ts:34,110` are sole displayRoll sites. |
| Epsilon exactness + midpoint neutrality coupling — `rg -n "1 - Number\.EPSILON" game.ts ==1` + `weights.ts ==1` (no `1 - 1e-9` or `0.999`); `rg -n "return 0\.5" weights.ts ==0` (midpoint only in game, not weights); `NaN→last` vs `NaN→0.5` split documented (weights NaN→last, game NaN→0.5) | Static scan | R-004, R-005, R-006 | 1 | QA | Keeps two NaN strategies distinct: picker NaN→last (distribution tail), displayRoll NaN→0.5 (preview neutral). |
| Board `pendingSpawn` `displayRoll` window strict `[0,1)` — `rg -n "dr >= 0 && dr < 1" game.ts` 1 hit in `sanitizePending` + `rg -n "raw >= 1" game.ts` 1 hit in `normalizeDisplayRoll` (strict `>=1` not `>1`) + `sanitizePending` `value finite>0` still green | Static scan | R-002, R-007 | 1 | QA | Ensures `1.0` is clamped not kept and sanitize window stays `>=0 && <1` not `<=1`. |

**Total P2**: 4 checks, ~0.4–0.8 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — malformed sequence sweep: `newGame(rngOf(9×0, 9×0, NaN, NaN))` still valid 20-draw + 9 tiles + `pendingSpawn.displayRoll 0.5` then `move` effective `rngOf(Infinity, NaN, -0.5)` still 3-draw and next `pendingSpawn.displayRoll 0` not `0.5` (finite-negative branch) vs `rngOf(Infinity, Infinity, 1.5)` next `displayRoll 1-EPSILON` | Unit | 1 | QA | No assertion beyond no-throw + finite `[0,1)` + 3-draw; if hit, file DW for malformed-RNG production seed import path (R-002 residual). |
| Micro-zero — `weightedPicker([1,0.5], rngOf(0))→0` + `rngOf(0.39)→0` + `rngOf(0.4)→1` + `normalizeDisplayRoll(0)→0` + `normalizeDisplayRoll(0.599)→0.599` + `normalizeDisplayRoll(0.6)→0.6` + `normalizeDisplayRoll(0.999)→0.999` complements 40/40 boundary `0.4±1e-6` via `weights.test.ts:68` | Unit | 1 | DEV | Already `0.4` boundary + `0.99→last` via `weights.test.ts:68`. |
| No-leak ladder bench — `weightedPicker` 10k × `[0.4,0.4, ...pot]` random malformed injection (10% `NaN/Infinity/1.5/-0.5`) median `<0.05 ms` + `normalizeDisplayRoll` 10k × `NaN/1.5/-0.5` median `<0.01 ms` (clamp O(1), no bench lane beyond `feel.bench.test.ts` full-board `median/p99` unchanged) | Unit (bench) | 1 | DEV | Engine `<2 ms/turn`, frame worst `<8 ms`; guard adds `<0.01 ms` per call — just confirm no `while` infinite (no loop). Not a new lane, just CI `npm test` timing. |
| Cross-cutting negative scan — `rg -n "Music\|bgm\|RevenueCat\|AdMob" triade/src/engine --include="*.ts"` empty (engine sweep stayed in scope, no cross-cutting concern leaked) | Static scan | 1 | QA | Trivial hygiene; carry-over — no new gate, just prove sweep stayed in scope. |

**Total P3**: 4 checks, ~0.2–0.4 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch clamp/format regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/engine/weights.test.ts` green on clean working tree (host, includes `0.99→last`, `NaN→last`, `2/3±1e-6`)
- [ ] Manual probe from spec reasoning: `node --import tsx -e "…normalizeDisplayRoll(NaN)→0.5, -0.5→0, 1→1-EPSILON…" ` no `NaN`/`≥1` leak
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore`, guards typed `number|unknown`)
- [ ] `rg -n "safeRoll" triade/src/engine/core/weights.ts | wc -l` ==1 and `rg -n "normalizeDisplayRoll" triade/src/engine/core/game.ts | wc -l` ==3 and `rg -n "displayRoll: rng\(\)" triade/src/engine/core/game.ts | wc -l` ==0 (quick scan)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical RNG trust guards (host only)

- [ ] Negative/≥1/Infinity/NaN `weightedPicker` clamp → valid band not fallthrough
- [ ] `normalizeDisplayRoll` non-finite/non-number → 0.5 + finite negative →0 + finite ≥1 →1-EPSILON + valid kept
- [ ] `newGame` 20-draw + `move` effective 3-draw still valid with malformed third draw
- [ ] No bare `displayRoll: rng()` or `roll * total` bare scale

**Total**: 38 P0 checks (already mostly passing in working tree — `weights.ts:29` + `game.ts:8-18` landed)

### P1 Tests (<30 min)

**Purpose**: Pipeline + ladder chain

- [ ] `spawn.test.ts` 40/40/20 + `weights.test.ts` NaN guard + `game.test.ts` 32 pass
- [ ] `adaptive-spawn-integration` 5 suites (distribution 10k + pot-by-ceiling conditional)
- [ ] `pending-spawn-contract` + `preview-pot-ladder-hygiene` 60/40 + `game.move` smoke
- [ ] Ledger `resolution-undo` 64-hex 1 hit DW-56 + `git diff --stat` shows `game.ts`+`weights.ts` but not `sprint-status.yaml`

**Total**: 19 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, bench, exploratory

- [ ] Single-guard / single-epsilon / single-midpoint + `while rng` 0-hit + `previewFor` 60/40 still green (<1 min)
- [ ] Ledger `resolution-undo` 64-hex 1 hit + `git diff` `sprint-status.yaml` untouched (<1 min)
- [ ] Malformed sequence exploratory + micro-bench + cross-cutting scan (<2 min)

**Total**: 8 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 38 | ~0.08 | ~2.0–3.0 | Pure `weights.ts` clamp + `game.ts` `normalizeDisplayRoll` scalar wall + `newGame`/`move` malformed pins + draw-budget + bare-site scans — mostly host `rngOf`/`spyRng` O(1) |
| P1 | 19 | ~0.12 | ~1.4–2.8 | Existing `weights.test.ts:9` + `spawn:5` + `game:32` + `adaptive-spawn:5` + `pending-spawn-contract:2` + ledger 1-hit (mostly existing suites) |
| P2 | 4 | ~0.15 | ~0.4–0.8 | Static allowlists + epsilon/midpoint coupling + `while rng` 0-hit + window strict |
| P3 | 4 | ~0.10 | ~0.2–0.4 | Malformed sequence exploratory + micro-bench + cross-cutting scan |
| **Total** | **65** | **-** | **~4.0–7.0** | **~0.5–0.9 days host; full gate `<15 min` (`npm test` + `tsc` + `rg`) — no device bench lane required; guard is O(1) <0.01ms** |

> For gate reporting, collapse to `~3.0–5.6 h` without P3 exploratory (keep P3 as optional).

### Prerequisites

**Test Data:**

- `emptyBoard`/`staticBoard([1,2,null,null])`/`boardWith` 4×4 16-cell + scalar wall `[-0.5, 0, 0.5, 1, 1.5, Infinity, -Infinity, NaN, undefined, null, "0.5", {}]` + `weights [1,0.5]` / `FIXED 0.4/0.4/0.2 + pot` / `pendingSpawn {value, displayRoll}` + `GRID_SIZE=4` + `POT_BASE_VALUE` + `MAX_POT_TIER=30`
- `rngOf` / `spyRng` exact-length Throw-on-exhaust (helpers `triade/test-utils/helpers.ts:31-56`) + `mulberry32(seed)` + `stateFromResult`/`preSpawnBoardOf`/`runSeededSession`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `rg` (ripgrep) for allowlist scans (`safeRoll`, `normalizeDisplayRoll`, `Number.EPSILON`, `return 0.5`, `displayRoll: rng()`, `while.*rng`, `1 - Number.EPSILON`, `resolution-undo`)
- `npm --prefix triade exec -- tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — engine is pure TS, no native module)
- Working tree on `2e91c12` + diff `game.ts` `normalizeDisplayRoll` + `weights.ts` `safeRoll` + ledger DW-56 `0eb6ce61…`; `triade/src/engine` delta guard `game.ts`+`weights.ts` only

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — negative/≥1/Infinity/NaN clamp + displayRoll [0,1) + draw-budget 20/3)
- **P1 pass rate**: ≥95% (waivers required for failures — e.g. `adaptive-spawn-integration` statistical `N=10k` 5σ tripwire may be `WAIVED` only with seed reason if `sigmaBound` headroom drifts)
- **P2/P3 pass rate**: ≥90% (informational; static allowlists must be 100%)
- **High-risk mitigations**: 100% complete or approved waivers with owner + expiry (R-001..R-003)

### Coverage Targets

- **Critical paths**: ≥90% (RNG trust seam: `weightedPicker` 3 malformed classes + `normalizeDisplayRoll` 4 branches + draw-budget)
- **RNG trust seam scenarios**: 100% (`-0.5→0`, `1→1-EPSILON`, `Infinity→last`, `NaN→0.5`/`last` split must be PINNED)
- **Business logic** (`weightedPicker` clamp + `normalizeDisplayRoll` 0.5/0/EPSILON + `move`/`newGame` displayRoll): ≥85%
- **Edge cases** (empty weights `[]→0`, `[0,0]→last`, `sanitizePending` still `dr>=0&&dr<1`, `1.0` exclusive): ≥80%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (negative 3 + ≥1 3 + NaN 3 + midpoint 7 + finite 7 + newGame 4 + move 4 + budget 5 + bare 2)
- [ ] No high-risk (≥6) items unmitigated (R-001..R-003 mitigations green or formally waived with owner+expiry)
- [ ] `[0,1)` invariant holds (`1.0 → 1-EPSILON` not `1`, `Infinity/NaN/"bad"→0.5` not `0`, `-0.5→0` not `0.5`, `rg "displayRoll: rng()" ==0`)
- [ ] 40/40/20 via valid band holds (`rng 1 → last` via `safeRoll 1-EPSILON` not via fallthrough `scaled>=total`; `weights.test.ts` sum 1.0 ±1e-9)
- [ ] No re-roll loop and no duplicate clamp/midpoint (`safeRoll 1`, `normalizeDisplayRoll 3`, `Number.EPSILON 2`, `return 0.5 1`, `while rng 0`)
- [ ] Draw-budget preserved (`newGame 20`, `effective 3` even with malformed third draw, `noop 0`, `resolver 1`)
- [ ] `npx tsc --noEmit` clean for both `tsconfig.json` + `tsconfig.test.json` (no new `@ts-ignore` outside `rn-stub` ring)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness+ladder correctness+[0,1), single-guard maintainability, O(1) frame budget, draw-budget determinism)

---

## Mitigation Plans

### R-001: WeightedPicker malformed roll not clamped to valid band (Score: 6)

**Mitigation Strategy:** Pin clamp semantics as **explicit `safeRoll` not fallthrough**: (1) host unit `weightedPicker([1,0.5], rngOf(-0.5))===0` + `rngOf(1)===last` + `Infinity→last` + `1.5→last` + `NaN→last` + `0→0`; (2) scan `safeRoll` 1 + `Math.min(Math.max(roll,0),1-Number.EPSILON)` 1 + `1 - Number.EPSILON` 2 total; (3) pipeline `spawn.test.ts` pot band `0.99→3` via valid band stays green.

**Owner:** FE lead
**Timeline:** Immediate (gate this sweep; protects 40/40/20)
**Status:** Complete (code `weights.ts:29` clamp landed + `spawn.test.ts:22` green)
**Verification:** `npm --prefix triade test -- __tests__/engine/weights.test.ts` (9 pass) + `rg -n "safeRoll" triade/src/engine/core/weights.ts` ==1 + manual probe `Infinity→last` via valid band

### R-002: DisplayRoll NaN/Infinity/≥1 leak breaking [0,1) contract (Score: 6)

**Mitigation Strategy:** Enforce `[0,1)` at source via `normalizeDisplayRoll`: (1) host `newGame` `NaN→0.5` + `Infinity→0.5` + `"bad"→0.5` + `1→1-EPSILON` + `-0.5→0`; (2) `move effective` `rngOf(0,0.2,NaN)→0.5` etc.; (3) scan `normalizeDisplayRoll` 3 hits + `displayRoll: rng()` 0 hits + `return 0.5` 1 hit; (4) pipeline `previewFor` `0.5` midpoint still exact branch not range bias (neutral).

**Owner:** FE lead
**Timeline:** Immediate (gate DW-56 displayRoll half)
**Status:** Complete (`game.ts:8-18` function + `34,110` call sites landed; midpoint neutral chosen over `0`)
**Verification:** Manual probe `normalizeDisplayRoll` wall 14 asserts + `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass + `rg -n "normalizeDisplayRoll" game.ts` ==3

### R-003: Draw-budget drift via re-roll loop (Score: 6)

**Mitigation Strategy:** Keep 1-draw budget via clamp not loop: (1) `weights.ts` clamp consumes 1 `rng()` then clamp; (2) `normalizeDisplayRoll(rng())` consumes 1 then map; (3) host `spyRng` `newGame 20` + `effective with NaN 3` + `weightedPicker Infinity 1`; (4) scan `while.*rng ==0` + `rng()" weights.ts ==1` (single draw site).

**Owner:** FE lead
**Timeline:** Immediate (gate DW-56 budget preservation)
**Status:** Complete — no loop in `weights.ts:29` or `game.ts:8-18`; `helpers.rngOf` throw-on-exhaust intact
**Verification:** `spyRng` exact-length pins + `pending-spawn-contract.test.ts` `20/3/0/1` + `rg -n "while.*rng" triade/src/engine/core` ==0

---

## Assumptions and Dependencies

### Assumptions

1. Production `Rng` is well-behaved `[0,1)` via `Math.random` / `mulberry32(seed)` (`weights.test.ts` `mulberry32(0xc31)` etc.); malformed values are harness/fuzz/edge only (spec `trust-the-rng` class); guard paths are defensive-only for malformed injection.
2. Valid `PendingSpawn.displayRoll` is always `∈ [0,1)` (exclusive upper bound) per `types.ts` `PendingSpawn` JSDoc; `previewFor` uses `<0.6 exact` else `range` — `0.5` fallback lands in exact branch by design (neutral, not `0` skew).
3. `FIXED_WEIGHTS[1]=0.4, [2]=0.4, POT_WEIGHT=0.2` sum `1.0 ±1e-9` is exact (spec `Never: Change spawn weights/distribution`); `weightedPicker` re-normalizes but clamp guarantees `scaled < total` for `1→1-EPSILON` not fallthrough.
4. `GRID_SIZE=4` stays fixed; `MAX_POT_TIER=30` cap is the only ceiling cap (spec Design Notes: "Unbounded tier is intentional … Capping belongs in potForTier"); `Number.EPSILON ≈ 2.22e-16` is language-level, not NFR-invented.

### Dependencies

1. `triade/src/engine/core/spawn.ts:46-60` `pickIndex` NaN clamp 0 — required to prove full RNG seam never-throws; `git diff --stat -- triade/src/engine/core/spawn.ts` shows byte-identical (no change).
2. `triade/src/engine/core/types.ts:14-27` `Rng` draw-budget contract — required for P0 budget pins; `git diff --stat -- triade/src/engine/core/types.ts` shows byte-identical.
3. `triade/test-utils/helpers.ts:31-56` `rngOf`/`spyRng` Throw-on-exhaust — required for exact-length assertions; `git diff --stat -- triade/test-utils/helpers.ts` shows unchanged (no helper drift).
4. `triade/__tests__/engine/weights.test.ts:68-112` 9-case + `spawn.test.ts` 5-case + `game.test.ts` 32-case suites — required as P0/P1 baselines; `npm --prefix triade test -- __tests__/engine/weights.test.ts` must stay 9 pass before sweep lands clamp pins.

### Risks to Plan

- **Risk**: Manual probe `normalizeDisplayRoll(NaN)→0.5` not yet in `weights.test.ts`/`game.test.ts` (only working-tree `game.ts:14` + this plan's P0) — a follow-on that reverts to `displayRoll: rng()` would pass existing `game.test.ts` 32 but fail the probe.
  - **Impact**: `Infinity`/`NaN` preview leak hidden till `previewFor` misclassifies one move later (sanitizePending `0` fallback one move stale).
  - **Contingency**: Promote wall pin to committed `defensive-guards.atdd.test.ts` or `rng-trust.atdd.test.ts` if guard ever regresses; keep probe in this plan's P0 Smoke.

- **Risk**: `1 - Number.EPSILON` vs `1 - 1e-9` confusion on a follow-on perf micro-opt.
  - **Impact**: Top pot bucket off by `1e-9` vs `2e-16` (negligible but changes `[0,1)` exclusive proof).
  - **Contingency**: Keep scan `Number.EPSILON 2 hits total` and host `1→1-EPSILON` pin; any `1e-9` in `weights.ts`/`game.ts` is a fail.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for `weightedPicker clamp + normalizeDisplayRoll 0.5/0/EPSILON` (separate workflow; not auto-run) — recommend `rng-trust.atdd.test.ts` with `weights [1,0.5]` + `newGame` 20-draw + `move` effective 3-draw wall.
- Run `*automate` for broader coverage once P0 wall is committed (covers `adaptive-spawn-integration` 10k N sigma gates).
- Run `*nfr-assess` after implementation evidence exists to assign final PASS/CONCERNS/FAIL per NFR category (never-throw, [0,1) correctness, draw-budget).

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date}
- [ ] QA Lead: {name} Date: {date}

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **`spawn.ts` / `weights.ts` / `pot.ts` (spawn distribution `40/40/20`, pot ladder)** | `weights.ts` clamp feeds `potWeights→normalizeTo→weightedPicker→pickCombined→resolveSpawn`; change preserves 1-draw contract and 40/40/20 `sum 1.0 ±1e-9` | `spawn.test.ts` 5-case + `weights.test.ts` 9-case + `pot.test.ts` 8-tier ladder + `adaptive-spawn-integration` 5 suites must pass |
| **`game.ts` `newGame`/`move`/`sanitizePending` (snapshot `PendingSpawn`, ADR-06)** | `normalizeDisplayRoll` feeds `pendingSpawn.displayRoll` for every `newGame` 20-draw and `effective move` 3-draw; `sanitizePending` still `dr>=0&&dr<1?dr:0` one move later but source now never produces `NaN` | `game.test.ts` 32 pass + `pending-spawn-contract.test.ts` `N3` + `board.test.ts` + `line.test.ts` |
| **`previewFor` / `Hud.tsx` preview card (Epic 7 `60/40`, ambiguous band)** | `displayRoll` drives `previewFor` `<0.6 exact` else `range`; `0.5` fallback stays in exact branch neutral, `1-EPSILON` stays in range branch valid | `preview-pot-ladder-hygiene` 60/40 ladder + `hud-preview-hardening` 60/40 still green |
| **`triade/test-utils/helpers.ts` `rngOf`/`spyRng`** | Throw-on-exhaust + exact draw-count pins enforce 1-draw budget; sweep must not add re-roll loop | `helpers` still `rngOf exhausted after N` throw; `spyRng` `calls.length 3/20` pins in `pending-spawn-contract` |
| **CI `tsc` + `npm test` gate** | Both `tsconfig.json` + `tsconfig.test.json` + `full npm test` gate `<15 min` must stay clean/green | `npx tsc --noEmit` (both) + `npm --prefix triade test` 180+ pass |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization
- `nfr-criteria.md` - NFR thresholds and planned evidence

### Related Documents

- Spec: `triade/src/engine/core/game.ts:8-18` + `triade/src/engine/core/weights.ts:20-37` (working-tree DW-56 delta)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` DW-56 `done 2026-09-02 resolution-undo 0eb6ce61…`
- Draw-budget contract: `triade/src/engine/core/types.ts:14-27` (`newGame 20 / effective 3 / noop 0 / resolver 1`)
- Helpers: `triade/test-utils/helpers.ts:31-56` (`rngOf`/`spyRng` throw-on-exhaust)
- Prior sweep template: `_bmad-output/test-artifacts/test-design-dw-engine-ceiling-hardening.md` (structure reused)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Execution Mode**: sequential (auto fallback — no subagent/team capability probe in this runner)
**Capability Probe**: `tea_capability_probe: true` → `supports.subagent false, agentTeam false` → `sequential`
