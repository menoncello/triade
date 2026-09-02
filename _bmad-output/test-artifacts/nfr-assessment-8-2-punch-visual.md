---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-09-01'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - '_bmad-output/test-artifacts/test-design-epic-8-2-punch-visual.md'
  - '_bmad-output/test-artifacts/traceability/traceability-matrix-8-2-punch-visual.md'
  - '_bmad-output/test-artifacts/traceability/gate-decision-8-2-punch-visual.json'
  - '_bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/punch.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/feel/punch.test.ts'
  - 'triade/__tests__/feel/punch.atdd.test.ts'
  - 'triade/__tests__/feel/haptics.atdd.test.ts'
  - 'triade/package.json'
  - '_bmad/tea/config.yaml'
---

# NFR Evidence Audit - 8-2 Punch Visual (Overshoot + Flash + Particles + 1536 Glow)

**Date:** 2026-09-01
**Story:** 8-2-punch-visual
**Overall Status:** CONCERNS ⚠️

---

Note: This audit summarizes existing implementation evidence; it does not run tests or CI workflows. NFR thresholds and planned evidence come from PRD, architecture, and `test-design` outputs where available. Working-tree delta is commit `ef72635` (4 ahead of origin/main) plus metadata-only uncommitted diff.

## Executive Summary

**Assessment:** 0 PASS, 5 CONCERNS, 0 FAIL (at category roll-up); at ADR checklist 21 PASS / 8 CONCERNS / 0 FAIL (29 criteria) — 72% criteria met.

**Blockers:** 0 — no FAIL; 2 waived P1/P2 expected-RED items (same bare `setTimeout(500)` cause) require fix before `verified` but do not block `CONCERNS` gate.

**High Priority Issues:** 2 — R-002 `GameBoard` burst `setTimeout(500)` bare without ref/clearTimeout on unmount (P1, score 6, waived expiry before 8-3) and R-007 same cause P2 score 4 (second signal, same fix) plus pending 15-min device smoke P1-06 and R-001 device p99.

**Recommendation:** CONCERNS → fix burst timer leak (store `setTimeout` id(s) in `burstTimer(s)Ref` + `clearTimeout` on unmount mirroring `settleTimerRef`) and run real-iPhone device smoke (3 subtle / 6 medium / 12+ flash+16 / 1536 glow + Reduced Motion ON flat + airplane + rapid-swipe orphan) before promoting to `verified`; re-run `nfr-assess` and `trace` after. Host evidence is GREEN for P0 (100% coverage/pass, tsc clean, engine byte-identical, micro-bench <200ms).

**Working-tree evidence snapshot:**
- `triade/src/feel/feel.ts` 96 LOC (`FeelPreset.overshootScale` 1.08/1.12/1.15, frozen `FEEL_PRESETS` + `REDUCED_PRESET` scale 1) + `triade/src/feel/punch.ts` 47 LOC (`punchScaleFor`/`punchDurationFor`/`shouldFlash`/`particleCountFor`/`shouldGlow`/`punchProfileFor` pure) + `triade/src/render/GameBoard.tsx:100-480` (`reducedMotion` prop, `TileDescriptor.isMerge`, `AnimatedTile` `withDelay(SLIDE_MS,withSequence(withTiming(overshootScale,overshootMs),withSpring(1)))` gated `isMerge && !reducedMotion`, `flashOpacity` worklet, `hasGlow` `#ff8c2f` 0.28, `BurstView`/`ParticleDot` 4/8/16 dots 500ms) + `triade/App.tsx:887` wiring `reducedMotion={settings.reducedMotion}` + `triade/__tests__/feel/punch.test.ts` 9 cases + `triade/__tests__/feel/punch.atdd.test.ts` 19 cases (17 PASS / 2 expected RED for R-002/R-007)
- `npm test --prefix triade` — 749 total, 745 pass / 4 fail (expected RED: 2 carry-over 8-1 R-001 2!==1 + R-006 expo-haptics dep + 2 new 8-2 R-002 bare setTimeout same cause) — duration 4906ms, 26 suites — scoped 8-2: 28 mapped 26 pass / 2 fail (P1-05/P2-01); excluding RED patterns: 745+ 17 ATDD pass
- `triade/src/engine` byte-identical (`git diff --stat -- triade/src/engine` empty — ADR-01)
- `./node_modules/.bin/tsc --noEmit` clean (no new `@ts-ignore`; `punch.ts` strictly typed)
- `triade/package.json` unchanged (expo 57.0.11, Reanimated 4.5.1, Skia 2.6.2, no `expo-haptics` — deferred per R-006 carry-over)

