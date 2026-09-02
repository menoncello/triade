---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-01'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-3-screen-shake.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/shake.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/__tests__/feel/shake.test.ts'
  - 'triade/App.tsx'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 8 / Story 8-3 — Screen Shake (Directional, FeelPreset-Driven, Capped)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `8-3-screen-shake`
**Scope:** Targeted test design for the working-tree delta of story 8-3

> **Delta under assessment:** Commit `721bf3a` (`feat(8-3): directional screen shake scaled by FeelPreset (S8.3)`) — 1 commit ahead of `e4629cd` (baseline). The current uncommitted diff is metadata-only (`spec-8-3-screen-shake.md` `final_revision` bump `9e93453→721bf3a` + `sprint-status.yaml` `8-3-screen-shake: backlog→done`); the assessed production change is:
> - `triade/src/feel/shake.ts` (new, 81 LOC) — pure helpers `shakeMsFor` / `shakeAmplitudeFor` / `directionVector` / `maxShakeForTrace` / `shouldShake` + `SHAKE_CAP=8` (host-testable, no RN/Reanimated/Skia imports, `Number.isFinite` + `try/catch` never-throw, `maxShakeForTrace` skips non-finite `entry.value`)
> - `triade/src/feel/feel.ts` (1 LOC comment + verified caps) — `PRESET_LIGHT shakeMs 2`, `PRESET_MEDIUM 2`, `PRESET_HEAVY 5`, `REDUCED_PRESET shakeMs 0`, all frozen, `presetFor`/`reducedPresetFor` unchanged, defensive comment that cap is enforced in helpers + `SHAKE_CAP`
> - `triade/src/render/GameBoard.tsx` (+101 −21 LOC) — new `direction?: Direction` prop, `shakeX`/`shakeY` shared values + `shakeStyle` `useAnimatedStyle` on `Animated.View` wrapper around `Canvas` (board only), imperative `withSequence(withTiming(amp*vec), withTiming(-amp*0.6*vec), withTiming(amp*0.3*vec), withTiming(0))` 130 ms total on swipe axis, `withTiming(0,130ms)` on orthogonal axis, bleed-cancel with `withTiming(0,20ms)` for slide-only/NOOP/reducedMotion/invalid dir, `useEffect` snap to 0 when `reducedMotion` toggles mid-animation, `maxShakeForTrace(trace, reducedMotion)` + `min(maxShake, SHAKE_CAP)` + `directionVector(direction)` inside `moveResult` effect gated on `moved && !reducedMotion && direction && amplitude>0`
> - `triade/App.tsx` (+7 LOC) — `lastDirectionRef: Direction|null`, set synchronously in `doMove(dir)` before `move()`, passed as `direction={lastDirectionRef.current ?? undefined}` into `GameBoard`, cleared on `handleRestart` and on lane change (`applyLaneSelection` needsReset path via `newGame`)
> - `triade/__tests__/feel/shake.test.ts` (new, 158 LOC) — 12 host unit tests (P0) covering medium 2 / heavy 5 / light 2 / cap 8 / reduced gating / NOOP+empty+spawn-only no-shake / multiple merges max wins / direction vectors / invalid dir zero / non-finite safety / presetFor alignment / shouldShake requires merge
> - `_bmad-output/implementation-artifacts/deferred-work.md` (+8 LOC) — 2 deferred lows: overlapping shake concurrency without `cancelAnimation`, board edge 5–8px clipping by parent `overflow:hidden`
> - No engine edits (`git diff --stat -- triade/src/engine` empty — verified), no `transitionPlan.ts` change (classification `merge` via `from.length===2 && !spawned` already correct), haptics stay independent (`triggerHapticsForTrace` not gated here)

---

## Executive Summary

**Scope:** Targeted test design for Epic 8, Story 8-3 Screen Shake. The story makes the board container shake directionally along the swipe axis on merges, driven data-first from `FeelPreset.shakeMs` (subtle `2` on medium `6`, stronger `5` on large `12+`, capped `8`), gated by `reducedMotion` and silent on NOOP/no-merge/slide-only. The shake is an imperative Reanimated worklet in `src/feel` mounted from `GameBoard`; amplitude/axis math is host-testable in pure `shake.ts`, while timing/feel is device-only. `SHAKE_CAP` is the single source for the cap (exported from `shake.ts`, used via `Math.min(maxShake, SHAKE_CAP)` in `GameBoard` — patch for double-cap divergence). Future story 8-5 (Reduced Motion umbrella) will rely on this same gate and the same trace contract (`from.length===2 && !spawned`), so a defect in `shouldShake`/`directionVector` or in `App.lastDirectionRef` propagation propagates forward.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (score ≥6): 3
- Critical categories: PERF (overlap-driven jank vs 60 FPS budget), BUS (FR-30 Reduced Motion gate — a11y/App Store compliance), TECH (direction wiring / staleness and trace→shake contract)

**Coverage Summary:**

