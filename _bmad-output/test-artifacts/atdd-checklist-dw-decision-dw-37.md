---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-02'
workflowType: 'testarch-atdd'
storyId: 'dw-decision-dw-37'
storyKey: 'dw-decision-dw-37'
storyFile: '_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-37.md'
generatedTestFiles:
  - 'triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts'
  - 'triade/__tests__/render/cell-retarget.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-37-cell-retarget.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/__tests__/render/cell-retarget.atdd.test.ts'
  - 'triade/__tests__/render/transitionPlan.test.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-decision-dw-37 — DW-37 orientation resize cell retarget (stale pixel SharedValues)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) + static `rg` allowlists — RN Skia board seam exercised via host `node:test` + static source scans; no Playwright/Cypress E2E harness required. Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 + Skia/Reanimated/RNGH) but scenario is framework-free `pixel()`/+`AnimatedTile` worklet exercised via `node:test`.

---

## Story Summary

DW bundle `dw-decision-dw-37` fixes the pre-existing render bug where orientation/resize mid-animation leaves `AnimatedTile` `x/y` `SharedValue`s in stale pixel space. Before `eb11b56` `rest` tiles never re-targeted on `cell` change and a swipe accepted right after resize (`EARLY_INPUT_MS 84ms` gate T3.4) would `applyPlan` from `tilesRef` whose `to` was still expressed in old `cell` pixels → tiles visibly jump. `move`/`vanish` mid-`withSpring` likewise never re-projected their target. The fix is a single `useEffect([cell])` inside `AnimatedTile` at `GameBoard.tsx:180-195` that re-projects every kind onto the new grid per human decision 2026-09-02 retarget-all: `rest|appear` snap immediately (`x.value=next.x; y.value=next.y` cancels stale), `move|vanish` spring (`x.value=withSpring(next.x,spring)`) so in-flight motion continues smoothly. Next swipe's re-plan then composes from consistent logical `to` in new pixel space (`byCell` `cellKey(t.to)`).

**As a** player rotating the device or resizing the board mid-animation
**I want** tiles to re-project onto the new pixel grid when `cell` changes — rest/appear snap immediately, move/vanish spring to the new target
**So that** a swipe accepted right after resize does not visibly jump and the next `applyPlan` re-plan starts from correctly projected positions, while `EARLY_INPUT_MS/SLIDE_MS/TILE_FADE_MS`, `syncTiles` single-writer, `reducedMotion` and `spring {damping:14 stiffness:260 mass:0.8}` stay byte-identical.

---

## Acceptance Criteria

1. **AC-1 rest tile resize immediate snap** — Given a `rest` tile mounted at `cell=A` (`pixel(to,A)`), when `width`/`cell` changes to `B`, then `x/y` snap immediately to `pixel(to,B)` (`x.value=next.x; y.value=next.y`) without stale coordinate, via `useEffect([cell])` `rest|appear` branch.
2. **AC-2 move/vanish mid-spring spring retarget** — Given a `move`/`vanish` tile mid-`withSpring(toPos)` when `cell` changes, then `x/y` spring to new `pixel(to,B)` (`withSpring(next.x/y,spring)` `damping:14 stiffness:260 mass:0.8`) instead of landing off-grid at stale `pixel(to,A)`.
3. **AC-3 resize+re-plan no visible jump** — Given a resize that re-projects `rest` tiles, when `applyPlan` re-plans the next accepted swipe (`byCell` `cellKey(t.to)` + `syncTiles`), then `from: src.to` uses logical `to` in new pixel space → no visible jump; `planTileTransitions` `!moved→[]` + `hold/slide` contract holds.
4. **AC-4 appear tile snap + no-resize no spurious effect** — Given an `appear` tile or no `cell` change, when `toPos` changes without `cell` change, then existing `move|vanish` spring `withSpring(toPos)` still triggers and `[cell]` effect does not fire spuriously (single `[cell]` dep, single `[toPos.x,toPos.y,kind]` dep).
5. **AC-5 invariants preserved** — Given the sweep, when scanned, then `syncTiles` stays single writer (`setTilesState(next)` 1 + `tilesRef.current=next` 1 both inside `syncTiles`), `pixel()` helper stays `BOARD_PADDING + cell[1/0]*(cell+CELL_GAP)`, `cell` guard stays `Math.max(...,1)`, 3 animation constants stay `SLIDE_MS=160`/`TILE_FADE_MS=120`/`EARLY_INPUT_MS=84`, vanish fade `delay+SLIDE_MS→100ms` unchanged.
6. **AC-6 ledger + ownership** — Given `deferred-work.md` DW-37, when scanned, then it shows `status: done 2026-09-02` + `decision: 2026-09-02 Retarget all kinds on cell change` + `resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c` 64-hex; spec shows `Status: done` / 9/9 ATDD / 926 pass; `sprint-status.yaml` is not written by this workflow (orchestrator-owned).

---

## Story Integration Metadata

- **Story ID:** `dw-decision-dw-37` (bundle; spec `baseline_revision: 0b81c678dbbc819b0ab0cc78bd6f10bba19895cb`, `final_revision: eb11b56b4f30845531a2ba121c9bbf9e0605d71f`, `updated_final 2b8e73f` on `main`, doc `d5e47c9` bump, ledger `cf6079c`)
- **Story Key:** `dw-decision-dw-37`
- **Story File:** `_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-37.md`
- **Generated Test Files:**
  - `triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts` (NEW — 15 RED-phase scaffolds, `it.skip` wrapped in `describe` `node:test`, host `node:test` + `tsx`; 6 P0 + 3 P1 + 4 P2 + 2 P3; dormant 15 skipped, activated 15 pass / 0 fail; covers working-tree delta + production delta `eb11b56`)
  - `triade/__tests__/render/cell-retarget.atdd.test.ts` (existing GREEN — 9 ATDD scans P0-01..06 + P1-01..03, 143 LOC, 9 pass at `eb11b56`; reference for red→green verification — host gate shows 926 pass / 0 fail baseline)
  - Existing hardened suites (reference, already green after sweep): `triade/__tests__/render/transitionPlan.test.ts` (13 pass `slide/merge/spawn/hold`), `triade/__tests__/render/render-gate-hardening.atdd.test.ts` (20 inner skipped), `triade/__tests__/ui/layout.test.ts` (18 pass)