---

## Performance Assessment

### Response Time (p95)

- **Status:** CONCERNS ⚠️
- **Threshold:** NFR-1 + NFR-11: engine <2ms/turn, frame logic worst-case <8ms, device p99 <16.7ms (60 FPS) — NFR planning from test-design §NFR Planning (`useFrameRateBaseline` lane)
- **Actual:** Host micro-bench `punchProfileFor` sweep 130k calls <200ms (P2-02 GREEN, actual <100ms host); `presetFor` + `allPresetValues()` per-it 0.08–0.6ms (`punch.test.ts`). Device p99 with punch layer (burst+overshoot+glow concurrent with Skia Canvas) NOT measured — P1-06 / R-001 device lane pending.
- **Evidence:** `triade/__tests__/feel/punch.atdd.test.ts:329` P2-02 bench, `punch.test.ts` per-case timings, `test-design-epic-8-2-punch-visual.md` NFR Planning R-001/R-008, `GameBoard.tsx:265-283` BurstView geometry deterministic `position:absolute` + `pointerEvents:none`.
- **Findings:** Host side well within frame budget; no per-merge promise storm (pure data). Burst + overshoot adds main-thread worklet load (16 `ParticleDot` each 4 shared values + staggered `withDelay`/`withTiming` 300/340ms + `RoundedRect` glow) concurrent with Skia Canvas — may exceed p99 on mid-tier iPhones under early-input re-plan. Mitigations in place: `overshootScale≤1.2`/`particleBurst∈{0,4,8,16}` cap asserted, dots absolute, no layout thrash. Not FAIL because thresholds are deferred to Epic 8 device lane (ADR-04 two-level benchmark when 8.3 lands).

### Throughput

- **Status:** CONCERNS ⚠️
- **Threshold:** N/A backend; client frame gate is rate limiting for burst coalescence (no req/sec SLO)
- **Actual:** No k6/JMeter load run (no backend). Multi-merge policy fires per-entry (values [3,6,12] each `4/8/16` via `punchProfileFor` loop, `punch.atdd.test.ts:129` pins). No burst throttling — if device trace shows jank, limit to heaviest merge per move (test-design R-001 mitigation, product decision pending).
- **Evidence:** `punch.test.ts:85` + `punch.atdd.test.ts:129` multi-merge, `spec-8-2-punch-visual.md` I/O row "Multiple merges in one move" expects one punch per merge destination.
- **Findings:** Throughput not breached host-side; device coalescence/drop risk R-001 pending device verification.

### Resource Usage

- **CPU Usage**
  - **Status:** CONCERNS ⚠️
  - **Threshold:** Budget p99 16.7ms
  - **Actual:** No CPU profile collected; host heap trivial (3 frozen presets + `ALL_TIERS` 13 numbers + 47 LOC pure helpers). `BurstView` per-merge allocates up to 16 dots with 4 shared values each; no leak observed in 749-test burn but unmeasured on device. Burst timer leak (R-002) does not affect CPU but risks `setState on unmounted`.
  - **Evidence:** No APM; `npm test` duration 4906ms stable across runs (4996ms previous).

- **Memory Usage**
  - **Status:** PASS ✅
  - **Threshold:** N/A (client RN, no server memory SLO)
  - **Actual:** Negligible — `FEEL_PRESETS` frozen 3 entries, `ALL_TIERS` frozen 13 numbers, `punch.ts` no retention, `BurstView` auto-clears 500ms via `prev.filter(b=>!newBursts.some(nb=>nb.id===b.id))` (id-keyed, correct) but lacks unmount guard.
  - **Evidence:** Source `feel.ts:20-58` frozen objects; `GameBoard.tsx:386-392` filter by id.

### Scalability