- P0 scenarios: 9 (host unit, pure `feel`/`shake` layer, no device — already 12 `it()` cases passing, 757 pass / 4 expected RED from prior punch ATDD)
- P1 scenarios: 7 (engine-trace → `maxShakeForTrace` → `GameBoard` directional wiring + `App.lastDirectionRef` + chrome guard + Reduced Motion mid-flight + device smoke)
- P2/P3 scenarios: 8 (perf micro-bench, chrome/clip static scan, cleanup bench, overlapping-timing exploratory)
- **Total effort**: ~11–23 hours (~1.5–3 days wall-clock with device access; host-only <0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Haptics `triggerHapticsForTrace` and 8-1 `haptic` mapping (light/medium/heavy)** | Story 8-1 already shipped `FeelPreset.haptic` + `haptics.ts`; 8-3 only reads `shakeMs` from the same preset. Haptics mapping itself unchanged and haptics stay independent under Reduced Motion (not gated here per spec "haptics stay independent (not gated here, S8.1)"). | 8-1 test design + `feel.test.ts` + `haptics` suite remain the gate; 8-3 asserts `shake.ts` never gates haptics and that `reducedMotion` does not suppress `triggerHapticsForTrace` (host + device checklist). |
| **Punch visual 8-2 (overshoot/punch/particles/1536 glow)** | `AnimatedTile` overshoot/flash/glow/burst paths already shipped in 8-2; 8-3 only adds a sibling shake on the board container, keeping particle/punch paths intact. | 8-2 test design + `punch.test.ts` (8 cases) remain gate; 8-3 device smoke asserts punch still fires alongside shake (no mutual suppression). |
| **Bullet time (8.4), Reduced Motion umbrella rollout (8.5), SFX+haptics (8.6)** | No bullet time, no global `REDUCED_PRESET` rollout beyond `shakeMs 0`, no `expo-audio` SFX; `shakeMs` is the only feel field wired for shake. | 8.4–8.6 each require their own test design; this plan pins the shake gate so 8.5 has a clean contract to extend and asserts `particleBurst`/`overshootScale`/`flash` outside shake remain placeholder data for future tuning. |
| **Engine merge/spawn/score rules, `pendingSpawn` / `previewFor` / undo snapshot** | ADR-01 purity: engine is pure TS single source of truth, unchanged in this delta (byte-identical `triade/src/engine`). `transitionPlan.ts:classify` already returns `merge` correctly for `from.length===2 && !spawned`. No duplicate merge predicate outside engine. | Engine invariants pinned by existing 695+ tests + PR check `git diff --stat -- triade/src/engine` empty. This plan adds a "no new predicate outside engine" grep regression gate. |
| **RevenueCat / AdMob / IAP / consent / Crashlytics / Epic 10-11** | No monetization, telemetry, or privacy code touched. | Existing Epic 4 / Epic 10-11 suites remain the gate. |
| **Theming, VoiceOver contract (Epic 9), crash-free sessions** | No tokens, no labels, no navigation changes beyond `direction` + `reducedMotion` prop plumbing. | Epic 9 / 10 NFR gates unchanged. |
| **Reanimated/Skia native implementation itself** | Third-party native worklets (`withTiming`/`withSequence`, `Animated.View`, `Canvas`) treated as external. | Trust but verify via device smoke; no unit mock of Reanimated spring/timing physics beyond amplitude/axis host assertions. |
| **Web / PWA parity** | Target is Expo dev build on iOS (SDK 57, Reanimated 4, Skia). Web has no haptics and limited worklet parity. | Manual device-only validation for shake visuals; web excluded except "no throw" host check. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | PERF | **Overlapping shake concurrency without `cancelAnimation`.** `GameBoard` shake is `130 ms` total (`30+40+30+30` withSequence on swipe axis + `130 ms` flat on orthogonal). `EARLY_INPUT_MS≈84 ms` re-opens the `busy` gate, so a second swipe at `~90 ms` overwrites `shakeX`/`shakeY` `withSequence` without `cancelAnimation`. Truncated overlap / spring cancellation artefact, mild jank, violates "single shake per move, max wins" requirement which assumes serial shakes. Deferred as low in `deferred-work.md` but PERF risk for rapid combos (the most playful path). | 2 | 3 | **6** | Keep single-shake `maxShakeForTrace` max-wins semantics; add test that two rapid `moveResult` effects within 130 ms each compute `maxShake` independently (host). On device, rapid-swipe combo video (2 merges × heavy + medium) to confirm no freeze. Fix seam if needed: `cancelAnimation(shakeX/Y)` before new `withSequence` (one-line), keep 130 ms budget intact. Verify p99 stays <16.7 ms with shake lane. | FE | Before 8-4 (bullet time adds further main-thread cost) |
| R-002 | BUS | **FR-30 Reduced Motion non-compliance (shake should be smoothed/disabled while haptics+sound stay).** Shake correctly gates via `if (moveResult.moved && !reducedMotion && direction)` + `maxShakeForTrace(trace, reducedMotion)` returning 0 + `useEffect` snap `withTiming(0,20ms)` when `reducedMotion` toggles mid-shake. Risk is `App.tsx` wiring regression if `settings.reducedMotion` is memoised stale, if lane-switch `lastDirectionRef` reset is forgotten, or if future 8.5 refactors wrap shake+haptics in same guard (haptics must stay — FR-30/UX-DR-16). Silent violation → a11y / App Store review risk. Patch history shows Reduced Motion bleed was a triage fix this story. | 2 | 3 | **6** | Pin contract with (a) unit sweep: for every tier `shakeMsFor(v,true)===0 && shakeAmplitudeFor===0 && maxShakeForTrace(trace,true)===0 && shouldShake===false` (already in `shake.test.ts`), (b) regression that `App.tsx` passes `settings.reducedMotion` + `direction` into `GameBoard` (grep/snapshot), (c) comment `// FR-30: haptics stay — shake gated, haptics not` and a `grep -R reducedMotion triade/src/feel` gate that only allows `feel.ts:REDUCED_PRESET` + `shake.ts` helpers (not `haptics.ts`). Device: iOS Settings → Reduce Motion ON → 3/6/12 merges → flat board but haptics still felt. | FE lead | Immediate (add grep gate + comment this story; enforce in 8-5 review) |
| R-003 | TECH | **Direction wiring staleness / missing axis.** `App.lastDirectionRef` is set synchronously in `doMove(dir)` before `move()` and passed as `direction` prop; `GameBoard` derives `vec = directionVector(direction)` and only drives the matching axis (`vec.x!==0 → shakeX sequence`, `vec.y!==0 → shakeY sequence`, else zero both). Risk: lane switch without active match retaining stale direction until next swipe (noted as residual in spec), stale closure if `GameBoard` effect dep array misses `direction`, or `resolveSwipeDirection` → `Direction` rename breaking the string literal contract (`left/right/up/down` case-sensitive). Invalid dir → zero vector safety is correct but masks silent "shake never fires" regression. | 2 | 3 | **6** | Assert wiring: unit that `directionVector` is case-sensitive (`LEFT→0,0`) and that `App.doMove` sets `lastDirectionRef` *before* `move()` (code review seam). Integration host test that `GameBoard` effect deps include `direction` and that `moveResult.moved && direction===undefined` suppresses shake via `withTiming(0,20)`. Host sweep that left/right only moves `shakeX` and up/down only `shakeY` (axis isolation). Device smoke that swipe left vs up visibly moves on different axes (portrait+landscape). Clear direction on `handleRestart` + lane change already done — pin with test. | FE | Immediate |

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Trace contract mismatch / chrome guard leak.** `maxShakeForTrace` filters `!entry.spawned && from.length===2 && Number.isFinite(value)` and `GameBoard` wraps only `Canvas` in `Animated.View` (board only, never chrome). If engine ever emits a spawn with `from.length===2` or renames `spawned`, `classify`→`merge`→shake could mis-fire on spawns or silently stop; conversely wrapping too high in the view hierarchy would shake `Hud` preview card / score (`UX-DR-27` chrome rule). Review triage fixed NaN guard and double-cap, but predicate drift remains. | 2 | 2 | 4 | Contract test that enumerates *real* `MoveResult.trace` fixtures via `move(game, dir, rng)` (not hand-built stubs) and asserts `maxShakeForTrace` fires iff `from.length===2 && !spawned && finite` and that `type==='spawn'` entries never shake; assert `GameBoard` `Animated.View` is parent of `Canvas` only (snapshot) and that `Hud`/`PreviewCard` never receive `shakeStyle`. Keep `shake.ts` thin wrappers — no duplicate predicate. |
| R-005 | TECH | **NOOP / slide-only residual bleed.** Effective move with only slides (`moved:true` but no merge entries, `maxShake===0`) or NOOP (`moved:false`) must cancel any prior shake. Code now does explicit else branches `withTiming(0,20ms)` when `amplitude===0` or `moved===false`/`!direction`/`reducedMotion`, plus mid-animation snap on `reducedMotion` toggle. Risk: a new early-return or missed branch re-introduces the pre-patch bleed where a slide-only move after a heavy merge left `shakeX/Y` at non-zero for one frame. | 1 | 3 | 3 | Host test that `maxShakeForTrace(slideOnlyTrace)===0` and that `GameBoard` effect path for `moved:true && maxShake===0` calls `withTiming(0,20)` (seam or code review). Device: NOOP swipe (edges / no merge) → board flat, no throw. Keep triage patches as regression pins in `shake.test.ts` NOOP cases. |
| R-006 | TECH | **Cap drift: `FeelPreset.shakeMs` vs `SHAKE_CAP` divergence.** Heavy preset is `5` today; if tuned to `>8` or a future tier adds `shakeMs 9`, `presetFor` would return >8 but `shakeMsFor` must still clamp ≤8 (UX-DR-16). Before this story `GameBoard` hard-coded `8` diverged from `SHAKE_CAP` — fixed by exporting `SHAKE_CAP` and using `Math.min(maxShake, SHAKE_CAP)`. Risk without gate: scattered literals drift. | 1 | 3 | 3 | Sweep `allPresetValues()` × `shakeMsFor(v,false) <=8` and `shakeAmplitudeFor<=8` and `maxShakeForTrace<=8` (already in `shake.test.ts` P0-04). Static scan: `grep -R "8" triade/src/feel` outside `shake.ts:SHAKE_CAP` fails; lint that literals `2`/`5` only appear in `feel.ts` preset definitions. |
| R-007 | PERF / BUS | **Board edge clipping by parent `overflow:hidden`.** `GameBoard` parent `View width/height=width` + `App.boardWrap overflow:hidden` clips the `5–8px` `translateX/Y` at the container boundary, especially in landscape or after punchy shake on a full board. Structure correctly limits shake to `Animated.View` around `Canvas` only (so `Hud` chrome not clipped), but edge pixels still clip. Deferred as low cosmetic but visible on every heavy merge. | 2 | 2 | 4 | Device screenshot that heavy `5` shake at board corners does not visibly cut tiles / grid padding; if clipping observed, product decision: add `BOARD_PADDING` spare or set `boardWrap overflow:visible` with a safe bleed margin. No host test needed — device-only. Track as deferred-work entry (already filed). |
| R-008 | TECH | **Multiple merges in one move — "max wins, not stacked" invariant.** Spec I-O: trace with 2 merges (e.g. `3` and `12`) should fire a single shake at `maxShake=5`, not two stacked shakes. `maxShakeForTrace` correctly iterates and tracks `max`; risk is a future refactor that fires `shakeMsFor` per-merge inside `GameBoard.applyPlan` loop instead of once per `moveResult` effect, stacking two `withSequence` calls. | 1 | 2 | 2 | Unit pin that `maxShakeForTrace([3→2, 12→5])===5` and `maxShakeForTrace([6,6])===2` and spawned merges ignored (already in `shake.test.ts` P0-07). Host integration that one `moveResult` with 2 merges produces exactly one `withSequence` (count mount or assert effect called once per `moveResult`, not per `plan` entry). |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | TECH | **Non-finite / negative shake values fallback masks corruption.** `presetFor(NaN)`→light 2, `shakeMsFor(NaN,false)`→2 is intended "never throw", but a corrupted `trace[].value=NaN/Infinity/-5` would still shake instead of surfacing a data bug (same class as 8-2 R-009). `maxShakeForTrace` now skips non-finite, but `shakeMsFor(NaN)` still returns 2 via `presetFor` fallback — subtle inconsistency fixed by `Number.isFinite` guard in `maxShakeForTrace` but not in `shakeMsFor`. | 1 | 1 | 1 | Monitor — keep never-throw fallback but add `__DEV__` warning if `value<3` or non-finite reaches `shakeMsFor` outside trace path; not a gate. Existing test `non-finite never throw` covers host. |
| R-010 | TECH | **`reducedPresetFor` identity vs copy semantics.** `presetFor` returns frozen canonical `PRESET_*` (memo-safe); `reducedPresetFor` returns fresh copy `{ ...REDUCED_PRESET, haptic }`. Consumer memoising by identity would break in 8-5 if they reuse `reducedPresetFor` for shake gating. `shake.ts` correctly uses `presetFor` + explicit `reducedMotion` flag rather than `reducedPresetFor`, so not coupled today. | 1 | 2 | 2 | Monitor — document: `presetFor` identity-stable, `reducedPresetFor` copy; `shake.ts` intentionally avoids `reducedPresetFor` to keep haptics-independent gating explicit. No fix this story. |

### Risk Category Legend

- **TECH**: Technical/Architecture (contracts, purity, integration, animation orchestration)
- **SEC**: Security — none this story (no auth/data exposure)
- **PERF**: Performance (frame budget, main-thread worklet coalescence)
- **DATA**: Data Integrity — none in scope (engine untouched)
- **BUS**: Business Impact (accessibility, App Store compliance, visual chrome rule)
- **OPS**: Operations (dependencies, builds, OTA, CI gating) — none high this story; `reanimated`/`skia` already pinned in 8-1/8-2

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

8-3 touches visual NFR surface: **60 FPS shake budget**, **reliability/never-throw**, **maintainability (single preset source + SHAKE_CAP)**, **accessibility FR-30 + motion cap**, and **offline/installability** unchanged.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Performance — 60 FPS / frame budget | NFR-1 + NFR-11: engine <2 ms/turn, frame logic worst-case <8 ms, device p99 <16.7 ms with shake layer (`130 ms` withSequence `30+40+30+30` on board container) concurrent with Skia Canvas + Reanimated main-thread worklets + 8-2 punch overshoot+particles if two heavies stack. `EARLY_INPUT_MS≈84 ms` budget respected; shake must not push p99. Cap `SHAKE_CAP 8` is max pixel displacement. | R-001, R-007, R-008 | Host micro-benchmark: sweep `allPresetValues()` × `shakeMsFor`/`maxShakeForTrace`/`directionVector` for allocation; measure no per-merge `withSequence` stacking. Device lane: `useFrameRateBaseline` stats after 2-min play with 10+ merges including at least one `6` (2px) and one `12+` (5px) shake, plus a rapid-swipe pair within 130 ms window. Video capture for overlap artefact. | CI `npm test` timing + benchmark lane output if present (otherwise `npm test` timing); `useFrameRateBaseline` log `fps`/`p99Ms`/`frames`; `npx tsc --noEmit` clean. |
| Reliability — never throw | Engine-never-throws extended to feel+shake: `presetFor`/`shakeMsFor`/`shakeAmplitudeFor`/`maxShakeForTrace`/`shouldShake`/`directionVector` never throw on any input (`null` trace, `NaN`, `Infinity`, `-5`, `undefined` dir, empty `from`). `GameBoard` effect silent no-op on empty plan (NOOP), on `direction===undefined`, on unmount mid `withSequence`. | R-009, R-004, R-005 | Unit negative-path sweeps: `NaN`, `Infinity`, `-1`, `null`/`undefined` value, empty trace, trace with only `spawned:true` or `from.length!==2`, `directionVector(null/""/"LEFT"/123)`; `GameBoard` unmount during pending `withSequence`/`withTiming`. | `triade/__tests__/feel/shake.test.ts` 12 cases (includes `non-finite never throw`, `invalid dir zero`, `NOOP/empty no shake`) + `presetFor` fallback sweep. |
| Maintainability | `FeelPreset` is the single access point including `shakeMs` (no scattered literals), `shake.ts` thin wrappers over `presetFor`; `FEEL_PRESETS` frozen; `SHAKE_CAP` is the single cap exported from `shake.ts` and consumed via `Math.min(maxShake, SHAKE_CAP)` in `GameBoard` (no hard-coded `8` in render). Future stories 8.5 reuse same preset without rework. | R-006, R-004 | Static-assert: grep for literal `shakeMs:` outside `src/feel/feel.ts` fails; grep for literal `8` outside `shake.ts` `SHAKE_CAP` fails; `shakeMsFor` delegates to `presetFor` (no duplicate tier branching). | Source scan + identity test `presetFor(3).shakeMs===2` + `shakeMsFor(v)===min(presetFor(v).shakeMs,8)` sweep. |
| Accessibility / Compliance — FR-30 + cap + chrome rule | Reduced Motion gates *all* shake visuals (`shakeMsFor(v,true)===0`, `maxShakeForTrace(trace,true)===0`, `shouldShake===false`, board `shakeX/Y` snapped `0` even mid-animation) while haptics+sound stay (`haptic` preserved is not gated here — 8-3 never touches `haptics.ts`). Chrome rule UX-DR-27: `Animated.View` wraps `Canvas` only — `Hud` preview card and score never shake. Cap `≤8` prevents motion-sickness excessive displacement. | R-002, R-004, R-007 | Unit: `shakeMsFor(v,true)===0 && shakeAmplitudeFor===0 && maxShakeForTrace===0 && shouldShake===false` for all tiers (already) + `directionVector` invalid→`0,0` safety. Host: `GameBoard` snapshot asserts `direction===undefined` → no `withSequence`, and `Animated.View` is direct parent of `Canvas` only. Device: enable iOS Settings → Reduce Motion ON → perform `3`/`6`/`12+` merges → confirm flat board (no translate) while haptics still felt; confirm `Hud` preview card never translates even when board shakes. | `shake.test.ts` Reduced Motion loop + `GameBoard` render inspection; device checklist signed in PR. |
| Offline / Installability | Installable + offline (NFR-2, NFR-6) unchanged; no new CDN/network dependency (`reanimated`/`skia` already bundled from 8-2). | — | App runs offline with shake (device airplane mode) — no network fetch for shake logic (pure helpers). | Manual airplane-mode device pass (deferred to same device smoke as performance). |

**Unknown thresholds:** None material for 8-3. If CI benchmark lane is absent, record actual measured `p99Ms` as baseline rather than inventing a threshold (mark UNKNOWN only if no device data collected). `SHAKE_CAP 8` and `130 ms` total duration are pinned by this plan — tolerances come from `src/feel/shake.ts` + `GameBoard.tsx` constants, not from PRD.

---

## Entry Criteria

- [ ] Spec `spec-8-3-screen-shake.md` and `epic-8-context.md` are the reviewed revisions (`baseline_revision e4629cd` → `final_revision 721bf3a` pinned in spec).
- [ ] `triade/src/engine/**` byte-identical to baseline (ADR-01 purity gate) — `git diff --stat -- triade/src/engine` empty.
- [ ] Branch is on SDK 57 pinned versions (expo ~57.0.11, Reanimated 4, Skia, RNGH — existing matrix; `expo-haptics` best-effort via `void import()` as in 8-1).
- [ ] Host test runner `npm test` green at 757/761 baseline — 4 pre-existing RED from punch ATDD accepted (`R-001` tutorial dedup + `R-006` expo-haptics + `R-002`/`R-007` burst cleanup — not caused by 8-3, documented in spec Auto Run Result).
- [ ] `npx tsc --noEmit` clean (no new `@ts-ignore` for `shake.ts`; `shake.ts` is strictly typed with `Direction`/`TraceEntry` imports).
- [ ] Feature is behind no flag — shake is immediate on trace merge entry (`from.length===2 && !spawned`) gated only by `reducedMotion` + `direction` + cap.

## Exit Criteria

- [ ] All P0 tests passing (100%) — includes `shake.test.ts` 12 cases + `feel.test.ts` 12 cases (engine purity preserved) + `punch.test.ts` 8 cases.
- [ ] All P1 tests passing or failures triaged with approved waivers (host integration with real engine fixtures + `App.lastDirectionRef` wiring + one device smoke).
- [ ] No open bugs with severity S0/S1 against shake / chrome guard / Reduced Motion gate / direction axis.
- [ ] `triade/src/engine/**` still byte-identical post-merge (CI check `git diff --stat -- triade/src/engine` empty) and no duplicate merge predicate outside engine+feel gateway (`grep -R "from.length===2" --include="*.ts" --include="*.tsx" src/` hits only `src/engine` + `src/feel/shake.ts` + `src/render/transitionPlan.ts` — 3 sanctioned sites).
- [ ] Device smoke pass (iOS dev build, at least one real-device run: `6`→subtle 2px along swipe axis, `12+`→stronger 5px capped `8`, each in portrait+landscape; swipe `left/right` shakes on X only, `up/down` on Y only; toggle Reduced Motion → all shake flat while haptics still felt; NOOP swipe → no shake; preview card & score never shake — sign-off in PR description).
- [ ] `shakeMs` / `SHAKE_CAP` still single-sourced via `presetFor` + `SHAKE_CAP` export (no scattered `8`/`2`/`5` literals outside `src/feel/feel.ts` + `shake.ts` `SHAKE_CAP`) — static scan gate.
- [ ] Coverage target: all 8 rows in spec I/O & Edge-Case Matrix covered by at least one automated test (actual: `shake.test.ts` covers medium 2 / large 5 / cap 8 / Reduced Motion / NOOP / multiple merges max / direction vectors / chrome guard; gap is `GameBoard` directional withSequence wiring — covered by host integration P1).

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE / TEA | Owns `shake.ts` pure helpers + `GameBoard` shake worklet, host unit sweeps, engine-trace fixtures, device smoke sign-off |
| — | QA (if staffed) | Reviews FR-30 gate + chrome rule, validates device p99, owns deferred-work triage for overlap/clipping |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` denote priority/risk. Execution timing (PR vs nightly vs device-manual) is defined under Execution Strategy.

### P0 (Critical)

**Criteria**: Blocks core shake contract + high risk (≥6) or no workaround + pure/cheap host execution.

| # | Requirement / AC | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | AC subtle shake + data-not-code | `presetFor(6).shakeMs===2` and `shakeMsFor(6,false)===2 && shakeAmplitudeFor(6,false)===2` via `presetFor` min-capped, not hard-coded | Unit | R-006 | 1 | DEV (done) | Existing `shake.test.ts` case 1 — light preset wrapper. |
| P0-02 | AC stronger shake heavy | Sweep `12,24,48,96,192,384,768,1536,3072,6144,12288` all map to `5` via `shakeMsFor`/`shakeAmplitudeFor` | Unit | R-006 | 1 (loop) | DEV (done) | Catches heavy-collapse regression; cap 8 not hit at 5. |
| P0-03 | AC light 3 + cap enforcement | `shakeMsFor(3,false)===2` and for every tier `shakeMsFor(v) <=8 && shakeAmplitudeFor<=8 && maxShakeForTrace([merge],false)<=8`; hypothetical `>8` still clamped via `SHAKE_CAP` | Unit | R-006 | 1 (loop) | DEV (done) | `shake.test.ts` cap 8 enforcement; `999999` also ≤8. |
| P0-04 | AC Reduced Motion gate (FR-30) | For every tier `3,6,12,24,768,1536`: `shakeMsFor(v,true)===0 && shakeAmplitudeFor===0 && maxShakeForTrace(trace,true)===0 && shouldShake(trace,true)===false` | Unit | R-002 | 2 | DEV (done) | Existing Reduced Motion loop + `shouldShake` gate; shake never touches haptics. |
| P0-05 | AC NOOP / no-merge silent | `shouldShake([],false)===false && shouldShake(null)===false && maxShakeForTrace([],false)===0`; trace with only slides (`from.length===1`) or spawns (`spawned:true`) → `shouldShake===false && maxShake===0`; single `6` merge → `true/2` | Unit | R-005, R-004 | 2 | DEV (done) | Silent no-op contract — board visually unchanged. |
| P0-06 | AC multiple merges max wins (not stacked) | `[3→2, 12→5]` trace → `maxShake===5`; `[6,6]→2`; `[3,6]→2`; spawned merge with `spawned:true` ignored → max from remaining real merge | Unit | R-008 | 1 | DEV (done) | Sequential max; data-layer multi-merge pin. |
| P0-07 | AC direction vectors | `directionVector('left')===(-1,0) && right (1,0) && up (0,-1) && down (0,1)` | Unit | R-003 | 1 | DEV (done) | Axis contract; sign correct per UX-DR-16. |
| P0-08 | AC invalid dir safety | `directionVector(undefined/null/""/"invalid"/"LEFT"/123)=== (0,0)` never throws | Unit | R-003, R-009 | 1 | DEV (done) | Zero vector safety — suppresses shake instead of throwing. |
| P0-09 | AC non-finite never throw + data alignment | `shakeMsFor(NaN/Infinity/undefined)` never throws and remains finite; `maxShakeForTrace([{value:NaN, from:[2], spawned:false}])` never throws and returns `0` (skipped); `shakeMsFor` aligns with `min(presetFor(v).shakeMs,8)` for all tiers | Unit | R-009 | 2 | DEV (done) | Engine-never-throws extension. Note: `shakeMsFor(NaN)`→2 via `presetFor` fallback is expected; trace-level `Number.isFinite` guard in `maxShakeForTrace` is the gate for NaN trace corruption. |

**Total P0**: 9 groups (12 `it()` cases in file), host-only, <5 s.

### P1 (High)

**Criteria**: Validates the declarative trace→board→shake wiring and the native boundary; medium/high risk (3–4) and common workflows. Requires either engine fixtures (host) or a real device.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | AC trace→shake contract | `maxShakeForTrace` over a **real engine trace fixture** (via `move(game, dir, rng)` seeded `mulberry32`) correctly identifies a merge entry iff `from.length===2 && !spawned && finite value` and returns `min(presetFor(maxValue).shakeMs,8)` as max; `shouldShake` mirrors | Integration (host, engine fixture) | R-004 | 2 (1 single-merge fixture 1+2→3, 1 multi-merge fixture with 2 merges) | DEV | Pull fixtures via real `move()`; eliminates stub drift. Assert spawned entries with `from.length===2` never count. |
| P1-02 | AC `App.lastDirectionRef` wiring | `App.doMove('left')` sets `lastDirectionRef.current==='left'` *before* `move()` is called; `GameBoard` receives `direction` prop synchronously for that `moveResult`; `handleRestart` and lane-switch `needsReset` clear `lastDirectionRef` → next `moveResult` with no direction suppresses shake via `withTiming(0,20)` | Integration (host, App seam) | R-003 | 2 | DEV | Verify via code inspection + host test that `lastDirectionRef` is set synchronously (not in `setState` callback); lane switch without active match retains stale dir is low but documented. |
| P1-03 | AC directional axis mapping | `GameBoard` effect when `maxShake>0 && vec.x!==0` drives `shakeX` `withSequence(amp*vec.x→-amp*0.6*vec.x→amp*0.3*vec.x→0)` and pins `shakeY` `0`; when `vec.y!==0` drives `shakeY` sequence and pins `shakeX`; when `vec===0,0` drives both `0`. Assert axis isolation per direction literal. | Integration (host, render seam) | R-003, R-007 | 2 (host state inspection + optional shallow render) | DEV | Host check via `directionVector` + `GameBoard` effect branching; Reanimated timing itself is device-only. |
| P1-04 | AC Reduced Motion mid-animation snap | Toggling `reducedMotion` `false→true` during an in-flight `130 ms` shake snaps both `shakeX/Y` `withTiming(0,20ms)` via the `useEffect([reducedMotion])` branch; `GameBoard` never leaves residual offset | Integration (host lifecycle + device) | R-002, R-005 | 1 | DEV | Wrap `GameBoard` in `act` + flip `reducedMotion` prop mid-`withSequence`; assert snap branch. Device: start heavy shake then toggle iOS Reduce Motion via control center (if live) or app Settings toggle → board snaps flat. |
| P1-05 | AC chrome guard never on chrome | `GameBoard` `Animated.View` is direct parent of `Canvas` only; `Hud` `PreviewCard` / score `Text` siblings are outside the animated wrapper (snapshot asserts `shakeStyle` not on `Hud`). Spawn-only or NOOP traces create 0 shake. | Integration (host, component seam) | R-004 | 1 | DEV | Assert via component tree snapshot that `PreviewCard` subtree never receives `shakeStyle` transform. |
| P1-06 | AC slide-only / NOOP bleed cancel | `moveResult.moved===false` or `maxShake===0` with `moved:true` (slide-only) after a heavy merge cancels prior shake via `withTiming(0,20)` on both axes; assert no residual `shakeX/Y≠0` after the else branch. | Integration (host) | R-005 | 1 | DEV | Requires exposing `shakeX/Y` values or asserting effect branch taken; if not seam-testable, document code-review waiver + device check. |
| P1-07 | Device smoke (real iPhone dev build) | In portrait+landscape, swipe `left/right` for `6` (2px subtle, 1 oscillation feel) and `12+` (5px stronger, 2 oscillations) and `3072` cap edge; swipe `up/down` for Y axis; toggle Reduced Motion ON → repeat each heavy → flat board while haptics still felt; NOOP swipe (no merge) → flat; preview card never shakes. | Device smoke | R-001, R-002, R-003, R-005, R-007 | 1 (manual checklist, ~15 min) | Owner is PR author; sign-off checkbox in PR description ("device shake smoke: left/right X, up/down Y, 6/12+/cap + Reduced Motion ON flat + NOOP + chrome"). Use dev build; airplane mode included. |

**Total P1**: ~10 logical assertions + 1 device pass, ~4–7 h to finalise fixtures + seam plus 15-min device pass.

### P2 (Medium)

**Criteria**: Secondary flows + low/medium risk (1–4) + perf/regression depth; narrowly scoped smoke.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | Overlap timing artefact | Two rapid `moveResult` effects within 130 ms (simulated swipe at `EARLY_INPUT_MS≈84 ms`) each compute `maxShake` independently but second `withSequence` overwrites first without `cancelAnimation` → truncated first shake. Assert truncation is the deferred-work behaviour, not a freeze. If `cancelAnimation` is added, second shake starts clean. | Unit (host, state machine + device video) | R-001 | 1 | DEV | If host seam unavailable, defer to device video but document waiver; fix seam would be `cancelAnimation(shakeX/Y)` before new `withSequence`. |
| P2-02 | Perf micro-bench | `shakeMsFor` + `maxShakeForTrace` + `directionVector` + `allPresetValues()` sweep completes <<1 ms host; no per-merge `withSequence` allocation spike beyond single shake per `moveResult`; `SHAKE_CAP` static. | Unit (bench) | R-001 | 1 | DEV | Lightweight `node --test` bench block (no external harness); measure 10k sweeps. |
| P2-03 | Cap + `SHAKE_CAP` static scan | Grep for `SHAKE_CAP` is single source; `Math.min(maxShake, SHAKE_CAP)` appears once in `GameBoard`; literal `8` outside `shake.ts` fails except `SHAKE_CAP=8` definition; `2`/`5` literals only in `feel.ts` preset defs. | Static | R-006 | 1 (lint/grep) | DEV | Prevents hard-coded cap divergence (the patched R). |
| P2-04 | Engine purity + duplicate predicate | `git diff --stat -- triade/src/engine` empty and `grep -R "from.length===2" src/` hits only `src/engine` + `src/feel/shake.ts` + `src/render/transitionPlan.ts` (3 sanctioned sites); `triade/src/feel/feel.ts` is the single access point for `shakeMs` literals. | Ops/CI (static) | R-004 | 1 (CI check) | CI | Single `bash` gate in PR. |
| P2-05 | Edge clipping static/device check | Grep that `GameBoard` parent `View style width/height=width` + `App.boardWrap overflow:hidden` is present; device screenshot that `5–8px` shake at board corners does not visibly clip tiles (or note clipping as accepted deferred cosmetic). | Static + Manual | R-007 | 1 | QA | Visual at board corners / in landscape; `overflow:hidden` vs `overflow:visible` product decision if clipping visible. |
| P2-06 | NOOP silent (complement to P0-05) | `result.moved===false` or trace with no merge entry → `planTileTransitions` returns `[]` or non-merge entries only, `maxShakeForTrace===0`, `shouldShake===false`, `GameBoard` schedules no `withSequence`. | Unit | — | 1 | DEV | Silent no-op contract — board visually unchanged beyond existing 8-2 particles. |

**Total P2**: ~6 checks.

### P3 (Low)

**Criteria**: Nice-to-have + exploratory + device feel tuning; not a gate.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Shake feel tuning | On device, manually rank `3` light vs `6` medium vs `12` heavy vs `cap 8` for perceived weight separation (2px vs 5px vs 8px) and `30+40+30+30` rhythm; capture notes for 8-4 bullet-time interaction. | Exploratory (manual) | 1 | UX/FE | Not pass/fail; feeds 8.4/8.5 tuning. |
| P3-02 | Clip / chrome guard snapshot | On device, capture video of heavy shake board vs `Hud` preview card side-by-side to prove `Animated.View` wraps `Canvas` only; note `overflow:hidden` clipping at extreme edge if present. | Manual | 1 | QA | Optional; web snapshot not applicable (Skia Canvas). |
| P3-03 | Rapid axis switch | On device, swipe `left` heavy then immediately `up` heavy within 130 ms window → verify second shake switches axis to Y (not continuing X) — confirms `shakeX`→`0` + `shakeY` sequence switch. | Manual | 1 | QA | Edge-case visual for overlap handling (R-001). |

**Total P3**: 3 exploratory checks.

---

## Execution Order

For this story execution is host-dominated; device/manual is the only expensive gate.

### Smoke (<1 min, host, every save)

- `npm test -- triade/__tests__/feel/shake.test.ts` — the 12 shake tests (P0) + `feel.test.ts` 12 + `punch.test.ts` 8.
- `npx tsc --noEmit` — type gate (no `@ts-ignore` for shake; safe).

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 cases (already in `shake.test.ts`) + new P1 host fixtures (P1-01..P1-06) + P2 static/bench checks.
- **CI purity + literal scan**: `git diff --stat -- triade/src/engine` empty + `grep -R "SHAKE_CAP\|shakeMs" src/feel` scan outside `feel.ts`/`shake.ts` fails, + `grep -R "from.length===2" src/` 3-site allowlist.
- **Static scan**: cap literal and chrome guard grep.

### Device gate (manual, ~15 min, before merge)

- **Device smoke** (real iPhone dev build): single lane, trigger merges for values `6` (subtle 2px X/Y) and `12+` (5px cap 8), each in left/right and up/down axes; enable Reduced Motion → repeat heavy (FR-30); NOOP swipe → flat; airplane mode → repeat. Rapid swipes during shake window → no freeze (R-001). Sign-off in PR description.
- **Cross-check**: 8-1/8-2 deferred REDs remain (4 pre-existing) — not re-verified unless 8-3 touched haptics/punch (it did not; shake co-exists).

### Nightly/weekly — not required for 8-3

No nightly lane. Epic 8 device p99 `<16.7 ms` covering full feel preset (shake + punch + bullet time) is the Epic-level nightly lane when 8.6 lands. 8-3 shake 130 ms alone does not justify a nightly perf harness.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node --test` parallelisation); defer only real-device shake feel checks because they require Skia + Reanimated worklets and a Taptic-capable device.

