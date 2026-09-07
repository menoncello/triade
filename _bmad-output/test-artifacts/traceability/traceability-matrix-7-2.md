---
stepsCompleted: []
lastStep: ''
lastSaved: '2026-09-07'
workflowType: 'testarch-trace'
inputDocuments:
  - _bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md
  - _bmad-output/test-artifacts/atdd-checklist-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md
  - _bmad-output/test-artifacts/test-design/test-design-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md
  - _bmad-output/test-artifacts/automation-summary-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md
  - triade/src/game/preview.ts
  - triade/src/ui/PreviewCard.tsx
  - triade/src/ui/Hud.tsx
  - triade/App.tsx
coverageBasis: 'acceptance_criteria (story 7.2 AC1-AC7 + D-008 delta)'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - _bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md
externalPointerStatus: 'not_used'
---

# Traceability Matrix & Gate Decision - Story 7.2: Preview card no HUD (60/40) nas duas pistas

**Target:** Story 7.2 (`7-2-preview-card-no-hud-60-40-nas-duas-pistas`)
**Date:** 2026-09-07
**Evaluator:** Eduardo (TEA / Murat — Master Test Architect)
**Coverage Oracle:** acceptance_criteria (formal requirements: story AC1–AC7 + D-008 verification delta, commit `ee3ce91`)
**Oracle Confidence:** high
**Oracle Sources:** `_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`

> Working-tree scope: `git diff HEAD --stat -- triade/` is EMPTY — no uncommitted
> production delta for 7.2. The change under review is the committed D-008 delta
> (`ee3ce91`: null/undefined-`pending` → safe exact-0 + null/non-array-ladder →
> full-ladder guards, + 3 `[P0] AC2` pins) against the shipped 7.2 surface
> (`preview.ts`, `PreviewCard.tsx`, `Hud.tsx` fan-out, `App.tsx` wiring).
> `sprint-status.yaml` is orchestrator-owned bookkeeping — read-only, never
> modified or reverted here. Untracked `triade/src/theme/*` (9-4 leftovers) and
> `_bmad-output` sweep files are out of scope for this trace (not mapped).
> This workflow generates no tests; gaps (none) would route to `*atdd`/`*automate`.

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status       |
| --------- | -------------- | ------------- | ---------- | ------------ |
| P0        | 7              | 7             | 100%       | ✅ PASS      |
| P1        | 0              | 0             | 100%       | ✅ PASS      |
| P2        | 0              | 0             | 100%       | ✅ PASS      |
| P3        | 0              | 0             | 100%       | ✅ PASS      |
| **Total** | **7**          | **7**         | **100%**   | **✅ PASS** |

**Legend:**

- ✅ PASS - Coverage meets quality gate threshold
- ⚠️ WARN - Coverage below threshold but not critical
- ❌ FAIL - Coverage below minimum threshold (blocker)

### Detailed Mapping

#### 7.2-AC1: Preview reads `game.pendingSpawn`, never re-rolls (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `preview.test.ts` (unit, 26 pins in file) — purity/deep-equal + no-mutation + exact-echo pins
    - **Given:** a well-formed `PendingSpawn { value, displayRoll }`
    - **When:** `previewFor` is called twice with deep-equal input
    - **Then:** outputs are deep-equal, input unmutated, no rng/`Math.random`/roll imports
  - `hud.previewWiring.test.ts` (component) — exact pending through real `previewFor` → `Hud`
    - **Given:** pending with `displayRoll < 0.6`
    - **When:** `Hud` renders via the `App.tsx` wiring path
    - **Then:** the pending value text renders in the preview slot
  - `ui.norolls.test.ts` (static guard) — view layers never import roll symbols
  - `7-2-…​.gateway.spec.ts [P0-API-01]` — source-contract: no `Math.random(`, no roll imports in `preview.ts`
  - `7-2-…​.umbrella.spec.ts [E2E-01]` — JOURNEY_EXACT: pending → exact → display → announce (live import)

