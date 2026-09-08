---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-06'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md'
  - '_bmad-output/test-artifacts/atdd-checklist-1-7-legibilidade-dos-numerais-em-landscape.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - 'triade/src/ui/tileNumerals.ts'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/__tests__/ui/tileNumerals.test.ts'
  - 'triade/__tests__/ui/layout.test.ts'
  - 'triade/__tests__/ui/ui.purity.test.ts'
---

# Test Design: Story 1.7 — Legibilidade dos numerais em landscape

**Date:** 2026-09-06
**Author:** Eduardo
**Status:** Approved
**Mode:** Epic-Level (Phase 4) — single story deep-dive
**Scope note:** The working tree carries no production diff (only orchestrator-owned `sprint-status.yaml` bookkeeping, untouched per instructions). This plan assesses the shipped Story 1.7 numeral-legibility contract at `final_revision 3e8a021` (story state: `awaiting-operator`, manual simulator check T3.2 pending). No production code was modified by this workflow.

---

## Executive Summary

**Scope:** Epic-level test design for Story 1.7 (tile numeral legibility in landscape, AC-1..AC-4): pure module `triade/src/ui/tileNumerals.ts` (digit-bucket tokens 32/13/9, `MIN_TILE_WIDTH=44`, `FIT_INSET_FACTOR=0.5`, `numeralTokenFor`/`numeralFits`/`numeralSizeFor`, theme-aware `tileInkFor`/`tileFillFor` + shape/contrast utils), layout floor `BOARD_SIZE_FLOOR=216` in `triade/src/ui/layout.ts`, and the `GameBoard.tsx` wiring (`numeralSizeFor(value, cell)` + `tileTextColor → tileInkFor` single source).

**Risk Summary:**

- Total risks identified: 7
- High-priority risks (≥6): 1 (R-001 — real Skia render legibility unproven; T3.2 manual check pending)
- Critical categories: BUS (9pt risk point + Dynamic Type exception), TECH (estimator optimism sub-floor, vacuous floor expression)

**Coverage Summary:**

