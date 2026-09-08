---
stepsCompleted: ['step-01-load-context', 'step-02-oracle', 'step-03-discover', 'step-04-map', 'step-05-gaps', 'step-06-gate', 'step-07-emit']
lastStep: 'step-07-emit'
lastSaved: '2026-09-06'
workflowType: 'testarch-trace'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-1-7-legibilidade-dos-numerais-em-landscape.md'
  - '_bmad-output/test-artifacts/coverage-matrix-1-7-legibilidade-dos-numerais-em-landscape.json'
  - '_bmad-output/project-context.md'
  - 'triade/src/ui/tileNumerals.ts'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/render/GameBoard.tsx'
coverageBasis: 'formal_requirements (story AC-1..AC-4 + T2.1 ink single-source)'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-1-7-legibilidade-dos-numerais-em-landscape.md'
externalPointerStatus: 'not_used'
---

# Traceability Matrix & Gate Decision — Story 1.7 Legibilidade dos numerais em landscape

**Target:** Story 1.7 — Legibilidade dos numerais em landscape (`1-7-legibilidade-dos-numerais-em-landscape`)
**Date:** 2026-09-06
**Evaluator:** Eduardo (TEA Trace)
**Story state:** `awaiting-operator` (final_revision `3e8a021`, HEAD `c252623`)
**Coverage Oracle:** formal_requirements — story AC-1..AC-4 + T2.1 ink single-source wiring
**Oracle Confidence:** high
**Oracle Sources:** story file + epic test-design + coverage-matrix-1-7 JSON

---

Note: This workflow does not generate tests. Gaps reference `*atdd`/`*automate` artifacts that already exist; the only open item is human-only (T3.2).

**Working-tree basis:** the tracked diff carries NO production change — only orchestrator-owned
`sprint-status.yaml` bookkeeping (untouched per instructions). The story's production changes landed in
`507c5ea` (`triade/src/ui/tileNumerals.ts` guards + `ESTIMATED_WIDTH_FACTOR` extraction, 2 regression
tests in `triade/__tests__/ui/tileNumerals.test.ts`). This trace evaluates the shipped state at HEAD
against the story ACs — i.e. it pins the working-tree change set (guards + regression tests) to the
requirements they cover.

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status       |
| --------- | -------------- | ------------- | ---------- | ------------ |
| P0        | 4              | 4             | 100%       | ✅ PASS      |
| P1        | 1              | 0             | 0%         | ⚠️ CONCERNS  |
| P2        | 0              | 0             | —          | —            |
| P3        | 0              | 0             | —          | —            |
| **Total** | **5**          | **4**         | **80%**    | ⚠️ CONCERNS  |

**Legend:**

- ✅ PASS - Coverage meets quality gate threshold
- ⚠️ WARN - Coverage below threshold but not critical
- ❌ FAIL - Coverage below minimum threshold (blocker)

Oracle items: AC-1, AC-2, AC-3 (P0, analytic automation) + INK single-source (P0, cross-cutting T2.1)
+ AC-4 (P1, manual-only by design — fixed numerals are a deliberate Dynamic Type exception, UX-DR-18).
P0 automation is 100%. The single non-FULL item is the human-only simulator/device gate (T3.2),
which project rules keep informative and never a PR gate.

---

### Detailed Mapping

#### AC-1: Landscape min ~44pt tile floor, else the legibility check re-runs (P0)

