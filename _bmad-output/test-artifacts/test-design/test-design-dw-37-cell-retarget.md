---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/__tests__/render/cell-retarget.atdd.test.ts'
  - 'triade/__tests__/render/render-gate-hardening.atdd.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW-37 — Orientation/Resize Cell Retarget (dw-decision-dw-37)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-decision-dw-37` / `DW-37 cell retarget`
**Scope:** Targeted test design for the working-tree delta of `dw-decision-dw-37`

> **Delta under assessment:** Commit `eb11b56 fix(render): DW-37 cell-change retarget for stale pixel shared values` (spec `baseline_revision 0b81c678dbbc819b0ab0cc78bd6f10bba19895cb`, `final_revision eb11b56b4f30845531a2ba121c9bbf9e0605d71f`, spec `spec-dw-37-cell-retarget.md` `432d0dc→2b8e73f` on `main`, docs commit `d5e47c9` bumps `final_revision` to `eb11b56`) vs baseline `0b81c67`. Working-tree diff vs `HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` `DW-37 open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-decision-dw-37` + `resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c` 1 entry, `spec-dw-37-cell-retarget.md` `+16` `## Auto Run Result` block `Status: done` / 9/9 ATDD / 926 pass / `tsc` clean); production-side delta is the cell-retarget subsystem:
> - `triade/src/render/GameBoard.tsx:82-88,89-196,315-316` — `pixel(cell→{x,y})` helper unchanged `BOARD_PADDING + col*(cell+CELL_GAP)`; `AnimatedTile` NEW `useEffect` at `180-195` `// DW-37 cell-change retarget` keyed on `[cell]` that re-projects `x/y` onto new pixel grid: `const next = pixel(to, cell)` then `rest|appear → x.value=next.x; y.value=next.y` immediate snap vs `move|vanish → x.value=withSpring(next.x,spring); y.value=withSpring(next.y,spring)`; existing `useEffect([toPos.x,toPos.y,kind])` for `move|vanish` spring to `toPos` (`128-142`) and `vanish` fade `169-178` unchanged; `cell` still `Math.max((width - BOARD_PADDING*2 - CELL_GAP*(GRID-1))/GRID,1)` at `315-316`; `applyPlan:400-463 byCell` re-plan path (`cellKey(t.to)`) uses logical `to` so re-projected `rest` tiles compose correctly.
> - `triade/__tests__/render/cell-retarget.atdd.test.ts:1-143` — NEW 9 ATDD scans (6 P0 + 3 P1) pinning cell dep, `pixel(to,cell)` retarget, branch coverage, re-plan consistency and single-writer invariants.
> - No engine, HUD, layout, feel, spawn/pot/ceiling change; `triade/src/render/transitionPlan.ts:1-60` invariant `if (!result.moved) return []` still gates re-plan.
> - Ledger `deferred-work.md:301-309` — DW-37 flipped `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-decision-dw-37` + `resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c` + `decision: 2026-09-02 Retarget all kinds on cell change`; `sprint-status.yaml` is orchestrator-owned and **not** in scope for this design.

---

## Executive Summary

**Scope:** Fix the pre-existing render bug where orientation/resize mid-animation leaves `AnimatedTile` `x/y` `SharedValue`s in stale pixel space. Before `eb11b56`, `rest` tiles had no `cell` retarget at all and a swipe accepted right after resize (`EARLY_INPUT_MS 84ms` gate from T3.4) would `applyPlan` from `tilesRef` whose `to` was still expressed in old `cell` pixels, causing a visible jump as tiles re-planned forward. `move`/`vanish` tiles mid-`withSpring` likewise never re-projected their target. The fix is a single `useEffect([cell])` inside `AnimatedTile` that re-projects every kind onto the new grid; `rest`/`appear` snap immediately (cancel stale), `move`/`vanish` spring to the new target so in-flight motion continues smoothly. Next swipe's re-plan then composes from a consistent logical `to` in new pixel space (verified by `planTileTransitions` hold/slide contract).

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (≥6): 2
- Critical categories: TECH (stale-pixel re-plan jump), DATA (SharedValue pixel-space desync)

**Coverage Summary:**

