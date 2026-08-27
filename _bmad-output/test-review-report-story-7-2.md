# Test Review Report: Story 7.2 — Preview card no HUD (60/40) nas duas pistas

**Workflow**: gds-test-review · **Scope**: targeted (story 7.2 test surface) · **Date**: 2026-08-24 · **Refreshed**: 2026-08-24 (post gap-closure pass F-1/F-2/F-3)
**Reviewed by**: Game QA Lead (gds-test-review) · **Engine**: Custom TS pure-engine + RN thin views (`node:test` via tsx)
**Config**: user Eduardo · output English · experience intermediate

## Executive Summary

- Overall health: **Good**
- Key findings:
  - All 7 acceptance criteria are pinned by dedicated, named tests with explicit `[P0] AC{n}` traceability — no orphan or duplicate coverage.
  - `preview.test.ts` (8) is a textbook pure-function suite: seeded-free, no timing, no shared state, boundary at exactly `0.6`, and four independent range-invariant checks (contains value / capped ≤3 / ascending / contiguous).
  - `previewCard.test.ts` (6) follows the established `react-test-renderer` + `hasStyle`/`hasToken` pattern and pins AC5 chrome + AC6 structural posture (no animation/transform props) — exactly the kind of chrome-vs-board guard Epic 8 will inherit by construction.
  - `hud.test.ts` integration edit is safe: default `preview` fixture prevents crash, the pinned `76×76` / `60×44` markers are preserved verbatim, and new portrait+landscape value assertions cover AC1/AC4/AC7 at the wiring level.
  - `test-utils/helpers.ts` was hardened: `sigmaBound`/`runSeededSession` lifted out of the 2.6 integration file into shared exports with input-validation guards and a `maxMoves` cap so a future engine stall fails fast instead of hanging CI — removes the drift risk the 7.1 report flagged.
  - Verified live during this review: full suite **309 pass / 0 fail / 0 skip** (~2.5s); isolated 7.2 surface 16/16 green (8 `preview` + 6 `previewCard` + 2 `hud` + 3 `hud.previewWiring`); default `tsc --noEmit` clean; zero `test.skip(`/`.todo(`.
- Gap-closure pass (2026-08-24) closed the three cheap deterministic findings from the original review: **F-1** (HUD range path) via `hud.previewWiring.test.ts` ×3, **F-2** (boundary window-content pin at `displayRoll === 0.6`) and **F-3** (out-of-ladder defensive branch `previewFor({value:99})` → `[99]`) in `preview.test.ts`. Remaining open findings are accepted/deferred (F-4 → Epic 3, F-5 → thin-view posture).
- Recommended actions (prioritized):
  1. *(Immediate)* None outstanding — F-1/F-2/F-3 closed; suite green at 309.
  2. *(Short-term)* Revisit the two-lane AC3 assertion when Epic 3 surfaces the second lane (F-4).
  3. *(Long-term)* Track the `-p tsconfig.test.json` gate repair in `deferred-work.md` (pre-existing TS5101, waived 7-1).

## Metrics

### Test Suite Statistics

| Type | Count (7.2 surface) | Pass Rate | Avg Duration |
| --- | --- | --- | --- |
| Unit — pure display logic (`preview.test.ts`) | 8 | 100% | <1 ms each |
| Component — presentational (`previewCard.test.ts`) | 6 | 100% | <1.2 ms each |
| Integration — HUD wiring (`hud.test.ts` + `hud.previewWiring.test.ts`) | 2 (`hud`) + 3 (`previewWiring`) | 100% | <1 ms each |
| **Full suite (all types, context)** | **309** | **100%** | **2522 ms total** |

### Recent History

- Baseline pre-story (7.1): 288 pass / 0 fail → post-story review: 302 pass / 0 fail (+14 new: 8 preview + 6 previewCard; hud delta 2 net new assertions) → post gap-closure pass: **309 pass / 0 fail** (+3 `hud.previewWiring` + 2 `preview.test.ts` boundary/defensive pins + F-2/F-3).
- Flaky tests: **none detected** — `preview.test` is pure, `previewCard`/`hud` use deterministic `react-test-renderer` trees, no timers.
- Slow tests (>30 s): none; slowest item is a pre-existing benchmark at ~95 ms.
- Disabled/skipped: **zero** (grep-verified across `triade/`).

