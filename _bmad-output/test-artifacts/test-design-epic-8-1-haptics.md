---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-01'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-1-haptics.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/haptics.ts'
  - 'triade/__tests__/feel/feel.test.ts'
  - 'triade/App.tsx'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 8 / Story 8-1 — Haptics (Scaled via FeelPreset)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `8-1-haptics`
**Scope:** Targeted test design for the working-tree delta of story 8-1

> **Delta under assessment:** Commit `1a24dc0` (`feat(8-1): scaled haptics via FeelPreset data model and expo-haptics observer`) — 3 commits ahead of `origin/main`. The current uncommitted diff is metadata-only (`spec-8-1-haptics.md` final_revision bump + `sprint-status.yaml` timestamp); the assessed production change is:
> - `triade/src/feel/feel.ts` (new) — `FeelPreset` / `FEEL_PRESETS` / `presetFor` / `reducedPresetFor` / `allPresetValues`
> - `triade/src/feel/haptics.ts` (new) — `triggerHapticsForMerge` / `triggerHapticsForTrace` / `hapticsStyleForValue`
> - `triade/App.tsx` (wiring) — observer that calls `triggerHapticsForTrace(result.trace)` inside the `result.moved` block
> - `triade/__tests__/feel/feel.test.ts` (new) — 12 host unit tests (706 total in suite)
> - No engine edits (`git diff --stat -- triade/src/engine` empty — verified)

---

## Executive Summary

**Scope:** Targeted test design for Epic 8, Story 8-1 Haptics. The story delivers the feel-layer data model and the first tactile effect: scaled haptics (3→Light, 6→Medium, 12+→Heavy) via `expo-haptics`, fired best-effort per merge trace entry (`from.length===2 && !spawned`) and explicitly **not** gated by Reduced Motion (FR-30, UX-DR-16). Future stories 8.2–8.6 reuse the same `FeelPreset` / `presetFor` data model for visual/sonic feel, so a defect here propagates forward.

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (score ≥6): 2
- Critical categories: TECH (merge-detection contract, double haptic on tutorial climax), BUS/TECH (FR-30 compliance)

**Coverage Summary:**

