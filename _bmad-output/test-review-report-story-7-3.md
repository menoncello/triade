# Test Review Report: Story 7.3 — Faixa ambígua correta

**Workflow**: gds-test-review · **Scope**: targeted (story 7.3 test surface) · **Date**: 2026-08-25
**Reviewed by**: Game QA Lead (gds-test-review) · **Engine**: Custom TS pure-engine + RN thin views (`node:test` via tsx)
**Config**: user Eduardo · output English · experience intermediate

## Executive Summary

- Overall health: **Good**
- Key findings:
  - All 8 acceptance criteria are pinned by dedicated, named tests with explicit `[P0] AC{n}` traceability, spanning both the isolated pure-function unit level (`preview.test.ts`) and the orchestrator boundary (`preview-availability.integration.test.ts`). No orphan or duplicate coverage.
  - FR-43 CONTENT is pin-sharp: every documented example (`1/2`, `[3]`, `[3,6]`, `[3,6,12]`, `[6,12,24]`) is asserted with `deepStrictEqual`, not just invariant-checked — exactly the kind of content hardening 7.2 deliberately deferred and 7.3 now closes.
  - The integration suite is faithful to production: `previewForBoard` in the test file is a 1:1 copy of the real `App.tsx:128-150` wiring (`potForTier(tierForCeiling(ceilingDetector(board))) → previewFor(pending, availablePot)`), so it pins the actual seam rather than a mock.
  - `previewFor` purity is pinned at two depths: a 7.3 smoke pin (AC6/FR-44 no-mutation, AC8 determinism) plus the inherited `ui.norolls`/`ui.purity` guards — the hard "never re-rolls" invariant unit test is correctly owned by 7.4, not duplicated here.
  - Verified live during this review: full suite **331 pass / 0 fail / 0 skip** (~2.9 s); isolated 7.3 surface 19 new/changed tests green (13 `preview` FR-43/FR-44 + 1 rewritten F-3 defensive pin + 6 `preview-availability` integration); default `tsc --noEmit` clean; zero `test.skip(`/`.todo(`.
  - The 7.2 deferred gap ("`contiguousWindowContaining` returns `[value]` for out-of-ladder, indistinguishable from exact") is **CLOSED** by the rewritten F-3 pin: out-of-ladder now yields a truthful-by-proximity 3-wide tail (`[24,48,96]` for `99`), never a single-element lie.
- Recommended actions (prioritized):
  1. *(Immediate)* None outstanding — suite green at 331; 7.2 defer closed.
  2. *(Short-term)* None blocking 7.3; when 7.4 lands the hard no-reroll invariant, ensure it does not duplicate the AC8 determinism pin (cross-reference to avoid drift).
  3. *(Long-term)* Track the `-p tsconfig.test.json` gate repair in `deferred-work.md` (pre-existing TS5101, waived 7-1/7-2/7-3).

## Metrics

### Test Suite Statistics

| Type | Count (7.3 surface) | Pass Rate | Avg Duration |
| --- | --- | --- | --- |
| Unit — pure display logic (`preview.test.ts` FR-43/FR-44 block) | 13 new + 1 rewritten (F-3) | 100% | <0.4 ms each |
| Integration — orchestrator availability boundary (`preview-availability.integration.test.ts`) | 6 | 100% | <0.3 ms each |
| **Full suite (all types, context)** | **331** | **100%** | **2947 ms total** |

### Recent History

- Baseline pre-story (7.2 end): ~309 pass / 0 fail → 7.3 dev pass: 325 pass / 0 fail (+13 FR-43/FR-44 unit pins + rewritten F-3) → automation pass: **331 pass / 0 fail** (+6 `preview-availability` integration).
- Flaky tests: **none detected** — `previewFor` is pure (no rng, no timers, no shared state); the integration suite builds fresh `Board` fixtures per case.
- Slow tests (>30 s): none; slowest item is the pre-existing transition-plan benchmark at ~99 ms.
- Disabled/skipped: **zero** (grep-verified across `triade/`).

## Quality Assessment

### Strengths

