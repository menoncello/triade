---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-01'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/punch.ts'
  - 'triade/src/feel/shake.ts'
  - 'triade/src/feel/bulletTime.ts'
  - 'triade/src/feel/haptics.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/App.tsx'
  - 'triade/src/services/storage/schema.ts'
  - 'triade/__tests__/feel/feel.test.ts'
  - 'triade/__tests__/feel/punch.test.ts'
  - 'triade/__tests__/feel/shake.test.ts'
  - 'triade/__tests__/feel/bulletTime.test.ts'
  - 'triade/benchmarks/feel.bench.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 8 / Story 8-5 — Reduced Motion (Preset-Gated Feel Umbrella, 60 FPS Fallback, Game-Over Fade)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `8-5-reduced-motion`
**Scope:** Targeted test design for the working-tree delta of story 8-5

> **Delta under assessment:** Spec `spec-8-5-reduced-motion.md` `baseline_revision 10a3449 → final_revision 0ec7482` (HEAD `0ec7482` is `1` commit ahead of `10a3449`). The current uncommitted diff is metadata-only (`_bmad-output/implementation-artifacts/sprint-status.yaml` `8-5-reduced-motion: backlog→done`); the assessed production change is the committed `0ec7482` delta plus the `HEAD` working tree (all byte-identical to `final_revision`):
> - `triade/App.tsx:929` — fixed `GameOverOverlay` wiring `reducedMotion={settings.reducedMotion}` (was hardcoded `false`) so soft fade respects setting; `GameBoard` already threaded `reducedMotion={settings.reducedMotion}` + `sessionBestMerge`; `settings.reducedMotion` lives in `Settings` via `storage/schema.ts` (DEFAULT false) and is owned by `App.tsx`
> - `triade/src/feel/feel.ts:82-105` — tightened `REDUCED_PRESET` contract: `Object.freeze({haptic:'light', shakeMs:0, particleBurst:0, overshootMs:0, overshootScale:1, flash:false})` plus `reducedPresetFor(value)` copies `haptic` from `presetFor(value)` and zeroes visuals, `try/catch` never-throw on non-finite, preserves frozen `presetFor` identity; comments `// FR-30: Reduced Motion is a preset` + `// ADR-04 emergency fallback`
> - `triade/src/feel/punch.ts` (49 LOC) — 6 pure wrappers `punchScaleFor/punchDurationFor/shouldFlash/particleCountFor/shouldGlow/punchProfileFor` each delegate to `reducedPresetFor` when `reducedMotion===true` (preset-not-flag), never throw, `shouldGlow` also `value>=1536` gate and `false` when reduced
> - `triade/src/feel/shake.ts:14-27` — `shakeMsFor` delegates to `reducedPresetFor(value).shakeMs` (→0) when gated; `maxShakeForTrace` early-return 0 when `reducedMotion`, `SHAKE_CAP=8` single cap, `Number.isFinite` + `try/catch` never-throw, never gates haptics
> - `triade/src/feel/bulletTime.ts:28-42` — `shouldTriggerBulletTime` early-return `false` when `reducedMotion`, `nextSessionBest` still advances (blind to flag), `Number.isFinite` guards, never touches haptics state
> - `triade/src/feel/haptics.ts:1` — pinned comment `// FR-30: haptics stay under Reduced Motion — never gate on reducedMotion` and no import of `reducedMotion`/`settings` (FR-30, UX-DR-16)
> - `triade/src/render/GameBoard.tsx` (576 LOC delta) — already gates feel layer: `reducedMotion` prop disables shake effect (`moveResult.moved && !reducedMotion && direction`), bullet flash (`shouldTriggerBulletTime(...,!!reducedMotion)` + `BULLET_TIME_MS`), particle bursts `if(!reducedMotion)`, `AnimatedTile` punch gating `isPunch = isMerge && !reducedMotion` (overshoot/flash/glow via `punchProfileFor` flat when reduced), board `Animated.View` is only animated container (never chrome), mid-flight snap `useEffect([reducedMotion])` with `withTiming(0,{duration:20})` for `shakeX/Y` + `bulletFlash`
> - `triade/src/ui/GameOverOverlay.tsx:24-55` — `reducedMotion` prop gates soft fade: `true` → instant `setValue(1)/setValue(0)` (no `Animated.timing`), `false` → `280ms Animated.parallel` fade with cleanup `stopAnimation` guards; `useRef(new Animated.Value(reducedMotion?1:0))` init prevents first-frame flash
> - `triade/benchmarks/feel.bench.test.ts` (new, ~140 LOC) — sweeps both profiles: iterates `allPresetValues()` calling `presetFor/reducedPresetFor + punch*For + shake*For + shouldTriggerBulletTime/shouldShake/maxShakeForTrace` with synthetic traces, budget median `<0.05ms` / p99 `<0.1ms` (frame-budget headroom); reduced pass asserts zero visuals while haptic mapping unchanged
> - `triade/__tests__/ui/components/app.gameOverWiring.test.ts` + `app.restart.test.ts` — updated pins to expect `settings.reducedMotion` wiring (regression pins for the hardcoded-false fix)
> - No engine edits (`git diff --stat -- triade/src/engine` empty — verified), no fixed-step loop, never `Math.random`, helpers never throw, `SHAKE_CAP 8` and `BULLET_TIME_MS 200` remain single-source data (spec "never exceed cap without data change")

---

## Executive Summary

**Scope:** Targeted test design for Epic 8, Story 8-5 Reduced Motion. The story is the **umbrella gate** for the entire feel suite: a single `REDUCED_PRESET` preset (not a scattered flag) behind `settings.reducedMotion` that zeroes every visual feel path — shake, bullet time `200ms`, punch flash/particles/overshoot, `1536+` glow, and game-over soft fade — while **haptics+sound stay fully active** (FR-30, UX-DR-16, ADR-04). The reduced preset is the sanctioned `60 FPS` emergency fallback and both profiles are swept by the new benchmark (`median <0.05ms / p99 <0.1ms`). The wiring fix in `App.tsx:929` is the only behavioural delta beyond tightening contracts; prior stories 8-1..8-4 already had per-helper gating, so 8-5 pins the umbrella and the benchmark.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (score ≥6): 3
- Critical categories: BUS (FR-30 umbrella compliance — a11y/App Store), TECH (preset-not-flag contract + single-source data), BUS (GameOverOverlay wiring regression)

**Coverage Summary:**