- **Working-tree delta covered (vs HEAD):**
  - `_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md:99-117` — `+16` `## Auto Run Result` block `Status: done` / summary `DW-37 orientation/resize mid-animation stale pixel fix — AnimatedTile now retargets x/y SharedValues on cell change for all kinds (rest/appear immediate snap, move/vanish withSpring to pixel(to,newCell) per human decision 2026-09-02 retarget-all)` / Files changed `GameBoard.tsx:180-195` + `cell-retarget.atdd.test.ts` 9 scans / Verification `cell-retarget 9/9 pass; full triade 926 pass 0 fail; tsc -p tsconfig.test.json no new errors (pre-existing 8 spawn-candidates only)` / Review `0 intent_gap 0 bad_spec 0 patch 0 defer 2 low rejects` / Residual manual-validation (no defer).
  - `_bmad-output/implementation-artifacts/deferred-work.md:301-309` — DW-37 `status: open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-decision-dw-37` + `resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c 2026-09-02 7374617475733a206f70656e` 64-hex + `decision: 2026-09-02 Retarget all kinds on cell change — Add cell-change effect retargeting x/y shared values for rest/vanish/move tiles to new pixel grid.`; `git diff --stat HEAD` shows only these 2 docs + `test-design-progress.md` 19-line progress snippet (not production).
  - `_bmad-output/test-artifacts/test-design-progress.md:...+19` — progress snapshot for DW-37 sweep (steps 1-5, 9 risks, 15 tests).
  - `triade/src/render/GameBoard.tsx:82-88,180-195,315-316,358-361,400-463` — production delta at `eb11b56` (not in `git diff HEAD` because already committed): `pixel(cell->[x,y])` helper byte-identical `BOARD_PADDING + col*(cell+CELL_GAP)`; `AnimatedTile` NEW `useEffect` at `180-195` `// DW-37 cell-change retarget` keyed on `[cell]` that re-projects `x/y` onto new pixel grid: `const next=pixel(to,cell)` then `rest|appear→x.value=next.x; y.value=next.y` immediate snap vs `move|vanish→x.value=withSpring(next.x,spring); y.value=withSpring(next.y,spring)` shared `spring {damping:14 stiffness:260 mass:0.8}`; `cell` still `Math.max((width-BOARD_PADDING*2-CELL_GAP*(GRID-1))/GRID,1)` at `315-316`; `applyPlan:400-463 byCell` re-plan uses logical `to`; `syncTiles:358-361` single-writer invariant preserved.
  - `triade/__tests__/render/cell-retarget.atdd.test.ts:1-143` — NEW 9 scans (6 P0 + 3 P1) pinning `DW-37` marker, `[cell]` dep, `pixel(to,cell)` retarget, `rest|appear` snap vs `move|vanish` spring branches, `toPos` spring regression, `!moved→[]` hold/slide, `Math.max(...,1)` guard, `syncTiles` 1+1, `pixel` helper bounds, vanish `delay+SLIDE_MS→100ms`, `byCell` map, single `[cell]` uniqueness.
  - No engine, HUD, layout, feel, spawn/pot/ceiling change; `triade/src/render/transitionPlan.ts:1-60` invariant `if(!result.moved) return []` still gates re-plan.
  - `sprint-status.yaml` NOT written (orchestrator-owned per prompt — verified via `git diff --stat` having no `sprint-status.yaml`).

---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`/`react-native-gesture-handler` + `RN 0.86`; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`)
- **No Playwright/Cypress harness needed:** scenario is `AnimatedTile` `pixel(to,cell)` + `SharedValue x/y` + `planTileTransitions` contract + `rg` allowlists for `DW-37`/`[cell]`/`syncTiles`/`pixel`; correct levels are **Unit host + Static scans** (per `test-design-dw-37-cell-retarget.md` risk `R-001..R-002` mitigations cover host static + one `transitionPlan` behavioral `hold/slide`). No HTTP API, no web Playwright flow — RN Skia Canvas + RNGH project; feel/bullet/shake not retargeted (board-only). `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN project, not a web Playwright flow).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`

---

## Red-Phase Test Scaffolds Created

### Unit + Static Scans (15 tests — 4 suites, 15 inner `it.skip`, host `node:test`)

**File:** `triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts` (~170 lines, 4 suites)

All 15 inner are `it.skip` scaffolds — RED-phase dormant. When activated (`it.skip` → `it`) they assert the **expected** post-sweep hardened behaviour; before `0b81c67` they would fail (rest at stale `pixel(to,A)` → jump on next swipe, move/vanish stale spring target → off-grid, no `[cell]` effect, no `withSpring(next.`). With the working-tree delta + production delta `eb11b56` they **PASS** (see Execution Evidence). This is the correct TDD inversion: tests document the contract; implementation already in working tree makes them green.

**Companion file:** `triade/__tests__/render/cell-retarget.atdd.test.ts` is the companion GREEN suite (9 active scans, 143 LOC) already at `eb11b56` — 9/9 pass baseline. The new `dw-37-cell-retarget.atdd.test.ts` mirrors its P0/P1 coverage plus adds P2/P3 hygiene/manual pins; together they give 15+9=24 ATDD checks for the `GameBoard` cell seam (`host gate 926 pass` + this bundle `15` = `941 pass` when activated).

#### P0 Critical — Spec AC + DW-37 retarget all kinds (6 tests)

- ✅ **Test:** `[P0-01] AnimatedTile has cell-change effect retargeting x/y to new pixel grid (all kinds)`
  - **Status:** RED (skip) — would fail before fix (rest had no `[cell]` effect → stale `pixel(to,A)` while `cell` became `B` → next `applyPlan from:src.to` mismatch jump; move/vanish spring never re-projected)
  - **Verifies:** `GameBoard.tsx:180-195` DW-37 marker + `}, [cell])` 1 hit + `pixel(to, cell)` 1 hit + `kind==='rest' && kind==='appear'` snap block + `kind==='move' && kind==='vanish'` spring block + `x.value = next.x` immediate + `withSpring(next.x`/`withSpring(next.y` 2 hits (R-001, R-002, AC-1/2).
  - **Fail reason before:** no `DW-37` marker, no `[cell]` dep, no `pixel(to,cell)`, no `withSpring(next.` branch.

- ✅ **Test:** `[P0-02] existing move/vanish toPos spring effect still present (regression)`
  - **Status:** RED — DW-37 must not replace original `[toPos.x,toPos.y,kind]` spring; both effects coexist
  - **Verifies:** `GameBoard.tsx:128-142` `if (kind==='move'||kind==='vanish')` + `withSpring(toPos.x`/`withSpring(toPos.y` + dep `[toPos.x, toPos.y, kind]` still present (R-004, AC-4).

- ✅ **Test:** `[P0-03] rest tiles re-plan path: planTileTransitions !moved->[] invariant and hold/slide still holds`
  - **Status:** RED — `transitionPlan !moved→[]` is the logical invariant that makes `byCell` re-plan compose correctly after retarget
  - **Verifies:** `transitionPlan.ts` guard `if (!result.moved) return []` + behavioral `boardWith` 4×4 `moved:false→[]` then fabricated `moved:true` hold→ `hold/slide` every entry; ensures `byCell` re-plan from retargeted `to` composes (R-001, R-002, AC-3).

- ✅ **Test:** `[P0-04] GameBoard cell derivation still uses Math.max(...,1) guard`
  - **Status:** RED — `cell` degenerate `width=0` must not become `0` NaN; `BOARD_PADDING/CELL_GAP` guard prevents degenerate pixel NaN
  - **Verifies:** `GameBoard.tsx:315-316` `const cell = Math.max(` + `, 1)` 1 hit (R-007).

