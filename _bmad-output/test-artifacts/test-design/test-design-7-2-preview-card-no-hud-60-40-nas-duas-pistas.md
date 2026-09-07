---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-07'
inputDocuments:
  - _bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md
  - triade/src/game/preview.ts
  - triade/src/ui/PreviewCard.tsx
  - triade/src/ui/Hud.tsx
  - triade/App.tsx
  - triade/__tests__/game/preview.test.ts
  - _bmad-output/project-context.md
---

# Test Design: Epic 7 (Story 7.2) - Preview card no HUD (60/40) nas duas pistas

**Date:** 2026-09-07
**Author:** Eduardo
**Status:** Draft
**Mode:** Epic-Level (story 7.2 + D-008 verification delta, commit ee3ce91)

---

## Executive Summary

**Scope:** Epic-level test design for the 7.2 Ambiguous Preview surface as it stands in the current
tree: pure `previewFor(pending, availablePotValues)` display decision (60/40 via `displayRoll`),
`PreviewCard` chip, `Hud` fan-out with `activeLaneId` single-lane display, `App.tsx` wiring
(`previewFor(game.pendingSpawn, availablePot)` for both lanes). The D-008 delta under review adds
null/undefined-`pending` → `exact-0` and null/non-array-ladder → full-ladder guards plus 3 pins.
Engine is byte-identical (no engine change in scope).

**Risk Summary:**

- Total risks identified: 7
- High-priority risks (≥6): 0
- Critical categories: none (highest scores are TECH/BUS at 4 — R-002 identical-lane fan-out,
  R-003 basic-window content correctness owned by 7.3)

**Coverage Summary:**

- P0 scenarios: 12 (~2–4 hours)
- P1 scenarios: 5 (~2–4 hours)
- P2/P3 scenarios: 5 (~1–3 hours)
- **Total effort**: ~5–11 hours (~1–2 days)

> Note: P0/P1/P2/P3 denote priority/risk, not execution timing. Execution strategy is separate below.

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Epic 3 per-lane board differentiation** | 7.2 structurally fans one lane-agnostic preview out; per-lane boards land in Epic 3 by spec scope note | R-002 documents the identical-input fan-out; Epic 3 test design owns per-lane pins |
| **7.3 exhaustive range-content pins** | "Always contains truth / 1-2-together / up-to-3 window" hardening is explicitly 7.3's job | R-003 + P2 defensive-ladder pins hold the containment baseline meanwhile |
| **Feel-layer exclusion enforcement** | No feel layer exists until Epic 8; current posture is structural (no animation props) | P1 structural pin (no Animated/transform on the card); Epic 8 owns runtime enforcement |
| **Full screen-reader bridge (Epic 9 / S9.2)** | Only the `accessibilityLabel` forward-compat shape is in 7.2 | P2 label-shape pin; Epic 9 owns the bridge |
| **Device/gesture/pixel acceptance** | Project rule: CI covers pure, device covers gesture/pixel — never the inverse; device tests are never a PR gate | Device-lab jobs stay scheduled, ungated |
| **`tsconfig.test.json` pre-existing errors** | Waived/ledgered since 7-1 (TS5101 abort + untouched-file errors, nondeterministic across runs) | Ledgered in deferred-work.md; only NEW errors gate |
| **sprint-status.yaml** | Orchestrator-owned bookkeeping; rows at done/awaiting-operator are not defects | Untouched by this workflow |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

