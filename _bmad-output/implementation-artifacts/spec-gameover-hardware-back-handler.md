---
title: 'gameover-hardware-back-handler'
type: 'bugfix'
created: '2026-09-03'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '6335c4178ddb844283ce6fd533aef208904837c1'
final_revision: 'HEAD'
---

<intent-contract>

## Intent

**Problem:** `GameOverOverlay` blocks `Gesture.Pan` via `pointerEvents="auto"` + `accessibilityViewIsModal` but does not block Android `BackHandler` hardware back. Pressing hardware back while overlay is visible dismisses the overlay without `handleRestart`, discarding `continue/matchStats` state unintentionally (DW-95).

**Approach:** Add `BackHandler` `hardwareBackPress` subscription in `GameOverOverlay.tsx` that returns `true` while overlay is mounted and cleans up on unmount. Subscription tied to overlay lifetime ensures no impact when no overlay and removal verified when overlay dismisses. Use `addEventListener` return subscription with fallback to `removeEventListener` for older RN.

**Block If:** Need to change navigation stack, add native module, or change `App.tsx` routing.

**Never:** Edit deferred-work ledger; change `Animated` fade (280ms/`Easing.out(cubic)`/`useNativeDriver:true`); add `setTimeout`/`setInterval` gating mount.

## Boundaries & Constraints

**Always:** Keep `GameOverOverlay` thin-view (only `react-native` primitives + same-dir siblings); keep `zIndex:2`/`elevation:2`/`pointerEvents="auto"` scrim; keep `BackHandler` handler returning `true`.

**Block If:** Requires `react-native-gesture-handler` back integration or `expo-router`.

**Never:** Mutate engine `matchStats` or `continueBudget` from overlay; add navigation dependency.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY overlay mounted | `GameOverOverlay` rendered (`gameOver===true`) | `BackHandler.addEventListener('hardwareBackPress', () => true)` subscribed | No throw |
| HARDWARE back while overlay | hardwareBackPress event fires | handler returns `true`, event consumed, game not dismissed, `handleRestart` not called implicitly | No discard |
| DISMISS overlay | overlay unmounts (`handleRestart` or new game) | subscription `remove()` called, or `removeEventListener` fallback | No leak |
| NO overlay | `gameOver===false`, overlay not rendered | no `BackHandler` subscription active, hardware back has default behavior | No impact |
| REDUCED_MOTION true | overlay with `reducedMotion:true` | same BackHandler behavior (independent of animation) | No throw |
| OLD RN API | `addEventListener` returns undefined | fallback `BackHandler.removeEventListener('hardwareBackPress', handler)` on cleanup | No leak |

</intent-contract>

## Code Map

- `triade/src/ui/GameOverOverlay.tsx:1-94` -- target: import `BackHandler` from `react-native`, add second `useEffect` subscribing `hardwareBackPress` => `true` and cleaning up via `sub.remove()` / `removeEventListener` fallback
- `triade/test-utils/rn-stub.ts:103-107` -- add `BackHandler` stub (`addEventListener`/`removeEventListener`) for headless `node --test` via `tsconfig.test.json` path mapping
- `triade/App.tsx:1166` -- mounts `GameOverOverlay` as `{gameOver ? <GameOverOverlay .../> : null}` sibling, keeps `GameBoard` mounted under scrim; no change needed
- `triade/__tests__/ui/components/gameOverOverlay.test.ts` -- existing 20-test suite pinning scrim `rgba(12,14,17,0.7)`, `zIndex:2`, `Animated.timing` 280ms, thin-view guards; must stay green

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/ui/GameOverOverlay.tsx` -- import `BackHandler`, add `useEffect(() => { const handler=()=>true; const sub=BackHandler.addEventListener('hardwareBackPress',handler); return ()=>{if(sub?.remove)sub.remove();else BackHandler.removeEventListener('hardwareBackPress',handler);} },[])` after fade `useEffect`; keep existing fade logic untouched
- [x] `triade/test-utils/rn-stub.ts` -- export `BackHandler` stub with `addEventListener` returning `{remove}` and `removeEventListener` noop for `tsc --noEmit -p tsconfig.test.json` and `node --test` headless
- [x] Verify handler returns `true` (consumes event), subscription removed on unmount, no subscription when overlay not rendered, fallback path works

**Acceptance Criteria:**
- Given `GameOverOverlay` mounted, when `BackHandler` `hardwareBackPress` fires, then handler returns `true` and game is not dismissed
- Given overlay unmounted (restart), when checking `BackHandler`, then subscription `remove()` has been called exactly once, no leak
- Given `gameOver===false` (no overlay), when hardware back pressed, then no `BackHandler` subscription from overlay exists (0 active)
- Given `reducedMotion:true|false`, when overlay mounts/unmounts, then BackHandler behavior identical (mount adds, unmount removes)

## Spec Change Log

- 2026-09-03: Initial spec for DW-95

## Review Triage Log

## Design Notes

Handler is constant `() => true` per intent “returns true while overlay is shown”. Subscription scoped to overlay lifetime (not global App handler) so no impact when no overlay. Fallback handles RN <0.65 `removeEventListener` API.

## Verification

**Commands:**
- `npx tsc --noEmit -p triade/tsconfig.test.json` -- expected: EXIT 0
- `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/ui/components/gameOverOverlay.test.ts` -- expected: 20 PASS
- `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/ui/ui.thinview.test.ts triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` -- expected: 7 PASS
- Manual headless check: mount overlay via `TestRenderer`, spy `BackHandler.addEventListener`, fire handler => `true`, unmount => `remove` called

**Manual checks (if no CLI):**
- Mount `GameOverOverlay`, hardware back is consumed (returns true), unmount removes subscription, second mount/unmount repeats cleanly

## Auto Run Result

Status: done

Summary: Blocked Android hardware back while GameOverOverlay visible via BackHandler hardwareBackPress subscription returning true, cleaned up on unmount with fallback for older RN. Added rn-stub BackHandler for headless tests. All 20 overlay tests green, thin-view guard still passes, tsc clean.
