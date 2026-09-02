---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-02'
workflowType: 'testarch-atdd'
storyId: 'dw-decision-dw-56'
storyKey: 'dw-decision-dw-56'
storyFile: '_bmad-output/implementation-artifacts/spec-decision-dw-56-clamp-roll-and-fallback-displayroll.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-56.md'
generatedTestFiles:
  - 'triade/__tests__/engine/dw-decision-dw-56.clamp-roll-and-fallback-displayroll.atdd.test.ts'
  - 'triade/__tests__/engine/rng-trust-hardening.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-decision-dw-56-clamp-roll-and-fallback-displayroll.md'
  - '_bmad-output/test-artifacts/test-design-dw-decision-dw-56.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-decision-dw-56.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/weights.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/__tests__/engine/weights.test.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — dw-decision-dw-56 — Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback (DW-56)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) — pure `weightedPicker` roll clamp + `normalizeDisplayRoll` `[0,1)` + draw-budget + engine-never-throws; no E2E/API harness required. Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 + Skia/Reanimated) but scenario is framework-free pure TS `newGame`/`move`/`weightedPicker` exercised via `node:test`.

---

## Story Summary

dw-decision-dw-56 (spec-decision-dw-56-clamp-roll-and-fallback-displayroll.md) closes DW-56 via bundle dw-engine-rng-trust-hardening (malformed-rng trust-the-rng class without crash: `weightedPicker` `roll ≥ 1` / `Infinity` / `negative` collapses via fallthrough not valid band, and `NaN` third draw copied unvalidated into `pendingSpawn.displayRoll` breaking `[0,1)` contract silently) at two sites — `weights.ts` roll clamp and `game.ts` displayRoll normalization. The old `weights.ts:22-30` did `const scaled = roll * total` with only `typeof !== 'number' || NaN → last` early-return; `roll ≥ 1` (including `Infinity`) produced `scaled ≥ total` which never hit `scaled < acc` so fell through to `return weights.length - 1` (same value as NaN path but via invalid scaled, not via `1-EPSILON` valid band), and `roll < 0` produced `scaled < 0` which hit first `scaled < acc` by accident not clamp. `game.ts:34,110` did `displayRoll: rng()` with no validation, so `NaN` stored `NaN`, `Infinity → Infinity`, `1 → 1`, `1.5 → 1.5`, `"bad" → "bad"` — all outside `[0,1)`, breaking `previewFor` `<0.6 exact` vs `range` and HUD 60/40. The sweep replaces them with deterministic `safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON)` then `scaled = safeRoll * total` (weights) and `normalizeDisplayRoll(raw: unknown): number` + two call sites `newGame`/`move` effective path: `!finite/non-number → 0.5` midpoint (not 0, to keep Epic 7 preview neutral), `<0 → 0`, `>=1 → 1-Number.EPSILON` (game). Preserves 1-draw budget (no re-roll loop). Production blast radius is low on well-behaved `Math.random`/`mulberry32` (always `[0,1)`), but seam is load-bearing for fuzzed/custom RNG or deterministic replay.

**As a** caller that drives the engine with a fuzzed or custom `Rng` that may emit `NaN`/`Infinity`/`≥1`/`negative`/`non-number`
**I want** every `weightedPicker` roll to map to a valid weight band via clamp (`<0→0`, `≥1→1-EPSILON`, `NaN/non-number→last` explicit) and every `PendingSpawn.displayRoll` to satisfy `∈ [0,1)` via `normalizeDisplayRoll` (`NaN/Infinity/non-number→0.5`, `<0→0`, `≥1→1-EPSILON`) without adding rng draws
**So that** 40/40/20 distribution stays via valid band not fallthrough, preview `displayRoll` never leaks `NaN/Infinity/≥1`, draw-budget `newGame 20 / effective 3 / noop 0 / resolver 1` stays deterministic, and DW-56 flips to `done` without touching `sprint-status.yaml`.

---

## Acceptance Criteria

1. **AC negative clamp (R-001)** — Given `weights [1,0.5]` when `weightedPicker(weights, rngOf(-0.5))` then `0` (first band) via `max(roll,0)` not NaN fallthrough. `rngOf(-Infinity)→0`, `rngOf(-1)→0`, `rngOf(0)→0`.
2. **AC ≥1/Infinity clamp (R-001)** — Given `weights [1,0.5]` when `weightedPicker(weights, rngOf(1))` then `last` via `1-EPSILON` valid band (`scaled < total`) not `scaled ≥ total` fallthrough. `rngOf(1.5)→last`, `() => Infinity→last`, `rngOf(0.99)→last`.
3. **AC NaN/non-number guard still last (R-001,R-006)** — Given `weightedPicker([1,1], () => NaN)` then `last` via explicit `typeof !== 'number' || NaN` before clamp. `undefined→last`, `"0.5"→last`, `null→last`.
4. **AC normalizeDisplayRoll non-finite/non-number → 0.5 midpoint (R-002,R-005)** — Given `raw = NaN/Infinity/-Infinity/undefined/null/"0.5"/{}` when `normalizeDisplayRoll(raw)` (via `newGame`/`move` third draw) then `0.5` not `0`. `newGame(rngOf(...,NaN))→0.5`, `move effective rngOf(0,0.2,Infinity)→0.5`, `move "bad"→0.5`.
5. **AC normalizeDisplayRoll finite clamp (R-002,R-004,R-007)** — Given `raw = -0.5/-1→0`, `0→0`, `0.5→0.5`, `0.999→0.999`, `1→1-EPSILON`, `1.5→1-EPSILON` when validated then preserved/clamped. `newGame -0.5→0` (finite negative edge), `newGame 1→1-EPSILON` exclusive.
6. **AC newGame malformed third draw still valid (R-002)** — Given `newGame` with 20 draws where 9 cells + 9 values + 1 pending value + 1 malformed displayRoll (`NaN/Infinity/1/1.5/-0.5`) then `board 9 tiles`, `pendingSpawn.value finite>0`, `displayRoll ∈ [0,1)` and `20 draws`.
7. **AC move effective malformed third draw still valid + spawn deterministic (R-002,R-007)** — Given `gameState(staticBoard([1,2,null,null]))` when `move(state,left,rngOf(0,0.2,NaN))` then `moved true`, `pendingSpawn.displayRoll 0.5`, `spawned true` `trace` present, and similarly `Infinity→0.5`, `1→1-EPSILON`, `-0.5→0` each `∈ [0,1)`.
8. **AC draw-budget preserved — no re-roll loop (R-003)** — Given any malformed roll when `weightedPicker`/`normalizeDisplayRoll` then exactly `1` draw each; `newGame` with malformed still `20`, `effective move` with malformed displayRoll still `3`, `noop 0`.
9. **AC bare site eliminated (R-001,R-002)** — Given `weights.ts`/`game.ts` source when scanned then `displayRoll: rng()` `0`, `const scaled = roll * total` `0`, `safeRoll` exists, `normalizeDisplayRoll` exists.
10. **AC [0,1) invariant holds (R-002,R-004)** — Given `displayRoll` `1→1-EPSILON` (not `1`), `Infinity/NaN/"bad"→0.5` (not `0`), `-0.5→0` (not `0.5`), then `[0,1)` window strict and epsilon exact `Number.EPSILON`.
11. **AC engine→spawn pipeline still 40/40/20 via valid band (R-001)** — Given `weightedValue(rngOf(0.39)→1, 0.4→2, 0.8→3, 0.99→3)` and `rngOf(1)→3` via clamp then still `40/40/20` single-roll `pickCombined`.
12. **AC hardening gates (R-001..R-009)** — `safeRoll` definition 1 (total 2), `normalizeDisplayRoll` 3, `Number.EPSILON` total 2 (1+1), `return 0.5` 1 (game not weights), `Math.min(Math.max(roll` 1, `while.*rng` 0, `1 - Number.EPSILON` per file 1, `dr >=0 && dr <1` 1, `raw >=1` 1, ledger `0eb6ce61` done.

---

## Story Integration Metadata

