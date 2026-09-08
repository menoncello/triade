---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-07'
workflowType: 'testarch-atdd'
storyId: 'dw-frame-rate-baseline-measure'
storyKey: 'dw-frame-rate-baseline-measure'
storyFile: '_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-frame-rate-baseline-measure.md'
generatedTestFiles:
  - 'triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md'
  - '_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md'
  - '_bmad-output/test-artifacts/test-design-dw-frame-rate-baseline-measure.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-frame-rate-baseline-measure.md'
  - 'triade/src/render/useFrameRateBaseline.ts'
  - 'triade/__tests__/render/useFrameRateBaseline.math.test.ts'
  - 'triade/App.tsx'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-frame-rate-baseline-measure — probe-wiring diagnosis + 120-frame window hardening (DW-16 / DW-32)

**Date:** 2026-09-07
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`) + static source-shape scans + evidence greps — RN probe subsystem exercised via host `node:test`; no Playwright/Cypress E2E harness required. Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 + Skia/Reanimated/RNGH) but scenario is framework-free probe math + callback-identity + file-flag invariants exercised via `node:test`.
**Generation Mode:** AI generation (sequential — single orchestrator session; no browser recording: RN simulator not drivable from this host, ACs are static/host-verifiable).

---

## Story Summary

DW bundle `dw-frame-rate-baseline-measure` (commit `12e432d` vs baseline `6b16593`) diagnoses why the shared DW-16/DW-32 `fps · p99Ms · frames` readout never published across two blocked runs (2026-09-06 laneSelect host-tap block; 2026-09-07 board reached via `__DEV__` auto-drive yet `stats` stayed null across ~4 min of play), applies the minimal hardening the spec allows, locks it with unit checks, and extends the shared evidence file with a one-screenshot re-measurement protocol.

**As a** developer needing an on-device frame-rate baseline for the T5.2 budget (p99 < 16.7ms, fps ≥ 59 on 60Hz)
**I want** the 120-frame probe to survive auto-drive re-renders (stable callback identity) and to retry instead of deadlocking on a degenerate empty window
**So that** the `baseline: <fps> fps · p99 <p99>ms · <n> frames` readout publishes within ~2s of the board-window start — while `WINDOW = 120` and the fps/p99 formulas stay byte-identical, release stays untouched, and no frame numbers are invented.

---

## Acceptance Criteria

1. **AC1 pure math** — Given 119 deltas of 16.667ms, when `computeFrameRateStats` runs, then fps ≈ 60, p99Ms ≈ 16.67, and frames = 119.
2. **AC2 empty window** — Given an empty sample array, when `computeFrameRateStats` runs, then it returns null and the hook resets the window (durations/last/count) instead of publishing.
3. **AC3 rerender churn** — Given auto-drive re-renders during the window, when the frame callback identity is compared across renders, then it stays stable (memoized) so the time base never resets mid-window.
4. **AC4 evidence** — Given the run finishes, when the agent exits, then `dw-16-frame-rate-baseline-evidence.md` holds the new diagnosis section with the shared-with-DW-32 flag and no invented numbers.

---

## Story Integration Metadata

- **Story ID:** `dw-frame-rate-baseline-measure` (bundle; spec `baseline_revision: 6b16593`, `final_revision: ba186ce`)
- **Story Key:** `dw-frame-rate-baseline-measure`
- **Story File:** `_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-frame-rate-baseline-measure.md`
- **Generated Test Files:**
  - `triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts` (NEW — 12 RED-phase `it.skip` scaffolds in 3 suites: 6 P0 + 4 P1 + 2 P2)
  - Existing reference suite (already green): `triade/__tests__/render/useFrameRateBaseline.math.test.ts` (7 pass)
- **Working-tree delta covered (commit `12e432d` vs `6b16593`, plus worktree-vs-HEAD metadata):**
  - `triade/src/render/useFrameRateBaseline.ts` (+41/−14) — extracted pure exported `computeFrameRateStats(samples)` with byte-identical formulas (sorted / `floor(n*0.99)` / p99 / avgMs clamped at 0.001, null on empty); memoized the frame callback (`const onFrame = useCallback(..., [])`, `useFrameCallback(onFrame)`); empty-window completion now resets `durations/last/count` and retries instead of latching `done` with null stats. `WINDOW = 120`, hook signature, and the DW-32 generation-reset effect unchanged.
  - `triade/__tests__/render/useFrameRateBaseline.math.test.ts` (NEW at commit time, 7 checks) — source-shape guards (WINDOW 120, memoized callback, null-check + reset) + math checks via local re-implementation (steady 119×16.667ms, 100-sample spike, 119-shape lone-spike skip, empty→null). No RN imports (repo ATDD style).
  - `triade/App.tsx` — untouched (`git diff 6b16593 HEAD -- triade/App.tsx` empty; 2 `useFrameRateBaseline` references intact).
  - `_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md` (NEW) + `dw-16-frame-rate-baseline-evidence.md` (+73: diagnosis F1/F2, fix, verification, one-screenshot protocol, shared-with-DW-32 flag, no invented numbers).
  - Worktree-vs-HEAD is metadata-only: `_bmad-output/implementation-artifacts/deferred-work.md` DW-16/DW-32 `open→done 2026-09-06` + `resolution: resolved by sweep bundle dw-frame-rate-baseline-measure` + two `resolution-undo` entries. Read as context only — **never written nor reverted by this workflow** (orchestrator-owned).
  - `sprint-status.yaml` — NOT in scope, NOT written, NOT reverted (orchestrator-owned per prompt).

---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/Skia/Reanimated/RNGH; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`). No `playwright.config.*`/`cypress.config.*` in repo — preflight adapted per precedent (render-gate checklist): correct levels are **Unit host + static scans + evidence greps**, not browser E2E (RN Skia Canvas + RNGH project, no web flow, no HTTP API).
- **No Playwright/Cypress harness needed:** scenario is probe math + `useCallback` identity + completion-reset path + file flags; E2E/API scaffolds intentionally absent. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto`/`page.locator` anywhere — RN project).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto` → resolved `sequential`, `tea_capability_probe:true`

