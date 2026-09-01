---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-09-01'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-4-bullet-time.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-4-bullet-time.md'
  - '_bmad-output/test-artifacts/test-design-epic-8-4-bullet-time.md'
  - '_bmad-output/test-artifacts/traceability/traceability-matrix-8-4-bullet-time.md'
  - '_bmad-output/test-artifacts/traceability/coverage-matrix-8-4-bullet-time.json'
  - '_bmad-output/test-artifacts/traceability/gate-decision-8-4-bullet-time.json'
  - '_bmad-output/test-artifacts/atdd-checklist-8-4-bullet-time.md'
  - 'triade/src/feel/bulletTime.ts'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/game/matchOrchestrator.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/feel/bulletTime.test.ts'
  - 'triade/__tests__/feel/bulletTime.atdd.test.ts'
  - 'triade/package.json'
  - '_bmad/tea/config.yaml'
---

# NFR Evidence Audit - 8-4 Bullet Time (Rarity-Gated 200ms Flash, Snapshot-Rewind, Reduced Motion Gated)

**Date:** 2026-09-01
**Story:** 8-4-bullet-time
**Overall Status:** CONCERNS ⚠️

---

Note: This audit summarizes existing implementation evidence; it does not run tests or CI workflows. NFR thresholds and planned evidence come from PRD, architecture, and `test-design` outputs where available. Working-tree delta is commit `0e2717e` (`feat: 8-4 bullet time — rarity-gated 200ms flash on new session-best`) — 1 commit ahead of `590e461` (baseline `e4629cd`/`590e461` for epic 8). The current uncommitted diff is metadata-only (`_bmad-output/implementation-artifacts/sprint-status.yaml` `8-4-bullet-time: backlog→done`); the assessed production change is the committed `0e2717e` delta.

## Executive Summary

**Assessment:** 0 PASS, 4 CONCERNS, 0 FAIL (at category roll-up); at ADR checklist 21 PASS / 8 CONCERNS / 0 FAIL (29 criteria) — 72% criteria met.

**Blockers:** 0 — no FAIL; 2 waived P2 expected-RED items for this story (same deferred-work cause pair: R-007 overlapping bullet truncation without `cancelAnimation` score 4 + R-010 board width NaN guard score 2) plus 6 carry-over waived RED from 8-1/8-2/8-3 (tutorial dedup, expo-haptics, burst leak, shake overlap/clipping) require fix before `verified` but do not block `CONCERNS` gate.

**High Priority Issues:** 1 — R-007 overlapping bullet concurrency without `cancelAnimation(bulletFlash)` (P2 score 4, deferred before 8-5, ATDD signal `bulletTime.atdd.test.ts:363` P2-01) plus pending 15-min device smoke P1-07 and R-007 device p99. Carry-over shake R-001 (cancelAnimation for shake) and burst leak R-002/R-007 from 8-2 (P1 score 6 / P2 score 4, same `setTimeout(500)` cause) remain unfixed in this delta (GameBoard still bears shake + burst layers). R-003 spawned-undefined/value<3 deferred lows compound trace contract risk but are not high.

**Recommendation:** CONCERNS → add `cancelAnimation(bulletFlash)` before each new `withSequence` (one-line, keeps 200 ms budget) and run real-iPhone device smoke (0→3 flash 200ms first merge, 3→no flash when best 6, 6→flash when best 3, 12→flash, each portrait+landscape, Reduced Motion ON flat while haptics stay, NOOP flat, preview chrome never flashes, undo after 12 → redo same 12 re-flashes, rapid-swipe combo within 84–200 ms shows no freeze) before promoting to `verified`; decide width guard product fix (`Number.isFinite(width)` guard vs accepted deferred) in same pass. Re-run `nfr-assess` and `trace` after. Waivers expire before 8-5 (bullet+shake+punch compound).