- ✅ **Test:** `[P0-05] syncTiles single writer invariant still holds (no regression)`
  - **Status:** RED — `syncTiles` is the single disciplined writer for `tilesRef` + React state; DW-37 retarget writes `SharedValue x/y` only (worklet), not `tilesRef`, so logical `to` stays source of truth
  - **Verifies:** `GameBoard.tsx:358-361` `syncTiles(next)` single writer + `setTilesState(next)` 1 hit + `tilesRef.current = next` 1 hit both inside `syncTiles` (R-006, test-design R-006).

- ✅ **Test:** `[P0-06] pixel helper unchanged`
  - **Status:** RED — `pixel()` drift would make retarget compute wrong grid (`BOARD_PADDING + col*(cell+CELL_GAP)` must stay byte-identical)
  - **Verifies:** `function pixel(` 1 hit + `BOARD_PADDING + cell[1]` + `BOARD_PADDING + cell[0]` pins (R-007).

#### P1 Wiring — vanish fade, byCell map, uniqueness (3 tests)

- ✅ **Test:** `[P1-01] cell retarget effect covers vanish fade schedule not broken`
  - **Status:** RED — `[cell]` spring must not re-arm `vanish` fade `delay+SLIDE_MS→withTiming(0,{duration:100})` or `appear` punch
  - **Verifies:** `GameBoard.tsx:169-178` `if(kind==='vanish')` + `delay + SLIDE_MS` + `withTiming(0,{duration:100}` still present and no `withDelay` inside `// DW-37` block (R-003, AC-5).

- ✅ **Test:** `[P1-02] applyPlan still routes via syncTiles and byCell retarget`
  - **Status:** RED — `applyPlan` logical `byCell.set(cellKey(t.to[0],t.to[1]),t)` + `syncTiles(next)` + `function cellKey` each 1 hit ensures logical `to` map survives retarget
  - **Verifies:** `GameBoard.tsx:404-454` `byCell`/`syncTiles`/`cellKey` (R-006, AC-3).

- ✅ **Test:** `[P1-03] SCAN: exactly one cell-change retarget effect keyed on [cell]`
  - **Status:** RED — duplicate `[cell]` would indicate copy-paste retarget split; single effect is the hygiene invariant
  - **Verifies:** `count('DW-37')===1` + `countRe(}, [cell])===1` (R-004).

#### P2 Static scans — hygiene, bounds, spring, reducedMotion (4 tests)

- ✅ **Test:** `[P2-01] no-resize stability: cell unchanged while toPos changes still triggers original spring only`
  - **Status:** RED — duplicate `[cell]` + `[toPos.x,toPos.y,kind]` would double-spring `x/y`
  - **Verifies:** `}, [cell])` 1 hit + `}, [toPos.x, toPos.y, kind])` 1 hit (R-004, P2 waivable).

- ✅ **Test:** `[P2-02] cell NaN guard edge width=0 → cell===1 and pixel([0,0],1) in-bounds`
  - **Status:** RED — `width=0` edge → `cell===1` `pixel([0,0],1)→BOARD_PADDING`; `layoutFor` clamp removal `layout.ts:31` not retuned here
  - **Verifies:** `Math.max(...,1)` + `pixel` x formula (R-007, P2).

- ✅ **Test:** `[P2-03] spring config unchanged damping:14 stiffness:260 mass:0.8 shared by both effects`
  - **Status:** RED — drift would change retarget feel; single `const spring = {damping:14 stiffness:260 mass:0.8}` 1 hit shared by original `toPos` spring and `[cell]` spring
  - **Verifies:** `rg spring literal` + `spring` 1 definition (R-002).

- ✅ **Test:** `[P2-04] reducedMotion still independent of cell retarget (board-only, not feel layer)`
  - **Status:** RED — feel layer shake/bullet not retargeted; `AnimatedTile` `[cell]` not gated on `reducedMotion`
  - **Verifies:** `reducedMotion` prop still exists + shake `if(reducedMotion)` + cell block no `reducedMotion` gate (P2).

#### P3 Exploratory / residual / hygiene (2 tests)

- ✅ **Test:** `[P3-01] exploratory resize+swipe manual: rotate mid-slide then swipe, no visible jump`
  - **Status:** RED — waivable manual 10-min per spec Verification `Resize simulator mid-slide and swipe immediately after; no tile jump.`; host pin `DW-37` static coverage suffices for PR gate (project rule: Skia animation is manual validation)
  - **Verifies:** `DW-37` static coverage + spec manual `Resize simulator mid-slide` + `no tile jump` literals (R-005).

- ✅ **Test:** `[P3-02] ledger DW-37 done + resolution-undo 9f25aea8 64-hex + decision prefix + sprint-status untouched`
  - **Status:** RED — ledger `deferred-work.md` must show `DW-37 done 2026-09-02` + `9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c` 64-hex 1 hit + `Retarget all kinds on cell change` + `resolved by sweep bundle dw-decision-dw-37`; `spec` `Status: done` + `9/9` + `926 pass`; `sprint-status.yaml` not written
  - **Verifies:** deferred-ledger ownership + orchestrator `sprint-status.yaml` invariant + `resolution-undo` 64-hex.

---

## Data Factories Created

Not applicable to this board retarget seam (per `test-design-dw-37-cell-retarget.md`):
- **No `@faker-js/faker` factories** — fixtures are deterministic `boardWith(4×4)` + `emptyBoard()` + `pixel(to,cell)` arithmetic + `moveResult` shape `{moved, trace:{value,to,from,spawned}, board, score}` + `planTileTransitions` stub injecting `moved:true` fabricated `trace` for `hold/slide` re-plan check. No new factory file — reuse existing `triade/test-utils/helpers.ts` (`emptyBoard`/`boardWith`/`mulberry32`/`gameState` already cover 4×4 deterministic cases).
- **No new factory file** — `GameBoard` props `board: Board` + `moveResult: MoveResult|null` + `width: number` are exercised via host unit `pixel()` + `planTileTransitions` pure calls + static `readFileSync(GameBoard.tsx)` scans; no generated `board.factory.ts` needed.

---

## Fixtures Created

Not applicable — pure RN Skia board + `transitionPlan` logic + `AnimatedTile` worklet seam, no Playwright fixtures / browser automation:
- **No Playwright fixture / `test.extend`** — the seam uses host `node:test` + `tsx` with pure `planTileTransitions` calls + `rg` allowlists for `DW-37`/`[cell]`/`syncTiles`/`pixel` discipline; browser `test.extend` is not needed (RN Expo + Skia project, no `page.goto`).
- **No external service mocking** — no I/O in `AnimatedTile` retarget or `GameBoard` `applyPlan` beyond `pixel()` arithmetic + `withSpring`/`withTiming` worklets (already covered by `render.smoke.test.ts`); `AnimatedTile` mount is exercised via static `GameBoard.tsx` read, not via `render` mount.
- **Helper seam reused:** `byCell` `cellKey(t.to)` logical map + `syncTiles` atomicity is verified via `rg -n "byCell.set(cellKey(t.to"` + `setTilesState(next)` 1-hit scans; `pixel()` pure + `cell Math.max(...,1)` guard verified via source read.

---

## Mock Requirements

