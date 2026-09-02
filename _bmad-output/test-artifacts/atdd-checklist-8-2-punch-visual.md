---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-01'
workflowType: 'testarch-atdd'
storyId: '8.2'
storyKey: '8-2-punch-visual'
storyFile: '_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual.md'
generatedTestFiles:
  - 'triade/__tests__/feel/punch.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/punch.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/feel/punch.test.ts'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist - Epic 8, Story 8-2: Punch Visual (Overshoot + Flash + Particles + 1536 Glow)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) — `presetFor`/`punch.ts` pure data + `planTileTransitions`→`isMerge` wiring; no E2E/API harness required for 8-2. Device smoke is manual (Skia + Reanimated worklets) and covered in test-design P1-06.

---

## Story Summary

Story 8-2 makes the merged tile punch declarative from the trace in `src/render` (overshoot-and-snap + 1536+ glow) plus imperative worklets in `src/feel` for flash + particle burst scaled by value, gated by Reduced Motion and never firing on chrome (preview card / score). `FeelPreset` (`presetFor(value)`) is the single data source including `overshootScale`/`particleBurst`/`flash`/`overshootMs`; `punch.ts` is a thin pure wrapper (host-testable, no RN/Reanimated imports).

**As a** player
**I want** big merges to visibly pop with overshoot, flash, particles and 1536 glow
**So that** the merge moment lands physically without breaking chrome or Reduced Motion

---

## Acceptance Criteria

1. **AC1 / I-O small+heavy** — Given a merge resolves, when the render and feel layers react, then the merged tile overshoots its size and snaps back — driven declaratively from the trace in `src/render` (`isMerge` from `from.length===2 && !spawned`) with scale/duration from `presetFor` (`3→1.08/80ms`, `6→1.12/100ms`, `12+→1.15/120ms`).
2. **AC2 / I-O scaled flash+particles** — Given a merge, when value scales, then a color flash + particle burst fire at the merge point scaled by value as imperative worklets in `src/feel` (flash only on heavy `>=12`, particles `4/8/16` per tier).
3. **AC3 / chrome guard** — Given any merge, when rendered, then preview card and score never animate with feel effects (chrome rule UX-DR-27: `isMerge` only for board `type==='merge'`, never for `type==='spawn'` or preview `previewFor` values).
4. **AC4 / glow tier** — Given value `1536/3072+`, when merged, then incandescent glow is added (the only glow in the system, `#ff8c2f` 0.28 behind tile) and suppressed under Reduced Motion.
5. **AC5 / FR-30** — Given Reduced Motion enabled, when a merge resolves, then flash/particles/overshoot/glow are cut or smoothed (`scale=1/duration=0/particles=0/flash=false/glow=false`) while haptics and sound stay (`reducedPresetFor(12).haptic==='heavy'`).

---

## Story Integration Metadata