- **PR**: All functional host tests (P0 + P1 host fixtures + P2 static/bench). No infrastructure overhead — `node --test` + `tsc` is the only runner. `tea_use_playwright_utils` is `true` in config but not required for this pure-RN story (no Playwright needed; no `page.goto` flows — a React Native shake story, not a web Playwright flow).
- **Pre-merge device**: One manual iPhone pass (P1-07 plus exploratory P3). Owner is the PR author; sign-off is a checkbox in the PR description ("device shake smoke: left/right X / up/down Y, 6/12+/cap + Reduced Motion ON flat + NOOP + chrome + rapid-overlap check").
- **Nightly/weekly**: None for 8-3. Epic 8 device p99 covering the full feel preset (punch + shake + bullet time) is the Epic-level nightly lane when 8.6 exists.

No k6 / contract / perf harness is required for this delta (no network API, no backend, no contract).

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 5 groups (9 `it` assertions already written in 12 cases) | 0.1–0.25 | **~0.5–1 h** | Already done; review + sweep extension only. |
| P1 | 7 groups (fixtures + wiring + axis + mid-flight + chrome + bleed + device smoke) | 0.5–1.0 | **~3.5–7 h** | Fixtures from real engine traces (1.5 h) + `GameBoard` seam/inspection + `App.lastDirectionRef` wiring (1–2 h) + device smoke (0.25 h). |
| P2 | 6 checks (overlap + bench + cap scan + purity + clipping + NOOP) | 0.3–0.7 | **~1.8–4.2 h** | Overlap timing + micro-bench + two grep gates + clipping device screenshot. |
| P3 | 3 exploratory (tuning + chrome snapshot + axis switch) | 0.2–0.5 | **~0.6–1.5 h** | Manual only, not a gate; optional. |
| **Total** | **~22 logical checks** | **—** | **~6–14 h** | **~0.8–1.8 days** wall-clock single dev; with device wait **~11–23 h** elapsed including fixtures review + one device pass. |

