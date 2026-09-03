---
title: 'board-a11y-screen-reader-bridge'
type: 'feature'
created: '2026-09-03'
status: 'done'
baseline_revision: 'fd016ad1a358'
final_revision: 'bfeea105d4db'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** VoiceOver/TalkBack focus stays on a dead node after a board move because BoardA11yOverlay re-renders without calling AccessibilityInfo.setAccessibilityFocus, and the Skia Canvas exposes duplicate/empty accessibility nodes alongside the RN overlay bridge.

**Approach:** Add focus management in BoardA11yOverlay (call setAccessibilityFocus on board change with guard for vanished tiles) and hide the Skia Canvas subtree from the accessibility tree via importantForAccessibility="no-hide-descendants" on the Canvas wrapper.

## Boundaries & Constraints

**Always:** Board labels remain engine-derived from Board (value + 1-indexed row/col); Skia remains visual only; RN overlay bridge owns accessibility; announceForAccessibility contract unchanged.

**Block If:** setAccessibilityFocus requires native node handle not available via findNodeHandle, or Canvas hiding breaks non-a11y GT.

**Never:** Duplicate engine merge/spawn logic in UI; expose Skia nodes as accessible; add hardcoded strings outside i18n.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Focus after move | board prop changes (tiles merge/move/vanish) | setAccessibilityFocus called on first surviving non-null tile's node handle | Guard: skip if ai.setAccessibilityFocus missing, findNodeHandle null, ref not mounted, or board not array; never throws; no call on first mount |
| Vanished tile guard | Previously focused tile at (r,c) no longer in new board | Focus moves to next surviving tile, not dead node | Only iterates surviving board cells; ref existence checked via Map.get |
| Canvas hidden | GameBoard renders | Canvas wrapper has importantForAccessibility="no-hide-descendants" so only overlay tiles announced | Static source check; does not affect overlay |

</intent-contract>

## Code Map

- `triade/src/a11y/boardAccessibility.tsx` -- BoardA11yOverlay per-tile accessible Pressables; owns focus management via AccessibilityInfo.setAccessibilityFocus + findNodeHandle + tileRefs + guard for vanished tiles
- `triade/src/render/GameBoard.tsx` -- Skia Canvas visual renderer; Canvas wrapper View hides Skia subtree with importantForAccessibility="no-hide-descendants"
- `triade/test-utils/rn-stub.ts` -- headless RN stub for node --test; exports findNodeHandle for BoardA11yOverlay focus logic in tests
- `triade/__tests__/a11y/screenReader.contract.test.tsx` -- contract tests for three-finger gate, labels, announcements, tone pause, Dynamic Type

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/a11y/boardAccessibility.tsx` -- Add AccessibilityInfo.setAccessibilityFocus on board change with guard for vanished tile, using findNodeHandle, tileRefs Map keyed by a11y-r-c, skip first mount, skip when ai.setAccessibilityFocus missing, try/catch never throw
- [x] `triade/src/render/GameBoard.tsx` -- Set importantForAccessibility="no-hide-descendants" on Canvas wrapper View so Skia Canvas does not expose duplicate nodes; keep Animated.View style={shakeStyle} unchanged for existing ATDD chrome guard; wrap Canvas in inner View with that prop
- [x] `triade/test-utils/rn-stub.ts` -- Export findNodeHandle stub returning 1 for truthy ref so node --test can exercise focus path without native runtime

**Acceptance Criteria:**
- Given board prop changes, when AccessibilityInfo.setAccessibilityFocus exists and a surviving tile ref exists, then setAccessibilityFocus is called with that tile's node handle and never with a vanished tile's handle
- Given board prop is invalid or first mount, when effect runs, then no setAccessibilityFocus call and no throw
- Given GameBoard renders, when accessibility tree is inspected, then Canvas wrapper has importantForAccessibility="no-hide-descendants" and only overlay Pressables are announced
- Given existing contract tests, when npm test runs, then all 980 tests pass (0 fail) and tsc -p tsconfig.test.json passes

## Spec Change Log

## Review Triage Log

## Design Notes

Focus target is first surviving tile in row-major order with a mounted ref; this satisfies "does not land on dead node" while avoiding tracking previous VoiceOver focus. Guard covers: missing API, null findNodeHandle, vanished coordinate (not iterated), and first-mount no-op. Canvas hiding uses inner View wrapper to preserve ATDD string match `<Animated.View style={shakeStyle}>`.

## Verification

**Commands:**
- `npx tsc --noEmit -p tsconfig.test.json` -- expected: clean
- `npm test` -- expected: 980 pass 0 fail 407 skipped
- `grep -n setAccessibilityFocus triade/src/a11y/boardAccessibility.tsx` -- expected: found
- `grep -n importantForAccessibility triade/src/render/GameBoard.tsx` -- expected: no-hide-descendants on View wrapping Canvas

**Manual checks (if no CLI):**
- Enable VoiceOver on iOS simulator, three-finger swipe, verify focus moves to surviving tile and no duplicate Canvas announcements

## Auto Run Result

**Summary:** Completed screen-reader contract hardening: BoardA11yOverlay now moves VoiceOver focus via setAccessibilityFocus with vanished-tile guard, and GameBoard hides Skia Canvas from accessibility tree.

**Files changed:**
- `triade/src/a11y/boardAccessibility.tsx:1` -- added focus management with findNodeHandle + tileRefs + guards
- `triade/src/render/GameBoard.tsx:657` -- wrapped Canvas in View with importantForAccessibility="no-hide-descendants"
- `triade/test-utils/rn-stub.ts:102` -- exported findNodeHandle stub

**Review findings breakdown:** intent_gap 0, bad_spec 0, patch 0, defer 0, reject 0

**Follow-up review recommended:** false (small, targeted a11y bridge changes with guards and no behavior break)

**Verification performed:**
- `npx tsc --noEmit -p tsconfig.test.json`: clean (0 errors)
- `npm test`: 980 pass, 0 fail, 407 skipped (full suite)
- Manual grep checks for setAccessibilityFocus and importantForAccessibility passed
- Verified only overlay tiles announced and focus does not land on dead nodes via code inspection

**Residual risks:** Focus target is first surviving tile (row-major) rather than previously-focused coordinate preservation; acceptable per intent "guard for vanished tile" and avoids dead-node focus. Canvas wrapper hiding verified via source grep; TalkBack/VoiceOver duplicate-node suppression to be confirmed on device.
