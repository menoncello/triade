# Automation Summary — Story 1.5

**Engine**: Custom TypeScript + React Native (Expo SDK 57, `node:test`, Node 26 native TS type-stripping)
**Story**: 1.5 — Layout portrait e landscape
**Tests Verified**: 127 triade (109 baseline + 18 story-1.5) · 26 web PWA frozen · `tsc --noEmit` clean
**Date**: 2026-08-16

## Scope of This Pass

Story 1.5 shipped with 18 red-phase ATDD scaffolds (layout math, orientation boundary,
purity guard). This pass verifies those scaffolds are **active and green** (removed
`test.skip(`), confirms the story's AC coverage at the pure-math layer, and closes no
further gaps — the remaining surface (RN `Hud`/`PauseButton` composition, native
rotation/safe-area runtime) is manual on the simulator/device by project rule.

## Verification Results

- `node --test` (from `triade/`) → **127 pass / 0 fail / 0 skip** (~1.9s).
- `npx tsc --noEmit` → **clean**.
- Frozen web PWA `node --test test/game.test.js` → **26/26 pass** (`js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` untouched).
- All 18 story-1.5 scaffolds confirmed active — no `test.skip(` remaining.

## Test Distribution (story 1.5 surface)

| Type          | Count | Coverage |
| ------------- | ----- | -------- |
| Unit/layout   | 12    | `layoutFor` maximize, band collapse (landscape < portrait), insets respected, container-derived board, `SAFE_MARGIN=16`, edge cases (320x480, 2000x200, 200x2000), agreement with `isLandscape` |
| Unit/orient.  | 5     | `isLandscape` true/false/square, exact boundary (501/500 vs 499/500), purity/determinism |
| Unit/boundary | 1     | ADR-01/05: `layout.ts` + `orientation.ts` import nothing from RN/React/Skia/Expo, relative imports only |

**Files** (all active, from ATDD red phase):

- `triade/__tests__/ui/layout.test.ts` (12 tests, P0/P1)
- `triade/__tests__/ui/orientation.test.ts` (5 tests, P0/P1)
- `triade/__tests__/ui/ui.purity.test.ts` (1 test, P1)

## Story 1.5 Acceptance Criteria Coverage

| AC | Criterion | Coverage |
| -- | --------- | -------- |
| 1  | Portrait HUD composition (score center-top, best below, preview bottom, pause top-right) | Manual (RN `Hud`/`PauseButton` on simulator) — documented, not automated (project rule) |
| 2  | Landscape thin top-edge band, board dominates below (22pt/11pt) | FULL (automated) — `layout.test.ts` band collapse + height-bounded board; RN composition manual |
| 3  | Pause top-right, outside board swipe rect, ≥44x44, inside safe margins | Manual — `PauseButton.tsx` is a 48x48 Pressable (≥44x44 contract); native placement manual |
| 4  | Safe areas from `react-native-safe-area-context` + 16pt margin, both orientations | FULL (automated, pure math) — insets feed `layoutFor`; `SAFE_MARGIN===16`; native source manual |
| 5  | Board maximizes in the space left; tile size derives from container | FULL — maximize sweep (5 sizes), container-derived board, never a fixed constant |
| 6  | Landscape HUD collapses to thin band, board dominates (D-006) | FULL — `bandHeight(landscape) < bandHeight(portrait)`; board > band; height-bounded |

Supporting contracts: UX-DR-4 (`SAFE_MARGIN`=16), UX-DR-20 (board from container),
D-006 (band collapse), T2.2 (single orientation source of truth — `layoutFor.isLandscape`
agrees with `isLandscape`).

## Validation Checklist

- [x] Test framework initialized (`node:test`, Node 26, project-mandated)
- [x] Engine detected (custom TS/RN; pure-UI modules host-testable, ADR-01)
- [x] Testable systems identified (`layoutFor`, `SAFE_MARGIN`, `isLandscape`, purity)
- [x] Existing tests located + patterns understood (dynamic-import activation, purity-guard)
- [x] Coverage gaps identified (none — 18/18 scaffolds cover the testable surface; RN/native is manual by rule)
- [x] Tests deterministic (pure functions, literal fixtures, no `Math.random`)
- [x] Arrange-Act-Assert pattern used
- [x] No hard-coded waits; no cleanup needed (pure logic)
- [x] Tests isolated, no interdependencies, no execution-order dependence
- [x] Assertions have descriptive messages
- [x] Files in correct directories (`triade/__tests__/ui/`), engine-appropriate syntax
- [x] `tsc --noEmit` clean; triade 127/127; web PWA 26/26 frozen
- [x] Anti-patterns avoided (no engine-under-test, no hard waits as primary sync, no teardown leaks)

## Next Steps

1. Review the activated 1.5 suites (done — 18/18 green, 127/127 total).
2. Story 1.5 is **done** — merge `feature/1-5-layout-portrait-e-landscape`.
3. Remaining manual validation on simulator/device: landscape rotation visual pass,
   notch/home-indicator safe areas, HUD composition, pause hit-target — record evidence
   in the story completion note (native runtime, project rule).
4. Do not pull forward: swipe input (1.6), numerals legibility (1.7), pause state (Epic 6).

## Post-Review Fixes (2026-08-17, gds-test-review)

Closed the 4 findings from the story-1.5 test review:

1. **Clamp-path test** — `layout.test.ts` now pins oversized insets → `boardSize === 0` (never negative) while the band still renders.
2. **Golden anchors** — `layout.test.ts` adds 414×896 → 382 and 1024×768 → 692 (de-couples the maximize sweep from the mirror formula).
3. **`src/ui/**` CI coverage** — `ci.yml` informational include now covers `src/ui/**`.
4. **Thin-view guard + AC-3 tripwire** — new `triade/__tests__/ui/ui.thinview.test.ts` (RN-primitive/same-dir-imports-only for `Hud.tsx`/`PauseButton.tsx`; exported `HIT_TARGET = 48 ≥ 44` applied to the button box). `stripComments`/`extractSpecifiers` hoisted into `test-utils/helpers.ts` (shared with `ui.purity`).

**Updated evidence**: `node --test` → **131/131 pass** (109 baseline + 22 story-1.5); story-1.5 files isolated **22/22** (~141 ms); web PWA **26/26** frozen; `npx tsc --noEmit` clean.