- P0 host verification on change: <5 s.
- PR gate (host): <15 min end-to-end.
- Device smoke: ~15 min per pass; one pass required before merge.
- No nightly infra cost.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures; P2-01 overlap waiver to device-only allowed — must be documented)
- **P2/P3 pass rate**: ≥90% (informational; exploratory P3 not a gate)
- **High-risk mitigations**: 100% complete or approved waivers (R-001 device overlap trace, R-002 Reduced Motion host+device pin, R-003 axis wiring)

### Coverage Targets

- **Critical shake paths (subtle 2 / strong 5 / cap 8 + Reduced Motion + NOOP + multi-merge max + direction vectors + chrome guard)**: ≥80% line/branch via host tests; remaining via device smoke
- **Business logic (`feel.ts`/`shake.ts`)**: 100% (all tiers + reduced + non-finite + `directionVector` safety)
- **Edge cases (NOOP, multi-merge, unmount, stale direction, invalid dir)**: ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (including `feel.test.ts` 12, `punch.test.ts` 8, `shake.test.ts` 12)
- [ ] No high-risk (≥6) items unmitigated or without approved waiver
- [ ] `triade/src/engine/**` byte-identical (CI gate)
- [ ] Reduced Motion gating verified both host (unit sweep) and device (Reduced Motion ON flat + haptics still felt)
- [ ] Single-cap invariant verified (`SHAKE_CAP` scan + unit cap loop ≤8)
- [ ] Direction axis verified: left/right only X, up/down only Y, invalid → 0,0
- [ ] `npx tsc --noEmit` clean
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (NFR-1 p99 not yet measured on this story — waiver allowed)