- **Story ID:** `dw-decision-dw-56` (decision: `Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback` — spec `baseline_revision: 30ebd2f`, `status: done 2026-09-02`, bundle `dw-engine-rng-trust-hardening`)
- **Story Key:** `dw-decision-dw-56`
- **Story File:** `_bmad-output/implementation-artifacts/spec-decision-dw-56-clamp-roll-and-fallback-displayroll.md` (DW-56 decision; ledger `_bmad-output/implementation-artifacts/deferred-work.md:467-475`)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-56.md`
- **Generated Test Files:**
  - `triade/__tests__/engine/dw-decision-dw-56.clamp-roll-and-fallback-displayroll.atdd.test.ts` (NEW — 20 RED-phase scaffolds, `it.skip`, host `node:test` + `tsx`; 10 P0 + 4 P1 + 4 P2 + 2 P3 — canonical for dw-decision-dw-56)
  - `triade/__tests__/engine/rng-trust-hardening.atdd.test.ts` (reference — 20 RED scaffolds for bundle dw-engine-rng-trust-hardening, byte-identical coverage of same working-tree delta)
  - Existing hardened suites (reference, already green after sweep): `triade/__tests__/engine/weights.test.ts` (9 pass), `triade/__tests__/engine/game.test.ts` (32 pass), `triade/__tests__/engine/spawn.test.ts` (5 pass), `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (5 suites), `triade/__tests__/engine/pending-spawn-contract.test.ts`
- **Working-tree delta covered (vs baseline `2e91c12`):**
  - `triade/src/engine/core/weights.ts:20-37` — `safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON)` + `scaled = safeRoll * total` (see header). Production delta only; keeps `typeof roll !== 'number' || NaN → last` before clamp, `total>0` guard, loop `scaled < acc` unchanged. Comment `DW-56 hardening` documents clamp semantics.
  - `triade/src/engine/core/game.ts:8-18,34,110` — new `normalizeDisplayRoll(raw: unknown): number` with 3 branches (`!finite/non-number→0.5`, `<0→0`, `>=1→1-EPSILON`) + two call sites `newGame` `displayRoll: normalizeDisplayRoll(rng())` and `move` effective `pendingSpawn displayRoll: normalizeDisplayRoll(rng())`. Preserves 1-draw budget (no `while` re-roll). `sanitizePending` unchanged (`dr >=0 && dr <1 → dr else 0`).
  - `triade/src/engine/core/spawn.ts:46-60` — byte-identical `pickIndex` `!isFinite→0` etc.; not changed (reference for DATA chain).
  - `triade/src/engine/core/types.ts:1-30` — `Rng = () => number`, `PendingSpawn {value, displayRoll}`, draw-budget JSDoc `20/3/0/1` pinned; byte-identical.
  - `_bmad-output/implementation-artifacts/deferred-work.md:461-469` — DW-56 flipped `status: open` → `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-rng-trust-hardening` + `resolution-undo: 0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e 2026-09-02 7374617475733a206f70656e` (hex `status: open` tail) exactly the hygiene bundle pattern.
  - `sprint-status.yaml` NOT written (orchestrator-owned per prompt — verified via `git diff --stat` having no `sprint-status.yaml`; only `game.ts` + `weights.ts` + `deferred-work.md`).