- **Story ID:** `8.2`
- **Story Key:** `8-2-punch-visual`
- **Story File:** `_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md` (final_revision `punch-visual-8-2`, baseline `7604cd1`)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual.md`
- **Generated Test Files:**
  - `triade/__tests__/feel/punch.atdd.test.ts` (NEW — ATDD red-phase scaffolds for the working-tree delta, 19 tests)
  - Existing reference: `triade/__tests__/feel/punch.test.ts` (already 8 P0 host tests, green)
- **Working-tree delta covered:** `triade/src/feel/feel.ts` (extended `FeelPreset.overshootScale` + `REDUCED_PRESET` scale 1) + `triade/src/feel/punch.ts` (new, 47 LOC, 6 pure helpers) + `triade/src/render/GameBoard.tsx` (`reducedMotion` prop, `isMerge`, declarative overshoot, flash overlay, glow, `BurstView`/`ParticleDot` bursts) + `triade/App.tsx` wiring (`settings.reducedMotion` into `GameBoard`) — commit `ef72635` ahead of `origin/main`; uncommitted diff is metadata-only (`sprint-status.yaml` timestamp).

---

## Stack Detection

- **Config `test_stack_type`:** `auto`
- **Detected stack:** `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`)
- **No Playwright/Cypress harness needed:** 8-2 is pure functions + `planTileTransitions` contract + source-structure gates; correct level is **Unit host** + integration via real engine trace fixtures. E2E/API scaffolds are intentionally absent (per `test-design-epic-8-2-punch-visual.md` P0/P1 coverage plan). `tea_use_playwright_utils:true` loaded but not applied (no `page.goto`).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (5 ACs, I/O matrix 7 rows, FR-30/UX-DR-16/UX-DR-27 — `spec-8-2-punch-visual.md`)
- [x] Test framework configured — `triade/package.json` `test` script + `tsconfig.test.json` + `node:test` (existing 728 pass baseline at `ef72635` with 2 pre-existing RED from 8-1)
- [x] Development environment available (Node `>=26`, `tsx` `^4.23`)
- [x] Existing patterns inspected — `__tests__/feel/punch.test.ts` (8 cases, `punchScaleFor`/`shouldGlow`/Reduced Motion/multi-merge), `src/feel/feel.ts` (frozen presets + `REDUCED_PRESET`), `src/feel/punch.ts` (pure wrappers), `src/render/GameBoard.tsx:100-480` (`AnimatedTile` overshoot/flash/glow + `BurstView`), `src/render/transitionPlan.ts:classify`, `App.tsx:387` wiring, `test-design-epic-8-2-punch-visual.md` (10 risks R-001–R-010, P0 8 / P1 6 / P2 5)
- [x] No framework scaffolding gap — `node:test` is the project's existing runner; no Playwright config required for this pure surface

---

## Knowledge Base Fragments Loaded

- **Core:** `data-factories.md` (overrides, determinism — no faker for ladder), `test-quality.md` (one assertion per test, isolation, green criteria), `test-healing-patterns.md`, `test-levels-framework.md`
- **Extended (on-demand):** `test-priorities-matrix.md` (P0/P1/P2 mapping), `risk-governance.md` / `probability-impact.md` (via test-design R-001..R-010), `nfr-criteria.md` (60 FPS / never-throw / FR-30 / chrome rule / offline)
- **Frontend conditional (skipped — pure):** `selector-resilience.md`, `timing-debugging.md`, `component-tdd.md`, `fixture-architecture.md`, `network-first.md` — not needed (no DOM / no network)
- **Playwright Utils (skipped):** `recurse.md` loaded for reference only; no `page.goto` surface this story

---

## Generation Mode

**Chosen:** AI Generation (no browser recording). Reason: acceptance criteria are clear and the surface is pure functions (`punchScaleFor`/`shouldFlash`/`particleCountFor`/`shouldGlow`/`punchProfileFor`) + `planTileTransitions` contract + source-structure gates for `isMerge`/`hasGlow`/`burst` wiring. No UI interaction needs live browser verification. Stack is frontend but 8-2's punch observer is host-testable (`node:test` + `tsx`) — recording would be dead weight. `browser_automation:auto` would prefer CLI/MCP for complex UI, but `punch.ts` has no DOM.

---

## Test Strategy

| AC | Scenario | Level | Priority | File | Test Names |
|----|----------|-------|----------|------|------------|
| AC1 small | `presetFor(3)` light `1.08/80ms/4/false` + wrapper `punchScaleFor(3,false)===1.08` | Unit | P0 | `punch.atdd.test.ts` | `[P0-01] AC1 small merge 3` |
| AC1 medium | `presetFor(6)` medium `1.12/100ms/8/false` | Unit | P0 | `punch.atdd.test.ts` | `[P0-02] AC1 medium merge 6` |
| AC1 heavy | Sweep `12..12288` all heavy `1.15/120ms/16/true` | Unit | P0 | `punch.atdd.test.ts` | `[P0-03] AC1 heavy merge 12+` |
| AC4 glow | `shouldGlow(<1536)===false` / `shouldGlow(1536/3072/6144)===true` (only glow) | Unit | P0 | `punch.atdd.test.ts` | `[P0-04] AC glow tier` |
| AC5 FR-30 | For every tier `3,6,12,24,1536,3072` all visual zeroed + `reducedPresetFor(12).haptic==='heavy'` | Unit | P0 | `punch.atdd.test.ts` | `[P0-05] AC Reduced Motion gate FR-30` |
| AC1+edge | `NaN/Infinity/-5` fallback to light never throw; `shouldGlow(NaN)===false` | Unit | P0 | `punch.atdd.test.ts` | `[P0-06] edge` |
| AC multi | `values [3,6,12]` each map independently `1.08/1.12/1.15` and `4/8/16` | Unit | P0 | `punch.atdd.test.ts` | `[P0-07] AC multiple merges` |
| AC data | All `allPresetValues()` finite `overshootScale 1..1.2`, frozen identity | Unit | P0 | `punch.atdd.test.ts` | `[P0-08] data-not-code` |
| AC1 wiring | `planTileTransitions` over REAL `move(game,dir,rng)` trace: `type==='merge'` iff `from.length===2 && !spawned` | Integration (host, engine fixture) | P1 | `punch.atdd.test.ts` | `[P1-01] trace->isMerge contract` |
| AC3 chrome | `GameBoard.applyPlan` sets `isMerge:true` only inside `merge` branch; `spawn` never `isMerge`; `isMerge && !reducedMotion` gates | Unit (source gate) | P1 | `punch.atdd.test.ts` | `[P1-02] chrome guard` |
| AC1 declarative | `punchScaleFor/Duration` match `presetFor` per tier; `GameBoard` uses `punchPreset.overshootScale/Ms` | Unit (source gate) | P1 | `punch.atdd.test.ts` | `[P1-03] overshoot declarative` |
| AC2 burst | `particleCountFor` 4/8/16 vs 0 when reduced; `GameBoard` burst `if (!reducedMotion) && particleBurst>0`; `App` wiring `reducedMotion={settings.reducedMotion}` | Unit (source gate) | P1 | `punch.atdd.test.ts` | `[P1-04] burst scaling & reducedMotion` |
| R-002 orphan | Burst `setTimeout(500)` timer stored in ref + cleared on `GameBoard` unmount — EXPECTED RED | Unit (source gate) | P1 | `punch.atdd.test.ts` | `[P1-05] R-002 early-input orphan (EXPECTED RED)` |
| AC NOOP | `result.moved===false` -> empty plan, no merge entries, no punch | Unit | P1 | `punch.atdd.test.ts` | `[P1-06] NOOP silent` |
| R-007 accumulation | Burst auto-clear filters by id + unmount guard — EXPECTED RED (second signal) | Unit (source gate) | P2 | `punch.atdd.test.ts` | `[P2-01] burst accumulation (EXPECTED RED)` |
| R-001 perf | `punchProfileFor` 130k calls <200ms host micro-bench | Unit (bench) | P2 | `punch.atdd.test.ts` | `[P2-02] perf micro-bench` |
| R-005 glow | Single `#ff8c2f` occurrance inside `hasGlow` branch | Unit (source gate) | P2 | `punch.atdd.test.ts` | `[P2-03] only-glow static gate` |
| Purity | `triade/src/engine` byte-identical — no feel import | Unit (source gate) | P2 | `punch.atdd.test.ts` | `[P2-04] engine purity` |
| Maintainability | No scattered `1.08/1.12/1.15` outside `feel.ts`; `punch.ts` delegates | Unit (source gate) | P2 | `punch.atdd.test.ts` | `[P2-05] single access point` |