- P0 scenarios: 6 groups (host ATDD static scans + `transitionPlan` hold/re-plan invariant, already 6/6 passing in `cell-retarget.atdd.test.ts`)
- P1 scenarios: 3 groups (vanish fade still on `SLIDE_MS` schedule, `byCell`/`syncTiles` re-plan path, single `[cell]` effect uniqueness)
- P2/P3 scenarios: 5 groups (no-resize regression, cell guard `Math.max(...,1)`, `pixel` helper bounds, duplicate-effect hygiene, exploratory resize+swipe manual)
- **Total effort**: ~1.0–2.5 hours (~0.15–0.35 day; host-only, no device lane — pure `triade/src/render` TS, `npm --prefix triade test -- --test-name-pattern="cell-retarget"` + `tsc --noEmit` gate `<5 min`, both configs clean per spec Review Triage)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine `move()` / `trace` / `canMerge(1+2→3, ≥3 equal)` / `mergeValue` / `shiftLine` / `boardFromLines` 4×4 guard, `GRID=4`, spawn weights `FIXED_WEIGHTS 40/40` / `POT_WEIGHT 0.2` / `POT_CURVE`, `ceilingDetector`/`tierForCeiling`, `previewFor` / `previewInvariant` / ambiguity band, `matchScore`, `src/feel` haptics/punch/shake/bullet/sfx, HUD/layout, persistence** | `git diff --stat -- triade/src/engine triade/src/feel triade/src/ui triade/src/game` between `0b81c67` and `eb11b56` shows no files changed (spec boundary `Always: preserve EARLY_INPUT_MS/SLIDE_MS/TILE_FADE_MS, syncTiles single-writer, reducedMotion, planTileTransitions contract` and `Never: change GRID/engine/trace`); `git diff --stat -- triade/__tests__/engine` likewise empty beyond new `cell-retarget` ATDD. | Invariants stay gated by 926 pass / 0 fail baseline (`npm --prefix triade test` Auto Run) + `tsc -p tsconfig.test.json` no new errors (pre-existing 8 spawn-candidates-validation only, per `## Auto Run Result`) + existing `__tests__/engine/game.test.ts` + `transitionPlan.test.ts` suites still green. |
| **Changing animation durations `SLIDE_MS=160` / `TILE_FADE_MS=120` / `EARLY_INPUT_MS≈84` / `MAX_MOVE_ANIM_MS=280`, introducing new gesture library deps, altering `GRID`/`BOARD_PADDING`/`CELL_GAP`/`CELL_RADIUS`** | Spec Boundaries `Block If: Changing grid geometry (GRID/B whose pixels), altering input gate timing` and `Never: Change GRID size or board layout constants`. | Current design keeps durations byte-identical (`rg -n "SLIDE_MS|TILE_FADE_MS|EARLY_INPUT_MS" triade/src/render/GameBoard.tsx` still `160/120/0.3`); verification via `tsc` + `pixel()` helper still `BOARD_PADDING + col*(cell+CELL_GAP)` (`rg -n "function pixel" GameBoard.tsx` 1 hit). |
| **Altering `MoveResult` / `Board` / `PendingSpawn` public types, changing `transitionPlan` contract beyond fallbacks, changing `handleGestureEnd` in `triade/src/ui/gesture.ts`** | Spec `Code Map` marks `triade/src/engine/core/types.ts` as reference-only; `transitionPlan.ts` change is only the existing `!moved→[]` guard (still single). | Shapes pinned via `rg -n "export type MoveResult" triade/src/engine/core/types.ts` + `rg -n "export function planTileTransitions"` each 1 hit + `tsc` both configs. Stroke guard and gate hardening remain in prior `dw-render-gate-hardening` bundle, not this one. |
| **Editing `_bmad-output/implementation-artifacts/deferred-work.md` ledger beyond `done+resolution-undo`, or writing `sprint-status.yaml`** | Spec `Never: Edit deferred-work.md ledger` and task prompt `sprint-status.yaml is owned by the orchestrator: never write it, and never revert a change to it.` | Working-tree `git diff` already shows ledger `open→done` 1 entry with `resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c` (`rg -n "9f25aea8" _bmad-output/implementation-artifacts/deferred-work.md` 1 hit); `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in this workflow. This plan never writes ledger or status. |
| **Board `role="grid"` a11y, physical device lane, frame-rate bench, rewarded-ads / RevenueCat / Epic 9–11** | No a11y/bench/ads code touched (`triade/src/render/GameBoard.tsx` + `transitionPlan.ts` + new `cell-retarget.atdd.test.ts` only). | Existing suites + `__tests__/render/transitionPlan.test.ts` + `render.smoke.test.ts` still cover Skia `Canvas`/`AnimatedTile` paths; device/bench remain manual-validation per spec `Manual checks: Resize simulator mid-slide and swipe immediately after; no tile jump.` |
| **New animation semantics for `appear`/`vanish` beyond snap/spring retarget (e.g., re-triggering `withDelay` fade or punch `overshootScale`)** | Retarget effect intentionally does not re-arm `appear` fade (`withDelay(delay,withTiming)`) or punch `presetFor` overshoot; doing so would re-trigger stale appearances mid-resize. | Verified by `cell-retarget.atdd.test.ts:121-126` P1-01 asserting vanish fade still `delay + SLIDE_MS → withTiming(0,{duration:100})` unchanged and no `withDelay` inside the `[cell]` effect. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | TECH | Rest-tile stale-pixel re-plan jump — after `cell` A→B, a `rest` tile's `x/y` still at `pixel(to,A)` while next `applyPlan` computes `from: src.to` logically in B pixels → next swipe composes from mismatched spaces and tiles visibly jump (DW-37 primary symptom, `GameBoard.tsx:98-112,174-175,250-269`). | 2 | 3 | 6 | `GameBoard.tsx:186-195` DW-37 effect: `pixel(to,cell)` → `rest|appear` immediate `x.value=next.x; y.value=next.y` on every `[cell]` change; `byCell` re-plan then starts from consistent logical `to` in new space. Pinned by `cell-retarget.atdd.test.ts:35-52` P0-01 `pixel(to,cell)` + `x.value=next.x` + `[cell]` dep + `decision: retarget all kinds` human sign-off 2026-09-02. | Dev | 2026-09-02 done (`eb11b56`) |
| R-002 | DATA | Move/vanish mid-spring stale target — `move`/`vanish` already mid-`withSpring(toPos)` when `cell` changes; without retarget the spring's target stays at old pixels, so in-flight tile lands off-grid and next re-plan's `from: src.to` is inconsistent → jump or ghost. | 2 | 3 | 6 | Same DW-37 effect second branch: `move|vanish → withSpring(next.x/y,spring)` so in-flight spring retargets smoothly to new `pixel(to,B)` instead of stale `pixel(to,A)`. Pinned by `cell-retarget.atdd.test.ts:42-52` `withSpring(next.x`/`withSpring(next.y)` + `kind==='move' && kind==='vanish'` branch. | Dev | 2026-09-02 done |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-003 | TECH | Appear snap vs spring choice — `appear` re-projected with immediate snap (`x.value=next.x`) could clip its `withDelay(delay,withTiming)` fade or punch `overshootScale 1.08/1.12/1.15` if snap reassigned mid-fade; spring would prolong appear settle beyond `TILE_FADE_MS 120` budget. | 2 | 2 | 4 | Spec human decision `retarget all kinds` chose snap for `appear` (immediate) to cancel stale origin without re-arming fade; vanish fade schedule untouched (`delay+SLIDE_MS`). Verified by P1-01 `appear` snap + `vanish` fade still `delay+SLIDE_MS` + `withTiming(0,{duration:100})`. | Dev |
| R-004 | TECH | No-resize regression — extra `[cell]` effect fires spuriously when `cell` unchanged (e.g., React bail-out missing dep) or duplicates existing `[toPos.x,toPos.y,kind]` effect and double-springs `x/y`, causing redundant `withSpring` arms or fighting assignments. | 2 | 2 | 4 | Effect dep is exactly `[cell]` (single, per `cell-retarget.atdd.test.ts:135-142` P1-03 `}, [cell])` uniqueness) and existing `move|vanish` effect remains `[toPos.x,toPos.y,kind]` (P0-02). No shared dep overlap; `cell` unchanged → no fire. `tsc` + `cell-retarget` P0-02 regression pin. | Dev |
| R-005 | OPS | Resize thrash — rapid `width` toggles (continuous rotation / Split View) fire `[cell]` effect for every `AnimatedTile` (up to 16 tiles) each frame; `withSpring` per tile per frame could accumulate worklet pressure and jank beyond `MAX_MOVE_ANIM_MS 280` budget. | 1 | 3 | 3 | Cost is one `pixel()` + one worklet assign/spring per tile per distinct `cell`; Expo `useWindowDimensions` debounces rotation already. Spec `Manual checks` inspect simulator mid-slide resize+swipe (no jump) rather than perf bench; host `npm --prefix triade test` timing still `<5 min` and `tsc` clean. | Dev |
| R-006 | TECH | `syncTiles`/`tilesRef` interaction — cell-retarget writes `x/y` SharedValues directly (worklet) while `applyPlan`'s `syncTiles` re-creates tile descriptors from logical `to`; if SharedValue write races the next `applyPlan`'s `byCell` promotion (`src.to → tr.to`), the visual start could momentarily desync from logical `from`. | 1 | 2 | 2 | `syncTiles` single-writer invariant still holds (`rg -c "setTilesState" GameBoard.tsx` → 1 inside `syncTiles:358-361`); retarget writes `SharedValue` only, not `tilesRef`. Logical `to` is source of truth; next `applyPlan`'s `from: src.to` uses corrected logical `to` after retarget (no pixel assertion needed, per spec Tasks `no pixel assertion needed beyond source scan`). Future work if rotation is promoted to full rebuild path. | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-007 | TECH | `pixel()` helper drift — `BOARD_PADDING/CELL_GAP` constants change without updating `pixel()` or retarget would compute wrong grid; `cell` derived `Math.max(...,1)` guard accidentally removed. | 1 | 2 | 2 | Monitor — `pixel` still `BOARD_PADDING + col*(cell+CELL_GAP)` (`cell-retarget.atdd.test.ts:114-118` P0-06) and `cell` guard `Math.max(...,1)` (P0-04) both pinned; `tsc` would catch type drift. |
| R-008 | PERF | Extra effect per-tile memory — each `AnimatedTile` now holds an additional `useEffect` closure; 16 tiles → 16 closures, trivial (<1 KB). | 1 | 1 | 1 | Monitor — no action. |
| R-009 | TECH | Dependency staleness — effect reads `to`, `kind`, `spring` but dep is only `[cell]`; stale `to` could retarget to previous logical cell if `to` changed in same commit as `width`. | 1 | 2 | 2 | Monitor — `to` and `kind` are stable per tile descriptor (only `applyPlan` changes them, which remounts or updates `toPos` effect); `[cell]`-only dep is intentional to avoid double-fire on every `toPos` change. Captured as `cell-retarget` P0-01 `pixel(to,cell)` inside effect body (reads fresh `to`). |

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
| Reliability | Visual consistency on resize — `rest`/`appear` snap to `pixel(to, newCell)` and `move`/`vanish` spring to `pixel(to,newCell)` within same frame as `cell` change; next swipe re-plan shows no visible jump. | R-001, R-002 | Host ATDD `cell-retarget.atdd.test.ts:35-52` P0-01 (DW-37 marker + `[cell]` dep + `pixel(to,cell)` + snap vs spring branches) plus `transitionPlan !moved→[]` invariant (P0-03). | ATDD report `npm --prefix triade test -- --test-name-pattern="cell-retarget"` 9/9 pass; `triade/src/render/GameBoard.tsx:180-195` source scan artifact; manual sim resize+swipe per spec Verification (if no CLI). |
| Reliability | No-regression on existing animation contract — `move`/`vanish` still spring to `toPos` on `to` change, `vanish` fade still `delay+SLIDE_MS→100ms`, `appear` fade `delay→120ms`/`withSpring(1)`, `EARLY_INPUT_MS 84` gate unchanged. | R-004 | Host ATDD P0-02 (`move|vanish → withSpring(toPos.x/y)` + `[toPos.x,toPos.y,kind]`), P1-01 (`vanish fade` branch), `rg -n "SLIDE_MS|TILE_FADE_MS|EARLY_INPUT_MS" GameBoard.tsx` → `160/120/0.3`. | ATDD report + `rg` count artifact + `tsc --noEmit --project triade/tsconfig.json` + `tsconfig.test.json` clean (pre-existing 8 spawn-candidates only). |
| Performance | Resize retarget does not regress host gate `<5 min` or push in-flight spring beyond `MAX_MOVE_ANIM_MS 280` budget; no new per-frame allocations. | R-005 | Host gate `npm --prefix triade test` timing + `tsc` clean; sim mid-slide resize+swipe manual jank check. | Smoke timing artifact (`full triade suite 926 pass` per `## Auto Run Result`), `tsc` clean. |
| Maintainability | Single-writer `syncTiles` + `pixel()` helper remain sole mapping of logical `to` → `SharedValue`; DW-37 effect is the only `[cell]` writer for x/y. | R-006, R-007 | Static grep `rg -c "setTilesState" GameBoard.tsx` → 1, `rg -c "tilesRef\.current ="` → 1, `rg -c "DW-37"` → 1, `rg -n "}, \[cell\]"` → 1 (P1-03). | Grep count artifact + `cell-retarget.atdd.test.ts:108-118` P0-05/P0-06/P1-03 pins. |
| Reliability | `cell` guard `Math.max(...,1)` prevents NaN on degenerate `width=0` (boardSize clamp removal per UX-DR-20, `layout.ts:31` guard). | R-007 | Host ATDD P0-04 `Math.max(...,1)` pin → `cell >=1` even when `width` degenerate. | P0-04 artifact + existing `layout.test.ts` clamp-path cases. |

