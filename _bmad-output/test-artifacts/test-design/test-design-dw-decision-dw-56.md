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
  - '_bmad-output/implementation-artifacts/spec-decision-dw-56-clamp-roll-and-fallback-displayroll.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad/tea/config.yaml'
---

# Test Design: dw-decision-dw-56 — Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — decision deep-dive for `dw-decision-dw-56`
**Scope:** Targeted test design for the working-tree delta of `dw-decision-dw-56` (decision: `Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback`)
**Decision date:** 2026-09-02 — `spec-decision-dw-56-clamp-roll-and-fallback-displayroll.md`

> **Delta under assessment:** Hardening of the engine RNG trust boundary for DW-56 vs baseline `30ebd2f` (HEAD). Working-tree `git diff HEAD --stat` is **empty** — the hardening already landed at HEAD via sweep `dw-engine-rng-trust-hardening` (30ebd2f). This design therefore assesses the committed delta retrospectively as the decision's verification plan:
> - `triade/src/engine/core/weights.ts:20-37` — `weightedPicker` gains deterministic clamp: `safeRoll = Math.min(Math.max(roll, 0), 1 - Number.EPSILON)` then `scaled = safeRoll * total` (was `roll * total` with only `NaN` early-return to last index, relying on fallthrough for `>=1`/`Infinity`/negative). Comment documents DW-56: `<0 → 0` (first band), `>=1` including `Infinity` → `1 - EPSILON` (top pot slot via valid band, `scaled < total`), `NaN` already degraded to last index via existing `typeof !== 'number' || NaN` guard per AC5 engine-never-throws.
> - `triade/src/engine/core/game.ts:8-18,34,110` — new `normalizeDisplayRoll(raw: unknown): number` + two call sites `newGame` and `move` effective path: `if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0.5` (NaN/Infinity/non-number → midpoint, not 0, to keep Epic 7 preview distribution neutral), `if (raw < 0) return 0`, `if (raw >= 1) return 1 - Number.EPSILON`, else `return raw`. Preserves 1-draw budget (no re-roll). Contract: `PendingSpawn.displayRoll ∈ [0,1)` always, even with malformed third draw.
> - `triade/src/engine/core/spawn.ts:46-60` unchanged — `pickIndex` already guards `!Number.isFinite(idx) → 0`, `<0 → 0`, `>=len → len-1` (engine-never-throws); kept as reference for DATA chain.
> - `triade/src/engine/core/types.ts:1-30` unchanged — `Rng = () => number`, `PendingSpawn { value: number, displayRoll: number }`, draw-budget contract `newGame 20 (9 cells + 9 values + 1 pending value + 1 displayRoll) / effective 3 (cell, next value, next displayRoll) / noop 0 / resolveSpawn 1` pinned in JSDoc.
> - Ledger `_bmad-output/implementation-artifacts/deferred-work.md` DW-56 `open → done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-rng-trust-hardening` + `resolution-undo: 0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e`.

---

## Executive Summary

**Scope:** Harden the engine RNG trust boundary at two sites: (1) `weights.weightedPicker` roll clamping for the combined `40/40/20` distribution (`pickCombined` → `weightedPicker`) and (2) `game.normalizeDisplayRoll` for Epic 7 preview's third draw `PendingSpawn.displayRoll`. Before the fix a `roll >= 1` (e.g. `1`, `1.5`, `Infinity`) collapsed deterministically to the top pot slot only via fallthrough (`scaled >= total` → loop never hits `scaled < acc` → `return weights.length - 1`), indistinguishable from the intentional NaN-to-last degradation and not via a valid band; a negative roll mapped to first band only by accident (`scaled < acc` on first iteration) — not clamped explicitly; and a `NaN`/`Infinity`/`non-number` third draw was copied unvalidated into `pendingSpawn.displayRoll`, breaking the documented `[0,1)` contract silently ( `previewFor` `N3` 60/40 misclassifies, HUD preview shows wrong bucket). Production blast radius is low on well-behaved `Math.random`/`mulberry32` (always `[0,1)`), but the seam is load-bearing for correctness: a fuzzed/custom RNG, a `rngOf` mis-wire, or a future deterministic replay that replays out-of-range values would violate distribution neutrality and preview contract.

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (≥6): 3
- Critical categories: TECH (weightedPicker roll clamp vs fallthrough, displayRoll [0,1) contract, draw-budget preservation), DATA (PendingSpawn → previewFor → HUD pipeline), BUS (spawn 40/40/20 distribution integrity)

**Coverage Summary:**