---

## Mitigation Plans

### R-001: Overlapping shake concurrency without `cancelAnimation` (Score: 6)

**Mitigation Strategy:**
1. Keep `maxShakeForTrace` max-wins semantics — one shake per `moveResult` regardless of `plan.length`.
2. Add host test that two rapid `moveResult` effects within 130 ms correctly compute `maxShake` independently and that the second `withSequence` overwrites the first (deferred-work accepted behaviour).
3. Device video that rapid swipes (heavy 12 then medium 6 within 90 ms) show truncated overlap but no freeze or dropped `busy` gate.
4. If p99 regression observed, add `cancelAnimation(shakeX)`/`cancelAnimation(shakeY)` before each new `withSequence` (one-line fix, keeps 130 ms budget).

**Owner:** FE
**Timeline:** Before 8-4 (bullet time adds further main-thread cost)
**Status:** Planned — deferred-work entry filed; P0 host pin done, overlap device trace pending
**Verification:** `shake.test.ts` multi-merge max test + CI timing + `useFrameRateBaseline` log (`fps`/`p99Ms`/`frames`) attached to PR + optional `cancelAnimation` diff.

### R-002: FR-30 Reduced Motion non-compliance (Score: 6)

**Mitigation Strategy:**
1. Keep `shake.ts` helpers returning `0/false` when `reducedMotion===true` for all tiers (unit loop) and `GameBoard` `useEffect` snap `withTiming(0,20)` when `reducedMotion` toggles.
2. `App.tsx` must pass `settings.reducedMotion` + `direction` into `GameBoard`; add a snapshot/grep regression that the props are wired and that haptics import is not gated by `reducedMotion`.
3. Add comment `// FR-30: shake gated — haptics stay` and a grep gate: `rg -n "reducedMotion" triade/src/feel/` hits only `feel.ts:REDUCED_PRESET` + `shake.ts`, never `haptics.ts`.
4. Device pass with iOS Settings → Accessibility → Motion → Reduce Motion ON → verify flat shake but haptics still felt (FR-30).