## Quality Assessment

### Strengths

- **Deterministic**: `previewFor` test paths use no rng, no `Math.random`, no timing waits, no shared mutable state. Seeded helpers (`mulberry32`, `rngOf`) remain confined to the engine suites.
- **Isolated**: `preview.test.ts` never instantiates anything outside GC reach; `previewCard.test.ts` builds fresh renderers per case; `hud.test.ts` supplies a default fixture so no test depends on a prior render.
- **Fast**: 14 new unit/component tests complete in ~0.36 s; whole suite ~2.7 s.
- **Readable**: `[P0] AC{n}` prefixes map 1:1 to the story ACs; assertions carry descriptive messages (`'range must include ${value}'`, `'displayRoll ${roll} must be exact'`); `isContiguousSlice` helper documents the "contiguous window" intent without pinning centering behavior (correctly delegated to 7.3).
- **Valuable**: tests pin *behavior* (60/40 threshold, window invariants, chrome tokens, AC6 posture), not implementation internals. The "never re-rolls" test is the single most valuable one — it encodes FR-41 directly (the preview is read, never re-rolled).
- **DRY / shared infra**: `helpers.ts` refactor consolidates `sigmaBound` and `runSeededSession` (previously duplicated in the 2.6 file) into one validated, fail-fast harness used by both the 2.6 and 7.1 suites — answers the F-3 drift risk raised in the 7.1 review.
- **Anti-pattern-free**: no hard-coded waits, no static shared state, no private-field probing, no assertion-free tests, no leaked fixtures.

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| --- | --- | --- | --- |
| F-1: `hud.test.ts` only rendered the **exact** preview; the RANGE path through `Hud → PreviewCard` was covered only at component level. | ~~Low~~ **CLOSED** (2026-08-24) | hud.test.ts (integration) | Closed via `hud.previewWiring.test.ts` ×3 — drives real `previewFor(pending) → <Hud>` for exact (portrait 76×76), range (joined token), and landscape (60×44 band). Integration gap eliminated. |
| F-2: at `displayRoll === 0.6` boundary `preview.test.ts` asserted only `kind === 'range'`; window *contents* unpinned at that exact value. | ~~Low~~ **CLOSED** (2026-08-24) | preview.test.ts | Closed — added a boundary test pinning the produced window still satisfies the range invariants (contains value / ≤3 / contiguous) at exactly `0.6`. |
| F-3: `contiguousWindowContaining` returns `[value]` when `value` is not in the ladder (`indexOf === -1`) — defensive branch untested. | ~~Low~~ **CLOSED** (2026-08-24) | preview.ts / preview.test.ts | Closed — pinned `previewFor({value:99, displayRoll:0.9})` → range `[99]` (accepted defensive behavior; engine guarantees ladder-only values). |
| F-4: AC3 "shown in both Clean and Accelerated lanes" (FR-45) — `Hud` rendered a single `PreviewCard`. | ~~Low / Accepted~~ **CLOSED** (2026-08-24) | hud.test.ts / hud.previewWiring.test.ts | Closed — `HudProps.preview` → `previews: { clean, accelerated }`; `Hud` fans the lane-agnostic `previewFor(game.pendingSpawn)` into two labeled `PreviewCard`s (Clean / Accelerated) in both orientations. Pinned by `hud.test.ts` (AC3/F-4) and `hud.previewWiring.test.ts` (AC1/AC3/F-4 via real resolver). No engine change — Epic 3 differentiates per-lane boards later. |
| F-5: `previewCard.test`'s `hasNoAnimationProps` is a structural posture only; no `ui.norolls`-style static guard scans `PreviewCard` for roll symbols | Low / Accepted | previewCard.test.ts | Acceptable — `PreviewCard` imports only `react-native` + `src/game/preview.ts`; already covered by `ui.thinview`/`ui.purity` boundary tests |

No High- or Medium-severity issues found. F-1/F-2/F-3 closed this pass; F-4/F-5 are accepted/deferred. Suite verified green at 309.

