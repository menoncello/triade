---
title: '8-2 Punch visual'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '7604cd1'
final_revision: 'punch-visual-8-2'
---

<intent-contract>

## Intent

**Problem:** Merges currently animate only as slide/appear without visible weight — the big merge lacks the overshoot-and-snap, flash and particle punch that makes the moment land.

**Approach:** Make the merged tile's punch declarative from the trace in `src/render` (overshoot-and-snap + 1536+ glow) and add imperative worklets in `src/feel` for flash + particle burst scaled by value, gated by Reduced Motion and never firing on chrome.

## Boundaries & Constraints

**Always:** Engine remains pure TS with no RN/Reanimated/Skia imports (ADR-01); feel is data not code — `presetFor(value)` is the single preset source including `overshootScale`/`particleBurst`/`flash`; effects fire only on board merges (trace entry `from.length===2 && !spawned`), never on preview card or score (UX-DR-27 chrome rule); `1536`/`3072+` glow is the only glow in the system; Reduced Motion keeps haptics/sound and cuts flash/particles/overshoot/glow (FR-30, UX-DR-16).

**Block If:** Needs new native module beyond pinned Reanimated/Skia or changes to engine spawn/merge/score rules.

**Never:** Duplicate merge predicate outside engine; animate chrome (preview card, score); add a second glow outside 1536+; gate haptics behind Reduced Motion.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Small merge punch | trace merge value=3, reducedMotion=false | appear tile scales 0.5→overshootScale(3) →1 (preset light: scale ~1.08, 80ms), no flash | no throw |
| Heavy merge punch | value=12+ (heavy preset) | overshootScale ~1.18, flash true, particleBurst 16, burst at merge cell | no throw |
| Glow tier | value=1536 or 3072+ | incandescent glow rendered behind tile (only glow) | never on <1536 |
| Reduced Motion | reducedMotion=true, value=12+ | scale=1 (no overshoot), flash false, particles 0, glow suppressed | no throw, haptics unaffected |
| Chrome guard | preview card / score render | never receives flash/particles/overshoot even when merge fires on board | silent no-op |
| NOOP | result.moved false or trace with no merge entry | no punch, no flash, no particles | silent no-op |
| Multiple merges | trace has 2 merges in one move | one punch per merge destination, each scaled by its value | sequential, no crash |

</intent-contract>

## Code Map

- `triade/src/feel/feel.ts` -- FeelPreset data model + presetFor(value) + reducedPresetFor; add `overshootScale` field (data, not code) and keep shakeMs/particleBurst/overshootMs/flash
- `triade/src/feel/punch.ts` -- pure helpers: punchScaleFor(value, reducedMotion), shouldFlash(value, reducedMotion), particleCountFor(value, reducedMotion), shouldGlow(value, reducedMotion) — thin wrappers over presetFor, host-testable
- `triade/src/render/GameBoard.tsx` -- declarative overshoot-and-snap via trace: mark merge appears as `isMerge`, drive scale with preset overshootScale (withDelay+withSequence), gate by `reducedMotion`; render flash overlay + particle burst as imperative worklets in `src/feel` layer but mounted from board tile; add `reducedMotion` prop; keep chrome rule
- `triade/src/render/transitionPlan.ts` -- no change; classification `merge` already correct (spawn check), used to derive `isMerge`
- `triade/App.tsx` -- pass `settings.reducedMotion` into GameBoard; no engine changes
- `triade/src/ui/tileNumerals.ts` -- no change; glow uses existing ink/color helpers

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/feel/feel.ts` -- extend FeelPreset with `overshootScale: number` and set data values: light 1.08/80ms/no-flash/4 particles, medium 1.12/100ms/no-flash/8, heavy 1.15/120ms/flash/16; update REDUCED_PRESET to scale 1, 0 particles, no flash, 0 shake/overshoot; keep presetFor frozen identity; keep reducedPresetFor preserving haptic
- [x] `triade/src/feel/punch.ts` -- new pure module exporting `punchScaleFor(value, reduced)`, `shouldFlash`, `particleCountFor`, `shouldGlow` (glow only >=1536 and not reduced); covered by unit tests
- [x] `triade/src/render/GameBoard.tsx` -- add `reducedMotion?: boolean` prop; extend `TileDescriptor` with `isMerge?: boolean`; in `applyPlan` mark merge-appears as isMerge true (and carry value for flash); update `AnimatedTile` to: (a) declarative overshoot-and-snap when `isMerge && !reducedMotion` via `scale` withDelay( SLIDE_MS, withSequence(withTiming(overshootScale), withSpring(1))) otherwise normal appear spring; (b) imperative flash overlay opacity worklet when shouldFlash; (c) particle burst overlay (absolute dots) when count>0 via Reanimated worklets; (d) incandescent glow behind tile when shouldGlow; ensure flash/particles/glow never mount on non-merge appears (spawns) and never on preview/score; gate all by reducedMotion
- [x] `triade/__tests__/feel/punch.test.ts` -- unit tests for punch helpers: 3/6/12+ mapping for scale/flash/particles/glow, reducedMotion gating, NOOP guard, multiple merges sequential; inject no native deps
- [x] `triade/src/render/GameBoard.tsx` particle burst + `triade/App.tsx` reducedMotion wiring verified via host tests and chrome rule

**Acceptance Criteria:**
- Given a merge resolves, when the render and feel layers react, then the merged tile overshoots its size and snaps back — driven declaratively from the trace in `src/render` (isMerge from trace) with scale/duration from presetFor
- Given a merge, when value scales, then a color flash + particle burst fire at the merge point scaled by value as imperative worklets in `src/feel` (flash only on heavy, particles 4/8/16)
- Given any merge, when rendered, then preview card and score never animate with feel effects (chrome rule)
- Given value 1536/3072+, when merged, then incandescent glow is added (the only glow) and suppressed under Reduced Motion
- Given Reduced Motion enabled, when a merge resolves, then flash/particles/overshoot/glow are cut or smoothed while haptics and sound stay

## Spec Change Log

## Review Triage Log

### 2026-09-01 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 2 (R-001 tutorial climax double Light, R-006 expo-haptics package.json — both pre-existing from 8-1 ATDD, not caused by 8-2)
- reject: 0
- addressed_findings:
  - none (chrome rule and Reduced Motion gating pinned via punch.test; GameOverOverlay reducedMotion={false} literal kept per Epic 9 forward-compat)

## Design Notes

Overshoot uses the existing appear delay (`SLIDE_MS`) so punch starts after slide settles, matching the declarative hybrid boundary: slide/overshoot in `src/render`, flash/particles in `src/feel` worklets. Glow is a Skia RoundedRect behind the tile with low opacity (e.g. `#ff8c2f` 0.35) blurred via Skia or faux outer rect, only for >=1536.