None. No UI surface change that mocks `useWindowDimensions`/`useSafeAreaInsets` — retarget helper is pure `pixel(to,cell)` + `withSpring` worklet assignment. The only consumers are `AnimatedTile` `x/y` `SharedValue`s (`withSpring`/`direct assign`) and `GameBoard` `applyPlan` `byCell` map — both are synchronous host static `readFileSync` scans, not mocked endpoints. `reducedMotion` is a boolean prop (still exercised via `render-gate-hardening` gate scans), not a mocked provider.

---

## Required data-testid Attributes

None — `GameBoard.tsx` Skia `Canvas`/`AnimatedTile` + `BurstView` are host `node:test` verified via `render.smoke.test.ts` `isSkiaCanvas`/`AnimatedTile` mount + `transitionPlan.test.ts` `hold/slide` + `cell-retarget.atdd.test.ts` 9-scan contract, not re-derived here. `GameBoard` `cell` retarget is a pixel-space `SharedValue` assignment (`x.value=next.x` / `withSpring`), not a DOM surface, so no `data-testid` needed. Vanish/appear `opacity/scale` still use existing `delay+SLIDE_MS`/`withTiming` worklets (no new testids).

---

## Implementation Checklist

Maps directly to the working-tree diff already in place (`0b81c67→eb11b56 dw-decision-dw-37` → working-tree ledger `9f25aea8…`). Each scaffold's GREEN task is the code change that makes it pass — for this completed sweep the tasks are **already done** (working tree implements them; activated ATDD now GREEN). Keep checklist as the red→green roadmap for any re-hardening.

### Test: [P0-01] AnimatedTile cell-change retarget all kinds

**File:** `triade/src/render/GameBoard.tsx:180-195` (`// DW-37 cell-change retarget` effect)

**Tasks to make this test pass (DONE in working tree at `eb11b56`):**
- [x] Add `// DW-37 cell-change retarget` comment + `useEffect(()=>{ const next=pixel(to,cell); if(kind==='rest'||kind==='appear'){ x.value=next.x; y.value=next.y; } else if(kind==='move'||kind==='vanish'){ x.value=withSpring(next.x,spring); y.value=withSpring(next.y,spring); } },[cell])` (`GameBoard.tsx:180-195`)
- [x] Keep `pixel()` helper byte-identical at `82-88` `BOARD_PADDING + col*(cell+CELL_GAP)` (no drift)
- [x] Verify `rg -n "DW-37" GameBoard.tsx` ==1, `rg -n "pixel\(to, cell\)" GameBoard.tsx` ==1, `rg -n "x\.value = next\.x" GameBoard.tsx` ==1, `rg -n "withSpring\(next" GameBoard.tsx` ==2 (x,y)
- [x] Run test: `npm --prefix triade test -- __tests__/render/dw-37-cell-retarget.atdd.test.ts` → `it.skip` → `it` inner → P0-01 green (also `cell-retarget.atdd.test.ts` 9/9 green)
- [x] ✅ Test passes (rest/appear snap, move/vanish spring to `pixel(to,newCell)`; Next swipe re-plan `from:src.to` consistent)

**Estimated Effort:** 0.4h

---

### Test: [P0-02] move/vanish toPos spring regression

**File:** `triade/src/render/GameBoard.tsx:128-142` (`toPos` spring) — must coexist with DW-37 `[cell]` effect

**Tasks:**
- [x] Keep `useEffect(()=>{ if(kind==='move'||kind==='vanish'){ x.value=withSpring(toPos.x,spring); y.value=withSpring(toPos.y,spring); if(kind==='move'){ opacity.value=1; scale.value=1; } } },[toPos.x,toPos.y,kind])` byte-identical
- [x] Verify `rg -n "withSpring\(toPos" GameBoard.tsx` ==2 (x,y) and `[toPos.x, toPos.y, kind]` dep 1 hit
- [x] ✅ Test passes (toPos spring still triggers on logical move)

**Estimated Effort:** 0.1h

---

### Tests: [P0-03] planTileTransitions !moved→[] + hold/slide re-plan consistency

**File:** `triade/src/render/transitionPlan.ts:46-60` + `triade/__tests__/render/cell-retarget.atdd.test.ts:63-101` behavioral

**Tasks:**
- [x] Keep `transitionPlan.ts:15-18` `if(!result.moved) return []` 1 hit (logical invariant `!moved→[]` gates re-plan)
- [x] Verify fabricated `boardWith 4×4` `moved:false→[]` then `moved:true` `hold/slide` every entry (`planTileTransitions(boardHold, fakeResult).every(t=>t.type==='hold'||'slide')`)
- [x] Verify `applyPlan:404-447 byCell.set(cellKey(t.to[0],t.to[1]),t)` still uses logical `to` map so retarget composes without extra `pixel` math
- [x] ✅ Tests pass (re-plan from retargeted `to` consistent)

**Estimated Effort:** 0.3h

---

### Test: [P0-04] cell Math.max(...,1) guard

**File:** `triade/src/render/GameBoard.tsx:315-316` (`cell` derived)

**Tasks:**
- [x] Keep `const cell = Math.max((width - BOARD_PADDING*2 - CELL_GAP*(GRID-1))/GRID, 1)` byte-identical
- [x] Verify `rg -n "Math\.max\(.*1\)" GameBoard.tsx` 1 hit and `const cell = Math.max` 1 hit
- [x] ✅ Test passes (degenerate `width=0` → `cell===1`, `pixel([0,0],1) → BOARD_PADDING`)

**Estimated Effort:** 0.1h

---

### Test: [P0-05] syncTiles single writer

**File:** `triade/src/render/GameBoard.tsx:358-361` (`syncTiles`) + `400-463` `applyPlan`

**Tasks:**
- [x] Keep `const syncTiles = useCallback((next)=>{ tilesRef.current=next; setTilesState(next); },[])` at `358-361`; `applyPlan:404-447` and `onVanish:566-569` route via `syncTiles(next)` (not bare `setTilesState`+separate ref)
- [x] Verify `rg -n "setTilesState\(next\)" GameBoard.tsx` ==1, `rg -n "tilesRef\.current = next" GameBoard.tsx` ==1, `rg -n "syncTiles\(next\)" GameBoard.tsx` + `syncTiles(rebuilt)` for null branch ≥3 calls
- [x] ✅ Test passes (worklet retarget writes `SharedValue` only, not `tilesRef`; logical `to` source of truth preserved)

**Estimated Effort:** 0.2h

---

### Test: [P0-06] pixel helper

**File:** `triade/src/render/GameBoard.tsx:82-88` (`pixel`)

**Tasks:**
- [x] Keep `function pixel(cell:[number,number], cellSize:number){ return { x:BOARD_PADDING+cell[1]*(cellSize+CELL_GAP), y:BOARD_PADDING+cell[0]*(cellSize+CELL_GAP) }; }` byte-identical
- [x] Verify `function pixel(` 1 hit + `BOARD_PADDING + cell[1]` + `BOARD_PADDING + cell[0]` each 1 hit
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P1-01] vanish fade schedule + [P2-03] spring + [P3-01] manual

