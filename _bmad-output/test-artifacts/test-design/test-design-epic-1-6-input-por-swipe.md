---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-06'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - 'triade/src/ui/swipe.ts'
  - 'triade/App.tsx'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/__tests__/ui/swipe.test.ts'
  - 'triade/__tests__/ui/ui.gesture.test.ts'
  - 'triade/__tests__/render/render-gate-hardening.atdd.test.ts'
---

# Test Design: Story 1.6 — Input por swipe RNGH + edge-cases contract

**Date:** 2026-09-06
**Author:** Eduardo
**Status:** Approved
**Mode:** Epic-Level (Phase 4) — single story deep-dive
**Scope note:** The working tree carries no production diff (only orchestrator-owned `sprint-status.yaml` bookkeeping, untouched per instructions). This plan assesses the shipped Story 1.6 input contract at `final_revision d7ee643` (story state: `awaiting-operator`, manual gesture checks pending).

---

## Executive Summary

**Scope:** Epic-level test design for Story 1.6 (swipe input via RNGH Pan + edge-case contract, AC-1..AC-6).

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 1 (R-001 — operator manual validation pending)
- Critical categories: OPS (unverified core input path), TECH (gate/second-finger)

**Coverage Summary:**

- P0 scenarios: 13 (10 automated unit + 3 manual) — ~2-4 hours remaining (manual only; automation exists)
- P1 scenarios: 6 (3 automated static + 3 manual) — ~2-4 hours remaining (manual only)
- P2/P3 scenarios: 3 (manual + proposed) — ~1-3 hours
- **Total effort remaining**: ~5-11 hours (~1-2 days elapsed, gated on device access)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Engine core rules (`src/engine/core`)** | Untouched by 1.6; covered by the 26-test engine gate + parity suites | Blocking engine gate in CI; no re-validation here |
| **Web PWA (`js/game.js`, `js/ui.js`, `js/debug.js`)** | Frozen legacy; explicitly read-only for 1.6 | Left untouched; no parity mandate (NFR-9) |
| **Pause overlay/state (settle-then-freeze)** | Epic 6 scope; 1.6 guarantees only button reachability (AC-6) | AC-6 manual check only |
| **Feel systems (shake/bullet/SFX/haptics)** | Epic 8 scope; overlap with early-input timing noted as deferred findings | Cross-referenced in Interworking; feel-story tests own their behavior |
| **Monetization (ads/IAP)** | No interaction with the input path; lane rule prohibits influence | Out of scope by architecture boundary |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | OPS | Core gesture path (Pan wiring, cancel, off-board, gate timing, pause hit-testing) has no automated device coverage; the 7 operator checks are pending (`awaiting-operator`) — a wiring regression ships silently | 2 | 3 | 6 | Run the 7 `operator_actions` on simulator + real device; D-008 zero-drift pass already confirms code presence — this closes the behavior half | Eduardo | Before closing 1-6 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-002 | TECH | Second finger mid-swipe corrupts translation (installed RNGH 2.32.0 default `maxPointers=10`, `avgTouches=false` → last-pointer translation; iOS re-anchors) — wrong direction resolves (D1) | 2 | 2 | 4 | Manual device validation item per D1 decision; no code enforcement by design | Eduardo |
| R-005 | BUS | Early-input re-plan (~84ms gate) retargets still-animating tiles; rapid merge-of-merge sequences can show transient visual wrongness | 2 | 2 | 4 | P2 (retarget snap) + P6 (vanish delay) patches applied; manual rapid-swipe check | Eduardo |
| R-003 | TECH | `busyRef` gate state machine has zero automated coverage; `moved ⟺ plan.length>0` invariant unenforced — a future engine change (`moved:true` + empty plan, or skipped effect) freezes all input (Df1) | 1 | 3 | 3 | Latent-only today; propose pure-gate unit tests as follow-up (see P2 plan) | Dev |
| R-004 | TECH | `tilesRef` mirrors tile state outside the functional-update flow; a future writer forgetting the sync desyncs plan from render (Df2/Df4) | 1 | 3 | 3 | Both current writers sync; code-review checklist item for GameBoard edits | Dev |
| R-006 | TECH | RNGH v2→v3 API drift: `onEnd(event, success)` becomes `onDeactivate/onFinalize` with inverted `event.canceled` — a careless upgrade silently dispatches moves on cancel | 1 | 3 | 3 | Version pinned `~2.32.0` in Pinned Version Matrix; T3.4.2 check recorded in story | Dev |
| R-007 | OPS | GameBoard unmount clears the settle timer without releasing `busyRef` → permanent input freeze (Df5); unreachable today (board never unmounts) | 1 | 3 | 3 | Deferred; revisit if board ever unmounts mid-animation | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-008 | TECH | Orientation/resize mid-animation leaves shared values in stale pixel space; accepted swipe re-plans with visible jump (Df3, pre-existing) | 2 | 1 | 2 | Monitor; manual-validation domain |
| R-009 | BUS | 10px threshold variance across devices/fingers (accidental moves vs dead feel) | 1 | 2 | 2 | Monitor; playtest-calibrated 20→10, pinned by tripwire |
| R-010 | BUS | Pause button swallowed by gesture or buried under HUD (AC-6 regression) | 1 | 2 | 2 | Monitor; gesture wraps board only, Hud `zIndex:1`; manual check + 9-1 tap-target audits |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture story-level NFR thresholds, planned validation, and evidence for later `nfr-assess`. No final PASS/CONCERNS/FAIL decisions here.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| Performance | 60 FPS sustained; input gate re-opens at ~30% of max anim (`EARLY_INPUT_MS`=84 from `MAX_MOVE_ANIM_MS`=280); no worklet/release logging; zero hot-path allocation | R-005 | Existing CI pure tests + scheduled device job (p99 worst case); manual rapid-swipe feel check | Device frame-rate report; `node --test` green |
| Reliability | Cancel/interruption → no move/spawn/turn; noop (`moved:false`) never arms `busyRef` (deadlock guard); reject-not-queue while gate closed; seeded RNG stream preserved (noop 0 rolls, effective 2 rolls) | R-001, R-003 | Automated unit/static tests + manual interruption checks | `swipe.test.ts` 10/10; operator sign-off on cancel path |
| Maintainability | `swipe.ts` pure (no RN imports), scanned by purity guard; threshold + gate-fraction pinned by static tripwires; `tilesRef`/unmount tech debt deferred with owners | R-004, R-006, R-007 | `tsc --noEmit` + `node --test` in CI; review checklist for GameBoard writers | CI green; version matrix entry |
| Security | N/A — offline, no auth/data/backend in the input path | — | None | N/A |