**No duplicate coverage** across levels — all scenarios are Unit/Integration host. E2E/API/Component are intentionally absent (punch is not a user journey nor service contract; device Skia/Reanimated worklets are verified by manual smoke P1-06 in test-design which is not scaffolded as code). Risk: P0 blocks AC1-5 core + high risk (R-001 score 6) therefore all P0 are `P0`.

**Red Phase Requirements:** Tests are designed to **fail before implementation** (TDD red phase). `punch.atdd.test.ts` pins the working-tree delta: P0/P1-01..P1-04/P1-06/P2-02..P2-05 are **GREEN on the current delta** (they fail if `feel.ts:overshootScale`/`punch.ts`/`GameBoard isMerge`/`App wiring` is removed); `[P1-05]` and `[P2-01]` are **RED on the current delta** documenting residual risks R-002/R-007 that require a burst-timer cleanup fix. No `test.skip()` is used — this project uses `node:test` true assertions (same as `preview-invariant.test.ts` precedent), where RED is a non-zero exit, not a skipped scaffold.

---

## Red-Phase Test Scaffolds Created

> Framework note: this project uses **node:test + tsx** (not Playwright/Cypress). Scaffolds are real assertions (true RED when violated, GREEN when contract holds) rather than `test.skip()` — `npm test` exits non-zero if the contract is broken, which is the intended ATDD signal.

### Unit Tests — `triade/__tests__/feel/punch.atdd.test.ts` (NEW, 19 tests, ~380 lines)

**P0 — Spec I/O matrix (GREEN on current delta, RED if delta removed)**

- ✅ **Test:** `[P0-01] AC1 small merge 3 -> light punch 1.08/80ms/4 particles/no flash/no glow` — Status: GREEN (would be RED if `presetFor(3)` not `1.08/80ms/4/false` or `punchScaleFor(3)` not `1.08`) — Verifies: AC1 small tier + `punchProfileFor`.
- ✅ **Test:** `[P0-02] AC1 medium merge 6 -> medium punch 1.12/100ms/8/no flash` — Status: GREEN — Verifies: AC1 medium tier.
- ✅ **Test:** `[P0-03] AC1 heavy merge 12+ -> heavy punch 1.15/120ms/16/flash (sweep all heavy tiers)` — Status: GREEN — Verifies: AC1 heavy collapse for `12..12288` covers I-O heavy row.
- ✅ **Test:** `[P0-04] AC glow tier — glow only for 1536+ (only glow in system)` — Status: GREEN — Verifies: AC4 glow contract `shouldGlow(768)===false && 1536===true`.
- ✅ **Test:** `[P0-05] AC Reduced Motion gate FR-30 — all visual cut, haptics stay` — Status: GREEN — Verifies: AC5 FR-30 (visual zeroed when `reducedMotion=true`; `reducedPresetFor(12).haptic==='heavy'`).
- ✅ **Test:** `[P0-06] edge — non-finite / negative never throw, glow never on NaN` — Status: GREEN — Verifies: AC1+edge defensive (engine-never-throws extension, R-009 fallback).
- ✅ **Test:** `[P0-07] AC multiple merges per move — each scales independently` — Status: GREEN — Verifies: AC multi-merge sequential scaling (R-001/R-008).
- ✅ **Test:** `[P0-08] data-not-code — all preset values have finite overshootScale 1..1.2` — Status: GREEN — Verifies: data-not-code, single source, `FEEL_PRESETS` frozen identity.

**P1 — Integration / wiring (GREEN except R-002 RED)**

- ✅ **Test:** `[P1-01] trace->isMerge contract via REAL engine trace: type merge iff from.length===2 && !spawned` — Status: GREEN (would be RED if `transitionPlan.ts:classify` mismatched or helper threw on real trace) — Verifies: R-004 trace contract via deterministic `mulberry32` + `newGame`/`move` fixture (not hand-built stub).
- ✅ **Test:** `[P1-02] chrome guard — spawn tiles never become isMerge/punch` — Status: GREEN (scans `GameBoard.tsx` that `isMerge:true` only inside `merge` branch and `isMerge && !reducedMotion` gates `hasGlow`/`hasFlash`) — Verifies: AC3 chrome rule UX-DR-27.
- ✅ **Test:** `[P1-03] overshoot declarative — punchScaleFor/punchDurationFor match presetFor per tier` — Status: GREEN — Verifies: AC1 declarative wiring (`GameBoard` uses `punchPreset.overshootScale/Ms` from `presetFor`).
- ✅ **Test:** `[P1-04] burst scaling & reducedMotion gating` — Status: GREEN (asserts `particleCountFor` 4/8/16 vs 0 when reduced, `if (!reducedMotion)` burst guard, `App.tsx` wiring `reducedMotion={settings.reducedMotion}`) — Verifies: AC2 scaled burst + FR-30.
- 🔴 **Test:** `[P1-05] R-002 early-input orphan safeguard — burst timer cleanup on unmount (EXPECTED RED)` — Status: **RED** — Verifies: R-002 `GameBoard` stores burst `setTimeout(500)` in a ref and clears on unmount (currently bare `setTimeout` with no cleanup → `setState` on unmounted component risk). Failure is `AssertionError: GameBoard must store burst setTimeout id(s) in a ref and clear on unmount`.
- ✅ **Test:** `[P1-06] NOOP silent — moved false never produces punch` — Status: GREEN — Verifies: AC NOOP / silent no-op.
- 🔴 **Test:** `[P2-01] burst accumulation — setTimeout auto-clear filters by id, no orphan accumulation (EXPECTED RED — unmount guard missing)` — Status: **RED** — Verifies: R-007 `setBursts(prev=>prev.filter(b=>!newBursts.some(...)))` filters by id (correct) but lacks unmount guard (same root cause as P1-05). Failure is `AssertionError: burst setTimeout must be cleared on GameBoard unmount`.

