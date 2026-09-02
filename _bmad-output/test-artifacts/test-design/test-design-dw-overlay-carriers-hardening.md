---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/layout.ts'
  - 'triade/test-utils/rn-stub.ts'
  - 'triade/__tests__/ui/components/gameOverOverlay.test.ts'
  - 'triade/__tests__/ui/components/overlayCarriers.integration.test.ts'
  - '_bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-overlay-carriers-hardening — GameOverOverlay reactive reducedMotion + clampInset + overflow ellipsize + zIndex layering (DW-91, DW-92, DW-101, DW-102)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-overlay-carriers-hardening`
**Scope:** Targeted test design for the working-tree delta of `dw-overlay-carriers-hardening` (DW-91, DW-92, DW-101, DW-102)

> **Delta under assessment:** Commit `67a1b51 fix(ui): harden GameOverOverlay carriers (DW-91/92/101/102)` vs baseline `58e036c` — 3 tracked files (+ spec) `410 insertions / 14 deletions`:
> - `triade/src/ui/GameOverOverlay.tsx:40-44` — NEW `const clampInset = (v: unknown): number => (Number.isFinite(v as number) && (v as number) >= 0 ? (v as number) : 0)` + `padTop/Bottom/Left/Right = clampInset(insets?.top/bottom/left/right) + SAFE_MARGIN (16)` replacing `insets?.top ?? 0` direct passthrough (DW-92/DW-102).
> - `triade/src/ui/GameOverOverlay.tsx:52-83` — `useRef(new Animated.Value(reducedMotion ? 1/0 …))` kept but `useEffect` now reactive: `scrimOpacity.stopAnimation(); contentOpacity.stopAnimation(); contentY.stopAnimation();` preamble, `if (reducedMotion) { setValue(1/1/0); return; }`, else `setValue(0/0/12)` then `Animated.parallel([timing→1 delay80,…]).start()` with `FADE_MS 280 / delay 80 / Easing.out(Easing.cubic) / useNativeDriver:true`; cleanup `anim.stop(); stopAnimation×3`; deps `[reducedMotion, scrimOpacity, contentOpacity, contentY]` (DW-91/DW-102).
> - `triade/src/ui/GameOverOverlay.tsx:94-118` — All 5 value `Text` now `numberOfLines={1} ellipsizeMode="tail"` (was bare `Text`) — score/best/maxTile/merges/longestStreak (DW-101).
> - `triade/src/ui/GameOverOverlay.tsx:190-215` — `label {flexShrink:0}`, `value/valueRecord {flexShrink:1, textAlign:'right'}` (was no `flexShrink`, no `textAlign`) (DW-101).
> - `triade/src/ui/GameOverOverlay.tsx:169-177`, `GameOverOverlay.tsx:180` — unchanged contracts: `overlay {position:absolute, zIndex:2, elevation:2, backgroundColor:rgba(12,14,17,0.7), justifyContent:center, pointerEvents auto}`; a11y `View accessible alert` + `Pressable` CTA siblings; `HIT_TARGET` 44pt; `FADE_MS 280` preserved.
> - `triade/__tests__/ui/components/overlayCarriers.integration.test.ts:1-250` — NEW 4×P0 integration cases `[P0] zIndex 2 > Hud 1`, `[P0] insets clamp degenerate`, `[P0] overflow guard numberOfLines/flexShrink`, `[P0] reducedMotion reactive + unmount mid-fade` via `react-test-renderer` + `triade/test-utils/rn-stub.ts` Animated stub (`_value/setValue/stopAnimation/timing/parallel`).
> - `_bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md:1-126` — NEW spec — intent contract (4 carriers), boundaries (`Always` component-local + RN Animated/Easing only / `Block If` reanimated/skia / `Never` engine/layout import), 5-row I/O matrix (toggle mid-fade, degenerate insets, huge score, unmount mid-fade, zIndex layering), code map (`GameOverOverlay.tsx:1-279`, `Hud.tsx:169-177`, `layout.ts:4`, `rn-stub.ts:22-67`), tasks & AC (5 checkboxes), verification (`tsc`, `node --import tsx --test`, `npm test 960 pass`).
> - `_bmad-output/implementation-artifacts/deferred-work.md:784,794,879,889` — 4 ledger entries flipped `open → done 2026-09-02` (`DW-91 reducedMotion stale`, `DW-92 insets edge`, `DW-101 overflow`, `DW-102 zIndex/unmount carriers`) with `resolution: resolved by sweep bundle dw-overlay-carriers-hardening` + `resolution-undo: 596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce` 64-hex per entry; grouped as 2 hunks (`git diff HEAD -- deferred-work.md` 4→16 lines).
> - `sprint-status.yaml` is **orchestrator-owned** and intentionally not in scope — no write, no revert (`git diff HEAD -- sprint-status.yaml` must stay empty).

---

## Executive Summary

**Scope:** Close four low-severity brittle carriers in `GameOverOverlay` that were comment-only/deferred or manual-only and are now component-local-hardened in one pass. Before the sweep, `useRef(Animated.Value(reducedMotion ? 1:0))` captured only the first mount, so a `reducedMotion` toggle (`false→true→false`) mid-fade left stale `scrimOpacity/contentOpacity/contentY` in the wrong `toValue` without `stopAnimation/setValue`; `insets?.top ?? 0` propagated `NaN/-20/Infinity/undefined` as `paddingTop` on rotation/tablet edge; `score >1e9` rows (`row space-between`) wrapped without `flexShrink/numberOfLines` so `"1999999999"` pushed the label off-screen; and `zIndex:2` vs `Hud zIndex:1` layering plus unmount mid-fade cleanup was never pinned by an integration render. The sweep confines all fixes to `triade/src/ui/GameOverOverlay.tsx` plus one integration test file, adding a `clampInset` helper with `Number.isFinite && >=0` gate and `+SAFE_MARGIN` per edge, a reactive `useEffect` that `stopAnimation`s, `setValue`s to the correct start, animates `280/80/cubic/useNativeDriver`, and cleans `anim.stop()+stopAnimation×3` on unmount, and `numberOfLines=1 ellipsizeMode="tail" flexShrink:1 textAlign:right` on all value Texts with `label flexShrink:0`. Scrim `rgba(12,14,17,0.7)`, `zIndex:2/elevation:2/pointerEvents auto`, `HIT_TARGET`, and a11y `accessible alert + Pressable` remain byte-identical; `triade/src/engine/**` stays byte-identical.

**Risk Summary:**

- Total risks identified: 11
- High-priority risks (≥6): 3 (reducedMotion reactive + stop/anim race on toggle mid-fade; insets degenerate but Hud asymmetry leaves visual drift; overflow ellipsize + flexShrink vs label minWidth on narrow + i18n)
- Critical categories: TECH (animation stop/restart + deps + stub vs real driver + zIndex/elevation dual + unmount leak), BUS (overflow row space-between on `>1e9` + record gold highlight still flexed), DATA (insets NaN/Infinity clamp + SAFE_MARGIN preserve), OPS (ledger 64-hex `596c2f86…`)

**Coverage Summary:**

