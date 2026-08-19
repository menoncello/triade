# Automation Summary — Story 1.6

**Engine**: Custom TypeScript + React Native (Expo SDK 57, `node:test`, Node 26 native TS type-stripping)
**Story**: 1.6 — Input por swipe RNGH + edge-cases contract
**Tests Verified**: 143 triade (133 baseline + 10 story-1.6) · 26 web PWA frozen · `tsc --noEmit` clean
**Date**: 2026-08-18

## Scope of This Pass

Story 1.6 shipped with 10 red-phase ATDD scaffolds (swipe direction resolution +
purity guard) and the gesture/native wiring. This pass verifies the scaffolds are
**active and green** (no `test.skip(` remaining), confirms the story's AC coverage
at the pure layer, and closes no further gaps — the RNGH Pan wiring, cancel/
interruption, off-board release, second-finger, in-flight gate and pause hit-testing
are native/runtime behavior and are **manual** on the simulator/device by project rule.

## Verification Results

- `node --test` (from `triade/`) → **143 pass / 0 fail / 0 skip** (~1.7s).
- Story-1.6 file isolated: `node --test __tests__/ui/swipe.test.ts` → **10/10 pass** (~124ms).
- `npx tsc --noEmit` → **clean**.
- Frozen web PWA `node --test test/game.test.js` → **26/26 pass** (`js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` untouched).
- `src/engine/core` untouched (no rule changes — `moved:false` IS the rejection signal; the in-flight gate is visual control in `App`).
- No `test.skip(` remaining in `triade/__tests__/`.

## Test Distribution (story 1.6 surface)

| Type          | Count | Coverage |
| ------------- | ----- | -------- |
| Unit/swipe    | 10    | `SWIPE_THRESHOLD===20`, exact boundary |19|→null / |20|→direction (both signs), all four directions from sign, diagonal dominant-axis (horizontal + vertical), exact tie → null (silent noop, UX-DR-23), below-threshold diagonal → null, zero-magnitude → null, custom threshold override, purity/determinism |
| Unit/boundary | 1     | ADR-01/05: `swipe.ts` in `PURE_MODULES` — no RN/React/Skia/Expo imports, relative imports only |

**Files** (all active, from ATDD red phase):

- `triade/__tests__/ui/swipe.test.ts` (10 tests, P0/P1)
- `triade/__tests__/ui/ui.purity.test.ts` (guard now scans `layout.ts`, `orientation.ts`, `swipe.ts`)

## Story 1.6 Acceptance Criteria Coverage

| AC | Criterion | Coverage |
| -- | --------- | -------- |
| 1  | RNGH `Gesture.Pan()` ~20px activation; direction maps to engine `move()` | PARTIAL — direction-resolution half FULL (automated): `SWIPE_THRESHOLD===20`, dominant-axis tie-break, four directions; RNGH wiring (`Gesture.Pan`, `activeOffsetX/Y([-20,20])`, `onEnd(event, success)`, `.runOnJS(true)`, `GestureHandlerRootView`) verified in `App.tsx` code, manual on device |
| 2  | Cancelled gesture / system interruption → no move, no spawn, no turn | Manual — `onEnd(event, success)` with `success===false` → early return, no `move()`; simulator/device evidence |
| 3  | Release off the board mid-gesture resolves as captured | Manual — gesture owns the move; `onEnd` fires wherever the gesture ends, no off-board check |
| 4  | Concurrent second finger ignored (first finger wins); no second `move()` in flight | Manual — no `maxPointers(1)` (would cancel the first finger); RNGH default tracks one pointer; `busyRef` gate |
| 5  | Swipe during in-flight animation queued/rejected — never mid-animation mutation | Manual (gate) — `busyRef` set only on `moved:true`, cleared via aggregate `onMoveSettled`; swipes while busy REJECTED silently; engine noop path leaves the gate untouched (noop deadlock guard) |
| 6  | Pause always reachable (top-right), outside board swipe rect | Manual — gesture wraps only the board container; `Hud` overlay (`zIndex:1`) above it; `PauseButton` ≥44pt (1.5 guard) |

Supporting contracts: UX-DR-3 (`SWIPE_THRESHOLD` 20px, dominant-axis), UX-DR-23
(noop swipe silent — tie/sub-threshold → null), T2.2 (direction resolution
deterministic and pure), T2.3/T2.4 (swipe.ts in the ADR-01/05 purity guard).

## Manual Validation Handoff (native/runtime — project rule)

Documented, not automated (simulator/device evidence recorded in the story's completion note):

1. Swipe each direction resolves a move (RNGH Pan recognition, ~20px activation).
2. Sub-threshold touch → no move.
3. System-interruption cancel → no move (`success:false`).
4. Release off the board → move resolves.
5. Second finger → first finger wins, single move.
6. Rapid swipes during animation → rejected silently (busyRef gate); settle signal fires once after all tiles settle.
7. Pause reachable and tappable during play (settle-then-freeze is Epic 6; the button must not be swallowed by the gesture).

## Validation Checklist

- [x] Test framework initialized (`node:test`, Node 26, project-mandated)
- [x] Engine detected (custom TS/RN; `src/ui/swipe.ts` host-testable pure module, ADR-01)
- [x] Testable systems identified (`SWIPE_THRESHOLD`, `resolveSwipeDirection`, purity)
- [x] Existing tests located + patterns understood (variable-specifier dynamic-import activation, purity guard)
- [x] Coverage gaps identified (none — 10/10 scaffolds active and green cover the testable surface; RNGH/native is manual by rule)
- [x] Tests deterministic (pure function, literal fixtures, no `Math.random`)
- [x] Arrange-Act-Assert pattern used
- [x] No hard-coded waits; no cleanup needed (pure logic)
- [x] Tests isolated, no interdependencies, no execution-order dependence
- [x] Assertions have descriptive messages
- [x] Files in correct directories (`triade/__tests__/ui/`), engine-appropriate syntax
- [x] `tsc --noEmit` clean; triade 143/143; web PWA 26/26 frozen; `src/engine/core` untouched
- [x] CI (`ci.yml`) picks up the new tests automatically (`node --test` in `triade/`); informational coverage includes `src/ui/**`
- [x] Anti-patterns avoided (no engine-under-test, no hard waits as primary sync, no teardown leaks, no `Math.random`)

## Next Steps

1. Review the activated 1.6 suites (done — 10/10 green, 143/143 total).
2. Feed this summary into the upcoming code review (story is in `review`).
3. Manual device checks (7 items above) are the story's remaining evidence — record them in the completion note.
4. Do not pull forward: numerals legibility (1.7), pause state (Epic 6), adaptive spawn (Epic 2).