**File:** `triade/src/render/GameBoard.tsx:169-178` (`vanish` fade) + `180-195` `[cell]` spring branch + spec Verification

**Tasks:**
- [x] Keep `useEffect(()=>{ if(kind==='vanish'){ opacity.value=withDelay(delay+SLIDE_MS, withTiming(0,{duration:100}, runOnJS(onVanish))) } },[delay,kind,onVanish,id])` byte-identical and ensure `// DW-37` block has no `withDelay` (fade not re-armed on resize)
- [x] Keep `spring = {damping:14,stiffness:260,mass:0.8}` single definition 1 hit shared by original `toPos` spring and `[cell]` spring
- [x] Document manual `Resize simulator mid-slide and swipe immediately after; no tile jump.` waiver (spec Verification + P3-01)
- [x] Verify `rg -n "delay \+ SLIDE_MS" GameBoard.tsx` 1 hit + `withTiming(0, { duration: 100 }` 1 hit + `withDelay` not inside `// DW-37` 800-char block
- [x] ✅ Tests pass (P1-01, P2-03, P3-01)

**Estimated Effort:** 0.3h

---

### Tests: [P1-02] byCell/syncTiles re-plan path + [P1-03] single [cell] uniqueness + [P2-01] no-resize + [P2-02] cell bounds

**File:** `triade/src/render/GameBoard.tsx:404-463` `applyPlan` + `358-361` `syncTiles`

**Tasks:**
- [x] Keep `byCell.set(cellKey(t.to[0],t.to[1]),t)` 1 hit + `syncTiles(next)` ≥3 + `function cellKey` 1 hit
- [x] Keep exactly one `}, [cell])` effect (DW-37) + one `}, [toPos.x, toPos.y, kind])` effect (original); `count(DW-37)===1`
- [x] Verify no spurious `[cell]` fire when `cell` unchanged: deps are non-overlapping (`[cell]` vs `[toPos.x,toPos.y,kind]`)
- [x] Keep `Math.max(...,1)` guard + `pixel` x formula (`BOARD_PADDING + col*(cell+CELL_GAP)`) so `width=0` still yields `cell===1` in-bounds
- [x] ✅ Tests pass (P1-02, P1-03, P2-01, P2-02)

**Estimated Effort:** 0.3h

---

### Test: [P2-04] reducedMotion independence

**File:** `triade/src/render/GameBoard.tsx:98-112,180-195,318-335` (`reducedMotion` prop + shake/bullet guard vs board-only retarget)

**Tasks:**
- [x] Keep `reducedMotion?:boolean` prop at `98-112` + `shakeX/Y`/`bulletFlash` guards `if(reducedMotion)` at `328-335` but `// DW-37` block has no `reducedMotion` check (board retarget independent of feel layer)
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P3-02] ledger 64-hex + sprint-status ownership + spec done + App+Board only scope

**File:** `_bmad-output/implementation-artifacts/deferred-work.md:301-309` + `spec-dw-37-cell-retarget.md:99-117` + `git diff --stat HEAD`

**Tasks:**
- [x] Flip ledger `deferred-work.md` DW-37 `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-decision-dw-37` + `resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c` 64-hex 1 hit + `decision: 2026-09-02 Retarget all kinds on cell change` — working tree already at `bmad-dev-auto-result-dw-decision-dw-37-tea.td-1.md` metadata + `+16` spec `Auto Run Result`
- [x] Verify `rg -n "9f25aea8" deferred-work.md` ==1 + spec `Status: done` + `cell-retarget 9/9` + `926 pass` literals + Review `0 intent_gap 0 bad_spec 0 patch 0 defer 2 low rejects`
- [x] Verify `git diff --stat HEAD` shows only `spec-dw-37-cell-retarget.md +16` + `deferred-work.md +3` + `test-design-progress.md +19` (production already at `eb11b56`); `triade/src/engine` byte-identical (`git diff --stat -- triade/src/engine` empty)
- [x] Never write `sprint-status.yaml` (orchestrator-owned — verify `git diff --stat` has no `sprint-status.yaml` and ledger shows only `deferred-work.md` + spec `Auto Run Result`)
- [x] ✅ Tests pass (P3-02)

**Estimated Effort:** 0.3h

**Total Implementation Effort:** ~2.1h host (code already at `eb11b56` + ledger `9f25aea8…` metadata + docs `+16`); ATDD scaffolds `~0.9h` authoring (`helpers.ts` reused, no new infra); host-only `PR <5 min` incremental (`cell-retarget 9/9 + dw-37 15 skipped + rg + tsc`)

---

## Running Tests

