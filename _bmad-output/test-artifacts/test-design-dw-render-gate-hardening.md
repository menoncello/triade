---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-render-gate-hardening.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - 'triade/App.tsx'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/src/engine/core/types.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-render-gate-hardening — App/GameBoard input gate and tile-state invariants (DW-35,36,38,39,88,89,90,96)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-render-gate-hardening`
**Scope:** Targeted test design for the working-tree delta of `dw-render-gate-hardening`

> **Delta under assessment:** Commit `0cfd046 fix(render-gate): harden App/GameBoard input gate and tile-state invariants (DW-35,36,38,39,88,89,90,96)` (spec `baseline_revision 818be0d`, `final_revision 0cfd046`, `27d1089` on `main`) vs baseline `818be0d` (`spec-render-gate-hardening.md`). Working-tree diff vs `HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` DW-35/DW-36/DW-38/DW-39/DW-88/DW-89/DW-90/DW-96 `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-render-gate-hardening` + `resolution-undo: 4cfb9c87cc9…` 8 entries, `spec-render-gate-hardening.md` `+6` `## Auto Run Result` block); production-side delta is the hardened gate/tiles subsystem:
> - `triade/App.tsx:103-107,248-263,311-315,363-369,445-457,489-493,545-550,580-585,726,763-772,795-806,839-871` — NEW `restartSeqRef` (monotonic generation), `gestureStartSeqRef`, `fallbackBusyTimerRef` (`ReturnType<typeof setTimeout>|null`); `doMove` arms 420ms App-level fallback when `result.moved` (`clearTimeout`+`setTimeout(()=>busyRef=false)`); `onMoveSettled` clears fallback before releasing; `useEffect` cleanup clears fallback; `applyLaneSelection` (DW-96), `handleRestart`/`handleUndo`/`handleConfirmUndoAd`/`handleConfirmUndoIap`/`handleContinueAd`/`handleContinueIap`/`handleSkipTutorial` each bump `restartSeqRef` and `clearTimeout(fallbackBusyTimerRef)`+`busyRef=false`; `panGesture` adds `.onBegin(()=>gestureStartSeqRef=current)` and `onEnd` seq guard `if(gestureStartSeqRef!==restartSeqRef) return` before `handleGestureEnd`.
> - `triade/src/render/GameBoard.tsx:298-380,383-447,449-552` — NEW `prevMoveResultRef`, `syncTiles(next)` single disciplined writer (sets both `tilesRef.current` and `setTilesState`), `rebuildTilesFromBoard(board)` (4×4 scan → `rest` tiles via `nextId()`), `settleTimerRef` unmount effect now `clearTimeout+null+onMoveSettledRef.current?.()` (DW-39), `!moveResult` branch rebuilds only when `prevMoveResultRef!==null` (clears settle timer, `syncTiles(rebuild)`, `setBursts([])`), `applyPlan` now `if(plan.length===0) return` early (unchanged) but downstream timer re-arm adds `else if(moveResult.moved)` 84ms fallback (`EARLY_INPUT_MS`) for `moved:true` empty plan (DW-35/90), plus all writers (`applyPlan`, `onVanish`) route via `syncTiles` (DW-36/38).
> - No engine, store, HUD, layout, or spawn/pot/ceiling change; `transitionPlan.ts:46-54` invariant `!moved→[]` still unenforced at gate boundary (now guarded by both fallbacks).
> - Ledger `deferred-work.md` — DW-35 (moved⇔plan deadlock), DW-36 (tilesRef desync), DW-38 (second source of truth), DW-39 (unmount leak), DW-88 (16→9 stale), DW-89 (settle leak on restart), DW-90 (moved:true empty plan duplicate of Df1), DW-96 (stroke-tiling restart race) flipped `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-render-gate-hardening` + `resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c` each; `sprint-status.yaml` is orchestrator-owned and **not** in scope for this design.

---

## Executive Summary

**Scope:** Harden the single App/GameBoard gate/tiles subsystem where 8 deferred risks shared fragile invariants (`busyRef`, `transitionPlan`/`tilesRef`, `settleTimerRef`). Before `0cfd046` the gate relied solely on `GameBoard`'s `EARLY_INPUT_MS` timer (84ms = 30% of `SLIDE_MS+TILE_FADE_MS` 280ms) gated on `plan.length>0`; a `moved:true` with empty trace (injected / future engine regression) permanently froze swipes (`busyRef=true` forever), a restart/undo (`moveResult non-null→null`) left 16 stale tiles vs fresh 9-tile board, a pending settle timer leaked past restart and could fire stale `onMoveSettled`, an unmount mid-animation cleared the timer without releasing the App gate, and a `panGesture runOnJS:true` `onEnd` could fire after `handleRestart` and apply a move to the new game. Two writers (`applyPlan`, `onVanish`) synced `tilesRef` ad-hoc — any future writer forgetting the sync would silently corrupt plans.

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (≥6): 4
- Critical categories: TECH (gate deadlock App+Board dual fallback, tilesRef single-writer invariant), DATA (tiles 16→9 stale vs rebuild, settle timer leak vs burst orphan), BUS (stroke race runOnJS seq guard)

**Coverage Summary:**

