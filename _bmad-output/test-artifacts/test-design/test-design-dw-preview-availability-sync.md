---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-06'
---

# Test Design: dw-preview-availability-sync - Preview availability sync with POT_LADDER_DELAY=2

**Date:** 2026-09-06
**Author:** Eduardo
**Status:** Approved
**Mode:** Epic-Level (Phase 4)

---

## Executive Summary

**Scope:** Epic-level test design for the `dw-preview-availability-sync` bundle (DW-114): a
**test-only** sync of stale AC4/AC5 expectations in
`triade/__tests__/integration/preview-availability.integration.test.ts` to the intended
`POT_LADDER_DELAY=2` ladder. No production file was changed (commit `1617827` touches only the
integration test; working-tree edits are spec/deferred-work bookkeeping).

**Risk Summary:**

- Total risks identified: 7
- High-priority risks (≥6): 1 (R-002, residual — mitigation proposed, not implemented in this bundle)
- Critical categories: TECH (test-code integrity)

**Coverage Summary:**

- P0 scenarios: 6 tests in the target integration file (~0.5–1 hour re-verification)
- P1 scenarios: intent anchor + full triade suite regression gate (~1–2 hours)
- P2/P3 scenarios: 6 proposed follow-ups, none implemented here (~4–10 hours if ever scheduled)
- **Total effort**: ~5.5–13 hours (~1–2 days) if all follow-ups were scheduled; **re-verification of
  this bundle itself is ~0.5–1 hour**

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| Production mapping (`pot.ts`, `ceiling.ts`, `preview.ts`, `App.tsx` wiring) | Explicit spec boundary; delay-2 is PO-confirmed intent | Pinned independently by `ladder-ceiling-chain.atdd.test.ts` (P1) |
| Device / gesture / pixel validation | Project rule: CI covers pure logic, device covers gesture/pixel, never the inverse; preview is chrome, not board | No E2E proposed; device suites untouched |
| Monetization, ads, IAP, persistence, a11y, telemetry | No shared code path with this change (test-only, engine/game boundary) | Interworking table below names the only adjacent suites that must stay green |
| The 15 review-pass hardening gaps rejected in the spec triage log | Pre-existing, outside this bundle's scope, recorded by the spec's own review | Carried as P2/P3 follow-ups where test-relevant; the rest remain spec-level notes |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-002 | TECH | AC4 assertions are conditional (`if (preview.kind === 'range')`): if `previewFor` ever returns `exact` for these inputs, the test passes vacuously and the widening-slice regression goes unwitnessed | 3 | 2 | 6 | P2 follow-up T-P2-1: assert `kind === 'range'` strictly before asserting values (3 sites in AC4; same pattern audit in AC1) | Dev | Next hardening pass |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-001 | TECH | Ladder expectations are inlined in the test (`[3]`, `[3,6]`, ...), duplicating `pot.ts` math; a future `POT_LADDER_DELAY` change breaks the test opaquely, or invites another silent "sync" without PO confirmation | 2 | 2 | 4 | P2 follow-up T-P2-4: derive expected sets from `potForTier` in a comment-adjacent assertion or pin the delay constant explicitly; require PO sign-off note on any future expectation sync | Dev |
| R-003 | BUS | Tiers 0–2 collapse to `[3]`: ceilings 48/96 no longer widen the preview, reducing early-game preview information vs the pre-delay ladder | 1 | 3 | 3 | Accepted: PO-requested behavior (2026-09-04), pinned by independent ATDD chain test; re-raise only if product revisits the delay | Product owner |
| R-004 | TECH | AC1/AC2/AC7 ceiling sets are frozen at `[24, 48, 96, 192]` — below the delay-2 unlock points — so containment, fixed-prefix, and exact-path behavior above 384 is unwitnessed by those ACs | 2 | 2 | 4 | P2 follow-up T-P2-2: extend ceiling sets to include 384/768 for AC1/AC2/AC7 | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-005 | OPS | DW-114 bookkeeping in the working tree (spec `done` + deferred-work `done`) is uncommitted on `feat/epic-10-telemetria`; a dropped stash or session end loses the ledger state, and the spec's own `Never: Do not edit the deferred-work ledger` boundary sits uneasily with the ledger edit | 2 | 1 | 2 | Monitor: commit or reconcile before session close; orchestrator owns `sprint-status.yaml` (untouched) |
| R-006 | TECH | Ladder behavior above ceiling 768 (up to `MAX_POT_TIER=30`) has no pin in this file | 2 | 1 | 2 | Monitor: P2 follow-up T-P2-3 if high-tier preview breadth ever becomes product-relevant |
| R-007 | TECH | `boardWithCeiling` uses synthetic filler (`2`s + one max cell); `ceilingDetector` behavior on realistic mid-game boards is not exercised here | 1 | 2 | 2 | Monitor: realistic-board fixture is P3 exploratory; unit coverage of `ceilingDetector` owns this |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

