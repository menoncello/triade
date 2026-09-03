---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-03'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md'
  - '_bmad-output/implementation-artifacts/epic-9-context.md'
  - 'triade/src/ui/PauseButton.tsx'
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/LaneSelectScreen.tsx'
  - 'triade/src/ui/AcceleratedAids.tsx'
  - 'triade/src/ui/TutorialOverlay.tsx'
  - 'triade/src/ui/ToneScreen.tsx'
  - 'triade/App.tsx'
  - 'triade/src/ui/layout.ts'
  - 'triade/__tests__/ui/tapTargets.audit.test.ts'
  - 'triade/__tests__/ui/components/gameOverOverlay.test.ts'
  - 'triade/__tests__/ui/components/app.restart.test.ts'
  - 'triade/__tests__/ui/ui.thinview.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 9 / Story 9-1 — Tap targets ≥44×44pt

**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `9-1-tap-targets-44x44pt`
**Scope:** Targeted test design for the working-tree delta of story 9-1

> **Delta under assessment:** Commit `819fb2a` (`feat(9-1): enforce 44pt tap targets, fix GameOver CTA minWidth, add audit test`) on `main` (HEAD). `git diff HEAD --stat` is empty for production code; the only uncommitted change is `sprint-status.yaml` metadata (`9-1-tap-targets-44x44pt: backlog → done`). Assessed production change:
> - `triade/src/ui/GameOverOverlay.tsx` — `styles.cta` fixed `width/height: HIT_TARGET` (48×48 square) → `minWidth/minHeight: HIT_TARGET` + `paddingHorizontal: 24, paddingVertical: 8`; `continueAd/continueIap/continueCancel` add `minWidth: HIT_TARGET` defensive floor
> - `triade/__tests__/ui/tapTargets.audit.test.ts` (new) — static audit enforcing ≥44pt floor across all `src/ui` + `App.tsx` Pressables
> - `triade/__tests__/ui/components/gameOverOverlay.test.ts` + `triade/__tests__/ui/components/app.restart.test.ts` — guard regex relaxed to accept `minWidth/minHeight` as valid HIT_TARGET usage
> - `_bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md` + `epic-9-context.md` (docs)
> - No engine/render/theme edits (`git show HEAD --stat` confirms 0 engine files)

---

## Executive Summary

**Scope:** Story 9-1 enforces WCAG 2.5.5 / Apple HIG 44×44pt minimum at the component level for every touchable in `triade/src/ui` + `App.tsx`. The canonical constant is `HIT_TARGET = 48` exported from `triade/src/ui/PauseButton.tsx:3` (integer ≥44, verified by `ui.thinview.test.ts`). All chrome (pause, Hud assist, LaneSelect cards/warning/cta/restore/lang, GameOver cta/continue, AcceleratedAids banner/prompt, Tutorial skip, Tone whole-screen, App menuBtn) now resolves to a ≥44pt floor via `minWidth/minHeight: HIT_TARGET` (or `width/height: HIT_TARGET` for pause). The primary defect fixed is the GameOver primary CTA truncating the i18n label "Jogar de novo" / "Play again" when rendered as a fixed 48×48 square; the fix lets the button grow horizontally with padding while keeping the 44pt floor. A static audit test (`tapTargets.audit.test.ts`) prevents regressions for future leaderboard tabs and other Epic 9 chrome.

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (score ≥6): 2
- Critical categories: TECH/BUS (future chrome without floor via allowlist audit gap; CTA truncation regression via style override)

**Coverage Summary:**