- P0 scenarios: 10 groups (host unit + mocked timers, deadlock fallback App 420ms + Board 84ms, null→rebuild 16→9 with `clone!==board` + burst clear, unmount gate release, stroke race seq guard, syncTiles single-writer grep, restart clears settle timer)
- P1 scenarios: 7 groups (lane-switch seq guard, undo/continue clear, `null→null` no-rebuild spur, plan `!moved→[]` invariant, `busyRef` no-leak on rapid restarts, burst orphan cleanup, `onMoveSettled` idempotency)
- P2/P3 scenarios: 7 groups (duplicate clear hygiene, null rebuild cell bounds, fallback double-fire race <50ms, reducedMotion passthrough, `nextId` monotonic, exploratory rapid swipe+restart)
- **Total effort**: ~3.5–6.5 hours (~0.5–1.0 day; host-only, no device lane — pure `triade/src/render` + `triade/App.tsx` TS, `npm --prefix triade test` + `tsc --noEmit` gate `<15 min`, both configs clean)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine `move()` trace semantics, `canMerge(1+2→3, >=3 equal)` / `mergeValue` / merge-once cascade / `shiftLine` / `boardFromLines` 4×4 guard, grid `GRID_SIZE=4`, spawn weights `FIXED_WEIGHTS 40/40` / `POT_WEIGHT 0.2` / `POT_BASE_VALUE 3` / `POT_CURVE`, `pickIndex` NaN clamp, `previewFor` / `previewInvariant` / ambiguity band, `matchOrchestrator` / `undo` / `rewardedAd`, `src/feel` haptics/punch/shake/bullet/sfx, HUD/layout, RNGH gesture semantics beyond seq guard, persistence `settingsStore` per-lane `sessionStartBestRef` / `hydrationOkRef`** | `git diff --stat -- triade/src/engine` between baseline `818be0d` and `0cfd046` shows no engine file changed (spec boundary `Always: Preserve animation timing … engine trace contract`); `git diff --stat -- triade/src/ui` / `triade/src/feel` / `triade/src/game` similarly empty. | Invariants stay gated by 897 pass / 11 expected-RED baseline (`npm --prefix triade test` Auto Run `tsc --noEmit --project triade/tsconfig.json` 0 errors, `tsconfig.test.json` clean noted in spec Review Triage) + existing `__tests__/engine/game.test.ts` 32 + `transitionPlan.test.ts` 13 + `render.smoke.test.ts` suites still green. |
| **Changing animation durations `SLIDE_MS=160` / `TILE_FADE_MS=120` / `EARLY_INPUT_MS≈84` / `MAX_MOVE_ANIM_MS=280`, introducing new gesture library deps, altering HUD/layout, changing spawn weights/pot logic, hiding deadlocks by silently discarding effective moves** | Spec Boundaries `Block If: new animation durations required; store/persistence schema changes` and `Never: Change spawn weights … introduce new gesture library deps, or hide deadlocks by silently discarding effective moves`. | Current design keeps durations byte-identical (`rg -n "SLIDE_MS|TILE_FADE_MS|EARLY_INPUT_MS" triade/src/render/GameBoard.tsx` still `160/120/0.3`); fallback is secondary (`420ms` App vs `84ms` Board) not a duration change; verification via `tsc` + visual manual shake-free check per spec `Manual checks`. |
| **Altering `MoveResult` / `Board` / `PendingSpawn` public types, changing `transitionPlan` contract beyond fallback, changing `handleGestureEnd` contract in `triade/src/ui/gesture.ts`** | Spec `Code Map` marks `triade/src/engine/core/types.ts` and `triade/src/ui/gesture.ts:40-49` as reference-only; type drift would ripple to engine/feel/score layers. | Shapes pinned via `rg -n "export type MoveResult" triade/src/engine/core/types.ts` + `rg -n "export interface GameState"` + `rg -n "export function planTileTransitions"` each 1 hit + `tsc` both configs. Stroke guard lives in `App.tsx` `panGesture`, not in `gesture.ts`. |
| **Editing `_bmad-output/implementation-artifacts/deferred-work.md` ledger beyond `done+resolution-undo`, or writing `sprint-status.yaml`** | Spec `Never: Edit deferred-work.md` beyond bundle sweep; task prompt `sprint-status.yaml is owned by the orchestrator: never write it, and never revert a change to it.` | Working-tree `git diff` already shows ledger `open→done` 8 entries with `resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c` 64-hex each (`rg -n "4cfb9c87cc9" _bmad-output/implementation-artifacts/deferred-work.md` 8 hits); `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in this workflow. This plan never writes ledger or status. |
| **Board `role="grid"` a11y, physical device lane, frame-rate bench, rewarded-ads / RevenueCat / Epic 9–11** | No a11y/bench/ads code touched (`triade/App.tsx` + `GameBoard.tsx` only). | Existing suites + `__tests__/render/transitionPlan.test.ts` + `render.smoke.test.ts` still cover Skia `Canvas`/`AnimatedTile` paths; device/bench remain out-of-scope per prior test-design boundaries. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | TECH | `moved:true` + empty `planTileTransitions` deadlocks input gate — `busyRef` stays `true` forever, every subsequent swipe dropped (DW-35/DW-90). Pre-fix only one gate (Board `plan.length>0→EARLY_INPUT_MS`), no App fallback. | 2 | 3 | 6 | Dual fallback: `GameBoard` `else if(moveResult.moved)` 84ms timer (`GameBoard.tsx:540-545`) + `App.tsx:364-369` 420ms `fallbackBusyTimerRef` (`busyRef=false` on `clearTimeout` + `onMoveSettled`). `busyRef` remains source of truth; normal path `plan.length>0→84ms` unchanged. | Dev | 2026-09-02 done (`0cfd046`) |
| R-002 | DATA | Tiles stale after restart/undo/continue: `moveResult non-null→null` with fresh 4×4 board (9 tiles) leaves previous 16-tile `tiles`/`tilesRef` stale, rendering phantom tiles (DW-88). | 2 | 3 | 6 | `GameBoard.tsx:449-466` null-rebuild: when `!moveResult && prevMoveResultRef!==null`, `clearTimeout(settleTimerRef)`, `rebuildTilesFromBoard(board)` (4×4 scan, `nextId()` `rest` tiles), `syncTiles(rebuilt)`, `setBursts([])`, sync `prevBoardRef`. `null→null` no-ops. | Dev | 2026-09-02 done |
| R-003 | TECH | `tilesRef` mirrors `tiles` outside React functional update — any writer forgetting `tilesRef.current=` silently desyncs (`applyPlan` vs `onVanish` vs future writer) → dropped/phantom tiles, wrong merge sources (DW-36/DW-38). | 2 | 3 | 6 | Single writer `syncTiles(next)` (`GameBoard.tsx:341-344`) atomically sets `tilesRef.current=next` + `setTilesState(next)`; `applyPlan:437` and `onVanish:551` route via it; no direct `setTilesState`+separate ref assign elsewhere (grep invariant). | Dev | 2026-09-02 done |
| R-004 | BUS | Stroke-tiling restart race: `panGesture runOnJS:true onEnd` fires after `handleRestart`/`applyLaneSelection` incrementing `restartSeqRef` — stale gesture dispatches a move into the new game (DW-96). | 2 | 3 | 6 | Generation guard: `restartSeqRef` monotonic int, bumped on restart/lane-switch/undo/continue/skipTutorial; `panGesture.onBegin` snapshots `gestureStartSeqRef=current`; `onEnd` checks `if(gestureStartSeqRef!==restartSeqRef) return` before `handleGestureEnd` (`App.tsx:849-868`). | Dev | 2026-09-02 done |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-005 | TECH | Settle-timer leak fires after restart: `settleTimerRef` pending when `moveResult non-null→null`, fires stale `onMoveSettled` post-restart or leaves orphan bursts (DW-89). | 2 | 2 | 4 | `GameBoard.tsx:453-456` null-branch clears `settleTimerRef` before rebuild; `App.tsx:248-263,313-315,452-457` all restart/undo paths `clearTimeout(fallbackBusyTimerRef)` + `null`. Bursts cleared `setBursts([])`. | Dev |
| R-006 | OPS | GameBoard unmount mid-animation clears timer without releasing App gate — `busyRef` stays `true` permanently if board unmounts (orientation/conditional remount, future feature). Not reachable today (board never unmounts). DW-39. | 1 | 3 | 3 | `GameBoard.tsx:370-379` unmount cleanup now `clearTimeout+null+onMoveSettledRef.current?.()` after `clearTimeout`, so gate releases even on unmount. `onMoveSettledRef` always fresh via `useEffect` sync. | Dev |
| R-007 | TECH | Fallback double-fire race: App 420ms fallback vs Board 84ms `EARLY_INPUT_MS` — both call `onMoveSettled`/`busyRef=false`; overlapping arms on rapid moves could interleave and re-arm stale timer or swallow a second move's gate. | 2 | 2 | 4 | App fallback is secondary (cleared on `onMoveSettled` before `busyRef=false` → `App.tsx:842-847`); Board always `clearTimeout` before re-arm (`531-534`); App also `clearTimeout` before arm (`364`). `doMove` pushes undo snapshot only when `moved:true`; no noop leak. | Dev |
| R-008 | PERF | Null-rebuild flicker/jank: `rebuildTilesFromBoard` creates fresh `rest` tiles with new `nextId()` ids — React reconciles as new keys; rapid restart+move could cause visible flicker or 16→9 layout jank beyond 280ms budget. | 2 | 2 | 4 | Rebuild only when `prevMoveResultRef!==null` (one-shot per restart), not on every `board` render; `cell` derived from `width` via `Math.max(...,1)` prevents NaN; manual shake-free gate preserved (no duration change). | Dev |
| R-009 | TECH | Lane-switch double-clear copy-paste (`App.tsx:252-255` + `259-262` clear `fallbackBusyTimerRef` twice) — redundant but not harmful now; future edit may diverge and leave one path uncleared. | 1 | 2 | 2 | Hygiene note: deduplicate to single clear per branch; covered by grep `fallbackBusyTimerRef` invariant (≥6 clears). | Dev |
| R-010 | TECH | `syncTiles` closure captures stale `cell`/`nextId` if used during mid-animation resize: rest tiles never re-target on `cell` change (pre-existing DW-37) now hidden behind `syncTiles` but still no cell-change retarget. | 1 | 2 | 2 | Out-of-scope DW-37 (orientation mid-animation stale pixel space) — mitigation is `resize → full rebuild` future work; current fix does not worsen (same `cell` dep as before). Manual-validation domain. | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-011 | OPS | `restartSeqRef` monotonic integer growth over long session (rapid restarts) — no wrap, no reset, but `number` safe until 2^53. | 1 | 1 | 1 | Monitor — no action, JS safe integer far beyond session. |
| R-012 | TECH | `prevMoveResultRef` initial `moveResult` (constructor `null`) vs `useState(()=>newGame)` first board — first `!moveResult` effect incorrectly rebuilds if `prevBoardRef` stale on hot-reload. | 1 | 2 | 2 | Monitor — hot-reload only, prod `moveResult` starts `null` so first `!moveResult` correctly no-ops (`prevMoveResultRef===null`). |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| Reliability | Input gate must never deadlock: `busyRef` releases within `EARLY_INPUT_MS+50ms` (Board 84ms) or `420ms+50ms` (App fallback) for `moved:true` even when `plan=[]`. | R-001, R-007 | Host unit with fake timers: `doMove` effective → `busyRef=true`, inject `moved:true` empty `trace` via `planTileTransitions` stub, assert `busyRef=false` after 84ms (Board) and 420ms (App); `noop (moved:false)` must not arm gate. | Timer-advance test report (`transitionPlan.test.ts` new gate cases + `App` busyRef spy), plus existing `tsc --noEmit` clean. |
| Reliability | Tile-state integrity: `tilesRef.current` and React `tiles` stay atomically synced via single writer; no writer outside `syncTiles`. | R-003 | Static grep invariant `rg -n "setTilesState" triade/src/render/GameBoard.tsx` → exactly 1 hit inside `syncTiles`; `rg -n "tilesRef\.current ="` → exactly 1 hit inside `syncTiles`; host unit asserting `applyPlan`+`onVanish` both update ref+state in same tick. | Grep count artifact + unit test `render.smoke` adapted, `coverage-matrix.json` entry. |
| Reliability | Restart/undo null-rebuild: `moveResult non-null→null` rebuilds 16→9 (or 9→16) from `board` and clears bursts/timer; `null→null` does not rebuild spuriously. | R-002, R-005 | Host unit: mount `GameBoard` with 16-tile board + non-null `moveResult`, set `moveResult=null` with fresh 9-tile board, assert `tiles.length===9` and `settleTimerRef===null` and `bursts===[]`; second null cycle asserts no rebuild (stable ids). | Unit test report (`render` ATDD), `logic-tests-patterns` style. |
| Reliability | Unmount gate release: `GameBoard` unmount mid-animation invokes `onMoveSettled` exactly once. | R-006 | Host unit: mount, arm `settleTimerRef` (effective move), unmount before `EARLY_INPUT_MS`, assert `clearTimeout` called and `onMoveSettled` spy called once; no double-fire on second unmount. | Unit test with `act`+`cleanup`, spy counts. |
| Performance | Frame budget: no animation duration change (`SLIDE_MS 160`, `TILE_FADE_MS 120`, `EARLY_INPUT_MS 84`); rebuild + fallback must not add layout thrash beyond 280ms fixed path. | R-008 | Bench: `npm --prefix triade test` smoke `criticalPath` + `render.smoke` green; no `MAX_MOVE_ANIM_MS` literal drift (`rg -n "MAX_MOVE_ANIM_MS|EARLY_INPUT_MS" GameBoard.tsx` → `280`/`84`). | `tsc` clean + smoke suite timing `<15 min`, `e2e-trace-summary` if present. |
| Maintainability | Single-writer + generation-guard invariants enforced in code comments and review. | R-003, R-004, R-009 | Static review: `syncTiles` comment `DW-36/DW-38`, generation guard comment `DW-96`/`DW-35`; `rg -n "restartSeqRef|gestureStartSeqRef|fallbackBusyTimerRef" triade/App.tsx` ≥8 hits. | Code review artifact + `tsc` types for `fallbackBusyTimerRef: ReturnType<typeof setTimeout>|null`. |
| Reliability | Generation guard drops late `runOnJS` dispatches when `restartSeqRef` bumped mid-gesture; lane-switch mid-gesture same guard. | R-004 | Host unit: `panGesture.onBegin` snapshots seq, increment `restartSeqRef` (simulate `handleRestart`), fire `onEnd` with old seq, assert `handleGestureEnd` not called; lane-switch variant with `applyLaneSelection(true)`. | Unit test mocking `Gesture.Pan` + `handleGestureEnd` spy, plus `App` integration with `rng` stub. |

**Unknown thresholds:** None additional — `SLIDE_MS/TILE_FADE_MS/EARLY_INPUT_MS/MAX_MOVE_ANIM_MS` are single-source in `GameBoard.tsx:38-45`; `fallbackBusyTimer 420ms` is secondary safety-net (not product timing), threshold is `≤420+50ms`. Missing: none invented.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM — spec `spec-render-gate-hardening.md` intent/boundaries/I-O matrix frozen at `final_revision 0cfd046` (no block-if trigger: engine trace / animation duration / persistence unchanged).
- [ ] `triade/App.tsx` + `triade/src/render/GameBoard.tsx` at `0cfd046` locally (fallback + syncTiles + rebuild + seq guard present; `git diff 0cfd046..HEAD -- triade` empty except ledger metadata).
- [ ] Test environment provisioned — `triade/tsconfig.json` + `triade/tsconfig.test.json` `tsc --noEmit` clean; host test runner `npm --prefix triade test -- --passWithNoTests` baseline 897 pass / 11 expected RED still holds.
- [ ] Feature deployed to test harness — Expo app launchable for manual smoke (spec `Manual checks` inspect timer lifecycle + `syncTiles` single writer; board `width` → `cell` computed `Math.max(...,1)` prevents NaN).
- [ ] Seed data / fixtures — 4×4 boards deterministic via `test-utils/helpers.ts:boardWith(gameState)` + `mulberry32` rng, no new infra.

## Exit Criteria

- [ ] All P0 tests passing — deadlock fallback (App 420ms + Board 84ms), null-rebuild 16→9, unmount release, stroke race guard, syncTiles invariant, restart clears timer — 100% green.
- [ ] All P1 tests passing (or failures triaged) — lane-switch guard, undo/continue clear, null→null no-rebuild, busyRef no-leak on rapid restarts, burst cleanup, idempotent `onMoveSettled`.
- [ ] No open high-priority / high-severity bugs — R-001..R-004 mitigations verified; residual R-007/R-009 hygiene noted but not gate-blocking.
- [ ] Test coverage agreed as sufficient — P0 10 groups host unit (fake timers + grep invariants), P1 7 groups, P2/P3 7 groups; no duplicate engine-level coverage (engine byte-identical).
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers — reliability fallbacks, tile integrity, unmount release, generation guard, performance budget each have evidence artifact (unit report + grep + smoke timing).

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
| ---- | ---- | ------------------------ |
| Eduardo | Dev / TEA | Owns gate hardening + test design; runs host unit fake-timer suites and grep invariants; signs off on `syncTiles` single-writer + seq guard review |
| QA (host) | QA Lead | Owns P0 fake-timer unit suites (gate deadlock, rebuild, unmount, race), smoke `render` + `transitionPlan` suites, manual shake-free board check |
| PM | Product | Confirms animation timing unchanged (`SLIDE_MS/TILE_FADE_MS/EARLY_INPUT_MS`) and manual checks per spec |

---

## Test Coverage Plan

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround — input gate deadlock, tile-state corruption, stroke race

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Empty-plan deadlock — `moved:true` + `planTileTransitions→[]` releases via Board 84ms fallback | Unit | R-001 | 2 | QA | Fake timers: `moveResult={moved:true,trace:[{spawned:false,from:[[0,0],[0,1]],to:[0,1]}]}` stubbed to `classify→slide` but `plan=[]` via injected `planTileTransitions` mock; assert `settleTimerRef` armed 84ms → `onMoveSettled` called; second case `moved:true` with `plan.length>0` sanity. |
| Empty-plan deadlock — App 420ms fallback releases `busyRef` when Board fallback missed | Unit | R-001 | 2 | QA | `App.tsx` `doMove` effective → `busyRef=true` + `fallbackBusyTimerRef` armed 420ms; stub `GameBoard` not calling `onMoveSettled`; `jest.advanceTimersByTime(420)` → `busyRef=false`; `onMoveSettled` early call must `clearTimeout(fallback)` (no double-fire). |
| Null `moveResult` rebuild — `non-null→null` with fresh board 9 tiles rebuilds, clears timer+bursts | Component | R-002 | 3 | QA | Mount `GameBoard` with 16-tile board + `moveResult` non-null, then `rerender` with `moveResult=null` + 9-tile board; assert `tiles.length===9`, `tilesRef.current.length===9`, `settleTimerRef===null`, `bursts.length===0`; also 9→9 no-flicker idempotency. |
| Settle-timer leak on restart — pending timer cleared before rebuild, no post-restart callback | Unit | R-005 | 1 | QA | Arm Board timer (effective move), immediately `moveResult=null` (restart); assert `clearTimeout` called, after `EARLY_INPUT_MS+20ms` no stale `onMoveSettled` second fire. |
| Unmount mid-animation releases App gate | Component | R-006 | 1 | QA | Mount, effective move → `settleTimerRef` armed, `unmount()` before 84ms, assert `clearTimeout` + `onMoveSettled` spy exactly 1; `App busyRef` would be false via integration spy. |
| Stroke-tiling restart race — `panGesture runOnJS` dropped when seq changed | Unit | R-004 | 2 | DEV | Mock `Gesture.Pan`, `onBegin` snapshots seq, `restartSeqRef++`, fire `onEnd` with old seq → `handleGestureEnd` not called; second case same seq → called (sanity). |
| Lane-switch mid-gesture seq guard (DW-96 lane variant) | Unit | R-004 | 1 | DEV | `applyLaneSelection(true)` bumps seq mid-gesture, `onEnd` with old seq dropped; verifies `warm-pending` lane best sync still happens (no regression on `persistedBestByLane` write). |
| `tilesRef` single-writer invariant — `setTilesState` only inside `syncTiles` | Static | R-003 | 1 | QA | Grep: `rg -c "setTilesState" triade/src/render/GameBoard.tsx` → 1; `rg -c "tilesRef\.current ="` → 1; both inside `syncTiles:341-344`. |
| `applyPlan` + `onVanish` route via `syncTiles` | Static | R-003 | 1 | QA | `rg -n "syncTiles\(" triade/src/render/GameBoard.tsx` → 3 hits (`applyPlan:437`, `onVanish:551`, `rebuild:459`); no `setTilesState(` outside those. |
| Engine `!moved→[]` invariant pin (contract unchanged) | Unit | R-001 | 1 | QA | `transitionPlan.test.ts` add: `planTileTransitions(board, {moved:false,trace:[]})→[]` + `moved:true` with injected empty trace → empty plan (fallback path). |

**Total P0**: 15 tests, ~2.5h host (fake timers + grep, no device)

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows — lane/undo, no-rebuild spur, burst orphan, gate idempotency

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Undo/Continue clears App fallback + `busyRef=false` | Unit | R-004 | 2 | DEV | `handleConfirmUndoIap` / `handleContinueAd` (NoAds + ad paths) assert `clearTimeout(fallbackBusyTimerRef)` + `busyRef=false`; snapshot `sessionBestMerge` restore not broken. |
| `null→null` does not rebuild spuriously | Unit | R-008 | 1 | QA | Two consecutive `rerender moveResult=null` (no game start) → `tiles` stable (same `id` prefixes), no `setBursts` churn. |
| `busyRef` no-leak on rapid restarts (3× restart within 420ms) | Unit | R-007 | 1 | QA | `doMove`×3 rapid (second blocked by `busyRef`), then `handleRestart`×3 with `jest.advanceTimersByTime(10)` each → `busyRef=false` and `fallbackBusyTimerRef===null` after each, no dangling timer. |
| Burst orphan cleanup — rebuild clears `bursts` from prior merges | Component | R-008 | 1 | QA | Prior move with `isMerge=true` adds bursts, then `moveResult=null` rebuild → `bursts.length===0` after rerender. |
| `onMoveSettled` idempotency (App fallback vs Board) | Unit | R-007 | 1 | QA | Board fires `onMoveSettled` at 84ms, App fallback at 420ms would be cleared (`clearTimeout` in `onMoveSettled:842-844`); assert App fallback spy not called after Board success. |
| Lane-switch without active match still syncs HUD best | Unit | R-004 | 1 | DEV | `applyLaneSelection(index, hasActiveMatch=false)` asserts `setMatch(initialScore(persistedBestByLane[next]))` and `bannerDismissed` reset, no seq bump missing. |
| `prevMoveResultRef` correctly tracks non-null→null transition | Unit | R-002 | 1 | QA | Assert `prevMoveResultRef.current` after `moveResult=null` is `null` (not stale), so second null cycle doesn't rebuild again. |

**Total P1**: 8 tests, ~1.5h host

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases — hygiene double-clear, cell bounds, reducedMotion passthrough

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Lane-switch double-clear hygiene (duplicate `clearTimeout` in `applyLaneSelection`) | Static | R-009 | 1 | DEV | `rg -n "fallbackBusyTimerRef" triade/App.tsx` shows 2 clears in same `if(needsReset)` branch (`252-255` + `259-262`); dedup to one (follow-up PR). |
| `cell` NaN guard `Math.max(...,1)` preserved, `pixel` within `width` | Unit | R-008 | 1 | QA | `width=0` edge → `cell===1`; `pixel([0,0],1)` yields `BOARD_PADDING + 0`. |
| `reducedMotion` still suppresses shake/bullet without affecting gate/timer | Component | — | 1 | QA | `GameBoard reducedMotion=true` effective move → `shakeX/Y` not animated but `settleTimerRef` still armed (gate independent). |
| `nextId()` monotonic across rebuilds — no duplicate `t{id}` | Unit | R-002 | 1 | QA | After 2 rebuilds assert `id` prefixes unique (`t` count grows, no reuse). |
| `restartSeqRef` stable across lane-switch with `needsReset=false` | Unit | R-011 | 1 | QA | `applyLaneSelection` without active match does not bump `restartSeqRef` (seq guard only when `needsReset=true`). |

**Total P2**: 5 tests, ~0.8h host

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| Exploratory rapid swipe→restart→swipe (manual) | Manual | 1 | QA | Finger still tracking during restart, verify second swipe after `EARLY_INPUT_MS` retargets tiles visibly without jump; check `cell` retarget on resize edge (known DW-37 manual). |
| Bench `npm --prefix triade test` full host suite timing delta | Unit | 1 | QA | Before/after `0cfd046` timing <5% regression, `tsc --noEmit` still 0 errors, no new `benchmarks/feel.bench` needed. |

**Total P3**: 2 scenarios, ~0.3h + 15m manual

---

## Execution Order

> **Philosophy:** Run everything in PRs if `<15 min`; defer only if expensive/long. No duplication of coverage-plan items here.

- **PR** (host, `<5 min`): All P0 + P1 + P2 host unit/component fake-timer suites (`transitionPlan`, `render.smoke`, new gate atdd `__tests__/render/render.gate-hardening.atdd.test.ts`) plus static grep invariants (`setTilesState`/`tilesRef`/`restartSeqRef` counts) plus `tsc --noEmit --project triade/tsconfig.json` + `tsconfig.test.json` clean.
- **Pre-merge** (once, `<15 min`): Full `npm --prefix triade test -- --passWithNoTests` gate (`~897 pass + new P0/P1` + 11 expected RED unchanged) + manual 2-min board shake-free check (spec `Manual checks` inspect `GameBoard` timer lifecycle + `App` generation guard).
- **Nightly/Weekly**: Not required for this bundle (no device lane, no E2E, no perf bench beyond host timing); optional weekly `npm --prefix triade test` full + `benchmarks/feel.bench.test.ts` if DW-37 future resize-retarget lands.

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | 15 | ~0.17 | ~2.0–3.0 | Fake-timer host, mock Gesture.Pan, grep invariants |
| P1 | 8 | ~0.15 | ~1.0–1.8 | Null-rebuild spur, burst orphan, idempotency |
| P2 | 5 | ~0.13 | ~0.5–0.9 | Hygiene static + cell bounds + nextId |
| P3 | 2 | ~0.15 | ~0.2–0.5 | Exploratory manual + bench timing |
| **Total** | **30** | **-** | **~3.5–6.5** | **~0.5–1.0 day headcount** |

> Includes setup (helpers `boardWith`, `mulberry32`, `fakeTimers`, `Gesture.Pan` mock) — no new infra.

### Prerequisites

**Test Data:**

- `boardWith(gameState, 4×4)` factory (`triade/test-utils/helpers.ts:13-60`) + deterministic `mulberry32` boards for stale 16→9 cases.
- `resultFixture({moved, trace, board})` builder for empty-plan injection (override `planTileTransitions` via jest mock).

**Tooling:**

- `node --import tsx --test` (existing `npm test` runner), `jest.fakeTimers` / `vi.useFakeTimers` for 84ms/420ms advances, `msw` not needed.
- `rg` (ripgrep) for static invariants (no install).

**Environment:**

- Node 20+ host only (no Expo device, no Skia headless) — `triade/tsconfig.test.json` paths alias `~/*`.
- No new env vars; `EXPO_TOKEN` not needed for this gate.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions) — deadlock, rebuild, unmount, race, single-writer all green.
- **P1 pass rate**: ≥95% (waivers required for failures) — `null→null` no-rebuild + burst orphan + idempotency must be ≥6/7 green.
- **P2/P3 pass rate**: ≥90% (informational) — hygiene double-clear is advisory.
- **High-risk mitigations**: 100% complete or approved waivers — R-001..R-004 mitigations verified in `0cfd046` and pinned by P0.

### Coverage Targets

- **Critical paths**: ≥80% — gate deadlock + tile-state + stroke race are critical path `App↔GameBoard` and are 100% covered at unit/component.
- **Security scenarios**: N/A — no `SEC` risk in this bundle (no `loadSettings`, no `SecureStore` change).
- **Business logic**: ≥70% — animation timing unchanged, so `feel`/`haptics` not re-covered; only gate logic measured.
- **Edge cases**: ≥50% — empty plan, null→null spur, rapid restart, lane-switch mid-gesture, unmount, burst orphan all covered.

### Non-Negotiable Requirements

- [ ] All P0 tests pass — especially `moved:true` empty plan → gate releases within 84ms (Board) / 420ms (App).
- [ ] No high-risk (≥6) items unmitigated — R-001..R-004 each have code at `0cfd046` + P0 pin.
- [ ] `SEC` category not introduced — no new auth/store surface in this bundle.
- [ ] Performance targets met — `MAX_MOVE_ANIM_MS 280` / `EARLY_INPUT_MS 84` literals unchanged (`rg` check), host suite `<15 min`.
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers — reliability fallbacks, tile integrity, unmount release, generation guard each have test report + grep artifact.

---

## Mitigation Plans

### R-001: `moved:true` empty plan deadlock (Score: 6)

**Mitigation Strategy:** Dual fallback (Board 84ms + App 420ms) ensures gate releases even if `planTileTransitions` returns `[]` despite `moved:true`. Board is primary (tight 84ms matches `EARLY_INPUT_FRACTION 0.3`), App is secondary safety-net (`420ms ≈ MAX_MOVE_ANIM_MS+140ms`). `busyRef` remains source of truth; `onMoveSettled` clears App fallback before `busyRef=false` so no double-fire.
**Owner:** Dev
**Timeline:** 2026-09-02 done (`0cfd046`)
**Status:** Complete
**Verification:** P0 fake-timer unit (inject empty plan, advance 84ms → `onMoveSettled` once; stub Board silence, advance 420ms → `busyRef=false`; `noop moved:false` never arms).

### R-002: Tiles stale 16→9 after `moveResult null` (Score: 6)

**Mitigation Strategy:** `GameBoard` null-branch keyed on `prevMoveResultRef!==null` (one-shot per restart) rebuilds via `rebuildTilesFromBoard(board)` (4×4 scan, `rest` tiles), `syncTiles(rebuilt)`, `setBursts([])`, `clearTimeout(settleTimerRef)`, sync `prevBoardRef`. Prevents flicker on subsequent `null→null`.
**Owner:** Dev
**Timeline:** 2026-09-02 done
**Status:** Complete
**Verification:** Component rerender `non-null→null` with 9-tile board → `tiles.length===9`, `bursts===[]`; `null→null` stable ids.

### R-003: `tilesRef` desync — second source of truth (Score: 6)

**Mitigation Strategy:** Single writer `syncTiles(next)` (`GameBoard.tsx:341-344`); every mutation (`applyPlan:437`, `onVanish:551`, rebuild `459`) routes via it. Grep invariants enforce (`setTilesState` 1 hit, `tilesRef.current =` 1 hit, both inside `syncTiles`).
**Owner:** Dev
**Timeline:** 2026-09-02 done
**Status:** Complete
**Verification:** Static `rg` counts + unit asserting ref+state update in same tick.

### R-004: Stroke-tiling restart race `runOnJS` (Score: 6)

**Mitigation Strategy:** Monotonic `restartSeqRef` bumped on restart/lane-switch/undo/continue/skipTutorial; `panGesture.onBegin` snapshots `gestureStartSeqRef`; `onEnd` drops dispatch if `seq` changed. Covers `runOnJS:true` late callback after finger still tracking.
**Owner:** Dev
**Timeline:** 2026-09-02 done
**Status:** Complete
**Verification:** Unit mocking `Gesture.Pan` + `handleGestureEnd` spy (old seq dropped, same seq passes); lane-switch variant.

---

## Assumptions and Dependencies

### Assumptions

1. `transitionPlan` contract `!moved→[]` is sufficient for normal moves; empty plan only occurs on future engine regression or injected trace — fallbacks are safety-net, not primary path (spec `Design Notes: Fallbacks are safety-net only; normal path remains plan.length>0 → EARLY_INPUT_MS`).
2. `GameBoard` never unmounts today (single-screen app) — DW-39 fix is preventive; `sprint-status.yaml` reports `epic-1`/`epic-6` `done` with board always mounted.
3. `busyRef` synchronization via `handleGestureEnd` reading `busyRef.current` is synchronous enough that `runOnJS` seq guard is the only needed race fix — no additional `useEffect` debounce.
4. `nextId()` monotonic `idRef` survives rebuilds without reset — fresh ids are intentional (new `rest` tiles), not a bug.
5. `npm --prefix triade test` baseline `897 pass / 11 expected-RED` holds after bundle (Auto Run `tsc --noEmit` 0 errors covers type drift).

### Dependencies

1. `triade/src/render/transitionPlan.ts:46-54` `planTileTransitions` — Required by 2026-09-02 (already at baseline, no change).
2. `triade/src/ui/gesture.ts:40-49` `handleGestureEnd` — Required by 2026-09-02 (contract reference-only, not modified).
3. `triade/src/engine/core/types.ts` `MoveResult` shape — Required by 2026-09-02 (reference-only).
4. `triade/App.tsx` `GestureHandlerRootView` + `react-native-gesture-handler` — Required for `panGesture` seq guard to attach (already in deps).

### Risks to Plan

- **Risk**: DW-37 orientation/resize mid-animation stale pixel space (rest tiles never re-target on `cell` change; `syncTiles` still carries stale `cell` closure).
  - **Impact**: Tiles visibly jump if resize fires between `applyPlan` and settle timer; manual-validation domain today but could surface on tablet fold.
  - **Contingency**: Defer to DW-37 follow-up (`resize → full rebuild` via `useEffect([cell])` that re-projects `tilesRef` through `pixel`) — not in this bundle; mark as `CONCERNS` not `FAIL` at gate.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **`triade/src/render/transitionPlan.ts` + `triade/__tests__/render/transitionPlan.test.ts`** | `planTileTransitions` is direct input to Board timer re-arm; fallback does not change its contract (`!moved→[]` still holds, `moved:true` empty trace is hypothetical). | `transitionPlan.test.ts` 13 cases must stay green; new gate case `moved:true empty trace→[]` pins fallback trigger without changing existing classify `merge/slide/spawn/hold`. |
| **`triade/src/feel` (haptics/punch/shake/bulletTime/feel.ts)** | Shake/shake/bullet flash are downstream of `moveResult.moved && !reducedMotion && direction` (`GameBoard.tsx:472-525`); gate hardening does not touch that branch, but `rebuild` clears bursts which share `feel` particle tier. | `feel.test.ts` 12 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 must stay green; verify `reducedMotion` still suppresses shake/bullet while gate still fires (already NFR). |
| **`triade/__tests__/render/render.smoke.test.ts` + `triade/__tests__/e2e/session.e2e.test.ts`** | Render smoke mounts `GameBoard` with `board` + `moveResult` snapshot; null-rebuild changes its `moveResult=null` path (now rebuilds). | Smoke + e2e session (undo/restart) must still pass; snapshot ids will change (new `rest` ids) but no business logic break — update snapshots if flagged. |
| **`triade/App.tsx` `hasActiveMatch` / `resetAssistance` / `undoHistory` / `matchStats` `initialStats`/`applyMoveStats`** | Restart/undo/continue/lane-switch now bump `restartSeqRef` + clear `fallbackBusyTimerRef` in addition to `resetAssistance`; no change to `match`/`stats` derivations. | `matchScore.test.ts`, `matchStats.test.ts`, `matchOrchestrator.*.test.ts`, `tutorial.test.ts` stay green; lane-switch best sync still via `persistedBestByLane`. |
| **`triade/src/game/lanes.ts` + `src/services/storage/settingsStore.ts` per-lane best / `sessionStartBestRef`** | `applyLaneSelection` extra `restartSeqRef++` + double clear is additive; per-lane `persistedBestByLane` sync untouched. | Lanes/orchestrator/regression: `lanes.test.ts`, lane 3-1..3-4 suites green; no `sessionStartBestRef` write regression (gate is input, not persistence). |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework (TECH/SEC/PERF/DATA/BUS/OPS, scoring 1-9, mitigation ownership)
- `probability-impact.md` — Risk scoring methodology (P×I, thresholds DOCUMENT 1-3 / MONITOR 4-5 / MITIGATE 6-8 / BLOCK 9)
- `test-levels-framework.md` — Test level selection (Unit for `transitionPlan`/`move` pure, Component for `GameBoard` with fake timers, Static grep for single-writer, no E2E needed)
- `test-priorities-matrix.md` — P0-P3 prioritization (P0 blocks core + ≥6 + no workaround: gate deadlock, tile corruption, stroke race)
- `adr-quality-readiness-checklist.md` — ASR testability (controllability via `syncTiles`/`rebuildTilesFromBoard` pure scan, observability via `tilesRef`+`settleTimerRef` spies, reliability via monotonic seq)
- `nfr-criteria.md` — NFR planning (reliability/performance/maintainability, UNKNOWN thresholds not invented)

### Related Documents

- PRD: n/a (bundle scope is deferred-work hardening, not prd epic; spec `spec-render-gate-hardening.md` is source of truth)
- Epic: n/a (no epic id; deferred-work ledger `DW-35,36,38,39,88,89,90,96` is epic-equivalent)
- Architecture: `triade/App.tsx:103-107,389-550` + `triade/src/render/GameBoard.tsx:321-551` at `0cfd046`
- Tech Spec: `_bmad-output/implementation-artifacts/spec-render-gate-hardening.md` (`baseline 818be0d → final 0cfd046`, Blocks/Never boundaries, 6-row I/O matrix)
- Deferred Work: `_bmad-output/implementation-artifacts/deferred-work.md` (`DW-35,36,38,39,88,89,90,96` `open→done 2026-09-02` + `resolution-undo 4cfb9c87cc9…`)

---

**Generated by**: BMad TEA Agent — Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Execution mode**: sequential (no subagents; host-only)
