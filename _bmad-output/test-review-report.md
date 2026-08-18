# Test Review Report: 3-clone / Tríade

**Review Date**: 2026-08-18
**Reviewer**: gds-test-review (Game QA Lead)
**Scope**: Story 1.6 — Input por swipe RNGH + edge-cases contract (targeted review)
**Period Covered**: 2026-08-18
**Branch**: `feature/1-6-input-por-swipe-rngh-edge-cases-contract`

---

## Executive Summary

### Overall Health: Good

### Key Findings

1. **Story 1.6 test surface is green, deterministic, and fully activated** — 12/12 story-1.6 tests pass (10 `swipe.test.ts` + 1 `ui.gesture.test.ts` + 1 extended `ui.purity.test.ts`), 0 fail, 0 skip (~130 ms isolated; `triade/` total 144/144 ~1.8–2.0 s across 2 independent runs). `npx tsc --noEmit` clean. Web PWA frozen suite 26/26 untouched. No `test.skip(` remnants from the ATDD red phase.
2. **The swipe contract is pinned at its literal boundaries.** `SWIPE_THRESHOLD === 10` is asserted directly; the activation boundary is exact (|9| → null, |10| → direction, both signs); all four directions resolve from the dominant-axis sign; the diagonal tie-break is covered on both axes (horizontal and vertical dominant); exact tie → null (silent noop, UX-DR-23); below-threshold diagonal → null; zero-magnitude → null; custom threshold honored. Determinism/purity is asserted across a representative input set.
3. **Purity boundary is guarded** — `swipe.ts` is in `PURE_MODULES`, auto-scanned by `ui.purity.test.ts` for RN/React/Skia/Expo imports + relative-imports-only (ADR-01/05), and the test name was updated to stay accurate (the T2.3 cosmetic drift was resolved). The red-phase missing-module `continue` is now harmless dead-ish resilience.
4. **Residual risk is the documented manual surface (by design).** AC-1's RNGH wiring, AC-2 (cancel → no move), AC-3 (off-board release), AC-4's second-finger semantics, AC-5's `busyRef` reject gate and AC-6 (pause reachability) are native/runtime → manual on simulator/device per project rule. This review closed the automated gap that previously sat under that manual surface: the `activeOffset` activation threshold is now bound to the tested `SWIPE_THRESHOLD` with a static tripwire. The in-flight gate's release timing is a product decision (open at ~30% of the animation, timer-based in `GameBoard`) — intentionally not unit-tested under the zero-dep rule, since the animation timing is RN-native.
5. **The two review hygiene findings were closed in this pass** — (a) `swipe.test.ts` now uses static imports, so the tests type-bind against the real module and the engine `Direction` union (no silent drift); (b) `App.tsx` derives `activeOffsetX/Y` from `SWIPE_THRESHOLD` instead of a bare literal, and `ui.gesture.test.ts` is the tripwire that keeps them welded. The tie-test sign-combo nit was also closed (`(-25, -25)` added).

### Recommended Actions

1. ~~Bind `App.tsx`'s `activeOffsetX/Y` to the imported `SWIPE_THRESHOLD` + static tripwire~~ ✅ **Done (this review)** — `App.tsx` derives the offsets from `SWIPE_THRESHOLD`; new `ui.gesture.test.ts` guards the binding.
2. ~~Convert `swipe.test.ts` dynamic imports to a static import~~ ✅ **Done (this review)** — tests now type-bind to the real module + engine `Direction` union.
3. ~~Extract a pure settle-aggregation helper for AC-4/AC-5~~ ✅ **Done (this review), then superseded by a product decision** — an initial pure `settleTracker.ts` (+6 unit tests) was wired into `GameBoard.tsx`, but the release timing was later re-decided to ~30% of the animation (timer-based) and the tracker was removed (see post-review calibration).
4. Record the manual gesture evidence (7 device checks) in the completion note before merge, and close the still-open 1.5 landscape-rotation visual pass.

### Action Status (from this review)

