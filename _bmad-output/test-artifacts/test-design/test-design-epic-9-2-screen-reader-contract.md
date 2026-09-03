---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md'
  - '_bmad-output/implementation-artifacts/epic-9-context.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - 'triade/src/a11y/announcements.ts'
  - 'triade/src/a11y/boardAccessibility.tsx'
  - 'triade/src/a11y/screenReaderGestures.ts'
  - 'triade/App.tsx'
  - 'triade/src/ui/ToneScreen.tsx'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/src/ui/LaneSelectScreen.tsx'
  - 'triade/src/ui/AcceleratedAids.tsx'
  - 'triade/src/ui/TutorialOverlay.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/ui/PauseButton.tsx'
  - 'triade/src/i18n/locales/en.json'
  - 'triade/src/i18n/locales/pt.json'
  - 'triade/__tests__/a11y/screenReader.contract.test.tsx'
  - 'triade/test-utils/rn-stub.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 9 / Story 9-2 — Screen Reader Contract

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `9-2-screen-reader-contract`
**Scope:** Risk-based test design for the working-tree delta of story 9-2

> **Delta under assessment:** Committed delta `6576273` → `HEAD` (`b9db712 story 9-2-screen-reader-contract: implemented and reviewed via bmad-loop` + `7832d3c`/`417549b` spec finalisation) — 17 files `+825/-56` — 3 new `src/a11y/*` modules + wiring in `App.tsx` + i18n keys + Dynamic Type hardening across 8 chrome files. `git diff HEAD --stat` shows only `sprint-status.yaml` metadata (`9-2-screen-reader-contract: backlog → done`); the production change is already on `main` and assessed as the committed delta. Date window for `git diff` is `6576273..HEAD` (baseline per spec frontmatter).

---

## Executive Summary

**Scope:** 9-2 delivers the full VoiceOver/TalkBack contract on a Skia-only board: an RN `BoardA11yOverlay` bridge exposing every non-null tile as an accessible element with engine-derived `accessibilityLabel="{value} row {r+1} column {c+1}"` (1-indexed per a11y) and `accessibilityRole="text"` (patched from `"button"`), a three-finger gesture gate when `isScreenReaderEnabled` is true (`isThreeFingerMove` → `resolveSwipeDirection` → `doMove`, single-finger reserved for navigation), a centralised `AccessibilityInfo.announceForAccessibilityWithOptions(..., {queue:true})` contract (`announceMove`/`announceMerge`/`announceSpawn`/`announceScoreThrottled`/~500 ms/`announceGameOver`/`announceNewRecord`/`announcePreview`/`announceBanner`, noop silent), a `ToneScreen` pause (`paused = voiceOverActive || announcementPending`, 2 s auto-advance cleared while paused, ~5 s fallback unblock, `announcementFinished` listener for iOS), and Dynamic Type hardening (`allowFontScaling` + `flexWrap`/`minHeight` across HUD/PreviewCard/GameOver/LaneSelect/AcceleratedAids/TutorialOverlay/ToneScreen/PauseButton). Tiles remain Skia-drawn; the overlay never duplicates engine merge/spawn/score rules. 13 contract tests pin the delta in `triade/__tests__/a11y/screenReader.contract.test.tsx`; spec Auto Run Result reports `964 pass, 0 fail, 366 skipped` host plus `tsc --noEmit` clean.

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (score ≥6): 3
- Critical categories: BUS / TECH (gesture gate correctness against screen-reader navigation; focus continuity after move; announcement queue/throttle correctness)

**Coverage Summary:**

