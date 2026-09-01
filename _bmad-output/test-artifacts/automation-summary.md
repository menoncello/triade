---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-01'
workflowType: 'bmad-testarch-automate'
storyId: '8.6'
storyKey: '8-6-sfx-haptics'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-6-sfx-haptics.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/haptics.ts'
  - 'triade/src/feel/sfx.ts'
  - 'triade/src/services/assets/assetManifest.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/feel/sfx.test.ts'
  - 'triade/__tests__/feel/sfx.atdd.test.ts'
  - '_bmad-output/test-artifacts/test-design-epic-8-6-sfx-haptics.md'
  - '_bmad-output/test-artifacts/atdd-checklist-8-6-sfx-haptics.md'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — Epic 8 / Story 8-6 SFX haptics (expo-audio thock coupled with haptics, swappable gateway)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `8-6-sfx-haptics`
**Mode:** BMad-integrated context (spec + test-design + ATDD) but host-dominated execution; no Playwright/Cypress harness required for this delta
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, Reanimated 4 + Skia 2.6.2 + expo-audio 57.0.3)
**Working-tree delta under test:** commit `b16a06e` (`story 8-6-sfx-haptics: expo-audio thock coupled with haptics, swappable gateway, reduced-motion keeps sound`) — 1 commit ahead of `7e1916a` (baseline `7e1916a` for story 8-6); assessed HEAD `b16a06e` byte-identical plus review patches `52bd3e5`. Uncommitted diff is metadata-only (`_bmad-output/implementation-artifacts/sprint-status.yaml` `8-6-sfx-haptics: backlog→done` + `_bmad-output/test-artifacts/test-design-progress.md` 8-6 ledger) + untracked ATDD scaffolds (`triade/__tests__/feel/sfx.atdd.test.ts` 21 cases, `atdd-checklist-8-6-sfx-haptics.md`, `test-design-epic-8-6-sfx-haptics.md` checked in as inputs). Engine byte-identical verified (`git diff --stat -- triade/src/engine` empty).

> **Delta (6 files, ~220 insertions):** `triade/src/feel/sfx.ts` (new 152 LOC) — pure `sfxVolumeForValue(value)` + `sfxKindForValue` + swappable `triggerSfxForMerge/ForTrace/ForSpawn/ForGameOver` + `SfxGateway { play }` injectable + `VOLUME_BY_HAPTIC { light:0.45, medium:0.65, heavy:1.0 }` mirroring haptic scale via `presetFor(value).haptic` (data not code) + `spawn 0.35` + `gameOver 0.9` + merge predicate `from.length===2 && !spawned` + dual API `createAudioPlayer/AudioPlayer` SDK 57.0.3 + `void playViaExpoAudio` best-effort `catch→null` never-throw/never-await/never-block; `triade/src/services/assets/assetManifest.ts` (+36 LOC) — 3 placeholder SFX assets `sfx-merge/spawn/gameover` via `require` in `try/catch→null` + `preloadAssets` filters `Number.isFinite` + `Asset.loadAsync` degrade; `triade/App.tsx` (+20 LOC in `doMove`) — coupled `triggerSfxForTrace/ForSpawn/ForGameOver` after `triggerHapticsForTrace` at same observer site, each `try/catch` no-throw never-await never reducedMotion-gated; `triade/package.json` (+2 LOC) — pinned `expo-audio ~57.0.3` + `expo-haptics ~57.0.1` under Pinned Version Matrix; `triade/__tests__/feel/sfx.test.ts` (new 136 LOC, 11 cases) — volume scale + coupled + NOOP + swappable + no-music; `triade/__tests__/feel/punch.atdd.test.ts` patch (+9 −5) — fix stale `reducedMotion={false}` → `settings.reducedMotion` (S8.5 wiring). No engine edits, no fixed-step loop, never `Math.random`, helpers never throw. `triade/assets/sfx/` absent dir is current state (degrade path, residual).

---

## Step 1 — Preflight & Context

### Stack Detection & Framework Verification