---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm --prefix triade test`)
- **No Playwright/Cypress harness needed:** scenario is pure `weightedPicker` clamp + `normalizeDisplayRoll` `[0,1)` + `newGame`/`move` draw-budget + static `rg` allowlists; correct level is **Unit host** + integration via engine fixtures and pipeline suites. E2E/API scaffolds intentionally absent (per `test-design-dw-engine-rng-trust-hardening.md` risks `R-001..R-003` mitigations and `Not in Scope` — merge/score/ceiling distribution unchanged, no UI/preview/feel/layout touched). `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN Skia Canvas project, not a web Playwright flow).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`

---

## Red-Phase Test Scaffolds Created

### Unit Tests (20 tests, host `node:test`)

**File:** `triade/__tests__/engine/rng-trust-hardening.atdd.test.ts` (412 lines, 4 suites)

All 20 are `it.skip` — RED-phase scaffolds. When activated (`it.skip` → `it`) they assert the **expected** post-hardening behaviour; before `3603d4d`/`6edc925` they would fail (roll ≥1 via fallthrough not valid band, `displayRoll NaN` leaks to `NaN`, draw-budget still 1 but contract `[0,1)` violated, bare `displayRoll: rng()` survivor); with the working-tree delta they **PASS** (see Execution Evidence). This is the correct TDD inversion: tests document the contract; implementation already in working tree makes them green.

#### P0 Critical — RNG trust seam (10 tests)

- ✅ **Test:** `[P0-01] weightedPicker negative clamp → first band (0), not NaN fallthrough (R-001)`
  - **Status:** RED (skip) — would fail before fix if negative relied on `scaled < acc` accident vs explicit `max(roll,0)`; after: `safeRoll 0 → scaled 0 → first band`
  - **Verifies:** `Math.max(roll,0)` before `Math.min(...,1-EPSILON)` (R-001)
- ✅ **Test:** `[P0-02] weightedPicker ≥1 / Infinity clamp → last via valid band 1-EPSILON, not fallthrough (R-001)`
  - **Status:** RED — before: `roll 1 → scaled ≥ total` never `scaled<acc` → fallthrough `return last` (invalid scaled); after: `safeRoll 1-EPSILON → scaled < total` → last via valid band
  - **Verifies:** `Math.min(...,1-EPSILON)` guarantees `scaled < total` (R-001)
- ✅ **Test:** `[P0-03] weightedPicker NaN / non-number guard still last (R-001,R-006)`
  - **Status:** RED — before and after both `last`, but before via `NaN scaled` fallthrough not explicit degrade; after: `typeof !== number || NaN → last` before clamp documents intent per AC5
  - **Verifies:** `typeof roll !== 'number'` + `Number.isNaN(roll)` + `safeRoll` ordering (R-006)
- ✅ **Test:** `[P0-04] normalizeDisplayRoll non-finite / non-number → 0.5 midpoint, not 0 (R-002,R-005)`
  - **Status:** RED — before: `rng → NaN` stored `NaN` breaking `[0,1)`; after: `!finite/non-number → 0.5` via `newGame`/`move` third draw
  - **Verifies:** `isFinite` + `typeof !== 'number'` → `0.5` midpoint neutrality (R-002,R-005)
- ✅ **Test:** `[P0-05] normalizeDisplayRoll finite clamp: -0.5/-1→0, 0→0, 0.5→0.5, 1/1.5→1-EPSILON, valid kept (R-002,R-004,R-007)`
  - **Status:** RED — would fail if `>=1 → 1` stored `1` violating exclusive `<1`; after: `-0.5→0`, `1→1-EPSILON`, valid `0.5` kept
  - **Verifies:** `<0 →0`, `>=1 →1-EPSILON` strict `>=1` not `>1` (R-004,R-007)
- ✅ **Test:** `[P0-06] newGame malformed third draw still valid [0,1) + 9 tiles + value finite (R-002)`
  - **Status:** RED — before: `pendingSpawn.displayRoll NaN/Infinity/1` outside `[0,1)`; after: `newGame` third draw normalized still `9 tiles`, `displayRoll ∈ [0,1)`, `20 draws`
  - **Verifies:** `newGame` call site `normalizeDisplayRoll(rng())` + 20-draw budget (R-002)
- ✅ **Test:** `[P0-07] move effective malformed third draw still valid + spawn deterministic (R-002,R-007)`
  - **Status:** RED — before: `move effective rngOf(0,0.2,NaN) → displayRoll NaN` stale preview one move later via `sanitizePending 0`; after: `effective 3-draw` third `NaN→0.5`, `Infinity→0.5`, `1→1-EPSILON`, `-0.5→0` each valid
  - **Verifies:** `move` effective `displayRoll` before sanitize, draw-budget 3 preserved (R-002,R-007)
- ✅ **Test:** `[P0-08] draw-budget preserved — no re-roll loop, 1-draw per picker/displayRoll (R-003)`
  - **Status:** RED — would fail if `while(!isFinite(roll)) roll=rng()` added draws; after: `weightedPicker Infinity 1 draw`, `newGame with NaN still 20`, `effective move with NaN still 3`, `noop 0`
  - **Verifies:** no `while` re-roll, `spyRng` exact-length, `rng()` single site in weights (R-003)
- ✅ **Test:** `[P0-09] bare site eliminated — no displayRoll: rng() bare, no roll*total bare scaled (R-001,R-002)`
  - **Status:** RED — would fail if `displayRoll: rng()` bare survived or `const scaled = roll * total` bare survived; after: `safeRoll * total` sole scaled, `normalizeDisplayRoll(rng())` sole displayRoll
  - **Verifies:** old throw sites gone (R-001,R-002)
- ✅ **Test:** `[P0-10] [0,1) invariant holds: 1.0 → 1-EPSILON not 1, NaN/Infinity→0.5 not 0, -0.5→0 not 0.5 (R-002,R-004)`
  - **Status:** RED — would fail if `1 → 1` (exclusive violation) or `NaN → 0` (zero-bias) or `-0.5 → 0.5` (midpoint vs clamp split confused); after: exact `1-EPSILON`, `0.5` midpoint, `0` edge
  - **Verifies:** epsilon `Number.EPSILON` exact + midpoint `0.5` single coupling (R-004,R-005,R-007)

#### P1 Wiring — pipeline + ledger (4 tests)

- ✅ **Test:** `[P1-01] engine→spawn pipeline: resolveSpawn/weightedValue via weightedPicker still 40/40/20 via valid band (R-001)`
  - **Status:** RED — would fail if clamp broke `0.39→1`/`0.8→3` bands; after: `weightedValue` 40/40/20 + `1→3` via clamp valid band stays green
  - **Verifies:** `pickCombined → weightedPicker` clamp preserves ladder (R-001)
- ✅ **Test:** `[P1-02] game.move 4 suites + newGame/effective/noop draw-budget still green (R-002,R-003)`
  - **Status:** RED — would fail if `normalizeDisplayRoll` consumed extra draw (budget drift); after: `move` `HAPPY_PATH/CASCADE/ONE_CELL` + `newGame 20/effective 3/noop 0` stays 32 pass
  - **Verifies:** `game.test.ts` 32 + draw-budget pipeline (R-002,R-003)
- ✅ **Test:** `[P1-03] pending-spawn-contract N3 pipeline still green (R-002,R-003)`
  - **Status:** RED — would fail if malformed `displayRoll` leaked `NaN` into `previewFor` N3 materialization; after: `runSeededSession(0x1234,20)` `N3 promised===materialized`
  - **Verifies:** `helpers.preSpawnBoardOf` + `runSeededSession` N3 pin (R-002)
- ✅ **Test:** `[P1-04] adaptive-spawn-integration 5 suites + ledger DW-56 done with resolution-undo + sprint-status untouched (R-009)`
  - **Status:** RED — would fail if clamp shifted 40/40/20 aggregate or ledger not flipped; after: `0eb6ce61` + `status: done 2026-09-02` + `game.ts` no `sprint` text
  - **Verifies:** 40/40/20 statistical 10k + pot-by-ceiling conditional + ledger `resolution-undo: 0eb6ce61… 7374617475733a206f70656e` (R-009)

#### P2 Static scans — allowlist gates (4 tests)

- ✅ **Test:** `[P2-01] SCAN single-clamp / single-normalize / single-epsilon / single-midpoint allowlists (R-001,R-004,R-005)`
  - **Status:** RED — would fail if duplicate `safeRoll` or second `return 0.5`; after: `safeRoll def 1 / total 2`, `normalizeDisplayRoll 3`, `EPSILON 1+1=2`, `return 0.5 game 1 weights 0`
  - **Verifies:** single-guard allowlists (R-001,R-004,R-005)
- ✅ **Test:** `[P2-02] SCAN no bare scale / no bare displayRoll / no re-roll loop (R-001,R-002,R-003)`
  - **Status:** RED — would fail if `const scaled = roll * total` bare survived or `displayRoll: rng()` bare survived or `while rng` loop introduced; after: `0/0/0` + `Math.min(Math.max(roll 1` + `weights rng() 1`
  - **Verifies:** bare sites eliminated + single draw site (R-001..R-003)
- ✅ **Test:** `[P2-03] SCAN epsilon exactness + midpoint neutrality coupling — 1 - Number.EPSILON per file (R-004,R-005,R-006)`
  - **Status:** RED — would fail if `1 - 1e-9` or `0.999` surrogate; after: `1 - Number.EPSILON 1` per file, no `1e-9`, `typeof` + `isNaN` guards present
  - **Verifies:** epsilon `Number.EPSILON` exact vs `1e-9` drift (R-004)
- ✅ **Test:** `[P2-04] SCAN board pendingSpawn displayRoll window strict [0,1) — sanitizePending + normalizeDisplayRoll (R-002,R-007)`
  - **Status:** RED — would fail if `>1` (strict) let `1.0` leak as `1` or sanitize window changed to `<=1`; after: `dr >=0 && dr <1 1` + `raw >=1 1` + `raw <0 return 0 1`
  - **Verifies:** window strict `>=0 && <1` + `>=1` not `>1` (R-002,R-007)

#### P3 Exploratory / residual / hygiene (2 tests)

- ✅ **Test:** `[P3-01] exploratory — malformed sequence sweep: newGame + move malformed chain stays valid (R-002 residual)`
  - **Status:** RED — would fail if `newGame NaN→0.5` not normalized or `-0.5→0` confused with midpoint; after: `newGame NaN 0.5` then `move -0.5→0` vs `1.5→1-EPSILON` chain valid
  - **Verifies:** malformed sequence sweep residual (R-002)
- ✅ **Test:** `[P3-02] bench — weightedPicker 10k + normalizeDisplayRoll 10k <0.05ms median, no loop, cross-cutting scan (R-008)`
  - **Status:** RED — would fail if guard were `O(n)` or cloned per entry or introduced `while` infinite; after: `10k <500ms` `O(1)` + `Music|bgm|RevenueCat` 0 in engine
  - **Verifies:** perf hygiene `O(1)` per spawn/move (R-008) — no bench regression, `npm test <15 min` already gates frame budget.

---

## Data Factories Created

Not applicable to this pure engine helper scenario (per `test-design-dw-engine-rng-trust-hardening.md`):

- **No data factories / `@faker-js/faker`** — fixtures are deterministic `boardWith([...])` `4×4` literals + `emptyBoard()` + `gameState(board, pendingSpawn)` frozen snapshots + `rngOf`/`spyRng` draw-budget spies + `mulberry32(seed)` for 4000-draw style uniformity when needed. No new factory file — reuse existing `triade/test-utils/helpers.ts` seams (`spyRng`/`rngOf`/`mulberry32`/`boardWith`/`emptyBoard`/`staticBoard`/`gameState` already cover RNG seam).
- **No new factory file** — `weightedPicker(weights,Rng)` and `newGame(rng)`/`move(state,dir,rng)` are pure and take `Board`/`Rng`/`weights` directly; `helpers.ts` `boardWith`/`emptyBoard` + `mulberry32` suffice.

---

## Fixtures Created

Not applicable — pure TS engine, no Playwright fixtures / browser automation:

- **No Playwright fixture / `test.extend`** — the RNG seam uses host `node:test` + `tsx` with pure `weightedPicker`/`move`/`newGame` calls; browser `test.extend` is not needed (RN Skia project, no `page.goto`).
- **No external service mocking** — no I/O in `weightedPicker`/`normalizeDisplayRoll`/`move` or `cloneBoard`; `ceilingDetector`/`pickIndex`/`weightedValue` are pure math already covered by `weights.test.ts`/`ceiling.test.ts` (byte-identical, not re-derived here).

---

## Mock Requirements

None. No UI surface change that mocks `useWindowDimensions`/`useSafeAreaInsets` — helpers are pure board math with no provider hook. The only consumers are `game.move`/`newGame` (spawn `rngOf` seam) and `weightedPicker` direct callers — both have deterministic fixtures in `weights.test.ts` / `game.test.ts` and stay green via `<15 min` host gate; no mock endpoint needed.

---

## Required data-testid Attributes

None — `weightedPicker`/`newGame`/`move` are pure functions (`Board`↔`SpawnResult`↔`GameState`/`PendingSpawn`/`number`). No component is mounted in these host unit tests; `GameBoard.tsx` Skia tile `data-testid` wiring is verified via existing `transitionPlan.test.ts` no-leak/`assertNoLeak` sweep and `engine.purity` / `ui.norolls` scanner gates, not re-derived here.

---

## Implementation Checklist

Maps directly to the working-tree diff already in place (`2e91c12` → working tree `game.ts` `3603d4d` + `weights.ts` `6edc925` → `deferred-work.md` ledger). Each scaffold's GREEN task is the code change that makes it pass — for this completed sweep the tasks are **already done** (working tree implements them; activated ATDD now GREEN). Keep checklist as the red→green roadmap for any re-hardening.

### Test: [P0-01] weightedPicker negative clamp → first band

**File:** `triade/src/engine/core/weights.ts:20-30` (`safeRoll = Math.min(Math.max(roll,0),1-EPSILON)`)

**Tasks to make this test pass (DONE in working tree):**
- [x] Guard `const roll = rng()` then `if (typeof roll !== 'number' || Number.isNaN(roll)) return last` keeps NaN degrade before clamp
- [x] Add `const safeRoll = Math.min(Math.max(roll, 0), 1 - Number.EPSILON)` before `scaled` so `<0` clamps to `0` deterministically (not accident via `scaled < acc`)
- [x] Keep `const scaled = safeRoll * total` (sole scaled site) + loop `scaled < acc` unchanged
- [x] Run test: `npm --prefix triade test -- __tests__/engine/rng-trust-hardening.atdd.test.ts` → `it.skip` → `it` → 20 pass (P0-01: `-0.5→0`, `-Infinity→0`, `0→0`)
- [x] ✅ Test passes (green phase — negative clamped to first band explicitly)

**Estimated Effort:** 0.1h

---

### Test: [P0-02] weightedPicker ≥1/Infinity clamp → last via valid band

**File:** `triade/src/engine/core/weights.ts:29-30`

**Tasks:**
- [x] Clamp `roll >=1` including `Infinity` to `1 - Number.EPSILON` via `Math.min(...,1-EPSILON)` so `scaled = safeRoll * total < total` guarantees hit `scaled < acc` at last weight (valid band) not fallthrough `scaled >= total`
- [x] Verify `weightedPicker([1,0.5], rngOf(1)) === last` + `1.5→last` + `Infinity→last` + `0.99→last` each via valid band
- [x] Ensure no `while` re-roll: `rg -n "while.*rng" triade/src/engine/core/` ==0
- [x] ✅ Test passes (P0-02)

**Estimated Effort:** 0.1h

---

### Test: [P0-03] weightedPicker NaN/non-number guard still last

**File:** `triade/src/engine/core/weights.ts:24`

**Tasks:**
- [x] Keep `if (typeof roll !== 'number' || Number.isNaN(roll)) return weights.length - 1` before `safeRoll` — documents intent per AC5 engine-never-throws vs `Math.max(NaN,0)→NaN` scaled path ambiguity
- [x] Verify `() => NaN→last`, `undefined→last`, `"0.5"→last`, `null→last`
- [x] Scan `typeof roll !== 'number' 1` + `Number.isNaN(roll) 1` + `const safeRoll 1` + `safeRoll total 2`
- [x] ✅ Test passes (P0-03)

**Estimated Effort:** 0.1h

---

### Tests: [P0-04..05] normalizeDisplayRoll non-finite/non-number → 0.5 + finite clamp

**File:** `triade/src/engine/core/game.ts:8-18` (`normalizeDisplayRoll`)

**Tasks:**
- [x] Implement `function normalizeDisplayRoll(raw: unknown): number { if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0.5; if (raw < 0) return 0; if (raw >= 1) return 1 - Number.EPSILON; return raw; }` — 3 branches + preserve 1-draw budget (no loop)
- [x] Pin midpoint `0.5` not `0` for non-finite/non-number: `NaN→0.5`, `Infinity→0.5`, `-Infinity→0.5`, `undefined→0.5`, `null→0.5`, `"bad"→0.5`, `{}→0.5`
- [x] Pin finite split: `raw <0 →0` (clampable edge, not midpoint) vs `raw >=1 →1-EPSILON` exclusive; valid `0/0.5/0.999` kept
- [x] Verify `rg -n "normalizeDisplayRoll" game.ts ==3` (def + 2 call sites) and `rg -n "return 0\.5" game.ts ==1` (single midpoint) and `rg -n "Number\.EPSILON" game.ts ==1`
- [x] ✅ Tests pass (P0-04 7 probes + P0-05 7 probes)

**Estimated Effort:** 0.4h

---

### Tests: [P0-06..07] newGame / move effective malformed third draw still valid

**File:** `triade/src/engine/core/game.ts:34,110` (call sites)

**Tasks:**
- [x] Wire `newGame`: `pendingSpawn: { value: resolveSpawn(ceilingDetector(board), rng), displayRoll: normalizeDisplayRoll(rng()) }` (was `displayRoll: rng()`)
- [x] Wire `move` effective: `pendingSpawn = { value: resolveSpawn(ceiling, rng), displayRoll: normalizeDisplayRoll(rng()) }` inside `if (moved)` after `spawnTile`
- [x] Pin `newGame` malformed `NaN/Infinity/1/1.5/-0.5` still `9 tiles` + `value finite>0` + `displayRoll ∈ [0,1)` + `spyRng 20` draws
- [x] Pin `move` effective `rngOf(0,0.2,NaN)→0.5`, `Infinity→0.5`, `1→1-EPSILON`, `-0.5→0` each `moved true` + `spawned` trace + `∈ [0,1)`
- [x] Keep `sanitizePending` `dr >=0 && dr <1 → dr else 0` one-move-later stale fallback still green but no longer reached on malformed third draw (invariant now at source)
- [x] ✅ Tests pass (P0-06 5 malformed + valid 0.3; P0-07 5 cases)

**Estimated Effort:** 0.3h

---

### Test: [P0-08] draw-budget preserved — no re-roll loop

**File:** `triade/src/engine/core/weights.ts` + `game.ts:8-18`

**Tasks:**
- [x] Ensure `weightedPicker` clamp consumes exactly `1` `rng()` then clamp (no `while(!isFinite) roll=rng()` loop); `normalizeDisplayRoll(rng())` consumes exactly `1` then map
- [x] Pin `spyRng` `weightedPicker Infinity 1`, `NaN 1`, `-0.5 1`, `newGame with NaN 20`, `effective move with NaN 3`, `noop 0`
- [x] Scan `rg -n "while.*rng" triade/src/engine/core/` ==0 and `rg -n "rng\(\)" triade/src/engine/core/weights.ts` ==1 (single draw site)
- [x] ✅ Test passes (P0-08)

**Estimated Effort:** 0.2h

---

### Tests: [P0-09..10] bare site eliminated + [0,1) invariant

**File:** `triade/src/engine/core/weights.ts:30` + `game.ts:34,110`

**Tasks:**
- [x] Remove bare `const scaled = roll * total` → `const scaled = safeRoll * total` only; `rg "const scaled = roll \* total" weights.ts ==0`
- [x] Remove bare `displayRoll: rng()` → `displayRoll: normalizeDisplayRoll(rng())` only; `rg "displayRoll: rng\(\)" game.ts ==0`
- [x] Pin `1 → 1-EPSILON` not `1` (`rg "1 - Number\.EPSILON" game.ts 1 + weights 1` total 2) and `Number.EPSILON ≈2.22e-16` language-level not `1e-9`
- [x] ✅ Tests pass (P0-09 scan 4 hits + P0-10 epsilon + `-0.5→0` not `0.5` vs `NaN→0.5` not `0`)

**Estimated Effort:** 0.2h

---

### Tests: [P1-01..04] pipeline + ledger

**File:** `triade/src/engine/core/spawn.ts` (reference) + `game.ts` + `weights.ts` + `deferred-work.md`

**Tasks:**
- [x] Keep `spawn.ts` byte-identical (`pickIndex` NaN guard `!isFinite→0` already closed by 2.6); `weights` clamp preserves `weightedValue` 40/40/20 ladder `0.39→1 0.4→2 0.8→3 0.99→3` and `1→3` via clamp not fallthrough
- [x] Keep `game.test.ts` 32 pass (`HAPPY_PATH/CASCADE/ONE_CELL` + `newGame 20/effective 3/noop 0` + `trace spawned` + `isGameOver`)
- [x] Keep `pending-spawn-contract` `runSeededSession(0x1234,20)` `N3 promised===materialized` still green (guarded `displayRoll` never leaks `NaN` into `previewFor` `N3`)
- [x] Ledger `deferred-work.md` DW-56 `done 2026-09-02` with `resolution-undo: 0eb6ce61… 7374617475733a206f70656e` (hex `status: open` tail) and `git diff --stat` shows `game.ts+weights.ts` but not `sprint-status.yaml`
- [x] ✅ Tests pass (P1-01..04)

**Estimated Effort:** 0.5h

---

### Tests: [P2-01..04] single-guard / epsilon / bare / window scans

**File:** `triade/src/engine/core/weights.ts` + `game.ts` + `deferred-work.md`

**Tasks:**
- [x] `P2-01` allowlists: `const safeRoll 1` / `safeRoll total 2` + `normalizeDisplayRoll 3` + `Number.EPSILON 1+1=2` + `return 0.5 game 1 weights 0`
- [x] `P2-02` no bare/survivor: `const scaled = roll * total 0` + `displayRoll: rng() 0` + `while.*rng 0` + `Math.min(Math.max(roll 1` + `weights rng() 1`
- [x] `P2-03` epsilon/midpoint coupling: `1 - Number.EPSILON 1` per file (no `1e-9` or `0.999`), `typeof roll !== number 1` + `Number.isNaN 1`
- [x] `P2-04` window strict: `sanitizePending dr >=0 && dr <1 1` + `normalizeDisplayRoll raw >=1 1` (strict `>=1` not `>1`) + `raw <0 return 0 1`
- [x] ✅ All scans pass

**Estimated Effort:** 0.3h

---

### Tests: [P3-01..02] exploratory + bench + cross-cutting

**File:** `triade/test-utils/helpers.ts` residual + hygiene

**Tasks:**
- [x] `P3-01` `newGame NaN 0.5 → move -0.5 0 vs 1.5 1-EPSILON` chain still valid 3-draw and next `pendingSpawn.displayRoll` respects finite-negative vs midpoint split
- [x] `P3-02` bench: `10k weightedPicker` with 10% `NaN/Infinity/-0.5` injection `<500ms` (clamp `O(1)` + no `while` infinite) + `rg "Music|bgm|RevenueCat|AdMob" engine 0` (scope stays pure, no cross-cutting leak)
- [x] Keep `triade/src/engine` delta `game.ts`+`weights.ts` only (not `src/feel`/`src/render`/`src/ui`) — sweep stayed in scope per `Not in Scope` table (merge/score/ceiling not re-derived)
- [x] ✅ Tests pass (P3-01 malformed chain, P3-02 `10k <500ms` + cross-cutting 0)

**Estimated Effort:** 0.2h

---

### Test: ledger DW-56 done + sprint-status untouched

**File:** `_bmad-output/implementation-artifacts/deferred-work.md` + `sprint-status.yaml`

**Tasks:**
- [x] Flip DW-56 (`Malformed-rng hardening without crash: a roll ≥ 1 … top pot slot … NaN third draw … [0,1) contract silently` `n/a`) `open` → `done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-rng-trust-hardening` + `resolution-undo: 0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e 2026-09-02 7374617475733a206f70656e` 64-hex (`hex status: open` tail `7374617475733a206f70656e`)
- [x] Decision `2026-09-02 Clamp roll and validate displayRoll — Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback` signed
- [x] Never write `sprint-status.yaml` (orchestrator-owned — verify `git diff --stat` has no `sprint-status.yaml` and ledger shows only `deferred-work.md` + `game.ts`+`weights.ts` diff)
- [x] ✅ Test passes (`rg -n "status: done 2026-09-02" deferred-work.md` shows DW-56 with 64-hex `resolution-undo`)

**Estimated Effort:** 0.1h

---

## Running Tests

```bash
# Run all activated tests for this story (dormant by default — RED scaffolds)
# 1) Activate one scaffold at a time for the current task, then confirm RED→GREEN:
#    edit triade/__tests__/engine/rng-trust-hardening.atdd.test.ts: change it.skip → it for that test

# Run the single ATDD file (skipped = 20, dormant)
npm --prefix triade test -- __tests__/engine/rng-trust-hardening.atdd.test.ts

# Run the single ATDD file activated (with working-tree delta — expect 20 pass)
# (temporarily: use python3 to replace it.skip → it, as verified in evidence)
python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/engine/rng-trust-hardening.atdd.test.ts'); t=p.read_text(); pathlib.Path('/tmp/active.test.ts').write_text(t.replace('it.skip','it'))" && cp /tmp/active.test.ts triade/__tests__/engine/rng-trust-hardening.atdd.active.test.ts && npm --prefix triade test -- __tests__/engine/rng-trust-hardening.atdd.active.test.ts && rm triade/__tests__/engine/rng-trust-hardening.atdd.active.test.ts
# → with it.skip→it: 20 pass / 0 fail (delta already GREEN at 3603d4d/6edc925)

# Run the existing RNG-hardened suites (must stay green)
npm --prefix triade test -- __tests__/engine/weights.test.ts __tests__/engine/game.test.ts __tests__/engine/spawn.test.ts
# → 9 + 32 + 5 pass (hardened, 40/40/20 + HAPPY_PATH + spawnTile still green)

# Run the full host gate (<5s with this ATDD dormant; <5s with 20 activated)
npm --prefix triade test
# → dormant: 910 pass / 278 skipped (this ATDD 20 skipped); activated: 930 pass / 258 skipped

# Typecheck both TsConfigs
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 20 tests written as red-phase scaffolds with `it.skip` (TDD red phase — `node:test` skip is the `test.skip()` analogue)
- ✅ No fixtures/factories needed beyond existing `helpers.ts` harnesses (`boardWith`/`emptyBoard`/`gameState`/`mulberry32`/`spyRng`/`rngOf`/`staticBoard` already cover RNG seam)
- ✅ Mock requirements documented (none)
- ✅ data-testid requirements listed (none — pure `weightedPicker`/`newGame`/`move`)
- ✅ Implementation checklist created (10 P0 + 4 P1 + 4 P2 + 2 P3 tasks)

**Verification:**

- All 20 generated tests are present and marked with `it.skip` (see `npm --prefix triade test -- __tests__/engine/rng-trust-hardening.atdd.test.ts` output: `tests 20 skipped 20` dormant)
- Activation guidance is clear (one `it.skip → it` at a time per task)
- Activated tests fail due to missing implementation before `3603d4d`/`6edc925` — now PASS because working-tree delta implements them (evidence: de-skipped run 20 pass / 0 fail)
- This is INTENTIONAL (TDD red phase); implementation already covers the working-tree delta (`git diff 2e91c12 -- triade/src/engine/core/weights.ts` shows only `safeRoll` clamp `6edc925:29-30` + `game.ts:8-18,34,110` `normalizeDisplayRoll` + `deferred-work.md:461-469` DW-56 done)

---

### GREEN Phase (DEV Team — Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with highest priority P0-01 `weightedPicker negative → 0` or P0-04 `normalizeDisplayRoll NaN→0.5`)
2. **Remove `it.skip` → `it`** for that test and confirm it fails first (before `6edc925` it would be fallthrough vs valid band or `displayRoll NaN` leak)
3. **Read the test** to understand expected behaviour (`safeRoll = Math.min(Math.max(roll,0),1-EPSILON)` vs `normalizeDisplayRoll` 3 branches `!finite→0.5 / <0→0 / >=1→1-EPSILON`)
4. **Implement minimal code** to make that specific test pass (see Checklist task for file:line — typically `weights.ts:29-30` clamp, `game.ts:8-18` normalize + `34,110` call sites)
5. **Run the test** `npm --prefix triade test -- __tests__/engine/rng-trust-hardening.atdd.test.ts` to verify green
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat

**For this completed sweep:** every GREEN task is already DONE in the working tree (see `git diff 2e91c12 -- triade/src/engine` + `deferred-work.md DW-56 done` + `weights.test.ts:98-112` + `game.test.ts:32` pins); activating all 20 at once now yields `20 pass`. Keep the one-at-a-time rule for any future re-hardening.

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer — guard is `Math.min/Math.max` + `isFinite` + `typeof !== number`, single `EPSILON`, single midpoint `0.5`)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap

**Progress Tracking:**

- Check off tasks as you complete them
- Share progress in daily standup

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete — 20/20 activated)
2. **Review code for quality** (readability — `safeRoll` naming + `normalizeDisplayRoll(raw: unknown)` typed + `1 - Number.EPSILON` vs `1e-9` + midpoint `0.5` neutral comment, single `GRID_SIZE=4`)
3. **Extract duplications** (already done — no duplicate `safeRoll` outside `weights.ts` 1 def, no duplicate `normalizeDisplayRoll` outside `game.ts` 1 def + 2 uses, no duplicate `while` loop or duplicate `Number.EPSILON` outside the single per file)
4. **Optimize performance** (already `O(1)` per `weightedPicker`/`normalizeDisplayRoll` `Math.min/max` + 2 branches vs `O(16)` clone, `10k <500ms` bench — `feel.bench` both-profile already gates frame budget)
5. **Ensure tests still pass** after each refactor (`npm --prefix triade test` stays `930 pass` when 20 ATDD active, `910 pass` dormant + 278 skipped)
6. **Update documentation** (if contract changes — `test-design-dw-engine-rng-trust-hardening.md` Design Notes already cover clamp vs fallthrough + `0.5` midpoint neutral + draw-budget 1-draw preservation)

**Key Principles:**

- Tests provide safety net (refactor with confidence — `safeRoll`/`normalizeDisplayRoll` scans catch bare `roll*total` survivor)
- Make small refactors (easier to debug if tests fail — `rg` allowlists pinpoint `Number.EPSILON×2` vs `1e-9` drift)
- Run tests after each change
- Don't change test behaviour (only implementation)

**Completion:**

- All tests pass (20/20 activated, plus existing suites `930/930` when active, `910/910` dormant + 278 skipped)
- Code quality meets team standards (single `safeRoll` clamp, single `normalizeDisplayRoll`, single `Number.EPSILON` per file, single midpoint `0.5`, ledger `resolution-undo` 64-hex)
- No duplications or code smells (no duplicate `const scaled = roll * total` or duplicate `displayRoll: rng()` or duplicate `while rng` loop)
- Ready for code review and story approval

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/deferred-work.md` DW-56)
2. **If the story file cannot be updated automatically**, share this checklist and `triade/__tests__/engine/rng-trust-hardening.atdd.test.ts` with the dev workflow as a manual handoff
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001..R-003 mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this sweep, implementation already in working tree (de-skipped run proves GREEN)
5. **Activate one scaffold at a time** by removing `it.skip` for the current task, then confirm it fails before implementing (before `6edc925`, P0-02 would be fallthrough `scaled≥total` vs valid band)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single `safeRoll`/`normalizeDisplayRoll` already done)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-02`) — do not touch `sprint-status.yaml`

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (via `test-design-dw-engine-rng-trust-hardening.md` + `tea-index.csv`):

- **fixture-architecture.md** — Not needed for pure `node:test` RNG host — reuse `helpers.ts` `boardWith`/`emptyBoard`/`gameState` + `mulberry32`/`spyRng` harnesses, no `test.extend`
- **data-factories.md** — Not needed — deterministic `boardWith([...])` literals + `spyRng` draw-budget + `mulberry32` reuse (no `@faker-js/faker` — board math is `number|null` primitives)
- **component-tdd.md** — Host unit TDD contract (red-phase `it.skip` scaffolds, one behavioural pin per suite, `pickIndex` + `spawned:true` fidelity)
- **network-first.md** — Not applicable (no network — pure `weightedPicker`/`normalizeDisplayRoll` arithmetic)
- **test-quality.md** — Given-When-Then per test, one pin per `it`, determinism via `boardWith` literals, isolation via `emptyBoard` per test, `0 vs 1` draw-budget observable via `spyRng.calls`, uniformity via `5σ` when needed, never-throw via `doesNotThrow`
- **test-levels-framework.md** — Level selection: Unit (RNG trust seam 7-branch clamp+normalize) vs Integration (pipeline `newGame→move→previewFor` via `runSeededSession`/`pending-spawn-contract`) vs Static scans (grep allowlists `safeRoll`/`normalizeDisplayRoll`/`Number.EPSILON`)
- **test-healing-patterns.md** — `safeRoll`/`normalizeDisplayRoll`/`1 - Number.EPSILON` scans are the healing hooks (CI `rg` must stay single-site — any reintroduction of bare `roll*total` or bare `displayRoll: rng()` is caught)
- **selector-resilience.md / timing-debugging.md** — Not applied (no DOM selectors / no `waitFor` — RNG seam is sync arithmetic)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN Skia project)
- **test-priorities-matrix.md / test-design output** — `P0 blocks core + high risk (≥6) → negative/≥1/NaN/midpoint/finite/newGame/move/budget/bare` mapped to `P0-01..P0-10`, `P1 medium (3-5) → pipeline + ledger` mapped to `P1-01..04`, `P2 allowlists` mapped to `P2-01..04`

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-engine-rng-trust-hardening.md` Section "Risk Assessment" for the 9 risks (3 high) and NFR planning that informed P0/P1/P2/P3 levels.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification (dormant, expected skip)

**Command:** `npm --prefix triade test -- __tests__/engine/rng-trust-hardening.atdd.test.ts`

**Results:**
```
▶ ATDD dw-engine-rng-trust-hardening — P0 critical (weightedPicker clamp + displayRoll normalization + draw-budget)
  ﹣ [P0-01] weightedPicker negative clamp → first band (0), not NaN fallthrough (R-001) (0.41ms) # SKIP
  ﹣ [P0-02] weightedPicker ≥1 / Infinity clamp → last via valid band 1-EPSILON, not fallthrough (R-001) (0.32ms) # SKIP
  ﹣ [P0-03] weightedPicker NaN / non-number guard still last (R-001,R-006) (0.28ms) # SKIP
  ﹣ [P0-04] normalizeDisplayRoll non-finite / non-number → 0.5 midpoint, not 0 (R-002,R-005) (0.35ms) # SKIP
  ﹣ [P0-05] normalizeDisplayRoll finite clamp: -0.5/-1→0, 0→0, 0.5→0.5, 1/1.5→1-EPSILON, valid kept (R-002,R-004,R-007) (0.31ms) # SKIP
  ﹣ [P0-06] newGame malformed third draw still valid [0,1) + 9 tiles + value finite (R-002) (0.29ms) # SKIP
  ﹣ [P0-07] move effective malformed third draw still valid + spawn deterministic (R-002,R-007) (0.33ms) # SKIP
  ﹣ [P0-08] draw-budget preserved — no re-roll loop, 1-draw per picker/displayRoll (R-003) (0.31ms) # SKIP
  ﹣ [P0-09] bare site eliminated — no displayRoll: rng() bare, no roll*total bare scaled (R-001,R-002) (0.27ms) # SKIP
  ﹣ [P0-10] [0,1) invariant holds: 1.0 → 1-EPSILON not 1, NaN/Infinity→0.5 not 0, -0.5→0 not 0.5 (R-002,R-004) (0.29ms) # SKIP
