---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-01'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/punch.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/__tests__/feel/punch.test.ts'
  - 'triade/App.tsx'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 8 / Story 8-2 — Punch Visual (Overshoot + Flash + Particles + 1536 Glow)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `8-2-punch-visual`
**Scope:** Targeted test design for the working-tree delta of story 8-2

> **Delta under assessment:** Commit `ef72635` (`feat(feel): 8-2 punch visual — overshoot+flash+particles+1536 glow`) — 4 commits ahead of `origin/main`. The current uncommitted diff is metadata-only (`sprint-status.yaml` 8-2 `backlog`→`done`); the assessed production change is:
> - `triade/src/feel/feel.ts` — extended `FeelPreset` with `overshootScale: number` (1.08 light / 1.12 medium / 1.15 heavy; `REDUCED_PRESET` scale 1, flash false, particles 0, shake 0)
> - `triade/src/feel/punch.ts` (new) — pure helpers `punchScaleFor` / `punchDurationFor` / `shouldFlash` / `particleCountFor` / `shouldGlow` / `punchProfileFor` (host-testable, no RN/Reanimated imports)
> - `triade/src/render/GameBoard.tsx` — `reducedMotion?: boolean` prop, `TileDescriptor.isMerge`, declarative overshoot-and-snap (`withDelay`+`withSequence`+`withTiming`→`withSpring`) gated by `reducedMotion`, imperative flash overlay via `flashOpacity` shared value (heavy only), incandescent glow behind tile for `>=1536` (only glow in system), imperative particle bursts via `BurstView`/`ParticleDot` worklets (4/8/16 dots, 500 ms auto-clear), all gated by `isMerge` and `reducedMotion`
> - `triade/App.tsx` — wiring `settings.reducedMotion` into `GameBoard` (`GameOverOverlay` keeps `reducedMotion={false}` literal per Epic 9 forward-compat)
> - `triade/__tests__/feel/punch.test.ts` (new) — 8 host unit tests (730 total suite, 728 pass / 2 pre-existing RED from 8-1)
> - No engine edits (`git diff --stat -- triade/src/engine` empty — verified), no `transitionPlan.ts` change (classification `merge` already correct)

---

## Executive Summary

**Scope:** Targeted test design for Epic 8, Story 8-2 Punch Visual. The story makes the merged tile's punch declarative from the trace (`src/render` overshoot-and-snap + 1536+ glow) plus imperative worklets in `src/feel` for flash + particle burst scaled by value, gated by Reduced Motion and never firing on chrome (preview card / score). `FeelPreset` remains the single data source (`presetFor(value)` is the only preset entry point including `overshootScale`/`particleBurst`/`flash`; `punch.ts` is a thin pure wrapper). Future stories 8-3 (shake) and 8-5 (Reduced Motion umbrella) reuse the same preset and the same trace contract, so a defect in gating or in `isMerge` derivation propagates forward.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (score ≥6): 3
- Critical categories: PERF (burst-driven jank vs 60 FPS budget), TECH (early-input retarget & burst orphan), BUS (FR-30 Reduced Motion gate — accessibility / App Store compliance)

**Coverage Summary:**

