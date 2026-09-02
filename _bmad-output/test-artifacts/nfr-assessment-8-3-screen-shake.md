---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-09-01'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-3-screen-shake.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-3-screen-shake.md'
  - '_bmad-output/test-artifacts/test-design-epic-8-3-screen-shake.md'
  - '_bmad-output/test-artifacts/traceability/traceability-matrix-8-3-screen-shake.md'
  - '_bmad-output/test-artifacts/traceability/coverage-matrix-8-3-screen-shake.json'
  - '_bmad-output/test-artifacts/traceability/gate-decision-8-3-screen-shake.json'
  - '_bmad-output/test-artifacts/atdd-checklist-8-3-screen-shake.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/shake.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/feel/shake.test.ts'
  - 'triade/__tests__/feel/shake.atdd.test.ts'
  - 'triade/package.json'
  - '_bmad/tea/config.yaml'
---

# NFR Evidence Audit - 8-3 Screen Shake (Directional, FeelPreset-Driven, Capped)

**Date:** 2026-09-01
**Story:** 8-3-screen-shake
**Overall Status:** CONCERNS ⚠️

---

Note: This audit summarizes existing implementation evidence; it does not run tests or CI workflows. NFR thresholds and planned evidence come from PRD, architecture, and `test-design` outputs where available. Working-tree delta is commit `721bf3a` (1 ahead of `e4629cd` baseline) plus metadata-only uncommitted diff.

## Executive Summary

**Assessment:** 0 PASS, 5 CONCERNS, 0 FAIL (at category roll-up); at ADR checklist 21 PASS / 8 CONCERNS / 0 FAIL (29 criteria) — 72% criteria met.

**Blockers:** 0 — no FAIL; 2 waived P2 expected-RED items for this story (same deferred-work cause pair: R-001 cancelAnimation + R-007 overflow clipping) plus 2 waived carry-over from 8-1 and 2 from 8-2 require fix before `verified` but do not block `CONCERNS` gate.

**High Priority Issues:** 2 — R-001 overlapping shake concurrency without `cancelAnimation` (P2 score 6, deferred before 8-4, two ATDD signals: `shake.atdd.test.ts:272` P2-01) and R-007 board edge clipping `overflow:hidden` (P2 score 4, deferred cosmetic, `shake.atdd.test.ts:331` P2-05) plus pending 15-min device smoke P1-07 and R-001 device p99. Carry-over burst leak R-002/R-007 from 8-2 (P1 score 6 / P2 score 4, same `setTimeout(500)` cause) remains unfixed in this delta (GameBoard still bears it).

**Recommendation:** CONCERNS → add `cancelAnimation(shakeX/Y)` before each new `withSequence` (one-line, keeps 130 ms budget) and run real-iPhone device smoke (6→2px subtle X, 12+→5px stronger X/Y capped 8, portrait+landscape, Reduced Motion ON flat while haptics stay, NOOP flat, preview chrome never shakes, rapid-swipe combo within 84–130 ms shows no freeze) before promoting to `verified`; decide clipping product fix (`BOARD_PADDING+SHAKE_CAP` spare or `boardWrap overflow:visible`) in same pass. Re-run `nfr-assess` and `trace` after.

**Working-tree evidence snapshot:**
- `triade/src/feel/feel.ts` 97 LOC (`FeelPreset.shakeMs` 2 light / 2 medium / 5 heavy, frozen `FEEL_PRESETS` + `REDUCED_PRESET shakeMs 0`, `presetFor`/`reducedPresetFor` pure, defensive comment cap) + `triade/src/feel/shake.ts` 81 LOC (`SHAKE_CAP=8` exported, `shakeMsFor`/`shakeAmplitudeFor`/`directionVector`/`maxShakeForTrace`/`shouldShake` pure, `Number.isFinite` + try/catch never-throw, `maxShakeForTrace` skips non-finite `entry.value`, `presetFor` delegation, no RN imports) + `triade/src/render/GameBoard.tsx:296-539` (`direction?: Direction` prop, `shakeX`/`shakeY` shared values + `shakeStyle` `useAnimatedStyle` on `Animated.View` wrapper around `Canvas` board-only, imperative `withSequence(withTiming(amp*vec,30), withTiming(-amp*0.6*vec,40), withTiming(amp*0.3*vec,30), withTiming(0,30))` 130 ms total on swipe axis + `withTiming(0,130)` orthogonal, bleed-cancel `withTiming(0,20)` branches for slide-only/NOOP/reducedMotion/invalid dir, `useEffect` snap `withTiming(0,20)` when `reducedMotion` toggles mid-shake, `maxShakeForTrace(trace, reducedMotion)` + `Math.min(maxShake, SHAKE_CAP)` + `directionVector(direction)` gated `moved && !reducedMotion && direction && amplitude>0`) + `triade/App.tsx:+7 LOC` (`lastDirectionRef: Direction|null` set synchronously in `doMove(dir)` before `move()`, passed `direction={lastDirectionRef.current ?? undefined}` into `GameBoard`, cleared on `handleRestart` + lane change `newGame` path) + `triade/__tests__/feel/shake.test.ts` 12 cases (P0) + `triade/__tests__/feel/shake.atdd.test.ts` 17 cases (9 P0 + 6 P1 + 4 P2 PASS / 2 P2 expected RED `P2-01`/`P2-05` deferred)
- `npm test --prefix triade` — 782 total, 776 pass / 6 fail (all EXPECTED RED: 2 carry-over 8-1 `R-001` tutorial dedup + `R-006` expo-haptics + 2 new 8-2 `R-002` burst leak same cause + 2 new 8-3 `R-001` overlap + `R-007` clipping) — duration 5153ms, 30 suites — scoped 8-3: 17 mapped 15 PASS / 2 FAIL (P2-01/P2-05) host smoke `shake.test.ts` 12/12 GREEN; excluding RED patterns full suite is 776+ effective PASS for new surface, `punch.test.ts` 8 + `feel.test.ts` 12 remain GREEN
- `triade/src/engine` byte-identical (`git diff --stat -- triade/src/engine` empty — ADR-01); `git diff --stat HEAD` shows only metadata (`spec-8-3-screen-shake.md` final_revision bump + `sprint-status.yaml` backlog→done + automation docs)
- `./node_modules/.bin/tsc --noEmit` clean inside `triade/` (exit 0, no new `@ts-ignore`; `shake.ts` strictly typed `Direction`/`TraceEntry`)
- `triade/package.json` unchanged (expo ~57.0.11, Reanimated 4.5.1, Skia 2.6.2, no `expo-haptics` — deferred per 8-1 R-006 carry-over, shake adds 0 new deps)