- P0 scenarios: 8 groups (clamp `NaN/-20/Infinity/undefined` all 4 paddings finite `>=SAFE_MARGIN`, bare `insets as any` → `SAFE_MARGIN`, reducedMotion `false→true` snap `1/1/0` + `true→false` reset+animate `1`, unmount mid-fade `doesNotThrow` + remount `Jogar de novo` CTA, zIndex `2>1` + `position:absolute` + `pointerEvents auto`, overflow `numberOfLines=1 ellipsizeMode tail flexShrink:1` on `1999999999` Texts, `row space-between` not overflowing label, `elevation 2>1`)
- P1 scenarios: 6 groups (reactive effect deps `reducedMotion` + `stopAnimation/setValue(0|1)` source pins, clamp edge `0/-0.1/Number.MAX_VALUE`, animated timing `FADE_MS 280 / delay 80 / Easing.out(cubic) / useNativeDriver:true`, value flex `textAlign:right` + label `flexShrink:0`, Hud zIndex asymmetry documented, a11y `accessible alert` still siblings CTA)
- P2/P3 scenarios: 5 groups (ledger `resolution-undo 596c2f86…` 64-hex, Hud `insets.top + SAFE_MARGIN` not clamped — drift probe, exploratory narrow-width + Portuguese longest label + manual VoiceOver, `tsc` both tsconfigs)
- **Total effort**: ~2.5–4.8 hours (~0.3–0.7 day; host-only `node:test` + `react-test-renderer` + `tsc --noEmit`, no device lane — pure `triade/src/ui/GameOverOverlay.tsx` + `triade/test-utils/rn-stub.ts` + `layout.ts SAFE_MARGIN 16`, `npm test -- triade/__tests__/ui/components/overlayCarriers.integration.test.ts` + `npm test` full gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score/spawn/ceiling/tier/pot, `layout.ts` `layoutFor/boardSize` 0 floor, `Board`/`TransitionPlan`/`GameBoard` Skia rendering, `matchScore` record logic, `mulberry32`/`weights`/`potForTier`, `App.tsx` wiring beyond `insets={insets}` passthrough, `HIT_TARGET`/`SAFE_MARGIN` derivation, `Hud.tsx` band math (`getBandTop`), Skia `useSharedValue`/`cell` retarget, `PreviewCard`/`preview.ts` 60/40 logic** | No file in the delta modifies engine rules, weights, ceiling, pot, stats, render, or preview. `git diff HEAD -- triade/src/engine` empty (0 hunks); `triade/src/ui/layout.ts` byte-identical except `SAFE_MARGIN` consumed by overlay (already `16`). `GameOverOverlay` is presentation-only thin-view; score/matches values are `String(stats.score)` stringified at render time, no score math changed. | Existing `npm test` full gate (`960 pass / 366 skipped` per last bundle log) stays invariant; `game.test.ts`/`line.test.ts`/`spawn.test.ts`/`ceiling.test.ts`/`engine.purity` not in delta — any regression would be caught by baseline. This plan only checks `rg -n "src/engine"` 0 hits in overlay diff + `rg -n "SAFE_MARGIN" GameOverOverlay.tsx ==5` (import + 4 pads). |
| **Changing overlay to `reanimated`/`skia`, moving overlay mount in `App.tsx`, adding `expo-haptics`/`reanimated`/`skia` deps, changing scrim `rgba(12,14,17,0.7)` final or `zIndex/elevation/pointerEvents` contracts, changing `Board`/`Hud` layout containers (band height 96/48), adding new celebration/copy strings for overlay** | Spec boundary `Block If: Need to move overlay to reanimated/skia, change App.tsx wiring, or add new runtime deps` + `Always: keep scrim rgba(12,14,17,0.7) final + zIndex:2/elevation:2/pointerEvents auto + HIT_TARGET + a11y contracts byte-identical; use RN Animated/Easing only` — this sweep intentionally stays `react-native Animated/Easing` and component-local. `App.tsx` is not in `--stat` (no hiring/deps drift). | Pinned via `rg -n "reanimated|skia" triade/src/ui/GameOverOverlay.tsx ==0` + `rg -n "rgba\(12,14,17,0\.7\)"` 1 hit + `rg -n "zIndex:\s*2" GameOverOverlay.tsx ==1` + `rg -n "pointerEvents" ==1` (`auto`) + `rg -n "HIT_TARGET" ==1` (CTA). Any new dep outside `Animated/Easing/Pressable/StyleSheet` is FAIL. |
| **Persisting `reducedMotion` to store / wiring to `AccessibilityInfo` / store-backed derived value, changing `insets` source (`SafeAreaProvider`/`useSafeAreaInsets`) or adding `initialMetrics`** | Spec `Never: create store-backed reducedMotion wiring (keep prop)` — `reducedMotion?` stays optional prop, no `AsyncStorage`/`SecureStore` hit, no `AccessibilityInfo` listener. `insets` stays required `EdgeInsets {top,bottom,left,right}` with defensive `insets?.field` for bare `as any` tests; source remains `useSafeAreaInsets` from `App.tsx` passed as `insets={insets}` (same as `Hud`). | Pinned via `rg -n "reducedMotion" GameOverOverlay.tsx` == `useRef` + `useEffect` + deps (3 hits) and no `AsyncStorage`/`AccessibilityInfo` import; `rg -n "insets" GameOverOverlay.tsx` 5 hits (`clampInset(insets?.top…)` ×4 + type), `rg -n "useSafeAreaInsets" triade/src/ui/GameOverOverlay.tsx ==0` (only `App.tsx` owns insets). |
| **Board `role="grid"` a11y semantics, dev-build physical device, frame-rate `p99 <16.7 ms` bench, AdMob/RevenueCat/Billing, Epic 9-11 monetization, `PreviewCard` chrome beyond `flexShrink` row fix** | No a11y/bench/ads code touched beyond `overlayCarriers.integration` render pins; overlay already `accessible alert` grouped stats + sibling `Pressable` (D1 fix) — no new `role="grid"` work. | Existing suites + manual-validation domain remain; this plan only checks a11y alert still present via `rg -n "accessibilityRole.*alert" GameOverOverlay.tsx ==1` and CTA `accessibilityLabel J...` present after remount. |
| **Editing `sprint-status.yaml` or deferred-work beyond the 4 DW entries `DW-91/92/101/102` (`open → done 2026-09-02` with `resolution-undo: 596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce`)** | `sprint-status.yaml` is orchestrator-owned (`never write it, and never revert` per prompt). `deferred-work.md` change is exactly 4 entries flipped `open → done 2026-09-02` with single 64-hex hash per entry (duplicated decision line is 2 lines per DW in diff). | This plan never writes `sprint-status.yaml`; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in CI. Ledger verified via `rg -n "596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce" deferred-work.md` exactly 4 occurrences + `rg -n "resolution-undo" deferred-work.md` health. |
| **Hud `insets` clamp (Hud.tsx still `insets.top + SAFE_MARGIN` unclamped)** | Hud `triade/src/ui/Hud.tsx:59-62` still does `const topPad = insets.top + SAFE_MARGIN` with no `Number.isFinite` gate — harder to harden Hud without touching `layout.ts` `getBandTop` contract, so overlay hardening is intentionally asymmetric (overlay clamped, Hud not). Drift is `P1` probe, not `P0` fail — overlay safe, Hud visual misalignment on degenerate inputs is documented as P2 risk. | This plan documents Hud asymmetry: `rg -n "clampInset" triade/src/ui/Hud.tsx ==0` vs `triade/src/ui/GameOverOverlay.tsx ==1` (def) + `pad.*clampInset` ==4 (uses). Any future Hud hardening copies `clampInset` pattern; until then P2 `rg` drift probe stays green on overlay side. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `GameOverOverlay` is a pure function `(stats, isNewRecord, onRestart, insets, reducedMotion, activeLaneId, canContinue…) → ReactTree` with no `expo-*`/`Skia`/`Reanimated` deps. All carriers are controllable via literal fixtures: `insets: {top: NaN, bottom:-20, left: Infinity, right: undefined as any}` degenerate edges; `stats: {score:1999999999,best:1999999999,…}` huge score; `reducedMotion: false/true` toggle via `renderer.update(React.createElement(GameOverOverlay, {…reducedMotion:true}))`; unmount via `renderer.unmount()` inside `act()`. `SAFE_MARGIN 16` from `triade/src/ui/layout.ts:4` is deterministic additive constant; host `node --import tsx --test` + `react-test-renderer` drives all cases without Expo dev build. Animated surface is fully controllable: `rn-stub.ts` `Animated.Value` exposes `_value/setValue/stopAnimation` + `Animated.timing→setValue(toValue)` immediately + `parallel` `start/stop`, so `true` snap vs `false` reset+animate is observable via `_value` on style `opacity: scrimOpacity` (`Animated.Value`) and `transform:[{translateY: contentY}]`.

**Observability — Good, host-inspectable without pixels.** `insets` clamp is observable via `collectStyles(renderer)` layer scan for `paddingTop/paddingBottom/paddingLeft/paddingRight` — every hit must be `Number.isFinite(v) && v >= SAFE_MARGIN (>=16)` and never `NaN/Infinity/<0`; bare `GameOverOverlay` as `any` without `insets` must still emit `paddingTop === SAFE_MARGIN`. Overflow guard is observable via two layers: props `node.props.numberOfLines===1 && ellipsizeMode==="tail"` on every value `Text` matching `String(1999999999)`, and style `flexShrink:1` on `value/valueRecord` stylesheet entries (`color #1a1d23/#E8A33D`). Source-level pins `src.includes('clampInset') && src.includes('Number.isFinite')` + `src.includes('numberOfLines') && src.includes('ellipsizeMode')` + `src.includes('flexShrink: 1')` complement renderer checks but alone would miss runtime drift. zIndex layering is observable by mounting `Hud` (zIndex:1) + `GameOverOverlay` (zIndex:2) in one `TestRenderer.create(Fragment)` and scanning `collectStyles` for `zIndex 1/2 + position:absolute` plus `hasStyle({pointerEvents:'auto'})` / `findAll(n=>n.props.pointerEvents==='auto')`. ReducedMotion reactivity is observable by `collectStyles` on `Animated.Value` nodes: after `update({reducedMotion:true})`, every `opacity` `_value` `===1` and every `translateY._value ===0` immediately (stub `setValue`); after flip back to `false`, `opacity._value===1` again (timing →1). Source guard `useEffect([^]*reducedMotion[^]*])` regex pins deps.

**Reliability — Strong on host, thin on real-device timing.** All normal paths are `never-throws` (no async, no throw): degenerate insets clamp, huge score stringify, reducedMotion toggle `stopAnimation+setValue`, unmount `anim.stop()+stopAnimation×3` wrapped in `act`. Both `tsc --noEmit` gates clean (`triade/tsconfig.json` + `triade/tsconfig.test.json`); `node --import tsx --test triade/__tests__/ui/components/gameOverOverlay.test.ts triade/__tests__/ui/components/overlayCarriers.integration.test.ts` `24 pass 0 fail` per spec log; `npm test -- triade` `960 pass 0 fail 366 skipped`. Two surfaces are thin: (a) `rn-stub` timing is synchronous `value.setValue(toValue)` so it proves re-target contract (`setValue(0/0/12) → timing to 1/1/0`) but not that real `Easing.out(cubic) 280ms delay80` frame timing would not leak a stale `Animated.Value` on rapid toggles (R-001). (b) `zIndex/elevation/pointerEvents` pin via `react-test-renderer` proves stylesheet contract but not that real RN compositor respects `zIndex:2 elevation:2` over `Hud zIndex:1 elevation:1` on Android elevation stacking or that `pointerEvents="auto"` actually blocks `Hud`'s underlying `Pressable`s on device (R-003). No `useWindowDimensions`/`orientation`/`App.tsx` wiring is in delta (`git diff --stat -- triade/src/engine` empty), so render-wire reliability is isolated to the component.

**Testability Risks:** Three surfaces thin but mitigated: (a) effect deps include `scrimOpacity, contentOpacity, contentY` (stable `useRef(...).current` objects) — ESLint `exhaustive-deps` happy but the deps are identity-stable so effect only re-runs on `reducedMotion`; a naïve reviewer could mistake them for recreating on every render (R-002). (b) `clampInset` is `(v: unknown): number => Number.isFinite(v as number) && v>=0 ? v : 0` — covers `NaN/Infinity/negative/undefined/null/"12"` but not string numerics `"12"` (still `0` fallback, conservative). Future hardening for string insets would widen helper (R-005). (c) `flexShrink:1` sits on `value/valueRecord` styles but `row` has `flexDirection:row justifyContent:space-between` without `gap/minWidth:0/flexBasis:0` — on extreme narrow 320pt + longest i18n `longestStreak` label, label could still crowd even with `flexShrink:0` on label; visual QA on smallest device recommended (R-010).

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **ReducedMotion reactive stop/restart races with in-flight `Animated.parallel` — rapid `false→true→false` toggles while `280ms/80ms-delay` fade is mid-flight could leak a stale `anim` or leave `_value` at `1/1/12` if `stopAnimation` + `setValue` order is wrong.** Before sweep, `useRef` init was one-time so `reducedMotion` toggle did nothing; after sweep, `useEffect` does preamble `stopAnimation×3` then `if(reducedMotion)→setValue(1/1/0) return` else `setValue(0/0/12) → parallel timing→1/1/0`. A missed `anim.stop()` before the second toggle would leave a delayed `timing(...delay80)` completing after `reducedMotion:true` already snapped to `1/1/0`, potentially stepping to `0` again. Real `Animated` (unlike stub) schedules on the JS / native bridge, so synchronous stub hides the race. | 2 | 3 | **6** | Keep landed `useEffect` shape: top `stopAnimation×3`, `reducedMotion` branch `setValue(1/1/0) return`, else `setValue(0/0/12)` then `parallel(...timing).start()` + cleanup `anim.stop(); stopAnimation×3`; deps `[reducedMotion, scrimOpacity, contentOpacity, contentY]`. Gate: (a) **host P0** `reducedMotionReactive + unmount mid-fade` integration case — `false`→`true` asserts `_value 1/0` immediately, `true→false` asserts `_value 1` after reset, `unmount doesNotThrow` + `remount renders CTA` (b) **source P1** `rg useEffect([^]*reducedMotion[^]*])` deps include `reducedMotion` + `rg stopAnimation.*setValue\(0.*setValue\(1` ordering (c) **manual follow-on** rapid triple-toggle `false→true→false→true` on iOS device with `reducedMotion` store toggle (Accessibility) — visually confirm overlay not flashing stale scrim. |
| R-002 | TECH / BUS | **`clampInset` fixes overlay but Hud stays unclamped — rotational/edge `insets:{top:NaN,bottom:-20,left:Infinity}` renders overlay padded `16` (clamped) but Hud still computes `topPad = NaN+16 → NaN`, so band `height getBandTop(NaN,96)→NaN` in layout, causing overlay/Hud visual drift (overlay centered with SAFE_MARGIN only, Hud band collapsed or misaligned).** The spec intentionally scopes clamp to `GameOverOverlay.tsx` component-local (`Never widen engine/game/render diff`), so drift is accepted low-sev, but no caller ever sanitizes `useSafeAreaInsets` globally before fanning to `Hud` + `GameOverOverlay`. | 2 | 3 | **6** | Keep `clampInset` landed in `GameOverOverlay.tsx:40-44` `Number.isFinite(v) && v>=0 ? v : 0` per edge + `+ SAFE_MARGIN` ×4; document Hud asymmetry via `rg -n "clampInset" Hud.tsx ==0` vs `GameOverOverlay.tsx ==1 def +4 uses` and `rg -n "insets.top \+ SAFE_MARGIN" Hud.tsx ==1` (only Hud). Gate: **P0** degenerate `insets:{top:NaN,bottom:-20,left:Infinity,right:undefined}` every `paddingTop/Bottom/Left/Right` `Number.isFinite && >=SAFE_MARGIN(16)` + bare `as any` without `insets` → `paddingTop===16`; **P2** drift probe asserts `Hud.tsx` still not clamped so future `App.tsx` global sanitize would unify. Follow-on hardening copies `clampInset` to `Hud.tsx:59-62` or lifts to `triade/App.tsx` before fanning. |
| R-003 | TECH / BUS | **`zIndex:2/elevation:2/pointerEvents auto` layering contract vs `Hud zIndex:1/elevation:1` is pinned only by `react-test-renderer` style scan, not by real RN compositor — on Android `elevation` stacking and `position:absolute` order depend on render-tree order (`Hud` mounted before `GameOverOverlay` in `App.tsx`), and a future `App.tsx` render-order swap or `RemoveClippedSubviews` optimization could invert stacking even though stylesheet says `2>1`.** `GameOverOverlay` is `position:absolute top/left/right/bottom 0` modal; `Hud` overlay is also `position:absolute top/left/right/bottom 0 pointerEvents box-none`. The integration test mounts them inside `React.Fragment` `Hud` then `GameOverOverlay`, matching `App.tsx` order, but stylesheet alone does not prove compositor respects it. | 2 | 3 | **6** | Keep `GameOverOverlay.tsx overlay {position:absolute, zIndex:2, elevation:2, backgroundColor rgba(12,14,17,0.7), pointerEvents auto}`, `Hud.tsx overlay {zIndex:1 elevation:1 pointerEvents box-none}`. Gate: **P0** `integration zIndex 2 > Hud 1` — `collectStyles` for `zIndex:1 position:absolute` + `zIndex:2 position:absolute` + `Math.max(overlay.zIndex) > Math.max(hud.zIndex)` + `pointerEvents auto` hit; **P1** also pins `elevation 2>1` + `position:absolute` + `overlay backgroundColor rgba(12,14,17,0.7)`; **manual** `Expo Go` on Android: game-over overlay covers Hud `Pausar` button and blocks tap (Hud `Pressable` not reachable). Any App render-order change must keep `GameOverOverlay` after `Hud` in tree. |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | BUS | **Overflow guard incomplete on longest i18n labels — `pt` `"Maior peça" / "Fusões" / "Sequência máxima"` labels have different intrinsic widths vs `pt` `en`; with `score 1999999999` (10 chars tab-nums 17pt) + narrow 320pt device + `row {justifyContent:space-between, alignItems:center}` + `label flexShrink:0` + `value flexShrink:1 textAlign:right`, the label could still truncate or force value ellipsize earlier than expected, and `row` lacks `gap/minWidth:0` to soften the crowding.** None of the 5 rows have `flexBasis:0` or `gap:8`; crowding is mitigated only by `flexShrink` pair. | 2 | 2 | 4 | Keep `value/valueRecord {flexShrink:1 textAlign:right}` + `label {flexShrink:0}` landed; gate P0 `value Texts numberOfLines=1 ellipsizeMode tail flexShrink:1` on `1999999999` nodes + P1 `row` still `space-between` not `gap` drift. **Manual QA**: `GameOverOverlay` with `score=1999999999 best=1999999999 maxTile=999999` on 320×568 iPhone SE with `pt` label set — no label wraps off-screen, value shows `1…` tail. Follow-on adds `row {gap:8}` if QA flags. |
| R-005 | TECH | **`clampInset` signature `(v: unknown) => number` still does `as number` cast so string numerics `"12"` / numeric objects fall through `Number.isFinite("12" as any) === false` → `0`, which is safe (clamp to `16`) but conservative; future caller passing `insets` from `SafeAreaProvider` with string `top:"10"` (unlikely, type is `number`) would over-clamp to `16` rather than preserve `26`.** The guard `finite && >=0` is correct for `NaN/Infinity/negative/undefined/null` exhaustive, but string `"10"` is not finite-number and would be clamped to `0`. | 1 | 3 | 3 | Keep `clampInset` as landed `Number.isFinite(v as number) && (v as number)>=0 ? v : 0` — safe fallback to `SAFE_MARGIN` only, no throw. Gate: P0 degenerate `NaN/-20/Infinity/undefined` pins + bare `as any` fallback; P1 edge `0 → 16`, `-0.1 →16`, `Number.MAX_VALUE → hugePad` not NaN. Any widening to coerce `"12"` must explicitly add `Number(v)` parse and update tests. |
| R-006 | TECH | **Effect deps `[reducedMotion, scrimOpacity, contentOpacity, contentY]` include stable `useRef(...).current` objects — identity-stable so effect only re-runs on `reducedMotion`, but inclusion is non-idiomatic (`useRef.current` not enumerated) and future lint fix that drops `scrimOpacity/contentOpacity/contentY` or re-creates them via `useMemo` would re-introduce stale closure or extra runs.** `scrimOpacity` etc are `useRef(new Animated.Value(...)).current` singletons; including them satisfies `exhaustive-deps` but their identity never changes, so no extra run today. | 1 | 3 | 3 | Keep deps as landed `[reducedMotion, scrimOpacity, contentOpacity, contentY]` — gate P1 `rg -n "useEffect\([^]*\[reducedMotion" GameOverOverlay.tsx ==1` + `rg "scrimOpacity.*contentOpacity.*contentY" deps` pin. If Animated.Values were ever re-created via `useState`/`useMemo`, add `// eslint-disable` comment and restore reactive `setValue` still keyed on `reducedMotion`. |
| R-007 | TECH | **`Animated` cleanup divergence `anim.stop()` vs `Value.stopAnimation()` — stub makes both no-ops/`cb` sync, but real RN `Animated.parallel(...).stop()` and `Value.stopAnimation()` have distinct semantics (animated `tracking` vs `value`). A missing `stopAnimation` after `anim.stop` would leave a trailing native value, or double `stop` ordering could suppress the `setValue` reset on remount.** The sweep does both (`anim.stop(); stopAnimation×3`) in cleanup and preamble, covering both bridges. | 1 | 2 | 2 | Keep cleanup as landed `anim.stop(); scrimOpacity.stopAnimation(); contentOpacity.stopAnimation(); contentY.stopAnimation()` plus preamble `stopAnimation×3` before every branch. Gate: P0 `doesNotThrow unmount` + P1 source scan `rg -n "stopAnimation" ==6` (3 preamble + 3 cleanup) and `rg -n "anim\.stop"` cleanup hit. |
| R-008 | TECH | **A11y grouping `accessible alert` + sibling CTA `Pressable` must survive `flexShrink/numberOfLines` additions — a future `Text` wrap change that adds `accessible={true}` to the outer `Animated.View` or re-parents the stats `View` would re-hide the `Pressable` from VoiceOver (pre-fix D1 had outer accessible hiding CTA).** Overlay outer is `Animated.View` with `pointerEvents auto` + `accessibilityViewIsModal` but not `accessible:true`; inner `View accessible alert` groups stats only, `Pressable accessibilityRole button` is sibling outside the alert. Row changes are inside the alert container only. | 1 | 2 | 2 | Keep outer `Animated.View accessibilityViewIsModal` without `accessible`, inner `View accessible accessibilityRole="alert"` wrapping rows, `Pressable` sibling. Gate: P0 remount `renderer.root.findByProps({accessibilityLabel:'Jogar de novo'})` still hittable after unmount/remount; P1 `rg -n 'accessibilityRole.*alert'` 1 hit inside overlay; `rg -n 'accessibilityRole.*button'` on CTA 1+ hits. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | PERF | **Animation micro-overhead `stopAnimation×3 + setValue×3 + parallel 3 timings delay80 280ms Easing.out(cubic) useNativeDriver:true`** — adds one extra synchronous `stopAnimation` preamble and two `setValue` resets per toggle vs prior one-shot effect. JS thread `<1ms` synchronous preamble, native driver offloads to UI thread; `useNativeDriver:true` preserved. No `App.tsx` re-render fan-out beyond prop change. | 1 | 1 | 1 | Monitor — no bench lane; verify host `react-test-renderer` `update` toggle `<1ms` `stop+setValue` (already `<15 min` full suite). Real device `FADE_MS 280` + `delay 80` unchanged; no new `setTimeout`/`requestAnimationFrame`. |
| R-010 | TECH | **Row layout still `row {flexDirection:row alignItems:center justifyContent:space-between paddingVertical:8}` without `gap` or `minWidth:0` on container — `value flexShrink:1` + `label flexShrink:0` is sufficient for `>1e9` but extreme narrow + long `longestStreak` label `"Sequência máxima"` (PT) could crowd value to `1…` sooner than design intent; no regression but visual QA gap.** Follow-on `gap:8` is additive, not required to ship. | 1 | 2 | 2 | Monitor — P0 ellipsize + flexShrink still pass with `1999999999`; keep `row` without `gap` today per diff-minimal. Manual QA on 320pt SE with PT locale; if value hits `1…` earlier than `>1e9` trigger, add `gap:8` + `value minWidth:0` in next hardening. |
| R-011 | OPS | **Deferred-work ledger `resolution-undo` hash coupling — 4 DW `open→done` carry 64-hex `596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce` (single hunk per entry, 4 occurrences). A follow-on sweep reopening without hash loses revert trail; writing `sprint-status.yaml` violates orchestrator bookkeeping.** | 1 | 2 | 2 | Monitor — ledger already records `resolution-undo: 596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce` per entry (DW-91/92/101/102 each `status: done 2026-09-02` + `resolution:` + `decision:`). Any reopen preserves it. This plan never writes `sprint-status.yaml`. |

### Risk Category Legend

- **TECH**: Technical/Architecture (Animated reactive re-target, clampInset, flexShrink, zIndex/elevation, unmount cleanup, deps, RN stub vs real)
- **SEC**: Security — none this sweep (overlay is pure presentation, no auth/storage/crypto)
- **PERF**: Performance — 280/80ms cubic fade under native driver (<1ms preamble R-009)
- **DATA**: Data Integrity — insets NaN/Infinity clamp, score `>1e9` stringified display vs label (R-002/R-004)
- **BUS**: Business Impact — overlay row space-between overflow on `>1e9`, record `valueRecord #E8A33D` highlight still flexed, `pointerEvents auto` blocking Hud
- **OPS**: Operations (ledger `596c2f86…` 64-hex, `sprint-status.yaml` orchestrator-owned R-011)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-overlay-carriers-hardening` touches the **overlay presentation seam only**: **reliability (never-throw on degenerate insets + huge score + reduceMotion toggle + unmount mid-fade)**, **performance (60 FPS fade `FADE_MS 280 delay80 cubic useNativeDriver` unchanged)**, **accessibility (VoiceOver alert grouping + CTA reachability)**, **maintainability (single `clampInset` + single `SAFE_MARGIN` import + single reactive effect + `resolution-undo` 596c2f86…)**, and **offline/installability** unchanged (pure TS + RN stub, no native module).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — degenerate insets | Every edge `clampInset(v)+SAFE_MARGIN` finite `>=16` and never `NaN/Infinity/negative` for `insets` in `{top:NaN,bottom:-20,left:Infinity,right:undefined}` and `{}`/`undefined as any` bare `GameOverOverlay` call (`insets?.field` + `clampInset` exhaustive). Overlay remains centered with `paddingTop/Bottom/Left/Right` `>=SAFE_MARGIN`. | R-002, R-005 | Unit host: `overlayCarriers.integration.test.ts` `[P0] degenerate insets clamp` (`collectStyles` every padding finite `>=SAFE_MARGIN`) + `gameOverOverlay.test.ts` still green (`>960 pass`) + source scan `clampInset`/`Number.isFinite`/`+ SAFE_MARGIN` | `overlayCarriers.integration.test.ts` P0 clamp degenerate 2 fixtures `→` PASS log + `GameOverOverlay.tsx:40-44` `clampInset` diff + `tsc --noEmit` both tsconfigs clean + `collectStyles` padding table |
| Reliability — huge score overflow | All 5 value `Text` (`score/best/maxTile/merges/longestStreak` with `String(stats.value)`) stay `numberOfLines=1 ellipsizeMode="tail"` and `style.flexShrink:1` (and `label flexShrink:0`) so `row space-between` with `value="1999999999"` never pushes label off-screen, never wraps, tail shows `1…` on narrow. `valueRecord` gold `#E8A33D` when `isNewRecord` also flexed. | R-004, R-010 | Unit host: `overlayCarriers.integration.test.ts` `[P0] overflow guard 1999999999` (`valueNodes numberOfLines===1 && ellipsizeMode tail` + `collectStyles flexShrink:1 on color #1a1d23/#E8A33D`) + `gameOverOverlay.test.ts` existing row `space-between` still green; manual 320pt PT locale visual confirms no wrap | `overlayCarriers.integration` overflow P0 PASS + `GameOverOverlay.tsx:99/102/107/113/118` diff + `value/valueRecord flexShrink:1 textAlign:right` stylesheet scan + `npx tsc --noEmit` |
| Reliability — reducedMotion reactive + unmount mid-fade | `reducedMotion: false` → `setValue(0/0/12)` then `parallel timing→1/1/0` `280 delay80 cubic useNativeDriver:true`; `reducedMotion:true` → `setValue(1/1/0)` snap no animate; `false→true→false` mid-fade re-targets correctly via `stopAnimation+setValue` without leaked timer/anim; `unmount()` mid-fade `anim.stop()+stopAnimation×3` cleans and immediate `remount` `Jogar de novo` CTA still reachable. | R-001, R-006, R-007 | Unit host: `overlayCarriers.integration.test.ts` `[P0] reducedMotion reactive + unmount mid-fade` (`collectStyles opacity _value 1 / translateY 0` after snap + flip-back + `doesNotThrow unmount` + `findByProps J… remount` + source `useEffect deps reducedMotion` + `stopAnimation+setValue` sequence) + `react-test-renderer act` wrapper | P0 reactive+unmount PASS + source effect `useEffect([^]*reducedMotion[^]*])` + `stopAnimation/setValue(0)/setValue(1)` ordering + `FADE_MS 280`/`delay 80` source scan |
| Performance — 60 FPS / fade budget | Fade `FADE_MS 280` + `delay 80` `Easing.out(Easing.cubic)` `useNativeDriver:true` unchanged; `stopAnimation×3` preamble `<1ms` synchronous; no new `setTimeout`/`requestAnimationFrame`/image decode; score row layout is `flex` O(1) without `FlatList`/image. On-device `p99 <16.7ms` frame budget unchanged (project rule: Skia/animation manual only). | R-009 | Host `react-test-renderer update` toggle micro `<1ms` (already in `npm test` timing) or rely on CI timing; follow-on device lane not needed for this sweep (pure TS+RN Animated, native driver). | CI `npm test` timing `<15 min` + `feel.bench.test.ts` median unchanged + `rn-stub.ts` timing path `value.setValue(toValue)` sync proof |
| Accessibility — VoiceOver grouping & CTA | `GameOverOverlay` inner `View accessible accessibilityRole="alert"` with `accessibilityLabel "Game over. Score …"` groups stats; CTA `Pressable accessibilityRole button accessibilityLabel t('gameOver.restart')` is sibling of the alert container (not hidden by outer `accessible`), so VoiceOver reaches CTA after stats announcement even with zIndex/elevation modal; `pointerEvents auto` blocks underlying Hud taps while modal. | R-008, R-003 | Unit host: `overlayCarriers.integration.test.ts` remount `findByProps {accessibilityLabel:'Jogar de novo'}` still hittable; `gameOverOverlay.test.ts` a11y alert/button role pins still green; manual VoiceOver trap: with overlay open swipe reads stats alert then `Jogar de novo` button, dismiss blocked gestures not leaking to board. | Host integration remount CTA hit + `GameOverOverlay.tsx accessibilityRole alert`/`button` scans + manual VoiceOver note |
| Maintainability | Single `clampInset(v:unknown): number => Number.isFinite(v as number) && v>=0 ? v : 0` at `GameOverOverlay.tsx:40` (not scattered), single `SAFE_MARGIN 16` import from `triade/src/ui/layout.ts:4` (`pad* = clampInset(insets?.field)+SAFE_MARGIN` ×4, not inlined literals), single reactive `useEffect` with `reducedMotion` deps + `FADE_MS 280/delay 80/cubic/useNativeDriver` ×3, single `numberOfLines/ellipsizeMode` on all 5 value Texts (`flexShrink:1` co-located), `resolution-undo 596c2f86…` 64-hex per DW ledger entry; `App.tsx` still `insets={insets}` single fan-out unchanged. | R-006, R-011 | Static-assert: `rg -n "clampInset" GameOverOverlay.tsx ==1 def +4 uses` + `rg -n "SAFE_MARGIN" ==5` + `rg -n "FADE_MS|delay: 80" ==1+3` + `rg -n "numberOfLines" ==5` + `rg -n "596c2f86…" deferred-work.md ==4` + `tsc` both clean | Source scans + `GameOverOverlay.tsx` diff + ledger diff; follow-on Hud hardening lifts `clampInset` reuse or `App.tsx` global sanitize |
| Compliance — thin-view + never-throw | Overlay stays `Animated.View/Text/Pressable/StyleSheet/Easing` only per UX-DR-8 `react-native` thin-view (no `reanimated/skia/haptics/revenuecat` import); orphan `reanimated` violation would be `FORBIDDEN_PREFIXES` `engine.purity`. `numberOfLines/ellipsizeMode/flexShrink` are RN `Text` props, not web deps. | — | Structural: `stripCommentsAndStrings(GameOverOverlay.tsx)` no `reanimated`/`skia`/`expo-haptics` import; `extractNamedImports` shows only `Animated,Easing,Pressable,StyleSheet,Text,View` from `react-native` + `SAFE_MARGIN` from `./layout`. | `engine.purity.test.ts` structural suite complement + `rg -n "reanimated|skia" GameOverOverlay.tsx ==0` + `tsc` clean |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (overlay pure TS + RN stub, orchestrator `App.tsx` still `insets={insets}` only). | — | `npm --prefix triade test` offline (no network) still `≈960 pass / 366 skipped` | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. `clampInset finite>=0 → +SAFE_MARGIN 16` is exact `Number.isFinite && >=0` guard, not a tunable threshold; `value flexShrink:1 textAlign:right` is layout contract, not metric; `FADE_MS 280 delay80 Easing.out(cubic) useNativeDriver:true` are preserved design tokens (not invented); ledger `resolution-undo 596c2f86f8…` is evidence hash, not threshold. If Hud hardening later clamps globally or `row gap` is added, record its new `pad*` baseline vs this sweep rather than inventing a threshold.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (deferred-work DW-91/92/101/102 intent/boundaries signed — `GameOverOverlay.tsx` carries `reducedMotion useRef stale`, `insets partial/neg/NaN`, `score >1e9 row overflow`, `zIndex2 vs Hud1 + unmount single-cycle` not hardened; `spec-overlay-carriers-hardening.md` intent contract + `Always` component-local + `Block If reanimated/App wiring/new dep` + `Never engine/layout import` boundaries; `Hud.tsx:169-177 zIndex:1` reference unchanged)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsconfig.test.json` + `tsconfig.json` + `node:assert/strict` + `react-test-renderer` + `triade/test-utils/rn-stub.ts` `Animated.Value _value/setValue/stopAnimation/timing/parallel`; working-tree on `67a1b51` hardening + base `58e036c`)
- [ ] Test data available or factories ready (`insets: {top:NaN,bottom:-20,left:Infinity,right:undefined as any} & {} bare as any`, `stats: {score:1999999999,best:1999999999,maxTile:999999,merges:999,longestStreak:999}`, `reducedMotion false/true` toggle fixtures + mid-fade unmount, `Hud+GameOverOverlay` Fragment with `zIndex1 vs 2` + `position:absolute` + `pointerEvents auto`, `SAFE_MARGIN 16` + `FADE_MS 280 delay80 cubic` tokens)
- [ ] Feature deployed to test environment (working-tree `GameOverOverlay.tsx:40-44 clampInset`, `52-83 reactive effect`, `94-118 numberOfLines/ellipsize`, `190-215 flexShrink` + `overlayCarriers.integration.test.ts` 4 cases patched; `git diff --stat -- triade/src/engine` empty verified)
- [ ] No engine edits beyond `GameOverOverlay.tsx`/`overlayCarriers.integration.test.ts` + spec + `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (degenerate `NaN/-20/Infinity/undefined` + bare `as any` clamp `>=SAFE_MARGIN` & finite; `1999999999` `numberOfLines=1 tail flexShrink:1`; `zIndex 2>1 absolute + pointerEvents auto + elevation 2>1`; `false→true snap 1/0 + true→false reset 1 + unmount doesNotThrow + remount J… CTA` — host `overlayCarriers.integration` 4/4)
- [ ] All P1 tests passing (or failures triaged with waivers) — `useEffect deps reducedMotion + stopAnimation/setValue(0|1)` ordering, `FADE_MS 280 delay80 cubic useNativeDriver:true`, `label flexShrink:0 / value textAlign:right`, `elevation/backgroundColor rgba(12,14,17,0.7)` preserved, Hud drift documented (`clampInset Hud==0` vs overlay `==1+4`)
- [ ] No open high-priority / high-severity bugs (R-001 animation race + R-002 Hud asymmetry clamp drift + R-003 zIndex/elevation compositor green or formally waived with device QA)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on overlay clamp/reducedMotion/overflow/zIndex seam; `rg` allowlists for single `clampInset` / `SAFE_MARGIN×5` / `FADE_MS×1 delay80×3 / numberOfLines×5` green)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (both hit via `npx tsc` probes below)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (degenerate insets finite, overflow ellipsize+flexShrink, reducedMotion reactive+unmount, `textAlign:right`, `zIndex/elevation` layering, accessibility `alert+button` siblings, single `clampInset/SAFE_MARGIN`)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns degenerate `NaN/-20/Infinity` clamp + `1999999999` overflow ellipsize/flexShrink + reducedMotion `false→true snap/true→false re-animate` + zIndex `2>1` + unmount mid-fade/remount, ledger `596c2f86…` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `GameOverOverlay.tsx:40-44 clampInset` + `:52-83` reactive effect (`stopAnimation/setValue 280/80/cubic/useNativeDriver` + cleanup `anim.stop`) + `:94-118 numberOfLines/ellipsize` + `:190-215 flexShrink/textAlign` + `overlayCarriers.integration.test.ts` 4 integration cases, `rn-stub` contract |
| PM | PM | Signs `clampInset finite>=0 + SAFE_MARGIN` degenerate fallback (safe `16` vs source `NaN`), accepts `Hud vs overlay` clamp asymmetry as low-sev visual drift (overlay safe), and overflow `1999999999` tail `1…` + row still `space-between` (no wrap) |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit + style-scan, already green at `67a1b51` (`node --import tsx --test` `24 pass` on `gameOverOverlay*` + `overlayCarriers.integration`)

