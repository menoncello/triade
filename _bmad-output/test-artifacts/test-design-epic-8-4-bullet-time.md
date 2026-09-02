---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-01'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-4-bullet-time.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - 'triade/src/feel/bulletTime.ts'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/game/matchOrchestrator.ts'
  - 'triade/__tests__/feel/bulletTime.test.ts'
  - 'triade/App.tsx'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 8 / Story 8-4 — Bullet Time (Rarity-Gated 200ms Flash, Snapshot-Rewind, Reduced Motion Gated)

**Date:** 2026-09-01
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — single-story deep-dive for `8-4-bullet-time`
**Scope:** Targeted test design for the working-tree delta of story 8-4

> **Delta under assessment:** Commit `0e2717e` (`feat: 8-4 bullet time — rarity-gated 200ms flash on new session-best`) — 1 commit ahead of `590e461` (baseline `e4629cd`/`590e461` for epic 8). The current uncommitted diff is metadata-only (`_bmad-output/implementation-artifacts/sprint-status.yaml` `8-4-bullet-time: backlog→done`); the assessed production change is the committed `0e2717e` delta:
> - `triade/src/feel/bulletTime.ts` (new, 66 LOC) — pure helpers `BULLET_TIME_MS=200` constant, `maxMergeValue(trace)`, `isNewSessionBest(trace, sessionBest)`, `shouldTriggerBulletTime(trace, sessionBest, reducedMotion)`, `nextSessionBest(trace, sessionBest)` — host-testable, no RN/Reanimated/Skia imports, `Number.isFinite` + `try/catch` never-throw, filters only board merges (`!spawned && from.length===2 && finite value`), wraps no fixed-step loop
> - `triade/src/feel/feel.ts` (+2 LOC comment) — frozen presets intact (`PRESET_LIGHT/MEDIUM/HEAVY` + `REDUCED_PRESET`), defensive comment that bullet time uses fixed `200ms` datum not per-preset, gating via `shouldTriggerBulletTime` (no new preset field)
> - `triade/src/game/matchOrchestrator.ts` (+1 LOC) — `Snapshot` interface extended with optional `sessionBestMerge?: number` (App owns Snapshot creation; orchestrator undo/restart paths preserve it without extra runtime logic)
> - `triade/App.tsx` (+48 −33 LOC) — new `sessionBestMerge: number` state (init `0`), `Snapshot` type extended, `doMove` captures `snapshot` with `sessionBestMerge` before `move()`, functional update `setSessionBestMerge(prev => nextSessionBest(result.trace, prev))` to avoid stale closure under `EARLY_INPUT_MS≈84ms` gate, reset to `0` on `handleRestart` and lane switch (`applyLaneSelection` + `lastDirectionRef` clear), restore on undo/continue with `Number.isFinite(snap.sessionBestMerge) ? snap.sessionBestMerge : 0` guard (7 restore sites: undo request/Ad/IAP, continue Ad/Iap, lane change path), threaded `sessionBestMerge` + `settings.reducedMotion` into `GameBoard`
> - `triade/src/render/GameBoard.tsx` (+43 −1 LOC) — new props `sessionBestMerge?: number`, shared value `bulletFlash` + `bulletFlashStyle` `opacity`, imperative flash sequence `withSequence(withTiming(0.45,{duration:60}), withTiming(0,{duration:BULLET_TIME_MS-60}))` ≈200ms on `Animated.View` overlay (`position:absolute` board-only `#fff7e0` `width×width` `borderRadius:14`), gated `moveResult.moved && !reducedMotion && shouldTriggerBulletTime(trace, safeBest, !!reducedMotion)` with `safeBest = Number.isFinite(sessionBestMerge) ? sessionBestMerge : 0`, `Reduced Motion` mid-animation snap `withTiming(0,20ms)` on `bulletFlash` alongside shake, `try/catch` never-throw, effect deps include `sessionBestMerge`
> - `triade/__tests__/feel/bulletTime.test.ts` (new, 133 LOC) — 9 host unit tests (P0) covering datum 200 / `maxMergeValue` extraction (board-only, spawned/from-length/non-finite filtered) / `isNewSessionBest` true/false / `shouldTrigger` Reduced Motion suppression / multiple merges max wins single 200ms / NOOP/empty/spawn-only no-trigger / non-finite never-throw / `nextSessionBest` updated-or-unchanged + undo-rewind simulation / first-merge-always-triggers sequence
> - `_bmad-output/implementation-artifacts/deferred-work.md` (+14 LOC) — 4 deferred lows from gds-code-review: spawned-undefined gap, value<3 not filtered, width NaN unvalidated, `doMove` identity invalidates on every `sessionBestMerge` change
> - No engine edits (`git diff --stat -- triade/src/engine` empty — verified), no `transitionPlan.ts` change, `triggerHapticsForTrace` stays independent (not gated here per spec "haptics stay")

---

## Executive Summary

**Scope:** Targeted test design for Epic 8, Story 8-4 Bullet Time. The story makes the rare session-best merge feel like an emotional peak: a fixed `BULLET_TIME_MS=200` flash overlay on the board container that fires only when a board merge's value exceeds the running `sessionBestMerge` (max merged value this session), with `sessionBestMerge` living in the `Snapshot` so undo rewinds it (ADR-06, UX-DR-28), implemented as a timing datum on the merge event (no fixed-step loop or game-logic delay), and suppressed under Reduced Motion while haptics+sound stay (FR-30, UX-DR-16). The flash is board-only (`Animated.View` overlay, never chrome/Hud preview card), `200ms` total (`60ms` in + `140ms` out via `BULLET_TIME_MS-60`), and the helpers are fully host-testable.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (score ≥6): 3
- Critical categories: BUS (FR-30 Reduced Motion gate — a11y/App Store compliance), DATA (Snapshot rewind — ADR-06 undo integrity), TECH (trace→bullet contract + `doMove` closure / datum single-source)

**Coverage Summary:**