- **Status:** CONCERNS ⚠️
- **Threshold:** Statelessness required (ADR 3.1); no horizontal scaling needed for client feature
- **Actual:** Stateless pure functions (`presetFor` frozen identity, `punchProfileFor` pure, `shouldGlow` pure). Bottleneck is burst timer leak (R-002) not scaling but stability. No circuit breaker needed — fail-fast is non-throw fallback.
- **Evidence:** `feel.ts:67-74` pure lookup, `punch.ts:6-46` stateless wrappers, `test-design` R-002/R-007 score 6/4.
- **Findings:** Scalability N/A for this delta (no server). CONCERNS only due to pending device p99 and burst leak.

---

## Security Assessment

### Authentication Strength

- **Status:** PASS ✅
- **Threshold:** N/A (no auth in feel/punch layer)
- **Actual:** N/A — punch gateway does not handle credentials, tokens, or sessions.
- **Evidence:** No auth code in `triade/src/feel/` nor `triade/src/render/GameBoard.tsx`; `spec-8-2-punch-visual.md` Boundaries: "Engine remains pure TS with no RN/expo imports"; auth out of scope per test-design Not in Scope.
- **Findings:** No exposure.

### Authorization Controls

- **Status:** PASS ✅
- **Threshold:** N/A
- **Actual:** N/A — RBAC not applicable; punch is local visual, no resource access control.
- **Evidence:** No authorization checks in `punch.ts`; `reducedMotion` deliberately not used as auth gate.
- **Recommendation:** N/A

### Data Protection

- **Status:** PASS ✅
- **Threshold:** No PII/secrets in trace; encryption N/A (client-side)
- **Actual:** No sensitive data handled; `TraceEntry` contains board coordinates and values (3..12288), no PII.
- **Evidence:** `triade/src/engine/core/types.ts` TraceEntry shape; `punch.ts` never logs values.
- **Findings:** No data protection risk.

### Vulnerability Management

- **Status:** PASS ✅
- **Threshold:** 0 critical/high (textbook; carry-over `npm audit` deferred to expo major bump per 8-1)
- **Actual:** No `npm audit` run this lane (requires lockfile) but `triade/package.json` unchanged from 8-1 (11 moderate transitive via `@expo/cli` chain per 8-1 audit — out of scope). No SAST/DAST; no new dependency (`expo-haptics` still deferred per R-006 carry-over, not introduced by 8-2). Punch introduces 0 new deps (pure TS, no import of `expo-haptics`).
- **Evidence:** `triade/package.json` deps list (no new dep), `punch.ts` imports only `./feel.ts`, `GameBoard.tsx` imports only `react-native-reanimated`/`@shopify/react-native-skia` already pinned.
- **Findings:** No new supply-chain risk. Carry-over 11 moderate remains waived pending expo 46.0.21 major bump (not blocking 8-2).

### Compliance (if applicable)

- **Status:** CONCERNS ⚠️
- **Standards:** FR-30 / UX-DR-16 (Reduced Motion gates punch visuals but keeps haptics+sound), UX-DR-27 chrome rule
- **Actual:** COMPLIANT host-side — `punchScaleFor(v,true)===1 && shouldFlash===false && particleCount===0 && shouldGlow===false` for all tiers (`punch.test.ts:47`, `punch.atdd.test.ts:89` sweep), `reducedPresetFor(12).haptic==='heavy'` preserved, `GameBoard` `AnimatedTile` gates `isMerge && !reducedMotion` for `hasGlow/hasFlash` (`punch.atdd.test.ts:213` source scan), `GameBoard.applyPlan` `isMerge:true` only inside `tr.type==='merge'` branch never for `spawn` (`punch.atdd.test.ts:213` spawn block check), `App.tsx` passes `settings.reducedMotion` into `GameBoard` (`punch.atdd.test.ts:246` check). Device confirmation pending.
- **Evidence:** `punch.ts:6-30` reduced gate, `feel.ts:92-95` reducedPresetFor preserving haptic, `GameBoard.tsx:121-124` isPunch/hasFlash/hasGlow, `punch.atdd.test.ts:P0-05` and `P1-02/P1-04` scans.
- **Findings:** Host contract PASS; overall CONCERNS until P1-06 device smoke (Reduced Motion ON flat while haptics still felt, preview chrome never punch) is signed off.

---

## Reliability Assessment

### Availability (Uptime)