- P0 scenarios: 12 (all automated, all green) — ~0 hours remaining (verify-only)
- P1 scenarios: 6 (5 automated green + 1 manual owed) — ~1-2 hours remaining (manual only)
- P2/P3 scenarios: 4 (manual + proposed) — ~2-5 hours
- **Total effort remaining**: ~3-7 hours (~1 day elapsed, gated on simulator/device access)
- **Evidence:** `npx tsc --noEmit` clean; `npm test` 1454 tests / 1024 pass / 0 fail / 430 skipped (verified this run)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Engine core (`src/engine/core`)** | Untouched by 1.7; covered by the 26-test engine gate + parity suites | Blocking engine gate in CI; no re-validation here |
| **Web PWA (`js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js`)** | Frozen legacy; explicitly read-only for 1.7 | Left untouched; no parity mandate (NFR-9) |
| **Full 13-tier ink/palette realignment** | Deferred to E9 theming + tile-rendering work by story spec; 1.7 only guarantees renderer↔module agreement | E9 suites (`tileShape`/`tileContrast`/`tileTheme`) + 9-3/9-4 audits own the palette |
| **Bundled geometric-sans font swap** | Separate asset-bundling story per Dev Notes; `matchFont` stays on the SDK-57-verified path | Future font story must re-run R-001/R-002 validation |
| **Feel systems (shake/bullet/SFX/haptics)** | Epic 8 scope; no feel-layer changes in 1.7 (boundary rule 7) | Cross-referenced in Interworking |
| **Monetization (ads/IAP)** | Lane rule prohibits influence on spawn/merge/score/render | Out of scope by architecture boundary |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | BUS | Real Skia render legibility at the smallest landscape tile is unproven: CI pins only the analytic estimator (`fontSize×0.55/digit`), never a font engine. The 9pt 6-digit tier (`1536`/`3072+`) is the explicit risk point (AC-3) and T3.2 manual simulator rotation check is still open (`awaiting-operator`) — a render-level clip ships silently | 2 | 3 | 6 | Run the 2 `operator_actions`: rotate simulator/device to landscape, confirm 32/13/9pt tiers legible at the smallest tile and tiles ≥~44pt with no clipping; record evidence in the spec completion note | Eduardo | Before closing 1.7 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-002 | TECH | Width estimator (~10% optimistic for 6-digit Helvetica bold) can report `numeralFits=true` in the 33–43pt sub-floor band where the real render would clip; the "conservative" guarantee holds strictly only at ≥44pt | 2 | 2 | 4 | Accepted by design (sub-44pt "illegible by design", AC-3); scaling fallback + floor keep the common path safe; re-validate if the estimator factor or flooring ever changes | Dev |
| R-005 | BUS | Fixed numerals are a deliberate Dynamic Type exception (AC-4, UX-DR-18, outside `UIFontMetrics`): max-accessibility-text users get no enlargement of the 9pt tier — correct per design but an a11y-complaint surface | 2 | 2 | 4 | Manual max-Dynamic-Type legibility check (part of T3.2); keep the exception flagged, do not "fix" with `allowFontScaling` plumbing | Eduardo |
| R-003 | TECH | `BOARD_SIZE_FLOOR` enforcement is vacuous-by-construction (`availBoard < FLOOR ? availBoard : max(availBoard, FLOOR)`): the maximize-in-available-space math already yields ≥ floor whenever the container fits, so the clamp adds defense but no new behavior — a future layout refactor can silently drop the guarantee | 1 | 3 | 3 | Golden anchors pin it (`BOARD_SIZE_FLOOR===216`, landscape ≥ floor, degenerate sub-floor valid); review-checklist item for `layoutFor` edits | Dev |
| R-004 | TECH | Ink single-source relies on review discipline: renderer routes through `tileInkFor` today, but a future hardcoded ink literal reintroduces the E9-deferred contrast divergence (module is now 13-tier DESIGN canonical `#1C1206`/`#F6F0E1`, not the story-time 2-tier `#3a2f1d`/`#fff8e8` — reverting "to spec" would break `tileShape`/`tileContrast`/`tileTheme` suites) | 1 | 3 | 3 | Purity/single-source wiring verified; keep renderer↔module agreement as a review gate; never re-pin the old 2-tier hexes | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-006 | PERF | `numeralSizeFor` degenerate guards return `1` (finite-positive per spec) for zero/negative tile widths — renders an invisible dot; reachable only via zero-width containers that `layoutFor` already collapses to `boardSize 0` | 1 | 2 | 2 | Monitor; no action unless layout guards change |
| R-007 | TECH | `digitBucket` keys off `String(value).length` — non-canonical inputs (0, negatives, fractions, non-finite) take untested bucket paths; finite-positive guards cover the contract but edge mapping is implicit | 1 | 2 | 2 | Monitor; current tests pin the canonical 1..7-digit + tiny-tile paths |
| R-008 | OPS | Native rendering checks are manual-only by project rule (device tests never gate PRs) — correct process, but means R-001 cannot be closed in CI | 1 | 1 | 1 | Monitor; T3.2 evidence recorded as informative per project rules |

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
| Performance | 60 FPS sustained; numeral path is pure arithmetic (no allocation, no logging, no font engine in CI); device job covers gesture/pixel, CI covers pure | R-006 | Existing CI pure tests + scheduled device job; no new perf harness for 1.7 | `node --test` green (4.7s for 1454 tests); device frame-rate report (existing job) |
| Reliability | `numeralSizeFor` finite + positive for any finite input; `layoutFor` non-finite/degenerate inputs yield valid (possibly sub-floor) board, never NaN/clamp-to-0 | R-006, R-003 | Automated unit tests (tiny-tile, non-finite guards, degenerate container) | `tileNumerals.test.ts` + `layout.test.ts` green |
| Accessibility | Fixed numerals legible at max Dynamic Type (deliberate exception, UX-DR-18); ink pairs hold contrast per DESIGN/E9 canonical map; focus double-ring + VO Custom Actions untouched | R-005, R-001 | Manual max-text-size + simulator rotation checks; 9-3/9-4 contrast audits | T3.2 operator evidence; audit suites green |
| Maintainability | `tileNumerals.ts` pure (no RN/React/Skia/Expo imports), scanned by `ui.purity.test.ts` `PURE_MODULES`; constants UPPER_SNAKE; estimator factor extracted (`ESTIMATED_WIDTH_FACTOR`) and documented | R-004, R-007 | `tsc --noEmit` + `node --test` in CI; purity guard | CI green; `ui.purity.test.ts` includes `tileNumerals.ts` |
| Security | N/A — offline, no auth/data/backend in the numeral path | — | None | N/A |