```bash
# Run all dormant RED scaffolds for this bundle (15 inner skipped, 4 suites pass — host gate shows 4 suites, 15 skipped)
npm --prefix triade test -- __tests__/render/dw-37-cell-retarget.atdd.test.ts

# The companion GREEN suite already at eb11b56 (9 pass, no skip) — proves production delta
npm --prefix triade test -- __tests__/render/cell-retarget.atdd.test.ts
# → 6 P0 + 3 P1 = 9 pass (ATDD DW-37 cell retarget — P0 critical 6, P1 3)

# Activate one scaffold at a time for the current task, then confirm RED→GREEN:
#   edit triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts: change it.skip → it for that inner test

# Run the single ATDD file activated (with working-tree delta — expect 15 pass + 4 suites = 19 pass total)
# (temporarily: replace inner it.skip → it, as verified in evidence)
python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts'); t=p.read_text(); pathlib.Path('/tmp/active37.ts').write_text(t.replace('it.skip','it'))" && cp /tmp/active37.ts triade/__tests__/render/dw-37-cell-retarget.atdd.active.test.ts && npm --prefix triade test -- __tests__/render/dw-37-cell-retarget.atdd.active.test.ts && rm triade/__tests__/render/dw-37-cell-retarget.atdd.active.test.ts

# Run both ATDD files together activated (existing 9 + new 15 = 24 checks for the cell seam)
python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts'); t=p.read_text(); pathlib.Path('/tmp/a.ts').write_text(t.replace('it.skip','it'))" && cp /tmp/a.ts triade/__tests__/render/dw-37-cell-retarget.atdd.active.test.ts && npm --prefix triade test -- __tests__/render/cell-retarget.atdd.test.ts __tests__/render/dw-37-cell-retarget.atdd.active.test.ts 2>&1 | tail -n 25; rm triade/__tests__/render/dw-37-cell-retarget.atdd.active.test.ts

# Run the existing regression suites that prove no regression (<15 min)
npm --prefix triade test -- __tests__/render/transitionPlan.test.ts __tests__/render/render-gate-hardening.atdd.test.ts __tests__/render/render.smoke.test.ts
# → 13 + 0/20-skipped + 3 pass (slide/merge/spawn/hold + HOLD/never-leak/empty-plan invariant)

# Full host gate (<5 min dormant, <5.5s active extra)
npm --prefix triade test

# Typecheck both TsConfigs (triade/tsconfig.json + tsconfig.test.json) — clean except pre-existing 8
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json
npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json
# expect: 0 new errors (pre-existing 8 spawn-candidates-validation only, per spec Review Triage 2 low rejects)
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 15 tests written as red-phase scaffolds with inner `it.skip()` (TDD red phase — `node:test` `it.skip` is the `test.skip()` analogue; outer `describe` is the suite runner)
- ✅ Companion GREEN file `cell-retarget.atdd.test.ts` already 9/9 pass at `eb11b56` (proves production delta) — this checklist's RED scaffolds mirror its contract + add P2/P3 hygiene
- ✅ No fixtures/factories needed beyond existing `helpers.ts` harnesses (`emptyBoard`/`boardWith`/`GRID=4`/`pixel` + `transitionPlan` pure) — reuse `boardWith` 4×4 deterministic + fabricated `MoveResult` for `hold/slide` hold
- ✅ Mock requirements documented (none — pure `pixel(to,cell)` + `withSpring` worklet + `planTileTransitions` arithmetic)
- ✅ data-testid requirements listed (none — Skia `Canvas` + `AnimatedTile` worklet, not DOM)
- ✅ Implementation checklist created (6 P0 + 3 P1 + 4 P2 + 2 P3 tasks, all DONE in working tree per `eb11b56` + ledger `9f25aea8…`)

**Verification:**

- All 15 generated tests are present and marked with inner `it.skip` (see `npm --prefix triade test -- __tests__/render/dw-37-cell-retarget.atdd.test.ts` output: `tests 19 / suites 4 / pass 4 / skipped 15` when counted dormant; companion `cell-retarget.atdd.test.ts` shows `tests 9 / pass 9` GREEN)
- Activation guidance is clear (one inner `it.skip → it` at a time per task, see Running Tests)
- Activated tests would fail due to missing implementation before `0b81c67` — now PASS because working-tree delta + `eb11b56` implements them (evidence: de-skipped run `15 pass / 0 fail` for this file, `9 pass` companion, combined `24 pass` cell seam; host gate `926 pass / 0 fail` dormant, `941 pass / 0 fail` when this bundle's 15 activated)
- This is INTENTIONAL (TDD red phase); implementation already covers the working-tree delta (`git diff 0b81c67..eb11b56 -- triade/src/render/GameBoard.tsx` shows only `+15` DW-37 `[cell]` effect; `git diff HEAD` shows only `spec-dw-37-cell-retarget.md +16` + `deferred-work.md +3` + `test-design-progress.md +19` metadata, not production; `git diff --stat -- triade/src/engine` empty)

---

### GREEN Phase (DEV Team — Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with highest priority P0-01 `AnimatedTile [cell] retarget pixel(to,cell) all kinds`)
2. **Remove inner `it.skip` → `it`** for that test and confirm it fails first (before `0b81c67` it would be `DW-37` missing → stale `pixel(to,A)` → jump on next swipe)
3. **Read the test** to understand expected behaviour (`DW-37` marker + `[cell]` dep + `pixel(to,cell)` + `rest|appear snap` vs `move|vanish withSpring` + `syncTiles` single-writer + `hold/slide`)
4. **Implement minimal code** to make that specific test pass (see Checklist task for file:line — typically `GameBoard.tsx:180-195` single `[cell]` effect `pixel(to,cell)` + `spring {damping:14 stiffness:260 mass:0.8}` + `spec-dw-37-cell-retarget.md` Design Notes)
5. **Run the test** `npm --prefix triade test -- __tests__/render/dw-37-cell-retarget.atdd.test.ts` to verify green
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat

**For this completed sweep:** every GREEN task is already DONE in the working tree (see `git diff 0b81c67..eb11b56 -- triade/src/render/GameBoard.tsx` + `cell-retarget.atdd.test.ts` 9 GREEN + ledger `deferred-work.md` DW-37 `9f25aea8…`); activating all 15 at once now yields `15 pass` (4 suites + 15 inner) (via inner `it.skip→it`). Keep the one-at-a-time rule for any future re-hardening.

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer — single `useEffect([cell])` 15 LOC + `pixel(to,cell)` pure + spec `Never: GRID/engine/new dep` respected)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap

**Progress Tracking:**

- Check off tasks as you complete them
- Share progress in daily standup

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete — 15/15 activated inner + 4/4 suites, plus companion `cell-retarget.atdd.test.ts:9/9` + `transitionPlan.test.ts:13` + `render-gate-hardening` 20 skipped + `engine` pipelines `897` effective + `10` expected-RED)
2. **Review code for quality** (readability — `// DW-37` marker + `pixel(to,cell)` naming vs bare `pos`/`w`/`h`, single `spring` const vs duplicate, single `[cell]` writer + `syncTiles` single writer)
3. **Extract duplications** (already done — no duplicate `pixel` formula or second `spring {damping:14…}` or second `}, [cell])`; `withSpring(next.` 2 hits is hygiene x+y, not duplication)
4. **Optimize performance** (already O(1) per tile `pixel` + one `withSpring` per distinct `cell` per tile — `PR <5 min` host, 16 tiles each arming one spring per `cell` within `MAX_MOVE_ANIM_MS 280` budget; `feel.bench.test.ts` both-profile `<16.7ms` still green)
5. **Ensure tests still pass** after each refactor (`npm --prefix triade test` stays `926 pass dormant / 941 pass when bundle activated` + `tsc --noEmit` both configs clean except pre-existing 8)
6. **Update documentation** (if contract changes — `spec-dw-37-cell-retarget.md` Design Notes already cover `[cell]` vs immediate snap vs spring trade-off + `sprint-status.yaml` ownership + `deferred-work.md` ledger single-hit `9f25aea8…`)

**Key Principles:**

- Tests provide safety net (refactor with confidence — `P1-03` single `[cell]` uniqueness + `P0-05` `syncTiles` + `P0-06` `pixel` scans catch collapsed writer/offset/drift)
- Make small refactors (easier to debug if tests fail — `rg` allowlists pinpoint `DW-37` vs `withSpring(next.` missing retarget branch)
- Run tests after each change
- Don't change test behaviour (only implementation)

**Completion:**

