# Test Review Report: 3-clone / Tríade

**Review Date**: 2026-08-17
**Reviewer**: gds-test-review (Game QA Lead)
**Scope**: Story 1.5 — Layout portrait e landscape (targeted review)
**Period Covered**: 2026-08-15 to 2026-08-17
**Branch**: `feature/1-5-layout-portrait-e-landscape`

---

## Executive Summary

### Overall Health: Good

### Key Findings

1. **Story 1.5 test surface is green, deterministic, and fully activated** — 22/22 story-1.5 tests pass (14 layout + 5 orientation + 1 purity + 2 thin-view guard), 0 fail, 0 skip (~141 ms isolated; `triade/` total 131/131 ~2.2 s). `npx tsc --noEmit` clean. Web PWA frozen suite 26/26 untouched. No `test.skip(` remnants from the ATDD red phase.
2. **Golden-value anchors pin the real device contracts.** The two anchor screens are asserted with literal arithmetic independent of the implementation formula: portrait 390×844 + notch → `boardSize = 358` (width-bounded, band 96); landscape 844×390 + notch → `boardSize = 314` (height-bounded below the thin band 44, board 314 > band 44). Any maximize/band regression on these screens fails loudly.
3. **The risk properties are covered behavior-first** (not just via the formula): container-derived board (never a fixed constant), insets never grow the board, board+band never overlap on small screens, outputs finite / never negative across a size sweep, band collapse ordering (landscape < portrait), board dominance at extreme aspect (2000×200), `isLandscape` exact boundary (501/500 vs 499/500, square → false), and the single-source-of-truth agreement `layoutFor.isLandscape === isLandscape`.
4. **Purity boundary is guarded** — `layout.ts`/`orientation.ts` are auto-scanned for RN/React/Skia/Expo imports + relative-imports-only (ADR-01/05), mirroring the S1.3 render purity scan. `Hud.tsx`/`PauseButton.tsx` are explicitly exempt (thin RN views, manual validation by project rule).
5. **Residual risk is the documented manual surface (by design).** AC-1 (portrait HUD composition), AC-3 (pause ≥44×44 hit-target / placement), the native safe-area source, and the landscape rotation visual pass remain manual on simulator/device — with **no automated tripwire** against silent HUD rule duplication or hit-target shrink (no RN component test framework exists under the zero-dep rule). The landscape rotation visual pass is still **pending** (recorded in the completion note).

### Recommended Actions

1. ~~Add the untested clamp-path test~~ ✅ **Done (this review)** — `layout.test.ts` now pins oversized-insets → `boardSize === 0` (never negative) while the band still renders.
2. ~~Add `src/ui/**` to the informational CI coverage include~~ ✅ **Done (this review)** — `ci.yml` now covers `src/ui/**`; `layout.ts`/`orientation.ts` get coverage signal.
3. ~~Add a cheap static "thin view" guard for `Hud.tsx`/`PauseButton.tsx`~~ ✅ **Done (this review)** — new `ui.thinview.test.ts`: RN-primitive/same-dir-imports-only + exported `HIT_TARGET = 48 ≥ 44` applied to the button box (AC-3 now has a tripwire).
4. **Record the pending manual landscape rotation / safe-area visual evidence before merge (T5.1)** — still open; top residual risk for this story (manual, simulator-only).

### Action Status (from this review)

| # | Action | Status |
| - | ------ | ------ |
| 1 | Clamp-path test (oversized insets → board 0) | ✅ Done — `layout.test.ts` |
| 2 | Golden anchors 414×896 → 382 / 1024×768 → 692 | ✅ Done — `layout.test.ts` (de-couples sweep from the mirror) |
| 3 | CI coverage include `src/ui/**` | ✅ Done — `ci.yml` |
| 4 | Thin-view guard + `HIT_TARGET ≥ 44` (AC-3 tripwire) | ✅ Done — `ui.thinview.test.ts` + `PauseButton.tsx`/`Hud.tsx` |
| 5 | Landscape rotation visual pass evidence | ⏳ Pending (manual, simulator-only; T5.1) |

