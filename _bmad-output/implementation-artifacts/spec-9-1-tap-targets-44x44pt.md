---
title: '9-1 Tap targets ≥44×44pt'
type: 'feature'
created: '2026-09-02'
status: 'done'
baseline_revision: '8901f6305d6e475b3005cffb552f9fbef77a95d1'
final_revision: 'c32eaeed5a06137e730ab614969308bda9d319f3'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Touch targets below 44×44pt cause miss-taps for motor-constrained players and fail WCAG/Apple HIG; current codebase mostly enforces 44pt but one primary CTA uses a fixed 48×48 square that truncates long labels and lacks defensive min-target hygiene.

**Approach:** Audit every Pressable/Touchable in `triade/src/ui` + `App.tsx`, enforce ≥44×44pt at the component level via `HIT_TARGET` (48pt exported from `PauseButton.tsx`), fix the GameOver primary CTA to use minWidth/minHeight + padding instead of fixed square, and add a static audit test so future chrome cannot regress.

## Boundaries & Constraints

**Always:** All touchable elements ≥44×44pt enforced at component level (not per-screen); pause button ≥44×44 and outside board swipe rect inside safe margins; targets never overlap board swipe-capture zone; HIT_TARGET stays exported as integer ≥44 from `PauseButton.tsx` and is referenced directly for width/height; theme/feel/engine purity undisturbed.

**Block If:** New touchable surface requires human visual sign-off on layout trade-offs (e.g., shrinking board to fit 44pt in landscape band) beyond mechanical min-target fix — would need design decision.

**Never:** Overlap board `Gesture.Pan` capture rect with chrome buttons; duplicate engine/spawn/score rules in UI; change monetization/haptics/audio behavior; reduce HIT_TARGET below 44; add per-screen ad-hoc 44 fixes instead of component-level constants.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Portrait HUD assist | Accelerated lane with canUndo=true, portrait | Undo/Hint buttons 48×48 min, hitSlop optional, outside preview zone | No error |
| Landscape thin band | isLandscape true, score+preview+pause in 48pt band | Pause stays 48×48 inside safe margin, never overlaps board | No error |
| GameOver restart CTA | gameOver true, label "Jogar de novo" (PT/EN) | Primary CTA min 48×48, padding lets label breathe, centered, no truncation | Fallback: text ellipsize disabled, button grows |
| Banner dismiss | Ceiling/Stuck banner visible | × dismiss 48×48 min, accent edge preserved | No error |
| LaneSelect confirm/cancel | pendingIndex set | Confirm/Cancel each 48 min height, flex 1, no overlap | No error |
| Tone skip | tone screen first launch | Whole-screen Pressable is the hit target (>>44), tap anywhere dismisses | VoiceOver pause handled by existing timer gate |

</intent-contract>

## Code Map