---

## Test Strategy (AC → level → priority)

| AC | Scenario | Level | Priority | Scaffold |
|----|----------|-------|----------|----------|
| AC1 | Steady 119×16.667ms → fps≈60/p99≈16.67/frames 119 | Unit (host) | P0 | P0-01 |
| AC2 | Empty→null + reset durations/last/count, retry (no latch) | Unit (host + source guard) | P0 | P0-02 |
| AC3 | Callback memoized (`onFrame` stable, `useFrameCallback(onFrame)`) | Unit (source guard) | P0 | P0-03 |
| — | WINDOW frozen at 120 (Never-constraint pin) | Unit (source guard) | P0 | P0-04 |
| — | 119-shape lone-spike skip documents p99 leniency (deferred to DW-32) | Unit (host) | P0 | P0-05 |
| — | 100-sample spike selects max (formula path truthfully exercised) | Unit (host) | P0 | P0-06 |
| — | `App.tsx` untouched boundary (≥2 hook refs, no math there) | Unit (grep) | P1 | P1-01 |
| — | Zero logging in frame-math path (release hard rule) | Unit (grep) | P1 | P1-02 |
| — | Generation-reset effect unchanged (DW-32 AC-5) | Unit (source guard) | P1 | P1-03 |
| — | One-screenshot re-measurement publishes `baseline:` (MANUAL) | Manual (simulator) | P1 | P1-04 |
| AC4 | Evidence keeps shared-with-DW-32 + verdict-open wording | Unit (grep) | P2 | P2-01 |
| AC4 | Diagnosis section present (F1/F2 + fix + protocol) | Unit (grep) | P2 | P2-02 |

Duplicate coverage avoided: math asserted once at unit (local formula); wiring once via source guards; publish-behavior once at manual (RN runtime boundary — hook cannot be imported under tsx).

---

## Red-Phase Test Scaffolds Created

**File:** `triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts` (~230 lines, 3 suites, 12 inner `it.skip`)

All 12 inner are `it.skip` — RED-phase dormant. When activated (`it.skip` → `it`) they assert the **expected** post-bundle behaviour; before `12e432d` the wiring scaffolds **FAIL** (no `useCallback`, no exported `computeFrameRateStats`, `done` latched before the empty check — proven against `6b16593` source). With the working-tree delta they **PASS**. Math/freeze pins pass on both revisions by design (formulas frozen by Never constraint — they lock the invariant, not the fix).

### P0 Critical (6 tests)

- **[P0-01] AC1 steady window** — RED (skip). Fails if fps/p99/frames math drifts. Verifies normative formula on the shipped 119-sample shape.
- **[P0-02] AC2 empty-window retry** — RED (skip). **Fails pre-fix** (no export, no `=== null` check, no reset — old code latched `done=true` then returned on empty). Verifies export + null-check + `durations/last/count` reset.
- **[P0-03] AC3 memoization** — RED (skip). **Fails pre-fix** (inline arrow to `useFrameCallback`, no `useCallback`). Verifies `const onFrame = useCallback(` + `useFrameCallback(onFrame)`.
- **[P0-04] WINDOW=120 freeze** — RED (skip). Passes both revisions (pin, not fix-lock). Verifies Never constraint.
- **[P0-05] 119-shape leniency doc** — RED (skip). Passes both (locks the deferred off-by-one truthfully for DW-32).
- **[P0-06] 100-sample spike path** — RED (skip). Passes both (exercises spike-selection under the normative formula).

