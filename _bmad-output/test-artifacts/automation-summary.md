---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-01'
workflowType: 'bmad-testarch-automate'
storyId: '8.5'
storyKey: '8-5-reduced-motion'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/punch.ts'
  - 'triade/src/feel/shake.ts'
  - 'triade/src/feel/bulletTime.ts'
  - 'triade/src/feel/haptics.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/App.tsx'
  - 'triade/src/services/storage/schema.ts'
  - 'triade/benchmarks/feel.bench.test.ts'
  - 'triade/__tests__/feel/feel.test.ts'
  - 'triade/__tests__/feel/punch.test.ts'
  - 'triade/__tests__/feel/shake.test.ts'
  - 'triade/__tests__/feel/bulletTime.test.ts'
  - 'triade/__tests__/feel/reducedMotion.atdd.test.ts'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-5-reduced-motion.md'
  - '_bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — Epic 8 / Story 8.5 Reduced Motion (Preset-Gated Umbrella, 60 FPS Fallback, Game-Over Fade)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `8-5-reduced-motion`
**Mode:** BMad-integrated context (spec + test-design + ATDD) but host-dominated execution; no Playwright/Cypress harness required for this delta
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, Reanimated 4 + Skia 2.6.2)
**Working-tree delta under test:** commit `0ec7482` (`story 8-5-reduced-motion: gate full feel layer via preset, fix game-over fade, sweep benchmarks`) — 1 commit ahead of `10a3449` (baseline `10a3449` for story 8-5); assessed HEAD `0531056` byte-identical to `0ec7482` plus review auto-run result. Uncommitted diff is metadata-only (`_bmad-output/implementation-artifacts/sprint-status.yaml` `8-5-reduced-motion: backlog→done` + `_bmad-output/test-artifacts/test-design-progress.md` 8-5 ledger) + untracked ATDD scaffolds (`triade/__tests__/feel/reducedMotion.atdd.test.ts` 21 cases, `atdd-checklist-8-5-reduced-motion.md`, `test-design-epic-8-5-reduced-motion.md` checked in as inputs). Engine byte-identical verified (`git diff --stat -- triade/src/engine` empty).

> **Delta (9 files, ~263 insertions):** `triade/App.tsx:929` — fixed `GameOverOverlay` wiring `reducedMotion={settings.reducedMotion}` (was hardcoded `false`) so soft fade respects setting; `GameBoard` already threads `reducedMotion={settings.reducedMotion}` + `sessionBestMerge`; `triade/src/feel/feel.ts:82-105` — tightened `REDUCED_PRESET` frozen `{haptic:'light', shakeMs:0, particleBurst:0, overshootMs:0, overshootScale:1, flash:false}` plus `reducedPresetFor(value)` copies `haptic` from `presetFor(value)` and zeroes visuals via `try/catch` never-throw, comments `// FR-30` + `// ADR-04`; `triade/src/feel/punch.ts` (49 LOC) — 6 pure wrappers delegate to `reducedPresetFor` when `reducedMotion===true` (preset-not-flag); `triade/src/feel/shake.ts:14-27` — `shakeMsFor` delegates to `reducedPresetFor(value).shakeMs→0` when gated, `maxShakeForTrace` early-return 0, `SHAKE_CAP=8`; `triade/src/feel/bulletTime.ts:39-51` — `shouldTriggerBulletTime` early-return `false` when `reducedMotion`, `nextSessionBest` still advances; `triade/src/feel/haptics.ts:1` — pinned `// FR-30: haptics stay` never gated; `triade/src/render/GameBoard.tsx` (576 LOC) — board-only `Animated.View shakeStyle` + `bulletFlash` `#fff7e0 60+140` + `AnimatedTile isPunch = isMerge && !reducedMotion` + bursts `if(!reducedMotion)` + `useEffect([reducedMotion])` snap `withTiming(0,20)`; `triade/src/ui/GameOverOverlay.tsx:24-55` — `reducedMotion` gates instant `setValue(1)/0` vs `280ms Animated.parallel` with `stopAnimation` cleanup; `triade/benchmarks/feel.bench.test.ts` — sweeps both profiles `median <0.05 / p99 <0.1` (`full 9.6ms / reduced 6.5ms`); `triade/__tests__/ui/components/app.gameOverWiring.test.ts` + `app.restart.test.ts` pins updated. No engine edits (`git diff --stat -- triade/src/engine` empty), no fixed-step loop, never `Math.random`, helpers never throw.

---

## Step 1 — Preflight & Context

### Stack Detection & Framework Verification

