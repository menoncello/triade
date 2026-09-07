---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-07'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md'
  - '_bmad-output/test-artifacts/atdd-checklist-1-5-layout-portrait-e-landscape.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - 'triade/app.json'
  - 'triade/App.tsx'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/ui/orientation.ts'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/PauseButton.tsx'
  - 'triade/__tests__/ui/layout.test.ts'
  - 'triade/__tests__/ui/orientation.test.ts'
  - 'triade/__tests__/ui/ui.purity.test.ts'
  - 'triade/__tests__/ui/ui.thinview.test.ts'
---

# Test Design: Story 1.5 — Layout portrait e landscape

**Date:** 2026-09-07
**Author:** Eduardo
**Status:** Approved
**Mode:** Epic-Level (Phase 4) — single story deep-dive
**Scope note:** The working tree carries no production diff (only orchestrator-owned `sprint-status.yaml` bookkeeping, untouched per instructions). This plan assesses the shipped Story 1.5 layout contract at `final_revision 0ffd59a` (story state: `awaiting-operator`, manual simulator rotation check pending per `operator_actions`). Verified this run: `layout.test.ts` + `orientation.test.ts` → 23/23 pass; `git diff HEAD` shows production tree clean. No production code was modified by this workflow.

---

## Executive Summary

**Scope:** Epic-level test design for Story 1.5 (playable board in both orientations, AC-1..AC-6): orientation unlock (`expo.orientation: "default"` + prebuild), safe-area infrastructure (`react-native-safe-area-context` ~5.7.0, `SafeAreaProvider` root), pure layout modules (`triade/src/ui/layout.ts`: `SAFE_MARGIN=16`, `PORTRAIT_BAND_HEIGHT=96`, `LANDSCAPE_BAND_HEIGHT=48`, `layoutFor({width,height,insets})`, `getBandTop`, `BOARD_SIZE_FLOOR` from `tileNumerals.MIN_TILE_WIDTH`; `triade/src/ui/orientation.ts`: `isLandscape = width > height`), thin-view HUD (`Hud.tsx` portrait band 34pt + landscape thin band 22pt/11pt, `PauseButton.tsx` `HIT_TARGET=48`), and `App.tsx` integration (`useWindowDimensions` + `useSafeAreaInsets` → `layoutFor` → `Hud` + `GameBoard`, dev-only scroll harness, `contentInsetAdjustmentBehavior="never"`).

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 2 (R-001 — landscape band never visually validated on device, operator check open; R-002 — rotation race: insets lag dimensions one frame)
- Critical categories: BUS (unvalidated landscape composition is the ship-risk), TECH (rotation transients, band/constant drift)

**Coverage Summary:**