- P0 scenarios: 8 (host unit + contract, pure `feel`/`punch` layer, no device)
- P1 scenarios: 6 (engine-trace → `isMerge` → `GameBoard` wiring + burst placement, host-integration + device smoke)
- P2/P3 scenarios: 8 (perf micro-bench, chrome guard static scan, burst cleanup, exploratory feel + snapshots)
- **Total effort**: ~12–22 hours (~2–3 days wall-clock with device access; host-only <0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Haptics data model & `triggerHapticsForTrace` (S8.1)** | Story 8-1 already shipped `FeelPreset`/`haptics.ts`; 8-2 only extends the preset with `overshootScale`. Haptics mapping itself unchanged. | 8-1 test design + `feel.test.ts` (12 cases) remain the gate; 8-2 asserts `reducedPresetFor` preserves `haptic` and that `punch.ts` does not gate haptics. |
| **Directional shake (8.3), bullet time (8.4), Reduced Motion umbrella (8.5), SFX+haptics (8.6)** | No `shakeMs` dispatch, no bullet time, no global `REDUCED_PRESET` rollout beyond punch; `shakeMs`/`particleBurst` outside punch remain placeholder data for future tuning. | 8.3–8.6 each require their own test design; this plan pins punch gating so 8.5 has a clean contract to extend. |
| **Engine merge/spawn/score rules, `pendingSpawn` / `previewFor` / undo snapshot** | ADR-01 purity: engine is pure TS single source of truth, unchanged in this delta (byte-identical). `transitionPlan.ts:classify` already returns `merge` correctly. | Engine invariants pinned by existing 695+ tests + PR checks. This plan asserts "no engine edits" and "no duplicate merge predicate outside engine" as a regression gate. |
| **RevenueCat / AdMob / IAP / consent / Crashlytics / Epic 10-11** | No monetization, telemetry, or privacy code touched. | Existing Epic 4 / Epic 10-11 suites remain the gate. |
| **Theming, a11y VoiceOver contract (Epic 9), crash-free sessions** | No tokens, no labels, no navigation changes beyond `reducedMotion` prop plumbing. `GameOverOverlay reducedMotion={false}` literal kept intentionally (Epic 9 forward-compat). | Epic 9 / 10 NFR gates unchanged. |
| **Reanimated/Skia native implementation itself** | Third-party native worklets (`withTiming`/`withSequence`/`withSpring`, `RoundedRect`) treated as external. | Trust but verify via device smoke; no unit mock of Reanimated spring physics. |
| **Web / PWA parity** | Target is Expo dev build on iOS (SDK 57, Reanimated 4, Skia). Web has no haptics and limited worklet parity. | Manual device-only validation for punch visuals; web excluded except "no throw" host check. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | PERF | **Burst-driven jank vs 60 FPS budget.** Each merge spawns up to 16 `ParticleDot` (`Animated.View` + 4 shared values each) with staggered `withDelay`/`withTiming` worklets; a 2-merge move spawns 32 dots + 2 overshoot sequences + optional glow/flash. Combined with Skia Canvas + Reanimated main-thread worklets this may exceed NFR-1 p99 16.7 ms on mid-tier iPhones, especially under early-input re-plan (tiles retarget mid-animation). De-optimised dot geometry or failure to batch burst mount could push frame budget. | 2 | 3 | **6** | Host micro-bench: sweep `allPresetValues()` × `punchProfileFor` for allocation; add a device benchmark lane that records `useFrameRateBaseline` stats after 2-min play with 10+ merges including a 12+ heavy. Cap `overshootScale ≤1.2` and `particleBurst ∈ {0,4,8,16}` statically asserted; keep `BurstView` dots `position:absolute` + `pointerEvents:none` (no layout thrash). Consider limiting bursts to heaviest merge per move if device trace shows jank (UX decision). | FE / QA | Before 8-3 (shake adds further main-thread cost) |
| R-002 | TECH | **Early-input retarget orphan.** T3.4 early-input releases the `busy` gate at ~30% (`EARLY_INPUT_MS`) and re-plans; an in-flight `appear` tile promoted to `move` cancels its `withDelay` via `opacity=1/scale=1`, but its `BurstView` (stored in parent `bursts` state, keyed `b${idPool[i]}`) remains mounted at the stale `pixel(tr.to)` and its `setTimeout(500)` auto-clear runs on the previous move's timer. Rapid swipes can accumulate orphan bursts off-grid or fire `setState` on stale `bursts` closure. | 2 | 3 | **6** | Add a host test that `applyPlan` called twice within 500 ms does not accumulate orphan bursts (assert next plan's `idPool` uniqueness + that `setTimeout` clear filters by id, not by array ref). On device, rapid-swipe combo manual pass. Fix seam if needed: tie burst lifetime to `AnimatedTile` mount or guard `setBursts` with mounted ref; clear `setTimeout` on `GameBoard` unmount. | FE | Immediate (before 8-3 which also mutates `tilesRef` under re-plan) |
| R-003 | BUS | **FR-30 Reduced Motion non-compliance.** Punch correctly gates overshoot/flash/particles/glow via `isMerge && !reducedMotion` and `*For(value, reduced)` helpers; however `App.tsx` wiring could regress if `settings.reducedMotion` is memoised stale, if `GameOverOverlay` literal `reducedMotion={false}` is cargo-culted onto `GameBoard`, or if a future 8.5 refactor wraps punch in the same guard as haptics (haptics must stay — FR-30). Silent violation → a11y / App Store review risk (UX-DR-16). | 2 | 3 | **6** | Pin contract with (a) unit sweep: for every tier `punchScaleFor(v,true)===1 && shouldFlash===false && particleCount===0 && shouldGlow===false` (already in `punch.test.ts`), (b) a regression test that `App.tsx` passes `settings.reducedMotion` into `GameBoard` (grep / snapshot), (c) code comment `// FR-30: punch gated — haptics stay` and a lint/BAN rule for `reducedMotion` imports in `src/feel` except `punch.ts`. Review guard in every 8.x PR. | FE lead | Immediate (add lint rule + comment this story; enforce in 8-5 review) |

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Trace contract mismatch / chrome guard leak.** `isMerge` is set only when `tr.type==='merge'` (derived from `planTileTransitions` → `classify(entry)` where `from.length===2 && !spawned`). If engine adds a new trace shape or a spawn entry ever carries `from.length===2`, `classify` could mis-mark a spawn as merge → glow/flash/particles leak onto spawn tiles; conversely a rename of `spawned` field breaks punch silently (best-effort helpers still return data but board never mounts it). | 2 | 2 | 4 | Contract test that enumerates *real* `MoveResult.trace` fixtures via `move(game, dir, rng)` (not hand-built stubs) and asserts `triggerHapticsForTrace`-style filter plus `type==='merge'` iff `from.length===2 && !spawned`; assert that `type==='spawn'` entries never produce `isMerge` tiles even if value is 3/6/12. Keep `punch.ts` as thin wrappers — no duplicate predicate. |
| R-005 | BUS / TECH | **Only-glow rule regression.** Spec mandates "1536/3072+ glow is the only glow in the system" and that glow is suppressed under Reduced Motion. Code correctly checks `value>=1536 && isPunch`; risk is a future contributor adding a second glow (e.g. for 768) or removing the `isPunch` gate so glow leaks under `reducedMotion===true` or on spawn tiles. | 1 | 3 | 3 | Static check: grep for `RoundedRect` with `color="#ff` outside `AnimatedTile` `hasGlow` branch fails CI; unit loop asserts `shouldGlow(<1536)==false` even for heavy preset, and `shouldGlow(1536,true)==false`. |
| R-006 | TECH | **Flash over-trigger.** `hasFlash` is `isPunch && punchPreset.flash` where `flash:true` only for heavy (>=12). If the preset is later tuned to enable flash for medium, or if `punchPreset` is stale closure (dep array missing `value`), a medium merge could flash white (`#fff7e0`) — high-contrast artefact on every 6 merge. | 2 | 2 | 4 | Unit pin: `shouldFlash(6,false)===false` and `shouldFlash(12,false)===true` for the full tier sweep; `AnimatedTile` dep array includes `punchPreset` + `isPunch` + `value`. Snapshot: flash `RoundedRect` with `color="#fff7e0"` appears only when `value>=12 && !reducedMotion && isMerge`. |
| R-007 | TECH | **Burst accumulation / unmounted update.** `applyPlan` does `setBursts(prev=>[...prev, ...newBursts])` then `setTimeout(()=>setBursts(prev=>prev.filter(...)),500)` without clearing on unmount and without dedup if the same `idPool` repeats after `idRef` wraps or after rapid re-plan. Risk: leaked `Animated.View`s, memory growth, or React warning "state update on unmounted component". | 2 | 2 | 4 | Add cleanup: `useEffect` return clears pending timeout(s) and store timer in `settleTimerRef`-style ref array; host test asserts `setBursts` not called after `GameBoard` unmount (wrap in `act` + unmount). Cap `count ∈ {0,4,8,16}` statically. |
| R-008 | PERF | **Overshoot physics mis-tune vs early-input.** `withSequence(withTiming(overshootScale, duration), withSpring(1))` uses `damping:14, stiffness:260, mass:0.8`; if `overshootScale` or `overshootMs` drift (e.g. 1.25 or 200 ms) the snap tail extends beyond `MAX_MOVE_ANIM_MS` (280 ms) assumptions, so `EARLY_INPUT_MS` (≈84 ms) → next move re-plans while previous overshoot spring still in flight → visual pop or spring cancellation artefact. | 2 | 2 | 4 | Assert in `feel.ts`: `overshootScale <=1.2` and `overshootMs ∈ [80,120]` for all tiers via sweep; device video capture that two rapid merges do not show scale pop; keep spring config centralised (single `spring` const). |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | TECH | **Non-finite / negative punch values fallback masks corruption.** `presetFor(NaN\|Infinity\|-5)` safely returns light (never throws), so `punchProfileFor` also masks — a corrupted `trace[].value` would punch light instead of surfacing a data bug. | 1 | 1 | 1 | Monitor — keep defensive fallback (never-throw) but add `__DEV__` warning if `value<3` or non-finite reaches `punchProfileFor`; not a gate. |
| R-010 | TECH | **`reducedPresetFor` identity semantics diverge.** `presetFor` returns frozen canonical `PRESET_*` (memo-safe); `reducedPresetFor` returns a fresh `{ ...REDUCED_PRESET, haptic }` copy (not frozen). Consumer that memoises by identity will break in 8-5. | 1 | 2 | 2 | Monitor — document expected semantics: `presetFor` identity-stable, `reducedPresetFor` copy. In 8-5 freeze/copy alignment decision; existing test already asserts `reducedPresetFor(12).haptic==='heavy'` and `overshootScale===1`. |