### P1 Boundaries (4 tests)

- **[P1-01] App.tsx untouched** — RED (skip). Verifies ≥2 hook refs, no math in App.
- **[P1-02] No logging** — RED (skip). Verifies release hard rule (`console.` absent in hook).
- **[P1-03] Generation reset intact** — RED (skip). Verifies DW-32 AC-5 effect (`seenGeneration`, `done=false`, `setStats(null)`).
- **[P1-04] MANUAL one-screenshot re-measurement** — RED (skip). Human: dev build + auto-drive, ~10s board play → `baseline:` line; `recording…` past 30s → device-log investigation, not a blind rerun. Host half asserts the protocol section exists in evidence.

### P2 Evidence hygiene (2 tests)

- **[P2-01] Shared + verdict-open flags** — RED (skip). Verifies `shared with DW-32` + `STILL/NO VERDICT` wording.
- **[P2-02] AC4 diagnosis section** — RED (skip). Verifies F1/F2 + `useCallback` fix recorded.

### Data factories / fixtures / mocks / data-testids

- **N/A by design** — no test data, no fixtures, no external-service mocks, no UI selectors: scenario is pure math + source-shape + file flags + one manual screenshot. No faker factories created (nothing to randomize); no `test.extend()` fixtures (no setup/teardown state); no mock endpoints; no `data-testid` requirements for the DEV team.

---

## Implementation Checklist (covers the working-tree delta)

