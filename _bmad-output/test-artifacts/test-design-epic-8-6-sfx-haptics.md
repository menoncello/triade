---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-01'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-6-sfx-haptics.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/haptics.ts'
  - 'triade/src/feel/sfx.ts'
  - 'triade/src/services/assets/assetManifest.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/feel/sfx.test.ts'
  - 'triade/package.json'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 8 / Story 8-6 — SFX haptics (expo-audio thock coupled with haptics, swappable gateway, Reduced Motion keeps sound)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `8-6-sfx-haptics`
**Scope:** Targeted test design for the working-tree delta of story 8-6

> **Delta under assessment:** Commit `b16a06e` (`story 8-6-sfx-haptics: expo-audio thock coupled with haptics, swappable gateway, reduced-motion keeps sound`) — 1 commit ahead of baseline `7e1916a` (prior story `8-5-reduced-motion`). The current uncommitted diff is metadata-only (`_bmad-output/implementation-artifacts/sprint-status.yaml` `8-6-sfx-haptics: backlog→done`); the assessed production change is the committed `b16a06e` delta (spec `final_revision 52bd3e5` includes review patches — pending merge):
> - `triade/src/feel/sfx.ts` (new, 152 LOC) — pure `sfxVolumeForValue(value): number` + `sfxKindForValue` + swappable gateway `triggerSfxForMerge(value, gateway?)`, `triggerSfxForTrace(trace, gateway?)`, `triggerSfxForSpawn(value, gateway?)`, `triggerSfxForGameOver(gateway?)`; dynamic import `expo-audio` (`createAudioPlayer` / `AudioPlayer` SDK 57.0.3) best-effort fire-and-forget `void playViaExpoAudio`, `catch(() => null)` degrade, never throws/never awaits/never blocks `move()`; injectable `SfxGateway { play: (kind, volume) => void }` for host seam; `VOLUME_BY_HAPTIC { light:0.45, medium:0.65, heavy:1.0 }` mirrors haptic scale via `presetFor(value).haptic` (data not code); `spawn` fixed `0.35`, `gameOver` `0.9`; merge predicate `from.length===2 && !spawned` shared with `haptics.ts`/`shake.ts`/`bulletTime.ts` (engine `line.ts` contract); comments `// FR-30: Reduced Motion keeps sound — never gate` + `// Best-effort, never throws, never blocks`
> - `triade/src/services/assets/assetManifest.ts` (+36 −1 LOC) — registered 3 placeholder SFX assets (`sfx-merge`, `sfx-spawn`, `sfx-gameover`) via `require('../../assets/sfx/merge.wav')` etc. wrapped in `try/catch → null`; `preloadAssets` filters only finite numbers and `await Asset.loadAsync` degrades to no-op when files absent (spec "never throw, no block"); no throw when `assets/sfx/` directory absent (verified — directory does not exist, degrade path exercised)
> - `triade/App.tsx` (+20 LOC in `doMove`) — coupled audio with haptics at same observer call site: after `triggerHapticsForTrace(result.trace)` (FR-30 stays), also `triggerSfxForTrace(result.trace)` for merges, `triggerSfxForSpawn(spawnEntry.value)` when `result.moved && pendingSpawn` spawns (`trace.find(e=>e.spawned)` + `Number.isFinite`), and `triggerSfxForGameOver()` when `result.moved && isGameOver(nextBoard)` transitions; each wrapped in `try/catch` no-throw, never gates on `settings.reducedMotion`, never awaits; `doMove` dependency array unchanged (`[game, match, matchStats, sessionBestMerge, tutorialState, settings]`) validated byte-identical to pre-story except added audio lines
> - `triade/package.json` (+2 LOC) — pinned `expo-audio ~57.0.3` and `expo-haptics ~57.0.1` under Pinned Version Matrix comment (SDK 57); no new native module beyond pinned set, no music dependency
> - `triade/__tests__/feel/sfx.test.ts` (new, 136 LOC) — 11 host cases (2 suites) pinning volume scale `3→0.45 / 6→0.65 / 12+→1.0`, `presetFor` haptic-derivation, non-finite fallback, Reduced Motion keep-sound, coupled `hapticsStyleForValue` 1:1, NOOP silence, `triggerSfxForTrace` per-merge scaled volume, `ForMerge/ForSpawn/ForGameOver` kinds, swappable gateway contract, missing `expo-audio` degrade silent, gateway throw swallowed, no-music guard (3-kind allowlist)
> - `triade/__tests__/feel/punch.atdd.test.ts` (+9 −5 LOC) — fixed stale P1-04 assertion: removed hard-coded `reducedMotion={false}` for `GameOverOverlay`, now asserts `!reducedMotion={false}` literal (S8.5 wiring `settings.reducedMotion`); test now green-compliant with umbrella gate
> - No engine edits (`git diff --stat -- triade/src/engine` empty — verified), no `feel.ts`/`haptics.ts`/`shake.ts`/`bulletTime.ts` logic change beyond import of `presetFor` by `sfx.ts`, no fixed-step loop, never `Math.random`, helpers never throw
> - Assets `triade/assets/sfx/` absent (no `merge.wav`/`spawn.wav`/`gameover.wav` shipped — placeholder recorded in spec "gateway degrades to no-op until wav files land")

---

## Executive Summary

**Scope:** Targeted test design for Epic 8, Story 8-6 SFX haptics. The story closes the Epic 8 feel suite: a thin, swappable `expo-audio` observer (S8.6, UX-DR-29) that plays minimal cálido thock SFX for merge / spawn / game-over — no music — scaled by tile value mirroring the haptic scale (`3 light → 12+ heavy` via `FeelPreset`/`presetFor` data, not branching code), coupled with haptics at the same trace observer in `App.tsx:doMove`, never blocking gameplay and staying fully active under Reduced Motion (FR-30, UX-DR-16). The gateway is injectable (`AudioGateway` mock) for host-testable volume/kind pins; the production path dynamic-imports `expo-audio` best-effort and degrades silent when assets or module are missing. Spec caps "never exceed 3 SFX kinds in MVP".

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (score ≥6): 4
- Critical categories: BUS (coupled audio+tactile peak — UX-DR-29 completeness), TECH (never-block/never-throw contract + asset absence degrade), PERF/BUS (Reduced Motion keep-sound compliance — FR-30/UX-DR-16), OPS (expo-audio SDK 57 API divergence + asset manifest duplicate require)

**Coverage Summary:**

