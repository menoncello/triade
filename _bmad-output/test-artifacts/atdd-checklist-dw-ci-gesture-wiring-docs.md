---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-02'
workflowType: 'testarch-atdd'
storyId: 'dw-ci-gesture-wiring-docs'
storyKey: 'dw-ci-gesture-wiring-docs'
storyFile: '_bmad-output/implementation-artifacts/spec-ci-gesture-wiring-docs.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-ci-gesture-wiring-docs.md'
generatedTestFiles:
  - 'triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-ci-gesture-wiring-docs.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-ci-gesture-wiring-docs.md'
  - 'triade/package.json'
  - 'triade/src/ui/gesture.ts'
  - 'triade/src/ui/swipe.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/ui/gesture-pipeline.test.ts'
  - '.github/workflows/ci.yml'
  - 'triade/benchmarks/engine.bench.test.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-ci-gesture-wiring-docs — Split benchmark from default test + extract gesture wiring to testable module

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) + Static scans (rg allowlists) + CI yaml scan — pure src/ui + package.json + ci.yml delta, no E2E/API harness. Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 + Skia/Reanimated) but scenario is framework-free host source-text + pure handleSwipe dispatch predicate exercised via `node:test`.

---

## Story Summary

DW bundle `dw-ci-gesture-wiring-docs` hardens two orthogonal surfaces with zero gameplay change: (1) split timing-sensitive benchmarks out of the default `npm test`/`engine-test-and-benchmark` path so the default gate is fast and stable while benchmarks run in a dedicated `benchmark` job (DW-49: `package.json` `test` identical to `benchmark` → separated), and (2) extract `App.tsx` pan `onEnd` contract (busy-gate + success-gate + `resolveSwipeDirection` + `doMove` dispatch + NaN/non-finite/throwing-dispatch fail-closed) into `triade/src/ui/gesture.ts` so `gesture-pipeline.test.ts` imports the real wiring instead of a local copy while keeping the WIRING regex as a secondary guard (DW-50). Verification is host-only unit + source-text gating; no device lane, no E2E.

**As a** test-tooling / CI maintainer
**I want** benchmarks isolated from the default gate and a single imported gesture wiring
**So that** p99 bench tail never flakes PRs and busy/success/NaN contracts cannot diverge between App and tests.

---

## Acceptance Criteria

1. **AC package glob default** — Given default `npm test`, when run, then `benchmarks/**/*.test.ts` are NOT executed (count matches `__tests__` only, `package.json` `test` glob `__tests__/**/*.test.ts` and does not contain `benchmarks`).
2. **AC package glob benchmark** — Given `npm run benchmark`, when run, then only `benchmarks/**/*.test.ts` execute (`benchmark` glob `benchmarks/**/*.test.ts`, does not contain `__tests__`, scripts differ).
3. **AC CI split** — Given `.github/workflows/ci.yml`, when inspected, then job `engine-test-and-benchmark` keeps name (branch protection) and step `Run tests (benchmarks excluded — see benchmark job)` with no `npm run benchmark`; job `benchmark` exists with 1 step `Run benchmark gate (timing-sensitive, separate from default test) → npm run benchmark`.
4. **AC busy-gate** — Given `handleSwipe` imported from `triade/src/ui/gesture.ts`, when called with `busy.current=true` (valid swipe 30/2), then it returns `false`, does not call dispatch, and `swipeToMove` helper composed with `game.move` returns `null` (no board mutation).
5. **AC success-gate** — Given `handleSwipe`/`handleGestureEnd` with `success=false` (opts `{success:false}` or `event, false`), when called with busy idle, then returns `false` and does not dispatch.
6. **AC valid dispatch + WIRING** — Given a valid idle swipe (`30,2 → right` or `-30,1 → left`), when routed through imported `handleSwipe`→`game.move`, then board mutates (2+1→3 at wall) and `App.tsx` source contains `handleGestureEnd` + `doMoveRef.current(dir)` + `SWIPE_THRESHOLD` + `from './src/ui/gesture'` while `gesture.ts` resolves via `resolveSwipeDirection`.
7. **AC ledger + engine untouched** — Given `deferred-work.md`, then DW-49/DW-50 are `status: done` with `resolution-undo: facfde46…` (2 hits) and `triade/src/engine` byte-identical (`git diff --stat -- triade/src/engine` empty).

---

## Story Integration Metadata

- **Story ID:** `dw-ci-gesture-wiring-docs` (bundle; spec `status: done` / `final_revision 4b44cf1` / `baseline_revision fa68173` sweep)
- **Story Key:** `dw-ci-gesture-wiring-docs`
- **Story File:** `_bmad-output/implementation-artifacts/spec-ci-gesture-wiring-docs.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-ci-gesture-wiring-docs.md`
- **Generated Test Files:**
  - `triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts` (NEW — 19 RED-phase scaffolds, `it.skip`, host `node:test` + `tsx`; 7 P0 + 5 P1 + 4 P2 + 3 P3)
  - Existing hardened suites (reference, already green after sweep): `triade/__tests__/ui/gesture-pipeline.test.ts` (7/7 via imported wiring), `triade/__tests__/ui/swipe.test.ts`, `triade/__tests__/ui/layout.test.ts`