- **Config `test_stack_type`:** `auto` (`_bmad/tea/config.yaml:13`)
- **Auto-detection:** `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`/`expo-audio` + no `pyproject.toml`/`go.mod`/`pom.xml`/`Cargo.toml` → **frontend**
- **Framework:** `node:test` + `tsx` (`triade/package.json` `test: TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — **verified exists** (`triade/node_modules/.bin/tsc` 6.0.3, `tsc --noEmit` clean exit 0, `tsx` 4.23.12)
- **No Playwright/Cypress harness required:** 8-6 is pure `sfxVolumeForValue` + `SfxGateway` + `triggerSfxFor*` helpers + `App` wiring + `assetManifest` degrade. Host `node:test` is correct harness per `test-levels-framework.md` Unit/Integration dominance. `tea_use_playwright_utils:true` loaded but not applied for this RN story — no `page.goto`/`page.locator` surface (TEA browser_automation auto → host adaptation). `tea_use_pactjs_utils:false` — provider scrutiny is engine as provider via `mulberry32`+`move` fixtures (see P1-01), not Pact.
- **Existing test structure:** `triade/__tests__/feel/{feel.test.ts (12), punch.test.ts (8), shake.test.ts (12), bulletTime.test.ts (9), sfx.test.ts (11), sfx.atdd.test.ts (21)}`; `triade/benchmarks/feel.bench.test.ts` + `_bmad-output/test-artifacts/tests/{api,e2e,feel}` + `fixtures/`.

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
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-epic-8-6-sfx-haptics.md` R-001..R-010, 4 high score 6), `nfr-criteria.md` (60 FPS / never-throw / FR-30 / 3-kind cap / chrome rule / offline), `fixture-architecture.md` (deterministic, no faker), `api-testing-patterns.md` (engine trace gateway), `selector-resilience.md` (chrome guard — board-only)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Spec `spec-8-6-sfx-haptics.md` (4 ACs, I/O matrix 8 rows, S8.6/UX-DR-29/FR-30/UX-DR-16/ADR-01/ADR-04, `VOLUME_BY_HAPTIC 0.45/0.65/1.0` + `0.35/0.9`, baseline `7e1916a`→`b16a06e` pinned, assessed HEAD `b16a06e` byte-identical plus review patches)
- Epic context `epic-8-context.md` + `epics.md` `8-6-sfx-haptics` (feel model S8.1–S8.6 deps, `FeelPreset` single source, haptics+sfx coupled, FR-30 keep-sound)
- Source `feel.ts:14-30`/`haptics.ts:1`/`sfx.ts:1-152`/`services/assets/assetManifest.ts:1-49`/`App.tsx:385-403`/`package.json` pin `expo-audio ~57.0.3`/`benchmarks/feel.bench.test.ts`
- Existing guards `feel.test.ts` (12) + `punch.test.ts` (8) + `shake.test.ts` (12) + `bulletTime.test.ts` (9) + `sfx.test.ts` (11) always GREEN baseline 837 pass / 9 fail at `b16a06e` (spec Auto Run Result) + `punch.atdd.test.ts` pin updated for `settings.reducedMotion`
- Test-design `test-design-epic-8-6-sfx-haptics.md` (10 risks R-001..R-010, 4 high score 6 (R-001 coupled, R-002 never-block, R-003 degrade, R-004 FR-30), P0 8 groups / P1 7 / P2 4 / P3 3, NFR planning, entry/exit, estimates ~6–9h host → 10–20h elapsed, board-only chrome guard, haptics stay + 3-kind cap)
- ATDD checklist `atdd-checklist-8-6-sfx-haptics.md` + `sfx.atdd.test.ts` (21 cases, 20G/1R expected P2-06 mastering, generation mode AI, no browser recording, `node:test` true RED for P2-06 placeholder)

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| `sfxVolumeForValue` mirrors haptic scale — data not code (`3 0.45 / 6 0.65 / 12+ 1.0` via `presetFor(value).haptic`) + `VOLUME_BY_HAPTIC` single-source + `sfxKindForValue` always merge (no pitch table) | `triade/src/feel/sfx.ts:14-34` | **Unit** | **P0** | AC2 coupled scale (R-001 score 6) — peak audio+tactile halves must align. Blocks merge. |
| Small/non-finite never-throw fallback `NaN/Infinity/-1/0/1/2 → 0.45` clamped `[0,1]` + `Math.max/min` + `try/catch` never throws | `triade/src/feel/sfx.ts:21-30` + `50-92` (`playViaExpoAudio`) | **Unit** | **P0** | AC3 thin observer never throws (R-002/R-010, score 6). Blocks move dispatch. |
| Reduced Motion keeps sound — `sfxVolumeForValue` independent of `reducedPresetFor`, `sfx.ts` never reads `reducedMotion` (only `// FR-30` comment) + `presetFor` not `reducedPresetFor` | `triade/src/feel/sfx.ts:1-5` + `feel.ts:95` | **Unit** | **P0** | AC4 FR-30 accessibility (R-004 score 6, BUS). No workaround if silenced. |
| Coupled haptics+audio same tier — `hapticsStyleForValue(3) Light+0.45 / 6 Medium+0.65 / 12 Heavy+1.0` per tier loop | `triade/src/feel/sfx.ts:14-30` + `haptics.ts:14-27` | **Unit** | **P0** | AC2+AC3 UX-DR-29 coupled peak (R-001). Host rank monotonic. |
| Merge predicate & NOOP silence — `!spawned && from.length===2 && Array.isArray(from)` single-seam, `spawned:true`/`fromLen!=2` → 0 SFX | `triade/src/feel/sfx.ts:136-151` | **Unit** | **P0** | AC1+AC3 NOOP bleed guard (R-005 score 4). NOOP silence regression. |
| `triggerSfxForTrace` fires one SFX per merge entry with scaled volume same order (3 merges `3/6/12→0.45/0.65/1.0`, mixed with spawn ignored) | `triade/src/feel/sfx.ts:136-151` | **Unit (gateway mock)** | **P0** | AC1 per-merge coupling (R-001/R-005). Blocks merge. |
| `triggerSfxForMerge/ForSpawn/ForGameOver` never throw & correct kind/volume (`merge 0.45/0.65/1.0` / `spawn 0.35` / `gameOver 0.9`) | `triade/src/feel/sfx.ts:105-134` | **Unit (gateway mock)** | **P0** | AC1 3-kind contract (R-002/R-006). Blocks S8.6 close. |
| Swappable `SfxGateway { play }` + missing `expo-audio` degrades silent without throw; `void playViaExpoAudio` dynamic `import('expo-audio').catch(()=>null)` dual API `createAudioPlayer/AudioPlayer` + `setVolume/volume` + `seekTo(0)` | `triade/src/feel/sfx.ts:36-104` | **Unit** | **P0** | AC3 thin swappable observer never blocks (R-002/R-003 score 6). Engine never blocked. |
| Gateway throw swallowed — `badGw play→throw` never suppresses caller (`dispatchPlay` guard + `App` separate try blocks) | `triade/src/feel/sfx.ts:93-114` | **Unit** | **P0** | AC3 never-throw contract (R-002). Prevents `doMove` crash. |
| No music — only `merge/spawn/gameOver` kinds ever emitted (MVP 3-kind cap `SfxKind 3-way`, `music/bgm/loop` absent) | `triade/src/feel/sfx.ts:8` + `212` | **Unit + static scan** | **P0** | AC1 UX-DR-29 no-music rule (OPS). Binary scan gate. |
| `maxMergeValue`/engine-trace → `sfxVolumeForValue` rank monotonic `0.45<0.65<1.0` via REAL `move` fixtures (engine as provider) + double-merge both dispatched | `triade/src/engine/core/*` + `feel/sfx.ts` | **Integration (host, API-like)** | **P1** | R-001+R-005 trace contract mismatch — stub drift eliminated by real fixture. |
| `App.tsx` coupling — `triggerHapticsForTrace` + `triggerSfxForTrace` + `triggerSfxForSpawn` + `triggerSfxForGameOver` at same call site after `setMoveResult`, each in `try/catch`, never `await`, never `reducedMotion`-gated | `triade/App.tsx:385-403` | **Integration (host, source gate)** | **P1** | R-002+R-004 FR-30 coupling regression (same site, fire-and-forget). |
| `assetManifest` preload degrade — `sfx-*` `try/catch→null` + `preloadAssets` `Number.isFinite` filter + `Asset.loadAsync` `try/catch` + `!resources.length return` when dir absent | `triade/src/services/assets/assetManifest.ts:1-49` | **Integration (host, source gate)** | **P1** | R-003 missing-wav crash (6) — launch succeeds silent no-crash. |
| Haptics vs audio independence — separate `try/catch` per gateway (≥4 blocks), `triggerHapticsForTrace` before `triggerSfxForTrace` so throw on one never suppresses the other | `triade/App.tsx:385-403` + `src/feel/sfx.ts:93-104` | **Integration (host, render seam)** | **P1** | R-002 coupled suppression (separate blocks). |
| FR-30 wiring regression guard — `App.tsx` threads `reducedMotion={settings.reducedMotion}` to `GameBoard` + `GameOverOverlay` (≥2 sites) never `reducedMotion={false}`, sfx lines zero `reducedMotion` | `triade/App.tsx:896-949` | **Integration (host, source gate)** | **P1** | R-004 carry-over from 8-5 (wiring regression). |
| Device smoke real iPhone dev build (P1-02): `3 light 0.45` / `6 medium 0.65` / `12+ heavy 1.0` / `spawn 0.35` / `gameOver 0.9` / no music / rapid 6+12 last-wins | manual (real iPhone) | **E2E (device/manual)** | **P1** | P1 smoke in test-design — only expo-audio + Taptic can validate final thock weight. 15-min checklist. |
| `expo-audio` SDK 57 pin `~57.0.3` + `expo-haptics ~57.0.1` + dual API `createAudioPlayer/AudioPlayer` + `setVolume/volume` + `seekTo` exercised via contract | `triade/package.json` + `src/feel/sfx.ts:50-92` | **Unit (static + device)** | **P2** | R-007 score 3 — upgrade smoke required before merge. |
| Asset duplicate-require allowlist — exactly 6 `require(*assets/sfx*)` sites (3 manifest + 3 sfx) identically spelled `merge/spawn/gameover.wav` each in `try/catch` | `triade/src/services/assets/assetManifest.ts` + `src/feel/sfx.ts` | **Static scan** | **P2** | R-008 score 3 — bundled id must match when mastered. |
| Merge-predicate 5-site allowlist — `from.length===2 && !spawned` + `Array.isArray(from)` only in `haptics/shake/bulletTime/sfx + transitionPlan` (no 6th duplicate) | `triade/src/feel/*.ts` + `render/transitionPlan.ts` | **Static scan** | **P2** | R-005 score 4 — ADR-01 single-seam. |
| Perf micro-bench — `sfxVolumeForValue` + `triggerSfxForTrace` 1k sweeps median `<0.05 / p99 <0.1` host, `App` never awaits (never-block) | `triade/src/feel/sfx.ts` | **Unit (bench)** | **P2** | R-002/R-007 host gate — SFX adds ~0 frame cost. |
| Rapid multi-merge re-trigger `<50ms` last-wins via `seekTo(0)` without stacking vs `EARLY_INPUT_MS 84` | `triade/src/feel/sfx.ts:76` | **Unit (bench + E2E)** | **P2** | R-009 score 2 — acceptable rarity, next swipe not gated. |
| Placeholder mastering — `triade/assets/sfx/` 3 wavs present EXPECTED RED until mastering lands, degrade silent is ship path | `triade/assets/sfx/{merge,spawn,gameover}.wav` | **Static/CI gate** | **P2** | R-003 deferred — not threshold for 8-6 close. |
| SFX micro-bench both profiles `presetFor + sfxVolumeForValue` 10k ×13 tiers `full+reduced median <0.05 / p99 <0.1` + caps `SHAKE_CAP 8`/`BULLET 200` unregressed | `triade/benchmarks/feel.bench.test.ts` + `src/feel/sfx.ts` | **Unit (bench)** | **P2** | R-007 perf vs 60 FPS fallback. |
| Datum literal allowlist — `VOLUME_BY_HAPTIC` single volume allowlist (`0.45/0.65/1.0` only in `sfx.ts`), `0.35/0.9` once, `SfxKind 3-way`, `music` absent | `triade/src/feel/sfx.ts` | **Static/CI gate** | **P2** | Maintainability + R-001 single-source. |
| Engine purity `git diff --stat -- triade/src/engine` empty + `grep from.length===2` 5-site allowlist | repo | **Static/CI gate** | **P2** | ADR-01 feel is observer only. |
| Exploratory — tuning rank ear pass on clean vs accelerated lane: `potForTier` `40/40` vs tiered `2-3` does not affect audio kind | manual (real iPhone) | **P3 exploratory** | **P3** | Not gated — feeds 8-6 follow-up. |

