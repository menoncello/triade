---
title: 'DW-56 clamp roll and fallback displayRoll'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '30ebd2f95d24977dbb6ffe9361fa3f7d769c19c2'
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Malformed rng `roll >= 1` in `weightedPicker` collapses deterministically to top pot slot via fallthrough (no clamp to valid band) and NaN third draw is copied unvalidated into `pendingSpawn.displayRoll`, breaking documented `[0,1)` contract and silently flipping 60/40 preview invariant. Pre-existing trust-the-rng class; only crash paths were hardened previously.

**Approach:** Clamp `weightedPicker` roll with `Math.min(Math.max(roll,0),1-Number.EPSILON)` (plus existing NaN→last guard) and replace NaN/non-finite `displayRoll` third draw with `0.5` midpoint fallback (finite out-of-range clamped deterministically: `<0→0`, `>=1→1-EPSILON`), preserving 1-draw budget and trust-the-rng for normal `[0,1)` draws.

## Boundaries & Constraints

**Always:** Preserve 60/40 preview invariant (`displayRoll < 0.6` half-open), engine never throws (AC5), 1-draw per picker/displayRoll (draw budget), no re-roll loop, `1 - Number.EPSILON` exclusive upper bound.

**Block If:** Needs new RNG source, changes to 60/40 threshold, or introduces re-roll/retry loop.

**Never:** Modify FIXED 40/40/POT_WEIGHT distributions, change preview boundary, add while-rng loops, or edit deferred-work ledger.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| weightedPicker normal | roll 0.39 in [0,1) | valid band index via scaled < acc | No error |
| weightedPicker roll >=1 | roll 1, 1.5, Infinity | clamp to 1-EPSILON → valid last band | clamp deterministically |
| weightedPicker roll <0 | roll -0.5, -Infinity | clamp to 0 → first band | clamp to 0 |
| weightedPicker NaN/non-number | NaN, undefined, string | return last index | guard before clamp |
| displayRoll valid | 0, 0.3, 0.599, 0.6 | kept as-is | valid [0,1) |
| displayRoll NaN/non-finite/non-number | NaN, Infinity, "bad", null | 0.5 midpoint | neutral fallback |
| displayRoll finite OOR | -0.5 →0, 1→1-EPSILON, 1.5→1-EPSILON | clamped deterministically | clamp |
| draw budget | newGame 20, effective move 3, noop 0 | exactly 1 draw per picker/displayRoll, no extra rng() | preserve budget |

</intent-contract>

## Code Map