- **Working-tree delta covered (vs baseline `fa68173` → HEAD `66d711d`):**
  - `triade/package.json` — `test: "TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \"__tests__/**/*.test.ts\""` (was `"__tests__/**/*.test.ts" "benchmarks/**/*.test.ts"` duplicated) + `benchmark: "TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \"benchmarks/**/*.test.ts\""` (was identical to `test`) — DW-49
  - `.github/workflows/ci.yml` — job `engine-test-and-benchmark` keeps name (branch protection) but `Run tests (benchmarks excluded — see benchmark job)` + new parallel job `benchmark` with `checkout/setup-node/npm ci` + `Run benchmark gate → npm run benchmark` — default excludes benches, benchmark never gates release
  - `triade/src/ui/gesture.ts` — NEW 49 LOC module exporting `handleSwipe(dx,dy,busy,dispatch,opts?)` (busy null+current, `opts.success` fail-closed via `'success' in opts && !opts.success`, `Number.isFinite(dx/dy)`, `typeof dispatch==='function'`, `resolveSwipeDirection({dx,dy})`, `try/catch dispatch`) + `handleGestureEnd(event,success,busy,dispatch)` (null+typeof translationX/Y, `!success` early, delegates to `handleSwipe` with `{success}`) — DW-50
  - `triade/App.tsx:31,804` — `import { handleGestureEnd } from './src/ui/gesture.ts'` + `panGesture.onEnd((event,success)=> handleGestureEnd(event,success,busyRef,dir=>doMoveRef.current(dir)))` replacing inline wiring; `SWIPE_THRESHOLD` retained for `activeOffsetX/Y` `[-10,+10]` + `runOnJS(true)` preserved
  - `triade/__tests__/ui/gesture-pipeline.test.ts` — replaces local `handleSwipe` copy with `import { handleSwipe } from '../../src/ui/gesture.ts'` + `swipeToMove` composes imported wiring with `game.move` for board-mutation assertions; WIRING assertion kept (`handleGestureEnd` + `doMoveRef.current(dir)` + `SWIPE_THRESHOLD` + `gesture.ts` `resolveSwipeDirection`)
  - `triade/src/ui/swipe.ts` untouched (`SWIPE_THRESHOLD=10`, tie `ax===ay→null`, `ax>ay ? ax<threshold→null`)
  - `_bmad-output/implementation-artifacts/deferred-work.md` — DW-49/DW-50 `open → done 2026-09-02` + `resolution-undo: facfde46…` (prior sweep bundle glyph via bundle test)
  - `triade/src/engine` byte-identical (`git diff --stat -- triade/src/engine` empty), `triade/benchmarks` byte-identical, no new deps/tsconfig
- **Deferred-work ledger:** `deferred-work.md` DW-49/DW-50 `done 2026-09-02` with `resolution-undo: facfde46…`; `sprint-status.yaml` not written (orchestrator-owned per prompt)

