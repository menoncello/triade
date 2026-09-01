---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-09-01'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-5-reduced-motion.md'
  - '_bmad-output/test-artifacts/test-design-epic-8-5-reduced-motion.md'
  - '_bmad-output/test-artifacts/traceability/traceability-matrix-8-5-reduced-motion.md'
  - '_bmad-output/test-artifacts/traceability/coverage-matrix-8-5-reduced-motion.json'
  - '_bmad-output/test-artifacts/traceability/gate-decision-8-5-reduced-motion.json'
  - '_bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/punch.ts'
  - 'triade/src/feel/shake.ts'
  - 'triade/src/feel/bulletTime.ts'
  - 'triade/src/feel/haptics.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/App.tsx'
  - 'triade/src/services/storage/schema.ts'
  - 'triade/benchmarks/feel.bench.test.ts'
  - 'triade/__tests__/feel/feel.test.ts'
  - 'triade/__tests__/feel/punch.test.ts'
  - 'triade/__tests__/feel/shake.test.ts'
  - 'triade/__tests__/feel/bulletTime.test.ts'
  - 'triade/__tests__/feel/reducedMotion.atdd.test.ts'
  - '_bmad/tea/config.yaml'
---

# NFR Evidence Audit - 8-5 Reduced Motion (Preset-Gated Feel Umbrella, 60 FPS Fallback, Game-Over Fade)

**Date:** 2026-09-01
**Story:** 8-5-reduced-motion
**Overall Status:** CONCERNS ⚠️

---

Note: This audit summarizes existing implementation evidence; it does not run tests or CI workflows. NFR thresholds and planned evidence come from PRD, architecture, and `test-design` outputs where available. Working-tree delta is `0ec7482` (gate full feel layer via preset, fix game-over fade, sweep benchmarks) + `0531056` (spec done) — 2 commits ahead of `10a3449` baseline; `590e461` is prior 8-4 baseline. The current uncommitted diff is metadata-only (`_bmad-output/implementation-artifacts/sprint-status.yaml` `8-5-reduced-motion: backlog→done`, `automation-summary.md`, `e2e-trace-summary.json`, `gate-decision.json`, `test-design-progress.md`, `traceability/coverage-matrix.json`); assessed production delta is `triade/` + `triade/benchmarks/` files below.

## Executive Summary

**Assessment:** 0 PASS, 4 CONCERNS, 0 FAIL (at category roll-up); at ADR checklist 21 PASS / 8 CONCERNS / 0 FAIL (29 criteria) — 72% criteria met.

**Blockers:** 0 — no FAIL; 2 waived P2 expected-RED items for this story (same deferred-work cause pair: R-006 overlapping shake/bullet without `cancelAnimation` score 4 + R-010 burst `setTimeout 500` orphan without `clearTimeout` on unmount score 3) plus 7 carry-over waived RED from 8-1/8-2/8-3/8-4 (tutorial dedup, expo-haptics, punch burst leak/clipping, shake overlap/clipping, bullet overlap/width) require fix before `verified` but do not block `CONCERNS` gate. Waivers expire before `8-6` (full feel-stack compound).

**High Priority Issues:** 2 — R-006 `GameBoard` overlapping shake `130ms` + bullet `200ms` without `cancelAnimation(shakeX/Y/bulletFlash)` before new `withSequence` (P2 score 4, deferred, ATDD signal `reducedMotion.atdd.test.ts:336` P2-04) and R-010 burst `setTimeout(500)` bare without ref/clearTimeout on unmount (P2 score 3, `reducedMotion.atdd.test.ts:347` P2-05) — same `GameBoard.tsx` file, one PR. Plus pending 15-min device smoke P1-07 (umbrella gate) and R-007 device p99.

**Recommendation:** CONCERNS → add `cancelAnimation(bulletFlash/shakeX/shakeY)` before each new `withSequence` (one-line, keeps `60+140` 200ms + `130ms` budget) + track `burstTimerRef` / `Set<Timeout>` with `useEffect` cleanup `clearTimeout` on unmount mirroring `settleTimerRef` (fixes `punch.atdd.test.ts` P1-05/P2-01 + `reducedMotion.atdd P2-05` same cause), and run real-iPhone device smoke (6 subtle / 12 heavy + flash+16 / 1536 glow + bullet new-best 12 flash 200ms + game-over instant vs 280ms fade + Reduced Motion ON flat while haptics stay + mid-flight snap + chrome + airplane + NOOP) before promoting to `verified`; re-run `nfr-assess` and `trace` after. Host evidence is GREEN for P0 (9/9 100% + 42 feel unit 100% + bench 2/2 both profiles under budget, tsc clean, engine byte-identical empty).