- P0 scenarios: 7 groups (8 `test()` assertions in audit + thinview, ~1–2 hours verification on change)
- P1 scenarios: 7 groups (integration / layout isolation / i18n / banner / lane, ~3–6 hours)
- P2/P3 scenarios: 6 groups (perf/visual, reduced motion orthogonality, exploratory device, ~2–5 hours)
- **Total effort**: ~6–13 hours (~1–2 days wall-clock; host-only ~0.5 day, device ~0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **VoiceOver / TalkBack screen-reader contract (9-2), merges by shape/text (9-3), light/dark/color-blind themes & WCAG AA contrast (9-3/9-4)** | 9-1 is purely geometric hit-area; no `accessibilityLabel`, no tile grain/facet, no token palette changes. | Epic 9 stories 9-2/9-3/9-4 each require their own test design; 9-1 audit does not assert `accessibilityLabel` or contrast ratios. |
| **Engine merge/spawn/score, `pendingSpawn`/`previewFor`, board Skia rendering** | ADR-01 purity: engine and `src/render` untouched (verified `git show` 0 engine files, 0 render files). | Engine suite (964 pass in spec Auto Run Result) remains the gate; this plan asserts "no engine edits" as regression gate. |
| **Haptics / punch / shake / bullet time / Reduced Motion visuals (Epic 8), SFX, monetisation (Epic 4)** | No feel, audio, or IAP code touched. | Epic 8 and Epic 4 suites remain gates. |
| **expo-haptics / native Taptic Engine, web/PWA haptics** | Third-party native module, not in 9-1 delta. | Trust external; device tactile check is for tap target usability, not haptic weight. |
| **Leaderboard tabs implementation** | Not yet implemented (spec Residual risks notes future component must follow 44pt floor). | Audit test expectation covers it: future tab Pressable must expose ≥44pt or audit must be updated — failure is intentional if omitted. |
| **Visual pixel-perfect proof (Figma diff, screenshot golden)** | 9-1 is a metric gate (≥44pt) not a visual regression gate; CTA padding is functional not aesthetic. | Manual simulator check listed as P2; no Playwright visual baseline required. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH / BUS | **Allowlist audit gap: future Pressable slips below 44pt because `tapTargets.audit.test.ts` is allowlist-based (explicit `mustContain` per style name) rather than dynamic scan.** Adding leaderboard tabs, new banners, or a new `src/ui` file without updating the `expectations` array will not fail the audit — defect ships silently. Epic 9 will add multiple new touchables (tabs, facets, theme toggles), so gap is load-bearing. | 3 | 2 | **6** | Immediate: add a P1 dynamic scan test that greps every `Pressable` style in `src/ui/**/*.tsx` + `App.tsx` and asserts each style block contains `HIT_TARGET` or `≥44`. Keep allowlist as documentation but add scan as hard gate. Track as P1-07. | FE / QA | Before 9-2 branch |
| R-002 | BUS / TECH | **CTA truncation regression via style override or fixed-size reintroduction.** `styles.cta` currently `minWidth/minHeight + padding` lets "Jogar de novo" breathe. A future style merge (`[styles.cta, {width: HIT_TARGET}]`) or a Flex parent `alignItems: stretch` override could re-clamp to 48 or introduce `ellipsize` hidden truncation; i18n PT label is the longest and would show first. No runtime measurement asserts visible width, only static `includes` checks. | 2 | 3 | **6** | Pin with a render assertion: mount `GameOverOverlay` with `stats` + German/long PT label, measure `cta` style `minWidth/minHeight + paddingHorizontal` and assert `hasStyle` with `minWidth` and `paddingHorizontal` plus a snapshot that `ctaLabel` is not truncated (no `numberOfLines` on label). Keep the `mustNotContain: 'cta: {\n    width: HIT_TARGET'` guard. | FE | This story (commit with the negative assertion already in audit P1) |

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | BUS | **Visible floor vs `hitSlop` confusion.** `PauseButton.tsx:16` uses `hitSlop={4}` in addition to 48×48. A contributor may replace `minHeight` with `hitSlop` alone, passing a "touchable" logic test while failing WCAG visible-target criterion (44pt visible, not just extended hit area). Current audit asserts `minWidth/minHeight` but does not forbid relying solely on `hitSlop`. | 2 | 2 | 4 | Add lint guard: audit must assert visible floor (`minWidth/minHeight` or `width/height`) and treat `hitSlop` as additive only; document in `spec-9-1` that `hitSlop` is not a floor substitute. |
| R-004 | TECH / BUS | **Chrome overlaps board `Gesture.Pan` capture rect.** `Hud` assist row, `AcceleratedAids` banners, or `GameOverOverlay` continue row placed too close to `boardWrap` may fall inside `GestureDetector` bounds. Result: swipe gesture steals tap or tap steals swipe → missed moves / stuck board. Current P1 test only checks string ordering of `boardWrap` vs `menuBtn`, not viewport geometry. | 2 | 2 | 4 | Add a layout doc test that asserts `PauseButton`/`assistBtn` are rendered in `portraitBand`/`landscapeBand`/`assistRowPortrait` which are siblings outside `boardWrap`; manual simulator check: inspector measure pause slot 48pt inside safe margin, board rect via `layoutFor(...).boardSize` verification. |
| R-005 | TECH | **`HIT_TARGET` drift below 44 (density optimisation).** A layout density pass may lower `HIT_TARGET` to 40 to fit landscape thin band; existing `ui.thinview.test.ts` pins `size >=44` but a batch "cleanup" could batch-update both constant and test expectation, silently lowering floor. | 1 | 3 | 3 | Dual pin: keep `ui.thinview.test.ts` and `tapTargets.audit.test.ts` P0 both asserting `>=44`; add CHANGELOG comment `// WCAG 2.5.5 / Apple HIG: never below 44` at export site. |
| R-006 | PERF | **Flex shrink with `flex:1` + `minWidth` interplay on small screens.** `continueAd`/`continueIap` are `flex:1` with `minWidth: HIT_TARGET`. On narrow 320pt containers, flex may attempt to shrink below min, causing overflow, horizontal scroll, or label wrapping. Current static audit does not assert parent `continueRow { gap:8 }` keeps children above min on smallest `availWidth`. | 1 | 2 | 2 | Add P2 render check: mount `GameOverOverlay` in a 320-width container (via `onLayout` mock) and assert both `continueAd`/`continueIap` still report `minWidth: 48` and `flex:1` row does not overflow; document `gap:8` + `minWidth` contract. |
| R-007 | TECH | **Style extraction false-positive from stripped comments/strings.** Audit uses `stripCommentsAndStrings` then `includes`; a style name appearing only in a comment/string could satisfy `mustContain` without real style. Conversely a dynamic style (`style={[base, condition && extra]}`) that merges HIT_TARGET via computed object may not be caught by string match. | 1 | 2 | 2 | Treat audit as tripwire not proof; supplement with runtime mount assertions (`hasStyle(renderer, {minWidth:48})`) for the CTA critical path (already in `gameOverOverlay.test.ts` P1). Document that audit is static hygiene, not viewport measurement. | DEV |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | BUS | **ToneScreen whole-screen Pressable blocks board swipe if not unmounted promptly after dismiss.** `ToneScreen.tsx` root is `flex:1` Pressable; if dismissal animation delays unmount, board `Gesture.Pan` is occluded. | 1 | 1 | 1 | Monitor — assert ToneScreen only mounts on first-launch flag and unmounts synchronously on press (timer cleared). Manual device pass covers it. |
| R-009 | TECH | **Landscape thin band (48pt) clips pause glyph on devices with large `insets.top` (notch + status bar).** `getBandTop` adds `SAFE_MARGIN` but band height is fixed 48; glyph may be visually clipped even if hit area is 48. | 1 | 1 | 1 | Monitor — visual check on tall-notch device in landscape; consider `hitSlop` + padding already mitigates. |

### Risk Category Legend

- **TECH**: Technical/Architecture (contracts, purity, style hygiene, layout)
- **SEC**: Security (auth, data exposure) — none this story
- **PERF**: Performance (layout thrash, overflow, frame budget)
- **DATA**: Data Integrity (engine rules) — none in scope (engine untouched)
- **BUS**: Business Impact (WCAG/Apple HIG, miss-taps, i18n truncation, UX)
- **OPS**: Operations (CI, OTA, onboarding) — none blocking for 9-1

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

8-1 touches a narrow NFR surface: **accessibility (WCAG 2.5.5 target size)**, **reliability/never-throw**, **maintainability (single source of HIT_TARGET)**. Performance/OTA scalars are unchanged; security/scalability are out of scope.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Accessibility — target size | WCAG 2.5.5 Level AAA (enhanced) / Apple HIG: every interactive target ≥44×44pt (logical pt, not physical px). Verified at component level, not per-screen; pause/banners/menu rows/tone skip all in scope. Threshold is a floor: `HIT_TARGET >=44` and each Pressable style `minWidth/minHeight >=44` or `width/height >=44`. | R-001, R-002, R-005 | Host static audit (`tapTargets.audit.test.ts` 4 tests) + thin-view guard (`ui.thinview.test.ts` HIT_TARGET pin) + render assertions (`gameOverOverlay.test.ts` / `app.restart.test.ts` hasStyle). Manual cross-check on simulator layout inspector for pause outside board rect and CTA with PT label. | `triade/__tests__/ui/tapTargets.audit.test.ts` green (4/4), `triade/__tests__/ui/ui.thinview.test.ts` green, `npm test` suite 964 pass log from spec Auto Run Result; optional screenshot/measure of GameOver CTA with long label. |
| Reliability — never throw | Touch-target layer never throws on any props/insets (NaN insets, missing `insets`, undefined `onPress`). Hit area constants are literals, no runtime computation that can throw. | R-007 | Unit negative-path: mount each overlay with `insets: null`, `undefined`, `NaN` insets; assert no throw and HIT_TARGET floor still holds (GameOverOverlay `clampInset` already defensive). | Existing 964-pass suite + GameOverOverlay bare-prop tests (e.g., `insets as any` fallback). |
| Maintainability | `HIT_TARGET` is the single access point in `PauseButton.tsx`; no scattered `44`/`48` literals for hit floors. Future chrome must import `HIT_TARGET` rather than hard-coding `44`. | R-005 | Static scan: grep for `44` literals in `src/ui` hit styles — only `HIT_TARGET` and `card minHeight: 88` (intentional 2× floor) allowed; scattered literal grep fails if found outside `PauseButton.tsx` export. | Source scan output + existing guard `mustContain: 'HIT_TARGET'` per file in audit. |
| Performance — layout / 60 FPS | 9-1 adds no worklet, no Reanimated driver, no Skia draw; only style constants + one extra static test file. Must not regress frame budget: engine <2 ms, frame <8 ms, p99 <16.7 ms (NFR-11 / ADR-04 two-level benchmark). Threshold is unchanged from Epic 8 — no new budget. | — | Host bench: `layoutFor` + `useSyncedLayout` still <1 ms (existing layout suite). No per-frame allocation from tap-target changes. Device: existing `useFrameRateBaseline` stats after 2-min play (Epic 8 lane) re-run as nightly; 9-1 must not degrade p99. | `triade/__tests__/ui/layout.test.ts` timings (existing); `useFrameRateBaseline` log `fps`/`p99Ms`/`frames` if nightly runs (deferred to Epic 8 nightly). |
| Offline / Installability | No new network/native dependency; `HIT_TARGET` is pure constant, no extra native module. App remains installable+offline (NFR-2/NFR-6). | — | Verify via `npx tsc --noEmit` + `npm test` green; no `expo-doctor` drift (static file only). | `npx tsc --noEmit` clean + `npm test` pass. |

**Unknown thresholds:** None material for 9-1. If CI layout benchmark lane is absent, record actual measured `p99Ms` as baseline rather than inventing a threshold (mark UNKNOWN only if no device data collected). Contrast thresholds (WCAG AA 4.5:1) belong to 9-3/9-4, not 9-1 — do not assert here.

---

## Entry Criteria

- [ ] Spec `spec-9-1-tap-targets-44x44pt.md` and `epic-9-context.md` are the reviewed revisions (`baseline_revision`/`final_revision` pinned in spec).
- [ ] `triade/src/engine/**` and `triade/src/render/**` byte-identical to baseline (ADR-01 purity gate; `git show HEAD --stat` confirms 0 engine/render files).
- [ ] Branch on SDK 57 pinned versions (expo ~57.0.11, RNH ~2.32.0, Skia 2.6.2, Reanimated 4.5.1 — existing matrix).
- [ ] Host test runner `npm test` green at 964/964 baseline before delta (captured in spec Auto Run Result: 964 pass, 0 fail, 366 skipped).
- [ ] `npx tsc --noEmit` clean (no new `@ts-ignore` introduced).
- [ ] Simulator/device available for the one manual CTA-label + pause placement check (can defer to PR reviewer on own sim).

## Exit Criteria

- [ ] All P0 tests passing (100%). Gate: `npm test -- triade/__tests__/ui/tapTargets.audit.test.ts triade/__tests__/ui/ui.thinview.test.ts` green.
- [ ] All P1 tests passing or failures triaged with approved waivers (≥95%).
- [ ] No open bugs with severity S0/S1 against tap-target floor or GameOver CTA truncation.
- [ ] `triade/src/engine/**` still byte-identical post-merge (`git diff --stat -- triade/src/engine` empty).
- [ ] Manual simulator pass (≥15 min, one portrait + one landscape device): GameOver CTA with PT label "Jogar de novo" grows with padding no truncation; pause 48×48 inside safe margins outside board swipe rect; banner × 48×48; lane cards ≥88; tone skip whole-screen.
- [ ] Residual allowlist gap either fixed with a dynamic scan test or explicitly waived with owner+expiry at 9-2 review (R-001 decision logged).
- [ ] Coverage target: every Pressable in `triade/src/ui` + `App.tsx` covered by at least one automated test (actual: 7 files × audit expectations; gate is 100% touchable coverage, not line %).

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE / QA (TEA) | Host audit + thin-view guards, layout isolation, PR gate, device smoke |
| UX reviewer | UX | Sign-off on CTA truncation policy (R-002) and leaderboard tab future floor |
| QA / TEA | QA | Risk gate (R-001 dynamic scan waiver), release sign-off |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` denote priority/risk. Execution timing (PR vs nightly vs device-manual) is defined under Execution Strategy.

### P0 (Critical) — Host unit, no device, <5 s

**Criteria**: Blocks core accessibility contract + high risk (≥6) or no workaround + cheap host execution. Every 44pt floor failure is an App Store / WCAG miss-tap regression with no workaround for motor-constrained users.

| # | Requirement / AC | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | AC1 HIT_TARGET floor | `HIT_TARGET` exported from `PauseButton.tsx` is integer ≥44 and `width/height: HIT_TARGET` applied to pause button box | Unit (static file read) | R-005 | 1 | DEV (done) | `tapTargets.audit.test.ts` P0 + `ui.thinview.test.ts:67` duplicate pin — intentional dual gate. |
| P0-02 | AC1 every Pressable ≥44 (static audit) | Every Pressable style in `src/ui` + `App.tsx` contains `minWidth/minHeight: HIT_TARGET` or `width/height: HIT_TARGET` (or documented floor like `card 88`, `ToneScreen flex:1`); negative check `cta` must NOT contain fixed `width: HIT_TARGET` | Unit (static scan) | R-001, R-002 | 7 file groups, 1 `it()` loop | DEV (done) | `tapTargets.audit.test.ts` expectations array — exhaustive per manual audit of 8 files. |
| P0-03 | AC2 GameOver CTA never truncates | `cta` block uses `minWidth + minHeight + paddingHorizontal` not fixed square, so "Jogar de novo" breathes | Unit (static + render) | R-002 | 1 | DEV (done) | Static part in P0-02 + dedicated P1 check below; `gameOverOverlay.test.ts` P0 also asserts `hasStyle` with `minWidth`. |
| P0-04 | AC3 pause outside board swipe rect | `Hud` renders `PauseButton` in `landscapeBand`/`portraitBand`/`pauseSlot`; `App.tsx` has separate `boardWrap` + `GestureDetector(GameBoard)` sibling, `menuBtn` outside; ordering check `boardWrap` vs `menuBtn` | Unit (static scan) | R-004 | 1 | DEV (done) | `tapTargets.audit.test.ts` P1-04 ordering check; cheap sibling check. |
| P0-05 | AC1 assist row ≥44 | `Hud.tsx` `assistBtn` has `minWidth/minHeight: HIT_TARGET` and `hitSlop` is additive only (not substitute) | Unit | R-003 | 1 | DEV (done) | Covered by P0-02 allowlist but pinned separately because assist row is absolute-positioned near board (overlap-sensitive). |
| P0-06 | AC2 GameOver CTA render pin (HIT_TARGET identity) | CTA style references `HIT_TARGET` via `minWidth/minHeight` directly (no arithmetic) and rendered style has `minWidth:48` via `hasStyle` | Component (render) | R-002 | 2 | DEV (done) | `gameOverOverlay.test.ts:193,410` + `app.restart.test.ts:369` relaxed guard now asserts `(minWidth\|width): HIT_TARGET` and `hasStyle` with `minWidth`. |
| P0-07 | AC4 no regression on engine/render/theme | `git diff --stat -- triade/src/engine triade/src/render src/theme` empty + `npx tsc --noEmit` + full suite still 964 pass | Ops/CI | — | 1 (CI check) | CI | Single bash gate in PR. |

**Total P0**: 7 groups (10 `it()` assertions across two files), host-only, executes in PR in <5 s.

### P1 (High) — Integration + layout + i18n (host, <2 min)

**Criteria**: Validates the wiring and the viewport contract; medium risk (3–4) and common workflows. Failure here is user-visible (truncation, overlap) but has a static fallback in P0.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | AC2 CTALabel breathe with padding | Parse `GameOverOverlay.tsx` `cta` block: has `minWidth`, `minHeight`, `paddingHorizontal`, and lacks `width: HIT_TARGET` (negative). Mounted render: `ctaLabel` has no `numberOfLines`/`ellipsize` and CTA grows past 48 when label is long | Unit (static+render) | R-002 | 2 | DEV | `tapTargets.audit.test.ts` P1 already implements static part; add render mount with `t('gameOver.restart')` = "Jogar de novo" and assert `StyleSheet.flatten(styles.cta).paddingHorizontal===24`. |
| P1-02 | AC1 banner dismiss × ≥44 | `AcceleratedAids.tsx` `dismissBtn` has `minWidth/minHeight: HIT_TARGET` + `paddingHorizontal: 8` keeps × glyph centered; `bannerText` + `dismissBtn` share `bannerContent flex gap 8` without overflow | Unit (static) | R-004 | 1 | DEV | In P0 allowlist; keep as separate row for clarity (banner is always visible when triggered). |
| P1-03 | AC1 lane cards + warning confirm/cancel | `LaneSelectScreen.tsx` `card minHeight:88`, `warningConfirm/warningCancel/cta/restoreBtn minHeight: HIT_TARGET`, `langBtn minWidth+minHeight` | Unit | — | 1 (loop) | DEV | Allowlist already asserts; regression pin if lane screen layout changes. |
| P1-04 | AC1 AcceleratedAids prompt buttons | `adBtn/iapBtn minHeight: HIT_TARGET` with `flex:1` side-by-side; `cancelBtn minHeight: HIT_TARGET` full-width; row `promptRow {gap:8}` keeps both above min on narrow containers | Unit (static) | R-006 | 1 | DEV | Flex shrink risk R-006 validated here. |
| P1-05 | AC1 App menuBtn (Pistas) | `App.tsx` `menuBtn` has `minHeight/minWidth: HIT_TARGET`; `boardWrap` is sibling of chrome, not parent — chrome never inside `GestureDetector` | Unit | R-004 | 1 | DEV | Ordering pin in P0-04 dual-covers. |
| P1-06 | AC1 layout band contract | `layout.ts` `LANDSCAPE_BAND_HEIGHT ===48` fits ≥44pt; `SAFE_MARGIN 16` + `getBandTop` keeps band inside safe area; `BOARD_SIZE_FLOOR 216 =44*4+8*2+8*3` holds | Unit | — | 1 | DEV | `layout.test.ts` + `layout.doc-layout-count-sync.atdd.test.ts:138-139` already pin. |
| P1-07 | TECH gap closure — dynamic scan (new) | Scan every `src/ui/**/*.tsx` + `App.tsx` for `Pressable` style references and assert each resolves to a style with `HIT_TARGET` or `≥44` literal; fail if any Pressable style lacks floor (catches future leaderboard tabs without allowlist update) | Unit (scan) | R-001 | 1 (new) | FE | Not yet in repo — this plan proposes it; without it, R-001 stays at 6. Implement as `triade/__tests__/ui/tapTargets.scan.test.ts`. |
| P1-08 | AC2/AC3 tutorial skip ≥44 | `TutorialOverlay.tsx` `skipBtn minWidth/minHeight: HIT_TARGET`; whole-screen fallback not needed (explicit skip button) | Unit | — | 1 | DEV | Allowlist already covers. |

**Total P1**: ~8–9 logical assertions, ~3–6 h to finalise (fixtures + new scan test) plus 15-min simulator pass.

### P2 (Medium) — Edge, perf, regression, i18n

**Criteria**: Secondary flows + low/medium risk (1–4) + perf/regression depth.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | i18n long label overflow | Mount `GameOverOverlay` with `t('gameOver.restart')` returning a 30-char string, assert CTA style not truncated and `ctaLabel` renders full string (no ellipsis) | Component (render) | R-002 | 1 | DEV | Future-proof for DE/FR long translations. |
| P2-02 | Flex narrow container (320pt) | Mount `GameOverOverlay` continue row in a 320-width mock container, assert `continueAd`/`continueIap` both keep `minWidth:48` and row does not overflow beyond `maxWidth:420` | Component | R-006 | 1 | DEV | Validates `flex:1` + `gap:8` contract. |
| P2-03 | Engine/render/theme purity regression | `git diff --stat -- triade/src/engine triade/src/render src/theme` empty + `npm test` 695 pre-story tests still green + `npx tsc --noEmit` | Ops/CI | — | 1 (CI check) | CI | Single bash gate in PR. |
| P2-04 | Visible vs hitSlop documentation | Assert `PauseButton` has both visible floor (`width/height: HIT_TARGET`) and additive `hitSlop={4}`; grep gate that no style relies on `hitSlop` alone for floor | Static (grep) | R-003 | 1 (lint/grep) | DEV | Prevents future hitSlop-only shortcut. |

**Total P2**: ~4 checks.

### P3 (Low) — Exploratory / manual / benchmarks

**Criteria**: Nice-to-have + exploratory + device tactile tuning.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Device miss-tap exploratory | On simulator/device, attempt rapid taps near pause edge, banner ×, and CTA with fingertip shadow; confirm no miss registration (≥44pt generous). | Exploratory (manual) | 1 | QA/FE | Not a pass/fail gate; captures notes for 9-2 VoiceOver hit slop tuning. |
| P3-02 | Landscape safe-area visual | On notched device in landscape, confirm pause glyph not clipped by status bar and band still 48pt | Manual (visual) | 1 | QA | Screenshot optional. |

**Total P3**: 2 exploratory checks.

---

## Execution Order

For this story execution is host-dominated; manual is the only tactile gate.

### Smoke (<1 min, host, every save)

- `npm test -- triade/__tests__/ui/tapTargets.audit.test.ts triade/__tests__/ui/ui.thinview.test.ts` — P0 host audit (4 + 2 tests) + full suite sanity (964 pass per spec).
- `npx tsc --noEmit` — type gate (no new `@ts-ignore`).

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 + P1 host assertions (allowlist audit + thin-view + layout doc sync + any new scan test).
- **CI purity gate**: `git diff --stat -- triade/src/engine triade/src/render` empty.
- **Static scan**: scattered `hitSlop`-only grep fails if found; HIT_TARGET literal scan outside `PauseButton.tsx` fails if found (future).

### Device/simulator gate (manual, ~15 min, before merge)

- **Simulator pass** (iOS Simulator is sufficient for geometry — Taptic Engine not needed): portrait + landscape; measure GameOver CTA with PT label (long) → padding breathes; pause outside board rect; banner × 48; lane cards 88; tone skip whole-screen. Capture one screenshot per orientation.
- **Leaderboard future**: when tabs land, press their 44pt hit area on smallest width (320) and assert no overlap with board.

### Nightly/weekly — not required for 9-1

No perf/chaos/large-dataset suites. A sustained 10-min play p99 trace for Epic 8 benchmarks already covers frame budget; 9-1 adds no load.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node --test` parallelisation); defer only tactile/visual geometry to a quick simulator pass because it requires a viewport, not a harness.

