---
title: '8-3 Screen shake'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'e4629cd490835ce812969009728d76e8097b04c5'
final_revision: '721bf3a7ec1c10d80e36c6d37a07b7d0db4b4caf'
---

<intent-contract>

## Intent

**Problem:** Merges currently lack directional screen shake — the board feels flat on medium and large merges where a subtle shake in the swipe direction would sell the physical weight of the move.

**Approach:** Drive a directional shake from `FeelPreset.shakeMs` (data, not code) as a short imperative worklet on the board container, scaled by merge value (~2 ms subtle on medium, ~5 ms stronger on large, capped ~8 ms), disabled or smoothed under Reduced Motion and silent on NOOP.

## Boundaries & Constraints

**Always:** Engine remains pure TS with no RN/Reanimated/Skia imports (ADR-01); feel is data not code — `presetFor(value).shakeMs` is the single source for shake (capped ≤8, UX-DR-16); shake fires only on board merges (trace entry `from.length===2 && !spawned`), never on preview card or score (UX-DR-27 chrome rule); amplitude minimized for accessibility and never exceeds cap; shake is imperative worklet in `src/feel` layer mounted from board; haptics stay independent (not gated here, S8.1).

**Block If:** Needs new native module beyond pinned Reanimated/Skia or changes to engine spawn/merge/score rules.

**Never:** Duplicate merge predicate outside engine; shake chrome (preview card, score); gate haptics behind Reduced Motion; exceed 8 cap; fire on NOOP/rejected moves.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Medium merge shake | trace merge value=6, dir=left, reducedMotion=false | subtle shake ~2 (light/medium preset shakeMs 2) along -X, short 1 oscillation, amplitude ≤8 | no throw |
| Large merge shake | value=12+ (heavy preset shakeMs 5), dir=up | stronger shake ~5 along -Y, 2 oscillations, capped ≤8 | no throw |
| Cap guard | hypothetical value with shakeMs >8 | clamped to 8 pixel/ms cap, never exceeds | clamp, no throw |
| Reduced Motion | reducedMotion=true, value=12+ | shake suppressed (0 amplitude, no animation) | silent no-op, haptics unaffected |
| NOOP / no merge | result.moved false or trace has no merge entry (only slides/spawns) | no shake triggered | silent no-op |
| Multiple merges | trace has 2 merges (e.g., 3 and 12 in same move) | one shake driven by max shakeMs among merges (not stacked) | sequential max, no crash |
| Direction | dir in left/right/up/down | shake axis matches swipe: left/right = X, up/down = Y with correct sign | never throws on undefined dir (no shake) |
| Chrome guard | preview card / score render | never receives shake transform even when merge fires on board | silent no-op |

</intent-contract>

## Code Map