---

## Test Suite Metrics

### Test Distribution

| Type                 | Count | % of Total |
| -------------------- | ----- | ---------- |
| Unit Tests (pure layout math) | 19    | 86.4%      |
| Unit Tests (boundary/purity)  | 3     | 13.6%      |
| Integration Tests     | 0     | 0%         |
| Play Mode/Functional  | 0     | 0%         |
| Performance Tests     | 0     | 0%         |
| **Story 1.5 surface** | **22** | **100%**   |

Breakdown (all in `triade/__tests__/ui/`):
- `layout.test.ts` — 14 unit (P0/P1): portrait width-bounded board, landscape height-bounded board below band, band collapse, maximize sweep, container-derived board, insets respected (4 combos), asymmetric notch bind, `SAFE_MARGIN === 16`, small screen 320×480 no-overlap, extreme aspect 2000×200 dominance, finiteness/negativity sweep, `isLandscape` agreement, golden anchors (414×896 → 382, 1024×768 → 692), clamp path (oversized insets → 0).
- `orientation.test.ts` — 5 unit (P0/P1): `isLandscape` true/false/square, exact boundary (501/500 vs 499/500), purity/determinism.
- `ui.purity.test.ts` — 1 boundary (P1): ADR-01/05 scan of `layout.ts` + `orientation.ts`.
- `ui.thinview.test.ts` — 2 boundary (P1, added this review): thin-view import rule for `Hud.tsx`/`PauseButton.tsx` + AC-3 `HIT_TARGET ≥ 44` tripwire.

Suite-wide context: `triade/` total **131** (109 pre-existing baseline + 22 story 1.5); web PWA frozen `test/game.test.js` **26**.

### Execution Metrics

| Metric         | Current                  | Previous (1.3 report, 2026-08-14) | Trend |
| -------------- | ------------------------ | --------------------------------- | ----- |
| Pass Rate      | 100% (131/131 + 26/26)   | 100% (133/133)                    | →     |
| Avg Duration   | ~2.2 s (triade)          | ~2.0 s (triade 107)               | ↑ (tests added) |
| Flaky Tests    | 0 (2 independent runs)   | 0                                 | →     |
| Disabled Tests | 0 (all 22 scaffolds active) | 0                              | →     |
| Typecheck      | clean (`tsc --noEmit`)   | clean                             | →     |

Story-1.5 surface isolated: **22/22 pass, 0 fail, 0 skip, ~141 ms** (fresh run 2026-08-17 post-fix, Node v26.0.0).

### Recent Run History

| Date       | Passed | Failed | Skipped | Duration |
| ---------- | ------ | ------ | ------- | -------- |
| 2026-08-17 | 22     | 0      | 0       | ~141 ms (story-1.5 files, isolated, post-fix) |
| 2026-08-17 | 131    | 0      | 0       | ~2.2 s (triade full, post-fix) |
| 2026-08-17 | 18     | 0      | 0       | ~133 ms (story-1.5 files, isolated, pre-fix) |
| 2026-08-17 | 127    | 0      | 0       | ~2.1 s (triade full, pre-fix) |
| 2026-08-17 | 26     | 0      | 0       | ~100 ms (web PWA frozen) |
| 2026-08-16 | 127    | 0      | 0       | ~1.9 s (triade full, automation-summary-1-5) |
| 2026-08-14 | 133    | 0      | 0       | ~2.0 s (previous 1.3 review) |

Verification: `node --test` from `triade/` (127), story-1.5 files in isolation (18), repo-root `node --test test/game.test.js` (26), `npx tsc --noEmit` clean. All deterministic — pure functions with literal fixtures; no `Math.random`, no waits.

---

## Quality Assessment

### Strengths

