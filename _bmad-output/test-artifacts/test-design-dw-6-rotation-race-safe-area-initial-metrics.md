---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/App.tsx'
  - 'triade/src/ui/useSyncedLayout.ts'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/ui/orientation.ts'
  - 'triade/__tests__/ui/layout.test.ts'
  - 'triade/__tests__/ui/useSyncedLayout.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW-6 Rotation race — SafeAreaProvider initialMetrics + synced insets effect (DW-6)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep deep-dive for `dw-decision-dw-6` (`dw-6-rotation-race-safe-area-initial-metrics`)
**Scope:** Targeted test design for the working-tree delta of `dw-6`

> **Delta under assessment:** Working tree vs `HEAD a1f6831` (`spec-dw-6-rotation-race-safe-area-initial-metrics.md` `baseline_revision: a1f6831…`, status `done` post-loop). `git diff --stat HEAD` is `triade/App.tsx` (13 +8/-9) + untracked `triade/src/ui/useSyncedLayout.ts` (new, 78 LOC) + untracked `triade/__tests__/ui/useSyncedLayout.test.ts` (new, 124 LOC) + metadata-only `deferred-work.md` (`DW-6 open→done 2026-09-02` + `decision: 2026-09-02 Add initialMetrics plus synced hook` + `resolution-undo: 61d4ee9e5c27…`); `triade/src/ui/layout.ts` byte-identical pure source of truth (`rg -n "function layoutFor" triade/src/ui/layout.ts` still 1 hit, `SAFE_MARGIN 16 / PORTRAIT_BAND 96 / LANDSCAPE_BAND 48` literal pins stay). Ledger diff is `deferred-work.md` DW-6 `done 2026-09-02` with decision + hash; `sprint-status.yaml` is orchestrator-owned and MUST NOT be written by this workflow (prompt hard constraint):
> - `triade/App.tsx:1-11` — `import { initialWindowMetrics } from 'react-native-safe-area-context'` + `<SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>` (was `<SafeAreaProvider>` bare, caused async 0-insets first frame); `AppContent` now `const { width, height, insets, boardSize, bandHeight, isLandscape, bandTop } = useSyncedLayout();` (was 3-line direct `useWindowDimensions()` + `useSafeAreaInsets()` + `layoutFor({width,height,insets})` racy).
> - `triade/src/ui/useSyncedLayout.ts:1-73` — new `useSyncedLayout(debounceMs=32)` coalesces `useWindowDimensions` + `useSafeAreaInsets` with `pendingRef` + `timerRef setTimeout(debounceMs)` commit to `synced` state; `lastValidLayoutRef` holds last `boardSize>0` when `layoutFor(synced).boardSize===0`; pure helper `coalesceLayout(pending, lastValid)` exported for host tests; `DEFAULT_DEBOUNCE_MS=32` constant; `getBandTop` via synced insets + effective bandHeight.
> - `triade/__tests__/ui/useSyncedLayout.test.ts` — 4 node:test probes (`[P0]` 3 + `[P1]` 1) all `readFileSync`/dynamic `import(layout.ts)` style matching `layout.test.ts` conventions: `initialMetrics` string pin, `coalesceLayout` degenerate 2000-top clamp→hold, `useSyncedLayout` file content pins (`useWindowDimensions`+`useSafeAreaInsets`+`setTimeout`+`lastValid`+`getBandTop`+`DEFAULT_DEBOUNCE_MS`+`coalesceLayout`).
> - `triade/src/ui/layout.ts` unchanged — `layoutFor` still returns `{boardSize:0, bandHeight: PORTRAIT_BAND_HEIGHT}` on non-finite or degenerate insets, `boardSize = Math.max(0, Math.min(availWidth, availHeight))` clamped then `BOARD_SIZE_FLOOR` guard, `getBandTop = insets.top + SAFE_MARGIN + bandHeight`.
> - `triade/__tests__/ui/layout.test.ts` 18 tests still green must stay — `npm --prefix triade test` full gate is the only regression guard for this bundle (no engine/feel/monetization change — `git diff HEAD -- triade/src/engine` empty is gate).

---

## Executive Summary