**Working-tree evidence snapshot:**
- `triade/src/feel/bulletTime.ts` 66 LOC (pure, no RN imports, `BULLET_TIME_MS=200` datum, `maxMergeValue`/`isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest` pure, `Number.isFinite` + `try/catch` never-throw, `!spawned && from.length===2 && finite value` board-only filter, wraps no fixed-step loop) + `triade/src/feel/feel.ts` +2 LOC comment (frozen `PRESET_LIGHT/MEDIUM/HEAVY` + `REDUCED_PRESET` intact, defensive bullet datum comment) + `triade/src/game/matchOrchestrator.ts` +1 LOC (`Snapshot.sessionBestMerge?: number` optional for migration) + `triade/App.tsx` +48−33 LOC (new `sessionBestMerge: number` state init `0`, `Snapshot` extended, `doMove` captures snapshot before `move()`, functional `setSessionBestMerge(prev=>nextSessionBest(trace,prev))` avoiding stale closure under `EARLY_INPUT_MS≈84ms`, reset `0` on `handleRestart`+lane switch `applyLaneSelection`+`lastDirectionRef` clear, restore on 7 sites with `Number.isFinite(snap.sessionBestMerge) ? snap.sessionBestMerge : 0` guard, threaded `sessionBestMerge` + `settings.reducedMotion` into `GameBoard`) + `triade/src/render/GameBoard.tsx` +43−1 LOC (`sessionBestMerge?` prop, `bulletFlash` shared value + `bulletFlashStyle` opacity, `withSequence(withTiming(0.45,60), withTiming(0,BULLET_TIME_MS-60))` ≈200ms on `Animated.View` overlay `position:absolute` board-only `#fff7e0` `width×width` `borderRadius:14`, gated `moveResult.moved && !reducedMotion && shouldTriggerBulletTime(trace, safeBest, !!reducedMotion)` with `safeBest` guard, Reduced Motion mid-animation snap `withTiming(0,20)` on `bulletFlash` alongside shake, `try/catch` never-throw, deps include `sessionBestMerge`) + `triade/__tests__/feel/bulletTime.test.ts` 9 cases (P0) + `triade/__tests__/feel/bulletTime.atdd.test.ts` 21 cases (19 PASS / 2 expected RED `P2-01`/`P2-05` deferred)
- `npm test --prefix triade -- __tests__/feel/bulletTime.test.ts __tests__/feel/bulletTime.atdd.test.ts` — 30 tests 28 pass / 2 fail (both EXPECTED RED with waiver: `bulletTime.atdd.test.ts:363` P2-01 cancelAnimation + `448` P2-05 width guard) — duration ~167ms host — full suite ~812 total, 804 pass / 8 fail (6 carry-over 8-1/8-2/8-3 + 2 new 8-4) — 99.01% scoped non-waived; P0 9/9 100% GREEN (`bulletTime.test.ts`), P1 6/6 100% GREEN (ATDD P1-01..P1-06), host smoke `feel.test.ts` 12/12 + `shake.test.ts` 12/12 + `punch.test.ts` 8/8 GREEN
- `triade/src/engine` byte-identical (`git diff --stat -- triade/src/engine` empty — ADR-01); `git diff 590e461..0e2717e --stat` shows only bullet files above + spec + deferred-work (8 files)
- `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean (exit 0, no new `@ts-ignore`; `bulletTime.ts` strictly typed `readonly TraceEntry[]`, no RN import) + `tsconfig.test.json` clean
- `triade/package.json` unchanged (expo ~57.0.11, Reanimated 4.5.1, Skia 2.6.2, no `expo-haptics` — deferred per 8-1 R-006 carry-over, bullet adds 0 new deps)
- `grep -R "BULLET_TIME_MS" triade/src` allowlist is `bulletTime.ts` + `GameBoard.tsx` + `feel.ts` comment (P2-03 + P1-06 GREEN); `grep -R "from.length===2" triade/src` hits `bulletTime.ts` comment + `matchStats.ts` comments + `haptics.ts` comment (engine itself uses classified trace, not string scan — purity gate holds via `git diff --stat -- triade/src/engine` empty)

---

## Performance Assessment

### Response Time (p95)

- **Status:** CONCERNS ⚠️
- **Threshold:** NFR-1 + NFR-11: engine <2ms/turn, frame logic worst-case <8ms, device p99 <16.7ms (60 FPS) — NFR planning from test-design §NFR Planning (`useFrameRateBaseline` lane). Bullet budget: `200 ms` total `60+140` withSequence on board container `Animated.View` concurrent with Skia Canvas + Reanimated main-thread worklets + 8-2 punch `120ms` overshoot+particles + 8-3 shake `130ms` if two heavies stack. `BULLET_TIME_MS 200` is max pixel time; must not delay game logic (no fixed-step loop). `EARLY_INPUT_MS≈84 ms` budget respected; bullet must not push p99.
- **Actual:** Host micro-bench `maxMergeValue` + `isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest` + `BULLET_TIME_MS` sweep 10k×4 = 40k calls <200ms (ATDD P2-02 GREEN, actual 10k sweeps measured <50ms host; `presetFor` + `allPresetValues()` per-it 0.05–0.5ms in `bulletTime.test.ts` pattern). Device p99 with bullet layer concurrent with Canvas NOT measured — P1-07 / R-007 device lane pending.
- **Evidence:** `triade/__tests__/feel/bulletTime.atdd.test.ts:372` P2-02 bench (`10k sweeps <<500ms` + `BULLET_TIME_MS 200` + no `setTimeout`/`setInterval`), `bulletTime.test.ts` per-case timings 0.07–0.54ms, `test-design-epic-8-4-bullet-time.md` NFR Planning R-007/R-003/R-004, `GameBoard.tsx:307-318` bullet worklet geometry deterministic `Animated.View` + `withSequence`/`withTiming` 200ms + `BULLET_TIME_MS-60` derived.
- **Findings:** Host side well within frame budget; no per-merge promise storm (single bullet per `moveResult` via `maxMergeValue` max-wins, not stacked — P0-05 GREEN). Optimised mitigations in place: `BULLET_TIME_MS 200` asserted single-source via `GameBoard` `BULLET_TIME_MS-60` + `safeBest` Number.isFinite guard, board-only `width×width` overlay `pointerEvents:none` no layout thrash, `try/catch` never-throw. Bullet + shake + punch concurrent load (bullet 200ms on `opacity` + shake 130ms on `translateX/Y` + punch overshoot spring + up to 16 `ParticleDot` 300/340ms) may exceed p99 on mid-tier iPhones under early-input re-plan at 84ms — not FAIL because thresholds are deferred to Epic 8 device lane (ADR-04 two-level benchmark when 8-6 lands). Overlap artefact R-007 without `cancelAnimation(bulletFlash)` is mild jank (truncated first flash, last wins), not functional failure; carry-over shake overlap same class.

### Throughput

- **Status:** CONCERNS ⚠️
- **Threshold:** N/A backend; client frame gate is rate limiting for bullet coalescence (no req/sec SLO)
- **Actual:** No k6/JMeter load run (no backend). Multi-merge policy fires single bullet `max wins` (trace `[3→2, 12→5]` → `max 12` triggers one `200ms`, `[3,6]→12` false via `maxMergeValue` loop, `bulletTime.test.ts:62` + `bulletTime.atdd.test.ts:93` pins). No bullet throttling beyond single `withSequence` per `moveResult` effect (not per `plan` entry) — if device trace shows jank, coalescence fix is `cancelAnimation(bulletFlash)` before new `withSequence` (test-design R-007 mitigation, product decision pending). Throughput is frame-bound, not request-bound.
- **Evidence:** `bulletTime.test.ts:62` + `bulletTime.atdd.test.ts:93` multi-merge max wins, `spec-8-4-bullet-time.md` I/O row "Multiple merges in one move" expects one bullet driven by max.
- **Findings:** Throughput not breached host-side; device coalescence/drop risk R-007 pending device verification (see P2-01 expected RED). Functional `setSessionBestMerge(prev=>nextSessionBest(...))` mitigates EARLY_INPUT race but `doMove` deps still include `sessionBestMerge` invalidating closure identity (deferred R low, same as shake 8-3 R-006).

### Resource Usage

- **CPU Usage**
  - **Status:** CONCERNS ⚠️
  - **Threshold:** Budget p99 16.7ms
  - **Actual:** No CPU profile collected; host heap trivial (66 LOC pure helpers, 3 frozen presets + `BULLET_TIME_MS` const, 1 shared value `bulletFlash` + `bulletFlashStyle`). `GameBoard` bullet per-move allocates one `withSequence` chain (2 `withTiming` segments `60`+`140`) + `safeBest` guard; no leak observed in 30-test host run but unmeasured on device. Overlap without `cancelAnimation` risks truncated flash (R-007) not CPU leak. Burst timer leak R-002 from 8-2 still present (unrelated to bullet but same `GameBoard` host) does not affect CPU but risks `setState on unmounted`.
  - **Evidence:** No APM; `npm test` for bullet ATDD 167ms stable; full suite 812 coverage `99.01%`.

- **Memory Usage**
  - **Status:** PASS ✅
  - **Threshold:** N/A (client RN, no server memory SLO)
  - **Actual:** Negligible — `BULLET_TIME_MS` const, `bulletTime.ts` stateless pure helpers, `GameBoard` bullet stores only 1 shared value + `bulletFlashStyle` memo; no accumulation. Orthogonal to burst layer which auto-clears 500ms but lacks unmount guard (carry-over).
  - **Evidence:** Source `bulletTime.ts:7-66` stateless; `GameBoard.tsx:307-309` `useSharedValue(0)` for bullet.

### Scalability

- **Status:** CONCERNS ⚠️
- **Threshold:** Statelessness required (ADR 3.1); no horizontal scaling needed for client feature
- **Actual:** Stateless pure functions (`BULLET_TIME_MS` const, `maxMergeValue`/`isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest` pure, `sessionBestMerge` state in App is per-session ephemeral, no persistence). Bottleneck is overlap R-007 (single device) not scaling but stability; no circuit breaker needed — fail-fast is non-throw fallback. Cap is `BULLET_TIME_MS 200` via single source, no layout thrash.
- **Evidence:** `bulletTime.ts:9-66` stateless wrappers with try/catch, `test-design` R-007 score 4 / R-003 score 6.
- **Findings:** Scalability N/A for this delta (no server). CONCERNS only due to pending device p99 and R-007 overlap + carry-over shake/burst residuals.

---

## Security Assessment

### Authentication Strength

- **Status:** PASS ✅
- **Threshold:** N/A (no auth in feel/bullet layer)
- **Actual:** N/A — bullet gateway does not handle credentials, tokens, or sessions.
- **Evidence:** No auth code in `triade/src/feel/` nor `triade/src/render/GameBoard.tsx`; `spec-8-4-bullet-time.md` Boundaries: "Engine remains pure TS with no RN/Reanimated/Skia imports (ADR-01)"; auth out of scope per test-design Not in Scope.
- **Findings:** No exposure.

### Authorization Controls

- **Status:** PASS ✅
- **Threshold:** N/A
- **Actual:** N/A — RBAC not applicable; bullet is local visual, no resource access control.
- **Evidence:** No authorization checks in `bulletTime.ts`; `reducedMotion` deliberately not used as auth gate.
- **Recommendation:** N/A

### Data Protection

- **Status:** PASS ✅
- **Threshold:** No PII/secrets in trace; encryption N/A (client-side)
- **Actual:** No sensitive data handled; `TraceEntry` contains board coordinates and values (3..12288), no PII.
- **Evidence:** `triade/src/engine/core/types.ts` TraceEntry shape; `bulletTime.ts` never logs values.
- **Findings:** No data protection risk.

### Vulnerability Management

- **Status:** PASS ✅
- **Threshold:** 0 critical/high (textbook; carry-over `npm audit` deferred to expo major bump per 8-1)
- **Actual:** No `npm audit` run this lane (requires lockfile) but `triade/package.json` unchanged from 8-1 (11 moderate transitive via `@expo/cli` chain per 8-1 audit — out of scope). No SAST/DAST; no new dependency (bullet adds 0 new deps, uses pinned `react-native-reanimated` + `@shopify/react-native-skia` already in 8-1/8-2). No new supply-chain risk beyond carry-over.
- **Evidence:** `triade/package.json` deps list (no new dep), `bulletTime.ts` imports only `./feel.ts` type + `../engine/core/types.ts`, `GameBoard.tsx` imports only `react-native-reanimated`/`@shopify/react-native-skia` already pinned.
- **Findings:** No new supply-chain risk. Carry-over 11 moderate remains waived pending expo major bump (not blocking 8-4).

### Compliance (if applicable)

- **Status:** CONCERNS ⚠️
- **Standards:** FR-30 / UX-DR-16 (Reduced Motion gates all bullet visuals but keeps haptics+sound), UX-DR-27 chrome rule (board only, never preview/score), datum cap `BULLET_TIME_MS 200` never exceeds without data change
- **Actual:** COMPLIANT host-side — `shouldTriggerBulletTime(trace,best,true)===false` for all tiers while `nextSessionBest` still advances (`bulletTime.test.ts:53`, `bulletTime.atdd.test.ts:77` P0-04 sweep), `reducedPresetFor(12).haptic==='heavy'` preserved (haptics stay), `GameBoard` bullet gated `if (moveResult.moved && !reducedMotion && shouldTriggerBulletTime(trace, safeBest, !!reducedMotion))` + else no animation + `useEffect` mid-flight snap `bulletFlash withTiming(0,20)` (`bulletTime.atdd.test.ts:272` P1-04 source scan), `bulletTime.ts` never touches `haptics.ts` (FR-30: bullet gated, haptics not), `GameBoard` `Animated.View` bullet overlay is sibling of `Animated.View` wrapping `Canvas` board-only (never chrome — `bulletTime.atdd.test.ts:294` P1-05: `Hud`/`PreviewCard` never imported, `bulletFlashStyle` only on overlay `#fff7e0`, `Canvas` inside `Animated.View`), datum `200` respects cap via `BULLET_TIME_MS` single source + `BULLET_TIME_MS-60` derived (`bulletTime.atdd.test.ts:393` P2-03 + `240` P1-03). Device confirmation pending.
- **Evidence:** `bulletTime.ts:39-50` reduced gate, `feel.ts:82` bullet datum comment, `GameBoard.tsx:313-318` reduced snap + `472-478` bullet trigger, `bulletTime.atdd.test.ts:P0-04` and `P1-03/P1-04/P1-05/P2-03/P2-06` scans.
- **Findings:** Host contract PASS; overall CONCERNS until P1-07 device smoke (Reduced Motion ON flat while haptics still felt, preview chrome never flashes) is signed off. Same pattern as 8-2/8-3 waivers.

