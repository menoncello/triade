---
title: 'Feel Shake Bullet Hardening — board-only bundle DW-106..110'
type: 'bugfix'
created: '2026-09-02'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '396a5714835c54a8798ca1948bdbf01f5838f69c'
---

<intent-contract>

## Intent

**Problem:** Feel-layer regressions: shake offset clipped by parent overflow, bullet trace entries without `spawned` or with `value<3` pollute merge/session-best calculations, and `GameBoard` propagates `NaN`/non-finite `width` into the bullet flash overlay style.

**Approach:** Board-only hardening in `triade/src/render/GameBoard.tsx` and `triade/src/feel/{shake,bulletTime}.ts`: toggle overflow visible during shake (or pad), gate trace filters on `spawned === true` / `value>=3`, and clamp overlay `width` to `Math.max(1, finiteWidth)`. DW-106 (cancelAnimation overlap) is accepted as low-jank and requires no code.

## Boundaries & Constraints

**Always:** Only touch `triade/src/render/GameBoard.tsx`, `triade/src/feel/shake.ts`, `triade/src/feel/bulletTime.ts`; pure helpers must remain non-throwing; Reduced Motion semantics unchanged; board-only (never chrome).

**Block If:** Needs unapproved deps, migration, or changes outside listed files.

**Never:** Edit deferred-work ledger; change engine/SKIA pipeline; alter DW-106 decision (jank accepted).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Shake clipped | Shake 5-8px with parent overflow hidden | Offset not clipped (overflow visible during shake or padded) | No throw |
| Trace missing spawned | Entry without `spawned` field | Excluded from merge/max calculations | Treated as non-merge |
| Trace value <3 | Entry value 0 / -1 / 2 | Excluded from sessionBestMerge | No max update |
| NaN width | `width=NaN` / Infinity / 0 | Overlay width clamped to `Math.max(1, finite)` | Fallback 1, never NaN style |

</intent-contract>

## Code Map

- `triade/src/feel/shake.ts` -- `maxShakeForTrace` filter logic; `SHAKE_CAP` clamp
- `triade/src/feel/bulletTime.ts` -- `maxMergeValue`/`nextSessionBest`/`isNewSessionBest` filters
- `triade/src/render/GameBoard.tsx` -- shake container overflow, bullet flash overlay width clamping
- `triade/src/feel/feel.ts` -- reference preset data (no edits expected)
- `triade/src/engine/core/types.ts` -- `TraceEntry` shape reference

## Tasks & Acceptance

**Execution:**
- [ ] `triade/src/feel/bulletTime.ts` -- Filter trace entries without `spawned === true` and with `value < 3` before computing sessionBestMerge/max; `isNewSessionBest`/`maxMergeValue`/`nextSessionBest` must all honor it -- fixes DW-108/DW-109
- [ ] `triade/src/feel/shake.ts` -- Same spawned/value>=3 guards in `maxShakeForTrace` (and any sibling path) -- prevents 0/negative polluting shake amplitude -- part of DW-107..109 hardening
- [ ] `triade/src/render/GameBoard.tsx` -- Toggle parent overflow to `visible` during shake (or add padding) so 5-8px offsets at edges are not clipped -- fixes DW-107
- [ ] `triade/src/render/GameBoard.tsx` -- Clamp `width` to `Math.max(1, finiteWidth)` before driving bullet flash overlay `width/height` style; never propagate NaN -- fixes DW-110
- [ ] Verify DW-106 remains no-op (jank accepted, no cancelAnimation change)

**Acceptance Criteria:**
- Given a trace entry `{from:[[0,0],[0,1]], value: 6}` without `spawned` field, when computing `maxMergeValue`/`maxShakeForTrace`/`shouldTriggerBulletTime`, then it is excluded from results
- Given a trace entry with `value: 0` or `2` or `-1`, when computing `sessionBestMerge`/`maxMergeValue`/`maxShakeForTrace`, then it does not update max
- Given `GameBoard` receives `width: NaN`, when rendering bullet flash overlay, then overlay style width/height is `1` (not NaN/Infinity) and no throw
- Given shake amplitude 5-8px active, when inspecting board container, then overflow is `visible` (or equivalent padding) so edge pixels are not clipped
- Given rapid second swipe at 60ms (before 130ms shake completes), then behavior remains truncated overlap (DW-106 accepted, no crash)

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm test -- triade/src/feel` -- expected: existing feel/shake/bulletTime tests pass; new guards verified
- `npx tsc --noEmit --project triade/tsconfig.json` -- expected: no type errors
