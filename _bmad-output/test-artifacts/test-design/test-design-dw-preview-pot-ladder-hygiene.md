---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-preview-pot-ladder-hygiene.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/App.tsx'
  - 'triade/test-utils/e2e/GameE2ETestFixture.ts'
  - 'triade/__tests__/engine/weights.test.ts'
  - 'triade/__tests__/engine/adaptive-spawn-integration.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-preview-pot-ladder-hygiene — Tighten weight floor, dedupe state reconstruction, assert tier-0 ceiling exception

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep bundle deep-dive for `dw-preview-pot-ladder-hygiene`
**Scope:** Targeted test design for the working-tree delta of `dw-preview-pot-ladder-hygiene`

> **Delta under assessment:** Working-tree `git diff` vs `HEAD 3a6038e` (spec `spec-preview-pot-ladder-hygiene.md` intent/boundaries/I-O matrix 4 rows, Design Notes). HEAD is `3a6038e` (after `sweep dw-layout-band-dedup-and-guard`); `HEAD` is clean except 14 working-tree files (no index). The sweep resolves DW-61 / DW-62 / DW-63 to `done` via hygiene hardening — no preview or engine byte change (only additive helper + tighter gate + new assertion):
> - `triade/src/engine/core/game.ts` — adds `export function stateFromResult(result: MoveResult): GameState { return { board: result.board, pendingSpawn: result.pendingSpawn }; }` (trivial, board ref shared same as manual literal, pendingSpawn ref shared; no ADR-06 deep copy, no logic change)
> - `triade/src/engine/core/index.ts` — re-exports `stateFromResult` (`export { newGame, move, isGameOver, stateFromResult }`)
> - `triade/test-utils/helpers.ts` — imports `stateFromResult` from engine, updates `runSeededSession` internals `snapshots.push(stateFromResult(res))` + `state = stateFromResult(res)`, re-exports `export { stateFromResult } from '../src/engine/core/index.ts'` for test ergonomics
> - `triade/App.tsx` — `import { ..., stateFromResult }` + `setGame(stateFromResult(result))` replacing `setGame({ board: result.board, pendingSpawn: result.pendingSpawn })`
> - `triade/test-utils/e2e/GameE2ETestFixture.ts` — `import { ..., stateFromResult }` + `this.state = stateFromResult(result)`
> - `triade/__tests__/engine/weights.test.ts` — imports `sigmaBound` + `POT_WEIGHT`, replaces `assert.ok(potSamples > N * 0.1)` floor with dual gate `Math.abs(potRatio - POT_WEIGHT) < sigmaBound(POT_WEIGHT, N)` (`≈0.0063` at `N=100k, z=5`) AND `Math.abs(potRatio - POT_WEIGHT) < 0.01` absolute backstop
> - `triade/__tests__/engine/adaptive-spawn-integration.test.ts` — `rewind shape` replays via `game.stateFromResult(r1)` (was literal), new test `[P1] tier-0 ceiling-ordering exception: pot value 3 legitimately exceeds tiny ceiling 0/1/2` (2000 draws each, `sawThree && sawExceeding` for ceilings 0/1/2, asserts `isValidSpawnValue` + `v===1||2||3` domain)
> - `triade/__tests__/engine/engine.smoke.test.ts`, `triade/__tests__/render/render.smoke.test.ts` (2 sites), `triade/__tests__/integration/session.integration.test.ts`, `triade/__tests__/smoke/criticalPath.smoke.test.ts`, `triade/__tests__/smoke/directional-spawn.smoke.test.ts` (2 sites), `triade/__tests__/feel/bulletTime.atdd.test.ts` — each replaces `state = { board: result.board, pendingSpawn: result.pendingSpawn }` with `stateFromResult(result)` / `game.stateFromResult(result)` import
> - `triade/src/engine` byte-identical except additive `stateFromResult` (verified `git diff --stat -- triade/src/engine` shows `game.ts +4 / index.ts 1 change`, preview `triade/src/game/preview` empty)
> - `deferred-work.md` DW-61/62/63 remain `done` via prior sweep bundle `dw-preview-pot-ladder-hygiene` hygiene (this bundle consolidates the working-tree delta)

---

## Executive Summary