- **PR**: All functional host tests (P0 + P1 host assertions + P2 static/bench). No infrastructure overhead — `node --test` + `tsc` is the only runner.
- **Pre-merge device**: One manual iOS Simulator pass (P1-05/P3 lanes, R-002 PT label, R-004 pause placement). Owner is the PR author; sign-off is a checkbox in the PR description ("tap-target smoke: CTA PT + pause outside board + banner ×").
- **Nightly/weekly**: None for 9-1. Epic 9 contrast gates (9-3/9-4) are the nightly lane when theme palettes land.

No Playwright/k6 contract/perf harness is required for this delta (no UI intercept, no network API, no backend).

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 7 groups (10 `it` assertions already written) | 0.1–0.25 | **~1–2 h** | Already done; review + fixture upgrade only. |
| P1 | 8 groups (6 host allowlist + 1 new scan + 1 layout pin) | 0.25–0.75 | **~3–6 h** | Dominated by writing the dynamic scan test (`tapTargets.scan.test.ts`) + CTA long-label mount. |
| P2 | 4 checks | 0.25–0.5 | **~1–2 h** | Grep/static + narrow-container mount + CI gate. |
| P3 | 2 exploratory | 0.25–0.5 | **~0.5–1 h** | Manual simulator ranking, not gating. |
| **Total** | **~21 checks** | — | **~6–13 h** | **~1–2 days** wall-clock with simulator access; host-only completion is ~0.5 day. |

