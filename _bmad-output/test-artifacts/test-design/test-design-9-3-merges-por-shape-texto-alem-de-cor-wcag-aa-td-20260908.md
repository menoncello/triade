---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-08'
---

# Test Design: Epic 9-3 - Merges por shape/texto além de cor + WCAG AA

**Date:** 2026-09-08
**Author:** Eduardo (TEA Test Architect)
**Status:** Approved
**Run:** tea.td-1 (risk + coverage refresh; working tree clean — code landed pre-baseline, verified as-is)

---

## Executive Summary

**Scope:** Epic-level test design for story `9-3-merges-por-shape-texto-alem-de-cor-wcag-aa` (dark-canonical 13-tier tile palette + per-tier ink + tier-band facet/grain shape layer + WCAG AA contrast enforcement).

**Mode:** Epic-Level (story spec with acceptance criteria + implementation evidence; sprint-status.yaml present).

**Change under test:** Working tree is clean (only orchestrator bookkeeping in `sprint-status.yaml`). Assessment is grounded on the committed implementation: `triade/src/ui/tileNumerals.ts` (TILE_HEXES/TILE_INK/tileFillFor/tileInkFor/tileShapeFor/contrastRatio), `triade/src/render/GameBoard.tsx` (cellColor delegation, AnimatedTile grain/glow), `triade/__tests__/ui/tileShape.test.ts`, `triade/__tests__/ui/tileContrast.audit.test.ts`, updated `tileNumerals.test.ts` expectations.

**Verification evidence (this run):** `npm --prefix triade test` → 1051 pass, 0 fail, 460 skipped; `tsc --noEmit` → 0 errors (per spec verification log; test command re-run this session confirms green).

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (≥6): 1
- Critical categories: BUS (color-blind readability is the story's raison d'être), TECH (Skia render fidelity)

**Coverage Summary:**

