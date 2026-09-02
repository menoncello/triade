---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-01'
workflowType: 'testarch-atdd'
storyId: '8.5'
storyKey: '8-5-reduced-motion'
storyFile: '_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md'
generatedTestFiles:
  - 'triade/__tests__/feel/reducedMotion.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - '_bmad-output/test-artifacts/test-design-epic-8-5-reduced-motion.md'
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
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist - Epic 8, Story 8-5: Reduced Motion (Preset-Gated Feel Umbrella, 60 FPS Fallback, Game-Over Fade)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) — `REDUCED_PRESET`/`reducedPresetFor` + `punch*For`/`shake*For`/`shouldTriggerBulletTime`/`shouldGlow` preset-not-flag helpers + `GameBoard` board-only gating + `GameOverOverlay` instant vs `280ms` fade + `App.tsx` `settings.reducedMotion` wiring + `feel.bench` both-profile budget; no E2E/API harness required for 8-5. Device smoke is manual (Reanimated worklets on Skia Canvas) and covered in test-design P1-07.

---

## Story Summary

Story 8-5 is the umbrella gate for the entire feel suite: a single `REDUCED_PRESET` (not a scattered flag) behind `settings.reducedMotion` that zeroes every visual feel path — shake, bullet-time `200ms` flash, punch flash/particles/overshoot, `1536+` glow, and game-over soft fade `280ms` — while **haptics+sound stay fully active** (FR-30, UX-DR-16, ADR-04). The reduced preset is the sanctioned `60 FPS` emergency fallback and both profiles are swept by `feel.bench.test.ts` (`median <0.05ms / p99 <0.1ms`). The wiring fix in `App.tsx:929` (`reducedMotion={settings.reducedMotion}`) is the only behavioural delta beyond tightening contracts; prior stories 8-1..8-4 already had per-helper gating, so 8-5 pins the umbrella and the benchmark.

**As a** player with motion sensitivity
**I want** a single Reduced Motion setting that suppresses all visual feel (shake, bullet time, flash/particles/overshoot/glow, soft-fade) while keeping haptics and sound
**So that** the game is comfortable, accessible, and never violates FR-30/UX-DR-16 or risks App Store a11y rejection

---

## Acceptance Criteria

1. **AC1 / full feel layer gated under Reduced Motion (S8.5, FR-30, UX-DR-16)** — Given Reduced Motion enabled, when feel effects are scheduled, then the full feel layer is gated: shake `0` (`shakeMsFor→0`, `shouldShake→false`), bullet time suppressed (`shouldTriggerBulletTime(...,true)→false`), punch `flash false / particles 0 / overshootScale 1 / overshootMs 0`, `1536+` glow `false`, and game-over soft fade `280ms` cut to instant `setValue(1)/0` (no `Animated.timing`).
2. **AC2 / haptics+sound stay under Reduced Motion (FR-30, UX-DR-16)** — Given Reduced Motion enabled, when a merge resolves, then haptics (`hapticsStyleForValue(12)=Heavy`) and sound remain fully active; `haptics.ts` never reads `settings.reducedMotion` (only `// FR-30: haptics stay` comment).
3. **AC3 / Reduced Motion is a preset not a flag (UX-DR-16, ADR-04)** — Given the feel system selects Reduced Motion, then the reduced `FeelPreset` profile is used (`REDUCED_PRESET` frozen `shakeMs 0 / particleBurst 0 / overshootMs 0 / overshootScale 1 / flash false`, `reducedPresetFor(value)` returns copy `{...REDUCED_PRESET, haptic: presetFor(value).haptic}` never-throw, `presetFor` returns frozen canonical `FEEL_PRESETS[v]` identity).
4. **AC4 / sanctioned 60 FPS fallback + benchmark both profiles (ADR-04, NFR-14)** — Given the reduced preset is the sanctioned fallback, when both profiles are swept by `feel.bench.test.ts` (`10k` turns, `warmup 1k`), then `median <0.05ms` and `p99 <0.1ms` for both full and reduced (`baseline full 9.6ms / reduced 6.5ms` total for `10k`), and `SHAKE_CAP 8` / `BULLET_TIME_MS 200` are never exceeded without data change.
5. **AC5 / haptics gateway + game-over wiring + mid-flight snap + chrome guard (FR-30, UX-DR-27)** — Given haptics gateway, when Reduced Motion toggles, then haptics mapping stays identical; given game-over, when Reduced Motion toggles, then instant vs `280ms` fade branches with cleanup `stopAnimation`; given mid-animation snap, when `reducedMotion false→true` during shake/bullet (`130ms`/`200ms`), then board snaps flat via `withTiming(0,20ms)`; given board flashes, when rendered, then preview card/score never animate (board `Animated.View` + `AnimatedTile isPunch = isMerge && !reducedMotion` are board-only).

---

## Story Integration Metadata

- **Story ID:** `8.5`
- **Story Key:** `8-5-reduced-motion`
- **Story File:** `_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md` (baseline_revision `10a3449` → final_revision `0ec7482`, assessed HEAD `0531056` byte-identical to `0ec7482` plus `sprint-status.yaml` `backlog→done` + `test-design-progress.md`)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md`
- **Generated Test Files:**
  - `triade/__tests__/feel/reducedMotion.atdd.test.ts` (NEW — ATDD red-phase scaffolds for the working-tree delta, 21 tests: 19 GREEN + 2 expected RED)
  - Existing reference: `triade/__tests__/feel/feel.test.ts` (12 cases) + `punch.test.ts` (8) + `shake.test.ts` (12) + `bulletTime.test.ts` (9) + `feel.bench.test.ts` (2 bench) — already green on `0ec7482` (see spec Auto Run Result `805 pass / 9 fail` — the 9 are expected RED deferred not caused by 8-5)
- **Working-tree delta covered:** `triade/App.tsx:929` — fixed `GameOverOverlay` wiring `reducedMotion={settings.reducedMotion}` (was `false`) + `triade/src/feel/feel.ts:82-105` tightened `REDUCED_PRESET` frozen + `reducedPresetFor` haptic-preserving copy never-throw plus `// FR-30`/`// ADR-04` comments + `triade/src/feel/punch.ts` delegated all 5 helpers to `reducedPresetFor` when `reducedMotion===true` + `triade/src/feel/shake.ts:14-27` `shakeMsFor` delegated to `reducedPresetFor(value).shakeMs` when gated + `triade/src/feel/haptics.ts:1` pinned `// FR-30: haptics stay` and no `reducedMotion` code import + `triade/src/render/GameBoard.tsx` already gates shake/bullet/bursts/`AnimatedTile isMerge && !reducedMotion` plus `useEffect([reducedMotion])` snap `withTiming(0,20)` + `triade/src/ui/GameOverOverlay.tsx:24-55` `reducedMotion` gates instant `setValue(1)/0` vs `280ms Animated.parallel` with cleanup + `triade/benchmarks/feel.bench.test.ts` new sweep both profiles `median <0.05ms / p99 <0.1ms` + `triade/__tests__/ui/components/app.gameOverWiring.test.ts` + `app.restart.test.ts` pins updated — commit `0ec7482` ahead of `10a3449`; uncommitted diff is metadata-only (`sprint-status.yaml` `8-5 done` + `test-design-progress.md`).

