---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-03'
inputDocuments:
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/test-utils/rn-stub.ts'
  - 'triade/__tests__/ui/components/gameOverOverlay.test.ts'
  - 'triade/__tests__/ui/ui.thinview.test.ts'
  - 'triade/App.tsx'
  - '_bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/bmad-dev-auto-result-dw-gameover-hardware-back-handler.md'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-gameover-hardware-back-handler — GameOverOverlay BackHandler hardwareBackPress blocking (DW-95)

**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-gameover-hardware-back-handler`
**Scope:** Targeted test design for the working-tree delta of `dw-gameover-hardware-back-handler` (DW-95)

> **Delta under assessment:** Working-tree vs `HEAD 6335c41 sweep dw-hud-score-a11y-polish` (`git diff HEAD --stat` = 3 files, 21 ins / 2 del, `baseline_revision 6335c4178ddb844283ce6fd533aef208904837c1` per spec):
> - `triade/src/ui/GameOverOverlay.tsx:2` — `import { Animated, BackHandler, Easing, Pressable, StyleSheet, Text, View } from 'react-native'` (added `BackHandler` to existing RN primitives, `Animated/Easing/Pressable/StyleSheet/Text/View` unchanged).
> - `triade/src/ui/GameOverOverlay.tsx:84-95` — NEW second `useEffect(() => { const handler = () => true; const sub: any = BackHandler.addEventListener('hardwareBackPress', handler); return () => { if (sub && typeof sub.remove === 'function') sub.remove(); else BackHandler.removeEventListener('hardwareBackPress', handler); }; }, []);` — mounted once per overlay lifetime, `handler` always returns `true` (consumes event), cleanup dual-path (`sub.remove()` for RN ≥0.65 `NativeEventSubscription`, else legacy `removeEventListener` fallback) — comment `DW-95: Block Android hardware back while GameOverOverlay is visible` (spec `triade/src/ui/GameOverOverlay.tsx:1-94`).
> - `triade/test-utils/rn-stub.ts:102-105` — NEW `export const BackHandler = { addEventListener: (_event: string, _handler: () => boolean) => ({ remove: () => {} }), removeEventListener: (_event: string, _handler: () => boolean) => {} };` — headless stub for `node --import tsx --test` via `tsconfig.test.json` path mapping (`triade/test-utils/rn-stub.ts:1-130`).
> - `_bmad-output/implementation-artifacts/deferred-work.md:822-829` — DW-95 ledger flipped `status: open → done 2026-09-03` with `resolution: resolved by sweep bundle dw-gameover-hardware-back-handler` + `resolution-undo: 5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00 2026-09-03 7374617475733a206f70656e` (single hunk, 5f794ee… is the prior TT-hash, `deb5edf9…` is the undo-base for DW-95's earlier 2026-09-02 line; `git diff HEAD -- deferred-work.md` = 1 hunk).
> - Untracked spec + result (not in `git diff HEAD --stat`): `_bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md:1-96` (intent contract + I/O matrix + code map + verification), `_bmad-output/implementation-artifacts/bmad-dev-auto-result-dw-gameover-hardware-back-handler.md` (`status: done`, bundle `gameover-hardware-back-handler DW-95`, `tsc --noEmit clean` claimed).
> - No engine/layout/preview/persist change: `git diff HEAD -- triade/src/engine` empty, `triade/src/ui/layout.ts` empty, `triade/src/render` empty, `triade/App.tsx` empty (`App.tsx:1165 {gameOver ? <GameOverOverlay …/> : null}` still siblings `GameBoard` — overlay lifetime still gates mount, same as baseline).
> - `sprint-status.yaml` is **orchestrator-owned** and intentionally not in scope — `never write it, and never revert a change to it` per prompt (no write, no revert verified via `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty).

---

## Executive Summary

**Scope:** Close DW-95 — Android hardware back dismissed `GameOverOverlay` without `handleRestart`, discarding `continue/matchStats` unintentionally. Before the sweep `GameOverOverlay.tsx:1` imported `Animated/Easing/Pressable/StyleSheet/Text/View` and blocked `Gesture.Pan` via `pointerEvents="auto" + accessibilityViewIsModal` but never imported `BackHandler`; `rn-stub.ts` had no `BackHandler` surface so headless tests could not spy it. The sweep confines the fix to a component-local `BackHandler` subscription tied to overlay lifetime (no `App.tsx` routing, no native module, no navigation stack): on mount `BackHandler.addEventListener('hardwareBackPress', () => true)` consumes the event, on unmount `sub.remove()` (or legacy `removeEventListener` fallback) releases it. Scrim `rgba(12,14,17,0.7)`, `zIndex:2/elevation:2`, `Animated` fade `280/80/cubic/useNativeDriver`, `HIT_TARGET`, a11y `accessible alert + Pressable`, `SAFE_MARGIN/clampInset` remain byte-identical; engine/ceiling/pot/weights/boardSize stays invariant.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (score ≥6): 3 (BackHandler API drift — `removeEventListener` TS2339 on RN 0.86 + subscription leak on dual-path mismatch; empty-deps `[]` forever-true handler vs future conditional back (continue slot); zero prior BackHandler coverage — regression not pinned)
- Critical categories: TECH (BackHandler API (`addEventListener → NativeEventSubscription` vs legacy `removeEventListener`), subscription lifetime vs `App.tsx` `{gameOver ? … : null}` mount, stub vs real `BackHandler`), BUS (hardware back trapped or not trapped — user-perceived navigation), OPS (ledger `5f794ee…` + `sprint-status.yaml` orchestrator-owned)

**Coverage Summary:**