- **Coverage:** FULL ✅ (analytic; real-window floor confirmation rides on the T3.2 manual session)
- **Tests:**
  - `MIN_TILE_WIDTH is pinned to 44` — `triade/__tests__/ui/tileNumerals.test.ts:33`
    - **Given:** the shipped `tileNumerals` module
    - **When:** `MIN_TILE_WIDTH` is read
    - **Then:** it equals 44 (the ~44pt landscape tile floor)
  - `[P0] BOARD_SIZE_FLOOR derives from MIN_TILE_WIDTH…` — `_bmad-output/test-artifacts/tests/unit/1-7-legibilidade-dos-numerais-em-landscape.atdd.test.ts:56`
    - **Given:** GRID=4, BOARD_PADDING=8, CELL_GAP=8
    - **When:** the floor is derived from the 44pt tile floor
    - **Then:** `BOARD_SIZE_FLOOR` equals 216 (44·4 + 8·2 + 8·3)
  - `[P1] degenerate container yields a valid sub-floor board` — `tests/unit/…atdd.test.ts:150`
    - **Given:** a container too small for the 216 floor
    - **When:** `layoutFor` runs
    - **Then:** the board shrinks below the floor but stays valid (no NaN/clamp-to-0) — the AC-1 "re-run" path
  - `[P0] layout exports the AC-1 floor surface` — `tests/api/…gateway.spec.ts:66`
    - **Given:** the shipped layout provider module
    - **When:** its public surface is inspected
    - **Then:** `BOARD_SIZE_FLOOR` + `layoutFor` exist and the floor is 216
  - `[P0] layout gateway: landscape phone keeps board >= floor` — `tests/api/…gateway.spec.ts:97`
    - **Given:** the typical landscape phone window (844×390 fixture)
    - **When:** `layoutFor` runs through the gateway
    - **Then:** the board stays ≥ floor and reports landscape
  - `[P0] journey: rotate to landscape -> floor holds -> every tier legible` — `tests/e2e/…umbrella.spec.ts:53`
    - **Given:** a portrait phone rotated to the landscape window
    - **When:** layout → tile width → numeral size + ink run end to end
    - **Then:** tiles stay ≥ ~44pt and every digit tier resolves a legible fitting size
  - `[P1] journey: cramped container -> sub-floor board -> scaling fallback` — `tests/e2e/…umbrella.spec.ts:117`
    - **Given:** a container too small for the 216 floor
    - **When:** layout shrinks below the floor and numerals re-run the check
    - **Then:** every tier still resolves a finite-positive largest-fitting size
  - Layout golden anchors (`BOARD_SIZE_FLOOR===216`, landscape ≥ floor, degenerate sub-floor valid) — `triade/__tests__/ui/layout.test.ts` (T2.3 anchors, green in the 37/37 run)

---

#### AC-2: 13pt/9pt numerals only where they fit, else the check re-runs (scaling path) (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `[P0] numeralFits returns false…` — `triade/__tests__/ui/tileNumerals.test.ts:78`
    - **Given:** 6-digit at 20pt / 4-digit at 10pt
    - **When:** `numeralFits` runs
    - **Then:** false (token does not fit — re-run required)
  - `[P0] numeralFits returns true…` — `triade/__tests__/ui/tileNumerals.test.ts:88`
    - **Given:** 2-digit at 44pt / 3-digit at 80pt
    - **When:** `numeralFits` runs
    - **Then:** true (token fits — no gratuitous down-scaling)
  - `[P0] numeralSizeFor returns token fontSize when numeralFits is true` — `triade/__tests__/ui/tileNumerals.test.ts:100`
    - **Given:** 3-digit on a normal tile
    - **When:** `numeralSizeFor(99, 80)` runs
    - **Then:** exactly the 32pt token (no sub-token scaling)
  - `[P0] numeralSizeFor gates on numeralFits (review regression, working-tree change)` — `triade/__tests__/ui/tileNumerals.test.ts:109`
    - **Given:** `numeralFits(1000, 30)===true` (13·0.55·4 = 28.6 ≤ 29.5)
    - **When:** `numeralSizeFor(1000, 30)` runs
    - **Then:** exactly the 13pt token — pins the `507c5ea` fix that replaced the legacy proportional heuristic gate with `numeralFits`
  - `[P0] numeralSizeFor returns scaled-down size when token does not fit` — `triade/__tests__/ui/tileNumerals.test.ts:120`
    - **Given:** 4-digit on a 25pt tile
    - **When:** the size check re-runs
    - **Then:** a scaled size < 13pt (the AC-2 re-run behavior)
  - `[P0] estimator fit table holds both directions` — `tests/unit/…atdd.test.ts:76` (FITS_TRUE/FITS_FALSE tables, no estimator drift)
  - `[P1] estimator is monotone` + `[P1] scaled sizes never exceed their bucket token` — `tests/unit/…atdd.test.ts:171,187` (no fit-gate inversion; `min(token, scaled)`)
  - `[P0] gateway round-trip: token -> fits -> size agrees at the floor` — `tests/api/…gateway.spec.ts:75` (1000→13 fitting, 100000→9 fitting)
  - `[P0] journey: 3-digit scaling re-run at the derived tile never clips` — `tests/e2e/…umbrella.spec.ts:82` (512 at the derived ~47pt tile scales below 32pt without clipping)

