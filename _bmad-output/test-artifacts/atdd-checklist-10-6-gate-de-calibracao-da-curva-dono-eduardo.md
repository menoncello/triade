---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-06'
workflowType: 'testarch-atdd'
storyId: '10.6'
storyKey: '10-6-gate-de-calibracao-da-curva-dono-eduardo'
storyFile: '_bmad-output/implementation-artifacts/spec-10-6-gate-de-calibracao-da-curva-dono-eduardo.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-10-6-gate-de-calibracao-da-curva-dono-eduardo.md'
generatedTestFiles:
  - '_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/calibration-gate-verdicts.red.test.ts'
  - '_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/calibration-gate-retune-validation.red.test.ts'
  - '_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/calibration-summary.factory.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-10-6-gate-de-calibracao-da-curva-dono-eduardo.md'
  - 'triade/src/engine/config/calibrationGate.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/__tests__/engine/calibration-gate.test.ts'
  - 'docs/calibracao-da-curva.md'
  - 'docs/decisoes/calibracao-10-6-PADRAO.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-10-6.md'
  - '_bmad-output/implementation-artifacts/epic-10-context.md'
---

# ATDD Checklist - Epic 10, Story 10.6: Gate de calibracao da curva (dono: Eduardo)

**Date:** 2026-09-06
**Author:** Eduardo
**Primary Test Level:** Unit (`node:test` + `tsx`, no browser)

---

## Story Summary

Pure, data-only spawn-curve calibration gate: a threshold evaluator over
operator-supplied telemetry summaries plus a decision-log record, with curve
revalidation enforced by tests/CI. Engine code stays untouched and the final
retune decision stays with Eduardo.

**As a** curve owner (Eduardo)
**I want** a numeric, evaluable retune gate over telemetry summaries
**So that** spawn-curve retunes are data-driven, logged with before/after, and
revalidated by CI instead of living as epic prose.

---

## Acceptance Criteria

1. **AC1 — Threshold breach:** given telemetry summary + playtest baseline,
   when `evaluateCalibrationGate` runs, then `needsRetune` is true exactly
   when first-merge p50 > 25s OR first-gameover p50 > 210s OR max-tile median
   drops > 1 tier vs baseline.
2. **AC2 — Invalid candidate rejected:** given a candidate retune, when curve
   invariants break (pot share != 0.2 epsilon, non-strict-decrease, non-2^k
   key, windows not renormalized), then validation rejects and CI fails.
3. **AC3 — Data-only diff:** given a retune is applied, when diffed, then only
   `spawnConfig.ts` (data) plus docs/decision-log change; no file under
   `triade/src/engine/core/` is modified.
4. **AC4 — Missing telemetry:** given no telemetry summaries are available,
   when the gate is invoked, then verdict is `unknown` with missing-fields
   listed and no retune is recommended.

---

## Step 1: Preflight & Context

### Stack Detection

- `config.test_stack_type`: `auto` → auto-detection executed.
- Frontend indicators present (`triade/package.json`: react, react-native,
  expo). Backend indicators (`pyproject.toml`, `pom.xml`, `go.mod`,
  `*.csproj`, `Gemfile`, `Cargo.toml`): none. No `playwright.config.*` /
  `cypress.config.*` anywhere in the repo; the test suite is pure TypeScript
  via `node:test` + tsx loader (`npm test` =
  `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`).
- **detected_stack = `frontend`** by the manifest algorithm, but the change
  under test is pure logic with zero UI/render path — so per
  `test-levels-framework.md` the **effective test tier is Unit**
  (`node:test`), exactly as the epic test-design plan records
  ("No Playwright/browser execution needed"). Prerequisite adapted, not
  halted: the configured framework (`node:test` via tsx) exists and covers
  this scope; halting for a missing browser harness would be the wrong call.

### Prerequisites

- ✅ Story approved with 4 testable acceptance criteria (spec I/O matrix).
- ✅ Test framework configured: `node:test` + `node:assert` via tsx
  (`triade/package.json` test script, Node ≥26 per engines).
- ✅ Dev environment available.

### Story Context

- story_id: `10.6` · story_key:
  `10-6-gate-de-calibracao-da-curva-dono-eduardo`