- P0 scenarios: 5 (~8–14 hours)
- P1 scenarios: 6 (~6–10 hours)
- P2/P3 scenarios: 5 (~4–8 hours)
- **Total effort**: ~18–32 hours (~0.5–1 week, single QA/dev)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Light + color-blind theme hexes and their audits** | Explicitly deferred to story 9.4 per spec Block If | 9.4 owns palette + audit; this plan validates dark canonical only |
| **Engine merge/spawn/score rules** | Untouched by this story; engine never knows color/shape | Existing 26 engine gate tests + full suite green |
| **Gesture, HIT_TARGET/44pt, spawn preview, monetization** | Explicit Never-list in spec | Regression via existing layout/swipe/tap-target tests |
| **Device photo/outdoor legibility (1/60s, grayscale, 48-vs-96)** | Acceptance-device E1/E8/E9 concern, never a PR gate per project-context | Device job spot-check only |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | BUS | Grain/facet shape layer renders invisibly or illegibly on real Skia (e.g. stroke color/opacity wrong, grain covers numeral), so color-blind players still read hue-only — the story's core promise fails silently while unit tests pass | 2 | 3 | 6 | Device visual spot-check at MIN_TILE_WIDTH~44pt for bands low/mid/emerald/incandescent + 192-vs-1536 pair; keep grain additive (never over numeral center); prior low patch (transparent→black stroke) already applied | Dev | 2026-09-08 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-002 | TECH | Incandescent rest-state shape parity gap (DW-117): 1536/3072 reset grain to 0 + glow, breaking grain-monotonic reading at the top band | 2 | 2 | 4 | Deferred DW-117 owns the fix; this plan pins current behavior in tests and requires visual check that glow alone distinguishes incandescent | Dev |
| R-003 | TECH | Fallback-chain consolidation gap (DW-118): three near-duplicate bucket chains (fill/ink/shape) + theme delegation drift over time | 2 | 2 | 4 | Deferred DW-118 owns consolidation; mitigation now is the cap/fallback mapping tests (6144/12288→3072+, NaN→safe default) | Dev |
| R-004 | BUS | Weakest contrast pair 384 (#157A5C + light ink ≈4.65) regresses below 4.5 on a future palette tweak, breaking 13pt/9pt numeral AA | 1 | 3 | 3 | Contrast audit pins every tier ≥4.5 with 384 explicitly pinned; any hex change must re-run audit | QA |
| R-005 | TECH | 1-vs-2 distinction (areia #EFE3C2 vs ocre #C9963B) collapses for some color-blindness types since both are low-grain band | 2 | 2 | 4 | Shape test asserts mapping; device check with grayscale filter for 1-vs-2 pair; 9.4 color-blind hexes are the durable fix | QA |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-006 | TECH | Unknown/out-of-range values (0, negative, NaN, 6144+) crash or render blank | 1 | 2 | 2 | Covered: fallback tests assert cap-to-3072+ and safe defaults; engine never emits these (unreachable paths) |
| R-007 | OPS | Chrome contrast ratios drift when theme surfaces change | 1 | 2 | 2 | Monitor: chrome assertions (13.1/5.6/7.0/8.6) pinned in audit |
| R-008 | BUS | Screen-reader announcements regress to hue language | 1 | 1 | 1 | Monitor: announcements carry value text "Merged: A plus B equals C" (9.2 bridge owns tiles; no-hide-descendants by design) |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Epic-specific NFR thresholds and planned validation. Final PASS/CONCERNS/FAIL deferred to `nfr-assess`.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| Compliance (WCAG AA) | Tile ink contrast ≥4.5:1 every tier (13pt/9pt numerals); weakest 384 ≥4.7:1; chrome body ≥4.5, accent ≥7:1 | R-004 | `tileContrast.audit.test.ts` (static, pure) | Audit test report (green) |
| Accessibility (FR-31/UX-DR-19) | Value readable beyond hue: facet/grain varies by tier band | R-001, R-005 | `tileShape.test.ts` + device visual spot-check | Mapping test report + device screenshot note |
| Maintainability | No `throw` in `src/engine`; UI never duplicates merge rules; Skia stays declarative | R-003 | `tsc --noEmit` + existing purity/no-throw tests + full suite | tsc 0 errors + suite green |
| Reliability | Unknown values never crash (fallback to heavy cap) | R-006 | Fallback/cap unit tests | Test report |

**Unknown thresholds:** None for dark canonical. Light + color-blind thresholds are UNKNOWN by design — owned by 9.4, not guessed here.

---

## Entry Criteria

- [x] Requirements and acceptance criteria agreed (spec intent-contract + I/O matrix)
- [x] Implementation landed and verified (1051 pass / 0 fail; tsc 0 errors)
- [ ] Device with dev build available for R-001 visual spot-check (grain additive, numeral center clear)
- [ ] 9.4 scope acknowledged as out of scope (no light/color-blind hex approval needed)

## Exit Criteria

- [ ] All P0 tests passing (mapping + contrast + fallback + 192-vs-1536 distinction)
- [ ] R-001 mitigated: device spot-check confirms grain visible and numeral legible at 44pt
- [ ] No open high-priority bugs (only deferred DW-117/DW-118, both low, tracked)
- [ ] Full suite green with no regressions

---

## Test Coverage Plan

Note: P0/P1/P2/P3 = priority/risk, NOT execution timing.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| 13-tier hex+ink mapping matches DESIGN table (dark canonical) | Unit | R-004 | 2 | DEV | Exists: `tileShape.test.ts` mapping assertions |
| Every tier contrast ≥4.5:1, weakest 384 pinned ≥4.7:1 | Unit (audit) | R-004 | 1 | DEV | Exists: `tileContrast.audit.test.ts` |
| Grain visible on device, never obscures numeral (R-001) | Manual device | R-001 | 1 | QA | Spot-check 4 bands + 192-vs-1536 at 44pt; only non-automated P0 |
| 192 vs 1536 distinguishable by grain/shape, not hue | Unit | R-001 | 1 | DEV | Exists: grain-differs assertion |

**Total P0**: 5 tests, ~8–14 hours (mostly device setup + visual review)

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| `tileFillFor` cap: 6144/12288 → 3072+ tier | Unit | R-006 | 1 | DEV | Exists |
| Fallback: 0/negative/NaN → safe default, no crash | Unit | R-006 | 1 | DEV | Exists |
| Grain monotonic non-decreasing by band (low→mid→emerald) | Unit | R-002 | 1 | DEV | Exists; documents DW-117 incandescent exception |
| 1-vs-2 distinct (areia vs ocre) incl. grayscale check | Unit + device | R-005 | 2 | QA | Unit asserts hex; device grayscale confirms |
| Chrome contrast (body/muted/accent/dark-on-accent) | Unit (audit) | R-007 | 1 | DEV | Exists |

**Total P1**: 6 tests, ~6–10 hours

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Announcements carry value text, never hue | Unit (existing) | R-008 | 1 | DEV | Covered by 9.2 bridge tests; verify-only here |
| Numeral sizes 32/13/9 fixed; 9pt six-digit centered, no truncation | Unit (existing) | - | 1 | DEV | `tileNumerals.test.ts` + layout tests |
| Noop/empty cell renders nothing, no contrast/shape check | Unit | R-006 | 1 | DEV | Trivial; covered by board render tests |

**Total P2**: 3 tests, ~3–5 hours

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| Grayscale/outdoor legibility exploratory (E1/E8/E9 device job) | Exploratory | 1 | QA | Informational only, never PR gate |
| 9.4 readiness: confirm light/color-blind hexes absent (not shipped early) | Unit | 1 | DEV | Boundary guard: spec Never-list |

**Total P3**: 2 tests, ~1–3 hours

---

## Execution Order

Philosophy: run everything in PRs if <15 min; defer only expensive/long-running.

- **PR**: Full `npm --prefix triade test -- --no-coverage` (~seconds; 1051 pass) + `tsc --noEmit` — includes all P0/P1 unit + audit tests
- **Nightly/Weekly**: Nothing required by this story (no perf/chaos surface; pure functions + static audit)
- **On-demand**: R-001 device visual spot-check (one dev-build session); grayscale exploratory

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | 5 | 1.5–2.5 | ~8–14 | Dominated by device visual session |
| P1 | 6 | 1.0–1.5 | ~6–10 | Mostly exists; verify + grayscale |
| P2 | 3 | 1.0–1.5 | ~3–5 | Verify-only against existing tests |
| P3 | 2 | 0.5–1.5 | ~1–3 | Exploratory + boundary guard |
| **Total** | **16** | **-** | **~18–32** | **~0.5–1 week** |

### Prerequisites

**Test Data:**

- 13-tier DESIGN hex table (oracle in `tileShape.test.ts` — hardcoded values are the correct independent oracle)
- High values 6144/12288, edge inputs 0/negative/NaN

**Tooling:**

- `node --test` suite + `tsc --noEmit` (ready)
- Dev build on device for R-001 spot-check (pending)

**Environment:**

- Dark canonical theme (default; no flags)
- 44pt minimum tile width context for legibility check

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers (R-001 device check is the gate)

### Coverage Targets

- **Critical paths**: ≥80% (13-tier mapping + contrast fully pinned)
- **Business logic**: ≥70% (pure helpers, fully covered)
- **Edge cases**: ≥50% (cap/fallback covered; unreachable NaN paths documented)

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] R-001 mitigated via device spot-check (grain visible, numeral clear)
- [ ] Contrast audit green (every tier ≥4.5:1)
- [ ] Full suite green, tsc 0 errors
- [ ] Light/color-blind hexes NOT shipped (9.4 boundary holds)

---

## Mitigation Plans

### R-001: Grain layer invisible/illegible on real Skia (Score: 6)

**Mitigation Strategy:**
1. Render board with one tile per band (e.g. 3, 48, 384, 3072) plus 192-vs-1536 pair on a dev build at MIN_TILE_WIDTH~44pt
2. Confirm facet grain strokes visible (opacity 0.14/0.22 black inner stroke) and numeral center unobstructed
3. Confirm 1-vs-2 distinct under grayscale filter
4. If grain invisible: fix stroke color/opacity (as in prior low patch), re-run audit + suite

**Owner:** Dev
**Timeline:** 2026-09-08
**Status:** Planned
**Verification:** Device screenshot note + P0 unit tests green

### R-002/R-003: DW-117/DW-118 deferred gaps (Score: 4 each)

**Mitigation Strategy:** No code change in this run. Behavior pinned by existing tests (monotonic assertion documents the incandescent exception; fallback chains tested per-function). Fix owned by deferred-work entries DW-117/DW-118.
**Owner:** Dev
**Timeline:** Deferred (tracked in deferred-work.md)
**Status:** Planned (deferred)
**Verification:** Existing mapping/fallback tests green

---

## Assumptions and Dependencies

### Assumptions

1. Working tree clean = implementation landed pre-baseline; evidence from committed code + prior verification logs is authoritative
2. Hardcoded DESIGN hexes in tests are the correct independent oracle (not duplication)
3. Contrast ratios (~ values) are approximations; the enforced gate is ≥4.5:1
4. Announcements/bridge behavior owned by 9.2 — verify-only here

### Dependencies

1. Device dev build for R-001 spot-check — Required by 2026-09-08
2. Story 9.4 for light/color-blind palettes + audits — follow-on, not a blocker

### Risks to Plan

- **Risk**: Palette tweak drops 384 below 4.5:1
  - **Impact**: WCAG AA breach on small numerals
  - **Contingency**: Audit fails loudly; revert or adjust ink per DESIGN table

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run). Note: P0 unit tests already exist for this story — ATDD would add device-level scenarios only.
- Run `*automate` for broader coverage once 9.4 lands (light/color-blind themes).

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: Date:
- [ ] Tech Lead: Date:
- [ ] QA Lead: Date:

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **9.2 screen-reader bridge** | Announcements must stay value-text, never hue | 9.2 bridge tests must pass |
| **1-7 numeral legibility** | Numeral tokens 32/13/9 + MIN_TILE_WIDTH unchanged | `tileNumerals.test.ts`, layout tests must pass |
| **Theme system (9.4)** | `tileFillFor`/`tileInkFor` gained optional themeId delegation | `tileTheme.test.ts`, `tileContrast.allThemes` must pass; 9.4 extends |
| **Engine (26 gate tests)** | Untouched (engine never knows color/shape) | Full engine suite must pass |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md`
- Prior test design (same story, earlier run): `_bmad-output/test-artifacts/test-design/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md`
- Implementation: `triade/src/ui/tileNumerals.ts`, `triade/src/render/GameBoard.tsx`
- Tests: `triade/__tests__/ui/tileShape.test.ts`, `triade/__tests__/ui/tileContrast.audit.test.ts`

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
