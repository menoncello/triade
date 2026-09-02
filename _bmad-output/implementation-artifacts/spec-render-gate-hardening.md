---
title: 'render-gate-hardening'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
final_revision: '0cfd046180a98b8f5e457705c05f1ea3ae473c00'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '818be0de81e5b5d2c30e1889267b166d622a288d'
---

<intent-contract>

## Intent

**Problem:** App/GameBoard input gate and tile-state share fragile invariants (`busyRef`, `transitionPlan`/`tilesRef`, settle timer) that can deadlock swipes, leak tiles, or race on restart/unmount.

**Approach:** Harden the single gate/tiles subsystem in `triade/App.tsx` and `triade/src/render/GameBoard.tsx`: add fallback release for `moved:true`+empty plan, enforce `tilesRef` sync discipline, clear settle timer on restart and on unmount with gate release, rebuild tiles when `moveResult` nulls after non-null, and guard stroke-tiling restart vs `panGesture` `runOnJS` race.

## Boundaries & Constraints

**Always:** Preserve existing animation timing (`SLIDE_MS=160`, `TILE_FADE_MS=120`, `EARLY_INPUT_MS≈30%`), shake/reduced-motion semantics, engine trace contract, and offline behaviour; keep `busyRef` as source of truth for input gate; keep visual shake-free gate logic.

**Block If:** Engine `move()` trace semantics or `transitionPlan` contract changes needed; new animation durations required; store/persistence schema changes.

**Never:** Change spawn weights/pot logic, alter HUD/layout, introduce new gesture library deps, or hide deadlocks by silently discarding effective moves.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Empty-plan deadlock | `moveResult.moved=true` but `planTileTransitions` returns `[]` (empty trace/injected) | Input gate re-opens via fallback timeout (no permanent `busyRef=true`) | Schedule fallback `setTimeout` (≈EARLY_INPUT_MS) calling `onMoveSettled`; App fallback also releases after `MAX_MOVE_ANIM_MS+buffer` |
| Null moveResult rebuild | `moveResult` transitions `non-null -> null` (restart/undo/continue) with `board` 4x4 fresh (9 tiles) vs stale 16 tiles | Tiles rebuilt from `board` (16->9 correctly resets), `tilesRef` synced | If `!moveResult`, rebuild if previous was non-null; no-op if already null |
| Settle-timer leak on restart | `settleTimerRef` pending when `handleRestart` sets `moveResult=null`+`board` new | Pending timer cleared, not fired after restart; gate already `false` via App | Clear timer before any new arm; on null-rebuild also clear |
| Unmount mid-animation | `GameBoard` unmounts while `settleTimerRef` pending | Timer cleared AND `onMoveSettled` called to release `busyRef` | Cleanup calls `onMoveSettledRef.current?.()` after `clearTimeout` |
| Stroke-tiling restart race | `panGesture` `runOnJS:true` `onEnd` fires after `handleRestart` (finger still tracking) | Post-restart gesture dispatch dropped | Generation counter `restartSeqRef` incremented on restart; gesture wrapper checks seq before dispatch |
| tilesRef sync invariant | Any future `setTilesState` writer | Single helper syncs `tilesRef.current` and state atomically | All writers route via `syncTiles`; no direct `setTilesState`+separate ref assign outside helper |

</intent-contract>

## Code Map