- Working-tree scope (branch `feat/epic-10-telemetria`, `272efcd..20b91aa`,
  7 files, all new, no tracked modifications): pure
  `evaluateCalibrationGate` evaluator (thresholds 25s / 210s / 1-tier drop,
  no I/O), `calibration-gate.test.ts` (12 tests), runbook
  `docs/calibracao-da-curva.md`, decision-log template
  `docs/decisoes/calibracao-10-6-PADRAO.md`, plus spec/epic-context/deferred-work
  entries.
- Key constraints: retune surface is `spawnConfig` data only; engine files
  under `triade/src/engine/core/` never modified; every evaluation/decision
  logged with before/after; TypeScript strict, no new runtime deps; never
  invent telemetry numbers; never write `sprint-status.yaml`.

### Framework & Existing Patterns

- Runner: built-in `node:test` + `node:assert`; sibling convention
  `triade/__tests__/engine/*.test.ts` (+ `.atdd.test.ts` for ATDD-style).
- Canonical suites that must stay green unchanged:
  `calibration-gate.test.ts` (12 tests), `spawn-config.test.ts` (8 tests).
- Threshold semantics from spec: strict `>` breach (equality is ok), tier
  ladder `1,2,3,6,12,24,48,96,192,...`, off-ladder values resolve to nearest
  lower tier, `clog12` informational-only, `isUsableNumber` requires finite
  `v > 0`, null summary returns `unknown` (never throws).

### TEA Config Flags

- `tea_use_playwright_utils`: true (no browser tests in scope → not applied)
- `tea_use_pactjs_utils`: false · `tea_pact_mcp`: none ·
  `tea_browser_automation`: auto · `tea_execution_mode`: auto ·
  `test_stack_type`: auto → frontend (unit tier effective, see above)

### Knowledge Fragments Applied

- `test-levels-framework.md` — unit is primary for pure functions; no E2E
  for a non-UI gate; duplicate-coverage guard (scaffolds assert one behavior
  each, canonical 12-test suite left untouched).
- `test-quality.md` — Given-When-Then comments, one assertion per test,
  deterministic inputs (no faker: fixed numerics; randomness would only add
  flakiness to threshold assertions), isolated (fresh builder object per
  test), no interdependencies.
- `data-factories.md` — override-friendly builders
  (`healthySummary(overrides?)`, `baseline96()`) with fresh objects per call.
- Browser fragments (`fixture-architecture`, `network-first`,
  `selector-resilience`, `timing-debugging`) and contract fragments
  (`contract-testing`, pact.js): evaluated, not applicable — no UI, no
  network, no microservice contracts in this change. Documented here instead
  of loaded.

---

## Step 2: Generation Mode

- **Mode: AI Generation** — acceptance criteria are clear and scenarios are
  pure-function matrix cases; no browser recording needed (zero UI in scope).
  `resolvedMode: sequential` (single executor; no subagent fan-out required
  for 15 unit scaffolds).

---

## Step 3: Test Strategy

| AC | Scenario | Level | Priority | Scaffold |
|----|----------|-------|----------|----------|
| AC1 | Breach first-merge p50 alone (>25s) → `retune` | Unit | P0 | verdicts AC1a |
| AC1 | Breach first-gameover p50 alone (>210s) → `retune` | Unit | P0 | verdicts AC1b |
| AC1 | Max-tile drop ≥2 tiers (96→24) → `retune` | Unit | P0 | verdicts AC1c |
| AC1 | All within bounds → `ok`, empty reasons/missing | Unit | P0 | verdicts AC1d |
| AC1 | Threshold constants pinned (25 / 210 / 1) | Unit | P0 | verdicts constants |
| AC4 | Missing summary field → `unknown`, never retune | Unit | P0 | verdicts AC4a |
| AC4 | Missing baseline → `unknown` | Unit | P0 | verdicts AC4b |
| AC2 | Non-2^k key rejected | Unit | P0 | retune-validation AC2a |
| AC2 | Non-strict-decrease rejected | Unit | P0 | retune-validation AC2b |
| AC2 | Fixed-sum drift rejected | Unit | P0 | retune-validation AC2c |
| AC2 | Shipped defaults accepted (anti-overstrict guard) | Unit | P0 | retune-validation AC2d |
| AC1 | Boundary equality (== threshold) is `ok` | Unit | P1 | verdicts boundary |
| AC1 | 1-tier drop `ok`, 2-tier drop `retune` | Unit | P1 | verdicts 1-vs-2 |
| AC4 | Null summary → `unknown`, never throws | Unit | P1 | verdicts null |
| AC4 | Non-positive inputs (0, negative) count as missing | Unit | P1 | retune-validation positivity |
| AC3 | Data-only diff (only `spawnConfig.ts` + docs/log; no `core/`) | Manual review-guard | P1 | Implementation checklist item 6 (no scaffold — not unit-testable without git coupling; verified via `git diff --stat`) |