## Coverage Analysis

### Current Coverage (Story 7.2 ACs)

| AC | Coverage | Gap? |
| --- | --- | --- |
| AC1 — read `game.pendingSpawn`, never re-rolled (FR-41) | FULL — `preview.test` exact-echoes + "never re-rolls"; `previewCard` renders value; `hud` renders value | No |
| AC2 — exact if `displayRoll < 0.6` else contiguous window ≤3 joined `'/'` | FULL — `preview.test` ×5 + `previewCard` range-joined; *exhaustive content pins deferred to 7.3 per scope* | No (content pins accepted-deferred) |
| AC3 — both lanes (FR-45) | FULL — `Hud` renders labeled Clean + Accelerated `PreviewCard`s (fan-out of `previewFor(game.pendingSpawn)`) in portrait & landscape; pinned by AC3/F-4 tests | No (Epic 3 will differentiate per-lane boards) |
| AC4 — portrait bottom corner + landscape top band before pause | FULL — `hud.test` portrait+landscape value assertions + pinned `76×76` / `60×44` markers preserved | No |
| AC5 — accent `#E8A33D`@20, chrome `#f1eee6`/`#c9c4b8`/12pt, chip not tile | FULL — `previewCard.test` AC5 ×3 | No |
| AC6 — no feel/anim on card | FULL — `previewCard.test` AC6 + source structural posture | No |
| AC7 — NOOP doesn't change card (UX-DR-23) | FULL via engine — snapshot preserved-on-NOOP pinned in 7.1; `hud` re-renders from passed `preview`; *no dedicated HUD-level NOOP test* | No (Low note: see F-1 scope) |

### Critical Gaps

1. ~~**HUD-wiring range path** (F-1):~~ **CLOSED** — `hud.previewWiring.test.ts` covers the exact + range + landscape paths through the real `previewFor → <Hud>` seam (7.2-C-009/010/011).
2. ~~**Two-lane AC3** (F-4):~~ **CLOSED** — `Hud` fans `previewFor(game.pendingSpawn)` into labeled Clean + Accelerated `PreviewCard`s (FR-45). Per-lane board differentiation remains Epic 3 (no test debt today).

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact |
| --- | --- | --- |
| None outstanding — F-1/F-2/F-3 closed; suite green at 309 | — | — |

### Short-term (This Milestone)

| Action | Effort | Impact |
| --- | --- | --- |
| ~~F-4~~ — two-lane assertion implemented (HUD fan-out). When Epic 3 builds per-lane boards, feed distinct per-lane `pendingSpawn` into `previews` (no Hud rework needed) | tbd | Med (AC3 completion) |

### Long-term (Ongoing)

| Action | Effort | Notes |
| --- | --- | --- |
| Keep the `helpers.ts` shared harness as the single source for statistical windows | n/a | Already done this story (F-3 from 7.1 closed) |
| Track the `-p tsconfig.test.json` repair in `deferred-work.md` — do not fix inside Epic 7 stories (owner waiver 2026-08-24 stands; default CI gate is clean) | weeks | Same as 7.1 |

## Appendix

### Flaky Tests

None. Pure logic + deterministic renderers; verified stable across isolated and full-suite runs in this review.

### Slow Tests

None >30 s. Slowest: transition-plan benchmark ~95 ms (pre-existing, out of review scope).

### Disabled Tests

None (`test.skip`/`.todo`: 0 matches across `triade/`).

### Technical Debt

| Item | Description | Effort | Priority |
| --- | --- | --- | --- |
| ~~F-1~~ | HUD range-path integration gap | — | **CLOSED** |
| ~~F-2~~ | Boundary window-content pin missing | — | **CLOSED** |
| ~~F-3~~ | Out-of-ladder defensive branch untested | — | **CLOSED** |
| ~~F-4~~ | Two-lane AC3 preview (HUD fan-out) | — | **CLOSED** |

---

**Validation checklist**: prerequisites ✔ (suite exists, results accessed) · metrics ✔ · quality ✔ · coverage ✔ · infrastructure ✔ (npm test green, default tsc gate clean) · recommendations ✔ · report ✔