---

#### AC-3: 9pt 6-digit tier (`1536`/`3072+`) legible at the smallest landscape tile (P0)

- **Coverage:** FULL ✅ (analytic estimator proof; real Skia render proof is the owed T3.2 manual check — R-001)
- **Tests:**
  - `[P0] numeralSizeFor never returns size smaller than 9pt floor at MIN_TILE_WIDTH` — `triade/__tests__/ui/tileNumerals.test.ts:133`
    - **Given:** 1536 / 3072 at the 44pt floor tile
    - **When:** `numeralSizeFor` runs
    - **Then:** ≥ 9pt (the explicit risk point holds)
  - `[P0] 6-digit risk point at MIN_TILE_WIDTH never clips the inset budget (working-tree change)` — `triade/__tests__/ui/tileNumerals.test.ts:219`
    - **Given:** 6-digit values at the 44pt floor
    - **When:** `numeralSizeFor` runs (pins the `507c5ea` regression test)
    - **Then:** size ≥ 9pt AND `size·0.55·digits ≤ 44 − FIT_INSET_FACTOR` (never clips the inset budget)
  - `[P1] FIT_INSET_FACTOR is pinned and documented` — `triade/__tests__/ui/tileNumerals.test.ts:146` (positive, ≤ 1)
  - `[P1] numeralSizeFor returns largest fitting size when even 9pt would clip` — `triade/__tests__/ui/tileNumerals.test.ts:238` (tiny tile → finite-positive, AC-3 edge)
  - `[P0] risk point never clips the inset budget at the floor` — `tests/unit/…atdd.test.ts:88` (RISK_POINT_VALUES sweep: 1536/3072/100000/153600/999999)
  - `[P1] zero/negative tile widths return the finite-positive guard` — `tests/unit/…atdd.test.ts:140` (R-006: 0/−1/−44 → finite-positive, never NaN)
  - `[P0] journey: smallest landscape tile keeps token tiers…` — `tests/e2e/…umbrella.spec.ts:94` (44pt tile: 1–2 digit → 32, 4–5 → 13, 6+ → 9 exactly; 3-digit scales cleanly)
- **Gaps:** none in automation. Residual: estimator is ~10% optimistic for 6-digit Helvetica-bold below the 44pt floor (accepted by design — sub-44pt illegible-by-design); real-render proof awaits T3.2.
- **Recommendation:** no new tests. Operator runs the 2 `operator_actions` (rotate to landscape; confirm 32/13/9pt tiers legible at the smallest tile with no clipping), then 1.7 closes.

---

#### AC-4: Fixed numerals legible at the largest accessibility text setting (Dynamic Type exception) (P1)

- **Coverage:** NONE ⚠️ — manual-only by design (UX-DR-18 deliberate exception; Skia-rendered numerals sit outside `UIFontMetrics`, so no `node --test` can prove it)
- **Tests:** none automated (correct — automating this would test a mock, not the render).
  - Tracking test: `[P1][MANUAL] T3.2 operator session` — `tests/e2e/…umbrella.spec.ts:142` documents the gate (max-Dynamic-Type legibility bundled into the T3.2 session; asserts only the analytic precondition).