**Unknown thresholds:** Per-device touch variance for the 10px threshold (finger size, DPI, screen protector) — marked UNKNOWN; covered by manual validation across simulator + at least one physical device, not by invented numbers.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM
- [ ] Story 1.6 AC-1..AC-6 frozen (post D2/P8 contract amendments)
- [ ] Dev build with RNGH 2.32.0 native linking installed on simulator + one physical device
- [ ] `node --test` green baseline recorded (144/144 at final_revision)
- [ ] Operator time-box reserved for the 7 manual checks

## Exit Criteria

- [ ] All P0 tests passing (11 automated + 3 manual)
- [ ] All P1 tests passing (3 automated + 3 manual, or failures triaged)
- [ ] R-001 mitigated: operator sign-off on all 7 manual checks
- [ ] No open high-priority / high-severity bugs
- [ ] No score-9 risks (none identified)

---

## Test Coverage Plan

Note: P0/P1/P2/P3 denote priority/risk, NOT execution timing. Timing lives in Execution Strategy.

### P0 (Critical)

**Criteria:** Blocks core journey + High risk (≥6) + No workaround
**Purpose:** Guarantee the game is playable by swipe and cancellations never corrupt state

| Test ID | Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ------- | ----------- | ---------- | --------- | ---------- | ----- | ----- |
| 1.6-UNIT-001..010 | AC-1 direction contract (threshold 9/10, 4 dirs, diagonals, tie→null, below-threshold→null, zero→null, custom threshold, purity) | Unit | R-001 | 10 | Dev | Existing `swipe.test.ts`; CI |
| 1.6-MAN-001 | AC-1 swipe each direction resolves a move | Manual-device | R-001 | 1 | Eduardo | Operator check #1 |
| 1.6-MAN-002 | AC-1/UX-DR-23 sub-threshold touch → no move, no spawn, no turn | Manual-device | R-001 | 1 | Eduardo | Operator check #2 |
| 1.6-MAN-003 | AC-2 cancel/system interruption → board unchanged | Manual-device | R-001 | 1 | Eduardo | Operator check #3 |

**Total P0**: 13 scenarios (10 automated existing, 3 manual pending)

### P1 (High)

**Criteria:** Important features + Medium risk (3-4) + Common workflows
**Purpose:** Pin the wiring constants and validate the edge-case contract ends