**Unknown thresholds:** None additional — `SLIDE_MS 160 / TILE_FADE_MS 120 / EARLY_INPUT_MS 84 / MAX_MOVE_ANIM_MS 280 / BOARD_PADDING 8 / CELL_GAP 8 / CELL_RADIUS 10 / GRID 4` are single-source in `GameBoard.tsx:28-46`; manual resize+swipe gap is binary "no visible jump" (UX-DR-20, project rule: Skia animation is manual validation; informative only). Missing: none invented.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM — spec `spec-dw-37-cell-retarget.md` intent/boundaries/I-O matrix frozen at `final_revision eb11b56` (no block-if trigger: `GRID` geometry, input gate timing, native device lane unchanged).
- [ ] `triade/src/render/GameBoard.tsx` at `eb11b56` locally (DW-37 `[cell]` retarget `180-195` present; `cell` guard `Math.max(...,1)` at `315-316`; `pixel()` helper at `82-88` byte-identical; `rg -n "DW-37" GameBoard.tsx` → 1 hit).
- [ ] Test environment provisioned — `triade/tsconfig.json` + `triade/tsconfig.test.json` `tsc --noEmit` clean baseline (8 pre-existing spawn-candidates-validation errors only, per `spec-dw-37 Review Triage` 2 low rejects); host runner `npm --prefix triade test` baseline 926 pass / 0 fail holds.
- [ ] Feature deployed to test harness — Expo app launchable for manual smoke (spec `Manual checks: Resize simulator mid-slide and swipe immediately after; no tile jump.`).
- [ ] Seed data / fixtures — 4×4 boards deterministic via `test-utils/helpers.ts:boardWith` + `emptyBoard`, no new infra.