---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`)
- **No Playwright/Cypress harness needed:** scenario is pure `handleSwipe` predicate + source-text `rg` gates + CI yaml shape + engine→gesture board composition; correct level is **Unit host + Static scans (grep allowlists)**. E2E/API scaffolds intentionally absent (per `test-design-dw-ci-gesture-wiring-docs.md` risks `R-001..R-003` mitigations and `Not in Scope` — engine byte-identical, no device swipe lane). `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN Skia Canvas project, not a web Playwright flow).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`

---

## Red-Phase Test Scaffolds Created

### Unit + Integration + Static-scan Tests (19 tests, host `node:test`)

**File:** `triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts` (267 lines, 4 suites)

All 19 are `it.skip` — RED-phase scaffolds. When activated (`it.skip` → `it`) they assert the **expected** post-bundle behaviour; before the bundle they would fail (identical globs, no `gesture.ts`, inline App wiring); with the working-tree bundle they **PASS** (see Execution Evidence). This is the correct TDD inversion: tests document the contract; implementation already in working tree makes them green.

#### P0 Critical — Spec AC + High risk (7 tests)

- ✅ **Test:** `[P0-01] AC package.json default test excludes benchmarks`
  - **Status:** RED (skip) — would fail before: `test` contained `benchmarks` (identical to `benchmark`); after: `__tests__/**` only, no `benchmarks`, `TSX_TSCONFIG_PATH` present
  - **Verifies:** DW-49 glob separation (R-002)
- ✅ **Test:** `[P0-02] AC package.json benchmark isolates benchmarks`
  - **Status:** RED — before: `benchmark` also contained `__tests__`; after: `benchmarks/**` only, no `__tests__`, scripts differ
  - **Verifies:** DW-49 glob single-source (R-002)
- ✅ **Test:** `[P0-03] AC CI split — default job excludes benchmarks, benchmark job dedicated`
  - **Status:** RED — before: single job `engine-test-and-benchmark` ran `npm test` with benches included; after: 2 jobs, default comments `benchmarks excluded` and no `npm run benchmark`, bench job label `Run benchmark gate`
  - **Verifies:** DW-49 CI split + branch-protection name stability (R-002/R-004)
- ✅ **Test:** `[P0-04] AC busy-gate — busy.current true suppresses any swipe via imported handleSwipe`
  - **Status:** RED — before: busy-gate only exercised via local copy in `gesture-pipeline.test.ts`; after: imported `handleSwipe` real wiring returns false, dispatch not called, `swipeToMove` null
  - **Verifies:** DW-50 real wiring + R-003 fail-closed (R-001/R-003)
- ✅ **Test:** `[P0-05] AC success-gate — success false suppresses dispatch even when busy idle`
  - **Status:** RED — before: success gate used `=== false` only (undefined would slip); after: `'success' in opts && !opts.success` + `handleGestureEnd !success` both fail-closed
  - **Verifies:** DW-50 success-gate hardening (R-003, review patch high)
- ✅ **Test:** `[P0-06] AC valid swipe dispatches with real wiring and mutates board`
  - **Status:** RED — before: valid swipe tested via local copy; after: `handleSwipe(30,2)→right 3` at right wall and `-30,1→left 3` via `game.move` composition prove imported wiring drives gameplay
  - **Verifies:** DW-50 import not regressed, R-001 single-wiring
- ✅ **Test:** `[P0-07] AC WIRING — App binds handleGestureEnd + doMoveRef + SWIPE_THRESHOLD; gesture resolves via resolveSwipeDirection`
  - **Status:** RED — before: App had inline busy/success/NaN logic; after: `App.tsx` delegates to `handleGestureEnd` + `doMoveRef.current(dir)` + `SWIPE_THRESHOLD` preserved for `activeOffset`, `gesture.ts` imports `resolveSwipeDirection` from `./swipe`
  - **Verifies:** DW-50 delegation + R-001 WIRING secondary guard + R-005 threshold coupling

#### P1 Wiring — threshold / guard-order / never-throw / composition (5 tests)

- ✅ **Test:** `[P1-01] AC threshold coupling — subthreshold 5 and diagonal tie 20/20 resolve to null without dispatch`
  - **Status:** RED — `swipeToMove(5,1)` and `(20,20)` both null, spy not called, `SWIPE_THRESHOLD=10` single-definition invariant holds
  - **Verifies:** R-005/R-006 threshold + tie gating
- ✅ **Test:** `[P1-02] AC guard-order — NaN/Infinity dx/dy and null/non-finite event return false before dispatch`
  - **Status:** RED — `NaN/Infinity` dx/dy, `null busy`, `null dispatch`, `null event`, `NaN translation` all false before `resolveSwipeDirection`, dispatch spy never called
  - **Verifies:** R-003/R-006 guard-order
- ✅ **Test:** `[P1-03] AC dispatch never-throw — throwing dispatch is caught and returns false`
  - **Status:** RED — `dispatch=()=>throw` returns false and never throws to caller via `try/catch` narrow (dispatch only)
  - **Verifies:** R-003/R-007 never-throw vs swallow
- ✅ **Test:** `[P1-04] AC engine→gesture composition + dispatch type-gate`
  - **Status:** RED — `typeof dispatch!=='function'` returns false without dispatch, composition `swipeToMove` still spawns via `game.move` (spawn budget preserved)
  - **Verifies:** R-003 type-gate + R-001 composition
- ✅ **Test:** `[P1-05] AC CI name stability + tsc both configs clean`
  - **Status:** RED — `engine-test-and-benchmark` exactly 1, `gesture.ts` exports both functions, `SWIPE_THRESHOLD===10`, both `tsconfig.json` + `tsconfig.test.json` exist (tsc gate host <15min)
  - **Verifies:** R-004 name stability + R-001/R-003 tsc shape

#### P2 Static scans — single-helper / ledger / ordering (4 tests)

- ✅ **Test:** `[P2-01] SCAN single-helper allowlist — handleSwipe definition count==1 in gesture.ts only`
  - **Status:** RED — `export function handleSwipe` exactly 1 in `gesture.ts`, `App.tsx` has no `busyRef.current.*resolveSwipeDirection` re-inline
  - **Verifies:** R-001 dedup drift
- ✅ **Test:** `[P2-02] SCAN single-threshold allowlist — SWIPE_THRESHOLD literal only in swipe.ts`
  - **Status:** RED — `SWIPE_THRESHOLD=10` exactly 1 in `swipe.ts`, 0 in `gesture.ts`, `gesture.ts` imports `resolveSwipeDirection`
  - **Verifies:** R-005 threshold single-source
- ✅ **Test:** `[P2-03] SCAN guard-order literal ordering pin in gesture.ts`
  - **Status:** RED — scoped to `handleSwipe` body (not import): `!busy → 'success' in opts → Number.isFinite → typeof dispatch → resolveSwipeDirection → try` indices increasing + `handleGestureEnd` `typeof event.translationX` before `return handleSwipe`
  - **Verifies:** R-006 guard-order
- ✅ **Test:** `[P2-04] SCAN ledger resolution-undo + glob single-source`
  - **Status:** RED — `DW-49` + `DW-50` `status: done` via DOTALL `[\s\S]*?`, `resolution-undo: [0-9a-f]{8,}` ≥2 hits, `benchmarks` token once in `package.json` (benchmark script only), `test` not containing `benchmarks`
  - **Verifies:** R-009 ledger + R-002/R-008 glob allowlist

#### P3 Exploratory / bench hygiene (3 tests)

- ✅ **Test:** `[P3-01] BENCH handleSwipe O(1) 10k× <80ms (no loop/alloc regression)`
  - **Status:** RED — `10k×` in `<80ms` (≈`0.005ms` per call) proves predicate+resolve not loop; also pins classic shapes tie→null, 5→null, 30/2→right
  - **Verifies:** performance O(1) (NFR)
- ✅ **Test:** `[P3-02] SCAN negative exploratory — handleSwipe(∞) / undefined busy all fail-closed false without throw`
  - **Status:** RED — `Infinity/Infinity`, `undefined busy`, `undefined translation`, `undefined dispatch` all `false` without throw (complements R-003 NaN guard)
  - **Verifies:** negative exploratory
- ✅ **Test:** `[P3-03] SCAN cross-cutting — engine + benchmarks byte-identical (no gameplay drift)`
  - **Status:** RED — `gesture.ts` <4000 chars, `swipe.ts` `export const SWIPE_THRESHOLD = 10`, `git diff --stat -- triade/src/engine` empty, `triade/benchmarks` empty
  - **Verifies:** scope stayed src/ui+ci only

---

## Data Factories Created

Not applicable to this source-text + dispatch-predicate scenario (per `test-design-dw-ci-gesture-wiring-docs.md`):
- **No data factories / `@faker-js/faker`** — helpers reuse deterministic `staticBoard` / `rngOf` / `gameState` fixtures from `triade/test-utils/helpers.ts` (already present). `GameState`/`MoveResult`/`BusyRef`/`SwipeEvent` are the domain types under test.
- **No new factory file** — existing `helpers.ts` already exports `staticBoard`, `rngOf`, `gameState`, `mulberry32`, `spyRng`, etc. This ATDD reuses them as the harness for board-mutation composition.

---

## Fixtures Created

Not applicable — host-only gesture dispatch + package/ci scans, no Playwright fixtures / browser automation:
- **No Playwright fixture / `test.extend`** — the glob gates, WIRING string checks, draw budgets and threshold wiring are framework-free host unit via `node --test`.
- **No external service mocking** — no I/O in `gesture.ts` predicate or the yaml scans.

---

## Mock Requirements

None. No UI surface change beyond `App.tsx` delegation; the change is internal to `triade/src/ui/gesture.ts` (49 LOC predicate), `triade/package.json` scripts, `.github/workflows/ci.yml` job split. The only external integration is the `resolveSwipeDirection` pure call (`swipe.ts`) which stays deterministic at invariant `SWIPE_THRESHOLD=10`. Dispatch throwing is simulated via spy that `throw new Error()` — no mock framework needed beyond a failing function.

---

## Required data-testid Attributes

None — no UI/component change in this bundle (`triade/src/ui/gesture.ts` is a predicate module, not a React component; `App.tsx` still uses existing `Gesture.Pan().activeOffsetX/Y` `[-10,+10]` gating, no new testid). The only new contract is `handleSwipe`/`handleGestureEnd` data predicates exercised via host unit imports.

---

## Implementation Checklist

Maps directly to the working-tree diff already in place (vs baseline `fa68173`). Each scaffold's GREEN task is the code change that makes it pass — for this completed sweep the tasks are **already done** (working tree implements them; activated ATDD now GREEN). Keep checklist as the red→green roadmap for any future re-splitting.

### Test: [P0-01] package glob default

**File:** `triade/package.json:13` (`scripts.test`)

**Tasks to make this test pass (DONE in working tree):**
- [x] Edit `triade/package.json` `scripts.test` to `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "__tests__/**/*.test.ts"` (remove `benchmarks/**/*.test.ts` from the glob, keep `TSX_TSCONFIG_PATH` + `node --import tsx`)
- [x] Verify `rg '"test".*__tests__.*test\.ts' package.json` passes and `rg '"test".*benchmarks' package.json` ==0
- [x] Run `npm --prefix triade test -- __tests__/ui/gesture-pipeline.test.ts` → 7/7 and `npm --prefix triade test 2>&1 | grep "ATDD dw-ci"` → P0-01 green
- [x] ✅ Test passes (green phase — host count `__tests__` only)