None. No risk meets the ≥6 threshold; no score-9 blocker exists.

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-002 | TECH | Both lanes render from the identical `previewFor(game.pendingSpawn, availablePot)` call, so per-lane test fixtures with distinct values overstate production coverage (false-coverage residual from the 7.2 review) | 2 | 2 | 4 | Keep the distinct-value per-lane regression guard AND one wiring pin asserting both lanes resolve from the same pending (prod-faithful); Epic 3 differentiates | Dev |
| R-003 | BUS | The range window is a correct-but-basic contiguous slice (≤3, contains value); ambiguous-range CONTENT edge semantics are deferred to 7.3, so players may plan on a partial window meanwhile | 2 | 2 | 4 | Containment/cap/contiguity pins hold the baseline; 7.3 owns exhaustive content pins | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-001 | BUS | D-008 `exact-0` fallback renders `"0"`, which is not a ladder value, if `pending` is ever null in production | 1 | 2 | 2 | Monitor — engine guarantees well-formed `PendingSpawn`; degrade-not-throw posture already accepted in review triage |
| R-004 | TECH | 60/40 boundary float behavior (`roll + EPSILON < 0.6`, DW-78) regresses if the boundary expression is touched | 1 | 2 | 2 | Monitor — ULP-neighbor pins (`0.599` exact / `0.6` range) guard it |
| R-005 | BUS | Chip/layout regression (accent `#E8A33D` @20pt, 76×76 portrait, 60×44 landscape, `pointerEvents="none"`) occludes board or breaks pause-button spacing | 1 | 2 | 2 | Monitor — pinned style markers + container-dimension pins |
| R-006 | TECH | `FALLBACK_PREVIEW` empty range renders `""` — a silent empty chip could mask a wiring omission | 1 | 2 | 2 | Monitor — all current callers pass `previews`; wiring pins assert value text renders |
| R-007 | DATA | Stale `availablePotValues` (orchestrator-computed from board ceiling) yields a spawnable-incorrect window the defensive fallback cannot detect (value present but tier-stale) | 1 | 2 | 2 | Monitor — orchestrator owns ceiling freshness; out of 7.2 scope |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Epic-specific NFR thresholds and planned validation for later `nfr-assess`. Not a final audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| Reliability | Malformed snapshot never crashes the HUD (degrade posture) | R-001 | Unit pins: null/undefined pending, NaN roll/value, null ladder | `preview.test.ts` D-008 pins green |
| Maintainability | Engine wall holds: no roll imports in view/orchestration; `no-throw` in `src/engine` | — | Static guards `ui.norolls` / `ui.thinview` / `ui.purity` green, engine diff empty | CI guard output |
| Performance | Preview is HUD chrome, not the hot path; `previewFor` is O(ladder) pure with frozen memo-safe arrays | — | Code inspection only — no perf suite warranted for this scope | N/A (inspection note) |
| Accessibility | `accessibilityLabel` announces next spawn ("Próxima: …"); full bridge is Epic 9 | — | Component pins on label content + lane caption | `previewCard.test.ts` label pins green |

**Unknown thresholds:** None in scope — no latency/throughput/SLO thresholds apply to a pure
render-time projection. 60 FPS evidence obligations belong to the gesture/pixel device jobs, not this scope.

---

## Entry Criteria

- [x] Requirements and assumptions agreed upon (story 7.2 spec + D-008 verification log)
- [x] Test environment provisioned (node:test via `npm test` inside `triade/`)
- [x] Test data available (ladder derived from `POT_CURVE` + fixed `[1,2]`; pure fixtures, no factories needed)
- [x] Feature deployed to test environment (committed surface + D-008 delta in tree)
- [x] Engine-wall guards (`ui.norolls` / `ui.thinview` / `ui.purity`) runnable in the same suite

## Exit Criteria

- [ ] All P0 tests passing
- [ ] All P1 tests passing (or failures triaged)
- [ ] No open high-priority / high-severity bugs (none identified — R-002/R-003 tracked as medium)
- [ ] Test coverage agreed as sufficient (containment + boundary + wiring + markers green)
- [ ] Engine diff empty (`git diff --stat -- triade/src/engine`)

---

## Test Coverage Plan

### P0 (Critical)

**Criteria**: Blocks core journey + High risk + No workaround.
Here: the 60/40 decision, truth containment, and the chip contract are the core strategy surface
(FR-41/42/45) with no workaround — all pins already exist and must stay green.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| 60/40 boundary incl. ULP neighbors (`0.599` exact, `0.6` range) | Unit | R-004 | 3 | Dev | `preview.test.ts` boundary pins |
| Exact echoes `pending.value`; range contains value, ≤3, contiguous ascending | Unit | R-003 | 4 | Dev | Containment/cap/order pins |
| Purity/determinism (deep-equal, no pending mutation, no re-roll) | Unit | — | 2 | Dev | No rng/Math.random/roll imports |
| D-008 null/undefined pending → safe exact, no throw; null/non-array ladder → full ladder | Unit | R-001 | 3 | Dev | New D-008 pins |

**Total P0**: 12 tests, ~2–4 hours (verification + triage; tests exist)

### P1 (High)

**Criteria**: Important features + Medium risk + Common workflows.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Chip renders exact token / `/`-joined range; accent `#E8A33D` @20pt; a11y label + lane caption | Component | R-005 | 3 | Dev | `previewCard.test.ts` + label pin |
| Hud portrait + landscape render the pending value; 76×76 / 60×44 markers intact; `pointerEvents="none"` | Component | R-005 | 1 | Dev | `hud.test.ts` + previewWiring suite |
| Range path through real `previewFor` → `Hud` wiring (not hand-built fixture) | Component | R-002 | 1 | Dev | `hud.previewWiring.test.ts` range case |

**Total P1**: 5 tests, ~2–4 hours

### P2 (Medium)

**Criteria**: Secondary features + Low risk + Edge cases.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Defensive ladder: `[1,2]` special-case, beyond-ladder tail, stale-ceiling proximity fallback | Unit | R-003/R-007 | 3 | Dev | Existing FR-43 pins; no new tests |
| NOOP stability: rejected move preserves `pendingSpawn` → card unchanged | Unit | — | 1 | Dev | Engine contract suite owns it; one orchestrator-level pin suffices |
| No animation/transform props on the card (AC6 structural posture) | Component | — | 1 | Dev | Structural assertion, cheap |