- P0 scenarios: 10 (all automated, all green) — ~0 hours remaining (verify-only)
- P1 scenarios: 8 (6 automated green + 2 manual owed) — ~1-3 hours remaining (manual only)
- P2/P3 scenarios: 6 (manual + proposed) — ~2-5 hours
- **Total effort remaining**: ~3-8 hours (~1 day elapsed, gated on simulator/device access)
- **Evidence:** `layout.test.ts` + `orientation.test.ts` 23/23 pass (verified this run); story record cites `tsc --noEmit` clean and 133/133 triade + 26/26 web PWA green at review time

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Engine core (`src/engine/core`)** | Untouched by 1.5; layout reads dimensions/insets only, never snapshots (boundary rule 6) | Blocking 26-test engine gate in CI; no re-validation here |
| **Web PWA (`js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js`)** | Frozen legacy; explicitly read-only for 1.5 | Left untouched; 26/26 frozen |
| **Swipe input (story 1.6)** | Real gesture pipeline is 1.6; 1.5 keeps the temp move harness | 1.6 suites (`swipe`/`gesture-pipeline`/`swipe-gate`) own input |
| **Preview data read (Epic 7)** | 1.5 places the preview card slot only (empty/skeleton) | Epic 7 preview suites own data wiring |
| **Pause overlay/state (Epic 6)** | 1.5 places a present/correctly-sized button only | Epic 6 owns pause state |
| **Numeral legibility below ~44pt tile (story 1.7)** | Explicitly 1.7 (`numeralSizeFor` scaling path is the fallback) | 1.7 suites own the re-check |
| **Full a11y treatment (E9)** | HUD keeps default `allowFontScaling`; VO D-pad/Custom Actions are E9 | E9 suites + `__tests__/a11y/` own screen-reader |
| **Feel systems (Epic 8)** | No feel-layer changes in 1.5 | Cross-referenced in Interworking |
| **Monetization (ads/IAP)** | Lane rule prohibits influence on layout/board | Out of scope by architecture boundary |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | BUS | Landscape composition never visually validated on device: the 22pt/11pt thin band, preview-right vs pause-top-right stacking, and board-dominance below the band are pinned only by unit math + the `key-game-landscape.html` mockup. T5.1/`operator_actions` rotation check is still open (`awaiting-operator`; TCC blocked the rotation gesture in unattended runs) — a band/overlap defect ships silently | 2 | 3 | 6 | Run the `operator_actions`: boot portrait, confirm UX-DR-7 HUD, rotate, confirm thin band + dominant board + pause reachability in both orientations; record evidence in the spec completion note | Eduardo | Before closing 1.5 |
| R-002 | TECH | Rotation race: `useSafeAreaInsets` lags `useWindowDimensions` by a frame on rotation (story-deferred), so `layoutFor` briefly computes against stale insets — board flash toward 0 / one-frame misplacement; scroll offset also persists across rotation. `useSyncedLayout` exists but the race is explicitly deferred polish | 2 | 3 | 6 | Keep deferred status visible (DW-6 rotation-race ATDD exists); manual rotation stress is the P1 owed check; do not gate PRs on it (project rule: device behavior is informative) | Dev | DW-6 follow-up |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-003 | OPS | `expo.orientation` regresses to `"portrait"` (one-line config): landscape ACs silently die — no runtime error, just a portrait-locked app. Native mask lives in gitignored `/ios`, so the repo diff would not even show it | 1 | 3 | 3 | ATDD scaffold + review discipline: any `app.json` orientation edit requires a prebuild + simulator boot check; keep the T1 completion note as the audit trail | Dev |
| R-004 | TECH | Band/constant drift: `LANDSCAPE_BAND_HEIGHT` (48) vs `HIT_TARGET` (48) is an exact fit with zero slack, and the portrait 96 has no layout reason beyond the mockup. A "tidy-up" edit to either constant reintroduces button overflow or dead band space | 1 | 3 | 3 | Golden anchors pin both constants + height-bounded 500×580 fixture (452=580−32−96); HIT_TARGET tripwire asserts the literal with no arithmetic; review gate on `layout.ts`/`PauseButton.tsx` edits | Dev |
| R-005 | BUS | Pause-reachability regression (the shipped bug class: HUD painted under the ScrollView once, portrait pause top-left once). Any reorder of `Hud` vs ScrollView siblings or removal of the `zIndex`/`contentInsetAdjustmentBehavior="never"` pair silently eats taps in the top-right region | 1 | 3 | 3 | P0 regression pins: overlay order + `zIndex: 1` + `contentInsetAdjustmentBehavior="never"`; manual pause-tap in both orientations is part of R-001's operator check | Dev |
| R-006 | OPS | Status-bar legibility on non-notch landscape (light UI + `StatusBar auto`, story-deferred): band-under-status-bar washes out score text on devices without a notch | 2 | 2 | 4 | DW-7 status-bar ATDD exists; manual non-notch landscape check (part of P1 matrix); accepted-deferred, not a PR gate | Eduardo |
| R-007 | TECH | Band-height formula duplication between `App.tsx` (`getBandTop` call-site arithmetic) and `Hud.tsx` (story-deferred): the two can drift so the board offset and the painted band disagree by a few points | 2 | 2 | 4 | Deferred with a named owner (DW layout-band-dedup guard exists as ATDD); single-source via `getBandTop` is the rule for new call-sites; keep the dedup-guard test green | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-008 | TECH | Thin-view/purity bypass on future edits: `Hud.tsx` legitimately imports `./layout` (`SAFE_MARGIN`, `EdgeInsets` type), so a future `layoutFor` call inside the HUD would reintroduce the rule-duplication the guard exists to block | 1 | 2 | 2 | Monitor: symbol-level allowlist test denies `layoutFor`/`isLandscape`/band constants from same-dir imports — keep green |
| R-009 | BUS | Preview placeholder (76×76) overlaps the temp-harness hint text on zero-bottom-inset devices (visual only; card is `pointerEvents="none"`) | 2 | 1 | 2 | Monitor: temp harness dies with 1.6 real input; no fix warranted |
| R-010 | BUS | Dynamic Type extremes: HUD texts honor scaling (correct per UX-DR-24) with accepted slight truncation at max sizes; `numberOfLines` guards exist but max-size landscape band is tight | 1 | 2 | 2 | Monitor: max-Dynamic-Type rotation is a P2 manual check; full treatment is E9 |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