No E2E / API / Component levels: no user journey, no endpoint, no rendered
component in this change (aligns with epic test-design plan §Execution
Strategy). No duplicate coverage: scaffolds mirror the canonical 12-test
suite 1:1 without modifying it.

---

## Story Integration Metadata

- **Story ID:** `10.6`
- **Story Key:** `10-6-gate-de-calibracao-da-curva-dono-eduardo`
- **Story File:**
  `_bmad-output/implementation-artifacts/spec-10-6-gate-de-calibracao-da-curva-dono-eduardo.md`
- **Checklist Path:**
  `_bmad-output/test-artifacts/atdd-checklist-10-6-gate-de-calibracao-da-curva-dono-eduardo.md`
- **Generated Test Files:**
  `_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/calibration-gate-verdicts.red.test.ts`,
  `_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/calibration-gate-retune-validation.red.test.ts`,
  `_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/calibration-summary.factory.ts`

The story file is orchestrator-managed spec state (`awaiting-operator` row
owned by the orchestrator); per session constraints it is not modified here —
this checklist is the handoff artifact for the DEV/operator flow instead.

---

## Red-Phase Test Scaffolds Created

### Unit Tests (15 tests, primary level)

**File:** `_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/calibration-gate-verdicts.red.test.ts` (143 lines, 10 tests)

- ✅ **Test:** `[P0] AC1a — breach first-merge p50 alone triggers retune`
  - **Status:** RED (skipped scaffold) — pre-implementation the
    `calibrationGate.ts` import throws (module absent at baseline `272efcd`);
    activated post-implementation it passes.
  - **Verifies:** AC1 first-merge leg.
- ✅ **Test:** `[P0] AC1b — breach first-gameover p50 alone triggers retune`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** AC1 first-gameover leg.
- ✅ **Test:** `[P0] AC1c — max-tile median drop of 2 tiers triggers retune (96 -> 24)`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** AC1 tier-drop leg.
- ✅ **Test:** `[P0] AC1d — all metrics within bounds returns ok with empty reasons`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** AC1 negative case.
- ✅ **Test:** `[P0] threshold constants pin the spec values (25s / 210s / 1-tier drop)`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** spec-drift guard.
- ✅ **Test:** `[P0] AC4a — missing fields return unknown, never retune`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** AC4 missing-field leg.
- ✅ **Test:** `[P0] AC4b — missing baseline forces unknown`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** AC4 baseline leg.
- ✅ **Test:** `[P1] boundary equality (== threshold) is ok, not a breach`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** strict-`>` semantics.
- ✅ **Test:** `[P1] tier drop of exactly 1 is ok, drop of 2 triggers`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** ladder-index semantics (96→48 vs 96→24).
- ✅ **Test:** `[P1] null summary returns unknown, never throws`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** AC4 null-tolerance (review patch).

**File:** `_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/calibration-gate-retune-validation.red.test.ts` (69 lines, 5 tests)

- ✅ **Test:** `[P0] AC2a — non-2^k key breaks the curve invariant`
  - **Status:** RED (skipped scaffold) — `spawnConfig.ts` import resolves
    (pre-existing module) but the gate-side contract it guards did not exist
    pre-implementation; activated pre-implementation the suite fails on the
    missing gate module leg.
  - **Verifies:** AC2 key-shape leg.
- ✅ **Test:** `[P0] AC2b — non-strict-decrease breaks the curve invariant`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** AC2 monotonicity leg.
- ✅ **Test:** `[P0] AC2c — fixed-sum drift breaks the pot-share invariant`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** AC2 share-sum leg.
- ✅ **Test:** `[P0] AC2d — shipped defaults stay accepted in the same activation`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** anti-overstrict validator guard.
- ✅ **Test:** `[P1] non-positive gate inputs count as missing, never ok`
  - **Status:** RED (skipped scaffold) — same failure reason.
  - **Verifies:** AC4 positivity guard (review patch).

