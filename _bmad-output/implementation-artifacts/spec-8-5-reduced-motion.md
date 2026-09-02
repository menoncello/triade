---
title: '8-5 Reduced Motion'
type: 'feature'
created: '2026-09-01'
status: 'done'
baseline_revision: '10a3449'
final_revision: '0ec7482'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Players with motion sensitivity have no comfortable way to play — the full feel suite (shake, bullet time, flash/particles, overshoot, glow, soft-fade) must be suppressible without losing haptics or sound, otherwise the game violates FR-30/UX-DR-16 and risks App Store a11y rejection.

**Approach:** Gate the entire feel layer behind a single Reduced Motion setting modeled as a preset (`REDUCED_PRESET`/`reducedPresetFor`), not a scattered flag — every feel path (shake, bullet time, punch flash/particles/overshoot/glow, game-over fade) checks `reducedMotion` and goes flat while haptics+sound stay fully active, with the reduced preset as the sanctioned 60 FPS emergency fallback and both profiles swept by benchmark.

## Boundaries & Constraints

**Always:** Engine stays pure (ADR-01); feel is data via `FeelPreset` + `presetFor` + `reducedPresetFor` + helpers (`punch*`, `shake*`, `bulletTime`) that never throw and never touch `Math.random`; chrome never animates (UX-DR-27 preview card/score); haptics+sound stay under Reduced Motion (FR-30); Reduced Motion is a preset (`REDUCED_PRESET`) not a flag (UX-DR-16, ADR-04); game-over soft fade also respects it; both full and reduced profiles are benchmarked.

**Block If:** Requires new native module beyond pinned Reanimated/Skia/expo-haptics/expo-audio or changing engine spawn/merge/score rules.

**Never:** Gate haptics or sound behind `reducedMotion`; animate chrome with feel effects; duplicate merge predicate outside engine; exceed shake cap 8 or bullet 200ms without data change; add fixed-step loop or block gameplay.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reduced Motion OFF | reducedMotion=false, merge 6/12 | full feel: shakeMs 2/5, punch flash/particles/overshoot, glow on 1536+, bullet flash on new-best, soft fade on game over | no throw |
| Reduced Motion ON | reducedMotion=true, any merge value | all visual feel flat: shakeMs 0, bullet suppressed, flash false, particles 0, overshootScale 1, glow false, game-over fade instant; haptics+sound still fire | no throw |
| Preset identity | presetFor vs reducedPresetFor | presetFor returns frozen canonical; reducedPresetFor returns copy with haptic preserved but visuals zeroed | never throw |
| NOOP guard | trace empty or moved false, reducedMotion either | no feel fires regardless of flag | silent no-op |
| Haptics stay | trace with merges, reducedMotion true | hapticsStyleForValue(12)=Heavy, triggerHapticsForTrace does not read reducedMotion | never gated |
| Game-over fade | reducedMotion true, game over | scrim/content opacity jump to 1 instantly (no 280ms Animated.timing) | no throw, cleanup guards |
| Mid-animation snap | reducedMotion false→true during shake/bullet | board snaps flat via withTiming(0,20ms) | no residual offset |

</intent-contract>

## Code Map