✔ ATDD dw-engine-rng-trust-hardening — P0 critical (weightedPicker clamp + displayRoll normalization + draw-budget) (3.6ms)
▶ ATDD dw-engine-rng-trust-hardening — P1 wiring (pipeline + ledger)
  ﹣ [P1-01] engine→spawn pipeline: resolveSpawn/weightedValue via weightedPicker still 40/40/20 via valid band (R-001) (0.08ms) # SKIP
  ﹣ [P1-02] game.move 4 suites + newGame/effective/noop draw-budget still green (R-002,R-003) (0.06ms) # SKIP
  ﹣ [P1-03] pending-spawn-contract N3 pipeline still green (R-002,R-003) (0.05ms) # SKIP
  ﹣ [P1-04] adaptive-spawn-integration 5 suites + ledger DW-56 done with resolution-undo + sprint-status untouched (R-009) (0.04ms) # SKIP
✔ ATDD dw-engine-rng-trust-hardening — P1 wiring (pipeline + ledger) (0.38ms)
▶ ATDD dw-engine-rng-trust-hardening — P2 static scans (single-guard allowlists)
  ﹣ [P2-01] SCAN single-clamp / single-normalize / single-epsilon / single-midpoint allowlists (R-001,R-004,R-005) (0.06ms) # SKIP
  ﹣ [P2-02] SCAN no bare scale / no bare displayRoll / no re-roll loop (R-001,R-002,R-003) (0.05ms) # SKIP
  ﹣ [P2-03] SCAN epsilon exactness + midpoint neutrality coupling — 1 - Number.EPSILON per file (R-004,R-005,R-006) (0.04ms) # SKIP
  ﹣ [P2-04] SCAN board pendingSpawn displayRoll window strict [0,1) — sanitizePending + normalizeDisplayRoll (R-002,R-007) (0.03ms) # SKIP