**Owner:** FE lead
**Timeline:** Immediate (add lint gate + comment this story; enforce in 8-5 review)
**Status:** Planned — P0 Reduced Motion loop done, grep gate + device pass pending
**Verification:** `shake.test.ts` Reduced Motion loop + grep gate green + device checklist signed in PR.

### R-003: Direction wiring staleness / missing axis (Score: 6)

**Mitigation Strategy:**
1. Pin `directionVector` contract: case-sensitive `left/right/up/down` only, else `0,0` (unit).
2. Verify `App.doMove` sets `lastDirectionRef` synchronously before `move()` and `GameBoard` effect deps include `direction` (code review seam); clear on `handleRestart` + lane change already done.
3. Host test that `direction===undefined` suppresses `withSequence` (else branch `withTiming(0,20)`) and that left/right only drives `shakeX` while up/down only drives `shakeY`.
4. Device smoke that swipe left/right visibly shakes on X and swipe up/down on Y (portrait+landscape), and that stale direction after lane switch is overwritten by next swipe.

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned — `shake.test.ts` vector cases done, `App` wiring + `GameBoard` axis seam pending integration host test
**Verification:** Host state inspection + PR diff review of `lastDirectionRef` sync + device video checklist.

---

## Assumptions and Dependencies

### Assumptions

