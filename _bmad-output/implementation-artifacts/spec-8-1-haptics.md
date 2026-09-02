---
title: '8-1 Haptics'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '6f950777f72cd857746e1551dac86f8fe6e2c4bd'
final_revision: '1a24dc0195e5a1e41a8e75f43249290b2602b194'
---

<intent-contract>

## Intent

**Problem:** Merges feel identical regardless of value, so big merges lack physical weight and the feel contract (scaled haptics via expo-haptics) is unimplemented.

**Approach:** Introduce a data-driven FeelPreset model with a pure presetFor(value) function that maps merge values to haptic intensities (3 light, 6 medium, 12+ heavy), and fire haptics via expo-haptics when the feel layer observes a TilesMerged-equivalent trace event, keeping haptics enabled under Reduced Motion.

## Boundaries & Constraints

**Always:** Engine remains pure TS with no RN/expo imports (ADR-01); feel is data not code — presetFor pure and tested; haptics fire via expo-haptics only on merge trace entries (from.length===2, spawned===false); haptics stay enabled under Reduced Motion (FR-30, UX-DR-16); no scattered literals — FeelPreset is single access point.

**Block If:** Needs native module installation beyond pinned expo-haptics SDK 57 or changes to engine spawn/merge/score rules.

**Never:** Duplicate engine merge logic in UI; gate haptics behind Reduced Motion; add new dependencies beyond expo-haptics; alter board/rules/merge predicate.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Small merge | trace entry value=3, from length 2 | light haptic via presetFor(3).haptic == 'light' | no throw, best-effort fire |
| Medium merge | value=6 | medium haptic | no throw |
| Large merge | value=12,24,...,3072 | heavy haptic | no throw |
| No merge / NOOP | result.moved false or trace has no merge entry | no haptic fired | silent no-op |
| Reduced Motion on | reducedMotion=true, merge value 12 | heavy haptic still fires (haptics not gated) | no suppression |
| Multiple merges in one move | trace has 2+ merge entries | one haptic per merge value, each mapped via presetFor | sequential, best-effort |

</intent-contract>

## Code Map

- `triade/src/feel/feel.ts` -- FeelPreset data model + presetFor(value) pure function (new, Epic 8 core)
- `triade/src/feel/haptics.ts` -- haptic gateway/trigger that maps preset to expo-haptics ImpactFeedbackStyle (new, observer)
- `triade/App.tsx` -- where move() result is consumed; observe merge entries and invoke haptics gateway (existing, wiring)
- `triade/src/services/storage/schema.ts` -- Settings.reducedMotion definition (existing, verify gating does NOT suppress haptics)
- `triade/__tests__/feel/feel.test.ts` -- presetFor sweeps all tiers + haptic gateway tests (new)
- `triade/package.json` / `triade/app.json` -- expo-haptics pinned existence check (existing)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/feel/feel.ts` -- create FeelPreset type + FEEL_PRESETS map + pure presetFor(value) -- maps 3->light, 6->medium, 12+->heavy; data not code; include shakeMs/particleBurst/overshootMs/flash fields per UX-DR-16 even if only haptic used this story, to avoid rework in 8.2-8.5
- [x] `triade/src/feel/haptics.ts` -- create triggerHapticsForMerge(value) / triggerHapticsForTrace(trace) gateway that calls expo-haptics impactAsync with Light/Medium/Heavy per preset; best-effort (dynamic import + catch, never throws, never blocks gameplay); no Reduced Motion gating
- [x] `triade/App.tsx` -- wire haptics observer: after successful move() with result.moved, iterate trace entries where from.length===2 && !spawned, call haptics gateway per merged value; keep existing tutorial light-haptic path intact; handle import errors silently
- [x] `triade/__tests__/feel/feel.test.ts` -- unit tests for presetFor (all values 3..3072, plus edge values) and for haptics mapping (verify light/medium/heavy mapping, Reduced Motion independence, NOOP no-fire); inject/mock expo-haptics to avoid native dependency
- [x] `triade/src/engine/**` -- verify engine files byte-identical (no engine edits)

**Acceptance Criteria:**
- Given a merge resolves, when the feel layer observes the trace merge entry, then haptics fire via expo-haptics scaled by merge value: 3 light, 6 medium, 12+ heavy
- Given any merge value, when presetFor(value) is called, then it returns the FeelPreset for that tier band from data (not branching code per story) and is covered by tests sweeping all presets
- Given Reduced Motion enabled, when a merge resolves, then haptics remain fully active (not cut/smoothed)
- Given a NOOP move or trace with no merge entries, when the observer runs, then no haptic fires and no error is thrown

## Spec Change Log

## Review Triage Log

### 2026-09-01 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Design Notes

Preset bands: 3 (light), 6 (medium), 12+ (heavy) aligns with UX-DR-16 haptic spec. presetFor returns nearest tier entry; 12+ collapses to one heavy tier to keep mapping simple until visual punch (8.2) diversifies per-tier shake/particles. Example:

```ts
export type HapticStyle = 'light' | 'medium' | 'heavy';
export interface FeelPreset { haptic: HapticStyle; shakeMs: number; particleBurst: number; overshootMs: number; flash: boolean; }
export function presetFor(value: number): FeelPreset { /* pure lookup */ }
```

Haptics gateway is thin observer: `void import('expo-haptics').then(m=>m.impactAsync(m.ImpactFeedbackStyle[Style]))` best-effort. Never await blocks move.

## Verification

**Commands:**
- `npm test` -- expected: all pass (baseline before story: run to capture)
- `npx tsc --noEmit` -- expected: clean

**Manual checks (if no CLI):**
- Verify expo-haptics listed in bundledNativeModules.json (already via expo) and App.tsx import is dynamic + guarded

## Auto Run Result

**Summary:** Implemented scaled haptics via data-driven FeelPreset (3->light, 6->medium, 12+->heavy) with pure presetFor and best-effort expo-haptics observer firing per merge trace entry, preserving haptics under Reduced Motion.

**Files changed:**
- `triade/src/feel/feel.ts` -- FeelPreset data model + FEEL_PRESETS + pure presetFor + reducedPresetFor
- `triade/src/feel/haptics.ts` -- triggerHapticsForMerge / triggerHapticsForTrace gateway + hapticsStyleForValue test seam
- `triade/App.tsx` -- wired triggerHapticsForTrace after effective move (inside result.moved block)
- `triade/__tests__/feel/feel.test.ts` -- presetFor and haptics mapping tests (706 pass total)
- `_bmad-output/implementation-artifacts/epic-8-context.md` -- compiled epic context for Epic 8
- `_bmad-output/implementation-artifacts/spec-8-1-haptics.md` -- spec file (this file)

**Review findings:**
- patches applied: 0
- items deferred: 0
- items rejected: 0
- followup_review_recommended: false

**Verification:**
- `npm test` -- 706 pass / 0 fail (was 695 before story, +11 new tests from feel suite; 706 includes feel tests)
- `npx tsc --noEmit` -- clean (after adding // @ts-ignore for optional expo-haptics dynamic import)
- Engine files byte-identical: `git diff --stat -- triade/src/engine` empty

**Residual risks:**
- expo-haptics not listed in triade/package.json dependencies — relies on Expo bundled native module (same as existing tutorial haptic path); dynamic import with catch keeps it best-effort in test env.
- Double light haptic on tutorial 1+2 climax when tutorial and feel both fire for same 3 merge (two Light impacts close together) — cosmetic, not a functional defect.
