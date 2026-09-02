---
title: 'preview-pot-ladder-hygiene: tighten weight sampling gate, dedupe state reconstruction, assert tier-0 ceiling exception'
type: 'refactor'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Weight-test floor `> N*0.1` is catastrophically loose, ad-hoc `{board,pendingSpawn}` reconstruction drifts across App and tests, and the documented tier-0 ceiling-ordering exception is asserted nowhere — hygiene debt obscuring future failures.

**Approach:** Tighten floor to sigma-scaled gate consistent with ±1% gates, extract `stateFromResult` helper used by App.tsx and smoke/integration tests, and add explicit tier-0 ceiling-ordering assertion; no preview or engine byte change.

## Boundaries & Constraints

**Always:** Preview byte-identical (no HUD/previewFor change); engine byte-identical (no move/spawn/ceiling/pot/weights logic change); keep fixed draw-budget contract (effective=3/noop=0/newGame=20); statistical gates use sigmaBound 5σ pattern; preserve ADR-06 shallow-copy isolation.

**Block If:** Any preview pixel or engine move/spawn semantics would change; sigma gate would flake at pinned seeds; helper would alter GameState identity semantics.

**Never:** Change preview rendering, potWeights/normalizeTo/weightedPicker logic, ceiling/tier formula, or introduce new dependencies; mutate engine to fix tier-0 exception (it is documented harmless).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Weight floor tightened | N=100000, POT_WEIGHT=0.2, tier 1 & 5 weightedValue stream | potSamples ratio within sigmaBound(POT_WEIGHT,N) (≈±0.63% at 5σ) AND within ±1% absolute, fail otherwise | No throw — assert fails |
| stateFromResult helper | MoveResult {board, pendingSpawn} | Returns GameState {board, pendingSpawn} identical to manual reconstruction, shallow board ref preserved, pendingSpawn shallow-copied semantics unchanged | Never throws |
| Tier-0 exception asserted | ceiling 0/1/2, many resolveSpawn draws | Value 3 appears and exceeds ceiling (proving exception), and tier>=1 still asserts v<=ceiling | No throw |
| Rewind helper drift | App.tsx + all smoke/integration + fixture + helpers runSeededSession | All call sites use single helper, no ad-hoc literal remains | Lint/grep would catch literal remainder |

</intent-contract>

## Code Map

- `triade/__tests__/engine/weights.test.ts:113-152` -- statistical pot-sampling test with loose floor `> N*0.1`; imports POT_WEIGHT/weights helpers; tighten to sigma-scaled gate
- `triade/__tests__/engine/adaptive-spawn-integration.test.ts:296-307` -- ceiling-ordering test excluded tier-0; add tier-0 exception assertion there
- `triade/src/engine/core/game.ts:1-110` -- engine move/newGame; add `stateFromResult(result: MoveResult): GameState` export (additive, byte-identical behavior)
- `triade/src/engine/core/index.ts:18` -- barrel re-export for new helper
- `triade/test-utils/helpers.ts:162-213` -- runSeededSession + gameState helpers; add `stateFromResult` re-export or use engine helper; update `state = {board, pendingSpawn}` site
- `triade/App.tsx:335` -- `setGame({board: result.board, pendingSpawn: result.pendingSpawn})` duplicate site
- `triade/__tests__/render/render.smoke.test.ts:39,58` -- duplicate reconstruction sites
- `triade/__tests__/integration/session.integration.test.ts:48` -- duplicate site
- `triade/__tests__/smoke/directional-spawn.smoke.test.ts:113,188` -- duplicate sites
- `triade/__tests__/smoke/criticalPath.smoke.test.ts:33` -- duplicate site
- `triade/test-utils/e2e/GameE2ETestFixture.ts:74` -- duplicate site

## Tasks & Acceptance