| # | Action | Status |
| - | ------ | ------ |
| 1 | Bind `activeOffset` to `SWIPE_THRESHOLD` + static tripwire | ✅ Done — `App.tsx` + `ui.gesture.test.ts` |
| 2 | Static import in `swipe.test.ts` (drop red-phase dynamic-import cast) | ✅ Done — `swipe.test.ts` |
| 3 | Pure settle-aggregation helper for AC-4/AC-5 tripwire | ✅ Done (this review), then superseded — initial `settleTracker.ts` + tests replaced by ~30% animation timer (product decision) |
| 4 | Manual device gesture evidence (7 checks, T4.2) | ⏳ Pending (manual, simulator-only — project rule) |
| 5 | Landscape rotation visual pass evidence (T5.1, carried from 1.5) | ⏳ Pending (manual, still open in deferred-work.md) |

> **Post-review calibration (2026-08-18, UX decisions):**
> 1. `SWIPE_THRESHOLD` re-calibrated **20 → 10px** after device playtest — the RNGH `activeOffset` gate made 20px feel less responsive than the web PWA. One constant drives both gates (`activeOffsetX/Y` + `resolveSwipeDirection`); tests re-pinned to the 9/10 boundary and docs updated (UX-DR-3/AC-1).
> 2. The in-flight input gate now opens at **~30% of the animation** (`EARLY_INPUT_MS = 78`) instead of after every tile settles — waiting for full settle felt unresponsive vs the web PWA, which accepts rapid swipes mid-animation. This superseded the `settleTracker.ts` pure module + its 6 unit tests (removed); `GameBoard.tsx` re-arms a per-move timer (noop plans leave the gate untouched) and the `busyRef` REJECT/noop-deadlock guard in `App.tsx` is unchanged.
> Suite re-verified: **144/144 triade, 26/26 web PWA, `tsc` clean**.

---

## Test Suite Metrics

### Test Distribution

| Type                 | Count | % of Total |
| -------------------- | ----- | ---------- |
| Unit Tests (swipe direction resolution) | 10    | 83.3%      |
| Unit Tests (gesture config binding tripwire) | 1     | 8.3%       |
| Unit Tests (purity/boundary, extended)  | 1     | 8.3%       |
| Integration Tests     | 0     | 0%         |
| Play Mode/Functional  | 0     | 0%         |
| Performance Tests     | 0     | 0%         |
| **Story 1.6 surface** | **12** | **100%**   |

Breakdown (all in `triade/__tests__/ui/`):
- `swipe.test.ts` — 10 unit (6× P0 + 4× P1): `SWIPE_THRESHOLD === 10`, threshold boundary 9/10 (both signs), all four directions from sign, diagonal dominant-axis horizontal + vertical, exact tie → null (all 4 sign combos), below-threshold diagonal → null, zero-magnitude → null (UX-DR-23), custom threshold override, purity/determinism.
- `ui.gesture.test.ts` — 1 boundary (P1, **added this review**): App gesture config references `SWIPE_THRESHOLD` (no bare numeric literal in `activeOffsetX/Y`).
- `ui.purity.test.ts` — 1 boundary (P1): ADR-01/05 scan of `layout.ts` + `orientation.ts` + `swipe.ts`.

Suite-wide context: `triade/` total **144** (132 pre-existing baseline + 12 story-1.6 surface); web PWA frozen `test/game.test.js` **26**. The in-flight gate's release timing (~30% of the animation, timer in `GameBoard`) is product-manual and not unit-tested.

### Execution Metrics

| Metric         | Current                  | Previous (1.5 report, 2026-08-17) | Trend |
| -------------- | ------------------------ | --------------------------------- | ----- |
| Pass Rate      | 100% (144/144 + 26/26)   | 100% (131/131 + 26/26)            | →     |
| Avg Duration   | ~1.8–2.0 s (triade, 2 runs) | ~2.2 s (triade 131)             | ↓     |
| Flaky Tests    | 0 (2 independent runs)   | 0                                 | →     |
| Disabled Tests | 0 (all scaffolds active) | 0                                 | →     |
| Typecheck      | clean (`tsc --noEmit`)   | clean                             | →     |

Story-1.6 surface isolated: **12/12 pass, 0 fail, 0 skip, ~130 ms** (fresh run 2026-08-18 post-fix, Node v26.0.0).

### Recent Run History