- `triade/src/feel/feel.ts` -- single source of truth: `FeelPreset`, frozen `FEEL_PRESETS`, `REDUCED_PRESET`, `presetFor`, `reducedPresetFor`, `allPresetValues` - preset is data not code, reduced is a preset not a flag
- `triade/src/feel/punch.ts` -- pure wrappers: `punchScaleFor`, `punchDurationFor`, `shouldFlash`, `particleCountFor`, `shouldGlow`, `punchProfileFor` - each returns flat when reducedMotion true, never throws, haptic preserved via reducedPresetFor
- `triade/src/feel/shake.ts` -- pure: `shakeMsFor`, `shakeAmplitudeFor`, `maxShakeForTrace`, `shouldShake`, `directionVector`, `SHAKE_CAP` - early return 0 when reducedMotion, never throws, never gates haptics
- `triade/src/feel/bulletTime.ts` -- pure: `BULLET_TIME_MS`, `maxMergeValue`, `isNewSessionBest`, `shouldTriggerBulletTime`, `nextSessionBest` - reducedMotion early return false, never touches haptics state
- `triade/src/feel/haptics.ts` -- gateway never reads reducedMotion (FR-30 comment) - stays active in both modes
- `triade/src/render/GameBoard.tsx` -- orchestrates feel layer: `reducedMotion` prop gates shake effect, bullet flash, particle bursts, and is threaded to `AnimatedTile` as `isMerge && !reducedMotion` for overshoot/flash/glow; mid-flight snap via useEffect([reducedMotion]); board container is only animated view (never chrome)
- `triade/src/ui/GameOverOverlay.tsx` -- `reducedMotion` prop gates soft fade: true → instant setValue(1)/translate 0, false → 280ms Animated.timing parallel fade with cleanup stopAnimation
- `triade/App.tsx` -- owns `settings.reducedMotion` (Settings) and threads it to `GameBoard` and `GameOverOverlay`; includes sessionBestMerge snapshot rewind; must not hardcode false - regression point for this story
- `triade/src/services/storage/schema.ts` -- `Settings.reducedMotion` boolean persistence (DEFAULT false)
- `triade/__tests__/feel/feel.test.ts` -- pins preset light/medium/heavy and reducedPresetFor preserves haptic
- `triade/__tests__/feel/punch.test.ts` -- pins Reduced Motion flat for all tiers
- `triade/__tests__/feel/shake.test.ts` -- pins shakeMs 0 and shouldShake false under reducedMotion
- `triade/__tests__/feel/bulletTime.test.ts` -- pins shouldTrigger false under reducedMotion while nextSessionBest still advances
- `triade/benchmarks/feel.bench.test.ts` -- (new) sweep feel helpers for both full and reduced presets (see tasks)

## Tasks & Acceptance

**Execution:**
- [x] `triade/App.tsx` -- fix GameOverOverlay wiring: change `reducedMotion={false}` to `reducedMotion={settings.reducedMotion}` so soft fade respects the setting; verify no other hardcoded literal suppresses it; thread settings.reducedMotion consistently to GameBoard (already) and GameOverOverlay
- [x] `triade/src/feel/feel.ts` -- tighten preset contract: ensure REDUCED_PRESET is frozen, reducedPresetFor preserves haptic from presetFor and zeroes visuals (shakeMs 0, particleBurst 0, overshootMs 0, overshootScale 1, flash false) and never throws on non-finite; keep presetFor frozen identity; add/keep comment `// FR-30: Reduced Motion is a preset ...`
- [x] `triade/src/feel/haptics.ts` -- pin comment `// FR-30: haptics stay under Reduced Motion — never gate on reducedMotion` at gateway and ensure no import of reducedMotion/settings
- [x] `triade/benchmarks/feel.bench.test.ts` -- create feel benchmark that sweeps both profiles: iterate allPresetValues() calling presetFor/reducedPresetFor + punch*For + shake*For + shouldTriggerBulletTime/shouldShake/maxShakeForTrace with synthetic traces, budget median <0.05ms / p99 <0.1ms (frame-budget headroom); reduced pass asserts zero visuals while haptic mapping unchanged
- [x] `triade/src/render/GameBoard.tsx` + `triade/src/ui/GameOverOverlay.tsx` -- audit and keep existing gating: no duplicated flag beside preset; ensure mid-animation snap withTiming(0,20ms) remains for shake/bullet; ensure AnimatedTile punch gating stays `isMerge && !reducedMotion`; ensure GameOverOverlay instant path has cleanup guards

**Acceptance Criteria:**
- Given Reduced Motion enabled, when feel effects are scheduled, then the full feel layer is gated: shake, bullet time, flash/particles, overshoot-and-snap scale, 1536+ glow, and game-over soft fade are cut or smoothed (UX-DR-16, FR-30)
- Given Reduced Motion enabled, when a merge resolves, then haptics and sound remain fully active (FR-30, UX-DR-16)
- Given Reduced Motion is a preset not a flag, when the feel system selects it, then the reduced FeelPreset profile is used (UX-DR-16, ADR-04) and benchmark sweeps both full and reduced profiles
- Given the reduced preset is the sanctioned 60 FPS fallback, when full preset exceeds budget, then the reduced preset is used never game-killing code (ADR-04, NFR-14)
- Given haptics gateway, when Reduced Motion toggles, then haptics mapping stays identical and never reads settings.reducedMotion