- P0 scenarios: 9 groups (host unit, pure `feel` layer — already `805 pass / 9 expected RED` not caused by 8-5, 8-5 cases green; <5 s)
- P1 scenarios: 7 groups (engine-trace→feel fixtures + `App` wiring + `GameBoard` board-only + `GameOverOverlay` fade branches + mid-flight snap + haptics-stay + device smoke)
- P2/P3 scenarios: 8 groups (perf bench, static-scan chorus, engine purity, clipping/cleanup, chrome audit, tuning exploratory)
- **Total effort**: ~12–24 hours (~1.5–3 days wall-clock with device access; host-only <0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/spawn/score rules, `pendingSpawn` / `previewFor` / undo history invariants** | ADR-01 purity: engine is pure TS single source of truth, unchanged in this delta (byte-identical `triade/src/engine`). Feel is observer of `MoveResult.trace` / `TilesMerged`; no new `canMerge` predicate beyond `src/feel` gateway. | Engine invariants pinned by existing 695+ tests + PR check `git diff --stat -- triade/src/engine` empty. This plan adds a no-duplicate-merge-predicate grep gate (4 sanctioned sites). |
| **Haptics mapping 8-1 (`FeelPreset.haptic` light/medium/heavy) and `expo-haptics` native binding** | `FeelPreset.haptic` mapping (`3 light, 6 medium, 12+ heavy`) already shipped; 8-5 only ensures `reducedPresetFor` preserves `haptic` while zeroing visuals and that `haptics.ts` never reads `reducedMotion`. Native `expo-haptics` is best-effort via `void import()` as in 8-1. | 8-1 test design + `feel.test.ts` 12 cases remain gate; 8-5 asserts `haptics.ts` never imports `reducedMotion` and that `hapticsStyleForValue(12)` stays `Heavy` regardless of flag (host + device checklist). |
| **Punch visual 8-2 internals (overshoot spring timing, `BurstView`/`ParticleDot` animation curves, `1536` glow colour)** | 8-2 already shipped `AnimatedTile` overshoot/snap + flash/particles/burst/glow; 8-5 only gates them flat via `reducedPresetFor` / `isMerge && !reducedMotion` / `shouldGlow false`. Timing curves themselves are not retuned. | 8-2 test design + `punch.test.ts` 8 cases remain gate; 8-5 device smoke asserts punch still fires with `reducedMotion false` and is flat with `true`, without regressing punch-only REDs. |
| **Screen shake 8-3 directional axis / `withSequence 130ms` choreography** | Directional shake along swipe axis (`2` medium, `5` heavy capped `8`, `SHAKE_CAP`) already shipped; 8-5 only gates via `shakeMsFor(...,true)→0` / `maxShakeForTrace(...,true)→0` / `shouldShake→false` and mid-flight snap. Axis logic itself unchanged. | 8-3 test design + `shake.test.ts` 12 cases remain gate; 8-5 asserts shake flat under reduced while `directionVector` logic unchanged. |
| **Bullet time 8-4 rarity gate / `BULLET_TIME_MS 200` / `sessionBestMerge` Snapshot rewind** | `BULLET_TIME_MS=200` single datum + `maxMergeValue/isNewSessionBest/shouldTriggerBulletTime/nextSessionBest` + `Snapshot sessionBestMerge` rewind already shipped; 8-5 only gates `shouldTrigger` and `GameBoard` overlay via `reducedMotion` while `nextSessionBest` still advances. | 8-4 test design + `bulletTime.test.ts` 9 cases remain gate; 8-5 asserts `shouldTriggerBulletTime(trace, best, true)===false` while `nextSessionBest` advances (host) and that bullet overlay flat while shake also flat. |
| **SFX+haptics 8-6 (`expo-audio` merge/spawn/game-over thock, no music)** | No `expo-audio` SFX in this delta; `triggerHapticsForTrace` + `expo-audio` coupling is 8-6, but haptics gateway already called via `triggerHapticsForTrace` not gated here and sound must stay under Reduced Motion (FR-30). | 8-6 will require its own design; this plan asserts sound/haptics not gated by `reducedMotion`. |
| **Epic 9 a11y beyond FR-30 (tap targets 44pt, VoiceOver contract, WCAG AA shape+colour, themes)** | No new tokens, labels, or theme changes beyond `reducedMotion` plumbing; chrome never animates is already pinned. | Epic 9 suites remain gate; this plan only verifies `Animated.View` wraps board, not `Hud`/preview card. |
| **RevenueCat / AdMob / IAP / consent / Crashlytics / Epic 10-11** | No monetization, telemetry, or privacy code touched (`settings.reducedMotion` is local `Settings` persistence only). | Existing Epic 4 / Epic 10-11 suites remain gate. |
| **Reanimated/Skia/expo-haptics/expo-audio native implementations themselves** | Third-party native worklets (`withTiming`/`withSequence`, `Animated.View`, `Canvas`, `Animated` timing) treated as external. | Trust but verify via device smoke; no unit mock of spring/timing physics beyond datum/branch host assertions. |
| **Web / PWA parity** | Target is Expo dev build on iOS (SDK 57, Reanimated 4, Skia). Web has no haptics and limited worklet parity. | Manual device-only validation for reduced-motion visuals; web excluded except "no throw" host check. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | BUS | **FR-30 umbrella non-compliance — one of the six feel visuals not gated while haptics+sound must stay.** Helpers correctly gate (`punch*For → reducedPresetFor` → flat, `shakeMsFor → 0`, `shouldTriggerBulletTime → false`, `shouldGlow → false`) and `GameBoard` gates bursts/shake/bullet + `AnimatedTile isMerge && !reducedMotion` + `GameOverOverlay` instant fade. Risk is partial gate: e.g. shake and bullet already gated in 8-3/8-4 but punch `particleCountFor` or `shouldGlow 1536+` or `GameOverOverlay` 280ms fade missed in a refactor, or a new feel path added without `reducedMotion` param. Silent violation → motion-sick users, App Store a11y rejection, FR-30/UX-DR-16 breach. Spec caps "never exceed shake 8 / bullet 200ms without data change" would also be violated if a flag bypasses `REDUCED_PRESET`. | 2 | 3 | **6** | Pin umbrella with (a) **host sweep for every tier** `3,6,12,24,48,96,192,384,768,1536,3072,6144` asserting `punchScaleFor(v,true)===1 && punchDurationFor===0 && shouldFlash===false && particleCountFor===0 && shouldGlow===false && shakeMsFor===0 && shakeAmplitudeFor===0 && shouldTriggerBulletTime([merge12], best, true)===false && shouldShake(...,true)===false` while `reducedPresetFor(v).haptic === presetFor(v).haptic` (already in `punch.test.ts` Reduced Motion loop + `shake.test.ts` + `bulletTime.test.ts`), (b) **grep gate**: `rg -n "reducedMotion" triade/src/feel/` must hit only `feel.ts:REDUCED_PRESET/reducedPresetFor` + `punch.ts` + `shake.ts` + `bulletTime.ts` helpers (never `haptics.ts`), and `rg -n "reducedMotion" triade/src/render/GameBoard.tsx triade/src/ui/GameOverOverlay.tsx triade/App.tsx` covers all render gates, (c) **comment** `// FR-30: ... is a preset, never gate haptics` already pinned, (d) **device**: iOS Settings → Reduce Motion ON → repeat merges `6` subtle, `12` heavy, `1536` glow, bullet new-best `12`, game over → board flat, no flash/particles/overshoot/glow/bullet/shake, fade instant, while haptics still felt and sound plays. | FE lead | Immediate (gate this story; enforce in 8-6 review) |
| R-002 | TECH | **Preset-not-flag contract drift — scattered flag beside `REDUCED_PRESET` or `reducedPresetFor` not preserving haptic / not frozen.** `REDUCED_PRESET` is frozen `shakeMs 0, particleBurst 0, overshootMs 0, overshootScale 1, flash false` and `reducedPresetFor` returns copy `{...REDUCED_PRESET, haptic: presetFor(v).haptic}` never-throw. Risk: future tuning adds `if(reducedMotion) return 0` scatter instead of `reducedPresetFor` reuse (data-not-code violation, ADR-04), or mutates `REDUCED_PRESET` (not frozen), or returns stale `haptic:'light'` for heavy `12+` (loses weight), or identity confusion (`presetFor` returns frozen canonical but `reducedPresetFor` is fresh copy — memoising by identity would break). Spec "Reduced Motion is a preset, benchmark sweeps both profiles" would be violated. | 2 | 3 | **6** | Enforce data-not-code: (a) unit that `presetFor(3)===FEEL_PRESETS[3]` identity and `presetFor(12)===FEEL_PRESETS[12]` while `reducedPresetFor(12).haptic==='heavy' && reducedPresetFor(12).shakeMs===0 && particleBurst===0 && overshootScale===1 && flash===false` and `reducedPresetFor(12)!==REDUCED_PRESET` (copy) — already in `feel.test.ts`; (b) static scan that `feel.ts` is the single access point for `shakeMs`/`particleBurst`/`overshootScale`/`flash` literals (`grep -R "shakeMs:\|particleBurst:\|overshootScale:" src/ --include="*.ts" | grep -v "feel.ts"` must be empty); (c) bench `feel.bench.test.ts` sweeps both `presetFor` + `reducedPresetFor` + all helpers and asserts reduced visuals flat while haptic mapping unchanged (already 2 tests median 9.6/6.5ms under `0.05/0.1`); (d) doc: `presetFor` identity-stable vs `reducedPresetFor` copy noted in mitigation. | FE | Immediate |
| R-003 | BUS | **GameOverOverlay wiring regression — `App.tsx:929` was hardcoded `false`, fixed to `settings.reducedMotion`; future copy-paste or prop omission re-hardcodes `false`/`undefined`.** `GameOverOverlay` init `useRef(new Animated.Value(reducedMotion?1:0))` and effect `if(reducedMotion){setValue(1)} else {Animated.parallel 280ms}` with cleanup `stopAnimation` is correct, but `App.tsx` is the only caller and must thread `settings.reducedMotion` consistently to both `GameBoard` and `GameOverOverlay`. Risk: lane switch / restart or new overlay instance passes `reducedMotion={false}` literal (as was the bug), or omits prop (`undefined` → falsy → animates instead of instant), leaving game-over soft fade animating under Reduced Motion (a11y violation). `app.gameOverWiring.test.ts` / `app.restart.test.ts` pins already updated — but pins are host shallow, not device. | 2 | 3 | **6** | Pin wiring: (a) **host pin** `app.gameOverWiring.test.ts:41` expects `reducedMotion={settings.reducedMotion}` and `app.restart.test.ts:193-379` expects same (already updated this story) — keep as P0 regression, (b) **static grep** `rg -n "GameOverOverlay" triade/App.tsx` must show `reducedMotion={settings.reducedMotion}` and zero literals `reducedMotion={false}` or `reducedMotion={true}` in `App.tsx`, (c) **host unit** for `GameOverOverlay` effect branches: mount with `reducedMotion true` → `scrimOpacity 1 / contentOpacity 1 / contentY 0` instantly (no `Animated.timing`), mount with `false` → `Animated.parallel` called with `280ms`; toggle `false→true` during pending timing → `stopAnimation` + instant set, (d) **device**: game over with `Reduce Motion ON` → overlay appears instantly (no 280ms fade), with OFF → soft fade visible; verify on both clean and accelerated lanes (`activeLaneId` does not gate fade). | FE | Immediate (regression pin this story) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Board-only chrome guard leak — `Animated.View` wraps only board (`Canvas`) for shake/bullet, `AnimatedTile` punch overshoot/flash/glow/particles are tile-local, but hierarchy could wrap too high and animate chrome.** `GameBoard` correctly keeps `Animated.View style={shakeStyle}> <Canvas>` (board only) + sibling `Animated.View opacity:bulletFlash` overlay `position:absolute width×width borderRadius:14 backgroundColor:#fff7e0` + `AnimatedTile` `isPunch` local; `Hud` preview card/score/header are siblings outside `GameBoard` animated wrappers and chrome never enters `BurstView`/`ParticleDot`. Risk: future layout refactor moves `Hud` inside `GameBoard` or wraps `boardWrap` higher, leaking shake `translateX/Y` or bullet `opacity` onto preview card/score (UX-DR-27 violation). | 2 | 2 | 4 | Assert via component-tree snapshot that `GameBoard` `Animated.View shakeStyle` is direct parent of `Canvas` only (not ancestor of `Hud`), that `PreviewCard`/score `Text` subtree never receives `shakeStyle`/`bulletFlashStyle`/`isPunch` props, and that `GameBoard` burst container `position:absolute pointerEvents:none` is board-local. Static `grep -R "Animated.View" triade/src/render/GameBoard.tsx` allowlist; device video side-by-side heavy merge vs `Hud` preview card proves guard. |
| R-005 | TECH | **AnimatedTile punch gating divergence — `isMerge && !reducedMotion` gate lives in render layer (`AnimatedTile`) while helpers also gate (`punchScaleFor`→`reducedPresetFor`).** `AnimatedTile` computes `isPunch = Boolean(isMerge && !reducedMotion)` and only then drives `withTiming(overshootScale)` / flash count `1` vs `0` / particles. Helpers `punchScaleFor(12,true)→1` etc. are consistent, but risk is divergence: render uses `reducedMotion` prop while helper branch uses `reducedMotion` boolean — if `GameBoard` forgets to pass `reducedMotion` to `AnimatedTile`, helpers would still return flat but tile would still punch (or vice versa). Spec forbids duplicating merge predicate outside engine — same class for gating predicate. | 2 | 2 | 4 | Keep single decision point: assert `GameBoard` passes `reducedMotion` to `AnimatedTile` for every tile (grep `AnimatedTile` call sites show `reducedMotion={reducedMotion}`), and host test that `punchProfileFor(v,true).scale===1 && flash===false && particles===0 && glow===false` aligns with `isPunch===false`. Host snapshot that `isMerge true + reducedMotion true → isPunch false` and tile has no `Animated.View` overshoot sequence; device that `12` merge with `Reduce Motion ON` has no tile overshoot while `12` with OFF does. |
| R-006 | TECH | **Mid-animation snap missing — `reducedMotion false→true` during in-flight shake/bullet/punch must snap flat via `withTiming(0,20ms)` else residual offset/flash lingers.** `GameBoard` `useEffect([reducedMotion])` snaps `shakeX/Y` + `bulletFlash` to `0` with `withTiming(0,20)` (board flat within one frame) and `GameOverOverlay` `useEffect([reducedMotion])` snaps scrim/content to `1/0` instantly. Risk: dependency array omits `reducedMotion`, or `shakeX/Y` snap branch only cancels shake but not bullet (leaves `bulletFlash 0.45` opacity), or `AnimatedTile` re-triggers punch after snap because `applyPlan` still marks `isMerge true` for current `moveResult`. Rapid `EARLY_INPUT_MS≈84ms` gate could re-open before snap completes. | 2 | 2 | 4 | Lifecycle host test: wrap `GameBoard` in `act`, drive a heavy merge (`12` → shake `5` + bullet flash `0.45`), then flip `reducedMotion false→true` mid-`withSequence` → assert `useEffect` branch calls `withTiming(0,20)` on all three shared values and that `shakeX/Y` and `bulletFlash` are `0` after act. Device: start shake/bullet on `12` new-best then toggle Settings Reduced Motion ON mid-animation → board snaps flat within one frame (video). |
| R-007 | PERF | **Both profiles benchmark divergence — `REDUCED_PRESET` is sanctioned `60 FPS` emergency fallback; both full and reduced must be swept and stay under `median <0.05ms / p99 <0.1ms` frame headroom.** `feel.bench.test.ts` already sweeps both profiles for `10k` turns (warmup `1k`) and asserts `median <0.05ms && p99 <0.1ms` for full (`9.6ms` total) and reduced (`6.5ms` total) — but risk is future tuning bloats full preset (e.g. heavy `particleBurst 32` or extra `from.length===2` scans) or adds per-merge `withSequence` stacking beyond single shake/bullet per `moveResult`, pushing `p99` beyond `16.7ms` device budget (NFR-1/NFR-14). Deferred-work notes pre-existing `burst accumulation setTimeout orphan` and `board edge clipping` are unrelated but share the same `p99` lane. | 1 | 3 | 3 | Keep bench as PR gate: `node --test triade/benchmarks/feel.bench.test.ts` (2 tests) must stay green; host micro-bench also sweeps `allPresetValues()` × all helpers for allocation. Device lane when Epic 8 lands: `useFrameRateBaseline` stats after 2-min play with 5+ new-bests `12` while `Reduce Motion OFF` and one heavy that also shakes (bullet+shake co-fire) plus `Reduce Motion ON` flat pass — `p99Ms <16.7`. Fail threshold is `<0.05/<0.1` host, not device wall-clock. |
| R-008 | TECH | **Settings persistence & App threading consistency — `settings.reducedMotion` lives in `Settings` (`schema.ts` DEFAULT false) and is threaded to both `GameBoard` and `GameOverOverlay`年同期; risk is inconsistency or lost persistence across restart/lane/ClearAsync.** `App.tsx` owns `settings` via `storage/schema.ts` and threads `settings.reducedMotion` to `GameBoard` and `GameOverOverlay` in the same render; risk: one prop wired but the other not (as was the `false` bug), or `settings` memoised stale, or `clearAll`/lane switch `needsReset` forgets to carry `sessionBestMerge`/`settings` (not this story but same seam), or `schema.ts` DEFAULT flips to `true` breaking the "Reduced Motion OFF by default" contract. | 1 | 3 | 3 | Assert `storage/schema.ts DEFAULT_SETTINGS reducedMotion === false`, grep `settings.reducedMotion` appears in `App.tsx` threading to both `GameBoard` and `GameOverOverlay` (2 sites), and that `App.tsx` `useEffect` persisting `settings` is not omitted. Host test that toggling Settings `reducedMotion` flips both consumers in same commit (integration). Device: toggle ON, kill app, relaunch → still ON (AsyncStorage persistence); toggle OFF → full feel returns. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | TECH | **Haptics gateway leak — `triggerHapticsForTrace` must never read `reducedMotion` (FR-30 "haptics stay").** `haptics.ts` correctly never imports `reducedMotion`/`settings` and `hapticsStyleForValue(12)` → `Heavy` regardless. Risk is a well-meaning refactor that wraps `triggerHapticsForTrace` in `if(!reducedMotion)` alongside punch/shake/bullet, silencing haptics for motion-sensitive users (breaks tactile feedback that replaces the cut visuals). Same class as 8-5's core promise "haptics+sound stay". | 1 | 2 | 2 | Monitor — static grep `rg -n "reducedMotion\|settings\.reducedMotion" triade/src/feel/haptics.ts` must be empty (only `// FR-30: haptics stay` comment). Host that `triggerHapticsForTrace(trace)` with merges still fires mapping `3 Light / 6 Medium / 12+ Heavy` regardless of `reducedMotion true` (gateway does not take the flag). Device checklist asserts haptics still felt under Reduce Motion ON. |
| R-010 | TECH | **Non-finite / negative safety fallback masks corruption — helpers never throw but silently fall back.** `presetFor(NaN/Infinity/-1/0/1/2) → light`, `reducedPresetFor` try/catch → `light`, `shakeMsFor(NaN,true)→0` via `reducedPresetFor`, `maxShakeForTrace` skips non-finite, `shouldTriggerBulletTime(...NaN)→false` never throws. Risk: engine never emits `NaN` today but a corrupted `trace[].value=NaN/Infinity/-5` would be swallowed as "flat" instead of surfacing a data bug (same as 8-2 R-009, 8-3 R-009, 8-4 R-009). Spec says "never throw" is non-negotiable, but product may want `__DEV__` warning for `value<3` sentinel. | 1 | 1 | 1 | Monitor — keep never-throw contract (already in `feel/punch/shake/bulletTime.test.ts` non-finite sweeps). No gate; add `__DEV__` warning only if product wants corruption surfacing. Existing `805 pass` includes non-finite pins. |

### Risk Category Legend

- **TECH**: Technical/Architecture (contracts, purity, single-source data, board-only guard, never-throw)
- **SEC**: Security — none this story (no auth/data exposure)
- **PERF**: Performance (frame budget, benchmark both profiles, `60 FPS` fallback, `SHAKE_CAP 8` / `BULLET 200ms` caps)
- **DATA**: Data Integrity — none standalone this story (engine untouched; `Settings` persistence covered via R-008)
- **BUS**: Business Impact (accessibility/App Store compliance, visual chrome rule, wiring regression)
- **OPS**: Operations (dependencies, builds, OTA) — none high this story; `reanimated`/`skia`/`expo-haptics`/`expo-audio` already pinned in 8-1..8-4

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

8-5 touches the **entire visual NFR surface**: **60 FPS both-profile budget**, **reliability/never-throw**, **maintainability (single `REDUCED_PRESET` + single-cap/single-datum invariants)**, **accessibility FR-30 + chrome rule + motion caps**, and **offline/installability** unchanged. The reduced preset is the sanctioned fallback; the only new NFR knob is the `benchmark` proving both profiles under budget.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Performance — 60 FPS / frame budget | NFR-1 + NFR-11 + NFR-14: engine `<2 ms/turn`, frame logic worst-case `<8 ms`, device `p99 <16.7 ms` with feel layer (`REDUCED flat` must be ≤ full `shake 130ms` + `bullet 200ms` + `punch 80-120ms` + particles) concurrent with Skia Canvas + Reanimated worklets; both full and reduced profiles `median <0.05ms / p99 <0.1ms` per `feel.bench.test.ts` (10k turns warmup 1k) — reduced is sanctioned `60 FPS` fallback (ADR-04). Caps `SHAKE_CAP 8` and `BULLET_TIME_MS 200` never exceeded without data change. | R-007, R-002, R-006 | Host bench: `node --test triade/benchmarks/feel.bench.test.ts` (2 tests) + sweep `allPresetValues()` × `presetFor/reducedPresetFor + punch*For + shake*For + shouldTriggerBulletTime/shouldShake/maxShakeForTrace` for allocation; no per-merge `withSequence` stacking beyond single shake/bullet per `moveResult`. Device lane: `useFrameRateBaseline` stats after 2-min play with 5+ new-bests including at least one `12` while `Reduced Motion OFF` (full) and one heavy that also shakes (bullet+shake co-fire) plus one `Reduce Motion ON` flat pass — record `fps/p99Ms/frames`; video for mid-flight snap within one frame. | CI `npm test` timing + `feel.bench.test.ts` output `median/p99` (baseline `full 9.6ms / reduced 6.5ms` total for 10k) ; `useFrameRateBaseline` log `fps/p99Ms/frames`; `npx tsc --noEmit` clean. |
| Reliability — never throw | Engine-never-throws extended to feel umbrella: `presetFor/reducedPresetFor/punch*For/shakeMsFor/shakeAmplitudeFor/maxShakeForTrace/shouldShake/shouldTriggerBulletTime/nextSessionBest` + `GameBoard` feel effects + `GameOverOverlay` fade never throw on any input (`null` trace, `NaN`, `Infinity`, `-5`, `undefined` direction, empty `from`, `spawned` missing, `reducedMotion` toggled mid-`withSequence`, unmount mid `Animated.parallel`). `GameBoard` effect silent no-op on empty plan (NOOP), on `reducedMotion true`, on `direction===undefined`, on unmount mid `withSequence`/`bulletFlash`. `GameOverOverlay` cleanup `stopAnimation` on unmount / toggle. | R-010, R-006, R-003 | Unit negative-path sweeps: `NaN`, `Infinity`, `-1`, `null/undefined` value, empty trace, trace with only `spawned:true` or `from.length!==2`, `sessionBest NaN/Infinity/undefined`, `directionVector` irrelevant but `shakeX/Y`/`bulletFlash` never throw; `GameBoard` unmount during pending `withSequence`/`withTiming`; `GameOverOverlay` unmount during pending `280ms` `Animated.parallel`. | `triade/__tests__/feel/feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 + `feel.bench.test.ts` (includes non-finite never-throw) + `Number.isFinite` guard sweep on `haptics`/`feel` restore sites. |
| Maintainability | `REDUCED_PRESET` frozen zero-visual is the single access point for reduced visuals (no scattered `if(flag) return 0` outside `feel.ts` → `punch.ts`/`shake.ts`/`bulletTime.ts`); `FEEL_PRESETS` frozen; `SHAKE_CAP` single cap, `BULLET_TIME_MS 200` single datum, `280ms` game-over fade single literal; `App.tsx` wiring `settings.reducedMotion` is single source threaded to both consumers; future tuning only changes `FEEL_PRESETS`/`REDUCED_PRESET` data, not branching. | R-002, R-003, R-007 | Static-assert: grep for `REDUCED_PRESET` allowlist is `feel.ts` + consumers `punch.ts`/`shake.ts`/`bulletTime.ts` via `reducedPresetFor` import; grep for literal `shakeMs:`, `particleBurst:`, `overshootScale:` outside `src/feel/feel.ts` fails; grep for literal `8` outside `shake.ts:SHAKE_CAP` fails; grep for literal `200` outside `bulletTime.ts:BULLET_TIME_MS` fails except datum comments; grep for `280` game-over fade only in `GameOverOverlay.tsx`; `presetFor` identity vs `reducedPresetFor` copy test. | Source scan + identity test `presetFor(3)===FEEL_PRESETS[3]` + `reducedPresetFor` haptic-preserve loop + `feel.bench.test.ts` both-profile flat assertion. |
| Accessibility / Compliance — FR-30 + chrome rule + caps | Reduced Motion gates *all* visuals (`shakeMs 0`, `shouldShake false`, `shouldTriggerBulletTime false` while `nextSessionBest` still advances, `shouldFlash false`, `particleCount 0`, `shouldGlow false`, `overshootScale 1`, `overshootMs 0`, game-over fade instant `setValue(1)/0` vs `280ms`) while `haptic` preserved and sound stays (haptics gateway never reads `reducedMotion` — FR-30/UX-DR-16). Chrome rule UX-DR-27: board `Animated.View` + `AnimatedTile` are board-only — `Hud` preview card and score never receive shake/bullet/punch. Caps `≤8` (shake) and `≤200ms` (bullet) never exceeded without data change; chrome never animates. | R-001, R-004, R-005, R-009, R-006 | Unit: `reducedPresetFor` preserves `heavy` while zeroing visuals; `punchProfileFor(v,true).scale===1 && flash===false && particles===0 && glow===false && duration===0`; `shakeMsFor(v,true)===0 && shouldShake===false`; `shouldTriggerBulletTime([12], best, true)===false` while `nextSessionBest` advances; `shouldGlow(1536,true)===false`; `hapticsStyleForValue` unchanged. Host: `GameBoard` snapshot asserts board `Animated.View shakeStyle` wraps `Canvas` only, `AnimatedTile isPunch false` when reduced, `GameOverOverlay` instant path; grep `haptics.ts` has no `reducedMotion`. Device: enable iOS Settings → Reduce Motion ON (or in-app Settings toggle) → perform `3/6/12/1536/new-best 12/game-over` → board flat, no flash/particles/overshoot/glow/bullet/shake, fade instant, while haptics still felt; `Hud` preview card never translates/flashes even when board does. | `feel/punch/shake/bulletTime.test.ts` Reduced Motion sweeps + `GameBoard`/`GameOverOverlay` render inspection; device checklist signed in PR. |
| Offline / Installability | Installable + offline (NFR-2, NFR-6) unchanged; no new CDN/network dependency (`reanimated`/`skia` already bundled). `Settings.reducedMotion` persists via `AsyncStorage` (`storage/schema.ts`) offline. | R-008 | App runs offline with reduced toggle (airplane mode) — no network fetch for feel logic (pure helpers). `Settings` round-trips via `AsyncStorage` without network. | Manual airplane-mode device pass (deferred to same device smoke as performance). |

**Unknown thresholds:** None material for 8-5. `median <0.05ms / p99 <0.1ms` and `SHAKE_CAP 8` / `BULLET_TIME_MS 200` / `GameOver fade 280ms` are pinned by `feel.bench.test.ts` + `src/feel/*` constants, not from PRD. If CI bench lane is absent, record actual measured `p99Ms` as baseline rather than inventing a threshold (mark UNKNOWN only if no device/host data collected). `haptics+sound stay` threshold is binary — not measured via bench, only via FR-30 host/device pin.

---

## Entry Criteria

- [ ] Spec `spec-8-5-reduced-motion.md` and `epic-8-context.md` are the reviewed revisions (`baseline_revision 10a3449 → final_revision 0ec7482` pinned in spec; assessed HEAD `0ec7482` byte-identical to working tree plus `sprint-status.yaml` `backlog→done`).
- [ ] `triade/src/engine/**` byte-identical to baseline (ADR-01 purity gate) — `git diff --stat -- triade/src/engine` empty.
- [ ] Branch is on SDK 57 pinned versions (expo ~57.0.11, Reanimated 4, Skia, RNGH, `expo-haptics`, `expo-audio` — existing matrix; `expo-haptics` best-effort via `void import()` as in 8-1, not gated here).
- [ ] Host test runner `npm test` green at `805/814` baseline — 9 expected RED accepted (burst accumulation, overlapping shake, edge clipping, punch/bullet/haptics ATDD deferred — not caused by 8-5, documented in spec Auto Run Result 805 pass / 9 fail; 2 `feel.bench` tests pass `full 9.6ms / reduced 6.5ms`).
- [ ] `npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json` clean (no new `@ts-ignore` for `feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts`/`haptics.ts`; strictly typed `FeelPreset`/`TraceEntry`/`Direction`).
- [ ] `settings.reducedMotion` DEFAULT is `false` in `storage/schema.ts` and persists via `AsyncStorage` (fresh install → full feel).
- [ ] `REDUCED_PRESET` is frozen and `reducedPresetFor` is `haptic-preserving copy` (not scattered flag); `FEEL_PRESETS` frozen; `SHAKE_CAP 8` and `BULLET_TIME_MS 200` single-source unchanged.
- [ ] Feature is behind no flag — reduced motion is immediate on `settings.reducedMotion` boolean gated via `REDUCED_PRESET` + per-helper early-return (single decision point, host-testable).

## Exit Criteria

- [ ] All P0 tests passing (100%) — includes `feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 + `feel.bench.test.ts` 2 + `app.gameOverWiring.test.ts` / `app.restart.test.ts` pins for `settings.reducedMotion`.
- [ ] All P1 tests passing or failures triaged with approved waivers (host integration with real engine fixtures + `App` threading + `GameBoard` board-only + `GameOverOverlay` fade branches + mid-flight snap + one device smoke).
- [ ] No open bugs with severity S0/S1 against umbrella gate / chrome guard / `GameOverOverlay` wiring / preset-not-flag contract / haptics-stay / caps single-source.
- [ ] `triade/src/engine/**` still byte-identical post-merge (CI check `git diff --stat -- triade/src/engine` empty) and no duplicate merge predicate outside engine+feel gateway (`grep -R "from.length===2" --include="*.ts" --include="*.tsx" src/` hits only `src/engine` + `src/feel/bulletTime.ts` + `src/feel/shake.ts` + `src/feel/haptics.ts` + `src/render/transitionPlan.ts` — 5 sanctioned sites).
- [ ] Device smoke pass (iOS dev build, at least one real-device run: merge `6 → subtle shake`, `12 → stronger + flash/particles + overshoot`, `1536 → glow`, new-best `12 → ~200ms bullet flash`, game over → soft fade. Toggle Settings Reduced Motion ON → repeat each: board stays flat, no flash/particles/overshoot/glow/bullet/shake, game-over appears instantly, haptics still felt on each merge, sound still plays. Toggle mid-shake/bullet → board snaps flat within one frame. Preview card & score never flash/shake. Sign-off in PR description).
- [ ] `REDUCED_PRESET` still single-sourced via `feel.ts` + `reducedPresetFor` import in `punch.ts`/`shake.ts` (no scattered `reducedMotion?0:` literals outside `feel/*` helpers) — static scan gate; `SHAKE_CAP` + `BULLET_TIME_MS` invariants verified (grep allowlists).
- [ ] `GameOverOverlay` wiring still `reducedMotion={settings.reducedMotion}` in `App.tsx:929` (no literal `false` — grep gate), and `feel.bench.test.ts` both profiles under budget (`median <0.05ms / p99 <0.1ms`).
- [ ] Coverage target: all 7 rows in spec I/O & Edge-Case Matrix covered by at least one automated test (actual: `feel.test.ts` preset identity + reduced haptic-preserve, `punch.test.ts` flat for all tiers, `shake.test.ts` 0/false, `bulletTime.test.ts` gate while `nextSessionBest` advances, `app.gameOverWiring` fade wiring, `feel.bench` both-profile budget; gap is `GameBoard`/`GameOverOverlay` imperative timing — covered by host integration P1 + device smoke).
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` and `triade/tsconfig.test.json` clean.

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE / TEA | Owns `feel.ts` `REDUCED_PRESET` + `punch/shake/bulletTime` gating + `GameBoard` board-only + `GameOverOverlay` fade + `App` wiring, host unit sweeps, engine-trace fixtures, bench both-profile, device smoke sign-off |
| — | QA (if staffed) | Reviews FR-30 umbrella + chrome rule + caps/benchmark gate, validates device p99, owns deferred-work triage for burst orphan / shake overlap / edge clipping (pre-existing EXPECTED RED) |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` denote priority/risk. Execution timing (PR vs nightly vs device-manual) is defined under Execution Strategy.

### P0 (Critical)

**Criteria**: Blocks core reduced-motion contract + high risk (≥6) or no workaround + pure/cheap host execution.

| # | Requirement / AC | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | AC preset identity vs reduced copy | `presetFor(3)===FEEL_PRESETS[3]` frozen identity, `presetFor(12)===FEEL_PRESETS[12]`, `presetFor(NaN/Infinity/-1/0)→light` never throws; `allPresetValues()` covers 13 tiers | Unit | R-002 | 1 (loop) | DEV (done) | `feel.test.ts` case `pure and data-driven` — canonical frozen object, memo-safe. |
| P0-02 | AC `reducedPresetFor` preserves haptic, zeroes visuals | `reducedPresetFor(3).haptic light && 6 medium && 12 heavy && 12 shakeMs 0 && particleBurst 0 && overshootMs 0 && overshootScale 1 && flash false`; non-finite `NaN/Infinity` → `haptic light` + flat never throws (try/catch) | Unit | R-002, R-001 | 2 | DEV (done) | `feel.test.ts` `reducedPresetFor keeps haptic, cuts visual` + non-finite fallback. |
| P0-03 | AC punch flat under Reduced Motion | For every tier `3,6,12,24,768,1536,3072`: `punchScaleFor(v,true)===1 && shouldFlash===false && particleCountFor===0 && shouldGlow===false && punchProfileFor(v,true) flat (scale 1, duration 0, flash false, particles 0, glow false)` while `punchScaleFor(v,false)` is `1.08/1.12/1.15` per preset | Unit | R-001, R-002 | 2 | DEV (done) | `punch.test.ts` `Reduced Motion gates all visual` loop — `reducedPresetFor` delegation, not scattered flag. |
| P0-04 | AC shake flat under Reduced Motion | For `v∈tiers`: `shakeMsFor(v,true)===0 && shakeAmplitudeFor===0 && maxShakeForTrace(trace heavy12, true)===0 && shouldShake(...,true)===false`; full `shakeMsFor(6,false)===2 && 12+→5 && cap ≤8` (already) | Unit | R-001 | 2 | DEV (done) | `shake.test.ts` `reducedMotion gating — all ->0/false` loop + medium/heavy tier pins; `maxShakeForTrace` early-return `0`. |
| P0-05 | AC bullet gated but `nextSessionBest` still advances (FR-30) | `shouldTriggerBulletTime([merge12],0,true)===false` vs `false→true`, `shouldTrigger([12],6,true)===false`, `shouldTrigger(null,0,false)===false`; `nextSessionBest([12],6)===12` even when `shouldTrigger suppressed`; `isNewSessionBest([12],6)→true` regardless of flag | Unit | R-001 | 2 | DEV (done) | `bulletTime.test.ts` Reduced Motion sweep + `nextSessionBest` undo-rewind pin — bullet never gates haptics. |
| P0-06 | AC haptics stay under Reduced Motion | `hapticsStyleForValue(3) Light / 6 Medium / 12+ Heavy` identical regardless of `reducedMotion`; `triggerHapticsForTrace` gateway never reads `reducedMotion` (grep empty), `reducedPresetFor(12).haptic heavy` proves preservation | Unit | R-009 | 1 | DEV (done) | `feel.test.ts` `FR-30 haptics stay` + `haptics.ts` comment never gate; device tactile check in P1. |
| P0-07 | AC glow `1536+` only glow, gated under Reduced Motion | `shouldGlow(768,false)===false && 1536 true && 3072 true && 6144 true && 384 false`; `shouldGlow(1536,true)===false` etc.; non-finite `shouldGlow(NaN,false)===false` never throws | Unit | R-001 | 1 | DEV (done) | `punch.test.ts` `glow only for 1536+` + Reduced Motion flat loop; spec "only glow in system". |
| P0-08 | AC game-over fade branches + never throw | `GameOverOverlay` with `reducedMotion true` → instant `setValue(1)/0` (no `Animated.timing`), with `false` → `Animated.parallel 280ms` with `80ms` delay and cleanup `stopAnimation`; `reducedMotion` initial `useRef` seeded `1/0` vs `0/12` prevents first-frame flash; helpers never throw on `NaN/Infinity/undefined` | Unit (host seam + never-throw) | R-003 | 2 | DEV (done) | Host lifecycle test for fade branches + `catch` never-throw sweeps across `feel/*` helpers (already in `feel/punch/shake/bulletTime.test.ts`). |
| P0-09 | AC caps single-source + benchmark both profiles under budget | `SHAKE_CAP===8` and all `shakeMsFor(v,false)≤8`; `BULLET_TIME_MS===200`; `feel.bench.test.ts` 2 tests `median <0.05ms && p99 <0.1ms` for full and reduced sweeps (10k turns, `full 9.6ms / reduced 6.5ms` total) | Unit (bench) | R-007, R-002 | 2 | DEV (done) | Bench pins both-profile budget + reduced flat while haptic unchanged; `npx tsc` clean. |

**Total P0**: 9 groups (~14 `it()` cases + 2 bench tests), host-only, <5 s + bench <1 s.

### P1 (High)

**Criteria**: Validates the declarative trace→board→feel→game-over wiring and the native boundary; medium/high risk (3–4) and common workflows. Requires either engine fixtures (host) or a real device.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | AC trace→feel contract via `reducedPresetFor` | All helpers over a **real engine trace fixture** (via `move(game, dir, rng)` seeded `mulberry32`) return flat under `reducedMotion true` and tier-correct under `false`; `maxMergeValue`/`maxShakeForTrace` correctly identify merge entries iff `from.length===2 && !spawned && finite` and respect `SHAKE_CAP`/`BULLET_TIME_MS` single-source | Integration (host, engine fixture) | R-001, R-002, R-007 | 2 (1 single-merge `1+2→3` fixture, 1 multi-merge with `12+` heavy) | DEV | Pull fixtures via real `move()` (as `feel-trace-fixtures.ts` for shake/bullet); eliminates stub drift. Assert `reducedPresetFor` path yields `particleBurst 0 / shakeMs 0 / flash false`. |
| P1-02 | AC `App` threading `settings.reducedMotion` | `App.tsx` threads `settings.reducedMotion` into `GameBoard reducedMotion` AND `GameOverOverlay reducedMotion={settings.reducedMotion}` (2 sites); `storage/schema.ts DEFAULT_SETTINGS reducedMotion false`; `grep -n "reducedMotion={false}" App.tsx` returns empty (no hardcoded literal); toggle persists via `AsyncStorage` | Integration (host, App seam + static) | R-003, R-008 | 2 (1 wiring grep/snapshot, 1 persistence host check) | DEV | Verify via `grep -n` + `app.gameOverWiring.test.ts:41` + `app.restart.test.ts:193-379` regression pins already green. |
| P1-03 | AC `GameBoard` feel gating board-only | `GameBoard` gates: `moveResult.moved && !reducedMotion && direction` for shake (`maxShakeForTrace` + `Math.min(...,SHAKE_CAP)` + `directionVector`), `moveResult.moved && !reducedMotion && shouldTriggerBulletTime` for `bulletFlash withSequence(withTiming(0.45,60), withTiming(0,BULLET_TIME_MS-60))`, `if(!reducedMotion)` for particle bursts, and `AnimatedTile isPunch = isMerge && !reducedMotion` (overshoot `1.15/1.12/1.08` etc. only when not reduced, glow only `>=1536` and not reduced). Board `Animated.View shakeStyle` wraps `Canvas` only; bullet overlay `Animated.View position:absolute width×width borderRadius:14 #fff7e0 opacity:bulletFlash`; chrome `Hud`/`PreviewCard` never inside `Animated.View` | Integration (host, render seam) | R-001, R-004, R-005 | 2 (1 gating branching, 1 board-only snapshot) | DEV | Host check via component tree snapshot; Reanimated timing itself is device-only; assert `import { BULLET_TIME_MS }` present and `REDUCED_PRESET` via `reducedPresetFor` not literal `0`. |
| P1-04 | AC `GameOverOverlay` fade branches | `GameOverOverlay` render with `reducedMotion true` → `scrimOpacity 1 / contentOpacity 1 / contentY 0` instantly (no `Animated.timing`), with `false` → `Animated.parallel` with `FADE_MS 280` + `delay 80` and `easing.out(cubic)` + cleanup `anim.stop() / stopAnimation()`; `useRef` seeding `reducedMotion?1:0` prevents first-frame flash | Integration (host, render seam) | R-003 | 2 (1 instant branch, 1 timed branch + cleanup) | DEV | Host lifecycle test via `Animated` mock spying `timing/parallel/stopAnimation`; device confirms instant vs soft fade visually. |
| P1-05 | AC mid-animation snap (shake+bullet+fade) | Toggling `reducedMotion false→true` during in-flight `GameBoard` `130ms` shake `withSequence` + `200ms` bullet `withSequence` snaps all three `shakeX/Y` + `bulletFlash` `withTiming(0,20ms)` via `useEffect([reducedMotion])`; toggling `GameOverOverlay` `false→true` during `280ms` fade snaps `scrim/content` to `1/0` via `setValue` + stops timing. Never leaves residual `0.45` opacity or `translateX` offset | Integration (host lifecycle + device) | R-006 | 1 | DEV | Wrap `GameBoard` + `GameOverOverlay` in `act` + flip `reducedMotion` prop mid-`withSequence`/`Animated.parallel`; assert snap branch. Device: start shake/bullet on `12` new-best then toggle Settings Reduced Motion ON mid-animation → board snaps flat. |
| P1-06 | AC chrome guard + haptics stay | `GameBoard` `Animated.View shakeStyle` and `bulletFlash` are siblings of shake wrapper `Canvas`, not ancestors of `Hud`; `PreviewCard`/score `Text` never receive `shakeStyle`/`bulletFlashStyle`/`isPunch`; `haptics.ts` grep `reducedMotion` empty and `triggerHapticsForTrace` still fires `Light/Medium/Heavy` under Reduced Motion true (FR-30) | Integration (host, component seam + static) | R-004, R-009 | 1 | DEV | Snapshot that `PreviewCard` subtree never receives animated styles; `rg -n "reducedMotion" triade/src/feel/haptics.ts` empty. |
| P1-07 | Device smoke (real iPhone dev build) | In portrait+landscape: merge `6` subtle + `12` heavy + `1536` glow + new-best `12` bullet `200ms` + `6` while `Reduce Motion OFF` → full feel; toggle Reduce Motion ON (Settings) → repeat each → flat overlay (no shake/flash/particles/overshoot/glow/bullet) and game-over instant, while **haptics still felt + sound plays**; NOOP swipe → no feel; `Hud` preview card & score never shake/flash even when board does; `AIRPLANE` mode → same; `mid-shake toggle → snap` | Device smoke | R-001, R-003, R-005, R-006 | 1 (manual checklist, ~15 min) | Owner is PR author; sign-off checkbox in PR description ("device reduced-motion smoke: 6/12/1536 + bullet + game-over 280→instant + chrome + mid-flight snap + haptics stay + NOOP + portrait/landscape"). Use dev build. |

**Total P1**: ~11 logical assertions + 1 device pass, ~4–7 h to finalise fixtures + seam plus 15-min device pass.

### P2 (Medium)

**Criteria**: Secondary flows + low/medium risk (1–4) + perf/regression depth; narrowly scoped smoke.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | Bench both profiles | `presetFor/reducedPresetFor + punch*For + shake*For + shouldTriggerBulletTime/shouldShake/maxShakeForTrace` sweep `10k` turns both profiles `median <0.05ms / p99 <0.1ms` headroom; reduced asserts zero visuals while haptic mapping unchanged (already 2 bench tests) | Unit (bench) | R-007 | 1 | DEV | `node --test triade/benchmarks/feel.bench.test.ts` PR gate; measure `9.6ms/6.5ms` total baseline. |
| P2-02 | Static-scan chorus (preset-not-flag + caps) | `REDUCED_PRESET` single-source: `grep -R "REDUCED_PRESET" src/feel` hits only `feel.ts` + consumers via `reducedPresetFor`; `grep -R "shakeMs:\|particleBurst:\|overshootScale:" src/ --include="*.ts" --include="*.tsx" | grep -v "feel.ts"` empty; `SHAKE_CAP` literal `8` outside `shake.ts:SHAKE_CAP` fails; `BULLET_TIME_MS` literal `200` outside `bulletTime.ts` fails except datum comments; `280` fade only in `GameOverOverlay.tsx` | Static | R-002, R-007 | 1 (lint/grep) | DEV | Prevents scattered literals drift (the R-002 class). |
| P2-03 | `reducedMotion` allowlist | `rg -n "reducedMotion" triade/src/feel/` hits only `feel.ts:REDUCED_PRESET/reducedPresetFor` + `punch.ts` + `shake.ts` + `bulletTime.ts` helpers (never `haptics.ts`); `rg -n "reducedMotion" triade/App.tsx triade/src/render/GameBoard.tsx triade/src/ui/GameOverOverlay.tsx` covers all render gates (3 sites) and zero `reducedMotion={false}` literals in `App.tsx` | Static | R-001, R-009, R-003 | 1 | DEV | Copy of 8-3/8-4 gate extended to umbrella. |
| P2-04 | Engine purity + duplicate predicate | `git diff --stat -- triade/src/engine` empty and `grep -R "from.length===2" src/` hits only `src/engine` + `src/feel/bulletTime.ts` + `src/feel/shake.ts` + `src/feel/haptics.ts` + `src/render/transitionPlan.ts` (5 sanctioned sites); `triade/src/feel/feel.ts` is single access point for preset visuals | Ops/CI (static) | R-002 | 1 (CI check) | CI | Single `bash` gate in PR. |
| P2-05 | Width / overflow clipping + cleanup guards | Grep `GameBoard` overlay `View style width/height=width` + `App.boardWrap overflow:hidden` is present; `GameOverOverlay` effect cleanup has `anim.stop() + scrimOpacity.stopAnimation()` etc.; device screenshot that `5-8px` shake at board corners does not visibly cut tiles beyond `borderRadius:14` / `overflow:hidden` boundary (board-only clipping is by design) | Static + Manual | R-004, R-006 | 1 | QA | Visual at board corners / landscape; `overflow:hidden` vs `overflow:visible` product decision if clipping visible (deferred-work entry). |

**Total P2**: ~5 checks.

### P3 (Low)

**Criteria**: Nice-to-have + exploratory + device feel tuning; not a gate.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Umbrella feel tuning rank | On device with Reduce Motion OFF, manually rank `3 light` vs `6 medium` vs `12+ heavy` vs `1536 glow` vs `cap/bullet` for perceived weight separation; then ON → confirm all rank steps go flat while haptics still stepped `Light/Medium/Heavy`. Note any `heavy still too strong / glow not distinct` for product tuning. | Exploratory (manual) | 1 | UX/FE | Not pass/fail; feeds tuning of `FEEL_PRESETS` without touching gating. |
| P3-02 | Chrome guard snapshot | On device, capture video of heavy merge board shake/bullet vs `Hud` preview card side-by-side to prove `Animated.View` wraps `Canvas` only; note `overflow:hidden` edge if present. | Manual | 1 | QA | Optional; web snapshot not applicable (Skia Canvas). |
| P3-03 | Rapid axis + co-fire | On device, trigger heavy new-best `12` that also shakes (`5`) + punches + bullet (`200ms`) + glow? then immediately `up` heavy within `130ms` → verify bullet+shake co-fire without mutual suppression and that Reduce Motion snaps both; swipe heavy then immediately `game over` → verify fade branch (board flat + overlay instant when reduced). | Manual | 1 | QA | Edge-case visual for overlap handling (R-006) + `shake+bullet` stacking. |
| P3-04 | Old-settings migration / persistence spot check | On device fresh install, play one match, toggle Reduce Motion ON, kill app, relaunch → still ON (AsyncStorage round-trip); toggle OFF → full feel returns. Simulate old `Settings` without `reducedMotion` field → coalesces to `false` (DEFAULT). | Manual/Host | 1 | DEV | Waives to host unit `undefined` coalesce if device migration not reproducible. |

**Total P3**: 4 exploratory checks.

---

## Execution Order

For this story execution is host-dominated; device/manual is the only expensive gate.

### Smoke (<1 min, host, every save)

- `npm test -- triade/__tests__/feel/feel.test.ts triade/__tests__/feel/punch.test.ts triade/__tests__/feel/shake.test.ts triade/__tests__/feel/bulletTime.test.ts` — the umbrella P0 tests + `feel.bench` reduced-preset flat pin.
- `node --test triade/benchmarks/feel.bench.test.ts` — the 2 bench tests `median <0.05 / p99 <0.1` both profiles.
- `npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json` — type gate (no `@ts-ignore` for `feel/*`; strict `TraceEntry`/`FeelPreset`).

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 cases (already in `feel/punch/shake/bulletTime.test.ts` + `app.gameOverWiring/app.restart` pins) + new P1 host fixtures (P1-01..P1-06) + P2 static/bench/grep chorus.
- **CI purity + literal scan**: `git diff --stat -- triade/src/engine` empty + `grep -R "REDUCED_PRESET" src/feel` allowlist + `grep -R "from.length===2" src/` 5-site allowlist + `grep -R "reducedMotion" triade/src/feel` allowlist (no `haptics.ts`) + `grep -n "reducedMotion={false}" triade/App.tsx` empty.
- **Static scan**: `REDUCED_PRESET` single-source, `SHAKE_CAP 8`, `BULLET_TIME_MS 200`, `GameOver 280ms` solo-literal, board-only chrome guard grep.

### Device gate (manual, ~15 min, before merge)

- **Device smoke** (real iPhone dev build): single lane, trigger merges for values `6` (subtle), `12+` (heavy), `1536` (glow), new-best `12` (bullet `200ms`), each in portrait+landscape; game over with/without Reduce Motion (instant vs `280ms` soft fade); enable Reduce Motion → repeat each heavy → flat while haptics still felt + sound plays; NOOP swipe → no feel; preview card & score never animate; mid-shake/bullet toggle → snap flat within one frame; airplane mode → same. Sign-off in PR description.
- **Cross-check**: 8-1..8-4 deferred REDs remain (9 pre-existing) — not re-verified unless 8-5 touched haptics/punch/shake/bullet timing (it gates but does not retune; gate is flat, so prior REDs remain deferred).

### Nightly/weekly — not required for 8-5

No nightly lane. Epic 8 device `p99 <16.7 ms` covering full feel preset (shake + punch + bullet time) under both profiles is the Epic-level nightly lane when 8-6 lands. 8-5 umbrella (`reduced` is the fallback) alone does not justify a nightly perf harness.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node --test` parallelisation); defer only real-device reduced-motion feel checks because they require Skia + Reanimated worklets, a Taptic-capable device, and `Animated` timing physics.

- **PR**: All functional host tests (P0 + P1 host fixtures + P2 static/bench). No infrastructure overhead — `node --test` + `tsc` is the only runner. `tea_use_playwright_utils` is `true` in config but not required for this pure-RN story (no Playwright needed; no `page.goto` flows — a React Native feel-umbrella story, not a web Playwright flow).
- **Pre-merge device**: One manual iPhone pass (P1-07 plus exploratory P3). Owner is the PR author; sign-off is a checkbox in the PR description ("device reduced-motion smoke: 6/12/1536 + bullet + game-over instant/280 + chrome + mid-flight snap + haptics stay + NOOP + portrait/landscape").
- **Nightly/weekly**: None for 8-5. Epic 8 device p99 covering the full feel preset (punch + shake + bullet time) under both profiles is the Epic-level nightly lane when 8-6 exists.

No k6 / contract / perf harness is required for this delta (no network API, no backend, no contract).

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 9 groups (~14 `it` + 2 bench already passing) | 0.1–0.25 | **~0.9–2.3 h** | Already done this story (`feel/punch/shake/bulletTime.test.ts` + `feel.bench` + `app.gameOverWiring`); review + sweep extension only. |
| P1 | 7 groups (fixtures + wiring + board-only + game-over + mid-flight + chrome/haptics + device smoke) | 0.5–1.0 | **~3.5–7 h** | Fixtures from real engine traces (1.5 h) + `GameBoard`/`GameOverOverlay` seam/inspection + `App` wiring + device smoke (0.25 h). |
| P2 | 5 checks (bench + chorus + allowlist + purity + clipping/cleanup) | 0.3–0.7 | **~1.5–3.5 h** | Two grep choruses + `feel.bench` gate + clipping/cleanup device screenshot. |
| P3 | 4 exploratory (tuning + chrome snapshot + co-fire + persistence) | 0.2–0.5 | **~0.8–2 h** | Manual only, not a gate; optional. |
| **Total** | **~25 logical checks** | **—** | **~6.7–14.8 h** | **~0.8–1.9 days** wall-clock single dev; with device wait **~12–24 h** elapsed including fixtures review + one device pass. |

- P0 host verification on change: <5 s + bench <1 s.
- PR gate (host): <15 min end-to-end.
- Device smoke: ~15 min per pass; one pass required before merge.
- No nightly infra cost.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures; P1-01 engine-fixture waiver to device-only allowed — must be documented)
- **P2/P3 pass rate**: ≥90% (informational; exploratory P3 not a gate)
- **High-risk mitigations**: 100% complete or approved waivers (R-001 umbrella host+device pin, R-002 preset-not-flag + bench both profiles, R-003 GameOver wiring + grep + `app.gameOverWiring` pin)

### Coverage Targets

- **Critical umbrella paths (punch flash/particles/overshoot/glow/bullet/shake/game-over fade + haptics stay)**: ≥80% line/branch via host tests; remaining via device smoke
- **Business logic (`feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts`/`haptics.ts`/`GameBoard`/`GameOverOverlay`)**: 100% (all tiers + reduced + non-finite + `Number.isFinite` guards + `reducedMotion` threading)
- **Edge cases (NOOP, multi-merge max wins, unmount, `reducedMotion` toggle mid-animation, `undefined` reducedMotion, invalid trace, `width NaN`)**: ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (including `feel 12 + punch 8 + shake 12 + bulletTime 9 + bench 2` and `app.gameOverWiring`/`app.restart` wiring pins)
- [ ] No high-risk (≥6) items unmitigated or without approved waiver
- [ ] `triade/src/engine/**` byte-identical (CI gate)
- [ ] Reduced Motion umbrella verified both host (tier sweep flat across all helpers + `reducedPresetFor` haptic-preserve) and device (Reduce Motion ON flat for all 6 visuals + game-over instant while haptics still felt + sound plays)
- [ ] Preset-not-flag invariant verified (`REDUCED_PRESET` frozen + `reducedPresetFor` copy + `feel.ts` single-source + bench both profiles under `0.05/0.1` ms)
- [ ] GameOver wiring verified: `App.tsx:929 reducedMotion={settings.reducedMotion}` (no literal `false`) and `GameOverOverlay` instant vs `280ms` branches + cleanup guards
- [ ] Board-only chrome guard verified: board `Animated.View` wraps board only, `Hud`/`PreviewCard` never animated, no `reducedMotion` gating of `haptics.ts`
- [ ] `npx tsc --noEmit` clean (`--project triade/tsconfig.json` + `triade/tsconfig.test.json`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (NFR-1 p99 not yet measured on device for full Epic — waiver allowed as with 8-2..8-4)

---

## Mitigation Plans

### R-001: FR-30 umbrella non-compliance — one of 6 visuals not gated (Score: 6)

**Mitigation Strategy:**
1. Keep `punch*For` → `reducedPresetFor`, `shake*For` → `reducedPresetFor` / `maxShakeForTrace(...,true)→0`, `shouldTriggerBulletTime(...,true)→false` while `nextSessionBest` advances, `shouldGlow(...,true)→false`, `GameBoard` `!reducedMotion` burst gate + `AnimatedTile isMerge && !reducedMotion` + `GameOverOverlay` instant branch.
2. Sweep every tier `3,6,12,24,768,1536` host that all visuals flat under `true` and haptic preserved (already in `punch/shake/bulletTime.test.ts` loops).
3. Grep gate `rg -n "reducedMotion" triade/src/feel/` allowlist (only `feel.ts` + helpers, never `haptics.ts`) + render gates `GameBoard`/`GameOverOverlay`/`App` + `rg -n "reducedMotion={false}" triade/App.tsx` empty.
4. Device with iOS Settings → Reduce Motion ON: heavy `12`, `1536` glow, new-best bullet, game-over — board flat, no flash/particles/overshoot/glow/bullet/shake, fade instant, haptics+sound still.

**Owner:** FE lead
**Timeline:** Immediate (gate this story; enforce in 8-6 review)
**Status:** Planned — P0 umbrella loops done, grep gate + device pass pending (bench already green `9.6/6.5ms`)
**Verification:** `punch/shake/bulletTime.test.ts` Reduced Motion loops + `grep -c` allowlist green + device checklist signed in PR + `feel.bench` bench flat assertion.

### R-002: Preset-not-flag contract drift — scattered flag or `REDUCED_PRESET` mutated / haptic not preserved (Score: 6)

**Mitigation Strategy:**
1. Keep `REDUCED_PRESET Object.freeze({shakeMs0, particleBurst0, overshootMs0, overshootScale1, flash false})` and `reducedPresetFor(v)` `try/catch` copy `{...REDUCED_PRESET, haptic: presetFor(v).haptic}`; `presetFor` returns frozen canonical `FEEL_PRESETS` identity.
2. Sweep `presetFor(3)===FEEL_PRESETS[3]` identity and `allPresetValues()` haptics, and `reducedPresetFor(12).haptic heavy` while visuals zeroed (already).
3. Static scan: `grep -R "shakeMs:\|particleBurst:\|overshootScale:" src/ --include="*.ts" | grep -v "feel.ts"` empty; `grep -R "REDUCED_PRESET" src/feel` only `feel.ts` + `reducedPresetFor` consumers; bench `feel.bench` sweeps both profiles and asserts reduced visuals flat while haptic mapping unchanged.
4. Document: `presetFor` identity-stable, `reducedPresetFor` copy — consumers must not memo by identity on the reduced path.

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned — `feel.test.ts` identity + reduced-preserve done, chorus scan + bench sweep pending PR enforcement
**Verification:** Identity + reduced-preserve unit + grep chorus green + `node --test triade/benchmarks/feel.bench.test.ts` both-profile median/p99 under budget.

### R-003: GameOverOverlay wiring regression — hardcoded `false` reintroduced (Score: 6)

**Mitigation Strategy:**
1. Keep `App.tsx:929 reducedMotion={settings.reducedMotion}` (fix from `false`); both `GameBoard` and `GameOverOverlay` threaded in same render from `settings`.
2. Host pins `app.gameOverWiring.test.ts:41` and `app.restart.test.ts:193-379` expect `settings.reducedMotion` wiring — keep as P0 regression (already updated).
3. Static `rg -n "GameOverOverlay" triade/App.tsx` must show `reducedMotion={settings.reducedMotion}` and zero `reducedMotion={false}`/`{true}` literals in `App.tsx`; grep `DEFAULT_SETTINGS` shows `reducedMotion false`.
4. Host lifecycle: mount `GameOverOverlay` with `true` → instant `1/0`, with `false` → `Animated.parallel 280ms +80 delay` + `stopAnimation` cleanup; device: game over with ON → instant, OFF → soft fade, both lanes.

**Owner:** FE
**Timeline:** Immediate (regression pin this story)
**Status:** Planned — `App.tsx` fix done and pins updated; lifecycle host test + device pass pending
**Verification:** Wiring pins green + `rg` literal check empty + lifecycle `Animated` mock spying + device instant vs `280ms` video checklist.

---

## Assumptions and Dependencies

### Assumptions

1. SDK 57 + Reanimated 4 + Skia are pinned and the dev build includes the Reanimated Babel plugin (worklets compile) — if missing, shake/bullet `withSequence`/`withTiming` silently degrades (assume present, verified by `npx tsc` + prior 8-2..8-4).
2. `src/engine` is the single source of truth for merge classification via `from.length===2 && !spawned`; no caller duplicates that predicate beyond `haptics.ts`/`shake.ts`/`bulletTime.ts`/`transitionPlan.ts` (checked by 5-site grep gate).
3. `settings.reducedMotion` is stable within a render and `EARLY_INPUT_MS≈84 ms` gate is the only re-plan trigger; rapid-swipe overlap at `~90 ms` before shake/bullet `130/200ms` completes is the only concurrency seam (same as 8-3/8-4, deferred).
4. Device p99 baseline will be collected during the Epic 8 device lane (deferring full `nfr-assess` for NFR-1 is acceptable this story — same waiver as 8-2..8-4).
5. Nine pre-existing EXPECTED RED from 8-1..8-4 remain accepted (`burst accumulation setTimeout orphan`, `overlapping shake cancelAnimation missing`, `board edge 5-8px clipping by overflow:hidden`, punch/bullet/haptics ATDD deferred) and do not block 8-5 — 8-5 gates but does not retune timing/particles/slicing, so prior REDs remain deferred not green.
6. `Animated.View` burst/punch overlays (`position:absolute` + `pointerEvents:none`) do not compete with shake `Animated.View` for layout; `shakeX/Y` + `bulletFlash` shared values are orthogonal to tile `x/y` shared values inside `AnimatedTile`; chrome (`Hud`/`PreviewCard`) stays outside all animated wrappers.

### Dependencies

1. `triade/src/engine/core/*` — unchanged; `line.ts`/`trace` contract for `TraceEntry` required for P1 fixtures (available; deterministic `mulberry32` seeded runs).
2. `src/services/storage/settingsStore.ts` + `schema.ts` — `Settings.reducedMotion` + `DEFAULT_SETTINGS false` required for App wiring and persistence (available; `AsyncStorage`).
3. `triade/src/ui/Hud.tsx` / `PreviewCard.tsx` + `src/game/preview.ts` — chrome rule dependency: preview card must stay outside shake/bullet/punch wrapper (available; structure verified in 8-3).
4. `triade/src/render/transitionPlan.ts` — `classify` already returns `merge` correctly for `from.length===2 && !spawned` (available; no change).
5. Real iPhone dev build (Expo dev client) with Skia + Reanimated worklets + `useWindowDimensions`/`layoutFor` → `width` available — required for P1-07 device smoke (requires device access, ~15 min).
6. CI runner with `node --test` and `npx tsc` + `rg`/`grep` — host gates (available); bench runner `node --test triade/benchmarks/feel.bench.test.ts` available.

### Risks to Plan

- **Risk**: Host seam for `GameBoard` `shakeX/Y` + `bulletFlash` + `AnimatedTile isPunch` + `GameOverOverlay` `Animated.parallel` not inspectable without a seam → P1-03..P1-05 remain manual-only / code-review-gated.
  - **Impact**: Reduced host automation coverage for wiring; relies on device smoke for punch/overlay feel confidence.
  - **Contingency**: Add a thin seam (`export function derivePunchScale(...)` already host-testable via `punch.ts`; add `__TEST__` accessor for `GameBoard` styles) or replicate decisions in a host-only helper; document waiver in PR if seam not added this story (same as 8-3/8-4).
- **Risk**: `boardWrap overflow:hidden` clipping at `8px` edge is visible on heavy shake in landscape even under `Reduce Motion OFF` (not gated here) — and reduced `ON` flat avoids it.
  - **Impact**: Cosmetic polish hit on every heavy merge when reduced is OFF (P2/R-004); not a reduced-motion bug but same `p99` lane.
  - **Contingency**: Product decision: bump `BOARD_PADDING` by `8px` or set `boardWrap overflow:visible` with a safe bleed margin; defer to deferred-work entry already filed for shake.
- **Risk**: `burst accumulation setTimeout orphan` (burst `setTimeout` without cleanup) and `shake overlap without cancelAnimation` remain deferred EXPECTED RED from 8-2/8-3 — 8-5 does not fix them, only gates.
  - **Impact**: Truncated overlap / orphan timer not caused by 8-5; deferred-work.md entries remain open.
  - **Contingency**: Track in `deferred-work.md`; fix seam would be `cancelAnimation(shakeX/Y/bulletFlash)` + `clearTimeout` guard if product prioritises — not a blocker for 8-5 gate.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **Engine (`src/engine`)** | No direct impact (unchanged); `planTileTransitions` already maps `merge` correctly for punch/shake/haptics/bullet, same predicate as gated. | Existing 695+ engine tests must remain green; `git diff --stat -- triade/src/engine` empty gate. |
| **Haptics (`src/feel/haptics.ts`, umbrella independence)** | Indirect: shares `FeelPreset`/`presetFor`/`reducedPresetFor` with all helpers but logic untouched; `triggerHapticsForTrace` fire-and-forget path never gated by `reducedMotion` (FR-30). | `feel.test.ts` 12 + `haptics` gateway tests must remain green; assert `haptics.ts` never imports `reducedMotion`/`settings`. |
| **Punch (`src/feel/punch.ts` + `AnimatedTile`)** | Gated via `reducedPresetFor` + `isMerge && !reducedMotion`; no new data beyond `REDUCED_PRESET` zero flat. | `punch.test.ts` 8 must remain green; device that `12` with Reduce Motion ON has no overshoot/flash/particles/glow while OFF does. |
| **Shake (`src/feel/shake.ts` + `GameBoard` shake)** | Gated via `shakeMsFor(...,true)→0` / `maxShakeForTrace(...,true)→0` and `GameBoard` `moveResult.moved && !reducedMotion` guard; `SHAKE_CAP 8` unchanged, `withSequence 130ms` unchanged. | `shake.test.ts` 12 must remain green; `grep -R "SHAKE_CAP" src/feel` allowlist. |
| **Bullet time (`src/feel/bulletTime.ts` + `GameBoard` flash)** | Gated via `shouldTriggerBulletTime(...,true)→false` while `nextSessionBest` still advances; `BULLET_TIME_MS 200` single datum unchanged, `withSequence 60 + (BULLET-60)` unchanged, `Snapshot sessionBestMerge` rewind untouched. | `bulletTime.test.ts` 9 + `GameBoard` bullet overlay datum scan must remain green. |
| **Game-over (`src/ui/GameOverOverlay.tsx`)** | Wiring fix: `reducedMotion` now threaded from `App.tsx:929`; instant vs `280ms` branches are the only new NFR seam in 8-5. | `app.gameOverWiring.test.ts` / `app.restart.test.ts` pins must remain green; `rg -n "GameOverOverlay" triade/App.tsx` must show `settings.reducedMotion`. |
| **Settings / storage (`src/services/storage/schema.ts`)** | `Settings.reducedMotion boolean` persistence (DEFAULT `false`) is the single source; no new schema migration beyond the boolean. | `schema.ts` DEFAULT scan; AsyncStorage round-trip via device toggle kill/relaunch. |
| **Render (`src/render/GameBoard.tsx`)** | Board `Animated.View` shake + bullet flash overlay stay board-only; `AnimatedTile` punch stays tile-local; chrome (`Hud`/`PreviewCard`/score) never animates. | Snapshot that `Hud` subtree never receives `shakeStyle`/`bulletFlashStyle`/`isPunch` + device side-by-side video. |
| **Bench (`benchmarks/feel.bench.test.ts`)** | Both full and reduced profiles swept under `0.05/0.1` budget; bowl not regressing prior `p99`. | `node --test benchmarks/feel.bench.test.ts` 2/2 green (`full 9.6ms / reduced 6.5ms`). |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification (TECH/SEC/PERF/DATA/BUS/OPS), scoring `P×I` (1–9), gate `≥6` mitigations
- `probability-impact.md` — Probability `1 Unlikely / 2 Possible / 3 Likely` × Impact `1 Minor / 2 Degraded / 3 Critical` scale, `≥6 MITIGATE`, `9 BLOCK`
- `test-levels-framework.md` — Test level selection (Unit pure, Integration with engine fixtures, E2E/device for worklet + haptics)
- `test-priorities-matrix.md` — P0-P3 prioritization `P0 revenue/critical + high-risk no workaround → P1 core → P2 secondary → P3 exploratory`, tag-based execution
- `nfr-criteria.md` — NFR validation gates (performance k6/bench, reliability never-throw, maintainability single-source, accessibility FR-30+chrome, offline)
- `test-quality.md` — Never-throw, frozen preset, single-cap/datum invariants

### Related Documents

- PRD: (Epic 8 is derived from FR-30 + UX-DR-16/27/28 + ADR-04/NFR-1/NFR-14)
- Epic: `_bmad-output/implementation-artifacts/epic-8-context.md`
- Spec: `_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md` (`baseline 10a3449 → final 0ec7482`)
- Architecture: `triade/src/feel/feel.ts` (`FEEL_PRESETS` + `REDUCED_PRESET` + `presetFor`/`reducedPresetFor`), `triade/App.tsx` threading, `triade/src/render/GameBoard.tsx` board-only, `triade/src/ui/GameOverOverlay.tsx` fade
- Tech Spec: `triade/benchmarks/feel.bench.test.ts` (both-profile bench `<0.05/<0.1`)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Story**: `8-5-reduced-motion` — Reduced Motion umbrella preset (`REDUCED_PRESET` + `reducedPresetFor` + helpers `never-throw`, `GameOverOverlay` wiring `settings.reducedMotion`, board-only guard, both-profile bench)