- P0 scenarios: 9 groups (13 `test()` cases in contract file + 2 static gates, ~1–2 hours host verification)
- P1 scenarios: 8 groups (chrome Dynamic Type mounts, preview/game-over wiring, i18n both locales, ~3–6 hours)
- P2/P3 scenarios: 7 groups (focus/canvas deferred, perf, TalkBack divergence, device manual VoiceOver, ~2–5 hours)
- **Total effort**: ~6–13 hours (~1–2 days wall-clock; host-only ~0.5 day, device VoiceOver ~0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Tile merges by shape/text beyond colour (9-3) & themes/light-dark/colour-blind + WCAG AA contrast (9-3/9-4)** | 9-2 is the screen-reader contract only; no grain/facet rendering, no token palette or contrast ratios are changed. | Own stories 9-3/9-4 each require their own test design; 9-2 does not assert `theme` or contrast. |
| **Engine merge/spawn/score rules, `pendingSpawn`/`previewFor`, pot/ceiling/tier, Skia animation (GameBoard/transitionPlan, shake/punch/bullet)** | ADR-01 purity: engine + `src/render` logic untouched except `GameBoard` is read-only visual; a11y reads `Board`/`MoveResult.trace` but never duplicates rules. | Engine suite (absolute + parity + `engine.purity`) remains gate; this plan asserts "no engine rule duplication in `src/a11y`" as static gate. |
| **Native VoiceOver/TalkBack focus engine beyond `AccessibilityInfo` API (`setAccessibilityFocus`, `importantForAccessibility="no-hide-descendants"` on Canvas)** | Deferred as DW-112/DW-113 — spec explicitly blocks on native-module sync requiring platform-team review; patch scope kept to `AccessibilityInfo`/`accessible`/`accessibilityLabel`/`announceForAccessibility`. | Tracked as open deferred work with mitigations below; 9-2 ships without auto-focus-move and without Canvas hide. |
| **Pinch-zoom (`user-scalable=no`), turf war `HIT_TARGET` 44pt audit** | Belongs to 9-1 and Epic 8; not touched in this delta beyond Dynamic Type `allowFontScaling`. 9-1 audit handles HIT_TARGET floor; pinch-zoom is DW-13. | Keep 9-1 audit green; do not re-assert HIT_TARGET as P0 here (reference only). |
| **RevenueCat / AdMob / purchase flows, leaderboards, GDPR/privacy** | Epic 4 + Epic 10 concerns; no monetisation code touched. | Existing Epic 4 suites remain gate; do not run IAP/AdMob harnesses for 9-2. |
| **Visual pixel-perfect / golden screenshot, Figma diff, haptics weight** | 9-2 is an a11y contract (labels + announcements + gesture gate), not a visual regression gate; tile size/colour/haptics (Epic 8) unaffected. | Manual VoiceOver ear-check + host contract tests are the proof; no Playwright visual baseline. |
| **Device farm scale (matrix of locales/devices/OS)** | Single-per-platform VoiceOver ear-check suffices for functional contract; full matrix is epic-scale. | P3 exploratory matrix (one iOS + one Android) as device gate, not CI matrix. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH / BUS | **Three-finger gate correctness vs VoiceOver/TalkBack navigation.** App pan handler gates on `screenReaderEnabledRef.current` → `isThreeFingerMove(event)` (`numberOfPointers===3` strict + `Number.isFinite` guard + `resolveSwipeDirection` with threshold/tie → null) vs legacy single-finger `handleGestureEnd`. Failure modes: TalkBack sends `numberOfPointers=undefined` (treated as null → correct), iOS reports 2 during 3-finger roll, or RN gesture drops pointer count → real 3-finger swipe ignored (false negative, no workaround for blind user); opposite false positive moves on 1-finger if `isScreenReaderEnabled` late or `change` listener races. Spec AC "single-finger never moves when VoiceOver active" is load-bearing and has no workaround. | 2 | 3 | **6** | Pin with existing P0 contract: `screenReader.contract.test.tsx` 3 tests on `isThreeFingerMove` (P threshold, tie, NaN/Infinity guard) + P0 static `App.tsx` gate (`useScreenReaderEnabled` + `isThreeFingerMove` + `screenReaderEnabledRef` + `BoardA11yOverlay` present + `announce*` wiring + noop silent). Add device ear-check (P1 manual) 3-finger moves, 1-finger no-move, busy-gate interaction. Treat `numberOfPointers !==3 → null` as invariant. | FE / QA | This story (P0 already landed; device check before merge) |
| R-002 | BUS / TECH | **VoiceOver focus continuity after move — dead node focus.** `BoardA11yOverlay` keys `a11y-${r}-${c}` stable across merges (spec patch fixed value-in-key), but after `board` prop changes the previously focused tile may have become `null` or moved value; without `AccessibilityInfo.setAccessibilityFocus` the user is left on a removed node, requiring extra explore gestures to recover. Deferred as DW-112; affects every move for blind users. | 2 | 3 | **6** | Immediate: acknowledge as accepted deferred (DW-112 open). Mitigate: re-render correctness verified (P0 label parity test updates prop board→6 and asserts new label), keep key stable (no value in key). Follow-up story: branch that adds `setAccessibilityFocus` to the destination cell or to the first non-null tile after `move` dispatch; pin with `AccessibilityInfo.setAccessibilityFocus` call assertion when landed. Do not block 9-2 on native focus API. | FE (follow-up) / QA | DW-112 follow-up (next a11y iteration) |
| R-003 | TECH / BUS | **Announcement contract correctness — coalescing, throttle, queue, i18n, noop silent.** After `move()` the App coalesces merge entries to a single `announceMerge` per move (patch P1- coalesced 5+ announcements flood) plus `announceSpawn` + `announceScoreThrottled` (~500 ms) + `announceGameOver`/`announceNewRecord` + `announceMove(dir)`; noop (`!result.moved`) must be silent; i18n keys `a11y.moved/merged/spawn/score/gameOver/newRecord/tile/dir.*` must exist both locales; iOS must use `announceForAccessibilityWithOptions(..., {queue:true})` else `announceForAccessibility` fallback (Android TalkBack). Failure mode: 5-merge burst queues 5 utterances, TalkBack truncates; throttle leaks via module singleton across tests; NaN/Infinity spawn/merge not guarded → `i18n.t` throws. | 2 | 3 | **6** | Pin with P0 announcement suite: 4 tests on `announcements.ts` (`merged/spawn/gameOver/newRecord/move/preview/banner` with i18n EN+PT, `NaN` → 0 length, empty string → 0 length, throttle window 500 ms via real timeout). Keep `safeAnnounce` try/catch + `queue:true` branch + `Number.isFinite` guards + `resetScoreThrottleForTests`. App-level: assert `result.moved` guard, merge coalesced to `first` only, `announceScoreThrottled` once per move, game-over score recomputed as `curScore + result.score` (not doubled). | FE | This story (P0 already green; keep) |

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Tile-label engine-derived parity & geometry + overlay math drift vs `GameBoard`.** Label is `i18n.t('a11y.tile', {value,row:r+1,col:c+1})` with fallback `${value} row ${r+1} col ${c+1}`; must always equal `board[r][c]` (value + 1-indexed position) and recompute on `board` prop change; overlay cell math must match `GameBoard.tsx` (`GRID=4, BOARD_PADDING=8, CELL_GAP=8, safeWidth=Math.max(1, finiteWidth), cell=Math.max((safeWidth-8*2-8*3)/4,1)`). Drift risk: overlay constants diverge, `width NaN/Infinity` yields NaN cell → VoiceOver tiles mis-aligned with Skia; `null` cells must render no Pressable; `board` may be non-array. | 2 | 2 | 4 | Keep P0 label suite: `tileLabel` 1-index check EN+PT, `BoardA11yOverlay` 5-tile non-null filter, prop update from `3→6` re-announces, `__BOARD_A11Y_CONSTANTS` deepStrict vs `GRID=4/PAD=8/GAP=8`, `Number.isFinite(width)?width:1` + `Math.max(1,…)` guards + `!Array.isArray(board)→null` + `!Array.isArray(row)→null`. Assert `accessibilityRole="text"` + `accessible` + `onPress → announceTile`. |
| R-005 | TECH | **ToneScreen pause liveness — `announcementFinished` iOS-only vs Android, fallback 5 s, paused invariant.** `ToneScreen.tsx:74 paused = voiceOverActive || announcementPending`; `voiceOverActive` via `isScreenReaderEnabled().then` + `change` listener, `announcementPending` true when VoiceOver active then false on `announcementFinished` else `setTimeout 5000` fallback; timer `clearTimeout(timerRef)` when `paused`, re-armed 2000 ms when resumed, cleanup both timers on unmount. Failure modes: Android never fires `announcementFinished` → fallback is the only unblock (5 s); rapid mount/unmount leaks timer; `announcementFinished` missing in stub → test passes but real device diverges. | 2 | 2 | 4 | Keep P0 Tone contract: 7 regex pins on `ToneScreen.tsx` src (`isScreenReaderEnabled`, `announcementFinished`, `announcementPending`, `clearTimeout(timerRef)`, `setTimeout(…5000)`, `paused = voiceOverActive || announcementPending`, `onDismissRef` still works). Add P1 integration: mount `ToneScreen` with `AccessibilityInfo.isScreenReaderEnabled=() => Promise.resolve(true)`, assert paused true then `announcementFinished` event → paused false → timer re-armed. VoiceOver ear-check on device (P1 manual). |
| R-006 | TECH | **Skia `Canvas` duplicate accessibility nodes alongside `BoardA11yOverlay` bridge (DW-113).** `GameBoard.tsx` `<Canvas>` lives inside the same `View` as `BoardA11yOverlay`; Skia may expose opaque a11y nodes (empty grid) in the tree alongside the overlay's per-tile `Pressable`s → VoiceOver reads duplicate/empty elements or announces the canvas as an extra item. | 2 | 2 | 4 | Accept as DW-113 open for 9-2; mitigation: `BoardA11yOverlay` root has `importantForAccessibility="no"` already (limits its subtree exposure). Follow-up: set `importantForAccessibility="no-hide-descendants"` (Android) / `accessibilityElementsHidden` (iOS) on the `Canvas` wrapper in `GameBoard.tsx:624-627`; pin with a render assertion that `Canvas` parent has the prop. No block for 9-2. |
| R-007 | TECH | **`announceForAccessibilityWithOptions` queue divergence (iOS vs TalkBack).** `announcements.ts:10-15` branches: if `announceForAccessibilityWithOptions` exists → `queue:true`, else `announceForAccessibility`. On TalkBack the queue branch is absent and utterances may interrupt; on iOS interruption vs queue affects the merge+spawn+score ordering per move. | 2 | 2 | 4 | P0 exhausts both branches via stubbing `origAnnounceWithOpts`/`origAnnounce` with `||`; keep `safeAnnounce` try/catch so missing API never throws. Manual ear-check on both platforms for one move with merge+spawn (P1 device) to confirm single merge announcement + spawn are both heard. |
| R-008 | TECH / DATA | **Board shape edge cases — sparse/jagged `board` or NaN tile values.** `board` is `Board = (number|null)[][]` 4×4 by engine contract; overlay guards `!Array.isArray(board)` and per-row `!Array.isArray(row)` + `value===null→null` and `value` is finite for label, but `announcements.ts` and `App.tsx:489-496` must not pass `NaN` to `announceMerge`/`announceSpawn` → guards `Number.isFinite` before announce. A malformed local board (test-only) could otherwise announce `"NaN row 1 col 1"`. | 1 | 3 | 3 | Keep finite guards in `announcements.ts:30,41` + App `Number.isFinite(aVal/bVal/first.value)` + `tileLabel` fallback try/catch. Low probability (engine always produces finite values), high impact if exposed. |
| R-009 | BUS | **GameOver stats intentionally truncated via `numberOfLines=1 ellipsizeMode="tail"` at largest Dynamic Type (DW-101 residual).** `GameOverOverlay.tsx:102/106/110/114/118` numbers use `numberOfLines=1 ellipsizeMode="tail"` per DW-101 overflow guard (`>1e9` score) — at `xxxLarge` font scale numbers truncate with ellipsis (accepted residual). Conflicts with "never truncate at largest scale" AC, but tile-numerals exception is UX-DR-18 and GameOver numbers are explicitly deferred. | 2 | 2 | 4 | Document as accepted residual (spec Verification residual risks). Mitigate: chrome labels (`label` Text) remain `allowFontScaling` + `flexWrap` + `flexShrink:0`, `value` has `flexShrink:1 flexWrap textAlign:right`; only the numeric value may ellipsize, label never. P0 Dynamic Type guard asserts every chrome file has `allowFontScaling` and `GameOver` retains the 1-line guard (pin). |
| R-010 | TECH | **Static Dynamic Type coverage gap — `allowFontScaling` presence vs actual viewport truncation.** 9-2 hardening adds `allowFontScaling` to all chrome `Text` + `flexWrap`/`minHeight` containers, but static `includes('allowFontScaling')` does not prove "no truncation at largest scale" in a viewport; a `numberOfLines`/`adjustsFontSizeToFit` interaction could still hide content. | 2 | 2 | 4 | Keep P0 contract: `screenReader.contract.test.tsx:242-271` asserts every chrome file contains `allowFontScaling`, GameOver retains 1-line guard, Hud has `flexWrap`+`minHeight`, en/pt all `a11y.*` keys exist. Complement with P1 render: mount `Hud`/`LaneSelectScreen`/`GameOverOverlay` at `fontScale 1.8` via `PixelRatio` mock prop and assert no overlap (snapshot). Manual largest-scale visual on device (P1). |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-011 | TECH | **Test-harness/real `AccessibilityInfo` divergence.** Host uses `react-native` via `rn-stub.ts` (`__tests__` double for `announceForAccessibility`); real iOS/Android native module fires `change`/`announcementFinished` differently (stub fires synchronously, real after bridge). | 1 | 2 | 2 | Monitor — keep stub for host P0, do not assert timing beyond 600 ms throttle test; real divergence covered by device P1 ear-check. |
| R-012 | TECH | **Overlay pointer-events / zIndex occluding Skia gesture.** `BoardA11yOverlay` is `position:absolute left:0 top:0 width:safeWidth height:safeWidth pointerEvents="box-none"` overlay with `Pressable` cells `position:absolute`; `GameBoard` Canvas/X/width same `safeWidth`. A `pointerEvents` mistake or missing `pointerEvents="box-none"` on root could swallow single-finger pan when VoiceOver off. | 1 | 2 | 2 | Monitor — assert root `pointerEvents="box-none"` present (already in source) and `App.tsx` `GestureDetector(GameBoard)` sibling ordering with `BoardA11yOverlay` inside same `View`. Manual smoke: pan works when VoiceOver off, 1-finger does not move when on. |
| R-013 | OPS | **`__tests__/a11y/screenReader.contract.test.tsx` suite flake via throttle real-time wait.** Score throttle test does `await new Promise(r=>setTimeout(r,600))` on host (600 ms wall). CI parallel load could stretch to >500 ms anyway but flake if host >1 s jitter. | 1 | 1 | 1 | Monitor — keep as is (single real-time gate); if flake, replace with `Date.now` mock/jest fake timer, but not required today. |

### Risk Category Legend

- **TECH**: Technical/Architecture (gesture purity, bridge parity, native module divergence, layout)
- **SEC**: Security — none in scope (no auth/data exposure)
- **PERF**: Performance — none high for a11y (no frame cost)
- **DATA**: Data Integrity (engine `Board`/`MoveResult` fidelity) — covered via TECH guards
- **BUS**: Business Impact (WCAG/Apple HIG, App Store a11y, blind-user core journey, merge/spawn announcements)
- **OPS**: Operations (CI throttle timing, stub divergence)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Accessibility — screen-reader contract | WCAG 4.1.3 Status Messages / Apple VoiceOver & Android TalkBack: every non-null tile exposed as `accessible` with engine-derived `accessibilityLabel="{value} row {r+1} col {c+1}"` (1-indexed, EN `row/column`, PT `linha/coluna`) + `accessibilityRole="text"`, `null` cells expose nothing; tap tile re-announces; three-finger swipe moves, single-finger reserved when VoiceOver active; announcements via `AccessibilityInfo` for move/merge/spawn/score/game-over/new-record/preview/banner, noop silent, score throttled ~500 ms, merge coalesced 1/move. Threshold is contract-conformance, not line %. | R-001, R-002, R-003, R-004, R-007, R-008 | Host contract suite `screenReader.contract.test.tsx` 13 tests (gate labels, gate 3-finger, announcements EN+PT, noop silent, throttle, tone src pins, app gate src pins, dynamic-type `allowFontScaling` pins). Static `a11y.*` key existence check both locales. Device ear-check (P1 manual) on one iOS + one Android. | `triade/__tests__/a11y/screenReader.contract.test.tsx` green (13/13), `npm test` 964 pass log + this TD artifact; optional VoiceOver ear-check notes + i18n key diff `en.json:63/pt.json:63`. |
| Accessibility — Dynamic Type at largest scale | Chrome never truncates or overlaps at largest accessibility text size (iOS `xxxLarge` / Android very large): HUD (scoreWrap `flexWrap`/`minHeight: HIT_TARGET`, `pauseSlot width/minHeight: HIT_TARGET`), LaneSelect cards/warning/cta/restore/lang, GameOver stats/banners, AcceleratedAids banner/prompt, Tutorial skip, Tone copy, PreviewCard label/value all `allowFontScaling` + `flexWrap`/`minHeight`. Exception: tile numerals are Skia-drawn and intentionally fixed per UX-DR-18 (deliberate). GameOver numbers retain `numberOfLines=1 ellipsizeMode="tail"` via DW-101 (accepted residual — label never truncated, only numeric value may ellipsize >1e9). Threshold: 0 chrome truncations at largest scale. | R-009, R-010 | Host contract P0 Dynamic Type guard (7 files `allowFontScaling` + `flexWrap/minHeight` + 1-line guard pin) + P1 render at `fontScale 1.8` snapshot. Manual visual on device at largest font setting (P1). | Host P0 guard green + snapshots (if added); device visual notes per orientation (portrait/landscape). |
| Reliability — never throw | a11y layer never throws on any `board`/`MoveResult`/insets: `announcements.ts` NaN/Infinity/empty guards, `boardAccessibility.tsx` `!Array.isArray(board/row)` + `value===null` + `Number.isFinite(width)` + `Number.isFinite(value)` before announce, `screenReaderGestures.ts` `Number.isFinite(translationX/Y)` + missing `numberOfPointers` → null, `ToneScreen` try/catch around `AccessibilityInfo.isScreenReaderEnabled().then`/`addEventListener`. No new `@ts-ignore` outside existing pattern. | R-008 | Unit negative-path: mount `BoardA11yOverlay` with `board:null as any` / jagged / NaN width; call every `announce*` with `NaN/''/undefined`; invoke `isThreeFingerMove(null as any, Infinity)`. Assert no throw and 0 announcements. | Existing 964-pass suite + new P0 invalid-input assertions (already in contract: `announceSpawn(NaN)→0 length`, `announceMerge(NaN)→0 length`). |
| Performance / frame budget | 9-2 adds no per-frame allocation, no Reanimated worklet, no Skia draw beyond existing board; `announceForAccessibility` is fire-and-forget, `isScreenReaderEnabled` is one `Promise<boolean>` + `change` listener; `BoardA11yOverlay` pure RN View/Pressable tree cost is 0–16 nodes (4×4). Must not regress frame budget NFR-11/ADR-04 (engine <2 ms, frame <8 ms, p99 <16.7 ms). Threshold unchanged. | — | Host bench: `layoutFor`/`useSyncedLayout` <1 ms (existing layout suite). Device: existing `useFrameRateBaseline` stats after 2-min play (Epic 8 lane) re-run as nightly; 9-2 must not degrade p99. No perf harness for a11y. | `triade/__tests__/ui/layout.test.ts` timings; `useFrameRateBaseline` log `fps`/`p99Ms`/`frames` if nightly runs (deferred to Epic 8 nightly, reuse). |
| Maintainability | `src/a11y/*` is thin view: `announcements.ts` re-exports only thin wrappers over `AccessibilityInfo`; `boardAccessibility.tsx` derives labels from `Board` prop only (no hard-coded board); constants `GRID/BOARD_PADDING/CELL_GAP/__BOARD_A11Y_CONSTANTS` equal `GameBoard` constants (pinned). No scattered `AccessibilityInfo` calls outside `src/a11y/*` + `ToneScreen`/`App` gate. | R-004, R-006 | Static gates: grep `announceForAccessibility` only in `src/a11y/announcements.ts` + `boardAccessibility.tsx` (tile re-announce) + `ToneScreen` listener; no `BoardA11yOverlay` logic duplicated in `src/render`. Parity pin: `__BOARD_A11Y_CONSTANTS deepStrictEqual {4,8,8}`. | Source scan + contract `deepStrictEqual` assertion + `engine.purity` (new `src/a11y` not required to be pure but must not import `engine` beyond `Board` type). |
| Offline / Installability | No new network/native dependency, no extra native module import beyond `AccessibilityInfo` (already present); `i18n` keys are bundled JSON. App remains installable+offline (NFR-2/NFR-6). | — | `npx tsc --noEmit` clean + `npm test` green; no `expo-doctor` drift. | `tsc --noEmit` clean + `npm test` pass. |

**Unknown thresholds:** None material for 9-2. Announcement "queue vs interrupt" exact UX on TalkBack is platform-defined (queue is iOS-only via `announceForAccessibilityWithOptions`); threshold is "message heard once without flood", not a ms value beyond 500 ms throttle. Canvas focus-hide threshold (DW-113) is deferred; record as deferred with expiry at next 9.x.

---

## Entry Criteria

- [ ] Spec `spec-9-2-screen-reader-contract.md` reviewed revision (`baseline_revision 6576273..final 7832d3c` pinned) and `epic-9-context.md` available.
- [ ] `triade/src/engine/**` byte-identical to baseline (ADR-01 purity; `git diff --stat -- triade/src/engine` empty for engine rules; `src/engine` not touched by a11y).
- [ ] Branch on SDK 57 pinned versions (expo ~57.0.11, RNH ~2.32.0, Skia 2.6.2, Reanimated 4.5.1 — existing matrix).
- [ ] Host test runner `npm test` green at 964/964 baseline before delta (captured in spec Auto Run Result: 964 pass, 0 fail, 366 skipped).
- [ ] `npx tsc --noEmit` clean — no new TS error from `src/a11y/*`.
- [ ] `AccessibilityInfo` stub in `triade/test-utils/rn-stub.ts` exposes `announceForAccessibility`/`announceForAccessibilityWithOptions`/`isScreenReaderEnabled`/`addEventListener` enough for host contract (already true).
- [ ] i18n locales `en.json:63`/`pt.json:63` contain `a11y.*` + `a11y.dir.*` (both locales).

## Exit Criteria

- [ ] All P0 tests passing (100%). Gate: `npm test -- triade/__tests__/a11y/screenReader.contract.test.tsx triade/__tests__/ui/tapTargets.audit.test.ts triade/__tests__/ui/ui.thinview.test.ts` green (P0 host audit still green after 9-2 Dynamic Type touches).
- [ ] All P1 tests passing or failures triaged with approved waivers (≥95%); `tone pause` src pins + `App gate` src pins green.
- [ ] No open bugs S0/S1 against: three-finger move not dispatching / single-finger stealing move when VoiceOver active / label != `board[r][c]` / merge flood / noop noisy / throttle broken / GameOver not announcing.
- [ ] `triade/src/engine/**` still byte-identical post-merge (`git diff --stat -- triade/src/engine` empty beyond `Board` type import).
- [ ] Manual simulator/device ear-check (≥20 min, one iOS Simulator with VoiceOver + one Android with TalkBack if available): three-finger swipe in 4 dirs → move + announcement, single-finger swipe → no move, tap tile → value+position matching board and re-announces, move with merge+spawn → single "Merged: A plus B equals C" + "New tile V", score announced only on merge and throttled on rapid moves, noop silent, game-over → "Game over. Score X, best Y" + "New record" when `isNewRecord`, Tone 2 s auto-advance paused while VoiceOver reading (5 s fallback) and dismiss tap still works, largest Dynamic Type shows all chrome without truncation (tile numerals fixed exception).
- [ ] Residual DW-112/DW-113 either fixed or explicitly waived with owner+expiry at 9-3 review (next a11y pass).
- [ ] Coverage target: every contracted scenario in spec I/O matrix has at least one automated test (actual: 13 tests × 4 I/O rows + tone + dynamic-type; gate is 100% AC contract coverage, not line %).

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE / QA (TEA) | Host contract suite + static gates, App/pan gate review, i18n pin, PR gate, device VoiceOver smoke |
| UX reviewer | UX | Sign-off on DW-112 focus decision (accept dead-node until follow-up), DW-101 numbers ellipsis, tile `role="text"` vs `"button"` choice |
| QA / TEA | QA | Risk gate (R-001/R-003 device sign-off), DW-112/DW-113 waiver expiry, release sign-off |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` denote priority/risk. Execution timing (PR vs nightly vs device-manual) is defined under Execution Strategy.

### P0 (Critical) — Host unit, no device, <1 min

**Criteria**: Blocks core screen-reader journey + high risk (≥6) + no workaround + cheap host execution. Every 9-2 AC failure is an App Store a11y rejection / blind-user blocking defect.

| # | Requirement / AC | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | AC VoiceOver move — three-finger gate | `isThreeFingerMove({30,0, n=3})→right`, `{-30,0,3}→left`, `{0,30,3}→down`, `{0,-30,3}→up`; `n=1/2→null`, `undefined n→null`, `null/invalid→null`; `5,0,3` sub-threshold→null, tie `20,20,3→null` | Unit | R-001 | 3 `test()` (1: 6 asserts, 1:2 asserts, 1:2 asserts) | DEV (done) | `screenReader.contract.test.tsx:36-54` — also pins `Number.isFinite` guard on NaN/Infinity. |
| P0-02 | AC VoiceOver read tile — engine-derived 1-indexed label | `tileLabel(3,0,0) EN "3 row 1 column 1"`, `tileLabel(96,2,3) EN "96 row 3 column 4"`, PT `"3 linha 1 coluna 1"`; `BoardA11yOverlay` with 5 non-null cells → 5 Pressables with labels matching `board[r][c]`, null cells no element; prop update `3→6` re-renders label `"6 row 1 column 1"`; `__BOARD_A11Y_CONSTANTS {4,8,8}` equals `GameBoard` | Unit | R-004 | 4 `test()` | DEV (done) | `screenReader.contract.test.tsx:58-141` — 1 label, 1 mount 5-label, 1 prop update, 1 `role="text"` + `accessible` (patched). |
| P0-03 | AC Announcement contract — strings + side-effect | Every `announceMerge/spawn/gameOver/newRecord/move/preview/banner` calls `AccessibilityInfo` once and contains expected substrings (`Merged/mergede: 1/2/3`, spawn has value, gameOver has `score+best` + "Game over"/"Fim de jogo", PT merge has "Fundiu", move has dir, preview has display, banner passes through) | Unit (mock) | R-003, R-007 | 2 `test()` | DEV (done) | `screenReader.contract.test.tsx:145-187` — stubs both `announce*` fns with `captured[]`; swaps `i18n.language` EN↔PT. |
| P0-04 | AC Announcement contract — noop silent + safe guards | `announceSpawn(NaN)→0`, `announceMerge(NaN,2,3)→0`, `announce('')→0`, `announceBanner('')→0` — invalid/empty never queues | Unit | R-003, R-008 | 1 `test()` | DEV (done) | `screenReader.contract.test.tsx:189-202` — `Number.isFinite` guards + empty-string early return. |
| P0-05 | AC Announcement contract — score throttle 500 ms | `resetScoreThrottleForTests(); announceScoreThrottled(100)→1`; immediate `announceScoreThrottled(200)→1` (throttled); `await 600ms; announceScoreThrottled(300)→2` with "300" | Unit | R-003 | 1 `test()` | DEV (done) | `screenReader.contract.test.tsx:204-216` + keeps `__SCORE_THROTTLE_MS=500` exported for doc parity. Real-time wait is the only wall wait in suite. |
| P0-06 | AC ToneScreen pause — static contract | `ToneScreen.tsx` src contains: `isScreenReaderEnabled`, `announcementFinished`, `announcementPending`, `clearTimeout(timerRef.current)`, `setTimeout(()=>setAnnouncementPending(false),5000)`, `paused=voiceOverActive||announcementPending`, `onDismissRef.current()` | Unit (static file read) | R-005 | 1 `test()` | DEV (done) | `screenReader.contract.test.tsx:220-229` — file-read tripwire covering the 2 s auto-advance clear/re-arm + 5 s fallback invariant. |
| P0-07 | AC App gesture gate — single-finger reserved | `App.tsx` src contains: `useScreenReaderEnabled`, `isThreeFingerMove`, `screenReaderEnabledRef.current`, Board gate via helper (`numberOfPointers`), `BoardA11yOverlay` mount, `announceMove/announceMerge/announceSpawn/announceGameOver` wiring after `move()`, `result.moved` guard + noop silent | Unit (static file read) | R-001, R-003 | 1 `test()` | DEV (done) | `screenReader.contract.test.tsx:231-240` — asserts wiring without mounting App (deep App mount is manual domain). |
| P0-08 | AC Dynamic Type chrome never truncates (host static) | Every chrome file `Hud/PreviewCard/GameOver/LaneSelect/AcceleratedAids/TutorialOverlay/ToneScreen/PauseButton` contains `allowFontScaling`; `GameOverOverlay` retains `numberOfLines={1} ellipsizeMode="tail"` per DW-101; `Hud` has `flexWrap`+`minHeight`; both locales have all `a11y.moved/merged/spawn/score/gameOver/newRecord/tile` keys | Unit (static) | R-009, R-010 | 1 `test()` | DEV (done) | `screenReader.contract.test.tsx:242-271` — locale JSON parse + `key.split('.').reduce` check both en/pt. |
| P0-09 | AC Engine-derived parity — no hard-coded board logic in a11y | `announcements.ts` uses `announceForAccessibility` + throttle + `i18n.t`; `boardAccessibility.tsx` derives from `board.map` + `BOARD_PADDING/CELL_GAP` same as `GameBoard`; `screenReaderGestures.ts` wraps `isScreenReaderEnabled` + `numberOfPointers` gating `===3/!==3` | Unit (static) | R-003, R-004 | 1 `test()` | DEV (done) | `screenReader.contract.test.tsx:273-285` — triple file-read check. |

**Total P0**: 9 groups (13 `test()` assertions + 1 noop + 1 throttle + 2 static gates), host-only, executes in PR in <1 min + 600 ms wall wait.

### P1 (High) — Integration + chrome mounts + i18n (host, <5 min)

**Criteria**: Validates the wiring and the viewport/label contract at component level; medium risk (3–4) and common workflows. Failure here is user-visible (mis-label, banner not announcing, PT broken) but has a static fallback in P0.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | AC ToneScreen pause liveness | Mount `ToneScreen` with `AccessibilityInfo.isScreenReaderEnabled=()→true`, assert `paused` true → `timerRef` cleared; fire `announcementFinished` → `paused` false → 2000 ms timer re-armed; fallback `setTimeout 5000` fires without event; unmount clears both timers; dismiss Pressable still calls `onDismissRef` when `paused` true | Component (render) | R-005 | 2 (pause + dismiss) | FE | Not yet in repo as mounted render; P0 static covers it today — propose as follow-up P1 mount (uses `react-test-renderer` + `AccessibilityInfo` stub with `change`/`announcementFinished` emitters). |
| P1-02 | AC Preview/game-over/banner announcements wiring | Mount `App` shallow or call `doMove` harness with `MoveResult` that has `spawned:true` + `trace from.length===2` merge; assert `announceMove(dir)`, coalesced single `announceMerge(first)`, `announceSpawn`, `announceScoreThrottled` once, `announceGameOver` when `isGameOver(board)` and `announceNewRecord` when `isNewRecord(startBest, newScore)` | Unit/Component | R-003 | 2 (merge+spawn; gameOver+newRecord) | DEV | App-level announcement branches are P0 static today; full dispatch pin needs a thin `App.doMove` unit harness injecting `move` result — keep as P1 manual ear-check until harness exists. |
| P1-03 | AC HUD/PreviewCard a11y + Dynamic Type mount | Mount `Hud` + `PreviewCard` with `fontScale 1.8` mock, assert score/best/assist labels rendered, `laneBoxPortrait 76×76`, `laneBoxLandscape 60×44`, `allowFontScaling` true, `scoreWrap flexWrap+minHeight` without overlap | Component | R-009, R-010 | 1 | DEV | Host snapshot; supplements P0 static `allowFontScaling` presence. |
| P1-04 | AC GameOver overlay a11y | Mount `GameOverOverlay` with `stats {score,best,maxTile,merges,longestStreak}` and `isNewRecord true/false`, assert inner `View accessible role="alert"` label is `Game over. Score X, best Y, max tile…` + newRecord suffix; CTA `Pressable` `accessibilityRole="button"` and `accessibilityLabel` is `t('gameOver.restart')`; `isNewRecord` style `valueRecord` vs `value` | Component | R-009 | 1 | DEV | Existing `gameOverOverlay.test.ts` + new P0 pins. |
| P1-05 | AC i18n both locales breadth | Keep existing P0 both-locale checks for `a11y.*`; add render check that `tileLabel` PT uses `"linha"/"coluna"` and `announceGameOver` PT uses `"Fim de jogo"` when `i18n.language pt` — already P0. | Unit | — | 0 (already P0) | DEV | No new test, keep pinned. |
| P1-06 | AC LaneSelect / AcceleratedAids / Tutorial / Tone chrome Dynamic Type | Mount each chrome file at `fontScale 1.8`, assert no truncation: `LaneSelect cardLabel/warning/cta`, `AcceleratedAids bannerText/dismissBtn`, `Tutorial skipBtn`, `Tone copy Tile` all `allowFontScaling+flexWrap` | Component | R-010 | 3 | DEV | Snapshot per chrome file. |
| P1-07 | TECH gap closure — `a11y` constants parity (new) | Static gate that `triade/src/a11y/boardAccessibility.tsx` `__BOARD_A11Y_CONSTANTS` equals `GameBoard.tsx` `GRID/BOARD_PADDING/CELL_GAP` (read both files, compare) — already P0-02 deepStrict, keep and extend to `safeWidth` guard parity | Unit (static) | R-004 | 1 (already P0) | FE | Already in P0; keep as P1 stability pin on future GameBoard padding changes. |
| P1-08 | TECH `announceForAccessibility` queue branch parity | Mount `announcements.ts` with stub exposing only `announceForAccessibility` (no `announceForAccessibilityWithOptions`), assert message still delivered (TalkBack fallback path) | Unit | R-007 | 1 | DEV | Already covered by P0 stub both fns; keep explicit fallback-branch test. |

**Total P1**: ~8–9 logical assertions, ~3–6 h to finalise (mount harnesses + snapshots) plus 15-min simulator ear-check.

### P2 (Medium) — Edge, perf, regression, Deferred

**Criteria**: Secondary flows + low/medium risk (3–4) + Deferred validation depth.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | DW-112 focus after move | Apply `move(board, dir, rng)` → new board, mount `BoardA11yOverlay` before+after, assert old focused `Pressable` no longer mounted when its cell became `null`; document that `setAccessibilityFocus` is absent (expected) | Component | R-002 | 1 | FE | Tripwire for when focus API lands. |
| P2-02 | DW-113 Canvas duplicate nodes | Assert `GameBoard` wrapper has `importantForAccessibility` / `accessibilityElementsHidden` when follow-up lands; today assert `BoardA11yOverlay` root `importantForAccessibility="no"` + `pointerEvents="box-none"` present | Static | R-006 | 1 | FE | Today static pass; future render pin. |
| P2-03 | Board null/jagged/NaN width guard | Mount `BoardA11yOverlay` with `board:null as any` → renders `null`; jagged `[[1, null],[null]]` → no throw; `width: NaN/Infinity/0` → `safeWidth=1`, still renders, no throw | Component | R-008 | 1 | DEV | Supplements P0. |
| P2-04 | Announcement ordering on TalkBack | One `doMove` with merge+spawn+score → capture `captured[]` order is `moved → merged → spawn → score` and score throttled to 1 per 500 ms window | Unit | R-003, R-007 | 1 | DEV | Verifies coalescing order before device ear-check. |

**Total P2**: ~4 checks.

### P3 (Low) — Exploratory / manual / device

**Criteria**: Nice-to-have + exploratory + device tactile tuning.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Device VoiceOver smoke (blind journey) | On iOS Simulator/Android device with VoiceOver/TalkBack enabled: three-finger swipes 4 dirs → board moves + move announcement; single-finger swipe → no move; tap each tile → value+position; rapid moves → score throttled not flood; noop swipe → silent; Tone 2 s pause while VR reading (fallback 5 s visible); largest text all chrome readable. | Exploratory (manual) | 1 journey | QA/FE | The only non-mocked proof; capture short notes/screenshot per orientation. |
| P3-02 | TalkBack divergence check | On Android TalkBack, confirm three-finger gate still dispatches (TalkBack may send `numberOfPointers` differently) and `announceForAccessibility` fallback path delivers (no queue). | Manual (device) | 1 | QA | Single Android data point, not matrix. |

**Total P3**: 2 exploratory checks.

---

## Execution Order

For this story execution is host-dominated; device is the only VoiceOver proof.

### Smoke (<1 min, host, every save)

- `npm test -- triade/__tests__/a11y/screenReader.contract.test.tsx triade/__tests__/ui/ui.thinview.test.ts` — P0 host contract (13 tests + thinview pins) + `npx tsc --noEmit` (no new `@ts-ignore`).
- `npm test` full suite sanity (964 pass per spec Auto Run Result).

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 + P1 host assertions (contract + static src gates + i18n key existence + `__BOARD_A11Y_CONSTANTS` parity).
- **CI purity gate**: `git diff --stat -- triade/src/engine` shows 0 engine rule files (a11y may only import `Board` type + `resolveSwipeDirection`); any `engine/` edit outside type import fails the gate.
- **Static scan**: `announceForAccessibility` only in `src/a11y/announcements.ts` + `boardAccessibility.tsx` tile re-announce; no `merge/spawn/score` duplication in `src/a11y`.
- **Lint**: no hard-coded English labels outside `i18n.t('a11y.*')` in `src/a11y` (grep for raw "Game over"/"Merged" in `src/a11y` must be absent except via `i18n.t`).

### Device/simulator gate (manual, ~20 min, before merge)

- **Simulator pass** (iOS VoiceOver is sufficient for gesture correctness — Taptic not needed): three-finger swipes 4 dirs + single-finger no-move + tile tap re-announce + merge→single announcement + spawn + score throttle + noop silent + game-over + Tone pause+fallback + largest Dynamic Type chrome. Owner is PR author; sign-off is a checkbox in PR description ("a11y smoke: 3-finger moves / 1-finger blocked / tile `row col` / merge coalesced / Tone paused / largest text no truncate").
- **Android TalkBack pass** (one emulator): same three-finger gate + fallback announcement path (queue branch absent).

### Nightly/weekly — not required for 9-2

No perf/chaos/large-dataset suites. A sustained 10-min play `p99` trace for Epic 8 benchmarks already covers frame budget; 9-2 adds no load.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node --test` parallelisation); defer only genuine VoiceOver/TalkBack behaviour to a quick simulator/device ear-check because it requires the native a11y bridge, not a harness. Keep the a11y layer deterministic: all branching logic is unit-testable without a screen reader.