---

## Performance Assessment

### Response Time (p95)

- **Status:** CONCERNS ⚠️
- **Threshold:** NFR-1 + NFR-11: engine <2ms/turn, frame logic worst-case <8ms, device p99 <16.7ms (60 FPS) — NFR planning from test-design §NFR Planning (`useFrameRateBaseline` lane). Shake budget: `130 ms` total `30+40+30+30` withSequence on board container concurrent with Skia Canvas + Reanimated main-thread worklets + 8-2 punch overshoot+particles if two heavies stack. `EARLY_INPUT_MS≈84 ms` budget respected; shake must not push p99. Cap `SHAKE_CAP 8` is max pixel displacement.
- **Actual:** Host micro-bench `shakeMsFor` + `shakeAmplitudeFor` + `directionVector` + `maxShakeForTrace` + `allPresetValues()` sweep 10k×13 = 130k calls <200ms (P2-02 GREEN, actual 10k sweeps measured <50ms host; `presetFor` + `allPresetValues()` per-it 0.08–0.6ms in `shake.test.ts` pattern). Device p99 with shake layer concurrent with Canvas NOT measured — P1-07 / R-001 device lane pending.
- **Evidence:** `triade/__tests__/feel/shake.atdd.test.ts:283` P2-02 bench (`10k*13 shake helper sweeps <200ms` + `10k maxShakeForTrace <100ms`), `shake.test.ts` per-case timings, `test-design-epic-8-3-screen-shake.md` NFR Planning R-001/R-003/R-007, `GameBoard.tsx:298-473` shake worklet geometry deterministic `Animated.View` + `withSequence`/`withTiming` 130ms.
- **Findings:** Host side well within frame budget; no per-merge promise storm (one shake per `moveResult` via `maxShakeForTrace` max-wins, not stacked). Optimised mitigations in place: `SHAKE_CAP 8` asserted via `Math.min(maxShake, SHAKE_CAP)` single source, axis isolation `vec.x!==0 → shakeX sequence` else `shakeY`, orthogonal pinned `withTiming(0,130)`, bleed-cancel `withTiming(0,20)`. Shake + punch concurrent load (shake 130ms on `translateX/Y` + punch overshoot spring + up to 16 `ParticleDot` 300/340ms) may exceed p99 on mid-tier iPhones under early-input re-plan at 84ms — not FAIL because thresholds are deferred to Epic 8 device lane (ADR-04 two-level benchmark when 8-3 lands). Overlap artefact R-001 without `cancelAnimation` is mild jank, not functional failure.

### Throughput

- **Status:** CONCERNS ⚠️
- **Threshold:** N/A backend; client frame gate is rate limiting for shake coalescence (no req/sec SLO)
- **Actual:** No k6/JMeter load run (no backend). Multi-merge policy fires single shake `max wins` (trace `[3→2, 12→5]` → `max 5`, `[6,6]→2` via `maxShakeForTrace` loop, `shake.test.ts:79` + `shake.atdd.test.ts:91` pins). No shake throttling beyond `Math.min(maxShake, SHAKE_CAP)` + single `withSequence` per `moveResult` effect (not per `plan` entry) — if device trace shows jank, coalescence fix is `cancelAnimation` before new `withSequence` (test-design R-001 mitigation, product decision pending). Throughput is frame-bound, not request-bound.
- **Evidence:** `shake.test.ts:79` + `shake.atdd.test.ts:91` multi-merge max wins, `spec-8-3-screen-shake.md` I/O row "Multiple merges in one move" expects one shake driven by max.
- **Findings:** Throughput not breached host-side; device coalescence/drop risk R-001 pending device verification (see P2-01 expected RED).

### Resource Usage

- **CPU Usage**
  - **Status:** CONCERNS ⚠️
  - **Threshold:** Budget p99 16.7ms
  - **Actual:** No CPU profile collected; host heap trivial (3 frozen presets + `ALL_TIERS` 13 numbers + 81 LOC pure helpers, 2 shared values `shakeX/Y`). `GameBoard` shake per-move allocates one `withSequence` chain (4 `withTiming` segments) + one orthogonal `withTiming`; no leak observed in 782-test burn but unmeasured on device. Overlap without `cancelAnimation` risks spring artefact (R-001) not CPU leak. Burst timer leak R-002 from 8-2 still present (unrelated to shake but same `GameBoard` host) does not affect CPU but risks `setState on unmounted`.
  - **Evidence:** No APM; `npm test` duration 5153ms stable across runs (4906ms previous).