### Risk Category Legend

- **TECH**: Technical/Architecture (contracts, purity, integration, animation orchestration)
- **SEC**: Security — none this story (no auth/data exposure)
- **PERF**: Performance (frame budget, GC, main-thread worklet coalescence)
- **DATA**: Data Integrity — none in scope (engine untouched)
- **BUS**: Business Impact (accessibility, App Store compliance, visual chrome rule)
- **OPS**: Operations (dependencies, builds, OTA, CI gating) — none high this story; `expo-haptics`/`reanimated` already pinned in 8-1

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

8-2 touches visual NFR surface: **60 FPS punch budget**, **reliability/never-throw**, **maintainability (single preset source)**, **accessibility FR-30**, and **offline/installability** unchanged.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Performance — 60 FPS / frame budget | NFR-1 + NFR-11: engine <2 ms/turn, frame logic worst-case <8 ms, device p99 <16.7 ms with punch layer (overshoot+flash+glow+16-particle burst) concurrent with Skia Canvas. `EARLY_INPUT_MS` ≈84 ms budget respected. | R-001, R-008 | Host micro-benchmark: sweep `allPresetValues()` × `punchProfileFor` + `ParticleDot` geometry allocation; measure no per-merge promise storm. Device lane: `useFrameRateBaseline` stats after 2-min play with 10+ merges including at least one heavy (12+) and one 1536+ glow (manual). Video capture for rapid-swipe re-plan. | CI `npm test` timing + benchmark lane output if present (otherwise `npm test` timing); `useFrameRateBaseline` log `fps`/`p99Ms`/`frames`; `npx tsc --noEmit` clean. |
| Reliability — never throw | Engine-never-throws extended to feel+punch: `presetFor`/`punchProfileFor`/`shouldGlow` never throw on any input (`null` trace, `NaN`, `Infinity`, missing module). `GameBoard.applyPlan` silent no-op on empty plan (NOOP) and on unmount. | R-009, R-002, R-007 | Unit negative-path sweeps: `NaN`, `Infinity`, `-1`, `null`/`undefined` value, empty trace, trace with only `spawned:true` or `from.length!==2`; `GameBoard` unmount during pending `withDelay`/`setTimeout`. Dynamic import paths not applicable (punch is pure). | `triade/__tests__/feel/punch.test.ts` existing 2 "never throw" cases + new `shouldGlow(NaN)` guard + `presets finite` loop. |
| Maintainability | `FeelPreset` is the single access point including `overshootScale` (no scattered literals), `punch.ts` thin wrappers over `presetFor`/`reducedPresetFor`; `FEEL_PRESETS` frozen; future stories reuse same preset without rework (8.3–8.5). | R-004, R-006 | Static-assert: grep for literal `1.08`/`1.12`/`1.15` and for `particleBurst:` outside `src/feel/feel.ts` fails; `punchScaleFor` delegates to `presetFor` (no duplicate tier branching). | Source scan + existing identity test `presetFor(3).overshootScale===1.08` + `all preset values finite` sweep. |
| Accessibility / Compliance — FR-30 + chrome rule | Reduced Motion gates *all* punch visuals (overshoot, flash, particles, 1536+ glow) but keeps haptics+sound (`haptic` preserved in `reducedPresetFor`). Chrome rule UX-DR-27: preview card and score never animate with feel effects. | R-003, R-005 | Unit: `punchScaleFor(v,true)===1 && shouldFlash(v,true)===false && particleCount(v,true)===0 && shouldGlow(v,true)===false` for all tiers (already) + `reducedPresetFor(12).haptic==='heavy'`; host: `GameBoard` snapshot asserts `isMerge` never set for `type==='spawn'` entries and no `RoundedRect color="#ff8c2f"` when `reducedMotion===true`. Device: enable Reduced Motion in iOS Settings → perform 3/6/12/1536 merges → confirm flat (no overshoot/flash/particles/glow) while haptics still felt. | `punch.test.ts` Reduced Motion loop + `GameBoard` render inspection; device checklist signed in PR. |
| Offline / Installability | Installable + offline (NFR-2, NFR-6) unchanged; no new CDN/network dependency (`reanimated`/`skia` already bundled). | — | App runs offline with punch (device airplane mode) — no network fetch for visual assets. | Manual airplane-mode device pass (deferred to same device smoke as performance). |