- **ATDD discipline held end-to-end.** All 18 red-phase scaffolds (`test.skip(`) were activated per task, confirmed RED on activation, then GREEN; zero skip remnants and zero placeholder assertions in the shipped files.
- **Deterministic and isolated by construction** — `layout.ts`/`orientation.ts` are pure; every test passes explicit `{ width, height, insets }`; no shared state, no module-level mutation, no ordering dependence, no cleanup needed.
- **Golden anchors on the two real iOS mockup screens** — the maximize formula is independently pinned by literal arithmetic (portrait 358 / landscape 314), so a rewrite that preserves the formula shape but breaks the device result fails.
- **Behavior-first coverage of the risk properties** (container-derived board, insets-never-grow, no-overlap, finite/never-negative, dominance, boundary) — the tests protect intent, not just the mirror formula.
- **Single source of truth enforced** — the `layoutFor.isLandscape === isLandscape` agreement test (T2.2) plus the exact `isLandscape` boundary tests lock the orientation predicate.
- **Purity guard reuses the hardened S1.3 pattern** (auto-scan of named pure modules + prefix coverage incl. `reanimated`/`skia`) and is scoped correctly to the two pure modules, exempting the RN views with the boundary documented in the test header.
- **Readability** — AAA structure, `[P0]/[P1]` tags in names, descriptive assertion messages, small local helpers (`availWidth`/`availHeight`) confined to one file (no cross-file duplication).

### Issues Found

| Issue | Severity | Count | Example | Recommended Fix |
| ----- | -------- | ----- | ------- | --------------- |
| ~~Untested clamp path~~ | ~~Low~~ | ~~1~~ | ✅ fixed this review — `layout.test.ts` clamps oversized insets to `boardSize === 0`, never negative | — |
| ~~Derived (mirror) expectations in the sweep~~ | ~~Low~~ | ~~1~~ | ✅ fixed this review — golden anchors 414×896 → 382 and 1024×768 → 692 added | — |
| ~~CI coverage omits `src/ui/**`~~ | ~~Low~~ | ~~1~~ | ✅ fixed this review — `ci.yml` informational include now covers `src/ui/**` | — |
| ~~Manual-only surface has no tripwire (AC-1/AC-3)~~ | ~~Medium~~ | ~~2~~ | ✅ fixed this review — `ui.thinview.test.ts`: thin-view import rule + `HIT_TARGET = 48 ≥ 44` applied to the button box; HUD composition itself stays manual | — |
| Landscape rotation visual pass pending | Medium | 1 | simulator evidence for the rendered landscape band not yet recorded | Record before merge (T5.1) |

### Anti-Patterns Detected

| Pattern | Occurrences | Impact | Fix Effort |
| ------- | ----------- | ------ | ---------- |
| (none)   | 0           | —      | —          |

No hard-coded waits, no shared state, no private-implementation access, no assertion-free tests, no missing cleanup (pure functions).

---

## Coverage Analysis

### Feature Coverage Matrix (story 1.5 surface)

| Feature | P0 Tests | P1 Tests | Gap? |
| ------- | -------- | -------- | ---- |
| Portrait board maximizes inside safe margins (AC-4/5) | 3 | 1 | No |
| Landscape board dominates below thin band (AC-2/6, D-006) | 2 | — | No |
| Band collapse: landscape < portrait, both > 0 | 1 | — | No |
| `SAFE_MARGIN === 16` every edge (UX-DR-4) | 1 | — | No |
| Container-derived board, never fixed constant (UX-DR-20) | 1 | — | No |
| Insets respected / never grow board (AC-4) | 2 | 1 | No |
| Edge cases: 320×480, 2000×200, 200×2000, finite/never-negative | 2 | — | No — clamp path now covered (oversized insets → 0) |
| `isLandscape` boundary + purity (T2.2) | 4 | 1 | No |
| `layoutFor.isLandscape` agrees with `isLandscape` (T2.2) | — | 1 | No |
| Purity: no RN/React/Skia/Expo imports (ADR-01/05) | — | 1 | No |
| Thin views: `Hud`/`PauseButton` import only RN primitives + same-dir siblings | — | 1 | No (added this review) |
| Pause ≥44×44 hit target (AC-3) | — | 1 | No — `HIT_TARGET = 48 ≥ 44` static tripwire (added this review); placement still manual |
| HUD composition portrait (AC-1) / landscape (AC-2) | 0 | 0 | **Yes — manual only (by design)** |
| Native rotation / notch / home-indicator insets | 0 | 0 | **Yes — manual only (project rule); landscape pass pending** |