## Exit Criteria

- [ ] All P0 tests passing — DW-37 `[cell]` retarget (all kinds + `pixel(to,cell)` + snap vs spring) + `toPos` spring regression + `!moved→[]` invariant + `Math.max(...,1)` + `syncTiles` single writer + `pixel` helper — 100% green (6/6 in `cell-retarget.atdd.test.ts`).
- [ ] All P1 tests passing (or failures triaged) — vanish fade schedule, `byCell`/`syncTiles` re-plan path, single `[cell]` effect uniqueness (3/3).
- [ ] No open high-priority / high-severity bugs — R-001/R-002 mitigations verified; residual R-005 thrash noted but not gate-blocking (host-only, simulator manual waiver).
- [ ] Test coverage agreed as sufficient — P0 6 groups host ATDD (static source scans + `transitionPlan` behavioral `hold/slide`), P1 3 groups, P2/P3 5 groups; no duplicate engine-level coverage (engine byte-identical).
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers — resize consistency, no-regression animation contract, maintainability single-writer, `cell` guard each have evidence artifact (ATDD report + grep + `tsc` clean).

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
| ---- | ---- | ------------------------ |
| Eduardo | Dev / TEA | Owns DW-37 cell-retarget + test design; runs host ATDD `cell-retarget` scans and grep invariants; signs off on `[cell]` retarget + manual resize+swipe smoke |
| QA (host) | QA Lead | Owns P0 host ATDD (`cell-retarget` 9 scans) + `transitionPlan` behavioral `hold/slide` + `tsc` gate; witnesses manual resize+swipe if device present |
| PM | Product | Confirms animation timing unchanged (`SLIDE_MS/TILE_FADE_MS/EARLY_INPUT_MS`) and manual check `no tile jump` per spec `Manual checks` |