- **Memory Usage**
  - **Status:** PASS ✅
  - **Threshold:** N/A (client RN, no server memory SLO)
  - **Actual:** Negligible — `FEEL_PRESETS` frozen 3 entries, `ALL_TIERS` frozen 13 numbers, `shake.ts` no retention, `GameBoard` shake stores only 2 shared values + `shakeStyle` memo; no accumulation. Orthogonal to burst layer which auto-clears but lacks unmount guard (carry-over).
  - **Evidence:** Source `feel.ts:21-58` frozen objects; `shake.ts` 81 LOC stateless; `GameBoard.tsx:298-304` `useSharedValue(0)` x2.

### Scalability

- **Status:** CONCERNS ⚠️
- **Threshold:** Statelessness required (ADR 3.1); no horizontal scaling needed for client feature
- **Actual:** Stateless pure functions (`presetFor` frozen identity, `shakeMsFor`/`shakeAmplitudeFor`/`directionVector`/`maxShakeForTrace`/`shouldShake` pure, `SHAKE_CAP` const). Bottleneck is overlap R-001 (single device) not scaling but stability; no circuit breaker needed — fail-fast is non-throw fallback. Caps `SHAKE_CAP 8` + axis isolation prevent layout thrash.
- **Evidence:** `feel.ts:68-74` pure lookup, `shake.ts:9-81` stateless wrappers with try/catch, `test-design` R-001 score 6 / R-007 score 4.
- **Findings:** Scalability N/A for this delta (no server). CONCERNS only due to pending device p99 and R-001 overlap.

---

## Security Assessment

### Authentication Strength

- **Status:** PASS ✅
- **Threshold:** N/A (no auth in feel/shake layer)
- **Actual:** N/A — shake gateway does not handle credentials, tokens, or sessions.
- **Evidence:** No auth code in `triade/src/feel/` nor `triade/src/render/GameBoard.tsx`; `spec-8-3-screen-shake.md` Boundaries: "Engine remains pure TS with no RN/Reanimated/Skia imports (ADR-01)"; auth out of scope per test-design Not in Scope.
- **Findings:** No exposure.

### Authorization Controls

- **Status:** PASS ✅
- **Threshold:** N/A
- **Actual:** N/A — RBAC not applicable; shake is local visual, no resource access control.
- **Evidence:** No authorization checks in `shake.ts`; `reducedMotion` deliberately not used as auth gate.
- **Recommendation:** N/A

### Data Protection

- **Status:** PASS ✅
- **Threshold:** No PII/secrets in trace; encryption N/A (client-side)
- **Actual:** No sensitive data handled; `TraceEntry` contains board coordinates and values (3..12288), no PII.
- **Evidence:** `triade/src/engine/core/types.ts` TraceEntry shape; `shake.ts` never logs values.
- **Findings:** No data protection risk.

### Vulnerability Management

- **Status:** PASS ✅
- **Threshold:** 0 critical/high (textbook; carry-over `npm audit` deferred to expo major bump per 8-1)
- **Actual:** No `npm audit` run this lane (requires lockfile) but `triade/package.json` unchanged from 8-1 (11 moderate transitive via `@expo/cli` chain per 8-1 audit — out of scope). No SAST/DAST; no new dependency (shake adds 0 new deps, uses pinned `react-native-reanimated` + `@shopify/react-native-skia` already in 8-1/8-2). No new supply-chain risk beyond carry-over.
- **Evidence:** `triade/package.json` deps list (no new dep), `shake.ts` imports only `./feel.ts` + `../engine/core/types.ts`, `GameBoard.tsx` imports only `react-native-reanimated`/`@shopify/react-native-skia` already pinned.
- **Findings:** No new supply-chain risk. Carry-over 11 moderate remains waived pending expo major bump (not blocking 8-3).

### Compliance (if applicable)

- **Status:** CONCERNS ⚠️
- **Standards:** FR-30 / UX-DR-16 (Reduced Motion gates all shake visuals but keeps haptics+sound), UX-DR-27 chrome rule (board only, never preview/score)
- **Actual:** COMPLIANT host-side — `shakeMsFor(v,true)===0 && shakeAmplitudeFor(6,true)===0 && maxShakeForTrace(trace,true)===0 && shouldShake===false` for all tiers (`shake.test.ts:43`, `shake.atdd.test.ts:54` sweep), `reducedPresetFor(12).haptic==='heavy'` preserved (haptics stay), `GameBoard` shake gated `if (moveResult.moved && !reducedMotion && direction)` + else bleed-cancel `withTiming(0,20)` + `useEffect` mid-flight snap (`shake.atdd.test.ts:222` P1-04 source scan), `shake.ts` `maxShakeForTrace` never touches `haptics.ts` (FR-30: shake gated, haptics not), `GameBoard` `Animated.View` wraps `Canvas` only (board only, never chrome — `shake.atdd.test.ts:236` P1-05: `Hud`/`PreviewCard` never imported, `shakeStyle` used exactly twice, `Canvas` inside `Animated.View`), cap `≤8` prevents motion-sickness excessive displacement via `SHAKE_CAP` single source (`shake.atdd.test.ts:307` P2-03 + `Math.min(maxShake, SHAKE_CAP)`). Device confirmation pending.
- **Evidence:** `shake.ts:18-81` reduced gate, `feel.ts:84-96` reducedPresetFor preserving haptic, `GameBoard.tsx:298-473` gating + chrome wrapper, `shake.atdd.test.ts:P0-04` and `P1-04/P1-05/P2-03/P2-06` scans.
- **Findings:** Host contract PASS; overall CONCERNS until P1-07 device smoke (Reduced Motion ON flat while haptics still felt, preview chrome never shakes) is signed off.