**Scope:** Polish (`BUS/UX`) + correctness (`TECH`) hardening of the safe-area ↔ layout seam that caused `layoutFor` to see mismatched `{width,height}` vs stale `{insets}` for one frame during rotation and to mount the first frame with async `0` insets. Before the sweep `AppContent` called `useWindowDimensions()` and `useSafeAreaInsets()` directly and fed `layoutFor({width,height,insets})` synchronously, so a 390×844→844×390 rotation where `width/height` swapped before `insets` settled made `availHeight = height - insets.top - insets.bottom - 2*16 - bandHeight` temporarily negative → `layoutFor` clamped `boardSize` to `0` (visible flash / white gap). `SafeAreaProvider` also mounted bare (`<SafeAreaProvider>`) so the first frame before native measured `initialWindowMetrics` rendered with `0` insets before jumping. After the sweep `SafeAreaProvider` receives `initialWindowMetrics ?? undefined` (first frame already correct when native provides it, safe `undefined` fallback when `null` on web/Jest) and `AppContent` reads a single `useSyncedLayout()` that debounces the commit of `{width,height,insets}` by `32 ms`, batching the racy pair into one `setSynced`, and holds `lastValidLayoutRef` across transient `boardSize===0` so the board never flashes to `0` when a previous valid size exists. Working-tree `+8/-9` lines in `App.tsx` plus `78` LOC new hook is the entire blast radius — pure UI layout seam, no engine/lane/monetization/deferred-work other than DW-6.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3
- Critical categories: TECH (rotation coalesce window insufficient / stale-hold prevents legitimate shrink / `initialMetrics` null fallback mismatch), BUS/PERF (first-frame flash UX + 32 ms added input latency)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit + static pins, already passing — `initialMetrics` string pin + coalesce `2000-top → hold` + hook file-content pin `setTimeout/lastValid/getBandTop` + `layout.test.ts` 18 regression still green)
- P1 scenarios: 6 groups (engine/UI wiring — `coalesceLayout` valid-next replaces stale, `bandTop` via synced insets, `debounceMs<=0` immediate commit, `pendingRef` + `timerRef` coalesce single commit, `DEFAULT_DEBOUNCE_MS 32` literal, `layoutFor` pure guard unchanged)
- P2/P3 scenarios: 7 groups (secondary scans + exploratory — `rg` single-source pins for 1 import/1 provider/1 hook/1 helper, width/height vs insets dep array 5 entries, `lastValid` double-guard scan, ledger `61d4ee9e` hash, `sprint-status.yaml` ownership, fast double-rotation single-commit, timers bench)
- **Total effort**: ~2.8–5.2 hours (~0.4–0.7 days; host-only `npm test` + `tsc` + `rg` gates `<15 min`, no device lane — pure RN/TS `node --import tsx --test`; manual 15-min simulator rotation remains waivable `P1` device smoke per spec Boundaries `manual-validation domain`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine — `board.ts`/`line.ts`/`rules.ts`/`ceiling.ts`/`pot.ts`/`spawn.ts`/`weights.ts`, `move`/`shiftLine`/`boardFromLines`, `GRID_SIZE=4`, spawn draw budget `0 noop / 3 effective / 20 newGame`, `ceilingDetector`/`tierForCeiling`/`potForTier`, trace/merge guards** | `git diff --stat HEAD -- triade/src/engine` is empty (engine byte-identical). Spec Boundaries `Never: Change game engine rules or lane/monetization logic`. | This plan pins engine isolation via `git diff --stat -- triade/src/engine` empty + `npm --prefix triade test -- __tests__/engine` still `910/914 pass` baseline (per spec Auto Run) remains gate, not re-pinned here. |
| **Feel — `src/feel` haptics/punch/shake/bullet/sfx (`feel.ts` presets `BULLET_TIME_MS 200`, `shakeMs 2/5 cap 8`, punch `overshootScale 1.08/1.12/1.15`), `GameBoard.tsx` Skia/Reanimated `withSequence` 130 ms, `RNGH` gesture swipe pipeline** | Spec `Never: Change game engine rules or lane/monetization logic` plus no `src/feel`/`GameBoard`/`gesture.ts` change in diff. | Existing `__tests__/feel/*.test.ts` + `benchmarks/feel.bench.test.ts` remain gate; not exercised here. |
| **HUD — `Hud.tsx` `76×76/60×44` chrome + `PreviewCard` `range []→""` + `FALLBACK_PREVIEW`, `App.tsx` HUD fan-out `potForTier`/`previewFor`** | No `triade/src/ui/Hud.tsx`/`PreviewCard.tsx` change in diff (preview path untouched). | Existing `__tests__/ui/components/hud.test.ts` 8 + `hud.previewWiring` 9 remain gate. |
| **Monetization / a11y — RevenueCat `entitlements`/`restore`, AdMob `GADIsAdManagerApp`, Epic 9-11 `role="grid"`/`aria-live`** | No monetization/a11y code touched; `App.tsx` diff is only provider + layout hook wiring. | Existing `entitlements` restore suites remain gate. |
| **Re-introducing a `ScrollView` around the board to restore scroll-offset polish** | Spec Boundaries `Never: do not introduce an overlay ScrollView` — `ScrollView offset persists across rotation` was a deferred nuance but explicitly blocked. `App.tsx` already renders board in a plain `View` per D-XXX. | This plan explicitly asserts `rg -n "ScrollView" triade/App.tsx` stays `0` (no reintroduction); if a future sweep wants scroll-offset recovery, file a separate spec. |
| **Fixing non-notch `StatusBar style="auto"` light-UI legibility / band-under-status-bar on landscape (DW-7) and `portrait band 96` vs `landscape 48` Chrome re-tuning** | DW-7 is `open` with decision `Force dark status bar` — separate deferred `DW-7` sweep, out of scope for DW-6 rotation coalesce. `layout.ts` `PORTRAIT_BAND_HEIGHT 96 / LANDSCAPE_BAND_HEIGHT 48` unchanged. | Deferred-work.md `DW-7 open` remains truth; not verified here. Chrome stays pinned by `layout.test.ts` `PORTRAIT_BAND 96 / LANDSCAPE_BAND 48` 3-case golden anchors. |
| **Board `role="grid"` row/gridcell + live-region score announcements (DW-14), `user-scalable=no` pinch-zoom (DW-13), and `reducedMotion` umbrella** | A11y domain deferred to Epic 9/11; no `GameBoard` prop change in diff. | Existing `GameBoard` accessibility suites remain gate. |
| **Widening `layout.ts` contract (changing `SAFE_MARGIN 16`, `BOARD_SIZE_FLOOR 216`, `isLandscape w>h`, `getBandTop` formula, negativity/finiteness guarantees) or capping board growth** | Spec `Always: Keep triade/src/ui/layout.ts the pure layout source of truth; board size must never go negative and must remain finite; do not regress existing layout tests` + `Block If: Native initialMetrics requires store credential changes`. Layout arithmetic is not touched. | `layout.test.ts` 18 (P0/P1) plus `rg -n "BOARD_SIZE_FLOOR" / "SAFE_MARGIN" / "getBandTop"` literal + `boardSize >=0 && Number.isFinite` sweep remain the contract gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** Delta is pure UI layout seam with no `expo-*` Skia worklet or `MMKV`/`iap` dependency beyond two RN hooks: `useWindowDimensions()` returns `{width,height}` and `useSafeAreaInsets()` returns `{top,bottom,left,right}`. All seams host-controllable: `App.tsx` string pin needs only `readFileSync('triade/App.tsx','utf8')` include checks; `useSyncedLayout` branch matrix is fixture-driven via `pending {width,height,insets}` + `lastValid LayoutResult` direct call to pure `coalesceLayout(pending, lastValid)` which reuses pure `layoutFor(pending)` (already 18-case host matrix). `debounceMs` param is literal `32` plus `<=0` immediate branch; `pendingRef`/`timerRef` coalesce is exercised by two `useEffect` invocations with `width` then `insets` change within one `setTimeout` window. No `App` mount needed for P0 — file-content + pure helper suffice for PR gate; full mount (`react-test-renderer` + mocked `react-native-safe-area-context`) is a `P1` add-on, not required.

**Observability — Good.** Outputs deterministic scalars: `boardSize` finite `>=0` (0 only when insets exceed container and `lastValid` absent), `bandHeight` `96` portrait / `48` landscape literal, `isLandscape` `width>height` bool, `bandTop = insets.top + 16 + bandHeight` finite number. `lastValidLayoutRef.current.boardSize>0` vs `rawLayout.boardSize===0` branch observable as `effectiveLayout.boardSize === lastValid.boardSize` when degenerate pending hits `320×480 top:2000`. `timerRef` coalesce observable as `pendingRef.current` holds last `insets` after two setters before `setSynced` fires; `DEFAULT_DEBOUNCE_MS 32` literal pin is observable. `SafeAreaProvider` `initialMetrics` prop observable via `readFileSync includes 'initialWindowMetrics'` + `includes 'initialMetrics={initialWindowMetrics ?? undefined}'`. No Reanimated worklet timing sampled here — layout seam is synchronously assertable.

**Reliability — Strong.** Hook is cancellation-safe: every `setTimeout` has matching `clearTimeout(timerRef.current)` on re-render and on unmount return, so no `setState on unmounted component` leak. `debounceMs<=0` path clears timer and sets synced synchronously (no dangling timer). `lastValid` is `useRef(LayoutResult)` initialized via `layoutFor({width,height,insets})` on mount, so first `effectiveLayout` fallback never `null`. `coalesceLayout(null)` guard returns `next` when `lastValid===null` so mount before any `lastValid` keeps raw `0` (expected degenerate fallback) without throw. Both `tsc` gates clean (`tsconfig.json` + `tsconfig.test.json` via `TSX_TSCONFIG_PATH`) — `initialWindowMetrics` may be `Metrics|null` so `?? undefined` narrowing satisfies `SafeAreaProviderProps`.

**Testability Risks:** Two surfaces are thin: (a) `timerRef` is untyped `ReturnType<typeof setTimeout> | null` and `pendingRef` holds raw `{width,height,insets}` without narrowing `EdgeInsets` tuple; a future caller that passes `insets: null` would propagate `NaN` through `layoutFor` non-finite early-return (still `0`, not throw) — benign but scan should keep `EdgeInsets` shape stable. (b) `effectiveLayout` triple-nested ternary `rawBoard>0 ? raw : lastValid>0 ? lastValid : raw` is correct but visually mergeable to two lines — a refactor that flattens to `if (raw.boardSize===0 && lastValid.boardSize>0) return lastValid; return raw;` is equivalent but would make the double-guard scan count 1 not 2; allow either shape and pin the 1-hit `lastValidLayoutRef` instead.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH / PERF | **Rotation coalesce window insufficient — `useSafeAreaInsets` lag > `32 ms` on Android / slow native bridge still flashes `0`.** Before fix `layoutFor` saw racy `width/height` swapped + stale `insets` for one frame → `availHeight` negative → `boardSize 0` flash. After fix `DEFAULT_DEBOUNCE_MS 32` coalesces `pendingRef` and commits once via `setTimeout(32)` + holds `lastValid`. Risk: on a device where `insets` updated `50–100 ms` after `width/height`, the timer commits `synced` with still-stale `insets` before the real insets arrive, so second commit still flashes `0` if `lastValid` were absent; with `lastValid` the second flash is suppressed but first coalesced value is wrong orientation size for ~32 ms (perceived oversized/undersized board). Spec `Edge-Case Matrix` says `Debounce 32-64 ms window, keep lastValid` — `32` is low end, not `64`. | 2 | 3 | **6** | (a) **host P0 pins** `coalesceLayout({width:320,height:480,insets:{top:2000,...}}, lastValidPortait390x844.top47)` `=== lastValid.boardSize` (degenerate hold) + `coalesceLayout({width:844,height:390,insets:{top:0,bottom:0,left:47,right:21}}, lastValid)` returns valid `board>0` not stale; (b) **static pin** `rg -n "DEFAULT_DEBOUNCE_MS" triade/src/ui/useSyncedLayout.ts`==1 and `== 32` literal + `rg -n "setTimeout" triade/src/ui/useSyncedLayout.ts`==2 (set+cleanup) + `rg -n "clearTimeout" triade/src/ui/useSyncedLayout.ts`==2 (pre-set + unmount); (c) **manual `P1` device smoke** portrait→landscape→portrait on iOS simulator (per spec `Manual checks` + deferred `decision`) — record short clip proving no white gap; if Android lag >32 observed, tune `DEFAULT_DEBOUNCE_MS` to `48` without changing tests. | FE lead | Immediate (gate DW-6; blocks rotation flash) |
| R-002 | TECH / BUS | **`SafeAreaProvider` `initialMetrics` null/undefined fallback mismatch — first frame still `0` insets when native returns `null`.** Before fix provider was bare → first frame `insets 0,0,0,0` caused board shift/jump once native measures. After fix provider receives `initialWindowMetrics ?? undefined` — when Expo provides metrics (iOS/Android real device) first frame correct, but on web/SSR/Jest where `initialWindowMetrics === null`, `?? undefined` passes `undefined` and provider falls back to measuring, still racing 1–2 frames before settling. `초기 마운트 before native insets` row expects `non-zero boardSize via fallback`, but no fallback `0-insets` vs `lastValid` alone still flashes. | 2 | 3 | **6** | (a) **host P0 string pin** `App.tsx includes 'initialWindowMetrics'` + includes `initialMetrics={initialWindowMetrics` + includes `initialWindowMetrics ?? undefined` or `?? null` (null-safe)`; (b) **host P1 null-safe unit** import `triade/src/ui/useSyncedLayout.ts` `layoutFor({width:390,height:844,insets:{top:0,bottom:0,left:0,right:0}}).boardSize>0` proves `0-insets` still positive (so web fallback does not flash to 0, only slightly oversized); (c) **static** `rg -n "initialWindowMetrics" triade/App.tsx`==2 (import + JSX) and `rg -n "initialMetrics" triade/App.tsx`==1; document that `undefined` fallback is intentional (matches `react-native-safe-area-context` docs `Metrics|null`). | FE lead | Immediate (gate DW-6; blocks first-frame flash) |
| R-003 | TECH / BUS | **Stale `lastValid` retention prevents legitimate shrink — board never shrinks when legitimately going to smaller container (split-screen, foldable half-open, PIP).** Hook does `if (raw.boardSize===0 && lastValid.boardSize>0) return lastValid` so when container genuinely shrinks to `availBoard < BOARD_SIZE_FLOOR` but still `>0`, `raw` stays `>0` and overwrites `lastValid` with smaller value (correct). Risk is only degenerate `0` case: a genuinely tiny window where `layoutFor` clamps to `0` (e.g. `320×480 top:2000`) would incorrectly keep a stale large board that overflows/overlaps HUD band if `lastValid` had `boardSize>0` from portrait. Spec `Edge-Case Matrix` says `Never render 0-width board if previous valid exists` — but a real `0` container should show `0` not stale. | 2 | 3 | **6** | (a) **host P0 pin** `effectiveLayout` only holds when `raw.boardSize===0 && lastValid>0`; any `raw>0` (even `216 floor`) replaces `lastValid` — prove via `coalesceLayout({width:400,height:250,insets:ZERO}, lastValidLarge)` returns `small>0` not stale (uses `layout.test.ts` `400×250` height-bounded floor case); (b) **static** `rg -n "lastValidLayoutRef" triade/src/ui/useSyncedLayout.ts`≥3 (init + guard + update) + `rg -n "rawLayout.boardSize === 0" triade/src/ui/useSyncedLayout.ts`==1; (c) document that `availBoard===0` stale-hold is intentional polish for transient inset race, not for genuine window resize — if foldable use-case becomes blocking, narrow hold to `debounceMs` window only via `useRef(Date.now())` age check (future spec). | FE lead | Immediate (gate DW-6; protects shrink semantics) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Timer leak / `setState on unmounted component` — `timerRef.current setTimeout` fires after `AppContent` unmounts and calls `setSynced(pending)`.** `useEffect` returns cleanup `clearTimeout` and effect entry clears existing timer before resetting, so steady state safe. Risk is fast unmount within `32 ms` of rotation (e.g. lane switch unmounts `GameBoard` + `AppContent` remount) where second rotation's timer not cleared. | 1 | 3 | 3 | Pin cleanup: static `rg -n "clearTimeout" triade/src/ui/useSyncedLayout.ts`==2 + `rg -n "timerRef.current" triade/src/ui/useSyncedLayout.ts`≥4 (clear+null+set+clear) and `return () => { if (timerRef.current) clearTimeout …}` body present; host mount/unmount with `react-test-renderer` would need `jest.useFakeTimers` but string pin suffices for PR gate (waive to `P1` device only if lint says leak). |
| R-005 | PERF | **Debounce adds `32 ms` input-layout latency perceivable as lag on fast double-rotation or on responsive resize drag.** `pendingRef` coalesces correctly to final values, but user drags window continuously → many `useWindowDimensions` fires but only last commit renders, so intermediate sizes not painted for `32 ms` (spec `Fast double rotation: Only final settled layout applied`). | 2 | 2 | 4 | Pin literal `rg -n "DEFAULT_DEBOUNCE_MS = 32" triade/src/ui/useSyncedLayout.ts`==1; document that `32` is at threshold of one frame (~16 ms) + safety; if perf gate `feel.bench.test.ts median <16.7 ms` still green, waive — else tune to `16` or `requestAnimationFrame` alternative per Design Notes. |
| R-006 | TECH | **`useMemo` dep array drift — `rawLayout = useMemo(()=>layoutFor(synced),[synced.width, synced.height, synced.insets.top, …])` must include all 6 fields.** Diff shows dep list `synced.width, synced.height, synced.insets.top, synced.insets.bottom, synced.insets.left, synced.insets.right` (5 entries including `synced` fields) correctly mirrors `pendingRef` effect deps; a missing `.left` would miss notch-right insets on landscape rotation `844×390 left 47 right 21`. | 1 | 3 | 3 | Pin dep count: `rg -n "useMemo\(\(\) => layoutFor" triade/src/ui/useSyncedLayout.ts`==1 + `rg -n "synced\.insets\." triade/src/ui/useSyncedLayout.ts`≥4 (top+bottom+left+right in effect + memo); `layout.test.ts` asymmetric `left 10 right 10` case stays green as cross-check. |
| R-007 | TECH | **`bandTop = getBandTop(synced.insets, effectiveLayout.bandHeight)` uses synced `insets` + effective `bandHeight` but not effective `insets` separate — mismatch if `effectiveLayout` held stale due to degenerate `0` while `synced` already updated to new insets.** Hook computes `bandTop` from `synced.insets` not `effectiveLayout` insets (layoutFor does not return insets), so degenerate hold yields `bandTop` with new insets but old `boardSize` — board size stale but band offset correct (acceptable) vs board correct but band stale (would overlay HUD). Current order is correct per UX-DR-20 maximize; swapped order would shift dwell point. | 2 | 2 | 4 | Pin: `rg -n "getBandTop\(synced" triade/src/ui/useSyncedLayout.ts`==1 and `rg -n "effectiveLayout\.bandHeight" triade/src/ui/useSyncedLayout.ts`==2 (effective + deps); host `coalesceLayout` degenerate still `bandHeight` correct via `lastValid` not `raw`. |
| R-008 | OPS | **Deferred-ledger `resolution-undo` 64-hex coupling + `sprint-status.yaml` ownership.** Sweep marks DW-6 `done` with `resolution-undo: 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48` + `sprint-status.yaml` is orchestrator-owned and must not be written. | 1 | 2 | 2 | Monitor — `git diff --stat` gate shows `triade/App.tsx` + `triade/src/ui/useSyncedLayout.ts` + `triade/__tests__/ui/useSyncedLayout.test.ts` + `deferred-work.md` + `spec-dw-6-rotation-race-safe-area-initial-metrics.md` but NOT `sprint-status.yaml`. Any reopen must keep 64-hex hash 61d4ee9e…; this plan never writes the latter. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | TECH | **`coalesceLayout` pure helper vs hook inline guard duplication drift — `export function coalesceLayout` 4-line pure vs hook 4-line `useMemo effectiveLayout` share same `boardSize===0 && lastValid>0` predicate.** A future tidy that tightens one but not the other drifts; tests mock own `coalesce` locally so they still green. | 1 | 2 | 2 | Monitor — `rg -n "export function coalesceLayout" triade/src/ui/useSyncedLayout.ts`==1 + `rg -n "boardSize === 0" triade/src/ui/useSyncedLayout.ts`==1 (single predicate) and note duplication intentional for host-only helper. |
| R-010 | TECH | **`SafeAreaProvider` double-wrap or `initialWindowMetrics` import path rename (`react-native-safe-area-context` v6 changes export to `initialWindowMetrics` → `initialMetrics`?).** Provider already mounts once via `GestureHandlerRootView` + `SafeAreaProvider`; `initialWindowMetrics` is v5.7 export in `package.json ~5.7.0` — upgrade path would break named import. | 1 | 1 | 1 | Monitor — `rg -n "from 'react-native-safe-area-context'" triade/App.tsx`==1 + `package.json` `react-native-safe-area-context.*5` pin; this sweep does not upgrade native deps. |

### Risk Category Legend

- **TECH**: rotation `width/height` vs `insets` async race, `DEFAULT_DEBOUNCE_MS 32` coalesce window, `timerRef` leak, `useMemo` dep drift, `bandTop` synced-insets derivation, `coalesceLayout` duplication, `lastValid` stale-hold, `SafeAreaProvider` double-wrap
- **SEC**: none this sweep (pure UI layout math, no auth/storage — `layoutFor`/`orientation` are data math not security boundary; `boardSize` overflow is `PERF`/`TECH`, not exposure)
- **PERF**: `32 ms` debounce layout latency vs 60 FPS `feel.bench` budget, `one-cell ×400` bench not touched
- **DATA**: `lastValidLayoutRef` retains `LayoutResult {boardSize, bandHeight, isLandscape}` shallow, `pendingRef` `{width,height,insets}` transient — no `MatchStats`/`board` data leak
- **BUS**: first-frame flash to `0` + white gap during 90° rotation (native polish, `deferred-work.md` `decision: verify on simulator landscape rotation` manual domain)
- **OPS**: `deferred-work.md` 64-hex `resolution-undo 61d4ee9e…` + `sprint-status.yaml` ownership + both `tsc` clean gates

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-6` touches the **safe-area / layout seam only**: **reliability/never-throw + finiteness** (every `layoutFor` call returns finite `boardSize>=0, bandHeight∈{48,96}, isLandscape bool` + `useSyncedLayout` never throws on `null` `initialWindowMetrics` or `NaN` dimensions), **performance/frame budget** (60 FPS gate + `32 ms` debounce vs `SLIDE_MS 160 / TILE_FADE_MS 120 / MAX 280` feel budget), **maintainability (single `DEFAULT_DEBOUNCE_MS`, single `useSyncedLayout`, single `coalesceLayout`, single `lastValidLayoutRef`, single `initialMetrics` JSX site)**, **correctness** (board never goes negative / `0` only transient or degenerate, `BOARD_SIZE_FLOOR 216` guarantee when container fits it, `SAFE_MARGIN 16` every-edge `getBandTop` invariant), **offline/installability** unchanged (no new native module — `react-native-safe-area-context ~5.7.0` already in `package.json`).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw + finiteness | `layoutFor` never throws on any `{width,height,insets}` including degenerate `320×480 top:2000`, `NaN` insets→`boardSize 0` + band `96` + `false`; `useSyncedLayout` never throws when `initialWindowMetrics===null` and when `pending width/height NaN` (still returns finite `boardSize` via `layoutFor` non-finite early-return); `bandTop` always finite `insets.top + 16 + bandHeight`. | R-002, R-003 | Host negative-path suite: `layout.test.ts` `degenerate →0 never-negative` + `all finite sweep` 5 sizes `boardSize>=0 && finite` + new `coalesceLayout degenerate→hold` vs `valid→replace` 3+ hosts + `App.tsx` `initialWindowMetrics ?? undefined` null-safe string pin. | `triade/__tests__/ui/layout.test.ts:232-244` 18 pass + `triade/__tests__/ui/useSyncedLayout.test.ts:34` coalesce test 1/4 + both `tsc` clean |
| Maintainability | Single `DEFAULT_DEBOUNCE_MS = 32` in `triade/src/ui/useSyncedLayout.ts`; single `export function useSyncedLayout` + single `export function coalesceLayout`; single `lastValidLayoutRef` (init + 2 uses); single `import { initialWindowMetrics }` + single `<SafeAreaProvider initialMetrics` JSX; single 64-hex `resolution-undo: 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48` for DW-6; no duplicate `SafeAreaProvider` wrap, no `ScrollView`. | R-001, R-002, R-009 | Static scans: `rg -n "DEFAULT_DEBOUNCE_MS" triade/src/ui/useSyncedLayout.ts`==1, `rg -n "export function useSyncedLayout" triade/src/ui/useSyncedLayout.ts`==1, `rg -n "export function coalesceLayout" triade/src/ui/useSyncedLayout.ts`==1, `rg -n "lastValidLayoutRef" triade/src/ui/useSyncedLayout.ts`==3, `rg -n "initialWindowMetrics" triade/App.tsx`==2, `rg -n "initialMetrics" triade/App.tsx`==1, `rg -n "ScrollView" triade/App.tsx`==0, `rg -n "resolution-undo: 61d4ee9e" _bmad-output/implementation-artifacts/deferred-work.md`==1. | Source scans + `App.tsx:1-84` diff + `useSyncedLayout.ts:1-10` header + ledger diff |
| Correctness — layout contract | `SAFE_MARGIN 16`, `PORTRAIT_BAND_HEIGHT 96`, `LANDSCAPE_BAND_HEIGHT 48`, `BOARD_SIZE_FLOOR 216 (=44*4+8*2+8*3)`, `isLandscape w>h`, `getBandTop = insets.top + 16 + bandHeight`, `boardSize` maximized `Math.min(availWidth, availHeight-bandHeight)` then `BOARD_SIZE_FLOOR` floor when fits, never negative, `boardSize 0` only degenerate/0-container, `boardSize>0` on all `width>=320 height>=480` with `ZERO` insets. | R-003, R-006, R-007 | Host boundary suite: `layout.test.ts` `SAFE_MARGIN 16` pin + `PORTRAIT 96 / LANDSCAPE 48` pin + `min-tile floor 216` + `400×250 small still positive` + `390×844 portrait width-bounded 358` + `844×390 landscape height-bounded board>band + vertical` + `isLandscape==orientation.isLandscape` 4-dir + `degenerate 320×480 top 2000 →0`; plus `coalesceLayout` hold vs replace pair. | `layout.test.ts` 18 pass + `triade/src/ui/layout.ts:37-61` `layoutFor` + `orientation.ts:isLandscape` |
| Performance — 60 FPS / frame budget | NFR-1 unchanged: `feel.bench.test.ts` both-profile sweep median `<16.7 ms`; guard adds `setTimeout 32` debounce + coalesce O(1) per rotation (`<0.01 ms` per `coalesceLayout call`), `useMemo layoutFor` 1 pure call per committed rotation vs 2 before; board SVG reconciliation still O(1) `boardSize` prop diff. Device SIG `p99 <16.7 ms` on `GameBoard` `MAX 280` budget not touched. | R-005 | Host gate only: `npm --prefix triade test` full gate median per `layout.test.ts` `<1 s` (observed `<2 s` for 18-case suite) + `feel.bench.test.ts` both-profile still green (bench lane unchanged); manual timing 3-log not needed (debounce is `32 ms`, not animation). | CI `npm test` timing + both `tsc` clean; `npx tsc --noEmit -p triade/tsconfig.json` `0 errors` |
| Compliance — thin-view + no ScrollView + generation guard | Spec `Always: Keep triade/src/ui/layout.ts the pure layout source of truth; board size must never go negative and must remain finite` + `Never: do not introduce an overlay ScrollView` — enforced by `layout.test.ts` `layoutFor all finite never-negative` sweep + `rg ScrollView ==0` + single `initialMetrics` JSX; no new native harness beyond `safe-area-context ~5.7.0`. | R-008 | Host + static: `layout.test.ts` `all finite sweep` + `rg -n "ScrollView" triade/App.tsx`==0 + `rg -n "SafeAreaProvider" triade/App.tsx`==2 (import+JSX) + `git diff --stat -- triade/src/ui` shows `useSyncedLayout.ts` added + `layout.ts` unchanged. | `layout.test.ts` sweep + `App.tsx` provider JSX + `useSyncedLayout.ts` header diff |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native install beyond `react-native-safe-area-context ~5.7.0` already in `package.json`; `initialWindowMetrics` comes from that dep, not a new store credential. | — | `npm --prefix triade test` offline (no network) still green; `grep -n react-native-safe-area-context triade/package.json` still `~5.7.0` 1 hit. | `triade/package.json:24` `safe-area-context ~5.7.0` + manual offline device lane not needed for this sweep (no new native module per spec `Block If: credential changes or native module installation beyond safe-area-context`). |

**Unknown thresholds:** None material. `32 ms` is the spec `Edge-Case Matrix` `Debounce 32-64 ms` low end — measured host gate, not invented; `FEEL` `SLIDE_MS 160 / MAX 280` budget already pinned in `GameBoard.tsx`. If `feel.bench.test.ts median/p99` drifts, record new measured `p99` as baseline rather than inventing a fresh `16 ms` threshold. `initialWindowMetrics` shape is `Metrics|null` per upstream types — do not guess a `{frame:{x,y,width,height}, insets:{…}}` literal.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-dw-6-rotation-race-safe-area-initial-metrics.md` intent/boundaries/I-O matrix 4 rows + 4 tasks 4 ACs signed; DW-6 ledger `open→done` + `decision: 2026-09-02 Add initialMetrics plus synced hook` + `resolution-undo: 61d4ee9e…` reviewed; `Always`/`Never`/`Block If` reviewed)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsx` + `tsconfig.test.json` (`TSX_TSCONFIG_PATH`) + `layout.test.ts` 18 fixtures `ZERO_INSETS/PORTRAIT_NOTCH/LANDSCAPE_NOTCH` + `useSyncedLayout.test.ts` `readFileSync` + dynamic `import('layout.ts')` same harness)
- [ ] Test data available or factories ready (`390×844 top 47 bottom 34` portrait, `844×390 left 47 right 21` landscape, `320×480 top 2000` degenerate clamp, `400×250` floor case, `414×896 →382 / 1024×768 →688 / 500×580 →452` golden anchors, `anonymous-coalesce` `lastValid 390×844` vs `degenerate 320×480`)
- [ ] Feature deployed to test environment (working tree on top of `a1f6831` — `App.tsx` `initialMetrics` + `useSyncedLayout.ts` `78 LOC` + `useSyncedLayout.test.ts` `124 LOC` patched + `deferred-work.md` DW-6 + spec `Auto Run Result Status: done`; `git diff --stat HEAD -- triade/src/engine` empty is gate)
- [ ] No engine/feel/HUD/monetization edits (`git diff --stat HEAD -- triade/src/engine triade/src/feel triade/src/game triade/src/services` empty for engine/feel; `triade/src/ui/layout.ts` byte-identical) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`App.tsx` `initialMetrics` 3 pins + `coalesce degenerate→hold` + hook file-content 8 pins + `layout.test.ts` 18 still green, host `<15 min` gate)
- [ ] All P1 tests passing (or failures triaged with waivers) — valid-next coalesce + `bandTop` + `debounceMs<=0` immediate + `pendingRef/timerRef` + `DEFAULT 32 literal` + `layoutFor` still `pure` + `initialMetrics null-safe` + `useMemo` deps 5, green
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on layout↔safe-area seam; `rg` allowlists for single `initialWindowMetrics` 2 hits + single `useSyncedLayout` 1 + single `coalesceLayout` 1 + `lastValidLayoutRef` 3 + `DEFAULT_DEBOUNCE_MS` 1, green)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (both via `TSX_TSCONFIG_PATH`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness+valid-path byte-identical, single-constant maintainability, O(1) debounce frame budget, `boardSize never-negative` + `finite` + `0 only degenerate` chain)


## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns layout↔safe-area seam P0 pins (`initialMetrics` string pin + coalesce hold vs replace + hook file-content `setTimeout/lastValid/getBandTop` + `layout.test.ts` 18 regression), ledger `resolution-undo 61d4ee9e` + `sprint-status.yaml` ownership verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `App.tsx` `SafeAreaProvider initialMetrics ?? undefined` + `useSyncedLayout` coalesce+hold wiring, `layout.ts` pure contract preservation (`SAFE_MARGIN 16 / 96/48 / BOARD_SIZE_FLOOR 216 / getBandTop`), legitimate-shrink vs degenerate-hold semantics |
| PM | PM | Signs `DW-6 native polish` posture (no engine/lane/monetization change, no ScrollView, `initialWindowMetrics` already in `~5.7.0` not a store-credential `Block If`), accepts `32 ms` residual latency vs `0→flash` tradeoff, accepts manual simulator rotation gate as waivable `P1` device smoke |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, already green (string pins + pure `coalesceLayout` + 18 layout regression)

**Criteria**: Blocks rotation flash `→0` or first-frame `→0` or `layout.ts` contract drift with no workaround (every portrait↔landscape rotation flows through `AppContent → useSyncedLayout → layoutFor`)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `App.tsx` provides `SafeAreaProvider initialMetrics` so first frame not `0-insets` — `readFileSync(App.tsx) includes 'initialWindowMetrics'` + includes `initialMetrics={initialWindowMetrics` + includes `useSyncedLayout` + does not re-add bare `useWindowDimensions()` without coalesce | Unit (static `readFileSync` string pin) | R-002 | 1 | QA (done) | `triade/__tests__/ui/useSyncedLayout.test.ts:P0` `App.tsx provides…` — matches spec `Verification: npx tsc` + `AC-1 Given App mounts before native insets …` |
| AC — `coalesceLayout` holds last valid `boardSize` when transient `layoutFor` would be `0` — `lastValid=layoutFor({390,844,top47})>0`, `degenerate {320,480,top2000}→0`, `coalesce(degenerate,lastValid)===lastValid.boardSize`, plus valid next `844×390 left47→isLandscape true` replaces not stale | Unit (pure `layoutFor` + local `coalesceLayout`) | R-001, R-003 | 1 | QA (done) | `useSyncedLayout.test.ts:P0` `coalesce helper holds last valid boardSize…` 47 LOC dynamic `import('../../src/ui/layout.ts')` then 4 asserts. |
| AC — synced hook module exports `useSyncedLayout` with debounce + bandTop + last-valid hold — `readFileSync(useSyncedLayout.ts) includes 'export function useSyncedLayout'` + `useWindowDimensions` + `useSafeAreaInsets` + `setTimeout` + `lastValid` + `getBandTop` + `DEFAULT_DEBOUNCE_MS` + `coalesceLayout` | Unit (file-content static pin) | R-001, R-007 | 1 | QA (done) | `useSyncedLayout.test.ts:P0` `synced hook module exports…` 8 include asserts — canonical hook seam contract. |
| AC — `layout.test.ts` 14-P0 (`portrait maximized width-bounded`, `landscape height-bounded`, `thin band collapse`, `sweep 5 sizes maximized`, `golden 414→382`, `golden 1024→688`, `500×580→452`, `two containers different boards`, `never exceeds safe-margin`, `SAFE_MARGIN 16`, `small 320×480 positive`, `extreme 2000×200 thin`, `all finite never-negative`, `degenerate top2000→0`) still green — `layout.ts` contract byte-identical | Unit (existing 18-case suite, P0 slice) | R-003 | 14 | QA (done) | `triade/__tests__/ui/layout.test.ts` 18 tests include `P0` 14 above and `P1` 2+2; `rg -c "test("` + `npx tsc` clean is additional static guard. |
| AC — Manual probe gate from spec I-O `Degenerate insets exceed container` + `Fast double rotation` — `AppContent` holds last valid until coalesced; `width/height` swap one frame before `insets` → debounced coalesce keeps `boardSize>0` | Unit (coalesce degenerate→hold pin) | R-001 | 1 | QA (done) | Covered by coalesce `degenerate→lastValid` pin above plus `layout.test.ts` `degenerate clamp` cross-check; `useSyncedLayout.test.ts` dynamic coalesce inner already simulates stale insets > container. |

