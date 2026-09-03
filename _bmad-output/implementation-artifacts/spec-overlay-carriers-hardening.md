---
baseline_revision: 58e036c
final_revision: 5d47ec4
title: 'Overlay carriers hardening'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** GameOverOverlay carries four low-severity brittle carriers — reducedMotion useRef is one-time init so toggle/remount is stale, insets propagate NaN/negative/undefined to padding, huge score (>1e9) overflows row space-between, and unmount mid-fade single-cycle cleanup plus untested zIndex layering (overlay 2 vs Hud 1).

**Approach:** Harden triade/src/ui/GameOverOverlay.tsx locally in one pass — make reducedMotion reactive by re-targeting/recreating Animated.Value on prop change with clean stop/restart, clamp every inset edge to finite >=0, add numberOfLines=1 ellipsizeMode="tail" flexShrink to score rows, and guarantee unmount mid-fade clears and restarts cleanly, verified by an integration render test for zIndex layering.

## Boundaries & Constraints

**Always:** All fixes stay component-local to triade/src/ui/GameOverOverlay.tsx except the integration test file; never widen engine/game/render diff; keep scrim rgba(12,14,17,0.7) final + zIndex:2/elevation:2/pointerEvents auto + HIT_TARGET + a11y contracts byte-identical; use RN Animated/Easing only.

**Block If:** Need to move overlay to reanimated/skia, change App.tsx wiring, or add new runtime deps.

**Never:** Import from src/engine; add celebration strings; change board/hud layout contracts; create store-backed reducedMotion wiring (keep prop).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| reducedMotion toggle false→true mid-fade | reducedMotion prop flips while anim running, then flips back | Opacities snap to 1 and translateY to 0 via setValue on true; on false, reset to start values (0/0/12) then re-animate to 1/1/0 with FADE_MS 280 delay 80; no leaked timer | anim.stop + stopAnimation in cleanup; re-target on every toggle |
| insets degenerate | insets undefined / partial / {top:NaN,bottom:-20,left:Infinity,right:undefined} + rotation | All four paddings clamp to finite >=0 → padding = clamp(insetEdge)+SAFE_MARGIN (16); no NaN/negative/Infinity reaches style | clamp helper: finite check + Math.max(0, …) + ??0 fallback |
| huge score overflow | stats.score=1_999_999_999 (or best/maxTile large) in row space-between | Value Text stays single-line, tail-ellipsized, flexShrink:1, does not push label off-screen nor wrap | numberOfLines=1 ellipsizeMode="tail" + style flexShrink:1 minWidth:0 |
| unmount mid-fade then remount | unmount during 280ms fade, immediate remount with same or toggled reducedMotion | First anim stopped, no warning, no shared Animated.Value leak; second mount animates from clean start values | cleanup stops parallel anim + stopAnimation×3; fresh start values per mount/toggle |
| zIndex layering | Render Hud (zIndex:1) and GameOverOverlay (zIndex:2) together | Overlay container style zIndex 2 > Hud overlay zIndex 1, both position absolute, overlay blocks gestures | Integration test asserts zIndex ordering via hasStyle/collectStyles |

</intent-contract>

## Code Map