Prerequisites:

- **Test data**: Deterministic i18n fixtures (`t('gameOver.restart')` → PT long label, EN short label); `layoutFor` fixtures from `layout.test.ts`.
- **Tooling**: `node --test`, `tsx`, `typescript`; iOS Simulator (Xcode) for smoke (no real-device Taptic needed).
- **Environment**: Host (`node >=26`, as per `engines`), iOS Simulator (SDK 57). No staging backend.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions; all P0 groups green).
- **P1 pass rate**: ≥95% (if the new dynamic scan is pending, it counts as a waiver with owner+expiry at next story 9-2; mock-level P1 must already be green).
- **P2/P3 pass rate**: ≥90% informational; P2-03/P2-04 static gates must be green (they are cheap).
- **High-risk mitigations**: R-001 and R-002 have a decision + test or explicit signed waiver with expiry (next story 9-2 review) — otherwise FAIL.

### Coverage Targets

- **Critical paths (every Pressable ≥44 + CTA never truncates + pause outside board)**: 100% of touchable files covered by at least one automated test (actual: 7 files × audit expectations; gate is 100% file coverage, not line %).
- **Accessibility target-size scenarios**: 100% (SEC category empty; BUS category is WCAG 2.5.5).
- **Business logic (`HIT_TARGET` single-source)**: 100% of declared hit floors swept via scan.
- **Edge cases (narrow container, i18n long label, NaN insets)**: ≥90%.