| Test ID | Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ------- | ----------- | ---------- | --------- | ---------- | ----- | ----- |
| 1.6-STAT-001 | AC-1 threshold wiring references `SWIPE_THRESHOLD` (no bare literal), stays 10px | Unit (static) | R-009 | 1 | Dev | Existing `ui.gesture.test.ts`; CI |
| 1.6-STAT-002 | Gate timer wiring: dual `EARLY_INPUT_MS` arms, `FRACTION=0.3` derivation | Unit (static) | R-003 | 1 | Dev | Existing `render-gate-hardening.atdd.test.ts`; CI |
| 1.6-STAT-003 | `swipe.ts` in `PURE_MODULES`, guard fails hard on unreadable entry | Unit | R-006 | 1 | Dev | Existing `ui.purity.test.ts` (P1-restored); CI |
| 1.6-MAN-004 | AC-3 release off-board resolves as captured | Manual-device | R-001 | 1 | Eduardo | Operator check #4 |
| 1.6-MAN-005 | AC-5 rapid swipes in gate window rejected silently, accepted after open with forward retarget | Manual-device | R-005 | 1 | Eduardo | Operator check #6 |
| 1.6-MAN-006 | AC-4 second finger → single move, first-finger-wins (physical device only) | Manual-device | R-002 | 1 | Eduardo | Operator check #5; simctl cannot inject multi-touch |

**Total P1**: 6 scenarios (3 automated existing, 3 manual pending)

### P2 (Medium)

**Criteria:** Secondary flows + Low/medium risk + Edge cases
**Purpose:** Hold pause reachability and convert the known gate gap into follow-up tests

| Test ID | Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ------- | ----------- | ---------- | --------- | ---------- | ----- | ----- |
| 1.6-MAN-007 | AC-6 pause button reachable/tappable mid-match, never in swipe rect | Manual-device | R-010 | 1 | Eduardo | Operator check #7; 9-1 tap-target audits as regression net |
| 1.6-PROP-001 | (Proposed, not implemented) pure gate state-machine tests: noop never arms, effective arms, settle releases, double-arm idempotent | Unit | R-003 | ~4 | Dev | Requires extracting gate logic to a pure module; follow-up story, NOT this plan's exit gate |

**Total P2**: ~5 scenarios (1 manual pending, ~4 proposed)

### P3 (Low)

**Criteria:** Nice-to-have + Exploratory + Benchmarks
**Purpose:** Document known cosmetic edges without gating the contract

| Test ID | Requirement | Test Level | Test Count | Owner | Notes |
| ------- | ----------- | ---------- | ---------- | ----- | ----- |
| 1.6-EXPL-001 | Orientation/resize mid-animation then swipe (Df3 known jump) | Manual-exploratory | 1 | Eduardo | Pre-existing render issue; record only |
| 1.6-EXPL-002 | Sustained rapid play (merge-of-merge chains) watching for stuck/invisible tiles | Manual-exploratory | 1 | Eduardo | Regression net for P2/P6 retarget fixes |

**Total P3**: 2 scenarios

---

## Execution Strategy

Philosophy: run everything in PRs (host suite is seconds); device/manual covers what CI structurally cannot (gesture, pixels, feel).

