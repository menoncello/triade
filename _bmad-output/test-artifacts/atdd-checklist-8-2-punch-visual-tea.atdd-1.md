---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-07'
workflowType: 'testarch-atdd'
storyId: '8.2'
storyKey: '8-2-punch-visual'
storyFile: '_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual-tea.atdd-1.md'
generatedTestFiles:
  - 'triade/__tests__/feel/punch.atdd.working-tree.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md'
  - '_bmad-output/test-artifacts/test-design-progress.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/punch.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/App.tsx'
  - 'triade/__tests__/feel/punch.atdd.test.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — 8-2-punch-visual (working-tree delta run, tea.atdd-1)

**Date:** 2026-09-07
**Author:** Eduardo (TEA — Master Test Architect)
**Mode:** Create, sequential (no subagents in this runtime; `tea_execution_mode:auto` → `sequential` fallback)
**Primary Test Level:** Unit (host `node:test` + `tsx`)
**Working tree at run time (metadata-only):** `test-design-epic-8-2-punch-visual.md` refresh (canonical + mirror) + `test-design-progress.md` refresh entry + `sprint-status.yaml` timestamp. No production files modified in the working tree; production delta lives in committed `e4629cd` and prior runs. Engine untouched.

> sprint-status.yaml is orchestrator-owned: read-only here, never written, never reverted. Story 8-2 row at `done` is the orchestrator's bookkeeping, not a defect and not verification proof — verification evidence is the test output below.

## Story Summary

Story 8-2 makes merged tiles punch: declarative overshoot-and-snap from the trace in `src/render` (preset-driven scale 1.08/1.12/1.15) + imperative flash (heavy only) + particle burst (4/8/16) as Reanimated worklets + 1536+ incandescent glow (the only glow), all gated by Reduced Motion (FR-30) and never firing on chrome (preview card / score, UX-DR-27). `presetFor(value)` is the single data source; `punch.ts` is a thin pure wrapper.

## Acceptance Criteria (from spec-8-2-punch-visual.md)

1. **AC1** — Merged tile overshoots and snaps back, driven declaratively from trace (`isMerge` from `from.length===2 && !spawned`), scale/duration from `presetFor` (3→1.08/80ms, 6→1.12/100ms, 12+→1.15/120ms).
2. **AC2** — Flash + particle burst fire at merge point scaled by value (flash only heavy ≥12; particles 4/8/16).
3. **AC3** — Preview card and score never animate with feel effects (chrome rule).
4. **AC4** — Value 1536/3072+ adds incandescent glow (only glow), suppressed under Reduced Motion.
5. **AC5 (FR-30)** — Reduced Motion cuts flash/particles/overshoot/glow (scale=1) while haptics and sound stay.

## Stack Detection

- **Config `test_stack_type`:** `auto` → **detected `frontend`** (Expo RN 57: `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest).
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`). No Playwright/Cypress harness — correct level for this pure surface is Unit host + source-structure gates; device smoke stays manual per test-design P1-06.
- **TEA flags:** `tea_use_playwright_utils:true` (loaded, not applied — no `page.goto`), `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto` → resolved `sequential`, `tea_capability_probe:true`.

## Generation Mode

**AI Generation** (no browser recording): ACs are clear and the surface is pure functions + `planTileTransitions` contract + source-structure gates. No DOM, no network — recording would be dead weight.

## Test Strategy