### Non-Negotiable Requirements

- [ ] All P0 tests pass.
- [ ] No high-risk (≥6) items unmitigated without signed waiver.
- [ ] Engine/render byte-identical regression gate passes.
- [ ] WCAG 2.5.5 / Apple HIG 44pt floor pinned by a test that asserts visible floor (not hitSlop).
- [ ] Simulator smoke sign-off present in PR before merge.

---

## Mitigation Plans

### R-001: Allowlist audit gap — future Pressable below 44pt not caught (Score: 6)

**Mitigation Strategy:**
1. Add a new host test `triade/__tests__/ui/tapTargets.scan.test.ts` that: globs `triade/src/ui/*.tsx` + `triade/App.tsx`, parses each file for `Pressable` JSX, extracts the `style={...}` binding, and asserts the resolved style object (or its nearest `StyleSheet.create` entry) contains `HIT_TARGET` or a numeric `≥44`. This is a dynamic scan complementing the allowlist doc test.
2. Keep the existing allowlist (`tapTargets.audit.test.ts`) as documentation of expected floors per style name (e.g., `card 88`, `assistBtn 48`) — do not delete; both gates run.
3. Add a CI grep gate that fails if any `Pressable` in `src/ui` lacks an imported `HIT_TARGET` (except `ToneScreen` whole-screen `flex:1` special-case, explicitly documented).
4. Review checklist item for every 9.x PR: "new Pressable has HIT_TARGET floor + scan test updated".

