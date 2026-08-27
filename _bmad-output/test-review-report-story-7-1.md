# Test Review Report: Story 7.1 — pendingSpawn pre-resolvido no snapshot

**Workflow**: gds-test-review · **Scope**: targeted (story 7.1 surface) · **Date**: 2026-08-24
**Reviewed by**: Game QA Lead (ox-alpha) · **Engine**: Custom TS pure-engine + RN thin views (`node:test` via tsx)

## Executive Summary

- Overall health: **Good**
- Key findings:
  - All 5 acceptance criteria are pinned by dedicated, named tests with explicit `[P0] AC{n}` traceability — no orphan or duplicate coverage against `adaptive-spawn-integration.test.ts`.
  - Statistical gates use the seeded 5σ `sigmaBound` convention that auto-scales with N — no dead gates, no knife-edge flakiness; the 2.6 lesson was correctly applied.
  - The N3 forward invariant is asserted on **every** materialization inside the ≥10k-move sweep, not sampled — strongest possible form of that check.
  - The new structural guard (`ui.norolls.test.ts`) closes a genuine enforcement gap (AC4's UI half had no automated protection before this story) and correctly catches namespace-style calls via comment-stripped bare-reference scanning.
  - Verified live during this review: full suite **288 pass / 0 fail / 0 skip** (~2.5s), isolated new suites 8/8 (~0.3s), default `tsc --noEmit` clean, zero `test.skip(`/`.todo(` matches.
- Post-review fixes applied same-day (F-1..F-3, see Issues Found): suite count 287 → 288 after review (the +1 is the new band-edge test; 280 → 287 was the story itself).
- Recommended actions (prioritized):
  1. *(Short-term)* Consider widening the norolls scan roots to `src/services/**` (see F-1).
  2. *(Long-term)* If the `sigmaBound`/session-harness replication grows to a third copy, lift into a shared test util as the story itself anticipated (see F-3).

## Metrics

### Test Suite Statistics

| Type | Count | Pass Rate | Avg Duration |
| --- | --- | --- | --- |
| Unit / contract (pending-spawn-contract.test.ts) | 6 | 100% | <1 ms each |
| Static guard (ui.norolls.test.ts) | 1 | 100% | ~7 ms |
| Performance/benchmark (context, full repo) | 4 | 100% | 30–95 ms |
| **Full suite (all types)** | **287** | **100%** | **2381 ms total** |

### Recent History

- Baseline pre-story: 280 pass / 0 fail → post-story: 287 pass / 0 fail (+7, all active).
- Flaky tests: **none detected** — all randomness is seeded (`mulberry32`, `rngOf`, boundary-value spies); statistical gates are deterministic for the pinned seed `0x71c7`.
- Slow tests (>30 s): none; slowest single test is a benchmark at ~95 ms.
- Disabled/skipped: **zero** (grep-verified).

## Quality Assessment

### Strengths

- **Deterministic**: every path is seeded; even the statistical sweep runs under one fixed seed. No `Math.random` in any test path.
- **Isolated**: snapshot reconstruction replay proves zero hidden state (AC3); shallow-copy isolation is probed by *mutation* on both noop and effective paths (`notStrictEqual` + mutate + deep-compare history) — a rigorous pattern that would catch reference leaks.
- **Fast**: 10k effective moves complete in well under a second; whole suite ~2.4 s.
- **Readable**: `[P0] AC{n}` prefixes map 1:1 to the story's AC numbers; assertions carry descriptive messages (`'noop must return a copy of the input pending'`); inline comments explain non-obvious ordering (post-merge/pre-spawn ceiling recovery by nulling the spawned cell).
- **Valuable**: tests pin behavior (draw counts, deep shapes, distribution shares), not implementation details. The exact-draw-count pins (3 for move, 20 for newGame, 1 for spawnTile, 0 for noop) double as rng-budget regression detectors.
- **Anti-pattern-free**: no hard-coded waits (pure logic), no shared static state, no private-field probing, assertion-free tests, or missing cleanup (nothing instantiated outside GC reach).

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| --- | --- | --- | --- |
| F-1: `ui.norolls.test.ts` scans only `App.tsx`, `src/ui/**`, `src/render/**`; a future `src/services/*` consumer importing `resolveSpawn` would pass silently | Low | ui.norolls.test.ts | **RESOLVED 2026-08-24** — `src/services` added to SCAN_ROOTS (4 files now scanned); guard green |
| F-2: AC4 boundary coverage stops at draw `0.9999`; exact cumulative-weight threshold crossings untested | Low | pending-spawn-contract AC4 | **RESOLVED 2026-08-24** — new `[P0] AC4 combined-resolver band edges` test pins every internal cumulative boundary (computed from spawnConfig data only) across ceilings 0/48/96/192: edge draw selects next band, draw just below stays in-band, exactly 1 rng draw |
| F-3: `sigmaBound`/`runSeededSession` were replicated in two test files (per project convention); the session harness embedded behavioral heuristics that could drift between copies | Low | Both statistical suites | **RESOLVED 2026-08-24** — lifted into `test-utils/helpers.ts` as shared exports; both suites import them; behavior byte-equivalent (harness returns superset incl. `displayRolls`) |

No High-severity issues found. All findings closed same-day; suite count 287 → 288, all green.

## Coverage Analysis

### Current Coverage (Story 7.1 ACs)

| Area | P0 Coverage | Gap? |
| --- | --- | --- |
| AC1 — next-pending pre-resolved in snapshot (N3 shape, post-merge ceiling, budget-20 newGame, determinism) | FULL — contract test w/ exact shape, pot-membership, 20-draw spy, same-seed replay | No |
| AC2/FR-41 — same distribution as actual spawn | FULL — ≥10k seeded moves, 5σ bands (40/40/pot-20) + per-tier conditional frequencies | No |
| AC3/ADR-06 — pendingSpawn rewinds with the board | FULL — reconstruction replay + snapshot-key pin `{board, pendingSpawn}` + copy-isolation both paths | No |
| AC4 — placed tile equals pre-resolved value; UI never rolls | FULL — engine half (place-not-roll boundary draws + value sweep) + UI half (structural guard) | No |
| AC5/UX-DR-23 — NOOP keeps preview | FULL — deep-equality + 0-draw pin | No |

### Critical Gaps

None within story 7.1's declared scope. Out-of-scope surfaces (HUD preview card = 7.2, ambiguous range = 7.3, full invariant suite = 7.4) correctly remain unpulled-forward.

## Recommendations

### Immediate (This Sprint)

1. ~~None required~~ → All findings resolved 2026-08-24 (see Issues Found).

### Short-term (This Milestone)

1. When Story 7.2 lands the preview card renderer, the norolls guard's file-walker picks up new files automatically under existing roots (`src/ui`, `src/render`, `src/services`) — no action needed unless a NEW layer directory is created.

### Long-term (Ongoing)

1. ~~Lift `sigmaBound`/`runSeededSession`~~ → done (F-3).
2. Track the `-p tsconfig.test.json` repair in `deferred-work.md` — do not fix inside Epic 7 stories (owner waiver 2026-08-24 stands; default CI gate is clean).

## Appendix

### Flaky Tests

None. Statistical gates are seed-pinned with auto-scaling σ bounds; verified stable across isolated and full-suite executions in this review.

### Slow Tests

None >30 s. Slowest: transition-plan benchmark ~95 ms (pre-existing, out of review scope).

### Disabled Tests

None (`test.skip`/`.todo`: 0 matches across `triade/`).

---

**Validation checklist**: prerequisites ✔ · metrics ✔ · quality ✔ · coverage ✔ · infrastructure ✔ (npm test green, default tsc gate clean) · recommendations ✔ · report ✔