---

## Stack Detection

- **Config `test_stack_type`:** `auto`
- **Detected stack:** `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`/`expo-haptics`; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`)
- **No Playwright/Cypress harness needed:** 8-5 is pure preset helpers + `REDUCED_PRESET` contract + board-only wiring + `GameOverOverlay` datum + `App` wiring + benchmark; correct level is **Unit host** + integration via `readSrc` source-structure gates and engine trace fixtures. E2E/API scaffolds are intentionally absent (per `test-design-epic-8-5-reduced-motion.md` P0/P1 coverage plan). `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN Skia Canvas story, not a web Playwright flow).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (5 ACs, I/O matrix 7 rows, FR-30/UX-DR-16/ADR-04/ADR-01/UX-DR-27/UX-DR-28 — `spec-8-5-reduced-motion.md` + `test-design-epic-8-5-reduced-motion.md` Exit Criteria)
- [x] Test framework configured — `triade/package.json` `test` script + `tsconfig.test.json` + `node:test` (existing `805 pass / 9 expected RED` from `0ec7482` per spec Auto Run Result; `feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 already green; `feel.bench.test.ts` 2 pass `full 9.6ms / reduced 6.5ms`)
- [x] Development environment available (`triade/` + `node` 26, `tsx` 4.23, `tsc` clean `triade/tsconfig.json` + `tsconfig.test.json`)
- [x] Knowledge base fragments loaded: `data-factories`, `component-tdd`, `test-quality`, `test-healing-patterns` (+ frontend `selector-resilience`/`timing-debugging` not needed for pure helpers, but risk-governance/probability-impact/test-levels applied via test-design)
- [x] `triade/src/engine/**` byte-identical to baseline (ADR-01 purity gate) — `git diff --stat -- triade/src/engine` empty (verified `0ec7482` stat)

---

## Red-Phase Test Scaffolds Created

### Unit / Host Tests (21 tests)

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts` (385 lines, 19 GREEN + 2 expected RED)

**P0 critical — spec I/O matrix (9 tests, all GREEN):**
- ✅ **`[P0-01] AC preset identity vs reduced copy`** — Status: GREEN — Verifies `presetFor(3)===FEEL_PRESETS[3]` frozen identity, `presetFor(12)===FEEL_PRESETS[12]`, `reducedPresetFor(12).haptic heavy && shakeMs 0 && particleBurst 0 && overshootScale 1 && flash false`, `reducedPresetFor(NaN)` never throws → `haptic light`. Failure would mean preset-not-flag contract drift (R-002).
- ✅ **`[P0-02] AC reducedPresetFor preserves haptic, zeroes visuals`** — Status: GREEN — Verifies `reducedPresetFor(3) light && 6 medium && 12 heavy && 12 shakeMs 0 && particleBurst 0 && overshootMs 0 && overshootScale 1 && flash false`; non-finite → `light` + flat never throws. Failure would mean heavy losing haptic under Reduced Motion (R-002, R-001).
- ✅ **`[P0-03] AC punch flat under Reduced Motion`** — Status: GREEN — Verifies every tier `punchScaleFor(v,true)===1 && shouldFlash===false && particleCountFor===0 && shouldGlow===false && punchProfileFor(v,true) flat` while `punchScaleFor(v,false)` is `1.08/1.12/1.15` per preset. Failure would mean punch `particleCountFor` or `shouldGlow 1536+` not gated (R-001).
- ✅ **`[P0-04] AC shake flat under Reduced Motion`** — Status: GREEN — Verifies `shakeMsFor(v,true)===0 && shakeAmplitudeFor===0 && maxShakeForTrace(trace heavy12, true)===0 && shouldShake===false`; full `shakeMsFor(6,false)===2 && 12+→5 && cap ≤8`. Failure would mean shake or bullet already gated but punch not — partial gate (R-001).
- ✅ **`[P0-05] AC bullet gated but nextSessionBest still advances (FR-30)`** — Status: GREEN — Verifies `shouldTriggerBulletTime([merge12],0,true)===false` vs `false→true`, `shouldTrigger([12],6,true)===false`, `nextSessionBest([12],6)===12` even when suppressed. Failure would mean bullet never gates haptics but gates `nextSessionBest` under Reduced Motion (R-001).
- ✅ **`[P0-06] AC haptics stay under Reduced Motion`** — Status: GREEN — Verifies `hapticsStyleForValue(3) Light / 6 Medium / 12+ Heavy` identical regardless of `reducedMotion`; `triggerHapticsForTrace` gateway code never reads `reducedMotion` (only `// FR-30: haptics stay` comment), `reducedPresetFor(12).haptic heavy` proves preservation, code-only `settings.reducedMotion` absent. Failure would mean haptics silenced for motion-sensitive users (R-009).
- ✅ **`[P0-07] AC glow 1536+ only glow, gated under Reduced Motion`** — Status: GREEN — Verifies `shouldGlow(768,false)===false && 1536 true && 3072 true && 6144 true && 384 false`; `shouldGlow(1536,true)===false` etc.; non-finite `shouldGlow(NaN,false)===false` never throws. Failure would mean only glow in system not gated (R-001).
- ✅ **`[P0-08] AC game-over fade branches + never throw`** — Status: GREEN — Verifies `GameOverOverlay` with `reducedMotion` instant `setValue(1)/0` vs `280ms Animated.parallel` with `stopAnimation` cleanup, helpers never throw on `NaN/Infinity/undefined`. Failure would mean `GameOverOverlay` wiring regression (R-003).
- ✅ **`[P0-09] AC caps single-source + benchmark both profiles under budget`** — Status: GREEN — Verifies `SHAKE_CAP===8` and all `shakeMsFor(v,false)≤8`; `BULLET_TIME_MS===200`; `feel.bench.test.ts` sweeps both profiles `median <0.05ms && p99 <0.1ms` for full and reduced (`full 9.6ms / reduced 6.5ms` total) — Reduced is sanctioned `60 FPS` fallback (ADR-04, R-007). Failure would mean cap drift or bench divergence.

**P1 high — integration / wiring (6 tests, all GREEN):**
- ✅ **`[P1-01] trace→feel contract via REAL engine trace (move() fixture)`** — Status: GREEN — Verifies `maxMergeValue/shouldTrigger` over a real engine-ish trace correctly identifies `from.length===2 && !spawned && finite` merges and ignores `spawned:true`/`fromLen!==2`/`NaN`, flat under `reducedMotion true`. Failure would mean stub drift vs engine contract (R-001, R-002).
- ✅ **`[P1-02] App threading settings.reducedMotion into GameBoard AND GameOverOverlay`** — Status: GREEN — Verifies `App.tsx` threads `settings.reducedMotion` into both `GameBoard reducedMotion` AND `GameOverOverlay reducedMotion={settings.reducedMotion}` (`>=2` sites), `storage/schema.ts DEFAULT false`, `grep reducedMotion={false} App.tsx` returns empty (no hardcoded literal). Failure would mean wiring regression `App.tsx:929` re-hardcoded `false` (R-003).
- ✅ **`[P1-03] GameBoard feel gating board-only`** — Status: GREEN — Verifies `GameBoard` gates `moveResult.moved && !reducedMotion && direction` for shake + `shouldTriggerBulletTime` for `bulletFlash 60+140` + `if(!reducedMotion)` for particle bursts + `AnimatedTile isPunch = isMerge && !reducedMotion`, board `Animated.View shakeStyle` wraps `Canvas` only, bullet overlay `position:absolute width×width #fff7e0`, chrome `Hud`/`PreviewCard` never inside `Animated.View`. Failure would mean chrome leak shaking HUD (R-004).
- ✅ **`[P1-04] GameOverOverlay fade branches`** — Status: GREEN — Verifies `GameOverOverlay` render with `reducedMotion true → scrimOpacity 1 / contentOpacity 1 / contentY 0` instantly (no `Animated.timing`), with `false → Animated.parallel FADE_MS 280 + delay 80 cubic + cleanup stopAnimation`, `useRef` seeding `reducedMotion ? 1 : 0` / `? 0 : 12` prevents first-frame flash. Failure would mean instant vs soft fade inverted or missing cleanup (R-003).
- ✅ **`[P1-05] mid-animation snap false→true withTiming(0,20)`** — Status: GREEN — Verifies `useEffect([reducedMotion])` snaps `shakeX/Y` + `bulletFlash` `withTiming(0,20)` alongside `haptics stay` code check, `shouldTrigger(..., true) false` even for heavy tiers. Failure would mean residual `0.45` opacity or `translateX` offset after toggle (R-006).
- ✅ **`[P1-06] chrome guard + haptics stay`** — Status: GREEN — Verifies `GameBoard` never imports `PreviewCard`/`Hud`, `haptics.ts` code never reads `reducedMotion` (only comment), `feel.ts` has `// FR-30: Reduced Motion is a preset` comment, haptics mapping unchanged. Failure would mean chrome flashing or haptics silenced (R-004, R-009).

**P2 medium — edge / regression / perf (6 tests, 4 GREEN + 2 expected RED):**
- ✅ **`[P2-01] perf micro-bench — feel helpers host-cheap`** — Status: GREEN — Verifies `1k` sweeps `<<500ms`, `median <0.05ms / p99 <0.1ms` for both profiles, `feel.bench.test.ts` budgets present. Failure would mean per-merge allocation drift pushing `p99` beyond `16.7ms` (R-007).
- ✅ **`[P2-02] datum literal scan — no scattered literals outside datum`** — Status: GREEN — Verifies `REDUCED_PRESET` single-source in `feel.ts`, `punch.ts`/`shake.ts` import via `reducedPresetFor`, `shakeMs/particleBurst/overshootScale/flash` literals only in `feel.ts`. Failure would mean scattered `if(flag) return 0` literals outside `feel/*` helpers (R-002).
- ✅ **`[P2-03] reducedMotion allowlist`** — Status: GREEN — Verifies `reducedMotion` hits only `feel.ts:REDUCED_PRESET/reducedPresetFor` + `punch.ts` + `shake.ts` + `bulletTime.ts` helpers (never `haptics.ts` code), `GameBoard`/`GameOverOverlay`/`App` cover all render gates (`>=2` wiring sites, zero `reducedMotion={false}` literals). Failure would mean `reducedMotion` leak outside allowlist (R-001, R-009, R-003).
- 🔴 **`[P2-04] overlapping shake/bullet without cancelAnimation (EXPECTED RED — requires fix)`** — Status: RED — Verifies `GameBoard` must call `cancelAnimation(bulletFlash/shakeX/Y)` before new `withSequence` to avoid truncated overlap when `EARLY_INPUT_MS 84ms` re-opens gate before `200ms` bullet / `130ms` shake completes (deferred R-006/R-007, same class as 8-3 R-001). Currently no `cancelAnimation` — second rapid new-best `6→12` within `~90ms` truncates first flash/shake. Fix: import `cancelAnimation` and call before each `withSequence`.
- 🔴 **`[P2-05] burst accumulation setTimeout orphan without cleanup (EXPECTED RED — requires fix)`** — Status: RED — Verifies `GameBoard` bursts use bare `setTimeout 500ms` auto-clear without tracking handle (`settleTimerRef` pattern not reused for bursts) — orphan on unmount or rapid re-render. Currently `burstsBareTimeout` with `setBursts(filter)` but no `clearTimeout` on unmount — deferred burst accumulation orphan (`spec-8-5-reduced-motion.md` Residual risks, same as 8-2 R-002). Fix: track `burstTimerRef` and clear on unmount, or use reanimated `runOnJS` cleanup.
- ✅ **`[P2-06] board edge clipping overflow hidden product decision (deferred low)`** — Status: GREEN — Verifies `GameBoard` board container is `width×width` and `shakeStyle` is board-only (already pinned in P1-03); documents deferred `5-8px` shake may clip without `overflow:visible` or bleed margin — accepted as deferred low (no `assert.fail`), product decision.

**Summary:** 21 tests total — 19 GREEN (all P0 + P1 + 4 P2) + 2 expected RED (`[P2-04]` `cancelAnimation` + `[P2-05]` burst orphan, both deferred per `spec-8-5-reduced-motion.md` Residual risks + `deferred-work.md` lows). Host runner is `node:test` pure-module; no Playwright/E2E/API harness. Full suite with this ATDD file is `835 total, 824 GREEN / 11 RED` (`11 = 9 prior from 8-1/8-2/8-3/8-4 carry-overs + 2 new`); without the 2 RED patterns `P2-04|P2-05` the 8-5 file is `19 pass / 0 fail`.

### E2E Tests

Not scaffolded — 8-5 is a pure helper + preset + Reanimated worklet story, not a web Playwright flow. Device smoke (P1-07 in test-design) remains manual: real iPhone dev build, `6→subtle shake`, `12→stronger + flash/particles/overshoot`, `1536→glow`, new-best `12→~200ms bullet flash`, game over `→280ms soft fade`; toggle Reduced Motion ON → repeat each → flat overlay (no shake/flash/particles/overshoot/glow/bullet) and game-over instant (`setValue(1)/0`), while **haptics still felt + sound plays**; NOOP → no feel; `Hud` preview card & score never shake/flash even when board does; `mid-shake toggle → snap within one frame`; `AIRPLANE` mode → same; portrait+landscape.

### API / Contract Tests

Not scaffolded — no backend API in this delta (frontend-only Expo RN). `tea_use_pactjs_utils:false` per config.

### Component Tests

Host integration via `reducedMotion.atdd.test.ts` P1 covers the declarative trace→board→feel→game-over wiring; no separate `tests/components` harness needed for this story (same as 8-1 haptics/8-2 punch/8-3 shake/8-4 bullet precedent). If a future story adds a component harness, these P1/P2 source-structure gates become the regression pins.

---

## Data Factories Created

None required — this is a pure-function story; test inputs are built from `entry(value, spawned, fromLen)` helper and `allPresetValues()`/`presetFor`/`reducedPresetFor` helpers mirroring engine data (same as 8-3 shake + 8-4 bullet ATDD). No faker needed (determinism mandatory, `triade/AGENTS.md` forbids `Math.random`).

**Helper used in `reducedMotion.atdd.test.ts`:**
```ts
function entry(value: number, spawned = false, fromLen = 2): any {
  const from = fromLen === 2 ? ([[0,0],[0,1]]) : fromLen === 1 ? ([[0,0]]) : [];
  return { value, to: [0,0], from, spawned };
}
```
Deterministic, no shared mutable state.

---

## Fixtures Created

None required — no auth, no DB, no API client. Engine fixture is a real `presetFor`/`reducedPresetFor` data-driven mapping (not a DB fixture); `GameBoard`/`GameOverOverlay` wiring is verified via `readSrc` source-structure gates, not a Playwright fixture. No auto-cleanup needed (pure memory).

---

## Mock Requirements

None — `feel/*` is pure (no RN/Reanimated/Skia imports except `GameBoard`/`GameOverOverlay` which are trust-but-verify via device smoke). `GameBoard` Reanimated `withTiming`/`withSequence`/`Animated.View` timing physics is not mocked in unit; host only asserts `withTiming(0,20)` snap string and `cancelAnimation` absence (RED). `expo-haptics` is not mocked (8-1 best-effort `void import()` path, not gated).

---

## Required data-testid Attributes

None — no new DOM/HTML `data-testid` attributes required for this host suite (React Native Skia Canvas, not DOM). The feel layer is `Animated.View` style `transform`/`opacity` and `GameOverOverlay` `scrimOpacity`/`contentOpacity`/`contentY` — test hook is the existing `settings.reducedMotion` prop and `shouldTriggerBulletTime`/`punch*For` helpers, not a test ID. If a future web harness is added, these would be needed: `board-container` (shake + flash host), `bullet-flash-overlay` (`#fff7e0`), `game-over-overlay`/`game-over-scrim` — but not required for 8-5 host gates.

**Implementation reference (already in working tree):**
```tsx
// GameBoard: board-only shake + bullet overlay (ATDD P1-03/P1-05)
<Animated.View style={shakeStyle}><Canvas>...</Canvas></Animated.View>
<Animated.View pointerEvents="none" style={[{ position:'absolute', left:0, top:0, width, height:width, borderRadius:14, backgroundColor:'#fff7e0' }, bulletFlashStyle]} />
// GameOverOverlay: instant vs 280ms fade (ATDD P1-04)
const scrimOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
if (reducedMotion) { scrimOpacity.setValue(1); } else { Animated.parallel([Animated.timing(..., { duration: 280 })]).start() }
```

---

## Implementation Checklist

### Test: `[P0-01]` + `[P0-02]` — preset identity vs reduced copy / haptic-preserving

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts`

**Tasks to keep this test green:**
- [x] `triade/src/feel/feel.ts` — keep `FEEL_PRESETS` frozen, `presetFor` returns frozen canonical (`===`), `REDUCED_PRESET` frozen `shakeMs 0 / particleBurst 0 / overshootMs 0 / overshootScale 1 / flash false` plus `reducedPresetFor(value)` copies `haptic` from `presetFor(value)` and zeroes visuals, `try/catch` never-throw on non-finite, comments `// FR-30: Reduced Motion is a preset` + `// ADR-04 emergency fallback`. Verify `triade/src/feel/feel.ts:50-105`.
- [x] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-0[12]"`

**Estimated Effort:** 0.25 h (pin only).

### Test: `[P0-03]` — punch flat under Reduced Motion

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts`

**Tasks:**
- [x] `triade/src/feel/punch.ts` — keep all 5 helpers delegating to `reducedPresetFor(value)` when `reducedMotion===true` (preset-not-flag): `punchScaleFor → overshootScale`, `punchDurationFor → overshootMs`, `shouldFlash → flash`, `particleCountFor → particleBurst`, `shouldGlow → false` (also `value>=1536` gate, `false` when reduced). Verify `triade/src/feel/punch.ts:7-32`.
- [x] Keep `punchProfileFor` flat (`scale 1, duration 0, flash false, particles 0, glow false`) when reduced.
- [x] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-03"`

**Estimated Effort:** 0.25 h.

### Test: `[P0-04]` + `[P1-01]` (shake flat + trace contract)

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts`

**Tasks:**
- [x] `triade/src/feel/shake.ts` — keep `shakeMsFor` delegating to `reducedPresetFor(value).shakeMs` (`→0`) when gated, `maxShakeForTrace` early-return `0` when `reducedMotion`, `SHAKE_CAP=8` single cap, `Number.isFinite` + `try/catch` never-throw, never gates haptics. Verify `triade/src/feel/shake.ts:18-21,49-54`.
- [x] Keep merge predicate `from.length===2 && !spawned && Number.isFinite(entry.value)` aligned with `src/engine/core/line.ts` contract (no drift) — same predicate used in `maxMergeValue`/`triggerHapticsForTrace`/`maxShakeForTrace`.
- [x] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-04|P1-01"`

**Estimated Effort:** 0.25 h.

### Test: `[P0-05]` — bullet gated but `nextSessionBest` still advances (FR-30)

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts`

**Tasks:**
- [x] `triade/src/feel/bulletTime.ts` — keep `shouldTriggerBulletTime` early-return `if (reducedMotion) return false` before `isNewSessionBest`, `nextSessionBest` still advances (blind to flag), `Number.isFinite` guards, never touches haptics state. Verify `triade/src/feel/bulletTime.ts:39-50,53-65`.
- [x] Keep `BULLET_TIME_MS=200` single datum (not per-preset).
- [x] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-05"`

**Estimated Effort:** 0.25 h.

### Test: `[P0-06]` + `[P1-06]` + `[P2-03]` (haptics stay + allowlist)

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts`

**Tasks:**
- [x] `triade/src/feel/haptics.ts` — keep `// FR-30: haptics stay under Reduced Motion — never gate on reducedMotion` at gateway and ensure no code import of `reducedMotion`/`settings` (allow comment only). Verify `triade/src/feel/haptics.ts:2` and `grep -n "reducedMotion" triade/src/feel/haptics.ts` is only comment (code-only grep empty).
- [x] Keep `hapticsStyleForValue(12)` → `Heavy` regardless of `reducedMotion` (gateway does not take flag), `reducedPresetFor(12).haptic heavy` proves preservation.
- [x] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-06|P1-06|P2-03"`

**Estimated Effort:** 0.25 h.

### Test: `[P0-07]` (glow) + `[P0-09]` (caps + bench) + `[P2-01]` + `[P2-02]` (bench + literal scan)

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts` + `triade/benchmarks/feel.bench.test.ts`

**Tasks:**
- [x] `triade/src/feel/punch.ts` — keep `shouldGlow` as `if(reducedMotion) return false; if(!Number.isFinite(value)) return false; return value>=1536` (only glow in system, gated). Verify `triade/src/feel/punch.ts:27-32`.
- [x] `triade/src/feel/shake.ts` — keep `SHAKE_CAP=8`, `triade/src/feel/bulletTime.ts` keep `BULLET_TIME_MS=200`, `triade/src/ui/GameOverOverlay.tsx` keep `FADE_MS=280`.
- [x] `triade/benchmarks/feel.bench.test.ts` — keep sweep both profiles: iterates `allPresetValues()` calling `presetFor/reducedPresetFor + punch*For + shake*For + shouldTriggerBulletTime/shouldShake/maxShakeForTrace` with synthetic traces, budgets `median <0.05ms / p99 <0.1ms` (frame-budget headroom); reduced asserts zero visuals while haptic mapping unchanged. Verify `triade/benchmarks/feel.bench.test.ts:80-142` (already 2 tests `full 9.6ms / reduced 6.5ms` total).
- [x] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-0[79]|P2-0[12]"` + `node --test triade/benchmarks/feel.bench.test.ts`

**Estimated Effort:** 0.25 h.

### Test: `[P0-08]` + `[P1-04]` (game-over fade branches)

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts`

**Tasks:**
- [x] `triade/src/ui/GameOverOverlay.tsx` — keep `reducedMotion` prop gating: `true → instant setValue(1)/0` (no `Animated.timing`), `false → 280ms Animated.parallel` fade with cleanup `stopAnimation`, `useRef(new Animated.Value(reducedMotion ? 1 : 0))` init prevents first-frame flash. Verify `triade/src/ui/GameOverOverlay.tsx:51-75`.
- [x] `triade/App.tsx` — keep `GameOverOverlay` wiring `reducedMotion={settings.reducedMotion}` (was hardcoded `false`) so soft fade respects setting; thread `settings.reducedMotion` consistently to `GameBoard` (already) and `GameOverOverlay`. Verify `triade/App.tsx:929`.
- [x] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-08|P1-04"` + verify no other hardcoded literal suppresses it (`grep -rn "reducedMotion={false}" triade/App.tsx` must be empty).

**Estimated Effort:** 0.25 h.

### Test: `[P1-02]` (App threading) + `[P1-03]` (GameBoard board-only) + `[P1-05]` (mid-flight snap)

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts`

**Tasks:**
- [x] `triade/App.tsx` — keep `settings.reducedMotion` owned via `storage/schema.ts` (`DEFAULT false`) and threaded to both consumers in same render; `rg -n "reducedMotion={settings.reducedMotion}" triade/App.tsx` must show `>=2` sites, zero `reducedMotion={false}` literals. Verify `triade/App.tsx` + `triade/src/services/storage/schema.ts`.
- [x] `triade/src/render/GameBoard.tsx` — keep existing gating: `reducedMotion` prop gates shake `moveResult.moved && !reducedMotion && direction`, bullet `shouldTriggerBulletTime(...,!!reducedMotion)`, bursts `if(!reducedMotion)`, `AnimatedTile isMerge && !reducedMotion` for overshoot/flash/glow; board container is only `Animated.View` (never chrome), mid-flight snap `useEffect([reducedMotion])` with `withTiming(0,20)` for `shakeX/Y` + `bulletFlash`. Verify `triade/src/render/GameBoard.tsx:98,123-126,311-318,378-391,430-467,471-477`.
- [x] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P1-0[235]"`

**Estimated Effort:** 0.5 h.

### Test: `[P2-04] R-006 overlapping shake/bullet concurrency (EXPECTED RED — requires fix)`

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts` — currently **RED**

**Tasks to make this test pass:**
- [ ] **Fix `triade/src/render/GameBoard.tsx` overlapping shake/bullet:** add `cancelAnimation(shakeX/Y/bulletFlash)` (from `react-native-reanimated`) before each new `withSequence`/`withTiming` when `EARLY_INPUT_MS 84ms` re-opens gate before `130ms` shake / `200ms` bullet completes. Current `shakeX/Y withSequence 30+40+30+30=130ms` and `bulletFlash withSequence 60+140=200ms` are overwritten without cancel → truncated overlap/jank (deferred R-006, same class as 8-3 R-001 and 8-4 R-007).
- [ ] Import `cancelAnimation` alongside `withSequence`/`withTiming` at `triade/src/render/GameBoard.tsx:5`.
- [ ] Call `cancelAnimation(shakeX); cancelAnimation(shakeY); cancelAnimation(bulletFlash);` at top of `if (moveResult.moved && !reducedMotion && direction)` and bullet trigger blocks before `shakeX/Y.value = withSequence(...)` / `bulletFlash.value = withSequence(...)`.
- [ ] On device, rapid new-bests `6→12` within `~90ms` (EARLY_INPUT window) must show no freeze and second `200ms` flash + `130ms` shake start clean — video capture in PR.
- [ ] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P2-04"` — must turn GREEN after fix.

**Estimated Effort:** 0.5–1 h before 8-6 (shake+bullet+punch are concurrent main-thread worklets).

### Test: `[P2-05] R-010 burst accumulation setTimeout orphan (EXPECTED RED — requires fix)`

**File:** `triade/__tests__/feel/reducedMotion.atdd.test.ts` — currently **RED**

**Tasks to make this test pass (choose fix, do not fix both without review):**
- [ ] **Option A (preferred):** track burst `setTimeout` handle via `burstTimerRef` (like `settleTimerRef`) and `clearTimeout` on unmount / before new burst batch, so `500ms` auto-clear does not orphan when `GameBoard` unmounts mid-burst or rapid `12→12→12` merges accumulate bursts (deferred low per `spec-8-5-reduced-motion.md` Residual risks).
- [ ] **Option B (accept as deferred):** document `setTimeout 500ms` orphan as accepted low (bursts are board-local `position:absolute pointerEvents:none` and self-clear within `500ms` — not reachable as leak in normal play) and change this test to `assert.ok(true, 'burst orphan accepted as deferred')` with UX sign-off, so future refactors don't "fix" it back without product review.
- [ ] Device video: heavy `12` burst `16 dots` at board center does not visibly accumulate after `3` rapid merges (no `500ms` stacking beyond `16` per merge).
- [ ] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P2-05"` — must turn GREEN after decision (either fix or accepted-with-sign-off).

**Estimated Effort:** 0.25–0.5 h.

### Test: P2-02/P2-06 static + bench gates + full suite

**File:** `triade/` full suite

**Tasks:**
- [x] `npm test` inside `triade/` — observed `835` total with this ATDD file (`824 GREEN / 11 RED` = `9 prior from 8-1/8-2/8-3/8-4 carry-overs + 2 new 8-5 RED`), with `P2-04|P2-05` excluded the 8-5 file is `19 PASS`. Baseline `805 pass / 9 fail` at `0ec7482` per spec already includes `feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 + `feel.bench.test.ts` 2 (`full 9.6ms / reduced 6.5ms`).
- [x] `npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json` clean — `feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts`/`haptics.ts` strictly typed, no `@ts-ignore`, no `Math.random`.
- [x] `git diff --stat -- triade/src/engine` **must be empty** — engine byte-identical (verified `0ec7482` stat).
- [x] Guard suites stay green without modification: `triade/__tests__/feel/feel.test.ts` (12), `punch.test.ts` (8), `shake.test.ts` (12), `bulletTime.test.ts` (9).
- [x] `node --test triade/benchmarks/feel.bench.test.ts` — 2 pass under `0.05/0.1` budgets (both profiles).
- [x] Run: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P2-0[126]"`

**Estimated Effort:** 0.5 h.

---

## Running Tests

```bash
# Run this ATDD suite (this story) — shows 19 GREEN + 2 expected RED (R-006 burst/cancelAnimation)
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts

# Run only the passing P0/P1 pins (quick smoke, <5s)
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-|P1-|P2-0[1236]"

# Run a single ATDD case by name
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P2-04"
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P2-05"

# Run the existing feel P0 suites (always green)
cd triade && npm test -- __tests__/feel/feel.test.ts -- __tests__/feel/punch.test.ts -- __tests__/feel/shake.test.ts -- __tests__/feel/bulletTime.test.ts

# Run the whole suite (full gates) — 835 total with this ATDD file, 11 RED deferred (9 prior + 2 new)
cd triade && npm test

# Type-check (CI gate)
npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json
# Engine purity gate (must be empty)
git diff --stat -- triade/src/engine
# Feel datum + predicate allowlist static gates (embedded in ATDD P2-02/P2-03)
grep -R "REDUCED_PRESET" triade/src --include="*.ts" --include="*.tsx"
grep -R "from.length===2" triade/src --include="*.ts" --include="*.tsx"
# App wiring gate (P1-02)
grep -n "reducedMotion={settings.reducedMotion}" triade/App.tsx
grep -n "reducedMotion={false}" triade/App.tsx  # must be empty
# Benchmark both profiles (P2-01)
node --test triade/benchmarks/feel.bench.test.ts
```

> No headed/debug browser mode — this is `node:test` pure-module suite. The only browser E2E is `triade/__tests__/e2e/session.e2e.test.ts`, unrelated to 8-5.

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**
- ✅ Red-phase scaffolds written for all 5 ACs + high risks R-001/R-002/R-003 (21 tests in `reducedMotion.atdd.test.ts`; P0 9 groups green, P1 6 groups green, P2 6 checks with 2 expected RED — true RED, not `test.skip()`).
- ✅ Scaffolds are real failing-if-violated assertions (19 GREEN on current delta, 2 RED documenting residual risks) — appropriate for this `node:test` pure-function + source-structure story (same as 7.4 invariant + 8-3 shake + 8-4 bullet precedent).
- ✅ No factories/fixtures/mocks/data-testids required (pure function + source-structure gates, no UI change beyond `GameBoard` `Animated.View` board-only + `GameOverOverlay` instant/280ms fade); mock requirements documented (Reanimated/Skia worklets trust-but-verify via device).
- ✅ Implementation checklist created and mapped to spec tasks.

**Verification:**
- `reducedMotion.atdd.test.ts` currently reports **21 tests: 19 pass, 2 fail** (exit non-zero for the 2 RED) — would be 21 GREEN if R-006/R-010 are fixed. Run without the 2 RED patterns: `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-|P1-|P2-0[1236]"` is exit 0 (`19 pass`).
- `feel.test.ts` 12 pass, `punch.test.ts` 8 pass, `shake.test.ts` 12 pass, `bulletTime.test.ts` 9 pass — guard suites untouched, always green.
- `feel.bench.test.ts` 2 pass (`full 9.6ms / reduced 6.5ms` total for `10k`, `median <0.05ms / p99 <0.1ms` both profiles).
- Activation guidance: fix `[P2-04]` by adding `cancelAnimation(bulletFlash/shakeX/Y)` before new `withSequence` and `[P2-05]` by deciding burst `setTimeout` tracking vs accepted — then confirm RED turns GREEN before marking story fully verified. Carry-over expected RED from 8-1/8-2/8-3/8-4 (`haptics` R-001/R-006 + `punch` R-002/R-007 + `shake` R-001/R-007 + `bullet` R-007/R-010) remain deferred per `spec-8-5-reduced-motion.md` Review Triage.

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**
1. Verify **P0** (`P0-01..P0-09`) is green — it already is on `0ec7482`. If any case is RED, do not edit tests; fix `feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts` as a separate `patch` commit.
2. Verify **P1-01..P1-06 and P2-01..P2-03/P2-06** is green — they already are.
3. Fix **P2-04 (R-006) / P2-05 (deferred burst)** with FE lead + UX (one is `cancelAnimation` one-line; other is burst `setTimeout` tracking product decision + 8px bleed margin) and make those two RED tests turn GREEN via the fix (or accepted-behaviour update with sign-off).
4. Run **full gates** (`npm test` — expect `824 GREEN / 11 RED` after this ATDD where `11 = 9 prior + 2 new`, or `835 GREEN` if R-006/burst accepted vs fixed — then `npx tsc --noEmit`, `git diff --stat -- triade/src/engine` empty, `node --test benchmarks/feel.bench.test.ts` 2 pass).
5. Check off tasks in the implementation checklist.

**Key Principles:**
- Do not gate haptics or sound on `reducedMotion` (FR-30 — `feel.ts` `reducedPresetFor` preserves haptic, `haptics.ts` never gates; enforced by `[P0-06]` + `grep haptics.ts` code-only gate).
- `REDUCED_PRESET` is the **single source** for reduced visuals (feel `shakeMs 0 / particleBurst 0 / overshootMs 0 / overshootScale 1 / flash false` is the only access point; `punch.ts`/`shake.ts`/`bulletTime.ts` delegate via `reducedPresetFor`; enforced by `[P0-02]`/`[P2-02]`/`[P2-03]`).
- `SHAKE_CAP 8` caps shake, `BULLET_TIME_MS 200` is single datum, `GameOver FADE_MS 280` is single literal — never exceed without data change (enforced by `[P0-09]`).
- Keep `BULLET_TIME_MS-60` derived, not hardcoded `140` (enforced by `[P1-03]`).
- Keep `GameBoard` `Animated.View` board only (never `Hud`/`PreviewCard` — enforced by `[P1-03]`/`[P1-06]`) and `AnimatedTile isPunch = isMerge && !reducedMotion` (enforced by `[P1-03]`).
- Keep `App.tsx` `reducedMotion={settings.reducedMotion}` wired to both `GameBoard` and `GameOverOverlay` with no literal `false` (enforced by `[P1-02]` + `app.gameOverWiring.test.ts`/`app.restart.test.ts` pins).
- Keep `GameOverOverlay` instant `setValue` vs `Animated.parallel 280ms` branches with `stopAnimation` cleanup (enforced by `[P1-04]`).

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Verify full `npm test` green (all 21 ATDD tests GREEN after R-006/burst fixed, plus existing 12 feel + 8 punch + 12 shake + 9 bullet + 2 bench).
2. Confirm `git diff --stat -- triade/src/engine` empty and `feel/feel.ts`/`feel/punch.ts`/`feel/shake.ts`/`feel/bulletTime.ts`/`feel/haptics.ts`/`render/GameBoard.tsx`/`ui/GameOverOverlay.tsx`/`App.tsx`/`services/storage/schema.ts`/`benchmarks/feel.bench.test.ts` are the only reduced-motion-touched files.
3. Confirm guard suites untouched and green (`feel.test.ts`, `punch.test.ts`, `shake.test.ts`, `bulletTime.test.ts`, `feel.bench` 2 pass, engine purity).
4. Update `_bmad-output/implementation-artifacts/deferred-work.md` only with NEW gaps; do not close prior entries unless empirically verified (R-006/burst remain until product decision is implemented and device video shows clean overlap + no burst orphan).
5. No scattered ladder literals — sequence still derived from `REDUCED_PRESET` + `allPresetValues()` / `FEEL_PRESETS` + `SHAKE_CAP`/`BULLET_TIME_MS`/`FADE_MS`.
6. Consider extracting shake+bullet+burst timer/motion logic to a helper if 8-6 SFX adds its own main-thread worklets (avoid proliferating bare `withSequence` patterns).

---

## Next Steps

1. Hand this checklist + `reducedMotion.atdd.test.ts` to `dev-story` for 8-5 (story is `done` in `sprint-status.yaml` but verification is gated on the two RED overlap/burst items plus device lane).
2. DEV fixes **R-006/burst** (`cancelAnimation` + burst `setTimeout` tracking product decision) — make the two RED tests GREEN (one code change + one product decision).
3. PR author runs the one-time **15-min device smoke** (P1-07 in test-design): real iPhone dev build, `6→subtle`, `12→strong + flash/particles/overshoot`, `1536→glow`, new-best `12→~200ms bullet flash`, game over `→280ms soft fade`; toggle Reduced Motion ON → repeat each → flat overlay (no shake/flash/particles/overshoot/glow/bullet) and game-over instant (`setValue(1)/0`) while haptics still felt + sound plays; `NOOP → no feel`; `Hud` preview card & score never shake/flash even when board does; `mid-shake toggle → snap within one frame`; `AIRPLANE` mode → same; portrait+landscape. Check box in PR description.
4. When all gates pass (this ATDD 19 GREEN + 2 RED deferred, plus 8-1/8-2/8-3/8-4 carry-over decisions on R-001/R-006/R-002/R-007/R-010), mark story 8-5 verified in `test-design-epic-8-5-reduced-motion.md` Exit Criteria.

---

## Knowledge Base References Applied

- **test-quality.md** — one assertion per test (sweep is one logical assertion: mapping + identity + never-throw), determinism, isolation (every pin builds its own `TraceEntry[]`, no shared mutable state).
- **data-factories.md** — adapted: no faker (determinism mandatory); inputs built from `allPresetValues()` + `presetFor`/`reducedPresetFor` helpers mirroring engine data.
- **test-levels-framework.md / test-priorities-matrix.md** — Unit is the correct level for pure preset + observer contract + source gates; all P0 are `P0` due to FR-30/UX-DR-16 umbrella criticality.
- **risk-governance.md / probability-impact.md** — R-001/R-002/R-003 score 6 — surfaced as ATDD pins (same as 8-1 R-001/R-006 pattern, 8-2 R-002 pattern, 8-3 R-001/R-007 pattern, 8-4 R-007/R-010 pattern).
- **nfr-criteria.md** — 60 FPS/never-throw/FR-30/chrome-rule/cap/offline gaps become P0/P2 tests.
- Project testing standards (from `spec-8-5-reduced-motion.md` Dev Notes): `node:test` + `node:assert`; pure-module tests under `__tests__/feel/`; test names `[P0-..]` / `[P1-..]`; ESM imports with explicit `.ts` extensions; `strict:true`; no `Math.random`.

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification (actually 19 GREEN + 2 expected RED)

**Command (ATDD suite):**
```bash
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts
```

**Results (current working-tree `0ec7482` + this ATDD file):**
```
▶ ATDD 8-5 — P0 critical (spec I/O matrix)
  ✔ [P0-01] AC preset identity vs reduced copy — presetFor frozen canonical, reducedPresetFor copy with haptic preserved
  ✔ [P0-02] AC reducedPresetFor preserves haptic, zeroes visuals (FR-30 preset-not-flag)
  ✔ [P0-03] AC punch flat under Reduced Motion for every tier (UX-DR-16)
  ✔ [P0-04] AC shake flat under Reduced Motion (S8.3 + S8.5 umbrella)
  ✔ [P0-05] AC bullet gated under Reduced Motion while nextSessionBest still advances (FR-30)
  ✔ [P0-06] AC haptics stay under Reduced Motion — never gated (FR-30, UX-DR-16)
  ✔ [P0-07] AC glow 1536+ only glow, gated under Reduced Motion
  ✔ [P0-08] AC game-over fade branches + never throw (S8.5 + UX-DR-16)
  ✔ [P0-09] AC caps single-source + benchmark both profiles under budget (NFR-14)
✔ ATDD 8-5 — P0 critical (spec I/O matrix)
▶ ATDD 8-5 — P1 high (integration / wiring)
  ✔ [P1-01] trace→feel contract via REAL engine trace: merge iff from.length===2 && !spawned
  ✔ [P1-02] App threading settings.reducedMotion into GameBoard AND GameOverOverlay (no hardcoded false)
  ✔ [P1-03] GameBoard feel gating board-only (shake/bullet/bursts/AnimatedTile isMerge && !reducedMotion)
  ✔ [P1-04] GameOverOverlay fade branches — instant when reducedMotion vs 280ms Animated.parallel
  ✔ [P1-05] mid-animation snap false→true withTiming(0,20) for shake/bullet (FR-30)
  ✔ [P1-06] chrome guard + haptics stay — board Animated.View never wraps Hud/PreviewCard, haptics never gated
✔ ATDD 8-5 — P1 high (integration / wiring)
▶ ATDD 8-5 — P2 medium (edge / regression / perf)
  ✖ [P2-04] overlapping shake/bullet without cancelAnimation (EXPECTED RED)
  ✖ [P2-05] burst accumulation setTimeout orphan without cleanup (EXPECTED RED)
  ✔ [P2-01] perf micro-bench — feel helpers host-cheap (<0.05 median / <0.1 p99)
  ✔ [P2-02] datum literal scan — no scattered literals outside datum
  ✔ [P2-03] reducedMotion allowlist — only feel/* helpers + GameBoard/GameOverOverlay/App, never haptics
  ✔ [P2-06] board edge clipping overflow hidden product decision (deferred low)
✖ ATDD 8-5 — P2 medium (edge / regression / perf)
ℹ tests 21
ℹ suites 3
ℹ pass 19
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
✖ failing tests:

test at __tests__/feel/reducedMotion.atdd.test.ts:336
✖ [P2-04] overlapping shake/bullet without cancelAnimation (EXPECTED RED)
  AssertionError [ERR_ASSERTION]: GameBoard must call cancelAnimation(bulletFlash/shake) before new withSequence to avoid truncated overlap when EARLY_INPUT re-opens gate before 200ms bullet/130ms shake completes (R-006/R-007 deferred — expected RED until fixed)

test at __tests__/feel/reducedMotion.atdd.test.ts:347
✖ [P2-05] burst accumulation setTimeout orphan without cleanup (EXPECTED RED)
  AssertionError [ERR_ASSERTION]: GameBoard bursts must track setTimeout handle and clear on unmount (deferred burst orphan — expected RED until fix)
```

**Command (P0/P1 only — quick smoke, <5s):**
```bash
cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-|P1-|P2-0[1236]"
# Result: 19 pass / 0 fail (the 2 RED patterns excluded) — confirms P0/P1 host contract is GREEN.
```

**Command (full suite with this ATDD file):**
```bash
cd triade && npm test
# Result: 835 total with this ATDD file; 824 pass + 11 fail (9 prior from 8-1/8-2/8-3/8-4 carry-overs + 2 new 8-5 RED) — all 11 are expected RED deferred.
# Prior at 0ec7482 without this ATDD: 814 total, 805 pass / 9 fail (spec Auto Run Result).
# With this ATDD: +21 tests (19 new GREEN + 2 RED) → 835 total, 824 GREEN / 11 RED.

cd triade && npm test -- __tests__/feel/feel.test.ts -- __tests__/feel/punch.test.ts -- __tests__/feel/shake.test.ts -- __tests__/feel/bulletTime.test.ts
# Result: 12 + 8 + 12 + 9 = 41 pass (existing feel suites) — unchanged, always green.

cd triade && node --test benchmarks/feel.bench.test.ts
# Result: 2 pass (full 9.6ms / reduced 6.5ms total for 10k, median <0.05ms / p99 <0.1ms both profiles)
```

**Summary:**
- Total ATDD 8-5 tests: 21
- Passing (GREEN on current delta): 19 (all P0 + P1-01..P1-06 + P2-01/02/03/06)
- Failing (RED on current delta, expected): 2 (`[P2-04]` R-006 `cancelAnimation` missing, `[P2-05]` burst orphan — same root causes as `spec-8-5-reduced-motion.md` Residual risks) — documents residual risks.
- Status: ✅ Red-phase scaffolds verified (fail-if-violated, currently 19 GREEN / 2 expected RED — correct for working-tree delta `0ec7482`).
- Full suite: 824 GREEN + 11 RED (2 new + 9 carry-over) — 835 total. With `P2-04|P2-05` excluded, 8-5 file is 19 GREEN.

---

## Notes

- **No `test.skip()` used by design:** this is a `node:test` pure-function suite; the intended ATDD signal is a non-zero exit when the contract is violated (true RED) that stays green while the contract holds — matches 7.4 invariant + 8-3 shake + 8-4 bullet precedent and the story's "implementation already in working tree" posture. If the team prefers committed-green scaffolds, keep P0/P1 as-is and gate the 2 RED tests with a waiver until 8-6 (they already map to `deferred-work.md` entries).
- **Engine untouched:** `git diff --stat -- triade/src/engine` must stay empty; `triade/src/feel/feel.ts` + `punch.ts`/`shake.ts`/`bulletTime.ts`/`haptics.ts` + `render/GameBoard.tsx`/`ui/GameOverOverlay.tsx`/`App.tsx`/`services/storage/schema.ts`/`benchmarks/feel.bench.test.ts` are the only production changes (`0ec7482`). The working-tree also has `spec-8-5-reduced-motion.md` plus metadata-only `sprint-status.yaml` `backlog→done`.
- **Working-tree delta vs uncommitted diff:** per `test-design-epic-8-5-reduced-motion.md` Delta under assessment, the production change is `10a3449..0ec7482` (9 files, `263 insertions`); uncommitted `HEAD` diff is only `sprint-status.yaml` + `test-design-progress.md` metadata — no production drift. This ATDD checklist covers the committed `0ec7482` delta plus `HEAD` working tree (byte-identical to `final_revision`).
- **Expo v57 rule:** `triade/AGENTS.md` requires reading https://docs.expo.dev/versions/v57.0.0/ before writing RN code — surfaces here are plain `node:test` TS, no new RN APIs beyond already-pinned Reanimated 4/Skia.
- **Why this checklist is ATDD not test-design:** test-design (`test-design-epic-8-5-reduced-motion.md`) prioritized risks and coverage at epic level; this ATDD checklist generates the red-phase host scaffolds + implementation checklist for `dev-story` to drive the story from RED to GREEN. The two expected RED tests encode the `spec-8-5-reduced-motion.md` Residual risks (burst orphan, overlapping shake) so they cannot be silently ignored in 8-6 (which will add its own SFX main-thread cost alongside shake `130ms` + bullet `200ms` + punch `120ms`).
- **Device lane not scaffolded as code:** P1-07 device smoke (real iPhone Reanimated+Skia: `6 subtle`, `12 heavy+flash/particles/overshoot`, `1536 glow`, new-best `12 bullet 200ms`, game-over `280ms soft fade`; toggle Reduced Motion ON → flat + instant; `Hud` preview never shakes; `mid-shake toggle → snap`) remains manual — see `test-design-epic-8-5-reduced-motion.md` Execution Order > Device gate. This ATDD checklist covers the host automatable surface.
- **Two REDs are one fix + one product decision:** `[P2-04]` is a one-line `cancelAnimation` fix; `[P2-05]` is burst `setTimeout` tracking vs accepted deferred. Do not fix them separately without review.

---

**Generated by BMad TEA Agent** - 2026-09-01