---

## Reliability Assessment

### Availability (Uptime)

- **Status:** PASS ✅ (with note)
- **Threshold:** N/A — offline-first RN app (NFR-2/NFR-6 installable + offline), no server SLA
- **Actual:** App boots offline; shake visuals are bundled worklets (Reanimated/Skia), no network fetch.
- **Evidence:** `GameBoard.tsx` imports are bundled modules, not CDN; test-design NFR table: offline/airplane mode check as device lane.
- **Findings:** No availability risk; pending airplane-mode device confirmation (P1-07).

### Error Rate

- **Status:** PASS ✅
- **Threshold:** <0.1% (textbook; not formally declared) — scoped 8-3: 15/17 = 88.2% but 2 fails are expected RED with waiver same cause pair, effective pass excluding waived RED is 100% for automatable surface (17/17 scoped non-waived = 100%); full suite 776/782 = 99.23% (6 waived 0.77%) excluding waived is 100% new surface; `shake.test.ts` 12/12 = 100% P0.
- **Actual:** 0 unhandled throws on shake path; `shakeMsFor(NaN/Infinity/undefined)` + `shakeAmplitudeFor` + `maxShakeForTrace(NaN/Infinity)` + `directionVector(null/123/"LEFT")` never throw (`shake.test.ts:122`, `shake.atdd.test.ts:132` sweeps), `presetFor` fallback light, `GameBoard` effect silent no-op on empty plan / NOOP / invalid dir / unmount mid `withSequence`.
- **Evidence:** `shake.ts:9-16` clamp, `18-81` try/catch never-throw wrappers, `feel.ts:68-74` non-finite fallback, `npm test` 776 pass excluding EXPECTED RED.

### MTTR (Mean Time To Recovery)

- **Status:** CONCERNS ⚠️
- **Threshold:** UNKNOWN (no incident SLI)
- **Actual:** No incident data; recovery from shake failure is instant (silent no-op, gameplay continues, move not blocked). Detection MTTR is gap: overlap R-001 has no telemetry beyond ATDD pins; burst leak carry-over also has no Crashlytics signal.
- **Evidence:** No incident reports; `traceability/gate-decision-8-3-screen-shake.json` notes overlap/clipping residuals without Crashlytics signal.
- **Findings:** MTTR 0 for user (no crash), but detection MTTR UNKNOWN pending `cancelAnimation` fix + import-failure telemetry (if ever needed).

### Fault Tolerance

- **Status:** PASS ✅
- **Threshold:** Never-throw guarantee (engine-never-throws extended to feel+shake)
- **Actual:** PASS — `presetFor(NaN/Infinity/-5) -> light` fallback, `shakeMsFor(NaN)`→2 via light fallback (finite, capped) + `maxShakeForTrace` skips non-finite `entry.value` via `Number.isFinite` guard, `directionVector` zero-vector safety, `maxShakeForTrace(null/undefined/[])→0`, `shouldShake→false`, `GameBoard` effect silent no-op on empty plan + else bleed-cancel. Strongest NFR for this story (pure helpers + frozen presets).
- **Evidence:** `shake.test.ts:122,141`, `shake.atdd.test.ts:132`, `shake.ts:9-16,37-47,49-81`, `feel.ts:68-74`.
- **Findings:** Fault tolerance is strongest NFR for this story.

### CI Burn-In (Stability)

- **Status:** CONCERNS ⚠️
- **Threshold:** Informational (no formal burn-in gate; textbook suggests 100 consecutive green as strong signal)
- **Actual:** Single `npm test` run 776/782 (99.23%) with 6 waived RED (2 carry-over 8-1 + 2 new 8-2 burst leak + 2 new 8-3 overlap/clipping); 0 flaky detected. No nightly soak; no 100-run burn. P0/P1 suite deterministic (mulberry32 seeded, `allPresetValues()` sweep, real `move()` fixtures).
- **Evidence:** `gate-decision-8-3-screen-shake.json` criteria `flaky_tests:0`, `npm test` duration 5153ms, `shake.atdd.test.ts:283` perf bench deterministic.
- **Findings:** Stable single run; CONCERNS only because formal burn-in not executed — not a blocker for small delta.

### Disaster Recovery (if applicable)

- **RTO (Recovery Time Objective)**
  - **Status:** PASS ✅ (N/A)
  - **Threshold:** N/A — client stateless, no data loss
  - **Actual:** N/A
  - **Evidence:** No persistence in shake layer; game state via `src/services/storage` not touched.

- **RPO (Recovery Point Objective)**
  - **Status:** PASS ✅ (N/A)
  - **Threshold:** N/A
  - **Actual:** N/A
  - **Evidence:** No backup/restore needed.

---

## Maintainability Assessment

### Test Coverage