- P0 scenarios: 7 (host unit + contract, ~3–5 hours verification on change)
- P1 scenarios: 5 (integration/App wiring + device smoke, ~4–7 hours)
- P2/P3 scenarios: 6 (perf/burn-in + regression + exploratory, ~3–8 hours)
- **Total effort**: ~10–20 hours (~1.5–3 days wall-clock with device access)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Visual feel (8.2 punch, 8.3 shake, 8.4 bullet time, 8.5 Reduced Motion visuals, 8.6 SFX)** | Story 8-1 only delivers haptics; `shakeMs`/`particleBurst`/`overshootMs`/`flash` fields are placeholder data for future tuning, not behaviour. | 8.2–8.6 each require their own test design; 8-1 data fields are covered by unit invariant only (no visual assertion). |
| **Engine merge/spawn/score rules, `pendingSpawn` / `previewFor` / undo snapshot** | ADR-01 purity: engine is pure TS single source of truth, unchanged in this delta (byte-identical). | Engine invariants pinned by existing 695+ tests + pending PR checks. This plan asserts "no engine edits" as a regression gate. |
| **RevenueCat / AdMob / IAP / consent / Crashlytics** | No monetization or telemetry code touched. | Existing Epic 4 / Epic 10 suites remain the gate. |
| **Theming, a11y VoiceOver contract (Epic 9), crash-free sessions** | No tokens, no labels, no navigation changes. | Epic 9 / 10 NFR gates unchanged. |
| **expo-haptics native implementation itself** | Third-party native module (`ImpactFeedbackStyle` vibrator). Treat as external. | Trust but verify via device smoke; no unit mock of Apple Taptic Engine. |
| **Web / PWA parity** | Target is Expo dev build on iOS (SDK 57). Web has no haptics. | Manual device-only validation; web is excluded. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Double Light haptic on tutorial 1+2→3 climax.** `App.tsx:347` fires tutorial `Light` and in the same `result.moved` block `triggerHapticsForTrace` fires a second `Light` for the same `value=3` merge entry → two impacts ~0–50 ms apart. Feels like a double-tap bug on first-time user journey (the most-scrutinised funnel). Spec notes residual risk, no dedup. | 3 | 2 | **6** | Decide and test: either (a) suppress feel haptics when `tutorialState.phase==='merge12'` and tutorial already fired, or (b) accept and document double as intentional (UX sign-off). Add a dedicated unit + device test that asserts exactly 1 impact per tutorial climax. | FE / QA | Before 8-2 code freeze (or document accepted behaviour explicitly) |
| R-002 | BUS / TECH | **FR-30 compliance drift.** Gateway correctly ignores `reducedMotion`, but future stories 8.2–8.5 may refactor `App.tsx` wiring to wrap `triggerHapticsForTrace` in a `if (!settings.reducedMotion)` guard (copy-paste from visual gating). Would silently mute haptics under Reduced Motion → accessibility violation (iOS App Store requirement, UX-DR-16). | 2 | 3 | **6** | Pin contract with a regression test that asserts `triggerHapticsForTrace` never reads `Settings` / `reducedMotion`; add a code-ownership comment (`// FR-30: haptics stay — never gate on reducedMotion`) and a lint/BAN rule for `reducedMotion` imports in `src/feel/`. Review guard added in every 8.x PR. | FE lead | Immediate (add test + comment this story; enforce in 8-5 review) |

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH | **N sequential haptics in one move.** A single `move()` can merge 2–4 tiles (trace with 2+ merge entries). Current gateway fires fire-and-forget `import().then(impactAsync)` per entry with no debounce/throttle. On mid-game combos this may queue 2–3 impacts inside 16 ms → OS coalesces/drops or vibrates excessively. | 2 | 2 | 4 | Add a host test that `triggerHapticsForTrace` with 3 merge entries calls `triggerHapticsForMerge` exactly 3 times; on device, manually verify 2- and 3-merge combos and decide whether to throttle to "heaviest value only" (UX decision for Epic 8). |
| R-004 | TECH | **Trace contract mismatch.** Merge identification depends on `from.length===2 && !spawned` (line.ts contract). If engine adds a new trace shape or a spawn entry ever carries `from.length===2`, gateway produces phantom haptics. Conversely, a future trace rename breaks haptics silently (best-effort catch hides it). | 1 | 3 | 3 | Contract test that enumerates real `MoveResult.trace` fixtures from engine (not hand-built stubs) and asserts `triggerHapticsForTrace` fires exactly on merge entries. Add engine-to-feel integration fixture in `__tests__/feel/`. |
| R-005 | PERF | **Repeated dynamic import cost.** `triggerHapticsForMerge` does `void import('expo-haptics')` on every merge. Bundler may re-resolve per call; promise allocation on hot `move()` path unmeasured against NFR-11 (<2 ms engine / <8 ms frame / p99 <16.7 ms). | 2 | 2 | 4 | Benchmark: run `allPresetValues()` sweep + `triggerHapticsForTrace` mock sweep inside CI benchmark suite; ensure feel overhead <1 ms host-side. Consider memoizing the import promise (trivial cache) behind the `// @ts-ignore` seam. |
| R-006 | OPS | **expo-haptics not in `package.json` / missing native linkage.** `package.json` lists no `expo-haptics`; file notes reliance on bundledNativeModules and `// @ts-ignore`. OTA/dev builds that prune unused native modules may ship without `ImpactFeedbackStyle` → silent no-op in prod without Crashlytics signal (catch swallows). | 2 | 2 | 4 | Verify `expo-haptics` is present in `bundledNativeModules` / `expo install` check and add it explicitly to `package.json` (or document why omitted). Add a startup check: dynamic import failure should log once via telemetry (not throw), so prod regressions surface. Gate: `npx tsc --noEmit` + `npm test` still green, but also run `expo-doctor`/`expo config --type introspect`. |
| R-007 | TECH | **Frozen identity vs copy.** `presetFor` returns frozen canonical `PRESET_*` (memo-safe identity); `reducedPresetFor` returns a new `{ ...REDUCED_PRESET, haptic }` copy each call (not frozen, not identity-stable). Consumer that memoizes by identity will break in 8-5. | 1 | 2 | 2 | Document expected identity semantics and add a test that asserts `reducedPresetFor` is *not* identity-stable but preserves `haptic` and zeroes visuals. In 8-5, decide frozen vs copy and align. | DEV |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | TECH | **Fallback masks corrupted trace.** `presetFor(0\|-1\|NaN)` safely returns light, so a corrupted `trace[].value` still buzzes Light instead of surfacing a data bug. | 1 | 1 | 1 | Monitor — keep defensive fallback (never-throw) but add dev-only `__DEV__` warning if `value <3` or non-finite reaches gateway. |
| R-009 | TECH | **`ALL_TIERS` list diverges from tile manifest (includes 6144/12288 beyond 3072).** Consumers iterating over `allPresetValues()` may benchmark non-existent tiles. | 1 | 1 | 1 | Monitor — align manifest in next story or mark 6144+ as "future" and exclude from default perf sweep threshold. |