**Total P0**: 18 checks (1 App string 3 asserts + 1 coalesce 4 asserts + 1 hook 8 asserts + 14 `layout.test.ts` P0 slice + degenerate extra), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & seam pins

**Criteria**: Important valid-path byte-identical pipeline + medium/high risk + common rotation workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| `coalesceLayout` valid next replaces stale — `layoutFor({844,390,left47 right21}) boardSize>0 && isLandscape true && !==lastValid` | Unit (pure) | R-003 | 1 | QA | Second half of `coalesce helper holds…` test — `coalesced2.boardSize>0 && !==lastValid` + `isLandscape true`. |
| Hook computes `bandTop = getBandTop(synced.insets, effectiveLayout.bandHeight)` — `synced 0↔47` notch change moves `bandTop` by same delta + portrait `bandTop 47+16+96` vs landscape `0+16+48` | Unit (hook file-content) | R-007 | 1 | QA | Already pinned via `getBandTop` include; add one pure `getBandTop({top:47…},96)===159` vs `{top:0…,},48===64` host calculation from `layout.test.ts` `availHeight` helper. |
| `debounceMs <=0` immediate commit branch — `if (debounceMs <=0) { setSynced({width,height,insets}); return; }` present and no dangling `setTimeout` | Unit (file-content) | R-005, R-004 | 1 | QA | `useSyncedLayout.test.ts` third `P0` file already `includes 'setTimeout'` + `includes 'DEFAULT_DEBOUNCE_MS'` — add `rg -n "if \(debounceMs <= 0" triade/src/ui/useSyncedLayout.ts`==1 as allowlist. |
| `pendingRef` + `timerRef` coalesce single commit — effect deps include `width,height,insets.top,bottom,left,right,debounceMs` and clears previous timer before setting new one | Unit (file-content) | R-001, R-004 | 1 | QA | `rg -n "pendingRef.current = " triade/src/ui/useSyncedLayout.ts`==1 + `rg -n "timerRef.current" triade/src/ui/useSyncedLayout.ts`≥4 — two `clearTimeout` + one `= setTimeout` + one `= null`. |
| `DEFAULT_DEBOUNCE_MS = 32` literal singleton | Static scan | R-001, R-005 | 1 | QA | `rg -n "DEFAULT_DEBOUNCE_MS = 32" triade/src/ui/useSyncedLayout.ts`==1 and `rg -n "DEFAULT_DEBOUNCE_MS" triade/src/ui/useSyncedLayout.ts`==3 total (const+param default+check). |
| `initialMetrics` fallback null-safe — `initialWindowMetrics ?? undefined` (not `initialWindowMetrics && …`) so `null` on web/Jest passes `undefined` not crash | Unit (file-content) | R-002 | 1 | QA | `useSyncedLayout.test.ts:P1` `initialMetrics fallback is null-safe` — `includes '?? undefined' \|\| '?? null' \|\| 'initialWindowMetrics'` 1 pin. |
| `layout.test.ts` P1 slice still green: `isLandscape agrees with orientation.isLandscape 4-case` + `per-edge insets bind asymmetrically: horizontal shrinks width-bounded 390→338, vertical shrinks height-bounded 500→…` + `min-tile floor edge 400×250 positive <216` | Unit (P1 3 tests) | R-006 | 3 | QA | `triade/__tests__/ui/layout.test.ts` 18 includes `P1` 3 above (lines `246-315`) — validates `SAFE_MARGIN` per-edge `+ 2*16` accounting still intact after hook. |
| `layoutFor` early non-finite guard unchanged — `if (!Number.isFinite(width) \|\| !Number.isFinite(insets.top) …) return {boardSize:0,…}` still 6-field guard, not `isNaN` or `==null` | Static scan | R-002 | 1 | QA | `rg -n "Number\.isFinite\(width\)" triade/src/ui/layout.ts`==1 + `rg -n "Number\.isFinite\(insets" triade/src/ui/layout.ts`==1; any `Number.isNaN` substitute would be 0 hits. |