- P0 scenarios: 8 groups (host unit, pure `sfx.ts` layer — already 11 `it()` passing, 0 fail on `sfx.test.ts`; <1 s)
- P1 scenarios: 7 groups (engine-trace→`sfxVolumeForValue` fixtures + `App` coupling/wiring + swappable gateway + device smoke triples `3/6/12+` + Reduced Motion keep-sound)
- P2/P3 scenarios: 8 groups (asset-manifest preload degrade, gateway rapid multi-merge, SDK pin verification, bench/micro, no-music static scan, exploratory tuning)
- **Total effort**: ~10–20 hours (~1.3–2.6 days wall-clock with device access; host-only <0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/spawn/score rules, `pendingSpawn` / `previewFor` / undo history invariants, `transitionPlan.ts:classify`** | ADR-01 purity: engine is pure TS single source of truth, unchanged in this delta (byte-identical `triade/src/engine`). Feel/audio are observers of `MoveResult.trace` / `isGameOver`; no new `canMerge` predicate beyond `src/feel` gateway. | Engine invariants pinned by existing 695+ tests + PR check `git diff --stat -- triade/src/engine` empty. This plan adds a no-duplicate-merge-predicate grep gate (5 sanctioned sites now including `sfx.ts`; 8-5 allowed 4). |
| **Haptics mapping 8-1 (`FeelPreset.haptic` light/medium/heavy) and `expo-haptics` native binding internals** | `FeelPreset.haptic` mapping (`3 light, 6 medium, 12+ heavy`) already shipped; 8-6 only ensures `sfxVolumeForValue` derives from same `presetFor(value).haptic` and that coupling is at same call site. Native `expo-haptics` remains best-effort `void import()` as in 8-1. | 8-1 test design + `feel.test.ts` 12 cases remain gate; 8-6 asserts `hapticsStyleForValue(3) Light / 6 Medium / 12+ Heavy` aligns 1:1 with `sfxVolumeForValue` (already in `sfx.test.ts` coupled test). |
| **Punch visual 8-2 internals (overshoot spring timing, `BurstView`/`ParticleDot` curves, `1536` glow colour)** | 8-2 shipped `AnimatedTile` overshoot/snap + flash/particles/burst/glow; 8-6 does not retune timing. Coupling only affects audio, not visual choreography. | 8-2 test design + `punch.test.ts` 8 cases remain gate; 8-6 device smoke asserts punch still fires alongside thock without regressing punch-only REDs. |
| **Screen shake 8-3 directional axis / `withSequence 130ms` / `SHAKE_CAP 8`** | Directional shake along swipe axis (`2` medium, `5` heavy capped `8`) already shipped; 8-6 only co-fires audio alongside shake, does not retune shake. | 8-3 test design + `shake.test.ts` 12 cases remain gate. |
| **Bullet time 8-4 rarity gate / `BULLET_TIME_MS 200` / `sessionBestMerge` Snapshot rewind** | `BULLET_TIME_MS=200` single datum + helpers already shipped; 8-6 couples sound but does not gate `shouldTriggerBulletTime` nor mutate `Snapshot`. | 8-4 test design + `bulletTime.test.ts` 9 cases remain gate; 8-6 asserts bullet still `200ms` when sfx also fires (no timing regression). |
| **Reduced Motion umbrella 8-5 (`REDUCED_PRESET` / `reducedPresetFor` zero-visual gate)** | 8-5 umbrella gates every visual feel path while haptics+sound stay; 8-6 must respect `FR-30: Reduced Motion keeps sound` — audio is never gated. Visual gating itself not changed. | 8-5 test design + `reducedMotion.atdd.test.ts` 21 remain gate; 8-6 pins that `sfx.ts` never reads `reducedMotion` and that `sfxVolumeForValue` is independent of `reducedPresetFor` (host + device checklist). |
| **Real audio mastering / thock wav quality, pitch table, music / looping BGM** | Spec blocks: "Requires acquiring real audio mastering beyond placeholder thock assets — block if needed" and "Never add music or looping background audio". MVP uses placeholder `merge/spawn/gameover` wav; `sfxKindForValue` always returns `merge` (no pitch table). | Gateway degrades to no-op when wav absent (verified); 8-6 pins only 3 kinds emitted (`merge`/`spawn`/`gameOver`), `music`/`bgm`/`loop` absent via static scan + `sfx.test.ts` no-music guard. Follow-on asset mastering tracked as deferred work. |
| **Epic 9 a11y beyond FR-30 (tap targets 44pt, VoiceOver contract, WCAG AA shape+colour, themes)** | No new tokens, labels, or theme changes beyond audio plumbing; chrome never animates is already pinned. | Epic 9 suites remain gate; this plan only verifies `triggerSfx*` never gated and chrome not animated. |
| **RevenueCat / AdMob / IAP / consent / Crashlytics / Epic 10-11** | No monetization, telemetry, or privacy code touched (`sfx.ts` is local observer only; no new permissions beyond `expo-audio` playback). | Existing Epic 4 / Epic 10-11 suites remain gate. |
| **Reanimated/Skia/expo-audio native implementations themselves** | Third-party native modules (`createAudioPlayer`/`AudioPlayer`, `withTiming`/`withSequence`, `Canvas`) treated as external. | Trust but verify via device smoke; no unit mock of `expo-audio` timing physics beyond gateway `play(kind, volume)` host assertions. |
| **Web / PWA parity** | Target is Expo dev build on iOS (SDK 57, Reanimated 4, Skia). Web has no haptics and limited `expo-audio` parity; assets absent path is host-only. | Manual device-only validation for audio; web excluded except "never throw" host check. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `sfxVolumeForValue(value)` is pure, host-testable, data-driven from `presetFor(value).haptic` (frozen `FEEL_PRESETS`); swappable `SfxGateway { play }` seam lets every trigger (`ForMerge/ForTrace/ForSpawn/ForGameOver`) be exercised without importing `expo-audio`. `triggerSfxForTrace` predicate (`from.length===2 && !spawned`) mirrors `haptics.ts`/`shake.ts`/`bulletTime.ts` and can be seeded with engine `move()` traces (695+ fixtures) or synthetic `TraceEntry[]`.

**Observability — Good (with seam).** Production `expo-audio` path is deliberately opaque (dynamic import + `require` of `assets/sfx/*.wav` absent → silent no-op), but observable via injected gateway: `play(kind, volume)` exposes exact kind+volume for host assertions. Default path without gateway exercises degrade branch (`sfx.test.ts` asserts never-throw without mock). Worklet/audio timing itself not host-assertable — device ear needed.

**Reliability — Strong.** Every public export guarded by `try/catch` never-throw + `Number.isFinite` checks; `audioModulePromise` cached once; `assetManifest` preload `try/catch` per asset. `App.tsx` coupling is fire-and-forget `try/catch` per call (3 calls) so merge/merge-then-spawn-then-gameOver never blocks `move()` dispatch.

**Testability Risks:** Two surfaces are thin: (a) `assetManifest` + `sfx.ts` both `require('../../assets/sfx/*.wav')` — duplicate require seam, only one place can be wrong while the other still passes host gate; mitigated by grep allowlist. (b) `expo-audio` SDK 57 dual API (`createAudioPlayer` vs `AudioPlayer` constructor + `setVolume/volume` + `seekTo`) — host can't pin branching without a real module; mitigated by device smoke.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | BUS | **Coupled audio+tactile peak broken — `sfxVolumeForValue` drifts from `presetFor` haptic tier or haptics+audio fire on different predicate.** `sfxVolumeForValue` correctly derives from `presetFor(value).haptic` via `VOLUME_BY_HAPTIC {0.45/0.65/1.0}` (data not code). `triggerSfxForTrace` and `triggerHapticsForTrace` both filter `!spawned && from.length===2` on same `result.trace` at same `doMove` call site. Risk: future tuning adds `if(value>=1536) return 1.5` scatter outside `VOLUME_BY_HAPTIC`, or maps `1536+` to `medium` while haptics maps to `heavy`, or SFX filters `spawned===false` differently (e.g. missing `Array.isArray(from)` guard), causing `haptics:Heavy` with `volume:0.45` on `12+` — the "O Merge como Momento" peak lands half. Spec "sound scales mirroring haptic scale, coupled per merge value" violated. | 2 | 3 | **6** | Pin coupling: (a) **host unit** `sfx.test.ts: P0 sfxVolumeForValue derives from presetFor haptic tier` loops every tier `3/6/12/24/48` asserting `presetFor(v).haptic→volume` 1:1 + `coupled haptics+audio same tier — volume maps 1:1 with hapticsStyleForValue` asserts `3 Light 0.45 / 6 Medium 0.65 / 12 Heavy 1.0`; (b) **grep gate**: `rg -n "VOLUME_BY_HAPTIC" triade/src/feel/sfx.ts` is the single volume literal allowlist; `grep -R "0\.45\|0\.65\|1\.0" triade/src/feel/ --include="*.ts" | grep -v "sfx.ts"` must be empty (no volume literals outside `sfx.ts`); (c) **trace-fixture integration**: `move(board, dir, rng)` → extract `trace.filter(from.length===2 && !spawned).map(e=>e.value)` → assert `triggerSfxForTrace(trace, gw).length === triggerHapticsForTrace count` and volumes match `hapticsStyleForValue` per entry (same order); (d) **device**: merge `3` light thock + `6` medium + `12` heavy in same session → ear confirms weight rank. | FE lead | Immediate (gate this story; protect Epic 8 close) |
| R-002 | TECH | **Never-throw / never-block violation — dynamic import, `require` of missing wav, or gateway throws blocks or crashes `doMove` dispatch.** `sfx.ts` wraps every entry (`sfxVolumeForValue`, `triggerSfxFor*`, `dispatchPlay`, `playViaExpoAudio`, `getAudioModule`) in `try/catch` + `Number.isFinite` + `await modPromise` `.catch(()=>null)`; `App.tsx` wraps each of 3 audio calls in its own `try/catch` and never awaits. Risk: a new caller does `await triggerSfxForTrace(...)` or `await import('expo-audio')` inline, or `require('../../assets/sfx/merge.wav')` throws synchronously outside `try/catch`, or `gateway.play` throws outside `dispatchPlay` guard — an effective swipe with `result.moved true` then halts before `busyRef` clears or before `setMoveResult`, leaving board stale or input gate stuck (`EARLY_INPUT_MS≈84ms` re-plan never fires). Spec "never throw/never await/never block" broken. | 2 | 3 | **6** | Enforce contract: (a) **host never-throw sweep** `sfx.test.ts: gateway failure never suppresses caller` forces `gateway.play→throw` swallowed + `NOOP/empty/null trace` never throws + non-finite `sfxVolumeForValue` fallback `0.45`; (b) **static grep** `rg -n "await.*triggerSfx\|await.*playViaExpo\|await import\('expo-audio" triade/src/feel/` must be empty except `playViaExpoAudio` internal `await modPromise` (which is itself fire-and-forget via `void playViaExpoAudio`); (c) **App scan** `rg -n "triggerSfxForTrace\|triggerSfxForSpawn\|triggerSfxForGameOver" triade/App.tsx` shows 3 `void`/`try/catch` fire-and-forget lines, zero `await`; (d) **bench**: `sfxVolumeForValue` sweep `10k ×13 tiers` median `<0.05ms` so `doMove` hot path adds <0.1ms; device: rapid double merge `<50ms` → both thocks attempt re-seek without blocking next swipe. | FE | Immediate |
| R-003 | TECH | **Missing-wav degrade path crashes — both `assetManifest` and `sfx.ts` `require('../../assets/sfx/*.wav')` throw when `triade/assets/sfx/` absent (current state: directory does not exist), or preload `Asset.loadAsync` rejects, or `expo-audio` not installed in host.** `assetManifest` wraps each `require` in `try/catch → null` and `preloadAssets` filters to finite numbers + `try/catch` around `Asset` import + `loadAsync`; `sfx.ts:playViaExpoAudio` wraps `require` per kind in `try/catch → null` and returns early when `!source`. Risk: someone removes the `try/catch` around `require`, or makes `sfx-merge` non-null assertion, or hoists `require` to top-level (outside function) — then `App.tsx` `preloadAssets()` or first merge throws `Cannot find module merge.wav` and `ready` never flips or first `doMove` crashes. Current host `sfx.test.ts: missing expo-audio degrades silent without throw` passes only because degrade path works — regression re-opens crash. | 2 | 3 | **6** | Keep degrade green: (a) **host pin** `sfx.test.ts: swappable gateway receives correct kind+volume; missing expo-audio degrades silent without throw` calls `triggerSfxForMerge(6, null)` with no mock and asserts `doesNotThrow` (exercises `getAudioModule→null` branch); (b) **manifest pin** noted that `assetManifest` returns `null` when file absent and `preloadAssets` filters to `0` resources → `return` without `loadAsync`; (c) **static grep** `rg -n "require\(.*assets/sfx" triade/src/ --include="*.ts"` must show exactly 6 sites (3 in `assetManifest.ts` + 3 in `sfx.ts`) each wrapped in `try/catch` — no top-level `import`/`require` of wav; (d) **device**: fresh install via `npx expo prebuild` without `assets/sfx/` → launch succeeds, first merge silent (no thock) but no crash; follow-on asset drop lands thock without code change. | FE | Immediate (degrade is MVP ship path until mastering lands) |
| R-004 | BUS | **FR-30 Reduced Motion keeps sound regression — `triggerSfxForTrace` gated behind `settings.reducedMotion` while `triggerHapticsForTrace` stays.** `sfx.ts` correctly never imports `reducedMotion`/`settings` (comment `// FR-30: Reduced Motion keeps sound — never gate`) and `App.tsx` `doMove` never wraps audio calls in `if(!reducedMotion)` (unlike punch/shake/bullet `if(!reducedMotion)` gates). `sfxVolumeForValue` is independent of `reducedPresetFor` (volume derived from `presetFor`, not `reducedPresetFor`). Risk: well-meaning a11y refactor wraps `triggerSfxForTrace(result.trace)` in `if(!settings.reducedMotion)` alongside visual gates, silencing thock for motion-sensitive users — Reduced Motion with only haptics, no audio (FR-30/UX-DR-16 breach, S8.6 "Reduced Motion keeps sound" AC broken). Spec "Never gate sound behind `reducedMotion`" violated. | 2 | 3 | **6** | Pin FR-30: (a) **static grep** `rg -n "reducedMotion" triade/src/feel/sfx.ts` must be empty (only the `// FR-30: Reduced Motion keeps sound` comment line allowed) — `sfx.ts` never reads the flag; (b) **host pin** `sfx.test.ts: reducedMotion keeps sound — sfxVolume identical via reducedPresetFor haptic preservation` loops `3/6/12/1536` asserting `reducedPresetFor(v).haptic === presetFor(v).haptic` and that `sfxVolumeForValue` does not read reducedMotion (same output regardless); (c) **App grep** `rg -n "triggerSfxForTrace\|triggerSfxForSpawn\|triggerSfxForGameOver" triade/App.tsx` shows zero `reducedMotion` token on those 3 lines (unlike `GameBoard reducedMotion` lines which do gate visuals); (d) **device**: iOS Settings → Reduce Motion ON → repeat merges `3` light + `12` heavy + spawn + game over → thocks heard at same scaled volume + haptics still felt, visuals flat. | FE | Immediate (a11y/App Store gate for Epic 8) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-005 | TECH | **Trace spawn/merge misclassification — `triggerSfxForSpawn` fires on wrong entry or misses spawn because `result.trace.find(e=>e.spawned)` convention is informal.** `App.tsx:395` finds `spawnEntry = result.trace.find(e=>e.spawned)` and fires `triggerSfxForSpawn(spawnEntry.value)` with `Number.isFinite` guard; `triggerSfxForTrace` filters `!spawned && from.length===2`. `line.ts` contract says merge entries have `from.length===2 && spawned===false` and spawn entries have `from.length===0 && spawned===true`. Risk: a refactor classifies spawn as `from.length===1 && !spawned` (e.g. slide-into-spawn) missing the `find`, or a trace with two spawns (future multi-spawn rule) would only thock first; or NOOP (`moved===false`) still has a leftover `spawned` entry if caller forgets `result.moved` guard — spurious spawn thock on NOOP. | 2 | 2 | 4 | Keep single predicate: assert engine `move()` with `result.moved===true` always has exactly one `spawned:true` entry and `moved===false` has zero (engine contract — already in 8-3/8-4 trace fixtures); `App.tsx` branch guards `if(result.moved)` before spawn search (already present) so NOOP `[]` → no thock (host NOOP test `sfx.test.ts: NOOP / empty trace` already asserts `calls 0`). Host integration: drive canonical `move()` fixtures for `3`, `12+`, NOOP, game-over and assert `triggerSfxForSpawn` fires exactly once when `moved true` else zero. `triggerSfxForTrace` NOOP already green. |
| R-006 | TECH | **Swappable gateway contract drift — `App.tsx` coupling hardcodes default dynamic-import path, unit seam not exercised in production.** `sfx.ts` exposes `SfxGateway { play }` injectable param (`gateway?: SfxGateway | null`) and `dispatchPlay` prefers it, but `App.tsx:doMove` calls `triggerSfxForTrace(result.trace)` without passing a gateway (falls through to `void playViaExpoAudio`). Risk: volume/kind contract changes (e.g. `spawn 0.35 → 0.55`) would pass App but break host pins only if gateway tests are not authoritative; or `playViaExpoAudio` branching `createAudioPlayer` vs `AudioPlayer` vs `setVolume/volume` is never host-tested because host injects mock — real device path (no mock) could silently no-op due to SDK mismatch while host stays green. | 2 | 2 | 4 | Keep both paths green: (a) `sfx.test.ts: triggerSfxForTrace fires one SFX per merge entry with scaled volume` injects `SfxGateway` and pins kind+volume per entry (`3 0.45, 6 0.65, 12 1.0`) — this is source of truth for volume contract; (b) default-path `sfx.test.ts: missing expo-audio degrades silent without throw` exercises no-gateway branch and asserts no throw (degrade path); (c) **device smoke**: install on Expo dev build (SDK 57) with placeholder wavs once mastered, perform `3/6/12+` merges + spawn + game over → ear confirms rank `0.45<0.65<1.0` and `spawn 0.35 < light` and `gameOver 0.9` loud; re-run host after any volume retune so host+device agree. |
| R-007 | TECH | **`expo-audio` SDK 57 dual-API divergence — `createAudioPlayer` vs `AudioPlayer` vs `setVolume/volume` vs `seekTo` branching untested.** `sfx.ts:playViaExpoAudio` tries `mod.createAudioPlayer(source)` → `player.setVolume` || `player.volume` → `seekTo(0)` → `play()` || `replay()`, else `new mod.AudioPlayer(source)` → `setVolume` → `play()`, each in nested `try/catch`. Risk: Expo SDK `57.0.3` ships only one API; the other branch is dead and may bit-rot (e.g. `AudioPlayer` constructor signature changed, or `createAudioPlayer` now requires `{ keepsVolume }` options) — host with mock never catches it, first device run after upgrade throws `player.setVolume is not a function` or `cannot read property createAudioPlayer of undefined` buried in swallowed catch so failure is silent (no thock, no crash) and unnoticed. | 1 | 3 | 3 | Pin pinning: (a) `package.json` `expo-audio ~57.0.3` + `app.json` prebuild compatibility comment stays; (b) **SDK spike smoke**: on upgrade PR, run `npx expo install expo-audio@~57.0.3 && npx expo prebuild --clean` + manual device pass before merge; (c) **contract test**: `playViaExpoAudio` stays wrapped so even unknown API returns early with no throw — add `console.warn` in `__DEV__` on dead branch if product wants surfacing (deferred); host `missing expo-audio degrades silent` already guards the null-module branch. |
| R-008 | OPS | **AssetManifest duplicate require seam — wavs required in both `assetManifest.ts` and `sfx.ts` (6 sites) can diverge.** `assetManifest` registers `sfx-merge/spawn/gameover` via `require('../../../assets/sfx/merge.wav')` etc. for `preloadAssets` → `Asset.loadAsync`; `sfx.ts:playViaExpoAudio` re-requires `require('../../assets/sfx/merge.wav')` per kind for immediate `createAudioPlayer` source. Risk: one path adds `assets/sfx/merge.wav` literal while the other uses `gameover.wav` typo (`gameover` vs `game-over`), or manifest preload succeeds but `sfx.ts` require fails due to relative path depth (`../../../` vs `../../`), or bundler excludes second `require` as duplicate — device would preload but then `playViaExpoAudio` `!source → return` silently skips thock despite file existing. | 1 | 3 | 3 | Single-source discipline: (a) **grep allowlist** `rg -n "require\(.*assets/sfx" triade/ --include="*.ts"` must show exactly 6 sites (3 manifest + 3 sfx) with filenames `merge.wav / spawn.wav / gameover.wav` spelled identically across both files; (b) **manifest filter test**: `preloadAssets` `Object.values(assetManifest).map(resolve).filter(finite)` with `sfx` entries returning `null` when files absent → `resources.length 0 → return` (already implemented); (c) when mastering lands, assert `triade/assets/sfx/` contains all 3 wavs and both manifests resolve to same numeric asset id. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | PERF | **Rapid multi-merge (<50ms) re-trigger re-seek race — last wins, no stacking.** `sfx.ts` gateway holds at most one `expo-audio` player per kind and re-seeks to 0 before `play()` so rapid merges `<50ms` (within `EARLY_INPUT_MS≈84ms` re-plan window) may truncate previous thock. No per-merge player pool. Risk: double-merge `6+12` fires two `play` calls back-to-back — second `seekTo(0)` cuts first heavy thock tail, ear hears only last. Acceptable rarity per spec residual risk; haptics still fire both. | 1 | 2 | 2 | Monitor — keep never-block over stacking; device ear confirms truncation not perceived as missing thock on common single-merge moves; only double-merge (rare) affected. No pooling in MVP (spec residual). |
| R-010 | OPS | **Non-finite / negative volume fallback masks corruption — `sfxVolumeForValue(NaN/Infinity/-5) → 0.45` never-throw swallows data bug.** `sfxVolumeForValue` wraps `presetFor` + `VOLUME_BY_HAPTIC` lookup in `try/catch` and clamps `vol` via `Number.isFinite` + `Math.max(0, min(1, vol))`; engine never emits `NaN` but corrupted `trace[].value=NaN/Infinity/-5` would be thocked as light instead of surfacing. Same class as 8-2 R-009 / 8-3 R-009 / 8-4 R-009 (spec "never throw" non-negotiable). | 1 | 1 | 1 | Monitor — keep never-throw contract (already in `sfx.test.ts` non-finite sweep `NaN/Infinity/-1/0/1/2 → 0.45`). No gate; add `__DEV__` warning only if product wants corruption surfacing. |

### Risk Category Legend

- **TECH**: Technical/Architecture (contracts, purity, single-source data, predicate, SDK branching, never-throw)
- **SEC**: Security — none this story (no auth/data exposure)
- **PERF**: Performance (frame budget, benchmark, rapid re-trigger seam)
- **DATA**: Data Integrity — none standalone this story (engine untouched; `assetManifest` persistence covered via R-003/R-008)
- **BUS**: Business Impact (accessibility/App Store compliance, coupled feel peak, no-music rule)
- **OPS**: Operations (asset preload degrade, expo-audio SDK pin, prebuild)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

8-6 touches the **thin audio seam only**: **60 FPS frame budget (audio adds 0 SFX kinds beyond 3, 0 music, <0.1ms host)**, **reliability/never-throw/never-block**, **maintainability (single `VOLUME_BY_HAPTIC` + single merge predicate + single 3-kind allowlist)**, **accessibility FR-30 (sound stays) + no-music rule UX-DR-29 + chrome rule UX-DR-27**, and **offline/installability** (preload `expo-asset` degrade). Audio is best-effort; mastering beyond placeholder thock is outside MVP but degrade contract is in scope.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Performance — 60 FPS / frame budget | NFR-1 + NFR-11 + NFR-14: engine `<2 ms/turn`, frame logic worst-case `<8 ms`, device `p99 <16.7 ms` with feel layer (shake `130ms` + bullet `200ms` + punch `80-120ms` + particles `≤16` + SFX `0` extra frame cost because audio is async `void import()` off main worklet). Both full and reduced profiles `median <0.05ms / p99 <0.1ms` per `feel.bench.test.ts` (10k turns warmup 1k) — SFX adds only `sfxVolumeForValue` pure lookup (already <0.1ms) and `dispatchPlay` `void` — budgeted `<0.05ms` additional per `doMove`. Caps `SHAKE_CAP 8` and `BULLET_TIME_MS 200` unchanged; audio never schedules worklet. | R-002, R-007, R-009 | Host bench: `node --test triade/benchmarks/feel.bench.test.ts` (2 tests) still green + sweep `allPresetValues() × (presetFor + sfxVolumeForValue)` for allocation; `sfx.test.ts` 11 timing `0.04–0.86ms` already in budget. Device lane: same `useFrameRateBaseline` 2-min play as 8-5 plus 5+ new-bests `12` with thock co-fire (shake+bullet+SFX) + one `Reduce Motion ON` flat — record `fps/p99Ms/frames`; audio off main thread must not regress `p99`. | CI `npm test` timing + `feel.bench.test.ts` output `median/p99` (baseline `full 9.6ms / reduced 6.5ms` total for 10k) ; `useFrameRateBaseline` log `fps/p99Ms/frames`; `npx tsc --noEmit` clean. |
| Reliability — never throw / never block | Engine-never-throws extended to audio: `sfxVolumeForValue` / `sfxKindForValue` / `triggerSfxForMerge/ForTrace/ForSpawn/ForGameOver` / `dispatchPlay` / `playViaExpoAudio` / `getAudioModule` / `assetManifest sfx-*` / `preloadAssets` never throw on any input (`null` trace, `NaN`, `Infinity`, `-5`, `undefined` kind, `gateway.play→throw`, missing `assets/sfx/` dir, missing `expo-audio`, unmount mid `import()`). `App.tsx` audio coupling silent no-op on NOOP (`moved false`), on `trace` with only `spawned:true` or `from.length!==2`, on unmount mid `void playViaExpoAudio`. `Asset.loadAsync` failure degrades to defaults (NFR-3). `doMove` never awaits audio. | R-002, R-003, R-005, R-008, R-010 | Unit negative-path sweeps: `NaN`, `Infinity`, `-1`, `null/undefined` trace, empty trace, trace with only `spawned:true` or `from.length!==2`, `gateway.play→throw`, `require` missing wav, `mod null`. `App` unmount during pending `import('expo-audio')` + `Asset.loadAsync`. `preloadAssets` double-invoke idempotency. | `triade/__tests__/feel/sfx.test.ts` 11 (includes non-finite `0.45` fallback + `NOOP empty/null` silence + `gateway failure swallowed` + `missing expo-audio silent` + `no-music` allowlist) + `Number.isFinite` sweep on `haptics`/`feel` restore sites. |
| Maintainability | `VOLUME_BY_HAPTIC {0.45/0.65/1.0}` single volume allowlist via `presetFor(value).haptic` (data not code); `SfxKind 'merge'|'spawn'|'gameOver'` single 3-kind allowlist (no `music`/`bgm`/`loop`); merge predicate `!spawned && from.length===2 && Array.isArray(from)` single-seam across 5 sites (`haptics.ts`/`shake.ts`/`bulletTime.ts`/`punch` board-only via `isMerge`/`sfx.ts`); `SHAKE_CAP 8` single cap, `BULLET_TIME_MS 200` single datum, `0.35` spawn + `0.9` game-over single literals in `sfx.ts`; `VOLUME_BY_HAPTIC` is single volume literal allowlist; future tuning only changes `FEEL_PRESETS`/`VOLUME_BY_HAPTIC` data, not branching. | R-001, R-002, R-006, R-008 | Static-assert: grep `VOLUME_BY_HAPTIC` only in `sfx.ts`; grep `0.45\|0.65\|1.0` only in `sfx.ts` (volumes) — zero volume literals outside; grep `"merge"\|"spawn"\|"gameOver"` allowlist only in `sfx.ts` + `sfx.test.ts`; grep `from.length===2.*spawned` allowlist is exactly 5 files (`haptics/shake/bulletTime/sfx + transitionPlan`); grep `"music"\|"bgm"\|loop` must be empty in `src/feel`; `presetFor` identity vs `reducedPresetFor` copy unchanged. | Source scan + identity test `presetFor(3)===FEEL_PRESETS[3]` + volume-derivation loop + no-music scan. |
| Accessibility / Compliance — FR-30 + chrome rule + caps + no-music | Reduced Motion keeps **both haptics and sound** (`sfx.ts` never reads `reducedMotion`, `App.tsx` never gates `triggerSfx*` on `settings.reducedMotion`, `sfxVolumeForValue` independent of `reducedPresetFor`); `hapticsStyleForValue` + `sfxVolumeForValue` stay coupled (light 0.45 / medium 0.65 / heavy 1.0). No music — only `merge`/`spawn`/`gameOver` cálido thock per S8.6/UX-DR-29; `"no music in MVP"` pinned by `sfx.test.ts` allowlist + static scan. Chrome rule UX-DR-27: audio is non-visual so chrome never animates is vacuously true, but keep board-only `Animated.View` / `AnimatedTile` gates as 8-5 — audio must not introduce a new chrome animation. Caps `≤8` (shake) and `≤200ms` (bullet) unchanged. | R-001, R-004, R-007 | Unit: `sfxVolumeForValue` mirrors `presetFor` tier + `reducedPresetFor` preserves `heavy` while `sfxVolumeForValue` unchanged; `sfx.test.ts: reducedMotion keeps sound` loop; `grep sfx.ts reducedMotion` empty (only comment); `App.tsx` audio lines have zero `reducedMotion` token. Host: `sfx.test.ts: no music — only merge/spawn/gameOver` allowlist. Device: iOS Settings → Reduce Motion ON → perform `3/6/12/1536/new-best 12/game-over` → visuals flat, no flash/particles/overshoot/glow/bullet/shake, fade instant, while haptics+thocks heard at same scaled weight (`3 soft 0.45, 12 full 1.0, spawn 0.35 soft, gameOver 0.9`); `Hud` preview card never translates even when board thocks. | `sfx.test.ts` Reduced Motion + no-music + coupled pins; `App.tsx` wiring grep; device checklist signed in PR (ear check). |
| Offline / Installability | Installable + offline (NFR-2, NFR-6) unchanged; no new CDN/network dependency (`expo-audio` already bundled at `~57.0.3`, `expo-asset` already bundled). `assetManifest` `sfx-*` entries degrade to `null` when `assets/sfx/` absent so offline launch without mastering still succeeds (NFR-3). No new permission beyond audio playback (no mic). | R-003, R-008 | App runs offline with thock seam (airplane mode) — `sfx.test.ts` no-gateway degrade + `preloadAssets` zero-resource early-return; `expo-audio` not required for launch. | Manual airplane-mode device pass (deferred to same Epic 8 device lane as performance/FR-30). |

**Unknown thresholds:** None material for 8-6. `median <0.05ms / p99 <0.1ms`, `SHAKE_CAP 8` / `BULLET_TIME_MS 200` / `0.45/0.65/1.0` volumes / `0.35` spawn / `0.9` game-over are pinned by `feel.bench.test.ts` + `src/feel/sfx.ts` constants, not from PRD. If CI bench lane is absent, record actual measured `p99Ms` as baseline rather than inventing a threshold (mark UNKNOWN only if no device/host data collected). `music` threshold is binary — not measured via bench, only via kind allowlist scan. Thock waveform quality beyond placeholder is mastery-dependent — track as deferred work, not threshold.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-8-6-sfx-haptics.md` intent/boundaries/I-O matrix 8 rows, 4 ACs signed)
- [ ] Test environment provisioned and accessible (Expo SDK 57 dev build on iOS, `triade/` host `node --import tsx --test`)
- [ ] Test data available or factories ready (`presetFor` 13 tiers + `move(board, dir, rng)` traces + `sfx.test.ts` `SfxGateway` mock)
- [ ] Feature deployed to test environment (`b16a06e` committed; `triade/src/feel/sfx.ts` present, `expo-audio ~57.0.3` installed)
- [ ] `expo-audio ~57.0.3` + `expo-haptics ~57.0.1` pinned in `triade/package.json` (Pinned Version Matrix — no extra native module approved)
- [ ] No engine edits (`git diff --stat -- triade/src/engine` empty) and `assets/sfx/` absence accepted as degrade path (spec residual risk recorded)

## Exit Criteria

- [ ] All P0 tests passing (`sfx.test.ts` 11 + `feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 — host)
- [ ] All P1 tests passing (or failures triaged with waivers) — trace→volume fixtures + `App` coupling grep + device smoke ear check `3 light 0.45 / 6 medium 0.65 / 12+ heavy 1.0 / spawn 0.35 / gameOver 0.9` + Reduce Motion keep-sound + NOOP silence
- [ ] No open high-priority / high-severity bugs (R-001..R-004 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on feel SFX seam; no-missing 3-kind allowlist scan + predicate allowlist scan green)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (host never-throw + degrade + FR-30 verified; device p99 deferred to Epic 8 lane allowed as waiver)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns `sfx.test.ts` P0 pins, `App` coupling grep gates, device ear checklist, nfr-assess handoff |
| FE lead | Dev Lead | Owns `sfx.ts` gateway + volume mapping + never-throw contract, asset manifest degrade |
| PM | PM | Signs FR-30 keep-sound + no-music AC, accepts placeholder thock residual risk |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship 8-6; host unit, already green

