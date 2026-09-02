---
baseline_revision: e3c52ae
final_revision: db01dfa
title: 'Board shake width hardening'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

Fix board-only visual correctness for Epic 8 punch effects. Ensure the 5-8px directional shake is not clipped by toggling parent overflow to visible during the 130ms shake sequence or adding compensating padding, and validate GameBoard width as finite with Math.max(1, finiteWidth) fallback before driving the bullet flash overlay style so NaN never propagates to layout. Changes are in triade/src/render/GameBoard.tsx and triade/App.tsx boardWrap.

## Boundaries & Constraints

**Always:** Board-only shake (never chrome/Hud), 130ms sequence (30+40+30+30), capped SHAKE_CAP 8, ReducedMotion cancels. Width guard Math.max(1, finiteWidth) via Number.isFinite before overlay. Keep width, height: width literal for backward test.

**Block If:** Need to change engine, feel presets, or add deps.

**Never:** Edit deferred-work ledger; widen engine diff; break tsc or tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Shake with merge | moveResult.moved true, amplitude 2/5, direction left/right/up/down | Parent boardWrap overflow -> visible for 130ms then hidden; shakeX/Y withSequence drives correct axis | Invalid dir -> zero vector -> no shake + cancel notify; scheduleShakeVisible/cancelShakeNotify handle timer |
| NOOP/slide-only/no dir | moved false or amplitude 0 or direction missing | Cancel residual shake withTiming(0,20) and cancelShakeNotify -> hidden | Never throws |
| ReducedMotion toggle mid-shake | reducedMotion true | Snap shakeX/Y/bulletFlash to 0 withTiming 20 and cancelShakeNotify | useEffect [reducedMotion] handles |
| Width NaN/Infinity/undefined | width NaN | finiteWidth fallback 1, safeWidth 1, cell computed, overlay width/height 1 not NaN | Number.isFinite guard |
| Width 0/negative | width 0 | safeWidth Math.max(1, finite) => 1 | clamp to 1 |

## Code Map

- `triade/src/render/GameBoard.tsx:316-319` finiteWidth/safeWidth guard, `331-369` shakeNotifyTimerRef + schedule/cancel, `525-570` shake branching with DW-107 comment
- `triade/App.tsx:137` isBoardShaking state, `1020` boardWrap overflow visible conditional
- `triade/__tests__/feel/shake.atdd.test.ts:P2-05` expects overflow visible or BOARD_PADDING+SHAKE_CAP
- `triade/__tests__/feel/bulletTime.atdd.test.ts:P2-05` expects Number.isFinite(width) or Math.max(width
- `triade/__tests__/feel/reducedMotion.atdd.test.ts:P2-06` expects width, height: width literal

</intent-contract>

## Code Map

- triade/src/render/GameBoard.tsx: onShakeActiveChange, safeWidth, shakeNotify
- triade/App.tsx: isBoardShaking, boardWrap

## Tasks

- [x] Implement finiteWidth/safeWidth guard and use in all width/height styles
- [x] Add onShakeActiveChange callback and 130ms toggle logic with cancel branches
- [x] Wire App isBoardShaking state to boardWrap overflow visible
- [x] Verify tests 960 pass, tsc clean, strings present

## Verification

- npm --prefix triade run test 960 pass 0 fail
- triade/node_modules/.bin/tsc --noEmit clean
- hasVisibleFix true, hasPaddingFix true, Number.isFinite true, width literal true

## Auto Run Result
done
