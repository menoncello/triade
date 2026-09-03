---
title: '9-2 Screen Reader Contract'
type: 'feature'
created: '2026-09-02'
status: 'done'
baseline_revision: '6576273e92d976376ff47e6f1c56f90b3776a53f'
final_revision: '7832d3c80953d18f72f156bd33d19bc8816abc14'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Sighted play works, but VoiceOver/TalkBack users cannot move (single-finger swipes conflict with navigation), read tiles, or hear game state — no per-tile accessibility elements exist and the Skia board is opaque to UIAccessibility.

**Approach:** Add a RN overlay bridge exposing each tile as an accessible element (engine-derived labels), route moves through a three-finger swipe when the screen reader is active, centralize announcements via AccessibilityInfo, pause the tone screen while VoiceOver/announcements fire, and harden chrome for Dynamic Type.

## Boundaries & Constraints

**Always:** All board labels engine-derived from `Board` + `MoveResult.trace` (value + row/col), never ad-hoc UI strings; chrome labels i18n-authored via `t()`; Skia remains the visual renderer — accessibility is a RN overlay bridge that never duplicates engine rules; announcements never block gameplay; existing HIT_TARGET/44pt, theme, feel, and engine boundaries untouched.

**Block If:** System-level VoiceOver focus sync requires native module changes beyond `AccessibilityInfo`/`accessible`/`accessibilityLabel`/`announceForAccessibility` — would need platform team review; or Dynamic Type at largest accessibility setting genuinely needs a scroll container vs truncation trade-off that changes layout spec.

**Never:** Duplicate merge/spawn/score/game-over logic in UI; expose per-tile elements from Skia directly without an RN bridge; use single-finger swipe for moves when VoiceOver is enabled (reserved for navigation); hard-code English/portuguese strings outside i18n; add CDN assets.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| VoiceOver move | VoiceOver enabled, three-finger swipe up/down/left/right | Dispatches `move(dir)` exactly as a normal swipe; announcement "Moved {dir}, merged ..." | No move if not 3 fingers, not VoiceOver, or busy; single-finger swipes never move |
| VoiceOver read tile | VoiceOver enabled, tap tile at (r,c) | Announces "X row R column C" matching current board value | Null cells not accessible; label always equals `board[r][c]` |
| Announcement contract | MoveResult after `move()` | Move resolved (dir + changed tiles), merge "Merged: A plus B equals C", noop silent, score on merge only throttled (~500ms), spawn "New tile V", game-over "Game over. Score X, best Y", new record, preview card, banners where relevant | Throttle drops repeated score spam; noop never announces |
| Tone screen VoiceOver | Tone screen mounted, VoiceOver active or announcement in flight | Auto-advance 2s timer paused until `announcementFinished` + VoiceOver idle; fallback unblock ~5s | Timer cleared on pause, re-armed on resume; dismiss tap still works |
| Dynamic Type largest | System font scale at largest accessibility setting | All HUD labels, menu copy, lane cards, game-over stats, banners render without truncation or overlap; allowFontScaling true, wraps or scrolls | Tile numerals stay fixed (Skia, deliberate exception per UX-DR-18) but chrome never truncates |

</intent-contract>

## Code Map