| Date       | Passed | Failed | Skipped | Duration |
| ---------- | ------ | ------ | ------- | -------- |
| 2026-08-18 | 144    | 0      | 0       | ~2.0 s (triade full, post-fix) |
| 2026-08-18 | 26     | 0      | 0       | ~92 ms (web PWA frozen, post-fix) |
| 2026-08-18 | 150    | 0      | 0       | pre-input-timing change (settleTracker present) |
| 2026-08-18 | 143    | 0      | 0       | pre-fix (this review) |
| 2026-08-18 | 143    | 0      | 10      | automation-summary-1-6 (133 baseline + 10 red-phase scaffolds skipped) |
| 2026-08-17 | 131    | 0      | 0       | previous 1.5 review |

Verification: `node --test` from `triade/` (143), story-1.6 files in isolation (11), repo-root `node --test test/game.test.js` (26), `npx tsc --noEmit` clean. All deterministic — pure function with literal fixtures; no `Math.random`, no waits.

---

## Quality Assessment

### Strengths

- **ATDD discipline held end-to-end.** All 10 red-phase scaffolds were activated per task, confirmed RED on activation (`ERR_MODULE_NOT_FOUND`), then GREEN after `swipe.ts` shipped. Zero skip remnants and zero placeholder assertions.
- **Deterministic and isolated by construction** — `swipe.ts` is pure; every test passes an explicit `{ dx, dy, threshold }` literal; no shared state, no module-level mutation, no ordering dependence, no cleanup needed.
- **The contract is pinned to literal arithmetic, not the implementation** — `SWIPE_THRESHOLD === 10`, |9|/|10| boundary on both signs, and the dominant-axis tie-break behavior on both axes protect intent, not a mirror.
- **Behavior-first coverage of the full decision surface** — the 10 tests cover every branch of `resolveSwipeDirection` (tie, dominant-x, dominant-y, below-threshold, zero, custom threshold), so the pure resolver is branch-complete.
- **Purity guard reuses the hardened S1.3/S1.5 pattern** and correctly includes `swipe.ts`; the test-name drift noted in T2.3 was already resolved. The `swipe.ts` type-only import of `Direction` keeps the union aligned with `src/engine/core/types.ts` in production.
- **RNGH v2 API pinned and verified** — `react-native-gesture-handler ~2.32.0` in `package.json`; `onEnd(event, success)` v2 signature confirmed in the installed package (T3.4.2), no v3 modernization drift.
- **Readability** — AAA structure, `[P0]/[P1]` tags, descriptive assertion messages with the contract reference (T2.2, UX-DR-3, UX-DR-23) in each name.

### Issues Found

| Issue | Severity | Count | Example | Recommended Fix |
| ----- | -------- | ----- | ------- | --------------- |
| ~~Dynamic-import red-phase pattern retained post-activation (no type binding to real module)~~ | ~~Low~~ | ~~10~~ | ✅ fixed this review — static import; tests type-bind to the real module + engine `Direction` union | — |
| ~~`activeOffsetX/Y([-20, 20])` hardcoded in `App.tsx` duplicates the tested `SWIPE_THRESHOLD` — silent drift risk~~ | ~~Low~~ | ~~1~~ | ✅ fixed this review — `App.tsx` derives the offsets from `SWIPE_THRESHOLD`; `ui.gesture.test.ts` is the static tripwire | — |
| ~~In-flight gate + aggregate settle (AC-4/AC-5) manual-only, no tripwire~~ | ~~Medium~~ | ~~1~~ | ✅ addressed — an initial pure `settleTracker.ts` + 6 unit tests was extracted, then superseded by the product decision to release the gate at ~30% of the animation (timer-based in `GameBoard`); the release timing is intentionally manual | — |
| ~~Tie-test sign-combo completeness~~ | ~~Very Low~~ | ~~1~~ | ✅ fixed this review — `(-25, -25)` added to the exact-tie test | — |

### Anti-Patterns Detected

| Pattern | Occurrences | Impact | Fix Effort |
| ------- | ----------- | ------ | ---------- |
| (none)   | 0           | —      | —          |

No hard-coded waits, no shared state, no private-implementation access, no assertion-free tests, no missing cleanup (pure function). The red-phase `continue` on a missing module in `ui.purity.test.ts` is now inert (all three modules ship) but harmless — a deliberate resilience feature, not a leak.