1. SDK 57 + Reanimated 4 + Skia are pinned and the dev build includes the Reanimated Babel plugin (worklets compile) — if the plugin is missing, shake `withSequence`/`withTiming` silently degrades (assume present, verified by `npx tsc` + prior 8-2).
2. `src/engine` is the single source of truth for merge classification via `from.length===2 && !spawned`; no caller duplicates that predicate beyond `shake.ts`/`transitionPlan.ts` (checked by grep gate).
3. `lastDirectionRef` is stable within a `GameBoard` render and the `EARLY_INPUT_MS≈84 ms` gate is the only re-plan trigger; rapid-swipe overlap at `~90 ms` before `130 ms` shake completes is the only concurrency seam (deferred).
4. Device p99 baseline will be collected during the Epic 8 device lane (deferring full `nfr-assess` for NFR-1 is acceptable this story — same waiver as 8-2).
5. Four pre-existing RED from 8-1/8-2 remain accepted and do not block 8-3 — 8-3 does not touch haptics or punch paths beyond co-existing on the same board.
6. `Animated.View` burst/punch overlays (`position:absolute` + `pointerEvents:none`) do not compete with shake `Animated.View` for layout; `shakeX/Y` shared values are orthogonal to tile `x/y` shared values inside `AnimatedTile`.