- `triade/src/ui/GameOverOverlay.tsx:1-279` -- target file for all four carriers (Animated.Value refs, insets padding, row Text, styles row/value)
- `triade/src/ui/Hud.tsx:169-177` -- reference for zIndex:1 layering to assert against (overlay must be 2)
- `triade/src/ui/layout.ts:4` -- SAFE_MARGIN 16 used in clamp (padding = clamp(inset)+SAFE_MARGIN)
- `triade/test-utils/rn-stub.ts:22-67` -- Animated stub (Value _value/setValue/stopAnimation, timing/parallel) used by existing tests
- `triade/__tests__/ui/components/gameOverOverlay.test.ts:1-535` -- existing suite to keep green; pattern for clamp/ellipsize/reducedMotion pins
- `triade/__tests__/ui/components/hud.test.ts` -- Hud rendering helper pattern for integration test
- `triade/__tests__/integration/` -- candidate location for new zIndex integration test (or `triade/__tests__/ui/components/overlayCarriers.integration.test.ts`)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/ui/GameOverOverlay.tsx` -- clamp insets top/bottom/left/right to finite >=0 via helper `clampInset(v)` and apply to padTop/padBottom/padLeft/padRight (+SAFE_MARGIN); handle undefined/NaN/Infinity/negative -- rationale DW-92/DW-102
- [x] `triade/src/ui/GameOverOverlay.tsx` -- make reducedMotion reactive: keep useRef Animated.Values but add effect that on every reducedMotion change stops previous anim, re-targets via setValue (true→1/1/0 immediate; false→reset 0/0/12 then animate 280/80/cubic/useNativeDriver) and cleans up on unmount; ensures remount/toggle not stale -- rationale DW-91/DW-102
- [x] `triade/src/ui/GameOverOverlay.tsx` -- add overflow guard to score/best/maxTile/merges/longestStreak value Texts: `numberOfLines={1} ellipsizeMode="tail"` plus style `flexShrink:1` (and `minWidth:0` via row layout or text style) so >1e9 does not overflow space-between -- rationale DW-101
- [x] `triade/src/ui/GameOverOverlay.tsx` -- ensure unmount mid-fade clears and restarts cleanly: cleanup calls anim.stop()+stopAnimation×3, effect dependency includes reducedMotion, second mount starts from clean start values not leaked previous toValue -- rationale DW-102
- [x] `triade/__tests__/ui/components/overlayCarriers.integration.test.ts` (or `triade/__tests__/integration/overlayHudLayering.integration.test.ts`) -- integration render test that mounts Hud and GameOverOverlay together and asserts overlay zIndex 2 > Hud zIndex 1, both position absolute, and overlay pointerEvents auto; also pins clamp and ellipsize via rendered props/styles -- rationale DW-102 zIndex carrier

**Acceptance Criteria:**
- Given reducedMotion flips false→true→false while overlay mounted, when prop toggles, then opacities/translateY snap or re-animate to correct end values without leaked timing and without recreating stale Animated.Value from first mount only
- Given insets = {top: NaN, bottom: -10, left: Infinity, right: undefined} (or undefined insets via as any bare call), when overlay renders, then all four paddings are finite numbers >= SAFE_MARGIN and no NaN/negative/Infinity reaches style
- Given stats.score = 1999999999, when overlay renders, then value Text has numberOfLines=1 ellipsizeMode="tail" and flexShrink:1 (style) and row stays space-between without overflow
- Given overlay unmounts mid 280ms fade and remounts immediately, when unmount+remount occurs, then no exception/warning, cleanup called, and second mount shows correct start→end opacity/translateY
- Given Hud and GameOverOverlay rendered together, when inspecting styles, then overlay zIndex 2 > Hud zIndex 1 and both are position absolute covering screen

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2
- addressed_findings:
  - none

## Auto Run Result

- Summary: Hardened GameOverOverlay carriers in one pass — clamped insets to finite >=0 (all four edges), made reducedMotion reactive via stopAnimation + setValue re-target on toggle with clean restart on remount, added numberOfLines=1 ellipsizeMode tail flexShrink to all value Texts so >1e9 does not overflow row space-between, preserved scrim rgba(12,14,17,0.7) + zIndex:2 layering above Hud zIndex:1 verified by integration test.
- Files changed:
  - `triade/src/ui/GameOverOverlay.tsx:40-44,52-83,94-118,190-215` -- clampInset helper, reactive effect with reset, overflow guards, flexShrink styles
  - `triade/__tests__/ui/components/overlayCarriers.integration.test.ts:1-120` -- integration test for zIndex, clamp, ellipsize, reducedMotion reactive + unmount mid-fade
  - `_bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md` -- spec for bundle
- Review findings breakdown: patches applied 0, items deferred 0, items rejected 2 (low — pre-existing board-size clamp and label width noise, not this story)
- Follow-up review recommended: false — 4 integration pins + clamp/ellipsize/re-target verified, 0 fail, tsc clean, engine diff empty, scope component-local
- Verification performed:
  - `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` → clean
  - `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json` → clean
  - `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/overlayCarriers.integration.test.ts` → 24 pass 0 fail
  - `npm test -- triade` → 960 pass 0 fail (skipped 366)
  - `git diff --stat -- triade/src/engine` → empty
- Residual risks: None — clamp is defensive (>=0 finite), reducedMotion re-target is synchronous setValue before timing, overflow guard is additive flexShrink, all behind existing animation contract FADE_MS 280 delay 80.

## Design Notes

Effect shape (illustrative, keep FADE_MS 280 / delay 80 / Easing.out(Easing.cubic) / useNativeDriver:true):
```ts
const clampInset = (v: unknown) => Number.isFinite(v as number) && (v as number) >= 0 ? (v as number) : 0;
const padTop = clampInset(insets?.top) + SAFE_MARGIN; // same for bottom/left/right

// keep refs but make reactive: on reducedMotion change, setValue to start, then animate or snap
useEffect(() => {
  // stop previous anim first
  if (reducedMotion) { scrimOpacity.setValue(1); contentOpacity.setValue(1); contentY.setValue(0); return; }
  scrimOpacity.setValue(0); contentOpacity.setValue(0); contentY.setValue(12);
  const anim = Animated.parallel([...timing to 1/1/0...]);
  anim.start();
  return () => { anim.stop(); scrimOpacity.stopAnimation(); contentOpacity.stopAnimation(); contentY.stopAnimation(); };
}, [reducedMotion, scrimOpacity, contentOpacity, contentY]);
```
Row fix: `<Text numberOfLines={1} ellipsizeMode="tail" style={[styles.value, {flexShrink:1}]}>` and `row` may need `gap:8` minimal; keep label flexShrink 0.

## Verification

**Commands:**
- `npm test -- triade/__tests__/ui/components/gameOverOverlay.test.ts` -- expected: pass (existing suite stays green)
- `npm test` -- expected: all pass, new integration test pass, no engine/game diff beyond overlay
- `npx tsc --noEmit` -- expected: clean
- `npx tsc --noEmit -p triade/tsconfig.test.json` -- expected: clean

**Manual checks (if no CLI):**
- Inspect GameOverOverlay.tsx: clamp helper present, reducedMotion effect re-targets, Text props have numberOfLines+ellipsizeMode, value style has flexShrink, cleanup present