- **Gaps:**
  - Missing: operator evidence for max-text-size legibility (bundles with T3.2).
- **Recommendation:** no automated test (`*atdd` not applicable — there is no host-observable contract). Run the manual check in the T3.2 session and record evidence in the story completion note. Priority LOW as a standalone gap (bundled cost ~0 with T3.2).

---

#### INK: Renderer ↔ module ink single-source (T2.1, E9 canonical) (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `[P0] tileInkFor returns dark/light ink per DESIGN tiers` + `[P0] 1536/3072 dark (incandescent)` — `triade/__tests__/ui/tileNumerals.test.ts:155,166,177` (E9 canonical `#1C1206`/`#F6F0E1`; do NOT revert to story-time 2-tier hexes)
  - `[P1] tileInkFor returns non-empty string for all tiers` — `triade/__tests__/ui/tileNumerals.test.ts:185`
  - `[P0] E9 canonical ink table holds for all 13 tiers + 3072 cap` + `[P0] superseded story-time hexes never return` — `tests/unit/…atdd.test.ts:102,111` (R-004 tripwire)
  - `[P2] every canonical tier holds WCAG AA (fill vs ink ≥ 4.5)` + `[P2] theme-aware wrappers delegate to THEMES` — `tests/unit/…atdd.test.ts:239,248`
  - `[P0] ink gateway: dark/light boundary incl. incandescent` — `tests/api/…gateway.spec.ts:87`
  - `[P1] GameBoard sizes fonts via numeralSizeFor + inks via tileInkFor` — `tests/api/…gateway.spec.ts:112` (static single-source scan: no hardcoded ink literals in `GameBoard.tsx`)
  - `[P1] layout imports the floor from tileNumerals` + `[P1] purity gateway (no RN/React/Skia/Expo imports)` — `tests/api/…gateway.spec.ts:120,133`
  - Umbrella journey asserts per-leg ink (`tests/e2e/…umbrella.spec.ts:67-79`); `ui.purity.test.ts` scans `tileNumerals.ts` (green in the 37/37 run)

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌

0 gaps found. All P0 oracle items are FULL at the analytic level; both suites green.

---

#### High Priority Gaps (PR BLOCKER) ⚠️

0 automation gaps. 1 owed human-only gate (tracked, not a code gap):

1. **AC-4 + AC-3 render proof: T3.2 manual simulator/device session** (P1)
   - Current Coverage: NONE (AC-4) / FULL-analytic (AC-3)
   - Missing Tests: operator rotation check (32/13/9pt tiers legible at the smallest landscape tile; tiles ≥ ~44pt; no clipping; max-Dynamic-Type legibility)
   - Recommend: human session per story `operator_actions` (no test ID — not automatable)
   - Impact: R-001 (score 6) stays open until recorded; shipping without it risks an unseen render-level clip of the 9pt tier. Mitigated by the conservative analytic pins; session cost ~1–2h.

---

#### Medium Priority Gaps (Nightly) ⚠️

0 gaps found.

---

#### Low Priority Gaps (Optional) ℹ️

0 gaps found. (Future bundled-font story must re-run R-001/R-002 validation and recalibrate `ESTIMATED_WIDTH_FACTOR` — noted as a review gate, not a current gap.)

---

### Coverage Heuristics Findings

#### Endpoint Coverage Gaps

- N/A — pure-TS seam, no network endpoints. Gateway specs cover the module public surface (`TILE_NUMERAL_TOKENS`, `MIN_TILE_WIDTH`, `FIT_INSET_FACTOR`, all six functions + theme wrappers).

#### Auth/Authz Negative-Path Gaps