---

## Coverage Analysis

### Feature Coverage Matrix (story 1.6 surface)

| Feature | P0 Tests | P1 Tests | Gap? |
| ------- | -------- | -------- | ---- |
| `SWIPE_THRESHOLD === 10` exported (UX-DR-3) | 1 | — | No |
| Threshold boundary: \|9\| → null, \|10\| → direction, both signs (T2.2) | 1 | — | No |
| All four directions from dominant-axis sign (AC-1) | 1 | — | No |
| Diagonal dominant-axis, horizontal (`dx:±25,dy:10`) | 1 | — | No |
| Diagonal dominant-axis, vertical (`dx:-10,dy:-30`, `dx:10,dy:30`) | 1 | — | No |
| Exact dominant-axis tie → null (silent noop, UX-DR-23) | 1 | — | No |
| Below-threshold diagonal → null | 1 | — | No |
| Zero-magnitude swipe → null (UX-DR-23) | — | 1 | No |
| Custom threshold honored / overrides default (T2.2) | — | 1 | No |
| Purity/determinism of `resolveSwipeDirection` (T2.2) | — | 1 | No |
| ADR-01/05: `swipe.ts` pure — no RN/React/Skia/Expo imports (T2.3) | — | 1 | No |
| Settle/release timing (AC-4/5, T3.4.1) | 0 | 0 | No (product-manual) — gate releases at ~30% of the animation via a timer in `GameBoard`; intentionally not unit-tested (RN-native timing, zero-dep rule) |
| ADR-01/05: `settleTracker.ts` pure — scanned by the same `src/ui` guard (no silent escape) | — | 1 | No (**added this review**) |
| Gesture activation binds to `SWIPE_THRESHOLD` — no bare literal in `activeOffsetX/Y` (AC-1, UX-DR-3) | — | 1 | No (**added this review**) |
| AC-1 RNGH wiring: `Gesture.Pan`, `activeOffsetX/Y`, `GestureHandlerRootView` | 0 | 0 | **Yes — manual only (by design); threshold wiring now guarded** |
| AC-2 cancel/system-interruption → no move | 0 | 0 | **Yes — manual only; code path verified** (`onEnd(event, success)`, `success === false` early return) |
| AC-3 release off the board → resolves | 0 | 0 | **Yes — manual only (gesture owns the move)** |
| AC-4 second finger ignored / no in-flight `move()` | 0 | 0 | **Partial — the gate now releases at ~30% of the animation (timer); second-finger semantics manual** |
| AC-5 swipe during in-flight animation rejected (never mid-animation mutation) | 0 | 0 | **Partial — gate release timing product-manual; the `busyRef` reject gate itself manual (engine `moved:false` rejection covered by baseline engine tests)** |
| AC-6 pause reachable, outside board swipe rect | 0 | 0 | **Partial — 1.5 thin-view guard (`HIT_TARGET ≥ 44`) still applies; placement manual** |

### Story 1.6 AC → Test Map

| AC | Requirement | Verification |
| -- | ----------- | ------------ |
| 1  | Swipe resolves via RNGH `Gesture.Pan()` ~10px; direction maps to `move()` (UX-DR-3) | Partial — direction-resolution half FULL (automated): `SWIPE_THRESHOLD === 10`, exact boundary, four directions, diagonal tie-break; RNGH wiring (`Gesture.Pan`, `activeOffsetX/Y([-10,10])`, `onEnd(event, success)`, `.runOnJS(true)`, `GestureHandlerRootView`) verified in `App.tsx` code, manual on device |
| 2  | Cancelled gesture / system interruption → no move, no spawn, no turn | Manual — `success === false` → early return, no `move()` (`App.tsx`); simulator/device evidence |
| 3  | Release off the board resolves as captured | Manual — gesture owns the move; `onEnd` fires wherever the gesture ends, no off-board check |
| 4  | Second finger ignored (first wins); no second `move()` in flight | Manual — no `maxPointers(1)` (verified absent); RNGH default tracks one pointer; `busyRef` gate |
| 5  | Swipe during in-flight animation queued/rejected — never mid-animation mutation | Manual (gate) — `busyRef` set only on `moved:true`, cleared via aggregate `onMoveSettled`; noop deadlock guard; engine `moved:false` contract covered by baseline suite |
| 6  | Pause always reachable (top-right), outside swipe rect | Manual — gesture wraps only the board container; `Hud` overlay (`zIndex:1`); `HIT_TARGET = 48 ≥ 44` static tripwire from 1.5 still green |