### Risk Category Legend

- **TECH**: Technical/Architecture (contracts, purity, integration, module shape)
- **SEC**: Security (auth, data exposure) — none this story
- **PERF**: Performance (frame budget, GC, haptic coalescence)
- **DATA**: Data Integrity (spawn distribution, merge correctness) — none in scope (engine untouched)
- **BUS**: Business Impact (accessibility, App Store compliance, UX weight)
- **OPS**: Operations (dependencies, builds, OTA, CI gating)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

8-1 touches a narrow NFR surface: **60 FPS feel budget** and **reliability/never-throw**, plus **accessibility (FR-30)**. Security/scalability/compliance are out of scope and remain N/A.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Performance — 60 FPS / frame budget | NFR-1 + NFR-11: engine <2 ms/turn, frame logic worst-case <8 ms, device p99 <16.7 ms with feel layer; haptics gateway must not await/block dispatch, must not allocate >1 ms on host. | R-005, R-003 | Host micro-benchmark: sweep `allPresetValues()` × `presetFor` + `hapticsStyleForValue`; mock `triggerHapticsForTrace` over real engine traces (device gap acceptable). Device lane: `useFrameRateBaseline` stats after 2-min play with 10+ merges (manual). | CI `npm test` benchmark lane output (if CI benchmark exists, else `npm test` timing); `useFrameRateBaseline` log `fps`/`p99Ms`/`frames`; gate threshold file if present. |
| Reliability — never throw | Engine-never-throws rule extended to feel: `presetFor`/`triggerHapticsForTrace` never throw on any input (including `null` trace, `NaN`, missing module). | R-008, R-004 | Unit negative-path sweeps: `NaN`, `Infinity`, `-1`, `null`/`undefined` trace, empty trace, trace with only `spawned:true` or `from.length!==2`. Dynamic import rejected promise swallowed. | `triade/__tests__/feel/feel.test.ts` existing 4 "never throw" cases + new trace-from-engine fixture. |
| Maintainability | FeelPreset is single access point (no scattered literals), `presetFor` pure, data not code; `FEEL_PRESETS` frozen; future stories reuse same preset without rework (8.2–8.5). | — | Static-assert: grep for literal `'light'|'medium'|'heavy'` outside `src/feel/feel.ts` fails; `presetFor` pure identity test (`same input → same frozen object`). | Source scan + existing identity test `presetFor(3) === FEEL_PRESETS[3]`. |
| Accessibility / Compliance — FR-30 | Reduced Motion gates visual feel (shake, bullet time, flash/particles, overshoot, glow, soft fade) but **keeps haptics+sound**. `presetFor(12+)=heavy` must still fire Heavy under `reducedMotion=true`. | R-002 | Unit: `reducedPresetFor(12).haptic === 'heavy'` (already) + new assertion that gateway never reads `settings.reducedMotion`. Device: enable Reduced Motion in iOS Settings → perform 3/6/12 merges → confirm haptic still felt. | `feel.test.ts` line covering `reducedPresetFor`; code comment + device checklist. |
| Offline / Installability | Installable + offline (NFR-2, NFR-6) unchanged; no new CDN/network dependency introduced (`expo-haptics` is bundled native). | R-006 | Verify `expo-haptics` loads from bundled module, not network; app runs offline with haptics (device airplane mode). | `expo-doctor` / `bundledNativeModules` audit + manual airplane-mode device pass. |