- `triade/App.tsx:84-90,105-107,119-139,330-350,410-431,793-806` -- Input gate owner (`busyRef`, `doMove`, `handleRestart`, `onMoveSettled`, `doMoveRef`+`panGesture`) needs fallback timeout, generation guard, timer cleanup signalling.
- `triade/src/render/GameBoard.tsx:192,205,215-219,244-245,257-280,285-287` -- Tile-state and timer owner (`tilesRef`, `settleTimerRef`, `applyPlan`, `onVanish`, `useEffect` on `moveResult`) needs sync discipline, null-rebuild, timer lifecycle + unmount gate release, empty-plan fallback.
- `triade/src/render/transitionPlan.ts:46-54` -- `planTileTransitions` returns `[]` when `!moved`; factual invariant `moved ⟺ plan.length>0` currently unenforced at gate boundary.
- `triade/src/ui/gesture.ts:40-49` -- `handleGestureEnd` reads `busyRef` then dispatches; race guard must wrap this call site in `App.tsx` without changing this file's contract.
- `triade/src/engine/core/types.ts` -- `MoveResult` shape; no change, reference only.

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/render/GameBoard.tsx` -- Harden tilesRef/timer state machine: add `syncTiles` helper and `rebuildTilesFromBoard`, `prevMoveResultRef` for null-rebuild, clear+release on unmount, fallback for `moved:true` empty plan, and clear timer on `!moveResult` path -- enforces DW-35/36/38/39/88/89/90.
- [x] `triade/App.tsx` -- Harden App gate: add `restartSeqRef` generation + `fallbackBusyTimerRef`, arm/clear fallback when `doMove` sets `busyRef=true`, clear on `onMoveSettled`/`handleRestart`, bump seq on restart/undo/continue, guard `panGesture` dispatch with seq -- fixes DW-90/96 and guarantees no leaked `busyRef`.
- [x] `triade/src/render/GameBoard.tsx` + `triade/App.tsx` -- Wire generation prop (or shared ref check) and verify settle timer cleared on `handleRestart` path (GameBoard effect null-rebuild clears) and unmount releases App gate.

**Acceptance Criteria:**
- Given an effective move where `planTileTransitions` returns `[]` despite `moved:true`, when the move is dispatched, then `busyRef` is released within ≤ `EARLY_INPUT_MS+50ms` (fallback) and subsequent swipes are accepted.
- Given a pending `settleTimerRef` and a restart ( `moveResult` non-null -> null + new `board`), when `handleRestart` fires, then the pending timer is cleared, tiles are rebuilt from the new board (no 16->9 stale), and no post-restart timer callback fires.
- Given `GameBoard` unmounts mid-animation with pending settle timer, when cleanup runs, then `onMoveSettled` is invoked and `busyRef` becomes `false`.
- Given `tilesRef` + `setTilesState` both exist, when any tile mutation occurs (applyPlan/onVanish/rebuild), then `tilesRef.current` and React state are updated atomically via single helper (no direct `setTilesState` without ref sync outside helper).
- Given a swipe gesture in-flight when `handleRestart` increments generation, when `panGesture` `onEnd` later invokes `runOnJS`, then the dispatch is dropped and no move is applied to the new game.
- Given `moveResult` transitions `non-null -> null`, when the effect runs, then tiles are rebuilt from `board` and `prevBoardRef` is synced; `null->null` does not rebuild spuriously.

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 10
- addressed_findings:
  - none

### Auto Run Result
- Summary: Hardened App/GameBoard render gate per DW-35/36/38/39/88/89/90/96 bundle. GameBoard now uses single `syncTiles` writer, rebuilds tiles on `moveResult null` after non-null, clears settle timer on restart and on unmount with gate release, and falls back for `moved:true` empty plan. App now arms App-level fallback (420ms) on effective move, clears on `onMoveSettled`/restart/undo/continue, bumps `restartSeqRef` generation on restart/lane-switch and guards `panGesture` `runOnJS` dispatch via `gestureStartSeqRef`.
- Files changed:
  - `triade/src/render/GameBoard.tsx` -- added syncTiles helper, rebuildTilesFromBoard, prevMoveResultRef, unmount gate release, empty-plan fallback, null-rebuild + timer clearing
  - `triade/App.tsx` -- added restartSeqRef/gestureStartSeqRef/fallbackBusyTimerRef, App fallback timer, cleared on all busy releases, bumped seq on restart/lane-switch, guarded panGesture with onBegin/onEnd seq check
- Review findings breakdown: 10 rejected (expected RED deferred placeholders for shake/asset/burst not in scope)
- Follow-up review recommended: false
- Verification: `npm --prefix triade exec tsc -- --noEmit --project triade/tsconfig.json` passed (0 errors); `npm --prefix triade test` no P0 failures (only expected RED deferred P1/P2)
- Residual risks: shake clip/burst orphan and asset placeholders remain deferred per product decision (not in bundle scope)

## Design Notes

Fallbacks are safety-net only; normal path remains `plan.length>0 -> EARLY_INPUT_MS` timer. App fallback (`MAX_MOVE_ANIM_MS+100ms`) is secondary. `syncTiles` is single writer to prevent future desync (DW-36/38). Generation guard is a monotonic integer, not a boolean, to survive rapid restart sequences.

## Verification

**Commands:**
- `npm --prefix triade test -- --passWithNoTests 2>&1 | tail -n 50` -- expected: no new failures (existing suites pass)
- `npx tsc --noEmit --project triade/tsconfig.json 2>&1 | head -n 100` -- expected: no type errors (or only pre-existing)

**Manual checks (if no CLI):**
- Inspect `triade/src/render/GameBoard.tsx` timer lifecycle and `triade/App.tsx` generation guard; verify `tilesRef` writes only via helper.

## Auto Run Result

Status: done

Hardened App/GameBoard render gate (DW-35,36,38,39,88,89,90,96): GameBoard single syncTiles writer with rebuild on moveResult null, settle-timer cleared on restart/unmount with gate release and moved:true empty-plan fallback; App fallbackBusyTimer (420ms) with restartSeq generation guard for panGesture runOnJS race. Verified via tsc no errors and npm test no P0 failures.