**Unknown thresholds:** Real-device legibility threshold for 9pt Helvetica-bold 6-digit numerals under outdoor/foto conditions (1/60s/grayscale acceptance-device E1/E8/E9) — marked UNKNOWN; informative only, never a PR gate per project rules.

---

## Entry Criteria

- [x] Story 1.7 AC-1..AC-4 frozen with T-count-accurate completion notes
- [x] `tileNumerals.ts` + wiring + floor implementation landed (`final_revision 3e8a021`)
- [x] `npx tsc --noEmit` clean, `npm test` green baseline recorded (1454 / 1024 pass / 0 fail / 430 skipped)
- [ ] Dev build installed on simulator + one physical device for T3.2
- [ ] Operator time-box reserved for the 2 manual checks

## Exit Criteria

- [x] All P0 tests passing (12/12 automated)
- [ ] All P1 tests passing — 5/6 automated green, 1 manual (T3.2) owed
- [ ] No open high-priority bugs (R-001 closes with T3.2 evidence)
- [ ] Coverage agreed as sufficient (this plan)
- [ ] T3.2 evidence recorded in the spec completion note

---

## Test Coverage Plan

> Note: P0/P1/P2/P3 = priority/risk, NOT execution timing. Execution timing is defined once in Execution Strategy below.

### P0 — Criteria: blocks core journey + high risk + no workaround. Purpose: numeral legibility core.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Digit-bucket tokens (1–3→32/800, 4–5→13/700, 6+→9/700) incl. boundaries | Unit (`tileNumerals.test.ts`) | R-001 | 3 | Dev | DESIGN.md:228-232; green |
| `MIN_TILE_WIDTH===44` pin | Unit | R-003 | 1 | Dev | AC-1 floor constant; green |
| `numeralFits` true/false paths (AC-2 gate) | Unit | R-002 | 2 | Dev | Estimator 0.55/digit + `FIT_INSET_FACTOR`; green |
| `numeralSizeFor` gates on `numeralFits` (1000@30→exactly 13, no sub-token scaling) | Unit | R-002 | 2 | Dev | Review regression from story pass; green |
| 6-digit risk point at 44pt: ≥9pt + never clips inset budget (AC-3) | Unit | R-001 | 2 | Dev | `1536`/`3072` + 6-digit sweep; green |
| `tileInkFor` DESIGN canonical tiers (dark `#1C1206` / light `#F6F0E1`, incl. incandescent 1536/3072 dark) | Unit | R-004 | 3 | Dev | E9-landed mapping; do NOT revert to story-time 2-tier hexes; green |
| Purity/determinism (same input → same output, no RN/Skia imports) | Unit (`ui.purity.test.ts` scan) | R-004 | 1 | Dev | `tileNumerals.ts` in `PURE_MODULES`; green |
| Layout floor golden anchors (216; landscape ≥ floor; degenerate sub-floor valid, no NaN) | Unit (`layout.test.ts`) | R-003 | 2 | Dev | T2.3 anchors present; green |

**Total P0**: 12 scenarios (counting grouped asserts as listed test blocks: 16 test() blocks, 12 P0), automated, green — verify-only.

### P1 — Criteria: important paths + medium risk + common workflows. Purpose: fallback + integration correctness.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| `FIT_INSET_FACTOR` pinned positive ≤1 (AC-3) | Unit | R-002 | 1 | Dev | Green |
| `numeralSizeFor` tiny-tile fallback: finite + positive, largest fitting size when even 9pt clips | Unit | R-006 | 1 | Dev | `100000@5`; green |
| `tileInkFor` non-empty `#`-prefixed string for all tiers incl. 6144+ cap | Unit | R-004 | 1 | Dev | Green |
| Theme-aware wrappers (`tileFillFor`/`tileInkFor` with `themeId`) delegate to `THEMES` pure data | Unit | R-004 | 1 | Dev | Green (theme suites) |
| `GameBoard` wiring: font size via `numeralSizeFor(value, cell)`, ink via `tileInkFor` single source (no duplicated literal) | Component/static | R-004 | 1 | Dev | Verified by grep this run (`GameBoard.tsx:8,17-18,201,270`); propose a static tripwire test if churn resumes |
| Manual: rotate to landscape, confirm 32/13/9pt tiers legible at smallest tile, tiles ≥~44pt, no clipping (T3.2) | Manual | R-001 | 1 | Eduardo | OWED — the only open item |