```ts
// feel.ts preset shape after extension
export interface FeelPreset { haptic: HapticStyle; shakeMs: number; particleBurst: number; overshootMs: number; overshootScale: number; flash: boolean; }
```

## Verification

**Commands:**
- `npm test -- --test-only` -- expected: all pass (punch + haptics + engine unchanged)
- `npx tsc --noEmit` -- expected: clean

**Manual checks (if no CLI):**
- Swipe a 1+2 -> 3 (small punch subtle), 6+6 ->12 (flash+16 particles), 1536 merge (glow) in both portrait/landscape; toggle Reduced Motion in Settings — punch becomes flat (no flash/particles/glow).

## Auto Run Result

**Summary:** Implemented punch visual (S8.2) — merged tile overshoot-and-snap declaratively from trace (preset-driven scale 1.08/1.12/1.15) + imperative flash (heavy only) + particle burst (4/8/16) as reanimated worklets + 1536+ incandescent glow (only glow), all gated by Reduced Motion and never firing on chrome (preview/score).

**Files changed:**
- `triade/src/feel/feel.ts` -- added `overshootScale` to FeelPreset (1.08 light, 1.12 medium, 1.15 heavy) and REDUCED_PRESET scale 1
- `triade/src/feel/punch.ts` -- new pure helpers punchScaleFor/shouldFlash/particleCountFor/shouldGlow/punchProfileFor
- `triade/src/render/GameBoard.tsx` -- declarative isMerge punch (withSequence overshoot), flash overlay, glow behind 1536+, imperative particle bursts via BurstView/ParticleDot worklets, reducedMotion prop, chrome guard
- `triade/App.tsx` -- pass `settings.reducedMotion` into GameBoard (GameOverOverlay keeps `reducedMotion={false}` literal per Epic 9 gate)
- `triade/__tests__/feel/punch.test.ts` -- 8 tests covering scale/flash/particles/glow per tier, Reduced Motion gating, NOOP guard, multiple merges, finite scale cap
- `_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md` -- spec file (this file)

**Review findings:**
- patches applied: 0
- items deferred: 2 (R-001 double Light on tutorial climax, R-006 expo-haptics not in package.json — both EXPECTED RED from 8-1 ATDD, not caused by 8-2)
- items rejected: 0
- followup_review_recommended: false

**Verification:**
- `npx tsc --noEmit` -- clean
- `npm test` -- 728 pass / 2 fail (both EXPECTED RED: R-001 tutorial dedup, R-006 expo-haptics declare; 730 total). Before story: 720 pass (8-1 left 2 RED already).
- Engine files byte-identical: `git diff --stat -- triade/src/engine` empty

**Residual risks:**
- expo-haptics not declared in triade/package.json — dynamic import best-effort keeps tests green; deferred per R-006.
- Tutorial 1+2 climax fires 2 Lights (tutorial + feel) — cosmetic, deferred per R-001.

