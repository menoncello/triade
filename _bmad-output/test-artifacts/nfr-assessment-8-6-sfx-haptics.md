---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-09-01'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-6-sfx-haptics.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-6-sfx-haptics.md'
  - '_bmad-output/test-artifacts/test-design-epic-8-6-sfx-haptics.md'
  - '_bmad-output/test-artifacts/traceability/traceability-matrix-8-6-sfx-haptics.md'
  - '_bmad-output/test-artifacts/traceability/coverage-matrix-8-6-sfx-haptics.json'
  - '_bmad-output/test-artifacts/traceability/gate-decision-8-6-sfx-haptics.json'
  - '_bmad-output/test-artifacts/atdd-checklist-8-6-sfx-haptics.md'
  - 'triade/src/feel/sfx.ts'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/haptics.ts'
  - 'triade/src/feel/shake.ts'
  - 'triade/src/feel/bulletTime.ts'
  - 'triade/src/services/assets/assetManifest.ts'
  - 'triade/App.tsx'
  - 'triade/benchmarks/feel.bench.test.ts'
  - 'triade/__tests__/feel/sfx.test.ts'
  - 'triade/__tests__/feel/feel.test.ts'
  - 'triade/__tests__/feel/punch.test.ts'
  - 'triade/__tests__/feel/shake.test.ts'
  - 'triade/__tests__/feel/bulletTime.test.ts'
  - 'triade/package.json'
  - '_bmad/tea/config.yaml'
---

# NFR Evidence Audit - 8-6 SFX Haptics (expo-audio thock coupled with haptics, swappable gateway, Reduced Motion keeps sound)

**Date:** 2026-09-01
**Story:** 8-6-sfx-haptics
**Overall Status:** CONCERNS ⚠️

---

Note: This audit summarizes existing implementation evidence; it does not run tests or CI workflows. NFR thresholds and planned evidence come from PRD, architecture, and `test-design` outputs where available. Working-tree delta is `b16a06e` (expo-audio thock coupled with haptics, swappable gateway, reduced-motion keeps sound) 1 commit ahead of `7e1916a` (8-5) baseline; uncommitted diff is metadata-only (`sprint-status.yaml` `8-6-sfx-haptics: backlog→done`, `automation-summary.md`, `traceability-matrix.md`, `coverage-matrix.json`, `e2e-trace-summary.json`, `gate-decision.json`, `test-design-progress.md`); assessed production delta is `triade/src/feel/sfx.ts` + `triade/src/services/assets/assetManifest.ts` + `triade/App.tsx` coupling.

## Executive Summary

**Assessment:** 0 PASS, 5 CONCERNS, 0 FAIL (at category roll-up: Performance, Throughput, Resource, Scalability, Compliance each CONCERNS due to device lane pending; Security/Reliability/Maintainability PASS structures but gated by same pending waivers); at ADR checklist **20 PASS / 9 CONCERNS / 0 FAIL (29 criteria) — 69% criteria met, room for improvement** (borderline meets 20/29 minimal; strong host, device pending).

**Blockers:** 0 — no FAIL. 1 waived P2 expected-RED for this story (P2-06 placeholder mastering absent — `triade/assets/sfx/` dir does not exist, degrade to silent no-op is MVP ship path per spec Residual risks + test-design R-003; also E2E-10 same; score 6) plus pending 15-min device smoke P1 E2E-08 (thock rank `0.45/0.65/1.0` + `spawn 0.35` + `gameOver 0.9` + FR-30 ON flat while audible) downgrade deterministic PASS to CONCERNS per risk governance — same precedent as 8-4/8-5 CONCERNS (1 P2 RED + pending device). Plus 7 carry-over waived RED from 8-1..8-5 (`GameBoard` overlap `cancelAnimation` + burst `clearTimeout` + expo-haptics + punch clipping) require fix before `verified` but do not block CONCERNS gate. Waiver expires before Epic 8 close; fix is asset drop only (no code change).

**High Priority Issues:** 1 P2 deferred asset mastering (R-003) + 2 cross-story P2 carry-over on same `GameBoard.tsx` hot path (R-006 overlap `cancelAnimation(shakeX/Y/bulletFlash)` score 4 + R-010 burst `setTimeout 500` orphan score 3 — not introduced by 8-6 but compound with SFX co-fire at same `doMove` call site) plus device p99 + FR-30 ear pending. Audio-specific P0 risks R-001/R-002/R-004 all GREEN host-side.

**Recommendation:** CONCERNS → ship host gate now (P0 10/10 GREEN, P1 host gates GREEN, tsc clean, engine byte-identical empty), carry P2-06 waiver until mastering PR drops `triade/assets/sfx/{merge,spawn,gameover}.wav` (no code change, re-run device ear rank check `3 light 0.45 < 6 medium 0.65 < 12+ heavy 1.0 < spawn 0.35 soft < gameOver 0.9` + FR-30 ON check), piggyback 15-min device smoke for full feel-stack (shake `130ms` + bullet `200ms` + punch + SFX) p99 <16.7ms on same pass, fix `GameBoard` overlap/burst in one PR (one-line `cancelAnimation` + `burstTimerRef`), then re-run `nfr-assess` and `trace` to promote to PASS before Epic 8 `verified`.