### E2E / API / Component Tests

N/A — no UI, endpoint, or component in scope (see Test Strategy). Zero
scaffolds at these levels is intentional, not a gap.

---

## Data Factories Created

### Calibration Summary Factory

**File:** `_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/calibration-summary.factory.ts` (34 lines)

**Exports:**

- `healthySummary(overrides?)` — healthy gate summary (10s / 120s / 96) with
  optional overrides; fresh object per call.
- `baseline96(maxTileMedianBaseline = 96)` — playtest baseline builder.

No `@faker-js/faker`: the domain is fixed numerics and the spec forbids new
runtime deps; deterministic builders keep threshold assertions flake-free.

**Example Usage:**

```typescript
const r = evaluateCalibrationGate(
  healthySummary({ firstMergeP50Seconds: 26 }),
  baseline96()
);
// -> { verdict: 'retune', needsRetune: true, reasons: [...], missing: [] }
```

---

## Fixtures Created

N/A — pure functions with no I/O, no database, no external service: there is
nothing to set up or tear down. Each test builds its own input via the
factory above (isolation by construction). Creating `test.extend()` fixtures
here would add ceremony with zero value.

---

## Mock Requirements

N/A — the gate is dependency-free by design (no telemetry fetching; the
operator pastes dashboard summaries). No endpoint, no mock, no success/failure
response schema to document. If a future story adds an automated feed, its
ATDD run owns the mock contract.

---

## Required data-testid Attributes

N/A — no UI in scope. No `data-testid` additions required from any scaffold.

---

## Implementation Checklist

Covers the working-tree change (`272efcd..20b91aa`, branch
`feat/epic-10-telemetria`); each item maps to the scaffold(s) it turns green.
All implementation work is already present in the tree — this checklist is the
verification path (RED → GREEN already walked; re-run to confirm).

### Task 1 — Pure evaluator `calibrationGate.ts` (AC1, AC4)

**Scaffolds:** verdicts file, all 10 tests.

**Tasks to make these tests pass:**

- [x] Create `triade/src/engine/config/calibrationGate.ts` — pure
  `evaluateCalibrationGate(summary, baseline)` returning
  `{ verdict, needsRetune, reasons, missing }`; no I/O, no deps
- [x] Pin constants `FIRST_MERGE_P50_THRESHOLD_S = 25`,
  `FIRST_GAMEOVER_P50_THRESHOLD_S = 210`, `MAX_TIER_DROP = 1`
- [x] Implement tier ladder `[1, 2, 3·2^k…]` + nearest-lower-tier index;
  strict-`>` breach; drop `> MAX_TIER_DROP` triggers
- [x] Missing/invalid (null, non-finite, non-positive) fields →
  `verdict: 'unknown'`, `needsRetune: false`, named `missing[]`; partial
  `reasons` still reported for present metrics
- [x] `clog12` accepted but never gated, never required
- [ ] Run tests: `cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node
  --import tsx --test
  "../_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/*.test.ts"`
  (expect 15 skipped pre-activation) and `node --test
  __tests__/engine/calibration-gate.test.ts` (expect 12/12 pass)
- [ ] ✅ Tests pass (green phase)

**Estimated Effort:** 3–5 hours (done; verification ~30 min).

---

### Task 2 — Retune-candidate rejection via `validateSpawnConfig` (AC2)

**Scaffolds:** retune-validation file, tests AC2a–AC2d.

**Tasks to make these tests pass:**

- [x] Reuse existing `validateSpawnConfig` in
  `triade/src/engine/config/spawnConfig.ts` (no new validator): rejects bad
  key shape, non-strict-decrease, fixed-sum drift with listed violations;
  shipped defaults return `{ ok: true }`
- [x] Cover the rejection legs in `triade/__tests__/engine/calibration-gate.test.ts`
  (`[P0] invalid retune candidate…`)
- [ ] Run test: `cd triade && npm test -- spawn-config` (expect 8/8 pass)
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1–2 hours (done; verification ~15 min).

---

### Task 3 — Runbook `docs/calibracao-da-curva.md` (AC1, AC4, AC2-procedure)

**Scaffolds:** none (doc artifact; supports all verdict scaffolds).