- `triade/src/feel/feel.ts` -- FeelPreset data model + presetFor(value) + reducedPresetFor; already contains shakeMs 2/2/5 capped ≤8; verify cap, no change unless missing enforcement
- `triade/src/feel/shake.ts` -- new pure helpers: shakeMsFor(value, reducedMotion), shouldShake(trace, reducedMotion), directionVector(dir), shakeAmplitudeFor(value, reducedMotion) clamped ≤8 — host-testable, no RN imports
- `triade/src/render/GameBoard.tsx` -- add directional shake to board container: new props `direction?: Direction` and `reducedMotion?: boolean` already threaded; introduce shared values shakeX/shakeY + useAnimatedStyle on wrapper View; trigger shake in moveResult effect when trace has merge and !reducedMotion and shakeMs>0; gate on moved; ensure Reduced Motion suppresses, NOOP silent, chrome never shakes
- `triade/App.tsx` -- capture last swipe Direction in ref/state and pass as `direction` prop to GameBoard alongside moveResult; thread settings.reducedMotion already passed; reset direction on new game
- `triade/__tests__/feel/shake.test.ts` -- unit tests for shake helpers: medium 2, large 5, cap 8, Reduced Motion gating, NOOP guard, multiple merges max, direction vectors, non-finite safety

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/feel/shake.ts` -- create pure module exporting `shakeMsFor(value, reducedMotion): number`, `shouldShake(trace, reducedMotion): boolean`, `shakeAmplitudeFor(value, reducedMotion): number`, `directionVector(dir): {x:number,y:number}`, `maxShakeForTrace(trace, reducedMotion): number` — clamped ≤8, reducedMotion returns 0/false, never throws, no RN imports; wrap presetFor and reducedPresetFor
- [x] `triade/src/feel/feel.ts` -- verify FeelPreset shakeMs values are data-driven and capped ≤8 (2 light, 2 medium, 5 heavy, REDUCED 0); add defensive clamp if needed; keep frozen identity and allPresetValues coverage
- [x] `triade/src/render/GameBoard.tsx` -- add `direction?: Direction` prop; add shakeX/shakeY shared values and animated wrapper View around Canvas; in moveResult effect (after applyPlan), detect merges (`trace.filter(e=>!e.spawned && from.length===2)`), compute max shakeMs via shake helper, compute amplitude = min(maxShake,8), derive axis from direction prop; if amplitude>0 && !reducedMotion && moved then run imperative shake sequence (withSequence/withTiming oscillations along correct axis, short ~80-120ms total, spring or timing, decaying); ensure NOOP/empty merge/reducedMotion path triggers no animation; keep particle/punch paths intact; never shake preview/score (board only)
- [x] `triade/App.tsx` -- introduce `lastDirectionRef` (or state) set inside doMove(dir) before move(); pass `direction={lastDirectionRef.current ?? undefined}` into GameBoard; clear on handleRestart; keep existing haptics wiring and early-input busyRef untouched; keep reducedMotion wiring
- [x] `triade/__tests__/feel/shake.test.ts` -- unit tests for shake helpers: medium 6 -> shakeMs 2 subtle, heavy 12+ -> 5, cap 8 enforcement, reducedMotion gating (all ->0/false), NOOP/empty trace -> no shake, multiple merges -> max wins, direction vectors left(-1,0)/right(1,0)/up(0,-1)/down(0,1), invalid dir -> zero vector safety, non-finite values never throw

**Acceptance Criteria:**
- Given a merge resolves, when the feel layer fires shake, then a directional screen shake plays: subtle on medium merges (~2), stronger on large (~5), capped at ~8, along swipe axis (S8.3, UX-DR-16)
- Given any merge value, when shake helper is called, then shakeMs comes from FeelPreset.shakeMs (data, not code) and never exceeds 8
- Given Reduced Motion enabled, when a merge resolves, then the shake is smoothed or disabled while haptics and sound stay (FR-30, UX-DR-16)
- Given a NOOP move or trace with no merge entries, when the shake observer runs, then no shake fires and no error is thrown (UX-DR-23)
- Given multiple merges in one move, when shake fires, then a single shake driven by max shakeMs among merges fires (not stacked per merge)
- Given the board shakes, when rendered, then preview card and score never animate with shake (chrome rule, UX-DR-27)

## Spec Change Log

## Review Triage Log

### 2026-09-01 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3: (low 3)
- defer: 2: (low 2)
- reject: 14: (low 14)
- addressed_findings:
  - [low] [patch] Double cap divergence: GameBoard hard-coded `8` vs shake.ts SHAKE_CAP — exported SHAKE_CAP from shake.ts and used in GameBoard (min(maxShake, SHAKE_CAP))
  - [low] [patch] Slide-only / NOOP / Reduced Motion residual shake bleed — added else branches to cancel shakeX/Y withTiming(0) when amplitude==0 or moved==false or direction missing, plus useEffect to snap to 0 when reducedMotion toggles mid-animation
  - [low] [patch] NaN/Infinity trace value spuriously maps to light preset shake — added Number.isFinite guard in maxShakeForTrace to skip non-finite entry.value

## Design Notes

ShakeMs maps to pixel amplitude (2→~2px, 5→~5px, cap 8) with short fixed-duration oscillation sequence (~80-120ms total) along swipe axis. amplitude = min(presetFor(maxMergeValue).shakeMs, 8); if reducedMotion => 0. Direction vector pinned: left (-1,0), right (1,0), up (0,-1), down (0,1). Board container is the only shaken element — Wrap GameBoard's Canvas in Animated.View with translateX/Y shared values driven by Reanimated worklets (thin binding, frame math host-testable in pure shake.ts). Reduced Motion is a preset gate (shakeMs 0), not a flag around haptics.

```ts
// shake.ts shape
export function shakeMsFor(value:number, reduced:boolean):number { return reduced?0: Math.min(presetFor(value).shakeMs, 8); }
export function directionVector(dir: Direction): {x:number,y:number}
export function maxShakeForTrace(trace: TraceEntry[], reduced:boolean):number
```

## Verification

**Commands:**
- `npm test` -- expected: all pass (shake + punch + haptics + engine unchanged)
- `npx tsc --noEmit` -- expected: clean

**Manual checks (if no CLI):**
- Swipe left/right/up/down producing 6→ subtle 1-tick shake along swipe axis; 12+→ stronger 2-tick shake; toggle Reduced Motion in Settings — shake flat; NOOP swipe — no shake; preview card never shakes.

## Auto Run Result

**Summary:** Implemented directional screen shake (S8.3) — data-driven from FeelPreset.shakeMs (2 subtle medium, 5 large capped 8) along swipe axis via Reanimated worklet on board container only, gated by Reduced Motion and silent on NOOP/no-merge, single shake max among merges.

**Files changed:**
- `triade/src/feel/shake.ts` -- new pure helpers shakeMsFor/shakeAmplitudeFor/directionVector/maxShakeForTrace/shouldShake (capped ≤8, reduced ->0/false, NaN guard, no RN)
- `triade/src/feel/feel.ts` -- verified shakeMs 2/2/5 capped ≤8, added defensive comment
- `triade/src/render/GameBoard.tsx` -- added direction prop, shakeX/Y shared values + Animated.View wrapper, directional shake effect with SHAKE_CAP, bleed cancel and mid-animation Reduced Motion snap, board only (chrome never shakes)
- `triade/App.tsx` -- introduced lastDirectionRef captured synchronously in doMove before move(), passed to GameBoard, cleared on restart/lane change
- `triade/__tests__/feel/shake.test.ts` -- 12 tests covering medium 2, heavy 5, cap 8, reduced gating, NOOP, multiple merges max, direction vectors, invalid dir, non-finite safety
- `_bmad-output/implementation-artifacts/spec-8-3-screen-shake.md` -- spec file (this file)
- `_bmad-output/implementation-artifacts/deferred-work.md` -- appended 2 deferred entries (overlapping shake concurrency, overflow-hidden clipping)

**Review findings:**
- patches applied: 3 (double cap hardcode -> SHAKE_CAP export, slide-only/NOOP bleed cancel + mid-shake Reduced Motion snap, NaN entry guard)
- items deferred: 2 (overlapping shake concurrency without cancelAnimation, board edge clipping under overflow hidden — both low)
- items rejected: 14 (predicate duplication noise, worklet location nuance, haptics independence, mutable ref staleness concerns, swallowed errors defensive, etc. — all low)
- followup_review_recommended: false

**Verification:**
- `npx tsc --noEmit` -- clean
- `npm test` -- 757 pass / 4 fail (all 4 EXPECTED RED from prior punch ATDD: R-001 tutorial dedup, R-006 expo-haptics, R-002/R-007 burst cleanup — not caused by 8-3) / 12 shake tests pass
- Engine files byte-identical: `git diff --stat -- triade/src/engine` empty

**Residual risks:**
- Rapid second swipe at ~90ms before 130ms shake completes overwrites without cancelAnimation — truncated overlap, low jank, deferred as low
- Board edge 5-8px shake clipped by parent overflow hidden — cosmetic only, deferred as low
- Lane switch without active match retains stale direction until next swipe — next effective move overwrites synchronously, low