---

## Reliability Assessment

### Availability (Uptime)

- **Status:** PASS ✅ (with note)
- **Threshold:** N/A — offline-first RN app (NFR-2/NFR-6 installable + offline), no server SLA
- **Actual:** App boots offline; bullet visuals are bundled worklets (Reanimated/Skia), no network fetch.
- **Evidence:** `GameBoard.tsx` imports are bundled modules, not CDN; test-design NFR table: offline/airplane mode check as device lane (P1-07).
- **Findings:** No availability risk; pending airplane-mode device confirmation (P1-07).

### Error Rate

- **Status:** PASS ✅
- **Threshold:** <0.1% (textbook; not formally declared) — scoped 8-4 bullet ATDD: 19/21 = 90.5% but 2 fails are expected RED with waiver same cause pair, effective pass excluding waived RED is 100% for automatable surface; full suite 804/812 = 99.01% (8 waived 0.99%) excluding waived is 100% new surface; `bulletTime.test.ts` 9/9 = 100% P0. P0/P1 bullet ATDD 15/15 = 100%.
- **Actual:** 0 unhandled throws on bullet path; `maxMergeValue(NaN/Infinity/undefined)` + `isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest(NaN)` never throw (`bulletTime.test.ts:87`, `bulletTime.atdd.test.ts:125` sweeps), `presetFor` fallback light, `GameBoard` bullet effect silent no-op on empty plan / NOOP / reducedMotion / invalid trace / `sessionBestMerge NaN/Infinity/undefined` via `safeBest` + `try/catch` + `Number.isFinite` guards, overlay not rendered when `moved===false`.
- **Evidence:** `bulletTime.ts:9-66` clamp + try/catch never-throw wrappers, `feel.ts:68-74` non-finite fallback, `GameBoard.tsx:472-482` try/catch + safeBest, `npm test` 28/30 with 2 waived.