- **Status:** CONCERNS ⚠️
- **Threshold:** AC coverage gate 100% per test-design; line-coverage 80% not formally declared
- **Actual:** AC coverage 100% (6/6 FULL) per `traceability-matrix-8-3-screen-shake.md`; critical shake paths `3/6/12+/cap 8/Reduced Motion/NOOP/multi-merge max/direction vectors/chrome guard` all covered host-side (12 `shake.test.ts` + 15 non-RED `shake.atdd.test.ts` P0/P1/P2). No `lcov`/`c8` line % collected — `coverage/` report not generated in this run (node:test, no c8 gate, consistent with 7.x/8-1/8-2 precedent). Scoped pass 88.2% (15/17) with 2 waived RED accounted as coverage FULL but execution RED; `shake.test.ts` 12/12 GREEN.
- **Evidence:** `traceability-matrix-8-3-screen-shake.md` coverage table, `coverage-matrix-8-3-screen-shake.json`, `npm test` 17 mapped 8-3 cases.
- **Findings:** AC coverage excellent; line-coverage metric is the gap. Recommend adding `c8` lane if CI wants line % for maintainability gate (backlog).

### Code Quality

- **Status:** PASS ✅
- **Threshold:** `./node_modules/.bin/tsc --noEmit` clean, no scattered literals outside single access point, frozen presets, `SHAKE_CAP` single cap, axis isolation correct
- **Actual:** `tsc` clean (exit 0 inside `triade/`, no new `@ts-ignore`; `shake.ts` strictly typed `Direction`/`TraceEntry`). `FEEL_PRESETS` frozen, `presetFor` pure, `shake.ts` thin wrappers over `presetFor` (no duplicate tier branching, `shake.atdd.test.ts:345` gate P2-06 GREEN: `shake.ts` delegates to `presetFor`, no hard-coded `2/5` duplicating tier logic), `GameBoard` uses `Math.min(maxShake, SHAKE_CAP)` + `directionVector` + `maxShakeForTrace` (P2-06 GREEN), `SHAKE_CAP` exported from `shake.ts` and consumed via `Math.min` single source (P2-03 GREEN: `shake.ts` `SHAKE_CAP=8`, `GameBoard` `SHAKE_CAP` import, `shakeMs:` literals only in `feel.ts`), `directionVector` case-sensitive safety, `Number.isFinite` guards. No SonarQube but code is small (97+81 LOC new infra + 101 LOC GameBoard shake delta), frozen presets, 0 duplication beyond sanctioned `from.length===2` in 3 sites.
- **Evidence:** `feel.ts:21-58` frozen presets, `shake.atdd.test.ts:307` P2-03 + `345` P2-06 + `320` P2-04 engine purity, `tsc` clean.

### Technical Debt

- **Status:** PASS ✅
- **Threshold:** <5% debt ratio (textbook)
- **Actual:** Low — 2 new modules (feel.ts delta comment + shake.ts), 81 LOC new, no engine duplication, no copy-paste, `FEEL_PRESETS` single source for 8.4–8.6 reuse. Debt items are 2 deferred RESIDUALS for this story (R-001 overlap without `cancelAnimation` + R-007 clipping overflow) plus 2 carry-over burst leak residuals from 8-2 (same `setTimeout(500)` fix, expiry before 8-4). Working-tree delta is tiny (101 −21 LOC GameBoard + 81 LOC shake.ts + 7 LOC App).
- **Evidence:** `spec-8-3-screen-shake.md` Residual risks + Review Triage (3 patches applied, 2 deferred lows), `test-design` R-001..R-010 list, `gate-decision-8-3-screen-shake.json` residual_risks.
- **Findings:** No structural debt.

### Documentation Completeness

- **Status:** PASS ✅
- **Threshold:** Spec + test-design + traceability present
- **Actual:** Spec `spec-8-3-screen-shake.md` (intent/boundaries/I-O matrix/Code Map/Tasks/Verification/Auto Run Result 721bf3a, 3 patches + 2 deferred), epic context `epic-8-context.md`, test-design `test-design-epic-8-3-screen-shake.md` (10 risks, NFR planning, coverage plan P0×9 P1×7 P2×6 P3×3), traceability matrix + gate decision + coverage matrix + e2e trace summary, ATDD checklist `atdd-checklist-8-3-screen-shake.md`, automation summary, deferred-work. All linked in gate decision `links` block.
- **Evidence:** `_bmad-output/implementation-artifacts/` and `_bmad-output/test-artifacts/` file list.

### Test Quality (from test-review, if available)

- **Status:** PASS ✅
- **Threshold:** Host fixtures over real engine traces (not stubs)
- **Actual:** Host fixtures use real `MoveResult.trace` from `newGame(mulberry32)` + `move` (P1-01), `GameBoard` source-structure gates for axis isolation + bleed-cancel + mid-flight snap + chrome guard, `App.tsx` wiring via grep gate for `lastDirectionRef` sync before `move()` + double `null` clear, edge sweeps for non-finite/NOOP/multi-merge/invalid dir, perf bench deterministic (`performance.now` 10k sweeps). No Playwright needed (correctly scoped to Unit per test-levels framework; `tea_browser_automation` auto but story is pure RN worklet).
- **Evidence:** `shake.atdd.test.ts:152,182,201,222,236,253,283`, `shake.test.ts` sweep invariants (`<=8`, `reduced 0`, `case-sensitive`).
- **Findings:** Test quality strong; P1-07 device smoke is the remaining gap (host-only until device lane).

---

## Custom NFR Evidence Audits (if applicable)