**Unknown thresholds:** None material for 8-2. If CI benchmark lane is absent, record actual measured `p99Ms` as baseline rather than inventing a threshold (mark UNKNOWN only if no device data collected). `overshootScale` cap `≤1.2` and `overshootMs ∈ [80,120]` are pinned by this plan — tolerances come from `feel.ts` constants, not from PRD.

---

## Entry Criteria

- [ ] Spec `spec-8-2-punch-visual.md` and `epic-8-context.md` are the reviewed revisions (`baseline_revision`/`final_revision` pinned in spec; `baseline_revision 7604cd1` → `final_revision punch-visual-8-2`).
- [ ] `triade/src/engine/**` byte-identical to baseline (ADR-01 purity gate) — `git diff --stat -- triade/src/engine` empty.
- [ ] Branch is on SDK 57 pinned versions (expo ~57.0.11, Reanimated 4, Skia, RNGH — existing matrix; `expo-haptics` best-effort via `void import()` as in 8-1).
- [ ] Host test runner `npm test` green at 728/730 baseline (2 pre-existing RED from 8-1 accepted: R-001 tutorial dedup + R-006 expo-haptics package.json — not caused by 8-2).
- [ ] `npx tsc --noEmit` clean (no new `@ts-ignore` beyond 8-1 haptics seam; `punch.ts` is strictly typed, no ignore).
- [ ] Feature is behind no flag — visual is immediate on `isMerge` trace entry (`from.length===2 && !spawned`).

## Exit Criteria