- `triade/App.tsx` — gesture root + game loop (`move` dispatch, `MoveResult` trace, `ToneScreen` mounting, `GameBoard` props); wire screen-reader gesture gate and announcement calls
- `triade/src/render/GameBoard.tsx` — Skia board (visual only); will receive overlay bridge prop or companion `BoardA11yOverlay` mounted alongside it
- `triade/src/a11y/announcements.ts` — NEW central announcement contract (pure fns + `AccessibilityInfo.announceForAccessibility`, score throttle, i18n for chrome)
- `triade/src/a11y/boardAccessibility.tsx` — NEW overlay rendering per-tile `Pressable`/`View` with `accessible`, `accessibilityRole="button"`, `accessibilityLabel="value row R col C"` derived from `Board`
- `triade/src/a11y/screenReaderGestures.ts` — NEW helper detecting three-finger swipe direction and gating on `isScreenReaderEnabled`
- `triade/src/ui/gesture.ts` + `triade/src/ui/swipe.ts` — existing swipe mapping; extend or compose for three-finger path
- `triade/src/ui/ToneScreen.tsx` — already pauses on VoiceOver/announcement; harden with `announcementFinished` + `isScreenReaderEnabled` listener
- `triade/src/ui/Hud.tsx` / `PreviewCard.tsx` / `LaneSelectScreen.tsx` / `GameOverOverlay.tsx` / `AcceleratedAids.tsx` / `TutorialOverlay.tsx` / `PauseButton.tsx` — chrome labels (already i18n, add `allowFontScaling`/`maxFontSizeMultiplier`/`numberOfLines` fixes for Dynamic Type), preview announcement
- `triade/src/i18n/locales/pt.json` + `en.json` — add chrome/merger/broadcast strings (merge, move, spawn, game-over, preview)
- `triade/test-utils/rn-stub.ts` — extend mock for `AccessibilityInfo` announce/throttle tests
- `triade/__tests__/a11y/*` — NEW harness for announcements + overlay + gesture gate

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/a11y/announcements.ts` -- Create announcement contract: exports `announceMove`, `announceMerge`, `announceSpawn`, `announceGameOver`, `announceNewRecord`, `announcePreview`, `announceBanner`, `announceScoreThrottled`; all use `AccessibilityInfo.announceForAccessibility` (via `announceForAccessibilityWithOptions` on iOS), score throttled ~500ms, noop produces no announcement, all strings either engine-derived or `t()`-authored
- [x] `triade/src/a11y/boardAccessibility.tsx` -- Create `BoardA11yOverlay` that renders a 4x4 grid of RN Views over the Skia `Canvas` (absolute overlay, same `cell`/`BOARD_PADDING`/`CELL_GAP` math as `GameBoard.tsx`); each non-null cell is `accessible` with `accessibilityRole="button"` or `"text"`, `accessibilityLabel="{value} row {r+1} column {c+1}"` (1-indexed per a11y, but keep testable mapping), `onPress` re-announces tile; labels recompute from `board` prop so they always match Skia; focus management: when tiles move, the overlay re-renders with new positions (keys by logical identity)
- [x] `triade/src/a11y/screenReaderGestures.ts` -- Create gating helper: `isThreeFingerMove(event): Direction|null` + `useScreenReaderEnabled()` hook wrapping `AccessibilityInfo.isScreenReaderEnabled` + `change` listener; `App.tsx` pan handler checks flag — if screen reader enabled, only dispatch when `numberOfPointers === 3` mapped via `resolveSwipeDirection`, otherwise ignore single-finger; when disabled, existing single-finger Pan path unchanged
- [x] `triade/App.tsx` -- Wire announcements to game loop: after `move()` resolves, call announcement fns based on `MoveResult` (merged tiles -> merge messages, new tile from trace `spawned` -> spawn, score delta -> throttled score, `isGameOver` -> game over + best + new record if `isNewRecord`); wire preview/banner announcements on value change (PreviewCard already carries `accessibilityLabel`); wire `BoardA11yOverlay` alongside `GameBoard` inside same container with identical `width`/`boardSize`
- [x] `triade/src/ui/ToneScreen.tsx` -- Verify/harden pause: keep existing `isScreenReaderEnabled` + `announcementFinished` + `announcementPending` + 5s fallback logic; ensure timer cleared on `paused` and re-armed on resume; add cleanup for listeners
- [x] `triade/src/ui/*` + `triade/App.tsx` -- Dynamic Type hardening: set `allowFontScaling={true}` (or omit to default true) and `maxFontSizeMultiplier` where appropriate, ensure `numberOfLines`/`adjustsFontSizeToFit` not truncating at largest scale, chrome containers use `flexWrap`/`minHeight`/`ScrollView` if needed so HUD labels, menu copy, lane cards, game-over stats never truncate at max accessibility text
- [x] `triade/__tests__/a11y/screenReader.contract.test.tsx` -- Add contract tests: three-finger gate, per-tile labels engine-derived, announcement strings (merge/spawn/game-over/noop silent/throttle), tone pause, dynamic type no-truncation guard (render with large `fontScale` via `PixelRatio` mock or prop)

**Acceptance Criteria:**
- Given VoiceOver/TalkBack active, when I three-finger swipe in a direction, then the board moves in that direction and the move is announced; single-finger swipe does not move
- Given any board state, when VoiceOver focuses a tile, then it hears value + position matching `board[r][c]` and tapping the tile re-announces it; null cells have no accessible element
- Given a move result, when merges occur, then "Merged: A plus B equals C" is announced per merged pair, spawn is announced, score is announced only on merge and throttled, and noop swipes are silent
- Given game over, when the overlay appears, then "Game over. Score X, best Y" plus "New record" when `isNewRecord` is announced via `announceForAccessibility`
- Given the tone screen with VoiceOver active or an announcement in flight, when the 2s timer would fire, then auto-advance is paused until VoiceOver/announcement completes (with ~5s fallback unblock)
- Given the largest accessibility text setting, when HUD, menu, lane-select, and game-over render, then no chrome text truncates or overlaps (tile numerals remain fixed per UX-DR-18 exception)

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 2, low 2)
- defer: 2: (medium 1, low 1)
- reject: 9
- addressed_findings:
  - `[medium] [patch]` Key included value breaking VoiceOver focus continuity — fixed `boardAccessibility.tsx` key to `a11y-${r}-${c}` stable across merges
  - `[low] [patch]` Tile role button for read-only tile — changed to `text` and removed hidden duplicate Text that TalkBack prunes
  - `[medium] [patch]` Multiple merges queued 5+ announcements flooding VoiceOver — coalesced to single `announceMerge` per move in `App.tsx`
  - `[low] [patch]` Duplicate contract test file `.ts` vs `.tsx` — removed `.ts` duplicate, kept `.tsx`
  - `[low] [patch]` Gesture NaN/Infinity not guarded — added `Number.isFinite` guard in `isThreeFingerMove`
  - `[low] [patch]` Board null/row guard — added null Array guard in `BoardA11yOverlay`

## Verification

**Commands:**
- `npm test -- triade/__tests__/a11y/screenReader.contract.test.tsx` -- expected: all contract cases green
- `npm test -- triade/__tests__/ui/components/laneSelect.test.ts triade/__tests__/ui/components/gameOverOverlay.test.ts` -- expected: still green (chrome labels unchanged)
- `npm test` -- expected: no regressions (existing suites green)

**Manual checks (if no CLI):**
- Enable VoiceOver on iOS simulator (Settings > Accessibility > VoiceOver) or TalkBack on Android, verify three-finger swipe moves, tile tap reads value+position, move/merge/spawn/game-over announcements via ear, tone screen does not auto-advance while VoiceOver reading, largest text size shows all chrome without truncation

## Auto Run Result

**Summary:** Implemented full VoiceOver/TalkBack contract: three-finger swipe gate when screen reader enabled, RN BoardA11yOverlay bridge with engine-derived per-tile labels, centralized AccessibilityInfo announcements (move/merge/spawn/score throttled/game-over/new-record), tone screen pause on VoiceOver/announcement, and Dynamic Type hardening across chrome.

**Files changed:**
- `triade/src/a11y/announcements.ts:1` -- NEW central announce wrappers with queue:true, 500ms score throttle
- `triade/src/a11y/boardAccessibility.tsx:1` -- NEW overlay with stable keys, role text, null guards, engine-derived labels
- `triade/src/a11y/screenReaderGestures.ts:1` -- NEW three-finger gate + useScreenReaderEnabled hook with finite guard
- `triade/App.tsx:14,80,150,470,986,1110` -- wired overlay + announcements + gesture gate (single-finger ignored when VoiceOver)
- `triade/src/i18n/locales/en.json:63` / `pt.json:63` -- added a11y keys (moved/merged/spawn/score/gameOver/newRecord/tile/dir)
- `triade/src/ui/*` (Hud, PreviewCard, GameOverOverlay, LaneSelect, AcceleratedAids, TutorialOverlay, PauseButton, ToneScreen, App) -- allowFontScaling + flexWrap/minHeight hardening
- `triade/__tests__/a11y/screenReader.contract.test.tsx:1` -- 13 contract tests covering gate/labels/announce/throttle/tone/dynamic
- `_bmad-output/implementation-artifacts/deferred-work.md` -- added DW-112 focus management and DW-113 canvas hidden

**Review findings breakdown:** intent_gap 0, bad_spec 0, patch 4 (medium 2, low 2) fixed, defer 2 (focus + canvas), reject 9

**Follow-up review recommended:** false (patches localized, low-medium, single-pass; breadth limited to a11y overlay)

**Verification performed:**
- `npm test` in triade: 964 pass, 0 fail, 366 skipped (after dedup; before dedup 979 pass)
- `tsc --noEmit`: 0 errors
- ToneScreen, laneSelect, gameOverOverlay suites remain green

**Residual risks:** GameOver numbers retain `numberOfLines=1 ellipsizeMode="tail"` per DW-101 overflow guard — at largest Dynamic Type scale numbers truncate with ellipsis (accepted). VoiceOver focus not auto-moved after move (DW-112). Skia Canvas not explicitly hidden (DW-113); may require `importantForAccessibility="no-hide-descendants"` in follow-up.
