---
title: 'engine-line-compaction fix'
type: 'bugfix'
created: '2026-09-02'
baseline_revision: '505c8eac145fccd9b18fc97b8fd4a51826e24847'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
final_revision: '4f6cc04dd3b59bcb025fc463a21619d195ae09a6'
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** `shiftLine` in `triade/src/engine/core/line.ts` fails to fully compact lines with multiple gaps (e.g. `[null,null,null,2]` → `[null,null,2,null]` instead of `[2,null,null,null]`) because the loop uses `dest=i-1` without scanning, and `shiftLine`/`movementLines`/`boardFromLines` assume exactly 4 elements and crash on shorter inputs.

**Approach:** Harden the 4x4 contract without changing `GRID_SIZE`: make compaction scan past consecutive empty cells so every tile slides to the wall in a single pass while preserving current merge-once semantics, and guard line/board helpers to handle short inputs gracefully (use actual length).

## Boundaries & Constraints

**Always:** Keep `GRID_SIZE = 4`; all existing `line.test.ts` and `line-moved.unit.test.ts` expectations must stay green; board remains rectangular 4x4 via `movementLines`/`boardFromLines`; pure engine (no RNG/I/O) semantics unchanged; preserve `from` tracing and `score`/`moved` reporting.

**Block If:** Changing GRID_SIZE, altering merge rules (`canMerge`/`mergeValue`), or changing `move` draw budget is required.

**Never:** Change GRID_SIZE, introduce async I/O, or alter tier/spawn RNG budgets; do not edit ledger.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Multi-gap compaction | `shiftLine([null,null,null,2])` (r0) | `[2,null,null,null]` with `from [[0,3]]` at 0, `moved:true` | No error |
| Double gap with two tiles | `shiftLine([null,2,null,4])` | `[2,4,null,null]` compacted | No error |
| Gap then merge-adjacent kept | `shiftLine([3,null,3,null])` | `[3,3,null,null]` `score 0` (no merge across gap) | No error |
| Merge at wall | `shiftLine([1,2,null,null])` | `[3,null,null,null]` `score 3` | No error |
| Short input | `shiftLine([{v:1,r:0,c:0}])` single element | returns length 1 line without crash; `moved` false if already at wall | No throw |
| Empty line | `shiftLine([])` | `[]` length 0, `moved false` | No throw |
| Short boardFromLines | `boardFromLines([[shifted line len 1]], 'left')` | maps only available cells without crash | No throw |
| Existing cascade block | `shiftLine([3,3,3,3])` | `[6,3,3,null]` `score 6` preserved | No error |

</intent-contract>

## Code Map

- `triade/src/engine/core/line.ts:38-103` -- buggy `shiftLine` loop (`dest=i-1`) and `boardFromLines`/`movementLines` 4x4 assumption
- `triade/src/engine/core/types.ts:1` -- `GRID_SIZE` contract (must stay 4)
- `triade/src/engine/core/rules.ts:3-9` -- `canMerge`/`mergeValue` (read-only)
- `triade/__tests__/engine/line.test.ts` -- existing expectations to preserve
- `triade/__tests__/engine/line-moved.unit.test.ts` -- moved flag expectations to preserve
- `triade/src/engine/core/game.ts:31-50` -- consumer via `movementLines`/`shiftLine`/`boardFromLines` (directional spawn invariant)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/engine/core/line.ts` -- fix `shiftLine` compaction to scan past consecutive nulls (fully compact single-pass) while keeping merge check on immediate predecessor `i-1` to preserve gap-non-merge semantics; guard `shiftLine` and `boardFromLines`/`movementLines` against short inputs by using `line.length`/`lines.length` instead of unconditional `GRID_SIZE` indexing.
- [x] `triade/__tests__/engine/line.test.ts` -- add regression pins for multi-gap compaction (`[null,null,null,2]` etc.) and short-input guard if not already covered (or create `line-compaction.regression.test.ts`).

**Acceptance Criteria:**
- Given `[null,null,null,2]` when `shiftLine` then result is `[2,null,null,null]` with `moved true` and trace `from [[0,3]]`
- Given `[null,2,null,4]` when `shiftLine` then result is `[2,4,null,null]`
- Given `[3,3,3,3]` when `shiftLine` then result stays `[6,3,3,null]` score 6 (cascade block preserved)
- Given `[3,null,3,null]` when `shiftLine` then result is `[3,3,null,null]` score 0 (gap non-merge preserved)
- Given a 1-element line when `shiftLine` then no throw and `line.length` preserved
- Given existing `line.test.ts` + `line-moved.unit.test.ts` when `npm test` then all pass

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2: (low, low) — transitionPlan slide expectations assumed single-step move (pre-existing buggy pin) correctly updated to wall; game.test one-cell semantics likewise.
- addressed_findings:
  - none

## Design Notes

Scanning fix: for shift case where `out[dest].v===null`, walk `target=dest` left while `target>0 && out[target-1].v===null` to find wall-most empty in the consecutive empty run, then place tile at `target`. Merge case retains `dest=i-1` only.

```ts
// dest = i-1
if (out[dest].v === null) {
  let target = dest;
  while (target > 0 && out[target-1].v === null) target--;
  out[target].v = t.v; ...
}
```

Guard: use `const n = line.length` and loop `i < n` rather than `GRID_SIZE`; similarly `boardFromLines` iterates over `lines.length` and `lines[i].length`.

## Verification

**Commands:**
- `npm test -- triade/__tests__/engine/line.test.ts triade/__tests__/engine/line-moved.unit.test.ts` -- expected: pass
- `npm test -- triade/__tests__/engine/game.test.ts` -- expected: pass (pipeline unchanged)

**Manual checks (if no CLI):**
- Inspect `line.ts` loop no longer uses `dest=i-1` without scan and uses `line.length`

## Auto Run Result

Status: done

Summary: Fixed DW-74 single-pass compaction (multi-gap) and DW-20 short-input guards in `triade/src/engine/core/line.ts` (scan past consecutive nulls, length-based guards) with regression pins in `line-compaction.regression.test.ts`; updated `game.test.ts`/`transitionPlan.test.ts` wall expectations; verified `line.test.ts`/`line-moved`/`game.test` pass and full suite down to 11 expected-RED failures from 19.

Files changed: `triade/src/engine/core/line.ts`, `triade/__tests__/engine/line-compaction.regression.test.ts`, `triade/__tests__/engine/game.test.ts`, `triade/__tests__/render/transitionPlan.test.ts`, `spec-engine-line-compaction.md`

Verification: `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/line.test.ts __tests__/engine/line-moved.unit.test.ts __tests__/engine/line-compaction.regression.test.ts` — 43 pass; `__tests__/engine/*.test.ts` — 182 pass; full suite — 11 fail (all expected RED).

Residual risks: none — 4x4 contract unchanged, GRID_SIZE=4 preserved, merge-once semantics retained.