### MTTR (Mean Time To Recovery)

- **Status:** CONCERNS ⚠️
- **Threshold:** UNKNOWN (no incident SLI)
- **Actual:** No incident data; recovery from bullet failure is instant (silent no-op, gameplay continues, move not blocked). Detection MTTR is gap: overlap R-007 and width R-010 have no telemetry beyond ATDD pins; burst leak carry-over also has no Crashlytics signal.
- **Evidence:** No incident reports; `traceability/gate-decision-8-4-bullet-time.json` notes overlap/width residuals without Crashlytics signal.
- **Findings:** MTTR 0 for user (no crash), but detection MTTR UNKNOWN pending `cancelAnimation(bulletFlash)` fix + width guard + import-failure telemetry (if ever needed).

### Fault Tolerance

- **Status:** PASS ✅
- **Threshold:** Never-throw guarantee (engine-never-throws extended to feel+bullet)
- **Actual:** PASS — `maxMergeValue(null/undefined/[])→null`, `isNewSessionBest(NaN/Infinity/-5) → false` fallback, `shouldTriggerBulletTime` `reducedMotion` early-return + `Number.isFinite(sessionBest)` guard, `nextSessionBest(NaN) → 0` fallback, `directionVector` zero-vector safety in shake, `GameBoard` bullet effect silent no-op on empty plan + else no flash. Strongest NFR for this story (pure helpers + frozen datum).
- **Evidence:** `bulletTime.test.ts:74,87`, `bulletTime.atdd.test.ts:125,140`, `bulletTime.ts:9-66`, `feel.ts:68-74`.
- **Findings:** Fault tolerance is strongest NFR for this story.

### CI Burn-In (Stability)

- **Status:** CONCERNS ⚠️
- **Threshold:** Informational (no formal burn-in gate; textbook suggests 100 consecutive green as strong signal)
- **Actual:** Single `npm test` run for bullet ATDD 28/30 (93.3%) with 2 waived RED (R-007 overlap + R-010 width); 0 flaky detected. Full suite single run ~804/812 (99.01%) with 8 waived RED (2 new 8-4 + 6 carry-over 8-1/8-2/8-3). No nightly soak; no 100-run burn. P0/P1 suite deterministic (`maxMergeValue` sweep, `allPresetValues()` not needed for bullet but `entry()` helper deterministic, real `move()` fixture in P1-01 not stubbed).
- **Evidence:** `gate-decision-8-4-bullet-time.json` waived, `npm test` duration 167ms bullet ATDD, `bulletTime.atdd.test.ts:372` P2-02 perf bench deterministic.
- **Findings:** Stable single run; CONCERNS only because formal burn-in not executed — not a blocker for small delta.

### Disaster Recovery (if applicable)

- **RTO (Recovery Time Objective)**
  - **Status:** PASS ✅ (N/A)
  - **Threshold:** N/A — client stateless, no data loss
  - **Actual:** N/A — `sessionBestMerge` is per-session ephemeral in `Snapshot` + `App` state, reset to `0` on restart/lane switch, rewound on undo; no persistence to recover.
  - **Evidence:** No persistence in bullet layer; `sessionBestMerge` not in `src/services/storage` (ephemeral, ADR-06 Snapshot rewind).

- **RPO (Recovery Point Objective)**
  - **Status:** PASS ✅ (N/A)
  - **Threshold:** N/A
  - **Actual:** N/A
  - **Evidence:** No backup/restore needed; old `Snapshot` without `sessionBestMerge` migrates via `Number.isFinite` guard to `0` (accepted).

---

## Maintainability Assessment

### Test Coverage

- **Status:** CONCERNS ⚠️
- **Threshold:** AC coverage gate 100% per test-design; line-coverage 80% not formally declared
- **Actual:** AC coverage 100% (6/6 FULL) per `traceability-matrix-8-4-bullet-time.md` + `coverage-matrix-8-4-bullet-time.json` `overall_coverage_percentage:100`; critical bullet paths `rarity-gated trigger / ordinary no-trigger / Reduced Motion / NOOP / multiple max wins / undo rewind / non-finite / datum 200 / chrome guard` all covered host-side (9 `bulletTime.test.ts` + 15 non-RED `bulletTime.atdd.test.ts` P0/P1). No `lcov`/`c8` line % collected — `coverage/` report not generated in this run (node:test, no c8 gate, consistent with 7.x/8-1/8-2/8-3 precedent). Scoped pass 90.5% (19/21) with 2 waived RED accounted as coverage FULL but execution RED; `bulletTime.test.ts` 9/9 GREEN; P0/P1 15/15 GREEN. E2E-equivalent P1-07 device smoke documented as 8 journeys in `tests/e2e/bulletTime.flash.spec.ts` but not scaffolded as Playwright by design (RN worklet).
- **Evidence:** `traceability-matrix-8-4-bullet-time.md` coverage table, `coverage-matrix-8-4-bullet-time.json` `fully_covered:6`, `npm test` 21 mapped 19 pass / 2 waived RED.
- **Findings:** AC coverage excellent; line-coverage metric is the gap. Recommend adding `c8` lane if CI wants line % for maintainability gate (backlog). Device smoke P1-07 remains manual lane (~15 min, real iPhone).

### Code Quality