**Scope:** Hygiene sweep that (1) tightens the `weights.test.ts` pot-sampling floor from `> N*0.1` (catches only catastrophic starvation — passes with half the pot probability missing) to a sigma-scaled `5σ ≈0.63%` gate plus `±1%` absolute backstop, (2) extracts the 9-site ad-hoc `{ board: result.board, pendingSpawn: result.pendingSpawn }` literal into a single `stateFromResult` helper used by `App.tsx`, `GameE2ETestFixture`, `helpers.runSeededSession` and 5 smoke/integration/feel suites, and (3) pins the documented tier-0 ceiling-ordering harmless exception (pot `3 > ceiling 0/1/2`) that was previously the exact case *excluded* from the `tier>=1 v<=ceiling` test and asserted nowhere — so a future refactor cannot silently "fix" the exception away.

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (≥6): 2
- Critical categories: TECH (sigma gate flake vs starvation-trip, single-helper dedup drift), BUS/TECH (tier-0 exception misread as bug)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit + smoke/integration green — `sigmaBound` dual gate pin, 9-site dedup grep, tier-0 exception observable, rewind shape via helper, engine purity/preview byte-identical)
- P1 scenarios: 5 groups (draw-budget preservation + `helpers` re-export seam + `runSeededSession` tier dedup still deterministic + ceiling-ordering `tier>=1` companion)
- P2/P3 scenarios: 6 groups (static allowlists for no ad-hoc literal / no `>N*0.1` floor / single helper definition + tier-0 domain scan + sigma budget doc + exploratory clipping)
- **Total effort**: ~3–6 hours (~0.5–0.9 days; host-only, no device lane)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/spawn/score/previewFor/HUD, `pickCombined` bands `[0.4,0.8,1.0]`, `potForTier`/`potWeights`/`normalizeTo`/`weightedPicker` logic, `ceilingDetector`/`tierForCeiling` formula, `Board`/`PendingSpawn` shape** | Engine is byte-identical except additive `stateFromResult` (`git diff --stat -- triade/src/engine` empty save 5 lines, `triade/src/game/preview` empty). Sweep only changes the harness that observes it and the statistical gate threshold. | Engine invariants stay gated by 858 existing host tests + 10 expected-RED feel ATDD (unchanged) + `git diff` empty preview check in this plan. No preview/engine logic re-derived. |
| **`spawnTile` directional edge / draw budget `effective=3 / noop=0 / newGame=20`, `displayRoll` `[0,1)`, `transitionPlan`/`rank`/`GameBoard`/`matchScore` wiring** | Untouched; `App.tsx` now calls `stateFromResult` but the `MoveResult` it receives is unchanged. | Existing `adaptive-spawn-integration`/`engine.smoke`/`render.smoke`/`directional-spawn`/`criticalPath` suites remain gate (already green after helper extraction). |
| **`mulberry32`, `oppositeEdgeCandidates`, `preSpawnBoardOf`, `sigmaBound` formula itself** | Untouched helpers; `sigmaBound(POT_WEIGHT,N)` already shared with 2.6+7.1 suites. This sweep only tightens the gate that *consumes* `sigmaBound`, not the helper. | Existing 2.6+7.1 suites remain gate; this plan only verifies they keep passing after the gate tightening. |
| **Real lexer / `stripComments` / `stripCommentsAndStrings` scanner parser** | Belongs to `dw-test-scanner-helpers-hardening`; no change here (`helpers.ts` import block is the only edit beyond `runSeededSession` + re-export). | That bundle's design already covers the scanner true/false positive risks. |
| **Deferred-work ledger edits beyond DW-61/62/63 `done` with `resolution-undo` hash** | Ledger already lists 80 entries; only 3 move to `done` this sweep, each with `resolution-undo: ac1bd5ea…`. | Other DW entries (e.g. `boardSize` clamp, `ceilingDetector`, `pickIndex` NaN) remain `open`/`already resolved` and are not re-triaged here. |
| **Benchmark / frame-rate `feel.bench.test.ts` both-profile lane** | `package.json` `test`/`benchmark` scripts unchanged; helper is O(1) trivial and tests are `<1 ms`. | No new bench lane; host `npm test` stays `<15 min`, device baseline unchanged. |
| **RevenueCat / AdMob / IAP / Epic 10-11 monetization** | No monetization code touched. | Existing suites remain gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `stateFromResult` is a trivial pure pure function `({board, pendingSpawn}) => {board, pendingSpawn}` with no branching; `weights.test.ts` dual gate is driven by `mulberry32(0x2a4d)` at `N=100k` (deterministic, same seed pre/post tightening); tier-0 exception test loops `resolveSpawn(ceiling, mulberry32(0x51ce+ceiling+0x100))` at `ceiling 0/1/2` with 2000 draws (observable, no device).

**Observability — Good.** Dual gate failure message names `pot share ratio ${potRatio.toFixed(4)} vs expected ${POT_WEIGHT} outside 5σ (${sigmaBound…})` so a starvation regression is immediately distinguishable from a within-pot ratio drift; `stateFromResult` is a single definition site (`game.ts:93-95`) re-exported via `index.ts:18` and `helpers.ts:216` — `grep` for the literal `board: result.board` must hit only the definition.

**Reliability — Strong.** Helper preserves the pre-existing board ref-sharing semantics (engine mutates `board` in place via `spawnTile`, callers never mutate `result.board`), so no snapshot isolation change; engine never throws on helper path; `sigmaBound` is `Number.isFinite`-guarded (`helpers.ts:116-119`) and the `5σ` gate at `0.0063` is `≈0.4×` tighter than the surrounding `±1%` absolute gates (not `≈10σ` knife-edge — see R-001).