**Residual risk statement:** After the two P1 manual checks (R-001 operator rotation pass, R-002 rotation-stress), the remaining exposure is deferred-polish class (R-006/R-007/R-009, all with DW follow-ups) plus config-regression watch (R-003/R-004/R-005, all pinned by automated tripwires). No SEC/DATA/PERF risk above score 2: layout is pure, offline, allocation-free math with no I/O, no auth surface, and no hot-path frame cost.

---

## NFR Planning

**Purpose:** Capture story-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| Performance | `layoutFor` is O(1) pure math, off the frame hot path; 60 FPS budget unaffected (project rule: CI covers pure, device covers gesture/pixel) | — | Existing unit suite timing (ms-scale) + device frame-rate baseline job | `node --test` duration; device p99 job unaffected |
| Reliability | Rotation portrait↔landscape without crash, NaN board, or persistent mislayout; degenerate inputs clamp to 0, never negative | R-002 | Unit clamp-path tests (green) + manual rotation stress (owed) | Unit suite green; operator rotation note |
| Maintainability | Pure/native split (`layout.ts`/`orientation.ts` import nothing from RN); thin views import only tokens; band constants golden-pinned | R-004, R-007, R-008 | Purity + thin-view tripwire tests (green) | `ui.purity` + `ui.thinview` suites green |
| Accessibility | Pause ≥44×44 in both orientations; HUD honors Dynamic Type; safe margins 16pt + per-edge insets | R-005, R-010 | HIT_TARGET tripwire (green) + tap-targets audit + manual max-type check (owed) | Tripwire green; 9-1 audit; E9 owns full VO |
| Compliance | No PII, no network, no logging in layout path (worklet/release log ban) | — | Purity test (no RN/imports implies no logging surface) | `ui.purity` green |

**Unknown thresholds:** None — 1.5 introduces no new NFR thresholds. Outdoor/photo acceptance conditions (1/60s, grayscale, 6-digit, 384) are device-acceptance E1/E8/E9 items, explicitly never PR gates per project rules.

---

## Entry Criteria

- [x] Requirements and acceptance criteria agreed (story 1.5 AC-1..AC-6 + UX-DR-4/5/6/7/20, D-006/D-007)
- [x] Pure layout implementation + HUD components + App integration shipped at `0ffd59a`
- [x] Unit/purity/thin-view suites green (23/23 verified this run)
- [ ] Test device/simulator with rotation available (for the 2 owed manual checks)
- [ ] Mockup authority accessible (`key-game-portrait.html`, `key-game-landscape.html`) for the operator pass