- **Status:** PASS ✅
- **Threshold:** `./triade/node_modules/.bin/tsc --noEmit` clean, no scattered `200`/`140`/`60` literals outside single access point, frozen presets, `BULLET_TIME_MS` single datum, no duplicate merge predicate outside gateway
- **Actual:** `tsc` clean for `triade/tsconfig.json` + `triade/tsconfig.test.json` (exit 0, no new `@ts-ignore`; `bulletTime.ts` strictly typed `readonly TraceEntry[]`, no RN import). `BULLET_TIME_MS` exported from `bulletTime.ts:7` and consumed via `BULLET_TIME_MS-60` single source in `GameBoard.tsx:477` (P2-03 GREEN: `BULLET_TIME_MS = 200` once, `GameBoard` `BULLET_TIME_MS-60` derived, `bulletTime.atdd.test.ts:393` P2-03 checks literal `140` only as derived, `duration:60` present once, no scattered `200`). `bulletTime.ts` thin wrappers over `maxMergeValue` → `isNewSessionBest` → `shouldTriggerBulletTime` → `nextSessionBest` (no duplicate tier branching, `bulletTime.atdd.test.ts:420` P2-04 GREEN + `316` P1-06). No SonarQube but code is small (66 LOC bullet helpers + 2 LOC feel comment + 43 LOC GameBoard bullet + 7 LOC App wiring), frozen presets, 0 duplication beyond carry-over burst/shake. `App` functional update pattern mitigates race but `doMove` identity churn deferred (R low).
- **Evidence:** `bulletTime.ts:7` datum, `GameBoard.tsx:11,477` import + derived, `bulletTime.atdd.test.ts:393` P2-03 + `420` P2-04 + `316` P1-06, `tsc` clean.
- **Findings:** Code quality strong; single-datum invariant pinned host-side.

### Technical Debt

- **Status:** PASS ✅
- **Threshold:** <5% debt ratio (textbook)
- **Actual:** Low — 1 new pure module (`bulletTime.ts` 66 LOC), 0 new deps, no engine duplication, no copy-paste, `BULLET_TIME_MS` single source for 8-5 Reduced Motion reuse. Debt items are 2 new deferred RESIDUALS for this story (R-007 overlap without `cancelAnimation(bulletFlash)` + R-010 width NaN guard `Number.isFinite(width)` product decision) plus 4 carry-over `deferred-work.md` entries for this story (`spawned undefined` gap + `value<3` not filtered + width NaN + `doMove` identity churn — 3 of 4 are bullet-specific deferred lows) plus 2 shake/burst residuals from 8-2/8-3 on same `GameBoard` file. Working-tree delta is tiny (66 + 2 + 1 + 43 LOC new, +14 LOC `deferred-work.md`).
- **Evidence:** `spec-8-4-bullet-time.md` Residual risks + Review Triage (2 patches applied via review, 4 deferred lows), `test-design` R-001..R-010 list, `gate-decision-8-4-bullet-time.json` rationale waived, `deferred-work.md` 4 entries for 8-4.
- **Findings:** No structural debt; carry-over `deferred-work.md` grows but remains tracked with expiry before 8-5 (bullet adds further main-thread cost alongside shake 130ms + punch 120ms — R-007 overlap must be fixed before 8-5 heavy feel stacking).

### Documentation Completeness

- **Status:** PASS ✅
- **Threshold:** Spec + test-design + traceability present
- **Actual:** Spec `spec-8-4-bullet-time.md` (intent/boundaries/I-O matrix/Code Map/Tasks/Verification/Auto Run Result `0e2717e` 785 pass /6 fail carry-over; 2 patches + 4 deferred), epic context `epic-8-context.md`, test-design `test-design-epic-8-4-bullet-time.md` + `test-design/test-design-epic-8-4-bullet-time.md` (10 risks R-001..R-010 with R-001/R-002/R-003 score 6, NFR planning, coverage plan P0×9 P1×7 P2×5 P3×4, quality gate), traceability matrix `traceability-matrix-8-4-bullet-time.md` + coverage matrix `coverage-matrix-8-4-bullet-time.json` (100% AC, 45 cases) + gate decision `gate-decision-8-4-bullet-time.json` (CONCERNS waived), ATDD checklist `atdd-checklist-8-4-bullet-time.md` (21 tests 19 GREEN /2 RED, implementation checklist), automation summary, deferred-work. All linked in gate decision `links` block.
- **Evidence:** `_bmad-output/implementation-artifacts/` and `_bmad-output/test-artifacts/` file list.

### Test Quality (from test-review, if available)

- **Status:** PASS ✅
- **Threshold:** Host fixtures over real engine traces (not stubs)
- **Actual:** Host fixtures use real `MoveResult.trace` from `newGame(mulberry32(42))` + `move` via `triade/src/engine` (P1-01 `bulletTime.atdd.test.ts:181`), `GameBoard` source-structure gates for datum single-source + board-only overlay + Reduced Motion mid-flight snap + chrome guard, `App.tsx` wiring via grep gate for `Snapshot.sessionBestMerge` + 7 `Number.isFinite` guards + functional update + `sessionBestMerge` + `reducedMotion` threading, edge sweeps for non-finite/NOOP/multi-merge/invalid trace, perf bench deterministic (`performance.now` 10k sweeps). No Playwright needed (correctly scoped to Unit per test-levels framework; `tea_browser_automation` auto but story is pure RN worklet).
- **Evidence:** `bulletTime.atdd.test.ts:181,216,240,272,294,316,372`, `bulletTime.test.ts` sweep invariants (`BULLET_TIME_MS===200`, `maxMergeValue` board-only, `reducedMotion` gate).
- **Findings:** Test quality strong; P1-07 device smoke is the remaining gap (host-only until device lane, same as 8-2/8-3).

---

## Custom NFR Evidence Audits (if applicable)

No custom categories beyond the 8 ADR checklist categories; client Offline/Installability (NFR-2/NFR-6) covered under Availability (PASS with pending airplane device check). `BULLET_TIME_MS 200` datum `60+140` sequence and `SHAKE_CAP 8` cap and `1536+` glow are pinned as custom shake/bullet thresholds (Performance + Maintainability) and directional axis + chrome guard (QoS) — covered above.

---

## Quick Wins

2 quick wins identified for immediate implementation:

1. **Add cancelAnimation before new bullet withSequence to fix R-007 overlap** (Performance/Reliability) - HIGH - 0.25h - FE
   - In `GameBoard.tsx:472-478` before `bulletFlash.value = withSequence(withTiming(0.45,60), withTiming(0,BULLET_TIME_MS-60))` add `cancelAnimation(bulletFlash)` (import from `react-native-reanimated`). One fix clears `bulletTime.atdd.test.ts:363` P2-01 and keeps `200 ms` budget intact; verify rapid-swipe pair within 84–200 ms (EARLY_INPUT) no longer truncates overlap (`bulletFlash` vs `shakeX/Y` same class as shake 8-3 R-001). Keep `Reduced Motion` snap `withTiming(0,20)` branches unchanged.

2. **Add width guard or product waiver for R-010 board width** (Reliability/Maintainability) - LOW - 0.25h - FE lead / UX
   - Either add `Number.isFinite(width)` / `Math.max(width,1)` guard before `GameBoard` overlay `style width/height=width` so degenerate `NaN` does not propagate to RN warning (preferred if guard wanted: `const safeWidth = Number.isFinite(width) ? width : 0;` and use `safeWidth` in overlay style at `GameBoard.tsx:540-541`), or document `width NaN` as accepted deferred cosmetic (`boardWrap overflow:hidden` clips at extreme) with UX sign-off and change `bulletTime.atdd.test.ts:448` P2-05 to accepted-with-sign-off. Also add FR-30 comment `// FR-30: bullet gated — haptics stay` above `GameBoard.tsx:472` bullet block and `bulletTime.ts:39` helpers for 8-5 Reduced Motion umbrella.

---

## Recommended Actions

### Immediate (Before Release) - CRITICAL/HIGH Priority

1. **Fix R-007 overlap + verify R-010 width product decision** - HIGH - 0.5h - FE / UX
   - Add `cancelAnimation(bulletFlash)` before new `withSequence` in `GameBoard.tsx:475` (import `cancelAnimation` alongside `withSequence`/`withTiming` at line 5); re-run `bulletTime.atdd.test.ts` until P2-01 GREEN and rapid-swipe combo video (heavy new-best `6→12` within ~90ms EARLY_INPUT window) shows clean second `200ms` `#fff7e0` flash without truncated overlap. For R-010, UX decision: either keep `Number.isFinite(width)` guard (preferred, one-line) or apply explicit waiver as accepted cosmetic and turn `bulletTime.atdd.test.ts:448` P2-05 GREEN with sign-off + `boardWrap overflow:hidden` screenshot. Both share one PR with same `GameBoard.tsx` file as shake clip decision.

2. **Run 15-min real-iPhone device smoke P1-07** - HIGH - 0.25h - PR author / QA
   - In Expo dev build on real iPhone (SDK 57, Skia+Reanimated 4, no Simulator): trigger first `1+2→3` new-best flash `~200ms` board-only `#fff7e0` 60+140, then repeat `3` when best `6` → no flash, `6→flash` when best `3` → best becomes `6`, `6` again no flash, `12→flash` when best `6`, each in portrait+landscape; toggle Settings → Reduce Motion ON → repeat each new-best → flat board (no flash) while haptics still felt; NOOP swipe (edges/no merge) → flat; preview card & score never flash; airplane mode → repeat; undo after `12` best → redo same `12` re-flashes; `200ms` does not delay next swipe (EARLY_INPUT_MS≈84ms gate still opens); rapid new-bests within `200ms` window → no freeze (R-007). Record sign-off checkbox in PR description ("device bullet smoke: first 3 flash / 6 re-trigger / 12 heavy + Reduced Motion ON flat + NOOP + chrome + undo rewind + rapid-overlap check"). Also covers offline NFR-2/NFR-6.

3. **Remediate carry-over shake/burst leak before verified (same GameBoard surface)** - HIGH - 0.5h - FE
   - 8-2 R-002/R-007 bare `setTimeout(500)` without ref/clearTimeout on unmount (P1 score 6 / P2 score 4) + 8-3 R-001 overlap without `cancelAnimation(shakeX/Y)` still present in `GameBoard.tsx` — same file as bullet fix. Add `burstTimersRef: Set<ReturnType<typeof setTimeout>>` + `useEffect` cleanup `clearTimeout` on unmount mirroring `settleTimerRef`; add `cancelAnimation(shakeX)`/`cancelAnimation(shakeY)` before new shake `withSequence`. One fix clears both `punch.atdd.test.ts:269` P1-05 and `314` P2-01 and `shake.atdd.test.ts:272` P2-01. Waiver expiry before 8-5 (bullet 200ms + shake 130ms + punch 120ms compound).

### Short-term (Next Milestone) - MEDIUM Priority

1. **Add device p99 benchmark lane for R-007/R-001** - MEDIUM - 1h - QA / FE
   - Run `useFrameRateBaseline` stats after 2-min play with 5+ new-bests including at least one `12` while Reduced Motion OFF and one heavy that also shakes (bullet 200ms + shake 130ms co-fire) plus a rapid-swipe pair within `200ms` window on real iPhone; capture `fps`/`p99Ms`/`frames` and fail if `p99Ms>16.7ms`. Keep board-only `Animated.View` bullet + `Canvas` Skia + caps `BULLET_TIME_MS 200` + `SHAKE_CAP 8` + `overshootScale≤1.2`/`particleBurst∈{0,4,8,16}` asserted. Required before 8-5 (bullet+shake compound).

2. **Keep CI guard rails + tighten trace contract** - MEDIUM - 0.5h - DEV/CI
   - Enforce `git diff --stat -- triade/src/engine` empty (ADR-01), `rg "BULLET_TIME_MS" src/ --glob '!bulletTime.ts'` allowlist is `GameBoard.tsx` + `feel.ts` comment, `rg "SHAKE_CAP" src/feel --glob '!shake.ts'` fails if scattered, `rg "from.length===2" src/` hits only sanctioned sites (`src/engine` + `src/feel/bulletTime.ts` + `src/feel/shake.ts` + `src/render/transitionPlan.ts` + comments in `matchStats.ts`/`haptics.ts`), `App` wiring gate for `Number.isFinite(snap.sessionBestMerge)` 7 sites + `setSessionBestMerge` functional update + `sessionBestMerge`/`reducedMotion` threading into `GameBoard`. Consider tightening `bulletTime.ts:14` filter from `!spawned` to `spawned !== true` and adding `value>=3` clamp if product wants strict board-only ≥3 (deferred-work R spawned-undefined + value<3). All host gates, keep in PR checks for 8-5/8-6.

### Long-term (Backlog) - LOW Priority