**Criteria**: Blocks S8.6 audio half of the "Merge como Momento" peak + high risk (≥6) + no workaround (silent moment is user-visible)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC2 `sfxVolumeForValue` mirrors haptic scale — data not code (`3 0.45 / 6 0.65 / 12+ 1.0` via `presetFor(value).haptic`) | Unit | R-001 | 3 | QA (done) | `sfx.test.ts: AC2 3 light -> 0.45…` loop over `12..3072` + `derives from presetFor haptic tier` + `coupled haptics+audio same tier` — `VOLUME_BY_HAPTIC` single-source; `presetFor` frozen identity not re-derived. |
| AC2 small/non-finite never throw fallback to light `0.45` | Unit | R-010, R-002 | 1 | QA (done) | `sfx.test.ts: non-finite / small values never throw` NaN/Infinity/-1/0/1/2 → 0.45 `try/catch`. |
| AC4 Reduced Motion keeps sound — `sfxVolumeForValue` independent of `reducedPresetFor` / never gated | Unit | R-004 | 1 | QA (done) | `sfx.test.ts: reducedMotion keeps sound` loop `3/6/12/1536` `reducedPresetFor.haptic === presetFor.haptic` + `sfxVolumeForValue` identical; complement grep `reducedMotion` empty in `sfx.ts` (only comment). |
| Merge predicate & NOOP silence — `!spawned && from.length===2 && Array.isArray(from)` single-seam | Unit | R-005 | 1 | QA (done) | `sfx.test.ts: NOOP / empty / null trace never throws and plays nothing` + `spawned:true / from len !=2 → 0 calls`. |
| `triggerSfxForTrace` fires one SFX per merge entry with scaled volume (same order as trace) | Unit (gateway mock) | R-001, R-005 | 1 | QA (done) | `sfx.test.ts: triggerSfxForTrace fires one SFX per merge entry…` 3 entries `3/6/12` → `0.45/0.65/1.0` kind merge. |
| `triggerSfxForMerge/ForSpawn/ForGameOver` never throw & correct kind/volume (`merge 1.0 / spawn 0.35 / gameOver 0.9`) | Unit (gateway mock) | R-002, R-006 | 1 | QA (done) | `sfx.test.ts: triggerSfxForMerge / ForSpawn / ForGameOver never throw…` |
| Swappable gateway receives correct kind+volume; missing `expo-audio` degrades silent without throw | Unit | R-002, R-003 | 1 | QA (done) | `sfx.test.ts: swappable gateway … missing expo-audio degrades silent…` calls without gateway → `playViaExpoAudio null` early-return; never throws. |
| No music — only `merge`/`spawn`/`gameOver` kinds ever emitted (MVP 3-kind cap) | Unit + static scan | R-007 (OPS), BUS | 1 | QA (done) | `sfx.test.ts: no music — only merge/spawn/gameOver kinds ever emitted` + `rg -n "music\|bgm\|loop" triade/src/feel/` empty. |