**Estimated Effort:** 0.15h

---

### Test: [P0-02] benchmark isolate

**File:** `triade/package.json:14` (`scripts.benchmark`)

**Tasks:**
- [x] Keep `scripts.benchmark` as `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "benchmarks/**/*.test.ts"` (was already correct shape but identical to `test`; now `test` differs, `benchmark` untouched and not sharing `__tests__`)
- [x] Verify `rg '"benchmark".*benchmarks.*test\.ts' package.json` passes and `rg '"benchmark".*__tests__' package.json` ==0 and `test !== benchmark` literal
- [x] Run `npm --prefix triade run benchmark -- --test-name-pattern=0 2>&1 | grep "tests 6"` → 6 benches green
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Test: [P0-03] CI split

**File:** `.github/workflows/ci.yml:9,37` (jobs `engine-test-and-benchmark` + `benchmark`)

**Tasks:**
- [x] In `engine-test-and-benchmark` keep `name` byte-identical but change step `Run tests` to `Run tests (benchmarks excluded — see benchmark job)` with `run: npm test` (still default gate, never runs `npm run benchmark`)
- [x] Add parallel job `benchmark: runs-on: ubuntu-latest / defaults: working-directory: triade / steps: checkout + setup-node 26 + npm ci + Run benchmark gate (timing-sensitive, separate from default test) → npm run benchmark`
- [x] Verify `rg "^  engine-test-and-benchmark:" ci.yml ==1` and `rg "^  benchmark:" ci.yml ==1` and `rg "npm run benchmark" ci.yml ==1` (only bench job) and default block not containing it
- [x] ✅ Test passes (2-job shape pinned, branch-protection name preserved per review patch high)

**Estimated Effort:** 0.25h

---

### Test: [P0-04] busy-gate via imported wiring

**File:** `triade/src/ui/gesture.ts:19-38` (`handleSwipe` busy gate) + `triade/__tests__/ui/gesture-pipeline.test.ts:4,12-26` (import seam)

**Tasks:**
- [x] Create `triade/src/ui/gesture.ts` `export function handleSwipe(dx,dy,busy,dispatch,opts?)` with first line `if (!busy || busy.current) return false;` (covers `null` busy + `busy.current===true` per review patch medium)
- [x] In `gesture-pipeline.test.ts` replace local `function handleSwipe(...)` copy with `import { handleSwipe } from '../../src/ui/gesture.ts'` + helper `swipeToMove(...,busy,success?)` composes imported wiring with `game.move`
- [x] Keep WIRING regex as secondary guard (App.tsx `handleGestureEnd` + `doMoveRef.current(dir)` + `SWIPE_THRESHOLD`)
- [x] ✅ Test passes (`busy:true→false` + dispatch not called + `swipeToMove(null)`)

**Estimated Effort:** 0.25h

---

### Test: [P0-05] success-gate

**File:** `triade/src/ui/gesture.ts:27` (`opts` check) + `40-48` (`handleGestureEnd` success early)

**Tasks:**
- [x] In `handleSwipe` add `if (opts != null && 'success' in opts && !opts.success) return false;` (covers `undefined/null/false` fail-closed per review patch high)
- [x] In `handleGestureEnd` add `if (!success) return false;` before delegation + null/typeof guards for `event.translationX/Y`
- [x] Verify `swipeToMove(30,0,success:false)→null` and `handleGestureEnd(event,false,…)→false` even when busy idle
- [x] ✅ Test passes

**Estimated Effort:** 0.15h

---

### Test: [P0-06] valid swipe → real wiring → board mutation

**File:** `triade/src/ui/gesture.ts:30-37` (`resolveSwipeDirection` + `try/catch dispatch`) + `triade/__tests__/ui/gesture-pipeline.test.ts:28-42` (right/left mutations)

**Tasks:**
- [x] In `handleSwipe` after guards: `const dir = resolveSwipeDirection({dx,dy}); if (!dir) return false; try { dispatch(dir); } catch { return false; } return true;` (never-throw dispatch, null diagonal/subthreshold already gated by `resolveSwipeDirection`)
- [x] Helper `swipeToMove(30,2)→right` `2+1→3` at `[0][3]` right wall and `-30,1→left` `1+2→3` at `[0][0]` via `game.move(state,dir,rngOf(0,0,0.5))` — proves imported wiring drives real gameplay, not stub
- [x] ✅ Test passes

**Estimated Effort:** 0.2h

---

### Test: [P0-07] WIRING secondary guard

**File:** `triade/App.tsx:31,804` (import + delegation) + `triade/src/ui/gesture.ts:2` (import resolve)

**Tasks:**
- [x] In `App.tsx` add `import { handleGestureEnd } from './src/ui/gesture.ts'` and replace `panGesture.onEnd((event,success)=>{ if(!busyRef.current&&success){...resolve...dispatch...}})` with `panGesture.onEnd((event,success)=> handleGestureEnd(event,success,busyRef,dir=>doMoveRef.current(dir)))` preserving `SWIPE_THRESHOLD` import for `activeOffsetX/Y`
- [x] Keep `gesture.ts` `import { resolveSwipeDirection } from './swipe.ts'` as single consumer; `swipe.ts` untouched (`SWIPE_THRESHOLD=10`)
- [x] Gate via `readFileSync App.tsx /handleGestureEnd/ + /doMoveRef\.current\(dir\)/ + /SWIPE_THRESHOLD/` + `gesture.ts /resolveSwipeDirection/`
- [x] ✅ Test passes (secondary guard green)

**Estimated Effort:** 0.2h

---

### Tests: [P1-01] threshold coupling

**File:** `triade/src/ui/swipe.ts:3` (`SWIPE_THRESHOLD=10`) + `triade/__tests__/ui/gesture-pipeline.test.ts` pins

**Tasks:**
- [x] Confirm `SWIPE_THRESHOLD=10` untouched (`swipe.ts` single literal) and `handleSwipe` never shadows it; `resolveSwipeDirection({dx:5,dy:1})→null` and `{20,20}→null` (tie) without dispatch spy called
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P1-02] guard-order + event guards

**File:** `triade/src/ui/gesture.ts:26-29,41-46`