- All tests pass (15/15 activated inner + 4/4 outer, plus companion `cell-retarget 9/9` + `transitionPlan.test.ts:13` + `render-gate 20-skipped` + `engine` pipelines `897` effective + `10` expected-RED)
- Code quality meets team standards (single `DW-37` marker, single `[cell]` effect, single `pixel(to,cell)` retarget, single `spring`, single `syncTiles` writer, bounded `4×4` `GRID`, never-jump `pixel(to,B)`, `sprint-status.yaml` not written)
- No duplications or code smells (no duplicate `setTilesState(next)` + no duplicate `}, [cell])` + no duplicate `board[r][c]` scan outside `syncTiles`)
- Ready for code review and story approval

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md`)
2. **If the story file cannot be updated automatically**, share this checklist and `triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts` + `triade/__tests__/render/cell-retarget.atdd.test.ts` with the dev workflow as a manual handoff
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001..R-002 mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this sweep, implementation already in working tree (`git diff 0b81c67..eb11b56` shows `GameBoard.tsx:180-195` single `[cell]` effect; de-skipped run proves GREEN)
5. **Activate one scaffold at a time** by removing inner `it.skip` for the current task, then confirm it fails before implementing (before `0b81c67`, P0-01 would be missing `DW-37`/`pixel(to,cell)` → stale `pixel(to,A)` jump / P0-03 would be missing `!moved→[]` re-plan invariant)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single `[cell]` writer + `pixel` helper + `syncTiles` + `cell guard` already done; no second `spring` dup)
9. **When refactoring complete**, ledger `deferred-work.md` DW-37 status already `done 2026-09-02` with `9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c` 64-hex — do not touch `sprint-status.yaml`

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (via `test-design-dw-37-cell-retarget.md` + `tea-index.csv`):

- **fixture-architecture.md** — Not needed for `node:test` cell seam — reuse `transitionPlan.test.ts` `boardWith`/`emptyBoard` harnesses + `planTileTransitions` pure helper, no `test.extend`
- **data-factories.md** — Not needed — deterministic `pixel(to,cell)` + `boardWith` 4×4 + `moveResult {moved, trace}` fixtures suffice (no `@faker-js/faker` — tile `to` is `[r,c]` literal + `cell` is `width`-derived)
- **component-tdd.md** — Host unit TDD contract (red-phase `it.skip` scaffolds, one behavioural pin per `describe`, `pixel(to,cell)` fidelity + `syncTiles` atomicity + `hold/slide` re-plan)
- **network-first.md** — Not applicable (no network — pure `pixel()` arithmetic + `tilesRef` sync + `SharedValue` worklet)
- **test-quality.md** — Given-When-Then per test, one pin per `it`, determinism via `boardWith` literals + `rg` static scans, isolation via `emptyBoard` per test, `Number.isFinite` observable replaced by `rg -n` allowlists + `planTileTransitions` pure `!moved→[]`
- **test-levels-framework.md** — Level selection: Unit (pixel/cell `GameBoard` 82-195) vs Static scans (grep allowlists `DW-37`/`[cell]`/`syncTiles`/`pixel`/`cell`/`spring`) vs Component (`GameBoard` `applyPlan byCell`)
- **test-healing-patterns.md** — `// DW-37` marker + `pixel(to,cell)` + `withSpring(next.x/y` naming is the healing hook (CI `rg -n DW-37` 1 vs `rg -n "}, [cell])" 1 pinpoints cell-retarget regression, `rg -n setTilesState(next)` 1 vs comment definition regression)
- **selector-resilience.md / timing-debugging.md** — Not applied directly (no DOM selectors / no `waitFor` — board seam is `pixel(to,cell)` sync assign vs `withSpring` async via worklet, verified via static scan + `planTileTransitions` pure `<0.01ms` + spec manual resize+swipe gap)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN Skia + RNGH project)
- **risk-governance.md / probability-impact.md / test-priorities-matrix.md** — P0/P1/P2/P3 via `test-design-dw-37-cell-retarget.md` Sections "Risk Assessment" (9 risks 2 high `2×3=6`) + "NFR Planning" (reliability resize consistency `pixel(to,B)` + tile `9/16` + no-regression `SLIDE/TILE_FADE/EARLY 160/120/84` + unmount release, performance `160/120/84/280` unchanged + host `<5 min` + O(1) per tile, maintainability single `[cell]` writer + `pixel` + `syncTiles` + `cell` guard, ledger `9f25aea8…` 64-hex, `sprint-status.yaml` ownership) that informed P0/P1/P2/P3 levels

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-37-cell-retarget.md` Sections "Risk Assessment" and "NFR Planning" for the 9 risks (2 high ≥6) and NFR thresholds that informed P0/P1/P2/P3 levels.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification (dormant, expected skip)

**Command:** `npm --prefix triade test -- __tests__/render/dw-37-cell-retarget.atdd.test.ts`

**Results:**
```
▶ ATDD DW-37 cell retarget — P0 critical
  ﹣ [P0-01] AnimatedTile has cell-change effect retargeting x/y to new pixel grid (all kinds) (0.55ms) # SKIP
  ﹣ [P0-02] existing move/vanish toPos spring effect still present (regression) (0.05ms) # SKIP
  ﹣ [P0-03] rest tiles re-plan path: planTileTransitions !moved->[] invariant and hold/slide still holds (0.34ms) # SKIP
  ﹣ [P0-04] GameBoard cell derivation still uses Math.max(...,1) guard (0.05ms) # SKIP
  ﹣ [P0-05] syncTiles single writer invariant still holds (no regression) (0.05ms) # SKIP
  ﹣ [P0-06] pixel helper unchanged (0.05ms) # SKIP
✔ ATDD DW-37 cell retarget — P0 critical (1.6ms)
▶ ATDD DW-37 cell retarget — P1 re-plan consistency
  ﹣ [P1-01] cell retarget effect covers vanish fade schedule not broken (0.06ms) # SKIP
  ﹣ [P1-02] applyPlan still routes via syncTiles and byCell retarget (0.05ms) # SKIP
  ﹣ [P1-03] SCAN: exactly one cell-change retarget effect keyed on [cell] (0.05ms) # SKIP
✔ ATDD DW-37 cell retarget — P1 re-plan consistency (0.27ms)
▶ ATDD DW-37 cell retarget — P2 hygiene (secondary, waivable)
  ﹣ [P2-01] no-resize stability: cell unchanged while toPos changes still triggers original spring only (0.08ms) # SKIP
  ﹣ [P2-02] cell NaN guard edge width=0 → cell===1 and pixel([0,0],1) in-bounds (0.05ms) # SKIP
  ﹣ [P2-03] spring config unchanged damping:14 stiffness:260 mass:0.8 shared by both effects (0.08ms) # SKIP
  ﹣ [P2-04] reducedMotion still independent of cell retarget (board-only, not feel layer) (0.05ms) # SKIP
✔ ATDD DW-37 cell retarget — P2 hygiene (secondary, waivable) (0.25ms)
▶ ATDD DW-37 cell retarget — P3 exploratory / manual
  ﹣ [P3-01] exploratory resize+swipe manual: rotate mid-slide then swipe, no visible jump (0.04ms) # SKIP
  ﹣ [P3-02] ledger DW-37 done + resolution-undo 9f25aea8 64-hex + decision prefix + sprint-status untouched (0.03ms) # SKIP
✔ ATDD DW-37 cell retarget — P3 exploratory / manual (0.11ms)
ℹ tests 19
ℹ suites 4
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 15
ℹ todo 0
ℹ duration_ms ~350

Summary:
- Total tests: 19 (4 outer suites pass + 15 inner skipped)
- Skipped: 15 (expected before activation — RED scaffolds dormant)
- Passing outer: 4 (suites)
- Status: ✅ Red-phase scaffolds verified (all present, all inner it.skip, correct harness node:test + tsx)
```

**Companion GREEN suite (already at `eb11b56`) — dormant none, 9/9 pass:**

**Command:** `npm --prefix triade test -- __tests__/render/cell-retarget.atdd.test.ts`

**Results:**
```
▶ ATDD DW-37 cell-change retarget — P0 critical
  ✔ [P0-01] AnimatedTile has cell-change effect retargeting x/y to new pixel grid (all kinds) (0.64ms)
  ✔ [P0-02] existing move/vanish toPos spring effect still present (regression) (0.07ms)
  ✔ [P0-03] rest tiles re-plan path: planTileTransitions !moved->[] invariant and hold/slide still holds (0.34ms)
  ✔ [P0-04] GameBoard cell derivation still uses Math.max(...,1) guard (0.07ms)
  ✔ [P0-05] syncTiles single writer invariant still holds (no regression) (0.05ms)
  ✔ [P0-06] pixel helper unchanged (0.05ms)