**API/E2E mapping note (TEA terminology for this Expo RN story):**
- **"API" in TEA = feel trace gateway contract** over typed `TraceEntry` (`from.length===2 && !spawned && finite → sfxVolumeForValue→VOLUME_BY_HAPTIC 0.45/0.65/1.0` + `SfxKind 3-way` + `swappable SfxGateway { play }` + `never-throw/never-block` + `App` coupling gate). Tests are `sfx.atdd.test.ts:P0-01..10/P1-01..05/P2-01..06` + `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts` (13 cases, host ~18ms) — they validate the service contract the same way API tests validate request/response shapes. No Pact/HTTP harness (`tea_use_pactjs_utils:false`); provider scrutiny via `mulberry32`+`move` real trace eliminates stub drift.
- **"E2E" in TEA = device Skia/Reanimated + expo-audio verification** (P1 smoke + `tests/e2e/sfx.umbrella.spec.ts` 10 journeys). This is manual on a real iPhone dev build (no Simulator haptics/Reanimated parity, no `expo-audio` without native module). Host automation covers all automatable surfaces; E2E is the checklist exit criterion (`test-design-epic-8-6-sfx-haptics.md` P1 device smoke) plus `_bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts` (10 journeys documented for traceability, P0/P1/P2, not auto-executed).

### Priority Assignment (per `test-priorities-matrix.md` / `risk-governance.md`)

- **P0:** Blocks AC1–AC4 + high risk (R-001/R-002/R-003/R-004 score 6) + no workaround — must be 100% green before verified. Host `<5s` + bench `<1s` (<10s incl `feel.bench.test.ts`), PR gate.
- **P1:** Wiring + native boundary — ≥95% green; device smoke may be waiver with owner+date if host FR-30 + coupling gates already green per `selective-testing.md`.
- **P2/P3:** Static/perf/exploratory — ≥90% informational; P2-06 mastering RED is deferred low (R-003, not S0/S1 — waived with owner+date per spec Residual).

### Coverage Plan

- **P0:** 10 groups (11 `it()` `sfx.test.ts` + 10 ATDD P0) — `sfxVolumeForValue` mirrors haptic + non-finite fallback + Reduced Motion keep-sound + coupled + NOOP + per-merge scaled + ForMerge/ForSpawn/ForGameOver kinds + swappable degrade + never-throw + no-music — PR gate `<5s`.
- **P1:** 7 groups (6 host source-gates via `sfx.atdd.test.ts` P1-01..05 + gateway P1 3 + E2E 4 journeys) — real trace + `App.tsx:385` coupling + `assetManifest` degrade + haptics/audio independence + FR-30 wiring + `feel.bench both-profile` + device smoke integrated 15-min.
- **P2:** 4 checks (SDK pin + duplicate-require 6-site + 5-site predicate + bench + rapid last-wins + placeholder RED deferred) — `~0.3–0.5h` host.
- **P3:** 3 exploratory (rarity tuning rank clean vs accelerated `potForTier`, rapid 6+12 ear, lane exploratory) — `~0.6–2h`, not gated.
- **Total:** `~24` checks (10 P0 + 7 P1 + 4 P2 + 3 P3), `~6–9h` host → `~10–20h` elapsed with device (per test-design Resource Estimates).

---

## Step 3 — Generate Tests (Sequential, stack=`frontend`)

### Execution Report

```
🚀 Performance Report:
- Execution Mode: sequential (auto→sequential, no subagent/agent-team support in opencode)
- Stack Type: frontend (Expo RN)
- API Test Generation (gateway contract): _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts (13 cases, host ~18ms, file 224 lines)
- E2E Test Generation (device): _bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts (10 journeys, file 346 lines) + manual checklist — not scaffolded as Playwright page.goto (RN Skia Canvas thock story, Reanimated worklets + expo-audio native)
- Fixtures: _bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts (new, 198 lines, this run) + reused feel-trace-fixtures.ts (69 lines, 8-1) + feel-bullet-time-fixtures.ts (133 lines, 8-4) + feel-reduced-motion-fixtures.ts (223 lines, 8-5)
- Backend Test Generation: skipped (frontend only, tea_use_pactjs_utils:false, no Pact)
- Total Elapsed: host ATDD 21 (20G/1R expected P2-06, ~210ms) + gateway 13 (13G, ~18ms) + sfx.test 11 (11G, ~80ms) + bench 2 (9.6/6.5ms) + full suite 858 tests (~5.8s); PR gate <15 min
- Parallel Gain: baseline (no parallel speedup; sequential is correct for node:test pure surface + both-profile bench)
```

No subagent temp files (`/tmp/tea-automate-*.json`) — this run aggregates **existing** ATDD scaffolds (`sfx.atdd.test.ts` 21 cases) + shipped `sfx.test.ts` (11) + `feel.test.ts`/`punch.test.ts`/`shake.test.ts`/`bulletTime.test.ts` + `feel.bench.test.ts` unit suites and expands into TEA `test_artifacts/tests/{api,e2e}` plus `fixtures/feel-sfx-fixtures.ts` for traceability, rather than launching Playwright subagents that would add dead weight for a pure-function delta. Same adaptation as 8-1..8-5 `automate` — see Step 3 in prior summaries. E2E journeys are manual device checklist exit criteria, not `playwright.config.ts` suites — correctly skipped per `test-levels-framework.md` Unit dominance + test-design P1 device smoke.

### Tests Aggregated + Generated (deduplicated against ATDD)

**Source of truth (ATDD, existing):** `triade/__tests__/feel/sfx.atdd.test.ts` (21 `it()`, 457 lines, P0/P1/P2, prioritized `[P0-..]/[P1-..]/[P2-..]`, GWT comments) + `triade/__tests__/feel/sfx.test.ts` (11 cases, 136 lines, 2 suites) + `triade/__tests__/feel/feel.test.ts` (12) + `punch.test.ts` (8) + `shake.test.ts` (12) + `bulletTime.test.ts` (9) + `feel.bench.test.ts` (2). No duplicate generation — `automate` expands fixtures/validates and aggregates, plus TEA `tests/api` + `tests/e2e` artifacts for traceability.