- P0 scenarios: 9 groups (host unit, pure `feel/bulletTime` layer, no device — already 9 `it()` cases passing, 785 pass / 6 expected RED from prior punch ATDD not caused by 8-4)
- P1 scenarios: 7 groups (engine-trace → `maxMergeValue` fixtures + `App` Snapshot/undo wiring + `GameBoard` flash overlay + chrome guard + Reduced Motion mid-flight + datum single-source + device smoke)
- P2/P3 scenarios: 7 groups (perf micro-bench, width/overflow clipping static scan, overlap flash truncation, datum divergence grep, engine purity, deferred-work audit, feel tuning exploratory)
- **Total effort**: ~10–22 hours (~1.3–2.8 days wall-clock with device access; host-only <0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Haptics `triggerHapticsForTrace` and 8-1 `haptic` mapping (light/medium/heavy)** | Story 8-1 already shipped `FeelPreset.haptic` + `haptics.ts`; 8-4 only adds a rarity gate `shouldTriggerBulletTime` that gates the flash, never haptics. Haptics stay independent under Reduced Motion (spec "haptics stay" FR-30). | 8-1 test design + `feel.test.ts` + `haptics` suite remain gate; 8-4 asserts `bulletTime.ts` never gates haptics and that `reducedMotion` does not suppress `triggerHapticsForTrace` (host + device checklist). |
| **Punch visual 8-2 (overshoot/flash/particles/1536 glow)** | `AnimatedTile` overshoot/flash/glow/burst paths already shipped; 8-4 only adds a sibling flash on the board container overlay, keeping tile punch + burst paths intact and independent shared values (`shakeX/Y` vs `bulletFlash`). | 8-2 test design + `punch.test.ts` (8 cases) remain gate; 8-4 device smoke asserts punch still fires alongside bullet flash (no mutual suppression). |
| **Screen shake 8-3 (directional shake, `shakeMs` 2/5 cap 8)** | `GameBoard` shake wiring already shipped; 8-4 keeps shake timing independent (shake `130ms` vs bullet `200ms`) but they can co-fire on same heavy new-best (bullet `12` where `shakeMs 5` also fires). Bullet does not alter shake amplitude/axis. | 8-3 test design + `shake.test.ts` (12 cases) remain gate; 8-4 asserts shake still fires on new-best heavy merges alongside flash and that Reduced Motion snaps both. |
| **Reduced Motion umbrella rollout 8-5** | 8-4 gates only its own flash via `shouldTriggerBulletTime(trace, best, reducedMotion)` and `GameBoard` `!reducedMotion` guard; global `REDUCED_PRESET` rollout beyond `bulletTime`'s own gate belongs to 8-5. | 8-5 will require its own test design; this plan pins the bullet gate so 8-5 has a clean contract to extend and asserts `particleBurst`/`overshootScale`/`flash` outside bullet remain placeholder data for future tuning. |
| **SFX+haptics 8-6 (`expo-audio`)** | No `expo-audio` SFX; bullet time is visual-only flash (haptics+sound coupling for SFX is 8-6, but haptics gateway already called via `triggerHapticsForTrace` not gated here). | 8-6 each requires own design; this plan asserts sound/haptics not gated by `reducedMotion` here. |
| **Engine merge/spawn/score rules, `pendingSpawn` / `previewFor` / undo history invariants** | ADR-01 purity: engine is pure TS single source of truth, unchanged in this delta (byte-identical `triade/src/engine`). `maxMergeValue` filter `from.length===2 && !spawned` mirrors `shake.ts`/`transitionPlan.ts` classification — no duplicate merge predicate beyond `src/feel` gateway. App's `Snapshot` already carries `{game, match, matchStats}`; 8-4 only extends it. | Engine invariants pinned by existing 695+ tests + PR check `git diff --stat -- triade/src/engine` empty. This plan adds a "no new predicate outside engine" grep regression gate. |
| **RevenueCat / AdMob / IAP / consent / Crashlytics / Epic 10-11** | No monetization, telemetry, or privacy code touched. | Existing Epic 4 / Epic 10-11 suites remain gate. |
| **Theming, VoiceOver contract (Epic 9), crash-free sessions** | No tokens, no labels, no navigation changes beyond `sessionBestMerge` + `reducedMotion` prop plumbing. | Epic 9 / 10 NFR gates unchanged. |
| **Reanimated/Skia native implementation itself** | Third-party native worklets (`withTiming`/`withSequence`, `Animated.View`, `Canvas`) treated as external. | Trust but verify via device smoke; no unit mock of Reanimated timing physics beyond datum/opacity host assertions. |
| **Web / PWA parity** | Target is Expo dev build on iOS (SDK 57, Reanimated 4, Skia). Web has no haptics and limited worklet parity. | Manual device-only validation for flash visuals; web excluded except "no throw" host check. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | BUS | **FR-30 Reduced Motion non-compliance (flash should be smoothed/disabled while haptics+sound stay).** Bullet correctly gates via `shouldTriggerBulletTime(trace, best, reducedMotion)` early-return + `GameBoard` guard `moveResult.moved && !reducedMotion && shouldTrigger...` + `useEffect` snap `bulletFlash withTiming(0,20ms)` when `reducedMotion` toggles mid-flash. Risk is wiring regression if `settings.reducedMotion` is memoised stale, if lane-switch/restart `setSessionBestMerge(0)` is forgotten (stale best suppresses re-trigger), or if future 8-5 refactors wrap bullet+haptics in same guard (haptics must stay — FR-30/UX-DR-16). Silent violation → a11y / App Store review risk. Patch history for 8-4 shows `Number.isFinite` guard and `BULLET_TIME_MS-60` single-source were triage fixes — same class of gate drift. | 2 | 3 | **6** | Pin contract with (a) unit sweep: for every tier `shouldTriggerBulletTime([merge12], best, true)===false` while `nextSessionBest` still advances (already in `bulletTime.test.ts` Reduced Motion case), (b) regression that `App.tsx` passes `settings.reducedMotion` + `sessionBestMerge` into `GameBoard` (grep/snapshot), (c) comment `// FR-30: bullet gated — haptics stay` and a `grep -R reducedMotion triade/src/feel` gate that only allows `feel.ts:REDUCED_PRESET` + `bulletTime.ts`/`shake.ts` helpers (not `haptics.ts`). Device: iOS Settings → Reduce Motion ON → 3/6/12 merges → flat overlay (no flash) but haptics still felt. | FE lead | Immediate (add grep gate + comment this story; enforce in 8-5 review) |
| R-002 | DATA | **Snapshot rewind integrity — `sessionBestMerge` lives in `Snapshot` so undo rewinds it (ADR-06, UX-DR-28).** `App.doMove` pushes `snapshot` before `move()` and `undoHistory` restores `sessionBestMerge` with `Number.isFinite` guard on 7 sites (`handleUndoRequest/Ad/Iap`, `handleContinueAd/Iap`, lane `needsReset`, `applyLaneSelection` reset). Risk: old history entries without `sessionBestMerge` fall back to `0` so next low `3` re-triggers (deferred as designed but product-visible), `NaN/Infinity` in corrupted snapshot disabling bullet permanently (fixed via `Number.isFinite` guard), or a future refactor dropping `sessionBestMerge` from `Snapshot` (engine copes because optional `?` but App would silently stop rewinding). Rapid `EARLY_INPUT_MS` re-opens gate before `setState` flush — functional `setSessionBestMerge(prev=>nextSessionBest(...))` mitigates race but `doMove` deps still include `sessionBestMerge` invalidating closure identity (deferred). | 2 | 3 | **6** | Assert wiring: unit that `nextSessionBest` correctly advances/retains, and that undo `pop` restores `sessionBestMerge` to prior value so same `12` re-triggers (already in `bulletTime.test.ts` undo-rewind simulation + `nextSessionBest` sweep). Integration host test that `App` `Snapshot` includes `sessionBestMerge` and that `Number.isFinite` guard is present on all 7 restore sites (grep `Number.isFinite(snap.sessionBestMerge)`). Host check that `doMove` uses functional update (not stale `sessionBestMerge` closure). Device: undo after `12` best → redo same merge re-flashes. | FE | Immediate |
| R-003 | TECH | **Trace contract mismatch / spawned-undefined + value<3 pollution + datum single-source drift.** `maxMergeValue` filters `!entry.spawned` (treats missing `undefined` as merge) and `from.length===2 && Number.isFinite(value)` but does not clamp `value>=3`; `isNewSessionBest`/`nextSessionBest` delegate to it. Review triage deferred two lows: (a) `!spawned` treats missing `undefined` as merge — engine today sets `spawned:false` explicitly but future schema change would false-trigger flash; correct would be `spawned !== true` per `canMerge` contract. (b) `value<3` (0/negative) not filtered — sentinel `0` would set best `0` then first real `3` re-triggers incorrectly; engine never emits <3 today but defensive guard missing. (c) `BULLET_TIME_MS` single-source: `GameBoard` now correctly uses `BULLET_TIME_MS-60` for second timing, but a future tuning that hardcodes `140` again would drift from datum `200` without data change (spec "never exceed 200ms cap without data change"). | 2 | 3 | **6** | Contract test that enumerates *real* `MoveResult.trace` fixtures via `move(game, dir, rng)` (not hand-built stubs) and asserts `maxMergeValue` fires iff `from.length===2 && spawned===false && finite && >=3` (tighten spec if product wants `>=3` clamp) and that `type==='spawn'` entries never trigger; assert `GameBoard` overlay timing uses imported `BULLET_TIME_MS` (grep `BULLET_TIME_MS` appears in `GameBoard.tsx` and no literal `140` outside `BULLET_TIME_MS-60`). Keep `bulletTime.ts` thin wrappers — no duplicate predicate; static scan `grep -R "BULLET_TIME_MS" src/` hits only `bulletTime.ts` + `GameBoard.tsx` + `feel.ts` comment. Pin datum `200` in unit. | FE | Before 8-5 (bullet tuning is pillar for 8-5 Reduced Motion preset) |

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Board-only chrome guard leak.** `GameBoard` wraps only `Canvas` in `Animated.View` for shake and renders bullet overlay as `Animated.View position:absolute width×width` over the board (board only, never chrome). If hierarchy wraps too high, `Hud` preview card / score would flash with board (UX-DR-27 chrome rule violation). `treview` history notes width NaN propagation not validated — `width` flows directly to overlay `style width/height` without `Math.max` guard. | 2 | 2 | 4 | Assert `GameBoard` `Animated.View` bullet overlay is sibling of `Canvas` wrapper (not ancestor of `Hud`), snapshot that `PreviewCard`/score `Text` never receive `bulletFlashStyle`. Static scan that overlay uses `width` directly — add `Math.max(width,1)` or early-return guard if product wants NaN hardening (currently deferred). |
| R-005 | TECH | **NOOP / slide-only / Reduced Motion mid-flight bleed.** Effective move with only slides (`moved:true` but no merge entries, `maxMerge===null`) or NOOP (`moved:false`) must not flash; toggling `reducedMotion` mid-flash must snap `bulletFlash` to `0`. Code now does `if (moved && !reducedMotion && shouldTrigger)` else no animation, plus `useEffect([reducedMotion])` snap to `0`. Risk: missed branch re-introduces one-frame flash or leaves residual `0.45` opacity after Reduced Motion toggle. | 1 | 3 | 3 | Host test that `shouldTriggerBulletTime(slideOnlyTrace)===false` and `shouldTrigger([], best)===false` and `shouldTrigger(null)===false` (already in `bulletTime.test.ts` NOOP cases). Host lifecycle check that `reducedMotion` `false→true` snaps `bulletFlash` via `withTiming(0,20)`. Device: NOOP swipe → no flash. |
| R-006 | TECH | **`doMove` closure identity churn.** `doMove` deps include `sessionBestMerge` (functional update mitigates race but still invalidates closure identity every new best); comment at `App.tsx:769` claims stable gesture created once — no longer stable. `panGesture` reads `doMoveRef.current` so gesture remains stable, but lint/perf and stale-closure audit deferred. | 2 | 2 | 4 | Verify `doMoveRef` pattern holds gesture stable while `doMove` identity churns; add regression note that `doMove` must set `lastDirectionRef` synchronously before `move()` (code review seam). Deferred ref-optimization audit as with shake — track in `deferred-work.md`. |
| R-007 | PERF | **Rapid new-bests <200ms apart re-assign `bulletFlash` shared value (last wins, not queued).** Spec says "single 200ms bullet time (not per-merge)" for multiple merges in one move (handled via `max` wins), but two *separate* moves that each set a new best within `200ms` (possible via `EARLY_INPUT_MS≈84ms` gate) overwrite `bulletFlash withSequence` mid-flight — acceptable rarity, not stacking by design, but truncation is visible and violates no-jank NFR if device drops frames. `shake` has same overlap without `cancelAnimation` (deferred low). | 2 | 2 | 4 | Device video that two rapid new-bests (e.g. `6` then `12` within `~90ms`) show truncated flash but no freeze; if truncation is jarring, add `cancelAnimation(bulletFlash)` before new `withSequence` (one-line, keeps `200ms` budget). Host check that `maxMergeValue` already handles multi-merge within one move as single max (already in `bulletTime.test.ts` P0-05). |
| R-008 | TECH | **Old-history migration — entries without `sessionBestMerge` fallback to `0` so first low merge after undo re-triggers.** `Snapshot.sessionBestMerge` is optional `?` for migration; old `undoHistory` entries without the field fall back to `0` via `Number.isFinite` guard, so first low `3` re-triggers bullet even though it was not a new best in the original session. Design notes mark this as "migration as designed, not a bug" but needs product sign-off. | 1 | 2 | 2 | Document migration as accepted in spec Residual risks; add unit comment that `Number.isFinite(undefined) ? ... : 0` is intentional migration. No fix this story — pin with test that `undefined` sessionBest in `GameBoard` safeBest coalesces to `0`. |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | TECH | **Non-finite safety fallback masks corruption.** `maxMergeValue`/`isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest` all `try/catch` never-throw and `Number.isFinite` guards correctly skip `NaN/Infinity` entries, but `presetFor(NaN)`→light path already exists for haptics — subtle inconsistency if trace corruption is silently skipped for bullet but not for haptics notification. | 1 | 1 | 1 | Monitor — keep never-throw fallback but keep host sweep `non-finite never throw` (already in `bulletTime.test.ts`). Add `__DEV__` warning only if product wants corruption surfacing; not a gate. |
| R-010 | TECH | **`width` NaN propagation to bullet overlay style.** `GameBoard` `width` prop flows via `useWindowDimensions`/`layoutFor` and is validated for `cell = Math.max((width-...) / GRID, 1)` but overlay `width/height` style receives `width` directly; degenerate `NaN` propagates to RN warning, not reachable via finite `layoutFor` inputs. Deferred as low. | 1 | 2 | 2 | Monitor — early-return guard would prevent RN warning but not reachable; deferred entry already filed. No fix this story; visual test via `width` NaN injection host check if needed. |

### Risk Category Legend

- **TECH**: Technical/Architecture (contracts, purity, integration, animation orchestration)
- **SEC**: Security — none this story (no auth/data exposure)
- **PERF**: Performance (frame budget, main-thread worklet coalescence)
- **DATA**: Data Integrity — Snapshot rewind, migration, sessionBest placement (ADR-06)
- **BUS**: Business Impact (accessibility, App Store compliance, visual chrome rule, perceived rarity)
- **OPS**: Operations (dependencies, builds, OTA, CI gating) — none high this story; `reanimated`/`skia` already pinned in 8-1/8-2/8-3

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

8-4 touches visual NFR surface: **60 FPS bullet budget**, **reliability/never-throw**, **maintainability (single datum `BULLET_TIME_MS=200`)**, **accessibility FR-30 + chrome rule**, and **offline/installability** unchanged. `200ms` flash (`60ms` in + `140ms` out) is the only new NFR knob; it must stack cleanly with shake `130ms` and punch `120ms` overshoot+particles without pushing `p99` beyond NFR-1.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Performance — 60 FPS / frame budget | NFR-1 + NFR-11: engine <2 ms/turn, frame logic worst-case <8 ms, device p99 <16.7 ms with bullet layer (`200ms` overlay `0.45 opacity withSequence` on board `Animated.View`) concurrent with Skia Canvas + Reanimated main-thread worklets + 8-2 punch overshoot+particles + 8-3 shake `130ms` if two heavies stack. `BULLET_TIME_MS 200` is max pixel time; must not delay game logic (no fixed-step loop). | R-007, R-003, R-004 | Host micro-benchmark: sweep `maxMergeValue`/`isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest` for allocation; measure no per-merge `withSequence` stacking beyond single bullet per `moveResult`. Device lane: `useFrameRateBaseline` stats after 2-min play with 5+ new-bests including at least one `12` while `Reduced Motion` OFF and one heavy that also shakes (bullet+shake co-fire), plus a rapid-swipe pair within `200ms` window. Video capture for overlap artefact. | CI `npm test` timing + benchmark lane output if present (otherwise `npm test` timing); `useFrameRateBaseline` log `fps`/`p99Ms`/`frames`; `npx tsc --noEmit` clean. |
| Reliability — never throw | Engine-never-throws extended to feel+bullet: `maxMergeValue`/`isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest` + `GameBoard` bullet effect never throw on any input (`null` trace, `NaN`, `Infinity`, `-5`, `undefined` sessionBest, `undefined` direction, empty `from`, `spawned` missing). `GameBoard` effect silent no-op on empty plan (NOOP), on `sessionBestMerge===undefined`, on `width NaN`, on unmount mid `withSequence`. | R-009, R-010, R-005, R-002 | Unit negative-path sweeps: `NaN`, `Infinity`, `-1`, `null`/`undefined` value, empty trace, trace with only `spawned:true` or `from.length!==2`, `sessionBest NaN/Infinity/undefined`, `directionVector` irrelevant but `bulletFlash` never throws; `GameBoard` unmount during pending `withSequence`. | `triade/__tests__/feel/bulletTime.test.ts` 9 cases (includes `non-finite never throw`, `NOOP/empty no trigger`, `spawn-only` filtered) + `Number.isFinite` guard sweep on restore sites. |
| Maintainability | `BULLET_TIME_MS` is the single access point for bullet timing (no scattered `200`/`140`/`60` literals), `bulletTime.ts` thin wrappers over `maxMergeValue` → `isNewSessionBest`; `FEEL_PRESETS` frozen; `Snapshot.sessionBestMerge?` is optional for migration. Future story 8-5 reuses same `shouldTriggerBulletTime` gate without rework. | R-003, R-004, R-006 | Static-assert: grep for literal `200` outside `bulletTime.ts:BULLET_TIME_MS` fails except `BULLET_TIME_MS-60` derived; grep for `140`/`60` bullet timing outside `GameBoard.tsx` using `BULLET_TIME_MS-60` fails; `maxMergeValue` delegates to single merge predicate (no duplicate branching). | Source scan + identity test `BULLET_TIME_MS===200` + `shouldTriggerBulletTime` uses `isNewSessionBest` + `GameBoard` imports `BULLET_TIME_MS`. |
| Accessibility / Compliance — FR-30 + chrome rule | Reduced Motion gates *all* bullet visuals (`shouldTriggerBulletTime(trace, best, true)===false`, board `bulletFlash` snapped `0` even mid-animation) while `nextSessionBest` still advances and haptics+sound stay (`haptic` preserved is not gated here — 8-4 never touches `haptics.ts`). Chrome rule UX-DR-27: bullet overlay is `Animated.View position:absolute width×width` over board only — `Hud` preview card and score never flash. Datum `200ms` respects product cap ("never exceed 200ms without data change"). | R-001, R-004, R-005 | Unit: `shouldTriggerBulletTime(trace, best, true)===false` for all tiers & high `12` while `nextSessionBest` still advances (already) + `maxMergeValue` non-finite skip + `sessionBest NaN` no trigger. Host: `GameBoard` snapshot asserts `bulletFlash` overlay is sibling of shake wrapper, not ancestor of `Hud`, and `reducedMotion` mid-flight snaps. Device: enable iOS Settings → Reduce Motion ON → perform `3`/`6`/`12` new-bests → confirm flat overlay (no `#fff7e0`) while haptics still felt; confirm `Hud` preview card never flashes even when board does; tone screen not affected. | `bulletTime.test.ts` Reduced Motion sweep + `GameBoard` render inspection; device checklist signed in PR. |
| Offline / Installability | Installable + offline (NFR-2, NFR-6) unchanged; no new CDN/network dependency (`reanimated`/`skia` already bundled from 8-2). | — | App runs offline with bullet (device airplane mode) — no network fetch for bullet logic (pure helpers). | Manual airplane-mode device pass (deferred to same device smoke as performance). |

**Unknown thresholds:** None material for 8-4. If CI benchmark lane is absent, record actual measured `p99Ms` as baseline rather than inventing a threshold (mark UNKNOWN only if no device data collected). `BULLET_TIME_MS 200` and `60ms+140ms` sequence are pinned by this plan — tolerances come from `src/feel/bulletTime.ts:7` + `GameBoard.tsx:475` constants, not from PRD.

---

## Entry Criteria

- [ ] Spec `spec-8-4-bullet-time.md` and `epic-8-context.md` are the reviewed revisions (`baseline_revision 590e461` → `final_revision 12a3dcd` pinned in spec; assessed HEAD `0e2717e` byte-identical to `12a3dcd` plus review patches).
- [ ] `triade/src/engine/**` byte-identical to baseline (ADR-01 purity gate) — `git diff --stat -- triade/src/engine` empty.
- [ ] Branch is on SDK 57 pinned versions (expo ~57.0.11, Reanimated 4, Skia, RNGH — existing matrix; `expo-haptics` best-effort via `void import()` as in 8-1, not gated here).
- [ ] Host test runner `npm test` green at 785/791 baseline — 6 pre-existing RED from punch ATDD accepted (`R-001` tutorial dedup, `R-006` expo-haptics, `R-002`/`R-007` burst cleanup, `P2-01` burst accumulation, `P2-01` shake overlap, `P2-05` shake clipping — not caused by 8-4, documented in spec Auto Run Result 785 pass / 6 fail; 9 `bulletTime` tests pass).
- [ ] `npx tsc --noEmit` clean (no new `@ts-ignore` for `bulletTime.ts`; `bulletTime.ts` is strictly typed with `TraceEntry` import, `readonly` trace).
- [ ] Feature is behind no flag — bullet is immediate on trace merge entry (`from.length===2 && !spawned && finite`) gated only by `reducedMotion` + rarity `max > sessionBestMerge` (initial `0` guarantees first `3` fires).
- [ ] `BULLET_TIME_MS` is `200` single-source in `bulletTime.ts:7` and imported in `GameBoard.tsx` (no hard-coded `140`/`200` drift).

## Exit Criteria

- [ ] All P0 tests passing (100%) — includes `bulletTime.test.ts` 9 cases + `feel.test.ts` 12 cases (engine purity preserved) + `shake.test.ts` 12 + `punch.test.ts` 8 (no regression on co-fired feel).
- [ ] All P1 tests passing or failures triaged with approved waivers (host integration with real engine fixtures + `App` Snapshot/undo wiring + `GameBoard` overlay + one device smoke).
- [ ] No open bugs with severity S0/S1 against bullet trigger / chrome guard / Reduced Motion gate / Snapshot rewind / datum single-source.
- [ ] `triade/src/engine/**` still byte-identical post-merge (CI check `git diff --stat -- triade/src/engine` empty) and no duplicate merge predicate outside engine+feel gateway (`grep -R "from.length===2" --include="*.ts" --include="*.tsx" src/` hits only `src/engine` + `src/feel/bulletTime.ts` + `src/feel/shake.ts` + `src/render/transitionPlan.ts` — 4 sanctioned sites).
- [ ] Device smoke pass (iOS dev build, at least one real-device run: `3→flash 200ms` first merge, `3→no flash` when best `6`, `6→flash` when best `3`, `12→flash` when best `6`, each portrait+landscape; undo after best `12` → redo same `12` re-flashes; toggle Reduced Motion → all bullet flat while haptics still felt; NOOP swipe → no flash; preview card & score never flash — sign-off in PR description).
- [ ] `BULLET_TIME_MS` still single-sourced via `bulletTime.ts` + `BULLET_TIME_MS-60` in `GameBoard` (no scattered `200`/`140` literals outside datum) — static scan gate.
- [ ] Coverage target: all 8 rows in spec I/O & Edge-Case Matrix covered by at least one automated test (actual: `bulletTime.test.ts` covers new-best trigger / ordinary no-trigger / first merge / multiple merges max wins single 200ms / Reduced Motion / NOOP / undo rewind via `nextSessionBest` / non-finite safety; gap is `GameBoard` flash overlay timing + `App` undo restore — covered by host integration P1).
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` and `triade/tsconfig.test.json` clean.

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE / TEA | Owns `bulletTime.ts` pure helpers + `GameBoard` bullet overlay + `App` Snapshot wiring, host unit sweeps, engine-trace fixtures, device smoke sign-off |
| — | QA (if staffed) | Reviews FR-30 gate + chrome rule + ADR-06 Snapshot, validates device p99, owns deferred-work triage for spawned-undefined / value<3 / width NaN / doMove identity |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` denote priority/risk. Execution timing (PR vs nightly vs device-manual) is defined under Execution Strategy.

### P0 (Critical)

**Criteria**: Blocks core bullet contract + high risk (≥6) or no workaround + pure/cheap host execution.

| # | Requirement / AC | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | AC rarity-gated trigger + datum | `BULLET_TIME_MS===200` single-source datum | Unit | R-003 | 1 | DEV (done) | `bulletTime.test.ts` case 1 — pins datum `200` fixed for S8.4. |
| P0-02 | AC `maxMergeValue` extraction board-only | `maxMergeValue(null/undefined/[] → null)`, `[entry(6)]→6`, `[entry(3),entry(12)]→12`, `spawned:true` ignored, `from.length!==2` ignored, `NaN/Infinity` ignored, `[3,6,12]→12` max | Unit | R-003, R-004 | 1 (loop) | DEV (done) | Filters only `!spawned && from.length===2 && finite`. |
| P0-03 | AC `isNewSessionBest` true/false | `6 vs 6 → false`, `12 vs 6 → true`, `3 vs 0 → true`, `6 vs 12 → false`, `[]/null vs 0 → false`, `NaN/Infinity vs 0 → false` (ignored) | Unit | R-002, R-003 | 1 (loop) | DEV (done) | Rarity gate `max > sessionBest`. |
| P0-04 | AC `shouldTrigger` Reduced Motion gate (FR-30) | `shouldTrigger([12],0,true)→false` vs `false→true`, `shouldTrigger([12],6,true)→false`, `shouldTrigger(null,0,false)→false`; `nextSessionBest` still advances even when `shouldTrigger` suppressed | Unit | R-001 | 2 | DEV (done) | Shake-style Reduced Motion loop; flash never touches haptics. |
| P0-05 | AC multiple merges max wins single 200ms (not per-merge) | `[3,12] vs 6 → max 12 → true + nextBest 12`; `[3,6] vs 12 → false + unchanged` | Unit | R-007 | 1 | DEV (done) | Sequential max; data-layer multi-merge pin; spec I-O row 4. |
| P0-06 | AC NOOP / no-merge silent | `shouldTrigger([],0)→false && null→false && undefined→false`; trace with only slides `from.length===1` or spawns `spawned:true` → `max null && shouldTrigger false` | Unit | R-005 | 1 | DEV (done) | Silent no-op contract — board visually unchanged. |
| P0-07 | AC non-finite never throw + `nextSessionBest` safety | `maxMergeValue([NaN,Infinity,-Infinity])` never throws, `isNewSessionBest([NaN],0)→false` never throws, `shouldTrigger([NaN],0,false)→false` never throws, `shouldTrigger([NaN],NaN,false)→false` never throws, `nextSessionBest([NaN],6)→6` unchanged | Unit | R-009 | 2 | DEV (done) | Engine-never-throws extension; `Number.isFinite` guards. |
| P0-08 | AC `nextSessionBest` updated-or-unchanged + undo rewind | `nextSessionBest([12],6)→12`, `[6],12→12`, `[]→6`, `null→6`, `[3],0→3`, `0→3→6→12` chain then undo to `6` → `isNewSessionBest([12],6)→true` re-triggers | Unit | R-002 | 2 | DEV (done) | ADR-06 Snapshot rewind pin; spec undo row. |
| P0-09 | AC first-merge-always + rarity sequence | `shouldTrigger([3],0)→true`, `[3],6→false`, `[6],3→true`, `[6],6→false`, `[12],6→true` — even `3` can trigger if first, ordinary later `3` never does | Unit | R-003 | 1 (loop) | DEV (done) | Rarity not value gate; spec row 3 + design notes. |

**Total P0**: 9 groups (9 `it()` cases in file), host-only, <5 s.

### P1 (High)

**Criteria**: Validates the declarative trace→board→bullet wiring and the native boundary; medium/high risk (3–4) and common workflows. Requires either engine fixtures (host) or a real device.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | AC trace→bullet contract | `maxMergeValue`/`shouldTrigger` over a **real engine trace fixture** (via `move(game, dir, rng)` seeded `mulberry32`) correctly identifies a merge entry iff `from.length===2 && !spawned && finite` and `isNewSessionBest` uses `max`; spawned entries never trigger | Integration (host, engine fixture) | R-003, R-004 | 2 (1 single-merge `1+2→3` fixture, 1 multi-merge fixture with 2 merges) | DEV | Pull fixtures via real `move()` (as `feel-trace-fixtures.ts` for shake); eliminates stub drift. Assert `trace` with `spawned:true` never triggers even if `from.length===2`. |
| P1-02 | AC `App` Snapshot/undo wiring | `App.doMove` uses functional `setSessionBestMerge(prev=>nextSessionBest(trace,prev))`; `Snapshot` includes `sessionBestMerge`; 7 restore sites use `Number.isFinite(snap.sessionBestMerge) ? snap.sessionBestMerge : 0`; `handleRestart` and lane-switch `needsReset` reset `sessionBestMerge` to `0`; old `undoHistory` entry without field coalesces to `0` | Integration (host, App seam + code inspection) | R-002, R-006 | 3 (1 unit for functional update + `Snapshot` include, 1 grep for 7 restore guards, 1 reset host check) | DEV | Verify via `grep -n "Number.isFinite.*sessionBestMerge" App.tsx` hits 7 sites + `grep -n "setSessionBestMerge"`. |
| P1-03 | AC `GameBoard` flash overlay datum + board-only | `GameBoard` overlay renders `Animated.View position:absolute width×width borderRadius:14 backgroundColor:#fff7e0` with `opacity: bulletFlash` (`bulletFlashStyle`), triggers `withSequence(withTiming(0.45,60), withTiming(0, BULLET_TIME_MS-60))` only when `moved && !reducedMotion && shouldTriggerBulletTime(trace, safeBest, !!reducedMotion)`; `safeBest = Number.isFinite(sessionBestMerge) ? sessionBestMerge : 0`; overlay never receives `shakeStyle` transform and `Hud`/`PreviewCard` never receive `bulletFlashStyle` | Integration (host, render seam) | R-004, R-003 | 2 (1 overlay snapshot + 1 trigger branching) | DEV | Host check via component tree snapshot; Reanimated timing itself is device-only; assert `import { BULLET_TIME_MS }` present and no literal `140`. |
| P1-04 | AC Reduced Motion mid-animation snap | Toggling `reducedMotion` `false→true` during an in-flight `200ms` flash snaps `bulletFlash withTiming(0,20ms)` via the `useEffect([reducedMotion])` branch alongside `shakeX/Y`; `GameBoard` never leaves residual `0.45` opacity | Integration (host lifecycle + device) | R-001, R-005 | 1 | DEV | Wrap `GameBoard` in `act` + flip `reducedMotion` prop mid-`withSequence`; assert snap branch. Device: start flash on `12` new-best then toggle iOS Reduce Motion via app Settings toggle → board snaps flat. |
| P1-05 | AC chrome guard never on chrome | `GameBoard` bullet `Animated.View` is sibling of shake `Animated.View` wrapping `Canvas`; `Hud` preview card / score `Text` siblings are outside both animated wrappers (snapshot asserts `bulletFlashStyle` not on `Hud`). Spawn-only or NOOP traces create 0 flash. | Integration (host, component seam) | R-004 | 1 | DEV | Assert via component tree snapshot that `PreviewCard` subtree never receives `bulletFlashStyle`/`shakeStyle`. |
| P1-06 | AC datum single-source + engine purity | `BULLET_TIME_MS` is defined once in `bulletTime.ts:7`; `GameBoard` imports it and uses `BULLET_TIME_MS-60`; `grep -R "BULLET_TIME_MS"` allowlist is `bulletTime.ts` + `GameBoard.tsx` + `feel.ts` comment; `git diff --stat -- triade/src/engine` empty; `grep -R "from.length===2" src/` allowlist is `src/engine` + `src/feel/bulletTime.ts` + `src/feel/shake.ts` + `src/render/transitionPlan.ts` (4 sanctioned sites) | Static (CI) | R-003, R-006 | 1 (CI checks) | Single `bash` gate in PR. |
| P1-07 | Device smoke (real iPhone dev build) | In portrait+landscape, first `1+2→3` triggers `~200ms` `#fff7e0` flash (board only); repeat `3` when best `6` → no flash; `6` while best `3` → flash and best becomes `6`; `6` again no flash; `12→flash`; toggle Reduced Motion ON → repeat each new-best → flat while haptics still felt; NOOP swipe → no flash; preview card never flashes; undo after `12` → redo same `12` re-flashes; `200ms` does not delay next swipe (EARLY_INPUT_MS≈84ms gate still opens). | Device smoke | R-001, R-002, R-005, R-007 | 1 (manual checklist, ~15 min) | Owner is PR author; sign-off checkbox in PR description ("device bullet smoke: first 3 flash / 6 re-trigger / 12 heavy + Reduced Motion ON flat + NOOP + chrome + undo rewind"). Use dev build; airplane mode included. |

**Total P1**: ~12 logical assertions + 1 device pass, ~4–7 h to finalise fixtures + seam plus 15-min device pass.

### P2 (Medium)

**Criteria**: Secondary flows + low/medium risk (1–4) + perf/regression depth; narrowly scoped smoke.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | Overlap flash truncation | Two rapid `moveResult` effects within `200ms` (simulated swipe at `EARLY_INPUT_MS≈84ms` that each sets a new best e.g. `6→12`) each compute `nextSessionBest` independently but second `withSequence` overwrites first without `cancelAnimation` → truncated first flash (last wins). Assert truncation is the design behaviour, not a freeze. If `cancelAnimation` is added, second flash starts clean. | Unit (host, state machine + device video) | R-007 | 1 | DEV | If host seam unavailable, defer to device video but document waiver; fix seam would be `cancelAnimation(bulletFlash)` before new `withSequence`. Same deferred class as shake 8-3 R-001. |
| P2-02 | Perf micro-bench | `maxMergeValue` + `isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest` + `BULLET_TIME_MS` sweep completes <<1 ms host; no per-merge `withSequence` allocation spike beyond single bullet per `moveResult`; no `setTimeout`/`setInterval` loop (datum only). | Unit (bench) | R-007 | 1 | DEV | Lightweight `node --test` bench block (no external harness); measure 10k sweeps. |
| P2-03 | Datum + cap static scan | `BULLET_TIME_MS` is single source; `BULLET_TIME_MS - 60` appears once in `GameBoard`; literal `200` outside `bulletTime.ts` fails except datum definition; literal `140`/`60` bullet timing outside `GameBoard` `withTiming` fails; `3`/`6`/`12` literals only in preset/feel ladder, not in `bulletTime.ts` threshold (there is none — rarity gate). | Static | R-003 | 1 (lint/grep) | DEV | Prevents hard-coded `200`/`140` divergence (the patched R). |
| P2-04 | Engine purity + duplicate predicate | `git diff --stat -- triade/src/engine` empty and `grep -R "from.length===2" src/` hits only 4 sanctioned sites (engine + bullet + shake + transitionPlan); `triade/src/feel/feel.ts` is the single access point for `shakeMs`/`haptic` literals; `bulletTime.ts` never imports RN. | Ops/CI (static) | R-003 | 1 (CI check) | CI | Single `bash` gate in PR. |
| P2-05 | Width / overflow clipping static/device check | Grep that `GameBoard` overlay `View style width/height=width` + `App.boardWrap overflow:hidden` is present; device screenshot that `200ms` flash at board corners does not visibly clip beyond `borderRadius:14` / `overflow:hidden` boundary (currently board-size `width×width`, not clamped). | Static + Manual | R-010 | 1 | QA | Visual at board corners / in landscape; `overflow:hidden` clipping is by design (board-only) — note if flash visibly cuts at edge. |

**Total P2**: ~5 checks.

### P3 (Low)

**Criteria**: Nice-to-have + exploratory + device feel tuning; not a gate.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Bullet rarity feel tuning | On device, manually rank first `3` light peak vs later `6`/`12`/`24` heavy peaks for perceived rarity separation (`0→3` always fires vs later `3` never); note if early-game `3` every new match is too frequent — feeds product decision to tier-gate bullet to `≥12` later. | Exploratory (manual) | 1 | UX/FE | Not pass/fail; feeds 8-5 tuning; residual risk "first merge 3 always triggers" in spec. |
| P3-02 | Chrome guard snapshot | On device, capture video of heavy bullet board flash vs `Hud` preview card side-by-side to prove `Animated.View` wraps `Canvas` only; note `overflow:hidden` edge if present. | Manual | 1 | QA | Optional; web snapshot not applicable (Skia Canvas). |
| P3-03 | Rapid axis + shake+bullet co-fire | On device, trigger a heavy new-best `12` that also shakes (`shakeMs 5`) → verify bullet flash (`200ms`) and shake (`130ms`) co-fire without mutual suppression and that Reduced Motion snaps both; swipe heavy then immediately `up` heavy within `130ms` → verify bullet and shake each respect their own `cancelAnimation` drift if added. | Manual | 1 | QA | Edge-case visual for overlap handling (R-007) + shake/bullet stacking. |
| P3-04 | Old-history migration spot check | On device fresh install, play one match with merges `3→6→12`, then simulate old history by checking that `Number.isFinite(undefined) → 0` fallback does not crash; first merge after simulated migration re-triggers is accepted. | Manual/Host | 1 | DEV | Waives to host unit `undefined` coalesce if device migration not reproducible. |

**Total P3**: 4 exploratory checks.

---

## Execution Order

For this story execution is host-dominated; device/manual is the only expensive gate.

### Smoke (<1 min, host, every save)

- `npm test -- triade/__tests__/feel/bulletTime.test.ts` — the 9 bullet tests (P0) + `feel.test.ts` 12 + `shake.test.ts` 12 + `punch.test.ts` 8.
- `npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json` — type gate (no `@ts-ignore` for `bulletTime.ts`; strict `readonly TraceEntry[]`).

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 cases (already in `bulletTime.test.ts`) + new P1 host fixtures (P1-01..P1-06) + P2 static/bench checks.
- **CI purity + literal scan**: `git diff --stat -- triade/src/engine` empty + `grep -R "BULLET_TIME_MS" src/` allowlist + `grep -R "from.length===2" src/` 4-site allowlist.
- **Static scan**: datum single-source and chrome guard grep.

### Device gate (manual, ~15 min, before merge)

- **Device smoke** (real iPhone dev build): single lane, trigger new-best sequence `0→3 flash`, `3→no flash`, `6→flash`, `12→flash`, each in portrait+landscape; undo after `12` → redo same `12` re-flashes; enable Reduced Motion → repeat each new-best → flat while haptics still felt; NOOP swipe → no flash; airplane mode → repeat. Rapid new-bests within `200ms` window → no freeze (R-007). Sign-off in PR description.
- **Cross-check**: 8-1/8-2/8-3 deferred REDs remain (6 pre-existing) — not re-verified unless 8-4 touched haptics/punch/shake (it did not beyond co-existing; bullet co-fires but does not suppress shake/punch timing).

### Nightly/weekly — not required for 8-4

No nightly lane. Epic 8 device p99 `<16.7 ms` covering full feel preset (shake + punch + bullet time) is the Epic-level nightly lane when 8-6 lands. 8-4 bullet `200ms` overlay alone does not justify a nightly perf harness.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node --test` parallelisation); defer only real-device bullet feel checks because they require Skia + Reanimated worklets and a Taptic-capable device.

- **PR**: All functional host tests (P0 + P1 host fixtures + P2 static/bench). No infrastructure overhead — `node --test` + `tsc` is the only runner. `tea_use_playwright_utils` is `true` in config but not required for this pure-RN story (no Playwright needed; no `page.goto` flows — a React Native bullet story, not a web Playwright flow).
- **Pre-merge device**: One manual iPhone pass (P1-07 plus exploratory P3). Owner is the PR author; sign-off is a checkbox in the PR description ("device bullet smoke: first 3 flash / 6 re-trigger / 12 heavy + Reduced Motion ON flat + NOOP + chrome + undo rewind").
- **Nightly/weekly**: None for 8-4. Epic 8 device p99 covering the full feel preset (punch + shake + bullet time) is the Epic-level nightly lane when 8-6 exists.

No k6 / contract / perf harness is required for this delta (no network API, no backend, no contract).

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 5 groups (9 `it` assertions already written in 9 cases) | 0.1–0.25 | **~0.5–1 h** | Already done; review + sweep extension only. |
| P1 | 7 groups (fixtures + Snapshot/undo + overlay + mid-flight + chrome + datum purity + device smoke) | 0.5–1.0 | **~3.5–7 h** | Fixtures from real engine traces (1.5 h) + `GameBoard` overlay seam/inspection + `App` wiring + `matchOrchestrator` Snapshot (1–2 h) + device smoke (0.25 h). |
| P2 | 5 checks (overlap + bench + datum scan + purity + clipping) | 0.3–0.7 | **~1.5–3.5 h** | Overlap flash truncation + micro-bench + two grep gates + clipping device screenshot. |
| P3 | 4 exploratory (rarity tuning + chrome snapshot + co-fire + migration) | 0.2–0.5 | **~0.8–2 h** | Manual only, not a gate; optional. |
| **Total** | **~22 logical checks** | **—** | **~6–13.5 h** | **~0.8–1.7 days** wall-clock single dev; with device wait **~10–22 h** elapsed including fixtures review + one device pass. |

- P0 host verification on change: <5 s.
- PR gate (host): <15 min end-to-end.
- Device smoke: ~15 min per pass; one pass required before merge.
- No nightly infra cost.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures; P1-01 engine-fixture waiver to device-only allowed — must be documented)
- **P2/P3 pass rate**: ≥90% (informational; exploratory P3 not a gate)
- **High-risk mitigations**: 100% complete or approved waivers (R-001 Reduced Motion host+device pin, R-002 Snapshot rewind + functional update, R-003 trace contract + datum single-source)

### Coverage Targets

- **Critical bullet paths (new-best trigger / ordinary no-trigger / first-merge / multiple max wins / Reduced Motion / NOOP / undo rewind / non-finite + datum 200)**: ≥80% line/branch via host tests; remaining via device smoke
- **Business logic (`feel.ts`/`bulletTime.ts`/`GameBoard` flash)**: 100% (all tiers + reduced + non-finite + `Number.isFinite` guard + safeBest coalesce)
- **Edge cases (NOOP, multi-merge, unmount, old-history undefined, `sessionBest NaN`, invalid trace, `width NaN`)**: ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (including `feel.test.ts` 12, `shake.test.ts` 12, `punch.test.ts` 8, `bulletTime.test.ts` 9)
- [ ] No high-risk (≥6) items unmitigated or without approved waiver
- [ ] `triade/src/engine/**` byte-identical (CI gate)
- [ ] Reduced Motion gating verified both host (unit sweep `shouldTrigger(...,true)===false` while `nextSessionBest` advances) and device (Reduced Motion ON flat + haptics still felt)
- [ ] Single-datum invariant verified (`BULLET_TIME_MS 200` import + `BULLET_TIME_MS-60` scan + unit datum loop `≤200` not exceeded without data change)
- [ ] Chrome guard verified: bullet overlay is board-only (`Animated.View` wraps board, not `Hud`)
- [ ] Snapshot rewind verified: `sessionBestMerge` lives in `Snapshot` and `Number.isFinite` guard on all restore sites, undo re-triggers
- [ ] `npx tsc --noEmit` clean (`--project triade/tsconfig.json` + `triade/tsconfig.test.json`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (NFR-1 p99 not yet measured on this story — waiver allowed as with 8-2/8-3)

---

## Mitigation Plans

### R-001: FR-30 Reduced Motion non-compliance (Score: 6)

**Mitigation Strategy:**
1. Keep `bulletTime.ts` helpers returning `false` when `reducedMotion===true` (`shouldTriggerBulletTime` early-return) while `nextSessionBest` still advances for state correctness, and `GameBoard` guard `moveResult.moved && !reducedMotion && shouldTrigger...` plus `useEffect` snap `bulletFlash withTiming(0,20)` when `reducedMotion` toggles.
2. `App.tsx` must pass `settings.reducedMotion` + `sessionBestMerge` into `GameBoard`; add a snapshot/grep regression that the props are wired and that `triggerHapticsForTrace` import is not gated by `reducedMotion`.
3. Add comment `// FR-30: bullet gated — haptics stay` and a grep gate: `rg -n "reducedMotion" triade/src/feel/` hits only `feel.ts:REDUCED_PRESET` + `bulletTime.ts`/`shake.ts`, never `haptics.ts`.
4. Device pass with iOS Settings → Accessibility → Motion → Reduce Motion ON → verify flat flash but haptics still felt (FR-30) + `Hud` chrome never flashes.

**Owner:** FE lead
**Timeline:** Immediate (add lint gate + comment this story; enforce in 8-5 review)
**Status:** Planned — P0 Reduced Motion case done (`bulletTime.test.ts` shouldTrigger respects Reduced Motion), grep gate + device pass pending
**Verification:** `bulletTime.test.ts` Reduced Motion loop + `nextSessionBest` advances check + grep gate green + device checklist signed in PR.

### R-002: Snapshot rewind integrity — `sessionBestMerge` lives in `Snapshot` so undo rewinds it (Score: 6)

**Mitigation Strategy:**
1. Keep `doMove` functional `setSessionBestMerge(prev=>nextSessionBest(trace,prev))` and `snapshot` capture before `move()` with `sessionBestMerge` included; `Snapshot` optional `sessionBestMerge?` for migration.
2. Add host tests that `nextSessionBest` correctly advances/retains and that undo `pop` restores `sessionBestMerge` to prior value so same `12` re-triggers (already in `bulletTime.test.ts` undo-rewind simulation); grep that 7 restore sites use `Number.isFinite` guard.
3. Verify `handleRestart` and lane-switch `needsReset` reset `sessionBestMerge` to `0` and clear `lastDirectionRef`.
4. Device smoke: undo after `12` best → redo same merge re-flashes; check that old history without field falls back to `0` without crash.

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned — `bulletTime.test.ts` nextSessionBest + undo-rewind cases done, `App` wiring + `matchOrchestrator` Snapshot type done, integration host audit for 7 restore sites pending
**Verification:** Host state inspection + PR diff review of `App.tsx` 7 restore sites + device undo-rewind video checklist.

### R-003: Trace contract mismatch / spawned-undefined + value<3 + datum drift (Score: 6)

**Mitigation Strategy:**
1. Pin `maxMergeValue` contract: case-sensitive board merge is `from.length===2 && spawned===false && Number.isFinite(value)` (tighten to `spawned !== true` and `value>=3` if product decides); board merges only.
2. Verify via real engine fixtures that `shouldTriggerBulletTime` fires iff max `> sessionBest`; assert spawn entries never trigger and `value<3` sentinel handled (deferred-work audit).
3. Keep `BULLET_TIME_MS` single-source: import in `GameBoard` and use `BULLET_TIME_MS-60` derived timing; static scan ensures no hardcoded `200`/`140` drift.
4. Document deferred-work entries (spawned undefined gap, value<3 pollutes, width NaN, doMove identity) as accepted lows with product sign-off.

**Owner:** FE
**Timeline:** Before 8-5 (bullet tuning is pillar for 8-5 Reduced Motion preset)
**Status:** Planned — `bulletTime.test.ts` board-only + non-finite cases done, `GameBoard` single-source patch done, real-engine fixture scan pending
**Verification:** Host real-engine fixture scan + `grep -R "BULLET_TIME_MS"` allowlist + `grep -R "from.length===2"` 4-site allowlist + device `3→flash` vs `3→no flash` rarity sequence.

---

## Assumptions and Dependencies

### Assumptions

1. SDK 57 + Reanimated 4 + Skia are pinned and the dev build includes the Reanimated Babel plugin (worklets compile) — if the plugin is missing, bullet `withSequence`/`withTiming` silently degrades (assume present, verified by `npx tsc` + prior 8-2/8-3).
2. `src/engine` is the single source of truth for merge classification via `from.length===2 && !spawned` (strict `spawned===false` today) — no caller duplicates that predicate beyond `bulletTime.ts`/`shake.ts`/`transitionPlan.ts` (checked by grep gate; spawned-undefined tightening is deferred).
3. `sessionBestMerge` initial `0` guarantees first merge fires (rarity gate `3>0`); ordinary later `3` never does when best `≥3`. Product accepts early-game `3` always triggers (residual risk noted, may tier-gate to `≥12` later).
4. `lastDirectionRef` + `sessionBestMerge` + `moveResult` are stable within a `GameBoard` render and the `EARLY_INPUT_MS≈84 ms` gate is the only re-plan trigger; rapid new-bests within `200ms` window truncate to last flash (accepted, not queued).
5. Device p99 baseline will be collected during the Epic 8 device lane (deferring full `nfr-assess` for NFR-1 is acceptable this story — same waiver as 8-2/8-3; bullet `200ms` overlay is < `shake 130ms` + `punch 120ms` so not the long pole).
6. Six pre-existing RED from 8-1/8-2/8-3 remain accepted and do not block 8-4 — 8-4 does not touch haptics or punch paths beyond co-existing on the same board; shake+bullet co-fire is at most `200ms` concurrent.
7. `Animated.View` bullet overlay (`position:absolute` + `pointerEvents:none` + `#fff7e0`) does not compete with shake `Animated.View` or tile `x/y` shared values; `bulletFlash` is orthogonal to `shakeX/Y` and tile `x/y`.

### Dependencies

1. `triade/src/engine/core/*` — unchanged; `line.ts` contract for `TraceEntry` + `move()` deterministic `mulberry32` seeded runs required for P1 fixtures (available).
2. `src/services/storage/settingsStore.ts` + `schema.ts` — `Settings.reducedMotion` and `DEFAULT_SETTINGS` required for App wiring (available).
3. `triade/src/ui/Hud.tsx` / `PreviewCard.tsx` + `src/game/preview.ts` — chrome rule dependency: preview card must stay outside bullet wrapper (available; structure verified).
4. `triade/src/game/matchOrchestrator.ts` — `Snapshot` with optional `sessionBestMerge` required for undo/continue wiring (available; orchestrator itself not mutated beyond type).
5. Real iPhone dev build (Expo dev client) with Skia available — required for P1-07 device smoke (requires device access, ~15 min).
6. CI runner with `node --test` and `npx tsc` — host gates (available).

### Risks to Plan

- **Risk**: Host seam for `GameBoard` `bulletFlash` + `Animated.View` overlay not inspectable without a seam → P1-03..P1-05 remain manual-only / code-review-gated.
  - **Impact**: Reduced host automation coverage for flash wiring; relies on device smoke for overlay + timing confidence.
  - **Contingency**: Add a thin seam (`export function shouldTriggerBulletTime` already host-testable + `BULLET_TIME_MS` export + `__TEST__` accessor for `bulletFlashStyle`) or replicate overlay deduction in a host-only helper; document waiver in PR if seam not added this story.
- **Risk**: Rapid new-bests within `200ms` overwrite `bulletFlash withSequence` without `cancelAnimation` → truncated flash.
  - **Impact**: Mild visual truncation on heavy combo (the most playful path — two new session-bests in one burst).
  - **Contingency**: `cancelAnimation(bulletFlash)` before new `withSequence` (one-line, keeps `200ms` budget); `maxMergeValue` max-wins already handles multi-merge within one move.
- **Risk**: `doMove` deps include `sessionBestMerge` invalidating closure identity every new best — gesture stability claim weakened (deferred).
  - **Impact**: `doMove` recreates every best, but `panGesture` reads `doMoveRef.current` so gesture remains stable; lint churn only.
  - **Contingency**: Ref audit as with shake deferred entry — wrap `sessionBestMerge` in `ref` or keep functional update and remove from deps if `doMove` reads via ref; track in deferred-work.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **Engine (`src/engine`)** | No direct impact (unchanged); `maxMergeValue` mirrors `shake.ts` merge predicate via `from.length===2 && !spawned`. | Existing 695+ engine tests must remain green; `git diff --stat -- triade/src/engine` empty gate. |
| **Haptics (`src/feel/haptics.ts`, `bulletTime.ts` independence)** | Indirect: shares trace but `triggerHapticsForTrace` fire-and-forget path not gated by bullet's `reducedMotion`; `bulletTime.ts` never imports `expo-haptics`. | `feel.test.ts` 12 + `bulletTime.test.ts` 9 + `shake.test.ts` 12 must remain green; assert `haptics.ts` never imports `reducedMotion` or `BULLET_TIME_MS`. |
| **Punch (`src/feel/punch.ts`, `GameBoard` `AnimatedTile`)** | Indirect: bullet flash overlay `z` is board-level (`position:absolute` over `Canvas`), tile flash `flashOpacity` is per-tile; they co-exist but independent shared values. | `punch.test.ts` 8 + `punch.atdd.test.ts` must remain green; device smoke that `heavy 12` still shows tile flash+bullets burst alongside board flash (no mutual suppression). |
| **Shake (`src/feel/shake.ts`, `GameBoard` `shakeX/Y`)** | Indirect sibling: bullet flash `200ms` vs shake `130ms` can co-fire on heavy new-best; shake axis logic unchanged but shares `GameBoard` effect deps `sessionBestMerge` newly. | `shake.test.ts` 12 + `shake.atdd.test.ts` must remain green; device smoke that heavy `12` shakes and flashes together and that Reduced Motion snaps both; `grep -R "SHAKE_CAP"` still single source. |
| **Board rendering (`src/render/GameBoard.tsx`, `transitionPlan.ts`)** | Direct: new overlay + effect; `applyPlan` and tile transitions untouched. | `transitionPlan` tests + board render must remain green; overlay snapshot proves board-only and not `Hud`. |
| **App shell (`triade/App.tsx`, `matchOrchestrator.ts`)** | Direct Snapshot wiring: `sessionBestMerge` state + 7 restore sites + lane/restart resets. | `App` must still compile `npx tsc`; no regression on lane switch, tutorial, hint/undo/continue budgets (`orchestrator` Snapshot optional keeps old tests green). |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization
- `nfr-criteria.md` - NFR threshold planning

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prd.md` (if present; not required for this targeted story design)
- Epic: `_bmad-output/implementation-artifacts/epic-8-context.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (ADR-01 purity, ADR-06 Snapshot, UX-DR-16/27/28, FR-30)
- Tech Spec: `_bmad-output/implementation-artifacts/spec-8-4-bullet-time.md` (intent contract, I/O matrix 8 rows, 6 ACs, Code Map, Tasks & Acceptance)
- Prior test design: `_bmad-output/test-artifacts/test-design/test-design-epic-8-3-screen-shake.md` (sibling story pattern for shake)
- TEA config: `_bmad/tea/config.yaml` (test_artifacts, test_design_output, risk_threshold `p1`)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Delta**: `590e461` → `0e2717e` (spec `final_revision 12a3dcd` includes review patches)