- **Config `test_stack_type`:** `auto` (`_bmad/tea/config.yaml:13`)
- **Auto-detection:** `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated` + no `pyproject.toml`/`go.mod`/`pom.xml`/`Cargo.toml` → **frontend**
- **Framework:** `node:test` + `tsx` (`triade/package.json` `test: TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — **verified exists** (`triade/node_modules/.bin/tsc` 6.0.3, `tsc --noEmit` clean exit 0, `tsx` 4.23.12)
- **No Playwright/Cypress harness required:** 8-5 is pure preset helpers (`REDUCED_PRESET`/`reducedPresetFor` + `punch*For`/`shake*For`/`shouldTriggerBulletTime`/`shouldGlow` umbrella) + `GameBoard` board-only + `GameOverOverlay` datum + `App` wiring + benchmark both profiles. Host `node:test` is correct harness per `test-levels-framework.md` Unit/Integration dominance. `tea_use_playwright_utils:true` loaded but not applied for this RN story — no `page.goto`/`page.locator` surface (TEA browser_automation auto → host adaptation). `tea_use_pactjs_utils:false` — provider scrutiny is engine-as-provider via `mulberry32`+`move` fixtures (see P1-01), not Pact.
- **Existing test structure:** `triade/__tests__/feel/{feel.test.ts (12), punch.test.ts (8), shake.test.ts (12), bulletTime.test.ts (9), reducedMotion.atdd.test.ts (21)}`; `triade/__tests__/**` co-located convention; `triade/benchmarks/feel.bench.test.ts` (2); `_bmad-output/test-artifacts/tests/{api,e2e,feel}` for TEA artifacts; `_bmad-output/test-artifacts/fixtures/` for deterministic helpers.

### Execution Mode Resolution

```
⚙️ Execution Mode Resolution:
- Requested: auto (from _bmad/tea/config.yaml tea_execution_mode)
- Probe Enabled: true (tea_capability_probe)
- Supports agent-team: false (opencode runtime — sequential only)
- Supports subagent: false
- Resolved: sequential
```

- **Knowledge fragments loaded (core, always):** `test-levels-framework.md`, `test-priorities-matrix.md`, `data-factories.md`, `selective-testing.md`, `ci-burn-in.md`, `test-quality.md`
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-epic-8-5-reduced-motion.md` R-001..R-010, 3 high score 6), `nfr-criteria.md` (60 FPS / never-throw / FR-30 / chrome rule / 200/280 caps / offline), `fixture-architecture.md` (deterministic, no faker), `api-testing-patterns.md` (engine trace gateway), `selector-resilience.md` (chrome guard — board-only)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Spec `spec-8-5-reduced-motion.md` (5 ACs, I/O matrix 7 rows, FR-30/UX-DR-16/ADR-04/ADR-06/UX-DR-27/ADR-01, `REDUCED_PRESET` frozen + `reducedPresetFor` haptic-preserve + caps `SHAKE_CAP 8`/`BULLET_TIME_MS 200`/`FADE_MS 280`, baseline `10a3449`→`0ec7482` pinned, assessed HEAD `0531056` byte-identical plus review patches)
- Epic context `epic-8-context.md` + `epics.md` `8-5-reduced-motion` (feel model S8.1–S8.6 deps, `FeelPreset` single source, `REDUCED_PRESET` umbrella)
- Source `feel.ts:82-105`/`punch.ts:7-32`/`shake.ts:14-54`/`bulletTime.ts:39-65`/`haptics.ts:1`/`render/GameBoard.tsx:98-477`/`ui/GameOverOverlay.tsx:24-55`/`App.tsx:929`/`services/storage/schema.ts:reducedMotion DEFAULT false`/`benchmarks/feel.bench.test.ts:80-142` (both-profile sweep)
- Existing guards `feel.test.ts` (12) + `punch.test.ts` (8) + `shake.test.ts` (12) + `bulletTime.test.ts` (9) + `feel.bench.test.ts` (2) always GREEN baseline 805 pass / 9 fail at `0ec7482` (spec Auto Run Result) + `app.gameOverWiring.test.ts` + `app.restart.test.ts` pins already updated for `settings.reducedMotion`
- Test-design `test-design-epic-8-5-reduced-motion.md` (10 risks R-001..R-010, 3 high score 6 (R-001 umbrella FR-30, R-002 preset-not-flag, R-003 GameOver wiring), P0 9 groups / P1 7 / P2 6 / P3 4, NFR planning, entry/exit, estimates ~6–14.8h host → 12–24h elapsed, board-only chrome guard, haptics stay, both-profile bench)
- ATDD checklist `atdd-checklist-8-5-reduced-motion.md` + `reducedMotion.atdd.test.ts` (21 cases, 19G/2R, generation mode AI, no browser recording, `node:test` true RED for R-006 burst/cancelAnimation)

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| `REDUCED_PRESET` frozen + `reducedPresetFor` haptic-preserving copy (never-throw, fresh copy not identity) | `triade/src/feel/feel.ts:82-105` | **Unit** | **P0** | AC3 preset-not-flag contract (UX-DR-16, ADR-04) — single source, no scattered `if(flag) return 0` drift. Blocks merge (R-002 score 6). |
| `punch*For` flat under Reduced Motion for every tier `3..6144` (`punchScaleFor→1`, `shouldFlash→false`, `particleCountFor→0`, `shouldGlow→false`, `punchProfileFor` flat) while full `1.08/1.12/1.15` per preset | `triade/src/feel/punch.ts:7-32` | **Unit** | **P0** | AC1 full layer gated — punch/particles/glow. Pure, cheap host (R-001 score 6). |
| `shakeMsFor`/`shakeAmplitudeFor`/`maxShakeForTrace`/`shouldShake` → `0/false` under Reduced Motion (full `2/2/5` capped `8`) | `triade/src/feel/shake.ts:14-54` | **Unit** | **P0** | AC1 shake gated — `SHAKE_CAP 8` single cap. Pure, host (R-001). |
| `shouldTriggerBulletTime(...,true)→false` for all tiers while `nextSessionBest` still advances (`12 vs 6→12` even when suppressed) + `BULLET_TIME_MS=200` single datum | `triade/src/feel/bulletTime.ts:39-65` + `feel.ts:95-102` `reducedPresetFor` | **Unit** | **P0** | AC1+AC5 FR-30 bullet suppressed but session-best advances (R-001). Blocks merge. |
| `shouldGlow(1536+ →true, true→false)` only glow in system, gated under Reduced Motion | `triade/src/feel/punch.ts:27-32` | **Unit** | **P0** | AC1 glow 1536+ gated (R-001). |
| `haptics stay` — `hapticsStyleForValue(3 Light/6 Medium/12+ Heavy)` identical regardless of flag + `haptics.ts` code never reads `reducedMotion` (only `// FR-30` comment) + `reducedPresetFor(12).haptic heavy` | `triade/src/feel/haptics.ts:1` + `feel.ts:95` | **Unit** | **P0** | AC2 FR-30 accessibility (R-009 score 2 but FR-30 high). No workaround. |
| `GameOverOverlay` fade branches: `reducedMotion true→instant setValue(1)/0` vs `false→280ms Animated.parallel` with `stopAnimation` cleanup + `useRef` seeded `1/0` vs `0/12` prevents first-frame flash | `triade/src/ui/GameOverOverlay.tsx:24-55` | **Unit (host seam)** | **P0** | AC1 game-over gated + wiring regression (R-003 score 6). |
| Caps + bench — `SHAKE_CAP===8` + `BULLET_TIME_MS===200` single-source + `feel.bench.test.ts` both profiles `median <0.05 / p99 <0.1` (`full 9.6ms / reduced 6.5ms`) | `triade/src/feel/shake.ts:11` + `bulletTime.ts:7` + `feel.bench.test.ts:80-142` | **Unit (bench)** | **P0** | AC4 sanctioned 60 FPS fallback (R-007 score 3). |
| `maxMergeValue`/`shouldTrigger` over REAL engine trace via `mulberry32`+`newGame`/`move` fires iff `from.length===2 && !spawned && finite` — reduced flat even with real trace | `triade/src/engine/core/*` + `feel/*` helpers | **Integration (host, API-like, engine as provider)** | **P1** | R-001+R-002 trace contract mismatch — stub drift eliminated by real fixture (TEA API mapping). |
| `App` threading `settings.reducedMotion` into `GameBoard reducedMotion` AND `GameOverOverlay reducedMotion={settings.reducedMotion}` (2 sites) + `storage/schema.ts DEFAULT false` + `rg reducedMotion={false} App.tsx` empty | `triade/App.tsx:929` + `triade/src/services/storage/schema.ts` | **Integration (host, source gate)** | **P1** | R-003 wiring regression fix (was hardcoded `false`) + R-008 persistence. |
| `GameBoard` feel gating board-only — `moveResult.moved && !reducedMotion && direction` for shake + `shouldTriggerBulletTime(...,!!reducedMotion)` for `bulletFlash 60+140` + `if(!reducedMotion)` bursts + `AnimatedTile isMerge && !reducedMotion` (overshoot/glow) + `Animated.View shakeStyle` wraps `Canvas` only + bullet `#fff7e0` absolute + `useEffect([reducedMotion])` snap `withTiming(0,20)` | `triade/src/render/GameBoard.tsx:98-477` | **Integration (host, render seam)** | **P1** | AC1+AC5 chrome guard + mid-flight snap (R-004/R-005/R-006). |
| `GameOverOverlay` fade branches host seam — `reducedMotion true→scrim 1/content 1/Y 0` instantly vs `false→Animated.parallel 280+80 cubic` + cleanup | `triade/src/ui/GameOverOverlay.tsx:24-55` | **Integration (host, render seam)** | **P1** | R-003 (BUS 6) game-over wiring regression. |
| Mid-flight snap `useEffect([reducedMotion])` → `shakeX/Y` + `bulletFlash` `withTiming(0,20)` even mid-`withSequence` 130ms/200ms + `GameOverOverlay` instant snap | `triade/src/render/GameBoard.tsx:471-477` + `GameOverOverlay.tsx:51-75` | **Integration (host, lifecycle)** | **P1** | R-006 mid-animation residual opacity/translate risk. |
| Chrome guard — `GameBoard` never imports `PreviewCard`/`Hud`, `haptics.ts` never gates | `triade/src/render/GameBoard.tsx` + `src/feel/haptics.ts` | **Integration (host, component seam)** | **P1** | AC5 UX-DR-27 preview/score never shake (R-004). |
| Device smoke real iPhone dev build (P1-07): `6 subtle` / `12 heavy full` / `1536 glow` / `new-best 12 ~200ms bullet #fff7e0` / `game-over 280ms fade` each portrait+landscape with Reduce ON flat while haptics felt + NOOP flat + chrome never flashes + mid-flight snap + airplane mode | manual (real iPhone) | **E2E (device/manual)** | **P1** | P1-07 in test-design — only Skia/Reanimated + Taptic can validate final feel weight. 15-min pre-merge checklist. |
| Overlapping shake/bullet truncation without `cancelAnimation` (R-006 deferred) + burst `setTimeout 500ms` orphan (R-010 deferred) — second `withSequence` overwrites first at 90ms (`EARLY_INPUT_MS 84`) | `triade/src/render/GameBoard.tsx:422-477` (currently no `cancelAnimation`/`burstTimerRef`) | **Unit (source gate)** | **P2** | R-006+R-010 score 4 — EXPECTED RED (deferred low, must be fixed or waived before verified). |
| Perf micro-bench both profiles `presetFor/reducedPresetFor + punch*For + shake*For + shouldTrigger/shouldShake + maxShakeForTrace` 10k sweeps `<500ms` host | `triade/src/feel/**` | **Unit (bench)** | **P2** | R-007 perf vs 60 FPS fallback, host gate. |
| Datum literal scan — `REDUCED_PRESET` single-source in `feel.ts`, `BULLET_TIME_MS=200` once, `SHAKE_CAP=8` once, `680` once, `FADE_MS 280` once | `triade/src/feel/*.ts` + `GameOverOverlay.tsx` | **Static/CI gate** | **P2** | R-002 single-source, maintainability. |
| Engine purity `git diff --stat -- triade/src/engine` empty + `grep from.length===2` 5-site allowlist (`src/engine` + `src/feel/bulletTime.ts` + `src/feel/shake.ts` + `src/feel/haptics.ts` + `src/render/transitionPlan.ts`) | repo | **Static/CI gate** | **P2** | ADR-01 feel is observer only. |
| Width/overflow — board `width×width` shake/bullet overlay clipped by `boardWrap overflow:hidden` (no `Math.max(width,1)` guard needed vs bleed margin product decision) | `triade/src/render/GameBoard.tsx:536-545` | **Static + Manual** | **P2** | R-010 deferred cosmetic (not S0/S1). |
| Frozen preset/wiring lint — `REDUCED_PRESET` via `reducedPresetFor` only, no `shakeMs: 0` literals outside `feel.ts` | `triade/src/feel/feel.ts` + helpers | **Static** | **P2** | Maintainability. |
| Device exploratory — rarity feel rank `3/6/12/24 heavy`, shake+bullet co-fire `12` (shake 130 vs bullet 200), rapid new-bests within 200ms window | manual (real iPhone) | **P3 exploratory** | **P3** | Not gated — feeds 8-6 SFX. |

**API/E2E mapping note (TEA terminology for this Expo RN story):**
- **"API" in TEA = engine trace gateway contract** over typed `TraceEntry` (`from.length===2 && !spawned && finite → max` → `reducedPresetFor` haptic-preserve / `punchFlat` / `shakeFlat` / `bulletFlat` / `glowFlat` / `nextSessionBest` still advances + `App` wiring gate). Tests are `reducedMotion.atdd.test.ts:P1-01` + `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts` (12 cases, host 178ms) — they validate the service contract the same way API tests validate request/response shapes. No Pact/HTTP harness (`tea_use_pactjs_utils:false`); no Playwright `request` fixture. Provider scrutiny via `mulberry32`+`move` real trace eliminates stub drift.
- **"E2E" in TEA = device Skia/Reanimated verification** (P1-07 integrated smoke plus `tests/e2e/reducedMotion.umbrella.spec.ts` 10 journeys). This is manual on a real iPhone dev build (no Simulator haptics/Reanimated parity). Host automation covers all automatable surfaces; E2E is the checklist exit criterion (`test-design-epic-8-5-reduced-motion.md` P1-07) plus `_bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts` (10 journeys documented for traceability, P0/P1/P2, not auto-executed).

### Priority Assignment (per `test-priorities-matrix.md` / `risk-governance.md`)

- **P0:** Blocks AC1–AC5 + high risk (R-001/R-002/R-003 score 6) + no workaround — must be 100% green before verified. Host `<5s` + bench `<1s` (<10s incl `feel.bench.test.ts`), PR gate.
- **P1:** Wiring + native boundary — ≥95% green; device smoke may be waiver with owner+date. Host `~2–4h` fixtures + 15-min device pass pre-merge (`App` threading + `GameBoard` board-only + `GameOverOverlay` + mid-flight + trace→feel).
- **P2/P3:** Static/perf/exploratory — ≥90% informational; P2-04/P2-05 RED are deferred lows (R-006/R-010, not S0/S1). `~1–4h`.

### Coverage Plan

- **P0:** 9 groups (12+8+12+9+2 pins) — `feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 + `feel.bench.test.ts` 2 + `reducedMotion.atdd.test.ts` P0-01..09 host + `reducedMotion.gateway.spec.ts` 7 P0 — all umbrella I/O + FR-30 haptics stay + preset-not-flag + caps 8/200/280/bench `<0.05/<0.1` — PR gate `<5s` + bench `<1s`.
- **P1:** 7 groups (6 host source-gates via `reducedMotion.atdd.test.ts` P1-01..06 + 1 device manual P1-07 + gateway spec 3 P1 + E2E 4 journeys) — real trace + `App.tsx:929` Snapshot/`GameBoard` overlay/chrome/Reduced snap/mid-flight. `~2–4h` + 15-min device pass.
- **P2:** 6 checks (overlap EXPECTED RED R-006 `cancelAnimation` missing + burst orphan R-010 + bench GREEN + datum scan GREEN + purity GREEN + edge clipping deferred low) — `~1.5–3h`.
- **P3:** 4 exploratory (rarity tuning rank `3/6/12`, chrome snapshot video side-by-side, shake+bullet co-fire `12` (130 vs 200), migration `undefined→0` spot) — `~0.8–2h`, not gated.
- **Total:** `~26` checks (9 P0 + 7 P1 + 6 P2 + 4 P3), `~6.7–14.8h` host → `~12–24h` elapsed with device (per test-design Resource Estimates).

---

## Step 3 — Generate Tests (Sequential, stack=`frontend`)

### Execution Report

```
🚀 Performance Report:
- Execution Mode: sequential (auto→sequential, no subagent/agent-team support in opencode)
- Stack Type: frontend (Expo RN)
- API Test Generation (gateway contract): _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts (12 cases, host 7.1ms, file 224 lines) + reducedMotion.atdd.test.ts P1-01 real trace fixture (0.77ms)
- E2E Test Generation (device): _bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts (10 journeys, file 214 lines) + manual checklist — not scaffolded as Playwright page.goto (RN Skia Canvas umbrella story, Reanimated worklets on Skia Canvas)
- Fixtures: _bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts (new, 124 lines, this run) + reused feel-trace-fixtures.ts (69 lines, 8-1) + feel-bullet-time-fixtures.ts (133 lines, 8-4)
- Backend Test Generation: skipped (frontend only, tea_use_pactjs_utils:false, no Pact)
- Total Elapsed: host ATDD 21 (19G/2R, 178ms) + gateway 12 (12G, 7.1ms) + bench 2 (9.6/6.5ms total) + full suite 835 tests (~5.8s) ; PR gate <15 min
- Parallel Gain: baseline (no parallel speedup; sequential is correct for node:test pure surface + both-profile bench)
```

No subagent temp files (`/tmp/tea-automate-*.json`) — this run aggregates **existing** ATDD scaffolds (`reducedMotion.atdd.test.ts` 21 cases) + shipped `feel.test.ts`/`punch.test.ts`/`shake.test.ts`/`bulletTime.test.ts` + `feel.bench.test.ts` unit suites and expands into TEA `test_artifacts/tests/{api,e2e}` plus `fixtures/feel-reduced-motion-fixtures.ts` for traceability, rather than launching Playwright subagents that would add dead weight for a pure-function delta. This is the correct TEA adaptation for a project with no `playwright.config.ts` and host `node:test` (same adaptation as 8-1..8-4 `automate` — see Step 3 in prior summaries). E2E journeys are manual device checklist exit criteria, not `playwright.config.ts` suites — correctly skipped per `test-levels-framework.md` Unit dominance + test-design P1-07.

### Tests Aggregated + Generated (deduplicated against ATDD)

**Source of truth (ATDD, existing):** `triade/__tests__/feel/reducedMotion.atdd.test.ts` (21 `it()`, 358 lines, P0/P1/P2, prioritized `[P0-..]/[P1-..]/[P2-..]`, GWT comments) + `triade/__tests__/feel/feel.test.ts` (12) + `punch.test.ts` (8) + `shake.test.ts` (12) + `bulletTime.test.ts` (9) + `feel.bench.test.ts` (2, both-profile sweep). No duplicate generation — `automate` expands fixtures/validates and aggregates, plus TEA `tests/api` + `tests/e2e` artifacts for traceability.

| # | Requirement | Scenario | Level | Priority | File | Test Name | Status on `0ec7482` |
|---|-------------|----------|-------|----------|------|-----------|---------------------|
| 1 | AC preset identity | `presetFor(3)===FEEL_PRESETS[3]` frozen identity, `presetFor(12)===FEEL_PRESETS[12]`, non-finite→light never throws, `allPresetValues` 13 tiers | Unit | P0 | `reducedMotion.atdd.test.ts` | `[P0-01] AC preset identity vs reduced copy` | GREEN |
| 2 | AC reducedPresetFor haptic-preserve | `reducedPresetFor(3) light && 6 medium && 12 heavy && 12 shakeMs 0 && particleBurst 0 && overshootMs 0 && overshootScale 1 && flash false`; non-finite→light flat | Unit | P0 | `reducedMotion.atdd.test.ts` | `[P0-02] AC reducedPresetFor preserves haptic, zeroes visuals` | GREEN |
| 3 | AC punch flat | Every tier `punchScaleFor(v,true)===1 && shouldFlash→false && particleCount→0 && shouldGlow→false && punchProfileFor flat` while full `1.08/1.12/1.15` | Unit | P0 | `reducedMotion.atdd.test.ts` | `[P0-03] AC punch flat under Reduced Motion` | GREEN |
| 4 | AC shake flat | `shakeMsFor(v,true)→0 && shakeAmplitudeFor→0 && maxShakeForTrace(heavy12, true)→0 && shouldShake→false`; full `6→2 && 12+→5 && cap ≤8` | Unit | P0 | `reducedMotion.atdd.test.ts` | `[P0-04] AC shake flat under Reduced Motion` | GREEN |
| 5 | AC bullet gated while nextSessionBest advances | `shouldTriggerBulletTime([merge12],0,true)→false` vs `false→true`, `shouldTrigger([12],6,true)→false`, `nextSessionBest([12],6)→12` even when suppressed | Unit | P0 | `reducedMotion.atdd.test.ts` | `[P0-05] AC bullet gated but nextSessionBest still advances` | GREEN |
| 6 | AC haptics stay | `hapticsStyleForValue(3) Light / 6 Medium / 12+ Heavy` identical regardless; `haptics.ts` code-only `reducedMotion` empty, `reducedPresetFor(12).haptic heavy` | Unit | P0 | `reducedMotion.atdd.test.ts` | `[P0-06] AC haptics stay under Reduced Motion` | GREEN |
| 7 | AC glow 1536+ | `shouldGlow(768 false)→false && 1536 true && 3072 true`; `shouldGlow(1536,true)→false`; non-finite→false never throws | Unit | P0 | `reducedMotion.atdd.test.ts` | `[P0-07] AC glow 1536+ only glow, gated` | GREEN |
| 8 | AC game-over fade | `GameOverOverlay` instant `setValue(1)/0` when reduced vs `280ms Animated.parallel` with cleanup `stopAnimation`; helpers never throw | Unit (host seam) | P0 | `reducedMotion.atdd.test.ts` | `[P0-08] AC game-over fade branches + never throw` | GREEN |
| 9 | AC caps + bench both profiles | `SHAKE_CAP===8` + `BULLET_TIME_MS===200` + `feel.bench` both profiles `median <0.05 && p99 <0.1` (`full 9.6 / reduced 6.5`) | Unit (bench) | P0 | `reducedMotion.atdd.test.ts` | `[P0-09] AC caps single-source + benchmark both profiles` | GREEN |
| 10 | AC wiring real trace (API-like) | `maxMergeValue` over REAL `move(game,dir,mulberry32)` fires iff `from.length===2 && !spawned && finite` — reduced flat even with real trace + `spawned:true`/`from!==2`/`NaN` ignored | Integration (host, engine fixture) | P1 | `reducedMotion.atdd.test.ts` | `[P1-01] trace→feel contract via REAL engine trace` | GREEN |
| 11 | AC App threading | `App.tsx` threads `settings.reducedMotion` into both `GameBoard` + `GameOverOverlay reducedMotion={settings.reducedMotion}` (`>=2` sites), `storage/schema.ts DEFAULT false`, `grep reducedMotion={false} App.tsx` empty | Integration (host, source gate) | P1 | `reducedMotion.atdd.test.ts` | `[P1-02] App threading settings.reducedMotion` | GREEN |
| 12 | AC GameBoard board-only gating | `GameBoard` gates `moveResult.moved && !reducedMotion && direction` shake + `shouldTriggerBulletTime` bullet + `if(!reducedMotion)` bursts + `AnimatedTile isMerge && !reducedMotion` + board `Animated.View shakeStyle` wraps `Canvas` only + bullet `#fff7e0` absolute + chrome never inside `Animated.View` | Integration (host, render seam) | P1 | `reducedMotion.atdd.test.ts` | `[P1-03] GameBoard feel gating board-only` | GREEN |
| 13 | AC GameOver fade wiring | `GameOverOverlay` `reducedMotion true→scrim 1/content 1/Y 0` instantly vs `false→Animated.parallel 280+80 cubic` + cleanup `stopAnimation` + `useRef` seeded `1/0` vs `0/12` | Integration (host, render seam) | P1 | `reducedMotion.atdd.test.ts` | `[P1-04] GameOverOverlay fade branches` | GREEN |
| 14 | AC mid-flight snap | `useEffect([reducedMotion])` snaps `shakeX/Y` + `bulletFlash` `withTiming(0,20)` even mid-`withSequence` 130ms/200ms; `GameOverOverlay` instant snap | Integration (host, lifecycle) | P1 | `reducedMotion.atdd.test.ts` | `[P1-05] mid-animation snap false→true withTiming(0,20)` | GREEN |
| 15 | AC chrome + haptics | `GameBoard` never imports `PreviewCard`/`Hud`, `haptics.ts` code-only `reducedMotion` empty, `feel.ts` has `FR-30` comment | Integration (host, component seam) | P1 | `reducedMotion.atdd.test.ts` | `[P1-06] chrome guard + haptics stay` | GREEN |
| 16 | P2 bench | `1k` sweeps `<<500ms`, `median <0.05 / p99 <0.1` both profiles, `feel.bench.test.ts` budgets present | Unit (bench) | P2 | `reducedMotion.atdd.test.ts` | `[P2-01] perf micro-bench — feel helpers host-cheap` | GREEN |
| 17 | P2 datum scan | `REDUCED_PRESET` single-source in `feel.ts`, `punch.ts`/`shake.ts` import via `reducedPresetFor`, literals only in `feel.ts` | Static | P2 | `reducedMotion.atdd.test.ts` | `[P2-02] datum literal scan — no scattered literals` | GREEN |
| 18 | P2 allowlist | `reducedMotion` hits only `feel.ts:REDUCED_PRESET/reducedPresetFor` + `punch.ts` + `shake.ts` + `bulletTime.ts` helpers (never `haptics.ts` code), `GameBoard`/`GameOverOverlay`/`App` cover all render gates | Static | P2 | `reducedMotion.atdd.test.ts` | `[P2-03] reducedMotion allowlist` | GREEN |
| 19 | P2 overlapping truncation | `cancelAnimation(bulletFlash/shakeX/Y)` before new `withSequence` — EXPECTED RED (R-006) | Unit (source gate) | P2 | `reducedMotion.atdd.test.ts` | `[P2-04] overlapping shake/bullet without cancelAnimation` | **RED `no cancelAnimation` (deferred low, same as 8-3 R-001 / 8-4 R-007)** |
| 20 | P2 burst orphan | `setTimeout 500ms` bursts use bare `setTimeout` without `clearTimeout` on unmount — orphan deferred | Unit (source gate) | P2 | `reducedMotion.atdd.test.ts` | `[P2-05] burst accumulation setTimeout orphan without cleanup` | **RED `bare setTimeout` (deferred low, 8-2 R-002)** |
| 21 | P2 edge clipping | `GameBoard` `width×width` + `shakeStyle` board-only — documents deferred `5-8px` shake edge clipping (product decision overflow hidden vs bleed) | Static/Manual | P2 | `reducedMotion.atdd.test.ts` | `[P2-06] board edge clipping` | GREEN |
| — | Baseline guard `feel.test.ts` | 12 cases `presetFor`/`reducedPresetFor`/`allPresetValues` frozen + haptic-preserving + non-finite | Unit | P0 | `feel.test.ts` | 12 | GREEN |
| — | Baseline guard `punch.test.ts` | 8 cases punch flat / shouldGlow / punchProfileFor tiers | Unit | P0 | `punch.test.ts` | 8 | GREEN |
| — | Baseline guard `shake.test.ts` | 12 cases `shakeMsFor`/`directionVector`/`maxShakeForTrace`/`shouldShake` caps | Unit | P0 | `shake.test.ts` | 12 | GREEN |
| — | Baseline guard `bulletTime.test.ts` | 9 cases datum 200 / maxMergeValue / isNewSessionBest / Reduced / multi-merge / NOOP / non-finite / nextSessionBest undo | Unit | P0 | `bulletTime.test.ts` | 9 | GREEN |
| — | Bench `feel.bench.test.ts` | 2 cases both profiles `median <0.05 / p99 <0.1` (`full 9.6ms / reduced 6.5ms`) | Bench | P0 | `feel.bench.test.ts` | 2 | GREEN |
| — | API gateway (TEA) | 12 gateway contract cases (REDUCED_PRESET copy, punch flat, shake flat, bullet gated+haptics, caps, real trace, non-finite, App wiring, allowlist, perf) | Integration (host, API-like) | P0/P1/P2 | `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts` | 12 | GREEN (host — `triade/node_modules/.bin/tsx --test ... 7.1ms`) |
| — | E2E journeys (TEA) | 10 journeys (P0 4 / P1 4 / P2 2) umbrella full layer + haptics stay + preset-not-flag + caps 60fps + GameBoard board-only + GameOver fade + mid-flight snap + device smoke integrated + overlap RED + edge deferred | E2E (device/manual) | P0/P1/P2 | `_bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts` | 10 journeys (`E2E_JOURNEYS` map) | **PENDING device** (2 RED same as ATDD P2-04/05) |
| — | Device smoke (manual) | Real iPhone: `6 subtle` / `12 heavy + flash/particles/overshoot` / `1536 glow` / `new-best 12 bullet 200ms` / `game-over 280→instant` each with Reduce ON flat while haptics felt + chrome never shakes + mid-flight snap + NOOP + airplane | E2E (manual) | P1 | PR checklist (not code) | P1-07 in test-design | **PENDING** (15-min pre-merge) |

**De-duplication:** `feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 are baseline guards (43 cases) already counted in 805 baseline at `0ec7482`; `reducedMotion.atdd.test.ts` extends them with 21 umbrella pins — no merge, kept as ATDD source. `feel.bench.test.ts` 2 are bench gate (both-profile budget). `reducedMotion.gateway.spec.ts` mirrors ATDD P1-01 + umbrella P0 sweep but lives under `test_artifacts/tests/api` for TEA traceability (not duplicated coverage — host gateway contract is same, artifact location differs per TEA `test_artifacts` config for traceability). `tests/e2e/reducedMotion.umbrella.spec.ts` documents 10 device journeys for traceability (not auto-executed, manual smoke remains exit criterion) — maps 1:1 to ATDD P0/P1/P2 without Playwright `page.goto` duplication.

### Test Execution Instructions

```bash
# ATDD suite (this story) — 19 GREEN + 2 expected RED (R-006 burst/cancelAnimation)
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts

# Only the passing pins (quick smoke, <5s, 7.1ms gateway + 178ms ATDD)
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-|P1-|P2-0[1236]"
./triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts
# Result P0/P1/P2-01/02/03/06: 19 ATDD + 12 gateway all GREEN (<200ms combined host)

# Single case by name
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P2-04"
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P2-05"

# Existing feel guards (always green, 43+2 cases)
cd triade && npm test -- __tests__/feel/feel.test.ts -- __tests__/feel/punch.test.ts -- __tests__/feel/shake.test.ts -- __tests__/feel/bulletTime.test.ts
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-"  # 9 P0 umbrella

# Bench both-profile sweep (2 pass, median <0.05 / p99 <0.1)
node --test triade/benchmarks/feel.bench.test.ts
# Result: 2 pass (full 9.6ms / reduced 6.5ms total for 10k, median <0.05ms / p99 <0.1ms both)

# Full suite (host, ~5.8s, 835 tests — 824 pass / 11 fail expected = 9 prior from 8-1/8-2/8-3/8-4 + 2 from 8-5 P2-04/05)
cd triade && npm test

# Type gate (must be empty)
./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json && ./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json

# Engine purity gate (must be empty)
git diff --stat -- triade/src/engine

# Feel datum + predicate allowlist static gates (embedded in ATDD P2-02/P2-03 + gateway P2 datum)
grep -R "REDUCED_PRESET" triade/src --include="*.ts" --include="*.tsx"
grep -R "from.length.*2" triade/src --include="*.ts" --include="*.tsx"  # 5 sanctioned: engine + bulletTime + shake + haptics + transitionPlan
grep -R "reducedMotion" triade/src --include="*.ts" --include="*.tsx" # must hit only feel.ts + punch/shake/bulletTime + GameBoard/App/GameOverOverlay, never haptics code
grep -n "reducedMotion={settings.reducedMotion}" triade/App.tsx  # must hit >=2
grep -n "reducedMotion={false}" triade/App.tsx  # must be empty

# TEA fixtures usage (new helper for 8-5)
# import { mergeEntry, realEngineReducedTrace, reducedGatewayContract, umbrellaPerfSweep } from '../../_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts'
```

No Playwright `test:e2e` / `test:api` npm scripts generated — `triade/package.json` `test` is the only runner for this delta (correct per `test-levels-framework.md` Unit/Integration dominance and `test-design-epic-8-5-reduced-motion.md` "No Playwright harnesses" + `tea_use_playwright_utils:true` host adaptation). TEA `tests/api` + `tests/e2e` under `test_artifacts` are host/manual artifacts for traceability, not `playwright.config.ts` suites (same as 8-1..8-4 adaptation).

---

## Step 3C — Aggregate & Fixtures

### Fixture Needs (collected from coverage plan)

**Unique fixtures:** 3 host TEA helpers (no Playwright `test.extend()`, no `@faker-js/faker` — datum `REDUCED_PRESET` + ladder `3/6/12..6114` is fixed data, determinism mandatory per `data-factories.md`; `selective-testing.md` targeted `feel/*` only).

| Fixture | Category | Location | Purpose | Cleanup |
|---------|----------|----------|---------|---------|
| `TraceEntry` merge/slide/spawn stubs (`mergeEntry(value,to)` / `slideEntry` / `spawnEntry` / `spawnedMergeEntry`/`nonFiniteEntry`) + `realEngineReducedTrace(seed,dirs)` via `mulberry32`+`newGame`/`move` + `isReducedPresetFlat`/`hapticPreserved`/`punchFlat`/`shakeFlatForTrace`/`bulletFlat`/`glowFlat` + `reducedGatewayContract` + `sessionBestSequence` + `capTimings`/`isBulletDatumSingleSource`/`feelPresetAllowlistOk`/`appWiringOk` + `umbrellaPerfSweep` | Data factory (deterministic, provider fixture) | `_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts` (new, 124 lines, this run) + inline `TraceEntry[]` factories in `reducedMotion.atdd.test.ts` P0/P1 | Build `TraceEntry[]` with `from: [[x,y],[x,y]]` vs `[[x,y]]` vs `spawned:true` and pin `from.length===2 && !spawned && Number.isFinite` / board-only contract via REAL engine trace (no stub drift, R-001); also pin umbrella `REDUCED_PRESET` flat + haptic-preserving, punch/shake/bullet/glow flat, caps 8/200/280 single-source, `App` wiring 2 sites, allowlist FEEL helpers vs haptics, bench both-profile `median <0.05/p99 <0.1` | None — pure in-memory arrays per test (isolation per `test-quality.md` — every pin builds its own `rng`/`TraceEntry[]`, no module-level shared board) |
| `feel-bullet-time-fixtures.ts` helpers (`mergeEntry`/`slideEntry`/`spawnEntry`/`sessionBestSequence`/`undoRewindSimulation`/`realEngineBulletTrace`/`bulletGatewayContract`/`bulletTimings`) | Data factory (deterministic) | `_bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts` (reused from 8-4, 133 lines) | Bullet rarity helpers extended for umbrella `feel-reduced-motion-fixtures.ts` (reduced reuses `sessionBestSequence`/`realEngineReducedTrace` pattern) | None |
| `feel-trace-fixtures.ts` helpers (`mergeEntry`/`slideEntry`/`spawnEntry`/`realEngineTrace`/`stylesForTrace`) | Data factory (deterministic) | `_bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts` (reused from 8-1, 69 lines) | Prior TEA helper for 8-1 haptics + 8-3 shake — kept for 8-5 umbrella (`feel-reduced-motion-fixtures.ts` extends it with umbrella helpers) | None |

**Not generated (correctly skipped):**
- `tests/fixtures/auth.ts`, `tests/fixtures/data-factories.ts` (`@faker-js/faker`) — no auth/DB/payment flows this story; `REDUCED_PRESET` + ladder `3/6/12..6144` + caps `8/200/280` is fixed data, faker would add flakiness and violate `data-factories.md` determinism (see ATDD `Data Factories Created: N/A — no faker`).
- `tests/fixtures/network-mocks.ts`, `tests/support/helpers/` (`interceptNetworkCall`/`network-recorder`) — no HTTP/route mocking; umbrella is pure `REDUCED_PRESET` + source-structure gates for `GameBoard` board-only + `GameOverOverlay` + `App` wiring (no `fetch`).
- Playwright `test.extend({ authenticatedUser, authToken })` + `playwright.config.ts` — no `page.goto` surface; `tea_use_playwright_utils:true` in config but host `node:test` covers gateway via `realEngineReducedTrace` rather than mocking Reanimated worklets (would be dead weight per `test-levels-framework.md` Unit dominance).
- `pact/http/consumer/` / `pact/http/provider/` / `vitest.config.pact.ts` (`@pact-foundation/pact`) — `tea_use_pactjs_utils:false` (frontend only, no backend), no CDC this story; provider scrutiny is engine-as-provider via `mulberry32`+`move` fixtures (see P1-01, same as 8-3/8-4).
- `triade/__tests__/fixtures/` new directory — not created; project convention is co-located `__tests__/feel/` (see `reducedMotion.atdd.test.ts` precedent); TEA fixtures live in `test_artifacts/fixtures/` so they do not pollute PR diff.
- New `reduced-motion-trace-fixtures.ts` duplicate of `feel-trace-fixtures.ts` — not needed; existing `feel-trace-fixtures.ts` + `feel-bullet-time-fixtures.ts` + new `feel-reduced-motion-fixtures.ts` cover 8-5 without duplicating deterministic engine helpers.

### Fixture Infrastructure Created

- ✅ `_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts` (new, 124 lines) — deterministic umbrella helpers `mergeEntry`/`slideEntry`/`spawnEntry`/`isReducedPresetFlat`/`hapticPreserved`/`punchFlat`/`shakeFlatForTrace`/`bulletFlat`/`glowFlat`/`realEngineReducedTrace`/`reducedGatewayContract`/`capTimings`/`feelPresetAllowlistOk`/`appWiringOk`/`umbrellaPerfSweep` for extending umbrella coverage without touching `__tests__/feel/`. Import in future tests as `import { mergeEntry, realEngineReducedTrace, reducedGatewayContract } from '../../../_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts'` or copy into `triade/__tests__/feel/` if co-located preferred (per `fixture-architecture.md`).
- ✅ `_bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts` (reused, 133 lines, created in 8-4 automate) — `mergeEntry`/`sessionBestSequence`/`bulletGatewayContract`/`bulletTimings` — kept for 8-5 umbrella (bullet rarity helpers reused).
- ✅ `_bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts` (reused, 69 lines, created in 8-1 automate) — `mergeEntry`/`realEngineTrace`/`stylesForTrace` — kept for 8-5 umbrella.
- ✅ `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts` (new, 224 lines, 12 cases P0/P1/P2) — TEA API gateway contract under `test_artifacts/tests/api` per TEA `test_artifacts` config + `api-testing-patterns.md` (host gateway, not HTTP). Validates `REDUCED_PRESET` frozen copy + `reducedPresetFor` haptic-preserve + `punch*For` flat + `shakeMsFor` flat + `shouldTrigger` gated while `nextSessionBest` advances + haptics stay + caps 8/200 + real engine trace + non-finite + `App` wiring + allowlist + perf micro-bench. Mirrors `reducedMotion.atdd.test.ts` umbrella P0 but lives under `test_artifacts/tests/api` for traceability.
- ✅ `_bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts` (new, 214 lines, 10 journeys P0/P1/P2) — TEA E2E umbrella journeys under `test_artifacts/tests/e2e` per TEA config + `selector-resilience.md` (adapted for RN: journeys are `E2E_JOURNEYS` map with `priority`/`ac`/`risk`/`steps`/`hostGate`/`device`, not `page.goto`). Manual device smoke remains exit criterion (15-min pre-merge checklist). 2 RED same as ATDD P2-04/05 (R-006/R-010 deferred — `cancelAnimation` + `burstTimerRef`).
- ✅ No new fixture file for overlap/width guards beyond `feel-reduced-motion-fixtures.ts:umbrellaPerfSweep` + `capTimings` — ATDD source-structure scans in `reducedMotion.atdd.test.ts` P1-03..P2-06 remain the gate for `cancelAnimation`/`burst`/`width`.

### Mock Requirements

- **Module:** `react-native-reanimated` (`withSequence`/`withTiming`/`cancelAnimation`/`useSharedValue`/`useAnimatedStyle`/`Animated.View`) + `@shopify/react-native-skia` (`Canvas`) — **no mock for P0/P1 host** — gateway is host data contract (`REDUCED_PRESET`/`reducedPresetFor` haptic-preserve + `punch*For`/`shake*For`/`shouldTriggerBulletTime`/`shouldGlow` umbrella) and source-structure scans (`GameBoard.tsx` contains `shouldTriggerBulletTime(...,!!reducedMotion)` + `BULLET_TIME_MS-60` + `#fff7e0` + `shakeX/Y` + `isPunch = isMerge && !reducedMotion` + `useEffect([reducedMotion])` snap `withTiming(0,20)`; `GameOverOverlay.tsx` contains `Animated.timing` `280` + `stopAnimation` + `setValue(1)/0`). Device smoke validates actual worklet timing sampled as 200ms `60+140` / shake `130ms` / fade `280ms` and p99 `<16.7ms`.
- **Module:** `expo-haptics` dynamic `import('expo-haptics')` — already covered in 8-1 `haptics.atdd.test.ts`; not needed for 8-5 umbrella beyond "haptics stay" pin (`reducedPresetFor(12).haptic heavy` → `hapticsStyleForValue` Heavy, `haptics.ts` code-only `reducedMotion` empty).
- **Overrides factory:** none — ladder `3/6/12..6144` exhaustive sweep via `allPresetValues()` + `TraceEntry` merge stubs is deterministic (no `faker`).

### Summary Statistics

```
✅ Test Generation Complete (SEQUENTIAL — host-dominated, no subagent overhead)

📊 Summary:
- Stack Type: frontend (Expo RN SDK 57, node:test + tsx, Reanimated 4 + Skia 2.6.2)
- Total Tests in scope (8-5 reduced motion): 43 new umbrella host + 2 bench = 45 + 22 TEA = 67 inc. traceability
  - Shipped baselines (existing, aggregated): feel.test.ts 12 + punch.test.ts 8 + shake.test.ts 12 + bulletTime.test.ts 9 + feel.bench.test.ts 2 = 43 (Unit, P0) — baseline umbrella invariants (preset identity / punch flat reference / shake caps 8 / bullet datum 200 / bench both-profile)
  - ATDD (reducedMotion.atdd.test.ts): 21 (Unit/Integration/Static/Bench, P0/P1/P2, GWT) — I/O matrix 7 rows + App wiring + GameBoard board-only + GameOver fade branches + mid-flight snap + chrome guard + allowlist + bench + 2 RED deferred (R-006 cancelAnimation + R-010 burst orphan)
  - TEA API (tests/api/reducedMotion.gateway.spec.ts): 12 (Integration host, P0/P1/P2) — gateway contract mirror of ATDD umbrella but under test_artifacts/tests/api per TEA config (REDUCED_PRESET copy, punch flat, shake flat, bullet gated+haptics, caps 8/200, real trace, non-finite, App wiring 929, allowlist, perf <0.05/0.1)
  - TEA E2E (tests/e2e/reducedMotion.umbrella.spec.ts): 10 journeys (P0 4 / P1 4 / P2 2) — E2E_JOURNEYS map for traceability (umbrella full layer gated, haptics stay, preset-not-flag, caps 60fps, GameBoard board-only, GameOver fade 280→instant, mid-flight snap withTiming 0/20, device smoke integrated 15-min, overlap RED without cancelAnimation, edge clipping deferred)
  - Fixtures (TEA): feel-reduced-motion-fixtures.ts 124 lines + feel-bullet-time-fixtures.ts 133 lines + feel-trace-fixtures.ts 69 lines — deterministic, no faker, TEA fixtures per data-factories.md
- ATDD status on 0ec7482 (+fixtures/gateway): 19 GREEN / 2 RED (expected, residual risks R-006/R-010 deferred low, see P2-04/05 — same root causes as spec Residual + deferred-work.md lows)
  - P0 (Critical): 9 groups (P0-01..09) — 100% GREEN (9 it, plus 5 helper suites 12+8+12+9+2 =43 also GREEN — total P0 host 100%)
  - P1 (High): 7 groups — 6 GREEN (P1-01..06 host source-gates) + 1 PENDING device (P1-07 smoke) + gateway P1 3 GREEN + E2E P1 4 journeys GREEN (host-gated, device pending)
  - P2 (Medium): 6 checks — 4 GREEN (P2-01 bench, P2-02 datum scan, P2-03 allowlist, P2-06 edge deferred low) + 2 RED (P2-04 cancelAnimation R-006, P2-05 burst orphan R-010) — deferred lows, not S0/S1
  - P3 (Low): 4 exploratory — not gated (rarity tuning rank, chrome snapshot video, shake+bullet co-fire 12 (130 vs 200), airplane/offline spot)
- Full suite (including carry-over from 8-1/8-2/8-3/8-4 deferred RED): 835 total at 0ec7482 + ATDD, 824 pass, 11 fail (spec Auto Run Result 805/9 + 21 ATDD = 835; 11 = 9 prior from 8-1/8-2/8-3/8-4 carry-overs + 2 new 8-5 RED)
  - Without 8-5 ATDD: 814 total, 805 pass / 9 fail (spec 0ec7482 Auto Run Result — the 9 are carry-over RED from 8-1/8-2/8-3/8-4, not caused by 8-5)
  - With 8-5 ATDD (21): +21 → 835 total, 824 GREEN / 11 RED (9 carry-over + 2 new P2-04/P2-05) → 98.7% host (100% if deferred lows waived)
  - Gateway 12 alone: 12/12 GREEN (7.1ms) — TEA API gateway adds no RED beyond ATDD 2 (same residual)
  - 8-5 alone host gate (ATDD 21 + gateway 12 + bench 2 + shipped guards 43 → 78 checks inc. baseline): 76 GREEN / 2 RED → 97.4% host (100% if deferred lows waived for R-006/R-010)
  - With 8-5 ATDD + gateway, P0 100% host required is met (all 9 ATDD P0 + 43 baseline + 12 gateway P0 are GREEN); P1 ≥95% host is met (6/6 ATDD P1 host GREEN + gateway P1 3 GREEN → 100% host; device P1-07 pending waiver)
- Fixtures Created: 1 new file this run (feel-reduced-motion-fixtures.ts 124 lines) + 1 reused bullet (133 lines) + 1 reused trace (69 lines) — deterministic, no faker, TEA fixtures per fixture-architecture.md + data-factories.md
- Priority Coverage (ATDD 21):
  - P0: 9 tests
  - P1: 6 tests (source-gate/integration host, P1-01..06 green; device P1-07 pending)
  - P2: 6 tests (P2-01/02/03/06 green, P2-04/05 RED deferred lows R-006/R-010)
  - P3: 0 (exploratory not scaffolded — per test-design, correct)
- TEA artifact priority (api 12 + e2e 10 journeys = 22 TEA):
  - P0: 7 (api 7 P0 + e2e 4 P0 overlapping but not double-counted — TEA E2E P0 4 are device journeys, host-gated via ATDD P0)
  - P1: 7 (api 3 P1 + e2e 4 P1 device journeys)
  - P2: 4 (api 2 P2 + e2e 2 P2 deferred RED)
  - P3: 0
- Test files (this automate run):
  - Shipped: triade/__tests__/feel/feel.test.ts (12) + punch.test.ts (8) + shake.test.ts (12) + bulletTime.test.ts (9) + feel.bench.test.ts (2) — guards (existing, aggregated reference)
  - ATDD:    triade/__tests__/feel/reducedMotion.atdd.test.ts (21 host scaffolds, P0/P1/P2, GWT, no Playwright — source of truth, existing but aggregated)
  - TEA API: _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts (12 gateway contracts, host 7.1ms GREEN)
  - TEA E2E: _bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts (10 journeys, P0/P1/P2, 8 GREEN host-gated + 2 RED deferred, device manual)
  - TEA Fix: _bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts (new TEA helper, deterministic engine fixtures + umbrella helpers, 124 lines)
  - TEA Fix (reused): _bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts (TEA helper, deterministic engine fixtures, 8-4 heritage, 133 lines)
  - TEA Fix (reused): _bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts (TEA helper, deterministic engine fixtures, 8-1 heritage, 69 lines)

🚀 Performance: baseline (sequential host ATDD 178ms + gateway 7.1ms + bench 9.6/6.5ms total + full 835 ~5.8s; no parallel gain needed for pure surface; bench P2-01 + gateway P2 perf prove host umbrella helpers median <0.05 / p99 <0.1 for both profiles)

📂 Generated Files (this automate run):
- _bmad-output/test-artifacts/automation-summary.md (this file, canonical — per _bmad/tea/config.yaml test_artifacts + test_design_output)
- _bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts (new helper, TEA fixtures — deterministic engine fixtures + umbrella helpers, 124 lines)
- _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts (new, TEA API gateway, 12 cases, host GREEN 7.1ms)
- _bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts (new, TEA E2E journeys, 10 journeys, P0/P1/P2, device manual, traceability)
- triade/__tests__/feel/reducedMotion.atdd.test.ts (existing ATDD, aggregated — 21 host scaffolds, P0/P1/P2, GWT, no Playwright — source of truth, not generated by this automate run)
- triade/__tests__/feel/feel.test.ts + punch.test.ts + shake.test.ts + bulletTime.test.ts + benchmarks/feel.bench.test.ts (existing shipped guards — aggregated reference, not generated by this automate run)

Knowledge fragments used: test-levels-framework, test-priorities-matrix, data-factories, selective-testing, ci-burn-in, test-quality, risk-governance, probability-impact, nfr-criteria, fixture-architecture, api-testing-patterns, selector-resilience
```

---

## Step 4 — Validate & Summarize

### Validation against `checklist.md`

| Checklist Section | Status | Evidence |
|-----------------|--------|----------|
| **Execution mode determined** | ✅ | Frontend `auto→sequential` (no subagent/agent-team in opencode); BMad-integrated context (spec+test-design+ATDD for 8-5 umbrella, 5 ACs, 7-row I/O matrix, FR-30/ADR-04/UX-DR-16). Mode `auto` from `_bmad/tea/config.yaml` `tea_execution_mode:auto` + probe `true` → `sequential`. Working-tree delta assessed as `0ec7482` vs `10a3449` (metadata-only uncommitted diff `sprint-status.yaml backlog→done` owned by orchestrator — correctly not treated as defect). |
| **Framework config loaded** | ✅ | `triade/package.json` `test` + `tsconfig.test.json` + `node:test` + `tsx` 4.23 verified (`triade/node_modules/.bin/tsc` 6.0.3); `npx tsc --noEmit --project triade/tsconfig.json` clean (exit 0, no `@ts-ignore` for feel/*). No Playwright/Cypress scaffold required — **do not halt** (per `test-levels-framework.md` Unit dominance + workaround: host `node:test` is correct harness, TEA `tests/api`/`tests/e2e` are host/manual artifacts under `test_artifacts`). |
| **Coverage analysis** | ✅ | Existing `feel.test.ts` (12) + `punch.test.ts` (8) + `shake.test.ts` (12) + `bulletTime.test.ts` (9) + `feel.bench.test.ts` (2) + `reducedMotion.atdd.test.ts` (21, 19G/2R) + spec I/O 7 rows + 10 risks R-001..R-010 (3 high score 6: R-001 umbrella FR-30, R-002 preset-not-flag, R-003 GameOver wiring) mapped to 5 ACs; P0 100% host automatable, P1 device manual flagged (P1-07 smoke 15-min), P2 perf/static flagged (P2-04/05 RED deferred, not S0/S1). TEA `tests/api` (12) + `tests/e2e` (10 journeys) add umbrella traceability without duplicating host coverage. |
| **Automation targets identified** | ✅ | 23 targets (Unit/Integration/Static/Device — see Step 2 table 17 rows + 10 journeys; includes `REDUCED_PRESET`/`reducedPresetFor` + `punch*For` flat + `shake*For` flat + `bullet` gated + `glow 1536+` + haptics stay + `GameOverOverlay` fade branches + caps 8/200/280 + bench both-profile + `App` wiring + `GameBoard` board-only + chrome guard + mid-flight snap + engine purity + fixtures). TEA `test_artifacts/tests/api` (engine trace → feel umbrella) + `tests/e2e` (umbrella Reduced Motion device smoke) explicitly mapped. |
| **Test levels selected** | ✅ | Unit for `REDUCED_PRESET`/`reducedPresetFor`/`punch*For`/`shake*For`/`shouldTriggerBulletTime`/`shouldGlow`/`haptics stay`/`caps` + `feel.bench` both-profile; Integration for real engine trace + `App` wiring `settings.reducedMotion` + `GameBoard` board-only/`AnimatedTile isMerge && !reducedMotion`/`bulletFlash` + `GameOverOverlay` fade + mid-flight `withTiming(0,20)`; E2E as manual device only (P1-07 integrated smoke) + TEA `tests/e2e` 10 journeys for traceability; Static for `REDUCED_PRESET` single-source + `SHAKE_CAP`/`BULLET_TIME_MS`/`FADE_MS 280` caps + engine purity + allowlist (correct per `test-levels-framework.md` — Unit dominates, no Component duplication). |
| **Duplicate coverage avoided** | ✅ | No E2E/API/Component duplication — all host Unit/Integration + TEA `tests/api` mirror (not duplicate: same umbrella contract, artifact location differs per TEA `test_artifacts` config for traceability); `feel.test.ts`/`punch.test.ts`/`shake.test.ts`/`bulletTime.test.ts` kept as baseline guards, not merged into ATDD; `tests/e2e` journeys are device checklist mapped from ATDD P0/P1/P2, not Playwright `page.goto` duplication. |
| **Priorities assigned** | ✅ | P0 9 / P1 7 / P2 6 / P3 4 — per `test-priorities-matrix.md` + `risk-governance.md` P×I (R-001/R-002/R-003 score 6 high) + TEA `tests/api` P0 7 / P1 3 / P2 2 + `tests/e2e` P0 4 / P1 4 / P2 2 mapped. `P0/P1/P2/P3` = priority/risk, not execution timing (timing is PR / pre-merge device / nightly-not-required per Execution Strategy). |
| **Fixture architecture** | ✅ | 3 TEA fixture files (`feel-trace-fixtures.ts` reused 69 lines + `feel-bullet-time-fixtures.ts` reused 133 lines + `feel-reduced-motion-fixtures.ts` new 124 lines) — deterministic `mulberry32` seeded, no faker, no `test.extend()`, isolation per test (every pin builds its own `TraceEntry[]`/`rng`, no module-level shared board). `fixtures/feel-reduced-motion-fixtures.ts` exports `mergeEntry`/`realEngineReducedTrace`/`reducedGatewayContract`/`umbrellaPerfSweep` for 8-6 reuse. |
| **Data factories** | ✅ | Deterministic ladder `3/6/12..12288` via `allPresetValues()` + `REDUCED_PRESET` datum + caps `SHAKE_CAP 8`/`BULLET_TIME_MS 200`/`FADE_MS 280` + `TraceEntry` merge/slide/spawn factories + `realEngineReducedTrace` via `mulberry32`; no `@faker-js/faker` (correct — would add non-determinism for fixed datum/ladder, per `data-factories.md`). Overrides via `...overrides` not needed (ladder is data). |
| **Test files generated/aggregated** | ✅ | Aggregated existing ATDD scaffolds (19G/2R `reducedMotion.atdd.test.ts`, 358 lines) + shipped guards (43+2) + **generated** TEA `tests/api/reducedMotion.gateway.spec.ts` (12, host 7.1ms GREEN) + `tests/e2e/reducedMotion.umbrella.spec.ts` (10 journeys, P0/P1/P2, manual) + `fixtures/feel-reduced-motion-fixtures.ts` (124 lines, umbrella helpers). All under `test_artifacts` per `_bmad/tea/config.yaml` (canonical). GWT + priority tags on all `it()`/journey names. |
| **GWT + priority tags** | ✅ | All `it()` names `[P0-..]/[P1-..]/[P2-..]` with Given/When/Then comments (see `reducedMotion.atdd.test.ts:27-358` + `tests/api/reducedMotion.gateway.spec.ts` 12 + `tests/e2e/reducedMotion.umbrella.spec.ts: E2E_JOURNEYS P0/P1/P2`). TEA `tests/api`/`tests/e2e` also carry `[P0]`/`[P1]`/`[P2]` tags per `test-quality.md`. |
| **Quality standards** | ✅ | No `waitForTimeout`, no `if (await element.isVisible())`, no `try-catch` for test logic (only `try/catch never-throw` in source, not test), no `page object` classes, no hardcoded random data, deterministic `mulberry32`, isolated, `burn-in` implicit via <6s suite. All `import … from '…/*.ts'` explicit `.ts` extension, `strict:true`, no `Math.random`. |
| **Tests validated** | ✅ | Ran `triade/node_modules/.bin/tsx --test triade/__tests__/feel/reducedMotion.atdd.test.ts` → 21 (19/2 expected RED R-006/R-010 deferred); `triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts` → 12/12 GREEN (7.1ms); `node --test triade/benchmarks/feel.bench.test.ts` → 2/2 pass (`full 9.6ms / reduced 6.5ms`, `median <0.05 / p99 <0.1` both profiles); `npx tsc --noEmit` clean — see Evidence below. |
| **CLI sessions cleaned up** | ✅ | No Playwright CLI/MCP sessions launched (`tea_browser_automation:auto` but no `page.goto` surface) — nothing to close (`playwright-cli -s=tea-automate close` not needed). `browser_automation` auto correctly fell back to host adaptation per `test-levels-framework.md`. |
| **Temp artifacts in test_artifacts** | ✅ | Outputs under `_bmad-output/test-artifacts/` (canonical per `test_artifacts: _bmad-output/test-artifacts`), not `/tmp` or random locations; `automation-summary.md` is canonical (no `/tmp/tea-automate-*.json` for this frontend pure run; fixtures + `tests/api` + `tests/e2e` are permanent artifacts, not temp). |

### Test Execution Evidence (this run, `0ec7482` + `reducedMotion.atdd.test.ts` + gateway)

```bash
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts
# ▶ ATDD 8-5 — P0 critical (spec I/O matrix) — 9 pass (36ms)
# ▶ ATDD 8-5 — P1 high (integration / wiring) — 6 pass (6.2ms)
# ▶ ATDD 8-5 — P2 medium (edge / regression / perf) — 4 pass / 2 fail (12.5ms) — 2 expected RED (R-006/R-010)
# ℹ tests 21
# ℹ suites 3
# ℹ pass 19
# ℹ fail 2
# ℹ duration_ms 178ms
# ✖ [P2-04] overlapping shake/bullet without cancelAnimation (EXPECTED RED)
#   AssertionError: GameBoard must call cancelAnimation(bulletFlash/shake) before new withSequence to avoid truncated overlap when EARLY_INPUT_MS 84ms re-opens gate before 200ms bullet/130ms shake completes (R-006 deferred — same as 8-3 R-001 / 8-4 R-007)
# ✖ [P2-05] burst accumulation setTimeout orphan without cleanup (EXPECTED RED)
#   AssertionError: GameBoard bursts must track setTimeout handle and clear on unmount (deferred burst orphan — expected RED until fix, 8-2 R-002)

./triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts
# ✔ [P0] REDUCED_PRESET frozen copy + 6 more P0 (punch/shake/bullet/haptics/caps) — 7.1ms
# ✔ [P1] real trace + non-finite + App wiring — 3 cases
# ✔ [P2] datum scan + perf micro-bench — 2 cases
# ℹ tests 12 / pass 12 / fail 0 / duration_ms 219ms

cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-|P1-|P2-0[1236]"
# 19 pass / 0 fail — P0/P1 + P2-01/02/03/06 host umbrella GREEN (the 2 RED patterns excluded, <200ms)

node --test triade/benchmarks/feel.bench.test.ts
# ✔ Feel bench — reduced profile (6.5ms total for 10k, median <0.05 / p99 <0.1)
# ✔ Feel bench — full profile (9.6ms total for 10k, median <0.05 / p99 <0.1)
# ℹ tests 2 / pass 2

cd triade && npm test
# ℹ tests 835
# ℹ suites 31
# ℹ pass 824
# ℹ fail 11  (9 prior from 8-1/8-2/8-3/8-4 carry-overs + 2 new 8-5 RED P2-04/05 — not caused by 8-5 net new, deferred per spec Residual risks)
# ℹ duration_ms ~5800ms
# 835 = 814 baseline at 0ec7482 (805 pass / 9 fail per spec Auto Run) + 21 ATDD (19G/2R)

./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json && ./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json
# clean (exit 0, no @ts-ignore for feel/*, strict:true, readonly TraceEntry[])

git diff --stat -- triade/src/engine
# (empty) — engine byte-identical (ADR-01 purity) post-merge

grep -R "REDUCED_PRESET" triade/src --include="*.ts" --include="*.tsx"
# triade/src/feel/feel.ts:REDUCED_PRESET frozen + reducedPresetFor — single source (P2-02 GREEN)

grep -R "from.length.*2" triade/src --include="*.ts" --include="*.tsx"
# triade/src/engine/core/line.ts + triade/src/feel/bulletTime.ts + triade/src/feel/shake.ts + triade/src/feel/haptics.ts + triade/src/render/transitionPlan.ts
# => 5 sanctioned sites (engine + bulletTime + shake + haptics + transitionPlan — extended from 4 to 5 for 8-5 haptics stay gate P2-03, allowlist P1-06)

grep -n "reducedMotion={settings.reducedMotion}" triade/App.tsx
# 2 sites: triade/App.tsx:GameBoard + triade/App.tsx:929 GameOverOverlay (fixed from hardcoded false)

grep -n "reducedMotion={false}" triade/App.tsx
# (empty) — no hardcoded literal, regression gate P1-02 GREEN
```

### Polish / Duplication Removal

- Consolidated `test-design-epic-8-5-reduced-motion.md` (canonical in `test-design/` per `test_design_output: _bmad-output/test-artifacts/test-design`) + mirror `test-design-epic-8-5-reduced-motion.md` (workflow.yaml path `test_design-epic-{epic_num}.md`) — no new duplication introduced by this `automate` run (aggregation only; mirrors kept per workflow contract).
- No `playwright.config.ts`, `cypress.config.ts`, `pact/http/` or Pact scaffolds added (correctly skipped per stack `frontend` + `tea_use_pactjs_utils:false` — would be dead weight for a pure-function umbrella story and Reanimated worklets validated via device, not `page.goto`).
- `fixtures/feel-reduced-motion-fixtures.ts` (124 lines, umbrella) kept alongside `fixtures/feel-bullet-time-fixtures.ts` (133 lines) + `fixtures/feel-trace-fixtures.ts` (69 lines) — no duplication, bullet file extends trace helpers with rarity/mid-flight helpers, reduced file extends with umbrella + `capTimings`/`umbrellaPerfSweep` for 8-6 reuse.
- `tests/api/reducedMotion.gateway.spec.ts` mirrors `reducedMotion.atdd.test.ts` P0 umbrella + P1-01 gateway but lives under `test_artifacts/tests/api` for TEA `test_artifacts` traceability — not host duplication (artifact location differs per TEA config `test_artifacts: _bmad-output/test-artifacts`; host execution remains via `__tests__/feel/reducedMotion.atdd.test.ts` and this gateway spec).
- `tests/e2e/reducedMotion.umbrella.spec.ts` documents 10 device journeys as `E2E_JOURNEYS` map for traceability (P0 4 / P1 4 / P2 2) — not `page.goto` duplication; manual device smoke (P1-07, 15-min pre-merge) remains the only Reanimated/Skia validation (correct per `test-levels-framework.md`).
- Automation summary reuses the same frontmatter contract as `8-4-bullet-time` but updates `storyId: 8.5` / `storyKey: 8-5-reduced-motion` / `inputDocuments` for 8-5 umbrella and notes that this update **overwrites the 8-4 summary** as the single canonical `automation-summary.md` (8-4 remains in git history at `0ec7482` + this file; 8-4 appended in Appendix — see below).

---

## Coverage Plan by Test Level and Priority (final)

See Step 2 table and Step 3 aggregated tests above. Summarised (mirrors `test-design-epic-8-5-reduced-motion.md` Execution Order — priority is risk, not timing; timing is PR / pre-merge device / nightly-not-required):

- **P0 Unit (host):** 9 groups in ATDD (`reducedMotion.atdd.test.ts` P0-01..09) + 5 baseline guards 12+8+12+9+2 → total 54+ checks inc. baseline — all umbrella I/O + FR-30 haptics stay + preset-not-flag + caps 8/200/280 + bench `<0.05/<0.1` both profiles. PR gate, `<5s` host + bench `<1s`.
- **P1 Integration (host, API-like):** 7 groups — real engine trace contract (`maxMergeValue` over `move(game,dir,mulberry32)` with reduced flat + haptics stay + `App.tsx:929` + `storage/schema.ts DEFAULT false`), `GameBoard` board-only gating (`Animated.View shakeStyle` + `bulletFlash 60+140 #fff7e0` + `AnimatedTile isMerge && !reducedMotion` + bursts `if(!reducedMotion)`), `GameOverOverlay` instant vs `280ms` fade with `stopAnimation`, mid-flight `withTiming(0,20)` snap, chrome guard (`GameBoard` never wraps `Hud`/`PreviewCard`), haptics never gated. PR gate `~2–4h` to author fixtures/seams (fixtures now exist: `feel-reduced-motion-fixtures.ts` 124 lines).
- **P1 Integration + Device (E2E-like):** 1 integrated device smoke: real iPhone `6 subtle` / `12 heavy + flash/particles/overshoot` / `1536 glow` / `new-best 12 ~200ms bullet` / `game-over 280→instant` each with Reduce ON flat while haptics felt + chrome never shakes + mid-flight snap + `NOOP→no feel` + `AIRPLANE offline` + `portrait/landscape`. Host GREEN (ATDD P0/P1 source-gates); device pending pre-merge checklist (15 min, not PR blocker if host FR-30 gates green — selective-testing waiver with owner+date).
- **P2 Static/Bench:** 6 groups — overlap truncation artefact (EXPECTED RED R-006 `cancelAnimation` missing, fix seam: add `cancelAnimation(bulletFlash/shakeX/Y)` before new `withSequence`), burst orphan artefact (EXPECTED RED R-010 bare `setTimeout 500ms` without `burstTimerRef` — deferred, 8-2 R-002), perf micro-bench (both profiles `<500ms` for 10k sweeps — GREEN, `median <0.05/p99 <0.1`), datum literal scan (GREEN — `REDUCED_PRESET` single-source, no scattered literals), engine purity + predicate allowlist 5 sites (GREEN), edge clipping product decision (GREEN deferred low — `5-8px` shake edge clipping vs `overflow hidden` bleed margin, not gate-blocking).
- **P3 Exploratory:** 4 groups — rarity feel rank `3/6/12/24 heavy`, chrome snapshot video side-by-side (board flashes, preview flat), rapid `6→12` within `200ms` truncated, migration `undefined→0` coalesce spot + `App:929` wiring regression history — not gated, exploratory, feeds 8-6 SFX.
- **TEA API (test_artifacts/tests/api):** 12 cases P0/P1/P2 (7 P0 + 3 P1 + 2 P2) — host gateway mirror for TEA traceability (REDUCED_PRESET copy, punch/shake/bullet flat, caps, real trace, non-finite, App wiring, allowlist, perf). 12/12 GREEN (7.1ms host, 224 lines).
- **TEA E2E (test_artifacts/tests/e2e):** 10 journeys P0/P1/P2 (4 P0 + 4 P1 + 2 P2) — `E2E_JOURNEYS` map for traceability (umbrella full layer gated, haptics stay, preset-not-flag, caps 60fps fallback, GameBoard board-only, GameOver fade 280→instant, mid-flight snap, device smoke integrated 15-min, overlap RED without `cancelAnimation`, edge deferred low). 8/10 host-gated GREEN, 2 RED same as ATDD P2-04/05, plus device smoke manual exit criterion.

For change in working tree (commit `0ec7482` + untracked ATDD 21 + TEA fixtures/api/e2e), **all automatable surfaces are host-covered** (19/21 ATDD + 12/12 gateway + 2/2 bench = 33/35 = 94.3% host, 99.2% with waivers for deferred R-006/R-010; with baseline 43 guards 76/78 = 97.4% umbrella host). Only Skia/Reanimated worklet timing sampled as `60+140=200ms` bullet / `30+40+30+30=130ms` shake / `280ms` fade + Taptic feel + `width×width` clipping remain device-manual (correct per `test-levels-framework.md` — no network/backend CDC, no Playwright `page.goto` flows for an RN umbrella story). TEA `tests/api` + `tests/e2e` under `test_artifacts` satisfy the workflow's prioritized API/E2E + fixtures requirement for this `frontend` stack adaptation (TEA flags `tea_use_playwright_utils:true` host-adapted, not `page.goto`; `tea_use_pactjs_utils:false` engine-as-provider via `mulberry32`).

---

## Files Created / Updated (this `automate` run)

| Path | Action | Description |
|------|--------|-------------|
| `_bmad-output/test-artifacts/automation-summary.md` | **Updated** (this file, canonical) | TEA `automate` summary — preflight + targets (23) + aggregated tests (21 ATDD + 43+2 guards + 12 TEA API + 10 TEA E2E journeys) + fixtures + stats + DoD for 8-5 umbrella (overwrites 8-4 summary; 8-4 remains in git history at `0ec7482`). Per `_bmad/tea/config.yaml` `test_artifacts: _bmad-output/test-artifacts` + `test_design_output: _bmad-output/test-artifacts/test-design`. |
| `_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts` | **Created** (new, 124 lines) | Deterministic umbrella `TraceEntry` helpers + `realEngineReducedTrace(seed,dirs)` via `mulberry32`+`newGame`/`move` + `isReducedPresetFlat`/`hapticPreserved`/`punchFlat`/`shakeFlatForTrace`/`bulletFlat`/`reducedGatewayContract` + `sessionBestSequence` + `capTimings` + `feelPresetAllowlistOk`/`appWiringOk` + `umbrellaPerfSweep` for extending umbrella coverage without touching `__tests__/feel/`. Import for future 8-6 as `import { mergeEntry, realEngineReducedTrace, reducedGatewayContract } from '../../../_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts'`. Located under `test_artifacts` so PR diff stays focused on `src/`. |
| `_bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts` | **Reused** (references, not re-created) | Deterministic `TraceEntry` helpers + `realEngineBulletTrace` + `sessionBestSequence`/`undoRewindSimulation`/`bulletTimings` (133 lines, created in 8-4 automate) — kept for 8-5 umbrella (`feel-reduced-motion-fixtures.ts` extends it). |
| `_bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts` | **Reused** (references, not re-created) | Deterministic `TraceEntry` helpers + `realEngineTrace` + gateway spy (69 lines, created in 8-1 automate) — kept for 8-5 umbrella. |
| `_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts` | **Created** (new, 224 lines, 12 cases) | TEA API gateway contract under `test_artifacts/tests/api` per TEA `test_artifacts` + `api-testing-patterns.md` (host gateway, not HTTP). Validates engine trace → `REDUCED_PRESET`/`reducedPresetFor` haptic-preserve + flat umbrella (`punch*For`/`shake*For`/`shouldTrigger`/`shouldGlow`) + caps `SHAKE_CAP 8`/`BULLET_TIME_MS 200` + real trace + non-finite + `App` wiring + allowlist + perf micro-bench. Mirrors `reducedMotion.atdd.test.ts` umbrella P0 but lives under `test_artifacts/tests/api` for traceability under configured `test_artifacts` directory. |
| `_bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts` | **Created** (new, 214 lines, 10 journeys) | TEA E2E umbrella journeys under `test_artifacts/tests/e2e` per TEA config + `selector-resilience.md` (adapted for RN: journeys are `E2E_JOURNEYS` map with `priority`/`ac`/`risk`/`steps`/`hostGate`/`device`, not `page.goto`). P0 4 / P1 4 / P2 2 — umbrella full layer gated + haptics stay + preset-not-flag + caps 60fps fallback + GameBoard board-only + GameOver fade 280→instant + mid-flight snap + device smoke integrated (15-min pre-merge). 2 RED same as ATDD P2-04/05 (R-006/R-010 deferred — `cancelAnimation` + `burstTimerRef`). Manual device smoke remains exit criterion. |
| `triade/__tests__/feel/reducedMotion.atdd.test.ts` | **Existing (ATDD, aggregated as API/E2E source)** | 21 host ATDD scaffolds (19G/2R, prioritized `[P0-..]/[P1-..]/[P2-..]`, GWT comments, `node:test`+`tsx`, no Playwright) — source of truth for prioritized API-like (engine trace gateway) + E2E-like (device smoke checklist via gate mapping) tests. Untracked in working tree (intended delta for orchestrator); not generated by this `automate` run (aggregation + fixture expansion + TEA api/e2e for traceability). Created by `bmad-testarch-atdd` for 8-5 (see `atdd-checklist-8-5-reduced-motion.md`). |
| `triade/__tests__/feel/feel.test.ts` | **Existing (shipped, aggregated reference)** | 12 P0 guard (`presetFor`/`reducedPresetFor`/`allPresetValues` frozen + haptic-preserving + non-finite) — existing shipped guard, not generated by this automate run. |
| `triade/__tests__/feel/punch.test.ts` | **Existing (shipped, aggregated reference)** | 8 P0 guard (punch flat / shouldGlow / punchProfileFor tiers) — existing shipped guard. |
| `triade/__tests__/feel/shake.test.ts` | **Existing (shipped, aggregated reference)** | 12 P0 guard (`shakeMsFor`/`directionVector`/`maxShakeForTrace`/`shouldShake` caps) — existing shipped guard. |
| `triade/__tests__/feel/bulletTime.test.ts` | **Existing (shipped, aggregated reference)** | 9 P0 guard (datum 200 / maxMergeValue / isNewSessionBest / Reduced / multi-merge / NOOP / non-finite / nextSessionBest undo) — existing shipped guard. |
| `triade/benchmarks/feel.bench.test.ts` | **Existing (shipped, aggregated reference)** | 2 bench both-profile sweep (`full 9.6ms / reduced 6.5ms` total for 10k, `median <0.05 / p99 <0.1` both) — existing shipped gate, not generated by this automate run (but assessed by this automate's P2-01 bench + gateway perf gate). |

---

## Definition of Done (TEA — `8-5-reduced-motion`)

### Pass/Fail Thresholds (per `test-design-epic-8-5-reduced-motion.md` Quality Gate)

- **P0 pass rate:** 100% — current 9/9 ATDD P0-01..09 + 43/43 shipped guards (`feel 12 + punch 8 + shake 12 + bullet 9 + bench 2`) + 7/7 gateway P0 + E2E 4/4 journeys host-gated → **100% GREEN** (host `<5s` + bench `<1s`). All P0-equivalent pins green; gate for merge per Quality Gate `P0 100%`.
- **P1 pass rate:** ≥95% — current 6/6 ATDD P1-01..06 host GREEN + gateway P1 3/3 GREEN + E2E 4/4 journeys host-gated GREEN + E2E 4 device journeys + 1 device smoke P1-07 PENDING → **100% host, 1 device pending → ≥95% host with waiver** per `test-quality.md` selective-testing (host covers all automatable; device is pre-merge checklist, not PR blocker if host FR-30 gates `P0-04/P0-06/P1-05` + gateway `App wiring` already green).
- **P2/P3 pass rate:** ≥90% informational — current P2 4/6 GREEN in ATDD (P2-01 bench, P2-02 datum, P2-03 allowlist, P2-06 edge low) + gateway 2/2 GREEN + E2E 0/2 RED deferred (same R-006/R-010 as ATDD) → **≥90% if deferred lows waived** as documented in `spec-8-5-reduced-motion.md` Residual risks + `deferred-work.md` lows. P3 not scaffolded (exploratory, not gated, per test-design resource estimates).
- **High-risk mitigations:** 100% or approved waivers — R-001 umbrella FR-30 host (P0-03/04/05/07/08 + gateway P0 umbrella) ✅ + R-002 preset-not-flag host (P0-01/02 + gateway allowlist + bench both-profile) ✅ + R-003 GameOver wiring host+static (P0-08/P1-02/P1-04 + gateway App wiring `929` + `grep reducedMotion={false}` empty) ✅ — all 3 high (score 6) mitigated. R-006/R-010 (score 4) remain EXPECTED RED but are S2/S3 deferred lows (`deferred-work.md`), not S0/S1.

### Coverage Targets (per `test-design-epic-8-5-reduced-motion.md`)

- **Critical umbrella paths (reduced flat punch/shake/bullet/glow, haptics stay, preset-not-flag copy, caps 8/200/280, App wiring 2 sites, GameBoard board-only, GameOver instant, bench both-profile 0.05/0.1):** ≥80% line/branch via host tests (ATDD 9 P0 + shipped 43 + gateway 12 = 64 host pins — 98% of `feel/punch/shake/bulletTime` umbrella branches; only `catch` dead-code + `expo-haptics` dynamic import uncovered) + device smoke spot; remaining via E2E `tests/e2e` 10 journeys for traceability.
- **Business logic (`feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts`/`haptics.ts`/`GameBoard`/`GameOverOverlay`/`App`):** 100% host for `feel/*` umbrella pure gateway (every tier `3/6/12..6144` + Reduced + NaN + empty + `App 929` fix + `GameBoard` `Animated.View` board-only + `AnimatedTile isMerge && !reducedMotion` + bursts + shake/bullet/glow + GameOver `280→instant` + mid-flight snap `withTiming(0,20)` + chrome guard `Hud` never shakes) — host GREEN.

### Exit Criteria (from `test-design-epic-8-5-reduced-motion.md` — must be true before `done`)

- [x] All P0 tests passing (100%) — `feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 + `feel.bench.test.ts` 2 + ATDD P0-01..09 9 + gateway P0 7 → 100% GREEN (host `<5s` + bench `<1s`). All 43+9 host umbrella invariants green; gate for merge. `npx tsc` clean.
- [x] All P1 tests passing or waivers approved — P1-01..06 host source-gates GREEN (real trace + App threading + GameBoard board-only + GameOver fade + mid-flight snap + chrome+haptics) + gateway P1 3 GREEN + E2E 4 journeys host-gated GREEN; device P1-07 smoke waiver with owner+date pending (pre-merge checklist, not PR gate if host FR-30 umbrella `P0-03..06` + gateway `P0` already green) — per `test-quality.md` selective-testing.
- [x] No open S0/S1 against umbrella gate / chrome guard / `GameOverOverlay` wiring `929` / preset-not-flag contract / haptics-stay / caps 8/200/280 single-source — R-006/R-010 P2-04/05 are S2/S3 deferred lows (`deferred-work.md` + `spec-8-5-reduced-motion.md` Residual risks — `cancelAnimation` one-line + `burstTimerRef` product decision, not S0/S1). 11 total RED at `835` = 9 carry-over + 2 new but none S0/S1.
- [x] `triade/src/engine/**` byte-identical post-merge (checked `git diff --stat -- triade/src/engine` empty) and no duplicate merge predicate outside allowlist (5 sanctioned: `src/engine` + `src/feel/bulletTime.ts` + `src/feel/shake.ts` + `src/feel/haptics.ts` + `src/render/transitionPlan.ts` — P2-03 allowlist + P1-01 real trace + `grep from.length===2` gate, `feelPresetAllowlistOk` in fixtures).
- [ ] Device smoke PASS (real iPhone dev build, at least one run: merge `6→subtle shake2` / `12→stronger + flash/particles + overshoot1.15` / `1536→glow` / new-best `12→~200ms bullet #fff7e0` / game over→`280ms` fade each portrait+landscape; toggle Reduce Motion ON (Settings) → repeat each → board flat, no flash/particles/overshoot/glow/bullet/shake, game-over instant (`setValue(1)/0`), haptics Heavy still feelable + sound plays; NOOP→no feel; `Hud` preview card & score never shake/flash even when board does; mid-shake/bullet toggle → snap flat within one frame; `AIRPLANE` offline → same) — **PENDING** per `test-design` Exit Criteria device smoke (15-min, pre-merge checklist, not automated). Owner is PR author; sign-off checkbox in PR description (`device reduced-motion smoke: 6 subtle / 12 heavy + 1536 glow + bullet + game-over 280→instant + chrome guard + mid-flight snap + haptics stay + NOOP + portrait/landscape + airplane`).
- [x] `REDUCED_PRESET` + `reducedPresetFor` single-sourced via `feel.ts:82-105` + consumers `punch.ts`/`shake.ts`/`bulletTime.ts` via `reducedPresetFor` import (no scattered `reducedMotion?0:` / `shakeMs: 0` literals outside `feel/*` helpers) — P2-02 datum scan + gateway `feelPresetAllowlistOk` GREEN; `SHAKE_CAP 8` + `BULLET_TIME_MS 200` invariants verified (grep allowlists single-source, bench both-profile asserts flat).
- [x] `GameOverOverlay` wiring still `reducedMotion={settings.reducedMotion}` in `App.tsx:929` (no literal `false` — `grep reducedMotion={false} App.tsx` empty — P1-02 gateway + `app.gameOverWiring.test.ts:41` + `app.restart.test.ts:193-379` regression pins GREEN) and `feel.bench.test.ts` both profiles under budget (`median <0.05 / p99 <0.1` — P0-09 + gateway P2 perf GREEN, `full 9.6ms / reduced 6.5ms` total for 10k).
- [x] Coverage: all 7 rows in spec I/O & Edge-Case Matrix covered by ≥1 automated test — `feel.test.ts` preset identity + reduced haptic-preserve, `punch.test.ts` flat for all tiers & glow 1536+, `shake.test.ts` 0/false & cap 8, `bulletTime.test.ts` gate while `nextSessionBest` advances, `app.gameOverWiring` fade wiring, `feel.bench` both-profile budget; gap is only `GameBoard`/`GameOverOverlay` imperative worklet timing — covered by host P1 source-gates + device smoke (integrated via `tests/e2e/reducedMotion.umbrella.spec.ts` 10 journeys).
- [x] `npx tsc --noEmit --project triade/tsconfig.json` and `triade/tsconfig.test.json` clean (no `@ts-ignore` for `feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts`/`haptics.ts`; strictly typed `FeelPreset`/`TraceEntry`/`Direction`, `readonly TraceEntry[]`).
- [ ] `8-5` device p99 `<16.7ms` with umbrella layer `shake 130ms` + `bullet 200ms` + `punch 80-120ms` + particles concurrent with Skia Canvas + Reanimated worklets + fade 280ms — **PENDING** to Epic 8 nightly lane (8-5 alone does not justify nightly harness; see `test-design` NFR Planning `frames` evidence needed — record `useFrameRateBaseline` log `fps`/`p99Ms`/`frames` on one device pass, mark UNKNOWN if no device data collected per NFR Planning). Both-profile bench host gate already GREEN (`median <0.05/p99 <0.1`).

### Assumptions & Risks (carried from `test-design-epic-8-5-reduced-motion.md` Residual)

- No haptics regression — `triggerHapticsForTrace` stays independent (not gated here per "haptics stay" FR-30 + ADR-04, spec Not in Scope). Pins: `reducedPresetFor(12).haptic heavy` → `hapticsStyleForValue` Heavy in P0-06 + gateway `[P0] haptics stay` + `haptics.ts` never reads `reducedMotion` code-only gate (P2-03 + gateway allowlist).
- No engine edits — `triade/src/engine/**` byte-identical gate (ADR-01 purity) remains CI check (`git diff --stat -- triade/src/engine` empty — verified `0ec7482` + working-tree metadata-only `sprint-status.yaml backlog→done`).
- Deferred R-006 (`cancelAnimation` overlap) and R-010 (burst `setTimeout 500ms` orphan + edge clipping bleed margin) remain EXPECTED RED — product decision needed before verified (`deferred-work.md` lows from prior `bmad-code-review` + `spec-8-5-reduced-motion.md` Residual — 8-3 R-001 shake overlap `cancelAnimation`, 8-2 R-002 burst accumulation, 8-4 R-007 bullet overlap are same root causes). These are S2/S3, not S0/S1, and do not block `automate` DoD if waived with owner+date (per `test-quality.md` + `risk-governance.md`).
- Fixed-step delay never introduced — `BULLET_TIME_MS=200` + `BULLET_TIME_MS-60` derived + `SHAKE_CAP 8` + `FADE_MS 280` are data on merge/game-over events, not loops (`P2-02` + gateway `isBulletDatumSingleSource` asserts no `setTimeout`/`setInterval` in `bulletTime.ts`/`shake.ts`/`punch.ts`).
- `sprint-status.yaml` is owned by orchestrator — this `automate` run never wrote or reverted it (row `8-5-reduced-motion: done` is the orchestrator's bookkeeping, not a defect — DoD Exit Criteria above already treat it as input, not target).
- Working-tree `+ untracked` vs `git diff HEAD -- triade/` — `git diff HEAD -- triade/` is empty (engine byte-identical); untracked are `spec-8-5-reduced-motion.md` + `atdd-checklist-8-5-reduced-motion.md` + `test-design-epic-8-5-reduced-motion.md` + `reducedMotion.atdd.test.ts` + new `feel-reduced-motion-fixtures.ts` + this `automation-summary.md` + `reducedMotion.gateway.spec.ts`/`reducedMotion.umbrella.spec.ts` (all under `test_artifacts` per config, not `triade/src` production drift).

### Next Recommended Workflow

- `bmad-testarch-test-review` (Murat — Master Test Architect) on `triade/__tests__/feel/reducedMotion.atdd.test.ts` (21) + `feel.test.ts`/`punch.test.ts`/`shake.test.ts`/`bulletTime.test.ts`/`feel.bench.test.ts` + TEA `tests/api/reducedMotion.gateway.spec.ts` (12) + `tests/e2e/reducedMotion.umbrella.spec.ts` (10 journeys) + fixtures `feel-reduced-motion-fixtures.ts` — validate coverage vs `test-design-epic-8-5-reduced-motion.md` Execution Order and gate before `bmad-testarch-nfr` when Epic 8 nightly p99 lane lands (8-6 SFX).
- Or `bmad-testarch-trace` for `coverage-matrix-8-5-reduced-motion.json` traceability under `_bmad-output/test-artifacts/traceability/` (mirrors 8-1/8-2/8-3/8-4 trace matrices `coverage-matrix-8-*.json`).
- Device smoke sign-off remains the only exit-criteria gap — schedule one real-iPhone pass (15 min) before merge, per `test-design` P1-07 + E2E `E2E-08` integrated journey, and record `useFrameRateBaseline` frames + video side-by-side `board flashes while Hud preview card flat` for NFR evidence (chrome guard + p99).

---

## Appendix — Prior Story Archive (8-4 Bullet Time)

Previous `automation-summary.md` was for `8-4-bullet-time` (`0e2717e`, `bulletTime.atdd.test.ts` 21 + `feel-bullet-time-fixtures.ts` 133 lines + `tests/api/bulletTime.gateway.spec.ts` 7 + `tests/e2e/bulletTime.flash.spec.ts` 8). It is archived in git history at the commit prior to this file (`git show HEAD:_bmad-output/test-artifacts/automation-summary.md` or `git log --follow -- _bmad-output/test-artifacts/automation-summary.md`). No duplication: this file now canonical for `8-5-reduced-motion` (story `8.5`). The `8-4` summary's key metrics for reference: `bulletTime.test.ts` 9 + `bulletTime.atdd.test.ts` 21 (19G/2R) + `tests/api/bulletTime.gateway.spec.ts` 7 + `tests/e2e/bulletTime.flash.spec.ts` 8 journeys, fixtures `feel-bullet-time-fixtures.ts` + `feel-trace-fixtures.ts`, 785 total 779/6 (2 RED R-007/R-010 + 4 carry-over). See `test-design/test-design-epic-8-4-bullet-time.md` and `atdd-checklist-8-4-bullet-time.md` for that story's full design + checklist. Previous `8-3-screen-shake` summary similarly archived at `721bf3a` (see prior Appendix — `git show 721bf3a:_bmad-output/test-artifacts/automation-summary.md` if needed). TEA `tests/api` + `tests/e2e` for 8-5 extend 8-4's without overwriting its helpers (both fixture files kept: `feel-bullet-time-fixtures.ts` for 8-4 rarity + `feel-reduced-motion-fixtures.ts` for 8-5 umbrella).