- P0 scenarios: 9 groups (38 checks: weightedPicker clamp + normalizeDisplayRoll + draw-budget)
- P1 scenarios: 6 groups (19 checks: engine pipeline `resolveSpawn`/`weightedValue`/`game.move`/`newGame` + spawn/weights + preview chain)
- P2/P3 scenarios: 8 groups (static scans + bench + exploratory)
- **Total effort**: ~4.0–7.0 hours (~0.5–0.9 days; host-only, no device lane — pure engine TS, `npm test` + `tsc` gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score rules `canMerge(1+2→3, >=3 equal)` / `mergeValue` / merge-once cascade, `shiftLine`/`movementLines`/`boardFromLines` wall-scan, `board.ts` occupancy, `ceilingDetector`/`tierForCeiling` guards (DW-41..45), `spawnTile` candidate validation (DW-72/73), `GameBoard` gate/tilesRef, `transitionPlan` classify** | `git diff 30ebd2f -- triade/src/engine` between baseline and HEAD shows only `game.ts` + `weights.ts` changed; `spawn.ts`/`ceiling.ts`/`pot.ts`/`line.ts`/`board.ts`/`rules.ts`/`types.ts`/`spawnConfig.ts` byte-identical. | Engine invariants stay gated by `triade/__tests__/engine/*.test.ts` (~180+ cases) + `npm --prefix triade test` full gate `<15 min` + `tsc` clean as gate. |
| **Changing `Rng` signature to `(seed: number) => number` or re-rolling on malformed values** | Draw-budget contract `newGame 20 / effective 3 / noop 0 / resolver 1` is fixed per `types.ts:14-27` and `helpers.rngOf`/`spyRng` throw-on-exhaust. A re-roll loop would add 1+ draws per malformed value, desyncing `mulberry32` sequences. | This plan pins 1-draw budget: `weightedPicker` clamp consumes exactly 1 draw, `normalizeDisplayRoll` consumes exactly 1 draw (no loop). `spyRng` exact-length assertions enforce it. |
| **Changing `PendingSpawn` shape or `displayRoll` semantics (`<0.6 exact` / `>=0.6 range` ambiguous band, `previewFor` 60/40)** | `PendingSpawn { value, displayRoll }` is ADR-06 snapshot-owned; `displayRoll` semantics are Epic 7 `previewFor` / `Hud` preview card, not this decision. | `previewFor` 60/40 remains gated by `preview-pot-ladder-hygiene` 60/40; `normalizeDisplayRoll` only ensures `displayRoll ∈ [0,1)` so existing branching stays valid. |
| **Capping or re-weighting the 40/40/20 ladder (`FIXED_WEIGHTS`, `POT_WEIGHT`, `POT_CURVE`, `potWeights`, `normalizeTo`)** | Weights ladder is frozen per `spawnConfig.ts` `FIXED_WEIGHTS[1]=0.4, [2]=0.4` + `POT_WEIGHT=0.2` sum 1.0 ±1e-9 (spec `Never: Change spawn weights`). | `spawn.test.ts` sum 1.0 pin + `weights.test.ts` halving matrix stay gate. |
| **RevenueCat / AdMob / IAP / Epic 9-11 a11y, offline/persistence, HUD layout** | No monetization/a11y code touched. | Existing suites remain gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `weightedPicker(weights, rng)` and `normalizeDisplayRoll(raw)` are pure with no `expo-*`/`Skia`/`RNGH` state; `game.newGame(rng)` / `game.move(state, dir, rng)` are pure with injected `Rng`. Every path is host-testable via `node --import tsx --test` with `rngOf(0, 0.5, 1, Infinity, NaN, -0.5, 1.5)` + `weights [1,0.5]` + `emptyBoard()`/`staticBoard`/`gameState` + `spyRng` draw-count.

**Observability — Good.** Outputs are deterministic numerics/booleans: `weightedPicker` index `0..n-1` via `scaled < acc`, `normalizeDisplayRoll` `0..1-EPSILON` or `0.5` midpoint, `pendingSpawn.displayRoll` `[0,1)` invariant. Malformed clamp observable as `weightedPicker([1,0.5], () => -1) === 0` and `() => Infinity → last` via valid band, `normalizeDisplayRoll(NaN) === 0.5`.

**Reliability — Strong (engine never throws).** `weightedPicker` guards `typeof roll !== 'number' || NaN → last` + new `clamp [0,1-EPSILON]` eliminates `scaled >= total` fallthrough ambiguity; `normalizeDisplayRoll` guards `!Number.isFinite` + `unknown` → `0.5` before `<0`/`>=1` clamps. Both `tsc` gates clean.

**Testability Risks:** (a) `weightedPicker` `NaN` guard vs clamp ordering — removing `NaN → last` would re-leak `NaN` scaled path; (b) `normalizeDisplayRoll` `>=1` vs `>1` threshold — a `>1` would let `1.0` leak as `1` violating `[0,1)` exclusive.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **WeightedPicker malformed roll ≥1/Infinity/negative not clamped to valid band — fallthrough vs explicit band confusion.** Before fix `roll >=1` produced `scaled >= total` → fallthrough to last (same value as NaN path but via invalid scaled). Negative produced `scaled <0` → first band by accident. A revert removing `safeRoll = clamp(roll, 0, 1-EPSILON)` re-exposes fallthrough and makes `1.0` map via invalid band. | 2 | 3 | **6** | Pin clamp: (a) host P0 `weightedPicker([1,0.5], rngOf(1)) === last` + `Infinity→last` + `-0.5→0`; (b) static scan `safeRoll` 2 + `Math.min(Math.max(roll` 1 + `1 - Number.EPSILON` 1 in weights.ts; (c) pipeline `weightedValue(rngOf(1))→last` via valid band. | FE lead | Immediate (gate DW-56 picker half) |
| R-002 | DATA | **DisplayRoll NaN/Infinity/non-number/≥1 copied unvalidated into `PendingSpawn.displayRoll` breaking `[0,1)` contract → Epic 7 preview misclassifies.** Before fix `displayRoll: rng()` stored `NaN`, `Infinity`, `1` outside `[0,1)`. Downstream `previewFor` `<0.6` mis-branches. | 2 | 3 | **6** | Enforce `[0,1)` at source: (a) host P0 `newGame(rngOf(9×0,9×0,0.1,NaN))→0.5` + `move effective rngOf(0,0.2,NaN)→0.5` + `1→1-EPSILON`; (b) scan `normalizeDisplayRoll` 3 hits + `displayRoll: rng()` 0 hits; (c) pipeline `previewFor` 60/40 green after `0.5` midpoint. | FE lead | Immediate (gate DW-56 displayRoll half) |
| R-003 | TECH | **Draw-budget drift — normalization or clamp introduces extra rng consumption (re-roll loop).** Contract `newGame 20 / effective 3 / noop 0`. A `while(!isFinite) roll=rng()` would add draws, desyncing `mulberry32` and `rngOf` throw-on-exhaust. | 2 | 3 | **6** | Pin 1-draw budget: (a) host P0 `spyRng` exact-length `newGame 20`, `effective with NaN still 3`; (b) scan `rng()` 1 hit in weights.ts + `while.*rng` 0 hits; (c) pipeline `pending-spawn-contract` 20/3/0 stays green. | FE lead | Immediate (gate DW-56 budget preservation) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Epsilon off-by-one — `1 - Number.EPSILON` vs `1 - 1e-9` vs `1` exclusive.** `Number.EPSILON ≈2.22e-16` is largest `<1` double; `1-1e-9` biases top pot bucket, `>=1→1` violates `[0,1)` exclusive. | 2 | 2 | 4 | Pin epsilon: host `normalizeDisplayRoll(1)===1-EPSILON` + `1.5→1-EPSILON`; scan `Number.EPSILON` 1 per file total 2. |
| R-005 | BUS | **Midpoint neutrality — `NaN/Infinity/non-number → 0.5` vs `0` bias.** `displayRoll` drives `previewFor` 60/40 (`<0.6 exact` else `range`); `0` always exact branch, skewing preview. `0.5` is midpoint → exact branch centrally, neutral. | 2 | 2 | 4 | Pin midpoint: host `normalizeDisplayRoll(NaN)===0.5` + `undefined→0.5`; scan `return 0.5` in game.ts 1 hit. |
| R-006 | TECH | **NaN guard ordering — `weightedPicker` keeps both `NaN→last` early-return and `clamp [0,1-EPSILON]`; clamp alone maps NaN to NaN scaled still falling through to last but via ambiguous path.** | 1 | 3 | 3 | Pin both guards: host `weightedPicker([1,1],()=>NaN)===1` + `undefined→1`; scan `typeof roll !== 'number'` 1 + `Number.isNaN(roll)` 1 + `safeRoll` 2. |
| R-007 | DATA | **DisplayRoll finite-negative clamp `→0` vs midpoint `0.5` distinction — negatives are clampable not midpoint.** Finite `raw<0 →0` (edge), non-finite →0.5. Confusing maps `-0.5→0.5` losing deterministic edge. | 1 | 3 | 3 | Pin split: host `-0.5→0` + `-Infinity→0.5`; scan `if (raw < 0) return 0` 1 hit not `0.5`. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | PERF | **Guard cost — `normalizeDisplayRoll` 2 branches + `weightedPicker` clamp 2 Math calls per effective move / newGame `<0.01 ms` vs frame `<8 ms`.** | 1 | 1 | 1 | Monitor — `npm --prefix triade test` gate `<15 min` sufficient. |
| R-009 | OPS | **Deferred-ledger `resolution-undo` hash coupling + `sprint-status.yaml` ownership.** Ledger DW-56 `done` with `resolution-undo: 0eb6ce61…`; `sprint-status.yaml` orchestrator-owned must not be written by this workflow. | 1 | 2 | 2 | Monitor — ledger already `resolution-undo: 0eb6ce61…`; any reopen keeps hash. `git diff --stat` shows `deferred-work.md` + `game.ts`/`weights.ts` but NOT `sprint-status.yaml`. |

### Risk Category Legend

- **TECH**: Technical/Architecture (roll clamp vs fallthrough, epsilon, draw-budget loop avoidance, displayRoll finite vs non-finite split)
- **SEC**: Security — none this decision (pure engine math, no auth/data exposure)
- **PERF**: Performance — `isFinite` + `Math.min/Math.max` O(1) (R-008)
- **DATA**: Data Integrity — `PendingSpawn.displayRoll ∈ [0,1)` → `previewFor` → HUD (R-002, R-007)
- **BUS**: Business Impact — spawn distribution 40/40/20 via `weightedPicker` (R-005)
- **OPS**: Operations (ledger `resolution-undo`, `sprint-status.yaml` ownership)

---

## NFR Planning

**Purpose:** Capture decision-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw + finiteness | `weightedPicker` never throws on any `roll` including `NaN/Infinity/neg/≥1/non-number`; `normalizeDisplayRoll` never throws on any `raw` including `undefined/null/"bad"/{}`; every `pendingSpawn.displayRoll` finite `∈ [0,1)` and `value` finite `>0`; `move`/`newGame` never throw on malformed RNG. | R-001, R-002, R-006 | Host unit negative-path sweep: `weightedPicker([1,0.5], rngOf(Infinity))→last` + `NaN→last` + `normalizeDisplayRoll(NaN)→0.5` + `move effective with NaN third draw → displayRoll 0.5` — plus `spawn.test.ts` NaN clamp. | `weights.test.ts` + `game.test.ts` + `spawn.test.ts` green + manual probe wall + both `tsc` clean |
| Maintainability | Single `safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON)` in `weights.ts`; single `normalizeDisplayRoll(raw: unknown)` in `game.ts` with 3 branches; single weight literal `1 - Number.EPSILON` per file (2 total); single midpoint `return 0.5`; ledger `resolution-undo` 64-hex per DW-56; no duplicate `displayRoll: rng()` bare site, no re-roll loop. | R-001, R-004, R-005, R-009 | Static scans: `rg -n "safeRoll" weights.ts` 2, `rg -n "normalizeDisplayRoll" game.ts` 3, `rg -n "displayRoll: rng\(\)" game.ts` 0, `rg -n "while.*rng" engine/core` 0. | Source scans + `weights.ts:29` + `game.ts:8-18` diff + ledger diff |
| Correctness — 40/40/20 + [0,1) + epsilon | Ladder `FIXED_WEIGHTS[1]=0.4, [2]=0.4, POT_WEIGHT=0.2 sum 1.0 ±1e-9`; `weightedPicker` `0→first`, `1/Infinity→last`, `NaN→last`; `displayRoll` `NaN→0.5`, `-0.5→0`, `1→1-EPSILON`; epsilon `Number.EPSILON` exact. | R-001, R-004, R-005, R-007 | Host ladder `weights.test.ts` 40/40/20 + `weightedPicker([1,0.5], rngOf(0))→0` + `0.99→last` + wall 9 probes + `previewFor` 60/40. | `weights.test.ts` + `spawn.test.ts` + `preview-pot-ladder-hygiene` 60/40 |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn`, frame worst `<8 ms`, device `p99 <16.7 ms`. Guards add ≤2 `Math.min/max` + 2 branches per `move()` — `<0.01 ms`. No loop. | R-008 | Host gate only: `npm --prefix triade test` median `<0.01 ms`; `feel.bench` both-profile unchanged. | CI `npm test` timing + both `tsc` clean |
| Draw-budget determinism | `Rng` draw contract `newGame 20 / effective 3 / noop 0 / resolver 1` preserved even with malformed rolls; every `weightedPicker` 1 draw, every `normalizeDisplayRoll(rng())` 1 draw, no re-roll. | R-003 | Host `spyRng` exact-length `newGame 20` + `move effective with malformed NaN still 3` + `pending-spawn-contract` N3 pin. | `game.test.ts` 32 pass + `pending-spawn-contract.test.ts` + `helpers.ts` |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (pure TS). | — | `npm --prefix triade test` offline still green. | Manual offline device lane not needed (no native module). |

**Unknown thresholds:** None material. Guard cost `<0.01 ms` is observed; `0.5` midpoint is design choice documented here (neutral preview, not PRD-invented). `Number.EPSILON` is language-level.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (DW-56 ledger reason + decision `Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback` signed; `weights.ts:29` + `game.ts:8-18` intent reviewed)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsx` + `tsconfig.test.json` + `helpers.ts` `emptyBoard`/`boardWith`/`gameState`/`rngOf`/`spyRng`/`mulberry32`)
- [ ] Test data available or factories ready (`emptyBoard`/`staticBoard([1,2,null,null])`/`boardWith` 4×4 + `rngOf(NaN, Infinity, -0.5, 0, 0.5, 1, 1.5)` wall + `weights [1,0.5]` / `FIXED 0.4/0.4/0.2 + pot` / `pendingSpawn {value, displayRoll}` + `GRID_SIZE=4`)
- [ ] Feature deployed to test environment (HEAD `30ebd2f` already contains `game.ts` 16-line `normalizeDisplayRoll` + `weights.ts` 7-line `safeRoll` clamp; working-tree `git diff HEAD` is empty — assessment retrospective)
- [ ] No ceiling/line/spawn/feel/layout edits (`git diff 30ebd2f -- triade/src/engine -- triade/src/feel triade/src/ui` shows `game.ts`+`weights.ts` only) and `sprint-status.yaml` not written by this workflow (orchestrator-owned)