- N/A — offline, no auth in the numeral path.

#### Happy-Path-Only Criteria

- None. Error/edge paths covered: tiny-tile fallback, non-finite guards (NaN/Infinity → token size), zero/negative widths (finite-positive `1`), degenerate containers (valid sub-floor board), 7-digit overflow (stays in 6+ bucket), non-canonical values (0/negatives/fractions resolve without throwing).

---

### Quality Assessment

#### Tests with Issues

**BLOCKER Issues** ❌

- None.

**WARNING Issues** ⚠️

- None. (Umbrella spec models journeys analytically because the RN Skia board has no Playwright harness and render pixels are a manual gate per project rules — documented in the file header, not a quality defect.)

**INFO Issues** ℹ️

- `atdd-1-7-numeral-legibility.red.test.ts` (11 skipped RED-phase scaffolds) is superseded by the shipped contract suites — informational; retained as the ATDD red-phase record, not a defect.

---

#### Tests Passing Quality Gates

**69/69 executed tests (100%) meet quality criteria** ✅ — 37/37 committed contract (`tileNumerals` + `layout` + `ui.purity`, run from `triade/`) + 32/32 TEA artifact suites (unit/api/e2e, run from repo root). `tsc --noEmit` clean (verified via the automate run; no production files changed since).

---

### Duplicate Coverage Analysis

#### Acceptable Overlap (Defense in Depth)

- AC-3 risk point pinned at committed-unit (analytic floor) AND TEA-unit (RISK_POINT_VALUES sweep) AND umbrella-journey (end-to-end tile derivation) ✅ — justified: the explicit risk point warrants the tripwire at every level.
- Ink boundary pinned at committed-unit AND TEA-unit AND gateway-static-scan ✅ — justified: the E9-deferred contrast divergence is a one-literal regression away; the static scan is the cheap guard.
- `numeralFits(1000,30)/numeralSizeFor(1000,30)` review regression pinned in the committed suite (working-tree change) and mirrored in the TEA fit tables ✅ — justified: pins the exact `507c5ea` fix.

#### Unacceptable Duplication ⚠️

- None. Umbrella journeys cover critical happy-path composition only (no per-bucket re-pins beyond the journey legs); edge paths live exclusively at unit level per selective-testing.

---

### Coverage by Test Level

| Test Level | Tests  | Criteria Covered | Coverage % |
| ---------- | ------ | ---------------- | ---------- |
| E2E (journey-composition, host-analytic) | 5 (4 auto + 1 manual gate doc) | 4/5 (AC-1, AC-2, AC-3, INK) | 80% |
| API (gateway contract) | 10 | 4/5 (AC-1, AC-2, AC-3, INK) | 80% |
| Component | 0 | — | — |
| Unit | 35 (18 committed incl. 2 working-tree regressions + 17 TEA artifact; layout/purity anchors ride in the 37/37 committed run) | 4/5 | 80% |
| **Total** | **69 executed** | **4/5 FULL** | **80%** |

AC-4 is manual-only by design at every level — counted once in the oracle, not once per level.

---

### Traceability Recommendations

#### Immediate Actions (Before Closing 1.7)

1. **Run the T3.2 operator session** — Rotate simulator/device to landscape; confirm 32/13/9pt tiers legible at the smallest tile, tiles ≥ ~44pt, no clipping, max-Dynamic-Type legibility (AC-4). Record evidence in the story completion note; flip story to done. Owner: Eduardo. Cost ~1–2h.

#### Short-term Actions (This Milestone)

1. **Keep renderer↔module agreement as a review gate** — Any edit to `GameBoard.tsx` ink/font sizing or `layoutFor` must keep the gateway static scans green; never re-pin the superseded story-time 2-tier hexes (`#3a2f1d`/`#fff8e8`).

#### Long-term Actions (Backlog)