**Working-tree evidence snapshot:**
- `triade/src/feel/sfx.ts` 152 LOC — `SfxGateway { play(kind,volume) }` swappable seam, `VOLUME_BY_HAPTIC {0.45/0.65/1.0}` single volume allowlist via `presetFor(value).haptic` data-not-code, `sfxVolumeForValue/sfxKindForValue/triggerSfxForMerge/ForSpawn/ForGameOver/ForTrace` each `try/catch` never-throw + `Number.isFinite` + `Math.max(0,min(1,vol))` clamp, `getAudioModule()` caches `import('expo-audio')` promise with `.catch(()=>null)`, `playViaExpoAudio` wraps per-kind `require('../../assets/sfx/*.wav')` in `try/catch→null` early-return when `!source`, dual-API branch `createAudioPlayer` vs `AudioPlayer` + `setVolume/volume` + `seekTo(0)` + `play()/replay()` each in `try/catch`, `dispatchPlay` prefers gateway else `void playViaExpoAudio` fire-and-forget, `// FR-30: Reduced Motion keeps sound — never gate` and never imports `reducedMotion` (grep `reducedMotion` hits only that comment line), spawn `0.35` fixed soft + gameOver `0.9` single literals
- `triade/src/services/assets/assetManifest.ts` 43 LOC — `sfx-merge/spawn/gameover` each `try/catch→null` when `assets/sfx/` absent, `preloadAssets` filters `Object.values(assetManifest).map(resolve).filter(finite)` with early-return `0 → return` without `Asset.loadAsync`, `try/catch` around `Asset` import + `loadAsync` never throw (NFR-3)
- `triade/App.tsx:76,381-405` — `import { triggerSfxForTrace, triggerSfxForSpawn, triggerSfxForGameOver }` alongside `triggerHapticsForTrace`, `useCallback doMove` fires 4 audio-adjacent calls after `setMoveResult` each in `try/catch` fire-and-forget (`triggerHapticsForTrace(result.trace)` + `triggerSfxForTrace(result.trace)` + `triggerSfxForSpawn(spawnEntry.value)` guarded `result.moved && find(e=>e.spawned)` + `Number.isFinite` + `triggerSfxForGameOver()` guarded `result.moved && isGameOver(board)`), never `await`, never gated on `settings.reducedMotion` (unlike punch/shake/bullet `if(!reducedMotion)` gates; App grep for audio 3 lines shows 0 `await` 0 `reducedMotion` token)
- `triade/__tests__/feel/sfx.test.ts` 11/11 GREEN in 126ms — `[P0] AC2 3→0.45/6→0.65/12+→1.0`, `derives from presetFor haptic tier`, `non-finite fallback 0.45`, `reducedMotion keeps sound`, `coupled haptics+audio 1:1`, `NOOP empty/null trace 0 calls`, `triggerSfxForTrace per-merge scaled volume 3 entries`, `ForMerge/ForSpawn/ForGameOver correct kind/volume 1.0/0.35/0.9`, `missing expo-audio degrades silent`, `gateway throw swallowed`, `no music only merge/spawn/gameOver` (per-case 0.04–0.86ms within budget)
- `triade/package.json` `expo-audio ~57.0.3` + `expo-haptics ~57.0.1` pinned (no extra native dep), `triade/assets/sfx/` absent (verified `ls` No such file — MVP silent degrade path, mastering deferred)
- `npm test --prefix triade -- __tests__/feel/{sfx,feel,punch,shake,bulletTime}.test.ts` 53/53 GREEN, `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean + `tsconfig.test.json` clean, `git diff --stat -- triade/src/engine` empty (ADR-01 pure)

---

## Performance Assessment

### Response Time (p95)

- **Status:** CONCERNS ⚠️
- **Threshold:** NFR-1 + NFR-11 + NFR-14: engine `<2 ms/turn`, frame logic worst-case `<8 ms`, device `p99 <16.7 ms` (60 FPS) — test-design NFR Planning §Performance (SFX adds `0` extra frame cost because audio is async `void import()` off main worklet; caps `SHAKE_CAP 8` + `BULLET_TIME_MS 200` unchanged; both profiles `median <0.05ms / p99 <0.1ms` per `feel.bench.test.ts` 10k warmup 1k; SFX adds only `sfxVolumeForValue` pure lookup budgeted `<0.05ms` additional per `doMove`)
- **Actual:** Host bench still `triade/benchmarks/feel.bench.test.ts` 2/2 GREEN (full `10.2ms` total / reduced `7.29ms` total for 10k turns → median ~0.0003ms per helper, p99 ~0.0006ms host; `sfx.test.ts` per-case `0.04–0.86ms` already in budget, `sfxVolumeForValue` loop over `3/6/12..3072` <0.5ms). Audio `dispatchPlay` is `void playViaExpoAudio` (never await) so `doMove` hot path adds `<0.1ms` host (gateway path is sync `play(kind,vol)` call). `expo-audio` dual-API branching (`createAudioPlayer` vs `AudioPlayer` + `setVolume/volume` + `seekTo`) not extended in bench sweep (gap R-007 score 3). Device p99 with full feel (shake `130ms` + bullet `200ms` + punch `80-120ms` + particles `≤16` + SFX co-fire) concurrent with Skia Canvas + Reanimated main-thread worklets NOT measured — P1 E2E-08 device lane pending, same as 8-5.
- **Evidence:** `triade/benchmarks/feel.bench.test.ts:10-70` both-profile sweeps (`TURNS 10000`, `WARMUP 1000`, `BUDGET_MEDIAN 0.05`, `BUDGET_TAIL 0.1`), `triade/__tests__/feel/sfx.test.ts` timings `0.04–0.86ms`, `test-design-epic-8-6-sfx-haptics.md` NFR Planning R-002/R-007/R-009, `triade/src/feel/sfx.ts:59` clamp + `52-88` void dispatch, `triade/App.tsx:388-401` fire-and-forget without `await`.
- **Findings:** Host side well within frame budget; no per-merge promise storm (single `void playViaExpoAudio` per `dispatchPlay`, not per-particle; `triggerSfxForTrace` loops trace once, `sfxVolumeForValue` is O(1) map lookup). Optimised mitigations: `VOLUME_BY_HAPTIC` data-not-code avoids branching, `audioModulePromise` cached once, `require` inside function (not top-level) avoids bundler parse cost, `App` 3 audio lines each `try/catch` avoid await so `busyRef` clears promptly (`EARLY_INPUT_MS≈84ms` re-plan). Full concurrent load (shake+bullet+punch+SFX) may exceed p99 on mid-tier iPhones under early-input re-plan — not FAIL because audio is off main worklet and `void` (never schedules worklet), but still CONCERNS until device lane (same waiver as 8-5 R-007). Overlap artefact R-009 `<50ms` multi-merge re-seek last-wins truncation is rarity (double-merge only), not budget breach; carry-over `GameBoard` overlap `cancelAnimation` absence still CONCERNS host (same as 8-5 R-006).

### Throughput

- **Status:** CONCERNS ⚠️
- **Threshold:** N/A backend; client frame gate is rate limiting for feel coalescence (no req/sec SLO). Throughput is frame-bound (60 FPS p99) not request-bound; reduced preset throughput under reduced must be ≤ full (sanctioned fallback).
- **Actual:** No k6/JMeter load run (no backend). Multi-merge policy fires one SFX per merge entry via `triggerSfxForTrace` (per-entry loop, not coalesced) + one `spawn 0.35` per `moved` + one `gameOver 0.9` per `isGameOver` — if device ear shows truncated tail on `<50ms` double-merge `6+12`, last audible wins (R-009 score 2, acceptable rarity per spec residual). `reducedMotion true` fires same SFX count as full (FR-30: sound never gated) unlike shake/bullet which coalesce to 0 — so audio throughput under reduced equals full (correct), while visual throughput is less (`feel.bench.test.ts` REDUCED `7.29ms < FULL 10.2ms` for visuals, but audio adds no visual cost).
- **Evidence:** `triade/__tests__/feel/sfx.test.ts:triggerSfxForTrace fires one SFX per merge entry`, `triade/App.tsx:391-399` spawn/gameOver guards, `spec-8-6-sfx-haptics.md` Residual risks + R-009.
- **Findings:** Throughput not breached host-side; audio does not stack `withSequence` worklets (unlike shake/bullet) so no jank from coalescence. R-009 monitoring only.

### Resource Usage

- **CPU Usage**
  - **Status:** CONCERNS ⚠️
  - **Threshold:** Budget p99 16.7ms (frame)
  - **Actual:** No CPU profile collected; host heap trivial (`sfx.ts` 152 LOC + `assetManifest` 43 LOC + `App` 24 LOC coupling, `VOLUME_BY_HAPTIC` frozen map `0.45/0.65/1.0`, `audioModulePromise` single ref, `SfxGateway` interface no allocation). Per `doMove` audio allocates at most 3 `void` calls (`trace` loop + spawn find + gameOver) + `getAudioModule` single `import()` promise (cached) + `require` per kind only when `playViaExpoAudio` actually reached (gateway path bypasses). No leak observed in 11-test host run (`126ms` stable). Overlap without `cancelAnimation` is `GameBoard` visual, not audio CPU. `expo-audio` SDK 57 dual-API dead branch risk (R-007) not measured.
  - **Evidence:** No APM; `npm test` sfx ATDD `126ms` stable; `sfx.test.ts` per-case `0.04–0.86ms`.

- **Memory Usage**
  - **Status:** PASS ✅
  - **Threshold:** N/A (client RN, no server memory SLO)
  - **Actual:** Negligible — `VOLUME_BY_HAPTIC` frozen const, `SfxKind` union, `audioModulePromise` single cached promise, `assetManifest` 3 `sfx-*` entries returning `number|null` not retained, `preloadAssets` filters to finite numbers then `loadAsync` not retained, `SfxGateway` is injected per call not stored. No accumulation (`triggerSfxForTrace` loops trace without retaining, `dispatchPlay` fire-and-forget).
  - **Evidence:** `triade/src/feel/sfx.ts:15-18` frozen map + `sfxVolumeForValue` stateless + `triade/src/services/assets/assetManifest.ts:31-43` stateless filter.

### Scalability

- **Status:** CONCERNS ⚠️
- **Threshold:** Statelessness required (ADR 3.1); no horizontal scaling needed for client feature (offline-first RN, NFR-2/NFR-6 installable + offline, ADR-06 Snapshot rewind not affected).
- **Actual:** Stateless pure helpers (`sfxVolumeForValue`, `sfxKindForValue` pure + `triggerSfxForTrace` observer, `assetManifest` stateless, `settings.reducedMotion` not read by audio). Bottleneck is not scaling but `expo-audio` SDK 57 availability and missing `assets/sfx/` degrade path (R-003) — audio is best-effort, never blocks gameplay, so scalability is `0` additional cost when degraded. No circuit breaker needed for audio — fail-fast is never-throw + early-return when `!source` or `!mod`.
- **Evidence:** `triade/src/feel/sfx.ts` pure + `assetManifest` stateless + `test-design` R-003 score 6 / R-007 score 3 / R-008 score 3.
- **Findings:** Scalability N/A for this thin seam (no server). CONCERNS only due to pending device p99 and `assets/sfx/` absent master path + `expo-audio` SDK pin verification on upgrade.

---

## Security Assessment

### Authentication Strength

- **Status:** PASS ✅
- **Threshold:** N/A (no auth in feel/SFX layer — local audio observer, no network, no credentials)
- **Actual:** N/A — `sfx.ts` does not handle credentials, tokens, or sessions; `SfxGateway` is local `play(kind,volume)` function, not a network call. No new auth surface.
- **Evidence:** No auth code in `triade/src/feel/sfx.ts` nor `triade/src/services/assets/assetManifest.ts` nor `triade/App.tsx` audio coupling; `spec-8-6-sfx-haptics.md` Boundaries: "No engine edits, no new permissions beyond `expo-audio` playback (no mic), no monetization/telemetry/privacy code touched".
- **Findings:** No exposure.

### Authorization Controls

- **Status:** PASS ✅
- **Threshold:** N/A
- **Actual:** N/A — RBAC not applicable; audio is local playback, no resource access control. `SfxKind` allowlist `merge/spawn/gameOver` is not an auth gate.
- **Evidence:** No authorization checks in `sfx.ts`; gateway injected per call, not via permission system.
- **Recommendation:** N/A

### Data Protection

- **Status:** PASS ✅
- **Threshold:** No PII/secrets in trace; encryption N/A (client-side). `TraceEntry` contains board coordinates and values (3..12288), volume is `0.45–1.0` float, no PII.
- **Actual:** No sensitive data handled; `sfxVolumeForValue` never logs values; no storage of audio data.
- **Evidence:** `triade/src/engine/core/types.ts` TraceEntry shape; `triade/src/feel/sfx.ts` never logs; `rg -n "console\.(log|warn|error)" triade/src/feel/sfx.ts` shows no log (except deferred `__DEV__` only if product wants).
- **Findings:** No data protection risk.

### Vulnerability Management

- **Status:** PASS ✅
- **Threshold:** 0 critical/high (textbook; `expo-audio ~57.0.3` pinned, no new dep beyond already-audited expo-haptics chain)
- **Actual:** No `npm audit` run this lane but `triade/package.json` `expo-audio ~57.0.3` + `expo-haptics ~57.0.1` already pinned, `rg -n "require\(.*assets/sfx"` 6 sites each in `try/catch` — no supply-chain risk beyond carry-over 11 moderate transitive via `@expo/cli` chain (same as 8-1..8-5, waived pending expo major bump). No SAST/DAST; no new dependency. `sfx.ts` uses `dynamic import('expo-audio')` not `eval`/`exec`.
- **Evidence:** `triade/package.json` deps list, `triade/src/feel/sfx.ts` imports only `feel.ts` + `types.ts`, `assetManifest.ts` imports only `expo-asset` already bundled.
- **Findings:** No new supply-chain risk.

### Compliance (if applicable)

- **Status:** CONCERNS ⚠️ (host PASS, device pending)
- **Standards:** FR-30 / UX-DR-29 (cálido thock, 3-kind cap `merge/spawn/gameOver` only, no music/bgm/loop, sound scales mirroring haptic scale coupled per merge value `0.45/0.65/1.0` + `0.35` spawn + `0.9` gameOver), FR-30 Reduced Motion keeps **both haptics and sound** (`sfx.ts` never reads `reducedMotion`, `App.tsx` never gates `triggerSfx*` on `settings.reducedMotion`), UX-DR-27 chrome rule (audio is non-visual so chrome never animates vacuously true, but keep board-only `Animated.View` gates), datum caps `SHAKE_CAP 8`/`BULLET_TIME_MS 200` unchanged, `1.0` max volume clamp.
- **Actual:** COMPLIANT host-side — `sfxVolumeForValue(3)=0.45 Light / 6=0.65 Medium / 12+=1.0 Heavy` mirrors `presetFor(v).haptic` + `hapticsStyleForValue` 1:1 (`sfx.test.ts` 3 cases GREEN), `VOLUME_BY_HAPTIC` single-source `rg VOLUME_BY_HAPTIC` only in `sfx.ts` + `rg 0.45|0.65|1.0` only in `sfx.ts` (3 volume literals) — no scattered literals, `SfxKind` allowlist `merge|spawn|gameOver` only in `sfx.ts` + `sfx.test.ts` + `rg music|bgm` empty in `src/feel`, merge predicate `!spawned && from.length===2 && Array.isArray(from)` single-seam across 5 sites (`haptics.ts`/`shake.ts`/`bulletTime.ts`/`sfx.ts`/transitionPlan) + 2 extra in `matchStats` mirror, `sfxKindForValue` always `merge` (no pitch table MVP), `Math.max(0,min(1,vol))` clamp to `[0,1]` verified `0.45/0.35/0.9` within `[0,1]`, `spawn 0.35` + `gameOver 0.9` single literals in `sfx.ts`, `App` 3 audio lines 0 `reducedMotion` token + 0 `await`. Device confirmation pending.
- **Evidence:** `triade/src/feel/sfx.ts:1-18` comment + `VOLUME_BY_HAPTIC` + `59` clamp + `62-66` require + `137-144` predicate, `triade/__tests__/feel/sfx.test.ts` P0 11/11 (`AC2 shack mirrored`, `reducedMotion keeps sound`, `no music`), `rg` allowlist scans above, `triade/App.tsx:388-401` wiring, `test-design-epic-8-6-sfx-haptics.md` R-001/R-004, spec AC2/AC4/UX-DR-29.
- **Findings:** Host contract PASS for all 3 NFR custom thresholds (3-kind cap + coupled rank + FR-30 keep-sound + no-music + chrome). Overall CONCERNS until P1 E2E-08 device smoke (Reduce Motion ON → flat visuals `shakeMs 0/particle 0/overshoot 0/flash false/glow false/bullet false` while haptics+t hocks heard at same scaled weight `3 soft 0.45, 12 full 1.0, spawn 0.35 soft, gameOver 0.9`, and `Hud` preview card never translates even when board thocks + no music ever) is signed off. Same pattern as 8-5 waiver; `triade/assets/sfx/` absence means device ear will be silent until mastering lands — code path not gated still verified via grep + host, but mastering quality beyond placeholder is deferred work (spec Residual risk).

---

## Reliability Assessment

### Availability (Uptime)

- **Status:** PASS ✅ (with note)
- **Threshold:** N/A — offline-first RN app (NFR-2/NFR-6 installable + offline, NFR-3 degrade to defaults), no server SLA
- **Actual:** App boots offline even without `assets/sfx/` (assetManifest degrade) and without `expo-audio` (dynamic import `catch(()=>null)` → early-return). `expo-audio ~57.0.3` is bundled, not CDN. Airplane mode same as online (no network dependency for SFX).
- **Evidence:** `triade/src/services/assets/assetManifest.ts:5-28` `try/catch→null` + `triade/src/feel/sfx.ts:32-48` `getAudioModule` + `49-88` early-return when `!source` or `!mod`; test-design NFR table: offline/airplane device lane P1 E2E-08.
- **Findings:** No availability risk; pending airplane-mode device confirmation piggybacked on same P1 smoke (same Expo dev build).

### Error Rate

- **Status:** PASS ✅
- **Threshold:** <0.1% (textbook; scoped 8-6: `sfx.test.ts` 11/11 =100% P0 + `feel/punch/shake/bulletTime` 42/42 =100% feel unit + full `__tests__/feel` 53/53 GREEN; traceability `53/54 98.15% raw 100% waivers` excluding P2-06 placeholder; no unhandled throw on audio path)
- **Actual:** 0 unhandled throws on SFX path; `sfxVolumeForValue(NaN/Infinity/-1/undef)` → `0.45` fallback + `triggerSfxForTrace(null/undefined/[]/spawned:true/from.len!=2)` → `0` calls + `gateway.play→throw` swallowed + `require missing wav → null` early-return + `mod null → return` + `App` `try/catch` per audio line + `preloadAssets` `try/catch` + `Asset.loadAsync` `catch` + `Number.isFinite` guards. `doMove` never awaits audio, never blocks `busyRef`/`setMoveResult`.
- **Evidence:** `triade/src/feel/sfx.ts:19-28` + `50-113` + `133-144` try/catch sweep, `triade/App.tsx:386-405` 3× try/catch, `triade/__tests__/feel/sfx.test.ts` non-finite/NOOP/gateway-throw sweeps.
- **Findings:** Error rate 0 on automatable surface; strongest NFR for this story (same as 8-4 bullet never-throw, extended to audio).

### MTTR (Mean Time To Recovery)

- **Status:** CONCERNS ⚠️
- **Threshold:** UNKNOWN (no incident SLI)
- **Actual:** No incident data; recovery from SFX failure is instant silent no-op (gameplay continues, move not blocked, next swipe not gated, audio is best-effort). Detection MTTR is gap: `expo-audio` SDK dual-API dead branch (`createAudioPlayer` vs `AudioPlayer` + `setVolume/volume` + `seekTo`) failure is swallowed silent (no thock, no crash) — no Crashlytics signal, no metric, no `__DEV__` warn; mastering quality beyond placeholder not instrumented. Same class as 8-5 overlap detection gap.
- **Evidence:** No incident reports; `triade/src/feel/sfx.ts:69-86` nested try/catch swallows `createAudioPlayer` miss.
- **Findings:** MTTR 0 for user (no crash), but detection MTTR UNKNOWN pending optional `__DEV__` warning on dead branch + mastering asset-drop tracking (deferred).

### Fault Tolerance

- **Status:** PASS ✅
- **Threshold:** Never-throw guarantee (engine-never-throws extended to audio: `sfxVolumeForValue`/`sfxKindForValue`/`triggerSfxFor*`/`dispatchPlay`/`playViaExpoAudio`/`getAudioModule`/`assetManifest sfx-*`/`preloadAssets` never throw) + never-block (`doMove` never awaits)
- **Actual:** PASS — `sfxVolumeForValue(NaN/Infinity/-5)→0.45`, `triggerSfxForTrace(null/undefined/[])→0`, `trace [{spawned:true}]→0`, `trace [{from:[0,1]}]→0`, `gateway null→ void import` early-return, `gateway.play→throw` swallowed, `require missing wav→null→return`, `mod null→return`, `vol clamp [0,1]`, `App` spawn `Number.isFinite` guard + `result.moved` guard so NOOP never thocks spawn, `assetManifest` `null` → `filter finite` → `0→return`, `preloadAssets` double-invoke idempotent via `try/catch`, `audioModulePromise` cached + `.catch(()=>null)`. Strongest NFR for this story (pure helpers + frozen datum + single source + fire-and-forget).
- **Evidence:** `triade/__tests__/feel/sfx.test.ts:P0` 11/11 sweeps + `triade/src/feel/sfx.ts` every export wrapped + `triade/App.tsx:386-405` per-line guards.
- **Findings:** Fault tolerance is strongest NFR (same as 8-5 reduced umbrella extended to audio).

### CI Burn-In (Stability)

- **Status:** CONCERNS ⚠️
- **Threshold:** Informational (no formal burn-in gate; textbook suggests 100 consecutive green as strong signal)
- **Actual:** Single host runs: `sfx.test.ts` 11/11 100% + `feel/punch/shake/bulletTime` 42/42 100% + full `__tests__/feel` 53/53 100% deterministic (`VOLUME_BY_HAPTIC` frozen, `presetFor` deterministic, `audioModulePromise` singletons per import). No flaky detected beyond waived P2-06 (asset absent, not flaky). No nightly soak; no 100-run burn. `feel.bench.test.ts` still 2/2 both profiles deterministic (not yet extended with `sfxVolumeForValue` `10k` sweep — P3 backlog). No Playwright harness (correctly scoped to Unit per test-levels framework; `tea_browser_automation auto` not needed for pure audio seam).
- **Evidence:** `npm test` sfx 126ms / full feel 139ms deterministic, `gate-decision-8-6-sfx-haptics.json` CONCERNS waived, `triade/__tests__/feel/sfx.test.ts` timings stable.
- **Findings:** Stable single run; CONCERNS only because formal burn-in not executed + bench not yet extended with `sfxVolumeForValue` P3 — not a blocker for thin 152 LOC observer seam.

### Disaster Recovery (if applicable)

- **RTO (Recovery Time Objective)**
  - **Status:** PASS ✅ (N/A)
  - **Threshold:** N/A — client stateless, no data loss; `assetManifest` degrade ensures RTO 0 (silent fallback)
  - **Actual:** N/A — `settings` not affected by audio; `SfxGateway` is ephemeral per call.
  - **Evidence:** No persistence in audio layer beyond `assetManifest` preload (defaults on failure per NFR-3).

- **RPO (Recovery Point Objective)**
  - **Status:** PASS ✅ (N/A)
  - **Threshold:** N/A
  - **Actual:** N/A
  - **Evidence:** No backup/restore needed; `sfxKindForValue` still returns `merge` (MVP, no pitch table) so future `gameover.wav` mastering is non-breaking (additive asset drop).

---

## Maintainability Assessment

### Test Coverage

- **Status:** CONCERNS ⚠️
- **Threshold:** AC coverage gate 100% per test-design (P0 100%, P1 ≥90%, overall ≥80%); line-coverage 80% not formally declared
- **Actual:** AC coverage 100% (4/4 FULL per traceability `S8.6 SFX` + no-music + FR-30 + never-throw + degrade; `coverage-matrix-8-6-sfx-haptics.json` `phase PHASE_1_COMPLETE` + `requirements` 8.6-AC1..AC4 all FULL, critical paths `volume 1:1 + triggerSfxForTrace per-merge + NOOP + gateway throw + missing expo-audio silent + no-music allowlist + reduced keep-sound` all covered host-side (10 `sfx.test.ts` P0 + 2 P1 cross-checks). No `lcov`/`c8` line % collected — consistent with 7.x/8-1..8-5 precedent (node:test, no c8 gate). Scoped pass `52/54 96.30% raw 100% waivers` excluding P2-06 placeholder; feel unit `53/53` after SFX extension (+11). E2E-equivalent P1 E2E-08 device smoke documented as 5 journeys in `tests/e2e/sfx.umbrella.spec.ts` but not scaffolded as Playwright by design (pure `expo-audio`, host＋device split).
- **Evidence:** `traceability-matrix-8-6-sfx-haptics.md` coverage table + `coverage-matrix-8-6-sfx-haptics.json` + `gate-decision-8-6-sfx-haptics.json` `p0_status MET / p1_status MET / overall MET` + `atdd-checklist-8-6-sfx-haptics.md` 11 tests.
- **Findings:** AC coverage excellent host-side; line-coverage metric is the gap (same as 8-5). Recommend adding `c8` lane if CI wants line % for maintainability gate (backlog). Device smoke P1 E2E-08 remains manual lane (~15 min, real iPhone dev build, piggybacked on same pass as mastering drop).

### Code Quality

- **Status:** PASS ✅
- **Threshold:** `tsc --noEmit` clean (both configs) + single-source data, no scattered literals, frozen presets, no engine edits
- **Actual:** `tsc` clean for `triade/tsconfig.json` + `triade/tsconfig.test.json` (exit 0, no new `@ts-ignore`; `sfx.ts` strictly typed `SfxKind/SfxGateway/TraceEntry/FeelPreset`). `VOLUME_BY_HAPTIC` single map `light 0.45/medium 0.65/heavy 1.0` consumed via `presetFor(value).haptic` (P0 `derives from presetFor` GREEN), `SfxKind 'merge'|'spawn'|'gameOver'` single 3-kind allowlist (grep `merge/spawn/gameOver` only in `sfx.ts`+`sfx.test.ts`), merge predicate `!spawned && from.length===2 && Array.isArray(from)` single-seam across `haptics/shake/bulletTime/sfx + transitionPlan` (5 core + 2 matchStats mirror, no new 6th), `0.35` spawn + `0.9` gameOver single literals in `sfx.ts`, `VOLUME_BY_HAPTIC` is single volume literal allowlist (`rg 0.45|0.65|1.0` only in `sfx.ts`), `SHAKE_CAP 8`/`BULLET_TIME_MS 200` unchanged, future tuning only changes `FEEL_PRESETS`/`VOLUME_BY_HAPTIC` data not branching, engine byte-identical empty.
- **Evidence:** `triade/src/feel/sfx.ts:15-28` single source, `rg` scans in Performance/Compliance above, `triade/__tests__/feel/sfx.test.ts` identity + volume-derivation loop, `tsc` clean.
- **Findings:** Code quality strong; single-datum invariant pinned host-side (data-not-code contract).

### Technical Debt

- **Status:** PASS ✅
- **Threshold:** <5% debt ratio (textbook)
- **Actual:** Low — `sfx.ts` 152 LOC thin observer (no logic duplication), `assetManifest` 3-entry additive change, `App` 3-line additive coupling (no refactor of existing visuals), 0 new deps beyond pinned `expo-audio`, `SfxGateway` injectable keeps testability debt 0, `sfxKindForValue` always `merge` is intentional MVP (no pitch table debt). Debt items are 1 new deferred low for this story (R-003 mastering absent score 6, spec Residual risk, follow-on asset drop only — no code change) plus 2 carry-over `GameBoard` hot-file debts same as 8-5 (R-006 overlap score 4 + R-010 burst orphan score 3) plus 7 prior Epic 8 carry-overs tracked in `deferred-work.md`. Working-tree delta tiny (≈152+43+24 LOC new plus spec/test-design/traceability metadata).
- **Evidence:** `spec-8-6-sfx-haptics.md` Residual risks + Review Triage (8-6 has 0 patches pending, 1 deferred mastering via asset drop), `test-design` R-001..R-010 (4 high score 6 incl. R-003 asset, R-007 SDK, R-008 manifest), `gate-decision-8-6-sfx-haptics.json` waived, `deferred-work.md` 1 entry for 8-6 + 9 carry-over.
- **Findings:** No structural debt; `assetManifest` duplicate `require` seam (`../../` vs `../../../` depth) is the only new coupling — tracked via 6-site allowlist grep (R-008).

### Documentation Completeness

- **Status:** PASS ✅
- **Threshold:** Spec + test-design + traceability + ATDD checklist present, all linked in gate decision `links` block, plus bench + gateway seam
- **Actual:** Spec `spec-8-6-sfx-haptics.md` (intent/boundaries/I-O matrix 8 rows/Code Map/Tasks 4 ACs/Verification/Auto Run Result `sfx 11/11` + `53/53 feel`), epic context `epic-8-context.md`, test-design `test-design-epic-8-6-sfx-haptics.md` + `test-design/test-design-epic-8-6-sfx-haptics.md` (10 risks R-001..R-010, NFR planning 5 rows, coverage plan P0×10 P1×11 P2×4 P3×3, Entry/Exit Criteria, Boundary Decomposition 5 lanes, Resource Estimates ~6–9h), traceability matrix `traceability-matrix-8-6-sfx-haptics.md` + coverage matrix `coverage-matrix-8-6-sfx-haptics.json` (100% AC, 4 ACs + no-music + FR-30) + gate decision `gate-decision-8-6-sfx-haptics.json` (CONCERNS waived, trace_report_path linked) + top-level duplicates, ATDD checklist `atdd-checklist-8-6-sfx-haptics.md` (11 tests GREEN, Stack Detection, Prerequisites), fixtures `fixtures/feel-sfx-fixtures.ts` + gateway docs, bench, deferred-work. All linked.
- **Evidence:** `_bmad-output/implementation-artifacts/` and `_bmad-output/test-artifacts/` file list + `test-design-progress.md`.

### Test Quality (from test-review, if available)

- **Status:** PASS ✅
- **Threshold:** Host fixtures over real engine traces (not stubs), pure `sfxVolumeForValue` + gateway-seam + never-throw + no-music allowlist + FR-30 keep-sound
- **Actual:** Host fixtures use real `presetFor` data-driven mapping (not stubbed volume), `SfxGateway` mock `play(kind,volume)` as observable seam (`triggerSfxForTrace` 3-entry rank check), `App` coupling fire-and-forget gate (0 `await` 0 `reducedMotion` on 3 lines), edge sweeps for `NaN/Infinity/-1/empty/null/spawned true/from len !=2/gateway throw/missing expo-audio`, `no-music` allowlist scan `music/bgm/loop` empty, `reducedMotion` empty except comment, `VOLUME_BY_HAPTIC` vs `hapticsStyleForValue` coupled rank loop. No Playwright needed (correctly scoped to Unit per test-levels framework; story is pure `expo-audio` dynamic import + `require wav` observer, not a web Playwright flow). ATDD 11/11 GREEN.
- **Evidence:** `triade/__tests__/feel/sfx.test.ts` P0 10/11 + `feel/punch/shake/bulletTime.test.ts` 42/42, `atdd-checklist-8-6-sfx-haptics.md` Implementation Checklist.
- **Findings:** Test quality strong; P1 E2E-08 device smoke is the remaining gap (host-only until device lane, same as 8-4/8-5, plus mastering drop).

---

## Custom NFR Evidence Audits (if applicable)

No custom categories beyond the 8 ADR checklist categories; client Offline/Installability (NFR-2/NFR-6) covered under Availability (PASS with pending airplane device check). `VOLUME_BY_HAPTIC 0.45/0.65/1.0` + `spawn 0.35` + `gameOver 0.9` + `SfxKind 3-kind cap` + `SHAKE_CAP 8` cap + `BULLET_TIME_MS 200` datum are pinned as custom feel thresholds (Performance + Maintainability) and FR-30 keep-sound + no-music UX-DR-29 + chrome guard (Compliance) — covered above. Bench `median <0.05ms / p99 <0.1ms` is the custom NFR gate for this audio seam (SFX adds 0 worklet cost, off main thread).

---

## Quick Wins

2 quick wins identified for immediate implementation (both asset/device lane, no `GameBoard` code beyond same hot file as 8-5 if co-fixed):

1. **Drop placeholder thock wavs to clear P2-06 / R-003 mastering absent (no code change)** (Maintainability/Compliance) - HIGH - 0.25h - FE / Audio
   - `mkdir triade/assets/sfx &&` add `merge.wav`/`spawn.wav`/`gameover.wav` cálido thock short samples (already `require` sites resolve; `assetManifest` `try/catch→null` will start returning `number` + `preloadAssets` will `loadAsync` them, `playViaExpoAudio` will stop early-returning when `!source`). No `sfx.ts` edit needed — just asset drop. Re-run host `rg -n "require\(.*assets/sfx" triade/src --include="*.ts"` still 6 sites (now resolving) + `sfx.test.ts` 11/11 stays GREEN + device ear rank check confirms `3 light 0.45 < 6 medium 0.65 < 12+ heavy 1.0 < spawn 0.35 soft < gameOver 0.9` and `no music` still holds. Follow-on mastering beyond placeholder is separate PR (tracked deferred).
   - No code changes needed — asset drop only.

2. **Fix GameBoard overlap + burst orphan in one PR (same hot file as 8-5, piggyback on SFX doMove compound)** (Reliability/Performance) - HIGH - 0.5h - FE
   - In `GameBoard.tsx:430-478` before `shakeX.value = withSequence(...)` / `shakeY.value = withSequence(...)` and `bulletFlash.value = withSequence(...)` add `cancelAnimation(shakeX)` / `cancelAnimation(shakeY)` / `cancelAnimation(bulletFlash)` (import `cancelAnimation` from `react-native-reanimated` at line 5) — fixes `reducedMotion.atdd.test.ts:336` P2-04 and `shake.atdd/bulletTime.atdd` overlap same class as 8-3 R-001. In `GameBoard.tsx:378-417` replace bare `setTimeout(...,500)` with tracked `burstTimerRef: Set<Timeout>` + `useEffect cleanup clearTimeout` mirroring `settleTimerRef` — fixes `reducedMotion.atdd.test.ts:347` P2-05 + `punch.atdd.test.ts:323` P2-01 same cause. Keeps `200ms` + `130ms` + `500ms` budgets intact; verify rapid merges within 84ms EARLY_INPUT show clean second flash/shake without truncated overlap and no `setState on unmounted` on unmount. One PR fixes both + ensures SFX co-fire at same `doMove` call site not masked by truncated shake.
   - Minimal code changes — same file, 5 lines + import.

---

## Recommended Actions

### Immediate (Before Release) - CRITICAL/HIGH Priority

1. **Master P2-06 asset drop + 15-min device smoke P1 E2E-08 (full feel-stack + SFX + FR-30)** - HIGH - 0.5h - PR author / QA
   - After merging `b16a06e` plus any `GameBoard` quick-win patch, build Expo dev build on real iPhone (SDK 57, Skia+Reanimated 4, `npx expo prebuild --clean`): merge `3` light thock + haptics Light + no shake `2` subtle, `6` medium `0.65` + haptics Medium, `12+` heavy `1.0` + haptics Heavy, spawn soft `0.35` on every effective move spawn, gameOver loud `0.9` thock on `isGameOver` fall, no music ever (only `merge/spawn/gameOver`); rapid double-merge `6+12` within `<50ms` → both thocks attempt (last audible wins, R-009) without blocking next swipe; toggle in-app `Settings` → Reduce Motion ON (or iOS Accessibility) → repeat `3/6/12/1536/new-best 12/game-over` → visuals flat (no shake/flash/particles/overshoot/glow/bullet) while **haptics+thocks heard at same scaled weight** + chrome (`Hud` preview & score) never shakes; airplane mode same; portrait+landscape. Record sign-off checkbox in PR ("device SFX smoke: 3/6/12+ rank + spawn 0.35 + gameOver 0.9 + no music + FR-30 ON flat while audible + chrome + airplane + NOOP silence").
   - Validation: checkbox ticked + 30s video (board ear+trace) — re-run `nfr-assess` after; tick `Evidence Gaps` #1 and #3.

2. **Fix R-006 overlap + R-010 burst orphan (same GameBoard file, compound with SFX co-fire)** - HIGH - 0.5h - FE
   - As Quick Win 2 above: add `cancelAnimation(bulletFlash/shakeX/shakeY)` before each new `withSequence` at `GameBoard.tsx:430-478` (import at line 5); track burst timeouts in `burstTimerRef` at `GameBoard.tsx:378` burst block and `clearTimeout` in unmount `useEffect` mirroring `settleTimerRef`. Re-run `npm test --prefix triade -- __tests__/feel/reducedMotion.atdd.test.ts` until P2-04/P2-05 GREEN and rapid heavy merges within ~90ms EARLY_INPUT show clean second flash/shake (SFX thocks not masked by truncated shake). One PR fixes both `reducedMotion.atdd` P2s and carry-over `punch.atdd P1-05/P2-01` + `shake.atdd P2-01` + `bulletTime.atdd P2-01`.
   - Specific steps: edit `GameBoard.tsx:5` imports, `GameBoard.tsx:378` burst block, `GameBoard.tsx:430` shake block, `GameBoard.tsx:472` bullet block; add `useEffect` cleanup for `burstTimerRef`.
   - Validation: `npm test --prefix triade -- __tests__/feel/reducedMotion.atdd.test.ts` 21/21 GREEN (from 19/21), `npm test --prefix triade -- __tests__/feel/shake.atdd.test.ts __tests__/feel/bulletTime.atdd.test.ts` GREEN, `tsc` clean.

3. **Verify audio wiring gates stay fixed (same PR, 0h verification)** - HIGH - 0h - FE
   - Confirm `triade/src/feel/sfx.ts` `rg "reducedMotion"` still hits only `// FR-30` comment line, `rg "VOLUME_BY_HAPTIC" triade/src/feel/` only in `sfx.ts`, `rg "0\.45|0\.65|1\.0" triade/src/feel/` only in `sfx.ts`, `rg "require\(.*assets/sfx"` exactly 6 sites each in `try/catch`, `rg "await.*triggerSfx"` empty (only `playViaExpoAudio` internal `await modPromise`), `rg "triggerSfxFor" triade/App.tsx` 3 fire-and-forget lines 0 `await` 0 `reducedMotion`, `rg "music|bgm" triade/src/feel` empty; plus `App.tsx:76` import + `triade/package.json` `expo-audio ~57.0.3` pinned. Host P0 `sfx.test.ts` stays 11/11.
   - Validation: grep gates in PR check; `npm --prefix triade test -- __tests__/feel/sfx.test.ts` 11/11.