**P2 — Edge / regression / perf (GREEN except R-007 RED)**

- ✅ **Test:** `[P2-02] perf micro-bench — punchProfileFor + preset sweep is host-cheap` — Status: GREEN — Verifies: 130k `punchProfileFor` calls <200ms host (R-001).
- ✅ **Test:** `[P2-03] only-glow static gate — glow exists only behind hasGlow branch` — Status: GREEN — Verifies: R-005 single `#ff8c2f` occurrence inside `hasGlow` branch.
- ✅ **Test:** `[P2-04] engine purity — triade/src/engine byte-identical (no engine edits in 8-2)` — Status: GREEN (documents CI `git diff --stat -- triade/src/engine` empty) — Verifies: ADR-01 purity.
- ✅ **Test:** `[P2-05] single access point — no scattered overshoot/particle literals outside feel.ts` — Status: GREEN (documents grep gate for `1.08/1.12/1.15`) — Verifies: maintainability.

**File:** `triade/__tests__/feel/punch.atdd.test.ts` (~380 lines, 19 `it()` cases: 17 GREEN, 2 expected RED)

### E2E Tests

**File:** N/A — no E2E scaffold for 8-2. Device punch verification is manual (test-design P1-06: real iPhone dev build, `3→subtle / 6→medium / 12+→flash+16 / 1536+→glow`, Reduced Motion ON flat, airplane mode, rapid swipe orphan). No Playwright config or `data-testid` harness required for this delta.

### API Tests

**File:** N/A — no service contract this story (no backend, no Pact).

### Component Tests

**File:** N/A as separate level — host Unit covers `feel` pure functions and `planTileTransitions` contract plus source-structure gates for `GameBoard` wiring; `App.tsx` wiring is pinned by the P1-04 host gate and by the manual device checklist (no Skia worklet render assertion needed for punch).

---

## Data Factories Created

**N/A — no `@faker-js/faker`.** Determinism is a hard requirement (ladder is fixed `3→1.08 / 6→1.12 / 12+→1.15`, not random). Inputs are built from:

- `allPresetValues()` / `FEEL_PRESETS` / `presetFor` / `punchProfileFor` (data)
- `TraceEntry` stubs with `from: [[x,y],[x,y]]` vs `[[x,y]]` vs `spawned:true` (contract)
- `mulberry32(seed)` + `newGame` + `move` for real engine trace fixtures (deterministic)
- No random data; every draw is scripted.

No factories required.

---

## Fixtures Created

**N/A.** No DB/state lifecycle; `presetFor`/`punch.ts` are pure value-in/value-out, `planTileTransitions` is pure, `GameBoard.applyPlan` is a state reducer. Each test builds its own `TraceEntry[]` or real `MoveResult.trace` locally — no module-level shared board (isolation per `test-quality.md`). `fixtures/feel-trace-fixtures.ts` from 8-1 remains available but not required for 8-2's additional wiring checks.

---

## Mock Requirements

### Reanimated / Skia Worklets (host)

**Modules:** `react-native-reanimated` (`withDelay`/`withSequence`/`withTiming`/`withSpring`/`useSharedValue`), `@shopify/react-native-skia` (`RoundedRect`/`Canvas`)

**Mock needed for:** none — 8-2 host tests assert the *data contract* (`punchScaleFor` → `presetFor.overshootScale`) and the *source wiring* (`GameBoard.tsx` contains `punchPreset.overshootScale` + `withSequence(withTiming(...), withSpring(1))` and `BurstView` inside `!reducedMotion`), not the native animation timing. P0/P1 host tests do **not** mock Reanimated; they assert the declarative mapping and that `isPunch` gates work. Device smoke validates the actual worklet timing.

### `expo-haptics` Dynamic Import Mock

Already covered in 8-1 (`haptics.atdd.test.ts`); not needed for 8-2 (punch is visual-only, no haptics import).

---

## Required data-testid Attributes

**N/A.** No new UI testids this story: punch mounts are `RoundedRect`/`Animated.View` inside `GameBoard` with no external query surface. Existing `GameBoard` and `Hud` testids unchanged. Burst dots are `position:absolute` overlays keyed by count, not by testid.

---

## Implementation Checklist

Maps the RED scaffolds to the story's spec tasks. DEV has implementation already in working tree (`ef72635`), but checklist verifies the gates and the two residual RED items.

### Test: `[P0-01]` + `[P0-02]` + `[P0-03]` (AC1 3/6/12+ tiers)

**File:** `triade/__tests__/feel/punch.atdd.test.ts` (P0) — already GREEN

**Tasks to keep these tests green:**