- **Status:** PASS ✅ (with note)
- **Threshold:** N/A — offline-first RN app (NFR-2/NFR-6 installable + offline), no server SLA
- **Actual:** App boots offline; punch visuals are bundled worklets (Reanimated/Skia), no network fetch.
- **Evidence:** `GameBoard.tsx` imports are bundled modules, not CDN; test-design NFR table: offline/airplane mode check as device lane.
- **Findings:** No availability risk; pending airplane-mode device confirmation (P1-06).

### Error Rate

- **Status:** PASS ✅
- **Threshold:** <0.1% (textbook; not formally declared) — scoped 8-2: 26/28 = 92.9% but 2 fails are expected RED with waiver same cause, effective pass excluding waived RED is 100% for automatable surface (28/28 scoped non-waived = 100%); full suite 745/749 = 99.47% (4 waived 0.53%) excluding waived is 100% for new surface.
- **Actual:** 0 unhandled throws on punch path; `punchProfileFor(NaN/Infinity/-5)` + `shouldGlow(NaN)` never throw (`punch.test.ts:77`, `punch.atdd.test.ts:114` sweeps), `presetFor` fallback light, `GameBoard.applyPlan` silent no-op on empty plan.
- **Evidence:** `punch.ts:26-30` `shouldGlow` non-finite guard, `feel.ts:67-74` non-finite fallback, `npm test` 745 pass excluding EXPECTED RED.

### MTTR (Mean Time To Recovery)

- **Status:** CONCERNS ⚠️
- **Threshold:** UNKNOWN (no incident SLI)
- **Actual:** No incident data; recovery from punch failure is instant (silent no-op, gameplay continues, move not blocked). Detection MTTR is gap: burst leak has no telemetry, only ATDD pins.
- **Evidence:** No incident reports; `traceability/gate-decision-8-2-punch-visual.json` notes burst leak R-002/R-007 without Crashlytics signal.
- **Findings:** MTTR 0 for user (no crash), but detection MTTR UNKNOWN pending burst timer fix + import-failure telemetry (if ever needed).

### Fault Tolerance

- **Status:** PASS ✅
- **Threshold:** Never-throw guarantee (engine-never-throws extended to feel+punch)
- **Actual:** PASS — `presetFor(NaN/Infinity/-1/0) -> light` fallback, `punchProfileFor(NaN)` never throw, `shouldGlow(NaN)===false`, `GameBoard.applyPlan` guards empty plan, `BurstView` filters by id. `AnimatedTile` `isPunch` false fallback when not merge.
- **Evidence:** `punch.test.ts:77,96`, `punch.atdd.test.ts:114,148`, `punch.ts:26-30`, `feel.ts:67-74`.
- **Findings:** Fault tolerance is strongest NFR for this story (pure helpers + frozen presets).

### CI Burn-In (Stability)

- **Status:** CONCERNS ⚠️
- **Threshold:** Informational (no formal burn-in gate; textbook suggests 100 consecutive green as strong signal)
- **Actual:** Single `npm test` run 745/749 (99.47%) with 4 waived RED (2 carry-over 8-1 + 2 new 8-2 same cause); 0 flaky detected. No nightly soak; no 100-run burn. P0 suite deterministic (mulberry32 seeded, `allPresetValues()` sweep).
- **Evidence:** `gate-decision-8-2-punch-visual.json` criteria `flaky_tests:0`, `npm test` duration 4906ms, `punch.atdd.test.ts:329` perf bench deterministic.
- **Findings:** Stable single run; CONCERNS only because formal burn-in not executed — not a blocker for small delta.

### Disaster Recovery (if applicable)

- **RTO (Recovery Time Objective)**
  - **Status:** PASS ✅ (N/A)
  - **Threshold:** N/A — client stateless, no data loss
  - **Actual:** N/A
  - **Evidence:** No persistence in punch layer; game state via `src/services/storage` not touched.

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
- **Actual:** AC coverage 100% (6/6 FULL) per `traceability-matrix-8-2-punch-visual.md`; critical punch paths 3/6/12+/1536/NOOP+Reduced Motion+chrome guard all covered host-side (9 punch.test + 17 non-RED ATDD). No `lcov`/`c8` line % collected — `coverage/` report not generated in this run (node:test, no c8 gate, consistent with 7.x/8-1 precedent). Scoped pass 92.9% (26/28) with 2 waived RED accounted as coverage FULL but execution RED.
- **Evidence:** `traceability-matrix-8-2-punch-visual.md` coverage table, `coverage-matrix-8-2-punch-visual.json`, `npm test` 28 mapped cases.
- **Findings:** AC coverage excellent; line-coverage metric is the gap. Recommend adding `c8` lane if CI wants line % for maintainability gate (backlog).