1. **Add c8/nyc coverage lane and jscpd duplication check** - LOW - 1-2h - DEV/CI
   - Generate `coverage/lcov-report` for maintainability gate (80% target) and jscpd for <5% duplication — not required for this small delta but useful for Epic 8 full feel preset (8-4..8-6).

2. **Ref-optimize `App.doMove` identity churn** - LOW - 0.5h - FE
   - `doMove` deps include `sessionBestMerge` (functional update mitigates race but still invalidates closure identity every new best — deferred `deferred-work.md` R). Consider stable-ref pattern (`sessionBestMergeRef`) so `panGesture` via `doMoveRef` stays truly stable; audit alongside shake `lastDirectionRef` pattern. Not gating; track in `deferred-work.md`.

---

## Monitoring Hooks

4 monitoring hooks recommended to detect issues before failures:

### Performance Monitoring

- [ ] Host micro-bench lane (CI) - Fail CI if `maxMergeValue`+`isNewSessionBest`+`shouldTriggerBulletTime`+`nextSessionBest` sweep >200ms for 40k calls or `presetFor` per-it >2ms
  - **Owner:** DEV / CI
  - **Deadline:** 8-5 review

- [ ] Device frame stats lane (`useFrameRateBaseline`) - Track `fps`/`p99Ms`/`frames` after 2-min play with 5+ new-bests including one heavy `12` bullet (200ms) + shake `5` co-fire; alert if p99 >16.7ms (bullet+shake+punch concurrent)
  - **Owner:** QA / FE
  - **Deadline:** Epic 8 device benchmark (ADR-04 two-level benchmark when 8-5 lands)

### Security Monitoring

- [ ] No security runtime monitoring needed this story (client-only visual) — keep `npm audit` + `expo-doctor` as periodic gate (carry-over 11 moderate transitive expo)
  - **Owner:** FE lead / CI
  - **Deadline:** 8-5 review

### Reliability Monitoring

- [ ] Bullet unmount dev-build warning (optional) - Log once when `GameBoard` unmounts during in-flight `200ms` `withSequence` or when `directionVector` receives non-canonical dir (e.g. `"LEFT"`) indicating `resolveSwipeDirection` contract drift; also log if `maxMergeValue` receives trace with `spawned` missing `undefined` (deferred-work R)
  - **Owner:** FE
  - **Deadline:** 8-4 follow-up / 8-5

### Alerting Thresholds

- [ ] Overlap truncation alert - Notify when device smoke video shows second rapid new-best `6→12` within 90ms truncates first `200ms` flash (last wins, not queued) — indicates missing `cancelAnimation(bulletFlash)`; also watch for shake axis drift (left/right on Y) indicating `lastDirectionRef` staleness
  - **Owner:** QA
  - **Deadline:** after fix

---

## Fail-Fast Mechanisms

3 fail-fast mechanisms recommended to prevent failures:

### Circuit Breakers (Reliability)

- [ ] Not needed — `maxMergeValue`/`isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest` already fail-fast via `Number.isFinite` guard + `try/catch` never-throw; `GameBoard` bullet effect silent no-op on empty trace / NOOP / reducedMotion / invalid `sessionBestMerge` / unmount mid `withSequence`. Keep as-is; do not add retry loop (visual is best-effort, no fixed-step loop).

### Rate Limiting (Performance)

- [ ] Optional bullet coalescence debounce for overlap — If R-007 device trace shows jank with concurrent Skia Canvas + shake `130ms` + punch spring at 84ms early-input re-plan, the `cancelAnimation(bulletFlash)` fix is the rate limiter (collapses N bullets in 200ms window to the latest). Owner: FE, Effort: already in Quick Win 1, gated by device p99 feedback from `useFrameRateBaseline`.

### Validation Gates (Security)

- [ ] Input guard is already the validation gate — `maxMergeValue` board-only filter `from.length===2 && !spawned && Number.isFinite(value)` per single source + `Number.isFinite(sessionBest)` gate + `Number.isFinite(sessionBestMerge) ? :0` safeBest + `reducedMotion` early-return + chrome guard (overlay `position:absolute` board-only, `pointerEvents:none`, never `Hud`). No additional gate needed; monitor deferred `spawned !== true` + `value>=3` hardening if product adopts.

### Smoke Tests (Maintainability)

- [ ] Device smoke checklist P1-07 as PR gate — must be ticked before merge to verified (15 min, real iPhone). Owner: PR author.

---

## Evidence Gaps

4 evidence gaps identified - action required:

- [ ] **Performance - device p99 <16.7ms with bullet layer (200ms overlay concurrent with Canvas)** (Performance)
  - **Owner:** QA / FE
  - **Deadline:** Before 8-5 verified (15-min device lane + benchmark)
  - **Suggested Evidence:** `useFrameRateBaseline` log `fps`/`p99Ms`/`frames` after 2-min play with 5+ new-bests on real iPhone dev build SDK 57 (including heavy `12` bullet 200ms + shake 5 co-fire + punch) — concurrent Skia Canvas + Reanimated worklets
  - **Impact:** Cannot claim 60 FPS budget met without device data; host <50ms is not sufficient for frame guarantee (R-007 score 4, plus carry-over shake R-001 score 6).

- [ ] **Reliability - Bullet overlap without cancelAnimation(bulletFlash) (R-007)** (Reliability)
  - **Owner:** FE
  - **Deadline:** Before 8-5 (immediate)
  - **Suggested Evidence:** `GameBoard.tsx` calls `cancelAnimation(bulletFlash)` before new `withSequence(withTiming(0.45,60), withTiming(0,BULLET_TIME_MS-60))`; `bulletTime.atdd.test.ts:363` P2-01 turns GREEN; rapid-swipe combo video (new-best `6→12` within 90ms EARLY_INPUT) shows clean second 200ms flash, no truncated overlap
  - **Impact:** Truncated first bullet flash / mild jank on rapid new-best combos (most playful path) — waived low but blocks PASS; same class as shake R-001 must be fixed together.

- [ ] **Compliance - Device Reduced Motion verification (FR-30) + chrome guard** (Compliance)
  - **Owner:** QA / PR author
  - **Deadline:** Before verified (device smoke P1-07)
  - **Suggested Evidence:** iOS Settings → Accessibility → Motion → Reduce Motion ON → repeat new-best merges (`0→3`, `3→6`, `6→12`): confirm flat board (no `#fff7e0` flash) while haptics still felt; preview card & score never flash — host-only P0-04/P1-04/P1-05 green but not user-verified
  - **Impact:** Without device pass, FR-30 a11y/App Store compliance is host-only but not user-verified (R-001 deferred).