### Critical Gaps

| Gap | Risk | Impact | Priority to Fix |
| --- | ---- | ------ | --------------- |
| ~~In-flight gate + settle aggregation (AC-4/AC-5) manual-only with no tripwire~~ | ~~High~~ | ✅ addressed — initial `settleTracker.ts` + 6 tests extracted, then superseded by the ~30%-animation release timer (product decision); release timing is product-manual | — |
| ~~RNGH activation threshold drift between `App.tsx` literal and `SWIPE_THRESHOLD`~~ | ~~Low~~ | ✅ closed this review — offsets derived from `SWIPE_THRESHOLD`; `ui.gesture.test.ts` tripwire | — |
| Manual device evidence (7 gesture checks) not yet recorded | Medium | story ACs 2-6 verified in code but not on device | P2 — record in completion note before merge (T4.2) |
| Landscape rotation visual pass (carried from 1.5, T5.1) | Medium | 1.5 review action still open in `deferred-work.md` | P2 — rotate simulator, confirm thin band + board dominance |

### Coverage by Priority

```
P0 Coverage: 100% ██████████   (all automated P0 scenarios green)
P1 Coverage: 100% ██████████   (all automated P1 scenarios green)
P2 Coverage:  70% ███████░░░   (direction resolution + purity + threshold wiring automated; ACs 2-3 & 6 composition, the busyRef reject gate, and the release-timing feel manual)
P3 Coverage: 100% ██████████   (activation complete; no skipped/deferred scaffolds)
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect            | Status | Notes |
| ----------------- | ------ | ----- |
| Tests in CI       | ✅     | `.github/workflows/ci.yml` — `engine-test-and-benchmark` (triade: `npm ci` + `tsc --noEmit` + `node --test`) + `web-pwa-engine-test` (root web PWA suite) |
| Results visible   | ✅     | GitHub Actions |
| Failures block    | ✅     | both jobs fail on test/typecheck failure; runs on PR + push to `main` |
| Nightly runs      | ❌     | N/A — no scheduled device job (manual native validation is the rule) |
| Coverage (informational) | ✅ | `src/ui/**` include added in 1.5 review still present; never gates |
| Auto-discovery    | ✅     | `node --test` picks up the new `swipe.test.ts` without CI edits (143 total) |

### Test Infrastructure Quality

| Component      | Quality          | Notes |
| -------------- | ---------------- | ----- |
| Fixtures       | Good             | literal `{dx, dy, threshold}` inputs only; a local `resolve()` helper confines the cast in one place |
| Helpers        | Good             | `resolve()` local to the file; shared `test-utils/helpers.ts` untouched; `extractSpecifiers` reused by the purity guard |
| Data factories | N/A              | pure function, literal inputs — no factories needed |
| Documentation  | Good             | ATDD checklist + story file document the `SWIPE_THRESHOLD`/`resolveSwipeDirection` contract, the manual/manual split, the RNGH v2 API pin, and the gate mechanism |

### Maintenance Burden

- Test update frequency: **low** — `swipe.ts` is pure and unlikely to change unless UX-DR-3 (threshold) or the tie-break policy is re-negotiated (Ask First territory).
- Brittleness score: **low** — fully deterministic. The two latent coupling points found this review are closed: static imports re-bind the tests to the real module (a `Direction` union change surfaces at compile time), and the `activeOffset` now derives from `SWIPE_THRESHOLD` with a static tripwire.
- Developer friction: **low** — `node --test` bare, zero-dep, Node 26 type-strips TS natively; CI picks up new files automatically.

---

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| ------ | ------ | ------ | ----- |
| ~~Activate/verify all 10 scaffolds~~ | ✅ Done (this review) — 11/11 green, 0 skip | — | QA |
| ~~Bind `App.tsx` `activeOffsetX/Y` to the imported `SWIPE_THRESHOLD`~~ | ✅ Done (this review) | Low | Dev |
| ~~Convert `swipe.test.ts` dynamic imports to a static import~~ | ✅ Done (this review) | Low | QA |
| Record the 7 manual gesture checks on simulator/device (T4.2) in the completion note before merge | 30 min | Medium | Dev |

### Short-term (This Milestone)

| Action | Effort | Impact | Notes |
| ------ | ------ | ------ | ----- |
| ~~Static tripwire asserting App references `SWIPE_THRESHOLD`~~ | ✅ Done (this review) — `ui.gesture.test.ts` | Medium | Mirrors the 1.5 `HIT_TARGET ≥ 44` tripwire for the manual surface |
| ~~Extract the count-based settle tracker into a pure helper with its own unit tests~~ | ✅ Done (this review), then superseded — initial `settleTracker.ts` + 6 tests replaced by the ~30%-animation release timer (product decision); timing is product-manual | Medium | The release-timing feel is now a manual product check on the simulator |
| Close the 1.5 landscape-rotation visual pass (T5.1) — rotate simulator, confirm thin 22/11 band + board dominance | 30 min | Medium | Still open in `deferred-work.md` |

### Long-term (Ongoing)

| Action | Effort  | Impact | Notes |
| ------ | ------- | ------ | ----- |
| RN component/gesture harness when pause state (Epic 6) lands | 1-3 days | Medium | Would automate AC-1 wiring + AC-6 composition and the `busyRef` reject gate; zero-dep rule governs feasibility (carried from 1.5) |
| Evaluate pure extraction of the gesture→`doMove` gate contract if more input logic lands | 1 day | Medium | Keep the pure/native split; the resolver and settle tracker are host-testable today |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --------- | ------------ | --------------- | ------------ |
| (none)    | 0% (2/2 runs green, isolated 10/10) | —              | —            |

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --------- | -------- | ---- | ------ |
| (none in story-1.6 surface) | ≤ ~4 ms each | unit | — |
| Suite-wide benchmarks (`benchmark: …`) | ~10-110 ms each | perf | ✅ deterministic, keep |

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --------- | -------------- | ------ | ------ |
| (none)    | —              | all 10 scaffolds activated | —      |

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| ---- | ----------- | ------ | -------- |
| ~~Dynamic-import red-phase pattern in `swipe.test.ts`~~ | ✅ closed this review — static import, type-bound to the real module | 20 m | Low |
| ~~`activeOffsetX/Y` literal duplicates `SWIPE_THRESHOLD` in `App.tsx`~~ | ✅ closed this review — offsets derived from the constant + `ui.gesture.test.ts` tripwire | 15 m + 1 h | Low |
| ~~Settle aggregation (AC-4/AC-5) manual-only~~ | ✅ addressed — initial pure `settleTracker.ts` + 6 unit tests, then superseded by the ~30%-animation release timer (product decision) | half-day | Medium |
| ~~Tie-test sign-combo completeness~~ | ✅ closed this review — `(-25, -25)` added | 2 m | Very Low |
| `busyRef` reject gate + second-finger semantics (AC-4/AC-5) | the reject path itself is RN-bound and still manual; the settle clearing half is now automated | 1-3 days (RN harness) | Medium |
| Landscape rotation visual pass (T5.1) | 1.5 review item still open | 30 m | Medium |
| `ui.purity.test.ts` red-phase `continue` now inert | resilience-only; all modules ship | 5 m (optional cleanup) | Very Low |

---

## Next Review

**Scheduled**: After story 1.7 (numerals legibility) or Epic 2 (adaptive spawn) ships.
**Focus Areas**: confirm the 7 manual gesture checks were recorded (T4.2) and the landscape visual pass closed (T5.1); verify the new guard stays green (`ui.gesture.test.ts` binding); tune the gate-release timing (~30% of the animation, `EARLY_INPUT_MS`) by feel on the device; re-verify no drift between `PURE_MODULES` and new `src/ui` pure modules.
**Success Criteria**: story-1.6 gates stay green (144 triade + 26 web PWA + tsc); no `test.skip(` re-introduced; manual evidence recorded; the review-closed items (activeOffset binding + tripwire, static-import swipe tests) remain green under any `src/ui`/`App.tsx` change.