1. **Bundled geometric-sans font story must re-run R-001/R-002 validation** — Recalibrate `ESTIMATED_WIDTH_FACTOR` with measured numbers; AC-3 pins may need updating.

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

---

### Evidence Summary

#### Test Execution Results

- **Total Tests**: 69 executed (37 committed + 32 TEA artifact)
- **Passed**: 69 (100%)
- **Failed**: 0 (0%)
- **Skipped**: 0 executed-skipped (11 ATDD red-phase scaffolds dormant by convention, not counted)
- **Duration**: ~0.4s total (host-only suites)

**Priority Breakdown:**

- **P0 Tests**: all P0 blocks green (12/12 unit pins per test-design + gateway P0 + journey P0) ✅
- **P1 Tests**: automated P1 green; 1 manual (T3.2) owed ⚠️
- **P2 Tests**: green (contrast tripwire, theme seam) — informational
- **P3 Tests**: n/a — informational

**Overall Pass Rate**: 100% ✅ (of automatable tests)

**Test Results Source**: local runs this session (2026-09-06): `tsx --test` on the three TEA suites (32/32) + `tsx --test` on committed `tileNumerals`/`layout`/`ui.purity` from `triade/` (37/37)

---

#### Coverage Summary (from Phase 1)

**Requirements Coverage:**

- **P0 Acceptance Criteria**: 4/4 covered (100%) ✅
- **P1 Acceptance Criteria**: 0/1 automated (manual-only by design; owed) ⚠️
- **Overall Coverage**: 80% (4/5 FULL)

**Code Coverage** (if available):

- Not instrumented — N/A (pure arithmetic module; contract pins serve as the coverage proxy).

**Coverage Source**: this matrix + `coverage-matrix-1-7-legibilidade-dos-numerais-em-landscape.json`

---

#### Non-Functional Requirements (NFRs)

**Security**: NOT_ASSESSED ✅ (no surface — offline, no auth/data/backend in the numeral path)

**Performance**: PASS ✅ (pure arithmetic, no allocation/logging/font engine; full `npm test` ~5s)

**Reliability**: PASS ✅ (finite-positive guarantees pinned for degenerate/non-finite inputs; layout never NaN)

**Maintainability**: PASS ✅ (`tsc` clean; purity guard scans `tileNumerals.ts`; estimator factor extracted + documented)

**NFR Source**: test-design NFR table (no separate `nfr-assessment.md` for this story — thresholds captured at design time)

---

#### Flakiness Validation

**Burn-in Results**: not run (deterministic pure functions — same input → same output pinned by test; no async/timing surface).

- **Burn-in Iterations**: n/a
- **Flaky Tests Detected**: 0 ✅
- **Stability Score**: 100% (by construction — no randomness, no I/O, no waits)

**Burn-in Source**: not_available (not applicable to this seam)

---

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion             | Threshold | Actual | Status   |
| --------------------- | --------- | ------ | -------- |
| P0 Coverage           | 100%      | 100%   | ✅ PASS  |
| P0 Test Pass Rate     | 100%      | 100%   | ✅ PASS  |
| Security Issues       | 0         | 0      | ✅ PASS  |
| Critical NFR Failures | 0         | 0      | ✅ PASS  |
| Flaky Tests           | 0         | 0      | ✅ PASS  |

**P0 Evaluation**: ✅ ALL PASS

---

#### P1 Criteria (Required for PASS, May Accept for CONCERNS)

| Criterion              | Threshold | Actual | Status      |
| ---------------------- | --------- | ------ | ----------- |
| P1 Coverage            | ≥90%      | 0% auto (1/1 manual-owed by design) | ⚠️ CONCERNS |
| P1 Test Pass Rate      | ≥95%      | 100% of automatable; 1 manual owed  | ⚠️ CONCERNS |
| Overall Test Pass Rate | ≥95%      | 100%   | ✅ PASS     |
| Overall Coverage       | ≥80%      | 80%    | ✅ PASS     |