No custom categories beyond the 8 ADR checklist categories; client Offline/Installability (NFR-2/NFR-6) covered under Availability (PASS with pending airplane device check). `SHAKE_CAP 8` cap and `130 ms` duration are pinned as custom shake thresholds (Performance + Maintainability) and directional axis correctness (QoS) — covered above.

---

## Quick Wins

2 quick wins identified for immediate implementation:

1. **Add cancelAnimation before new withSequence to fix R-001 overlap** (Performance/Reliability) - HIGH - 0.25h - FE
   - In `GameBoard.tsx:422-473` before each new `shakeX.value = withSequence(...)` / `shakeY.value = withSequence(...)` add `cancelAnimation(shakeX)` / `cancelAnimation(shakeY)` (import from `react-native-reanimated`). One fix clears `shake.atdd.test.ts:272` P2-01 and keeps `130 ms` budget intact; verify rapid-swipe pair within 84–130 ms (EARLY_INPUT) no longer truncates overlap. Keep bleed-cancel `withTiming(0,20)` branches unchanged.

2. **Add FR-30 comment + lint guard for shake gating** (Compliance/Maintainability) - LOW - 0.25h - FE lead
   - Add comment `// FR-30: shake gated — haptics stay` above `GameBoard.tsx:422` shake block and `shake.ts:18` helpers; add CI grep gate `rg -n "reducedMotion" triade/src/feel --glob '!shake.ts' --glob '!feel.ts'` fails if leaked into `haptics.ts` or punch (test-design R-002 mitigation). Ensures 8-5 Reduced Motion umbrella does not regress shake/haptics independence. Also add clipping decision comment `// R-007: 5-8px shake may clip by overflow:hidden — see deferred-work` at `GameBoard.tsx:490` parent View.

---

## Recommended Actions

### Immediate (Before Release) - CRITICAL/HIGH Priority

1. **Fix R-001 overlap + verify R-007 clipping product decision** - HIGH - 0.5h - FE / UX
   - Add `cancelAnimation(shakeX)`/`cancelAnimation(shakeY)` before new `withSequence` in `GameBoard.tsx` (one-line each); re-run `shake.atdd.test.ts` until P2-01 3/3 GREEN and rapid-swipe combo video (left heavy 12 then up medium 6 within 90ms) shows clean axis switch (shakeX→0 + shakeY sequence). For R-007, UX decision: either keep `overflow:hidden` as accepted cosmetic clipping (deferred-work) or apply `BOARD_PADDING + SHAKE_CAP` spare / `boardWrap overflow:visible` with bleed margin and re-shoot heavy 5px corner screenshot. Both share one PR.

2. **Run 15-min real-iPhone device smoke P1-07** - HIGH - 0.25h - PR author / QA
   - In Expo dev build on real iPhone (SDK 57, Skia+Reanimated 4, no Simulator): trigger 3→light 2 subtle, 6→medium 2 subtle, 12+→heavy 5 stronger capped 8, each in left/right (X) and up/down (Y) + portrait+landscape; toggle Settings → Reduced Motion ON → repeat heavy+cap: flat (translate 0) while haptics still felt; NOOP swipe (edges/no merge) → flat; preview card & score never translate; airplane mode → repeat; rapid swipes during 130ms window → no freeze (R-001). Record sign-off checkbox in PR description ("device shake smoke: left/right X, up/down Y, 6/12+/cap + Reduced Motion ON flat + NOOP + chrome + rapid-overlap check").

3. **Remediate carry-over burst leak before verified (same GameBoard surface)** - HIGH - 0.5h - FE
   - 8-2 R-002/R-007 bare `setTimeout(500)` without ref/clearTimeout on unmount (P1 score 6 / P2 score 4) still present in `GameBoard.tsx:404` `setTimeout(()=>setBursts(filter by id),500)` — store ids in `burstTimersRef: Set<ReturnType<typeof setTimeout>>` + `useEffect` cleanup `clearTimeout` on unmount mirroring `settleTimerRef` at `GameBoard.tsx:338`. One fix clears both `punch.atdd.test.ts:269` P1-05 and `314` P2-01 and is on same file as shake fix — do together. Waiver expiry before 8-4 (bullet time adds further main-thread cost).

### Short-term (Next Milestone) - MEDIUM Priority

1. **Add device p99 benchmark lane for R-001** - MEDIUM - 1h - QA / FE
   - Run `useFrameRateBaseline` stats after 2-min play with 10+ merges including at least one `6` (2px) and one `12+` (5px) shake plus one heavy punch+glow on real iPhone; capture `fps`/`p99Ms`/`frames` and fail if `p99Ms>16.7ms`. Keep `Animated.View` shake on board container only + caps `SHAKE_CAP 8` + `overshootScale≤1.2`/`particleBurst∈{0,4,8,16}` asserted. Required before 8-4 (shake+bullet time compound).

2. **Keep CI guard rails** - MEDIUM - 0.5h - DEV/CI
   - Enforce `git diff --stat -- triade/src/engine` empty (ADR-01), `rg "SHAKE_CAP" src/feel --glob '!shake.ts'` fails if scattered, `rg "from.length===2" src/` hits only `src/engine` + `src/feel/shake.ts` + `src/render/transitionPlan.ts` (3 sanctioned), `shakeMs` literals `2`/`5` only in `feel.ts` preset defs, `App` wiring gate for `lastDirectionRef` sync before `move()` + double `null` clear. All host gates, keep in PR checks for 8.4-8.6.

### Long-term (Backlog) - LOW Priority