**Owner:** FE (FE lead + QA reviewer)
**Timeline:** Before 9-2 branch (or document waiver at 9-1 merge with expiry at 9-2)
**Status:** Planned
**Verification:** `npm test -- tapTargets.scan.test.ts` green + `rg` gate green + PR template checkbox

### R-002: CTA truncation regression via style override or fixed-size reintroduction (Score: 6)

**Mitigation Strategy:**
1. Keep the negative guard in `tapTargets.audit.test.ts`: `mustNotContain: 'cta: {\n    width: HIT_TARGET'` — this is the tripwire against fixed square reintroduction.
2. Add a render assertion: mount `GameOverOverlay` with `t('gameOver.restart')` stubbed to "Jogar de novo" (long) and assert `StyleSheet.flatten(styles.cta).minWidth===48 && paddingHorizontal===24` plus `hasStyle(renderer, {minWidth:48})` already pinned.
3. Assert `ctaLabel` has no `numberOfLines`/`ellipsizeMode` so long label wraps/grows rather than truncates.
4. Manual simulator check: GameOver screen with PT locale, measure CTA width >48 and height ≥48, no ellipsis.
5. If policy is "accept fixed 48 for EN only", replace with a UX-sign-off comment and a test that asserts the chosen fixed vs min policy — but current policy is min+padding (spec Intent), so keep.