---

## Test Coverage Plan

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround — stale-pixel jump on resize+re-plan

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| DW-37 effect re-projects all kinds on `cell` change — `pixel(to,cell)` → `x/y` immediate (`rest/appear`) vs `withSpring` (`move/vanish`) | Unit (ATDD static scan `triade/__tests__/render/cell-retarget.atdd.test.ts:35-52`) | R-001, R-002 | 1 | QA | Scan `boardSrc` includes `DW-37`, `}, [cell])`, `kind==='rest' && kind==='appear'`, `kind==='move' && kind==='vanish'`, `pixel(to, cell)`, `x.value = next.x` (snap) + `withSpring(next.x`/`withSpring(next.y` (spring). Only `[cell]` dep variant — fails fast if any branch missing. |
| Existing `move`/`vanish` `toPos` spring unchanged (regression) | Unit (ATDD scan `cell-retarget.atdd.test.ts:55-61`) | R-004 | 1 | QA | Assert `if (kind === 'move' || kind === 'vanish')` + `withSpring(toPos.x`/`withSpring(toPos.y` + dep `[toPos.x, toPos.y, kind]` still present; proves DW-37 did not replace original effect. |
| `planTileTransitions` `!moved→[]` + hold/slide still holds after retarget (re-plan consistency) | Unit (`cell-retarget.atdd.test.ts:63-101`) | R-001, R-002 | 1 | QA | `transitionSrc` guard `if (!result.moved) return []`; behavioral `boardWith` 4×4: `moved:false→[]`, `moved:true` fabricated `trace: [{from:[[0,0]],to:[0,0]}] → hold/slide` every entry; ensures `byCell` re-plan from retargeted `to` composes correctly. |
| `cell` derivation still `Math.max(...,1)` guard (NaN on degenerate width) | Unit (scan P0-04) | R-007 | 1 | QA | `boardSrc` `Math.max(` + `, 1)` + `const cell = Math.max`; width=0 edge → `cell===1`, `pixel([0,0],1) → BOARD_PADDING`. |
| `syncTiles` single-writer invariant still holds (tilesRef not desynced) | Static (`cell-retarget.atdd.test.ts:108-112` P0-05) | R-006 | 1 | QA | Grep `setTilesState(next)` count 1 + `tilesRef.current = next` count 1, both inside `syncTiles:358-361`; no direct `setTilesState` outside. |
| `pixel()` helper still `BOARD_PADDING + cell[1/0] * (cell+CELL_GAP)` | Unit (scan P0-06) | R-007 | 1 | QA | `function pixel(` + `BOARD_PADDING + cell[1]` + `BOARD_PADDING + cell[0]` pins grid math; retarget's `pixel(to,cell)` would drift if helper drifted. |

**Total P0**: 6 tests (already in `cell-retarget.atdd.test.ts` P0-01..06), ~0.8–1.2h host (static scans + one `transitionPlan` behavioral, no device)

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows — fade schedule, re-plan wiring, uniqueness

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Vanish fade schedule not broken by retarget — `delay + SLIDE_MS → withTiming(0,{duration:100})` still on `vanish` | Unit (scan P1-01) | R-003 | 1 | QA | Assert `if (kind === 'vanish')` + `delay + SLIDE_MS` + `withTiming(0, { duration: 100 }` still present; proves `[cell]` spring did not re-arm fade. |
| `applyPlan` still routes via `syncTiles` + `byCell(cellKey(t.to))` retarget map | Static (scan P1-02) | R-006 | 1 | QA | `byCell.set(cellKey(t.to[0], t.to[1]), t)` + `syncTiles(next)` + `function cellKey` each 1 hit; ensures logical `to` map survives retarget. |
| Exactly one `[cell]` retarget effect (no duplicate) | Static (scan P1-03) | R-004 | 1 | QA | `count(boardSrc,'DW-37')===1` + `countRe(}, [cell])===1`; duplicate `[cell]` would indicate copy-paste retarget or split rest/move branches diverging. |