- [ ] All P0 tests passing (100%) — includes `punch.test.ts` 8 cases + `feel.test.ts` 12 cases (engine purity preserved).
- [ ] All P1 tests passing or failures triaged with approved waivers (host integration with real engine fixtures + one device smoke).
- [ ] No open bugs with severity S0/S1 against punch visual / chrome guard / Reduced Motion gate.
- [ ] `triade/src/engine/**` still byte-identical post-merge (CI check `git diff --stat -- triade/src/engine` empty) and no duplicate merge predicate outside engine (`grep -r "from.length===2" --include="*.ts" --include="*.tsx"` only in `src/engine` and `src/feel` gateway).
- [ ] Device smoke pass (iOS dev build, at least one real-device run: 3→subtle punch, 6→medium, 12+→flash+16 particles, 1536+ glow (only glow), each in portrait+landscape; toggle Reduced Motion → all punch becomes flat while haptics still felt — sign-off in PR description).
- [ ] `overshootScale` / `particleBurst` / `flash` still single-sourced via `presetFor` (no scattered literals outside `src/feel/feel.ts`) — static scan gate.
- [ ] Coverage target: all 7 rows in spec I/O & Edge-Case Matrix covered by at least one automated test (actual: `punch.test.ts` covers 3/6/12/1536 + Reduced Motion + NOOP + multi-merge; gap is `GameBoard` `isMerge` chrome guard — covered by host integration P1).

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` denote priority/risk. Execution timing (PR vs nightly vs device-manual) is defined under Execution Strategy.

### P0 (Critical)

**Criteria**: Blocks core punch contract + high risk (≥6) or no workaround + pure/cheap host execution.

| # | Requirement / AC | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | AC1 small punch | `presetFor(3)` light: `overshootScale 1.08, overshootMs 80, particleBurst 4, flash false` and `punchScaleFor(3,false)===1.08 && shouldFlash===false && particleCount===4 && shouldGlow===false` | Unit | — | 1 | DEV (done) | Existing `punch.test.ts` case 1 — frozen preset + wrapper. |
| P0-02 | AC1 medium punch | `presetFor(6)` medium: `1.12/100ms/8/false` and wrapper matches | Unit | — | 1 | DEV (done) | Case 2 — medium tier pin. |
| P0-03 | AC1 heavy punch (all heavy tiers) | Sweep `12,24,48,96,192,384,768,1536,3072,6144,12288` all map to `1.15/120ms/16/true` | Unit | R-006 | 1 (loop) | DEV (done) | Catches heavy-collapse regression; flash must be true only for heavy. |
| P0-04 | AC glow tier | `shouldGlow(768)===false && shouldGlow(1536)===true && shouldGlow(3072)===true && shouldGlow(6144)===true` and `shouldGlow(<1536)===false` for 384/1 | Unit | R-005 | 1 | DEV (done) | Only-glow rule; ensures glow not on <1536. |
| P0-05 | AC Reduced Motion gate (FR-30, UX-DR-16) | For every tier `3,6,12,24,1536,3072`: `punchScaleFor(v,true)===1 && shouldFlash===false && particleCount===0 && shouldGlow===false` and `punchProfileFor(v,true)` all zero/false; `reducedPresetFor(12).haptic==='heavy' && overshootScale===1` | Unit | R-003 | 2 | DEV (done) | Existing Reduced Motion loop — FR-30 pin; `reducedPresetFor` preserves `haptic`. |
| P0-06 | AC non-finite / negative never throw | `punchProfileFor(NaN)`, `shouldGlow(NaN)`, `Infinity`, `-5` never throw; `shouldGlow(NaN)===false` | Unit | R-009 | 1 | DEV (done) | Engine-never-throws extension for feel layer. |
| P0-07 | AC multiple merges per move | `values [3,6,12]` each map independently to `scale 1.08/1.12/1.15` and `particles 4/8/16` via `punchProfileFor` loop | Unit | R-001, R-008 | 1 | DEV (done) | Sequential merge scaling; data-layer multi-merge pin. |
| P0-08 | Data-not-code invariant | All tier `overshootScale` finite, `>=1` and `<=1.2` for `3,6,12,24,48,96,192,384,768,1536,3072,6144,12288` | Unit | R-008 | 1 | DEV (done) | Catches accidental scale cap drift / mutability. |

**Total P0**: 9 test groups (11 `it()`-equivalent assertions in 8 `it()` cases in file), host-only, <5 s.

### P1 (High)

**Criteria**: Validates the declarative trace→board→feel wiring and the native boundary; medium/high risk (3–4) and common workflows. Requires either engine fixtures (host) or a real device.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | AC NOOP + trace→isMerge contract | `planTileTransitions(prevBoard, MoveResult)` over a **real engine trace fixture** (via `move(game, dir, rng)`) correctly identifies `type==='merge'` iff `from.length===2 && !spawned`; `GameBoard.applyPlan` sets `isMerge:true` only for `merge` entries and never for `spawn` entries (even if value 3/6/12). | Integration (host, engine fixture) | R-004 | 2 (1 per fixture + 1 multi-merge fixture with 2 merges) | DEV | Pull fixtures from `src/engine/core/line.ts` contract via real `move()`; eliminates stub drift. Fixtures: 1+2→3 board, 6+6→12 board, and a 2-merge combo board. |
| P1-02 | AC chrome guard never on non-merge | Spawn tiles (`kind appear` without `isMerge`) never receive `isPunch`/`hasFlash`/`hasGlow`; assert `AnimatedTile` render branch: `isMerge===false → hasGlow false && hasFlash false` regardless of value. Host-inspect `GameBoard` tile descriptors after `applyPlan(spawn-only trace)` and after `applyPlan(merge trace)` count check. | Integration (host, component seam) | R-004, R-005 | 2 | DEV | Extract seam or inspect `tilesRef` after `applyPlan`; assert no `RoundedRect color="#ff8c2f"` for spawn-only move. |
| P1-03 | AC overshoot declarative + preset data-driven | `AnimatedTile` when `isMerge && !reducedMotion` uses `withSequence(withTiming(overshootScale, overshootMs), withSpring(1))` with `overshootScale`/`overshootMs` from `presetFor(value)`; when `reducedMotion===true` falls back to `withDelay(delay, withSpring(1))` (no overshoot). Verify via prop → preset mapping, not via Reanimated timing mock. | Integration (host, render seam) | R-008 | 1 | DEV | Host check: `punchScaleFor`/`punchDurationFor` match `presetFor` for each tier; optional shallow render that asserts `isPunch` boolean. Reanimated worklet thinness is tested on device. |
| P1-04 | AC burst scaling & reducedMotion gating | `GameBoard.applyPlan` for `merge` trace creates `Burst` with `count === presetFor(value).particleBurst` (4/8/16) at `pixel(tr.to)` center; when `reducedMotion===true` creates 0 bursts; assert `bursts` state after `applyPlan`. | Integration (host) | R-001, R-003 | 1 | DEV | Host state inspection (no Canvas needed); assert coordinates `p.x + cell/2`. |
| P1-05 | R-002 early-input orphan safeguard | Rapid `applyPlan` twice within 500 ms (simulated swipe during previous burst window) does not accumulate orphan bursts keyed by stale `idPool`; second plan's `idPool` uniqueness + `setTimeout` clear filters by id. | Unit (host, state machine) | R-002 | 1 | DEV | Requires exposing `applyPlan`/timer seam or replicating burst state logic in isolation; if untestable host-side, defer to device video but document waiver. |
| P1-06 | Device smoke (real iPhone dev build) | In portrait+landscape, trigger merges for values 3 (subtle punch), 6 (medium), 12+ (flash+16 particles), 1536+ (glow, only glow). Toggle Reduced Motion ON → repeat each: confirm flat (scale=1, no flash/particles/glow) while haptics still felt. Confirm preview card and score never animate. | Device smoke | R-001, R-003, R-005 | 1 (manual checklist, ~15 min) | Owner is PR author; sign-off checkbox in PR description ("device punch smoke: 3/6/12+/1536 + Reduced Motion ON"). Use dev build; airplane mode included. Replaces nightly lane for 8-2. |

**Total P1**: ~8 logical assertions + 1 device pass, ~4–7 h to finalise fixtures + seam plus 15-min device pass.

### P2 (Medium)

**Criteria**: Secondary flows + low/medium risk (1–4) + perf/regression depth; narrowly scoped smoke.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | Burst cleanup / unmount | `GameBoard` unmount during pending `setTimeout(500)` burst clear does not call `setState` on unmounted component; pending timers cleared on unmount via `useEffect` cleanup. | Unit (host, lifecycle) | R-007 | 1 | DEV | Wrap in `act` + unmount + `jest.useFakeTimers` equivalent for `node:test` if harness supports; otherwise manual waiver with comment to fix in 8-3. |
| P2-02 | Perf micro-bench | `presetFor` + `punchProfileFor` + `allPresetValues()` sweep completes <<1 ms host; no per-merge allocation spike beyond `Burst` creation; `ParticleDot` geometry (`angle/distance/delay`) deterministic and bounded. | Unit (bench) | R-001 | 1 | DEV | Lightweight `node --test` bench block (no external harness); measure wall-clock of 10k sweeps. |
| P2-03 | Only-glow static scan | Grep for `color="#ff8c2f"` / `RoundedRect` glow outside `AnimatedTile hasGlow` branch fails; `shouldGlow` unit loop already covers <1536 false. | Static | R-005 | 1 (lint/grep) | DEV | Prevents second-glow introduction; CI grep gate. |
| P2-04 | Engine purity + no duplicate predicate | `git diff --stat -- triade/src/engine` empty and `grep -R "from.length===2" src/ ` hits only `src/engine` + `src/feel` gateway + `src/render/transitionPlan` (3 sanctioned sites); `triade/src/feel/feel.ts` is the single access point for `overshootScale` literals. | Ops/CI (static) | R-004 | 1 (CI check) | CI | Single `bash` gate in PR. |
| P2-05 | NOOP silent | `result.moved===false` or trace with no merge entry → `planTileTransitions` returns `[]`, `applyPlan` no-ops, no burst created, no `withSequence` scheduled. | Unit | — | 1 | DEV | Silent no-op contract — board visually unchanged. |

**Total P2**: ~5 checks.

### P3 (Low)

**Criteria**: Nice-to-have + exploratory + device feel tuning; not a gate.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Punch feel tuning | On device, manually rank 3 vs 6 vs 12 merges for perceived weight separation (1.08 vs 1.12 vs 1.15); capture notes for 8.3 shake tuning where `shakeMs` currently 2/5. | Exploratory (manual) | 1 | UX/FE | Not pass/fail; feeds 8.3. |
| P3-02 | Glow visual snapshot | On device, capture screenshot of 1536 merge glow (`#ff8c2f` 0.28) vs 768 no-glow; compare vs Figma incandescent spec. | Manual | 1 | QA | Optional; web snapshot not applicable (Skia Canvas). |
| P3-03 | Burst clipping check | Verify particle `Animated.View` overlay (RN `View` absolute over `Canvas`) aligns to `pixel(tr.to)+cell/2` and does not clip at board edges / in landscape; check `overflow:hidden` vs edge particles. | Manual | 1 | QA | Edge-case visual at board corners. |