**Testability Risks:** Two surfaces are thin: (a) `stateFromResult` looks so trivial that a future editor could justify re-inlining `{ board: result.board, pendingSpawn: result.pendingSpawn }` at one call site — regressing the dedup to 8 sites and drifting `ADR-06 shallow-copy` nuance; mitigated by a P0 grep gate. (b) The `5σ` gate could become knife-edge if a future seed rotation lowers the `0x2a4d` first-draw determinism — mitigated by the `±1%` absolute backstop (the design keeps both).

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Sigma-scaled gate flake — `Math.abs(potRatio - 0.2) < sigmaBound(0.2, 100k)` at `5σ≈0.0063` could flake on a future seed rotation or CI `mulberry32` substitute.** The gate replaces the catastrophically loose `> N*0.1` floor (which hid half-missing pot probability) with `dual` `5σ` + `±1%`. At the pinned `0x2a4d` seed both gates are green (`26/26 weights tests pass`), but a future rotation that pushes `potRatio` to `0.193` (within `±1%` but outside `5σ`) would flip RED despite the spec saying `±1%` is the product threshold. Conversely, dropping back to `>10%` is not an option — it masks DW-61's reason to exist. | 2 | 3 | **6** | Keep **dual gate as landed**: `helpers.ts` already gates `Math.abs(potRatio - POT_WEIGHT) < sigmaBound(POT_WEIGHT,N)` **AND** `Math.abs(potRatio - POT_WEIGHT) < 0.01`. On a future seed rotation that straddles `0.0063–0.01`, either widen `N` (e.g. `150k`) or keep the `0.01` backstop as the release threshold and treat the `5σ` signal as `CONCERNS` not `BLOCK`. Document in `weights.test.ts:140` comment that `sigmaBound` is the hygiene gate, `0.01` is the product gate. |
| R-002 | TECH | **Single-helper dedup drift — a new `move()` consumer re-inlines `{ board: result.board, pendingSpawn: result.pendingSpawn }` instead of calling `stateFromResult`, reintroducing drift.** Sweep replaced 9 sites (`App.tsx`, `helpers.runSeededSession` 2×, `GameE2ETestFixture`, `engine.smoke`, `render.smoke` 2×, `session.integration`, `criticalPath`, `directional-spawn` 2×, `bulletTime.atdd`, `adaptive-spawn-integration` rewind). A follow-on story (e.g. new `preview-invariant` harness, or an `undo` spec) that copies the literal instead of importing the helper silently re-creates the 10th ad-hoc site — future callers that forget the `{...pendingSpawn}` shallow-copy subtlety (ADR-06) could drift on the `noop` path, and the literal would escape the single-source gate. | 2 | 3 | **6** | Gate: **`rg -n "board: result\.board" triade --include="*.ts" --include="*.tsx"` must show exactly 1 hit (inside `game.ts:93 stateFromResult`)** — any second hit is a FAIL. Keep helper exported via both `engine/core/index.ts` and `test-utils/helpers.ts` so tests can `import { stateFromResult } from '../../test-utils/helpers.ts'` without reaching into `src/engine`. |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | BUS | **Tier-0 exception misread as defect — a future reviewer "fixes" the `3 > ceiling 0/1/2` exception by clamping `resolveSpawn` or changing `potForTier(0)` to `[]` or `[1,2]`.** Historically the exception was the exact case *excluded* from `tier>=1 v<=ceiling` and asserted nowhere (DW-63); now it is pinned by a 2000-draw `sawThree && sawExceeding` test. Impact is direct if someone changes pot composition to "honour" the ceiling at tier-0. | 2 | 2 | 4 | Keep the exception test as landed (`adaptive-spawn-integration.test.ts:296` `// Game.ts:64-69 documents that tier-0 is the harmless exception … We pin that the exception actually occurs`) and keep the `game.ts:64-69` doc. On any `pot.ts`/`resolveSpawn` edit that changes tier-0 pot, update the exception test together (treat as atomic) and leave the `3>ceiling` allowance for `ceiling 0/1/2` intact — the spec says **Never mutate engine to fix tier-0 exception (it is documented harmless)**. |
| R-004 | TECH | **Board ref-sharing subtlety — `stateFromResult` returns `{ board: result.board, pendingSpawn: result.pendingSpawn }` sharing the board ref; a caller that mutates `result.board` and then calls `stateFromResult` on the mutated result corrupts both.** The manual literal had the same semantics (no clone), so not a new bug, but the helper makes the alias explicit — a `cloneBoard(result.board)` refactor would change semantics (would decouple snapshots from the engine's mutate-in-place contract). | 1 | 3 | 3 | Keep helper shallow as landed; doc in `game.ts:93-95` that board ref is shared by design (`engine mutates board in place via spawnTile`). Pin via `adaptive-spawn-integration.test.ts:289 rewind shape` (`game.stateFromResult(r1)` vs manual `{...r1.pendingSpawn}` deepEqual) which proves alias does not affect the next `move()`. Any future deep-clone change must pass that rewind test. |
| R-005 | TECH | **`helpers.ts` re-export drift — `test-utils/helpers.ts` re-exports `stateFromResult` via `export { stateFromResult } from '../src/engine/core/index.ts'` duplicating the engine export symbol; a future `index.ts` rename (e.g. `stateFromMoveResult`) would need a 2-file rename.** | 1 | 2 | 2 | Keep re-export as landed; grep `rg -n "stateFromResult" triade --include="*.ts"` shows 3 definition/re-export sites (`game.ts`, `index.ts`, `helpers.ts`) plus 9 consumers — treat renames as `rg`-checked atomic commits. No gate beyond `tsc` clean. |
| R-006 | TECH | **Draw-budget preservation — `App.tsx` now calls `stateFromResult(result)` where before it inlined the literal; `helpers.runSeededSession` internal progression `snapshots.push(stateFromResult(res)); state = stateFromResult(res)` must not change the RNG budget.** The helper consumes 0 draws (pure destructure), so `move()` `3`-draw + `newGame` `20`-draw budgets stay intact, but a future helper that defensively clones `pendingSpawn` via `rng()` would consume an unintended draw. | 1 | 2 | 2 | Pin via existing draw-count tests (`adaptive-spawn-integration.test.ts:68 `AC4 effective 3 draws [0,0.9,0.5]` + line 76 `newGame 20 draws` + `spyRng` exact `[0,0.9,0.5]` deepEqual) which remain green after the sweep — any extra draw breaks them. Keep helper pure (no `rng` param). |
| R-007 | OPS | **Deferred-work ledger `resolution-undo` hash coupling — DW-61/62/63 flipped `open→done` with 64-hex `resolution-undo` on prior bundle `ac1bd5e`; orchestrator's `sprint-status.yaml` is orchestrator-owned.** A follow-on `sweep` that reopens an entry without preserving the hash loses the revert trail. | 1 | 2 | 2 | Ledger already records `resolution-undo: ac1bd5ea06c0d2ad96d3691d63172b22d6b090a3ddbb09837137305667161f05 2026-09-01 …` per entry; any reopen must keep it. `sprint-status.yaml` is orchestrator-owned per prompt — this plan never writes it. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | TECH | **Tier-0 exception test domain over-lock — `assert.ok(v===1||2||3)` for `ceiling 0/1/2` locks the tier-0 spawn domain to `{1,2,3}`; a legitimate future `potForTier(0)=[1,2]` would fail the `sawThree` gate despite being a product change, not a helper bug.** | 1 | 2 | 2 | Monitor — keep `{1,2,3}` domain lock as landed (it documents the current pot); on any `pot.ts: potForTier(0)` intentional change, update the exception test's domain + `sawThree` gate together (treat as atomic). No gate beyond existing suite. |
| R-009 | DATA | **Magic `displayRoll: 0.5` pad semantics — every effective `move()` still carries a `0.5` displayRoll pad in tests that use `rngOf(0,0,0.5)` (from `dw-test-scanner-helpers-hardening` hardening); `stateFromResult` does not change its meaning but `helpers.runSeededSession` now surfaces `snapshots` via the helper so a reader may assume `snapshots[].pendingSpawn.displayRoll` is asserted (it is not — only `n3pairs`/`tieredPairs` are).** | 1 | 1 | 1 | Monitor — no gate; keep `0.5` pad as before, encourage explicit `displayRoll` assertions in new preview tests. |

### Risk Category Legend

- **TECH**: Technical/Architecture (sigma gate, single parser/dedup, board ref alias, draw budget, helper drift)
- **SEC**: Security — none this sweep (no auth/data exposure; `stateFromResult`/gate are pure)
- **PERF**: Performance — none standalone (helper `<1 ms` O(1), gate `<0.1 ms`)
- **DATA**: Data Integrity — `displayRoll` pad realism (R-009)
- **BUS**: Business Impact — tier-0 exception misread ships a forbidden pot clamp (R-003)
- **OPS**: Operations (deferred ledger `resolution-undo`, `sprint-status.yaml` ownership)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-preview-pot-ladder-hygiene` touches the **test-harness seam only**: **reliability/fail-fast** (tighter floor trips sooner), **maintainability (single `stateFromResult` + single `sigmaBound` literal + single 64-hex `resolution-undo`)**, **60 FPS/never-throw budget unchanged** (helper O(1) `<1 ms`, gate `<1 ms`), and **offline/installability** unchanged (no new deps).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw vs tighter gate | Engine `move()`/`newGame()`/`spawnTile()`/`pickIndex`/`weightedPicker` never throw; helper `stateFromResult` never throws (trivial); statistical gate trips at `|potRatio-0.2| ≥ 5σ` **and** `≥ 0.01` (dual). | R-001 | Unit host: `weights.test.ts` with `sigmaBound(POT_WEIGHT,N)` + `±1%` (already `26/26` green in working tree, `N=100k`, `mulberry32(0x2a4d)`); `adaptive-spawn-integration` rewind via helper still `deepEqual` (helper never throws across 500 deterministic moves). | `triade/__tests__/engine/weights.test.ts:139-150` + `triade/__tests__/engine/adaptive-spawn-integration.test.ts:286` + `npm --prefix triade test` full `858/858` pass baseline + 10 expected-RED unchanged |
| Maintainability | Single `stateFromResult` definition (`src/engine/core/game.ts:93-95`) re-exported via `index.ts:18` and `helpers.ts:216` — **not** 9 ad-hoc literals; single `sigmaBound` helper (`helpers.ts:116-120` `z=5`, `5σ` at `0.2,100k ≈0.0063`); `resolution-undo` 64-hex hash per resolved DW entry; merge predicate stays `!spawned && from.length===2` (5 allowlist: `GameBoard` + `4× src/feel/*`) — still 5 sites after App wiring. | R-002, R-005 | Static-assert: `rg -n "board: result\.board" triade --include="*.ts" --include="*.tsx"` `==1` (definition only); `rg -n "stateFromResult" triade --include="*.ts"` `==3` definitions/re-exports + 9 consumers; `rg -n "potSamples > N \* 0\.1" triade` `==0` (old floor gone); `rg -n "from\.length.*spawned" triade/src` `==5`. | Source scan + `helpers.ts`+`game.ts` diff + ledger diff |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn`, frame worst `<8 ms`, device `p99 <16.7 ms`. Helper adds `<1 ms` per call (O(1) destructure), gate adds `<0.1 ms` per statistical test (one `Math.sqrt` per tier). No new worklet, no `Math.random` in helper, no `setTimeout`. | — | Host bench (existing `feel.bench.test.ts` both-profile) already in budget; helpers need no new bench — just verify `npm --prefix triade test` median per helper `<1 ms` (already `<0.2 ms` for `stateFromResult`). | CI `npm test` timing + `feel.bench.test.ts` median/p99 unchanged + `npx tsc --noEmit` clean |
| Compliance — tier-0 exception wiring | Exception is **documented harmless** (`game.ts:64-69` + `adaptive-spawn-integration.test.ts:297` comment: `tier-0 is the harmless exception — pot value 3 can exceed a tiny ceiling`); tier-0 domain `{1,2,3}` (combined `1(0.4),2(0.4),3(0.2)`) and tier≥1 invariant `v<=ceiling` for `48/96/192/384/768/1536` both pinned. Spec **Never** says mutate engine to "fix" the exception. | R-003, R-008 | Unit: `adaptive-spawn-integration.test.ts:296` ceiling-ordering exception `2000 draws` at `0/1/2` (`sawThree && sawExceeding`, `isValidSpawnValue` + `v===1||2||3`) + companion `tier>=1 v<=ceiling` `2000 draws` at `48..1536` — both data-not-code thresholds. | `adaptive-spawn-integration.test.ts:296-328` + `game.ts:64-69` doc + `pot.ts` single-source invariant |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (helper pure TS). | — | `npm --prefix triade test` offline (no network) still `858/858` + expected-RED. | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. `5σ≈0.0063` at `N=100k` is derived from `sigmaBound` (`z·√(p(1-p)/n)`), not invented; `<1 ms` helper cost is observed, not threshold-invented. If a future sweep grows `N` to `150k`, record its measured wall time as baseline rather than inventing a new threshold (mark UNKNOWN only if no host timing collected).

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-preview-pot-ladder-hygiene.md` intent/boundaries/I-O matrix 4 rows, 4 ACs, Design Notes signed; ADR-06 shallow-copy isolation preserved)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsconfig.test.json` + `mulberry32`; working-tree on `3a6038e` baseline + hygiene diff)
- [ ] Test data available or factories ready (`sigmaBound` + `POT_WEIGHT=0.2` + `mulberry32(0x2a4d)` at `N=100k`, `mulberry32(0x51ce+ceiling+0x100)` at tier-0 `2000 draws`, `GameState`/`MoveResult` fixtures via `gameState`/`stateFromResult`)
- [ ] Feature deployed to test environment (working-tree `helpers.ts` + `game.ts`/`index.ts` + 9 consumer files + 2 test files patched; `git diff --stat -- triade/src/engine` helper-only, `triade/src/game/preview` empty)
- [ ] No engine edits beyond additive helper and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`sigmaBound` dual gate + `stateFromResult` dedup grep + tier-0 exception `sawThree && sawExceeding` + rewind shape via helper + engine smoke/integration/render green — host)
- [ ] All P1 tests passing (or failures triaged with waivers) — draw-budget fixtures + `helpers` re-export seam + `runSeededSession` determinism + `tier>=1 v<=ceiling` companion
- [ ] No open high-priority / high-severity bugs (R-001..R-002 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on hygiene seam; `rg` allowlists for no `board: result.board` duplicate / no `>N*0.1` floor / single helper definition green)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (both hit via `npx tsc` probes below)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (tighter floor vs never-throw, single helper, tier-0 wiring green)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns `weights.test` dual gate + tier-0 exception pin, `stateFromResult` grep allowlists, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `helpers.ts` + `game.ts` single helper + `sigmaBound` gate hardening, 9-site dedup migration |
| PM | PM | Signs tier-0 exception residual (documented harmless) + accepts no preview/engine drift |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hygiene; host unit + smoke/integration, already green

**Criteria**: Blocks starvation trip + high risk (≥6) + no workaround (silent `>N*0.1` floor ships a starved pot, re-drifted literal ships future drift)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC1 — `weights.test.ts` pot share outside `5σ≈0.0063` **and** `±1%` trips (was `> N*0.1` — statistically dead) | Unit | R-001 | 1 | QA (done) | `weights.test.ts:139-150` — `sigmaBound(POT_WEIGHT,N) + 0.01` dual gate at `N=100k` `tier 1,5`; complements the existing within-pot `±1% && ±10% relative` gates (`N1` still green). |
| AC2 — `stateFromResult` single definition, 9-site dedup — `rg -n "board: result\.board" triade --include="*.ts" --include="*.tsx" ==1` (inside `game.ts:93`) | Static scan | R-002 | 1 | QA (done) | `game.ts:93-95` definition + `index.ts:18` + `helpers.ts:216` re-exports; consumers `App.tsx`, `GameE2ETestFixture`, `helpers.runSeededSession` (2×), `engine.smoke`, `render.smoke` (2×), `session.integration`, `criticalPath`, `directional-spawn` (2×), `bulletTime.atdd`, `adaptive-spawn-integration` (rewind) all use helper. |
| AC3 — `adaptive-spawn-integration` tier-0 exception `sawThree && sawExceeding` at ceilings `0/1/2` (2000 draws each, `isValidSpawnValue` + `v===1||2||3` domain) | Unit | R-003, R-008 | 1 | QA (done) | `adaptive-spawn-integration.test.ts:296` — proves the documented `game.ts:64-69` `3>ceiling` exception is observable (every tiny ceiling eventually exceeds via `3`, only `3` can exceed); future `potForTier(0)` intentional changes must update together (atomic). |
| AC4 — rewind shape via helper `game.stateFromResult(r1)` reproduces the identical next result (`deepStrictEqual r2a===r2b`, `moved:true`) | Integration (engine→helper) | R-004, R-006 | 1 | QA (done) | `adaptive-spawn-integration.test.ts:286` — `r2a = move(stateFromResult(r1), 'right', rngOf(0.25,0.35,0.45))` vs `r2b = move({board: r1.board, pendingSpawn:{...r1.pendingSpawn}}, 'right', rngOf(0.25,0.35,0.45))`; helper preserves board-ref sharing semantics. |
| AC5 — smoke/integration fixtures still green after 9-site dedup (engine→helper path) | Smoke / Integration | R-004, R-006 | 1 | QA (done) | `npm --prefix triade test -- __tests__/engine/engine.smoke.test.ts __tests__/render/render.smoke.test.ts __tests__/integration/session.integration.test.ts __tests__/smoke/criticalPath.smoke.test.ts __tests__/smoke/directional-spawn.smoke.test.ts` green (already in `858/858` full suite). |
| AC6 — `GameE2ETestFixture` + `helpers.runSeededSession` still deterministic via helper (same `mulberry32` seed replays identically) | Integration (helper→engine) | R-006 | 1 | QA (done) | `GameE2ETestFixture:71 this.state = stateFromResult(result)` + `helpers.ts:206-207 snapshots/pushed via helper` — covered by `adaptive-spawn-integration.test.ts:279 determinism` `runSeededSession(1234,60)` `deepEqual snapshots/spawnValues` pin. |
| AC7 — engine + preview byte-identical except helper (`git diff --stat -- triade/src/engine triade/src/game/preview.ts` helper-only, no logic change) | Static | R-001..R-006 | 1 | QA (done) | `game.ts +4 / index.ts 1 change` additive only; full suite `858 pass /10 expected-RED` unchanged, `tsc` clean. |

**Total P0**: 7 checks (host unit + 5 smoke/integration suites + 3 `rg` gates), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & statistical preservation

**Criteria**: Important helper→engine/scanner wiring + medium/high risk + common `move`/`newGame`/spawn wiring

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Draw-budget preservation — `move()` `3 draws` (`pickIndex` + `resolveSpawn` + `displayRoll`) and `newGame` `20 draws` still exact after helper extraction | Integration (engine→helper) | R-006 | 2 | QA | Reuse `adaptive-spawn-integration.test.ts:68 AC4 effective 3 [0,0.9,0.5]` exact `spyRng.calls deepEqual` + `76 newGame 20` `…18×0.5,0.9,0.25 deepEqual` — both `P0` pins use deterministic `spyRng(...values)` and already green after `stateFromResult` extraction (helper is `0 draws`). |
| `helpers.ts` re-export seam — `import { stateFromResult } from '../../test-utils/helpers.ts'` reaches the same helper as `from '../../src/engine/core/index.ts'` | Unit | R-005 | 1 | QA | `helpers.ts:216 export { stateFromResult }` + `helpers.ts:7-12 import { ..., stateFromResult }` round-trip; host pins `typeof stateFromResult === 'function'` via `weights.purity`-style import scan (reuse `extractSpecifiers` `helpers.ts` contains `stateFromResult` re-export). |
| `runSeededSession` tiered path determinism + `preSpawnBoardOf` still correct after `snapshots`/`state` use helper | Integration | R-004, R-006 | 1 | QA | `adaptive-spawn-integration.test.ts:279 determinism + 186 AC7 statistical 10k + 245 AC7 pot-by-ceiling 12k` all consume `runSeededSession` and `preSpawnBoardOf` — both green after `stateFromResult` wiring (snapshots board refs still shared, tiers recovered correctly). |
| Ceiling-ordering companion `tier>=1 v<=ceiling` for `48/96/192/384/768/1536` (2000 draws each) | Unit | R-003 | 1 | QA | `adaptive-spawn-integration.test.ts:319 tier>=1` loop — kept alongside the new tier-0 exception; proves ordering invariant still holds for every non-trivial ceiling. |
| No `>N*0.1` floor remain + single-helper allowlists | Static | R-001, R-002 | 2 | QA | `rg -n "potSamples > N \* 0\.1" triade --include="*.ts"` `==0` + `rg -n "stateFromResult" triade/src/engine/core/game.ts --include="*.ts"` `==1 definition` + `rg -n "export \{ stateFromResult" triade/test-utils/helpers.ts` `==1`. Any literal remainder is a FAIL. |

**Total P1**: 7 checks, ~0.5–1 h host (mostly existing suites, 2 new negative pins)

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary helper edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-helper 3-site definition allowlist — `rg -n "stateFromResult" triade --include="*.ts"` `==3` re-export sites (`game.ts`, `index.ts`, `helpers.ts`) + 9 consumers | Static scan | R-002, R-005 | 1 | QA | Any inline `{ board: result.board, pendingSpawn: result.pendingSpawn }` fallback reintroduces DW-62 is a FAIL. |
| `sigmaBound` budget doc — `weights.test.ts:140` comment `5σ≈0.0063 vs ±1% absolute` names both thresholds, not just `hlaving-decay` | Static scan | R-001 | 1 | QA | `rg -n "5σ\|sigmaBound" triade/__tests__/engine/weights.test.ts` `≥1` hit (already landed) — proves the gate hygiene is documented, not magic. |
| Tier-0 domain scan — `rg -n "tier-0\|tier.0" triade --include="*.ts"` hits `game.ts:64-69` doc + `adaptive-spawn-integration.test.ts:296` test only | Static scan | R-003, R-008 | 1 | QA | Any new doc that claims "tier-0 is fixed" without updating `potForTier(0)=[3]` is via `pot.ts` inspection, not scanner. |
| `bulletTime.atdd` wiring regression guard — `stateFromResult` import path (`from '../../src/engine/core/index.ts'`) stays valid (not `helpers.ts` exclusive) | Static scan | R-005 | 1 | QA | `rg -n "stateFromResult" triade/__tests__/feel/bulletTime.atdd.test.ts` `==1` (already landed as `stateFromResult` import). Proves feel suites can consume the engine helper directly. |

**Total P2**: 4 checks, ~0.3–0.5 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — sweep for stray `{ board: res.board }` literal outside helpers: `rg -n "board: res\.board\|board: result\.board" triade --include="*.ts" --include="*.tsx"` should be `==1` (only `game.ts` definition) | Host `rg` exploratory | 1 | QA | No assertion beyond empty remnant; if a hit appears outside `game.ts:93`, file a fix and dedupe to `stateFromResult` before merge. |
| Micro-bench — `stateFromResult` O(1) `10k ×` median `<0.05 ms` extendable via `feel.bench.test.ts` both-profile | Unit (bench) | 1 | DEV | Helper is two-property destructuring; `feel.bench.test.ts` budget `median <0.05 / p99 <0.1` is not exceeded — just confirm no `structuredClone`/`JSON` regression from a defensive-clone edit. Not a new lane, just CI `npm test` timing. |
| Cross-cutting negative scan — `rg -n "music\|bgm\|RevenueCat\|AdMob" triade/test-utils --include="*.ts"` empty (hygiene sweep stayed in scope) | Static scan | 1 | QA | Trivial hygiene carry-over from Epic 8 — no new gate, just proves sweep did not introduce cross-cutting concerns. |

**Total P3**: 3 checks, ~0.2–0.4 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `require`/helper regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/engine/weights.test.ts __tests__/engine/adaptive-spawn-integration.test.ts` — both green including `sigmaBound` dual gate + tier-0 exception + rewind via helper (`<2 s`)
- [ ] `npm --prefix triade test -- __tests__/engine/engine.smoke.test.ts __tests__/render/render.smoke.test.ts __tests__/integration/session.integration.test.ts __tests__/smoke/criticalPath.smoke.test.ts __tests__/smoke/directional-spawn.smoke.test.ts` — all deduped via `stateFromResult` still green (`<5 s`)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore` / no `stateFromResult` export miss)

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical hygiene fail-fast (host only)

- [ ] `sigmaBound` dual gate `Math.abs(potRatio - POT_WEIGHT) < sigmaBound(...)` (`≈0.0063`) + `< 0.01` both PASS at `N=100k` `tier 1,5` (`mulberry32 0x2a4d`)
- [ ] `rg -n "board: result\.board" triade --include="*.ts" --include="*.tsx" ==1` (inside `game.ts:93`) — any second hit is a FAIL
- [ ] `rg -n "potSamples > N \* 0\.1" triade --include="*.ts" ==0` (old floor gone)
- [ ] tier-0 exception `2000 draws` at `0/1/2` `sawThree && sawExceeding` + domain `v===1||2||3`
- [ ] rewind shape `move(stateFromResult(r1), 'right', rngOf(0.25,0.35,0.45)) deepEqual move({board, pendingSpawn:{...r1.pendingSpawn}}, 'right', sameRng)` `moved:true`

**Total**: 5 P0 groups (already passing in working tree; `weights.test.ts 11/26` + `adaptive-spawn-integration 15/26` already green — `rg` gates are static)

### P1 Tests (<30 min)

**Purpose**: Draw-budget preservation + tier wiring + re-export seam

- [ ] Engine→helper draw-budget: `move(..., rngOf(0,0,0.5))` effective `spyRng.calls deepEqual [0,0.9,0.5]` vs `rngOf(0,0)` would exhaust (negative pin) + `newGame` `20` `…18×0.5,0.9,0.25 deepEqual` — helper is `0 draws` so both remain exact
- [ ] `runSeededSession(1234,60)` determinism `deepEqual snapshots/spawnValues` via helper vs manual literal (proves board ref-sharing not regressed)
- [ ] `extractSpecifiers`/`weights.purity` still `spawnConfig` keyed + `core/index.ts` re-export includes `stateFromResult` — `weights.test.ts:165 purity` green
- [ ] Ceiling-ordering companion `tier>=1 v<=ceiling` `2000 draws` at `48..1536` + `sfx/punch/shake/bullet` feel ATDD `expected RED 10` still `10` (unchanged window)

**Total**: 4 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, doc, exploratory

- [ ] Single-helper 3-site definition scan + `GameE2ETestFixture` `stateFromResult` wiring + `bulletTime.atdd` import path pin (`<1 s`)
- [ ] `sigmaBound` doc `5σ≈0.0063` comment scan + tier-0 `game.ts:64-69` doc still matches `potForTier(0)=[3]` (`<1 s`)
- [ ] Stray literal `rg -n "board: res\.board" triade --include="*.ts" --include="*.tsx" ==1` + helper `10k×` micro-bench `<0.05 ms` (`<2 min`)

**Total**: 5 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 7 | ~0.2 | ~1–1.6 | Pure `weights`+`adaptive-spawn-integration`+smoke/integration + `rg` allowlists already green (done in sweep); `tier-0 exception` + `rewind via helper` already landed |
| P1 | 5 | ~0.35 | ~1.5–2.2 | Engine fixtures (`move`/`newGame` 3/20-draw exact `spyRng` + `runSeededSession` determinism + `tier>=1 companion` + re-export seam) — mostly existing suites, 1 new negative pin for `stateFromResult` alias |
| P2 | 4 | ~0.2 | ~0.6–0.9 | Single-helper / no-floor / doc scans + `GameE2ETestFixture`/`bulletTime.atdd` wiring regression guard |
| P3 | 3 | ~0.15 | ~0.3–0.5 | Stray literal exploratory `rg` + `10k×` micro-bench + cross-cutting negative |
| **Total** | **19** | **-** | **~3–5.2** | **~0.5–0.8 days host; no device lane — pure host TypeScript** |

### Prerequisites

**Test Data:**

- `sigmaBound` params `POT_WEIGHT=0.2`, `N=100k`, `z=5` → `≈0.0063` + `0.01` backstop; `mulberry32(0x2a4d)` at `tier 1,5`; `mulberry32(0x51ce+ceiling+0x100)` at tier-0 `2000 draws` per `0/1/2` + `0x51ce+ceiling` at `tier>=1` `2000 draws` per `48/96/192/384/768/1536`
- `GameState`/`MoveResult`/`Board`/`PendingSpawn` fixtures: `staticBoard([1,2,null,null])`, `emptyBoard()`, `boardWith(4×4)` + `gameState(board, pendingSpawn)` + `MoveResult { board, score, moved, trace, pendingSpawn }`
- `rg` allowlist strings: `"board: result.board"` / `"potSamples > N * 0.1"` / `"stateFromResult"`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `rg` (ripgrep) for allowlist scans (`board: result.board`, `stateFromResult` 3-site, `potSamples > N*0.1`, `from.length.*spawned` 5-site)
- `npx tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — helpers are pure TS, no native module)
- Working tree on `3a6038e` baseline + hygiene diff; `triade/src/engine` preview byte-identical guard

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths** (`weights` pot sampling + `adaptive-spawn` tier-0 exception + 9-site dedup): ≥80%
- **Helper seam** (`stateFromResult`/`sigmaBound`/`runSeededSession` wiring): 100%
- **Edge cases** (tiny `0/1/2` ceilings vs `tier>=1` ordering + zero ad-hoc literal): ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (dual `sigmaBound + ±1%` gate, single helper definition, tier-0 `sawThree && sawExceeding`, rewind via helper, smoke/integration green)
- [ ] No high-risk (≥6) items unmitigated (R-001 sigma gate + R-002 single-helper dedup mitigations green)
- [ ] No `> N*0.1` floor remains and no ad-hoc `{ board: result.board, pendingSpawn: result.pendingSpawn }` duplicate outside `game.ts:93` (grep gates)
- [ ] `npx tsc --noEmit` clean on both `triade/tsconfig.json` and `triade/tsconfig.test.json`
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (tighter floor vs never-throw, single helper, tier-0 harmless wiring)