### Code Quality

- **Status:** PASS ✅
- **Threshold:** `./node_modules/.bin/tsc --noEmit` clean, no scattered literals outside single access point, frozen presets, no hardcoded burst scales in punch/board
- **Actual:** `tsc` clean (exit 0, no new `@ts-ignore`; `punch.ts` strictly typed). `FEEL_PRESETS` frozen, `presetFor` pure, `punch.ts` thin wrappers over `presetFor` (no duplicate tier branching, `punch.atdd.test.ts:363` gate P2-05 GREEN), `GameBoard` never hardcodes `1.08/1.12/1.15` (P2-05 GREEN), `hasGlow` single `#ff8c2f` inside branch (P2-03 GREEN). No SonarQube but code is small (96+47 LOC new punch infra, 154 LOC board), frozen presets, 0 duplication.
- **Evidence:** `feel.ts:20-45` frozen presets, `punch.atdd.test.ts:355` P2-04 engine purity + `363` P2-05, `tsc` clean.

### Technical Debt

- **Status:** PASS ✅
- **Threshold:** <5% debt ratio (textbook)
- **Actual:** Low — 2 new modules (feel.ts delta + punch.ts), 143 LOC new, no engine duplication, no copy-paste, `FEEL_PRESETS` single source for 8.3–8.6 reuse. Debt items are the 2 waived residuals (R-002/R-007 bare setTimeout) with expiry before 8-3 (one fix).
- **Evidence:** `spec-8-2-punch-visual.md` Residual risks, `test-design` R-001..R-010 list, `gate-decision-8-2-punch-visual.json` residual_risks.
- **Findings:** No structural debt.

### Documentation Completeness

- **Status:** PASS ✅
- **Threshold:** Spec + test-design + traceability present
- **Actual:** Spec `spec-8-2-punch-visual.md` (intent/boundaries/I-O matrix/Code Map/Tasks/Verification/Auto Run Result), epic context `epic-8-context.md`, test-design `test-design-epic-8-2-punch-visual.md` (10 risks, NFR planning, coverage plan), traceability matrix + gate decision + coverage matrix, ATDD checklist `atdd-checklist-8-2-punch-visual.md`, automation summary. All linked in gate decision `links` block.
- **Evidence:** `_bmad-output/implementation-artifacts/` and `_bmad-output/test-artifacts/` file list.

### Test Quality (from test-review, if available)

- **Status:** PASS ✅
- **Threshold:** Host fixtures over real engine traces (not stubs)
- **Actual:** Host fixtures use real `MoveResult.trace` from `newGame(mulberry32)` + `move` (P1-01), `GameBoard` source-structure gates for `isMerge` (P1-02), `App.tsx` wiring via grep gate (P1-04), edge sweeps for non-finite/NOOP/multi-merge, perf bench deterministic. No Playwright needed (correctly scoped to Unit per test-levels framework).
- **Evidence:** `punch.atdd.test.ts:170,213,228,246`, `punch.test.ts` sweep invariants (`overshootScale<=1.2`).

---

## Custom NFR Evidence Audits (if applicable)

No custom categories beyond the 8 ADR checklist categories; client Offline/Installability (NFR-2/NFR-6) covered under Availability (PASS with pending airplane device check). `1536+` glow only-glow invariant is covered under Maintainability (P2-03) + Compliance (R-005).

---

## Quick Wins

2 quick wins identified for immediate implementation:

1. **Fix burst timer leak — store `setTimeout` in ref + clear on unmount** (Reliability) - HIGH - 0.25h - FE
   - In `GameBoard.tsx:386-392` replace bare `setTimeout(()=>setBursts(filter by id),500)` with `burstTimersRef: Set<ReturnType<typeof setTimeout>>` stored id(s) and `useEffect` return that clears all pending timers on unmount, mirroring `settleTimerRef` at `GameBoard.tsx:321-326`. One fix clears both `punch.atdd.test.ts:269` P1-05 and `314` P2-01. Keep `prev.filter(b=>!newBursts.some(nb=>nb.id===b.id))` id-keyed logic.