**Owner:** FE
**Timeline:** This story (commit with the negative guard already landed)
**Status:** Complete (planned render supplement in next PR)
**Verification:** Static guard green + render hasStyle green + simulator screenshot

---

## Assumptions and Dependencies

### Assumptions

1. `HIT_TARGET = 48` is the WCAG 2.5.5 floor plus 4pt generosity; lowering to 44 would still pass WCAG but would reduce tap generosity — assumption is 48 stays (per `ui.thinview.test.ts:67` pin and spec Always "HIT_TARGET stays ≥44").
2. The `src/ui` layer is pure RN views (thin views per `ui.thinview.test.ts`), so checking style objects is sufficient — no Skia/board hit testing needed for tap targets (board uses `Gesture.Pan`, not Pressable).
3. The audit's `stripCommentsAndStrings` + `includes` string checks are sufficient as tripwires; full viewport measurement (e.g., `measure` on mount) is reserved for simulator, not CI.
4. `insets` from `react-native-safe-area-context` are always provided by `App.tsx`; `GameOverOverlay` fallback `clampInset(insets?.top ?? 0)` is defensive for bare `as any` test mounts only.
5. Leaderboard tabs are not yet implemented — future 9-2 component will follow same 44pt floor and will update the audit expectations (intentionally fails if omitted).

### Dependencies

1. `triade/src/ui/PauseButton.tsx` must remain the single source of `HIT_TARGET` — any rename or move must update the 7 importing files and both guard tests.
2. Simulator access for the 15-min device gate before merge — required by: merge day (manual, not CI). No real-device Taptic needed.
3. `triade/__tests__/test-utils/helpers.ts` `stripCommentsAndStrings` remains available for the static audit (used by P0-02).
4. `react-test-renderer` stays the host renderer for `hasStyle` checks (no migration to RNTL required for 9-1).

### Risks to Plan

- **Risk**: Leaderboard tabs ship with a custom `Tab` component that hard-codes `height: 36` for visual compactness → audit allowlist not updated → 36pt target ships.
  - **Impact**: WCAG 2.5.5 failure, miss-taps on tabs, App Store a11y review flag, but no crash.
  - **Contingency**: The proposed dynamic scan test (R-001 P1-07) would catch this even without allowlist update; add the scan before 9-2. If scan is waived, add a pre-merge checklist item "tabs ≥44?" to 9-2 PR template.