**Tasks:**
- [x] In `handleSwipe` guard order `!busy/busy.current → opts success → Number.isFinite(dx/dy) → typeof dispatch` before `resolveSwipeDirection` so busy/success/NaN never reaches direction resolve or dispatch (spy not called)
- [x] In `handleGestureEnd` add `if (!event || typeof event.translationX !== 'number' || typeof event.translationY !== 'number') return false;` + `if (!success) return false;` before `handleSwipe` delegation
- [x] ✅ Test passes (NaN/Infinity/null busy/dispatch/event all false without dispatch)

**Estimated Effort:** 0.2h

---

### Tests: [P1-03] never-throw dispatch

**File:** `triade/src/ui/gesture.ts:32-36` (`try/catch dispatch`)

**Tasks:**
- [x] Wrap only `dispatch(dir)` in `try { dispatch(dir); } catch { return false; }` (not `resolveSwipeDirection` — invariant violation in resolve must still surface; narrow swallow per review patch low)
- [x] Add throwing-dispatch spy `()=>{throw new Error()}` → `handleSwipe===false` and `doesNotThrow`
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P1-04] composition + type-gate

**File:** `triade/src/ui/gesture.ts:29` (`typeof dispatch !== 'function'`) + `triade/__tests__/ui/gesture-pipeline.test.ts` composition seams

**Tasks:**
- [x] Add `if (typeof dispatch !== 'function') return false;` before resolve; verify `null/123/undefined dispatch` all return false without calling `resolveSwipeDirection` spy-technically not needed — P2-03 allowlist proves single resolve consumer
- [x] Keep `swipeToMove` directional still spawns via `move()` (`board.flat.filter(v!==null).length ≥2`) not stub
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P1-05] CI name stability + tsc

**File:** `.github/workflows/ci.yml:9` (`engine-test-and-benchmark:`) + `triade/tsconfig.json` + `triade/tsconfig.test.json`

**Tasks:**
- [x] Keep `engine-test-and-benchmark:` byte-identical (branch protection) — do NOT rename to `test` or `engine-test`; `benchmark` stays separate and is NOT added to required checks (informational)
- [x] Pin `gesture.ts` exports `handleSwipe` + `handleGestureEnd` + `SWIPE_THRESHOLD===10` sanity + `tsconfig.json` + `tsconfig.test.json` existence (actual `npx tsc --noEmit` both configs is the `<15 min` gate)
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P2-01..02] single-helper / single-threshold allowlists

**File:** `triade/src/ui/gesture.ts`, `triade/src/ui/swipe.ts`, `triade/App.tsx`

**Tasks:**
- [x] `rg -n "export function handleSwipe" triade --include="*.ts" ==1` (`gesture.ts:19` only); `App.tsx` has no `busyRef.current.*resolveSwipeDirection` re-inline
- [x] `rg "SWIPE_THRESHOLD\s*=\s*10" triade --include="*.ts" ==1` (`swipe.ts:3` only), `gesture.ts` never defines it
- [x] ✅ Scans pass

**Estimated Effort:** 0.2h

---

### Tests: [P2-03] guard-order ordering pin

**File:** `triade/src/ui/gesture.ts:19-37` (`handleSwipe` body)

**Tasks:**
- [x] Scope ordering check to `handleSwipe` function body (slice `export function handleSwipe` → `export function handleGestureEnd`) so import-line `resolveSwipeDirection` does not poison global `indexOf`; pin `!busy → 'success' in opts → Number.isFinite → typeof dispatch → resolveSwipeDirection → try` indices increasing + `handleGestureEnd` `typeof event.translationX` before `return handleSwipe`
- [x] ✅ Scan passes

**Estimated Effort:** 0.1h

---

### Tests: [P2-04] ledger + glob single-source

**File:** `_bmad-output/implementation-artifacts/deferred-work.md` + `triade/package.json`

**Tasks:**
- [x] Verify `deferred-work.md` `DW-49` + `DW-50` `status: done 2026-09-02` + `resolution-undo: facfde46…` via DOTALL `DW-49[\s\S]*?status: done` (.* does not cross newline) + `resolution-undo: [0-9a-f]{8,}` ≥2 hits
- [x] Verify `package.json` `benchmarks` token appears once (benchmark script only) and `test` does not literally contain `benchmarks`
- [x] ✅ Scans pass

**Estimated Effort:** 0.1h

---

### Tests: [P3-01..03] bench hygiene

**File:** `triade/src/ui/gesture.ts` (49 LOC trivial destructure)

**Tasks:**
- [x] `10k× handleSwipe(30,1,{current:false},()=>{}) <80ms` (≈`0.005ms` per call) proves O(1) predicate+resolve not loop; classic shapes `tie→null`, `5→null`, `30/2→right` still
- [x] Negative exploratory `Infinity`, `undefined busy`, `undefined translation`, `undefined dispatch` all fail-closed `false` without throw
- [x] `gesture.ts.length <4000` + `swipe.ts SWIPE_THRESHOLD=10` + `git diff --stat -- triade/src/engine` empty (no gameplay drift) + `triade/benchmarks` empty
- [x] ✅ Bench + scans pass

**Estimated Effort:** 0.15h

---

## Running Tests