- **PR**: All functional host tests (P0 + P1 host assertions + P2 static). No infra overhead — `node --test` + `tsc` is the only runner. Include the 600 ms throttle wall wait (single real-time gate).
- **Pre-merge device**: One manual iOS Simulator VoiceOver pass (P1/P3 journey). Android TalkBack optional single pass for queue-branch divergence. Owner is PR author; sign-off checkbox in PR description.
- **Nightly/weekly**: None for 9-2. Epic 9 contrast gates (9-3/9-4) are the nightly lane when theme palettes land.

No Playwright/k6 contract/perf harness is required for this delta (no UI intercept, no network API, no backend). Browser exploration via `playwright-cli` was skipped — the delta is React Native host + native `AccessibilityInfo`.

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 9 groups (13 `test()` assertions already written + 2 static gates) | 0.1–0.25 | **~1–2 h** | Already done; review + report only. |
| P1 | 8 groups (2 Tone/App harness + 3 chrome mounts + 2 parity/queue + 1 i18n already P0) | 0.25–0.75 | **~3–6 h** | Dominated by writing the Tone `announcementFinished` mount + App `doMove` announcement-order harness. |
| P2 | 4 checks (focus deferred, canvas hide, guards, ordering) | 0.25–0.5 | **~1–2 h** | Static + mount on jagged board; low. |
| P3 | 2 exploratory (iOS + Android ear-check) | 0.5–1.0 | **~1–2 h** | Manual simulator/device ranking, not gating. |
| **Total** | **~23 checks** | — | **~6–13 h** | **~1–2 days** wall-clock with VoiceOver access; host-only completion is ~0.5 day. |