**Unknown thresholds:** None material for 8-1. If CI benchmark lane is absent, record actual measured `p99Ms` as baseline rather than inventing a threshold (mark UNKNOWN only if no device data collected).

---

## Entry Criteria

- [ ] Spec `spec-8-1-haptics.md` and `epic-8-context.md` are the reviewed revisions (`baseline_revision`/`final_revision` pinned in spec).
- [ ] `triade/src/engine/**` byte-identical to baseline (ADR-01 purity gate).
- [ ] Branch is on SDK 57 pinned versions (expo ~57.0.11, RNH, Skia, Reanimated — existing matrix).
- [ ] Host test runner `npm test` green at 706/706 baseline before delta (captured in spec Auto Run Result).
- [ ] `npx tsc --noEmit` clean (with `// @ts-ignore` for optional `expo-haptics` import — intentional).

## Exit Criteria

- [ ] All P0 tests passing (100%).
- [ ] All P1 tests passing or failures triaged with approved waivers.
- [ ] No open bugs with severity S0/S1 against haptics feel path.
- [ ] `triade/src/engine/**` still byte-identical post-merge (CI check `git diff --stat -- triade/src/engine` empty).
- [ ] Device smoke pass (iOS dev build, at least one real-device run for 3→Light, 6→Medium, 12+→Heavy and Reduced Motion ON still buzzes — sign-off in PR description).
- [ ] Residual double-haptic on tutorial climax either fixed or explicitly accepted by UX (R-001 decision logged).
- [ ] `expo-haptics` dependency story closed (added to `package.json` or documented rationale — R-006).
- [ ] Coverage target: all four ACs in spec I/O matrix covered by at least one automated test (actual: 12 host tests already meet this; gate is 100% AC coverage, not line %).

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` denote priority/risk. Execution timing (PR vs nightly vs device-manual) is defined under Execution Strategy.

### P0 (Critical) — Host unit, no device, <5 s

**Criteria**: Blocks core feel contract + high risk (≥6) or no workaround + pure/cheap host execution.

| # | Requirement / AC | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | AC1 3→Light | `presetFor(3).haptic === 'light'` and `hapticsStyleForValue(3) === 'Light'` | Unit | — | 1 | DEV (done) | Existing `feel.test.ts` line — frozen identity. |
| P0-02 | AC1 6→Medium | `presetFor(6) → medium`, `hapticsStyleForValue(6) → Medium` | Unit | — | 1 | DEV (done) | Pin medium tier. |
| P0-03 | AC1 12+→Heavy (all current tiers + future) | Sweep `12,24,48,96,192,384,768,1536,3072,6144,12288` all map to heavy/Light→Heavy | Unit | — | 1 (loop) | DEV (done) | Catches heavy-collapse regression. |
| P0-04 | AC3 FR-30 | Reduced Motion still maps: `hapticsStyleForValue(12) === 'Heavy'` and `reducedPresetFor(12).haptic === 'heavy'` with `shakeMs===0` | Unit | R-002 | 2 | DEV (done) | Gateway deliberately ignores `Settings`; regression pin. |
| P0-05 | AC4 NOOP contract | `triggerHapticsForTrace([]/null/undefined)` never throws; trace with only slides/spawns (`from.length!==2`) never fires (count 0) | Unit | — | 1 | DEV (done) | Silent no-op contract. |
| P0-06 | AC1+edge defensive | Non-finite/unknown values fall back to light never throw (`NaN`, `Infinity`, `0,1,2,-1`) | Unit | R-008 | 1 | DEV (done) | Engine-never-throws extension. |
| P0-07 | AC2 data-not-code | `presetFor` returns frozen canonical `FEEL_PRESETS[x]` identity (memo-safe); `allPresetValues()` sweeps and all presets have finite `shakeMs/particleBurst/overshootMs` and boolean `flash` | Unit | — | 1 | DEV (done) | Catches accidental clone / mutable copy. |

**Total P0**: 8 test groups (12 `it()` cases in file, count as 7 logical groups), host-only, executes in PR in <5 s.

### P1 (High) — Integration + device smoke (requires device/runner)

**Criteria**: Validates the wiring and the native boundary; medium risk (3–4) and common workflows.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | AC1 whole-move | `triggerHapticsForTrace` over a **real engine trace fixture** (not hand-built stub) correctly identifies merge entries → maps each `value` via `hapticsStyleForValue` with count = number of merges | Integration (host, but with engine fixture) | R-004 | 2 (1 per fixture + 1 multi-merge) | DEV | New: pull fixtures from `src/engine/core/line.ts` contract via `move(game, dir, rng)` trace; eliminates stub drift. |
| P1-02 | Wiring in App.tsx | After `result.moved===true` with at least one merge entry, `triggerHapticsForTrace(result.trace)` is called; after `result.moved===false` it is not (and `busyRef`/animation gate unchanged) | Integration (componentStub) | R-004, R-003 | 2 | DEV | Stub `App.tsx` move path or extract wiring to a seam; use injectable `hapticsGateway` mock so `expo-haptics` import is not mocked globally. |
| P1-03 | R-001 tutorial dedup | Tutorial 1+2→3 climax fires **exactly 1** Light (either tutorial path or feel path, but not both). | Unit+Device | R-001 | 2 (1 mock-count assertion + 1 device feel check) | FE/QA | Mock-count first; device second. Decision point: accept 2 or fix to 1 — test encodes the decision. |
| P1-04 | R-003 multi-merge | Trace with 3 merges (values 3,6,12) fires either 3 times or 1 time for heaviest (per UX decision) — test pins whichever policy is chosen | Unit | R-003 | 1 | FE | Requires product decision: "buzz per merge" vs "buzz once for heaviest". Current code is 3; pin it or change. |
| P1-05 | R-006 native presence | Dev build boots with `expo-haptics` available: one real `impactAsync(Light)` round-trip succeeds (or fails with a single logged telemetry, not swallowed silently in prod) | Device smoke | R-006 | 1 (manual checklist) | QA/FE | Run in `expo-dev` on a real iPhone; airplane mode + offline also included. |

**Total P1**: ~8–9 logical assertions, ~4–7 h to finalise (fixtures + seam) plus 15-min device pass.

### P2 (Medium) — Edge, perf, regression

**Criteria**: Secondary flows + low/medium risk (1–4) + perf/regression depth.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | Reduced Motion visual gating | `reducedPresetFor` zeroes visuals for all tiers (shakeMs=0, particleBurst=0, flash=false) while preserving `haptic` — sweep all tiers | Unit | R-002 | 1 (loop) | DEV | Already covered for 3 values; extend to full `allPresetValues()` sweep. |
| P2-02 | Perf micro-bench | `presetFor` + `hapticsStyleForValue` + `allPresetValues()` sweep completes <<1 ms host; no per-merge promise storm measured as allocation spike | Unit (bench) | R-005 | 1 | DEV | Add to existing CI benchmark lane if present; otherwise add a lightweight `node --test` bench block (no external harness). |
| P2-03 | Engine purity regression | `git diff --stat -- triade/src/engine` empty + `npm test` 695 pre-story tests still green | Ops/CI | — | 1 (CI check) | CI | Single `bash` gate in PR. |
| P2-04 | Literacy/contract | `FEEL_PRESETS` frozen, no scattered `haptic:` literals outside `feel.ts`; `triade/src/feel/feel.ts` is the single access point (grep gate) | Static | — | 1 (lint/grep) | DEV | Prevents future scattered literals (future stories would otherwise duplicate). |

**Total P2**: ~4 checks.

### P3 (Low) — Exploratory / benchmarks / nice-to-have

**Criteria**: Nice-to-have + exploratory + device feel tuning.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Haptics feel tuning | On device, manually rank 3 vs 6 vs 12 vs 96 merges for perceived weight separation; capture notes for 8.2 tuning of `shakeMs`/`particleBurst` that currently ship as placeholder data | Exploratory (manual) | 1 | UX/FE | Not a pass/fail gate; feeds 8.2. |
| P3-02 | Web no-op | Web build does not crash when `move` fires (dynamic import rejects, caught) | Manual | 1 | QA | Web has no haptics; assert silent no-op only. |

**Total P3**: 2 exploratory checks.

---

## Execution Order

For this story execution is host-dominated; device/manual is the only expensive gate.

### Smoke (<1 min, host, every save)

- `npm test -- triade/__tests__/feel/feel.test.ts` — the 12 feel tests (P0) + full suite sanity (706 pass).
- `npx tsc --noEmit` — type gate (note `// @ts-ignore` for optional `expo-haptics` import).

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 cases (already in feel.test.ts) + new P1-01/P1-02 fixture tests + P2 checks.
- **CI purity gate**: `git diff --stat -- triade/src/engine` empty.
- **Static scan**: literal-haptic grep outside `feel.ts` fails if found.