2. **Add FR-30 comment + lint guard for punch gating** (Compliance/Maintainability) - LOW - 0.25h - FE lead
   - Add comment `// FR-30: punch gated — haptics stay` above `GameBoard.tsx:121` `isPunch` and `punch.ts` reduced gate; add CI grep gate `rg "reducedMotion" src/feel --glob '!punch.ts'` fails if leaked (test-design R-003 mitigation). Ensures 8-5 Reduced Motion umbrella does not regress punch.

---

## Recommended Actions

### Immediate (Before Release) - CRITICAL/HIGH Priority

1. **Fix R-002/R-007 burst timer leak** - HIGH - 0.5h - FE
   - Store `setTimeout(500)` id(s) in `burstTimersRef` and clear on `GameBoard` unmount; guard `setBursts` with mounted ref if needed; verify rapid-swipe combo (2-3 sequential merges within 500ms) shows no off-grid orphans and host test that `setBursts` not called after unmount. Re-run `punch.atdd.test.ts` until 19/19 GREEN.

2. **Run 15-min real-iPhone device smoke P1-06** - HIGH - 0.25h - PR author / QA
   - In Expo dev build on real iPhone (SDK 57, Skia+Reanimated 4, no Simulator punch): trigger 3→subtle punch, 6→medium, 12+→flash+16 particles, 1536+→glow (only glow), each in portrait+landscape; toggle Reduced Motion ON → repeat heavy+glow: flat (scale=1 no overshoot, no flash/particles/glow) while haptics still felt; preview/score never animate; airplane mode; rapid swipes during burst window → no orphan bursts. Record sign-off checkbox in PR description.

3. **Resolve carry-over 8-1 waivers before verified** - HIGH - 1-2h - FE / QA / UX
   - R-001 tutorial 1+2→3 double Light (dedup decision) and R-006 expo-haptics missing from package.json remain waived per `spec-8-2-punch-visual.md:Review Triage`; do not re-block 8-2 but track remediation before 8-3/8-5 review per `gate-decision-8-2-punch-visual.json` recommendations.

### Short-term (Next Milestone) - MEDIUM Priority

1. **Add device p99 benchmark lane for R-001** - MEDIUM - 1h - QA / FE
   - Run `useFrameRateBaseline` stats after 2-min play with 10+ merges including heavy+glow on real iPhone; capture `fps`/`p99Ms`/`frames` and fail if `p99Ms>16.7ms`. Keep `BurstView` `position:absolute` + `pointerEvents:none` and caps `overshootScale≤1.2`/`particleBurst∈{0,4,8,16}` asserted. Required before 8-3 (shake adds further main-thread cost).

2. **Keep CI guard rails** - MEDIUM - 0.5h - DEV/CI
   - Enforce `git diff --stat -- triade/src/engine` empty (ADR-01), `rg "1\.08|1\.12|1\.15" src/feel --glob '!feel.ts'` fails if scattered, single `#ff8c2f` inside `hasGlow` branch check (`P2-03`), `punch.ts` delegates to `presetFor` (P2-05), `App` wiring gate for `reducedMotion={settings.reducedMotion}`. All host gates, keep in PR checks for 8.3-8.6.

### Long-term (Backlog) - LOW Priority

1. **Add c8/nyc coverage lane and jscpd duplication check** - LOW - 1-2h - DEV/CI
   - Generate `coverage/lcov-report` for maintainability gate (80% target) and jscpd for <5% duplication — not required for this small delta but useful for Epic 8 full feel preset (8.3-8.6).

2. **Evaluate PWA/web no-op lane** - LOW - 0.5h - QA
   - Web build has no haptics/punch worklets; assert silent no-op only — not gating.

---

## Monitoring Hooks

4 monitoring hooks recommended to detect issues before failures:

### Performance Monitoring

- [ ] Host micro-bench lane (CI) - Fail CI if `punchProfileFor` sweep >200ms for 130k calls or `presetFor` per-it >2ms
  - **Owner:** DEV / CI
  - **Deadline:** 8-3 review