- **Deterministic**: `previewFor` test paths use no rng, no `Math.random`, no timing waits, no shared mutable state. The availability parameter is passed explicitly, so each case is fully specified by its arguments.
- **Isolated**: unit tests construct `pending`/`availablePotValues` inline with no module-level state; the integration file builds a fresh 4×4 `Board` per case via `boardWithCeiling` (no cross-test leakage).
- **Fast**: 19 new/changed 7.3 tests complete in well under 1 s; whole suite ~2.9 s.
- **Readable**: `[P0] AC{n}/FR-43` prefixes map 1:1 to the story ACs; assertions carry descriptive messages (`'range must contain ${value} (ceiling=${ceiling})'`, `'defensive branch must NOT lie with a single-element [value]'`); the `isContiguousSlice` helper documents the "contiguous window" intent.
- **Valuable**: tests pin *behavior* (FR-43 content examples, ceiling-driven availability, no-mutation), not implementation internals. The availability-mapping test (AC5) is the single most valuable — it proves "only 3 available" is derived from the board ceiling, not a hardcoded ladder.
- **Faithful integration**: the integration `previewForBoard` helper is a verbatim copy of the production wiring, so a regression in `App.tsx` availability computation would fail here, not only in the unit layer.
- **Anti-pattern-free**: no hard-coded waits, no static shared state, no private-field probing, no assertion-free tests, no leaked fixtures.

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| --- | --- | --- | --- |
| F-1: 7.2 review deferred out-of-ladder branch returning a single-element `[value]` (indistinguishable from exact, a "lie"). | ~~Low~~ **CLOSED** (7.3) | preview.test.ts F-3 | Rewritten to assert a truthful-by-proximity 3-wide tail `[24,48,96]` for `99` — never `[99]`. Defensive branch now documented as "truthful-by-proximity". |
| F-2: unit pins existed but the **orchestrator boundary** (board → ceiling → `availablePot` → `previewFor`) had no test seam in 7.2. | ~~Medium~~ **CLOSED** (7.3 automation) | preview-availability.integration.test.ts | 6 integration tests pin the live-ceiling wiring (AC3/AC4/AC5/AC1/AC2/AC7), 1:1 mirroring `App.tsx`. |
| F-3: `previewFor` default param `= FULL_POT_LADDER` means single-arg callers keep the full-ladder window; risk that a caller forgets to pass live availability and silently shows the wrong tier. | Low / Accepted | n/a | Accepted — covered by the integration suite at the wiring layer; a default-param mistake in `App.tsx` would be caught there. No unit-only regression possible given the integration pin. |

No High- or Medium-severity open issues. F-1 and F-2 closed this story; F-3 is accepted with mitigation. Suite verified green at 331.

## Coverage Analysis

### Current Coverage (Story 7.3 ACs)

| AC | Coverage | Gap? |
| --- | --- | --- |
| AC1 — range ALWAYS contains `pendingSpawn.value` (FR-43) | FULL — unit sweep (every ladder value × avail sets) + integration live-ceiling sweep | No |
| AC2 — `value 1/2` → `[1,2]` ("1/2") | FULL — unit ×2 + integration ceiling-independent ×8 | No |
| AC3 — only `3` spawnable → `[3]` | FULL — unit + integration low-ceiling | No |
| AC4 — pot value, more spawnable → up to 3 consecutive from `value` (e.g. `[3,6]`, `[3,6,12]`) | FULL — unit ×4 + integration rising-ceiling ×3 | No |
| AC5 — available set derived from live board ceiling (`potForTier(tierForCeiling(ceilingDetector(board)))`), NOT full ladder | FULL — integration AC5 maps 24→[3], 48→[3,6], 96→[3,6,12], 192→[3,6,12,24]; unit AC5 asserts non-hardcoded | No |
| AC6 — `previewFor` emits no spawn side effects (FR-44) | FULL — unit AC6/FR-44 no-mutation pin | No |
| AC7 — exact path (`<0.6`) unchanged (FR-41/42 preserved) | FULL — unit AC7 + integration AC7 (availability ignored) | No |
| AC8 — `previewFor` pure: no rng, same input → deep-equal (FR-44) | FULL — unit AC8 determinism sweep | No |

### Critical Gaps

1. ~~**Out-of-ladder defensive lie** (F-1):~~ **CLOSED** — rewrote F-3 to a truthful 3-wide tail.
2. ~~**Orchestrator availability seam** (F-2):~~ **CLOSED** — 6 integration tests mirror `App.tsx`.
3. **Hard no-reroll invariant** — correctly owned by **Story 7.4**, NOT a 7.3 gap (the 7.3 AC8 pin is an intentional smoke-level proxy). No duplicate work recommended.

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact |
| --- | --- | --- |
| None outstanding — F-1/F-2 closed; suite green at 331 | — | — |

### Short-term (This Milestone)

| Action | Effort | Impact |
| --- | --- | --- |
| When 7.4 adds the hard no-reroll invariant unit test, cross-reference against the 7.3 AC8 determinism pin to avoid redundant or conflicting assertions | tbd | Low (hygiene) |

### Long-term (Ongoing)

| Action | Effort | Notes |
| --- | --- | --- |
| Keep `preview-availability.integration.test.ts` as the single source of truth for the ceiling→availability→preview seam | n/a | Already done this story |
| Track the `-p tsconfig.test.json` repair in `deferred-work.md` — pre-existing TS5101, waived across 7-1/7-2/7-3; default CI gate is clean | weeks | Same owner waiver stands |

## Appendix

### Flaky Tests

None. Pure logic + deterministic board fixtures; verified stable across isolated and full-suite runs in this review.

### Slow Tests

None >30 s. Slowest: transition-plan benchmark ~99 ms (pre-existing, out of review scope).

### Disabled Tests

None (`test.skip`/`.todo`: 0 matches across `triade/`).

### Technical Debt

| Item | Description | Effort | Priority |
| --- | --- | --- | --- |
| ~~F-1~~ | Out-of-ladder defensive branch returned single-element lie | — | **CLOSED** |
| ~~F-2~~ | Orchestrator availability boundary untested | — | **CLOSED** |
| F-3 | Default `availablePotValues` param could mask a missed wiring arg | — | Accepted (mitigated by integration suite) |

---

**Validation checklist**: prerequisites ✔ (suite exists, results accessed) · metrics ✔ · quality ✔ · coverage ✔ · infrastructure ✔ (npm test green, default tsc gate clean) · recommendations ✔ · report ✔