- P0 scenarios: 6 groups (mount subscribes `hardwareBackPress → true`, handler returns `true` consumes event, unmount `sub.remove()` exactly once, no subscription when overlay not rendered (`gameOver=false`), `reducedMotion` independent, fallback/legacy path still cleans without throw)
- P1 scenarios: 6 groups (source pins `BackHandler` import + `addEventListener('hardwareBackPress', handler)` exact string + `() => true` + dual-path `sub.remove`/`removeEventListener` fallback + `[]` deps, `rn-stub.ts BackHandler` surface, thin-view `react-native` allowlist still green, `App.tsx` sibling mount order preserved, scrim/zIndex not regressed)
- P2/P3 scenarios: 5 groups (ledger `5f794ee…` 64-hex + `deb5edf9…` undo-base, engine/layout empty diff, `t + a11yLabel` unchanged, `tsc` both tsconfigs gate, exploratory double-mount thrash + manual Android hardware back on device)
- **Total effort**: ~2.0–3.8 hours (~0.3–0.5 day; host-only `node:test` + `react-test-renderer` + `tsc --noEmit`, no device lane required for host gate — single `triade/src/ui/GameOverOverlay.tsx` + `triade/test-utils/rn-stub.ts`, `npm --prefix triade test -- __tests__/ui/components/gameOverOverlay.test.ts` + `npm --prefix triade test` full gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score/spawn/ceiling/tier/pot/weights/ceilingDetector/tierForCeiling/matchStats/forfeitedContinue/rng reseed, `layout.ts` `layoutFor/boardSize`/`SAFE_MARGIN` derivation, `Board`/`TransitionPlan`/`GameBoard` Skia rendering, `PreviewCard`/`preview.ts` 60/40, `persist/hydration`, `AdMob/RevenueCat/Billing`, Epic 9-11 monetization, `ToneScreen`/`Hud` band math** | No file in the delta modifies engine rules, weights, ceiling, pot, stats, render, or preview. `git diff HEAD -- triade/src/engine` empty (0 hunks); `triade/src/ui/layout.ts` empty; `triade/src/render` empty; `triade/App.tsx:1165 {gameOver ? <GameOverOverlay …/> : null}` unchanged. `GameOverOverlay` is presentation-only thin-view; `matchStats` stringified via `String(stats.score)` at render time, no score math changed. | Existing `npm --prefix triade test` full gate (`980 pass / 385 skipped` per `2026-09-03` host run) stays invariant; `game.test.ts`/`line.test.ts`/`spawn.test.ts`/`ceiling.test.ts`/`engine.purity` not in delta — any regression caught by baseline. This plan only checks `rg -n "src/engine" triade/src/ui/GameOverOverlay.tsx ==0` + `git diff --stat -- triade/src/engine` empty. |
| **Moving overlay mount in `App.tsx`, adding `expo-router`/`react-navigation`/`react-native-gesture-handler` back integration, changing scrim `rgba(12,14,17,0.7)`/`zIndex:2/elevation:2/pointerEvents auto`/`HIT_TARGET 44`/`Animated` fade `280/80/cubic/useNativeDriver`, or changing `Board`/`Hud` layout containers** | Spec boundaries `Always: keep zIndex:2/elevation:2/pointerEvents auto scrim; keep BackHandler handler returning true` + `Block If: Need to change navigation stack, add native module, or change App.tsx routing` — `Block If: Requires react-native-gesture-handler back integration or expo-router`. `App.tsx` not in `--stat` (no hiring/deps drift). | Pinned via `rg -n "reanimated|skia" triade/src/ui/GameOverOverlay.tsx ==0` + `rg -n "expo-router|react-navigation" ==0` + `rg -n "rgba\(12,14,17,0\.7\)" GameOverOverlay.tsx ==1` + `rg -n "zIndex:\s*2" ==1` + `rg -n "pointerEvents" ==1` (`auto`) + `rg -n "HIT_TARGET" ==1` + `rg -n "280" ==1` (`FADE_MS`). Any new dep outside `Animated/BackHandler/Easing/Pressable/StyleSheet` is FAIL. |
| **Persisting hardware-back policy to store, wiring to `AccessibilityInfo`/store-backed derived value, changing `insets` source (`SafeAreaProvider`/`useSafeAreaInsets`) or adding `initialMetrics`, adding `setTimeout`/`setInterval` gating mount** | Spec `Never: add setTimeout/setInterval gating mount; edit deferred-work ledger; change Animated fade; mutate engine matchStats` — `BackHandler` handler is constant `() => true` per intent, no store hit. | Pinned via `rg -n "setTimeout|setInterval" triade/src/ui/GameOverOverlay.tsx ==0` + `rg -n "AsyncStorage|SecureStore|AccessibilityInfo" GameOverOverlay.tsx ==0` + `rg -n "useSafeAreaInsets" GameOverOverlay.tsx ==0` (only `App.tsx` owns insets). |
| **Board `role="grid"` a11y, dev-build physical device frame-rate `p99 <16.7ms`, `useWindowDimensions`/`orientation`/`App.tsx` wiring beyond `insets={insets}` passthrough, PreviewCard chrome** | No a11y/bench/ads code touched beyond `GameOverOverlay` `BackHandler` render pin; overlay already `accessible alert` + sibling `Pressable` (D1 fix) — no new `role="grid"` work. | Existing suites + manual-validation domain remain; this plan only checks a11y alert still present via `rg -n "accessibilityRole.*alert" GameOverOverlay.tsx ==1` and CTA `accessibilityLabel J…` present after mount/unmount/remount. |
| **Editing `sprint-status.yaml` or deferred-work beyond DW-95 (`open → done 2026-09-03` with `resolution-undo: 5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00`)** | `sprint-status.yaml` is orchestrator-owned (`never write it, and never revert a change to it` per prompt; `sprint-status.yaml is owned by the orchestrator`). `deferred-work.md` change is exactly 1 entry flipped `open → done 2026-09-03` with `resolution-undo` carrying prior `5f794ee…` + timestamp `7374617475733a206f70656e` (`open` hex) and undo-base `deb5edf9…` on the line above. | This plan never writes `sprint-status.yaml`; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in CI. Ledger verified via `rg -n "5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00" deferred-work.md ==1` + `rg -n "deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b" ==1` + `rg -n "resolution-undo" deferred-work.md` health. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `GameOverOverlay` is a pure function `(stats, isNewRecord, onRestart, insets, reducedMotion, activeLaneId, canContinue…) → ReactTree` with one extra side effect gated by lifetime: `useEffect([], BackHandler)`. All `BackHandler` behavior is controllable headless via `triade/test-utils/rn-stub.ts` stub — `addEventListener` is a plain function returning `{remove: () => {}}` so a host test can `spy = { addCalls: 0, removeCalls: 0, handler: null }` and replace `BackHandler.addEventListener = (ev, h) => { spy.addCalls++; spy.handler = h; return { remove: () => spy.removeCalls++ }; }` before `TestRenderer.create(…GameOverOverlay…)`. Mount is deterministic (`App.tsx` `{gameOver ? <GameOverOverlay/> : null}` sibling), so `no overlay → 0 subscriptions` is controllable by simply not rendering the component. `reducedMotion` is orthogonal (`BackHandler` effect deps `[]`, not `reducedMotion`), so toggling `reducedMotion:true/false` via `renderer.update(React.createElement(GameOverOverlay, {…reducedMotion:true}))` must leave `BackHandler` subscription count at `1` (not `2`). Unmount is `renderer.unmount()` inside `act()`, which triggers the effect cleanup. No `expo-*`/`Skia`/`Reanimated`/`navigation` deps needed; host `node --import tsx --test` + `react-test-renderer` drives all cases.

**Observability — Good, host-inspectable without device.** `BackHandler` subscription is observable via spy counts (`addCalls`, `removeCalls`, `handler !== null`) and via `handler()` return value (`=== true` proves consumption). `rn-stub.ts` instruments every `[P0]` case without needing an Android emulator: mount increments `addCalls` to `1` and captures `handler`; firing `spy.handler()` returns `true` (not `false/undefined`); `act(()=>renderer.unmount())` increments `removeCalls` to `1`; a second `TestRenderer.create` increments `addCalls` to `2` proving no singleton leak. Source-level pins complement renderer checks but alone would miss runtime drift: `src.includes("BackHandler.addEventListener('hardwareBackPress'")` + `src.includes("() => true")` + `src.includes("sub.remove")` + `src.includes("removeEventListener('hardwareBackPress'")` ensure the handler string, return value, and dual-path cleanup exist even if stub mocked `addCalls` via cache. The legacy fallback branch (`else BackHandler.removeEventListener`) is observable by making `addEventListener` return `undefined`/`null` (old RN shape) and spying `removeEventListener` call count.

**Reliability — Strong on host, thin on two edges (TS API drift + real compositor).** All normal paths are `never-throws` (no async, no throw): mount `addEventListener`, fire `handler() => true`, unmount `remove()` all wrapped in `act`. The current working tree was caught by `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` in this audit as **failing**: `triade/src/ui/GameOverOverlay.tsx:92 error TS2339: Property 'removeEventListener' does not exist on type 'BackHandlerStatic'` — `BackHandlerStatic` in `react-native@0.86.2` (`react-native/Libraries/Utilities/BackHandler.d.ts:35-43`) only exposes `addEventListener(eventName: BackPressEventName, handler: () => boolean | null | undefined): NativeEventSubscription` with no `removeEventListener` (removed in RN ≥0.65). `triade/tsconfig.test.json` passes because it path-maps `react-native → triade/test-utils/rn-stub.ts` whose `BackHandler` does expose `removeEventListener`, so the drift is masked in host tests; `triade/tsconfig.json` (real RN types) is the failing gate. The working-tree else-branch `BackHandler.removeEventListener('hardwareBackPress', handler)` is thus a **TS2339 type error on the prod tsconfig** that will break `tsc --noEmit` CI until the fallback is typed as `(BackHandler as any).removeEventListener`. Host `node:test` still 980 pass (`gameOverOverlay.test.ts` 14 P0/P1 green) because the stub at runtime provides `removeEventListener`, hiding the drift. A second thin surface: host `react-test-renderer` proves `addCalls/removeCalls` and `handler()===true` but not that the real Android `BackHandler` native module actually consumes the event and prevents `Activity.finish()` — only `Expo Go` on Android with physical back presses confirms it (R-001). No engine/layout change in delta (`git diff --stat -- triade/src/engine` empty), so wire reliability is isolated to `GameOverOverlay` + `rn-stub`.

**Testability Risks:** Three surfaces thin but mitigated: (a) `useEffect(…, [])` empty deps is correct for lifetime subscription but ESLint `exhaustive-deps` will flag `BackHandler` as missing if lint rule `react-hooks/exhaustive-deps` treats `BackHandler` as dependency — future auto-fix inserting `BackHandler` into deps would re-subscribe needlessly (R-002). (b) `rn-stub.ts` `BackHandler.addEventListener` signature `(_event: string, _handler: () => boolean)` is loosely typed `string` vs real `BackPressEventName = 'hardwareBackPress'` narrow type, so a typo `'hardwareBackPresss'` would still type-check in stub but fail on device (R-004). (c) Dual-path cleanup `if (sub && typeof sub.remove === 'function') sub.remove(); else (BackHandler as any).removeEventListener(...)` guards both RN APIs, but if both paths throw (e.g., `sub` is `{remove: null}`) the effect would throw inside cleanup and be swallowed by React — a defensive `try/catch` is not present (R-005).

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **BackHandler API drift — `removeEventListener` TS2339 on RN 0.86.2.** The delta adds fallback `else BackHandler.removeEventListener('hardwareBackPress', handler)` for older RN (<0.65), but `BackHandlerStatic` in `react-native@0.86.2` (`Libraries/Utilities/BackHandler.d.ts:35`) no longer declares `removeEventListener` (only `addEventListener → NativeEventSubscription`). Host `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` in this audit fails `TS2339: Property 'removeEventListener' does not exist on type 'BackHandlerStatic'` at `GameOverOverlay.tsx:92`. Stub at runtime does provide `removeEventListener`, so `npm --prefix triade test` still green, hiding the drift. Real risk: modern RN `addEventListener` always returns `NativeEventSubscription` with `.remove()`, so else-branch is dead code; on a hypothetical old RN where `addEventListener` returns `void/undefined`, the else-branch would then need `removeEventListener` but TS would still reject without `(BackHandler as any)`. CI gate breaks until fallback is typed as `any` or removed. | 3 | 3 | **9** | Fix: change `BackHandler.removeEventListener('hardwareBackPress', handler)` to `(BackHandler as any).removeEventListener?.('hardwareBackPress', handler)` or drop else-branch and rely solely on `sub?.remove()` with `sub: any` + `// @ts-expect-error legacy RN` comment so both `triade/tsconfig.json` and `triade/tsconfig.test.json` pass. Keep primary path `if (sub && typeof sub.remove === 'function') sub.remove();` as the modern contract. In this test design (no production code edit) mark as **BLOCK**: gate must `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean before merge (`tsconfig.test.json` already clean via stub path-map). Gate: P0 `tsc --noEmit` both tsconfigs via `npx tsc` probes below + P1 source scan `rg -n "as any.*removeEventListener|removeEventListener.*as any" GameOverOverlay.tsx` 1 hit after fix; host spy tests still pass with `addEventListener→{remove}`. Verify `triade/test-utils/rn-stub.ts:102-105` still exports `removeEventListener` for legacy path. Owner: FE lead. Timeline: before merge (same PR, one-line `as any`). |
| R-002 | TECH / BUS | **Empty-deps `[]` forever-true handler vs future conditional back.** `useEffect(…, [])` with `const handler = () => true` unconditionally consumes every hardware back while overlay alive, which is correct for DW-95 today (overlay has single `Jogar de novo` CTA, no `Continue` back-dismiss semantics). A future spec where `activeLaneId==='accelerated' && canContinue` shows a `Continue` slot may want hardware back to `onContinueCancel()` (dismiss continue offer) rather than trap, or to allow double-press `onRestart`. With `[]` deps the handler never re-creates on `canContinue/onContinueCancel` change, so conditional logic would be stale even if added. Also ESLint `exhaustive-deps` will flag `BackHandler` as missing, auto-fix inserting `BackHandler` into deps would re-run the effect needlessly. | 2 | 3 | **6** | Keep `[]` (lifetime subscription) while handler stays unconditional `() => true`; document via spec `Always: keep BackHandler handler returning true` and comment `handler is constant () => true per intent`. Gate: P0 mount/unmount `addCalls/removeCalls` proves lifetime not per-render; P1 source pin `rg -n "useEffect\(\(\) => \{[^]*hardwareBackPress[^]*\}, \[\]\)" GameOverOverlay.tsx ==1` ensures empty deps; future conditional back must change deps to `[canContinue, onContinueCancel]` and handler to `() => { onContinueCancel?.(); return true; }` with review. Owner: FE lead / PM if product wants `hardwareBack → cancel continue`. Timeline: not before this merge (deferred to when `accelerated` continue back semantics are specced). |
| R-003 | TECH | **Zero prior BackHandler coverage — regression not pinned.** Before this sweep `grep -rn "BackHandler\|hardwareBackPress" triade/__tests__` returned 0 hits; `gameOverOverlay.test.ts` has 20 tests (14 P0) pinning scrim/zEdge/fade but none spy `BackHandler`. The working-tree `npm --prefix triade test` still 980 pass because stub is new but no test asserts `addCalls/removeCalls/handler()===true`. A future rebase that drops the `BackHandler` effect or changes `() => true` to `() => false/undefined` (which lets Android dismiss the Activity) would still keep all 980 green, silently regressing DW-95. | 2 | 3 | **6** | Add headless P0 coverage (this plan's `P0` section) that spies `BackHandler.addEventListener/remove` via `rn-stub` injection: (a) mount subscribes `hardwareBackPress` exactly once, handler `() => true`, (b) `handler()===true` consumes, (c) unmount `remove()` exactly once, (d) no overlay rendered → `addCalls===0`, (e) `reducedMotion` toggle does not add second subscription, (f) fallback when `addEventListener` returns `undefined` still calls `removeEventListener`. Gate: P0 `BackHandler mount/unmount` tests `2-3` suites `<2 s` host; P1 source scan `rg -n "BackHandler\.addEventListener.*hardwareBackPress"` 1 hit + `rg -n "\(\) => true" GameOverOverlay.tsx` 1 hit. Owner: QA / FE lead. Timeline: before merge (one new test file `triade/__tests__/ui/components/gameOverHardwareBack.test.ts`). |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Stub vs real BackHandler type narrowness — stub `addEventListener(_event: string, …)` masks typo.** Real `BackHandler.addEventListener` signature is `addEventListener(eventName: BackPressEventName, …)` where `BackPressEventName = 'hardwareBackPress'` (narrow), so a typo `'hardwareBackPresss'` would TS-error on real but stub's `string` would still accept it and tests would pass, hiding a device-only bug where subscription never fires. | 2 | 2 | 4 | Keep stub loosely typed for host `node:test` but add P1 source pin `rg -n "addEventListener\('hardwareBackPress'" GameOverOverlay.tsx ==1` exact literal (no variable) and `rn-stub.ts` comment noting narrow type. Gate: P1 `rg` exact string + `npx tsc --noEmit -p triade/tsconfig.test.json` tightens real `BackHandler` call (even with stub override, `triade/tsconfig.json` checks real RN type via `node_modules`). |
| R-005 | TECH | **Cleanup dual-path could throw if `sub` is truthy but `.remove` is not a function (e.g., `{remove: null}`).** Current guard `if (sub && typeof sub.remove === 'function') sub.remove(); else BackHandler.removeEventListener…` handles `sub=undefined/null` and `sub={remove: fn}` but not `sub={remove:null}` which is truthy yet not function — the else branch would correctly fallback, but the then-branch condition would still be false and fallback fires, safe. However if `sub` is `{remove: () => {throw}}` (native module bug), the effect cleanup throws inside React's `commitUnmount` and is swallowed, leaving future back presses trapped. | 1 | 3 | 3 | Keep guard as landed `sub && typeof sub.remove === 'function'` (already defensive) and add `try/catch` only if native crash observed. Gate: P0 fallback test where `addEventListener` returns `{remove:null}` and spy `removeEventListenerCalls===1`; P0 `doesNotThrow unmount` where `addEventListener` returns `{remove: () => { throw new Error('native') }}` would still need manual `try/catch` hardening if ever triggered — currently deferred as low prob. |
| R-006 | TECH / BUS | **`App.tsx` mount race — rapid `gameOver true→false→true` could leave stale subscription if old cleanup not synchronous.** `gameOver = isGameOver(game.board)` drives `{gameOver ? <GameOverOverlay/>:null}`; a rapid double-toggle (e.g., `handleRestart` immediately followed by another `isGameOver` true due to hydrated stale `matchStats`) could mount/unmount/mount within one React batch before cleanup commits, briefly having two subscriptions. Stub `remove` is sync, real RN native subscription may be async-registered. | 1 | 3 | 3 | Keep effect deps `[]` (lifetime per mount) — each mount gets its own `sub`; React guarantees cleanup of previous mount before next `useEffect` on same instance, but across unmount/mount a new instance's effect runs after old cleanup. Gate: P0 `mount→unmount→remount` probe `addCalls===2 && removeCalls===1` after first unmount, `removeCalls===2` only after second unmount proves no leak; manual Android double-restart smoke. |
| R-007 | BUS | **Hardware back trapped without visible back affordance — `GameOverOverlay` has no `Back`/`Cancelar` label for hardware back, only `Jogar de novo` CTA, so a user long-pressing hardware back expecting to close the app (common Android muscle memory on game-over) will see nothing happen.** Intent is DW-95 `Block Android hardware back while GameOverOverlay is visible so the game is not dismissed unintentionally`, which is correct for losing `continue/matchStats`, but no visual cue explains why back does nothing. | 2 | 2 | 4 | Keep `() => true` trap (no discard) as spec `HARDWARE back while overlay handler returns true, event consumed, game not dismissed`. Gate: P2 manual `Expo Go` on Android — with overlay open, hardware back does nothing, `Jogar de novo` remains единственный CTA; UX follow-on adds an in-app `← Voltar` hint only if PM wants. Not a code gate failure today. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | PERF | **BackHandler micro-overhead — one `addEventListener` + one `remove` per game-over lifetime, handler is `() => true` with no allocation beyond closure.** JS thread `<1ms` synchronous; no `setTimeout`/`requestAnimationFrame` added; native `BackHandler` bridge is `DeviceEventEmitter` subscription O(1). No new re-render fan-out beyond prop change. | 1 | 1 | 1 | Monitor — `npm --prefix triade test` timing `<15 min` already includes stub; no bench lane needed. Real device `FADE_MS 280` unchanged. |
| R-009 | TECH | **Thin-view `react-native` allowlist now includes `BackHandler` — was `Animated/Easing/Pressable/StyleSheet/Text/View`, now `BackHandler` joins, so `ui.thinview.test.ts` must still allow it as `react-native` primitive.** `isAllowedViewImport` in `ui.thinview.test.ts:9` allows `react-native` + `react-native/*`, so `BackHandler` from `react-native` stays allowed; a stricter allowlist that enumerates `ViewStyle etc.` would flag it. | 1 | 1 | 1 | Monitor — P1 `thin-view` structural pin via `rg -n "extractSpecifiers.*react-native" ui.thinview.test.ts` health + `npm --prefix triade test -- __tests__/ui/ui.thinview.test.ts` still green (1/1). If allowlist ever pins exact `ViewStyle` etc., add `BackHandler` to allowlist or gate it separately. |
| R-010 | OPS | **Deferred-work ledger `resolution-undo` hash coupling — DW-95 `open→done 2026-09-03` carries `5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00` (plus `7374617475733a206f70656e` hex of `status: open`) and prior `deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b` as undo-base.** A follow-on sweep reopening without hash loses revert trail; writing `sprint-status.yaml` violates orchestrator bookkeeping. | 1 | 2 | 2 | Monitor — ledger already records `resolution-undo: 5f794ee…` per entry; any reopen must preserve it. This plan never writes `sprint-status.yaml`; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in CI. Health: `rg -n "5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00" deferred-work.md ==1` + `rg -n "resolution-undo" deferred-work.md` counts. |

### Risk Category Legend

- **TECH**: Technical (BackHandler API drift `TS2339`, subscription lifetime vs `App.tsx` `{gameOver ? … : null}`, stub vs real `BackPressEventName`, thin-view, unmount cleanup dual-path, mount race)
- **SEC**: Security — none this sweep (overlay is pure presentation, no auth/storage/crypto, hardware back is UX not security)
- **PERF**: Performance — `addEventListener`/`remove` O(1) `<1ms` (R-008), no `App.tsx` re-render fan-out
- **DATA**: Data Integrity — overlay never mutates `matchStats/continueBudget`; `handleRestart` remains sole mutator (spec `Never: Mutate engine matchStats`)
- **BUS**: Business Impact — hardware back trapped vs not trapped (user-perceived navigation, `continue/matchStats` not discarded), `Jogar de novo` remains единствен CTA
- **OPS**: Operations (ledger `5f794ee…` 64-hex + `deb5edf9…` undo-base, `sprint-status.yaml` orchestrator-owned R-010)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-gameover-hardware-back-handler` touches the **overlay presentation seam only**: **reliability (never-throw BackHandler mount/unmount + handler `() => true` stable)**, **performance (60 FPS fade unchanged, BackHandler O(1) `<1ms`)**, **accessibility (hardware back not dismissing modal is the a11y-intentional trap — VoiceOver path still via `alert` + CTA siblings)**, **maintainability (single `BackHandler` effect + single `rn-stub` surface + `resolution-undo` 5f794ee…)**, and **offline/installability** unchanged (pure TS + RN stub, no native module beyond `react-native`).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — BackHandler never-throw mount/unmount + dual-path cleanup | Mount always `addEventListener('hardwareBackPress', handler)` without throw (even when `addEventListener` returns `undefined`/`{remove:null}` legacy shape); `handler()===true` always; unmount always `remove()` or fallback `removeEventListener` without throw; rapid `mount→unmount→remount` not leaking `addCalls/removeCalls`. | R-001, R-005, R-006 | Unit host: `gameOverHardwareBack.test.ts` `[P0] mount subscribes + handler true` (`spy.addCalls===1 && handler()===true`) + `[P0] unmount remove` (`removeCalls===1`) + `[P0] fallback legacy` (`add→undefined` + `removeEventListenerCalls===1`) + `[P0] doesNotThrow mount+unmount` via `assert.doesNotThrow(()=>act(()=>renderer.unmount()))` + `npm --prefix triade test` full gate + `npx tsc --noEmit` both tsconfigs | Host P0 mount/unmount 4 fixtures `→` PASS log + `GameOverOverlay.tsx:84-95` diff + `rn-stub.ts:102-105` + `tsc` both clean + spy call tables |
| Reliability — no subscription when no overlay | When `gameOver===false` and `GameOverOverlay` not rendered, `BackHandler.addEventListener` from overlay is never called (`addCalls===0`), so hardware back retains default navigation (no global trap). | R-002, R-006 | Unit host: import `App.tsx` mount helper rendering `{gameOver=false}` tree (no `GameOverOverlay` in tree) → `spy.addCalls===0`; also `rg -n "GameOverOverlay" triade/App.tsx` shows `{gameOver ? <GameOverOverlay` conditional sibling pattern | P0 `no overlay → 0 subs` PASS + `App.tsx:1165` snippet + spy `addCalls` table |
| Reliability — reducedMotion independent | `reducedMotion:true/false` toggle via `renderer.update` does not change `BackHandler` subscription count (`addCalls` still `1` after toggle, `removeCalls` still `0` until unmount); handler still `() => true` after `false→true→false`. Follows spec `REDUCED_MOTION true — same BackHandler behavior`. | R-002 | Unit host: `filtered mount with reducedMotion:false` → `addCalls===1`; `update({reducedMotion:true})` → `addCalls===1` + `handler()===true`; `update({reducedMotion:false})` → still `1` | P0 `reducedMotion independent` PASS + `GameOverOverlay.tsx:84-95` deps `[]` pin + `reducedMotion` deps still only on fade effect not BackHandler |
| Performance — 60 FPS / fade + BackHandler O(1) | Fade `FADE_MS 280 delay80 Easing.out(cubic) useNativeDriver:true` unchanged; `BackHandler add/remove` `<1ms` synchronous (DeviceEventEmitter); no new `setTimeout`/`requestAnimationFrame`/image decode; score row layout O(1) flex. On-device `p99 <16.7ms` frame budget unchanged (project rule: Skia/animation manual only). | R-008 | Host `react-test-renderer` mount/unmount timing `<1ms` per sub; rely on CI `npm --prefix triade test` timing `<15 min`; follow-on device lane not needed for this sweep (pure TS+RN). | CI `npm test` timing `<15 min` + `feel.bench.test.ts` median unchanged + `rn-stub.ts` `BackHandler` path sync proof |
| Accessibility — hardware back trap + VoiceOver grouping & CTA | `GameOverOverlay` hardware back trapped (`handler()===true` consumes) so VoiceOver user cannot dismiss stats modal unintentionally; inner `View accessible alert` groups stats and `Pressable accessibilityRole button accessibilityLabel t('gameOver.restart')` sibling reachable after trap; `pointerEvents auto` still blocks underlying `Hud`. | R-007 | Unit host: remount `findByProps {accessibilityLabel:'Jogar de novo'}` still hittable after hardware back fire + unmount `doesNotThrow`; manual `Expo Go` on Android with overlay open: hardware back does nothing, swipe reads `Game over…` then `Jogar de novo`. | Host remount CTA hit + `GameOverOverlay.tsx accessibilityRole alert/button` scans + manual Android hardware back note |
| Maintainability | Single `BackHandler` effect at `GameOverOverlay.tsx:84-95` with deps `[]` (not scattered), single `BackHandler` surface in `triade/test-utils/rn-stub.ts:102-105` (`addEventListener→{remove}` + `removeEventListener` noop), single `Animated` fade effect unchanged at `GameOverOverlay.tsx:52-83`, `resolution-undo 5f794ee…` 64-hex ledger entry. | R-002, R-009, R-010 | Static-assert: `rg -n "BackHandler" GameOverOverlay.tsx ==3` (`import` + `addEventListener` + `removeEventListener` or `as any` fallback) + `rg -n "BackHandler" triade/test-utils/rn-stub.ts ==1` + `rg -n "hardwareBackPress" GameOverOverlay.tsx ==2` (`add` + fallback) + `rg -n "5f794ee…"` deferred-work.md ==1 | Source scans + `GameOverOverlay.tsx` diff + `rn-stub` diff + ledger diff; follow-on conditional back would change deps to `[canContinue,…]` with review |
| Compliance — thin-view + never-throw | Overlay stays `Animated/BackHandler/Easing/Pressable/StyleSheet/Text/View` only per UX-DR-8 `react-native` thin-view (no `reanimated/skia/haptics/revenuecat/navigation` import); `BackHandler` is a `react-native` primitive so thin-view allowlist passes. | — | Structural: `stripCommentsAndStrings(GameOverOverlay.tsx)` no `reanimated`/`skia`/`expo-haptics`/`expo-router` import; `extractNamedImports` shows only `Animated,BackHandler,Easing,Pressable,StyleSheet,Text,View` from `react-native` + `SAFE_MARGIN` from `./layout`. | `engine.purity.test.ts` structural suite complement + `rg -n "reanimated|skia|expo-router" GameOverOverlay.tsx ==0` + `tsc` clean |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (overlay pure TS + RN stub, `App.tsx` still `insets={insets}` only, no navigation dependency). | — | `npm --prefix triade test` offline (no network) still `≈980 pass / 385 skipped` | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. `BackHandler hardwareBackPress → true` is exact boolean contract (`true` consumes, `false` lets Activity finish — not a tunable threshold); `add/remove <1ms` is observational O(1) not a tuned threshold; ledger `resolution-undo 5f794ee…` is evidence hash, not threshold. If hardware back later needs `onContinueCancel` conditional, record its new handler contract vs this sweep rather than inventing a threshold.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (deferred-work DW-95 intent/boundaries signed — `GameOverOverlay.tsx` missing `BackHandler`, `rn-stub.ts` missing `BackHandler` surface not hardened; `spec-gameover-hardware-back-handler.md` intent contract + `Always` thin-view + `Block If navigation/native module/App.tsx routing` + `Never mutate engine/matchStats/add setTimeout` boundaries; `App.tsx:1165 {gameOver ? <GameOverOverlay …/> : null}` reference unchanged)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsconfig.test.json` + `tsconfig.json` + `node:assert/strict` + `react-test-renderer` + `triade/test-utils/rn-stub.ts` `BackHandler` stub `addEventListener→{remove}/removeEventListener`; working-tree on `6335c41` + bundle `dw-gameover-hardware-back-handler` applied (`git diff HEAD --stat` 2 production files + 1 doc))
- [ ] Test data available or factories ready (`stats: {score:123,best:456,maxTile:48,merges:7,longestStreak:3}`, `insets: {top:8,bottom:8,left:8,right:8}` (any finite), `reducedMotion false/true` toggle, `gameOver false` no-overlay fixture, `addEventListener→undefined` legacy fixture, `addEventListener→{remove:null}` guard fixture, `mount→unmount→remount` sequence)
- [ ] Feature deployed to test environment (working-tree `GameOverOverlay.tsx:84-95` BackHandler effect + `triade/test-utils/rn-stub.ts:102-105` stub patched; `git diff --stat -- triade/src/engine` empty verified, `App.tsx` not in diff)
- [ ] No engine edits beyond `GameOverOverlay.tsx:84-95` + `rn-stub.ts` + spec + ledger (+ optional `gameOverHardwareBack.test.ts`) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (mount subscribes `hardwareBackPress` once + handler `() => true` consumes, unmount `remove()` exactly once + legacy fallback without throw, `gameOver=false` → `0` subscriptions, `reducedMotion` toggle does not duplicate subscription — host `gameOverHardwareBack.test` 4/4 + fallback 1/1)
- [ ] All P1 tests passing (or failures triaged with waivers) — source `BackHandler` import + `addEventListener('hardwareBackPress', handler)` exact literal + `() => true` + dual-path `sub.remove`/`removeEventListener` fallback + `[]` deps, `rn-stub.ts BackHandler` surface pinned, `ui.thinview` still green, `App.tsx` sibling `{gameOver ? … : null}` preserved)
- [ ] No open high-priority / high-severity bugs (R-001 TS2339 `removeEventListener` typed `as any` / gate `tsc --noEmit` both tsconfigs clean; R-002 `[]` forever-true documented; R-003 coverage file present — all green or formally waived with `nfr-assess`)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on `BackHandler` mount/unmount/handler-returns-true seam; `rg` allowlists for `BackHandler ×3` + `hardwareBackPress ×2` + `() => true ×1` + `as any.*removeEventListener` (post-fix) green)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (both hit via `npx tsc` probes below — R-001 fix `as any` removes TS2339)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (BackHandler never-throw, no-subscription when no overlay, reducedMotion independent, hardware back trap observable, single `BackHandler` effect, offline still `≈980 pass`)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns `BackHandler` mount/unmount (`addCalls/removeCalls/handler()===true`) + `gameOver=false` `0` subs + `reducedMotion` independent + fallback legacy `removeEventListener`, ledger `5f794ee…/deb5edf9…` verification, `tsc` dual gate, `nfr-assess` handoff |
| FE lead | Dev Lead | Owns `GameOverOverlay.tsx:2 BackHandler import` + `:84-95 BackHandler effect (addEventListener hardwareBackPress () => true + cleanup sub.remove / as any removeEventListener fallback, deps [])` + `triade/test-utils/rn-stub.ts:102-105` stub, `tsc --noEmit` fix `TS2339 as any`, `gameOverHardwareBack.test.ts` cases, `ui.thinview` + `engine.purity` structural compliance |
| PM | PM | Signs hardware back **trapped** while GameOverOverlay visible (no discard of `continue/matchStats`, `Jogar de novo` is sole exit), accepts no visual back affordance today (intentional DW-95), and `Accelerated` continue hardware-back `onContinueCancel` deferred to later spec |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship DW-95; host unit + style-scan, already green at `6335c41` + working-tree (`node --import tsx --test` `980 pass` baseline, gameOverOverlay 14 green, but BackHandler not yet pinned — these cases close the gap)

**Criteria**: Blocks core navigation regression (hardware back dismissing game-over discards `continue/matchStats` with no user recovery) + high risk (≥6) + no workaround (Android hardware back is physical, user cannot opt out)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC-back-mount — `GameOverOverlay` mount via `TestRenderer.create(React.createElement(GameOverOverlay, {…as any}))` calls `BackHandler.addEventListener('hardwareBackPress', handler)` exactly once (`addCalls===1`, `handler` captured, `eventName==='hardwareBackPress'`). | Unit (react-test-renderer + rn-stub spy override) | R-002, R-003 | 1 | QA (new `gameOverHardwareBack.test.ts`) | `GameOverOverlay.tsx:89` `addEventListener('hardwareBackPress', handler)` where `handler = () => true`. Probe: replace `BackHandler.addEventListener` spy before create, assert `spy.addCalls===1` + `spy.lastEvent==='hardwareBackPress'` + `typeof spy.handler==='function'`. Complements baseline `gameOverOverlay.test.ts` (still green). |
| AC-back-handlerReturnsTrue — `spy.handler()` returns `true` (consumes event) not `false/undefined/null`. If this returns falsy, Android `Activity` finishes/hardware back propagates and game state is lost. | Unit | R-002, R-003, R-007 | 1 | QA | After mount, `assert.strictEqual(spy.handler(), true, 'hardwareBackPress handler must return true to consume event')`. Also pins source `rg -n "\(\) => true" GameOverOverlay.tsx ==1` (handler literal). |
| AC-back-unmountRemove — `act(()=>renderer.unmount())` mid-overlay (before or during fade) calls `sub.remove()` exactly once (`removeCalls===1`) without throw; `assert.doesNotThrow(()=>act(()=>renderer.unmount()))`. | Unit (lifecycle) | R-001, R-005, R-006 | 1 | QA | Effect cleanup `if (sub && typeof sub.remove === 'function') sub.remove(); else (BackHandler as any).removeEventListener…`. Probe: stub `addEventListener` returns `{remove: () => spy.removeCalls++}`; after `unmount`, `removeCalls===1`; remount is separate P0 below. Covers both fade-active and fade-complete unmounts. |
| AC-back-fallbackLegacy — When `addEventListener` returns `undefined`/`null` (old RN shape, or stubbed fallback), cleanup calls `BackHandler.removeEventListener('hardwareBackPress', handler)` exactly once without `sub.remove`. Verifies `TS2339` fallback path is reachable (after `as any` fix) and not dead code rot. | Unit (fallback branch) | R-001, R-005 | 1 | QA | Override `BackHandler.addEventListener = () => undefined` and spy `removeEventListener`; mount then `unmount` → `spy.removeEventListenerCalls===1` + `spy.removeCalls===0` + `spy.lastRemoveEvent==='hardwareBackPress'`. Also probes that fallback does not throw even when `sub` is `undefined`. |
| AC-back-noOverlayNoSub — When `gameOver===false` and `GameOverOverlay` not rendered (helper rendering `{gameOver ? <GameOverOverlay/> : null}` with no overlay), `BackHandler.addEventListener` is never called (`addCalls===0`) so hardware back retains default navigation. Proves subscription is tied to overlay lifetime, not global `App.tsx`. | Unit (App mount race) | R-002, R-006 | 1 | QA | Render a fragment without `GameOverOverlay` (or `App.tsx` tree with `gameOver=false`), assert `addCalls===0`; then render with `gameOver=true` → `addCalls===1` proves delta. Also `rg -n "gameOver \? \(.*<GameOverOverlay" triade/App.tsx ==1` preserves sibling conditional. |
| AC-back-reducedMotionIndependent — Mount with `reducedMotion:false` (`addCalls===1`), then `renderer.update(React.createElement(GameOverOverlay, {…reducedMotion:true}))` toggle does not increment `addCalls` (still `1`) and `handler()===true` after toggle; flip back `true→false` still `1`. Proves BackHandler effect deps `[]` not `[reducedMotion]`, so animation toggle never double-subscribes. | Unit (rn-stub reducedMotion) | R-002 | 1 | QA | Probe: `addCalls` after `update` still `1`, `removeCalls` still `0` until `unmount`; source pin `rg -n "useEffect\(\(\) => \{[^]*BackHandler[^]*\}, \[\]\)"` deps `[]` exactly 1 hit + `rg -n "reducedMotion" GameOverOverlay.tsx` shows BackHandler effect body contains no `reducedMotion`. |
| AC-back-mountUnmountRemount — `mount→unmount→remount` sequence: first mount `addCalls===1`, first `unmount` `removeCalls===1`, second `mount` `addCalls===2`, second `unmount` `removeCalls===2`, no leak (no `addCalls===2 && removeCalls===1` after first cycle). Also immediate remount CTA `findByProps {accessibilityLabel:'Jogar de novo'}` still hittable proves overlay usable after hardware back was trapped then dismissed via restart. | Unit (idempotency) | R-006 | (folded into unmount suite or standalone) | QA | Two `TestRenderer.create` cycles with spies reset or cumulative; `assert.strictEqual(removeCalls, addCalls, 'every add must eventually remove')` after second unmount. Guards R-006 rapid toggle leak. |

**Total P0**: 6 effective cases (7 requirement groups, mount→unmount→remount folded where noted — same file `triade/__tests__/ui/components/gameOverHardwareBack.test.ts` 5-6 `test()` bodies), `<2 s` host + `<15 min` full `npm --prefix triade test` gate

### P1 (High) — Core seam & style contracts

**Criteria**: Important `GameOverOverlay` seam (`BackHandler` import, exact event name, `() => true`, dual-path cleanup, `rn-stub` surface, thin-view, `App.tsx` sibling) + medium/high risk

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| BackHandler import — `GameOverOverlay.tsx:2` imports `BackHandler` from `react-native` alongside `Animated/Easing/Pressable/StyleSheet/Text/View` (not from `expo`/`navigation`/`gesture-handler`). | Static scan | R-002, R-009 | 1 | QA | `rg -n "from 'react-native'" triade/src/ui/GameOverOverlay.tsx` shows `BackHandler` in named imports; `rg -n "import.*BackHandler.*from 'react-native'" ==1` + `rg -n "expo-router|react-navigation|gesture-handler.*Back" GameOverOverlay.tsx ==0`. |
| Exact event name `hardwareBackPress` — both `addEventListener('hardwareBackPress', …)` and fallback `(BackHandler as any).removeEventListener('hardwareBackPress', …)` use exact narrow literal `'hardwareBackPress'` (not variable, not `'backPress'`). | Static scan | R-004 | 1 | QA | `rg -n "addEventListener\('hardwareBackPress'" GameOverOverlay.tsx ==1` + `rg -n "removeEventListener\('hardwareBackPress'" ==1` (post-fix `as any` allowed). Any drift to `'hardwareBackPresss'` is FAIL. |
| Handler literal `() => true` — source contains `const handler = () => true` (not `() => false`, `() => {return true}`, or `handler = myFn` alias) so code review can see trap intent. | Static scan | R-002, R-003 | 1 | QA | `rg -n "\(\) => true" GameOverOverlay.tsx ==1` (handler def) + `rg -n "handler.*=>.*true" ==1` + no `return false` near BackHandler. |
| Dual-path cleanup — source contains `if (sub && typeof sub.remove === 'function') sub.remove();` plus fallback `else (BackHandler as any).removeEventListener` (typed `as any` to silence `TS2339` after fix). | Static scan | R-001 | 1 | QA | `rg -n "typeof sub\.remove" GameOverOverlay.tsx ==1` + `rg -n "sub\.remove\(\)" ==1` + `rg -n "removeEventListener.*hardwareBackPress" ==1` + `rg -n "as any" GameOverOverlay.tsx` near removeEventListener (after fix). Pre-fix fails gate `tsc --noEmit` until `as any` added — this plan marks R-001 BLOCK. |
| Empty deps `[]` — `useEffect(() => { …BackHandler… }, [])` proves lifetime subscription not per-render. | Static scan | R-002 | 1 | QA | `rg -n "useEffect\(\(\) => \{[^]*BackHandler[^]*\}, \[\]\)" GameOverOverlay.tsx` 1 hit via multiline regex (or `rg -A2 "BackHandler.addEventListener" -n GameOverOverlay.tsx` + check `}, \[\]\)`). Complement to P0 reducedMotionIndependent. |
| rn-stub BackHandler surface — `triade/test-utils/rn-stub.ts:102-105` exports `BackHandler` with `addEventListener: (_event:string,_handler:()=>boolean)=>({remove:()=>{}})` and `removeEventListener` noop, mapped via `tsconfig.test.json` `paths: {"react-native":"./test-utils/rn-stub.ts"}` so `tsc --noEmit -p tsconfig.test.json` sees it. | Static scan | R-001, R-009 | 1 | QA | `rg -n "export const BackHandler" triade/test-utils/rn-stub.ts ==1` + `rg -n "addEventListener.*hardwareBackPress|BackHandler" rn-stub.ts ==1` + `rg -n "removeEventListener" rn-stub.ts ==1` + `tsconfig.test.json` contains `rn-stub`. |
| Thin-view + never-throw still green — `ui.thinview.test.ts` still allows `react-native` BackHandler import, `gameOverOverlay.test.ts` 14 P0 still green after handler added, no `setTimeout|setInterval|reanimated|skia` regression. | Static/unit | R-009 | 1 | QA | `rg -n "reanimated|skia" GameOverOverlay.tsx ==0` + `rg -n "setTimeout|setInterval" ==0` + `npm --prefix triade test -- __tests__/ui/ui.thinview.test.ts` 1/1 pass + `__tests__/ui/components/gameOverOverlay.test.ts` 14+ pass unchanged. |

**Total P1**: 7 checks, ~0.6–1.0 h host (mostly source scans + `npm --prefix triade test` slice)

### P2 (Medium) — Secondary flows + low/medium risk

**Criteria**: Secondary glue + low/medium risk + static/ledger scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single BackHandler effect + import allowlist — `BackHandler` import site `==1` + `BackHandler.addEventListener` uses `==1` + `removeEventListener` fallback `==1` (total `BackHandler` hits `==3-4` including `as any` fallback). | Static scan | R-009 | 1 | QA | `rg -n "BackHandler" triade/src/ui/GameOverOverlay.tsx | wc -l` ==3 (import + add + remove) post-fix (or 4 with `as any`). Any stray second effect is FAIL (only one lifetime subscription). |
| Engine & layout byte-identical — `git diff --stat -- triade/src/engine` empty + `triade/src/ui/layout.ts` empty + `triade/src/render` empty + `triade/App.tsx` empty (no engine rule/merge/tier/continue budget change leaked from overlay hardening). | Static scan | — | 1 | QA | `git diff HEAD -- triade/src/engine` must be empty in CI; `layout.ts` untouched except re-checking `SAFE_MARGIN 16` still `==16`. |
| Ledger `resolution-undo` hash — DW-95 `open→done 2026-09-03` carries `5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00` + `7374617475733a206f70656e` + undo-base `deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b` (prior line) — 1 hunk per entry. | Static scan | R-010 | 1 | QA | `rg -n "5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00" _bmad-output/implementation-artifacts/deferred-work.md ==1` + `rg -n "deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b" ==1` + `rg -n "resolution-undo" deferred-work.md` health. |
| `t` + `a11yLabel` vs hardware back — `a11yLabel Game over. Score …` still stringifies stats and `isNewRecord` without `toLocaleString`; `t('gameOver.restart')` still `Jogar de novo` after BackHandler added (no translation regression). | Unit | R-007 | 1 | QA | `rg -n "gameOver\.score\|gameOver\.best\|gameOver\.maxTile" GameOverOverlay.tsx >=3` + `rg -n 'a11yLabel.*Game over' GameOverOverlay.tsx ==1`; `gameOverOverlay.test.ts` a11y alert/button still green. |
| No navigation dependency — `package.json` not adding `expo-router`/`react-navigation`, `GameOverOverlay.tsx` not importing `useNavigation`/`router`. | Static scan | — | 1 | QA | `rg -n "useNavigation|router\.push|expo-router" triade/src/ui/GameOverOverlay.tsx ==0` + `rg -n "\"expo-router\"|\"@react-navigation" triade/package.json ==0`. |

**Total P2**: 5 checks, ~0.3–0.6 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — rapid toggle thrash `mount→unmount→mount→unmount→mount` 3 cycles with `reducedMotion:false/true` interleaved shows `addCalls===3 && removeCalls===2` before final unmount, final `addCalls===3 && removeCalls===3` after final unmount, no `BackHandler: attempted to add duplicate` yellowbox | Host exploratory (`react-test-renderer act`) | 1 | QA | Extends P0 idempotency to 3 cycles; expects `typeof handler==='function'` still and `handler()===true` on last mount. |
| Manual Android hardware back — `Expo Go` on Android with `GameOverOverlay` open: physical hardware back does nothing (modal stays, `Jogar de novo` still tappable), second hardware back still nothing, App hardware back after `Jogar de novo` (no overlay) does default back/exit as before | Manual device | 1 | QA | No assertion beyond P0 `handler()===true`; if trap feels like app hang, file follow-on adding `← Dica: Jogar de novo` hint, but not before PM sign-off. |
| Cross-cutting negative — `rg -n "BackHandler.*addEventListener.*hardwareBackPress.*=>.*false" triade/src/ui/GameOverOverlay.tsx ==0` (handler never returns false) and `rg -n "BackHandler.*removeEventListener.*hardwareBackPresss" ==0` (no typo) | Static scan | 1 | QA | If `=> false` appears or typo `hardwareBackPresss`, file patch before merge. |

**Total P3**: 3 checks, ~0.2–0.4 h host + device smoke

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `BackHandler` import/TS + `rn-stub` regressions before full gate

- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no `TS2339` — fallback typed `as any` so `BackHandler.removeEventListener` not flagged; `BackHandler` import resolves to `react-native` real + `rn-stub` mapping)
- [ ] `npm --prefix triade test -- __tests__/ui/components/gameOverOverlay.test.ts` host `14+ pass 0 fail` baseline still green (P0 smoke that BackHandler addition did not break existing scrim/zIndex/fade/CTA pins)

**Total**: 2 scenarios, `~30 s` `tsc` + `~5 s` host

### P0 Tests (<10 min)

**Purpose**: Critical `BackHandler` hardware back consume + mount/unmount lifetime + no-overlay guard (host only, no device lane for gate)

- [ ] `AC-back-mount` — mount subscribes `hardwareBackPress` exactly once
- [ ] `AC-back-handlerReturnsTrue` — `handler()===true` consumes event
- [ ] `AC-back-unmountRemove` — `unmount` calls `sub.remove()` exactly once `doesNotThrow`
- [ ] `AC-back-fallbackLegacy` — legacy `undefined` return triggers `removeEventListener` fallback `1` call
- [ ] `AC-back-noOverlayNoSub` — `gameOver=false` no overlay → `0` subscriptions
- [ ] `AC-back-reducedMotionIndependent` — `false→true` toggle does not duplicate subscription
- [ ] `AC-back-mountUnmountRemount` — `mount→unmount→remount` leak check + CTA still `findByProps {accessibilityLabel:'Jogar de novo'}`

**Total**: 7 P0 groups (5-6 `test()` bodies), `~2 s` host

### P1 Tests (<30 min)

**Purpose**: Source contracts for `BackHandler` seam + thin-view + `rn-stub` + `App.tsx` sibling

- [ ] `BackHandler` import from `react-native` + exact `'hardwareBackPress'` string `×2` + `() => true` literal
- [ ] Dual-path cleanup `sub.remove` + `(BackHandler as any).removeEventListener` typed `as any`
- [ ] Empty deps `[]` pin + `reducedMotion` not in BackHandler deps
- [ ] `rn-stub.ts` `BackHandler` surface (`add→{remove}` + `removeEventListener`)
- [ ] `ui.thinview.test.ts` still green + `reanimated|skia|setTimeout|setInterval ==0`

**Total**: 7 P1 checks, `~1 s` static + `~5 s` `ui.thinview` slice

### P2/P3 Tests (<60 min)

**Purpose**: Ledger + engine/layout empty + exploratory device

- [ ] Single `BackHandler` effect `==1` + engine/layout/App empty diff + ledger `5f794ee…/deb5edf9…` hash + `a11yLabel` unchanged + no navigation dep
- [ ] Exploratory thrash `3` cycles + manual Android `Expo Go` hardware back `does nothing` then `Jogar de novo` still reachable

**Total**: 5 P2 + 3 P3, `~1 s` static + `~2 s` host thrash + `~5 min` manual device smoke (optional for gate, required before release sign-off)

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 7 | 0.5 | ~1.0–1.8 | New `gameOverHardwareBack.test.ts` with `rn-stub` spy injection (mount/handler/unmount/fallback/no-overlay/reducedMotion/remount); `react-test-renderer act` + `assert.doesNotThrow`, no Expo build |
| P1 | 7 | 0.2 | ~0.6–1.0 | `rg` source pins + `rn-stub` surface + `ui.thinview` + `gameOverOverlay.test.ts` slice; already green but add 5-6 `rg` asserts once |
| P2 | 5 | 0.15 | ~0.3–0.6 | `rg` allowlists + `git diff --stat` engine/layout/App + ledger hash; trivial |
| P3 | 3 | 0.2 | ~0.2–0.4 | Thrash exploratory + manual Android `Expo Go` hardware back smoke (no code) |
| **Total** | **22** | **-** | **~2.0–3.8** | **~0.3–0.5 day wall-clock; host gate `<10 min` + manual `5 min`** |

### Prerequisites

**Test Data:**

- `stats` fixture ` {score:123,best:456,maxTile:48,merges:7,longestStreak:3}` + `stats: {score:1999999999,…}` not needed here (hardware back is stats-independent) + `insets: {top:8,bottom:8,left:8,right:8}` (any finite `>=0`, `clampInset` already tested elsewhere)
- Spy fixtures: `spy = {addCalls:0, removeCalls:0, removeEventListenerCalls:0, handler:null, lastEvent:null}` injected by monkey-patching `BackHandler` before `TestRenderer.create`
- Legacy fixtures: `addEventListener→undefined` (fallback path) and `addEventListener→{remove:null}` guard path
- `gameOver false` no-overlay fixture (no `GameOverOverlay` in tree) → `addCalls===0`
- `reducedMotion` toggle fixtures `false→true→false` via `renderer.update(React.createElement(GameOverOverlay,{…reducedMotion:true}))`

**Tooling:**

- Host `node --import tsx --test` (`TSX_TSCONFIG_PATH=tsconfig.test.json`) + `react-test-renderer` + `react` `act` + `node:assert/strict` (existing stack, no Playwright)
- `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` dual gate (R-001 blocks until `as any` fix)
- `rg` (`ripgrep`) for source pins: `rg -n "BackHandler" triade/src/ui/GameOverOverlay.tsx` etc. (used in P1/P2 static checks, also `pnpm dlx ripgrep` fallback)

**Environment:**

- `triade/` host (macOS `node >=26` + `tsx 4.23` + `typescript 6.0` + `react-test-renderer 19.2`)
- `triade/tsconfig.test.json` paths `{"react-native":"./test-utils/rn-stub.ts"}` + `triade/test-utils/rn-stub.ts` `BackHandler` stub (patched in this delta)
- No Expo dev build, no Android emulator for host gate; manual `Expo Go` on Android only for P3 device smoke (optional gate, required before release)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions) — every `BackHandler` mount/handler/unmount/fallback/no-overlay/reducedMotion/remount must pass; any `handler()!==true` or `removeCalls!==1` blocks release
- **P1 pass rate**: ≥95% (waivers required for failures) — source `BackHandler` import + `'hardwareBackPress'` literal + `() => true` + dual-path `as any` typed + empty deps `[]` + `rn-stub` surface + `ui.thinview` green; a missing `rg` pin is waiver-eligible only if P0 host proves behavior
- **P2/P3 pass rate**: ≥90% (informational) — ledger hash + engine empty + manual Android smoke
- **High-risk mitigations**: 100% complete or approved waivers — R-001 `tsc --noEmit` `TS2339` fixed (`as any` fallback) blocks gate; R-002 `[]` vs conditional back documented/PM-signed; R-003 coverage file present

### Coverage Targets

- **Critical paths**: ≥80% — `BackHandler` hardware back lifetime seam is the only critical path in this delta; `gameOverOverlay.test.ts` 20 + new `gameOverHardwareBack.test.ts` 5-6 covers it
- **Security scenarios**: 100% — N/A this sweep (overlay is pure presentation, no auth/storage/crypto) — already `0 sec` cases, still `0`
- **Business logic**: ≥70% — not engine delta (game rules not in scope), so business logic target is `N/A` for this sweep; `BackHandler` hardware back consumes event rather than business rule
- **Edge cases**: ≥50% — degenerate `add→undefined`, `add→{remove:null}`, `gameOver=false`, `reducedMotion` toggle, `mount→unmount→remount` all P0; narrow `320pt` / huge `score` already covered by prior sweep, not re-asserted here

### Non-Negotiable Requirements

- [ ] All P0 tests pass (mount `addCalls===1` + `handler()===true` + `unmount removeCalls===1` + fallback `removeEventListenerCalls===1` + `gameOver=false →0` + `reducedMotion` independent + remount CTA `Jogar de novo` reachable)
- [ ] No high-risk (≥6) items unmitigated — R-001 `tsc` `TS2339` fixed + gate `tsc --noEmit` both tsconfigs clean (verified `npx tsc --noEmit -p triade/tsconfig.test.json` exit 0); R-002 `[]` documented; R-003 pinned by new test file
- [ ] `BackHandler` hardware back **consumed** (`handler()===true`) and **released on unmount** (`remove()`) verified by host spy, not just source scan
- [ ] `sprint-status.yaml` not written and not reverted (`git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty in CI)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (BackHandler never-throw, no-subscription when no overlay, reducedMotion independent, hardware back trap observable, single `BackHandler` effect, offline still `≈980 pass`)

---

## Mitigation Plans

### R-001: BackHandler API drift — `removeEventListener` TS2339 on RN 0.86.2 (Score: 9)

**Mitigation Strategy:**
1. Keep primary path `if (sub && typeof sub.remove === 'function') sub.remove();` (modern `NativeEventSubscription` — RN ≥0.65 always returns this).
2. Change fallback from `BackHandler.removeEventListener('hardwareBackPress', handler)` to `(BackHandler as any).removeEventListener?.('hardwareBackPress', handler)` — `as any` silences `TS2339` (`BackHandlerStatic` no longer declares `removeEventListener`) and `?.` guards old stub not providing it.
3. Add `// legacy RN <0.65 fallback — typed any` comment so future reader does not remove it as dead code without checking `react-native` version.
4. Gate: `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` exits 0 (currently `TS2339`); `triade/tsconfig.test.json` already 0 via stub path-map. This design marks BLOCK. Host `npm --prefix triade test` still `980 pass` after `as any` (no runtime change).

**Owner:** FE lead
**Timeline:** Before merge (same PR, one-line `as any` edit to `GameOverOverlay.tsx:91-92`)
**Status:** Planned (TS2339 reproduced in this audit; `as any` not yet landed — this plan does not edit production code per prompt)
**Verification:** `npx tsc --noEmit --project triade/tsconfig.test.json 2>&1 | grep -c TS2339` `==0` after fix; `npm --prefix triade test -- __tests__/ui/components/gameOverOverlay.test.ts` still `14+ pass`; `rg -n "as any.*removeEventListener" GameOverOverlay.tsx ==1` post-fix.

### R-002: Empty-deps `[]` forever-true handler vs future conditional back (Score: 6)

**Mitigation Strategy:**
1. Keep `useEffect(…, [])` while handler is `() => true` (lifetime subscription, not per-render — avoids double-add on `reducedMotion` toggle and `stats` changes).
2. Document in spec `Always: keep BackHandler handler returning true` and inline comment `handler is constant () => true per DW-95 intent — if back needs onContinueCancel, change deps to [canContinue, onContinueCancel]`.
3. If conditional back ever specced (e.g., `accelerated` lane wants hardware back to `onContinueCancel`), migrate to `useCallback(handler, [onContinueCancel])` + `useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', handler); return () => sub.remove(); }, [handler])` pattern and add P0 `[P0] conditional back calls onContinueCancel` case — not now.

**Owner:** FE lead / PM
**Timeline:** Deferred (not before this merge; only when `accelerated` continue hardware-back semantics are specced)
**Status:** Planned
**Verification:** P0 `reducedMotion` independent already proves `[]` deps (addCalls not incremented on update); P1 `rg -n "useEffect\(\(\) => \{[^]*BackHandler[^]*\}, \[\]\)"` pin stays `1`; future migration must update this pin.

### R-003: Zero prior BackHandler coverage — regression not pinned (Score: 6)

**Mitigation Strategy:**
1. Add `triade/__tests__/ui/components/gameOverHardwareBack.test.ts` (host `node:test` + `react-test-renderer` + `rn-stub` spy) covering P0 matrix: mount `addCalls===1` + `handler()===true`, unmount `removeCalls===1` `doesNotThrow`, legacy fallback `removeEventListenerCalls===1`, `gameOver=false` `addCalls===0`, `reducedMotion` independent, `mount→unmount→remount` leak check. Each `test('[P0] …')` uses `assert.strictEqual`.
2. Add P1 source scan pins `BackHandler` import + `'hardwareBackPress' ===1 strict + `() => true` + dual-path `as any` fallback + `rn-stub` surface so a rename still fails gate even if host test cached.
3. Add to `npm --prefix triade test` full gate (`980→986 pass` after 6 new tests) and to `test-design` trace (this doc) so orchestrator can verify `coverage-matrix-dw-gameover-hardware-back-handler.json` later.

**Owner:** QA / FE lead
**Timeline:** Before merge (same PR, one new test file + `rg` pins; no production code beyond `BackHandler` effect already landed)
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/ui/components/gameOverHardwareBack.test.ts` `6 pass 0 fail` + `npm --prefix triade test` full `986 pass 0 fail` (385 skipped unchanged) + `rg -n "gameOverHardwareBack" triade/__tests__` `1` file + `coverage-matrix-dw-gameover-hardware-back-handler.json` notes `riskIds: [R-001,R-002,R-003]`.

---

## Assumptions and Dependencies

### Assumptions

1. `BackHandler` from `react-native` is the canonical Android hardware back surface (no `expo-router`/`react-navigation` back handling is active in this app — `triade/App.tsx` never mounts a navigation container, `App.tsx:1165` renders overlay as RN `View` sibling, not a screen).
2. `App.tsx` `gameOver = isGameOver(game.board)` drives `{gameOver ? <GameOverOverlay/> : null}` as the sole mount gate — overlay lifetime **is** the subscription lifetime (no second mount site, no global `App.tsx` `BackHandler` handler today).
3. `rn-stub.ts` is the sole `react-native` surface for headless `node:test` via `tsconfig.test.json` `paths: {"react-native":"./test-utils/rn-stub.ts"}` — stub `BackHandler` faithfully mirrors real contract `addEventListener→{remove}` + `removeEventListener` noop (modulo narrow type `string` vs `BackPressEventName`).
4. `reducedMotion` toggles `Animated` fade only; hardware back behavior is independent of `reducedMotion` (spec I/O matrix `REDUCED_MOTION true — same BackHandler behavior`).
5. Handler must always consume (`return true`) while overlay visible — no conditional `onContinueCancel` back today; future conditional back is deferred to when `accelerated` lane specs it.

### Dependencies

1. `react-native@0.86.2` `BackHandlerStatic` API — `addEventListener('hardwareBackPress', handler) → NativeEventSubscription` (modern, `TS2339` on `removeEventListener`) — required before fixing fallback's `as any` typing (`triade/src/ui/GameOverOverlay.tsx:84-95` depends on RN version).
2. `react-test-renderer@19.2` + `react 19.2` `act` + `node --import tsx 4.23` — required to drive host `BackHandler` spy tests (`triade/__tests__/ui/components/gameOverHardwareBack.test.ts` future file).

### Risks to Plan

- **Risk**: `react-native` bumps to `0.88+` could remove fallback entirely (delete `removeEventListener` from native) so `as any` fallback delete is safe but `sub.remove()` remains required — deleting `sub.remove()` by mistake traps back forever.
  - **Impact**: Hardware back stuck after overlay dismiss (user must force-kill app).
  - **Contingency**: Keep primary `sub.remove()` path first, fallback second; add comment `modern RN uses sub.remove(), legacy uses removeEventListener — do not delete either without real-device regression`; P0 fallback test would start failing if `sub` shape changes (addCalls still `1` but `removeCalls` not called).

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests `gameOverHardwareBack.test.ts` (separate workflow; not auto-run) — use this doc's P0 matrix (handler `() => true`, `addCalls/removeCalls`, fallback, `noOverlay`, `reducedMotion` independent, `mount→unmount→remount`) as red-phase scaffolds before verifying green.
- Run `*automate` for broader coverage once implementation exists (this sweep already implements, but `automate` would harden P1 `rg` scans + P2 `git diff --stat` engine empty into CI script).
- Run `nfr-assess` after P0 evidence exists to emit `PASS/CONCERNS/FAIL` per NFR category (reliability never-throw, hardware back trap observable, performance O(1), maintainability single effect, offline).

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: ______________________ Date: ___________
- [ ] Tech Lead: ___________________________ Date: ___________
- [ ] QA Lead: _____________________________ Date: ___________

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`triade/src/ui/GameOverOverlay.tsx:2,84-95` — `BackHandler` effect (lifetime subscription, deps `[]`, handler `() => true`)** | New side effect on mount (subscribes `hardwareBackPress`), consumed back while overlay visible, released on unmount. Also new import `BackHandler` from `react-native` (thin-view primitive). | `npm --prefix triade test -- __tests__/ui/components/gameOverOverlay.test.ts` 14+ pass `zIndex:2/elevation:2/pointerEvents auto/scrim rgba(12,14,17,0.7)/Animated 280/80/cubic/useNativeDriver/CTA HIT_TARGET/a11y alert+button` byte-identical; `npm --prefix triade test -- __tests__/ui/ui.thinview.test.ts` 1/1 pass (`BackHandler` from `react-native` is allowed); `npx tsc --noEmit -p triade/tsconfig.json` **and** `triade/tsconfig.test.json` both `0` after `as any` fallback fix (R-001). |
| **`triade/test-utils/rn-stub.ts:102-105` — `BackHandler` stub** | Headless `node:test` and `tsc --noEmit -p tsconfig.test.json` now resolve `BackHandler` via stub mapping. | `npm --prefix triade test` full `980→986 pass 0 fail 385 skipped` (no new `TS5101` stub-typing errors); `triade/__tests__/ui/ui.thinview.test.ts` still extracts `BackHandler` from `react-native` correctly (allowlist is specifier-based, not stub-dependent). |
| **`triade/App.tsx:1165-1180` — `{gameOver ? <GameOverOverlay …/> : null}` sibling to `GameBoard` (unchanged)** | No code change but mount gate for `BackHandler` lifetime — `gameOver=true` → overlay mounts → `addEventListener`, `gameOver=false` → unmount → `remove()`. | `npm --prefix triade test` `gameOverOverlay.test.ts: [P0] AC1 board last move stays visible — overlay does not unmount GameBoard` still 1 pass (GameBoard stays mounted under scrim); `App.tsx` `rg -n "gameOver \?"` conditional still `1` occurrence. |
| **`triade/src/ui/Hud.tsx` / `PauseButton.tsx` / `layout.ts` / `engine/**` / `render/GameBoard.tsx`** | No file in the delta — still `HIT_TARGET`, `SAFE_MARGIN 16`, `clampInset` (prior sweep), Skia `cellColor` etc. unchanged. | `git diff HEAD -- triade/src/ui/layout.ts` empty + `triade/src/engine` empty + `triade/src/render` empty in CI; `npm --prefix triade test` `engine.purity` + `layout` + `ceiling` + `spawn` + `line` + `game` suites unchanged (`≈980 pass`). |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification (TECH/SEC/PERF/DATA/BUS/OPS) + gate ownership + score thresholds
- `probability-impact.md` — Probability (1-3) × Impact (1-3) → Score (1-9) + `BLOCK (9)`/`MITIGATE (6-8)`/`MONITOR (4-5)`/`DOCUMENT (1-3)` action map
- `test-levels-framework.md` — Test level selection (Unit for `BackHandler` lifetime via `react-test-renderer` + `rn-stub`; static scans for source pins; no E2E `playwright-cli` needed — host `node:test` only)
- `test-priorities-matrix.md` — P0/P1/P2/P3 priority assignment (P0 = blocks core hardware back consume + high risk + no workaround; P1 = source contracts + stub + thin-view; P2 = ledger + engine empty; P3 = thrash + manual Android)
- `nfr-criteria.md` — NFR planning (reliability never-throw, performance O(1), accessibility hardware-back trap, maintainability single effect, offline installable) — planned evidence, not final `PASS/FAIL` (use `nfr-assess` later)
- `component-tdd.md` / `test-quality.md` — deterministic `node --import tsx --test` + `react-test-renderer` spy injection (replace `BackHandler.addEventListener` before create), `assert.strictEqual`, `act(() => renderer.unmount())`, no `expect`/mock vagueness

### Related Documents

- PRD: `_bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md` (intent contract `Always`/`Block If`/`Never`, I/O matrix `HAPPY/HARDWARE/DISMISS/NO overlay/REDUCED_MOTION/OLD RN`, code map `GameOverOverlay.tsx:1-94` + `rn-stub.ts:103-107` + `App.tsx:1166`)
- Epic: `_bmad-output/implementation-artifacts/deferred-work.md:822 DW-95 Navigation/hardware-back não bloqueado`
- Architecture: `triade/src/ui/GameOverOverlay.tsx:1-94` (thin-view: only `react-native` + `./layout` `SAFE_MARGIN` + `./PauseButton` `HIT_TARGET` + `../i18n`)
- Tech Spec: `triade/tsconfig.test.json` (`paths: {"react-native":"./test-utils/rn-stub.ts"}` for host `BackHandler` stub), `react-native@0.86.2 BackHandlerStatic` (real `BackHandler.d.ts:35-43` narrow `BackPressEventName`)
- Prior test design: `_bmad-output/test-artifacts/test-design/test-design-dw-overlay-carriers-hardening.md` (DW-91/92/101/102 carriers — `clampInset`, `reducedMotion` reactive, `numberOfLines` overflow, `zIndex`; this sweep is orthogonal — new `BackHandler` layer, no clamp/animation change)
- Verification result: `_bmad-output/implementation-artifacts/bmad-dev-auto-result-dw-gameover-hardware-back-handler.md` (`status: done`, `tsc --noEmit clean` claimed but audit found `TS2339` until `as any` fix)

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat — Master Test Architect)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6 — Epic-Level sweep-bundle deep-dive)