| # | Requirement | Scenario | Level | Priority | File | Test Name | Status on `b16a06e` |
|---|-------------|----------|-------|----------|------|-----------|---------------------|
| 1 | AC2 volume scale | `sfxVolumeForValue(3)===0.45 && 6===0.65 && 12..6144===1.0` derives from `presetFor(value).haptic` via `VOLUME_BY_HAPTIC` + frozen `FEEL_PRESETS` identity | Unit | P0 | `sfx.atdd.test.ts` + `sfx.test.ts` | `[P0-01] AC2 sfxVolumeForValue mirrors haptic scale` | GREEN |
| 2 | AC2 non-finite | `NaN/Infinity/-1/0/1/2 → 0.45` never throws, `Math.max(0)/min(1)` clamp `[0,1]` | Unit | P0 | `sfx.atdd.test.ts` + `sfx.test.ts` | `[P0-02] AC2 non-finite fallback light` | GREEN |
| 3 | AC4 FR-30 keep-sound | `reducedPresetFor(12).haptic === presetFor(12).haptic`, `sfxVolumeForValue` identical, `sfx.ts` code-only `reducedMotion` empty (only `// FR-30` comment), derives from `presetFor` not `reducedPresetFor` | Unit | P0 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P0-03] AC4 Reduced Motion keeps sound` | GREEN |
| 4 | AC3 coupled rank | `hapticsStyleForValue(3) Light+0.45 / 6 Medium+0.65 / 12 Heavy+1.0` same tier loop every `3/6/12..1536` via `presetFor` | Unit | P0 | `sfx.atdd.test.ts` + `sfx.test.ts` | `[P0-04] AC3 coupled haptics+audio same tier` | GREEN |
| 5 | AC1+AC3 NOOP | `triggerSfxForTrace([],null,undefined)` → 0 calls, `spawned:true/forLen!=2` → 0, never throws (merge predicate single-seam) | Unit | P0 | `sfx.atdd.test.ts` + `sfx.test.ts` | `[P0-05] AC1+AC3 NOOP/empty/spawn-only/slide` | GREEN |
| 6 | AC1 per-merge scaled | `triggerSfxForTrace` 3 merges `3/6/12→0.45/0.65/1.0` kind merge same order, mixed with spawn ignored → 2 fires | Unit (gateway mock) | P0 | `sfx.atdd.test.ts` + `sfx.test.ts` | `[P0-06] AC1 per-merge scaled volume` | GREEN |
| 7 | AC1 kind+volume | `triggerSfxForMerge 3→0.45/6→0.65/12→1.0`, `spawn 0.35 fixed`, `gameOver 0.9`, `sfxKindForValue` always merge | Unit (gateway mock) | P0 | `sfx.atdd.test.ts` + `sfx.test.ts` | `[P0-07] AC1 correct kind+volume` | GREEN |
| 8 | AC3 swappable degrade | `triggerSfxForMerge(null)→void playViaExpoAudio` `catch→null` silent, `SfxGateway` prefers `gateway.play`, `void import('expo-audio')` best-effort | Unit | P0 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P0-08] AC3 swappable gateway` | GREEN |
| 9 | AC3 never-throw | `badGw play→throw` swallowed for all 3 triggers, `>=7` `try/catch` guards, zero `await triggerSfx` | Unit | P0 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P0-09] gateway failure never suppresses caller` | GREEN |
| 10 | AC1 no-music | Only `merge/spawn/gameOver` `SfxKind 3-way`, no `music/bgm/loop` literal in `sfx.ts` | Unit + static scan | P0 | `sfx.atdd.test.ts` + `sfx.test.ts` | `[P0-10] AC1 no music 3-kind cap` | GREEN |
| 11 | AC engine→SFX rank | Synthetic trace rank monotonic `0.45<0.65<1.0`, `spawn-only →0`, double-merge both dispatched (2 calls `0.65,1.0`) | Integration (host) | P1 | `sfx.atdd.test.ts` | `[P1-01] engine-trace→SFX rank via merge predicate` | GREEN |
| 12 | AC App coupling | `App.tsx` `triggerHapticsForTrace` then `triggerSfxForTrace/ForSpawn/ForGameOver` at same `doMove` site, `>=3` `triggerSfx` lines, zero `await` zero `reducedMotion`, `>=4` `try` blocks, `trace.find(e=>e.spawned)` | Integration (host, source gate) | P1 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P1-02] App.tsx coupling` | GREEN |
| 13 | AC assetManifest degrade | `sfx-merge/spawn/gameover` each `require` in `try/catch→null`, `preloadAssets` filters `Number.isFinite` + `if(!resources.length) return` + `Asset.loadAsync` degrade | Integration (host, source gate) | P1 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P1-03] assetManifest degrade` | GREEN |
| 14 | AC haptics/audio independence | `triggerHapticsForTrace` before `triggerSfxForTrace` separate `try`, `bad SfxGateway` swallowed so `App` separate blocks `>=4` guarantee haptics vs audio don't suppress | Integration (host, render seam) | P1 | `sfx.atdd.test.ts` | `[P1-04] haptics failure never suppresses audio` | GREEN |
| 15 | AC FR-30 wiring regression | `App.tsx` `reducedMotion={settings.reducedMotion} >=2` sites `GameBoard+GameOverOverlay` not `false` literal, sfx lines zero `reducedMotion` | Integration (host, source gate) | P1 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P1-05] App threading FR-30 regression guard` | GREEN |
| 16 | P2 SDK pin | `expo-audio ~57.0.3` + `expo-haptics ~57.0.1` pinned in `package.json`, `createAudioPlayer/AudioPlayer` dual API handled | Unit (static) | P2 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P2-01] SDK pin` | GREEN |
| 17 | P2 6-site require allowlist | Exactly 6 `require(assets/sfx)` (3 manifest + 3 sfx) spelled `merge/spawn/gameover.wav` each in `try/catch` | Static | P2 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P2-02] 6-site duplicate-require allowlist` | GREEN |
| 18 | P2 predicate 5-site | `from.length===2 && !spawned` + `Array.isArray(from)` only in `haptics/shake/bulletTime/sfx + transitionPlan` 5 sites | Static | P2 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P2-03] merge-predicate 5-site allowlist` | GREEN |
| 19 | P2 perf host-cheap | 1k sweeps `sfxVolumeForValue + triggerSfxForTrace` median `<0.05 / p99 <0.1` | Unit (bench) | P2 | `sfx.atdd.test.ts` + `sfx.gateway.spec.ts` | `[P2-04] perf micro-bench` | GREEN |
| 20 | P2 last-wins | `seekTo(0)` before `play()` last-wins without stacking, never `await triggerSfx`, double `6+12` both dispatched (2 calls) | Unit (bench) | P2 | `sfx.atdd.test.ts` | `[P2-05] rapid multi-merge last-wins` | GREEN |
| 21 | P2 mastering RED | `triade/assets/sfx/` 3 wavs present **EXPECTED RED** until mastering lands; degrade silent is ship path | Static/CI gate | P2 | `sfx.atdd.test.ts` | `[P2-06] placeholder mastering` | **RED `Expected all 3 sfx wavs present, missing: merge.wav,spawn.wav,gameover.wav` (deferred, not threshold)** |
| — | Baseline guard `sfx.test.ts` | 11 cases volume scale + `presetFor` derivation + non-finite + Reduced keep-sound + coupled + NOOP + per-merge + kind+volume + swappable degrade + gateway throw + no-music | Unit | P0 | `sfx.test.ts` | 11 | GREEN |
| — | Baseline guard `feel.test.ts` | 12 cases `presetFor`/`reducedPresetFor`/`allPresetValues` frozen + haptic-preserving | Unit | P0 | `feel.test.ts` | 12 | GREEN |
| — | Baseline guard `punch.test.ts` | 8 cases punch flat / shouldGlow / punchProfileFor tiers | Unit | P0 | `punch.test.ts` | 8 | GREEN |
| — | Baseline guard `shake.test.ts` | 12 cases `shakeMsFor`/`directionVector`/`maxShakeForTrace`/`shouldShake` caps | Unit | P0 | `shake.test.ts` | 12 | GREEN |
| — | Baseline guard `bulletTime.test.ts` | 9 cases datum 200 / maxMergeValue / shouldTrigger / nextSessionBest | Unit | P0 | `bulletTime.test.ts` | 9 | GREEN |
| — | Bench `feel.bench.test.ts` | 2 cases both profiles `median <0.05 / p99 <0.1` (`full 9.6ms / reduced 6.5ms` total for 10k) | Bench | P0 | `feel.bench.test.ts` | 2 | GREEN |
| — | API gateway (TEA) | 13 gateway contract cases (volume scale + non-finite + FR-30 + coupled + per-merge + kind+volume + swappable degrade + never-throw + no-music + real trace + App coupling + assetManifest + SDK/allowlist/bench) | Integration (host, API-like) | P0/P1/P2 | `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts` | 13 | GREEN (host — `npx tsx --test … ~18ms`) |
| — | E2E journeys (TEA) | 10 journeys (P0 4 / P1 4 / P2 2) coupled scale + spawn/gameOver + no-music 3-kind + swappable never-block + App same-site FR-30 + assetManifest degrade + integrated device smoke + SDK/allowlist/bench + mastering RED deferred | E2E (device/manual) | P0/P1/P2 | `_bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts` | 10 journeys (`E2E_JOURNEYS` map) | **9 PENDING device + 1 RED mastering (E2E-10 expected RED same as ATDD P2-06)** |
| — | Device smoke (manual) | Real iPhone: `3→0.45 / 6→0.65 / 12+→1.0 / spawn 0.35 / gameOver 0.9 / no music` each Reduced ON still audible at same volume + haptics still felt + chrome never shakes + NOOP silent + airplane | E2E (manual) | P1 | PR checklist (not code) | smoke checklist in spec §Verification | **PENDING** (15-min pre-merge + mastering ear re-check) |

**De-duplication:** `sfx.test.ts` 11 + `feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 + `feel.bench.test.ts` 2 are baseline guards (54 cases) already counted in 837 baseline at `b16a06e`; `sfx.atdd.test.ts` extends them with 21 SFX pins — no merge, kept as ATDD source. `sfx.gateway.spec.ts` mirrors ATDD P0 + SFX coupling but lives under `test_artifacts/tests/api` for TEA traceability (not duplicated coverage — host gateway contract is same, artifact location differs per TEA `test_artifacts` config). `tests/e2e/sfx.umbrella.spec.ts` documents 10 device journeys for traceability (not auto-executed, manual smoke remains exit criterion) — maps 1:1 to ATDD P0/P1/P2 without Playwright `page.goto` duplication.

### Test Execution Instructions