- [ ] **Reliability - Board width NaN guard (R-010) + carry-over burst/shake + trace contract hardening** (Reliability)
  - **Owner:** FE / UX
  - **Deadline:** Before 8-5 (immediate for burst/shake leak, product decision for width)
  - **Suggested Evidence:** Product decision: `Number.isFinite(width)` / `Math.max(width,1)` guard in `GameBoard.tsx:540` overlay style `width/height` or explicit waiver as accepted cosmetic; device screenshot that `200ms` flash at board corners does not visibly cut tiles / `bulletTime.atdd.test.ts:448` P2-05 GREEN. Plus carry-over `burstTimersRef` + `cancelAnimation(shakeX/Y)` fix so `punch.atdd.test.ts` + `shake.atdd.test.ts` 19+17 GREEN and `spawned !== true` + `value>=3` hardening decision.
  - **Impact:** Width `NaN` propagates to RN warning (not reachable via finite `layoutFor` but deferred low); burst orphan `setState on unmounted` (R-002/R-007 carry-over) + shake overlap + trace `spawned undefined`/`value<3` pollution — not crash but polish/stability + contract drift.

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

**This delta: 21/29 (72%) — Room for improvement; no FAIL. Gaps are evidence/monitoring + device lanes + 2 deferred-work residuals, not functional defects. Scoped AC gate is 100% coverage / 90.5% pass (2 waived RED) / 99.01% full suite. P0/P1 15/15 100% GREEN; no blockers for `done` with waiver.**

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-09-01'
  story_id: '8-4-bullet-time'
  feature_name: '8-4 Bullet time — rarity-gated 200ms flash, Snapshot-rewind, Reduced Motion gated (Epic 8, S8.4)'
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
  evidence_gaps: 4
  recommendations:
    - 'Add cancelAnimation(bulletFlash) before new withSequence to fix R-007 overlap — one-line, keeps 200ms budget'
    - 'Run 15-min real-iPhone device smoke P1-07 (0→3 flash / 3 vs 6 no flash / 6 vs 3 flash / 12 vs 6 flash each portrait+landscape + Reduced Motion ON flat + NOOP + chrome + undo rewind + rapid-overlap check) and sign off in PR'
    - 'Decide width guard R-010 product fix (Number.isFinite(width) vs accepted deferred) + fix carry-over shake/burst leak burstTimersRef+cancelAnimation before 8-5 — same GameBoard file'
  working_tree_delta: '0e2717e (1 ahead of 590e461) + metadata-only uncommitted diff'
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/spec-8-4-bullet-time.md` (final_revision 12a3dcd, baseline 590e461, assessed HEAD 0e2717e byte-identical to 12a3dcd plus review patches)
- **Tech Spec:** `triade/src/feel/bulletTime.ts` (66 LOC, BULLET_TIME_MS 200) + `triade/src/feel/feel.ts` (2 LOC datum comment) + `triade/src/game/matchOrchestrator.ts` (Snapshot sessionBestMerge?) + `triade/src/render/GameBoard.tsx:298-547` (bullet overlay) + `triade/App.tsx:+48−33 LOC` wiring `sessionBestMerge`/`reducedMotion`
- **PRD:** N/A (game project — PRD not needed; spec is oracle)
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-8-4-bullet-time.md` + `_bmad-output/test-artifacts/test-design-epic-8-4-bullet-time.md`
- **Traceability:** `_bmad-output/test-artifacts/traceability/traceability-matrix-8-4-bullet-time.md`, `coverage-matrix-8-4-bullet-time.json`, `gate-decision-8-4-bullet-time.json`, `e2e-trace-summary-8-4-bullet-time.json`
- **ATDD Checklist:** `_bmad-output/test-artifacts/atdd-checklist-8-4-bullet-time.md`
- **Evidence Sources:**
  - Test Results: `triade/__tests__/feel/bulletTime.test.ts` (9 pass) + `triade/__tests__/feel/bulletTime.atdd.test.ts` (19 pass / 2 waived RED P2-01/P2-05) + full suite ~812 tests 804 pass 167ms bullet ATDD + 6 carry-over RED (8-1 tutorial dedup + expo-haptics + 8-2 burst leak + 8-3 overlap/clipping)
  - Metrics: host micro-bench 40k bullet helper sweeps <50ms (P2-02 GREEN), per-it 0.05–0.54ms, no APM/k6 (client-only)
  - Logs: silent best-effort (no structured logs yet; overlap/width has no telemetry — was P2-01/P2-05 gap)
  - CI Results: `triage` clean (`./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` exit 0, `tsconfig.test.json` exit 0), `git diff --stat -- triade/src/engine` empty, `npm audit` carry-over 11 moderate transitive expo (deferred)

---

## Recommendations Summary

**Release Blocker:** None (0 FAIL). Gate is CONCERNS, not FAIL — safe for `done` with waiver, not yet `verified`.

**High Priority:** R-007 overlap without `cancelAnimation(bulletFlash)` (0.25h, one-line) must be fixed + `bulletTime.atdd.test.ts:363` re-run until P2-01 GREEN before `verified`; P1-07 device smoke (15 min, real iPhone) must be signed off before `verified`; R-010 width guard product decision before 8-5. Waivers expire before 8-5 (bullet+shake+punch add further main-thread cost).

**Medium Priority:** Device p99 benchmark lane (`useFrameRateBaseline` after 2-min play heavy+bullet) before 8-5; lint guard for FR-30 + CI gates for engine purity / single access point / capped share + `spawned !== true`/`value>=3` hardening decision. Carry-over burst leak + shake overlap (8-2/8-3) on same file — fix together.

**Next Steps:** Address 1 high + 1 medium (cancelAnimation + width decision + device smoke + burst/shake carry-over), re-run `nfr-assess` and `trace` after; both gates currently CONCERNS with same residuals — converge to PASS before `verified` and before Epic 8 S8.5 (Reduced Motion umbrella) and S8.6 (SFX).

---

## Sign-Off

**NFR Evidence Audit:**

- Overall Status: CONCERNS ⚠️
- Critical Issues: 0
- High Priority Issues: 1 (R-007 score 4 overlap, same class as shake 8-3 R-001 score 6 carry-over)
- Concerns: 8 (ADR criteria) / 4 category-level (Scalability/Monitorability/QoS/Deployability)
- Evidence Gaps: 4 (device p99, overlap fix, device Reduced Motion+chrome, width+carry-over)

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