**Execution:**
- [ ] `triade/__tests__/engine/weights.test.ts` -- replace `potSamples > N*0.1` floor with sigma-scaled gate `Math.abs(potSamples/N - POT_WEIGHT) < Math.max(0.01, sigmaBound(POT_WEIGHT,N))` (or `sigmaBound` standalone) importing sigmaBound and POT_WEIGHT; keep ±1% absolute AND ±10% relative within-pot gates unchanged; ensure still passes at pinned seeds
- [ ] `triade/src/engine/core/game.ts` -- add exported `stateFromResult(result: MoveResult): GameState` helper returning `{board: result.board, pendingSpawn: result.pendingSpawn}`; document as shared reconstruction helper
- [ ] `triade/src/engine/core/index.ts` -- re-export `stateFromResult`
- [ ] `triade/test-utils/helpers.ts` -- optionally re-export engine helper or define parallel test-utils helper for test ergonomics; update `runSeededSession` internal `state = ...` to use helper
- [ ] `triade/App.tsx` -- import `stateFromResult` from engine and replace `setGame({board: result.board, pendingSpawn: result.pendingSpawn})` with `setGame(stateFromResult(result))`
- [ ] `triade/__tests__/render/render.smoke.test.ts` -- import helper and replace both `state = {board: result.board, pendingSpawn: result.pendingSpawn}` sites
- [ ] `triade/__tests__/integration/session.integration.test.ts` -- replace duplicate site with helper
- [ ] `triade/__tests__/smoke/criticalPath.smoke.test.ts` -- replace site
- [ ] `triade/__tests__/smoke/directional-spawn.smoke.test.ts` -- replace both sites (import via engine or helpers)
- [ ] `triade/test-utils/e2e/GameE2ETestFixture.ts` -- replace `this.state = {board: result.board, pendingSpawn: result.pendingSpawn}` with helper
- [ ] `triade/__tests__/engine/adaptive-spawn-integration.test.ts` -- add explicit tier-0 ceiling-ordering exception test: for ceilings 0/1/2, assert `resolveSpawn` eventually returns 3 exceeding ceiling (harmless documented case), while keeping existing tier>=1 `v <= ceiling` invariant

**Acceptance Criteria:**
- Given N=100000, when weights.test.ts pot-sampling runs, then pot share ratio is within sigma-scaled bound (not just >10%) and test still passes deterministically
- Given any MoveResult, when stateFromResult is called, then resulting GameState deep-equals manual `{board: result.board, pendingSpawn: result.pendingSpawn}` and no engine/preview logic changed (git diff --stat -- triade/src/engine triade/src/game/preview shows only additive helper)
- Given App.tsx and all smoke/integration/fixture call sites, when searched for literal `board: result.board, pendingSpawn: result.pendingSpawn` (and variants), then zero ad-hoc occurrences remain (only definition site)
- Given ceiling 0/1/2, when resolveSpawn sampled many times, then value 3 appears and exceeds ceiling at least once (proving tier-0 exception), and Given ceiling >=48, when resolveSpawn sampled, then no value ever exceeds ceiling (existing invariant still holds)

## Spec Change Log

## Review Triage Log

## Design Notes

sigmaBound helper: `sigmaBound(expected, n, z=5) = z * sqrt(p(1-p)/n)`. For POT_WEIGHT 0.2 at N=100000, 5σ ≈0.0063 (0.63%). Surrounding gates use ±1% absolute; using `Math.max(0.01, sigmaBound(...))` keeps 1% floor but sigma-scaled when N grows, or pure sigmaBound for tighter hygiene. Prefer `Math.abs(potSamples/N - POT_WEIGHT) < sigmaBound(POT_WEIGHT, N)` if flake-free at pinned seeds, else `Math.max(0.01, sigmaBound(...))`.

stateFromResult is intentionally trivial to prevent drift: `export function stateFromResult(r: MoveResult): GameState { return { board: r.board, pendingSpawn: r.pendingSpawn }; }` — board ref is shared (engine mutates board in place via spawnTile), pendingSpawn ref is shared same as manual literal (ADR-06 shallow copy happens on noop path only, not here).

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/engine/weights.test.ts __tests__/engine/adaptive-spawn-integration.test.ts` -- expected: both suites pass, no flake
- `npm --prefix triade test` -- expected: full suite passes (smoke/integration/render still green after helper extraction)
- `grep -R "board: result.board" triade --include="*.ts" --include="*.tsx"` -- expected: only definition site of stateFromResult, zero ad-hoc sites
- `git diff --stat -- triade/src/engine triade/src/game/preview.ts` -- expected: only additive helper lines, no logic change

## Auto Run Result

Status: done
DW-61: tightened pot-sampling floor from `> N*0.1` to dual gate `sigmaBound(POT_WEIGHT,N) ≈0.0063` AND `±1% absolute` via sigmaBound import; verified weights.test 11/11 pass. DW-62: extracted `stateFromResult` in `src/engine/core/game.ts` re-exported via index and helpers; replaced 9+ ad-hoc `{board: result.board, pendingSpawn: result.pendingSpawn}` sites in App.tsx, helpers runSeededSession, GameE2ETestFixture, render.smoke, session.integration, criticalPath.smoke, directional-spawn.smoke, engine.smoke, bulletTime.atdd; grep now only hits definition site; engine byte-identical except additive helper, preview byte-identical. DW-63: added tier-0 exception test asserting 3 exceeds ceilings 0/1/2 (2000 draws each, sawThree && sawExceeding) and updated rewind shape to use helper; adaptive-spawn-integration 15/15 pass, full suite 858 pass /10 expected-RED fails unchanged, tsc clean.
Blocking condition: none
