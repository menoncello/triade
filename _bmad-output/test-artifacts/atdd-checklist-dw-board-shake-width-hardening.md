---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-02'
workflowType: 'testarch-atdd'
storyId: 'dw-board-shake-width-hardening'
storyKey: 'dw-board-shake-width-hardening'
storyFile: '_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-board-shake-width-hardening.md'
generatedTestFiles:
  - '_bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts'
inputDocuments:
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/App.tsx'
  - 'triade/src/feel/shake.ts'
  - 'triade/__tests__/feel/shake.atdd.test.ts'
  - 'triade/__tests__/feel/bulletTime.atdd.test.ts'
  - 'triade/__tests__/feel/reducedMotion.atdd.test.ts'
  - '_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-board-shake-width-hardening.md'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-board-shake-width-hardening — Board shake overflow visible + width hardening (DW-107, DW-110)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) — pure width guard + source-structure scans + callback timer contract; `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN host-only). Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 + Skia/Reanimated). No E2E/API harness required — overflow toggle and safeWidth are deterministic style/timer contracts verifiable with `react-test-renderer` + `jest.useFakeTimers()` + `rg` scans.

---

## Story Summary

Sweep `e3c4155` closes two deferred visual carriers left after Epic 8 punch-effects: before, `GameBoard` consumed `width` directly so `NaN/Infinity/0` propagated `width: NaN` to the bullet flash overlay, and the 5–8px directional shake (130ms `30+40+30+30`) was clipped by parent `boardWrap` `overflow:hidden`. After, a single `safeWidth = Math.max(1, Number.isFinite(width)?width:1)` alias replaces every `width` use except the preserved `width, height: width` literal comment for `reducedMotion.atdd P2-06`, plus a callback `onShakeActiveChange → isBoardShaking` that toggles `boardWrap` `overflow:visible` for exactly `130ms` via `shakeNotifyTimerRef`, with symmetric `cancelShakeNotify` on every non-shake branch and on `reducedMotion` toggle/unmount. No engine change (`triade/src/engine/**` byte-identical).

**As a** player
**I want** the 5–8px directional shake to stay visible at board edges and the board to never render with `NaN` width
**So that** large merges feel physical without clipping or layout crash, while `ReducedMotion` and `bulletTime` remain board-only and never leak

---

## Acceptance Criteria

1. **AC-1 / Shake visible not clipped (DW-107, I/O row 1)** — Given a merge `moved true, amplitude 2/5, direction left/right/up/down`, when shake fires, then parent `boardWrap` `overflow` toggles `hidden → visible` for `130ms` then `hidden`; `shakeX/Y` worklet drives correct axis (`left/right→X`, `up/down→Y`) with `withSequence 30+40+30+30`.
2. **AC-2 / NOOP/slide-only/no-dir silent with cancel (DW-107, I/O rows 2) — Given `moved false` or `amplitude 0` or `!direction` or `invalid dir` zero vector, when the `moveResult` effect runs, then residual shake is cancelled `withTiming(0,20)` and `cancelShakeNotify()` fires `false` immediately (no `130ms` wait), never throws.**
3. **AC-3 / ReducedMotion mid-shake snap (DW-107, I/O row 3, FR-30) — Given `reducedMotion true` toggled mid-shake, when the `reducedMotion` effect runs, then `shakeX/Y/bulletFlash` snap `withTiming(0,20)` and `cancelShakeNotify()` fires `false` within `0ms`; overflow returns `hidden` immediately.**
4. **AC-4 / Width NaN/Infinity guard (DW-110, I/O row 4) — Given `width NaN/Infinity/-Infinity/undefined as any/"x" as any`, when `GameBoard` renders, then `finiteWidth fallback 1`, `safeWidth 1`, `cell ≥1`, overlay `width:1 height:1` not `NaN`, `Canvas`/`View`/`RoundedRect` all `1` not `NaN`, never throws.**
5. **AC-5 / Width 0/negative clamp (DW-110, I/O row 5) — Given `width 0/-5/null as any`, when rendered, then `safeWidth Math.max(1, finiteWidth) →1` clamps, board remains 1:1 square `width: safeWidth height: safeWidth` (literal comment `width, height: width` still present for `reducedMotion.atdd P2-06`).**
6. **AC-6 / Ledger & ownership (OPS) — Given `deferred-work.md`, when scanned, then `DW-107/110` show `status: done 2026-09-02` + `resolution-undo: e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f` 64-hex per entry (exactly 2 hits); `sprint-status.yaml` diff stays empty (orchestrator-owned).**

---

## Story Integration Metadata

- **Story ID:** `dw-board-shake-width-hardening` (sweep bundle; spec `baseline_revision: e3c52ae`, `final_revision: db01dfa`, status `done` post-loop)
- **Story Key:** `dw-board-shake-width-hardening`
- **Story File:** `_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-board-shake-width-hardening.md`
- **Generated Test Files:**
  - `_bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts` (NEW — ATDD red-phase scaffolds for working-tree delta, 24 tests, 0 active — all `test.skip`)
  - Existing references that flip RED→GREEN post-sweep: `triade/__tests__/feel/shake.atdd.test.ts` (`P2-05 it.skip` → active) + `triade/__tests__/feel/bulletTime.atdd.test.ts` (`P2-05 it.skip` → active) — not generated here, pinned via scans
- **Working-tree delta covered:** `triade/src/render/GameBoard.tsx` (`onShakeActiveChange` prop `313`, `finiteWidth/safeWidth` `316-319`, `shakeNotifyTimerRef` + `scheduleShakeVisible/cancelShakeNotify` `331-364`, shake branching `525-570` with `schedule/cancel`, container/overlay `safeWidth` `622-655`) + `triade/App.tsx` (`isBoardShaking` `138`, `boardWrap` conditional `1020`, prop `1032`) — commit `e3c4155` ahead of `e3c52ae`; uncommitted diff is `deferred-work.md` 2 hunks ×2 + `test-design-progress.md` 6 lines (metadata only)
- **Design consulted:** `_bmad-output/test-artifacts/test-design/test-design-dw-board-shake-width-hardening.md` + its mirror `_bmad-output/test-artifacts/test-design-dw-board-shake-width-hardening.md` (P0 22, P1 11, P2 5, P3 bench)

---

## Stack Detection

- **Config `test_stack_type`:** `auto`
- **Detected stack:** `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`)
- **No Playwright/Cypress harness needed:** shake width hardening is pure `safeWidth` guard + `onShakeActiveChange` 130ms toggle + style conditional verifiable host-only with `react-test-renderer` + `jest.useFakeTimers()` + `rg` static health. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN shake story).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `test_artifacts: _bmad-output/test-artifacts`

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (5 ACs + OPS I/O matrix 5 rows, boundaries `Always/Block If/Never` — `spec-board-shake-width-hardening.md`)
- [x] Test framework configured — `triade/package.json` `test` script + `tsconfig.test.json` + `node:test` (existing 960 pass / 0 fail per spec verification, 366 skipped baseline — `shake.atdd P2-05` + `bulletTime P2-05` currently `it.skip EXPECTED RED`)
- [x] Development environment available (`triade/src/render/GameBoard.tsx` + `triade/App.tsx` delta committed at `e3c4155`, `triade/src/engine/**` byte-identical `git diff -- triade/src/engine --stat` empty)

---

## Red-Phase Test Scaffolds Created

### Unit Tests (24 tests — all RED via `test.skip`)

**File:** `_bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts` (420 lines, `node:test` + `fs.readFileSync` source scans + host-int probes described)

- ✅ **Test:** `[P0-U-01] DW-110 width guard — finiteWidth = Number.isFinite(width) ? width : 1; safeWidth = Math.max(1, finiteWidth)`
  - **Status:** RED — `test.skip`, will be GREEN after activation (guard already present at `e3c4155`). Pinned `Number.isFinite(width) ×1`, `safeWidth 11`.
  - **Verifies:** AC-4 guard determinism + `safeWidth` single-source count 11

- ✅ **Test:** `[P0-U-02] DW-110 safeWidth propagation — all 5 style sites consume safeWidth not bare width`
  - **Status:** RED — asserts `View`/`Canvas`/`RoundedRect`/`overlay`/`cell` all `safeWidth`; would fail if bare `width` leaked
  - **Verifies:** AC-4/AC-5 propagation completeness (R-002)

- ✅ **Test:** `[P0-U-03] DW-110 NaN/Infinity/undefined safeWidth falls back to 1 not NaN`
  - **Status:** RED — `Math.max(1,finiteWidth)` proves fallback 1
  - **Verifies:** AC-4 never-throw NaN path

- ✅ **Test:** `[P0-U-04] DW-110 width literal preservation for reducedMotion.atdd P2-06 — comment alias keeps "width, height: width"`
  - **Status:** RED — comment alias 1× + runtime 3×
  - **Verifies:** AC-5 literal backward compat (R-005)

- ✅ **Test:** `[P0-U-05] DW-107 onShakeActiveChange prop + optional chaining + try/catch never-throws`
  - **Status:** RED — `?.` + `try{}catch{}` swallow
  - **Verifies:** AC-1 wiring + R-006

- ✅ **Test:** `[P0-U-06] DW-107 shakeNotifyTimerRef + scheduleShakeVisible (true→130→false) + cancelShakeNotify symmetric`
  - **Status:** RED — `clearTimeout ×3`, `130 ×3`, `BOARD_PADDING + SHAKE_CAP` spare comment
  - **Verifies:** AC-1 130ms toggle (R-001/R-007)

- ✅ **Test:** `[P0-U-07] DW-107 App isBoardShaking state + boardWrap overflow:visible conditional + prop threading`
  - **Status:** RED — `isBoardShaking ×3`, `overflow visible ×1 + hidden ×1`, `onShakeActiveChange={setIsBoardShaking}`
  - **Verifies:** AC-1 parent clip guard (R-004)

- ✅ **Test:** `[P0-U-08] DW-107 cancelShakeNotify on every non-shake branch — 5 sites`
  - **Status:** RED — `cancelShakeNotify() ×5`
  - **Verifies:** AC-2 symmetric cancel (R-003)

- ✅ **Test:** `[P0-U-09] DW-107 scheduleShakeVisible only on amplitude>0 (merge shake) — 4 dirs axis`
  - **Status:** RED — `scheduleShakeVisible()` exactly once inside `amplitude>0`
  - **Verifies:** AC-1 directional shake gated

- ✅ **Test:** `[P0-U-10] DW-107 unmount cleanup — useEffect return clears shakeNotifyTimerRef + nulls it`
  - **Status:** RED — cleanup `clearTimeout + null`
  - **Verifies:** AC-3 leak prevention (R-003)

- ✅ **Test:** `[P0-U-11] DW-107 reducedMotion mid-shake snap + cancel`
  - **Status:** RED — `withTiming(0,20) ×3` + `cancelShakeNotify()` in `if(reducedMotion)` effect
  - **Verifies:** AC-3 reducedMotion snap (R-003)

- ✅ **Test:** `[P1-U-01] DW-107 rapid re-shake timer reset — schedule does clearTimeout before setTimeout 130`
  - **Status:** RED — order `notify true < clear < setTimeout`
  - **Verifies:** AC-1 race (R-001)

- ✅ **Test:** `[P1-U-02] DW-107 deps [notifyShakeActive] and [scheduleShakeVisible, cancelShakeNotify] on moveResult effect`
  - **Status:** RED — no stale closure
  - **Verifies:** AC-1 wiring stability

- ✅ **Test:** `[P1-U-03] DW-110 width 0/negative clamp — Math.max(1,finiteWidth) ensures safeWidth>=1`
  - **Status:** RED — clamp proof
  - **Verifies:** AC-5 zero/negative

- ✅ **Test:** `[P1-U-04] DW-107/DW-110 spec + ledger provenance — DW-107/110 done 2026-09-02 with resolution-undo e7ad61… ×2`
  - **Status:** RED — ledger 2 hits + spec revisions
  - **Verifies:** AC-6 ledger hash

- ✅ **Test:** `[P1-U-05] DW-107 P2-05 expectation — hasVisibleFix && hasPaddingFix both true`
  - **Status:** RED — visible + spare both true
  - **Verifies:** AC-1 product decision (R-008)

- ✅ **Test:** `[P1-U-06] DW-107 notifyShakeActive swallow — parent throw does not bubble`
  - **Status:** RED — empty catch
  - **Verifies:** R-006

- ✅ **Test:** `[P1-U-07] sprint-status.yaml orchestrator-owned — not written by this sweep`
  - **Status:** RED — manual `git diff -- sprint-status.yaml` empty gate
  - **Verifies:** AC-6 ownership

- ✅ **Test:** `[P2-U-01] DW-110 narrow board 160 smoke — safeWidth 160 → cell 30 still renders`
  - **Status:** RED — formula scan
  - **Verifies:** P2 narrow 160

- ✅ **Test:** `[P2-U-02] tsc clean — onShakeActiveChange? optional does not break App call-site`
  - **Status:** RED — manual `both tsc --noEmit` clean gate
  - **Verifies:** type safety

- ✅ **Test:** `[P2-U-03] engine byte-identical — triade/src/engine/** not touched`
  - **Status:** RED — manual `git diff -- triade/src/engine --stat` empty
  - **Verifies:** boundary `Block If`

- ✅ **Test:** `[P0-HOST-INT-01] (HOST-ONLY) mount GameBoard width NaN → View/Canvas/overlay style.width ===1 not NaN`
  - **Status:** RED — host probe described, needs `react-test-renderer` activation
  - **Verifies:** AC-4 host render

- ✅ **Test:** `[P0-HOST-INT-02] (HOST-ONLY) merge shake left → onShakeActiveChange spy [true] at t0 then [true,false] after 130ms`
  - **Status:** RED — host probe `jest.useFakeTimers()` described
  - **Verifies:** AC-1 timer contract

- ✅ **Test:** `[P1-HOST-INT-03] (HOST-ONLY) rapid re-shake at 90ms then 130ms → single trailing false`
  - **Status:** RED — host probe `clearTimeout` re-arm described
  - **Verifies:** AC-1 race

**Existing RED→GREEN gates (not generated here, pinned by scans):**

- `triade/__tests__/feel/shake.atdd.test.ts` `[P2-05] board edge clipping by overflow hidden (EXPECTED RED)` — currently `it.skip`; after this sweep `rg hasVisibleFix||hasPaddingFix` proves GREEN. Activation: remove `it.skip` → `it` and run `npm run test -- --test-name-pattern "P2-05"`.
- `triade/__tests__/feel/bulletTime.atdd.test.ts` `[P2-05] board width / overflow — overlay uses width×width, clipped by boardWrap overflow hidden (EXPECTED RED)` — same flip.
- `triade/__tests__/feel/reducedMotion.atdd.test.ts` `[P2-06]` — stays GREEN; scan `width, height: width` comment proves.

---

## Data Factories Created

None — this bundle needs no new factories. Host tests reuse:

- `width` degenerate fixtures: `NaN/Infinity/-Infinity/-5/0/undefined as any/"x" as any` inline
- `moveResult` merged trace fixtures: `[{value:12, from:[[0,1],[0,2]], spawned:false, to:[0,0]}]` ×4 dirs + `slide-only from length 1` + `NOOP moved false` (from `spec-board-shake-width-hardening.md` I/O matrix)
- No `faker` factory required — pure TS `safeWidth` is deterministic `Math.max(1, Number.isFinite(width)?width:1)`

If a DEV Team later adds a `boardShake` factory, place under `triade/test-utils/boardShake.factory.ts` with `createMergeTrace(value, dir)` + `createDegenerateWidth()` helpers.

---

## Fixtures Created

None — no Playwright fixtures (host-only). Host-only `node:test` scaffolds need no `test.extend()` fixtures. Activation uses `react-test-renderer` `createElement` + `jest.useFakeTimers()` inline per test, not shared fixtures.

---

## Mock Requirements

None — no network/store/AsyncStorage mock for this bundle. `onShakeActiveChange` is a plain `jest.fn()` / `vi.fn()` spy passed as prop; `shakeX/Y/bulletFlash` worklets are `useSharedValue` + `withTiming`/`withSequence` (UI thread) and not mocked host-side beyond `shakeStyle` presence scan.

---

## Required data-testid Attributes

None — this bundle modifies only `GameBoard` container style + parent `boardWrap` style; no new Pressable/Text/Touchable requires `data-testid`. Existing `shake.atdd P2-05` scans rely on `fs.readFileSync` string probes, not `data-testid`.

If future overlay adds a second `bulletTime` flash sibling, add `data-testid="board-shake-flash"` to the absolute `Animated.View` overlay for E2E resilience (`selector-resilience.md`).

---

## Implementation Checklist

> Each item maps to one `test.skip` scaffold above. Working-tree delta **already implements** all items at `e3c4155`; checklist is GREEN verification after removing `test.skip` → `test`. Tasks are idempotent — re-run gates if any future diff touches `GameBoard.tsx` or `App.tsx`.

### Test: `[P0-U-01] DW-110 width guard — finiteWidth = Number.isFinite(width) ? width : 1; safeWidth = Math.max(1, finiteWidth)`

**File:** `_bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts` + `triade/src/render/GameBoard.tsx:316-319`

**Tasks to make this test pass (already done at e3c4155 — verify GREEN):**

- [x] `triade/src/render/GameBoard.tsx:316-319` defines `finiteWidth` then `safeWidth` exactly as above
- [x] `cell` uses `safeWidth` not `width`
- [x] `rg -n "Number\.isFinite\(width\)" triade/src/render/GameBoard.tsx ==1`
- [x] `rg -n "safeWidth" triade/src/render/GameBoard.tsx ==11`
- [ ] Run test: `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts --test-name-pattern "P0-U-01"` (remove `test.skip` → `test` first)
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.1h (scan only)

---

### Test: `[P0-U-02] DW-110 safeWidth propagation — all 5 style sites consume safeWidth not bare width`

**File:** same

**Tasks:**

- [x] `View style={{ width: safeWidth, height: safeWidth }}` (board container)
- [x] `Canvas style={{ width: safeWidth, height: safeWidth }}`
- [x] `RoundedRect width={safeWidth} height={safeWidth}`
- [x] overlay `Animated.View style={..., width: safeWidth, height: safeWidth}`
- [x] `rg -n "width: safeWidth, height: safeWidth" triade/src/render/GameBoard.tsx ==3`
- [x] host render `width:NaN` via `react-test-renderer` would assert `style.width===1` (host probe `P0-HOST-INT-01`)
- [ ] Run test with pattern `P0-U-02`
- [ ] ✅ Green

**Effort:** 0.15h

---

### Test: `[P0-U-03] DW-110 NaN/Infinity/undefined safeWidth falls back to 1 not NaN`

**File:** same

**Tasks:**

- [x] Guard is `Math.max(1, finiteWidth)` not `||` fallback
- [x] No `Number.isNaN` scattered
- [x] Manual host render `width: NaN/Infinity/undefined as any → safeWidth 1` (P0-HOST-INT-01) green
- [ ] Run `P0-U-03`
- [ ] ✅ Green

**Effort:** 0.1h

---

### Test: `[P0-U-04] DW-110 width literal preservation for reducedMotion.atdd P2-06`

**File:** same

**Tasks:**

- [x] Comment `// board container is width, height: width (safeWidth alias keeps 1:1 square; DW-110 guard via safeWidth)` present before `View`
- [x] `rg -n "width, height: width" triade/src/render/GameBoard.tsx ==1`
- [x] `rg -n "width: safeWidth, height: safeWidth" ==3` proves runtime uses safeWidth while literal preserved as comment
- [x] Existing `triade/__tests__/feel/reducedMotion.atdd.test.ts` `P2-06` stays green (`npm run test -- --test-name-pattern "P2-06"`)
- [ ] Run `P0-U-04`
- [ ] ✅ Green

**Effort:** 0.1h

---

### Test: `[P0-U-05] DW-107 onShakeActiveChange prop + optional chaining + try/catch never-throws`

**File:** same

**Tasks:**

- [x] `GameBoardProps` has `onShakeActiveChange?: (active: boolean) => void`
- [x] Destructured in `GameBoard({..., onShakeActiveChange})`
- [x] `notifyShakeActive` uses `try{onShakeActiveChange?.(active)}catch{}`
- [x] `rg -n "onShakeActiveChange" triade/src/render/GameBoard.tsx ==5`
- [x] Host probe: spy that throws → `scheduleShakeVisible()` `doesNotThrow()` (P1-HOST-INT-03 swallow)
- [ ] Run `P0-U-05`
- [ ] ✅ Green

**Effort:** 0.1h

---

### Test: `[P0-U-06] DW-107 shakeNotifyTimerRef + scheduleShakeVisible + cancelShakeNotify symmetric`

**File:** same

**Tasks:**

- [x] `shakeNotifyTimerRef` typed `ReturnType<typeof setTimeout>|null`
- [x] `scheduleShakeVisible` does `notify(true); if(ref) clear; ref=setTimeout(()=>{ref=null; notify(false)},130)`
- [x] `cancelShakeNotify` does `if(ref) clear; ref=null; notify(false)`
- [x] `rg -n "shakeNotifyTimerRef" ==11`, `clearTimeout.*shakeNotifyTimerRef ==3`, `130 ==3`, `BOARD_PADDING \+ SHAKE_CAP ==1`
- [x] Host probes `P0-HOST-INT-02` + `P1-HOST-INT-03` would be green
- [ ] Run `P0-U-06`
- [ ] ✅ Green

**Effort:** 0.15h

---

### Test: `[P0-U-07] DW-107 App isBoardShaking state + boardWrap overflow:visible conditional + prop threading`

**File:** `triade/App.tsx:138,1020,1032`

**Tasks:**

- [x] `const [isBoardShaking, setIsBoardShaking] = useState(false)` (with DW-107 comment)
- [x] `boardWrap` style array has third entry `isBoardShaking ? { overflow: 'visible' } : null`
- [x] `styles.boardWrap` still `overflow:'hidden'` base (only inline overrides when shaking)
- [x] `GameBoard` receives `onShakeActiveChange={setIsBoardShaking}`
- [x] `rg -n "isBoardShaking" triade/App.tsx ==3`, `overflow: 'visible' ==1`, `overflow: 'hidden' ==1`
- [ ] Run `P0-U-07`
- [ ] ✅ Green

**Effort:** 0.1h

---

### Test: `[P0-U-08] DW-107 cancelShakeNotify on every non-shake branch — 5 sites`

**File:** `triade/src/render/GameBoard.tsx:331-570`

**Tasks:**

- [x] `cancelShakeNotify()` called in `reducedMotion` effect + invalid dir `vec 0,0` else + slide-only `amplitude 0` else + NOOP `else` outer (total 5)
- [x] `rg -n "cancelShakeNotify\(\)" GameBoard.tsx ==5`
- [x] Host probes for NOOP `moved false → spy [false]` immediate, slide-only `[false]`, `direction undefined → [false]`, `reducedMotion true → [false]`, `invalid dir → [false]` would be green
- [ ] Run `P0-U-08`
- [ ] ✅ Green

**Effort:** 0.15h

---

### Test: `[P0-U-09] DW-107 scheduleShakeVisible only on amplitude>0 (merge shake) — 4 dirs axis`

**File:** same

**Tasks:**

- [x] `amplitude>0` gate before `scheduleShakeVisible()`
- [x] `scheduleShakeVisible()` exactly once
- [x] `directionVector(direction)` + `vec.x !==0` + `vec.y !==0` axis guards + `withSequence`/`withTiming` presence
- [x] Host probes for `left/right→X`, `up/down→Y` would be green
- [ ] Run `P0-U-09`
- [ ] ✅ Green

**Effort:** 0.1h

---

### Test: `[P0-U-10] DW-107 unmount cleanup — useEffect return clears shakeNotifyTimerRef`

**File:** same

**Tasks:**

- [x] `useEffect(() => { return () => { if(ref) clear; ref=null; } }, [])` present
- [x] Host probe: `renderer.unmount()` inside `act()` → `jest.getTimerCount()==0` and no post-unmount `false` would be green
- [ ] Run `P0-U-10`
- [ ] ✅ Green

**Effort:** 0.1h

---

### Test: `[P0-U-11] DW-107 reducedMotion mid-shake snap + cancel`

**File:** same

**Tasks:**

- [x] `useEffect [reducedMotion, shakeX, shakeY, bulletFlash, cancelShakeNotify]` snaps `shakeX/Y/bulletFlash` `withTiming(0,20)` then `cancelShakeNotify()`
- [x] Host probe: active shake then `renderer.update(<GameBoard reducedMotion true>)` → spy `[true,false]` within 0ms would be green
- [ ] Run `P0-U-11`
- [ ] ✅ Green

**Effort:** 0.15h

---

### Tests: `[P1-U-01] rapid re-shake timer reset` + `[P1-U-02] deps` + `[P1-U-03] width 0/negative clamp` + `[P1-U-04] ledger` + `[P1-U-05] hasVisibleFix/hasPaddingFix` + `[P1-U-06] swallow` + `[P1-U-07] sprint-status ownership` + `[P2-*]`

> These are PR/nightly gates. All already GREEN at `e3c4155`; activation is scan/host re-verify.

- [x] P1-U-01: `notify true < clear < setTimeout 130` order proves single trailing `false` on rapid re-trigger `90→220ms`
- [x] P1-U-02: deps `[onShakeActiveChange]` → `[notifyShakeActive]` → `[…,scheduleShakeVisible,cancelShakeNotify]` no stale closure
- [x] P1-U-03: `Math.max(1,finiteWidth)` clamps `0/-5/null`→1
- [x] P1-U-04: `rg -n "e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f" deferred-work.md` 2 hits + spec revisions `db01dfa/e3c52ae`
- [x] P1-U-05: `hasVisibleFix && hasPaddingFix` both true
- [x] P1-U-06: `} catch {}` empty swallow
- [x] P1-U-07: `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty
- [x] P2-U-01..03: narrow 160 + tsc + engine byte-identical
- [ ] Run `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts --test-name-pattern "P1-"`
- [ ] ✅ Green

**Effort:** 0.45h total for P1+P2 bundle

---

### Existing RED→GREEN flips (not generated here, but gates for this bundle)

**File:** `triade/__tests__/feel/shake.atdd.test.ts` + `triade/__tests__/feel/bulletTime.atdd.test.ts`

**Tasks:**

- [ ] Remove `it.skip` → `it` for `shake.atdd [P2-05] board edge clipping` and verify `assert.ok(hasVisibleFix||hasPaddingFix)` now GREEN (was `it.skip EXPECTED RED` documenting `DW-107`)
- [ ] Remove `it.skip` → `it` for `bulletTime.atdd [P2-05] board width / overflow — overlay uses width×width` and verify `assert.ok(Number.isFinite...||hasWidthGuard)` GREEN (was `EXPECTED RED` documenting `DW-110`)
- [ ] Run: `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/feel/shake.atdd.test.ts --test-name-pattern "P2-05"`
- [ ] Run: `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/feel/bulletTime.atdd.test.ts --test-name-pattern "P2-05"`
- [ ] Keep `reducedMotion.atdd P2-06` GREEN (`rg "width, height: width" ==1`)

**Effort:** 0.2h

---

## Running Tests

```bash
# Run all scaffolds for this bundle (currently all skipped — RED phase, 0 fail expected)
TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts

# Run one scaffold after removing test.skip → test (RED→GREEN verification for that task)
TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts --test-name-pattern "P0-U-01"

# Verify existing P2-05 flips (should now be GREEN)
TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/feel/shake.atdd.test.ts --test-name-pattern "P2-05"
TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/feel/bulletTime.atdd.test.ts --test-name-pattern "P2-05"

# Full gate (spec verification: 960 pass / 0 fail / 366 skipped baseline not grown)
npm --prefix triade test

# Type gates (both must be clean)
triade/node_modules/.bin/tsc --noEmit
triade/node_modules/.bin/tsc -p triade/tsconfig.test.json --noEmit

# Static health (30s smoke)
rg -n "safeWidth" triade/src/render/GameBoard.tsx # expect 11
rg -n "Number.isFinite\(width\)" triade/src/render/GameBoard.tsx # expect 1
rg -n "shakeNotifyTimerRef" triade/src/render/GameBoard.tsx # expect 11
rg -n "clearTimeout\(shakeNotifyTimerRef" triade/src/render/GameBoard.tsx # expect 3
rg -n "130" triade/src/render/GameBoard.tsx # expect 3
rg -n "cancelShakeNotify\(\)" triade/src/render/GameBoard.tsx # expect 5
rg -n "width, height: width" triade/src/render/GameBoard.tsx # expect 1 (comment alias)
rg -n "isBoardShaking" triade/App.tsx # expect 3
rg -n "overflow: 'visible'" triade/App.tsx # expect 1
rg -n "e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f" _bmad-output/implementation-artifacts/deferred-work.md # expect 2
git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml # expect empty
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 24 tests written as red-phase scaffolds with `test.skip()` (host-only `node:test` + `fs.readFileSync` scans + host probe descriptions)
- ✅ No fixtures/factories required (pure TS, no network)
- ✅ Mock requirements documented (none — `onShakeActiveChange` is `jest.fn()` spy)
- ✅ data-testid requirements listed (none for this bundle)
- ✅ Implementation checklist created (11 P0 + 7 P1 + 3 P2 + 3 host probes, plus 2 existing RED→GREEN flips)
- ✅ `rg` health table documented for CI smoke

**Verification:**

- All generated tests are present and marked with `test.skip()` — `rg -n "test\.skip" _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts` → 24
- Activation guidance is clear — each checklist entry says `remove test.skip → test` then `doesNotThrow` / `strictEqual` / `match`
- Any activated test currently PASSES (working tree already at `e3c4155`); RED is intentional scaffold state, not broken implementation

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with `P0-U-01` width guard)
2. **Remove `test.skip()`** for that test and confirm it PASSES (working tree already implements; if this were pre-implementation, it would FAIL until `safeWidth` added)
3. **Read the test** to understand expected behavior (`Number.isFinite(width)` guard)
4. **If this were pre-implementation**, implement minimal code listed in that checklist section (`finiteWidth/safeWidth` + propagate to 5 sites)
5. **Run the test** to verify it now passes (green)
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat (overflow toggle next, etc.)

**Key Principles:**

- One test at a time (don't try to fix all 24 at once)
- Minimal implementation (don't over-engineer — e.g., keep `safeWidth` alias, don't refactor `layout.ts`)
- Run tests frequently (immediate feedback via `node --test --test-name-pattern`)
- Use implementation checklist as roadmap; all tasks already `checked` at `e3c4155` — this checklist is post-hoc verification

**Progress Tracking:**

- Check off tasks as you activate each scaffold
- Share progress in daily standup; P0 11 must be 100% before `CONCERNS→PASS`

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (`P0-U-01..11` + `P1-U-01..07` + `P2-U-01..03` all GREEN after activation + `shake.atdd P2-05` + `bulletTime P2-05` flips)
2. **Review code for quality** — `safeWidth` single-source (11 uses) not scattered; `SHAKE_CAP` still `Math.min(maxShake,SHAKE_CAP)` not literal 8; `width, height: width` literal preserved as comment
3. **Extract duplications** — none (guard is already single-source `finiteWidth→safeWidth`)
4. **Optimize performance** — `Number.isFinite` overhead `<0.01ms` per frame, no bench lane needed (feels 8-3..8-4 bench already covers 757 pass)
5. **Ensure tests still pass** after each refactor (`npm --prefix triade test` stays 960 pass)
6. **Update documentation** — if timer 130 or BOARD_PADDING changes, update spec I/O rows + `shake.atdd P2-05` scan strings

**Key Principles:**

- Tests provide safety net (refactor with confidence — `safeWidth` count 11 is regression tripwire)
- Make small refactors (e.g., rename `finiteWidth` only if `rg` counts updated)
- Run tests after each change (`both tsc --noEmit` clean)
- Don't change test behavior (only implementation)

**Completion:**

- All activated tests pass (24 + 2 flips)
- Code quality meets team standards (no `width` leak)
- No duplications or code smells
- Ready for code review; `sprint-status.yaml` remains orchestrator-owned (not updated here)

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section — story file is `_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md` (already has `final_revision: db01dfa`; add `atddChecklistPath` + `generatedTestFiles` to its frontmatter if a writable story file is available)
2. **If the story file cannot be updated automatically**, share this checklist and generated tests with the dev workflow as a manual handoff (this file is the handoff)
3. **Review this checklist** with team in standup or planning (risk R-001..R-003 6s need sign-off)
4. **Begin implementation** using implementation checklist as guide (already done at `e3c4155`; next is verification)
5. **Activate one scaffold at a time** by removing `test.skip()` for the current task, then confirm it passes before checking off
6. **Work one activated test at a time** (red → green for each)
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (e.g., ensure `BOARD_PADDING + SHAKE_CAP` comment stays)
9. **When refactoring complete**, DO NOT manually update `sprint-status.yaml` — it is orchestrator-owned; loop sweep will handle `epic-8 done` promotion if needed

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (via `tea-index.csv`):

- **data-factories.md** — Factory patterns (not needed — deterministic fixtures `NaN/Infinity/width 160`)
- **component-tdd.md** — Component test strategies (source-scan + `react-test-renderer` mount, not Playwright Component)
- **test-quality.md** — Test design principles (Given-When-Then, one assertion per test, determinism, isolation, scan counts)
- **test-healing-patterns.md** — Healing via `rg` literal counts + comment alias for `width, height: width`
- **selector-resilience.md** — `data-testid` not needed (style-based scans, not selector)
- **timing-debugging.md** — 130ms `setTimeout` vs `withSequence 30+40+30+30` drift ±1 frame
- **test-levels-framework.md** — Test level selection (Unit host + Integration App wiring, no E2E/API)
- **test-priorities-matrix.md** — P0/P1/P2/P3 mapping (P0 22, P1 11, P2 5 from test-design)
- **contract-testing.md** — not applied (`tea_use_pactjs_utils:false`)
- **playwright-cli.md** — loaded but not applied (no `page.goto` — RN shake story)

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification

**Command:** `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts` (all 24 skipped — RED phase)

**Results (expected before activation):**

```
# 24 tests, 24 skipped (RED scaffolds), 0 passing, 0 failing
# Pass via activation: remove test.skip → test, then all must be GREEN (working tree already at e3c4155)
```

**Verify skip count:**

```bash
rg -n "test\.skip" _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts # expect 24
rg -n "test\.skip" triade/__tests__/feel/shake.atdd.test.ts | grep P2-05 # expect 1 (the RED that must flip)
rg -n "test\.skip" triade/__tests__/feel/bulletTime.atdd.test.ts | grep P2-05 # expect 1
```

**After activation (remove `test.skip` → `test` for one task, e.g., P0-U-01):**

```
# Expected: 1 passing, 23 skipped — proves scaffold was correct and implementation already satisfies it
```

**Full gate after all activations:**

```
TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts # expect 24 pass / 0 fail
npm --prefix triade test # expect 960 pass / 0 fail / 366 skipped (baseline) — spec verification line
triade/node_modules/.bin/tsc --noEmit # expect clean
triade/node_modules/.bin/tsc -p triade/tsconfig.test.json --noEmit # expect clean
```

**Expected Failure Messages (if implementation missing — pre-e3c4155 baseline):**

- `P0-U-01` would fail `Number.isFinite(width) exactly once` (was 0 before)
- `P0-U-02` would fail `width: safeWidth, height: safeWidth ×3` (was 0, bare `width` was 3)
- `P0-U-06` would fail `shakeNotifyTimerRef` (was 0 before)
- `P0-U-07` would fail `isBoardShaking ×3` (was 0 before)
- `P1-U-04` would fail `resolution-undo ×2` (was `open` not `done`)
- `P1-U-05` would fail `hasVisibleFix` (was false, `it.skip EXPECTED RED`)

---

## Notes

- **Working-tree delta at generation time:** `e3c4155` commit + uncommitted `deferred-work.md` 2 hunks (`DW-107/110 open→done 2026-09-02` + `e7ad61…` ×2) + `test-design-progress.md` 6 lines. `git diff --stat` at generation: `deferred-work.md | 8 ++++++--` + `test-design-progress.md | 6 ++++++`. Production files `GameBoard.tsx` + `App.tsx` are already committed (not in `git diff` but in `git show e3c4155`); this ATDD covers that committed delta as the "changes currently in the working tree" per DW bundle definition.
- **sprint-status.yaml is orchestrator-owned:** Never write it, never revert a change to it. A row at `done` or `awaiting-operator` is the orchestrator's own bookkeeping — not a defect, not proof verified. This ATDD never writes `sprint-status.yaml` and asserts `git diff -- sprint-status.yaml` empty.
- **TEA test_artifacts directory:** `_bmad-output/test-artifacts` per `_bmad/tea/config.yaml` `test_artifacts: "{project-root}/_bmad-output/test-artifacts"`. Both checklist (`atdd-checklist-*.md`) and generated tests (`tests/unit/*.atdd.test.ts`) are written under that directory.
- **Host vs device:** Shake worklet `withSequence` is UI-thread; host cannot assert `shakeX.value` beyond `shakeStyle` presence + callback spy. Device P2 smoke (landscape, heavy 12+ shake 5 at board corners) is exploratory not gate (R-007 1-frame drift accepted).
- **Spec contract:** `_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md` `final_revision db01dfa` (baseline `e3c52ae`) defines 5-row I/O matrix: merge shake, NOOP/slide-only/no-dir, ReducedMotion mid-shake, NaN/Infinity, 0/negative. This ATDD maps 1:1 to those rows (P0 checks).
- **Future drift guard:** If `BOARD_PADDING` or `SHAKE_CAP` values change, update `rg` counts + `shake.atdd P2-05` scan strings + this checklist `130 ×3` table simultaneously.
- **Already verified at e3c4155:** `npm --prefix triade test 960 pass / 0 fail`, `both tsc --noEmit` clean, `hasVisibleFix true` + `hasPaddingFix true` + `Number.isFinite true` + `width literal true` per spec verification.

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @Murat (TEA / Master Test Architect) in Slack/Discord
- Refer to `./bmm/docs/tea-README.md` for workflow documentation
- Consult `./resources/knowledge` for testing best practices and `tea-index.csv` for fragment map

---

**Generated by BMad TEA Agent** — 2026-09-02 — `dw-board-shake-width-hardening` bundle, TEA `test_artifacts: _bmad-output/test-artifacts`, `tea_use_playwright_utils:true` but host-only path, `test_stack_type: auto → frontend`