No SEC, PERF, or DATA risks apply: this bundle changes no auth surface, no hot path, no
persistence. No score-9 risk exists; nothing blocks the gate.

---

## NFR Planning

**Purpose:** Epic-specific NFR thresholds and planned validation. This is planning, not an evidence
audit (no `nfr-assess` verdicts).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| Reliability | Target integration file 6/6 green; full triade suite 0 failures (engine 26-test PR gate per project-context) | R-002, R-004 | `npm test -- __tests__/integration/preview-availability.integration.test.ts` + full `npm test` in triade | CI run output (already observed: 1438 tests, 1012 pass, 0 fail, 426 skipped) |
| Maintainability | Test expectations must not silently encode production math without an intent anchor | R-001 | Review check: every future expectation sync cites the PO decision + ATDD pin | Spec intent-contract + `ladder-ceiling-chain.atdd.test.ts` |
| Performance | No threshold applies (pure functions, no hot-path change, no production code touched) | — | None | N/A |
| Security | No threshold applies (no auth, no I/O, no secret surface) | — | None | N/A |

**Unknown thresholds:** none — no NFR in scope lacks a threshold, because no PERF/SEC NFR is in
scope for a test-only sync. No values invented.

---

## Entry Criteria

- [x] Requirements agreed (spec intent-contract with Always/Block-If/Never boundaries)
- [x] Delay-2 intent confirmed by product owner (2026-09-04) and independently pinned by ATDD chain test
- [x] Test environment available (`triade/`, `node:test`, no device needed)
- [x] Production code frozen for this bundle (only the integration test modified — verified in `1617827` diff)

## Exit Criteria

- [x] All 6 tests in `preview-availability.integration.test.ts` passing
- [x] Full triade suite green with 0 failures
- [x] `git diff` of the code change contains only the integration test file (production untouched)
- [ ] R-002 mitigation (T-P2-1) scheduled or explicitly deferred with owner sign-off (residual HIGH risk)

## Project Team

| Name | Role | Testing Responsibilities |
| ---- | ---- | ------------------------ |
| Eduardo | Dev / Product owner | Owns delay-2 intent decision; signs off on future expectation syncs |

---

## Test Coverage Plan

Note: P0/P1/P2/P3 denote **priority/risk**, not execution timing. Execution timing is defined once,
in Execution Strategy below.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk + No workaround. Here: FR-43 live-ceiling wiring is the
pinned contract; a red file means the wiring regressed or the intent anchor drifted.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| AC5: availability set derived from live board ceiling (24→[3], 48→[3], 96→[3], 192→[3,6], 384→[3,6,12], 768→[3,6,12,24]) | Integration (node:test, engine+game boundary) | R-001, R-003 | 1 | Dev | The synced assertions; core pin of this bundle |
| AC3: low ceiling collapses value 3 to `[3]` | Integration | R-003 | 1 | Dev | Unchanged by the sync; collapse semantics intact |
| AC4: rising ceiling widens range as contiguous slice from value (192/384/768 slices) | Integration | R-002 | 1 | Dev | Synced slices; weakened by conditional assertions (residual R-002) |
| AC2: values 1/2 render `[1,2]` independent of ceiling | Integration | R-004 | 1 | Dev | Unchanged; ceiling set frozen below unlock points |
| AC1: live-ceiling wiring always contains the truth (8 values × 4 ceilings) | Integration | R-004 | 1 | Dev | Unchanged; containment net over the wiring |
| AC7: exact path (`displayRoll < 0.6`) ignores availability | Integration | R-004 | 1 | Dev | Unchanged; guards the `previewFor` branch unaffected by the ladder |

**Total P0**: 6 tests, already implemented and green.

### P1 (High)