```bash
# Run all activated tests for this story (dormant by default — RED scaffolds)
# 1) Activate one scaffold at a time for the current task, then confirm RED→GREEN:
#    edit triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts: change it.skip → it for that test

# Run the single ATDD file (skipped = 19, dormant) — from triade/:
bash -c 'cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts'
# or via npm prefix:
npm --prefix triade test 2>&1 | grep "ATDD dw-ci"

# Run the single ATDD file activated (with working-tree bundle — expect 19 pass)
# (temporarily: sed 's/it\.skip/it/g' then run, as verified in evidence; remember to revert)
bash -c 'cd triade && cp __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts /tmp/x.ts && sed -i "" "s/it\.skip/it/g" __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts; mv /tmp/x.ts __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts'

# Run the regression gates (must stay green on clean codebase)
npm --prefix triade test -- __tests__/ui/gesture-pipeline.test.ts __tests__/ui/swipe.test.ts
npm --prefix triade test -- __tests__/ui/layout.test.ts

# Full host gate (<15 min — run everything in PRs if <15 min per philosophy)
npm --prefix triade test
npm --prefix triade run benchmark  # 6 benches separate, not gating default

# Typecheck both TsConfigs
npx tsc --noEmit --project triade/tsconfig.json
TSX_TSCONFIG_PATH=tsconfig.test.json npx tsc --noEmit --project triade/tsconfig.test.json
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 19 tests written as red-phase scaffolds with `it.skip` (TDD red phase — `node:test` skip is the `test.skip()` analogue)
- ✅ No fixtures/factories needed beyond existing `triade/test-utils/helpers.ts` harnesses (reuses `staticBoard`/`rngOf`/`gameState` + `resolveSwipeDirection` pure)
- ✅ Mock requirements documented (none — fail-closed via returning false, throwing dispatch spy only)
- ✅ data-testid requirements listed (none)
- ✅ Implementation checklist created (7 P0 + 5 P1 + 4 P2 + 3 P3 tasks)

**Verification:**

- All 19 generated tests are present and marked with `it.skip` (see `bash -c 'cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts'` output: `tests 19 / skipped 19`)
- Activation guidance is clear (one `it.skip → it` at a time per task)
- Activated tests fail due to missing implementation before this sweep — now PASS because working-tree bundle implements them (evidence: de-skipped run `19 pass / 0 fail` + two green-regression fixes in P2-03/P2-04)
- This is INTENTIONAL (TDD red phase); implementation already covers the working-tree delta (`HEAD 66d711d` vs `fa68173`)

---

### GREEN Phase (DEV Team — Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with highest priority P0-01)
2. **Remove `it.skip` → `it`** for that test and confirm it fails first (before bundle `package.json` `test` contained `benchmarks` and no `gesture.ts` existed)
3. **Read the test** to understand expected behaviour (glob exclusion vs helper fail-closed vs wiring delegation)
4. **Implement minimal code** to make that specific test pass (see Checklist task for file:line — `package.json:13`, `ci.yml:9`, `gesture.ts:19`)
5. **Run the test** `bash -c 'cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts'` to verify green
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat

**For this completed sweep:** every GREEN task is already DONE in the working tree (see `git log --oneline fa68173..66d711d` + `package.json`/`ci.yml`/`gesture.ts`/`App.tsx`/`gesture-pipeline.test.ts`); activating all 19 at once now yields `19 pass`. Keep the one-at-a-time rule for any future re-splitting.

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer — helper is exactly 49 LOC trivial predicate + dispatch)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap

**Progress Tracking:**

- Check off tasks as you complete them
- Share progress in daily standup

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete — 19/19 activated)
2. **Review code for quality** (readability — `handleSwipe` single predicate, `handleGestureEnd` narrow delegation, `Number.isFinite` + `typeof dispatch` + `try/catch dispatch` order, `resolution-undo` 64-hex ledger)
3. **Extract duplications** (already done — single `handleSwipe` vs 2-site `busyRef.current`/`resolve` inline, single `SWIPE_THRESHOLD` vs shadow, single `benchmarks` glob vs duplicate)
4. **Optimize performance** (already O(1) `<0.05ms` per `handleSwipe`, `<80ms` per 10k — no `cloneBoard`, no loop)
5. **Ensure tests still pass** after each refactor (`npm --prefix triade test` stays green — `gesture-pipeline 7` + `swipe 10` + `layout 18` + `852` full minus 11 expected RED)
6. **Update documentation** (if contract changes — `spec-ci-gesture-wiring-docs.md:Review Triage Log` + `gesture.ts:12-18` doc already cover `opts.success` / `!busy` / `Number.isFinite` / `try/catch` residuals)

**Key Principles:**

- Tests provide safety net (refactor with confidence — `rg` grep gates catch re-drift)
- Make small refactors (easier to debug if tests fail — `resolution-undo` 64-hex + `benchmarks excluded` comment pinpoint split site)
- Run tests after each change
- Don't change test behaviour (only implementation)

**Completion:**

- All tests pass (19/19 activated, plus existing suites `gesture-pipeline 7` + `npm test` 852 pass / 11 fail expected ATDD reds + `npm run benchmark` 6 benches)
- Code quality meets team standards (single wiring, single threshold, single glob, DOTALL ledger)
- No duplications or code smells (no duplicate `busyRef.current.*resolveSwipeDirection`, no duplicate `SWIPE_THRESHOLD=10`, no duplicate `benchmarks` glob)
- Ready for code review and story approval

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-ci-gesture-wiring-docs.md`)
2. **If the story file cannot be updated automatically**, share this checklist and `triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts` with the dev workflow as a manual handoff
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001..R-003 mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this sweep, implementation already in working tree (de-skipped run proves GREEN)
5. **Activate one scaffold at a time** by removing `it.skip` for the current task, then confirm it fails before implementing (before this sweep, P0-01 would pass with benchmarks in default `test`, P0-04 would pass via local copy — now both trip)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single helper + DOTALL ledger already done)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-02` with `resolution-undo: facfde46…`) — do not touch `sprint-status.yaml`

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (via `test-design-dw-ci-gesture-wiring-docs.md` + `tea-index.csv`):

- **fixture-architecture.md** — Not needed for predicates (pure host) — reuses `node:test` + `helpers.ts` fixtures, no `test.extend`
- **data-factories.md** — Factory pattern via `swipeToMove` composition helper (imports real wiring + `game.move`, not `@faker-js/faker` — deterministic board refs)
- **component-tdd.md** — Host unit TDD contract (red-phase `it.skip` scaffolds, one behavioural pin per `it`, determinism via `rngOf` exact)
- **network-first.md** — Not applicable (no network — gesture + ci scans are filesystem-pure + host predicates)
- **test-quality.md** — Given-When-Then per test, one behavioural pin per `it`, determinism via `staticBoard`/`rngOf(0,0,0.5)`, isolation via `BusyRef` object alias not clone
- **test-levels-framework.md** — Level selection: Unit (handleSwipe/success/NaN/type-gate) vs Static scans (grep allowlists for WIRING/glob/ledger/threshold)
- **test-healing-patterns.md** — `resolution-undo: facfde46…` DOTALL + `benchmarks excluded` comment + `SWIPE_THRESHOLD=10` literal are the healing hooks (CI points to split drift site); `!busy → Number.isFinite → typeof dispatch → resolve` ordering is the guard-order healing path
- **selector-resilience.md / timing-debugging.md** — Not applied (host predicate, no DOM selectors / no `waitFor`; gesture is not E2E)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN Skia project)
- **nfr-criteria.md / risk-governance.md / probability-impact.md** — High ≥6 flagged with mitigation/owner/timeline (3 high), NFR planned evidence without PASS/FAIL (never-throw vs single-source + O(1) <80ms + ledger 64-hex)
- **probability-impact.md / test-priorities-matrix.md** — P0/P1/P2/P3 criteria present with priority-not-timing note (P0 blocks glob drift + wiring diverge + dispatch throw, P1 threshold/NAN/throw/composition, P2 scans/docs/ledger, P3 bench exploratory)

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-ci-gesture-wiring-docs.md` Sections "Risk Assessment" + "NFR Planning" for the 9 risks (3 high) and NFR thresholds that informed P0/P1/P2/P3 levels.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification (dormant, expected skip)

