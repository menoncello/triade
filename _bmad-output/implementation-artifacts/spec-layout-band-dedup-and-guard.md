---
title: 'layout-band-dedup-and-guard'
type: 'refactor'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '80dc5c1c6a02f56dc1f3335100c64d9d266314b7'
final_revision: 'a09e6ed23b968201717a4848cb1cff148172ac4e'
---

<intent-contract>

## Intent

**Problem:** Container-driven layout math propagates NaN when hypothetical non-finite inputs reach `layoutFor`, and the HUD band height formula is duplicated between `App.tsx` and `Hud.tsx`.

**Approach:** Add a Number.isFinite guard at the top of `layoutFor` so NaN/Infinity degrades to a finite 0-clamped board, and extract the duplicated `insets.top + SAFE_MARGIN + bandHeight` formula into a single shared helper used by both call sites without changing finite-input behavior.

## Boundaries & Constraints

**Always:** Preserve 0-clamp behavior for degenerate containers; keep all finite runtime inputs from `useWindowDimensions` byte-identical; keep `layout.test.ts:232` degenerate-clamp test green; do not edit the deferred-work ledger (orchestrator records resolution).

**Block If:** Guard semantics would change finite-input outputs or require changing the 0-clamp contract; helper extraction would change visual layout for finite inputs.

**Never:** Change intended 0-clamp behavior; modify ledger file; add broad input sanitization beyond the requested Number.isFinite guard on `layoutFor` inputs; introduce new visual dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| NaN width | layoutFor({width:NaN,...}) | boardSize 0, finite bandHeight/isLandscape, no NaN propagation | Degrade to 0, no throw |
| Infinity insets.top | layoutFor({insets:{top:Infinity,...}}) | boardSize 0, finite outputs | Degrade to 0, no throw |
| Finite portrait phone | layoutFor({390,844, notch}) | Maximized square, bandHeight 96, isLandscape false | No error |
| Finite landscape phone | layoutFor({844,390, notch}) | Height-bounded square, bandHeight 48, isLandscape true | No error |
| Degenerate insets exceed container | layoutFor({320,480, top:2000}) | boardSize 0, bandHeight finite | Clamp to 0 (existing) |
| Band helper | bandTopFor(insets, bandHeight) | insets.top + SAFE_MARGIN + bandHeight | Same finite math as before |

</intent-contract>

## Code Map

- `triade/src/ui/layout.ts:33` -- defines `layoutFor` and constants `SAFE_MARGIN`, `PORTRAIT_BAND_HEIGHT`, `LANDSCAPE_BAND_HEIGHT`; needs guard + helper export
- `triade/App.tsx:100-101` -- computes `boardSize/bandHeight` via layoutFor and `bandTop = insets.top + SAFE_MARGIN + bandHeight`; will import helper
- `triade/src/ui/Hud.tsx:54` -- computes `topPad = insets.top + SAFE_MARGIN` and uses `topPad + bandHeight` for band height; will import helper
- `triade/__tests__/ui/layout.test.ts:232` -- degenerate-clamp test must keep passing; also verifies finite sweep at :189
- `triade/src/ui/orientation.ts` -- `isLandscape` used inside layoutFor

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/ui/layout.ts` -- add Number.isFinite guard at top of `layoutFor` degrading to boardSize 0 with finite bandHeight/isLandscape; extract shared helper for `insets.top + SAFE_MARGIN + bandHeight` (e.g. `bandTop(insets, bandHeight)` or `hudBandTop`) and export it
- [x] `triade/App.tsx` -- replace inline `insets.top + SAFE_MARGIN + bandHeight` with imported helper from `layout.ts`
- [x] `triade/src/ui/Hud.tsx` -- replace `topPad + bandHeight` band-height height formula with same imported helper (keep left/right/bottom pads local)

**Acceptance Criteria:**
- Given NaN or Infinity for width/height or any inset edge, when layoutFor is called, then boardSize is 0 and bandHeight/isLandscape are finite and no NaN propagates
- Given any finite width/height/insets, when layoutFor is called, then output is byte-identical to pre-change (portrait 96, landscape 48, maximized square, 0-clamp)
- Given `layout.test.ts:232` degenerate insets exceed container, when run, then boardSize is 0 and test passes
- Given App.tsx and Hud.tsx render, when band height is computed, then both use the single shared helper from `layout.ts` and no duplicated `insets.top + SAFE_MARGIN + bandHeight` formula remains in those files

## Spec Change Log


## Review Triage Log

### 2026-09-01 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2: (high 0, medium 0, low 2)
- addressed_findings:
  - none


## Design Notes

Helper is pure arithmetic: `return insets.top + SAFE_MARGIN + bandHeight`. Guard is early-return: if any of width, height, insets.top/bottom/left/right is not Number.isFinite, return `{boardSize:0, bandHeight: PORTRAIT_BAND_HEIGHT, isLandscape:false}` or equivalent finite fallback that satisfies "degrades to 0" — keep finite bandHeight/isLandscape and do not throw. Choice of fallback bandHeight/isLandscape for non-finite inputs is not observable in production (inputs always finite) but must be finite and consistent.

## Verification

**Commands:**
- `npm test -- triade/__tests__/ui/layout.test.ts` -- expected: all 14 layout tests pass including degenerate-clamp (232)
- `npx tsc --noEmit` -- expected: no type errors
- `npm test` -- expected: full suite green (or at least no new failures vs baseline)

**Manual checks (if no CLI):**
- Verify App.tsx and Hud.tsx no longer contain inline `insets.top + SAFE_MARGIN + bandHeight`

## Auto Run Result

Status: done

Summary: Added Number.isFinite guard at top of layoutFor (DW-5) degrading NaN/Infinity to boardSize 0 with finite bandHeight/isLandscape, and extracted duplicated band-height formula into shared getBandTop helper used by App.tsx and Hud.tsx (DW-10). Finite runtime behavior byte-identical; layout.test.ts:232 degenerate-clamp remains green; tsc clean.