Prerequisites:

- **Test data**: Deterministic `board: Board` fixtures (4×4 with mixed non-null/null, jagged, NaN width), `MoveResult` fixtures via `move(game,dir,rng)` trace with `from.length===2` merges + `spawned` entries, i18n fixtures `i18n.changeLanguage('en'/'pt')`, `AccessibilityInfo` stub doubles with `change`/`announcementFinished` emitters, `PixelRatio` mock for Dynamic Type scale.
- **Tooling**: `node --test`, `tsx`, `typescript`, `react-test-renderer`; iOS Simulator (Xcode) + Android emulator for ear-check (no farm).
- **Environment**: Host (`node >=26`, as per `engines`), iOS Simulator (SDK 57). No staging backend.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions; all 9 groups green).
- **P1 pass rate**: ≥95% (if `ToneScreen` mounted harness is pending, it counts as waiver with owner+expiry at 9-3; mock-level P1 already green via static gates).
- **P2/P3 pass rate**: ≥90% informational; P2-03 guard + P2-04 ordering must be green.
- **High-risk mitigations**: R-001/R-002/R-003 have a decision + test or explicit signed waiver with expiry (DW-112 expiry at 9-3, DW-113 at 9-4) — otherwise FAIL.

### Coverage Targets

- **Critical paths (three-finger gate + tile label = `board[r][c]` + announcement contract + Tone pause + Dynamic Type)**: 100% of spec AC contract covered (actual: 6 AC rows × at least 1 test each; gate is 100% AC coverage, not line %).
- **Accessibility screen-reader scenarios**: 100% per spec I/O matrix (VoiceOver move / read tile / announcement / Tone / Dynamic Type).
- **Business logic (`src/a11y` thin view)**: 100% of declared contracts swept (gate is "every `announce*` wrapped `AccessibilityInfo` via `safeAnnounce`").
- **Edge cases (null board/jagged/NaN width/NaN announce/empty string/finite guard/throttle)**: ≥90%.