### Short-term (Next Milestone) - MEDIUM Priority

1. **Add device p99 benchmark lane for SFX co-fire + reduced fallback + SDK 57 pin** - MEDIUM - 1h - QA / FE
   - Run `useFrameRateBaseline` stats after 2-min play with 5+ merges including one `12` heavy (shake `5` + bullet `200ms` + punch + SFX thock co-fire) while `Reduce Motion OFF` (full) and one `Reduce Motion ON` flat pass plus rapid-swipe pair within `200ms` window + `mid-flight snap`; capture `fps`/`p99Ms`/`frames` and fail if `p99Ms>16.7ms`. Keep `VOLUME_BY_HAPTIC 0.45/0.65/1.0` + `spawn 0.35` + `gameOver 0.9` pinned; audio off main thread must not regress p99 (already `<0.1ms` host). Verify `expo-audio ~57.0.3` `createAudioPlayer` vs `AudioPlayer` branch not regressed after any SDK bump via prebuild smoke. Required before Epic 8 `verified` close (full feel-stack + SFX compound; reduced flat + silent degrade is sanctioned fallback so expect `p99 reduced <= p99 full`).
   - Validation: `useFrameRateBaseline` log `fps/p99Ms/frames`; reduced lane `p99Ms` ≤ full lane `p99Ms`.