## Exit Criteria

- [x] All P0 tests passing (10/10 automated, green)
- [ ] All P1 tests passing or triaged (6/8 green; 2 manual owed: R-001 operator rotation, R-002 rotation stress)
- [ ] No open high-priority bugs (R-001/R-002 mitigated via the manual pass or explicitly waived with DW follow-ups kept)
- [ ] Operator rotation evidence recorded in the story completion note
- [ ] `sprint-status.yaml` transition owned by the orchestrator (not this workflow)

---

## Test Coverage Plan

> Note: P0/P1/P2/P3 = priority/risk, NOT execution timing. Timing lives in Execution Strategy below.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| AC-5 board maximizes in container, tile size container-derived (portrait width-bounded, landscape height-bounded below band) | Unit | R-004 | 4 | Dev | In `layout.test.ts`, green; golden anchors pin 96/48 + 500×580 fixture |
| AC-6 landscape band collapse (band 48, board dominates below it) | Unit | R-001 | 2 | Dev | Green; analytic pin for the unvalidated-visual risk |
| AC-4 insets respected both orientations (notch/home, asymmetric binding on height-bounded fixture) | Unit | R-002 | 2 | Dev | Green; rewritten post-review to be non-tautological |
| AC-3 pause ≥44×44 literal (no arithmetic) | Unit (tripwire) | R-005 | 1 | Dev | `ui.thinview` HIT_TARGET regex, green |
| Orientation boundary `isLandscape = width > height` + hook agreement | Unit | R-002 | 1 | Dev | `orientation.test.ts`, green |

**Total P0**: 10 tests, all green, ~0 hours remaining

### P1 (High)

**Criteria**: Important features + Medium risk + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| AC-1 portrait HUD composition (score 34pt center-top, best below, pause top-right, preview bottom corner, no extra chrome) | Component + Manual | R-001 | 2 | Dev/Eduardo | Unit pins absence-of-chrome structurally; visual exactness is the owed operator check |
| AC-2 landscape band composition (score+best left 22/11pt, preview right, pause top-right, no overlap) | Component + Manual | R-001 | 2 | Dev/Eduardo | Overlap-freedom asserted structurally; pixel truth is the owed operator check |
| HUD overlay order + `zIndex` + `contentInsetAdjustmentBehavior="never"` (pause reachability) | Component/regression | R-005 | 1 | Dev | Patched once; pin the sibling order + props |
| Rotation stress (rapid rotate ×10, scroll offset, no NaN/negative board, recovery in one frame) | Manual | R-002 | 1 | Eduardo | Owed; DW-6 owns the automated follow-up |
| Non-notch landscape status-bar legibility | Manual | R-006 | 1 | Eduardo | Owed; DW-7 owns the automated follow-up |
| Safe-area matrix (notch portrait, home-indicator landscape, zero-inset devices) | Unit | R-002 | 1 | Dev | Green (extreme aspect + small-screen cases) |

**Total P1**: 8 scenarios (6 green + 2 manual owed), ~1-3 hours remaining

### P2 (Medium)

**Criteria**: Secondary features + Low risk + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Max Dynamic Type rotation (both orientations, truncation acceptable, no overlap with pause) | Manual | R-010 | 1 | Eduardo | ~15 min on simulator accessibility settings |
| Degenerate/tiny windows (board clamps to 0, never negative; no throw) | Unit | — | 2 | Dev | Green (clamp-path + NaN-guard cases) |
| `app.json` orientation re-lock drill (flip to portrait, boot, confirm landscape dead, flip back) | Manual | R-003 | 1 | Dev | Config-hygiene drill, ~10 min, on demand only |

**Total P2**: 4 scenarios, ~1-3 hours

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| Exploratory rotation + interruption (call banner, control center) during rotation | Exploratory | 1 | Eduardo | On demand |
| `layoutFor` micro-benchmark (documents O(1); no budget attached) | Unit | 1 | Dev | Informational only |