## Exit Criteria

- [ ] All P0 tests passing (`weightedPicker` negative/≥1/Infinity/NaN clamp + `normalizeDisplayRoll` wall + draw-budget 20/3/0/1)
- [ ] All P1 tests passing (or failures triaged with waivers) — `game.test.ts` 32 pass + `weights`/`spawn`/`pot`/`adaptive-spawn` + `pending-spawn-contract` + `preview` 60/40 chain green
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigations green or waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on RNG trust seam; `rg` allowlists for single `safeRoll`/`normalizeDisplayRoll`/`Number.EPSILON`/`return 0.5` green)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns RNG trust P0 clamp + displayRoll [0,1) + draw-budget pins, pipeline gates, ledger `resolution-undo` verification |
| FE lead | Dev Lead | Owns `weights.ts` `safeRoll` clamp vs fallthrough, `game.ts` `normalizeDisplayRoll` branches, epsilon, 1-draw preservation |
| PM | PM | Signs midpoint `0.5` neutral (not 0 bias) + clamp 0 vs 0.5 split + `[0,1)` contract |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, mostly landed

**Criteria**: Blocks RNG trust bypass (negative/≥1/NaN leak) or displayRoll [0,1) break + high risk (≥6) + no workaround (RNG is spawn-seed for every move/newGame)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `weightedPicker` negative clamp: `weights [1,0.5]` `rngOf(-0.5)→0`, `rngOf(-Infinity)→0`, `rngOf(-1)→0` (first band, not fallthrough) | Unit | R-001 | 3 | QA | `safeRoll = max(roll,0)` before `min(...,1-EPSILON)`. |
| AC — `weightedPicker` ≥1/Infinity clamp: `rngOf(1)→last`, `rngOf(1.5)→last`, `rngOf(Infinity)→last` via valid band `1-EPSILON` | Unit | R-001 | 3 | QA | `Math.min(...,1-EPSILON)` guarantees `scaled < total`. |
| AC — `weightedPicker` NaN/non-number guard still last: `() => NaN → last`, `() => undefined as any → last`, `() => "0.5" as any → last` | Unit | R-001, R-006 | 3 | QA | Early `typeof !== 'number' || NaN` before clamp. |
| AC — `normalizeDisplayRoll` non-finite/non-number → 0.5 midpoint: `NaN→0.5`, `Infinity→0.5`, `-Infinity→0.5`, `undefined→0.5`, `null→0.5`, `"0.5"→0.5`, `{}→0.5` | Unit | R-002, R-005 | 7 | QA | `if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0.5`. |
| AC — `normalizeDisplayRoll` finite clamp: `-0.5→0`, `-1→0`, `0→0`, `0.5→0.5`, `0.999→0.999`, `1→1-EPSILON`, `1.5→1-EPSILON` | Unit | R-002, R-004, R-007 | 7 | QA | `if (raw <0) return 0`, `if (raw >=1) return 1-EPSILON` — strict `>=1`. |
| AC — `newGame` malformed third draw still valid: `rngOf(9×0, 9×0, 0.1, NaN)→pendingSpawn.displayRoll===0.5` + `Infinity→0.5` + `1→1-EPSILON` | Unit (game) | R-002 | 4 | QA | `newGame` call site `normalizeDisplayRoll(rng())` pinned via `spyRng` 20-draw. |
| AC — `move` effective malformed third draw still valid: `gameState(staticBoard([1,2,null,null]))` + `rngOf(0, 0.2, NaN)→0.5` + `rngOf(0, 0.2, Infinity)→0.5` + `rngOf(0, 0.2, 1)→1-EPSILON` + `rngOf(0, 0.2, -0.5)→0` | Unit (game) | R-002, R-007 | 4 | QA | Effective `3-draw` budget preserved; third draw is displayRoll. |
| AC — Draw-budget preserved (no re-roll): `weightedPicker([1,0.5], spyRng(Infinity)) calls.length===1`, `newGame with malformed still 20`, `effective move with malformed displayRoll still 3` | Unit | R-003 | 5 | QA | `rg "while.*rng" ==0` + `rng()` 1 hit per file. |
| AC — Bare site eliminated: `rg -n "displayRoll: rng\(\)" game.ts ==0` and `rg -n "const scaled = roll" weights.ts ==0` | Static scan | R-001, R-002 | 2 | QA | No bare `rng()` displayRoll or bare `roll*total` scaled. |