### Story 1.5 AC → Test Map

| AC | Requirement | Verification |
| -- | ----------- | ------------ |
| 1  | Portrait HUD composition (score center-top 34pt, best below muted, preview bottom, pause top-right) | Manual (RN `Hud`/`PauseButton` on simulator) — documented; portrait board layout math automated |
| 2  | Landscape thin top-edge band (22pt/11pt), board dominates below | FULL (automated) — band collapse + height-bounded board + board > band; RN composition manual |
| 3  | Pause top-right, outside swipe rect, ≥44×44, inside safe margins | Partial — `HIT_TARGET = 48 ≥ 44` static tripwire (added this review); `PauseButton.tsx` 48×48; top-right placement + safe margins still manual |
| 4  | Safe areas from `react-native-safe-area-context` + 16pt margin both orientations | FULL (automated, pure math) — insets respected, asymmetric bind, `SAFE_MARGIN === 16`; native source manual |
| 5  | Board maximizes in space left; tile size derives from container | FULL — maximize sweep, container-derived board (never constant) |
| 6  | Landscape HUD collapses to thin band, board dominates (D-006) | FULL — `bandHeight(landscape) < bandHeight(portrait)`; board > band; height-bounded |

### Critical Gaps

| Gap | Risk | Impact | Priority to Fix |
| --- | ---- | ------ | --------------- |
| Landscape rotation visual pass pending | Medium | composition verified by unit math but never on the rendered device | P2 — record simulator evidence before merge (T5.1) |
| ~~Pause hit-target / HUD composition no tripwire (AC-1/3)~~ | ~~Medium~~ | ✅ closed this review — `ui.thinview.test.ts` (thin-view import rule + `HIT_TARGET ≥ 44`); full component harness still manual | — |
| ~~Clamp path (insets > container) untested~~ | ~~Low~~ | ✅ closed this review — `layout.test.ts` | — |
| ~~Coverage signal for `src/ui/**` missing~~ | ~~Low~~ | ✅ closed this review — `ci.yml` informational include | — |

### Coverage by Priority