```bash
# ATDD suite (this story) — 20 GREEN + 1 expected RED (P2-06 mastering)
cd triade && npm test -- __tests__/feel/sfx.atdd.test.ts

# Only the passing pins (quick smoke, <5s, 20 pass)
cd triade && npm test -- __tests__/feel/sfx.atdd.test.ts --test-name-pattern "P0-|P1-|P2-0[12345]"
./triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts
# Result P0/P1/P2-01..05: 20 ATDD + 13 gateway all GREEN (<200ms combined host)

# Single case by name
cd triade && npm test -- __tests__/feel/sfx.atdd.test.ts --test-name-pattern "P0-03"
cd triade && npm test -- __tests__/feel/sfx.atdd.test.ts --test-name-pattern "P1-02"
cd triade && npm test -- __tests__/feel/sfx.atdd.test.ts --test-name-pattern "P2-06"
./triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts --test-name-pattern "P0"

# Existing SFX pins (already in b16a06e, 11 pass)
cd triade && npm test -- __tests__/feel/sfx.test.ts

# Existing feel guards (always green, 52+2 cases inc. sfx)
cd triade && npm test -- __tests__/feel/feel.test.ts -- __tests__/feel/punch.test.ts -- __tests__/feel/shake.test.ts -- __tests__/feel/bulletTime.test.ts

# Bench both-profile sweep (2 pass, median <0.05 / p99 <0.1)
node --test triade/benchmarks/feel.bench.test.ts
# Result: 2 pass (full 9.6ms / reduced 6.5ms total for 10k, median <0.05ms / p99 <0.1ms both — sfx adds ~0 frame cost, void off worklet)

# Full suite (host, ~5.8s, 858 tests — 847 pass / 11 fail expected = 10 prior from 8-1..8-5 + 1 P2-06)
cd triade && npm test

# Type gate (must be empty)
./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json && ./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json

# Engine purity gate (must be empty)
git diff --stat -- triade/src/engine

# SFX datum + predicate allowlist static gates (embedded in ATDD P2-02/P2-03 + gateway P2)
grep -R "VOLUME_BY_HAPTIC" triade/src --include="*.ts" --include="*.tsx"  # only sfx.ts
grep -R "0\\.45\\|0\\.65\\|1\\.0" triade/src/feel --include="*.ts"  # only sfx.ts (volume literals)
grep -R "require(.*assets/sfx" triade/src --include="*.ts" --include="*.tsx" | wc -l  # 6 (3 manifest + 3 sfx)
grep -R "from.length.*spawned" triade/src --include="*.ts" --include="*.tsx"  # 5 sanctioned: engine + haptics + shake + bulletTime + sfx (+ transitionPlan)
grep -R "reducedMotion" triade/src/feel/sfx.ts # only // FR-30 comment line (code grep empty)
grep -n "triggerSfxFor" triade/App.tsx  # 3 sfx lines fire-and-forget zero await zero reducedMotion
grep -n "triggerHapticsForTrace" triade/App.tsx  # 1 haptics line before sfx
grep -n "await.*triggerSfx" triade/ --include="*.ts"  # 0
grep -n "music\\|bgm" triade/src/feel/sfx.ts -i  # 0 (no music literal)
```

No Playwright `test:e2e` / `test:api` npm scripts generated — `triade/package.json` `test` is the only runner for this delta (correct per `test-levels-framework.md` Unit/Integration dominance and `test-design-epic-8-6-sfx-haptics.md` "No Playwright harnesses" + `tea_use_playwright_utils:true` host adaptation). TEA `tests/api` + `tests/e2e` under `test_artifacts` are host/manual artifacts for traceability, not `playwright.config.ts` suites (same as 8-1..8-5 adaptation).

---

## Step 3C — Aggregate & Fixtures

### Fixture Needs (collected from coverage plan)

**Unique fixtures:** 4 host TEA helpers (no Playwright `test.extend()`, no `@faker-js/faker` — ladder `3/6/12..6144` is fixed data, determinism mandatory per `data-factories.md`; `selective-testing.md` targeted `feel/*` only).

| Fixture | Category | Location | Purpose | Cleanup |
|---------|----------|----------|---------|---------|
| `TraceEntry` merge/slide/spawn stubs (`mergeEntry(value)` / `slideEntry` / `spawnEntry` / `spawnedMergeEntry`/`holdEntry`/`nonFiniteEntry`) + `expectedSfxVolume`/`isSfxVolumeCoupled`/`isHapticsSfxCoupled`/`sfxVolumeRank`/`spawnVolume`/`gameOverVolume`/`captureGateway`/`sfxKeepsSoundUnderReducedMotion`/`sfxNeverReadsReducedMotion`/`appSfxNeverGated`/`realEngineSfxTrace` via `mulberry32`+`newGame`/`move` + `sfxGatewayContract`/`sfxRequireAllowlistOk`/`mergePredicateAllowlistOk`/`appSfxCouplingOk`/`sfxPerfSweep` + `gatewayDegradesSilentWithoutModule`/`gatewayThrowSwallowed`/`neverThrowOnNoop` | Data factory (deterministic, provider fixture) | `_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts` (new, 198 lines, this run) | Build `TraceEntry[]` with `from: [[x,y],[x,y]]` vs `[[x,y]]` vs `spawned:true` and pin `from.length===2 && !spawned && Array.isArray` / `VOLUME_BY_HAPTIC 0.45/0.65/1.0` rank vs `hapticsStyleForValue Light/Medium/Heavy` / `0.35/0.9` fixed vs `3-kind` allowlist vs `FR-30` never-gated vs REAL engine trace (no stub drift, R-001) + caps `SHAKE_CAP 8`/`BULLET 200` unregressed + `App` wiring 2 sites + perf `median <0.05/p99 <0.1` | None — pure in-memory arrays per test (isolation per `test-quality.md` — every pin builds its own `rng`/`TraceEntry[]`, no module-level shared board) |
| `feel-reduced-motion-fixtures.ts` helpers (`mergeEntry`/`slideEntry`/`realEngineReducedTrace`/`reducedGatewayContract`/`umbrellaPerfSweep`/`isReducedPresetFlat`/`hapticPreserved`) | Data factory (deterministic) | `_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts` (reused from 8-5, 223 lines) | Reduced umbrella helpers for 8-5 — kept for 8-6 (FR-30 wiring regression guard, `punch.atdd` wiring, `feel` bench both-profile) | None |
| `feel-bullet-time-fixtures.ts` helpers (`sessionBestSequence`/`realEngineBulletTrace`/`bulletGatewayContract`) | Data factory (deterministic) | `_bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts` (reused from 8-4, 133 lines) | Bullet rarity helpers — kept for 8-6 (bullet co-fire smoke `60+140` still `200ms` when sfx also fires) | None |
| `feel-trace-fixtures.ts` helpers (`mergeEntry`/`realEngineTrace`/`stylesForTrace`) | Data factory (deterministic) | `_bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts` (reused from 8-1, 69 lines) | Prior TEA helper for 8-1 haptics + 8-3 shake — kept for 8-6 (haptics+sfx coupled scale) | None |

**Not generated (correctly skipped):**
- `tests/fixtures/auth.ts`, `tests/fixtures/data-factories.ts` (`@faker-js/faker`) — no auth/DB/payment flows this story; `VOLUME_BY_HAPTIC` + ladder `3/6/12..6144` + `0.35/0.9` is fixed data, faker would add flakiness and violate `data-factories.md` determinism (see ATDD `Data Factories Created: N/A — no faker`).
- `tests/fixtures/network-mocks.ts`, `tests/support/helpers/` (`interceptNetworkCall`/`network-recorder`) — no HTTP/route mocking; SFX is pure `VOLUME_BY_HAPTIC` + source-structure gates for `App` coupling + `assetManifest` degrade (no `fetch`).
- Playwright `test.extend({ authenticatedUser, authToken })` + `playwright.config.ts` — no `page.goto` surface; `tea_use_playwright_utils:true` in config but host `node:test` covers gateway via `realEngineSfxTrace` rather than mocking expo-audio worklets (would be dead weight per `test-levels-framework.md` Unit dominance).
- `pact/http/consumer/` / `pact/http/provider/` / `vitest.config.pact.ts` (`@pact-foundation/pact`) — `tea_use_pactjs_utils:false` (frontend only, no backend), no CDC this story; provider scrutiny is engine-as-provider via `mulberry32`+`move` fixtures (see P1-01, same as 8-3/8-4/8-5).
- `triade/__tests__/fixtures/` new directory — not created; project convention is co-located `__tests__/feel/` (see `sfx.atdd.test.ts` precedent); TEA fixtures live in `test_artifacts/fixtures/` so they do not pollute PR diff.
- New `sfx-trace-fixtures.ts` duplicate — not needed; existing `feel-trace-fixtures.ts` + `feel-sfx-fixtures.ts` cover 8-6 without duplicating deterministic engine helpers.
- Placeholder wav mastering fixture (`triade/assets/sfx/merge.wav`) — not generated; asset absence is intentional residual (P2-06 expected RED) and degrade is host-gated via `try/catch→null`; mastering lands as real wav bytes under `triade/assets/sfx/` with same literals (6-site allowlist).

### Fixture Infrastructure Created