**Tasks:**

- [x] Document thresholds table, Eduardo summary flow (same-window
  extraction), data-only retune procedure (edit only `spawnConfig.ts`,
  validate, revalidate command), decision-log schema + template pointer
- [x] Mark `clog12` informational-only; equality-is-ok; off-ladder rule
- [ ] Manual review: thresholds match spec constants; revalidation command
  present (`npm test -- calibration-gate && npm test -- spawn-config &&
  npx tsc --noEmit`)

**Estimated Effort:** 1–2 hours (done).

---

### Task 4 — Decision-log template `docs/decisoes/calibracao-10-6-PADRAO.md` (AC4)

**Scaffolds:** none (doc artifact; supports AC4a/AC4b unknown-legs).

**Tasks:**

- [x] Template with OPERATOR placeholders for every metric (data, métricas
  antes + fonte/janela, veredito + reasons/missing, decisão + aprovador
  Eduardo, antes/depois, revalidação); zero invented numbers
- [ ] Manual review: no hardcoded telemetry values; every value slot marked
  `_a preencher pelo Eduardo_`

**Estimated Effort:** ≤1 hour (done).

---

### Task 5 — Typecheck + full engine regression (AC2 CI-fails-closed)

**Scaffolds:** all (regression guard).

**Tasks:**

- [x] `npx tsc --noEmit` clean (strict, no new deps)
- [ ] Run: `cd triade && npx tsc --noEmit` (expect clean) and `npm test`
  (expect all green except known pre-existing
  `preview-availability.integration.test.ts` failure, deferred as DW-114 —
  unrelated, do not chase here)

**Estimated Effort:** ≤1 hour (verification ~15 min).

---

### Task 6 — Diff-guard: data-only boundary (AC3)

**Scaffolds:** none (review-guard, P1 — git coupling makes it unfit as a unit
scaffold).

**Tasks:**

- [x] Confirm `git diff 272efcd..20b91aa --name-only` shows no
  `triade/src/engine/core/` file and no `sprint-status.yaml` write (verified
  2026-09-06: only the 7 new files)
- [ ] Re-verify on every future retune PR: diff may touch only
  `triade/src/engine/config/spawnConfig.ts` + docs/decision-log
- [ ] ✅ Guard holds (green phase)

**Estimated Effort:** ≤1 hour per retune PR (reviewer discipline).

---

## Running Tests