**Total P3**: 2 scenarios, ~1-2 hours

---

## Execution Order

Philosophy: run everything in PRs (<15 min — the whole `node --test` suite is seconds); defer only manual simulator work.

- **Every PR**: `npx tsc --noEmit` + `node --test` (full triade suite incl. 23 layout/orientation + purity + thin-view tripwires). Web PWA 26/26 untouched/frozen.
- **On demand (needs simulator)**: R-001 operator rotation pass (~30-45 min incl. evidence note) → closes the story's `awaiting-operator`; R-002 rotation stress (~20 min); R-006 non-notch check (~15 min).
- **Never as PR gates**: device frame-rate, outdoor/photo acceptance, manual rotation (project hard rules).

---

## Resource Estimates

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | 10 | verify-only | ~0 | All green; no new automation needed |
| P1 | 8 | manual owed | ~1-3 | Two manual checks dominate; automation exists |
| P2 | 4 | mixed | ~1-3 | Mostly one-off manual + green units |
| P3 | 2 | exploratory | ~1-2 | On demand |
| **Total** | **24** | **-** | **~3-8 hours** | **~1 day elapsed, gated on simulator access** |

### Prerequisites

**Test Data:**

- Dimension/inset fixtures already in `layout.test.ts` (390×844 notch, landscape 844×390, height-bounded 500×580, extreme aspects) — no new factories needed
- Simulator device set: one notch iPhone (portrait + landscape) + one non-notch/older-se layout for R-006

**Tooling:**

- `node --test` + `npx tsc --noEmit` (Ready)
- iOS simulator with rotation gesture (Pending — operator-owned)
- Mockup authorities `mockups/key-game-{portrait,landscape}.html` (Ready)

**Environment:**

- Dev build (`expo run:ios`; Expo Go excluded per project rules)
- Metro bundler for the boot check

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — currently 10/10)
- **P1 pass rate**: ≥95% modulo the 2 owed manual checks (waiver = DW-6/DW-7 follow-ups + recorded operator note)
- **High-risk mitigations**: R-001/R-002 addressed by the operator pass or explicitly waived before `done`

### Coverage Targets

- **Critical paths** (AC-1..AC-6 × both orientations): 100% of automatable surface in unit/tripwire form
- **Regression tripwires** (purity, thin-view, HIT_TARGET, band anchors): 100% green, blocking
- **Manual visual truth**: operator rotation pass recorded (the one gate that cannot be automated per project rules)

### Non-Negotiable Requirements

- [x] All P0 tests pass (verified 23/23 this run for layout+orientation scope)
- [ ] No high-risk (≥6) items unmitigated (R-001/R-002 pending operator pass)
- [ ] Planned NFR evidence exists or waivers documented (table above; no new thresholds)
- [ ] No production code modified by this workflow (upheld — tree clean)

---

## Mitigation Plans

### R-001: Landscape composition visually unvalidated (Score: 6)

**Mitigation Strategy:**
1. Boot the dev build on the iOS simulator (iPhone 17 Pro per story record) in portrait; confirm score 34pt center-top, best below, preview bottom corner, pause top-right — match `key-game-portrait.html`.
2. Rotate (Cmd+arrow); confirm thin 22/11pt band, score+best left, preview right beneath/left of pause with no overlap, board dominant below — match `key-game-landscape.html`.
3. Tap pause in both orientations (reachability); record readings + simulator version in the story completion note.
**Owner:** Eduardo
**Timeline:** Before closing 1.5 (`awaiting-operator` → `done`)
**Status:** Planned (owed)
**Verification:** Completion note evidence + orchestrator status flip

### R-002: Rotation race — insets lag dimensions (Score: 6)