**Total P1**: 3 tests (already in `cell-retarget.atdd.test.ts` P1-01..03), ~0.3–0.6h host

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases — `no-resize` stability, hygiene, bounds

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| No-resize → no spurious retarget — `cell` unchanged while `toPos` changes still triggers original `[toPos.x,toPos.y,kind]` spring only | Unit | R-004 | 1 | QA | Behavioral: mount `AnimatedTile` with `cell=A`, change `to` (slide) without changing `cell`; assert `x/y` spring via `toPos` path, not `[cell]` path (cover by P0-02 + manual). |
| `cell` NaN guard `Math.max(...,1)` edge `width=0` → `cell===1` + `pixel([0,0],1)` in-bounds | Unit | R-007 | 1 | QA | `width=0` board → `cell===1` (`layout.test.ts` clamp-path analog); `pixel([0,0],1)` yields `BOARD_PADDING`. Already P0-04, P2 extends to bounds check. |
| `spring` config unchanged `damping:14 stiffness:260 mass:0.8` for both retarget and original `toPos` | Static | R-002 | 1 | DEV | `rg -n "damping.*14.*stiffness.*260.*mass.*0.8" GameBoard.tsx` still 1 hit shared by both effects; drift would change retarget feel. |
| `reducedMotion` still suppresses shake/bullet without affecting cell retarget (retarget is board-only, not feel layer) | Component | — | 1 | QA | `GameBoard reducedMotion=true` effective move → `shakeX/Y` not animated but `AnimatedTile` `[cell]` snap/spring still fires (gate independent). |

**Total P2**: 4 tests, ~0.4–0.8h host

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| Exploratory resize+swipe manual — rotate simulator mid-slide, swipe immediately after; verify no tile jump and next re-plan lands on grid | Manual | 1 | QA | Finger path: start slide `move` tiles, fire `useWindowDimensions` width change mid-spring, immediately accept next swipe; check commit `to`→pixel mapping visually; `DW-37` decision `retarget all kinds` predicts no jump for `rest` and smooth spring for `move`. |
| Bench `npm --prefix triade test` full host timing delta before/after `eb11b56` | Unit | 1 | QA | Before/after `eb11b56` timing <5% regression, `tsc --noEmit --project triade/tsconfig.json` + `tsconfig.test.json` still 0 new errors (`tsc -p tsconfig.test.json` pre-existing 8 only), no new `benchmarks/` needed. |

**Total P3**: 2 scenarios, ~0.2h + 10m manual

---

## Execution Order

> **Philosophy:** Run everything in PRs if `<15 min`; defer only if expensive/long. No duplication of coverage-plan items here.

- **PR** (host, `<5 min`): All P0 + P1 host ATDD static scans (`cell-retarget.atdd.test.ts` 9 scans) plus static grep invariants (`DW-37`/`[cell]`/`setTilesState`/`pixel` counts) plus `tsc --noEmit --project triade/tsconfig.json` + `tsconfig.test.json` clean + `npm --prefix triade test -- --test-name-pattern="cell-retarget"` single-pattern gate.
- **Pre-merge** (once, `<15 min`): Full `npm --prefix triade test -- --passWithNoTests` gate (`~926 pass` + new `cell-retarget` 9 + 11 expected RED unchanged, per spec `## Auto Run Result`) + 2-min manual sim resize+swipe check if device/simulator present (spec `Manual checks` inspect `GameBoard` `[cell]` retarget + `applyPlan` re-plan path).
- **Nightly/Weekly**: Not required for this bundle (no device lane, no E2E, no perf bench beyond host timing); optional weekly `npm --prefix triade test` full + `benchmarks/feel.bench.test.ts` if future resize-retarget expands to 60 FPS bench.

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | 6 | ~0.15 | ~0.6–1.0 | ATDD static scans + one `transitionPlan` behavioral `hold/slide`; `cell-retarget.atdd.test.ts` already implements |
| P1 | 3 | ~0.12 | ~0.25–0.5 | Vanish fade + `byCell`/`syncTiles` + `[cell]` uniqueness scans |
| P2 | 4 | ~0.12 | ~0.3–0.6 | No-resize regression, `cell` bounds, `spring` pin, `reducedMotion` passthrough |
| P3 | 2 | ~0.10 | ~0.15–0.3 | Exploratory manual resize+swipe + host timing bench |
| **Total** | **15** | **-** | **~1.3–2.4** | **~0.2–0.35 day headcount** |

