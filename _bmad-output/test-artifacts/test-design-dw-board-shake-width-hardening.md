---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/App.tsx'
  - 'triade/src/feel/shake.ts'
  - 'triade/src/feel/bulletTime.ts'
  - 'triade/__tests__/feel/shake.atdd.test.ts'
  - 'triade/__tests__/feel/bulletTime.atdd.test.ts'
  - 'triade/__tests__/feel/reducedMotion.atdd.test.ts'
  - '_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-board-shake-width-hardening — Board shake overflow visible + width hardening (DW-107, DW-110)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-board-shake-width-hardening`
**Scope:** Targeted test design for the working-tree delta of `dw-board-shake-width-hardening` (DW-107, DW-110)

> **Delta under assessment:** Commit `e3c4155 sweep dw-board-shake-width-hardening: DW-107, DW-110` vs baseline `e3c52ae` — 2 production files `+150 / -10` plus ledger/spec:
> - `triade/src/render/GameBoard.tsx:313` — NEW `onShakeActiveChange?: (active: boolean) => void` prop; `316-319` `finiteWidth = Number.isFinite(width) ? width : 1; safeWidth = Math.max(1, finiteWidth); cell = … safeWidth …` replacing direct `width` (DW-110).
> - `triade/src/render/GameBoard.tsx:331-364` — NEW `shakeNotifyTimerRef: Ref<Timeout|null>`, `notifyShakeActive(active)` guarded `try{onShakeActiveChange?.(active)}`, `useEffect` cleanup on unmount, `scheduleShakeVisible()` sets `true` then `setTimeout 130ms → false`, `cancelShakeNotify()` clears + `false`; called from shake branches and `reducedMotion` effect (DW-107).
> - `triade/src/render/GameBoard.tsx:525-572` — shake branching now `scheduleShakeVisible()` on `amplitude>0`, `cancelShakeNotify()` on invalid dir / slide-only / NOOP / `!moved` / `reducedMotion` paths; deps `[…, scheduleShakeVisible, cancelShakeNotify]` (DW-107).
> - `triade/src/render/GameBoard.tsx:622-661` — container `View {width: safeWidth, height: safeWidth}`, `Canvas {width: safeWidth, height: safeWidth}`, `RoundedRect width/height safeWidth`, overlay `Animated.View {width: safeWidth, height: safeWidth}` with comment `DW-110 guard` (DW-110).
> - `triade/App.tsx:138` — NEW `const [isBoardShaking, setIsBoardShaking] = useState(false)` (DW-107).
> - `triade/App.tsx:1020` — `boardWrap` style `[styles.boardWrap, {width: boardSize, height: boardSize}, isBoardShaking ? {overflow: 'visible'} : null]` replacing bare `boardWrap` (DW-107); `1032` `onShakeActiveChange={setIsBoardShaking}` threaded (DW-107).
> - `_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md:1-67` — NEW spec — intent contract (board-only 5-8px shake not clipped; NaN width never propagates), boundaries (`Always: board-only, 130ms 30+40+30+30 cap 8, ReducedMotion cancels, Math.max(1,finiteWidth)` / `Block If: engine/feel change` / `Never: deferred-work ledger`), 5-row I/O matrix (merge shake, NOOP/slide-only, ReducedMotion mid-shake, NaN/Infinity, 0/negative), code map (`GameBoard.tsx:316-319`, `331-369`, `525-570`, `App.tsx:137,1020`), tasks 4 checkboxes, verification (`960 pass`, `tsc clean`, `hasVisibleFix`, `hasPaddingFix`, `Number.isFinite`, `width literal`).
> - `_bmad-output/implementation-artifacts/deferred-work.md:932,960` — 2 ledger entries flipped `open → done 2026-09-02` (`DW-107 clipped shake`, `DW-110 NaN width`) with `resolution: resolved by sweep bundle dw-board-shake-width-hardening` + `resolution-undo: e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f` 64-hex per entry (2 hunks, 4 inserted lines total in `git diff HEAD -- deferred-work.md`); grouped opposite `decision: Set overflow visible / Validate width finite`.
> - `sprint-status.yaml` is **orchestrator-owned** and intentionally not in scope — no write, no revert (`git diff HEAD -- sprint-status.yaml` must stay empty).

---

## Executive Summary

**Scope:** Close two low-severity visual carriers left deferred after Epic 8 punch-effects (8-3 screen shake, 8-4 bullet time). Before the sweep, `GameBoard` consumed `width` directly (`Math.max((width - …)/GRID,1)`) and `width, height: width` in every `View/Canvas/overlay` style, so a `NaN/Infinity/0` `boardSize` (rotation edge, gesture race, injected `as any` test) propagated `NaN` to the absolute bullet flash overlay and produced a `width: NaN` layout error; and the 5-8px directional shake (`8` capped, `130ms 30+40+30+30` on the active axis) was rendered inside an `Animated.View` whose parent `boardWrap` in `App.tsx` is `overflow:hidden`, so the first and last frame clipped 5-8px at board edges (landscape especially). The sweep confines fixes to `GameBoard.tsx` + `App.tsx` `boardWrap`: a single `safeWidth = Math.max(1, Number.isFinite(width)?width:1)` alias replaces every `width` use except the preserved `width, height: width` literal comment alias for `reducedMotion.atdd P2-06`, plus a callback `onShakeActiveChange → isBoardShaking` that toggles `boardWrap` `overflow: visible` for exactly `130ms` via `shakeNotifyTimerRef`, with symmetric `cancelShakeNotify` on every non-shake branch and on `reducedMotion` toggle/unmount. No engine, `feel.ts` datum, `SHAKE_CAP`, `BULLET_TIME_MS`, `reducedPresetFor`, or `transitionPlan` predicate is touched; `triade/src/engine/**` stays byte-identical.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3 (shake timer + overflow toggle races under rapid `EARLY_INPUT_MS≈84ms` re-trigger; `safeWidth` incomplete propagation if a future overlay path reintroduces bare `width`; `reducedMotion` mid-shake cancel+unmount leak)
- Critical categories: TECH (timer + callback + overflow StyleSheet flatten; width guard + cell + canvas + overlay + ReducedMotion literal), BUS (FR-30 ReducedMotion gate — shake suppressed, overflow reset, flash still board-only), PERF (130ms align vs withSequence, overflow visible does not cause re-layout of chrome), DATA (NaN width guard `Number.isFinite` + `Math.max(1,…)`)
- Second-order deferred note that existed `P2-05` ATDDs (`shake.atdd P2-05` `overflow:visible || BOARD_PADDING+SHAKE_CAP` / `bulletTime.atdd P2-05` `Number.isFinite||Math.max`) were `it.skip EXPECTED RED` documenting `DW-107/DW-110` — post-sweep they must be `active + green` (`hasVisibleFix && hasWidthGuard`).

**Coverage Summary:**

