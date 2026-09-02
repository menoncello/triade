---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-ci-gesture-wiring-docs.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/package.json'
  - 'triade/src/ui/gesture.ts'
  - 'triade/src/ui/swipe.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/ui/gesture-pipeline.test.ts'
  - '.github/workflows/ci.yml'
  - 'triade/benchmarks/engine.bench.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-ci-gesture-wiring-docs — split benchmark from default test + extract gesture wiring to testable module

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-ci-gesture-wiring-docs`
**Scope:** Targeted test design for the working-tree delta of `dw-ci-gesture-wiring-docs`

> **Delta under assessment:** `HEAD 66d711d` (`refactor(ci-gesture): split benchmark from default test, extract gesture wiring to testable module (DW-49, DW-50)`) vs baseline `fa68173` (`spec-ci-gesture-wiring-docs.md` `baseline_revision`). `HEAD` contains 5 production deltas + 1 untracked spec:
> - `triade/package.json` — `test: "TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \"__tests__/**/*.test.ts\""` (was `"__tests__/**/*.test.ts" "benchmarks/**/*.test.ts"` duplicated) + `benchmark: "TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \"benchmarks/**/*.test.ts\""` (was identical to `test`) → separates timing-sensitive benchmarks from default run (DW-49)
> - `.github/workflows/ci.yml` — job `engine-test-and-benchmark` keeps name (branch protection) but `Run tests` becomes `(benchmarks excluded — see benchmark job)` + new parallel job `benchmark` duplicates `checkout/setup-node/npm ci` then `Run benchmark gate (timing-sensitive, separate from default test) → npm run benchmark` → default path excludes benchmarks, benchmark never gates release
> - `triade/src/ui/gesture.ts` — NEW 49 LOC module exporting `handleSwipe(dx,dy,busy,dispatch,opts?)` (busy null+current gate, `opts.success` fail-closed via `'success' in opts && !opts.success`, `Number.isFinite(dx/dy)`, `typeof dispatch==='function'`, `resolveSwipeDirection({dx,dy})`, `try/catch dispatch`) + `handleGestureEnd(event,success,busy,dispatch)` (null+typeof translationX/Y, `!success` early, delegates to `handleSwipe` with `{success}`) — extracts `App.tsx` `onEnd` contract (DW-50)
> - `triade/App.tsx` — `import { handleGestureEnd } from './src/ui/gesture.ts'` + `panGesture.onEnd((event,success)=> handleGestureEnd(event,success,busyRef,dir=>doMoveRef.current(dir)))` replacing inline wiring; `SWIPE_THRESHOLD` retained for `activeOffsetX/Y` gate; `busyRef` still `useRef(false)` shared mutable object
> - `triade/__tests__/ui/gesture-pipeline.test.ts` — replaces local `handleSwipe` copy with `import { handleSwipe } from '../../src/ui/gesture.ts'` + helper `swipeToMove` composes imported `handleSwipe` with `game.move` for board-mutation assertions; WIRING assertion kept as secondary guard (`handleGestureEnd` + `doMoveRef.current(dir)` + `SWIPE_THRESHOLD` + `gesture.ts` `resolveSwipeDirection`)
> - `triade/src/ui/swipe.ts` untouched (`SWIPE_THRESHOLD=10`, `resolveSwipeDirection` `ax===ay→null` tie, `ax>ay? ax<threshold→null : ay<threshold→null` + sign)
> - `_bmad-output/implementation-artifacts/spec-ci-gesture-wiring-docs.md` untracked (intent/boundaries/I-O matrix 7 rows, 5 ACs, Code Map, Tasks, Verification) — not production code
> - `_bmad-output/implementation-artifacts/deferred-work.md` — DW-49 (`triade/package.js` `benchmark identical to test`) and DW-50 (`gesture-pipeline.test.ts` local copy) flipped `status: open` → `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-ci-gesture-wiring-docs` + `resolution-undo: facfde46…`; working-tree diff vs `HEAD` is ledger-only (metadata), assessed delta is `HEAD` vs `fa68173`
> - `triade/src/engine` byte-identical (`git diff --stat -- triade/src/engine` empty), gameplay unchanged, no new deps, no new `tsconfig`

---

## Executive Summary

**Scope:** Two orthogonal hardenings with zero gameplay change: (1) split timing-sensitive benchmarks out of the default `npm test`/`npm ci` path so `engine-test-and-benchmark` is fast and stable while benchmarks run in a dedicated `benchmark` job (DW-49), and (2) extract the `App.tsx` pan `onEnd` contract (busy-gate + success-gate + `resolveSwipeDirection` + `doMove` dispatch) into `triade/src/ui/gesture.ts` so `gesture-pipeline.test.ts` imports the real wiring instead of a local copy while keeping the WIRING regex as a secondary guard (DW-50). Verification is host-only unit + source-text gating; no device lane, no E2E.

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (≥6): 3
- Critical categories: TECH (single-wiring dedup drift + dispatch contract), OPS (benchmark exclusion + CI required-checks), BUS (silent swipe suppression)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit + 3 grep gates — script glob exclusion + WIRING + threshold — plus `tsc` clean both configs, already green)
- P1 scenarios: 7 groups (engine→gesture fixtures + CI job shape + guard-order pin + dispatch never-throw + threshold coupling)
- P2/P3 scenarios: 6 groups (single-helper/single-threshold allowlists, ledger `resolution-undo`, glob-drift perf guard, exploratory)
- **Total effort**: ~3.5–6.0 hours (~0.5–0.8 days; host-only, no device lane)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Benchmark budget/performance thresholds** (`BUDGET_ENGINE_PER_TURN_MS 0.1`, `BUDGET_FRAME_TAIL_P99_MS 0.2`) | Budgets unchanged; this bundle only re-homes the run, not the gate values. | Benchmarks still assert budgets in `benchmark` job; infra change in separate story if re-tuning is desired. |
| **Swipe threshold tuning (`SWIPE_THRESHOLD=10`)** | Threshold is `swipe.ts` invariant, byte-identical; gesture extraction must preserve it, not retune. | `resolveSwipeDirection` + `layout.test.ts` fins + `gesture-pipeline.test.ts` sub-threshold/diagonal pins remain. |
| **Gesture physics/animation (busy timer `onMoveSettled`)** | `busyRef` still cleared by `GameBoard` `onMoveSettled`; wiring change is dispatch predicate only. | `gesture-pipeline.test.ts` `T3.4` + engine smokes still exercise gate; animation timing is `GameBoard` unit. |
| **E2E/device swipe** | Host-only refactor; RNGH `Gesture.Pan().activeOffsetX/Y` + `runOnJS(true)` preserved byte-identically. | WIRING regex + single-helper import is sufficient; deferred E2E smoke remains manual. |
| **Gameplay / merge / spawn logic** | No `triade/src/engine` change (`git diff --stat` empty). | Engine smokes + purity scan green; not re-tested here beyond composition helper. |
| **Sprint-status.yaml transitions** | Orchestrator-owned ledger; DW-49/50 are `deferred-work.md` only. | Pinned as out-of-scope; not mutated or asserted beyond non-regression. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Single-wiring dedup drift** — `gesture.ts:19 handleSwipe` is single source but `App.tsx:804` could re-inline busy/success/dispatch logic, voiding `gesture-pipeline.test.ts` real-wiring guarantee. | 2 | 3 | 6 | Keep single `handleSwipe`/`handleGestureEnd` definition; gate duplication via `rg "handleGestureEnd|handleSwipe" -- triade/App.tsx triade/src/ui/gesture.ts` == 2 definitions + WIRING import assertion. | DEV / QA | Pre-merge |
| R-002 | OPS | **Benchmark exclusion regression** — `package.json` `test` glob `__tests__/**/*.test.ts` vs `benchmark` glob `benchmarks/**/*.test.ts` could desync (added test dir missed, or `benchmark` re-points to `__tests__`). | 2 | 3 | 6 | Pin exact globs via `rg` scan: `test` must contain `__tests__` and not `benchmarks`, `benchmark` must contain `benchmarks` and not `__tests__`; counts validated (`npm test` 852+ not 946, `npm run benchmark` 6). | DEV | Pre-merge |
| R-003 | TECH | **Dispatch fail-closed contract** — busy null, success falsy, NaN/Infinity, non-function dispatch, untolerant dispatch throw must all fail-closed (return false, no move) without hiding engine throw as silent noop in prod. | 2 | 3 | 6 | Exhaustive `handleSwipe` guards in order (`!busy||busy.current` → `opts success` → `Number.isFinite(dx/dy)` → `typeof dispatch` → `resolveSwipeDirection` → `try/catch dispatch`) plus `handleGestureEnd` null/typeof/`!success`; unit pin covers 6 falsy/boundary shapes, `try/catch` returns false. | DEV | Pre-merge |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | OPS | **CI required-checks rename** — job name `engine-test-and-benchmark` must stay stable for branch protection; adding `benchmark` as new required check would gate deploys on timing-sensitive bench. | 1 | 3 | 3 | Keep default job name byte-identical; `benchmark` job is informational (never added to required checks); verify `.github/workflows/ci.yml` has 2 jobs, default has 5 steps excl. bench, bench job has `Run benchmark gate` step alone. | DEV / Platform |
| R-005 | TECH | **Threshold coupling** — `swipe.ts SWIPE_THRESHOLD=10` gates both `resolveSwipeDirection` and `App.tsx activeOffsetX/Y [-10,+10]`; gesture extraction could decouple or shadow the constant. | 2 | 2 | 4 | Single `SWIPE_THRESHOLD` literal in `swipe.ts`; `gesture.ts` never shadows it, `App.tsx` imports same `SWIPE_THRESHOLD`; threshold-invariant test sweep (5→null, 20→dir, tie→null) covers coupling. | DEV |
| R-006 | TECH | **Guard-order regression** — `handleSwipe` early returns must precede `resolveSwipeDirection` (busy/success/NaN must block before direction resolve + dispatch side-effect). | 2 | 2 | 4 | Fixed order pin: `rg "if\(!busy"` + `if\(opts` + `Number\.isFinite` before `resolveSwipeDirection`; unit covers busy=true (no direction), NaN dx (no direction), success=false (no direction) without calling dispatch spy. | DEV |
| R-007 | TECH | **Swallow vs hide engine throw** — `try { dispatch(dir) } catch { return false }` is correct never-throw but could mask `game.move` invariant violation as silent swipe-noop in prod. | 1 | 3 | 3 | Keep `try/catch` narrow (dispatch only), return false observably; engine throws still surface via `engine.smoke`/`game.test.ts` strict suites; gesture unit adds throwing-dispatch spy returns false. | DEV / QA |
| R-008 | PERF | **Glob perf / CI time drift** — `__tests__` ~900 tests vs `benchmarks` 6 benches; a glob typo (`**/*.test.ts` without prefix) would re-merge benches into default and re-flake CI. | 2 | 2 | 4 | `package.json` scan gates prefix; timing delta `npm test` <15 s vs benches ~2 s separate; CI `npm test` step comments `benchmarks excluded`. | DEV |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | OPS | Ledger `resolution-undo: facfde46…` 64-hex + `sprint-status.yaml` ownership | 1 | 2 | 2 | Monitor — `rg "resolution-undo: [0-9a-f]{8,}"` 2 hits for DW-49/50; `sprint-status.yaml` never asserted beyond non-modification. |
| R-010 | DATA | `BusyRef` shared mutable alias vs value copy (App `useRef(false)` vs test `{current:false}` literal) | 1 | 1 | 1 | Monitor — both pass object reference to `handleSwipe`; no clone; mutation (`busyRef.current=true`) after dispatch stays observable; no fix needed. |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability | Gesture never-throw: `handleSwipe`/`handleGestureEnd` return false on null/NaN/busy/success/throwing dispatch, never throw to caller | R-003, R-007 | Host unit: call with `null busy`, `NaN dx`, `throwing dispatch` → assert false no throw; `App.tsx` `doMove` stays `try/catch` fire-and-forget | `gesture-pipeline.test.ts` pass; `gesture.ts` `try/catch` line |
| Reliability | Default CI stable: `npm test` excludes `benchmarks/` so p99 bench tail never flakes default gate | R-002, R-008 | Host count: `npm test` count = `__tests__` only; `npm run benchmark` count = `benchmarks` only; CI `engine-test-and-benchmark` never runs `npm run benchmark` | `package.json` glob scan + `ci.yml` 2-job shape |
| Maintainability | Single wiring: one `handleSwipe` definition, one `resolveSwipeDirection` consumer, one `SWIPE_THRESHOLD` literal (10) | R-001, R-005 | `rg` allowlists: `handleSwipe` definition count==1, `resolveSwipeDirection` import count==1 in `gesture.ts`, `SWIPE_THRESHOLD` definition count==1 in `swipe.ts` | `rg` reports; `gesture.ts`/`swipe.ts` scan |
| Maintainability | Single script invariant: `test` → `__tests__`, `benchmark` → `benchmarks`, no overlapping globs | R-002, R-004 | Literal scans: `rg '"test".*__tests__'` in `package.json`, `rg '"benchmark".*benchmarks'` + neg lookups | `package.json` greps |
| Performance | Gesture O(1) unchanged: extraction adds one call indirection, no loop/alloc | R-008 | Bench literal: previous `feel.bench.test.ts` gate `median<0.05 p99<0.1`; gesture stays `<1 ms` per call | Existing bench reports (not re-measured for this bundle) |
| Performance | CI wall time: `npm test` host <15 s, split does not add infra | R-008 | CI timing: `engine-test-and-benchmark` parallel with `benchmark` job, total not gate-prolonged | CI run log (optional; not required) |
| Compliance | Ledger `resolution-undo` 64-hex for DW-49/50, `sprint-status.yaml` ownership preserved | R-009 | `rg "resolution-undo:" -- deferred-work.md` 2 hits 64-hex; `git diff --stat -- sprint-status.yaml` empty | `deferred-work.md` ledger grep |

**Unknown thresholds:** None — this bundle introduces no new performance SLO beyond existing bench budgets (`0.1/0.2 ms`), and no new network/compliance thresholds. Existing `SWIPE_THRESHOLD=10` remains the only product threshold.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec-ci-gesture-wiring-docs `status: done`, `final_revision 4b44cf1` reviewed)
- [ ] Test environment provisioned and accessible (host `node >=26`, `tsx`, `TSX_TSCONFIG_PATH=tsconfig.test.json`)
- [ ] Test data available or factories ready (`staticBoard`, `rngOf`, `gameState` helpers, `mulberry32` deterministic)
- [ ] Feature deployed to test environment (`HEAD 66d711d` checked out, `triade/src/engine` byte-identical baseline `fa68173`)
- [ ] `spec-ci-gesture-wiring-docs.md` Code Map and I/O matrix accepted (globs, busy/success/NaN/diagonal gates)
- [ ] Ledger DW-49/DW-50 `open→done` intent recorded in `deferred-work.md` (not gating implementation, docs-sidecar of this bundle)

## Exit Criteria

- [ ] All P0 tests passing
- [ ] All P1 tests passing (or failures triaged with waiver)
- [ ] No open high-priority / high-severity bugs (R-001..R-003 100% mitigated or waived)
- [ ] Test coverage agreed as sufficient (P0 100%, P1 ≥95%)
- [ ] Ledger `resolution-undo` 64-hex for DW-49/50 present, `sprint-status.yaml` untouched (`git diff --stat` empty)
- [ ] `package.json` `test` excludes `benchmarks`, `benchmark` includes `benchmarks`, `ci.yml` 2-job shape, WIRING secondary guard green

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | Dev/QA | Owns gesture harness + CI glob gates + ledger pins |
| — | Platform | Owns branch-protection stability (`engine-test-and-benchmark` name) |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3 = priority/risk, NOT execution timing.` Execution timing is defined in the Execution Strategy section.

### P0 (Critical) - Blocks core functionality + High risk + No workaround

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|-----------|-------|-------|
| Package glob: `npm test` excludes `benchmarks/` | Unit (source-text `rg` + count) | R-002 | 1 | DEV | `rg '"test".*__tests__.*test\.ts' package.json` passes; `rg '"test".*benchmarks'` fails; count delta host 946→940 confirms exclusion |
| Package glob: `npm run benchmark` isolates `benchmarks/` | Unit (source-text `rg` + run) | R-002 | 1 | DEV | `rg '"benchmark".*benchmarks.*test\.ts'` passes; `rg '"benchmark".*__tests__'` fails; `npm run benchmark -- --test-name-pattern=0` 6 benches only |
| CI split: `engine-test-and-benchmark` (default) never runs benchmark; `benchmark` job runs `npm run benchmark` alone | Unit (yaml `rg`) | R-002, R-004 | 1 | DEV | `rg "engine-test-and-benchmark"` + `rg "^  benchmark:"` 2 jobs; default job has `Run tests.*benchmarks excluded` step, no `npm run benchmark`; bench job has single `Run benchmark gate` step |
| Busy-gate: `busy.current===true` suppresses any swipe (valid/50px/threshold) | Unit (`handleSwipe` import) | R-001, R-003 | 1 | DEV | `swipeToMove(30,0,busy:true)` → null; dispatch spy not called |
| Success-gate: `success===false` suppresses even when busy idle | Unit (`handleSwipe` import + `handleGestureEnd`) | R-003 | 1 | DEV | `swipeToMove(30,0,success:false)` → null; `handleGestureEnd(event,false,busy,dispatch)` → false |
| Valid swipe dispatches with real wiring and mutates board | Unit (`handleSwipe`→`game.move` composition) | R-001, R-003 | 1 | DEV | `30,2→right` merges 2+1→3 at right wall; `-30,1→left` merges 1+2→3; uses imported `handleSwipe` not local copy |
| WIRING regex: App binds `handleGestureEnd` + `doMoveRef.current(dir)` + `SWIPE_THRESHOLD`, gesture module resolves via `resolveSwipeDirection` | Unit (source-text) | R-001, R-005 | 1 | DEV | `readFileSync App.tsx /handleGestureEnd/ + /doMoveRef\.current\(dir\)/ + /SWIPE_THRESHOLD/` + `readFileSync gesture.ts /resolveSwipeDirection/` — secondary guard |

**Total P0**: 7 checks, ~0.8–1.2 hours (hosts <1 s run; scan <1 s)

### P1 (High) - Important features + Medium risk + Common workflows

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|-----------|-------|-------|
| Threshold coupling: sub-threshold (`dx=5<10`) and diagonal tie (`dx==dy 20,20`) resolve to null without dispatch | Unit (fixtures) | R-005, R-006 | 1 | DEV | `swipeToMove(5,1)` → null, `(20,20)` → null, spy not called |
| Guard-order: NaN/Infinity dx/dy and null/non-finite event return false before `resolveSwipeDirection`/`dispatch` | Unit (spy + throws) | R-003, R-006 | 1 | DEV | `handleSwipe(NaN,0,busy,dispatch)` → false dispatch not called; `handleGestureEnd({translationX:NaN},true,…)` → false; also `null event` → false |
| Dispatch never-throw: throwing dispatch is caught and returns false rather than bubbling | Unit (spy throwing) | R-003, R-007 | 1 | DEV | `dispatch = ()=>{throw new Error()}` → `handleSwipe(30,2,busy,dispatch)===false` no throw |
| Engine→gesture composition: `handleSwipe` with `game.move(state,dir,rng)` preserves board-mutation contract (merge path same as raw `move()`) | Unit (helpers `staticBoard/rngOf/gameState`) | R-001 | 1 | DEV | Right/left mutations already P0; add `directional-spawn` invariant that swipe still spawns via `move()` not stub |
| CI name stability: default job name byte-identical `engine-test-and-benchmark` (branch protection) inc. second job not required | Unit (yaml) | R-004 | 1 | DEV | `rg "^  engine-test-and-benchmark:"` exactly 1 hit; `rg "^  benchmark:"` exactly 1; no `required: benchmark` in repo settings |
| Dispatch type-gate: `typeof dispatch !== 'function'` returns false without calling `resolveSwipeDirection` | Unit | R-003 | 1 | DEV | `handleSwipe(30,2,busy,null)` + `(dx,dy,busy,123 as any)` → false |
| `tsc --noEmit` clean both configs (`tsconfig.json` + `tsconfig.test.json`) | Unit (type) | R-001, R-003 | 1 | DEV | `npx tsc --noEmit` + `npx tsc --noEmit --project tsconfig.test.json` clean; catches `BusyRef`/`SwipeEvent` shape drift |

**Total P1**: 7 checks, ~1.0–1.6 hours

### P2 (Medium) - Secondary features + Low risk + Edge cases

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|-----------|-------|-------|
| Single-helper allowlist: `handleSwipe` definition count==1 (`gesture.ts` only), not re-inlined in `App.tsx` | Unit (rg) | R-001 | 1 | DEV | `rg -n "function handleSwipe|export function handleSwipe"` ==1 hit `gesture.ts:19`; `rg "busyRef\.current.*resolveSwipeDirection"` in `App.tsx` ==0 |
| Single-threshold allowlist: `SWIPE_THRESHOLD` definition count==1 (`swipe.ts` only) | Unit (rg) | R-005 | 1 | DEV | `rg "SWIPE_THRESHOLD\s*=\s*10"` ==1 hit `swipe.ts:3`; `gesture.ts` never defines it |
| Guard-order literal ordering pin: `!busy` → `success` → `Number.isFinite` → `typeof dispatch` → `resolveSwipeDirection` → `try` | Unit (source-text) | R-006 | 1 | DEV | Sequential `rg` indices in `gesture.ts` increasing line numbers |
| Ledger: DW-49/DW-50 `resolution-undo: facfde46…` 64-hex + `status: done` present | Unit (rg) | R-009 | 1 | DEV | `rg "DW-49.*status: done" -- deferred-work.md` + `rg "resolution-undo: [0-9a-f]{8,}"` 2 hits with `7374…` prefix |
| Glob literal single-source: `benchmarks/` appears only via `package.json` `benchmark` script, not `test` | Unit (rg) | R-002, R-008 | 1 | DEV | `rg "benchmarks" -- package.json` ==1 hit `benchmark` line; `rg "test\".*benchmarks"` ==0 |

**Total P2**: 5 checks, ~0.7–1.0 hours

### P3 (Low) - Nice-to-have + Exploratory + Performance benchmarks

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|-----------|------------|-------|-------|
| `handleSwipe` micro-bench `10k×` <5 ms wall (O(1) trivial, no loop) | Unit (bench) | 1 | DEV | Optional `feel.bench.test.ts` extension; not gating, single `handleSwipe` call with busy false + valid dx/dy |
| Negative exploratory: `handleSwipe(∞,∞)` / `{translationX: undefined}` / `busy=undefined` all fail-closed false without throw | Unit | 1 | DEV | Complements R-003 NaN guard; run locally, not CI |
| Cross-cutting: `git diff --stat -- triade/src/engine` empty + `git diff --stat -- triade/benchmarks` empty (no engine/bench drift) | Unit (rg) | 1 | DEV | One-liner git guards; invoked only when working-tree dirty |

**Total P3**: 3 checks, ~0.3–0.5 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test triade/__tests__/ui/gesture-pipeline.test.ts` 7/7 green (<1 s)
- [ ] `rg 'handleGestureEnd' triade/App.tsx` and `rg 'handleSwipe' triade/src/ui/gesture.ts` (`<0.1 s`)
- [ ] `rg '"test".*__tests__' package.json` + `rg '"benchmark".*benchmarks' package.json` (`<0.1 s`)

**Total**: 3 smoke checks

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [ ] P0 7 groups (globs + CI split + busy + success + valid + WIRING + tsc quick) — all host unit/source-text

**Total**: 7 checks

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] P1 7 groups (threshold/diagonal, NaN/null, dispatch throw, composition, job name, type-gate, tsc both configs)

**Total**: 7 checks

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] P2 5 allowlist/ledger/glob checks + P3 3 exploratory/bench (optional)

**Total**: 5+3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 7 | 0.10–0.15 | ~0.7–1.1 | Globs + WIRING greps + busy/success fixtures reused from existing `gesture-pipeline` |
| P1 | 7 | 0.12–0.20 | ~0.9–1.4 | NaN/throw/type-gate fixtures + CI yaml shape + tsc double-config |
| P2 | 5 | 0.12–0.20 | ~0.6–1.0 | Allowlist scans (`handleSwipe` single-def, `SWIPE_THRESHOLD` single-def, guard order) + ledger pin |
| P3 | 3 | 0.10–0.18 | ~0.3–0.6 | Optional `10k×` bench + negative exploratory + engine-empty diff |
| **Total** | **22** | **-** | **~3.5–6.1** | **~0.5–0.8 days wall-clock (host-only, no device lane)** |

> Estimates include `tsc --noEmit` both configs and `<15 min` gate (`npm test` host). No device/preview lane is required for this bundle — pure host TS. Widen the interval to `4–8 h` if CI job renames are revisited or additional `benchmarks/` files are added.

### Prerequisites

**Test Data:**

- `staticBoard([...])` 4×4 board fixture, `rngOf(0,0,0.5)` deterministic RNG, `gameState(board)` wrapper — from `triade/test-utils/helpers.ts`
- `SwipeEvent {translationX, translationY}` literal + `BusyRef {current:boolean}` object

**Tooling:**

- `node --import tsx --test` (Node test runner, TS via `tsx`)
- `rg` (ripgrep) for source-text allowlist gates
- `npx tsc --noEmit` both configs

**Environment:**

- Node `>=26` (from `triade/package.json` `engines`), Expo SDK 57 pinned (`expo ~57.0.11`, `expo-audio ~57.0.3` — not exercised here but import-stable)
- `triade/test-utils/rn-stub.ts` via `tsconfig.test.json` `paths` (RN mock for host)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions) — globs, CI split, busy/success/valid/WIRING and `tsc` must all pass
- **P1 pass rate**: ≥95% (waivers required for single P1 failure after triage)
- **P2/P3 pass rate**: ≥85% (informational; allowlists/exploratory may be deferred)
- **High-risk mitigations**: 100% complete or approved waivers (R-001..R-003)

### Coverage Targets

- **Critical paths**: ≥80% — gesture wiring (`handleSwipe`/`handleGestureEnd` + `resolveSwipeDirection` composition) 100% via P0/P1
- **Business logic**: ≥70% — `game.move` composition already covered by `gesture-pipeline.test.ts` right/left fixtures; no new engine branch added
- **Edge cases**: ≥50% — busy, success, sub-threshold, diagonal, NaN, throw, type-gate
- **CI config**: 100% — both `package.json` globs + `.github/workflows/ci.yml` 2-job shape

### Non-Negotiable Requirements

- [ ] All P0 tests pass (incl. `npm test` excludes benches, WIRING regex, busy/success)
- [ ] No high-risk (≥6) items unmitigated (R-001 single-wiring, R-002 exclusion, R-003 fail-closed)
- [ ] Default `npm test` never runs `benchmarks/**/*.test.ts` (R-002)
- [ ] `handleSwipe` never throws to caller on bad input (R-003)
- [ ] ledger `resolution-undo` 64-hex for DW-49/50 present, `sprint-status.yaml` untouched
- [ ] `tsc --noEmit` clean both configs (`triade/tsconfig.json` + `triade/tsconfig.test.json`)

---

## Mitigation Plans

### R-001: Single-wiring dedup drift — `gesture.ts:19` single `handleSwipe` vs re-inline in `App.tsx` (Score: 6)

**Mitigation Strategy:**
1. Keep `handleSwipe` definition count==1: `rg -n "export function handleSwipe"` must hit only `triade/src/ui/gesture.ts:19`.
2. Keep `App.tsx:804` as delegate only: `handleGestureEnd(event,success,busyRef,…)` — no local busy/success/NaN gate literal in `App.tsx`.
3. Gate drift in CI with `rg "busy\.current|Number\.isFinite\(dx"` inside `App.tsx` ==0 hits for gesture predicate; any non-zero is patch-required.
4. Import assertion P0 ensures WIRING stays: `gesture-pipeline.test.ts` fails if `App.tsx` drops `handleGestureEnd` or `doMoveRef.current(dir)`.

**Owner:** DEV / QA
**Timeline:** Pre-merge (this bundle)
**Status:** In Progress (code lands with `HEAD 66d711d`, gate to be pinned by this design)
**Verification:** P0 `WIRING` test green + P2 `single-helper allowlist` green + `tsc` both configs green.

### R-002: Benchmark exclusion regression — `package.json` glob desync (Score: 6)

**Mitigation Strategy:**
1. Pin `test` script literal scan: must contain `__tests__/**/*.test.ts` and not `benchmarks` (`rg`).
2. Pin `benchmark` script literal scan: must contain `benchmarks/**/*.test.ts` and not `__tests__`.
3. Count delta host: `node --import tsx --test "__tests__/**/*.test.ts" --test-reporter=spec | grep "# tests"` vs `benchmarks/**/*.test.ts` to show exclusion (940 vs 6).
4. Add comment in `ci.yml` `Run tests (benchmarks excluded — see benchmark job)` and gate no-typo via `rg "benchmarks excluded"` in default job.

**Owner:** DEV
**Timeline:** Pre-merge
**Status:** In Progress (scripts already split, scan to be added)
**Verification:** P0 `package.json` scans green + `npm test` count + `npm run benchmark` count.

### R-003: Dispatch fail-closed contract — busy null / success falsy / NaN / dispatch throw swallowing (Score: 6)

**Mitigation Strategy:**
1. Implement guard order `!busy||busy.current` → `!success`/`opts success` → `Number.isFinite(dx/dy)` → `typeof dispatch` → `resolveSwipeDirection` → `try/catch dispatch` (already lands as `HEAD`).
2. Unit pin: 6 cases — `busy:true→false`, `success:false→false`, `NaN dx→false`, `null busy→false`, `null dispatch→false`, `throwing dispatch→false` all without throw and without calling `game.move` spy.
3. Complement: `handleGestureEnd(null event)` / `non-finite translation` → false before delegating.
4. Narrow `try/catch` to dispatch only; do not wrap `resolveSwipeDirection` — invariant violation in `resolveSwipeDirection` must still surface (no blanket swallow).

**Owner:** DEV
**Timeline:** Pre-merge
**Status:** Complete in code (`gesture.ts:26-38` + `46`); verification pinned by this design
**Verification:** P0 `busy/success` + P1 `NaN/throw/type-gate` 100% green, no `try/catch` around `resolveSwipeDirection`.

---

## Assumptions and Dependencies

### Assumptions

1. `triade/src/engine` is byte-identical to `fa68173` — no gameplay change; gesture wiring is pure dispatch predicate, not board logic.
2. `benchmarks/*.bench.test.ts` budgets are informational, not release-gating — separating the job is approved policy (DW-49 review).
3. `sprint-status.yaml` remains orchestrator-owned; DW-49/50 are `deferred-work.md` ledger only — not `sprint-status.yaml` transitions.
4. `Node 26` (`package.json` `engines >=26`) and `tsconfig.test.json` `rn-stub` path remain the host test harness — no device bench is required for this bundle.
5. `spec-ci-gesture-wiring-docs.md` `final_revision 4b44cf1` intent is accepted; review triage patches (6 landed) are not re-reviewed here.

### Dependencies

1. `triade/src/ui/swipe.ts` `SWIPE_THRESHOLD=10` + `resolveSwipeDirection` semantics stable — required for threshold coupling tests.
2. `triade/__tests__/ui/gesture-pipeline.test.ts` `staticBoard/rngOf/gameState` harness stable — required for board-mutation composition fixtures.
3. Branch protection rules referencing `engine-test-and-benchmark` remain unchanged — required before making `benchmark` a required check (intentionally not required now).

### Risks to Plan

- **Risk**: Benchmark job silently skipped in forks without `ci.yml` permissions
  - **Impact**: Budget regressions undetected in PRs
  - **Contingency**: `benchmark` job is informational; weekly bench cron can be added later; not a release blocker.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`triade/src/ui/swipe.ts`** | None — untouched, directly consumed by `gesture.ts` | `ui.norolls` + `engine.purity` green, `layout.test.ts` if threshold changed (not here) |
| **`triade/App.tsx` pan wiring** | Delegates to `handleGestureEnd`; preserve `activeOffsetX/Y` `[-10,+10]` + `runOnJS(true)` + `doMoveRef` freshness | `gesture-pipeline.test.ts` WIRING + `app.gameOverWiring.test.ts` + `app.restart.test.ts` |
| **`triade/__tests__/ui/gesture-pipeline.test.ts`** | Now imports real wiring; local copy deduped | Same file P0/P1 suite must stay green 7/7 |
| **`triade/benchmarks/*`** | Re-homed, not deleted | `npm run benchmark` 6 benches green, `npm test` no benches |
| **`.github/workflows/ci.yml`** | New job `benchmark`, default not gating on benches | CI run: both jobs parallel, `npm ci` cached via `package-lock.json` |
| **`triade/src/engine`** | None — byte-identical | `engine.smoke` + `game.test.ts` + `transitionPlan.test.ts` unchanged |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (TECH/SEC/PERF/DATA/BUS/OPS, owner/timeline)
- `probability-impact.md` - Risk scoring 1–3 P×I = 1–9, high ≥6 MITIGATE, 9 BLOCK
- `test-levels-framework.md` - Test level selection (Unit for pure `handleSwipe`, source-text `rg` for wiring)
- `test-priorities-matrix.md` - P0/P1/P2/P3 prioritization (P0 = blocks core + high risk + no workaround)
- `nfr-criteria.md` - NFR thresholds (60 FPS, never-throw, single-source maintainability)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-ci-gesture-wiring-docs.md` (baseline `fa68173`, final `4b44cf1`)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-49/DW-50 `facfde46…` 2026-09-02)
- Prior test design reference: `test-design-dw-test-scanner-helpers-hardening.md` (pattern for helper single-source + `rg` allowlist)
- Config: `_bmad/tea/config.yaml` (test_artifacts `_bmad-output/test-artifacts`, test_design_output `_bmad-output/test-artifacts/test-design`)

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Execution Mode**: sequential (auto → sequential fallback)