### Non-Negotiable Requirements

- [ ] All P0 tests pass.
- [ ] No high-risk (≥6) items unmitigated without signed waiver.
- [ ] Engine byte-identical regression gate passes (`triade/src/engine` unchanged except type import).
- [ ] WCAG contract pinned by tests that assert engine-derived labels (not hard-coded UI strings) and `AccessibilityInfo` via `announceForAccessibilityWithOptions {queue:true}` with fallback.
- [ ] Single-finger never moves when VoiceOver active is pinned and manually ear-checked.
- [ ] Device ear-check sign-off present in PR before merge.

---

## Mitigation Plans

### R-001: Three-finger gesture gate — single-finger reserved, 3-finger moves (Score: 6)

**Mitigation Strategy:**
1. Keep the invariant `isThreeFingerMove(event) → Direction|null` with `numberOfPointers===3` strict, `Number.isFinite(translationX/Y)` guards, delegation to `resolveSwipeDirection` (threshold + tie → null), and `null/undefined` → null.
2. Keep `App.tsx` pan handler pattern: if `screenReaderEnabledRef.current` then `if(busyRef) return; if(!success) return; dir=isThreeFingerMove(event); if(!dir) return; doMoveRef.current(dir); return;` else legacy `handleGestureEnd`.
3. Gate `useScreenReaderEnabled()` on `AccessibilityInfo.isScreenReaderEnabled().then` + `addEventListener('change',…)` with `mounted` guard + `sub.remove` cleanup.
4. Host contract asserts the 6-direction plus below-threshold/tie + undefined/missing-pointer + NaN/Infinity guards.
5. Device ear-check pins the real gesture: three-finger swipe 4 dirs → move+announcement, single-finger → no move, busy-gate still respected.