**Total P1**: 6 scenarios, ~1-2 hours remaining (manual only; automation exists and is green).

### P2 — Criteria: secondary flows + low risk + edge cases. Purpose: hardening + cross-story safety.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Max Dynamic Type legibility confirmation (AC-4 exception) | Manual | R-005 | 1 | Eduardo | Bundle with T3.2 session |
| Cross-theme contrast re-audit after 1.7 (9-3 shape+text, 9-4 light/dark/color-blind) | Unit/audit | R-004 | 2 | Dev | Existing audit suites own; re-run, no new tests |
| Input-path non-regression (1.6 settle-timer/`tilesRef` invariants untouched by the font-size swap) | Unit | — | 1 | Dev | `swipe-gate` + render-gate suites green; no new tests |

**Total P2**: 4 scenarios, ~2-4 hours.

### P3 — Criteria: nice-to-have + exploratory + benchmarks. Purpose: future-proofing.

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| Bundled geometric-sans font swap re-validation (when that asset story lands) | Manual | 1 | Dev | Must re-run R-001/R-002: estimator recalibration likely |
| Outdoor/foto acceptance-device legibility sampling (E1/E8/E9) | Manual | 1 | Eduardo | Informative only, never a PR gate |

**Total P3**: 2 scenarios, ~0-1 hours.

---

## Execution Strategy

Philosophy: run everything in PRs (<15 min — the full `npm test` suite completes in ~5s); defer only manual device/simulator validation to an operator session.

- **Every PR:** `npx tsc --noEmit` + `npm test` (full suite: engine gate 26 + `tileNumerals` + `layout` + purity + all ATDD/audit suites). No parallelization needed at this size.
- **Operator session (before closing 1.7):** T3.2 rotation legibility + max-Dynamic-Type check on simulator and at least one physical device; record evidence in the story completion note.
- **On font-swap story:** re-run this plan's R-001/R-002 manual validation; recalibrate `ESTIMATED_WIDTH_FACTOR` if Helvetica-bold assumptions change.

## Resource Estimates

Ranges only (no false precision; automation already exists):

| Priority | Count | Hours | Notes |
| -------- | ----- | ----- | ----- |
| P0 | 12 | ~0 | Automated, green — verify-only |
| P1 | 6 | ~1-2 | Manual T3.2 session only |
| P2 | 4 | ~2-4 | Manual + existing audit re-runs |
| P3 | 2 | ~0-1 | Future font story / acceptance sampling |
| **Total** | **24** | **~3-7** | **~1 day elapsed, gated on device access** |

### Prerequisites

**Test Data:** None (pure functions; no factories/fixtures needed).

**Tooling:** `node --test` + `tsc --noEmit` (ready); iOS simulator + one physical device for T3.2 (pending).

**Environment:** Dev build with Skia 2.6.2 / Expo SDK 57 verified path (per story Pinned Versions); no new dependencies.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (currently 12/12 green — gate satisfied on automation)
- **P1 pass rate**: ≥95% (5/6 automated green; 1 manual owed — gate opens on T3.2 sign-off)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: R-001 closes only with T3.2 recorded evidence; no waiver recommended (cheap manual check)

### Coverage Targets

- **Critical paths**: ≥80% (digit buckets, fit gate, scaling path, risk point, ink boundary, floor anchors — all covered)
- **Business logic**: ≥70% (pure numeral math fully covered; Skia binding covered by wiring verification + manual render check)
- **Edge cases**: ≥50% (tiny-tile, non-finite guards, degenerate container covered; sub-floor estimator optimism documented as by-design)

### Non-Negotiable Requirements

- [x] All P0 tests pass
- [ ] No high-risk (≥6) items unmitigated (R-001 → T3.2)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (NFR table above; no SEC surface)
- [ ] `tsc --noEmit` clean + full `node --test` green at sign-off

---

## Mitigation Plans