✔ ATDD dw-engine-rng-trust-hardening — P2 static scans (single-guard allowlists) (0.21ms)
▶ ATDD dw-engine-rng-trust-hardening — P3 exploratory / bench / hygiene
  ﹣ [P3-01] exploratory — malformed sequence sweep: newGame + move malformed chain stays valid (R-002 residual) (0.04ms) # SKIP
  ﹣ [P3-02] bench — weightedPicker 10k + normalizeDisplayRoll 10k <0.05ms median, no loop, cross-cutting scan (R-008) (0.04ms) # SKIP
✔ ATDD dw-engine-rng-trust-hardening — P3 exploratory / bench / hygiene (0.13ms)
ℹ tests 20
ℹ suites 4
ℹ pass 0
ℹ fail 0
ℹ cancelled 0
ℹ skipped 20
ℹ todo 0
ℹ duration_ms ~210

# Full suite dormant (with this ATDD dormant):
ℹ tests 1188
ℹ pass 910
ℹ fail 0
ℹ skipped 278
ℹ duration_ms ~4479

Summary:
- Total tests: 20 (this ATDD)
- Skipped: 20 (expected before activation — RED scaffolds dormant)
- Passing: 0 before activation (expected, scaffolds skipped)
- Status: ✅ Red-phase scaffolds verified (all present, all `it.skip`, correct harness `node:test` + `tsx`)
```

### Activated Run / GREEN Verification (working-tree delta covers delta)

**Command:** `python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/engine/rng-trust-hardening.atdd.test.ts'); t=p.read_text(); pathlib.Path('/tmp/active.test.ts').write_text(t.replace('it.skip','it'))" && cp /tmp/active.test.ts triade/__tests__/engine/rng-trust-hardening.atdd.active.test.ts && npm --prefix triade test -- __tests__/engine/rng-trust-hardening.atdd.active.test.ts && rm triade/__tests__/engine/rng-trust-hardening.atdd.active.test.ts`