**Total P1**: 10 checks (valid-next 1 + `bandTop` 1 + `debounceMs` 1 + coalesce single 1 + `32` literal 1 + null-safe 1 + `layout.test.ts` P1-3 3 + `isFinite` 1), ~0.8–1.6 h host (mostly existing + file-content, no device)

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary scans + low/medium risk + static allowlists + ledger

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-source allowlists — `App.tsx: import { initialWindowMetrics }` 1 + `<SafeAreaProvider initialMetrics` 1 + `export function useSyncedLayout` 1 + `export function coalesceLayout` 1 + `lastValidLayoutRef` 3 + `boardSize === 0` 1 vs duplicate `SafeAreaProvider` wrap 0 | Static scan | R-002, R-009 | 1 | QA | Any second `SafeAreaProvider` JSX is a fail (App already wraps once via `GestureHandlerRootView`). `rg -n "SafeAreaProvider" triade/App.tsx`==2 (import+JSX) not 3. |
| `useMemo` dep array exact — `useMemo(()=>layoutFor(synced),[synced.width, synced.height, synced.insets.top, synced.insets.bottom, synced.insets.left, synced.insets.right])` has 6 deps, not `synced.insets` object identity | Static scan | R-006 | 1 | QA | Object-identity dep would miss `left`/`right` right-notch change on landscape rotation; `rg -n "synced\.insets\.left" triade/src/ui/useSyncedLayout.ts`==1 + `right`==1 is gate. |
| No `ScrollView` reintroduction — `rg -n "ScrollView" triade/App.tsx`==0 (spec `Never` keeps board in plain `View`; deferred `DW-6` ScrollView offset nuance is explicit Blocked) | Static scan | — | 1 | QA | `App.tsx` diff shows `Pressable, StyleSheet, Text, View` import 5 entries, not 6 with ScrollView — `git diff HEAD -- triade/App.tsx` should show `-useWindowDimensions` not `+ScrollView`. |
| Engine/layout isolation — `git diff --stat HEAD -- triade/src/engine` empty + `git diff --stat HEAD -- triade/src/ui/layout.ts` empty (source-of-truth untouched) | Static scan | — | 1 | QA | Keeps `layout.ts` pure seam single-source; `useSyncedLayout` is the only new `triade/src/ui` file, tracked via `ls triade/src/ui/useSyncedLayout.ts`. |
| Ledger `deferred-work.md` DW-6 `done` with `resolution-undo: 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48` 64-hex + decision prefix `Add initialMetrics plus synced hook` | Static scan | R-008 | 1 | QA | `rg -n "DW-6" _bmad-output/implementation-artifacts/deferred-work.md` 1 hit `status: done 2026-09-02` + `rg -n "61d4ee9e5c27" _bmad-output/implementation-artifacts/deferred-work.md`==1 + pipe `| wc -c` 64+2. |
| `sprint-status.yaml` untouched — `git diff --stat HEAD | rg sprint-status` 0 hits | Static scan | R-008 | 1 | QA | Orchestrator-owned per prompt hard constraint; this plan's `git diff --stat` shows `triade/App.tsx` + `triade/src/ui/useSyncedLayout.ts` + `triade/__tests__/ui/useSyncedLayout.test.ts` + `_bmad-output/implementation-artifacts/deferred-work.md` + `spec-dw-6-rotation-race-safe-area-initial-metrics.md` but NOT `sprint-status.yaml`. |