**Total P0**: 10 checks (11 `it()` across 2 suites), ~0.02 h execution (<1 s host)

### P1 (High) — Core wiring & device ear; strong proxy before real wav lands

**Criteria**: Important feel-coupling paths + medium/high risk + common merge/spawn/game-over workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Engine-trace→SFX volume fixtures — `move(board, dir, rng)` with canonical boards (`3`, `6`, `12+`, double-merge, NOOP, game-over) → `trace.filter(!spawned && from.length===2).map(v=>sfxVolumeForValue(v))` rank matches `hapticsStyleForValue` + `maxMergeForTrace`/`maxMergeValue` helpers | Integration (engine→feel) | R-001, R-005 | 3 | QA | Reuse 695+ `triade/__tests__/engine/` fixtures; assert `triggerSfxForTrace` call count = merge entry count and volumes strictly monotonic `0.45<0.65<1.0`. |
| `App.tsx` coupling — `triggerHapticsForTrace` + `triggerSfxForTrace` + `triggerSfxForSpawn` + `triggerSfxForGameOver` at same call site after `setMoveResult`, each in `try/catch`, never `await`, never gated on `reducedMotion` | Component (static + host) | R-002, R-004 | 2 | DEV | Grep `rg -n "triggerSfxForTrace\|triggerSfxForSpawn\|triggerSfxForGameOver" triade/App.tsx` 3 fire-and-forget lines; assert zero `await` and zero `reducedMotion` token on those lines; `haptics.ts`/`sfx.ts` both never gate. |
| `assetManifest` preload degrade — `sfx-*` entries return `null` when `assets/sfx/` absent → `preloadAssets` filters to 0 → no `Asset.loadAsync` crash; when files present, all 3 resolve to numeric ids | Unit | R-003, R-008 | 2 | DEV | `sfx-*` `try/catch→null` already; add host `preloadAssets` smoke with absent/present fixtures (no `expo-asset` import crash). |
| Gateway throw swallowed — `SfxGateway.play→throw` never suppresses caller, haptics still attempt independently | Unit | R-002 | 1 | QA (done) | `sfx.test.ts: gateway failure never suppresses caller` already; complement with `App.tsx` `try/catch` per line so even un-mocked `playViaExpoAudio` throw cannot cascade. |
| Device smoke — 15-min iOS dev build (SDK 57, `npx expo prebuild`): spawn a `3` merge → light thock `0.45` + haptics Light; `6` → medium `0.65`; `12+` heavy `1.0`; spawn soft `0.35`; game over `0.9` fall thock; no music ever; rapid double merge → both thocks without blocking next swipe | Device (manual) | R-001, R-006, R-007 | 1 (checklist 6 steps) | QA | Real-ear check confirms rank; placeholder wav silent path acceptable if mastering not yet landed (document no-thock-but-no-crash). |
| Device FR-30 Reduced Motion keeps sound — toggle ON → repeat `3/6/12/1536/game-over` → visuals flat (no punch/shake/bullet per 8-5) but thocks at same scaled volume + haptics still felt | Device (manual) | R-004 | 1 | QA | Same device pass as above with Settings toggle; require sign-off in PR before Epic 8 close (carry-over device lane from 8-5). |
| `punch.atdd.test.ts` S8.5 wiring regression guard — `GameOverOverlay` not hard-coded `false` (now `settings.reducedMotion`) stays green after audio coupling | Host ATDD | R-004 (context) | 1 | QA (done) | Patch `9399866→b8671e1` already asserts `!reducedMotion={false}` literal; keep as gate. |