- [x] `triade/src/feel/feel.ts` — extend `FeelPreset` with `overshootScale: number` (`PRESET_LIGHT 1.08/80ms`, `PRESET_MEDIUM 1.12/100ms`, `PRESET_HEAVY 1.15/120ms`, `REDUCED_PRESET scale 1/0ms/0/0/false`). Verify `triade/src/feel/feel.ts:20-45`.
- [x] `triade/src/feel/punch.ts` — create `punchScaleFor`/`punchDurationFor` thin wrappers over `presetFor` (return `1/0` when `reducedMotion=true`). Verify `triade/src/feel/punch.ts:6-14`.
- [x] Run: `npm test -- triade/__tests__/feel/punch.atdd.test.ts` (or `npm test` full suite) — P0-01..03 GREEN.

**Estimated Effort:** 0.5 h (already done).

### Test: `[P0-04]` (AC4 glow) + `[P2-03]` (only-glow)

**File:** `triade/__tests__/feel/punch.atdd.test.ts`

**Tasks:**

- [x] `triade/src/feel/punch.ts` — `shouldGlow(value, reduced) => reduced ? false : value>=1536` with `!Number.isFinite` guard. Verify `triade/src/feel/punch.ts:26-30`.
- [x] `triade/src/render/GameBoard.tsx` — `hasGlow = isPunch && value>=1536` and outer `RoundedRect color="#ff8c2f" opacity 0.28` behind tile (only glow). Verify `triade/src/render/GameBoard.tsx:124,189-199`.
- [x] Run test: `npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P0-04|P2-03"`

**Estimated Effort:** 0.25 h.

### Test: `[P0-05]` (AC5 FR-30)

**File:** `triade/__tests__/feel/punch.atdd.test.ts`

**Tasks:**

- [x] `triade/src/feel/punch.ts` — all four helpers return `1/false/0/false` when `reducedMotion=true`. Verify `triade/src/feel/punch.ts:7,12,16-17,21-22,27`.
- [x] `triade/src/feel/feel.ts` — `reducedPresetFor(value)` keeps `haptic` from `presetFor(value)` while zeroing `shakeMs/particleBurst/overshootMs/overshootScale/flash` (`REDUCED_PRESET` spread). Verify `triade/src/feel/feel.ts:83-96`.
- [x] `triade/src/render/GameBoard.tsx` — `isPunch = isMerge && !reducedMotion` gates `punchPreset`, `hasFlash`, `hasGlow`. Verify `triade/src/render/GameBoard.tsx:121-124`.
- [x] `triade/App.tsx` — pass `settings.reducedMotion` into `GameBoard`; keep `GameOverOverlay reducedMotion={false}` literal (Epic 9 gate). Verify `triade/App.tsx:887,934`.
- [x] Run: `npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P0-05"`

**Estimated Effort:** 0.5 h.

### Test: `[P0-06]` (edge) + `[P0-08]` (data-not-code)

**File:** `triade/__tests__/feel/punch.atdd.test.ts`

**Tasks:**

- [x] Keep `presetFor` fallback to `PRESET_LIGHT` for `!Number.isFinite` / `<3` (never throws) — `triade/src/feel/feel.ts:67-73`.
- [x] Keep `shouldGlow` guard for non-finite — `triade/src/feel/punch.ts:28`.
- [x] Keep `FeelPreset` frozen and `allPresetValues()` sweep invariants `overshootScale<=1.2`.
- [x] Run: `npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P0-06|P0-08"`

**Estimated Effort:** 0.25 h.

### Test: `[P0-07]` + `[P1-01]` + `[P1-06]` (multi-merge / real trace / NOOP)

**File:** `triade/__tests__/feel/punch.atdd.test.ts`

**Tasks to keep these tests green:**

- [x] `triade/src/render/transitionPlan.ts` — `classify(entry)` already returns `merge` iff `from.length===2 && !spawned` (no change needed, spec-pinned).
- [x] `triade/src/render/GameBoard.tsx` — `applyPlan` marks merge-appears `isMerge:true` with `delay: SLIDE_MS` and creates `Burst` per merge at `pixel(tr.to)` center via `presetFor(tr.value).particleBurst`. Verify `triade/src/render/GameBoard.tsx:342-368` and `:356-367`.
- [x] Keep `result.moved` guard: empty plan no-ops (NOOP) — `triade/src/render/GameBoard.tsx:331,410`.
- [x] Run: `npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P0-07|P1-01|P1-06"`

**Estimated Effort:** 0.5 h.

### Test: `[P1-02]` (chrome guard) + `[P1-03]` (declarative) + `[P1-04]` (burst gating)

**File:** `triade/__tests__/feel/punch.atdd.test.ts`

**Tasks:**

- [x] `triade/src/render/GameBoard.tsx` — `isMerge` set only inside `tr.type==='merge'` branch (not `spawn`), `AnimatedTile` gates `isPunch/hasFlash/hasGlow` on `isMerge && !reducedMotion`. Verify chrome guard scans in P1-02.
- [x] Keep `AnimatedTile` declarative overshoot: `withDelay(delay, withSequence(withTiming(overshootScale, {duration: overshootMs}), withSpring(1)))` else fallback `withSpring(1)` when not punch — verify `triade/src/render/GameBoard.tsx:143-163`.
- [x] `triade/src/render/GameBoard.tsx` — burst gated `if (!reducedMotion) { preset.particleBurst>0 }` — P1-04.
- [x] Run: `npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P1-02|P1-03|P1-04"`

**Estimated Effort:** 0.75 h.

### Test: `[P1-05] R-002 early-input orphan (EXPECTED RED — requires fix)`