**Total P2**: 6 checks, ~0.6–1.2 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — fast double rotation within `32 ms` window coalesces to final `844×390` landscape only, no intermediate `390×844` flash — simulate `pendingRef` double-set then single `setSynced` after `32 ms` | Unit (host `node --import tsx`) | 1 | QA | Use fake timers: two `useEffect` fires with `width 844→390→844` and `insets.top 0→47` within `30 ms` → `setSynced` call count 1 not 2 via `rg -n "clearTimeout\(timerRef"` path; waive if file-content pin suffices. |
| Exploratory — `width/height NaN` non-finite still never-negative — `layoutFor({width:NaN,height:844,insets:ZERO}) →0 never-negative` through synthesized hook vs direct `layoutFor` early-return | Unit | 1 | QA | `layout.test.ts` degenerate top 2000 already pins `never-negative`; extend with `Number.isFinite` guard 6-field check; no throw even via hook. |
| Exploratory — duplicated `coalesceLayout` local mock inside `useSyncedLayout.test.ts` stays in sync with exported helper — both hold `degenerate→lastValid` and replace `valid→new` | Unit (host comparison) | 1 | QA | Test file defines inline `function coalesceLayout(pending,lastValid){const nxt=layoutFor(pending); if(nxt.boardSize===0 && lastValid && lastValid.boardSize>0) return lastValid; return nxt;}` — same 1-line predicate as exported; diff should show no drift. |
| Micro-bench — `coalesceLayout` 10k× random `pending` (portrait→landscape→degenerate) median `<0.01 ms` + `useSyncedLayout` render 10k× `useMemo layoutFor` overhead not doubling effective frame — debounce still O(1) per rotation | Unit (bench) | 1 | DEV | Keep `feel.bench.test.ts` both-profile `<16.7 ms` gate; guard adds `<0.001 ms` per coalesce — iterate `for(0..10000) coalesceLayout(randomPending, lastValid)` wall check only, not a new bench lane. |

**Total P3**: 4 checks, ~0.4–0.8 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch provider/layout drift before full gate

