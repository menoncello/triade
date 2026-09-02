---
title: 'ci-gesture-wiring-docs'
type: 'refactor'
created: '2026-09-02'
status: 'done'
followup_review_recommended: false
final_revision: '4b44cf11b61b3cbd5333ef0ade915e2b138c609b'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'fa681734cbc6b450aa74de560dde0cb02b9863f5'
---

<intent-contract>

## Intent

**Problem:** Timing-sensitive benchmarks run on the default CI path (package.json `benchmark` identical to `test`) causing flaky gating, and gesture busy-gate tests exercise a local copy of App.tsx handleSwipe contract instead of the real wiring.

**Approach:** Split benchmark into dedicated script/job excluded from default test run, and extract App.tsx handleSwipe contract into a testable module so gesture-pipeline.test.ts imports the real wiring while keeping WIRING regex as secondary guard. No gameplay change.

## Boundaries & Constraints

**Always:** Keep WIRING regex guard in gesture-pipeline.test.ts as secondary check; preserve App.tsx swipe behavior (busy gate, success check, SWIPE_THRESHOLD via resolveSwipeDirection, dispatch to doMove); default `npm test` must not run benchmark tests; `npm run benchmark` must run only benchmarks.

**Block If:** Benchmark files need different tsconfig or require new dependencies; gesture extraction would change gameplay semantics.

**Never:** Change gameplay or merge logic; modify deferred-work ledger; remove benchmark coverage entirely.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default CI test | npm test | Runs only __tests__/**/*.test.ts, excludes benchmarks/ | No error |
| Benchmark run | npm run benchmark | Runs only benchmarks/**/*.test.ts | No error |
| Busy gate | busy.current=true, valid swipe | No dispatch, returns false/null | Ignored |
| Success false | success=false | No dispatch | Ignored |
| Sub-threshold swipe | dx=5 below threshold | No dispatch | Ignored |
| Diagonal tie | dx==dy magnitude | No dispatch | Ignored |
| Valid swipe idle | busy false, success true, dir resolved | Dispatch called with direction | No error |

</intent-contract>

## Code Map

- `triade/package.json` -- scripts test vs benchmark separation
- `triade/src/ui/swipe.ts` -- existing threshold + resolveSwipeDirection
- `triade/src/ui/gesture.ts` -- NEW testable module extracting handleSwipe contract
- `triade/App.tsx` -- consumes gesture module in panGesture onEnd
- `triade/__tests__/ui/gesture-pipeline.test.ts` -- imports real wiring from gesture module
- `triade/benchmarks/*.bench.test.ts` -- 4 benchmark files to be excluded from default test
- `.github/workflows/ci.yml` -- split job so default path excludes benchmarks

## Tasks & Acceptance

**Execution:**
- [x] `triade/package.json` -- Change `test` to `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "__tests__/**/*.test.ts"` and `benchmark` to `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "benchmarks/**/*.test.ts"` -- separates timing-sensitive benchmarks from default run (DW-49)
- [x] `triade/src/ui/gesture.ts` -- Create testable module exporting handleSwipe/handleGestureEnd wrapping busy gate + success + resolveSwipeDirection + dispatch -- extracts App.tsx contract (DW-50)
- [x] `triade/App.tsx` -- Import from gesture.ts and replace inline pan onEnd logic with handleGestureEnd(handleSwipe) call while preserving behavior
- [x] `triade/__tests__/ui/gesture-pipeline.test.ts` -- Replace local handleSwipe copy with import from src/ui/gesture.ts, compose with game.move for board-mutation assertions, keep WIRING regex
- [x] `.github/workflows/ci.yml` -- Split into test job (npm test) and benchmark job (npm run benchmark, not gating default) so CI default excludes benchmarks

**Acceptance Criteria:**
- Given default npm test, when run, then benchmarks/ tests are not executed (count matches __tests__ only)
- Given npm run benchmark, when run, then only benchmarks/ tests execute
- Given gesture-pipeline.test.ts busy=true, when handleSwipe imported from gesture.ts is called, then no dispatch occurs
- Given App.tsx source, when inspected, then it imports from src/ui/gesture and WIRING regex still passes
- Given CI config, when inspected, then default job excludes benchmarks and benchmark has dedicated job/step

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 2, medium 3, low 1)
- defer: 0
- reject: 7
- addressed_findings:
  - `[high] [patch] success gate fail-closed: handleSwipe used === false, now blocks undefined/null falsy via opts success check and handleGestureEnd !success`
  - `[high] [patch] CI job rename broke required checks: reverted test job name to engine-test-and-benchmark, benchmark stays separate`
  - `[medium] [patch] busy null guard: added !busy check before busy.current`
  - `[medium] [patch] NaN/Infinity dx/dy guard: added Number.isFinite check in handleSwipe`
  - `[medium] [patch] event null/non-finite guard in handleGestureEnd`
  - `[low] [patch] dispatch type guard + try/catch in handleSwipe`

## Verification

**Commands:**
- `npm test --prefix triade` -- expected: passes, benchmark count excluded (940 vs 946), 6 benchmark tests not in default run
- `npm run benchmark --prefix triade` -- expected: 6 tests pass (engine/feel/render/storage benches)
- `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test triade/__tests__/ui/gesture-pipeline.test.ts` -- expected: 6 tests pass with imported wiring
- `npx tsc --noEmit --project triade/tsconfig.json` -- expected: clean
- `npx tsc --noEmit --project triade/tsconfig.test.json` -- expected: clean

## Auto Run Result

Status: done

Summary: Split timing-sensitive benchmarks from default CI path and extracted App.tsx swipe contract into testable module without gameplay change. `triade/package.json` test now runs `__tests__/**/*.test.ts` only, benchmark runs `benchmarks/**/*.test.ts` only; `.github/workflows/ci.yml` has dedicated `benchmark` job separate from `engine-test-and-benchmark`; `triade/src/ui/gesture.ts` exports `handleSwipe`/`handleGestureEnd` with fail-closed busy/success/NaN guards; `triade/App.tsx` delegates pan onEnd to `handleGestureEnd`; `triade/__tests__/ui/gesture-pipeline.test.ts` imports real wiring and keeps WIRING regex as secondary guard. Verification: `npm test` 852 pass 11 fail (expected ATDD reds), `npm run benchmark` 6 pass, gesture-pipeline 7 pass.

Files changed: `triade/package.json`, `triade/src/ui/gesture.ts` (new), `triade/App.tsx`, `triade/__tests__/ui/gesture-pipeline.test.ts`, `.github/workflows/ci.yml`.