- [ ] Device frame stats lane (`useFrameRateBaseline`) - Track `fps`/`p99Ms`/`frames` after 2-min play with 10+ merges including one heavy (12+) and one 1536+ glow; alert if p99 >16.7ms
  - **Owner:** QA / FE
  - **Deadline:** Epic 8 device benchmark (ADR-04 two-level benchmark when 8.3 lands)

### Security Monitoring

- [ ] No security runtime monitoring needed this story (client-only visual) — keep `npm audit` + `expo-doctor` as periodic gate (carry-over 11 moderate transitive expo)
  - **Owner:** FE lead / CI
  - **Deadline:** 8-3 review

### Reliability Monitoring

- [ ] Burst leak dev-build warning (optional) - Log once when burst `setTimeout` fires after `GameBoard` unmount (stale closure) or when `pixel(tr.to)` outside grid bounds (orphan detection)
  - **Owner:** FE
  - **Deadline:** 8-2 follow-up / 8-3

### Alerting Thresholds

- [ ] Burst orphan rate - Notify when rapid-swipe combo video shows off-grid particles after fix (indicates `idPool` uniqueness regression)
  - **Owner:** QA
  - **Deadline:** after fix

---

## Fail-Fast Mechanisms

3 fail-fast mechanisms recommended to prevent failures:

### Circuit Breakers (Reliability)

- [ ] Not needed — `punchProfileFor`/`shouldGlow` already fail-fast via non-finite guard (`shouldGlow(NaN)===false`) and `presetFor` fallback light; `GameBoard.applyPlan` silent no-op on empty plan. Keep as-is; do not add retry loop (visual is best-effort).

### Rate Limiting (Performance)

- [ ] Optional burst coalescence debounce for multi-merge — If R-001 device trace shows jank with 16-particle bursts concurrent with Skia Canvas + overshoot spring, debounce to collapse N merges in one move to heaviest only (e.g., 3+6+12 → single Heavy burst). Owner: FE, Effort: 1h, gated by device p99 feedback from `useFrameRateBaseline`.

### Validation Gates (Security)

- [ ] Input guard is already the validation gate — `presetFor` fallback light for non-finite/<3, `punchProfileFor` never throws, `GameBoard` `isMerge` gating (`type==='merge'` iff `from.length===2 && !spawned` per `transitionPlan.ts:classify`) + chrome guard. No additional gate needed.

### Smoke Tests (Maintainability)

- [ ] Device smoke checklist P1-06 as PR gate — must be ticked before merge to verified (15 min). Owner: PR author.

---

## Evidence Gaps

3 evidence gaps identified - action required:

- [ ] **Performance - device p99 <16.7ms with punch layer** (Performance)
  - **Owner:** QA / FE
  - **Deadline:** Before 8-3 verified (15-min device lane + benchmark)
  - **Suggested Evidence:** `useFrameRateBaseline` log `fps`/`p99Ms`/`frames` after 2-min play with 10+ merges on real iPhone dev build SDK 57 (including heavy+glow)
  - **Impact:** Cannot claim 60 FPS budget met without device data; host <200ms is not sufficient for frame guarantee (R-001 score 6).

- [ ] **Reliability - Burst timer cleanup on unmount** (Reliability)
  - **Owner:** FE
  - **Deadline:** Before 8-3 (immediate)
  - **Suggested Evidence:** `GameBoard.tsx` stores burst `setTimeout(500)` id(s) in `burstTimersRef` + `useEffect` cleanup clears on unmount; `punch.atdd.test.ts:269` P1-05 and `314` P2-01 turn GREEN; rapid-swipe combo video shows no off-grid orphans
  - **Impact:** `setState on unmounted component` warning + orphan bursts at stale `pixel(tr.to)` on rapid re-plan (R-002/R-007).

- [ ] **Compliance - Device Reduced Motion verification** (Compliance)
  - **Owner:** QA / PR author
  - **Deadline:** Before verified (device smoke)
  - **Suggested Evidence:** iOS Settings → Accessibility → Motion → Reduce Motion ON → repeat heavy+glow merges: confirm flat (scale=1 no overshoot, no flash/particles/glow) while haptics still felt; preview chrome never punch
  - **Impact:** Without device pass, FR-30 a11y/App Store compliance is host-only (P0-05 green) but not user-verified.

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