**Total P3**: 3 exploratory checks.

---

## Execution Order

For this story execution is host-dominated; device/manual is the only expensive gate.

### Smoke (<1 min, host, every save)

- `npm test -- triade/__tests__/feel/punch.test.ts` — the 8 punch tests (P0) + `feel.test.ts` 12 tests.
- `npx tsc --noEmit` — type gate (no `@ts-ignore` for punch; safe).

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 cases (already in `punch.test.ts`) + new P1 host fixtures (P1-01..P1-05) + P2 static/bench checks.
- **CI purity + literal scan**: `git diff --stat -- triade/src/engine` empty + `grep -R "1\.08\|1\.12\|1\.15" src/feel` outside `feel.ts` fails.
- **Static scan**: literal-haptic/overshoot grep and only-glow grep.

### Device gate (manual, ~15 min, before merge)

- **Device smoke** (real iPhone dev build): single lane, trigger merges for values 3, 6, 12+, 1536+ and confirm tiers; enable Reduced Motion → repeat heavy+glow (FR-30); airplane mode → repeat; rapid swipes during burst window → no orphan bursts. Sign-off in PR description.
- **Cross-check**: 8-1 deferred items remain RED (2 pre-existing) — not re-verified unless 8-2 touched haptics (it did not).

### Nightly/weekly — not required for 8-2

