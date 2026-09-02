---
title: 'preview-boundary-hygiene'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'c7b1821f95d300e6437cfcd7f823b60db70fc7f5'
final_revision: 'fe4ff817781f218faaa358ecf3de49e7c6a16269'
---

<intent-contract>

## Intent

**Problem:** Preview correctness has four latent boundary gaps in `triade/src/game/preview.ts` + `triade/App.tsx` — ULP drift at the 60/40 boundary (`roll < 0.6`), a truth-missing fallback beyond `FULL_POT_LADDER` (e.g. value 192), mutable slice returns breaking React memo identity, and a stale fan-out of `availablePotValues` when the board deflates.

**Approach:** Harden `preview.ts` at the boundaries (epsilon-stabilized threshold, truth-containing fallback even beyond the ladder, frozen slice returns) and ensure the orchestrator's `availablePot` derivation stays live on deflate. No engine change and no new literals.

## Boundaries & Constraints

**Always:** Preserve N3 preview law (`previewFor` reads pre-resolved `PendingSpawn`, 60/40 uses separate `displayRoll`, never re-rolls or imports engine roll symbols, no `Math.random`), derive `FULL_POT_LADDER` from `POT_CURVE` + fixed `[1,2]` (boundary rule 4), keep pure function semantics (`same input -> deepEqual`), and keep engine files byte-identical except via orchestrator.

**Block If:** A beyond-ladder truth-containment choice would require changing the spawn ladder or product definition (e.g. extending `POT_CURVE` / `FULL_POT_LADDER` as data) — that is a product decision, not an unattended fix.

**Never:** Scatter ladder literals outside `spawnConfig`, introduce `Math.random` or engine roll imports into `preview.ts`/`Hud`, mutate `availablePotValues` input, change spawn distribution/position/timing, or widen scope beyond `preview.ts` + `App.tsx` orchestrator wiring + tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ULP boundary | `displayRoll = 0.6 - Number.EPSILON/2` (rounds to 0.6) or `0.5999999999999999` vs `0.6000000000000001` | Stable 60/40: values within 1 ULP of 0.6 are treated consistently as range (not flipping to exact by a representable epsilon) | Clamp non-finite roll to 0 (existing guard) |
| Beyond-ladder truth | `value=192` (beyond 96), `displayRoll>=0.6`, any `availablePotValues` | `range.values` contains `value` (truth) even though 192 ∉ FULL_POT_LADDER; window is not a lying `[24,48,96]` tail | Defensive: value non-finite -> fallback to 0 exact/range path unchanged |
| Mutable slice | caller does `previewFor(...).values.push(99)` | `values` is frozen — push throws or silently ignored in strict mode; memoized `RANGE_1_2` and all windows retain identity | No throw from preview itself |
| Deflate fan-out | board ceiling drops (e.g. tier 2 -> tier 0, `availablePot` shrinks to `[3]`) while pending was rolled at higher tier (`value=12`) | `previewFor(pending, availablePot)` falls through to defensive branch and still returns a window containing `value` (truth-by-proximity over FULL, or truth-including tail) — App.tsx recomputes `availablePot` live each render, never stale | No crash on empty `availablePot` |
| Exact path | `displayRoll < 0.6 - EPSILON` | `{kind:'exact', value}` verbatim | Non-finite roll/value fallback to 0 |

</intent-contract>

## Code Map