**Total P0**: 38 checks, `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & wall pipeline

**Criteria**: Important RNG→spawn→preview pipeline + medium/high risk + common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Engine→spawn pipeline: `resolveSpawn` single-roll `FIXED 40/40 + POT 0.2` via `weightedPicker` with clamp still green; `weightedValue(rngOf(0.99))→last` via valid band | Integration (engine→spawn) | R-001 | 2 | QA | `spawn.test.ts` 5-case + `weights.test.ts` 40/40 stay gate. |
| `weights.test.ts` defensive: `NaN → last` + `[0,0] → last` + `[] → 0` + `0.99 → last` + `2/3±1e-6` still green after clamp | Unit | R-001, R-006 | 5 | QA | 5 pins — ensures clamp did not break NaN degrade. |
| `game.move` 4 suites: `HAPPY_PATH/CASCADE/ONE_CELL` + `newGame 20-draw`/`effective 3-draw`/`noop 0-draw` + `trace` spawned + `isGameOver` | Integration (game) | R-002, R-003 | 4 | QA | `game.test.ts` 32 pass — `normalizeDisplayRoll` feeds `pendingSpawn.displayRoll`. |
| `pending-spawn-contract.test.ts` N3 pipeline: `preSpawnBoardOf`/`runSeededSession` 200-move sweep still green — guarded `displayRoll` never leaks `NaN/Infinity/≥1` into `previewFor` | Integration (engine) | R-002, R-003 | 2 | QA | `helpers.preSpawnBoardOf` + `runSeededSession` N3 pin. |
| `adaptive-spawn-integration` 5 suites: `AC7 distribution 10k N`, `pot-by-ceiling`, `tier-0 exception`, `ceiling ordering`, `N3` still green | Integration (engine) | R-001, R-003 | 5 | QA | Proves clamp did not shift 40/40/20 aggregate. |
| Ledger `deferred-work.md` DW-56 `done` with `resolution-undo` 64-hex, `sprint-status.yaml` untouched | Static | R-009 | 1 | QA | `rg -n "status: done 2026-09-02" deferred-work.md` hit with `resolution-undo: 0eb6ce61…`; `git diff --stat` shows deferred-work but not sprint-status. |

**Total P1**: 19 checks, ~1.0–1.9 h host

### P2 (Medium) — Secondary flows + low/medium risk

**Criteria**: Secondary helper edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-clamp / single-normalize / single-epsilon / single-midpoint allowlists — `rg -n "safeRoll" weights.ts ==2`, `rg -n "normalizeDisplayRoll" game.ts ==3`, `rg -n "Number\.EPSILON" game.ts ==1` + `weights.ts ==1` total 2, `rg -n "return 0\.5" game.ts ==1` | Static scan | R-001, R-004, R-005 | 1 | QA | Any duplicate `safeRoll` or second `return 0.5` is fail. |
| No bare scale / no bare displayRoll / no re-roll loop — `rg -n "const scaled = roll \* total" weights.ts ==0`, `rg -n "displayRoll: rng\(\)" game.ts ==0`, `rg -n "while.*rng" -- ==0` | Static scan | R-001, R-002, R-003 | 1 | QA | Ensures `safeRoll * total` is sole scaled site. |
| Epsilon exactness + midpoint neutrality coupling — `rg -n "1 - Number\.EPSILON" game.ts ==1` + `weights.ts ==1` (no `1 - 1e-9`); `rg -n "return 0\.5" weights.ts ==0` | Static scan | R-004, R-005, R-006 | 1 | QA | Keeps two NaN strategies distinct: picker NaN→last, displayRoll NaN→0.5. |
| Board `pendingSpawn` `displayRoll` window strict `[0,1)` — `rg -n "dr >= 0 && dr < 1" game.ts` 1 hit in `sanitizePending` + `rg -n "raw >= 1" game.ts` 1 hit (strict `>=1` not `>1`) | Static scan | R-002, R-007 | 1 | QA | Ensures `1.0` is clamped not kept. |

**Total P2**: 4 checks, ~0.4–0.8 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — malformed sequence sweep: `newGame(rngOf(9×0, 9×0, NaN, NaN))` still valid 20-draw + `pendingSpawn.displayRoll 0.5` then `move` effective `rngOf(Infinity, NaN, -0.5)` still 3-draw and next `displayRoll 0` (finite-negative) vs `rngOf(Infinity, Infinity, 1.5)` next `1-EPSILON` | Unit | 1 | QA | No-throw + finite `[0,1)` + 3-draw; if hit, file DW for malformed seed import path. |
| Micro-zero — `weightedPicker([1,0.5], rngOf(0))→0` + `rngOf(0.39)→0` + `rngOf(0.4)→1` + `normalizeDisplayRoll(0)→0` + `0.599→0.599` + `0.6→0.6` complements 40/40 boundary `0.4±1e-6` | Unit | 1 | DEV | Already `weights.test.ts:68` 0.4 boundary + `0.99→last`. |
| No-leak ladder bench — `weightedPicker` 10k × `[0.4,0.4, ...pot]` random malformed injection (10% `NaN/Infinity/1.5/-0.5`) median `<0.05 ms` + `normalizeDisplayRoll` 10k median `<0.01 ms` (clamp O(1), no bench lane) | Unit (bench) | 1 | DEV | Engine `<2 ms/turn`, frame worst `<8 ms`; guard adds `<0.01 ms`. |
| Cross-cutting negative scan — `rg -n "Music\|bgm\|RevenueCat\|AdMob" triade/src/engine --include="*.ts"` empty (sweep stayed in scope) | Static scan | 1 | QA | Trivial hygiene — proves sweep stayed in scope. |

**Total P3**: 4 checks, ~0.2–0.4 h host

---

## Execution Order

> Keep execution simple: PR / Nightly / Weekly — do not re-list all tests (refer to coverage plan). Philosophy: run everything in PRs if `<15 min`; defer only if expensive/long-running.

- **PR (<15 min):** All functional checks — `npm --prefix triade test` full gate (host unit + integration) + both `tsc --noEmit` + `rg` allowlist scans (`safeRoll`, `normalizeDisplayRoll`, `Number.EPSILON`, `return 0.5`, `while.*rng`, `displayRoll: rng()`, `resolution-undo`). Playwright parallelization covers 100s of tests in 10–15 min. This is sufficient for DW-56 — pure engine TS, no device lane, no `k6` perf, no nightly chaos needed.
- **Nightly/Weekly:** None required for this decision (no `k6` performance, no chaos, no long-running 4+ h suites). If future `feel.bench` both-profile bench is added, run nightly; otherwise gate stays PR-only.
- **No redundancy:** Do not re-list all P0/P1 checks here; coverage plan is the source of truth.

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 38 | ~0.08 | ~2.0–3.0 | Pure `weights.ts` clamp + `game.ts` `normalizeDisplayRoll` wall + `newGame`/`move` malformed pins + draw-budget + bare-site scans — mostly host `rngOf`/`spyRng` O(1) |
| P1 | 19 | ~0.12 | ~1.4–2.8 | Existing `weights.test.ts:9` + `spawn:5` + `game:32` + `adaptive-spawn:5` + `pending-spawn-contract:2` + ledger 1-hit (mostly existing suites) |
| P2 | 4 | ~0.15 | ~0.4–0.8 | Static allowlists + epsilon/midpoint coupling + `while rng` 0-hit + window strict |
| P3 | 4 | ~0.10 | ~0.2–0.4 | Malformed sequence exploratory + micro-bench + cross-cutting scan |
| **Total** | **65** | **-** | **~4.0–7.0** | **~0.5–0.9 days host; full gate `<15 min` (`npm test` + `tsc` + `rg`) — no device bench lane required** |

> For gate reporting, collapse to `~3.0–5.6 h` without P3 exploratory (keep P3 optional).

### Prerequisites

**Test Data:**

- `emptyBoard`/`staticBoard([1,2,null,null])`/`boardWith` 4×4 16-cell + scalar wall `[-0.5, 0, 0.5, 1, 1.5, Infinity, -Infinity, NaN, undefined, null, "0.5", {}]` + `weights [1,0.5]` / `FIXED 0.4/0.4/0.2 + pot` / `pendingSpawn {value, displayRoll}` + `GRID_SIZE=4`
- `rngOf` / `spyRng` exact-length Throw-on-exhaust (`triade/test-utils/helpers.ts:31-56`) + `mulberry32(seed)` + `stateFromResult`/`preSpawnBoardOf`/`runSeededSession`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json`
- `rg` (ripgrep) for allowlist scans (`safeRoll`, `normalizeDisplayRoll`, `Number.EPSILON`, `return 0.5`, `displayRoll: rng()`, `while.*rng`, `1 - Number.EPSILON`, `resolution-undo`)
- `npm --prefix triade exec -- tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — engine pure TS)
- Baseline `30ebd2f` + HEAD already contains `game.ts` `normalizeDisplayRoll` + `weights.ts` `safeRoll` + ledger DW-56 `0eb6ce61…`; working tree clean

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — negative/≥1/Infinity/NaN clamp + displayRoll [0,1) + draw-budget 20/3)
- **P1 pass rate**: ≥95% (waivers required for failures — e.g. `adaptive-spawn-integration` statistical `N=10k` 5σ tripwire may be `WAIVED` only with seed reason)
- **P2/P3 pass rate**: ≥90% (informational; static allowlists must be 100%)
- **High-risk mitigations**: 100% complete or approved waivers with owner + expiry (R-001..R-003)

### Coverage Targets

- **Critical paths**: ≥90% (RNG trust seam: `weightedPicker` 3 malformed classes + `normalizeDisplayRoll` 4 branches + draw-budget)
- **RNG trust seam scenarios**: 100% (`-0.5→0`, `1→1-EPSILON`, `Infinity→last`, `NaN→0.5`/`last` split must be PINNED)
- **Business logic** (`weightedPicker` clamp + `normalizeDisplayRoll` 0.5/0/EPSILON + `move`/`newGame` displayRoll): ≥85%
- **Edge cases** (empty weights `[]→0`, `[0,0]→last`, `sanitizePending` `dr>=0&&dr<1`, `1.0` exclusive): ≥80%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (38 checks)
- [ ] No high-risk (≥6) items unmitigated (R-001..R-003 green or waived with owner+expiry)
- [ ] `[0,1)` invariant holds (`1.0 → 1-EPSILON` not `1`, `Infinity/NaN/"bad"→0.5` not `0`, `-0.5→0` not `0.5`, `rg "displayRoll: rng()" ==0`)
- [ ] 40/40/20 via valid band holds (`rng 1 → last` via `safeRoll 1-EPSILON` not via fallthrough; `weights.test.ts` sum 1.0 ±1e-9)
- [ ] No re-roll loop and no duplicate clamp/midpoint (`safeRoll 1`, `normalizeDisplayRoll 3`, `Number.EPSILON 2`, `return 0.5 1`, `while rng 0`)
- [ ] Draw-budget preserved (`newGame 20`, `effective 3` even with malformed third draw, `noop 0`, `resolver 1`)
- [ ] `npx tsc --noEmit` clean for both `tsconfig.json` + `tsconfig.test.json`
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers

---

## Mitigation Plans

### R-001: WeightedPicker malformed roll not clamped to valid band (Score: 6)

**Mitigation Strategy:** Pin clamp semantics as explicit `safeRoll` not fallthrough: (1) host unit `weightedPicker([1,0.5], rngOf(-0.5))===0` + `rngOf(1)===last` + `Infinity→last` + `NaN→last` + `0→0`; (2) scan `safeRoll` 2 + `Math.min(Math.max(roll,0),1-Number.EPSILON)` 1 + `1 - Number.EPSILON` 2 total; (3) pipeline `spawn.test.ts` pot band `0.99→last` via valid band stays green.

**Owner:** FE lead
**Timeline:** Immediate (gate this decision; protects 40/40/20)
**Status:** Complete (code `weights.ts:29` clamp landed + `spawn.test.ts` green)
**Verification:** `npm --prefix triade test -- __tests__/engine/weights.test.ts` (9 pass) + `rg -n "safeRoll" triade/src/engine/core/weights.ts` ==1

### R-002: DisplayRoll NaN/Infinity/≥1 leak breaking [0,1) contract (Score: 6)

**Mitigation Strategy:** Enforce `[0,1)` at source via `normalizeDisplayRoll`: (1) host `newGame` `NaN→0.5` + `Infinity→0.5` + `"bad"→0.5` + `1→1-EPSILON` + `-0.5→0`; (2) `move effective` `rngOf(0,0.2,NaN)→0.5` etc.; (3) scan `normalizeDisplayRoll` 3 hits + `displayRoll: rng()` 0 hits + `return 0.5` 1 hit; (4) pipeline `previewFor` `0.5` midpoint still exact branch not range bias.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-56 displayRoll half)
**Status:** Complete (`game.ts:8-18` + `34,110` landed; midpoint neutral chosen over `0`)
**Verification:** Manual probe `normalizeDisplayRoll` wall 14 asserts + `npm --prefix triade test -- __tests__/engine/game.test.ts` 32 pass + `rg -n "normalizeDisplayRoll" game.ts` ==3

### R-003: Draw-budget drift via re-roll loop (Score: 6)

**Mitigation Strategy:** Keep 1-draw budget via clamp not loop: (1) `weights.ts` clamp consumes 1 `rng()` then clamp; (2) `normalizeDisplayRoll(rng())` consumes 1 then map; (3) host `spyRng` `newGame 20` + `effective with NaN 3` + `weightedPicker Infinity 1`; (4) scan `while.*rng ==0` + `rng()" weights.ts ==1` (single draw site).