> Includes setup (helpers `boardWith`, `planTileTransitions` fixture, `fs.readFileSync` source-scan harness) — no new infra. Actual `cell-retarget` ATDD was authored in the fix commit `eb11b56` (143 LOC), so incremental cost for this design's host run is **<5 min** (`npm --prefix triade test -- --test-name-pattern="cell-retarget"` 9/9 + `tsc`).

### Prerequisites

**Test Data:**

- `boardWith(4×4)` factory (`triade/test-utils/helpers.ts:13-60`) + `emptyBoard` for 4×4 deterministic cases; fabricated `MoveResult{ moved, trace:{value,to,from,spawned}, board, score }` for `planTileTransitions` hold/slide checks (override `trace` without `move()` rng draw).

**Tooling:**

- Host runner `node --test` via `npm --prefix triade test` (no Playwright needed; Skia `Canvas`/`AnimatedTile` is worklet — validated via source-scan ATDD, not rendered pixels; project rule: Skia animation is manual validation).
- `rg` (ripgrep) for grep invariants (`DW-37`, `}, [cell])`, `setTilesState`, `pixel(`, `SLIDE_MS|TILE_FADE_MS`).
- `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` gates.

**Environment:**

- Node 20+ with `triade/tsconfig.json` `tsc --noEmit` clean (8 pre-existing `spawn-candidates-validation` errors only, per spec Review Triage).
- iOS simulator optional for manual resize+swipe (not gate-blocking; static retarget coverage suffices for host PR).

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions) — 6/6 `cell-retarget` P0 scans + `transitionPlan` behavioral must be green.
- **P1 pass rate**: ≥95% (waivers required for failures) — 3/3 P1 scans; single `countRe(}, [cell])===1` uniqueness is high-value.
- **P2/P3 pass rate**: ≥90% (informational) — manual resize+swipe is waiver-eligible (simulator absent).
- **High-risk mitigations**: 100% complete or approved waivers — R-001/R-002 retarget all kinds verified.

### Coverage Targets

- **Critical paths**: ≥80% — `AnimatedTile` `[cell]` retarget branch (rest/appear snap vs move/vanish spring) + `toPos` spring + `!moved→[]` invariant.
- **Business logic**: ≥70% — `applyPlan` `byCell` re-plan + `syncTiles` single writer + `pixel()` grid math.
- **Edge cases**: ≥50% — `cell` degenerate `width=0` → `Math.max(...,1)`, no-resize no-spurious-spring, duplicate-effect hygiene.

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`cell-retarget.atdd.test.ts` 6 P0 scans 100% green, `npm --prefix triade test -- --test-name-pattern="cell-retarget"` 9/9).
- [ ] No high-risk (≥6) items unmitigated (R-001 rest stale-pixel + R-002 move/vanish stale-spring both pinned).
- [ ] `tsc --noEmit` clean on both configs except pre-existing 8 spawn-candidates-validation (spec `Review Triage` low rejects).
- [ ] `rg` invariants hold: `DW-37` 1 hit, `}, [cell])` 1 hit, `setTilesState(next)` 1, `tilesRef.current = next` 1, `pixel(to, cell)` 1, `function pixel(` 1.
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (resize consistency, no-regression animation contract, single-writer).

---

## Mitigation Plans

### R-001: Rest-tile stale-pixel re-plan jump (Score: 6)

**Mitigation Strategy:**
1. Add `useEffect([cell])` in `AnimatedTile:180-195` reading fresh `to` and `cell` each `width` change, computing `next=pixel(to,cell)`, branching `rest|appear→immediate snap` so `rest` never stores stale pixels.
2. Preserve existing `useEffect([toPos.x,toPos.y,kind])` for `move|vanish` `toPos` spring so original slide still triggers on logical move.
3. Keep `applyPlan` `byCell(cellKey(t.to))` logical map so next swipe composes `from: src.to` in new pixel space; no new `pixel` math in `applyPlan`.
4. Pin with `cell-retarget.atdd.test.ts:35-52` P0-01 (`pixel(to,cell)` + `x.value=next.x` + `withSpring(next.x` + `[cell]` dep).

**Owner:** Dev
**Timeline:** 2026-09-02 done (`eb11b56`)
**Status:** Complete
**Verification:** `npm --prefix triade test -- --test-name-pattern="cell-retarget"` 9/9 pass; `rg -n "DW-37" GameBoard.tsx` 1; `rg -n "}, \[cell\]" GameBoard.tsx` 1; simulator mid-slide resize+swipe no jump (manual waiver if no sim).

### R-002: Move/vanish mid-spring stale target (Score: 6)

**Mitigation Strategy:**
1. Same DW-37 effect second branch `move|vanish → withSpring(next.x/y,spring)` (`damping 14 stiffness 260 mass 0.8` shared with original spring).
2. Ensure `spring` object is stable literal (not recreated per render causing spring reset churn).
3. Keep `vanish` fade `delay+SLIDE_MS→100ms` independent of `[cell]` spring (no re-arm).