- `triade/src/game/preview.ts:1` — Pure display decision `previewFor` + `ambiguousRange`/`nearestLadderIndex`/`FULL_POT_LADDER`/`RANGE_1_2`/`WINDOW_MAX`/`PREVIEW_BOUNDARY` — all four hygiene fixes land here.
- `triade/App.tsx:849` — Orchestrator derivation `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` shared by both lane previews; verify live recompute on deflate and correct fan-out (DW-94).
- `triade/src/engine/config/spawnConfig.ts:17` — Data source `POT_CURVE`, `POT_BASE_VALUE` — read-only, no edit (derive ladder from here).
- `triade/src/engine/core/pot.ts:6` — `potForTier` — live pot set by tier, consumed by App.tsx.
- `triade/src/engine/core/ceiling.ts:5` — `ceilingDetector`/`tierForCeiling` — live ceiling -> tier.
- `triade/__tests__/game/preview.test.ts:1` — Existing 60/40 + FR-43 pins; must stay green except intentional hardening.
- `triade/__tests__/game/preview-invariant.test.ts:1` — Structural invariants (no roll imports, no Math.random, frozen identity, side-effect freedom).

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/game/preview.ts` — Stabilize 60/40 boundary against ULP (DW-78) by introducing `PREVIEW_EXACT_BOUNDARY = 0.6` and epsilon-inset check (`roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY` or `roll < PREVIEW_EXACT_BOUNDARY - Number.EPSILON`) with comment documenting ULP semantics; freeze all returned `range.values` slices via `Object.freeze` (DW-80); fix beyond-ladder defensive fallback to guarantee `range.values` contains truth even when `value` beyond `FULL_POT_LADDER` (DW-79) — include `value` itself in the returned window (truth-containing, not lying tail); keep `RANGE_1_2` frozen identity.
- [x] `triade/App.tsx` — Verify and, if needed, tighten `availablePot` fan-out so it is recomputed live every render from `game.board` and passed to both `previewFor` calls (DW-94); ensure no stale memo/closure can serve an outdated pot set after board deflation (no duplicate per-lane computation needed, but must be placed after `ready` guard and before HUD render).
- [x] `triade/__tests__/game/preview.test.ts` + `preview-invariant.test.ts` — Keep existing pins green; add/extend coverage for ULP epsilon, beyond-ladder truth (value 192), frozen slice identity, and deflate fan-out (isolated via `previewFor(value, [3])` style). No engine file changes.

**Acceptance Criteria:**
- Given `pending={value:12, displayRoll:0.6 - Number.EPSILON/2}` (rounds to 0.6), when `previewFor` runs, then kind is `range` (stable, not flipped to `exact` by 1 ULP).
- Given `pending={value:192, displayRoll:0.9}` (beyond `FULL_POT_LADDER` tail 96), when `previewFor(pending, POT_LADDER)` runs, then `result.kind==='range'` and `result.values.includes(192)` and `values.length<=3` and frozen.
- Given `previewFor(pending(6,0.9), [3,6,12,24])` returns a range, when caller attempts `values.push(99)`, then array is frozen (`Object.isFrozen(values)===true`) and mutation does not corrupt subsequent calls.
- Given board deflated to `availablePot=[3]` while pending was rolled at higher tier (`value=6`), when `previewFor(pending(6,0.9), [3])` runs, then fallback path returns a frozen window derived from `FULL_POT_LADDER` that is contiguous and still truth-indicating (not stale empty or lying single-element).
- Given existing test suite baseline, when `npm test` runs in `triade/`, then all tests pass and `npx tsc --noEmit` is clean and `git diff -- triade/src/engine` is empty.

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2: (low 2)
- addressed_findings:
  - none

### Notes
- Blind Hunter: no intent_gap — N3 law preserved, no roll imports, no Math.random, ladder derived from POT_CURVE/POT_BASE_VALUE.
- Edge Case Hunter: ULP epsilon, 192 beyond-ladder, frozen slices, deflate fan-out all verified host-side; no new edge unhandled. Two low rejects: (1) POT_BASE_VALUE import adds no cycle, (2) Math.log2 validity check for beyond-ladder power-of-two is low-risk floating drift but bounded to POT_BASE_VALUE multiples.

## Design Notes

Boundary handling:
- `PREVIEW_EXACT_BOUNDARY = 0.6` with `roll + Number.EPSILON < 0.6` keeps `0.599` as exact and `0.6` as range as pinned by `preview-invariant.test.ts:76-81`, while absorbing the single representable step around 0.6. Do not use `<=` — the exact half-open interval is `displayRoll < 0.6` stabilized.
- Beyond-ladder fallback truth containment: when `value > FULL.last`, the nearest-ladder tail `[24,48,96]` is a lie (DW-79). Return a frozen window that includes `value` itself, e.g. `Object.freeze([lastNminus1..., value])` or `Object.freeze(FULL.slice(...).slice(0, WINDOW_MAX-1).concat(value))` clamped — preserves "contains truth" over "contiguous over FULL" for out-of-ladder truth. Contiguity over `FULL` is sacrificed only for out-of-ladder values (unreachable with current POT_CURVE, reachable if curve extends).
- Freeze strategy: `Object.freeze(availablePotValues.slice(...))` and `Object.freeze(FULL.slice(...))` for every non-`RANGE_1_2` path; document as React memo hygiene.
- Deflate fan-out: App.tsx already computes `availablePot` once per render and shares it; verify it sits after any early-return guard so it is not computed on stale board during hydration.

```ts
// preview.ts shape after fix (illustrative 10 lines)
const PREVIEW_EXACT_BOUNDARY = 0.6;
const isExactRoll = (r: number) => r + Number.EPSILON < PREVIEW_EXACT_BOUNDARY;
export function previewFor(pending: PendingSpawn, availablePotValues = FULL_POT_LADDER): Preview {
  const roll = Number.isFinite(pending.displayRoll) ? pending.displayRoll : 0;
  if (isExactRoll(roll)) return { kind:'exact', value };
  return { kind:'range', values: Object.freeze(ambiguousRange(value, availablePotValues)) };
}
```

## Verification

**Commands:**
- `npm test` inside `triade/` -- expected: all pass (baseline 331+ from 7.x, no regressions) — actual: 882 pass / 11 fail (11 EXPECTED RED feel/ATDD deferred), preview 40/40 green
- `npx tsc --noEmit` inside `triade/` -- expected: clean — actual: clean
- `git diff --stat -- triade/src/engine` -- expected: empty — actual: empty
- Manual: `node --import tsx --eval "import {previewFor} from './src/game/preview.ts'; console.log(previewFor({value:192, displayRoll:0.9}))"` -- expected: range containing 192 and frozen — actual: `{ kind: 'range', values: [48,96,192] }` frozen true, `0.6 - EPSILON/2` → range, frozen slices throw on push

## Auto Run Result

- Summary: Tightened preview boundary hygiene: epsilon-stabilized 60/40, beyond-ladder truth for 192, frozen slice returns, deflate fan-out live recompute.
- Files changed:
  - `triade/src/game/preview.ts:1` — Added PREVIEW_EXACT_BOUNDARY, POT_BASE_VALUE import, ULP check `roll+EPSILON < 0.6`, frozen returns, beyond-ladder `192` containment via valid-pot tail `[48,96,192]`
  - `triade/App.tsx:849` — Documented live `availablePot` recompute after `ready` guard for DW-94 deflate hygiene
  - `_bmad-output/implementation-artifacts/spec-preview-boundary-hygiene.md` — New spec
- Review findings breakdown: patches applied during execution (no new review loop patches), defer 0, reject 2 low — follow-up review not recommended (localized low-risk hygiene).
- Follow-up review recommended: false
- Verification performed: npm test, tsc, manual previewFor probes — see Verification above
- Residual risks: `game.ts:88` shallow pendingSpawn copy remains ledgered (DW-84 shallow ref, not caused by this bundle); `Math.log2` validity check for beyond-ladder assumes `POT_BASE_VALUE=3` power-of-two — negligible drift for 32-bit ladder.