---

## Mitigation Plans

### R-001: Sigma gate `5σ≈0.0063` could flake on future seed rotation (Score: 6)

**Mitigation Strategy:**
1. Keep dual gate as landed (`Math.abs(potRatio - POT_WEIGHT) < sigmaBound(POT_WEIGHT,N)` **AND** `< 0.01`) — the `0.01` backstop is the product threshold, `5σ` is the hygiene tripwire.
2. On a rotation that straddles `0.0063–0.01`, either bump `N` to `150k` (tightens `5σ` to `≈0.0051` but keeps wall time `<0.3s` on this test) or downgrade `5σ` to `CONCERNS` not `BLOCK` for that release and file `DW: seed rotation widened sigma budget` with expiry.
3. Keep `weights.test.ts:140` comment documenting `5σ≈0.0063 vs ±1% absolute` so a future author understands which gate is product vs hygiene.

**Owner:** FE lead
**Timeline:** Immediate (gate this bundle)
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/engine/weights.test.ts` `11/11` green at `N=100k` `mulberry32(0x2a4d)` + `rg -n "potSamples > N \* 0\.1" triade --include="*.ts" ==0` + expected `858/858` full suite still green (no engine `weightedValue` change).

### R-002: New consumer re-inlines the ad-hoc literal instead of `stateFromResult` (Score: 6)

**Mitigation Strategy:**
1. Grep `rg -n "board: result\.board" triade --include="*.ts" --include="*.tsx" ==1` and `rg -n "pendingSpawn: result\.pendingSpawn" triade --include="*.ts" --include="*.tsx" ==1` as CI gates (only `game.ts:93-95` may contain the pattern).
2. Keep the re-export in `test-utils/helpers.ts:216` so tests can `import { stateFromResult } from '../../test-utils/helpers.ts'` without `import { stateFromResult } from '../../src/engine/core/index.ts'` gymnastics — lower the ceremony that incentivizes inlining.
3. Treat any rename of `stateFromResult` as an `rg`-checked atomic commit (3 definition sites + 9 consumers) and update `sprint-status.yaml`-owned ledger out of this workflow.

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned
**Verification:** Host P0 dedup grep `==1` + `rg -n "stateFromResult" triade --include="*.ts" ==3 definitions` + `npx tsc --noEmit` clean + smoke/integration `npm test` subset green after helper extraction.

### R-003: Tier-0 exception misread as defect and "fixed" away (Score: 4)

**Mitigation Strategy:**
1. Keep `adaptive-spawn-integration.test.ts:296` `sawThree && sawExceeding` test and `game.ts:64-69` doc verbatim (`tier 0 is the exception (pot value 3 can exceed a tiny ceiling) and harmless there`).
2. On any `pot.ts: potForTier(0)` intentional change, update the exception test's domain (`v===1||2||3` + `sawThree`) together with the pot edit — treat as atomic commit and leave the `3>ceiling` allowance for `0/1/2` intact per spec **Never**.
3. Keep companion `tier>=1 v<=ceiling` `2000 draws` at `48..1536` as the invariant the "fixed" ceiling must never regress.

**Owner:** FE
**Timeline:** Immediate (residual acknowledged; ledger already `done`)
**Status:** Planned
**Verification:** `adaptive-spawn-integration.test.ts` `15/26` green including `tier-0 exception` + `tier>=1 ordering` both green; `game.ts:64-69` doc present.

---

## Assumptions and Dependencies

### Assumptions

1. Effective `move()` always consumes exactly `3 RNG draws` (`pickIndex` + `resolveSpawn` + `displayRoll`) and `newGame` `20 draws` — pinned by `game.ts:53-64` and `spawn.ts:pickCombined` single-roll contract; `stateFromResult` is `0 draws` so existing draw-count pins stay valid; any engine draw-count change is treated as a product change that must update callers together.
2. No current production/helper file beyond `game.ts:93-95` contains `{ board: result.board, pendingSpawn: result.pendingSpawn }` — after-sweep `rg` for the literal has exactly 1 hit (definition); assumption checked by P0 dedup scan.
3. `stateFromResult` sharing `result.board` ref (no clone) is intentional (engine mutates `board` in place via `spawnTile`, ADR-06 shallow copy applies only to the `noop` path where `{...state.pendingSpawn}` already isolates history); callers must not deep-clone without updating the rewind-shape test.
4. `sigmaBound` `z=5` at `N=100k, p=0.2 → ≈0.0063` is hygiene, `±1%` is product — the dual gate's `Max` is not collapsed to a single threshold; assumption documented in `weights.test.ts:140`.
5. Tier-0 pot is `[3]` today (`pot.ts:7-8 always ≥1`, `potForTier(0)=[3]`), so tier-0 combined domain is `{1,2,3}` with pot band `0.2` at `3` — the `sawThree`/`sawExceeding` gates are valid only under that composition; assumption checked by `pot.test.ts:POT_CURVE`.
6. `npx tsc --noEmit -p tsconfig.test.json` baseline remains clean after the `helpers.ts` `stateFromResult` re-export (no circular import via `index.ts` → `helpers.ts` — `helpers.ts` re-export is `from '../src/engine/core/index.ts'` leaf, not from a `test-utils` barrel).

### Dependencies

1. `triade/tsconfig.json` + `triade/tsconfig.test.json` — Required by host `npm test` (`TSX_TSCONFIG_PATH`) and `npx tsc --noEmit` gates. Status: Ready.
2. `triade/test-utils/helpers.ts` single-helper + `sigmaBound` implementation — Required before P0 gates. Status: Done (working-tree).
3. `triade/src/engine/core/game.ts` `stateFromResult` definition + `index.ts` barrel — Required before any consumer can import. Status: Done (working-tree).
4. `triade/__tests__/engine/adaptive-spawn-integration.test.ts` tier-0 exception pin + `weights.test.ts` dual gate — Required for P0 hygiene gates. Status: Done (working-tree).
5. `deferred-work.md` ledger with `resolution-undo: ac1bd5ea…` for DW-61/62/63 — Required for P1 ledger verification. Status: Done (prior bundle `dw-preview-pot-ladder-hygiene`).

### Risks to Plan

- **Risk**: Engine `spawn.ts` draw-count or `pot.ts:potForTier(0)` composition changes without test co-update.
  - **Impact**: `weights.test` dual gate or `tier-0 exception sawThree` throws on correct moves → CI RED looks like hygiene bug.
  - **Contingency**: Treat `spawn.ts`/`pot.ts` + `weights.test.ts`/`adaptive-spawn-integration.test.ts` migration as an atomic commit; update `N` or tier-0 domain together with the engine edit.

- **Risk**: New consumer re-inlines `{ board: result.board, pendingSpawn: result.pendingSpawn }` and ships future drift.
  - **Impact**: Literal duplicates to `2` hits → `P0` dedup gate FAIL; `ADR-06 shallow-copy` subtlety could drift on the `noop` path.
  - **Contingency**: The `rg -n "board: result.board" ==1` gate is the blocker; update the new site to `import { stateFromResult }` before merge — do not ship the literal.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for any future helper seam (e.g. `sigmaBound z=6` tuning) — separate workflow; not auto-run.
- Run `*automate` for broader helper coverage once production preview lint lands.
- Run `*nfr-assess` after implementation evidence (statistical runs) to validate NFR planning without inventing thresholds.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: ______________________ Date: __________
- [ ] Tech Lead: ______________________ Date: __________
- [ ] QA Lead: ______________________ Date: __________

**Comments:**

---

---

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **Engine `src/engine/core/game.ts` `move()`/`newGame()` + `resolveSpawn`/`weightedValue`/`potForTier`/`ceilingDetector`** | Hygiene-only: helper shares refs but does not change `MoveResult` bytes; statistical gate is observer-only | Existing `adaptive-spawn-integration` 15/26 + `engine.smoke` `weights` 11/26 + `pot/pot-tier-pipeline` 8-12 each + full `npm test` `858/858` (10 expected-RED) must stay green |
| **Render `GameBoard`/`transitionPlan.ts:classify` + `App.tsx` `doMove` gate** | `App.tsx` `setGame(stateFromResult(result))` path is the same `GameState` shape; `GameBoard` trace still `spawned:true` at opposite edge | `render.smoke` + `directional-spawn.smoke` + `criticalPath.smoke` + `session.integration` + `GameE2ETestFixture` suites must stay green (already `<15 min` gate) |
| **Feel `src/feel/*` (`punch/shake/bulletTime/reducedMotion/sfx`) + `feel.bench`** | No change — helper/weights sweep is disjoint from `!spawned && from.length===2` predicate allowlist (5 sites: `transitionPlan` + `4× feel`) | `feel` unit 12/8/12/9/11 + `feel.bench median <0.05/p99 <0.1` both-profile + `feel ATDD` 10 expected-RED unchanged |
| **Test tooling `test-utils/helpers.ts` (`sigmaBound`/`runSeededSession`/`preSpawnBoardOf`/`stripComments*`)** | Already hardened by `dw-test-scanner-helpers-hardening`; this sweep only adds `stateFromResult` path + `sigmaBound` consumer gate | `engine.purity` + `ui.norolls` + `stripComments` string-safe gates stay green (already via that bundle) |
| **Deferred ledger `_bmad-output/implementation-artifacts/deferred-work.md` DW-61/62/63 + `sprint-status.yaml`** | DW-61/62/63 `done` with `resolution-undo: ac1bd5ea…`; orchestrator owns `sprint-status.yaml` per prompt | Ledger `rg -n "resolution-undo" ==3` new entries; `git diff --stat` shows ledger + 9 consumers but **not** `sprint-status.yaml` |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization
- `nfr-criteria.md` - NFR evidence for later `nfr-assess` (this sweep plans NFR, does not assess PASS/CONCERNS/FAIL)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-preview-pot-ladder-hygiene.md`
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-61/62/63)
- Engine: `triade/src/engine/core/game.ts:64-69,93-95` + `triade/src/engine/core/index.ts:18` + `triade/src/engine/core/pot.ts` + `triade/src/engine/core/weights.ts`
- Helpers: `triade/test-utils/helpers.ts:7-12,116-120,163-216` + `triade/test-utils/e2e/GameE2ETestFixture.ts:1,71`
- Tests (consumers): `triade/__tests__/engine/weights.test.ts:113-163` + `triade/__tests__/engine/adaptive-spawn-integration.test.ts:286-328` + smoke/integration/feel consumers
- TEA config: `_bmad/tea/config.yaml` (test_artifacts, test_design_output, risk_threshold `p1`)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