**Working-tree evidence snapshot:**
- `triade/src/feel/feel.ts` 105 LOC (frozen `FEEL_PRESETS` + frozen `REDUCED_PRESET` `shakeMs 0/particleBurst 0/overshootMs 0/overshootScale 1/flash false` + `reducedPresetFor(value)` copies `haptic` from `presetFor(value)` zeroing visuals, `try/catch` never-throw, `// FR-30: Reduced Motion is a preset` + `// ADR-04 emergency fallback`) + `triade/src/feel/punch.ts` 49 LOC (6 pure wrappers `punchScaleFor/punchDurationFor/shouldFlash/particleCountFor/shouldGlow/punchProfileFor` each delegate to `reducedPresetFor` when `reducedMotion===true`, never throw, `shouldGlow false` when reduced) + `triade/src/feel/shake.ts` 27 LOC delta (`shakeMsFor` delegates to `reducedPresetFor(value).shakeMs` →0 when gated, `maxShakeForTrace` early-return 0, `SHAKE_CAP 8` single cap, `Number.isFinite` + `try/catch` never-throw, never gates haptics) + `triade/src/feel/bulletTime.ts` 14 LOC delta (`shouldTriggerBulletTime` early-return `false` when reduced, `nextSessionBest` still advances, `Number.isFinite` guards) + `triade/src/feel/haptics.ts:1` pinned `// FR-30: haptics stay — never gate on reducedMotion` and no import of `reducedMotion` (FR-30, UX-DR-16) + `triade/src/render/GameBoard.tsx:98-576` (`reducedMotion` prop disables shake `moveResult.moved && !reducedMotion && direction`, bullet `shouldTriggerBulletTime(...,!!reducedMotion)` + `BULLET_TIME_MS 200`, bursts `if(!reducedMotion)`, `AnimatedTile isPunch = isMerge && !reducedMotion` gating overshoot/flash/glow/particles, board `Animated.View shakeStyle` wraps `Canvas` only (never chrome), bullet overlay `position:absolute width×width #fff7e0 opacity:bulletFlash`, mid-flight snap `useEffect([reducedMotion])` `withTiming(0,20)` for `shakeX/Y`+`bulletFlash`) + `triade/src/ui/GameOverOverlay.tsx:24-55` (`reducedMotion` prop gates soft fade: true→instant `setValue(1)/setValue(0)` no `Animated.timing`, false→`280ms Animated.parallel` fade with cleanup `stopAnimation`, `useRef(new Animated.Value(reducedMotion?1:0))` prevents first-frame flash) + `triade/App.tsx:929` fix wiring `reducedMotion={settings.reducedMotion}` (was hardcoded `false`) so game-over respects setting; `GameBoard` already `reducedMotion={settings.reducedMotion}` + `sessionBestMerge`, `Settings.reducedMotion` in `storage/schema.ts` DEFAULT false persists via `AsyncStorage` + `triade/benchmarks/feel.bench.test.ts` ~140 LOC (sweeps both profiles: iterates `allPresetValues()` calling `presetFor/reducedPresetFor + punch*For + shake*For + shouldTriggerBulletTime/shouldShake/maxShakeForTrace` synthetic traces, budget `median <0.05ms / p99 <0.1ms` for both, reduced asserts zero visuals while haptic mapping unchanged)
- `npm test --prefix triade -- __tests__/feel/reducedMotion.atdd.test.ts` — 21 tests 19 pass / 2 fail (both EXPECTED RED with waiver: `reducedMotion.atdd.test.ts:336` P2-04 cancelAnimation + `347` P2-05 burst orphan) — duration ~136ms host — full suite `835 total, 824 pass / 11 fail` — 11 = 9 carry-over 8-1/8-2/8-3/8-4 + 2 new 8-5; P0 9/9 100% GREEN, P1 6/6 100% GREEN; `feel.test.ts` 12/12 + `punch.test.ts` 8/8 + `shake.test.ts` 12/12 + `bulletTime.test.ts` 9/9 = 41/41 GREEN
- `npm test --prefix triade -- benchmarks/feel.bench.test.ts` (via `npm test` bench suites) — 2/2 pass `benchmark: feel helpers median/p99 sweep full profile` 10.2ms total / `reduced profile` 7.29ms total for 10k turns (warmup 1k) well under `0.05/0.1` per-call budget; host smoke `transition-plan` p99 <0.1ms still GREEN
- `triade/src/engine` byte-identical (`git diff 10a3449..0531056 --stat -- triade/src/engine` empty + `git diff HEAD --stat -- triade/src/engine` empty — ADR-01)
- `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean (exit 0, no new `@ts-ignore`; `feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts` strictly typed) + `tsconfig.test.json` clean
- `triade/package.json` unchanged (expo ~57.0.11, Reanimated 4.5.1, Skia 2.6.2, `expo-haptics` best-effort `void import()` carry-over R-006 waived, no `expo-audio` yet — deferred per 8-6, umbrella adds 0 new deps)

---

## Performance Assessment

### Response Time (p95)

- **Status:** CONCERNS ⚠️
- **Threshold:** NFR-1 + NFR-11 + NFR-14: engine <2ms/turn, frame logic worst-case <8ms, device p99 <16.7ms (60 FPS) — NFR planning from test-design §NFR Planning (`useFrameRateBaseline` lane + bench both profiles). Umbrella budget: reduced preset must be ≤ full `shake 130ms` + `bullet 200ms (60+140)` + `punch 80-120ms overshoot` + `particles 16` + `1536 glow` + `280ms` game-over fade concurrent with Skia Canvas + Reanimated main-thread worklets. `BENCH median <0.05ms / p99 <0.1ms` for both full and reduced sweeps is the CI gate; `SHAKE_CAP 8` + `BULLET_TIME_MS 200` never exceeded without data change.
- **Actual:** Host bench `presetFor/reducedPresetFor + punch*For + shake*For + shouldTriggerBulletTime/shouldShake/maxShakeForTrace` sweep both profiles 10k×(13 tiers) well within budget: full `10.2ms` total / reduced `7.29ms` total for 10k turns → median ~0.0003ms per helper, p99 ~0.0006ms host (ATDD P2-01 GREEN: `1k sweeps <<500ms` + `median <0.05 / p99 <0.1`). Reduced pass asserts zero visuals while haptic mapping unchanged; `REDUCED_PRESET` does not add cost (copy + zero). Device p99 with full feel concurrent with Canvas NOT measured — P1-07 / R-007 device lane pending.
- **Evidence:** `triade/benchmarks/feel.bench.test.ts:10-70` both-profile sweeps (`TURNS 10000`, `WARMUP 1000`, `BUDGET_MEDIAN 0.05`, `BUDGET_TAIL 0.1`), `reducedMotion.atdd.test.ts:372` P2-01 bench + `triade/__tests__/feel/*` per-case timings 0.04–0.75ms, `test-design-epic-8-5-reduced-motion.md` NFR Planning R-007/R-002, `GameBoard.tsx:311-318` mid-flight snap `withTiming(0,20)` deterministic, `GameOverOverlay.tsx:44-55` `FADE_MS 280` single literal.
- **Findings:** Host side well within frame budget; no per-merge promise storm (single shake+bullet per `moveResult` via `maxShakeForTrace`/`maxMergeValue` max-wins, not stacked — P0-04/P0-05 GREEN). Optimised mitigations in place: `BULLET_TIME_MS 200` single-source via `bulletTime.ts` + `SHAKE_CAP 8` via `shake.ts`, reduced preset `0` early-return avoids worklet churn, `GameOverOverlay` instant path avoids `Animated.parallel` allocation, board-only `Animated.View` + `width×width` overlay `pointerEvents:none` no layout thrash. Full reduced+full concurrent load (reduced flat does not schedule worklets, but full 200ms bullet `opacity` + shake `130ms translateX/Y` + punch overshoot spring + up to 16 `ParticleDot` 300/340ms) may exceed p99 on mid-tier iPhones under early-input re-plan at 84ms — not FAIL because thresholds are deferred to Epic 8 device lane (ADR-04 two-level benchmark when 8-6 lands). Overlap artefact R-006 without `cancelAnimation(bulletFlash/shakeX/Y)` is mild jank (truncated first flash/shake, last wins), not functional failure; carry-over burst orphan does not affect p95 but risks orphan `setState on unmounted`.

### Throughput

- **Status:** CONCERNS ⚠️
- **Threshold:** N/A backend; client frame gate is rate limiting for feel coalescence (no req/sec SLO). Throughput is frame-bound (60 FPS p99) not request-bound; reduced preset is sanctioned fallback so throughput under reduced must be ≤ full.
- **Actual:** No k6/JMeter load run (no backend). Multi-merge policy fires single shake `max wins capped 8` + single bullet `max wins 200ms` + punch per `isMerge` tile (not per `plan` entry) — if device trace shows jank, coalescence fix is `cancelAnimation(bulletFlash/shakeX/Y)` before new `withSequence` (test-design R-006 mitigation, product decision pending). `reducedMotion true` fires 0 worklets (early-return), so reduced throughput is strictly less than full. `feel.bench.test.ts` REDUCED total `7.29ms < FULL 10.2ms` confirms.
- **Evidence:** `reducedMotion.atdd.test.ts:P0-04` + `bulletTime.test.ts:62` multi-merge max wins, `shake.test.ts:58` reduced flat, `spec-8-5-reduced-motion.md` I/O row "Reduced Motion ON — all visual flat" + "NOOP guard".
- **Findings:** Throughput not breached host-side; device coalescence/drop risk R-006 pending device verification (see P2-04 expected RED). Functional `App` wiring mitigates `EARLY_INPUT` race but `doMove` identity still churns on `settings` change (deferred R low, same as shake 8-3 R-006, not gated here).

### Resource Usage

- **CPU Usage**
  - **Status:** CONCERNS ⚠️
  - **Threshold:** Budget p99 16.7ms (frame)
  - **Actual:** No CPU profile collected; host heap trivial (105 LOC `feel.ts` + 49 LOC `punch.ts` + 27 LOC `shake.ts` delta + 66 LOC bullet, 3 frozen presets + `REDUCED_PRESET` frozen copy `haptic` preserved, 3 shared values `shakeX/Y`+`bulletFlash` + `bulletFlashStyle`/`shakeStyle` memos). `GameBoard` per-move allocates one `withSequence` chain per full feel (bullet 2 segments `60+140`, shake 4 segments `30+40+30+30`) + `safeBest` guard; reduced allocates 0. No leak observed in 21-test host run but unmeasured on device. Overlap without `cancelAnimation` risks truncated flash/shake (R-006) not CPU leak. Burst timer leak R-010 from 8-2 still present (unrelated to reduced but same `GameBoard` host) does not affect CPU but risks `setState on unmounted` + orphan accumulation on rapid re-renders.
  - **Evidence:** No APM; `npm test` for reduced ATDD 136ms stable; full suite 835 coverage `98.68%` non-waived 100% new surface.

- **Memory Usage**
  - **Status:** PASS ✅
  - **Threshold:** N/A (client RN, no server memory SLO)
  - **Actual:** Negligible — `REDUCED_PRESET` frozen const, `reducedPresetFor` returns fresh copy `{...REDUCED_PRESET, haptic}` per call but not retained (GC per turn), `GameBoard` stores only 3 shared values + `bursts` array cleared via `setTimeout 500ms` filter-by-id auto-clear (but without unmount guard — carry-over). `GameOverOverlay` stores 3 `Animated.Value` instances, no accumulation. Orthogonal to burst layer which auto-clears 500ms but lacks unmount `clearTimeout`.
  - **Evidence:** Source `feel.ts:82-105` stateless + `shake.ts:14-27` + `GameBoard.tsx:301-318` `useSharedValue(0)` trio.

### Scalability

- **Status:** CONCERNS ⚠️
- **Threshold:** Statelessness required (ADR 3.1); no horizontal scaling needed for client feature. Reduced preset is sanctioned 60 FPS fallback — scalability is vertical (frame budget) not horizontal.
- **Actual:** Stateless pure functions (`REDUCED_PRESET` frozen, `presetFor`/`reducedPresetFor` pure + `punch*For`/`shake*For`/`shouldTriggerBulletTime` pure, `settings.reducedMotion` in `App` is per-session ephemeral persisted via `AsyncStorage` but not scaled, `GameOverOverlay` fade is per-mount). Bottleneck is overlap R-006 (single device) not scaling but stability; no circuit breaker needed — fail-fast is non-throw fallback. Caps `SHAKE_CAP 8` + `BULLET_TIME_MS 200` + `FADE_MS 280` via single source, no layout thrash, reduced `0` early-return scales down.
- **Evidence:** `feel.ts:50-105` frozen + `shake.ts:14-27` early-return + `bulletTime.ts:28-42` early-return + `test-design` R-006 score 4 / R-007 score 3.
- **Findings:** Scalability N/A for this delta (no server). CONCERNS only due to pending device p99 and R-006 overlap + carry-over burst/bullet residuals on same `GameBoard` surface.

---

## Security Assessment

### Authentication Strength

- **Status:** PASS ✅
- **Threshold:** N/A (no auth in feel/reduced layer)
- **Actual:** N/A — reduced preset gateway does not handle credentials, tokens, or sessions.
- **Evidence:** No auth code in `triade/src/feel/` nor `triade/src/render/GameBoard.tsx` / `triade/src/ui/GameOverOverlay.tsx`; `spec-8-5-reduced-motion.md` Boundaries: "Engine remains pure TS with no RN/Reanimated/Skia imports (ADR-01)"; auth out of scope per test-design Not in Scope.
- **Findings:** No exposure.

### Authorization Controls

- **Status:** PASS ✅
- **Threshold:** N/A
- **Actual:** N/A — RBAC not applicable; reduced motion is local visual setting, no resource access control.
- **Evidence:** No authorization checks in `feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts`; `reducedMotion` deliberately not used as auth gate.
- **Recommendation:** N/A

### Data Protection

- **Status:** PASS ✅
- **Threshold:** No PII/secrets in trace; encryption N/A (client-side). `Settings.reducedMotion` is local `AsyncStorage` boolean.
- **Actual:** No sensitive data handled; `TraceEntry` contains board coordinates and values (3..12288), `Settings` contains `reducedMotion` boolean + lane, no PII.
- **Evidence:** `triade/src/engine/core/types.ts` TraceEntry shape; `feel.ts` never logs values; `storage/schema.ts` `Settings` shape `DEFAULT false`.
- **Findings:** No data protection risk.

### Vulnerability Management

- **Status:** PASS ✅
- **Threshold:** 0 critical/high (textbook; carry-over `npm audit` deferred to expo major bump per 8-1, 11 moderate transitive via `@expo/cli` chain)
- **Actual:** No `npm audit` run this lane (requires lockfile) but `triade/package.json` unchanged from 8-1 (expo 57.0.11, Reanimated 4.5.1, Skia 2.6.2, no new dep — reduced adds 0 new deps, uses pinned worklets). No SAST/DAST; no new dependency. No new supply-chain risk beyond carry-over.
- **Evidence:** `triade/package.json` deps list (no new dep), `feel.ts` imports none, `punch.ts`/`shake.ts` import only `feel.ts`, `GameBoard.tsx` imports only `react-native-reanimated`/`@shopify/react-native-skia` already pinned, `GameOverOverlay.tsx` imports only `react-native` `Animated`/`Easing`.
- **Findings:** No new supply-chain risk. Carry-over 11 moderate remains waived pending expo major bump (not blocking 8-5).

### Compliance (if applicable)

- **Status:** CONCERNS ⚠️
- **Standards:** FR-30 / UX-DR-16 (Reduced Motion gates all visuals but keeps haptics+sound), UX-DR-27 chrome rule (board only, never preview/score), UX-DR-28 bullet datum cap, ADR-04 reduced preset fallback, datum caps `SHAKE_CAP 8` / `BULLET_TIME_MS 200` / `FADE_MS 280` never exceed without data change
- **Actual:** COMPLIANT host-side — `reducedPresetFor(v).haptic === presetFor(v).haptic` for all tiers while `shakeMs 0 && particleBurst 0 && flash false && overshootScale 1 && overshootMs 0`, `punchProfileFor(v,true) flat`, `shakeMsFor(v,true)===0 && shouldShake false && maxShakeForTrace(...,true)===0`, `shouldTriggerBulletTime(trace,best,true)===false` for all tiers while `nextSessionBest` still advances (`bulletTime.test.ts:53`, `reducedMotion.atdd.test.ts:95` P0-05 sweep), `shouldGlow(1536,true)===false`, `haptics.ts` never touches `reducedMotion` (`rg haptics.ts` hits only `// FR-30` comment, FR-30: reduced gated — haptics stay), `GameBoard` bullet/shake/bursts gated `if(!reducedMotion)` / `moveResult.moved && !reducedMotion && …` + `isPunch = isMerge && !reducedMotion`, `GameOverOverlay` gated `if(reducedMotion) setValue(1/0) else Animated.parallel 280ms` + `useRef` seeded `reducedMotion?1:0` prevents first-frame flash, `App.tsx:929` wiring `reducedMotion={settings.reducedMotion}` for `GameOverOverlay` (was hardcoded `false` bug, fixed) + `GameBoard` already `reducedMotion={settings.reducedMotion}`, board-only `Animated.View shakeStyle` wraps `Canvas` only (never chrome), reduce presets via `REDUCED_PRESET` single source. Device confirmation pending.
- **Evidence:** `feel.ts:82-105` REDUCED_PRESET + `reducedPresetFor`, `punch.ts:5-35` reduced delegation, `shake.ts:14-27` reduced early-return, `bulletTime.ts:28-42` reduced gate, `haptics.ts:1` comment, `GameBoard.tsx:98-123/311-358/379/430-459` gates, `GameOverOverlay.tsx:24-55` fade branches, `App.tsx:876/929` wiring, `reducedMotion.atdd.test.ts:P0-01..P0-09` + `P1-02/P1-03/P1-04/P2-03` scans, `test-design-epic-8-5-reduced-motion.md` R-001/FR-30.
- **Findings:** Host contract PASS for all 6 visuals (shake, bullet 200ms, punch flash/particles/overshoot, 1536 glow, game-over fade) + haptics stay + chrome guard; overall CONCERNS until P1-07 device smoke (Reduced Motion ON flat while haptics still felt + sound plays, preview chrome never shakes/flashes, mid-flight snap within one frame) is signed off. Same pattern as 8-2/8-3/8-4 waivers.

---

## Reliability Assessment

### Availability (Uptime)

- **Status:** PASS ✅ (with note)
- **Threshold:** N/A — offline-first RN app (NFR-2/NFR-6 installable + offline), no server SLA
- **Actual:** App boots offline; reduced visuals are bundled worklets (Reanimated/Skia `Animated`), no network fetch. `Settings.reducedMotion` persists via `AsyncStorage` offline.
- **Evidence:** `GameBoard.tsx`/`GameOverOverlay.tsx` imports are bundled modules, not CDN; test-design NFR table: offline/airplane mode check as device lane (P1-07).
- **Findings:** No availability risk; pending airplane-mode device confirmation (P1-07).

### Error Rate

- **Status:** PASS ✅
- **Threshold:** <0.1% (textbook; not formally declared) — scoped 8-5 ATDD: 19/21 = 90.5% but 2 fails are expected RED with waiver same cause pair, effective pass excluding waived RED is 100% for automatable surface; P0 9/9 =100%, P1 6/6=100%; full suite 824/835 = 98.68% (11 waived 1.32%) excluding waived is 100% new surface; feel unit 42/42 =100%. P0/P1 umbrella 15/15 =100%.
- **Actual:** 0 unhandled throws on reduced path; `presetFor(NaN/Infinity/-1/undefined)` + `reducedPresetFor(NaN)` + `punch*For(NaN,true)` + `shakeMsFor(NaN,true)` + `shouldTriggerBulletTime(...NaN,true)` + `shouldGlow(NaN,true)` + `GameBoard` reduced effect silent no-op on empty plan / NOOP / `reducedMotion true` / `direction===undefined` / `sessionBestMerge NaN/Infinity` via `safeBest` + `try/catch` + `Number.isFinite` guards, `GameOverOverlay` effect silent instant no-op when `reducedMotion true` (no `Animated.parallel` allocation). No throw.
- **Evidence:** `feel.ts:82-105` + `punch.ts` + `shake.ts:14-27` + `bulletTime.ts:28-42` clamp + try/catch never-throw wrappers, `haptics.ts` never reads `reducedMotion`, `GameOverOverlay.tsx:45-55` cleanup, `npm test` 19/21 with 2 waived, `feel.test.ts`/`punch.test.ts`/`shake.test.ts`/`bulletTime.test.ts` non-finite sweeps.

### MTTR (Mean Time To Recovery)

- **Status:** CONCERNS ⚠️
- **Threshold:** UNKNOWN (no incident SLI)
- **Actual:** No incident data; recovery from reduced-path failure is instant (silent no-op, gameplay continues, move not blocked, reduced flat never throws). Detection MTTR is gap: overlap R-006 and burst orphan R-010 have no telemetry beyond ATDD pins; game-over fade branch has no Crashlytics signal if `Animated.parallel` throws (but try/catch prevents).
- **Evidence:** No incident reports; `traceability/gate-decision-8-5-reduced-motion.json` notes overlap/burst residuals without Crashlytics signal.
- **Findings:** MTTR 0 for user (no crash), but detection MTTR UNKNOWN pending `cancelAnimation` fix + burst `clearTimeout` + import-failure telemetry (if ever needed). Reduced path itself reduces MTTR (sanctioned fallback).

### Fault Tolerance

- **Status:** PASS ✅
- **Threshold:** Never-throw guarantee (engine-never-throws extended to feel umbrella + GameOver fade)
- **Actual:** PASS — `presetFor(NaN/Infinity/-5) → light fallback`, `reducedPresetFor(NaN) → {haptic light, visuals 0}`, `punch*For(NaN,true) → flat`, `shakeMsFor(NaN,true)→0`, `maxShakeForTrace(null/undefined/[]/NaN)→0`, `shouldTriggerBulletTime(...NaN,true)→false` early-return, `shouldGlow(NaN,true)→false` never throws, `directionVector` zero-vector safety, `GameBoard` feel effect silent no-op on empty plan + NOOP + `reducedMotion true` + `direction undefined` + unmount mid `withSequence`/`bulletFlash` + `useEffect([reducedMotion])` snap `withTiming(0,20)`; `GameOverOverlay` silent no-op when `reducedMotion true` (no `Animated.timing` allocation) + `stopAnimation` cleanup on unmount/mid-fade. Strongest NFR for this story (pure helpers + frozen datum + single source).
- **Evidence:** `reducedMotion.atdd.test.ts:P0-01..P0-08` sweeps + `feel/punch/shake/bulletTime.test.ts` non-finite sweeps + `feel.bench.test.ts` never-throw, `GameOverOverlay.tsx:45` cleanup.
- **Findings:** Fault tolerance is strongest NFR for this story (same as 8-4 bullet, extended to game-over fade).

### CI Burn-In (Stability)

- **Status:** CONCERNS ⚠️
- **Threshold:** Informational (no formal burn-in gate; textbook suggests 100 consecutive green as strong signal)
- **Actual:** Single `npm test` run for reduced ATDD 19/21 (90.5%) with 2 waived RED (R-006 overlap + R-010 burst orphan); 0 flaky detected beyond waived. Full suite single run `824/835` (98.68%) with 11 waived RED (2 new 8-5 + 9 carry-over 8-1..8-4). `feel.bench.test.ts` 2/2 both profiles deterministic (`REDUCED_PRESET` frozen, `allPresetValues()` deterministic). No nightly soak; no 100-run burn. Bench `1k warmup + 10k sweeps` per profile deterministic, not flaky. No Playwright harness (correctly scoped to Unit per test-levels framework).
- **Evidence:** `gate-decision-8-5-reduced-motion.json` waived, `npm test` duration 136ms reduced ATDD / 5250ms full suite / bench 10ms+7ms, `reducedMotion.atdd P2-01` perf bench deterministic.
- **Findings:** Stable single run; CONCERNS only because formal burn-in not executed — not a blocker for small delta (9 files ~263 insertions, pure helpers + wiring fix).

### Disaster Recovery (if applicable)

- **RTO (Recovery Time Objective)**
  - **Status:** PASS ✅ (N/A)
  - **Threshold:** N/A — client stateless, no data loss
  - **Actual:** N/A — `sessionBestMerge` is per-session ephemeral in `Snapshot` + `App` state, `settings.reducedMotion` is `AsyncStorage` persisted but not critical (defaults to `false` on reinstall). No persistence to recover for feel; `GameOverOverlay` fade is ephemeral per mount.
  - **Evidence:** No persistence in reduced layer beyond `storage/schema.ts` `Settings.reducedMotion` (DEFAULT false, ADR-06 Snapshot rewind not affected).

- **RPO (Recovery Point Objective)**
  - **Status:** PASS ✅ (N/A)
  - **Threshold:** N/A
  - **Actual:** N/A
  - **Evidence:** No backup/restore needed; old `Snapshot` without `sessionBestMerge` migrates via `Number.isFinite` guard to `0` (accepted, 8-4); `Settings` migration via `schema.ts` DEFAULT false.

---

## Maintainability Assessment

### Test Coverage

- **Status:** CONCERNS ⚠️
- **Threshold:** AC coverage gate 100% per test-design; line-coverage 80% not formally declared
- **Actual:** AC coverage 100% (5/5 FULL per `traceability-matrix-8-5-reduced-motion.md` + `coverage-matrix-8-5-reduced-motion.json` top-level `overall_coverage FULL`; `requirements` 8.5-AC1..AC5 all FULL, critical umbrella paths `preset-not-flag + all tiers punch flat + shake flat + bullet gated while nextSessionBest advances + haptics stay + glow gated + game-over fade branches + App wiring + board-only + mid-flight snap + bench both profiles` all covered host-side (9 `reducedMotion.atdd` P0 + 6 P1 + 4 P2 GREEN). No `lcov`/`c8` line % collected — `coverage/` report not generated in this run (node:test, no c8 gate, consistent with 7.x/8-1..8-4 precedent). Scoped pass 90.5% (19/21) with 2 waived RED accounted as coverage FULL but execution RED; feel unit 42/42 GREEN; bench 2/2 GREEN. E2E-equivalent P1-07 device smoke documented as 5 journeys in `tests/e2e/reducedMotion.umbrella.spec.ts` source but not scaffolded as Playwright by design (RN worklet, host-only until device lane, same as 8-2/8-3/8-4).
- **Evidence:** `traceability-matrix-8-5-reduced-motion.md` coverage table + `coverage-matrix-8-5-reduced-motion.json` `phase PHASE_1_COMPLETE` + `requirements` AC1-5 FULL, `npm test` 21 mapped 19 pass / 2 waived RED, `atdd-checklist-8-5-reduced-motion.md` 21 tests (19 GREEN /2 RED, implementation checklist).
- **Findings:** AC coverage excellent; line-coverage metric is the gap. Recommend adding `c8` lane if CI wants line % for maintainability gate (backlog). Device smoke P1-07 remains manual lane (~15 min, real iPhone).

### Code Quality

- **Status:** PASS ✅
- **Threshold:** `./triade/node_modules/.bin/tsc --noEmit` clean (both configs) + no scattered literals outside single access point, frozen presets, caps single-source, `REDUCED_PRESET` single datum
- **Actual:** `tsc` clean for `triade/tsconfig.json` + `triade/tsconfig.test.json` (exit 0, no new `@ts-ignore`; `feel.ts`/`punch.ts`/`shake.ts`/`bulletTime.ts` strictly typed `FeelPreset`/`TraceEntry`/`Direction`/`HapticStyle`, no RN import in pure helpers). `REDUCED_PRESET` exported frozen from `feel.ts:82` and consumed via `reducedPresetFor` single source in `punch.ts`/`shake.ts`/`bulletTime.ts` (P2-02 GREEN: literal `shakeMs:0`/`particleBurst:0`/`overshootScale:1`/`flash:false` only in `feel.ts` except datum comments, no scattered `if(reducedMotion) return 0` outside `feel/*` helpers; `SHAKE_CAP 8` only in `shake.ts:7`, `BULLET_TIME_MS 200` only in `bulletTime.ts:7`, `FADE_MS 280` only in `GameOverOverlay.tsx:44`, each single-source). `feel.ts` thin wrappers `presetFor` → `reducedPresetFor` preserving `haptic` (no duplicate tier branching). No SonarQube but code is small (105 LOC feel + 49 punch + 27 shake delta + 66 bullet + 55 haptics comment + ~43 GameBoard delta + 31 GameOverOverlay delta + 48 App wiring + 140 bench), frozen presets, 0 duplication beyond carry-over burst/shake. `App` functional update pattern for `sessionBestMerge` mitigates race but `doMove` identity churn deferred (R low, same as 8-3/8-4).
- **Evidence:** `feel.ts:82` REDUCED_PRESET, `punch.ts:1` import `reducedPresetFor` + delegation, `shake.ts:14` delegation, `bulletTime.ts:28` gate, `haptics.ts:1` comment, `GameOverOverlay.tsx:44` FADE_MS, `GameBoard.tsx:11` imports, `reducedMotion.atdd.test.ts:393` P2-02 datum scan + `P2-03` allowlist, `tsc` clean both configs.
- **Findings:** Code quality strong; single-datum invariant pinned host-side (preset-not-flag contract).

### Technical Debt

- **Status:** PASS ✅
- **Threshold:** <5% debt ratio (textbook)
- **Actual:** Low — 1 new bench module (`feel.bench.test.ts` 140 LOC), 0 new deps, no engine duplication, no copy-paste, `REDUCED_PRESET` single source for 8-6 SFX reuse, `GameOverOverlay` wiring fix is one prop (debt was hardcoded `false`). Debt items are 2 new deferred RESIDUALS for this story (R-006 overlap without `cancelAnimation(bulletFlash/shakeX/Y)` score 4 + R-010 burst `setTimeout 500` without `clearTimeout` on unmount score 3) plus 7 carry-over `deferred-work.md` entries for 8-1..8-4 on same `GameBoard` file (spawned undefined gap + value<3 not filtered + width NaN + doMove identity churn + shake overlap + shake clipping + bullet overlap/width). Working-tree delta is tiny (105 + 49 + 27 + 14 + 31 + 48 + 140 LOC new, plus spec/test-design/traceability metadata).
- **Evidence:** `spec-8-5-reduced-motion.md` Residual risks + Review Triage (8-5 has 0 patches pending, 2 deferred lows via ATDD), `test-design` R-001..R-010 list (3 high score 6, 3 medium score 4), `gate-decision-8-5-reduced-motion.json` rationale waived, `deferred-work.md` 2 entries for 8-5 + 7 carry-over.
- **Findings:** No structural debt; carry-over `deferred-work.md` grows but remains tracked with expiry before 8-6 (reduced preset is fallback, but full feel-stack cost — shake 130ms + bullet 200ms + punch 80-120ms + 280ms fade — compounds; R-006/R-010 overlap/burst must be fixed before 8-6 SFX layer).

### Documentation Completeness

- **Status:** PASS ✅
- **Threshold:** Spec + test-design + traceability + ATDD checklist present, all linked in gate decision `links` block, plus bench
- **Actual:** Spec `spec-8-5-reduced-motion.md` (intent/boundaries/I-O matrix 7 rows/Code Map/Tasks/Verification/Auto Run Result `805 pass / 9 fail carry-over` + `824/835` with ATDD; 2 deferred lows, 0 patches pending), epic context `epic-8-context.md`, test-design `test-design-epic-8-5-reduced-motion.md` + `test-design/test-design-epic-8-5-reduced-motion.md` (10 risks R-001..R-010 with R-001/R-002/R-003 score 6, NFR planning 5 rows, coverage plan P0×9 P1×7 P2×6 P3×4, quality gate, Entry/Exit Criteria), traceability matrix `traceability-matrix-8-5-reduced-motion.md` + coverage matrix `coverage-matrix-8-5-reduced-motion.json` (100% AC, 5 ACs) + gate decision `gate-decision-8-5-reduced-motion.json` (CONCERNS waived, trace_report_path linked) + `gate-decision.json` top-level duplicate, ATDD checklist `atdd-checklist-8-5-reduced-motion.md` (21 tests 19 GREEN /2 RED, implementation checklist per P0/P1/P2, Stack Detection, Prerequisites, Red-Phase scaffolds), automation summary, deferred-work, bench. All linked.
- **Evidence:** `_bmad-output/implementation-artifacts/` and `_bmad-output/test-artifacts/` file list + `test-design-progress.md`.

### Test Quality (from test-review, if available)

- **Status:** PASS ✅
- **Threshold:** Host fixtures over real engine traces (not stubs), pure helpers + preset-not-flag contract + board-only + game-over wiring pins
- **Actual:** Host fixtures use real `presetFor`/`reducedPresetFor` data-driven mapping (not stubbed engine trace but same tier contract), `GameBoard` source-structure gates for `REDUCED_PRESET`/`reducedPresetFor` delegation + board-only overlay + Reduced Motion mid-flight snap `withTiming(0,20)` + chrome guard + `App.tsx` `settings.reducedMotion` wiring (`>=2` sites) + `GameOverOverlay` instant vs `280ms` branches + `haptics.ts` `reducedMotion` empty via grep gate, edge sweeps for non-finite/NOOP/multi-merge/invalid trace/`sessionBestMerge NaN`, bench both profiles deterministic (`performance.now` 10k sweeps per profile). No Playwright needed (correctly scoped to Unit per test-levels framework; `tea_browser_automation` auto but story is pure RN worklet + `Animated` timing, not a web Playwright flow). ATDD 19/21 GREEN with 2 waived RED are the explicit quality gate.
- **Evidence:** `reducedMotion.atdd.test.ts` P0-01..P0-09 + P1-01..P1-06 + P2-01..P2-03 GREEN, `feel.test.ts`/`punch.test.ts`/`shake.test.ts`/`bulletTime.test.ts` 41/41 GREEN, `feel.bench.test.ts:10-70` bench sweeps, `atdd-checklist-8-5-reduced-motion.md` Implementation Checklist.
- **Findings:** Test quality strong; P1-07 device smoke is the remaining gap (host-only until device lane, same as 8-2/8-3/8-4).

---

## Custom NFR Evidence Audits (if applicable)

No custom categories beyond the 8 ADR checklist categories; client Offline/Installability (NFR-2/NFR-6) covered under Availability (PASS with pending airplane device check). `REDUCED_PRESET` flat + `SHAKE_CAP 8` cap + `BULLET_TIME_MS 200` datum + `FADE_MS 280` are pinned as custom feel thresholds (Performance + Maintainability) and directional axis + chrome guard (QoS) — covered above. Bench both profiles (`median <0.05ms / p99 <0.1ms`) is the custom NFR gate for this umbrella story.

---

## Quick Wins

2 quick wins identified for immediate implementation:

1. **Add cancelAnimation before new shake/bullet withSequence to fix R-006 overlap** (Performance/Reliability) - HIGH - 0.25h - FE
   - In `GameBoard.tsx:430-478` before `shakeX.value = withSequence(...)` / `shakeY.value = withSequence(...)` and `bulletFlash.value = withSequence(withTiming(0.45,60), withTiming(0,BULLET_TIME_MS-60))` add `cancelAnimation(shakeX)` / `cancelAnimation(shakeY)` / `cancelAnimation(bulletFlash)` (import `cancelAnimation` from `react-native-reanimated` alongside `withSequence`/`withTiming` at line 5). One fix clears `reducedMotion.atdd.test.ts:336` P2-04 and `shake.atdd P2-01` + `bulletTime.atdd P2-01` same class as 8-3 R-001 + 8-4 R-007. Keeps `200ms` + `130ms` budgets intact; verify rapid merges within 84ms EARLY_INPUT window no longer truncate overlap (`shakeX` vs `bulletFlash` same class).
   - No code changes needed beyond import + 3 lines / Minimal code changes

2. **Fix burst setTimeout orphan with burstTimerRef + clearTimeout on unmount to fix R-010** (Reliability/Maintainability) - LOW - 0.25h - FE
   - In `GameBoard.tsx:378-417` replace bare `setTimeout(()=>setBursts(...filter id),500)` with tracked handle: `const burstTimerRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())` + push id on create + `setTimeout` callback also `burstTimerRef.current.delete(id)` + `useEffect return => burstTimerRef.current.forEach(clearTimeout)` on unmount mirroring `settleTimerRef` pattern already in `GameBoard`. Clears `reducedMotion.atdd.test.ts:347` P2-05 and `punch.atdd.test.ts:323` P2-01 (same cause) + `punch.atdd P1-05` burst leak. Keep `particleBurst ∈{0,4,8,16}` capped via preset; reduced path already `if(!reducedMotion)` avoids allocation.
   - No code changes needed / Minimal code changes (deferred low, same GameBoard file as Quick Win 1)

---

## Recommended Actions

### Immediate (Before Release) - CRITICAL/HIGH Priority

1. **Fix R-006 overlap + R-010 burst orphan (same GameBoard file)** - HIGH - 0.5h - FE
   - Add `cancelAnimation(bulletFlash)` before new `withSequence(withTiming(0.45,60), withTiming(0,BULLET_TIME_MS-60))` and `cancelAnimation(shakeX)`/`cancelAnimation(shakeY)` before new shake `withSequence` in `GameBoard.tsx:430-478` (import `cancelAnimation` at line 5); track burst timeouts in `burstTimerRef: Set<Timeout>` and `clearTimeout` in unmount `useEffect` mirroring `settleTimerRef`. Re-run `npm test --prefix triade -- __tests__/feel/reducedMotion.atdd.test.ts` until P2-04/P2-05 GREEN and rapid heavy merges within ~90ms EARLY_INPUT window show clean second flash/shake without truncated overlap and no `setState on unmounted` warning on unmount. One PR fixes both `reducedMotion.atdd` P2-04/P2-05 and carry-over `punch.atdd P1-05/P2-01` + `shake.atdd P2-01`.
   - Specific steps: edit `GameBoard.tsx:5` imports, `GameBoard.tsx:378` burst block, `GameBoard.tsx:430` shake block, `GameBoard.tsx:472` bullet block; add `useEffect` cleanup for `burstTimerRef`.
   - Validation: `npm test --prefix triade -- __tests__/feel/reducedMotion.atdd.test.ts` 21/21 GREEN, `npm test --prefix triade` `835→ 835 pass / 0 new RED` (remaining RED only 7 carry-over from 8-1/8-3/8-4 after 8-2 punch fixes land), `tsc` clean.

2. **Run 15-min real-iPhone device smoke P1-07 (umbrella gate)** - HIGH - 0.25h - PR author / QA
   - In Expo dev build on real iPhone (SDK 57, Skia+Reanimated 4, no Simulator): merge `6` subtle shake + punch `8 particles` + `12` heavy shake `5` + punch `16 particles` + flash+overshoot + `1536` glow + new-best `12` bullet `~200ms` board-only `#fff7e0` + game over soft fade `280ms` while `Reduce Motion OFF` → full feel; toggle Settings → Reduce Motion ON (in-app `Settings` toggle) → repeat each merge + new-best + `1536` + game over → board flat, no flash/particles/overshoot/glow/bullet/shake, game-over appears instantly (`setValue 1/0`), while **haptics still felt + sound plays** (FR-30); NOOP swipe (edges/no merge) → flat regardless; preview card & score never shake/flash even when board does; `AIRPLANE` mode → same; `mid-shake false→true` during `130ms` shake + `200ms` bullet → board snaps flat within one frame (`withTiming 0,20`); portrait+landscape. Record sign-off checkbox in PR description ("device reduced-motion smoke: 6/12/1536 + bullet 200ms + game-over 280→instant + chrome + mid-flight snap + haptics stay + NOOP + portrait/landscape + airplane").
   - Validation: checkbox ticked + 30s video (board vs Hud side-by-side).

3. **Verify GameOverOverlay wiring regression stays fixed (same PR)** - HIGH - 0h (verification) - FE
   - Confirm `App.tsx:929` still `reducedMotion={settings.reducedMotion}` and `grep -n "reducedMotion={false}" triade/App.tsx` empty (no hardcoded literal reintroduced), and `GameOverOverlay.tsx:42-55` `useRef` seeded `reducedMotion?1:0` prevents first-frame flash + `stopAnimation` cleanup intact. Host already P1-02/P1-04 GREEN (`reducedMotion.atdd P1-02/P1-04`).
   - Validation: `rg -n "GameOverOverlay" triade/App.tsx` shows `reducedMotion={settings.reducedMotion}`; `app.gameOverWiring.test.ts` / `app.restart.test.ts` pins still GREEN (already updated this story).

### Short-term (Next Milestone) - MEDIUM Priority

1. **Add device p99 benchmark lane for R-007/R-006 + reduced fallback** - MEDIUM - 1h - QA / FE
   - Run `useFrameRateBaseline` stats after 2-min play with 5+ merges including at least one `12` heavy (shake 5 + punch 16 + bullet 200ms co-fire) while `Reduce Motion OFF` (full) and one `Reduce Motion ON` flat pass plus a rapid-swipe pair within `200ms` window + `mid-flight snap`; capture `fps`/`p99Ms`/`frames` and fail if `p99Ms>16.7ms`. Keep `REDUCED flat` early-return asserted + `SHAKE_CAP 8` + `BULLET_TIME_MS 200` + `FADE_MS 280` pinned. Required before 8-6 (full feel-stack + SFX compound; reduced is sanctioned fallback so expect `p99 reduced <= p99 full`).
   - Validation: `useFrameRateBaseline` log `fps/p99Ms/frames`; reduced flat lane must be ≤ full lane.

2. **Keep CI guard rails + tighten trace contract** - MEDIUM - 0.5h - DEV/CI
   - Enforce `git diff --stat -- triade/src/engine` empty (ADR-01), `rg "REDUCED_PRESET" src/feel --glob '!feel.ts'` allowlist is consumers via `reducedPresetFor`, `rg "SHAKE_CAP" src/feel --glob '!shake.ts'` fails if scattered `8` literal, `rg "BULLET_TIME_MS" src/ --glob '!bulletTime.ts'` allowlist is `GameBoard.tsx` + `feel.ts` comment, `rg "280" src/ui/GameOverOverlay.tsx` single fade literal, `rg "from.length===2" src/` hits only sanctioned sites (`src/engine` + `src/feel/bulletTime.ts` + `src/feel/shake.ts` + `src/render/transitionPlan.ts` + `src/feel/haptics.ts` comments), `App` wiring gate for `settings.reducedMotion` 2 sites + `storage/schema.ts DEFAULT false`, `rg "reducedMotion" src/feel/haptics.ts` must be empty (only `// FR-30` comment), `reducedMotion` allowlist `feel.ts` + `punch.ts`/`shake.ts`/`bulletTime.ts` + `GameBoard.tsx`/`GameOverOverlay.tsx`/`App.tsx`. Consider `__DEV__` warning for `value<3` sentinel if product wants corruption surfacing (deferred R-010). All host gates, keep in PR checks for 8-6.
   - Validation: `npm run test` PR check includes grep gates; `feel.bench.test.ts` 2/2 GREEN.

### Long-term (Backlog) - LOW Priority

1. **Add c8/nyc coverage lane and jscpd duplication check** - LOW - 1-2h - DEV/CI
   - Generate `coverage/lcov-report` for maintainability gate (80% target) and jscpd for <5% duplication — not required for this small delta (pure preset helpers) but useful for Epic 8 full feel preset (8-1..8-6) SFX.
   - Validation: `c8 --reporter=lcov npm test --prefix triade` + jscpd gate.

2. **Ref-optimize App.doMove identity churn if needed** - LOW - 0.5h - FE
   - `doMove` deps include `settings` (functional update mitigates race but still invalidates closure identity when `reducedMotion` toggles — deferred `deferred-work.md` R carry-over). Consider stable-ref pattern (`settingsRef`) so `panGesture` via `doMoveRef` stays truly stable; audit alongside shake `lastDirectionRef` pattern. Not gating; track in `deferred-work.md`. Reduced toggle itself is infrequent (settings), so churn is low.
   - Validation: `grep -n "doMove" triade/App.tsx` deps audit.

---

## Monitoring Hooks

4 monitoring hooks recommended to detect issues before failures:

### Performance Monitoring

- [ ] Host micro-bench lane (CI) - Fail CI if `presetFor/reducedPresetFor + punch*For + shake*For + shouldTriggerBulletTime/shouldShake` sweep >0.05ms median / >0.1ms p99 for either profile (full or reduced) or `REDUCED total > FULL total` (should be less)
  - **Owner:** DEV / CI
  - **Deadline:** 8-6 review (keep as PR gate)

- [ ] Device frame stats lane (`useFrameRateBaseline`) - Track `fps`/`p99Ms`/`frames` after 2-min play with 5+ merges including one `12` heavy bullet 200ms + shake 5 co-fire + punch + `1536` glow (full) and one flat pass (reduced); alert if p99 >16.7ms or reduced p99 > full p99
  - **Owner:** QA / FE
  - **Deadline:** Epic 8 device benchmark (ADR-04 two-level benchmark when 8-6 SFX lands)

### Security Monitoring

- [ ] No security runtime monitoring needed this story (client-only visual) — keep `npm audit` + `expo-doctor` as periodic gate (carry-over 11 moderate transitive expo)
  - **Owner:** FE lead / CI
  - **Deadline:** 8-6 review

### Reliability Monitoring

- [ ] Reduced Motion unmount/mid-flight dev-build warnings (optional) - Log once when `GameBoard` unmounts during in-flight `200ms withSequence` (5×30 etc.) or `500ms burst setTimeout` or `280ms Animated.parallel` game-over fade, or when `reducedMotion false→true` mid-animation does not snap within 20ms + when `reducedPresetFor` receives non-canonical `NaN`/`Infinity` (never-throw fallback)
  - **Owner:** FE
  - **Deadline:** 8-5 follow-up / 8-6

### Alerting Thresholds

- [ ] Overlap truncation alert - Notify when device smoke video shows second rapid merge `6→12` within 90ms truncates first `200ms` bullet flash / `130ms` shake (last wins, not queued) — indicates missing `cancelAnimation(bulletFlash/shakeX/Y)`; also watch for `reducedMotion true` still showing particles/overshoot/glow indicating `isMerge && !reducedMotion` or `if(!reducedMotion)` gate regression, and for `GameOverOverlay` 280ms fade when reduced ON indicating `App.tsx:929` re-hardcoded `false`
  - **Owner:** QA
  - **Deadline:** after fix

---

## Fail-Fast Mechanisms

3 fail-fast mechanisms recommended to prevent failures:

### Circuit Breakers (Reliability)

- [ ] Not needed — `presetFor/reducedPresetFor/punch*For/shake*For/shouldTriggerBulletTime/shouldGlow` + `GameBoard` feel effects + `GameOverOverlay` fade already fail-fast via `Number.isFinite` guard + `try/catch` never-throw + `reducedMotion` early-return flat; `GameBoard` effect silent no-op on empty trace / NOOP / reducedMotion / invalid `sessionBestMerge` / unmount mid `withSequence`/`bulletFlash` (snap `withTiming 0,20`). Keep as-is; do not add retry loop (visual is best-effort, no fixed-step loop, reduced flat is fastest path).

### Rate Limiting (Performance)

- [ ] Optional feel coalescence debounce for overlap — If R-006 device trace shows jank with concurrent Skia Canvas + shake `130ms` + bullet `200ms` + punch spring + `280ms` fade at 84ms early-input re-plan, the `cancelAnimation(bulletFlash/shakeX/Y)` fix is the rate limiter (collapses N feels in 200ms window to the latest). Owner: FE, Effort: already in Quick Win 1, gated by device p99 feedback from `useFrameRateBaseline`. Reduced path needs no limiting (0 allocation).

### Validation Gates (Security)

- [ ] Input guard is already the validation gate — `reducedPresetFor` board-only via `presetFor` + `Number.isFinite` + `try/catch` early-return, `punch*For` + `shakeMsFor` via `reducedPresetFor` flat, `shouldTriggerBulletTime` reduced early-return + `Number.isFinite(sessionBest)` gate + `Number.isFinite` safeBest, `shouldGlow` `value>=1536 && !reducedMotion` gate, `GameBoard` `isPunch = isMerge && !reducedMotion` + `if(!reducedMotion)` burst guard + board `Animated.View` board-only + chrome guard (overlay `position:absolute` board-only, `pointerEvents:none`, never `Hud`). No additional gate needed; monitor `haptics.ts` never gate (FR-30).

### Smoke Tests (Maintainability)

- [ ] Device smoke checklist P1-07 as PR gate — must be ticked before merge to verified (15 min, real iPhone, reduced ON flat + game-over instant + haptics stay + chrome + mid-flight snap + airplane). Owner: PR author.

---

## Evidence Gaps

4 evidence gaps identified - action required:

- [ ] **Performance - device p99 <16.7ms with feel umbrella (full vs reduced fallback)** (Performance)
  - **Owner:** QA / FE
  - **Deadline:** Before 8-6 verified (15-min device lane + benchmark)
  - **Suggested Evidence:** `useFrameRateBaseline` log `fps`/`p99Ms`/`frames` after 2-min play with 5+ merges on real iPhone dev build SDK 57 including heavy `12` shake 5 + punch + bullet 200ms co-fire + `1536` glow (full) and one flat pass (reduced ON) — concurrent Skia Canvas + Reanimated worklets + `280ms` game-over fade; reduced lane must be ≤ full lane `p99Ms <16.7` and bench both profiles `median <0.05 / p99 <0.1` already host GREEN (10.2/7.29ms total) but not sufficient for device frame guarantee
  - **Impact:** Cannot claim 60 FPS budget met without device data; host bench <0.1ms is not sufficient for frame guarantee (R-007 score 3, plus carry-over shake R-006/R-007, R-010 burst). Reduced fallback claim (ADR-04) is host-only until device lane.

- [ ] **Reliability - Overlapping shake/bullet without cancelAnimation (R-006)** (Reliability)
  - **Owner:** FE
  - **Deadline:** Before 8-6 (immediate)
  - **Suggested Evidence:** `GameBoard.tsx` calls `cancelAnimation(bulletFlash)`/`cancelAnimation(shakeX)`/`cancelAnimation(shakeY)` before new `withSequence(...)`; `reducedMotion.atdd.test.ts:336` P2-04 turns GREEN; rapid heavy merges within 90ms EARLY_INPUT show clean second flash/shake, no truncated overlap; also fixes `shake.atdd P2-01` + `bulletTime.atdd P2-01` same class
  - **Impact:** Truncated first bullet flash `200ms` / shake `130ms` / mild jank on rapid heavy combos (most playful path) — waived low but blocks PASS; same class as shake 8-3 R-001 / bullet 8-4 R-007 must be fixed together on same file.

- [ ] **Compliance - Device Reduced Motion verification (FR-30) + chrome guard + game-over fade** (Compliance)
  - **Owner:** QA / PR author
  - **Deadline:** Before verified (device smoke P1-07)
  - **Suggested Evidence:** iOS Settings → Accessibility → Motion → Reduce Motion ON (or in-app Settings toggle reducedMotion ON) → repeat merges `6/12/1536/new-best 12` + game over `280ms`: confirm board flat (no shake/flash/particles/overshoot/glow/bullet) and game-over appears instantly (`setValue 1/0`, no 280ms fade) while **haptics still felt + sound plays**; preview card & score never shake/flash even when board does — host-only P0-01..P0-08/P1-02/P1-03/P1-04/P2-03 GREEN but not user-verified; `App.tsx:929` wiring `reducedMotion={settings.reducedMotion}` must stay not hardcoded
  - **Impact:** Without device pass, FR-30 a11y/App Store compliance is host-only but not user-verified (R-001/R-003 deferred, score 6 each). Game-over fade instant vs 280ms is the new visual for this story.

- [ ] **Reliability - Burst setTimeout orphan + carry-over shake/bullet residuals (R-010)** (Reliability)
  - **Owner:** FE / UX
  - **Deadline:** Before 8-6 (immediate for burst/shake overlap, product decision for others)
  - **Suggested Evidence:** `GameBoard.tsx` burst block uses `burstTimerRef:Set<Timeout>` + `clearTimeout` on unmount (not bare `setTimeout 500`); device screenshot that burst auto-clears 500ms without orphan warning on rapid unmount; `reducedMotion.atdd.test.ts:347` P2-05 GREEN. Plus carry-over `cancelAnimation(shakeX/Y)` + `cancelAnimation(bulletFlash)` fix so `shake.atdd 2` + `bulletTime.atdd 2` + `punch.atdd 2` RED turn GREEN. `haptics.ts` stays free of `reducedMotion` (FR-30) and `GameOverOverlay` cleanup `stopAnimation` intact.
  - **Impact:** Burst orphan `setState on unmounted` (R-010 carry-over) + shake/bullet overlap + trace `spawned undefined`/`value<3` pollution + width NaN guard — not crash but polish/stability + contract drift; all share same `GameBoard.tsx` hot file.

---

## Findings Summary

**Based on ADR Quality Readiness Checklist (8 categories, 29 criteria)**

| Category                                         | Criteria Met       | PASS             | CONCERNS             | FAIL             | Overall Status                      |
| ------------------------------------------------ | ------------------ | ---------------- | -------------------- | ---------------- | ----------------------------------- |
| 1. Testability & Automation                      | 4/4          | 4         | 0         | 0         | PASS ✅                 |
| 2. Test Data Strategy                            | 3/3         | 3         | 0         | 0         | PASS ✅               |
| 3. Scalability & Availability                    | 2/4         | 2         | 2         | 0         | CONCERNS ⚠️               |
| 4. Disaster Recovery                             | 3/3         | 3         | 0         | 0         | PASS ✅ (N/A)               |
| 5. Security                                      | 4/4        | 4         | 0         | 0         | PASS ✅             |
| 6. Monitorability, Debuggability & Manageability | 1/4        | 1         | 3         | 0         | CONCERNS ⚠️             |
| 7. QoS & QoE                                     | 2/4        | 2         | 2         | 0         | CONCERNS ⚠️             |
| 8. Deployability                                 | 2/3        | 2         | 1         | 0         | CONCERNS ⚠️                 |
| **Total**                                        | **21/29** | **19** | **8** | **0** | **CONCERNS ⚠️** |

**Criteria Met Scoring:**

- ≥26/29 (90%+) = Strong foundation
- 20-25/29 (69-86%) = Room for improvement
- <20/29 (<69%) = Significant gaps

**This delta: 21/29 (72%) — Room for improvement; no FAIL. Gaps are evidence/monitoring + device lanes + 2 deferred-work residuals (overlap + burst orphan) plus 7 carry-over from 8-1..8-4, not functional defects. Scoped AC gate is 100% coverage / 90.5% pass (2 waived RED) / 98.68% full suite (11 waived). P0/P1 15/15 100% GREEN; bench both profiles GREEN; no blockers for `done` with waiver.**

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-09-01'
  story_id: '8-5-reduced-motion'
  feature_name: '8-5 Reduced Motion — preset-gated umbrella, 60 FPS fallback, game-over fade (Epic 8, S8.5)'
  adr_checklist_score: '21/29' # ADR Quality Readiness Checklist
  categories:
    testability_automation: 'PASS'
    test_data_strategy: 'PASS'
    scalability_availability: 'CONCERNS'
    disaster_recovery: 'PASS'
    security: 'PASS'
    monitorability: 'CONCERNS'
    qos_qoe: 'CONCERNS'
    deployability: 'CONCERNS'
  overall_status: 'CONCERNS'
  critical_issues: 0
  high_priority_issues: 2
  medium_priority_issues: 1
  concerns: 8
  blockers: false # true/false
  quick_wins: 2
  evidence_gaps: 4
  recommendations:
    - 'Add cancelAnimation(bulletFlash/shakeX/Y) before new withSequence to fix R-006 overlap — one-line each, keeps 200ms+130ms budgets'
    - 'Fix burst setTimeout orphan with burstTimerRef + clearTimeout on unmount — one Set, mirrors settleTimerRef, fixes P2-05'
    - 'Run 15-min real-iPhone device smoke P1-07 (6/12/1536 + bullet new-best 12 + game-over 280→instant + Reduced Motion ON flat + mid-flight snap + chrome + haptics stay + NOOP + portrait/landscape + airplane) and sign off in PR'
  working_tree_delta: '0ec7482 + 0531056 (2 ahead of 10a3449) + metadata-only uncommitted diff (_bmad-output/*)'
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md` (baseline `10a3449` → final `0ec7482` → HEAD `0531056` byte-identical to `0ec7482` plus `sprint-status.yaml` `backlog→done`, assessed HEAD `0531056`)
- **Tech Spec:** `triade/src/feel/feel.ts` (105 LOC, REDUCED_PRESET frozen + reducedPresetFor) + `triade/src/feel/punch.ts` (49 LOC, 6 wrappers) + `triade/src/feel/shake.ts` (shakeMsFor delegation, SHAKE_CAP 8) + `triade/src/feel/bulletTime.ts` (shouldTriggerBulletTime gate, BULLET_TIME_MS 200) + `triade/src/feel/haptics.ts` (FR-30 comment, never gates) + `triade/src/render/GameBoard.tsx:98-576` (board-only shake/bullet/bursts/AnimatedTile isMerge&&!reducedMotion + mid-flight snap `withTiming(0,20)`) + `triade/src/ui/GameOverOverlay.tsx:24-55` (instant vs 280ms fade) + `triade/App.tsx:929` wiring `settings.reducedMotion` + `triade/benchmarks/feel.bench.test.ts` (140 LOC both-profile bench)
- **PRD:** N/A (game project — PRD not needed; spec is oracle)
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-8-5-reduced-motion.md` + `_bmad-output/test-artifacts/test-design-epic-8-5-reduced-motion.md` (10 risks R-001..R-010, R-001/R-002/R-003 score 6, NFR planning 5 rows, coverage P0×9 P1×7 P2×6 P3×4)
- **Traceability:** `_bmad-output/test-artifacts/traceability/traceability-matrix-8-5-reduced-motion.md`, `coverage-matrix-8-5-reduced-motion.json` (phase PHASE_1_COMPLETE, 5 ACs FULL), `gate-decision-8-5-reduced-motion.json` (CONCERNS waived), `gate-decision.json` top-level duplicate, `e2e-trace-summary-8-5-reduced-motion.json`
- **ATDD Checklist:** `_bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md` (21 tests 19 GREEN /2 RED, 2 bench tests, Stack Detection frontend node:test+tsx, Prerequisites, Red-Phase scaffolds, Implementation Checklist)
- **Evidence Sources:**
  - Test Results: `triade/__tests__/feel/reducedMotion.atdd.test.ts` (19 pass / 2 waived RED P2-04/P2-05) + `triade/__tests__/feel/feel.test.ts` 12/12 + `punch.test.ts` 8/8 + `shake.test.ts` 12/12 + `bulletTime.test.ts` 9/9 + `feel.bench.test.ts` 2/2 (10.2ms/7.29ms total) — host 42+21 feel suite all GREEN except 2 waived; full suite `835 total 824 pass / 11 fail` (11 = 9 carry-over 8-1/8-2/8-3/8-4 + 2 new 8-5)
  - Metrics: host bench both profiles 10k turns median p99 <0.05/0.1 (P2-01 GREEN), per-it 0.04–0.75ms, no APM/k6 (client-only); `transition-plan` bench p99 <0.1ms still GREEN
  - Logs: silent best-effort (no structured logs yet; overlap/burst has no telemetry — was P2-04/P2-05 gap)
  - CI Results: `triage` clean (`./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` exit 0, `tsconfig.test.json` exit 0), `git diff --stat -- triade/src/engine` empty (ADR-01), `npm audit` carry-over 11 moderate transitive expo (deferred, not blocking)

---

## Recommendations Summary

**Release Blocker:** None (0 FAIL). Gate is CONCERNS, not FAIL — safe for `done` with waiver, not yet `verified`.

**High Priority:** R-006 overlap without `cancelAnimation(bulletFlash/shakeX/Y)` (0.25h, 3 one-lines, same file as R-010) + R-010 burst `setTimeout 500` orphan without `clearTimeout` on unmount (0.25h, Set+useEffect) must both be fixed + `reducedMotion.atdd.test.ts:336/347` re-run until P2-04/P2-05 GREEN before `verified`; P1-07 device smoke (15 min, real iPhone umbrella) must be signed off before `verified`; `GameOverOverlay` wiring `App.tsx:929` must stay not hardcoded (already P1-02 GREEN). Waivers expire before 8-6 (full feel-stack + SFX adds further main-thread cost).

**Medium Priority:** Device p99 benchmark lane (`useFrameRateBaseline` after 2-min play heavy+bullet+1536 vs reduced flat, reduced p99 ≤ full p99) before 8-6; lint guard for FR-30/preset-not-flag + CI gates for engine purity / single access point / caps + `value>=3` hardening decision + `haptics.ts` never gate. Carry-over `deferred-work.md` 7 residuals for 8-1..8-4 on same `GameBoard` file — fix together on same PR as R-006/R-010.

**Next Steps:** Address 2 high (cancelAnimation trio + burstTimerRef + device smoke + wiring verify), re-run `nfr-assess` and `trace` after; both gates currently CONCERNS with same residuals — converge to PASS before `verified` and before Epic 8 S8.6 (SFX+haptics).

---

## Sign-Off

**NFR Evidence Audit:**

- Overall Status: CONCERNS ⚠️
- Critical Issues: 0
- High Priority Issues: 2 (R-006 overlap score 4 + R-010 burst orphan score 3, same GameBoard file)
- Concerns: 8 (ADR criteria) / 4 category-level (Scalability/Monitorability/QoS/Deployability)
- Evidence Gaps: 4 (device p99 both profiles, overlap fix, device Reduced Motion+chrome+fade, burst orphan + carry-over)

**Gate Status:** CONCERNS ⚠️

**Next Actions:**

- If PASS ✅: Proceed to `*gate` workflow or release
- If CONCERNS ⚠️: Address HIGH issues, re-run `*nfr-assess`
- If FAIL ❌: Resolve FAIL status NFRs, re-run `*nfr-assess`

**Generated:** 2026-09-01
**Workflow:** testarch-nfr v5.0
**Evaluator:** Eduardo (TEA / Murat — Master Test Architect)

---

<!-- Powered by BMAD-CORE™ -->