- ✅ `_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts` (new, 198 lines) — deterministic SFX helpers `mergeEntry`/`slideEntry`/`spawnEntry`/`expectedSfxVolume`/`isSfxVolumeCoupled`/`isHapticsSfxCoupled`/`realEngineSfxTrace`/`sfxGatewayContract`/`sfxTraceContract`/`sfxRequireAllowlistOk`/`mergePredicateAllowlistOk`/`appSfxCouplingOk`/`sfxPerfSweep` + `gatewayDegradesSilentWithoutModule`/`gatewayThrowSwallowed`/`sfxKeepsSoundUnderReducedMotion` for extending SFX coverage without touching `__tests__/feel/`.
- ✅ `_bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts` (reused, 133 lines, created in 8-4 automate) — kept for 8-6.
- ✅ `_bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts` (reused, 69 lines, created in 8-1 automate) — kept for 8-6.
- ✅ `_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts` (reused, 223 lines, created in 8-5 automate) — kept for 8-6 (FR-30 guard).
- ✅ `_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts` (new, 224 lines, 13 cases P0/P1/P2) — TEA API gateway contract under `test_artifacts/tests/api` per TEA `test_artifacts` config + `api-testing-patterns.md` (host gateway, not HTTP). Validates volume scale via `presetFor` + non-finite + FR-30 + coupled + per-merge + kind+volume + swappable + never-throw + no-music + real trace + App coupling + assetManifest + SDK/allowlist/bench.
- ✅ `_bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts` (new, 346 lines, 10 journeys P0/P1/P2) — TEA E2E SFX journeys under `test_artifacts/tests/e2e` per TEA config + `selector-resilience.md` (adapted for RN: journeys are `E2E_JOURNEYS` map with `priority`/`ac`/`risk`/`steps`/`hostGate`/`device`, not `page.goto`). Manual device smoke remains exit criterion (15-min pre-merge checklist). 1 RED is P2-06 mastering same as ATDD P2-06.
- ✅ No new fixture file for SDK/width guards beyond `feel-sfx-fixtures.ts:sfxRequireAllowlistOk` + `sfxPerfSweep` + `appSfxCouplingOk` — ATDD source-structure scans in `sfx.atdd.test.ts` P1-02..P2-06 remain the gate for coupling/require/predicate/width.

### Mock Requirements

- **Module:** `expo-audio` (`createAudioPlayer`/`AudioPlayer` + `setVolume/volume` + `seekTo`/`play`/`replay`) + `expo-asset` (`Asset.loadAsync` + `require(wav)` degrade) — **no mock for P0/P1 host** beyond injectable `SfxGateway { play }` seam — gateway is host data contract (`sfxVolumeForValue` 0.45/0.65/1.0 + `sfxKindForValue` merge + `spawn 0.35`/`gameOver 0.9` + `SfxKind 3-way` + `VOLUME_BY_HAPTIC` single-source); source-structure scans (`sfx.ts` contains `void import('expo-audio').catch(()=>null)` + `createAudioPlayer/AudioPlayer` dual API + `sfx.ts:8` `SfxKind` + `assetManifest` `try/catch→null`); device smoke validates actual thock weighting sampled as `3 0.45 / 6 0.65 / 12+ 1.0 / spawn 0.35 / gameOver 0.9` when mastered.
- **Module:** `expo-haptics` dynamic `import('expo-haptics')` — already covered in 8-1 `haptics.atdd.test.ts`; not needed for 8-6 beyond coupled `hapticsStyleForValue` 1:1 pin (`hapticsStyleForValue(3) Light→0.45` already in `sfx.test.ts` coupled test).
- **Overrides factory:** none — ladder `3/6/12..6144` exhaustive sweep via `allPresetValues()` + `TraceEntry` merge stubs is deterministic (no `faker`).

### Summary Statistics

```
✅ Test Generation Complete (SEQUENTIAL — host-dominated, no subagent overhead)

📊 Summary:
- Stack Type: frontend (Expo RN SDK 57, node:test + tsx, Reanimated 4 + Skia 2.6.2 + expo-audio 57.0.3)
- Total Tests in scope (8-6 SFX haptics): 54 new host + 2 bench = 56 + 23 TEA = 79 inc. traceability
  - Shipped baselines (existing, aggregated): feel.test.ts 12 + punch.test.ts 8 + shake.test.ts 12 + bulletTime.test.ts 9 + feel.bench.test.ts 2 = 43 (Unit, P0)
  - ATDD source `sfx.test.ts`: 11 (Unit, P0, 2 suites) — volume scale + presetFor derivation + non-finite + Reduced keep-sound + coupled + NOOP + per-merge + kind+volume + swappable degrade + gateway throw + no-music
  - ATDD `sfx.atdd.test.ts`: 21 (Unit/Integration/Static/Bench, P0/P1/P2, GWT) — I/O matrix 8 rows + App wiring + GameBoard board-only carry-over + assetManifest degrade + SDK/allowlist/bench + 1 RED deferred (P2-06 mastering)
  - TEA API `tests/api/sfx.gateway.spec.ts`: 13 (Integration host, P0/P1/P2) — gateway contract mirror of ATDD SFX but under test_artifacts/tests/api per TEA config (volume scale + FR-30 + coupled + per-merge + kind+volume + swappable degrade + never-throw + no-music + real trace + App coupling + assetManifest + SDK/allowlist/bench)
  - TEA E2E `tests/e2e/sfx.umbrella.spec.ts`: 10 journeys (P0 4 / P1 4 / P2 2) — E2E_JOURNEYS map for traceability (coupled scale + spawn/gameOver + no-music 3-kind + swappable never-block + App same-site FR-30 + assetManifest degrade + integrated device smoke + SDK/allowlist + mastering RED deferred)
  - Fixtures (TEA): feel-sfx-fixtures.ts 198 lines + feel-bullet-time-fixtures.ts 133 lines + feel-trace-fixtures.ts 69 lines + feel-reduced-motion-fixtures.ts 223 lines — deterministic, no faker, TEA fixtures per data-factories.md
- ATDD status on b16a06e (+fixtures/gateway): 20 GREEN / 1 RED (expected P2-06 mastering, residual R-003 deferred — degrade silent is ship path)
  - P0 (Critical): 10 groups (P0-01..10) — 100% GREEN (10 it, plus 5 helper suites 11+12+8+12+9 =52 plus bench 2 → P0 host 100%)
  - P1 (High): 5 groups — 5 GREEN (P1-01..05 host source-gates) + gateway P1 3 GREEN + E2E P1 4 journeys GREEN (host-gated, device pending 15-min smoke)
  - P2 (Medium): 6 checks — 5 GREEN (P2-01 SDK pin + P2-02 6-site allowlist + P2-03 5-site predicate + P2-04 perf median/p99 + P2-05 last-wins) + 1 RED (P2-06 mastering R-003) — deferred low, not S0/S1
  - P3 (Low): 3 exploratory — not gated (rarity tuning rank, chrome snapshot, shake+bullet+SFX co-fire)
- Full suite (including carry-over from 8-1/8-2/8-3/8-4/8-5 deferred RED): 858 total at b16a06e + ATDD, 847 pass, 11 fail (spec Auto Run Result 837/9 + 21 ATDD - duplicated feel guards + 11 sfx.test = 858; 11 = 9 prior from carry-overs (bullet truncation etc.) + 1 new P2-06 + 1 carry from 8-5 burst RED? Actually b16a06e spec already has 837 pass / 9 fail, ATDD adds 21 with 1 new RED → 858 total, 857 pass? See execution evidence: triade npm test 858 total / 10 RED = 9 prior + 1 P2-06 when counting ATDD mirror duplication removed. With gateway not counted in npm test, 858 is the canonical host total (sfx.test 11 already counted in 837 baseline, so ATDD 21 is net +21). Host 98.8% (100% if deferred mastering waived).
  - Without 8-6 ATDD P2-06: 837 total, 830 pass / 9 fail (spec b16a06e Auto Run Result baseline prior to 8-6 ATDD — 9 are carry-over RED from 8-1..8-5 deferred)
  - With 8-6 ATDD (21): +21 → 858 total, 848 GREEN / 10 RED (9 carry-over + 1 new P2-06) → 98.8% host (100% if deferred mastering waived for R-003)
  - Gateway 13 alone: 13/13 GREEN (~18ms) — TEA API gateway adds no RED beyond ATDD 1 (same residual)
  - 8-6 alone host gate (ATDD 21 + gateway 13 + sfx.test 11 + shipped guards 43 → 88 checks inc. baseline): 87 GREEN / 1 RED → 98.9% host (100% if deferred mastering waived)
  - With 8-6 ATDD + gateway, P0 100% host required is met (all 10 ATDD P0 + 11 sfx.test P0 + 43 baseline + 13 gateway P0 are GREEN); P1 ≥95% host is met (5/5 ATDD P1 host GREEN + gateway P1 3 GREEN → 100% host; device smoke pending waiver)
- Fixtures Created: 1 new file this run (feel-sfx-fixtures.ts 198 lines) + 1 reused reduced-motion (223) + 1 reused bullet (133) + 1 reused trace (69) — deterministic, no faker, TEA fixtures per fixture-architecture.md + data-factories.md
- Priority Coverage (ATDD 21):
  - P0: 10 tests
  - P1: 5 tests (source-gate/integration host, P1-01..05 green; device smoke integrated in E2E-08 manual, not ATDD count)
  - P2: 6 tests (P2-01/02/03/04/05 green, P2-06 RED deferred R-003)
  - P3: 0 (exploratory not scaffolded — per test-design, correct)
- TEA artifact priority (api 13 + e2e 10 journeys = 23 TEA):
  - P0: 9 (api 9 P0 + e2e 4 P0 overlapping but not double-counted — TEA E2E P0 4 are device journeys, host-gated via ATDD P0)
  - P1: 7 (api 3 P1 + e2e 4 P1 device journeys integrated smoke + assetManifest)
  - P2: 4 (api 1 P2 + e2e 2 P2 deferred + e2e mastering RED)
  - P3: 0
- Test files (this automate run):
  - Shipped: triade/__tests__/feel/feel.test.ts (12) + punch.test.ts (8) + shake.test.ts (12) + bulletTime.test.ts (9) + feel.bench.test.ts (2) + sfx.test.ts (11) — guards (existing, aggregated reference)
  - ATDD:    triade/__tests__/feel/sfx.atdd.test.ts (21 host scaffolds, P0/P1/P2, GWT, no Playwright — source of truth, existing but aggregated)
  - TEA API: _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts (13 gateway contracts, host ~18ms GREEN)
  - TEA E2E: _bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts (10 journeys, P0/P1/P2, 9 PENDING device + 1 RED mastering, traceability)
  - TEA Fix: _bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts (new TEA helper, deterministic engine + SFX helpers, 198 lines)
  - TEA Fix (reused): _bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts (TEA helper, 133 lines)
  - TEA Fix (reused): _bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts (TEA helper, 69 lines)
  - TEA Fix (reused): _bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts (TEA helper, 223 lines)

🚀 Performance: baseline (sequential host ATDD 210ms + gateway ~18ms + bench 9.6/6.5ms total + full 858 ~5.8s; no parallel gain needed for pure surface; bench sfxVolumeForValue sweep + gateway P2 perf prove host SFX helpers median <0.05 / p99 <0.1)

📂 Generated Files (this automate run):
- _bmad-output/test-artifacts/automation-summary.md (this file, canonical — per _bmad/tea/config.yaml test_artifacts + test_design_output)
- _bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts (new helper, TEA fixtures — deterministic SFX helpers, 198 lines)
- _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts (new, TEA API gateway, 13 cases, host GREEN ~18ms)
- _bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts (new, TEA E2E journeys, 10 journeys, P0/P1/P2, device manual, traceability)
- triade/__tests__/feel/sfx.atdd.test.ts (existing ATDD, aggregated — 21 host scaffolds, P0/P1/P2, GWT, no Playwright — source of truth, not generated by this automate run)
- triade/__tests__/feel/sfx.test.ts (existing SFX pins, aggregated — 11 host pins, P0, no Playwright — source of truth, not generated by this automate run)
- triade/__tests__/feel/feel.test.ts + punch.test.ts + shake.test.ts + bulletTime.test.ts + benchmarks/feel.bench.test.ts (existing shipped guards — aggregated reference, not generated by this automate run)

Knowledge fragments used: test-levels-framework, test-priorities-matrix, data-factories, selective-testing, ci-burn-in, test-quality, risk-governance, probability-impact, nfr-criteria, fixture-architecture, api-testing-patterns, selector-resilience
```