- **Risk**: `LaneSelectScreen.tsx` card density optimisation lowers `minHeight:88` to `72` to fit small screens → still ≥44 but reduces generous area.
  - **Impact**: Low — still passes WCAG but UX generosity regresses.
  - **Contingency**: Keep `88` pinned in audit as intentional 2× floor; any change requires UX sign-off.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|---|---|---|
| **Engine (`src/engine/core`)** | None — observer only, no rules changed. Purity ADR-01 must hold. | `git diff --stat -- triade/src/engine` empty + full engine suite green (964 pass log). |
| **Render / Board (`src/render/GameBoard`)** | None — tap targets are RN chrome; board uses `Gesture.Pan` worklet, not Pressable. | Existing `GameBoard` trace-driven tests remain gate; no Skia snapshot change. Zero `src/render` files in delta. |
| **Layout (`src/ui/layout.ts`, `useSyncedLayout.ts`)** | Band heights must stay 48pt (landscape) / 96pt (portrait) to fit pause; change to band heights must keep 48pt floor (spec Residual risks). | `layout.test.ts` + `layout.doc-layout-count-sync` pins `LANDSCAPE_BAND_HEIGHT 48`, `BOARD_SIZE_FLOOR 216`; `useSyncedLayout.test.ts` green. |
| **Hud / PauseButton** | Assist buttons + pause slot placement outside board; hit area must not overlap board swipe rect | `Hud.tsx` tests + `pauseSlot width: HIT_TARGET` + manual pause placement check. |
| **LaneSelectScreen** | Cards/warning/cta/restore/lang buttons all ≥44; tone 88 for cards | Allowlist audit covers; `LaneSelectScreen` snapshot still green. |
| **GameOverOverlay** | CTA fix + continue row flex with minWidth; no monetisation or score logic change | `gameOverOverlay.test.ts` (P0 CTA pins) + `tapTargets.audit.test.ts` P1 cta block; `app.restart.test.ts` CTAPIN still green. |
| **AcceleratedAids / Tutorial / Tone** | Banner dismiss, prompt buttons, skip — all ≥44; Tone whole-screen is >>44 | Allowlist audit covers; manual dismiss/skip pass. |
| **App.tsx chrome vs boardWrap** | `menuBtn (Pistas)` ≥44 and outside `boardWrap` sibling; board swipe isolation relies on sibling layout | Ordering check `boardWrap` vs `menuBtn` + `GestureDetector` presence. |
| **Future 9.2–9.4 a11y stories** | Break risk: new chrome without floor would infect 9-1 contract | Dynamic scan gate (R-001) + per-9.x PR review guard. |
| **Theme / tokens (`src/theme`)** | None — no palette changed in 9-1 | No theme regression; 9-4 will validate. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk scoring (P×I), categories (TECH/SEC/PERF/DATA/BUS/OPS), gate thresholds (≥6 needs mitigation, 9 blocks).
- `probability-impact.md` — P1=Low, P2=Medium, P3=High; score interpretation (1–9).
- `test-levels-framework.md` — Unit for pure constants/style objects, component for mounted Pressable assertions, manual for tactile/visual geometry (no E2E harness needed for this delta).
- `test-priorities-matrix.md` — P0 = blocks core + high risk + no workaround (here: HIT_TARGET floor + CTA truncation + pause placement).
- `nfr-criteria.md` — WCAG 2.5.5 target-size thresholds, reliability never-throw, maintainability single-access-point, performance frame-budget gaps become risks.
- `selector-resilience.md` — Style-object assertions (`hasStyle`) preferred over text match for Pressable floors.

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md` (FR28, FR29-32)
- Epic context: `_bmad-output/implementation-artifacts/epic-9-context.md`
- Story spec: `_bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md` (baseline `8901f63`, final `c32eaee`, review loop 0)
- Architecture: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (ADR-01 purity, UX-DR6/13)
- UX Design: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md` (UX-DR6/13/17/19, D-008)
- Working-tree evidence: commit `819fb2a feat(9-1)` + `triade/__tests__/ui/tapTargets.audit.test.ts` (4 tests)

---

**Generated by**: BMad TEA Agent — Murat (Master Test Architect) via `bmad-testarch-test-design`
**Workflow**: `bmad-testarch-test-design` (Epic-Level)
**Version**: 4.0 (BMad v6) — targeted delta for `9-1-tap-targets-44x44pt`
**Config**: `_bmad/tea/config.yaml` → `test_artifacts: _bmad-output/test-artifacts` / `test_design_output: _bmad-output/test-artifacts/test-design`

### Follow-on Workflows (Manual)

- Run `*atdd` to generate any missing P1 host fixtures (P1-07 dynamic scan test `tapTargets.scan.test.ts`, P1-01 CTA long-label mount) — separate workflow, not auto-run.
- Run `*automate` once 9-2 screen-reader labels land (adds `accessibilityLabel`/`accessibilityRole` coverage).
- Run `*nfr-assess` after 9-3/9-4 theme palettes exist for WCAG AA contrast validation.

---

## Approval

**Test Design Approved By:**

- [ ] Product / FE Lead: _____________ Date: ____
- [ ] UX (CTA truncation policy + future leaderboard tabs): _____________ Date: ____
- [ ] QA / TEA: _____________ Date: ____

**Comments:**

---