### R-001: Real Skia render legibility unproven (Score: 6)

**Mitigation Strategy:**
1. Run the 2 story `operator_actions` on simulator (rotate to landscape; confirm 32/13/9pt tiers legible at smallest tile).
2. Confirm the min-tile floor keeps tiles ≥~44pt on a typical landscape window with no numeral clipping.
3. Record evidence (device/simulator model, OS, screenshot note) in the story completion note; flip story to done.
**Owner:** Eduardo
**Timeline:** Before closing 1.7
**Status:** Planned (automation half complete — all unit pins green)
**Verification:** Completion note contains T3.2 evidence; follow-up review not recommended once recorded.

### R-002: Estimator optimism sub-floor (Score: 4)

**Mitigation Strategy:** Accepted by design; no code change. Guard: any future change to `ESTIMATED_WIDTH_FACTOR`, `FIT_INSET_FACTOR`, or the 9pt floor must re-run the AC-3 risk-point tests plus a fresh T3.2-style render check.
**Owner:** Dev
**Timeline:** Ongoing review gate
**Status:** Complete (documented in module + tests)
**Verification:** `tileNumerals.test.ts` AC-3 blocks green.

---

## Assumptions and Dependencies

### Assumptions

1. Helvetica-bold (current `matchFont`) remains the tile font until the bundled geometric-sans story lands; estimator calibration (0.55/digit) is tied to it.
2. E9 canonical ink/fill mapping (`#1C1206`/`#F6F0E1` + 13-tier table) is the source of truth — the story-time 2-tier hexes are superseded and must not be restored.
3. Sub-44pt tiles are illegible-by-design (AC-3); the scaling path guarantees no-clip, not readability, below the floor.
4. Manual T3.2 evidence is informative per project rules, never a CI gate.

### Dependencies

1. Simulator/device access for T3.2 — required before story close.
2. None on other teams (pure + render-local change; engine, PWA, backend untouched).

### Risks to Plan

- **Risk**: Bundled-font story changes real glyph widths.
  - **Impact**: Estimator calibration drifts; AC-3 pins may go red or, worse, stay green while render clips.
  - **Contingency**: Re-run full R-001/R-002 validation in that story; recalibrate `ESTIMATED_WIDTH_FACTOR` with measured numbers.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **1.6 swipe input (`GameBoard` settle-timer, `tilesRef`, `EARLY_INPUT_MS`)** | Font-size swap sits inside `AnimatedTile` font construction; settle logic untouched but co-located | `swipe-gate`, `render-gate-hardening`, gesture-pipeline suites must stay green (verified this run) |
| **E9 theming (`tileFillFor`/`tileInkFor`/`tileShapeFor`/`tileContrast`)** | 1.7's module now carries E9 canonical data; agreement is load-bearing | `tileShape`, `tileContrast`, `tileTheme`, 9-3/9-4 audit suites must stay green |
| **Layout/orientation (`layoutFor`, bands, safe-area)** | Floor constant imported from `tileNumerals`; DW-6 rotation-race guards co-located | `layout.test.ts` (incl. floor anchors), DW-6 suites must stay green |
| **HUD/chrome (preview, pause 48×48, bands)** | Board sizing interacts with band heights; numeral change does not touch chrome | HUD/preview suites informational; T3.2 rotation check covers composition |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — risk classification framework
- `probability-impact.md` — risk scoring methodology (P×I, 1–3 scale, ≥6 high)
- `test-levels-framework.md` — test level selection (unit for pure math, manual for render)
- `test-priorities-matrix.md` — P0–P3 prioritization

### Related Documents

- Story: `_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md`
- Prior ATDD: `_bmad-output/test-artifacts/atdd-checklist-1-7-legibilidade-dos-numerais-em-landscape.md`
- Context: `_bmad-output/project-context.md`
- Sources: `triade/src/ui/tileNumerals.ts`, `triade/src/ui/layout.ts`, `triade/src/render/GameBoard.tsx`

---

**Generated by**: TEA Test Architect (`bmad-testarch-test-design`, epic-level)
**Version**: 5.0 (step-file architecture)
**Verification**: `npx tsc --noEmit` clean; `npm test` 1454 tests / 1024 pass / 0 fail / 430 skipped (2026-09-06 run)