**Owner:** FE lead
**Timeline:** Immediate (gate DW-56 budget preservation)
**Status:** Complete — no loop in `weights.ts:29` or `game.ts:8-18`; `helpers.rngOf` intact
**Verification:** `spyRng` exact-length pins + `pending-spawn-contract.test.ts` `20/3/0/1` + `rg -n "while.*rng" triade/src/engine/core` ==0

---

## Assumptions and Dependencies

### Assumptions

1. Production `Rng` is well-behaved `[0,1)` via `Math.random` / `mulberry32(seed)`; malformed values are harness/fuzz only (trust-the-rng class); guard paths defensive-only.
2. Valid `PendingSpawn.displayRoll` is always `∈ [0,1)` per `types.ts` JSDoc; `previewFor` uses `<0.6 exact` else `range` — `0.5` fallback lands in exact branch by design (neutral).
3. `FIXED_WEIGHTS[1]=0.4, [2]=0.4, POT_WEIGHT=0.2` sum `1.0 ±1e-9` is exact; `weightedPicker` re-normalizes but clamp guarantees `scaled < total` for `1→1-EPSILON`.
4. `GRID_SIZE=4` stays fixed; `MAX_POT_TIER=30` cap is only ceiling cap; `Number.EPSILON ≈2.22e-16` is language-level.