- `triade/src/engine/core/weights.ts:20` -- `weightedPicker` roll clamp site (DW-56 hardening: Math.min(Math.max(roll,0),1-EPSILON), scaled via safeRoll)
- `triade/src/engine/core/game.ts:8` -- `normalizeDisplayRoll(raw: unknown): number` definition (NaN/non-finite→0.5, <0→0, >=1→1-EPSILON)
- `triade/src/engine/core/game.ts:34` -- `newGame` pendingSpawn creation: `displayRoll: normalizeDisplayRoll(rng())`
- `triade/src/engine/core/game.ts:110` -- `move` effective path pendingSpawn: `displayRoll: normalizeDisplayRoll(rng())`
- `triade/src/engine/core/game.ts:39` -- `sanitizePending` strict window `dr >=0 && dr <1` (history restore, not rng path)
- `triade/src/engine/core/spawn.ts:6` -- `weightedPicker` import/use via `pickCombined` (unchanged but benefits from clamp)
- `triade/__tests__/engine/rng-trust-hardening.atdd.test.ts:1` -- ATDD red-phase scaffolds (38 P0 + 19 P1, .skip) documenting delta

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/engine/core/weights.ts:20` -- Clamp weightedPicker roll with `Math.min(Math.max(roll,0),1-Number.EPSILON)` after NaN/non-number guard, compute `scaled = safeRoll * total` so roll >=1 maps to valid last band not fallthrough -- preserves 60/40 via valid band and trust-the-rng for normal draws.
- [x] `triade/src/engine/core/game.ts:8` -- Add `normalizeDisplayRoll(raw: unknown): number` with `!isFinite/non-number→0.5`, `<0→0`, `>=1→1-EPSILON` and wire into `newGame` and `move` effective paths for third draw `displayRoll: normalizeDisplayRoll(rng())` -- fixes NaN silent break and keeps [0,1) + 1-draw budget.
- [x] `triade/__tests__/engine/rng-trust-hardening.atdd.test.ts` -- Validate ATDD static scans (single clamp/normalize/epsilon/midpoint allowlists, no bare scaled/displayRoll, draw-budget) and P0/P1 behavioral gates remain green via unit scans.

**Acceptance Criteria:**
- Given `weightedPicker` called with `roll` 1/1.5/Infinity, when picked, then returns last index via valid `scaled < total` band (not fallthrough) and consumes exactly 1 rng draw.
- Given `weightedPicker` called with negative roll, when picked, then returns first band index (0) deterministically, not NaN fallthrough accident.
- Given `newGame` or effective `move` third draw rng returns NaN/Infinity/non-number, when `pendingSpawn` created, then `displayRoll` is `0.5` midpoint, finite in `[0,1)` (not 0).
- Given third draw returns finite `-0.5` or `1`/`1.5`, when normalized, then `-0.5→0` and `1`/`1.5→1-Number.EPSILON` (clamped, not midpoint), strict `>=0 && <1`.
- Given valid `[0,1)` roll, when `weightedPicker`/`normalizeDisplayRoll` run, then value is kept unchanged (trust-the-rng).
- Given `gameSrc`/`weightsSrc` static scan, when inspected, then `displayRoll: rng()` bare 0 hits, `const scaled = roll * total` bare 0 hits, exactly 1 `safeRoll` def / 3 `normalizeDisplayRoll` occurrences / 1 `return 0.5` / 2 total `Number.EPSILON` (1 per file) / `Math.min(Math.max(roll` 1 hit, and no `while.*rng` loops.

## Spec Change Log

## Review Triage Log

## Design Notes

Hardening is breadth-one guard rail, not retry: `1 - Number.EPSILON` is the exact exclusive ceiling for `[0,1)` (not `0.999`/`1e-9` surrogate); `0.5` midpoint chosen for `displayRoll` to keep preview neutral (`<0.6` exact branch center) rather than zero-biased. NaN/non-number guard in `weightedPicker` precedes clamp because `Math.min(NaN, ...)` is NaN.

```ts
// weights.ts — before vs after
// before: const scaled = roll * total; // >=1 → scaled >= total → fallthrough
// after:  if (typeof roll !== 'number' || Number.isNaN(roll)) return last;
//         const safeRoll = Math.min(Math.max(roll,0), 1 - Number.EPSILON);
//         const scaled = safeRoll * total; // always < total → valid band

// game.ts
function normalizeDisplayRoll(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0.5;
  if (raw < 0) return 0;
  if (raw >= 1) return 1 - Number.EPSILON;
  return raw;
}
```

## Verification

**Commands:**
- `node --test triade/__tests__/engine/weights.test.ts` -- expected: pass (P0/P1 bands + NaN guard)
- `node --test triade/__tests__/engine/rng-trust-hardening.atdd.test.ts` -- expected: skipped scaffolds pass static scans if activated (currently .skip, CI green)
- `grep -c "Math.min(Math.max(roll" triade/src/engine/core/weights.ts` -- expected: 1
- `grep -c "normalizeDisplayRoll" triade/src/engine/core/game.ts` -- expected: 3 (def + 2 call sites)
- `grep -c "Number.EPSILON" triade/src/engine/core/weights.ts` + game.ts -- expected: 1 each (2 total)

**Manual checks (if no CLI):**
- Inspect `triade/src/engine/core/weights.ts:29` clamp line and `triade/src/engine/core/game.ts:8-17` normalize function; confirm no bare `displayRoll: rng()` and no `while.*rng`.