```
P0 Coverage: 100% ██████████   (all automated P0 scenarios green)
P1 Coverage: 100% ██████████   (all automated P1 scenarios green)
P2 Coverage:  70% ███████░░░   (AC-1/AC-3 placement + composition manual; AC-3 hit-target now guarded)
P3 Coverage: 100% ██████████   (clamp path + src/ui coverage signal closed)
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect            | Status | Notes |
| ----------------- | ------ | ----- |
| Tests in CI       | ✅     | `.github/workflows/ci.yml` — `engine-test-and-benchmark` (triade: `npm ci` + `tsc --noEmit` + `node --test`) + `web-pwa-engine-test` (root web PWA suite) |
| Results visible   | ✅     | GitHub Actions |
| Failures block    | ✅     | both jobs fail on test/typecheck failure; runs on PR + push to `main` |
| Nightly runs      | ❌     | N/A — no scheduled device job (manual native validation is the rule) |
| Coverage (informational) | ⚠️ | `src/engine|game|render|services` included; **`src/ui/**` missing** |
| Auto-discovery    | ✅     | `node --test` picks up new `__tests__/ui/` without CI edits |

### Test Infrastructure Quality

| Component      | Quality          | Notes |
| -------------- | ---------------- | ----- |
| Fixtures       | Good             | literal fixtures via local `availWidth`/`availHeight` helpers + named inset constants (`PORTRAIT_NOTCH`, `LANDSCAPE_NOTCH`, `ZERO_INSETS`) |
| Helpers        | Good             | confined to the story file (no cross-file duplication); shared `test-utils/helpers.ts` untouched |
| Data factories | N/A              | pure functions, literal inputs only — no factories needed |
| Documentation  | Good             | ATDD checklist + story file document the contract (`layoutFor` shape, `SAFE_MARGIN=16`, band values, manual/manual split) and the testable-vs-manual boundary |

### Maintenance Burden

- Test update frequency: **low** — pure modules, unlikely to change unless UX-DR-4/20 (safe margin, maximize) are re-negotiated, which is Ask First territory.
- Brittleness score: **low** — fully deterministic; the only coupling is the mirror formula in the sweep (issue above).
- Developer friction: **low** — `node --test` bare, zero-dep, Node 26 type-strips TS natively.

---

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| ------ | ------ | ------ | ----- |
| ~~Add clamp-path test~~ | ✅ Done (this review) | Low | QA |
| ~~Add `src/ui/**` to CI coverage include~~ | ✅ Done (this review) | Low | QA |
| ~~Static thin-view guard + `HIT_TARGET ≥ 44`~~ | ✅ Done (this review) | Medium | QA |
| Record landscape rotation / safe-area visual evidence on simulator before merge (T5.1 pending item) | 30 min | Medium | Dev |

### Short-term (This Milestone)

| Action | Effort | Impact | Notes |
| ------ | ------ | ------ | ----- |
| ~~Golden anchors 414×896 → 382 / 1024×768 → 692~~ | ✅ Done (this review) | Low | De-couples the sweep from the mirror formula |
| Hoist `stripComments`/`extractSpecifiers` into `test-utils/helpers.ts` | Done (this review) | Low | `ui.purity` + `ui.thinview` share them; `engine.purity` still carries local copies — optional later dedupe |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| ------ | ------ | ------ | ----- |
| RN component test harness (Reanimated/Skia views) when input (1.6) and pause state (Epic 6) land | 1-3 days | Medium | Would automate AC-1/AC-3 composition; zero-dep rule governs feasibility |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --------- | ------------ | --------------- | ------------ |
| (none)    | 0% (2/2 runs green) | —              | —            |

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --------- | -------- | ---- | ------ |
| (none in story-1.5 surface) | ≤ ~10 ms each | unit | — |
| Suite-wide benchmarks (`benchmark: …`) | ~10-110 ms each | perf | ✅ deterministic, keep |

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --------- | -------------- | ------ | ------ |
| (none)    | —              | all 18 scaffolds activated | —      |

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| ---- | ----------- | ------ | -------- |
| ~~Clamp-path untested~~ | ✅ closed this review — `layout.test.ts` | 15 m | Low |
| ~~Sweep mirror coupling~~ | ✅ closed this review — golden anchors added | 20 m | Low |
| ~~CI coverage omits `src/ui/**`~~ | ✅ closed this review — `ci.yml` | 15 m | Low |
| ~~AC-3/AC-1 manual-only, no tripwire~~ | ✅ closed this review — `ui.thinview.test.ts` (`HIT_TARGET ≥ 44` + thin-view import rule) | 1 h | Medium |
| Landscape rotation visual pass | simulator evidence pending (T5.1) | 30 m | Medium |
| HUD composition (AC-1/AC-2) full automation | needs an RN component harness; manual by project rule | 1-3 days | Low |
| `engine.purity.test.ts` local helper copies | `stripComments`/`extractSpecifiers` still duplicated there after hoist | 10 m | Low |

---

## Next Review

**Scheduled**: After story 1.6 (swipe input) ships.
**Focus Areas**: RN component testability once real input lands; confirm the landscape rotation visual-pass evidence was recorded (T5.1) before merge; verify `Hud`/`PauseButton` thin-view guard still green after any `src/ui` change.
**Success Criteria**: story-1.5 gates stay green (131 triade + 26 web PWA + tsc); the four review findings remain closed (clamp, golden anchors, `src/ui` coverage, thin-view guard); landscape visual evidence recorded; no silent drift on AC-3 hit-target.