#### 7.2-AC2: `<0.6` exact / `≥0.6` range; contiguous window ≤3 joined `/` (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `preview.test.ts` (unit) — boundary `0.599…` exact / `0.6` range (ULP-stabilized `roll + EPSILON < 0.6`), exact echoes `value`, range contains `value`, `≤3`, contiguous ascending, `[1,2]` → `1/2`, beyond-ladder tail, stale-ceiling fallback
    - **Given:** pending on either side of the 60/40 boundary
    - **When:** `previewFor` decides exact vs range
    - **Then:** kind + window satisfy the containment/cap/order contract
  - `preview.test.ts` D-008 pins (unit) — null/undefined pending → safe `{ kind:'exact', value:0 }` no-throw; explicit-null/non-array `availablePotValues` → full ladder
  - `previewCard.test.ts` (component) — exact renders own Text node; range renders `'/'`-joined
  - `hud.previewWiring.test.ts` (component) — range path through real `previewFor` → `Hud` (not a hand-built fixture)
  - `gateway [P0-API-02/03/04]` — `PREVIEW_EXACT_BOUNDARY=0.6` + EPSILON form, `POT_CURVE`+`[1,2]`+`WINDOW_MAX=3` ladder markers, D-008 guards
  - `umbrella [E2E-02/03]` — JOURNEY_RANGE (truth-containment end-to-end) + JOURNEY_DEGRADE (null paths → safe card, HUD stays up)

#### 7.2-AC3: Preview shown in both Clean and Accelerated lanes (P0)

- **Coverage:** FULL ✅ (structural fan-out accepted by owner 2026-08-24; per-lane board differentiation lands in Epic 3)
- **Tests:**
  - `hud.test.ts` (component) — labeled previews for both lanes; default fixture uses distinct values (clean `3`, accelerated `6`) so a missing-lane regression fails
  - `hud.previewWiring.test.ts` (component) — two distinct lane previews render through `previewFor` wiring
  - `previewCard.test.ts [P0] AC3/FR-45` — lane caption renders, a11y note includes the label
  - `gateway [P1-API-02/03]` + `umbrella [E2E-04]` — `previews {clean, accelerated}` fan-out + distinct labels over shared display (prod-faithful: labels differ, display shared — no false coverage)
- **Gaps:** none in scope. Residual R-002 (identical-input fan-out overstates per-lane coverage) tracked as medium risk; Epic 3 owns per-lane differentiation.

#### 7.2-AC4: Portrait bottom corner / landscape top band, markers intact (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `hud.test.ts` (component) — portrait 76×76 panel, landscape 60×44 compact band; `pointerEvents="none"` preserved; pause-button spacing intact
  - `gateway [P1-API-03]` — layout-marker source contract (76×76 / 60×44)
  - `umbrella [E2E-06]` (static) — chrome journey: markers + wiring present end-to-end

#### 7.2-AC5: Chip chrome + accent `#E8A33D` @20pt + `accessibilityLabel` (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `previewCard.test.ts` (component, 7 pins) — `#f1eee6` fill / `#c9c4b8` border / 12pt radius; value `#E8A33D` @20pt 700 tabular-nums; `accessibilityLabel "Próxima: …"` contains displayed value(s)
  - `gateway [P0-API-05/06]` — card-chrome hexes (shipped light, not dark canonicals) + `/`-join + `""` fallback + `Próxima` label markers

#### 7.2-AC6: No feel/animation on the card (P0)

- **Coverage:** FULL ✅ (structural posture — no feel layer exists until Epic 8)
- **Tests:**
  - `previewCard.test.ts` (component) — no animation/transform props on the card
  - `gateway [P1-API-01]` — comment-tolerant usage scan (no `Animated` import/reference, no `transform:`/`transform=` usage)

#### 7.2-AC7: NOOP does not change the card (P0)

- **Coverage:** FULL ✅ (zero extra code — snapshot preserved verbatim on rejected moves)
- **Tests:**
  - `pending-spawn-contract.test.ts` (unit, engine contract) — NOOP preserves `pendingSpawn`, 0 rng draws
  - `umbrella [E2E-05]` — JOURNEY_NOOP: equal input → identical card (no flicker)
  - `gateway [P1-API-04]` — `App.tsx` passes `previewFor(game.pendingSpawn, …)`; no preview `useState`
  - `atdd red scaffolds [P0][AC-7]` — NOOP content-identity contract (skipped form, CI-safe)

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌

0 gaps found. No release blocker.

#### High Priority Gaps (PR BLOCKER) ⚠️

0 gaps found. Nothing blocks PR merge.

#### Medium Priority Gaps (Nightly) ⚠️

0 gaps found. R-002 (identical-lane fan-out) and R-003 (basic-window content owned by 7.3) are tracked medium risks with pins holding the baseline — not coverage gaps in this scope.

#### Low Priority Gaps (Optional) ℹ️

0 gaps found.

### Coverage Heuristics Findings

#### Endpoint Coverage Gaps

- N/A — pure client display surface, no network endpoints. 0 gaps.

#### Auth/Authz Negative-Path Gaps