2. **Extend bench + CI grep guardrails for audio + tighten trace contract** - MEDIUM - 0.5h - DEV/CI
   - Extend `triade/benchmarks/feel.bench.test.ts` with `sfxVolumeForValue` + `triggerSfxForTrace` synthetic traces sweep (both profiles, `10k` warmup `1k`, budget `median <0.05 / p99 <0.1` including audio; today full `10.2ms` + reduced `7.29ms` covers visuals only — add ~20 LOC for SFX). Enforce PR checks: `git diff --stat -- triade/src/engine` empty (ADR-01), `rg "VOLUME_BY_HAPTIC" src/feel/` allowlist only `sfx.ts`, `rg "0\.45|0\.65|1\.0" src/feel/` only `sfx.ts`, `rg '"merge"|"spawn"|"gameOver"' src/feel/` allowlist `sfx.ts`+`sfx.test.ts`, `rg "from\.length===2" src/` exactly 5 feel sites + engine, `rg "reducedMotion" src/feel/sfx.ts` only comment, `rg "music|bgm|loop" src/feel/` empty, `rg "await.*triggerSfx" src/feel/` empty, `App` audio 3 lines 0 `await` 0 `reducedMotion`, `assetManifest` 6-site allowlist, `expo-audio ~57.0.3` pin scan + `app.json` prebuild comment. Consider `__DEV__` warn on `value<3` / `NaN` for corruption surfacing (R-010 low). All host gates, keep for Epic 8 close.
   - Validation: `npm test` PR check includes sfx bench + grep gates; `feel.bench.test.ts` 2→3 sweeps GREEN.