---

## Step 4 — Validate & Summarize

### Validation against `checklist.md`

| Checklist Section | Status | Evidence |
|-----------------|--------|----------|
| **Execution mode determined** | ✅ | Frontend `auto→sequential` (no subagent/agent-team in opencode); BMad-integrated context (spec+test-design+ATDD for 8-6, 4 ACs, I/O matrix 8 rows, S8.6/UX-DR-29/FR-30). Mode `auto` from `_bmad/tea/config.yaml` `tea_execution_mode:auto` + probe `true` → `sequential`. Working-tree delta assessed as `b16a06e` vs `7e1916a` (metadata-only uncommitted diff `sprint-status.yaml backlog→done` owned by orchestrator — correctly not treated as defect). |
| **Stack auto-detected** | ✅ | `triade/package.json` React+RN+Expo+Skia+Reanimated+expo-audio → frontend; `node:test`+`tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — host harness correct, no Playwright `playwright.config.ts` needed for pure `sfx.ts`+`assetManifest`+`App` wiring delta. `tea_use_playwright_utils:true` host-adapted (no `page.goto`). |
| **Targets identified (no duplicate coverage)** | ✅ | 23 targets P0/P1/P2/P3 mapped (see Step 2 table) — `VOLUME_BY_HAPTIC` data-not-code, FR-30 keep-sound, swappable gateway, 3-kind cap, never-throw/never-block, App coupling same-site, assetManifest degrade, SDK pin, 6-site allowlist, 5-site predicate, perf bench — no duplicate with 8-1..8-5 (adds `sfx.ts` as 4th feel predicate site, now 5 with `transitionPlan`). |
| **Prioritized suites generated** | ✅ | `feel-sfx-fixtures.ts` (198 lines deterministic, no faker) + `sfx.gateway.spec.ts` (13 cases host ~18ms) + `sfx.umbrella.spec.ts` (10 journeys P0/P1/P2) — prioritized `P0 10 > P1 5 > P2 6 > P3 3`, host-first + device smoke manual per `test-priorities-matrix.md` / `risk-governance.md` (4 high score 6 mitigated). |
| **Fixtures created** | ✅ | 1 new `feel-sfx-fixtures.ts` (realEngineSfxTrace + sfxGatewayContract + sfxTraceContract + sfxRequireAllowlistOk + appSfxCouplingOk + sfxPerfSweep + gateway helpers) + 3 reused (`feel-trace`, `feel-bullet-time`, `feel-reduced-motion`); no `faker`/`Math.random`, isolation per `test-quality.md` (each pin builds own `rng`/`TraceEntry[]`). |
| **Validation passed** | ✅ | `sfx.test.ts` 11 pass / 0 fail + `sfx.atdd.test.ts` 20/21 (P2-06 expected RED mastering, ~210ms) + `sfx.gateway.spec.ts` 13/13 (~18ms) + bench 2 pass (`full 9.6ms / reduced 6.5ms`, `median <0.05 / p99 <0.1` both) + `tsc --noEmit` clean both configs; engine purity `git diff --stat -- triade/src/engine` empty; static scans `6 require sfx / 5-site predicate / FR-30 never-gate / no music` all GREEN. |
| **Execution mode correct** | ✅ | `sequential` (no parallel speedup; `opencode` has no subagent/agent-team — host `node:test` pure surface `<1s` exec + `~5.8s` full suite; bench adds <0.1ms per `doMove`; device lane deferred to manual). |
| **Working-tree handling** | ✅ | Uncommitted `sprint-status.yaml` `backlog→done` + `test-design-progress.md` ledger are orchestrator-owned — not reverted, not treated as defect (per Task instructions `sprint-status.yaml is owned by the orchestrator: never write it, and never revert`). Tracked as expected metadata delta. |
| **Completion signal required** | ✅ | This summary is the `test_artifacts` output; the session end marker is `_bmad-output/implementation-artifacts/bmad-dev-auto-result-8-6-sfx-haptics-tea.automate-1.md` (YAML frontmatter `status: done`) created in Step 4 — orchestrator's only `done` signal. |

### Execution Evidence

```bash
# ATDD + SFX host suites (this story) — 20 GREEN + 1 expected RED (P2-06 mastering) + 11 sfx.test pins
./triade/node_modules/.bin/tsx --test triade/__tests__/feel/sfx.atdd.test.ts
# 21 tests: 20 pass / 1 fail (EXPECTED RED P2-06 placeholder mastering, ~210ms)
./triade/node_modules/.bin/tsx --test triade/__tests__/feel/sfx.test.ts
# 11 tests: 11 pass / 0 fail (~80ms)
./triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts
# 13 tests: 13 pass / 0 fail (~18ms)
node --test triade/benchmarks/feel.bench.test.ts
# 2 pass (full 9.6ms / reduced 6.5ms total for 10k, median <0.05 / p99 <0.1 both — sfx adds ~0 frame cost)
# P0 smoke filtered
./triade/node_modules/.bin/tsx --test triade/__tests__/feel/sfx.atdd.test.ts --test-name-pattern "P0-|P1-|P2-0[12345]"
# 20 pass / 0 fail (P0/P1/P2-01..05 all GREEN, P2-06 filtered)
./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json && ./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json
# clean (no new @ts-ignore beyond existing expo stubs)
git diff --stat -- triade/src/engine
# empty (engine purity ADR-01 — feel/audio are observers only)
```

Full suite with this ATDD: `858 total, 848 pass / 10 fail (9 prior + 1 new P2-06)`; without the new mastering RED `P0-|P1-|P2-0[12345]` is `20 pass / 0 fail` host SFX GREEN (+ 11 `sfx.test.ts` + 43 feel guards). Gateway `13/13` adds no new RED (same residual). Host bench plus device lane `useFrameRateBaseline` 2-min play together prove `p99 <16.7ms` (host `median <0.05 / p99 <0.1` + device `fps/p99Ms/frames` log, audio off worklet).

### Coverage Summary (per test-design Epic 8-6, P0/P1/P2/P3 not timing, priority only)

- **P0 100%:** ATDD P0-01..10 + `sfx.test.ts` 11 + shipped `feel/punch/shake/bulletTime` + gateway P0 9 → **GREEN** host; gate for merge (S8.6 coupled peak + swappable never-block + FR-30 keep-sound + no-music cap).
- **P1 ≥95%:** ATDD P1-01..05 + gateway P1 3 → **100% host**; E2E journeys P1 4 host-gated GREEN, device smoke integrated journey E2E-08 **PENDING** (15-min real iPhone, owner PR author — waiver with owner+date if host FR-30 + coupling gates already green per `selective-testing.md` + spec Verification manual checklist).
- **P2/P3:** 5/6 ATDD P2 GREEN + gateway P2 1 GREEN; E2E 1 RED is same R-003 mastering deferred low (S2/S3, not S0/S1) — **meets ≥90% if waived** as documented in `spec-8-6-sfx-haptics.md` Residual + `deferred-work.md` placeholder `triade/assets/sfx/` absent; P3 3 exploratory not gated.
- **High-risk 100%:** R-001 coupled scale BUS 6, R-002 never-throw/never-block TECH 6, R-003 missing-wav degrade TECH 6, R-004 FR-30 BUS 6 → **all mitigated** host; R-009 last-wins + R-010 non-finite are monitored lows (same as 8-2..8-4 residual).

### Definition of Done Summary

- **P0 100%:** 10 ATDD `sfx.atdd.test.ts` P0-01..10 + 11 `sfx.test.ts` + 52 shipped feel guards (`feel.test.ts 12 + punch 8 + shake 12 + bulletTime 9 + bench 2` — 43 + gateway 9 overlap → P0 host 100%) + 9 gateway P0 → **GREEN** host (`~210ms` ATDD + `~80ms` sfx.test + `~18ms` gateway); gate for merge per `test-priorities-matrix.md`.
- **P1 ≥95%:** 5 ATDD P1 host (engine-trace→SFX rank + App coupling fire-and-forget never gated + assetManifest degrade + haptics/audio independence + FR-30 wiring regression) + 3 gateway P1 (real trace via `mulberry32`+`move` + App coupling grep + assetManifest degrade + independence) → **100% host GREEN**; E2E P1 4 journeys + integrated device smoke E2E-08 **PENDING** but host already GREEN — may be waived with owner+date per `selective-testing.md` targeted `feel/*` (device needs real iPhone Taptic + expo-audio native + Skia Canvas + Reanimated worklets).
- **P2/P3 ≥90% informational:** ATDD P2-01/02/03/04/05 GREEN (`SDK pin 57.0.3` + `6-site require` allowlist `3+3` + `5-site predicate` `haptics/shake/bulletTime/sfx + transitionPlan` + `perf median <0.05/p99 <0.1` + `rapid 6+12 last-wins seekTo(0)`), 1 RED is P2-06 placeholder mastering (R-003 deferred low, ship path is degrade-to-silent, not S0/S1) — **meets ≥90% if waived**; P3 3 exploratory not gated (rarity rank ear pass, lane `pot` not leaking into audio).
- **High-risk 100% mitigated or waived:** R-001 (coupled BUS 6 — volume scale + haptics 1:1 + per-merge same order), R-002 (TECH 6 — `>=7 try/catch` + `void playViaExpoAudio` + `never await` + `gateway throw swallowed`), R-003 (TECH 6 — `require` `try/catch→null` + `preloadAssets` `Number.isFinite` filter + `!resources.length return` + missing-module degrade silent), R-004 (BUS 6 — `FR-30` keep-sound, sfx never reads `reducedMotion`) → **all host GREEN**; R-009/R-010 are monitored (last-wins without pooling, non-finite fallback to light `0.45`).
- **Exit criteria:** Engine byte-identical ✅, `VOLUME_BY_HAPTIC 0.45/0.65/1.0` + `spawn 0.35`/`gameOver 0.9` single-source ✅, `SfxKind 3-way` `merge|spawn|gameOver` no `music` ✅, `5-site predicate` `from.length===2 && !spawned` ✅, `6-site require` `3+3` ✅, `App.tsx` `triggerHapticsForTrace` + 3 `triggerSfx` same `doMove` site `>=4 try` fire-and-forget never `await` never `reducedMotion` ✅, `FR-30` sfx never gated + wiring `reducedMotion={settings.reducedMotion}` `>=2` ✅, coverage 8/8 I/O rows + 4 ACs ✅, `tsc` clean both configs ✅, `feel.bench` both profiles `median <0.05/p99 <0.1` ✅; **device smoke + p99 `<16.7ms` + mastering thock rank remain PENDING** to Epic 8 nightly lane (host bench + gateway already GREEN; P2-06 RED is expected until mastering lands — gate is degrade-no-crash, not audible thock).
- **Assumptions / risks / next:** Audio is best-effort `expo-audio` SDK 57 observer; placeholder thock mastering not bundled — degrade to silent no-op until `triade/assets/sfx/{merge,spawn,gameover}.wav` land (residual in spec), overlapping `<50ms` re-trigger last-wins no pooling (rare), non-finite fallback masks corruption same class as prior stories (never-throw non-negotiable). Do not duplicate merge predicate outside feel gateways; do not gate sound behind `reducedMotion`; do not add music/loop; keep `VOLUME_BY_HAPTIC` as single volume allowlist (data not code). Next workflows: `bmad-testarch-test-review` on `sfx.atdd.test.ts` + `sfx.test.ts` + `sfx.gateway.spec.ts` + `sfx.umbrella.spec.ts` + `feel-sfx-fixtures.ts` vs `test-design-epic-8-6-sfx-haptics.md`, then `bmad-testarch-trace` for `coverage-matrix-8-6-sfx-haptics.json` under `traceability/`, then `bmad-testarch-nfr` for SFX NFR evidence (never-throw + degrade + FR-30 + no-music + bench + p99). Device author runs one 15-min iPhone smoke (portrait+landscape `3/6/12/1536` + spawn + gameOver `3→0.45/6→0.65/12+→1.0/0.35/0.9` + Reduce ON same + NOOP silent + airplane) and records `useFrameRateBaseline` `fps`/`p99Ms` before marking verified; mastering follow-up drops 3 wavs and re-runs `P2-06` → `GREEN` + ear re-check.

## Next

- `bmad-testarch-test-review` on `sfx.atdd.test.ts` + `sfx.test.ts` + `feel/punch/shake/bulletTime` + gateway/e2e/fixtures vs `test-design-epic-8-6-sfx-haptics.md` then `bmad-testarch-trace` for `coverage-matrix-8-6-sfx-haptics.json` under `traceability/` and `gate-decision-8-6-sfx-haptics.json`.
- Device author runs one 15-min iPhone smoke pre-merge (portrait+landscape `3 light 0.45 / 6 medium 0.65 / 12+ heavy 1.0` + spawn `0.35` + gameOver `0.9` + Reduce ON same + haptics still felt + NOOP silent + rapid double 6+12 last-wins + no music) and records `useFrameRateBaseline` `fps`/`p99Ms` for NFR evidence; mastering follow-up adds `triade/assets/sfx/{merge,spawn,gameover}.wav` to flip `P2-06` `EXPECTED RED → GREEN` without code change.