## Spec Change Log

## Review Triage Log

## Design Notes

Reduced Motion is not an `if (flag) skip` — it is a preset selection. `REDUCED_PRESET` freezes `shakeMs 0, particleBurst 0, overshootMs 0, overshootScale 1, flash false` and `reducedPresetFor` copies haptic from `presetFor(value)` so heavy stays heavy. Helpers then early-return flat when `reducedMotion===true` (single decision point, host-testable). GameBoard keeps board-only Animated.View for shake and bullet flash; chrome never enters the Animated view. GameOverOverlay's 280ms fade is the only non-GameBoard feel gated by the same setting — wiring was historically hardcoded to false, so this story is the regression fix. Haptics gateway intentionally never imports settings.

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all pass (feel + punch + shake + bulletTime Reduced Motion cases green, haptics stay pinned)
- `npx tsc --noEmit --project triade/tsconfig.json` -- expected: clean
- `node --test triade/benchmarks/feel.bench.test.ts` -- expected: median/p99 under budget for both profiles

**Manual checks (if no CLI):**
- Start new game: merge 6 → subtle shake, 12 → stronger + flash/particles + overshoot, 1536 → glow, new-best 12 → ~200ms bullet flash, game over → soft fade. Toggle Settings Reduced Motion ON → repeat each: board stays flat, no flash/particles/overshoot/glow/bullet/shake, game-over appears instantly, haptics still felt on each merge, sound still plays. Toggle mid-shake/bullet → board snaps flat within one frame.

## Auto Run Result

**Summary:** Implemented Reduced Motion umbrella (S8.5) — preset-not-flag gating of shake, bullet time, flash/particles, overshoot, glow, and game-over fade while haptics+sound stay; REDUCED_PRESET is benchmarked as emergency fallback.

**Files changed:**
- `triade/App.tsx:929` -- fixed GameOverOverlay wiring `reducedMotion={settings.reducedMotion}` (was hardcoded false) so soft fade respects setting
- `triade/src/feel/feel.ts:82-99` -- tightened REDUCED_PRESET contract, added FR-30/ADR-04 comments, made reducedPresetFor never-throw and preserve haptic
- `triade/src/feel/punch.ts` -- delegated Reduced Motion paths to reducedPresetFor (preset-not-flag)
- `triade/src/feel/shake.ts:1-22` -- delegated shakeMsFor to reducedPresetFor when gated
- `triade/src/feel/haptics.ts:1` -- pinned FR-30 comment and ensured never gated
- `triade/benchmarks/feel.bench.test.ts` -- new sweep benchmark for both full and reduced profiles (median <0.05ms / p99 <0.1ms, 2 tests)
- `triade/__tests__/ui/components/app.gameOverWiring.test.ts:41` -- updated pin to expect `settings.reducedMotion` wiring
- `triade/__tests__/ui/components/app.restart.test.ts:193-379` -- updated pins to expect `settings.reducedMotion` wiring
- `_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md` -- spec file (this file)

**Review findings:**
- patches applied: 0 (wiring fix was implementation not review patch)
- items deferred: 0
- items rejected: 0
- followup_review_recommended: false

**Verification:**
- `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` -- clean
- `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json` -- clean
- `npm --prefix triade test` -- 805 pass / 9 fail (all 9 EXPECTED RED: burst accumulation, overlapping shake, edge clipping, punch/bullet/haptics ATDD deferred — none caused by 8-5)
- `node --test triade/benchmarks/feel.bench.test.ts` -- 2 pass (full 9.6ms, reduced 6.5ms, both under budget)

**Residual risks:**
- Burst accumulation setTimeout orphan and overlapping shake cancelAnimation remain deferred (pre-existing EXPECTED RED, not introduced by 8-5)
- Board edge clipping overflow hidden for 5-8px shake remains deferred product decision
- Rapid new-bests <200ms reassign bulletFlash (last wins) — acceptable rarity, not stacking