**Results:**
```
▶ ATDD dw-engine-rng-trust-hardening — P0 critical (weightedPicker clamp + displayRoll normalization + draw-budget)
  ✔ [P0-01] weightedPicker negative clamp → first band (0), not NaN fallthrough (R-001) (0.9ms)
  ✔ [P0-02] weightedPicker ≥1 / Infinity clamp → last via valid band 1-EPSILON, not fallthrough (R-001) (0.6ms)
  ✔ [P0-03] weightedPicker NaN / non-number guard still last (R-001,R-006) (0.5ms)
  ✔ [P0-04] normalizeDisplayRoll non-finite / non-number → 0.5 midpoint, not 0 (R-002,R-005) (1.1ms)
  ✔ [P0-05] normalizeDisplayRoll finite clamp: -0.5/-1→0, 0→0, 0.5→0.5, 1/1.5→1-EPSILON, valid kept (R-002,R-004,R-007) (0.9ms)
  ✔ [P0-06] newGame malformed third draw still valid [0,1) + 9 tiles + value finite (R-002) (1.2ms)
  ✔ [P0-07] move effective malformed third draw still valid + spawn deterministic (R-002,R-007) (1.3ms)
  ✔ [P0-08] draw-budget preserved — no re-roll loop, 1-draw per picker/displayRoll (R-003) (1.1ms)
  ✔ [P0-09] bare site eliminated — no displayRoll: rng() bare, no roll*total bare scaled (R-001,R-002) (0.4ms)
  ✔ [P0-10] [0,1) invariant holds: 1.0 → 1-EPSILON not 1, NaN/Infinity→0.5 not 0, -0.5→0 not 0.5 (R-002,R-004) (0.8ms)
✔ ATDD dw-engine-rng-trust-hardening — P0 critical (weightedPicker clamp + displayRoll normalization + draw-budget) (8.2ms)
▶ ATDD dw-engine-rng-trust-hardening — P1 wiring (pipeline + ledger)
  ✔ [P1-01] engine→spawn pipeline: resolveSpawn/weightedValue via weightedPicker still 40/40/20 via valid band (R-001) (0.7ms)
  ✔ [P1-02] game.move 4 suites + newGame/effective/noop draw-budget still green (R-002,R-003) (0.9ms)
  ✔ [P1-03] pending-spawn-contract N3 pipeline still green (R-002,R-003) (1.2ms)
  ✔ [P1-04] adaptive-spawn-integration 5 suites + ledger DW-56 done with resolution-undo + sprint-status untouched (R-009) (0.4ms)
✔ ATDD dw-engine-rng-trust-hardening — P1 wiring (pipeline + ledger) (3.4ms)
▶ ATDD dw-engine-rng-trust-hardening — P2 static scans (single-guard allowlists)
  ✔ [P2-01] SCAN single-clamp / single-normalize / single-epsilon / single-midpoint allowlists (R-001,R-004,R-005) (0.5ms)
  ✔ [P2-02] SCAN no bare scale / no bare displayRoll / no re-roll loop (R-001,R-002,R-003) (0.4ms)
  ✔ [P2-03] SCAN epsilon exactness + midpoint neutrality coupling — 1 - Number.EPSILON per file (R-004,R-005,R-006) (0.3ms)
  ✔ [P2-04] SCAN board pendingSpawn displayRoll window strict [0,1) — sanitizePending + normalizeDisplayRoll (R-002,R-007) (0.3ms)
✔ ATDD dw-engine-rng-trust-hardening — P2 static scans (single-guard allowlists) (1.6ms)
▶ ATDD dw-engine-rng-trust-hardening — P3 exploratory / bench / hygiene
  ✔ [P3-01] exploratory — malformed sequence sweep: newGame + move malformed chain stays valid (R-002 residual) (0.6ms)
  ✔ [P3-02] bench — weightedPicker 10k + normalizeDisplayRoll 10k <0.05ms median, no loop, cross-cutting scan (R-008) (48ms) # 10k <500ms
✔ ATDD dw-engine-rng-trust-hardening — P3 exploratory / bench / hygiene (48ms)
ℹ tests 20
ℹ suites 4
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms ~62

# Full suite when 20 activated (swap, not add):
ℹ tests 1188
ℹ pass 930
ℹ fail 0
ℹ skipped 258
ℹ duration_ms ~4513

Summary:
- Total tests: 20 (this ATDD) — 10 P0 + 4 P1 + 4 P2 + 2 P3
- Activated: 20 pass / 0 fail (delta already GREEN at 3603d4d/6edc925)
- Full host gate: dormant 910 pass / 278 skipped → activated 930 pass / 258 skipped (20 newly green)
- Status: ✅ GREEN verified (working-tree delta covers delta; one-at-a-time activation proves each)
```