- N/A — no auth surface. 0 gaps. (Negative-path analogue — malformed-input degrade paths — IS covered: null/undefined pending, NaN roll/value, null ladder.)

#### Happy-Path-Only Criteria

- 0 criteria happy-path-only. Error/degrade paths pinned: D-008 null guards, `displayOf` malformed-shape fallback (`""`, never `"undefined"`), `FALLBACK_PREVIEW` empty-range path.

---

### Quality Assessment

#### Tests with Issues

**BLOCKER Issues** ❌ — none.

**WARNING Issues** ⚠️ — none (mapped tests deterministic, Given-When-Then, no hard waits, self-contained fixtures; `preview.test.ts` 26 + `previewCard.test.ts` 7 within size/duration budgets).

**INFO Issues** ℹ️

- ATDD red scaffolds (`atdd-7-2-preview-card-no-hud.red.test.ts`, 10 `test.skip`) are intentionally skipped contract encodings, not missing coverage — CI-safe by design.
- Fleet-wide 445 skips are pre-existing (other stories' red scaffolds), not 7.2 regressions.

#### Tests Passing Quality Gates

**68/68 mapped 7.2 tests meet quality criteria (100%)** ✅ — 26 unit (`preview.test.ts`) + 7 component (`previewCard.test.ts`) + 8 (`hud.test.ts`) + 9 (`hud.previewWiring.test.ts`) + 12 gateway + 6 umbrella; red scaffolds excluded from the pass count (skipped by design).

---

### Duplicate Coverage Analysis

#### Acceptable Overlap (Defense in Depth)

- AC1/AC2: unit behavior pins (`preview.test.ts`) + source-contract pins (gateway) + journey pins (umbrella) — contract vs behavior vs journey split, each catches a different drift class (shape rot vs logic rot vs wiring rot). ✅
- AC3: distinct-value regression guard + prod-faithful same-pending wiring pin — complementary, both kept per test-design R-002 mitigation. ✅

#### Unacceptable Duplication ⚠️

- None. Gateway scans pin source shape only; triade pins pin behavior; umbrella pins pin composition — no same-validation-at-two-levels.

---

### Coverage by Test Level

| Test Level | Tests             | Criteria Covered     | Coverage %       |
| ---------- | ----------------- | -------------------- | ---------------- |
| E2E (umbrella journeys) | 6 | 7/7 (journeys span all ACs) | 100% |
| API (gateway contracts) | 12 | 7/7 (contracts span all ACs) | 100% |
| Component  | 24 (7+8+9)       | 7/7                  | 100%             |
| Unit       | 26+ (preview + guards + engine contract) | 7/7 | 100% |
| **Total**  | **68 mapped (unique)** | **7/7**         | **100%**         |

(Red scaffolds: 10 skipped, not counted as coverage — they encode the same contract in skipped form.)

---

### Traceability Recommendations

#### Immediate Actions (Before PR Merge)

- None — all ACs FULL, all mapped tests green, tsc clean, engine byte-identical.

#### Short-term Actions (This Milestone)

1. **Close the two D-008 ledger entries in `deferred-work.md`** — the exact-0 `"0"`-render residual and the `tsconfig.test.json` nondeterminism note — via a follow-up close-out (not in this trace; noted in the story log).
2. **Hand R-002/R-003 to their owners** — Epic 3 (per-lane boards) and story 7.3 (exhaustive range-content pins).

#### Long-term Actions (Backlog)

1. **Epic 8/9 inheritances** — feel-exclusion runtime enforcement (Epic 8), full screen-reader bridge (Epic 9); 7.2's structural pins are the handoff.

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

---

### Evidence Summary

#### Test Execution Results

- **Total Tests**: 1472 (fleet) — mapped 7.2 subset: 68 active + 10 skipped-by-design
- **Passed**: 1027 (fleet) — mapped 7.2: 68/68 (100%)
- **Failed**: 0 (fleet and mapped)
- **Skipped**: 445 (fleet, pre-existing) — mapped: 10 red scaffolds skipped by design
- **Duration**: ~5s (fleet)

**Priority Breakdown (mapped 7.2):**

- **P0 Tests**: all mapped ACs P0 — 100% pass ✅
- **P1 Tests**: gateway P1 ×5 + umbrella P1 ×2 — 100% pass ✅
- **P2 Tests**: gateway P2 ×1 + umbrella P2 ×1 + P2 posture pins — 100% pass (informational)
- **P3 Tests**: none in scope (informational)

**Overall Pass Rate**: 100% (mapped) ✅

**Test Results Source**: local runs 2026-09-07 — `npm test` in `triade/` (fleet 1027/0/445); gateway 12/12; umbrella 6/6; red scaffolds 10 skipped

---

#### Coverage Summary (from Phase 1)

**Requirements Coverage:**

- **P0 Acceptance Criteria**: 7/7 covered (100%) ✅
- **P1 Acceptance Criteria**: n/a (0 in scope) ✅
- **P2 Acceptance Criteria**: n/a (informational)
- **Overall Coverage**: 100%

**Code Coverage** (if available):

- Line/Branch/Function: NOT_ASSESSED (no coverage gate configured for this RN surface; behavior pins + guards are the evidence)

**Coverage Source**: this matrix + test-design + automation-summary

---

#### Non-Functional Requirements (NFRs)

**Security**: NOT_ASSESSED ✅ (no SEC surface in scope)

**Performance**: PASS ✅ — `previewFor` is O(ladder) pure with frozen memo-safe windows; HUD chrome, not the hot path (test-design NFR planning; inspection only, no perf suite warranted).

**Reliability**: PASS ✅ — malformed snapshot never crashes the HUD (D-008 pins green; `displayOf` fallback green).

**Maintainability**: PASS ✅ — engine wall holds (`git diff --stat -- triade/src/engine` empty; `ui.norolls` / `ui.thinview` / `ui.purity` green); `npx tsc --noEmit` clean; `tsconfig.test.json` failures are pre-existing/waived (ledgered since 7-1), no NEW errors.

**NFR Source**: test-design NFR planning + live verification evidence

---

#### Flakiness Validation

**Burn-in Results**: not run (no burn-in harness for this pure/component scope; pins are deterministic — fixed fixtures, no waits, no shared state).

- **Flaky Tests Detected**: 0 ✅ (no flakes observed across fleet + gateway + umbrella runs)

---

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion             | Threshold | Actual                    | Status   |
| --------------------- | --------- | ------------------------- | -------- |
| P0 Coverage           | 100%      | 100% (7/7 FULL)           | ✅ PASS |
| P0 Test Pass Rate     | 100%      | 100% (68/68 mapped)       | ✅ PASS |
| Security Issues       | 0         | 0 (no SEC surface)        | ✅ PASS |
| Critical NFR Failures | 0         | 0                         | ✅ PASS |
| Flaky Tests           | 0         | 0                         | ✅ PASS |

**P0 Evaluation**: ✅ ALL PASS

---

#### P1 Criteria (Required for PASS, May Accept for CONCERNS)

| Criterion              | Threshold | Actual               | Status   |
| ---------------------- | --------- | -------------------- | -------- |
| P1 Coverage            | ≥90%      | n/a → 100% (no P1 ACs) | ✅ PASS |
| P1 Test Pass Rate      | ≥95%      | 100% (7/7 P1 pins)   | ✅ PASS |
| Overall Test Pass Rate | ≥95%      | 100% (mapped)        | ✅ PASS |
| Overall Coverage       | ≥80%      | 100%                 | ✅ PASS |

**P1 Evaluation**: ✅ ALL PASS

---

#### P2/P3 Criteria (Informational, Don't Block)

| Criterion         | Actual          | Notes                                                        |
| ----------------- | --------------- | ------------------------------------------------------------ |
| P2 Test Pass Rate | 100% | Tracked, doesn't block |
| P3 Test Pass Rate | n/a | Tracked, doesn't block |

---

### GATE DECISION: PASS

---

### Rationale

All P0 criteria met: 7/7 acceptance criteria FULL-covered at unit + component + contract + journey levels, 68/68 mapped tests green, fleet 1027 pass / 0 fail, `tsc` clean, engine byte-identical, no security issues, no flakes. The working tree carries no uncommitted 7.2 production delta — the trace pins the committed D-008-hardened surface. Residuals (R-002 identical-lane fan-out, R-003 basic-window content, D-008 ledger close-out) are owned follow-ups in Epic 3 / 7.3 / deferred-work, none blocking. Feature is ready with standard monitoring.

---

### Gate Recommendations

#### For PASS Decision ✅

1. **Proceed** — no deployment action (story already `done` at `final_revision ee3ce91`; sprint-status.yaml untouched as orchestrator bookkeeping).
2. **Post-merge monitoring** — standard: watch for HUD-chrome regression reports (occlusion/spacing) and any null-pending telemetry (D-008 path should be unreachable in production).
3. **Success Criteria** — 7.3 range-content pins land on this contract without breaking the 68 mapped tests; Epic 3 migrates the `previews`/`activeLaneId` contract via the wiring gate.

---

### Next Steps

**Immediate Actions** (next 24-48 hours):

1. None blocking — trace artifacts recorded under `_bmad-output/test-artifacts/traceability/`.
2. Route R-002 → Epic 3 test design; R-003 → story 7.3.

**Follow-up Actions** (next milestone/release):

1. Close the two D-008 `deferred-work.md` ledger entries via follow-up close-out.
2. Re-run this trace if any future diff touches `preview.ts` / `PreviewCard.tsx` / `Hud.tsx` / `App.tsx` wiring.

**Stakeholder Communication**:

- Notify PM: Story 7.2 trace PASS — 7/7 ACs FULL, 68/68 green, no blockers.
- Notify SM: No action; sprint-status.yaml untouched.
- Notify DEV lead: D-008 surface pinned; 7.3/Epic 3 handoffs documented.

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  # Phase 1: Traceability
  traceability:
    story_id: "7.2"
    date: "2026-09-07"
    coverage:
      overall: 100%
      p0: 100%
      p1: 100%
      p2: 100%
      p3: 100%
    gaps:
      critical: 0
      high: 0
      medium: 0
      low: 0
    quality:
      passing_tests: 68
      total_tests: 68
      blocker_issues: 0
      warning_issues: 0
    recommendations:
      - "Close the two D-008 deferred-work ledger entries via follow-up close-out"
      - "Hand R-002 to Epic 3 and R-003 to story 7.3"

  # Phase 2: Gate Decision
  gate_decision:
    decision: "PASS"
    gate_type: "story"
    decision_mode: "deterministic"
    criteria:
      p0_coverage: 100%
      p0_pass_rate: 100%
      p1_coverage: 100%
      p1_pass_rate: 100%
      overall_pass_rate: 100%
      overall_coverage: 100%
      security_issues: 0
      critical_nfrs_fail: 0
      flaky_tests: 0
    thresholds:
      min_p0_coverage: 100
      min_p0_pass_rate: 100
      min_p1_coverage: 90
      min_p1_pass_rate: 95
      min_overall_pass_rate: 95
      min_coverage: 80
    evidence:
      test_results: "local 2026-09-07: triade fleet 1027 pass/0 fail/445 skipped; gateway 12/12; umbrella 6/6; red 10 skipped"
      traceability: "_bmad-output/test-artifacts/traceability/traceability-matrix-7-2.md"
      nfr_assessment: "test-design NFR planning (reliability/maintainability PASS; security n/a; perf inspection-only)"
      code_coverage: "not_assessed (no coverage gate on this RN surface)"
    next_steps: "No blocking action; route R-002 to Epic 3, R-003 to 7.3; close D-008 ledger entries in follow-up"
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`
- **ATDD Checklist:** `_bmad-output/test-artifacts/atdd-checklist-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`
- **Automation Summary:** `_bmad-output/test-artifacts/automation-summary-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`
- **Test Results:** triade fleet + gateway + umbrella runs (2026-09-07, local)
- **NFR Evidence:** test-design NFR planning section
- **Test Files:** `triade/__tests__/game/preview.test.ts`, `triade/__tests__/ui/components/previewCard.test.ts`, `triade/__tests__/ui/components/hud.test.ts`, `triade/__tests__/ui/components/hud.previewWiring.test.ts`, `_bmad-output/test-artifacts/tests/api/7-2-…​.gateway.spec.ts`, `_bmad-output/test-artifacts/tests/e2e/7-2-…​.umbrella.spec.ts`

---

## Sign-Off

**Phase 1 - Traceability Assessment:**

- Overall Coverage: 100%
- P0 Coverage: 100% ✅ PASS
- P1 Coverage: 100% (n/a) ✅ PASS
- Critical Gaps: 0
- High Priority Gaps: 0

**Phase 2 - Gate Decision:**

- **Decision**: PASS ✅
- **P0 Evaluation**: ✅ ALL PASS
- **P1 Evaluation**: ✅ ALL PASS

**Overall Status:** PASS ✅

**Next Steps:**

- If PASS ✅: Proceed (no deploy action; story already done — monitor + hand off R-002/R-003)
- If CONCERNS ⚠️: n/a
- If FAIL ❌: n/a
- If WAIVED 🔓: n/a

**Generated:** 2026-09-07
**Workflow:** testarch-trace v5.0 (step-file architecture; Create mode)

---

<!-- Powered by BMAD-CORE™ -->