**Owner:** FE (FE lead + QA reviewer)
**Timeline:** This story (P0 already landed; device check before merge)
**Status:** Complete (planned device supplement on merge day)
**Verification:** `npm test -- screenReader.contract.test.tsx:36-54` green + simulator VoiceOver pass checkbox

### R-002: Focus continuity after move — dead-node focus (DW-112) (Score: 6)

**Mitigation Strategy:**
1. Accept as **deferred open** for 9-2 (spec already deferred as DW-112 with reason "requires platform focus API beyond current patch scope", status open).
2. Keep the shipped mitigation: `BoardA11yOverlay` keys `a11y-${r}-${c}` stable (no value in key, spec patch P1), re-render on `board` prop change with `board.map(... Pressable ...)` + `__BOARD_A11Y_CONSTANTS` parity, so identity at a coordinate is stable and the live position is always correct even if focus is not auto-moved.
3. Do not call `AccessibilityInfo.setAccessibilityFocus` in 9-2 (blocked per Boundaries "Block If").
4. Follow-up story: add `setAccessibilityFocus` to the destination cell (or first non-null tile) after `doMove` dispatches; pin with a host assertion `AccessibilityInfo.setAccessibilityFocus` called with `(findNodeHandle(cellRef), true)` or iOS equivalent. Gate expiry at 9-3 review.