### Device gate (manual, ~15 min, before merge)

- **Device smoke** (real iPhone dev build): single lane, trigger merges for values 3, 6, 12 (or 24+), confirm Light/Medium/Heavy tactility is distinguishable; enable Reduced Motion → repeat 12 Heavy (FR-30); airplane mode → repeat.
- **Tutorial climax**: fresh install, play through tutorial phases up to the 1+2→3 merge, confirm either 1 buzz (fixed) or document 2-buzz as accepted (R-001).
- **Multi-merge combo**: set up a board that merges 2+ tiles in one swipe, confirm feel (R-003).

### Nightly/weekly — not required for 8-1

No perf/chaos/large-dataset suites. A sustained 10-min play p99 trace could be deferred to the Epic 8 device benchmark (ADR-04 two-level benchmark) when 8.2–8.4 land.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node --test` parallelisation); defer only real-device feel checks because they require a Taptic Engine.

- **PR**: All functional host tests (P0 + P1 host fixtures + P2 static/bench). No infrastructure overhead — `node --test` + `tsc` is the only runner.
- **Pre-merge device**: One manual iPhone pass (P1-05, R-001, R-003). Owner is the PR author; sign-off is a checkbox in the PR description ("device haptics smoke: 3/6/12+ + Reduced Motion ON").
- **Nightly/weekly**: None for 8-1. Epic 8 device p99 `<16.7 ms` covering the full feel preset (P1–P3 heavy shake/bullet time) is the Epic-level nightly lane when 8.2+ exists.

No Playwright/k6 contract/perf harness is required for this delta (no UI intercept, no network API, no backend).

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 7 groups (8 `it` sweeps already written) | 0.1–0.25 | **~1–2 h** | Already done; review + fixture upgrade only. |
| P1 | 5 groups (3 host fixtures/seam + 2 device) | 0.5–1.5 | **~4–7 h** | Dominated by extracting an App.tsx seam + collecting real engine trace fixtures. |
| P2 | 4 checks | 0.25–0.75 | **~1–3 h** | Grep/static + bench + CI gate. |
| P3 | 2 exploratory | 0.25–1 | **~0.5–2 h** | Manual device ranking, not gating. |
| **Total** | **~18 checks** | — | **~10–20 h** | **~1.5–3 days** wall-clock with device access; host-only completion is ~0.5–1 day. |

Prerequisites:

- **Test data**: Real `MoveResult.trace` fixtures from deterministic `mulberry32` seeded runs (no faker factories needed).
- **Tooling**: `node --test`, `tsx`, `typescript`; Xcode/Expo dev build on a real iPhone for smoke (no Simulator haptics).
- **Environment**: Host (`node >=26`, as per `engines`), iOS dev build (SDK 57). No staging backend.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions; all 8 groups green).
- **P1 pass rate**: ≥95% (a device smoke that is pending counts as a waiver with owner+date; mock-level P1 must already be green).
- **P2/P3 pass rate**: ≥90% informational; P2-03/P2-04 static gates must be green (they are cheap).
- **High-risk mitigations**: R-001 and R-002 have a decision + test or explicit signed waiver with expiry (next story 8-2 review) — otherwise FAIL.

### Coverage Targets

- **Critical paths (3/6/12+ + NOOP)**: 100% of spec I/O matrix rows covered by at least one automated test (currently met, gate is 100% AC coverage).
- **Security scenarios**: N/A this story (SEC category empty).
- **Business logic (`presetFor` data mapping)**: 100% of declared tiers swept.
- **Edge cases (NOOP/multi-merge/corrupt value)**: ≥90%.

### Non-Negotiable Requirements

- [ ] All P0 tests pass.
- [ ] No high-risk (≥6) items unmitigated without signed waiver.
- [ ] Engine byte-identical regression gate passes.
- [ ] Reduced Motion independence pinned by a test that never reads `settings` (FR-30).
- [ ] Device smoke sign-off present in PR before merge.

---

## Mitigation Plans

### R-001: Double Light haptic on tutorial 1+2→3 climax (Score: 6)

**Mitigation Strategy:**
1. Decide policy with UX: "exactly one Light per tutorial climax" (preferred) vs "documented double Light accepted".
2. If single: add a one-line guard that suppresses `triggerHapticsForTrace` when the tutorial Light already fired in this `doMove` (e.g., track `has12MergeInResult(result)` and tutorial-phase state, or pass a `suppressFeelForTutorialClimax` flag). Keep `App.tsx` wiring inside the `result.moved` block but before/after the tutorial block with clear ordering.
3. Add a mock-count unit test: seed a tutorial-active `GameState` that produces a `value=3` merge, capture invocations of `hapticsGateway`, assert count === 1.
4. Verify on device (fresh install path).
5. If policy is "accept double", replace fix with a UX-sign-off comment and a test that asserts count === 2 so future refactors don't accidentally "fix" it back.

**Owner:** FE (FE lead + UX reviewer)
**Timeline:** Before 8-2 branch (or document acceptance in this PR)
**Status:** Planned
**Verification:** Mock-count assertion + device pass checkbox in PR

### R-002: FR-30 Reduced Motion compliance drift (Score: 6)

**Mitigation Strategy:**
1. Add a contract test: import `triggerHapticsForTrace` module and assert it never imports `settingsStore`/`schema`/`reducedMotion` (static import scan or proxy mock that would fail if gateway reads settings).
2. Add a code comment at the `triggerHapticsForTrace(result.trace)` call site: `// FR-30: haptics stay under Reduced Motion — do not gate on settings`.
3. Add a lint rule or `grep` gate: `rg -n "reducedMotion" triade/src/feel/` must return only `feel.ts:reducedPresetFor` (not `haptics.ts`).
4. Review checklist item for every 8.x PR: "haptics not gated on reducedMotion".