RED phase (TEA) is complete — scaffolds above are dormant. GREEN phase maps each scaffold to the concrete change already in the tree (verify, don't re-implement) plus the one open manual step:

- [x] **Hook math extraction** (covers P0-01/P0-02/P0-06) — `triade/src/render/useFrameRateBaseline.ts:13-24`: pure exported `computeFrameRateStats` with identical sorted/idx/p99/avgMs math + null-on-empty. Verify: `grep 'export function computeFrameRateStats' triade/src/render/useFrameRateBaseline.ts`.
- [x] **Callback memoization** (covers P0-03) — `useFrameRateBaseline.ts:48,71`: `const onFrame = useCallback(..., [])` + `useFrameCallback(onFrame)`. Verify: `grep 'const onFrame = useCallback(' triade/src/render/useFrameRateBaseline.ts`.
- [x] **Empty-window retry** (covers P0-02) — `useFrameRateBaseline.ts:57-65`: `computeFrameRateStats(samples)` + `=== null` → reset `durations/last/count`, return without latching `done`. Verify: `grep 'count.current = 0' triade/src/render/useFrameRateBaseline.ts`.
- [x] **WINDOW freeze** (covers P0-04) — line 11: `const WINDOW = 120` unchanged. Verify: `grep 'const WINDOW = 120' triade/src/render/useFrameRateBaseline.ts`.
- [x] **Generation-reset boundary** (covers P1-03) — lines 37-46 unchanged. Verify: `grep seenGeneration triade/src/render/useFrameRateBaseline.ts`.
- [x] **App.tsx untouched** (covers P1-01) — `git diff 6b16593 HEAD -- triade/App.tsx` empty. Verify before any follow-up.
- [x] **No-log rule** (covers P1-02) — no `console.` in hook. Verify: `grep -rn 'console\.' triade/src/render/useFrameRateBaseline.ts` empty.
- [x] **Reference suite green** — `triade/__tests__/render/useFrameRateBaseline.math.test.ts` 7/7 (already in tree).
- [x] **Typecheck + full suite** — `cd triade && npx tsc --noEmit` (clean) + `npm test` (see Execution Evidence).
- [x] **Evidence AC4** (covers P2-01/P2-02) — diagnosis F1/F2 + fix + protocol + shared flag + `STILL NO VERDICT`, no invented numbers. Verify: `grep -i 'shared with DW-32' _bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md`.
- [ ] **MANUAL (open, covers P1-04 / R-001)** — boot simulator dev build with `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` (seed 20260808), ~10s board play, one screenshot expecting `baseline: <fps> fps · p99 <p99>ms · <n> frames`; record seed/build/verbatim text in evidence. If `recording…` persists past 30s → open device-log investigation (Reanimated/runtime callback delivery), do NOT schedule another blind run. Owner: Eduardo. ~10–20 min wall time.
- [ ] **Ledger / status board** — NO action: `deferred-work.md` diff and `sprint-status.yaml` are orchestrator-owned. Do not write, do not revert.

---

## Red-Green-Refactor Workflow

- **RED (done — TEA):** 12 scaffolds created as `it.skip` in `triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts`. Proven to fail pre-fix (P0-02/P0-03 guard substrings absent in `6b16593` source) and pass post-fix (all guard substrings present in HEAD + 12 skipped / 0 fail in suite run).
- **GREEN (DEV / verifier):** Work through the Implementation Checklist top-to-bottom; for each item, activate its scaffold (`it.skip` → `it`), run `cd triade && npm test -- __tests__/render/frame-rate-baseline-measure.atdd.test.ts` (note: the project runner executes the full `__tests__/**` glob — the file's results appear inside the full run), confirm green, then move on. The one MANUAL item (P1-04) goes green only via the screenshot + evidence entry.
- **REFACTOR:** Allowed only inside the frozen boundaries — WINDOW, formulas, hook signature, generation effect, and `App.tsx` stay byte-identical. Any math/window change belongs to DW-32/probe-math, not this bundle. Re-run `npx tsc --noEmit` + full suite after any touch.

---

## Execution Commands & Evidence

- `cd triade && npm test -- __tests__/render/frame-rate-baseline-measure.atdd.test.ts` → full-suite run (runner globs `__tests__/**/*.test.ts`): **1491 tests · 134 suites · 1034 pass · 0 fail · 457 skipped** (baseline before this file: 1479/131/1034/0/445 — delta is exactly the +12 dormant scaffolds, +3 suites from file load). Suite stays green by construction (all new tests skipped).
- RED proof (source-level, no tree mutation): pre-fix `6b16593` source lacks `export function computeFrameRateStats` / `useCallback(` / `useFrameCallback(onFrame)` / `=== null` (all False) while keeping `const WINDOW = 120` (True) → P0-02/P0-03 **fail pre-fix**; HEAD source contains all nine guard substrings (export, `useCallback(`, `useFrameCallback(onFrame)`, `=== null`, `WINDOW = 120`, `count.current = 0`, `durations.current = []`, `computeFrameRateStats(samples)`, `const onFrame = useCallback(`) → **pass post-fix**.
- `git diff 6b16593 HEAD --stat` (production delta) + `git diff --stat` (worktree-vs-HEAD ledger-only) captured in preflight; `git diff 6b16593 HEAD -- triade/App.tsx` empty verified via prior test-design workflow.

Run specific file only (same runner, full glob applies):
- `cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "__tests__/render/frame-rate-baseline-measure.atdd.test.ts"`
- Typecheck: `cd triade && npx tsc --noEmit`

---

## Next Steps for DEV Team

1. Work the Implementation Checklist (all code items already in tree — verify each, don't re-implement).
2. Execute the MANUAL P1-04 one-screenshot re-measurement; file the outcome in `dw-16-frame-rate-baseline-evidence.md` (publish observed vs escalation opened). Budget verdict stays open until then.
3. Route the two deferred math families (off-by-one p99 leniency, negative-delta) to DW-32/probe-math — P0-05 locks the current truth so that change is detected.
4. Usual next workflow is `dev-story` for any follow-up story; `automate` comes only after implementation. No new automation scaffolding is needed from this ATDD run.

---

## Validation (against checklist.md)

- Story ACs analyzed and mapped to levels (Unit/Manual split at the RN-runtime boundary) ✓
- Red-phase scaffolds created at appropriate levels, all `it.skip`, Given-When-Then ✓
- RED proven (pre-fix fail / post-fix pass at source level) + activation guidance documented ✓
- No duplicate coverage across levels ✓
- Factories/fixtures/mocks/testids explicitly N/A with rationale ✓
- Implementation checklist maps every scaffold to concrete tasks + commands ✓
- Red-green-refactor documented; GREEN/REFACTOR boundaries pinned (WINDOW/math/signature/App.tsx frozen) ✓
- Output saved at `{test_artifacts}/atdd-checklist-dw-frame-rate-baseline-measure.md` with frontmatter (`storyId`, `storyKey`, `storyFile`, `atddChecklistPath`, `generatedTestFiles`) ✓
- `sprint-status.yaml` untouched; ledger untouched ✓
- Knowledge applied: test-levels (unit-vs-manual at runtime boundary), priorities (P0/P1/P2), test-quality (atomic, deterministic, isolated, no hardcoded data — local formula mirrors normative math) ✓

**Generated by:** TEA / Murat — `bmad-testarch-atdd` v5 (Create mode, sequential) · 2026-09-07