**Owner:** FE (follow-up owner) / QA
**Timeline:** Before 9-3 (or document waiver at 9-2 merge with expiry at 9-3)
**Status:** Deferred (DW-112) — accepted residual for 9-2
**Verification:** Prop-update P0 test `board 3→6` green + stable-key regex on `boardAccessibility.tsx:55`; follow-up will add `setAccessibilityFocus` assertion.

### R-003: Announcement contract — coalescing + throttle + queue + i18n + noop silent (Score: 6)

**Mitigation Strategy:**
1. Keep `announcements.ts` thin: `safeAnnounce(msg)` wraps `announceForAccessibilityWithOptions(msg,{queue:true})` else `announceForAccessibility(msg)` in try/catch, `announceMerge/Spawn/ScoreThrottled/GameOver/NewRecord/Preview/Banner/Move` all via `i18n.t('a11y.*')`, `Number.isFinite` guards + empty-string early return, `SCORE_THROTTLE_MS=500` with `__SCORE_THROTTLE_MS` export and `resetScoreThrottleForTests()`.
2. Keep `App.tsx:484-520` coalescing: `mergeEntries=result.trace.filter(!spawned && from.length===2); first=mergeEntries[0]; aVal/bVal snapshot→announceMerge(first)` (one per move) + `spawnEntry=result.trace.find(spawned)` + `announceSpawn(spawnEntry.value)` + `announceScoreThrottled(newScore)` once + `announceGameOver` + conditional `announceNewRecord` (per-lane `isNewRecord` pin already in App).
3. Host suite pins: every contract function called once with expected substring both locales, NaN/empty → 0 length, throttle window 500 ms via real timeout + `captured[]` order.
4. Device ear-check on a move with 2 merges confirms only one "Merged: …" utterance + spawn + score (not 5), rapid moves drop extra score, noop silent.

**Owner:** FE
**Timeline:** This story (commit with the coalesce patch already landed; throttle window pinned)
**Status:** Complete (planned ordering supplement P2-04 in next PR)
**Verification:** `screenReader.contract.test.tsx:145-216` green + merge-coalesce comment in `App.tsx:483`; ear-check ordering.

---

## Assumptions and Dependencies

### Assumptions

1. `Board` is always 4×4 `(number|null)[][]` by engine contract (`GRID=4`); jagged/null tester shapes are defensive-only — runtime boards are rectangular with finite values that are powers-of-2ish; NaN tile labels are latent.
2. `AccessibilityInfo.addEventListener('change',…)` and `AccessibilityInfo.isScreenReaderEnabled(): Promise<boolean>` are present on both iOS and Android (RN stub suffices for host); `announcementFinished` is iOS-only, so the 5 s fallback is the TalkBack unblock.
3. The `src/a11y` layer is thin RN views (thin-view concept per `ui.thinview.test.ts` extension) so checking `tileLabel`/`isThreeFingerMove`/`announcements` in host is sufficient — no engine rule duplication.
4. `i18n` key set `a11y.moved/merged/spawn/score/gameOver/newRecord/preview/tile/dir.*` is stable; a new locale (e.g., DE) would extend keys but 9-2 covers only EN+PT pinned.
5. `BOARD_PADDING=8/CELL_GAP=8/GRID=4` contract between `GameBoard.tsx` and `boardAccessibility.tsx` is intentional parity (prefer `__BOARD_A11Y_CONSTANTS` parity pin to UI lib constant extraction).

### Dependencies

1. `triade/src/ui/PauseButton.tsx` `HIT_TARGET` remains the single source for geometry constants — but 9-2 depends on `src/a11y` + `App.tsx` pan wiring staying on SDK 57 pinned RNGH versions.
2. Simulator/device VoiceOver access for the 20-min ear-check before merge — required by: merge day (manual, not CI). No real-device Taptic needed.
3. `triade/test-utils/rn-stub.ts` must expose `AccessibilityInfo` doubles (`announceForAccessibility`/`announceForAccessibilityWithOptions`/`isScreenReaderEnabled`/`addEventListener('change'|'announcementFinished')`) for host; current stub does.
4. `react-test-renderer` + `act()` stays the host renderer for `BoardA11yOverlay` mounts (no migration to RNTL required for 9-2).
5. `triade/src/i18n/locales/en.json` `pt.json` `a11y.*` keys must not be tree-shaken — bundler must keep them for EN+PT.

### Risks to Plan

