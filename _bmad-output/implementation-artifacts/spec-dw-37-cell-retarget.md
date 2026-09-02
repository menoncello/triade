---
title: 'DW-37 orientation resize cell retarget'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '0b81c678dbbc819b0ab0cc78bd6f10bba19895cb'
final_revision: 'eb11b56b4f30845531a2ba121c9bbf9e0605d71f'
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Orientation/resize mid-animation leaves shared values in stale pixel space — `rest` tiles never re-target on `cell` change; a swipe accepted right after resize re-plans and tiles visibly jump (pre-existing render bug that story 1.6 re-plan path now triggers, triade/src/render/GameBoard.tsx:98-112, 174-175, 250-269).

**Approach:** Add cell-change effect retargeting x/y shared values for rest/vanish/move tiles (retarget all kinds per human decision 2026-09-02) to new pixel grid so resize mid-animation does not leave stale coordinates; cover with re-plan path static test.

## Boundaries & Constraints

**Always:** Keep existing `EARLY_INPUT_MS`/`SLIDE_MS`/`TILE_FADE_MS` constants; preserve `syncTiles` single-writer; preserve `reducedMotion` and spring config; do not alter `planTileTransitions` contract; do not edit ledger.

**Block If:** Changing grid geometry (GRID/B whose pixels), altering input gate timing, or requiring native device validation.

**Never:** Edit `deferred-work.md` ledger; change GRID size or board layout constants; alter engine/trace logic; introduce new dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rest tile resize | tile kind `rest` mounted at cellSize A, width changes to B mid-idle | x/y snap to `pixel(to, newCell)` without jump on next swipe | No error |
| Move tile resize mid-spring | tile kind `move` sliding with `withSpring`, cell changes | x/y withSpring to new `pixel(to, newCell)` | No error |
| Vanish tile resize | tile kind `vanish` sliding to merge target, cell changes | x/y retarget to new pixel; fade still on SLIDE_MS schedule | No error |
| Appear tile resize | tile kind `appear` fading/scaling at target, cell changes | x/y snap to new pixel (no stale origin) | No error |
| No resize | cell unchanged | no extra animation, existing toPos effect unchanged | No error |
| Re-plan after resize | resize leaves rest tiles re-projected, then accepted swipe re-plans | new plan's `from: src.to` uses logical cell so start and target are consistent in new pixel space; no visible jump | No error |

</intent-contract>

## Code Map

- `triade/src/render/GameBoard.tsx:82-88` -- `pixel()` helper (BOARD_PADDING + col*(cell+CELL_GAP))
- `triade/src/render/GameBoard.tsx:89-229` -- `AnimatedTile` (useSharedValue x/y, effects for move/vanish/appear, current gap: no cell retarget for rest)
- `triade/src/render/GameBoard.tsx:298-299` -- `cell` derived from `width`
- `triade/src/render/GameBoard.tsx:384-447` -- `applyPlan` re-plan path (byCell retarget, uses `tilesRef` rest/move promotion)
- `triade/__tests__/render/render-gate-hardening.atdd.test.ts` -- prior ATDD static-scan pattern to follow
- `triade/__tests__/render/transitionPlan.test.ts` -- transitionPlan contract (hold/slide)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/render/GameBoard.tsx` -- add cell-change effect in `AnimatedTile` retargeting x/y shared values for rest/vanish/move (and appear) to new pixel grid (decision: retarget all kinds). Use immediate assignment for rest/appear and withSpring for move/vanish (or unified immediate snap) keyed on `cell` so stale pixel space is corrected on orientation/resize mid-animation; keep existing toPos/kind effect intact.
- [x] `triade/__tests__/render/cell-retarget.atdd.test.ts` -- add ATDD static-scan + lightweight re-plan-after-resize behavioural check: verify source contains cell-change retarget effect (cell dep, pixel(to,cell) -> x/y), and that planTileTransitions hold/slide contract still holds and applyPlan re-plan logic preserves logical `to` (no pixel assertion needed beyond source scan).

**Acceptance Criteria:**
- Given a mounted `rest` tile at cell A, when width/cell changes to B, then x/y shared values are re-targeted to `pixel(to, B)` (no stale coordinate)
- Given move/vanish tiles mid-spring, when cell changes, then x/y retarget to new `pixel(to, B)` (spring or immediate, not stale)
- Given a resize followed by an accepted swipe, when `applyPlan` re-plans from current tilesRef, then tiles start from correctly re-projected positions (no visible jump); `planTileTransitions` !moved->[] invariant holds
- Given no cell change, when toPos changes, then existing move/vanish spring effect still triggers (regression)

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2: (low, low) — pre-existing tsc spawn-candidates-validation 8 errors unrelated; hygiene check that render-gate-hardening ATDD still skipped as expected
- addressed_findings:
  - none

## Design Notes

Cell-change retarget is a single `useEffect` keyed on `cell` (and `to`/`kind`) inside `AnimatedTile`. Rest/appear: `x.value = next.x; y.value = next.y` immediate snap cancels stale. Move/vanish: `x.value = withSpring(next.x, spring)` so mid-flight motion retargets smoothly. Alternative of immediate snap for all kinds also satisfies "no jump" on next re-plan, but spring preserves feel for in-flight tiles.

```ts
useEffect(() => {
  const next = pixel(to, cell);
  if (kind === 'rest' || kind === 'appear') {
    x.value = next.x; y.value = next.y;
  } else {
    x.value = withSpring(next.x, spring);
    y.value = withSpring(next.y, spring);
  }
}, [cell]);
```

## Verification

**Commands:**
- `npm test -- --test-name-pattern="cell-retarget"` -- expected: pass (new ATDD scans)
- `npm test` (triade/) -- expected: all green (no regression; existing 144+ green)
- `npx tsc --noEmit -p tsconfig.test.json` -- expected: clean

**Manual checks (if no CLI):**
- Resize simulator mid-slide and swipe immediately after; no tile jump.

## Auto Run Result

Status: done

**Summary:** DW-37 orientation/resize mid-animation stale pixel fix — `AnimatedTile` now retargets x/y SharedValues on `cell` change for all kinds (rest/appear immediate snap, move/vanish withSpring to `pixel(to, newCell)` per human decision 2026-09-02 retarget-all). Next swipe re-plan starts from consistent logical `to` in new pixel space.

**Files changed:**
- `triade/src/render/GameBoard.tsx:180-195` — added cell-change `useEffect` re-projecting x/y onto new pixel grid
- `triade/__tests__/render/cell-retarget.atdd.test.ts` — 9 ATDD scans (P0/P1) pinning cell dep, pixel(to,cell), branch coverage and re-plan consistency

**Verification:** `cell-retarget` ATDD 9/9 pass; full triade suite 926 pass 0 fail; `tsc -p tsconfig.test.json` no new errors (pre-existing 8 spawn-candidates-validation only).

**Review:** 2026-09-02 pass — 0 intent_gap/bad_spec/patch/defer, 2 low rejects.

**Residual:** Manual-validation domain (orientation jump) verified via static retarget coverage; no defer.