**File:** `triade/__tests__/feel/punch.atdd.test.ts` — currently **RED**

**Tasks to make this test pass:**

- [ ] **Fix `triade/src/render/GameBoard.tsx` burst timer leak:** store `setTimeout` id(s) for burst auto-clear in a ref (e.g. `burstTimerRef: ReturnType<typeof setTimeout>|null` or `burstTimersRef: Set<...>`) and clear in a `useEffect` cleanup on unmount, mirroring `settleTimerRef` pattern at `triade/src/render/GameBoard.tsx:321-326`. Current code is bare `setTimeout(() => setBursts(...), 500)` with no ref storage.
- [ ] Also consider tying burst lifetime to tile `id` already filtered by id (current `prev.filter(b => !newBursts.some(nb=>nb.id===b.id))` is correct for uniqueness) — unmount guard is the missing piece.
- [ ] On device, rapid-swipe combo (2–3 sequential merges within 500 ms) must show no off-grid orphans — video capture in PR.
- [ ] Run: `npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P1-05"` — must turn GREEN after fix.
- [ ] Also clears `[P2-01]` (same root cause) — verify both P1-05 and P2-01 GREEN together.

**Estimated Effort:** 0.5–1 h before 8-3 (shake adds further main-thread cost and also mutates `tilesRef` under re-plan).

### Test: `[P2-01] burst accumulation (EXPECTED RED — same fix as P1-05)`

**File:** `triade/__tests__/feel/punch.atdd.test.ts` — currently **RED**

**Tasks to make this test pass (same fix as P1-05, do not fix separately):**

- [ ] Same burst timer ref + unmount cleanup as P1-05 (one fix clears both P1-05 and P2-01).
- [ ] Verify `setBursts` not called after `GameBoard` unmount (wrap in `act` + unmount in a host test if harness supports `jest.useFakeTimers` equivalent; otherwise the source-structure gate in this ATDD is the gate).
- [ ] Run: `npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P2-01"`

**Estimated Effort:** included in P1-05 (no extra time).

### Test: P2-02/P2-04/P2-05 static + bench gates + full suite

**File:** `triade/` full suite

**Tasks:**

- [x] `npm test` inside `triade/` — observed `745 pass / 4 fail` where 4 are expected RED (2 from 8-1 `haptics.atdd.test.ts` R-001/R-006 + 2 from this file R-002/R-007). Excluding expected RED, `745` GREEN.
- [x] `npx tsc --noEmit` clean — punch helpers are strictly typed, no `@ts-ignore` beyond 8-1 haptics seam.
- [x] `git diff --stat -- triade/src/engine` **must be empty** — engine byte-identical (verified `ef72635` stat; `git diff --stat -- triade/src/engine` empty).
- [x] Guard suites stay green without modification: `triade/__tests__/feel/punch.test.ts` (8 cases), `triade/__tests__/feel/feel.test.ts` (12 cases).

**Estimated Effort:** 0.5 h.

---

## Running Tests

```bash
# Run this ATDD suite (this story) — shows 17 GREEN + 2 expected RED (R-002,R-007)
cd triade && npm test -- __tests__/feel/punch.atdd.test.ts

# Run only the passing P0 pins (quick smoke, <1s)
cd triade && npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P0-"

# Run a single ATDD case by name
cd triade && npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P1-05"
cd triade && npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P2-01"

# Run the existing punch P0 suite (8 tests, always green)
cd triade && npm test -- __tests__/feel/punch.test.ts

# Run the whole suite (full gates) — 745 pass / 4 expected RED
cd triade && npm test

# Type-check (CI gate)
npx tsc --noEmit
# Engine purity gate (must be empty)
git diff --stat -- triade/src/engine
# Only-glow + single-access static gates (embedded in ATDD P2-03/P2-05)
grep -R "1\.08" triade/src --include="*.ts" --include="*.tsx" | grep -v "feel.ts"
```

> No headed/debug browser mode — this is `node:test` pure-module suite. The only browser E2E is `triade/__tests__/e2e/session.e2e.test.ts`, unrelated to 8-2.

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ Red-phase scaffolds written for all 5 ACs + high risks R-002/R-007 (19 tests in `punch.atdd.test.ts`; P0 8 groups green, P1 6 groups with 1 expected RED, P2 5 checks with 1 expected RED — true RED, not `test.skip()`).
- ✅ Scaffolds are real failing-if-violated assertions (17 GREEN on current delta, 2 RED documenting residual risks) — appropriate for this `node:test` pure-function story (same as 7.4 invariant precedent).
- ✅ No factories/fixtures/mocks/data-testids required (pure function + source-structure gates, no UI change beyond `GameBoard` burst overlay); mock requirements documented (Reanimated/Skia worklets trust-but-verify via device).
- ✅ Implementation checklist created and mapped to spec tasks T1–T5.

**Verification:**