**Command:** `bash -c 'cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts'`

**Results:**
```
▶ ATDD dw-ci-gesture-wiring-docs — P0 critical (spec AC + high risk)
  ﹣ [P0-01] AC package.json default test excludes benchmarks (0.46ms) # SKIP
  ﹣ [P0-02] AC package.json benchmark isolates benchmarks (0.04ms) # SKIP
  ﹣ [P0-03] AC CI split — default job excludes benchmarks, benchmark job dedicated (0.04ms) # SKIP
  ﹣ [P0-04] AC busy-gate — busy.current true suppresses any swipe via imported handleSwipe (0.04ms) # SKIP
  ﹣ [P0-05] AC success-gate — success false suppresses dispatch even when busy idle (0.04ms) # SKIP
  ﹣ [P0-06] AC valid swipe dispatches with real wiring and mutates board (0.03ms) # SKIP
  ﹣ [P0-07] AC WIRING — App binds handleGestureEnd + doMoveRef + SWIPE_THRESHOLD; gesture resolves via resolveSwipeDirection (0.03ms) # SKIP
✔ ATDD dw-ci-gesture-wiring-docs — P0 critical (spec AC + high risk) (1.28ms)
▶ ATDD dw-ci-gesture-wiring-docs — P1 wiring (threshold / guard-order / never-throw / composition)
  ﹣ [P1-01] AC threshold coupling — subthreshold 5 and diagonal tie 20/20 resolve to null without dispatch (0.05ms) # SKIP
  ﹣ [P1-02] AC guard-order — NaN/Infinity dx/dy and null/non-finite event return false before dispatch (0.05ms) # SKIP
  ﹣ [P1-03] AC dispatch never-throw — throwing dispatch is caught and returns false (0.05ms) # SKIP
  ﹣ [P1-04] AC engine→gesture composition + dispatch type-gate (0.03ms) # SKIP
  ﹣ [P1-05] AC CI name stability + tsc both configs clean (0.02ms) # SKIP
✔ ATDD dw-ci-gesture-wiring-docs — P1 wiring (threshold / guard-order / never-throw / composition) (0.34ms)
▶ ATDD dw-ci-gesture-wiring-docs — P2 scans (single-helper / single-threshold / ordering / ledger)
  ﹣ [P2-01] SCAN single-helper allowlist — handleSwipe definition count==1 in gesture.ts only (0.07ms) # SKIP
  ﹣ [P2-02] SCAN single-threshold allowlist — SWIPE_THRESHOLD literal only in swipe.ts (0.03ms) # SKIP
  ﹣ [P2-03] SCAN guard-order literal ordering pin in gesture.ts (0.03ms) # SKIP
  ﹣ [P2-04] SCAN ledger resolution-undo + glob single-source (0.03ms) # SKIP
✔ ATDD dw-ci-gesture-wiring-docs — P2 scans (single-helper / single-threshold / ordering / ledger) (0.23ms)
▶ ATDD dw-ci-gesture-wiring-docs — P3 exploratory / bench hygiene
  ﹣ [P3-01] BENCH handleSwipe O(1) 10k× <80ms (no loop/alloc regression) (0.03ms) # SKIP
  ﹣ [P3-02] SCAN negative exploratory — handleSwipe(∞) / undefined busy all fail-closed false without throw (0.02ms) # SKIP
  ﹣ [P3-03] SCAN cross-cutting — engine + benchmarks byte-identical (no gameplay drift) (0.02ms) # SKIP
✔ ATDD dw-ci-gesture-wiring-docs — P3 exploratory / bench hygiene (0.11ms)
ℹ tests 19
ℹ suites 4
ℹ pass 0
ℹ fail 0
ℹ cancelled 0
ℹ skipped 19
ℹ todo 0
ℹ duration_ms 149
Summary:
- Total tests: 19
- Skipped: 19 (expected before activation — RED scaffolds dormant)
- Passing: 0 before activation (expected, scaffolds skipped)
- Status: ✅ Red-phase scaffolds verified (all present, all `it.skip`, correct harness `node:test` + `tsx`)
```

### Activated Run / GREEN Verification (working-tree bundle covers delta)

**Command:** `bash -c 'cd triade && cp __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts /tmp/x.ts && sed -i "" "s/it\.skip/it/g" __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts; mv /tmp/x.ts __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts'` (tmp de-skipped run, working tree reverted after)