**Owner:** FE lead
**Timeline:** This story (commit with the lint gate)
**Status:** Planned
**Verification:** `rg` gate green + import-scan test green + PR template checkbox

---

## Assumptions and Dependencies

### Assumptions

1. `expo-haptics` SDK 57 via `expo` bundled native modules is available at runtime on iOS dev builds (Expo docs pin). If not declared in `package.json`, the dynamic import with `.catch(()=>{})` keeps tests/host green but prod would be silent no-op — assumption is that bundled distribution still includes it (R-006).
2. The engine trace contract `from.length===2 && !spawned` is stable for the lifetime of Epic 8 (8-1 through 8-6). Any engine trace shape change is a breaking change that must coordinate with `src/feel/`.
3. Device smoke on a single iPhone model is sufficient for 8-1 (feel-stack separation is host-testable; device variance is low for impact style). 8-4+ device matrix is broader.
4. `// @ts-ignore` for `import('expo-haptics')` is intentional and not a type regression — TS strict is otherwise clean (`npx tsc --noEmit` is the gate).
5. Multi-merge haptics policy for 8-1 is "fire per merge entry" (current code). If UX later prefers "heaviest only" throttling, the test matrix will be updated in 8-3/8-4 without invalidating 8-1 P0.

### Dependencies

1. Engine fixtures from `triade/src/engine/core/*` available for P1-01 trace-from-engine tests — no external service required.
2. Access to a real iPhone with Taptic Engine for the 15-min device gate before merge — required by date: merge day (manual, not CI).
3. `triade/src/feel/*` remains host-testable (no RN import) so `node --test --import tsx` covers P0 without a simulator.