- [ ] `npm --prefix triade test -- triade/__tests__/ui/layout.test.ts triade/__tests__/ui/useSyncedLayout.test.ts` green on clean working tree (18 layout + 4 synced = 22 pass) — includes `SAFE_MARGIN 16` 1 + `PORTRAIT 96`/`LANDSCAPE 48` 1 + `degenerate top2000→0` 1 + `initialMetrics` 1 + `coalesce degenerate→hold` 1 + `hook 8-include` 1 (60 s)
- [ ] Single-command probe from P0: `node --loader tsx -e "import{layoutFor}from './triade/src/ui/layout.ts'; function coalesce(p,lv){const n=layoutFor(p); if(n.boardSize===0 && lv && lv.boardSize>0) return lv; return n;} const lv=layoutFor({width:390,height:844,insets:{top:47,bottom:34,left:0,right:0}}); const raw=layoutFor({width:320,height:480,insets:{top:2000,bottom:0,left:0,right:0}}); console.log('last',lv.boardSize,'raw',raw.boardSize,'hold',coalesce({width:320,height:480,insets:{top:2000,bottom:0,left:0,right:0}},lv).boardSize,'valid',coalesce({width:844,height:390,insets:{top:0,bottom:0,left:47,right:21}},lv).isLandscape)"` — expect `last >0 raw 0 hold ==last valid true` (30 s)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore`, `initialWindowMetrics|null → undefined` typed) (45 s)
- [ ] `rg -n "initialWindowMetrics" triade/App.tsx | wc -l` ==2 and `rg -n "SafeAreaProvider" triade/App.tsx | wc -l` ==2 and `rg -n "ScrollView" triade/App.tsx | wc -l` ==0 and `rg -n "useSyncedLayout" triade/App.tsx | wc -l` ==2 (import+call) and `rg -n "DEFAULT_DEBOUNCE_MS = 32" triade/src/ui/useSyncedLayout.ts | wc -l` ==1 (30 s)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical rotation-race guards (host only)

- [ ] `App.tsx` `initialMetrics` 3-include string pin (`initialWindowMetrics` import + `initialMetrics={initialWindowMetrics ?? undefined}` + `useSyncedLayout` co-presence)
- [ ] Coalesce `degenerate→hold` + `valid→replace` (2+2 asserts) via `useSyncedLayout.test.ts` second `P0`
- [ ] Hook file-content 8-include pin (`useWindowDimensions`+`useSafeAreaInsets`+`setTimeout`+`lastValid`+`getBandTop`+`DEFAULT_DEBOUNCE_MS`+`coalesceLayout`+`export function useSyncedLayout`)
- [ ] `layout.test.ts` P0-14 still green (90% of contract; `golden 382 / 688 / 452` anchors catch regressions)

**Total**: 18 P0 checks (already passing on working tree — 4 synced file probes + 14 layout anchors)

### P1 Tests (<30 min)

**Purpose**: Seam wiring + lattice math

- [ ] Coalesce valid-next not stale `844×390 left 47 right 21` + `bandTop 47+16+96 vs 0+16+48` + `debounceMs<=0` branch ==1
- [ ] `pendingRef/timerRef` 4+ hits + `DEFAULT 32` 3 hits + `useMemo` 6 deps ==6 + `Number.isFinite 6-field` 1
- [ ] `layout.test.ts` P1-3 still green: `isLandscape agrees` + `per-edge asymmetric 390→338` + `400×250 <216 floor fallback`
- [ ] `rg -n "lastValidLayoutRef" triade/src/ui/useSyncedLayout.ts` ==3 + `rg -n "boardSize === 0" triade/src/ui/useSyncedLayout.ts` ==1

**Total**: 10 P1 checks (existing + file-content, no device)

### P2/P3 Tests (<60 min)

**Purpose**: Full regression + exploratory

- [ ] Single-source allowlists 6 (provider 2 + hook 1 + coalesce 1 + `lastValid` 3 + `boardSize===0` 1 + `DEFAULT 32` 1 + `ScrollView 0` 0 + `engine empty` 1 + `ledger 61d4ee9e` 1)
- [ ] Fast double-rotation single-commit + `NaN` still never-negative + inline `coalesce` vs exported helper drift check + bench `<0.01 ms`

**Total**: 10 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 18 | 0.15 | ~2.7–4.2 | 14 `layout.test.ts` green + 4 `useSyncedLayout.test.ts` file pins already landed; string pins <1 s each |
| P1 | 10 | 0.2 | ~2.0–3.2 | Coalesce valid-next + `bandTop` + `debounceMs` + `pendingRef/timerRef` + `DEFAULT` + `isFinite` scans, no device lane |
| P2 | 6 | 0.25 | ~1.5–2.4 | Allowlist + `sprint-status` ownership + `ledger 61d4ee9e` + isolation scans, doc hashes |
| P3 | 4 | 0.1 | ~0.4–0.8 | Fast double-rotation + NaN fallback + drift + bench exploratory, runs waivable if gate red |
| **Total** | **38** | **-** | **~6.6–10.6** | **~0.9–1.4 days** host-only; coalesce `10k×` bench `<0.01 ms` not double-counted in lane |

### Prerequisites

**Test Data:**

- `390×844 portrait top 47 bottom 34` + `844×390 landscape left 47 right 21` + `320×480 degenerate top 2000→0` + `400×250 floor edge` + `414×896→382 / 1024×768→688 / 500×580→452` golden anchors (all P0 fixtures already in `layout.test.ts` and `useSyncedLayout.test.ts` local coalesce)
- `ZERO_INSETS 0,0,0,0` + `PORTRAIT_NOTCH/LANDSCAPE_NOTCH` frozen fixtures

**Tooling:**

- `node --import tsx --test` host harness (no Playwright needed — layout is TS-only)
- `tsx` + `tsconfig.test.json` via `TSX_TSCONFIG_PATH` for `npx tsc --noEmit`
- `rg` as pin engine (all 6-field `Number.isFinite` / `boardSize===0` / `initialMetrics` allowlists)
- `react-native-safe-area-context ~5.7.0` upstream types for `initialWindowMetrics: Metrics|null` (no new install)

**Environment:**

- `triade/` host `node 22+` with `react-native` mocked by Jest `transformIgnorePatterns` not needed for host (pure `layout.ts` + file pins), `triade/package.json` `expo ~57.0.0` not exercised
- Manual simulator rotation (`iOS Simulator` portrait→landscape→portrait) remains waivable `P1` device smoke per spec `Manual checks (if no CLI): Simulator rotation: board never flashes to 0 or white gap` — capture 3-sec screen recording as gate evidence, no native build lane beyond `expo prebuild --platform ios` already `done` at `HEAD a1f6831` (DW-15 simulator boot validated)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — rotation flash or `layout.test.ts` regression is a hard fail)
- **P1 pass rate**: ≥95% (waivers required for failures — e.g. `useSyncedLayout.test.ts` mock shape drift is fixable but not blocking engine)
- **P2/P3 pass rate**: ≥90% (informational — ledger hash or `sprint-status.yaml` hygiene, not layout correctness)
- **High-risk mitigations**: 100% complete or approved waivers (R-001/R-002/R-003 each `done` with owner `FE lead` + `Immediate`)

### Coverage Targets

- **Critical paths**: ≥90% (every `layoutFor` contract path + coalesce branch + `App.tsx` provider slice)
- **Security scenarios**: N/A (no auth boundary this sweep)
- **Business logic**: ≥80% (layout seam is UX-polish but lane is business-correct — gap 20% is the legit manual rotation film)
- **Edge cases**: ≥70% (`degenerate→hold`, `valid→replace`, `NaN` non-finite, `fast double rotation`, `foldable stale-hold` documented)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`initialMetrics` 3 includes + coalesce hold/replace + hook 8 includes + `layout.test.ts` 18 green)
- [ ] No high-risk (≥6) items unmitigated (R-001 coalesce `32 ms` + `lastValid` + device film, R-002 `null-safe` + web fallback still `>0`, R-003 stale-hold only on `boardSize===0` documented)
- [ ] Security tests (SEC) pass 100% — N/A this sweep, but `SEC` legend stays `none` (no `a11y` bypass)
- [ ] Performance targets met (`npm test` layout 22 pass `<2 s`, `npx tsc both` `0 errors`, `DEFAULT 32` debounce not inflating frame `median <16.7 ms`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness 18+4, maintainability 6+ single-source scans, correctness golden+floor, performance `<16.7 ms`, offline `~5.7.0` no new dep)

---

## Mitigation Plans

### R-001: Rotation coalesce window `32 ms` insufficient for slow `useSafeAreaInsets` on Android — still flashes `0` (Score: 6)

**Mitigation Strategy:**
1. Land working-tree `useSyncedLayout` with `pendingRef`+`timerRef` coalesce `32 ms` + `lastValidLayoutRef` guard as baseline (already in working tree — `triade/src/ui/useSyncedLayout.ts:28-52`).
2. Host-pin degenerate→hold and valid→replace via `coalesceLayout` 4-assert `P0` (`useSyncedLayout.test.ts` second `test`).
3. Static-pin `DEFAULT_DEBOUNCE_MS = 32` as literal singleton + `setTimeout` 2 hits + `clearTimeout` 2 hits.
4. Run waivable `P1` device smoke: iOS simulator portrait→landscape→portrait 3-sec clip proving no white gap; if Android slow insets observed in CI device farm, bump `DEFAULT_DEBOUNCE_MS` to `48` without changing P0 probes (spec allows `32-64 ms`).

**Owner:** FE lead
**Timeline:** Immediate (pre-merge gate, blocks flash until mitigated; if device clip missing, mark `CONCERNS` not `PASS` at `nfr-assess`)
**Status:** Planned → verify via `npm --prefix triade test -- __tests__/ui/useSyncedLayout.test.ts __tests__/ui/layout.test.ts` 22 pass
**Verification:** `rg -n "DEFAULT_DEBOUNCE_MS = 32" triade/src/ui/useSyncedLayout.ts`==1 + `rg -n "setTimeout" triade/src/ui/useSyncedLayout.ts`==2 + coalesce `degenerate 2000→hold` assertion + device clip as `P1` waiver evidence.

### R-002: `initialMetrics` null/undefined fallback mismatch — first frame still `0` on web/SSR/Jest (Score: 6)

**Mitigation Strategy:**
1. Provider is `import { initialWindowMetrics } from 'react-native-safe-area-context'` + `<SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>` — covers `Metrics` when native already measured (real device first frame correct) and `null`→`undefined` safe on web/Jest.
2. Prove `0-insets` still yields `boardSize>0` in pure math via `layoutFor({390,844,ZERO}) === 358 >0` + `layout.test.ts` `SAFE_MARGIN 16` pin (so web fallback does not flash to `0`, only slightly oversized for ≤2 frames).
3. String-pin null-safety in P1 (`includes '?? undefined' || '?? null'`).

**Owner:** FE lead
**Timeline:** Immediate (gate DW-6; first-frame flash is user-visible)
**Status:** Planned → verify via `__tests__/ui/useSyncedLayout.test.ts` `initialMetrics fallback is null-safe`
**Verification:** `rg -n "initialWindowMetrics" triade/App.tsx`==2 + `rg -n "initialMetrics" triade/App.tsx`==1 + `layoutFor({320,480,ZERO}).boardSize>0` host assertion.

### R-003: Stale `lastValid` retention prevents legitimate shrink (Score: 6)

**Mitigation Strategy:**
1. Guard is narrow: `if (raw.boardSize===0 && lastValid.boardSize>0) return lastValid` — any `raw>0` (even `216` floor) overwrites `lastValid` with new smaller size, so genuine `400×250→170` shrink applies.
2. Host-pin `coalesceLayout({400,250,ZERO}, largeLastValid) < largeLastValid.boardSize` proves not stale.
3. Document that `0` stale-hold is transient-race polish, not resize semantics — if a foldable product requires `0`-container to show `0` not stale, file a follow-on spec that narrows hold to `Date.now()-commitAge < debounceMs` window.

**Owner:** FE lead
**Timeline:** Immediate (documented residual, not a blocker unless foldable enters scope)
**Status:** Planned → verify via `useSyncedLayout.test.ts` valid-next `boardSize>0 && !==lastValid` assert + `layout.test.ts` `400×250 <216` floor proves shrink path.
**Verification:** `rg -n "lastValidLayoutRef" triade/src/ui/useSyncedLayout.ts`==3 + `rg -n "rawLayout.boardSize === 0" triade/src/ui/useSyncedLayout.ts`==1.

---

## Assumptions and Dependencies

### Assumptions

1. `initialWindowMetrics` being `null` only occurs on web/SSR/Jest, never on a production iOS/Android `SafeAreaProvider` mount where native has already measured before JS thread — so `?? undefined` not `?? {frame:{width,height}, insets:ZERO}` is safe; if native delays, `lastValid` covers 1-frame flash.
2. `400×250` floor edge `layoutFor 400×250 ZERO → 170 <216` proves shrink path still replaces `lastValid` — `0`-hold does not swallow legitimate resizes.
3. `DEFAULT_DEBOUNCE_MS 32` is inside spec `32-64 ms` window and at threshold of one `requestAnimationFrame` (~16 ms) + safety; if device farm shows Android insets `>32 ms` late, assumption 1 above + `lastValid` still prevents `0` flash and only `oversized 32 ms` remains (acceptable polish).
4. `sprint-status.yaml` is orchestrator-owned and not to be written even though spec review log bumps it to `8-3 done` style — this workflow treats `done` transitions there as bookkeeping, not evidence.

### Dependencies

1. `react-native-safe-area-context ~5.7.0 initialWindowMetrics` stable export — required by `2026-09-02` (no upgrade to `6.x` before this merge, avoids `initialMetrics` rename). Provides `Metrics|null` at import time.
2. `triade/src/ui/layout.ts` byte-identical pure — required by `2026-09-02` (no `SAFE_MARGIN`/`BOARD_SIZE_FLOOR`/`isLandscape` contract drift before this merge).
3. `triade/__tests__/ui/layout.test.ts` 18 host cases remain green — required by `2026-09-02` (no ATDD tightening out of scope that would change `degenerate→0` clamp post-merge).
4. iOS simulator rotation 3-sec clip — required by `2026-09-02` (waivable to `P1` `CONCERNS` at `nfr-assess`, not a merge blocker unless `boardSize 0` still observed).

### Risks to Plan

- **Risk**: `DEFAULT 32` proves too short on Android 12 safe-area bridge where insets settle `80-100 ms` after rotation.
  - **Impact**: Coalesced commit carries `stale 47+34 vs real 0+0+47+21`, so `boardSize` off by `47` pts for one commit before correcting on next coalesced commit (visible size wobble, not `0`).
  - **Contingency**: Raise to `48` or switch to `requestAnimationFrame` double-tick coalesce (`setTimeout(0)` after `insets` microtask) without altering `layout.ts` or `lastValid` — only `DEFAULT_DEBOUNCE_MS` constant + `useSyncedLayout.test.ts` literal 32→48.

- **Risk**: A future contributor removes `useSyncedLayout` from `AppContent` and reverts to direct `useWindowDimensions`+`useSafeAreaInsets` for brevity.
  - **Impact**: Rotation flash `→0` resurrects, no compile error — only `P0` string pin catches it.
  - **Contingency**: Keep the `rg -n "useSyncedLayout" triade/App.tsx ==2` allowlist in `P2`; CI `rg` gate fails the PR that removes it.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **triade/src/ui/layout.ts** (pure) | Not rewritten — `layoutFor` + `getBandTop` + `isLandscape` unchanged, but this plan gates its contract (degenerate→0 vs finite sweep + golden anchors) as the single source of truth for board size. | Existing `triade/__tests__/ui/layout.test.ts` 18 must pass before release (golden `382/688/452` + floor `216` + `SAFE_MARGIN 16` + `320×480 top 2000→0` + sweep). `rg -n "function layoutFor" triade/src/ui/layout.ts`==1 + `rg -n "getBandTop" triade/src/ui/layout.ts`==1. |
| **triade/src/ui/orientation.ts** | `isLandscape w>h` still single source, consumed by `layoutFor` + by hook's `effectiveLayout.isLandscape` (via `layoutFor`). | `layout.test.ts` `isLandscape agrees with orientation` 4-case + `rg -n "return width > height" triade/src/ui/orientation.ts`==1 must pass. |
| **triade/src/render/GameBoard** (Skia/Reanimated) | Consumes `boardSize` + `bandTop` + `width/height` via `AppContent → GameBoard` props — not modified but its `boardSize` prop no longer flashes `0`, so no `Animated.View` jank or `SkiaSurface` remeasure. | Existing `__tests__/feel` + `benchmarks/feel.bench` not bumped; `npx tsc --noEmit` keeps `GameBoard` props typed (`boardSize number` finite). |
| **Game move/feel/leo pipeline** | Unchanged — no `triade/src/engine` diff. | `npm --prefix triade test` full `914` pass baseline `a1f6831` must stay; this plan's smoke is `22/22` layout slice (not full engine), so keep full gate as pre-merge `P1`. |
| **Deferred-work ledger `deferred-work.md`** | DW-6 `done` + `decision` + `resolution-undo 61d4ee9e…` + one `spec-dw-6…` file added. | `rg -n "DW-6" _bmad-output/implementation-artifacts/deferred-work.md` 1 + `rg -n "61d4ee9e5c27" deferred-work.md`==1 + `git diff --stat` shows `deferred-work.md` but NOT `sprint-status.yaml` (owner gate). |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework (`TECH/SEC/PERF/DATA/BUS/OPS`, `owner/timeline`, `P×I` 1-9, `≥6 mit` + `=9 block`)
- `probability-impact.md` — Risk scoring methodology (`1 unlikely/standard 2 possible/edge 3 likely` × `1 minor 2 degraded 3 critical` → `DOCUMENT 1-3 MONITOR 4-5 MITIGATE 6-8 BLOCK 9`, `requiresMitigation ≥6 isCriticalBlocker ===9`)
- `test-levels-framework.md` — Test level selection (`E2E` critical path only, `API` business logic, `Component` UI, `Unit` edge)
- `test-priorities-matrix.md` — `P0-P3` prioritization (`P0 blocks core + ≥6 + no workaround, P1 important+3-4+common, P2 secondary+1-2+edge, P3 exploratory+benchmark`)

### Related Documents

- PRD: n/a (polish sweep, not PRD-tracked; spec self-contained)
- Epic: n/a (`DW-6` is deferred-work bundle, not epic-tracked; ledger `deferred-work.md` entry provides contract)
- Architecture: `triade/src/ui/layout.ts` (pure) + `_bmad/tea/config.yaml` (`test_artifacts _bmad-output/test-artifacts`, `test_design_output _bmad-output/test-artifacts/test-design`, `risk_threshold p1`)
- Spec: `_bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md` (intent/boundaries/I-O 4 rows/code map 5 sites/tasks 4)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-6 `triade/App.tsx:28-30,103` + decision field)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 6.10 (BMad v6, TEA `test_design_output _bmad-output/test-artifacts/test-design`, `risk_threshold p1`)