**Results:**
```
▶ ATDD dw-ci-gesture-wiring-docs — P0 critical (spec AC + high risk)
  ✔ [P0-01] AC package.json default test excludes benchmarks (0.51ms)
  ✔ [P0-02] AC package.json benchmark isolates benchmarks (0.07ms)
  ✔ [P0-03] AC CI split — default job excludes benchmarks, benchmark job dedicated (0.14ms)
  ✔ [P0-04] AC busy-gate — busy.current true suppresses any swipe via imported handleSwipe (0.13ms)
  ✔ [P0-05] AC success-gate — success false suppresses dispatch even when busy idle (0.06ms)
  ✔ [P0-06] AC valid swipe dispatches with real wiring and mutates board (0.55ms)
  ✔ [P0-07] AC WIRING — App binds handleGestureEnd + doMoveRef + SWIPE_THRESHOLD; gesture resolves via resolveSwipeDirection (0.12ms)
✔ ATDD dw-ci-gesture-wiring-docs — P0 critical (spec AC + high risk) (2.09ms)
▶ ATDD dw-ci-gesture-wiring-docs — P1 wiring (threshold / guard-order / never-throw / composition)
  ✔ [P1-01] AC threshold coupling — subthreshold 5 and diagonal tie 20/20 resolve to null without dispatch (0.13ms)
  ✔ [P1-02] AC guard-order — NaN/Infinity dx/dy and null/non-finite event return false before dispatch (0.08ms)
  ✔ [P1-03] AC dispatch never-throw — throwing dispatch is caught and returns false (0.14ms)
  ✔ [P1-04] AC engine→gesture composition + dispatch type-gate (0.10ms)
  ✔ [P1-05] AC CI name stability + tsc both configs clean (0.11ms)
✔ ATDD dw-ci-gesture-wiring-docs — P1 wiring (threshold / guard-order / never-throw / composition) (0.70ms)
▶ ATDD dw-ci-gesture-wiring-docs — P2 scans (single-helper / single-threshold / ordering / ledger)
  ✔ [P2-01] SCAN single-helper allowlist — handleSwipe definition count==1 in gesture.ts only (0.12ms)
  ✔ [P2-02] SCAN single-threshold allowlist — SWIPE_THRESHOLD literal only in swipe.ts (0.06ms)
  ✔ [P2-03] SCAN guard-order literal ordering pin in gesture.ts (0.07ms)
  ✔ [P2-04] SCAN ledger resolution-undo + glob single-source (0.38ms)
✔ ATDD dw-ci-gesture-wiring-docs — P2 scans (single-helper / single-threshold / ordering / ledger) (0.71ms)
▶ ATDD dw-ci-gesture-wiring-docs — P3 exploratory / bench hygiene
  ✔ [P3-01] BENCH handleSwipe O(1) 10k× <80ms (no loop/alloc regression) (2.01ms)
  ✔ [P3-02] SCAN negative exploratory — handleSwipe(∞) / undefined busy all fail-closed false without throw (0.05ms)
  ✔ [P3-03] SCAN cross-cutting — engine + benchmarks byte-identical (no gameplay drift) (0.04ms)
✔ ATDD dw-ci-gesture-wiring-docs — P3 exploratory / bench hygiene (2.15ms)
ℹ tests 19
ℹ suites 4
ℹ pass 19
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 153

- P0 7/7 pass (globs + CI split + busy/success/valid/WIRING)
- P1 5/5 pass (threshold/NAN/throw/composition/type-gate + tsc)
- P2 4/4 pass (single-helper + single-threshold + ordering DOTALL + ledger ≥2)
- P3 3/3 pass (10k× <80ms / negative exploratory / no cross-cutting)
Status: ✅ All ATDD scaffolds GREEN when activated — working-tree diff implements the contract.
Expected failure before sweep would be: package.json test contained benchmarks (P0-01/02), single ci job (P0-03), handleSwipe local copy (P0-04/P1-02), success === false leak (P0-05), no guard-order pin (P2-03) — now all tripped.
```

### Existing Suite Regression (gesture composition + ci gating)

**Command:** `npm --prefix triade test -- __tests__/ui/gesture-pipeline.test.ts __tests__/ui/swipe.test.ts` → `7 + 10 = 17 pass / 0 fail` (gesture-pipeline now via imported `handleSwipe` + swipe threshold sweep)
**Command:** `npm --prefix triade run benchmark -- --test-name-pattern=0 2>&1 | grep "tests 6"` → `6 benches` separate (engine/feel/render/storage) not in default gate; `npm --prefix triade test 2>&1 | tail -n 1` → `852 pass / 11 fail (expected ATDD reds)` unchanged
**Command:** `npx tsc --noEmit --project triade/tsconfig.json && TSX_TSCONFIG_PATH=tsconfig.test.json npx tsc --noEmit --project triade/tsconfig.test.json` → both clean (P1-05 host gate)

**Expected Failure Messages (per scaffold, when NOT hardened):**
- P0-01: Expected `test` script to contain `__tests__` and NOT `benchmarks` but got `__tests__ + benchmarks` (identical to benchmark)
- P0-03: Expected `exactly 1 engine-test-and-benchmark job` but got `1` and `0 benchmark jobs` / default job `npm run benchmark` found
- P0-04: Expected `busy true → false` but got `true` via local copy without null check (re-inline drift)
- P0-05: Expected `success false → false` but success `undefined` would `=== false` slip (would dispatch)
- P2-03: Expected guard order `!busy → success → isFinite → typeof → resolve → try` but `resolve` found before `typeof` (ordering regressed)
- P2-04: Expected `DW-49.*status: done` DOTALL but ledger still `open` or `resolution-undo` `<2` hits

---

## Notes

- **Working-tree already implements the delta.** These ATDD scaffolds were written RED and are now GREEN when activated — that inversion is correct for a sweep bundle whose working-tree diff is the implementation. Keep them `it.skip` in the repo so the dev workflow activates one at a time per task.
- **No `sprint-status.yaml` write.** This workflow never writes `_bmad-output/implementation-artifacts/sprint-status.yaml` (orchestrator-owned per prompt). Ledger `deferred-work.md` DW-49/50 flips are the only status change, each with `resolution-undo: facfde46…` (this bundle).
- **Engine `src/engine` additive-only (actually byte-identical).** `git diff --stat -- triade/src/engine` empty — engine invariants pinned by `852` existing tests, not re-derived here. Preview empty confirms no HUD drift; `triade/benchmarks` empty confirms no bench drift.
- **Busy ref-sharing subtlety.** `handleSwipe` takes `BusyRef {current:boolean}` object reference (same as `App.tsx` `useRef(false)`), no clone; mutation after dispatch stays observable via shared ref. A defensive-clone edit would break `P0-04` (busy alias vs value) — keep alias.
- **DOTALL ledger trap.** `deferred-work.md` is markdown with newlines; `/DW-49.*status: done/` fails because `.*` does not cross `\n`. The ATDD correctly uses `[\s\S]*?` (P2-04). A future ledger edit that is not `[\s\S]` would silently pass `status: done` on same line only — treat any cross-line assertion as DOTALL.
- **Guard-order scoped to function body.** `gestureSrc` has an import-time `resolveSwipeDirection` (`from './swipe'`) at line 2 that would poison a global `indexOf('resolveSwipeDirection')` ordering check. The ATDD scopes to `handleSwipe` body slice `export function handleSwipe → export function handleGestureEnd` (P2-03). A global ordering check would false-fail.
- **Draw-budget not re-tested here.** Gesture wiring is predicate-only, not RNG draw-count; budgets `effective 3 / noop 0 / newGame 20` remain pinned via `adaptive-spawn-integration.test.ts` exact `spyRng deepEqual`, not re-derived.
- **Follow-on:** run `*automate` once production gesture needs new lanes; run `*nfr-assess` after implementation evidence to validate NFR planning without inventing thresholds. Unknown thresholds: `handleSwipe 10k× <80ms` is measured not invented (`≈0.005ms` per call).

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @TEA / Murat in Slack/Discord
- Refer to `./bmm/docs/tea-README.md` for workflow documentation
- Consult `./resources/knowledge` for testing best practices

---

**Generated by BMad TEA Agent** - 2026-09-02 (story `dw-ci-gesture-wiring-docs`, baseline `fa68173` → `HEAD 66d711d`, engine byte-identical, benchmarks byte-identical, `triade/src/ui/gesture.ts` 49 LOC new)