### Risks to Plan

- **Risk**: `expo-haptics` pruned in a future EAS/OTA build because no static import exists → haptics silently lost.
  - **Impact**: UX contract broken with no alert; App Store review may note missing tactile weight but no crash.
  - **Contingency**: Add `expo-haptics` to `package.json` dependencies and to `expo` plugins/config introspection; add a startup telemetry probe that logs success/failure of a single no-op `impactAsync` once, visible in Crashlytics.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **Engine (`src/engine/core`)** | None — observer only, no rules changed. Purity ADR-01 must hold. | `git diff --stat -- triade/src/engine` empty + full engine suite (`node --test triade/__tests__/engine/`) green. |
| **Render / Board (`src/render/GameBoard`)** | None — haptics fire from `App.tsx` move dispatch, not from render worklets. | Existing `GameBoard` trace-driven animation tests remain gate; no Skia snapshot change. |
| **Settings / Persistence (`src/services/storage/schema.ts`)** | Read once at hydration; haptics gateway explicitly decoupled from `settings.reducedMotion`. | Assert gateway never imports settings; settings schema tests unchanged. |
| **Tutorial (`src/game/tutorial.ts`)** | Shares the climax merge — double-buzz risk. | Tutorial state machine tests + P1-03 dedup assertion. |
| **Preview (`src/game/preview.ts`)** | None — preview reads `pendingSpawn`, feel reads `trace` (disjoint contracts). | Preview invariant suite green (`7-4` checklist). |
| **Lanes / Orchestrator / Monetisation** | None — haptics are feel, not assistance or IAP. | Lane wall + orchestrator suite green if PR touches `App.tsx` move path. |
| **Future 8.2–8.6 feel stories** | Break risk: scattered literals or gating logic would infect 8-1 contract. | Scattered-literal grep gate + FR-30 lint gate added now; will be enforced in each 8.x PR. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk scoring (P×I), categories (TECH/SEC/PERF/DATA/BUS/OPS), gate thresholds (≥6 needs mitigation, 9 blocks).
- `probability-impact.md` — P1=Low, P2=Medium, P3=High; score interpretation (1–9).
- `test-levels-framework.md` — Unit for pure functions, integration for engine↔feel contract, device smoke for Taptic Engine (no E2E harness needed).
- `test-priorities-matrix.md` — P0 = blocks core + high risk + no workaround (here: 3/6/12+ + FR-30 + NOOP).
- `nfr-criteria.md` — 60 FPS bounded, reliability never-throw, maintainability single-access-point, accessibility FR-30 gaps become risks.
- `recurse.md` — Feel layer as observer of typed `TilesMerged` events (PascalCase), sync dispatch, never duplicates rules.

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md` (FR-30, NFR-11)
- Epic context: `_bmad-output/implementation-artifacts/epic-8-context.md`
- Story spec: `_bmad-output/implementation-artifacts/spec-8-1-haptics.md`
- Architecture: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (ADR-01, ADR-06)
- UX Design: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md` (UX-DR-16/27/28/29, 8.x feel)

---

**Generated by**: BMad TEA Agent — Murat (Master Test Architect) via `bmad-testarch-test-design`
**Workflow**: `bmad-testarch-test-design` (Epic-Level)
**Version**: 4.0 (BMad v6) — targeted delta for `8-1-haptics`
**Config**: `_bmad/tea/config.yaml` → `test_artifacts: _bmad-output/test-artifacts` / `test_design_output: _bmad-output/test-artifacts/test-design`

### Follow-on Workflows (Manual)

- Run `*atdd` to generate any missing P1 host fixtures (P1-01 trace-from-engine, P1-02 App.tsx seam) — separate workflow, not auto-run.
- Run `*automate` once 8.2+ visual punch lands (adds Skia/worklet-layer coverage).
- Run `*nfr-assess` after device p99 evidence exists for Epic 8 full feel preset.

---

## Approval

**Test Design Approved By:**

- [ ] Product / FE Lead: _____________ Date: ____
- [ ] UX (feel weight sign-off + R-001 policy): _____________ Date: ____
- [ ] QA / TEA: _____________ Date: ____

**Comments:**

---