**Criteria**: Important features + Medium risk + Common workflows.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Delay-2 intent anchor: `ladder-ceiling-chain.atdd.test.ts` pins PO-requested mapping | Integration (ATDD) | R-001, R-003 | existing file | Dev | The independent witness that makes this sync legitimate rather than circular |
| Full triade suite regression (0 failures) incl. the 26-test engine PR gate | Unit + Integration | R-002, R-004 | ~1012 active | Dev | Observed green at sync time; rerun on any follow-up |

**Total P1**: 2 suites (anchor file + full regression).

### P2 (Medium)

**Criteria**: Secondary hardening + Low/medium risk. Proposed follow-ups — **none implemented in this
bundle** (test design proposes; scheduling is the orchestrator's call).

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| T-P2-1: strict `kind === 'range'` assertions in AC4 (3 sites) + audit AC1's conditional pattern | Integration | R-002 | ~2 modified tests | Dev | Converts the residual HIGH risk into a hard pin |
| T-P2-2: extend AC1/AC2/AC7 ceiling sets to 384/768 | Integration | R-004 | ~3 modified tests | Dev | Witnesses containment/prefix/exact behavior above unlock points |
| T-P2-3: pin ladder progression above 768 (e.g. 1536) | Unit (`potForTier`) | R-006 | ~1 | Dev | Only if high-tier breadth becomes product-relevant |
| T-P2-4: pin `POT_LADDER_DELAY` explicitly / derive expectations from `potForTier` | Unit + Integration | R-001 | ~1 | Dev | Makes the next delay change fail loudly with intent context |

**Total P2**: 4 proposed follow-ups.

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory.

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| displayRoll boundary distance (exact vs range threshold) | Unit | ~1–2 | Dev | From spec triage rejects; boundary proximity unpinned |
| WINDOW_MAX head-cap and tail-slice pins | Unit | ~1–2 | Dev | From spec triage rejects |
| Realistic mid-game board fixture for `boardWithCeiling` | Integration | ~1 | Dev | Addresses R-007 if ever prioritized |

**Total P3**: 3 exploratory items.

Duplicate-coverage guard: ladder math is owned at unit/ATDD level (`potForTier`, chain test); this
file owns only the **live-ceiling derivation boundary** (`previewForBoard` wiring). No E2E/device
layer duplicates anything here.

---

## Execution Order

- [ ] Target file: `npm test -- __tests__/integration/preview-availability.integration.test.ts` (<1 min)
- [ ] Intent anchor: `ladder-ceiling-chain.atdd.test.ts` (<1 min)
- [ ] Full triade suite incl. 26-test engine gate (<15 min, PR job)

**Total**: 3 steps, all PR-eligible.

---

## Execution Strategy

Philosophy: run everything in PRs (<15 min with parallel runners); defer only what is
expensive/long-running. This bundle has nothing expensive: pure functions, no browser, no device,
no network.

- **Every PR**: target integration file + ATDD anchor + full triade suite (engine 26-test gate is
  blocking per project-context).
- **Nightly/Weekly**: nothing required by this bundle (no perf, chaos, or long-running suites touch
  the ladder mapping).
- **Never as PR gate**: device/gesture/pixel suites (project rule — device never gates PRs).

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | 6 (existing, re-verify) | — | ~0.5–1 | Rerun + diff inspection; no authoring needed |
| P1 | 2 suites (existing) | — | ~1–2 | Anchor rerun + full-suite regression |
| P2 | 4 proposed | ~1–2 | ~4–8 | Only if scheduled; strict assertions are the dearest item |
| P3 | 3 exploratory | ~0.5–1 | ~1–2 | Only if scheduled |
| **Total** | **—** | **—** | **~5.5–13** | **~1–2 days if everything scheduled; bundle re-verification alone is ~0.5–1 hour** |

### Prerequisites

**Test Data:**

- `boardWithCeiling(max)` synthetic-board helper (in-file, no factory needed)
- `pending(value, displayRoll)` helper (in-file)

**Tooling:**

- `node:test` + `node:assert` (existing; no new tooling)
- `git diff` for the production-untouched invariant

**Environment:**

- `triade/` workspace with Node ^20.19.4
- No device, no staging, no seed data

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (6/6 in the target file — no exceptions)
- **P1 pass rate**: ≥95%, with the anchor file at 100% and the full suite at 0 failures
- **High-risk mitigations**: R-002 mitigation (T-P2-1) scheduled or formally deferred — gate is
  CONCERNS until then, not FAIL (test-only change, suite green, intent anchored)

### Coverage Targets

- **Critical paths**: FR-43 live-ceiling wiring 100% (all 6 ACs have tests)
- **Business logic**: ladder mapping owned by ATDD anchor; no gap introduced by this bundle
- **Edge cases**: ≥50% (tier edges and above-768 coverage are the known, accepted gaps — R-004/R-006)

### Non-Negotiable Requirements

- [x] All P0 tests pass
- [x] No production file modified (`git diff` shows only the integration test)
- [x] Delay-2 intent anchored outside the changed file (ATDD chain test)
- [ ] R-002 residual HIGH risk tracked (scheduled or deferred with sign-off)
- [x] Planned NFR evidence exists (green-suite CI output); full `nfr-assess` verdicts not applicable

---

## Mitigation Plans

### R-002: Vacuous AC4 conditional assertions (Score: 6)

**Mitigation Strategy:**

1. Replace the three `if (preview.kind === 'range')` guards in the AC4 test with strict
   `assert.strictEqual(preview.kind, 'range')` followed by unconditional value assertions.
2. Audit AC1's identical conditional pattern for the same treatment.
3. Rerun target file + full suite; confirm green.

**Owner:** Dev
**Timeline:** next hardening pass
**Status:** Planned (not implemented in this bundle)
**Verification:** AC4 fails loudly if `previewFor` ever returns `exact` for widening inputs.

---

## Assumptions and Dependencies

### Assumptions

1. `POT_LADDER_DELAY=2` remains product-owner intent (decision 2026-09-04); any change requires a
   new PO decision, not another silent test sync.
2. `ladder-ceiling-chain.atdd.test.ts` remains the independent intent anchor; if it is ever deleted
   or weakened, this bundle's sync loses its legitimacy witness.
3. The observed full-suite result (1012 pass, 0 fail, 426 skipped) is representative; skipped tests
   are pre-existing skips unrelated to this bundle.

### Dependencies

1. `triade/` Node test toolchain operational — available now.
2. Orchestrator commits or reconciles the uncommitted spec/deferred-work bookkeeping (R-005).

### Risks to Plan

- **Risk**: A future ladder change is "synced" into the test without PO confirmation, repeating the
  original staleness in reverse.
  - **Impact**: Test suite green while product behavior drifts from intent.
  - **Contingency**: T-P2-4 explicit delay pin + review rule requiring PO sign-off on expectation syncs.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| Pot ladder (`pot.ts`, `POT_LADDER_DELAY`) | None (read-only reference) | `ladder-ceiling-chain.atdd.test.ts` must pass |
| Ceiling detection (`ceiling.ts`, `tierForCeiling`) | None (read-only reference) | Engine ceiling tests (26-test gate) must pass |
| Preview windowing (`preview.ts`, `previewFor`) | None (read-only reference) | `test-design-dw-preview-boundary-hygiene.md` and `test-design-dw-preview-pot-ladder-hygiene.md` suites must pass |
| HUD preview (`hud/` 56pt band, preview chip) | None (chrome reads the same derivation) | `test-design-dw-hud-preview-hardening.md` suite must pass |
| App wiring (`App.tsx` live-ceiling derivation) | None (mirrored by `previewForBoard` helper) | This file IS the wiring pin; no further scope |

Cross-team coordination: none required (single-dev, test-only change).

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-preview-availability-sync.md`
- Context: `_bmad-output/project-context.md`
- Target test: `triade/__tests__/integration/preview-availability.integration.test.ts`
- Intent anchor: `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts`
- Prior preview designs: `test-design-dw-preview-boundary-hygiene.md`,
  `test-design-dw-preview-pot-ladder-hygiene.md`, `test-design-dw-hud-preview-hardening.md`

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing tests for T-P2-1 (strict AC4 assertions) if scheduled.
- Run `*automate` for broader coverage once T-P2-2/T-P2-3 are scheduled.
- Run `*nfr-assess` only if a future ladder change introduces PERF/SEC-relevant production edits
  (not applicable to this test-only bundle).

---

## Approval

**Test Design Approved By:**

- [x] Tech Lead: Eduardo Date: 2026-09-06 (bundle already implemented green; design records residual R-002)
- [ ] Product Manager: Eduardo Date: — (needed only to confirm R-003 acceptance stands)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