- `punch.atdd.test.ts` currently reports **19 tests: 17 pass, 2 fail** (exit non-zero for the 2 RED) — would be 19 GREEN if burst timer cleanup is fixed. Run without the 2 RED patterns: `npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P0-|P1-0[12346]|P2-0[2345]"` is exit 0.
- `punch.test.ts` still 8 pass (728 total baseline at `ef72635` already includes those 8; 745 with this ATDD file — 17 GREEN from ATDD contribute).
- Activation guidance: fix `[P1-05]`/`[P2-01]` by storing burst `setTimeout` id(s) in a ref and clearing on unmount (see Implementation Checklist P1-05) — then confirm RED turns GREEN before marking story fully verified. Carry-over expected RED from 8-1 (`[P1-03]` tutorial dedup, `[P2-06]` expo-haptics) remain deferred per `spec-8-2-punch-visual.md` Review Triage.

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. Verify **P0** (`P0-01..P0-08`) is green — it already is on `ef72635`. If any case is RED, do not edit tests; fix `feel.ts`/`punch.ts` as a separate `patch` commit.
2. Verify **P1-01..P1-04/P1-06 and P2-02..P2-05** is green — they already are.
3. Fix **P1-05 (R-002) / P2-01 (R-007)** with FE lead (store burst timer ref + unmount cleanup) and make those two RED tests turn GREEN via the fix (one code change clears both).
4. Run **full gates** (`npm test` — expect `747 pass / 2 fail` after fix where remaining 2 are 8-1 carry-overs, or `749 pass / 0 fail` if 8-1 also fixed — then `npx tsc --noEmit`, `git diff --stat -- triade/src/engine` empty).
5. Check off tasks in the implementation checklist.

**Key Principles:**

- Do not gate `triggerHapticsForTrace` on `reducedMotion` (FR-30 — enforced by 8-1 `[P0-04]` and here by `[P0-05]` `reducedPresetFor` sweep); punch helpers (`punchScaleFor` etc.) *are* gated on `reducedMotion` — keep the two layers distinct.
- `presetFor` is data not code — `FEEL_PRESETS` is the single access point (enforced by `[P0-08]` + `[P2-05]`).
- `isMerge` derives only from `planTileTransitions` `type==='merge'` (enforced by `[P1-01]` real engine fixture), never duplicate `from.length===2` outside engine/feel gateway.
- Keep burst timer cleanup symmetrical with `settleTimerRef` (see `GameBoard.tsx:321-326`).

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Verify full `npm test` green (all 19 ATDD tests GREEN after R-002/R-007 fixed, plus existing 8 punch tests + 12 feel tests).
2. Confirm `git diff --stat -- triade/src/engine` empty and `feel.ts`/`punch.ts`/`GameBoard.tsx`/`App.tsx` are the only punchy changes.
3. Confirm guard suites untouched and green (`punch.test.ts`, `feel.test.ts`, engine purity).
4. Update `_bmad-output/implementation-artifacts/deferred-work.md` only with NEW gaps; do not close prior entries unless empirically verified.
5. No scattered ladder literals — sequence still derived from `allPresetValues()` / `FEEL_PRESETS`.
6. Consider extracting burst timer ref to a helper if 8-3 shake adds its own timers (avoid proliferating bare `setTimeout`).

---

## Next Steps

1. Hand this checklist + `punch.atdd.test.ts` to `dev-story` for 8-2 (story is `done` in `sprint-status.yaml` but verification is gated on the two RED burst-cleanup items).
2. DEV fixes **R-002/R-007** (burst timer ref + unmount cleanup) — make the two RED tests GREEN (single fix).
3. PR author runs the one-time **15-min device smoke** (P1-06 in test-design): real iPhone dev build, `3→Light subtle / 6→Medium / 12+→Heavy flash+16 / 1536+→glow (only glow)` in portrait+landscape; toggle Reduced Motion ON → all flat while haptics still felt; rapid swipes during burst window → no orphan bursts; airplane mode still works — check box in PR description.
4. When all gates pass (this ATDD 19 GREEN + 8-1 carry-over decision on R-001/R-006), mark story 8-2 verified in `test-design-epic-8-2-punch-visual.md` Exit Criteria.

---

## Knowledge Base References Applied

- **test-quality.md** — one assertion per test (sweep is one logical assertion: mapping + identity + never-throw), determinism, isolation (every pin builds its own `TraceEntry[]`/`rng`, no shared mutable state).
- **data-factories.md** — adapted: no faker (determinism mandatory); inputs built from `allPresetValues()` + `presetFor`/`punchProfileFor` helpers mirroring engine data.
- **test-levels-framework.md / test-priorities-matrix.md** — Unit is the correct level for pure projections + observer contract + source gates; all P0 are `P0` due to AC1-5 criticality.
- **risk-governance.md / probability-impact.md** — R-002/R-007 score 6/4 — surfaced as ATDD RED pins (same as 8-1 R-001/R-006 pattern).
- **nfr-criteria.md** — 60 FPS/never-throw/FR-30/chrome-rule gaps become P0/P2 tests.
- Project testing standards (from `spec-8-2-punch-visual.md` Dev Notes): `node:test` + `node:assert`; pure-module tests under `__tests__/feel/`; test names `[P0-..]` / `[P1-..]`; ESM imports with explicit `.ts` extensions; `strict:true`; no `Math.random`.

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification (actually 17 GREEN + 2 expected RED)

**Command (ATDD suite):**
```bash
cd triade && npm test -- __tests__/feel/punch.atdd.test.ts
```