**Total P1**: 11 checks, ~0.5–1 h host + 0.25–0.5 h device = ~1–2 h elapsed

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary SFX edges + low/medium risk + perf/maintainability scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| `expo-audio` SDK 57 API pin — `createAudioPlayer` vs `AudioPlayer` branching + `setVolume/volume` + `seekTo` exercised via contract (no real module in host) | Static + device | R-007 | 1 | DEV | `package.json` pin scan + prebuild smoke; any upgrade requires re-running device smoke before merge. |
| Asset duplicate-require allowlist — exactly 6 `require(*assets/sfx*)` sites (3 manifest + 3 sfx) identically spelled `merge/spawn/gameover.wav` each in `try/catch` | Static scan | R-008 | 1 | QA | `rg -n "require\(.*assets/sfx"` allowlist; fails if count ≠6 or any site missing guard. |
| Merge-predicate 5-site allowlist — `from.length===2 && !spawned` + `Array.isArray(from)` only in `haptics/shake/bulletTime/sfx + transitionPlan` (no duplication elsewhere) | Static scan | R-005 | 1 | QA | `rg -n "from\.length.*spawned" triade/src` 4 feel + 1 render; any 6th is new duplicate predicate fail. |
| Multi-merge within `EARLY_INPUT_MS≈84ms` re-plan window — `maxShakeForTrace` max-wins + `maxMergeValue` max-wins + `triggerSfxForTrace` per-entry fires both `6+12` without dropping lighter but last audible wins when `<50ms` (R-009) | Unit | R-009 | 1 | QA | Already in `sfx.test.ts` multi-entry test (2 entries `6+12` → both volumes); complement bench that `dispatchPlay` not awaited so next swipe not gated. |