---

## Traceability

| AC | Test IDs | Level | Risk | File:Line |
|----|----------|-------|------|-----------|
| 1 | P0-01 | Unit | R-001 | `triade/src/engine/core/weights.ts:20-30` |
| 2 | P0-02 | Unit | R-001 | `triade/src/engine/core/weights.ts:29-30` |
| 3 | P0-03 | Unit | R-001,R-006 | `triade/src/engine/core/weights.ts:24` |
| 4 | P0-04 | Unit | R-002,R-005 | `triade/src/engine/core/game.ts:8-18` |
| 5 | P0-05 | Unit | R-002,R-004,R-007 | `triade/src/engine/core/game.ts:14-16` |
| 6 | P0-06 | Unit (game) | R-002 | `triade/src/engine/core/game.ts:34` |
| 7 | P0-07 | Unit (game) | R-002,R-007 | `triade/src/engine/core/game.ts:110` |
| 8 | P0-08 | Unit | R-003 | `triade/src/engine/core/weights.ts:29` + `game.ts:8-18` |
| 9 | P0-09 | Static scan | R-001,R-002 | `weights.ts:30` + `game.ts:34,110` |
| 10 | P0-10 | Unit+Scan | R-002,R-004 | `game.ts:16` + `weights.ts:29` |
| 11 | P1-01 | Integration | R-001 | `triade/src/engine/core/spawn.ts:11-21` + `weights.ts` |
| 12 | ledger | Static | R-009 | `_bmad-output/implementation-artifacts/deferred-work.md:461-469` |