1. **Add c8/nyc coverage lane and jscpd duplication check** - LOW - 1-2h - DEV/CI
   - Generate `coverage/lcov-report` for maintainability gate (80% target) and jscpd for <5% duplication — not required for this small delta but useful for Epic 8 full feel preset (8.3-8.6).

2. **Evaluate stale direction after lane switch** - LOW - 0.5h - QA
   - Lane switch without active match retains stale `lastDirectionRef` until next swipe (spec residual low); next effective move overwrites synchronously — monitor via device smoke that heavy shake axis after lane switch is correct. Not gating.

---

## Monitoring Hooks

4 monitoring hooks recommended to detect issues before failures:

### Performance Monitoring

- [ ] Host micro-bench lane (CI) - Fail CI if `shakeMsFor`+`maxShakeForTrace`+`directionVector` sweep >200ms for 130k calls or `presetFor` per-it >2ms
  - **Owner:** DEV / CI
  - **Deadline:** 8-4 review

- [ ] Device frame stats lane (`useFrameRateBaseline`) - Track `fps`/`p99Ms`/`frames` after 2-min play with 10+ merges including one heavy (12+ →5px) shake; alert if p99 >16.7ms (shake + punch concurrent)
  - **Owner:** QA / FE
  - **Deadline:** Epic 8 device benchmark (ADR-04 two-level benchmark when 8.4 lands)

### Security Monitoring

- [ ] No security runtime monitoring needed this story (client-only visual) — keep `npm audit` + `expo-doctor` as periodic gate (carry-over 11 moderate transitive expo)
  - **Owner:** FE lead / CI
  - **Deadline:** 8-4 review

### Reliability Monitoring

- [ ] Shake unmount dev-build warning (optional) - Log once when `GameBoard` unmounts during in-flight 130ms `withSequence` or when `directionVector` receives non-canonical dir (e.g. `"LEFT"`) indicating `resolveSwipeDirection` contract drift
  - **Owner:** FE
  - **Deadline:** 8-3 follow-up / 8-4

### Alerting Thresholds

- [ ] Axis drift alert - Notify when device smoke video shows shake on wrong axis (left/right on Y or up/down on X) — indicates `lastDirectionRef` staleness or `directionVector` rename regression
  - **Owner:** QA
  - **Deadline:** after fix

---

## Fail-Fast Mechanisms

3 fail-fast mechanisms recommended to prevent failures:

### Circuit Breakers (Reliability)

- [ ] Not needed — `shakeMsFor`/`shakeAmplitudeFor`/`maxShakeForTrace`/`shouldShake`/`directionVector` already fail-fast via non-finite guard + try/catch never-throw; `GameBoard` effect silent no-op on empty plan / NOOP / invalid dir. Keep as-is; do not add retry loop (visual is best-effort).

### Rate Limiting (Performance)

- [ ] Optional shake coalescence debounce for overlap — If R-001 device trace shows jank with concurrent Skia Canvas + overshoot spring at 84ms early-input re-plan, the `cancelAnimation` fix is the rate limiter (collapses N shakes in 130ms window to the latest). Owner: FE, Effort: already in Quick Win 1, gated by device p99 feedback from `useFrameRateBaseline`.

### Validation Gates (Security)

- [ ] Input guard is already the validation gate — `presetFor` fallback light for non-finite/<3, `shakeMsFor` never throws + capped 8, `maxShakeForTrace` skips non-finite, `directionVector` zero-vector safety, `GameBoard` `isMerge` gating (`from.length===2 && !spawned` per single source) + chrome guard. No additional gate needed.

### Smoke Tests (Maintainability)

- [ ] Device smoke checklist P1-07 as PR gate — must be ticked before merge to verified (15 min). Owner: PR author.

---

## Evidence Gaps

4 evidence gaps identified - action required:

- [ ] **Performance - device p99 <16.7ms with shake layer** (Performance)
  - **Owner:** QA / FE
  - **Deadline:** Before 8-4 verified (15-min device lane + benchmark)
  - **Suggested Evidence:** `useFrameRateBaseline` log `fps`/`p99Ms`/`frames` after 2-min play with 10+ merges on real iPhone dev build SDK 57 (including heavy 5px shake + punch) — concurrent Skia Canvas + Reanimated worklets
  - **Impact:** Cannot claim 60 FPS budget met without device data; host <200ms is not sufficient for frame guarantee (R-001 score 6).

- [ ] **Reliability - Shake overlap without cancelAnimation (R-001)** (Reliability)
  - **Owner:** FE
  - **Deadline:** Before 8-4 (immediate)
  - **Suggested Evidence:** `GameBoard.tsx` calls `cancelAnimation(shakeX)`/`cancelAnimation(shakeY)` before each new `withSequence`; `shake.atdd.test.ts:272` P2-01 turns GREEN; rapid-swipe combo video (left heavy then up medium within 90ms) shows clean axis switch, no truncated overlap
  - **Impact:** Truncated first shake / spring artefact on rapid combos (most playful path) — mild jank, waived low but blocks PAS.

- [ ] **Compliance - Device Reduced Motion verification (FR-30)** (Compliance)
  - **Owner:** QA / PR author
  - **Deadline:** Before verified (device smoke)
  - **Suggested Evidence:** iOS Settings → Accessibility → Motion → Reduce Motion ON → repeat heavy merges (6/12+/cap): confirm flat board (no translate) while haptics still felt; preview card & score never shake — host-only is P0-04 green but not user-verified
  - **Impact:** Without device pass, FR-30 a11y/App Store compliance is host-only but not user-verified.