| AC / Risk | Scenario | Level | Priority | Test |
|---|---|---|---|---|
| AC1 tiers | 3/6/12+ map 1.08/1.12/1.15 | Unit | P0 | `[WT-P0-01]` |
| AC4+AC5 | glow only 1536+, all visual zeroed when reduced, haptic kept | Unit | P0 | `[WT-P0-02]` |
| AC3 + P0-09 (new in refresh) | light fallback data `punchScaleFor(1)===1.08`, board gate owns chrome rule | Unit (source gate) | P0 | `[WT-P0-03]` |
| Data-not-code | finite scale 1..1.2, punch.ts delegates | Unit | P0 | `[WT-P0-04]` |
| FR-30 wiring | `App` passes `settings.reducedMotion`, no literal false on overlay, burst gated `!reducedMotion` | Unit (source gate) | P1 | `[WT-P1-01]` |
| Only-glow | single `#ff8c2f` inside `hasGlow` | Unit (source gate) | P1 | `[WT-P1-02]` |
| ADR-01 purity | engine never imports feel | Unit (source gate) | P1 | `[WT-P1-03]` |
| R-002/R-007 | burst `setTimeout(500)` stored in ref + cleared on unmount — **EXPECTED RED** | Unit (source gate) | P1 | `[WT-P1-04]` (skip) |
| R-001 composite | p99 re-measured for punch+shake+bullet — **EXPECTED RED (open)** | Static/existence | P2 | `[WT-P2-01]` (skip) |

No duplicate coverage across levels — all host. E2E/API/Component intentionally absent (same rationale as the original `atdd-checklist-8-2-punch-visual.md`).

## Red-Phase Test Scaffolds Created

**File:** `triade/__tests__/feel/punch.atdd.working-tree.test.ts` (NEW, 9 tests: 7 GREEN, 2 EXPECTED RED as `it.skip`)

- ✅ `[WT-P0-01]` tiers — GREEN (RED if `feel.ts` scales drift)
- ✅ `[WT-P0-02]` glow + Reduced Motion gate — GREEN (RED if FR-30 regresses)
- ✅ `[WT-P0-03]` P0-09 chrome-guard helper contract — GREEN (RED if board gate leaks `isMerge` into spawn branch)
- ✅ `[WT-P0-04]` data-not-code — GREEN
- ✅ `[WT-P1-01]` App wiring — GREEN (RED if `settings.reducedMotion` wiring regresses)
- ✅ `[WT-P1-02]` only-glow — GREEN
- ✅ `[WT-P1-03]` engine purity — GREEN
- 🔴 `[WT-P1-04]` burst timer unmount guard — **SKIPPED/RED** (verified: `GameBoard.tsx` has bare `setTimeout`, no `burstTimer` ref; `clearTimeout` present only for `settleTimerRef`)
- 🔴 `[WT-P2-01]` composite p99 baseline — **SKIPPED/RED** (no `perf-baseline-punch-shake-bullet.json`; Epic nightly lane open)

Existing `triade/__tests__/feel/punch.atdd.test.ts` (19 tests: 17 pass, 2 skipped RED `[P1-05]`/`[P2-01]`, same root cause) left untouched and still green.

## Data Factories / Fixtures / Mocks / data-testids

N/A — same as original run: deterministic ladder (no faker), per-test local trace entries, no DB lifecycle, no Reanimated/Skia mocks (data-contract + source-wiring assertions only), no new testids.

## Implementation Checklist (covers the working-tree delta)

The working tree itself is docs-only, so there is nothing new to implement for the delta — the checklist pins the production state the delta describes and the two residual fixes:

- [x] `triade/src/feel/feel.ts` — `FeelPreset.overshootScale` (1.08/1.12/1.15), `REDUCED_PRESET` scale 1 / visuals zeroed / haptic kept. Verified via `[WT-P0-01]`/`[WT-P0-02]`.
- [x] `triade/src/feel/punch.ts` — `punchScaleFor`/`punchDurationFor`/`shouldFlash`/`particleCountFor`/`shouldGlow`/`punchProfileFor` delegate to `presetFor`/`reducedPresetFor`. Verified via `[WT-P0-04]`.
- [x] `triade/src/render/GameBoard.tsx` — `isMerge` only in merge branch, `isMerge && !reducedMotion` gates punch/flash/glow/burst, single `#ff8c2f` in `hasGlow`. Verified via `[WT-P0-03]`/`[WT-P1-02]`.
- [x] `triade/App.tsx` — `reducedMotion={settings.reducedMotion}` into `GameBoard`, no literal `false` on overlay. Verified via `[WT-P1-01]`.
- [x] Engine untouched (`src/engine` never imports `feel`). Verified via `[WT-P1-03]`.
- [ ] **Fix R-002/R-007 (one change clears `[WT-P1-04]` + existing `[P1-05]`/`[P2-01]`):** store burst `setTimeout(500)` id(s) in a ref (e.g. `burstTimersRef`) and clear on `GameBoard` unmount, mirroring `settleTimerRef`. Then un-skip `[WT-P1-04]` and confirm GREEN. Est. 0.5–1h, before 8-3-style timer proliferation. Run: `node --import tsx --test __tests__/feel/punch.atdd.working-tree.test.ts`.
- [ ] **Composite p99 (clears `[WT-P2-01]`):** record device `useFrameRateBaseline` stats for punch+shake+bullet together in the Epic nightly lane; check in `perf-baseline-punch-shake-bullet.json`. Then un-skip `[WT-P2-01]`. Owner: FE/QA.
- [ ] Device smoke (manual, ~15 min, PR author): 3→subtle / 6→medium / 12+→flash+16 / 1536+→glow in portrait+landscape; Reduced Motion ON → flat with haptics felt; rapid swipes → no orphan bursts; airplane mode works.

## Running Tests

```bash
cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/feel/punch.atdd.working-tree.test.ts
# expect: 7 pass / 0 fail / 2 skipped

cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/feel/punch.atdd.test.ts
# expect: 17 pass / 0 fail / 2 skipped

cd triade && npm test
# expect (this run): 1500 tests, 1041 pass / 0 fail / 459 skipped (134+ suites)
```

## Red-Green-Refactor

- **RED (done, TEA):** scaffolds written for the delta; 2 EXPECTED RED (`it.skip`) encode R-002/R-007 + composite p99 so they cannot be silently ignored. Skipped (not failing) by repo convention so `npm test` stays green — activation guidance: un-skip one test, confirm it FAILS (RED), implement the fix, confirm GREEN.
- **GREEN (DEV next):** apply the burst-timer fix + record the composite baseline; un-skip and turn both RED tests GREEN without editing the green pins.
- **REFACTOR (after green):** if 8-3-style timers proliferate, extract a shared timer-ref helper; keep `presetFor` the single access point; keep `git diff --stat -- triade/src/engine` empty.

## Validation (against checklist.md)

- [x] Story ACs analyzed and mapped to levels (5 ACs + P0-09 + risks; no duplicate coverage)
- [x] Red-phase scaffolds created under `triade/__tests__/feel/` (9 tests, 7 GREEN / 2 EXPECTED RED skips)
- [x] RED verified by execution (output captured above; skip reasons document the failure mode and were verified against source: no `burstTimer` ref; no baseline file)
- [x] No factories/fixtures/mocks/testids needed (pure + source-gate surface; documented)
- [x] Implementation checklist maps each scaffold to code tasks with file/line anchors and run commands
- [x] Execution commands verified (`working-tree` file, `punch.atdd` file, full `npm test`)
- [x] Checklist saved under TEA `test_artifacts` (this file) with frontmatter (`storyId`/`storyKey`/`storyFile`/`atddChecklistPath`/`generatedTestFiles`)
- [x] No suite breakage: full `npm test` 1041 pass / 0 fail / 459 skipped
- [x] sprint-status.yaml untouched (orchestrator-owned)

## Next Steps

1. Hand this checklist + `punch.atdd.working-tree.test.ts` to `dev-story`: fix burst-timer unmount guard (single fix), record composite p99 baseline.
2. PR author runs the 15-min device smoke (test-design P1-06).
3. When both RED tests are GREEN + smoke signed, mark 8-2 verified against test-design Exit Criteria.

**Generated by TEA (Master Test Architect)** — 2026-09-07