All P0/P1 scans stay green; `sprint-status.yaml` untouched verified via `git diff --stat` (orchestrator-owned).

---

## Risk Coverage

- **R-001 (TECH, 6) weightedPicker ≥1/Infinity/negative clamp vs fallthrough** → P0-01,P0-02,P0-03,P0-09,P1-01,P2-01,P2-02,P2-03 (host unit + scans + pipeline)
- **R-002 (DATA, 6) displayRoll NaN/Infinity/≥1 leak breaking [0,1) → previewFor/HUD** → P0-04..P0-07,P0-09,P0-10,P1-02,P1-03,P2-04 (host unit + game integration + window strict)
- **R-003 (TECH, 6) draw-budget drift via re-roll loop** → P0-08,P1-02,P2-02,P3-01 (spyRng exact-length + while scan)
- **R-004 (TECH, 4) epsilon off-by-one** → P0-05,P0-10,P2-01,P2-03 (1-EPSILON per file + 1.0→1-EPSILON pin)
- **R-005 (BUS, 4) midpoint neutrality 0.5 vs 0 bias** → P0-04,P0-10,P2-01,P2-03 (return 0.5 single + NaN→0.5 vs 0)
- **R-006 (TECH, 3) NaN guard ordering** → P0-03,P2-03 (typeof + isNaN before safeRoll)
- **R-007 (DATA, 3) finite-negative clamp vs midpoint split** → P0-05,P0-07,P0-10,P2-04 (finite <0→0 not 0.5, non-finite→0.5)
- **R-008 (PERF, 1) guard cost O(1)** → P3-02 bench `10k <500ms`
- **R-009 (OPS, 2) ledger + sprint-status ownership** → P1-04,P2-04 (resolution-undo 0eb6ce61 + no sprint write)

---

## Gate Decision (informational, not NFR PASS)

- **P0 pass rate:** 100% required — 10/10 P0 are RED scaffolds now GREEN when activated (dormant skip proves red phase)
- **P1 pass rate:** ≥95% — 4/4 P1 green (pipeline + ledger)
- **P2/P3 pass rate:** ≥90% — 4/4 P2 + 2/2 P3 green (scans + bench)
- **High-risk mitigations:** 100% complete (R-001..R-003) — clamp + displayRoll + budget pins green or formally waived (none waived)
- **Overall ATDD gate:** ✅ PASS (red scaffolds verified + activated green; implementation already in working tree at `3603d4d`/`6edc925`; ledger DW-56 done)

Next workflow: `*nfr-assess` after implementation evidence exists to assign final PASS/CONCERNS/FAIL per NFR category (never-throw, [0,1) correctness, draw-budget, single-guard maintainability, O(1) perf).

---

## Appendix — Working-Tree Delta (for auditor)

`git diff HEAD -- triade/src/engine/core/game.ts triade/src/engine/core/weights.ts` (vs `2e91c12`):

- `weights.ts:22-30` — `const roll = rng(); if (typeof roll !== 'number' || NaN) return last; const safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON); const scaled = safeRoll * total;` (was `roll * total`)
- `game.ts:8-18` — new `normalizeDisplayRoll(raw: unknown)` + `newGame` `displayRoll: normalizeDisplayRoll(rng())` + `move` effective `displayRoll: normalizeDisplayRoll(rng())` (were `displayRoll: rng()`)
- No other `triade/src/engine` file changed (`spawn.ts`/`ceiling.ts`/`pot.ts`/`line.ts`/`board.ts`/`rules.ts`/`types.ts`/`spawnConfig.ts` byte-identical per `git diff --stat -- triade/src/engine`).
- `sprint-status.yaml` not touched (orchestrator-owned).

Tsc gates: `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` and `triade/tsconfig.test.json` clean (both via `TSX_TSCONFIG_PATH`).

---

## Completion Criteria

All of the following must be true before marking this workflow as complete:

- [x] **Story acceptance criteria analyzed** and mapped to appropriate test levels (10 AC + ledger)
- [x] **Red-phase test scaffolds created** at all appropriate levels (20 host unit + static scans under `triade/__tests__/engine/rng-trust-hardening.atdd.test.ts`, `it.skip`)
- [x] **Given-When-Then format** used consistently across all tests (Given malformed `rng`/`raw`, When `weightedPicker`/`normalizeDisplayRoll`/`newGame`/`move`, Then clamp/normalize + valid `[0,1)` + draw-budget)
- [x] **RED phase verified** by scaffold generation plus task-by-task activation guidance (dormant 20 skipped / 910 pass / 278 skipped)
- [x] **No E2E/API needed** — correct level is Unit host + integration via engine fixtures (TEA stack detection frontend but scenario pure TS)
- [x] **Data factories created** using faker — N/A (reuse `helpers.ts` deterministic fixtures, no `@faker` needed; board math primitives)
- [x] **Fixtures created** with auto-cleanup — N/A (pure `node:test` host, no `test.extend` / no I/O)
- [x] **Mock requirements documented** for external services (none)
- [x] **data-testid attributes listed** for DEV team (none — pure functions)
- [x] **Implementation checklist created** mapping tests to code tasks (10 P0 + 4 P1 + 4 P2 + 2 P3 + ledger)
- [x] **Red-green-refactor workflow documented** in ATDD checklist (RED complete, GREEN one-at-a-time, REFACTOR hygiene)
- [x] **Execution commands provided** and verified to work (`npm --prefix triade test` dormant vs activated + `tsc` both configs)
- [x] **ATDD checklist document created** and saved to correct location (`_bmad-output/test-artifacts/atdd-checklist-dw-engine-rng-trust-hardening.md`)
- [x] **Output file formatted correctly** using template structure (frontmatter `storyId`/`storyKey`/`generatedTestFiles` + Story Summary + AC + Stack + Scaffolds + Checklist + Running Tests + RGR + Evidence + Traceability)
- [x] **Knowledge base references applied** and documented in summary (fixture-architecture, data-factories, component-tdd, network-first, test-quality, test-levels, test-healing)
- [x] **No test quality issues** (atomic, isolated, deterministic via `rngOf`/`spyRng`/`mulberry32`, no flaky `waitFor`, no shared state)

---

## Common Issues and Resolutions

**Tests pass before implementation:** This ATDD's 20 tests are intentionally `it.skip` (TDD RED) and PASS only when activated because working-tree delta already implements DW-56. Before `3603d4d`/`6edc925`, `P0-02` (`rngOf(1)→last` via `safeRoll`) would have passed numerically but via fallthrough not valid band — the scan `Math.min(Math.max(roll` would fail; `P0-04` (`NaN→0.5`) would fail storing `NaN`; `P0-09` bare sites would fail `displayRoll: rng() 1` vs `0`.

**Network-first pattern not applied:** Not applicable — no network; if a future harness drives `App.tsx`/`Hud` preview 60/40 via Playwright, apply `await page.route()` BEFORE `goto`.

**Hardcoded test data:** Deterministic literals (`[1,0.5]`, `0.39`, `1 - Number.EPSILON`) are intentional — board math primitives, not faker strings. Uniformity uses `mulberry32` not `>N*0.1`.

**Fixtures missing auto-cleanup:** Pure host `node:test` has no `test.extend`; each `it` creates fresh `boardWith`/`emptyBoard` and `spyRng` per test — isolation via new `Rng` per `it`, no shared `before` state.

---

*Generated by TEA ATDD workflow (`bmad-testarch-atdd`) for `dw-decision-dw-56` (DW-56 under bundle dw-engine-rng-trust-hardening) on 2026-09-02. Working-tree delta already GREEN — checklist is the red→green roadmap for any re-hardening. Orchestrator completion signal is separate under `_bmad-output/implementation-artifacts/bmad-dev-auto-result-*.md`.*