**Mitigation Strategy:**
1. Manual rotation stress (rapid rotate ×10, mid-scroll rotation) observing for board flash/0-size frames.
2. Confirm `useSyncedLayout` contains the transient to one frame; file/refresh DW-6 if the flash is user-visible beyond one frame.
3. Keep the deferred status — do not attempt a PR-gated fix (native timing, device-only signal).
**Owner:** Dev
**Timeline:** With the R-001 operator pass (same simulator session)
**Status:** Planned (owed; DW-6 follow-up tracks automation)
**Verification:** Operator note ("no visible flash" or DW-6 refreshed with observations)

---

## Assumptions and Dependencies

### Assumptions

1. Working tree is the assessment target: production tree clean at `0ffd59a`; only orchestrator-owned `sprint-status.yaml` differs (untouched).
2. Unit/purity/thin-view suites are the automatable truth for layout math; pixel truth requires the human operator pass (project rule).
3. `BOARD_SIZE_FLOOR` semantics (vacuous-by-construction clamp, numeral fallback below floor) are 1.7's contract, referenced but not re-validated here.
4. Hud enhancements landed after 1.5 (lane fan-out, assistance buttons, theme chrome, `PreviewCard`) preserve the 1.5 composition contract — verified by reading current `Hud.tsx` (band structure, pause slot, preview slots unchanged).

### Dependencies

1. Simulator/device with rotation gesture — Required by the operator pass date
2. DW-6 (rotation race) and DW-7 (status bar) follow-ups — consume this plan's R-002/R-006 context when scheduled

### Risks to Plan

- **Risk**: Operator pass keeps deferring (simulator access never materializes)
  - **Impact**: R-001/R-002 stay open; story sits at `awaiting-operator` while later stories build on the layout
  - **Contingency**: Time-box waiver — record "landscape analytic coverage only" explicitly, keep DW-6/DW-7 open, and let the orchestrator accept the residual in the open

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **Story 1.6 swipe input** (`BoardGestureView` Pan, `swipe`/`gesture` modules) | Board rect comes from `layoutFor`; a layout change moves the swipe surface | `swipe`/`gesture-pipeline`/`swipe-gate` suites + tap-targets audit must pass |
| **Story 1.7 numerals** (`tileNumerals`, `GameBoard` wiring, `BOARD_SIZE_FLOOR`) | Floor constant lives in `layout.ts`; band changes shift smallest-tile math | `tileNumerals` suite + 1.7 legibility checks must pass |
| **Epic 7 preview** (`PreviewCard`, `pendingSpawn` wiring) | Preview slots are 1.5-placed; preview content is Epic 7 | `hud-preview-hardening` + 7-2 suites must pass |
| **Pause overlay (Epic 6)** | Button placed by 1.5; state/overlay is Epic 6 | Pause overlay suites must pass; re-run R-005 reachability |
| **E9 a11y/theming** (VO bridge, `tileContrast`/`tileTheme`, 9-1…9-4) | HUD chrome/tokens flow through 1.5-placed slots | `__tests__/a11y/` + `tileShape`/`tileContrast`/`tileTheme` + 9-1/9-2/9-4 must pass |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — TECH/SEC/PERF/DATA/BUS/OPS classification
- `probability-impact.md` — 1–3 × 1–3 scoring, ≥6 high threshold
- `test-levels-framework.md` — Unit for pure math/tripwires, Component for HUD composition, Manual for pixel truth
- `test-priorities-matrix.md` — P0/P1/P2/P3 assignment

### Related Documents

- Story: `_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md`
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-5-layout-portrait-e-landscape.md`
- Project context: `_bmad-output/project-context.md`
- Prior art (structure reference): `test-design-epic-1-7-legibilidade-dos-numerais-em-landscape.md`
- DW follow-ups: `test-design-dw-6-rotation-race-safe-area-initial-metrics.md`, `test-design-dw-7-status-bar-dark-landscape.md`, `test-design-dw-layout-band-dedup-and-guard.md`

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