**Owner:** Dev
**Timeline:** 2026-09-02 done
**Status:** Complete
**Verification:** `cell-retarget.atdd.test.ts:42` `kind==='move' && kind==='vanish'` branch + `withSpring(next.x` pins; P1-01 vanish fade unchanged pin; `rg -n "withSpring\(next" GameBoard.tsx` 2 hits (x,y).

---

## Assumptions and Dependencies

### Assumptions

1. `useWindowDimensions().width → cell` is the only source of `cell` change; `GRID/B` never changes at runtime (spec `Never: change GRID`).
2. `to` and `kind` per `AnimatedTile` are stable between `applyPlan` invocations; rapid `moveResult` cascade updates `to` before `cell` commit, so `[cell]`-only dep does not miss a logically new `to` (same-tick `width` + `board` change would still fire `[cell]` once with fresh `to` read).
3. Skia/Reanimated worklet `x.value=withSpring(...)` is frame-coalesced; 16 tiles each arming one spring per distinct `cell` is within 60 FPS budget (project rule: Skia animation is manual validation; bench is `triade/src/render` host only).
4. `tsc` pre-existing 8 errors in `spawn-candidates-validation` are unrelated and remain waived (spec `Review Triage` low rejects).

### Dependencies

1. `triade/src/render/transitionPlan.ts` `if (!result.moved) return []` invariant — Required by `2026-09-02` (stable since `1a24dc0`); no engine change.
2. `triade/src/render/GameBoard.tsx:358-361` `syncTiles` single-writer — Required by `dw-render-gate-hardening 0cfd046`; verified via `cell-retarget` P0-05.

### Risks to Plan

- **Risk**: Manual resize+swipe simulator absent in CI → P3 exploratory uncovered.
  - **Impact**: Visual "no jump" claim rests on static ATDD `pixel(to,cell)` scan + `hold/slide` behavioral, not rendered pixels.
  - **Contingency**: `cell-retarget.atdd.test.ts` 9/9 + `rg` invariants are sufficient host gate; manual check documented as waiver-eligible in Exit Criteria and is project-rule-consistent (Skia manual validation per `instructions.md`).

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run) — already done: `cell-retarget.atdd.test.ts` 9 scans are the ATDD for this bundle.
- Run `*automate` for broader coverage once implementation exists — not needed for this one-effect fix (host ATDD + `transitionPlan` behavioral suffice; no Playwright/Cypress scaffold).
- Run `*nfr-assess` after manual resize+swipe if device present — evaluates resize consistency PERF/reliability thresholds from NFR Planning.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: Date:
- [ ] Tech Lead: Date:
- [ ] QA Lead: Date:

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **triade/src/render/GameBoard.tsx `AnimatedTile`** | Direct — added `[cell]` retarget effect; no API change | `__tests__/render/cell-retarget.atdd.test.ts` 9/9 + `__tests__/render/transitionPlan.test.ts` 13 + `__tests__/render/render-gate-hardening.atdd.test.ts` + `__tests__/render/render.smoke.test.ts` must stay green |
| **triade/src/render/transitionPlan.ts `planTileTransitions`** | Indirect — `applyPlan` re-plan after retarget composes from `byCell(t.to)` | `transitionPlan.test.ts` + `adaptive-spawn-integration.test.ts` + `game.test.ts` (326+ cases) green; `tsc` clean |
| **triade/src/ui/layout.ts `layoutFor` / `triade/App.tsx width→cell`** | None — `cell` still `Math.max(...,1)` from `width`; `layoutFor` byte-identical | `__tests__/ui/layout.test.ts` clamp-path + golden-anchor still green |
| **triade/src/engine/** | None — engine byte-identical (`git diff -- triade/src/engine` empty) | `__tests__/engine/*.test.ts` 900+ pass unchanged; engine parity suite still green |
| **triade/src/feel/** | None — feel layer (shake/bullet/punch) not retargeted; `AnimatedTile` retarget is board-only | `__tests__/feel/*.test.ts` still green |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection (Unit for `AnimatedTile` worklet via source-scan ATDD, no E2E)
- `test-priorities-matrix.md` - P0-P3 prioritization (P0 = blocks core + high risk + no workaround: resize+re-plan jump)
- `nfr-criteria.md` - NFR thresholds (60 FPS/never-throw/maintainability; exhaustive list deferred to `nfr-assess`)
- `overview.md` / `selective-testing.md` - Scope: `triade/src/render` only, no engine re-run needed beyond regression gate

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prd.md` (UX-DR-20 container-driven maximize, `boardSize` cap removal)
- Spec: `_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md` (`baseline 0b81c67`, `final eb11b56`)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` `DW-37` (now `done 2026-09-02 dw-decision-dw-37`)
- Architecture: `triade/src/render/GameBoard.tsx:82-88,180-195,315-316` + `triade/src/render/transitionPlan.ts:1-60`
- Tech Spec: `triade/AGENTS.md` (Expo 57 docs pin, `boardSize` clamp removal)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Bundle**: `dw-decision-dw-37` / `DW-37 cell retarget` — human decision 2026-09-02 `Retarget all kinds on cell change`