- P0 scenarios: 7 groups (overflow `visible for 130ms then hidden` on merge shake ×4 dirs; `cancelShakeNotify` on NOOP/slide-only/no-dir/reducedMotion/invalid dir; width `NaN/Infinity/undefined/string` → `safeWidth 1` + `cell 1` + overlay `width:1 height:1` not `NaN`; `safeWidth` propagation to all 5 style sites + `cell`; callback threaded `App onShakeActiveChange={setIsBoardShaking}` + conditional `overflow:visible`; unmount clears timer; invalid dir zero vector → cancel)
- P1 scenarios: 6 groups (rapid re-shake timer reset `clearTimeout` then 130ms; `reducedMotion` toggle mid-shake snap `withTiming(0,20)` + cancel; `BOARD_PADDING+SHAKE_CAP 16` spare as compensating padding alternative documented; `width 0/ -5/ null as any` clamps to 1; `try/catch` on `notifyShakeActive` swallows callback throw; ledger `resolution-undo e7ad61…` 64-hex ×2 + `sprint-status.yaml` empty)
- P2/P3 scenarios: 5 groups (ledger hash provenance, Hud asymmetry probe, exploratory narrow board + landscape clip screenshot, `tsc` both configs + `width, height: width` literal still present per `reducedMotion.atdd P2-06`, `npm test 960 pass` full gate)
- **Total effort**: ~2.8–5.2 hours (~0.35–0.65 day; host-only `node:test` + `react-test-renderer` + `tsc --noEmit`, no device lane — pure `triade/src/render/GameBoard.tsx` + `triade/App.tsx` + `triade/src/feel/shake.ts` + `bulletTime.ts`, `node --import tsx --test -- triade/__tests__/feel/shake.atdd.test.ts triade/__tests__/feel/bulletTime.atdd.test.ts` + `npm test` full gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score/spawn/ceiling/tier/pot, `layout.ts` `layoutFor/boardSize` 0 floor, `Board`/`TransitionPlan`/`mulberry32`/`weights`/`potForTier`, `App.tsx` wiring beyond `isBoardShaking` + `boardWrap` overflow + `onShakeActiveChange`, `matchScore` record, `HIT_TARGET`/`SAFE_MARGIN` derivation, `Hud.tsx` band math** | No file in the delta modifies engine rules, weights, ceiling, pot, stats, or Hud layout. `git diff HEAD -- triade/src/engine` empty (0 hunks); `triade/src/feel/shake.ts` and `bulletTime.ts` byte-identical except consumers; `App.tsx` diff is exactly `+5` lines (`isBoardShaking` state + conditional style + prop). | Existing `npm test` full gate (`960 pass` per spec verification) stays invariant; `game.test.ts`/`line.test.ts`/`spawn.test.ts`/`ceiling.test.ts`/`engine.purity` not in delta — any regression would be caught by baseline. This plan only checks `rg -n "src/engine" triade/src/render/GameBoard.tsx ==0` (no engine import) + `rg -n "shakeNotifyTimerRef" GameBoard.tsx ==4` (definition+3 uses) + `git diff --stat triade/src/engine` empty. |
| **Changing shake datum `SHAKE_CAP 8`, `shakeMs 2/5`, `withSequence 30+40+30+30`, `BULLET_TIME_MS 200`, `FeelPreset` / `reducedPresetFor`, `directionVector` vectors, `maxShakeForTrace` predicate `from.length===2 && !spawned && Number.isFinite`** | Spec boundary `Block If: Need to change engine, feel presets, or add deps` — this sweep intentionally keeps feel data single-sourced and amplitude capped. `shake.ts` not modified; `GameBoard` delegates via `maxShakeForTrace` + `directionVector` + `Math.min(maxShake,SHAKE_CAP)`; `bulletTime.ts` not modified. | Pinned via `rg -n "SHAKE_CAP = 8" triade/src/feel/shake.ts ==1` + `rg -n "Math.min\(maxShake, SHAKE_CAP\)" GameBoard.tsx ==1` + `rg -n "BULLET_TIME_MS" GameBoard.tsx ==1` (`BULLET_TIME_MS - 60`) + `rg -n "directionVector\(direction\)" GameBoard.tsx ==1` + `rg -n "maxShakeForTrace\(moveResult\.trace"` ==1. Any literal 8 outside `shake.ts` is lint FAIL. |
| **Moving GameBoard to Reanimated/Skia mount changes, moving boardWrap overflow to stylesheet, adding `expo-haptics`/`reanimated` new deps, changing scrim/overlay `backgroundColor #fff7e0` or `borderRadius 14`, changing `boardSize` derivation (`useWindowDimensions` → `layoutFor`) or `insets` source** | Spec `Never: widen engine diff; break tsc or tests` — this sweep stays `react-native` `View` + `Animated.View` + `Canvas` imperative worklets only. No `layout.ts` change; `App.tsx` `boardSize` still `useWindowDimensions` scale. | Pinned via `rg -n "reanimated|useWindowDimensions" triade/src/render/GameBoard.tsx` only has existing `useSharedValue/withTiming/withSequence` + `onShakeActiveChange` new; `rg -n "boardSize" triade/App.tsx` shows only `width: boardSize` conditional added. No `layout.ts` import in GameBoard diff. |
| **Persisting `isBoardShaking` to store / wiring to `AccessibilityInfo`, changing `insets` source (`SafeAreaProvider`/`useSafeAreaInsets`) or adding `initialMetrics`, adding new celebration/copy strings for overlay** | `isBoardShaking` stays local `useState(false)` in `AppContent`, not global store, not `ReducedMotion` store; `onShakeActiveChange` stays optional callback, not required prop; no `AsyncStorage` hit. | Pinned via `rg -n "isBoardShaking" triade/App.tsx ==3` (definition + conditional style + prop) and no `AsyncStorage`/`AccessibilityInfo` import in GameBoard; `rg -n "onShakeActiveChange" triade/src/render/GameBoard.tsx ==5` (`?.` + type + deps). |
| **Web / PWA parity, theming, VoiceOver `role="grid"` contract beyond existing `reducedMotion.atdd P2-06`, crash-free sessions, AdMob/RevenueCat/Billing, Epic 9-11 monetization, PreviewCard chrome beyond `flexShrink` row fix** | No a11y/bench/ads code touched beyond board-only flash already `board only never chrome` + `reducedMotion` suppress; reducedMotion still `Math.min(maxShake,SHAKE_CAP)` capped, not changed. | Existing suites + manual-validation domain remain; this plan only checks `rg -n "accessible|accessibilityRole" triade/src/render/GameBoard.tsx ==1` (hintHighlight) and CTA not in board (Hud-owned). |
| **Editing `sprint-status.yaml` or deferred-work beyond the 2 DW entries `DW-107/110` (`open → done 2026-09-02` with `resolution-undo: e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f`)** | `sprint-status.yaml` is orchestrator-owned (`never write it, and never revert` per prompt). `deferred-work.md` change is exactly 2 entries flipped `open → done 2026-09-02` with single 64-hex hash per entry (2 hunks, 4 added lines). | This plan never writes `sprint-status.yaml`; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in CI. Ledger verified via `rg -n "e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f" deferred-work.md` exactly 2 occurrences + `rg -n "resolution-undo" deferred-work.md` health. |
| **Hud `boardWrap` `overflow:hidden` change beyond conditional — removing base `overflow:hidden` from StyleSheet, or clamping Hud `insets.top + SAFE_MARGIN`** | `styles.boardWrap` still `overflow:'hidden'` base (only inline conditional overrides to `visible` when shaking); Hud `insets.top + SAFE_MARGIN` not clamped here (intentionally asymmetric: boardWrap toggled, Hud not — overlay flash already `position:absolute` board-only). | Pinned via `rg -n "overflow:\s*'hidden'" triade/App.tsx` base still exists in `styles.boardWrap`; `rg -n "overflow:\s*'visible'" triade/App.tsx ==1` conditional only. Any removal of base hidden is FAIL. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `GameBoard` is a function `(board, moveResult, width, reducedMotion, sessionBestMerge, direction, onShakeActiveChange) → ReactTree<Canvas+overlay>` with no `expo-*`/`MMKV`/`RNGH` beyond `Animated` shared values. All DW-107/110 carriers controllable via literal fixtures: `width: NaN / Infinity / -5 / 0 / undefined as any / "large" as any` for guard; `moveResult: {moved:true, trace:[{value:12, from:[[0,1],[0,2]], spawned:false, to:[0,0]}], ...}` + `direction: 'left'/'right'/'up'/'down'/undefined/null/'invalid'` for axis + overflow active; `reducedMotion: false→true` toggle via `renderer.update(React.createElement(GameBoard,{…reducedMotion:true}))` mid-sequence; unmount via `renderer.unmount()` inside `act()` to exercise `useEffect` timer cleanup. `safeWidth = Math.max(1, finiteWidth)` is deterministic pure TS, host `node --import tsx --test` + `react-test-renderer` drives all cases without Expo dev build. `App.isBoardShaking` toggle is observable as `boardWrap` style flatten `overflow: 'visible'` vs `null` (void) via `style` array.

**Observability — Strong.** Outputs are deterministic numerics/booleans/objects/styles with no hidden state: `safeWidth` `1` for `NaN`, `cell = Math.max((safeWidth-16-…)/4,1)` exact, overlay `style.width/height === safeWidth` not `NaN`, `shakeStyle.transform` driven by `shakeX/Y` worklet (host cannot assert worklet value but can assert `Animated.View style={shakeStyle}` still present + `shakeNotifyTimerRef` boolean side-effect via `onShakeActiveChange` spy). `onShakeActiveChange` mock `jest.fn()` records `[true]` on merge shake and `[false]` after `130ms` (with `jest.useFakeTimers()`) or immediate on `cancelShakeNotify`. Timer leakage observable via `jest.getTimerCount() ==0` after unmount. `both tsc --noEmit` (root + `tsconfig.test.json`) clean proves `onShakeActiveChange?` optional propagation doesn't break `App.tsx` call-site types.

**Reliability — Strong (deterministic 130ms toggle, no throw on NaN/invalid dir, cleanup idempotent).** All `width NaN/Infinity` / `moveResult null` / `trace null` / `direction null` / `from.length !==2` / `spawned true` paths are `never-throw` (try/catch + `Number.isFinite` guards preserved from 8-3 baseline). `notifyShakeActive` is itself `try/catch` so a parent `setState` throw never bubbles. Both `tsc` gates clean (`tsconfig.json` + `tsconfig.test.json`); `npm --prefix triade test 960 pass / 0 fail` baseline from spec verification proves no engine regression. Timer `setTimeout 130` matches exact `withSequence 30+40+30+30 =130` + `withTiming 0 duration130` orthogonal; drift `±1 frame` still within visible clip guard because overflow restores after the last frame.

**Testability Risks:** Two surfaces are thin: (a) `shakeNotifyTimerRef` is a `ReturnType<typeof setTimeout>` mutable ref not exposed — observability requires spying on the `onShakeActiveChange` callback rather than timer internals; mitigated by host P0 pins that assert spy call order `[true]` then `[false]` within 130ms tick. (b) Reanimated `shakeX/Y` worklet values are not observable host-side beyond `shakeStyle` presence; mitigated by static scan `rg -n "withSequence.*withTiming.*vec\.(x|y)" GameBoard.tsx` + existing pure `shake.test.ts` `maxShakeForTrace`/`directionVector` pins that cover amplitude/axis before the imperative mount.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH / PERF | **Overflow visible 130ms toggle races with rapid early-input re-trigger (`EARLY_INPUT_MS≈84ms` <130ms).** Second merge before first 130ms timer fires must `clearTimeout` and re-schedule `true → (130ms) → false` without double `false` or stuck `visible`. A naive `setTimeout` without clear would leave `boardWrap` `visible` 260ms or `false` 130ms early, staling visible during combo shakes or clipping the tail. Existing code does `if(shakeNotifyTimerRef.current) clearTimeout(…)` before re-arm, but a regression that dropped the clear or that used `useState` batch without ref would regress. | 2 | 3 | **6** | Enforce `scheduleShakeVisible` clear-then-set: (a) **host P0 pins** `node:test` with `jest.useFakeTimers()` — mount `GameBoard` with `onShakeActiveChange = jest.fn()`, drive `moveResult` effective merge `direction left` → assert `spy mock.calls [ [true] ]` at t0, `jest.advanceTimersByTime(90)` before timer fires then drive second effective merge → assert spy still `[true, true]` not `[true,false]`, then `advance 130` → `[true,true,false]` single `false`; (b) **static scans** `rg -n "shakeNotifyTimerRef.*setTimeout" GameBoard.tsx ==1` + `rg -n "clearTimeout\(shakeNotifyTimerRef" GameBoard.tsx ==2` (schedule + cancel) + `rg -n "130" GameBoard.tsx ==3` (`130ms`×3: setTimeout + 2× withTiming); Spec I/O rows 1-2. | FE lead | Immediate (gate DW-107) |
| R-002 | TECH / DATA | **Incomplete width guard — bare `width` reintroduced after `safeWidth` alias.** `GameBoard.tsx:316-319` computes `safeWidth = Math.max(1, Number.isFinite(width)?width:1)` but every `View/Canvas/RoundedRect/overlay/cell` must consume `safeWidth`, not `width`. If a future diff touches overlay or adds a new sibling (S8.4 bulletTime flash second overlay, burst origin) and writes `width` instead of `safeWidth`, `NaN width: NaN` propagates to RN layout (`width: NaN` yellow-box / iOS crash). Current diff is clean (5 sites on `safeWidth`), but drift risk is high because `width` param remains in scope. | 2 | 3 | **6** | Enforce `safeWidth` completeness: (a) **host P0 pins** `width: NaN/Infinity/-5/0/undefined as any` → `render GameBoard` via `react-test-renderer` and assert `findByType(View).props.style.width ===1` and `findByType(Canvas).props.style.width ===1` and overlay `props.style.width ===1` all not `NaN` (4 asserts); `cell` still `>=1` via `Math.max((safeWidth-…)/4,1)`; (b) **static scans** `rg -n "safeWidth" GameBoard.tsx ==11` (definition + 10 uses: cell + View×2 + Canvas×2 + RoundedRect×2 + overlay×2 + comment) + `rg -n "width, height: width" GameBoard.tsx ==1` comment-alias for `reducedMotion.atdd P2-06` + `rg -n "Number\.isFinite\(width\)" GameBoard.tsx ==1`; Spec I/O rows 4-5; keep `rg -n "\bwidth\b" triade/src/render/GameBoard.tsx` outside `width:` param vs `safeWidth` lint as P1. | FE lead | Immediate (gate DW-110) |
| R-003 | TECH / BUS | **ReducedMotion mid-shake + unmount leak leaves `boardWrap` stuck `overflow:visible` or shakes bleeding.** `useEffect [reducedMotion]` now `cancelShakeNotify()` after snapping `shakeX/Y/bulletFlash withTiming(0,20)`; `moveResult` else branches also `cancelShakeNotify`; `useEffect` cleanup `clearTimeout(shakeNotifyTimerRef)` on unmount. If reducer misses one branch (e.g. slide-only after heavy merge without `cancelShakeNotify`, or `reducedMotion` true not cancelling timer), `isBoardShaking` stays `true` beyond 130ms → `boardWrap` visible leaks into non-shake frames, exposing clip guard as visible overflow artifact, or parent `setState` on unmounted `App` if timer fires post-unmount (React warning). | 2 | 3 | **6** | Enforce symmetric cancel + cleanup: (a) **host P0/P1 pins** — mount with `reducedMotion false`, drive merge `direction up` (active shake), assert spy `[true]`; then `renderer.update(<GameBoard reducedMotion true …>)` inside `act()` → assert spy `[true,false]` within 0ms (no 130ms wait), `shakeX/Y` snap branch `withTiming(0,20)` present; NOOP drive ( `moveResult.moved false`) → spy `[false]` immediate; slide-only (`moved true` but `maxShake 0`) → spy `[false]` immediate; `renderer.unmount()` inside `act()` with active timer → `jest.getTimerCount()==0` and spy does not gain extra `false` post-unmount; (b) **static scans** `rg -n "cancelShakeNotify\(\)" GameBoard.tsx ==5` (reducedMotion effect + 4 branches) + `rg -n "useEffect.*return.*clearTimeout" GameBoard.tsx ==1` unmount; Spec I/O row 3. | FE lead | Immediate |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Overflow `StyleSheet` flatten `null` vs `false` vs `undefined` — `isBoardShaking ? {overflow:'visible'} : null` relies on `Array.flatten` ignoring falsy.** If code were `false` or `undefined`, RN style array flatten still ignores, but a future `styles.boardWrap` that spreads `{overflow:'visible'}` unconditionally or `isBoardShaking && {overflow:'visible'}` without array would produce `false` entry type warning. Also `StyleSheet.create({boardWrap:{overflow:'hidden'}})` base must remain `hidden`; removing it would make visible permanent. | 2 | 2 | 4 | Pin style conditional: (a) **static scans** `rg -n "isBoardShaking \? \{ overflow: 'visible'" triade/App.tsx ==1` + `rg -n "overflow: 'hidden'" triade/App.tsx ==1` base in `StyleSheet` + `rg -n "overflow: 'visible'" triade/App.tsx ==1` + `rg -n "onShakeActiveChange=\{setIsBoardShaking\}" App.tsx ==1`; (b) **host P1 pin** `App` render with `isBoardShaking true` via state spy — `boardWrap` style flat contains `overflow:visible` exactly once; with `false` contains `overflow:hidden` not `visible`. |
| R-005 | TECH | **`reducedMotion.atdd P2-06` expects literal `width, height: width` text still present — `safeWidth` refactor must keep literal for scan.** `triade/__tests__/feel/reducedMotion.atdd.test.ts:P2-06` asserts `gbSource.includes('width, height: width')` as board container 1:1 square contract. If refactor renamed literal to `width: safeWidth, height: safeWidth` without preserve comment, that scanning test fails even though runtime is correct. Current diff keeps literal in comment `// board container is width, height: width (safeWidth alias keeps 1:1 square; DW-110 guard via safeWidth)` + actual code `width: safeWidth, height: safeWidth` so scan passes only if comment contains literal. | 2 | 2 | 4 | Pin literal dual: (a) **static scans** `rg -n "width, height: width" triade/src/render/GameBoard.tsx ==1` comment-alias + `rg -n "width: safeWidth, height: safeWidth" GameBoard.tsx ==3` (View + Canvas + overlay); (b) **host P1 pin** running `reducedMotion.atdd P2-06` directly green; document that runtime is `safeWidth` alias while comment satisfies legacy scan. |
| R-006 | TECH | **`try/catch` inside `notifyShakeActive` silently swallows parent `setIsBoardShaking` throw — masks wiring bug.** `notifyShakeActive = useCallback(active⇒{ try{onShakeActiveChange?.(active)} catch{} }, [onShakeActiveChange])` intentionally never-throws (matching 8-3 `never-throw` pattern), but a future parent that throws due to stale closure would be hidden, causing silent visible-leak without error. | 1 | 3 | 3 | Pin swallow is intentional but observed: (a) **host P1 pin** `onShakeActiveChange` spy that throws → `scheduleShakeVisible()` still `doesNotThrow()` and `shakeX` worklet still scheduled (swallow verified); (b) **static scan** `rg -n "try" triade/src/render/GameBoard.tsx` includes try in `notifyShakeActive` + bulletTime try; document in code comment that swallow is board-only safety net, parent error surfaces in `App` render not board. |
| R-007 | PERF | **130ms `setTimeout` vs `withSequence 30+40+30+30` drift by 1-2 frames (JS timer vs UI thread worklet).** `scheduleShakeVisible` 130 matches nominal worklet 130, but JS timer fires on JS thread while `shakeX/Y` worklet runs on UI thread — under JS load `setTimeout` may fire 5-10ms late, leaving overflow visible one extra frame, or fire early (if scheduled before worklet, high-priority JS) clipping last frame. Either is cosmetic (visible/hidden 1 frame) not freeze, but observable on 120fps ProMotion. | 1 | 3 | 3 | Keep 130 aligned: (a) **host P1 pin** timer delay `130` exactly = `30+40+30+30` via `rg -n "130" GameBoard.tsx` 3 hits matched; (b) **device P2 smoke** (landscape, heavy merge 12+ shake 5) screenshot at 240fps — board edge pixels not clipped at frame 0 or 130, chrome not shaken; 1-frame drift accepted as residual per spec I/O row 1 `Expected Output 130ms then hidden`. No fix unless ProMotion repro shows clip. |
| R-008 | BUS / OPS | **`BOARD_PADDING + SHAKE_CAP` compensating padding alternative documented as `or` vs `overflow visible` — product decision drift.** Spec says `Toggle parent boardWrap overflow to visible during 130ms shake via callback … or documented compensating BOARD_PADDING + SHAKE_CAP padding spare`. If team later picks padding over overflow, `isBoardShaking` becomes dead code but still toggles; if picks overflow, padding comment stays stale. Also shake atdt `P2-05` scans `hasVisibleFix || hasPaddingFix` — both satisfy, so dead-code path still green masking missing choice. | 2 | 2 | 4 | Pin decision: (a) **static scans** `rg -n "BOARD_PADDING \+ SHAKE_CAP" GameBoard.tsx ==1` comment + `rg -n "overflow: 'visible'" App.tsx ==1` true → `hasVisibleFix true` + `hasPaddingFix true` per spec verification `hasVisibleFix true, hasPaddingFix true`; (b) **host P1 pin** either fix alone passes `P2-05` but this plan asserts both present (visible primary, padding spare comment); document that removal of either must update `P2-05` scan string. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | OPS | **Ledger `resolution-undo: e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f` 64-hex per DW entry + `sprint-status.yaml` ownership.** Sweep flips exactly 2 deferred-work hunks `open → done` with same 64-hex hash duplicated per entry (2 occurrences); `sprint-status.yaml` must stay untouched (`done 8-3` etc unchanged). | 1 | 2 | 2 | Monitor — `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty (gate `epic-8 done` unchanged); ledger `rg -n "e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f" deferred-work.md` 2 hits + `rg -n "resolution-undo" deferred-work.md` health; this plan never writes ledger or status. |
| R-010 | PERF | **Per-move `Number.isFinite(width)` + `Math.max(1,…)` overhead — negligible.** Single `typeof` + `Number.isFinite` + `Math.max` per render / per `moveResult` effect, `<0.01 ms` vs 60 FPS budget `<8 ms`; 50-move replay wall stays `<30 ms`. | 1 | 1 | 1 | Monitor — `npm --prefix triade test` wall-clock log; `tsc` both configs `<5 s` proves no allocation leak; no bench lane needed (feels 8-3..8-4 bench already covers frame budget at 757 pass). |

### Risk Category Legend

- **TECH**: shake timer `shakeNotifyTimerRef clear+set 130` + `cancelShakeNotify` symmetric, `safeWidth = Math.max(1, Number.isFinite(width)?width:1)` + 5 style sites + `cell`, `onShakeActiveChange?` optional callback, `try/catch` swallow, `width, height: width` literal alias, `overflow hidden→visible` StyleSheet conditional, `withSequence 30+40+30+30` vs timer drift
- **DATA**: `width NaN/Infinity/-0/null as any/string` → `safeWidth 1` → overlay `width:1 height:1` not `NaN`, `cell Math.max((safeWidth-…)/4,1)` finite, bullet flash overlay `width/height safeWidth` (DW-110)
- **BUS**: FR-30 ReducedMotion gate `reducedMotion → withTiming(0,20) + cancelShakeNotify` + overflow reset + bullet flash suppressed board-only, product decision `overflow visible` vs `BOARD_PADDING+SHAKE_CAP 16` spare (DW-107)
- **OPS**: `deferred-work.md` 64-hex `resolution-undo e7ad61…` ledger (2 hunks), `sprint-status.yaml` orchestrator ownership (never write/revert)
- **SEC**: n/a for this bundle (no tokens/network/store)
- **PERF**: `130ms setTimeout` aligns `withSequence/withTiming` on UI thread, per-render `Number.isFinite` O(1) `<0.01 ms`, no device lane — pure RN/TS host pins

---

## NFR Planning

**Purpose:** Capture bundle-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability | Board never throws on `width NaN/Infinity/0/undefined as any` or `moveResult null`/`trace null`; `safeWidth = Math.max(1, Number.isFinite(width)?width:1)` finite; `notifyShakeActive` `try/catch` never bubbles; `shakeNotifyTimerRef` cleared on unmount. | R-002, R-003, R-006 | Host `node --import tsx --test` pins `safeWidth` `NaN→1`, `Infinity→1`, `0→1`, `-5→1`, `undefined as any→1`; `doesNotThrow` on every invalid `width` render; `renderer.unmount()` `timerCount 0`. | `shake.atdd.test.ts` + `bulletTime.atdd.test.ts` + new `boardShakeWidthHardening` host test report; `tsc --noEmit` clean ×2 |
| Performance | Shake `130ms (30+40+30+30 on active axis + 130 flat orthogonal)` completes within 1 frame budget `p99 <16.7 ms` per frame; `setTimeout 130` vs worklet `130` drift ≤1 frame at 60/120fps; per-render `Number.isFinite` overhead `<0.01 ms`; full `npm test 960 pass` wall `<15 min`. | R-001, R-007, R-010 | Host timer pins `130` literal count (`rg -n 130 ==3`); `withSequence/withTiming` presence (`rg -n withSequence`); device 240fps screenshot heavy 5 shake not clipped (P2 exploratory). | `npm --prefix triade test` wall-clock log; `rg` counts; `triade/node_modules/.bin/tsc --noEmit` timings |
| Accessibility (FR-30, UX-DR-16) | `reducedMotion true` cancels any residual shake `withTiming(0,20)` + `cancelShakeNotify()` + `bulletFlash 0` immediately; toggle mid-shake snaps within `20ms` and returns `boardWrap` to `overflow:hidden`; haptics stay independent (shake gated, haptics not — 8-3 contract). | R-003, R-005 | Host `reducedMotion true` sweep `shakeMsFor(v,true)==0 && maxShakeForTrace(trace,true)==0 && shouldShake==false`; `renderer.update` with toggle asserts spy `[true,false]` within 0ms; scan `rg -n "if \(reducedMotion\)" GameBoard.tsx ==1`. | `shake.atdd.test.ts P0-04` host + `reducedMotion.atdd.test.ts` (existing) + new `boardShakeWidthHardening` toggle pin |
| Maintainability | `safeWidth` single-source alias (11 uses) not scattered; `SHAKE_CAP 8` single source via `Math.min(maxShake,SHAKE_CAP)` (not literal 8); `width, height: width` literal preserved as comment for `reducedMotion.atdd P2-06` scan; `isBoardShaking` `? {overflow:visible}: null` conditional preserves base `hidden`. | R-002, R-004, R-005 | Static `rg` health: `safeWidth 11`, `Number.isFinite(width) 1`, `width, height: width 1` comment, `Math.min(maxShake, SHAKE_CAP) 1`, `overflow visible 1` + `overflow hidden 1`. | `rg` counts table in test log; both `tsc` clean |
| Visual correctness | 5-8px directional shake not clipped at container edges (board-only, never chrome); parent `boardWrap` `overflow:hidden → visible` for 130ms then `hidden`; `BOARD_PADDING+SHAKE_CAP 16` spare documented as compensating alternative. | R-001, R-008 | Host `P2-05` scans `hasVisibleFix || hasPaddingFix`; device screenshot landscape + portrait heavy merge at corners (P2 exploratory). | `shake.atdd P2-05` green (was `it.skip EXPECTED RED`); device screenshot artifact if available (not gate) |
| Operational / Ledger | `deferred-work.md` 2 entries `DW-107/110 open→done 2026-09-02` with `resolution-undo: e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f` (64-hex, `git log --oneline` hash length); `sprint-status.yaml` untouched. | R-009 | `rg -n "e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f" deferred-work.md` 2 hits; `git diff -- sprint-status.yaml` empty. | `deferred-work.md` diff stat `2 hunks, 4 lines`; `spec-board-shake-width-hardening.md` verification row `hasVisibleFix true hasPaddingFix true` |

**Unknown thresholds:** None. Shake amplitude is capped `SHAKE_CAP 8` (already datum), timing is `130ms` fixed `30+40+30+30`, width guard is `Math.max(1, Number.isFinite(width)?width:1)` hard gate, overflow toggle is boolean `hidden→visible→hidden`. No NFR inventing required.

---

## Entry Criteria

- [ ] `triade/src/render/GameBoard.tsx:316-319` `finiteWidth/safeWidth` guard present + 5 style sites on `safeWidth` (View×2, Canvas×2, overlay×2, `cell`) verified via `rg -n safeWidth ==11`
- [ ] `triade/src/render/GameBoard.tsx:331-364` `shakeNotifyTimerRef` + `scheduleShakeVisible/cancelShakeNotify/notifyShakeActive` present + `App.tsx:138,1020,1032` wiring present (`rg -n isBoardShaking ==3`, `overflow visible 1`, `onShakeActiveChange` 5 hits)
- [ ] Spec contract `_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md` `final_revision db01dfa` loaded and I/O matrix 5 rows agreed
- [ ] Existing ATDD `triade/__tests__/feel/shake.atdd.test.ts` `P2-05 it.skip EXPECTED RED` and `triade/__tests__/feel/bulletTime.atdd.test.ts` `P2-05 it.skip EXPECTED RED` acknowledged as the two reads that must flip green after this sweep
- [ ] `triade/src/engine/**` byte-identical (`git diff -- triade/src/engine --stat` empty)

## Exit Criteria

- [ ] All P0 host pins green (overflow toggle 130ms, cancel branches, width NaN→1, safeWidth 5 sites, callback wiring, unmount timerCount 0, invalid dir cancel)
- [ ] `shake.atdd P2-05` and `bulletTime.atdd P2-05` green (remove `it.skip` or add companion `it` that asserts `hasVisibleFix && hasWidthGuard`; currently `npm run test -- --test-name-pattern "P2-05"` must pass)
- [ ] `reducedMotion.atdd P2-06` still green (`width, height: width` literal comment still present)
- [ ] Both `tsc --noEmit` (root `tsconfig.json` + `tsconfig.test.json`) clean
- [ ] `npm --prefix triade test` full gate `960 pass / 0 fail` (spec verification line) with `366 skipped` baseline not grown
- [ ] No high-risk (≥6) items unmitigated (gate `CONCERNS`→`PASS` only after R-001..R-003 mitigated with evidence)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented `CONCERNS`/waivers for each NFR above

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE lead / TEA | Owns GameBoard/App host pins + timer/cancel lifecycle; signs off P0 overflow+width |
| Murat (TEA) | Test Architect | Owns risk assessment + gate `CONCERNS/PASS` + ledger hash provenance |

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Overflow `visible for exactly 130ms then hidden` on merge shake ×4 dirs (left/right X, up/down Y) — `scheduleShakeVisible` `true → timeout 130 → false` | Unit / Component | R-001 | 4 dirs ×1 host pinned =4 + 1 conditional style scan =5 | QA/FE | Host `jest.useFakeTimers()` — spy `onShakeActiveChange`; drive `moveResult moved true trace [{value:12,…}] direction left` → spy `[true]`, `advance 130 → [true,false]`; repeat for right/up/down; also scan `App.tsx` `isBoardShaking ? {overflow:visible}:null` |
| `cancelShakeNotify` on every non-shake branch (NOOP `moved false`, slide-only `amplitude 0`, `!direction`, `reducedMotion`, invalid dir zero vector) — immediate `false` not 130ms | Unit | R-001, R-003 | 5 branches ×1 host =5 | QA | `NOOP` trace `[]` → spy `[false]` at t0; `slide-only` (`from length 1`) → `[false]`; `direction undefined` → `[false]`; `reducedMotion true` → `[false]`; `direction 'invalid'` → `[false]` (zero vector branch). All `doesNotThrow`. |
| Width guard `Number.isFinite(width)?width:1` + `Math.max(1,finiteWidth)` → `safeWidth 1` for `NaN/Infinity/-Infinity/-5/0/undefined as any/"x" as any` + cell `≥1` | Unit | R-002 | 7 inputs ×1 host =7 | QA | `render GameBoard` with each degenerate width via `react-test-renderer` `createElement` — assert `View.props.style.width ===1`, `Canvas.props.style.width ===1`, overlay `props.style.width ===1` (3 asserts per input but counted as 1 scenario); `cell`≥1 via `board still renders without throw`. |
| `safeWidth` propagation to all 5 style sites (View container `width/height`, Canvas `width/height`, RoundedRect `width/height`, overlay `width/height`, `cell` calc) — no bare `width` leak | Unit | R-002 | 1 scan suite =1 | QA | `rg -n safeWidth ==11` deterministic scan; plus 1 host render `width: 200` finite → assert all 5 sites `===200` not `NaN` (boardSize 200 smoke) |
| `App isBoardShaking → boardWrap overflow visible` conditional + `onShakeActiveChange={setIsBoardShaking}` threaded prop + optional safety `?.` | Integration | R-001, R-004 | 2 (App render + scan) | QA/FE | `App` module import scan `isBoardShaking` 3 hits + `overflow visible 1` + `hidden 1` + prop 1; host `GameBoard` with `onShakeActiveChange` spy drives shake → spy observed (above) |
| Unmount mid-fade clears timer — `useEffect` cleanup `clearTimeout(shakeNotifyTimerRef)` → `timerCount 0` and no post-unmount `setState` | Unit | R-003 | 1 | QA | `jest.useFakeTimers()` mount with active shake, `renderer.unmount()` inside `act()` → `jest.getTimerCount()==0`; advance 200ms post-unmount → spy length unchanged |
| Invalid `direction` zero vector `x0 y0` suppresses shake and calls `cancelShakeNotify` (prevents visible leak on bad swipe) | Unit | R-001, R-003 | 1 | QA | `directionVector('invalid')=={0,0}` already pinned by `shake.test.ts P0-08`; GameBoard branch `else { withTiming(0,20); withTiming(0,20); cancelShakeNotify(); }` → spy `[false]` |
| **Total P0** | | | **22 scenarios (7 width + 4 dirs + 5 cancels + 2 wiring + 1 unmount + 1 invalid dir + 2 style scans)** | | **Host-only `node --import tsx --test` + `jest` fake timers + `react-test-renderer` + `rg` scans; runtime <1 min** |

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Rapid re-shake timer reset — second merge at 90ms before first 130 fires `clearTimeout` then re-arm `130` → single trailing `false` | Unit | R-001 | 1 | QA | `jest.useFakeTimers()` first shake at t0 spy `[true]`, second at t90, advance to t130 (first expiry would be t130) assert spy still `[true,true]` not `[true,false]`, advance to t220 (90+130) assert `[true,true,false]` |
| `reducedMotion` toggle mid-shake snaps `shakeX/Y withTiming(0,20)` + `bulletFlash 0` + `cancelShakeNotify` → overflow hidden immediately (no 130 wait) | Unit | R-003 | 1 + scan | QA | `renderer.update(<GameBoard reducedMotion true>)` inside `act()` → spy `[true,false]` within 0ms; `rg -n "if \(reducedMotion\)" GameBoard.tsx ==1` + `rg -n "withTiming\(0.*20" GameBoard.tsx >=3` |
| `BOARD_PADDING + SHAKE_CAP 16` compensating padding spare documented as `or` alternative — comment still present alongside `overflow visible` | Unit | R-008 | 1 scan | QA | `rg -n "BOARD_PADDING \+ SHAKE_CAP" GameBoard.tsx ==1`; plus `shake.atdd P2-05` `hasPaddingFix` true alongside `hasVisibleFix true` |
| Width `0 / -5 / null as any / "" as any` clamps `Math.max(1,…)` → `safeWidth 1` (edge beyond NaN — negative/zero) | Unit | R-002 | 3 inputs ×1 =3 | QA | Same host render as P0 but `0` and `-5` and `null as any` (covers fallback `1` via `Number.isFinite(null)→false`? Actually `Number.isFinite(null)` is false → `1` → `max 1` ) |
| `notifyShakeActive` `try/catch` swallows parent throw — schedule still drives `shakeX/Y` worklet | Unit | R-006 | 1 | QA | `onShakeActiveChange` spy that `throw new Error("parent")` → `scheduleShakeVisible()` `doesNotThrow()`; spy throw caught, `shakeNotifyTimerRef` still armed |
| Ledger & `sprint-status.yaml` ownership — `resolution-undo e7ad61…` 64-hex ×2 + `sprint-status.yaml` empty | Unit | R-009 | 1 scan suite | OPS | `rg -n "e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f" deferred-work.md` 2 hits + `git diff -- sprint-status.yaml` empty |
| **Total P1** | | | **8 scenarios + 3 scans** | | **PR gate <5 min; same host tooling as P0** |

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| `width, height: width` literal still present as comment for `reducedMotion.atdd P2-06` scan while runtime uses `safeWidth` — lint passes | Unit | R-005 | 1 scan | QA | `rg -n "width, height: width" GameBoard.tsx ==1` comment-alias; `rg -n "width: safeWidth, height: safeWidth" GameBoard.tsx ==3` runtime; run `reducedMotion.atdd P2-06` green |
| Hud `boardWrap` vs `GameOverOverlay` asymmetry probe — overlay clamped but Hud not (intentional) — document drift | Unit | — | 1 scan | QA | `rg -n "clampInset\|safeWidth" triade/src/ui/Hud.tsx ==0` vs `GameBoard.tsx ==11`; note as exploratory P2 |
| Exploratory landscape clip screenshot — heavy 5 shake at portrait + landscape board corners not clipped (S8.3 deferred R-007) | Manual / Device | R-001, R-007 | 1 exploratory | FE | 240fps screenshot device lane; check grid `RoundedRect` corners not cut at frame 0/65/130ms; chrome not shaken |
| Narrow board `boardSize 160` smoke — `safeWidth 160` → `cell (160-16-24)/4 =30` still renders `ordered tiles` without overlap | Unit | R-002 | 1 | QA | `react-test-renderer` `width:160` finite → `View width 160` |
| `tsc` both configs clean proves `onShakeActiveChange?` optional does not break `App` call-site | Unit | — | 1 | QA | `triade/node_modules/.bin/tsc --noEmit` + `tsc -p tsconfig.test.json --noEmit` both PASS |

**Total P2**: 5 scenarios/scans

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| 50-move replay wall `<30 ms` with width guard — `resolve SHAKE_CAP` vs `safeWidth` overhead not regressed | Unit | 1 bench | FE | `node --import tsx --test` loop 50 `move` + `GameBoard` renders wall-clock |
| CSS/visual regression 1-frame drift ±10ms accepted — overflow visible 1 extra frame not counted as defect | Manual | — | FE | Recorded as residual `R-007` monitor; no blocking test |
| Board `role="grid"` a11y, frame-rate `p99 <16.7` bench, Skia `useSharedValue` retarget, PreviewCard 60/40 logic | — | — | — | Explicitly out of scope — covered by `test-design-epic-8-3-screen-shake` and `test-design-epic-8-4-bullet-time` |

**Total P3**: ~1 bench + 2 exploratory notes (on-demand)

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking style/layout break

- [ ] `rg` health `safeWidth 11` + `overflow visible 1` + `overflow hidden 1` + `Number.isFinite(width) 1` + `shakeNotifyTimerRef 4` (30s)
- [ ] `reducedMotion.atdd P2-06` literal scan still green (30s)
- [ ] `shake.atdd P2-05` `hasVisibleFix||hasPaddingFix` green (flag was `it.skip`) — now active (45s)

**Total**: 3 scans

### P0 Tests (<10 min)

**Purpose**: Critical path validation — host-only `react-test-renderer` + `jest fakeTimers` + `rg`

- [ ] `P0` 7 width guards `NaN/Infinity/-5/0/undefined as any` → `safeWidth 1` not `NaN` (Unit)
- [ ] `P0` 4-dir overflow `true→130→false` (left/right X, up/down Y) (Unit)
- [ ] `P0` 5 cancels (NOOP/slide-only/no-dir/reducedMotion/invalid dir) → immediate `false` (Unit)
- [ ] `P0` App wiring + unmount timerCount 0 (Integration)

**Total**: 22 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage — PR gate

- [ ] `P1` rapid re-shake 90→220 reset (Unit)
- [ ] `P1` reducedMotion mid-shake snap + cancel (Unit)
- [ ] `P1` `BOARD_PADDING+SHAKE_CAP` spare comment + ledger 64-hex ×2 (scans)
- [ ] `P1` `notifyShakeActive` swallow (Unit)

**Total**: 11 scenarios/scans

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage — nightly + exploratory

- [ ] `P2` 5 scans (literal alias, Hud asymmetry, narrow 160, tsc×2)
- [ ] `P3` bench + device screenshot exploratory (on-demand)

**Total**: 6 scenarios + bench

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 22 | 0.15 | ~2.0–3.5 | Host-only `react-test-renderer` + `jest` fakeTimers setup once for all `width` guards + timer pins; reruns cheap |
| P1 | 11 | 0.15 | ~1.0–1.7 | Reuses P0 timer harness; rapid re-shake + reducedMotion toggle are 1-file pins |
| P2 | 5 | 0.12 | ~0.4–0.7 | Scans + 1 narrow 160 render + `tsc` proof |
| P3 | 1-2 | 0.2 | ~0.2–0.4 | 50-move replay bench + 1-frame drift note; device screenshot optional |
| **Total** | **39** | **-** | **~3.6–6.3** | **~0.45–0.8 day** |

### Prerequisites

**Test Data:**

- `NaN/Infinity/-Infinity/-5/0/undefined as any /"x" as any` degenerate widths (guard fixtures)
- `moveResult` merged trace fixtures `[{value:12, from:[[0,1],[0,2]], spawned:false, to:[0,0]}]` ×4 dirs + `slide-only from length 1` + `NOOP moved false` (from `spec-board-shake-width-hardening.md` I/O matrix)
- `rn-stub.ts` not needed (GameBoard uses real `react-native` `View` via `react-test-renderer`; no `Animated` stub — only `onShakeActiveChange` spy)

**Tooling:**

- `node --import tsx --test` (host, no Expo dev build)
- `react-test-renderer` + `jest.useFakeTimers()` (timer+callback observability)
- `rg` (`ripgrep`) for `safeWidth/overflow/130/Number.isFinite` static health
- `triade/node_modules/.bin/tsc --noEmit` (both `tsconfig.json` + `tsconfig.test.json`)

**Environment:**

- Host lane only — no `expo-device`/`Reanimated` physical device lane required (shake worklet not asserted host-side beyond `shakeStyle` presence)
- Optional landscape screenshot lane for visual P2 exploratory (not gate)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — 22 scenarios must be green)
- **P1 pass rate**: ≥95% (waivers required for `notifyShakeActive` swallow if parent wiring changes)
- **P2/P3 pass rate**: ≥90% (informational; landscape screenshot is exploratory not blocking)
- **High-risk mitigations**: 100% complete (R-001, R-002, R-003) or approved `CONCERNS` waiver with owner+expiry before `PASS`

### Coverage Targets

- **BoardShake width hardening**: ≥80% of `GameBoard.tsx:316-661` DW lines covered by `width` guard pins (measured via `rg safeWidth` + host renders)
- **Overflow toggle**: 100% of `shakeNotifyTimerRef`/`schedule/cancel` lines covered (`rg 4` hits)
- **Business logic (shake correctness)**: ≥70% via existing `shake.test.ts` 12 unit + `shake.atdd.test.ts` 9 P0 host (already 757 pass)
- **Edge cases width NaN**: ≥50% of guard inputs (≥4 of 7 degenerate fixtures) must be exercised host-side

### Non-Negotiable Requirements

- [ ] All P0 tests pass (22 scenarios)
- [ ] `shake.atdd P2-05` `hasVisibleFix || hasPaddingFix` active and green (flip from `it.skip`)
- [ ] `bulletTime.atdd P2-05` `hasWidthGuard` active and green (flip from `it.skip`)
- [ ] `reducedMotion.atdd P2-06` `width, height: width` literal still green
- [ ] No high-risk (≥6) items unmitigated without signed waiver (`R-001..R-003` need evidence rows above)
- [ ] Both `tsc --noEmit` clean
- [ ] Full `npm test` gate `960 pass / 0 fail` (spec line) and `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty
- [ ] Ledger `rg -n "e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f" deferred-work.md` exactly 2 hits

---

## Mitigation Plans

### R-001: Rapid early-input re-trigger races `shakeNotifyTimerRef` `clearTimeout → setTimeout 130` vs `withSequence 130` (Score: 6)

**Mitigation Strategy:** Keep `scheduleShakeVisible` pattern `if(timer) clearTimeout(timer); timer=setTimeout(()=>{timer=null; notify(false)},130)` + re-arm on every `amplitude>0` merge; `cancelShakeNotify` does symmetric clear. Host `jest.useFakeTimers()` pins second shake at t90 does not produce premature `false` (must see `[true,true]` at t130 and `[true,true,false]` at t220). Static `rg` proves `clearTimeout` 2 sites + `130` 3 sites. Product accepted 1-frame drift as residual (R-007).

**Owner:** FE lead

**Timeline:** Immediate — gate `DW-107`

**Status:** Planned → verify via P0 4-dir + P1 rapid re-shake test

**Verification:** `node --import tsx --test boardShakeWidthHardening.test.ts` 5 timer cases green + `rg -n "clearTimeout\(shakeNotifyTimerRef" ==2` table in test log

### R-002: Incomplete width guard — bare `width` reintroduced leaks `NaN` to RN `style width:NaN` (Score: 6)

**Mitigation Strategy:** Single-source `safeWidth = Math.max(1, Number.isFinite(width)?width:1)` (11 uses) replaces every `View/Canvas/RoundedRect/overlay/cell` width path; `width` param stays only as input name. Host renders with 7 degenerate fixtures assert `View/Canvas/overlay width ===1` not `NaN`; scan `rg -n safeWidth ==11` is deterministic count guard; `width, height: width` literal remains only in comment-alias for `reducedMotion P2-06`.

**Owner:** FE lead

**Timeline:** Immediate — gate `DW-110`

**Status:** Planned → verify via P0 7 width guard scenarios + P1 `0/-5/null` edges

**Verification:** Host `boardShakeWidthHardening` 7 width inputs green + `rg -n safeWidth 11` table + `rg -n "Number\.isFinite\(width\)" 1` + full `npm test 960 pass`

### R-003: `reducedMotion` mid-shake + unmount leak leaves `boardWrap overflow:visible` stuck (Score: 6)

**Mitigation Strategy:** Every non-shake branch calls `cancelShakeNotify()` (5 sites: invalid dir, slide-only, NOOP/missing dir, `reducedMotion` effect, `moveResult` else); `reducedMotion` effect does `withTiming(0,20)` snap + `cancelShakeNotify()` immediately (no 130 wait); unmount `useEffect` cleanup `clearTimeout(timer)` prevents post-unmount `setState`. Host pins toggle within 0ms and `timerCount 0` post-unmount; device smoke confirms shake suppress with `reducedMotion ON` board flat.

**Owner:** FE lead

**Timeline:** Immediate — FR-30 / gate `DW-107`

**Status:** Planned → verify via P0/P1 cancel + unmount host pins

**Verification:** Host toggle `false→true` inside `act()` spy `[true,false]` at 0ms + NOOP/slide-only immediate `false` + unmount `timerCount 0` + `rg -n "cancelShakeNotify\(\)" ==5`

---

## Assumptions and Dependencies

### Assumptions

1. Shake datum `SHAKE_CAP 8`, timing `130ms 30+40+30+30`, flash `BULLET_TIME_MS 200` remain data-stable (the only 2 feel data for this sweep); no product tuning of `shakeMs 2/5` mid-sweep.
2. `boardSize` from `App.tsx` `useWindowDimensions` is always finite in prod (guard is defensive; `NaN` path only exercised via `as any` host fixtures).
3. `Animated.View` shake is board-only imperative worklet, not chrome — `Hud`/`PreviewCard` never shakes (`shakeStyle` exactly 2 uses: definition + `Animated.View`).
4. `isBoardShaking` `null → StyleSheet` flatten tolerance is stable (`null` ignored in array style) — RN behavior assumed.
5. `it.skip P2-05` reads (`shake.atdd` + `bulletTime.atdd`) are the two deferred REDs that this bundle must flip green; their `rg` strings (`overflow: 'visible'` / `BOARD_PADDING + SHAKE_CAP` / `Number.isFinite(width)`) are the contract strings this design pins.

### Dependencies

1. `react-test-renderer` + `jest` fake timers available host-side — Required before P0 run (already in `triade` dev deps per `overlayCarriers.integration.test.ts`).
2. Both `triade/tsconfig.json` and `tsconfig.test.json` must resolve `triade/src/render/GameBoard.tsx` `onShakeActiveChange?` optional without `strictNullChecks` error — Required by exit gate.
3. No concurrent sweep touching `triade/App.tsx` `boardWrap` styles or `GameBoard.tsx` `width`/`safeWidth` during verification — coordination with orchestrator-owned `sprint-status.yaml` never-write invariant.

### Risks to Plan

- **Risk**: Second concurrent sweep renames `SHAKE_CAP` or moves `shakeNotifyTimerRef` to `useReducer`.
  - **Impact**: `rg` scan strings break, `P2-05` flips red, timer pins fail.
  - **Contingency**: Pin constants via single-source scan failure is gate `CONCERNS` — revert or update scan strings in that sweep's spec, not in this plan's production code.

- **Risk**: `react-test-renderer` version drift changes `findByType` shallow vs deep style prop shape.
  - **Impact**: Host width guard `props.style.width` assertions false negative.
  - **Contingency**: Fall back to snapshot `toJSON()` + `style` array flatten helper (same as `overlayCarriers.integration.test.ts` approach).

---

## Follow-on Workflows (Manual)

- Run `*atdd` to flip the two `it.skip P2-05` REDs green (or add companion `it` asserting `hasVisibleFix && hasWidthGuard && hasPaddingFix && hasWidthLiteral`) — scoped to `triade/__tests__/feel/shake.atdd.test.ts` + `bulletTime.atdd.test.ts` only, separate workflow; not auto-run here.
- Run `*automate` for broader coverage once `safeWidth` guard is extended to any future sibling overlay (e.g. second S8.4 burst origin) — optional.
- Run `*nfr-assess` after device screenshot lane exists to move NFR table from planned to evidence-audited `PASS/CONCERNS/FAIL`.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date} — sign-off that `safeWidth` 11 uses + `130` alignment vs `withSequence` kept.
- [ ] QA Lead: {name} Date: {date} — sign-off that `P2-05` flips green + 960 gate.

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`triade/src/feel/shake.ts` `maxShakeForTrace` / `directionVector` / `SHAKE_CAP`** | Shake amplitude/axis math is consumer of this sweep (`GameBoard` delegates via `maxShakeForTrace(moveResult.trace, reducedMotion)` + `Math.min(maxShake,SHAKE_CAP)` + `directionVector(direction)`). If shake regresses, this bundle's P0 fails but fix is in `shake.ts` not `GameBoard.tsx`. | Existing `shake.test.ts` 12 unit (medium 2 / heavy 5 / cap 8 / reduced gating / NOOP / maxWins / direction vectors / invalid dir / non-finite / alignment) must stay green; `shake.atdd.test.ts` P0-01..P0-09 must stay 757 pass vs 4 RED baseline. This plan pins `rg -n "maxShakeForTrace" GameBoard.tsx ==1` + `rg -n "directionVector" ==1`. |
| **`triade/src/feel/bulletTime.ts` `BULLET_TIME_MS 200` / `shouldTriggerBulletTime`** | Shares `GameBoard.tsx` board-only overlay lane (same file). Width guard change touches bullet overlay style; bullet flash timing `withTiming 60` + `BULLET_TIME_MS-60` must stay independent of shake 130. | Existing `bulletTime.atdd.test.ts` P0-01..P0-09 + `bulletTime.test.ts` must stay green; `rg -n "BULLET_TIME_MS" GameBoard.tsx ==1` + `GameBoard.tsx` bullet try/catch still present; overlay `backgroundColor #fff7e0` not regressed. |
| **`triade/src/render/transitionPlan.ts` `from.length===2 && !spawned` merge predicate** | Shake vs bullet vs punch share this predicate via `maxShakeForTrace` / `maxMergeValue`. Engine predicate drift would silent-stop shake (P0-05). | `transitionPlan` tests + `shake.atdd P2-04 engine purity` (0-0) — `rg "from '\.\./src/engine/core/index"` health. No transitionPlan diff in this bundle. |
| **`triade/App.tsx` `lastDirectionRef` + `direction={lastDirectionRef.current}` + `settings.reducedMotion` wiring** | Direction is set synchronously in `doMove(dir)` before `move()` — required for shake axis correctness; reducedMotion threads from settings. | `shake.atdd P1-02 App.lastDirectionRef wiring` (direction set before move, cleared on restart/lane) must stay green; `rg -n "lastDirectionRef.current = dir" App.tsx ==1` + `direction cleared >=2` still. Any `lastDirectionRef` rename fails P0. |
| **`triade/src/ui/GameOverOverlay.tsx` / `Hud.tsx` / `layout.ts SAFE_MARGIN`** | Not in this bundle — explicitly out of scope; `boardWrap` `overflow:hidden` base must stay `hidden` (not removed). | P2 Hud asymmetry scan (clampInset 0 in Hud vs 1 in GameBoard) stays documented; no `GameOverOverlay` diff. |
| **`triade/src/engine/**`** | Byte-identical — pure engine never imports feel/render; merge/score/spawn/ceiling not touched. | `git diff --stat -- triade/src/engine` 0 hunks gate + `npm test` `game.test.ts` 32 + `line.test.ts` etc still 960. Any engine hunk is FAIL for this bundle. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (TECH/SEC/PERF/DATA/BUS/OPS, score P×I 1-9, ≥6 HIGH)
- `probability-impact.md` - Risk scoring methodology (P 1-3 × I 1-3, BLOCK ≥9, MITIGATE 6-8)
- `test-levels-framework.md` - Test level selection (Unit for pure `safeWidth`, Component for `GameBoard` render, Integration for `App isBoardShaking` wiring)
- `test-priorities-matrix.md` - P0-P3 prioritization (P0 blocks core + high risk + no workaround — shake clip and NaN overlay both P0)
- `nfr-criteria.md` - NFR validation buckets (Reliability never-throw + Perf 130 budget + A11y FR-30 + Maintainability single-source `safeWidth/SHAKE_CAP` + Operational ledger)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md` (baseline `e3c52ae` → final `db01dfa`, type `bugfix`, status `done`, 2026-09-02 — intent + boundaries + 5-row I/O matrix + code map `GameBoard.tsx:316-319,331-369,525-570` / `App.tsx:137,1020`)
- Delta commit: `e3c4155 sweep dw-board-shake-width-hardening: DW-107, DW-110` (`+150/-10`, `triade/src/render/GameBoard.tsx` safeWidth+shakeNotify, `triade/App.tsx` isBoardShaking+overflow visible)
- Deferred ledger: `_bmad-output/implementation-artifacts/deferred-work.md:932,960` (`DW-107 clipped shake`, `DW-110 NaN width` `open → done 2026-09-02`, `resolution-undo: e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f`)
- Epic context: `triade/__tests__/feel/shake.atdd.test.ts:331 it.skip P2-05 overflow hidden` (R-007 deferred 5-8px clip) + `triade/__tests__/feel/bulletTime.atdd.test.ts:437 it.skip P2-05 width guard` (R-010 deferred NaN) — the two REDs this bundle closes.
- Scoring baseline PRD: N/A (sweep-bundle bugfix, not epic PRD — Epic 8 S8.3/S8.4 context in `_bmad-output/test-artifacts/test-design-epic-8-3-screen-shake.md` + `test-design-epic-8-4-bullet-time.md`)
- TEA config: `_bmad/tea/config.yaml` (`test_artifacts: _bmad-output/test-artifacts`, `test_design_output: _bmad-output/test-artifacts/test-design`, `risk_threshold: p1`, `communication_language: Português`, `document_output_language: English`)

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6 — Epic-Level Phase 4 sweep-bundle deep-dive)