**Criteria**: Blocks overlay crash/layout break (NaN padding, >1e9 overflow, zIndex hidden behind Hud, mid-fade leak) + high risk (≥6) + no workaround (degenerate insets happen on rotation/tablet, >1e9 reachable via long session, Hud vs overlay ordering unconditional)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC-clamp-degenerate — `insets:{top:NaN,bottom:-20,left:Infinity,right:undefined as any}` via `TestRenderer.create(GameOverOverlay {…insets:degenerate} as any)` every emitted `paddingTop/Bottom/Left/Right` style is `Number.isFinite(v) && v>=SAFE_MARGIN(16) && v>=0` (never `NaN/Infinity/<0`), pinned via `collectStyles` layer scan + `paddings.length>0`. Companion bare `GameOverOverlay` as `any` without `insets` emits `paddingTop === SAFE_MARGIN` (`??0` fallback via `clampInset(insets?.top)`). | Unit (react-test-renderer + rn-stub `SAFE_MARGIN 16`) | R-002, R-005 | 1 (two fixtures collapsed) | QA (done) | `GameOverOverlay.tsx:40-44` `clampInset Number.isFinite && >=0 ? v : 0` + `+ SAFE_MARGIN` ×4. Probe: `assert.ok(Number.isFinite(v))` + `assert.ok(v >= SAFE_MARGIN)` per padding key; bare fixture asserts `paddingTop === SAFE_MARGIN`. Complements `gameOverOverlay.test.ts` existing suite (still green). |
| AC-clamp-bare — `GameOverOverlay` rendered `as any` without `insets` prop still emits `paddingTop === SAFE_MARGIN` (no throw, no `NaN` via `insets?.top` optional chaining). | Unit | R-002 | (folded above) | QA (done) | `insets` is typed required `EdgeInsets` (T2 fix) but defensively `clampInset(insets?.top)` handles `undefined as any` bare harness; `triade/__tests__/ui/components/gameOverOverlay.test.ts:252` as-any pattern preserved. |
| AC-overflow-valueTexts — `stats:{score:1999999999,best:1999999999,maxTile:999999,merges:999,longestStreak:999}` value `Text` nodes matching `children includes "1999999999"` all have `numberOfLines===1 && ellipsizeMode==="tail"` props AND stylesheet `flexShrink:1` on `value/valueRecord` entries (`color #1a1d23/#E8A33D`). Also pins source `clampInset+Number.isFinite` + `numberOfLines+ellipsizeMode` + `flexShrink:1` via `readFileSync`. | Unit + static source scan | R-004, R-010 | 1 | QA (done) | `GameOverOverlay.tsx:99/102/107/113/118` 5× `numberOfLines ellipsizeMode` + `:value/valueRecord flexShrink:1 textAlign:right`. Probe: `valueNodes = root.findAll(n=>n.type==='Text' && n.props.children.includes('1999999999'))` `length>=1` + `n.props.numberOfLines===1` + `ellipsizeMode==="tail"` + `collectStyles flexShrink===1 && (color==#1a1d23||#E8A33D)`. |
| AC-zIndex-layering — `Hud` (`zIndex:1 elevation:1 position:absolute pointerEvents box-none`) rendered together with `GameOverOverlay` (`zIndex:2 elevation:2 position:absolute pointerEvents auto backgroundColor rgba(12,14,17,0.7)`) via `Fragment Hud+GameOverOverlay`: stylesheet `collectStyles` yields `hudZ = zIndex:1 position:absolute` + `overlayZ = zIndex:2 position:absolute`, `Math.max(overlay.zIndex) > Math.max(hud.zIndex)` and `pointerEvents auto` present on overlay (blocks gestures). | Unit (integration render `Hud+Hud`) | R-003 | 1 | QA (done) | `GameOverOverlay.tsx:184 zIndex:2 elevation:2 pointerEvents auto` vs `Hud.tsx:170-176 zIndex:1 elevation:1 pointerEvents box-none`. Probe: `collectStyles` filtered `zIndex 1/2 + position:absolute` + `hasStyle pointerEvents auto`; App order is `Hud` then `GameOverOverlay` in `Fragment` matching `App.tsx` render order. |
| AC-reducedMotion-snap — Mount `reducedMotion:false`, immediately `update(reducedMotion:true)` mid-fade: every style `opacity` branch `Animated.Value _value ===1` and every `transform translateY _value ===0` via stub `_value` (sync `setValue(1/0)`), no leaked `Animated.timing` completing to wrong `toValue`. | Unit (rn-stub `_value`) | R-001, R-006, R-007 | 1 | QA (done) | `useEffect` top `stopAnimation×3` + `if(reducedMotion){setValue(1/1/0);return;}` — probe via `collectStyles` opacity `_value` + `transform translateY._value` immediately after `update`. |
| AC-reducedMotion-reAnimate — Flip `true→false` while mounted: preamble `setValue(0/0/12)` then `parallel timing→1/1/0 delay80` immediately sets `_value 1` via stub `setValue(toValue)`; after `update({reducedMotion:false})` `collectStyles opacity _value===1` proves re-animate not stale. | Unit | R-001 | (same test body) | QA (done) | Second `update` inside same `act`; `collectStyles` opacity `_value===1` after toggling back; source scan `setValue(0)/setValue(12)` then `timing` proves reset before animate. |
| AC-unmount-midFade — `act(()=>renderer.unmount())` mid-fade does not throw, calls `anim.stop(); stopAnimation×3` cleanup; immediate remount `TestRenderer.create(GameOverOverlay)` shows `findByProps {accessibilityLabel:'Jogar de novo'}` CTA still hittable and starts from clean `start values` (no shared `Animated.Value` leak across mounts). | Unit (unmount lifecycle) | R-001, R-007 | 1 | QA (done) | Cleanup is returned `()=>{anim.stop(); stopAnimation×3}`; probe `assert.doesNotThrow(()=>act(()=>renderer.unmount()))` + `renderer2.root.findByProps({accessibilityLabel:'Jogar de novo'})` on remount. |
| AC-source-guards — Structural pins `clampInset + Number.isFinite`, `numberOfLines+ellipsizeMode`, `flexShrink:1` in file text (guards future delete-regressions even if renderer probes mocked). | Static scan | R-002, R-004, R-006 | 1 | QA (done) | `readFileSync GameOverOverlay.tsx` includes `clampInset` + `Number.isFinite` + `numberOfLines`+`ellipsizeMode` + `flexShrink: 1`; complements renderer checks so a prop-delete that still passes `collectStyles` via stylesheet cache would still fail. |