**This delta: 21/29 (72%) — Room for improvement; no FAIL. Gaps are evidence/monitoring + device lanes, not functional defects. Scoped AC gate is 100% coverage / 92.9% pass (waived REDs) / 99.47% full suite.**

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-09-01'
  story_id: '8-2-punch-visual'
  feature_name: '8-2 Punch visual — overshoot+flash+particles+1536 glow (Epic 8, S8.2)'
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
  high_priority_issues: 1
  medium_priority_issues: 1
  concerns: 8
  blockers: false # true/false
  quick_wins: 2
  evidence_gaps: 3
  recommendations:
    - 'Fix R-002/R-007 burst timer leak (burstTimersRef + clearTimeout on unmount) before 8-3 — one fix clears P1-05 & P2-01'
    - 'Run 15-min real-iPhone device smoke P1-06 (3/6/12+/1536 + Reduced Motion ON flat + airplane + rapid-swipe orphan) and sign off in PR'
    - 'Add device p99 benchmark lane (useFrameRateBaseline 2-min play with heavy+glow) before 8-3 — host <200ms not sufficient for 60 FPS claim'
  working_tree_delta: 'ef72635 (4 ahead of origin/main) + metadata-only uncommitted diff'
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md` (final_revision punch-visual-8-2, baseline 7604cd1)
- **Tech Spec:** `triade/src/feel/feel.ts` (96 LOC) + `triade/src/feel/punch.ts` (47 LOC) + `triade/src/render/GameBoard.tsx:100-480` + `triade/App.tsx:887` wiring `settings.reducedMotion`
- **PRD:** N/A (game project — PRD/D not needed; spec is oracle)
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md` + `_bmad-output/test-artifacts/test-design-epic-8-2-punch-visual.md`
- **Traceability:** `_bmad-output/test-artifacts/traceability/traceability-matrix-8-2-punch-visual.md`, `coverage-matrix-8-2-punch-visual.json`, `gate-decision-8-2-punch-visual.json`, `e2e-trace-summary-8-2-punch-visual.json`
- **ATDD Checklist:** `_bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual.md`
- **Evidence Sources:**
  - Test Results: `triade/__tests__/feel/punch.test.ts` (9 pass) + `triade/__tests__/feel/punch.atdd.test.ts` (17 pass / 2 waived RED) + `triade/__tests__/feel/haptics.atdd.test.ts` 2 carry-over RED + full suite `749 tests 745 pass 4906ms 26 suites`
  - Metrics: host micro-bench 130k `punchProfileFor` <200ms (actual <100ms), per-it 0.08–0.6ms, no APM/k6 (client-only)
  - Logs: silent best-effort (no structured logs yet; burst leak has no telemetry — was P1-05 gap)
  - CI Results: `triage` clean (`./node_modules/.bin/tsc --noEmit` exit 0), `git diff --stat -- triade/src/engine` empty, `npm audit` carry-over 11 moderate transitive expo (deferred)

---

## Recommendations Summary

**Release Blocker:** None (0 FAIL). Gate is CONCERNS, not FAIL — safe for `done` with waiver, not yet `verified`.

**High Priority:** R-002/R-007 burst timer leak (0.25h, one fix) must be fixed + `punch.atdd.test.ts` re-run until 19/19 GREEN before `verified`; P1-06 device smoke (15 min) must be signed off before `verified`. Waivers expire before 8-3 (shake adds `tilesRef` mutation under re-plan — same surface).

**Medium Priority:** Device p99 benchmark lane (`useFrameRateBaseline` after 2-min play heavy+glow) before 8-3; lint guard for FR-30 + CI gates for engine purity / single access point / only-glow.

**Next Steps:** Address 2 high issues (burst fix + device smoke), re-run `nfr-assess` and `trace` after; both gates currently CONCERNS with same residuals — converge to PASS before `verified` and before Epic 8 S8.3.

---

## Sign-Off

**NFR Evidence Audit:**

- Overall Status: CONCERNS ⚠️
- Critical Issues: 0
- High Priority Issues: 1 (R-002 score 6) + 1 medium (R-007 score 4 same cause) — counted as 1 unique fix
- Concerns: 8 (ADR criteria) / 4 category-level (Scalability/Monitorability/QoS/Deployability)
- Evidence Gaps: 3 (device p99, burst cleanup, device Reduced Motion)

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