**Total P2**: 4 checks, ~0.3–0.5 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| SFX micro-bench — `sfxVolumeForValue` sweep `allPresetValues()` × 10k turns warmup `1k` median `<0.05ms` / p99 `<0.1ms` (extend `feel.bench.test.ts` with `sfxVolumeForValue` + `triggerSfxForTrace` synthetic traces budget) | Unit (bench) | 1 | DEV | Extend existing `feel.bench.test.ts` ~20 LOC; both-profile budget unchanged, SFX adds no worklet cost. |
| `sfxKindForValue` still returns `merge` (no pitch table MVP) + volume `Math.max(0, min(1, vol))` clamp scan | Unit | 1 | DEV | Trivial static/unit; `gameOver 0.9` within `[0,1]`. |
| Exploratory — tuning rank ear pass on varied boards (clean vs accelerated lane: `potForTier` `40/40` vs tiered `2-3` does not affect audio kind) + rapid axis-switch while thock co-fires with directional shake | Device exploratory | 1 | QA | No assertion, just ear+video for regression on lane `pot` not leaking into audio. |

**Total P3**: 3 checks, ~0.2–0.4 h host + 0.2 h device

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `require`/import regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/feel/sfx.test.ts` 11 pass / 0 fail (<1 s) — includes `missing expo-audio silent + gateway throw swallowed + no-music allowlist`
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (no new `@ts-ignore`)
- [ ] `rg -n "require\(.*assets/sfx" triade/src/ --include="*.ts" | wc -l` == 6 and each site in `try/catch` (quick scan)

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical audio+tactile peak validation (host only)

- [ ] `sfxVolumeForValue` mirrors haptic scale — `3→0.45 / 6→0.65 / 12+→1.0` data-not-code (3 cases)
- [ ] `triggerSfxForTrace` per-merge scaled volume via gateway mock (1 case multi `3/6/12`)
- [ ] Gateway swappable + missing `expo-audio` degrade silent + `NOOP empty/null/spawned true / from len !=2 → 0` + non-finite fallback (5 cases)
- [ ] No-music guard only `merge/spawn/gameOver` (1 case) + `punch.atdd.test.ts` S8.5 wiring fix still green

**Total**: 10 P0 checks (already 11 `it()` green)

### P1 Tests (<30 min)

**Purpose**: `App` coupling + manifest degrade + device ear before mastering

- [ ] Engine→feel trace fixtures: `move()` boards `3/6/12+`/double-merge/NOOP/game-over → `sfxVolumeForValue` rank + `triggerSfxForTrace` call count (3 fixtures)
- [ ] `App.tsx` coupling grep: 3 audio lines `try/catch` fire-and-forget zero `await` zero `reducedMotion` (1 scan)
- [ ] `assetManifest` preload degrade absent→null→0 resources early-return; present→numeric (2 checks)
- [ ] 15-min iOS dev build ear smoke `3 light / 6 medium / 12+ heavy / spawn 0.35 / gameOver 0.9 / no music` (<15 min)
- [ ] FR-30 device keep-sound: Reduce Motion ON → same thocks + visuals flat (<5 min piggyback)

**Total**: 7 P1 groups + device

### P2/P3 Tests (<60 min)

**Purpose**: Scans, bench, exploratory tuning

- [ ] SDK pin + duplicate-require + merge-predicate 5-site allowlist static scans (<1 min)
- [ ] `feel.bench.test.ts` extended with `sfxVolumeForValue` `10k` sweep median `<0.05` (<1 s)
- [ ] Rapid `<50ms` multi-merge last-wins exploratory ear (<2 min)

**Total**: 8 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 10 | ~0.15 | ~1–1.5 | Pure `sfx.ts` + `VOLUME_BY_HAPTIC` data already pinned (done); `punch.atdd` wiring patch already landed |
| P1 | 7 | ~0.6 | ~3–5 | Engine fixtures + `App` coupling grep + manifest degrade + 15-min device ear (thock rank + FR-30 piggyback) |
| P2 | 4 | ~0.3 | ~1–1.5 | Static scans + SDK smoke + re-plan seam |
| P3 | 3 | ~0.25 | ~0.6–1 | Bench extend + kind/clamp + lane exploratory |
| **Total** | **24** | **-** | **~6–9** | **~0.9–1.3 days host; ~1.3–2.6 days wall-clock with device access** |

### Prerequisites

**Test Data:**

- `SfxGateway { play: (kind, volume)=>void }` injected mock (already in `sfx.test.ts` — reuse)
- `allPresetValues()` 13 tiers `3..12288` + `presetFor` frozen identity (already in `feel.ts`)
- `move(board, dir, rng)` engine fixtures from `triade/__tests__/engine/` + synthetic `TraceEntry[]` with `spawned/from/value`
- No seed DB — in-memory board matrices + `mulberry32` rng ref (as in `App.tsx`)

**Tooling:**

- `node --import tsx --test` (host) + `tsx` for `tsconfig.test.json` — already in `triade/package.json`
- `rg` (ripgrep) for `reducedMotion`/`require assets/sfx`/`VOLUME_BY_HAPTIC` allowlist scans
- `npx tsc --noEmit` (two configs) for type gate

**Environment:**

- Host: Node 20+ with `tsx`, no native `expo-audio` required (degrade path)
- Device: Expo dev build iOS SDK 57 (`npx expo prebuild --clean`), iPhone with `expo-audio ~57.0.3` + `expo-haptics ~57.0.1`, side-loaded via TestFlight or `expo run:ios`; `assets/sfx/` absent path acceptable for MVP (silent degrade), present path re-run ear check once mastered
- Storage: no new `Settings` key; `settings.reducedMotion` already in `storage/schema.ts` (no migration)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — `sfx.test.ts` 11 + coupled `feel.test.ts` 12 must stay green)
- **P1 pass rate**: ≥95% (waivers required for failures; device ear may be waived once as "silent placeholder" if mastering absent, but FR-30 keep-sound must be signed)
- **P2/P3 pass rate**: ≥90% (informational; scans must be 100%)
- **High-risk mitigations**: 100% complete or approved waivers (R-001..R-004 each with owner+triage)

### Coverage Targets

- **Critical paths**: ≥80% (haptic+audio coupling rank + `App` coupling + NOOP + reduced keep-sound + no-music)
- **Security scenarios**: N/A (no auth/data exposure this story)
- **Business logic**: ≥70% (volume 1:1, 3-kind allowlist, spawn vs merge predicate, game-over single-fire)
- **Edge cases**: ≥50% (non-finite/negative/empty/missing-module/gateway-throw)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`sfx.test.ts` 11/11 + `punch.atdd` P1-04 wiring fix not regressed)
- [ ] No high-risk (≥6) items unmitigated (R-001..R-004 each has mitigation plan + device/host evidence or time-boxed waiver until mastering lands)
- [ ] Security tests (SEC category) — N/A this story; confirm no SEC gap
- [ ] Performance targets met (PERF: bench `median <0.05ms / p99 <0.1ms`, device `p99Ms <16.7` deferred to Epic 8 lane allowed as waiver same as 8-5)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw + degrade + FR-30 already pinned; mastering quality beyond placeholder not blocking)

---

## Mitigation Plans

### R-001: Coupled audio+tactile scale drift (Score: 6)

**Mitigation Strategy:** (1) Host-loops `sfxVolumeForValue` over every tier and asserts exact `0.45/0.65/1.0` via `presetFor(value).haptic` (already 3 cases); (2) grep volume literals only in `sfx.ts`; (3) engine-trace integration fixtures (`move()` double-merge `6+12` etc.) asserting same order and count for haptics vs sfx; (4) device ear rank check per PR. Any retune must edit `VOLUME_BY_HAPTIC`/`FEEL_PRESETS` data, never branching code.
**Owner:** FE lead
**Timeline:** Immediate — must be green before `8-6` → `done` promotes to `verified`
**Status:** Planned (P0 cases already green; integration fixtures pending)
**Verification:** `npm --prefix triade test -- __tests__/feel/sfx.test.ts` 11 pass + grep scan 0 outside + device ear sign-off in PR comment.

### R-002: Never-throw / never-block contract break (Score: 6)

**Mitigation Strategy:** (1) Keep every `sfx.ts` export wrapped `try/catch` + `Number.isFinite` + `audioModulePromise.catch(()=>null)`; (2) `App.tsx` 3 audio lines remain `try/catch` fire-and-forget (`void` without `await`); (3) host sweep `gateway.play→throw` swallowed + `null` trace never throws; (4) bench that `sfxVolumeForValue` not on `await` path.
**Owner:** FE
**Timeline:** Immediate
**Status:** In Progress (code already correct; `App` grep gate + host sweep must stay in CI)
**Verification:** Host `sfx.test.ts: gateway failure … swallowed` green + `rg -n "await.*triggerSfx" triade/src/feel/` empty + quick `npm test` timing not regressed.

### R-003: Missing-wav degrade crash (Score: 6)

**Mitigation Strategy:** (1) Keep `assetManifest sfx-*` + `sfx.ts playViaExpoAudio` `require` each inside `try/catch → null` (never top-level import); (2) `preloadAssets` filters to finite numbers and early-returns on 0 resources; (3) host `triggerSfxForMerge(6, null)` without gateway degrade test stays; (4) accept `triade/assets/sfx/` absence as MVP — follow-on `assets/sfx/*.wav` mastering tracked deferred.
**Owner:** FE
**Timeline:** Immediate — degrade is ship path until `8-6` follow-on mastering PR
**Status:** Planned (code correct; device without `assets/sfx/` launch smoke pending)
**Verification:** Kill `assets/sfx/` absent launch succeeds + first merge does not throw (host) and silent no-thock (device expected until mastered).

### R-004: FR-30 Reduced Motion keeps sound regression (Score: 6)

**Mitigation Strategy:** (1) `rg -n "reducedMotion" triade/src/feel/sfx.ts` stays empty except comment line; (2) `sfx.test.ts: reducedMotion keeps sound` loop stays; (3) `App.tsx` audio 3 lines have zero `reducedMotion` token; (4) device Reduce Motion ON ear check (visuals flat, thocks heard).
**Owner:** FE / QA
**Timeline:** Immediate
**Status:** Planned
**Verification:** Grep scan 0 in `sfx.ts` + host loop green + device FR-30 sign-off in PR.

---

## Assumptions and Dependencies

### Assumptions

1. `expo-audio ~57.0.3` dynamic import is optional — host tests never import it and inject `SfxGateway`; production degrades silent when absent.
2. Placeholder `assets/sfx/*.wav` are optional in MVP — `merge/spawn/gameover` thock mastering deferred; gateway degrades to no-op until files land (spec residual).
3. `src/engine` remains pure and trace contract `from.length===2 && !spawned → merge` stays stable for `sfx.ts` predicate (shared with 8-1..8-5).
4. `settings.reducedMotion` stable within a render; `EARLY_INPUT_MS≈84ms` re-plan is only concurrency seam; rapid `<50ms` multi-merge last-audio-wins is acceptable rarity (R-009).
5. Device ear check can be waived once as "silent placeholder" before mastering, but FR-30 keep-sound (sound not gated) must still be signed on same device pass (even if placeholder silent, the code path not gated is verified via grep + host).
6. `feel.bench.test.ts` both-profile budget `median <0.05 / p99 <0.1` is CI gate for SFX additional cost; SFX adds 0 worklet cost so budget unchanged.

### Dependencies

1. `FeelPreset` / `presetFor` frozen data (`triade/src/feel/feel.ts`) — already shipped 8-1, required for volume derivation (available)
2. `expo-audio` pinned dependency (`triade/package.json ~57.0.3`) — required for device smoke once mastered; host not required (exists 2026-09-01)
3. `expo-asset` `Asset.loadAsync` (`triade/src/services/assets/assetManifest.ts`) — already bundled, required for preload degrade path (exists)
4. `move()` trace fixtures (`triade/src/engine`) — required for integration P1 fixtures (exists; engine byte-identical empty diff)
5. iOS Expo dev build (`npx expo prebuild --clean`) — required for device ear pass before Epic 8 verified (needs physical device)

### Risks to Plan

- **Risk**: Real wav mastering not bundled yet — `triade/assets/sfx/` absent, device ear hears silence not thock
  - **Impact**: "O Merge como Momento" audio peak unvalidated on device; host passes but device silent is expected
  - **Contingency**: Waive device thock rank until mastering PR; keep host P0 + FR-30 grep + no-crash degrade as gate; gate-batch mastering PR to re-run same device checklist with wavs present

- **Risk**: `expo-audio` SDK upgrade changes `createAudioPlayer` signature without notice
  - **Impact**: Silent degrade (no thock) while `try/catch` swallows error — unnoticed regression
  - **Contingency**: Pin `~57.0.3` in `package.json` + prebuild smoke on any upgrade PR; consider `__DEV__` `console.warn` on unexpected API before 8-6 follow-on

- **Risk**: `doMove` identity churn on `settings` change (same as 8-3 R-006) still churns `useCallback` deps including `settings` — not caused by 8-6 but same seam
  - **Impact**: No functional failure today; `triggerSfx*` not memoised so no extra cost
  - **Contingency**: Deferred — same waiverwarf as 8-3..8-5; no gate this story

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **Engine (`src/engine` — `move()`, `line.ts` trace, `isGameOver`)** | Unchanged (observer only); `sfx.ts` reads `trace` merge predicate `!spawned && from.length===2` shared with `haptics/shake/bulletTime`; `isGameOver` read for `gameOver` thock. | `git diff --stat -- triade/src/engine` empty + `rg -n "from\.length.*spawned" triade/src/ --include="*.ts"` 5-site allowlist; engine 695+ tests stay green (already `triade/__tests__/engine/`). |
| **Feel haptics (`src/feel/haptics.ts` 8-1)** | Coupled at same `App.tsx:doMove` call site (`triggerHapticsForTrace` then `triggerSfxForTrace`); haptics stays under Reduced Motion per 8-5. | `feel.test.ts` 12 + `sfx.test.ts` coupled test `hapticsStyleForValue ↔ sfxVolumeForValue` rank; `rg -n "reducedMotion" triade/src/feel/haptics.ts` empty (only FR-30 comment). |
| **Feel reducedMotion umbrella (`src/feel/feel.ts` 8-5)** | `sfxVolumeForValue` derives from `presetFor`, not `reducedPresetFor`; volume unaffected by `REDUCED_PRESET` — confirms FR-30 sound stays. | `sfx.test.ts: reducedMotion keeps sound` + grep `reducedMotion` empty in `sfx.ts`; 8-5 `reducedMotion.atdd.test.ts` 21 remain expected RED waived pair same as before. |
| **Render `GameBoard.tsx` (shake 8-3 + bullet 8-4 + punch 8-2)` | No edit this story (audio is non-visual, `GameBoard` not responsible for sound); board-only `Animated.View` + `AnimatedTile isPunch` gates untouched. | `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 stay green; board clip/chrome audits same waiver set as 8-5. |
| **Assets preload (`src/services/assets/assetManifest.ts`)** | `sfx-*` entries added (`merge/spawn/gameover`) via `try/catch→null`; `preloadAssets` filters to finite numbers and `try/catch` around `expo-asset` import. | Host `preloadAssets` absent/present smoke + `npx tsc` clean; launch without `assets/sfx/` must succeed. |
| **App orchestration (`App.tsx:doMove`)** | New observer coupling after `setMoveResult` + `setMatch`/`setMatchStats`/`setSessionBestMerge`; `busyRef` gate `T3.4` still `true` on `result.moved`; `lastDirectionRef` + `Snapshot sessionBestMerge` wiring unchanged. | `punch.atdd.test.ts` P1-04 wiring patch + `shake/bulletTime` wiring pins remain; `doMove` `useCallback` deps unchanged except added audio lines not awaited. |
| **Pinned deps (`expo-audio`/`expo-haptics` SDK 57)** | No new native module beyond `57.0.3/57.0.1` pins; `app.json` prebuild compatible. | `package.json` pin scan + `npx tsc` clean; device prebuild `npx expo prebuild --clean` before Epic 8 verified. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk scoring `P×I` 1-9, `≥6 HIGH MITIGATE`, `=9 BLOCK`, gate decision rules + category ownership
- `probability-impact.md` — Probability `1 Unlikely / 2 Possible / 3 Likely` and Impact `1 Minor / 2 Degraded / 3 Critical` scales + `DOCUMENT/MONITOR/MITIGATE/BLOCK` thresholds
- `test-levels-framework.md` — Test level selection (Unit pure, Integration with engine fixtures, Device for worklet+audio ear)
- `test-priorities-matrix.md` — P0-P3 prioritization `P0 blocks core + high-risk no workaround → P1 core → P2 secondary → P3 exploratory`, tag-based execution
- `nfr-criteria.md` — NFR validation gates (performance bench, reliability never-throw, maintainability single-source, accessibility FR-30+chrome+no-music, offline)

### Related Documents

- PRD: `_bmad-output/implementation-artifacts/epic-8-context.md` (feel suite S8.1–S8.6, FR-30, UX-DR-16/27/28/29)
- Epic: `spec-8-6-sfx-haptics.md` (intent/boundaries/I-O matrix 8 rows, 4 ACs, Code Map, Tasks & Acceptance)
- Architecture: `triade/src/feel/feel.ts` (frozen `FEEL_PRESETS` + `REDUCED_PRESET` + `presetFor`/`reducedPresetFor`) / `triade/src/feel/haptics.ts` (FR-30 never gate) — data-not-code tuning seam
- Tech Spec: `triade/src/feel/sfx.ts` 152 LOC + `triade/src/services/assets/assetManifest.ts` 49 LOC (preload degrade)
- Tests: `triade/__tests__/feel/sfx.test.ts` 136 LOC (11 it, 2 suites) + `triade/__tests__/feel/feel.test.ts` 12 + existing feel 8-5 bench `feel.bench.test.ts`

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date}
- [ ] QA Lead: {name} Date: {date}

**Comments:**

---

**Generated by**: BMad TEA Agent — Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design`
**Version**: 6 (BMad v6) — Epic-Level single-story `8-6-sfx-haptics`
**Execution mode**: sequential (auto-resolved; subagent/agent-team probed, no capability — deterministic fallback sequential)