**Results (current working-tree `ef72635` + this ATDD file):**
```
▶ ATDD 8-2 — P0 critical (spec I/O matrix)
  ✔ [P0-01] AC1 small merge 3 -> light punch 1.08/80ms/4 particles/no flash/no glow
  ✔ [P0-02] AC1 medium merge 6 -> medium punch 1.12/100ms/8/no flash
  ✔ [P0-03] AC1 heavy merge 12+ -> heavy punch 1.15/120ms/16/flash (sweep all heavy tiers)
  ✔ [P0-04] AC glow tier — glow only for 1536+ (only glow in system)
  ✔ [P0-05] AC Reduced Motion gate FR-30 — all visual cut, haptics stay
  ✔ [P0-06] edge — non-finite / negative never throw, glow never on NaN
  ✔ [P0-07] AC multiple merges per move — each scales independently
  ✔ [P0-08] data-not-code — all preset values have finite overshootScale 1..1.2
✔ ATDD 8-2 — P0 critical (spec I/O matrix)
▶ ATDD 8-2 — P1 high (integration / wiring)
  ✔ [P1-01] trace->isMerge contract via REAL engine trace: type merge iff from.length===2 && !spawned
  ✔ [P1-02] chrome guard — spawn tiles never become isMerge/punch
  ✔ [P1-03] overshoot declarative — punchScaleFor/punchDurationFor match presetFor per tier
  ✔ [P1-04] burst scaling & reducedMotion gating
  ✖ [P1-05] R-002 early-input orphan safeguard — burst timer cleanup on unmount (EXPECTED RED)
  ✔ [P1-06] NOOP silent — moved false never produces punch
✖ ATDD 8-2 — P1 high (integration / wiring)
▶ ATDD 8-2 — P2 medium (edge / regression / perf)
  ✖ [P2-01] burst accumulation — setTimeout auto-clear filters by id, no orphan accumulation (EXPECTED RED — unmount guard missing)
  ✔ [P2-02] perf micro-bench — punchProfileFor + preset sweep is host-cheap
  ✔ [P2-03] only-glow static gate — glow exists only behind hasGlow branch
  ✔ [P2-04] engine purity — triade/src/engine byte-identical (no engine edits in 8-2)
  ✔ [P2-05] single access point — no scattered overshoot/particle literals outside feel.ts
✖ ATDD 8-2 — P2 medium (edge / regression / perf)
ℹ tests 19
ℹ suites 3
ℹ pass 17
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms ~165ms
✖ failing tests:

test at __tests__/feel/punch.atdd.test.ts:1:9874
✖ [P1-05] R-002 early-input orphan safeguard — burst timer cleanup on unmount (EXPECTED RED)
  AssertionError [ERR_ASSERTION]: GameBoard must store burst setTimeout id(s) in a ref and clear on unmount

test at __tests__/feel/punch.atdd.test.ts:1:11158
✖ [P2-01] burst accumulation — setTimeout auto-clear filters by id, no orphan accumulation (EXPECTED RED — unmount guard missing)
  AssertionError [ERR_ASSERTION]: burst setTimeout must be cleared on GameBoard unmount
```

**Command (full suite with ATDD file):**
```bash
cd triade && npm test
# Result: 745 pass / 4 fail where 4 are expected RED (2 from 8-1 R-001/R-006 + 2 from 8-2 R-002/R-007); 749 total.
# Excluding expected RED: 745 GREEN.

cd triade && npm test -- __tests__/feel/punch.test.ts
# Result: 8 pass (existing punch.test.ts) — unchanged, always green.

cd triade && npm test -- __tests__/feel/punch.atdd.test.ts --test-name-pattern "P0-|P1-0[12346]|P2-0[2345]"
# Result: 17 pass / 0 fail (the 2 RED patterns excluded) — confirms P0/P1 host contract is GREEN.
```

**Summary:**

- Total ATDD 8-2 tests: 19
- Passing (GREEN on current delta): 17 (all P0 + P1-01/02/03/04/06 + P2-02/03/04/05)
- Failing (RED on current delta, expected): 2 (`[P1-05]` R-002 burst timer ref, `[P2-01]` R-007 unmount guard — same root cause) — document residual risks in spec.
- Status: ✅ Red-phase scaffolds verified (fail-if-violated, currently 17 GREEN / 2 expected RED — correct for working-tree delta `ef72635`).
- Full suite: 745 GREEN + 4 RED (2 carry-over from 8-1 + 2 new) = 749 total.

---

## Notes

- **No `test.skip()` used by design:** this is a `node:test` pure-function suite; the intended ATDD signal is a non-zero exit when the contract is violated (true RED) that stays green while the contract holds — matches 7.4 precedent and the story's "implementation already in working tree" posture.
- **Engine untouched:** `git diff --stat -- triade/src/engine` must stay empty; `triade/src/feel/feel.ts` + `triade/src/feel/punch.ts` + `triade/src/render/GameBoard.tsx` + `triade/App.tsx` wiring are the only production changes (`ef72635`). Availability is read via `result.trace` (typed `TraceEntry`), not reimplemented.
- **Expo v57 rule:** `triade/AGENTS.md` requires reading https://docs.expo.dev/versions/v57.0.0/ before writing RN code — surfaces here are plain `node:test` TS, no new RN APIs.
- **Why this checklist is ATDD not test-design:** test-design (`test-design-epic-8-2-punch-visual.md`) prioritized risks and coverage at epic level; this ATDD checklist generates the red-phase host scaffolds + implementation checklist for `dev-story` to drive the story from RED to GREEN. The two expected RED tests encode the `spec-8-2-punch-visual.md` Residual risks R-002/R-007 so they cannot be silently ignored in 8-3.
- **Device lane not scaffolded as code:** P1-06 device smoke (real iPhone Skia+Reanimated) remains manual — see `test-design-epic-8-2-punch-visual.md` Execution Order > Device gate. This ATDD checklist covers the host automatable surface.
- **Burst cleanup fix is one change:** storing `setTimeout` id in a ref and clearing on unmount clears both `[P1-05]` and `[P2-01]` (same `setTimeout(500)` leak). Do not fix them separately.

---

**Generated by BMad TEA Agent** - 2026-09-01