### Dependencies

1. `triade/src/engine/core/spawn.ts:46-60` `pickIndex` NaN clamp 0 — required for full RNG seam never-throws; byte-identical.
2. `triade/src/engine/core/types.ts:14-27` `Rng` draw-budget contract — required for P0 budget pins; byte-identical.
3. `triade/test-utils/helpers.ts:31-56` `rngOf`/`spyRng` Throw-on-exhaust — required for exact-length assertions; unchanged.
4. `triade/__tests__/engine/weights.test.ts:68-112` 9-case + `spawn.test.ts` 5-case + `game.test.ts` 32-case suites — required as P0/P1 baselines; must stay 9/5/32 pass before pins.

### Risks to Plan

- **Risk**: Manual probe `normalizeDisplayRoll(NaN)→0.5` not yet in committed `game.test.ts` (only this plan's P0) — a revert to `displayRoll: rng()` would pass existing 32 but fail probe.
  - **Impact**: `Infinity`/`NaN` preview leak hidden till `previewFor` misclassifies one move later (sanitize `0` one move stale).
  - **Contingency**: Promote wall pin to committed `defensive-guards` or `rng-trust` ATDD if guard ever regresses; keep probe in this plan's P0 Smoke.

- **Risk**: `1 - Number.EPSILON` vs `1 - 1e-9` confusion on follow-on micro-opt.
  - **Impact**: Top pot bucket off by `1e-9` vs `2e-16`.
  - **Contingency**: Keep scan `Number.EPSILON 2 hits total` and host `1→1-EPSILON` pin; any `1e-9` in `weights.ts`/`game.ts` is fail.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for `weightedPicker clamp + normalizeDisplayRoll 0.5/0/EPSILON` — recommend `rng-trust.atdd.test.ts` with `weights [1,0.5]` + `newGame` 20-draw + `move` effective 3-draw wall.
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
| **`spawn.ts` / `weights.ts` / `pot.ts` (spawn distribution `40/40/20`, pot ladder)** | `weights.ts` clamp feeds `potWeights→normalizeTo→weightedPicker→pickCombined→resolveSpawn`; preserves 1-draw and 40/40/20 `sum 1.0 ±1e-9` | `spawn.test.ts` 5-case + `weights.test.ts` 9-case + `pot.test.ts` 8-tier + `adaptive-spawn-integration` 5 suites must pass |
| **`game.ts` `newGame`/`move`/`sanitizePending` (snapshot `PendingSpawn`, ADR-06)** | `normalizeDisplayRoll` feeds `pendingSpawn.displayRoll` for every `newGame` 20-draw and `effective move` 3-draw; `sanitizePending` still `dr>=0&&dr<1?dr:0` one move later but source never produces `NaN` | `game.test.ts` 32 pass + `pending-spawn-contract.test.ts` N3 + `board.test.ts` + `line.test.ts` |
| **`previewFor` / `Hud.tsx` preview card (Epic 7 `60/40`)** | `displayRoll` drives `previewFor` `<0.6 exact` else `range`; `0.5` fallback stays in exact branch neutral, `1-EPSILON` stays in range branch valid | `preview-pot-ladder-hygiene` 60/40 + `hud-preview-hardening` 60/40 still green |
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

- Spec: `_bmad-output/implementation-artifacts/spec-decision-dw-56-clamp-roll-and-fallback-displayroll.md` (decision DW-56)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` DW-56 `done 2026-09-02 resolution-undo 0eb6ce61…`
- Baseline: `30ebd2f95d24977dbb6ffe9361fa3f7d769c19c2` (sweep `dw-engine-rng-trust-hardening` — implementation already at HEAD)
- Draw-budget contract: `triade/src/engine/core/types.ts:14-27` (`newGame 20 / effective 3 / noop 0 / resolver 1`)
- Helpers: `triade/test-utils/helpers.ts:31-56` (`rngOf`/`spyRng`)
- Prior template: `_bmad-output/test-artifacts/test-design/test-design-dw-engine-rng-trust-hardening.md` (structure reused; working-tree delta identical)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Execution Mode**: sequential (auto fallback — no subagent/team capability)
**Capability Probe**: `tea_capability_probe: true` → `supports.subagent false, agentTeam false` → `sequential`

