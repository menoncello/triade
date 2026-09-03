---
title: 'hud-score-a11y-polish'
type: 'bugfix'
created: '2026-09-03'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '2a9b0154c8471ba4437a53ddc4571c5066c09d49'
final_revision: 'b41ba16ecd536f5adcde0e4b6d89f06644890a74'
---

<intent-contract>

## Intent

**Problem:** Hud renders raw numbers (`{score}` / `{best}`) without PT thousands separator vs mockup's "3.240", and preview placeholder Views risk leaking to VoiceOver if not explicitly hidden.

**Approach:** Format `score` and `best` via `toLocaleString('pt-BR')` in `Hud.tsx` for both portrait and landscape, keep `PreviewCard` accessible announcement intact and `pointerEvents="none"` on preview chrome, with no layout overlap regression.

## Boundaries & Constraints

**Always:** Keep `PreviewCard` `accessibilityLabel` "Próxima (Label): value" and `pointerEvents="none"` on preview card/chrome; keep `Hud` overlay `pointerEvents` contracts (`box-none` outer, `none` on `landscapePreviews`); keep `76×76` portrait / `60×44` landscape box sizes; no engine/preview distribution change.

**Block If:** Need to change `PreviewCard` preview data shape, spawn distribution, or introduce new dependencies/animations into Hud.

**Never:** Change engine `preview.ts` distribution, mutate `FALLBACK_PREVIEW`, add `Animated`/`transform` to preview chrome, or regress `Hud` thin-view imports.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY small | score=123 best=456 | renders "123" / "Recorde 456" | No error |
| HAPPY thousands | score=3240 best=12456 | renders "3.240" / "Recorde 12.456" | No error |
| ZERO | score=0 best=0 | renders "0" / "Recorde 0" | No error |
| LARGE | score=1000000 | renders "1.000.000" | No error |
| NON_FINITE guard | score=NaN / Infinity | fallback to "0" or empty-safe (no throw, no "NaN" literal) | Render safe string |
| PREVIEW a11y | preview exact 3 label Clean | card accessibilityLabel "Próxima (Clean): 3", pointerEvents none | No error |
| PORTRAIT/LANDSCAPE no overlap | both orientations at 76×76 / 60×44 with formatted long string | no overlap with PauseButton, scoreWrap flex still wraps | No error |

</intent-contract>

## Code Map

- `triade/src/ui/Hud.tsx:46-167` -- renders score/best in portrait `scorePortrait`/`bestPortrait` and landscape `scoreLandscape`/`bestLandscape`; houses `LanePreview` + `FALLBACK_PREVIEW` guard; target for `toLocaleString('pt-BR')` formatting
- `triade/src/ui/PreviewCard.tsx:14-34` -- builds `displayOf` + `announcement` and exposes `accessibilityLabel` + `pointerEvents="none"`; verify unchanged but pinned
- `triade/__tests__/ui/components/hud.test.ts:58-151` -- existing HUD suite covering score/best tokens, pause button, 76×76 / 60×44 markers, range token, lane gating; assert formatting against these
- `triade/__tests__/ui/components/previewCard.test.ts:79-107` -- pins PreviewCard accent/announcement/label/pointerEvents invariants

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/ui/Hud.tsx` -- format `score` and `best` with `toLocaleString('pt-BR')` in both portrait and landscape renders; add small `formatScore` helper with `Number.isFinite` guard; ensure no "NaN" literal leaks and preview `pointerEvents` + a11y-hidden placeholder discipline remains (decorative LanePreview wrappers `accessible={false}`)
- [x] `triade/src/ui/Hud.tsx` -- verify `LanePreview` wrapper Views remain non-accessible (`accessible={false}` or default non-accessible) so empty placeholder does not leak to VoiceOver, while `PreviewCard` card itself stays `accessible` with correct `accessibilityLabel`

**Acceptance Criteria:**
- Given score 3240 in portrait, when Hud renders, then visible score text contains "3.240" (pt-BR thousands) not "3240"
- Given best 12456 in landscape, when Hud renders, then best line contains "12.456" (pt-BR) alongside "Recorde"
- Given score 0, when Hud renders portrait and landscape, then score shows "0" without throw
- Given any preview (exact/range) with label Clean/Accelerated, when PreviewCard renders via Hud, then card has `accessibilityLabel` "Próxima (Label): value" and `pointerEvents="none"` preserved
- Given portrait Hud with long formatted score "1.000.000", when rendered, then layout still shows `width:76 height:76` portrait chip and `pauseSlot` without overlap (no throw, existing hud.test markers still pass)
- Given landscape Hud, when rendered, then `minWidth:60 height:44` band plus `pointerEvents="none"` on `landscapePreviews` preserved

## Spec Change Log

## Review Triage Log

### 2026-09-03 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2
- addressed_findings:
  - none

## Design Notes

Formatter helper (keep inline, ~5 lines):
```ts
function fmt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0';
}
```
Use for both `{fmt(score)}` and `Recorde {fmt(best)}` in the four Text sites (portrait + landscape × score/best). Do not format `PreviewCard` values.

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/ui/components/hud.test.ts __tests__/ui/components/previewCard.test.ts` -- expected: all PASS including updated thousands assertions
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` -- expected: EXIT 0
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` -- expected: EXIT 0

**Manual checks (if no CLI):**
- Portrait + landscape render at score 3240 shows "3.240"; PreviewCard VoiceOver announcement still "Próxima (Clean): 3"; no overlap on PauseButton

## Auto Run Result

Status: done

Summary: Hud score/best now formatted via toLocaleString('pt-BR') (3.240 mockup parity) with Number.isFinite guard; LanePreview wrappers and preview containers explicitly accessible={false} while PreviewCard retains accessibilityLabel and pointerEvents none. Layout markers 76x76 / 60x44 and pointerEvents contracts preserved; tsc and hud/previewCard tests green.