- **Every PR:** `npx tsc --noEmit` + `node --test` (includes all 13 automated input scenarios). Fails the PR on red — blocking engine + input gates.
- **Scheduled device job (existing):** frame-rate p99 + gesture/pixel feel — project rule "CI covers puro; device covers gesto/pixel". No new job needed for 1-6.
- **One-shot operator session (this plan's remaining work):** the 7 manual checks on simulator, with 1.6-MAN-006 (second finger) repeated on a physical device. Record pass/fail per check in the story's operator sign-off.
- **Deferred to follow-up:** 1.6-PROP-001 pure-gate tests (only if the gate is extracted); feel-story overlap (shake/bullet truncation under 84ms gate) owned by Epic 8 suites.

## Resource Estimates

| Priority | Count | Effort range | Notes |
| -------- | ----- | ------------ | ----- |
| P0 | 13 (10 auto + 3 manual) | ~2-4 hours | Automation exists; simulator session for 3 manual checks |
| P1 | 6 (3 auto + 3 manual) | ~2-4 hours | Includes physical-device second-finger check |
| P2 | ~5 (1 manual + ~4 proposed) | ~1-2 hours (+~3-6 hours if PROP-001 is scheduled) | Manual cheap; proposed extraction is separate scope |
| P3 | 2 | ~0.5-1 hour | Exploratory, record-only |
| **Total remaining** | **~21-26** | **~5-11 hours** | **~1-2 days elapsed, gated on device access** |

Automation for the shipped contract already exists (13/13 automated scenarios green); all remaining effort is manual validation + optional follow-up.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (11 automated green in CI + 3 manual signed off — no exceptions)
- **P1 pass rate**: ≥95% (all 3 automated green; manual failures triaged, waivers need owner + expiry)
- **High-risk mitigations**: R-001 100% complete (operator sign-off) before the input contract is considered closed
- **Coverage targets**: direction contract 100% of AC-1 branches at unit level; edge-case contract 100% of AC-2..AC-6 via manual checks

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (≥6) items unmitigated (R-001 signed off)
- [ ] No score-9 risks open (none identified)
- [ ] `tsc --noEmit` clean + full `node --test` green (no input-test regressions)
- [ ] PWA + engine core untouched (frozen-surface guard)

---

## Mitigation Plans

### R-001: Core gesture path behaviorally unverified (Score: 6)

**Mitigation Strategy:**
1. Boot the RNGH-linked dev build on the iOS simulator (D-008 confirms build boots, bundle loads clean).
2. Execute operator checks #1–#4 + #6–#7 on the simulator (four directions, sub-threshold, cancel, off-board, rapid-gate, pause).
3. Execute check #5 (second finger) on a physical device — simctl cannot inject multi-touch.
4. Record per-check pass/fail in the story sign-off; any failure reopens 1-6 (no new story needed).
**Owner:** Eduardo
**Timeline:** Before closing 1-6 (awaiting-operator is the current state)
**Status:** In Progress (D-008 code-presence verification done; behavior checks pending)
**Verification:** Signed operator checklist + CI still green at sign-off commit.

---

## Assumptions and Dependencies

### Assumptions

1. RNGH stays pinned at `~2.32.0` (v2 API); any major upgrade re-opens R-006 and T3.4.2.
2. `move()` keeps its `moved`-discriminator contract (0 rolls on noop, 2 on effective) — the deadlock guard and RNG determinism depend on it.
3. The board never unmounts mid-animation (Df5 stays unreachable).
4. Simulator is sufficient for single-finger gesture checks; only multi-touch needs hardware.

### Dependencies

1. Physical iOS device access for 1.6-MAN-006 — required before exit gate.
2. Epic 8 feel suites own shake/bullet/SFX overlap with the 84ms gate (no action here).

### Risks to Plan

- **Risk**: Operator session finds a gesture misbehavior (e.g. cancel dispatches, gate never opens).
  - **Impact**: 1-6 reopens; contract text vs code re-examined.
  - **Contingency**: Static tripwires + unit contract already isolate direction logic — fault would localize to `App.tsx` wiring or `GameBoard` timer.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **Engine core (`move`, spawn, RNG)** | Input is the sole dispatcher; reject-path preserves the seeded stream | 26 engine tests + parity suites must stay green |
| **GameBoard render/anim** | Gate timer + retarget touches tile lifecycles (appear→move snap, vanish delay) | Render suites incl. `render-gate-hardening`; feel suites (shake/bullet) for overlap |
| **HUD/Pause (story 1.5)** | Gesture rect must not swallow chrome; `ui.thinview` guards stay valid | `ui.thinview.test.ts` + 9-1 tap-target audits |
| **a11y (VO custom actions, D-pad)** | Shares `doMove` single entry; three-finger gesture path added later (9-2) must not fight the Pan gate | a11y contract tests (`screenReader.contract.test.tsx`) |
| **PWA legacy** | None (frozen) | 26/26 web tests untouched |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — scoring matrix, category ownership, gate rules
- `probability-impact.md` — 1–3 scales, DOCUMENT/MONITOR/MITIGATE/BLOCK thresholds
- `test-levels-framework.md` — unit-first for pure logic, no duplicate coverage across levels
- `test-priorities-matrix.md` — P0–P3 assignment, risk-score mapping
- `nfr-criteria.md` — NFR planning boundaries (plan validation, defer PASS/FAIL to `nfr-assess`)

### Related Documents

- Story: `_bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md`
- Project context: `_bmad-output/project-context.md`
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-6-input-por-swipe-rngh-edge-cases-contract.md`
- Traceability: `_bmad-output/test-artifacts/traceability/traceability-matrix-1-6.md`, `coverage-matrix-1-6.json`, `gate-decision-1-6.json`

---

**Generated by**: TEA Test Architect (`bmad-testarch-test-design`, epic-level)
**Version**: 5.0 (step-file architecture)