No nightly lane. Epic 8 device p99 `<16.7 ms` covering full feel preset (P1–P3 heavy shake/bullet time) is the Epic-level nightly lane when 8.3+ lands. 8-2 punch alone does not justify a nightly perf harness.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node --test` parallelisation); defer only real-device punch feel checks because they require Skia + Reanimated worklets and a Taptic-capable device.

- **PR**: All functional host tests (P0 + P1 host fixtures + P2 static/bench). No infrastructure overhead — `node --test` + `tsc` is the only runner. `tea_use_playwright_utils` is `true` in config but not required for this pure-RN story (no Playwright needed; no `page.goto` flows).
- **Pre-merge device**: One manual iPhone pass (P1-06 plus exploratory P3). Owner is the PR author; sign-off is a checkbox in the PR description ("device punch smoke: 3/6/12+/1536 + Reduced Motion ON flat + rapid-swipe orphan check").
- **Nightly/weekly**: None for 8-2. Epic 8 device p99 covering the full feel preset (shake + bullet time) is the Epic-level nightly lane when 8.3+ exists.

No k6 / contract / perf harness is required for this delta (no network API, no backend, no contract).

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 5 groups (9 `it` assertions already written) | 0.1–0.25 | **~0.5–1 h** | Already done; review + sweep extension only. |
| P1 | 6 groups (fixture + wiring + device smoke) | 0.5–1.0 | **~3–6 h** | Fixtures from real engine traces (2 h) + `GameBoard` seam/inspection (1–2 h) + device smoke (0.25 h). |
| P2 | 5 checks (cleanup + bench + static) | 0.3–0.7 | **~1.5–3.5 h** | Cleanup/unmount + micro-bench + two grep gates + NOOP. |
| P3 | 3 exploratory (tuning + glow snapshot + clipping) | 0.2–0.5 | **~0.6–1.5 h** | Manual only, not a gate; optional. |
| **Total** | **~19 logical checks** | **—** | **~5.5–12 h** | **~0.7–1.5 days** wall-clock single dev; with device wait **~12–22 h** elapsed including fixtures review + one device pass. |

- P0 host verification on change: <5 s.
- PR gate (host): <15 min end-to-end.
- Device smoke: ~15 min per pass; one pass required before merge.
- No nightly infra cost.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures; P1-05 early-input orphan may be waivered to device-only if host seam unavailable — must be documented)
- **P2/P3 pass rate**: ≥90% (informational; exploratory P3 not a gate)
- **High-risk mitigations**: 100% complete or approved waivers (R-001 device trace, R-002 rapid-swipe check, R-003 Reduced Motion pin)

### Coverage Targets

- **Critical punch paths (overshoot/flash/particles/glow + Reduced Motion + chrome guard)**: ≥80% line/branch via host tests; remaining via device smoke
- **Business logic (`feel.ts`/`punch.ts`)**: 100% (all tiers + reduced + non-finite)
- **Edge cases (NOOP, multi-merge, unmount)**: ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (including `feel.test.ts` 12 and `punch.test.ts` 8)
- [ ] No high-risk (≥6) items unmitigated or without approved waiver
- [ ] `triade/src/engine/**` byte-identical (CI gate)
- [ ] Reduced Motion gating verified both host (unit sweep) and device (Reduced Motion ON flat)
- [ ] Single-glow invariant verified (static scan + unit loop)
- [ ] `npx tsc --noEmit` clean
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (NFR-1 p99 not yet measured — waiver allowed this story)

---

## Mitigation Plans

### R-001: Burst-driven jank vs 60 FPS budget (Score: 6)

**Mitigation Strategy:**
1. Cap and pin `overshootScale ≤1.2`, `particleBurst ∈ {0,4,8,16}`, `overshootMs ∈ [80,120]` via unit sweep (prevents drift).
2. Keep `BurstView` dots `position:absolute` + `pointerEvents:none` and `Animated.View` (UI thread) — no layout thrash.
3. Add host micro-bench for `punchProfileFor` + `BurstView` geometry; add device benchmark lane recording `useFrameRateBaseline` after 2-min play including heavy + 1536 merges.
4. If device trace shows p99 >16.7 ms, limit to heaviest merge per move (single burst) — product decision, not yet implemented.

**Owner:** FE / QA
**Timeline:** Before 8-3 (shake adds further main-thread cost)
**Status:** Planned — P0 caps done, micro-bench + device trace pending
**Verification:** `punch.test.ts` finite-scale loop + CI benchmark lane output / `useFrameRateBaseline` log (`fps`/`p99Ms`/`frames`) attached to PR.

### R-002: Early-input retarget orphan (Score: 6)

**Mitigation Strategy:**
1. Host test that two rapid `applyPlan` calls within 500 ms do not leak bursts keyed by stale `idPool`.
2. Fix seam if needed: store pending burst timeout IDs in a ref and clear on `GameBoard` unmount; tie burst lifetime to tile `id` rather than wall-clock if orphan persists.
3. On device, rapid-swipe combo video capture (2–3 sequential merges) to confirm no off-grid orphans.

**Owner:** FE
**Timeline:** Immediate (before 8-3 which also mutates `tilesRef` under re-plan)
**Status:** Planned — rapid-swipe device check pending; timer-cleanup fix to be added if host repro succeeds
**Verification:** Host state inspection + `useEffect` cleanup code review + device video in PR.

### R-003: FR-30 Reduced Motion non-compliance (Score: 6)

**Mitigation Strategy:**
1. Keep `feel.ts:reducedPresetFor` preserving `haptic` and `punch.ts` wrappers returning `1/false/0/false` when `reducedMotion===true` for all tiers (unit loop).
2. `App.tsx` must pass `settings.reducedMotion` into `GameBoard`; add a snapshot/grep regression that the prop is wired and that `GameOverOverlay reducedMotion={false}` literal is not cargo-culted.
3. Add code comment `// FR-30: punch gated — haptics stay` and lint/BAN rule for `reducedMotion` imports in `src/feel` except `punch.ts`.
4. Device pass with iOS Settings → Accessibility → Motion → Reduce Motion ON → verify flat punch but haptics still felt.

**Owner:** FE lead
**Timeline:** Immediate (add lint rule + comment this story; enforce in 8-5 review)
**Status:** Planned — unit loop done, lint rule + device pass pending
**Verification:** `punch.test.ts` Reduced Motion loop + grep gate + device checklist signed in PR.

---

## Assumptions and Dependencies

### Assumptions

1. SDK 57 + Reanimated 4 + Skia are pinned and the dev build includes the Reanimated Babel plugin (worklets compile) — if the plugin is missing, punch animations silently degrade (assume present, verified by `npx tsc`).
2. `src/engine` is the single source of truth for `isMerge` classification via `from.length===2 && !spawned`; no caller duplicates that predicate (checked by grep gate).
3. `Animated.View` burst overlay coordinates (`pixel(tr.to)+cell/2`) remain valid after `cell` recomputed from `width`; `cell` is stable within a `GameBoard` render (not mid-plan).
4. Device p99 baseline will be collected during the Epic 8 device lane (deferring full `nfr-assess` for NFR-1 is acceptable this story).
5. Two pre-existing RED from 8-1 (`R-001` tutorial double Light, `R-006` expo-haptics missing in `package.json`) remain accepted and do not block 8-2 — 8-2 does not touch haptics gateway.

### Dependencies

1. `triade/src/engine/core/*` — unchanged; `line.ts` contract for `TraceEntry` required for P1 fixtures (available).
2. `src/services/storage/settingsStore.ts` + `schema.ts` — `Settings.reducedMotion` and `DEFAULT_SETTINGS` required for App wiring (available).
3. Real iPhone dev build (Expo dev client) with Taptic Engine — required for P1-06 device smoke (requires device access, ~15 min).
4. CI runner with `node --test` and `npx tsc` — host gates (available).

### Risks to Plan

- **Risk**: Host seam for `GameBoard.applyPlan`/`bursts` state not inspectable without extracting a seam → P1-01..P1-05 remain manual-only.
  - **Impact**: Reduced host automation coverage; relies on device smoke for wiring confidence.
  - **Contingency**: Add a thin seam (`export function deriveApplyPlan(...)` or `__TEST__` accessor) or replicate burst deduction logic in a host-only helper; document waiver in PR if seam not added this story.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **Engine (`src/engine`)** | No direct impact (unchanged); `planTileTransitions` already maps `merge` correctly for punch. | Existing 695+ engine tests must remain green; `git diff --stat -- triade/src/engine` empty gate. |
| **Haptics (`src/feel/haptics.ts`)** | Indirect: shares `FeelPreset`/`presetFor` with punch but logic untouched; `triggerHapticsForTrace` fire-and-forget import path not used by punch. | `feel.test.ts` 12 cases + `haptics.atdd.test.ts` if present must remain green. |
| **Rendering (`src/render/GameBoard.tsx`, `transitionPlan.ts`)** | Primary change: `isMerge` derivation, overshoot+flash+glow in `AnimatedTile`, imperative bursts via `BurstView`. T3.4 early-input timing (`EARLY_INPUT_MS`) now interacts with overshoot sequence. | Existing board/transitionPlan tests + any `GameBoard` snapshot tests must pass; verify `applyPlan` slide/hold/spawn paths unchanged for non-merge tiles. |
| **Hud / Preview card** | Must remain chrome-free; `Hud.tsx` receives `previews` via `previewFor(pendingSpawn)` and never receives feel effects. | Preview invariant tests (Epic 7) must pass; manual check that `Hud` preview card value never shows flash/particles/glow even when board merges. |
| **App orchestration (`App.tsx`)** | `doMove` wiring now includes `GameBoard reducedMotion={settings.reducedMotion}`; `doMove` already calls `triggerHapticsForTrace` inside `result.moved` block (8-1). No engine/store changes. | Smoke: swipe → merge → haptics still fire (8-1); score/best/undo/continue flows unchanged; `GameOverOverlay` still `reducedMotion={false}` literal. |
| **Frame budget / device health** | Burst + overshoot adds main-thread worklet load concurrent with existing 60 FPS lane. | `useFrameRateBaseline` device lane (if present) + CI `npm test` timing unchanged; defer full Epic 8 p99 gate to 8-3/8-6 when shake+SFX land. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework (TECH/PERF/BUS/OPS categories, gate rules)
- `probability-impact.md` — Risk scoring methodology (1–3 scale, score ≥6 = high)
- `test-levels-framework.md` — Test level selection (Unit for pure `punch.ts`, Integration for engine-trace→board seam, Device smoke for worklets)
- `test-priorities-matrix.md` — P0–P3 prioritization (P0 blocks core + high risk + no workaround)
- `nfr-criteria.md` — NFR review criteria (performance, reliability, maintainability, accessibility FR-30, offline)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md` (intent contract + I/O matrix)
- Epic context: `_bmad-output/implementation-artifacts/epic-8-context.md` (feel model, S8.1–8.6 deps)
- Architecture & ADR: `ADR-01` (engine purity), `ADR-04` (two-level benchmark), `ADR-06` (snapshot placement), `UX-DR-16`/`FR-30` (Reduced Motion), `UX-DR-27` (chrome rule)
- Prior test design: `_bmad-output/test-artifacts/test-design/test-design-epic-8-1-haptics.md` (single-preset precedent; R-001/R-006 deferred red carried)
- Production code: `triade/src/feel/feel.ts`, `triade/src/feel/punch.ts`, `triade/src/render/GameBoard.tsx`, `triade/src/render/transitionPlan.ts`, `triade/App.tsx`
- Tests: `triade/__tests__/feel/punch.test.ts`, `triade/__tests__/feel/feel.test.ts`

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design` (epic-level, steps-c 01→05)
**Version**: 4.0 (BMad v6) — risk-based, host-first; device smoke only where worklets require Taptic/Skia
**Execution mode**: sequential (auto-resolved; subagent/agent-team not required — single-file output)