- **Risk**: Future `GameBoard.tsx` padding/gap change (e.g., density pass `BOARD_PADDING 8→12`) without updating `boardAccessibility.tsx` → overlay tiles mis-aligned with Skia, VoiceOver focus offset by ~4pt, tapping wrong cell.
  - **Impact**: WCAG 1.3.1 failure (meaningful sequence), blind user mis-reads board; high UX but no crash.
  - **Contingency**: `__BOARD_A11Y_CONSTANTS deepStrict` already fails in P0 if diverged; keep as blocker. Consider extracting constants to a single `src/ui/boardGeometry.ts` in follow-up to eliminate drift class.

- **Risk**: TalkBack three-finger synthetic `numberOfPointers` not reported as `3` (some OEMs report `undefined`/`1`) → real 3-finger gesture ignored when TalkBack active → VoiceOver contract works but TalkBack does not.
  - **Impact**: Android a11y journey blocked with no workaround (blind user cannot move).
  - **Contingency**: Keep `numberOfPointers !==3 → null` as spec-faithful today; collect one Android data point at P3-02 — if observed, propose a follow-up TalkBack policy (alternative double-tap-and-hold or TalkBack-specific gesture) behind a platform guard.

- **Risk**: Rapid 3-finger swipes before `busyRef` clears + score throttle interaction drops `announceScore` after merge while the merge announcement still queued → score not heard on short session.
  - **Impact**: Low — score is informational; move+merge still heard.
  - **Contingency**: Keep coalescing + throttle as today; if ear-check reports missed scores on rapid play, widen throttle to per-move "announce only best-merge value" not running score (spec allows merge-only throttle).

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|---|---|---|
| **Engine (`src/engine/core`)** | None — observer only, no rules changed. Purity ADR-01 must hold; `src/a11y` only imports `Board` type + `Direction` + `resolveSwipeDirection`. | `git diff --stat -- triade/src/engine` empty + full engine suite green (964 pass log). |
| **Render / Board (`src/render/GameBoard`)** | None — Skia remains visual-only; a11y is sibling overlay. Geometry parity risk only (R-004). | `GameBoard` trace-driven tests remain gate; no Skia snapshot change. Zero `src/render` logic files in delta except read-only `safeWidth` guards already present. |
| **Gesture (`src/ui/gesture.ts` / `src/ui/swipe.ts` / RNGH)** | Three-finger path composes via `resolveSwipeDirection`; single-finger path unchanged when TalkBack off. Risk of `activeOffsetX/Y` threshold bypass for 3-finger. | Existing `gesture-pipeline.test.ts` + `swipe` threshold tests remain gate; P0 `isThreeFingerMove` delegates to `resolveSwipeDirection` so threshold/tie contract is shared. |
| **Layout (`src/ui/layout.ts`, `useSyncedLayout.ts`)** | Dynamic Type `allowFontScaling` does not change `boardSize`; HUD band still `getBandTop(insets, bandHeight)` + `SAFE_MARGIN`. | `layout.test.ts` + `layout.doc-layout-count-sync` pins `LANDSCAPE_BAND_HEIGHT 48`, `BOARD_SIZE_FLOOR 216`; `useSyncedLayout.test.ts` green. |
| **Hud / PauseButton** | `allowFontScaling` + `flexWrap`/`minHeight` added; hit area still 48 via `HIT_TARGET` 9-1 contract. | `tapTargets.audit.test.ts` (9-1) still green on 9-2 chrome touches. |
| **LaneSelectScreen / GameOverOverlay / AcceleratedAids / Tutorial / Tone** | `allowFontScaling` + `flexWrap`/`minHeight` added; `GameOver` numbers keep 1-line ellipsis per DW-101; `Tone` copy `allowFontScaling` preserved. | Same 9-1 audit still green; P0 dynamic-type guard now includes all chrome. |
| **PreviewCard** | `label/value` `allowFontScaling` added; announce contract may call `announcePreview` on preview change. | `previewWiring` tests still green; P0 i18n `a11y.preview` key exists. |
| **App.tsx (orchestrator)** | New refs `screenReaderEnabledRef` + `BoardA11yOverlay` sibling + announcement calls after `doMove` + gesture branch on `screenReaderEnabledRef.current`. | No engine regression; existing `App` integration tests (if any) + new P0 `App.tsx` src gate. |
| **i18n** | Added `a11y.*` 8 keys both locales (`a11y.moved/merged/spawn/score/gameOver/newRecord/preview/tile` + `a11y.dir.*`) at `locales:63`. | `locales/en.json`+`pt.json` `a11y.*` existence P0; future locale must extend same keys. |
| **Future 9.3/9.4 a11y stories** | Break risk: new chrome without `allowFontScaling` or `BoardA11yOverlay` not updated for new lanes would infect 9-2 contract. | Dynamic-Type scan gate (P0) + per-9.x PR review guard; DW-112/113 expiry. |
| **Theme / tokens (`src/theme`)** | None — no palette changed in 9-2. | No theme regression; 9-4 will validate contrast. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk scoring (P×I), categories (TECH/SEC/PERF/DATA/BUS/OPS), gate thresholds (≥6 needs mitigation, 9 blocks).
- `probability-impact.md` — P1=Low, P2=Medium, P3=High; score interpretation (1–9).
- `test-levels-framework.md` — Unit for pure constants/`tileLabel`/`isThreeFingerMove`/`announce*`, component for mounted `BoardA11yOverlay`/`ToneScreen`/`Hud`, manual for VoiceOver ear-check (no E2E harness needed for this delta).
- `test-priorities-matrix.md` — P0 = blocks core + high risk + no workaround (here: three-finger gate + label=board + coalesced announcements + tone pause + Dynamic Type presence).
- `nfr-criteria.md` — Accessibility thresholds (WCAG 4.1.3), Dynamic Type, reliability never-throw, maintainability single-access-point, performance frame-budget gaps become risks.
- `selector-resilience.md` — `hasStyle`/`accessibilityLabel` assertions preferred over text match for a11y labels.

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md` (FR28–32, NFR-1/NFR-11)
- Epic context: `_bmad-output/implementation-artifacts/epic-9-context.md`
- Story spec: `_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md` (baseline `6576273`, final `7832d3c`, review loop 0, 13 contract tests)
- Architecture: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (ADR-01 purity, UX-DR-18 tile numerals fixed)
- UX Design: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md` (UX-DR-6/13/17/18/19)
- Working-tree evidence: commit `b9db712` (`6576273..HEAD` 17 files `+825/-56`) + `triade/__tests__/a11y/screenReader.contract.test.tsx` (13 tests) + deferred `DW-112/113`

---

**Generated by**: BMad TEA Agent — Murat (Master Test Architect) via `bmad-testarch-test-design`
**Workflow**: `bmad-testarch-test-design` (Epic-Level)
**Version**: 4.0 (BMad v6) — targeted delta for `9-2-screen-reader-contract`
**Config**: `_bmad/tea/config.yaml` → `test_artifacts: _bmad-output/test-artifacts` / `test_design_output: _bmad-output/test-artifacts/test-design`

### Follow-on Workflows (Manual)

- Run `*atdd` to generate any missing P1 mounted harnesses (P1-01 Tone `announcementFinished` mount, P1-02 App `doMove` announcement-order harness) — separate workflow, not auto-run.
- Run `*automate` once DW-112/113 Canvas hide lands (adds `importantForAccessibility` on `GameBoard` wrapper assertions).
- Run `*nfr-assess` after VoiceOver device ear-check for accessibility/Dynamic Type evidence (not this workflow).

---

## Approval

**Test Design Approved By:**

- [ ] Product / FE Lead: _____________ Date: ____
- [ ] UX (DW-112 focus, DW-101 ellipsis, `role="text"`): _____________ Date: ____
- [ ] QA / TEA: _____________ Date: ____

**Comments:**

---