### Long-term (Backlog) - LOW Priority

1. **Add c8/nyc coverage lane and jscpd duplication check** - LOW - 1-2h - DEV/CI
   - Generate `coverage/lcov-report` for maintainability gate (80% target) and jscpd for <5% duplication — not required for this thin 152 LOC observer `sfx.ts` but useful for Epic 8 full feel preset (8-1..8-6) including 695+ engine fixtures.
   - Validation: `c8 --reporter=lcov npm test --prefix triade` + jscpd gate.

2. **Consider SFX pitch table and stacking pool if needed (R-009 follow-up)** - LOW - 1h - FE / Audio
   - `sfxKindForValue` currently always `merge` — if product wants per-tier pitch, add data table mirroring `FEEL_PRESETS` (not code branching) and `sfx.test.ts` pitch scan; if rapid `<50ms` double-merge truncation becomes audible complaint, consider per-kind player pool (2 players per kind round-robin) instead of single re-seek — keep never-block guarantee. Both are P3 deferred, not gating MVP (spec residual: "thock mastering beyond placeholder block if needed + Never add music").
   - Validation: `rg "sfxKindForValue" src/feel/sfx.ts` still pure + volume clamp `[0,1]` intact.

---

## Monitoring Hooks

4 monitoring hooks recommended to detect issues before failures:

### Performance Monitoring

- [ ] Host micro-bench lane (CI) - Fail CI if `sfxVolumeForValue` + `triggerSfxForTrace` + `presetFor/reducedPresetFor + punch*For + shake*For + shouldTriggerBulletTime` sweep >0.05ms median / >0.1ms p99 for either profile (full or reduced) including audio — SFX adds no worklet cost (off main thread) so reduced lane must stay < full lane
  - **Owner:** DEV / CI
  - **Deadline:** 8-6 review (extend bench as scoped in Rec Actions short-term #2)

- [ ] Device frame stats lane (`useFrameRateBaseline`) - Track `fps`/`p99Ms`/`frames` after 2-min play with 5+ merges including one `12` heavy bullet 200ms + shake 5 + punch + SFX co-fire + `1536` glow (full) and one flat pass (reduced ON) + rapid pair within 200ms + spawn + gameOver; alert if p99 >16.7ms or reduced p99 > full p99 or SFX off-heap regresses p99
  - **Owner:** QA / FE
  - **Deadline:** Epic 8 device benchmark (ADR-04 two-level benchmark when 8-6 mastering lands)

### Security Monitoring

- [ ] No security runtime monitoring needed this story (local audio observer, no network/auth/PII) — keep `npm audit` + `expo-doctor` as periodic gate (carry-over 11 moderate transitive expo)
  - **Owner:** FE lead / CI
  - **Deadline:** 8-6 review

### Reliability Monitoring

- [ ] SFX unmount/mid-import dev-build warnings (optional) - Log once in `__DEV__` when `App` unmounts during pending `import('expo-audio')` or when `playViaExpoAudio` hits dead branch (`createAudioPlayer` vs `AudioPlayer` miss + `setVolume/volume` + `seekTo`) returning silent, or when `require assets/sfx/*.wav` returns `null` (asset absent), or when `sfxVolumeForValue(NaN/Infinity)` fallback `0.45` (corruption), or when `gateway.play→throw` swallowed, or when `preloadAssets` `loadAsync` rejects
  - **Owner:** FE
  - **Deadline:** 8-6 follow-up / 8-6 mastering PR

### Alerting Thresholds

- [ ] Audio rank / no-music / FR-30 alert - Notify when device smoke ear shows `3 light 0.45` not audibly softer than `6 medium 0.65` not softer than `12+ heavy 1.0` (rank broken) or `spawn 0.35` not softest or `gameOver 0.9` not loud or any `music/bgm/loop` heard or `reducedMotion ON` silences thock (FR-30 breach) or `spawn` thock on NOOP or preview card thocks — indicates retune drift outside `VOLUME_BY_HAPTIC` or `App` gating regression
  - **Owner:** QA
  - **Deadline:** after fix

---

## Fail-Fast Mechanisms

4 fail-fast mechanisms recommended to prevent failures:

### Circuit Breakers (Reliability)

- [ ] Not needed as circuit breaker — `sfxVolumeForValue/sfxKindForValue/triggerSfxFor*` + `dispatchPlay/playViaExpoAudio/getAudioModule` + `assetManifest sfx-*` + `preloadAssets` already fail-fast via `Number.isFinite` + `try/catch` never-throw + `void` fire-and-forget + early-return when `!source`/`!mod`/`!trace`; `App` 3 audio lines `try/catch` per call never block `move()` dispatch. Keep as-is; do not add retry loop (audio is best-effort, next merge will thock).
  - **Owner:** FE
  - **Estimated Effort:** 0

### Rate Limiting (Performance)

- [ ] Optional feel+audo coalescence is already the rate limiter — SFX per-merge fires one thock per `from.length===2 && !spawned` entry (not per-particle), and `App` spawn/gameOver are one-shot per `moved`/`isGameOver`; rapid `<50ms` double-merge `6+12` fires 2 thocks back-to-back re-seeking same player — last wins truncation is the limiter (R-009). If device p99 shows jank with concurrent shake `130ms` + bullet `200ms` + SFX off-thread, the visual `cancelAnimation` fix is the rate limiter (collapses N visuals in 200ms to latest). Owner: FE, Effort: already in Quick Win 2; gated by device p99 feedback.
  - **Owner:** FE
  - **Estimated Effort:** included in Quick Win 2

### Validation Gates (Security)

- [ ] Input guard is already the validation gate — `sfxVolumeForValue` via `presetFor` + `VOLUME_BY_HAPTIC` + `Number.isFinite` fallback `0.45` + `Math.max(0,min(1,vol))` clamp, `triggerSfxForTrace` predicate `!spawned && Array.isArray(from) && from.length===2`, `App` `Number.isFinite(spawnEntry.value)` + `result.moved` guard for spawn, `sfxKindForValue` always `merge` + no-music scan, `assetManifest` `try/catch→null` + `filter finite` + early-return, `playViaExpoAudio` per-kind `require` in `try/catch→null` + `if(!source) return`. No additional gate needed.
  - **Owner:** FE
  - **Estimated Effort:** 0

### Smoke Tests (Maintainability)

- [ ] Device smoke checklist P1 E2E-08 as PR gate — must be ticked before merge to verified (15 min, real iPhone dev build, `expo-audio` SDK 57, `3/6/12+` rank + `spawn 0.35` + `gameOver 0.9` + no music + Reduced Motion ON flat while audible + chrome + mid-flight + airplane + NOOP + portrait/landscape + rapid double-merge). Owner: PR author, Effort: 0.5h.
  - **Owner:** PR author
  - **Estimated Effort:** 0.5h

---

## Evidence Gaps

4 evidence gaps identified - action required:

- [ ] **Performance - device p99 <16.7ms with full feel-stack + SFX co-fire (full vs reduced fallback)** (Performance)
  - **Owner:** QA / FE
  - **Deadline:** Before Epic 8 verified (15-min device lane + benchmark)
  - **Suggested Evidence:** `useFrameRateBaseline` log `fps`/`p99Ms`/`frames` after 2-min play with 5+ merges on real iPhone dev build SDK 57 including heavy `12` shake `5` + bullet `200ms` + punch `16` + SFX thock co-fire (full) and one flat pass (reduced ON) + spawn + gameOver, concurrent Skia Canvas + Reanimated main-thread worklets + `expo-audio` off-thread `void import()`; reduced lane must be ≤ full lane and audio off-thread must not regress `p99Ms <16.7`. Host bench `sfx.test.ts` timings `0.04–0.86ms` + `feel.bench.test.ts` `10.2/7.29ms` 10k sweeps already GREEN but not sufficient for device frame guarantee; SFX-specific bench sweep pending (short-term #2)
  - **Impact:** Cannot claim 60 FPS budget met without device data; host bench <0.1ms is not sufficient for frame guarantee (R-002/R-007/R-009 score 6/3/2 plus carry-over shake R-006/R-007 burst). Audio off-thread claim is host-only until device lane.

- [ ] **Reliability - Placeholder mastering absent: `triade/assets/sfx/` 3 wavs not landed (R-003)** (Reliability/Maintainability)
  - **Owner:** FE / Audio
  - **Deadline:** Before Epic 8 verified (asset-drop PR, no code change)
  - **Suggested Evidence:** `triade/assets/sfx/{merge,spawn,gameover}.wav` present and `rg -n "require\(.*assets/sfx" triade/src --include="*.ts"` 6 sites resolve to numeric ids (no longer `null`), `preloadAssets` `resources.length 3` → `Asset.loadAsync` not early-return, `playViaExpoAudio` no longer `!source→return` on device, plus host `sfx.test.ts` 11/11 still GREEN and device ear rank confirmed. Currently verified absent (`ls triade/assets/sfx/ No such file`) — silent degrade is waived ship path per spec Residual risk ("Requires acquiring real audio mastering beyond placeholder thock — block if needed + Never add music")
  - **Impact:** Device thock currently silent (degrade to no-op) — not crash but audible peak missing; tracked as P2-06 deferred-RED with waiver, risk LOW, fix is asset drop only.

- [ ] **Compliance - Device FR-30 keep-sound + chrome + no-music verification (UX-DR-29/27)** (Compliance)
  - **Owner:** QA / PR author
  - **Deadline:** Before verified (device smoke P1 E2E-08 piggybacked on asset drop)
  - **Suggested Evidence:** iOS Settings → Reduce Motion ON → repeat merges `6/12/1536/new-best 12/game-over` → visuals flat (no shake/flash/particles/overshoot/glow/bullet) while **haptics+thocks heard at same weight** `3 soft 0.45 / 6 medium 0.65 / 12+ heavy 1.0 / spawn 0.35 / gameOver 0.9` and `rg reducedMotion triade/src/feel/sfx.ts` still only comment + `App.tsx` audio 3 lines 0 `reducedMotion` token; `rg music|bgm triade/src/feel/` empty + sfx.test `no music` GREEN; `Hud` preview card never translates even when board thocks. Host-only today (sfx.test + grep gates 100%); device ear not signed.
  - **Impact:** Without device pass, FR-30 a11y/App Store compliance is host-only but not user-verified (R-001/R-004 deferred score 6 each).

- [ ] **Reliability - Overlapping `GameBoard` visuals without `cancelAnimation` + burst `setTimeout` orphan (R-006/R-010 carry-over)** (Reliability)
  - **Owner:** FE
  - **Deadline:** Before Epic 8 verified (immediate for feel-stack compound)
  - **Suggested Evidence:** `GameBoard.tsx` calls `cancelAnimation(bulletFlash/shakeX/shakeY)` before new `withSequence` and `burstTimerRef:Set<Timeout>` + `clearTimeout` on unmount; `reducedMotion.atdd.test.ts:336` P2-04 + `347` P2-05 turn GREEN; rapid heavy merges within 90ms EARLY_INPUT show clean second flash/shake (SFX thocks not masked by truncated shake). Carry-over from 8-5, not new in 8-6 but compound risk with SFX co-fire at same `doMove` call site.
  - **Impact:** Truncated first bullet `200ms` / shake `130ms` / mild jank on rapid heavy combos + burst `setState on unmounted` — waived CONCERNS but blocks PASS.

---

## Findings Summary

**Based on ADR Quality Readiness Checklist (8 categories, 29 criteria)**

| Category                                         | Criteria Met       | PASS             | CONCERNS             | FAIL             | Overall Status                      |
| ------------------------------------------------ | ------------------ | ---------------- | -------------------- | ---------------- | ----------------------------------- |
| 1. Testability & Automation                      | 4/4          | 4         | 0         | 0         | PASS ✅                 |
| 2. Test Data Strategy                            | 3/3         | 3        | 0         | 0         | PASS ✅               |
| 3. Scalability & Availability                    | 2/4         | 2        | 2         | 0         | CONCERNS ⚠️               |
| 4. Disaster Recovery                             | 1/3         | 1        | 2         | 0         | CONCERNS ⚠️        |
| 5. Security                                      | 4/4        | 4        | 0         | 0         | PASS ✅             |
| 6. Monitorability, Debuggability & Manageability | 1/4        | 1        | 3         | 0         | CONCERNS ⚠️         |
| 7. QoS & QoE                                     | 3/4        | 3        | 1         | 0         | CONCERNS ⚠️             |
| 8. Deployability                                 | 2/3        | 2        | 1         | 0         | CONCERNS ⚠️         |
| **Total**                                        | **20/29** | **20** | **9** | **0** | **CONCERNS ⚠️** |

**Criteria Met Scoring:**

- ≥26/29 (90%+) = Strong foundation
- 20-25/29 (69-86%) = Room for improvement
- <20/29 (<69%) = Significant gaps

**This audit: 20/29 (69%) — Room for improvement (borderline meets minimal 20; strong host, 9 CONCERNS all device/mastering/monitorability deferred, 0 FAIL).**

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-09-01'
  story_id: '8-6-sfx-haptics'
  feature_name: '8-6 SFX Haptics — expo-audio thock coupled with haptics, swappable gateway, Reduced Motion keeps sound'
  adr_checklist_score: '20/29' # ADR Quality Readiness Checklist — 20 PASS / 9 CONCERNS / 0 FAIL
  categories:
    testability_automation: 'PASS'
    test_data_strategy: 'PASS'
    scalability_availability: 'CONCERNS'
    disaster_recovery: 'CONCERNS'
    security: 'PASS'
    monitorability: 'CONCERNS'
    qos_qoe: 'CONCERNS'
    deployability: 'CONCERNS'
  overall_status: 'CONCERNS'
  critical_issues: 0
  high_priority_issues: 1  # R-003 mastering P2-06 (asset drop, score 6, deferred) + piggyback GameBoard R-006/R-010 carry-over
  medium_priority_issues: 2 # bench SFX extend + device p99 lane
  concerns: 9
  blockers: false # no FAIL; P2-06 waived per spec Residual risk + deferred-work, device smoke waived short-term
  quick_wins: 2
  evidence_gaps: 4
  recommendations:
    - 'Drop triade/assets/sfx/{merge,spawn,gameover}.wav placeholders (no code change) to clear P2-06/R-003 and re-run device ear rank 0.45/0.65/1.0 + spawn 0.35 + gameOver 0.9 + no-music'
    - 'Run 15-min iOS device smoke (full feel-stack + SFX + FR-30 ON flat while audible + chrome + airplane + NOOP + p99 <16.7ms) before Epic 8 verified'
    - 'Fix GameBoard cancelAnimation(bulletFlash/shakeX/shakeY) + burstTimerRef clearTimeout in one PR (same hot file as 8-5)'
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/spec-8-6-sfx-haptics.md`
- **Tech Spec:** `_bmad-output/implementation-artifacts/epic-8-context.md`
- **PRD:** `_bmad-output/implementation-artifacts/epic-8-context.md` (S8.6 feel suite S8.1–S8.6, FR-30, UX-DR-16/27/28/29)
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-8-6-sfx-haptics.md` + `_bmad-output/test-artifacts/test-design-epic-8-6-sfx-haptics.md`
- **ATDD Checklist:** `_bmad-output/test-artifacts/atdd-checklist-8-6-sfx-haptics.md`
- **Traceability:** `_bmad-output/test-artifacts/traceability/traceability-matrix-8-6-sfx-haptics.md` + `coverage-matrix-8-6-sfx-haptics.json` + `gate-decision-8-6-sfx-haptics.json`
- **Evidence Sources:**
  - Test Results: `triade/__tests__/feel/sfx.test.ts` (11/11 GREEN, 126ms, timings 0.04–0.86ms) + `triade/__tests__/feel/{feel,punch,shake,bulletTime}.test.ts` 53/53 GREEN + `triade/benchmarks/feel.bench.test.ts` 2/2 (10.2ms full / 7.29ms reduced 10k)
  - Metrics: `sfx.test.ts` per-case timings + `feel.bench.test.ts` median `0.0003ms`/p99 `0.0006ms` host (budget `0.05/0.1`)
  - Logs: `rg` allowlist scans (`reducedMotion` only comment, `VOLUME_BY_HAPTIC` only `sfx.ts`, `0.45` only `sfx.ts`, `require assets/sfx` 6 sites, `music|bgm` empty, `await triggerSfx` empty, `triggerSfxFor` 3 lines in `App.tsx`)
  - CI Results: `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean + `tsconfig.test.json` clean, `git diff --stat -- triade/src/engine` empty

---

## Recommendations Summary

**Release Blocker:** None — 0 FAIL, 0 critical. P2-06 mastering absent is waived P2 deferred-RED (asset drop only, spec Residual risk) + pending device smoke — same precedent as 8-4/8-5 CONCERNS gates.

**High Priority:** Asset drop `triade/assets/sfx/{merge,spawn,gameover}.wav` (0.25h, no code) + 15-min device smoke `3/6/12+` rank + `spawn 0.35` + `gameOver 0.9` + FR-30 ON + chrome + p99 <16.7ms + `GameBoard` `cancelAnimation` + `burstTimerRef` fix (0.5h) — all before Epic 8 `verified`.

**Medium Priority:** Device `useFrameRateBaseline` stats lane + extend bench with `sfxVolumeForValue` sweep + tighten grep/PR guardrails (Await/Volume/Kind/Predicate allowlists).

**Next Steps:** 1) Land mastering asset PR (no code) + piggyback device smoke + `GameBoard` overlap fix in one Follow-on; 2) Re-run `nfr-assess` (this workflow) + `trace` + bench lane — expect `20/29→24+/29` and `CONCERNS→PASS` once device p99 + asset `!source` not early-return + monitoring hooks ticked; 3) Promote Epic 8 to `verified` after `trace` gate reads `PASS`.

---

## Sign-Off

**NFR Evidence Audit:**

- Overall Status: CONCERNS ⚠️
- Critical Issues: 0
- High Priority Issues: 1 (R-003 P2-06 deferred) + 2 carry-over GameBoard P2s on same hot path
- Concerns: 9 (ADR) / 5 category CONCERNS (Performance/Throughput/Resource/Scalability/Compliance pending device+asset)
- Evidence Gaps: 4

**Gate Status:** CONCERNS ⚠️ — not FAIL; waived per deferred-work + spec Residual risks + device lane short-term deferral

**Next Actions:**

- If PASS ✅: Proceed to `*gate` workflow or release
- If CONCERNS ⚠️: Address HIGH/CRITICAL issues, re-run `*nfr-assess`
- If FAIL ❌: Resolve FAIL status NFRs, re-run `*nfr-assess`

**Generated:** 2026-09-01
**Workflow:** testarch-nfr v5.0 — story 8-6-sfx-haptics working-tree `b16a06e` + metadata-only uncommitted diff

---

<!-- Powered by BMAD-CORE™ -->