### Dependencies

1. `triade/src/engine/core/*` — unchanged; `line.ts` contract for `TraceEntry` required for P1 fixtures (available; deterministic `mulberry32` seeded runs).
2. `src/services/storage/settingsStore.ts` + `schema.ts` — `Settings.reducedMotion` and `DEFAULT_SETTINGS` required for App wiring (available).
3. `triade/src/ui/Hud.tsx` / `PreviewCard.tsx` + `src/game/preview.ts` — chrome rule dependency: preview card must stay outside shake wrapper (available; structure verified).
4. Real iPhone dev build (Expo dev client) with Skia available — required for P1-07 device smoke (requires device access, ~15 min).
5. CI runner with `node --test` and `npx tsc` — host gates (available).

### Risks to Plan

- **Risk**: Host seam for `GameBoard` `shakeX/Y` + `Animated.View` `shakeStyle` not inspectable without a seam → P1-03..P1-06 remain manual-only / code-review-gated.
  - **Impact**: Reduced host automation coverage for wiring; relies on device smoke for axis confidence.
  - **Contingency**: Add a thin seam (`export function deriveShakeAxis(...)` or `__TEST__` accessor for `shakeStyle`) or replicate axis deduction in a host-only helper; document waiver in PR if seam not added this story.
- **Risk**: `boardWrap overflow:hidden` clipping at `8px` edge is visible on heavy shake in landscape.
  - **Impact**: Cosmetic polish hit on every heavy merge (P2/R-007).
  - **Contingency**: Product decision: bump `BOARD_PADDING` by `8px` or set `boardWrap overflow:visible` with a safe bleed margin; defer to deferred-work entry already filed.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **Engine (`src/engine`)** | No direct impact (unchanged); `planTileTransitions` already maps `merge` correctly for shake, same predicate as punch/haptics. | Existing 695+ engine tests must remain green; `git diff --stat -- triade/src/engine` empty gate. |
| **Haptics (`src/feel/haptics.ts`, `shake.ts` independence)** | Indirect: shares `FeelPreset`/`presetFor` with shake but logic untouched; `triggerHapticsForTrace` fire-and-forget path not gated by shake's `reducedMotion`. | `feel.test.ts` 12 + `shake.test.ts` 12 must remain green; assert `haptics.ts` never imports `reducedMotion`. |
| **Rendering (`src/render/GameBoard.tsx`, `transitionPlan.ts`, `punch` coexistence)** | Primary change: `direction` prop, `shakeX/Y` + `Animated.View` wrapper, directional `withSequence` 130 ms. T3.4 early-input timing (`EARLY_INPUT_MS`) now interacts with shake tail. Punch `isPunch`/`BurstView`/`hasGlow` paths must keep working alongside shake (no mutual suppression). | Existing board/transitionPlan tests + `punch.test.ts` must pass; verify `applyPlan` slide/merge/spawn paths unchanged for non-merge tiles and that punch burst still mounts when board shakes. |
| **Hud / Preview card (`src/ui/Hud.tsx`, `PreviewCard.tsx`)** | Must remain chrome-free; `Hud` receives `previews` via `previewFor(pendingSpawn)` and never receives shake. `Animated.View` wraps `Canvas` only, by construction chrome not shaken. | Preview invariant tests (Epic 7) must pass; manual check that `Hud` preview card and score `Text` never translate even when board does (chrome guard P1-05). |
| **App orchestration (`App.tsx`, `lastDirectionRef`)** | `doMove` wiring now captures `dir` synchronously; `handleRestart` + lane switch clears `lastDirectionRef`. `busyRef` gate unchanged; shake does not gate input. | Smoke: swipe → merge → haptics still fire (8-1) + punch still fires (8-2) + shake on correct axis; score/best/undo/continue flows unchanged; `GameOverOverlay` still `reducedMotion={false}` literal. |
| **Frame budget / device health** | Shake `withSequence` 130 ms adds main-thread worklet load concurrent with existing 60 FPS lane (punch overshoot+burst). Overlap case (R-001) at 84–90 ms re-plan is the stress point. | `useFrameRateBaseline` device lane (if present) + CI `npm test` timing unchanged; defer full Epic 8 p99 gate to 8.6 when SFX lands, but collect p99 for shake lane this story. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework (TECH/PERF/BUS/OPS categories, gate rules, mitigation ownership)
- `probability-impact.md` — Risk scoring methodology (1–3 scale, score ≥6 = high, threshold → action mapping)
- `test-levels-framework.md` — Test level selection (Unit for pure `shake.ts`, Integration for engine-trace→board seam, Device smoke for Reanimated worklets)
- `test-priorities-matrix.md` — P0–P3 prioritization (P0 blocks core + high risk + no workaround)
- `nfr-criteria.md` — NFR review criteria (performance 60 FPS, reliability never-throw, maintainability single-access, accessibility FR-30)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-8-3-screen-shake.md` (intent contract + I/O matrix, commit `721bf3a`)
- Epic context: `_bmad-output/implementation-artifacts/epic-8-context.md` (feel model, S8.1–8.6 deps)
- Architecture & ADR: `ADR-01` (engine purity), `ADR-04` (two-level benchmark), `ADR-06` (snapshot placement), `UX-DR-16`/`FR-30` (Reduced Motion + cap 8), `UX-DR-27` (chrome rule)
- Prior test designs: `_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md` and `test-design-epic-8-1-haptics.md` (single-preset precedent; patterned structure)
- Production code: `triade/src/feel/feel.ts`, `triade/src/feel/shake.ts`, `triade/src/render/GameBoard.tsx`, `triade/src/render/transitionPlan.ts`, `triade/App.tsx`
- Tests: `triade/__tests__/feel/shake.test.ts`, `triade/__tests__/feel/feel.test.ts`, `triade/__tests__/feel/punch.test.ts`
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md` (R-001 overlap, R-007 clipping)
- Config: `_bmad/tea/config.yaml` → `test_artifacts: _bmad-output/test-artifacts` / `test_design_output: _bmad-output/test-artifacts/test-design`

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design` (epic-level, steps-c 01→05)
**Version**: 4.0 (BMad v6) — risk-based, host-first; device smoke only where worklets require Skia/Reanimated
**Execution mode**: sequential (auto-resolved; subagent/agent-team not required — single-file output)

### Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P1 host fixtures (P1-01 trace-from-engine, P1-02 App direction seam) — separate workflow, not auto-run.
- Run `*automate` once 8-4 bullet time lands (adds worklet-layer coverage beyond shake).
- Run `*nfr-assess` after device p99 evidence exists for Epic 8 full feel preset (shake+punch p99).

---

## Approval

**Test Design Approved By:**

- [ ] Product / FE Lead: _____________ Date: ____
- [ ] UX (shake weight + Reduced Motion FR-30 sign-off): _____________ Date: ____
- [ ] QA / TEA: _____________ Date: ____

**Comments:**

---