- [ ] **Reliability - Board edge clipping (R-007) + burst leak carry-over** (Reliability)
  - **Owner:** FE / UX
  - **Deadline:** Before 8-4 (immediate for burst leak, product decision for clipping)
  - **Suggested Evidence:** Product decision: `BOARD_PADDING + SHAKE_CAP` spare or `boardWrap overflow:visible` with 8px bleed margin, or explicit waiver as accepted cosmetic; device screenshot that 5–8px shake at corners does not visibly cut tiles / `shake.atdd.test.ts:331` P2-05 GREEN. Plus burst leak `burstTimersRef` fix + unmount clear so `punch.atdd.test.ts` 19/19 GREEN.
  - **Impact:** Clipping is visible on every heavy merge (P2) + burst orphan `setState on unmounted` (R-002/R-007 carry-over) — not crash but polish/stability hit.

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

**This delta: 21/29 (72%) — Room for improvement; no FAIL. Gaps are evidence/monitoring + device lanes + 2 deferred-work residuals, not functional defects. Scoped AC gate is 100% coverage / 88.2% pass (2 waived RED) / 99.23% full suite.**

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-09-01'
  story_id: '8-3-screen-shake'
  feature_name: '8-3 Screen shake — directional, FeelPreset-driven, capped (Epic 8, S8.3)'
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
    - 'Add cancelAnimation(shakeX/Y) before new withSequence to fix R-001 overlap — one-line, keeps 130ms budget'
    - 'Run 15-min real-iPhone device smoke P1-07 (6/12+/cap + Reduced Motion ON flat + NOOP + chrome + rapid-overlap check) and sign off in PR'
    - 'Decide clipping R-007 product fix (BOARD_PADDING spare or overflow:visible) + fix carry-over burst leak burstTimersRef before 8-4 — same GameBoard file'
  working_tree_delta: '721bf3a (1 ahead of e4629cd) + metadata-only uncommitted diff'
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/spec-8-3-screen-shake.md` (final_revision 721bf3a, baseline e4629cd)
- **Tech Spec:** `triade/src/feel/feel.ts` (97 LOC) + `triade/src/feel/shake.ts` (81 LOC, SHAKE_CAP 8) + `triade/src/render/GameBoard.tsx:298-473` + `triade/App.tsx:+7 LOC` wiring `lastDirectionRef` before `move()`
- **PRD:** N/A (game project — PRD not needed; spec is oracle)
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-8-3-screen-shake.md` + `_bmad-output/test-artifacts/test-design-epic-8-3-screen-shake.md`
- **Traceability:** `_bmad-output/test-artifacts/traceability/traceability-matrix-8-3-screen-shake.md`, `coverage-matrix-8-3-screen-shake.json`, `gate-decision-8-3-screen-shake.json`, `e2e-trace-summary-8-3-screen-shake.json`
- **ATDD Checklist:** `_bmad-output/test-artifacts/atdd-checklist-8-3-screen-shake.md`
- **Evidence Sources:**
  - Test Results: `triade/__tests__/feel/shake.test.ts` (12 pass) + `triade/__tests__/feel/shake.atdd.test.ts` (15 pass / 2 waived RED P2-01/P2-05 + 6 carry-over) + full suite `782 tests 776 pass 5153ms 30 suites`
  - Metrics: host micro-bench 130k shake helper sweeps <200ms (actual <50ms), 10k maxShakeForTrace <100ms, per-it 0.08–0.6ms, no APM/k6 (client-only)
  - Logs: silent best-effort (no structured logs yet; overlap has no telemetry — was P1-07 gap)
  - CI Results: `triage` clean (`./node_modules/.bin/tsc --noEmit` exit 0 inside triade), `git diff --stat -- triade/src/engine` empty, `npm audit` carry-over 11 moderate transitive expo (deferred)

---

## Recommendations Summary

**Release Blocker:** None (0 FAIL). Gate is CONCERNS, not FAIL — safe for `done` with waiver, not yet `verified`.

**High Priority:** R-001 overlap without `cancelAnimation` (0.25h, one-line) must be fixed + `shake.atdd.test.ts:272` re-run until P2-01 GREEN before `verified`; P1-07 device smoke (15 min) must be signed off before `verified`; R-007 clipping product decision before 8-4. Waivers expire before 8-4 (shake adds further main-thread cost).

**Medium Priority:** Device p99 benchmark lane (`useFrameRateBaseline` after 2-min play heavy+shake) before 8-4; lint guard for FR-30 + CI gates for engine purity / single access point / capped share. Carry-over burst leak (8-2) on same file — fix together.

**Next Steps:** Address 2 high issues (cancelAnimation + device smoke + clipping decision + burst leak carry-over), re-run `nfr-assess` and `trace` after; both gates currently CONCERNS with same residuals — converge to PASS before `verified` and before Epic 8 S8.4 bullet time.

---

## Sign-Off

**NFR Evidence Audit:**

- Overall Status: CONCERNS ⚠️
- Critical Issues: 0
- High Priority Issues: 2 (R-001 score 6 overlap + R-007 score 4 clipping same cause pair, plus carry-over burst leak R-002 score 6 counted as shared file)
- Concerns: 8 (ADR criteria) / 4 category-level (Scalability/Monitorability/QoS/Deployability)
- Evidence Gaps: 4 (device p99, overlap fix, device Reduced Motion, clipping+burst carry-over)

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