**Total P0**: 6 effective integration cases (8 requirement groups, 4 `test()` bodies collapsed where noted — same as `overlayCarriers.integration.test.ts` 4 `test()`), `<2 s` host + `<15 min` full `npm test` gate

### P1 (High) — Core seam & style contracts

**Criteria**: Important `GameOverOverlay` seam (`ReducedMotion`, `clampInset`, `row` layout, `elevation/pointerEvents`) + medium/high risk

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Reactive effect deps + stop/setValue ordering — source `useEffect([^]*reducedMotion[^]*])` deps include `reducedMotion` and body includes `stopAnimation` + `setValue(0)`/`setValue(12)` before timing + `setValue(1)/setValue(0)` for reduced branch; verifies reactive contract even under stub where timing is sync. | Static scan | R-001, R-006, R-007 | 1 | QA | `regex /useEffect\([^]*reducedMotion[^]*\]\s*\)/` pin + `rg -n "stopAnimation" GameOverOverlay.tsx ==6` (3 preamble +3 cleanup) + `rg -n "setValue\(0\)\|setValue\(12\)"`. Complement to P0 runtime `_value` checks. |
| Animated timing contract — `FADE_MS 280` + `delay: 80` ×2 (`contentOpacity/contentY`) + `Easing.out(Easing.cubic)` ×3 + `useNativeDriver:true` ×3 preserved `—` not regressed to `200/0` or `linear` or `useNativeDriver:false`. | Static scan | R-001 | 1 | QA | `rg -n "FADE_MS 280\|duration: FADE_MS" GameOverOverlay.tsx ==1+3` (def +3 timings) + `rg -n "delay: 80" ==2` + `rg -n "Easing\.out\(Easing\.cubic\)" ==3` + `rg -n "useNativeDriver: true" ==3`. Any drift breaks fade choreography. |
| Value/label flex contract — `value/valueRecord {flexShrink:1 textAlign:right}` + `label {flexShrink:0}` + `row {flexDirection:row justifyContent:space-between alignItems:center}` preserved; catches future `flex:1` or `flexWrap` regressions that would still pass `numberOfLines` but break `space-between`. | Static/scan + style | R-004, R-010 | 1 | QA | `rg -n "flexShrink: 0" GameOverOverlay.tsx` on `label` 1 + `rg -n "flexShrink: 1" ==2` (`value`+`valueRecord`) + `rg -n "textAlign.*right" ==2`. Row `row {…space-between}` still via `gameOverOverlay.test.ts` `space-between` pin. |
| Elevation + scrim + pointerEvents preservation — `overlay {elevation:2 backgroundColor: rgba(12,14,17,0.7) justifyContent:center alignItems:center}` + outer `Animated.View pointerEvents auto accessibilityViewIsModal` + inner `View accessible alert`; catches `elevation`/`backgroundColor`/`pointerEvents` drift that `zIndex` alone would miss. | Static/style scan | R-003 | 1 | QA | `rg -n "elevation:\s*2" ==1` + `rg -n "rgba\(12,14,17,0\.7\)" ==1` + `rg -n 'pointerEvents.*auto'` outer 1 + `rg -n 'accessibilityViewIsModal'` 1. |
| Hud vs overlay asymmetry — `Hud.tsx:59-62` still `insets.top + SAFE_MARGIN` unclamped (intentional low-sev drift) so this sweep does not claim global sanitize; future `App.tsx` lift would unify, until then overlay-only clamp is documented. | Static scan | R-002 | 1 | QA | `rg -n "clampInset" Hud.tsx ==0` vs `GameOverOverlay.tsx ==1+4` + `rg -n "insets.top \+ SAFE_MARGIN" Hud.tsx ==1` keeps drift visible. |
| A11y alert+button siblings — outer overlay not `accessible:true`, inner `View accessible alert` wraps 5 rows, sibling `Pressable accessibilityRole button accessibilityLabel gameOver.restart` reachable; `a11yLabel Game over. Score …` still concatenated `stats` + `(isNewRecord ? t(gameOver.newRecord) : '')`. | Unit/static | R-008 | 1 | QA | `rg -n 'accessibilityRole.*alert' GameOverOverlay.tsx ==1` + `rg -n 'accessibilityRole.*button' CTA` + `collectStyles` CTA still `findByProps accessibilityLabel J…` after remount. |