**P1 Evaluation**: ⚠️ SOME CONCERNS (single cause: the human-only T3.2 gate, which is informative per project rules and never a PR gate)

---

#### P2/P3 Criteria (Informational, Don't Block)

| Criterion         | Actual | Notes                  |
| ----------------- | ------ | ---------------------- |
| P2 Test Pass Rate | 100%   | Tracked, doesn't block |
| P3 Test Pass Rate | n/a    | Tracked, doesn't block |

---

### GATE DECISION: CONCERNS

---

### Rationale

All P0 criteria met with 100% analytic coverage and 100% pass rates (69/69 green, `tsc` clean). The
working-tree change set (`507c5ea` guards + 2 regression tests) is pinned to AC-2/AC-3 by name. No
security, NFR, or flakiness signals. The sole concern is the human-only T3.2 simulator/device session
(R-001, score 6): the 9pt 6-digit tier's real Skia render and the AC-4 max-Dynamic-Type exception cannot
be proven by `node --test` by design, and the story correctly stays `awaiting-operator` until the
operator records evidence. Per project rules this gate is informative, never a merge blocker — hence
CONCERNS (deploy/merge with the operator session as the tracked follow-up), not FAIL. No waiver needed
or recommended: the session is cheap (~1–2h) and already assigned.

---

#### Residual Risks (For CONCERNS or WAIVED)

1. **R-001: Real Skia render legibility unproven**
   - **Priority**: P1
   - **Probability**: Low (analytic pins conservative at the floor)
   - **Impact**: High (unreadable 6-digit tiles in landscape)
   - **Risk Score**: 6
   - **Mitigation**: T3.2 operator session (rotate to landscape; confirm 32/13/9pt tiers at the smallest tile)
   - **Remediation**: record evidence in the story completion note; flip story to done

2. **R-002: Estimator ~10% optimistic sub-floor (by design)**
   - **Priority**: P2
   - **Probability**: Low
   - **Impact**: Medium
   - **Risk Score**: 4
   - **Mitigation**: accepted by design (sub-44pt illegible-by-design); scaling fallback guarantees no-clip
   - **Remediation**: re-validate on any estimator/floor change

**Overall Residual Risk**: LOW (automation half complete; manual half bounded and assigned)

---

#### Critical Issues (For FAIL or CONCERNS)

| Priority | Issue | Description | Owner | Due Date | Status |
| -------- | ----- | ----------- | ----- | -------- | ------ |
| P1 | T3.2 manual session owed | Simulator/device rotation + legibility evidence unrecorded | Eduardo | Before closing 1.7 | OPEN |

**Blocking Issues Count**: 0 P0 blockers, 1 P1 tracked item (non-blocking per project rules)

---

### Gate Recommendations

#### For CONCERNS Decision ⚠️

1. **Merge/deploy with the tracked follow-up**
   - Automation is fully green; no code action required.
   - Keep story `awaiting-operator` until T3.2 evidence is recorded (do not flip to done on analytic evidence alone).

2. **Create Remediation Backlog**
   - Single item: "T3.2 operator session for 1.7" (Priority: P1, owner Eduardo, due before closing 1.7).

3. **Post-Deployment Actions**
   - On the bundled-font story: re-run R-001/R-002 validation; recalibrate `ESTIMATED_WIDTH_FACTOR`.
   - Re-run this trace (`*trace`) after T3.2 — expected decision: PASS.

---

### Next Steps

**Immediate Actions** (next 24-48 hours):

1. Operator runs the T3.2 session and records evidence in the story completion note.
2. Re-run `*trace` for 1.7 → expected PASS → story to done.

**Follow-up Actions** (next milestone/release):

1. Bundled-font story carries the R-001/R-002 re-validation gate.
2. Keep the gateway static scans as review gates on `GameBoard`/`layoutFor` edits.

**Stakeholder Communication**:

- Notify PM: 1.7 analytic coverage 100% P0, gate CONCERNS pending a ~1–2h manual simulator check.
- Notify DEV lead: no code action; working-tree guards pinned by regression tests.

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  # Phase 1: Traceability
  traceability:
    story_id: "1-7-legibilidade-dos-numerais-em-landscape"
    date: "2026-09-06"
    coverage:
      overall: 80%
      p0: 100%
      p1: 0%
      p2: 100%
      p3: 100%
    gaps:
      critical: 0
      high: 0
      medium: 0
      low: 0
    quality:
      passing_tests: 69
      total_tests: 69
      blocker_issues: 0
      warning_issues: 0
    recommendations:
      - "Run the T3.2 operator session (rotate to landscape; confirm tiers legible; record evidence)"
      - "Keep renderer-module agreement as a review gate on GameBoard/layoutFor edits"

  # Phase 2: Gate Decision
  gate_decision:
    decision: "CONCERNS"
    gate_type: "story"
    decision_mode: "deterministic"
    criteria:
      p0_coverage: 100%
      p0_pass_rate: 100%
      p1_coverage: 0%
      p1_pass_rate: 100%
      overall_pass_rate: 100%
      overall_coverage: 80%
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
      test_results: "local tsx --test 2026-09-06: TEA suites 32/32 + committed contract 37/37"
      traceability: "_bmad-output/test-artifacts/traceability/traceability-matrix-1-7-legibilidade-dos-numerais-em-landscape.md"
      nfr_assessment: "test-design NFR table (no separate nfr-assessment.md; no SEC surface)"
      code_coverage: "n/a (contract pins serve as proxy)"
    next_steps: "Operator T3.2 session, then re-trace for PASS"
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md`
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-1-7-legibilidade-dos-numerais-em-landscape.md`
- **Coverage Matrix:** `_bmad-output/test-artifacts/coverage-matrix-1-7-legibilidade-dos-numerais-em-landscape.json`
- **Automation Summary:** `_bmad-output/test-artifacts/automation-summary-1-7-legibilidade-dos-numerais-em-landscape.md`
- **Test Results:** local runs 2026-09-06 (TEA 32/32; committed 37/37; `tsc` clean per automate run)
- **Working-tree change commit:** `507c5ea` (tileNumerals guards + 2 regression tests)
- **Test Files:** `triade/__tests__/ui/tileNumerals.test.ts`, `triade/__tests__/ui/layout.test.ts`, `triade/__tests__/ui/ui.purity.test.ts`, `_bmad-output/test-artifacts/tests/{unit,api,e2e}/1-7-*.ts`, fixtures `…/fixtures/1-7-legibilidade-dos-numerais-em-landscape-fixtures.ts`

---

## Sign-Off

**Phase 1 - Traceability Assessment:**

- Overall Coverage: 80%
- P0 Coverage: 100% ✅ PASS
- P1 Coverage: 0% auto (1/1 manual-owed by design) ⚠️ CONCERNS
- Critical Gaps: 0
- High Priority Gaps: 0 (1 tracked manual gate, non-blocking)

**Phase 2 - Gate Decision:**

- **Decision**: CONCERNS ⚠️
- **P0 Evaluation**: ✅ ALL PASS
- **P1 Evaluation**: ⚠️ SOME CONCERNS (T3.2 human-only gate owed)

**Overall Status:** CONCERNS ⚠️ — merge-safe; close to PASS on T3.2 evidence.

**Next Steps:**

- If PASS ✅: Proceed to deployment
- If CONCERNS ⚠️: Deploy with monitoring, create remediation backlog
- If FAIL ❌: Block deployment, fix critical issues, re-run workflow
- If WAIVED 🔓: Deploy with business approval and aggressive monitoring

**Generated:** 2026-09-06
**Workflow:** testarch-trace v5.0 (step-file architecture)

---

<!-- Powered by BMAD-CORE™ -->