- `triade/src/ui/PauseButton.tsx` -- canonical HIT_TARGET=48 export + button box (width/height reference checked by `ui.thinview.test.ts:67`)
- `triade/src/ui/Hud.tsx` -- assistBtn (minWidth/minHeight HIT_TARGET), pauseSlot, landscape band (UX-DR-6 placement outside swipe rect)
- `triade/src/ui/LaneSelectScreen.tsx` -- cards 88 min, warningConfirm/Cancel 44, cta/restore/langBtn 44
- `triade/src/ui/GameOverOverlay.tsx` -- primary cta (fix: fixed square → minWidth/minHeight + padding), continueAd/Iap/Cancel 44
- `triade/src/ui/AcceleratedAids.tsx` -- dismissBtn/adBtn/iapBtn/cancelBtn 44 min
- `triade/src/ui/TutorialOverlay.tsx` -- skipBtn 44 min
- `triade/src/ui/ToneScreen.tsx` -- whole-screen skip (flex:1 Pressable)
- `triade/App.tsx` -- menuBtn (Pistas) 44 min, boardWrap vs chrome isolation
- `triade/src/ui/layout.ts` + `triade/src/ui/useSyncedLayout.ts` -- band/best placement, safe-margin, boardSize

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/ui/GameOverOverlay.tsx` -- Replace fixed `width: HIT_TARGET, height: HIT_TARGET` on `styles.cta` with `minWidth: HIT_TARGET, minHeight: HIT_TARGET, paddingHorizontal: 24, width: 'auto'` so "Jogar de novo" never truncates while keeping ≥44×44 floor
- [x] `triade/src/ui/GameOverOverlay.tsx` -- Ensure `continueAd/continueIap` keep `minHeight: HIT_TARGET` and add `minWidth: HIT_TARGET` for explicit floor when flex shrinks (defensive)
- [x] `triade/__tests__/ui/tapTargets.audit.test.ts` -- Add static audit: grep every `Pressable` style in `src/ui` + `App.tsx` must resolve to ≥44pt floor (minHeight/minWidth or width/height ≥44 or flex+min fallback); fail if any touchable style lacks HIT_TARGET/min check
- [x] `triade/src/ui/*` + `triade/App.tsx` -- Manual grep audit pass: confirm no Pressable lacks 44 floor, no chrome overlaps `GameBoard` GestureDetector rect (pauseSlot outside boardWrap, assist rows absolute outside board)

**Acceptance Criteria:**
- Given every touchable element in the app, when UI renders, then every Pressable has computed hit area ≥44×44pt (via minHeight/minWidth ≥44 or width/height = HIT_TARGET=48) -- enforced at component level
- Given the GameOver primary CTA, when label is "Jogar de novo" / "Play again", then button grows horizontally with padding and never truncates while staying ≥44×44
- Given the pause button, when rendered in portrait or landscape, then it is 48×48, outside the board swipe rect, inside safe margins (insets + 16pt), and never overlaps the GestureDetector
- Given banner dismiss ×, leaderboard tab placeholder, tone skip, and every menu row, when measured, then each meets ≥44×44 (menu rows ≥48 min) and tone skip covers whole screen

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2
- addressed_findings:
  - none

## Verification

**Commands:**
- `npm test -- triade/__tests__/ui/ui.thinview.test.ts` -- expected: HIT_TARGET ≥44 and width/height reference checks pass
- `npm test -- triade/__tests__/ui/tapTargets.audit.test.ts` -- expected: new audit passes (no Pressable below 44)
- `npm test -- triade/__tests__/ui/layout.doc-layout-count-sync.atdd.test.ts triade/__tests__/ui/tileNumerals.test.ts` -- expected: unrelated a11y/layout tests still green

**Manual checks (if no CLI):**
- Grep `Pressable` styles for missing minHeight/minWidth; measure GameOver CTA with long label in simulator portrait/landscape; verify pause button outside board rect via layout inspector

## Auto Run Result

**Summary:** GameOver primary CTA fixed from fixed 48×48 square to minWidth/minHeight + padding so "Jogar de novo" breathes while keeping ≥44 floor; continueAd/continueIap/continueCancel gain explicit minWidth 48 defensive; guard tests relaxed to accept minWidth/minHeight; new static audit test added.

**Files changed:**
- `triade/src/ui/GameOverOverlay.tsx:218` -- cta square -> minWidth/minHeight + paddingHorizontal/paddingVertical
- `triade/src/ui/GameOverOverlay.tsx:253,265,282` -- continueAd/continueIap/continueCancel add minWidth HIT_TARGET
- `triade/__tests__/ui/components/gameOverOverlay.test.ts:193,410` -- guard regex accepts minWidth/minHeight, hasStyle accepts minWidth
- `triade/__tests__/ui/components/app.restart.test.ts:369` -- same guard relax
- `triade/__tests__/ui/tapTargets.audit.test.ts` -- new audit (4 tests) enforcing >=44 across all ui Pressables
- `_bmad-output/implementation-artifacts/epic-9-context.md` -- compiled epic context
- `_bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md` -- new spec

**Review findings breakdown:** intent_gap 0, bad_spec 0, patch 0, defer 0, reject 2 (noise: existing fixed-size guard strictness, now relaxed)

**Follow-up review recommended:** false (small, targeted, fully tested)

**Verification performed:**
- `npm test` in triade: 964 pass, 0 fail, 366 skipped (all suites green after fix)
- `tapTargets.audit.test.ts`: 4/4 pass
- `ui.thinview.test.ts`: HIT_TARGET >=44 holds

**Residual risks:** Leaderboard tabs not yet implemented — future leaderboard component must follow same 44pt floor (covered by audit test expectation; will fail if omitted). Board swipe zone isolation relies on layout.ts SAFE_MARGIN + bandTop — change to band heights must keep 48pt floor.