**Total P2**: 5 tests, ~1–3 hours

### P3 (Low)

No P3 scenarios proposed — exploratory/device-pixel work is explicitly out of scope for this change
(see Not in Scope). Deferred entirely to Epic 3 / 7.3 / device-lab tracks.

---

## Execution Order

Philosophy: run everything in PRs (<15 min via node:test); defer only what is expensive/long-running.
Nothing in this scope qualifies for nightly/weekly.

- [ ] PR: full `triade/` suite — `npm test` (P0 + P1 + P2, unit + component + static guards) (~minutes)
- [ ] PR: `npx tsc --noEmit` clean; record `tsconfig.test.json` result against the ledgered waiver (flag only NEW errors)
- [ ] PR: `git diff --stat -- triade/src/engine` empty (engine-wall check)

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | 12 | 0.25 | ~2–4 | Exists; verification + triage only |
| P1 | 5 | 0.5 | ~2–4 | Exists; wiring + marker verification |
| P2 | 5 | 0.25 | ~1–3 | Exists; containment + posture checks |
| **Total** | **22** | **-** | **~5–11** | **~1–2 days** |

### Prerequisites

**Test Data:**

- Pure fixtures only (`{ value, displayRoll }` + ladder from engine config data) — no factories needed

**Tooling:**

- node:test + tsx runner (existing `npm test` in `triade/`)
- react-test-renderer + `renderHud`/`allText`/`hasStyle` helper pattern (existing)

**Environment:**

- Node ^20.19.4 with `triade/` dependencies installed
- No device, no staging, no backend

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers (none open — no risk ≥6)

### Coverage Targets

- **Critical paths**: ≥80% (60/40 decision + containment + chip contract fully pinned)
- **Security scenarios**: N/A (no SEC risks in scope)
- **Business logic**: ≥70% (display-decision module exhaustively pinned at unit level)
- **Edge cases**: ≥50% (defensive ladder + malformed-input paths pinned)

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (≥6) items unmitigated (none exist)
- [ ] Engine diff empty; `ui.norolls` / `ui.thinview` / `ui.purity` green
- [ ] Planned NFR evidence exists (D-008 pins + guard output) or waivers documented

---

## Mitigation Plans

No risk scores ≥6, so no formal mitigation plans are required. R-002 and R-003 (score 4) are
tracked as medium risks with owners and follow-ups:

- **R-002 (identical-lane fan-out, 4):** keep the distinct-value per-lane regression guard plus one
  prod-faithful same-pending wiring pin. Owner: Dev. Follow-up: Epic 3 test design.
- **R-003 (basic-window content, 4):** containment/cap/contiguity pins hold the baseline.
  Owner: Dev. Follow-up: story 7.3 exhaustive content pins.

---

## Assumptions and Dependencies

### Assumptions

1. The engine guarantees well-formed `PendingSpawn` (`displayRoll` in [0,1), ladder value) — the
   D-008 guards are defense-in-depth, and the `exact-0` rendering path is unreachable in production.
2. `availablePot` passed by `App.tsx` is fresh relative to the board ceiling (orchestrator-owned).
3. Working-tree assessment basis: the tree is clean except orchestrator-owned sprint-status.yaml, so
   the committed 7.2 surface + D-008 delta (ee3ce91) is the review target.
4. The two `deferred-work.md` D-008 ledger entries stay open for follow-up close-out (not closed here).

### Dependencies

1. Story 7.3 exhaustive range-content pins — lands after this scope
2. Epic 3 per-lane board differentiation — lands after this scope

### Risks to Plan

- **Risk**: Epic 3 changes the `previews`/`activeLaneId` prop contract
  - **Impact**: 7.2 wiring/component pins need migration (the `activeLaneId` gate already anticipates this)
  - **Contingency**: migrate `hud.previewWiring` via the gate rather than a breaking change

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **Engine (`src/engine`)** | None — byte-identical, display never rolls | 26 engine tests + `pending-spawn-contract` must stay green |
| **Hud / PauseButton / layout band** | Preview fills reserved slots; assists row offsets from portrait box height | `hud.test.ts` pinned markers (76×76 / 60×44), pause-button tests |
| **App.tsx orchestration** | Passes `previewFor(game.pendingSpawn, availablePot)` per lane | previewWiring suite (exact + range through real wiring) |
| **a11y bridge (Epic 9)** | Label shape only | Label-content pins; no bridge tests yet |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- Story: `_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`
- D-008 delta: commit ee3ce91 (null guards in `previewFor` + 3 pins)
- Project rules: `_bmad-output/project-context.md`
- Follow-ups: story 7.3 (range content), Epic 3 (per-lane boards), Epic 8 (feel), Epic 9 (screen reader)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