**Total P1**: 6 checks, ~0.6–1.2 h host (mostly source scans + existing `gameOverOverlay.test.ts` complements)

### P2 (Medium) — Secondary flows + low/medium risk

**Criteria**: Secondary glue + low/medium risk + static/ledger scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-constant / import allowlist — `clampInset` definition site `==1` + `clampInset(` uses `==4` (`padTop/Bottom/Left/Right`) + `SAFE_MARGIN` import site `from './layout'` `==1` + `SAFE_MARGIN` uses `==4+1` (`import + 4 pads` exact `==5`) + `FADE_MS` def `==1` + `delay:80 ==2` + `numberOfLines==5` | Static scan | R-006, R-011 | 1 | QA | `rg -n "const clampInset" GameOverOverlay.tsx ==1` + `rg -n "clampInset\(insets" ==4` + `rg -n "SAFE_MARGIN" ==5` + `rg -n "numberOfLines" ==5`. Any stray duplicate literal outside guard is FAIL. |
| Engine & layout byte-identical — `git diff --stat -- triade/src/engine` empty + `triade/src/ui/layout.ts` empty beyond consumed `SAFE_MARGIN` constant (`git diff -- triade/src/ui/layout.ts` empty). No engine rule/merge/tier change leaked from overlay hardening. | Static scan | — | 1 | QA | `git diff HEAD -- triade/src/engine` must be empty in CI; `layout.ts` untouched except re-checking `SAFE_MARGIN 16` still `==16`. |
| Ledger `resolution-undo` hash — 4× DW `open→done` carry 64-hex `596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce` (each entry 1 `status` + 1 `resolution-undo` + 1 `decision`, 4 hits total). | Static scan | R-011 | 1 | QA | `rg -n "596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce" _bmad-output/implementation-artifacts/deferred-work.md ==4` + `rg -n "resolution-undo" deferred-work.md` counts ledger health. |
| `t` + `a11yLabel` vs score >1e9 — `a11yLabel Game over. Score ${stats.score} …` still stringifies `1999999999` without `toLocaleString`, stays one line in VoiceOver; `i18n t('gameOver.*')` labels (`score/best/maxTile/merges/longestStreak/newRecord`) not regressed to hard-coded English. | Unit | R-004, R-008 | 1 | QA | `rg -n "gameOver\.score\|gameOver\.best\|gameOver\.maxTile\|gameOver\.merges\|gameOver\.longestStreak" GameOverOverlay.tsx >=5` + `rg -n 'a11yLabel.*Game over'` 1. `t()` still from `useTranslation`. |