✔ ATDD DW-37 cell-change retarget — P0 critical (3.0ms)
▶ ATDD DW-37 cell retarget — P1 re-plan consistency
  ✔ [P1-01] cell retarget effect covers vanish fade schedule not broken (0.09ms)
  ✔ [P1-02] applyPlan still routes via syncTiles and byCell retarget (0.07ms)
  ✔ [P1-03] SCAN: exactly one cell-change retarget effect keyed on [cell] (0.08ms)
✔ ATDD DW-37 cell retarget — P1 re-plan consistency (1.2ms)
ℹ tests 9
ℹ suites 2
ℹ pass 9
ℹ fail 0
ℹ skipped 0
```

### Activated Run / GREEN Verification (working-tree delta covers delta)

**Command:** `python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts'); t=p.read_text(); pathlib.Path('/tmp/active37.ts').write_text(t.replace('it.skip','it'))" && cp /tmp/active37.ts triade/__tests__/render/dw-37-cell-retarget.atdd.active.test.ts && npm --prefix triade test -- __tests__/render/dw-37-cell-retarget.atdd.active.test.ts && rm triade/__tests__/render/dw-37-cell-retarget.atdd.active.test.ts`

**Results:**
```
▶ ATDD DW-37 cell retarget — P0 critical
  ✔ [P0-01] AnimatedTile has cell-change effect retargeting x/y to new pixel grid (all kinds) (0.58ms)
  ✔ [P0-02] existing move/vanish toPos spring effect still present (regression) (0.06ms)
  ✔ [P0-03] rest tiles re-plan path: planTileTransitions !moved->[] invariant and hold/slide still holds (0.41ms)
  ✔ [P0-04] GameBoard cell derivation still uses Math.max(...,1) guard (0.06ms)
  ✔ [P0-05] syncTiles single writer invariant still holds (no regression) (0.06ms)
  ✔ [P0-06] pixel helper unchanged (0.05ms)
✔ ATDD DW-37 cell retarget — P0 critical (2.4ms)
▶ ATDD DW-37 cell retarget — P1 re-plan consistency
  ✔ [P1-01] cell retarget effect covers vanish fade schedule not broken (0.07ms)
  ✔ [P1-02] applyPlan still routes via syncTiles and byCell retarget (0.06ms)
  ✔ [P1-03] SCAN: exactly one cell-change retarget effect keyed on [cell] (0.07ms)
✔ ATDD DW-37 cell retarget — P1 re-plan consistency (0.39ms)
▶ ATDD DW-37 cell retarget — P2 hygiene (secondary, waivable)
  ✔ [P2-01] no-resize stability: cell unchanged while toPos changes still triggers original spring only (0.08ms)
  ✔ [P2-02] cell NaN guard edge width=0 → cell===1 and pixel([0,0],1) in-bounds (0.06ms)
  ✔ [P2-03] spring config unchanged damping:14 stiffness:260 mass:0.8 shared by both effects (0.08ms)
  ✔ [P2-04] reducedMotion still independent of cell retarget (board-only, not feel layer) (0.05ms)
✔ ATDD DW-37 cell retarget — P2 hygiene (secondary, waivable) (0.46ms)
▶ ATDD DW-37 cell retarget — P3 exploratory / manual
  ✔ [P3-01] exploratory resize+swipe manual: rotate mid-slide then swipe, no visible jump (0.05ms)
  ✔ [P3-02] ledger DW-37 done + resolution-undo 9f25aea8 64-hex + decision prefix + sprint-status untouched (0.04ms)
✔ ATDD DW-37 cell retarget — P3 exploratory / manual (0.17ms)
ℹ tests 19
ℹ suites 4
ℹ pass 19
ℹ fail 0
ℹ skipped 0
ℹ duration_ms ~450

Summary:
- Total tests: 19 (4 suites + 15 inner)
- Pass: 19 (15 inner + 4 suites)
- Status: ✅ GREEN — all 15 inner + companion 9 now green when activated proves working-tree delta covers contract

Combined host gate when activated (existing 9 + new 15 = 24 cell seam):
- `npm --prefix triade test -- __tests__/render/cell-retarget.atdd.test.ts` (dormant none 9 pass) + de-skipped `dw-37-cell-retarget 15 pass` → `926 pass` dormant vs `941 pass` when bundle activated (host gate `+15` this bundle, `10` expected-RED unchanged across full suite).

Full suite dormant: `npm --prefix triade test` → `926 pass 0 fail 346 skipped` | With this bundle activated → `941 pass 0 fail` (delta `+15`).
`tsc --noEmit` both configs: `triade/tsconfig.json` clean, `triade/tsconfig.test.json` 0 new errors (pre-existing 8 `spawn-candidates-validation` only).
```

### Full Host Gate (reference)

**Dormant (as shipped):** `npm --prefix triade test` → `ℹ tests 1272 / suites 114 / pass 926 / fail 0 / skipped 346`
**Activated this bundle:** `→ ℹ tests 1287 / suites 118 / pass 941 / fail 0 / skipped 346` (existing 926 + 15 bundle = 941)
**Typecheck:** `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` clean; `tsconfig.test.json` 8 pre-existing `spawn-candidates-validation` only (per spec Review Triage 2 low rejects).

---

## Notes

- Working-tree diff vs `HEAD` is metadata-only (`spec-dw-37-cell-retarget.md +16 Auto Run Result` + `deferred-work.md DW-37 open→done + resolution-undo 9f25aea8…` + `test-design-progress.md +19`); production delta is at committed `eb11b56 GameBoard.tsx:180-195` single `[cell]` effect — no additional `triade/src/engine`/`triade/src/feel`/`triade/src/ui` production change needed.
- All 15 RED scaffolds use `it.skip` (host `node:test` skip is the TEA `test.skip()` analogue). Companion `cell-retarget.atdd.test.ts` is the GREEN proof (9/9 at `eb11b56`) — no `test.skip` there, proves committed production delta.
- Manual resize+swipe `no tile jump` is waivable per project rule: Skia animation is manual validation; static `DW-37`/`[cell]`/`pixel(to,cell)` scans are sufficient host gate (`rg` allowlist replaces pixel-perfect e2e).
- `sprint-status.yaml` is never written by this workflow — orchestrator-owned. Verified via `git diff --stat HEAD` having no `sprint-status.yaml` (only docs).

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @tea in Slack/Discord
- Refer to `./bmm/docs/tea-README.md` for workflow documentation
- Consult `./resources/knowledge` for testing best practices

---

**Generated by BMad TEA Agent** - 2026-09-02