```bash
# Run all RED scaffolds for this story (expect 15 skipped pre-activation)
cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "../_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/*.test.ts"

# Run the canonical gate suite (expect 12/12 pass post-implementation)
cd triade && node --test __tests__/engine/calibration-gate.test.ts

# Run the curve-invariant suite (expect 8/8 pass)
cd triade && npm test -- spawn-config

# Typecheck (expect clean)
cd triade && npx tsc --noEmit

# Diff-guard (expect no engine/core, no sprint-status.yaml)
git diff 272efcd..20b91aa --name-only | grep -E "engine/core|sprint-status" || echo "GUARD HOLDS"
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 15 tests written as red-phase scaffolds with `test.skip()`
- ✅ Factory created (`calibration-summary.factory.ts`); fixtures N/A with
  reason; mocks N/A with reason; data-testids N/A with reason
- ✅ Implementation checklist created (Tasks 1–6)

**Verification (evidence collected 2026-09-06, read-only commands only):**

- Scaffold suite as committed: 15 tests, 0 pass, 0 fail, **15 skipped** ✅
- Activation probe (copies in `/tmp`, `test.skip(` → `test(`): 15 tests,
  **15 pass**, 0 fail — scaffolds assert real post-implementation behavior ✅
- Pre-implementation RED root cause: `git show
  272efcd:triade/src/engine/config/calibrationGate.ts` → `fatal: ... not in
  '272efcd'` — the module did not exist at baseline, so every scaffold
  importing it fails on load ✅
- Canonical suites post-implementation: calibration-gate 12/12 pass,
  spawn-config 8/8 pass ✅

### GREEN Phase (DEV Team — already walked; re-verify via checklist)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with
   Task 1, `[P0] AC1a`)
2. **Remove `test.skip()`** for that test and confirm it fails first
3. **Read the test** to understand expected behavior
4. **Implement minimal code** to make that specific test pass
5. **Run the test** to verify it now passes (green)
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat

(State of the tree: implementation from rev `20b91aa` already satisfies all
15 scaffolds — the activation probe proves it. Remaining GREEN work is
re-verification, not new code.)

### REFACTOR Phase (DEV Team — After All Tests Pass)

1. **Verify all tests pass** (scaffold probe 15/15 + canonical 12/12 + 8/8)
2. **Review code for quality** (purity, no I/O, strict TS, no new deps)
3. **Extract duplications** only if found (none identified)
4. **Ensure tests still pass** after each refactor
5. **Don't change test behavior** (only implementation)

---

## Next Steps

1. **Re-run the checklist commands** (Running Tests §) to confirm green on
   the current tree.
2. **Operator actions (Eduardo, per spec):** extract same-window dashboard
   summaries → run `evaluateCalibrationGate` → fill
   `docs/decisoes/calibracao-10-6-PADRAO.md` with real numbers → if `retune`,
   edit only `spawnConfig.ts`, revalidate, commit data + log.
3. **On any future retune PR:** re-run Tasks 2, 5, 6 (validator + typecheck +
   diff-guard); reviewer rejects retunes without a filled decision-log entry.
4. **Then `automate`** (not `dev-story` — implementation exists; ATDD RED is
   captured here for the record and for future retune cycles).

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments:

- **test-levels-framework.md** — unit-first for pure logic; no E2E for
  non-UI gate; duplicate-coverage guard.
- **test-quality.md** — Given-When-Then, one assertion per test,
  determinism, isolation, no interdependencies.
- **data-factories.md** — override-friendly builders, fresh objects,
  faker deliberately omitted (fixed-numeric domain + no-new-deps boundary).

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification

**Command:** `cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import
tsx --test
"../_bmad-output/test-artifacts/atdd-10-6-gate-de-calibracao-da-curva/*.test.ts"`

**Results:**

```
ℹ tests 15
ℹ suites 0
ℹ pass 0
ℹ fail 0
ℹ cancelled 0
ℹ skipped 15
ℹ duration_ms 163.615667
```

**Activation probe** (copies in `/tmp/tea-atdd-10-6-probe`, `test.skip(` →
`test(`, probe dir removed afterwards):

```
ℹ tests 15
ℹ pass 15
ℹ fail 0
ℹ skipped 0
```

**Pre-implementation root cause:** `git show
272efcd:triade/src/engine/config/calibrationGate.ts` →
`fatal: path 'triade/src/engine/config/calibrationGate.ts' exists on disk,
but not in '272efcd'` (module absent at baseline → import-time RED).

**Canonical suites:** `calibration-gate.test.ts` 12 pass / 0 fail;
`spawn-config.test.ts` 8 pass / 0 fail. **Diff-guard:**
`272efcd..20b91aa` touches no `engine/core` file and no
`sprint-status.yaml`.

**Summary:**

- Total tests: 15 (10 verdicts + 5 retune-validation)
- Skipped: 15 (expected before activation)
- Activated probe pass: 15/15 (expected after activation, post-implementation)
- Passing pre-activation: 0 (expected)
- Status: ✅ Red-phase scaffolds verified

---

## Notes

- Retroactive ATDD: the implementation (rev `20b91aa`) already exists on
  branch `feat/epic-10-telemetria`; scaffolds are written as skipped RED so
  the red-green chain stays auditable, with the /tmp activation probe as the
  GREEN proof. Canonical tests in `triade/__tests__/` were not modified.
- AC3 (diff-guard) is a review-guard, not a scaffold — coupling a unit test
  to git history would be fragile; the checklist command is the enforcement.
- Residual risks (from epic test-design R-001/R-004/R-005): gate verdicts
  are only as good as operator-supplied summaries; no automated feed yet
  (10.2/10.3 pipeline not in repo); first 1–2 real evaluations calibrate the
  thresholds themselves. None block this artifact.
- `sprint-status.yaml` untouched per orchestrator ownership (10-6 row
  remains `awaiting-operator` — operator actions are Eduardo's, not defects).

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Refer to `./bmm/docs/tea-README.md` for workflow documentation
- Runbook: `docs/calibracao-da-curva.md` · Template:
  `docs/decisoes/calibracao-10-6-PADRAO.md`

---

**Generated by BMad TEA Agent** - 2026-09-06