**Total P2**: 4 checks, ~0.3–0.6 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — narrow + PT longest label — manual `Expo Go` snapshot `GameOverOverlay {score:1999999999, insets:{top:0…}, reducedMotion:false}` on 320×568 SE with `pt` locale (`pt` `"Sequência máxima"` long) shows rows `label + "1999999999…" tail` still `space-between` without label wrapping off-screen, value `1…` rather than `"1999999999"` spilling past 420 maxWidth | Host visual exploratory | 1 | QA | No assertion beyond P0 no-throw; if label wraps, file follow-on `row gap:8` hardening. |
| Toggle thrash exploratory — `reducedMotion false→true→false→true` 3 rapid `update` toggles with `insets:{top:0…}` shows no RN yellowbox `Animated: attempted to call X` and no scrim flash after final `true` snap | Host exploratory (`react-test-renderer act`) | 1 | QA | Already 2-toggle sequence is P0; third toggle extends to thrash, expects still `opacity _value 1`. |
| Cross-cutting negative — `rg -n "insets\?\.top \?\? 0" triade/src/ui/GameOverOverlay.tsx ==0` after sweep (old `??0` passthrough removed, now `clampInset(insets?.top)` only). Also `rg -n "reanimated|skia" GameOverOverlay.tsx ==0`. | Static scan | 1 | QA | If old `?? 0` reappears outside comment, or `reanimated` import appears, file a patch before merge. |

**Total P3**: 3 checks, ~0.2–0.4 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `GameOverOverlay` import/TS + `rn-stub` + `SAFE_MARGIN` regressions before full gate

- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore` / no `Animated/Easing` import miss, `clampInset unknown` + `SAFE_MARGIN` OK)
- [ ] `npm --prefix triade test -- __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/overlayCarriers.integration.test.ts` host `24 pass 0 fail` (P0 clamp/overflow/zIndex/reducedMotion+unmount all green)

**Total**: 2 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical hardening fail-fast (host only, no device lane)

- [ ] Degenerate `insets:{top:NaN,bottom:-20,left:Infinity,right:undefined}` + bare `as any` without `insets` → every padding `finite >=16` + bare `paddingTop===16` (already passing at `67a1b51`; `rg` not needed)
- [ ] `1999999999` value Texts `numberOfLines=1 ellipsizeMode tail flexShrink:1 textAlign:right` + `label flexShrink:0` row still `space-between`
- [ ] `Hud zIndex:1` + `GameOverOverlay zIndex:2` both `position:absolute` + `overlay pointerEvents auto` + `Math.max 2>1` + `elevation 2>1` + `rgba(12,14,17,0.7)`
- [ ] `reducedMotion false→true→false` mid-fade `stopAnimation+setValue` re-target + `unmount doesNotThrow` + `remount findByProps J…`

**Total**: 4 P0 groups (6 requirement rows collapsed, already passing at `67a1b51`; `rg` gates are static)

### P1 Tests (<30 min)

**Purpose**: Seam + style + a11y contracts

- [ ] Reactive effect `useEffect([^]*reducedMotion[^]*])` + `stopAnimation×6` + `setValue(0/1/12)` ordering + `FADE_MS 280 delay80 cubic useNativeDriver×3` still preserved
- [ ] `value/valueRecord flexShrink:1 textAlign:right` + `label flexShrink:0` + `row space-between` + `overlay elevation2/pointerEvents auto/accessibilityViewIsModal` + inner `accessible alert` still siblings CTA
- [ ] Hud asymmetry `clampInset Hud==0 vs GameOverOverlay==1+4` + `SAFE_MARGIN ×5` single import
- [ ] `t('gameOver.*')` 5 labels + `a11yLabel Game over. Score …` stringified `1999999999` still present

**Total**: 6 P1 checks

### P2/P3 Tests (<60 min)

**Purpose**: Ledger, allowlists, off-engine guarantees, exploratory narrow+PT thrash

- [ ] Single-constant allowlists `clampInset==1 +4 / SAFE_MARGIN==5 / FADE_MS 1 + delay80 2 + numberOfLines 5` + engine empty `git diff --stat -- triade/src/engine` empty + ledger `resolution-undo 596c2f86… ==4` scan (`<1 s`)
- [ ] Narrow 320pt PT `Sequência máxima` + `1999999999` visual still `space-between` tail `1…` + thrash `false→true→false→true` 3 rapid toggles still `opacity 1` (`<2 min`)

**Total**: 4 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 6 effective | ~0.20 | ~1.0–1.5 | Host integration `overlayCarriers.integration 4 tests` + existing `gameOverOverlay 20 tests` already green at `67a1b51`; degenerate/bare/1999999999/zIndex/reducedMotion+unmount all scoped to `rn-stub + SAFE_MARGIN` — no new harness |
| P1 | 6 | ~0.20 | ~1.0–1.6 | `useEffect deps` + `FADE_MS/delay/Easing/useNativeDriver` + `flexShrink/textAlign` + `elevation/pointerEvents/alert+button` scans — mostly source `rg` + existing suites |
| P2 | 4 | ~0.15 | ~0.4–0.7 | Single-constant / import allowlists / engine empty / ledger 64-hex scans + `a11yLabel` i18n pin |
| P3 | 3 | ~0.15 | ~0.3–0.5 | Narrow PT `1999999999` + `Sequência máxima` visual + thrash `false→true→false→true` + negative `??0`/`reanimated` scan |
| **Total** | **19** | **-** | **~2.7–4.3** | **~0.3–0.6 days host; no device lane — pure host TypeScript + react-test-renderer + tsc** |

### Prerequisites

**Test Data:**

- Inests fixtures: `{top:NaN,bottom:-20,left:Infinity,right:undefined as any}` degenerate + `{}` bare `as any` + `{top:10,bottom:10,left:10,right:10}` nominal + `{top:0}` zero-edge
- Stats `score 1999999999 / best 1999999999 / maxTile 999999 / merges 999 / longestStreak 999` + `1999999999` repeated across `score/best` pin; `SAFE_MARGIN 16` const; `FADE_MS 280 delay80`
- `reducedMotion false/true` toggle fixtures via `renderer.update` mid-fade + immediate `unmount` then `remount`
- `Hud` (`zIndex:1 elevation:1 position:absolute box-none`) + `GameOverOverlay` (`zIndex:2 elevation:2 absolute auto rgba(12,14,17,0.7)`) `Fragment` pair with `insets:{top:10…} bandHeight:96` + `activeLaneId clean`
- `rg` allowlist strings: `"clampInset" / "Number.isFinite" / "SAFE_MARGIN" / "FADE_MS" / "delay: 80" / "numberOfLines" / "flexShrink: 1" / "zIndex:" / "elevation" / "596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce"`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — `triade/package.json` `test` script
- `react-test-renderer` + `React.act` for `GameOverOverlay`/`Hud` integration (already in `gameOverOverlay.test.ts` + `overlayCarriers.integration`)
- `rg` (ripgrep) for allowlist scans (clampInset, SAFE_MARGIN, FADE_MS, resolution-undo 596c2f86…, numberOfLines, flexShrink)
- `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` (both gates)
- `git diff --stat -- triade/src/engine` empty guard

**Environment:**

- `triade/` host Node 20+ (no Expo dev build — `GameOverOverlay.tsx` pure TS + `rn-stub` headless, host-inspectable; no `useWindowDimensions` mock needed beyond default `390×844`)
- Working tree on `67a1b51` hardening + base `58e036c`; `triade/src/ui/layout.ts:4 SAFE_MARGIN 16` stable; `triade/test-utils/rn-stub.ts:22-67` Animated stub `_value/setValue/stopAnimation/timing/parallel` stable

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths** (degenerate insets `NaN/Infinity/negative→SAFE_MARGIN` finite + `1999999999` `numberOfLines+ellipsize+flexShrink` + `zIndex 2>1 elevation 2>1 pointerEvents auto` + `reducedMotion false→true snap + true→false re-animate + unmount mid-fade doesNotThrow/remount J…`): ≥80%
- **Wiring seam** (`GameOverOverlay insets→pad* + SAFE_MARGIN`, `reducedMotion→Animated.Value _value 1/0`, `value Text→row space-between`, `overlay↔Hud zIndex/elevation`, `Pressable CTA sibling alert`): 100%
- **Edge cases** (degenerate `NaN/Infinity/-20/undefined` per edge, bare `as any` without `insets`, huge `1999999999` tail, longest PT label, rapid `false→true→false→true` thrash, Android `elevation` stacking): ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`overlayCarriers.integration 4/4` + `gameOverOverlay 20/20` including degenerate + bare `SAFE_MARGIN` + `1999999999 numberOfLines tail flexShrink:1` + `zIndex 2>1 absolute/elevation/pointerEvents` + `reducedMotion snap/re-animate/unmount+remount J…`)
- [ ] No high-risk (≥6) items unmitigated (R-001 reactive stop/restart + R-002 Hud asymmetry clamp drift + R-003 zIndex/elevation compositor green or waived with Android device QA)
- [ ] Single `clampInset` definition `+4` uses at `GameOverOverlay.tsx:40-44` + single `SAFE_MARGIN` import `==5` + `FADE_MS 280 delay80 cubic useNativeDriver×3` + `numberOfLines 1 ellipsizeMode tail ×5` + `flexShrink:1 ×2` preserved; no `reanimated/skia` import, no `insets?.top ??0` passthrough, no `Math.random` in overlay
- [ ] No `triade/src/engine/**` drift (`git diff --stat -- triade/src/engine` empty) and `triade/src/ui/layout.ts` unchanged (only `SAFE_MARGIN` consumed)
- [ ] `npx tsc --noEmit` clean on both `triade/tsconfig.json` and `triade/tsconfig.test.json`
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (degenerate finite `>=16`, huge tail `1…`, re-target `0→1/12→0`, `textAlign:right`, `zIndex/elevation/pointerEvents` compositor, `alert+button` a11y siblings, single `clampInset/SAFE_MARGIN`)

---

## Mitigation Plans

### R-001: ReducedMotion reactive stop/restart races with delayed `Animated.parallel` mid-fade (Score: 6)

**Mitigation Strategy:**
1. Keep landed `useEffect` exactly: top `stopAnimation` on `scrimOpacity/contentOpacity/contentY` (cancels JS+critical stale frame), `if(reducedMotion){setValue(1/1/0);return;}` immediate snap (no timing), else `setValue(0/0/12)` reset then `Animated.parallel([timing scrim 280 cubic useNativeDriver, timing contentOpacity 280 delay80 cubic useNativeDriver, timing contentY 280 delay80 cubic useNativeDriver]).start()` then `return ()=>{anim.stop(); stopAnimation×3;}` cleanup (covers unmount mid-fade and toggle mid-fade).
2. Keep deps `[reducedMotion, scrimOpacity, contentOpacity, contentY]` — `reducedMotion` drives re-entry, the 3 Values are stable refs (identity never changes) so no spurious re-runs, satisfies `exhaustive-deps` and guarantees new closure captures toggling flag.
3. Host verification via stub `_value` proves re-target contract (stub `timing→setValue(toValue)` sync): `false→true` immediately `_value 1/0`, `true→false` `setValue(0/0/12)` then `timing→1` → `_value 1`; device follow-on rapid `false→true→false→true` thrash visually confirms no flash to `0` after final `true`.

**Owner:** FE lead
**Timeline:** Immediate (gate this bundle)
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/overlayCarriers.integration.test.ts` `24 pass` including `[P0] reducedMotion reactive + unmount mid-fade` (`false→true _value1`, `true→false _value1`, `doesNotThrow unmount`, `remount J… CTA`), `rg -n "useEffect\([^]*reducedMotion" GameOverOverlay.tsx ==1`, `rg -n "stopAnimation" ==6`, `rg -n "FADE_MS|delay: 80|Easing.out(Easing.cubic)|useNativeDriver" ==1+2+3+3`.

### R-002: clampInset fixes overlay but Hud stays unclamped — visual drift on degenerate insets (Score: 6)

**Mitigation Strategy:**
1. Keep `clampInset` landed exactly `Number.isFinite(v as number) && v>=0 ? v : 0` and `padTop/Bottom/Left/Right = clampInset(insets?.top/bottom/left/right)+SAFE_MARGIN` (4 edges), so any caller `as any` without `insets` or rotation-tablet `NaN/-20/Infinity` still yields finite `>=16` overlay padding and never `NaN` in `Animated.View style padding*`.
2. Do not claim global `SafeAreaProvider` sanitize — `App.tsx: insets={insets}` passthrough unchanged, `Hud.tsx:59-62` still `insets.top + SAFE_MARGIN` unclamped intentionally per spec `Always component-local`; drift is documented P1 not P0 fail. Probe keeps asymmetry visible via `rg clampInset Hud==0` vs overlay `==1+4`, so future hardening knows to lift `clampInset` to `Hud` or to a shared `sanitizeInsets` in `triade/src/ui/layout.ts`.
3. P0 asserts every `padding*` emitted after degenerate fixture is `>=SAFE_MARGIN`; bare `as any` fixture is `paddingTop===16`.

**Owner:** FE lead
**Timeline:** Immediate (overlay safe; Hud hardening deferred)
**Status:** Planned
**Verification:** `overlayCarriers.integration "[P0] degenerate insets clamp"` `collectStyles` `Number.isFinite && >=SAFE_MARGIN` per `padding*` + bare `paddingTop===16`; `rg -n "clampInset" GameOverOverlay.tsx ==1 def +4 uses`; `rg -n "clampInset" Hud.tsx ==0`; `git diff HEAD -- deferred-work.md` `DW-92 closed` hash `596c2f86…`.

### R-003: zIndex/elevation/pointerEvents layering pinned only by style scan, not RN compositor (Score: 6)

**Mitigation Strategy:**
1. Keep `overlay {position:absolute zIndex:2 elevation:2 backgroundColor rgba(12,14,17,0.7)}` + outer `pointerEvents auto accessibilityViewIsModal` and `Hud overlay {position:absolute zIndex:1 elevation:1 box-none}`; render order stays `Hud` then `GameOverOverlay` as siblings in `App.tsx` (Hud `pointerEvents box-none` lets swipes reach board, overlay `auto` blocks them when game-over). `elevation` covers Android stacking where `zIndex` alone is insufficient.
2. Host integration mounts `Hud` then `GameOverOverlay` inside same `Fragment` (=real order) and asserts both `zIndex:1 vs 2 position:absolute` + `Math.max 2>1` + `elevation 2>1` + `rgba(12,14,17,0.7)` + `pointerEvents auto` present; source scan pins dual `zIndex`+`elevation`.
3. Manual Android lane: `Expo Go` game-over with `zIndex:2` covers `Pausar` Hud button (tap does not reach it), overlay blocks board swipe; any `App.tsx` reorder that puts overlay before Hud would regress and is caught by integration `Fragment` order gate.

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned
**Verification:** `overlayCarriers.integration "[P0] integration overlay zIndex 2 layers above Hud zIndex 1"` `collectStyles zIndex 1/2 + position:absolute + elevation filter` + `hasStyle pointerEvents auto`; `rg -n "zIndex:\s*2" GameOverOverlay.tsx ==1` + `rg -n "zIndex:\s*1" Hud.tsx ==1` + `rg -n "elevation" Overlay==1/Hud==1`; manual Android `pointerEvents` QA note.

---

## Assumptions and Dependencies

### Assumptions

1. `GameOverOverlay` is presentation-only — no `triade/src/engine` / `triade/src/game/preview` / `Math.random` / `pickIndex` imports; `clampInset` is not derived from `layoutFor` or `BOARD_SIZE_FLOOR`, it defensively sits on pad math only. Any future engine roll import into `GameOverOverlay.tsx` is a defect.
2. `Hud` intentionally stays unclamped this sweep (`insets.top + SAFE_MARGIN` direct) so `getBandTop(insets,bandHeight)` drift vs overlay is known low-sev and not re-triaged as blocker; assumption checked by P1 `rg clampInset Hud==0` drift probe.
3. `Animated.Value` refs `scrimOpacity/contentOpacity/contentY` are `useRef(new ...).current` singletons stable across re-renders, so `[reducedMotion, scrimOpacity, contentOpacity, contentY]` deps do not re-trigger on value identity; re-target via `setValue(0/1/12)` before timing is synchronous host contract, future `useNativeDriver` bridge still respects it.
4. No production `GameOverOverlay.tsx` path outside `clampInset` returns a literal `NaN/Infinity` into `padding*`; assumption checked by P0 degenerate `NaN/Infinity/-20/undefined` per-edge plus bare `as any` fixture.
5. `numberOfLines=1 ellipsizeMode tail flexShrink:1` is sufficient with `row space-between` + `label flexShrink:0` for `>1e9` without adding `gap:8/minWidth:0/flexBasis:0`; assumption checked by P0 `1999999999` probe + manual 320pt SE PT `Sequência máxima` long-label QA.
6. `zIndex:2/elevation:2/pointerEvents auto/rgba(12,14,17,0.7)` co-located on `overlay` style + outer `Animated.View pointerEvents auto` is the full modal contract; `pointerEvents box-none` on `Hud` remains so overlay is the only modal on game-over. Any new `Modal` wrapper would replace this contract and retire the zIndex gate.
7. `spec-overlay-carriers-hardening.md` I/O matrix 5 rows is the acceptance source; no hidden AC beyond the 5 (toggle mid-fade, degenerate insets, >1e9 overflow, unmount mid-fade remount, zIndex layering) — NFR thresholds `clamp finite>=0 + SAFE_MARGIN 16` / `value flexShrink:1 tail` / `FADE_MS 280 delay80` are exact tokens not tunable metrics.
8. `npx tsc --noEmit -p tsconfig.test.json` baseline remains clean after `clampInset(v:unknown)` typing and `numberOfLines/ellipsizeMode` RN Text props (no circular import via `SAFE_MARGIN`).

### Dependencies

1. `triade/tsconfig.json` + `triade/tsconfig.test.json` + `triade/test-utils/rn-stub.ts:22-67` `Animated.Value _value/setValue/stopAnimation/timing/parallel/Value.interpret` — Required by host `npm test` (`TSX_TSCONFIG_PATH`) and `npx tsc --noEmit` gates. Status: Ready.
2. `triade/src/ui/layout.ts:4 SAFE_MARGIN 16` + `triade/src/ui/GameOverOverlay.tsx:40-44 clampInset` — Required before P0 degenerate clamp gates. Status: Done (`67a1b51` + base `layout.ts:4` stable).
3. `triade/src/ui/GameOverOverlay.tsx:52-83` reactive effect + `triade/test-utils/rn-stub.ts` timing stub — Required for P0 `false→true snap` + `true→false re-animate` + unmount `doesNotThrow`. Status: Done (`67a1b51` intact; stub `_value` exposes `setValue` synchronous).
4. `triade/src/ui/Hud.tsx:169-177 zIndex:1/elevation:1` overlay + `triade/src/ui/GameOverOverlay.tsx:180 zIndex:2/elevation:2` — Required for P0 zIndex integration `Fragment` gate. Status: Ready (both byte-stable).
5. `triade/__tests__/ui/components/gameOverOverlay.test.ts` existing 20 tests + `triade/__tests__/ui/components/overlayCarriers.integration.test.ts` 4 integration cases (`zIndex 2>1`, degenerate clamp, overflow `1999999999`, reducedMotion+unmount) — Required for P0/P1 overlay seam gates. Status: Done (working-tree, `npm test 24 pass` per spec log).
6. `triade/src/ui/GameOverOverlay.tsx:94-118 numberOfLines/ellipsize + 190-215 flexShrink` + `row space-between` — Required for P0 overflow `1999999999 tail` probe. Status: Done (`67a1b51`).
7. `_bmad-output/implementation-artifacts/deferred-work.md` ledger with `resolution-undo: 596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce` for DW-91/92/101/102 (4 hits) — Required for P2 ledger verification. Status: Done (working-tree `git diff HEAD -- deferred-work.md` 2 hunks `12 insertions / 4 deletions`).

### Risks to Plan

- **Risk**: `Hud` `clampInset` hardening in a follow-on sweep actually fans global `insets` sanitize to `App.tsx` (shared `sanitizeInsets` in `layout.ts` or wrapper in `useSafeAreaInsets`), unifying `Hud` + `GameOverOverlay` pads, but a future rotation lands an edge at `Infinity` on one platform and the shared helper returns `0` rather than `SAFE_MARGIN` additive as overlay does today (`pad = clamp(inset)+SAFE_MARGIN`), so `Hud` band mis-measures vs overlay by `16 pt` even though both clamp.
  - **Impact**: Hud `topPad = clamp(top)+16 =16` + `getBandTop(top,96) 16+96=112` but overlay `padTop 16` gives both `16` now (no drift); actually converging is correct — but if shared helper mistakenly returns `clamp(inset) || SAFE_MARGIN` rather than additive, `Infinity→0→SAFE_MARGIN` vs prior `NaN→0→16` is fine, only non-additive would drift.
  - **Contingency**: Treat any global sanitize as `pad = clampEdge(inset)+SAFE_MARGIN` additive atomically for all 4 edges; add `App.tsx` `sanitizeInsets` `4× +16` exhaustive test when lifting.

- **Risk**: `FADE_MS 280 delay80 Easing.out(cubic) useNativeDriver:true` choreography is copy-pasted `×3` `Easing.out(Easing.cubic)` identical per timing, but a future `reducedMotion` polish shortens `FADE_MS` to `200` only in `GameOverOverlay` while `ToastView.tsx` keeps `280`, visibly mismatching overlay vs toast fade together on game-over.
  - **Impact**: Visibly `GameOverOverlay` scrim/content fade finishes `80 ms` sooner than `ToastView` toast of same session, feels rushed.
  - **Contingency**: Treat `FADE_MS 280` as shared duration token; if changing, grep `rg -n "FADE_MS|duration: 280"` across `triade/src/ui/` and update both `GameOverOverlay` + `ToastView` together.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing `P0 degenerate НаN/-20/Infinity` + `1999999999 tail` + `false→true snap` template pins for any future `GameOverOverlay` prop widening — separate workflow; not auto-run.
- Run `*automate` for broader `GameOverOverlay+Hud` host coverage once the `Hud` global `clampInset` hardening lands (unifies `Hud` vs overlay drift).
- Run `*nfr-assess` after implementation evidence (overlay host runs) to validate NFR planning without inventing thresholds; run `*test-review` for adversarial review of the new `clampInset` + `flexShrink` + `zIndex`+`elevation` guard.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: ______________________ Date: __________
- [ ] Tech Lead: ______________________ Date: __________
- [ ] QA Lead: ______________________ Date: __________

**Comments:**

---

---



---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **UI `triade/src/ui/GameOverOverlay.tsx:40-44` `clampInset(v:unknown){Number.isFinite&&>=0?v:0} + SAFE_MARGIN` ×4 `padTop/Bottom/Left/Right`** | Hardening-only: every edge `pad = clampInset(insets?.field)+SAFE_MARGIN(16)` finite `>=16`, never `NaN/Infinity/<0` on degenerate rotation/tablet `NaN/-20/Infinity/undefined` or bare `as any` harness. | `overlayCarriers.integration [P0] degenerate clamp` + bare `paddingTop===16` must stay green; `gameOverOverlay.test.ts` `insets defensive ?.top ??0` harness `252 as any` still green; `Hud.tsx` not regressed (`git diff -- triade/src/ui/Hud.tsx` empty) |
| **UI `GameOverOverlay.tsx:52-83` reactive `useEffect` `reducedMotion` re-target: preamble `stopAnimation×3` → `if(reducedMotion) setValue(1/1/0) return` else `setValue(0/0/12) parallel timing 280 delay80 cubic nativeDriver →1/1/0` + cleanup `anim.stop+stopAnimation×3` deps `[reducedMotion, Values×3]`** | Hardening-only: `reducedMotion false↔true` mid-fade not stale (was `useRef` one-time init capturing first mount only); remount from clean `0/0/12` not leaked `1` `toValue`. | `overlayCarriers.integration [P0] reducedMotion reactive + unmount mid-fade` (`false→true _value1`, `true→false _value1`, `doesNotThrow unmount`, `remount J… CTA`) must stay green; `gameOverOverlay.test.ts` reduced suite still green (`960 pass` full suite); `npx tsc` both tsconfigs clean |
| **UI `GameOverOverlay.tsx:94-118` `Text numberOfLines=1 ellipsizeMode="tail"` ×5 + `GameOverOverlay.tsx:190-215` `label flexShrink:0 / value flexShrink:1 textAlign:right / valueRecord flexShrink:1 textAlign:right` + `row flexDirection:row space-between`** | Hardening-only: `score >1e9` `1999999999` not pushing label off-screen/wrapping; row stays `space-between` when value is `1…` tail; gold `valueRecord #E8A33D` when `isNewRecord` also flexed. | `overlayCarriers.integration [P0] overflow guard` (`valueNodes numberOfLines1 tail + flexShrink:1 on #1a1d23/#E8A33D`) + `gameOverOverlay.test.ts` row `space-between` pins + `gameOverOverlay.recordHighlight` gold `valueRecord` still green |
| **UI `GameOverOverlay.tsx:180` `overlay {position:absolute zIndex:2 elevation:2 backgroundColor rgba(12,14,17,0.7) justifyContent:center pointerEvents auto}` vs `Hud.tsx:169-177` `overlay {position:absolute zIndex:1 elevation:1 box-none}` + outer `accessibilityViewIsModal`** | Hardening-only: game-over modal layers above Hud and blocks board swipe; `elevation` covers Android stacking; `pointerEvents auto` + `accessibilityViewIsModal` modal semantics. | `overlayCarriers.integration [P0] zIndex 2>1 Fragment` (`zIndex1/2 + position:absolute + elevation + pointerEvents auto` + `Math.max 2>1`) + manual Android overlay covers `Pausar` not reachable via `pointerEvents`; `App.tsx` render order Hud→overlay must stay (no diff) |
| **A11y `GameOverOverlay.tsx:90` `View accessible alert a11yLabel Game over…` wrapping rows + `Pressable accessibilityRole button J…` sibling outside alert** | Hardening-only: `flexShrink/numberOfLines` additions are inside alert container only; outer not `accessible:true` so CTA not hidden by VoiceOver (D1 fix). | `gameOverOverlay.test.ts` a11y alert/button role pins + remount `findByProps Jogar de novo` still green; manual VoiceOver swipe reads stats then CTA, not blocked |
| **Orchestrator `triade/App.tsx: insets={insets}` fan-out to `Hud`+`GameOverOverlay` (`useSafeAreaInsets` only in App)** | Unchanged thin fan-out (no App diff); `insets` source stays `useSafeAreaInsets` from `App.tsx`, no new `initialMetrics`/band param. | `git diff HEAD -- triade/App.tsx` must stay empty for this sweep (no wiring change); `Hud` `insets` + `GameOverOverlay` `insets` each `insets={insets}` single fan-out verified via `rg -n "insets=\{insets\}" App.tsx` |
| **Layout `triade/src/ui/layout.ts:4 SAFE_MARGIN 16`** | Unchanged constant consumed by overlay clamp additive (`pad* = clamp(inset)+SAFE_MARGIN`); `layoutFor/getBandTop` untouched. | `layout.ts` byte-identical `git diff -- triade/src/ui/layout.ts` empty; `layout.test.ts` still green; `SAFE_MARGIN==16` imported once |
| **Engine `triade/src/engine/*` (spawn/weights/ceiling/pot/game)** | Byte-identical (`git diff --stat -- triade/src/engine` empty) — overlay is pure display, never mutates board/GameState, never consumes RNG. | Existing `adaptive-spawn / weights / engine.smoke / pot` suites must stay green; draw budget `effective 3 / noop 0 / newGame 20` preserved via engine unchanged |
| **Test tooling `triade/test-utils/rn-stub.ts:22-67` `Animated.Value _value/setValue/stopAnimation/timing/parallel` + `triade/__tests__/ui/components/gameOverOverlay.test.ts` 535 lines** | Already pure presentation hardening; stub exposes `_value` for host `_value 1/0` checks; existing 20-test suite stays green. | `engine.purity` + `ui.norolls` gates stay green (already via prior bundles); ledger `resolution-undo 596c2f86… 4 hits` verified; full `npm test -- triade` `960 pass` invariant |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology (P 1–3 × I 1–3 = Score, ≥6 high)
- `test-levels-framework.md` - Test level selection (Unit/Component/Integration vs E2E/API)
- `test-priorities-matrix.md` - P0–P3 prioritization
- `nfr-criteria.md` - NFR evidence for later `nfr-assess` (this sweep plans NFR, does not assess PASS/CONCERNS/FAIL)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md` (4 carriers, I/O matrix, code map, tasks/AC)
- Code: `triade/src/ui/GameOverOverlay.tsx:40-44,52-83,94-118,190-215` + `triade/src/ui/Hud.tsx:169-177` + `triade/src/ui/layout.ts:4` + `triade/test-utils/rn-stub.ts:22-67`
- Tests: `triade/__tests__/ui/components/gameOverOverlay.test.ts` + `triade/__tests__/ui/components/overlayCarriers.integration.test.ts:1-250` (4 integration P0)
- Prior suite: `triade/__tests__/ui/components/hud.test.ts` / `hud.previewWiring.test.ts` (Hud zIndex/elevation reference)
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-91/92/101/102 flipped `596c2f86f89f421758063c068af190fef0052b181dcedd83fcf199fda88f29ce`)
- Prior bundle: `_bmad-output/implementation-artifacts/bmad-dev-auto-result-*.md` (sweep bundle `67a1b51` verification `tsc clean, 24 pass, 960 pass, engine diff empty`)
- TEA config: `_bmad/tea/config.yaml` (`test_artifacts: _bmad-output/test-artifacts`, `risk_threshold: p1`)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
